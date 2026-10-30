import { useEffect, useState } from 'react'
import { api } from '../services/api'
import { formatDate } from '../hr'

export default function VehicleApprovalPage({ token }) {
  const [rows, setRows] = useState([])
  const [state, setState] = useState('loading')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [processing, setProcessing] = useState('')
  const [selected, setSelected] = useState(null)
  const [vehicleType, setVehicleType] = useState('')
  const [vehiclePlate, setVehiclePlate] = useState('')

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
    setSelected(row)
    setVehicleType('')
    setVehiclePlate('')
    setError('')
  }

  return <section className="request-page" aria-labelledby="vehicle-approval-title">
    <div className="request-page-heading"><div><p className="panel-kicker">Approval</p><h1 id="vehicle-approval-title">Pengelola Kendaraan</h1><p>Tugas luar yang sudah disetujui atasan menunggu pemeriksaan kendaraan.</p></div></div>
    {error && <div className="dashboard-alert" role="alert">{error}</div>}
    {message && <div className="toast success" role="status">{message}</div>}
    <section className="dashboard-panel request-history"><div className="panel-heading"><div><p className="panel-kicker">Menunggu diproses</p><h2>Daftar tugas luar</h2></div><span>{rows.length} data</span></div>{state === 'loading' ? <div className="empty-state">Memuat data...</div> : rows.length === 0 ? <div className="empty-state">Belum ada tugas luar yang menunggu approval kendaraan.</div> : <div className="request-list">{rows.map((row) => <article className="request-row" key={row.id}><div><strong>{row.tujuan || 'Tujuan belum tersedia'}</strong><small>{row.id} · {row.nama}</small></div><div><strong>{row.alasan || 'Keperluan tidak dicantumkan'}</strong><small>{formatDate(row.tanggalMulai)} · {row.vehicleType}{row.vehiclePlate ? ` · ${row.vehiclePlate}` : ''}</small></div><span className="status-badge pending">Menunggu</span><button className="secondary-button" type="button" disabled={Boolean(processing)} onClick={() => approve(row.id, 'reject')}>{processing === row.id ? 'Memproses…' : 'Tolak'}</button><button className="new-request-button" type="button" disabled={Boolean(processing)} onClick={() => openApproval(row)}>Setujui</button></article>)}</div>}</section>
    {selected && <div className="detail-layer" role="presentation" onClick={(event) => { if (event.target === event.currentTarget) setSelected(null) }}><div className="detail-card" role="dialog" aria-modal="true" aria-labelledby="vehicle-confirm-title"><div className="panel-heading"><div><p className="panel-kicker">Konfirmasi approval</p><h2 id="vehicle-confirm-title">Surat Pengajuan Tugas Luar</h2></div><button className="detail-close" type="button" onClick={() => setSelected(null)} aria-label="Tutup konfirmasi">×</button></div><dl className="detail-list"><div><dt>ID pengajuan</dt><dd>{selected.id}</dd></div><div><dt>Pemohon</dt><dd>{selected.nama}</dd></div><div><dt>Tujuan</dt><dd>{selected.tujuan || '—'}</dd></div><div><dt>Keperluan</dt><dd>{selected.alasan || '—'}</dd></div><div><dt>Tanggal</dt><dd>{formatDate(selected.tanggalMulai)}</dd></div></dl><label className="request-field">Kendaraan<select value={vehicleType} onChange={(event) => { setVehicleType(event.target.value); if (event.target.value === 'ONLINE') setVehiclePlate('') }}><option value="">Pilih kendaraan</option><option value="PRIVATE">Kendaraan Pribadi</option><option value="ONLINE">Pesan Online</option><option value="OFFICE">Kendaraan Kantor</option></select></label>{['PRIVATE', 'OFFICE'].includes(vehicleType) && <label className="request-field">Nomor plat<input value={vehiclePlate} onChange={(event) => setVehiclePlate(event.target.value)} placeholder="Contoh: B 1234 TUU" /></label>}<div className="form-actions"><button className="secondary-button" type="button" onClick={() => setSelected(null)}>Batal</button><button className="new-request-button" type="button" disabled={!vehicleType || Boolean(processing) || (['PRIVATE', 'OFFICE'].includes(vehicleType) && !vehiclePlate.trim())} onClick={() => approve(selected.id, 'approve')}>{processing ? 'Memproses…' : 'Konfirmasi & Setujui'}</button></div></div></div>}
  </section>
}
