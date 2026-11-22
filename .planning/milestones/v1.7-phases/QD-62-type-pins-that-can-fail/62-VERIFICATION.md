---
phase: QD-62-type-pins-that-can-fail
verified: 2026-11-20T00:00:00Z
status: passed
score: 4/4 must-haves verified
covered_files:
  - .planning/milestones/v1.7-phases/QD-62-type-pins-that-can-fail/62-01-PLAN.md
  - .planning/milestones/v1.7-phases/QD-62-type-pins-that-can-fail/62-01-SUMMARY.md
  - .planning/milestones/v1.7-phases/QD-62-type-pins-that-can-fail/62-02-PLAN.md
  - .planning/milestones/v1.7-phases/QD-62-type-pins-that-can-fail/62-02-SUMMARY.md
  - .planning/milestones/v1.7-phases/QD-62-type-pins-that-can-fail/62-03-PLAN.md
  - .planning/milestones/v1.7-phases/QD-62-type-pins-that-can-fail/62-03-SUMMARY.md
  - .planning/milestones/v1.7-phases/QD-62-type-pins-that-can-fail/62-04-PLAN.md
  - .planning/milestones/v1.7-phases/QD-62-type-pins-that-can-fail/62-04-SUMMARY.md
  - .planning/milestones/v1.7-phases/QD-62-type-pins-that-can-fail/62-05-PLAN.md
  - .planning/milestones/v1.7-phases/QD-62-type-pins-that-can-fail/62-05-SUMMARY.md
  - .planning/milestones/v1.7-phases/QD-62-type-pins-that-can-fail/62-06-PLAN.md
  - .planning/milestones/v1.7-phases/QD-62-type-pins-that-can-fail/62-06-SUMMARY.md
  - .planning/milestones/v1.7-phases/QD-62-type-pins-that-can-fail/62-07-PLAN.md
  - .planning/milestones/v1.7-phases/QD-62-type-pins-that-can-fail/62-07-SUMMARY.md
  - .planning/milestones/v1.7-phases/QD-62-type-pins-that-can-fail/62-08-PLAN.md
  - .planning/milestones/v1.7-phases/QD-62-type-pins-that-can-fail/62-08-SUMMARY.md
  - AGENTS.md
  - packages/core/test/FloatingEffectPins.tst.ts
  - scripts/check-house-style.mjs
  - scripts/lib/type-tests.mjs
  - scripts/run-tstyche.mjs
  - tsconfig.tstyche.json
  - tstyche.json
covered_digest: "v4:sha256:17e126a300b5d721d53d517204d6927a5338f4ffb49782558a0b8907cd67c2f6"
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

## Re-verification (2026-11-21, Phase 68 sweep)

**Staleness:** `62: stale, verification b9ab1ea2, 30 cited, 9 changed since` (`68-stale.mjs`, run at `030dcae5`).

