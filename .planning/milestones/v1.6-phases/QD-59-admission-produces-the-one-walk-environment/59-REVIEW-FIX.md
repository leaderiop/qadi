---
phase: QD-59-admission-produces-the-one-walk-environment
fixed_at: 2026-11-19T07:40:00Z
review_path: .planning/phases/QD-59-admission-produces-the-one-walk-environment/59-REVIEW.md
iteration: 3
findings_in_scope: 2
fixed: 2
skipped: 0
status: all_fixed
---

# Phase 59: Code Review Fix Report (iteration 3)

The orchestrator fixed both warnings in one comment- and spec-only commit; no executable line changed. So the mutation evidence (`89dfaaab`) and the after-fix-2 bench (`3d0bd984`) still describe the code, and the phase scan's comment-only rules accept the commit.

- **WR-01: the docs overclaimed the type check.** The `SUPPLIED` doc in `Admission.ts` and ADR-QD-172 Decision 3 now say what the type guarantees. A `"row"` row that stops supplying the resource fails with TS2322, and so does a missing row source. The `"asked"` row's flags are `boolean`, so its truth is pinned at run time by `Admission.test.ts` (E1 to E5) and `LeafMatrix.test.ts`.
- **WR-02: stale spec names.** INV-QD-364 (its text and Source line), the two `spec/traceability.md` rows and ADR-QD-163's amendment now name `SUPPLIED` instead of `RESOURCE_SUPPLIED` and the removed overload. `git grep` finds neither name left under `packages/` or `spec/`.

Checks after the commit:
- `check-dod-table.mjs`: 25 steps, 144 references.
- `spec-revise --check`: clean.
- `spec:verify:strict`: PASS 21, FAIL 0.
- `tsc -b`: clean.
- Phase scan: clean.
