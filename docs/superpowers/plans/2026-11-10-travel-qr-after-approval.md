# QR Tugas Luar Setelah Persetujuan Final Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tampilkan tombol QR untuk pengajuan tugas luar group setelah approval final disetujui.

**Architecture:** Gunakan response backend existing `/travel/groups/mine`; mapping frontend meneruskan `QrToken` dan `DepartureAt` ke row riwayat. Handler QR existing tetap dipakai, tanpa endpoint atau format baru.

**Tech Stack:** React, Vite, Node assert self-check.

**Spec:** `docs/superpowers/specs/2026-11-10-travel-qr-after-approval-design.md`

## Global Constraints

- Tidak membuat endpoint baru.
- Tidak mengubah status approval, token, atau data perjalanan.
- QR hanya tampil untuk approval final dan token valid.
- Gunakan helper `canShowTravelQr` dan handler QR existing.

## Review Focus

- Group approved dengan `QrToken` valid harus menampilkan tombol QR.
- Group pending/revision tidak boleh menampilkan QR.
- Group approved tanpa token atau sudah berangkat tidak boleh menampilkan QR.
- Mandiri existing tidak berubah.

---

### Task 1: Forward group QR fields

**Files:**
- Modify: `frontend/src/pages/DashboardPage.jsx`
- Modify: `frontend/src/pages/TugasLuarPage.jsx`
- Modify: `frontend/src/hr.check.mjs` atau existing self-check source location

**Interfaces:**
- Produces row fields `qrToken` and `departureAt` from group API fields `QrToken` and `DepartureAt`.

- [ ] **Step 1: Add failing self-check assertions**

Assert the group row mapping source includes `qrToken: item.QrToken || null` and `departureAt: item.DepartureAt || null`; assert Tugas Luar renders the existing QR action for approved rows.

- [ ] **Step 2: Run self-check and confirm RED**

Run: `npm run check` in `frontend`.
Expected: failure because group mapping does not forward the QR fields.

- [ ] **Step 3: Implement minimal mapping**

Add only the two fields to the existing group row mapping. Keep existing `canShowTravelQr(row)` condition and `showQr(row)` handler; no new component or endpoint.

- [ ] **Step 4: Run frontend self-check and build**

Run: `npm run check; npm run build` in `frontend`.
Expected: both pass.

### Task 2: Full verification

- [ ] **Step 1: Run backend suite**

Run: `npm test` in `backend`.
Expected: all checks pass.

- [ ] **Step 2: Run frontend suite and diff hygiene**

Run: `npm run check; npm run build` in `frontend`, then `git diff --check`.
Expected: all commands exit 0.
