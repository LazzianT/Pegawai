import { readFile, rename } from 'node:fs/promises'
import { spawn } from 'node:child_process'
import path from 'node:path'

const script = await readFile(new URL('./tutorial-script.txt', import.meta.url), 'utf8')
const output = path.resolve('remotion/public/bmc-tutorial.wav')
const temporary = `${output}.tmp`
const piper = path.resolve('remotion/piper/piper/piper.exe')
const model = path.resolve('remotion/piper/id_ID-news_tts-medium.onnx')

await new Promise((resolve, reject) => {
  const child = spawn(piper, ['--model', model, '--output_file', temporary], { windowsHide: true })
  let error = ''
  child.stderr.on('data', (chunk) => { error += chunk })
  child.on('error', reject)
  child.on('close', (code) => code === 0 ? resolve() : reject(new Error(error || `Piper exited with code ${code}`)))
  child.stdin.end(script)
})

await rename(temporary, output)
console.log('Audio Indonesia created: remotion/public/bmc-tutorial.wav')
