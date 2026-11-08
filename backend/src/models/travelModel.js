const { getConnection, sql } = require('../config/db');
const { addNotification } = require('./notifikasiModel');
const { sendWa, sendWaToNIP, formatTravelApprovalMessage, travelRecipient, needsVehicleManagerApproval, getVehicleManagerRecipients, VEHICLE_MANAGER_NIPS, EMPLOYEE_PORTAL_URL, SECURITY_QR_BASE_URL } = require('../services/waService');
const { createVehicleApprovalToken, verifyVehicleApprovalToken } = require('../services/vehicleApprovalToken');

// Kolom time SQL Server simpan tanpa timezone; kirim string "HH:MM:SS" biar jam apa adanya
function syncVehicleApprovalTokens(tokens, statusId, managerNIP, processedAt) {
  return tokens.map((item) => ({ ...item, statusId, processedByNIP: managerNIP, processedAt }));
}

function timeValue(v) {
  if (v == null) return null;
  const pad = (n) => String(n).padStart(2, '0');
  if (v instanceof Date) {
    if (isNaN(v.getTime())) return null;
    return `${pad(v.getHours())}:${pad(v.getMinutes())}:${pad(v.getSeconds())}`;
  }
  if (typeof v === 'string') {
    const parts = v.split(':').map(Number);
    if (parts.length >= 2 && parts.every((p) => !isNaN(p))) {
      return `${pad(parts[0] || 0)}:${pad(parts[1] || 0)}:${pad(parts[2] || 0)}`;
    }
  }
  return null;
}

function plannedTravelDateTime(date, time) {
  const safeDate = String(date || '-').trim() || '-';
  const safeTime = timeValue(time);
  return `${safeDate}${safeTime ? ` ${safeTime}` : ''}`;
}

async function detectRole(NIP) {
  const conn = await getConnection();
  const result = await conn.request()
    .input('NIP', sql.VarChar, NIP)
    .query(`
      SELECT d.NamaDepartemen
      FROM hris_Employee a
      LEFT JOIN MASCOSTCENTER d ON a.DepartID = d.DepartID
      WHERE a.NIP = @NIP
    `);
  const dept = result.recordset[0]?.NamaDepartemen ? String(result.recordset[0].NamaDepartemen).toLowerCase() : '';
  if (dept.includes('human capital')) return 'HR';
  if (dept.includes('general services')) return 'GS';
  return null;
}

async function submitTravel(NIP, { id, startDate, endDate, startTime, endTime, tujuan, keperluan, atasanNIP, vehicleType, vehiclePlate, driverMode, driverNIP }) {
  const conn = await getConnection();
  const transaction = new sql.Transaction(conn);
  await transaction.begin();
  try {
    await transaction.request().query('SET XACT_ABORT ON;');
    const result = await transaction.request()
      .input('Id', sql.VarChar, id)
      .input('NIP', sql.VarChar, NIP)
      .input('StartDate', sql.Date, startDate)
      .input('EndDate', sql.Date, endDate)
      .input('StartTime', sql.VarChar, timeValue(startTime))
      .input('EndTime', sql.VarChar, timeValue(endTime))
      .input('Tujuan', sql.NVarChar, tujuan)
      .input('Keperluan', sql.NVarChar, keperluan)
      .input('VehicleType', sql.VarChar, vehicleType)
      .input('VehiclePlate', sql.VarChar, vehiclePlate || null)
      .input('DriverMode', sql.VarChar, driverMode || null)
      .input('DriverNIP', sql.VarChar, driverNIP || null)
      .query(`
        INSERT INTO hris_Travel (Id, NIP, StartDate, EndDate, StartTime, EndTime, Tujuan, Keperluan, VehicleType, VehiclePlate, DriverMode, DriverNIP, Status, CurrentLevel, IsActive, InpDate)
        VALUES (@Id, @NIP, @StartDate, @EndDate, @StartTime, @EndTime, @Tujuan, @Keperluan, @VehicleType, @VehiclePlate, @DriverMode, @DriverNIP, 'PENDING', 1, 1, GETDATE())
      `);
    if (result.rowsAffected[0] === 0) throw new Error('Gagal simpan');

    const levels = [
      { level: 1, nip: atasanNIP },
      { level: 2, nip: null },
      { level: 3, nip: null },
    ];
    for (const lv of levels) {
      await transaction.request()
        .input('TravelId', sql.VarChar, id)
        .input('Level', sql.Int, lv.level)
        .input('NIP', sql.VarChar, lv.nip)
        .query(`
          INSERT INTO hris_Travel_Approval (TravelId, [Level], NIP, StatusId, UpdDate, Remark)
          VALUES (@TravelId, @Level, @NIP, 1, NULL, NULL)
        `);
    }
    await transaction.commit();
  } catch (error) {
    try { await transaction.rollback(); } catch {}
    throw error;
  }

  const empRes = await conn.request()
    .input('NIP', sql.VarChar, NIP)
    .query(`SELECT TOP 1 Name FROM BMC.dbo.hris_Employee WHERE NIP = @NIP`);
  const submitterName = String((empRes.recordset[0] || {}).Name || NIP).trim();
  const tglLabel = `${endDate || startDate}`;
  try {
    await addNotification({
      NIP: atasanNIP,
      Type: 'TRAVEL',
      Action: 'PENGAJUAN',
      Title: `Pengajuan Tugas Luar dari ${submitterName}`,
      Body: `${submitterName} mengajukan tugas luar${tglLabel ? ` pada ${tglLabel}` : ''}. Klik untuk menyetujui atau menolak.`,
    });
  } catch (e) {
    console.error('[notify travel ajuan ERROR]', e.message);
  }
  try {
    const atasanRes = await conn.request()
      .input('NIP', sql.VarChar, atasanNIP)
      .query(`SELECT TOP 1 Name, Phone FROM BMC.dbo.hris_Employee WHERE NIP = @NIP`);
    const atasan = atasanRes.recordset[0];
    if (atasan) {
      const approvalToken = createVehicleApprovalToken('__ATASAN_QUEUE__', String(atasanNIP).trim(), Date.now(), 1);
      const webLink = EMPLOYEE_PORTAL_URL ? `${EMPLOYEE_PORTAL_URL}/approval/atasan/queue/${encodeURIComponent(approvalToken)}` : '';
      const text = formatTravelApprovalMessage({
        approverName: atasan.Name,
        members: [{ name: submitterName, nip: NIP }],
        tujuan,
        keperluan,
        vehicle: vehicleType,
        driver: driverMode === 'SELF' ? NIP : '',
        approvalLink: webLink,
      });
      await sendWa({ no: travelRecipient(NIP, atasan.Phone), text });
    }
  } catch (e) {
    console.error('[WA] travel submit error:', e.message);
  }

  return { success: true, id };
}

