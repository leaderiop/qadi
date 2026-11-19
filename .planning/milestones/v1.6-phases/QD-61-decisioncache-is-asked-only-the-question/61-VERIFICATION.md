---
phase: QD-61-decisioncache-is-asked-only-the-question
verified: 2026-11-19T22:30:00Z
status: passed
score: 4/4 must-haves verified
covered_files:
  - .changeset/core-decision-cache-asked-the-question.md
  - .planning/phases/QD-61-decisioncache-is-asked-only-the-question/61-01-PLAN.md
  - .planning/phases/QD-61-decisioncache-is-asked-only-the-question/61-01-SUMMARY.md
  - .planning/phases/QD-61-decisioncache-is-asked-only-the-question/61-02-PLAN.md
  - .planning/phases/QD-61-decisioncache-is-asked-only-the-question/61-02-SUMMARY.md
  - .planning/phases/QD-61-decisioncache-is-asked-only-the-question/61-03-PLAN.md
  - .planning/phases/QD-61-decisioncache-is-asked-only-the-question/61-03-SUMMARY.md
  - .planning/phases/QD-61-decisioncache-is-asked-only-the-question/61-04-PLAN.md
  - .planning/phases/QD-61-decisioncache-is-asked-only-the-question/61-04-SUMMARY.md
  - .planning/phases/QD-61-decisioncache-is-asked-only-the-question/61-05-PLAN.md
  - .planning/phases/QD-61-decisioncache-is-asked-only-the-question/61-05-SUMMARY.md
  - .planning/phases/QD-61-decisioncache-is-asked-only-the-question/61-06-PLAN.md
  - .planning/phases/QD-61-decisioncache-is-asked-only-the-question/61-06-SUMMARY.md
  - .planning/phases/QD-61-decisioncache-is-asked-only-the-question/61-07-PLAN.md
  - .planning/phases/QD-61-decisioncache-is-asked-only-the-question/61-07-SUMMARY.md
  - apps/website/src/content/docs/docs/reference/upgrading.md
  - packages/core/src/DecisionCache.ts
  - packages/core/src/EvaluationMetrics.ts
  - packages/core/src/Lifecycle.ts
  - packages/core/src/Question.ts
  - packages/core/test/DecisionCache.test.ts
  - packages/core/test/DecisionCache.tst.ts
  - packages/core/test/Lifecycle.test.ts
  - packages/devtools/test/react/Simulator.test.tsx
  - spec/README.md
  - spec/behaviors/21-decision-cache.md
  - spec/behaviors/25-inspection.md
  - spec/decisions/031-decision-cache.md
  - spec/decisions/132-a-shared-computation-is-joinable-only-while-awaited.md
  - spec/decisions/174-a-decision-cache-is-asked-the-question.md
  - spec/invariants.md
  - spec/traceability.md
covered_digest: "v4:sha256:c45c20ce4b0d96bd7005ca1baf20fdadc45d734ab31820f6cdba0f9e59c92fb2"
behavior_unverified: 0
overrides_applied: 0
---

# Phase 61: DecisionCache is asked only the question Verification Report

**Phase Goal:** `DecisionCache` is asked only the question and core supplies the matching walk, so no caller can pair a key with an unrelated computation and "this trace answers this key" no longer rests on one call site in `Lifecycle.ts`. Or, if the user decides not to pursue it, the phase ends with a recorded rejection ADR.
**Verified:** 2026-11-19
**Status:** passed
**Re-verification:** No, initial verification. Verified against the CURRENT tree (HEAD `53544622`, `phase_base` `7d2d281d`), after three review rounds that changed docs, spec, one test and comments after plan 61-07.

## Goal Achievement

### Observable Truths

