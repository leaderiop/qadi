# Phase 37: A scoped run that a newer run supersedes - Research

**Researched:** 2026-11-14
**Domain:** Effect v4 (`effect@4.1.2`) `FiberHandle` / `Scope` run protocol inside `@qadi/devtools` stores; package-private module; spec records
**Confidence:** HIGH (every claim below was either read in source this session or executed in scratch against the real stores and `effect@4.1.2`)
**Base:** `packages/`, `spec/`, `scripts/`, `AGENTS.md` at HEAD (`3bccae50`) are byte-identical to `637c0601` (`git diff --stat 637c0601 HEAD -- packages spec scripts AGENTS.md` printed nothing) [VERIFIED: git diff]. Every measurement below is therefore a measurement of the phase base.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Module shape (accepted 2026-11-14)**
- **D-01** Module: `packages/devtools/src/model/SupersedingRun.ts`, constructor `makeSupersedingRun`. It is an
  `Effect.fn` that requires `Scope.Scope`, builds synchronously (`useScoped` uses `Effect.runSync`) and holds per-build
  closure state only. It stays out of both devtools barrels (package-private; no `spec/overview.md` export row).
- **D-02** Interface (R2, binding): two-step `begin()` → the store publishes → `fork(token, effect)`, plus
  `isCurrent(token)`, `stop()` and `closed()`. `begin()` supersedes (bumps) and returns a token. `fork` forks only
  while the token is still current and says whether it did. `isCurrent` guards each landed write (`marking.accept`,
  the session's `land`). A one-call `run(effect)` is rejected because each store publishes between the bump and the fork.
- **D-03** The feeds' failure filter becomes one named hook: an optional `onFailure(cause)` on `fork`. The module calls
  it only for the current run's failure that is not interrupt-only (today's `mine === generation && Exit.isFailure(exit)
  && !Cause.hasInterruptsOnly(exit.cause)`, at `TimelineFeed.ts:150` and `DiagnosticsFeed.ts:221`). `SimulationSession`
  passes no hook. Its `land` keeps mapping every non-success exit with a current token to `Broke`, including a
  self-interrupt, and it uses only `isCurrent`.
- **D-04** The token is opaque: stores only ask `isCurrent(token)`; no store does arithmetic on or compares tokens itself.

**Stop rule (R1, settled by research)**
- **D-05** `stop` is one unconditional rule: supersede, then fork `Effect.void`, with no guard. `SimulationSession.ts:462`'s
  `Option.isSome(FiberHandle.getUnsafe(runs))` guard is deleted. Pinned on the module interface: stopping with no run
  (not started, completed, closed) changes nothing and notifies nobody, opens no span, and leaves the handle empty.
  "Must not allocate a fiber" is not a requirement.

**Re-entrancy (accepted 2026-11-14)**
- **D-06** Pre-fork restart: `fork` re-checks the token by default, so the two feeds gain the post-commit re-check that
  only `SimulationSession` has today (a subscriber restarting the feed inside its Starting or Reading notification).
  The RED test runs on `637c0601` first. If a feed is not RED, record the evidence and keep the re-check anyway (the
  session needs it).
- **D-07** In-prefix restart (a body whose synchronous prefix starts a command that starts a newer run; STACK `exp3`
  shows the newest run interrupted and the store idle with a stale token): **repair, not report.** A `fork` requested
  while another `fork` is still starting is held until that start returns, then installed (interrupting the stale
  outer run), so the newest run is live. One pending slot is enough, because each `begin` supersedes the previous one.
  Re-check the slot until it is stable. RED first. This supersedes research R2's option A ("report"), which the user
  accepted as the fallback only: if the RED evidence or an existing pin argues against holding, fall back to R2 option
  A (the doc rule "a body must not call a command before its first yield", and a violation shown as the store's failure
  state, never silently idle) and record why. RUN-05's second clause ("reported, not left silently idle") is met in its
  stronger form, because the newest run is live; the CCR row and ADR-QD-150 say so.
- **D-08** Synchronous start is kept (R2): a body's synchronous prefix still runs inside `fork`. No `Effect.yieldNow`
  first (about 34 tests rely on the synchronous prefix; count them in the research step) and no
  `FiberHandle.run({ startImmediately: false })` (it needs `runSyncWith`).

**Tests and mutation (accepted 2026-11-14)**
- **D-09** Store tests: every pre-existing store test passes unchanged on day one. A store-level protocol case is
  deleted only after a module test covers it **and** the store's mutation score still holds; otherwise it stays.
- **D-10** Mutation: base all three stores at `637c0601` with the exact invocation the close will use, committed alone
  and first (`DiagnosticsFeed.ts` has no recorded base; `TimelineFeed.ts` was 1.0; `SimulationSession.ts` about 0.97).
  The new module has no base: every mutant is killed or named in the close plan as an equivalent survivor. A drop in a
  store is closed with a test and never re-baselined (WX-05).
- **D-11** RUN-07 property: a seeded fast-check `fc.commands` model (ARCH-79 / Phase 31 pattern; `fast-check` is already
  a devtools devDependency) over random begin, fork, land, stop and close interleavings. It checks that only the current
  run's result lands and nothing lands after close. Weighted generators meet non-vacuity floors, and a floor is never lowered.
- **D-12** Module tests, through its own interface in a new test file: supersede, close mid-run (including a defecting
  finalizer), stop in each state (not started, running, completed, closed), interrupt versus failure (the `onFailure`
  hook), the self-interrupt row ("reads Broke, not Running", pinned at the session before it is touched), two instances
  in two scopes, and the D-06 and D-07 re-entrancy rows. A test that closes its scope mid-test builds
  `Scope.makeUnsafe()` and runs `Scope.provide` then `Scope.close`. `it.effect` already scopes a test, and `it.scoped`
  does not exist in `@effect/vitest@4.1.2` (R6).

**Records**
- **D-13** ADR-QD-150 amends ADR-QD-137 §7 (no `useRunningStore`; names the module) and point 3 (the unconditional stop),
  and states the finalizer order, the held-fork repair (D-07) and the `Scope.make("parallel")` caveat (a parallel
  scope voids the finalizer ordering, and the module doc says so). AGENTS.md §10 stops naming `it.scoped`. The three
  "Added after the handle" comments and `DiagnosticsFeed`'s "without a `Stopped`" doc are updated. The changeset is a
  `@qadi/devtools` patch. Use only the reserved numbers (ARCH-84, ADR-QD-150, CCR-QD-428, BEH-QD-521 to 525,
  INV-QD-319 to 320). Confirm each is free by grep. Never run `node scripts/next-id.mjs`. Name any unused number in the
  CCR row. The CCR README row lands in the same plan as its first citation, then `spec-revise --date`, then `--check`.

### Claude's Discretion
- Exact names of the interface members beyond `begin`/`fork`/`isCurrent`/`stop`/`closed` and `onFailure`, the token's
  concrete representation behind its opaque type, and the BEH/INV split across the reserved numbers.
- How the per-store "ordering rows" are expressed in tests (publish-before-fork for each store).

### Deferred Ideas (OUT OF SCOPE)
None. The discussion stayed within the phase scope. Out of scope per REQUIREMENTS.md: `CircuitBreaker.ts`'s generation
and `DockModel.ts`.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| RUN-01 | One package-private module owns handle, token, closed state, finalizer ordering, interrupt-on-replace, `stop`, land-only-while-current via `begin()` → publish → `fork(token, effect)` | Prototype (Code Examples 1) typechecks under repo flags, emits clean `.d.ts`, passes house-style, and drives all three stores (sections "Held-fork prototype" and "Conversion proof") |
| RUN-02 | The three stores use it and none declares `let generation`, `let closed`, `FiberHandle.make`/`.runtime`, or a bump-in-finalizer block | Exact protocol sites with line ranges (section "Protocol sites at HEAD"); scratch conversion of all three stores compiled and passed 1362/1362 devtools tests |
| RUN-03 | Module tests through its interface: supersede, close mid-run with defecting finalizer, stop in four states, interrupt vs failure, two instances | Experiments P1-P9 (section "Held-fork prototype") are the module test rows; test map in Validation Architecture |
| RUN-04 | `stop` unconditional, one pin: stop with no run changes nothing, notifies nobody | Raw `FiberHandle` run: empty handle `fork(Effect.void)` leaves `Option.isSome(getUnsafe)` false before and after; closed handle never starts the body (P8); session guard survivors at `SimulationSession.ts:462` |
| RUN-05 | Restart from inside Starting/Reading notification leaves the newest run live in all three stores; body that starts a command before its first yield is reported, not silently idle | Six RED reproductions on the base (section "RED reproductions"), all six GREEN under the held-fork module |
| RUN-06 | Behaviour unchanged: root span, interruption never `Stopped` (INV-QD-313), session `Broke` on defect/self-interrupt; feeds' filter is one named hook the session does not use | Self-interrupt reads `Broke` on the base (S1 below) and is not pinned by any test today; `land` keeps its own `Effect.exit`; hook is optional |
| RUN-07 | Seeded model-based property over begin/fork/land/stop/close | Phase 31 precedent is `FastCheck.array(oneof)` + interpreter + `asyncProperty` seed 3101 + floors, not `fc.commands` (see Assumptions A5) |
| RUN-08 | ADR-QD-137 §7 and point 3 corrected; AGENTS.md §10 stops naming `it.scoped` | `it.scoped` confirmed absent; exact text locations in "Records inventory" |
| WX-01..WX-07 | check:pr green, records with reserved numbers, overview rows, no new forbidden constructs, mutation not falling, characterisation first, Breaking recorded | Measured mutation base, invocation and cost; budgets untouched (module has no `fnUntraced`, `switch`, `as`, `any`); records inventory |
</phase_requirements>

## Summary

All three stores restate one protocol by hand and two re-entrancy hazards that the hand copies have are real, reproduced on the base, and fixed by a single module. I ran six reproductions on the unmodified base. All six are RED: the pre-fork case (a subscriber restarts a feed inside its Starting/Reading notification) is RED for **both** feeds, so CONTEXT D-06's "if a feed is not RED" branch does not apply; the in-prefix case (a run body whose synchronous prefix starts a newer run) is RED in **all three** stores, including the session. A seventh scenario that is more realistic than either (a subscriber that auto-restarts on `Stopped` when a read dies in its first synchronous step, a restart issued from inside `onExit`) is also RED. In every RED the newest run is the one that is killed and the older, stale one is left installed.

