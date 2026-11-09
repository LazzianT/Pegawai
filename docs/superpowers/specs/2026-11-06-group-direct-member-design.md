# Desain Anggota Group Langsung Aktif

## Intent
Membuat UX Group: creator mengisi daftar NIP anggota sebelum detail tugas luar; setelah group dibuat, anggota menjadi `ACTIVE` otomatis tanpa login atau konfirmasi terpisah.

## Pendekatan dipilih
Tambahkan endpoint khusus creator. Endpoint invite existing tetap tidak berubah.

### Alur pengguna
1. Pilih **Buat Group**.
2. Tambahkan beberapa NIP anggota pada daftar lokal.
3. Isi tanggal, jam, tujuan, dan tugas.
4. Klik **Buat Group**.
5. Frontend membuat group memakai endpoint existing.
6. Frontend memanggil endpoint direct-member untuk setiap NIP.
7. Frontend memuat ulang group dan menampilkan nama anggota dari lookup backend.

## Kontrak endpoint baru
`POST /api/travel/groups/:code/members/direct`

Auth: JWT.

Body:
```json
{ "nip": "5614" }
```

Rules:
- Validasi `code` dengan format `TL-[A-Z0-9]{6}` di controller.
- Validasi `nip` digit 1-50 setelah trim di controller/model.
- Hanya creator group yang boleh memakai endpoint.
- Group harus ada, status dapat menerima anggota, dan versi aktif tersedia.
- Target NIP harus ada di `BMC.dbo.hris_Employee`.
- Target yang sudah `ACTIVE` dianggap idempotent sukses.
- Insert target langsung dengan `Status = 'ACTIVE'`.
- Endpoint invite `POST /groups/:code/members` tidak berubah.

Response sukses: data group code, version, target NIP, dan status `ACTIVE`.

## Error dan data loss
- Create group sukses tidak boleh dihapus jika penambahan anggota berikutnya gagal.
- Frontend mempertahankan group code dan daftar NIP yang gagal; user dapat mencoba ulang.
- Penambahan tiap anggota memakai request terpisah agar error satu target tidak membatalkan anggota yang sudah berhasil.
- Backend memakai parameterized SQL dan tidak menerima nama bebas dari client.

## Scope
Backend:
- `src/routes/travelRoutes.js`
- `src/controllers/travelController.js`
- `src/models/travelGroupModel.js`

Frontend:
- `src/pages/TugasLuarPage.jsx`
- `src/index.css`
- `src/hr.check.mjs`

## Non-goal
Tidak mengubah endpoint invite, join self-service, approval, payload pengajuan Mandiri, atau skema database.
