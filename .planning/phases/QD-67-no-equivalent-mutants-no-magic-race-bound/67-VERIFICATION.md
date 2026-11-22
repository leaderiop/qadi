---
phase: QD-67-no-equivalent-mutants-no-magic-race-bound
verified: 2026-11-21T03:45:00Z
status: passed
score: 6/6 must-haves verified
covered_files:
  - ".planning/phases/QD-67-no-equivalent-mutants-no-magic-race-bound/67-01-PLAN.md"
  - ".planning/phases/QD-67-no-equivalent-mutants-no-magic-race-bound/67-01-SUMMARY.md"
  - ".planning/phases/QD-67-no-equivalent-mutants-no-magic-race-bound/67-02-PLAN.md"
  - ".planning/phases/QD-67-no-equivalent-mutants-no-magic-race-bound/67-02-SUMMARY.md"
  - ".planning/phases/QD-67-no-equivalent-mutants-no-magic-race-bound/67-03-PLAN.md"
  - ".planning/phases/QD-67-no-equivalent-mutants-no-magic-race-bound/67-03-SUMMARY.md"
  - ".planning/phases/QD-67-no-equivalent-mutants-no-magic-race-bound/67-04-PLAN.md"
  - ".planning/phases/QD-67-no-equivalent-mutants-no-magic-race-bound/67-04-SUMMARY.md"
  - ".planning/phases/QD-67-no-equivalent-mutants-no-magic-race-bound/67-05-PLAN.md"
  - ".planning/phases/QD-67-no-equivalent-mutants-no-magic-race-bound/67-05-SUMMARY.md"
  - ".planning/phases/QD-67-no-equivalent-mutants-no-magic-race-bound/67-06-PLAN.md"
  - ".planning/phases/QD-67-no-equivalent-mutants-no-magic-race-bound/67-06-SUMMARY.md"
  - ".planning/phases/QD-67-no-equivalent-mutants-no-magic-race-bound/67-07-PLAN.md"
  - ".planning/phases/QD-67-no-equivalent-mutants-no-magic-race-bound/67-07-SUMMARY.md"
  - "AGENTS.md"
  - "packages/core/bench/DecisionCache.bench.ts"
  - "packages/core/src/DecisionCache.ts"
  - "packages/core/src/SharedComputation.ts"
  - "packages/core/src/TraceDiff.ts"
  - "packages/core/test/DecisionCache.test.ts"
  - "spec/README.md"
  - "spec/behaviors/21-decision-cache.md"
  - "spec/invariants.md"
  - "spec/process/house-rules-evidence.md"
  - "spec/traceability.md"
covered_digest: "v4:sha256:777470267767d4ada907fcdf3120a1f26677dec9a4f5ea8650039e4496586236"
behavior_unverified: 0
overrides_applied: 0
---

# Phase 67: No equivalent mutants, no magic race bound Verification Report

**Phase Goal:** `DecisionCache`'s eviction and `SharedComputation`'s claim dispatch have no branch whose mutant is equivalent or surviving for want of a check, and the I5 race test finds both orderings without a bound tied to `walk`'s step count.
**Verified:** 2026-11-21
**Status:** passed
**Re-verification:** No, initial verification

