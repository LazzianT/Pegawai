import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium } from 'playwright-core';

const root = resolve(import.meta.dirname, '..');
const input = resolve(root, 'tutorial', 'index.html');
const output = resolve(root, 'dist', 'BMC-Online-Panduan-Penggunaan.pdf');
const chromePath = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

if (!existsSync(input)) throw new Error(`Sumber tutorial tidak ditemukan: ${input}`);
if (!existsSync(chromePath)) throw new Error(`Chrome tidak ditemukan. Set CHROME_PATH ke executable Chrome.`);

const browser = await chromium.launch({ executablePath: chromePath, headless: true });
try {
  const page = await browser.newPage();
  await page.goto(`file://${input.replaceAll('\\', '/')}`, { waitUntil: 'load' });
  await page.evaluate(async () => document.fonts.ready);
  await page.pdf({ path: output, format: 'A4', printBackground: true, preferCSSPageSize: true, displayHeaderFooter: false, margin: { top: 0, right: 0, bottom: 0, left: 0 } });
  console.log(`PDF dibuat: ${output}`);
} finally {
  await browser.close();
}
