import { useEffect, useMemo, useRef, useState } from 'react'
import { buildTravelPayload, formatDate, formatDateInput, formatTimeInput, validateTravelForm } from '../hr'
import { api } from '../services/api'

const MONTHS = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
const WEEKDAYS = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min']
const pad = (value) => String(value).padStart(2, '0')
const dateKey = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
const emptyForm = () => ({ exitDate: dateKey(new Date()), exitTime: `${pad(new Date().getHours())}:${pad(new Date().getMinutes())}`, tujuan: '', tugas: '', atasanNIP: '', vehicleType: 'PRIVATE', vehiclePlate: '' })

function Icon({ name, size = 17 }) {
  const paths = {
    calendar: <><rect x="3" y="4.5" width="18" height="16" rx="2" /><path d="M7 2.5v4M17 2.5v4M3 9.5h18" /></>,
    clock: <><circle cx="12" cy="12" r="8.5" /><path d="M12 7v5l3.5 2" /></>,
    chevron: <path d="m8 10 4 4 4-4" />,
    left: <path d="m15 18-6-6 6-6" />,
    right: <path d="m9 18 6-6-6-6" />,
  }
  return <svg className="ui-icon" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>
}

export function DatePicker({ value, onChange, error, disabled = false }) {
  const parsed = /^\d{4}-\d{2}-\d{2}$/.test(value || '') ? new Date(`${value}T00:00:00`) : new Date()
  const initial = Number.isNaN(parsed.getTime()) ? new Date() : parsed
  const [open, setOpen] = useState(false)
  const [month, setMonth] = useState(new Date(initial.getFullYear(), initial.getMonth(), 1))
  const ref = useRef(null)
  const days = useMemo(() => {
    const firstDay = (month.getDay() + 6) % 7
    const total = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()
    return [...Array(firstDay).fill(null), ...Array.from({ length: total }, (_, index) => new Date(month.getFullYear(), month.getMonth(), index + 1))]
  }, [month])

  useEffect(() => {
    if (!open) return undefined
    const close = (event) => { if (!ref.current?.contains(event.target)) setOpen(false) }
    document.addEventListener('pointerdown', close)
    return () => document.removeEventListener('pointerdown', close)
  }, [open])

  const moveMonth = (delta) => setMonth((current) => new Date(current.getFullYear(), current.getMonth() + delta, 1))
  const choose = (date) => { onChange(dateKey(date)); setOpen(false) }
  return <div className="custom-picker" ref={ref}>
    <div className={error ? 'picker-trigger has-error' : 'picker-trigger'}><Icon name="calendar" /><input className="picker-input" value={value} onChange={(event) => onChange(formatDateInput(event.target.value))} placeholder="YYYY-MM-DD" inputMode="numeric" maxLength="10" aria-label="Tanggal keluar" disabled={disabled} /><button className="picker-toggle" type="button" onClick={() => setOpen((current) => !current)} aria-expanded={open} aria-haspopup="dialog" aria-label="Buka kalender" disabled={disabled}><Icon name="chevron" size={15} /></button></div>
    {open && <div className="picker-popover date-popover" role="dialog" aria-label="Pilih tanggal keluar"><div className="picker-header"><button type="button" onClick={() => moveMonth(-1)} aria-label="Bulan sebelumnya"><Icon name="left" size={15} /></button><strong>{MONTHS[month.getMonth()]} {month.getFullYear()}</strong><button type="button" onClick={() => moveMonth(1)} aria-label="Bulan berikutnya"><Icon name="right" size={15} /></button></div><div className="picker-weekdays">{WEEKDAYS.map((day) => <span key={day}>{day}</span>)}</div><div className="picker-days">{days.map((date, index) => date ? <button className={value === dateKey(date) ? 'picker-day selected' : 'picker-day'} type="button" key={dateKey(date)} onClick={() => choose(date)}>{date.getDate()}</button> : <span key={`empty-${index}`} />)}</div></div>}
  </div>
}