async function autoCloseTravels() {
  const conn = await getConnection()
  const result = await conn.request().query(`
    UPDATE t
    SET IsActive = 0, AutoClosedAt = GETDATE()
    FROM hris_Travel t
    OUTER APPLY (
      SELECT TOP 1 DepartureTime, ReturnedDate, ReturnedTime
      FROM vms.SecurityTravelCheckpoints
      WHERE TravelId = t.Id
      ORDER BY Id DESC
    ) cp
    WHERE t.[Status] = 'APPROVED'
      AND t.IsActive = 1
      AND t.AutoClosedAt IS NULL
      AND cp.DepartureTime IS NOT NULL
       AND CONVERT(date, cp.DepartureTime) < CONVERT(date, GETDATE())
       AND NOT EXISTS (SELECT 1 FROM vms.SecurityTravelCheckpoints returnedCp WHERE returnedCp.TravelId = t.Id AND (returnedCp.ReturnedDate IS NOT NULL OR returnedCp.ReturnedTime IS NOT NULL))
  `)
  return result.rowsAffected[0] || 0
}

async function getMyTravels(NIP) {
  const conn = await getConnection();
  const result = await conn.request()
    .input('NIP', sql.VarChar, NIP)
    .query(`
      SELECT t.Id, t.NIP, t.StartDate, t.EndDate, t.StartTime, t.EndTime, t.Tujuan, t.Keperluan, t.VehicleType, t.VehiclePlate, t.DriverMode, t.DriverNIP, t.DriverName, t.[Status], t.CurrentLevel, t.AutoClosedAt, t.InpDate,
             cp.DepartureTime, cp.ReturnedDate AS CheckpointReturnedDate, cp.ReturnedTime AS CheckpointReturnedTime,
             CASE WHEN t.[Status] = 'APPROVED' AND ta.StatusId = 3 THEN ta.Remark ELSE NULL END AS QrTokenRemark
      FROM hris_Travel t
      LEFT JOIN hris_Travel_Approval ta ON ta.TravelId = t.Id AND ta.[Level] = 3
      OUTER APPLY (
        SELECT TOP 1 DepartureTime, ReturnedDate, ReturnedTime
        FROM vms.SecurityTravelCheckpoints
        WHERE TravelId = t.Id
        ORDER BY Id DESC
      ) cp
      WHERE t.NIP = @NIP
      ORDER BY t.InpDate DESC
    `);
  return result.recordset;
}

