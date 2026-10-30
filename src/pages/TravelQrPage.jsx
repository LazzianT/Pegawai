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

  if (state === 'loading') return <main className="public-qr-page"><div className="dashboard-panel qr-card"><p>Memuat QR...</p></div></main>
  if (state === 'error') return <main className="public-qr-page"><div className="dashboard-panel qr-card"><h1>QR tidak tersedia</h1><p>{error}</p></div></main>
  return <main className="public-qr-page"><div className="dashboard-panel qr-card"><p className="panel-kicker">Akses Security</p><h1>QR Tugas Luar</h1><img className="travel-qr" src={dataUrl} alt={`QR tugas luar ${travel.id}`} /><strong>{travel.tujuan || 'Tugas luar'}</strong><small>{travel.id} · {formatDate(travel.tanggal)}</small><p>Tunjukkan QR ini kepada Security untuk mencatat keberangkatan atau kepulangan.</p></div></main>
}
