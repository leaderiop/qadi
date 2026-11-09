---
phase: 01-http-request-enforcement
plan: 04
subsystem: spec
tags: [adr, behaviours, invariants, traceability, request-enforcement]
requires:
  - phase: 01-http-request-enforcement
    provides: "request-enforcement module, its five callers and the caller x failure table (plans 01-03)"
provides:
  - "ADR-QD-108 and its index entry; ADR-QD-036 Rev 1.8"
  - "BEH-QD-335, BEH-QD-336 and the amended BEH-QD-321"
  - "INV-QD-243"
  - "traceability sections 1-3 rows"
affects: [01-05]
requirements-completed: [XC-02, ENF-01, ENF-02, ENF-03]
status: complete
commits: 4
plan_head_before: 0afa2b36d08e3cf7fe6f261bdc1b860e9dc80ee4
plan_head_after: d130081689d2140a4ad9c5eae61168e209567b62
actuals:
  tokens: 9000
  tasks: 3
  commits: 4
tech-stack:
  added: []
  patterns:
    - "BEH signature listing in a ts fence (not compiled) for package-private functions, with the fact stated in a comment"
    - "INV Enforcement cites test files in backticks, never links, so the broken-link check cannot fail on a file another plan owns"
key-files:
  created:
    - spec/decisions/108-a-request-is-enforced-once-through-one-module.md
  modified:
    - spec/decisions/index.yaml
    - spec/decisions/036-qadi-http-package-shape.md
    - spec/behaviors/23-http.md
    - spec/behaviors/26-decision-stream.md
    - spec/invariants.md
    - spec/traceability.md
key-decisions:
  - "ADR-QD-108 carries rows D-46-a to D-46-k, each citing the CONTEXT decision it records (D-01..D-09), plus the overload-pair typing decision and the GuardRoute.ts-survives decision"
  - "The INV was appended after INV-QD-241 (the file appends new ids at the end, not in numeric order)"
completed: 2026-11-08
---

# Phase 1 Plan 04: Record ARCH-46 in the normative spec Summary

ADR-QD-108, the two new behaviours, the amended BEH-QD-321 and decision-stream wording, INV-QD-243 and the traceability section 1-3 rows now state the request-enforcement module as built, using the real names from plans 01-03.

## Commits

| Commit | Message |
| ------ | ------- |
| `495f94c` | docs(01-04): ADR-QD-108, a request is enforced once through one module; ADR-QD-036 Rev 1.8 |
| `6a96298` | docs(01-04): BEH-QD-335, BEH-QD-336 and INV-QD-243; BEH-QD-321 and the recheck name the module |
| `2cf8135` | docs(01-04): 26-decision-stream.md Revision matches its newest history entry (1.12) |
| `d130081` | docs(01-04): traceability rows for BEH-QD-335/336, INV-QD-243 and ADR-QD-108 |

## Allocated ids (Plan 05 needs these)

- **BEH-QD-335**: A request is enforced through one module. Anchor `beh-qd-335-a-request-is-enforced-through-one-module`.
- **BEH-QD-336**: An unguarded port route logs a subject-extraction failure. Anchor `beh-qd-336-an-unguarded-port-route-logs-a-subject-extraction-failure`.
- **INV-QD-243**: Every @qadi/http request path enforces and logs through one module. Anchor used in traceability: `invariants.md#inv-qd-243-every-qadihttp-request-path-enforces-and-logs-through-one-module`. (`next-id` returned 243, so 242 is already reserved elsewhere.)
- ADR-QD-108 (file `108-a-request-is-enforced-once-through-one-module.md`); CCR-QD-385 is not yet in the register.

## New revisions

| Document | Revision | Effective Date |
| -------- | -------- | -------------- |
| `spec/decisions/108-…md` | 1.0 (new) | 2026-11-08 |
| `spec/decisions/036-qadi-http-package-shape.md` | 1.8 (from 1.7) | 2026-11-08 |
| `spec/behaviors/23-http.md` | 1.11 (from 1.10) | 2026-11-08 |
| `spec/behaviors/26-decision-stream.md` | 1.12 (from 1.11) | 2026-11-08 |
| `spec/invariants.md` | 1.78 (from 1.77) | 2026-11-08 |
| `spec/traceability.md` | 1.121 (from 1.120) | 2026-11-08 |

Plan 05 adds the section 4 rows (`RequestEnforcement.test.ts`, `RequestEnforcement.tst.ts`, `PortRoutes.test.ts`, `http.test.ts` updates) under traceability 1.121 without bumping, as the Change History entry says.

## What changed

- **ADR-QD-108** records every CONTEXT decision D-01..D-09 as built, the overload-pair typing rationale (TS2345 on `Tags<EH>`), and the alternatives. `index.yaml` lists it; ADR-QD-036 gets a Rev 1.8 history entry and a `**Rev 1.8 (ARCH-46)**` paragraph.
- **23-http.md**: BEH-QD-335 (module contract, subject-only mode, the one key function) and BEH-QD-336 (unguarded port route logs, 502, never reads the port) after BEH-QD-328; BEH-QD-321's first REQUIREMENT names `portRoutes`, `portRoutesUnguarded` and the module, its logging REQUIREMENT and prose say the module's handler step logs a handler-raised denial. Its `authorizeRequest` listing is unchanged.
- **26-decision-stream.md**: the recheck runs the module's guarded mode with its own projection; the closure-line REQUIREMENT says "the line the module writes". No requirement changed meaning.
- **invariants.md**: INV-QD-243 with Source, Implication, Enforcement and Related; INV-QD-006's Related gains it. Enforcement cites the test files in backticks, not links.
- **traceability.md**: the 23-http row gains BEH-QD-335/336 and `PortRoutes`; section 2 and 3 rows for INV-QD-243 and ADR-QD-108.

## Verification

- `pnpm spec:examples`: 101 blocks compile (after tasks 2 and 3).
- Task 1 verify (file, Document ID, index entry, 036 mention, D-01..D-09 greps): passes.
- Task 2 and 3 grep verifies: pass.
- `pnpm spec:verify` (non-strict, run once as an informational check; `spec:verify:strict` was not run, per the amended plan): 20 pass, 1 fail. The one failure is "CCR register coverage", which lists 385 as drift because CCR-QD-385 is cited but its register row does not exist; Plan 01-05 adds it. Every other check passes, including invariants and decisions traced, ADR Document ID equals file number, relative link integrity and Revision equals newest history entry.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] `26-decision-stream.md` Revision header not bumped**
- **Found during:** Task 3 (informational `pnpm spec:verify`)
- **Issue:** My scripted Revision replace matched on a different column padding than the file uses, so the Change History said 1.12 while Revision still said 1.11 ("Revision = newest history entry" check failed).
- **Fix:** set Revision to 1.12 by line.
- **Files modified:** `spec/behaviors/26-decision-stream.md`
- **Commit:** `2cf8135`

Otherwise the plan was executed as written. Within-scope choices: the INV was placed at the end of `invariants.md`, which is where the file's convention puts a new id; the BEH signature listing marks the module as package-private in a comment.

## Known Stubs

None.

## Threat Flags

None. Documentation only; T-01-11's mitigation is in place (the REQUIREMENT text names the module and every caller, INV-QD-243's Enforcement cites the table-driven suite). `pnpm spec:verify:strict` is Plan 01-05's.

## Self-Check: PASSED

- FOUND: spec/decisions/108-a-request-is-enforced-once-through-one-module.md
- FOUND commits 495f94c, 6a96298, 2cf8135, d130081 (ancestors of HEAD)
