import { useEffect, useMemo, useState } from 'react'
import { buildCutiPayload, formatDate, validateCutiForm } from '../hr'
import { api } from '../services/api'
import { DatePicker } from './TugasLuarPage'

const pad = (value) => String(value).padStart(2, '0')
const dateKey = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
const emptyForm = () => ({ leaveType: 1, dates: [], remark: '', approvers: [] })
const monthTitle = (date) => date.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })

function ApproverPicker({ value, options, loading, onChange, error }) {
  const [open, setOpen] = useState(false)
  const selected = options.filter((item) => value.includes(String(item.nip).trim()))
  return <div className="custom-picker"><button className={error ? 'picker-trigger has-error' : 'picker-trigger'} type="button" disabled={loading} onClick={() => setOpen((current) => !current)} aria-expanded={open}><span>{loading ? 'Memuat atasan…' : selected.length ? selected.map((item) => item.name).join(', ') : 'Pilih atasan'}</span><span>⌄</span></button>{open && <div className="picker-popover approver-popover" role="listbox">{options.map((item) => { const nip = String(item.nip).trim(); const checked = value.includes(nip); return <button className={checked ? 'approver-option selected' : 'approver-option'} type="button" role="option" aria-selected={checked} key={nip} onClick={() => { onChange(checked ? value.filter((entry) => entry !== nip) : [...value, nip]); setOpen(false) }}><strong>{item.name}</strong><small>{item.nip}</small></button> })}</div>}</div>
}

