import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { api } from '../services/api'
import { dateRange, formatDate, formatPersonName, greeting, pageFromPath, pagePath, statusClass, statusLabel } from '../hr'
import TugasLuarPage from './TugasLuarPage'
import IzinPage from './IzinPage'
import CutiPage from './CutiPage'
import ProfilePage from './ProfilePage'

const TYPES = ['Cuti', 'Izin', 'Cuti Khusus', 'Tugas Luar']
const NAV_ITEMS = ['Dashboard', ...TYPES, 'Perjalanan Dinas', 'My Profile']
const icons = { Dashboard: 'dashboard', Cuti: 'calendar', Izin: 'file', 'Cuti Khusus': 'clock', 'Tugas Luar': 'briefcase', 'Perjalanan Dinas': 'plane', 'My Profile': 'user' }

function Icon({ name, size = 18 }) {
  const paths = {
    dashboard: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>,
    calendar: <><rect x="3" y="4.5" width="18" height="16" rx="2" /><path d="M7 2.5v4M17 2.5v4M3 9.5h18M7 13h3M7 17h3M14 13h3M14 17h3" /></>,
    file: <><path d="M6 3.5h8l4 4v13H6z" /><path d="M14 3.5v4h4M9 12h6M9 16h6" /></>,
    clock: <><circle cx="12" cy="12" r="8.5" /><path d="M12 7v5l3.5 2" /></>,
    briefcase: <><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M8 7V5.5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2V7M3 12h18M10 12v2h4v-2" /></>,
    plane: <><path d="m3 12 18-6-6 18-3-8-9-4Z" /><path d="m12 16 4-4" /></>,
    user: <><circle cx="12" cy="8" r="3.5" /><path d="M5 21a7 7 0 0 1 14 0" /></>,
    search: <><circle cx="10.8" cy="10.8" r="6.5" /><path d="m16 16 5 5" /></>,
    bell: <><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /></>,
    menu: <path d="M4 7h16M4 12h16M4 17h16" />,
    logout: <><path d="M10 5H5v14h5M14 8l4 4-4 4M18 12H9" /></>,
    plus: <path d="M12 5v14M5 12h14" />,
    left: <path d="m15 18-6-6 6-6" />,
    right: <path d="m9 18 6-6-6-6" />,
  }
  return <svg className="ui-icon" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>
}

function normalizeRows(payload, type) {
  return (payload?.data || []).map((item) => {
    const start = type === 'Cuti' ? item.periode?.split(',')[0] : type === 'Izin' || type === 'Cuti Khusus' ? item.tanggal : item.tanggalMulai
    return { ...item, type, date: start, end: type === 'Tugas Luar' ? item.tanggalSelesai : start, status: type === 'Izin' || type === 'Cuti Khusus' ? 'pending' : item.status }
  })
}

function Sidebar({ active, onSelect, user, onLogout }) {
  return <aside className="app-sidebar" data-tour="menu">
    <a className="brand sidebar-brand" href="/dashboard" onClick={(event) => { event.preventDefault(); onSelect('Dashboard') }}><img src="/bmc-mark.png" alt="" /><span>BMC Online<small>HC Management</small></span></a>
    <div className="sidebar-caption">Menu utama</div>
    <nav aria-label="Menu utama">
      {NAV_ITEMS.map((item) => item === 'Perjalanan Dinas' ? <div className="sidebar-link sidebar-coming-soon" key={item}><span><Icon name={icons[item]} /></span><span>{item}<small>Coming soon</small></span></div> : <a className={active === item ? 'sidebar-link active' : 'sidebar-link'} href={pagePath(item)} key={item} onClick={(event) => { event.preventDefault(); onSelect(item) }}><span><Icon name={icons[item]} /></span>{item}</a>)}
    </nav>
    <div className="sidebar-note"><strong>Butuh bantuan?</strong>Hubungi admin HC untuk bantuan pengajuan.</div>
    <div className="sidebar-profile"><div className="avatar">{(user?.name || 'P').slice(0, 1).toUpperCase()}</div><div><strong>{user?.name || user?.id || 'Pengguna'}</strong><small>{user?.jabatan || user?.department || 'Pengguna'}</small></div><button type="button" aria-label="Keluar" onClick={onLogout}><Icon name="logout" size={16} /></button></div>
  </aside>
}

