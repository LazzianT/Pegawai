# Kepulangan Manual Tanpa QR Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Membatasi QR tugas luar untuk keberangkatan dan mencatat kepulangan hanya melalui tombol Security `Kembali ke kantor`.

**Architecture:** Pertahankan endpoint `/travel/return` sebagai jalur manual Security. Ubah hasil scan QR kedua agar tidak melakukan toggle kepulangan, lalu sembunyikan aksi QR pada riwayat user setelah keberangkatan tercatat.

**Tech Stack:** React + Vite frontend; Node.js + Express backend; self-check berbasis `assert`.

**Spec:** `docs/superpowers/specs/2026-11-03-manual-return-without-qr-design.md`

## Global Constraints

- Jangan menyentuh `security/`, `bmc-appv2/`, atau DB schema.
- Jangan menghapus endpoint `/travel/return`.
- Jangan mengubah data scan aktual yang sudah tersimpan.
- Tidak menambah dependency.
- Jalankan self-check/build sebelum selesai.

## Review Focus

- QR dipindai kedua kali setelah berangkat: tidak boleh mencatat kepulangan.
- QR belum pernah dipindai: tetap mencatat keberangkatan.
- User sudah berangkat tetapi belum kembali: tombol QR tidak tampil.
- User sudah kembali: tombol QR tidak tampil dan data tetap terlihat.
- Jalur manual Security `/travel/return`: tetap tersedia.

---

### Task 1: Kunci scan QR hanya untuk keberangkatan

**Files:**
- Modify: `Y:\bmc-app-backend\src\models\travelModel.js`
- Modify: `Y:\bmc-app-backend\src\models\travelModel.check.mjs`
- Modify: `Y:\bmc-app-backend\src\controllers\travelController.js` jika pesan/status perlu disesuaikan

**Interfaces:**
- Consumes: `scanTravel(travelId, token)`.
- Produces: scan pertama `departed`; scan ulang tidak mengubah data dan menghasilkan status non-return.

- [ ] **Step 1: Add failing self-check**
  Tambahkan assert yang mengunci kontrak helper/hasil scan ulang tanpa koneksi DB; bila helper belum ada, assert harus gagal karena simbol belum tersedia.

- [ ] **Step 2: Run backend self-check and confirm expected failure**

```bash
npm test
```

Expected: FAIL pada kontrak scan ulang.

- [ ] **Step 3: Implement minimal guard in `scanTravel`**
  Jika `departureAt` sudah ada, jangan menjalankan update kepulangan; kembalikan status `already_departed` atau status non-mutating yang dipetakan controller sebagai respons aman.

- [ ] **Step 4: Update controller response**
  Jangan mengklaim `returned` pada scan ulang; gunakan pesan bahwa kepulangan dicatat Security melalui tombol manual.

- [ ] **Step 5: Run backend checks**

```bash
npm test
node --check src/models/travelModel.js
node --check src/controllers/travelController.js
```

Expected: PASS.

### Task 2: Sembunyikan QR user setelah keberangkatan

**Files:**
- Modify: `D:\Developing\bmc-web\src\pages\TugasLuarPage.jsx`
- Modify: `D:\Developing\bmc-web\src\hr.check.mjs`

**Interfaces:**
- Consumes: row fields `qrToken`, `departureAt`, `tanggalKembali`, `jamKembali`.
- Produces: tombol `Tampilkan QR` hanya saat QR belum dipakai.

- [ ] **Step 1: Add failing self-check**
  Tambahkan helper pure `canShowTravelQr(travel)` dan assert: true sebelum berangkat, false setelah `departureAt`, false setelah kepulangan.

- [ ] **Step 2: Run frontend check and confirm expected failure**

```bash
npm run check
```

Expected: FAIL karena helper belum tersedia.

- [ ] **Step 3: Implement `canShowTravelQr` in `src/hr.js`**
  Return false bila `departureAt`, `tanggalKembali`, atau `jamKembali` tersedia; selain itu true.

- [ ] **Step 4: Gate the QR button and copy**
  Render `Tampilkan QR` hanya jika `canShowTravelQr(row)` true. Ubah copy modal menjadi `Pindai QR ini di Security saat berangkat.`

- [ ] **Step 5: Run frontend checks**

```bash
npm run check
npm run build
git diff --check
```

Expected: PASS.

### Task 3: Final review

**Files:**
- Review only changed files.

- [ ] **Step 1: Confirm manual return route remains unchanged**
  Verify `/travel/return` still exists and `security/` has no diff.

- [ ] **Step 2: Inspect diff for scope/data safety**

```bash
git diff --stat
git diff -- Y:\bmc-app-backend\src\models\travelModel.js Y:\bmc-app-backend\src\controllers\travelController.js src\hr.js src\hr.check.mjs src\pages\TugasLuarPage.jsx
git status --short
```

- [ ] **Step 3: Report verification evidence and deployment requirement**
  State backend restart requirement separately from frontend deployment requirement.