async function getTravelApprovals(NIP, role) {
  const conn = await getConnection();
  let where;
  if (role === 'ATASAN') {
    where = `(ta.[Level] = 1 AND ta.NIP = @NIP)`;
  } else if (role === 'HR') {
    where = `(ta.[Level] = 2)`;
  } else if (role === 'GS') {
    where = `(ta.[Level] = 3)`;
  } else {
    return [];
  }
  const result = await conn.request()
    .input('NIP', sql.VarChar, NIP)
    .query(`
      SELECT t.Id, t.NIP, t.StartDate, t.EndDate, t.StartTime, t.EndTime, t.Tujuan, t.Keperluan, t.VehicleType, t.VehiclePlate, t.DriverMode, t.DriverNIP, t.DriverName, t.[Status], t.CurrentLevel,
             ta.[Level], ta.StatusId, ta.UpdDate,
             e.Name AS PemohonName
      FROM hris_Travel_Approval ta
      INNER JOIN hris_Travel t ON ta.TravelId = t.Id
      LEFT JOIN hris_Employee e ON t.NIP = e.NIP
      WHERE ${where} AND t.IsActive = 1 AND ta.StatusId = 1 AND t.CurrentLevel = ta.[Level]
      ORDER BY t.InpDate DESC
    `);
  return result.recordset;
}

async function getWebApproverNIP(travelId) {
  const conn = await getConnection();
  const result = await conn.request()
    .input('TravelId', sql.VarChar, travelId)
    .query(`
      SELECT TOP 1 NIP, [Level]
      FROM hris_Travel_Approval
      WHERE TravelId = @TravelId AND [Level] = 1 AND StatusId = 1
      ORDER BY [Level] ASC
    `);
  return result.recordset[0] || null;
}

async function getTravelApprovalByToken(travelId, token) {
  const conn = await getConnection();
  const result = await conn.request()
    .input('TravelId', sql.VarChar, travelId)
    .query(`
      SELECT TOP 1 t.Id, t.NIP, t.StartDate, t.EndDate, t.StartTime, t.EndTime, t.Tujuan, t.Keperluan,
             t.VehicleType, t.VehiclePlate, t.DriverMode, t.DriverNIP, t.DriverName, t.[Status], t.CurrentLevel, ta.StatusId, ta.UpdDate, ta.NIP AS ApproverNIP,
             e.Name AS PemohonName, approver.Name AS ApproverName
      FROM hris_Travel t
      INNER JOIN hris_Travel_Approval ta ON ta.TravelId = t.Id AND ta.[Level] = 1
      LEFT JOIN hris_Employee e ON e.NIP = t.NIP
       LEFT JOIN hris_Employee approver ON approver.NIP = ta.NIP
      WHERE t.Id = @TravelId AND t.IsActive = 1
    `);
  const row = result.recordset[0];
  if (!row) return null;
  const expected = String(row.ApproverNIP || '').trim();
  const payload = verifyVehicleApprovalToken(token);
  if (!payload || payload.travelId !== travelId || payload.level !== 1 || payload.nip !== expected) return null;
  return row;
}

async function approveTravelByToken(travelId, token, action) {
  const row = await getTravelApprovalByToken(travelId, token);
  if (!row || row.StatusId !== 1) return { success: false };
  return approveTravel(travelId, row.ApproverNIP, 1, action, 'ATASAN');
}

async function getTravelApprovalQueueByToken(token) {
  const payload = verifyVehicleApprovalToken(token);
  if (!payload || payload.level !== 1 || payload.travelId !== '__ATASAN_QUEUE__') return null;
  const conn = await getConnection();
  const result = await conn.request()
    .input('ApproverNIP', sql.VarChar, payload.nip)
    .query(`
      SELECT t.Id, t.NIP, t.StartDate, t.EndDate, t.StartTime, t.EndTime, t.Tujuan, t.Keperluan,
             t.[Status], t.CurrentLevel, ta.StatusId, ta.UpdDate, ta.NIP AS ApproverNIP,
             e.Name AS PemohonName, approver.Name AS ApproverName
      FROM hris_Travel t
      INNER JOIN hris_Travel_Approval ta ON ta.TravelId = t.Id
        AND ta.[Level] = 1 AND ta.NIP = @ApproverNIP
      LEFT JOIN hris_Employee e ON e.NIP = t.NIP
      LEFT JOIN hris_Employee approver ON approver.NIP = ta.NIP
      WHERE t.IsActive = 1
      ORDER BY t.InpDate DESC
    `);
  return result.recordset;
}

async function approveTravelByQueueToken(travelId, token, action) {
  const payload = verifyVehicleApprovalToken(token);
  if (!payload || payload.level !== 1 || payload.travelId !== '__ATASAN_QUEUE__') return { success: false };
  const conn = await getConnection();
  const result = await conn.request()
    .input('TravelId', sql.VarChar, travelId)
    .input('ApproverNIP', sql.VarChar, payload.nip)
    .query(`
      SELECT TOP 1 ta.NIP
      FROM hris_Travel_Approval ta
      INNER JOIN hris_Travel t ON t.Id = ta.TravelId
      WHERE ta.TravelId = @TravelId AND ta.[Level] = 1 AND ta.NIP = @ApproverNIP
        AND ta.StatusId = 1 AND t.CurrentLevel = 1 AND t.IsActive = 1
    `);
  if (!result.recordset[0]) return { success: false };
  return approveTravel(travelId, payload.nip, 1, action, 'ATASAN');
}

