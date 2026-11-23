---
phase: QD-73-one-pure-reconcile-for-gate-registration
plan: 02
subsystem: spec
tags: [adr, spec, gate-registration, reconcile, records]

requires:
  - phase: 73-01
    provides: the mutation base and the characterisation that hold the decision's behaviour claim
provides:
  - "ADR-QD-186 Rev 1.0: gate registration is one keyed reconcile (decisions 1 to 8, what enforces it, rejected alternatives)"
  - "the ADR-QD-186 index entry, its traceability section 3 row (invariants cell not yet filled) and the CCR-QD-465 row"
  - "dated amendments to ADR-QD-140 and ADR-QD-111 and a dated note in ADR-QD-103, each listed in its Status row"
affects: [73-03, 73-04, 73-05, 73-06, 73-07]

phase_base: 1dbaf1a932109af41278b9b56892083c6ec40913
plan_head_before: 52dd9f0af4461c029e3d1f82c9bc4f5081e4f8ba
plan_head_after: 886a71ddd38bd3103bf3e850960f3e4d29ea353b

actuals:
  tokens: 26000
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "a decision is recorded through every register in one commit before any code moves"
    - "a past ADR sentence is never rewritten: a dated amendment or note, listed in the Status row"

key-files:
  created:
    - spec/decisions/186-gate-registration-is-one-keyed-reconcile.md
  modified:
    - spec/decisions/index.yaml
    - spec/traceability.md
    - spec/README.md
    - spec/decisions/140-a-gates-write-side-is-a-leaf-below-the-atom-set.md
    - spec/decisions/111-a-gate-writer-is-resolved-once-by-its-provider.md
    - spec/decisions/103-a-question-is-opened-once.md

key-decisions:
  - "The failure-rule sentence is carried verbatim in ADR-QD-186 decision 6 for the code and BEH-QD-702 to copy"
  - "The ADR names exactly kind, atom, wraps and marker as what sameIdentity compares, and says policy and resource alone do not re-register"
  - "ADR-QD-053 is unchanged: its line 81 names useGateRegistrations beside useGates, still true, and holds no index-aligned or three-effect wording"

requirements-completed: []  # RECN-05, WX-02, WX-07 stay Pending by instruction; only 73-07 marks requirements

duration: ~15min
completed: 2026-11-23
status: complete
---

# Phase 73 Plan 02: The keyed reconcile decision recorded Summary

**ADR-QD-186 "Gate registration is one keyed reconcile" is recorded in the ADR, the index, the traceability and the CCR-QD-465 row in one commit, and ADR-QD-140, ADR-QD-111 and ADR-QD-103 point at it with dated text, so the code of 73-03 implements a decision already on record.**

## Performance

- **Duration:** about 15 min (start time not captured at the first command)
- **Tasks:** 2 of 2
- **Files:** 1 created, 6 modified, all under `spec/`; no `packages/` file changed (`git diff --quiet 52dd9f0a HEAD -- packages` holds)

## Accomplishments

- Task 1 (tracer): ADR-QD-186 at Rev 1.0 (`QADI-ADR-186`, status `Accepted — extends ADR-QD-140 and ADR-QD-111`) with eight decisions: the keyed `ReadonlyMap<string, GateWanted>` and an id-less `GateIdentity`, the one step, `sameIdentity` over exactly `kind`, `atom`, `wraps` and `marker`, the equal-state rule in `GateHandle.update`, the meaning of pure, the failure rule with its verbatim "never mutates `live`" sentence, the one registration effect beside the writer-keyed teardown, and `useGates`'s one keyed pass building `wanted` as `new Map(…)`. A "What enforces it" section separates what the compiler enforces from what only tests do. Seven rejected alternatives. AGENTS.md section 13 is stated unaffected. No compiled fence.
- The index ends with the ADR-QD-186 entry; the section 3 row follows ADR-QD-185's (invariants cell `—` until 73-06); the CCR-QD-465 row follows CCR-QD-464's and names ARCH-120, no changeset, and `Ids used: ADR-QD-186, BEH-QD-701 to BEH-QD-705, INV-QD-391, INV-QD-392. Unused: none.`
- Task 2: `## Amendment (2026-11-22, ADR-QD-186, CCR-QD-465)` appended to ADR-QD-140 (items 2 and 3 read as keyed and one effect) and ADR-QD-111 (the `useGates` bullet and the removal note), and a dated italic note in ADR-QD-103 after the 2026-11-11 note.

