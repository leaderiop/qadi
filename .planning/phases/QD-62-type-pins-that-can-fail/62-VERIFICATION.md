---
phase: QD-62-type-pins-that-can-fail
verified: 2026-11-20T00:00:00Z
status: passed
score: 4/4 must-haves verified
covered_files:
  - .planning/phases/QD-62-type-pins-that-can-fail/62-01-PLAN.md
  - .planning/phases/QD-62-type-pins-that-can-fail/62-01-SUMMARY.md
  - .planning/phases/QD-62-type-pins-that-can-fail/62-02-PLAN.md
  - .planning/phases/QD-62-type-pins-that-can-fail/62-02-SUMMARY.md
  - .planning/phases/QD-62-type-pins-that-can-fail/62-03-PLAN.md
  - .planning/phases/QD-62-type-pins-that-can-fail/62-03-SUMMARY.md
  - .planning/phases/QD-62-type-pins-that-can-fail/62-04-PLAN.md
  - .planning/phases/QD-62-type-pins-that-can-fail/62-04-SUMMARY.md
  - .planning/phases/QD-62-type-pins-that-can-fail/62-05-PLAN.md
  - .planning/phases/QD-62-type-pins-that-can-fail/62-05-SUMMARY.md
  - .planning/phases/QD-62-type-pins-that-can-fail/62-06-PLAN.md
  - .planning/phases/QD-62-type-pins-that-can-fail/62-06-SUMMARY.md
  - .planning/phases/QD-62-type-pins-that-can-fail/62-07-PLAN.md
  - .planning/phases/QD-62-type-pins-that-can-fail/62-07-SUMMARY.md
  - .planning/phases/QD-62-type-pins-that-can-fail/62-08-PLAN.md
  - .planning/phases/QD-62-type-pins-that-can-fail/62-08-SUMMARY.md
  - AGENTS.md
  - packages/core/test/FloatingEffectPins.tst.ts
  - scripts/check-house-style.mjs
  - scripts/lib/type-tests.mjs
  - scripts/run-tstyche.mjs
  - tsconfig.tstyche.json
  - tstyche.json
covered_digest: "v4:sha256:9c0d0b05bfa7a8db87fb92969521ee6e0bc95b5a91acece847a703f943de067d"
behavior_unverified: 0
overrides_applied: 0
---

# Phase QD-62: Type pins that can fail - Verification Report

