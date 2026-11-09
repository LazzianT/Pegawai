# Travel WhatsApp Approval Message Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Menyeragamkan pesan WhatsApp approval Tugas Luar mandiri dan group dengan judul bold, detail pengajuan, serta link approval.

**Architecture:** Tambahkan satu formatter murni di `backend/src/services/waService.js` agar dua model memakai format sama. Formatter menerima data terstruktur, mengubah field kosong menjadi `-`, lalu hasilnya dikirim melalui routing WhatsApp yang sudah ada. Tidak mengubah kontrak API atau transaksi DB.

**Tech Stack:** Node.js, CommonJS, `node:assert/strict` self-check, SQL Server existing models.

**Spec:** Persetujuan pengguna pada percakapan.

## Global Constraints

- Backend tetap Express; kontrak API tidak berubah.
- Jangan menambah dependency.
- Jangan hard-code secret atau nomor QA.
- `WA_TRAVEL_QA_PHONE` tetap menentukan routing QA.
- Error WhatsApp tidak boleh membatalkan insert/submit DB.
- Pesan UI/WhatsApp berbahasa Indonesia, kecuali judul `Employee Portal BMC`.

## Review Focus

- Field kosong pada tujuan, keperluan, kendaraan, atau nama anggota harus tampil `-`, bukan `undefined`/string kosong.
- Group harus menampilkan semua anggota dalam format `Nama (NIP)`.
- Mandiri harus menampilkan satu pemohon dalam format yang sama.
- Link approval kosong hanya menghilangkan baris link, tanpa merusak pesan.
- Formatter tidak boleh mengubah routing penerima atau status transaksi.

---

### Task 1: Formatter pesan WhatsApp

**Files:**
- Modify: `backend/src/services/waService.js`
- Modify: `backend/src/services/waService.check.mjs`

**Interfaces:**
- Produces: `formatTravelApprovalMessage({ approverName, members, tujuan, keperluan, vehicle, approvalLink }) -> string`.
- `members` berupa array objek `{ name, nip }`.

- [ ] **Step 1: Write the failing self-check**

Tambahkan import formatter dan assert bahwa hasil memuat:
- `*Employee Portal BMC*`
- `Dear *Nama Atasan*`
- `Nama Karyawan (0377)`
- `Tujuan: Kantor pusat`
- `Keperluan: Rapat`
- `Kendaraan: MOTOR`
- link approval.

Tambahkan assert field kosong menghasilkan `-` dan group dua anggota menghasilkan dua baris bernomor.

- [ ] **Step 2: Run self-check to verify it fails**

Run: `npm test`
Expected: FAIL karena `formatTravelApprovalMessage` belum tersedia.

- [ ] **Step 3: Implement formatter minimal**

Format wajib:

```text
*Employee Portal BMC*

Dear *{approverName}*,

Terdapat permintaan approval Tugas Luar dengan detail berikut:

Nama:
1. {name} ({nip})

Tujuan: {tujuan}
Keperluan: {keperluan}
Kendaraan: {vehicle}

Mohon lakukan persetujuan melalui link berikut:
{approvalLink}
```

Jika `approvalLink` kosong, hilangkan bagian link beserta labelnya. Export formatter dari `waService.js`.

- [ ] **Step 4: Run self-check to verify it passes**

Run: `npm test`
Expected: PASS.

### Task 2: Pakai formatter pada submit mandiri dan group

**Files:**
- Modify: `backend/src/models/travelModel.js`
- Modify: `backend/src/models/travelGroupModel.js`

**Interfaces:**
- Consumes: `formatTravelApprovalMessage` dari `../services/waService`.
- Mandiri mengirim `{ name: submitterName, nip: NIP }`.
- Group mengirim daftar anggota hasil query `NIP` + `Name`, tujuan/tugas/kendaraan dari versi group, serta link queue.

- [ ] **Step 1: Extend failing source self-check**

Assert `travelModel.js` dan `travelGroupModel.js` mengimpor serta memanggil `formatTravelApprovalMessage`.

- [ ] **Step 2: Run self-check to verify it fails**

Run: `npm test`
Expected: FAIL karena model belum memakai formatter bersama.

- [ ] **Step 3: Implement minimal integration**

Mandiri memakai field pengajuan yang sudah tersedia: `Tujuan`, `Keperluan`, `VehicleType`, pemohon, link queue. Group mengambil nama anggota dari query member/employee existing tanpa mengubah query approval atau kontrak response. Pertahankan `try/catch` notifikasi sehingga kegagalan WhatsApp tidak menggagalkan submit.

- [ ] **Step 4: Run full verification**

Run:

```powershell
cd backend
npm test
cd ..\frontend
npm run check
npm run build
```

Expected: semua command PASS.

- [ ] **Step 5: Review diff**

Run: `git diff --check`
Expected: tidak ada whitespace error; tidak ada secret atau nomor QA hard-code baru.
