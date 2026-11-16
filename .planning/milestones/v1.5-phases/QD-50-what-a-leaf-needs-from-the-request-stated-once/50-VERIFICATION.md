---
phase: QD-50-what-a-leaf-needs-from-the-request-stated-once
verified: 2026-11-16T15:30:00Z
status: passed
score: 5/5 must-haves verified
covered_files:
  - .changeset/leaf-needs-stated-once.md
  - .planning/phases/QD-50-what-a-leaf-needs-from-the-request-stated-once/50-01-PLAN.md
  - .planning/phases/QD-50-what-a-leaf-needs-from-the-request-stated-once/50-01-SUMMARY.md
  - .planning/phases/QD-50-what-a-leaf-needs-from-the-request-stated-once/50-02-PLAN.md
  - .planning/phases/QD-50-what-a-leaf-needs-from-the-request-stated-once/50-02-SUMMARY.md
  - .planning/phases/QD-50-what-a-leaf-needs-from-the-request-stated-once/50-03-PLAN.md
  - .planning/phases/QD-50-what-a-leaf-needs-from-the-request-stated-once/50-03-SUMMARY.md
  - .planning/phases/QD-50-what-a-leaf-needs-from-the-request-stated-once/50-04-PLAN.md
  - .planning/phases/QD-50-what-a-leaf-needs-from-the-request-stated-once/50-04-SUMMARY.md
  - .planning/phases/QD-50-what-a-leaf-needs-from-the-request-stated-once/50-05-PLAN.md
  - .planning/phases/QD-50-what-a-leaf-needs-from-the-request-stated-once/50-05-SUMMARY.md
  - .planning/phases/QD-50-what-a-leaf-needs-from-the-request-stated-once/50-06-PLAN.md
  - .planning/phases/QD-50-what-a-leaf-needs-from-the-request-stated-once/50-06-SUMMARY.md
  - .planning/phases/QD-50-what-a-leaf-needs-from-the-request-stated-once/50-07-PLAN.md
  - .planning/phases/QD-50-what-a-leaf-needs-from-the-request-stated-once/50-07-SUMMARY.md
  - .planning/phases/QD-50-what-a-leaf-needs-from-the-request-stated-once/50-08-PLAN.md
  - .planning/phases/QD-50-what-a-leaf-needs-from-the-request-stated-once/50-08-SUMMARY.md
  - packages/core/bench/Evaluate.bench.ts
  - packages/core/src/LeafNeeds.ts
  - packages/core/src/PortAccess.ts
  - packages/core/src/Predicate.ts
  - packages/core/src/Walk.ts
  - packages/core/test/LeafMatrix.test.ts
  - packages/core/test/LeafNeeds.test.ts
  - packages/core/test/LeafNeeds.tst.ts
  - spec/decisions/163-what-a-leaf-needs-from-the-request-is-stated-once.md
covered_digest: "v4:sha256:e0984ac63d35d5e5dc83cd2dcb465d8d5f546df5067f455c00c1c1be613a3a0b"
behavior_unverified: 0
overrides_applied: 0
---

# Phase 50: What a leaf needs from the request, stated once — Verification Report

**Phase Goal:** The rule that a leaf which reads the action or the resource fails when the request has none (INV-QD-011), together with the order in which absences are checked, is either stated once in one table that `Walk` and `Predicate` both read, or the phase ends with a measured rejection recorded in ADR-QD-163.
**Verified:** 2026-11-16
**Status:** passed
**Re-verification:** No, initial verification

## Goal Achievement

The phase took the "pursue" branch, so the success criteria that apply are SC1 plus SC2 to SC5 (the "if pursued" ones). The pursue verdict was checked against the committed bench evidence, not 50-BENCH.md's prose.

### Observable Truths