function TopBar({ user, query, setQuery, onMenu, onNavigate, onLogout, onTour }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  useEffect(() => {
    if (!open) return undefined
    const close = (event) => { if (!ref.current?.contains(event.target)) setOpen(false) }
    document.addEventListener('pointerdown', close)
    return () => document.removeEventListener('pointerdown', close)
  }, [open])
  return <header className="app-topbar"><button className="menu-button" type="button" onClick={onMenu} aria-label="Buka menu"><Icon name="menu" /></button><label className="search-box"><span aria-hidden="true"><Icon name="search" size={16} /></span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari pengajuan, status, atau dokumen..." aria-label="Cari pengajuan" /></label><div className="top-user-wrap" ref={ref}><button className="top-user" type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open} aria-haspopup="menu"><div className="avatar">{(user?.name || 'P').slice(0, 1).toUpperCase()}</div><span>{user?.name || user?.id || 'Pengguna'}</span><span className="top-user-chevron">⌄</span></button>{open && <div className="top-user-menu" role="menu"><div className="top-user-summary"><strong>{user?.name || user?.id || 'Pengguna'}</strong><small>{user?.jabatan || user?.department || 'Pengguna'}</small></div><button type="button" role="menuitem" onClick={() => { setOpen(false); onNavigate('My Profile') }}>My Profile</button><button type="button" role="menuitem" onClick={() => { setOpen(false); onTour?.() }}>Panduan aplikasi</button><button type="button" role="menuitem" onClick={onLogout}>Keluar</button></div>}</div></header>
}

function TourGuide({ user, onClose }) {
  const [step, setStep] = useState(-1)
  const steps = [
    { target: 'summary', title: 'Ringkasan pengajuan', text: 'Pantau jumlah pengajuan cuti, izin, dan tugas luar dari satu tempat.' },
    { target: 'request', title: 'Ajukan kebutuhan HC', text: 'Gunakan tombol Ajukan baru untuk membuat pengajuan dengan cepat.' },
    { target: 'recent', title: 'Pengajuan terbaru', text: 'Lihat status dan detail pengajuan terakhir Anda di sini.' },
    { target: 'menu', title: 'Menu dan profil', text: 'Gunakan menu samping untuk berpindah halaman. Profil serta logout tersedia di kanan atas.' },
  ]
  useEffect(() => {
    const target = steps[step]?.target
    if (!target) return undefined
    const element = document.querySelector(`[data-tour="${target}"]`)
    element?.classList.add('tour-target')
    return () => element?.classList.remove('tour-target')
  }, [step])
  const current = steps[step]
  return <div className="tour-layer" role="dialog" aria-modal="true" aria-labelledby="tour-title"><div className={step === 0 ? 'tour-card tour-card-summary' : 'tour-card'}><p className="panel-kicker">BMC Online</p>{step < 0 ? <><h2 id="tour-title">Hallo, {formatPersonName(user?.name) || 'Pengguna'}!</h2><p>Ini adalah aplikasi administrasi keperluan karyawan. Ajukan, pantau, dan kelola kebutuhan HC Anda dengan lebih mudah.</p><button className="primary-button" type="button" onClick={() => setStep(0)}>Lihat panduan</button></> : <><p className="tour-count">{step + 1} dari {steps.length}</p><h2 id="tour-title">{current.title}</h2><p>{current.text}</p><div className="tour-actions"><button className="secondary-button" type="button" onClick={onClose}>Lewati</button>{step < steps.length - 1 ? <button className="primary-button" type="button" onClick={() => setStep((value) => value + 1)}>Berikutnya</button> : <button className="primary-button" type="button" onClick={onClose}>Selesai</button>}</div></>}</div></div>
}

