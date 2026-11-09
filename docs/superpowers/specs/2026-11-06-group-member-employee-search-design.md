# Pencarian Anggota Group dari HRIS

## Intent
Memudahkan creator memilih anggota group berdasarkan nama atau NIP, tanpa mengetik NIP manual.

## Alur
1. Creator mengetik minimal 2 karakter pada field anggota.
2. Frontend menunggu debounce singkat, lalu meminta hasil ke backend.
3. Backend mencari `hris_Employee` berdasarkan NIP atau Name.
4. Dropdown menampilkan maksimal 20 hasil dalam format `Nama - NIP`.
5. Creator memilih hasil.
6. Frontend menyimpan NIP terpilih ke daftar lokal.
7. Saat group dibuat, endpoint direct-member existing tetap menerima NIP dan backend memvalidasi ulang employee.

## Kontrak endpoint
`GET /api/travel/employees?q=<query>`

Auth: JWT.

Response:
```json
{ "data": [ { "nip": "5614", "name": "Nama Karyawan" } ] }
```

Rules:
- `q` di-trim.
- Minimal 2 karakter; query lebih pendek mengembalikan `data: []`.
- Maksimal 20 hasil.
- Pencarian parameterized SQL pada `NIP` atau `Name`.
- Hanya mengembalikan `NIP` dan `Name`; tidak membuka email, telepon, jabatan, atau data sensitif lain.
- JWT tetap wajib.

## Error dan UX
- Request lama tidak boleh menimpa hasil query terbaru.
- Loading dan empty state tampil di dropdown.
- Error pencarian tampil inline; daftar NIP yang sudah dipilih tetap dipertahankan.
- Dropdown dapat dipilih keyboard; tombol hapus anggota tetap tersedia.
- Jika endpoint gagal, fallback tetap memungkinkan input NIP manual yang sudah ada.

## Scope
Backend lokal:
- `src/models/travelGroupModel.js`
- `src/controllers/travelController.js`
- `src/routes/travelRoutes.js`

Frontend:
- `src/pages/TugasLuarPage.jsx`
- `src/index.css`
- `src/hr.check.mjs`

## Non-goal
Tidak memuat seluruh tabel employee, tidak mengubah endpoint direct-member, tidak mengembalikan data pribadi tambahan, dan tidak mengubah alur Join Group.

## Pendekatan yang dipilih
Search endpoint khusus dipilih dibanding memuat semua karyawan atau memakai `/user/users`, karena payload kecil, akses lebih terbatas, hasil relevan, dan kontrak jelas.
