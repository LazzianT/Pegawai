import { useEffect, useState } from 'react'
import { publicApi } from '../services/api'
import { OPERATIONAL_PLATES, VEHICLE_OPTIONS, vehicleLabel } from '../hr'

export default function VehicleApprovalLinkPage({ token }) {
  const [data, setData] = useState(null)
  const [type, setType] = useState('')
  const [plate, setPlate] = useState('')
  const [state, setState] = useState('loading')
  const [error, setError] = useState('')
  const [processing, setProcessing] = useState(false)

  useEffect(() => {
    publicApi(`/travel/approval/kendaraan/${encodeURIComponent(token)}`).then((response) => {
      setData(response.data)
      setType(String(response.data.vehicleType || '').trim().toUpperCase())
      setPlate(String(response.data.vehiclePlate || '').trim())
      setState('ready')
    }).catch((cause) => { setError(cause.message || 'Link approval tidak dapat dimuat.'); setState('error') })
  }, [token])

  const submit = async (action) => {
    setError('')
    setProcessing(true)
    try {
      await publicApi(`/travel/approval/kendaraan/${encodeURIComponent(token)}`, { method: 'POST', body: JSON.stringify({ action, vehicleType: type, vehiclePlate: plate }) })
      const response = await publicApi(`/travel/approval/kendaraan/${encodeURIComponent(token)}`)
      setData(response.data)
    } catch (cause) { setError(cause.message || 'Approval gagal diproses.') } finally { setProcessing(false) }
  }

  if (state === 'loading') return <main className="public-qr-page"><div className="dashboard-panel qr-card"><p>Memuat approval...</p></div></main>
  if (state === 'error') return <main className="public-qr-page"><div className="dashboard-panel qr-card"><h1>Approval tidak tersedia</h1><p>{error}</p></div></main>
  const processed = data.statusId !== 1
  return <main className="public-qr-page"><div className="dashboard-panel qr-card"><p className="panel-kicker">Approval kendaraan</p><h1>Tugas Luar</h1><dl className="detail-list"><div><dt>Pemohon</dt><dd>{data.nama}</dd></div><div><dt>Tujuan</dt><dd>{data.tujuan || '—'}</dd></div><div><dt>Keperluan</dt><dd>{data.alasan || '—'}</dd></div></dl>{processed ? <p role="status">{data.statusId === 3 ? 'Sudah disetujui' : 'Sudah ditolak'}{data.processedByNIP ? ` oleh petugas ${data.processedByNIP}` : ''}.</p> : <><fieldset className="request-field vehicle-options"><legend>Kendaraan</legend><div className="vehicle-choice-list">{VEHICLE_OPTIONS.map(([value, label]) => <label className={type === value ? 'vehicle-choice selected' : 'vehicle-choice'} key={value}><input type="radio" name="vehicleType" value={value} checked={type === value} onChange={(event) => { setType(event.target.value); setPlate('') }} /><span>{label}</span></label>)}</div></fieldset>{['OFFICE', 'MOTOR'].includes(type) && <label className="request-field">Nomor plat kendaraan<select value={plate} onChange={(event) => setPlate(event.target.value)}><option value="">Pilih nomor plat</option>{OPERATIONAL_PLATES[type].map((value) => <option value={value} key={value}>{value}</option>)}</select></label>}{error && <p role="alert">{error}</p>}<div className="form-actions"><button className="secondary-button" type="button" disabled={processing} onClick={() => submit('reject')}>Tolak</button><button className="new-request-button" type="button" disabled={processing || !type || (['OFFICE', 'MOTOR'].includes(type) && !plate)} onClick={() => submit('approve')}>{processing ? 'Memproses…' : 'Setujui'}</button></div></>}</div></main>
}
