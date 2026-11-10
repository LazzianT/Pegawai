# Desain: URL QR Group Menggunakan Employee Portal

## Tujuan
Link QR pada WhatsApp setelah approval kendaraan group harus memakai `EMPLOYEE_PORTAL_URL`, sama seperti pengajuan perorangan.

## Perubahan
- `backend/src/models/travelGroupModel.js`: bentuk `qrLink` dari `EMPLOYEE_PORTAL_URL` saja.
- `backend/src/models/travelGroupModel.check.mjs`: ubah pemeriksaan agar memastikan `EMPLOYEE_PORTAL_URL` dipakai.

## Tidak berubah
Token QR, status approval, route QR, data perjalanan, dan alur QR perorangan tetap.

## Pendekatan
Memakai konfigurasi URL yang sudah digunakan QR perorangan. Tidak menambah env, endpoint, dependency, atau abstraksi baru.
