import assert from 'node:assert/strict'
import { addWorkingDays, buildCutiPayload, buildIzinPayload, buildTravelPayload, dateRange, formatDateInput, formatPersonName, formatTimeInput, greeting, pageFromPath, pagePath, validateCutiForm, validateIzinForm, validateLogin, validateTravelForm } from './hr.js'
import { sha1 } from './services/api.js'

assert.equal(await sha1('abc'), 'a9993e364706816aba3e25717850c26c9cd0d89d')

assert.deepEqual(validateLogin('', ''), {
  identifier: 'NIP wajib diisi',
  password: 'Password wajib diisi',
})
assert.deepEqual(validateLogin(' 0377 ', 'rahasia'), {})
assert.deepEqual(dateRange('2026-01-01', '2026-01-03'), ['2026-01-01', '2026-01-02', '2026-01-03'])
assert.equal(addWorkingDays('2026-10-30', 1), '2026-11-02')
assert.equal(addWorkingDays('2026-10-29', 2), '2026-11-02')
assert.equal(addWorkingDays('2026-10-26', 5), '2026-11-02')
assert.equal(pagePath('Cuti'), '/cuti')
assert.equal(pageFromPath('/izin'), 'Izin')
assert.equal(pageFromPath('/cuti-khusus'), 'Cuti Khusus')
assert.equal(pagePath('Perjalanan Dinas'), '/dashboard')
assert.equal(formatDateInput('20260120abc'), '2026-01-20')
assert.equal(formatPersonName('bUDI santoso'), 'Budi Santoso')
assert.equal(greeting(6), 'pagi')
assert.equal(greeting(13), 'siang')
assert.equal(greeting(19), 'malam')
assert.equal(formatTimeInput('0830abc'), '08:30')
assert.deepEqual(validateTravelForm({ exitDate: '', exitTime: '', tujuan: '', atasanNIP: '' }), { exitDate: 'Tanggal keluar wajib diisi', exitTime: 'Jam keluar wajib diisi', tujuan: 'Tujuan wajib diisi', atasanNIP: 'Atasan wajib dipilih' })
assert.equal(validateTravelForm({ exitDate: '2026-01-20', exitTime: '25:80', tujuan: 'Kantor', atasanNIP: '123' }).exitTime, 'Jam keluar harus berformat HH:MM yang valid')
const soon = new Date()
soon.setDate(soon.getDate() + 1)
const soonKey = `${soon.getFullYear()}-${String(soon.getMonth() + 1).padStart(2, '0')}-${String(soon.getDate()).padStart(2, '0')}`
assert.equal(validateCutiForm({ leaveType: 1, dates: [soonKey], remark: ' Cuti ', approvers: ['123'] }).dates, 'Pengajuan cuti minimal 1 minggu sebelum tanggal cuti')
assert.deepEqual(buildCutiPayload({ leaveType: 1, dates: [' 2026-01-02 ', '2026-01-01', '2026-01-01'], remark: ' Cuti ', approvers: [' 123 '] }), { leaveType: 1, remark: 'Cuti', dates: ['2026-01-01', '2026-01-02'], approvers: ['123'] })
assert.equal(validateIzinForm({ ProposeStartDate: '2026-01-20', ProposeEndDate: '2026-01-19', keperluan: '2', approvers: ['123'] }).ProposeEndDate, 'Tanggal selesai tidak boleh sebelum tanggal mulai')
assert.deepEqual(validateIzinForm({ ProposeStartDate: '2026-01-20', ProposeEndDate: '2026-01-20', ProposeStartTime: '25:00', ProposeEndTime: '25:00', keperluan: '2', approvers: ['123'] }, true), {})
assert.deepEqual(buildIzinPayload({ ProposeStartDate: '2026-01-20', ProposeEndDate: '2026-01-20', ProposeStartTime: '', ProposeEndTime: '', description: ' Izin ', keperluan: '2', fileName: '', approvers: [' 123 '] }), { ProposeStartDate: '2026-01-20', ProposeEndDate: '2026-01-20', ProposeStartTime: '', ProposeEndTime: '', description: 'Izin', keperluan: '2', fileName: '', approvers: ['123'] })
assert.equal(Number({ idSubGroup: 2, numDays: 14 }.numDays), 14)
assert.deepEqual(buildTravelPayload({ exitDate: ' 2026-01-01 ', exitTime: '08:00', tujuan: ' Kantor ', tugas: '', atasanNIP: ' 123 ' }), { exitDate: '2026-01-01', exitTime: '08:00', tujuan: 'Kantor', tugas: '', atasanNIP: '123' })
console.log('hr self-check passed')