| # | Truth (roadmap SC) | Status | Evidence |
|---|---|---|---|
| 1 | SC1: the owner decides before planning; the decision is recorded | VERIFIED | `61-CONTEXT.md` records D-01 (pursue, question only) and D-02 (not sealed; the guarantee covers callers, not a host-written cache) under "Owner choice (2026-11-19, the CASK-01 checkpoint)". ADR-QD-174 "The checkpoint" section states the same, and the ADR is Accepted, Rev 1.2. The "No" branch was not taken, so source changed. `REQUIREMENTS.md` marks CASK-01..04 `[x]` and Complete. |
| 2 | SC2: the interface takes the question alone (plus a concurrency-only options type); core's layer walks the matching question; a type-level negative refuses an arbitrary `compute` | VERIFIED | `DecisionCache.ts`: `getOrCompute: (question: Question, options?: Pick<EvaluateOptions, "concurrency">) => Effect<CacheLookup, EvaluationError, PortServices>`; the layer implements it as `shared.run(key, walk(key, options?.concurrency))`, so the key and the walk's input are one value. `walk` is not exported (tstyche pins `@ts-expect-error has no exported member 'walk'`). `DecisionCache.tst.ts`, in the `Params<F>` form, asserts `toBeCallableWith(question)`, `(question, undefined)`, `(question, { concurrency })`, and `not.toBeCallableWith(question, compute)`, `(question, () => compute)`, `(question, { concurrency }, compute)`. A fourth pin asserts the second parameter type is exactly `Pick<EvaluateOptions,"concurrency"> \| undefined`. tstyche: 4 tests, 9 assertions pass. No other call site in `packages`, `apps` or `examples` supplies a computation (grep of `getOrCompute` shows only the layer, `Lifecycle.ts:123`, the two `Lifecycle.test.ts` doubles which forward `(key, options)`, and the bench, which goes through `evaluate`). |
| 3 | SC3: `concurrency` reaches the walk and does not join the key; the same question with a different `concurrency` is one entry, and a test pins it | VERIFIED | Key is `HashMap<Question, Trace>` and `Question` has no `concurrency` (`Question.ts` doc: "Not part of the `Question`"). `Lifecycle.ts:123` passes `options` through unchanged (no per-lookup literal, D-11/D-14). Tests in `DecisionCache.test.ts`: "the same question asked with two concurrencies is one entry, in both orders" (asserts size 1, one `miss`, one `hit`, resolver called once per attribute, both orders); "concurrency crosses the cache into the walk; a sequential ask then hits" (`b` is looked up only when the unbounded option reached the walk; the sequential ask is then a hit with one entry); "a coalesced joiner's concurrency is unused: the claimant's governs the one walk, in both orders" (D-12). The `Lifecycle.test.ts` doubles also pin that the cache receives the caller's own options object (review IN-02 pin, RED-checked at `22a967ce`). All run green. |
| 4 | SC4: coalescing and interruption tests are driven through a question alone and stay green; `SharedComputation`'s rules are unchanged | VERIFIED | The coalescing and interruption tests ("N concurrent identical asks coalesce into one compute", "a failed compute is not cached", "a coalesced waiter's interruption does not interrupt the shared compute") drive `evaluate`, which hands the cache the question and the caller's options, never a computation. The I5 FIFO race test moved to `hasAttribute` questions and calls `cache.getOrCompute(question)` directly (`DecisionCache.test.ts:1267`), racing both the `coalesced` and `hit` sides (D-15). `git diff --quiet 7d2d281d HEAD -- packages/core/src/SharedComputation.ts` is clean, and `git hash-object` of the file equals the base blob (`16db2458...`): byte-identical. Core suite green (below). |

**Score:** 4/4 truths verified (0 behavior-unverified; each behavior-dependent truth has a named passing test).

### Required Artifacts

| Artifact | Expected | Status | Details |
|---|---|---|---|
| `packages/core/src/DecisionCache.ts` | new `getOrCompute` signature; layer walks the question | VERIFIED | Substantive and wired. The inner `options` param shadows the layer's `capacity` options only inside the lambda; `settle` still reads the layer's `capacity`. |
| `packages/core/src/Lifecycle.ts` | `decideQuestion` hands the cache `(question, options)` | VERIFIED | Line 123. The cache-absent branch still calls `walk(question, options?.concurrency)` itself. |
| `packages/core/src/Question.ts`, `EvaluationMetrics.ts` | docs only | VERIFIED | Comment-only diffs. |
| `packages/core/src/SharedComputation.ts` | unchanged | VERIFIED | Identical to base blob. |
| `packages/core/test/DecisionCache.tst.ts` | type-level negatives | VERIFIED | Above. |
| `.changeset/core-decision-cache-asked-the-question.md` | Breaking `@qadi/core` minor | VERIFIED | `"@qadi/core": minor`, body starts `**Breaking.**`, names the implementer route. |
| `upgrading.md` section | "0.13: a DecisionCache is asked only the question" | VERIFIED | Line 1065, with Before and After fences; names TS2559, TS2345, TS2322, TS2416. `check-website-doc-examples.mjs`: 71 blocks compile. |
| ADR-QD-174, amendments to ADR-QD-031 (Rev 1.3) and ADR-QD-132 (Rev 1.2) | present | VERIFIED | Present; each amendment narrows rather than rewrites. |
| Records ARCH-108, CCR-QD-452, BEH-QD-641..645, INV-QD-367..368 | present in spec | VERIFIED | Each id found in 4 to 8 spec files, including `traceability.md`, `behaviors/21-decision-cache.md`, `invariants.md`, `spec/README.md`. |

### Key Link Verification

| From | To | Via | Status |
|---|---|---|---|
| `decideQuestion` | `DecisionCacheShape.getOrCompute` | `(question, options)`, options by reference | WIRED |
| `decisionCacheLayer.getOrCompute` | `walk` | `walk(key, options?.concurrency)` inside `shared.run` | WIRED |
| `shared.run` | `entries` | key is the whole `Question`, unchanged | WIRED |
| Cache-less path | `walk` | `Effect.map(walk(question, options?.concurrency), ...)` | WIRED |

### Data-Flow Trace (Level 4)

