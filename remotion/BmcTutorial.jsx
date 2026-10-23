import '@fontsource/plus-jakarta-sans/400.css'
import '@fontsource/plus-jakarta-sans/600.css'
import '@fontsource/plus-jakarta-sans/700.css'
import { AbsoluteFill, Audio, Img, Sequence, interpolate, staticFile, useCurrentFrame, spring } from 'remotion'

const colors = { white: '#ffffff', navy: '#102a56', teal: '#0d9c9c', text: '#24334d', muted: '#63728a', line: '#dce4ed', pale: '#f5f8fb', wash: '#edf9f8' }

const scenes = [
  ['BMC Online', 'Urusan kerja, lebih mudah.', 'Panduan sederhana untuk mengajukan cuti, izin, dan tugas luar.', 'site-dashboard.png', 'Mulai', 0, 240],
  ['Sebelum mulai', 'Siapkan yang penting.', 'Siapkan NIP, password, tanggal, keterangan, dan nama atasan.', 'site-login.png', 'Persiapan', 240, 240],
  ['Masuk ke aplikasi', 'Buka employee-portal.bmc.co.id.', 'Masukkan NIP dan password, lalu tekan Masuk.', 'site-login.png', '01', 480, 270],
  ['Menu utama', 'Lihat pengajuan di satu tempat.', 'Gunakan menu untuk membuat pengajuan baru dan melihat pengajuan sebelumnya.', 'site-dashboard.png', '02', 750, 300],
  ['Ajukan cuti', 'Pilih tanggal cuti.', 'Periksa sisa cuti, pilih tanggal, tulis keterangan, lalu pilih atasan.', 'site-cuti.png', '03', 1050, 330],
  ['Ajukan izin', 'Jelaskan keperluannya.', 'Pilih keperluan, isi tanggal, tambahkan jam bila perlu, lalu kirim.', 'site-izin.png', '04', 1380, 330],
  ['Tugas luar', 'Catat kegiatan di luar kantor.', 'Isi tanggal, jam keluar, tujuan, dan nama atasan. Keterangan tugas boleh diisi.', 'site-travel.png', '05', 1710, 330],
  ['Cek riwayat', 'Pantau sampai selesai.', 'Lihat nomor pengajuan dan statusnya: Menunggu, Disetujui, atau Ditolak.', 'site-detail.png', '06', 2040, 270],
  ['Pesan WhatsApp', 'Atasan menerima pemberitahuan.', 'Pastikan nomor WhatsApp atasan benar. Jika belum menerima pesan, hubungi admin.', 'site-mobile-menu.png', '07', 2310, 270],
  ['Selesai', 'Ajukan. Pantau. Beres.', 'Simpan nomor pengajuan untuk memudahkan pengecekan berikutnya.', 'site-dashboard.png', 'Penutup', 2580, 270],
]

const clamp = (value, input, output) => interpolate(value, input, output, { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })

const Header = ({ label, index }) => (
  <div style={{ display: 'flex', alignItems: 'center', height: 76, color: colors.navy }}>
    <Img src={staticFile('bmc-mark.png')} style={{ width: 48, height: 48, objectFit: 'contain', marginRight: 14 }} />
    <div style={{ fontSize: 28, fontWeight: 700 }}>BMC <span style={{ color: colors.teal }}>Online</span></div>
    <div style={{ marginLeft: 'auto', color: colors.teal, fontSize: 17, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase' }}>{label}</div>
    <div style={{ marginLeft: 22, color: colors.muted, fontSize: 18 }}>{String(index).padStart(2, '0')}</div>
  </div>
)

const Qr = () => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: 14, border: `1px solid ${colors.line}`, borderRadius: 16, background: colors.white }}>
    <Img src={staticFile('pegawai-bmc-qr.png')} style={{ width: 104, height: 104, imageRendering: 'pixelated' }} />
    <div style={{ color: colors.navy, fontSize: 18, lineHeight: 1.35 }}><strong>Scan untuk membuka</strong><br /><span style={{ color: colors.muted, fontSize: 16 }}>employee-portal.bmc.co.id</span></div>
  </div>
)

