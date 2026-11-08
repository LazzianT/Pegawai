const { getConnection, sql } = require('../config/db');
const { getTokensByNIP, sendPushNotifications } = require('../services/pushService');

async function getNotifications(NIP) {
  const conn = await getConnection();
  const result = await conn
    .request()
    .input('NIP', sql.VarChar, NIP)
    .query(`
      SELECT TOP 50 Id, NIP, Type, Action, Title, Body, IsRead, InpDate
      FROM hris_Notification
      WHERE NIP = @NIP
      ORDER BY InpDate DESC, Id DESC
    `);
  return result.recordset;
}

async function markAllRead(NIP) {
  const conn = await getConnection();
  const result = await conn
    .request()
    .input('NIP', sql.VarChar, NIP)
    .query(`
      UPDATE hris_Notification
      SET IsRead = 1
      WHERE NIP = @NIP AND (IsRead IS NULL OR IsRead = 0)
    `);
  return result.rowsAffected[0];
}

async function addNotification({ NIP, Type, Action, Title, Body }) {
  const conn = await getConnection();
  const result = await conn
    .request()
    .input('NIP', sql.VarChar, NIP)
    .input('Type', sql.VarChar, Type)
    .input('Action', sql.VarChar, Action)
    .input('Title', sql.NVarChar, Title)
    .input('Body', sql.NVarChar, Body)
    .input('IsRead', sql.Bit, 0)
    .input('InpDate', sql.DateTime, new Date())
    .query(`
      INSERT INTO hris_Notification (NIP, Type, Action, Title, Body, IsRead, InpDate)
      VALUES (@NIP, @Type, @Action, @Title, @Body, @IsRead, @InpDate)
    `);
  const affected = result.rowsAffected[0];
  if (affected > 0) {
    try {
      const tokens = await getTokensByNIP(NIP);
      if (tokens.length > 0) {
        await sendPushNotifications({ tokens, title: Title, body: Body, data: { Type, Action } });
      }
    } catch (e) {
      console.error('[push in notif ERROR]', e.message);
    }
  }
  return affected;
}

module.exports = { getNotifications, markAllRead, addNotification };
