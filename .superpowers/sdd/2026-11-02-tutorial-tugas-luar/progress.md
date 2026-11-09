# SDD ledger — plan: docs/superpowers/plans/2026-11-02-tutorial-tugas-luar.md

Pre-flight: existing checkout is dirty from prior tutorial work; preserve unrelated changes and implement only standalone tutorial artifacts.

Ruling: work in current checkout instead of creating a new worktree — the existing tutorial assets and source are uncommitted inputs required for the requested PDF; creating a clean worktree would omit them. Cost if wrong: new artifacts remain uncommitted in this checkout and need manual staging.

Task 1: complete (capture script and six assets; capture rerun verified)
Task 2: complete (standalone HTML/CSS, PDF generator, checker, package scripts)
Task 3: complete (PDF build/check, helper check, Vite build all pass)
Final review: fresh reviewer dispatched; Important findings fixed: QR states separated, root PDF output added, checker nonzero failures, approval capture route fixed, asset/source checks retained. Existing old PDF was already modified before this work and was not reverted.