Not applicable beyond the above: no rendered value. The trace flows from `walk` through `SharedComputation` to `entries` and back as `CacheLookup`.

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|---|---|---|---|
| Core suite | `pnpm exec vitest run --project core < /dev/null` | 82 files, 2649 tests passed | PASS |
| Type pins | `pnpm exec tstyche packages/core/test/DecisionCache.tst.ts < /dev/null` | 1 file, 4 tests, 9 assertions passed | PASS |
| Gate 13 | `node scripts/check-api-surface.mjs` | 939 exports documented (unchanged from base) | PASS |
| House style | `node scripts/check-house-style.mjs` | 560 files clean, 3 declared switches | PASS |
| Doc examples | `node scripts/check-doc-examples.mjs` / `check-website-doc-examples.mjs` | 117 / 71 blocks compile | PASS |
| Phase scan | `node 61-scan.mjs` | `phase scan clean` | PASS |
| Mutation compare (D-06) | `node 61-mutation.mjs compare 61-mutation-static.json` | `DecisionCache.ts` 0.9762 -> 0.9767 (detected 41 -> 42); the one new static-ignored mutant is Killed in the static file; `Lifecycle.ts` 1 -> 1 (42 -> 42); `SharedComputation.ts` 0.9859 -> 0.9859 (70 -> 70); no survivors added; ends `WX-05 holds (D-06)` | PASS |
| Banned constructs in the phase diff | grep of added lines under `packages/` for `as any`, `any`, `!.`, `switch (`, `fnUntraced`, `async`/`await`, `Record<string, unknown>` | one hit, a comment word ("any computation") | PASS |

Stryker, the bench and `check:pr` were not run, per instruction. `check:pr` is reported green on HEAD's code (16 of 16, exit 0).

### Probe Execution

SKIPPED: the phase declares no `probe-*.sh` scripts.

### Requirements Coverage

| Requirement | Description | Status | Evidence |
|---|---|---|---|
| CASK-01 | Owner checkpoint before planning | SATISFIED | SC1 |
| CASK-02 | Interface takes the question alone; core supplies the walk | SATISFIED | SC2 |
| CASK-03 | `concurrency` reaches the walk without joining the key | SATISFIED | SC3 |
| CASK-04 | Coalescing and interruption tests through a question alone; `SharedComputation` rules unchanged | SATISFIED | SC4 |

WX-01..07 are milestone-wide and out of scope by design. No orphaned requirements.

### No release (check 7)

- `.changeset` gained exactly one file since the base: `core-decision-cache-asked-the-question.md`.
- `git diff --name-only 7d2d281d HEAD` contains no `package.json` and no `CHANGELOG*` path.
- No release or version commit in `7d2d281d..HEAD` (the commit list is chore, test, feat, fix and docs only).
- `git tag --points-at HEAD` and `git tag --contains 7d2d281d` are empty.
- The tracked working-tree change is `.planning/config.json` only (not phase source). Branch has no upstream configured, so no push can be inferred from the local tree; none was made by this verification.

### Breaking is recorded (check 8)

Both the changeset and the 0.13 `upgrading.md` section exist and say so (see Required Artifacts). The commit `1e0900da` is the one `feat(61-03)!`. RED-first order held: `f1e690ca` (mutation base), `02b3c7a3`/`cc794ebf`/`7a67c3d5` (characterisations, race test, RED type pins), then `1e0900da` (the interface).

### Anti-Patterns Found

None. The scan is clean (no unreferenced TBD/FIXME/XXX in files this phase modified).

### Human Verification Required

None.

### Findings that are not gaps (informational)

1. **Host-written caches are outside the guarantee (D-02, owner's choice).** `DecisionCacheShape` stays public, so a host can still implement it and store a trace that does not answer its key. The guarantee is that no caller can pair a key with an unrelated computation. ADR-QD-174 and the upgrade note state this and name the route (wrap `decisionCacheLayer()`). Deliberate, not a gap.
2. **Two pre-existing surviving mutants** (`DecisionCache.ts` eviction `Option.isSome(oldest)`, `SharedComputation.ts:319` `"Claimed"`) predate the phase. D-06 asks only that no score fall. Deferred to the owner in `61-REVIEW-DISPOSITION.md`.
3. **Race-test bound.** The I5 race test's `gap <= 48` depends on `walk`'s step count; a comment says to re-measure if `Walk.ts` changes. Not derived at runtime.
4. **Formatting.** ADR-QD-174 Consequences line 73 is 189 characters; AGENTS.md §17 keeps formatting out of the gate.
5. **Scan scope.** `Simulator.test.tsx` is admitted to the scan without a comment-only check; its diff is comments only (verified here by the diff stat of 4 lines and by review iteration 3).
6. The interruption test drives `evaluate` rather than calling `getOrCompute` by hand. That is still "a question alone" from the cache's side, since `decideQuestion` supplies only the question and options.

### Gaps Summary

None. The owner's decision is recorded; the cache is asked the question and an optional `{ concurrency }`, core's layer walks the matching question, and a tstyche negative refuses a `compute`; one question under two concurrencies is one entry, pinned in both orders; `SharedComputation.ts` is byte-identical to the base; mutation holds (WX-05); the scan is clean; one Breaking changeset and the 0.13 note exist; nothing was released, tagged or pushed.

---

_Verified: 2026-11-19_
_Verifier: Claude (gsd-verifier)_
