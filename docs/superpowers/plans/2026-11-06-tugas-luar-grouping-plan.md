# Tugas Luar Grouping Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tambahkan mode Tugas Luar Group dengan join berbasis konfirmasi, approval atasan per NIP atasan unik, revisi penuh oleh anggota aktif, dan satu approval kendaraan per group tanpa mengubah alur mandiri.

**Architecture:** Backend menambah entitas group, versi pengajuan, anggota, dan approval yang immutable; data lama tetap dipertahankan. Frontend mempertahankan `TugasLuarPage.jsx`, menambahkan pilihan Mandiri/Group, daftar anggota, join group code, dan status revisi. Approval kendaraan membaca satu versi group terbaru setelah seluruh approval atasan versi tersebut disetujui.

**Tech Stack:** React 18.3.1, Vite, CSS biasa, `fetch`, Express, SQL Server, Node self-check; tanpa dependency baru.

**Spec:** `docs/superpowers/specs/2026-11-06-tugas-luar-grouping-design.md`

## Global Constraints

- Mode `Mandiri` mempertahankan kontrak dan perilaku existing.
- Mode `Group` memakai group code tetap; join baru ditutup setelah submit pertama.
- Group code dapat dipakai user login mana pun; detail tidak dibuka sebelum konfirmasi join.
- Semua anggota aktif boleh tambah anggota, hapus anggota termasuk diri sendiri, dan kirim revisi.
- Satu penolakan atasan membuat seluruh group `Ditolak - Revisi`.
- Revisi mengosongkan daftar aktif dan membuat versi baru; histori lama tidak dihapus.
- Approval atasan dikelompokkan berdasarkan NIP atasan: atasan sama satu approval, atasan berbeda approval terpisah.
- Approval kendaraan satu kali per group setelah seluruh approval atasan versi terbaru disetujui.
- Server menentukan identitas, keanggotaan, atasan, status, dan hak akses; client tidak dipercaya.
- Mutasi group, join, submit, revisi, dan pembuatan approval harus atomik; kegagalan tidak boleh menghapus versi lama.
- Tidak ada secret atau password di kode, frontend, PDF, atau payload yang tidak perlu.
- Tidak menambah dependency.

## Review Focus

- Dua anggota lintas departemen dengan atasan sama menghasilkan satu approval; uji di Task 2.
- Satu anggota ditolak membuat seluruh group masuk revisi dan tidak memicu approval kendaraan; uji di Task 3.
- Revisi gagal tidak mengubah versi aktif lama; uji rollback di Task 2.
- Anggota yang dikeluarkan tidak dapat mengubah atau melihat group; uji authorization di Task 2.
- Join bersamaan/duplikat tidak membuat anggota ganda atau melewati konfirmasi; uji idempotensi di Task 2.

---

### Task 1: Tetapkan kontrak data group dan migrasi SQL

**Files:**
- Create: `Y:\bmc-app-backend\sql\travel-group.sql` (atau lokasi migrasi SQL existing setelah inspeksi backend)
- Modify: `Y:\bmc-app-backend\src\routes\travelRoutes.js`
- Modify: `Y:\bmc-app-backend\src\controllers\travelController.js`
- Modify: `Y:\bmc-app-backend\src\models\travelModel.js`
- Create: `Y:\bmc-app-backend\src\models\travelGroupModel.js`
- Create: `Y:\bmc-app-backend\src\models\travelGroupModel.check.mjs`

**Interfaces:**
- `POST /api/travel/groups` menerima detail perjalanan group, membuat group dan versi draft, mengembalikan `{ groupCode, groupId, version }`.
- `GET /api/travel/groups/:code` mengembalikan ringkasan group tanpa membuka detail sensitif sebelum user melakukan join/konfirmasi.
- `POST /api/travel/groups/:code/join` membuat permintaan join idempotent berdasarkan `req.user.id`.
- `POST /api/travel/groups/:code/join/confirm` mengaktifkan anggota login yang meminta join.
- `POST /api/travel/groups/:code/members` menambah anggota login berdasarkan NIP yang valid.
- `DELETE /api/travel/groups/:code/members/:nip` menonaktifkan anggota aktif tanpa menghapus histori.
- `POST /api/travel/groups/:code/submit` mengunci join dan membuat approval atasan untuk versi draft.
- `POST /api/travel/groups/:code/revise` hanya menerima group berstatus `Ditolak - Revisi`, membuat versi baru dari daftar anggota yang dikirim, lalu membuat approval baru atomik.
- `GET /api/travel/groups/mine` mengembalikan group yang dapat dilihat user berdasarkan keanggotaan aktif/histori yang diizinkan.

