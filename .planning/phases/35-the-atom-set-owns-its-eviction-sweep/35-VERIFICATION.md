---
phase: 35-the-atom-set-owns-its-eviction-sweep
verified: 2026-11-12T22:45:00Z
status: passed
score: 12/12 must-haves verified
covered_files:
  - ".changeset/atom-set-sweep.md"
  - ".planning/phases/35-the-atom-set-owns-its-eviction-sweep/35-01-PLAN.md"
  - ".planning/phases/35-the-atom-set-owns-its-eviction-sweep/35-01-SUMMARY.md"
  - ".planning/phases/35-the-atom-set-owns-its-eviction-sweep/35-02-PLAN.md"
  - ".planning/phases/35-the-atom-set-owns-its-eviction-sweep/35-02-SUMMARY.md"
  - ".planning/phases/35-the-atom-set-owns-its-eviction-sweep/35-03-PLAN.md"
  - ".planning/phases/35-the-atom-set-owns-its-eviction-sweep/35-03-SUMMARY.md"
  - ".planning/phases/35-the-atom-set-owns-its-eviction-sweep/35-04-PLAN.md"
  - ".planning/phases/35-the-atom-set-owns-its-eviction-sweep/35-04-SUMMARY.md"
  - ".planning/phases/35-the-atom-set-owns-its-eviction-sweep/35-05-PLAN.md"
  - ".planning/phases/35-the-atom-set-owns-its-eviction-sweep/35-05-SUMMARY.md"
  - ".planning/phases/35-the-atom-set-owns-its-eviction-sweep/35-06-PLAN.md"
  - ".planning/phases/35-the-atom-set-owns-its-eviction-sweep/35-06-SUMMARY.md"
  - ".planning/phases/35-the-atom-set-owns-its-eviction-sweep/35-07-PLAN.md"
  - ".planning/phases/35-the-atom-set-owns-its-eviction-sweep/35-07-SUMMARY.md"
  - "AGENTS.md"
  - "apps/website/src/content/docs/docs/reference/upgrading.md"
  - "packages/react/src/QadiAtoms.ts"
  - "packages/react/src/QadiProvider.tsx"
  - "packages/react/src/QuestionBook.ts"
  - "packages/react/src/SweepScheduler.ts"
  - "packages/react/test/QadiAtoms.sweep.test.ts"
  - "packages/react/test/QadiProvider.sweep.test.tsx"
  - "packages/react/test/QadiProvider.test.tsx"
  - "packages/react/test/QuestionBook.test.ts"
  - "packages/react/test/SweepScheduler.test.ts"
  - "packages/react/test/v4-reactivity-smoke.test.ts"
  - "spec/behaviors/09-react.md"
  - "spec/behaviors/25-inspection.md"
  - "spec/decisions/148-the-atom-set-owns-its-eviction-sweep.md"
  - "spec/invariants.md"
  - "spec/process/house-rules-evidence.md"
  - "spec/traceability.md"
covered_digest: "v4:sha256:1f4e872936e927fa70aeabcde1219b23c12a8774096e50a0103f3f1006453176"
behavior_unverified: 0
overrides_applied: 0
---

# Phase 35: The atom set owns its eviction sweep Verification Report

**Phase Goal:** Either the atom set enforces `maxTrackedQuestions` wherever it runs, with no provider, through a mechanism that meets every criterion, or the sweep stays in the provider and the rule is stated and tested.
**Verified:** 2026-11-12T22:45:00Z
**Status:** passed
**Re-verification:** No, initial verification

The mechanism branch of the goal was taken and holds in the code: an edge-triggered deferred sweep (`SweepScheduler.ts`), fed by a signal from `QuestionBook.ts`, owned by `makeQadiAtoms`. The provider forks nothing. Verified against the tree at HEAD 88408b20 (phase base 14dc8212), not from the SUMMARY claims.

## Goal Achievement

### Observable Truths

