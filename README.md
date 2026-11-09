# Pegawai

Aplikasi BMC Online. Frontend React + Vite berada di `frontend/`; backend Express berada di `backend/`.

## Jalankan

```bash
cd frontend
npm install
copy .env.example .env
npm run dev
```

Vite berjalan di `http://localhost:5174`. Atur `VITE_API_BASE_URL` ke base API backend. Login memakai kontrak existing `POST /api/user/login` dengan body `{ "username": "<NIP>", "password": "<password>" }`. Backend existing memerlukan password sesuai konfigurasi autentikasinya.

## Docker + Portainer

Compose menjalankan Nginx pada port container `80`, lalu mem-publish ke host `FRONTEND_PORT` (default `3013`). Jangan memakai IP container; akses memakai IP/hostname Docker host dan port host, misalnya `http://HOST_IP:3013`.

Portainer Stack:

1. Repository: `https://github.com/LazzianT/Pegawai.git`
2. Compose path: `docker-compose.yml`
3. Environment variable frontend: `FRONTEND_PORT=3013`
4. Environment variable backend wajib di Portainer: `DB_SERVER`, `DB_DATABASE`, `DB_USER`, `DB_PASSWORD`, `JWT_SECRET`; isi variable backend lain sesuai kebutuhan. Untuk sementara arahkan WhatsApp Tugas Luar ke QA dengan `WA_TRAVEL_QA_PHONE=081977785748`.
5. Jangan commit `backend/.env`; gunakan environment Portainer
4. Aktifkan GitOps update atau gunakan `Pull and redeploy`.

Frontend memakai `/api` same-origin. Nginx meneruskan `/api/*` ke service Compose `backend:47213`. Browser tidak perlu mengakses backend langsung, sehingga CORS tidak menjadi hambatan. Secret backend diisi lewat environment Portainer, bukan Git.

## Pemeriksaan

```bash
cd frontend
npm run check
npm run build
npm run build:pdf
npm run check:pdf
cd ..
docker compose config
```

Tutorial PDF: `tutorial/index.html` + `tutorial/styles.css`. Hasil: `dist/BMC-Online-Panduan-Penggunaan.pdf`. Set `CHROME_PATH` bila Chrome berada di lokasi lain.

Tidak ada secret di frontend. Password tidak disimpan. Respons sukses hanya ditampilkan setelah backend mengembalikan token dan user yang valid.