| Cited file | Changed since `b9ab1ea2` by |
| --- | --- |
| `AGENTS.md` (covered) | `36036666` (before Phase 68) fix(67): IN-03 move the dispatch measurement into the evidence document<br>`dea2afb4` (before Phase 68) docs(67-06): BEH-QD-166's reasons and INV-QD-379, traced and registered as CCR-QD-458<br>`f62f450d` (before Phase 68) docs(66-04): ADR-QD-170 amended, BEH-QD-666 and INV-QD-377, traced and registered as CCR-QD-457<br>`744d415d` (before Phase 68) docs(63-04): AGENTS.md and the DoD say the packed consumer probes every make*Feed |
| `packages/core/test/FloatingEffectPins.tst.ts` (covered) | `faec4fab` docs(68-07): the characterisation's readings, the projection's accessors, the admit pins and the supplied trace |
| `scripts/check-house-style.mjs` (covered) | `ec59e0ac` fix(68-08): test:tstyche takes file filters, house-style reads tstyche.json as JSONC, the characterisation is named once |
| `scripts/lib/type-tests.mjs` (covered) | `ec59e0ac` fix(68-08): test:tstyche takes file filters, house-style reads tstyche.json as JSONC, the characterisation is named once |
| `scripts/run-tstyche.mjs` (covered) | `ec59e0ac` fix(68-08): test:tstyche takes file filters, house-style reads tstyche.json as JSONC, the characterisation is named once |
| `spec/README.md` | `eacfeb6c` docs(68-11): CCR-QD-459, the settled items confirmed, and the devtools patch changeset<br>`82f87b4f` (before Phase 68) docs(67): the later bench run's miss deltas are not the dispatch's alone<br>`e5c18e6f` (before Phase 68) fix(67): IN-04 state the dispatch run's base spreads and host load beside the verdict<br>`36036666` (before Phase 68) fix(67): IN-03 move the dispatch measurement into the evidence document<br>`dea2afb4` (before Phase 68) docs(67-06): BEH-QD-166's reasons and INV-QD-379, traced and registered as CCR-QD-458<br>`a25de426` (before Phase 68) fix(66): WR-01, IN-01, IN-04 state the spec text exactly<br>`f62f450d` (before Phase 68) docs(66-04): ADR-QD-170 amended, BEH-QD-666 and INV-QD-377, traced and registered as CCR-QD-457<br>`b56f32c0` (before Phase 68) docs(65): CCR-QD-456 cites the revisions the review fix left<br>`f8f7ed70` (before Phase 68) docs(65-05): ADR-QD-172 amended; INV-QD-375 and INV-QD-376 recorded, traced and registered<br>`1a800ebb` (before Phase 68) docs(64): the overview's gates-feed row states the listener contract<br>`87267447` (before Phase 68) fix(64): WR-01 state the timeline resize publish's throw in the listener texts<br>`f348c2ea` (before Phase 68) docs(64-04): ADR-QD-177 recorded, indexed, traced and registered<br>`f4398b04` (before Phase 68) fix(63): ADR-QD-033 and CCR-QD-454 name the guard's full type-only and refused-shape lists<br>`d47102e2` (before Phase 68) docs(63-04): ADR-QD-033 amended for the probed consumer, traced and registered as CCR-QD-454 |
| `spec/decisions/index.yaml` | `5b603fea` docs(68-10): the amended decisions, behaviours and invariants say what the code holds<br>`f62f450d` (before Phase 68) docs(66-04): ADR-QD-170 amended, BEH-QD-666 and INV-QD-377, traced and registered as CCR-QD-457<br>`f8f7ed70` (before Phase 68) docs(65-05): ADR-QD-172 amended; INV-QD-375 and INV-QD-376 recorded, traced and registered<br>`18afe3bf` (before Phase 68) docs(64-04): BEH-QD-656, INV-QD-373 and the ADR-QD-173 amendment<br>`f348c2ea` (before Phase 68) docs(64-04): ADR-QD-177 recorded, indexed, traced and registered |
| `spec/overview.md` | `f62f450d` (before Phase 68) docs(66-04): ADR-QD-170 amended, BEH-QD-666 and INV-QD-377, traced and registered as CCR-QD-457<br>`1a800ebb` (before Phase 68) docs(64): the overview's gates-feed row states the listener contract |
| `spec/traceability.md` | `5b603fea` docs(68-10): the amended decisions, behaviours and invariants say what the code holds<br>`faec4fab` docs(68-07): the characterisation's readings, the projection's accessors, the admit pins and the supplied trace<br>`dea2afb4` (before Phase 68) docs(67-06): BEH-QD-166's reasons and INV-QD-379, traced and registered as CCR-QD-458<br>`a25de426` (before Phase 68) fix(66): WR-01, IN-01, IN-04 state the spec text exactly<br>`f62f450d` (before Phase 68) docs(66-04): ADR-QD-170 amended, BEH-QD-666 and INV-QD-377, traced and registered as CCR-QD-457<br>`a23dacf1` (before Phase 68) fix(65): WR-01 narrow the read-once claim to the question's resource and action<br>`7e2530f1` (before Phase 68) docs(65-05): BEH-QD-661 and BEH-QD-662<br>`f8f7ed70` (before Phase 68) docs(65-05): ADR-QD-172 amended; INV-QD-375 and INV-QD-376 recorded, traced and registered<br>`18afe3bf` (before Phase 68) docs(64-04): BEH-QD-656, INV-QD-373 and the ADR-QD-173 amendment<br>`f348c2ea` (before Phase 68) docs(64-04): ADR-QD-177 recorded, indexed, traced and registered<br>`d47102e2` (before Phase 68) docs(63-04): ADR-QD-033 amended for the probed consumer, traced and registered as CCR-QD-454 |

