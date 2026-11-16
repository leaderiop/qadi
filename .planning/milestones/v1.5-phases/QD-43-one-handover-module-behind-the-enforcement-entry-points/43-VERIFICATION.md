---
phase: QD-43-one-handover-module-behind-the-enforcement-entry-points
verified: 2026-11-16T20:10:00Z
status: passed
score: 5/5 must-haves verified
covered_files:
  - ".planning/phases/QD-43-one-handover-module-behind-the-enforcement-entry-points/43-01-PLAN.md"
  - ".planning/phases/QD-43-one-handover-module-behind-the-enforcement-entry-points/43-01-SUMMARY.md"
  - ".planning/phases/QD-43-one-handover-module-behind-the-enforcement-entry-points/43-02-PLAN.md"
  - ".planning/phases/QD-43-one-handover-module-behind-the-enforcement-entry-points/43-02-SUMMARY.md"
  - ".planning/phases/QD-43-one-handover-module-behind-the-enforcement-entry-points/43-03-PLAN.md"
  - ".planning/phases/QD-43-one-handover-module-behind-the-enforcement-entry-points/43-03-SUMMARY.md"
  - ".planning/phases/QD-43-one-handover-module-behind-the-enforcement-entry-points/43-04-PLAN.md"
  - ".planning/phases/QD-43-one-handover-module-behind-the-enforcement-entry-points/43-04-SUMMARY.md"
  - ".planning/phases/QD-43-one-handover-module-behind-the-enforcement-entry-points/43-05-PLAN.md"
  - ".planning/phases/QD-43-one-handover-module-behind-the-enforcement-entry-points/43-05-SUMMARY.md"
  - ".planning/phases/QD-43-one-handover-module-behind-the-enforcement-entry-points/43-06-PLAN.md"
  - ".planning/phases/QD-43-one-handover-module-behind-the-enforcement-entry-points/43-06-SUMMARY.md"
  - ".planning/phases/QD-43-one-handover-module-behind-the-enforcement-entry-points/43-07-PLAN.md"
  - ".planning/phases/QD-43-one-handover-module-behind-the-enforcement-entry-points/43-07-SUMMARY.md"
  - ".planning/phases/QD-43-one-handover-module-behind-the-enforcement-entry-points/43-08-PLAN.md"
  - ".planning/phases/QD-43-one-handover-module-behind-the-enforcement-entry-points/43-08-SUMMARY.md"
  - "packages/core/src/Handover.ts"
  - "packages/core/src/Qadi.ts"
  - "packages/core/test/Handover.test.ts"
  - "packages/core/test/Qadi.test.ts"
  - "packages/core/test/Qadi.tst.ts"
  - "packages/promise/src/index.ts"
  - "packages/promise/test/Facade.tst.ts"
covered_digest: "v4:sha256:25bfca74c5336fdb4a8d07302e7e4640b542006f2b394a8dd5819f278dec2e9d"
behavior_unverified: 0
overrides_applied: 0
re_verification:
  previous_status: passed
  previous_score: 5/5
  gaps_closed: []
  gaps_remaining: []
  regressions: []
---

# Phase 43: One handover module behind the enforcement entry points Verification Report

**Phase Goal:** The rule "the resource decided on is the value handed over" (INV-QD-108, ADR-QD-104) is written once in a package-private module behind the ten enforcement entry points, so `guard` and the four `filter*` entry points can no longer accept a `resource` option and silently drop it.
**Verified:** 2026-11-16 (re-verification at HEAD `6db92426`)
**Status:** passed
**Re-verification:** Yes. The 2026-11-15 verdict (passed, 5/5) went stale because three covered files moved after it: `Handover.ts`, `Qadi.ts`, `Handover.test.ts`.

## Re-verification at 6db92426: what moved and why

Four milestone-audit commits closed the four Info review findings (IN-01..IN-04) from `43-REVIEW.md`. I read the full `87e727ab..HEAD` diff of the three files rather than the commit subjects.

