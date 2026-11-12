import { copyFile, mkdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { chromium } from 'playwright-core'

const root = resolve(import.meta.dirname, '..')
const input = resolve(root, 'poster-portal', 'index.html')
const outputPdf = resolve(root, 'BMC-Online-Poster-Portal.pdf')
const outputPng = resolve(root, 'BMC-Online-Poster-Portal.png')
const chromePath = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'

if (!existsSync(input)) throw new Error(`Sumber poster tidak ditemukan: ${input}`)
if (!existsSync(resolve(root, 'poster-portal', 'styles.css'))) throw new Error('Aset poster tidak ditemukan: styles.css')
if (!existsSync(resolve(root, 'poster-portal', 'assets', 'portal-qr.png'))) throw new Error('Aset poster tidak ditemukan: assets/portal-qr.png')
if (!existsSync(chromePath)) throw new Error('Chrome tidak ditemukan. Set CHROME_PATH ke executable Chrome.')

const browser = await chromium.launch({ executablePath: chromePath, headless: true })
try {
  const page = await browser.newPage({ viewport: { width: 794, height: 1123 }, deviceScaleFactor: 2 })
  await page.goto(`file://${input.replaceAll('\\', '/')}`, { waitUntil: 'load' })
  await page.evaluate(async () => document.fonts.ready)
  await page.pdf({ path: outputPdf, format: 'A4', printBackground: true, preferCSSPageSize: true, displayHeaderFooter: false, margin: { top: 0, right: 0, bottom: 0, left: 0 } })
  await page.screenshot({ path: outputPng, fullPage: true, type: 'png' })
  console.log(`Poster dibuat: ${outputPdf}`)
  console.log(`Preview dibuat: ${outputPng}`)
} finally {
  await browser.close()
}
