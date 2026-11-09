# Desain Alur Anggota Group Terlebih Dahulu

## Intent
Membuat UX Group lebih natural: pengguna memilih anggota dulu, lalu mengisi detail Tugas Luar.

## Alur dipilih
1. Pilih **Buat Group**.
2. Masukkan beberapa NIP anggota.
3. UI menampilkan daftar NIP yang dipilih.
4. Isi tanggal, jam, tujuan, dan tugas.
5. Klik **Buat Group**.
6. Frontend membuat group menggunakan detail tugas luar.
7. Frontend mengirim setiap NIP melalui endpoint member existing.
8. Frontend memuat ulang group dan menampilkan status anggota.

## Batasan kontrak
- Tidak mengubah backend, database, endpoint, payload existing, atau status lifecycle.
- Nama anggota tetap diambil backend berdasarkan NIP; tidak ada input nama bebas.
- Endpoint member existing membuat permintaan anggota pending. Anggota tetap perlu mengikuti proses join/konfirmasi backend untuk menjadi aktif.
- Jika penambahan salah satu anggota gagal setelah group berhasil dibuat, group tidak dihapus. UI mempertahankan group code dan menampilkan error agar pengguna dapat mencoba lagi.
- NIP pembuat tidak dikirim sebagai anggota tambahan.
- Mode Mandiri dan mode Join Group tidak berubah.

## Scope
- `src/pages/TugasLuarPage.jsx`: state daftar NIP pending, UI input sebelum group dibuat, create flow berurutan, error tanpa kehilangan group.
- `src/index.css`: style daftar anggota pending memakai token existing.
- `src/hr.check.mjs`: self-check marker untuk alur anggota sebelum detail.

## Non-goal
Tidak membuat anggota langsung aktif tanpa konfirmasi backend. Tidak menambah endpoint atau dependency.
