const { detectRole, submitTravel, getMyTravels, getTravelApprovals, getTravelQr, getQrToken, scanTravel, getTravelApprovalQueueByToken, approveTravelByQueueToken, getVehicleApprovals, getVehicleApproval, getVehicleApprovalQueueByToken, approveVehicle, approveVehicleByQueueToken, getActiveTravels, getWebApproverNIP, getTravelApprovalByToken, approveTravelByToken, approveTravel, returnTravel } = require('../models/travelModel');
const { createGroup, getGroup, getMyGroups, getGroupQr, scanGroup, requestJoin, confirmJoin, addGroupMember, addDirectGroupMember, searchGroupEmployees, removeGroupMember, submitGroup, reviseGroup, getGroupApprovals, getGroupApprovalQueue, getGroupVehicleApprovals, getGroupVehicleApprovalByToken, approveGroup, approveGroupVehicle } = require('../models/travelGroupModel');
const { VEHICLE_MANAGER_NIPS } = require('../services/waService');
const { verifyVehicleApprovalToken } = require('../services/vehicleApprovalToken');
const { getTopLevel } = require('../models/cutiModel');

// Kunci internal untuk approve lewat web (CodeIgniter). Bisa dioverride via env INTERNAL_KEY.
const INTERNAL_KEY = String(process.env.INTERNAL_KEY || '').trim();

function toTime(value) {
  if (value == null) return null;
  if (typeof value === 'string') {
    const match = value.match(/^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?/);
    return match ? `${match[1]}:${match[2]}:${match[3] || '00'}` : null;
  }
  const d = new Date(value);
  if (isNaN(d.getTime())) return null;
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
}

function validateTravelSubmitVehicle(vehicleType) {
  return ['PRIVATE', 'ONLINE', 'OFFICE', 'MOTOR'].includes(String(vehicleType || '').trim().toUpperCase()) ? null : 'Jenis kendaraan wajib dipilih';
}

function validateTravelSubmitDateTime(date, time) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date || '').trim())) return 'Tanggal keluar harus berformat YYYY-MM-DD';
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(String(time || '').trim())) return 'Jam keluar harus berformat HH:MM';
  return null;
}

function validateDriverInput(vehicleType, driverMode, driverNIP) {
  const type = String(vehicleType || '').trim().toUpperCase();
  const mode = String(driverMode || '').trim().toUpperCase();
  if (!['OFFICE', 'MOTOR'].includes(type)) return null;
  if (!['SELF', 'DRIVER'].includes(mode)) return 'Cara berkendara wajib dipilih';
  if (mode === 'SELF' && driverNIP && !/^\d{1,50}$/.test(String(driverNIP).trim())) return 'Pengemudi tidak valid';
  return null;
}

function canReturnTravel(userId, targetNIP) {
  return String(userId || '').trim().toUpperCase() === 'SECURITY' && Boolean(String(targetNIP || '').trim());
}

function travelScanFields(row) {
  let approval = null;
  try { approval = JSON.parse(String(row?.QrTokenRemark || '')); } catch { approval = null; }
  return {
    departureAt: approval?.departureAt || null,
    tanggalKembali: row?.CheckpointReturnedDate || row?.EndDate || null,
    jamKembali: toTime(row?.CheckpointReturnedTime) || toTime(row?.EndTime) || null,
  };
}

function normTime(value) {
  // sql.Time hanya menerima Date atau null, bukan string "HH:MM"
  if (value instanceof Date) return value;
  if (!value) return null;
  const parts = String(value).split(':').map(Number);
  if (parts.length === 3 && parts.every((p) => !isNaN(p))) return new Date(1970, 0, 1, parts[0], parts[1], parts[2]);
  if (parts.length === 2 && parts.every((p) => !isNaN(p))) return new Date(1970, 0, 1, parts[0], parts[1], 0);
  return null;
}

async function createTravelGroupHandler(req, res) {
  const { exitDate, exitTime, tujuan, tugas, vehicleType, driverMode, driverNIP } = req.body || {};
  const payload = { exitDate: String(exitDate || '').trim(), exitTime: String(exitTime || '').trim(), tujuan: String(tujuan || '').trim(), tugas: String(tugas || '').trim(), vehicleType: String(vehicleType || '').trim().toUpperCase(), driverMode: String(driverMode || '').trim().toUpperCase(), driverNIP: String(driverNIP || '').trim() };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(payload.exitDate) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(payload.exitTime) || !payload.tujuan) return res.status(400).json({ error: 'Tanggal keluar, jam keluar, dan tujuan wajib diisi' });
  const groupDriverError = validateDriverInput(payload.vehicleType, payload.driverMode, payload.driverNIP);
  if (groupDriverError) return res.status(400).json({ error: groupDriverError });
  try { res.status(201).json(await createGroup(String(req.user.id).trim(), payload)); } catch (err) { res.status(500).json({ error: err.message }); }
}

async function getTravelGroupQrHandler(req, res) {
  const code = String(req.params.code || '').trim().toUpperCase();
  const token = String(req.params.token || '').trim();
  if (!/^TL-[A-Z0-9]{6}$/.test(code) || !/^[a-f0-9]{48}$/i.test(token)) return res.status(400).json({ error: 'Link QR group tidak valid' });
  try {
    const row = await getGroupQr(code, token);
    if (!row) return res.status(404).json({ error: 'QR group tidak ditemukan atau sudah tidak berlaku' });
    res.json({ data: { groupCode: row.GroupCode, version: row.VersionNo, tujuan: row.Tujuan, tanggal: row.ExitDate, qrToken: row.QrToken, departureAt: row.DepartureAt } });
  } catch (err) { res.status(500).json({ error: err.message }); }
}

