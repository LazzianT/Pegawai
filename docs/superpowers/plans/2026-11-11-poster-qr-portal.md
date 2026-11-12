# Poster QR Portal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Buat poster A4 BMC Online dengan QR besar, tiga layanan HR, dan mockup layar handphone dalam PDF + PNG.

**Architecture:** Halaman HTML/CSS statis baru di `poster-portal/`, QR PNG statis dari package `qrcode`, lalu generator Node existing-style memakai Chrome/Playwright untuk PDF dan screenshot PNG. Checker Node memvalidasi output, URL, halaman, aset, dan ketiadaan kredensial.

**Tech Stack:** HTML/CSS, Node.js, `qrcode` existing, `playwright-core` existing, Chrome.

**Spec:** `docs/superpowers/specs/2026-11-11-poster-qr-portal-design.md`

## Global Constraints

- URL exact: `https://employee-portal.bmc.co.id`.
- Output: `BMC-Online-Poster-Portal.pdf` dan `BMC-Online-Poster-Portal.png`.
- Tidak menambah dependency.
- PDF A4 portrait satu halaman.
- Copy bahasa Indonesia.
- Tidak ada password, username, atau kredensial.
- Jangan mengubah backend, `security/`, `bmc-appv2/`, atau aplikasi utama.

## Review Focus

- QR asset hilang atau kosong harus membuat generator berhenti dengan error jelas.
- Poster harus tetap satu halaman A4; overflow tidak boleh membuat halaman kedua.
- URL source harus exact dan selectable di PDF.
- Layout PNG harus memperlihatkan QR, tiga layanan, dan mockup handphone tanpa overlap.
- Build aplikasi existing tidak boleh menghapus output PDF poster root.

---

### Task 1: Poster source, QR asset, generator, checker

**Files:**
- Create: `poster-portal/index.html`
- Create: `poster-portal/styles.css`
- Create: `poster-portal/assets/portal-qr.png`
- Create: `scripts/build-portal-poster.mjs`
- Create: `scripts/check-portal-poster.mjs`
- Modify: `package.json`

**Interfaces:**
- Generator input: `poster-portal/index.html`.
- Generator outputs: `BMC-Online-Poster-Portal.pdf`, `BMC-Online-Poster-Portal.png`.
- Checker expects one PDF page, exact URL, poster copy, QR asset, and non-empty outputs.

- [ ] **Step 1: Add failing checker and scripts entry**

Add `build:poster:portal` and `check:poster:portal` scripts. Checker must fail when poster output/source/assets are missing.

- [ ] **Step 2: Run checker to confirm RED**

Run: `npm run check:poster:portal`
Expected: FAIL with missing poster/output errors.

- [ ] **Step 3: Create QR asset**

Generate `poster-portal/assets/portal-qr.png` with `qrcode`, exact payload `https://employee-portal.bmc.co.id`, high error correction, white quiet zone.

- [ ] **Step 4: Create poster HTML/CSS**

Build one A4 portrait sheet with:
- Brand/header and small label `BMC Online`.
- Large headline and exact URL.
- Large QR plus `Scan untuk membuka portal`.
- Three grid cards: `Cuti`, `Izin`, `Tugas Luar`, each with inline SVG icon.
- CSS phone mockup showing a synthetic BMC Online dashboard and the three service labels.
- No credentials or invented personal data.
- Add an HTML comment contract at body start documenting thesis, world, story, viewport, form, and finish line.

- [ ] **Step 5: Implement generator**

Validate input HTML, CSS, and `portal-qr.png`; launch Chrome; generate one-page A4 PDF with selectable URL; capture the same page as PNG; fail clearly if assets are missing.

- [ ] **Step 6: Run generator and checker**

Run:
```text
npm run build:poster:portal
npm run check:poster:portal
```
Expected: PDF checker passes one page; PNG/PDF non-empty; exact URL and service labels present.

### Task 2: Full verification and visual inspection

**Files:**
- No additional source changes expected unless visual defect is found.

- [ ] **Step 1: Run required repository checks**

Run:
```text
npm install
npm run check
npm run build
npm run build:poster:portal
npm run check:poster:portal
```
Expected: all exit 0.

- [ ] **Step 2: Inspect poster PNG**

Open `BMC-Online-Poster-Portal.png`. Confirm QR, URL, three service cards, phone mockup, no overlap/cutoff.

- [ ] **Step 3: Run mechanical design detector**

Run:
```text
node C:\Users\falah\.config\opencode\skills\impeccable\scripts\detect.mjs --json poster-portal/index.html poster-portal/styles.css
```
Expected: no blocking detector findings.

- [ ] **Step 4: Check credentials and output files**

Confirm poster source contains no `password`, `username`, `credential`, or account values. Confirm root PDF/PNG exist and are non-empty.
