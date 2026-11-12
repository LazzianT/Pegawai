# Poster QR Portal BMC Online - Design

## Intent
Membuat poster A4 untuk akses cepat `https://employee-portal.bmc.co.id`, ditujukan bagi karyawan yang mengurus Cuti, Izin, dan Tugas Luar.

## Output
- `BMC-Online-Poster-Portal.pdf` sebagai PDF A4 portrait siap cetak.
- `BMC-Online-Poster-Portal.png` sebagai preview/share image.
- Output PDF tidak menimpa tutorial atau PDF existing.

## Visual direction
- Clean, modern SaaS 2026.
- Komposisi fleksibel berbasis grid: header brand, hero QR besar, tiga kartu layanan, mockup layar handphone.
- QR menjadi fokus utama dan tetap mudah dipindai.
- Ikon Cuti, Izin, dan Tugas Luar memakai inline SVG sederhana, konsisten dengan pola ikon repo.
- Mockup handphone memakai CSS/HTML, bukan aset atau screenshot palsu yang menambah dependency.
- Warna dan font mengikuti visual existing BMC Online: navy, teal, putih, Jakarta.

## Copy
- Judul: `Urus kebutuhan HR lebih mudah.`
- Subjudul: `Akses BMC Online untuk mengajukan Cuti, Izin, dan Tugas Luar.`
- URL tampil sebagai teks: `https://employee-portal.bmc.co.id`.
- CTA: `Scan untuk membuka portal`.
- Tiga layanan: `Cuti`, `Izin`, `Tugas Luar`.
- Tidak menampilkan username, password, atau kredensial.

## Constraints
- Tidak mengubah backend, security, bmc-appv2, atau aplikasi utama.
- Tidak menambah dependency.
- QR dibuat dengan package `qrcode` yang sudah tersedia.
- PNG dibuat dari halaman poster menggunakan Chrome/Playwright existing.
- PDF lama tidak ditimpa.

## Verification
- QR asset tersedia, tidak kosong, dan dibuat dari URL exact.
- PDF satu halaman A4, PNG non-empty.
- Source tidak memuat password/kredensial.
- `npm run check`, `npm run build`, generator poster, dan checker poster lulus.
