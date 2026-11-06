import { useEffect, useState } from 'react'
import { api } from '../services/api'
import { approvalStatus, formatDate } from '../hr'

export default function GroupApprovalPage({ token }) {
  const [rows, setRows] = useState([])
  const [state, setState] = useState('loading')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [processing, setProcessing] = useState('')

  const load = () => {
    setState('loading')
    setError('')
    api('/travel/groups/approval', token)
      .then((data) => setRows(Array.isArray(data?.data) ? data.data : []))
      .catch((cause) => setError(cause.message || 'Approval group tidak dapat dimuat.'))
      .finally(() => setState('ready'))
  }

  useEffect(load, [token])

  const approve = async (row, action) => {
    const rowKey = `${row.groupCode}:${row.groupVersion}`
    setProcessing(rowKey)
    setError('')
    setMessage('')
    try {
      await api(`/travel/groups/${encodeURIComponent(row.groupCode)}/approvals`, token, { method: 'POST', body: JSON.stringify({ version: row.groupVersion, action }) })
      setMessage(action === 'approve' ? 'Approval group disetujui.' : 'Approval group ditolak untuk revisi.')
      load()
    } catch (cause) {
      setError(cause.message || 'Approval group gagal diproses.')
    } finally {
      setProcessing('')
    }
  }

  const pending = rows.filter((row) => approvalStatus(row.statusId) === 'pending')
  return <section className="request-page" aria-labelledby="group-approval-title">
    <div className="request-page-heading"><div><p className="panel-kicker">Approval</p><h1 id="group-approval-title">Approval Tugas Luar Group</h1><p>Setujui satu kali untuk group dan versi anggota yang sama.</p></div></div>
    {error && <div className="dashboard-alert" role="alert">{error}</div>}
    {message && <div className="toast success" role="status">{message}</div>}
    <section className="dashboard-panel request-history"><div className="panel-heading"><div><p className="panel-kicker">Daftar approval</p><h2>Menunggu persetujuan Anda</h2></div><span>{pending.length} data</span></div>
      {state === 'loading' ? <div className="empty-state">Memuat data...</div> : pending.length === 0 ? <div className="empty-state">Tidak ada approval group.</div> : <div className="request-list">{pending.map((row) => <article className="request-row" key={`${row.groupCode}:${row.groupVersion}`}><div><strong>{row.groupCode}</strong><small>Versi {row.groupVersion} · {formatDate(row.tanggalMulai)}{row.jamMulai ? ` · ${String(row.jamMulai).slice(0, 5)}` : ''}</small></div><div><strong>{row.tujuan || 'Tujuan belum tersedia'}</strong><small>{row.alasan || 'Tugas tidak dicantumkan'}</small></div><div className="group-member-list">{(Array.isArray(row.members) ? row.members : []).map((member) => <small key={member.nip}>{member.name} ({member.nip})</small>)}</div><div className="form-actions"><button className="secondary-button" type="button" disabled={processing === `${row.groupCode}:${row.groupVersion}`} onClick={() => approve(row, 'reject')}>{processing === `${row.groupCode}:${row.groupVersion}` ? 'Memproses…' : 'Tolak'}</button><button className="new-request-button" type="button" disabled={processing === `${row.groupCode}:${row.groupVersion}`} onClick={() => approve(row, 'approve')}>{processing === `${row.groupCode}:${row.groupVersion}` ? 'Memproses…' : 'Setujui'}</button></div></article>)}</div>}
    </section>
  </section>
}