- [ ] **Step 1: Petakan pola migrasi dan koneksi SQL backend**

  Identifikasi mekanisme migrasi yang sudah dipakai. Jika tidak ada, buat satu SQL idempotent yang hanya menambah tabel/constraint baru dan tidak mengubah tabel existing.

- [ ] **Step 2: Definisikan tabel immutable**

  Gunakan tabel terpisah minimal: `hris_Travel_Group`, `hris_Travel_Group_Version`, `hris_Travel_Group_Member`, `hris_Travel_Group_Approval`. Simpan `groupCode` unik, `versionNo`, status, actor, timestamps, NIP anggota, NIP atasan snapshot, serta unique constraint untuk group/version/member dan group/version/approver.

- [ ] **Step 3: Tulis self-check murni untuk status dan deduplikasi approval**

  `travelGroupModel.check.mjs` harus assert bahwa `[atasanA, atasanA, atasanB]` menghasilkan dua approval target, satu penolakan menghasilkan status revisi, dan empty member list ditolak.

- [ ] **Step 4: Jalankan self-check**

  Run: `node src/models/travelGroupModel.check.mjs`

  Expected: exit code 0 dan pesan lulus.

- [ ] **Step 5: Terapkan migrasi di environment yang disetujui**

  Jalankan hanya setelah SQL ditinjau. Simpan histori; jangan drop/overwrite tabel existing.

### Task 2: Implementasikan group lifecycle dan authorization backend

**Files:**
- Create: `Y:\bmc-app-backend\src\services\travelGroupService.js`
- Modify: `Y:\bmc-app-backend\src\models\travelGroupModel.js`
- Modify: `Y:\bmc-app-backend\src\controllers\travelController.js`
- Modify: `Y:\bmc-app-backend\src\routes\travelRoutes.js`
- Modify: `Y:\bmc-app-backend\src\models\travelGroupModel.check.mjs`

**Interfaces:**
- Service menerima actor dari `req.user.id`; tidak menerima NIP actor dari body.
- `createGroup(actorNIP, payload)` membuat draft dengan creator sebagai anggota awal.
- `requestJoin(actorNIP, groupCode)` dan `confirmJoin(actorNIP, groupCode)` aman diulang.
- `addMember(actorNIP, groupCode, memberNIP)` hanya menerima NIP valid dari HRIS.
- `removeMember(actorNIP, groupCode, memberNIP)` mencatat inactive, bukan delete.
- `submitGroup(actorNIP, groupCode)` hanya anggota aktif; mengunci join dan membuat versi.
- `reviseGroup(actorNIP, groupCode, memberNIPs)` hanya group status `Ditolak - Revisi`; versi lama tidak disentuh sampai versi baru berhasil.

- [ ] **Step 1: Tulis self-check authorization dan rollback**

  Assert user non-member ditolak, join duplicate tetap satu record, anggota dikeluarkan kehilangan akses, revisi empty ditolak, dan kegagalan revisi mempertahankan active version lama.

- [ ] **Step 2: Implementasikan transaksi lifecycle**

  Gunakan SQL transaction dengan `XACT_ABORT ON`. Lock group saat submit/revise. Validasi status dan membership di server. Jangan menghapus row histori.

- [ ] **Step 3: Tambahkan route/controller dengan validasi boundary**

  Trim semua string, validasi group code/NIP/action, batasi panjang input, dan kembalikan error Indonesia existing style. Jangan percaya departemen/atasan dari body.

- [ ] **Step 4: Jalankan self-check backend**

  Run: `node src/models/travelGroupModel.check.mjs`

  Expected: PASS.

### Task 3: Approval atasan per atasan unik dan approval kendaraan per group

