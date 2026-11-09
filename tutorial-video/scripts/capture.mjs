import { chromium } from 'playwright-core'
import { access, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { config, dirs, ensureDirs, localPath } from './common.mjs'
if (!config.APP_BASE_URL) throw new Error('APP_BASE_URL wajib diisi')
try { await access(localPath('.auth/storage-state.json', '.auth/storage-state.json')) } catch { throw new Error('Sesi belum ada. Jalankan npm run auth.') }
await ensureDirs()
const browser = await chromium.launch({ executablePath: config.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', headless: true })
const context = await browser.newContext({ storageState: localPath('.auth/storage-state.json', '.auth/storage-state.json'), viewport: { width: 1920, height: 1080 }, recordVideo: { dir: dirs.recordings, size: { width: 1920, height: 1080 } } })
const page = await context.newPage()
const scenes = [
  ['dashboard', '/dashboard', 'Dashboard'],
  ['cuti', '/cuti', 'Pengajuan Cuti'],
  ['izin', '/izin', 'Pengajuan Izin'],
  ['cuti-khusus', '/cuti-khusus', 'Cuti Khusus'],
  ['tugas-luar', '/tugas-luar', 'Tugas Luar'],
  ['profile', '/profile', 'Profil Pengguna'],
]
const captured = []
await page.goto(config.APP_BASE_URL, { waitUntil: 'networkidle' })
const authenticated = await page.getByRole('heading', { name: /selamat pagi|selamat datang/i }).isVisible().catch(() => false) || await page.getByRole('link', { name: /HR Management|BMC Online/i }).isVisible().catch(() => false)
if (!authenticated) throw new Error(`Sesi kedaluwarsa atau login belum selesai: ${page.url()}`)
for (const [id, route, title] of scenes) {
  await page.goto(new URL(route, config.APP_BASE_URL).href, { waitUntil: 'networkidle' })
  const routeAuthenticated = await page.getByRole('link', { name: /HR Management|BMC Online/i }).isVisible().catch(() => false) || await page.getByRole('heading', { name: /selamat pagi|selamat datang|pengajuan/i }).isVisible().catch(() => false)
  if (!routeAuthenticated) throw new Error(`Sesi kedaluwarsa saat membuka ${route}: ${page.url()}`)
  const file = path.join(dirs.screenshots, `${id}.png`)
  await page.screenshot({ path: file, fullPage: false })
  captured.push({ id, title, route, status: 'captured', assets: [{ path: file, width: 1920, height: 1080 }] })
}
await context.close()
await browser.close()
await writeFile(path.join(dirs.content, 'manifest.json'), JSON.stringify({ project: 'Employee Application Tutorial', resolution: '1920x1080', fps: 30, capturedAt: new Date().toISOString(), chapters: captured }, null, 2))
console.log(`Capture selesai: ${captured.filter((x) => x.status === 'captured').length}/${captured.length}`)
