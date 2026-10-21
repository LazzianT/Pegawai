const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api').replace(/\/$/, '')

async function sha1(value) {
  const bytes = new TextEncoder().encode(value)
  const hash = await crypto.subtle.digest('SHA-1', bytes)
  return [...new Uint8Array(hash)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

export class ApiError extends Error {
  constructor(message, status = 0) { super(message); this.status = status }
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
