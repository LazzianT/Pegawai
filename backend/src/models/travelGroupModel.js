const crypto = require('crypto');
const { getConnection, sql } = require('../config/db');
const { sendTravelWaToNIP, sendWaToNIP, formatTravelApprovalMessage, formatTravelApprovedMessage, VEHICLE_MANAGER_NIPS, EMPLOYEE_PORTAL_URL } = require('../services/waService');
const { createVehicleApprovalToken } = require('../services/vehicleApprovalToken');

function validateGroupMembers(values) {
  const members = [...new Set((Array.isArray(values) ? values : []).map((value) => String(value || '').trim()).filter(Boolean))];
  if (!members.length) throw new Error('Minimal 1 anggota group wajib dipilih');
  if (members.length > 100) throw new Error('Maksimal 100 anggota group');
  return members;
}

function groupApproverNips(members) {
  return [...new Set((Array.isArray(members) ? members : []).map((member) => String(member?.approverNIP || '').trim()).filter(Boolean))];
}

function groupStatusAfterApproval({ approved, required, rejected }) {
  if (rejected > 0) return 'REVISION';
  if (required > 0 && approved >= required) return 'VEHICLE_PENDING';
  return 'PENDING';
}

function groupApprovalTransition(approvals) {
  const rows = Array.isArray(approvals) ? approvals : []
  const approved = rows.filter((row) => Number(row.statusId ?? row.StatusId) === 3).length
  const rejected = rows.filter((row) => Number(row.statusId ?? row.StatusId) === 4).length
  const groupStatus = groupStatusAfterApproval({ approved, required: rows.length, rejected })
  return { groupStatus, vehicleApproval: groupStatus === 'VEHICLE_PENDING' }
}

function groupVehicleTransition(action) {
  return action === 'approve' ? { groupStatus: 'APPROVED', qr: true } : { groupStatus: 'REVISION', qr: false }
}

function canSendGroupTravelReminder({ groupStatus, versionStatus, isMember, approverCount }) {
  return String(groupStatus || '').trim().toUpperCase() === 'PENDING'
    && String(versionStatus || '').trim().toUpperCase() === 'PENDING'
    && Boolean(isMember)
    && Number(approverCount) > 0
}

