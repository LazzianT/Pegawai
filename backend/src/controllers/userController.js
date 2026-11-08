const jwt = require('jsonwebtoken');
const { login, getAllUsers, mapRole, getEmployeeByNIP, updateEmail } = require('../models/userModel');

const JWT_SECRET = String(process.env.JWT_SECRET || '').trim();
if (!JWT_SECRET) throw new Error('JWT_SECRET wajib dikonfigurasi');
const JWT_EXPIRES = process.env.JWT_EXPIRES || '8h';
const SECURITY_USERNAME = String(process.env.SECURITY_USERNAME || '').trim();
const SECURITY_PASSWORD = String(process.env.SECURITY_PASSWORD || '');

async function loginHandler(req, res) {
  const { username, password } = req.body || {};
  try {
    const user = await login(username, password);
    if (!user) {
      res.status(401).json({ error: 'NIP atau password salah' });
      return;
    }
    const nip = user.NIP.trim();
    const role = mapRole(user.Joblevel);
    const signOpts = JWT_EXPIRES && JWT_EXPIRES !== '0' ? { expiresIn: JWT_EXPIRES } : {};
    const token = jwt.sign(
      { id: nip, name: (user.Name || '').trim(), role },
      JWT_SECRET,
      signOpts
    );
    res.json({
      token,
      user: {
        id: nip,
        name: (user.Name || '').trim() || null,
        email: (user.Email || '').trim() || null,
        role,
        jabatan: (user.Jobtitle || '').trim() || null,
        department: (user.NamaDepartemen || '').trim() || null,
        atasanId: null,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function getUsersHandler(req, res) {
  try {
    const users = await getAllUsers();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function healthHandler(req, res) {
  try {
    const { getConnection } = require('../config/db');
    await getConnection();
    res.json({ status: 'ok', database: 'connected' });
  } catch (err) {
    res.status(500).json({ status: 'error', error: err.message });
  }
}

module.exports = {
  loginHandler,
  getUsersHandler,
  healthHandler,
  getProfileHandler,
  updateEmailHandler,
  securityLoginHandler,
};

async function getProfileHandler(req, res) {
  try {
    const user = await getEmployeeByNIP(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'Karyawan tidak ditemukan' });
    }
    res.json({
      nip: user.NIP,
      name: (user.Name || '').trim(),
      email: (user.Email || '').trim() || null,
      jabatan: (user.Jobtitle || '').trim() || null,
      department: (user.NamaDepartemen || '').trim() || null,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function updateEmailHandler(req, res) {
  const { email } = req.body || {};
  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'Email tidak valid' });
  }
  try {
    const result = await updateEmail(req.user.id, email);
    if (result.rowsAffected === 0) {
      return res.status(404).json({ error: 'Karyawan tidak ditemukan' });
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function securityLoginHandler(req, res) {
  const { username, password } = req.body || {};
  if (SECURITY_USERNAME && SECURITY_PASSWORD && username === SECURITY_USERNAME && password === SECURITY_PASSWORD) {
    const signOpts = JWT_EXPIRES && JWT_EXPIRES !== '0' ? { expiresIn: JWT_EXPIRES } : {};
    const token = jwt.sign(
      { id: 'SECURITY', name: 'Security BMC', role: 'ATASAN' },
      JWT_SECRET,
      signOpts,
    );
    return res.json({ token, user: { id: 'SECURITY', name: 'Security BMC', role: 'ATASAN' } });
  }
  res.status(401).json({ error: 'Kredensial tidak valid' });
}