I prototyped the held-fork repair (D-07) against `effect@4.1.2` `FiberHandle.make` + `FiberHandle.runtime(handle)<never>()`. It works: the newest run is live, the stale outer run is interrupted, nothing throws, and a close or a `stop` issued inside the prefix is handled. I then converted all three stores to it in scratch (not committed, restored). The converted tree typechecks, passes `oxlint` and `scripts/check-house-style.mjs`, and **all 1362 existing devtools tests pass unchanged** (57 files, including `DockModel`, the React lifetime tests, and the 100 session tests). Instrumenting the base shows no existing test ever requests a fork while another fork is starting (0 of ~1370), so the held-fork mechanism changes no existing test; the only test cases that hit a stale token at fork time are the two session subscriber pins that already guard the pre-fork case. Nothing argues against holding, so the R2-option-A fallback is not needed.

The synchronous start must be kept: putting `Effect.yieldNow` first in the forked body fails **36** existing tests (21 `DiagnosticsFeed.test.ts`, 9 `DockModel.test.ts`, 2 `TimelineFeed.test.ts`, 4 React lifetime/screen tests, **0** in `SimulationSession.test.ts`), which confirms R2's "about 34".

Mutation base at the phase base (`stryker.devtools.mjs --mutate` the three stores, 516 mutants, 247 s wall): `TimelineFeed.ts` 1.0 (62/62), `SimulationSession.ts` 0.9767 (335/343), `DiagnosticsFeed.ts` 0.9279 (103/111). The run is cheap, so plan 37-01 should simply run it and write `37-mutation-base.json`.

**Primary recommendation:** Implement `SupersedingRun.ts` exactly as the verified prototype in Code Examples 1 (identity tokens, one held slot, drain loop), with an **unnamed** `Effect.fn` so no span is added to the store build; convert the stores one at a time with the RED cases written first; keep every existing store test; add a module test file whose rows are the experiments below.

## Project Constraints (from CLAUDE.md / AGENTS.md)

Treated as locked, with the same authority as CONTEXT decisions [VERIFIED: /Users/mohammadalmechkor/Projects/Perso/qadi/AGENTS.md as loaded]:

- Imports: `effect` submodule namespace imports only (`import * as Effect from "effect/Effect"`); relative imports carry `.ts`; `import type` for type-only (`verbatimModuleSyntax`).
- Functions: every effectful function is `Effect.fn(function* …)`; `Effect.fnUntraced` only in the three budgeted `Walk.ts` sites (`UNTRACED_BUDGET`, exact count both directions). No new `switch` (exact budget), use `Match`. No `as`, `as any`, `!`, `any`. No `async`/`await`/`Promise`. No `Date.now`/`new Date`/`performance.now`/`console.*`/`process.env`/`crypto.randomUUID`.
- Errors: `Data.TaggedError`; no new `Schema.TaggedError`; `Effect.catchTag` array form; never `Effect.orDie` in evaluation paths.
- Services/layers: no `Effect.Service`/`Context.Tag`; this phase needs no service ("closures in a scope", CONTEXT).
- Barrels: package-private modules stay out of the devtools barrels (`devtools-named-barrel` rule refuses `export *` there); ADR-QD-099 closed `exports` map.
- Tests: `@effect/vitest` (`it.effect`, `it.layer`, `TestClock`); coverage thresholds in `vitest.config.ts`: `packages/devtools/src/model/**` held at 95% lines/functions/branches/statements, other devtools 90%. Every behaviour in `spec/behaviors/` has tests.
- Spec is normative (§11): public/behaviour change updates behavior doc, invariant, traceability in the same change; `typescript` fences in `spec/` are compiled by `pnpm spec:examples`; no placeholder ids (`…-NEXT`) anywhere.
- Doc-comment shape: one-line summary first, the why in the paragraph(s) after.
- Merge gate is `pnpm check`; during work `pnpm check:pr < /dev/null`. Never release or merge a version-packages PR.
- User memory: closed union over widening; prefer complete over simple; `Record<string, unknown>` is a hack; ask once when blocked.
- Hygiene (from the orchestrator prompt): `grep` is aliased in zsh, use `/usr/bin/grep` or `bash -c`; vitest from the repo root with `--project devtools`; exclude `.stryker-tmp`, `.next`, `node_modules`, `reports` from greps; never run `node scripts/next-id.mjs`.

Project skills: `.agents/skills/` holds only two unrelated GSD command skills; none applies [VERIFIED: ls].

## Architectural Responsibility Map

This is a client-side devtools model; the tiers are inside one process.

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Run protocol (token, replace-interrupt, stop, close, hold) | `packages/devtools/src/model/SupersedingRun.ts` (new, package-private model) | none | One owner for the protocol three stores restated; imports only `effect/*` |
| What a landed result does (record into timeline, sample into reading, session `RunState`) | Each store (`TimelineFeed`, `DiagnosticsFeed`, `SimulationSession`) | none | Stores keep policy; the module keeps mechanics (same split `ExternalStore.ts` documents) |
| Publish-before-fork ordering (`status.set(READING)`, `show(Starting)`, `commit()`) | Each store | module's `begin`/`fork` two-step | The store publishes between `begin()` and `fork`; a one-call `run` would remove that gap (rejected, D-02) |
| Scope ownership and build | React hook `useScoped` (`Effect.runSync(Scope.provide(make(), scope))`) | model constructors | The module must build synchronously and register its finalizer in the owner's scope |
| Failure classification (`hasInterruptsOnly`) | Module (`onFailure` hook for feeds) | session keeps its own `Effect.exit` | Two copies today, one hook after; session has a different rule |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `effect` (`FiberHandle`, `Scope`, `Effect.fn`, `Cause`, `Exit`) | 4.1.2 | the run handle, scope finalizer, failure classification | Already the stores' primitives; `FiberHandle.make` + `runtime` is the "one slot, newer replaces older" primitive [VERIFIED: node_modules/effect/package.json `"version": "4.1.2"`] |
| `@effect/vitest` | 4.1.2 | `it.effect` (already `Tester<Scope.Scope>`) | `it.scoped` does not exist (see below) [VERIFIED: `@effect/vitest@4.1.2/src/index.ts:259` `export const effect: Vitest.Tester<Scope.Scope> = internal.effect`] |
| `vitest` | 5.1.0 | runner | [VERIFIED: `node -e` of `node_modules/vitest/package.json`] |
| `fast-check` | 4.10.2 (catalog) | RUN-07 property | devtools devDependency already [VERIFIED: `packages/devtools/package.json:65`, `pnpm-workspace.yaml:28`] |
| `@stryker-mutator/*` | 10.1.1 | mutation | `stryker.devtools.mjs` [VERIFIED: root `package.json`] |

### Supporting
None. No new dependency, no version change.

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| held fork (D-07) | R2 option A: report a violation | Not needed; evidence supports holding (no existing test changes, six REDs go GREEN) |
| identity tokens (`current === token`) | numeric `generation` | Identity removes arithmetic (D-04 satisfied by construction) and removes the four `generation -= 1` mutants that survive today (`DiagnosticsFeed.ts:178,200,231`, `SimulationSession.ts:359`) |
| `Effect.yieldNow` first | none | Breaks 36 tests (measured); rejected by D-08 |
| `FiberHandle.run({ startImmediately: false })` | none | Needs `runSyncWith`; rejected by D-08 |

**Installation:** none. **Version verification:** `effect` 4.1.2 read from `node_modules/effect/package.json`; the lock pins it.

## Package Legitimacy Audit

No external package is installed or added by this phase. `fast-check`, `effect`, `@effect/vitest`, `vitest`, Stryker are all existing dependencies. Audit table intentionally empty.

| Package | Registry | Age | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|-------------|---------|-------------|
| (none added) | n/a | n/a | n/a | n/a | n/a | Not applicable |

**Packages removed due to [SLOP] verdict:** none. **Packages flagged [SUS]:** none.

## RED reproductions on the base (research item 1)

All run as scratch vitest files placed in `packages/devtools/test/model/`, then deleted; copies kept in `/private/tmp/claude-502/-Users-mohammadalmechkor-Projects-Perso-qadi/bea2edc6-796f-4f45-9f14-5cbd1f92cfb8/scratchpad/scratch-tests/` (`zzScratch37.test.ts` = T1-T5, `zzScratch37d.test.ts` = T6). Working tree is clean of them (`git status` shows only the pre-existing `.planning`/`.agents`/`.codex` entries). Vitest in this repo prints `console.log` only for failing tests, so the harness wrote results to a file.

