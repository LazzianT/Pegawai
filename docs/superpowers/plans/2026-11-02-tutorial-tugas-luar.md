# Tutorial Tugas Luar PDF Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Membuat PDF tutorial Tugas Luar terpisah dengan screenshot lengkap, memakai nama pengguna `User` tanpa kata `Demo`.

**Architecture:** Buat sumber HTML baru di `tutorial-tugas-luar/`, gunakan CSS dan font dari tutorial existing, ambil screenshot tambahan dari aplikasi lokal memakai capture script terpisah, lalu bangun PDF melalui script generator khusus. PDF panduan lama tidak disentuh.

**Tech Stack:** HTML/CSS, Node.js, Playwright Chromium, PDF via `page.pdf()`.

**Spec:** `docs/superpowers/specs/2026-11-02-tutorial-tugas-luar-design.md`

## Global Constraints

- Bahasa Indonesia sederhana untuk pengguna awam.
- Nama pada screenshot harus `User`; jangan tampilkan `Demo` atau `Pengguna Demo`.
- Jangan mengubah backend, aplikasi utama, atau PDF existing.
- Jangan menambah dependency.
- Jangan memakai kredensial nyata.
- Screenshot wajib mencakup form, approval atasan, approval pengelola kendaraan, QR berangkat, QR kembali, dan riwayat.

## Review Focus

- Nama screenshot tidak boleh mengandung `Demo` atau `Pengguna Demo`; self-check mencari string tersebut pada sumber tutorial/capture.
- Screenshot approval harus menjelaskan siapa yang memeriksa; capture memakai label `Atasan` dan `Pengelola Kendaraan`.
- QR berangkat dan kembali harus terlihat sebagai dua tahap berbeda, bukan satu screenshot yang ambigu.
- PDF baru tidak boleh menggantikan PDF lama; output harus memiliki nama berbeda.
- Generator harus gagal jelas bila asset atau Chrome tidak tersedia.

---

### Task 1: Capture asset tutorial Tugas Luar

**Files:**
- Create: `remotion/capture-travel-tutorial.mjs`
- Create: `tutorial-tugas-luar/assets/` screenshot PNG files

**Interfaces:**
- Consumes: aplikasi lokal pada `http://127.0.0.1:5174`, pola mock API dari `remotion/capture-site.mjs`.
- Produces: `travel-form.png`, `supervisor-approval.png`, `vehicle-approval.png`, `qr-departure.png`, `qr-return.png`, `travel-history.png`.

- [ ] **Step 1: Add the capture script**
  - Reuse existing Playwright setup and safe mock data.
  - Set local storage user name to exactly `User`, department `HC`.
  - Capture the Tugas Luar form at `/tugas-luar`.
  - Capture approval screens from existing route patterns with visible labels for Atasan and Pengelola Kendaraan.
  - Capture QR page in two states: belum berangkat and sudah berangkat/siap kembali, using existing app routes and mock responses where available.
  - Capture dashboard riwayat.

- [ ] **Step 2: Run capture and inspect assets**
  - Run: `node remotion/capture-travel-tutorial.mjs`
  - Expected: all six PNG files exist under `tutorial-tugas-luar/assets/`; visible user name is `User`.

- [ ] **Step 3: Add asset self-check**
  - Extend `src/hr.check.mjs` only if a pure helper check is needed; otherwise use the tutorial check in Task 3.
  - Check: no source text in capture script contains `Pengguna Demo` or `name: 'Demo'`.

### Task 2: Create standalone tutorial source and PDF generator

**Files:**
- Create: `tutorial-tugas-luar/index.html`
- Create: `tutorial-tugas-luar/styles.css`
- Create: `scripts/build-travel-pdf.mjs`
- Create: `scripts/check-travel-pdf.mjs`
- Modify: `package.json` scripts

**Interfaces:**
- Consumes: six screenshot assets from Task 1.
- Produces: `dist/BMC-Online-Tutorial-Tugas-Luar.pdf` and root copy `BMC-Online-Tutorial-Tugas-Luar.pdf`.

- [ ] **Step 1: Write the standalone HTML**
  - Use a compact 8-page A4 guide.
  - Sections: overview, fill form, send to supervisor, supervisor approval, vehicle-manager approval, departure scan, return scan, history/troubleshooting.
  - Use `User` in instructional examples only.
  - Pair each flow section with its relevant screenshot and plain Indonesian caption.

- [ ] **Step 2: Add CSS**
  - Copy only the required visual rules/tokens from `tutorial/styles.css`.
  - Keep mobile/print readability and A4 page breaks.

- [ ] **Step 3: Add PDF build command**
  - Add `build:pdf:tugas-luar` to `package.json`.
  - Generator reads only `tutorial-tugas-luar/index.html`, writes only the new PDF output, validates Chrome existence before launch.

- [ ] **Step 4: Add PDF check command**
  - Add `check:pdf:tugas-luar` to `package.json`.
  - Assert page count is 8, output exists, and extracted PDF text includes `Tugas Luar`, `Pengelola Kendaraan`, `berangkat`, and `kembali`.

### Task 3: Verify complete standalone PDF

**Files:**
- Modify: `scripts/check-travel-pdf.mjs` if needed after first run.

- [ ] **Step 1: Build PDF**
  - Run: `$env:CHROME_PATH='C:\Program Files\Google\Chrome\Application\chrome.exe'; npm run build:pdf:tugas-luar`
  - Expected: new PDF generated; old `BMC-Online-Panduan-Penggunaan-final.pdf` timestamp/content unchanged.

- [ ] **Step 2: Run checks**
  - Run: `npm run check:pdf:tugas-luar`
  - Run: `npm run check`
  - Run: `npm run build`
  - Expected: all pass.

- [ ] **Step 3: Visual verification**
  - Open `tutorial-tugas-luar/index.html` in Chromium and inspect all eight pages.
  - Confirm screenshot sequence: form -> atasan -> pengelola kendaraan -> QR berangkat -> QR kembali -> riwayat.
  - Confirm every visible user label says `User`.
