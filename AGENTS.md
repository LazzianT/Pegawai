# AGENTS.md — Web HR BMC Online (pengajuan & approval)

Instruksi untuk coding agent yang membangun aplikasi ini. Baca dulu, jangan menebak. Detail alur & kontrak API ada di [`../FLOW-BMC-ONLINE.md`](../FLOW-BMC-ONLINE.md).

## Tujuan

Aplikasi web untuk **seluruh pengajuan HR karyawan**: Cuti, Izin, dan Tugas Luar — plus riwayat pengajuan sendiri dan halaman approval untuk atasan.

**Di luar scope** (jangan dikerjakan): halaman petugas keamanan/monitoring, catat kembali, laporan periodik, dashboard ringkasan gate, near miss, WBS, pengumuman, data pribadi, push notification. Semuanya sudah ada di `security/` dan `bmc-appv2/` — jangan diduplikasi.

## Aturan integrasi (mutlak)

1. **Backend sudah ada dan sudah lengkap**: `bmc-app-backend` (Express + SQL Server, `app.js:22-29`). **JANGAN mengubahnya.** Tidak ada endpoint baru yang perlu dibuat.
2. **JANGAN menyentuh** `security/`, `bmc-appv2/`, atau file apa pun di luar folder ini.
3. Backend dev: `cd bmc-app-backend && npm start` → `http://localhost:3000`. CORS sudah `*` (`app.js:14-20`), front-end bisa langsung fetch.
4. Data tersimpan di tabel/view existing (`hris_Leave_Prop`, `hris_Permit_Days`, `hris_Travel`, `hris_Approval`, `hris_Travel_Approval`). Struktur DB milik backend — jangan query DB langsung dari browser.

## Stack (wajib, jangan ditambah)

| Bagian | Pilihan | Alasan |
|---|---|---|
| UI | React 18.3.1 + Vite 6 | sama dengan `security/` |
| Style | **CSS biasa** + CSS variables | permintaan "basic"; tanpa Tailwind |
| Routing | tidak ada — state `page` di `App.jsx` | 3–4 layar |
| HTTP | `fetch` murni | tanpa axios |
| State | `useState` lokal | tanpa Redux/Zustand/Context |

Dev server port **5174** (5173 dipakai `security/`).

Struktur minimum:

```
package.json          # scripts: dev, build, preview, check
vite.config.js
index.html            # lang="id"
.env.example          # VITE_API_URL=http://localhost:3000
src/main.jsx
src/index.css         # CSS variables + style dasar
src/App.jsx           # shell: login gate + nav antar layar
src/pages/            # AjuanCuti.jsx, AjuanIzin.jsx, AjuanTravel.jsx, Riwayat.jsx, Approval.jsx
src/hr.js             # helper murni per modul: validasi + mapping payload + format
src/hr.check.mjs      # self-check assert (node, tanpa framework)
```

Jangan pecah lebih jauh dari itu. Tidak ada folder `components/` untuk 2 elemen — taruh komponen kecil inline.

## Kontrak API (pakai persis, jangan ubah namanya)

Base URL: `import.meta.env.VITE_API_URL` — **wajib lewat env**, jangan hard-code URL atau kredensial di kode. Semua endpoint kecuali login butuh `Authorization: Bearer <token>`.

### Auth
```
POST /api/user/login            Body: { "username": "<NIP>", "password": "<password>" }
                                200: { "token": "<jwt>", "user": { "id", "name", "role" } }
                                401: { "error": "NIP atau password salah" }
GET  /api/user/profile          200: { nip, name, email, jabatan, department }
```
`userController.js:7-38`, `userController.js:68-84`. Password adalah SHA1 tanggal lahir (lihat `FLOW-BMC-ONLINE.md` §2) — **jangan hitung/turunkan di klien**, cukup kirim apa yang diketik user.

### Daftar atasan (dipakai ketiga form)
```
GET /api/cuti/atasan            → { "data": [ { "nip", "name", "departID", "departemen", "jobSeq" } ] }
```
`cutiController.js:56-75`. Endpoint yang sama dipakai cuti, izin, dan travel (`bmc-appv2/app/ajuanizin.tsx:243`, `app/travel.tsx:242`).

