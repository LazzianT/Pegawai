# Group Vehicle Driver Selection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Pengelola kendaraan dapat memilih mode/nama sopir pada approval Tugas Luar group; pilihan tersimpan dan pemohon menerima WA detail setelah approve.

**Architecture:** Reuse halaman approval direct dan `formatTravelApprovalMessage`. Frontend mengirim `driverMode`/`driverName`; controller memvalidasi trust boundary; model menyimpan dalam transaksi lalu mengirim WA setelah commit.

**Tech Stack:** React, Express, SQL Server, native `fetch`, existing self-check `.mjs`.

**Spec:** `docs/superpowers/specs/2026-11-08-group-vehicle-driver-design.md`

## Global Constraints

- Tidak menambah dependency.
- Tidak mengubah endpoint atau schema DB.
- Approval tersimpan walau pengiriman WA gagal.
- `DRIVER` wajib memiliki nama sopir; `SELF` memakai pengemudi pengajuan.
- String input di-trim dan divalidasi di trust boundary.

## Review Focus

- `DRIVER` tanpa nama harus ditolak tanpa perubahan DB.
- `SELF` harus mengirim nama/NIP pengemudi pengajuan.
- Reject tidak meminta sopir atau mengirim notifikasi approve.
- WA gagal setelah commit tidak boleh membatalkan approval.
- Payload direct harus memuat pilihan sopir yang dipilih.

---

### Task 1: Backend validation, persistence, and notification

**Files:**
- Modify: `backend/src/controllers/travelController.js`
- Modify: `backend/src/models/travelGroupModel.js`
- Modify: `backend/src/models/travelGroupModel.check.mjs`
- Modify: `backend/src/controllers/travelController.check.mjs`

**Interfaces:**
- Direct endpoint continues receiving `action`, `vehicleType`, `vehiclePlate`, `driverMode`, `driverName`.
- Group model stores `DriverMode` and `DriverName`, then calls `sendWaToNIP` after commit.

- [ ] **Step 1: Write failing self-checks**
  - Assert controller validates `driverMode` and `driverName`.
  - Assert model updates `DriverMode`/`DriverName` only on approval.
  - Assert model sends group detail notification after commit.

- [ ] **Step 2: Run checks and verify failure**

Run: `node src/models/travelGroupModel.check.mjs; node src/controllers/travelController.check.mjs`
Expected: FAIL because current direct group approval does not accept/store driver selection or notify the requester.

- [ ] **Step 3: Implement minimal backend behavior**
  - Controller validates mode in `SELF|DRIVER` for `OFFICE|MOTOR`; validates non-empty driver name for `DRIVER`; passes both values to `approveGroupVehicle`.
  - Model accepts `driverMode`, `driverName`; on approve updates version vehicle fields plus driver fields in the same transaction.
  - After commit, query group members/details and call `sendWaToNIP` for each active member using the existing detail format. Notification failure is caught/logged without rollback.

- [ ] **Step 4: Run checks and verify pass**

Run: `npm run test` in `backend`.
Expected: all backend self-checks pass.

### Task 2: Direct approval UI

**Files:**
- Modify: `frontend/src/pages/VehicleApprovalLinkPage.jsx`

**Interfaces:**
- Uses `item.driverMode`, `item.driverNIP`, `item.driverName` as defaults.
- Sends `driverMode` and `driverName` in direct approval POST body.

- [ ] **Step 1: Add UI regression check through existing build contract**
  - Confirm source contains driver mode selection, required driver name condition, and payload fields.

- [ ] **Step 2: Implement minimal UI**
  - Add radio/select choice for `SELF`/`DRIVER`.
  - Default from item data.
  - Show name input for `DRIVER`; disable approval while name empty.
  - Keep existing vehicle/plate validation and loading states.
  - Send trimmed values.

- [ ] **Step 3: Build and verify**

Run: `npm run build` in `frontend`.
Expected: Vite build succeeds.

### Task 3: Final verification

- [ ] Run `npm run test` in `backend`.
- [ ] Run `npm run check` in `frontend`.
- [ ] Run `npm run build` in `frontend`.
- [ ] Run `git diff --check` on changed source files.
- [ ] Confirm `.env` and secrets are unchanged/untracked.
