import { existsSync, readFileSync, statSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const pdf = resolve(root, 'BMC-Online-Tutorial-Tugas-Luar.pdf')
const html = resolve(root, 'tutorial-tugas-luar', 'index.html')
const failures = []
const check = (condition, message) => { if (!condition) failures.push(message) }
check(existsSync(pdf), `PDF tidak ditemukan: ${pdf}`)
check(existsSync(html), `Sumber tutorial tidak ditemukan: ${html}`)
if (failures.length) { failures.forEach((message) => console.error(`Gagal: ${message}`)); process.exit(1) }
const pdfBytes = readFileSync(pdf).toString('latin1')
const source = readFileSync(html, 'utf8')
const pages = (pdfBytes.match(/\/Type\s*\/Page\b/g) ?? []).length
const size = statSync(pdf).size
check(size > 0, 'PDF kosong')
check(pages === 12, `Jumlah halaman ${pages}, expected 12`)
check(pdfBytes.includes('/Font'), 'PDF tidak memuat font untuk teks selectable')
for (const word of ['Pengaju', 'Atasan', 'Pengelola Kendaraan', 'Security', 'security.bmc.co.id', 'Catat Berangkat', 'Catat Kembali', 'Sedang Tugas Luar', 'Sudah Kembali Hari Ini', 'portal', 'https://employee-portal.bmc.co.id', 'WhatsApp', 'tautan approval', 'approval kendaraan', 'Dashboard Security', 'Scan QR untuk keberangkatan']) check(source.toLowerCase().includes(word.toLowerCase()), `Sumber tutorial tidak memuat: ${word}`)
check(!source.includes('07 / Ringkasan'), 'Nomor bagian ringkasan masih 07')
for (const stale of ['Scan lagi saat kembali', 'tunjukkan QR yang sama kepada Security', 'nomor plat bila menggunakan kendaraan operasional', 'Scan saat berangkat dan kembali']) check(!source.includes(stale), `Flow lama masih ada: ${stale}`)
check(!source.includes('Pengguna Demo') && !source.includes('Demo'), 'Nama demo masih ada di sumber tutorial')
if (failures.length) { failures.forEach((message) => console.error(`Gagal: ${message}`)); process.exit(1) }
console.log(`Pemeriksaan PDF Tugas Luar lulus: ${pages} halaman, ${size} bytes`)