| Commit | Finding | Actual change | Effect on goal / must-haves |
|--------|---------|---------------|-----------------------------|
| `7e65d8cf` | IN-01 | `Handover.ts`: `Admitted`/`Refused`/`Verdict`/`isAdmitted` renamed `Released`/`Barred`/`HandoverVerdict`/`isReleased`; tags `"Admitted"`/`"Refused"` become `"Released"`/`"Barred"`. `Qadi.ts` import and the one `isAdmitted` call site follow. Test asserts `"Barred"`. | Pure rename. The single `isAllowed(decision) ? discharge : deny` branch in `verdictOf` is unchanged; no logic moved. Still package-private (not in the barrel). No stale `isAdmitted` or `_tag: "Admitted"` remains in `packages/*/src`, `packages/*/test`, `features` or `examples`. ADR-QD-156 (v1.2) names `HandoverVerdict`, `Released`, `Barred`. |
| `b273bdef` | IN-03 | `resourceFree` doc comment only: says `assert` and `enforce` keep `options.resource` by design. | Doc only. Matches the code (`assert`/`enforce` do not call `resourceFree`). |
| `349aedd4` | IN-02 | `Handover.test.ts` header comment only. | Comment only. |
| `facd29d4` | IN-04 | Ordering test: `it.live` + `Effect.sleep("30 millis")` becomes `it.effect` + a `Deferred` (item `a` awaits it; every other item completes it). `Qadi.ts` `guard` arrow body re-indented. | Test is now deterministic and still discriminating: `a`'s discharge cannot finish until a later item has, so completion-order assembly would reverse the output. `guard` change is whitespace only (`=> {` on the signature line); `decidedOn(options, resource)` unchanged. |

No change to `packages/promise/src/index.ts`, `Qadi.test.ts`, `Qadi.tst.ts` or `Facade.tst.ts` since the prior verification. The other ~120 files in `87e727ab..HEAD` belong to phases 44 to 52; none touches the handover module or its ten adapters beyond the four commits above.

## Goal Achievement

### Observable Truths (ROADMAP success criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | A tstyche test committed on the base shows `guard` and each `filter*` accepting `{ resource }` (RED); after the phase each is a compile error | VERIFIED | RED commit `375ecb3e` precedes every source change (unchanged from the prior verification). Re-run at HEAD: `npx tstyche packages/core/test/Qadi.tst.ts packages/promise/test/Facade.tst.ts` gives 12 tests, 49 assertions, all passed. `HandoverOptions = Omit<EnforceOptions,"resource"> & { resource?: never }` (`Handover.ts`) is the option type of `guard` and the four `filter*`. |
| 2 | One package-private module owns ask, discharge on allow, release; the ten entry points are adapters by shape; the allow/discharge/deny branch and `project(decision, value)` each appear once | VERIFIED | `Handover.ts`: `verdictOf` holds the only `isAllowed(decision) ? discharge : Barred` branch; `RELEASE.Projected` is the only `project(` call. `Qadi.ts` has no `project(`, no `switch`, and no `permitted`/`decideOne`; its only `isAllowed` is the report-only `check` (`Qadi.ts:87`). Adapters `admittedOrDenied` (effect shapes) and `handOver` (collections) both reach `verdictOf`. `Handover.ts` is not exported from `packages/core/src/index.ts`. |
| 3 | A runtime test over all ten entry points shows the released value is the decided value; for `filter*` each released item is the item decided | VERIFIED | `npx vitest run --project core packages/core/test/Handover.test.ts packages/core/test/Qadi.test.ts`: 2 files, 112 tests passed at HEAD, including the Deferred-based ordering test and the smuggled-resource suite. |
| 4 | Behaviour otherwise unchanged, pinned on the base: discharge before the guarded work (ADR-011), `filter` partitions (JA-04), obligation discharge before handover (ADR-019), array and stream forms agree | VERIFIED | The characterisation suite passes unchanged at HEAD. The four commits since the prior verification change names, comments and one test's synchronisation only. `discharge` and its `qadi.discharge` span are verbatim. |
| 5 | No call site passes `resource` to `guard`/`filter*`; fences green; INV-QD-108 restated; Breaking change in changesets and `upgrading.md` | VERIFIED | Unchanged since the prior verification, whose artifacts are not among the moved files. `node scripts/check-api-surface.mjs` at HEAD: 935 exports documented. `node scripts/check-house-style.mjs`: 542 files clean, 3 declared switches. |

**Score:** 5/5 truths verified (0 behavior-unverified).

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `packages/core/src/Handover.ts` | `verdictOf`, `handOver`, `RELEASE`, `HandoverOptions`, `discharge`, `HandoverVerdict` | VERIFIED | Substantive and imported by `Qadi.ts` (`RELEASE, decidedOn, handOver, isReleased, resourceFree, verdictOf`). Not in the barrel. |
| `packages/core/src/Qadi.ts` | ten adapters | VERIFIED | Wired through `admittedOrDenied` and `handOver`. |
| `packages/core/test/Qadi.tst.ts`, `packages/promise/test/Facade.tst.ts` | RED negatives with controls | VERIFIED | Pass at HEAD. |
| `packages/core/test/Handover.test.ts` | table characterisation | VERIFIED | Passes at HEAD. |
| `packages/promise/src/index.ts` | `filter`/`filterProjected`/`projected` refuse `resource` | VERIFIED | Unchanged since the prior verification. |
| ADR-QD-156 (now v1.2), BEH-QD-551/552, INV-QD-331, CCR-QD-434, overview | records | VERIFIED | ADR-QD-156 was updated in step with the rename. |