| # | Truth (ROADMAP SC) | Status | Evidence |
|---|---|---|---|
| 1 | SC1: bench numbers for the prototype against the base, per workload, with the noise band, are in ADR-QD-163, and the outcome follows from them | VERIFIED | `bench/gate/analysis.txt` footer: slower 0, geomean +2.75%, worst +8.7% (`rules FirstApplicable — 8, last applies`); every row `ok` against max(10%, base spread). ADR-QD-163 lines 121-134 state the rule (D-03a) and the same numbers; 50-BENCH.md `verdict: pursue`. The rule is applied as locked: slower only when delta is strictly above the band. |
| 2 | SC2: one package-private module states per leaf which inputs it needs, which error each absence becomes, one check order; `Walk` and `Predicate` both read it; per-leaf copies of the checks are gone from added code | VERIFIED | `packages/core/src/LeafNeeds.ts` holds `LEAF_NEEDS` (one row per leaf: `own`, `matcher`, `resourceId`), `absenceOf` (own input, then matcher references, action before resource), `errorOf` (absence to `MissingAction`/`MissingResource`/`MissingResourceId`). Not in the barrel. `Walk.ts` (lines 329, 341, 366) and `Predicate.ts` (lines 400, 415, 421) call `absenceOf`/`errorOf`; `PortAccess.ts:290` builds `MissingResourceId` through `errorOf`. `/usr/bin/grep` finds no `referencesAction` in Walk/Predicate/PortAccess. The one `referencesResource` left in `Predicate.ts:409` decides a column refusal for `HasAttribute` (a different question, commented), not an absence. Diff `5ab8d0c0..HEAD` of the three consumers shows the inline `action === undefined && referencesAction(...)` and `resource === undefined` checks removed. |
| 3 | SC3: the check-order difference is preserved or changed deliberately, pinned RED first over a request missing both inputs per leaf kind, with a behaviour row | VERIFIED | `LeafMatrix.test.ts` was committed on the base (f6322ff9, plan 50-02) before any source change and covers every leaf with a missing-both case ("reports the leaf's own input first"). D-08a RED test f071cea9 precedes its fix ca165d48. BEH-QD-586 and 587 (`spec/behaviors/10-actions.md`), INV-QD-346 state the decision. The decision is to preserve behaviour and state it once; the review (WR-03) corrected the `HasAttribute` wording. |
| 4 | SC4: `HasRole`/`HasPermission` judged once and used by both interpreters; an exhaustive table test over every leaf tag pins INV-QD-011 | VERIFIED | `holdsRole`, `holdsPermission`, `holdsAction` exported from `LeafNeeds.ts` and used in `Walk.ts:316,323,369` and `Predicate.ts:395,397,403`. `LeafNeeds.test.ts` and `LeafMatrix.test.ts` ("has fixtures for exactly the leaf tags") run an exhaustive per-tag table; both pass (343 tests across four files). `LeafNeeds.tst.ts`: 6 tstyche tests pass, showing a row that disagrees with its tag, or a leaf with no classification, does not compile. |
| 5 | SC5: `SWITCH_BUDGET` and `UNTRACED_BUDGET` unchanged, AGENTS.md agrees, and the bench after the change shows no workload beyond noise | VERIFIED | `git diff 5ab8d0c0..HEAD -- scripts AGENTS.md` is empty. `check-house-style.mjs`: "536 file(s) clean (3 declared switch(es))". `LeafNeeds.ts` has no `switch`, `fnUntraced`, `as` assertion (only `as const satisfies`), `!` or `any`. `bench/after/analysis.txt`: slower 0 of 35, geomean +1.87%, worst +9.3% on `anyOf First — 8, last allows` against a 10% band. |

**Score:** 5/5 truths verified (0 present but behavior-unverified)

### Post-measurement drift check (the orchestrator's request)

`git diff 9bf0dbfa..HEAD -- packages/core/src packages/core/bench` touches two files only:

- `packages/core/src/LeafNeeds.ts`: every added non-comment line is a type (`ReadsAction`, `OwnOf`, `ResourceIdOf`, `Disjoint`, `ListsDisjoint`, `LeafNeedOfVariant`, `LeafNeedOf`) and the `satisfies` clause on `LEAF_NEEDS`. The `LEAF_NEEDS` value literal, `absenceOf`, `errorOf` and the `holds*` functions are unchanged. All of it erases at compile time.
- `packages/core/bench/Evaluate.bench.ts`: a comment only.

No executed line on the measured path changed after the 50-06 after-run. `Walk.ts`, `Predicate.ts` and `PortAccess.ts` have no diff since 9bf0dbfa. The committed after-run therefore describes the shipped runtime. The fixers' claim of an unchanged `LEAF_NEEDS` value holds. Their "LeafNeeds.ts Stryker 98.11% after each iteration" is not committed evidence, so it is not relied on. The committed 98.11% in `50-mutation-after.json` was taken at 9bf0dbfa, and the later diff adds no runtime code.

### Required Artifacts

| Artifact | Expected | Status | Details |
|---|---|---|---|
| `packages/core/src/LeafNeeds.ts` | the table, `absenceOf`, `errorOf`, shared judgements | VERIFIED | 272 lines, substantive, wired from three modules |
| `packages/core/test/LeafMatrix.test.ts` | base characterisation per leaf | VERIFIED | committed before the table (f6322ff9) |
| `packages/core/test/LeafNeeds.test.ts` | exhaustive table test | VERIFIED | passes |
| `packages/core/test/LeafNeeds.tst.ts` | type-level pin | VERIFIED | 6/6 pass |
| `spec/decisions/163-...md` | ADR with both measurements | VERIFIED | both runs and the band rule |
| `.changeset/leaf-needs-stated-once.md` | `@qadi/core` patch | VERIFIED | patch, wire-invisible `expected` change stated |
| `50-mutation-base.json`, `50-mutation-after.json` | per-file Stryker base and close | VERIFIED | see WX-05 |

### Key Link Verification

| From | To | Via | Status |
|---|---|---|---|
| `Walk.ts` leaf arms | `LeafNeeds.ts` | `absenceOf`, `errorOf`, `holds*`; `Evaluation.supplied` built in `walk` | WIRED |
| `Predicate.ts` plan | `LeafNeeds.ts` | `absenceOf`, `NeedAction.absence`, `errorOf(p.absence)` at run | WIRED |
| `PortAccess.ts` `readScoped` | `LeafNeeds.ts` | `errorOf({_tag:"ResourceId"})` | WIRED |

