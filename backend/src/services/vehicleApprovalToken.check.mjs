import assert from 'node:assert/strict'
import { randomBytes } from 'node:crypto'

process.env.VEHICLE_APPROVAL_TOKEN_SECRET = randomBytes(32).toString('hex')
const { createVehicleApprovalToken, verifyVehicleApprovalToken, TOKEN_TTL_MS } = await import('./vehicleApprovalToken.js')
const now = 1700000000000
const token = createVehicleApprovalToken('T.1.2', '5743', now)
assert.deepEqual(verifyVehicleApprovalToken(token, now), { travelId: 'T.1.2', nip: '5743', level: 3, expiresAt: now + TOKEN_TTL_MS })
const approverToken = createVehicleApprovalToken('T.1.2', '0123', now, 1)
assert.deepEqual(verifyVehicleApprovalToken(approverToken, now), { travelId: 'T.1.2', nip: '0123', level: 1, expiresAt: now + TOKEN_TTL_MS })
const tampered = token.slice(0, -1) + (token.endsWith('A') ? 'B' : 'A')
assert.equal(verifyVehicleApprovalToken(tampered, now), null)
assert.equal(verifyVehicleApprovalToken('x'.repeat(1001), now), null)
assert.deepEqual(verifyVehicleApprovalToken(token, now + TOKEN_TTL_MS + 1), { travelId: 'T.1.2', nip: '5743', level: 3, expiresAt: now + TOKEN_TTL_MS })
console.log('Vehicle approval token self-check passed')
