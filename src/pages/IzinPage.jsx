import { useEffect, useRef, useState } from 'react'
import { buildIzinPayload, formatDate, formatDateInput, formatTimeInput, validateIzinForm } from '../hr'
import { api } from '../services/api'
import { DatePicker, TimePicker } from './TugasLuarPage'

const pad = (value) => String(value).padStart(2, '0')
const today = () => { const date = new Date(); return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` }
const emptyForm = () => ({ ProposeStartDate: today(), ProposeEndDate: today(), ProposeStartTime: '', ProposeEndTime: '', description: '', keperluan: '', fileName: '', approvers: [] })

function OptionPicker({ value, options, loading, placeholder, onChange, multiple = false, error, menuLabel }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const selected = options.filter((item) => multiple ? value.includes(item.value) : item.value === value)
  const label = selected.length ? selected.map((item) => item.label).join(', ') : placeholder
  useEffect(() => {
    if (!open) return undefined
    const close = (event) => { if (!ref.current?.contains(event.target)) setOpen(false) }
    document.addEventListener('pointerdown', close)
    return () => document.removeEventListener('pointerdown', close)
  }, [open])
  return <div className="custom-picker" ref={ref}><button className={error ? 'picker-trigger has-error' : 'picker-trigger'} type="button" disabled={loading} onClick={() => setOpen((current) => !current)} aria-expanded={open} aria-haspopup="listbox"><span>{loading ? 'Memuat…' : label}</span><span>⌄</span></button>{open && <div className="picker-popover approver-popover" role="listbox">{menuLabel && <p className="picker-menu-label">{menuLabel}</p>}{options.length === 0 ? <p className="picker-empty">Data belum tersedia.</p> : options.map((item) => { const checked = multiple ? value.includes(item.value) : item.value === value; return <button className={checked ? 'approver-option selected' : 'approver-option'} type="button" role="option" aria-selected={checked} key={item.value} onClick={() => { onChange(multiple ? (checked ? value.filter((entry) => entry !== item.value) : [...value, item.value]) : item.value); setOpen(false) }}><strong>{item.label}</strong>{item.detail && <small>{item.detail}</small>}{item.days > 0 && <small>{item.days} hari</small>}</button> })}</div>}</div>
}

export default function IzinPage({ token, rows, special = false }) {
  const permitType = special ? 2 : 1
  const [form, setForm] = useState(emptyForm)
  const [keperluan, setKeperluan] = useState([])
  const [atasan, setAtasan] = useState([])
  const [errors, setErrors] = useState({})
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingOptions, setLoadingOptions] = useState(true)

  useEffect(() => {
    Promise.allSettled([api(`/izin/keperluan?type=${permitType}`, token), api('/cuti/atasan', token)])
      .then(([requirements, supervisors]) => {
        if (requirements.status === 'fulfilled') setKeperluan(Array.isArray(requirements.value?.data) ? requirements.value.data : [])
        if (supervisors.status === 'fulfilled') setAtasan(Array.isArray(supervisors.value?.data) ? supervisors.value.data : [])
        const failure = [requirements, supervisors].find((result) => result.status === 'rejected')
        if (failure?.status === 'rejected') setErrors({ form: failure.reason?.message || 'Sebagian data form tidak dapat dimuat.' })
      })
      .finally(() => setLoadingOptions(false))
  }, [token, permitType])

  const update = (name, value) => { setForm((current) => ({ ...current, [name]: value })); setErrors((current) => ({ ...current, [name]: '', form: '' })); setMessage('') }
  const submit = async (event) => {
    event.preventDefault()
    const validation = validateIzinForm(form)
    if (Object.keys(validation).length) { setErrors(validation); return }
    setLoading(true); setErrors({}); setMessage('')
    try { const result = await api('/izin/submit', token, { method: 'POST', body: JSON.stringify(buildIzinPayload(form)) }); setForm(emptyForm()); setMessage(`Pengajuan berhasil dikirim dengan ID ${result?.id || 'tidak tersedia'}.`) }
    catch (error) { setErrors({ form: error.message || 'Pengajuan gagal dikirim.' }) }
    finally { setLoading(false) }
  }
  const requirementOptions = keperluan.map((item) => ({ value: String(item.idSubGroup), label: item.subDetail || item.SubDetail || 'Sub keperluan', detail: item.docSupport || '', days: item.numDays }))
  const selectedRequirement = keperluan.find((item) => String(item.idSubGroup) === form.keperluan)
  const selectedDays = Number(selectedRequirement?.numDays || 0)

  const approverOptions = atasan.map((item) => ({ value: String(item.nip).trim(), label: item.name, detail: item.nip }))
  return <section className="request-page" aria-labelledby="izin-title"><div className="request-page-heading"><p className="panel-kicker">Pengajuan</p><h1 id="izin-title">{special ? 'Cuti Khusus' : 'Izin'}</h1><p>Isi detail {special ? 'cuti khusus' : 'izin'} untuk dikirim kepada atasan.</p></div><form className="request-form dashboard-panel" onSubmit={submit} noValidate>{errors.form && <div className="dashboard-alert" role="alert">{errors.form}</div>}{message && <div className="request-success" role="status">{message}</div>}<div className="request-form-grid"><label className="request-field request-field-full">Keperluan<OptionPicker value={form.keperluan} options={requirementOptions} loading={loadingOptions} placeholder="Pilih keperluan" menuLabel="Keperluan" onChange={(value) => update('keperluan', value)} error={errors.keperluan} />{selectedRequirement && <small className="requirement-days">Jumlah hari: {selectedDays} hari</small>}{errors.keperluan && <small>{errors.keperluan}</small>}</label><label className="request-field">Tanggal mulai<DatePicker value={form.ProposeStartDate} onChange={(value) => update('ProposeStartDate', formatDateInput(value))} error={errors.ProposeStartDate} />{errors.ProposeStartDate && <small>{errors.ProposeStartDate}</small>}</label><label className="request-field">Tanggal selesai<DatePicker value={form.ProposeEndDate} onChange={(value) => update('ProposeEndDate', formatDateInput(value))} error={errors.ProposeEndDate} />{errors.ProposeEndDate && <small>{errors.ProposeEndDate}</small>}</label><label className="request-field">Jam mulai<TimePicker value={form.ProposeStartTime} onChange={(value) => update('ProposeStartTime', formatTimeInput(value))} /></label><label className="request-field">Jam selesai<TimePicker value={form.ProposeEndTime} onChange={(value) => update('ProposeEndTime', formatTimeInput(value))} /></label><label className="request-field request-field-full">Keterangan<textarea value={form.description} onChange={(event) => update('description', event.target.value)} rows="4" placeholder="Jelaskan keperluan izin" /></label><label className="request-field request-field-full">Atasan<OptionPicker value={form.approvers} options={approverOptions} loading={loadingOptions} placeholder="Pilih atasan" multiple onChange={(value) => update('approvers', value)} error={errors.approvers} />{errors.approvers && <small>{errors.approvers}</small>}</label></div><button className="new-request-button request-submit" type="submit" disabled={loading || loadingOptions}>{loading ? 'Mengirim…' : 'Kirim pengajuan'}</button></form><section className="dashboard-panel request-history"><div className="panel-heading"><div><p className="panel-kicker">Riwayat</p><h2>Pengajuan izin</h2></div><span>{rows.length} data</span></div>{rows.length === 0 ? <div className="empty-state">Belum ada pengajuan izin.</div> : <div className="request-list">{rows.map((row) => <article className="request-row" key={row.id}><div><strong>{row.jenis || 'Izin'}</strong><small>{row.id}</small></div><div><strong>{row.alasan || 'Keterangan tidak dicantumkan'}</strong><small>{formatDate(row.tanggal)}</small></div><span className="status-badge pending">Menunggu</span></article>)}</div>}</section></section>
}
