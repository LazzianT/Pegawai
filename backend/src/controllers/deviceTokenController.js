const { upsertDeviceToken, removeDeviceToken } = require('../models/deviceTokenModel');

async function registerTokenHandler(req, res) {
  const { token, platform } = req.body || {};
  if (!token || typeof token !== 'string') {
    return res.status(400).json({ error: 'token wajib diisi' });
  }
  try {
    await upsertDeviceToken({ NIP: String(req.user.id).trim(), token, platform });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function removeTokenHandler(req, res) {
  const { token } = req.body || {};
  try {
    // Hapus ikatan token milik akun yang sedang logout (kalau token tidak dikirim, hapus semua milik NIP ini)
    await removeDeviceToken({ NIP: String(req.user.id).trim(), token: token || null });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { registerTokenHandler, removeTokenHandler };
