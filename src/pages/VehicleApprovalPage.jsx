import { useEffect, useState } from 'react'
import { api } from '../services/api'
import { formatDate } from '../hr'

export default function VehicleApprovalPage({ token }) {
  const [rows, setRows] = useState([])
  const [state, setState] = useState('loading')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [processing, setProcessing] = useState('')

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
      await api('/travel/approval/approve', token, { method: 'POST', body: JSON.stringify({ id, action }) })
      setMessage(action === 'approve' ? 'Approval kendaraan berhasil.' : 'Tugas luar ditolak.')
      load()
    } catch (cause) { setError(cause.message || 'Approval gagal diproses.') }
    finally { setProcessing('') }
  }

  return <section className="request-page" aria-labelledby="vehicle-approval-title">
    <div className="request-page-heading"><div><p className="panel-kicker">Approval</p><h1 id="vehicle-approval-title">Pengelola Kendaraan</h1><p>Tugas luar yang sudah disetujui atasan menunggu pemeriksaan kendaraan.</p></div></div>
    {error && <div className="dashboard-alert" role="alert">{error}</div>}
    {message && <div className="toast success" role="status">{message}</div>}
    <section className="dashboard-panel request-history"><div className="panel-heading"><div><p className="panel-kicker">Menunggu diproses</p><h2>Daftar tugas luar</h2></div><span>{rows.length} data</span></div>{state === 'loading' ? <div className="empty-state">Memuat data...</div> : rows.length === 0 ? <div className="empty-state">Belum ada tugas luar yang menunggu approval kendaraan.</div> : <div className="request-list">{rows.map((row) => <article className="request-row" key={row.id}><div><strong>{row.tujuan || 'Tujuan belum tersedia'}</strong><small>{row.id} · {row.nama}</small></div><div><strong>{row.alasan || 'Keperluan tidak dicantumkan'}</strong><small>{formatDate(row.tanggalMulai)} · {row.vehicleType}{row.vehiclePlate ? ` · ${row.vehiclePlate}` : ''}</small></div><span className="status-badge pending">Menunggu</span><button className="secondary-button" type="button" disabled={Boolean(processing)} onClick={() => approve(row.id, 'reject')}>{processing === row.id ? 'Memproses…' : 'Tolak'}</button><button className="new-request-button" type="button" disabled={Boolean(processing)} onClick={() => approve(row.id, 'approve')}>{processing === row.id ? 'Memproses…' : 'Setujui'}</button></article>)}</div>}</section>
  </section>
}