### Cuti
```
GET  /api/cuti/saldo?leaveType=1   → { NIP, Name, Saldo, Transaksi, QuotaCuti }   (404 bila tidak ada)
GET  /api/cuti/transaksi           → { "data": [ { id, jenis, alasan, hari, status, periode, dates, approvals } ] }
POST /api/cuti/submit              Body: { leaveType:int, remark, dates:["YYYY-MM-DD"], approvers:["NIP"] }
                                   200: { "id": "C.<NIP>.<epoch><2digit>", "name": "..." }
                                   400: "leaveType wajib berupa angka" | "dates wajib minimal 1 tanggal" | "approvers wajib minimal 1 atasan"
GET  /api/cuti/approval/cuti?status=Propose|Approved|Rejected&search=
                                   → { "data": [ { id, priority, nip, nama, statusId, updDate, updates, durasi, alasan } ] }
POST /api/cuti/approval/approve    Body: { id, action:"approve"|"reject" }
                                   400 "Sudah diproses sebelumnya" · 404 "Approval tidak ditemukan"
```
`cutiController.js:3-145`, `cutiModel.js:45-137`. `dates` = daftar tanggal harian (bukan rentang), `remark` = keterangan.

### Izin
```
GET  /api/izin/keperluan?type=1|2[&idSubGroup=]
                                   → { "data": [ { idSubGroup, subDetail, numDays, typeDays, docSupport, docTime } ] }
GET  /api/izin/transaksi?type=1|2  → { "data": [ { id, jenis, tanggal, alasan } ] }   ← hanya 4 field ini
POST /api/izin/submit              Body: { ProposeStartDate, ProposeEndDate, ProposeStartTime, ProposeEndTime,
                                           description, keperluan, fileName, approvers:["NIP"] }
                                   200: { "id": "IZ.<NIP>.<epoch><2digit>", "name": "..." }
                                   400: "ProposeStartDate dan ProposeEndDate wajib diisi" | "approvers wajib minimal 1 atasan"
GET  /api/izin/approval/izin?status=&search=
                                   → { "data": [ { id, priority, nip, nama, statusId, updDate, updates, jenis,
                                                   tanggalMulai, tanggalSelesai, jamMulai, jamSelesai, alasan } ] }
POST /api/izin/approval/approve    Body: { id, action } → { success, message }
```
`izinController.js:17-147`, `izinModel.js:19-203`.
Catatan penting: **`keperluan` = `IdSubGroup`** (string angka dari `GET /api/izin/keperluan`), bukan teks bebas; teks masuk ke `description`. Kalau `ProposeStartTime`/`ProposeEndTime` kosong, backend menyimpan izin tanpa jam (`izinModel.js:77-120`).

### Tugas Luar
```
GET  /api/travel/atasan            → { "data": [ { nip, name, ... } ] }
GET  /api/travel/transaksi         → { "data": [ { id, jenis, alasan, tanggalMulai, tanggalSelesai,
                                                   jamMulai, jamSelesai, status, currentLevel } ] }
POST /api/travel/submit            Body: { exitDate:"YYYY-MM-DD", exitTime:"HH:MM", tujuan, tugas, atasanNIP }
                                   200: { "id": "T.<NIP>.<epoch><2digit>" }
                                   400: "tanggal keluar, jam keluar, dan tujuan wajib diisi" | "atasanNIP wajib diisi"
GET  /api/travel/approval          → { "data": [ { id, nip, nama, tujuan, alasan, tanggalMulai, tanggalSelesai,
                                                   jamMulai, jamSelesai, level, statusId, status, updates, currentLevel } ] }
POST /api/travel/approval/approve  Body: { id, action } → { success }
```
`travelController.js:22-176`. Level approver dihitung server dari departemen pemanggil (`travelController.js:126`) — jangan kirim `role`/`level` dari klien (diabaikan, hanya menyesatkan).

### Gotcha pemetaan field (mudah salah)

| Modul | Field API | Isi sebenarnya |
|---|---|---|
| Cuti | `jenis` | nama tipe cuti (`LeaveTypeName`) |
| Cuti | `alasan` | `LeaveRemark` |
| Cuti | `hari` | string `"<n> hari"` |
| Cuti | `periode` | gabungan tanggal (`"2026-01-05, 2026-01-06"`) |
| Cuti | `approvals` | array dari JSON (`Name`, `JobLevel`, `Status`) |
| Izin | `jenis` | `SubDetail` (nama jenis izin) |
| Izin | `alasan` | `Description` |
| Travel | `jenis` | **Tujuan** |
| Travel | `alasan` | **Tugas/Keperluan** |
| Travel | `jamMulai`/`jamSelesai` | jam keluar / jam kembali (`null` bila belum dicatat kembali) |

Status cuti/izin berupa teks dari view (`LeaveStatusName`, `updates` = `Propose`/`Approved`/`Rejected`); status travel lowercase (`pending`/`approved`/`rejected`). **Jangan menormalkan dengan asumsi** — tampilkan apa adanya, dan uji dengan data nyata.

## Auth & sesi

