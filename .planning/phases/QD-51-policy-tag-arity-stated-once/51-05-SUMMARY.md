---
phase: QD-51-policy-tag-arity-stated-once
plan: 05
subsystem: phase-close
tags: [mutation, phase-scan, check-pr, release-check, ARTY-01, ARTY-02, ARTY-03, WX-01, WX-05, WX-06, WX-07]
phase_base: 8d87d837beab28e8d0610eab8b6c274d45152374
plan_head_before: 638ac86fbf7e0af3989c5ca94e30f9a7465c4902
plan_head_after: daa407a7b540db298d0ca208f4c82d96593b75be
commits: 1
requires: [51-04]
provides:
  - "51-mutation-after.json and the base-versus-after comparison (WX-05 holds)"
  - "the phase scan, circular, house-style and check:pr results on the final tree"
  - "ARTY-01..03 complete"
affects: []
key-files:
  created:
    - .planning/phases/QD-51-policy-tag-arity-stated-once/51-mutation-after.json
  modified:
    - .planning/REQUIREMENTS.md
decisions:
  - "No new survivor: nothing added to PolicyArity.test.ts, and 51-mutation-base.json was never re-measured"
metrics:
  duration: "about 15 minutes"
  completed: 2026-11-16
status: complete
actuals:
  tokens: 4000
  tasks: 3
  commits: 1
requirements-completed: [ARTY-01, ARTY-02, ARTY-03]  # backfilled at the v1.5 milestone audit; the phase VERIFICATION marks each SATISFIED
---

# Phase QD-51 Plan 05: Phase close Summary

The phase closes green: the Stryker after-run on the final source shows `Decision.ts` up from 0.9586 to 0.9639 (the `"Many"` `whenOr` survivor left with its line), `Policy.ts` unchanged, no new survivor; the phase scan is clean; `pnpm check:pr` exits 0; nothing was released.

## Mutation after

Invocation (the base's, with `,packages/core/src/PolicyArity.ts` appended; alone, exit 0, 55 s):
`pnpm exec stryker run stryker.config.mjs --mutate 'packages/core/src/Policy.ts,packages/core/src/Decision.ts,packages/core/src/PolicyArity.ts' < /dev/null`

`tools/mutation.mjs after` wrote `51-mutation-after.json` (commit daa407a7):

```
packages/core/src/Decision.ts 0.963855421686747 (160/166) ignored 17
survivor Decision.ts:106:72 BooleanLiteral | NoCoverage | trace.allowed | !trace.allowed
survivor Decision.ts:356:9 ConditionalExpression | Survived | true | isFieldOf(data, field)
survivor Decision.ts:360:19 BooleanLiteral | Survived | false | true | writable: true,
survivor Decision.ts:361:23 BooleanLiteral | Survived | false | true | configurable: true,
survivor Decision.ts:561:18 ArithmeticOperator | Survived | node.children.length + 1 | - 1
survivor Decision.ts:563:11 ConditionalExpression | Survived | true | child !== undefined
packages/core/src/Policy.ts 0.9864864864864865 (146/148) ignored 141
survivor Policy.ts:816:65 StringLiteral | Survived | "" | "AnyOf"
survivor Policy.ts:1287:35 EqualityOperator | Survived | value >= max | value > max
packages/core/src/PolicyArity.ts unmeasured: no mutant: absent from the report (ignoreStatic: true; the module holds only static declarations)
```

`tools/mutation.mjs compare` (exit 0):

```
packages/core/src/Decision.ts 0.9585798816568047 -> 0.963855421686747 (survivors +0 -1)
  gone survivor StringLiteral | Survived | "" | "Many" | Match.whenOr("AllOf", "AnyOf", "Rules", (): TraceShape => "Many"),
packages/core/src/Policy.ts 0.9864864864864865 -> 0.9864864864864865 (survivors +0 -0)
packages/core/src/PolicyArity.ts unmeasured: no mutant: absent from the report (ignoreStatic: true; the module holds only static declarations)
WX-05 holds
```

The survivors that remain are the base's, shifted by line number only. `PolicyArity.ts` has no scored mutant, so there is no `## New-file survivors` section (D-11). `51-mutation-base.json` has exactly one commit, `chore(51-01)`; the after commit carries only the after JSON, with the trailer, and follows the last `packages/core/src` commit.

## Phase scan

- `node .planning/phases/QD-51-policy-tag-arity-stated-once/tools/scan.mjs`: `phase scan clean` (exit 0). It accepted 51-03's extra test-only commit 74917a4d and 51-04's amended Task 1 commit 9bbb1905 as written, so neither needed a scan-side adjustment.
- `pnpm circular`: `No circular dependency found!` (232 files).
- `node scripts/check-house-style.mjs`: `house-style: 539 file(s) clean (3 declared switch(es))`.
- No commit since `phase_base` touches `tools/`, `scripts/` or `stryker.config.mjs` (0 commits).
- Edge ledger closing count: 30 truths across 51-01..51-05, 3 flagged assumptions (items 1, 6 and 7); each plan's truths were met by that plan's verifies, and the phase scan confirmed the whole-phase ones (scope, constructs, byte-unchanged walks, type-only `Policy.ts`, order, ids).

## Close

- `pnpm check:pr < /dev/null` on the committed tree (nothing uncommitted under packages, spec, scripts, .changeset or AGENTS.md; nothing staged; no Stryker run alongside): exit 0, `run-check: ran 16 of 17 steps; "pnpm mutation" was skipped (release PRs run it)`. Final step `spec:publish`: 9 packages and 6 documents agree on version 0.12.0. This phase's mutation evidence is Task 1's targeted run.
- Release check (WX-07): `git tag --contains phase_base` empty; no `CHANGELOG.md` or `package.json` changed since `phase_base`; no base changeset deleted; branch `arch-wave-10`; `git branch -r --contains HEAD` empty; nothing staged. Result: `nothing released`.
- `.planning/REQUIREMENTS.md`: ARTY-01, ARTY-02, ARTY-03 checked `[x]` and their traceability rows set to `Complete`, in this plan only.

## Deviations from Plan

None. The two known deviations from earlier plans (51-03's extra test-only commit 74917a4d between RED and GREEN; 51-04's amended, unpushed Task 1 commit 9bbb1905) were accepted by the scan as written.

## Known Stubs

None.

## Threat Flags

None. No source changed in this plan.

## Self-Check: PASSED

- FOUND: `.planning/phases/QD-51-policy-tag-arity-stated-once/51-mutation-after.json`
- FOUND: commit daa407a7 (`chore(51-05): mutation after-run for Policy, Decision and PolicyArity`)