function groupCode() {
  return `TL-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
}

async function employee(conn, nip) {
  const result = await conn.request().input('NIP', sql.VarChar, nip).query(`SELECT TOP 1 NIP, Name, DepartID FROM BMC.dbo.hris_Employee WHERE NIP = @NIP`);
  return result.recordset[0] || null;
}

async function searchGroupEmployees(query) {
  const value = String(query || '').trim();
  if (value.length < 2) return [];
  const conn = await getConnection();
  const result = await conn.request().input('Query', sql.NVarChar, `%${value}%`).query(`SELECT TOP 20 NIP, Name FROM BMC.dbo.hris_Employee WHERE NIP LIKE @Query OR Name LIKE @Query ORDER BY Name, NIP`);
  return result.recordset.map((row) => ({ nip: String(row.NIP || '').trim(), name: String(row.Name || '').trim() }));
}

async function createGroup(actorNIP, payload) {
  const members = validateGroupMembers([actorNIP]);
  const code = groupCode();
  const conn = await getConnection();
  const transaction = new sql.Transaction(conn);
  await transaction.begin();
  await transaction.request().query('SET XACT_ABORT ON;');
  try {
    await transaction.request().input('Code', sql.VarChar, code).input('CreatorNIP', sql.VarChar, actorNIP).query(`INSERT INTO hris_Travel_Group (GroupCode, CreatorNIP, Status, JoinOpen, CreatedAt) VALUES (@Code, @CreatorNIP, 'DRAFT', 1, GETDATE())`);
    await transaction.request().input('Code', sql.VarChar, code).input('VersionNo', sql.Int, 1).input('ExitDate', sql.Date, payload.exitDate).input('ExitTime', sql.VarChar, payload.exitTime).input('Tujuan', sql.NVarChar, payload.tujuan).input('Tugas', sql.NVarChar, payload.tugas || '').input('VehicleType', sql.VarChar, payload.vehicleType || null).input('DriverMode', sql.VarChar, payload.driverMode || null).input('DriverNIP', sql.VarChar, payload.driverNIP || null).input('CreatedBy', sql.VarChar, actorNIP).query(`INSERT INTO hris_Travel_Group_Version (GroupCode, VersionNo, ExitDate, ExitTime, Tujuan, Tugas, VehicleType, DriverMode, DriverNIP, Status, CreatedBy, CreatedAt) VALUES (@Code, @VersionNo, @ExitDate, @ExitTime, @Tujuan, @Tugas, @VehicleType, @DriverMode, @DriverNIP, 'DRAFT', @CreatedBy, GETDATE())`);
    await transaction.request().input('Code', sql.VarChar, code).input('VersionNo', sql.Int, 1).input('NIP', sql.VarChar, members[0]).query(`INSERT INTO hris_Travel_Group_Member (GroupCode, VersionNo, NIP, Status, JoinedAt) VALUES (@Code, @VersionNo, @NIP, 'ACTIVE', GETDATE())`);
    await transaction.commit();
    return { groupCode: code, version: 1 };
  } catch (error) {
    try { await transaction.rollback(); } catch {}
    throw error;
  }
}

async function autoCloseTravelGroups() {
  const conn = await getConnection()
  const transaction = new sql.Transaction(conn)
  await transaction.begin()
  try {
    await transaction.request().query('SET XACT_ABORT ON;')
    const result = await transaction.request().query(`
      UPDATE g
      SET Status = 'AUTO_CLOSED', AutoClosedAt = GETDATE(), UpdatedAt = GETDATE()
      FROM hris_Travel_Group g
      INNER JOIN hris_Travel_Group_Version v ON v.GroupCode = g.GroupCode
        AND v.VersionNo = (SELECT MAX(VersionNo) FROM hris_Travel_Group_Version WHERE GroupCode = g.GroupCode)
      WHERE g.Status = 'APPROVED'
        AND g.AutoClosedAt IS NULL
        AND v.Status = 'APPROVED'
        AND v.AutoClosedAt IS NULL
        AND v.DepartureAt IS NOT NULL
        AND CONVERT(date, v.DepartureAt) < CONVERT(date, GETDATE())
    `)
    await transaction.request().query(`
      UPDATE v
      SET Status = 'AUTO_CLOSED', AutoClosedAt = GETDATE()
      FROM hris_Travel_Group_Version v
      INNER JOIN hris_Travel_Group g ON g.GroupCode = v.GroupCode AND g.Status = 'AUTO_CLOSED'
      WHERE v.VersionNo = (SELECT MAX(VersionNo) FROM hris_Travel_Group_Version WHERE GroupCode = v.GroupCode)
        AND v.AutoClosedAt IS NULL
    `)
    await transaction.commit()
    return result.rowsAffected[0] || 0
  } catch (error) {
    try { await transaction.rollback() } catch {}
    throw error
  }
}

async function getGroup(code, actorNIP) {
  const conn = await getConnection();
  const result = await conn.request().input('Code', sql.VarChar, code).input('NIP', sql.VarChar, actorNIP).query(`
    SELECT g.GroupCode, g.Status, g.JoinOpen, v.VersionNo, v.ExitDate, v.ExitTime, v.Tujuan, v.Tugas, v.QrToken, v.DepartureAt,
           m.NIP, m.Status AS MemberStatus, e.Name
    FROM hris_Travel_Group g
    INNER JOIN hris_Travel_Group_Version v ON v.GroupCode = g.GroupCode AND v.VersionNo = (SELECT MAX(VersionNo) FROM hris_Travel_Group_Version WHERE GroupCode = g.GroupCode)
    LEFT JOIN hris_Travel_Group_Member m ON m.GroupCode = v.GroupCode AND m.VersionNo = v.VersionNo AND m.Status = 'ACTIVE'
    LEFT JOIN BMC.dbo.hris_Employee e ON e.NIP = m.NIP
    WHERE g.GroupCode = @Code AND EXISTS (SELECT 1 FROM hris_Travel_Group_Member accessMember WHERE accessMember.GroupCode = g.GroupCode AND accessMember.VersionNo = v.VersionNo AND accessMember.NIP = @NIP AND accessMember.Status = 'ACTIVE')
  `);
  if (!result.recordset.length) return null;
  const first = result.recordset[0];
  return { groupCode: first.GroupCode, status: first.Status, joinOpen: Boolean(first.JoinOpen), version: first.VersionNo, exitDate: first.ExitDate, exitTime: first.ExitTime, tujuan: first.Tujuan, tugas: first.Tugas, qrToken: first.QrToken || null, departureAt: first.DepartureAt || null, members: result.recordset.filter((row) => row.NIP).map((row) => ({ nip: row.NIP, name: row.Name, status: row.MemberStatus })) };
}

async function addGroupMember(code, actorNIP, memberNIP) {
  const target = String(memberNIP || '').trim();
  if (!/^\d{1,50}$/.test(target)) throw new Error('NIP anggota tidak valid');
  const conn = await getConnection();
  const access = await conn.request().input('Code', sql.VarChar, code).input('ActorNIP', sql.VarChar, actorNIP).query(`SELECT TOP 1 g.Status, v.VersionNo FROM hris_Travel_Group g INNER JOIN hris_Travel_Group_Version v ON v.GroupCode = g.GroupCode AND v.VersionNo = (SELECT MAX(VersionNo) FROM hris_Travel_Group_Version WHERE GroupCode = g.GroupCode) WHERE g.GroupCode = @Code AND g.JoinOpen = 1 AND EXISTS (SELECT 1 FROM hris_Travel_Group_Member m WHERE m.GroupCode = g.GroupCode AND m.VersionNo = v.VersionNo AND m.NIP = @ActorNIP AND m.Status = 'ACTIVE')`);
  const current = access.recordset[0];
  if (!current) throw new Error('Akses group tidak diizinkan');
  if (!await employee(conn, target)) throw new Error('Anggota tidak ditemukan');
  return requestJoin(code, target);
}

async function addDirectGroupMember(code, actorNIP, memberNIP) {
  const target = String(memberNIP || '').trim();
  if (!/^\d{1,50}$/.test(target)) throw new Error('NIP anggota tidak valid');
  const conn = await getConnection();
  const tx = new sql.Transaction(conn);
  await tx.begin();
  await tx.request().query('SET XACT_ABORT ON;');
  try {
    const currentResult = await tx.request().input('Code', sql.VarChar, code).input('ActorNIP', sql.VarChar, actorNIP).query(`SELECT TOP 1 g.Status, v.VersionNo FROM hris_Travel_Group g WITH (UPDLOCK, HOLDLOCK) INNER JOIN hris_Travel_Group_Version v ON v.GroupCode = g.GroupCode AND v.VersionNo = (SELECT MAX(VersionNo) FROM hris_Travel_Group_Version WHERE GroupCode = g.GroupCode) WHERE g.GroupCode = @Code AND g.CreatorNIP = @ActorNIP AND g.JoinOpen = 1 AND g.Status = 'DRAFT'`);
    const current = currentResult.recordset[0];
    if (!current) throw new Error('Akses group tidak diizinkan');
    const employeeResult = await tx.request().input('NIP', sql.VarChar, target).query('SELECT TOP 1 NIP FROM BMC.dbo.hris_Employee WHERE NIP = @NIP');
    if (!employeeResult.recordset[0]) throw new Error('Anggota tidak ditemukan');
    const existingResult = await tx.request().input('Code', sql.VarChar, code).input('VersionNo', sql.Int, current.VersionNo).input('NIP', sql.VarChar, target).query(`SELECT TOP 1 Status FROM hris_Travel_Group_Member WITH (UPDLOCK, HOLDLOCK) WHERE GroupCode = @Code AND VersionNo = @VersionNo AND NIP = @NIP`);
    const existing = existingResult.recordset[0];
    if (existing?.Status === 'ACTIVE') {
      await tx.commit();
      return { success: true, groupCode: code, version: current.VersionNo, nip: target, status: 'ACTIVE' };
    }
    if (existing) {
      await tx.request().input('Code', sql.VarChar, code).input('VersionNo', sql.Int, current.VersionNo).input('NIP', sql.VarChar, target).query(`UPDATE hris_Travel_Group_Member SET Status = 'ACTIVE', JoinedAt = GETDATE(), RemovedAt = NULL WHERE GroupCode = @Code AND VersionNo = @VersionNo AND NIP = @NIP`);
    } else {
      await tx.request().input('Code', sql.VarChar, code).input('VersionNo', sql.Int, current.VersionNo).input('NIP', sql.VarChar, target).query(`INSERT INTO hris_Travel_Group_Member (GroupCode, VersionNo, NIP, Status, JoinedAt) VALUES (@Code, @VersionNo, @NIP, 'ACTIVE', GETDATE())`);
    }
    await tx.commit();
    return { success: true, groupCode: code, version: current.VersionNo, nip: target, status: 'ACTIVE' };
  } catch (error) {
    try { await tx.rollback(); } catch {}
    throw error;
  }
}

async function removeGroupMember(code, actorNIP, memberNIP) {
  const target = String(memberNIP || '').trim();
  const conn = await getConnection();
  const result = await conn.request().input('Code', sql.VarChar, code).input('ActorNIP', sql.VarChar, actorNIP).input('TargetNIP', sql.VarChar, target).query(`
    UPDATE m SET Status = 'REMOVED', RemovedAt = GETDATE()
    FROM hris_Travel_Group_Member m
    INNER JOIN hris_Travel_Group g ON g.GroupCode = m.GroupCode
    WHERE m.GroupCode = @Code AND m.VersionNo = (SELECT MAX(VersionNo) FROM hris_Travel_Group_Member WHERE GroupCode = @Code) AND m.NIP = @TargetNIP AND m.Status = 'ACTIVE' AND g.JoinOpen = 1 AND EXISTS (SELECT 1 FROM hris_Travel_Group_Member actorMember WHERE actorMember.GroupCode = g.GroupCode AND actorMember.VersionNo = m.VersionNo AND actorMember.NIP = @ActorNIP AND actorMember.Status = 'ACTIVE')
  `);
  if (!result.rowsAffected[0]) throw new Error('Anggota tidak ditemukan atau akses tidak diizinkan');
  return { success: true };
}

async function approverForMember(tx, nip) {
  const result = await tx.request().input('NIP', sql.VarChar, nip).query(`SELECT TOP 1 NIP FROM hris_GetTopLevel(@NIP) ORDER BY JobSeq DESC`);
  return String(result.recordset[0]?.NIP || '').trim();
}

async function submitGroup(code, actorNIP, input = {}) {
  const conn = await getConnection();
  const tx = new sql.Transaction(conn);
  await tx.begin();
  await tx.request().query('SET XACT_ABORT ON;');
  try {
    const versionResult = await tx.request().input('Code', sql.VarChar, code).input('ActorNIP', sql.VarChar, actorNIP).query(`SELECT TOP 1 g.Status, v.VersionNo, v.Tujuan, v.Tugas, v.VehicleType FROM hris_Travel_Group g WITH (UPDLOCK, HOLDLOCK) INNER JOIN hris_Travel_Group_Version v ON v.GroupCode = g.GroupCode WHERE g.GroupCode = @Code AND v.VersionNo = (SELECT MAX(VersionNo) FROM hris_Travel_Group_Version WHERE GroupCode = @Code) AND EXISTS (SELECT 1 FROM hris_Travel_Group_Member m WHERE m.GroupCode = g.GroupCode AND m.VersionNo = v.VersionNo AND m.NIP = @ActorNIP AND m.Status = 'ACTIVE')`);
    const current = versionResult.recordset[0];
    if (!current || current.Status !== 'DRAFT') throw new Error('Group tidak dapat dikirim');
    const vehicleType = String(input.vehicleType || current.VehicleType || '').trim().toUpperCase();
    if (!['PRIVATE', 'ONLINE', 'OFFICE', 'MOTOR'].includes(vehicleType)) throw new Error('Jenis kendaraan wajib dipilih');
    const driverMode = String(input.driverMode || '').trim().toUpperCase();
    const driverNIP = String(input.driverNIP || '').trim();
    if (['OFFICE', 'MOTOR'].includes(vehicleType) && driverMode === 'DRIVER' && driverNIP) throw new Error('NIP pengemudi tidak boleh diisi untuk mode supir');
    if (['OFFICE', 'MOTOR'].includes(vehicleType) && !['SELF', 'DRIVER'].includes(driverMode)) throw new Error('Cara berkendara wajib dipilih');
    const members = await tx.request().input('Code', sql.VarChar, code).input('VersionNo', sql.Int, current.VersionNo).query(`SELECT m.NIP, e.Name FROM hris_Travel_Group_Member m LEFT JOIN BMC.dbo.hris_Employee e ON e.NIP = m.NIP WHERE m.GroupCode = @Code AND m.VersionNo = @VersionNo AND m.Status = 'ACTIVE'`);
    const memberNIPs = members.recordset.map((member) => String(member.NIP).trim());
    if (driverMode === 'SELF' && (!/^\d{1,50}$/.test(driverNIP) || !memberNIPs.includes(driverNIP))) throw new Error('Pengemudi harus anggota group');
    await tx.request().input('Code', sql.VarChar, code).input('VersionNo', sql.Int, current.VersionNo).input('VehicleType', sql.VarChar, vehicleType || null).input('DriverMode', sql.VarChar, driverMode || null).input('DriverNIP', sql.VarChar, driverMode === 'SELF' ? driverNIP : null).query(`UPDATE hris_Travel_Group_Version SET VehicleType = @VehicleType, DriverMode = @DriverMode, DriverNIP = @DriverNIP WHERE GroupCode = @Code AND VersionNo = @VersionNo`);
    const approvers = new Set();
    for (const member of members.recordset) {
      const nip = await approverForMember(tx, member.NIP);
      if (!nip) throw new Error(`Atasan untuk NIP ${member.NIP} tidak ditemukan`);
      approvers.add(nip);
    }
    for (const nip of approvers) await tx.request().input('Code', sql.VarChar, code).input('VersionNo', sql.Int, current.VersionNo).input('NIP', sql.VarChar, nip).query(`INSERT INTO hris_Travel_Group_Approval (GroupCode, VersionNo, ApprovalType, ApproverNIP, StatusId) VALUES (@Code, @VersionNo, 'ATASAN', @NIP, 1)`);
    await tx.request().input('Code', sql.VarChar, code).input('VersionNo', sql.Int, current.VersionNo).query(`UPDATE hris_Travel_Group SET Status = 'PENDING', JoinOpen = 0, UpdatedAt = GETDATE() WHERE GroupCode = @Code; UPDATE hris_Travel_Group_Version SET Status = 'PENDING' WHERE GroupCode = @Code AND VersionNo = @VersionNo`);
    await tx.commit();
    for (const nip of approvers) {
      try {
        const token = createVehicleApprovalToken('__ATASAN_QUEUE__', nip, Date.now(), 1);
        const approvalLink = EMPLOYEE_PORTAL_URL ? `${EMPLOYEE_PORTAL_URL}/approval/atasan/queue/${encodeURIComponent(token)}` : '';
        const text = formatTravelApprovalMessage({
          approverName: '{Name}',
          members: members.recordset,
          tujuan: current.Tujuan,
          keperluan: current.Tugas,
          startDate: current.ExitDate,
          startTime: current.ExitTime,
          vehicle: current.VehicleType,
          driver: input.driverMode === 'SELF' ? input.driverNIP : '',
          approvalLink,
        });
        await sendTravelWaToNIP(nip, text);
      } catch {}
    }
    return { success: true, groupCode: code, version: current.VersionNo, approverCount: approvers.size };
  } catch (error) { try { await tx.rollback(); } catch {} throw error; }
}

async function getGroupApprovalQueue(approverNIP) {
  const conn = await getConnection();
  const result = await conn.request().input('ApproverNIP', sql.VarChar, approverNIP).query(`
    SELECT a.GroupCode, a.VersionNo, a.ApproverNIP, a.StatusId, a.UpdatedAt, v.CreatedAt,
           g.Status AS GroupStatus, v.ExitDate, v.ExitTime, v.Tujuan, v.Tugas, v.DriverMode, v.DriverNIP, v.DriverName, v.AutoClosedAt,
           m.NIP AS MemberNIP, e.Name AS MemberName
    FROM hris_Travel_Group_Approval a
    INNER JOIN hris_Travel_Group g ON g.GroupCode = a.GroupCode
    INNER JOIN hris_Travel_Group_Version v ON v.GroupCode = a.GroupCode AND v.VersionNo = a.VersionNo
    INNER JOIN hris_Travel_Group_Member m ON m.GroupCode = a.GroupCode AND m.VersionNo = a.VersionNo AND m.Status = 'ACTIVE'
    LEFT JOIN BMC.dbo.hris_Employee e ON e.NIP = m.NIP
    WHERE a.ApprovalType = 'ATASAN' AND a.ApproverNIP = @ApproverNIP AND a.StatusId = 1 AND g.Status = 'PENDING'
       AND a.VersionNo = (SELECT MAX(VersionNo) FROM hris_Travel_Group_Version WHERE GroupCode = a.GroupCode)
     ORDER BY a.VersionNo DESC, a.GroupCode, m.NIP
  `);
  const groups = new Map();
  for (const row of result.recordset) {
    const key = `${row.GroupCode}:${row.VersionNo}`;
    const item = groups.get(key) || { id: `G.${row.GroupCode}.${row.VersionNo}`, groupCode: row.GroupCode, groupVersion: row.VersionNo, nip: row.MemberNIP, nama: row.MemberName || row.MemberNIP, tujuan: row.Tujuan, alasan: row.Tugas, tanggalMulai: row.ExitDate, jamMulai: row.ExitTime, driverMode: row.DriverMode, driverNIP: row.DriverNIP, driverName: row.DriverName, autoClosedAt: row.AutoClosedAt, createdAt: row.CreatedAt, statusId: row.StatusId, status: row.GroupStatus, updates: row.StatusId === 3 ? 'Approved' : row.StatusId === 4 ? 'Rejected' : 'Propose', members: [] };
    item.members.push({ nip: row.MemberNIP, name: row.MemberName || row.MemberNIP });
    groups.set(key, item);
  }
  return [...groups.values()];
}

async function sendGroupTravelReminder(groupId, actorNIP) {
  const match = String(groupId || '').trim().match(/^G\.(TL-[A-Z0-9]{6})\.(\d+)$/)
  if (!match) return { status: 'not_found' }
  const code = match[1]
  const version = Number(match[2])
  const conn = await getConnection()
  const result = await conn.request()
    .input('Code', sql.VarChar, code)
    .input('VersionNo', sql.Int, version)
    .input('ActorNIP', sql.VarChar, actorNIP)
    .query(`
      SELECT v.Status AS VersionStatus, g.Status AS GroupStatus, v.ExitDate, v.ExitTime, v.Tujuan, v.Tugas,
             m.NIP AS MemberNIP, e.Name AS MemberName, a.ApproverNIP, approver.Name AS ApproverName,
             approver.Phone AS ApproverPhone
      FROM hris_Travel_Group g
      INNER JOIN hris_Travel_Group_Version v ON v.GroupCode = g.GroupCode AND v.VersionNo = @VersionNo
      INNER JOIN hris_Travel_Group_Member accessMember ON accessMember.GroupCode = g.GroupCode AND accessMember.VersionNo = v.VersionNo AND accessMember.NIP = @ActorNIP AND accessMember.Status = 'ACTIVE'
      INNER JOIN hris_Travel_Group_Member m ON m.GroupCode = g.GroupCode AND m.VersionNo = v.VersionNo AND m.Status = 'ACTIVE'
      INNER JOIN hris_Travel_Group_Approval a ON a.GroupCode = g.GroupCode AND a.VersionNo = v.VersionNo AND a.ApprovalType = 'ATASAN' AND a.StatusId = 1
      LEFT JOIN BMC.dbo.hris_Employee e ON e.NIP = m.NIP
      LEFT JOIN BMC.dbo.hris_Employee approver ON approver.NIP = a.ApproverNIP
      WHERE g.GroupCode = @Code AND v.VersionNo = (SELECT MAX(VersionNo) FROM hris_Travel_Group_Version WHERE GroupCode = @Code)
      ORDER BY a.ApproverNIP, m.NIP
    `)
  const rows = result.recordset
  const first = rows[0]
  if (!first) return { status: 'not_found' }
  const approvers = [...new Map(rows.map((row) => [String(row.ApproverNIP || '').trim(), row])).values()].filter((row) => row.ApproverNIP)
  if (!canSendGroupTravelReminder({ groupStatus: first.GroupStatus, versionStatus: first.VersionStatus, isMember: true, approverCount: approvers.length })) return { status: 'not_ready' }
  const members = [...new Map(rows.map((row) => [String(row.MemberNIP || '').trim(), { name: row.MemberName || row.MemberNIP, nip: row.MemberNIP }])).values()]
  for (const approver of approvers) {
    const token = createVehicleApprovalToken('__ATASAN_QUEUE__', approver.ApproverNIP, Date.now(), 1)
    const approvalLink = EMPLOYEE_PORTAL_URL ? `${EMPLOYEE_PORTAL_URL}/approval/atasan/queue/${encodeURIComponent(token)}` : ''
    const text = formatTravelApprovalMessage({ approverName: approver.ApproverName || approver.ApproverNIP, members, tujuan: first.Tujuan, keperluan: first.Tugas, startDate: first.ExitDate, startTime: first.ExitTime, approvalLink })
    const sent = await sendTravelWaToNIP(approver.ApproverNIP, text)
    if (sent === false) return { status: 'send_failed' }
  }
  return { status: 'sent' }
}

async function getGroupVehicleApprovals() {
  const conn = await getConnection();
  const result = await conn.request().query(`
    SELECT a.GroupCode, a.VersionNo, a.StatusId, a.UpdatedAt,
           v.ExitDate, v.ExitTime, v.Tujuan, v.Tugas, v.VehicleType, v.VehiclePlate, v.DriverMode, v.DriverNIP, v.DriverName, v.AutoClosedAt,
           m.NIP AS MemberNIP, e.Name AS MemberName
    FROM hris_Travel_Group_Approval a
    INNER JOIN hris_Travel_Group g ON g.GroupCode = a.GroupCode
    INNER JOIN hris_Travel_Group_Version v ON v.GroupCode = a.GroupCode AND v.VersionNo = a.VersionNo
    INNER JOIN hris_Travel_Group_Member m ON m.GroupCode = a.GroupCode AND m.VersionNo = a.VersionNo AND m.Status = 'ACTIVE'
    LEFT JOIN BMC.dbo.hris_Employee e ON e.NIP = m.NIP
    WHERE a.ApprovalType = 'KENDARAAN' AND a.ApproverNIP = 'GROUP' AND a.StatusId IN (1, 3, 4)
    ORDER BY a.UpdatedAt DESC, a.GroupCode, m.NIP
  `);
  const groups = new Map();
  for (const row of result.recordset) {
    const key = `${row.GroupCode}:${row.VersionNo}`;
    const item = groups.get(key) || { id: `G.${row.GroupCode}.${row.VersionNo}`, groupCode: row.GroupCode, groupVersion: row.VersionNo, nip: row.MemberNIP, nama: row.MemberName || row.MemberNIP, tujuan: row.Tujuan, alasan: row.Tugas, tanggalMulai: row.ExitDate, jamMulai: row.ExitTime, vehicleType: row.VehicleType, vehiclePlate: row.VehiclePlate, driverMode: row.DriverMode, driverNIP: row.DriverNIP, driverName: row.DriverName, autoClosedAt: row.AutoClosedAt, status: 'pending', approvalStatus: row.StatusId === 3 ? 'approved' : row.StatusId === 4 ? 'rejected' : 'waiting', members: [] };
    item.members.push({ nip: row.MemberNIP, name: row.MemberName || row.MemberNIP });
    groups.set(key, item);
  }
  return [...groups.values()];
}

async function getGroupVehicleApprovalByToken(code, version) {
  const conn = await getConnection();
  const result = await conn.request().input('Code', sql.VarChar, code).input('VersionNo', sql.Int, version).query(`
    SELECT a.GroupCode, a.VersionNo, a.StatusId, a.UpdatedAt,
           v.ExitDate, v.ExitTime, v.Tujuan, v.Tugas, v.VehicleType, v.VehiclePlate, v.DriverMode, v.DriverNIP, v.DriverName, v.AutoClosedAt,
           m.NIP AS MemberNIP, e.Name AS MemberName
    FROM hris_Travel_Group_Approval a
    INNER JOIN hris_Travel_Group g ON g.GroupCode = a.GroupCode
    INNER JOIN hris_Travel_Group_Version v ON v.GroupCode = a.GroupCode AND v.VersionNo = a.VersionNo
    INNER JOIN hris_Travel_Group_Member m ON m.GroupCode = a.GroupCode AND m.VersionNo = a.VersionNo AND m.Status = 'ACTIVE'
    LEFT JOIN BMC.dbo.hris_Employee e ON e.NIP = m.NIP
    WHERE a.GroupCode = @Code AND a.VersionNo = @VersionNo AND a.ApprovalType = 'KENDARAAN' AND a.ApproverNIP = 'GROUP'
    ORDER BY m.NIP
  `);
  const groups = new Map();
  for (const row of result.recordset) {
    const item = groups.get(row.GroupCode) || { id: `G.${row.GroupCode}.${row.VersionNo}`, groupCode: row.GroupCode, groupVersion: row.VersionNo, nip: row.MemberNIP, nama: row.MemberName || row.MemberNIP, tujuan: row.Tujuan, alasan: row.Tugas, tanggalMulai: row.ExitDate, jamMulai: row.ExitTime, vehicleType: row.VehicleType, vehiclePlate: row.VehiclePlate, driverMode: row.DriverMode, driverNIP: row.DriverNIP, driverName: row.DriverName, autoClosedAt: row.AutoClosedAt, status: 'pending', approvalStatus: row.StatusId === 3 ? 'approved' : row.StatusId === 4 ? 'rejected' : 'waiting', statusId: row.StatusId, members: [] };
    item.members.push({ nip: row.MemberNIP, name: row.MemberName || row.MemberNIP });
    groups.set(row.GroupCode, item);
  }
  return groups.values().next().value || null;
}

async function getMyGroups(actorNIP) {
  const conn = await getConnection();
  const result = await conn.request().input('NIP', sql.VarChar, actorNIP).query(`
    SELECT g.GroupCode, g.Status, v.VersionNo, v.ExitDate, v.ExitTime, v.Tujuan, v.Tugas, v.QrToken, v.DepartureAt, v.VehicleType, v.VehiclePlate, v.DriverMode, v.DriverNIP, v.DriverName, v.AutoClosedAt
    FROM hris_Travel_Group g
    INNER JOIN hris_Travel_Group_Version v ON v.GroupCode = g.GroupCode AND v.VersionNo = (SELECT MAX(VersionNo) FROM hris_Travel_Group_Version WHERE GroupCode = g.GroupCode)
    INNER JOIN hris_Travel_Group_Member m ON m.GroupCode = g.GroupCode AND m.VersionNo = v.VersionNo AND m.NIP = @NIP AND m.Status = 'ACTIVE'
    ORDER BY v.CreatedAt DESC
  `);
  return result.recordset;
}

async function getGroupQr(code, token) {
  const conn = await getConnection();
  const result = await conn.request().input('Code', sql.VarChar, code).input('Token', sql.VarChar, token).query(`
    SELECT TOP 1 g.GroupCode, v.VersionNo, v.ExitDate, v.ExitTime, v.Tujuan, v.Tugas, v.QrToken, v.DepartureAt
    FROM hris_Travel_Group g
    INNER JOIN hris_Travel_Group_Version v ON v.GroupCode = g.GroupCode AND v.VersionNo = (SELECT MAX(VersionNo) FROM hris_Travel_Group_Version WHERE GroupCode = g.GroupCode)
    WHERE g.GroupCode = @Code AND g.Status = 'APPROVED' AND v.Status = 'APPROVED' AND v.QrToken = @Token
  `);
  return result.recordset[0] || null;
}

async function scanGroup(code, version, token) {
  const conn = await getConnection();
  const tx = new sql.Transaction(conn);
  await tx.begin();
  try {
    await tx.request().query('SET XACT_ABORT ON;');
    const result = await tx.request().input('Code', sql.VarChar, code).input('VersionNo', sql.Int, version).input('Token', sql.VarChar, token).query(`
      SELECT TOP 1 g.Status, v.Status AS VersionStatus, v.QrToken, v.DepartureAt
      FROM hris_Travel_Group g WITH (UPDLOCK, HOLDLOCK)
      INNER JOIN hris_Travel_Group_Version v WITH (UPDLOCK, HOLDLOCK) ON v.GroupCode = g.GroupCode AND v.VersionNo = @VersionNo
      WHERE g.GroupCode = @Code
    `);
    const row = result.recordset[0];
    if (!row || row.Status !== 'APPROVED' || row.VersionStatus !== 'APPROVED' || row.QrToken !== token) {
      await tx.rollback();
      return { status: 'invalid' };
    }
    if (row.DepartureAt) {
      await tx.rollback();
      return { status: 'already_departed' };
    }
    const updated = await tx.request().input('Code', sql.VarChar, code).input('VersionNo', sql.Int, version).query(`
      UPDATE hris_Travel_Group_Version SET DepartureAt = GETDATE()
      WHERE GroupCode = @Code AND VersionNo = @VersionNo AND DepartureAt IS NULL
    `);
    if (updated.rowsAffected[0] !== 1) throw new Error('Keberangkatan group gagal disimpan.');
    await tx.commit();
    return { status: 'departed' };
  } catch (error) {
    try { await tx.rollback(); } catch {}
    throw error;
  }
}

async function getGroupApprovals(code, actorNIP) {
  const conn = await getConnection();
  const result = await conn.request().input('Code', sql.VarChar, code).input('NIP', sql.VarChar, actorNIP).query(`
    SELECT a.GroupCode, a.VersionNo, a.ApprovalType, a.ApproverNIP, a.StatusId, a.UpdatedAt, e.Name AS ApproverName
    FROM hris_Travel_Group_Approval a
    INNER JOIN hris_Travel_Group g ON g.GroupCode = a.GroupCode
    LEFT JOIN BMC.dbo.hris_Employee e ON e.NIP = a.ApproverNIP
    WHERE a.GroupCode = @Code AND EXISTS (SELECT 1 FROM hris_Travel_Group_Member m WHERE m.GroupCode = g.GroupCode AND m.VersionNo = (SELECT MAX(VersionNo) FROM hris_Travel_Group_Version WHERE GroupCode = g.GroupCode) AND m.NIP = @NIP AND m.Status = 'ACTIVE')
    ORDER BY a.VersionNo, a.ApprovalType, a.ApproverNIP
  `);
  return result.recordset;
}

async function approveGroup(code, version, approverNIP, action) {
  const statusId = action === 'approve' ? 3 : 4;
  const conn = await getConnection();
  const tx = new sql.Transaction(conn);
  await tx.begin();
  await tx.request().query('SET XACT_ABORT ON;');
  try {
    const updated = await tx.request().input('Code', sql.VarChar, code).input('VersionNo', sql.Int, version).input('ApproverNIP', sql.VarChar, approverNIP).input('StatusId', sql.Int, statusId).query(`UPDATE a SET StatusId = @StatusId, UpdatedAt = GETDATE() FROM hris_Travel_Group_Approval a INNER JOIN hris_Travel_Group g ON g.GroupCode = a.GroupCode WHERE a.GroupCode = @Code AND a.VersionNo = @VersionNo AND a.ApprovalType = 'ATASAN' AND a.ApproverNIP = @ApproverNIP AND a.StatusId = 1 AND g.Status = 'PENDING' AND a.VersionNo = (SELECT MAX(VersionNo) FROM hris_Travel_Group_Version WHERE GroupCode = @Code); SELECT @@ROWCOUNT AS Updated`);
    if (updated.recordset[0]?.Updated !== 1) throw new Error('Approval tidak ditemukan atau sudah diproses');
    const approvals = await tx.request().input('Code', sql.VarChar, code).input('VersionNo', sql.Int, version).query(`SELECT StatusId FROM hris_Travel_Group_Approval WHERE GroupCode = @Code AND VersionNo = @VersionNo AND ApprovalType = 'ATASAN'`);
    const transition = groupApprovalTransition(approvals.recordset);
    await tx.request().input('Code', sql.VarChar, code).input('VersionNo', sql.Int, version).input('Status', sql.VarChar, transition.groupStatus).query(`UPDATE hris_Travel_Group SET Status = @Status, UpdatedAt = GETDATE() WHERE GroupCode = @Code; UPDATE hris_Travel_Group_Version SET Status = @Status WHERE GroupCode = @Code AND VersionNo = @VersionNo`);
    if (transition.vehicleApproval) await tx.request().input('Code', sql.VarChar, code).input('VersionNo', sql.Int, version).query(`IF NOT EXISTS (SELECT 1 FROM hris_Travel_Group_Approval WHERE GroupCode = @Code AND VersionNo = @VersionNo AND ApprovalType = 'KENDARAAN') INSERT INTO hris_Travel_Group_Approval (GroupCode, VersionNo, ApprovalType, ApproverNIP, StatusId) VALUES (@Code, @VersionNo, 'KENDARAAN', 'GROUP', 1)`);
    await tx.commit();
    if (transition.vehicleApproval) {
      const details = await conn.request().input('Code', sql.VarChar, code).input('VersionNo', sql.Int, version).query(`SELECT TOP 1 v.Tujuan, v.Tugas, v.ExitDate, v.ExitTime, v.VehicleType, v.DriverMode, v.DriverNIP, v.DriverName FROM hris_Travel_Group_Version v WHERE v.GroupCode = @Code AND v.VersionNo = @VersionNo`);
      const members = await conn.request().input('Code', sql.VarChar, code).input('VersionNo', sql.Int, version).query(`SELECT m.NIP, e.Name FROM hris_Travel_Group_Member m LEFT JOIN BMC.dbo.hris_Employee e ON e.NIP = m.NIP WHERE m.GroupCode = @Code AND m.VersionNo = @VersionNo AND m.Status = 'ACTIVE' ORDER BY m.NIP`);
      const row = details.recordset[0];
      for (const nip of VEHICLE_MANAGER_NIPS) {
        try {
          const token = createVehicleApprovalToken(`G.${code}.${version}`, nip);
          const approvalLink = EMPLOYEE_PORTAL_URL ? `${EMPLOYEE_PORTAL_URL}/approval/kendaraan/${encodeURIComponent(token)}` : '';
          const text = formatTravelApprovalMessage({ approverName: '{Name}', members: members.recordset, tujuan: row?.Tujuan, keperluan: row?.Tugas, startDate: row?.ExitDate, startTime: row?.ExitTime, vehicle: row?.VehicleType, driver: row?.DriverMode === 'SELF' ? row.DriverNIP : row?.DriverName, approvalLink });
          await sendTravelWaToNIP(nip, text);
        } catch {}
      }
    }
    return { success: true, groupStatus: transition.groupStatus, vehicleApproval: transition.vehicleApproval };
  } catch (error) { try { await tx.rollback(); } catch {} throw error; }
}

async function approveGroupVehicle(code, version, approverNIP, action, vehicleType, vehiclePlate, driverMode, driverName = '') {
  const type = String(vehicleType || '').trim().toUpperCase();
  const mode = String(driverMode || '').trim().toUpperCase();
  const driver = String(driverName || '').trim();
  const plate = String(vehiclePlate || '').trim().toUpperCase();
  if (action === 'approve' && !['PRIVATE', 'ONLINE', 'OFFICE', 'MOTOR'].includes(type)) throw new Error('Jenis kendaraan wajib dipilih');
  if (action === 'approve' && ['OFFICE', 'MOTOR'].includes(type) && !plate) throw new Error('Nomor plat kendaraan wajib diisi');
  if (action === 'approve' && ['OFFICE', 'MOTOR'].includes(type) && !['SELF', 'DRIVER'].includes(mode)) throw new Error('Cara berkendara wajib dipilih');
  if (action === 'approve' && mode === 'DRIVER' && !driver) throw new Error('Nama supir wajib diisi');
  if (driver.length > 200) throw new Error('Nama supir maksimal 200 karakter');
  const conn = await getConnection();
  const tx = new sql.Transaction(conn);
  await tx.begin();
  await tx.request().query('SET XACT_ABORT ON;');
  try {
    if (!VEHICLE_MANAGER_NIPS.includes(String(approverNIP).trim())) throw new Error('Akses approval kendaraan tidak diizinkan');
    const result = await tx.request().input('Code', sql.VarChar, code).input('VersionNo', sql.Int, version).input('StatusId', sql.Int, action === 'approve' ? 3 : 4).query(`UPDATE a SET StatusId = @StatusId, UpdatedAt = GETDATE() FROM hris_Travel_Group_Approval a INNER JOIN hris_Travel_Group g ON g.GroupCode = a.GroupCode WHERE a.GroupCode = @Code AND a.VersionNo = @VersionNo AND a.ApprovalType = 'KENDARAAN' AND a.ApproverNIP = 'GROUP' AND a.StatusId = 1 AND g.Status = 'VEHICLE_PENDING' AND a.VersionNo = (SELECT MAX(VersionNo) FROM hris_Travel_Group_Version WHERE GroupCode = @Code); SELECT @@ROWCOUNT AS Updated`);
    if (result.recordset[0]?.Updated !== 1) throw new Error('Approval kendaraan tidak ditemukan atau sudah diproses');
    const status = action === 'approve' ? 'APPROVED' : 'REVISION';
     const qrToken = action === 'approve' ? crypto.randomBytes(24).toString('hex') : null;
     await tx.request().input('Code', sql.VarChar, code).input('VersionNo', sql.Int, version).input('Status', sql.VarChar, status).input('VehicleType', sql.VarChar, type).input('VehiclePlate', sql.VarChar, plate || null).input('DriverMode', sql.VarChar, action === 'approve' ? mode : null).input('DriverName', sql.NVarChar, action === 'approve' ? (driver || null) : null).input('QrToken', sql.VarChar, qrToken).query(`UPDATE hris_Travel_Group SET Status = @Status, UpdatedAt = GETDATE() WHERE GroupCode = @Code; UPDATE hris_Travel_Group_Version SET Status = @Status, VehicleType = CASE WHEN @Status = 'APPROVED' THEN @VehicleType ELSE VehicleType END, VehiclePlate = CASE WHEN @Status = 'APPROVED' THEN @VehiclePlate ELSE VehiclePlate END, DriverMode = CASE WHEN @Status = 'APPROVED' THEN @DriverMode ELSE DriverMode END, DriverName = CASE WHEN @Status = 'APPROVED' THEN @DriverName ELSE DriverName END, QrToken = CASE WHEN @Status = 'APPROVED' THEN @QrToken ELSE NULL END, DepartureAt = NULL WHERE GroupCode = @Code AND VersionNo = @VersionNo`);
    await tx.commit();
    if (action === 'approve') {
      const detail = await conn.request().input('Code', sql.VarChar, code).input('VersionNo', sql.Int, version).query(`SELECT g.CreatorNIP, v.Tujuan, v.Tugas, v.ExitDate, v.ExitTime, v.VehicleType, v.VehiclePlate, v.DriverMode, v.DriverNIP, v.DriverName, v.QrToken, m.NIP, e.Name FROM hris_Travel_Group g INNER JOIN hris_Travel_Group_Version v ON v.GroupCode = g.GroupCode INNER JOIN hris_Travel_Group_Member m ON m.GroupCode = v.GroupCode AND m.VersionNo = v.VersionNo AND m.Status = 'ACTIVE' LEFT JOIN BMC.dbo.hris_Employee e ON e.NIP = m.NIP WHERE v.GroupCode = @Code AND v.VersionNo = @VersionNo ORDER BY m.NIP`);
      const first = detail.recordset[0];
      const members = detail.recordset.map((row) => ({ nip: row.NIP, name: row.Name || row.NIP }));
       const qrLink = first?.QrToken && EMPLOYEE_PORTAL_URL ? `${EMPLOYEE_PORTAL_URL}/travel/groups/qr/${encodeURIComponent(code)}/${encodeURIComponent(first.QrToken)}` : '';
      const recipient = members.find((member) => member.nip === first?.CreatorNIP) || members[0];
      if (recipient) {
        try {
          await sendWaToNIP(recipient.nip, formatTravelApprovedMessage({ recipientName: recipient.name, members, tujuan: first?.Tujuan, keperluan: first?.Tugas, startDate: first?.ExitDate, startTime: first?.ExitTime, vehicle: first?.VehicleType, vehiclePlate: first?.VehiclePlate, driver: first?.DriverMode === 'SELF' ? first.DriverNIP : first?.DriverName, qrLink }));
        } catch (error) { console.error('[WA] group travel approval notification error:', error.message); }
      }
    }
    return { success: true, groupStatus: status, qr: action === 'approve' };
  } catch (error) { try { await tx.rollback(); } catch {} throw error; }
}

async function reviseGroup(code, actorNIP, members) {
  const finalMembers = validateGroupMembers(members);
  const conn = await getConnection();
  const tx = new sql.Transaction(conn);
  await tx.begin();
  await tx.request().query('SET XACT_ABORT ON;');
  try {
    const currentResult = await tx.request().input('Code', sql.VarChar, code).input('ActorNIP', sql.VarChar, actorNIP).query(`SELECT TOP 1 g.Status, v.VersionNo, v.ExitDate, v.ExitTime, v.Tujuan, v.Tugas FROM hris_Travel_Group g WITH (UPDLOCK, HOLDLOCK) INNER JOIN hris_Travel_Group_Version v ON v.GroupCode = g.GroupCode WHERE g.GroupCode = @Code AND v.VersionNo = (SELECT MAX(VersionNo) FROM hris_Travel_Group_Version WHERE GroupCode = @Code) AND g.Status = 'REVISION' AND EXISTS (SELECT 1 FROM hris_Travel_Group_Member m WHERE m.GroupCode = g.GroupCode AND m.VersionNo = v.VersionNo AND m.NIP = @ActorNIP AND m.Status = 'ACTIVE')`);
    const current = currentResult.recordset[0];
    if (!current) throw new Error('Group belum dapat direvisi');
    for (const nip of finalMembers) {
      if (!await employee(conn, nip)) throw new Error(`Anggota ${nip} tidak ditemukan`);
      const confirmed = await tx.request().input('Code', sql.VarChar, code).input('NIP', sql.VarChar, nip).query(`SELECT 1 AS Confirmed FROM hris_Travel_Group_Join WHERE GroupCode = @Code AND NIP = @NIP AND Status = 'CONFIRMED'`);
      if (!confirmed.recordset.length && nip !== actorNIP) throw new Error(`Anggota ${nip} belum mengonfirmasi join`);
    }
    const nextVersion = current.VersionNo + 1;
    await tx.request().input('Code', sql.VarChar, code).input('VersionNo', sql.Int, nextVersion).input('ExitDate', sql.Date, current.ExitDate).input('ExitTime', sql.VarChar, current.ExitTime).input('Tujuan', sql.NVarChar, current.Tujuan).input('Tugas', sql.NVarChar, current.Tugas).input('ActorNIP', sql.VarChar, actorNIP).query(`INSERT INTO hris_Travel_Group_Version (GroupCode, VersionNo, ExitDate, ExitTime, Tujuan, Tugas, Status, CreatedBy, CreatedAt) VALUES (@Code, @VersionNo, @ExitDate, @ExitTime, @Tujuan, @Tugas, 'DRAFT', @ActorNIP, GETDATE())`);
    for (const nip of finalMembers) await tx.request().input('Code', sql.VarChar, code).input('VersionNo', sql.Int, nextVersion).input('NIP', sql.VarChar, nip).query(`INSERT INTO hris_Travel_Group_Member (GroupCode, VersionNo, NIP, Status, JoinedAt) VALUES (@Code, @VersionNo, @NIP, 'ACTIVE', GETDATE())`);
    await tx.request().input('Code', sql.VarChar, code).query(`UPDATE hris_Travel_Group SET Status = 'DRAFT', JoinOpen = 0, UpdatedAt = GETDATE() WHERE GroupCode = @Code`);
    await tx.commit();
    return { success: true, groupCode: code, version: nextVersion };
  } catch (error) { try { await tx.rollback(); } catch {} throw error; }
}

async function requestJoin(code, actorNIP) {
  const conn = await getConnection();
  const tx = new sql.Transaction(conn);
  await tx.begin();
  await tx.request().query('SET XACT_ABORT ON;');
  try {
    const result = await tx.request().input('Code', sql.VarChar, code).input('NIP', sql.VarChar, actorNIP).query(`
      IF NOT EXISTS (SELECT 1 FROM hris_Travel_Group WITH (UPDLOCK, HOLDLOCK) WHERE GroupCode = @Code AND JoinOpen = 1) THROW 51000, 'Group tidak tersedia untuk join', 1;
      IF NOT EXISTS (SELECT 1 FROM hris_Travel_Group_Join WITH (UPDLOCK, HOLDLOCK) WHERE GroupCode = @Code AND NIP = @NIP)
        INSERT INTO hris_Travel_Group_Join (GroupCode, NIP, Status, RequestedAt) VALUES (@Code, @NIP, 'PENDING', GETDATE());
      SELECT Status FROM hris_Travel_Group_Join WHERE GroupCode = @Code AND NIP = @NIP;
    `);
    await tx.commit();
    return { status: result.recordset[0]?.Status || 'PENDING' };
  } catch (error) {
    try { await tx.rollback(); } catch {}
    throw error;
  }
}

async function confirmJoin(code, actorNIP) {
  const conn = await getConnection();
  const transaction = new sql.Transaction(conn);
  await transaction.begin();
  await transaction.request().query('SET XACT_ABORT ON;');
  try {
    const join = await transaction.request().input('Code', sql.VarChar, code).input('NIP', sql.VarChar, actorNIP).query(`SELECT TOP 1 j.Status FROM hris_Travel_Group_Join j WITH (UPDLOCK, HOLDLOCK) INNER JOIN hris_Travel_Group g WITH (UPDLOCK, HOLDLOCK) ON g.GroupCode = j.GroupCode WHERE j.GroupCode = @Code AND j.NIP = @NIP AND g.JoinOpen = 1`);
    if (join.recordset[0]?.Status !== 'PENDING') throw new Error('Undangan join tidak tersedia');
    const current = await transaction.request().input('Code', sql.VarChar, code).query(`SELECT MAX(VersionNo) AS VersionNo FROM hris_Travel_Group_Version WHERE GroupCode = @Code`);
    const version = current.recordset[0].VersionNo;
    await transaction.request().input('Code', sql.VarChar, code).input('NIP', sql.VarChar, actorNIP).query(`UPDATE hris_Travel_Group_Join SET Status = 'CONFIRMED', ConfirmedAt = GETDATE() WHERE GroupCode = @Code AND NIP = @NIP`);
    await transaction.request().input('Code', sql.VarChar, code).input('VersionNo', sql.Int, version).input('NIP', sql.VarChar, actorNIP).query(`IF NOT EXISTS (SELECT 1 FROM hris_Travel_Group_Member WHERE GroupCode = @Code AND VersionNo = @VersionNo AND NIP = @NIP) INSERT INTO hris_Travel_Group_Member (GroupCode, VersionNo, NIP, Status, JoinedAt) VALUES (@Code, @VersionNo, @NIP, 'ACTIVE', GETDATE())`);
    await transaction.commit();
    return { status: 'ACTIVE' };
  } catch (error) {
    try { await transaction.rollback(); } catch {}
    throw error;
  }
}

module.exports = { validateGroupMembers, groupApproverNips, groupStatusAfterApproval, groupApprovalTransition, groupVehicleTransition, canSendGroupTravelReminder, searchGroupEmployees, createGroup, autoCloseTravelGroups, getGroup, getMyGroups, getGroupQr, scanGroup, requestJoin, confirmJoin, addGroupMember, addDirectGroupMember, removeGroupMember, submitGroup, reviseGroup, getGroupApprovals, getGroupApprovalQueue, getGroupVehicleApprovals, getGroupVehicleApprovalByToken, sendGroupTravelReminder, approveGroup, approveGroupVehicle };