function SummaryCard({ type, rows, onOpen }) {
  const pending = rows.filter((row) => statusClass(row.status) === 'pending').length
  return <button className="summary-card" type="button" onClick={onOpen}><span className="summary-icon"><Icon name={icons[type]} /></span><span className="summary-title">{type}</span><strong>{rows.length}</strong><small>{rows.length ? `${pending} menunggu persetujuan` : 'Belum ada pengajuan'}</small></button>
}

function RecentRequests({ rows, query }) {
  const [selected, setSelected] = useState(null)
  const [detailClosing, setDetailClosing] = useState(false)
  const openDetail = (row) => { setDetailClosing(false); setSelected(row) }
  const closeDetail = () => { if (selected) setDetailClosing(true) }
  const filtered = rows.filter((row) => `${row.type} ${row.id} ${row.alasan || ''} ${row.jenis || ''} ${row.status || ''}`.toLowerCase().includes(query.toLowerCase())).slice(0, 8)
  const details = selected ? [
    ['Jenis pengajuan', selected.type],
    ['ID pengajuan', selected.id],
    ['Keterangan', selected.alasan || selected.tugas || '—'],
    ['Tanggal', selected.type === 'Cuti' ? selected.periode : selected.type === 'Tugas Luar' ? `${formatDate(selected.tanggalMulai)}${selected.tanggalSelesai ? ` - ${formatDate(selected.tanggalSelesai)}` : ''}` : formatDate(selected.date)],
    ...(selected.jenis ? [['Detail', selected.jenis]] : []),
    ...(selected.hari ? [['Durasi', selected.hari]] : []),
    ['Status', statusLabel(selected.status)],
  ] : []
  return <section className="dashboard-panel recent-panel" data-tour="recent"><div className="panel-heading"><div><p className="panel-kicker">Aktivitas</p><h2>Pengajuan terbaru</h2></div><span>{filtered.length} data</span></div>{filtered.length === 0 ? <div className="empty-state">Belum ada pengajuan yang cocok. Pengajuan baru akan tampil di sini.</div> : <div className="request-list">{filtered.map((row) => <button className="request-row request-row-button" type="button" key={`${row.type}-${row.id}`} onClick={() => openDetail(row)} aria-label={`Lihat detail ${row.id}`}><div className="request-type"><span><Icon name={icons[row.type]} size={15} /></span><div><strong>{row.type}</strong><small>{row.id}</small></div></div><div><strong>{row.jenis || row.alasan || 'Pengajuan'}</strong><small>{row.type === 'Tugas Luar' ? `${formatDate(row.tanggalMulai)}${row.tanggalSelesai ? ` - ${formatDate(row.tanggalSelesai)}` : ''}` : formatDate(row.date)}</small></div><span className={`status-badge ${statusClass(row.status)}`}>{statusLabel(row.status)}</span></button>)}</div>}{selected && createPortal(<div className={detailClosing ? 'detail-layer detail-layer-closing' : 'detail-layer'} role="presentation" onClick={(event) => { if (event.target === event.currentTarget) closeDetail() }} onAnimationEnd={(event) => { if (detailClosing && event.target === event.currentTarget) { setSelected(null); setDetailClosing(false) } }}><div className="detail-card" role="dialog" aria-modal="true" aria-labelledby="detail-title" onClick={(event) => event.stopPropagation()}><div className="panel-heading"><div><p className="panel-kicker">Detail pengajuan</p><h2 id="detail-title">{selected.jenis || selected.type}</h2></div><button className="detail-close" type="button" onClick={closeDetail} aria-label="Tutup detail">×</button></div><dl className="detail-list">{details.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value || '—'}</dd></div>)}</dl></div></div>, document.body)}</section>
}

