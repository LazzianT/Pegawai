# Group Approval Members Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Tampilkan anggota yang berangkat bersama pada kartu approval Tugas Luar group.

**Architecture:** Render inline pada `ApprovalCard` memakai `item.members` yang sudah dikirim API. Pengajuan mandiri tidak berubah.

**Tech Stack:** React, JSX, CSS existing, Vite.

**Spec:** `docs/superpowers/specs/2026-11-08-group-approval-members-design.md`

## Global Constraints

- Jangan ubah API, database, payload, status, atau alur approve/reject.
- Jangan tambah dependency atau komponen baru.
- Gunakan pola style existing.
- Data kosong tidak boleh menghasilkan blok kosong.

## Review Focus

- `members` kosong/tidak ada: blok anggota tidak tampil.
- Nama anggota punya whitespace SQL: trim saat render.
- NIP anggota kosong: tetap tampilkan nama tanpa teks NIP kosong.
- Pengajuan mandiri tanpa `members`: kartu tetap identik.

---

### Task 1: Tampilkan anggota group pada kartu approval

**Files:**
- Modify: `frontend/src/pages/TravelApprovalLinkPage.jsx:5-9`
- Test: `frontend/src/hr.check.mjs` bila self-check perlu diperluas; gunakan build sebagai pemeriksaan render JSX.

**Interfaces:**
- Consumes: `item.members`, array `{ nip, name }` dari response approval queue.
- Produces: blok informasi `Berangkat bersama` pada `ApprovalCard` hanya bila anggota tersedia.

- [ ] **Step 1: Tambahkan render inline**

Setelah detail pengajuan, render `<div>` berlabel `Berangkat bersama` bila `Array.isArray(item.members) && item.members.length`. Tampilkan setiap anggota dengan nama trim, lalu `NIP` bila tersedia. Jangan ubah tombol atau handler approval.

- [ ] **Step 2: Jalankan verifikasi**

Run: `npm run check`
Expected: `hr self-check passed`.

Run: `npm run build`
Expected: Vite build sukses tanpa error.

- [ ] **Step 3: Periksa diff**

Run: `git diff -- frontend/src/pages/TravelApprovalLinkPage.jsx`
Expected: hanya perubahan render informasi anggota dan tidak ada perubahan kontrak API.