export function TimePicker({ value, onChange, error }) {
  const [open, setOpen] = useState(false)
  const [hour, minute] = value ? value.split(':').map(Number) : [null, null]
  const ref = useRef(null)
  useEffect(() => {
    if (!open) return undefined
    const close = (event) => { if (!ref.current?.contains(event.target)) setOpen(false) }
    document.addEventListener('pointerdown', close)
    return () => document.removeEventListener('pointerdown', close)
  }, [open])
  const choose = (nextHour, nextMinute) => { onChange(`${pad(nextHour)}:${pad(nextMinute)}`); setOpen(false) }
  return <div className="custom-picker" ref={ref}>
    <div className={error ? 'picker-trigger has-error' : 'picker-trigger'}><Icon name="clock" /><input className="picker-input" value={value} onChange={(event) => onChange(formatTimeInput(event.target.value))} placeholder="HH:MM" inputMode="numeric" maxLength="5" aria-label="Jam keluar" /><button className="picker-toggle" type="button" onClick={() => setOpen((current) => !current)} aria-expanded={open} aria-haspopup="dialog" aria-label="Buka pilihan jam"><Icon name="chevron" size={15} /></button></div>
    {open && <div className="picker-popover time-popover" role="dialog" aria-label="Pilih jam keluar"><p>Pilih jam</p><div className="time-grid">{Array.from({ length: 24 }, (_, nextHour) => [0, 15, 30, 45].map((nextMinute) => <button className={hour === nextHour && minute === nextMinute ? 'time-option selected' : 'time-option'} type="button" key={`${nextHour}-${nextMinute}`} onClick={() => choose(nextHour, nextMinute)}>{pad(nextHour)}:{pad(nextMinute)}</button>))}</div></div>}
  </div>
}

function ApproverPicker({ value, options, loading, onChange, error }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const selected = options.find((item) => String(item.nip).trim() === value)
  useEffect(() => {
    if (!open) return undefined
    const close = (event) => { if (!ref.current?.contains(event.target)) setOpen(false) }
    document.addEventListener('pointerdown', close)
    return () => document.removeEventListener('pointerdown', close)
  }, [open])
  return <div className="custom-picker" ref={ref}>
    <button className={error ? 'picker-trigger has-error' : 'picker-trigger'} type="button" disabled={loading} onClick={() => setOpen((current) => !current)} aria-expanded={open} aria-haspopup="listbox"><span>{loading ? 'Memuat atasan…' : selected ? `${selected.name} - ${selected.nip}` : 'Pilih atasan'}</span><Icon name="chevron" size={15} /></button>
    {open && <div className="picker-popover approver-popover" role="listbox">{options.length === 0 ? <p className="picker-empty">Atasan belum tersedia.</p> : options.map((item) => <button className={String(item.nip).trim() === value ? 'approver-option selected' : 'approver-option'} type="button" role="option" aria-selected={String(item.nip).trim() === value} key={item.nip} onClick={() => { onChange(String(item.nip).trim()); setOpen(false) }}><strong>{item.name}</strong><small>{item.nip}</small></button>)}</div>}
  </div>
}