function parseApprovalRemark(value) {
  const raw = String(value || '');
  try { return JSON.parse(raw); } catch { return raw ? { qrToken: raw } : null; }
}

function getQrToken(value) {
  const approval = parseApprovalRemark(value);
  const token = typeof approval?.qrToken === 'string' ? approval.qrToken.trim() : '';
  return /^[a-f0-9]{48}$/i.test(token) ? token : '';
}

function isTravelQrReadable(row, token) {
  return row?.CheckpointReturnedDate == null && row?.CheckpointReturnedTime == null && getQrToken(row?.Remark) === token;
}

function isTravelQrAvailable(row, token) {
  const approval = parseApprovalRemark(row?.Remark);
  return row?.EndDate == null && isTravelQrReadable(row, token) && !approval?.departureAt;
}

async function getTravelQr(travelId, token) {
  const conn = await getConnection();
  const result = await conn.request()
    .input('TravelId', sql.VarChar, travelId)
    .query(`
      SELECT TOP 1 t.Id, t.Tujuan, t.StartDate, t.EndDate, t.EndTime,
             cp.DepartureTime, cp.ReturnedDate AS CheckpointReturnedDate,
             cp.ReturnedTime AS CheckpointReturnedTime, ta.Remark
      FROM hris_Travel t
      INNER JOIN hris_Travel_Approval ta ON ta.TravelId = t.Id
      OUTER APPLY (
        SELECT TOP 1 DepartureTime, ReturnedDate, ReturnedTime
        FROM vms.SecurityTravelCheckpoints
        WHERE TravelId = t.Id
        ORDER BY Id DESC
      ) cp
      WHERE t.Id = @TravelId AND t.[Status] = 'APPROVED' AND t.IsActive = 1
        AND ta.[Level] = 3 AND ta.StatusId = 3
    `);
  const row = result.recordset[0];
  if (!isTravelQrReadable(row, token)) return null;
  return row;
}

async function scanTravel(travelId, token) {
  const conn = await getConnection();
  const transaction = new sql.Transaction(conn);
  await transaction.begin();
  try {
    const result = await transaction.request()
      .input('TravelId', sql.VarChar, travelId)
      .query(`
        SELECT TOP 1 t.Id, t.EndDate, ta.Remark
        FROM hris_Travel t WITH (UPDLOCK, HOLDLOCK)
        INNER JOIN hris_Travel_Approval ta WITH (UPDLOCK, HOLDLOCK)
          ON ta.TravelId = t.Id AND ta.[Level] = 3 AND ta.StatusId = 3
        WHERE t.Id = @TravelId AND t.[Status] = 'APPROVED' AND t.IsActive = 1
      `);
    const row = result.recordset[0];
    if (!row || getQrToken(row.Remark) !== token) {
      await transaction.rollback();
      return { status: 'invalid' };
    }
    if (row.EndDate != null) {
      await transaction.rollback();
      return { status: 'already_departed' };
    }
    const approval = parseApprovalRemark(row.Remark);
    if (!approval?.departureAt) {
      const nextRemark = JSON.stringify({ ...approval, qrToken: token, departureAt: new Date().toISOString() });
      const updated = await transaction.request()
        .input('TravelId', sql.VarChar, travelId)
        .input('Remark', sql.NVarChar(sql.MAX), nextRemark)
        .query(`
          UPDATE hris_Travel_Approval
          SET Remark = @Remark, UpdDate = GETDATE()
          WHERE TravelId = @TravelId AND [Level] = 3 AND StatusId = 3
        `);
      if (updated.rowsAffected[0] !== 1) throw new Error('Keberangkatan gagal disimpan.');
      await transaction.commit();
      return { status: 'departed' };
    }
    await transaction.rollback();
    return { status: 'already_departed' };
  } catch (error) {
    try { await transaction.rollback(); } catch {}
    throw error;
  }
}

