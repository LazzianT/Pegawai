import { chromium } from 'playwright-core'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'

const output = path.resolve('tutorial-tugas-luar/assets')
const browser = await chromium.launch({ executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', headless: true })
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 })
await mkdir(output, { recursive: true })

const travel = { id: 'T.USER.001', qrToken: 'abcdef0123456789abcdef0123456789abcdef0123456789', tujuan: 'Kantor cabang Bandung', alasan: 'Koordinasi operasional', tanggal: '2026-11-05', tanggalMulai: '2026-11-05', tanggalSelesai: null, jamMulai: '08:00', jamSelesai: null, status: 'approved', currentLevel: 3, vehicleType: 'MOTOR', vehiclePlate: 'B 3054 KSS' }
await page.route('**/api/**', async (route) => {
  const url = new URL(route.request().url())
  const body = url.pathname.includes('/travel/qr/') ? { data: url.pathname.endsWith('1234567890abcdef1234567890abcdef1234567890abcdef') ? { ...travel, tanggalKembali: '2026-11-05', jamKembali: '16:30' } : travel }
    : url.pathname.endsWith('/travel/transaksi') ? { data: [travel] }
      : url.pathname.endsWith('/travel/atasan') ? { data: [{ nip: '19870001', name: 'Budi Santoso', departemen: 'HC' }] }
        : url.pathname.endsWith('/user/profile') ? { nip: 'USER001', name: 'User', email: 'user@example.test', jabatan: 'Karyawan', department: 'HC' }
          : url.pathname.endsWith('/travel/approval/atasan/approval-token-user-001') ? { data: { ...travel, statusId: 2, nama: 'User' } }
            : url.pathname.endsWith('/travel/approval/kendaraan/vehicle-token-user-001') ? { data: { ...travel, statusId: 2, nama: 'User' } }
              : { data: [] }
  await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) })
})
const save = (name) => page.screenshot({ path: path.join(output, name), fullPage: false })
const setSession = async () => page.evaluate(() => {
  localStorage.setItem('bmc.auth.token', 'user-session')
  localStorage.setItem('bmc.auth.user', JSON.stringify({ id: 'USER001', name: 'User', jabatan: 'Karyawan', department: 'HC' }))
  localStorage.setItem('bmc.tour.seen', '1')
})
await page.goto('http://127.0.0.1:5174/', { waitUntil: 'networkidle' })
await setSession()
await page.goto('http://127.0.0.1:5174/tugas-luar', { waitUntil: 'networkidle' })
await page.waitForTimeout(300)
await save('travel-form.png')
await page.goto('http://127.0.0.1:5174/approval/atasan/approval-token-user-001', { waitUntil: 'networkidle' })
await page.locator('.pending-travel-card').waitFor({ state: 'visible', timeout: 10000 })
await save('supervisor-approval.png')
await page.goto('http://127.0.0.1:5174/approval/kendaraan/vehicle-token-user-001', { waitUntil: 'networkidle' })
await page.locator('.pending-travel-card').waitFor({ state: 'visible', timeout: 10000 })
await save('vehicle-approval.png')
await page.goto('http://127.0.0.1:5174/travel/qr/T.USER.001/abcdef0123456789abcdef0123456789abcdef0123456789', { waitUntil: 'networkidle' })
await page.waitForTimeout(300)
await save('qr-departure.png')
await page.goto('http://127.0.0.1:5174/travel/qr/T.USER.001/1234567890abcdef1234567890abcdef1234567890abcdef', { waitUntil: 'networkidle' })
await page.waitForTimeout(300)
await save('qr-return.png')
await page.goto('http://127.0.0.1:5174/dashboard', { waitUntil: 'networkidle' })
await page.waitForTimeout(400)
await save('travel-history.png')
await browser.close()
console.log('Captured Tugas Luar tutorial screens for User')
