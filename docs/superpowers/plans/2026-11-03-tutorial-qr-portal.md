# Tutorial QR Portal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Tambahkan halaman QR portal BMC Online pada PDF tutorial Tugas Luar.

**Architecture:** Buat QR sebagai aset PNG statis, tambah satu `<section class="sheet">` pada HTML tutorial existing, lalu build PDF dengan generator existing. Tidak ada perubahan aplikasi.

**Tech Stack:** HTML/CSS existing, Node.js, Playwright/Chrome PDF generator.

**Spec:** `docs/superpowers/specs/2026-11-03-tutorial-qr-portal-design.md`

## Global Constraints

- URL QR exact: `https://employee-portal.bmc.co.id`.
- PDF existing tidak diubah.
- Tidak menambah dependency.
- Copy bahasa Indonesia.
- URL tampil sebagai teks selectable.

## Review Focus

- QR decode menghasilkan URL exact; test source/asset URL.
- Halaman tambahan tidak mengubah 8 halaman existing; checker mengharapkan 9.
- `npm run build` tidak menghapus output PDF root; build ulang PDF setelah app build.
- Aset QR hilang harus menghasilkan error generator yang jelas.
- Tidak ada password, secret, atau kredensial pada halaman.

---

### Task 1: QR asset dan halaman portal

**Files:**
- Create: `tutorial-tugas-luar/assets/portal-qr.png`
- Modify: `tutorial-tugas-luar/index.html`
- Modify: `scripts/build-travel-pdf.mjs`
- Modify: `scripts/check-travel-pdf.mjs`

**Interfaces:**
- QR asset encodes `https://employee-portal.bmc.co.id`.
- Tutorial menjadi 9 halaman.
- Generator memvalidasi `portal-qr.png`.
- Checker memvalidasi 9 halaman, URL, serta kata `QR code`/`portal`.

- [ ] **Step 1: Add failing checker expectations**

Update `scripts/check-travel-pdf.mjs` to expect 9 pages and source text containing the exact URL and portal instructions. Add `portal-qr.png` to generator asset validation.

- [ ] **Step 2: Run checker before implementation**

Run: `npm run check:pdf:tugas-luar`
Expected: FAIL because current PDF has 8 pages and the asset/source are missing.

- [ ] **Step 3: Generate the static QR asset**

Use already-installed `qrcode` package in a one-off Node command/script, then keep only `tutorial-tugas-luar/assets/portal-qr.png`. QR must encode exact URL.

- [ ] **Step 4: Add one final tutorial sheet**

Append a 9th sheet to `tutorial-tugas-luar/index.html` with:
- heading `Akses portal BMC Online`;
- QR image `assets/portal-qr.png`;
- exact URL `https://employee-portal.bmc.co.id`;
- three steps: scan QR, buka portal, login lalu pilih menu Tugas Luar;
- short warning not to share account credentials;
- layout using existing classes/tokens only.

- [ ] **Step 5: Build and verify PDF**

Run:
```text
npm run build:pdf:tugas-luar
npm run check:pdf:tugas-luar
```
Expected: PDF checker passes with 9 pages and exact URL/source checks.

- [ ] **Step 6: Verify QR payload**

Decode or inspect the generated QR using the existing `qrcode`/browser tooling. Expected payload: exact `https://employee-portal.bmc.co.id`.

### Task 2: Full repository verification

**Files:**
- No additional source changes expected.

- [ ] **Step 1: Run install and checks**

Run:
```text
npm install
npm run check
npm run build
npm run build:pdf:tugas-luar
npm run check:pdf:tugas-luar
```
Expected: all commands exit 0; PDF reports 9 pages.

- [ ] **Step 2: Confirm outputs**

Confirm both exist and are non-empty:
- `BMC-Online-Tutorial-Tugas-Luar.pdf`
- `dist/BMC-Online-Tutorial-Tugas-Luar.pdf`

- [ ] **Step 3: Confirm no credential text**

Search `tutorial-tugas-luar/index.html` and the new QR-related files for password/credential values. Expected: no secrets or credentials.