### Key Link Verification

| From | To | Via | Status |
|------|----|-----|--------|
| `Qadi.ts` effect shapes | `Handover.ts` `verdictOf` | `admittedOrDenied`, narrowing on `isReleased` | WIRED |
| `Qadi.ts` collections | `Handover.ts` `handOver` | adapters for `filter`, `filterStream`, `filterProjected`, `filterStreamProjected` | WIRED |
| `guard` | decided-on resource | `decidedOn(options, resource)` | WIRED |
| `enforceProjected` | no resource | `resourceFree(options)` | WIRED |
| release | `project` | `RELEASE.Whole` / `RELEASE.Projected` | WIRED |

### Requirements Coverage

| Requirement | Source Plan(s) | Status | Evidence |
|-------------|----------------|--------|----------|
| HAND-01 | 43-03, 43-04 | SATISFIED | truth 2 |
| HAND-02 | 43-01, 43-03, 43-04 | SATISFIED | truth 1 |
| HAND-03 | 43-02, 43-03, 43-04 | SATISFIED | truths 2, 3 |
| HAND-04 | 43-02, 43-03, 43-04 | SATISFIED | truth 4 |
| HAND-05 | 43-03, 43-04, 43-05 | SATISFIED | truth 5 |
| HAND-06 | 43-06, 43-07 | SATISFIED | ADR-QD-156 + INV-QD-108 restated |
| WX-01 | 43-08 | SATISFIED | `pnpm check:pr` exited 0 at `f18a93e1`, the commit that made the last source change; only `.planning` files changed since (per the brief). Not re-run here. |
| WX-02 | 43-01, 43-06, 43-07 | SATISFIED | CCR-QD-434, ADR-QD-156, BEH-QD-551/552, INV-QD-331 |
| WX-03 | 43-03, 43-04, 43-07, 43-08 | SATISFIED | `check-api-surface.mjs`: 935 documented at HEAD |
| WX-04 | 43-03, 43-04, 43-08 | SATISFIED | `check-house-style.mjs`: 542 files clean; no `switch` in `Qadi.ts`; the rename adds none of the forbidden constructs |
| WX-05 | 43-01, 43-08 | SATISFIED | Mutation not re-run (the brief forbids Stryker). The renames do not change reachable behaviour. The committed `43-mutation-after.json` figures (1.0/1.0) are from before them. |
| WX-06 | 43-01, 43-02 | SATISFIED | RED and characterisation commits precede the first refactor (unchanged) |
| WX-07 | 43-05 | SATISFIED | Unchanged since the prior verification |

All 13 IDs declared across the 8 plans match the 13 IDs mapped to Phase 43 in REQUIREMENTS.md (all checked `[x]`). No orphaned requirements.

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Type refusals + controls | `npx tstyche packages/core/test/Qadi.tst.ts packages/promise/test/Facade.tst.ts` | 12 tests, 49 assertions passed | PASS |
| Handover and Qadi runtime suites | `npx vitest run --project core packages/core/test/Handover.test.ts packages/core/test/Qadi.test.ts` | 112 passed | PASS |
| Export documentation gate | `node scripts/check-api-surface.mjs` | 935 documented | PASS |
| House style / budgets | `node scripts/check-house-style.mjs` | 542 files clean | PASS |
| No stale pre-rename names | `grep isAdmitted` and `_tag: "Admitted"` over `packages/*/{src,test}`, `features`, `examples` | 0 hits | PASS |

### Probe Execution

No probes declared. Step 7c skipped.

### Anti-Patterns Found

None. No TBD/FIXME/XXX in the changed source. The four Info items open at the prior verification (IN-01..IN-04) are now `fixed` in `43-REVIEW-DISPOSITION.md`, and I confirmed each against the diff.

### Human Verification Required

None.

### Gaps Summary

No gaps. The rule is still written once in `Handover.ts`, and `guard` and the four `filter*` entry points (and the promise facade's equivalents) still refuse a `resource` at the type level. The four commits since the prior verification renamed the verdict types, fixed two comments, made one ordering test deterministic and re-indented one arrow body, with no behaviour change.

Not re-executed here: mutation testing and the full `check:pr` (recorded green at `f18a93e1`).

---

_Verified: 2026-11-16_
_Verifier: Claude (gsd-verifier)_
