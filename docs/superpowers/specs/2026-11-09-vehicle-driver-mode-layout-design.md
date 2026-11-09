# Layout Cara Berkendara

## Intent

Merapikan pilihan `Self Drive` dan `Dengan Supir` pada modal approval pengelola kendaraan agar konsisten dengan pilihan kendaraan yang sudah berbentuk kartu.

## Scope

- Ubah markup pilihan cara berkendara di `frontend/src/pages/VehicleApprovalPage.jsx` menjadi dua kartu radio.
- Tambah CSS lokal di `frontend/src/index.css`.
- Desktop: dua pilihan berdampingan.
- Mobile: pilihan menumpuk satu kolom.
- Pertahankan state, nilai `SELF`/`DRIVER`, validasi, payload, dan copy.

## Non-goal

Tidak mengubah halaman direct approval, alur approval, API, backend, atau dependency.

## Approaches

1. **Kartu radio konsisten (dipilih):** memakai pola `vehicle-choice` yang sudah ada, dengan class khusus mode berkendara. Konsisten, aksesibel, perubahan kecil.
2. Segmented control: lebih ringkas, tetapi berbeda dari pilihan kendaraan dan kurang cocok dengan modal yang sudah memakai kartu.
3. Radio native dengan flex: paling kecil, tetapi tidak menyelesaikan ketimpangan visual yang dilaporkan.

## Verifikasi

- `npm run check`
- `npm run build`
- Inspeksi visual desktop/mobile pada modal approval.