Base `eacf89b4`, HEAD `76332d92`. `git diff 0e3f9cbd..HEAD -- packages scripts package.json` is empty, and so is `git diff e195dd19..HEAD -- packages`, so the bench of record, the mutation close (`adb01b5f`) and the `check:pr` run all describe the shipped source. `git status` is clean under `packages`.

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
| - | ----- | ------ | -------- |
| 1 | SC1 / MUTE-01: the eviction has no branch that cannot be taken; FIFO and capacity validation unchanged; the surviving mutant is gone | VERIFIED | `DecisionCache.ts:265-278`: `Chunk.splitAt(insertionOrder, HashMap.size(entries) - options.capacity)` then `HashMap.removeMany`; no `while`, no `Option`, and `import * as Option` is removed. I ran `Chunk.splitAt` on 5 elements: `-3`, `NaN`, `0`, `0.9` take nothing; `1.5` takes 1; `>= 5` and `Infinity` take all, so the doc claims hold. The validation `Number.isInteger(capacity) && capacity >= 0` is untouched in the diff. FIFO tests (`evicts the oldest ...`, `capacity: 0 ...`, `never evicts a key with a compute still in flight`) exist and `DecisionCache.test.ts` + `SharedComputation.test.ts` pass (60/60). The base survivor (`:287` ConditionalExpression) is absent from the close record (`DecisionCache.ts` 38/38, `open: []`). |
| 2 | SC2 / MUTE-02: the claim result is dispatched closed; every tag mutant killed; no `switch` or Stryker-disable; the hit check stays in the one synchronous claim step; the form was chosen after a bench | VERIFIED | `SharedComputation.ts:366-380`: `arms: { readonly [T in Claim<A,E>["_tag"]]: ClaimArm<...> }`, so a missing arm is a compile error, and `answer` indexes it by `claim._tag`. The three arms are calls (`answerHit`, `answerJoined`, `answerOwned`). `hooks.cached(key)`, the `inFlight` lookup and the claim stay in one `Effect.sync` (`:431-448`), joined to the arm by `Effect.flatMap`. The Stryker report on disk shows the tag-literal mutants at lines 433, 439 and 448 Killed, and the close record has 71/71 with `open: []`. `grep` of the source and test diff for `switch`, `Stryker`, `fnUntraced`, `as`, `!`, `any`, `async`: nothing added. `check-house-style.mjs` is clean (3 declared switches, unchanged). The form was chosen on `67-DISPATCH.md`'s fixed rule (`Match` failed with two workloads +7.2% and +7.7%, the table passed 0 slower, geomean -4.15%); numbers in the doc match that file. |
| 3 | SC3 / MUTE-03: the race test iterates until both orderings are seen at every budget, cap 512, margin 3, no number tied to `walk`, shown RED with the hit check split | VERIFIED | `DecisionCache.test.ts:1250-1322`: per budget `seen` counts, `end = cap (512)`, and when `coalesced > 0 && hit > 0` it sets `end = gap + 1 + margin` with `margin = 3`; a budget not landing on both sides in 512 gaps is pushed to `capped` and asserted `[]` (names the budget and counts); `raced` (one walk of `K`, exact FIFO) is asserted on every run. The `gap <= 48` loop and the "re-measure" comment are gone (grep). `ownerSpin = 3` is the pre-existing owner spin input, unchanged from the base. RED, independently reproduced: I split the hit check into its own `Effect.sync` in the current `SharedComputation.ts`, ran the race test, and it failed with `kWalks: 2` at budget 3 gap 40, budget 4 gap 22 and budget 6 gap 13, then restored the file (SHA-256 identical, `git status` clean). `67-RED-EVIDENCE.md` records the same on the base, and the 512-cap failure path (`ownerSpin = 520`). |
| 4 | SC4 / MUTE-04: Stryker scores not below Phase 61's (0.977, 0.986, 1.000); both named survivors gone | VERIFIED | `67-mutation.mjs compare` exits 0: `DecisionCache.ts` 42/43 to 38/38, `Lifecycle.ts` 42/42 to 42/42, `SharedComputation.ts` 70/71 to 71/71, 0 new ignored, close leaves no mutant open, none open on a line the phase wrote. `--self-test`: 11 passed. Both survivors (`DecisionCache.ts:287`, `SharedComputation.ts:319`) are absent from the close record. The `ignoreStatic:false` evidence run (39/40 and 71/79) leaves open only `DecisionCache.ts:141` and `SharedComputation.ts:89-99`, which predate the phase (the phase's hunks start at line 104+ of `SharedComputation.ts`). |
| 5 | Every text about the eviction, the dispatch and I5 states only what the code and measurements hold | VERIFIED | Source comments (`DecisionCache.ts` 197-209, 240-278; `SharedComputation.ts` 104-107, 175, 270+, 398-448; `TraceDiff.ts` no longer cites the guard) match the code, and the `Chunk.take`/`drop` "view over the chunks it already holds" claim matches effect's `ISlice` backing. BEH-QD-166's reasons (split rounds down, negative evicts all, `NaN` evicts none) match my run; its amendment note says the requirement is unchanged. INV-QD-379's claims (one append per walk, evict in the settling step, `capacity: 0` retains nothing, mutants killed) and its three named tests are true. AGENTS.md §5a's paragraph (tables `afterReset` and `afterLastLeave` exist in `SharedComputation.ts`; third form chosen because `Match` failed a gate fixed in advance) matches `67-DISPATCH.md`. `house-rules-evidence.md` §2's new subsection matches `67-DISPATCH.md` and `67-BENCH.md` figure for figure (+7.2/+7.7, +1.87%, -4.15%, base spreads 6.0-15.0% and 1.1-3.1%, load 3.86 and 10.22 to 16.09, later run +2.8/+1.0, -2.51%) and states what the runs do not hold. `spec/overview.md` (Rev 1.130) names no eviction loop, claim dispatch or I5; its `DecisionCache`/`decisionCacheLayer` rows are signature-level and nothing is stale. No stale "eviction loop" claim remains outside change history and deferred IN-01 (below). |
| 6 | CCR-QD-458 row cites every revised spec document at its current Revision | VERIFIED | Line 8 of each: `21-decision-cache.md` 1.12, `invariants.md` 1.166, `traceability.md` 1.233, `README.md` 1.272, `house-rules-evidence.md` 1.3: all equal the row. It also names AGENTS.md §5a and the three source files, the test and the bench. `spec-revise.mjs --check` clean; `verify-traceability.sh --strict`: PASS 21, FAIL 0. The row names ADR-QD-180, BEH-QD-671-675 and INV-QD-380 as Unused. |

