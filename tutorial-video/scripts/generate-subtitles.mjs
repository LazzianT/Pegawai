import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { dirs, durationTimestamp, ffprobe } from './common.mjs'
import { spawn } from 'node:child_process'
const probe = (file) => new Promise((resolve, reject) => { const p = spawn(ffprobe, ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', file], { windowsHide: true }); let out = ''; p.stdout.on('data', (x) => { out += x }); p.on('error', reject); p.on('close', (code) => code ? reject(new Error(`ffprobe exited ${code}`)) : resolve(Number(out.trim()))) })
const manifest = JSON.parse(await readFile(path.join(dirs.content, 'manifest.json'), 'utf8'))
let time = 0; const rows = []
for (const chapter of manifest.chapters.filter((item) => item.status === 'captured' && item.audio)) { const duration = await probe(chapter.audio); chapter.duration = duration; rows.push([durationTimestamp(time), durationTimestamp(time + duration), chapter.narration]); time += duration }
const srt = rows.map(([start, end, text], i) => `${i + 1}\n${start} --> ${end}\n${text}\n`).join('\n')
const vtt = `WEBVTT\n\n${rows.map(([start, end, text]) => `${start.replace(',', '.')} --> ${end.replace(',', '.')}\n${text}\n`).join('\n')}`
await writeFile(path.join(dirs.subtitles, 'tutorial-id.srt'), srt); await writeFile(path.join(dirs.subtitles, 'tutorial-id.vtt'), vtt); await writeFile(path.join(dirs.content, 'manifest.json'), JSON.stringify(manifest, null, 2)); console.log(`Subtitle selesai: ${rows.length} segmen, ${time.toFixed(2)} detik.`)
