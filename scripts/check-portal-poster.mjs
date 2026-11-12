import { existsSync, readFileSync, statSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const pdf = resolve(root, 'BMC-Online-Poster-Portal.pdf')
const png = resolve(root, 'BMC-Online-Poster-Portal.png')
const html = resolve(root, 'poster-portal', 'index.html')
const qr = resolve(root, 'poster-portal', 'assets', 'portal-qr.png')
const failures = []
const check = (condition, message) => { if (!condition) failures.push(message) }

for (const [file, label] of [[pdf, 'PDF'], [png, 'PNG'], [html, 'sumber poster'], [qr, 'QR asset']]) check(existsSync(file), `${label} tidak ditemukan: ${file}`)
if (failures.length) { failures.forEach((message) => console.error(`Gagal: ${message}`)); process.exit(1) }

const pdfBytes = readFileSync(pdf).toString('latin1')
const source = readFileSync(html, 'utf8')
const pages = (pdfBytes.match(/\/Type\s*\/Page\b/g) ?? []).length
check(statSync(pdf).size > 0, 'PDF kosong')
check(statSync(png).size > 0, 'PNG kosong')
check(statSync(qr).size > 0, 'QR asset kosong')
check(pages === 1, `Jumlah halaman ${pages}, expected 1`)
check(pdfBytes.includes('/Font'), 'PDF tidak memuat font untuk teks selectable')
for (const word of ['https://employee-portal.bmc.co.id', 'Cuti', 'Izin', 'Tugas Luar', 'Scan untuk membuka portal']) check(source.includes(word), `Sumber poster tidak memuat: ${word}`)
check(!/password|username|credential|kata sandi/i.test(source), 'Teks kredensial terdeteksi di sumber poster')
if (failures.length) { failures.forEach((message) => console.error(`Gagal: ${message}`)); process.exit(1) }
console.log(`Pemeriksaan poster portal lulus: ${pages} halaman, ${statSync(pdf).size} bytes PDF, ${statSync(png).size} bytes PNG`)
