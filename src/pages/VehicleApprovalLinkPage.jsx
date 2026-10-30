import { useEffect, useMemo, useState } from 'react'
import { publicApi } from '../services/api'
import { approvalStatus, filterTravelApprovals, formatDate, OPERATIONAL_PLATES, VEHICLE_OPTIONS } from '../hr'

function ApprovalCard({ item, selection, onChange, onSubmit, processing }) {
  const status = approvalStatus(item.statusId)
  const statusText = status === 'approved' ? 'Disetujui' : status === 'rejected' ? 'Ditolak' : 'Menunggu'
  const needsPlate = ['OFFICE', 'MOTOR'].includes(selection.type)
  return <article className="pending-travel-card"><div className="pending-travel-card-head"><div><span className="panel-kicker">Approval kendaraan</span><h2>{item.tujuan || 'Tujuan belum tersedia'}</h2></div><span className={`status-badge ${status}`}>{statusText}</span></div><dl className="detail-list"><div><dt>Pemohon</dt><dd>{item.nama}</dd></div><div><dt>Keperluan</dt><dd>{item.alasan || '—'}</dd></div><div><dt>Tanggal</dt><dd>{formatDate(item.tanggalMulai)}{item.tanggalSelesai ? ` - ${formatDate(item.tanggalSelesai)}` : ''}</dd></div><div><dt>ID pengajuan</dt><dd>{item.id}</dd></div>{item.processedByNIP && <div><dt>Diproses oleh</dt><dd>{item.processedByNIP}{item.processedAt ? ` · ${formatDate(item.processedAt)}` : ''}</dd></div>}</dl>{status === 'pending' && <><fieldset className="request-field vehicle-options"><legend>Kendaraan</legend><div className="vehicle-choice-list">{VEHICLE_OPTIONS.map(([value, label]) => <label className={selection.type === value ? 'vehicle-choice selected' : 'vehicle-choice'} key={value}><input type="radio" name={`vehicleType-${item.id}`} value={value} checked={selection.type === value} onChange={(event) => onChange({ type: event.target.value, plate: '' })} /><span>{label}</span></label>)}</div></fieldset>{needsPlate && <label className="request-field">Nomor plat kendaraan<select value={selection.plate} onChange={(event) => onChange({ ...selection, plate: event.target.value })}><option value="">Pilih nomor plat</option>{OPERATIONAL_PLATES[selection.type].map((value) => <option value={value} key={value}>{value}</option>)}</select></label>}<div className="form-actions"><button className="secondary-button" type="button" disabled={processing} onClick={() => onSubmit(item, 'reject')}>Tolak</button><button className="new-request-button" type="button" disabled={processing || !selection.type || (needsPlate && !selection.plate)} onClick={() => onSubmit(item, 'approve')}>{processing ? 'Memproses…' : 'Setujui pengajuan'}</button></div></>}</article>
}

export default function VehicleApprovalLinkPage({ token, queue = false }) {
  const [data, setData] = useState(null)
  const [selections, setSelections] = useState({})
  const [state, setState] = useState('loading')
  const [error, setError] = useState('')
  const [processing, setProcessing] = useState('')
  const [toast, setToast] = useState('')
  const [tab, setTab] = useState('pending')
  const path = queue ? `/travel/approval/kendaraan/queue/${encodeURIComponent(token)}` : `/travel/approval/kendaraan/${encodeURIComponent(token)}`

  const load = () => publicApi(path).then((response) => {
    setData(response.data)
    if (!Array.isArray(response.data)) setSelections((current) => ({ ...current, [response.data.id]: { type: String(response.data.vehicleType || '').trim().toUpperCase(), plate: String(response.data.vehiclePlate || '').trim() } }))
    setState('ready')
  }).catch((cause) => { setError(cause.message || 'Link approval tidak dapat dimuat.'); setState('error') })

  useEffect(() => { load() }, [path])

  const rows = useMemo(() => queue ? (Array.isArray(data) ? data : []) : data ? [data] : [], [data, queue])
  const visible = useMemo(() => filterTravelApprovals(rows, tab), [rows, tab])
  const tabCount = (value) => filterTravelApprovals(rows, value).length
  const selectionFor = (item) => selections[item.id] || { type: String(item.vehicleType || '').trim().toUpperCase(), plate: String(item.vehiclePlate || '').trim() }
  const submit = async (item, action) => {
    const selection = selectionFor(item)
    setError('')
    setProcessing(item.id)
    try {
      await publicApi(path, { method: 'POST', body: JSON.stringify({ action, vehicleType: selection.type, vehiclePlate: selection.plate, ...(queue ? { travelId: item.id } : {}) }) })
      setToast(action === 'approve' ? 'Pengajuan kendaraan berhasil disetujui.' : 'Pengajuan kendaraan berhasil ditolak.')
      setTab(action === 'approve' ? 'approved' : 'rejected')
      await load()
      window.setTimeout(() => setToast(''), 3200)
    } catch (cause) {
      setError(cause.message || 'Approval gagal diproses.')
    } finally {
      setProcessing('')
    }
  }

  if (state === 'loading') return <main className="public-approval-page"><div className="approval-shell"><p>Memuat approval kendaraan...</p></div></main>
  if (state === 'error') return <main className="public-approval-page"><div className="approval-shell"><h1>Approval tidak tersedia</h1><p>{error}</p></div></main>

  return <main className="public-approval-page"><div className="approval-shell"><header className="public-approval-nav"><a className="brand" href="/"><img src="/bmc-mark.png" alt="" /><span>BMC Online<small>Approval Kendaraan</small></span></a><span className="public-nav-label">Portal pengelola</span></header><section className="approval-hero"><div><p className="panel-kicker">Monitoring approval</p><h1>Daftar Tugas Luar</h1><p>Periksa pengajuan yang masih menunggu pemeriksaan kendaraan Anda.</p></div><strong className="approval-count">{tabCount('pending')}<small>menunggu</small></strong></section>{toast && <div className="toast success approval-toast" role="status">{toast}</div>}{error && <div className="dashboard-alert" role="alert">{error}</div>}<div className="approval-tabs" role="tablist" aria-label="Status approval kendaraan">{[['pending', 'Menunggu Persetujuan'], ['approved', 'Disetujui'], ['rejected', 'Ditolak'], ['all', 'Semua']].map(([value, label]) => <button className={tab === value ? 'approval-tab active' : 'approval-tab'} type="button" role="tab" aria-selected={tab === value} key={value} onClick={() => setTab(value)}>{label}<span>{tabCount(value)}</span></button>)}</div><section className="pending-travel-list" aria-live="polite">{visible.length ? visible.map((item) => <ApprovalCard key={item.id} item={item} selection={selectionFor(item)} onChange={(selection) => setSelections((current) => ({ ...current, [item.id]: selection }))} onSubmit={submit} processing={processing === item.id} />) : <div className="approval-empty"><h2>Tidak ada pengajuan pada tab ini</h2><p>Pengajuan baru akan tampil setelah dikirim kepada Anda.</p></div>}</section></div></main>
}
