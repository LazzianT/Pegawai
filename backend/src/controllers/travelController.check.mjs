import assert from 'node:assert/strict'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { toTime, travelScanFields, canReturnTravel, validateTravelSubmitVehicle, validateTravelSubmitDateTime } = require('./travelController.js')

assert.equal(validateTravelSubmitVehicle('OFFICE'), null)
assert.equal(validateTravelSubmitVehicle('MOTOR'), null)
assert.equal(validateTravelSubmitVehicle('UNKNOWN'), 'Jenis kendaraan wajib dipilih')
assert.equal(canReturnTravel('SECURITY', '0377'), true)
assert.equal(canReturnTravel('0377', '0377'), false)
assert.deepEqual(travelScanFields({ QrTokenRemark: JSON.stringify({ departureAt: '2026-11-03T07:30:00.000Z' }) }), {
  departureAt: '2026-11-03T07:30:00.000Z',
  tanggalKembali: null,
  jamKembali: null,
})

assert.equal(toTime('15:26:00'), '15:26:00')
assert.equal(toTime('24:00:00'), null)
assert.equal(validateTravelSubmitVehicle('PRIVATE'), null)
assert.equal(validateTravelSubmitDateTime('2026-11-08', '08:30'), null)
assert.equal(validateTravelSubmitDateTime('invalid', '08:30'), 'Tanggal keluar harus berformat YYYY-MM-DD')
assert.equal(validateTravelSubmitDateTime('2026-11-08', '25:00'), 'Jam keluar harus berformat HH:MM')
const routeSource = require('fs').readFileSync(new URL('../routes/travelRoutes.js', import.meta.url), 'utf8')
const controllerSource = require('fs').readFileSync(new URL('./travelController.js', import.meta.url), 'utf8')
assert.match(routeSource, /groups\/qr\/:code\/:token/)
assert.match(routeSource, /\/employees/)
assert.match(routeSource, /groups\/:code\/members\/direct/)
assert.match(controllerSource, /searchTravelGroupEmployeesHandler/)
assert.match(controllerSource, /getGroupApprovalQueue/)
assert.match(controllerSource, /const groupMatch = travelId\.match/)
assert.match(controllerSource, /approveGroup\(/)
assert.match(controllerSource, /const groupRows = await getGroupApprovalQueue\(String\(req\.user\.id\)\.trim\(\)\)/)
assert.match(controllerSource, /const approvalId = String\(id \|\| ''\)\.trim\(\)/)
assert.match(controllerSource, /const approvalGroupMatch = approvalId\.match/)
console.log('travel controller time self-check passed')
