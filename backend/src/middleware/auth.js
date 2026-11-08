const jwt = require('jsonwebtoken');

const JWT_SECRET = String(process.env.JWT_SECRET || '').trim();
if (!JWT_SECRET) throw new Error('JWT_SECRET wajib dikonfigurasi');

function authenticate(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) {
    return res.status(401).json({ error: 'Token tidak ditemukan' });
  }
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Token tidak valid atau kedaluwarsa' });
  }
}

module.exports = { authenticate };
