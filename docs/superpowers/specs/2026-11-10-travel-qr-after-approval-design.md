# QR Tugas Luar Setelah Persetujuan Final

## Intent
Tampilkan tombol QR pada halaman Tugas Luar setelah seluruh approval selesai, termasuk pengajuan mandiri dan group.

## Keputusan
Backend menjadi sumber kebenaran. Backend hanya mengirim `qrToken` untuk pengajuan yang sudah final disetujui dan masih memenuhi syarat QR. Frontend tidak menebak dari status atau level; tombol tampil hanya bila `qrToken` valid dan helper QR existing mengizinkan.

## Scope
- Mandiri: pertahankan alur QR existing.
- Group: teruskan `QrToken` dari endpoint group ke row riwayat sebagai `qrToken`.
- UI: tampilkan `Tampilkan QR` untuk row approved dengan token valid.
- Tetap cegah QR bila sudah berangkat atau token tidak tersedia.

## Non-goals
- Tidak membuat endpoint baru.
- Tidak mengubah status approval, token, atau data perjalanan.
- Tidak mengubah format QR existing.

## Implementasi
1. Tambah self-check source/mapper untuk memastikan group response memetakan `QrToken` sebagai `qrToken`.
2. Update mapping row group di `DashboardPage.jsx` agar membawa `qrToken` serta field yang dibutuhkan `canShowTravelQr`.
3. Gunakan handler `showQr(row)` existing untuk group; payload QR tetap memakai `row.id` dan token.
4. Pastikan kondisi tombol tetap `approved` + token valid + belum berangkat.

## Verifikasi
- Backend self-check.
- Frontend `npm run check`.
- Frontend `npm run build`.