**Trailers on this phase's commits:** 35 `Claude Sonnet 5.5 <noreply@anthropic.com>`, 13 none, 4 `Claude Opus 5.5 <noreply@anthropic.com>`.

**Validation record:** `62-VALIDATION.md` has status `draft` and nyquist_compliant `false`.

**Digest:** `covered_digest: "v4:sha256:9c0d0b05bfa7a8db87fb92969521ee6e0bc95b5a91acece847a703f943de067d"` becomes `covered_digest: "v4:sha256:7fc32fe9c4b36f13e5ed0b72e2efa0507cf37affc4c5e44c7225993e591a2aff"`, over the same 23 covered files.

### Truths re-checked (Phase 68 sweep)

Every row below was read or run on the tree at the commit named above, with nothing else running beside the heavy commands.

| # | Truth | What was read on the current tree | Status |
| - | ----- | --------------------------------- | ------ |
| 1 | A negative pin can fail for valid arguments whatever the subject returns | A scratch file `packages/core/test/ZzProbe.tst.ts` (`declare const f: (n: number) => Effect.Effect<number>; expect(f).type.not.toBeCallableWith(1)`) run under `tstyche.json`: `fail`, `Expression is callable with the given argument.`, `uses TypeScript 6.0.3 with ./tsconfig.tstyche.json`, exit 1. The probe was removed afterwards. `tsconfig.tstyche.json` still extends `./tsconfig.test.json` and holds only `extends` and the restated plugin entry with `floatingEffect` added as `"off"`; `tstyche.json` still names it. `FloatingEffectPins.tst.ts` still has its three blocks and three `// @tstyche fixme` pins; the only change to it since the report is the header comment's wording about the skip texts, no assertion. The rule-on block run under the rule-off config is red: `Assertions: 3 failed, 5 passed, 6 skipped, 14 total`. | VERIFIED |
| 2 | Every remaining negative callable pin is reason-stated or controlled by a positive pin | A planted twin-less negative pin on a plain-return subject, with no budget row, made `node scripts/check-house-style.mjs` exit 1 with two findings, `[not-callable-pin] 1 negative callable and 0 negative constructable pin(s); NOT_CALLABLE_PIN_BUDGET says none` and `[not-callable-control] a negative pin with no positive twin (toBeCallableWith value g)`; the probe was removed. On the unmodified tree the gate prints `house-style: 560 file(s) clean (3 declared switch(es), 66 type-test file(s))` and exits 0. `[not-callable-control]` and the refusal of `.skip`, `.only`, `.todo` and `@tstyche` directives in a file with a negative pin are still in `scripts/check-house-style.mjs`. `DecisionLog.tst.ts` still states its reason through `Parameters<typeof makeDecisionLog>[0]` with a `toBeAssignableTo` pin and a `not.toBeAssignableTo` pin (now at lines 33 and 34). `62-PIN-CLASSIFICATION.md` is unchanged since the report and still has its 88 rows, P01 to P88. | VERIFIED |
| 3 | A gate keeps the count from drifting | `NOT_CALLABLE_PIN_BUDGET` has 28 entries and AGENTS.md section 6's table has 28 rows, the same as at the verification commit (no row of the table changed since; the report's "27 files" reads as the rows besides the characterisation's), with the characterisation row at 7 callable and 3 constructable. The budget's one change since is that the characterisation's key is read from `scripts/lib/type-tests.mjs` instead of a literal; the gate also refuses a table row listed twice, and reads `tstyche.json` as JSONC. The over-budget direction fired on the probe above (`NOT_CALLABLE_PIN_BUDGET says none`); the other direction is still in the code (`is in NOT_CALLABLE_PIN_BUDGET but holds no negative pin`) and was read, not planted. `[tstyche-plugin-drift]` and `[not-callable-pin-table]` are still in the gate, and it is clean, so `tsconfig.tstyche.json` still holds only `extends` and `compilerOptions.plugins` with the entry equal to the base's apart from `floatingEffect`. | VERIFIED |
| 4 | The runner proves both settings hold for every pin | `node scripts/run-tstyche.mjs` exit 0: pass 1 under `tsconfig.tstyche.json` reads `Test files: 66 passed, 66 total` and `Assertions: 759 passed, 3 fixme, 3 skipped, 765 total`; pass 2 under `tsconfig.test.json` reads `Test files: 66 passed, 66 total` and `Assertions: 759 passed, 6 skipped, 765 total`. With the planted rule-on probe (a positive and a bare negative pin on an Effect subject) pass 1 exited 0, pass 2 exited 1, house-style exited 1 and `run-tstyche.mjs` exited 1. With a type test outside `tsconfig.test.json`'s include, the probe passed alone (exit 0) and `run-tstyche.mjs` exited 1. Both probes were removed. The script's one change since the report, file filters, was run once: `node scripts/run-tstyche.mjs packages/core/test/FloatingEffectPins.tst.ts` exited 0 with `Test files: 1 passed, 1 total` in each pass, and `--tsconfig tsconfig.base.json` was refused with `run-tstyche: takes file filters only, and "--tsconfig" is an option.` (exit 1). | VERIFIED |

