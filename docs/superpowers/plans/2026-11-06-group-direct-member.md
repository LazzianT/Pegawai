# Group Direct Member Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Creator dapat memasukkan beberapa NIP sebelum detail tugas luar, lalu backend menambahkan target langsung sebagai anggota `ACTIVE` melalui endpoint khusus.

**Architecture:** Backend menambah endpoint `POST /travel/groups/:code/members/direct`; endpoint invite lama tidak disentuh. Frontend menyimpan NIP lokal, membuat group setelah detail valid, lalu memanggil endpoint direct satu per satu dan mempertahankan group jika sebagian gagal.

**Tech Stack:** Node.js, Express, SQL Server, React 18, Vite.

**Spec:** `docs/superpowers/specs/2026-11-06-group-direct-member-design.md`

## Global Constraints
- Target NIP divalidasi di backend; nama tidak dipercaya dari client.
- Hanya creator group yang boleh menambah direct member.
- Insert target memakai `Status = 'ACTIVE'`.
- Endpoint invite existing tetap tidak berubah.
- Tidak menghapus group atau anggota sukses saat target lain gagal.
- Tidak menambah dependency.

## Review Focus
- NIP kosong/non-digit ditolak sebelum SQL.
- User bukan creator ditolak.
- Target employee tidak ditemukan ditolak tanpa insert.
- Target duplicate aktif idempotent.
- Partial failure mempertahankan group code dan daftar target yang gagal.

### Task 1: Backend direct-member endpoint
**Files:**
- Modify: `Y:\bmc-app-backend\src\models\travelGroupModel.js`
- Modify: `Y:\bmc-app-backend\src\controllers\travelController.js`
- Modify: `Y:\bmc-app-backend\src\routes\travelRoutes.js`
- Test: existing backend syntax/self-check mechanism, if available

- [ ] Tambah failing source self-check untuk export, route, dan handler direct-member.
- [ ] Jalankan check backend dan pastikan gagal karena simbol belum ada.
- [ ] Implementasikan model `addDirectGroupMember(code, actorNIP, memberNIP)` dengan validasi, creator authorization, employee lookup, idempotent ACTIVE, serta parameterized insert.
- [ ] Tambahkan controller `addDirectTravelGroupMemberHandler` dengan validasi code/NIP dan response error konsisten.
- [ ] Tambahkan route authenticated `/groups/:code/members/direct` sebelum route parameter lain yang konflik.
- [ ] Jalankan syntax/check backend.

### Task 2: Frontend member-first flow
**Files:**
- Modify: `src/pages/TugasLuarPage.jsx`
- Modify: `src/index.css`
- Modify: `src/hr.check.mjs`

- [ ] Tambah failing self-check untuk class/member-first/direct endpoint.
- [ ] Jalankan `npm run check` dan pastikan gagal.
- [ ] Tambah state daftar NIP lokal dan input anggota pada panel Buat Group.
- [ ] Tampilkan daftar NIP sebelum group dibuat; validasi digit, dedupe, dan batasi sesuai server.
- [ ] Ubah create flow: buat group lalu kirim direct member satu per satu.
- [ ] Pertahankan group code serta NIP gagal bila request partial gagal; jangan menghapus group.
- [ ] Setelah sukses, load group; detail form existing tetap dipakai.
- [ ] Hilangkan kebutuhan tombol undang untuk member baru pada create flow; pertahankan kontrol existing untuk revision.
- [ ] Tambah style daftar anggota menggunakan token existing.
- [ ] Jalankan `npm run check`, `npm run build`, dan `git diff --check`.

### Task 3: Commit repository changes
- [ ] Review diff backend/frontend secara terpisah.
- [ ] Commit backend dengan pesan `feat: tambah anggota group langsung aktif`.
- [ ] Commit frontend dengan pesan `feat: alur anggota group sebelum detail`.
- [ ] Laporkan hash commit dan status push; push hanya jika diizinkan eksplisit untuk perubahan backend.