async function getVehicleApprovals() {
  const conn = await getConnection();
  const result = await conn.request().query(`
    SELECT t.Id, t.NIP, t.StartDate, t.EndDate, t.StartTime, t.EndTime,
           t.Tujuan, t.Keperluan, t.VehicleType, t.VehiclePlate, t.DriverMode, t.DriverNIP, t.DriverName,
           t.[Status], t.CurrentLevel, e.Name AS PemohonName,
           ta1.StatusId AS AtasanStatusId, ta3.StatusId AS VehicleStatusId
    FROM hris_Travel t
    LEFT JOIN hris_Employee e ON t.NIP = e.NIP
    INNER JOIN hris_Travel_Approval ta1 ON ta1.TravelId = t.Id AND ta1.[Level] = 1
    INNER JOIN hris_Travel_Approval ta3 ON ta3.TravelId = t.Id AND ta3.[Level] = 3
    WHERE ta1.StatusId IN (1, 3) AND ta3.StatusId IN (1, 3) AND t.IsActive = 1
    ORDER BY t.InpDate DESC
  `);
  return result.recordset;
}

async function getVehicleApproval(travelId, token) {
  const conn = await getConnection();
  const result = await conn.request()
    .input('TravelId', sql.VarChar, travelId)
    .query(`
      SELECT TOP 1 t.Id, t.NIP, t.StartDate, t.EndDate, t.StartTime, t.EndTime, t.Tujuan, t.Keperluan,
             t.VehicleType, t.VehiclePlate, t.DriverMode, t.DriverNIP, t.DriverName, t.[Status], t.CurrentLevel, ta.Remark AS ApprovalRemark,
             e.Name AS PemohonName
      FROM hris_Travel t
      INNER JOIN hris_Travel_Approval ta ON ta.TravelId = t.Id AND ta.[Level] = 3
      LEFT JOIN hris_Employee e ON e.NIP = t.NIP
      WHERE t.Id = @TravelId AND t.IsActive = 1
    `);
  const row = result.recordset[0];
  if (!row) return null;
  let state = null;
  try { state = JSON.parse(String(row.ApprovalRemark || '')); } catch { state = null; }
  const manager = state?.tokens?.find((item) => item.token === token);
  if (!manager) return null;
  const statusId = state.finalStatusId === 3 || state.finalStatusId === 4 ? state.finalStatusId : manager.statusId;
  return { ...row, managerStatusId: statusId, processedByNIP: state.processedByNIP || manager.processedByNIP, processedAt: state.processedAt || manager.processedAt };
}

async function getVehicleApprovalQueueByToken(token) {
  const payload = verifyVehicleApprovalToken(token);
  if (!payload || payload.level !== 3 || payload.travelId !== '__KENDARAAN_QUEUE__') return null;
  const conn = await getConnection();
  const result = await conn.request().query(`
    SELECT t.Id, t.NIP, t.StartDate, t.EndDate, t.StartTime, t.EndTime, t.Tujuan, t.Keperluan,
           t.VehicleType, t.VehiclePlate, t.DriverMode, t.DriverNIP, t.DriverName, ta.Remark AS ApprovalRemark, e.Name AS PemohonName
    FROM hris_Travel t
    INNER JOIN hris_Travel_Approval ta ON ta.TravelId = t.Id AND ta.[Level] = 3
    LEFT JOIN hris_Employee e ON e.NIP = t.NIP
    WHERE t.IsActive = 1 AND ta.StatusId IN (1, 3, 4)
    ORDER BY t.InpDate DESC
  `);
  return result.recordset.flatMap((row) => {
    let state;
    try { state = JSON.parse(String(row.ApprovalRemark || '')); } catch { return []; }
    const manager = state?.tokens?.find((item) => item.nip === payload.nip);
    if (!manager) return [];
    const statusId = state.finalStatusId === 3 || state.finalStatusId === 4 ? state.finalStatusId : manager.statusId;
    return [{ ...row, managerStatusId: statusId, processedByNIP: state.processedByNIP || manager.processedByNIP, processedAt: state.processedAt || manager.processedAt }];
  });
}

async function approveVehicleByQueueToken(travelId, token, managerNIP, vehicleType, vehiclePlate, action, driverName = '') {
  const rows = await getVehicleApprovalQueueByToken(token);
  const row = rows?.find((item) => item.Id === travelId);
  if (!row || row.managerStatusId !== 1) return { success: false };
  let state;
  try { state = JSON.parse(String(row.ApprovalRemark || '')); } catch { state = null; }
  const manager = state?.tokens?.find((item) => item.nip === managerNIP && item.statusId === 1);
  if (!manager) return { success: false };
  return approveVehicle(travelId, manager.token, managerNIP, vehicleType, vehiclePlate, action, driverName);
}