export default function TugasLuarPage({ token, rows }) {
  const [form, setForm] = useState(emptyForm)
  const [atasan, setAtasan] = useState([])
  const [errors, setErrors] = useState({})
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingAtasan, setLoadingAtasan] = useState(true)

  useEffect(() => {
    api('/travel/atasan', token)
      .then((data) => setAtasan(Array.isArray(data?.data) ? data.data : []))
      .catch((error) => setErrors({ form: error.message || 'Daftar atasan tidak dapat dimuat.' }))
      .finally(() => setLoadingAtasan(false))
  }, [token])

  const update = (name, value) => {
    setForm((current) => ({ ...current, [name]: value }))
    setErrors((current) => ({ ...current, [name]: '', form: '' }))
    setMessage('')
  }

  const submit = async (event) => {
    event.preventDefault()
    const validation = validateTravelForm(form)
    if (Object.keys(validation).length) { setErrors(validation); return }
    setLoading(true)
    setErrors({})
    setMessage('')
    try {
      const result = await api('/travel/submit', token, { method: 'POST', body: JSON.stringify(buildTravelPayload(form)) })
      setForm(emptyForm())
      setMessage(`Pengajuan berhasil dikirim dengan ID ${result?.id || 'tidak tersedia'}.`)
    } catch (error) {
      setErrors({ form: error.message || 'Pengajuan gagal dikirim.' })
    } finally { setLoading(false) }
  }

  return <section className="request-page" aria-labelledby="travel-title">
    <div className="request-page-heading"><div><p className="panel-kicker">Pengajuan</p><h1 id="travel-title">Tugas Luar</h1><p>Isi detail tugas luar untuk dikirim kepada atasan.</p></div></div>
    <form className="request-form dashboard-panel" onSubmit={submit} noValidate>
      {errors.form && <div className="dashboard-alert" role="alert">{errors.form}</div>}
      {message && <div className="request-success" role="status">{message}</div>}
      <div className="request-form-grid">
        <label className="request-field">Tanggal keluar<DatePicker value={form.exitDate} onChange={(value) => update('exitDate', value)} error={errors.exitDate} />{errors.exitDate && <small>{errors.exitDate}</small>}</label>
        <label className="request-field">Jam keluar<TimePicker value={form.exitTime} onChange={(value) => update('exitTime', value)} error={errors.exitTime} />{errors.exitTime && <small>{errors.exitTime}</small>}</label>
        <label className="request-field request-field-full">Tujuan<input name="tujuan" value={form.tujuan} onChange={(event) => update('tujuan', event.target.value)} placeholder="Contoh: Kunjungan kantor cabang" aria-invalid={Boolean(errors.tujuan)} />{errors.tujuan && <small>{errors.tujuan}</small>}</label>
        <label className="request-field request-field-full">Tugas / keperluan<textarea name="tugas" value={form.tugas} onChange={(event) => update('tugas', event.target.value)} rows="4" placeholder="Jelaskan tugas yang dilakukan" /></label>
        <fieldset className="request-field request-field-full vehicle-options"><legend>Kendaraan</legend><div className="vehicle-choice-list">{[['PRIVATE', 'Kendaraan Pribadi'], ['ONLINE', 'Pesan Online'], ['OFFICE', 'Kendaraan Kantor']].map(([value, label]) => <label className={form.vehicleType === value ? 'vehicle-choice selected' : 'vehicle-choice'} key={value}><input type="radio" name="vehicleType" value={value} checked={form.vehicleType === value} onChange={(event) => update('vehicleType', event.target.value)} /><span>{label}</span></label>)}</div>{errors.vehicleType && <small>{errors.vehicleType}</small>}</fieldset>
        {form.vehicleType === 'PRIVATE' && <label className="request-field request-field-full">Nomor plat kendaraan<input name="vehiclePlate" value={form.vehiclePlate} onChange={(event) => update('vehiclePlate', event.target.value)} placeholder="Contoh: B 1234 ABC" aria-invalid={Boolean(errors.vehiclePlate)} />{errors.vehiclePlate && <small>{errors.vehiclePlate}</small>}</label>}
        <label className="request-field request-field-full">Atasan<ApproverPicker value={form.atasanNIP} options={atasan} loading={loadingAtasan} onChange={(value) => update('atasanNIP', value)} error={errors.atasanNIP} />{errors.atasanNIP && <small>{errors.atasanNIP}</small>}</label>
      </div>
      <button className="new-request-button request-submit" type="submit" disabled={loading || loadingAtasan}>{loading ? 'Mengirim…' : 'Kirim pengajuan'}</button>
    </form>
    <section className="dashboard-panel request-history"><div className="panel-heading"><div><p className="panel-kicker">Riwayat</p><h2>Pengajuan tugas luar</h2></div><span>{rows.length} data</span></div>{rows.length === 0 ? <div className="empty-state">Belum ada pengajuan tugas luar.</div> : <div className="request-list">{rows.map((row) => <article className="request-row" key={row.id}><div><strong>{row.jenis || 'Tujuan belum tersedia'}</strong><small>{row.id}</small></div><div><strong>{row.alasan || 'Tugas tidak dicantumkan'}</strong><small>{formatDate(row.tanggalMulai)}{row.tanggalSelesai ? ` - ${formatDate(row.tanggalSelesai)}` : ''}{row.vehicleType ? ` · ${row.vehicleType === 'PRIVATE' ? `Pribadi${row.vehiclePlate ? ` (${row.vehiclePlate})` : ''}` : row.vehicleType === 'ONLINE' ? 'Pesan Online' : 'Kendaraan Kantor'}` : ''}</small></div><span className={`status-badge ${row.status === 'approved' ? 'approved' : row.status === 'rejected' ? 'rejected' : 'pending'}`}>{row.status === 'approved' ? 'Disetujui' : row.status === 'rejected' ? 'Ditolak' : 'Menunggu'}</span></article>)}</div>}</section>
  </section>
}