### Spot-checks re-run (Phase 68 sweep)

| Behaviour | Command run now | Result now | Status |
| --------- | --------------- | ---------- | ------ |
| Negative pin on Effect subject fails for valid args | tstyche on the scratch probe `packages/core/test/ZzProbe.tst.ts` (rebuilt as 62-01 describes it), `node node_modules/tstyche/dist/bin.js ZzProbe`, probe removed after | `fail`, `Expression is callable with the given argument.`, `Assertions: 1 failed, 1 total`, exit 1 | PASS |
| Unbudgeted, twin-less negative pin refused | `node scripts/check-house-style.mjs` with a planted twin-less negative pin on a plain-return subject, probe removed after | `2 house-style violation(s)`: `[not-callable-pin]` and `[not-callable-control]`, exit 1 | PASS |
| Rule-on block red when config has rule off | `node node_modules/tstyche/dist/bin.js --tsconfig tsconfig.tstyche.json --skip "under the tstyche tsconfig" FloatingEffectPins` | `Assertions: 3 failed, 5 passed, 6 skipped, 14 total`, exit 1 | PASS |
| Both gates green on the tree | `node scripts/check-house-style.mjs`; `node scripts/run-tstyche.mjs`, one after the other | house-style `560 file(s) clean (3 declared switch(es), 66 type-test file(s))`, exit 0; tstyche `66 passed, 66 total` in each of its two passes, exit 0 | PASS |
| Whole merge gate minus mutation | `pnpm check:pr < /dev/null` is not run here, so that the one run of the phase is the one that covers the tree its last plan leaves | Answered by the single `check:pr` run in plan 68-15, which reads the whole tree; this verdict stands only while that run is green | ANSWERED BY 68-15 |
| API surface | `node scripts/check-api-surface.mjs` | `api-surface: 939 export(s) documented across 9 package(s)`, exit 0 | PASS |

Two rows were also re-run through the planted-probe scripts 62-06 describes, which exercise `run-tstyche.mjs` as 68-08 left it: the rule-on probe (`rule-on RED: pass 1 green, control check silent, pass 2 red; probe removed`) and the baseline probe (`baseline RED: the probe passes alone, and both passes refuse it; probe removed`). `git status` showed no probe file and no change to `packages`, `scripts`, `spec` or `features` after each.

### Notes on the original report's evidence

Kept whole above; recorded here, not edited.