**Phase Goal:** A negative `not.toBeCallableWith` pin can fail for valid arguments whatever the subject returns, every negative callable pin that remains is either reason-stated or controlled by a positive pin, and a gate keeps their count from drifting.
**Verified:** 2026-11-20
**Status:** passed
**Re-verification:** No, initial verification (the review and fix loop is already folded into the tree this checked)

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
| - | ----- | ------ | -------- |
| 1 | A negative pin can fail for valid arguments whatever the subject returns | VERIFIED | Scratch probe `packages/core/test/ZzProbe.tst.ts` (`declare const f: (n:number)=>Effect.Effect<number>; expect(f).type.not.toBeCallableWith(1)`) under `tstyche.json`: `fail ... Expression is callable with the given argument`, `uses TypeScript 6.0.3 with ./tsconfig.tstyche.json`. Probe deleted afterwards (`git status` clean for packages/scripts/spec). `tsconfig.tstyche.json` extends `tsconfig.test.json` and sets only `floatingEffect: "off"` in a restated plugin entry; `tstyche.json` names it. The characterisation file has three blocks (rule-off: `// @tstyche fixme` on 3 negative pins, so a passing one fails the run; rule-on config block: no directive; in-file directive block). Running the rule-on block under the rule-off config goes red (`Assertions: 3 failed`), so it is the RED twin that detects the config changing. |
| 2 | Every remaining negative callable pin is reason-stated or controlled by a positive pin | VERIFIED | `62-PIN-CLASSIFICATION.md` classifies P01..P88 (81 callable plus 7 constructable) with a Control line for each. `[not-callable-control]` in `scripts/check-house-style.mjs` enforces same-subject, same-form, same-kind positive twins and refuses `.skip/.only/.todo` and `@tstyche` directives in a file with a negative pin. Probe pin with no twin failed it: `[not-callable-control] a negative pin with no positive twin (toBeCallableWith value f)`. `DecisionLog.tst.ts:30` (the one vacuous pin) is rewritten to `Parameters<typeof makeDecisionLog>[0]` with `toBeAssignableTo` and `not.toBeAssignableTo`, which states its reason. Effect-returning subjects read through `Params<F>` (PortAccess, DecisionCache, DiagnosticsStore) or carry the reason through the parameter type. |
| 3 | A gate keeps the count from drifting | VERIFIED | `NOT_CALLABLE_PIN_BUDGET` (27 files, callable and constructable counts, FloatingEffectPins row at 7/3), checked both directions, over its own walk (`scripts/lib/type-tests.mjs`) and against AGENTS.md section 6's table (`[not-callable-pin-table]`). Same probe: `[not-callable-pin] 1 negative callable ... NOT_CALLABLE_PIN_BUDGET says none`. `node scripts/check-house-style.mjs`: `560 file(s) clean (3 declared switch(es), 66 type-test file(s))`, exit 0. `[tstyche-plugin-drift]` restricts `tsconfig.tstyche.json` to `extends` plus `compilerOptions.plugins`, requires the entry to equal the base's except `floatingEffect`, and requires the base to keep the rule on. |
| 4 | The runner proves both settings hold for every pin | VERIFIED | `node scripts/run-tstyche.mjs` exit 0: pass 1 under `tsconfig.tstyche.json`, pass 2 under `tsconfig.test.json`; `Test files: 66 passed, 66 total`. It cross-checks `tstyche --listFiles` against the walk, requires each skip text to occur once and only in the characterisation file, and fails if a file compiles under a project other than the pass's own. `package.json` `test:tstyche` runs it. |

**Score:** 4/4 truths verified. Behaviour-dependent truths all have a behavioural test or probe run in this verification, so `behavior_unverified` is 0.

### Superseded plan-time literals (not gaps)

- 62-01's plan says the characterisation has two halves and `3 fixme`; the tree now has three blocks (review WR-01 added the directive-free rule-on block and its skip title). The FloatingEffectPins budget row is 7 callable and 3 constructable, up from 5 and 2.
- Plan-time base counts (`560 file(s) clean`, `939 export(s)`, `66 passed`) still match; the house-style line now also prints `66 type-test file(s)`.

### Required Artifacts

| Artifact | Status | Details |
| -------- | ------ | ------- |
| `packages/core/test/FloatingEffectPins.tst.ts` | VERIFIED | Three blocks plus a plain-return control; exists, substantive, run by both passes. |
| `tsconfig.tstyche.json`, `tstyche.json` | VERIFIED | Wired (`tstyche.json` names it; drift gate enforces the link). |
| `scripts/run-tstyche.mjs`, `scripts/lib/type-tests.mjs` | VERIFIED | Shared by `check-house-style.mjs` and `run-tstyche.mjs`; wired via `package.json`. |
| `NOT_CALLABLE_PIN_BUDGET`, `[not-callable-control]`, `[tstyche-plugin-drift]` | VERIFIED | Present and each fails on a probe or a read of its failure path. |
| `62-PIN-CLASSIFICATION.md`, `62-FLIP-SWEEP.md` | VERIFIED | Present; classification rows cover every pin. |
| ADR-QD-175, CCR-QD-453, `spec/decisions/index.yaml`, traceability rows | VERIFIED | Present (`spec/README.md:390`, `spec/traceability.md:368,508`, ADR-QD-037 amendment). |

### Behavioural Spot-Checks

