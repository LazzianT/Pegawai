import assert from 'node:assert/strict'

process.env.WA_TRAVEL_TEST_NIP = '0377'
process.env.WA_TRAVEL_TEST_PHONE = '081200000001'
process.env.WA_TRAVEL_QA_PHONE = '081200000002'
const { travelRecipient, sendTravelWaToNIP, formatTravelApprovalMessage, needsVehicleManagerApproval, mapVehicleManagerRecipients } = await import('./waService.js')

assert.equal(needsVehicleManagerApproval('ONLINE'), true)
assert.equal(needsVehicleManagerApproval('OFFICE'), true)
assert.equal(needsVehicleManagerApproval('PRIVATE'), true)
assert.equal(travelRecipient('0377', '089999999999'), '081200000002')
assert.equal(travelRecipient('0388', '089999999999'), '081200000002')
assert.equal(typeof sendTravelWaToNIP, 'function')
assert.deepEqual(mapVehicleManagerRecipients([
  { NIP: ' 1001 ', Name: ' Budi ', Phone: ' 0812 ' },
  { NIP: '1002', Name: 'Sari', Phone: '' },
]), [{ nip: '1001', name: 'Budi', phone: '0812' }])
console.log('Travel WhatsApp routing self-check passed')

const message = formatTravelApprovalMessage({
  approverName: 'Nama Atasan',
  members: [{ name: 'Nama Karyawan', nip: '0377' }],
  tujuan: 'Kantor pusat',
  keperluan: 'Rapat',
  vehicle: 'MOTOR',
  driver: 'Budi Supir',
  approvalLink: 'https://portal.test/approval',
})
assert.match(message, /\*Employee Portal BMC\*/)
assert.match(message, /Dear \*Nama Atasan\*/)
assert.match(message, /Yang berangkat:/)
assert.match(message, /Nama Karyawan \(0377\)/)
assert.match(message, /Tujuan: Kantor pusat/)
assert.match(message, /Keperluan: Rapat/)
assert.match(message, /Kendaraan yang digunakan: MOTOR/)
assert.match(message, /Sopir: Budi Supir/)
assert.match(message, /https:\/\/portal\.test\/approval/)

const groupMessage = formatTravelApprovalMessage({
  approverName: '',
  members: [{ Name: 'A', NIP: '1' }, { Name: 'B', NIP: '2' }],
  tujuan: '',
  keperluan: '',
  vehicle: '',
  driver: '',
  approvalLink: '',
})
assert.match(groupMessage, /1\. A \(1\)/)
assert.match(groupMessage, /2\. B \(2\)/)
assert.match(groupMessage, /Tujuan: -/)
assert.match(groupMessage, /Keperluan: -/)
assert.match(groupMessage, /Kendaraan yang digunakan: -/)
assert.match(groupMessage, /Sopir: -/)
assert.doesNotMatch(groupMessage, /Mohon lakukan persetujuan melalui link/)
