# Kirim WhatsApp Approval Kendaraan ke Nomor Tiap Pengelola Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Kirim link approval kendaraan ke nomor `Phone` masing-masing NIP pengelola kendaraan.

**Architecture:** Backend membaca `WA_VEHICLE_MANAGER_NIPS`, query nomor dari `BMC.dbo.hris_Employee`, lalu memanggil pengiriman WhatsApp per pengelola. `WA_TEST_PHONE` tetap menjadi override terpusat di `sendWa`; nomor kosong dilewati tanpa menggagalkan pengiriman lain.

**Tech Stack:** Node.js CommonJS, `mssql`, fetch, self-check berbasis `node:assert`.

**Spec:** `D:\Developing\bmc-web\docs\superpowers\specs\2026-11-02-vehicle-manager-phone-design.md`

## Global Constraints

- Jangan hard-code nomor telepon atau secret.
- Jangan mengubah schema DB, endpoint, atau alur approval.
- Pertahankan `WA_TEST_PHONE` sebagai override testing.
- Error satu penerima tidak boleh membatalkan penerima lain.
- Nomor invalid/kosong tidak dikirim.

## Review Focus

- NIP pengelola tidak ditemukan: dilewati, penerima lain tetap dikirimi.
- `Phone` kosong atau invalid: tidak memanggil API WhatsApp.
- Tiga pengelola: masing-masing menerima satu pesan, bukan nomor koordinator bersama.
- `WA_TEST_PHONE` terisi: semua kiriman tetap diarahkan ke nomor testing melalui `sendWa`.
- Query DB gagal: error ditangani tanpa memutus approval utama.

---

### Task 1: Helper penerima WhatsApp pengelola

**Files:**
- Modify: `Y:\bmc-app-backend\src\services\waService.js`
- Modify: `Y:\bmc-app-backend\src\services\waService.check.mjs`
- Modify: `Y:\bmc-app-backend\package.json`

**Interfaces:**
- Produces: `getVehicleManagerRecipients() -> Promise<Array<{ nip: string, name: string, phone: string }>>`.

- [ ] **Step 1: Tambahkan self-check pure untuk aturan penerima**
  Uji bahwa daftar hasil hanya memuat nomor yang tidak kosong dan whitespace di-trim. Jangan memerlukan koneksi DB dalam self-check.

- [ ] **Step 2: Implementasikan `getVehicleManagerRecipients()`**
  Query `BMC.dbo.hris_Employee` dengan NIP dari `VEHICLE_MANAGER_NIPS`, ambil `NIP, Name, Phone`, map nilai string ter-trim, filter `Phone` kosong. Tangani hasil kosong sebagai array kosong.

- [ ] **Step 3: Jalankan self-check backend**
  Run: `npm test`
  Expected: seluruh self-check pass.

### Task 2: Kirim ke nomor tiap pengelola

**Files:**
- Modify: `Y:\bmc-app-backend\src\models\travelModel.js`
- Modify: `Y:\bmc-app-backend\src\services\waService.js`

**Interfaces:**
- Consumes: `getVehicleManagerRecipients()` dari Task 1.

- [ ] **Step 1: Ganti tujuan kirim pada approval level 1**
  Untuk setiap pengelola, ambil nomor dari helper lalu panggil `sendWa({ no: recipient.phone, text: detail + approvalLink })`. Pertahankan isi link token milik NIP pengelola.

- [ ] **Step 2: Tangani kegagalan query/pengiriman secara aman**
  Pertahankan approval DB sukses walau notifikasi gagal. Log error tanpa menulis password, token sensitif, atau nomor lengkap.

- [ ] **Step 3: Validasi sintaks dan test**
  Run: `node --check src/services/waService.js; node --check src/models/travelModel.js; npm test`
  Expected: syntax check pass dan semua self-check pass.

### Task 3: Final verification

**Files:**
- No additional files.

- [ ] **Step 1: Periksa diff**
  Run: `git diff --check` dari repo backend jika tersedia; jika backend bukan Git repo, jalankan pemeriksaan file tanpa staging.

- [ ] **Step 2: Pastikan konfigurasi tetap secret-only**
  Cari `WA_VEHICLE_MANAGER_PHONE` dan pastikan tidak lagi dipakai sebagai tujuan utama pengiriman pengelola; jangan menampilkan isi `.env` di commit atau output.

- [ ] **Step 3: Laporkan deployment**
  Perubahan berada di `Y:\bmc-app-backend`; restart backend setelah file diterapkan. Frontend tidak berubah.
