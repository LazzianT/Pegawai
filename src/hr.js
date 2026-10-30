export function validateLogin(identifier, password) {
  const errors = {}
  if (!identifier.trim()) errors.identifier = 'NIP wajib diisi'
  if (!password) errors.password = 'Password wajib diisi'
  return errors
}

export function friendlyLoginError(error) {
  if (error?.name === 'AbortError') return 'Waktu permintaan habis. Coba lagi.'
  if (error?.status === 401) return 'NIP atau password salah'
  if (error instanceof TypeError) return 'Server tidak dapat dihubungi. Periksa koneksi Anda.'
  return error?.message || 'Login gagal. Coba lagi.'
}

export function statusLabel(status) {
  const value = String(status || '').toLowerCase()
  if (value === 'approved' || value === 'disetujui') return 'Disetujui'
  if (value === 'rejected' || value === 'ditolak') return 'Ditolak'
  return 'Menunggu'
}

export function statusClass(status) {
  const value = String(status || '').toLowerCase()
  if (value === 'approved' || value === 'disetujui') return 'approved'
  if (value === 'rejected' || value === 'ditolak') return 'rejected'
  return 'pending'
}

export function formatPersonName(value) {
  return String(value || '').trim().toLocaleLowerCase('id-ID').replace(/\b\p{L}/gu, (letter) => letter.toLocaleUpperCase('id-ID'))
}

export function greeting(hour = new Date().getHours()) {
  if (hour >= 5 && hour < 11) return 'pagi'
  if (hour >= 11 && hour < 18) return 'siang'
  return 'malam'
}