async function approveVehicle(travelId, token, managerNIP, vehicleType, vehiclePlate, action, driverName = '') {
  const conn = await getConnection();
  const current = await conn.request()
    .input('TravelId', sql.VarChar, travelId)
    .query(`SELECT TOP 1 Remark FROM hris_Travel_Approval WHERE TravelId = @TravelId AND [Level] = 3 AND StatusId IN (1, 3, 4)`);
  const previousRemark = String(current.recordset[0]?.Remark || '');
  let state;
  try { state = JSON.parse(previousRemark); } catch { state = null; }
  if (!state || !Array.isArray(state.tokens) || !state.tokens.some((item) => item.token === token && item.nip === managerNIP)) return { success: false };
  if (state.finalStatusId === 3 || state.finalStatusId === 4) return { success: false };
  const qrToken = action === 'approve' ? require('crypto').randomBytes(24).toString('hex') : null;
  const processedAt = new Date().toISOString();
  const statusId = action === 'approve' ? 3 : 4;
  const nextState = { ...state, finalStatusId: statusId, processedByNIP: managerNIP, processedAt, qrToken: action === 'approve' ? qrToken : null, tokens: syncVehicleApprovalTokens(state.tokens, statusId, managerNIP, processedAt) };
  const result = await conn.request()
    .input('TravelId', sql.VarChar, travelId)
    .input('NIP', sql.VarChar, managerNIP)
    .input('VehicleType', sql.VarChar, vehicleType)
    .input('VehiclePlate', sql.VarChar, vehiclePlate || null)
    .input('DriverName', sql.NVarChar, driverName || null)
    .input('StatusId', sql.Int, action === 'approve' ? 3 : 4)
    .input('PreviousRemark', sql.NVarChar(sql.MAX), previousRemark)
    .input('Remark', sql.NVarChar(sql.MAX), JSON.stringify(nextState))
    .query(`
      SET XACT_ABORT ON;
      BEGIN TRANSACTION;
      UPDATE hris_Travel_Approval
      SET StatusId = @StatusId, UpdDate = GETDATE(), NIP = @NIP, Remark = @Remark
      WHERE TravelId = @TravelId AND [Level] = 3 AND StatusId = 1 AND Remark = @PreviousRemark;
      IF @@ROWCOUNT = 0
      BEGIN
        ROLLBACK TRANSACTION;
        SELECT CAST(0 AS int) AS Updated;
        RETURN;
      END
      UPDATE hris_Travel
      SET VehicleType = CASE WHEN @StatusId = 3 THEN @VehicleType ELSE VehicleType END,
          VehiclePlate = CASE WHEN @StatusId = 3 THEN @VehiclePlate ELSE VehiclePlate END,
           DriverName = CASE WHEN @StatusId = 3 THEN @DriverName ELSE DriverName END,
          [Status] = CASE WHEN @StatusId = 3 THEN 'APPROVED' ELSE 'REJECTED' END
      WHERE Id = @TravelId;
      COMMIT TRANSACTION;
      SELECT CAST(1 AS int) AS Updated;
    `);
  if (result.recordset?.[0]?.Updated !== 1) return { success: false };
  try {
    const travel = await conn.request().input('TravelId', sql.VarChar, travelId).query(`SELECT TOP 1 NIP FROM hris_Travel WHERE Id = @TravelId`);
    const employeeNIP = String(travel.recordset[0]?.NIP || '').trim();
    if (employeeNIP) {
      const qrLink = action === 'approve' && qrToken && EMPLOYEE_PORTAL_URL ? `${EMPLOYEE_PORTAL_URL}/travel/qr/${encodeURIComponent(travelId)}/${qrToken}` : '';
      await addNotification({ NIP: employeeNIP, Type: 'TRAVEL', Action: action === 'approve' ? 'APPROVE' : 'REJECT', Title: action === 'approve' ? 'Tugas Luar Disetujui' : 'Tugas Luar Ditolak', Body: `Pengajuan tugas luar Anda telah ${action === 'approve' ? 'disetujui' : 'ditolak'}.${qrLink ? ` Buka QR Security: ${qrLink}` : ''}` });
      await sendWaToNIP(employeeNIP, `Dear {Name},\nTugas Luar anda di *${action === 'approve' ? 'APPROVE' : 'REJECT'}*.${qrLink ? `\n\nQR untuk Security: ${qrLink}` : ''}`);
    }
  } catch (error) { console.error('[notify vehicle approval ERROR]', error.message); }
  return { success: true, qrToken };
}

