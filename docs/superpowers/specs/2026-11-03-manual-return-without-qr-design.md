# Kepulangan Manual Tanpa QR

## Tujuan
QR tugas luar hanya dipakai Security untuk mencatat keberangkatan. Kepulangan dicatat manual oleh Security melalui tombol `Kembali ke kantor`; user tidak perlu menampilkan atau memindai QR lagi.

## Pendekatan
- Pertahankan endpoint manual `/travel/return` yang sudah ada.
- Ubah `/travel/qr/scan` agar scan kedua setelah keberangkatan tidak mencatat kepulangan; status tidak berubah dan respons menjelaskan bahwa kepulangan harus dicatat dari sisi Security.
- Pada halaman tugas luar, tampilkan tombol `Tampilkan QR` hanya sebelum `departureAt` dan `tanggalKembali` tersedia.
- Ubah teks QR agar hanya menyebut scan saat berangkat.
- Jangan mengubah `security/`; tombol Security yang sudah memanggil `/travel/return` tetap menjadi jalur kepulangan.

## Non-goals
- Tidak mengubah struktur DB.
- Tidak menghapus endpoint `/travel/return`.
- Tidak mengubah waktu scan aktual atau data kepulangan yang sudah tercatat.

## Verifikasi
- Self-check backend memastikan scan berulang tidak menghasilkan event `returned`.
- Self-check frontend memastikan QR tidak ditawarkan setelah keberangkatan/kepulangan.
- Jalankan `npm test`, `node --check`, `npm run check`, `npm run build`, dan `git diff --check`.
