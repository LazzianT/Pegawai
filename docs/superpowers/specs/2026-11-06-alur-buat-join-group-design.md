# Desain Alur Buat / Join Group

## Intent
Saat memilih **Group**, pengguna harus memilih aksi secara eksplisit:
- **Buat Group**: mengisi detail tugas luar, membuat group, lalu menambah beberapa anggota berdasarkan NIP.
- **Join Group**: memasukkan kode group, lalu mengirim permintaan join dan melakukan konfirmasi join.

## Pendekatan dipilih
Dua kartu aksi dalam halaman yang sama, mengikuti pola kartu radio Mandiri/Group yang sudah ada. Kartu aktif menampilkan panel terkait.

## Behavior
- Pilihan aksi hanya mengubah tampilan panel Group.
- Panel **Buat Group** menampilkan tombol `Buat Group`; setelah group dibuat, daftar anggota dan kontrol tambah/hapus tetap tampil.
- Panel **Join Group** hanya menampilkan input `Group code` dan tombol `Join Group`; tombol konfirmasi muncul setelah kode/group tersedia.
- Field detail tugas luar tetap dipakai bersama dan tidak diubah.
- Endpoint existing tetap dipakai: `POST /travel/groups`, `POST /travel/groups/:code/join`, `POST /travel/groups/:code/join/confirm`, serta endpoint member existing.
- Tombol submit utama tidak lagi membuat group secara implisit saat aksi Group dipilih; submit utama tetap dipakai untuk kirim pengajuan/revisi setelah group tersedia.

## Scope
- `src/pages/TugasLuarPage.jsx`: state aksi Group, markup panel, handler tombol.
- `src/index.css`: style kartu aksi/panel memakai token existing.
- `src/hr.check.mjs`: satu self-check untuk class/label alur.

## Non-goal
Tidak mengubah API backend, validasi trust boundary, payload, status lifecycle, atau alur Mandiri.
