---
phase: QD-39-each-hydration-drop-reason-stated-once-with-its-kind
verified: 2026-11-14T08:00:00Z
status: passed
score: 6/6 must-haves verified
covered_files:
  - ".planning/phases/QD-39-each-hydration-drop-reason-stated-once-with-its-kind/39-01-PLAN.md"
  - ".planning/phases/QD-39-each-hydration-drop-reason-stated-once-with-its-kind/39-01-SUMMARY.md"
  - ".planning/phases/QD-39-each-hydration-drop-reason-stated-once-with-its-kind/39-02-PLAN.md"
  - ".planning/phases/QD-39-each-hydration-drop-reason-stated-once-with-its-kind/39-02-SUMMARY.md"
  - ".planning/phases/QD-39-each-hydration-drop-reason-stated-once-with-its-kind/39-03-PLAN.md"
  - ".planning/phases/QD-39-each-hydration-drop-reason-stated-once-with-its-kind/39-03-SUMMARY.md"
  - ".planning/phases/QD-39-each-hydration-drop-reason-stated-once-with-its-kind/39-04-PLAN.md"
  - ".planning/phases/QD-39-each-hydration-drop-reason-stated-once-with-its-kind/39-04-SUMMARY.md"
  - ".planning/phases/QD-39-each-hydration-drop-reason-stated-once-with-its-kind/39-05-PLAN.md"
  - ".planning/phases/QD-39-each-hydration-drop-reason-stated-once-with-its-kind/39-05-SUMMARY.md"
  - "packages/core/src/HydrationMetrics.ts"
  - "packages/core/test/HydrationMetrics.test.ts"
  - "packages/core/test/HydrationMetrics.tst.ts"
  - "packages/react/src/HydrationEvent.ts"
  - "packages/react/test/Hydration.tst.ts"
covered_digest: "v4:sha256:e60fe66a461f244c1f1d177e317027f2e8a67674014104648e2c0e1385fc6781"
behavior_unverified: 0
overrides_applied: 0
---

# Phase 39: Each hydration drop reason stated once, with its kind - Verification Report

**Phase Goal:** Each hydration drop reason is stated once in core with its kind (`dehydration`, `payload` or `entry`), so the reason unions, the value list, the meanings and react's payload and entry groups derive from one table, and a new reason without a kind is a compile error.
**Verified:** 2026-11-14
**Status:** passed
**Re-verification:** No, initial verification

## Goal Achievement

### Observable Truths

| #   | Truth | Status | Evidence |
| --- | ----- | ------ | -------- |
| 1 | One keyed table in `HydrationMetrics.ts` states each reason once with its kind and meaning; `MEANINGS` folded in (DROP-01) | VERIFIED | `HYDRATION_DROP_TABLE` (`as const satisfies { [reason: string]: HydrationDropRow }`) has nine rows, each `kind`/`summary`/`remedy`. `grep MEANINGS packages/*/src` returns nothing. |
| 2 | `HydrationDropReason`, `DehydrationDropReason`, `ClientHydrationDropReason`, `hydrationDropReasons`, `isHydrationDropReason` (`Object.hasOwn`), `hydrationDropMeaning` and react's `PayloadRefusalReason` / `EntryDropReason` all derive from the table (DROP-02) | VERIFIED | Read in source: `keyof typeof HYDRATION_DROP_TABLE`; `HydrationDropReasonOf<K>` by kind; list is `Object.keys(table).filter(isHydrationDropReason)`; react's two groups are `HydrationDropReasonOf<"payload">` / `<"entry">` (`HydrationEvent.ts:93,102`). Only readers of meaning (devtools `Hydration.ts`, react `DeveloperSignals.ts`) go through `hydrationDropMeaning`. |
| 3 | A new reason without a kind is a compile error (DROP-02 negative) | VERIFIED | Ran it: a throwaway `Throwaway: { summary, remedy }` row inserted in the table gave `TS2741 Property 'kind' is missing ... required in type 'HydrationDropRow'` under `tsc -p packages/core/tsconfig.src.json`. File restored with `git checkout`; tree clean. tstyche negatives (`@ts-expect-error` for a missing kind and for kind `"other"`) also pass (266/266). |
| 4 | List order is exactly today's interleaved order; written-out nine-word snapshot and independent oracles stay green (DROP-03) | VERIFIED | `HydrationMetrics.test.ts` "nine words in their order" compares the isolated-registry snapshot to a hand-written `NINE` array (commit `d84cc614`, before the refactor `622c24d2`); written-out unions in `.tst.ts` for core and react. Core and react vitest: 33 files, 523 tests pass. |
| 5 | `qadi_hydration_dropped_total` declaration, id, description unchanged; one row reaches metric, panel and reporters (DROP-04) | VERIFIED | Declaration at `HydrationMetrics.ts` keeps the id, description and `preregisteredWords: hydrationDropReasons`; devtools and react read through `hydrationDropReasons`/`hydrationDropMeaning`. Experiment recorded in ADR-QD-152 consequences. |
| 6 | Cross-cutting WX-01..07 hold | VERIFIED | See requirements table. |

