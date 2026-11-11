---
phase: 21-port-request-derivation
plan: 05
subsystem: spec
tags: [spec, adr, ccr, mutation, merge-gate, ARCH-69]

requires:
  - phase: 21-port-request-derivation
    provides: 21-01's red law and baseline, 21-02..04's derived question, key, defect and span
provides:
  - ADR-QD-133 (indexed) and dated ARCH-69 amendments to ADR-QD-094 and ADR-QD-107
  - BEH-QD-440, BEH-QD-441, INV-QD-286, BEH-QD-409 amended, traceability rows
  - CCR-QD-411, the changeset sentence, AGENTS.md section 3
  - a green pnpm check:pr and the per-file mutation comparison
affects: []

phase_base: ba38f367
plan_head_before: 9baf31556a90aa7a38730262e62bf7e0d687c354
plan_head_after: 653af1cfc6728930a30a2ab5194ae53edba4fd60
commits: 3

actuals:
  tokens: 14000
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "A spec change that quotes a correction states it where the harm is claimed: evaluation never reads a port key"

key-files:
  created:
    - spec/decisions/133-a-port-request-is-derived-from-its-wire-question.md
    - .planning/phases/21-port-request-derivation/21-mutation-after.json
  modified:
    - spec/decisions/094-a-port-is-described-once.md
    - spec/decisions/107-a-port-is-answered-remotely-through-its-description.md
    - spec/decisions/index.yaml
    - spec/behaviors/06-services.md
    - spec/invariants.md
    - spec/traceability.md
    - spec/README.md
    - AGENTS.md
    - .changeset/port-keys-cover-the-request.md
    - packages/core/test/SignatureHistory.test.ts

key-decisions:
  - "The pending key changeset (@qadi/core minor) is amended in place with one paragraph, not a new patch file"
  - "ADR-QD-107's pointer is a short dated amendment section, matching that document's existing amendment shape"

requirements-completed: [PREQ-01, PREQ-02, PREQ-03, PREQ-04, PREQ-05, WX-01, WX-02, WX-03, WX-04, WX-05, WX-06]

duration: 25 min
completed: 2026-11-11
status: complete
---

# Phase 21 Plan 05: Records and the merge gate Summary

ARCH-69 is in the normative spec (ADR-QD-133, two amendments, two behaviours, one invariant, CCR-QD-411) and `pnpm check:pr` exits 0 with no gate, budget, threshold or `spec/overview.md` edit.

## Records

- ADR-QD-133 states D-01..D-05, the three rejected alternatives and the correction from `_WAVE7-CONTEXT.md`: evaluation never reads the key, so a dropped field was a wrong replay or test-double answer, not a production grant. Document ID equals the file number; `index.yaml` lists it.
- ADR-QD-094 Rev 1.9: ARCH-69 amendment blockquote, the `key` sentence and the interface fence comments. ADR-QD-107 Rev 1.3: a dated amendment that `toQuestion` names every member.
- `06-services.md` Rev 1.10: BEH-QD-409's law reads over a derived port's wire question; BEH-QD-440 and BEH-QD-441 new. `invariants.md` Rev 1.101: INV-QD-286 new, INV-QD-280's Enforcement names the law. `traceability.md` Rev 1.143: rows for BEH-QD-440/441, INV-QD-286, ADR-QD-133, `PortRequest.tst.ts`; the `PortConformance`, `PortDescription`, `PortSpan` and `PortWire` rows updated.
- CCR-QD-411 in `spec/README.md` Rev 1.145 names every changed file, the RED commits (`b4f97956`, `464544e3`, PREQ-04 by hand), the harm correction, the per-file mutation, and the numbers.
- Numbers used: ADR-QD-133, BEH-QD-440, BEH-QD-441, INV-QD-286, CCR-QD-411. **Unused: BEH-QD-442..444, INV-QD-287.** `next-id.mjs` was not run.

