import { access, readFile, rename, writeFile } from 'node:fs/promises'
import { spawn } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { config, dirs, ensureDirs, localPath, repo } from './common.mjs'
await ensureDirs()
const provider = (config.TTS_PROVIDER || 'edge').toLowerCase()
const edgeTtsModule = pathToFileURL(config.EDGE_TTS_PATH || path.join(repo, 'node_modules', 'edge-tts', 'out', 'index.js')).href
const piper = localPath(config.PIPER_PATH, '../remotion/piper/piper/piper.exe')
const model = localPath(config.PIPER_MODEL, '../remotion/piper/id_ID-news_tts-medium.onnx')
if (provider === 'local') { await access(piper); await access(model) }
if (!['edge', 'local'].includes(provider)) throw new Error('TTS_PROVIDER harus edge atau local')
const manifest = JSON.parse(await readFile(path.join(dirs.content, 'manifest.json'), 'utf8'))
const texts = {
  dashboard: 'Selamat datang di aplikasi administrasi karyawan. Pada dashboard, pilih menu untuk mengajukan cuti, izin, atau tugas luar.',
  cuti: 'Untuk mengajukan cuti, buka menu Cuti. Periksa saldo, pilih tanggal yang tersedia, isi keterangan, lalu pilih atasan.',
  izin: 'Untuk mengajukan izin, pilih keperluan, isi tanggal mulai dan selesai, tambahkan jam bila diperlukan, lalu pilih atasan.',
  'tugas-luar': 'Untuk tugas luar, isi tanggal, jam keluar, tujuan, serta atasan. Keterangan tugas bersifat opsional.',
}
for (const chapter of manifest.chapters.filter((item) => item.status === 'captured')) {
  const text = texts[chapter.id] || chapter.title
  const txt = path.join(dirs.narration, `${chapter.id}.txt`)
  const audio = path.join(dirs.audio, `${chapter.id}.${provider === 'edge' ? 'mp3' : 'wav'}`)
  await writeFile(txt, text)
  const temp = `${audio}.tmp`
  if (provider === 'edge') {
    const { ttsSave } = await import(edgeTtsModule)
    await ttsSave(text, temp, { voice: config.TTS_VOICE_ID || 'id-ID-ArdiNeural' })
  } else {
    await new Promise((resolve, reject) => { const child = spawn(piper, ['--model', model, '--output_file', temp], { windowsHide: true }); let error = ''; child.stderr.on('data', (chunk) => { error += chunk }); child.on('error', reject); child.on('close', (code) => code === 0 ? resolve() : reject(new Error(error || `Piper exited ${code}`))); child.stdin.end(text) })
  }
  await rename(temp, audio)
  chapter.narration = text
  chapter.audio = audio
}
await writeFile(path.join(dirs.content, 'manifest.json'), JSON.stringify(manifest, null, 2))
console.log('Narasi lokal selesai.')
