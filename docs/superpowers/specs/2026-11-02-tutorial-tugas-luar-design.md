# Desain Tutorial PDF Tugas Luar

## Tujuan
Membuat PDF tutorial terpisah untuk pengguna awam. Fokus: alur Tugas Luar dari pengajuan sampai scan QR saat berangkat dan kembali.

## Hasil
- Sumber tutorial baru: `tutorial-tugas-luar/index.html`.
- PDF baru: `BMC-Online-Tutorial-Tugas-Luar.pdf`.
- Desain memakai gaya panduan existing melalui `tutorial/styles.css` dan aset existing.
- Screenshot tambahan diambil dari layar aplikasi yang relevan:
  1. Form pengajuan Tugas Luar.
  2. Approval atasan.
  3. Approval Pengelola Kendaraan.
  4. QR untuk Security sebelum berangkat.
  5. QR untuk Security saat kembali.
  6. Status/riwayat pengajuan.

## Isi
1. Apa itu Tugas Luar.
2. Mengisi dan mengirim pengajuan.
3. Pemeriksaan atasan.
4. Pemeriksaan Pengelola Kendaraan.
5. Melihat status pengajuan.
6. Scan QR saat berangkat.
7. Scan QR saat kembali.
8. Hal yang perlu dilakukan bila status belum berubah.

## Batasan
- Tidak mengubah backend atau alur bisnis aplikasi.
- Tidak mengubah PDF panduan existing.
- Tidak menambahkan dependency.
- Data screenshot demo tidak memakai kredensial nyata.
- Bahasa Indonesia sederhana; istilah teknis API tidak ditampilkan.

## Pendekatan
Tutorial dibuat sebagai HTML terpisah yang memakai CSS dan aset existing. Screenshot baru dibuat dari aplikasi lokal dengan data demo yang aman, lalu dimasukkan ke PDF baru. Pendekatan ini menjaga PDF lama tetap utuh dan menghindari duplikasi design token.

## Verifikasi
- Validasi jumlah halaman dan teks utama PDF baru.
- `npm run check`.
- `npm run build`.
- `npm run check:pdf:tugas-luar` untuk pemeriksaan khusus PDF baru.