- Simpan token di `localStorage` key **`bmc.auth.token`** (samakan dengan `bmc-appv2/lib/api.ts:6`; jangan pakai `bmc.security.token` — itu milik aplikasi petugas).
- Kirim `Authorization: Bearer <token>` di semua request kecuali login.
- **401** → hapus token, kembali ke layar login, tampilkan "Sesi berakhir, silakan masuk lagi". Jangan reload tanpa penjelasan.
- Error non-OK → tampilkan `data.error` dari server apa adanya (sudah bahasa Indonesia).
- **Jangan pernah** menyimpan password atau menulis kredensial di kode.

## Validasi (trust boundary)

Validasi di klien **dan** andalkan 400 dari server:

- **Semua form**: atasan wajib dipilih (server menolak `approvers`/`atasanNIP` kosong).
- **Cuti**: minimal 1 tanggal; `remark` (keterangan) wajib; tolak tanggal Minggu; peringatkan bila jumlah hari > `Saldo` dari `GET /api/cuti/saldo` (`bmc-appv2/app/ajuancuti.tsx:106-145`).
- **Izin**: `ProposeStartDate` & `ProposeEndDate` wajib; selesai tidak boleh sebelum mulai; `keperluan` wajib dipilih.
- **Tugas Luar**: `exitDate`, `exitTime`, `tujuan` wajib (`tugas` opsional).
- Semua string di-`trim()`; kirim `''` (bukan `undefined`) untuk field opsional.
- Tanggal dikirim `YYYY-MM-DD`, jam `HH:MM` — pakai `<input type="date">` / `<input type="time">`, jangan bikin date picker sendiri.
- Tombol submit `disabled` sampai field wajib terisi; pesan validasi tampil inline di dekat form, **bukan `alert()`**.

## Aturan kode

1. **Function component + hooks saja.** Tanpa class component.
2. Helper murni (validasi, mapping payload, format tanggal/jam, label status) di `src/hr.js` supaya bisa diuji tanpa browser. Satu fungsi per modul: `buildCutiPayload`, `buildIzinPayload`, `buildTravelPayload`.
3. Format tanggal tampil `id-ID`; `jam(t)` = `t ? String(t).slice(0, 5) : '—'`.
4. Label status: `Approved`/`approved` → "Disetujui", `Rejected`/`rejected` → "Ditolak", lainnya → "Menunggu".
5. Setelah submit sukses: reset form, tampilkan pesan sukses berisi ID pengajuan, refetch riwayat. Jangan asumsikan sukses tanpa respons server.
6. Layar approval hanya menampilkan item yang belum diproses (`updates === 'Propose'` untuk cuti/izin; `status` bukan `approved`/`rejected` untuk travel) dan menyembunyikan tombol setelah diproses.
7. Jangan menambah dependency apa pun tanpa persetujuan eksplisit.

## Style

- CSS variables di `src/index.css`: `--brand: #2563eb` (safir BMC, sama dengan `bmc-appv2`), `--ink`, `--ink-soft`, `--line`, `--canvas`, plus `--ok`/`--warn`/`--err`. **Jangan hard-code hex di JSX** — pakai class atau `var(...)`.
- Mobile-first, satu kolom, `max-width` ~760px. Tabel riwayat jadi daftar kartu di layar kecil.
- Tanpa library ikon. Bila perlu ikon, inline SVG stroke 1.6 (pola `security/src/components/icons.jsx`).
- Loading state wajib: tombol submit menampilkan "Mengirim…" dan `disabled` selama request jalan.

## Saat menyelesaikan tugas

1. `npm install` lalu `npm run check` — self-check helper wajib lulus.
2. `npm run build` — wajib sukses tanpa error.
3. Uji manual: `npm start` di `bmc-app-backend`, lalu `npm run dev` di sini → login NIP asli, submit 1 pengajuan **per modul** (cuti, izin, tugas luar), pastikan muncul di riwayat dengan status "Menunggu".
4. Uji jalur gagal: submit tanpa field wajib harus memunculkan pesan error server, bukan sukses palsu; request tanpa token harus memaksa kembali ke layar login.
5. Commit message dan UI text dalam bahasa Indonesia.

## Yang jangan dilakukan

- Jangan mengubah `bmc-app-backend`, `security/`, atau `bmc-appv2/`.
- Jangan membuat endpoint baru atau menyentuh DB langsung dari front-end.
- Jangan mengubah nama field API, key localStorage, atau struktur respons.
- Jangan menambahkan fitur monitoring petugas, catat kembali, laporan, pengumuman, atau push ke web ini.
- Jangan mengirim `role`/`level` ke endpoint approval travel — server yang menentukan.
- Jangan commit `.env` (cukup `.env.example`).
