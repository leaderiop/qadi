---
phase: QD-56-the-gate-registry-watch-becomes-the-dock-model-s-third-feed
plan: 05
subsystem: devtools
tags: [gates-feed, twins, registry-watch, failure-policy, property-test]
requires: ["56-04"]
provides:
  - G38..G47, G42 b and GP2 in GatesFeed.test.ts, the green twins of M38..M47, M42 b and P2 against the feed alone
affects: [56-07, 56-13]
actuals:
  tokens: 9000
  tasks: 3
  commits: 3
plan_head_before: 73a3041dbca07a6b74c0206a7b2ee24552771d0e
plan_head_after: 7ce2f20e1ae798f50451d769dcacac9456165484
tech-stack:
  added: []
  patterns: ["a twin titled `G<n> (twin of M<n>)` that builds the feed alone with gateRegistryDouble and claims only the watch's half of its M case"]
key-files:
  created: []
  modified:
    - packages/devtools/test/model/GatesFeed.test.ts
key-decisions:
  - "GP2's oracle moves before its tick: the feed notifies from inside the tick, so the last-tick answer must already be the new one when a listener reads it"
requirements-completed: [GFED-03]
duration: 3min
completed: 2026-11-18
status: complete
---

# Phase QD-56 Plan 05: The remaining watch twins

Every remaining watch case of `DockModel.test.ts` (M38..M47, M42 b, P2) now has a green twin in `GatesFeed.test.ts` that builds the feed alone with `gateRegistryDouble.ts`; none of them found a defect in `GatesFeed.ts`, so no `fix(56-05)` commit exists.

## Task Commits

1. Task 1: `629d1cfc` `test(56-05): the gates feed's twins of M38..M41 (throwing reads and subscriptions)`.
2. Task 2: `6e0cebc3` `test(56-05): the gates feed's twins of M42..M47 (releases, mends, rendering, one configure)`.
3. Task 3: `7ce2f20e` `test(56-05): GP2, the gates feed's twin of P2`.

All three touch `GatesFeed.test.ts` alone and end with the trailer.

## Twin-to-M map

| Twin | M case | Claim run against the feed |
|---|---|---|
| G38 | M38 | swallowed notification throw reaches the snapshot; same message afresh and a change during it publish nothing; a different one publishes; `mendReads()` publishes `Read` |
| G39 | M39 | a tick with the registry failing publishes `asked` `Read` with `registry` still `Failed`; the next change still arrives |
| G40 | M40 | throwing `subscribe` is `Failed`; a working registry replaces it with one listener |
| G41 | M41 | a configure with a reads-throwing, then a subscribe-throwing registry never throws; `a` released once each time; close releases nothing more |
| G42 | M42 | a throwing release is not stated, the new registry is `Read` and notifies, the release is never called again, close calls the current one once |
| G42 b | M42 b | `Scope.close` over a throwing release exits with success and calls it once |
| G43 | M43 | a failed subscribe is retried by a configure with the same registry; the same failure afresh publishes nothing; a recovered registry is not subscribed again |
| G44 | M44 | a quiet mend stays `Failed` across a quiet tick, read again by a changed tick, a notification and a same-registry configure |
| G45 | M45 | a non-error thrown value compares by its rendering; `{ code: 503 }` publishes with `503` |
| G46 | M46 | the unrenderable Proxy reads exactly the registry fallback sentence through a configure, a re-read and a subscribe |
| G47 | M47 | one configure publishes one snapshot and reads no registry handed away (also: a new registry and thunk together still publish once) |
| GP2 | P2 | 60 sequences, seed 56: `registry` is `Read` of the registry's own array, `asked` is `Read` of the last tick's answer, a quiet tick keeps the reference, close leaves no listener |

G38..G41 closed T-56-07 and T-56-08's remaining claims together with G42, G42 b and G47 (`a.reads()` does not move after a swap; one release call; successful close).

## GP2

Duration 889 ms for the 60 sequences (about 0.9 s in the whole-file run of 26 cases); green on two runs back to back, alone and with `DockModel.test.ts` (93 cases).

## Verification

- `GatesFeed.test.ts` 26 cases pass; with `DockModel.test.ts` 93 pass, twice.
- Whole devtools project with `--exclude '**/QuestionsPanel.thunk.test.tsx'` (the D-03 test is RED by design until 56-07), nothing else excluded: 68 files, 1631 tests passed (1619 + the twelve new cases).
- `pnpm typecheck` exit 0; `pnpm lint` exit 0 (`house-style: 555 file(s) clean (3 declared switch(es))`), no finding in `GatesFeed.test.ts`.
- `DockModel.test.ts` has no commit since `phase_base` outside 56-03; the only `packages/*/src` file changed since `phase_base` is `GatesFeed.ts`.

## Deviations from Plan

**1. [Rule 3 - Blocking] The final verify script's src-diff pathspec matches nothing as written**
- **Found during:** Task 3 verification.
- **Issue:** `git diff --name-only <base> HEAD -- "packages/*/src"` prints nothing for files below those directories, so the "only the feed changed" check would pass vacuously (the same defect 56-04 recorded).
- **Fix:** ran the plan's script unchanged except for the pathspec `":(glob)packages/*/src/**"`; it reports `GatesFeed.ts` as the only src file and exits 0. No gate, budget or test was weakened.
- **Files modified:** none.

**2. [Rule 1 - Bug] GP2's first draft set its oracle after the tick**
- **Found during:** Task 3, first run.
- **Issue:** the feed notifies from inside the tick, so a listener read the new answer against a `lastTick` not yet moved ("on notify: asked [...], last tick []"). A defect of the new test, not of the feed: the M case it twins reads the poll's own reading, which moves before notifying.
- **Fix:** `lastTick` is assigned together with `asked`, before the tick. Same commit as GP2; the feed is unchanged.
- **Files modified:** `packages/devtools/test/model/GatesFeed.test.ts`.

**Total deviations:** 2 (a plan verify-script defect, and a bug in my own first draft of a test, both fixed in place). **Impact:** none on scope; no feed defect found, so no `fix(56-05)` commit.

## Known Stubs

None.

## Threat Flags

None.

## Next

Ready for 56-06 (`QuestionsView.Failed`, `JoinInput.questionsFailed`). 56-07 may delete the whole-model copies of M31..M47 and trim P2, every watch claim having a green twin (56-04 and this plan).

## Self-Check: PASSED

- `GatesFeed.test.ts` exists; `629d1cfc`, `6e0cebc3` and `7ce2f20e` are ancestors of HEAD, each ending with the trailer.