**Files:**
- Modify: `Y:\bmc-app-backend\src\services\travelGroupService.js`
- Modify: `Y:\bmc-app-backend\src\models\travelGroupModel.js`
- Modify: `Y:\bmc-app-backend\src\controllers\travelController.js`
- Modify: `Y:\bmc-app-backend\src\models\travelModel.js`
- Modify: `Y:\bmc-app-backend\src\services\waService.js` only if notification helper existing cannot be reused
- Modify: existing backend travel self-check files as needed

**Interfaces:**
- `GET /api/travel/approval` mempertahankan response mandiri; item group membawa `groupCode`, `groupVersion`, dan ringkasan anggota.
- Approval group menerima `{ groupCode, version, action }` atau ID approval server-generated; action tetap `approve|reject`.
- Penolakan salah satu approval group mengubah status group/version menjadi `Ditolak - Revisi` atomik.
- Kendaraan hanya menerima satu approval untuk `groupCode + version`, setelah count approval atasan approved sama dengan target unik.
- Payload kendaraan group memuat daftar anggota final dan tidak mengizinkan client mengubah daftar anggota saat approval.

- [ ] **Step 1: Tulis self-check deduplikasi dan gate kendaraan**

  Assert atasan sama lintas departemen satu approval, atasan berbeda dua approval, partial approval tidak membuat vehicle approval, dan reject membuat revisi group.

- [ ] **Step 2: Resolve atasan dari HRIS saat submit**

  Snapshot `approverNIP` per anggota dari data server. Group approval key adalah `approverNIP`, bukan departemen. Jika approver tidak ditemukan, batalkan transaksi dengan error yang jelas.

- [ ] **Step 3: Implementasikan approval group atomik**

  Cegah approval stale version. Setelah rejection, invalidate pending approval kendaraan versi tersebut. Setelah semua atasan approved, buat tepat satu approval kendaraan.

- [ ] **Step 4: Reuse routing WhatsApp existing**

  Kirim satu notifikasi per atasan unik. Kirim satu notifikasi kendaraan per group ke konfigurasi Tio/Miya existing. Jangan menaruh nomor atau secret baru di source.

- [ ] **Step 5: Jalankan semua self-check backend**

  Run: `npm test`

  Expected: seluruh self-check existing dan grouping lulus.

### Task 4: Helper frontend untuk mode dan payload group

**Files:**
- Modify: `D:\Developing\bmc-web\src\hr.js`
- Modify: `D:\Developing\bmc-web\src\hr.check.mjs`

**Interfaces:**
- `validateTravelGroupForm(form)` mengembalikan error field-only.
- `buildTravelGroupPayload(form, memberNIPs)` mengembalikan string trimmed, unique member NIP, tanpa field approver/departemen yang ditentukan server.
- `groupStatusLabel(status)` memakai teks Indonesia existing.

- [ ] **Step 1: Tulis assert helper**

  Uji mode wajib, group tanpa anggota aktif ditolak, duplicate NIP dideduplikasi, string whitespace ditrim, dan payload tidak membawa password/secret.

- [ ] **Step 2: Implementasikan helper minimal**

- [ ] **Step 3: Jalankan check**

  Run: `npm run check`

  Expected: self-check helper lulus.

### Task 5: Form Tugas Luar Group dan join/confirm UI

**Files:**
- Modify: `D:\Developing\bmc-web\src\pages\TugasLuarPage.jsx`
- Modify: `D:\Developing\bmc-web\src\services\api.js` only if response/401 behavior needs no new abstraction
- Modify: `D:\Developing\bmc-web\src\index.css`

**Interfaces:**
- Form wajib memilih `Mandiri` atau `Group`.
- Mode mandiri memakai `POST /travel/submit` dan UI existing.
- Mode group memakai create/join/confirm/member/revise endpoints dari Task 1.
- Group code dapat dimasukkan user login mana pun; detail hanya tampil setelah confirm join.
- Join button disabled selama request; error tampil inline; submit/revisi menampilkan ID/group code dari respons sukses.

- [ ] **Step 1: Tambahkan state minimal**

  Tambahkan `travelMode`, `groupCode`, `groupMembers`, `groupStatus`, `groupLoading`, tanpa Context/Redux/komponen baru.

