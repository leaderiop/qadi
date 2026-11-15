---
phase: QD-43-one-handover-module-behind-the-enforcement-entry-points
verified: 2026-11-15T03:40:00Z
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
covered_digest: "v4:sha256:f29e7c07bb92f4da70d30ee10c7f2cbad471c4d812009a48a8f9b9871c15f2c5"
behavior_unverified: 0
overrides_applied: 0
---

# Phase 43: One handover module behind the enforcement entry points Verification Report

**Phase Goal:** The rule "the resource decided on is the value handed over" (INV-QD-108, ADR-QD-104) is written once in a package-private module behind the ten enforcement entry points, so `guard` and the four `filter*` entry points can no longer accept a `resource` option and silently drop it.
**Verified:** 2026-11-15
**Status:** passed
**Re-verification:** No, initial verification

## Goal Achievement

### Observable Truths (ROADMAP success criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | A tstyche test committed on the base shows `guard` and each `filter*` accepting `{ resource }` (RED); after the phase each is a compile error | VERIFIED | RED commit `375ecb3e` precedes every source change (43-01 SUMMARY records `Assertions: 2 failed` for guard, `4 failed` for the four `filter*`, `2 failed` for the facade, with controls passing). Today `npx tstyche packages/core/test/Qadi.tst.ts packages/promise/test/Facade.tst.ts` passes (12 tests, 49 assertions). `HandoverOptions` is `Omit<EnforceOptions,"resource"> & { resource?: never }` (`Handover.ts:~100`) and is the options type of `guard`, `filter`, `filterStream`, `filterProjected`, `filterStreamProjected` in `Qadi.ts`. |
| 2 | One package-private module owns ask, discharge on allow, release; the ten entry points are adapters by shape; the allow/discharge/deny branch and `project(decision, value)` each appear once | VERIFIED | `packages/core/src/Handover.ts` (282 lines, not in any barrel; gate 13 and house-style are clean). `verdictOf` holds the single `isAllowed(decision) ? discharge : Refused` branch. `RELEASE` is the only `project(` call in core added code (`Handover.ts`); `Qadi.ts` has no `project(`. `permitted` and `decideOne` are gone (grep: 0 hits). `Qadi.ts` adapters: `admittedOrDenied` (effect shapes: `assert`, `enforce`, `enforceProjected`, `enforceLoaded`, `enforceProjectedLoaded`, `guard`) and `handOver` (array/stream `filter`, `filterStream`, `filterProjected`, `filterStreamProjected`). `Qadi.ts`'s only remaining `isAllowed` is the report-only `check`. `discharge` and its `qadi.discharge` span moved unchanged. |
| 3 | A runtime test over all ten entry points shows the released value is the decided value; for `filter*` each released item is the item decided | VERIFIED | `packages/core/test/Handover.test.ts` (585 lines, written on the base in `ef3ed80e`/`718c1f22`, extended in `c0e6f9b5`) uses recording sinks per entry point and per-item projection. `npx vitest run --project core Handover.test.ts Qadi.test.ts` passes (112 tests). `enforceProjected`'s smuggled-resource RED was written on the base and went green via `resourceFree`. |
| 4 | Behaviour otherwise unchanged, pinned on the base: discharge before the guarded work (ADR-011), `filter` partitions (JA-04), obligation discharge before handover (ADR-019), array and stream forms agree | VERIFIED | Characterisation committed before the module (`ef3ed80e`, `718c1f22`, plan 43-02) and still green after. Only existing-test edits in `Qadi.test.ts`: the guard "overrides" test now feeds an untyped `JSON.parse` option (same assertion, same outcome) plus an added `filterStreamProjected` concurrency suite. Span names (`qadi.evaluate`, `qadi.discharge`) unchanged; `Effect.fn("qadi.discharge")` kept verbatim. |
| 5 | No call site passes `resource` to `guard`/`filter*`; fences green; INV-QD-108 restated; Breaking change in changesets and `upgrading.md` | VERIFIED | Scoped grep over `packages/*/src`, `examples`, `features`, website content, `spec/behaviors` finds `{ resource` on `filter` only in the two non-compiled `ts` "Before" blocks of `upgrading.md` (`:676`, `:698`). `spec:website-examples`, `spec:examples` ran green in the orchestrator's `check:pr`. INV-QD-108 restated (`spec/invariants.md:3344`) naming `Handover.ts`; INV-QD-032 restated; INV-QD-331 new. `.changeset/core-handover-options.md` and `.changeset/promise-filter-refuses-resource.md` both say **Breaking**; `upgrading.md` has `## 0.13: guard and the filter entry points refuse a second resource`. |

**Score:** 5/5 truths verified (0 behavior-unverified).

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `packages/core/src/Handover.ts` | module with `verdictOf`, `handOver`, `RELEASE`, `HandoverOptions`, `discharge` | VERIFIED | Substantive, imported by `Qadi.ts` (`:32`), not exported from the barrel |
| `packages/core/src/Qadi.ts` | ten adapters | VERIFIED | 391-line net reduction; re-exports `EnforceOptions`, `HandoverOptions`, `ObligationDischarge`, `ObligationHandler` so the public surface holds |
| `packages/core/test/Qadi.tst.ts`, `packages/promise/test/Facade.tst.ts` | RED negatives with controls | VERIFIED | Pass today; failed on the base per 43-01 SUMMARY |
| `packages/core/test/Handover.test.ts` | table characterisation | VERIFIED | Passes |
| `packages/promise/src/index.ts` | `filter`/`filterProjected`/`projected` refuse `resource` | VERIFIED | `HandoverFacadeOptions` (WR-01 fix); `check`/`decide`/`assert` keep `FacadeOptions`; facade bodies stay forwarders |
| ADR-QD-156, BEH-QD-551/552, INV-QD-331, CCR-QD-434, traceability, `index.yaml`, overview | records | VERIFIED | Present; only reserved numbers used (BEH-QD-553..555 and INV-QD-332 left unused, no `NEXT` placeholders) |

