# Jenis Tugas Luar Radio Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans.

**Goal:** Menyamakan tampilan radio Mandiri/Group dengan kartu pilihan kendaraan.

**Architecture:** Pertahankan state dan handler existing. Tambah class `travel-mode-options`/`travel-mode-choice` pada markup, lalu style memakai token CSS existing.

**Tech Stack:** React, CSS, Vite.

**Spec:** `docs/superpowers/specs/2026-11-06-jenis-tugas-luar-radio-design.md`

## Global Constraints
- Tidak mengubah behavior, payload, validasi, routing, atau teks.
- Tidak menambah dependency.
- Mobile-first dan keyboard focus tetap terlihat.
- Commit hanya file fitur terkait.

## Review Focus
- State terpilih harus terlihat jelas.
- Radio tetap dapat dipilih keyboard dan screen reader.
- Layout tidak pecah pada mobile.

### Task 1: Radio mode styling
**Files:**
- Modify: `src/pages/TugasLuarPage.jsx`
- Modify: `src/index.css`
- Test: `src/hr.check.mjs`

- [ ] Tambah self-check yang memastikan markup memakai class mode baru.
- [ ] Jalankan `npm run check` dan pastikan gagal sebelum implementasi.
- [ ] Ubah markup minimal, pertahankan input radio, name, value, checked, handler.
- [ ] Tambah CSS kartu dua kolom, selected, hover, focus, mobile.
- [ ] Jalankan `npm run check`, `npm run build`, detector.
- [ ] Commit `style: theme tugas luar mode radio`.
- [ ] Push `main`.
