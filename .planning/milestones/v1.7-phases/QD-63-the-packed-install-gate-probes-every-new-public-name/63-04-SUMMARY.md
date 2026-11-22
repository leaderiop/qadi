---
phase: QD-63-the-packed-install-gate-probes-every-new-public-name
plan: 04
subsystem: spec-records
tags: [adr-amendment, traceability, ccr-register, package-install]
phase_base: 11dc168f4d8a8b295aef16f2d04b762c503d1ba8
plan_head_before: e73789e0ef7e76b0972bb1fa5b49845c108b28b8
plan_head_after: 744d415d
requires: [63-03]
provides:
  - "ADR-QD-033 amendment (ARCH-110, CCR-QD-454) recording the three probes and the probe guard's rules"
  - "traceability row for ADR-QD-033 amended in place"
  - "CCR-QD-454 registered; ADR-QD-176, BEH-QD-651-655, INV-QD-371-372 named unused"
  - "AGENTS.md section 16 and the DoD package-install paragraph each say the consumer probes every make*Feed and a DecisionCacheShape host cache"
affects: [63-05]
tech-stack:
  added: []
  patterns:
    - "spec-revise with --date 2026-11-20 as the only writer of Revision and Change History cells"
key-files:
  created: []
  modified:
    - spec/decisions/033-the-packed-artifact-is-the-product.md
    - spec/traceability.md
    - spec/README.md
    - AGENTS.md
    - spec/process/definitions-of-done.md
key-decisions:
  - "No new decision: the amendment sits in ADR-QD-033; the reserved ids stay unused and appear only in the CCR-QD-454 row"
requirements-completed: []
duration: 10min
completed: 2026-11-20
status: complete
commits: 2
actuals:
  tokens: 1400
  tasks: 2
  commits: 2
---

# Phase QD-63 Plan 04: Records for the probed consumer Summary

ADR-QD-033 amended, its traceability row extended and CCR-QD-454 registered (red first on the unregistered citation), plus one sentence each in AGENTS.md section 16 and the DoD's package-install paragraph; every spec gate is green and no export, table row or id changed.

## Revisions

| Document | At `phase_base` | After this plan |
| --- | --- | --- |
| `spec/decisions/033-the-packed-artifact-is-the-product.md` | 1.1 | 1.2 |
| `spec/traceability.md` | 1.224 | 1.225 |
| `spec/README.md` | 1.261 | 1.262 |
| `spec/process/definitions-of-done.md` | 1.18 | 1.19 |

Each equalled its HEAD revision before the plan began (nothing revised them since `phase_base`), matching the plan-time cross-check values. The CCR-QD-454 row cites 1.2, 1.19, 1.225 and 1.262.

## RED: the register coverage check

After the ADR amendment and the traceability row cite CCR-QD-454 and before the register row exists, `bash spec/scripts/verify-traceability.sh --strict` exits 1 (`PASS: 20   FAIL: 1   SKIP: 0`) with:

```
| FAIL   | CCR register coverage                      | drift from KNOWN_GAPS (backfill the register or update the script's list): got [078 079 080 081 123 124 125 126 127 128 129 130 131 132 134 136 137 454], expected [078 079 080 081 123 124 125 126 127 128 129 130 131 132 134 136 137]
```

After the row: `PASS: 21   FAIL: 0   SKIP: 0`. Log kept at `<TMPDIR>/qd63-red/trace-red.log`.

## Task commits

| Task | Commit | Files |
| --- | --- | --- |
| 1 (tracer) | `d47102e2` | `spec/README.md`, `spec/decisions/033-the-packed-artifact-is-the-product.md`, `spec/traceability.md` |
| 2 | `744d415d` | `AGENTS.md`, `spec/process/definitions-of-done.md` |

The tracer's feedback gate was its own verify, re-run after the commit and green; expansion followed.

## Gates at HEAD

`check-dod-table.mjs`: `dod-table: 25 step(s) match pnpm check, 151 reference(s) resolve`; `verify-traceability.sh --strict`: `PASS: 21   FAIL: 0   SKIP: 0`; `spec-revise.mjs --check`: every Revision matches its newest Change History entry; `check-api-surface.mjs`: `api-surface: 939 export(s) documented across 9 package(s)`; `check-doc-examples.mjs`: `117 block(s) compile`; `check-devtools-claims.mjs`: `8 claim(s) registered across 6 file(s)`; `check-house-style.mjs`: `560 file(s) clean`.

`git diff --name-only phase_base -- spec AGENTS.md` lists exactly the five files in `files_modified`; `scripts/` and `packages/` are unchanged since dispatch HEAD; no `spec/decisions/176-*` file; `spec/decisions/index.yaml`, `spec/overview.md`, `package.json` and every DoD table row unchanged; no changeset, tag, push or release.

## Deviations from Plan

None - plan executed exactly as written; every observed revision, line and count matched its expected value.

Note, not a deviation: the per-plan commit ledger file for 63-04 was not written before the first commit, so `plan_head_before` is the dispatch HEAD `e73789e0` named by the orchestrator, and `commits: 2` is `git rev-list --count e73789e0..744d415d`.

## Known Stubs

None.

## Threat Flags

None.

## Self-Check: PASSED

- Commits `d47102e2` and `744d415d` are ancestors of HEAD; the five files carry the revisions above; the amendment heading appears once between `## Consequences` and `_Related:`; the CCR-QD-454 row directly follows CCR-QD-453.
