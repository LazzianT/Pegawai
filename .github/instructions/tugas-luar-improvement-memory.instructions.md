---
description: Backlog improvement untuk alur Tugas Luar BMC Online; menjadi acuan requirement sebelum implementasi.
applyTo: "tutorial-tugas-luar/**/*,scripts/build-travel-pdf.mjs,scripts/check-travel-pdf.mjs"
---

# Tugas Luar Improvement Memory

Catatan meeting tersimpan sebagai backlog improvement. Belum ada implementasi sampai requirement dan kontrak teknis disetujui.

## Backlog

1. Tambahkan form rombongan untuk pengajuan Tugas Luar.
2. Saat approval kendaraan, tampilkan informasi siapa supirnya.
3. Tutup otomatis proses/status yang relevan pada pukul 00:00; detail status yang ditutup perlu dikonfirmasi sebelum implementasi.
4. Sediakan atau perjelas account login Security.
5. Approver Pengelola Kendaraan hanya Tio dan Miya; Bu Yetti dikecualikan. Mapping saat ini: Tio = Syarif Prasetiyo (`5743`), Miya = Miya Hestiningtyas (`5514`), Bu Yetti = Yetti Sepriani (`0194`).
6. Tampilkan informasi kendaraan yang dipakai, termasuk data yang relevan seperti jenis dan plat.

## Process Gate

- Perlakukan seluruh item sebagai requirement/backlog, bukan instruksi implementasi langsung.
- Konfirmasi scope, pemilik data, field API, aturan waktu, serta dampak DB sebelum coding.
- Setelah implementasi disetujui, perbarui tutorial PDF mengikuti perilaku aplikasi yang sudah diverifikasi.
