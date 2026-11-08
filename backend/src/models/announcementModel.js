const { getConnection } = require('../config/db');

async function getAnnouncements() {
  const conn = await getConnection();
  const result = await conn
    .request()
    .query(`
      SELECT Id, Name_Event AS Name, Description, StarDate, endDate, ExpirePopUP, Inp_by AS InpBy, Inp_Date AS InpDate, Link, Files
      FROM hris_events
      WHERE ExpirePopUP IS NULL OR ExpirePopUP >= CAST(GETDATE() AS DATE)
      ORDER BY Inp_Date DESC, Id DESC
    `);
  return result.recordset;
}

module.exports = { getAnnouncements };
