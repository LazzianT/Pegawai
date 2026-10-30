import { useEffect, useState } from 'react'
import { publicApi } from '../services/api'

export default function TravelApprovalLinkPage({ token }) {
  const [data, setData] = useState(null)
  const [state, setState] = useState('loading')
  const [error, setError] = useState('')
  const [processing, setProcessing] = useState(false)
  const path = `/travel/approval/atasan/${encodeURIComponent(token)}`
  const load = () => publicApi(path).then((response) => { setData(response.data); setState('ready') }).catch((cause) => { setError(cause.message || 'Link approval tidak dapat dimuat.'); setState('error') })
  useEffect(load, [path])
  const submit = async (action) => {
    setProcessing(true)
    setError('')
    try { await publicApi(path, { method: 'POST', body: JSON.stringify({ action }) }); await load() } catch (cause) { setError(cause.message || 'Approval gagal diproses.') } finally { setProcessing(false) }
  }
  if (state === 'loading') return <main className="public-qr-page"><div className="dashboard-panel qr-card"><p>Memuat approval...</p></div></main>
  if (state === 'error') return <main className="public-qr-page"><div className="dashboard-panel qr-card"><h1>Approval tidak tersedia</h1><p>{error}</p></div></main>
  return <main className="public-qr-page"><div className="dashboard-panel qr-card"><p className="panel-kicker">Approval atasan</p><h1>Tugas Luar</h1><dl className="detail-list"><div><dt>Pemohon</dt><dd>{data.nama}</dd></div><div><dt>Tujuan</dt><dd>{data.tujuan || '—'}</dd></div><div><dt>Keperluan</dt><dd>{data.alasan || '—'}</dd></div><div><dt>Tanggal</dt><dd>{data.tanggalMulai || '—'}</dd></div></dl>{data.statusId === 1 ? <div className="form-actions"><button className="secondary-button" type="button" disabled={processing} onClick={() => submit('reject')}>Tolak</button><button className="new-request-button" type="button" disabled={processing} onClick={() => submit('approve')}>{processing ? 'Memproses…' : 'Setujui'}</button></div> : <p role="status">Pengajuan sudah diproses.</p>}{error && <p role="alert">{error}</p>}</div></main>
}