| #  | Truth | Status | Evidence |
| -- | ----- | ------ | -------- |
| 1  | Spike evidence and conclusion recorded: each mechanism tried in order against the SWEEP-02 criteria | VERIFIED | `35-SPIKE.md` has candidate 1 (two variants), 2 and 3, each with criteria (a) to (f) and the D-03 exclusions, each row quoting a command and a count. Candidate 1 release-plus-admission passes all, with e2e `30 passed (8.0s)` vs base `30 passed (7.2s)`. Release-only fails (b), (d), (e) (an opened-and-never-read question is unbounded) and is dropped. Candidate 3 is recorded as failing (one sweeper per registry). CCR-QD-426 and ADR-QD-148 repeat the ranking. |
| 2  | `maxTrackedQuestions` holds on a bare registry with no provider | VERIFIED | `QadiAtoms.ts` wires `signal: scheduler.request` into `makeQuestionBook`; `QuestionBook.ts` signals on admission past capacity (`admit`) and on a release that leaves a cold in-book entry over capacity. `QadiAtoms.sweep.test.ts` S1 ("holds the bound with no provider"), S4 and S5 pass (run: react project, 29 files, 475 tests passed). |
| 3  | The provider forks no sweep | VERIFIED | `git diff 14dc8212` on `QadiProvider.tsx`: the `useEffect` that ran `Effect.repeat(atoms.sweepEvictions, Schedule.spaced(...))`, the `Effect`/`Fiber`/`Schedule` imports, `DEFAULT_SWEEP_INTERVAL_MILLIS` and the prop are all deleted. `setTimeout` remains only for the pre-existing registry dispose timer. `QadiProvider.sweep.test.tsx` P1 and P5 and the reconciled `QadiProvider.test.tsx` pin ("returns to the bound after the provider unmounts") pass. |
| 4  | One sweep per pressure episode across N providers and N registries | VERIFIED | `SweepScheduler.ts`: a closure `pending` flag per atom set, `request` returns if pending, so one fiber per episode by construction. Tests: C2, C9 (four releases, four signals, one sweep), S2 and S9 (several registries over one atom set), P2 (three providers), P5 (two providers unmounted in one span). |
| 5  | No sweep on the render path or inside the dispose-then-reread window | VERIFIED | The book only calls `signal`; it never sweeps in-line. The episode is `Effect.yieldNow` then `Effect.sync(sweep)`, so the sweep runs after the signalling call returns. C1 asserts "never during"; S3 (a signal raised inside the dispose-then-reread window keeps the recomputed question), S4 (render-path opens are swept only after the call returns), S7 (late commit re-admitted). `v4-reactivity-smoke.test.ts` gained the registry-timing pins the deferral relies on (dispose runs finalizers before it returns; the last unsubscribe removes a node a macrotask later; a `yieldNow`-first fork raised in a recompute's finalizer runs after the re-read). No `scheduleTask` or `defaultIdleTTL` token in `packages/react/src` code. |
| 6  | No leaked fibers | VERIFIED | Each episode fiber is one-shot with no timer. C7 (300 schedulers over real books leave every fiber done and none pending), S8 (a sweep pending when the registry is disposed runs harmlessly), C11 (the WR-01 fix: a throwing fork clears the flag and rethrows). The spike's F1 (300 atom sets) shows no added `Timeout` or `Immediate` handles. |
| 7  | StrictMode and a hidden `<Activity>` hold | VERIFIED | `QadiProvider.sweep.test.tsx` P3 (StrictMode: bound holds, mounted gate's question kept) and P4 (provider hidden then shown inside an Activity). Structural reason: the provider owns no sweep, so a second effect run cannot create a second sweeper. The example e2e (`pnpm example`) passed, 30 tests. |
| 8  | `sweepIntervalMillis` and `sweepEvictions` are removed, recorded as Breaking | VERIFIED | A repo-wide grep (excluding `.planning`) finds the two names only in `.changeset/atom-set-sweep.md`, `upgrading.md`, ADR-QD-148, the CCR-QD-426 row, the BEH 09 change history, and the quoted history in `house-rules-evidence.md`. None is in `packages/*/src`, tests, examples or the website outside the upgrade guide. `.changeset/atom-set-sweep.md` is `@qadi/react` minor with two **Breaking** paragraphs, one per removal. `upgrading.md` gains "0.12: the atom set holds its own bound" with a before and after, the after being the same shape as the compiled doc fences. `.changeset/question-book.md` was reworded to drop the stale `sweepEvictions` reference. |
| 9  | Records exist: ADR-QD-148, CCR-QD-426, BEH-QD-511..515, INV-QD-315..316, traceability | VERIFIED | ADR-QD-148 file plus an `index.yaml` row ("Accepted, amends ADR-QD-014, ADR-QD-103"). CCR-QD-426 row in `spec/README.md`. BEH-QD-511 in `25-inspection.md`, BEH-QD-512..515 in `09-react.md` (Rev 3.6; BEH-QD-065 restated). INV-QD-315 and INV-QD-316 in `invariants.md`. `traceability.md` has the 09 and 25 rows, the INV rows, the ADR row and five test-file rows (the S, C, P and B case names). `pnpm spec:gates` (dod-table) and `pnpm spec:api` (916 exports documented, no new rows needed since the module is out of the barrel) pass. The orchestrator's `pnpm check:pr` run, which includes `spec:verify:strict`, exited 0. |
| 10 | AGENTS.md §13 amended; `house-rules-evidence.md` §4 describes the outcome | VERIFIED | `git diff` on `AGENTS.md` shows one sentence replaced: the `sweepEvictions` fork is now the atom set's own deferred one-shot sweep (ADR-QD-148), with `scheduleTask`/`defaultIdleTTL` still off limits. `house-rules-evidence.md` Rev 1.1 adds a dated §4 addendum and leaves the quoted history unchanged. The human approval is recorded in the phase brief. |
| 11 | Reconciled pin and new `@stability unstable` reliance pinned (SC4) | VERIFIED | `QadiProvider.test.tsx`: "stops sweeping once the provider unmounts" became "returns to the bound after the provider unmounts"; the "periodically evicts" pin became "evicts a cold question past the bound, never a mounted gate's own". The registry timings the deferral relies on are pinned in `v4-reactivity-smoke.test.ts`. |
| 12 | Mutation scores did not fall | VERIFIED | Base and after: `QuestionBook.ts` 0.944 to 0.966, `QadiAtoms.ts` 0.895 to 0.897, `QadiProvider.tsx` 0.75 to 0.809, `SweepScheduler.ts` new at 1.0. The recorded `35-mutation-after.json` predates the WR-01 fix (230cf975), so I re-ran `stryker run stryker.react.mjs` on HEAD: `QuestionBook.ts` 96.59, `SweepScheduler.ts` 100.00, `DecisionOutcome.ts` 100, `HydrationEvent.ts` 100, overall 98.00. This is at or above the base, so the fix kept the score. The three surviving mutants are all at `QuestionBook.ts:169` (`if (excess <= 0) return;`), an early-out equivalent mutant with the same behavior, and they are already counted in the 0.966. |

**Score:** 12/12 truths verified (0 present, behavior-unverified)

Truths 4 to 7 are behavior-dependent (state transitions, ordering and cleanup invariants). Each has a named, passing behavioral test in the react project, so presence alone was not accepted as evidence (Step 3).

### Required Artifacts

| Artifact | Expected | Status | Details |
| -------- | -------- | ------ | ------- |
| `packages/react/src/SweepScheduler.ts` | pending-flag coalescer, one-shot `yieldNow`-first episode, private fork slot for tests | VERIFIED | 101 lines; no timer, no module-scope state; the fork carrier is a class-private slot (the `GateWriter.ts` pattern). Out of the barrel. |
| `packages/react/src/QuestionBook.ts` | `signal` option; admission and release triggers | VERIFIED | The `inBook` guard on release suppresses the orphan-release spurious signal (spike O1). |
| `packages/react/src/QadiAtoms.ts` | scheduler wired to the book; `sweepEvictions` removed | VERIFIED | `makeSweepScheduler(() => book.sweep(), sweepForkOf(options))`; no `sweepEvictions` member. |
| `packages/react/src/QadiProvider.tsx` | no sweep fork, no interval prop | VERIFIED | See truth 3. |
| Test files (S, C, P, B cases) | pins on the base, then flipped where they stated the old owner | VERIFIED | 475 tests pass in the react project. |

### Key Link Verification

| From | To | Via | Status | Details |
| ---- | -- | --- | ------ | ------- |
| `QuestionBook.admit` / release | `SweepScheduler.request` | `BookOptions.signal` | WIRED | `signal?.()` at both trigger points; `signal: scheduler.request` in `QadiAtoms.ts`. |
| `SweepScheduler` episode | `QuestionBook.sweep` | `makeSweepScheduler(() => book.sweep(), ...)` | WIRED | One caller. |
| Provider | Sweep | none | NONE, by design | The provider holds no reference to a sweep. |

### Data-Flow Trace (Level 4)

Not applicable: the phase renders no dynamic data. The sweep mutates the book that backs `asked()`, and S1/S4/P1 assert `asked()` returns to the bound.

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
| -------- | ------- | ------ | ------ |
| react project passes | `pnpm vitest run --project react` | 29 files, 475 tests passed | PASS |
| Mutation not fallen (final tree) | `stryker run stryker.react.mjs` | 98.00 overall; SweepScheduler 100, QuestionBook 96.59 | PASS |
| Spec gates | `pnpm spec:gates`, `pnpm spec:api` | dod-table 25 steps match; 916 exports documented | PASS |
| Full merge gate (orchestrator) | `pnpm check:pr < /dev/null` | exit 0; Tests 4852, 568 and 42 passed; Playwright 30 passed | PASS (taken from the orchestrator's log; the log's tail confirms "ran 16 of 17 steps") |

### Probe Execution

No phase-declared probes. Step 7c skipped.

### Requirements Coverage

| Requirement | Description | Status | Evidence |
| ----------- | ----------- | ------ | -------- |
| SWEEP-01 | spike in research order, exclusions honored, evidence recorded | SATISFIED | `35-SPIKE.md`; truths 1 and 5 |
| SWEEP-02 | every acceptance criterion | SATISFIED | spike criteria (a) to (f); truths 4 to 7; e2e 30 passed |
| SWEEP-03 | bound holds with no provider; provider forks none; `sweepIntervalMillis` removed (Breaking) | SATISFIED | truths 2, 3 and 8 |
| SWEEP-04 | fallback branch | N/A | The mechanism branch passed; the "stays over the bound after unmount" pin is reconciled anyway (truth 11). |
| SWEEP-05 | AGENTS.md §13 and evidence §4 describe the outcome; unstable API pinned | SATISFIED | truths 10 and 11 |
| WX-01 | `check:pr` green | SATISFIED | orchestrator log, exit 0 |
| WX-02 | ADR, CCR and BEH/INV used, reserved numbers only | SATISFIED | truth 9. ARCH-83, ADR-QD-148, CCR-QD-426, BEH-QD-511..515 and INV-QD-315..316 are used and no other number is minted. |
| WX-03 | overview names exports | SATISFIED | gate 13 passes. The scheduler is package-private and the two removed members were never rows. |
| WX-04 | no new `as`, `!`, `any`, `switch`, `fnUntraced`, `async`, `console`, clock | SATISFIED | A grep of the `packages/react/src` diff finds only the word "as" in comments; `house-style` is inside `check:pr`. |
| WX-05 | coverage and mutation do not fall | SATISFIED | truth 12 |
| WX-06 | pins written on the base | SATISFIED | Commit order: 35-01 pins (c317446e, c2333e7d) and the baseline come before the 35-04/05 changes; the two pins that stated the old owner were flipped in the changing commits. |
| WX-07 | Breaking recorded; nothing released | SATISFIED | truth 8; no version bump or release in the diff |

No orphaned requirements: every SWEEP and WX id mapped to Phase 35 appears in the plans.

### Anti-Patterns Found

None. No `TBD`, `FIXME`, `XXX`, `TODO` or `HACK` in the touched source or new tests. The code review's four findings (WR-01, IN-01 to IN-03) are all dispositioned `fixed` (open: 0), and C11 covers WR-01.

### Human Verification Required

None blocking. One advisory, decided below.

**Late render commit at the bound under 6x CPU throttle (35-07-SUMMARY "human_needed"): adequately covered, so it does not make the status `human_needed`.**

- The risk is a render-phase read of a new question that commits after the deferred sweep ran: the registry has released the uncommitted node, the sweep evicts the question, and the late commit must re-admit it. This is a state-transition invariant, so I looked for behavioral evidence and found it. S7 ("a render-phase read that commits late is evicted at the bound and re-admitted once by its commit") exercises exactly this on the real book, registry and scheduler. The spike's L1 case measured the same sequence on the real tree. The mechanism is `live()` re-admitting an evicted entry whose key is free (`QuestionBook.ts`, `if (!entry.inBook && !MutableHashMap.has(entries, entry.key)) admit(entry)`).
- The worst outcome the design allows is a transient absence from `asked()` at the bound, which heals on the commit. The outcome is that a decision is never lost or double-evaluated, and S7 pins it.
- The browser evidence that matters, no dropped render under real Suspense and real timers (the CCR-QD-150 failure), is the e2e: 30 passed in Chromium, against the base's 30. The throttle only changes timing, and S7 covers the ordering without timing.
- The check is a UX smoke ("no flash of a stale decision") and the e2e covers its substance. It is optional for the maintainer.

### Gaps Summary

No gaps. One caveat the record already states and I confirmed in the code: `SweepScheduler.ts` documents that a runtime that discards the default fork's timer would leave an episode suspended with the flag set. Node and browsers do not do this, so it is a documented limit and not a defect.

---

_Verified: 2026-11-12T22:45:00Z_
_Verifier: Claude (gsd-verifier)_