## Spec revisions

| File | Revision now | Change |
|------|--------------|--------|
| `spec/decisions/186-gate-registration-is-one-keyed-reconcile.md` | 1.0 | new |
| `spec/traceability.md` | 1.255 (was 1.254) | the ADR-QD-186 row |
| `spec/README.md` | 1.301 (was 1.300) | the CCR-QD-465 row |
| `spec/decisions/140-a-gates-write-side-is-a-leaf-below-the-atom-set.md` | 1.3 (was 1.2) | amendment; Status lists `amended 2026-11-22 (ADR-QD-186)` |
| `spec/decisions/111-a-gate-writer-is-resolved-once-by-its-provider.md` | 1.2 (was 1.1) | amendment; Status lists it |
| `spec/decisions/103-a-question-is-opened-once.md` | 1.5 (was 1.4) | dated note; Status lists it |
| `spec/decisions/index.yaml` | no header | ADR-QD-186 entry; three statuses updated to equal their ADR's Status row |

All revisions changed only through `node scripts/spec-revise.mjs … --date 2026-11-22`.

## Why ADR-QD-053 was left unchanged

Its line 81 names `useGateRegistrations` beside `useGates`, `useGate` and `KIND_FACTS` in `useGate.ts`. That is still true after the keyed reconcile (the hook keeps its name and its file), and the file holds no index-aligned or three-effect wording. `git diff --quiet 52dd9f0a HEAD -- spec/decisions/053-a-gate-can-be-found.md` holds.

## Task Commits

1. Task 1 (tracer): `433bf607` docs(73-02): record the keyed reconcile decision and its change
2. Task 2: `886a71dd` docs(73-02): amend the write-side and one-hook decisions to point at the keyed reconcile

## Verification

- Task 1 verify (extracted verbatim from the plan into a scratch script and run, stdin closed): last line `decision recorded`.
- Task 2 verify: last line `ADR-QD-140, ADR-QD-111 and ADR-QD-103 amended`.
- `node scripts/spec-revise.mjs --check`: every Revision matches its newest Change History entry.
- `node scripts/check-doc-examples.mjs`: `doc-examples: 118 block(s) compile`.
- `bash spec/scripts/verify-traceability.sh --strict`: `PASS: 21   FAIL: 0   SKIP: 0`, `143 ADR(s) traced`, `119 ADR(s) agree`.
- `git status --porcelain -- packages scripts spec .changeset` empty after the last commit.

## Deviations from Plan

None - plan executed exactly as written. (The plan-commit ledger of protocol step 0c was not written, because the plan is documentation-only; `plan_head_before` is the HEAD at plan start, `52dd9f0a`, and `commits: 2` was measured as `git rev-list --count 52dd9f0a..HEAD`.)

## Issues Encountered

None.

## Known Stubs

None. The ADR links BEH-QD-701 to BEH-QD-705 and INV-QD-391 and INV-QD-392 by the anchors the plan fixed; those headings do not exist until 73-06 writes them, and the traceability row's invariants cell is `—` until then. Both are planned, not stubs.

## Threat Flags

None. Spec text only.

## Next Phase Readiness

Ready for 73-03. The implementer follows ADR-QD-186 as recorded, including decision 6's failure rule and decision 8's `new Map(…)` pass; 73-06 writes the BEH and INV records and replaces the `—` in the section 3 row.

## Self-Check: PASSED

- File exists: `spec/decisions/186-gate-registration-is-one-keyed-reconcile.md`.
- Commits `433bf607` and `886a71dd` are ancestors of HEAD.
