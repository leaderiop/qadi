# Phase 35: The atom set owns its eviction sweep - Research

**Researched:** 2026-11-12
**Domain:** `effect/reactivity` `AtomRegistry` lifecycle timing, Effect v4 fiber scheduling, `@qadi/react` question book
**Confidence:** HIGH on registry/scheduler mechanics (source read plus measured probes); MEDIUM on browser timing (source-read only) and on e2e behaviour (not run)

Provenance tags used below. `[VERIFIED: path:lines]` means the file was opened this session and the quoted text is verbatim. `[MEASURED: script]` means a probe was run this session and its output is quoted (scripts live under `/private/tmp/claude-502/-Users-mohammadalmechkor-Projects-Perso-qadi/13b3a680-6983-4c4f-9cad-4ed79d71ff4f/scratchpad/p35-research/`, called `$P` below). `[ASSUMED]` is unverified. No source file in the repo was modified; the prototype for candidate 1 lives only in `$P/proto/` (a copy of `packages/react/src` and `test`).

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

The user's standing direction: "the most clean solution, the most complete, not the simplest. We don't care about complexity." The user chose each grey area below explicitly on 2026-11-12.

**The spike (SWEEP-01, SWEEP-02)**
- **D-01 All three candidates are measured; the cleanest passing one is chosen.** The spike does not stop at the first pass. It runs each candidate against every SWEEP-02 criterion (D-04) and records the evidence, then chooses. The candidates, in research order:
  1. **Edge-triggered deferred sweep.** The book signals pressure. The atom set coalesces signals behind one pending flag and forks `Effect.yieldNow` then the sweep, once. The fiber is one-shot: no timer, and no lifetime to tear down.
  2. **Self-terminating book-level fiber.** When the book first goes over capacity, a fiber is forked. It sweeps on a schedule and exits once the book is within the bound, or once everything over the bound is live.
  3. **Layer-scoped periodic fork.** The atom set's runtime layer owns a scoped repeating sweep, so its lifetime is the runtime's lifetime in each registry.
- **D-02 The rule for choosing among passing candidates is fixed now**, so the spike's conclusion needs no further checkpoint. "Cleanest" means, in priority order: no timer or interval; no fiber lifetime that something must tear down; one sweeper per atom set by construction, rather than by a guard; fewest moving parts. That ranks the candidates 1, 2, 3, so the edge-triggered sweep wins if it passes.
- **D-03 Hard exclusions (any candidate that needs one fails outright):** `scheduleTask` or `defaultIdleTTL` (they reroute dispatch and dropped a required render, CCR-QD-150); a sweep run synchronously from the render path; a sweep inside the registry's synchronous dispose-then-reread window (`NodeImpl.invalidate`), which is why there is no synchronous sweep-on-`open`; a module-scope timer or any other module-scope state.
- **D-04 The SWEEP-02 criteria are concrete tests, written once, run per candidate.** Every one passes, or the candidate is rejected: (a) Dispose-reread smoke: `v4-reactivity-smoke.test.ts` stays green, and the sweep across an invalidation and across a recompute in `QadiAtoms.test.ts` stays green. (b) Existing sweep pins: the `QadiAtoms.test.ts` eviction suite keeps its assertions (oldest cold first, never a live entry, re-admission, best-effort when every entry is live); only the trigger changes. (c) e2e: `examples/nextjs-newsroom` passes unchanged under `pnpm example`, about 30 Playwright tests; Chromium 1.65 from the pnpm store ran headless for Phase 34's browser checks. (d) One sweep per atom set, however many providers or registries share it: N providers, or N bare registries, over one atom set produce one sweep per pressure episode, not N. (e) No second sweeper under `<StrictMode>`'s double effects or across a hidden then shown `<Activity>`. (f) No leaked fibers: after many atom sets are built, used past the bound and released, no sweep fiber is left running.
- **D-05 Trigger points for the edge-triggered candidate.** The book signals pressure: when a release brings an entry to zero while the book is over capacity; when an admission takes the book past capacity. A signal never sweeps synchronously. It only sets the pending flag and forks, and the forked fiber begins with `Effect.yieldNow`, because `runFork` runs synchronously to its first yield. The spike checks that a signal raised from `open` (the render path) or from inside a release in the dispose-reread window only ever sweeps after that window. If admission-signalling cannot be shown safe, the spike records that, and the admission trigger is dropped in favour of release-only plus whatever bounds never-read cold admissions.
- **D-06 `QuestionBook.ts` stays free of `effect` imports.** The book takes a package-private scheduling seam from its options, for example `signal: () => void`, which `QadiAtoms.ts` implements with the coalescing deferred fork. Book tests drive the seam with a plain counting function, which is also how criterion (d) counts sweeps without a public test hook. `QuestionBook` is not exported, so the seam is not public API.
- **D-07 Spike shape and artifacts.** The spike is plan 35-01, and its record is `35-SPIKE.md` in the phase directory: each candidate, each criterion, the evidence (test names, e2e run output and counts), pass or fail, and why. It ends with the conclusion and the D-02 ranking applied. The criterion tests (D-04 b, d, e, f) are permanent tests and are committed. Candidate prototypes that lose are not committed to `src`; they live on the working tree only for their measurement, or in a scratch worktree, and are reverted. The e2e is run once per candidate that passes the unit criteria. A candidate that fails a unit criterion does not need an e2e run, but its failure is recorded.

**The fallback (SWEEP-04)**
- **D-08 Full evidence plus a stated rule.** If no candidate passes, the sweep stays in the provider, and the phase records: for each candidate, the exact criterion it failed and the test or e2e run that showed it; in the spec (`spec/behaviors/09-react.md`, `25-inspection.md`) and in the `QadiAtoms` and `QadiProvider` doc comments, what happens with no provider (the bound does not hold until something sweeps) and with several providers; tests pinning both of those rules. ADR-QD-148 is then Unused in the CCR-QD-426 row.

**The old knobs (SWEEP-03)**
- **D-09 Remove both `sweepIntervalMillis` and `QadiAtoms.sweepEvictions`, recorded as Breaking.** If the winning mechanism needs no interval: `QadiProviderProps.sweepIntervalMillis` and `DEFAULT_SWEEP_INTERVAL_MILLIS` are deleted, along with the provider's sweep `useEffect`; `sweepEvictions` leaves the public `QadiAtoms` interface, because the atom set enforces its own bound and a manual sweep would be a second way to do one thing. If the winner needs an interval (candidate 2 or 3), the interval moves to `QadiAtomsOptions`, and `sweepEvictions` is still removed. No inert prop is kept for compatibility. Both removals go in the `@qadi/react` changeset under **Breaking** and get a section in `upgrading.md`. In the fallback case (D-08), both knobs stay.
- **D-10 Tests that called `Effect.runSync(set.sweepEvictions)` are rewritten** to drive the mechanism: release, then settle the scheduler (a `settleTurns`-style helper, as in Phase 34) or adjust the `TestClock`. Their assertions do not change.

**Pins and characterisation (SWEEP-03, SWEEP-04, WX-06)**
- **D-11 Characterisation first, on the phase base.** Before any `src` change, a commit pins today's behaviour: no provider means no sweep; several providers mean several sweepers; a provider unmount leaves the book over the bound (the existing pin). The commit that changes each behaviour flips its pin, with the reason in the commit, the house pattern from Phase 34 (K5, L3, L4).
- **D-12 A bare-registry graph test** shows `maxTrackedQuestions` holding with no provider: an `AtomRegistry` and an atom set, questions pushed past the bound, readers released, the scheduler settled, and `asked()` back at the bound. This is the SWEEP-03 acceptance test.
- **D-13 `QadiProvider.test.tsx`'s "stays over the bound after unmount" pin is reconciled.** If a mechanism lands, it flips to "returns to the bound after unmount". In the fallback it stays and is cited by the stated rule.
- **D-14 New reliance on any `@stability unstable` atom API is pinned** in `v4-reactivity-smoke.test.ts`, for example finalizer timing relative to `registry.dispose()`, or the dispose-reread ordering the trigger depends on.

**Records and house rules (SWEEP-05, WX-01..07)**
- **D-15 The user approved the AGENTS.md §13 edit on 2026-11-12.** §13's `maxTrackedQuestions` sentence is amended to the outcome: the mechanism, the criteria it met, and that `scheduleTask`/`defaultIdleTTL` stay off limits. `spec/process/house-rules-evidence.md` §4 gets an addendum describing the outcome, and its quoted history is not rewritten. CCR history rows are not rewritten. The amendment lands in the phase's records commit.
- **D-16 Records.** ADR-QD-148 is new if a mechanism lands: "The atom set owns its eviction sweep". It cites the spike, and amends ADR-QD-014/CCR-QD-150's provider-fork clause. CCR-QD-426 is the change row. BEH-QD-511..515 cover the bound holding without a provider, one sweeper per atom set, the trigger and deferral, the removals and the unmount behaviour. INV-QD-315..316: one sweeper per atom set; a sweep never runs on the render path or inside the dispose-reread window. Traceability, `spec/README.md`, and `spec/overview.md` (gate 13: removed exports, if `sweepEvictions` appears there). Every date is 2026-11-12 (`scripts/spec-revise.mjs --date 2026-11-12`). Only reserved ids are used; `scripts/next-id.mjs` is never run.
- **D-17 Mutation.** `stryker.react.mjs` is compared before and after on the touched files (`QuestionBook.ts`, `QadiAtoms.ts`, `QadiProvider.tsx`), with `35-mutation-base.json` committed alone as the first plan commit, as in Phase 34. Scores do not fall, and survivors are named.