async function getTravelGroupHandler(req, res) {
  const code = String(req.params.code || '').trim().toUpperCase();
  if (!/^TL-[A-Z0-9]{6}$/.test(code)) return res.status(400).json({ error: 'Group code tidak valid' });
  try { const data = await getGroup(code, String(req.user.id).trim()); if (!data) return res.status(404).json({ error: 'Group tidak ditemukan atau akses tidak diizinkan' }); res.json({ data }); } catch (err) { res.status(500).json({ error: err.message }); }
}

async function joinTravelGroupHandler(req, res) {
  const code = String(req.params.code || '').trim().toUpperCase();
  if (!/^TL-[A-Z0-9]{6}$/.test(code)) return res.status(400).json({ error: 'Group code tidak valid' });
  try { res.json(await requestJoin(code, String(req.user.id).trim())); } catch (err) { res.status(400).json({ error: err.message }); }
}

async function confirmTravelGroupHandler(req, res) {
  const code = String(req.params.code || '').trim().toUpperCase();
  if (!/^TL-[A-Z0-9]{6}$/.test(code)) return res.status(400).json({ error: 'Group code tidak valid' });
  try { res.json(await confirmJoin(code, String(req.user.id).trim())); } catch (err) { res.status(400).json({ error: err.message }); }
}

async function addTravelGroupMemberHandler(req, res) {
  const code = String(req.params.code || '').trim().toUpperCase();
  const memberNIP = String(req.body?.nip || '').trim();
  if (!/^TL-[A-Z0-9]{6}$/.test(code)) return res.status(400).json({ error: 'Group code tidak valid' });
  try { res.json(await addGroupMember(code, String(req.user.id).trim(), memberNIP)); } catch (err) { res.status(400).json({ error: err.message }); }
}

async function searchTravelGroupEmployeesHandler(req, res) {
  const query = String(req.query?.q || '').trim();
  try { res.json({ data: await searchGroupEmployees(query) }); } catch (err) { res.status(500).json({ error: err.message }); }
}

async function addDirectTravelGroupMemberHandler(req, res) {
  const code = String(req.params.code || '').trim().toUpperCase();
  const memberNIP = String(req.body?.nip || '').trim();
  if (!/^TL-[A-Z0-9]{6}$/.test(code)) return res.status(400).json({ error: 'Group code tidak valid' });
  if (!/^\d{1,50}$/.test(memberNIP)) return res.status(400).json({ error: 'NIP anggota tidak valid' });
  try { res.json(await addDirectGroupMember(code, String(req.user.id).trim(), memberNIP)); } catch (err) { res.status(400).json({ error: err.message }); }
}

async function removeTravelGroupMemberHandler(req, res) {
  const code = String(req.params.code || '').trim().toUpperCase();
  const memberNIP = String(req.params.nip || '').trim();
  if (!/^TL-[A-Z0-9]{6}$/.test(code)) return res.status(400).json({ error: 'Group code tidak valid' });
  try { res.json(await removeGroupMember(code, String(req.user.id).trim(), memberNIP)); } catch (err) { res.status(400).json({ error: err.message }); }
}

async function submitTravelGroupHandler(req, res) {
  const code = String(req.params.code || '').trim().toUpperCase();
  if (!/^TL-[A-Z0-9]{6}$/.test(code)) return res.status(400).json({ error: 'Group code tidak valid' });
  try { res.json(await submitGroup(code, String(req.user.id).trim(), { vehicleType: req.body?.vehicleType, driverMode: req.body?.driverMode, driverNIP: req.body?.driverNIP })); } catch (err) { res.status(400).json({ error: err.message }); }
}

async function reviseTravelGroupHandler(req, res) {
  const code = String(req.params.code || '').trim().toUpperCase();
  if (!/^TL-[A-Z0-9]{6}$/.test(code)) return res.status(400).json({ error: 'Group code tidak valid' });
  try { res.json(await reviseGroup(code, String(req.user.id).trim(), req.body?.members)); } catch (err) { res.status(400).json({ error: err.message }); }
}

async function getTravelGroupApprovalsHandler(req, res) {
  const code = String(req.params.code || '').trim().toUpperCase();
  if (!/^TL-[A-Z0-9]{6}$/.test(code)) return res.status(400).json({ error: 'Group code tidak valid' });
  try { res.json({ data: await getGroupApprovals(code, String(req.user.id).trim()) }); } catch (err) { res.status(500).json({ error: err.message }); }
}

async function approveTravelGroupHandler(req, res) {
  const code = String(req.params.code || '').trim().toUpperCase();
  const version = Number(req.body?.version);
  const action = String(req.body?.action || '').trim();
  if (!/^TL-[A-Z0-9]{6}$/.test(code) || !Number.isInteger(version) || version < 1) return res.status(400).json({ error: 'Group atau versi tidak valid' });
  if (!['approve', 'reject'].includes(action)) return res.status(400).json({ error: 'action harus approve atau reject' });
  try { res.json(await approveGroup(code, version, String(req.user.id).trim(), action)); } catch (err) { res.status(400).json({ error: err.message }); }
}

