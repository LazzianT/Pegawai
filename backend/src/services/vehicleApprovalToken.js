const crypto = require('crypto');

const TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function secret() {
  const value = String(process.env.VEHICLE_APPROVAL_TOKEN_SECRET || '').trim();
  if (!value) throw new Error('VEHICLE_APPROVAL_TOKEN_SECRET belum dikonfigurasi');
  return crypto.createHash('sha256').update(value).digest();
}

function createVehicleApprovalToken(travelId, nip, now = Date.now(), level = 3) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', secret(), iv);
  const payload = JSON.stringify({ travelId: String(travelId).trim(), nip: String(nip).trim(), level, expiresAt: now + TOKEN_TTL_MS });
  const encrypted = Buffer.concat([cipher.update(payload, 'utf8'), cipher.final()]);
  return [iv, cipher.getAuthTag(), encrypted].map((value) => value.toString('base64url')).join('.');
}

function verifyVehicleApprovalToken(token, now = Date.now()) {
  const raw = String(token || '');
  if (raw.length > 1000) return null;
  const parts = raw.split('.');
  if (parts.length !== 3 || parts.some((part) => !/^[A-Za-z0-9_-]+$/.test(part))) return null;
  try {
    const decipher = crypto.createDecipheriv('aes-256-gcm', secret(), Buffer.from(parts[0], 'base64url'));
    decipher.setAuthTag(Buffer.from(parts[1], 'base64url'));
    const data = JSON.parse(Buffer.concat([decipher.update(Buffer.from(parts[2], 'base64url')), decipher.final()]).toString('utf8'));
    if (!data.travelId || !data.nip || !Number.isInteger(data.expiresAt)) return null;
    if (![1, 3].includes(Number(data.level))) return null;
    return { travelId: String(data.travelId), nip: String(data.nip), level: Number(data.level), expiresAt: data.expiresAt };
  } catch {
    return null;
  }
}

module.exports = { createVehicleApprovalToken, verifyVehicleApprovalToken, TOKEN_TTL_MS };
