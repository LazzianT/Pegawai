import { useEffect, useState } from 'react'
import { login } from '../services/api'
import { friendlyLoginError, validateLogin } from '../hr'

function Icon({ name }) {
  const paths = { calendar: <><rect x="3" y="4.5" width="18" height="16" rx="2" /><path d="M7 2.5v4M17 2.5v4M3 9.5h18M7 13h3M14 13h3" /></>, file: <><path d="M6 3.5h8l4 4v13H6z" /><path d="M14 3.5v4h4M9 12h6M9 16h6" /></>, bell: <><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /></> }
  return <svg className="ui-icon" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>
}

export default function LoginPage({ onLogin }) {
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [remember, setRemember] = useState(false)
  const [errors, setErrors] = useState({})
  const [status, setStatus] = useState('idle')
  const [message, setMessage] = useState('')

  useEffect(() => () => setPassword(''), [])

  async function submit(event) {
    event.preventDefault()
    if (status === 'loading') return
    const nextErrors = validateLogin(identifier, password)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) { setStatus('validating'); return }
    setStatus('loading'); setMessage('')
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 15000)
    try {
      const data = await login(identifier.trim(), password, controller.signal)
      const storage = remember ? localStorage : sessionStorage
      storage.setItem('bmc.auth.token', data.token)
      storage.setItem('bmc.auth.user', JSON.stringify(data.user))
      setPassword('')
      setStatus('success')
      setMessage(`Selamat datang, ${data.user.name || 'pengguna'}.`)
      onLogin({ token: data.token, user: data.user })
    } catch (error) {
      setStatus('error'); setMessage(friendlyLoginError(error))
    } finally { clearTimeout(timeout) }
  }

  return <div className="login-shell">
    <div className="login-frame">
      <header className="site-header">
        <a className="brand" href="#top" aria-label="BMC Online beranda"><img src="/bmc-mark.png" alt="" />BMC Online</a>
        <nav className="nav-links" aria-label="Navigasi utama">
          <a href="#project">Project</a><a href="#about">About</a><a href="#contact">Contact</a>
        </nav>
        <button className="header-action" type="button" onClick={() => document.getElementById('login-form')?.scrollIntoView({ behavior: 'smooth' })}>Mulai Sekarang</button>
      </header>

      <main id="top" className="hero-grid">
        <section className="hero-copy enter" id="about" aria-labelledby="hero-title">
          <p className="eyebrow">Lebih mudah, lebih teratur</p>
          <h1 className="hero-title" id="hero-title">Kelola pengajuan HC <strong>dalam Satu Tempat.</strong></h1>
          <p className="hero-text">Ajukan, pantau, dan kelola semua permohonan kapan saja, di mana saja. Proses lebih cepat, transparan, dan mudah dipantau.</p>
          <div className="benefits" id="project">
            <div className="benefit"><div className="benefit-mark"><Icon name="calendar" /></div>Pengajuan mudah</div>
            <div className="benefit"><div className="benefit-mark"><Icon name="file" /></div>Status transparan</div>
            <div className="benefit"><div className="benefit-mark"><Icon name="bell" /></div>Notifikasi tepat waktu</div>
          </div>
        </section>

        <section className="login-column enter" id="login-form" aria-labelledby="login-title">
          <form className="login-card" onSubmit={submit} noValidate>
            <h2 id="login-title">Selamat Datang</h2>
            <p>Masuk untuk mengelola pengajuan cuti, izin, dan tugas luar Anda.</p>
            <div className="field">
              <label htmlFor="identifier">NIK / Nomor Induk Karyawan</label>
              <div className={`input-wrap ${errors.identifier ? 'has-error' : ''}`}><Icon>✉</Icon><input id="identifier" name="identifier" value={identifier} onChange={(e) => { setIdentifier(e.target.value); setErrors((old) => ({ ...old, identifier: '' })) }} placeholder="Masukkan NIK Anda" aria-invalid={Boolean(errors.identifier)} aria-describedby={errors.identifier ? 'identifier-error' : undefined} /></div>
              {errors.identifier && <small className="field-error" id="identifier-error">{errors.identifier}</small>}
            </div>
            <div className="field">
              <label htmlFor="password">Password</label>
              <div className={`input-wrap ${errors.password ? 'has-error' : ''}`}><Icon>♙</Icon><input id="password" name="password" type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => { setPassword(e.target.value); setErrors((old) => ({ ...old, password: '' })) }} placeholder="Masukkan password" aria-invalid={Boolean(errors.password)} aria-describedby={errors.password ? 'password-error' : undefined} /><button className="password-toggle" type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}>{showPassword ? 'Sembunyikan' : 'Tampilkan'}</button></div>
              {errors.password && <small className="field-error" id="password-error">{errors.password}</small>}
            </div>
            <div className="form-options"><label className="remember"><input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />Ingat saya</label><span aria-disabled="true">Lupa password?</span></div>
            {message && <div className={`form-error ${status === 'success' ? 'success-message' : ''}`} role="status">{message}</div>}
            <button className="primary-button" type="submit" disabled={status === 'loading'}>{status === 'loading' ? 'Memeriksa…' : 'Masuk  →'}</button>
            <p className="login-footer" id="contact">Belum punya akun? <strong>Hubungi Admin</strong></p>
          </form>
        </section>
      </main>
    </div>
    {status === 'success' && <div className="toast success" role="status">Login berhasil. Selamat datang di BMC Online.</div>}
  </div>
}