### Requirements Coverage

Every ID in the phase's PLAN frontmatter is in REQUIREMENTS.md, and no ID mapped to Phase 50 is unclaimed (no orphans).

| Requirement | Source plans | Status | Evidence |
|---|---|---|---|
| LEAF-01 | 50-02, 50-03, 50-06, 50-07 | SATISFIED | bench gate and after-run, ADR-QD-163 numbers |
| LEAF-02 | 50-04, 50-05 | SATISFIED | SC2 above |
| LEAF-03 | 50-04, 50-05, 50-07 | SATISFIED | SC3 above |
| LEAF-04 | 50-04, 50-05 | SATISFIED | SC4 above |
| LEAF-05 | 50-02, 50-04, 50-06, 50-08 | SATISFIED | SC4/SC5; house-style gate green. Early ticks by 50-02 were reopened (4b5098bf) and ticked again by 50-08 after the evidence existed. |
| WX-01 | 50-03, 50-08 | SATISFIED (reported) | orchestrator's `pnpm check:pr < /dev/null` exit 0 at 0df5bf74 was not re-run here; the cheap gates (house-style, api-surface, core vitest, tstyche) were re-run and pass |
| WX-02 | 50-01, 50-03, 50-07, 50-08 | SATISFIED | ADR-QD-163, CCR-QD-441 (`spec/README.md`), BEH-QD-586..590, INV-QD-345..346 and traceability rows present; reserved numbers only |
| WX-03 | 50-07, 50-08 | SATISFIED | `spec/overview.md` names `LeafNeeds.ts`; `check-api-surface.mjs`: 932 exports documented |
| WX-04 | 50-04, 50-05, 50-08 | SATISFIED | no new `as`/`!`/`any`/`switch`/`fnUntraced`/async/ambient constructs in the added source; budgets and AGENTS.md untouched |
| WX-05 | 50-01, 50-06 | SATISFIED | `PortAccess.ts` 100%, `Predicate.ts` 100% (unchanged); `Walk.ts` 95.05% to 94.81% with the same 13 survivors (D-13: a pass because survivors are identical, recorded, not re-baselined); `LeafNeeds.ts` new at 98.11%, one argued-equivalent survivor. Dispositions are reasoned, not silent. |
| WX-06 | 50-02, 50-04, 50-05 | SATISFIED | commit order: characterisation (f6322ff9) and RED tests (64927340, f071cea9) precede the changes |
| WX-07 | 50-03, 50-07, 50-08 | SATISFIED | patch changeset; the only behaviour change (`expected` key) is wire-invisible, so no Breaking entry is owed; nothing staged, no release artifacts changed |

### Anti-Patterns Found

None blocking. No debt markers in the changed source. `isActionLeaf` is the one surviving Stryker mutant in `LeafNeeds.ts`, argued equivalent in the record.

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|---|---|---|---|
| Leaf table, matrix, Predicate and Evaluate suites | `npx vitest run --project core` on LeafNeeds, LeafMatrix, Predicate, Evaluate tests | 4 files, 343 tests passed | PASS |
| Type-level pin | `npx tstyche packages/core/test/LeafNeeds.tst.ts` | 6/6 tests, 24 assertions passed | PASS |
| House style and budgets | `node scripts/check-house-style.mjs` | 536 files clean, 3 declared switches | PASS |
| API surface | `node scripts/check-api-surface.mjs` | 932 exports documented | PASS |

### Human Verification Required

None. No truth asserts an unexercised runtime transition. The behavioural truths (absence errors and their order) have committed passing tests.

### Notes for the owner (non-blocking)

- **The cost is real but inside the pre-agreed band.** The after-run shows a positive delta on most of the 35 workloads (geomean +1.87%, p50 deltas mostly +2 to +7%), and the worst case, `anyOf First — 8, last allows`, is +9.3% against a 10% band, 0.7 points from a rejection. The roadmap rule ("beyond run-to-run noise") was applied through D-03a's locked statistic, so this passes by the rule, and ADR-QD-163 says outright that the cost is "measured, not free". A rerun on a noisier host could flip that workload. If the owner wants a tighter threshold, that is a decision for a later phase, not a gap here.
- **The leaf-heavy workloads measure the table read, not the reference walk.** Both supply every input, so `absenceOf` never asks a matcher what it references. The review (IN-04) found the workload comments claimed otherwise; the comment and ADR were corrected. The error path is covered by correctness tests, not by the bench.

### Gaps Summary

None. The phase took the pursue branch on measured evidence; the table exists, is read by `Walk`, `Predicate` and `readScoped`, its check order is pinned by tests written on the base, and the budgets are unchanged. The post-measurement review fixes are type-level, comment and spec wording only.

---

_Verified: 2026-11-16_
_Verifier: Claude (gsd-verifier)_
