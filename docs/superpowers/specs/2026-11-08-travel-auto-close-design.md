# Desain Auto-close Tugas Luar pada 00:00

## Intent

Menutup perjalanan Tugas Luar yang sudah berangkat tetapi belum mencatat kepulangan saat pergantian hari. Sistem tidak boleh mengisi waktu pulang fiktif.

## Scope

- Perjalanan individual `hris_Travel`.
- Perjalanan rombongan `hris_Travel_Group` dan versi aktifnya.
- Proses backend berjalan terjadwal setiap menit.
- Zona waktu operasional: `Asia/Jakarta`.
- Penanda audit: `AutoClosedAt`.

## Perilaku

Sebuah perjalanan ditutup otomatis bila:

1. Status perjalanan sudah `APPROVED`.
2. Keberangkatan sudah tercatat.
3. Kepulangan belum tercatat.
4. Waktu Jakarta sudah masuk tanggal berikutnya pada pukul 00:00.

Saat ditutup:

- Individual: set `IsActive = 0`, set `AutoClosedAt`, pertahankan `EndDate` dan `EndTime` tetap `NULL`.
- Group: set status group dan versi menjadi `AUTO_CLOSED`, set `AutoClosedAt`, pertahankan data keberangkatan dan kepulangan tetap terpisah.
- QR tidak dapat dipakai lagi setelah auto-close.
- Dashboard Security tidak menampilkan perjalanan sebagai masih aktif.
- Riwayat menampilkan status `Ditutup otomatis`.

Job idempotent. Perjalanan yang sudah memiliki `AutoClosedAt` tidak diproses ulang.

## Non-goals

- Tidak mencatat jam kembali sebagai 00:00.
- Tidak mengubah approval yang sudah selesai.
- Tidak menghapus data perjalanan atau checkpoint.
- Tidak menutup perjalanan yang belum berangkat.
- Tidak mengubah alur approve atau reject.

## Database

Tambahkan migration SQL idempotent:

- `hris_Travel.AutoClosedAt DATETIME2 NULL`.
- `hris_Travel_Group.AutoClosedAt DATETIME2 NULL`.
- `hris_Travel_Group_Version.AutoClosedAt DATETIME2 NULL`.

Migration hanya disiapkan dalam repository. Eksekusi dilakukan saat deployment DB.

## Scheduler

Tambahkan service backend sederhana tanpa dependency baru. Scheduler:

- menjalankan pemeriksaan segera saat server start;
- mengulang setiap 60 detik;
- memakai waktu `Asia/Jakarta` melalui `Intl.DateTimeFormat`;
- membersihkan timer saat proses shutdown bila diperlukan.

Query update memakai kondisi status, keberangkatan, kepulangan, dan `AutoClosedAt IS NULL` dalam satu transaksi per jenis data. Error dicatat, tidak menghapus atau mengubah data secara parsial.

## API dan UI

Tambahkan field status auto-close pada mapping riwayat dan dashboard Security. Field tidak mengubah kontrak request existing.

Group tetap ditampilkan sebagai satu perjalanan. Semua anggota tetap terlihat sebagai anggota group.

## Verification

Tambahkan self-check untuk:

- kondisi eligible individual dan group;
- kondisi belum berangkat tidak eligible;
- kondisi sudah kembali tidak eligible;
- idempotensi guard `AutoClosedAt`;
- mapping status `AUTO_CLOSED` menjadi `Ditutup otomatis`.

Jalankan self-check backend, self-check frontend bila mapping berubah, serta build frontend.

## Approaches

1. Scheduler backend + kolom `AutoClosedAt`, dipilih. Audit jelas, idempotent, tidak memalsukan waktu pulang.
2. Scheduler backend + status existing. Migration lebih kecil, tetapi status auto-close sulit dibedakan dari status manual.
3. Lazy close saat data dibaca. Tidak perlu scheduler, tetapi dashboard Security tidak langsung konsisten dan DB belum tertutup sampai ada request.

## Keputusan yang perlu dikonfirmasi

- Desain menganggap auto-close berlaku untuk individual dan group yang sudah scan berangkat, bukan semua pengajuan yang statusnya approved.
- Desain menganggap status group boleh memakai nilai `AUTO_CLOSED`, sedangkan individual memakai `IsActive = 0` dan field `AutoClosedAt`.
- Untuk kendaraan operasional, `DriverMode` memakai `SELF` atau `DRIVER`; `DriverName` diisi manual saat approval kendaraan bila memakai supir.
