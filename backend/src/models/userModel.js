const { getConnection } = require('../config/db');

async function login(NIP, passwordHash) {
  const conn = await getConnection();
  const result = await conn
    .request()
    .input('NIP', NIP)
    .input('PasswordHash', (passwordHash || '').toLowerCase())
    .query(`
      SELECT
        a.NIP,
        a.Name,
        c.Jobtitle,
        a.Email,
        d.NamaDepartemen,
        c.Joblevel,
        LOWER(CONVERT(VARCHAR(40),
          HASHBYTES('SHA1', CAST(FORMAT(a.BirthDate, 'ddMMyy') AS VARCHAR(6))), 2)
        ) AS PasswordHash
      FROM hris_Employee a
      LEFT JOIN hris_EmployeeCareerPath b ON a.NIP = b.NIP AND b.is_Archive = 0
      LEFT JOIN hris_Jobtitle c ON b.Id_Jobtitle = c.Id_Jobtitle
      LEFT JOIN MASCOSTCENTER d ON a.DepartID = d.DepartID
      WHERE a.NIP = @NIP
        AND b.is_Archive = 0
        AND LOWER(CONVERT(VARCHAR(40),
          HASHBYTES('SHA1', CAST(FORMAT(a.BirthDate, 'ddMMyy') AS VARCHAR(6))), 2)
        ) = @PasswordHash
    `);
  return result.recordset[0];
}

async function getAllUsers() {
  const conn = await getConnection();
  const result = await conn.request().query('SELECT * FROM Users');
  return result.recordset;
}

function mapRole(joblevel) {
  if (!joblevel) return 'STAFF';
  const level = joblevel.trim().toUpperCase();
  if (level === 'OPERATOR' || level === 'STAFF') return 'STAFF';
  return 'ATASAN';
}

module.exports = {
  login,
  getAllUsers,
  mapRole,
  getEmployeeByNIP,
  updateEmail,
};

async function getEmployeeByNIP(NIP) {
  const conn = await getConnection();
  const result = await conn.request()
    .input('NIP', NIP)
    .query(`
      SELECT a.NIP, a.Name, a.Email, c.Jobtitle, d.NamaDepartemen
      FROM hris_Employee a
      LEFT JOIN hris_EmployeeCareerPath b ON a.NIP = b.NIP AND b.is_Archive = 0
      LEFT JOIN hris_Jobtitle c ON b.Id_Jobtitle = c.Id_Jobtitle
      LEFT JOIN MASCOSTCENTER d ON a.DepartID = d.DepartID
      WHERE a.NIP = @NIP
    `);
  return result.recordset[0];
}

async function updateEmail(NIP, email) {
  const conn = await getConnection();
  const result = await conn.request()
    .input('NIP', NIP)
    .input('Email', email)
    .query(`UPDATE hris_Employee SET Email = @Email WHERE NIP = @NIP`);
  return { rowsAffected: result.rowsAffected[0] };
}
