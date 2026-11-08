const { getConnection, sql } = require('../config/db');

async function upsertDeviceToken({ NIP, token, platform }) {
  const conn = await getConnection();
  const result = await conn
    .request()
    .input('NIP', sql.VarChar, NIP)
    .input('Token', sql.VarChar, token)
    .input('Platform', sql.VarChar, platform || null)
    .input('InpDate', sql.DateTime, new Date())
    .query(`
      -- Satu perangkat hanya boleh terikat ke SATU NIP (akun yang login terakhir).
      -- Hapus dulu token yang sama dari NIP lain supaya notif tidak nyasar ke akun lama.
      DELETE FROM device_tokens WHERE Token = @Token AND NIP <> @NIP;

      IF EXISTS (SELECT 1 FROM device_tokens WHERE NIP = @NIP AND Token = @Token)
        UPDATE device_tokens SET Platform = @Platform, InpDate = @InpDate WHERE NIP = @NIP AND Token = @Token
      ELSE
        INSERT INTO device_tokens (NIP, Token, Platform, InpDate) VALUES (@NIP, @Token, @Platform, @InpDate)
    `);
  return result.rowsAffected[0] > 0;
}

async function removeDeviceToken({ NIP, token }) {
  const conn = await getConnection();
  const req = conn.request();
  if (NIP) req.input('NIP', sql.VarChar, NIP);
  if (token) req.input('Token', sql.VarChar, token);
  if (!NIP && !token) return false;
  const where = [];
  if (NIP) where.push('NIP = @NIP');
  if (token) where.push('Token = @Token');
  const result = await req.query(`DELETE FROM device_tokens WHERE ${where.join(' AND ')}`);
  return result.rowsAffected[0] > 0;
}

async function getTokensByNIP(NIP) {
  const conn = await getConnection();
  const result = await conn
    .request()
    .input('NIP', sql.VarChar, NIP)
    .query(`SELECT Token FROM device_tokens WHERE NIP = @NIP`);
  return result.recordset;
}

module.exports = { upsertDeviceToken, removeDeviceToken, getTokensByNIP };