**Score:** 6/6 truths verified (0 behavior-unverified; none of the truths is a runtime state-transition invariant).

### D-10 finding judged against the goal

D-10's text says a new payload or entry row is a compile error in react. Verified: only an `entry` row is (`HydrationEngine.ts:517` `bucketOf: Record<EntryDropReason, ...>`, TS2741). A `payload` or `dehydration` row compiles, because react's payload map is keyed by the decoder's refusal tag (`payloadRefusalReason`, lines 229-235). The phase GOAL is still met: (a) "a new reason without a kind is a compile error" is proven by experiment; (b) "react's groups derive from the table" is proven by reading `HydrationEvent.ts`. The D-10 overstatement is recorded in ADR-QD-152 (Consequences, and the rejected alternative "a reason-keyed record in react's payload path") and in the plan summaries, so it is documented, not hidden. Severity: informational, not a gap.

### Required Artifacts

| Artifact | Expected | Status | Details |
| -------- | -------- | ------ | ------- |
| `packages/core/src/HydrationMetrics.ts` | one table, derived types and values | VERIFIED | 9 rows; barrel `export *` carries the two new types |
| `packages/react/src/HydrationEvent.ts` | groups read off the table | VERIFIED | wired; engine `bucketOf` uses `EntryDropReason` |
| `packages/core/test/HydrationMetrics.test.ts`, `.tst.ts`, `packages/react/test/Hydration.tst.ts` | oracles and negatives | VERIFIED | pass |
| `spec/decisions/152-...-with-its-kind.md`, `spec/invariants.md` INV-QD-323, CCR-QD-430 in README/traceability, `spec/overview.md` names `HydrationDropReasonOf` and `HydrationDropRow` | records | VERIFIED | present; api-surface gate: 920 exports documented |
| `.changeset/hydration-drop-reasons-stated-once.md` (core minor), `hydration-drop-groups-derived.md` (react patch) | changesets | VERIFIED | present, correct bumps |
| `39-mutation-base.json`, `39-mutation-after.json` | mutation compare | VERIFIED | both files 1 vs 1 |

### Key Link Verification

