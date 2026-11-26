# Phase 87: One scoped run that states its stop - Research

**Researched:** 2026-11-25
**Domain:** `@qadi/devtools` model layer (effect 4.1.2 fibers, `SupersedingRun`, three stores), one React box, spec records
**Confidence:** HIGH (every decision-bearing claim below was run, not read: a spike on the real engines, a full prototype of the phase in a scratch copy of HEAD that passes the whole devtools suite, `tsc`, oxlint, madge and the house-style gate, and a fresh Stryker base)

<user_constraints>
## User Constraints (from CONTEXT.md)

Copied from `87-CONTEXT.md`. D-01..D-21 are locked except where a decision names its own spike condition (D-08, D-09); the spike below settles both.

### Locked Decisions
- **D-01:** branch `arch-wave-16` only, one phase at a time, main tree. No merge, push, tag, release, publish, `changeset version` or version-packages PR (WX-07). Never `git add -A` under `.planning/milestones`; never stage `.planning/config.json`, `README.md`, `.agents/`, `.codex/`, `.planning/state.json`, `assets/` or `*.iter*.md`.
- **D-02:** only the reserved records: ARCH-134, ADR-QD-200, CCR-QD-479, BEH-QD-771..775, INV-QD-419..420. Never run `node scripts/next-id.mjs`. An unused reservation is named in the CCR row ("Unused: ..."). Pass `--date 2026-11-25` (or the real edit date) to `scripts/spec-revise.mjs`.
- **D-03:** every behaviour change is preceded by a test written on the phase base (RED there for a change, green for preserved behaviour); every new check is shown failing once, scratch variant and failing text recorded in `87-RED-EVIDENCE.md` (WX-06). `pnpm check:pr < /dev/null` green at the phase end (WX-01).
- **D-04:** one `.changeset/*.md` per edited public package: `@qadi/devtools` **patch** (broken-run text is `causeMessage`'s, shown as a preformatted block; a timeline or diagnostics run whose own work interrupts itself now reads stopped, if D-08 holds; "No export changes.") and `@qadi/core` **patch** for the `ThrownMessage.ts` doc ("No export changes."). Not Breaking.
- **D-05:** every commit ends with exactly one trailer line, `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- **D-06:** new package-private `packages/devtools/src/model/StatedRun.ts` (out of the barrel, ADR-QD-099) composing the unchanged `makeSupersedingRun`; the planner may rename it; never fold it into `SupersedingRun.ts`.
- **D-07:** the module owns publish-then-fork as `start(publish, engine)` = `const token = runs.begin(); try { publish(token) } finally { runs.fork(token, body(token, engine)) }` and nothing more (ADR-QD-194), the token-guarded sink, the stop rule (D-08), `restart` (re-runs the last engine, a no-op once closed), the closed guard. The store supplies its engine and its state constructors. No one-call `run(effect)` that publishes inside the module. The factory is an unnamed `Effect.fn` (no child span on a store build; no `Effect.fnUntraced`) and building stays synchronous.
- **D-08:** a current, unclosed run whose engine exits with anything but success is stopped, stated with `causeMessage(cause)`, interrupt-only causes included; the module reads the engine's exit with `Effect.exit` inside the forked body and gates the write with `isCurrent` afterwards, as `land` does. A timeline source or diagnostics collector that interrupts itself now reads `Stopped`; the session's SR1 (`Broke`) is the same rule. An interruption from outside never states a stop. **Condition checked by the spike:** if any outside interruption is still current when the run's exit is read, the feeds keep today's rule, the BEH says so, and the session keeps its exit read as a documented exception. Either way the outcome gets its own test and an ADR-QD-200 line (STOP-04).
- **D-09:** if D-08 holds, `ForkHooks.onFailure` has no `src` caller after the move: remove it from `SupersedingRun.ts` and re-home the properties of R3, R6, R9 and model law 5 as the new module's tests, with an audit table in ADR-QD-200 naming each edited or removed row and the test that now holds its property. If D-08's condition fails, `onFailure` stays. ADR-QD-150 gets a dated note either way.
- **D-10:** one configure prologue, stated once, taking the rule as parameters: `closed` (guard first, BEH-QD-636), `complete` (the normaliser, throws a refused capacity before anything moves, ADR-QD-191 d11), `same` (the identity gate), then `held = wanted`, then the steps (which read `held` when they run). Timeline passes `sameFields`; diagnostics `sameFieldsOrAbsent`; gates `(a, b) => sameFields(a, b) && watchFailure === undefined`. `GatesFeed` keeps forking before it publishes (INV-QD-408) and gains no status. Home (in `StatedRun.ts` or a sibling) is the planner's call.
- **D-11:** `SimulationSession` uses the module's publish-then-fork and stop rule, keeps `land` as `Effect.fn("qadi.devtools.simulationSession.run", { root: true })`, keeps its own exit read (success to `Ran`, anything else of a current run to `Broke`), and `Broke.message` becomes `causeMessage(exit.cause)`. `Broke`'s shape and the `run` / `Refused` paths are unchanged.
- **D-12:** the readout doc, the ADR-QD-194 rethrow paragraph and the `Stopped{reason}` doc move to the module (one copy); each feed's states stay its own public type (no merged status type).
- **D-13:** the Simulator's `Broke` box renders `broke.message` in a `<pre>` with `StoppedBox`'s reason style and accessible shape (focusable, labelled scroll region). `reasonStyle` moves to `react/theme.ts` as a named export and `StoppedBox.tsx` imports it, byte-identical render. Heading text and `data-testid="qadi-simulator-broke"` stay. Pinned in a new Simulator test file. UI hint stays "no"; no UI-SPEC.
- **D-14:** `restart` on a bare timeline feed (no source) stays an empty read, unchanged and characterised.
- **D-15:** plan 1 records the phase base and the mutation base, runs the spike, writes the RED test (a session run that dies reports `Broke.message === causeMessage(cause)`, plus a hostile-value case that yields the placeholder, never `Cause(`), seen RED on the base with failing text in `87-RED-EVIDENCE.md`, and a characterisation of each feed's status sequence including today's self-interrupt (green on the base). If D-08 holds, the feeds' self-interrupt rows are RED-on-base tests of the new rule in a new file, and today's behaviour is recorded in the evidence file.
- **D-16:** every existing `packages/devtools` test file is held byte for byte by a pinned check, except `test/builtFeeds.ts` (D-18) and, only if D-09 removes `onFailure`, `test/model/SupersedingRun.test.ts` (edited rows audited). TF21-23, TF28, F28-31, F33, SR1, SR5-6 are held unedited in every case. New tests go in new files.
- **D-17:** a start-up publish whose listener throws **and** issues a superseding command from the same listener, in one run: the throw is rethrown once, by identity, after the fork; the superseding command's run is the live one; the first run never writes.
- **D-18:** the four build-then-configure copies in `test/builtFeeds.ts` collapse into one generic helper in that file; `react/useConfigured.ts` unchanged.
- **D-19:** `stryker.devtools.mjs` already mutates `src/model/**`; base record `87-mutation-base.json` first on the phase base for `SupersedingRun.ts`, the three feeds, `SimulationSession.ts`, `GatesFeed.ts`; at close, moved code is compared as sum killed/total of its source files against its destination (a `RENAMED` map), no touched file's score may fall, a drop is closed with a test, never re-baselined, every equivalent survivor recorded with its reason.
- **D-20:** phase scripts after Phase 85/86: `87-check.mjs`, `87-pinned-check.mjs`, `87-mutation.mjs`, `87-earlier-checks.mjs` (85 and 86 checks from scratch copies), each with a self-test and each mode seen failing once.
- **D-21:** ADR-QD-200 applies, does not reopen, ADR-QD-150 point 2; extends ADR-QD-182 decision 10 to the session and amends decision 11's "String of a Cause is the one other rendering" and `ThrownMessage.ts`'s matching paragraph in the same commit (the `v4-api-smoke` canary stays); amends ADR-QD-192 (the prologue) and ADR-QD-194 (the ordering stated once, in the module); records D-08's outcome and D-09's audit table. BEH-QD-771..775 and INV-QD-419..420 state the module, the stop rule, the prologue, the session's message and the Simulator's `<pre>`; BEH-QD-519 (and 507 / 637 / 461 as needed) restated for the self-interrupt rule; traceability and the CCR-QD-479 row move with them.

### Claude's Discretion
- The module's exact exported names and the parameter record's field names.
- Whether the prologue is a function in `StatedRun.ts` or a sibling module (D-10).
- The `<pre>`'s accessible label text (D-13), as long as it is labelled and focusable like `StoppedBox`'s.
- Plan count and wave split, as long as plan 1 is the spike plus RED and the tracer task is verified before expansion.

### Deferred Ideas (OUT OF SCOPE)
- Merging `TimelineStatus` and `DiagnosticsStatus` into one public type: rejected.
- Routing `GatesFeed`'s cadence through publish-then-fork: rejected (INV-QD-408).
- `StoppedBox` keying and the announce-once rule: Phase 88.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| STOP-01 | one package-private module above `SupersedingRun` owns publish-then-fork, failure to `Stopped`, restart, closed guard, token-guarded sink | "Module API" and Pattern 1; the prototype (`StatedRun.ts`, 58 lines undocumented) makes all 2002 devtools tests pass |
| STOP-02 | `TimelineFeed` / `DiagnosticsFeed` supply only engine and states; `SimulationSession` shares publish-then-fork and the stop rule | "What each store becomes"; the session keeps `land` and a `Running`-guarded `stopped` hook |
| STOP-03 | `GatesFeed` shares the configure prologue (and forks before it publishes) | "The prologue"; `ConfigurePrologue.ts` (19 lines) used by three feeds, gates unchanged elsewhere |
| STOP-04 | the self-interrupt policy is decided once, tested and recorded | Spike Q1 (D-08 holds) and Q2 (what each run published) |
| STOP-05 | the Simulator's broken-run text is `causeMessage(cause)` in the feeds' `<pre>` treatment | Spike Q3, "The Simulator" (D-13), the held tests that keep passing |
| WX-01..WX-07 | cross-cutting (`check:pr`, ids, changeset, forbidden constructs, coverage and mutation, RED evidence, no release) | "Validation Architecture", "Project Constraints", "Mutation" |
</phase_requirements>

## Summary

The spike answers both locked conditions in favour of the plan. **D-08 holds:** on effect 4.1.2 an interruption from outside (supersede, `stop()`, the scope closing, a dying release) never resumes the forked body at all, so the exit is never read for it; and when a body does resume with a non-current token (a run that ends on its own after a newer `begin`), `isCurrent` is false. A run that interrupts itself resumes with `Failure`, interrupt-only, current: it is the only interrupt the new rule states. Two independent mechanisms protect the outside paths, which matters for mutation testing (below). **D-09 follows:** after the move `onFailure` has no `src` caller; removing it makes R9 and model law 5 fail, and R3, R5, R6, R7 pass *vacuously* (their `heard` stays `[]`), so a type check, not a test failure, is what finds them. All five rows, the `listener` helper, `hooksFor` and the `ForkHooks` import need editing and their properties re-homed with positive controls.

The whole phase was prototyped in a scratch copy of HEAD (not in the repo): `StatedRun.ts`, `ConfigurePrologue.ts`, the three stores, `SupersedingRun.ts` without `onFailure`, the Simulator `<pre>` and `reasonStyle` in `theme.ts`, `builtFeeds.ts`. Result: **97 files, 2002 tests pass** (the base is 97 files, 2002 tests, 17 s) with `SupersedingRun.test.ts` the only file that fails to compile or fails; `tsc -b packages/devtools` is clean; oxlint shows no new warning; `madge` finds no cycle; `scripts/check-house-style.mjs` reports "627 file(s) clean". No existing test asserts a feed's self-interrupt staying `Reading` / `Live`; only spec and doc sentences do (list in "Spec sentences to amend"). No shipped `Source`, `TimelineStore` or `Diagnostics` code path interrupts itself (grep), so the visible change is confined to a host-supplied source or collector that does.

One decision in CONTEXT needs a refinement the code forces, not a reversal: the session's `land` keeps its exit read (D-11), so the module's stop rule fires for the session only for a defect *outside* that read. Two such defects exist (a throw while building the `Ran` reading, and a listener throw on the `Ran` publish). Today a listener throw on `Ran` leaves `Ran` shown (spike); if the session handed the module an unguarded Broke-writer it would overwrite a landed result. The session's hook is therefore guarded by `run._tag === "Running"`, which also closes a third gap (a throw between the exit read and the `Ran` write used to leave `Running` forever).

**Primary recommendation:** build `StatedRun.ts` as `makeStatedRun(stopped)` returning `{ start(plan), stop, closed }` where a store's `plan` is `{ starting, engine(live) }`, add `ConfigurePrologue.ts` (`makeConfigure(rule, steps)`), remove `ForkHooks`/`onFailure`, give the session a `Running`-guarded `stopped`, move `reasonStyle` to `theme.ts`, and make plan 1 the spike evidence plus RED tests exactly as listed in "Validation Architecture".

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| run protocol (token, closed, handle) | devtools model (`SupersedingRun.ts`, unchanged except `onFailure`) | none | package-private, ADR-QD-150 |
| publish-then-fork, stop rule, guard, closed guard | devtools model (`StatedRun.ts`, new) | none | one owner above the protocol, no React |
| configure prologue | devtools model (`ConfigurePrologue.ts`, new) | none | gates has no run, so the prologue cannot live in `StatedRun.ts` |
| what a status means (`Stopped`, `Broke`) | each store (public types) | none | `Stopped` shape is Phase 88's input; unchanged |
| render of a stop reason | devtools React (`StoppedBox.tsx`, `Simulator.tsx`) over `theme.ts` | none | `<pre>` style shared, one named export |
| reason text | in-memory snapshot only | none | never a sink record, response, log or metric (BEH-QD-519, ADR-QD-182 d4) |

## Standard Stack

No package is installed or upgraded. Everything is already in the workspace.

| Library | Version | Purpose | Verified |
|---------|---------|---------|----------|
| effect | 4.1.2 | `Effect.fn`, `Effect.exit`, `Exit`, `FiberHandle`, `Cause` | [VERIFIED: `node -e require("effect/package.json").version` this session] |
| vitest | 5.1.0 | project `devtools`, happy-dom | [VERIFIED: vitest RUN banner this session] |
| @stryker-mutator/core | 10.1.1 | `stryker.devtools.mjs` | [VERIFIED: stack-trace path this session] |
| Node / pnpm | v26.13.0 / 10.17.1 | tooling | [VERIFIED: `node --version`, `pnpm --version`] |

**Package Legitimacy Audit:** none. This phase adds no external package, so no `package-legitimacy` run applies. **Packages removed (SLOP):** none. **Flagged (SUS):** none.

## Spike evidence (run this session, files deleted; `git status --short -- packages` is clean)

All spike files were `packages/devtools/test/zz-spike87-*.test.ts`, run with `bash -c 'pnpm exec vitest run --project devtools <file> --silent=false < /dev/null'`. The prototype module used by the spike is the one in Pattern 1.

### Q1. D-08's condition: does any outside interruption read as current?

Raw protocol, real `makeSupersedingRun`, body `Effect.exit(engine)` then a read of `run.isCurrent(token)` (a probe records whether the body ever resumes):

```ts
run.fork(token, Effect.exit(engine).pipe(Effect.flatMap((exit) =>
  Effect.sync(() => { seen.push(`body resumed: exit=${exit._tag} current=${run.isCurrent(token)}`); }))));
// engine = Effect.never, or (swallow) Effect.uninterruptibleMask((restore) => restore(Effect.never).pipe(Effect.exit, Effect.asVoid))
```
Output [VERIFIED: spike run]:
```
supersede (begin+fork) swallow=false: body never resumed
stop() swallow=false: body never resumed
scope close swallow=false: body never resumed
begin without fork then stop swallow=false: body never resumed
supersede (begin+fork) swallow=true: body never resumed     <- even an engine that catches its own interruption
stop() swallow=true / scope close swallow=true / begin without fork then stop swallow=true: body never resumed
self-interrupt (Effect.exit(Effect.interrupt)): body resumed: exit=Failure interruptsOnly=true current=true
natural self-interrupt after a newer begin (the begin-without-fork window): resumed exit=Failure current=false
```
So an outside interruption **never reaches the exit read**, and a body that does resume while superseded reads `current=false`. D-08's condition holds on both counts.

Real engines (`runSource`, `runDiagnostics`) under the prototype module, each outside path with a source/layer whose **release dies** (`Effect.addFinalizer(() => Effect.die(...))`), `probes` = every time the module read an exit [VERIFIED: spike run]:
```
timeline  new source: tape=[] probes=[]            no source (undefined): status=Reading probes=[exit-read tag=Success current=true]
timeline  capacity change: tape=[] probes=[]       restart: tape=[] probes=[]       scope close: tape=[] probes=[]
diagnostics  options change: tape=[Starting,Live,Starting,Live] probes=[]     off: tape=[Starting,Live,Off] probes=[]
diagnostics  restart: probes=[]    scope close: tape=[Starting,Live] probes=[]
```
(The `no source` probe is the empty `NO_SOURCE` read ending by itself: `Success`, nothing stated, `Reading` stays: BEH-QD-519 "A source that ends by itself MUST stay `Reading`" holds.) A release that dies as the run is interrupted is never stated, for every path: R3's property holds without `onFailure`.

### Q2. What a self-interrupt does today, and under the new rule

Today, real stores [VERIFIED: spike run on HEAD]:
```
timeline read interrupts (source.read = Effect.interrupt):           tape=[]            final=Reading
timeline live stream interrupts (Stream.fromEffect(Effect.interrupt)): tape=[]          final=Reading
timeline live stream dies (control):                                 tape=[Stopped]     final=Stopped
diagnostics collector.snapshot = Effect.interrupt:                   tape=[Starting]    final=Starting   (stuck on Starting forever)
diagnostics collector dies (control):                                tape=[Starting,Stopped(sampled=false)]
diagnostics layer build interrupts (Layer.effectDiscard(Effect.interrupt)): tape=[Starting,Live]  reading.wiring=Failed
   (the wiring read catches a build's exit itself, so a layer's self-interrupt is `WiringRead.Failed`, not a run exit: unchanged by this phase)
session resolver = Effect.interrupt (SR1):  tape=[Running,Broke]  final=Broke  message first line "Cause([Interrupt(40)])"
session listener throws on the Ran commit:  tape=[Running,Ran]    final=Ran     (the fiber dies silently; Ran stays)
```
`Effect.exit` inside the forked body **does** capture a self-interrupt and the body continues (Q1 row "self-interrupt": `exit=Failure interruptsOnly=true current=true`).

Under the prototype [VERIFIED: spike run]:
```
timeline read interrupts / live interrupts: tape=[Stopped(InterruptError: All fibers interrupted without error)] probes=[exit-read tag=Failure current=true]
diagnostics collector interrupts:           tape=[Starting,Stopped(sampled=false)]
timeline, a listener that throws on the Stopped publish: calls=1 status=Stopped (the Stopped is held; same as the held F/TF rows)
```

### Q3. `causeMessage` and `String(cause)` on effect 4.1.2 [VERIFIED: spike run]

| Cause | `causeMessage(cause)` first line | `String(cause)` |
|-------|----------------------------------|-----------------|
| `Cause.die(new Error("the layer exploded"))` | `Error: the layer exploded` (then stack frames) | `Cause([Die(Error: the layer exploded)])` |
| `Cause.die(hostile)` (`toString` and `message` getter both throw; `test/helpers.ts:235`) | `a value that could not be described` (whole text; `Cause.pretty` throws, falls back) | `Cause([Die([toString threw])])` |
| `Cause.die(hostileError)` (`message` getter throws) | `a value that could not be described` | `Cause([Die([toString threw])])` |
| `Cause.die({ toString() { throw } })` | `Error: {}` | `Cause([Die([toString threw])])` |
| `Cause.interrupt()` | `InterruptError: All fibers interrupted without error {` (full: `...error {\n  [cause]: InterruptCause: The fiber was interrupted by:\n      at fiber (unknown)\n}`) | `Cause([Interrupt(undefined)])` |

`String(cause)` never throws (PITFALLS 87-A); this is an inconsistency, not a defect. A session run whose ports layer dies (`Layer.effect(AttributeResolver, Effect.die(...))`, the pattern of `SimulationSession.test.ts:1349`) publishes today, verbatim [VERIFIED: spike run]:
```
SESSION-DIE Error:   tape=[Running,Broke] message="Cause([Die(Error: the layer exploded)])"
SESSION-DIE hostile: tape=[Running,Broke] message="Cause([Die([toString threw])])"
```
These are the two RED rows of D-15: `Broke.message` must not start with `Cause(`; for `Error("the layer exploded")` its first line must be `Error: the layer exploded`; for `hostile` the whole message must be `a value that could not be described`. A bare `resolve: () => Effect.die(...)` does **not** reach `Broke` (the evaluator turns it into a `Failed` outcome, `Ran`, spike: `final=Ran`), so the die must be in the ports layer's build.

### D-17 row (the row nobody has) is green on the base

A listener on the start-up publish that issues a superseding command and then throws, run on **both** HEAD and the prototype [VERIFIED: spike run on both]:
```
D17-TIMELINE      threw=true identity=true reads=[B] final=Reading   (restart over a Stopped; the restart's own read A never started)
D17-DIAGNOSTICS   threw=true identity=true deadSamples=1 liveSamples=1 final=Live   (restart over a Stopped; the superseding configure's run is the live one)
D17-SESSION       threw=true identity=true nestedThrew=undefined resolves=1 final=Ran (the nested run is the live one, one resolver call)
```
Set-up detail the rows need: a repeat publish of `READING` / `diagnosticsStarting` notifies nothing, so the first run must end `Stopped` (timeline: a `Stream.die` live stream; diagnostics: a collector whose `snapshot` throws) and the throwing listener is armed once and fires on the `Reading` / `Starting` that `restart()` publishes. So D-17 is a **characterisation** (green on the base), not a RED row.

## Module API (prescriptive)

### `model/StatedRun.ts` (package-private)

```ts
// Source: the prototype in the scratch copy; 2002/2002 devtools tests pass; tsc, oxlint, madge, house-style clean.
import * as Effect from "effect/Effect";
import * as Exit from "effect/Exit";
import type * as Scope from "effect/Scope";
import { causeMessage } from "@qadi/core";
import { makeSupersedingRun } from "./SupersedingRun.ts";

/** What an engine is handed about its own run: whether it is still the current one, and a sink guard. */
export interface RunLive {
  readonly current: () => boolean;
  /** A write from a run that is no longer current is dropped, before it reads anything. */
  readonly guard: <A>(write: (a: A) => void) => (a: A) => void;
}
/** What a store starts: the state it publishes first (ADR-QD-194: it may throw), and the engine it forks. */
export interface RunPlan {
  readonly starting: () => void;
  readonly engine: (live: RunLive) => Effect.Effect<void, unknown>;
}
export interface StatedRun {
  /** `begin`, then `try { plan.starting() } finally { fork }`; does nothing once the scope has closed. */
  readonly start: (plan: RunPlan) => void;
  readonly stop: () => void;
  readonly closed: () => boolean;
}

export const makeStatedRun = Effect.fn(function* (
  stopped: (reason: string) => void,
): Effect.fn.Return<StatedRun, never, Scope.Scope> {
  const runs = yield* makeSupersedingRun();
  const start = (plan: RunPlan): void => {
    if (runs.closed()) return;                     // a restart on a closed store would publish a state nothing follows
    const token = runs.begin();
    const live: RunLive = {
      current: () => runs.isCurrent(token),
      guard: (write) => (value) => { if (!runs.isCurrent(token)) return; write(value); },
    };
    try {
      plan.starting();
    } finally {
      runs.fork(token, Effect.exit(plan.engine(live)).pipe(Effect.flatMap((exit) => Effect.sync(() => {
        if (runs.isCurrent(token) && Exit.isFailure(exit)) stopped(causeMessage(exit.cause));
      }))));
    }
  };
  return { start, stop: runs.stop, closed: runs.closed };
});
```
Design choices, each forced by something run:
- **`start(plan)`, not `start(publish, engine)` + `restart()` memory (refines D-07).** The held inputs (`held.source`, `held`) are the store's, and `restart` must read them *when it runs*. A module-held "last engine" would be a second copy of `held`, and a bare timeline (no `configure` yet) would have no last engine, but today's bare `restart()` forks an empty read (`NO_SOURCE`, D-14, a `qadi.devtools.runSource` span). With a `plan()` function the store owns, `restart` is one line (`reads.start(plan())`), D-14 is preserved by construction, and the closed guard is inside `start`.
- **`engine(live)` is evaluated after `starting()`** (inside the `finally`), as `runSource(marking, ...)` / `runDiagnostics(sink, next)` are today. The session depends on that order: `runClock` is read **before** the commit and `pairs` **after** it (`SimulationSession.ts:445,452`); the plan must capture `runClock` outside `plan` and let `engine` read `pairs` lazily.
- **`stopped(reason)` is passed at build** and stated only for a current run whose exit is not success, interrupt-only included. The module never inspects `Cause.hasInterruptsOnly`; `ForkHooks.onFailure` is removed (D-09).
- **`stop` is `runs.stop`**, `closed` is `runs.closed`: a feed's `configure` guard is `closed: reads.closed`.
- Unnamed factory, no `Effect.fnUntraced`, no module-scope `let`: the house-style gate accepts it (627 files clean).

### `model/ConfigurePrologue.ts` (package-private; a sibling, because `GatesFeed` has no run)

```ts
export interface ConfigureRule<Raw, Held> {
  readonly closed: () => boolean;
  readonly complete: (raw: Raw) => Held;
  readonly held: () => Held;
  readonly same: (held: Held, wanted: Held) => boolean;
  readonly hold: (wanted: Held) => void;
}
export const makeConfigure =
  <Raw, Held>(rule: ConfigureRule<Raw, Held>, steps: (wanted: Held, before: Held) => void) =>
  (raw: Raw): void => {
    if (rule.closed()) return;          // BEH-QD-636: a configure after close reads and publishes nothing, even for refused input
    const wanted = rule.complete(raw);  // throws a refused capacity before anything moves (ADR-QD-191 d11)
    const before = rule.held();
    if (rule.same(before, wanted)) return;
    rule.hold(wanted);
    steps(wanted, before);              // steps read `held` when they run, so a nested configure decides
  };
```
`closed` first, then `complete`, then `same`, then `hold`, then steps: the exact order of the three copies. `before` is needed by gates only.

## What each store becomes (prototype, verified)

**`TimelineFeed.ts`** (216 -> 200 lines; the `causeMessage` import and `makeSupersedingRun` import go):
```ts
let held = completeTimelineInputs({});
const timeline = makeTimelineStore();
const status = makeExternalStore<TimelineStatus>(READING);
const reads = yield* makeStatedRun((reason) => status.set(TimelineStatus.Stopped({ reason })));
const plan = (): RunPlan => ({
  starting: () => status.set(READING),
  engine: ({ guard }) => runSource({ accept: guard((record) => timeline.accept(record)) }, held.source ?? NO_SOURCE),
});
const restart = () => reads.start(plan());
return {
  timeline,
  status: { subscribe: status.subscribe, getSnapshot: status.getSnapshot, restart },
  configure: makeConfigure(
    { closed: reads.closed, complete: completeTimelineInputs, held: () => held, same: sameFields,
      hold: (wanted) => { held = wanted; } },
    () => callAll([() => timeline.resize(held.capacity), restart], "More than one step of the timeline feed's configure threw."),
  ),
};
```
**`DiagnosticsFeed.ts`** (236 -> 232): `show` stays (identity-guarded publish); `runs = yield* makeStatedRun((reason) => show(DiagnosticsStatus.Stopped({ reason, sampled }), view.getSnapshot().reading))`; `plan(next)` has `starting: () => show(diagnosticsStarting.status, view.getSnapshot().reading)` and `engine: ({ guard }) => runDiagnostics({ accept: guard(<today's accept body, sets sampled and Live>) }, next)`; `configure = makeConfigure({ closed: runs.closed, complete: (next) => next === undefined ? undefined : completeDiagnosticsOptions(next), held: () => held, same: sameFieldsOrAbsent, hold }, (wanted) => wanted === undefined ? (runs.stop(), sampled = false, view.set(diagnosticsOff)) : runs.start(plan(wanted)))` (written as an `if`/`else`); `restart = () => { if (held !== undefined) runs.start(plan(held)); }`. `diagnosticsStarting`, `diagnosticsOff`, `READING` stay module constants, so a repeat publish notifies nothing (INV-QD-408's premise).

**`GatesFeed.ts`** (299 -> 306): only `configure` changes: `makeConfigure({ closed: runs.closed, complete: completeGatesInputs, held: () => held, same: (a, b) => sameFields(a, b) && watchFailure === undefined, hold }, (wanted, before) => { ...today's body from "if (wanted.gates !== registryNow ..." through publish(...) })`. It still `makeSupersedingRun`s directly and forks its cadence before it publishes (INV-QD-408, G49).

**`SimulationSession.ts`** (596 -> 604): `import { causeMessage }`; `runs` is created **after** `commit` (its `stopped` closes over `run` and `commit`):
```ts
const runs = yield* makeStatedRun((reason) => {
  if (run._tag !== "Running") return;          // a defect after the run landed leaves the landed result
  run = { _tag: "Broke", question: run.question, message: reason };
  commit();
});
// land: first parameter `live: RunLive`; `if (!live.current()) return;` replaces `if (!runs.isCurrent(mine)) return;`;
//       `run = { _tag: "Broke", question, message: causeMessage(exit.cause) };`   // was String(exit.cause), :418
// start (after the Refused early return):
const runClock = clock;
runs.start({
  starting: () => { run = { _tag: "Running", question }; commit(); },
  engine: (live) => land(live, question, kind, prepared, runClock, pairs),
});
```
The `begin` still precedes `run = Running` (as `:444-446` today). `land` keeps its `Effect.fn(... { root: true })`, its `Effect.exit(program(...))` read inside the span, and `Ran`/`Broke`. The `Running` guard is the one addition beyond D-11; without it a listener throw on `Ran` would become `Broke` (today `Ran` stays: spike).

**Simulator** (`react/Simulator.tsx:106-110` -> `<pre role="group" aria-label="Why the simulation failed" tabIndex={0} style={reasonStyle}>{broke.message}</pre>`; `reasonStyle` moves to `react/theme.ts` (it uses only `colors` and `font`, both already there; theme exports today: `colors, withAlpha, font, dock, toolbar, body, button, input, muted, badge, panel, heading, chip, truncate`); `StoppedBox.tsx` imports it (163 -> 149 lines). The label mirrors the existing pattern ("Why the timeline stopped" is queried at `TimelineNotice.test.tsx:111` as `getByRole("group", { name: ... })`).

**`SupersedingRun.ts`** (143 -> 126): delete `ForkHooks`, the `hooks` parameter, the `Effect.onExit` wrapper and the `Cause`/`Exit` imports; `fork` becomes `(token, run) => boolean`. The module's header doc (ADR-QD-150's) stays accurate once "and says whether it did" is kept.

**`test/builtFeeds.ts`** (D-18), one generic helper, structural (no import from `src/react`), `tsc -p tsconfig.test.json` clean:
```ts
const configuredBy = <A extends { readonly configure: (inputs: I) => void }, I>(
  make: () => Effect.Effect<A, never, Scope.Scope>, inputs: I,
): Effect.Effect<A, never, Scope.Scope> => Effect.tap(make(), (built) => Effect.sync(() => built.configure(inputs)));
export const timelineFeedOf = (inputs: TimelineFeedInputs) => configuredBy(makeTimelineFeed, inputs);   // likewise diagnostics, gates, dock
```
Eight test files import `builtFeeds` [VERIFIED: grep]; none is edited. `react/useConfigured.ts:34` stays the hook form.

## D-09: `onFailure` removal, audited (recommendation: remove)

Callers of `ForkHooks.onFailure` [VERIFIED: grep over packages, spec, scripts, features]: `TimelineFeed.ts:186`, `DiagnosticsFeed.ts:206` (src), and `test/model/SupersedingRun.test.ts` (the `listener()` helper `:48-57`, `hooksFor` `:569-573`). Other `onFailure` hits (`Result.match`, sink forwarding) are unrelated. With the module moved, no `src` caller remains.

Run against the prototype with `onFailure` removed [VERIFIED: spike run in scratch copy]: `R9` fails (`expected +0 to equal 2`), the PROPERTY fails (`law 5: onFailure hears exactly the current runs that die: expected [] to deeply equal [ +0 ]`); `tsc` reports `ForkHooks` missing and "Expected 2 arguments, but got 3" at lines 116, 158, 174, 192, 228, 231, 232, 238, 243, 249, 649, 652. **R3, R5, R6, R7 still pass** because their `heard` array stays `[]`: they are vacuous, which is why the audit table must list them.

| Row (`SupersedingRun.test.ts`) | Property it pins | After removal | Holds the property now |
|---|---|---|---|
| R3 `:99` | a close mid-run interrupts and never reports, even when the release dies | edit (drop `hooks`/`heard`; keep interrupt + closed asserts) | `StatedRun.test.ts` row: scope close with a dying release states nothing; control: a current die on the same module states once |
| R5 `:143` | stop with no run starts nothing, calls no hook, opens no span | edit (`hooks` removed; the span/positive-control assertions stay) | `StatedRun.test.ts`: `stop` with no run states nothing and opens no span (with the same `collectingTracer` positive control) |
| R6 `:168` | stop in flight interrupts and is never reported | edit | `StatedRun.test.ts`: `stop()` of a running engine states nothing |
| R7 `:186` | stop after completion changes nothing, calls no hook, opens no span | edit | `StatedRun.test.ts` (same row as R5, completed-run variant) |
| R9 `:223` | the current run's defect is heard once; an interruption, a superseded or stale run is not | **remove or reduce to the protocol part** | `StatedRun.test.ts`: current die states once; a current self-interrupt states once (new); supersede / begin-window (non-current, naturally ending) / close state nothing |
| PROPERTY law 5 `:602`, `heard`, `hooksFor`, `modelHeard`, `heardFailures` `:508,522,569,602,616,760` | `onFailure` hears exactly the current runs that die; law 7 "nothing is heard after close" | edit (law 5 and the `heard` half of law 7 move) | a `StatedRun` model property: same command alphabet over `makeStatedRun`; the model states a stop for exactly the current runs whose body is `Die` or `SelfInterrupt` (new) |

The `ForkHooks` import (`:23`) becomes `import type { RunToken }`. R1, R2, R4, R8, R10-R17 and laws 1-4, 6-7 (except the heard half) are unedited. ADR-QD-150 gets a dated note: point 6 ("`ForkHooks.onFailure(cause)` is called only for ...") is superseded for the hook, and its closing clause "because an interruption must never read as `Stopped` (INV-QD-313)" is narrowed to "an interruption from outside". Traceability `spec/traceability.md:204` and `:656` cite R3, R9 and `onFailure`; both rows are edited with it.

**The model-law mutant that matters:** Stryker at the base leaves `SimulationSession.ts:402` `if (!runs.isCurrent(mine)) return;` -> `if (false)` **surviving** (below). The new module's `isCurrent` gate (`runs.isCurrent(token) && Exit.isFailure(exit)`) has the same exposure, because outside interruptions never resume the body: only a run that ends **naturally while superseded** (the begin-without-fork window of R15, spike row "natural self-interrupt after a newer begin": `current=false`) exercises it. The `StatedRun` tests must include that row for each of: defect, self-interrupt; or the gate's mutant survives.

## Spec sentences to amend (D-21; every one found by grep, with the exact current text)

| Where | Current text (verbatim) | Amendment |
|---|---|---|
| `spec/decisions/150-...md` point 6 | "`ForkHooks.onFailure(cause)` is called only for the current run's failure that is not interrupt-only, never for a run that was replaced, stopped or closed. The two feeds use it for their `Stopped` state. The session passes none: its `land` keeps mapping every non-success exit of a current run to `Broke`, a self-interrupt included, because an interruption must never read as `Stopped` (INV-QD-313)." | dated note (Rev 1.1): hook removed, stop rule in `StatedRun`; the reason clause now "an interruption from outside". Not a reversal of point 2 (the callback is what lets a store publish between `begin` and `fork`). |
| `spec/decisions/182-...md` decision 10 | "The devtools timeline feed, diagnostics feed, diagnostics wiring read and policy explorer render a run's cause with `causeMessage`, and the gates feed does too, in place of its own guard." | extend: and the simulation session (Rev 1.2) |
| decision 11 | "The `String(cause)` calls on an Effect `Cause` (`DecisionSinkForwarding.ts`, `EncodeRefusalReport.ts`, `SinkReport.ts`) were checked and are left alone: Effect already guards that string form, and `String(Cause.die(hostile))` returns `Cause([Die([toString threw])])`." | The session's `String(exit.cause)` was a fourth site that the list never named, and `packages/audit/src/AuditWriteReport.ts:273` is a fifth that it never named either [VERIFIED: grep]. State both; the three core sites stay (the `v4-api-smoke` canary stays). |
| `packages/core/src/ThrownMessage.ts:21-22` and `:50-51` | ":21 which is guarded on its own; and `String` of an Effect `Cause`, which Effect guards." / ":50 defect the caller's code raised cannot become a defect of ours. `String` of a / `Cause` is the one other rendering, and Effect guards it itself (ADR-QD-182)." | doc-only (`@qadi/core` patch): name where the other rendering still stands (the report sites that log `qadi.cause`), and that devtools no longer has one |
| `spec/decisions/192-...md` point 5 and 7 (`:75-90`) | "`GatesFeed`'s `configure` returns early on `sameFields(held, wanted) && watchFailure === undefined`, with a one-line comment saying why." / "Past `sameFields(held, wanted)` the body is `try { timeline.resize(wanted.capacity); } finally { readSource(wanted.source); }`." | the prologue is `makeConfigure`; the gates exception is its `same` argument (Rev 1.7). Note point 7's `try/finally` already became `callAll` under ADR-QD-194 d6; the amendment must say what is true now. |
| `spec/decisions/194-...md` point 5 (`:121-130`) | "...the two calls are `try { publish } finally { fork }`, not `callAll`. `SupersedingRun`'s `fork` returns a boolean ... a run's failure is its exit, reported through `onFailure`." | the ordering is stated once, in `StatedRun.start`; the clause naming `onFailure` is superseded (Rev 1.4) |
| `spec/decisions/047-...md:412-416, 464-466` (blockquote) | "**A defect stops visibly; an interruption never does.** The run's exit is observed, and `Cause.hasInterruptsOnly` separates an interruption (a restart, `configure(undefined)`, the scope closing) from a defect." / "an interruption never is" | dated amendment (Rev 1.24): `hasInterruptsOnly` no longer decides; the examples are all outside interruptions |
| `spec/invariants.md` INV-QD-313 (`:3807-3817`) | title "A poll defect is stated, an interruption never is, and a replaced run never writes"; "a poll that was interrupted (a restart, absent options, the scope closing, even when a layer's release dies as it closes) never does"; Source names "the `onFailure` hook, called only for the current run's failure that is not interrupt-only (`Cause.hasInterruptsOnly`)" and "the session passes no hook, and its `land` maps every non-success exit of the current run to `Broke`, a self-interrupt included" | the **title changes** ("an interruption from outside never is"; anchors `#inv-qd-313-a-poll-defect-is-stated-an-interruption-never-is-and-a-replaced-run-never-writes` are linked from BEH-QD-507 and BEH-QD-519 and `spec/traceability.md:204`, so every link moves with it); Source names `StatedRun.ts`; a run that interrupts itself is stated. Rev 1.232. |
| INV-QD-403 / 404 / 408 (`:4673-4743`) | Source lines name "the early return in `TimelineFeed.ts`, `DiagnosticsFeed.ts` and `GatesFeed.ts` (the last returning early on `sameFields(held, wanted) && watchFailure === undefined`)" / "`readSource`, which publishes `Reading` in a `try` and forks the read in its `finally`" / "`DiagnosticsFeed.ts` (`start`, the same ...)" | Source lines name `ConfigurePrologue.ts` and `StatedRun.start`; `GatesFeed.ts`'s fork-before-publish stays named |
| `spec/behaviors/28-devtools-screens.md` BEH-QD-519 (`:1672-1682`) | "REQUIREMENT: An interruption MUST NOT produce `Stopped`: not a new source, not no source, not a capacity change, not the scope closing, and not a replaced read whose release dies." / "REQUIREMENT: A source that ends by itself MUST stay `Reading`." | an interruption **from outside** MUST NOT; a read whose own work interrupts itself MUST produce `Stopped` (new requirement). "ends by itself" stays success-only. |
| BEH-QD-507 (`:1440-1442`) | "REQUIREMENT: An interruption MUST NOT produce `Stopped`: not a restart, not absent options, not the scope closing." | same split |
| BEH-QD-637 (`:2622`) | "REQUIREMENT: The feed MUST only fork the poll in the caller's scope. Closing the scope, or an interruption, MUST NOT be a `Stopped`." | "an interruption from outside" |
| BEH-QD-636 (`:2578-2581`) | "Closing the scope MUST end the read, and a close MUST NOT be a `Stopped`." / "`configure` on a feed whose scope has closed MUST read nothing and publish nothing, as `restart` does." | unchanged text; its pin list gains the prologue's test |
| BEH-QD-521..525 (`:1788-1934`) | "each does it through one package-private module, `SupersedingRun.ts`" ; BEH-QD-523's "Pinned by ... (R3 a close mid-run never calls `onFailure` even when the release dies ...)" | pin lists re-pointed to the `StatedRun` rows (audit table) |
| BEH-QD-461 (`spec/behaviors/29-devtools-simulator.md:994-1046`) | "`test/model/SimulationSession.runs.test.ts` (SR1 to SR5: a resolver that interrupts itself reads `Broke` ..." | restated: `Broke.message` is `causeMessage`'s text, rendered as a preformatted block; SR1 now an instance of the one stop rule |
| BEH-QD-742, 744, 745 | the throw-surfacing and publish-then-fork requirements | pin lists name the module; text unchanged |
| `spec/overview.md:930` (`TimelineStatus` row) and `:929` (`DiagnosticsStatus`) | "`Stopped` states a read that ended on a defect, and an interruption or a source that ends by itself stays `Reading`" | the row is the **public** statement of the rule: amend it (overview Rev 1.146); gate 13 checks names only, so nothing else forces this edit |
| `packages/devtools/src/model/DiagnosticsFeed.ts:10-13` (module doc) | "**An interruption is not a stop.** A restart, `configure(undefined)`, a replaced field and the scope closing all interrupt the run; only a run that ended on a defect is `Stopped`." | the sentence moves into `StatedRun.ts`'s doc, with "from outside" |
| `packages/devtools/src/model/SupersedingRun.ts:49-52` (`ForkHooks` doc) | "Called for the current run's failure that is not an interruption; never for a run that was replaced, stopped or closed." | deleted with the hook |
| `spec/README.md` CCR rows, `spec/traceability.md:656` | row for `SupersedingRun.test.ts` ("`onFailure` hears only the current run's defect (R9)") | edited |

Next free revisions [VERIFIED: Document Control tables read this session]: `spec/README.md` 1.412 -> 1.413; `invariants.md` 1.231 -> 1.232; `traceability.md` 1.331 -> 1.332; `overview.md` 1.145 -> 1.146; `behaviors/28-devtools-screens.md` 1.81 -> 1.82; `behaviors/29-devtools-simulator.md` 1.31 -> 1.32; `decisions/047` 1.23 -> 1.24; `decisions/150` 1.0 -> 1.1; `decisions/182` 1.1 -> 1.2; `decisions/192` 1.6 -> 1.7; `decisions/194` 1.3 -> 1.4; ADR-QD-200 is new (add to `spec/decisions/index.yaml`; `verify-traceability.sh` check 1 fails on an undeclared file). The reserved ids are free: highest existing are BEH-QD-767, INV-QD-418, CCR-QD-478, ADR-QD-199, and `grep` finds no use of ADR-QD-200, CCR-QD-479, BEH-QD-771..775, INV-QD-419..420 outside `.planning` [VERIFIED: grep]. `scripts/spec-revise.mjs <doc> "<what changed>" --date YYYY-MM-DD` bumps the minor in both the Revision row and the newest Change History entry; `--check` (run by `pnpm spec:verify`) fails when they differ. Check 6 of `spec/scripts/verify-traceability.sh` requires every test file cited in traceability section 4 to exist: the edited `SupersedingRun.test.ts` stays on disk and every new test file needs a row.

## Held tests and pinned check (item 10)

`git ls-files packages/devtools/test` lists **123** files at HEAD (11 top-level, 45 under `react/`, 67 under `model/`) [VERIFIED: `git ls-files | wc`]. The pinned check holds **122** byte for byte (all but `test/builtFeeds.ts`), or **121** with `test/model/SupersedingRun.test.ts` also declared edited (D-09, recommended). Compute the set from `git ls-tree -r --name-only <phase_base> -- packages/devtools/test` as `86-pinned-check.mjs` does (never list it by hand), plus `packages/devtools/src/react/useConfigured.ts` (D-18 "unchanged"). Declared edits: `builtFeeds.ts` wholesale (a region-free helper swap; check its exports `timelineFeedOf`, `diagnosticsFeedOf`, `gatesFeedOf`, `dockModelOf` keep their signatures) and `SupersedingRun.test.ts` rows named in the audit table only (use `85-pinned-check.mjs`'s declared-region approach: the text outside the edited rows is held). Phase 85's own pinned check holds 18 of these files against *its* base and still passes (none is edited here); `87-earlier-checks.mjs` should measure its ledger on the 87 base, as `86-earlier-checks.mjs` does.

The ids to hold [VERIFIED: grep -n]: TF21 `TimelineFeed.test.ts:464`, TF22 `:484`, TF23 `:501`, TF28 `:597` (TF29 is `:621`); F28 `DiagnosticsFeed.test.ts:579`, F29 `:600`, F30 `:618`, F31 `:640`, F33 `:688`; SR1 `SimulationSession.runs.test.ts:55` (**id collision:** `DiagnosticsFeed.superseded.test.ts:24` and `SimulationSession.test.ts:1423` also start "SR1"; name file and line, never the bare id), SR5 `:130`, SR6 `:165`. New test ids must not reuse these prefixes.

## Mutation (item 9)

`stryker.devtools.mjs` mutates `packages/devtools/src/model/**/*.ts` (`thresholds.break` 80, `ignoreStatic: true`, `coverageAnalysis: "perTest"`), so the two new modules are measured with no config change. Base, run this session on HEAD for the five files [VERIFIED: `pnpm exec stryker run stryker.devtools.mjs --mutate <5 files>` in the repo root, 215 s wall, 11 workers, 19.37 tests per mutant]:

| File | killed (+timeout) | survived | no cov | ignored | score |
|---|---|---|---|---|---|
| `SupersedingRun.ts` | 49 + 1 | 3 | 0 | 0 | 94.34 |
| `TimelineFeed.ts` | 37 | 0 | 0 | 11 | 100 |
| `DiagnosticsFeed.ts` | 59 | 0 | 0 | 14 | 100 |
| `SimulationSession.ts` | 244 | 6 | 0 | 4 | 97.60 |
| `GatesFeed.ts` | 119 | 0 | 0 | 4 | 100 |
| all | 509 | 9 | 0 | 33 | 98.26 |

Open at the base (these must be recorded in `87-mutation-base.json`, not fixed there): `SupersedingRun.ts` L121 `hooks.onFailure?.(exit.cause)` OptionalChaining, L94:29 `{}` ObjectLiteral and L94:45 `false` BooleanLiteral (the token brand); `SimulationSession.ts` L310, L313:22, L313:35, L317, L319 (the `stale` computation inside `build`) and **L402** (`if (!runs.isCurrent(mine)) return;` -> `false`). L121 disappears with `onFailure`. L402 moves to `land`'s `live.current()` and, with the `StatedRun` gate, is the mutant the begin-window rows must kill. The only earlier records of these files are Phase 37's (`SupersedingRun` 0.943, `TimelineFeed` 1.0, `DiagnosticsFeed` 0.947, `SimulationSession` 0.982) and are stale; no record exists for `GatesFeed.ts`, so the base is taken fresh.

Mechanics. (1) Stryker must run in the real repo tree: a scratch copy with symlinked `node_modules` fails the initial run (`Failed to resolve import "@testing-library/..."` in the sandbox); `reports/` and `.stryker-tmp/` are git-ignored (`.gitignore:19,21`), and the run overwrites `reports/mutation-devtools/mutation.json` (Phase 85's report; its records are the `85-mutation-*.json` files, not this report). (2) The scripts to port are `85-mutation.mjs` / `86-mutation.mjs` (base / close / `compare` / `--self-test`, a clean-tree rule, a `git diff -U0` line carry, an absolute rule for born files) and `83-mutation.mjs` (the only one with `RENAMED`, `[`${MODEL_DIR}Diagnostics.ts`]: `${MODEL_DIR}DiagnosticsStore.ts``, used with `git diff -M`). (3) **No file is renamed in this phase**, so `RENAMED` is empty; D-19's "moved code" needs a different device: two groups. `touched` (the five files, base + close, removed-mutant rule) and `stated` (`StatedRun.ts` and `ConfigurePrologue.ts`, born, `closeOnly`, absolute rule: no Survived / NoCoverage / Ignored / Timeout mutant, every kill by a test of the new files), plus a sum check: killed / total over the five base files must not exceed the close sum over all seven (a code move cannot lower the aggregate). Expect **zero Ignored** in both new files: `SupersedingRun.ts`, the same factory shape, has none, and neither new file has a module-scope constant (the feeds' Ignored mutants are their `IDLE_*` / `READING` constants). (4) `ConfigurePrologue.ts` is a curried arrow with an early return per rule: its mutants (`closed`, `same`, `hold`, the return order) need a row each; the three feeds' `ConfigureRule.test.ts` rows (CR1, CR2, CR4, CR9, CR14, CR20) already kill most of them; the closed-before-complete order (BEH-QD-636, "even for input the normaliser would refuse") needs a direct row if no existing one pins it. (5) One full close is two runs (`touched`, `stated`), each recorded right after its run on one clean head; budget about 4 minutes each.

## Don't Hand-Roll

| Problem | Don't build | Use instead | Why |
|---|---|---|---|
| a run that a newer run supersedes | a second token / closed flag / handle | `makeSupersedingRun` (unchanged) | ADR-QD-150 |
| listener throws on a multi-call command | a `try`/`catch` per step | `callAll` (`ExternalStore.ts:82`) | ADR-QD-177/194 |
| "did an input move" | a fresh comparison | `sameFields`, `sameFieldsOrAbsent` (`ExternalStore.ts:153,169`) | INV-QD-403/404 |
| the text of a cause | `String(cause)` or an inline `Cause.pretty` | `causeMessage` from `@qadi/core` | total, ADR-QD-182 |
| the reason `<pre>` | a second style object | `reasonStyle` in `theme.ts` | byte-identical `StoppedBox` render |
| a failing port in a test | a hand-written failing layer | `scriptedPort` (AGENTS.md section 6) | `PORT_DOUBLE_BUDGET` |

## Common Pitfalls

### Pitfall 87-A: calling the session change a defect fix
`String(cause)` never throws (Q3). The RED title says "uniform with the feeds"; the patch changeset says so too. Existing pins hold under the new text: `SimulationSession.test.ts:1358` and `Simulator.test.tsx:583` assert `"the layer exploded"`; SR1 asserts `message.includes("Interrupt")` and `Cause.pretty` of an interrupt contains `InterruptError` (the old text `Cause([Interrupt(40)])` embeds a fiber id, so no new test may pin an id).

### Pitfall 87-B: the `isCurrent` gate is untested because nothing reaches it
Outside interruptions never resume the body, so the gate only matters for a run that ends naturally while superseded (R15's window). Without a row for that, Stryker's `if (false)` mutant survives (it does at `SimulationSession.ts:402` today). Write the begin-window row for both a defect and a self-interrupt.

### Pitfall 87-C: R3, R5, R6, R7 pass vacuously after `onFailure` is removed
Their `heard` array can only stay `[]`. A grep for failing tests finds R9 and law 5 only; `tsc -p tsconfig.test.json` finds all of them. Edit every row in the audit table and give each re-homed row a positive control (a current die states once) so it can fail.

### Pitfall 87-D: an unguarded session `stopped`
A listener that throws on the `Ran` publish makes `land` die after `run = Ran`; an unguarded hook would turn the landed result into `Broke`. Guard on `run._tag === "Running"`. Characterise today's `Ran` stays (green on base) and add a row for the new gap it closes only if a test can reach it (a throw in `readOutcome` is not reachable from the public interface; cover it in `StatedRun.test.ts` with a plan whose engine dies after its own write).

### Pitfall 87-E: reordering `begin`, publish and engine construction
`begin` precedes `starting` (the session sets `run = Running` after `begin`); `engine(live)` is evaluated after `starting` (the session reads `pairs` after the commit and `runClock` before it). Moving either changes what a listener that calls `setPairs` / `setClock` from inside the `Running` commit sees.

### Pitfall 87-F: `Broke` is two things
`packages/devtools/src/model/Capture.ts:46,143` has its own `{ _tag: "Broke"; message }` (BEH-QD-685, `renderError`). `grep Broke` hits both; the session's is `SimulationSession.ts:108`. Do not route the capture through the new rule.

### Pitfall 87-G: spec links that name INV-QD-313's old title
Changing the title changes the anchor. BEH-QD-507 and BEH-QD-519 and `traceability.md:204` link `#inv-qd-313-a-poll-defect-is-stated-an-interruption-never-is-and-a-replaced-run-never-writes`; `pnpm spec:verify:strict` fails on a dead link. Move them in the same commit.

### Pitfall 87-H: the Simulator `<pre>` and nested whitespace
JSX puts the message on its own indented line inside `<pre>`; React keeps that indentation as text. Render `{broke.message}` on the line with the tag, or assert `textContent` equals the message exactly (a pinned test should), because `whiteSpace: "pre-wrap"` shows leading blanks. `StoppedBox.tsx:154-156` has the same shape; keep the Simulator's identical so the two stay comparable.

### Pitfall 87-I: Stryker in a scratch tree
See Mutation (1). Run it in the repo root, stdin closed, nothing else running, and remove `.stryker-tmp/` if it is left behind.

### Pitfall 87-J: the spike must not run under `.vitest`
A prior run left no `.vitest/` directory; if one appears, remove it. `git status --short -- packages` was clean at the end of this research.

## Architecture Patterns

### System Architecture Diagram

```
host command (configure / restart / run / stop / scope close)
        |
        v
store (TimelineFeed | DiagnosticsFeed | SimulationSession)         GatesFeed (no status, own cadence)
  prologue? makeConfigure(rule) --- closed? -> return                   |  makeConfigure(rule, steps)
        |  complete -> same? -> return -> hold -> steps                 |  steps: watch, readAsked, cadence()
        v                                                               |        cadence = runs.fork(runs.begin(), ...)  [fork BEFORE publish]
  StatedRun.start(plan)  --> closed? return                             v
        |                    begin()  -> token                    SupersedingRun (token, closed, handle)
        |                    try { plan.starting() }  <- publishes Reading | Starting | Running (a throw is held)
        |                    finally { fork(token, Effect.exit(plan.engine(live)) >>= stateStop) }
        v
  SupersedingRun.fork: re-checks token, installs the fiber (interrupts the older one)
        |
        v   engine runs: runSource | runDiagnostics | land(program)
  live.guard(write): drops a write from a non-current run
        |
  exit read (only a run that ENDS resumes the body; an outside interruption never does)
        |-- current && Failure (die, typed failure, release died, SELF-interrupt) -> stopped(causeMessage(cause)) -> Stopped | Broke
        '-- not current, or success                                              -> nothing
```

### Recommended structure
```
packages/devtools/src/model/
  SupersedingRun.ts      # protocol, minus ForkHooks
  StatedRun.ts           # NEW: start(plan), stop, closed; the stop rule
  ConfigurePrologue.ts   # NEW: makeConfigure(rule, steps)
  TimelineFeed.ts DiagnosticsFeed.ts SimulationSession.ts GatesFeed.ts   # states + engine only
packages/devtools/src/react/theme.ts        # + reasonStyle
packages/devtools/test/model/StatedRun.test.ts                  # NEW (plus the audit rows)
packages/devtools/test/model/StatedRun.characterisation.test.ts # NEW, green on base through the stores
packages/devtools/test/model/SimulationSession.stop.test.ts     # NEW, RED on base
packages/devtools/test/model/{Timeline,Diagnostics}Feed.stop.test.ts   # NEW, RED on base (self-interrupt)
packages/devtools/test/react/Simulator.broke.test.tsx           # NEW, RED on base (<pre>, role group, tabIndex)
```
Names are the planner's discretion (D-06); `ConfigurePrologue.ts` avoids colliding with `test/model/ConfigureRule.test.ts` (which pins the rule through the stores, not the module).

### Anti-patterns
- A one-call `run(effect)` that publishes inside the module (ADR-QD-150 point 2 rejected it).
- A merged `TimelineStatus | DiagnosticsStatus` (public types; `sampled` differs).
- `Effect.fnUntraced` on the factory (`UNTRACED_BUDGET`), a named factory (child span on every store build), a module-scope `let` (`MODULE_STATE_BUDGET`), `switch`, `as`, `!`, `any`.
- Routing `GatesFeed`'s cadence through `start` (INV-QD-408).
- Reading `Cause.hasInterruptsOnly` anywhere: the rule is "non-success and current".

## State of the Art

| Old | Current | Impact |
|---|---|---|
| `onFailure` + `Cause.hasInterruptsOnly` decides what is a stop | exit read inside the body, gated by `isCurrent` | a self-interrupt is stated; an outside interruption cannot be (never resumes) |
| three copies of publish-then-fork and the prologue | `StatedRun.start`, `makeConfigure` | one place for ADR-QD-194's ordering |
| session `String(exit.cause)` | `causeMessage` | uniform with the feeds |

## Runtime State Inventory

Not a rename or migration phase: skipped. (A moved `reasonStyle` and a removed hook leave no stored, registered or built state; there is no persisted `Broke.message`.)

## Environment Availability

| Dependency | Required by | Available | Version | Fallback |
|---|---|---|---|---|
| node | everything | yes | v26.13.0 | none |
| pnpm | gates | yes | 10.17.1 | none |
| vitest | tests | yes | 5.1.0 | none |
| Stryker | mutation | yes (runs in the repo root, not a symlinked copy) | 10.1.1 | none |
| tstyche | `pnpm test:tstyche` | yes (repo gate) | per lockfile | none |

Missing dependencies: none.

## Project Constraints (from CLAUDE.md / AGENTS.md)

- Effect namespace imports only (`import * as Effect from "effect/Effect"`); relative imports carry `.ts`; `import type` for types (`verbatimModuleSyntax`). Cross-package: a named import from the root (`import { causeMessage } from "@qadi/core"`).
- No `as`, `!`, `any`, `switch` (`SWITCH_BUDGET` is exact), `async`, `Date.now`, `console.*`; effectful functions are `Effect.fn`; `Effect.fnUntraced` only at the three budgeted sites (`UNTRACED_BUDGET`); no module-scope `let` (`MODULE_STATE_BUDGET`, one row in `react/DeveloperSignals.ts`).
- Errors default `Data.TaggedError`; this phase adds none.
- Doc-comment shape: one-line summary first; rationale (ADR citations) in the paragraph after. The two new modules and the amended docs follow it.
- Barrels: the new modules are package-private; `@qadi/devtools`'s barrels name exports per module, and `devtools-named-barrel` refuses `export *`. `spec/overview.md` must name every public export; `TimelineStatus`/`DiagnosticsStatus` rows are amended for their prose only.
- The spec is normative: behaviour doc, invariant and traceability change in the same commit; spec TypeScript fences compile (`pnpm spec:examples`); `spec:claims` registers every "absent" statement in `spec/devtools-spec` (no devtools-spec file mentions the amended sentences [VERIFIED: grep]).
- Tests: `@effect/vitest`; coverage 95% core, 90% elsewhere; every `.feature` tagged `@REQ-QD-NNN` (none touched; `features/` contains no `Stopped` / interrupt scenario for devtools [VERIFIED: grep]).
- Memory rules: never `Record<string, unknown>` as a widened implementation type; closed unions over widening; prefer complete over simple (breaking changes allowed, compat never the tiebreaker); no release without an explicit request; autonomous mode decides rather than asks.

## Validation Architecture

### Test Framework
| Property | Value |
|---|---|
| Framework | vitest 5.1.0 (project `devtools`, happy-dom, `@effect/vitest`), fast-check for the property, tstyche for type pins, Stryker 10.1.1 for `src/model/**` |
| Config file | root `vitest.config.ts`, `packages/devtools/vitest.config.ts`, `stryker.devtools.mjs` |
| Quick run command | `bash -c 'pnpm exec vitest run --project devtools <file> < /dev/null'` |
| Full devtools suite | `bash -c 'pnpm exec vitest run --project devtools < /dev/null'` (97 files, 2002 tests, about 17 s on the base) |
| Phase gate | `pnpm check:pr < /dev/null`, `pnpm spec:package < /dev/null`, `pnpm spec:verify:strict`, `pnpm spec:claims`, `pnpm spec:api`, `node scripts/spec-revise.mjs --check`, the mutation `compare` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|---|---|---|---|---|
| STOP-01 | module owns publish-then-fork: a start-up publish's throw is rethrown once, by identity, after the fork; a repeat publish of the same status identity notifies nothing; `stop` with no run opens no span (positive control); closed `start` publishes and forks nothing; builds under `Effect.runSync` | unit | `... StatedRun.test.ts` | Wave 0 (new) |
| STOP-01 | D-17: throw plus a superseding command from the same listener (timeline, diagnostics, session) | characterisation (green on base) | `... StatedRun.characterisation.test.ts` | Wave 0 (new) |
| STOP-01 | the audit rows: a close with a dying release states nothing (control: a current die states once); `stop` in flight states nothing; a stale run (begin window) ending by defect or by self-interrupt states nothing; model property: stated stops equal the model's current runs that die or self-interrupt | unit + property | `... StatedRun.test.ts` | Wave 0 |
| STOP-02 | each feed's full status tape: natural end stays `Reading`; a defect states `Stopped`; restart replays the same timeline; bare timeline restart is an empty read (D-14, with a `runSource` span count); diagnostics `Off`/`Starting`/`Live`/`Stopped{sampled}` transitions | characterisation (green on base, and after) | `... StatedRun.characterisation.test.ts` | Wave 0 |
| STOP-02 | session: `Ran` stays when a listener throws on the `Ran` publish (green on base); SR1, SR5, SR6 held | held + new | `... SimulationSession.runs.test.ts` (held) | exists |
| STOP-03 | the prologue: closed first even for refused input; refused capacity throws before anything moves; same-fields moves nothing; `held` assigned before steps; nested configure decides; gates' failed-watch exception | unit (new) + held `ConfigureRule.test.ts`, `GatesFeed.test.ts` (G43, G44, G49) | `... ConfigurePrologue.test.ts` | Wave 0 |
| STOP-04 | a timeline source whose read or live stream interrupts itself reads `Stopped(InterruptError ...)` (RED on base: tape `[]`); a collector whose `snapshot` interrupts itself reads `Stopped{sampled:false}` (RED on base: stays `Starting`); an outside interruption of every kind never does (green on base; with a dying release) | unit | `... TimelineFeed.stop.test.ts`, `DiagnosticsFeed.stop.test.ts` | Wave 0 |
| STOP-05 | a session run whose ports layer dies: `message` does not start with `Cause(`, first line `Error: the layer exploded` (RED on base: `Cause([Die(Error: the layer exploded)])`); hostile die: `message === "a value that could not be described"` (RED on base: `Cause([Die([toString threw])])`); SR1 self-interrupt message contains `InterruptError` | unit | `... SimulationSession.stop.test.ts` | Wave 0 |
| STOP-05 | the Simulator's `qadi-simulator-broke` holds a `<pre role="group" aria-label tabIndex=0>` whose text equals the message exactly and whose `style` equals `StoppedBox`'s reason `<pre>` (RED on base: a `<span>`) | component | `... Simulator.broke.test.tsx` | Wave 0 |
| STOP-05 | `StoppedBox`'s render is byte-identical after `reasonStyle` moves (capture its `style` attribute on the base) | component characterisation | with the Simulator file | Wave 0 |
| WX-01 | `check:pr` green | gate | `pnpm check:pr < /dev/null` | exists |
| WX-02 | only reserved ids; `next-id.mjs` never run | script | `87-check.mjs scan-ids`, `records` | Wave 0 |
| WX-03 | two patch changesets, "No export changes."; gate 13 and 14 unmoved | gate | `pnpm spec:api`, `pnpm spec:package` | exists |
| WX-04 | no `as`/`!`/`any`/`switch`/`Effect.fnUntraced`/`async`/ambient clock/`Record<string, unknown>`/module-scope `let`/`// Stryker disable` added | script + lint | `87-check.mjs scan-forbidden`; `pnpm lint` | Wave 0 |
| WX-05 | coverage holds; mutation `compare` green (no touched file falls; new modules have no open or Ignored mutant) | mutation + coverage | `pnpm coverage < /dev/null`; `87-mutation.mjs compare` | Wave 0 |
| WX-06 | every new test and check seen failing once, in `87-RED-EVIDENCE.md` | script | `87-check.mjs seen-failing <file> <title>...` | Wave 0 |
| WX-07 | no D-number, plan id or phase number in shipped source or tests; nothing released | script | `87-check.mjs scan-ids`, `trailers`; `git tag --contains <base>` | Wave 0 |

### Sampling Rate
- **Per task commit:** the one to three vitest files the task touches plus the matching `87-check.mjs` mode.
- **Per wave merge:** the full devtools suite, `pnpm test:tstyche`, `node .../87-pinned-check.mjs`, `pnpm circular`, `node scripts/check-house-style.mjs`.
- **Phase gate:** as in the table above, all green before `/gsd-verify-work`.

### Wave 0 Gaps
- [ ] `87-check.mjs` (modes after `86-check.mjs`: `base`, `commit`, `unchanged`, `seen-failing`, `scan-ids`, `scan-forbidden`, `trailers`, `module-shape` for `StatedRun.ts` / `ConfigurePrologue.ts` (imports no React; unnamed `Effect.fn`; no `Effect.fnUntraced`; no module-scope `let`; no `hasInterruptsOnly`; the feeds import neither `makeSupersedingRun` (except gates) nor `causeMessage`), `records [--close]`, `--self-test`), `87-pinned-check.mjs`, `87-mutation.mjs`, `87-earlier-checks.mjs` (re-runs 85 and 86 from scratch copies; ledger measured on the 87 base).
- [ ] `87-mutation-base.json` taken on a clean tree **before any edit**: `pnpm exec stryker run stryker.devtools.mjs --mutate packages/devtools/src/model/SupersedingRun.ts,packages/devtools/src/model/TimelineFeed.ts,packages/devtools/src/model/DiagnosticsFeed.ts,packages/devtools/src/model/SimulationSession.ts,packages/devtools/src/model/GatesFeed.ts` (3 m 33 s), then `87-mutation.mjs record base touched`. The nine open mutants listed under Mutation are the expected base.
- [ ] `87-RED-EVIDENCE.md`: the base failing text of each RED row (the spike lines above are the evidence for the three RED families: `Cause([Die(Error: the layer exploded)])`; timeline `tape=[]`; diagnostics stays `Starting`) and one scratch variant per new check.
- [ ] The five new test files, written on the base before any `src` edit; the characterisation file green on the base with one recorded scratch failure each (WX-06).
- Framework install: none.

### Scratch variants (WX-06), one per new check
`StatedRun.test.ts`: drop the `isCurrent` gate; state interrupt-only causes only; drop the closed guard; fork before publish; swallow the publish's throw; drop `guard`. `Simulator.broke`: render a `<span>`; drop `tabIndex`; drop `role`. `87-check` modes: add a `switch`, a module-scope `let`, `Effect.fnUntraced`, `hasInterruptsOnly`, a React import in the module; a `String(` of a cause in `SimulationSession.ts`.

## Security Domain

`security_enforcement` is on (ASVS level 1, block on high). No new boundary; one display change.

### Applicable ASVS Categories
| ASVS Category | Applies | Standard Control |
|---|---|---|
| V2 Authentication / V3 Session / V4 Access Control | no | not touched |
| V5 Input Validation / output encoding | yes (display) | the reason is rendered as React text inside a `<pre>` (no `dangerouslySetInnerHTML`); a test asserts `textContent` equals the message |
| V6 Cryptography | no | none |
| V7 Error handling and logging | yes | the reason stays in the in-memory snapshot; never a sink record, response, log or metric (BEH-QD-519, ADR-QD-182 d4); a grep-based `87-check` mode can assert `causeMessage` results are not passed to `Effect.log*`, `annotateLogs` or a metric in the touched files |

### Known threat patterns
| Pattern | STRIDE | Mitigation |
|---|---|---|
| stack frames and checkout paths now shown in the Simulator (`Cause.pretty` instead of `Cause([Die(message)])`) | Information disclosure | same rule as the feeds' reason: for the host's own process, must not cross a trust boundary (documented in the `Broke` doc, BEH-QD-461 restated, the changeset); the dock is a developer tool mounted by the host, and `@qadi/react` already warns on production instrumentation |
| an unbounded reason | DoS (display) | `reasonStyle` caps height (`maxHeight: 96`, scroll); the text is kept verbatim and uncapped in memory, as the feeds' is |
| a throwing release or listener turning an authorization decision into a defect | Tampering / DoS | untouched: the session's run never feeds an enforcement path; the stop rule runs in the devtools fiber, never in `evaluate` |
| the release machinery (scope close ordering) | Repudiation (a late write after close) | unchanged: the finalizer registered after the handle runs first (ADR-QD-150 point 4); the new rows prove nothing is stated after close, with a dying release |

## Assumptions Log

| # | Claim | Section | Risk if wrong |
|---|-------|---------|---------------|
| A1 | No host in the wild relies on a self-interrupting source or collector staying `Reading` / `Starting` (only shipped code and the held tests were checked: no shipped `Source`, `TimelineStore`, `Diagnostics`, `Wiring`, `Hydration` or `PortCalls` code interrupts itself, [VERIFIED: grep]; no held test asserts it, [VERIFIED: full suite on the prototype]) | Summary, D-08 | a host's source that ends via interrupt now shows `Stopped`: the changeset says so (D-04 already accepts it) |
| A2 | The session's `stopped` hook should be `Running`-guarded (my refinement of D-11, not in CONTEXT) | What each store becomes | if the owner prefers an unguarded hook, a listener throw on `Ran` becomes `Broke`; recorded as the one behaviour D-11 does not literally state |
| A3 | Prefer `start(plan)` without module-held "last engine" (refines D-07's wording "restart re-runs the last engine") | Module API | a planner who keeps a held engine must still preserve D-14 (bare timeline restart forks an empty read) |
| A4 | The Simulator label text "Why the simulation failed" | Simulator | none beyond discretion (D-13) |
| A5 | `87-mutation.mjs`'s "sum" check and no `RENAMED` entries (no file is renamed) | Mutation | D-19 names a `RENAMED` map; the planner may add an empty one for script symmetry |

## Open Questions

1. **Does the owner want the session's exit read folded into the module as well?** (Option B: `land` stops catching and the module states `Broke` for every non-success, one writer.) D-11 locks the session's own exit read, and the run span `qadi.devtools.simulationSession.run` would then end with the failure's status; nothing in the held tests reads that status. Recommendation: keep D-11 as locked; revisit in a later phase.
2. **Should a test reach the "throw between the exit read and `Ran`" gap?** Not reachable from the public interface; cover it in the module's own tests with a plan whose engine dies after its own write.

## Sources

### Primary (HIGH confidence)
- Source files read this session at HEAD `4ee0f408` (docs-only above `cbe375bf`; `git diff --stat cbe375bf HEAD -- packages spec scripts` is empty): `packages/devtools/src/model/{SupersedingRun,TimelineFeed,DiagnosticsFeed,GatesFeed,SimulationSession,ExternalStore,TimelineStore,Diagnostics}.ts`, `src/react/{StoppedBox,Simulator,theme,useConfigured}.ts*`, `test/builtFeeds.ts`, `test/model/SupersedingRun.test.ts`, `packages/core/src/ThrownMessage.ts`.
- Spec read at the cited lines: ADR-QD-150, 182, 192, 194, 047; BEH-QD-461, 507, 519, 521-525, 636, 637, 685; INV-QD-313, 403, 404, 408; `spec/overview.md:929-930`.
- The spike and the prototype (scratch copy, `git archive HEAD`), `tsc -b`, `tsc -p tsconfig.test.json`, oxlint, madge, `check-house-style.mjs`, and the Stryker base run, all this session.
- Phase 83, 85 and 86 scripts and records as patterns.

### Secondary / Tertiary
- none (no web source was needed; effect behaviour was observed, not read).

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH, nothing new.
- Architecture: HIGH, a working prototype passes the full devtools suite and the static gates.
- Pitfalls: HIGH for 87-B and 87-C (observed), MEDIUM for 87-H (rendering whitespace not yet exercised in a test).

**Research date:** 2026-11-25
**Valid until:** until `packages/devtools/src/model` or the cited spec documents change (they are stable between waves).
