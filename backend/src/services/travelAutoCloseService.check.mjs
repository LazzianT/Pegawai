import assert from 'node:assert/strict'
import { isJakartaMidnight, shouldAutoClose, startTravelAutoCloseScheduler } from './travelAutoCloseService.js'

assert.equal(isJakartaMidnight(new Date('2026-11-08T17:00:00.000Z')), true)
assert.equal(isJakartaMidnight(new Date('2026-11-08T16:59:00.000Z')), false)
assert.equal(isJakartaMidnight(new Date('2026-11-08T17:01:00.000Z')), false)
assert.equal(shouldAutoClose({ status: 'APPROVED', departureAt: '2026-11-08T08:00:00.000Z', returnedAt: null, autoClosedAt: null }), true)
assert.equal(shouldAutoClose({ status: 'APPROVED', departureAt: null, returnedAt: null, autoClosedAt: null }), false)
assert.equal(shouldAutoClose({ status: 'APPROVED', departureAt: '2026-11-08T08:00:00.000Z', returnedAt: '2026-11-08T17:00:00.000Z', autoClosedAt: null }), false)
assert.equal(shouldAutoClose({ status: 'APPROVED', departureAt: '2026-11-08T08:00:00.000Z', returnedAt: null, autoClosedAt: '2026-11-09T00:00:00.000Z' }), false)
const scheduler = startTravelAutoCloseScheduler({ intervalMs: 2147483647 })
assert.equal(typeof scheduler.stop, 'function')
scheduler.stop()
console.log('travelAutoCloseService checks passed')
