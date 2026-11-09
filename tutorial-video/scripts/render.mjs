import { readFile } from 'node:fs/promises'
import { spawn } from 'node:child_process'
import path from 'node:path'
import { dirs, root } from './common.mjs'
await import('./build-source.mjs')
const mode = process.argv[2] === 'preview' ? 'preview' : 'final'
const entry = path.join(root, 'src', 'index.ts')
const output = path.join(dirs.out, mode === 'preview' ? 'tutorial-preview.mp4' : 'tutorial-final.mp4')
const args = ['remotion', 'render', entry, 'Tutorial', output, '--public-dir', dirs.public, '--config', path.join(root, 'remotion.config.mjs'), '--concurrency=2']
if (mode === 'preview') args.push('--frames=0-300')
await new Promise((resolve, reject) => { const p = spawn(process.platform === 'win32' ? 'npx.cmd' : 'npx', args, { cwd: root, stdio: 'inherit', shell: true }); p.on('error', reject); p.on('close', (code) => code ? reject(new Error(`Remotion exited ${code}`)) : resolve()) })
console.log(`Render selesai: ${output}`)
