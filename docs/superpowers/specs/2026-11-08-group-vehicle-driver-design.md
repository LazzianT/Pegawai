# Desain: pilihan sopir approval Tugas Luar group

## Intent
Pengelola kendaraan dapat mengganti mode sopir pada halaman approval direct. Pilihan default mengikuti pengajuan. Setelah approval sukses, pemohon menerima WA dengan format detail Tugas Luar yang konsisten.

## Scope
- Tambah pilihan mode `Self Drive` / `Dengan Supir` di halaman approval kendaraan.
- Mode `Dengan Supir` mewajibkan nama sopir.
- Backend menyimpan mode dan nama sopir pada approval kendaraan group.
- Kirim WA ke pemohon setelah approval group berhasil, berisi anggota, tujuan, keperluan, kendaraan, dan sopir.
- Reuse pola `formatTravelApprovalMessage`; tidak mengubah endpoint, skema DB, atau format WA approval atasan/pengelola.

## Non-goals
- Tidak mengubah alur approval atasan.
- Tidak menambah dependency.
- Tidak mengirim WA sebelum transaksi approval berhasil.
- Tidak mengubah pengajuan lama.

## Pendekatan
Reuse formatter/pola existing. Halaman mengirim `driverMode` dan `driverName`; backend memvalidasi di trust boundary, menyimpan nilai hanya saat approve, lalu mengambil data group setelah commit untuk mengirim WA ke anggota/pemohon. Jika notifikasi gagal, approval tetap tersimpan dan error dicatat.

## Perubahan
- `frontend/src/pages/VehicleApprovalLinkPage.jsx`: state pilihan mode, default dari `driverMode`, input nama sopir wajib untuk `DRIVER`, kirim field ke endpoint direct.
- `backend/src/controllers/travelController.js`: validasi `driverMode`/`driverName` pada direct approval.
- `backend/src/models/travelGroupModel.js`: simpan `DriverMode`/`DriverName`; setelah commit query detail group dan kirim WA dengan formatter existing.
- Self-check backend: validasi mode wajib, nama sopir wajib untuk mode `DRIVER`, serta pesan memuat sopir yang dipilih.

## Keputusan
Mode `SELF` menampilkan sopir anggota/pengemudi pengajuan. Mode `DRIVER` memakai nama yang diisi pengelola. Reject tidak meminta sopir dan tidak mengirim notifikasi approval sukses.
