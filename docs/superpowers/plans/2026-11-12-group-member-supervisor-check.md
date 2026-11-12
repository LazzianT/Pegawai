# Group Member Supervisor Check Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Mencegah anggota group tugas luar tanpa atasan dipilih, lalu memberi arahan ke HC.

**Architecture:** Perluas response pencarian anggota dengan `hasAtasan`, dihitung melalui `hris_GetTopLevel(NIP)`. Frontend menampilkan hasil tanpa atasan sebagai disabled secara visual, tetapi kliknya memunculkan toast tanpa mengubah daftar anggota.

**Tech Stack:** Express, SQL Server, React 18, `fetch`, assert-based self-check.

**Spec:** `docs/superpowers/specs/2026-11-12-group-member-supervisor-check-design.md`

## Global Constraints

- Backend existing; no new endpoint or DB migration.
- No dependency additions.
- UI text Indonesian.
- Do not alter `security/`, `bmc-appv2/`, or unrelated modules.
- `hris_GetTopLevel(NIP)` determines supervisor availability.

## Review Focus

- Employee with no supervisor: remains visible, cannot be added, toast says to contact HC.
- Employee with supervisor: existing add flow remains unchanged.
- Search result missing/invalid `hasAtasan`: safely treated as unavailable.
- Repeated clicks on unavailable employee: toast replaces prior message; no duplicate member.
- Existing group revision/direct-add flow: supervisor guard applies before local or API addition.

---

### Task 1: Backend search response

**Files:**
- Modify: `backend/src/models/travelGroupModel.js:51-57`
- Test: `backend/src/models/travelGroupModel.check.mjs`

**Interfaces:**
- Consumes: employee `NIP`, `Name` and `hris_GetTopLevel(NIP)`.
- Produces: `searchGroupEmployees(query)` rows shaped as `{ nip: string, name: string, hasAtasan: boolean }`.

- [ ] **Step 1: Write failing self-check assertions**

Add source assertions proving the search query joins or applies `hris_GetTopLevel`, and asserts the response mapping contains `hasAtasan`.

- [ ] **Step 2: Run backend model self-check**

Run: `node src/models/travelGroupModel.check.mjs`
Expected: FAIL because the current search query/mapping has no supervisor field.

- [ ] **Step 3: Implement minimal query**

For each searched employee, compute supervisor existence with `EXISTS (SELECT 1 FROM hris_GetTopLevel(e.NIP)) AS HasAtasan`; map it to boolean `hasAtasan`. Keep the existing query limit, search fields, ordering, and minimum query length.

- [ ] **Step 4: Run backend model self-check**

Run: `node src/models/travelGroupModel.check.mjs`
Expected: PASS.

### Task 2: Frontend guard and toast

**Files:**
- Modify: `frontend/src/pages/TugasLuarPage.jsx:83-238,296`
- Test: `frontend/src/hr.check.mjs`

**Interfaces:**
- Consumes: employee rows with `hasAtasan`.
- Produces: unavailable employee cannot be added; toast text `Atasan belum terdaftar. Hubungi HC.`.

- [ ] **Step 1: Write failing self-check assertions**

Add source assertions requiring `hasAtasan`, the exact HC toast text, `aria-disabled`, and a guard in `selectEmployee` before any member mutation/API request.

- [ ] **Step 2: Run frontend self-check**

Run: `npm run check` from `frontend`
Expected: FAIL because the current component has no supervisor guard or HC toast.

- [ ] **Step 3: Implement minimal UI behavior**

Add `employeeToast` state. In `selectEmployee`, before NIP validation or group branching, if `employee.hasAtasan !== true`, set the exact toast, clear it after a short timeout, and return. Render unavailable results with a disabled visual class plus `aria-disabled="true"`; retain `type="button"` and click handler so the toast is reachable. Render the toast with `role="alert"`.

Do not add a second notification system. Reuse existing `.toast` styling.

- [ ] **Step 4: Run frontend self-check and build**

Run: `npm run check` from `frontend`
Expected: PASS.

Run: `npm run build` from `frontend`
Expected: PASS.

### Task 3: Full verification

**Files:**
- No additional files.

- [ ] **Step 1: Run backend tests**

Run: `npm test` from `backend`
Expected: PASS.

- [ ] **Step 2: Run frontend checks**

Run: `npm run check && npm run build` from `frontend`
Expected: PASS.

- [ ] **Step 3: Check diff hygiene**

Run: `git diff --check`
Expected: no output.

- [ ] **Step 4: Manual verification**

Search an employee without a supervisor: result remains visible, cannot be added, toast says `Atasan belum terdaftar. Hubungi HC.`. Search an employee with a supervisor: existing group add flow works.
