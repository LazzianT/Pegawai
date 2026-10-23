import { chromium } from 'playwright-core'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'

const output = path.resolve('remotion/public')
const browser = await chromium.launch({ executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', headless: true })
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 })
await mkdir(output, { recursive: true })

await page.route('**/api/**', async (route) => {
  const url = new URL(route.request().url())
  const body = url.pathname.endsWith('/cuti/transaksi') ? { data: [{ id: 'C.DEMO.001', jenis: 'Cuti Tahunan', alasan: 'Keperluan keluarga', hari: '2 hari', periode: '2026-11-05, 2026-11-06', status: 'Propose' }] }
    : url.pathname.endsWith('/izin/transaksi') ? { data: [{ id: 'IZ.DEMO.001', jenis: 'Keperluan pribadi', alasan: 'Urusan administrasi', tanggal: '2026-10-28', status: 'Propose' }] }
      : url.pathname.endsWith('/travel/transaksi') ? { data: [{ id: 'T.DEMO.001', jenis: 'Kantor cabang Bandung', alasan: 'Koordinasi operasional', tanggalMulai: '2026-10-30', tanggalSelesai: null, jamMulai: '08:00', jamSelesai: null, status: 'pending' }] }
        : url.pathname.endsWith('/cuti/saldo') ? { Saldo: 8, QuotaCuti: 12 }
          : url.pathname.endsWith('/cuti/atasan') || url.pathname.endsWith('/travel/atasan') ? { data: [{ nip: '19870001', name: 'Budi Santoso', departID: 'D01', departemen: 'HC', jobSeq: 1 }] }
            : url.pathname.endsWith('/izin/keperluan') ? { data: [{ idSubGroup: 11, subDetail: 'Keperluan pribadi', numDays: 1, docSupport: '' }] }
              : url.pathname.endsWith('/user/profile') ? { nip: 'DEMO001', name: 'User', email: 'demo@example.test', phone: '081234567890', jabatan: 'Karyawan', department: 'Demo' }
                : { data: [] }
  await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) })
})

const save = (name) => page.screenshot({ path: path.join(output, name), fullPage: false })
await page.goto('http://127.0.0.1:5174/', { waitUntil: 'networkidle' })
await save('site-login.png')
await page.evaluate(() => {
  localStorage.setItem('bmc.auth.token', 'demo-video-session')
  localStorage.setItem('bmc.auth.user', JSON.stringify({ id: 'DEMO001', name: 'User', jabatan: 'Karyawan', department: 'Demo' }))
  localStorage.setItem('bmc.tour.seen', '1')
})
await page.goto('http://127.0.0.1:5174/dashboard', { waitUntil: 'networkidle' })
await page.waitForTimeout(500)
await save('site-dashboard.png')
await page.evaluate(() => localStorage.removeItem('bmc.tour.seen'))
await page.reload({ waitUntil: 'networkidle' })
await page.waitForTimeout(250)
await save('site-tour.png')
await page.locator('.tour-card .primary-button').first().click()
await page.locator('.tour-actions .secondary-button').click()
await page.locator('.new-request-button').click()
await save('site-quick-request.png')
await page.locator('.quick-menu button').first().click()
await page.waitForTimeout(250)
await save('site-cuti.png')
await page.goto('http://127.0.0.1:5174/izin', { waitUntil: 'networkidle' })
await page.waitForTimeout(250)
await save('site-izin.png')
await page.goto('http://127.0.0.1:5174/travel', { waitUntil: 'networkidle' })
await page.waitForTimeout(250)
await save('site-travel.png')
await page.goto('http://127.0.0.1:5174/dashboard', { waitUntil: 'networkidle' })
await page.waitForTimeout(250)
await page.locator('.request-row-button').first().click()
await save('site-detail.png')
await page.locator('.detail-close').click()
await page.locator('.top-user').click()
await save('site-profile-menu.png')
await page.getByRole('menuitem', { name: 'My Profile' }).click()
await page.waitForTimeout(250)
await save('site-profile.png')
await page.goto('http://127.0.0.1:5174/dashboard', { waitUntil: 'networkidle' })
await page.waitForTimeout(250)
await save('site-mobile.png')
await page.locator('.menu-button').click()
await save('site-mobile-menu.png')
await browser.close()
console.log('Captured actual BMC Online screens in remotion/public')
