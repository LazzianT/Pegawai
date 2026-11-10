import { useEffect, useMemo, useRef, useState } from 'react'
import { buildTravelPayload, canShowTravelQr, formatDate, formatDateInput, formatTimeInput, groupStatusLabel, VEHICLE_OPTIONS, validateTravelForm, validateTravelGroupForm, vehicleLabel } from '../hr'
import { api } from '../services/api'
import QRCode from 'qrcode'

const MONTHS = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
const WEEKDAYS = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min']
const pad = (value) => String(value).padStart(2, '0')
const dateKey = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
const emptyForm = () => ({ exitDate: dateKey(new Date()), exitTime: `${pad(new Date().getHours())}:${pad(new Date().getMinutes())}`, tujuan: '', tugas: '', atasanNIP: '', vehicleType: 'PRIVATE', vehiclePlate: '', driverMode: '', driverNIP: '', driverName: '' })

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

export function DatePicker({ value, onChange, error, readOnly = false }) {
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
    <div className={error ? 'picker-trigger has-error' : 'picker-trigger'}><Icon name="calendar" /><input className="picker-input" value={value} onChange={(event) => onChange(formatDateInput(event.target.value))} placeholder="YYYY-MM-DD" inputMode="numeric" maxLength="10" aria-label="Tanggal keluar" readOnly={readOnly} />{!readOnly && <button className="picker-toggle" type="button" onClick={() => setOpen((current) => !current)} aria-expanded={open} aria-haspopup="dialog" aria-label="Buka kalender"><Icon name="chevron" size={15} /></button>}</div>
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

export default function TugasLuarPage({ token, user, rows, onSubmitted }) {
  const [form, setForm] = useState(emptyForm)
  const [atasan, setAtasan] = useState([])
  const [qr, setQr] = useState(null)
  const [errors, setErrors] = useState({})
  const [message, setMessage] = useState('')
  const [reminderId, setReminderId] = useState('')
  const [reminderMessage, setReminderMessage] = useState('')
  const [reminderError, setReminderError] = useState('')
  const [groupSuccess, setGroupSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingAtasan, setLoadingAtasan] = useState(true)
  const [travelMode, setTravelMode] = useState('mandiri')
  const [groupCode, setGroupCode] = useState('')
  const [group, setGroup] = useState(null)
  const [employeeQuery, setEmployeeQuery] = useState('')
  const [employeeResults, setEmployeeResults] = useState([])
  const [employeeLoading, setEmployeeLoading] = useState(false)
  const [employeeError, setEmployeeError] = useState('')
  const employeeSearch = useRef(null)
  const [groupMemberNIPs, setGroupMemberNIPs] = useState([])
  const [groupMemberDetails, setGroupMemberDetails] = useState([])
  const [groupDraftMembers, setGroupDraftMembers] = useState([])
  const [groupLoading, setGroupLoading] = useState(false)
  const [groupError, setGroupError] = useState('')
  const [groupDraftInitialized, setGroupDraftInitialized] = useState(false)

  useEffect(() => {
    if (qr && rows.some((row) => row.id === qr.id && !canShowTravelQr(row))) setQr(null)
  }, [rows, qr])

  useEffect(() => {
    const query = employeeQuery.trim()
    if (employeeSearch.current) employeeSearch.current.abort()
    if (query.length < 2) { setEmployeeResults([]); setEmployeeLoading(false); setEmployeeError(''); return undefined }
    const controller = new AbortController()
    employeeSearch.current = controller
    const timer = window.setTimeout(async () => {
      setEmployeeLoading(true)
      setEmployeeError('')
      try {
        const data = await api(`/travel/employees?q=${encodeURIComponent(query)}`, token, { signal: controller.signal })
        if (!controller.signal.aborted) setEmployeeResults(Array.isArray(data?.data) ? data.data : [])
      } catch (error) {
        if (!controller.signal.aborted) { setEmployeeResults([]); setEmployeeError(error.message || 'Daftar karyawan tidak dapat dimuat.') }
      } finally {
        if (!controller.signal.aborted) setEmployeeLoading(false)
      }
    }, 300)
    return () => { window.clearTimeout(timer); controller.abort() }
  }, [employeeQuery, token])

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

  const sendReminder = async (id) => {
    setReminderId(id)
    setReminderMessage('')
    setReminderError('')
    try {
      await api('/travel/reminder', token, { method: 'POST', body: JSON.stringify({ id }) })
      setReminderMessage(`Pengingat untuk ${id} berhasil dikirim.`)
    } catch (error) {
      setReminderError(error.message || 'Pengingat gagal dikirim.')
    } finally { setReminderId('') }
  }

  const showQr = async (row) => {
    try {
      const qrToken = typeof row.qrToken === 'string' ? row.qrToken.trim() : ''
      if (!/^[a-f0-9]{48}$/i.test(qrToken)) throw new Error('QR tidak valid')
      const value = JSON.stringify({ id: String(row.id).trim(), token: qrToken })
      const dataUrl = await QRCode.toDataURL(value, { errorCorrectionLevel: 'M', margin: 2, width: 280 })
      setQr({ id: row.id, tujuan: row.jenis, tanggal: row.tanggalMulai, dataUrl })
    } catch {
      setErrors({ form: 'QR tidak dapat dibuat. Coba lagi.' })
    }
  }

  const showGroupQr = async () => {
    try {
      const qrToken = String(group?.qrToken || '').trim()
      const version = Number(group?.version)
      if (!/^TL-[A-Z0-9]{6}$/.test(group?.groupCode || '') || !Number.isInteger(version) || !/^[a-f0-9]{48}$/i.test(qrToken) || group?.status !== 'APPROVED' || group?.departureAt) throw new Error('QR group tidak tersedia')
      const dataUrl = await QRCode.toDataURL(JSON.stringify({ id: `G.${group.groupCode}.${version}`, token: qrToken }), { errorCorrectionLevel: 'M', margin: 2, width: 280 })
      setQr({ id: group.groupCode, tujuan: group.tujuan, tanggal: group.exitDate, dataUrl })
    } catch {
      setGroupError('QR group tidak tersedia.')
    }
  }

  const groupRequest = async (path, options = {}) => {
    setGroupLoading(true)
    setGroupError('')
    try { return await api(path, token, options) } catch (error) { setGroupError(error.message || 'Group tidak dapat diproses.'); throw error } finally { setGroupLoading(false) }
  }

  const loadGroup = async (code) => {
    const result = await groupRequest(`/travel/groups/${encodeURIComponent(code)}`)
    setGroup(result?.data || null)
    setGroupCode(code)
  }

  const createGroup = async (submitAfterCreate = false) => {
    const validation = validateTravelGroupForm({ ...form, members: groupMemberNIPs })
    if (Object.keys(validation).length) { setErrors(validation); return }
    if (!groupMemberNIPs.length && !groupCode) { setGroupError('Minimal 1 anggota group wajib dipilih'); return }
    const code = groupCode || (await groupRequest('/travel/groups', { method: 'POST', body: JSON.stringify({ exitDate: form.exitDate, exitTime: form.exitTime, tujuan: form.tujuan, tugas: form.tugas, vehicleType: form.vehicleType, driverMode: form.driverMode, driverNIP: form.driverMode === 'SELF' ? form.driverNIP : '' }) })).groupCode
    setGroupCode(code)
    const failed = []
    for (const nip of groupMemberNIPs) {
      try { await groupRequest(`/travel/groups/${encodeURIComponent(code)}/members/direct`, { method: 'POST', body: JSON.stringify({ nip }) }) } catch { failed.push(nip) }
    }
    setGroupMemberNIPs(failed)
    await loadGroup(code)
    if (failed.length) { setGroupError(`NIP belum berhasil ditambahkan: ${failed.join(', ')}`); setMessage(`Group dibuat: ${code}. Coba tambah ulang NIP yang gagal.`); return }
    if (submitAfterCreate) { await groupRequest(`/travel/groups/${encodeURIComponent(code)}/submit`, { method: 'POST', body: JSON.stringify({ vehicleType: form.vehicleType, driverMode: form.driverMode, driverNIP: form.driverMode === 'SELF' ? form.driverNIP : '' }) }); await loadGroup(code); setGroupSuccess(code); return }
    setGroupError('')
    setMessage(`Group dibuat: ${code}`)
  }

  const selectEmployee = async (employee) => {
    const nip = String(employee?.nip || '').trim()
    if (!/^\d{1,50}$/.test(nip)) return
    if (!group) {
      setGroupMemberNIPs((current) => [...new Set([...current, nip])])
      setGroupMemberDetails((current) => [...current.filter((item) => item.nip !== nip), { nip, name: String(employee?.name || '').trim() }])
      setEmployeeQuery('')
      setEmployeeResults([])
      setEmployeeError('')
      return
    }
    if (group.status === 'REVISION') {
      setGroupDraftMembers((current) => [...new Set([...current, nip])])
      setEmployeeQuery('')
      setEmployeeResults([])
      setEmployeeError('')
      return
    }
    try {
      await groupRequest(`/travel/groups/${encodeURIComponent(groupCode)}/members/direct`, { method: 'POST', body: JSON.stringify({ nip }) })
      setEmployeeQuery('')
      setEmployeeResults([])
      await loadGroup(groupCode)
    } catch {}
  }

  const submitGroup = async () => {
    const validation = validateTravelGroupForm({ ...form, members: group?.members?.map((member) => member.nip) || groupMemberNIPs, driverNIP: form.driverMode === 'SELF' ? form.driverNIP : '' })
    if (Object.keys(validation).length) { setErrors(validation); return }
    await groupRequest(`/travel/groups/${encodeURIComponent(groupCode)}/submit`, { method: 'POST', body: JSON.stringify({ vehicleType: form.vehicleType, driverMode: form.driverMode, driverNIP: form.driverMode === 'SELF' ? form.driverNIP : '' }) })
    await loadGroup(groupCode)
    setGroupSuccess(groupCode)
  }

  const closeGroupSuccess = () => {
    setGroupSuccess('')
    onSubmitted?.()
    window.location.reload()
  }

  const removeGroupMember = async (nip) => {
    if (group?.status === 'REVISION') {
      setGroupDraftMembers((current) => current.filter((value) => value !== nip))
      return
    }
    await groupRequest(`/travel/groups/${encodeURIComponent(groupCode)}/members/${encodeURIComponent(nip)}`, { method: 'DELETE' })
    await loadGroup(groupCode)
  }

  const reviseGroup = async () => {
    const members = groupDraftMembers.map((value) => String(value).trim()).filter(Boolean)
    const validation = validateTravelGroupForm({ ...form, members })
    if (validation.members) { setGroupError(validation.members); return }
    await groupRequest(`/travel/groups/${encodeURIComponent(groupCode)}/revise`, { method: 'POST', body: JSON.stringify({ members }) })
    setGroupDraftMembers([])
    await loadGroup(groupCode)
  }

  const submit = async (event) => {
    event.preventDefault()
    if (travelMode === 'group') { if (group?.status === 'REVISION') return reviseGroup(); if (group?.status === 'DRAFT') return submitGroup(); return createGroup(true) }
    const validation = validateTravelForm(form)
    if (Object.keys(validation).length) { setErrors(validation); return }
    setLoading(true)
    setErrors({})
    setMessage('')
    try {
      const result = await api('/travel/submit', token, { method: 'POST', body: JSON.stringify(buildTravelPayload(form)) })
      setForm(emptyForm())
      setMessage(`Pengajuan berhasil dikirim dengan ID ${result?.id || 'tidak tersedia'}.`)
      window.setTimeout(() => setMessage(''), 4500)
    } catch (error) {
      setErrors({ form: error.message || 'Pengajuan gagal dikirim.' })
    } finally { setLoading(false) }
  }

  return <section className="request-page" aria-labelledby="travel-title">
    <div className="request-page-heading"><div><p className="panel-kicker">Pengajuan</p><h1 id="travel-title">Tugas Luar</h1><p>Isi detail tugas luar untuk dikirim kepada atasan.</p></div></div>
    <form className="request-form dashboard-panel" onSubmit={submit} noValidate>
      {errors.form && <div className="dashboard-alert" role="alert">{errors.form}</div>}
      {message && <div className="toast success" role="status">{message}</div>}
      <fieldset className="request-field request-field-full travel-mode"><legend>Jenis Tugas Luar</legend><div className="travel-mode-options"><label className={travelMode === 'mandiri' ? 'travel-mode-choice selected' : 'travel-mode-choice'}><input type="radio" name="travelMode" value="mandiri" checked={travelMode === 'mandiri'} onChange={() => { setTravelMode('mandiri'); setGroup(null); setGroupCode('') }} /><span>Mandiri</span></label><label className={travelMode === 'group' ? 'travel-mode-choice selected' : 'travel-mode-choice'}><input type="radio" name="travelMode" value="group" checked={travelMode === 'group'} onChange={() => setTravelMode('group')} /><span>Group</span></label></div></fieldset>
       {travelMode === 'group' && <div className="group-panel request-field-full"><div className="group-member-draft"><label className="request-field">Cari anggota berdasarkan nama atau NIP<input value={employeeQuery} onChange={(event) => setEmployeeQuery(event.target.value)} placeholder="Ketik minimal 2 karakter" aria-expanded={employeeQuery.trim().length >= 2} aria-controls="employee-results" autoComplete="off" /></label>{employeeQuery.trim().length >= 2 && <div className="employee-results" id="employee-results" role="listbox">{employeeLoading ? <p className="picker-empty">Mencari karyawan…</p> : employeeError ? <p className="picker-empty">{employeeError}</p> : employeeResults.length ? employeeResults.map((employee) => <button className="employee-result" type="button" role="option" key={employee.nip} onClick={() => selectEmployee(employee)}><strong>{employee.name}</strong><small>{employee.nip}</small></button>) : <p className="picker-empty">Karyawan tidak ditemukan.</p>}</div>}{groupMemberDetails.length > 0 && <div className="group-member-draft-list">{groupMemberDetails.map((member) => <span className="group-member-draft-item" key={member.nip}><strong>{member.name || 'Nama tidak tersedia'}</strong><small>{member.nip}</small><button type="button" aria-label={`Hapus NIP ${member.nip}`} onClick={() => { setGroupMemberNIPs((current) => current.filter((value) => value !== member.nip)); setGroupMemberDetails((current) => current.filter((value) => value.nip !== member.nip)) }}>×</button></span>)}</div>}</div>{groupError && <small>{groupError}</small>}{group && <div className="group-detail"><strong>Group {group.groupCode}</strong><span>Status: {groupStatusLabel(group.status)}</span>{group.status === 'REVISION' ? groupDraftMembers.map((nip) => <div className="group-member" key={nip}><span>Anggota pilihan</span><small>{nip}</small><button className="secondary-button" type="button" disabled={groupLoading} onClick={() => removeGroupMember(nip)}>Hapus</button></div>) : group.members.map((member) => <div className="group-member" key={member.nip}><span>{member.name || member.nip}</span><small>{member.nip}</small><button className="secondary-button" type="button" disabled={groupLoading || group.status !== 'REVISION'} onClick={() => removeGroupMember(member.nip)}>Hapus</button></div>)}<label className="request-field">Cari anggota berdasarkan nama atau NIP<input value={employeeQuery} onChange={(event) => setEmployeeQuery(event.target.value)} placeholder="Ketik minimal 2 karakter" aria-expanded={employeeQuery.trim().length >= 2} aria-controls="employee-results-active" autoComplete="off" /></label>{employeeQuery.trim().length >= 2 && <div className="employee-results" id="employee-results-active" role="listbox">{employeeLoading ? <p className="picker-empty">Mencari karyawan…</p> : employeeError ? <p className="picker-empty">{employeeError}</p> : employeeResults.length ? employeeResults.map((employee) => <button className="employee-result" type="button" role="option" key={employee.nip} onClick={() => selectEmployee(employee)}><strong>{employee.name}</strong><small>{employee.nip}</small></button>) : <p className="picker-empty">Karyawan tidak ditemukan.</p>}</div>}{group.status === 'APPROVED' && !group.departureAt && <button className="secondary-button" type="button" disabled={groupLoading} onClick={showGroupQr}>Tampilkan QR Group</button>}</div>}</div>}
      <div className="request-form-grid">
        <label className="request-field">Tanggal keluar<DatePicker value={form.exitDate} onChange={(value) => update('exitDate', value)} error={errors.exitDate} readOnly />{errors.exitDate && <small>{errors.exitDate}</small>}</label>
        <label className="request-field">Jam keluar<TimePicker value={form.exitTime} onChange={(value) => update('exitTime', value)} error={errors.exitTime} />{errors.exitTime && <small>{errors.exitTime}</small>}</label>
        <label className="request-field request-field-full">Tujuan<input name="tujuan" value={form.tujuan} onChange={(event) => update('tujuan', event.target.value)} placeholder="Contoh: Kunjungan kantor cabang" aria-invalid={Boolean(errors.tujuan)} />{errors.tujuan && <small>{errors.tujuan}</small>}</label>
        <label className="request-field request-field-full">Tugas / keperluan<textarea name="tugas" value={form.tugas} onChange={(event) => update('tugas', event.target.value)} rows="4" placeholder="Jelaskan tugas yang dilakukan" /></label>
        <fieldset className="request-field request-field-full vehicle-options"><legend>Kendaraan</legend><div className="vehicle-choice-list">{VEHICLE_OPTIONS.map(([value, label]) => <label className={form.vehicleType === value ? 'vehicle-choice selected' : 'vehicle-choice'} key={value}><input type="radio" name="vehicleType" value={value} checked={form.vehicleType === value} onChange={(event) => { const value = event.target.value; update('vehicleType', value); if (value === 'PRIVATE' || value === 'ONLINE') { update('driverMode', ''); update('driverNIP', '') } }} /><span>{label}</span></label>)}</div>{errors.vehicleType && <small>{errors.vehicleType}</small>}</fieldset>
         {['OFFICE', 'MOTOR'].includes(form.vehicleType) && <fieldset className="request-field request-field-full vehicle-options"><legend>Cara berkendara</legend><div className="vehicle-choice-list"><label className={form.driverMode === 'DRIVER' ? 'vehicle-choice selected' : 'vehicle-choice'}><input type="radio" name="driverMode" value="DRIVER" checked={form.driverMode === 'DRIVER'} onChange={() => update('driverMode', 'DRIVER')} /><span>Pakai Supir</span></label><label className={form.driverMode === 'SELF' ? 'vehicle-choice selected' : 'vehicle-choice'}><input type="radio" name="driverMode" value="SELF" checked={form.driverMode === 'SELF'} onChange={() => update('driverMode', 'SELF')} /><span>Mengendarai Sendiri</span></label></div>{errors.driverMode && <small>{errors.driverMode}</small>}{form.driverMode === 'SELF' && travelMode === 'group' && <label className="request-field">Yang mengendarai<select value={form.driverNIP} onChange={(event) => update('driverNIP', event.target.value)}><option value="">Pilih anggota yang berangkat</option>{[{ nip: String(user?.id || '').trim(), name: user?.name || 'Saya' }, ...(group?.members || groupMemberDetails)].filter((member, index, members) => member.nip && members.findIndex((item) => item.nip === member.nip) === index).map((member) => <option value={member.nip} key={member.nip}>{member.name || member.nip} - {member.nip}</option>)}</select></label>}{form.driverMode === 'SELF' && travelMode === 'mandiri' && <small>{user?.name || 'Pemohon'} mengendarai sendiri.</small>}{errors.driverNIP && <small>{errors.driverNIP}</small>}</fieldset>}
        <label className="request-field request-field-full">Atasan<ApproverPicker value={form.atasanNIP} options={atasan} loading={loadingAtasan} onChange={(value) => update('atasanNIP', value)} error={errors.atasanNIP} />{errors.atasanNIP && <small>{errors.atasanNIP}</small>}</label>
      </div>
      <button className="new-request-button request-submit" type="submit" disabled={loading || loadingAtasan || groupLoading || (travelMode === 'group' && groupCode && !group)}>{loading || groupLoading ? 'Mengirim…' : travelMode === 'group' ? (group?.status === 'REVISION' ? 'Kirim revisi group' : 'Kirim pengajuan group') : 'Kirim pengajuan'}</button>
    </form>
    {groupSuccess && <div className="detail-layer" role="presentation" onClick={(event) => { if (event.target === event.currentTarget) closeGroupSuccess() }}><div className="detail-card group-success-card" role="dialog" aria-modal="true" aria-labelledby="group-success-title"><div className="panel-heading"><div><p className="panel-kicker">Pengajuan group</p><h2 id="group-success-title">Berhasil dikirim</h2></div><button className="detail-close" type="button" onClick={closeGroupSuccess} aria-label="Tutup pesan sukses">×</button></div><p>Pengajuan group <strong>{groupSuccess}</strong> sudah dikirim dan menunggu persetujuan atasan.</p><button className="new-request-button" type="button" onClick={closeGroupSuccess}>Tutup</button></div></div>}
    <section className="dashboard-panel request-history"><div className="panel-heading"><div><p className="panel-kicker">Riwayat</p><h2>Pengajuan tugas luar</h2></div><span>{rows.length} data</span></div>{reminderMessage && <div className="toast success" role="status">{reminderMessage}</div>}{reminderError && <div className="dashboard-alert" role="alert">{reminderError}</div>}{rows.length === 0 ? <div className="empty-state">Belum ada pengajuan tugas luar.</div> : <div className="request-list">{rows.map((row) => <article className="request-row" key={row.id}><div><strong>{row.jenis || 'Tujuan belum tersedia'}</strong><small>{row.id}</small></div><div><strong>{row.alasan || 'Tugas tidak dicantumkan'}</strong><small>{formatDate(row.tanggalMulai)}{row.tanggalSelesai ? ` - ${formatDate(row.tanggalSelesai)}` : ''}{row.vehicleType ? ` · ${vehicleLabel(row.vehicleType)}${row.vehiclePlate ? ` (${row.vehiclePlate})` : ''}` : ''}</small></div><span className={`status-badge ${row.status === 'approved' ? 'approved' : row.status === 'rejected' ? 'rejected' : 'pending'}`}>{row.status === 'approved' ? 'Disetujui' : row.status === 'rejected' ? 'Ditolak' : 'Menunggu'}</span>{row.status === 'pending' && (Number(row.currentLevel) === 1 || String(row.id).startsWith('G.')) && <button type="button" className="secondary-button" disabled={reminderId === row.id} onClick={() => sendReminder(row.id)}>{reminderId === row.id ? 'Mengirim…' : 'Kirim pengingat'}</button>}{row.status === 'approved' && (Number(row.currentLevel) >= 3 || String(row.id).startsWith('G.')) && canShowTravelQr(row) && <button type="button" className="secondary-button" onClick={() => showQr(row)}>Tampilkan QR</button>}</article>)}</div>}{qr && <div className="detail-layer" role="presentation" onClick={(event) => { if (event.target === event.currentTarget) setQr(null) }}><div className="detail-card qr-card" role="dialog" aria-modal="true" aria-labelledby="travel-qr-title"><div className="panel-heading"><div><p className="panel-kicker">Akses Security</p><h2 id="travel-qr-title">QR Tugas Luar</h2></div><button className="detail-close" type="button" onClick={() => setQr(null)} aria-label="Tutup QR">×</button></div><img className="travel-qr" src={qr.dataUrl} alt={`QR tugas luar ${qr.id}`} /><strong>{qr.tujuan || 'Tugas luar'}</strong><small>{qr.id} · {formatDate(qr.tanggal)}</small><p>Pindai QR ini di Security saat berangkat.</p></div></div>}</section>
  </section>
}