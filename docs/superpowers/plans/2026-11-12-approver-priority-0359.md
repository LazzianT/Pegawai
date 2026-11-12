# Prioritas Approver 0359 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Menormalisasi approver `0363` menjadi `0359` pada pengajuan tugas luar mandiri dan group.

**Architecture:** Tambah helper murni backend `normalizeTravelApproverNIP` di `backend/src/models/travelApprover.js`. Model mandiri dan model group memakai helper sebelum menyimpan approval atau mengirim notifikasi.

**Tech Stack:** Node.js CommonJS, SQL Server models, assert-based self-check.

**Spec:** `docs/superpowers/specs/2026-11-12-approver-priority-0359-design.md`

## Global Constraints

- `0363` selalu dinormalisasi menjadi `0359`.
- `0359` tetap `0359`.
- Approver lain tetap tidak berubah.
- Berlaku mandiri + group.
- Backend menjadi sumber aturan.
- Tidak mengubah schema DB, endpoint, atau dependency.

## Review Focus

- Mandiri dengan `atasanNIP = 0363` menyimpan dan mengirim ke `0359`.
- Group dengan atasan `0363` hanya membuat satu approval `0359`.
- Group dengan atasan `0359` dan `0363` tetap deduplikasi menjadi satu `0359`.
- NIP whitespace tetap dinormalisasi tanpa mengubah NIP lain.
- Notifikasi memakai approver hasil normalisasi.

---

### Task 1: Shared approver normalization

**Files:**
- Create: `backend/src/models/travelApprover.js`
- Create: `backend/src/models/travelApprover.check.mjs`

**Interfaces:**
- Produces: `normalizeTravelApproverNIP(value) -> string`.

- [ ] **Step 1: Write failing self-check**

Assert `0363` and whitespace become `0359`, `0359` remains `0359`, another NIP remains unchanged.

- [ ] **Step 2: Run check and verify failure**

Run: `node src/models/travelApprover.check.mjs` from `backend`.
Expected: FAIL because the helper does not exist.

- [ ] **Step 3: Implement minimal helper**

Return `0359` when trimmed input equals `0363`; otherwise return the trimmed input.

- [ ] **Step 4: Run check**

Expected: PASS.

### Task 2: Apply to mandiri and group

**Files:**
- Modify: `backend/src/models/travelModel.js`
- Modify: `backend/src/models/travelGroupModel.js`
- Modify: `backend/src/models/travelModel.check.mjs`
- Modify: `backend/src/models/travelGroupModel.check.mjs`

**Interfaces:**
- Consumes: `normalizeTravelApproverNIP` from `./travelApprover`.
- Produces: approval inserts, approval queues, and WhatsApp notifications addressed to normalized `0359`.

- [ ] **Step 1: Write failing source checks**

Assert both models import/use `normalizeTravelApproverNIP`; assert mandiri normalizes before approval insert and group normalizes before deduplicating approvers.

- [ ] **Step 2: Run checks and verify failure**

Run: `npm test` from `backend`.
Expected: FAIL on the new source assertions.

- [ ] **Step 3: Implement minimal integration**

In `submitTravel`, normalize `atasanNIP` before building approval rows and notification recipient. In `submitGroup`, normalize each `approverForMember` result before adding it to the `Set`. Keep all other approval behavior unchanged.

- [ ] **Step 4: Run backend suite**

Run: `npm test` from `backend`.
Expected: PASS.

### Task 3: Final verification

- [ ] **Step 1:** Run `npm test` from `backend`.
- [ ] **Step 2:** Run `npm run check` and `npm run build` from `frontend`.
- [ ] **Step 3:** Run `git diff --check`.
