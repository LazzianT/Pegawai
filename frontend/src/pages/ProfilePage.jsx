import { useEffect, useState } from 'react'
import { api } from '../services/api'

export default function ProfilePage({ token, user }) {
  const [profile, setProfile] = useState(user || {})
  const [email, setEmail] = useState(user?.email || '')
  const [phone, setPhone] = useState(user?.phone || '')
  const [editingEmail, setEditingEmail] = useState(false)
  const [editingPhone, setEditingPhone] = useState(false)
  const [saving, setSaving] = useState(false)
  const [state, setState] = useState('loading')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    let alive = true
    api('/user/profile', token)
      .then((data) => { if (alive) { setProfile(data || {}); setEmail(data?.email || ''); setPhone(data?.phone || '') } })
      .catch((requestError) => { if (alive) setError(requestError.message || 'Profil tidak dapat dimuat.') })
      .finally(() => { if (alive) setState('ready') })
    return () => { alive = false }
  }, [token])

  const saveEmail = async () => {
    const value = email.trim()
    if (!value || !value.includes('@')) { setError('Email tidak valid'); return }
    setSaving(true); setError(''); setMessage('')
    try {
      await api('/user/profile/email', token, { method: 'PUT', body: JSON.stringify({ email: value }) })
      setProfile((current) => ({ ...current, email: value }))
      setEmail(value)
      setEditingEmail(false)
      setMessage('Email berhasil diperbarui.')
    } catch (requestError) {
      setError(requestError.message || 'Email gagal diperbarui.')
    } finally { setSaving(false) }
  }

  const savePhone = async () => {
    const value = phone.trim()
    if (!value || !/^[+\d][\d\s().-]{7,19}$/.test(value)) { setError('Nomor Phone tidak valid'); return }
    setSaving(true); setError(''); setMessage('')
    try {
      await api('/user/profile/phone', token, { method: 'PUT', body: JSON.stringify({ phone: value }) })
      setProfile((current) => ({ ...current, phone: value })); setPhone(value); setEditingPhone(false); setMessage('Phone berhasil diperbarui.')
    } catch (requestError) { setError(requestError.message || 'Phone gagal diperbarui.') }
    finally { setSaving(false) }
  }

  if (state === 'loading') return <div className="dashboard-loading">Memuat profil...</div>
  return <section className="request-page" aria-labelledby="profile-title"><div className="request-page-heading"><p className="panel-kicker">Akun</p><h1 id="profile-title">My Profile</h1><p>Informasi profil akun Anda.</p></div><div className="dashboard-panel profile-card">{error && <div className="dashboard-alert" role="alert">{error}</div>}{message && <div className="request-success" role="status">{message}</div>}<div className="profile-avatar avatar">{(profile.name || 'P').slice(0, 1).toUpperCase()}</div><dl className="profile-details"><div><dt>Nama</dt><dd>{profile.name || '—'}</dd></div><div><dt>NIP</dt><dd>{profile.nip || profile.id || '—'}</dd></div><div><dt>Email</dt><dd>{editingEmail ? <span className="profile-edit"><input value={email} onChange={(event) => setEmail(event.target.value)} type="email" autoComplete="email" aria-label="Email" /><button type="button" onClick={saveEmail} disabled={saving}>{saving ? 'Menyimpan…' : 'Simpan'}</button><button type="button" onClick={() => { setEmail(profile.email || ''); setEditingEmail(false) }} disabled={saving}>Batal</button></span> : <span className="profile-value">{profile.email || '—'}<button type="button" className="profile-edit-button" onClick={() => { setError(''); setMessage(''); setEditingEmail(true) }}>Edit</button></span>}</dd></div><div><dt>Phone</dt><dd>{editingPhone ? <span className="profile-edit"><input value={phone} onChange={(event) => setPhone(event.target.value)} type="tel" autoComplete="tel" aria-label="Phone" /><button type="button" onClick={savePhone} disabled={saving}>{saving ? 'Menyimpan…' : 'Simpan'}</button><button type="button" onClick={() => { setPhone(profile.phone || ''); setEditingPhone(false) }} disabled={saving}>Batal</button></span> : <span className="profile-value">{profile.phone || 'Belum tersedia'}<button type="button" className="profile-edit-button" onClick={() => { setError(''); setMessage(''); setEditingPhone(true) }}>Edit</button></span>}</dd></div><div><dt>Jabatan</dt><dd>{profile.jabatan || '—'}</dd></div><div><dt>Departemen</dt><dd>{profile.department || '—'}</dd></div></dl></div></section>
}
