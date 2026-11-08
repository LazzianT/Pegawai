const { getConnection, sql } = require('../config/db');

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const EXPO_RECEIPTS_URL = 'https://exp.host/--/api/v2/push/getReceipts';

async function removeToken(token) {
  try {
    const conn = await getConnection();
    await conn
      .request()
      .input('Token', sql.VarChar, token)
      .query(`DELETE FROM device_tokens WHERE Token = @Token`);
  } catch (e) {
    console.error('[push removeToken ERROR]', e.message);
  }
}

// Cek receipts Expo — error "DeviceNotRegistered" (mis. app di-uninstall)
// biasanya baru muncul di sini, bukan di response /send.
async function checkReceipts(idToToken) {
  try {
    const ids = Object.keys(idToToken);
    if (ids.length === 0) return;
    const res = await fetch(EXPO_RECEIPTS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids }),
    });
    const json = await res.json();
    const data = json?.data || {};
    for (const id of ids) {
      const rec = data[id];
      const bad = (rec?.details?.error || '').toLowerCase() === 'devicenotregistered';
      if (bad && idToToken[id]) {
        console.log('[push] hapus token tidak terdaftar:', String(idToToken[id]).slice(0, 40));
        removeToken(idToToken[id]);
      }
    }
  } catch (e) {
    console.error('[push receipts ERROR]', e.message);
  }
}

async function sendPushNotifications({ tokens, title, body, data }) {
  if (!tokens || tokens.length === 0) return { sent: 0 };
  const messages = tokens.map((token) => ({
    to: token,
    sound: 'default',
    title,
    body,
    data: data || {},
    priority: 'high',
  }));
  try {
    const res = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(messages),
    });
    const result = await res.json();
    const idToToken = {};
    if (Array.isArray(result?.data)) {
      result.data.forEach((r, idx) => {
        const bad = (r.details?.error || '').toLowerCase() === 'devicenotregistered';
        if (bad && tokens[idx]) removeToken(tokens[idx]);
        else if (r.id && tokens[idx]) idToToken[r.id] = tokens[idx];
      });
    }
    // Best-effort: cek receipts ~15 detik kemudian, hapus token yang sudah tidak terdaftar
    if (Object.keys(idToToken).length > 0) {
      setTimeout(() => checkReceipts(idToToken), 15000);
    }
    return { sent: Array.isArray(result?.data) ? result.data.length : 0, result };
  } catch (err) {
    console.error('[push ERROR]', err.message);
    return { sent: 0, error: err.message };
  }
}

async function getTokensByNIP(NIP) {
  const conn = await getConnection();
  const result = await conn
    .request()
    .input('NIP', sql.VarChar, NIP)
    .query(`SELECT Token FROM device_tokens WHERE NIP = @NIP`);
  return result.recordset.map((r) => r.Token);
}

module.exports = { sendPushNotifications, getTokensByNIP };