**Score:** 6/6 truths verified (0 present, behavior-unverified)

### Required Artifacts

| Artifact | Expected | Status | Details |
| -------- | -------- | ------ | ------- |
| `packages/core/src/DecisionCache.ts` | split eviction, no `Option` | VERIFIED | substantive, wired through `hooks.settle`, runs in the cache layer |
| `packages/core/src/SharedComputation.ts` | `Claim` union, arm table, three arms | VERIFIED | wired: `run` calls `answer` through `Effect.flatMap` |
| `packages/core/test/DecisionCache.test.ts` | adaptive race sweep | VERIFIED | passes; shown RED by the hit-check split |
| `packages/core/bench/DecisionCache.bench.ts` | capacity-bound workload | VERIFIED | workload at end of file |
| `67-mutation-{base,close,static}.json`, `67-mutation.mjs` | scored records and scorer | VERIFIED | `compare` and `--self-test` pass |
| `67-RED-EVIDENCE.md`, `67-DISPATCH.md`, `67-BENCH.md` | evidence | VERIFIED | figures agree with the spec text |

### Key Link Verification

| From | To | Via | Status | Details |
| ---- | -- | --- | ------ | ------- |
| `run`'s claim step | arm table | `Effect.flatMap` then `answer(claimed, ...)` | WIRED | hit check, join and claim in one `Effect.sync` |
| `DecisionCache` settle | `Chunk.splitAt` / `HashMap.removeMany` | direct | WIRED | `entries` and `insertionOrder` updated in one sync step |
| INV-QD-379 | tests, BEH-QD-166, traceability | links and rows | WIRED | rows present in `traceability.md` |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
| -------- | ------- | ------ | ------ |
| Cache and single-flight suites | `pnpm exec vitest run --project core packages/core/test/DecisionCache.test.ts packages/core/test/SharedComputation.test.ts` | 60 passed | PASS |
| Race test RED with hit check split | scratch edit, one named test, restored | fails with `kWalks: 2` at budgets 3, 4, 6 | PASS |
| `Chunk.splitAt` clamping | node script over `-3, NaN, 0, 0.9, 1.5, 5, Infinity` | as BEH-QD-166 says | PASS |
| Scorer | `67-mutation.mjs --self-test` / `compare` | 11 passed / exit 0 | PASS |
| House style | `node scripts/check-house-style.mjs` | 560 files clean | PASS |
| Spec gates | `spec-revise.mjs --check`, `verify-traceability.sh --strict` | clean, 21 PASS 0 FAIL | PASS |

I did not run `check:pr`, Stryker or the bench, as instructed; `check:pr` exited 0 on HEAD per the caller.

### Requirements Coverage

