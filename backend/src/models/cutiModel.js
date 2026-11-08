const { getConnection, sql } = require('../config/db');
const { addNotification } = require('./notifikasiModel');
const { sendWa, sendWaToNIP } = require('../services/waService');

async function getLeaveSaldo(NIP, leaveType) {
  const conn = await getConnection();
  const result = await conn
    .request()
    .input('NIP', NIP)
    .input('LeaveType', leaveType)
    .query(`
      SELECT NIP, Name, Saldo, Transaksi, 9 AS QuotaCuti
      FROM vw_hris_Leave_Saldo
      WHERE NIP = @NIP AND LeaveType = @LeaveType
    `);
  return result.recordset[0];
}

async function getLeaveTransactions(NIP) {
  const conn = await getConnection();
  const result = await conn
    .request()
    .input('NIP', NIP)
    .query(`
      SELECT TOP 20 Id, LeaveTypeName, LeaveRemark, LeaveDuration, LeaveStatusName, DateProp, Approval
      FROM vw_hris_Leave_Transaction
      WHERE NIP = @NIP
      ORDER BY Id DESC
    `);
  return result.recordset;
}

async function getTopLevel(NIP) {
  const conn = await getConnection();
  const result = await conn
    .request()
    .input('NIP', NIP)
    .query(`
      SELECT a.NIP, a.Name, a.DepartID, b.NamaDepartemen, a.JobSeq
      FROM hris_GetTopLevel(@NIP) a
      LEFT JOIN MASCOSTCENTER b ON a.DepartID = b.DepartID
      ORDER BY a.JobSeq DESC
    `);
  return result.recordset;
}

async function submitLeave(NIP, { id, leaveType, remark, dates, approvers }) {
  const pool = await getConnection();
  const tx = new sql.Transaction(pool);
  await tx.begin();
  try {
    const nameRes = await new sql.Request(tx)
      .input('NIP', sql.VarChar, NIP)
      .query(`
        SELECT NIP, Name FROM BMC.dbo.hris_Employee WHERE NIP = @NIP
      `);
    const emp = nameRes.recordset[0];
    if (!emp) throw new Error('User tidak ditemukan');
    const NAME = String(emp.Name || '').trim();

    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const inpHDate = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

    await new sql.Request(tx)
      .input('Id', sql.VarChar, id)
      .input('NIP', sql.VarChar, NIP)
      .input('LeaveType', sql.Int, leaveType)
      .input('Remark', sql.NVarChar, remark || null)
      .input('InpDate', sql.NVarChar, inpHDate)
      .query(`
        INSERT INTO BMC.dbo.hris_Leave_Prop (Id, NIP, LeaveType, Remark, IsMassLeave, InpDate)
        VALUES (@Id, @NIP, @LeaveType, @Remark, 0, @InpDate)
      `);

    for (const tgl of dates) {
      await new sql.Request(tx)
        .input('PropId', sql.VarChar, id)
        .input('ProposeDate', sql.NVarChar, String(tgl))
        .query(`
          INSERT INTO BMC.dbo.hris_Leave_Prop_Detail (PropId, ProposeDate, Actualdate, IsActive)
          VALUES (@PropId, @ProposeDate, @ProposeDate, 1)
        `);
    }

    let priority = 1;
    for (const atasan of approvers) {
      const empRes = await new sql.Request(tx)
        .input('NIP', sql.VarChar, atasan)
        .query(`SELECT NIP, Name, Phone FROM BMC.dbo.hris_Employee WHERE NIP = @NIP`);
      const approver = empRes.recordset[0];
      if (!approver) continue;

      await new sql.Request(tx)
        .input('Id', sql.VarChar, id)
        .input('Priority', sql.Int, priority)
        .input('NIP', sql.VarChar, atasan)
        .query(`
          INSERT INTO BMC.dbo.hris_Approval (Id, Priority, NIP, StatusId)
          VALUES (@Id, @Priority, @NIP, 1)
        `);

      const uniqId = `${id} | ${priority}`;
      const hex = Buffer.from(uniqId).toString('hex');
      const webLink = 'https://online.bmc.co.id/bmconline_dev/appr/' + hex;
      const appLink = 'https://online.bmc.co.id/bmconline_dev/appr_app/' + hex;
      const text = `Dear *${String(approver.Name || '').trim()}*,\n\n`
        + 'Silahkan simpan nomor ini dengan nama *BMC Online*.\n\n'
        + `Approval Cuti:\n`
        + `NIK: *${NIP}*\n`
        + `Nama: *${NAME}*\n\n`
        + `Web: ${webLink}\n`
        + `Aplikasi: ${appLink}`;
      await sendWa({ no: approver.Phone, text });

      priority++;
    }

    await tx.commit();

    const nama = String(NAME || '').trim();
    const tgl = Array.isArray(dates) && dates.length ? dates.join(', ') : '';
    for (const atasan of approvers) {
      try {
        await addNotification({
          NIP: atasan,
          Type: 'CUTI',
          Action: 'PENGAJUAN',
          Title: `Pengajuan Cuti dari ${nama}`,
          Body: `${nama} mengajukan cuti${tgl ? ` pada ${tgl}` : ''}. Klik untuk menyetujui atau menolak.`,
        });
      } catch (e) {
        console.error('[notify cuti ajuan ERROR]', e.message);
      }
    }

    return { id, name: NAME };
  } catch (err) {
    await tx.rollback();
    throw err;
  }
}