- [ ] **Step 2: Tambahkan mode selector dan group code join**

  Render hanya field relevan. Pastikan mode mandiri tidak mengirim payload group.

- [ ] **Step 3: Tambahkan daftar anggota dan confirm join**

  Tampilkan status `Menunggu Konfirmasi`/`Aktif`. Tambah/hapus hanya melalui endpoint server. Anggota yang dikeluarkan tidak dapat mengakses aksi.

- [ ] **Step 4: Tambahkan submit/revisi**

  Saat submit pertama, join ditutup. Saat revisi, daftar lama dikosongkan secara server-side lalu kirim pilihan final. Jangan optimistically menghapus UI sebelum respons sukses.

- [ ] **Step 5: Jalankan build frontend**

  Run: `npm run build`

  Expected: Vite build sukses tanpa error.

### Task 6: Tampilkan group pada approval, riwayat, kendaraan, dan QR

**Files:**
- Modify: `D:\Developing\bmc-web\src\pages\TravelApprovalLinkPage.jsx`
- Modify: `D:\Developing\bmc-web\src\pages\VehicleApprovalPage.jsx`
- Modify: `D:\Developing\bmc-web\src\pages\VehicleApprovalLinkPage.jsx`
- Modify: `D:\Developing\bmc-web\src\pages\TravelQrPage.jsx`
- Modify: `D:\Developing\bmc-web\src\pages\DashboardPage.jsx` only for group summary mapping
- Modify: `D:\Developing\bmc-web\src\hr.js`

**Interfaces:**
- Approval atasan group menampilkan group code, seluruh anggota versi, dan atasan approval.
- Approval kendaraan group menampilkan satu group, anggota final, dan field kendaraan/supir sesuai kontrak kendaraan yang sudah disetujui.
- QR group membawa group/version identifier yang server validasi; tidak membuat QR validasi baru di client.
- Riwayat membedakan Mandiri dan Group tanpa mengubah field existing mandiri.

- [ ] **Step 1: Tulis/extend self-check mapping**

  Assert group response tidak menggabungkan dua versi dan item group tetap dapat dibedakan dari item mandiri.

- [ ] **Step 2: Implementasikan mapping dan tampilan**

  Gunakan design token/class existing. Jangan hard-code warna di JSX.

- [ ] **Step 3: Jalankan check dan build**

  Run: `npm run check` lalu `npm run build`

  Expected: keduanya lulus.

### Task 7: Verifikasi integrasi dan tutorial

**Files:**
- Modify: `D:\Developing\bmc-web\tutorial-tugas-luar\index.html` only after runtime behavior verified
- Modify: `D:\Developing\bmc-web\tutorial-tugas-luar\styles.css` only if layout needs it
- Modify: `D:\Developing\bmc-web\scripts\check-travel-pdf.mjs`

- [ ] **Step 1: Jalankan backend tests**

  Run in `Y:\bmc-app-backend`: `npm test`

- [ ] **Step 2: Jalankan frontend checks/build**

  Run in `D:\Developing\bmc-web`: `npm run check; npm run build`

- [ ] **Step 3: Smoke test manual dengan akun test yang disetujui**

  Verifikasi: buat group, join via code, confirm, anggota lintas departemen dengan atasan sama menjadi satu approval, rejection masuk revisi, revisi mengganti daftar anggota, approval kendaraan hanya satu per group.

- [ ] **Step 4: Update tutorial setelah smoke test**

  Tambahkan alur Group, join WhatsApp/group code, approval atasan unik, revisi, dan approval kendaraan group. Jangan memasukkan kredensial atau nomor pribadi.

- [ ] **Step 5: Build/check PDF dan diff**

  Run: `npm run build:pdf:tugas-luar; npm run check:pdf:tugas-luar; git diff --check`

  Expected: PDF checker lulus dan tidak ada error diff.

## Final verification

Run:

```powershell
cd Y:\bmc-app-backend
npm test
cd D:\Developing\bmc-web
npm run check
npm run build
npm run build:pdf:tugas-luar
npm run check:pdf:tugas-luar
git diff --check
```

Expected: semua command exit code 0. Tidak menyatakan selesai sebelum seluruh output diverifikasi.
