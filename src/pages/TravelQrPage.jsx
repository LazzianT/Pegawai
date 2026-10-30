import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { publicApi } from '../services/api'
import { formatDate, formatScanTime, qrTravelStatus } from '../hr'

export default function TravelQrPage({ travelId, token }) {
  const [state, setState] = useState('loading')
  const [dataUrl, setDataUrl] = useState('')
  const [travel, setTravel] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true
    const path = `/travel/qr/${encodeURIComponent(travelId)}/${encodeURIComponent(token)}`
    const load = async (initial = false) => {
      try {
        const response = await publicApi(path, { cache: 'no-store' })
        const next = response?.data
        if (!next?.id || typeof next.qrToken !== 'string' || !/^[a-f0-9]{48}$/i.test(next.qrToken.trim())) throw new Error('QR tidak valid')
        if (initial) {
          const url = await QRCode.toDataURL(JSON.stringify({ id: String(next.id), token: String(next.qrToken) }), { errorCorrectionLevel: 'M', margin: 2, width: 320 })
          if (alive) setDataUrl(url)
        }
        if (alive) { setTravel(next); setState('ready') }
      } catch (cause) {
        if (initial && alive) { setError(cause.message || 'QR tidak dapat dimuat.'); setState('error') }
      }
    }
    load(true)
    const timer = window.setInterval(() => load(), 10000)
    return () => { alive = false; window.clearInterval(timer) }
  }, [travelId, token])

  if (state === 'loading') return <main className="public-qr-page"><div className="qr-page-shell"><header className="qr-public-nav"><a className="brand" href="/"><img src="/bmc-mark.png" alt="" /><span>BMC Online<small>Portal tugas luar</small></span></a><span className="public-nav-label">Akses Security</span></header><div className="dashboard-panel qr-page-card"><p>Memuat QR...</p></div></div></main>
  if (state === 'error') return <main className="public-qr-page"><div className="qr-page-shell"><header className="qr-public-nav"><a className="brand" href="/"><img src="/bmc-mark.png" alt="" /><span>BMC Online<small>Portal tugas luar</small></span></a><span className="public-nav-label">Akses Security</span></header><div className="dashboard-panel qr-page-card"><p className="panel-kicker">Akses Security</p><h1>QR tidak tersedia</h1><p>{error}</p></div></div></main>
  const scanStatus = qrTravelStatus(travel)
  const statusText = scanStatus === 'returned' ? 'Perjalanan selesai' : scanStatus === 'departed' ? 'Sudah tercatat keluar' : 'Siap digunakan'
  const statusMessage = scanStatus === 'returned' ? 'Perjalanan ini sudah tercatat kembali.' : scanStatus === 'departed' ? `Tercatat keluar pukul ${formatScanTime(travel.departureAt)}.` : 'Tunjukkan kode ini kepada Security saat berangkat maupun kembali.'
  return <main className="public-qr-page"><div className="qr-page-shell"><header className="qr-public-nav"><a className="brand" href="/"><img src="/bmc-mark.png" alt="" /><span>BMC Online<small>Portal tugas luar</small></span></a><span className="public-nav-label">Akses Security</span></header><section className="qr-page-layout"><div className="qr-page-intro"><p className="panel-kicker">Validasi perjalanan</p><h1>QR Tugas Luar</h1><p>{statusMessage}</p></div><div className="dashboard-panel qr-page-card"><div className="qr-card-status"><span className={`status-badge ${scanStatus === 'returned' ? 'rejected' : scanStatus === 'departed' ? 'approved' : 'pending'}`}>{statusText}</span><span className="qr-active-label"><i />Pembaruan otomatis</span></div><div className="qr-frame"><img className="travel-qr" src={dataUrl} alt={`QR tugas luar ${travel.id}`} /></div><div className="qr-code-caption"><strong>{scanStatus === 'departed' ? 'Keberangkatan tercatat' : scanStatus === 'returned' ? 'Kepulangan tercatat' : 'Pindai untuk validasi'}</strong><span>{scanStatus === 'departed' ? `Keluar ${formatScanTime(travel.departureAt)}` : scanStatus === 'returned' ? `Kembali ${formatDate(travel.tanggalKembali)} pukul ${formatScanTime(travel.jamKembali)}` : 'Halaman diperbarui otomatis.'}</span></div><dl className="qr-travel-details"><div><dt>Tujuan</dt><dd>{travel.tujuan || 'Tugas luar'}</dd></div><div><dt>Tanggal</dt><dd>{formatDate(travel.tanggal)}</dd></div><div><dt>ID pengajuan</dt><dd>{travel.id}</dd></div></dl></div></section></div></main>
}
