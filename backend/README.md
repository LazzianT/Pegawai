# BMC App Backend

Backend REST API untuk aplikasi mobile Human Resource (BMC). Dibangun dengan **Node.js** dan **Express.js**, menggunakan **SQL Server** (Azure SQL / MSSQL) sebagai basis data, serta **JWT** untuk autentikasi.

Mendukung fitur **Cuti**, **Izin**, dan **Travel Dinas**, lengkap dengan alur persetujuan (approval) berjenjang dan notifikasi.

## Fitur

- **Autentikasi JWT** — login berbasis NIP & password, token kedaluwarsa 8 jam.
- **Cuti** — cek saldo, riwayat transaksi, daftar atasan, pengajuan cuti, approval berjenjang.
- **Izin** — riwayat transaksi, daftar keperluan, pengajuan izin, approval berjenjang.
- **Travel Dinas** — daftar atasan, pengajuan travel, riwayat travel, approval multi-level (Atasan → HR → GS).
- **Notifikasi** — daftar notifikasi (baru/dibaca) dan tandai semua terbaca.
- **Health Check** — `/api/health` untuk memverifikasi koneksi database.

## Teknologi

| Komponen       | Teknologi                                  |
|----------------|--------------------------------------------|
| Runtime        | Node.js                                    |
| Web Framework  | Express.js                                 |
| Database       | Microsoft SQL Server (mssql)               |
| Auth           | JSON Web Token (jsonwebtoken)              |
| Env Config     | dotenv                                     |
| Dev           | nodemon                                    |

## Struktur Proyek

```
bmc-app-backend/
├── app.js                     # Entry point, inisialisasi Express & mount route
├── .env                       # Konfigurasi environment (tidak di-commit)
└── src/
    ├── config/
    │   └── db.js              # Konfigurasi & pool koneksi SQL Server
    ├── controllers/           # Handler HTTP per modul
    ├── middleware/
    │   └── auth.js            # Middleware autentikasi JWT
    ├── models/                # Akses data (query SQL Server)
    └── routes/                # Definisi endpoint REST
```

## Prasyarat

- Node.js ≥ 18
- SQL Server yang dapat diakses (Azure SQL / SQL Server lokal)
- npm

## Instalasi

```bash
# 1. Clone repository
git clone https://github.com/LazzianT/bmc-app-backend.git
cd bmc-app-backend

# 2. Install dependensi
npm install

# 3. Siapkan file environment
cp .env.example .env
```

## Konfigurasi Environment

Buat file `.env` di root proyek sesuai template berikut:

```env
# Database
DB_SERVER=your-server.database.windows.net
DB_PORT=1433
DB_DATABASE=your_database
DB_USER=your_user
DB_PASSWORD=your_password
DB_ENCRYPT=true

# Server
PORT=3000

# JWT
JWT_SECRET=change_this_secret
JWT_EXPIRES=8h
```

> **Catatan:** Untuk SQL Server dengan instance bernama (`server\instance`), jangan isi `DB_PORT`.

## Menjalankan Server

```bash
# Produksi
npm start

# Development (auto-reload dengan nodemon)
npm run dev
```

Server akan berjalan pada `http://localhost:3000` (atau port pada `PORT`).

Verifikasi koneksi:

```bash
curl http://localhost:3000/api/health
```

Respons sukses:

```json
{ "status": "ok", "database": "connected" }
```

## Autentikasi

Semua endpoint kecuali `/api/health` dan `/api/login` memerlukan token JWT.

Kirim token pada header khusus `Authorization`:

```
Authorization: Bearer <TOKEN>
```

Token diperoleh dari endpoint login.

## Endpoint API

### Utilitas & Auth

| Method | Endpoint      | Auth | Keterangan                          |
|--------|---------------|------|-------------------------------------|
| GET    | `/api/health` | Tidak | Health check & koneksi database     |
| POST   | `/api/login`  | Tidak | Login, mengembalikan token + profil |
| GET    | `/api/users`  | Tidak | Daftar seluruh pengguna             |

### Cuti (`/api/cuti`)

| Method | Endpoint               | Keterangan                                |
|--------|------------------------|-------------------------------------------|
| GET    | `/api/cuti/saldo`       | Saldo cuti (query `leaveType`)            |
| GET    | `/api/cuti/transaksi`   | Riwayat transaksi cuti                    |
| GET    | `/api/cuti/atasan`      | Daftar atasan berjenjang                   |
| POST   | `/api/cuti/submit`      | Pengajuan cuti                            |
| GET    | `/api/cuti/approval/cuti`| Daftar persetujuan cuti (query `status`, `search`) |
| POST   | `/api/cuti/approval/approve` | Setujui / tolak cuti                |

### Izin (`/api/izin`)

| Method | Endpoint                | Keterangan                                |
|--------|-------------------------|-------------------------------------------|
| GET    | `/api/izin/transaksi`    | Riwayat transaksi izin (query `type`)     |
| GET    | `/api/izin/keperluan`    | Daftar keperluan izin (query `type`, `idSubGroup`) |
| GET    | `/api/izin/approval/izin`| Daftar persetujuan izin (query `status`, `search`) |
| POST   | `/api/izin/submit`       | Pengajuan izin                            |
| POST   | `/api/izin/approval/approve` | Setujui / tolak izin                |

### Travel Dinas (`/api/travel`)

| Method | Endpoint                   | Keterangan                                |
|--------|----------------------------|-------------------------------------------|
| GET    | `/api/travel/atasan`        | Daftar atasan                              |
| GET    | `/api/travel/transaksi`     | Riwayat travel pengguna                    |
| GET    | `/api/travel/approval`      | Daftar persetujuan travel                  |
| POST   | `/api/travel/submit`        | Pengajuan travel                           |
| POST   | `/api/travel/approval/approve` | Setujui / tolak travel (multi-level)  |

### Notifikasi (`/api/notifikasi`)

| Method | Endpoint            | Keterangan                      |
|--------|---------------------|---------------------------------|
| GET    | `/api/notifikasi`    | Daftar notifikasi pengguna      |
| POST   | `/api/notifikasi/read` | Tandai semua notifikasi terbaca |

## Format Request

### Login (`POST /api/login`)

```json
{
  "username": "12345678",
  "password": "password_hash"
}
```

Respons:

```json
{
  "token": "<JWT_TOKEN>",
  "user": {
    "id": "12345678",
    "name": "Nama Karyawan",
    "email": "email@example.com",
    "role": "STAFF",
    "jabatan": "Staff HR",
    "department": "HR Department",
    "atasanId": null
  }
}
```

### Persetujuan (`POST .../approval/approve`)

```json
{
  "id": "C.12345678.169999999924",
  "action": "approve"
}
```

`action` yang valid: `approve` atau `reject`.

## Lisensi

ISC