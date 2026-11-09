# Desain: Anggota pada Approval Tugas Luar Group

## Intent
Atasan melihat siapa saja yang berangkat bersama sebelum menyetujui pengajuan group.

## Scope
- Tambahkan blok `Berangkat bersama` pada kartu approval jika `item.members` berisi data.
- Tampilkan nama anggota serta NIP sebagai informasi.
- Berlaku untuk queue public; data memakai field API yang sudah ada.

## Non-goals
- Tidak mengubah API, database, status, payload approval, atau alur approve/reject.
- Tidak menampilkan blok pada pengajuan mandiri.

## Pendekatan
- Dipilih: render inline di `ApprovalCard`; paling kecil, langsung terlihat, tanpa modal atau komponen baru.
- Tidak dipilih: modal detail; menambah klik dan state tanpa kebutuhan.

## Implementasi
Ubah `frontend/src/pages/TravelApprovalLinkPage.jsx`. Render daftar `item.members` setelah detail pengajuan, dengan nama dan NIP. Gunakan fallback aman untuk data kosong. Jalankan `npm run check` dan `npm run build`.
