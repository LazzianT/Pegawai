import { mkdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)))
export const repo = path.resolve(root, '..')
export const env = Object.fromEntries((await readFile(path.join(root, '.env'), 'utf8').catch(() => '')).split(/\r?\n/).filter((line) => line && !line.startsWith('#')).map((line) => { const i = line.indexOf('='); return i < 0 ? [line, ''] : [line.slice(0, i), line.slice(i + 1)] }))
export const config = { ...env, ...Object.fromEntries(Object.entries(process.env).filter(([key]) => key !== 'NODE_OPTIONS')) }
export const dirs = {
  assets: path.join(root, 'assets'), screenshots: path.join(root, 'assets', 'screenshots'), recordings: path.join(root, 'assets', 'recordings'), audio: path.join(root, 'assets', 'audio'), content: path.join(root, 'content'), narration: path.join(root, 'content', 'narration'), subtitles: path.join(root, 'subtitles'), out: path.join(root, 'out'), auth: path.join(root, '.auth'), public: path.join(root, 'public'),
}
export const ensureDirs = () => Promise.all(Object.values(dirs).map((dir) => mkdir(dir, { recursive: true })))
export const localPath = (value, fallback) => path.resolve(root, value || fallback)
export const ffprobe = path.join(repo, 'node_modules', '@remotion', 'compositor-win32-x64-msvc', 'ffprobe.exe')
export const ffmpeg = path.join(repo, 'node_modules', '@remotion', 'compositor-win32-x64-msvc', 'ffmpeg.exe')
export function durationTimestamp(seconds) { const ms = Math.max(0, Math.round(seconds * 1000)); const h = Math.floor(ms / 3600000); const m = Math.floor(ms / 60000) % 60; const s = Math.floor(ms / 1000) % 60; return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')},${String(ms % 1000).padStart(3, '0')}` }