### Claude's Discretion
- The exact name and shape of the book's scheduling seam (D-06), and of any test helper for settling the deferred sweep.
- How criterion (f) observes fibers, for example a `Supervisor` or the counting seam.
- Plan count and wave split beyond the fixed order: mutation base, then characterisation pins, then spike, then implementation, then records, then the gate.

### Deferred Ideas (OUT OF SCOPE)
- Phase 34's polish items (the screen root's thin default focus ring, and the restart button's unmeasured contrast) are carried to Phase 36, not this phase.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SWEEP-01 | Spike tries candidates in order; never `scheduleTask`/`defaultIdleTTL`, render-path sweep, dispose-reread sweep, module-scope timer | Q1/Q2 give the exact release timing per path; candidate 1 prototype measured (P1-P9) |
| SWEEP-02 | Acceptance criteria (a)-(f) | Q4 harnesses; prototype passed all unit criteria in scratch; (c) e2e not run, command established (Q6) |
| SWEEP-03 | Bound holds with no provider; provider forks nothing; `sweepIntervalMillis` removed or moved | P1 (bare registry graph test passes on the prototype); Q7 inventory of every reference to delete |
| SWEEP-04 | Fallback: stated rule plus tests (no provider, several providers) | Baseline characterisation of both rules measured with no mocks (`CHARS` result, Q4) |
| SWEEP-05 | AGENTS.md §13 and `house-rules-evidence.md` §4; pin new unstable-API reliance | Q7 names the exact lines; D-14 pin list in Common Pitfalls / Validation |
| WX-01..07 | Gate, records, exports, house rules, coverage and mutation, characterisation, Breaking | Q7 (records), Q8 (mutation scope gap), Validation Architecture |
</phase_requirements>

## Summary

The registry's release timing splits cleanly into two classes, and the split is what makes the edge-triggered candidate safe. A recompute (`Reactivity.invalidate`, a dependency write, an async result arriving through `setSelf`) disposes the reader's lifetime and rebuilds it inside one synchronous call stack, so the finalizer (our `release`) and the next `live()` run back to back with nothing between them. Every other release (the last subscriber unmounting, node removal after a render-phase read nobody subscribed to, `registry.dispose()`) is either deferred to a later macrotask (`setImmediate` on Node, `setTimeout(0)` otherwise) or runs synchronously inside `dispose()`. A fiber started with `Effect.runFork(Effect.yieldNow.pipe(Effect.andThen(...)))` runs nothing synchronously, and its continuation lands in a `setImmediate`-class macrotask scheduled at yield time. So a release-triggered or admission-triggered deferred sweep can never run inside a dispose-reread window, regardless of which path raised the signal. [MEASURED: `$P/probe1-order.mjs`, `$P/proto/test/proto.sweep.test.tsx` P3].