async function approveTravel(travelId, NIP, level, action, role, vehicle = {}) {
  const conn = await getConnection();
  const statusId = action === 'approve' ? 3 : 4;
  let result;

  if (action === 'approve' && level >= 3) {
    const qrToken = require('crypto').randomBytes(24).toString('hex');
    result = await conn.request()
      .input('TravelId', sql.VarChar, travelId)
      .input('NIP', sql.VarChar, NIP)
      .input('VehicleType', sql.VarChar, vehicle.vehicleType)
      .input('VehiclePlate', sql.VarChar, vehicle.vehiclePlate || null)
      .input('QrToken', sql.VarChar, qrToken)
      .query(`
        SET XACT_ABORT ON;
        BEGIN TRANSACTION;
        UPDATE hris_Travel_Approval
        SET StatusId = 3, UpdDate = GETDATE(), NIP = ISNULL(@NIP, NIP)
        WHERE TravelId = @TravelId AND [Level] = 3 AND StatusId = 1;
        IF @@ROWCOUNT = 0
        BEGIN
          ROLLBACK TRANSACTION;
          SELECT CAST(0 AS int) AS Updated;
          RETURN;
        END
        UPDATE hris_Travel
        SET VehicleType = @VehicleType, VehiclePlate = @VehiclePlate, [Status] = 'APPROVED'
        WHERE Id = @TravelId;
        UPDATE hris_Travel_Approval
        SET Remark = @QrToken
        WHERE TravelId = @TravelId AND [Level] = 3 AND StatusId = 3;
        COMMIT TRANSACTION;
        SELECT CAST(1 AS int) AS Updated;
      `);
    if (result.recordset?.[0]?.Updated !== 1) return { success: false, error: 'NOT_FOUND' };
    vehicle.qrToken = qrToken;
  } else {
    result = await conn.request()
      .input('TravelId', sql.VarChar, travelId)
      .input('NIP', sql.VarChar, NIP)
      .input('Level', sql.Int, level)
      .input('StatusId', sql.Int, statusId)
      .query(`
        UPDATE hris_Travel_Approval
        SET StatusId = @StatusId, UpdDate = GETDATE(), NIP = ISNULL(NIP, @NIP)
        WHERE TravelId = @TravelId AND [Level] = @Level AND StatusId = 1 AND (@Level <> 1 OR NIP = @NIP)
      `);

    if (result.rowsAffected[0] === 0) return { success: false, error: 'NOT_FOUND' };

    let vehicleType = '';
    if (action === 'approve' && level === 1) {
      const travel = await conn.request()
        .input('TravelId', sql.VarChar, travelId)
        .query(`SELECT TOP 1 VehicleType FROM hris_Travel WHERE Id = @TravelId`);
      vehicleType = String(travel.recordset[0]?.VehicleType || '').trim().toUpperCase();
    }

    if (action === 'reject') {
      await conn.request()
        .input('TravelId', sql.VarChar, travelId)
        .query(`UPDATE hris_Travel SET [Status] = 'REJECTED' WHERE Id = @TravelId`);
    } else if (level === 1 && needsVehicleManagerApproval(vehicleType)) {
      const approvalState = { tokens: VEHICLE_MANAGER_NIPS.map((nip) => ({ nip, token: createVehicleApprovalToken(travelId, nip), statusId: 1 })), queueTokens: Object.fromEntries(VEHICLE_MANAGER_NIPS.map((nip) => [nip, createVehicleApprovalToken('__KENDARAAN_QUEUE__', nip, Date.now(), 3)])) };
      await conn.request()
        .input('TravelId', sql.VarChar, travelId)
        .input('Remark', sql.NVarChar(sql.MAX), JSON.stringify(approvalState))
        .query(`UPDATE hris_Travel_Approval SET Remark = @Remark WHERE TravelId = @TravelId AND [Level] = 3 AND StatusId = 1`);
      await conn.request()
        .input('TravelId', sql.VarChar, travelId)
        .query(`UPDATE hris_Travel SET CurrentLevel = 3 WHERE Id = @TravelId`);
    } else {
      await conn.request()
        .input('TravelId', sql.VarChar, travelId)
        .input('NextLevel', sql.Int, level + 1)
        .query(`UPDATE hris_Travel SET CurrentLevel = @NextLevel WHERE Id = @TravelId`);
    }
  }

  try {
    const finalApproval = action === 'reject' || level >= 3;
    if (action === 'approve' && level === 1) {
      const travel = await conn.request()
        .input('TravelId', sql.VarChar, travelId)
        .query(`SELECT TOP 1 t.NIP, t.Tujuan, t.Keperluan, t.StartDate, t.StartTime, t.VehicleType, t.VehiclePlate, t.DriverMode, t.DriverNIP, t.DriverName, e.Name AS PemohonName
                FROM hris_Travel t LEFT JOIN hris_Employee e ON t.NIP = e.NIP WHERE t.Id = @TravelId`);
      const row = travel.recordset[0];
      if (row && needsVehicleManagerApproval(row.VehicleType)) {
        const tokenResult = await conn.request().input('TravelId', sql.VarChar, travelId).query(`SELECT TOP 1 Remark FROM hris_Travel_Approval WHERE TravelId = @TravelId AND [Level] = 3`);
        let approvalState = null;
        try { approvalState = JSON.parse(String(tokenResult.recordset[0]?.Remark || '')); } catch { approvalState = null; }
        const recipients = await getVehicleManagerRecipients();
        for (const recipient of recipients) {
          const item = approvalState?.tokens?.find((entry) => entry.nip === recipient.nip);
          if (!item) continue;
          const approvalLink = EMPLOYEE_PORTAL_URL ? `${EMPLOYEE_PORTAL_URL}/approval/kendaraan/queue/${encodeURIComponent(approvalState.queueTokens?.[item.nip] || item.token)}` : '';
          const text = formatTravelApprovalMessage({
            approverName: recipient.name,
            members: [{ name: row.PemohonName || row.NIP, nip: row.NIP }],
            tujuan: row.Tujuan,
            keperluan: row.Keperluan,
            vehicle: row.VehicleType,
            driver: row.DriverMode === 'SELF' ? row.DriverNIP : row.DriverName,
            approvalLink,
          });
          await sendWa({ no: recipient.phone, text });
        }
      }
    }
    if (finalApproval) {
      const pemohon = await conn.request()
        .input('TravelId', sql.VarChar, travelId)
        .query(`SELECT NIP FROM hris_Travel WHERE Id = @TravelId`);
      const pemohonNIP = (pemohon.recordset[0] || {}).NIP;
      if (pemohonNIP) {
        const aksi = action === 'reject' ? 'REJECT' : 'APPROVE';
        const judul = action === 'reject' ? 'Tugas Luar Ditolak' : 'Tugas Luar Disetujui';
        const qrLink = action === 'approve' && level >= 3 && EMPLOYEE_PORTAL_URL && vehicle.qrToken
          ? `${EMPLOYEE_PORTAL_URL}/travel/qr/${encodeURIComponent(travelId)}/${encodeURIComponent(vehicle.qrToken)}`
          : '';
        const body = `Pengajuan tugas luar Anda telah ${action === 'reject' ? 'ditolak' : 'disetujui'}.${qrLink ? ` Buka QR Security: ${qrLink}` : ''}`;
        await addNotification({ NIP: pemohonNIP, Type: 'TRAVEL', Action: aksi, Title: judul, Body: body });
        await sendWaToNIP(pemohonNIP, `Dear {Name},\nTugas Luar anda di *${aksi}*.${qrLink ? `\n\nQR untuk Security: ${qrLink}` : ''}`);
      }
    }
  } catch (e) {
    console.error('[notify travel approve ERROR]', e.message);
  }

  return { success: true };
}

