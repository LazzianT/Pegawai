const { getConnection, sql } = require('../config/db');
const { addNotification } = require('./notifikasiModel');
const { sendWa, sendWaToNIP } = require('../services/waService');

async function getPermitTransactions(NIP, idType) {
  const conn = await getConnection();
  const result = await conn
    .request()
    .input('NIP', NIP)
    .input('IdType', idType)
    .query(`
      SELECT a.Id, a.NIP, a.PermitType, a.Description, a.ProposeStartDate, b.SubDetail
      FROM hris_Permit_Days a
      LEFT JOIN hris_Permit_SubGroup b ON a.PermitType = b.IdSubGroup
      WHERE a.NIP = @NIP AND b.IdType = @IdType
    `);
  return result.recordset;
}

async function getPermitSubGroups(idType, idSubGroup) {
  const conn = await getConnection();
  const req = conn.request().input('IdType', idType);
  let where = 'IdType = @IdType';
  if (idSubGroup != null && idSubGroup !== '') {
    req.input('IdSubGroup', idSubGroup);
    where += ' AND IdSubGroup = @IdSubGroup';
  }
  const result = await req.query(`
    SELECT IdType, IdGroup, IdSubGroup, SubDetail, NumDays, TypeDays, DocSupport, DocTime
    FROM hris_Permit_SubGroup
    WHERE ${where}
  `);
  return result.recordset;
}

