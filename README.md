# BMC Online Frontend

Frontend React + Vite untuk BMC Online. Repository backend tetap terpisah di `bmc-app-backend`.

## Jalankan

```bash
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
3. Environment variable: `VITE_API_BASE_URL=https://API_HOST/api` dan opsional `FRONTEND_PORT=3013`
4. Aktifkan GitOps update atau gunakan `Pull and redeploy`.

Frontend memakai `/api` same-origin. Nginx meneruskan `/api/*` ke backend `10.19.25.23:47213`; browser tidak perlu mengakses backend langsung, sehingga CORS tidak menjadi hambatan. Jika alamat backend berubah, ubah `nginx.conf`, lalu rebuild dan redeploy image.

## Pemeriksaan

```bash
npm run check
npm run build
docker compose config
```

Tidak ada secret di frontend. Password tidak disimpan. Respons sukses hanya ditampilkan setelah backend mengembalikan token dan user yang valid.