export default function CutiPage({ token, rows }) {
  const [form, setForm] = useState(emptyForm)
  const [month, setMonth] = useState(() => new Date())
  const [saldo, setSaldo] = useState(null)
  const [atasan, setAtasan] = useState([])
  const [errors, setErrors] = useState({})
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    Promise.allSettled([api('/cuti/atasan', token), api('/cuti/saldo?leaveType=1', token)])
      .then(([supervisors, balance]) => {
        if (supervisors.status === 'fulfilled') setAtasan(supervisors.value?.data || [])
        if (balance.status === 'fulfilled') setSaldo(Number.isFinite(Number(balance.value?.Saldo)) ? Number(balance.value.Saldo) : null)
        const failure = [supervisors, balance].find((result) => result.status === 'rejected')
        if (failure?.status === 'rejected') setErrors({ form: failure.reason?.message || 'Data cuti tidak dapat dimuat.' })
      })
      .finally(() => setLoading(false))
  }, [token])

  const days = useMemo(() => {
    const year = month.getFullYear()
    const monthNumber = month.getMonth()
    const firstDay = (new Date(year, monthNumber, 1).getDay() + 6) % 7
    const total = new Date(year, monthNumber + 1, 0).getDate()
    return { firstDay, dates: Array.from({ length: total }, (_, index) => new Date(year, monthNumber, index + 1)) }
  }, [month])
  const update = (name, value) => { setForm((current) => ({ ...current, [name]: value })); setErrors((current) => ({ ...current, [name]: '', form: '' })); setMessage('') }
  const minDate = new Date()
  minDate.setDate(minDate.getDate() + 7)
  const minDateKey = dateKey(minDate)
  const toggleDate = (date) => {
    const key = dateKey(date)
    const selected = form.dates.includes(key)
    if (selected) {
      setForm((current) => ({ ...current, dates: current.dates.filter((item) => item !== key) }))
      setErrors((current) => ({ ...current, dates: '', form: '' }))
      setMessage('')
      return
    }
    if (date.getDay() === 0 || key < minDateKey) return
    const dates = [...form.dates, key].sort()
    if (saldo != null && dates.length > saldo) {
      setErrors((current) => ({ ...current, dates: `Sisa cuti hanya ${saldo} hari` }))
      return
    }
    setForm((current) => ({ ...current, dates }))
    setErrors((current) => ({ ...current, dates: '', form: '' }))
    setMessage('')
  }
  const submit = async (event) => {
    event.preventDefault()
    const validation = validateCutiForm(form, saldo)
    if (Object.keys(validation).length) { setErrors(validation); return }
    setSubmitting(true); setErrors({}); setMessage('')
    try { const result = await api('/cuti/submit', token, { method: 'POST', body: JSON.stringify(buildCutiPayload(form)) }); setForm(emptyForm()); setMessage(`Pengajuan berhasil dikirim dengan ID ${result?.id || 'tidak tersedia'}.`) }
    catch (error) { setErrors({ form: error.message || 'Pengajuan gagal dikirim.' }) }
    finally { setSubmitting(false) }
  }
  return <section className="request-page" aria-labelledby="cuti-title"><div className="request-page-heading"><p className="panel-kicker">Pengajuan</p><h1 id="cuti-title">Cuti</h1><p>Pilih tanggal cuti, isi keterangan, lalu kirim kepada atasan.</p></div><form className="request-form dashboard-panel" onSubmit={submit} noValidate>{errors.form && <div className="dashboard-alert" role="alert">{errors.form}</div>}{message && <div className="request-success" role="status">{message}</div>}<div className="request-form-grid"><div className="leave-balance-card request-field-full"><span className="panel-kicker">Saldo cuti</span><strong>{saldo == null ? '—' : `${saldo} hari`}</strong><small>{saldo == null ? 'Saldo belum tersedia' : 'Sisa cuti tahunan Anda'}</small></div><label className="request-field request-field-full">Jenis cuti<div className="picker-trigger"><span>Cuti tahunan</span></div></label><div className="request-field request-field-full"><span>Pilih tanggal <small className="requirement-days">{form.dates.length} hari dipilih{saldo != null ? ` · Sisa saldo: ${Math.max(0, saldo - form.dates.length)} hari` : ''}</small></span><div className="dashboard-panel leave-calendar"><div className="picker-header"><button type="button" onClick={() => setMonth((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))} aria-label="Bulan sebelumnya">‹</button><strong>{monthTitle(month)}</strong><button type="button" onClick={() => setMonth((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))} aria-label="Bulan berikutnya">›</button></div><div className="picker-weekdays">{['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'].map((day) => <span key={day}>{day}</span>)}</div><div className="picker-days">{Array.from({ length: days.firstDay }).map((_, index) => <span key={`empty-${index}`} />)}{days.dates.map((date) => { const key = dateKey(date); const selected = form.dates.includes(key); const disabled = !selected && (date.getDay() === 0 || key < minDateKey); return <button className={selected ? 'picker-day selected' : 'picker-day'} type="button" disabled={disabled} key={key} onClick={() => toggleDate(date)}>{date.getDate()}</button> })}</div></div>{errors.dates && <small>{errors.dates}</small>}</div><label className="request-field request-field-full">Keterangan<textarea value={form.remark} onChange={(event) => update('remark', event.target.value)} rows="4" placeholder="Jelaskan keterangan cuti" />{errors.remark && <small>{errors.remark}</small>}</label><label className="request-field request-field-full">Atasan<ApproverPicker value={form.approvers} options={atasan} loading={loading} onChange={(value) => update('approvers', value)} error={errors.approvers} />{errors.approvers && <small>{errors.approvers}</small>}</label></div><button className="new-request-button request-submit" type="submit" disabled={submitting || loading}>{submitting ? 'Mengirim…' : 'Kirim pengajuan'}</button></form><section className="dashboard-panel request-history"><div className="panel-heading"><div><p className="panel-kicker">Riwayat</p><h2>Pengajuan cuti</h2></div><span>{rows.length} data</span></div>{rows.length === 0 ? <div className="empty-state">Belum ada pengajuan cuti.</div> : <div className="request-list">{rows.map((row) => <article className="request-row" key={row.id}><div><strong>{row.jenis || 'Cuti'}</strong><small>{row.id}</small></div><div><strong>{row.alasan || 'Keterangan tidak dicantumkan'}</strong><small>{row.periode || formatDate(row.date)}</small></div><span className="status-badge pending">{row.status || 'Menunggu'}</span></article>)}</div>}</section></section>
}
