import { copyFile, mkdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { chromium } from 'playwright-core'

const root = resolve(import.meta.dirname, '..')
const input = resolve(root, 'tutorial-tugas-luar', 'index.html')
const output = resolve(root, 'BMC-Online-Tutorial-Tugas-Luar.pdf')
const distOutput = resolve(root, 'dist', 'BMC-Online-Tutorial-Tugas-Luar.pdf')
const chromePath = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'

if (!existsSync(input)) throw new Error(`Sumber tutorial tidak ditemukan: ${input}`)
if (!existsSync(chromePath)) throw new Error('Chrome tidak ditemukan. Set CHROME_PATH ke executable Chrome.')
for (const asset of ['styles.css', 'assets/bmc-mark.png', 'assets/travel-form.png', 'assets/supervisor-approval.png', 'assets/vehicle-approval.png', 'assets/qr-departure.png', 'assets/qr-return.png', 'assets/travel-history.png', 'assets/portal-qr.png', 'assets/whatsapp-approval.png', 'assets/whatsapp-pengelola.png', 'assets/security-dashboard.png', 'assets/security-scan-qr.png']) {
  if (!existsSync(resolve(root, 'tutorial-tugas-luar', asset))) throw new Error(`Aset tutorial tidak ditemukan: ${asset}`)
}
await mkdir(resolve(root, 'dist'), { recursive: true })
const browser = await chromium.launch({ executablePath: chromePath, headless: true })
try {
  const page = await browser.newPage()
  await page.goto(`file://${input.replaceAll('\\', '/')}`, { waitUntil: 'load' })
  await page.evaluate(async () => document.fonts.ready)
  await page.pdf({ path: output, format: 'A4', printBackground: true, preferCSSPageSize: true, displayHeaderFooter: false, margin: { top: 0, right: 0, bottom: 0, left: 0 } })
  await copyFile(output, distOutput)
  console.log(`PDF dibuat: ${output}`)
} finally {
  await browser.close()
}
