# Group Member Supervisor Check Design

**Goal:** Mencegah anggota group tugas luar tanpa atasan dipilih, lalu memberi arahan ke HC.

## Behavior

1. Pencarian anggota group tetap memakai `GET /api/travel/employees?q=...`.
2. Setiap hasil mengandung `hasAtasan: boolean`.
3. Anggota dengan `hasAtasan: false` tetap terlihat agar pemohon memahami alasan penolakan, tetapi tidak masuk daftar anggota.
4. Klik hasil tanpa atasan menampilkan toast:
   `Atasan belum terdaftar. Hubungi HC.`
5. Anggota dengan `hasAtasan: true` tetap memakai alur tambah group yang ada.
6. Validasi server pada submit tetap menjadi batas kepercayaan terakhir.

## Data Rule

`hasAtasan` bernilai true bila `hris_GetTopLevel(NIP)` mengembalikan minimal satu baris. Pencarian tidak mengubah data karyawan atau tabel group.

## UI Rule

Hasil tanpa atasan memakai state disabled secara visual dan `aria-disabled="true"`, tetapi tetap menerima klik untuk menampilkan toast. Tidak memakai `alert()`.

## Scope

- Modify backend employee search query and response mapping.
- Modify group employee result rendering and selection guard.
- Add self-check assertions.
- No new endpoint, dependency, DB migration, or unrelated refactor.
