# Tutorial video BMC Online

Pipeline otomatis: Playwright capture read-only -> Piper Bahasa Indonesia -> subtitle SRT/VTT -> Remotion MP4.

## Prasyarat

- Node.js dan Chrome.
- Akses sah ke aplikasi.
- Akun demo/staging. Pipeline tidak submit, approve, cancel, delete, atau mengubah data.
- Piper lokal tersedia di repo induk. Provider cloud belum diimplementasikan agar tidak menambah dependency atau secret.

## Setup

```powershell
cd tutorial-video
copy .env.example .env
# isi APP_BASE_URL; APP_USERNAME/APP_PASSWORD opsional untuk login otomatis
npm run setup
npm run check
```

`APP_PASSWORD` hanya dibaca saat login. Tidak disimpan, dicetak, atau masuk output.

## Jalankan

```powershell
npm run auth
npm run capture
npm run narration
npm run subtitles
npm run preview
npm run render
npm run validate
```

`auth` membuka Chrome. Selesaikan MFA/CAPTCHA sendiri bila diminta, lalu tekan Enter terminal. `capture` hanya membaca dan mengambil screenshot/video. Jika sesi tidak valid, pipeline berhenti.

## Output

- `out/tutorial-preview.mp4`
- `out/tutorial-final.mp4`
- `subtitles/tutorial-id.srt`
- `subtitles/tutorial-id.vtt`
- `content/manifest.json`

Capture, auth state, audio, serta output di-ignore Git. Tidak ada kredensial/auth state dalam deliverable.

## Batasan

Narasi memakai Piper lokal. Jika TTS provider lain diperlukan, tambahkan adapter setelah provider, voice, dan secret-management disetujui. Tanpa capture atau TTS sukses, pipeline tidak mengklaim video selesai.