const Scene = ({ title, subtitle, text, image, label, index, duration }) => {
  const frame = useCurrentFrame()
  const enter = spring({ frame, fps: 30, config: { damping: 18, stiffness: 90 } })
  const opacity = clamp(frame, [0, 12, duration - 18, duration], [0, 1, 1, 0])
  const shift = interpolate(enter, [0, 1], [45, 0])
  const imageScale = interpolate(enter, [0, 1], [0.96, 1])
  const isCover = index === 1
  return (
    <AbsoluteFill style={{ opacity, padding: '54px 54px 46px', background: colors.white, color: colors.text, fontFamily: '"Plus Jakarta Sans", Arial, sans-serif' }}>
      <Header label={label} index={index} />
      <div style={{ position: 'absolute', top: 0, right: 0, width: 420, height: 420, borderRadius: '50%', border: `1px solid ${colors.teal}`, opacity: 0.16, transform: 'translate(35%,-35%)' }} />
      <div style={{ position: 'absolute', top: 112, right: 115, width: 170, height: 170, borderRadius: '50%', border: `1px solid ${colors.teal}`, opacity: 0.12 }} />
      <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100% - 76px)', paddingTop: 74, transform: `translateY(${shift}px)` }}>
        <div style={{ color: colors.teal, fontSize: 18, fontWeight: 700, letterSpacing: 3, textTransform: 'uppercase' }}>{isCover ? 'Panduan pengguna' : `Langkah ${index - 1}`}</div>
        <h1 style={{ margin: '18px 0 0', maxWidth: 850, color: colors.navy, fontSize: isCover ? 72 : 64, lineHeight: 1.06, letterSpacing: -3, fontWeight: 700 }}>{title}</h1>
        <h2 style={{ margin: '20px 0 0', color: colors.teal, fontSize: 34, lineHeight: 1.2, letterSpacing: -1, fontWeight: 600 }}>{subtitle}</h2>
        <p style={{ margin: '20px 0 0', maxWidth: 820, color: colors.muted, fontSize: 25, lineHeight: 1.5 }}>{text}</p>
        {isCover && <div style={{ marginTop: 30 }}><Qr /></div>}
        <div style={{ position: 'relative', flex: 1, minHeight: 760, marginTop: isCover ? 28 : 48, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div style={{ position: 'absolute', width: 760, height: 760, borderRadius: '50%', border: `1px solid ${colors.teal}`, opacity: 0.11 }} />
          <div style={{ position: 'relative', width: isCover ? 620 : 760, height: isCover ? 690 : 760, padding: 18, overflow: 'hidden', border: `1px solid ${colors.line}`, borderRadius: 30, background: colors.pale, boxShadow: '0 22px 54px rgba(16,42,86,.12)', transform: `rotate(${isCover ? 2 : 0}deg) scale(${imageScale})` }}>
            <Img src={staticFile(image)} style={{ width: '100%', height: '100%', objectFit: 'contain', objectPosition: 'top center', borderRadius: 20 }} />
            <div style={{ position: 'absolute', right: 24, bottom: 24, padding: '11px 18px', borderRadius: 10, background: colors.teal, color: colors.white, fontSize: 17, fontWeight: 600 }}>{isCover ? 'Dashboard' : 'BMC Online'}</div>
          </div>
        </div>
      </div>
      <div style={{ position: 'absolute', right: 54, bottom: 40, left: 54, borderBottom: `1px solid ${colors.line}` }} />
    </AbsoluteFill>
  )
}

export const BmcTutorial = () => <AbsoluteFill>{scenes.map(([title, subtitle, text, image, label, from, duration], index) => <Sequence key={title} from={from} durationInFrames={duration}><Scene title={title} subtitle={subtitle} text={text} image={image} label={label} index={index + 1} duration={duration} /></Sequence>)}<Audio src={staticFile('bmc-tutorial.wav')} volume={0.9} /></AbsoluteFill>

export const TUTORIAL_DURATION = 2850