| Requirement | Status | Evidence |
| ----------- | ------ | -------- |
| MUTE-01 | SATISFIED | Truth 1 |
| MUTE-02 | SATISFIED | Truth 2 |
| MUTE-03 | SATISFIED | Truth 3 |
| MUTE-04 | SATISFIED | Truth 4 |
| WX-01 | Pending by design | `check:pr` green on HEAD (caller's run); the row closes with the milestone |
| WX-02 | Pending by design | ADR named Unused in the CCR row; CCR-QD-458, BEH-QD-166 amendment, INV-QD-379 and traceability rows present |
| WX-03 | Pending by design | no export added or removed (`Claim`, `ClaimArm`, `Restore` are module-private); gate 13 inside `check:pr` |
| WX-04 | Pending by design | nothing from the list added in `packages/*/src` or test diffs |
| WX-05 | Pending by design | scores held or raised (Truth 4); coverage via `check:pr` |
| WX-06 | Pending by design | race test committed (`2b01cfa2`) and shown RED before the source change; eviction rewrite is covered by the existing FIFO tests, whose mutants it now kills |
| WX-07 | Pending by design | no D-number, plan id or phase number in the shipped source or test titles (greps empty) |

No orphaned requirements: all 11 IDs in the ROADMAP row are claimed.

### Anti-Patterns Found

None blocking. No `TBD`/`FIXME`/`XXX` markers in the phase's source changes.

### Known and accepted (not gaps)

- Dispatch choice rests on one run per candidate under load; the rule was fixed first and followed, and the records state the noise and say they hold no figure for the cost of `Match`.
- Deferred to the milestone audit: IN-01 (stale comments at `DecisionCache.test.ts` ~1054-1100 in the negative, `NaN` and fractional capacity tests still say "eviction loop"), IN-02 (redundant `oneSided` assertion, kept by the owner), IN-03 (scorer self-test does not cover the `refuseDirty` call sites).
- Static survivors at `SharedComputation.ts:89-99` and `DecisionCache.ts:141` predate the phase.

### Human Verification Required

None.

### Gaps Summary

No gaps. Each success criterion and MUTE-01..04 holds in the code, the race test's RED was reproduced independently, the scorer's compare passes against Phase 61's floors, and the spec texts and CCR row agree with the code and the measurements.

---

_Verified: 2026-11-21_
_Verifier: Claude (gsd-verifier)_

## Re-verification (2026-11-21, Phase 68 sweep)

**Staleness:** `67: stale, verification 4f9d906a, 30 cited, 5 changed since` (`68-stale.mjs`, run at `9214d081`).

| Cited file | Changed since `4f9d906a` by |
| --- | --- |
| `packages/core/test/DecisionCache.test.ts` (covered) | `d06f8bc5` test(68-06): the capacity tests describe the validation, and the race test drops its redundant assertion |
| `scripts/check-house-style.mjs` | `ec59e0ac` fix(68-08): test:tstyche takes file filters, house-style reads tstyche.json as JSONC, the characterisation is named once |
| `spec/README.md` (covered) | `eacfeb6c` docs(68-11): CCR-QD-459, the settled items confirmed, and the devtools patch changeset |
| `spec/invariants.md` (covered) | `5b603fea` docs(68-10): the amended decisions, behaviours and invariants say what the code holds<br>`faec4fab` docs(68-07): the characterisation's readings, the projection's accessors, the admit pins and the supplied trace |
| `spec/traceability.md` (covered) | `5b603fea` docs(68-10): the amended decisions, behaviours and invariants say what the code holds<br>`faec4fab` docs(68-07): the characterisation's readings, the projection's accessors, the admit pins and the supplied trace |

**Trailers on this phase's commits:** 35 `Claude Opus 5.5 <noreply@anthropic.com>`.

**Validation record:** no VALIDATION.md.

**Digest:** `covered_digest: "v4:sha256:3a750fbffb7c01352689b776d2dd77bbc6bacc236789d38d96c4eb0bb76a48db"` becomes `covered_digest: "v4:sha256:1f96d7020d59b611420d53f4332b119f71e11a976765488c0d5f0d26615539aa"`, over the same 25 covered files.

### Spot-checks re-run (Phase 68 sweep)

Every row below was run on the tree at `9214d081`, one command at a time, in the foreground, with nothing else running beside it. The first six rows are the report's six spot-checks; the last two re-check what its header and Truths 3 and 5 say about the tree.

| Behavior | Command run now | Result now | Status |
| -------- | --------------- | ---------- | ------ |
| Cache and single-flight suites | `pnpm exec vitest run --project core packages/core/test/DecisionCache.test.ts packages/core/test/SharedComputation.test.ts < /dev/null` | exit 0; `Test Files  2 passed (2)`, `Tests  60 passed (60)`, the report's 60 | PASS |
| Race test RED with the hit check split | a scratch node script moves the hit check of `SharedComputation.ts` out of the claim step into an `Effect.sync` of its own before it (each replaced text occurs once); `pnpm exec vitest run --project core packages/core/test/DecisionCache.test.ts -t "a joiner racing its owner" < /dev/null`; then `git checkout -- packages/core/src/SharedComputation.ts` | green before the plant (`Tests  1 passed \| 41 skipped (42)`); with the plant exit 1, `Tests  1 failed \| 41 skipped (42)`, the failing assertion naming `budget 3 gap 40`, `budget 4 gap 22` and `budget 6 gap 13`, each `{"joined":"miss","kWalks":2,...}`, the report's three budgets and the same `kWalks: 2`. The file's SHA-256 is the same after the restore and `git status --porcelain -- packages` is empty | PASS |
| `Chunk.splitAt` clamping | `node -e` over `Chunk.fromIterable([1,2,3,4,5])` and `Chunk.splitAt(c, n)[0]` for `-3, NaN, 0, 0.9, 1.5, 5, Infinity` | sizes of the first part `0, 0, 0, 0, 1, 5, 5`: a negative count, `NaN`, `0` and `0.9` take nothing, `1.5` takes 1, `5` and `Infinity` take all, as BEH-QD-166 says | PASS |
| Scorer | `node .planning/phases/QD-67-no-equivalent-mutants-no-magic-race-bound/67-mutation.mjs --self-test < /dev/null` and `... compare < /dev/null` | self-test exit 0, `self-test: 17 passed` (the report's 11, plus the dirty-tree refusal at each mode's call site and the status reader's paths that Phase 68 added to the scorer); `compare` exit 0: `DecisionCache.ts` 42/43 to 38/38, `Lifecycle.ts` 42/42 to 42/42, `SharedComputation.ts` 70/71 to 71/71, 0 new Ignored, `the close leaves no mutant open, and no mutant on a line the phase wrote is left open`, and the static run 39/40 and 71/79, the report's figures | PASS |
| House style | `node scripts/check-house-style.mjs < /dev/null` | `house-style: 560 file(s) clean (3 declared switch(es), 66 type-test file(s))`, the report's count | PASS |
| Spec gates | `node scripts/spec-revise.mjs --check < /dev/null`, `bash spec/scripts/verify-traceability.sh --strict < /dev/null` | `spec-revise: every Revision matches its newest Change History entry`; `PASS: 21   FAIL: 0   SKIP: 0` | PASS |
| Race test's cap | the test file with `let ownerSpin = 3;` replaced by `let ownerSpin = 520;` (a scratch edit), `pnpm exec vitest run --project core packages/core/test/DecisionCache.test.ts -t "a joiner racing its owner" < /dev/null`, then `git checkout -- packages/core/test/DecisionCache.test.ts` | exit 1; the `capped` assertion names every budget, `budget 3: {"coalesced":512,"hit":0,"miss":0} in 512 gaps` and the same for budgets 4, 5 and 6, so the cap of 512 fails a budget that never lands on both sides. The test file's SHA-256 is the same after the restore. Phase 68 removed the sweep's separate `oneSided` assertion (a redundant check the `capped` assertion makes; the report's deferred IN-02), and this run shows the cap path still fails | PASS |
| The report's header: the shipped source unchanged since the bench | `git diff --name-only 4f9d906a HEAD -- packages/core/src/DecisionCache.ts packages/core/src/SharedComputation.ts packages/core/src/TraceDiff.ts packages/core/bench/DecisionCache.bench.ts`, and the same for `spec/behaviors/21-decision-cache.md`, `spec/process/house-rules-evidence.md` and `AGENTS.md`; `git diff --name-only 4f9d906a HEAD -- ':(glob)packages/**/src/**'` | the first two list 0 files, so the three source files, the bench and the three documents the truths read are exactly as the report left them. The third lists six files, `Admission.ts`, `DecisionLog.ts`, `SinkCodec.ts`, `UntrustedDecode.ts`, `DiagnosticsFeed.ts` and `TimelineFeed.ts`, none of which this phase's truths read. The report's `git diff 0e3f9cbd..HEAD -- packages scripts package.json` is empty on the range it names and no longer on the tree, which Phase 68 changed | PASS |
| Comments the report deferred | `grep -n "eviction loop" packages/core/test/DecisionCache.test.ts` | no hit: the three comments the report's IN-01 names now describe `Chunk.splitAt` (a negative capacity evicts more than the cache holds, `NaN` makes the count `NaN`, which evicts nothing) | PASS |

### Changed covered files read against the truths that cite them (Phase 68 sweep)

- `packages/core/test/DecisionCache.test.ts` (`d06f8bc5`): Truths 1, 3 and 5 still hold. The diff has seven hunks. Four reword the negative capacity test's title and comment and the comments of the `NaN` and fractional capacity tests so they describe the split and no longer an eviction loop, with no code token changed; the report listed this as its IN-01. Three remove the sweep's `sides` array, its `push` and the `oneSided` assertion that read it, the report's IN-02, which the owner had kept. The cap and margin, `seen`, `capped` and `raced` are untouched, and both reproductions above (the hit check split, and the owner spinning past the cap) still fail the test.
- `spec/README.md` (`eacfeb6c`), `spec/invariants.md` (`5b603fea`, `faec4fab`) and `spec/traceability.md` (`5b603fea`, `faec4fab`): Truths 5 and 6 still hold. The three moved to Revisions 1.273, 1.168 and 1.235; the revisions the CCR-QD-458 row names (README 1.272, invariants 1.166, traceability 1.233) are entries of their Change History, dated 2026-11-21, and a CCR row records the Revision its change left. The changes since touch other rows (the INV-QD-375 to INV-QD-377 rows among them), and none touches INV-QD-379, BEH-QD-166, or the INV-QD-379 rows of traceability. ADR-QD-180, BEH-QD-671 to 675 and INV-QD-380 appear only in the CCR-QD-458 row, which says they are Unused.
- Cited, not covered, and changed since: `scripts/check-house-style.mjs` (`ec59e0ac`) reads `tstyche.json` as JSONC and names the characterisation once; its run above is clean with the report's file count and three declared switches, and no `switch` or `Effect.fnUntraced` is added, so Truth 2's claim about declared switches holds.

### Notes on the original report's evidence

Kept whole above; recorded here, not edited.

- The report's `git diff 0e3f9cbd..HEAD -- packages scripts package.json` and `git diff e195dd19..HEAD -- packages` use pathspecs that select every file under each directory, so neither is vacuous; both were true of the range the report names and are re-run on the files its truths cite in the last-but-one row above.
- The report's deferred items IN-01 and IN-02 are settled by Phase 68 (the last two rows above and the first bullet). Its IN-03, that the scorer's self-test does not cover the `refuseDirty` call sites, is settled by Phase 68's scorer, whose self-test now has 17 cases, the dirty-tree refusal at each mode's call site and the status reader's paths among them.
- Its Requirements Coverage rows for WX-01 to WX-07 describe Phase 67's own range and are not re-run here. WX-01: the report took `check:pr` from the caller. This verdict is answered by the one `check:pr` run of plan 68-15, which reads the whole tree, and stands only while that run is green. WX-05: Phase 67's scores are re-read by the scorer row above.
- The report records no validation file; none exists.

**Verdict:** passed

## Re-verification (2026-11-21, after the code review's fixes)

**Staleness:** `67: stale, verification eb6d2f12, 34 cited, 2 changed since` (`68-stale.mjs`, run at `2367f9df`).

| Cited file | Changed since `eb6d2f12` by |
| --- | --- |
| `spec/README.md` (covered) | `8c3375fb` fix(QD-68): WR-02 the timeout text claims only the execFileSync children |
| `spec/traceability.md` (covered) | `8c3375fb` fix(QD-68): WR-02 the timeout text claims only the execFileSync children |

**Trailers on this phase's commits:** 35 `Claude Opus 5.5 <noreply@anthropic.com>`.

**Validation record:** no VALIDATION.md.

**Digest:** `covered_digest: "v4:sha256:1f96d7020d59b611420d53f4332b119f71e11a976765488c0d5f0d26615539aa"` becomes `covered_digest: "v4:sha256:b9da1699f381997064b348cc8895d963c31ae48bf773f06c9d098d93669b3921"`, over the same 25 covered files.

### Spot-checks re-run (Re-verification (2026-11-21, after the code review's fixes))

Every row was run on the tree at `2367f9df` (the commit `68-stale.mjs` named), one command at a time, in the foreground, with nothing else running beside it. Heavy commands were run once and their result is shared across the six phases' sections.

| Behaviour | Command run now | Result now | Status |
| --------- | --------------- | ---------- | ------ |
| Revision headers and registers | `node scripts/spec-revise.mjs --check < /dev/null` | exit 0; `spec-revise: every Revision matches its newest Change History entry` | PASS |
| Traceability | `bash spec/scripts/verify-traceability.sh --strict < /dev/null` | exit 0; `PASS: 21   FAIL: 0   SKIP: 0 (strict: skips count as failures)` | PASS |
| What `8c3375fb` changed in the spec | `git show 8c3375fb -- spec` | `spec/README.md`: the Revision header (1.273 to 1.274), its Change History and the CCR-QD-459 row (ADR-QD-033 now cited at Rev 1.4). `spec/traceability.md`: the header (1.235 to 1.236), its Change History and the ADR-QD-033 row. `spec/decisions/033-*.md`: Revision 1.4 and the sentence on child timeouts. Every other row of both registers is unchanged | PASS |

### Truths re-checked (Re-verification (2026-11-21, after the code review's fixes))

Only `spec/README.md` and `spec/traceability.md` changed among the cited files, both covered, in the rows named in the last spot-check row; the digest changes accordingly. The report's Revisions (traceability 1.233, README 1.272) are Change History entries that remain, and the CCR-QD-458 row is unchanged.

**Verdict:** passed

## Re-verification (2026-11-21, after Phase 68.1)

**Staleness:** `67: stale, verification e07ea925, 34 cited, 3 changed since` (`68-stale.mjs`, run at `25c781b1`).

| Cited file | Changed since `e07ea925` by |
| --- | --- |
| `README.md` | `ecb4ed90` fix(68.1-02): analyze.mjs exits 1 on a failed gate, and pnpm check runs its self-test |
| `package.json` | `ecb4ed90` fix(68.1-02): analyze.mjs exits 1 on a failed gate, and pnpm check runs its self-test |
| `spec/README.md` (covered) | `a8b36092` docs(68.1-05): ADR-QD-033 amended and CCR-QD-460 recorded |

**Trailers on this phase's commits:** 35 `Claude Opus 5.5 <noreply@anthropic.com>`.

**Validation record:** no VALIDATION.md.

**Digest:** `covered_digest: "v4:sha256:b9da1699f381997064b348cc8895d963c31ae48bf773f06c9d098d93669b3921"` becomes `covered_digest: "v4:sha256:e6fd5293aadc266e96e9a2c73b6a17bd555b99390931c628e2de265081da59cb"`, over the same 25 covered files.

**Staleness by `68.1-stale.mjs`:** `67: stale, verification e07ea925, 34 cited, 3 changed since` (run at `25c781b1`).

### Spot-checks re-run (Re-verification (2026-11-21, after Phase 68.1))

Every row was run on a tree whose tracked files outside the planning directory are those of `25c781b1`, one command at a time, in the foreground, with stdin closed and nothing else running beside it. The spec-revise and traceability results are shared with the other re-verifications of this phase and were taken once at `c3d8553a`; no tracked file outside the planning directory differs between that head and `25c781b1` (`git diff --quiet c3d8553a 25c781b1 -- . ':(exclude).planning'` is silent). No source, test or characterisation file of Phase 67 changed in this phase (`git diff --name-only 0e3f3438 HEAD -- packages` lists 0 files), so the report's vitest, race-test, scorer and house-style rows were not run again.

| Behaviour | Command run now | Result now | Status |
| --------- | --------------- | ---------- | ------ |
| What the phase changed in the root readme | `git diff -U0 0e3f3438 HEAD -- README.md` | one line changed, 220: `pnpm check` is now commented `all twenty-six gates, in order` where it read twenty-five; nothing else in the file differs | PASS |
| What the phase changed in the package manifest | `git diff -U0 0e3f3438 HEAD -- package.json` | two scripts-table changes and nothing else: `bench:self-test` is added and `check` gains ` && pnpm bench:self-test` at its end; every other script and every dependency field is unchanged | PASS |
| What the phase changed under the paths the report's header names | `git diff --name-only 0e3f3438 HEAD -- packages`, and `git diff --name-only 0e3f3438 HEAD -- scripts package.json pnpm-lock.yaml` | 0 files under `packages`; the second lists `package.json` and four scripts (`scripts/bench/ab.sh`, `scripts/bench/analyze.mjs`, `scripts/check-package-install.mjs`, `scripts/lib/probe-guard-parse.mjs`), none of which a truth of this report reads | PASS |
| What the phase changed in the spec register, and the revisions | `git diff -U0 0e3f3438 HEAD -- spec/README.md`, and `node scripts/spec-revise.mjs --check < /dev/null` (shared) | the Revision header (1.274 to 1.275), the Change History cell (a 1.275 entry in front) and one added row, CCR-QD-460, at line 397; no row is removed or edited, so the CCR-QD-458 row is still at line 395 as it was at the base, and the 1.272 entry the report cites is still in the cell; `spec-revise` exit 0, `spec-revise: every Revision matches its newest Change History entry` | PASS |
| The documents Truths 5 and 6 read are unchanged | `git diff --name-only 0e3f3438 HEAD -- AGENTS.md spec/behaviors/21-decision-cache.md spec/process/house-rules-evidence.md spec/invariants.md spec/traceability.md` | 0 files, so BEH-QD-166, INV-QD-379, the rows of traceability and the house-rules section the truths read are as the earlier sections left them | PASS |
| Traceability | `bash spec/scripts/verify-traceability.sh --strict < /dev/null` (shared) | exit 0; `PASS: 21   FAIL: 0   SKIP: 0 (strict: skips count as failures)` | PASS |

### Changed cited files read against the truths that cite them (Re-verification (2026-11-21, after Phase 68.1))

- `README.md` (68.1-02, `ecb4ed90`): the report does not cite the root readme; its Truth 6 writes `README.md` for the spec register (`spec/README.md`, Revision 1.272), and `68-stale.mjs` lists that bare name as the root file. The commit changes one number in a comment on the `pnpm check` line (twenty-five gates to twenty-six), which no truth of this report reads, so no truth changes.
- `package.json` (68.1-02, `ecb4ed90`): the report names the manifest only in its header, in `git diff 0e3f9cbd..HEAD -- packages scripts package.json` being empty, which was true of the range it names and is a claim about that range, not about this tree (the earlier section on Phase 68 already says so for the same pathspec). The commit adds the `bench:self-test` script and appends it to `check`; no source, bench or script a truth reads changed (third row), so Truths 1 to 4 describe the same code as before.
- `spec/README.md` (covered; 68.1-05, `a8b36092`): the report cites the CCR-QD-458 row and Revision 1.272 (Truth 6). The row is unedited at line 395 and the 1.272 entry remains in the Change History cell; the commit moves the revision to 1.275 and adds the CCR-QD-460 row, which no truth of this report reads. The digest changes because this file is covered, and no other covered file changed.

**Verdict:** passed

## Re-verification (2026-11-22, after the 68.1 code-review fixes)

**Staleness:** `67: stale, verification cceaf000, 38 cited, 2 changed since` (`68-stale.mjs`, run at `ba47ec53`).

| Cited file | Changed since `cceaf000` by |
| --- | --- |
| `scripts/bench/ab.sh` | `70574a33` fix(68.1): WR-06 ab.sh refuses a round count below 4 in both modes |
| `spec/README.md` (covered) | `79a685b4` docs(68.1): WR-02 WR-03 scope CCR-QD-460's odd-count and hang claims to what was shown |

**Trailers on this phase's commits:** 35 `Claude Opus 5.5 <noreply@anthropic.com>`.

**Validation record:** no VALIDATION.md.

**Digest:** `covered_digest: "v4:sha256:e6fd5293aadc266e96e9a2c73b6a17bd555b99390931c628e2de265081da59cb"` becomes `covered_digest: "v4:sha256:777470267767d4ada907fcdf3120a1f26677dec9a4f5ea8650039e4496586236"`, over the same 25 covered files.

**Staleness by `68.1-stale.mjs`:** `67: stale, verification cceaf000, 39 cited, 2 changed since` (run at `ba47ec53`).

### Spot-checks re-run (Re-verification (2026-11-22, after the 68.1 code-review fixes))

Every row was run on the tree at `ba47ec53`, one command at a time, in the foreground, with stdin closed. The spec-revise and traceability results are shared with the Phase 62 to 66 and 68 sections of this re-verification: each was taken once at `ae42c2b2`, in a fresh set after the code-review fixes (the earlier set, taken at `c3d8553a`, is not reused because `scripts/bench/ab.sh` and `spec/` changed), and no tracked file outside the planning directory differs between that head and `ba47ec53`. No source, test or characterisation file of Phase 67 changed (`git diff --name-only 0e3f3438 HEAD -- packages` lists 0 files), so the report's vitest, race-test, scorer and house-style rows were not run again.

| Behaviour | Command run now | Result now | Status |
| --------- | --------------- | ---------- | ------ |
| What the phase and its fixes changed under the paths the report's header names | `git diff --name-only 0e3f3438 HEAD -- packages`, and `git diff --name-only 0e3f3438 HEAD -- scripts package.json pnpm-lock.yaml` | 0 files under `packages`; the second lists `package.json` and four scripts (`scripts/bench/ab.sh`, `scripts/bench/analyze.mjs`, `scripts/check-package-install.mjs`, `scripts/lib/probe-guard-parse.mjs`), the same five as in the previous section, none of which a truth of this report reads | PASS |
| What the code-review fixes changed in the harness since the previous section | `git diff -U0 cceaf000 HEAD -- scripts/bench/ab.sh` | four hunks, at lines 10 (header comment: a count below 4 is refused in both modes), 20 (the exit-code comment), 28 (the usage text, now `<rounds> must be even and at least 4: …`) and 31 (the `rounds_ok` pattern, which gains `2`); nothing else in the script differs | PASS |
| What the phase and its fixes changed in the spec register, and the revisions | `git diff -U0 0e3f3438 HEAD -- spec/README.md`, and `node scripts/spec-revise.mjs --check < /dev/null` (shared) | 3 insertions and 2 deletions: the Revision header (1.274 to 1.276), the Change History cell (the 1.276 and 1.275 entries in front) and one added row, CCR-QD-460, at line 397; no existing row is removed or edited, so the CCR-QD-458 row is still at line 395 and the 1.272 entry the report cites is still in the cell; `spec-revise` exit 0, `spec-revise: every Revision matches its newest Change History entry` | PASS |
| The documents Truths 5 and 6 read are unchanged | `git diff --name-only 0e3f3438 HEAD -- AGENTS.md spec/behaviors/21-decision-cache.md spec/process/house-rules-evidence.md spec/invariants.md spec/traceability.md` | 0 files, so BEH-QD-166, INV-QD-379, the rows of traceability and the house-rules section the truths read are as the earlier sections left them | PASS |
| Traceability | `bash spec/scripts/verify-traceability.sh --strict < /dev/null` (shared) | exit 0; `PASS: 21   FAIL: 0   SKIP: 0 (strict: skips count as failures)` | PASS |

### Changed cited files read against the truths that cite them (Re-verification (2026-11-22, after the 68.1 code-review fixes))

- `scripts/bench/ab.sh` (`70574a33`): the report names it only in the previous section's list of the scripts that changed in the phase, none of which a truth reads, and not in its own truths. The commit makes the harness refuse a round count below 4 as well as an odd one (usage text, header comment and the `rounds_ok` pattern); no truth of this report reads the harness, so no truth changes.
- `spec/README.md` (covered; `79a685b4`): the report cites the CCR-QD-458 row and Revision 1.272 (Truth 6). The row is unedited at line 395 and the 1.272 entry remains in the Change History cell; the commit moves the revision to 1.276, adds a Change History entry and rewrites the CCR-QD-460 row to scope its odd-round-count and hang claims, which no truth of this report reads. The digest changes because this file is covered, and no other covered file changed.

**Verdict:** passed
