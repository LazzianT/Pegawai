# SDD ledger - plan: docs/superpowers/plans/2026-11-06-tugas-luar-grouping-plan.md

Pre-flight: backend checkout is not a Git repository; frontend repo has unrelated existing changes. Backend has no migration runner. Ruling: add idempotent SQL migration file only; do not execute it against DB.

Task 1: Ruling: use separate group tables, preserve existing standalone travel flow; migration execution remains deployment work because backend checkout has no Git/migration convention.
