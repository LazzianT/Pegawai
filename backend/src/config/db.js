require('dotenv').config({ path: '.env' });
const sql = require('mssql');

const server = process.env.DB_SERVER;
const port = parseInt(process.env.DB_PORT) || 1433;

const config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server,
  ...(server.includes('\\') ? {} : { port }),
  database: process.env.DB_DATABASE,
  options: {
    encrypt: process.env.DB_ENCRYPT === 'true',
    trustServerCertificate: true,
    enableArithAbort: true,
  },
};

let pool;

async function getConnection() {
  if (!pool) {
    pool = await sql.connect(config);
  }
  return pool;
}

module.exports = {
  getConnection,
  sql,
};
