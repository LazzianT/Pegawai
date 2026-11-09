# Desain Form Tugas Luar Group

## Intent

Mendukung satu pengajuan Tugas Luar untuk beberapa karyawan, dengan approval atasan dikelompokkan berdasarkan atasan yang sama dan approval kendaraan satu kali untuk group.

## Keputusan

- Form wajib memilih `Mandiri` atau `Group`.
- Mode `Mandiri` mempertahankan alur existing.
- Mode `Group` dibuat oleh user pertama.
- User lain dapat bergabung memakai WhatsApp atau group code.
- Group code dapat digunakan semua user yang sudah login.
- Join tetap membutuhkan konfirmasi eksplisit `Konfirmasi Join Group`.
- Setelah pengajuan dikirim, join baru ditutup.
- Semua anggota aktif boleh menambah anggota, menghapus anggota, termasuk dirinya sendiri, lalu mengirim revisi.
- Revisi terakhir yang terkirim menjadi versi aktif.
- Group code tetap sama sepanjang revisi.
- Satu penolakan approval atasan membuat seluruh group masuk `Ditolak - Revisi`.
- Saat revisi, daftar anggota lama dikosongkan; user memilih daftar final baru dari awal.
- Approval lama tidak dihapus; versi dan riwayat tetap tersimpan.
- Approval atasan dikelompokkan berdasarkan NIP atasan:
  - Anggota dengan atasan yang sama: satu approval, walaupun departemennya berbeda.
  - Atasan berbeda: approval terpisah untuk masing-masing atasan.
- Approval kendaraan dibuat satu kali untuk group setelah seluruh approval atasan versi terbaru disetujui.
- Anggota yang dikeluarkan kehilangan akses group.

## Contoh alur

```text
Pilih Group
  -> Buat group
  -> Undang via WhatsApp / bagikan group code
  -> Anggota login
  -> Konfirmasi Join Group
  -> Kirim pengajuan
  -> Approval atasan per atasan unik
  -> Semua disetujui
  -> Satu approval pengelola kendaraan per group
```

Jika salah satu approval atasan ditolak:

```text
Group -> Ditolak - Revisi
      -> anggota aktif membuka group
      -> daftar lama dikosongkan
      -> pilih anggota final baru
      -> kirim revisi dengan group code sama
      -> approval atasan dibuat ulang per atasan unik
```

## Pendekatan yang dipilih

### A. Group + versi anggota - dipilih

Satu group memiliki identitas tetap. Setiap pengajuan/revisi membuat versi anggota baru. Approval atasan terkait versi dan atasan unik; approval kendaraan terkait versi group terbaru.

Kelebihan: riwayat aman, status versi jelas, revisi tidak menghapus data lama.

### B. Pengajuan individual dengan `groupId`

Tidak dipilih. Agregasi status approval kendaraan dan revisi group lebih rawan tidak sinkron.

### C. Satu record group yang ditimpa

Tidak dipilih. Berisiko menghilangkan riwayat anggota dan approval lama.

## Batasan

- Tidak mengubah alur backend sebelum kontrak API, model data, dan izin akses disetujui.
- Tidak menyimpan password atau secret di frontend, source code, atau PDF.
- Implementasi harus menjaga data versi lama saat revisi gagal.
- Konkurensi memakai aturan sederhana: revisi terakhir yang berhasil dikirim menjadi versi aktif.

## Di luar scope desain ini

- Penentuan format group code.
- Detail template WhatsApp dan masa berlaku token undangan.
- Perubahan database/API final.
- Penentuan field kendaraan dan supir pada versi group.
- Update tutorial PDF sebelum implementasi dan verifikasi aplikasi selesai.

## Langkah berikutnya

1. Konfirmasi desain ini.
2. Tetapkan kontrak API dan model data group/version/member/approval.
3. Buat implementation plan.
4. Implementasi bertahap: backend contract, form group/join, approval per atasan unik, approval kendaraan per group, revisi, lalu PDF.
