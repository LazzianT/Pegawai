import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { groupApprovalTransition, groupApproverNips, groupStatusAfterApproval, groupVehicleTransition, validateGroupMembers, autoCloseTravelGroups } from './travelGroupModel.js'

assert.deepEqual(groupApproverNips([
  { approverNIP: 'A', departID: '1' },
  { approverNIP: 'A', departID: '2' },
  { approverNIP: 'B', departID: '3' },
]), ['A', 'B'])
assert.equal(groupStatusAfterApproval({ approved: 1, required: 2, rejected: 0 }), 'PENDING')
assert.equal(groupStatusAfterApproval({ approved: 1, required: 2, rejected: 1 }), 'REVISION')
assert.equal(groupStatusAfterApproval({ approved: 2, required: 2, rejected: 0 }), 'VEHICLE_PENDING')
assert.deepEqual(groupApprovalTransition([{ statusId: 3 }, { statusId: 3 }]), { groupStatus: 'VEHICLE_PENDING', vehicleApproval: true })
assert.deepEqual(groupApprovalTransition([{ statusId: 3 }, { statusId: 4 }]), { groupStatus: 'REVISION', vehicleApproval: false })
assert.deepEqual(groupVehicleTransition('approve'), { groupStatus: 'APPROVED', qr: true })
assert.deepEqual(groupVehicleTransition('reject'), { groupStatus: 'REVISION', qr: false })
const source = readFileSync(new URL('./travelGroupModel.js', import.meta.url), 'utf8')
assert.match(source, /QrToken/)
assert.match(source, /DepartureAt/)
assert.equal(typeof autoCloseTravelGroups, 'function')
assert.match(source, /Status = 'AUTO_CLOSED'/)
assert.doesNotMatch(source, /SecurityTravelCheckpoints/)
assert.match(source, /input\('CreatedBy'/)
assert.match(source, /a\.StatusId = 1 AND g\.Status = 'PENDING'/)
assert.match(source, /a\.VersionNo = \(SELECT MAX\(VersionNo\) FROM hris_Travel_Group_Version WHERE GroupCode = a\.GroupCode\)/)
assert.match(source, /SET XACT_ABORT ON;/)
assert.match(source, /async function searchGroupEmployees/)
assert.match(source, /TOP 20/)
assert.match(source, /NIP LIKE @Query OR Name LIKE @Query/)
assert.match(source, /async function addDirectGroupMember/)
assert.match(source, /createVehicleApprovalToken\('__ATASAN_QUEUE__'/)
assert.match(source, /formatTravelApprovalMessage/)
assert.match(source, /formatTravelApprovalMessage\(\{/)
assert.match(source, /ORDER BY JobSeq DESC/)
assert.match(source, /Status = 'ACTIVE'/)
assert.match(source, /hris_Travel_Group WITH \(UPDLOCK, HOLDLOCK\).*JoinOpen = 1/s)
assert.match(source, /j\.Status FROM hris_Travel_Group_Join j WITH \(UPDLOCK, HOLDLOCK\).*g\.JoinOpen = 1/s)
assert.match(source, /Status = 'CONFIRMED'/)
assert.deepEqual(validateGroupMembers([' 0377 ', '0377', '5514']), ['0377', '5514'])
assert.throws(() => validateGroupMembers([]), /Minimal 1 anggota/)
console.log('travel group model self-check passed')
