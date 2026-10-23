import { readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

const pdf = resolve(import.meta.dirname, '..', 'dist', 'BMC-Online-Panduan-Penggunaan.pdf');
const bytes = readFileSync(pdf);
const text = bytes.toString('latin1');
const pages = (text.match(/\/Type\s*\/Page\b/g) ?? []).length;
const size = statSync(pdf).size;

console.assert(size > 0, 'PDF kosong');
console.assert(pages === 10, `Jumlah halaman ${pages}, expected 10`);
console.assert(text.includes('/Font'), 'PDF tidak memuat font untuk teks selectable');
console.log(`Pemeriksaan PDF lulus: ${pages} halaman, ${size} bytes`);
