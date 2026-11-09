import { chromium } from 'playwright-core'
import { mkdir, writeFile } from 'node:fs/promises'
import { config, dirs, localPath } from './common.mjs'
if (!config.APP_BASE_URL) throw new Error('APP_BASE_URL wajib diisi')
const browser = await chromium.launch({ executablePath: config.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', headless: false })
const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } })
const page = await context.newPage()
await page.goto(config.APP_BASE_URL, { waitUntil: 'domcontentloaded' })
const password = config.APP_PASSWORD
if (config.APP_USERNAME && password) {
  const user = page.getByLabel(/NIP|username|email/i).first()
  const pass = page.getByLabel(/password/i).first()
  if (await user.isVisible().catch(() => false) && await pass.isVisible().catch(() => false)) {
    await user.fill(config.APP_USERNAME)
    await pass.fill(password)
    await page.getByRole('button', { name: /masuk|login/i }).click()
  }
}
await page.waitForLoadState('networkidle').catch(() => {})
const authenticated = await page.getByRole('heading', { name: /selamat pagi|selamat datang/i }).isVisible().catch(() => false) || await page.getByRole('link', { name: /HR Management|BMC Online/i }).isVisible().catch(() => false)
if (!authenticated) {
  console.log('Selesaikan MFA/CAPTCHA bila tampil. Tekan Enter di terminal setelah sesi terautentikasi.')
  await new Promise((resolve) => process.stdin.once('data', resolve))
  if (/login|masuk/i.test(page.url()) || await page.getByLabel(/password/i).first().isVisible().catch(() => false)) throw new Error('Sesi belum terautentikasi.')
}
await mkdir(dirs.auth, { recursive: true })
await context.storageState({ path: localPath('.auth/storage-state.json', '.auth/storage-state.json') })
await browser.close()
console.log('Authentication state tersimpan lokal. Tidak termasuk deliverable.')
