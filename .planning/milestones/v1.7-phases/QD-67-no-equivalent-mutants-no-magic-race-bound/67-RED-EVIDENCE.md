---
phase_base: eacf89b4b3ab9ef6189312ab904f7d4943714550
race_test_sha256: 89ea0a7f4bcf49cd03a2bcc82e4cf2e169fc5ae3fab929616afdf88bad03e762
---

# Phase 67 race test evidence

The race test is `DecisionCache.test.ts`'s "a joiner racing its owner's completion never recomputes the key, and FIFO
stays exact". Every number below was measured on `phase_base` plus the one test-file commit of this plan, with
`SharedComputation.ts` at its base SHA-256 `3b2a7887a9ba242d71e1ee68f23d3b116c4023eabb45bc90513afb77b0128f6b`, nothing
else running. Logs are scratch (`$TMPDIR/qd67`) and are not committed.

## Green on the base

`pnpm exec vitest run --project core packages/core/test/DecisionCache.test.ts --reporter=json --outputFile=<S>/race-green-<i>.json`
(stdin closed), three times:

| Run | Tests | Failed | Race test duration |
| --- | --- | --- | --- |
| 1 | 42 | 0 | 263.4 ms |
| 2 | 42 | 0 | 261.2 ms |
| 3 | 42 | 0 | 260.2 ms |

## Iterations and time

The "before" column is the fixed sweep `gap <= 48`: 49 runs a budget. Its switch-over gap, the first gap that lands
after the owner finished, was measured at plan time as 38, 22, 15 and 13. The "after" columns are this run's, read from
a scratch `race-sides <budget> <seen>` line written before the per-budget assertion (the scratch line was removed
before the commit; the file's SHA-256 above is the committed one).

| Budget | Before: runs | Before: switch-over gap | After: `coalesced` | After: `hit` | After: `miss` | After: runs |
| --- | --- | --- | --- | --- | --- | --- |
| 3 | 49 | 38 | 38 | 4 | 0 | 42 |
| 4 | 49 | 22 | 22 | 4 | 0 | 26 |
| 5 | 49 | 15 | 15 | 4 | 0 | 19 |
| 6 | 49 | 13 | 13 | 4 | 0 | 17 |
| Total | 196 | | | | | 104 |

Each budget stops at `gap + 1 + margin`: the first `hit` is at gap `coalesced`, so the run count is `coalesced + 4`.
The race test takes about 0.26 s in the three green runs; the file's 42 tests take about 0.53 s of vitest wall time.
The cap of 512 and the margin of 3 are a cap and a margin, not measurements of `walk`'s step count.

## Red with the hit check split

The scratch patch `pre-i5-split.patch` (SHA-256 `bca12bb44b1176e56e45ff1e9f8210772cb88b57e32400638d122fd626f0b4d4`, never
committed) moves the hit check out of the claim step into an `Effect.sync` of its own before it, the shape before the
single-step claim. Applied to the base `SharedComputation.ts` only, then reversed; the source's SHA-256 was checked back
to the base value afterwards.

`pnpm exec vitest run --project core packages/core/test/DecisionCache.test.ts -t "a joiner racing its owner"`

It exits 1 (`Tests  1 failed | 41 skipped (42)`, 530 ms). The assertion `raced` equal to `[]` fails, its diff naming:

```
budget 3 gap 38: {"joined":"miss","kWalks":2,"followOn":["miss","miss","miss","miss"]}
budget 4 gap 21: {"joined":"miss","kWalks":2,"followOn":["miss","miss","miss","miss"]}
budget 6 gap 12: {"joined":"miss","kWalks":2,"followOn":["miss","miss","miss","miss"]}
```

`kWalks` is 2: the key was walked twice, a recompute. The failing gaps (38, 21 and 12) are at or one gap before the
base's switch-over gaps (38, 22 and 13). With the split reversed the same command passes.

## The cap

A scratch change on a kept copy of the test file, never committed: `let ownerSpin = 3;` replaced by
`let ownerSpin = 520;`, so the owner spins past every one of the 512 gaps and no budget can see a `hit`. The file was
restored from the copy and its SHA-256 checked afterwards.

`pnpm exec vitest run --project core packages/core/test/DecisionCache.test.ts -t "a joiner racing its owner"`

It exits 1 in 17.85 s of vitest duration (18 s wall), with no `Test timed out`, failing through the cap. The
`capped` assertion's diff names:

```
budget 3: {"coalesced":512,"hit":0,"miss":0} in 512 gaps
budget 4: {"coalesced":512,"hit":0,"miss":0} in 512 gaps
budget 5: {"coalesced":512,"hit":0,"miss":0} in 512 gaps
budget 6: {"coalesced":512,"hit":0,"miss":0} in 512 gaps
```

## Timeouts

The vitest timeout of 30 000 ms stays. The green path takes about 0.26 s and the cap's failure about 18 s, so the
timeout only bounds a failure that must still be reported on a loaded runner rather than cut short; its comment says so.
Stryker's `timeoutMS` is 20 000 ms (`stryker.config.mjs`, not edited), against the 0.26 s green path.