## Mutation (WX-05), per file, Killed+Timeout over all non-ignored, base to after

| File | Base | After |
| ---- | ---- | ----- |
| AttributeResolver.ts | 1.000 | 1.000 |
| RelationshipResolver.ts | 1.000 | 1.000 |
| DecisionHistory.ts | 1.000 | 1.000 |
| PortDescription.ts | 1.000 | 1.000 |
| PortDerivation.ts | 0.978 | 0.978 |
| SignatureHistory.ts | 0.955 | 0.960 |
| CustomPredicate.ts | 0.932 | 0.944 |
| PortSpanEncode.ts | 0.800 | 0.800 |
| PortWireEncode.ts | 0.619 | 0.692 |

No file is below its base. Same Stryker command and `--mutate` list as 21-01; `21-mutation-after.json` holds the scores.

## Merge gate (WX-01)

`pnpm check:pr`: exit 0, all 16 steps (typecheck, lint with budgets, circular, tstyche, coverage, BDD, doc examples, `spec:verify:strict`, `spec:gates`, `spec:claims`, `spec:api`, `spec:package`, example, website examples, website build, `spec:publish`); `pnpm mutation` is the one step `check:pr` skips by design. `git diff ba38f367 -- scripts vitest.config.ts packages/*/vitest.config.ts stryker.config.mjs .oxlintrc.json spec/overview.md` is empty: no gate script, threshold, budget or overview edit (WX-03, WX-04). `pnpm spec:api` (gate 13) green: no export added or removed.

## Task commits

| Task | Commit | Files |
| ---- | ------ | ----- |
| 1 records | `c44efe7f` | ADR-QD-133, ADR-QD-094/107, index.yaml, 06-services.md, invariants.md, traceability.md |
| 3 mutation fallout | `0238a8a0` | SignatureHistory.test.ts, 21-mutation-after.json |
| 2 register, changeset, AGENTS.md | `653af1cf` | spec/README.md, AGENTS.md, port-keys-cover-the-request.md |

## Deviations from Plan

**1. [Rule 1 - Bug] SignatureHistory.ts mutation score fell below the base (0.955 to 0.947)**
- **Found during:** Task 3, the per-file comparison.
- **Issue:** the derived key and defect removed code whose mutants were killed. The four survivors (an equivalent `makeResourceId(undefined)` mutant, the refusal branch unreachable from typed input, and the served leaf name) are unchanged from the base, so the ratio fell with the denominator.
- **Fix:** one test, "a HasSignature leaf asks the signature port for its own records", kills the leaf-name mutant: 0.960. No threshold or ignore. Phase 22 removes `leaves` (adds `asks`) and will move this pin with it.
- **Files modified:** `packages/core/test/SignatureHistory.test.ts`
- **Commit:** `0238a8a0`

**2. [Process] Commit order.** The mutation fix (Task 3) was committed before the register commit (Task 2) because CCR-QD-411's text quotes the final mutation scores.

**Total deviations:** 1 auto-fixed (bug), 1 process note. **Impact:** none on scope.

## Known Stubs

None.

## Threat Flags

None. T-21-11 (changeset and CCR-QD-411 record the key-text change), T-21-12 (ADR-QD-133 states the correction in Context) and T-21-13 (`check:pr` green, no gate weakened) are mitigated as planned.

## Phase result

Ready for phase verification. Everything in the phase is derived or compiler-checked: the key and defect (`makePortDescription`), the wire question (`QuestionOf`) and the span question (`PoseOf`); `CustomPredicate` is the one documented override.

## Self-Check: PASSED

- `spec/decisions/133-…md` and `21-mutation-after.json` exist.
- Commits `c44efe7f`, `0238a8a0`, `653af1cf` are ancestors of HEAD; `commits: 3` measured from the ledger base.
- `pnpm check:pr` exit 0; `node scripts/spec-revise.mjs --check` green.
