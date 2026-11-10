const { getConnection, sql } = require('../config/db');

const WA_API_URL = String(process.env.WA_API_URL || '').trim();

const VEHICLE_MANAGER_NIPS = [...new Set(String(process.env.WA_VEHICLE_MANAGER_NIPS || '').split(',').map((value) => value.trim()).filter(Boolean))];
const EMPLOYEE_PORTAL_URL = String(process.env.EMPLOYEE_PORTAL_URL || '').trim().replace(/\/$/, '');
const SECURITY_QR_BASE_URL = String(process.env.SECURITY_QR_BASE_URL || '').trim().replace(/\/$/, '');
const VEHICLE_LABELS = { PRIVATE: 'Lain Lain', ONLINE: 'PesanOnline', OFFICE: 'Mobil Operasional', MOTOR: 'Motor Operasional' };

function travelRecipient(NIP, fallback) {
  return String(fallback || '').trim();
}

function formatTravelApprovalMessage({ approverName, members, tujuan, keperluan, vehicle, startDate, startTime, driver, approvalLink }) {
  const value = (input) => String(input || '').trim() || '-';
  const time = startTime ? String(startTime).slice(0, 5) : '';
  const people = (Array.isArray(members) ? members : []).map((member, index) => `${index + 1}. ${value(member?.name ?? member?.Name)} (${value(member?.nip ?? member?.NIP)})`).join('\n') || '1. -';
  const link = String(approvalLink || '').trim();
  const vehicleLabel = VEHICLE_LABELS[String(vehicle || '').trim().toUpperCase()] || vehicle;
  return `*Employee Portal BMC*\n\nDear *${value(approverName)}*,\n\nTerdapat permintaan approval Tugas Luar dengan detail berikut:\n\nYang berangkat:\n${people}\n\nTanggal mulai: ${value(startDate)}\nJam mulai: ${time || '-'}\nTujuan: ${value(tujuan)}\nKeperluan: ${value(keperluan)}\nKendaraan yang digunakan: ${value(vehicleLabel)}\nSopir: ${value(driver)}${link ? `\n\nMohon lakukan persetujuan melalui link berikut:\n${link}` : ''}`;
}

function formatTravelApprovedMessage({ recipientName, members, tujuan, keperluan, vehicle, vehiclePlate, driver, qrLink }) {
  const value = (input) => String(input || '').trim() || '-';
  const people = (Array.isArray(members) ? members : []).map((member, index) => `${index + 1}. ${value(member?.name ?? member?.Name)} (${value(member?.nip ?? member?.NIP)})`).join('\n') || '1. -';
  const vehicleLabel = VEHICLE_LABELS[String(vehicle || '').trim().toUpperCase()] || vehicle;
  return `*Employee Portal BMC*\n\nDear *${value(recipientName)}*,\n\nPengajuan Tugas Luar Anda telah disetujui.\n\nYang berangkat:\n${people}\n\nTujuan: ${value(tujuan)}\nKeperluan: ${value(keperluan)}\nKendaraan yang digunakan: ${value(vehicleLabel)}\nNomor kendaraan: ${value(vehiclePlate)}\nSopir: ${value(driver)}${qrLink ? `\n\nQR untuk Security: ${qrLink}` : ''}`;
}

function needsVehicleManagerApproval(vehicleType) {
  return ['PRIVATE', 'ONLINE', 'OFFICE', 'MOTOR'].includes(String(vehicleType || '').trim().toUpperCase());
}

function mapVehicleManagerRecipients(rows) {
  return rows.map((row) => ({
    nip: String(row.NIP || '').trim(),
    name: String(row.Name || '').trim(),
    phone: String(row.Phone || '').trim(),
  })).filter((row) => row.nip && row.phone);
}

async function getVehicleManagerRecipients() {
  if (!VEHICLE_MANAGER_NIPS.length) return [];
  const conn = await getConnection();
  const request = conn.request();
  const params = VEHICLE_MANAGER_NIPS.map((nip, index) => {
    const name = `ManagerNIP${index}`;
    request.input(name, sql.VarChar, nip);
    return `@${name}`;
  });
  const result = await request.query(`
    SELECT NIP, Name, Phone
    FROM BMC.dbo.hris_Employee
    WHERE NIP IN (${params.join(', ')})
  `);
  return mapVehicleManagerRecipients(result.recordset || []);
}

function normalizePhone(phone) {
  if (!phone) return null;
  const no = String(phone).replace(/[^0-9]/g, '');
  if (!no) return null;
  if (no.startsWith('0')) return '62' + no.slice(1);
  if (no.startsWith('8')) return '62' + no;
  if (no.startsWith('62')) return no;
  return null;
}

async function sendWa({ no, text }) {
  const num = normalizePhone(no);
  if (!num || !text) return false;
  try {
    const res = await fetch(WA_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ no: num, text }),
      signal: AbortSignal.timeout(30000),
    });
    if (!res.ok) {
      console.error('[WA] status:', res.status);
      return false;
    }
    return true;
  } catch (e) {
    console.error('[WA] error:', e.message);
    return false;
  }
}

async function sendWaToNIP(NIP, text) {
  try {
    const conn = await getConnection();
    const result = await conn
      .request()
      .input('NIP', sql.VarChar, NIP)
      .query(`SELECT Name, Phone FROM BMC.dbo.hris_Employee WHERE NIP = @NIP`);
    const emp = result.recordset[0];
    if (!emp || !emp.Phone) return;
    const name = String(emp.Name || NIP).trim();
    await sendWa({ no: emp.Phone, text: text.replace('{Name}', `*${name}*`) });
  } catch (e) {
    console.error('[WA] sendWaToNIP error:', e.message);
  }
}

async function sendTravelWaToNIP(NIP, text) {
  try {
    const conn = await getConnection();
    const result = await conn
      .request()
      .input('NIP', sql.VarChar, NIP)
      .query(`SELECT Name, Phone FROM BMC.dbo.hris_Employee WHERE NIP = @NIP`);
    const emp = result.recordset[0];
    if (!emp || !emp.Phone) return false;
    const name = String(emp.Name || NIP).trim();
    return sendWa({ no: travelRecipient(NIP, emp.Phone), text: text.replace('*{Name}*', `*${name}*`).replace('{Name}', `*${name}*`) });
  } catch (e) {
    console.error('[WA] sendTravelWaToNIP error:', e.message);
    return false;
  }
}

module.exports = { sendWa, sendWaToNIP, sendTravelWaToNIP, formatTravelApprovalMessage, formatTravelApprovedMessage, travelRecipient, needsVehicleManagerApproval, mapVehicleManagerRecipients, getVehicleManagerRecipients, VEHICLE_MANAGER_NIPS, EMPLOYEE_PORTAL_URL, SECURITY_QR_BASE_URL };