| # | Case | Store | Scenario (all use `TestClock`/`yieldNow` like the existing tests) | Observed on base | Expected | Verdict |
|---|------|-------|-------------------------------------------------------------------|------------------|----------|---------|
| T1 | pre-fork | `TimelineFeed` | Build with a source that dies, flush so status is `Stopped`; subscribe so the first `Reading` notification calls `feed.configure({ source: B })`; then `feed.configure({ source: A })`. A and B are `delayed(...)` sources (`Effect.as(Effect.yieldNow, {backlog, live: Stream.empty})`) | timeline entries `[]` | `["from-B"]` | **RED** |
| T2 | pre-fork | `DiagnosticsFeed` | Build with no options (`Off`); subscribe so the first `Starting` notification calls `feed.configure({ questions: qb })`; then `feed.configure({ questions: qa })`; step 4 s | status `Live`, `qa` called 3 times, `qb` called **once**, reading is `qb`'s first sample | `qb` polled again (calls >= 2) | **RED**: newest run polled once and killed, the stale run keeps polling `questions()` forever |
| T3 | in-prefix | `TimelineFeed` | outer source's `read` is `Effect.sync(() => { feed.configure({ source: delayedB }); return { backlog: [A], live: Stream.never } })` | entries `[]`, status `Reading` | `["from-B"]` | **RED** |
| T4 | in-prefix | `DiagnosticsFeed` | first `questions()` call does `feed.configure({ questions: qb })` once (the first sample is in the run's synchronous prefix) | `qa` 3, `qb` 1, `Live` with `qb`'s first reading | `qb` polled again | **RED** |
| T5 | in-prefix | `SimulationSession` | `Live` ports = real resolver layer merged with `Layer.effectDiscard(Effect.sync(() => session.run("Run")))` once. The ports layer is built inside `simulate`'s synchronous prefix; an `AttributeResolver.resolve` hook does **not** reach the prefix (it ran after an async boundary and landed `Ran`, so that route is not a reproduction) | `session.getSnapshot().run._tag` is `Running` after 5 s of `TestClock` | `Ran` | **RED**: stuck `Running`, no fiber evaluating |
| T6 | in-prefix (via `onExit`) | `TimelineFeed` | source dies in its first synchronous step on read 1 (`Effect.die`), read 2 is `delayed([retry])`; a subscriber auto-calls `feed.status.restart()` once on the first `Stopped` | reads 2, status `Reading`, entries `[]` | `["retry"]` | **RED**: the exit hook runs inside `runFork`, so the retry is installed first and then interrupted by the dead outer fiber's install |

Mechanism, confirmed in source: `FiberHandle.runtime`'s fork is `const fiber = runFork(effect, options); setUnsafe(self, fiber, options); return fiber` [VERIFIED: node_modules/effect/src/FiberHandle.ts:938-940 (`const fiber = runFork(effect, options)` / `setUnsafe(self, fiber, options)` / `return fiber`)]. `runFork` evaluates the body's synchronous prefix before `setUnsafe` installs it (and `setUnsafe` interrupts `previous`, FiberHandle.ts:402-409). So a nested fork made inside the outer prefix installs first and is then interrupted when the outer installs. In T1/T2 the nested fork comes from a subscriber notified between the bump and the fork; the feeds have no post-publish re-check (the session has: `SimulationSession.ts:544` `if (mine === generation) fork(...)`).

Controls on the same base (instrumentation described under "Held-fork prototype"): across the whole existing devtools suite a stale token at fork time occurs in exactly two cases, both session pins ("a run it superseded is never started" and "a run it replaced leaves only the replacement, which is the one that lands", `SimulationSession.test.ts:414`, `:428`); a fork requested while another fork is starting occurs in **zero** existing tests.

Self-interrupt row (CONTEXT D-12 "pinned at the session before it is touched"): a `Live` run whose resolver does `Effect.interrupt` reads **`Broke`** (message `Cause([Interrupt(10)])`) on the base (scratch S1 in `zzScratch37c.test.ts`). It is **not pinned by any existing test** (`/usr/bin/grep -n "Effect.interrupt" SimulationSession.test.ts` is empty), so plan 37-01 must add it as a green characterisation test on the base.

Publish-before-fork ordering rows (discretion item): on the base, `TimelineFeed` from `Stopped` with a source that dies at once records `["Reading","Stopped"]` (verified in scratch, passes on the base). `DiagnosticsFeed` already pins `["Starting","Live"]` in F6, F7, F8, F13 (`DiagnosticsFeed.test.ts:198, 217, 234, 323`). The session's equivalent is the existing "a subscriber that moves the session while a run is announced" describe (`SimulationSession.test.ts:401-447`). The only new ordering characterisation needed is the timeline one.

## Held-fork prototype (research item 2)

Prototype: Code Examples 1 (saved at `.../scratchpad/scratch-tests/SupersedingRun.prototype.ts`). It uses `FiberHandle.make<void>()` + `FiberHandle.runtime(handle)<never>()`, identity tokens, a `starting` flag, one `held` slot and a drain loop. Experiments (`zzScratch37b.test.ts`; results written to the scratchpad `proto.out`):

| Exp | Scenario | Result |
|-----|----------|--------|
| P1 | `begin A`, `begin B`, `fork(A)` | returns `false`, A never starts; B runs and completes |
| P2 | outer body's prefix does `begin` + `fork(inner)` | inner held; log `OUTER:start, INNER:start, OUTER:interrupted, INNER:done`. **Newest live, stale outer interrupted**, fork returned `true` |
| P3 | three nested held forks (A forks B in its prefix, B forks C) | `A:start, B:start, A:interrupted, C:start, B:interrupted, C:done`; only C completes. The drain loop re-checks until stable |
| P4 | prefix forks B then calls `begin()` with no fork | B's token is stale so B is dropped; the stale outer A stays installed and runs to its natural end (fenced by its token). A `begin` is a bump, not an interrupt (matches the base) |
| P5 | prefix calls `stop()` | A interrupted, nothing live, no throw |
| P6 | prefix runs `Effect.runSync(Scope.close(scope, Exit.void))` then forks | A interrupted (install on a closed handle interrupts), B never starts, **no throw**, `closed()` true |
| P7 | `onFailure` hook | called for the current run's die (twice for two current dies), **not** for the interrupted run or a stale run |
| P8 | raw `FiberHandle`: `run(Effect.void)` on an empty handle; fork on a closed handle | empty handle: `getUnsafe` is `None` before and after, the fiber is already done (R1 confirmed); closed handle: body never starts, returned fiber is an interrupted fiber (`FiberHandle.ts:933-935` `constInterruptedFiber()`) |
| P9 | two instances in two scopes | closing scope 1 interrupts only R1; `isCurrent` of R2's token stays true; R2 completes |

`Scope.make("parallel")` experiment (`PAR`): with a never-ending body whose release dies and an `onFailure` hook, neither a sequential nor a parallel scope called the hook in my run (`heard []` both). I could therefore **not** demonstrate a misreport under a parallel scope; I read why it can differ: a sequential scope runs finalizers in reverse registration order, each awaited, a parallel one forks each finalizer [VERIFIED: node_modules/effect/src/internal/effect.ts:4061-4067: `if (self.strategy === "sequential") { exits.push(yield* exit(runFinalizer(finalizer, exit_))) } else if (key !== parent) { fibers.push(forkUnsafe(parent, runFinalizer(finalizer, exit_), true, true, "inherit")) }`]. Forked finalizers start in reverse order, so only an asynchronous finalizer can reorder. The ADR caveat (D-13) is correct but should say "ordering is only guaranteed under the default `"sequential"` strategy [VERIFIED: internal/effect.ts `finalizerStrategy: ... = "sequential"` default of `makeScope`]". The scope `useScoped` builds is `Scope.make()` (sequential).

Synchronous build: `Effect.runSync(Scope.provide(makeSupersedingRun(), scope))` builds and `Effect.runSync(Scope.close(...))` flips `closed()` (scratch `SYNC` experiment), matching `useScoped`'s build path [VERIFIED: packages/devtools/src/react/useScoped.ts].

### Conversion proof (what "existing tests pass unchanged on day one" will look like)

I converted `TimelineFeed.ts`, `DiagnosticsFeed.ts`, `SimulationSession.ts` in scratch to use the prototype (copies in the scratchpad: `zzTimelineFeedProto.ts`, `zzDiagnosticsFeedProto.ts`, `zzSimulationSessionProto.ts`), then:

- `pnpm exec tsc -p packages/devtools/tsconfig.src.json --noEmit`: clean. Declaration emission (`--noEmit false`, outDir in scratch) is clean and keeps the opaque token as `declare const tokenBrand: unique symbol; export interface RunToken { readonly [tokenBrand]: true }`.
- Existing `TimelineFeed.test.ts` (19) and `DiagnosticsFeed.test.ts` (27) pointed at the converted stores: 46/46 pass; `SimulationSession.test.ts` pointed at the converted session: 100/100 pass.
- All three converted files swapped into place and `pnpm exec vitest run --project devtools --exclude '**/zz*'`: **57 files, 1362 tests, all pass** (base run is the same 1362; the base run completes in about 12 s).
- `node scripts/check-house-style.mjs`: no violation in the module or the converted stores (the only two violations were `as` casts in my own scratch test file). `oxlint packages/devtools/src/model`: clean.
- All six REDs (T1-T6) pointed at the converted stores: **6/6 pass**.

The tree was then restored with `git checkout` of the three stores and every `zz*` file removed.

### What the held-fork mechanism changes in existing tests

Instrumentation (temporary, reverted): wrapped each store's `fork` with a depth counter and logged the current vitest test name on (a) a fork requested at depth > 0 (`NESTED-FORK`) and (b) a fork reached with a stale token (`PREFORK-STALE`). Across the full devtools suite (1370 tests incl. my scratch cases): `NESTED-FORK` occurred only in my scratch T3/T4/T5; `PREFORK-STALE` occurred only in my scratch T1/T2 and in the two session subscriber pins above. **No existing test asserts or depends on nested synchronous fork behaviour**, so holding changes none and the default pre-fork re-check changes none for the feeds. Verdict: nothing argues against holding; the R2-option-A fallback is not needed.

Design notes the planner must carry into the module:
1. `begin()` after close returns a token that is never current (the prototype's `if (!isClosed) current = token`), so `fork` is a no-op. This preserves today's behaviour where `TimelineFeed.configure` after close still runs `status.set(READING)` (not pinned by any test; INV-QD-313 only claims `restart()` publishes nothing on a closed feed) while the fork is a no-op on a closed handle. Do not "fix" it in this phase; a store that must not publish on a closed feed keeps its own `closed()` guard, as `DiagnosticsFeed.configure`/`restart` and `TimelineFeed.restart`/`SimulationSession.start` do today.
2. `begin()` without a `fork` leaves the previous fiber running (fenced by token) until the next fork or `stop` (P4). Every store pairs a `begin` with a `fork` or a `stop` today; keep that, and say so in the module doc.
3. A body whose prefix unconditionally re-forks forever would spin the drain loop (today it would overflow the stack). It is a caller bug; no bound is added.
4. `fork` returns `true` iff the token was current when requested (started now, or held to be installed). No store reads the result today; it exists because D-02 says "says whether it did".

## Sync-prefix test dependence (research item 3)

Method: wrapped each store's fork so the body is preceded by `Effect.yieldNow` (the `Effect.void` stop fiber left alone), ran the whole devtools project, counted failures per file. Result: **36 failing tests**, so `Effect.yieldNow` first is rejected by evidence as well as by D-08.

| Test file | Failing with yield-first | Cases |
|-----------|-------------------------|-------|
| `test/model/DiagnosticsFeed.test.ts` | 21 | F2, F4 to F15, F17 to F19, F21 to F23, F25, F26 |
| `test/model/DockModel.test.ts` | 9 | M18, M19, M21 to M27 (diagnostics store) |
| `test/model/TimelineFeed.test.ts` | 2 | TF9, TF10 |
| `test/react/DiagnosticsLifetime.test.tsx` | 2 | K4, H1 |
| `test/react/DiagnosticsScreens.test.tsx` | 1 | D1 |
| `test/react/TimelineLifetime.test.tsx` | 1 | L1 |
| `test/model/SimulationSession.test.ts` | **0** | its waits (`settled`, `startRun`) cross a boundary |

Raw list: `.../scratchpad/yield-fails.txt`. R2's "about 34" is confirmed (36 measured). "Synchronous start is kept" therefore protects, by test file, 21 + 9 + 2 + 4 = 36 cases; the diagnostics feed is by far the most dependent (its first sample lands inside `start`).

## Protocol sites at HEAD (research item 4)

Line ranges read this session [VERIFIED: files read at HEAD].

**`packages/devtools/src/model/TimelineFeed.ts` (180 lines)**
- `:120-134` `status` store, `let generation = 0` (`:122`), `let closed = false` (`:124`), `FiberHandle.make<void>()` (`:126`), the finalizer `generation += 1; closed = true` (`:127-133`, comment `:127` "Added after the handle, so it runs first on close: the read it interrupts is then a replaced one."), `forkRead = yield* FiberHandle.runtime(reads)<never>()` (`:134`).
- `:136-157` `readSource`: bump (`:137-138`), `status.set(READING)` publish (`:139`), `marking.accept` guard `if (mine !== generation) return` (`:142`), fork with `onExit` failure filter `mine === generation && Exit.isFailure(exit) && !Cause.hasInterruptsOnly(exit.cause)` (`:150`) writing `TimelineStatus.Stopped({ reason: Cause.pretty(exit.cause) })` (`:151`).
- `:160-162` `restart` guarded by `closed`; `:167-178` `configure` (no closed guard; calls `readSource`).

**`packages/devtools/src/model/DiagnosticsFeed.ts` (266 lines)**
- `:161` doc "Builds the feed in the caller's scope; closing it interrupts the run, without a `Stopped`." (the doc to update per D-13).
- `:165-182` `let generation` (`:170`), `let closed` (`:172`), `FiberHandle.make` (`:174`), finalizer (`:175-181`, comment `:175` "Added after the handle, so it runs first on close: the run it interrupts is then a replaced one."), `fork = yield* FiberHandle.runtime(handle)<never>()` (`:182`).
- `:199-228` `start`: bump (`:200-201`), `show(diagnosticsStarting.status)` publish (`:204`, comment `:203` "Before the fork: its synchronous prefix may already reach `Live` or `Stopped`"), `marking.accept` guard (`:209`), fork with failure filter (`:221`) writing `DiagnosticsStatus.Stopped({ reason, sampled })` (`:222`).
- `:230-237` `off`: bump (`:231`) and `fork(Effect.void)` (`:233`), unconditional (the drift against the session).
- `:239-257` `configure` (closed guard `:240`), `:259-261` `restart` (closed guard).

**`packages/devtools/src/model/SimulationSession.ts` (699 lines)**
- `:349-362` `let generation` (`:350`), `FiberHandle.make` (`:352`), `fork` (`:353`), `let closed` (`:354`), finalizer (`:357-362`, comment `:355-356` "Registered after the handle, so it runs first when the scope closes: a run the close interrupts can never land, and a closed session answers no `run`.").
- `:451-463` `supersede`: `generation += 1; if (Option.isSome(FiberHandle.getUnsafe(runs))) fork(Effect.void);` (guard `:462`, the deleted line).
- `:483-514` `land` (`Effect.fn("qadi.devtools.simulationSession.run", { root: true })`), `mine: number` param, `if (mine !== generation) return` (`:495`), `Effect.exit(program(...))` (`:493`), non-success with a current token becomes `Broke` (`:507-511`).
- `:516-545` `start`: `if (closed) return` (`:517`), refused path calls `supersede()` (`:532`), bump (`:538-539`), `run = { _tag: "Running", question }` and `commit()` (`:541-542`), re-check and fork (`:543-544`).
- Other `supersede()` call sites: `reseed` (`:568`), `choosePolicy` (`:587`), `setPorts` (`:626`, only `if (run._tag === "Running")`).
- Imports to drop afterwards: `FiberHandle` (`:34`), `Option` (`:36`; only `Option.isSome` at `:462`, verified by grep), and in the feeds `FiberHandle`, `Exit`.

Module-level facts the conversion preserves: the session's captured context (`Effect.context()` inside `FiberHandle.runtime(...)()`) is the constructor's context; `land` is a root span, so its parent is unaffected. The test at `SimulationSession.test.ts:460-475` asserts the root span and a `qadi.devtools.makeSimulationSession` span; a **named** module span would add a child span to every store build, so make the module an **unnamed** `Effect.fn(function* …)` (the form `packages/audit/src/ArchiveFacts.ts:186` uses [VERIFIED: grep `Effect\.fn\(function`]).

### Store-level protocol test cases, by file, and what the module tests would cover (D-09)

| File | Protocol-bearing cases (line anchors) | Covered by module test | Stays (store behaviour) |
|------|----------------------------------------|------------------------|--------------------------|
| `TimelineFeed.test.ts` (19 tests) | TF3 supersede, TF5 no-source interrupt (`:113`, `:149`); TF6 close (`:162`); TF9 replaced mid-backlog (`:216`); TF10, TF11 defect becomes `Stopped` (`:231`, `:240`); TF12 interrupt never `Stopped` incl. dying release (`:259`); TF13 ends by itself (`:283`); TF14-TF16 restart (`:298`, `:313`, `:329`); TF17, TF18 restart after close (`:344`, `:361`); TF19 release dies while closing (`:380`) | supersede (TF3, TF9), close (TF6, TF19), interrupt vs failure (TF10-TF13), closed gate (`closed()` + `fork` false) | TF1, TF2, TF4, TF5 (entries kept), TF7, TF8, TF14-TF18's store behaviour (status mapping, dedupe), the `onFailure` to `Stopped` mapping |
| `DiagnosticsFeed.test.ts` (27 tests) | F4, F5 defect to `Stopped` (`:146`, `:164`); F6-F9 replace/restart, F9 dying release (`:187-254`); F10, F11, F26 off (`:256`, `:272`, `:435`); F16 restart from a sample (`:356`); F17, F24 close (`:379`, `:396`); F25 closed feed ignores commands (`:414`); F27 restart while Starting (`:454`) | supersede, close with defecting finalizer, interrupt vs failure, stop (off) | the `Starting`/`Live`/`Stopped` publishing, `sampled`, per-field `configure` compare, `["Starting","Live"]` ordering rows |
| `SimulationSession.test.ts` (100 cases) | C2 refusal leaves no fiber (`:207`); C4 second run interrupts first (`:306`); "a superseded run stops at once" x4 (`:333-365`); close (`:368-397`); subscriber re-entrancy x2 (`:414`, `:428`); "a run is its own trace" (`:459-476`); "interface keeps the lifecycle to itself" (`:449-457`); defect becomes `Broke` (`:1669-1684`); replay/seed drops the run in flight (`:1287`); stale-result cases `:981`, `:1010` | stop in each state, supersede, close, two instances | root span, `Broke` mapping (including the new self-interrupt row), "a result belongs to its question", every command |
| `DockModel.test.ts` (39) and 4 React tests | exercise the feeds through the dock | not module-covered | all stay |

Recommendation: D-09's shrink is optional. The review's "~5 / ~4 / ~25 matching lines" are mostly publish-order and status-mapping rows that only the stores can pin. Plan to **delete nothing** unless the module tests plus a fresh mutation compare prove a specific case redundant; the likeliest candidates are TF9 and TF19 (pure supersede/close with a defecting release) and F9 and F24, and only after the per-file mutation compare holds.

## Mutation (research item 5)

**Invocation** (verified, config read): `pnpm exec stryker run stryker.devtools.mjs --mutate 'packages/devtools/src/model/TimelineFeed.ts,packages/devtools/src/model/DiagnosticsFeed.ts,packages/devtools/src/model/SimulationSession.ts'`. For the close add the new module to the list. `stryker.devtools.mjs` already has `mutate: ["packages/devtools/src/model/**/*.ts"]`, so the new `model/SupersedingRun.ts` is covered with no config edit; `--mutate` is only to scope the run. `coverageAnalysis: "perTest"`, `ignoreStatic: true`, `thresholds.break: 80` (an exit 1 after "below breaking threshold" with the report written is not a failed baseline), one Stryker run at a time (ADR-QD-098). [VERIFIED: stryker.devtools.mjs read in full]

**Report:** `reports/mutation-devtools/mutation.json` (gitignored: `.gitignore:19 reports/*`). Per-file score = `(Killed + Timeout) / (Killed + Timeout + Survived + NoCoverage)` over `report.files[<path>].mutants`; `Ignored` mutants are not counted [VERIFIED: the Phase 34 base writer, `.planning/milestones/v1.3-phases/34-*/34-01-PLAN.md` Task 1 step 3, same formula]. Plan 37-01 should reuse that writer (it refuses a stale report older than any file under `packages/devtools/src` or `test`, takes `measured -- unmeasured -- new -- deleted`) with output `.planning/phases/QD-37-a-scoped-run-that-a-newer-run-supersedes/37-mutation-base.json`, three `measured` files, `new` = `packages/devtools/src/model/SupersedingRun.ts`. The v1.3 file shape: `{ measured: {path: score}, unmeasured: {}, new: [], deleted: {} }`. The close writes a flat `{path: score}` `37-mutation-after.json` and compares.

**Cost:** I ran it. 516 mutants, initial run 817 tests in 15 s, total 3 min 50 s (247 s wall from launch). It exited 0 (overall 96.90, above break 80).

**Measured base at the phase base** (HEAD src is byte-identical to `637c0601`):

| File | Score | detected/scored | Survivors |
|------|-------|-----------------|-----------|
| `TimelineFeed.ts` | 1.0 | 62/62 | none |
| `SimulationSession.ts` | 0.9767 | 335/343 | `:359:7` `generation -= 1` (finalizer); `:462:9` guard to `true`; `:495:9` `if (mine !== generation)` to `false`; `:406:17`, `:409:22`, `:409:35`, `:413:9`, `:415:9` (the `stale` build, not the protocol) |
| `DiagnosticsFeed.ts` | 0.9279 | 103/111 | `:178:7`, `:200:5`, `:231:5` `generation -= 1` (three equivalent-looking bumps); `:193`, `:194`, `:195` (`runOptions` spreads); `:209:13` accept guard to `false`; `:245:11` `before !== undefined` guard to `true` |

(Raw: `.../scratchpad/mutation-base-measured.txt`.) It matches the Phase 34 close of 0.9279 for `DiagnosticsFeed.ts` and 1.0 for `TimelineFeed.ts` (`.planning/milestones/v1.3-phases/34-*/34-mutation-after.json`), and the ~0.97 for the session. **D-10's "DiagnosticsFeed.ts has no recorded base" is now measured: 0.9279.** The file `reports/mutation-devtools/mutation.json` in the working tree now holds this 3-file report (dated 2026-11-14); it is gitignored, and 37-01 must re-run anyway because its writer requires a report newer than every `src`/`test` file.

Predictions worth stating for the plan: identity tokens delete the arithmetic, so the four `generation -= 1` survivors and the `:462` guard disappear from the stores; the module's mutants on `isCurrent`, the closed guard in `begin`, the drain loop and the hook filter must each be killed by a module test or named as an equivalent survivor. Remaining store survivors (`:209` accept guard becomes a `run.isCurrent` mutant that the existing T-style re-entrancy test kills; `:245`; the `runOptions` spreads; the session `stale` rows) are untouched by this phase and must not fall.

## Interface typed under the house rules (research item 6)

Code Examples 1 is the verified interface. Decisions inside it:

- **Opaque token without `as`:** `const tokenBrand: unique symbol = Symbol("qadi.devtools.RunToken")` (module-private); `export interface RunToken { readonly [tokenBrand]: true }`; mint with `const token: RunToken = { [tokenBrand]: true }` (the return/annotation context keeps the literal `true`, so no assertion). Each `begin()` mints a fresh object, so `isCurrent` is `token === current` and the store can neither build nor read one. Compiled under the repo's strict flags and emitted a valid `.d.ts` (the module-private `unique symbol` is emitted as `declare const tokenBrand: unique symbol`). No numbers exist, so D-04 is by construction.
- **Constructor:** unnamed `Effect.fn(function* (): Effect.fn.Return<SupersedingRun, never, Scope.Scope> { … })`. Same return-annotation idiom the stores use (`Effect.fn.Return<TimelineFeed, never, Scope.Scope>`).
- **Finalizer order:** `FiberHandle.make` first, then `Effect.addFinalizer` (so the module's finalizer is the later registration and runs first in a sequential scope), then `FiberHandle.runtime(handle)<never>()`. On close the finalizer clears `current` and sets the closed flag; the handle's release then interrupts the run, whose `onExit` hook sees a non-current token and stays silent (P7, and the existing TF12/TF19/F9/F24 cases).
- **`stop()`** is `fork(begin(), Effect.void)`. On an empty handle the `Effect.void` fiber completes inside `runFork`, the observer clears the slot, and `getUnsafe` is `None` before and after; on a closed handle `begin()` returns a stale token and `fork` is a no-op [VERIFIED: P8 raw experiment; FiberHandle.ts:933-935]. No span is opened (the module is unnamed and `Effect.void` has none).
- **Failure hook:** `fork`'s third parameter `{ onFailure?: (cause: Cause.Cause<unknown>) => void }`. The module wraps only when a hook is given: `run.pipe(Effect.onExit((exit) => Effect.sync(() => { if (isCurrent(token) && Exit.isFailure(exit) && !Cause.hasInterruptsOnly(exit.cause)) onFailure(exit.cause) })))` (`Exit.hasInterrupts` means "any", do not use it, SUMMARY).
- **Types of the forked effect:** `Effect.Effect<void, unknown>` (the handle is `FiberHandle.make<void>()`, error `unknown`, R `never`).
- **House budgets:** zero `Effect.fnUntraced`, zero `switch`, no `as`/`!`/`any`, `try/finally` is already used in devtools (`Capture.ts`, `Filters.ts`, `SimulationForm.ts`). `UNTRUSTED_DECODE_BUDGET` tokens (`JSON.parse`, `Schema.decode*`, `onExcessProperty`) none. No metric. No budget row changes.
- **Doc comment (AGENTS.md shape):** line one "A scoped run that a newer run supersedes, owned by a scope." The why paragraphs: predecessor (three hand copies), ADR-QD-150, the finalizer-order requirement and the `Scope.make("parallel")` caveat, the held-fork rule, "a `begin` is paired with a `fork` or `stop`", package-private (ADR-QD-099).

## Records inventory (research item 7)

**Free-by-grep:** I grepped `spec/`, `packages/`, `.changeset/`, `AGENTS.md`, `CONTRIBUTING.md`, `features/` (excluding `node_modules`, `lib`, `.stryker-tmp`, `.next`, `reports`, `coverage`) for `ARCH-84`, `ADR-QD-150..155`, `CCR-QD-428..429`, `BEH-QD-521..525`, `INV-QD-319` and `INV-QD-320`: **no hit** for any of them. The highest used are ADR-QD-149 (`spec/decisions/index.yaml` last entry, file `149-a-seed-is-held-by-its-question.md`), CCR-QD-427, BEH-QD-520, INV-QD-318. (A looser BEH regex matched BEH-QD-519/520 only, which exist.) `spec/decisions/` ends at 149. `.changeset/` holds only `README.md` and `config.json`. All of ARCH-84, ADR-QD-150, CCR-QD-428, BEH-QD-521-525, INV-QD-319-320 are free. `node scripts/next-id.mjs` was not run.

**Text to amend (exact locations):**
- ADR-QD-137 `spec/decisions/137-a-devtools-session-owns-its-runs-through-a-scope.md` (Revision 1.2): point 3 (`:62-68`, "when the handle holds a fiber, installs an empty fiber"), point 4 (`:69-71`, "finalizer moves the generation and marks the session closed"), §7 (`:85-87`, "the timeline's `useRunningStore` is the other shape ... and is unchanged"; already corrected by the 1.2 blockquote at `:128-134` but the body still says it), Consequences `:97-100` ("only the generation-current run writes session state"). Amend with a blockquote dated for this CCR, as the 1.2 amendment did; `spec-revise` bumps its Revision.
- ADR-QD-047 `spec/decisions/047-a-headless-devtools-model.md` amendment text `:405-416` ("A per-start token keeps a replaced run's late exit ..."); optional pointer line.
- New `spec/decisions/150-<slug>.md` and `spec/decisions/index.yaml` entry (`id: "ADR-QD-150"`, `file`, `title`, `status: "Accepted — amends ADR-QD-137"`); gate 10: Document ID equals the file number.
- `spec/behaviors/29-devtools-simulator.md` BEH-QD-461 (`:836-870`: "The finalizer moves the generation", "only the generation-current run writes state"); Revision 1.18.
- `spec/behaviors/28-devtools-screens.md` (Revision 1.20): BEH-QD-507/508/519 are the feeds' behaviour; new BEH-QD-521..525 most naturally land here (feeds' re-entrancy and stop) with the session's cross-reference in 29. The split across the five numbers is Claude's Discretion; a workable split: 521 a superseded run never lands and a replaced run is interrupted (all three stores), 522 stop is one unconditional rule (no run: nothing changes, nobody notified), 523 closing the scope interrupts the run and a run that dies as the scope closes is never reported, 524 a restart from inside a store's own Starting/Reading notification leaves the newest run live, 525 a run body that starts a newer run in its own synchronous prefix leaves the newest run live.
- `spec/invariants.md` (Revision 1.117, last entries INV-QD-317/318 at the file's end): INV-QD-313's Source (`:3650`, "the per-start token each run closes over", "the per-read generation token") restated to name the module; new INV-QD-319 (only the current run lands and nothing lands after close; module-level) and INV-QD-320 (a newer run is never interrupted by an older run's install: the held fork).
- `spec/traceability.md` (Revision 1.163): row 28 and row 29 BEH lists; INV rows (`INV-QD-313` row at `:157`); ADR-QD-137 row `:299`; ADR-QD-150 row; **new test-file rows** (`SupersedingRun.test.ts`, and the store files if their rows change; test-file rows live around `:431-475`, per-file `| packages/devtools/test/model/X.test.ts | BEH-… — what it proves |`); CCR-QD-427 added "three new test-file rows" the same way.
- `spec/README.md` (Revision 1.168): CCR row table (CCR-QD-427 is at `:364`; format `| CCR-QD-NNN | date | files (with Rev) | ARCH-NN. **Title.** prose |`), then Document history entry. The CCR row lands in the same plan as its first citation.
- `spec/overview.md`: **no** row (package-private, both barrels unchanged); gate 13 is names-only and ignores it. The `devtools-named-barrel` rule keeps `export *` out.
- `AGENTS.md` §10, line 580: "`@effect/vitest`: `it.effect`, `it.scoped`, `it.layer`, `TestClock`." Replace with `it.effect` (which already provides a `Scope`), `it.layer`, `TestClock`, plus the one-sentence rule for closing a scope mid-test (`Scope.make()` then `Scope.provide(…, scope)` then `Scope.close(scope, Exit.void)`; `Scope.makeUnsafe()` also exists, `Scope.ts:282`). `it.scoped` is absent [VERIFIED: grep of `@effect/vitest@4.1.2/src/index.ts`: only `effect` (`Tester<R | Scope.Scope>`, `:140`), `live` (`:196`) and `layer` exist; no use of `it.scoped` anywhere in `packages`/`features`/`examples`]. Existing store tests already use `yield* Scope.make()` (`TimelineFeed.test.ts:163`, `DiagnosticsFeed.test.ts:383`).
- The three "Added after the handle" comments are removed with their blocks (`TimelineFeed.ts:127`, `DiagnosticsFeed.ts:175`, `SimulationSession.ts:355-356`); the module doc owns the sentence. `DiagnosticsFeed.ts:161` "without a `Stopped`" becomes accurate wording ("closing it interrupts the run; an interruption is never a `Stopped`").
- `.changeset/<slug>.md`: front matter `"@qadi/devtools": patch`, body a short fix note (format from `git show c39231569:.changeset/atom-set-sweep.md`; all packages are in one `fixed` group, `.changeset/config.json`). Not **Breaking**.
- `.planning/ROADMAP.md`/`STATE.md` are the GSD flow's, not this phase's task text.

**`scripts/spec-revise.mjs`:** `node scripts/spec-revise.mjs <spec-doc.md> "<what changed>" [--date YYYY-MM-DD]` bumps the minor version in both the `Revision` row and the newest `Change History` entry and prepends the entry; `node scripts/spec-revise.mjs --check` verifies every document's revision equals its newest history version (`pnpm spec:verify` runs it). Per CONTEXT: run `spec-revise <doc> "…" --date 2026-11-14` once per edited document, then `--check`. `typescript` fences in `spec/behaviors/*.md` are compiled by `pnpm spec:examples`; use `ts` for fragments.

## Architecture Patterns

### System Architecture Diagram

```
 host (React)                      model constructors                       effect runtime
 ------------                      ------------------                       --------------
 useScoped ──Effect.runSync──►  makeTimelineFeed / makeDiagnosticsFeed / makeSimulationSession
   │  Scope.make()                  │ yield* makeSupersedingRun()   (registers finalizer AFTER the handle)
   │                                ▼
   │                         SupersedingRun { begin, fork, isCurrent, stop, closed }
   │
 command (configure / restart / run / choosePolicy …)
   │
   ├─ token = run.begin()            current := token  (supersedes older token; closed ⇒ never current)
   ├─ store publishes (status.set(READING) | show(Starting) | commit())  ◄── subscribers may re-enter here
   ├─ run.fork(token, effect, {onFailure?})
   │        ├─ token not current? ──► return false (pre-fork re-check, D-06)
   │        ├─ already inside a fork's start? ──► hold in the single slot, return true (D-07)
   │        └─ else: starting := true
   │               install(effect)   = runFork(body prefix runs HERE) then setUnsafe (interrupts the previous fiber)
   │               loop: while a fork was held and its token is current: install it
   │               starting := false
   └─ a landed write:  if (!run.isCurrent(token)) return;  … store policy …
 close(scope) ──► module finalizer first (current := undefined, closed := true) ──► handle release interrupts the fiber
                  └─ its onExit hook sees a non-current token ⇒ silent
```

### Recommended Project Structure
```
packages/devtools/src/model/
├── SupersedingRun.ts        # new, package-private (not in either barrel)
├── TimelineFeed.ts          # uses it: begin / fork with onFailure / isCurrent / closed
├── DiagnosticsFeed.ts       # uses it: begin / fork with onFailure / isCurrent / stop / closed
└── SimulationSession.ts     # uses it: begin / fork (no hook) / isCurrent / stop / closed
packages/devtools/test/model/
└── SupersedingRun.test.ts   # new: module rows + PROPERTY describe (one traceability row)
```

### Pattern 1: begin, publish, fork(token)
**What:** the store bumps, publishes its "starting" value, then forks while the token is still current; each landed write re-checks `isCurrent(token)`.
**When to use:** every command that starts a run (`readSource`, `start`, the session's `start`).
See Code Examples 2.

### Pattern 2: unconditional stop
`run.stop()` replaces `supersede()` and `off()`'s bump-and-fork. The session's `supersede` wrapper may stay as a one-line name for readability or be inlined; either way there is no guard.

### Anti-Patterns to Avoid
- **A one-call `run(effect)`:** removes the publish-before-fork gap; overwrites a synchronously reached `Live`/`Stopped` with `Starting` (PITFALLS 1).
- **Comparing or doing arithmetic on tokens in a store** (D-04): only `isCurrent`.
- **A named module span:** adds a child span to every store build and changes the captured context's current span.
- **Deleting store tests before the module covers them** (D-09), or re-baselining a dropped score.
- **Fixing the closed-feed `configure` quirk** (see design note 1): out of scope.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| One slot where a newer fiber replaces and interrupts the older | your own fiber bookkeeping | `FiberHandle.make` + `FiberHandle.runtime(handle)<never>()` | Already the stores' primitive; `setUnsafe` installs the replacement before interrupting `previous` so a finalizer re-entering the handle is safe (`FiberHandle.ts:402-409`) |
| Interrupt-only vs defect classification | `Exit.hasInterrupts` or a tag check | `Cause.hasInterruptsOnly` | `hasInterrupts` means "any interrupt" |
| Interrupt a run now | `interruptUnsafe` on a fiber you forked | install `Effect.void` through the handle | ADR-QD-137 alternatives: same ownership by hand |
| Closing a scope in a test | `it.scoped` (absent) | `yield* Scope.make()` / `Scope.makeUnsafe()` + `Scope.provide` + `Scope.close` | `it.effect` is already `Tester<Scope.Scope>` |
| A property with a model | a bespoke runner | `FastCheck.array(oneof(weighted))` + interpreter + `asyncProperty` + floors | repo precedent `SharedComputation.test.ts` |

**Key insight:** the protocol is five small facts (token, closed, finalizer order, replace-interrupt, hold); the risk is not code size but that each store's *publish* sits between two of them, so the module must be two-step.

## Common Pitfalls

### Pitfall 1: Publish overwritten by a synchronously reached state
**What goes wrong:** a one-call `run` publishes `Starting`/`Running` after the prefix already reached `Live`/`Stopped`. **How to avoid:** two-step interface; per-store ordering rows (timeline `["Reading","Stopped"]`, diagnostics `["Starting","Live"]`).

### Pitfall 2: Finalizer registered before the handle
**What goes wrong:** the handle's release interrupts the run while it is still "current", so the interrupted run reports `Stopped` (INV-QD-313). **How to avoid:** `FiberHandle.make` first, `addFinalizer` second; a close-mid-run test with a defecting release (TF19/F24 analogues at the module). Only holds under the default sequential scope strategy (see caveat).

### Pitfall 3: A parallel scope
`Scope.make("parallel")` forks finalizers (`internal/effect.ts:4065-4067`); the module doc says the ordering is only guaranteed for the default strategy. I could not make it misreport in a simple experiment, so state it as a documented limit, not as a demonstrated defect.

### Pitfall 4: `begin()` without a fork leaves the older fiber running
Fenced by token (P4), interrupted at the next fork or `stop`. Document it; every store pairs them.

### Pitfall 5: Mutation falls when logic moves
v1.3 saw `TimelineFeed` 1.0 to 0.9194. **How to avoid:** base first (committed alone), module tests before deleting any store case, never re-baseline, name equivalent survivors.

### Pitfall 6: Hand-written RED tests that fail for the wrong reason
T5 via an `AttributeResolver` hook is **not** in the synchronous prefix (it resolves after a boundary and lands `Ran`); the reproduction needs a ports **layer constructor** (`Layer.effectDiscard(Effect.sync(...))`) merged into the ports. A RED that "passes" through that route proves nothing.

### Pitfall 7: Vitest prints `console.log` only for failing tests here
Scratch evidence must be asserted or written to a file.

## Code Examples

### 1. The verified module (saved at `.../scratchpad/scratch-tests/SupersedingRun.prototype.ts`)
```typescript
// Source: prototype verified this session (tsc strict clean, 1362/1362 devtools tests, house-style clean)
import * as Cause from "effect/Cause";
import * as Effect from "effect/Effect";
import * as Exit from "effect/Exit";
import * as FiberHandle from "effect/FiberHandle";
import type * as Scope from "effect/Scope";

const tokenBrand: unique symbol = Symbol("qadi.devtools.RunToken");

/** Opaque: a store asks `isCurrent(token)` and nothing else. */
export interface RunToken {
  readonly [tokenBrand]: true;
}

export interface ForkHooks {
  readonly onFailure?: ((cause: Cause.Cause<unknown>) => void) | undefined;
}

export interface SupersedingRun {
  readonly begin: () => RunToken;
  readonly fork: (token: RunToken, run: Effect.Effect<void, unknown>, hooks?: ForkHooks) => boolean;
  readonly isCurrent: (token: RunToken) => boolean;
  readonly stop: () => void;
  readonly closed: () => boolean;
}

interface Held {
  readonly token: RunToken;
  readonly run: Effect.Effect<void, unknown>;
}

export const makeSupersedingRun = Effect.fn(function* (): Effect.fn.Return<SupersedingRun, never, Scope.Scope> {
  let current: RunToken | undefined;
  let isClosed = false;
  let starting = false;
  let held: Held | undefined;

  const handle = yield* FiberHandle.make<void>();
  // Added after the handle, so it runs first on a sequential scope's close.
  yield* Effect.addFinalizer(() =>
    Effect.sync(() => {
      current = undefined;
      isClosed = true;
    }),
  );
  const install = yield* FiberHandle.runtime(handle)<never>();

  const isCurrent = (token: RunToken): boolean => token === current;

  const begin = (): RunToken => {
    const token: RunToken = { [tokenBrand]: true };
    if (!isClosed) current = token;
    return token;
  };

  // Installs `first`, then whatever a nested fork held meanwhile, until nothing is held.
  const drain = (first: Held): void => {
    starting = true;
    try {
      let next: Held | undefined = first;
      while (next !== undefined) {
        held = undefined;
        if (isCurrent(next.token)) install(next.run);
        next = held;
      }
    } finally {
      starting = false;
      held = undefined;
    }
  };

  const fork = (token: RunToken, run: Effect.Effect<void, unknown>, hooks?: ForkHooks): boolean => {
    if (!isCurrent(token)) return false;
    const onFailure = hooks?.onFailure;
    const watched =
      onFailure === undefined
        ? run
        : run.pipe(
            Effect.onExit((exit) =>
              Effect.sync(() => {
                if (isCurrent(token) && Exit.isFailure(exit) && !Cause.hasInterruptsOnly(exit.cause)) {
                  onFailure(exit.cause);
                }
              }),
            ),
          );
    if (starting) {
      held = { token, run: watched };
      return true;
    }
    drain({ token, run: watched });
    return true;
  };

  return { begin, fork, isCurrent, stop: () => { fork(begin(), Effect.void); }, closed: () => isClosed };
});
```
Hardening the planner may add (all optional): the module doc; making `drain`'s loop a `for (let next = first; next !== undefined; next = held)` if the repo's mutant cleanups prefer it (Phase 30 precedent: loop head as the narrowing, `30-REVIEW-FIX.md`).

### 2. The three adoptions (shape, from the converted scratch stores)
```typescript
// TimelineFeed.readSource  (was: generation += 1; const mine = generation; status.set(READING); …; forkRead(runSource(...).pipe(Effect.onExit(...))))
const readSource = (source: Source | undefined) => {
  const token = run.begin();
  status.set(READING);                                         // publish between begin and fork
  const marking: Pick<TimelineStore, "accept"> = {
    accept: (record) => {
      if (!run.isCurrent(token)) return;
      timeline.accept(record);
    },
  };
  run.fork(token, runSource(marking, source ?? NO_SOURCE), {
    onFailure: (cause) => status.set(TimelineStatus.Stopped({ reason: Cause.pretty(cause) })),
  });
};
// TimelineFeed.restart:  if (!run.closed()) readSource(inputs.source);
// DiagnosticsFeed.start: token = run.begin(); const target = store; show(diagnosticsStarting.status); marking.accept guards with run.isCurrent(token);
//                        run.fork(token, runDiagnostics(marking, runOptions(next)), { onFailure: (cause) => show(DiagnosticsStatus.Stopped({ reason: Cause.pretty(cause), sampled })) });
// DiagnosticsFeed.off:   run.stop(); store = makeDiagnosticsStore(); sampled = false; view.set(diagnosticsOff);   (the closed guards stay: run.closed())
// SimulationSession:     const supersede = () => { run.stop(); };  land(mine: RunToken, …) { …; if (!run.isCurrent(mine)) return; … }
//                        start: if (run.closed()) return; … const mine = run.begin(); run = Running; commit(); run.fork(mine, land(mine, …));
//   (rename the session's local `run: RunState` or the module binding; the scratch conversion used `runs` for the module.)
```

### 3. A RED re-entrancy test for a feed (pre-fork), written in the existing style
```typescript
// Source: scratch T2, in the style of DiagnosticsFeed.test.ts (it.effect + step + asking)
it.effect("a subscriber that restarts the feed inside its Starting notification leaves the newest run polling", () =>
  Effect.gen(function* () {
    const feed = yield* makeDiagnosticsFeed();
    const calls = { a: 0, b: 0 };
    let once = false;
    feed.subscribe(() => {
      if (once || feed.getSnapshot().status._tag !== "Starting") return;
      once = true;
      feed.configure({ questions: () => { calls.b += 1; return asking(`b${calls.b}`); } });
    });
    feed.configure({ questions: () => { calls.a += 1; return asking("a"); } });
    yield* step("4 seconds");
    assert.isAtLeast(calls.b, 2);            // base: 1, the newest run was installed first and then interrupted
  }));
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `reap`/`hasRetired` retired list (ARCH-20 D-20-b) | scope-owned `FiberHandle` (ADR-QD-137) | 2026-11-11 | the three stores' hand protocol |
| three hand copies of the protocol | one module (this phase, ADR-QD-150) | this phase | locality; closes the two re-entrancy defects |
| guarded stop (`Option.isSome(getUnsafe)`) | unconditional stop | this phase | the guard saved one throwaway fiber, no observable effect |

**Deprecated/outdated:** `it.scoped` in AGENTS.md §10 (does not exist in `@effect/vitest@4.1.2`); ADR-QD-137 §7's `useRunningStore` sentence (deleted by ARCH-82).

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | An **unnamed** `Effect.fn` for the module is preferable to a named one (avoids a new child span in every store build; AGENTS.md says "Name it when a span is wanted"). I verified no test counts feed spans and the session root-span test is unaffected, but I did not run the converted stores with a named module | Interface typed; Pitfalls | Low: a named span would add a span `qadi.devtools.makeSupersedingRun`; tests would still pass but the trace tree changes |
| A2 | `fork` returning `true` when a fork is held (not yet started) is the right reading of D-02 "says whether it did" | Held-fork prototype | Low: no store reads it today; a planner may prefer `void` plus a distinct held signal |
| A3 | `begin()`-without-`fork` not interrupting the older fiber (P4) is acceptable and matches today's base | Design notes | Low: the stores always pair them; if the user wants `begin` to interrupt, the module needs an `Effect.void` install in `begin`, which changes the session's "Running announced, old run keeps going until fork" window |
| A4 | The spec location split of BEH-QD-521..525 (feeds in `28-devtools-screens.md`, session cross-reference in `29-devtools-simulator.md`) and the INV-QD-319/320 meaning | Records inventory | Low: Claude's Discretion in CONTEXT; planner decides |
| A5 | CONTEXT D-11 says a seeded `fc.commands` model "ARCH-79 / Phase 31 pattern". The Phase 31 file in the repo (`packages/core/test/SharedComputation.test.ts:566-845`) does **not** use `fc.commands`: it uses `FastCheck.array(FastCheck.oneof({weight, arbitrary}…), { maxLength: 16 })`, a hand-written interpreter dispatched by `Match.type<Command>().pipe(Match.tagsExhaustive(…))`, `FastCheck.asyncProperty`, `{ numRuns: 300, seed: 3101 }` and `assert.isAtLeast(counter, 30, …)` non-vacuity floors. I recommend following the repo precedent form; `fc.commands` exists in fast-check 4.10.2 but I did not verify its API this session | Validation Architecture | Medium if the user insists on `fc.commands`: different shape of the property file; both satisfy "seeded, weighted, floors" |
| A6 | An unbounded drain loop (a body that re-forks forever) is acceptable; no bound added | Design notes | Low: a caller bug that overflows the stack today |
| A7 | `Scope.make("parallel")` cannot be shown to misreport in a simple scratch (it did not), so the ADR caveat is stated as a documented limit | Pitfall 3 | Low |

## Open Questions

1. **Where does the RED-first discipline commit its RED cases?**
   - What we know: `_SHARED-CONTEXT.md`: "a task's verify never runs a suite that still contains another task's intentionally RED test"; WX-06 wants characterisation/RED first on the base.
   - What's unclear: whether RED store tests are committed RED (then fixed in the next commit of the same plan) or written inside the conversion plan after being seen RED.
   - Recommendation: write each RED case in the same plan that converts its store: first commit `test(37-0N)` containing the case, run it and record RED on the unchanged store in the SUMMARY, second commit the conversion that turns it GREEN. Never leave a RED test at a plan boundary.
2. **Should the unnamed module constructor be the rule, or a named one?** (A1.) Recommendation: unnamed; confirm in review.
3. **Do we want to pin `TimelineFeed.configure` on a closed feed?** Today it republishes `Reading` after close (unpinned, preserved by the conversion). Recommendation: leave unpinned, note it in the CCR as out of scope.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node | scripts, Stryker | yes | engines `>=22.12.0` (used here) | none needed |
| pnpm / `pnpm exec` | all commands | yes | `pnpm@10.17.1` (`packageManager`) | none |
| vitest | tests | yes | 5.1.0 | none |
| Stryker devtools config | WX-05 | yes | 10.1.1, ran in 247 s | none |
| `fast-check` | RUN-07 | yes | 4.10.2 | none |
| Browser/Playwright, DB, services | not needed | n/a | n/a | none |

**Missing dependencies with no fallback:** none. **With fallback:** none.

## Validation Architecture

`workflow.nyquist_validation` is `true` in `.planning/config.json` [VERIFIED: file read], so this section is required.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest 5.1.0 + `@effect/vitest` 4.1.2 (`it.effect`, `TestClock`), happy-dom for the whole `devtools` project |
| Config file | `packages/devtools/vitest.config.ts` (project name `devtools`); root `vitest.config.ts` (`projects: ["packages/*"]`) holds the coverage thresholds (devtools `src/model/**` 95/95/95/95) |
| Quick run command | `pnpm exec vitest run --project devtools packages/devtools/test/model/SupersedingRun.test.ts` |
| Store files | `pnpm exec vitest run --project devtools packages/devtools/test/model/TimelineFeed.test.ts packages/devtools/test/model/DiagnosticsFeed.test.ts packages/devtools/test/model/SimulationSession.test.ts` |
| Full devtools | `pnpm exec vitest run --project devtools` (1362 tests, 57 files, about 12 s at the base) |
| Coverage | `pnpm exec vitest run --project devtools --coverage` (or `pnpm coverage` for the gate) |
| Typecheck / lint / style / cycles | `pnpm typecheck`, `pnpm lint` (oxlint + `scripts/check-house-style.mjs`), `pnpm circular`, `pnpm test:tstyche` |
| Mutation | `pnpm exec stryker run stryker.devtools.mjs --mutate '<files>'` (about 4 min for the three stores, add the module at the close) |
| Spec gates | `node scripts/spec-revise.mjs --check`, `pnpm spec:verify:strict`, `pnpm spec:examples`, `pnpm spec:gates`, `pnpm spec:api` |
| Phase gate | `pnpm check:pr < /dev/null` (ten silent minutes means hung) |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|--------------|
| RUN-01 | module owns the protocol; two-step interface | unit (module interface) | `pnpm exec vitest run --project devtools packages/devtools/test/model/SupersedingRun.test.ts` | Wave 0 (new) |
| RUN-02 | stores contain none of `let generation`, `let closed`, `FiberHandle.make`/`.runtime`, bump-in-finalizer | negative grep scoped to added lines | `git diff <phase-base> -U0 -- packages/devtools/src/model | /usr/bin/grep '^+' | /usr/bin/grep -E 'let generation|let closed|FiberHandle\.(make|runtime)'` must be empty; plus a positive grep of the three stores for `SupersedingRun`/`makeSupersedingRun` | n/a (command) |
| RUN-03 | supersede; close mid-run incl. defecting finalizer; stop in not-started/running/completed/closed; interrupt vs failure; two instances | unit | module test file rows P1-P9 below | Wave 0 (new) |
| RUN-04 | stop unconditional; no run: nothing changes, nobody notified, no span, handle empty | unit on module + store-level pins (session: `stop` with no run and the Refused path; diagnostics `configure(undefined)` when already off is F26) | same file; `SimulationSession.test.ts` addition | Wave 0 |
| RUN-05 | restart from inside Starting/Reading notification leaves newest run live (3 stores); in-prefix repaired | store-level RED then GREEN: T1 and T3 and T6 in `TimelineFeed.test.ts`; T2 and T4 in `DiagnosticsFeed.test.ts`; T5 in a session test | the three store files | Wave 0 (new cases, RED on base) |
| RUN-06 | root span, interruption never `Stopped`, session `Broke` on defect and **self-interrupt** | existing TF12/TF19/F9/F24, `:460-475` root span, `:1669` Broke, plus the **new** self-interrupt row | `SimulationSession.test.ts` | self-interrupt row missing: Wave 0 (green on base) |
| RUN-07 | seeded property over begin/fork/land/stop/close | property (`asyncProperty`, seed, floors) | `SupersedingRun.test.ts` `describe("PROPERTY: …")` | Wave 0 (new) |
| RUN-08 | ADR-QD-137 and AGENTS.md §10 corrected | doc gate | `node scripts/spec-revise.mjs --check`; `pnpm spec:verify:strict`; `/usr/bin/grep -n 'it.scoped' AGENTS.md` empty | n/a |
| WX-05 | mutation not falling | compare script on `reports/mutation-devtools/mutation.json` vs `37-mutation-base.json` | the stryker command above | base JSON is Wave 0 |

### Module test rows (what `SupersedingRun.test.ts` must contain, from the experiments)
1. a begun-then-superseded token's `fork` returns `false` and the body never starts (P1);
2. a newer `fork` interrupts the older run; only the newer lands (supersede);
3. close mid-run: the run is interrupted and its `onFailure` never fires, **including a body whose release dies** (the TF19/F24 analogue: `Stream.ensuring(Effect.die(...))`/`Effect.never.pipe(Effect.ensuring(Effect.die(...)))`), built with `Scope.make()` + `Scope.provide` + `Scope.close(scope, Exit.void)`;
4. `begin()`, `fork`, `stop()` after close are inert (`closed()` true, `fork` false, no start);
5. `stop` in four states: not started (no run, handle empty, no hook), running (interrupts), completed (nothing), closed (nothing); no `onFailure` fires from a stop;
6. interrupt vs failure: a current die fires `onFailure` once with the cause; an interruption (replaced, stopped, closed) never does; a stale run's failure never does (P7);
7. two instances in two scopes share nothing (P9);
8. pre-fork re-check (P1) and in-prefix hold: nested `fork` is held and the newest runs while the stale outer is interrupted (P2), three-deep chain (P3), `stop` in the prefix (P5), close in the prefix with no throw (P6), `begin()`-without-`fork` documented as fenced (P4);
9. self-interrupt is **not** the module's concern; it is the session's `Broke` row (store-level).
Use the experiment bodies in `.../scratchpad/scratch-tests/zzScratch37b.test.ts` as the starting rows (they are written in the repo's `it.effect` style).

### RED tests that must exist first
On the unmodified base (all seen RED this session): T1, T2 (pre-fork, per feed), T3, T4, T5 (in-prefix, per store), T6 (auto-restart on `Stopped`). Green-on-base characterisations to add first: the session self-interrupt row (`Broke`, not `Running`), the timeline ordering row `["Reading","Stopped"]`, a session stop-with-no-run pin (snapshot reference-equal, subscriber not notified). The **module** RED tests cannot be RED on the base (the module does not exist); they go first in the module plan.

### Property design (RUN-07)
Follow `SharedComputation.test.ts:566-845`: commands `Begin`, `Fork {ok|die|never}`, `Land`, `Stop`, `Close` generated with weights (skew toward `Begin`/`Fork` so a stale token meets a live one often); a model of `{current, installed, closed}`; check after every step: only the current token's result landed, nothing landed after close, at most one live run, no `onFailure` for a stale/interrupted run. Floors (never lowered): count of forks refused by a stale token, of replaced-while-running runs, of close-while-running, of stop-while-running. `{ numRuns: 300, seed: <fixed> }`, `asyncProperty`, `Effect.runPromise(program(cmds))` inside `it.effect`, timeout 60 s as the precedent.

### Sampling Rate
- **Per task commit:** the module test file or the one store file touched, plus `pnpm typecheck` for the task that edits source.
- **Per wave merge:** full devtools project and `pnpm lint:style`.
- **Phase gate:** `pnpm check:pr < /dev/null` green, mutation compare green, `git diff` negative greps empty.

### Wave 0 Gaps
- [ ] `packages/devtools/test/model/SupersedingRun.test.ts` (module rows + property)
- [ ] new RED cases in `TimelineFeed.test.ts`, `DiagnosticsFeed.test.ts`, `SimulationSession.test.ts` (or a new session file; Phase 41 will add its own RED session test to a new file because this one is 1,809 lines)
- [ ] session self-interrupt row, timeline ordering row, session no-run stop pin (green on the base)
- [ ] `37-mutation-base.json` (measured: three stores; new: the module), committed alone, first
- [ ] a traceability row for each new test file

## Security Domain

`security_enforcement` is enabled in `.planning/config.json` (absent or `true`; ASVS level 1, block on high). This phase is an in-process devtools model refactor; it adds no input surface, no auth, no crypto, no network, no storage.

### Applicable ASVS Categories
| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | n/a |
| V3 Session Management | no (a "session" here is the simulator's store, not a user session) | n/a |
| V4 Access Control | no | n/a |
| V5 Input Validation | no new input | n/a |
| V6 Cryptography | no | n/a |
| V11 Business Logic / V12 Concurrency (integrity of "only the current run lands") | yes, as a correctness property | token fence + module tests + property (RUN-07) |

### Known Threat Patterns for this stack
| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| A superseded Live simulator run keeps querying the application's real resolvers | Information disclosure / DoS (BEH-QD-322) | unconditional `stop` interrupts inside the command; existing "stops at once" pins stay; T2's stale-poll leak (an invisible stale run polling `questions()` forever) is closed by the held fork |
| A replaced run writes a stale result over a fresh one | Tampering (integrity of what a reviewer sees) | `isCurrent(token)` on every landed write |
| A closed store keeps publishing | Tampering | closed guards kept in the stores + finalizer order |

## Sources

### Primary (HIGH confidence)
- `node_modules/effect/src/FiberHandle.ts` (`make` `:130-148`, `setUnsafe` `:~395-436`, `runtime` `:901-945`), `internal/effect.ts` (`scopeCloseFinalizers` `:4050-4071`, `makeScope` default `"sequential"` `:4152`), `Scope.ts` (`make`/`makeUnsafe`), version 4.1.2 from its `package.json`
- `@effect/vitest@4.1.2/src/index.ts` (`effect`, `live`, `layer`; no `scoped`)
- Repo at HEAD (= `637c0601` for src/spec/scripts): `packages/devtools/src/model/{TimelineFeed,DiagnosticsFeed,SimulationSession,ExternalStore,TimelineStore}.ts`, `src/react/useScoped.ts`; `packages/devtools/test/model/{TimelineFeed,DiagnosticsFeed,SimulationSession,DockModel}.test.ts`, `test/helpers.ts`; `stryker.devtools.mjs`; `vitest.config.ts`s; `scripts/spec-revise.mjs`, `scripts/check-house-style.mjs`; `spec/decisions/137-*.md`, `047-*.md`, `index.yaml`; `spec/README.md`, `spec/invariants.md`, `spec/traceability.md`, `spec/behaviors/28-devtools-screens.md`, `29-devtools-simulator.md`; `AGENTS.md`; `packages/core/test/SharedComputation.test.ts` (Phase 31 property); `.planning/milestones/v1.3-phases/34-*` (mutation base writer)
- Executed this session: six RED scratch reproductions, nine module experiments, three-store scratch conversion (tsc, 1362 devtools tests, house-style, oxlint), `yieldNow`-first count (36), nested/stale-fork instrumentation, Stryker run over the three stores (247 s). Evidence files in `/private/tmp/claude-502/-Users-mohammadalmechkor-Projects-Perso-qadi/bea2edc6-796f-4f45-9f14-5cbd1f92cfb8/scratchpad/` (`proto.out`, `nested.out`, `yield-fails.txt`, `mutation-base-measured.txt`, `stryker-base.log`, `scratch-tests/`)

### Secondary (MEDIUM confidence)
- `.planning/research/SUMMARY.md`, `STACK.md`, `PITFALLS.md` (R1, R2, R6; their reproductions were re-run here and confirmed)

### Tertiary (LOW confidence)
- none; no external web source was needed (the phase is internal to the repo and `effect@4.1.2`, both read directly). The `research-plan` seam was not used because no external documentation question remained.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH, no new dependency, versions read from disk
- Architecture: HIGH, prototype compiled, drove all three stores, 1362/1362 existing tests pass
- Pitfalls: HIGH, each is reproduced or read in source; the parallel-scope caveat is documented-only (A7)

**Research date:** 2026-11-14
**Valid until:** until `effect` moves off 4.1.2 (re-check `FiberHandle.ts:395-436` and `internal/effect.ts:4050-4071`); otherwise 30 days