- The WX-03 row's command, `git diff --quiet 4cab2e74 -- 'packages/*/src'`, matches no file: git's pathspec `packages/*/src` does not select files below `src`, and `git ls-files 'packages/*/src'` lists none, so its exit 0 proved nothing. Run with `'packages/*/src/**'`, the claim it was cited for holds: no file under `packages/*/src` changed between Phase 62's base `4cab2e74` and the verification commit `b9ab1ea2` (0 files). Later phases did change source (`packages/core/src` and `packages/devtools/src`), none of it in this phase's range, and the current export surface is the 939 exports the gate reads.
- The report's Requirements Coverage rows WX-01 to WX-07 describe Phase 62's own range and are not re-run here; this phase's tree is covered by the rows above and by the phase's own close scan.
- `62-VALIDATION.md` is `draft` with `nyquist_compliant` `false`: reported, not edited. A validation audit is `/gsd-validate-phase`'s.

**Verdict:** passed

## Re-verification (2026-11-21, after the code review's fixes)

**Staleness:** `62: stale, verification abf47015, 31 cited, 2 changed since` (`68-stale.mjs`, run at `2367f9df`).

| Cited file | Changed since `abf47015` by |
| --- | --- |
| `spec/README.md` | `8c3375fb` fix(QD-68): WR-02 the timeout text claims only the execFileSync children |
| `spec/traceability.md` | `8c3375fb` fix(QD-68): WR-02 the timeout text claims only the execFileSync children |

**Trailers on this phase's commits:** 35 `Claude Sonnet 5.5 <noreply@anthropic.com>`, 13 none, 4 `Claude Opus 5.5 <noreply@anthropic.com>`.

**Validation record:** `62-VALIDATION.md` has status `draft` and nyquist_compliant `false`.

**Digest:** `covered_digest: "v4:sha256:7fc32fe9c4b36f13e5ed0b72e2efa0507cf37affc4c5e44c7225993e591a2aff"` becomes `covered_digest: "v4:sha256:7fc32fe9c4b36f13e5ed0b72e2efa0507cf37affc4c5e44c7225993e591a2aff"`, over the same 23 covered files.

### Spot-checks re-run (Re-verification (2026-11-21, after the code review's fixes))

Every row was run on the tree at `2367f9df` (the commit `68-stale.mjs` named), one command at a time, in the foreground, with nothing else running beside it. Heavy commands were run once and their result is shared across the six phases' sections.

| Behaviour | Command run now | Result now | Status |
| --------- | --------------- | ---------- | ------ |
| Revision headers and registers | `node scripts/spec-revise.mjs --check < /dev/null` | exit 0; `spec-revise: every Revision matches its newest Change History entry` | PASS |
| Traceability | `bash spec/scripts/verify-traceability.sh --strict < /dev/null` | exit 0; `PASS: 21   FAIL: 0   SKIP: 0 (strict: skips count as failures)` | PASS |
| What `8c3375fb` changed in the spec | `git show 8c3375fb -- spec` | `spec/README.md`: the Revision header (1.273 to 1.274), its Change History and the CCR-QD-459 row (ADR-QD-033 now cited at Rev 1.4). `spec/traceability.md`: the header (1.235 to 1.236), its Change History and the ADR-QD-033 row. `spec/decisions/033-*.md`: Revision 1.4 and the sentence on child timeouts. Every other row of both registers is unchanged | PASS |

### Truths re-checked (Re-verification (2026-11-21, after the code review's fixes))

The changed cited files are `spec/README.md` and `spec/traceability.md`. The truths that cite them rest on rows the change did not touch (last row above); only the Revision headers and the CCR-QD-459 and ADR-QD-033 rows moved, none of which this phase's truths cite. No code, script or test file this phase cites changed.

**Verdict:** passed

## Re-verification (2026-11-21, after Phase 68.1)

**Staleness:** `62: stale, verification 9a92e1d3, 33 cited, 3 changed since` (`68-stale.mjs`, run at `f91b9f4b`).

| Cited file | Changed since `9a92e1d3` by |
| --- | --- |
| `package.json` | `ecb4ed90` fix(68.1-02): analyze.mjs exits 1 on a failed gate, and pnpm check runs its self-test |
| `spec/README.md` | `a8b36092` docs(68.1-05): ADR-QD-033 amended and CCR-QD-460 recorded |
| `spec/decisions/index.yaml` | `a8b36092` docs(68.1-05): ADR-QD-033 amended and CCR-QD-460 recorded |

**Trailers on this phase's commits:** 35 `Claude Sonnet 5.5 <noreply@anthropic.com>`, 13 none, 4 `Claude Opus 5.5 <noreply@anthropic.com>`.

**Validation record:** `62-VALIDATION.md` has status `draft` and nyquist_compliant `false`.

**Digest:** `covered_digest: "v4:sha256:7fc32fe9c4b36f13e5ed0b72e2efa0507cf37affc4c5e44c7225993e591a2aff"` becomes `covered_digest: "v4:sha256:7fc32fe9c4b36f13e5ed0b72e2efa0507cf37affc4c5e44c7225993e591a2aff"`, over the same 23 covered files.

**Staleness by `68.1-stale.mjs`:** `62: stale, verification 9a92e1d3, 33 cited, 3 changed since` (run at `f91b9f4b`).

### Spot-checks re-run (Re-verification (2026-11-21, after Phase 68.1))

Every row was run on the tree at `f91b9f4b`, one command at a time, in the foreground, with stdin closed and nothing else running beside it. The spec-revise and traceability results are shared with the Phase 63, 64, 65, 66 and 67 sections of this re-verification: each was taken once at `c3d8553a`, and no tracked file outside the planning directory differs between that head and `f91b9f4b`.

| Behaviour | Command run now | Result now | Status |
| --------- | --------------- | ---------- | ------ |
| What the phase changed in the spec register | `git diff -U0 0e3f3438 HEAD -- spec/README.md`, and `node scripts/spec-revise.mjs --check < /dev/null` (shared) | 3 insertions and 2 deletions: the Revision header (1.274 to 1.275), the Change History cell (a 1.275 entry in front of the 1.274 one) and one added row, CCR-QD-460, at line 397; no table row is removed or edited, so CCR-QD-453's row (line 390) and every row the report cites are unchanged; `spec-revise` exit 0, `spec-revise: every Revision matches its newest Change History entry` | PASS |
| What the phase changed in the decision index | `git diff -U0 0e3f3438 HEAD -- spec/decisions/index.yaml` | one hunk, at line 136: ADR-QD-033's `status:` line; the ADR-QD-175 entry (line 549) and every other entry are unchanged | PASS |
| What the phase changed in the package manifest | `git diff -U0 0e3f3438 HEAD -- package.json`, and `grep -n '"test:tstyche"' package.json` | two hunks: the new `bench:self-test` script (line 28) and `check` gaining ` && pnpm bench:self-test`; `test:tstyche` is still `node scripts/run-tstyche.mjs` at line 25, as at the base; no dependency field is touched | PASS |
| Traceability | `bash spec/scripts/verify-traceability.sh --strict < /dev/null` (shared) | exit 0; `PASS: 21   FAIL: 0   SKIP: 0 (strict: skips count as failures)` | PASS |

### Changed cited files read against the truths that cite them (Re-verification (2026-11-21, after Phase 68.1))

- `package.json` (`ecb4ed90`): the report cites it for Truth 4 (`test:tstyche` runs the runner) and in its artifacts table (the runner is wired through it). Both still hold: the `test:tstyche` script is unchanged, and the only changes are a new script and one more step at the end of `check`, which neither truth reads.
- `spec/README.md` (`a8b36092`): the report cites it for the CCR-QD-453 registration (line 390), which Truth 3 and the artifacts table rely on. The row is where it was and unedited; the commit adds the CCR-QD-460 row at the end of the register and moves the revision, nothing a truth of this report reads.
- `spec/decisions/index.yaml` (`a8b36092`): the report cites it, with ADR-QD-175, as present. ADR-QD-175's entry is unchanged; the one line that changed belongs to ADR-QD-033, which no truth of this report cites.

**Verdict:** passed

## Re-verification (2026-11-22, after the 68.1 code-review fixes)

**Staleness:** `62: stale, verification 5000af5d, 33 cited, 1 changed since` (`68-stale.mjs`, run at `ae42c2b2`).

| Cited file | Changed since `5000af5d` by |
| --- | --- |
| `spec/README.md` | `79a685b4` docs(68.1): WR-02 WR-03 scope CCR-QD-460's odd-count and hang claims to what was shown |

**Trailers on this phase's commits:** 35 `Claude Sonnet 5.5 <noreply@anthropic.com>`, 13 none, 4 `Claude Opus 5.5 <noreply@anthropic.com>`.

**Validation record:** `62-VALIDATION.md` has status `draft` and nyquist_compliant `false`.

**Digest:** `covered_digest: "v4:sha256:7fc32fe9c4b36f13e5ed0b72e2efa0507cf37affc4c5e44c7225993e591a2aff"` becomes `covered_digest: "v4:sha256:7fc32fe9c4b36f13e5ed0b72e2efa0507cf37affc4c5e44c7225993e591a2aff"`, over the same 23 covered files.

**Staleness by `68.1-stale.mjs`:** `62: stale, verification 5000af5d, 33 cited, 1 changed since` (run at `ae42c2b2`).

### Spot-checks re-run (Re-verification (2026-11-22, after the 68.1 code-review fixes))

Every row was run on the tree at `ae42c2b2`, one command at a time, in the foreground, with stdin closed. The spec-revise and traceability results are shared with the Phase 63 to 68 sections of this re-verification: each was taken once at `ae42c2b2`, in a fresh set after the code-review fixes (the earlier set, taken at `c3d8553a`, is not reused because `scripts/bench/ab.sh` and `spec/` changed), and no tracked file outside the planning directory differs between that head and the head each section was run at.

| Behaviour | Command run now | Result now | Status |
| --------- | --------------- | ---------- | ------ |
| What the phase and its fixes changed in the spec register | `git diff -U0 0e3f3438 HEAD -- spec/README.md`, and `node scripts/spec-revise.mjs --check < /dev/null` (shared) | 3 insertions and 2 deletions: the Revision header (1.274 to 1.276), the Change History cell (the 1.276 and 1.275 entries in front of the 1.274 one) and one added row, CCR-QD-460, at line 397; no existing row is removed or edited, so CCR-QD-453's row (line 390) and every row the report cites are unchanged; `spec-revise` exit 0, `spec-revise: every Revision matches its newest Change History entry` | PASS |
| What the code-review fixes changed since the previous section | `git diff -U0 5000af5d HEAD -- spec/README.md` | 3 hunks, at lines 8 (Revision 1.275 to 1.276), 13 (Change History: a 1.276 entry in front) and 397 (the CCR-QD-460 row rewritten); no other line differs | PASS |
| Traceability | `bash spec/scripts/verify-traceability.sh --strict < /dev/null` (shared) | exit 0; `PASS: 21   FAIL: 0   SKIP: 0 (strict: skips count as failures)` | PASS |

### Changed cited files read against the truths that cite them (Re-verification (2026-11-22, after the 68.1 code-review fixes))

- `spec/README.md` (`79a685b4`): the report cites it for the CCR-QD-453 registration (line 390), which Truth 3 and the artifacts table rely on. The row is where it was and unedited. The commit moves the revision to 1.276, adds a Change History entry and rewrites the CCR-QD-460 row to scope two of its claims (the odd round count to Phase 68's bench, the hang evidence to a blocked parser call in the child); nothing a truth of this report reads. Every truth holds as worded.

**Verdict:** passed

## Re-verification (2026-11-22, after the fourth review pass and the milestone archive)

**Staleness:** `62: stale, verification a8eab6c9, 34 cited, 1 changed since` (`68.1-stale.mjs`, run at `b1da4dc5`).

| Cited file | Changed since `a8eab6c9` by |
| --- | --- |
| `spec/README.md` | `b45e798a` fix(68.1): gate 14 kills the TypeScript server a killed child started<br>`0b01b83a` docs(68.1): AR-68.1-01 re-measured and narrowed |

**Trailers on this phase's commits:** 35 `Claude Sonnet 5.5 <noreply@anthropic.com>`, 13 none, 5 `Claude Opus 5.5 <noreply@anthropic.com>`.

**Validation record:** `62-VALIDATION.md` has status `validated` and nyquist_compliant `true`.

**Digest:** `covered_digest: "v4:sha256:7fc32fe9c4b36f13e5ed0b72e2efa0507cf37affc4c5e44c7225993e591a2aff"` becomes `covered_digest: "v4:sha256:17e126a300b5d721d53d517204d6927a5338f4ffb49782558a0b8907cd67c2f6"`, over the same 23 covered files, 16 of them declared at the place the milestone archive moved them to.

**Gate:** `pnpm check:pr` exited 0 at `b1da4dc5` (17 of 18 steps, mutation skipped as on every non-release PR): 242 + 34 + 7 vitest files (5985 + 568 + 43 tests), gate 14 packed and authorized 9 packages (524 runtime exports) and left no TypeScript server running. The changes since the last re-verification touch no `packages/*/src` file.