async function submitIzin(
  NIP,
  {
    id,
    jenis,
    ProposeStartDate,
    ProposeEndDate,
    ProposeStartTime,
    ProposeEndTime,
    description,
    keperluan,
    fileName,
    approvers,
  }
) {
  console.log('[submitIzin] START', { NIP, ProposeStartDate, ProposeEndDate, ProposeStartTime, ProposeEndTime, jenis, keperluan, approvers });

  const pool = await getConnection();
  const tx = new sql.Transaction(pool);
  await tx.begin();
  try {
    console.log('[submitIzin] Transaction begun');

    // Get user info
    console.log('[submitIzin] Fetching user info for NIP:', NIP);
    const nameRes = await new sql.Request(tx)
      .input('NIP', sql.VarChar, NIP)
      .query(`SELECT NIP, Name FROM BMC.dbo.hris_Employee WHERE NIP = @NIP`);
    console.log('[submitIzin] User query result:', nameRes.recordset);

    const emp = nameRes.recordset[0];
    if (!emp) throw new Error('User tidak ditemukan');
    const NAME = String(emp.Name || '').trim();
    console.log('[submitIzin] User found:', NAME);

    // Create ID
    const now = new Date();
    const ts = Math.floor(now.getTime() / 1000);
    const rand = Math.floor(Math.random() * 90 + 10);
    const id = `IZ.${NIP}.${ts}${rand}`;
    console.log('[submitIzin] Generated ID:', id);

    const isIzin = ProposeStartTime && ProposeEndTime;
    console.log('[submitIzin] isIzin:', isIzin, 'ProposeStartTime:', ProposeStartTime, 'ProposeEndTime:', ProposeEndTime);

    if (isIzin) {
      console.log('[submitIzin] Inserting hris_Permit_Days (with time)');
      const result = await new sql.Request(tx)
        .input('Id', sql.VarChar, id)
        .input('NIP', sql.VarChar, NIP)
        .input('PermitType', sql.VarChar, jenis)
        .input('ProposeStartDate', sql.VarChar, ProposeStartDate)
        .input('ProposeEndDate', sql.VarChar, ProposeEndDate)
        .input('ProposeStartTime', sql.VarChar, ProposeStartTime)
        .input('ProposeEndTime', sql.VarChar, ProposeEndTime)
        .input('Attachment', sql.VarChar, fileName || null)
        .input('Description', sql.NVarChar, description || null)
        .input('InpDate', sql.NVarChar, now.toISOString().slice(0, 19).replace('T', ' '))
        .input('IsActive', sql.Int, 1)
        .input('IsOut', sql.Int, 0)
        .query(`
          INSERT INTO BMC.dbo.hris_Permit_Days
          (Id, NIP, PermitType, ProposeStartDate, ProposeEndDate, ProposeStartTime, ProposeEndTime, Attachment, Description, IsActive, InpDate, IsOut)
          VALUES (@Id, @NIP, @PermitType, @ProposeStartDate, @ProposeEndDate, @ProposeStartTime, @ProposeEndTime, @Attachment, @Description, @IsActive, @InpDate, @IsOut)
        `);
      console.log('[submitIzin] hris_Permit_Days insert result:', result);
    } else {
      console.log('[submitIzin] Inserting hris_Permit_Days (cuti khusus, no time)');
      const result = await new sql.Request(tx)
        .input('Id', sql.VarChar, id)
        .input('NIP', sql.VarChar, NIP)
        .input('PermitType', sql.VarChar, jenis)
        .input('ProposeStartDate', sql.VarChar, ProposeStartDate)
        .input('ProposeEndDate', sql.VarChar, ProposeEndDate)
        .input('Attachment', sql.VarChar, fileName || null)
        .input('Description', sql.NVarChar, description || null)
        .input('InpDate', sql.NVarChar, now.toISOString().slice(0, 19).replace('T', ' '))
        .input('IsActive', sql.Int, 1)
        .input('IsOut', sql.Int, 0)
        .query(`
          INSERT INTO BMC.dbo.hris_Permit_Days
          (Id, NIP, PermitType, ProposeStartDate, ProposeEndDate, Attachment, Description, IsActive, InpDate, IsOut)
          VALUES (@Id, @NIP, @PermitType, @ProposeStartDate, @ProposeEndDate, @Attachment, @Description, @IsActive, @InpDate, @IsOut)
        `);
      console.log('[submitIzin] hris_Permit_Days insert result:', result);
    }

    console.log('[submitIzin] hris_Permit_Days inserted successfully');

    // Create approvals
    let priority = 1;
    for (const atasan of approvers) {
      console.log('[submitIzin] Processing approver:', atasan, 'priority:', priority);
      const empRes = await new sql.Request(tx)
        .input('NIP', sql.VarChar, atasan)
        .query(`SELECT NIP, Name, Phone FROM BMC.dbo.hris_Employee WHERE NIP = @NIP`);
      console.log('[submitIzin] Approver query result:', empRes.recordset);

      const approver = empRes.recordset[0];
      if (!approver) {
        console.log('[submitIzin] Approver not found, skipping:', atasan);
        continue;
      }

      console.log('[submitIzin] Inserting approval for:', atasan, 'priority:', priority);
      await new sql.Request(tx)
        .input('Id', sql.VarChar, id)
        .input('Priority', sql.Int, priority)
        .input('NIP', sql.VarChar, atasan)
        .query(`
          INSERT INTO BMC.dbo.hris_Approval (Id, Priority, NIP, StatusId)
          VALUES (@Id, @Priority, @NIP, 1)
        `);
      console.log('[submitIzin] Approval inserted for:', atasan);

      const uniqId = `${id} | ${priority}`;
      const hex = Buffer.from(uniqId).toString('hex');
      const webLink = 'https://online.bmc.co.id/bmconline_dev/appr_izin/' + hex;
      const appLink = 'https://online.bmc.co.id/bmconline_dev/appr_app/' + hex;
      const text = `Dear *${String(approver.Name || '').trim()}*,\n\n`
        + 'Silahkan simpan nomor ini dengan nama *BMC Online*.\n\n'
        + `Approval ${jenis}:\n`
        + `NIK: *${NIP}*\n`
        + `Nama: *${NAME}*\n\n`
        + `Web: ${webLink}\n`
        + `Aplikasi: ${appLink}`;

      await sendWa({ no: approver.Phone, text });

      priority++;
    }

    console.log('[submitIzin] Committing transaction');
    await tx.commit();
    console.log('[submitIzin] Transaction committed successfully');

    const nama = String(NAME || '').trim();
    const tgl = ProposeStartDate ? (ProposeEndDate && ProposeEndDate !== ProposeStartDate ? `${ProposeStartDate} s/d ${ProposeEndDate}` : ProposeStartDate) : '';
    for (const atasan of approvers) {
      try {
        await addNotification({
          NIP: atasan,
          Type: 'IZIN',
          Action: 'PENGAJUAN',
          Title: `Pengajuan Izin dari ${nama}`,
          Body: `${nama} mengajukan izin${tgl ? ` pada ${tgl}` : ''}. Klik untuk menyetujui atau menolak.`,
        });
      } catch (e) {
        console.error('[notify izin ajuan ERROR]', e.message);
      }
    }

    return { id, name: NAME };
  } catch (err) {
    await tx.rollback();
    console.error('[submitIzin ERROR]', err);
    console.error('[submitIzin ERROR] code:', err.code);
    console.error('[submitIzin ERROR] number:', err.number);
    console.error('[submitIzin ERROR] message:', err.message);
    console.error('[submitIzin ERROR] state:', err.state);
    console.error('[submitIzin ERROR] class:', err.class);
    console.error('[submitIzin ERROR] lineNumber:', err.lineNumber);
    console.error('[submitIzin ERROR] serverName:', err.serverName);
    console.error('[submitIzin ERROR] procName:', err.procName);
    console.error('[submitIzin ERROR] stack:', err.stack);
    throw err;
  }
}

