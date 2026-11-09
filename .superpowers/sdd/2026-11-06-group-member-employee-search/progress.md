# SDD ledger - plan: docs/superpowers/plans/2026-11-06-group-member-employee-search.md

Pre-flight: Task 1 produces searchGroupEmployees consumed by Task 2 only through controller import; Task 3 consumes route contract from Task 2. Ruling: keep backend local and frontend on existing main worktree - user explicitly requested frontend push and confirmed backend is local; cost if wrong: no isolated backend history available. 