| From | To | Via | Status |
| ---- | -- | --- | ------ |
| table | `hydrationDroppedTotal` words | `preregisteredWords: hydrationDropReasons` | WIRED |
| table | devtools panel | `isHydrationDropReason` / `hydrationDropMeaning(...).summary` in `devtools/src/model/Hydration.ts` | WIRED |
| table | react console warning | `hydrationDropMeaning(reason).remedy` in `DeveloperSignals.ts:156` | WIRED |
| table kinds | react groups | `HydrationDropReasonOf<...>` in `HydrationEvent.ts` | WIRED |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
| -------- | ------- | ------ | ------ |
| core + react unit suites | `pnpm exec vitest run packages/core/test/HydrationMetrics.test.ts packages/react/test` | 33 files, 523 tests passed | PASS |
| type-level pins | `pnpm test:tstyche` | 266 passed, 537 assertions | PASS |
| typecheck | `pnpm typecheck` | clean | PASS |
| lint | `pnpm lint` | warnings only, pre-existing files (none in the phase's files) | PASS |
| house style / api surface | `node scripts/check-house-style.mjs`, `check-api-surface.mjs` | 496 files clean, 3 declared switches; 920 exports documented | PASS |
| kind-less row | temp edit, `tsc -p packages/core/tsconfig.src.json` | TS2741, then reverted | PASS |

### Probe Execution

No probes declared by the phase. Skipped.

### Requirements Coverage

| Requirement | Source Plans | Status | Evidence |
| ----------- | ------------ | ------ | -------- |
| DROP-01 | 39-02, 39-04 | SATISFIED | single table with kind and meaning; `MEANINGS` gone |
| DROP-02 | 39-02, 39-03, 39-04, 39-05 | SATISFIED | derivations read; kind-less negative proven |
| DROP-03 | 39-01, 39-02, 39-05 | SATISFIED | nine-word snapshot committed before refactor, green |
| DROP-04 | 39-01, 39-03, 39-04, 39-05 | SATISFIED | metric unchanged; new-row experiment recorded |
| WX-01 | 39-05 | SATISFIED | `pnpm check:pr` exit 0 on `0c3aca1d` per 39-05-SUMMARY; the two later review-fix commits touched only a string wrap and a test import, and typecheck, lint, tstyche and the vitest subset pass on HEAD (the full `pnpm check:pr` was not re-run by this verifier) |
| WX-02 | 39-01, 39-04, 39-05 | SATISFIED | ADR-QD-152, CCR-QD-430, INV-QD-323 present, reserved numbers |
| WX-03 | 39-04, 39-05 | SATISFIED | overview names the two types; gate 13 passes |
| WX-04 | 39-02, 39-03, 39-05 | SATISFIED | diff of core/react src added lines: only `as const`; house-style gate clean |
| WX-05 | 39-01, 39-05 | SATISFIED with note | both files 1 vs base 1; see warning below |
| WX-06 | 39-01..03 | SATISFIED | characterisation tests on the base lineage precede the refactor commits |
| WX-07 | 39-04, 39-05 | SATISFIED | no public break (source-compatible); changesets minor/patch; nothing released |

Orphaned requirements: none. All 11 IDs appear in PLAN frontmatter and are marked complete in REQUIREMENTS.md.

### Anti-Patterns Found

None blocking. No TBD/FIXME/XXX in the touched source files.

### Human Verification Required

None.

### Notes (non-blocking)

- **Mutation no longer guards `HydrationMetrics.ts`.** After the conversion 0 mutants are scored (the five base scored mutants were the old `.some(===)` guard, replaced by `Object.hasOwn`; the rest are static under `ignoreStatic`). The score reads 1 = base 1, so WX-05 is met as written, but protection of this file now rests on the written-out snapshot, the type pins and the experiments. This is recorded in 39-05-SUMMARY.md.
- **Co-author trailer.** The 39-05 commits carry `Claude Sonnet 5.5` where the plan's constraint check names Opus. Process-only; already recorded as a plan-verify defect. No effect on goal.
- **Runtime `kind` on the meaning object.** `hydrationDropMeaning` now returns the row, so the object carries `kind` at run time while its type stays `HydrationDropMeaning`. Documented in the changeset and ADR-QD-152; not a public break.
- The full `pnpm check:pr` and the mutation run were not re-executed here; the 39-05 evidence for them was taken from the SUMMARY plus the independent re-runs listed above.

## Gaps Summary

No gaps. The goal holds in the code: one table, every union, list, meaning and react group derived from it, and a kind-less row fails to compile (reproduced).

---

_Verified: 2026-11-14_
_Verifier: Claude (gsd-verifier)_