async function issueVehicleApprovalLink(travelId) {
  const conn = await getConnection();
  const token = require('crypto').randomBytes(24).toString('hex');
  const result = await conn.request()
    .input('TravelId', sql.VarChar, travelId)
    .input('Token', sql.VarChar, token)
    .query(`UPDATE hris_Travel_Approval SET Remark = @Token WHERE TravelId = @TravelId AND [Level] = 3 AND StatusId = 1`);
  return result.rowsAffected[0] ? token : null;
}

async function returnTravel(travelId, NIP) {
  const conn = await getConnection();
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const today = `${pad(now.getFullYear())}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const result = await conn.request()
    .input('TravelId', sql.VarChar, travelId)
    .input('NIP', sql.VarChar, NIP)
    .input('Today', sql.Date, today)
    .input('NowTime', sql.VarChar, timeValue(now))
    .query(`UPDATE hris_Travel SET EndDate = @Today, EndTime = @NowTime WHERE Id = @TravelId AND NIP = @NIP AND [Status] = 'APPROVED' AND EndDate IS NULL`);
  return { rowsAffected: result.rowsAffected[0] };
}

async function getActiveTravels(NIP) {
  const conn = await getConnection();
  const result = await conn.request()
    .input('NIP', sql.VarChar, NIP)
    .query(`
      SELECT t.Id, t.NIP, t.StartDate, t.StartTime, t.Tujuan, t.Keperluan, t.[Status],
             e.Name AS Nama
      FROM hris_Travel t
      LEFT JOIN hris_Employee e ON t.NIP = e.NIP
      WHERE t.NIP = @NIP AND t.[Status] = 'APPROVED' AND t.EndDate IS NULL AND t.IsActive = 1
      ORDER BY t.InpDate DESC
    `);
  return result.recordset;
}

module.exports = { detectRole, submitTravel, autoCloseTravels, getMyTravels, getTravelApprovals, getTravelQr, getQrToken, scanTravel, getVehicleApprovals, getVehicleApproval, getVehicleApprovalQueueByToken, approveVehicle, approveVehicleByQueueToken, getActiveTravels, getWebApproverNIP, getTravelApprovalByToken, getTravelApprovalQueueByToken, approveTravelByToken, approveTravelByQueueToken, approveTravel, returnTravel, syncVehicleApprovalTokens, plannedTravelDateTime, isTravelQrAvailable, isTravelQrReadable };