| Behaviour | Command | Result | Status |
| --------- | ------- | ------ | ------ |
| Negative pin on Effect subject fails for valid args | tstyche on scratch probe | `fail`, "callable with the given argument" | PASS |
| Unbudgeted, twin-less negative pin refused | `node scripts/check-house-style.mjs` with probe | 2 violations, exit non-zero | PASS |
| Rule-on block red when config has rule off | tstyche `--tsconfig tsconfig.tstyche.json --skip "under the tstyche tsconfig"` on the file | `Assertions: 3 failed, 5 passed` | PASS |
| Both gates green on the tree | `node scripts/check-house-style.mjs`; `node scripts/run-tstyche.mjs` | exit 0, 66/66 | PASS |
| Whole merge gate minus mutation | `pnpm check:pr < /dev/null` | `ran 16 of 17 steps`, exit 0 | PASS |
| API surface | `node scripts/check-api-surface.mjs` | `939 export(s) documented across 9 package(s)` | PASS |

### Requirements Coverage

| Requirement | Description | Status | Evidence |
| ----------- | ----------- | ------ | -------- |
| PIN-01 | Characterisation pins tstyche's reading under both settings | SATISFIED | Three-block `FloatingEffectPins.tst.ts`; RED twin demonstrated. |
| PIN-02 | tstyche runs under a tsconfig with `floatingEffect` off; every `.tst.ts` stays green | SATISFIED | `tsconfig.tstyche.json`, `tstyche.json`; 66/66 passed. |
| PIN-03 | `DecisionLog.tst.ts:30` rewritten to state its reason | SATISFIED | Rewritten via `Parameters<typeof makeDecisionLog>[0]`. |
| PIN-04 | The negative pins without a positive control get one, in the classification | SATISFIED | `62-PIN-CLASSIFICATION.md` Control column for P01..P88; enforced by `[not-callable-control]`. |
| PIN-05 | `NOT_CALLABLE_PIN_BUDGET` counts negative callable pins per file | SATISFIED | Budget in `check-house-style.mjs`, both directions, AGENTS.md table gated. |
| WX-01 | `pnpm check:pr < /dev/null` green | HONOURED | Exit 0, run in this verification. |
| WX-02 | ADR, CCR row, BEH/INV/traceability recorded | HONOURED | ADR-QD-175, CCR-QD-453, traceability rows 368 and 508, index.yaml entry. |
| WX-03 | `spec/overview.md` names added/dropped exports (gate 13) | HONOURED | No export changed (`git diff --quiet 4cab2e74 -- 'packages/*/src'` exits 0); gate 13 green. |
| WX-04 | Nothing forbidden added | HONOURED | Added-line scan of packages, scripts and configs: no `as`, `!`, `any`, `switch`, `fnUntraced`, `async`/`await`, `Date.now`, `process.env`; the only `console.*` are `console.error` in the Node scripts under `scripts/`, which house-style does not scan and which already use it. |
| WX-05 | Coverage and Stryker thresholds hold | HONOURED | No file under `packages/*/src` changed, so coverage and mutation inputs are unchanged. The mutation step is not run by `check:pr` and was not run here. |
| WX-06 | Behaviour change preceded by a characterisation test on the base | HONOURED | `62-01-SUMMARY.md` records `phase_base: 4cab2e74...` and the RED run (`was supposed to fail, but it passed` x3); the RED twin is permanent. |
| WX-07 | No D-numbers, plan-local ids or phase numbers in shipped source, test titles or BDD | HONOURED | Added-line scan of `packages/*/test` found none; only `ADR-QD-175` ids appear in scripts, which is the permitted form. |

Requirement IDs from PLAN frontmatter and REQUIREMENTS.md agree (PIN-01..05 marked Complete; WX-01..07 stay Pending by design, being cross-cutting). No orphaned IDs.

### Anti-Patterns Found

None blocking. No TBD/FIXME/XXX in changed files; no stubs. Latest review (`62-REVIEW.md`) reports 0 critical, 0 warning.

### Human Verification Required

None.

### Gaps Summary

No gaps. The goal holds on the current tree: the negative pin on an Effect-returning subject fails for valid arguments under tstyche's own config, each remaining pin has a classification and a twin enforced by a gate, and the budget gate fails in both directions.

Not checked: the Stryker run (`pnpm mutation`), skipped by `check:pr` and irrelevant as no `src` changed. 62-08's word-level close-scan deviation was taken from its SUMMARY (orchestrator-approved), not re-run.

---

_Verified: 2026-11-20_
_Verifier: Claude (gsd-verifier)_
