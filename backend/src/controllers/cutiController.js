const { getLeaveSaldo, getLeaveTransactions, getTopLevel, submitLeave, getApprovalCutiList, approveCuti } = require('../models/cutiModel');

async function getSaldoHandler(req, res) {
  try {
    const leaveType = parseInt(req.query.leaveType, 10) || 1;
    const saldo = await getLeaveSaldo(req.user.id, leaveType);
    if (!saldo) {
      return res.status(404).json({ error: 'Saldo cuti tidak ditemukan' });
    }
    res.json(saldo);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

function parseJson(value) {
  if (value == null || value === '') return [];
  if (Array.isArray(value)) return value;
  try {
    return JSON.parse(value);
  } catch {
    return [];
  }
}

function formatPeriode(dates) {
  const parts = dates
    .map((d) => d.ProposeDate)
    .filter(Boolean)
    .sort();
  return parts.join(', ');
}

async function getTransactionsHandler(req, res) {
  try {
    const rows = await getLeaveTransactions(req.user.id);
    const transactions = rows.map((r) => {
      const dates = parseJson(r.DateProp);
      return {
        id: r.Id,
        jenis: r.LeaveTypeName,
        alasan: r.LeaveRemark,
        hari: `${r.LeaveDuration} hari`,
        status: r.LeaveStatusName,
        periode: formatPeriode(dates),
        dates,
        approvals: parseJson(r.Approval),
      };
    });
    res.json({ data: transactions });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
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

async function submitLeaveHandler(req, res) {
  const { leaveType, remark, dates, approvers } = req.body || {};
  if (!Number.isInteger(leaveType)) {
    return res.status(400).json({ error: 'leaveType wajib berupa angka' });
  }
  if (!Array.isArray(dates) || dates.length === 0) {
    return res.status(400).json({ error: 'dates wajib minimal 1 tanggal' });
  }
  if (!Array.isArray(approvers) || approvers.length === 0) {
    return res.status(400).json({ error: 'approvers wajib minimal 1 atasan' });
  }

  const NIP = String(req.user.id).trim();
  const ts = Math.floor(Date.now() / 1000);
  const rand = Math.floor(Math.random() * 90 + 10);
  const id = `C.${NIP}.${ts}${rand}`;

  try {
    const result = await submitLeave(NIP, { id, leaveType, remark: remark || null, dates, approvers });
    res.json({ id: result.id, name: result.name });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function getApprovalCutiHandler(req, res) {
  try {
    const statusFilter = req.query.status || null;
    const search = req.query.search || null;
    const rows = await getApprovalCutiList(req.user.id, statusFilter, search);
    const approvals = rows.map((r) => ({
      id: r.Id,
      priority: r.Priority,
      nip: r.NIP,
      nama: r.Name,
      statusId: r.StatusId,
      updDate: r.UpdDate,
      updates: r.Updates,
      durasi: r.LeaveDuration,
      alasan: r.LeaveRemark,
    }));
    res.json({ data: approvals });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function approveCutiHandler(req, res) {
  try {
    const { id, action } = req.body || {};
    if (!id || !action) {
      return res.status(400).json({ error: 'id dan action wajib diisi' });
    }
    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ error: 'action harus approve atau reject' });
    }
    const result = await approveCuti(id, action);
    if (!result.success) {
      if (result.error === 'ALREADY_PROCESSED') {
        return res.status(400).json({ error: 'Sudah diproses sebelumnya' });
      }
      return res.status(404).json({ error: 'Approval tidak ditemukan' });
    }
    res.json({ success: true, message: action === 'approve' ? 'Disetujui' : 'Ditolak' });
  } catch (err) {
    console.error('[approveCutiHandler ERROR]', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
}

module.exports = { getSaldoHandler, getTransactionsHandler, getAtasanHandler, submitLeaveHandler, getApprovalCutiHandler, approveCutiHandler };
