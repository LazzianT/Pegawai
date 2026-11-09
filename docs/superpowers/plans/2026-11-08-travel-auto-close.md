# Tugas Luar Auto-close Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Menutup otomatis perjalanan individual dan rombongan yang sudah berangkat tetapi belum kembali pada 00:00 Asia/Jakarta tanpa mengisi waktu pulang palsu.

**Architecture:** Tambahkan kolom audit nullable melalui SQL migration idempotent. Backend menjalankan job in-process tiap 60 detik, memakai query atomic untuk menandai perjalanan eligible. Mapping riwayat dan Security membaca penanda auto-close.

**Tech Stack:** Node.js, Express, SQL Server, `mssql`, JavaScript self-check berbasis `node:assert`.

**Spec:** `docs/superpowers/specs/2026-11-08-travel-auto-close-design.md`

## Global Constraints

- Tidak menambah dependency.
- Zona waktu cutoff: `Asia/Jakarta`.
- `EndDate` dan `EndTime` tetap `NULL` saat auto-close.
- Tidak menghapus data atau mengubah approval.
- Individual memakai `IsActive = 0` dan `AutoClosedAt`.
- Group memakai status `AUTO_CLOSED` dan `AutoClosedAt`.
- Job idempotent serta aman saat query gagal.

## Review Focus

- Perjalanan approved tetapi belum scan berangkat tidak boleh tertutup: self-check eligibility.
- Perjalanan sudah kembali tidak boleh tertutup: self-check eligibility.
- Perjalanan telah auto-close tidak diproses ulang: self-check guard.
- Perbedaan data individual dan group tidak boleh tercampur: separate SQL updates and self-check source assertions.
- Server restart tidak membuat timer ganda: scheduler start/stop API and app wiring inspection.

---

### Task 1: Database migration

**Files:**
- Create: `backend/sql/travel-auto-close.sql`

**Interfaces:**
- Produces idempotent SQL adding `AutoClosedAt DATETIME2 NULL` to `hris_Travel`, `hris_Travel_Group`, and `hris_Travel_Group_Version`.

- [ ] Write SQL using `COL_LENGTH` guards.
- [ ] Verify SQL names match model tables and no existing column is overwritten.
- [ ] Self-check by text inspection in the backend check script.

### Task 2: Auto-close model operations

**Files:**
- Modify: `backend/src/models/travelModel.js`
- Modify: `backend/src/models/travelGroupModel.js`
- Modify: `backend/src/models/travelModel.check.mjs`
- Modify: `backend/src/models/travelGroupModel.check.mjs`

**Interfaces:**
- Add pure helper `isAutoCloseEligible({ status, departureAt, returnedAt, autoClosedAt }) -> boolean` where needed for checkable cutoff predicates.
- Add `async autoCloseTravels(now)` returning affected count; update only `APPROVED`, active, departed, not returned, `AutoClosedAt IS NULL` rows.
- Add `async autoCloseTravelGroups(now)` returning affected count; update only approved groups/versions with departure, no return marker, `AutoClosedAt IS NULL`.
- Export both operations and helpers needed by checks.

- [ ] Add failing assertions for eligible and ineligible conditions.
- [ ] Implement atomic SQL updates preserving `EndDate` and `EndTime`.
- [ ] Implement group update for group and latest version in one transaction.
- [ ] Add source assertions for `AutoClosedAt IS NULL`, departure, and status conditions.
- [ ] Run backend self-checks.

### Task 3: Scheduler service and app wiring

**Files:**
- Create: `backend/src/services/travelAutoCloseService.js`
- Create: `backend/src/services/travelAutoCloseService.check.mjs`
- Modify: `backend/app.js`
- Modify: `backend/package.json` only if an existing check script needs registration.

**Interfaces:**
- `startTravelAutoCloseScheduler({ intervalMs = 60000 } = {}) -> { stop() }`.
- `runTravelAutoClose() -> Promise<{ individual, group }>`.
- Cutoff evaluation uses `Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta', ... })` and runs the close operation only when local Jakarta hour is `0`.

- [ ] Add self-check for Jakarta cutoff and non-cutoff hours.
- [ ] Add self-check that scheduler exposes `stop()` and does not create duplicate interval on repeated start within one service instance.
- [ ] Implement immediate run on server start, then a 60-second interval.
- [ ] Log errors without crashing the process.
- [ ] Wire scheduler once after Express setup.
- [ ] Run service self-check.

### Task 4: Response mapping and UI status

**Files:**
- Modify: `backend/src/models/travelModel.js`
- Modify: `backend/src/models/travelGroupModel.js`
- Modify: `backend/src/controllers/travelController.js`
- Modify: `backend/src/controllers/securityController.js` only if active query mapping needs the flag.
- Modify: `frontend/src/hr.js`
- Modify: `frontend/src/pages/TugasLuarPage.jsx` only if status rendering requires it.
- Modify: `frontend/src/hr.check.mjs`

**Interfaces:**
- Add `autoClosedAt` to travel response mappings.
- Map auto-closed rows to `status: 'auto_closed'` and label `Ditutup otomatis`.
- Group response maps `AUTO_CLOSED` consistently.

- [ ] Add self-check for `AUTO_CLOSED` label and source mapping.
- [ ] Preserve existing approved/rejected/pending labels.
- [ ] Ensure Security active queries exclude inactive individual rows and non-active groups.

### Task 5: Verification

**Files:**
- No new production files.

- [ ] Run `npm run check` in `backend`.
- [ ] Run `npm run check` in `frontend`.
- [ ] Run `npm run build` in `frontend`.
- [ ] Run backend tests if package defines them.
- [ ] Review diff for secrets, unintended data mutation, and migration idempotency.