Candidate 1 was prototyped in scratch (`$P/proto`: a `signal` option on `makeQuestionBook`, a coalescing `Effect.runFork` in `makeQadiAtoms`, the provider's sweep effect deleted). The whole existing react suite passes on it (436 of 437 tests; the one failure is the "stops sweeping once the provider unmounts" pin, which is the expected flip per D-13), and nine new probe tests passed: bare-registry bound (SWEEP-03), 12 releases across 4 registries produce exactly 1 sweep, no sweep inside `registry.set(invalidate)`, no sweep from `open()`, no sweeps under `<StrictMode>` plus hidden/shown `<Activity>` without pressure, 300 atom sets leave no `Immediate`/`Timeout` handles. Candidate 3 fails criterion (d) by construction: an `Atom.runtime` layer is built once per registry that reads it, never by a registry that does not, and rebuilt after the runtime node is removed [MEASURED: `$P/probe3-layer.mjs`]. Candidate 2 needs an interval and still needs release signals to restart after an all-live exit, so it is candidate 1 plus a timer.

Three things the planner must not miss. (1) A render-phase `registry.get` that is not subscribed within one macrotask has its node removed (`createNode` schedules `scheduleAtomRemoval`), which releases the question, which with candidate 1 can evict it from the book before the late commit re-reads it; re-admission on the next `live()` recovers it, with a transient absence from `asked()` [MEASURED: P9]. (2) `stryker.react.mjs` mutates only `DecisionOutcome.ts`, `QuestionBook.ts` and `HydrationEvent.ts`; D-17's "touched files" `QadiAtoms.ts` and `QadiProvider.tsx` are outside it. (3) A pre-existing defect, found while building the `<Activity>` harness and out of scope for this phase: the `subject` atom is not `keepAlive`, so its seeded value is lost once the last decision atom unmounts [MEASURED: `$P/proto/base/test/subj.test.ts`].

**Primary recommendation:** Spike candidate 1 first with release and admission signals into a package-private coalescer (its own module, `signal` seam in `makeQuestionBook` options), settle tests with two or more `Effect.yieldNow` (or `vi.waitFor`), count sweeps with the seam rather than module mocks, run the e2e once with `pnpm build` then `pnpm --filter @qadi/example-nextjs build` then `test:e2e` (Chromium 1254 is already installed), and add `packages/react/src/QadiAtoms.ts` plus the new module to the Stryker run with the CLI `--mutate` override.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Bound on tracked questions (`maxTrackedQuestions`) | Atom layer (`QadiAtoms` closure) | — | Owned per atom set, no React, no registry knowledge (QuestionBook.ts header, AGENTS.md §13) |
| Pressure detection (over capacity, entry reaches zero) | Question book (`QuestionBook.ts`) | — | Only the book knows counts and order; stays free of `effect` imports (D-06) |
| Deferral and coalescing of the sweep | Atom layer (`QadiAtoms.ts` or a package-private module it imports) | — | Needs `Effect.runFork`/`yieldNow`; owned per atom set, not per registry or provider |
| Liveness signal (reader holds a question) | `effect/reactivity` `AtomRegistry` finalizers | Question book (`live()`/`release`) | The registry decides when a finalizer runs; the book only counts |
| Provider | React tier (`QadiProvider.tsx`) | — | After the phase it forks nothing; keeps registry creation and delayed dispose only |
| e2e proof of no dropped render | Browser (Playwright, Chromium) | — | Only a real engine under real timing catches CCR-QD-150's failure |

## Standard Stack

No new dependency. Every API used is already imported somewhere in `packages/react/src`.

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `effect` | 4.1.2 | `Effect.runFork`, `Effect.yieldNow`, `Effect.sync`, `Fiber`, `Schedule` (candidate 2 only), `effect/reactivity/*` | The repo's runtime; confirmed `"version": "4.1.2"` in `node_modules/effect/package.json` and `pnpm-lock.yaml` (`effect@4.1.2`) [VERIFIED: node_modules/effect/package.json] |
| `@effect/atom-react` | 4.1.2 | `useAtomValue`, `RegistryContext` | Already a dependency [VERIFIED: node_modules/@effect/atom-react/package.json] |

### Supporting (tests only)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@effect/vitest` | catalog | `it.effect`, `Effect.yieldNow` settling | Pure scheduler tests of the coalescer; `HydrationEngine.test.ts` already imports it |
| `@testing-library/react` + `happy-dom` ^21.0.4 | catalog | StrictMode / `<Activity>` provider tests | The existing provider tests; `packages/devtools/test/react/*Lifetime.test.tsx` is the style precedent |
| `vitest` | 5.1.0 | runner; `vi.waitFor` | Run from repo root: `pnpm vitest run --project react <file>` (verified) |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Candidate 1 | Candidate 2 (`Effect.repeat` with `until`) | Needs `sweepIntervalMillis` moved into `QadiAtomsOptions` (D-09), a fiber that outlives its trigger, and a single-flight flag; loses D-02 ranks 1 and 2 |
| Candidate 1 | Candidate 3 (layer-scoped fork) | Fails (d) by construction (per-registry build); needs a claim guard and a hand-over when the claiming registry closes |

**Package legitimacy:** the phase installs no external packages, so the Package Legitimacy Gate (`gsd_run query package-legitimacy check`) does not apply. No `## Package Legitimacy Audit` table is needed.

**Installation:** none.

## Architecture Patterns

### System Architecture Diagram

```
 reader runs (render-phase registry.get, mount, recompute)
        |  get.addFinalizer(live())            QadiAtoms.ts:316-318
        v
 +-----------------------------+      admit() when entry created/re-admitted
 | QuestionBook (counts, order)|----> order.length > capacity ?  --+
 | liveCount per entry          |                                   |
 +-----------------------------+                                    | signal()
        ^                                                           v
        | release() finalizer                                 +-----------------+
        |  (entry hits 0 AND order.length > capacity) -------> | coalescer       |
        |                                                     | pending flag    |
 AtomRegistry paths that run the finalizer:                   | (per atom set)  |
  (i)  recompute: dispose + re-read, ONE sync stack           +--------+--------+
  (ii) last unsubscribe -> scheduleNodeRemoval -> setImmediate        | if !pending:
  (iii) registry.dispose() -> sync inside dispose()                   | pending = true
  (iv) createNode -> scheduleAtomRemoval -> setImmediate              | Effect.runFork(
                                                                      |   yieldNow
                                                                      |   -> sync(pending=false; book.sweep()))
                                                                      v
                                              runFork returns immediately; continuation runs in a
                                              later setImmediate-class macrotask, after the current
                                              synchronous span (including any dispose-then-reread)
```

### Recommended Project Structure
```
packages/react/src/
├── QuestionBook.ts        # + `signal?: () => void` in BookOptions (no effect import)
├── SweepScheduler.ts      # NEW, package-private (not in index.ts): coalescer + injectable fork
├── QadiAtoms.ts           # wires book.signal -> scheduler.request; sweepEvictions removed
└── QadiProvider.tsx       # sweep useEffect, sweepIntervalMillis, DEFAULT_SWEEP_INTERVAL_MILLIS deleted
packages/react/test/
├── SweepScheduler.test.ts # (d) and (f) with no registry, no React
├── QadiAtoms.sweep.test.ts# the eviction suite rewritten onto the mechanism, bare-registry SWEEP-03
└── QadiProvider.sweep.test.tsx # (e) StrictMode and Activity; one provider/several providers
```
A separate module is a recommendation, not a decision: it makes (d) and (f) testable without mocks, matches the house pattern of package-private derivation modules (AGENTS.md §3, `PortDerivation.ts`), and keeps `QadiAtoms.ts` small. If it exists it must be added to `stryker.react.mjs` `mutate`, and it needs a row in `spec/traceability.md` (the doc-gated file list).

### Pattern 1: the coalescer (candidate 1)
**What:** one flag per atom set, one fiber per pressure episode, begin with `yieldNow` because `runFork` runs synchronously until its first yield.
**Example** (measured in `$P/proto/src/QadiAtoms.ts`; house-rule compliant, no `as`/`!`/`switch`):
```typescript
// Source: this session's prototype, $P/proto/src/QadiAtoms.ts; APIs verified in
// node_modules/effect/src/internal/effect.ts:1070-1085 (yieldNowWith), :5746-5767 (runForkWith)
export const makeSweepScheduler = (
  sweep: () => void,
  fork: (effect: Effect.Effect<void>) => Fiber.Fiber<void> = (effect) => Effect.runFork(effect),
) => {
  let pending = false;
  return {
    pending: (): boolean => pending,
    request: (): void => {
      if (pending) return;
      pending = true;
      fork(
        Effect.yieldNow.pipe(
          Effect.andThen(
            Effect.sync(() => {
              pending = false; // cleared before the sweep: a signal during the sweep schedules the next one
              sweep();
            }),
          ),
        ),
      );
    },
  };
};
```
Book side (also measured): `admit` ends with `if (order.length > capacity) signal?.();` and the `release` closure, after `entry.liveCount -= 1`, does `if (entry.liveCount === 0 && order.length > capacity) signal?.();`. Optional refinement the spike should decide: guard the release signal with `entry.inBook` so an orphaned (already swept) handle's release does not signal for nothing.

### Pattern 2: candidate 2, if the spike needs to measure it
**What:** a self-terminating repeat. v4 has `Effect.repeat(effect, { schedule, until })` (`Repeat.Options` at `node_modules/effect/src/Effect.ts:15586-15591`: `while`/`until` take the effect's output, `schedule`, `times`) and `Schedule.while` (exported as `while`, `Schedule.ts:1867`; predicate gets `Metadata` with `input`, `output`, `attempt`, `elapsed`) [VERIFIED].
```typescript
// Measured shape: $P/probe5-repeat.mjs. The first iteration runs synchronously inside runFork.
let running = false;
const fork = (): void => {
  if (running) return;
  running = true;
  Effect.runFork(
    Effect.repeat(
      // check and flag-clear are ONE synchronous step, so a signal cannot interleave between them
      Effect.sync(() => { sweep(); const done = !overBound(); if (done) running = false; return done; }),
      { schedule: Schedule.spaced(intervalMillis), until: (done) => done },
    ),
  );
};
```
Restart without a second fiber racing the first: the `running` flag, cleared inside the same `Effect.sync` that decides to stop (a separate `Effect.ensuring` would run after the loop's exit and, in principle, after a yield forced by `maxOpsBeforeYield`, `internal/effect.ts:689-697`). It must start with a yield (or the first iteration sweeps synchronously from `open`/release, which D-03 forbids). It needs an interval, so D-09 moves it into `QadiAtomsOptions`. A fiber forked this way uses real time, not `TestClock` (see Q4).

### Anti-Patterns to Avoid
- **`Effect.forkDetach` (or `forkChild`) inside an atom's effect to start the sweep.** The atom's effect fiber inherits `registry.scheduler` (`executionMode "sync"`, microtask), so the child continues in a microtask instead of a macrotask [MEASURED: `$P/probe2-yield.mjs` C]. Still after the synchronous span, but not the same scheduler the rest of this design reasons about. Use plain `Effect.runFork` from the finalizer or `signal` callback: it always builds a fresh `Context.empty()` fiber on the default `MixedScheduler` (`internal/effect.ts:5746-5755`).
- **Counting sweeps with a module-scope `vi.mock` counter and no drain.** A pending sweep from a synchronous test runs after that test's `afterEach` reset and is counted by the next test (measured: it produced a phantom "2 sweeps" in the next test). Count through the seam, or drain with two macro turns in `afterEach`.
- **Sweeping from `release` directly.** Releases in path (i) happen between a dispose and its re-read; D-03 excludes it.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Deferral after the current sync span | Own `setTimeout`/`setImmediate`/`queueMicrotask` | `Effect.runFork` + `Effect.yieldNow` | A module-scope timer is excluded (D-03); `yieldNow` already resolves on the platform's immediate-class macrotask and is cancellable as a fiber (`Scheduler.ts:97-116`) |
| Fiber start-observation in tests | A global fiber registry | An injected `fork` argument (default `Effect.runFork`) wrapped by the test; `Fiber.pollUnsafe` (`Fiber.ts:88`) to see which ended | v4 has no `Supervisor` module (directory listing of `node_modules/effect/src` has `Fiber.ts`, `FiberHandle.ts`, `FiberMap.ts`, `FiberSet.ts`, no `Supervisor.ts`) [VERIFIED] |
| Repeat-until | Manual recursion | `Effect.repeat({ schedule, until })` | Candidate 2 only |
| Counting registries' release timing | Reading registry internals | Probe via `get.addFinalizer` (`AtomRegistry.ts:1152-1156`) and `registry.getNodes()` (already used at `QadiAtoms.test.ts:489`) | Same pattern the existing pins use |

**Key insight:** nothing here needs a new primitive. The hard part is not mechanism but placing the signal so it is edge-triggered at the right two points and never synchronous.

## Q1. When does a question's release run?

All line references are `node_modules/effect/src/reactivity/AtomRegistry.ts` unless noted. `track` is `QadiAtoms.ts:316-318` (`get.addFinalizer(live())`); `addFinalizer` just pushes onto `lifetime.finalizers` (`:1152-1156`); the finalizers run in `Lifetime.dispose` (`:1304-1313`, `runAll(finalizers.reverse(), invoke)`), which only `NodeImpl.disposeLifetime` (`:1072-1078`) calls. So "when does release run" is "when does `disposeLifetime` run".

| Path | Where `disposeLifetime` is reached | Sync or scheduled | What runs after it in the same synchronous span |
|------|------------------------------------|-------------------|------------------------------------------------|
| (i) Recompute (`Reactivity.invalidate`, dependency write, `setSelf` of an async result) | `NodeImpl.invalidate()` `:1007-1021`: `state = stale`, `disposeLifetime()`, then `propagate()` `:1023-1034` which, for an observed node, calls `this.value()` and so `build()` `:850-887` and the reader. Under `Atom.batch` the rebuild is pushed to `batchState.stale` and done by the same `batch()` call before it returns (`:1388-1426`) | Synchronous | The reader re-runs: `live()` counts one up. `[MEASURED: $P/probe1-order.mjs (i)]`: `release()`, `runFork called`, `runFork returned`, `live()`, `AFTER reg.set (sync)`, then `SWEEP RAN` |
| (ii) Last subscriber unmounts (`useAtomValue` unmount) | The returned unsubscribe (`:569-574`): `remove()` then `if (node.canBeRemoved) this.scheduleNodeRemoval(node)`; `scheduleNodeRemoval` (`:644-650`) calls `this.dispatcher.scheduleTask(..., 0)`; the task runs `removeNode` (`:652-660`) which, with no TTL, does `nodes.delete` and `node.remove()` (`:1080-1099`, `disposeLifetime` at `:1085`) | Scheduled. `dispatcher = schedulerAsync.makeDispatcher()` (`:491`) where `schedulerAsync = new MixedScheduler("async", scheduleTask)` (`:490`) | Nothing of ours: the subscriber is already gone. `[MEASURED]`: `unmount()` returns, `microtask after unmount` runs, then `release()` (in the dispatcher's immediate), then our `setImmediate after unmount`, then `SWEEP RAN` |
| (iii) `registry.dispose()` | `dispose` `:746-749` -> `reset` `:727-739` -> `runAll(nodes, destroyNode)` -> `node.remove()` | Synchronous, inside `dispose()` | Remaining nodes' releases; then `dispose()` returns. `[MEASURED]`: `release()`, `runFork called/returned`, `AFTER dispose (sync)`, `SWEEP RAN` |
| (iv) Node removal with nothing subscribed | Same `scheduleNodeRemoval`/`scheduleAtomRemoval` task. `createNode` `:618-626` calls `scheduleAtomRemoval(atom)` (`:635-642`) for every non-`keepAlive` atom on creation, and the task removes the node if `canBeRemoved` (`:811-813`: no listeners, no children, state not removed) | Scheduled. **Default `scheduleTask` is `undefined`** (`:484`, `:489-490`), so `MixedScheduler` falls back to `setImmediate ?? ` its default (`Scheduler.ts:185`: `setImmediateFn ?? (executionMode === "sync" ? setMicrotask : setImmediate)`), where `setImmediate` is `globalThis.setImmediate` if present else `setTimeout(f, 0)` (`Scheduler.ts:97-116`). `defaultIdleTTL` is `undefined` too, so `atomHasTtl` is false (`:581-583`) and removal is immediate once the task runs, never a TTL bucket | A render-phase read nobody subscribes to within one macrotask is released by this path |

Consequences for D-05:
- A signal raised from path (i) (the book's `live()` re-admission or the release itself) is followed by the re-read in the same call stack; any async fork cannot run before the stack unwinds. `[MEASURED: P3]`: `registry.set(set.invalidate, undefined)` with 3 live questions over a bound of 1 produced **0** sweeps synchronously, 1 afterwards, and `asked()` stayed at 3 (all live).
- An unobserved stale node (lazy, no listeners) is invalidated without a rebuild (`propagate` `:1029-1033` takes the `else` branch). Its count is genuinely zero until the next read. That is existing behaviour (the old 30 s sweep could hit it too) and the book already re-admits on the next `live()`.
- `useAtomValue`'s `snapshot()` is `registry.get(atom)` during render (`@effect/atom-react/src/Hooks.ts:84-86`), so the reader runs, and `live()` counts up, during render. The subscription is added later (`registry.subscribe` in `subscribe`, `Hooks.ts:77`). Between them path (iv) can run (see Pitfall 1).

## Q2. What does `Effect.yieldNow` guarantee after `Effect.runFork` from plain sync code?

- **`runFork` runs synchronously to the first yield.** `runForkWith` builds a `FiberImpl` with `Context.empty()` and calls `fiber.evaluate(effect)` immediately (`internal/effect.ts:5746-5755`); `evaluate` -> `runLoop` runs until an effect returns `Yield` (`:617-635`, `:671-725`). `[MEASURED: $P/probe2-yield.mjs B]`: a sync-only effect's body ran inside `runFork` before it returned.
- **Which scheduler.** The default fiber `Scheduler` reference is `new MixedScheduler()` (`Scheduler.ts:82-85`), so `executionMode "async"` and `setImmediate` (`Scheduler.ts:185`) is the `setImmediate` helper at `:111-116` (try `setTimer`, else `setMicrotask`), where `setTimer` is `globalThis.setImmediate` when `"setImmediate" in globalThis`, else `setTimeout(f, 0)` (`:97-110`).
- **How `yieldNow` re-schedules.** `yieldNowWith` (`internal/effect.ts:1070-1085`) calls `fiber.currentDispatcher.scheduleTask(resume, priority ?? 0)` and returns `fiber.yieldWith(...)`. `currentDispatcher` is `this._dispatcher ??= this.cache.scheduler.makeDispatcher()` (`:566-568`): **each fiber has its own dispatcher**, and each dispatcher requests one `setImmediate` (`Scheduler.ts:231-236`). There is no cross-fiber batching or priority interaction beyond the platform's immediate queue order (FIFO).
  `[MEASURED: $P/probe2-yield.mjs A]` (Node 26.13.0): ordering after `runFork(yieldNow ...)` was `microtask`, `setTimeout0`, `setImmediate` (registered before the fork), then the continuation. So the continuation is an immediate-class macrotask queued at yield time, after every microtask and after any immediate registered earlier.
  `Effect.sleep(0)` is the same thing: the default clock's `sleepMillis` returns `yieldNow` for `millis <= 0` (`internal/effect.ts:6391`) [VERIFIED, MEASURED: probe D].
- **From inside an atom's effect or finalizer.** The finalizer and the book's `signal` are plain JavaScript, so `Effect.runFork` in them creates a fresh fiber with an empty context and the default scheduler exactly as above, even when the surrounding call stack is itself inside another fiber's run loop (`runLoop` saves and restores `globalThis[currentFiberTypeId]`, `:672-673`, `:721-724`; it has no parent link). `[MEASURED: probe C "C-runFork"]`: macrotask, as plain. The one difference is `Effect.forkDetach`/`forkChild` from inside an atom effect: `makeEffect` provides `Scheduler.Scheduler = ctx.registry.scheduler` (`Atom.ts:668-670`, `executionMode "sync"`), and `forkUnsafe` (`internal/effect.ts:5587-5609`) schedules the child on the parent's dispatcher, so the child runs in a **microtask** [MEASURED: probe C "C-forkDetach"]. Also `runCallbackSync` flushes the atom fiber's own dispatcher synchronously (`Atom.ts:707-727`, `fiber.currentDispatcher?.flush()`); that applies only to the atom's fiber, not to ours.
- **Coalescing guarantee.** "Set a pending flag, `runFork(yieldNow then sweep, clear flag)`" sweeps after the current synchronous span completes, whatever raised the signal, because (a) nothing after the first `yieldNow` runs inside `runFork`, and (b) the resume is a macrotask scheduled at yield time. `[MEASURED]`: P3 (invalidate window), P4 (`open()` from the render path, `sweeps === 0` right after three `decision()` calls), P9. A second signal while `pending` is true is dropped; a signal raised by the sweep itself sees `pending` already false if the flag is cleared first (as in Pattern 1), and so schedules the next episode.
- **How it could run early.** (1) Not via `yieldNow`; early would require `forkDetach`-from-atom-effect (microtask, still after the span) or running the sweep body before the `yieldNow` (a code error). (2) `maxOpsBeforeYield` (default 2048, `Scheduler.ts:294-297`, check at `internal/effect.ts:689-697`) can only add yields, never remove them. (3) In a browser `"setImmediate" in globalThis` is false, so `yieldNow` is `setTimeout(f, 0)` (clamped to roughly 1-4 ms) [ASSUMED about the clamp; the `setTimeout` fallback itself is verified at `Scheduler.ts:97-110`]. Later, never earlier. This is the one platform difference to put in the e2e rather than the unit tests: Playwright's Chromium takes the `setTimeout` path, vitest/Node and happy-dom take `setImmediate` (`$P/proto` P8: `typeof setImmediate: function`, `"setImmediate" in globalThis: true` inside the happy-dom vitest environment).
- **Is `yieldNow` sufficient?** Yes for ordering against the same synchronous span. No extra double-yield is needed. `Effect.sleep(0)` buys nothing over it.

## Q3. How do the atom set's runtime and layer relate to registries?

`makeQadiAtoms` builds `Atom.runtime(layer)` (`QadiAtoms.ts:266`). `Atom.runtime` is `context()` (`Atom.ts:967`), whose factory builds a runtime atom (`Atom.ts:899-934`): `read` calls `Layer.buildWithMemoMap(layer, resolveMemoMap(get), scope)` inside `makeEffect` (`:917-931`), and the default memo map is an atom, `removeTtl(make(() => Layer.makeMemoMapUnsafe()))` (`:896`), so it is **per registry**. The scope is the node's lifetime (`makeEffect` closes it in a finalizer, `Atom.ts:660-662`).

`[MEASURED: $P/probe3-layer.mjs]`, a `Layer.effectDiscard` that `forkScoped`s a repeating fiber, behind `Atom.runtime(layer)`:
- a registry that never reads an atom of the runtime: **layer not built**, no fiber;
- two registries mounting one decision atom: **built twice** (`#1`, `#2`);
- one registry unmounts: its scope **closed** (fiber interrupted); the other registry's fiber keeps ticking;
- that registry mounts again: **built a third time**;
- each `registry.dispose()` closes its own scope.

So a scoped fiber's lifetime is "while that registry's runtime node is alive", which is shorter than the registry's own life (it ends when the last decision atom in that registry is released). Candidate 3 can never be "one sweep per atom set" without a guard, and the guard has two jobs: refuse the second registry's fiber, and hand the sweep to a surviving registry when the first one's runtime node dies. That is state shared across registries that a closure flag would need to track (D-02 rank 3, "by a guard", loses by definition) and it still sweeps on a timer. It also gives no sweeper to the common "a question opened but not read by any registry" case. Cost of the guard: a `Set`/owner token in the atom-set closure, plus a re-arm hook on scope close; not recommended.

## Q4. Criterion harnesses

Run from the repo root as `pnpm vitest run --project react <file>` (verified: 4 files, 82 tests, 0.7 s). Existing style: `QadiAtoms.test.ts` and `QuestionBook.test.ts` are bare-graph tests (no DOM); `QadiProvider.test.tsx` uses RTL with `waitFor`; `HydrationEngine.test.ts` already imports `@effect/vitest`. A scratch harness that runs the repo's react tests against a copy of the source works from the repo root with `pnpm vitest run --config $P/vitest.config.ts --root $P/proto` (used for every number below).

**Baseline characterisation (D-11), measured with no mocks.** `QadiProvider` reads `atoms.sweepEvictions` from its props, so a test can pass `{ ...atoms, sweepEvictions: Effect.sync(() => { count += 1; }) }`. With `sweepIntervalMillis={10}` over 100 ms: 1 provider -> 10 sweeps; 3 providers -> 30; 1 provider under `<StrictMode>` -> 11; after unmount -> 0 more (`$P/proto/base/test/chars.test.tsx`, output `CHARS {"1 provider":10,...,"3 providers":30,...,"1 provider StrictMode":11,...}`). That pins "several providers mean several sweepers". "No provider means no sweep" is the existing bare-registry shape (a registry, an atom set with `maxTrackedQuestions: 1`, three `decision()` calls, wait, `asked().length` still 3).

**(d) one sweep per atom set.** Two layers, both without public API:
1. Coalescer unit test (no registry, no React): `makeSweepScheduler(countingSweep, recordingFork)`; call `request()` N times in one synchronous span; settle; assert `sweeps === 1`; then request again after settle and assert `2`. Needs the extracted module of Pattern 1.
2. Integration: the book's `signal` seam counts signals in a book test with a plain function (D-06), and an atom-level test wraps `makeQuestionBook` with `vi.mock("../src/QuestionBook.ts", ...)` (works, measured: wrapper around `sweep` counts calls). Measured result: 12 releases across 4 registries sharing one atom set produced 5 signals and **1 sweep**. If the planner prefers no module mocks, use layer 1 plus an `asked()` end-state assertion.
Hazard: a module-level counter leaks a pending sweep from one synchronous test into the next test's count; drain with two macro turns in `afterEach`, or prefer a per-atom-set counter.

**(e) no second sweeper under `<StrictMode>` and across hidden/shown `<Activity>`.** Style precedent: `packages/devtools/test/react/TimelineLifetime.test.tsx` (L1 StrictMode, L4 Activity) and `DiagnosticsLifetime.test.tsx`; they pass in happy-dom 21, which sets hidden `Activity` content to `display: none !important` (measured) and re-runs effects on show. Post-change the provider forks nothing, so the assertion is "provider mount, StrictMode double effects, hide and show add no sweeps and no signals without pressure, and under pressure sweeps stay episode-bound with the mounted gate still in `asked()`". Measured on the prototype: without pressure 0 sweeps; with pressure 1 sweep and the mounted gate still listed after hide/show.
**Constraint found while building this harness (pre-existing, not caused by this phase):** put `QadiProvider` **inside** the `<Activity>`. With the provider outside, a gate that is hidden then shown stays at `Initial` indefinitely on the unmodified source (`$P/proto/base/test/act2.test.tsx`: `Initial` at +0, +20, +100, +400 ms; with the provider inside, `Success`). Cause, measured in `$P/proto/base/test/subj.test.ts`: the `subject` atom is `Atom.make(undefined)` with no `keepAlive` (`QadiAtoms.ts:267-269`), so when the last decision atom unmounts its node is removed (`canBeRemoved`, `AtomRegistry.ts:811-813`) and the seeded value is gone (`registry.getNodes().has(set.subject) === false`, `registry.get(set.subject) === undefined`); the provider's effect that re-writes the subject (`QadiProvider.tsx:291-295`) does not re-run for a provider that stayed mounted. Record this as a finding for the verifier and Phase 36 triage; do not fix it here.

**(f) no leaked fibers.** v4 has no `Supervisor` (no `Supervisor.ts` under `node_modules/effect/src`) [VERIFIED]. Observables, best first: (1) with the injectable `fork` of Pattern 1, record every fiber and, after settle, assert `pending() === false` and every `fiber.pollUnsafe() !== undefined` (`Fiber.ts:88`) across 300 atom sets built, used past the bound and released; (2) measured on the prototype: after 300 atom sets, `process.getActiveResourcesInfo()` shows 0 `Immediate`/`Timeout` entries versus a baseline of 3 (`P7`), a cheap smoke that needs no seam but is Node-specific. Candidate 1 has no fiber lifetime by construction (a one-shot fiber ends at its `Effect.sync`); candidates 2 and 3 are the ones where (f) can fail.

**Settling.** `[MEASURED: $P/proto/test/proto.settle2.test.ts]`, in `it.effect` after `ups.forEach(unmount)` (a node-removal path, creation tasks already drained): `asked()` was 3 after one `Effect.yieldNow` and 1 after two, because the first yield lets the registry's removal task run (which signals and forks), and the second lets the sweep fiber run. After `registry.dispose()` (sync release) one yield suffices. Use a `settleTurns`-style helper (`packages/devtools/test/helpers.ts:175-177` is 20 x `Effect.yieldNow`) or `vi.waitFor`; a package-local copy under `packages/react/test/support/` is the clean home since `@qadi/devtools`' helper is not importable from react. Do not use `TestClock` for candidate 1: it involves no clock. A fiber started by `Effect.runFork` has `Context.empty()` and therefore the real clock, so `TestClock.adjust` does **not** advance it [MEASURED: `proto.settle.test.ts` S3: a `Schedule.spaced(10_000)` repeat ran once and ignored `TestClock.adjust(60_000)`]. That matters only for candidate 2.

## Q5. Candidate 2 shape

See Pattern 2. Summary: `Effect.repeat(effect, { schedule: Schedule.spaced(ms), until: (done) => done })`, source evaluated once before the schedule is stepped (so begin with a yield), restart guarded by a flag cleared in the same synchronous step that decides to stop, interval required (so `QadiAtomsOptions` gains it, D-09). It still needs a restart trigger after an all-live exit, which is the release signal of candidate 1; the timer then only polls. Both `Schedule.recurs`/`spaced`/`while`/`forever` and `Effect.repeat` options exist in 4.1.2 [VERIFIED: `Schedule.ts:1497`, `:1527`, `:1867`, `:1941`; `Effect.ts:15586-15591`].

## Q6. The e2e (criterion c)

- `pnpm example` is `pnpm --filter @qadi/example-nextjs check` (root `package.json:52`); the example's `check` is `pnpm typecheck && pnpm test && pnpm build && playwright install --with-deps chromium && pnpm test:e2e` (`examples/nextjs-newsroom/package.json`). Playwright 1.65.0, Chromium only, `workers: 1`, `fullyParallel: false`, `retries: 0`, 30 s per test, `webServer: next start --port 3211` with `reuseExistingServer: false`, `baseURL http://127.0.0.1:3211` (`playwright.config.ts`).
- **30 tests in 3 files** (`npx playwright test --list`: `Total: 30 tests in 3 files`; `ssr.spec.ts` 22, `lens.spec.ts` 4, `decision-log.spec.ts` 4).
- **Duration.** Not run. Inference from file mtimes today: `.next/BUILD_ID` 19:28:57 and `test-results/.last-run.json` (`"status": "passed"`) 19:29:07, so a passing e2e run after a build took on the order of ten to a few tens of seconds [ASSUMED].
- **Host can run it.** The host is macOS arm64 (the STATE.md note about needing sudo on a Fedora host is for a different machine). `npx playwright --version` from the example prints `Version 1.65.0`. `playwright-core@1.65.0/browsers.json` wants chromium and chromium-headless-shell revision **1254**, and `~/Library/Caches/ms-playwright/` contains `chromium-1254` and `chromium_headless_shell-1254` with `INSTALLATION_COMPLETE` [VERIFIED]. **No browser install is needed.** `pnpm example` itself would run `playwright install --with-deps chromium`, so run the pieces instead.
- **Command that skips the install:** `pnpm build && pnpm --filter @qadi/example-nextjs build && pnpm --filter @qadi/example-nextjs test:e2e` from the repo root. `pnpm build` (`tsc -b tsconfig.build.json`) is required first: `@qadi/react` resolves to `./lib/index.js` (`packages/react/package.json` `exports`) and `packages/react/lib/QadiAtoms.js` is stamped 15:43, older than recent source work. The example's own typecheck reads `lib/index.d.ts` too.
- The e2e suite does not mention `sweepEvictions` or `sweepIntervalMillis` anywhere (Q7), so "unchanged" is literal: no edit to `examples/` is expected from removing them.

## Q7. Inventory for the removals and the records

Searched all of `packages/*/src`, `packages/*/test`, `spec/`, `apps/website/src/content`, `examples`, `features`, `scripts`, `AGENTS.md`, `README.md`, `CONTRIBUTING.md`, `stryker*.mjs`, `.changeset`; excluded `CHANGELOG.md`, `lib/`, `node_modules`, `.next`.

**Source (`packages/react/src`)**
- `QadiProvider.tsx`: `:20` header comment ("`sweepIntervalMillis`'s own background sweep below"); `:122-130` `DEFAULT_SWEEP_INTERVAL_MILLIS` (const `= 30_000`) and its doc; `:172-193` the `sweepIntervalMillis` prop and doc ("Several providers sharing one `atoms` each fork their own sweep fiber ... redundant but harmless"); `:228` destructuring default; `:330-349` the comment and `useEffect` forking `Effect.repeat(atoms.sweepEvictions, Schedule.spaced(sweepIntervalMillis))`. Imports `Effect`, `Fiber`, `Schedule` (`:26-28`) become unused after removal (check `Effect`/`Fiber` are not used elsewhere in the file before deleting).
- `QadiAtoms.ts`: `:90` (doc of `decision`), `:131` (doc of `asked`), `:146-166` the `sweepEvictions` member and its long doc, `:230` (doc of `maxTrackedQuestions`), `:315` (comment in `track`), `:360` `const sweepEvictions`, `:400` the member in the returned object. `import * as Effect` (`:25`) stays (used by `runtime.atom` and `invalidate`).
- `QuestionBook.ts`: no use of the three names; its doc comment says "`sweep` runs on its own fiber" (`:27-28`), which becomes "runs on a fiber the atom set forks after the signal".
- `HydrationEngine.ts`: `track` doc (`:685-689`) names the "eviction sweep" but not the knobs.
- Not in `index.ts`: `QuestionBook.ts` is not exported (`index.ts` has no `export * from "./QuestionBook.ts"`); `AskedQuestion` is re-exported from `QadiAtoms.ts:51`.

**Tests (`packages/react/test`)**: `QadiAtoms.test.ts:379` (`describe("sweepEvictions")`) with `Effect.runSync(set.sweepEvictions)` at `:398, :404, :437, :455, :474, :493, :516` (seven calls, six tests; the comment at `:478-486` already explains the registry's deferred removal); `QadiProvider.test.tsx:298` `describe("sweepIntervalMillis")` with `sweepIntervalMillis={5}` at `:308`, `:333`, comments `:301`, `:319`; the pin "stops sweeping once the provider unmounts" at `:327-348` (the assertion `expect(bounded.asked().length).toBe(2)` at `:347` is "stays over the bound after unmount"). `QuestionBook.test.ts`: no use of the names. `v4-reactivity-smoke.test.ts`: none.

**Spec (normative)**
- `spec/behaviors/09-react.md`: BEH-QD-065 "The atom set" (heading `:35`); the interface fence member `readonly sweepEvictions: Effect.Effect<void>;` at `:73` with its comment `:72`; the requirement text at `:92-97`: "That identity MUST hold for as long as the atom set tracks the question, whatever the garbage collector does. ... A question `sweepEvictions` has dropped is no longer tracked, and asking it again builds a fresh atom." (the change-history cell at `:13` mentions `sweepEvictions` in a quoted past revision: history, exempt). `QadiAtomsOptions` fence (`:~43-50`) gains an `intervalMillis`-style field only if candidate 2 or 3 wins. BEH-QD-067 (Provider, heading `:248`) has no sweep text.
- `spec/behaviors/25-inspection.md`: BEH-QD-198 "An atom set records the questions it was asked" (heading near `:760`); requirement at `:777-780`: "`asked` MUST bound itself: `sweepEvictions` MUST drop the oldest questions no reader holds open until at most `maxTrackedQuestions` remain, and MUST stop short of the bound rather than drop a question that is still held."; and the paragraph at `:794-801`, which ends "the default bound is 500, and the provider's first sweep runs after its children have rendered and retained their questions" (this sentence is false after the phase and must change).
- `spec/invariants.md`: **INV-QD-105** "A live question is never evicted, and one question has one handle while tracked" (heading `:3193`); body `:3195-3198` "A question any reader holds open is never dropped by `sweepEvictions`, and that includes a recompute in flight: a recompute disposes a reader's lifetime and re-reads in one synchronous step, so the count of readers is never zero where a sweep can see it." Its `Source` block (`:3200-3205`) describes the adapter. INV-QD-315 and 316 are new, reserved by the roadmap.
- `spec/process/house-rules-evidence.md` §4 (heading `:104`): the quoted paragraph at `:~133-150` reads "`sweepEvictions` — plain `Effect.sync`, no `AtomRegistry` access at all — drops the oldest questions ... `QadiProvider.tsx` forks `Effect.repeat(atoms.sweepEvictions, Schedule.spaced(sweepIntervalMillis))` on its own fiber at mount and interrupts it at unmount". It is quoted history (D-15: add an addendum, do not rewrite).
- `AGENTS.md:631` (§13): "`maxTrackedQuestions` bounds the question book through a qadi-owned `sweepEvictions` fork, never through `AtomRegistry`'s `scheduleTask`/`defaultIdleTTL`, which reroutes dispatch and dropped a required render." This is the sentence D-15 amends.
- `spec/overview.md`: **neither `sweepEvictions` nor `sweepIntervalMillis` appears.** The `@qadi/react` table (`:550-575`) lists `QadiAtoms`, `QadiLayer`, `QadiRuntimeServices` as types (`:563`), `QadiProviderProps` (`:555`), `QadiAtomsOptions` (`:565`) without naming members, so removing the two members changes no exported name and gate 13 (`spec:api`) needs no export-table edit; it still needs the revision line (`scripts/spec-revise.mjs`) and, if `SweepScheduler.ts` is added, nothing in overview because it is not exported. Verify by running `pnpm spec:api`.
- `spec/traceability.md`: rows `:501-503` (`QadiAtoms.test.ts`, `QuestionBook.test.ts`, `QadiProvider.test.tsx`) and the behaviour row `:51`; new test files need rows.
- `spec/decisions/103-a-question-is-opened-once.md` mentions `maxTrackedQuestions` (history; ADR-QD-014 amendment is the new ADR-QD-148 per D-16).

**Website, examples, features, scripts**: `apps/website/src/content`: **no hit** for either name or `DEFAULT_SWEEP_INTERVAL_MILLIS`, so no `spec:website-examples` fence uses them. `examples/`, `features/`, `scripts/`: no hit. `README.md` (`packages/react/README.md`): no hit. `.changeset/question-book.md`: mentions `maxTrackedQuestions` only (history). `packages/react/CHANGELOG.md:126` names `sweepEvictions` (history, exempt).

**Upgrade note home:** `apps/website/src/content/docs/docs/reference/upgrading.md`, whose sections are headed `## 0.12: ...`; add `## 0.12: the atom set sweeps its own bound` (or the like) listing both removals. New changeset file under `.changeset/` for `@qadi/react` with a **Breaking** paragraph (the existing `.changeset/*.md` style is a frontmatter block `"@qadi/react": minor` then bold **Breaking.**).

## Q8. Mutation scope

- `stryker.react.mjs` `mutate` is exactly `packages/react/src/DecisionOutcome.ts`, `QuestionBook.ts`, `HydrationEvent.ts` (`mutate: [...]`, `thresholds: { high: 90, low: 80, break: 80 }`, `coverageAnalysis: "perTest"`, `ignoreStatic: true`, `timeoutMS: 20000`) [VERIFIED].
- So of D-17's three touched files only `QuestionBook.ts` is measured today. `QadiAtoms.ts` and `QadiProvider.tsx` are outside it. Phase 30 already used the CLI override: `stryker run stryker.react.mjs --mutate packages/react/src/HydrationEngine.ts` (30-VERIFICATION.md `:116`, score 0.9776 against a base of 0.9693). Phase 34's base file shows the convention for the unmeasured: `34-mutation-base.json` is `{ "measured": { path: score }, "unmeasured": { path: reason } }`.
- Recommendation: `35-mutation-base.json` records `QuestionBook.ts` (and `SweepScheduler.ts` if extracted, run with `--mutate`) as measured, `QadiProvider.tsx` as unmeasured with reason "outside stryker.react.mjs mutate (render code)", and `QadiAtoms.ts` as measured only if the plan chooses to run it with the CLI override. Whichever is chosen, say so in the plan; a silent omission is the defect Phase 34's file avoids. Any new module whose logic decides (the coalescer) belongs in `mutate`.
- Duration: **no timing is recorded** in the existing report (`reports/mutation-react/mutation.json` has keys `files, schemaVersion, thresholds, testFiles, projectRoot, config, framework`, and its only file is `HydrationEngine.ts`: 242 mutants, 218 killed, 5 survived, 19 ignored; no per-run duration) [VERIFIED]. The react suite that Stryker re-runs per mutant takes about 2.4 s in full and 0.7 s for the four covering files (measured), so `QuestionBook.ts`-sized runs are likely minutes, not an hour [ASSUMED]; the CI note in STATE.md says the whole `pnpm mutation` is what exceeds 60 minutes. Do not run it as part of research.

## Common Pitfalls

### Pitfall 1: A render-phase read that is not committed within one macrotask is released, and may then be swept
**What goes wrong:** `useAtomValue`'s `snapshot()` calls `registry.get(atom)` during render (`Hooks.ts:84-86`), which creates the node and runs the reader (`live()` -> count 1). `createNode` schedules `scheduleAtomRemoval` (`AtomRegistry.ts:623-625`, `:635-642`); if no subscription (`Hooks.ts:77`, passive effect) has attached by that immediate (a suspended render, a concurrent render yielded across macrotasks, a hidden `<Activity>`), the node is removed and the question released. With candidate 1 a release that brings the book over capacity forks a sweep, and a cold question in an over-bound book is evicted before its late commit.
**Why it happens:** the registry's own idle-node cleanup is a one-macrotask race against React's commit.
**How to avoid:** this is safe by the book's existing re-admission rule (`QuestionBook.ts:139-142`: the next `live()` puts the entry back unless another entry owns the key). `[MEASURED: P9]`: bound 1, one live entry, `decision(late)` plus `registry.get`, one macro turn, then `asked()` lists only the live entry (late was evicted); the late subscribe re-reads and `asked()` is 2 again. The cost is a transient absence from `asked()` and, if a second `open()` of the same question happens in the gap, a second handle. Only matters at the bound (default 500). The spike must decide whether the admission trigger is worth it: drop it if the e2e or a Suspense test shows a lost seed (D-05 says exactly this).
**Warning signs:** a question vanishing from `asked()` while a suspended gate is pending; hydration counts for a question that never mounted.

### Pitfall 2: `sweepEvictions` test rewrites that wait too little
**What goes wrong:** after `unmount()`, one `Effect.yieldNow` is not enough (measured 3 -> 3 -> 1 for 1 then 2 yields), so the rewritten "becomes eligible again once its gate unmounts" test would assert too early.
**How to avoid:** assert on the registry's own node map as the existing test does (`registry.getNodes().has(decision)` at `QadiAtoms.test.ts:489`), then settle two or more turns, or use `vi.waitFor`. The existing test's comment at `:478-486` is the right reasoning to keep.

### Pitfall 3: The first release-trigger also fires for orphans and for a recompute's momentary zero
**What goes wrong:** the release closure sees `liveCount === 0` in path (i) between dispose and re-read, so a naive "release at zero while over capacity" signals on every recompute of an over-bound book.
**How to avoid:** it is harmless by construction (the fork is deferred and the sweep sees count 1 again), and the coalescer collapses repeated signals to one fiber per macrotask; but it means (d)'s "one sweep per pressure episode" counts **sweeps**, not signals (measured: 12 releases produced 5 signals and 1 sweep). Phrase the test accordingly. A guard on `entry.inBook` removes orphan noise.

### Pitfall 4: All-live over the bound makes every new admission schedule an O(n) sweep that evicts nothing
**What goes wrong:** with more live questions than the bound, each admission over capacity signals, and one scan per macrotask turn runs for no result.
**How to avoid:** the scan is coalesced to one per turn, so cost is O(n) per turn under sustained pressure, versus the old O(n) per 30 s. Acceptable at the default 500; if the spike's e2e shows no problem leave it, otherwise gate the signal on "at least one cold entry exists" using a count maintained at the same two places.

### Pitfall 5: Counting sweeps globally leaks across tests
See Anti-Patterns: drain in `afterEach` or count per atom set.

### Pitfall 6: Hydrated seeds written and never read are forgotten by an earlier sweep than before
The first sweep used to run at provider mount, after the children rendered (`25-inspection.md:798`). With signals, a hydration that opens more than `maxTrackedQuestions` questions before any mounts can have the oldest cold ones evicted one macrotask later. Behaviour parity with today is the provider's first sweep at mount; the new sentence for BEH-QD-198 must say "one macrotask after the pressure", not "after the children rendered".

### Pitfall 7: Pre-existing subject-node loss (do not fix here)
See Q4(e). A `<Activity>` test with the provider outside the Activity will hang at `Initial` on both baseline and candidate; it is not a sweep regression.

## Code Examples

### Bare-registry graph test (SWEEP-03 acceptance, D-12), measured passing on the prototype
```typescript
// Source: $P/proto/test/proto.sweep.test.tsx P1. house style: no `as`, `!`, `switch`.
it("holds the bound with no provider once readers release and the scheduler settles", async () => {
  const set = makeQadiAtoms(EvaluationServicesNone, { maxTrackedQuestions: 2 });
  const registry = AtomRegistry.make();
  const unmounts = ["a", "b", "c", "d", "e"].map((n) => registry.mount(set.decision(permissionPolicy(n))));
  expect(set.asked().length).toBe(5);      // all live: best effort, nothing evictable
  for (const unmount of unmounts) unmount();
  await vi.waitFor(() => expect(set.asked().length).toBe(2)); // registry removal task, then the sweep fiber
  registry.dispose();
});
```

### Characterisation of today's behaviour, no mocks (D-11)
```typescript
// Source: $P/proto/base/test/chars.test.tsx, baseline source. `QadiProvider` reads
// `atoms.sweepEvictions` from its props, so a counting double is enough.
const counted = Effect.sync(() => { sweeps += 1; });
const atoms = { ...makeQadiAtoms(EvaluationServicesNone, { maxTrackedQuestions: 1 }), sweepEvictions: counted };
// 3 x <QadiProvider atoms={atoms} sweepIntervalMillis={10}> for 100 ms -> 30 sweeps; 1 provider -> 10.
```

### Settling in an Effect test
```typescript
// Source: $P/proto/test/proto.settle2.test.ts (measured); helper shape from packages/devtools/test/helpers.ts:175-177
export const settleTurns = Effect.gen(function* () {
  for (let i = 0; i < 5; i++) yield* Effect.yieldNow;
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `Effect.repeat(sweep, Schedule.spaced(ms))` forked by a React effect | Edge-triggered one-shot fiber owned by the atom set | This phase, if the spike confirms | No timer, no provider, bound holds in a bare registry |
| `Effect.Service`/`Supervisor` fiber tracking (v3) | v4 has none; `Fiber.pollUnsafe`, `Effect.runFork` options `onFiberStart` (`Effect.ts:18545`) | v4 | Leak checks go through the injected `fork` |

**Deprecated/outdated:** `Schedule.while` in v3 names; use `Schedule.while` (exported as `while`) or `Effect.repeat({ until })` in v4.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | In a browser (no `globalThis.setImmediate`) `yieldNow` resolves via `setTimeout(f, 0)` with the usual 1-4 ms clamp; later, never earlier, than Node | Q2 | Low for correctness (still after the synchronous span); affects only latency of the sweep and the e2e's timing |
| A2 | The e2e takes on the order of tens of seconds once built (from two file mtimes) | Q6 | Planner budgets a task timeout too small |
| A3 | A `QuestionBook.ts`-sized Stryker run takes minutes, not an hour | Q8 | Wave scheduling |
| A4 | Candidate 1 passes the e2e (criterion c) | Summary | The whole reason the spike exists. Not run; unit-level prototype evidence only |
| A5 | The admission trigger is safe in a real Suspense render under the e2e | Pitfall 1 | If not, D-05 says drop it and bound never-read cold admissions otherwise |
| A6 | The O(n) scan per turn under sustained all-live pressure is acceptable at 500 | Pitfall 4 | Possible small CPU cost; optional cold-count guard |

## Open Questions

1. **Does the admission trigger earn its place?**
   - What we know: it is safe against the dispose-reread window and against the render path (P3, P4); at the bound it evicts a never-committed question one turn after it was opened (P9) and re-admission recovers it.
   - What's unclear: behaviour under real Suspense with the example app near a small bound; whether any seed-loss test can be written that is not just "the same as today's first sweep".
   - Recommendation: spike release-only and release-plus-admission; keep admission only if the (b)-style pin "a question opened and never read is bounded" needs it. Without it, a never-read cold question over the bound is only swept when some other release signals. Say so in `35-SPIKE.md`.
2. **Should the pre-existing subject-node loss be recorded now?**
   - What we know: measured on baseline source, independent of the sweep.
   - Recommendation: one line in `35-SPIKE.md` and a Phase 36 intake note; no code in Phase 35.
3. **Extract `SweepScheduler.ts` or keep the coalescer in `QadiAtoms.ts`?**
   - Extraction makes (d) and (f) mock-free and gives Stryker a small decision module; keeping it inline avoids a new file and doc-gate row.
   - Recommendation: extract (user's "most complete" direction), add to `stryker.react.mjs` `mutate`, add a `spec/traceability.md` row.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node | everything | yes | v26.13.0 (engines `>=22.12.0`) | — |
| pnpm | commands | yes | 10.17.1 | — |
| vitest | react tests | yes | 5.1.0 | — |
| Playwright + Chromium | criterion (c) | yes | 1.65.0; Chromium/headless-shell revision 1254 installed in `~/Library/Caches/ms-playwright` | CI or the podman route in STATE.md (needed only on the Fedora host) |
| Stryker | WX-05, D-17 | yes (devDependency, not run) | — | — |

**Missing dependencies with no fallback:** none. **Missing with fallback:** none on this host. `pnpm example` itself runs `playwright install --with-deps chromium`, which needs network and (on Linux) sudo; use the three-command form in Q6 instead.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest 5.1.0, happy-dom ^21.0.4, `@testing-library/react`, `@effect/vitest` (`it.effect`) |
| Config file | `packages/react/vitest.config.ts` (project `react`, `environment: "happy-dom"`, `setupFiles: test/setupTests.ts`) via root `vitest.config.ts` `projects: ["packages/*"]` |
| Quick run command | `pnpm vitest run --project react packages/react/test/QuestionBook.test.ts packages/react/test/QadiAtoms.test.ts packages/react/test/v4-reactivity-smoke.test.ts packages/react/test/QadiProvider.test.tsx` (measured 0.7 s) |
| Full suite command | `pnpm vitest run --project react` (about 2.4 s measured on the prototype copy); phase gate `pnpm check:pr < /dev/null` |

### Phase Requirements -> Test Map

Nyquist note: this is a discrete-event system (releases, signals, admissions, macrotask turns, one fiber resume). A test must sample between every pair of events it needs to distinguish, so each assertion below sits at a named point: "synchronously after the call returns" (distinguishes the window from after it), "after one settle turn" (release ran, sweep not yet) and "after two or more turns or `vi.waitFor`" (sweep ran).

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SWEEP-01 | Spike evidence per candidate | process | `35-SPIKE.md` review; tests below | Wave 0 (new doc) |
| SWEEP-02a | dispose-reread smoke and sweep across invalidation/recompute | unit | `pnpm vitest run --project react packages/react/test/v4-reactivity-smoke.test.ts packages/react/test/QadiAtoms.test.ts` | yes |
| SWEEP-02a+ | new pins: finalizer order and `dispose()` sync release (D-14) | unit | `pnpm vitest run --project react packages/react/test/v4-reactivity-smoke.test.ts` | Wave 0 (add) |
| SWEEP-02b | eviction suite on the mechanism (oldest cold first, never live, re-admission, best-effort when all live) | graph | `pnpm vitest run --project react packages/react/test/QadiAtoms.test.ts` (rewrite the seven `sweepEvictions` calls, D-10) | yes, rewrite |
| SWEEP-02b | book signal seam (release at zero over capacity; admission over capacity; none at or under the bound) | unit | `pnpm vitest run --project react packages/react/test/QuestionBook.test.ts` | Wave 0 (add tests) |
| SWEEP-02c | `examples/nextjs-newsroom` e2e unchanged, 30 tests | e2e | `pnpm build && pnpm --filter @qadi/example-nextjs build && pnpm --filter @qadi/example-nextjs test:e2e` | yes |
| SWEEP-02d | one sweep per episode across N signals, N registries, N providers | unit + graph | `pnpm vitest run --project react packages/react/test/SweepScheduler.test.ts packages/react/test/QadiAtoms.sweep.test.ts` | Wave 0 |
| SWEEP-02e | no second sweeper under StrictMode and hidden/shown Activity (provider inside the Activity) | RTL | `pnpm vitest run --project react packages/react/test/QadiProvider.sweep.test.tsx` | Wave 0 |
| SWEEP-02f | no leaked fibers over many atom sets (`pending()` false, every recorded fiber polled) | unit | `pnpm vitest run --project react packages/react/test/SweepScheduler.test.ts` | Wave 0 |
| SWEEP-03 | bound holds with no provider (bare registry) | graph | `pnpm vitest run --project react packages/react/test/QadiAtoms.sweep.test.ts` | Wave 0 |
| SWEEP-03 | provider forks nothing; `sweepIntervalMillis` gone | RTL + type | `pnpm vitest run --project react packages/react/test/QadiProvider.test.tsx`; `pnpm typecheck` | yes, edit |
| SWEEP-04 (fallback only) | no-provider rule and several-providers rule pinned | RTL | counting-`sweepEvictions` double (Code Examples) in `QadiProvider.test.tsx` | Wave 0, characterisation first (D-11) |
| SWEEP-05 | AGENTS.md §13, house-rules §4 addendum, doc gates | gate | `pnpm lint` (house style), `pnpm spec:gates`, `pnpm spec:api`, `pnpm spec:verify:strict` | yes |
| WX-05 | coverage thresholds (react at 90%) | coverage | `pnpm coverage` | yes |
| WX-05 | mutation, `QuestionBook.ts` (+ new module) | mutation | `pnpm exec stryker run stryker.react.mjs` and, per file, `--mutate packages/react/src/<file>` | config edit if new module |

### Sampling Rate
- **Per task commit:** the quick run command (0.7 s).
- **Per wave merge:** `pnpm vitest run --project react`, plus `pnpm check:fast` (`scripts/run-check.mjs --tier fast`) when a wave touches `spec/`.
- **Phase gate:** `pnpm check:pr < /dev/null` green, the e2e run recorded in `35-SPIKE.md` and again for the chosen mechanism, before `/gsd-verify-work`.

### Wave 0 Gaps
- [ ] `packages/react/test/support/settle.ts` (or inline helper): two-plus `yieldNow` settle.
- [ ] `packages/react/test/SweepScheduler.test.ts` (if extracted) covering SWEEP-02d/f.
- [ ] `packages/react/test/QadiAtoms.sweep.test.ts` (or a rewrite in place) covering SWEEP-02b/d and SWEEP-03.
- [ ] `packages/react/test/QadiProvider.sweep.test.tsx` covering SWEEP-02e, with the provider inside `<Activity>`.
- [ ] Characterisation commit on the phase base before any `src` change (D-11): no-provider stays over the bound; several providers sweep several times (counting double); unmount leaves the book over the bound.
- [ ] `35-mutation-base.json` as the first plan commit (D-17), with the unmeasured files listed.

## Security Domain

`security_enforcement` is enabled in `.planning/config.json`. The phase touches no authentication, session, crypto or untrusted-input boundary; the relevant concern is that eviction can never turn into an allow.

### Applicable ASVS Categories (L1)
| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | — |
| V3 Session Management | no | — |
| V4 Access Control | indirectly | fail-closed: an evicted question is re-asked and re-evaluated, never answered from a forgotten seed (INV-QD-028, ADR-QD-039); a live question is never evicted (INV-QD-105) |
| V5 Input Validation | no | no new untrusted decode; the untrusted-decode budget (AGENTS.md §7a) is untouched |
| V6 Cryptography | no | — |

### Known Threat Patterns
| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Stale allow served after eviction or re-admission | Elevation of privilege | `outcomeOf` reads (AGENTS.md §13); eviction forgets the handle, a fresh handle starts `Initial` and re-evaluates |
| Sweep drops a mounted gate from `asked()` (devtools shows fewer gates) | Information disclosure (integrity of the panel) | `sweep` only drops `liveCount === 0` entries; keep the dispose-reread and re-admission pins green |
| Unbounded growth (memory DoS) when no provider sweeps | Denial of service | the point of the phase: the atom set owns the bound |

## Sources

### Primary (HIGH confidence)
- `node_modules/effect/src/reactivity/AtomRegistry.ts` (registry, `NodeImpl`, `Lifetime`, `batch`), `reactivity/Atom.ts` (`runtime`, `context`, `makeEffect`, `runCallbackSync`), `Scheduler.ts`, `internal/effect.ts` (`FiberImpl`, `yieldNowWith`, `forkUnsafe`, `runForkWith`), `Effect.ts` (`Repeat.Options`, `RunOptions`), `Schedule.ts`, `Fiber.ts`, `Metric.ts` (read this session).
- `node_modules/@effect/atom-react/src/Hooks.ts`, `RegistryContext.ts` (read this session).
- Repo files: `packages/react/src/{QuestionBook,QadiAtoms,QadiProvider,HydrationEngine,index}.ts(x)`, `packages/react/test/{QadiAtoms,QadiProvider,QuestionBook,v4-reactivity-smoke}.test.*`, `packages/devtools/test/helpers.ts`, `packages/devtools/test/react/TimelineLifetime.test.tsx`, `stryker.react.mjs`, `examples/nextjs-newsroom/{package.json,playwright.config.ts}`, `spec/behaviors/09-react.md`, `25-inspection.md`, `spec/invariants.md`, `spec/process/house-rules-evidence.md`, `AGENTS.md`.
- Measured probes (scratch): `$P/probe1-order.mjs`, `probe2-yield.mjs`, `probe3-layer.mjs`, `probe5-repeat.mjs`, `proto/test/proto.sweep.test.tsx`, `proto/test/proto.settle.test.ts`, `proto/test/proto.settle2.test.ts`, `proto/base/test/{chars,act,act2,subj}.test.*`.

### Secondary (MEDIUM confidence)
- `.planning/STATE.md` (host notes, partly for a different host), `.planning/phases/30-*/30-VERIFICATION.md` (Stryker CLI override), `.planning/phases/34-*/34-mutation-base.json` (base-file shape).

### Tertiary (LOW confidence)
- Browser `setTimeout` clamp and e2e/Stryker durations (Assumptions A1-A3).

## Project Constraints (from CLAUDE.md)

CLAUDE.md imports AGENTS.md. Directives that bind this phase:
- Effect v4 only; submodule namespace imports (`import * as Effect from "effect/Effect"`); relative imports with `.ts`; `import type` for type-only.
- No `as`, `as any`, `!`, `any`; no `switch` (use `Match`); no `Effect.fnUntraced` outside the three budgeted sites; no `async`/`await` in `src`; no `Date.now`/`performance.now`/ambient `console`/`process.env`. A plain function that calls `Effect.runFork` is already the provider's idiom (`QadiProvider.tsx:343`).
- `QuestionBook.ts` stays free of `effect/reactivity` imports; it imports only `effect/MutableHashMap` today.
- `scheduleTask`/`defaultIdleTTL` stay off limits (§13); no module-scope timer or state in `@qadi/react` (§13 "no module-scope state is left in this package").
- Doc-gated: `spec/overview.md` must name every export (gate 13); the placeholder ids `ADR-QD-NEXT` etc. are refused; every behaviour change updates behaviour doc, invariant and traceability in the same change; dates `2026-11-12` via `scripts/spec-revise.mjs --date 2026-11-12`; never run `scripts/next-id.mjs`.
- Tests: coverage thresholds enforced (react 90%); every behaviour has tests; `@effect/vitest` for Effect tests.
- Release: nothing is released or published; no version-packages PR is merged. Add a changeset only.
- Memory preferences: closed unions over widening; no `Record<string, unknown>` hacks; most complete design wins over compatibility.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH, nothing new, versions verified.
- Architecture (release timing, `yieldNow`, per-registry runtime): HIGH, source read plus measured probes on Node 26.13.0.
- Pitfalls: HIGH for the measured ones (P3, P4, P9, settle count, subject loss), MEDIUM for the Suspense/browser interactions (not run).
- e2e and mutation timing: LOW (not run).

**Research date:** 2026-11-12
**Valid until:** 2026-12-12 for the `effect` mechanics while `pnpm-lock.yaml` pins `effect@4.1.2`; re-verify the scheduler lines on any `effect` bump (the `v4-reactivity-smoke.test.ts` canary exists for exactly that).
