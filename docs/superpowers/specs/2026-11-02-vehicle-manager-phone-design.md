# Kirim WhatsApp Approval Kendaraan ke Nomor Tiap Pengelola

## Intent

Saat atasan menyetujui Tugas Luar yang memerlukan kendaraan, kirim link approval ke nomor WhatsApp masing-masing pengelola kendaraan berdasarkan kolom `Phone` pada `BMC.dbo.hris_Employee`, bukan satu nomor koordinator.

## Scope

- Tetap memakai `WA_VEHICLE_MANAGER_NIPS` sebagai daftar NIP pengelola.
- Query `Name` dan `Phone` tiap NIP.
- Kirim pesan satu kali ke setiap nomor valid.
- `WA_TEST_PHONE` tetap menjadi override testing melalui `sendWa()`.
- Nomor tanpa `Phone` dilewati, tanpa menghentikan pengiriman ke pengelola lain.

## Non-goals

- Tidak mengubah struktur DB.
- Tidak menambah endpoint.
- Tidak menyimpan nomor telepon baru di kode atau repo.
- Tidak mengubah alur approval kendaraan.

## Pendekatan dipilih

Query `Phone` per NIP dari tabel employee, lalu panggil `sendWa({ no: emp.Phone, text })` untuk tiap pengelola. Pendekatan ini menjaga nomor mengikuti data HRIS terbaru. Query dilakukan sebelum pengiriman; kegagalan satu nomor tidak membatalkan proses lainnya.

## Perubahan teknis

- Tambah helper di `src/services/waService.js` untuk mengambil nomor pengelola dari `WA_VEHICLE_MANAGER_NIPS`.
- Ubah blok notifikasi approval level 1 di `src/models/travelModel.js` agar mengirim ke nomor hasil query masing-masing NIP.
- Pertahankan normalisasi nomor dan override `WA_TEST_PHONE` dari `sendWa()`.
- Tambah self-check pure untuk pemetaan nomor valid dan skip nomor kosong jika pola helper memungkinkan diuji tanpa DB.

## Verifikasi

- `node --check` file Node.js berubah.
- `npm test` backend.
- Pastikan tidak ada secret atau nomor telepon hard-code.