### Key Link Verification

| From | To | Via | Status |
|------|----|-----|--------|
| `Qadi.ts` effect shapes | `Handover.ts` `verdictOf` | `admittedOrDenied` (`Qadi.ts:~55`) | WIRED |
| `Qadi.ts` collections | `Handover.ts` `handOver` | `Qadi.ts:338,373,401,432` | WIRED |
| `guard` | decided-on resource | `decidedOn(options, resource)` (`Qadi.ts:278`) | WIRED |
| `enforceProjected` | no resource | `resourceFree(options)` (`Qadi.ts:155`) | WIRED |
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
| WX-01 | 43-08 | SATISFIED | orchestrator's `pnpm check:pr < /dev/null` ran 16 of 17 steps (mutation skipped by design), exit 0 at the fix commit; log at checkpr43b.log ends `publish-status ... agree` |
| WX-02 | 43-01, 43-06, 43-07 | SATISFIED | CCR-QD-434 row, ADR-QD-156, BEH-QD-551/552, INV-QD-331; no unreserved numbers |
| WX-03 | 43-03, 43-04, 43-07, 43-08 | SATISFIED | `node scripts/check-api-surface.mjs`: 927 exports documented; `LoadedEnforceOptions` appears in `spec/overview.md` only inside change-history prose |
| WX-04 | 43-03, 43-04, 43-08 | SATISFIED | added-lines scan of `packages/*/src` finds no `switch`, `fnUntraced`, `async`/`await`, `any`, `console`, `Date`; `check-house-style.mjs`: 507 files clean, 3 declared switches (unchanged) |
| WX-05 | 43-01, 43-08 | SATISFIED | mutation: `Qadi.ts` 0.973 on base, 1.0 after; `Handover.ts` 1.0 (moved region was 0.974); no drop. Coverage ran inside `check:pr` |
| WX-06 | 43-01, 43-02 | SATISFIED | RED tstyche commit `375ecb3e` and characterisation `ef3ed80e`/`718c1f22` precede the first refactor `0fd2a9fb` |
| WX-07 | 43-05 | SATISFIED | both changesets marked **Breaking**; `upgrading.md` entries for core and promise; nothing released |

All 13 IDs declared across the 8 plans match the 13 IDs in REQUIREMENTS.md for Phase 43. No orphaned requirements.

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Type refusals + controls | `npx tstyche packages/core/test/Qadi.tst.ts packages/promise/test/Facade.tst.ts` | 12 tests, 49 assertions passed | PASS |
| Handover + Qadi runtime suites | `npx vitest run --project core packages/core/test/Handover.test.ts packages/core/test/Qadi.test.ts` | 112 passed | PASS |
| Export documentation gate | `node scripts/check-api-surface.mjs` | 927 documented | PASS |
| House style / budgets | `node scripts/check-house-style.mjs` | 507 files clean | PASS |
| Cycles | `npx madge --circular packages/*/src` | none | PASS |

### Probe Execution

No probes declared. Step 7c skipped.

### Anti-Patterns Found

No TBD/FIXME/XXX in the changed source. No stubs; the module is fully wired and data flows through real `ask`/`discharge`/`project`.

Open review items (all Info, none a defect, disposition `open` in 43-REVIEW-DISPOSITION.md):

| File | Pattern | Severity | Impact |
|------|---------|----------|--------|
| `packages/core/src/Handover.ts:159-171` | IN-01: `Verdict`/`Admitted` names reused for unrelated core concepts | Info | grep ambiguity only |
| `packages/core/test/Handover.test.ts:3-18` | IN-02: header says public surface only and "green on the base", but last `describe` imports `verdictOf` | Info | stale comment |
| `packages/core/src/Handover.ts:214-221` | IN-03: `resourceFree` doc overstates monopoly | Info | doc wording |
| `Handover.test.ts:431-445`, `Qadi.ts:266-279` | IN-04: wall-clock ordering test; irregular arrow formatting in `guard` | Info | possible vacuous pass on slow runner |

### Human Verification Required

None. Every truth has automated evidence (type tests, runtime tests, gates). No state-transition invariant is left without a test.

### Gaps Summary

No gaps. The rule is written once in `Handover.ts`; `guard` and the four `filter*` entry points (and the promise facade's `filter`/`filterProjected`/`projected`) refuse a `resource` at the type level, with RED tests committed first. Residual: four Info review items remain open by design and do not affect the goal. Mutation run itself was not re-executed by this verifier; the 1.0/1.0 figures come from the committed `43-mutation-after.json`, and the full gate result from the orchestrator's log.

---

_Verified: 2026-11-15_
_Verifier: Claude (gsd-verifier)_