async function getApprovalIzinList(NIP, statusFilter, search) {
  const conn = await getConnection();
  let whereClause = `a.NIP = @NIP AND LEFT(a.Id, 1) = 'I'`;
  if (statusFilter === 'Approved') {
    whereClause += ` AND a.StatusId = 3`;
  } else if (statusFilter === 'Propose') {
    whereClause += ` AND a.StatusId = 1`;
  } else if (statusFilter === 'Rejected') {
    whereClause += ` AND a.StatusId = 4`;
  }
  if (search && search.trim()) {
    whereClause += ` AND c.Name LIKE '%' + @search + '%'`;
  }
  const request = conn.request().input('NIP', NIP);
  if (search && search.trim()) {
    request.input('search', search.trim());
  }
  const result = await request.query(`
    SELECT a.Id, a.Priority, a.NIP, c.Name, a.StatusId, a.UpdDate,
      b.ProposeStartDate, b.ProposeEndDate, b.ProposeStartTime, b.ProposeEndTime,
      b.InpDate, b.SubGroup, b.Description,
      CASE
        WHEN a.StatusId = 3 THEN 'Approved'
        WHEN a.StatusId = 4 THEN 'Rejected'
        ELSE 'Propose'
      END AS Updates
    FROM hris_Approval a
    LEFT JOIN vw_hris_Permit_Transaction b ON a.Id = b.Id
    LEFT JOIN hris_Employee c ON b.NIP = c.NIP
    WHERE ${whereClause}
    ORDER BY b.InpDate DESC
  `);
  return result.recordset;
}

async function approveIzin(Id, action) {
  const conn = await getConnection();

  const checkResult = await conn.request()
    .input('Id', sql.VarChar, Id)
    .query(`
      SELECT Id, StatusId, UpdDate FROM hris_Approval WHERE Id = @Id
    `);

  console.log('[approveIzin] Check result:', checkResult.recordset);

  if (checkResult.recordset.length === 0) {
    console.log('[approveIzin] Record not found for Id:', Id);
    return { success: false, error: 'NOT_FOUND' };
  }

  const existing = checkResult.recordset[0];
  console.log('[approveIzin] Existing record:', existing);

  if (existing.UpdDate) {
    console.log('[approveIzin] Already processed:', existing.UpdDate);
    return { success: false, error: 'ALREADY_PROCESSED' };
  }

  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const updDate = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
  const statusId = action === 'approve' ? 3 : 4;

  const result = await conn.request()
    .input('Id', sql.VarChar, Id)
    .input('StatusId', sql.Int, statusId)
    .input('UpdDate', sql.NVarChar, updDate)
    .query(`
      UPDATE hris_Approval
      SET StatusId = @StatusId, UpdDate = @UpdDate
      WHERE Id = @Id
    `);

  console.log('[approveIzin] Update result:', result.rowsAffected);
  const OK = result.rowsAffected[0] > 0;

  if (OK) {
    try {
      const info = await conn.request()
        .input('Id', sql.VarChar, Id)
        .query(`
          SELECT TOP 1 b.NIP AS PemohonNIP, b.Description
          FROM hris_Approval a
          LEFT JOIN vw_hris_Permit_Transaction b ON a.Id = b.Id
          WHERE a.Id = @Id
        `);
      const row = info.recordset[0];
      if (row && row.PemohonNIP) {
        const aksi = action === 'approve' ? 'APPROVE' : 'REJECT';
        const judul = action === 'approve' ? 'Izin Disetujui' : 'Izin Ditolak';
        await addNotification({
          NIP: row.PemohonNIP,
          Type: 'IZIN',
          Action: aksi,
          Title: judul,
          Body: `Pengajuan izin Anda${row.Description ? ` (${String(row.Description).trim()})` : ''} telah ${action === 'approve' ? 'disetujui' : 'ditolak'}.`,
        });
        await sendWaToNIP(row.PemohonNIP, `Dear {Name},\nIzin anda di *${aksi}*.`);
      }
    } catch (e) {
      console.error('[notify izin approve ERROR]', e.message);
    }
  }

  return { success: OK };
}

module.exports = { getPermitTransactions, getPermitSubGroups, submitIzin, getApprovalIzinList, approveIzin };