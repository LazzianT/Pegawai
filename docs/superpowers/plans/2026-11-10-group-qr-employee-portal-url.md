# Group QR Employee Portal URL Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Samakan URL QR group dengan `EMPLOYEE_PORTAL_URL`.

**Architecture:** Ubah satu sumber URL pada pembentukan pesan WhatsApp group. Pertahankan token, route, status, dan data perjalanan.

**Tech Stack:** Node.js, CommonJS, assert-based self-check.

**Spec:** `docs/superpowers/specs/2026-11-10-group-qr-employee-portal-url-design.md`

## Global Constraints

- Jangan menambah endpoint, dependency, env baru, atau mengubah token/status/data perjalanan.
- QR group dan perorangan memakai `EMPLOYEE_PORTAL_URL`.
- Jalankan self-check backend setelah perubahan.

## Review Focus

- `EMPLOYEE_PORTAL_URL` terisi: link QR group memakai URL tersebut.
- `SECURITY_QR_BASE_URL` berbeda/terisi: tidak lagi memengaruhi link QR group.
- Token dan path `/travel/groups/qr/` tetap utuh.

---

### Task 1: Samakan sumber URL QR group

**Files:**
- Modify: `backend/src/models/travelGroupModel.js:479-480`
- Modify: `backend/src/models/travelGroupModel.check.mjs`

**Interfaces:**
- Consumes: `EMPLOYEE_PORTAL_URL` dari `waService`.
- Produces: `qrLink` group berbentuk `${EMPLOYEE_PORTAL_URL}/travel/groups/qr/{code}/{qrToken}`.

- [ ] Ubah `qrBaseUrl` menjadi `EMPLOYEE_PORTAL_URL` tanpa fallback `SECURITY_QR_BASE_URL`.
- [ ] Perbarui self-check untuk memastikan sumber URL adalah `EMPLOYEE_PORTAL_URL`.
- [ ] Jalankan `npm test` di `backend`.
- [ ] Jalankan `git diff --check`.
