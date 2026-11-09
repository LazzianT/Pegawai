import assert from 'node:assert/strict'
import { durationTimestamp } from './common.mjs'
assert.equal(durationTimestamp(0), '00:00:00,000')
assert.equal(durationTimestamp(61.234), '00:01:01,234')
console.log('tutorial-video self-check passed')