export function formatDate(value) {
  if (!value) return 'Tanggal belum tersedia'
  const date = new Date(`${String(value).slice(0, 10)}T00:00:00`)
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function formatDateInput(value) {
  const digits = String(value || '').replace(/\D/g, '').slice(0, 8)
  if (digits.length > 6) return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6)}`
  if (digits.length > 4) return `${digits.slice(0, 4)}-${digits.slice(4)}`
  return digits
}

export function formatTimeInput(value) {
  const digits = String(value || '').replace(/\D/g, '').slice(0, 4)
  return digits.length > 2 ? `${digits.slice(0, 2)}:${digits.slice(2)}` : digits
}

export function dateRange(start, end = start) {
  const first = new Date(`${String(start).slice(0, 10)}T00:00:00`)
  const last = new Date(`${String(end || start).slice(0, 10)}T00:00:00`)
  if (Number.isNaN(first.getTime()) || Number.isNaN(last.getTime()) || last < first) return []
  const dates = []
  const iso = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
  for (const date = new Date(first); date <= last && dates.length < 62; date.setDate(date.getDate() + 1)) dates.push(iso(date))
  return dates
}

export function addWorkingDays(start, days) {
  const date = new Date(`${String(start).slice(0, 10)}T00:00:00`)
  const count = Number(days)
  if (Number.isNaN(date.getTime()) || !Number.isInteger(count) || count < 0) return ''
  let added = 0
  while (added < count) {
    date.setDate(date.getDate() + 1)
    if (date.getDay() !== 0 && date.getDay() !== 6) added++
  }
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export function monthKey(value) { return String(value || '').slice(0, 7) }

const PAGE_ROUTES = { Dashboard: '/dashboard', Cuti: '/cuti', Izin: '/izin', 'Cuti Khusus': '/cuti-khusus', 'Tugas Luar': '/tugas-luar', 'Approval Kendaraan': '/approval/kendaraan', 'My Profile': '/profile' }

export function pagePath(type) { return PAGE_ROUTES[type] || PAGE_ROUTES.Dashboard }

export function pageFromPath(pathname) {
  return Object.entries(PAGE_ROUTES).find(([, path]) => path === pathname)?.[0] || 'Dashboard'
}

export function filterVehicleApprovals(rows, query, from, to) {
  const needle = String(query || '').trim().toLowerCase()
  const validRange = /^\d{4}-\d{2}-\d{2}$/.test(from) && /^\d{4}-\d{2}-\d{2}$/.test(to) && from <= to
  return rows.filter((row) => {
    const text = [row.id, row.nip, row.nama, row.tujuan, row.alasan, row.vehicleType, row.vehiclePlate].join(' ').toLowerCase()
    const date = String(row.tanggalMulai || '').slice(0, 10)
    return (!needle || text.includes(needle)) && (!validRange || (date >= from && date <= to))
  })
}

export function validateTravelForm(form) {
  const errors = {}
  const time = String(form.exitTime || '').trim()
  const vehicleType = String(form.vehicleType || '').trim().toUpperCase()
  if (!String(form.exitDate || '').trim()) errors.exitDate = 'Tanggal keluar wajib diisi'
  if (!time) errors.exitTime = 'Jam keluar wajib diisi'
  else if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) errors.exitTime = 'Jam keluar harus berformat HH:MM yang valid'
  if (!String(form.tujuan || '').trim()) errors.tujuan = 'Tujuan wajib diisi'
  if (!String(form.atasanNIP || '').trim()) errors.atasanNIP = 'Atasan wajib dipilih'
  if (!['PRIVATE', 'ONLINE', 'OFFICE'].includes(vehicleType)) errors.vehicleType = 'Jenis kendaraan wajib dipilih'
  if (['PRIVATE', 'OFFICE'].includes(vehicleType) && !String(form.vehiclePlate || '').trim()) errors.vehiclePlate = 'Nomor plat wajib diisi untuk kendaraan yang dipilih'
  return errors
}

export function buildTravelPayload(form) {
  const vehicleType = String(form.vehicleType || '').trim().toUpperCase()
  return {
    exitDate: String(form.exitDate || '').trim(),
    exitTime: String(form.exitTime || '').trim(),
    tujuan: String(form.tujuan || '').trim(),
    tugas: String(form.tugas || '').trim(),
    atasanNIP: String(form.atasanNIP || '').trim(),
    vehicleType,
    vehiclePlate: ['PRIVATE', 'OFFICE'].includes(vehicleType) ? String(form.vehiclePlate || '').trim() : '',
  }
}

export function validateCutiForm(form, saldo) {
  const errors = {}
  const dates = Array.isArray(form.dates) ? form.dates : []
  const today = new Date()
  const minDate = new Date(today)
  minDate.setDate(minDate.getDate() + 7)
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  const minDateKey = `${minDate.getFullYear()}-${String(minDate.getMonth() + 1).padStart(2, '0')}-${String(minDate.getDate()).padStart(2, '0')}`
  if (!Number.isInteger(Number(form.leaveType))) errors.leaveType = 'Jenis cuti tidak valid'
  if (!dates.length) errors.dates = 'Pilih minimal 1 tanggal cuti'
  if (dates.some((date) => date < todayKey)) errors.dates = 'Tanggal yang sudah lewat tidak dapat dipilih'
  if (dates.some((date) => date < minDateKey)) errors.dates = 'Pengajuan cuti minimal 1 minggu sebelum tanggal cuti'
  if (dates.some((date) => new Date(`${date}T00:00:00`).getDay() === 0)) errors.dates = 'Hari Minggu tidak dapat dipilih'
  if (saldo != null && dates.length > Number(saldo)) errors.dates = `Sisa cuti hanya ${saldo} hari`
  if (!String(form.remark || '').trim()) errors.remark = 'Keterangan wajib diisi'
  if (!Array.isArray(form.approvers) || form.approvers.length === 0) errors.approvers = 'Atasan wajib dipilih'
  return errors
}

export function buildCutiPayload(form) {
  return {
    leaveType: Number(form.leaveType),
    remark: String(form.remark || '').trim(),
    dates: Array.isArray(form.dates) ? [...new Set(form.dates.map((date) => String(date).trim()).filter(Boolean))].sort() : [],
    approvers: Array.isArray(form.approvers) ? form.approvers.map((value) => String(value).trim()).filter(Boolean) : [],
  }
}

export function validateIzinForm(form, special = false) {
  const errors = {}
  const start = String(form.ProposeStartDate || '').trim()
  const end = String(form.ProposeEndDate || '').trim()
  if (!start) errors.ProposeStartDate = 'Tanggal mulai wajib diisi'
  if (!end) errors.ProposeEndDate = 'Tanggal selesai wajib diisi'
  if (start && end && end < start) errors.ProposeEndDate = 'Tanggal selesai tidak boleh sebelum tanggal mulai'
  if (!String(form.keperluan || '').trim()) errors.keperluan = 'Keperluan wajib dipilih'
  if (!Array.isArray(form.approvers) || form.approvers.length === 0) errors.approvers = 'Atasan wajib dipilih'
  if (!special && form.ProposeStartTime && !/^([01]\d|2[0-3]):[0-5]\d$/.test(form.ProposeStartTime)) errors.ProposeStartTime = 'Jam mulai harus berformat HH:MM yang valid'
  if (!special && form.ProposeEndTime && !/^([01]\d|2[0-3]):[0-5]\d$/.test(form.ProposeEndTime)) errors.ProposeEndTime = 'Jam selesai harus berformat HH:MM yang valid'
  return errors
}

export function buildIzinPayload(form) {
  return {
    ProposeStartDate: String(form.ProposeStartDate || '').trim(),
    ProposeEndDate: String(form.ProposeEndDate || '').trim(),
    ProposeStartTime: String(form.ProposeStartTime || '').trim(),
    ProposeEndTime: String(form.ProposeEndTime || '').trim(),
    description: String(form.description || '').trim(),
    keperluan: String(form.keperluan || '').trim(),
    fileName: String(form.fileName || '').trim(),
    approvers: Array.isArray(form.approvers) ? form.approvers.map((value) => String(value).trim()).filter(Boolean) : [],
  }
}
