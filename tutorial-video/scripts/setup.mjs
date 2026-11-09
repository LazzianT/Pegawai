import { access } from 'node:fs/promises'
import { ensureDirs, config, dirs } from './common.mjs'
await ensureDirs()
if (!config.APP_BASE_URL) { console.error('APP_BASE_URL belum dikonfigurasi. Salin .env.example menjadi .env lalu isi URL aplikasi.'); process.exitCode = 1 } else { console.log(`Konfigurasi dasar siap: ${config.APP_BASE_URL}`) }
for (const [name, file] of [['Chrome', config.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe']]) { try { await access(file); console.log(`${name}: siap`) } catch { console.error(`${name}: tidak ditemukan di ${file}`); process.exitCode = 1 } }
console.log(`Direktori: ${dirs.out}`)
