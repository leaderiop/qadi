---
phase: QD-55-a-port-card-is-a-model-row-not-a-view-join
plan: 08
subsystem: spec
tags: [invariants, traceability, ccr, changeset, upgrade-guide, devtools, ARCH-102]
phase_base: 0c349d6fc46978fe546dcb4767b94c17cbf7b03c
requires: ["55-07"]
provides:
  - "INV-QD-355 and INV-QD-356 in spec/invariants.md (Rev 1.153), headings matching the anchors 55-07 linked"
  - "spec/traceability.md Rev 1.216: doc-28 row, two INV rows, the ADR-QD-168 row, three new and four updated test rows"
  - "the CCR-QD-446 row in spec/README.md (Rev 1.249)"
  - ".changeset/devtools-port-activity-is-a-port-name.md (@qadi/devtools minor, one Breaking entry)"
  - "the upgrading.md 0.13 section for PortActivity.port"
affects: [55-09]
tech-stack:
  added: []
  patterns: ["INV-QD-343 shape for the invariants; ADR-QD-167 and CCR-QD-445 shapes for the trace rows and register row; devtools-feed-hands-the-gate-registry changeset shape"]
key-files:
  created:
    - .changeset/devtools-port-activity-is-a-port-name.md
  modified:
    - spec/invariants.md
    - spec/traceability.md
    - spec/README.md
    - apps/website/src/content/docs/docs/reference/upgrading.md
key-decisions:
  - "INV-QD-356's enforcement is the characterisation and the render test; no gate scans the panel's source, and the invariant says so rather than claiming one"
  - "The CCR-QD-446 row ends 'Unused: none.' because all ten reserved numbers were used"
requirements-completed: [WX-02, WX-03, WX-07]
duration: 14min
completed: 2026-11-18
status: complete
commits: 2
plan_head_before: 850617efecad34614b8a76c035683f376c40b270
plan_head_after: 3a267526e5c3c35a286b0338e180ec39ebabb1aa
actuals:
  tokens: 12000
  tasks: 2
  commits: 2
---

# Phase QD-55 Plan 08: INV-QD-355..356, CCR-QD-446, the changeset and the 0.13 upgrade note

**The phase's records are closed: two invariants with traceability, the CCR-QD-446 register row, one `@qadi/devtools` minor changeset with a single Breaking entry, and a prose-only 0.13 upgrade section; every spec gate passes and `spec:api` still prints 935.**

## Records, each at its final revision

| Record | Revision | Commit |
| ------ | -------- | ------ |
| `spec/invariants.md` (INV-QD-355, INV-QD-356) | 1.152 -> 1.153 via spec-revise | `8f860c6c` |
| `spec/traceability.md` (doc-28 §1 row, §2 x2, §3 ADR-QD-168, §4 three new and four updated rows) | 1.215 -> 1.216 via spec-revise | `8f860c6c` |
| `spec/README.md` (CCR-QD-446 row after CCR-QD-445) | 1.248 -> 1.249 via spec-revise | `3a267526` |
| `.changeset/devtools-port-activity-is-a-port-name.md` | new | `3a267526` |
| `apps/website/.../reference/upgrading.md` (0.13 section, last, prose only) | n/a | `3a267526` |

The CCR-QD-446 row ends: `Ids used: ARCH-102, ADR-QD-168, CCR-QD-446, BEH-QD-611..615, INV-QD-355..356. Unused: none.`

## Gate outputs

- Task 1 verify: `INV-QD-355, INV-QD-356 and traceability recorded`; `spec-revise --check` passes.
- Task 2 verify (after the commit, as the changeset check diffs `phase_base..HEAD`): `CCR-QD-446, the changeset and the 0.13 note recorded`.
- `pnpm spec:verify:strict`: PASS 21, FAIL 0, SKIP 0.
- `spec-revise --check` passes; `spec:website-examples` 67 blocks compile (no fence added); `spec:claims` 8 claims; `spec:gates` 25 steps match `pnpm check`, 143 references resolve.
- `spec:api`: `api-surface: 935 export(s) documented across 9 package(s)`.

## Task Commits

1. Task 1: `8f860c6c` `docs(55-08): INV-QD-355, INV-QD-356 and their traceability`
2. Task 2: `3a267526` `docs(55-08): CCR-QD-446, the @qadi/devtools changeset and the 0.13 upgrade note`

## Deviations from Plan

None - plan executed exactly as written. (Task 2's changeset check needs the commit to exist, since it diffs `phase_base..HEAD`; the plan's `fails_when` anticipates this, so the check was run before and after committing.)

## Known Stubs

None.

## Self-Check: PASSED

- `spec/invariants.md`, `spec/traceability.md`, `spec/README.md`, `.changeset/devtools-port-activity-is-a-port-name.md` and `upgrading.md` exist and carry the records above; `8f860c6c` and `3a267526` are ancestors of HEAD.
- No source, test, script, `spec/overview.md` or `AGENTS.md` change; no changelog or package version change; nothing versioned, pushed or released. `.planning/config.json` (pre-existing modification) was never staged. REQUIREMENTS.md untouched, per the phase instructions.
