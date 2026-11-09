import { readFile, writeFile, mkdir, copyFile } from 'node:fs/promises'
import path from 'node:path'
import { dirs, root, repo } from './common.mjs'
const manifest = JSON.parse(await readFile(path.join(dirs.content, 'manifest.json'), 'utf8'))
const chapters = manifest.chapters.filter((item) => item.status === 'captured').map((item) => ({ id: item.id, title: item.title, assets: (item.assets || []).map((asset) => ({ path: `screenshots/${path.basename(asset.path)}` })), audio: item.audio ? `audio/${path.basename(item.audio)}` : '', narration: item.narration || '', duration: item.duration || 4 }))
const totalFrames = Math.max(30, Math.ceil(chapters.reduce((sum, item) => sum + item.duration, 0) * 30))
await mkdir(path.join(root, 'src'), { recursive: true })
await writeFile(path.join(root, 'src', 'data.ts'), `export const chapters = ${JSON.stringify(chapters)} as const\nexport const totalFrames = ${totalFrames}\n`)
await writeFile(path.join(root, 'src', 'Root.tsx'), `import { Composition } from 'remotion'\nimport { Tutorial } from './Tutorial'\nimport { totalFrames } from './data'\nexport const RemotionRoot = () => <Composition id="Tutorial" component={Tutorial} durationInFrames={totalFrames} fps={30} width={1920} height={1080} />\n`)
for (const chapter of manifest.chapters.filter((item) => item.status === 'captured')) for (const asset of chapter.assets || []) await copyFile(asset.path, path.join(dirs.public, 'screenshots', path.basename(asset.path))).catch(async () => { await mkdir(path.join(dirs.public, 'screenshots'), { recursive: true }); await copyFile(asset.path, path.join(dirs.public, 'screenshots', path.basename(asset.path))) })
for (const chapter of manifest.chapters.filter((item) => item.status === 'captured' && item.audio)) { await mkdir(path.join(dirs.public, 'audio'), { recursive: true }); await copyFile(chapter.audio, path.join(dirs.public, 'audio', path.basename(chapter.audio))) }
