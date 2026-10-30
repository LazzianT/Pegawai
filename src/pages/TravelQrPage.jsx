import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { publicApi } from '../services/api'
import { formatDate } from '../hr'

export default function TravelQrPage({ travelId, token }) {
  const [state, setState] = useState('loading')
  const [dataUrl, setDataUrl] = useState('')
  const [travel, setTravel] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true
    publicApi(`/travel/qr/${encodeURIComponent(travelId)}/${encodeURIComponent(token)}`).then(async (response) => {
      const next = response?.data
      if (!next?.id) throw new Error('QR tidak valid')
      const url = await QRCode.toDataURL(JSON.stringify({ id: String(next.id) }), { errorCorrectionLevel: 'M', margin: 2, width: 320 })
      if (alive) { setTravel(next); setDataUrl(url); setState('ready') }
    }).catch((cause) => { if (alive) { setError(cause.message || 'QR tidak dapat dimuat.'); setState('error') } })
    return () => { alive = false }
  }, [travelId, token])

  if (state === 'loading') return <main className="public-qr-page"><div className="qr-page-shell"><header className="qr-public-nav"><a className="brand" href="/"><img src="/bmc-mark.png" alt="" /><span>BMC Online<small>Portal tugas luar</small></span></a><span className="public-nav-label">Akses Security</span></header><div className="dashboard-panel qr-page-card"><p>Memuat QR...</p></div></div></main>
  if (state === 'error') return <main className="public-qr-page"><div className="qr-page-shell"><header className="qr-public-nav"><a className="brand" href="/"><img src="/bmc-mark.png" alt="" /><span>BMC Online<small>Portal tugas luar</small></span></a><span className="public-nav-label">Akses Security</span></header><div className="dashboard-panel qr-page-card"><p className="panel-kicker">Akses Security</p><h1>QR tidak tersedia</h1><p>{error}</p></div></div></main>
  return <main className="public-qr-page"><div className="qr-page-shell"><header className="qr-public-nav"><a className="brand" href="/"><img src="/bmc-mark.png" alt="" /><span>BMC Online<small>Portal tugas luar</small></span></a><span className="public-nav-label">Akses Security</span></header><section className="qr-page-layout"><div className="qr-page-intro"><p className="panel-kicker">Validasi perjalanan</p><h1>QR Tugas Luar</h1><p>Tunjukkan kode ini kepada Security saat berangkat maupun kembali.</p></div><div className="dashboard-panel qr-page-card"><div className="qr-card-status"><span className="status-badge approved">Disetujui</span><span className="qr-active-label"><i />QR aktif</span></div><div className="qr-frame"><img className="travel-qr" src={dataUrl} alt={`QR tugas luar ${travel.id}`} /></div><div className="qr-code-caption"><strong>Pindai untuk validasi</strong><span>Pastikan seluruh kode terlihat jelas di layar.</span></div><dl className="qr-travel-details"><div><dt>Tujuan</dt><dd>{travel.tujuan || 'Tugas luar'}</dd></div><div><dt>Tanggal</dt><dd>{formatDate(travel.tanggal)}</dd></div><div><dt>ID pengajuan</dt><dd>{travel.id}</dd></div></dl></div></section></div></main>
}