async function getMyGroupsHandler(req, res) {
  try { res.json({ data: await getMyGroups(String(req.user.id).trim()) }); } catch (err) { res.status(500).json({ error: err.message }); }
}

async function getGroupApprovalHandler(req, res) {
  try { res.json({ data: await getGroupApprovalQueue(String(req.user.id).trim()) }); } catch (err) { res.status(500).json({ error: err.message }); }
}

async function getGroupVehicleApprovalHandler(req, res) {
  if (!VEHICLE_MANAGER_NIPS.includes(String(req.user.id).trim())) return res.status(403).json({ error: 'Akses hanya untuk Pengelola Kendaraan' });
  try { res.json({ data: await getGroupVehicleApprovals() }); } catch (err) { res.status(500).json({ error: err.message }); }
}

async function approveGroupVehicleHandler(req, res) {
  const code = String(req.body?.groupCode || '').trim().toUpperCase();
  const version = Number(req.body?.version);
  const action = String(req.body?.action || '').trim();
  if (!/^TL-[A-Z0-9]{6}$/.test(code) || !Number.isInteger(version) || version < 1) return res.status(400).json({ error: 'Group atau versi tidak valid' });
  if (!['approve', 'reject'].includes(action)) return res.status(400).json({ error: 'action harus approve atau reject' });
  try { res.json(await approveGroupVehicle(code, version, String(req.user.id).trim(), action, req.body?.vehicleType, req.body?.vehiclePlate, req.body?.driverMode, req.body?.driverName)); } catch (err) { res.status(400).json({ error: err.message }); }
}

