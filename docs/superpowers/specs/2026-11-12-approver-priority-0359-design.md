# Prioritas Approver 0359 Implementation Design

## Intent

Menetapkan NIP `0359` sebagai approver utama bila alur menghasilkan NIP `0359` atau `0363`. Berlaku untuk pengajuan tugas luar mandiri dan group.

## Rule

- `0363` selalu dinormalisasi menjadi `0359`.
- `0359` tetap `0359`.
- Approver lain tetap tidak berubah.
- Pada group, normalisasi dilakukan per anggota sebelum deduplikasi approver.
- Backend menjadi sumber aturan; nilai dari frontend tidak dapat melewati normalisasi.

## Scope

- Tambah helper murni backend untuk normalisasi NIP approver.
- Terapkan pada `submitTravel` sebelum menyimpan approval dan mengirim WhatsApp.
- Terapkan pada `submitGroup` setelah menghitung atasan anggota, sebelum deduplikasi dan insert approval.
- Tambah self-check untuk kedua jalur.
- Tidak mengubah schema DB, endpoint, frontend, atau aturan atasan lain.

## Acceptance

- Pengajuan mandiri dengan `atasanNIP: '0363'` menyimpan/mengirim approval ke `0359`.
- Pengajuan group dengan anggota yang atasannya `0363` membuat approval group untuk `0359`.
- Jika anggota menghasilkan `0359` dan `0363`, hanya satu approver `0359` dibuat.
- Approver selain `0359`/`0363` tetap tidak berubah.
