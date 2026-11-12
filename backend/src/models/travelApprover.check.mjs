import assert from 'node:assert/strict'
import { normalizeTravelApproverNIP } from './travelApprover.js'

assert.equal(normalizeTravelApproverNIP('0363'), '0359')
assert.equal(normalizeTravelApproverNIP(' 0363 '), '0359')
assert.equal(normalizeTravelApproverNIP('0359'), '0359')
assert.equal(normalizeTravelApproverNIP(' 5743 '), '5743')
console.log('travel approver self-check passed')
