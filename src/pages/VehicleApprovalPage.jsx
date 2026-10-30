import { useEffect, useMemo, useState } from 'react'
import { api } from '../services/api'
import { filterVehicleApprovals, formatDate } from '../hr'

function dateInput(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export default function VehicleApprovalPage({ token }) {
  const [rows, setRows] = useState([])
  const [state, setState] = useState('loading')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [processing, setProcessing] = useState('')
  const [selected, setSelected] = useState(null)
  const [vehicleType, setVehicleType] = useState('')
  const [vehiclePlate, setVehiclePlate] = useState('')
  const [query, setQuery] = useState('')
  const [from, setFrom] = useState(() => dateInput(new Date()))
  const [to, setTo] = useState(() => { const date = new Date(); date.setDate(date.getDate() + 7); return dateInput(date) })
  const [category, setCategory] = useState('all')

  const filteredRows = useMemo(() => filterVehicleApprovals(rows, query, from, to).filter((row) => category === 'all' || row.approvalStatus === category), [rows, query, from, to, category])
  const categoryCount = (value) => value === 'all' ? rows.length : rows.filter((row) => row.approvalStatus === value).length

  const load = () => {
    setError('')
    setState('loading')
    api('/travel/approval/kendaraan', token).then((data) => setRows(Array.isArray(data?.data) ? data.data : [])).catch((cause) => setError(cause.message || 'Data approval tidak dapat dimuat.')).finally(() => setState('ready'))
  }

  useEffect(load, [token])

  const approve = async (id, action) => {
    setError('')
    setMessage('')
    setProcessing(id)
    try {
      await api('/travel/approval/approve', token, { method: 'POST', body: JSON.stringify({ id, action, vehicleType, vehiclePlate }) })
      setMessage(action === 'approve' ? 'Approval kendaraan berhasil.' : 'Tugas luar ditolak.')
      if (action === 'approve') setSelected(null)
      load()
    } catch (cause) { setError(cause.message || 'Approval gagal diproses.') }
    finally { setProcessing('') }
  }

  const openApproval = (row) => {
    const type = String(row.vehicleType || '').trim().toUpperCase()
    setSelected(row)
    setVehicleType(type)
    setVehiclePlate(String(row.vehiclePlate || '').trim())
    setError('')
  }

  return <section className="request-page" aria-labelledby="vehicle-approval-title">
    <div className="request-page-heading"><div><p className="panel-kicker">Approval</p><h1 id="vehicle-approval-title">Pengelola Kendaraan</h1><p>Tugas luar yang sudah disetujui atasan menunggu pemeriksaan kendaraan.</p></div></div>
    {error && <div className="dashboard-alert" role="alert">{error}</div>}
    {message && <div className="toast success" role="status">{message}</div>}
    <section className="dashboard-panel request-history"><div className="panel-heading"><div><p className="panel-kicker">Daftar tugas luar</p><h2>Approval kendaraan</h2></div><span>{filteredRows.length} dari {rows.length} data</span></div><div className="approval-categories" role="tablist" aria-label="Kategori approval"><button className={category === 'all' ? 'category-chip active' : 'category-chip'} type="button" role="tab" aria-selected={category === 'all'} onClick={() => setCategory('all')}>Semua <span>{categoryCount('all')}</span></button><button className={category === 'waiting' ? 'category-chip active' : 'category-chip'} type="button" role="tab" aria-selected={category === 'waiting'} onClick={() => setCategory('waiting')}>Menunggu Persetujuan Anda <span>{categoryCount('waiting')}</span></button><button className={category === 'not-approved' ? 'category-chip active' : 'category-chip'} type="button" role="tab" aria-selected={category === 'not-approved'} onClick={() => setCategory('not-approved')}>Belum Disetujui Atasan <span>{categoryCount('not-approved')}</span></button><button className={category === 'approved' ? 'category-chip active' : 'category-chip'} type="button" role="tab" aria-selected={category === 'approved'} onClick={() => setCategory('approved')}>Disetujui <span>{categoryCount('approved')}</span></button></div><div className="approval-filters"><label className="request-field">Cari keyword<input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ID, pemohon, tujuan..." /></label><label className="request-field">Dari<input type="date" value={from} onChange={(event) => setFrom(event.target.value)} /></label><label className="request-field">Sampai<input type="date" value={to} onChange={(event) => setTo(event.target.value)} /></label></div>{state === 'loading' ? <div className="empty-state">Memuat data...</div> : filteredRows.length === 0 ? <div className="empty-state">Belum ada tugas luar pada filter ini.</div> : <div className="request-list">{filteredRows.map((row) => <article className="request-row" key={row.id}><div><strong>{row.tujuan || 'Tujuan belum tersedia'}</strong><small>{row.id} · {row.nama}</small></div><div><strong>{row.alasan || 'Keperluan tidak dicantumkan'}</strong><small>{formatDate(row.tanggalMulai)} · {row.vehicleType}{row.vehiclePlate ? ` · ${row.vehiclePlate}` : ''}</small></div><span className={`status-badge ${row.approvalStatus === 'approved' ? 'approved' : 'pending'}`}>{row.approvalStatus === 'approved' ? 'Disetujui' : row.approvalStatus === 'waiting' ? 'Menunggu Persetujuan Anda' : 'Belum Disetujui Atasan'}</span>{row.approvalStatus === 'waiting' && <><button className="secondary-button" type="button" disabled={Boolean(processing)} onClick={() => approve(row.id, 'reject')}>{processing === row.id ? 'Memproses…' : 'Tolak'}</button><button className="new-request-button" type="button" disabled={Boolean(processing)} onClick={() => openApproval(row)}>Setujui</button></>}</article>)}</div>}</section>
    {selected && <div className="detail-layer" role="presentation" onClick={(event) => { if (event.target === event.currentTarget) setSelected(null) }}><div className="detail-card" role="dialog" aria-modal="true" aria-labelledby="vehicle-confirm-title"><div className="panel-heading"><div><p className="panel-kicker">Konfirmasi approval</p><h2 id="vehicle-confirm-title">Surat Pengajuan Tugas Luar</h2></div><button className="detail-close" type="button" onClick={() => setSelected(null)} aria-label="Tutup konfirmasi">×</button></div><dl className="detail-list"><div><dt>ID pengajuan</dt><dd>{selected.id}</dd></div><div><dt>Pemohon</dt><dd>{selected.nama}</dd></div><div><dt>Tujuan</dt><dd>{selected.tujuan || '—'}</dd></div><div><dt>Keperluan</dt><dd>{selected.alasan || '—'}</dd></div><div><dt>Tanggal</dt><dd>{formatDate(selected.tanggalMulai)}</dd></div></dl><fieldset className="request-field vehicle-options"><legend>Kendaraan</legend><div className="vehicle-choice-list">{[['PRIVATE', 'Kendaraan Pribadi'], ['ONLINE', 'Pesan Online'], ['OFFICE', 'Kendaraan Kantor']].map(([value, label]) => <label className={vehicleType === value ? 'vehicle-choice selected' : 'vehicle-choice'} key={value}><input type="radio" name="approvalVehicleType" value={value} checked={vehicleType === value} onChange={(event) => { setVehicleType(event.target.value); if (event.target.value === 'ONLINE') setVehiclePlate('') }} /><span>{label}</span></label>)}</div></fieldset>{['PRIVATE', 'OFFICE'].includes(vehicleType) && <label className="request-field">Nomor plat<input value={vehiclePlate} onChange={(event) => setVehiclePlate(event.target.value)} placeholder="Contoh: B 1234 TUU" /></label>}<div className="form-actions"><button className="secondary-button" type="button" onClick={() => setSelected(null)}>Batal</button><button className="new-request-button" type="button" disabled={!vehicleType || Boolean(processing) || (['PRIVATE', 'OFFICE'].includes(vehicleType) && !vehiclePlate.trim())} onClick={() => approve(selected.id, 'approve')}>{processing ? 'Memproses…' : 'Konfirmasi & Setujui'}</button></div></div></div>}
  </section>
}