async function getApprovalCutiList(NIP, statusFilter, search) {
  const conn = await getConnection();
  let whereClause = `a.NIP = @NIP AND LEFT(a.Id, 1) = 'C'`;
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
    SELECT a.Id, a.Priority, a.NIP, c.Name, a.StatusId, a.UpdDate, b.LeaveDuration, b.LeaveRemark, b.InpDate,
      CASE
        WHEN a.StatusId = 3 THEN 'Approved'
        WHEN a.StatusId = 4 THEN 'Rejected'
        ELSE 'Propose'
      END AS Updates
    FROM hris_Approval a
    LEFT JOIN vw_hris_Leave_Transaction b ON a.Id = b.Id
    LEFT JOIN hris_Employee c ON b.NIP = c.NIP
    WHERE ${whereClause}
    ORDER BY b.InpDate DESC
  `);
  return result.recordset;
}

async function approveCuti(Id, action) {
  const conn = await getConnection();

  const checkResult = await conn.request()
    .input('Id', sql.VarChar, Id)
    .query(`
      SELECT Id, StatusId, UpdDate FROM hris_Approval WHERE Id = @Id
    `);

  console.log('[approveCuti] Check result:', checkResult.recordset);

  if (checkResult.recordset.length === 0) {
    console.log('[approveCuti] Record not found for Id:', Id);
    return { success: false, error: 'NOT_FOUND' };
  }

  const existing = checkResult.recordset[0];
  console.log('[approveCuti] Existing record:', existing);

  if (existing.UpdDate) {
    console.log('[approveCuti] Already processed:', existing.UpdDate);
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

  console.log('[approveCuti] Update result:', result.rowsAffected);
  const OK = result.rowsAffected[0] > 0;

  if (OK) {
    try {
      const info = await conn.request()
        .input('Id', sql.VarChar, Id)
        .query(`
          SELECT TOP 1 b.NIP AS PemohonNIP, b.LeaveDuration, b.DateProp
          FROM hris_Approval a
          LEFT JOIN vw_hris_Leave_Transaction b ON a.Id = b.Id
          WHERE a.Id = @Id
        `);
      const row = info.recordset[0];
      if (row && row.PemohonNIP) {
        const aksi = action === 'approve' ? 'APPROVE' : 'REJECT';
        const judul = action === 'approve' ? 'Cuti Disetujui' : 'Cuti Ditolak';
        await addNotification({
          NIP: row.PemohonNIP,
          Type: 'CUTI',
          Action: aksi,
          Title: judul,
          Body: `Pengajuan cuti Anda${row.LeaveDuration ? ` (${row.LeaveDuration} hari)` : ''} telah ${action === 'approve' ? 'disetujui' : 'ditolak'}.`,
        });
        await sendWaToNIP(row.PemohonNIP, `Dear {Name},\nCuti anda di *${aksi}*.`);
      }
    } catch (e) {
      console.error('[notify cuti approve ERROR]', e.message);
    }
  }

  return { success: OK };
}

module.exports = { getLeaveSaldo, getLeaveTransactions, getTopLevel, submitLeave, getApprovalCutiList, approveCuti };