async function getAtasanHandler(req, res) {
  try {
    const rows = await getTopLevel(req.user.id);
    const seen = new Map();
    for (const r of rows) {
      const jobSeq = r.JobSeq != null ? String(r.JobSeq).trim() : '';
      if (seen.has(jobSeq)) continue;
      seen.set(jobSeq, {
        nip: r.NIP,
        name: (r.Name || '').trim(),
        departID: r.DepartID,
        departemen: (r.NamaDepartemen || '').trim(),
        jobSeq: jobSeq || null,
      });
    }
    res.json({ data: Array.from(seen.values()) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function submitTravelHandler(req, res) {
  // Dukung payload baru (Tugas Luar: exitDate/exitTime/tugas) maupun lama (startDate/endDate/keperluan)
  const { exitDate, exitTime, tujuan, tugas, atasanNIP, startDate, endDate, startTime, endTime, keperluan, vehicleType, vehiclePlate, driverMode, driverNIP } = req.body || {};
  const normalizedAtasanNIP = String(atasanNIP || '').trim();
  const start = String(exitDate || startDate || '').trim();
  const requestedExitTime = String(exitTime || startTime || '').trim();
  const end = endDate || null; // diisi saat kembali ke kantor
  const inTime = normTime(startTime) || normTime(requestedExitTime) || null; // jam keluar = StartTime
  const outTime = normTime(endTime) || null; // diisi saat kembali ke kantor
  const kep = tugas || keperluan || null;
  const dateTimeError = validateTravelSubmitDateTime(start, requestedExitTime);
  if (dateTimeError) return res.status(400).json({ error: dateTimeError });
  if (!tujuan) return res.status(400).json({ error: 'tanggal keluar, jam keluar, dan tujuan wajib diisi' });
  if (!normalizedAtasanNIP) {
    return res.status(400).json({ error: 'atasanNIP wajib diisi' });
  }
  const normalizedVehicleType = String(vehicleType || '').trim().toUpperCase();
  const normalizedVehiclePlate = String(vehiclePlate || '').trim().toUpperCase();
  const vehicleError = validateTravelSubmitVehicle(normalizedVehicleType);
  if (vehicleError) return res.status(400).json({ error: vehicleError });
  const normalizedDriverMode = String(driverMode || '').trim().toUpperCase();
  const normalizedDriverNIP = String(driverNIP || '').trim();
  const driverError = validateDriverInput(normalizedVehicleType, normalizedDriverMode, normalizedDriverNIP);
  if (driverError) return res.status(400).json({ error: driverError });
  if (['OFFICE', 'MOTOR'].includes(normalizedVehicleType) && normalizedDriverMode === 'DRIVER' && normalizedDriverNIP) return res.status(400).json({ error: 'NIP pengemudi tidak boleh diisi untuk mode supir' });
  const NIP = String(req.user.id).trim();
  const ts = Math.floor(Date.now() / 1000);
  const rand = Math.floor(Math.random() * 90 + 10);
  const id = `T.${NIP}.${ts}${rand}`;

  try {
    const result = await submitTravel(NIP, { id, startDate: start, endDate: end, startTime: inTime, endTime: outTime, tujuan: String(tujuan || '').trim(), keperluan: String(kep || '').trim() || null, atasanNIP: normalizedAtasanNIP, vehicleType: normalizedVehicleType, vehiclePlate: ['OFFICE', 'MOTOR'].includes(normalizedVehicleType) ? normalizedVehiclePlate : '', driverMode: ['OFFICE', 'MOTOR'].includes(normalizedVehicleType) ? normalizedDriverMode : '', driverNIP: normalizedDriverMode === 'SELF' ? NIP : '' });
    res.json({ id: result.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function getMyTravelsHandler(req, res) {
  try {
    const rows = await getMyTravels(req.user.id);
    const travels = rows.map((r) => ({
      id: r.Id,
      jenis: (r.Tujuan || '').trim(),
      alasan: (r.Keperluan || '').trim(),
      tanggalMulai: r.StartDate,
      tanggalSelesai: r.EndDate,
      jamMulai: toTime(r.StartTime),
      jamSelesai: toTime(r.EndTime),
      ...travelScanFields(r),
      status: (r.Status || '').trim().toLowerCase(),
      currentLevel: r.CurrentLevel,
      vehicleType: r.VehicleType,
      vehiclePlate: r.VehiclePlate,
      driverMode: r.DriverMode,
      driverNIP: r.DriverNIP,
      driverName: r.DriverName,
      autoClosedAt: r.AutoClosedAt,
      qrToken: getQrToken(r.QrTokenRemark) || null,
    }));
    res.json({ data: travels });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function getTravelQrHandler(req, res) {
  const travelId = String(req.params.id || '').trim();
  const token = String(req.params.token || '').trim();
  if (!/^[A-Za-z0-9._-]{1,100}$/.test(travelId) || !/^[a-f0-9]{48}$/i.test(token)) return res.status(400).json({ error: 'Link QR tidak valid' });
  try {
    if (/^TL-[A-Z0-9]{6}$/.test(travelId)) {
      const row = await getGroupQr(travelId, token);
      if (!row) return res.status(404).json({ error: 'QR tidak ditemukan atau sudah tidak berlaku' });
      return res.json({ data: { id: `G.${row.GroupCode}.${row.VersionNo}`, tujuan: String(row.Tujuan || '').trim(), tanggal: row.ExitDate, qrToken: row.QrToken, departureAt: row.DepartureAt } });
    }
    const row = await getTravelQr(travelId, token);
    if (!row) return res.status(404).json({ error: 'QR tidak ditemukan atau sudah tidak berlaku' });
    let approval = null;
    try { approval = JSON.parse(String(row.Remark || '')); } catch { approval = null; }
    res.json({ data: { id: row.Id, tujuan: String(row.Tujuan || '').trim(), tanggal: row.StartDate, qrToken: token, departureAt: toTime(row.DepartureTime) || approval?.departureAt || null, tanggalKembali: row.CheckpointReturnedDate || row.EndDate || null, jamKembali: toTime(row.CheckpointReturnedTime) || toTime(row.EndTime) || null } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function scanTravelHandler(req, res) {
  const travelId = String(req.body?.travelId || '').trim();
  if (/^G\.TL-[A-Z0-9]{6}\.\d+$/.test(travelId)) {
    const [, code, versionText] = travelId.match(/^G\.(TL-[A-Z0-9]{6})\.(\d+)$/);
    const qrToken = String(req.body?.qrToken || '').trim();
    if (!/^[a-f0-9]{48}$/i.test(qrToken)) return res.status(400).json({ error: 'QR tidak valid atau sudah tidak berlaku.' });
    try {
      const result = await scanGroup(code, Number(versionText), qrToken);
      if (result.status === 'invalid') return res.status(404).json({ error: 'QR tidak valid atau sudah tidak berlaku.' });
      if (result.status === 'already_departed') return res.status(409).json({ error: 'Keberangkatan group sudah tercatat. Kepulangan dicatat Security.' });
      return res.json({ success: true, event: 'departed', message: 'Keberangkatan group berhasil dicatat.', speech: 'Selamat melakukan perjalanan, hati-hati di jalan.' });
    } catch (err) { return res.status(500).json({ error: err.message }); }
  }
  const qrToken = String(req.body?.qrToken || '').trim();
  if (!/^[A-Za-z0-9._-]{1,50}$/.test(travelId) || !/^[a-f0-9]{48}$/i.test(qrToken)) return res.status(400).json({ error: 'QR tidak valid atau sudah tidak berlaku.' });
  try {
    const result = await scanTravel(travelId, qrToken);
    if (result.status === 'invalid') return res.status(404).json({ error: 'QR tidak valid atau sudah tidak berlaku.' });
    if (result.status === 'already_departed') return res.status(409).json({ error: 'Keberangkatan sudah tercatat. Kepulangan dicatat Security.' });
    res.json({ success: true, event: 'departed', message: 'Berhasil dicatat berangkat.', speech: 'Selamat melakukan perjalanan, hati-hati di jalan.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function getTravelApprovalQueueLinkHandler(req, res) {
  const token = String(req.params.token || '').trim();
  try {
    const verified = verifyVehicleApprovalToken(token);
    if (!verified || verified.level !== 1 || verified.travelId !== '__ATASAN_QUEUE__') return res.status(404).json({ error: 'Link approval tidak valid atau sudah kedaluwarsa' });
    const rows = await getTravelApprovalQueueByToken(token);
    if (!rows) return res.status(404).json({ error: 'Link approval tidak valid atau sudah kedaluwarsa' });
    const groupRows = await getGroupApprovalQueue(verified.nip);
    res.json({ data: [...rows.map((row) => ({ id: row.Id, nip: row.NIP, nama: String(row.PemohonName || row.NIP).trim(), tujuan: String(row.Tujuan || '').trim(), alasan: String(row.Keperluan || '').trim(), tanggalMulai: row.StartDate, tanggalSelesai: row.EndDate, jamMulai: toTime(row.StartTime), statusId: row.StatusId, processedAt: row.UpdDate, processedBy: String(row.ApproverName || row.ApproverNIP || '').trim(), createdAt: row.InpDate })), ...groupRows.map((row) => ({ id: row.id, nip: row.nip, nama: row.nama, tujuan: String(row.tujuan || '').trim(), alasan: String(row.alasan || '').trim(), tanggalMulai: row.tanggalMulai, tanggalSelesai: null, jamMulai: row.jamMulai, statusId: row.statusId, processedAt: null, processedBy: '', createdAt: row.createdAt, groupCode: row.groupCode, groupVersion: row.groupVersion, members: row.members || [] }))].sort((left, right) => new Date(right.createdAt || 0) - new Date(left.createdAt || 0)) });
  } catch (err) { res.status(500).json({ error: err.message }); }
}

async function getTravelApprovalLinkHandler(req, res) {
  const token = String(req.params.token || '').trim();
  const verified = verifyVehicleApprovalToken(token);
  if (!verified || verified.level !== 1) return res.status(404).json({ error: 'Link approval tidak valid atau sudah kedaluwarsa' });
  try {
    const row = await getTravelApprovalByToken(verified.travelId, token);
    if (!row) return res.status(404).json({ error: 'Pengajuan tidak ditemukan atau sudah diproses' });
    res.json({ data: { id: row.Id, nip: row.NIP, nama: String(row.PemohonName || row.NIP).trim(), tujuan: String(row.Tujuan || '').trim(), alasan: String(row.Keperluan || '').trim(), tanggalMulai: row.StartDate, tanggalSelesai: row.EndDate, statusId: row.StatusId, processedAt: row.UpdDate, processedBy: String(row.ApproverName || row.ApproverNIP || '').trim() } });
  } catch (err) { res.status(500).json({ error: err.message }); }
}

async function approveTravelApprovalQueueLinkHandler(req, res) {
  const token = String(req.params.token || '').trim();
  const action = String(req.body?.action || '').trim();
  if (!['approve', 'reject'].includes(action)) return res.status(400).json({ error: 'action harus approve atau reject' });
  try {
    const verified = verifyVehicleApprovalToken(token);
    if (!verified || verified.level !== 1) return res.status(404).json({ error: 'Link approval tidak valid atau sudah kedaluwarsa' });
    const travelId = String(req.body?.travelId || '').trim();
    if (!/^[A-Za-z0-9._-]{1,100}$/.test(travelId)) return res.status(400).json({ error: 'travelId tidak valid' });
    const groupMatch = travelId.match(/^G\.(TL-[A-Z0-9]{6})\.(\d+)$/);
    if (groupMatch) {
      const result = await approveGroup(groupMatch[1], Number(groupMatch[2]), verified.nip, action);
      if (!result.success) return res.status(404).json({ error: 'Approval group tidak ditemukan atau sudah diproses' });
      return res.json({ success: true });
    }
    const result = await approveTravelByQueueToken(travelId, token, action);
    if (!result.success) return res.status(404).json({ error: 'Approval tidak ditemukan atau sudah diproses' });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
}

async function approveTravelApprovalLinkHandler(req, res) {
  const token = String(req.params.token || '').trim();
  const verified = verifyVehicleApprovalToken(token);
  const action = String(req.body?.action || '').trim();
  if (!verified || verified.level !== 1) return res.status(404).json({ error: 'Link approval tidak valid atau sudah kedaluwarsa' });
  if (!['approve', 'reject'].includes(action)) return res.status(400).json({ error: 'action harus approve atau reject' });
  try {
    const result = await approveTravelByToken(verified.travelId, token, action);
    if (!result.success) return res.status(404).json({ error: 'Approval tidak ditemukan atau sudah diproses' });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
}

async function getVehicleApprovalHandler(req, res) {
  try {
    const role = await detectRole(req.user.id);
    if (role !== 'GS') return res.status(403).json({ error: 'Akses hanya untuk Pengelola Kendaraan' });
    const rows = await getVehicleApprovals();
    res.json({ data: rows.map((r) => ({
      id: r.Id,
      nip: r.NIP,
      nama: String(r.PemohonName || r.NIP).trim(),
      tujuan: String(r.Tujuan || '').trim(),
      alasan: String(r.Keperluan || '').trim(),
      tanggalMulai: r.StartDate,
      tanggalSelesai: r.EndDate,
      jamMulai: toTime(r.StartTime),
      jamSelesai: toTime(r.EndTime),
      vehicleType: String(r.VehicleType || '').trim(),
       driverMode: String(r.DriverMode || '').trim(),
       driverNIP: String(r.DriverNIP || '').trim(),
       driverName: String(r.DriverName || '').trim(),
      vehiclePlate: String(r.VehiclePlate || '').trim(),
      status: String(r.Status || '').trim().toLowerCase(),
      currentLevel: r.CurrentLevel,
      approvalStatus: r.VehicleStatusId === 3 ? 'approved' : r.AtasanStatusId === 3 ? 'waiting' : 'not-approved',
    })) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function getVehicleApprovalQueueLinkHandler(req, res) {
  const token = String(req.params.token || '').trim();
  try {
    const rows = await getVehicleApprovalQueueByToken(token);
    if (!rows) return res.status(404).json({ error: 'Link approval tidak valid atau sudah kedaluwarsa' });
    res.json({ data: rows.map((row) => ({ id: row.Id, nama: String(row.PemohonName || row.NIP).trim(), tujuan: String(row.Tujuan || '').trim(), alasan: String(row.Keperluan || '').trim(), tanggalMulai: row.StartDate, tanggalSelesai: row.EndDate, jamMulai: toTime(row.StartTime), vehicleType: row.VehicleType, vehiclePlate: row.VehiclePlate, driverMode: row.DriverMode, driverNIP: row.DriverNIP, driverName: row.DriverName, statusId: row.managerStatusId, processedByNIP: row.processedByNIP, processedAt: row.processedAt })) });
  } catch (err) { res.status(500).json({ error: err.message }); }
}

async function approveVehicleApprovalQueueLinkHandler(req, res) {
  const token = String(req.params.token || '').trim();
  const { action, vehicleType, vehiclePlate, driverMode, driverName, travelId } = req.body || {};
  if (!['approve', 'reject'].includes(action)) return res.status(400).json({ error: 'action harus approve atau reject' });
  if (!/^[A-Za-z0-9._-]{1,100}$/.test(String(travelId || '').trim())) return res.status(400).json({ error: 'travelId tidak valid' });
  const verified = verifyVehicleApprovalToken(token);
  if (!verified || verified.level !== 3 || !VEHICLE_MANAGER_NIPS.includes(verified.nip)) return res.status(404).json({ error: 'Link approval tidak valid atau sudah kedaluwarsa' });
  const type = String(vehicleType || '').trim().toUpperCase();
  const plate = String(vehiclePlate || '').trim().toUpperCase();
  const mode = String(driverMode || '').trim().toUpperCase();
  const driver = String(driverName || '').trim();
  if (driver.length > 200) return res.status(400).json({ error: 'Nama supir maksimal 200 karakter' });
  if (action === 'approve' && !['PRIVATE', 'ONLINE', 'OFFICE', 'MOTOR'].includes(type)) return res.status(400).json({ error: 'Jenis kendaraan wajib dipilih' });
  if (action === 'approve' && ['OFFICE', 'MOTOR'].includes(type) && !plate) return res.status(400).json({ error: 'Nomor plat kendaraan wajib diisi' });
  try {
    const result = await approveVehicleByQueueToken(String(travelId).trim(), token, verified.nip, type, plate, action, driverMode, driver);
    if (!result.success) return res.status(404).json({ error: 'Approval tidak ditemukan atau sudah diproses' });
    res.json({ success: true, qrToken: result.qrToken || null });
  } catch (err) { res.status(500).json({ error: err.message }); }
}

async function getVehicleApprovalLinkHandler(req, res) {
  const token = String(req.params.token || '').trim();
  const verified = verifyVehicleApprovalToken(token);
  if (!verified || !VEHICLE_MANAGER_NIPS.includes(verified.nip)) return res.status(404).json({ error: 'Link approval tidak valid atau sudah kedaluwarsa' });
  try {
    if (verified.travelId.startsWith('G.TL-')) {
      const match = verified.travelId.match(/^G\.(TL-[A-Z0-9]{6})\.(\d+)$/);
      const row = match && await getGroupVehicleApprovalByToken(match[1], Number(match[2]));
      if (!row) return res.status(404).json({ error: 'Pengajuan kendaraan tidak ditemukan' });
      return res.json({ data: { ...row, id: row.groupCode, statusId: row.approvalStatus === 'approved' ? 3 : row.approvalStatus === 'rejected' ? 4 : 1 } });
    }
    const row = await getVehicleApproval(verified.travelId, token);
    if (!row) return res.status(404).json({ error: 'Pengajuan kendaraan tidak ditemukan' });
    res.json({ data: { id: row.Id, nama: String(row.PemohonName || row.NIP).trim(), tujuan: String(row.Tujuan || '').trim(), alasan: String(row.Keperluan || '').trim(), tanggalMulai: row.StartDate, tanggalSelesai: row.EndDate, jamMulai: toTime(row.StartTime), vehicleType: row.VehicleType, vehiclePlate: row.VehiclePlate, driverMode: row.DriverMode, driverNIP: row.DriverNIP, driverName: row.DriverName, statusId: row.managerStatusId, processedByNIP: row.processedByNIP, processedAt: row.processedAt } });
  } catch (err) { res.status(500).json({ error: err.message }); }
}

async function approveVehicleApprovalLinkHandler(req, res) {
  const token = String(req.params.token || '').trim();
  const verified = verifyVehicleApprovalToken(token);
  const { action, vehicleType, vehiclePlate, driverMode, driverName } = req.body || {};
  if (!verified || !VEHICLE_MANAGER_NIPS.includes(verified.nip)) return res.status(404).json({ error: 'Link approval tidak valid atau sudah kedaluwarsa' });
  if (!['approve', 'reject'].includes(action)) return res.status(400).json({ error: 'action harus approve atau reject' });
  const type = String(vehicleType || '').trim().toUpperCase();
  const plate = String(vehiclePlate || '').trim().toUpperCase();
  const mode = String(driverMode || '').trim().toUpperCase();
  const driver = String(driverName || '').trim();
  const isGroup = /^G\.(TL-[A-Z0-9]{6})\.\d+$/.test(verified.travelId);
  if (isGroup && action === 'approve' && ['OFFICE', 'MOTOR'].includes(type) && !['SELF', 'DRIVER'].includes(mode)) return res.status(400).json({ error: 'Cara berkendara wajib dipilih' });
  if (isGroup && action === 'approve' && mode === 'DRIVER' && !driver) return res.status(400).json({ error: 'Nama supir wajib diisi' });
  if (driver.length > 200) return res.status(400).json({ error: 'Nama supir maksimal 200 karakter' });
  if (action === 'approve' && !['PRIVATE', 'ONLINE', 'OFFICE', 'MOTOR'].includes(type)) return res.status(400).json({ error: 'Jenis kendaraan wajib dipilih' });
  if (action === 'approve' && ['OFFICE', 'MOTOR'].includes(type) && !plate) return res.status(400).json({ error: 'Nomor plat kendaraan wajib diisi' });
  try {
    const groupMatch = verified.travelId.match(/^G\.(TL-[A-Z0-9]{6})\.(\d+)$/);
    if (groupMatch) {
      const result = await approveGroupVehicle(groupMatch[1], Number(groupMatch[2]), verified.nip, action, type, plate, mode, driver);
      return res.json({ success: true, qrToken: result.qrToken || null });
    }
    const result = await approveVehicle(verified.travelId, token, verified.nip, type, plate, action, mode, driver);
    if (!result.success) return res.status(404).json({ error: 'Approval tidak ditemukan atau sudah diproses' });
    res.json({ success: true, qrToken: result.qrToken || null });
  } catch (err) { res.status(500).json({ error: err.message }); }
}

async function getApprovalHandler(req, res) {
  try {
    const role = await detectRole(req.user.id);
    const rows = await getTravelApprovals(req.user.id, role || 'ATASAN');
    const groupRows = await getGroupApprovalQueue(String(req.user.id).trim());
    const approvals = [...rows.map((r) => ({
      id: r.Id,
      nip: r.PemohonNIP ? r.PemohonNIP : r.NIP,
      nama: r.PemohonName,
      tujuan: (r.Tujuan || '').trim(),
      alasan: (r.Keperluan || '').trim(),
      tanggalMulai: r.StartDate,
      tanggalSelesai: r.EndDate,
      jamMulai: toTime(r.StartTime),
      jamSelesai: toTime(r.EndTime),
      level: r.Level,
      statusId: r.StatusId,
      status: (r.Status || '').trim().toLowerCase(),
      updates: r.StatusId === 3 ? 'Approved' : r.StatusId === 4 ? 'Rejected' : 'Propose',
      currentLevel: r.CurrentLevel,
    })), ...groupRows.map((r) => ({
      id: r.id,
      nip: r.nip,
      nama: String(r.nama || r.nip).trim(),
      tujuan: String(r.tujuan || '').trim(),
      alasan: String(r.alasan || '').trim(),
      tanggalMulai: r.tanggalMulai,
      tanggalSelesai: null,
      jamMulai: toTime(r.jamMulai),
      jamSelesai: null,
      level: 1,
      statusId: r.statusId,
      status: String(r.status || '').trim().toLowerCase(),
      updates: r.updates,
      currentLevel: 1,
      createdAt: r.createdAt,
      groupCode: r.groupCode,
      groupVersion: r.groupVersion,
      members: r.members,
    }))].sort((left, right) => new Date(right.createdAt || right.tanggalMulai || 0) - new Date(left.createdAt || left.tanggalMulai || 0));
    res.json({ data: approvals });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function approveTravelHandler(req, res) {
  const { id, action, vehicleType, vehiclePlate, driverMode, driverName } = req.body || {};
  const approvalId = String(id || '').trim();
  const approvalGroupMatch = approvalId.match(/^G\.(TL-[A-Z0-9]{6})\.(\d+)$/);
  const normalizedVehicleType = String(vehicleType || '').trim().toUpperCase();
  const normalizedVehiclePlate = ['OFFICE', 'MOTOR'].includes(normalizedVehicleType) ? String(vehiclePlate || '').trim().toUpperCase() : '';
  const normalizedDriverMode = String(driverMode || '').trim().toUpperCase();
  const normalizedDriverName = String(driverName || '').trim();
  if (normalizedDriverName.length > 200) return res.status(400).json({ error: 'Nama supir maksimal 200 karakter' });
  if (!approvalId || !action) {
    return res.status(400).json({ error: 'id dan action wajib diisi' });
  }
  if (!['approve', 'reject'].includes(action)) {
    return res.status(400).json({ error: 'action harus approve atau reject' });
  }
  try {
    const role = await detectRole(req.user.id);
    if (approvalGroupMatch) {
      if (role === 'GS') {
        if (action === 'approve' && !['PRIVATE', 'ONLINE', 'OFFICE', 'MOTOR'].includes(normalizedVehicleType)) return res.status(400).json({ error: 'Jenis kendaraan wajib dipilih' });
        if (action === 'approve' && ['OFFICE', 'MOTOR'].includes(normalizedVehicleType) && !normalizedVehiclePlate) return res.status(400).json({ error: 'Nomor plat wajib diisi untuk kendaraan yang dipilih' });
        if (action === 'approve' && ['OFFICE', 'MOTOR'].includes(normalizedVehicleType) && !['SELF', 'DRIVER'].includes(normalizedDriverMode)) return res.status(400).json({ error: 'Cara berkendara wajib dipilih' });
        if (action === 'approve' && normalizedDriverMode === 'DRIVER' && !normalizedDriverName) return res.status(400).json({ error: 'Nama supir wajib diisi' });
        const result = await approveGroupVehicle(approvalGroupMatch[1], Number(approvalGroupMatch[2]), String(req.user.id).trim(), action, normalizedVehicleType, normalizedVehiclePlate, normalizedDriverMode, normalizedDriverName);
        if (!result.success) return res.status(404).json({ error: 'Approval kendaraan group tidak ditemukan atau sudah diproses' });
        return res.json({ success: true });
      }
      const result = await approveGroup(approvalGroupMatch[1], Number(approvalGroupMatch[2]), String(req.user.id).trim(), action);
      if (!result.success) return res.status(404).json({ error: 'Approval group tidak ditemukan atau sudah diproses' });
      return res.json({ success: true });
    }
    const level = role === 'GS' ? 3 : role === 'HR' ? 2 : 1;
    if (action === 'approve' && role === 'GS') {
      if (!['PRIVATE', 'ONLINE', 'OFFICE', 'MOTOR'].includes(normalizedVehicleType)) {
        return res.status(400).json({ error: 'Jenis kendaraan wajib dipilih' });
      }
      if (['OFFICE', 'MOTOR'].includes(normalizedVehicleType) && !normalizedVehiclePlate) {
        return res.status(400).json({ error: 'Nomor plat wajib diisi untuk kendaraan yang dipilih' });
      }
    }
    const result = await approveTravel(approvalId, req.user.id, level, action, role, { vehicleType: normalizedVehicleType, vehiclePlate: normalizedVehiclePlate, driverMode: normalizedDriverMode, driverName: normalizedDriverName });
    if (!result.success) {
      return res.status(404).json({ error: 'Approval tidak ditemukan atau sudah diproses' });
    }
    res.json({ success: true });
  } catch (err) {
    console.error('[approveTravelHandler ERROR]', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
}

async function returnTravelHandler(req, res) {
  const { id, nip } = req.body || {};
  if (!id) {
    return res.status(400).json({ error: 'id wajib diisi' });
  }
  const targetNIP = String(nip || '').trim();
  if (!canReturnTravel(req.user.id, targetNIP)) {
    return res.status(403).json({ error: 'Akses pencatatan kepulangan tidak diizinkan' });
  }
  try {
    const result = await returnTravel(id, targetNIP);
    if (result.rowsAffected === 0) {
      return res.status(404).json({ error: 'Tugas luar tidak ditemukan atau sudah disetujui' });
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function getActiveTravelsHandler(req, res) {
  const nip = (req.query.nip || '').toString().trim();
  if (!nip) {
    return res.status(400).json({ error: 'nip wajib diisi' });
  }
  try {
    const rows = await getActiveTravels(nip);
    const travels = rows.map((r) => ({
      id: r.Id,
      nip: r.NIP,
      nama: r.Nama ? String(r.Nama).trim() : '-',
      tujuan: (r.Tujuan || '').trim(),
      keperluan: (r.Keperluan || '').trim(),
      tanggalMulai: r.StartDate,
      jamMulai: toTime(r.StartTime),
    }));
    res.json({ data: travels });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// Dipanggil oleh web (CodeIgniter) untuk approve/reject tugas luar tanpa JWT.
// Dilindungi kunci internal bersama (INTERNAL_KEY).
async function webApproveTravelHandler(req, res) {
  const { id, action, key } = req.body || {};
  if (!INTERNAL_KEY || String(key) !== INTERNAL_KEY) {
    return res.status(401).json({ error: 'Kunci internal tidak valid' });
  }
  if (!id || !['approve', 'reject'].includes(action)) {
    return res.status(400).json({ error: 'id dan action (approve/reject) wajib diisi' });
  }
  try {
    const ap = await getWebApproverNIP(id);
    if (!ap) {
      return res.status(404).json({ error: 'Approval level 1 tidak ditemukan atau sudah diproses' });
    }
    const result = await approveTravel(id, String(ap.NIP).trim(), 1, action, 'ATASAN');
    if (!result.success) {
      return res.status(404).json({ error: 'Approval tidak ditemukan atau sudah diproses' });
    }
    res.json({ success: true });
  } catch (err) {
    console.error('[webApproveTravel ERROR]', err);
    res.status(500).json({ error: err.message });
  }
}

module.exports = { getAtasanHandler, submitTravelHandler, getMyTravelsHandler, getApprovalHandler, getTravelQrHandler, getTravelGroupQrHandler, scanTravelHandler, getTravelApprovalQueueLinkHandler, approveTravelApprovalQueueLinkHandler, getTravelApprovalLinkHandler, approveTravelApprovalLinkHandler, getVehicleApprovalHandler, getVehicleApprovalQueueLinkHandler, approveVehicleApprovalQueueLinkHandler, getVehicleApprovalLinkHandler, approveVehicleApprovalLinkHandler, approveTravelHandler, returnTravelHandler, getActiveTravelsHandler, webApproveTravelHandler, createTravelGroupHandler, getTravelGroupHandler, joinTravelGroupHandler, confirmTravelGroupHandler, addTravelGroupMemberHandler, searchTravelGroupEmployeesHandler, addDirectTravelGroupMemberHandler, removeTravelGroupMemberHandler, submitTravelGroupHandler, reviseTravelGroupHandler, getTravelGroupApprovalsHandler, approveTravelGroupHandler, getMyGroupsHandler, getGroupApprovalHandler, getGroupVehicleApprovalHandler, approveGroupVehicleHandler, toTime, travelScanFields, canReturnTravel, validateTravelSubmitVehicle, validateTravelSubmitDateTime };
