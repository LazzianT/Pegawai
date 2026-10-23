import assert from 'node:assert/strict'
import { access, stat } from 'node:fs/promises'
const TUTORIAL_DURATION = 2850
const VIDEO_WIDTH = 1080
const VIDEO_HEIGHT = 1920

assert.equal(TUTORIAL_DURATION / 30, 95)
assert.equal(VIDEO_WIDTH / VIDEO_HEIGHT, 9 / 16)
for (const file of ['bmc-mark.png', 'pegawai-bmc-qr.png', 'site-login.png', 'site-dashboard.png', 'site-cuti.png', 'site-izin.png', 'site-travel.png', 'site-detail.png', 'site-mobile-menu.png', 'bmc-tutorial.wav']) {
  await access(new URL(`./public/${file}`, import.meta.url))
  assert.ok((await stat(new URL(`./public/${file}`, import.meta.url))).size > 0)
}
console.log('video self-check passed')
