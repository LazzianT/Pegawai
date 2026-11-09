# Desain Radio Jenis Tugas Luar

## Intent
Menyamakan tampilan pilihan **Mandiri** dan **Group** dengan radio kendaraan yang sudah memakai kartu pilihan bertema BMC.

## Scope
- Ubah markup radio mode di `src/pages/TugasLuarPage.jsx` agar memakai class kartu pilihan.
- Tambah style lokal di `src/index.css` memakai token existing `--color-navy`, `--color-ivory`, dan `--navy-*`.
- Pertahankan name, value, checked, dan handler yang ada.

## Non-goal
Tidak mengubah state, payload, validasi, teks, routing, atau alur Group/Mandiri.

## Pendekatan
- **Kartu pilihan:** dipilih; konsisten dengan `.vehicle-choice`, mudah dipindai, cocok untuk mobile.
- Segmented pill: tidak dipilih karena berbeda dari kontrol radio kendaraan yang sudah menjadi pola visual incumbent.

## Detail visual
- Dua pilihan tampil grid dua kolom, turun satu kolom pada layar sempit.
- State aktif memakai border navy, latar ivory transparan, dan indikator radio bertema.
- State hover/focus memakai token existing; input native disembunyikan secara visual tetapi tetap accessible.
