# Tugas Luar Approval Reminder Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a button that resends the full WhatsApp approval message to the active approver for a pending individual travel request.

**Architecture:** Add one authenticated `POST /travel/reminder` endpoint. The model loads the request owner, active approval row, approver contact, and request details in one read path, then sends the existing formatted WhatsApp message without mutating approval data. The page displays the button only for pending individual rows and reports request state inline.

**Tech Stack:** Express, SQL Server via existing `mssql` wrapper, existing WhatsApp service, React hooks, existing assert self-checks.

**Spec:** `docs/superpowers/specs/2026-11-10-travel-approval-reminder-design.md`

## Global Constraints

- Backend changes stay inside `backend/`; frontend changes stay inside `frontend/`.
- Existing API contracts, approval status, token format, and database schema remain unchanged.
- Frontend sends only `{ id }`; backend derives owner, active level, approver, and message data.
- No new dependency, secret, or endpoint outside `/api/travel/reminder`.
- Errors do not mutate travel or approval records.
- UI text is Indonesian; no `alert()`.

## Review Focus

- Request ID belonging to another user must return not found and send no WhatsApp; test model query ownership predicate.
- Already approved/rejected/inactive request must not send; test active pending guard.
- Missing active approver must return conflict without data mutation; test empty approver guard.
- WhatsApp failure must surface as an error without changing approval rows; test send occurs after read-only validation.
- UI must not show reminder for approved/rejected rows; test conditional rendering by source/self-check.

---

### Task 1: Reminder eligibility helper

**Files:**
- Modify: `backend/src/models/travelModel.js`
- Modify: `backend/src/models/travelModel.check.mjs`

**Interfaces:**
- Produces: `canSendTravelReminder({ status, isActive, currentLevel, approvalStatus, approverNIP }) -> boolean`.

- [ ] **Step 1: Write the failing self-check**

Add assertions for a pending active request with `StatusId = 1` and approver, plus rejected, inactive, processed, and missing-approver cases.

- [ ] **Step 2: Run the self-check and confirm RED**

Run: `node src/models/travelModel.check.mjs`
Expected: failure because `canSendTravelReminder` is not exported.

- [ ] **Step 3: Implement the minimal pure helper and export it**

Return true only when status is `pending`, active is truthy, current level is 1-3, approval status is 1, and approver NIP is non-empty.

- [ ] **Step 4: Run the self-check and confirm GREEN**

Run: `node src/models/travelModel.check.mjs`
Expected: `travel model QR self-check passed`.

### Task 2: Backend reminder endpoint

**Files:**
- Modify: `backend/src/models/travelModel.js`
- Modify: `backend/src/controllers/travelController.js`
- Modify: `backend/src/routes/travelRoutes.js`
- Modify: `backend/src/controllers/travelController.check.mjs`

**Interfaces:**
- Consumes: `canSendTravelReminder` from Task 1.
- Produces: `POST /api/travel/reminder`, body `{ id }`, response `{ success: true }`.

- [ ] **Step 1: Add failing route/source assertions**

Assert the route exists and the controller validates a bounded travel ID and calls the model reminder function.

- [ ] **Step 2: Run backend self-check and confirm RED**

Run: `node src/controllers/travelController.check.mjs`
Expected: failure because the route/handler is absent.

- [ ] **Step 3: Implement model `sendTravelReminder(travelId, ownerNIP)`**

Read only the owner’s active travel row joined to the current pending approval and approver employee. Reject invalid state with typed result values. Build the message through `formatTravelApprovalMessage`, using the existing approval queue token format for level 1 and the existing direct token generation for later levels only if already supported by current data. Send with `sendWa`; return success. Do not update SQL.

- [ ] **Step 4: Implement controller and route**

Validate `id` with the existing travel ID character policy, call `sendTravelReminder(id, req.user.id)`, map not-found to 404, invalid stage to 409, WhatsApp failure to 502, otherwise return JSON success.

- [ ] **Step 5: Run backend self-check and confirm GREEN**

Run: `node src/controllers/travelController.check.mjs`
Expected: `travel controller time self-check passed`.

### Task 3: Frontend reminder button

**Files:**
- Modify: `frontend/src/pages/TugasLuarPage.jsx`

**Interfaces:**
- Consumes: `POST /travel/reminder` with `{ id }`.

- [ ] **Step 1: Add the UI change**

Track one reminder request ID and inline success/error text. Render `Kirim pengingat` only when `row.status` is pending; disable while sending and show `Mengirim…`. Keep QR button behavior unchanged.

- [ ] **Step 2: Run frontend checks**

Run: `npm run check`
Expected: `hr self-check passed`.

### Task 4: Full verification

**Files:** None.

- [ ] **Step 1: Run backend suite**

Run: `npm test` in `backend/`.
Expected: all existing self-checks pass.

- [ ] **Step 2: Run frontend check and build**

Run: `npm run check; npm run build` in `frontend/`.
Expected: both commands exit 0.

- [ ] **Step 3: Review diff**

Run: `git diff --check` and inspect changed files. Confirm no `.env`, dependency, or unrelated file changes.