function Calendar({ rows, month, setMonth }) {
  const [year, monthNumber] = month.split('-').map(Number)
  const first = new Date(year, monthNumber - 1, 1)
  const days = new Date(year, monthNumber, 0).getDate()
  const offset = (first.getDay() + 6) % 7
  const marked = new Map()
  rows.forEach((row) => dateRange(row.date, row.end).forEach((date) => marked.set(date, row.type)))
  const changeMonth = (delta) => { const date = new Date(year, monthNumber - 1 + delta, 1); setMonth(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`) }
  return <section className="dashboard-panel calendar-panel"><div className="panel-heading"><div><p className="panel-kicker">Agenda</p><h2>{first.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}</h2></div><div className="calendar-nav"><button type="button" onClick={() => changeMonth(-1)} aria-label="Bulan sebelumnya"><Icon name="left" size={15} /></button><button type="button" onClick={() => changeMonth(1)} aria-label="Bulan berikutnya"><Icon name="right" size={15} /></button></div></div><div className="calendar-week">{['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'].map((day) => <span key={day}>{day}</span>)}</div><div className="calendar-days">{Array.from({ length: offset }).map((_, index) => <span className="calendar-empty" key={`empty-${index}`} />)}{Array.from({ length: days }, (_, index) => { const number = index + 1; const key = `${month}-${String(number).padStart(2, '0')}`; return <span className={marked.has(key) ? 'calendar-day marked' : 'calendar-day'} title={marked.get(key) || undefined} key={key}>{number}{marked.has(key) && <i />}</span> })}</div><div className="calendar-legend">{TYPES.map((type) => <span key={type}><i />{type}</span>)}</div></section>
}

export default function DashboardPage({ user, token, showTour, onTourOpen, onTourClose, onLogout }) {
  const [active, setActive] = useState(() => pageFromPath(window.location.pathname))
  const navigate = (type) => { const path = pagePath(type); if (window.location.pathname !== path) window.history.pushState({}, '', path); setActive(type) }
  const [query, setQuery] = useState('')
  const [rows, setRows] = useState([])
  const [saldo, setSaldo] = useState(null)
  const [month, setMonth] = useState(() => { const now = new Date(); return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}` })
  const [state, setState] = useState('loading')
  const [error, setError] = useState('')
  const [drawer, setDrawer] = useState(false)
  const [quickOpen, setQuickOpen] = useState(false)
  const [quickClosing, setQuickClosing] = useState(false)
  const quickRequestRef = useRef(null)

  const closeQuickMenu = () => {
    if (!quickOpen || quickClosing) return
    setQuickClosing(true)
    window.setTimeout(() => { setQuickOpen(false); setQuickClosing(false) }, 180)
  }

  useEffect(() => {
    const onPopState = () => setActive(pageFromPath(window.location.pathname))
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  useEffect(() => {
    if (!quickOpen) return undefined
    const closeOnOutsideClick = (event) => { if (!quickRequestRef.current?.contains(event.target)) closeQuickMenu() }
    document.addEventListener('pointerdown', closeOnOutsideClick)
    return () => document.removeEventListener('pointerdown', closeOnOutsideClick)
  }, [quickOpen, quickClosing])

  useEffect(() => {
    let alive = true
    Promise.allSettled([api('/cuti/transaksi', token), api('/izin/transaksi?type=1', token), api('/izin/transaksi?type=2', token), api('/travel/transaksi', token), api('/cuti/saldo?leaveType=1', token)]).then(([cuti, izin, khusus, travel, balance]) => {
      if (!alive) return
      const failed = [cuti, izin, khusus, travel].some((result) => result.status === 'rejected')
      setRows([...normalizeRows(cuti.status === 'fulfilled' ? cuti.value : null, 'Cuti'), ...normalizeRows(izin.status === 'fulfilled' ? izin.value : null, 'Izin'), ...normalizeRows(khusus.status === 'fulfilled' ? khusus.value : null, 'Cuti Khusus'), ...normalizeRows(travel.status === 'fulfilled' ? travel.value : null, 'Tugas Luar')].sort((a, b) => String(b.date || '').localeCompare(String(a.date || ''))))
      if (balance.status === 'fulfilled') setSaldo(balance.value)
      setError(failed ? 'Sebagian data belum dapat dimuat. Coba muat ulang.' : '')
      setState('ready')
    })
    return () => { alive = false }
  }, [token])

  const grouped = useMemo(() => Object.fromEntries(TYPES.map((type) => [type, rows.filter((row) => row.type === type)])), [rows])
  const today = new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  if (state === 'loading') return <div className="dashboard-loading">Memuat dashboard...</div>
  return <div className={drawer ? 'app-shell drawer-open' : 'app-shell'}><Sidebar active={active} onSelect={(type) => { navigate(type); setDrawer(false) }} user={user} onLogout={onLogout} />{drawer && <button className="drawer-overlay" type="button" aria-label="Tutup menu" onClick={() => setDrawer(false)} />}<div className="app-main"><TopBar user={user} query={query} setQuery={setQuery} onMenu={() => setDrawer((value) => !value)} onNavigate={navigate} onTour={onTourOpen} onLogout={onLogout} /><main className="dashboard-main page-transition" id="dashboard" key={active}>{active === 'Tugas Luar' ? <TugasLuarPage token={token} rows={grouped['Tugas Luar']} /> : active === 'Izin' ? <IzinPage token={token} rows={grouped.Izin} /> : active === 'Cuti Khusus' ? <IzinPage token={token} rows={grouped['Cuti Khusus']} special /> : active === 'Cuti' ? <CutiPage token={token} rows={grouped.Cuti} /> : active === 'My Profile' ? <ProfilePage token={token} user={user} /> : <><div className="greeting"><div><p className="panel-kicker">{today}</p><h1>Selamat {greeting()}, {formatPersonName(user?.name) || 'Pengguna'}!</h1><p>Kelola pengajuan cuti, izin, cuti khusus, dan tugas luar dengan mudah.</p></div><div className="quick-request" ref={quickRequestRef} data-tour="request"><button className="new-request-button" type="button" onClick={() => quickOpen ? closeQuickMenu() : setQuickOpen(true)} aria-expanded={quickOpen}><Icon name="plus" size={15} /> Ajukan baru</button>{quickOpen && <div className={quickClosing ? 'quick-menu quick-menu-closing' : 'quick-menu'} role="menu"><button type="button" role="menuitem" onClick={() => { navigate('Cuti'); closeQuickMenu() }}>Ajukan Cuti</button><button type="button" role="menuitem" onClick={() => { navigate('Cuti Khusus'); closeQuickMenu() }}>Ajukan Cuti Khusus</button><button type="button" role="menuitem" onClick={() => { navigate('Izin'); closeQuickMenu() }}>Ajukan Izin</button><button type="button" role="menuitem" onClick={() => { navigate('Tugas Luar'); closeQuickMenu() }}>Ajukan Tugas Luar</button></div>}</div></div>{error && <div className="dashboard-alert" role="alert">{error}</div>}<section className="summary-grid" aria-label="Ringkasan pengajuan" data-tour="summary">{TYPES.map((type) => <SummaryCard type={type} rows={grouped[type]} onOpen={() => navigate(type)} key={type} />)}</section><div className="dashboard-columns"><RecentRequests rows={rows} query={query} /><Calendar rows={rows} month={month} setMonth={setMonth} /></div><div className="dashboard-bottom"><section className="dashboard-panel breakdown-panel"><div className="panel-heading"><div><p className="panel-kicker">Ringkasan</p><h2>Status pengajuan</h2></div></div>{['pending', 'approved', 'rejected'].map((status) => <div className="breakdown-row" key={status}><span>{statusLabel(status)}</span><div><i style={{ width: `${rows.length ? Math.max(4, (rows.filter((row) => statusClass(row.status) === status).length / rows.length) * 100) : 4}%` }} /></div><strong>{rows.filter((row) => statusClass(row.status) === status).length}</strong></div>)}</section>{saldo && <section className="dashboard-panel balance-panel"><p className="panel-kicker">Saldo cuti</p><h2>{saldo.Saldo ?? '—'} hari</h2><p>Sisa saldo cuti reguler yang tersedia.</p><small>Data dari server · Quota {saldo.QuotaCuti ?? '—'} hari</small></section>}</div></>}</main>{showTour && <TourGuide user={user} onClose={onTourClose} />}</div></div>
}
