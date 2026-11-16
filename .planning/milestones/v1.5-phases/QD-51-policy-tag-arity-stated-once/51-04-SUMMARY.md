---
phase: QD-51-policy-tag-arity-stated-once
plan: 04
subsystem: spec-records
tags: [adr, behaviours, invariants, traceability, changeset, ARTY-03, WX-02, WX-03, WX-07]
phase_base: 8d87d837beab28e8d0610eab8b6c274d45152374
plan_head_before: 7e3df491b6719f72d7917cd59eb2a1051c2957a9
plan_head_after: 1a570b91ec6a9a992681dc51425bb3c971fb94e1
commits: 3
requires: [51-03]
provides:
  - "ADR-QD-164 and its index entry"
  - "BEH-QD-591, 592, 594 (25-inspection.md); BEH-QD-593, 595 (18-explanation.md)"
  - "INV-QD-347 and INV-QD-348; traceability rows; CCR-QD-442; the @qadi/core patch changeset"
affects: [QD-51-05]
key-files:
  created:
    - spec/decisions/164-policy-tag-arity-is-stated-once.md
    - .changeset/policy-arity-stated-once.md
  modified:
    - spec/decisions/index.yaml
    - spec/behaviors/25-inspection.md
    - spec/behaviors/18-explanation.md
    - spec/invariants.md
    - spec/traceability.md
    - spec/README.md
decisions:
  - "The ADR states the base mutation scores and the rule 51-05 applies; the after-run stays in 51-05"
  - "renderTrace and diffTraces keep their own walks and read no arity; foldTrace stays public and unchanged (ARTY-03)"
metrics:
  duration: ~25 min
  completed: 2026-11-16
  tasks: 3
  files: 8
status: complete
---

# Phase QD-51 Plan 04: Records Summary

ADR-QD-164, BEH-QD-591..595, INV-QD-347..348, their traceability rows, the stale `LeafPolicy` fence, the CCR-QD-442 row and a `@qadi/core` patch changeset record the arity record under exactly the reserved ids, with no export or overview change.

## Records written

| File | Section | Id | New Rev |
|---|---|---|---|
| `spec/decisions/164-policy-tag-arity-is-stated-once.md` | whole file (Context, Decision, The Many type, Why renderTrace and diffTraces keep their own walks, The experiment after, Mutation, Consequences) | ADR-QD-164 | 1.0 (new) |
| `spec/decisions/index.yaml` | last entry | ADR-QD-164 | n/a |
| `spec/behaviors/25-inspection.md` | after BEH-QD-318, before BEH-QD-301; BEH-QD-318's `ts` fence now shows `Extract<Policy, { readonly _tag: TagsOfArity<"Leaf"> }>` | BEH-QD-591, BEH-QD-592, BEH-QD-594 | 1.37 |
| `spec/behaviors/18-explanation.md` | after BEH-QD-319, before the closing `---` | BEH-QD-593, BEH-QD-595 | 1.10 |
| `spec/invariants.md` | after INV-QD-346 (INV-QD-090 byte-identical to the base) | INV-QD-347, INV-QD-348 | 1.147 |
| `spec/traceability.md` | 18 and 25 behaviour rows, two INV rows, ADR row, three test-file rows | n/a | 1.212 |
| `spec/README.md` | CCR-QD-442 row after CCR-QD-441, ending `Unused: none.` | CCR-QD-442, ARCH-98 | 1.236 |
| `.changeset/policy-arity-stated-once.md` | `"@qadi/core": patch`, no Breaking text | n/a | n/a |

`spec/overview.md`, `AGENTS.md`, `apps/website/.../upgrading.md`, `scripts/check-house-style.mjs`, every `package.json` and `pnpm-lock.yaml` are unchanged since `phase_base`. No `typescript` or `tsx` fence names `PolicyArity`. `scripts/next-id.mjs` was not run.

## Commits

- 9bbb1905: `docs(51-04): ADR-QD-164 — policy tag arity is stated once` (ADR and `index.yaml`)
- 57db40f1: `docs(51-04): the arity behaviours, invariants and traceability`
- 1a570b91: `docs(51-04): CCR-QD-442 and the @qadi/core patch changeset`

## Verification

- `node scripts/spec-revise.mjs --check`: every Revision matches its newest history entry. `pnpm spec:verify:strict`: 21 pass, 0 fail. `pnpm spec:examples`: 116 blocks compile.
- `pnpm check:pr < /dev/null`: exit 0, 16 of 16 steps (`pnpm mutation` skipped by design): `house-style: 539 file(s) clean (3 declared switch(es))`, vitest 228 files / 5575 tests and 34 files / 568 tests (bdd), `api-surface: 932 export(s)` (the base's figure, so no overview row is owed), `package-install: 9 package(s)`, `publish-status`. Output: scratchpad `checkpr04.txt`.
- The ADR's figures are copied from the evidence files: 32 of 32 moves compile on the base, existing tests catch 8, `TraceShape.test.ts` 32; the proof table of 51-03; the base mutation scores of 51-01.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] The ADR's links to the behaviour sections lacked `../`**
- **Found during:** Task 2 `pnpm spec:verify:strict` (`relative link integrity`: five links from `decisions/` to `behaviors/`).
- **Fix:** the five links now read `../behaviors/...`. The ADR was already committed, so the fix amended the Task 1 commit (local, unpushed; the plan's check that one `docs(51-04)` commit carries exactly the two files still holds). It is the hash above, 9bbb1905.
- **Files modified:** spec/decisions/164-policy-tag-arity-is-stated-once.md

**2. [Rule 3 - Ordering] `spec:verify:strict`'s `CCR register coverage` could not pass between Tasks 1 and 3**
- The ADR's Change History names CCR-QD-442 from Task 1 on, and the register row is the plan's Task 3. Task 2's verify lists `pnpm spec:verify:strict`; I ran it before Task 3 and it reported only that check (`got [... 442]`), which Task 3's row cleared. Task 2 was committed with every other check green and the strict run is 21 of 21 after Task 3 and in `check:pr`. Nothing was weakened.

Total deviations: 2, no scope change.

## Known Stubs

None.

## Threat Flags

None. No source, endpoint or schema changed.

## Self-Check: PASSED

- FOUND: spec/decisions/164-policy-tag-arity-is-stated-once.md, .changeset/policy-arity-stated-once.md
- FOUND commits: 9bbb1905, 57db40f1, 1a570b91
