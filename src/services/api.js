const API_BASE_URL = (import.meta.env?.VITE_API_BASE_URL || '/api').replace(/\/$/, '')

export async function sha1(value) {
  const bytes = new TextEncoder().encode(value)
  if (globalThis.crypto?.subtle) {
    const hash = await globalThis.crypto.subtle.digest('SHA-1', bytes)
    return [...new Uint8Array(hash)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
  }
  const words = new Uint32Array(Math.ceil((bytes.length + 9) / 64) * 16)
  bytes.forEach((byte, index) => { words[index >> 2] |= byte << (24 - (index % 4) * 8) })
  words[bytes.length >> 2] |= 0x80 << (24 - (bytes.length % 4) * 8)
  const bits = bytes.length * 8
  words[words.length - 2] = Math.floor(bits / 0x100000000)
  words[words.length - 1] = bits >>> 0
  let [a, b, c, d, e] = [0x67452301, 0xefcdab89, 0x98badcfe, 0x10325476, 0xc3d2e1f0]
  for (let offset = 0; offset < words.length; offset += 16) {
    const w = Array.from(words.slice(offset, offset + 16))
    for (let i = 16; i < 80; i++) w[i] = ((w[i - 3] ^ w[i - 8] ^ w[i - 14] ^ w[i - 16]) << 1 | (w[i - 3] ^ w[i - 8] ^ w[i - 14] ^ w[i - 16]) >>> 31) >>> 0
    const start = [a, b, c, d, e]
    for (let i = 0; i < 80; i++) {
      const f = i < 20 ? (b & c) | (~b & d) : i < 40 ? b ^ c ^ d : i < 60 ? (b & c) | (b & d) | (c & d) : b ^ c ^ d
      const k = i < 20 ? 0x5a827999 : i < 40 ? 0x6ed9eba1 : i < 60 ? 0x8f1bbcdc : 0xca62c1d6
      const rotate = (a << 5 | a >>> 27) >>> 0
      const next = (rotate + f + e + k + w[i]) >>> 0
      ;[e, d, c, b, a] = [d, c, (b << 30 | b >>> 2) >>> 0, a, next]
    }
    ;[a, b, c, d, e] = [a + start[0], b + start[1], c + start[2], d + start[3], e + start[4]].map((value) => value >>> 0)
  }
  return [a, b, c, d, e].map((value) => value.toString(16).padStart(8, '0')).join('')
}

export class ApiError extends Error {
  constructor(message, status = 0) { super(message); this.status = status }
}

export async function publicApi(path) {
  const response = await fetch(`${API_BASE_URL}${path}`)
  const data = await response.json().catch(() => null)
  if (!response.ok) throw new ApiError(data?.error || 'Data tidak dapat dimuat.', response.status)
  return data
}

export async function api(path, token, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(options.headers || {}) },
  })
  const data = await response.json().catch(() => null)
  if (response.status === 401) throw new ApiError('Sesi berakhir, silakan masuk lagi', 401)
  if (!response.ok) throw new ApiError(data?.error || 'Data tidak dapat dimuat.', response.status)
  return data
}

export async function login(identifier, password, signal) {
  const response = await fetch(`${API_BASE_URL}/user/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: identifier, password: await sha1(password) }),
    signal,
  })
  const data = await response.json().catch(() => null)
  if (!response.ok) throw new ApiError(response.status === 401 ? 'NIP atau password salah' : 'Login gagal. Coba lagi.', response.status)
  if (!data?.token || !data?.user) throw new ApiError('Respons login tidak valid', response.status)
  return data
}
