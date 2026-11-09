import { access, stat, readFile } from 'node:fs/promises'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { dirs, ffprobe } from './common.mjs'
const file = path.join(dirs.out, 'tutorial-final.mp4')
await access(file)
if ((await stat(file)).size === 0) throw new Error('MP4 kosong')
const probe = await new Promise((resolve, reject) => { const p = spawn(ffprobe, ['-v', 'error', '-show_entries', 'stream=codec_name,width,height,r_frame_rate,codec_type', '-of', 'json', file], { windowsHide: true }); let out = ''; p.stdout.on('data', (x) => { out += x }); p.on('error', reject); p.on('close', (code) => code ? reject(new Error(`ffprobe exited ${code}`)) : resolve(JSON.parse(out))) })
const streams = probe.streams || []
const video = streams.find((stream) => stream.codec_type === 'video')
if (!video || video.codec_name !== 'h264' || video.width !== 1920 || video.height !== 1080) throw new Error('Video harus H.264 1920x1080')
if (!streams.some((stream) => stream.codec_type === 'audio' && stream.codec_name === 'aac')) throw new Error('Audio AAC tidak ada')
await access(path.join(dirs.subtitles, 'tutorial-id.srt')); await access(path.join(dirs.subtitles, 'tutorial-id.vtt'))
const manifest = JSON.parse(await readFile(path.join(dirs.content, 'manifest.json'), 'utf8'))
console.log(JSON.stringify({ file, bytes: (await stat(file)).size, video, captured: manifest.chapters.filter((x) => x.status === 'captured').length }, null, 2))
