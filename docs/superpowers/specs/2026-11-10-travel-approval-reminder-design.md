# Desain: Reminder Approval Tugas Luar

## Tujuan
Menambahkan tombol pada riwayat Tugas Luar agar pemohon dapat mengirim ulang WhatsApp ke approver pada tahap aktif.

## Scope
- Pengajuan tugas luar mandiri pada riwayat `TugasLuarPage`.
- Tombol hanya tampil saat status pengajuan `pending`/`menunggu`.
- Satu endpoint backend terautentikasi: `POST /api/travel/reminder`.
- Payload: `{ "id": "<travelId>" }`.
- Backend menentukan tahap aktif dan approver dari database.
- WhatsApp memakai `formatTravelApprovalMessage`, termasuk link approval.

## Keamanan dan integritas
- Wajib JWT.
- Validasi `id` di controller.
- Backend memastikan `travelId` milik user yang meminta.
- Backend hanya mengirim bila pengajuan masih aktif, status pending, approval tahap aktif masih `StatusId = 1`, dan approver tersedia.
- Reminder tidak mengubah status, level, token approval, atau data pengajuan.
- Tidak menerima NIP approver, level, role, nomor telepon, atau isi pesan dari frontend.

## Respons
- Sukses: `{ "success": true }`.
- Pengajuan tidak ditemukan/milik user lain: HTTP 404.
- Tidak ada tahap pending/approver: HTTP 409.
- Kegagalan WhatsApp: HTTP 502 tanpa mengubah data pengajuan.

## UI
- Tombol `Kirim pengingat` di setiap row pending.
- Disabled selama request, label `Mengirim…`.
- Sukses menampilkan pesan inline.
- Error ditampilkan inline, tanpa `alert()`.
- Setelah sukses, tidak refetch wajib karena status tidak berubah.

## Verifikasi
- Self-check backend untuk validasi keputusan tahap aktif.
- `npm test` backend.
- `npm run check` frontend.
- `npm run build` frontend.
