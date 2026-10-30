import { useEffect, useMemo, useState } from 'react'
import { publicApi } from '../services/api'
import { approvalStatus, filterTravelApprovals, formatDate } from '../hr'

function ApprovalCard({ item, onApprove, onReject, processing }) {
  const status = approvalStatus(item.statusId)
  const statusText = status === 'approved' ? 'Disetujui' : status === 'rejected' ? 'Ditolak' : 'Menunggu'
  return <article className="pending-travel-card"><div className="pending-travel-card-head"><div><span className="panel-kicker">Tugas luar</span><h2>{item.tujuan || 'Tujuan belum tersedia'}</h2></div><span className={`status-badge ${status}`}>{statusText}</span></div><dl className="detail-list"><div><dt>Pemohon</dt><dd>{item.nama}</dd></div><div><dt>Keperluan</dt><dd>{item.alasan || '—'}</dd></div><div><dt>Tanggal</dt><dd>{formatDate(item.tanggalMulai)}{item.tanggalSelesai ? ` - ${formatDate(item.tanggalSelesai)}` : ''}</dd></div><div><dt>ID pengajuan</dt><dd>{item.id}</dd></div>{item.processedBy && <div><dt>Diproses oleh</dt><dd>{item.processedBy}{item.processedAt ? ` · ${formatDate(item.processedAt)}` : ''}</dd></div>}</dl>{status === 'pending' && <div className="form-actions"><button className="secondary-button" type="button" disabled={processing} onClick={() => onReject(item)}>Tolak</button><button className="new-request-button" type="button" disabled={processing} onClick={() => onApprove(item)}>{processing ? 'Memproses…' : 'Setujui pengajuan'}</button></div>}</article>
}

export default function TravelApprovalLinkPage({ token, queue = false }) {
  const [data, setData] = useState(null)
  const [state, setState] = useState('loading')
  const [error, setError] = useState('')
  const [processing, setProcessing] = useState('')
  const [toast, setToast] = useState('')
  const [tab, setTab] = useState('pending')
  const path = queue ? `/travel/approval/atasan/queue/${encodeURIComponent(token)}` : `/travel/approval/atasan/${encodeURIComponent(token)}`
  const load = () => publicApi(path).then((response) => { setData(response.data || (queue ? [] : null)); setState('ready') }).catch((cause) => { setError(cause.message || 'Daftar approval tidak dapat dimuat.'); setState('error') })
  useEffect(load, [path])
  const pending = useMemo(() => queue ? (Array.isArray(data) ? data : []) : data ? [data] : [], [data, queue])
  const visible = useMemo(() => filterTravelApprovals(pending, tab), [pending, tab])
  const tabCount = (value) => filterTravelApprovals(pending, value).length
  const submit = async (item, action) => {
    setProcessing(item.id)
    setError('')
    try { await publicApi(queue ? `/travel/approval/atasan/queue/${encodeURIComponent(token)}` : path, { method: 'POST', body: JSON.stringify({ action, ...(queue ? { travelId: item.id } : {}) }) }); setToast(action === 'approve' ? 'Pengajuan berhasil disetujui.' : 'Pengajuan berhasil ditolak.'); setTab(action === 'approve' ? 'approved' : 'rejected'); await load(); window.setTimeout(() => setToast(''), 3200) } catch (cause) { setError(cause.message || 'Approval gagal diproses.') } finally { setProcessing('') }
  }
  if (state === 'loading') return <main className="public-approval-page"><div className="approval-shell"><p>Memuat daftar tugas luar tertunda...</p></div></main>
  if (state === 'error') return <main className="public-approval-page"><div className="approval-shell"><h1>Approval tidak tersedia</h1><p>{error}</p></div></main>
  if (!queue && data) return <main className="public-approval-page"><div className="approval-shell"><header className="public-approval-nav"><a className="brand" href="/"><img src="/bmc-mark.png" alt="" /><span>BMC Online<small>Approval Tugas Luar</small></span></a><span className="public-nav-label">Portal atasan</span></header><section className="approval-hero"><div><p className="panel-kicker">Approval pengajuan</p><h1>Tugas Luar</h1><p>Periksa pengajuan sebelum memberikan keputusan.</p></div></section>{error && <div className="dashboard-alert" role="alert">{error}</div>}{toast && <div className="toast success approval-toast" role="status">{toast}</div>}<section className="pending-travel-list"><ApprovalCard item={data} onApprove={(item) => submit(item, 'approve')} onReject={(item) => submit(item, 'reject')} processing={processing === data.id} /></section></div></main>
  return <main className="public-approval-page"><div className="approval-shell"><header className="public-approval-nav"><a className="brand" href="/"><img src="/bmc-mark.png" alt="" /><span>BMC Online<small>Approval Tugas Luar</small></span></a><span className="public-nav-label">Portal atasan</span></header><section className="approval-hero"><div><p className="panel-kicker">Monitoring approval</p><h1>Daftar Tugas Luar</h1><p>Periksa pengajuan yang masih menunggu persetujuan Anda.</p></div><strong className="approval-count">{tabCount('pending')}<small>menunggu</small></strong></section>{toast && <div className="toast success approval-toast" role="status">{toast}</div>}{error && <div className="dashboard-alert" role="alert">{error}</div>}<div className="approval-tabs" role="tablist" aria-label="Status tugas luar">{[['pending', 'Menunggu Persetujuan'], ['approved', 'Disetujui'], ['rejected', 'Ditolak'], ['all', 'Semua']].map(([value, label]) => <button className={tab === value ? 'approval-tab active' : 'approval-tab'} type="button" role="tab" aria-selected={tab === value} key={value} onClick={() => setTab(value)}>{label}<span>{tabCount(value)}</span></button>)}</div><section className="pending-travel-list" aria-live="polite">{visible.length ? visible.map((item) => <ApprovalCard key={item.id} item={item} onApprove={(value) => submit(value, 'approve')} onReject={(value) => submit(value, 'reject')} processing={processing === item.id} />) : <div className="approval-empty"><h2>Tidak ada pengajuan pada tab ini</h2><p>Pengajuan baru akan tampil setelah dikirim kepada Anda.</p></div>}</section></div></main>
}
