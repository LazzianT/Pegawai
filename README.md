# BMC Online Frontend

Frontend React + Vite untuk BMC Online. Repository backend tetap terpisah di `bmc-app-backend`.

## Jalankan

```bash
npm install
copy .env.example .env
npm run dev
```

Vite berjalan di `http://localhost:5174`. Atur `VITE_API_BASE_URL` ke base API backend. Login memakai kontrak existing `POST /api/user/login` dengan body `{ "username": "<NIP>", "password": "<password>" }`. Backend existing memerlukan password sesuai konfigurasi autentikasinya.

## Pemeriksaan

```bash
npm run check
npm run build
```

Tidak ada secret di frontend. Password tidak disimpan. Respons sukses hanya ditampilkan setelah backend mengembalikan token dan user yang valid.
