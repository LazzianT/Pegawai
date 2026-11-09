# Alur Buat Join Group Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans.

**Goal:** Memisahkan aksi Group menjadi pilihan eksplisit Buat Group atau Join Group.

**Architecture:** State `groupAction` lokal mengatur panel. Endpoint existing tetap dipakai. Detail tugas luar tetap shared.

**Tech Stack:** React, CSS, Vite.

**Spec:** `docs/superpowers/specs/2026-11-06-alur-buat-join-group-design.md`

## Global Constraints
- Tidak mengubah API backend, payload, validasi, status lifecycle, atau alur Mandiri.
- Tidak menambah dependency.
- Semua input tetap divalidasi di helper/handler existing.
- Commit hanya perubahan fitur terkait.

## Review Focus
- Buat Group memungkinkan create lalu tambah beberapa anggota.
- Join Group hanya menampilkan kode join.
- Submit Group tidak membuat group implisit.
- State existing group tetap dapat lanjut submit/revisi.

### Task 1: Pisahkan panel Buat/Join Group
**Files:**
- Modify: `src/pages/TugasLuarPage.jsx`
- Modify: `src/index.css`
- Modify: `src/hr.check.mjs`

- [ ] Tambah self-check untuk label/class `Buat Group` dan `Join Group`; jalankan check hingga gagal.
- [ ] Tambah state `groupAction` default `create`.
- [ ] Render dua kartu aksi hanya saat `travelMode === 'group'`.
- [ ] Panel create menampilkan tombol buat dan detail group/member setelah group tersedia.
- [ ] Panel join menampilkan kode, tombol join, serta konfirmasi bila group tersedia.
- [ ] Ubah submit Group agar tidak memanggil create saat belum ada group; tombol panel create memanggil `createGroup`.
- [ ] Tambah style kartu aksi serta responsive layout.
- [ ] Jalankan `npm run check`, `npm run build`, detector.
- [ ] Commit `feat: pisahkan aksi buat dan join group`.
- [ ] Push `main`.
