const { getPermitTransactions, getPermitSubGroups, submitIzin, getApprovalIzinList, approveIzin } = require('../models/izinModel');

function toISODate(value) {
  if (value == null || value === '') return null;
  const d = new Date(value);
  if (isNaN(d.getTime())) return String(value).slice(0, 10);
  return d.toISOString().slice(0, 10);
}

function toTime(value) {
  const d = new Date(value);
  if (isNaN(d.getTime())) return null;
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
}

async function getTransactionsHandler(req, res) {
  try {
    const idType = parseInt(req.query.type, 10) || 1;
    const rows = await getPermitTransactions(req.user.id, idType);
    const transactions = rows.map((r) => ({
      id: r.Id,
      jenis: (r.SubDetail || '').trim(),
      tanggal: toISODate(r.ProposeStartDate),
      alasan: (r.Description || '').trim(),
    }));
    res.json({ data: transactions });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function getKeperluanHandler(req, res) {
  try {
    const idType = parseInt(req.query.type, 10) || 1;
    const idSubGroup = req.query.idSubGroup != null ? String(req.query.idSubGroup).trim() : null;
    const rows = await getPermitSubGroups(idType, idSubGroup);
    const options = rows.map((r) => ({
      idSubGroup: r.IdSubGroup,
      subDetail: (r.SubDetail || '').trim(),
      numDays: r.NumDays,
      typeDays: (r.TypeDays || '').trim(),
      docSupport: (r.DocSupport || '').trim(),
      docTime: (r.DocTime || '').trim(),
    }));
    res.json({ data: options });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function submitIzinHandler(req, res) {
  const {
    ProposeStartDate,
    ProposeEndDate,
    ProposeStartTime,
    ProposeEndTime,
    description,
    keperluan, // This is the IdSubGroup from hris_Permit_SubGroup (e.g., "2")
    fileName,
    approvers,
  } = req.body || {};

  if (!ProposeStartDate || !ProposeEndDate) {
    return res.status(400).json({ error: 'ProposeStartDate dan ProposeEndDate wajib diisi' });
  }

  if (!Array.isArray(approvers) || approvers.length === 0) {
    return res.status(400).json({ error: 'approvers wajib minimal 1 atasan' });
  }

  const NIP = String(req.user.id).trim();

  try {
    const result = await submitIzin(NIP, {
      ProposeStartDate: ProposeStartDate,
      ProposeEndDate: ProposeEndDate,
      ProposeStartTime: ProposeStartTime || null,
      ProposeEndTime: ProposeEndTime || null,
      jenis: keperluan, // Use keperluan (IdSubGroup) as PermitType
      description: description || null,
      keperluan: keperluan || null,
      fileName: fileName || null,
      approvers,
    });
    res.json({ id: result.id, name: result.name });
  } catch (err) {
    console.error('[submitIzinHandler ERROR]', err);
    console.error('[submitIzinHandler ERROR] code:', err.code);
    console.error('[submitIzinHandler ERROR] number:', err.number);
    console.error('[submitIzinHandler ERROR] message:', err.message);
    console.error('[submitIzinHandler ERROR] originalError:', err.originalError);
    console.error('[submitIzinHandler ERROR] originalError.message:', err.originalError?.message);
    console.error('[submitIzinHandler ERROR] stack:', err.stack);
    const sqlErrorMsg = err.originalError?.message || err.message || 'Internal server error';
    res.status(500).json({ error: sqlErrorMsg });
  }
}

async function getApprovalIzinHandler(req, res) {
  try {
    const statusFilter = req.query.status || null;
    const search = req.query.search || null;
    const rows = await getApprovalIzinList(req.user.id, statusFilter, search);
    const approvals = rows.map((r) => ({
      id: r.Id,
      priority: r.Priority,
      nip: r.NIP,
      nama: r.Name,
      statusId: r.StatusId,
      updDate: r.UpdDate,
      updates: r.Updates,
      jenis: r.SubGroup ? String(r.SubGroup).trim() : '',
      tanggalMulai: r.ProposeStartDate,
      tanggalSelesai: r.ProposeEndDate,
      jamMulai: toTime(r.ProposeStartTime),
      jamSelesai: toTime(r.ProposeEndTime),
      alasan: r.Description ? String(r.Description).trim() : '',
    }));
    res.json({ data: approvals });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function approveIzinHandler(req, res) {
  try {
    const { id, action } = req.body || {};
    if (!id || !action) {
      return res.status(400).json({ error: 'id dan action wajib diisi' });
    }
    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ error: 'action harus approve atau reject' });
    }
    const result = await approveIzin(id, action);
    if (!result.success) {
      if (result.error === 'ALREADY_PROCESSED') {
        return res.status(400).json({ error: 'Sudah diproses sebelumnya' });
      }
      return res.status(404).json({ error: 'Approval tidak ditemukan' });
    }
    res.json({ success: true, message: action === 'approve' ? 'Disetujui' : 'Ditolak' });
  } catch (err) {
    console.error('[approveIzinHandler ERROR]', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
}

module.exports = { getTransactionsHandler, getKeperluanHandler, submitIzinHandler, getApprovalIzinHandler, approveIzinHandler };