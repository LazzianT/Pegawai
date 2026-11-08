const { getNotifications, markAllRead } = require('../models/notifikasiModel');

function formatWaktu(value) {
  if (!value) return '';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '';
  const now = Date.now();
  const diff = now - d.getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'Baru saja';
  if (min < 60) return `${min} menit lalu`;
  const jam = Math.floor(min / 60);
  if (jam < 24) return `${jam} jam lalu`;
  const hari = Math.floor(jam / 24);
  if (hari < 7) return `${hari} hari lalu`;
  return d.toLocaleDateString('id-ID');
}

async function getNotificationsHandler(req, res) {
  try {
    const rows = await getNotifications(req.user.id);
    const notifs = rows.map((r) => ({
      id: r.Id,
      title: r.Title,
      body: r.Body,
      waktu: formatWaktu(r.InpDate),
      read: r.IsRead === true || r.IsRead === 1,
      color: r.Action === 'APPROVE' ? '#10b981' : r.Action === 'REJECT' ? '#ef4444' : r.Type === 'CUTI' ? '#2563eb' : '#f59e0b',
      icon: r.Action === 'APPROVE' ? 'checkmark-done-outline' : r.Action === 'REJECT' ? 'alert-circle-outline' : 'megaphone-outline',
      type: r.Type,
      action: r.Action,
    }));
    res.json({ data: notifs });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function markAllReadHandler(req, res) {
  try {
    await markAllRead(req.user.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { getNotificationsHandler, markAllReadHandler };
