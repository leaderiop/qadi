# Phase 56: The gate-registry watch becomes the dock model's third feed - Research

**Researched:** 2026-11-18
**Domain:** `@qadi/devtools` headless dock model (a scoped feed module), plus `@qadi/react`'s `useDevtoolsFeed` under GFED-05 = Yes
**Confidence:** HIGH. Every in-repo fact below was read at HEAD `427a2065` this session (the source files are untouched since Phase 55's `314082ea`; `DockModel.ts` is 326 lines). No new package is installed. The devtools model suite (`DockModel.test.ts`, `QuestionsPanel.characterisation.test.tsx`, `QuestionsPanel.gates.test.tsx`) ran green on the base: 3 files, 101 tests.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**GFED-05: the feed owns the `questions` thunk (owner, 2026-11-18)**
- **D-01:** Yes. The feed owns both host inputs of the questions panel.
  - **Why:** on the base, a throwing `questions` thunk is a defect in the diagnostics sample. It ends the whole poll, so wiring, activity and calls freeze on every tab. A throwing registry, by contrast, becomes only `GatesView.Failed`. One feed gives both inputs one failure policy, and the poll survives a throwing thunk.
  - **Precedent:** the owner's standing preference is complete over simple. Breaking is acceptable, and compatibility never breaks a tie.
- **D-02:** `questions` leaves `DiagnosticsDockOptions` and becomes a dock input beside `gates`: `DockModelInputs.questions` and `DevtoolsDockProps.questions`.
  - `@qadi/react`'s `useDevtoolsFeed` returns `questions` at the top level, beside `gates` and `onInvalidate`, so `DevtoolsDiagnosticsFeed` loses it.
  - `<DevtoolsDock {...feed} />` keeps compiling for a host that spreads the feed.
  - A host that wrote `diagnostics={{ …, questions }}` by hand gets a compile error. Both packages carry this as **Breaking**.
  - Research must list every public surface that names the thunk and settle each one so no orphan path is left. Candidates: `DiagnosticsOptions.questions` and `runDiagnostics`' sampling of it, `useDiagnostics`, the `nextjs-newsroom` example, and website docs.
  - The reading's own `questions` field (`Diagnostics`/`DiagnosticsReading`, a reading supplied from elsewhere) stays. Its precedence over what this process reads is unchanged.
- **D-03:** A throwing thunk is stated in the questions panel, the way a throwing registry is. The poll keeps running.
  - This is the one deliberate behaviour change. A test written first pins it RED on the base, where the poll is `Stopped`, and it goes green after.
  - Its copy is one neutral sentence in the same register as decision 5 of ADR-QD-162.
  - The exact view tag is at Claude's discretion: a `QuestionsView.Failed{reason}` or a shared failure. It must keep the views closed unions and never claim rows it could not read.
- **D-04:** `asked()` cannot be observed; it has no change signal. The feed therefore reads it on its own cadence and compares by reference, so a quiet tick publishes nothing.
  - Default cadence: `DEFAULT_DIAGNOSTICS_INTERVAL_MILLIS`.
  - Whether it also re-reads on each registry change, and how "unsampled" is decided now that the poll no longer carries the questions, are at Claude's discretion. The bar is that `QuestionsView.Unsampled` vs `Absent` reads the same to a user as on the base.

**Feed shape and home**
- **D-05:** New `packages/devtools/src/model/GatesFeed.ts`, with `makeGatesFeed` as `Effect.fn("qadi.devtools.makeGatesFeed")` built in the caller's scope. It is package-private (ADR-QD-099) and out of both barrels.
- **D-06:** The snapshot is a closed tagged enum, `Unwatched | Read{instances} | Failed{reason}` for the registry, plus the questions read per D-03 and D-04. Names are at Claude's discretion.
  - The failure key (name and message; ADR-QD-162 Rev 1.3) stays private to the feed.
  - One failure arriving by two paths is published once.
- **D-07:** The interface mirrors `DiagnosticsFeed`: `getSnapshot`, `subscribe` and `configure(…)`.
  - It re-subscribes when the registry's identity changes or after a failed watch (Rev 1.4).
  - It releases in a finalizer. A release that throws is not stated and is not called again (Rev 1.2/1.5).
  - A closed feed runs no host code.
  - Stating a throw stays total (Rev 1.5).
- **D-08:** `reasonOf` and `keyOf` move into the feed. `DockModel` keeps `rejoin` only as a pure combine of the feeds' snapshots and the diagnostics status, and `configure` still swaps the registry before `remerge` (Rev 1.5).

**Tests and mutation**
- **D-09 (GFED-04, WX-06):** A new characterisation is written on the phase base, through the public dock. It covers every `GatesView` and `QuestionsView` state the panel reaches: a throwing `instances`; a throwing `subscribe`; a swapped registry; mends, both announced and silent; unsampled vs absent. It is green before and after, and never edited. The existing `QuestionsPanel.characterisation.test.tsx` stays unedited. The throwing-thunk case is the D-03 RED test, kept out of the characterisation.
- **D-10 (GFED-03):** M31..M47 and P2 each gain a twin in `packages/devtools/test/model/GatesFeed.test.ts`, which runs against the feed alone with `packages/devtools/test/gateRegistryDouble.ts`. A `DockModel.test.ts` case is deleted only once its twin is green (Phase 26 precedent). `DockModel.test.ts` keeps one test showing that the join moves first, plus the cases that are about the join and not the watch (M32, M34, or what research identifies).
- **D-11 (WX-05):** This follows Phase 55's D-15: Phase 53's D-14 rule, with the static-ignored credit accepted in Phase 54 (ADR-QD-167 Rev 1.1). `56-mutation-base.json` is recorded on the phase base for every touched model file: `DockModel.ts`, `DiagnosticsFeed.ts`/`DiagnosticsStore.ts` (touched under D-02), and `Gates.ts` if touched. A fall passes only as killed mutants that moved into `GatesFeed.ts`, where they are still killed. `GatesFeed.ts` has no survivor that a test could kill.
- **D-12:** RED first: the feed's unit test fails by import before the module exists. Then the feed. Then the watch moves out of the model. Then the tests move. Then the records.

**Records**
- **D-13 (GFED-05, WX-02):** ADR-QD-169 applies ADR-QD-137 and records D-01 with its reason. It leaves ADR-QD-162 intact, keeps ADR-QD-150, and amends ADR-QD-047's 2026-11-12 amendment, since `questions` is no longer a diagnostics option. INV-QD-357: one feed owns the gate watch, and `DockModel` holds no mutable gate-watch state. INV-QD-358: the questions panel's two host inputs fail the same way, and neither stops the diagnostics poll. Also CCR-QD-447 and BEH-QD-616..620. Any unused reservation is named "Unused: …" in the CCR row.
- **D-14 (WX-07):** Two **minor** changesets, each with one **Breaking** entry: `@qadi/devtools` (`questions` moves from `DiagnosticsDockOptions` to the dock, plus anything research adds under D-02) and `@qadi/react` (`useDevtoolsFeed` returns `questions` at the top level). `apps/website/src/content/docs/docs/reference/upgrading.md` gains the note in its unreleased 0.13 section. Nothing is released.
- **D-15 (WX-03):** `spec/overview.md` follows gate 13 (`check-api-surface.mjs`) for every changed export.

### Claude's Discretion
- Exact names of the snapshot tags, the questions failure tag and the feed's options.
- The cadence detail and the "unsampled" rule under D-04, within the stated bar.
- BEH placement across the devtools behaviour docs.

### Deferred Ideas (OUT OF SCOPE)
- Phase 55's review Info items IN-01..03 (ServicesPanel.reading header, M54 title and BEH-QD-615 "notifies twice", the unguarded `reservice`) belong to the next change that touches those files. They are not this phase's scope unless `DockModel.ts` edits make IN-03 free to fix.
- The "never called" wording on the four non-port service cards (Phase 55 D-09).
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| GFED-01 | One package-private scoped feed owns the watch (subscription, guarded reads, failure keying, finalizer) | §Feed interface, §Base code map (Q2) |
| GFED-02 | `DockModel` composes three feeds and calls `joinQuestions`; no mutable gate-watch state | §DockModel after, §Base code map |
| GFED-03 | M31..M47 and P2 run against the feed alone with `gateRegistryDouble.ts`; `DockModel` keeps one "join moves first" test | §Tests (Q5), twin map |
| GFED-04 | Panel behaviour unchanged, pinned by a characterisation written on the base | §Tests: the new characterisation and its input seam |
| GFED-05 | `questions` thunk owned by the feed; leaves `DiagnosticsDockOptions` (Breaking) | §Public surfaces (Q1), §Cadence (Q3), §New failure (Q4) |
| WX-01 | Evidence on the base before any source edit | §Mutation, §Plan shape |
| WX-02 | Records: ADR-QD-169, BEH-QD-616..620, INV-QD-357..358, CCR-QD-447 | §Records (Q7) |
| WX-03 | `spec/overview.md` follows gate 13 | §Public surfaces, §Records |
| WX-04 | House style: no `as`, `!`, `any`, new `switch`, `async`, `Record<string, unknown>` | §Pitfalls |
| WX-05 | Mutation not lower (D-11 rule) | §Mutation (Q6) |
| WX-06 | Characterise first, never edit the characterisation | §Tests, §Plan shape |
| WX-07 | Two minor changesets each with one Breaking entry; 0.13 upgrade note; nothing released | §Records |
</phase_requirements>

## Summary

The gate-registry watch is 8 mutable `let`s and about 150 lines inline in `DockModel.ts` (lines 175-286 plus the `configure` branch at 315-322). The two other host inputs already live in scoped feeds (`TimelineFeed.ts`, `DiagnosticsFeed.ts`). The recommended design is one new `GatesFeed.ts` that owns the registry watch **and** the `questions` thunk, publishes one structurally-shared snapshot (`{ registry, asked }`, each half a closed `Data.TaggedEnum`) and exposes `getSnapshot` / `subscribe` / `configure`. `DockModel` keeps only `rejoin` (a pure combine of the feed snapshot, the supplied reading's questions and the diagnostics status) plus a `closed` flag and one `lastJoin` comparison.

GFED-05 = Yes ripples further than the CONTEXT candidate list suggests. The thunk is read by `runDiagnostics` (public export), restarts the diagnostics poll (`DiagnosticsFeed.ts:230`), and **eleven existing tests use it as the way to make the poll die** (F4..F7, F16, F28, F29, M18, D4..D8, D11, `useDiagnostics`' "sampler that died"). Those tests keep their meaning (a poll defect is still `Stopped`); they change only the injection mechanism, to a dying `collector.snapshot`. That rewrite is the largest mechanical item in the phase.

**Primary recommendation:** build `GatesFeed.ts` with both halves and unit-test it alone first (RED by import), stage the DockModel move in two commits (4a: the registry watch moves, thunk still read from the poll, characterisation green and unedited; 4b: the thunk moves and the one deliberate behaviour change lands), and give the new characterisation a one-file input seam (`questionsProp.ts`, the `gatesProp.ts` precedent) so the characterisation file is never edited when `questions` leaves `diagnostics`.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Subscribe to the host registry, read it guarded, state a throw | Headless model (`GatesFeed.ts`) | none | Host code is read only inside a scoped feed (ADR-QD-137, ADR-QD-162 decision 5) |
| Read the `questions` thunk on a cadence, state a throw | Headless model (`GatesFeed.ts`) | none | Moves the thunk out of the poll so one failure policy covers both inputs (D-01) |
| Join questions to guards, decide the views | Headless model (`Gates.ts` `joinQuestions`, called by `DockModel`) | none | The panel computes nothing (ADR-QD-047) |
| Unsampled vs absent decision | Headless model (`DockModel.rejoin`) | `DiagnosticsFeed` (`isUnsampled`) | Needs the poll's status; the feed does not know it |
| Render the new failure paragraph | React dock (`QuestionsPanel.tsx`) | none | One more arm of the hoisted `Match.type<QuestionsView>()` |
| Hand the thunk to the dock | `@qadi/react` (`useDevtoolsFeed`) | host | Top-level `questions`, beside `gates` |
| Lifetime | Scope (`useScoped` / `makeDockModel` scope) | none | ADR-QD-137; closing the scope ends the cadence and releases the subscription |

## Standard Stack

No new package. Everything is the existing house stack: `effect@4.1.2` [VERIFIED: `node_modules/effect/package.json` "version": "4.1.2"], `@effect/vitest`, `vitest` 5.1.0 (the run above), `tstyche`, Stryker `10.1.1` [VERIFIED: `package.json:60`], `fast-check` (already in `DockModel.test.ts`).

### Core (all in-repo, reuse as is)
| Module | Role in this phase |
|--------|--------------------|
| `model/ExternalStore.ts` `makeExternalStore` | the feed's snapshot store; `set` notifies only on a new reference |
| `model/SupersedingRun.ts` `makeSupersedingRun` | the cadence run (begin / fork / closed); `closed()` replaces a hand-kept `closed` flag |
| `model/DiagnosticsStore.ts` `DEFAULT_DIAGNOSTICS_INTERVAL_MILLIS` | default cadence, `= 2_000` (`DiagnosticsStore.ts:183`) |
| `Equal.equals` (`effect/Equal`) | quiet-tick comparison of a fresh `asked()` array |
| `Schedule.spaced`, `Effect.repeat`, `Effect.sync` | the cadence loop, exactly as `runDiagnostics` uses them (`DiagnosticsStore.ts:235-238`) |
| `Match.type<…>().pipe(Match.tagsExhaustive(…))` | hoisted conversions of the feed's enums |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Feed reads `asked()` on its own `Schedule` | Keep the thunk in the poll and only move the registry | Rejected by D-01: the throw stays a poll defect |
| `Equal.equals` of the thunk's array | Reference compare (CONTEXT D-04 wording) | **`asked()` returns a fresh array every call** (`QuestionBook.ts:184`: `asked: () => order.map((entry) => entry.question)`), so a reference compare publishes every tick. The repo test says so too (`DiagnosticsStore.test.ts:277-279`: "A fresh array of fresh, structurally built policies on every read, the way `atoms.asked()` answers"). Use `Equal.equals`, as `DiagnosticsStore.keep` does (`DiagnosticsStore.ts:152`) |

**Installation:** none. **Package Legitimacy Audit:** not applicable, no external package is installed or recommended.

## Architecture Patterns

### System Architecture Diagram

```
host registry (react GateRegistry)        host thunk  () => atoms.asked()
   │ instances()  │ subscribe(listener)         │
   │              │ (announces a change)        │ (no change signal)
   ▼              ▼                             ▼
┌──────────────────────────── GatesFeed (scoped, package-private) ────────────────────────────┐
│ watch: subscribe/release (guarded, release throw not stated, retry after failed watch)       │
│ read:  registry ──► RegistryRead  Unwatched | Read{instances} | Failed{reason}               │
│ tick:  thunk on Schedule.spaced(intervalMillis) ──► AskedRead Unhanded | Read{questions} | Failed{reason}
│        quiet tick (Equal.equals) publishes nothing; a changed answer ALSO re-reads registry  │
│ failures keyed by name+message (private); same failure by two paths published once           │
└───────────────────────────────┬──────────────────────────────────────────────────────────────┘
                                │ getSnapshot(): GatesSnapshot { registry, asked } (shared refs)
timeline feed ─► timeline store │ subscribe(rejoin)
diagnostics feed ─► merged reading + status ─┐
supplied reading (inputs.reading?.questions) ─┤
                                              ▼
                       DockModel.rejoin  (pure combine, no host code, `closed` guard)
                              joinInputOf(feed, supplied, unsampled)
                                              ▼
                              joinQuestions(JoinInput) ─► QuestionsSnapshot store
                                              ▼
                         QuestionsPanel (renders; new Failed arm; computes nothing)
```

### Recommended Project Structure
```
packages/devtools/src/model/
├── GatesFeed.ts          # NEW. makeGatesFeed, GatesSnapshot, RegistryRead, AskedRead. Out of both barrels.
├── Gates.ts              # + QuestionsView.Failed{reason}, + JoinInput.questionsFailed
├── DockModel.ts          # composes three feeds; no reasonOf/keyOf/readGates/watchGates
├── DiagnosticsFeed.ts    # questions leaves DiagnosticsDockOptions; restart list shrinks to three fields
└── DiagnosticsStore.ts   # questions leaves DiagnosticsOptions and runDiagnostics' sample
packages/devtools/test/
├── model/GatesFeed.test.ts                         # NEW, RED by import first
├── react/QuestionsPanel.characterisation2 …        # see "the new characterisation" (name is the planner's)
└── react/questionsProp.ts                          # NEW, the one-file input seam
```

### Pattern 1: Feed interface (mirrors `DiagnosticsFeed.ts`)

Names are the researcher's recommendation under D-06's discretion. Types are closed `Data.TaggedEnum`s, exactly the style of `DiagnosticsStatus` (`DiagnosticsFeed.ts:48-62`).

```typescript
// Source: modelled on packages/devtools/src/model/DiagnosticsFeed.ts:48-62, 135-141, 161-163
export type RegistryRead = Data.TaggedEnum<{
  /** No registry was handed over. */
  Unwatched: {};
  /** The registry's own array, never a copy (INV-QD-343). */
  Read: { readonly instances: ReadonlyArray<GateInstanceLike> };
  /** `instances()` or `subscribe` threw; `reason` is `Cause.pretty`, key private. */
  Failed: { readonly reason: string };
}>;
export const RegistryRead = Data.taggedEnum<RegistryRead>();

export type AskedRead = Data.TaggedEnum<{
  Unhanded: {};
  Read: { readonly questions: ReadonlyArray<AskedQuestionLike> };
  Failed: { readonly reason: string };
}>;
export const AskedRead = Data.taggedEnum<AskedRead>();

export interface GatesSnapshot {
  readonly registry: RegistryRead;
  readonly asked: AskedRead;
}

export interface GatesFeedInputs {
  readonly gates?: GateRegistryLike | undefined;
  readonly questions?: (() => ReadonlyArray<AskedQuestionLike>) | undefined;
  /** The cadence; the model forwards `diagnostics?.intervalMillis`. Default `DEFAULT_DIAGNOSTICS_INTERVAL_MILLIS`. */
  readonly intervalMillis?: number | undefined;
}

export interface GatesFeed {
  readonly subscribe: (listener: () => void) => () => void;
  readonly getSnapshot: () => GatesSnapshot;
  /** Per field by identity. Always re-reads the registry (ADR-QD-162 Rev 1.4); restarts the cadence only when the thunk or the interval moved. */
  readonly configure: (inputs: GatesFeedInputs) => void;
}

export const makeGatesFeed = Effect.fn("qadi.devtools.makeGatesFeed")(function* (
  init?: GatesFeedInputs,
): Effect.fn.Return<GatesFeed, never, Scope.Scope> { /* … */ });
```

Rules the implementation must carry (each is an existing, tested behaviour, see the revision map below):

1. **Private state, in the feed:** the registry, the thunk, the held release, the watch failure, the last published failure key of each half, the last snapshot. These are the base's `gatesNow`, `offGates`, `watchFailure`, `watchKey`, `failureKey`; `closed` is `runs.closed()` and `lastKey`/`lastFailureKey` are the published snapshot itself.
2. **Structural sharing:** keep each half's reference when it did not change, so the outer `GatesSnapshot` changes only when a half did, and `DockModel`'s `rejoin` can compare one reference. `RegistryRead.Read` keeps `instances` by reference (`!==` compare, as base `key.gates === lastKey.gates`). `AskedRead.Read` keeps the previous value when `Equal.equals(previous, next)`.
3. **One `stated(thrown, fallback)` function** returning `{ reason, key }`, total (a `catch` around `Cause.pretty(Cause.die(thrown))` returns the fallback; the key is `${name}: ${message}` for an `Error`, else the reason). Two hoisted fallbacks: `"The registry threw a value that could not be described."` (unchanged, pinned by M46 at `DockModel.test.ts:1507`) and `"The questions threw a value that could not be described."` (new, UI-SPEC "Planner note"). This settles UI-SPEC's flag that `reasonOf` hardcodes "The registry" (`DockModel.ts:108`).
4. **Guard the thunk's answer too.** The thunk's return value is host data: `Equal.equals(previous, next)` can call host `[Equal.symbol]`/getters. Put the compare inside the same `try` as the call, so a hostile array is `Failed`, not a defect in the cadence fiber. (On the base such a throw inside `DiagnosticsStore.accept`'s `keep` ended the poll.)
5. **Finalizer order.** Register the feed's own release finalizer **before** `makeSupersedingRun()`. Finalizers are LIFO, so `runs`' finalizer (which marks `closed()`) runs first and any re-entrancy from a release sees a closed feed. The listener the feed hands the registry must check `runs.closed()` and must read the registry the feed holds now, not the one it subscribed to (an old registry whose release threw may keep a live listener: ADR-QD-162 decision 5, "It only calls `rejoin`, which reads the registry the model holds now").
6. **Cadence:** `runs.begin()` then `runs.fork(token, Effect.repeat(Effect.sync(tick), Schedule.spaced(interval)))`. `tick` is total (every host call guarded), so the fiber never dies and no `onFailure` is needed. The fork's synchronous prefix reads the thunk once at build/restart (this is what makes the first read synchronous, as F2/F4 show for the poll: "Live once built", "Stopped … at once"). With no thunk, no cadence runs.
7. **What a read does** (preserves ADR-QD-162 decision 5's "a quiet poll tick reads nothing"):
   - registry notification: read the registry only (the questions are the last read, as on the base where they were the last polled);
   - cadence tick: read the thunk; if `Equal.equals` to the last answer (or the same failure key) return, **no registry read**; otherwise also read the registry in the same step and publish one snapshot (this is the "one moment" pairing, and the documented recovery "a poll that changed the questions");
   - `configure`: swap registry and thunk, re-subscribe if the registry's identity moved **or** the last watch failed, restart the cadence if the thunk or interval moved (its first prefix read is immediate), then always re-read the registry; publish once if anything changed.

### Pattern 2: `DockModel` composes three feeds (no mutable gate-watch `let`)

```typescript
// Source: replaces packages/devtools/src/model/DockModel.ts:175-286 (the 8 `let`s) — sketch, not final code
// Built where `watchGates(gatesNow)` was (after `shownReading` and `questions`/`services` exist), so
// BEH-QD-584's "subscribe … after the reading it joins exists" and the LIFO close order are unchanged.
const gatesFeed = yield* makeGatesFeed({
  gates: inputs.gates, questions: inputs.questions, intervalMillis: inputs.diagnostics?.intervalMillis,
});
let closed = false;                 // lifetime, not watch state; a closed model publishes nothing
let lastJoin = joinKeyNow();        // { feed, questions, unsampled } references/flag
const joinKeyNow = () => {
  const { status } = shownReading.getSnapshot();
  const supplied = inputs.reading?.questions;          // the model's OWN input: already new inside `configure`
  return { feed: gatesFeed.getSnapshot(), supplied, unsampled: supplied === undefined && isUnsampled(status) };
};
const rejoin = () => {
  if (closed) return;
  const key = joinKeyNow();
  if (key.feed === lastJoin.feed && key.supplied === lastJoin.supplied && key.unsampled === lastJoin.unsampled) return;
  lastJoin = key;
  questions.set(joinQuestions(joinInputOf(key)));      // joinInputOf: hoisted Match over the two enums
};
gatesFeed.subscribe(rejoin);
shownReading.subscribe(rejoin);
```

Why `inputs.reading?.questions` and not the merged `shownReading` reading: inside `configure`, `gatesFeed.configure` publishes while `shownReading` still holds the old merged reading; pairing a new feed snapshot with an old supplied list would publish twice and break M47 ("one configure publishes one snapshot", `DockModel.test.ts:1521-1536`). The model's own `inputs` is already `next` there. Under option A below the merged `questions` equals the supplied one anyway.

**`configure`'s ordering (D-08, Rev 1.5).** Call `gatesFeed.configure(...)` **before** `diagnosticsFeed.configure` and `remerge()`. The base order was swap-then-remerge because `remerge`'s publish joined through the registry; now `rejoin` reads no registry, so the same intent (one `configure` publishes one questions snapshot and no host registry is read after it was handed away) is met by configuring the feed first, so every later `rejoin` in that `configure` already sees the new feed snapshot. Document it in the `configure` comment where the Rev 1.5 sentence lives (`DockModel.ts:315-317`).

**Remaining `let`s.** `closed` and `lastJoin` stay in `DockModel` (the `services` store already has `lastServices`, `DockModel.ts:255`). INV-QD-357 must therefore be worded precisely: *"`DockModel` holds no registry, no subscription, no failure state and no thunk; the feed does"*, not "no `let`" (see Open Question 4).

### Anti-Patterns to Avoid
- **Re-reading the registry on every diagnostics publish.** The base did (every `shownReading` change reaches `rejoin`, which reads). A pure `rejoin` must not. It only changes behaviour for a registry that mends silently, and the ADR already promises recovery only "when it announces a change, when a poll that changed the questions joins them, or when a `configure` does" (ADR-QD-162 line 133-136). The characterisation's silent-mend cell must use one of those three triggers.
- **A `configuring` flag in `DockModel` to batch publishes.** Order the calls instead (feed first, `rejoin` reads the model's own `inputs`).
- **Reference-compare of `asked()`** (see Alternatives).
- **Catching in the cadence fiber with `Effect.orDie`/`catchAll`.** Guard at the host-call sites with `try/catch`, as the base does; AGENTS §4 forbids `Effect.orDie` in enforcement paths.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| One run superseded by a newer one, closed with the scope | a counter, a `closed` flag, a `FiberHandle` | `makeSupersedingRun` (ADR-QD-150) | three stores already drifted on this |
| Store with identity contract | a listener set | `makeExternalStore` | `set` notifies only on a new reference |
| Per-element equality of fresh arrays | a deep-compare helper | `Equal.equals` | structural in Effect v4; `keep` in `DiagnosticsStore.ts:152` is the precedent |
| Failure text | a stack parser | `Cause.pretty(Cause.die(thrown))` inside a `try` | the exact text `Stopped` carries (`DockModel.ts:100-110`) |
| A broken registry in a test | a hand-written failing port | `makeGateRegistryDouble` (`failReads`, `mendReads`, `mendReadsQuietly`, `failSubscribe`, `mendSubscribe`, `failRelease`, `swallowListenerErrors`) | already counts listeners, subscriptions, releases and reads |
| A dying poll in a test | a throwing question source | a `PortCallCollector` whose `snapshot` is `Effect.die(...)` (`PortCalls.ts:167-179`: `readonly snapshot: Effect.Effect<PortCallLog>`) | the thunk can no longer reach the poll |

**Key insight:** the watch's difficulty is its five guarded host-code paths, not its size. Moving it as one unit with its tests (revisions 1.1-1.5) is the only safe shape; do not redesign the guards.

## Q1. Every public surface that names the `questions` thunk (D-02 = Yes)

Rule: **the thunk has exactly one consumer, the feed.** Every other path to it goes, or becomes the supplied-reading list, which is a different thing (data from elsewhere, not host code).

| # | Surface | Where (HEAD) | Proposal | Public? |
|---|---------|--------------|----------|---------|
| 1 | `DiagnosticsDockOptions.questions` | `DiagnosticsFeed.ts:94-95` `readonly questions?: () => ReadonlyArray<AskedQuestionLike>;` | **Remove.** Also drop `...(next.questions === undefined …)` (`:183`), the `next.questions !== before.questions` restart test (`:230`); the restart list becomes `layer`, `collector`, `intervalMillis`. Reword the header (`:3-8`, "a throwing `questions`") to "a throwing read"; `AskedQuestionLike` import (`:37`) goes | yes (type, both barrels) |
| 2 | `DiagnosticsOptions.questions` | `DiagnosticsStore.ts:200` | **Remove**, with `runDiagnostics`' sampling (`:223-225`, the `questionsThunk` / `Effect.sync(questionsThunk)`) and the `questions` key of `Effect.all` (`:232`). Reword the doc `:209-212` ("A defect in a sample, such as a throwing `questions`") to name a defect in a read generally. Public export `DiagnosticsOptions` and `runDiagnostics` stay; only the field goes. `surface.tst.ts:33` / `DiagnosticsStore.tst.ts` keep compiling | yes (`runDiagnostics`, `DiagnosticsOptions` in `src/index.ts:30,34`) |
| 3 | `Diagnostics.questions` / `DiagnosticsReading.questions` | `DiagnosticsStore.ts:78`, `:107`; `mergeReading` `:134`; `accept` `:166,173` | **Keep** (D-02). `DiagnosticsReading.questions` is the supplied list. `Diagnostics.questions` is then never filled by the poll; see Open Question 1 for the dead-slot wording and the owner-confirmable alternative | yes |
| 4 | `useDiagnostics(options)` | `useDiagnostics.ts:39` | **No code change.** Its option type loses `questions` by following (1). Doc comment `:28` "four fields" becomes three; `useDiagnostics.test.tsx:144-150` and the website's `HydrationLine` need no change (they use `intervalMillis`) | yes |
| 5 | `DevtoolsDockProps` | `DevtoolsDock.tsx:92-104` (the `diagnostics` doc names "a question source"), `:164` `useDockModel({ source, capacity, catalogue, ports, diagnostics, reading, gates })` | **Add** `readonly questions?: () => ReadonlyArray<AskedQuestionLike>` beside `gates`; destructure it and pass it on; drop "and a question source" from the `diagnostics` doc (`:93`); the `reading` doc's "`questions` are usually `atoms.asked()`" (`:115`) means the *list* and stays | yes (`DevtoolsDockProps`) |
| 6 | `useDockModel` / `UseDockModelInput` | `useDockModel.ts:28-36, 49-55` | **Add** `questions` to the input, to the `makeDockModel` call and to the `configure` effect's dependency list | no (package-private) |
| 7 | `DockModelInputs` | `DockModel.ts:65-77` | **Add** `readonly questions?: (() => ReadonlyArray<AskedQuestionLike>) | undefined` with a doc line ("held by identity; read by the gates feed on the diagnostics cadence") | no |
| 8 | `@qadi/react` `DevtoolsDiagnosticsFeed` | `DevtoolsFeed.ts:71-77` | **Drop** `questions`; the interface is `{ layer }`, doc "The diagnostics field this feed owns" | yes |
| 9 | `@qadi/react` `DevtoolsFeed<Extra>` | `DevtoolsFeed.ts:88-92` | **Add** `readonly questions: () => ReadonlyArray<AskedQuestion>` at the top level beside `gates`, `onInvalidate` | yes |
| 10 | `@qadi/react` `FeedOwnedKey` | `DevtoolsFeed.ts:95` `type FeedOwnedKey = keyof DevtoolsDiagnosticsFeed;` | **Set to `"layer" | "questions"`.** If left as `keyof DevtoolsDiagnosticsFeed`, `useDevtoolsFeed({ questions })` would compile and the host's `extra.questions` would land in `diagnostics`, where devtools silently ignores it. Keeping it a compile error also keeps `DevtoolsFeed.tst.ts:23-24` (`not.toBeCallableWith({ questions })`) valid unchanged and BEH-QD-327's requirement ("The fields the feed owns (`layer`, `questions`) MUST NOT be overridable by `extra`", `09-react.md:683`) true as written | internal type, behaviour public |
| 11 | `useDevtoolsFeed` body | `DevtoolsFeed.ts:122-127` | `diagnostics = useMemo(() => ({ ...extra, layer }), [extra, layer])`; return `{ gates, questions: atoms.asked, onInvalidate, diagnostics }`; reword the module header `:5-8` and the doc `:98-103` | yes |
| 12 | `examples/nextjs-newsroom` | `src/client/Dock.tsx:98-111` (comment names the feed's `questions`); `<DevtoolsDock {...feed} …/>` at `:158-163` | **Code compiles unchanged** (spread). Reword the comment. `Counters.tsx:13,22` uses `DiagnosticsDockOptions` with only `intervalMillis`: unchanged. `test/dock-wiring.test.tsx:42` spreads `feed.diagnostics` into `useDiagnostics`: unchanged | no |
| 13 | Website docs | `packages/devtools.md:153-161` ("`diagnostics` carries … a `layer` … and `questions`"; "Setting `layer` or `questions` in your extras is a compile error"), `:174`, `:225`; `packages/react/hooks.md:112-120`; `reference/upgrading.md` (new 0.13 section after `:899`) | reword prose; **no code fence names `questions`**, so `spec:website-examples` is unaffected | yes |
| 14 | READMEs | `packages/devtools/README.md:132` (`diagnostics={{ layer: appLayer, collector, questions: () => atoms.asked() }}`), `:143-146`; `packages/react/README.md:82-86` | rewrite `:132` as `<DevtoolsDock questions={() => atoms.asked()} diagnostics={{ layer: appLayer, collector }} />`; both feed sentences | yes |
| 15 | `spec/overview.md` rows | `:584` (`useDevtoolsFeed`: "`diagnostics` (the caller's `extra` plus `layer` and `questions`)"), `:909` (`DiagnosticsOptions`: "(`layer`, `collector`, `questions`, `schedule`)"), `:920` (`DiagnosticsDockOptions`), `:923` (`DevtoolsDockProps`: "nine optional props") | edit all four; `DevtoolsDockProps` becomes ten props. Header change-history row 1.123 | yes |
| 16 | Behaviour docs | `spec/behaviors/28-devtools-screens.md:643-661` (listing with `questions` in `diagnostics=`), `:929` (`DockModelInputs`), `:1278-1279` (restart REQUIREMENT "`layer`, `collector`, `questions` or `intervalMillis`"), `:1308` (BEH-QD-507 "a throwing `questions`, for one"); `spec/behaviors/09-react.md:635-645` (`DevtoolsDiagnosticsFeed` / `DevtoolsFeed` listing) | amend in dated notes; see Q7 | n/a |
| 17 | ADR text | `spec/decisions/047-…md:179-186, 401, 407` (2026-11-12 amendment), `053-…md:221-232`, `162-…md:56-63, 111` | history is not rewritten; ADR-QD-169 amends 047 in a new dated section; 053 and 162 quote history and stay | n/a |

**Gate 13 (`check-api-surface.mjs`)** checks only that every exported name appears between `## Public API surface` and `## Worked example` and that every backticked Export-column name is a real export [VERIFIED: `scripts/check-api-surface.mjs:1-30` header]. **No export is added or removed in this phase** (the feed is package-private; `DiagnosticsDockOptions`, `DiagnosticsOptions`, `DevtoolsDockProps`, `DevtoolsDiagnosticsFeed`, `DevtoolsFeed` all stay), so gate 13 cannot fail on this change; the four overview rows above are still **required edits** for truth (the gate has a documented "no signature check" limit, so it will not catch a stale field list). **Gate 14 (`check-package-install.mjs`)** installs the packed packages and asserts `typeof DevtoolsDock === "function"` (`:426,501`); it names no `questions` field, so it is unaffected. `test/surface.test.ts` lists runtime exports (`runDiagnostics` at `:57`, `useDiagnostics` at `:73`): unchanged. **Add** `export { makeGatesFeed } from "../src/index.ts";` under `// @ts-expect-error no exported member` in `test/surface.tst.ts` next to the existing `makeDiagnosticsFeed` (`:199`) and `makeTimelineFeed` (`:202`) pins, so ADR-QD-099's "out of the barrel means not importable" is checked for the new module.

**What `Diagnostics`/`DiagnosticsReading.questions` keeps:** the supplied list (BEH-QD-323's "a reading taken elsewhere wins"). Its precedence is unchanged: `supplied.questions ?? sampled.questions` (`DiagnosticsStore.ts:134`).

## Q2. The base's gate-watch code, exactly

`DockModel.ts` at HEAD (read in full this session). The eight `let`s [VERIFIED: `DockModel.ts:179-186, 205-206`]: `gatesNow` (`:179`), `closed` (`:180`), `offGates` (`:181`), `watchFailure` (`:183`), `watchKey` (`:184`), `failureKey` (`:186`), `lastKey` (`:205`), `lastFailureKey` (`:206`).

| Piece | Lines | What it does | Moves to |
|-------|-------|--------------|----------|
| `reasonOf` | 104-110 | `Cause.pretty(Cause.die(thrown))`, `catch` returns `"The registry threw a value that could not be described."` | feed `stated` (two fallbacks) |
| `keyOf` | 113-119 | `Error` → `` `${thrown.name}: ${thrown.message}` ``, else `reasonOf`; `catch` → `reasonOf` | feed `stated` |
| `readGates` | 187-196 | `failureKey = watchKey`; a held `watchFailure` wins and **`instances()` is not called**; else `try { gatesNow?.instances() }`, `catch` sets `failureKey = keyOf(thrown)` and returns `{ gates: undefined, failed: reasonOf(thrown) }` | feed registry read |
| `joinKeyNow` | 197-204 | builds `JoinInput`: `questions: reading.questions`, `…readGates()`, `unsampled: reading.questions === undefined && isUnsampled(status)` | `DockModel.joinKeyNow` (pure) |
| `rejoin` | 208-223 | `if (closed) return;` recompute; skip when `questions`, `gates`, `failureKey`, `unsampled` all equal the last; else `questions.set(joinQuestions(key))` | `DockModel.rejoin` (pure combine) |
| `watchGates` | 228-244 | takes `offGates` into a local and replaces it with a no-op **before** calling it; clears `watchFailure`/`watchKey`; `try { release() } catch {}` (not stated); `try { offGates = closed \|\| registry === undefined ? noop : registry.subscribe(rejoin) } catch → watchFailure = reasonOf, watchKey = keyOf` | feed watch |
| ordering at build | 270-274 | `shownReading.subscribe(rejoin)`, `shownReading.subscribe(reservice)`, `watchGates(gatesNow)`, `rejoin()` | `gatesFeed` built here; `gatesFeed.subscribe(rejoin)` |
| finalizer | 275-286 | `closed = true`; take and clear `offGates`; `try { release() } catch {}` | feed finalizer (before `makeSupersedingRun`) + model sets its own `closed` |
| `configure` gate branch | 315-322 | `if (next.gates !== gatesNow \|\| watchFailure !== undefined) { gatesNow = next.gates; watchGates(gatesNow); } remerge(); rejoin();` | `gatesFeed.configure`, called first |

### ADR-QD-162 decision 5 revisions, line and test

| Rev | What it requires | Implemented at (base) | Pinned by |
|-----|------------------|-----------------------|-----------|
| 1.1 (WR-01) | a throw from `instances()` or `subscribe` is `GatesView.Failed`; rows make no claim | `DockModel.ts:187-196, 238-243`; `Gates.ts:321-328` (`gatesViewOf`), `:340-346` (`asking: undefined`) | M37 (build, `DockModel.test.ts:1207`), M38 (a notification the registry swallows, `:1225`), M39 (a poll tick, `:1267`), M40 (`subscribe`, `:1295`), M41 (`configure`, `:1313`) |
| 1.2 | the old subscription's release is guarded, handle leaves state before the call, never repeated | `DockModel.ts:229-237`, finalizer `:275-286` | M41 (`releases()` 1 then 2), M42 (`:1343`), M42 b (`:1373`) |
| 1.3 | same failure compared by name and message, not stack | `DockModel.ts:113-119, 193, 212-219` | M38 (afresh same error keeps the snapshot, `:1245-1248`; a different message publishes, `:1250-1254`), M43 (`:1388`), M45 (`:1453`) |
| 1.4 | a `configure` after a failed watch subscribes again; a silent mend is read at the next announcement, changed poll or `configure` | `DockModel.ts:318` (`\|\| watchFailure !== undefined`), `:323` (`rejoin()` always) | M43, M44 (`:1422`) |
| 1.5 | a release that throws is not stated; a failed `subscribe` is keyed like a failed read; stating is total; `configure` swaps before re-merge; a closed model reads no registry | `DockModel.ts:228-237` (comment `:224-227`), `:240-243`, `:104-119`, `:315-322`, `:210, 239, 278-285` | M42, M43, M46 (`:1482`), M47 (`:1521`), M35 (`:1163`), M36 (`:1178`) |

## Q3. The `asked()` cadence (D-04)

**Facts.** `asked()` has no change signal and returns a fresh array each call [VERIFIED: `QuestionBook.ts:184`]. The base samples it inside the poll: `runDiagnostics` reads once at start and once per `Schedule.spaced` step (`DiagnosticsStore.ts:235-238`), default `DEFAULT_DIAGNOSTICS_INTERVAL_MILLIS = 2_000` (`:183`); `DiagnosticsDockOptions.intervalMillis` doc: "How often to sample, in milliseconds" (`DiagnosticsFeed.ts:96`). `SupersedingRun.fork`'s "synchronous prefix runs inside `fork`" (`SupersedingRun.ts` header) is why a built poll is already `Live` (F2, F14: first sample at 0 ms, second at 2000 ms, `DiagnosticsFeed.test.ts:328-340`).

**Recommendation.**
1. **Own cadence, same mechanism as the poll:** `Effect.repeat(Effect.sync(tick), Schedule.spaced(intervalMillis ?? DEFAULT_DIAGNOSTICS_INTERVAL_MILLIS))` forked through `makeSupersedingRun`. `DockModel` forwards `inputs.diagnostics?.intervalMillis` to the feed so the one documented "how often to sample" dial still covers the questions (and the many `intervalMillis: 10` dock tests keep working). The feed's `configure` restarts the cadence when the thunk **or** the interval changes identity, mirroring the base's restart-on-any-of-four (`DiagnosticsFeed.ts:226-232`).
2. **No re-read of the thunk on a registry change.** On the base a registry change joined the *last polled* questions with a fresh registry read (that is what M31 asserts). Keeping it keeps M31/P2's oracle simple. (A newly mounted guard's new question therefore still appears on the next tick, as on the base.)
3. **A changed answer re-reads the registry in the same step** (one-moment pairing, and the ADR's documented recovery path). A quiet tick (`Equal.equals` true, or the same failure key) reads nothing and publishes nothing, so M44's "stays `Failed` after a quiet tick" and M31's "a quiet tick keeps the snapshot" carry over.
4. **Unsampled vs absent reads the same as the base.** The base rule is `reading.questions === undefined && isUnsampled(status)` (`DockModel.ts:202`); the questions only ever arrived with the first accepted sample. The UI-SPEC requires the panel to withhold thunk output until the status leaves unsampled (UI-SPEC "Unsampled vs Absent" row). Implement in `DockModel.joinInputOf` (`unsampled` = `supplied === undefined && isUnsampled(status)`):
   - `questions` = `supplied ?? (unsampled ? undefined : feed.asked is Read ? its questions : undefined)`;
   - `questionsFailed` = `supplied === undefined && feed.asked is Failed ? reason : undefined`;
   - `unsampled` flag as above, and `joinQuestions` precedence: rows/empty, then `questionsFailed`, then `Unsampled`, then `Absent` (UI-SPEC "Precedence inside the questions block"; a failure is stated before "unsampled" because it is a claim about a read that happened).
   - `isUnsampled` values [VERIFIED: `DiagnosticsFeed.ts:118-125`]: `Off: () => false`, `Starting: () => true`, `Live: () => false`, `Stopped: (stopped) => !stopped.sampled`. So a dock with `questions` but no `diagnostics` (`Off`, newly possible) shows the thunk's rows at once; a `Starting` poll (slow layer) or an unsampled stop shows `Unsampled` exactly as on the base.
5. **One behavioural nuance to state, not hide:** the base first read the thunk in the poll's first sample, after the layer built; the feed reads at build. On a slow layer the rows shown at the `Starting`→`Live` flip are the feed's (up to one interval old). Invisible unless `asked()` changed inside that window; record it in BEH-QD-618 and as assumption A3.

**`TestClock` determinism.** `it.effect` provides `TestClock`; the cadence is a forked fiber like the poll's. Use the existing `tick` helper (`settleTurns`, `TestClock.adjust("2 seconds")`, `settleTurns`; `DockModel.test.ts:1024-1028`; `settleTurns` is 20 `Effect.yieldNow`s, `test/helpers.ts:175-177`). A test that needs real elapsed time must not exist for the feed (the React `DiagnosticsScreens` cases use real timers with `intervalMillis: 10` and `vi.waitFor`; leave those).

## Q4. The new failure (D-03 / UI-SPEC)

**Where the views live.** `QuestionsView` is in `Gates.ts:285-292`:
```ts
export type QuestionsView = Data.TaggedEnum<{
  Unsampled: {};
  Absent: {};
  Empty: {};
  Rows: { readonly rows: ReadonlyArray<QuestionRow> };
}>;
```
`GatesView` (`Gates.ts:269-274`) is `Absent | Empty | Listed | Failed{reason}` and stays unchanged. `QuestionsView` is package-private (not in either barrel; verified by the barrels read).

**Recommendation: add `Failed: { readonly reason: string }` to `QuestionsView`** (UI-SPEC's recommended name). A shared failure type would couple two independent failures that the UI-SPEC says must stay independent (both paragraphs render when both fail).

**What adding the tag touches (exhaustive search this session):**
- `QuestionsPanel.tsx:165-185`, the one `Match.tagsExhaustive` over `QuestionsView`: add `Failed: ({ reason }) => () => (<p style={{ ...muted, color: colors.error }} data-testid="qadi-questions-failed">The questions handed to the dock threw, so what has been asked cannot be shown: {reason}</p>)`. Copy and attributes are locked by UI-SPEC (no `role`, no `aria-*`, no `fontSize`).
- `Gates.ts:339-359` `joinQuestions`: the `questions` expression becomes rows → empty → failed → unsampled → absent.
- Tests that construct a `QuestionsView`: `test/react/questionsPanelInput.ts:20-41` (does not need the new tag), `QuestionsPanel.gates.test.tsx:17,126-128` (no change), `Gates.test.ts` (7 `JoinInput` literals at `:262, 296-297, 320, 332, 339, 348-349`; add `questionsFailed: undefined` to `noQuestions` and the three full literals).
- **No BDD step or tstyche file matches `QuestionsView`/`QuestionsSnapshot`** (grep across `features/`, `packages/*/test/*.tst.ts`, `spec/`): none to update. The spec listing at `spec/behaviors/28-devtools-screens.md:1912-1917` (a ` ```ts ` fence, not compiled) gains the arm.

**`JoinInput` carries the failure** (`Gates.ts:303-310`): add `readonly questionsFailed: string | undefined` ("why the questions could not be read; wins over `unsampled`, loses to a list"). Keep the existing `failed` (the registry's). Required, not optional (house style; `exactOptionalPropertyTypes`).

**`reasonOf` stays total with a second fallback sentence:** a single `stated(thrown, fallback)` (Pattern 1, rule 3). The registry call site passes `"The registry threw a value that could not be described."`, the thunk call site `"The questions threw a value that could not be described."`.

**Exact base behaviour of a throwing thunk (for the RED test).** `runDiagnostics` evaluates `Effect.sync(questionsThunk)` inside `Effect.all` (`DiagnosticsStore.ts:224-233`); the throw is a defect, `Effect.repeat` ends, `runs.fork`'s `onFailure` runs `show(DiagnosticsStatus.Stopped({ reason: Cause.pretty(cause), sampled }))` (`DiagnosticsFeed.ts:204-206`). The `DiagnosticsNotice` then shows `Diagnostics stopped.` with `Restart diagnostics`, wiring/activity/calls freeze, and `isUnsampled(Stopped{sampled:false})` is true so the questions block is `Unsampled` (nothing rendered).

**Existing tests that pin it, and what must change.** The rule: a poll defect is still `Stopped` after this phase, so these tests keep their *meaning* and change only their *injection*, a dying `collector.snapshot` in place of a throwing `questions`. `DiagnosticsFeed.test.ts` already has `collectorOf()` (`:84-87`); generalise its `source(script)` helper (`:73-77`) into a collector whose `snapshot` counts calls and dies on a script.

| Test | File:line | Change |
|------|-----------|--------|
| F4, F5, F6, F7 | `DiagnosticsFeed.test.ts:146, 164, 187, 205` | dying collector; F6 "a new source after a stop" becomes "a new collector after a stop" |
| F13 | `:305-326` | the restart table loses its `questions` row; three fields |
| F14, F15 | `:328-354` | sample-count probe moves to the collector's `snapshot` |
| F16, F17, F21?, F23, F25, F27, F28, F29 | `:356-454, 531-618` | each uses `questions` as the sampling hook or counter; port to the collector (F28/F29 reconfigure the feed from inside the hook) |
| F2 / `assert.isUndefined(reading.questions)` | `:125, 375, 544` | `:125` still true; `:375` and `:544` read `reading.questions` that the poll no longer fills: drop or move to the collector's `portCalls` |
| M18 | `DockModel.test.ts:725-750` | rewrite with a dying collector (keeps "Stopped, last reading kept, `restart()` resumes"); ADD the new "a throwing `questions` keeps the poll Live" model test (the RED one) |
| M49 | `DockModel.test.ts:1755-1775` | uses `diagnostics = { questions }` to make the diagnostics store publish (`polled.calls > 0`). Replace the trigger with a hydration/activity move or a supplied-reading change; the property (the services store keeps its reference when only hydration or questions move) is unchanged |
| D4, D5, D6, D7, D8, D11 | `DiagnosticsScreens.test.tsx:180-181, 215-216, 234-239, 254-255, 273-274, 324-325` | `throwsFirst()` (`:67-75`) becomes a dying-collector helper; D5/D6 assert the questions view under `Stopped`, so D6 hands both `questions: () => []` (top-level) and a collector that dies after one sample |
| useDiagnostics "reports a sampler that died as Stopped" | `useDiagnostics.test.tsx:142-157` | dying collector |
| DevtoolsDock "samples the questions thunk" / "an explicit questions prop wins over the sampled thunk" | `DevtoolsDock.test.tsx:1092-1096, 1177-1190` | pass `questions` as the dock prop; the second still asserts the supplied list wins |
| `DiagnosticsStore.test.ts:274-300` "questions are re-read every tick and keep their identity while equal" | | **moves** to `GatesFeed.test.ts` (it is the quiet-tick test); `DiagnosticsStore.test.ts:89-130, 233, 373-381` (store `accept`/`mergeReading` with a questions value) stay (the slot stays, option A) |

**The D-03 RED test** (must not live in the characterisation): through the public dock via the seam (below), a thunk that throws on the first call; assert the React tab shows `qadi-questions-failed` with the reason and the root's `data-diagnostics-status` is `Live`, not `Stopped`, and `qadi-diagnostics-stopped` is absent. **On the base it is RED** (status `Stopped`, no `qadi-questions-failed`): the seam maps `{ questions }` to `diagnostics.questions` there. Add its model twin to `DockModel.test.ts` (rewritten M18): thunk throws, `diagnostics.getSnapshot().status` is `Live`, `questions.getSnapshot().questions._tag === "Failed"`, wiring/activity keep updating. And the matrix from UI-SPEC "Failure rules": registry fails + thunk reads (rows with `asking: undefined`), registry reads + thunk fails (`Failed`, gates per view), both fail (two paragraphs, each its own reason), supplied list present (thunk failure not stated), mend (thunk returns rows or `[]`: no residue), a different failure (reason updates), the same failure by two paths (published once).

## Q5. Tests

### M31..M47 and P2: what each needs from the feed alone, and what stays

`makeGateRegistryDouble` API [VERIFIED: `test/gateRegistryDouble.ts`]: `registry`, `add`, `remove`, `update`, `listeners()`, `subscriptions()`, `releases()`, `reads()`, `failReads(thrown)`, `mendReads()`, `mendReadsQuietly()`, `failSubscribe(thrown)`, `mendSubscribe()`, `failRelease(thrown)`; option `swallowListenerErrors`. It already supplies everything the twins need; **no API addition is needed**.

| Case | Line | Asserts today | Feed twin needs | Stays in `DockModel.test.ts`? |
|------|------|---------------|-----------------|-------------------------------|
| M31 | 1030 | rows pair at once; a quiet tick keeps the snapshot | `registry` is `Read` with the registry's own array; a registry change publishes once; a quiet `asked()` tick (fresh equal array) publishes nothing; a changed answer publishes once | the rows-pair-at-once assertion becomes the "join moves first" test |
| M32 | 1060 | gates view Absent/Empty/Listed; questions view Unsampled/Absent/Empty/Rows | feed: `Unwatched` / `Read([])` / `Read([g])`; `Unhanded` | **stays** (join views) |
| M32 b | 1088 | `Starting` reads `Unsampled`, `Live` reads `Absent` | none | **stays** (needs the poll status) |
| M33 | 1103 | subscription lives with the scope, follows a new registry, never outlives close | whole case | no |
| M34 | 1142 | a supplied list keeps one snapshot through `Starting`→`Live` | none | **stays** (join/status) |
| M35 | 1163 | a closed model subscribes to no registry | closed feed: `configure` subscribes nothing | no |
| M36 | 1178 | closed model reads no registry, snapshot unchanged | closed feed reads nothing | the "snapshot unchanged after a late `configure` with a new supplied list" half **stays** (the `closed` guard of `rejoin`) |
| M37..M41 | 1207-1341 | throw on build / swallowed notification / tick / subscribe / configure; release once | all, asserting `snapshot.registry` tags and `reason` text | the "rows claim nothing while Failed" assertion is a join case already in `Gates.test.ts:339`; add one `DockModel` case that a failed registry reaches `questions` |
| M42, M42 b | 1343, 1373 | release that throws: not stated, not repeated, close still closes | all | no |
| M43, M44 | 1388, 1422 | retry after failed watch; silent mend until a read | all; M44's "poll that changed what is asked" is now "a tick whose answer changed" | no |
| M45, M46 | 1453, 1482 | non-error throw keyed by its rendering; unrenderable throw stated as the fixed sentence | all (M46's sentence is unchanged for the registry; add the thunk variant) | no |
| M47 | 1521 | one `configure` → one snapshot, no handed-away read | feed: one `configure` publishes once and reads no registry handed away | **stays** as "one `configure` publishes one `questions` snapshot" (needs the feed-first ordering) |
| P2 | 1580 | rows equal an independent oracle at every step; a quiet tick keeps the reference | feed P2: `instances` is the registry's array and `asked` the last read at every step; tick that changed nothing keeps the snapshot; closing releases | **keep a trimmed P2 in `DockModel.test.ts`** (rows vs the `Equal.equals` oracle), since the join is the model's; change its `polled` read from `model.diagnostics.getSnapshot().reading.questions` (`:1608`) to the thunk's last answer |

**The "join moves first" test** (new, in `DockModel.test.ts`): after `makeDockModel({ gates: double.registry, questions })`, subscribe a *host* listener directly on the registry (`double.registry.subscribe(...)`) **after** the model was built; on `double.add(...)` assert the host listener already sees `model.questions.getSnapshot()` joined to the new guard. The model's feed subscribed first, so its `rejoin` ran first. Add the sibling assertion for the diagnostics side (a host listener on `model.diagnostics` sees the `Starting`→`Live` flip already applied to `model.questions`). Neither exists today (grep for "moves first"/"before any host" found nothing in `DockModel.test.ts`; the claim lives only in the comment at `DockModel.ts:270`).

### The new characterisation (D-09)

**What the existing files cover.** `QuestionsPanel.characterisation.test.tsx` (196 lines, twelve byte-for-byte cells) reaches questions **only through `reading={{ questions }}`** (the supplied list) and the `neverBuilt` layer for "questions absent, unsampled"; guards only through `gatesProp(guards)` (a constant registry whose `subscribe` announces nothing; `gatesProp.ts`). `QuestionsPanel.gates.test.tsx` covers a hand-built `GatesView.Failed` snapshot (`:124-152`) and the lens; `QuestionsPanel.test.tsx` covers absent/empty/rows/hydration/invalidate with `panelInput`. **Not covered anywhere through the dock:** rows from the thunk; thunk empty; thunk with a live poll vs `Starting` vs `Stopped`; a throwing `instances`; a throwing `subscribe`; a registry swapped by a re-render; announced and silent mends; supplied-over-thunk precedence.

**New cells to write on the base** (each compared as `outerHTML` of `qadi-questions`, like the existing file):
1. thunk rows, live poll (`diagnostics: {}` plus the thunk) — rows with guards;
2. thunk `[]` → `qadi-questions-empty`;
3. thunk handed, poll `Starting` (`neverBuilt`) → questions block renders nothing (withheld);
4. no thunk, live poll → `qadi-questions-absent`; no thunk, `Starting` → nothing;
5. `Stopped` before any sample (a dying collector) → nothing; `Stopped` after a sample → rows/empty/absent per what was sampled (the `D5`/`D6` semantics);
6. supplied list over thunk (the existing `DevtoolsDock.test.tsx:1177` assertion, byte-pinned);
7. registry whose `instances` throws on the build → `qadi-gates-failed` + rows with no `asking`; **and** thrown after mount, then a silent mend then a trigger (a `reading` re-render → `configure`, which always re-reads) and an announced mend;
8. registry whose `subscribe` throws → `qadi-gates-failed`; a re-render with the same registry subscribes again and mends;
9. registry swapped by re-render → rows re-join to the new guards;
10. registry throws a value that cannot be described → the fixed sentence.

**Input seam (how "never edited" survives D-02).** The characterisation passes the thunk through one helper file, exactly as `gatesProp.ts` carried ARCH-96's change ("`QuestionsPanel.characterisation.test.tsx` passes every `gates` it renders through here and nothing else, so its cells' inputs and expected markup stayed as written", `gatesProp.ts` header). New `test/react/questionsProp.ts`: on the base `(props, thunk) => ({ ...props, diagnostics: { ...props.diagnostics, questions: thunk } })`; in the commit that moves the thunk (4b) it becomes `({ ...props, questions: thunk })`. That one-file edit is the only change; every golden stays. The D-03 RED test uses the same seam.

**Silent-mend cell trigger.** Because a pure `rejoin` does not re-read the registry on every diagnostics publish (Anti-patterns), pin silent mends only via the documented triggers: a `configure` (re-render with a new `reading` literal), a registry announcement, or a cadence tick whose `asked()` answer changed. Do not use a hydration-only publish.

### Other test files that must change
- `GatesFeed.test.ts` (new): the twins above; **RED by import first** (D-12): the first commit is the test file importing a not-yet-existing `../../src/model/GatesFeed.ts`.
- `Gates.test.ts`: the `JoinInput` literals, plus `QuestionsView.Failed` precedence cases (rows beat failure; failure beats unsampled; unsampled beats absent).
- `QuestionsPanel.test.tsx`: one render case for `qadi-questions-failed` (hand-built `QuestionsView.Failed` snapshot, like the gates one) and the "both fail" order.
- `surface.tst.ts`: the `makeGatesFeed` private pin.
- `packages/react/test/DevtoolsFeed.test.tsx` (`:143-144`: `feed.diagnostics.questions` → `feed.questions`, still `toBe(atoms.asked)`), `DevtoolsFeed.tst.ts` (`:39` `feed.diagnostics.questions` → `feed.questions`; `:15` `DevtoolsDiagnosticsFeed` import; the "owns layer and questions" test at `:22-26` stays true; update its title and the doc at `:1-9`). The "extra fields pass through" and "keeps the layer and the diagnostics object across a re-render" tests need no change.
- **BDD (`features/`)**: no step file names the thunk (`gate-instances.steps.test.ts` mentions `questionsAsked`, a count helper; `devtools-screens.steps.test.ts` renders `DevtoolsDock` with `catalogue` only). No BDD edit is expected; Phase 55 touched `devtools-screens.steps.test.ts` only for the `PortActivity.port` type.
- Traceability: new test files must be listed in `spec/traceability.md` (Phase 55's row: "the three new test files"; existing rows for `DockModel.test.ts` at `:525`, `Gates.test.ts` at `:564`, the characterisation at `:394`).

## Q6. Mutation (D-11)

- **Config:** `stryker.devtools.mjs`, `mutate: ["packages/devtools/src/model/**/*.ts"]`, `ignoreStatic: true`, thresholds `break: 80`, JSON report `reports/mutation-devtools/mutation.json` [VERIFIED: file read]. `src/react/` is outside the glob. **`@qadi/react`'s `DevtoolsFeed.ts` is in no mutate glob** (`stryker.react.mjs:55-60` lists `DecisionOutcome.ts`, `QuestionBook.ts`, `HydrationEvent.ts`, `SweepScheduler.ts`), so the react change needs ordinary tests only and the new `QuestionsPanel` arm is outside the glob too (hence the characterisation).
- **How `55-mutation.mjs` scoped it:** `BASE = [DockModel.ts, Wiring.ts]`, `AFTER = [..., PortCards.ts]`, `MOVED = []`; `base`/`after` write per-file counts, `measured = detected/(detected+survived+noCoverage)`, survivors by an id, ignored mutants; `evidence <report>` keeps an `ignoreStatic:false` run; `compare` fails a base file whose score fell unless it is in `MOVED` with an unchanged survivor set, requires zero survivors in the new module, and demands every static-ignored mutant of the new module be `Killed` in the evidence run (`.planning/phases/QD-55-…/55-mutation.mjs:93-137`). Reuse it as `56-mutation.mjs`.
- **Phase 56's files:** `BASE = [DockModel.ts, DiagnosticsFeed.ts, DiagnosticsStore.ts, Gates.ts]`; `AFTER = BASE + GatesFeed.ts`; `MOVED = [DockModel.ts, DiagnosticsFeed.ts, DiagnosticsStore.ts]` (all three lose killed mutants to the feed; `Gates.ts` gains `Failed`/`questionsFailed`, so it should not fall). Declare `MOVED` **before** the change, as 55 did.
- **Recorded scores:** `55-mutation-after.json`: `DockModel.ts` killed 145, survived 0, noCoverage 0, ignored 2 (measured 1) [VERIFIED: file read]. `DiagnosticsFeed.ts`, `DiagnosticsStore.ts` and `Gates.ts` were **not** recorded by Phase 55 (its BASE held only `DockModel.ts` and `Wiring.ts`), and the repo's `reports/mutation-devtools/mutation.json` is Phase 55's scoped DockModel-only run (killed 145, ignored 2). **They must be measured on the base in Plan 01**; do not assume 1.0.
- **Run (the planner's executor, not this research):** `pnpm exec stryker run stryker.devtools.mjs --mutate 'packages/devtools/src/model/DockModel.ts,packages/devtools/src/model/DiagnosticsFeed.ts,packages/devtools/src/model/DiagnosticsStore.ts,packages/devtools/src/model/Gates.ts'` on the clean base (the harness also refuses a stale report: it checks the report is newer than every file under `packages/devtools/{src,test}`). The evidence run uses a config **outside the repo** with `ignoreStatic:false` (55-06's T-55-15). Never run Stryker as part of research.
- **Where survivors will try to hide in `GatesFeed.ts`:** the quiet-tick `Equal.equals` branch, the "tick re-reads the registry only on a changed answer" branch, the `|| watchFailure !== undefined` retry, the fallback sentences (module-scope strings are static-ignored: need the evidence run), the key comparison for a repeated failure, and each `closed` check. The twins in Q5 are written to kill each: M38/M43/M45 (keys), M44 (quiet tick reads nothing), M43 (retry), M46 (fallback), M35/M36 (closed).
- **`DockModel.ts` after the move** keeps `joinInputOf`, `rejoin`'s three-way compare and `closed`; each needs a `DockModel.test.ts` case that fails when it is mutated (M34 for the `supplied` compare and the `unsampled` compare, M36 for `closed`, the thunk-failure/withheld cases for `joinInputOf`).

## Q7. Records (D-13..D-15)

| Record | Where | Notes |
|--------|-------|-------|
| ADR-QD-162 | `spec/decisions/162-gates-are-the-dock-models-eighth-store-and-their-states-are-stated-once.md`, Rev 1.5 | decision 5 is the guard being moved. **Left intact** (D-13). BEH-QD-583/584 "Pinned by" paragraphs cite `DockModel.test.ts` M-numbers that will move to `GatesFeed.test.ts`: update those paragraphs, not the ADR |
| ADR-QD-137 | `spec/decisions/137-a-devtools-session-owns-its-runs-through-a-scope.md` | the lifetime rule the feed applies |
| ADR-QD-150 | `spec/decisions/150-a-scoped-run-that-a-newer-run-supersedes.md` | `SupersedingRun`; kept |
| ADR-QD-047 | `spec/decisions/047-a-headless-devtools-model.md`, Rev 1.17 | the 2026-11-12 amendment (CCR-QD-425) is at `:395-420` and its list says the feed "restarts on `layer`, `collector`, `questions` or `intervalMillis`" (`:407`) and "a throwing `questions`" (`:401`). It says "That amendment's list is history and is not rewritten" (`:413`). ADR-QD-169 amends it by a **new dated amendment (Rev 1.18)** after the 2026-11-18 port-cards one, as 1.17 did |
| ADR-QD-169 | new `spec/decisions/169-<slug>.md` + a block in `spec/decisions/index.yaml` after the `ADR-QD-168` entry (`:521-524`) | `Document ID` must equal the file number (Wave-11 rule, gate 10). Status line shape: `Accepted — amends ADR-QD-047; applies ADR-QD-137; keeps ADR-QD-162, ADR-QD-150` |
| BEH-QD-616..620 | `spec/behaviors/28-devtools-screens.md`, appended after BEH-QD-615 (`:2202`), as Phase 55 did for 611-615 | proposed: **616** the gate watch is one scoped feed and the model holds none of it; **617** a throw in either host input is stated, never swallowed, never stops the poll (the five Rev 1.1-1.5 requirements restated for the feed); **618** the questions thunk is a dock input read on the feed's cadence (interval, `Equal.equals` quiet tick, one-moment re-read, unsampled withheld, the Starting→Live nuance); **619** a throwing thunk is `QuestionsView.Failed` and the precedence order; **620** `useDevtoolsFeed` hands `questions` at the top level and `questions` leaves `DiagnosticsDockOptions` (Breaking). Amend BEH-QD-583/584/585, BEH-QD-507 (`:1308`) and the restart REQUIREMENT (`:1278`) in dated notes; BEH-QD-327 (`09-react.md:635-645`) listing |
| INV-QD-357, 358 | `spec/invariants.md` after INV-QD-356 (`:4121`); amend INV-QD-343's Enforcement paragraph (`:3985`) | 357: one feed owns the gate watch and `DockModel` holds no registry, subscription, failure state or thunk. 358: the panel's two host inputs fail the same way and neither stops the poll. INV-QD-313 (`a poll defect is stated…`) keeps its text; only its enforcement cites change |
| CCR-QD-447 | `spec/README.md` table, after CCR-QD-446 (`:383`) | shape: date, one cell naming every file changed (spec files with their new Revs, the changesets, the upgrade note, source and tests), then `ARCH-103. **…title.** …prose… Unused: <ids>` ending as 446 does ("ending Unused: none" in Phase 55). README Rev 1.249 → 1.250 |
| Revisions to bump | `spec/invariants.md` 1.153→1.154, `spec/traceability.md` 1.216→1.217, `spec/behaviors/28-devtools-screens.md` 1.31→1.32, `spec/behaviors/09-react.md` 3.8→3.9, `spec/decisions/047` 1.17→1.18, `spec/overview.md` 1.122→1.123, `spec/README.md` 1.249→1.250 | [VERIFIED: each header's Change History row read this session]; check with `node scripts/spec-revise.mjs --check` (Phase 55's gate list) |
| Changesets | `.changeset/devtools-questions-is-a-dock-input.md` (`"@qadi/devtools": minor`) and `.changeset/react-feed-hands-questions.md` (`"@qadi/react": minor`) | shape [VERIFIED: `.changeset/devtools-port-activity-is-a-port-name.md`]: frontmatter, one `**Breaking.**` paragraph, a "no X changes" sentence, and `See the 0.13 section of the upgrade guide, `/docs/reference/upgrading/`.` Devtools entry: `questions` leaves `DiagnosticsDockOptions` and `DiagnosticsOptions` for a `DevtoolsDock` prop; a throwing thunk is stated in the panel and no longer stops the poll; `DiagnosticsDockOptions` restarts on three fields. React entry: `useDevtoolsFeed` returns `questions` at the top level; `DevtoolsDiagnosticsFeed` is `{ layer }`; `<DevtoolsDock {...feed} />` is unchanged |
| Upgrade note | `apps/website/src/content/docs/docs/reference/upgrading.md`, a new `## 0.13:` section after "`PortActivity.port` is a `PortName`" (`:899`, file is 910 lines) | prose; show the before/after for a hand-wired `diagnostics={{ …, questions }}` and note the spread is unchanged |
| `spec/devtools-spec/` / gate 12 | `scripts/check-devtools-claims.mjs` | **No claim there concerns the poll stopping on a throwing `questions`**: a grep of `spec/devtools-spec` for `throw`, `Stopped`, `asked()` found only two prose mentions of `QadiAtoms.asked()` (`02-screens.md:28, 405`) and an HTML mock. Gate 12 is unaffected; the screen docs at `02-screens.md:354, 401` mention `runDiagnostics` sampling and still hold |

## Common Pitfalls

### Pitfall 1: `rejoin` publishes twice in one `configure`
**What goes wrong:** M47 (`:1521`) fails: the feed publishes a new snapshot against the *old* supplied list, then `remerge` publishes again.
**Why:** `shownReading` is updated by `remerge`, after the feed.
**How to avoid:** `rejoin` reads `inputs.reading?.questions` (already `next`), and `gatesFeed.configure` runs first.
**Warning signs:** `seen` in M47's twin has two entries.

### Pitfall 2: the thunk becomes `Failed` instead of a defect only if every host call is guarded
**What goes wrong:** a hostile answer (a Proxy array) throws inside `Equal.equals` in the cadence fiber and kills it, silently, which is the very defect D-01 removes.
**How to avoid:** the thunk call and the compare share one `try`; a fiber that cannot die needs no `onFailure`.

### Pitfall 3: stale registry listener after a release that threw
**What goes wrong:** the old registry keeps a live listener (release threw, `DockModel.ts:235-237` comment); it fires into a closed feed or reads the old registry.
**How to avoid:** the listener checks `runs.closed()` and reads the registry the feed holds now.

### Pitfall 4: `react`'s registry swallows a listener throw
`makeGateRegistry.changed()` runs each listener in try/catch (ADR-QD-162 decision 5; the double's `swallowListenerErrors`). The feed's listener must not throw (guarded read), and a throw downstream of it (`rejoin`'s `joinQuestions`) is swallowed by the host registry, exactly as on the base. Do not "fix" it.

### Pitfall 5: the characterisation breaks when `questions` leaves `diagnostics`
Write the seam (`questionsProp.ts`) **before** the first characterisation cell, so no golden is ever touched.

### Pitfall 6: a quiet registry-mend trigger that no longer exists
Do not pin a silent mend through a hydration-only diagnostics publish (Anti-patterns).

### Pitfall 7: finalizer order
Register the feed's release finalizer before `makeSupersedingRun()` (LIFO) so `closed()` is already true when a release runs; `DockModel`'s own finalizer (sets `closed`) is registered last and so runs first, as the base's did.

### Pitfall 8 (house style, WX-04)
No `as`, `!`, `any`, `Record<string, unknown>`, `async`/`await`, new `switch`. Convert the two enums with a **module-scope** `Match.type<…>().pipe(Match.tagsExhaustive({…}))` (AGENTS §5a; `isUnsampled` at `DiagnosticsFeed.ts:118-125` is the pattern); never `Match.value` per call. `UNTRACED_BUDGET` (AGENTS §5): the feed adds **no** `Effect.fnUntraced`; `makeGatesFeed` is a named `Effect.fn`, like its siblings, so the budget is untouched. Error handling stays `try/catch` around host calls, not `Effect.orDie`. Barrels: `GatesFeed.ts` is not exported (ADR-QD-099; the pin above). Circular import gate (`pnpm circular`): `GatesFeed.ts` imports `Gates.ts`, `DiagnosticsStore.ts` (the interval constant), `ExternalStore.ts`, `SupersedingRun.ts`; `DockModel.ts` imports `GatesFeed.ts`; nothing imports back, so no cycle. Doc-comment shape (AGENTS header): one-line summary, then the why.

### Pitfall 9: Phase 55's `reservice` (review IN-03)
`reservice` (`DockModel.ts:257-269`) sits beside `rejoin` and runs `portCards` unguarded in a listener loop. Phase 55's disposition: "typed callers cannot reach a throw from `portCards`" and the review's own fix is "none required". **Not free and not required here**: guarding it means holding a new `ServicesView.Failed` state, which is scope. Leave it, and leave IN-01/IN-02 deferred.

### Pitfall 10: a closed scope must read no host code
After `Scope.close`: `configure` returns at once (`runs.closed()`), the registry listener returns, the cadence is interrupted, no thunk and no registry is read. M35/M36's twins pin it; the model's own `closed` guards `rejoin`.

## Code Examples

### Cadence and read (shape, not final code)
```typescript
// Source: runDiagnostics' loop, packages/devtools/src/model/DiagnosticsStore.ts:235-238; forking, SupersedingRun.ts
const startCadence = () => {
  const token = runs.begin();
  if (questionsNow === undefined) return runs.stop();            // no thunk, no run
  runs.fork(
    token,
    Effect.repeat(
      Effect.sync(tick),                                          // tick never throws
      Schedule.spaced(intervalNow ?? DEFAULT_DIAGNOSTICS_INTERVAL_MILLIS),
    ),
  );
};
```

### The twin that proves a quiet tick (feed alone)
```typescript
// Source: modelled on DockModel.test.ts:1030-1058 (M31) and DiagnosticsStore.test.ts:274-300
it.effect("G1: a quiet tick keeps the snapshot; a changed answer publishes once", () =>
  Effect.gen(function* () {
    let asked: ReadonlyArray<AskedQuestionLike> = [{ policy: readPolicy }];
    const double = makeGateRegistryDouble([guard("a", readPolicy)]);
    const feed = yield* makeGatesFeed({ gates: double.registry, questions: () => asked.map((q) => ({ ...q })) });
    yield* settleTurns;
    const first = feed.getSnapshot();
    const heard = { calls: 0 };
    feed.subscribe(() => { heard.calls += 1; });
    yield* tick;                                   // a fresh, equal array: nothing published
    assert.strictEqual(feed.getSnapshot(), first);
    assert.strictEqual(heard.calls, 0);
  }));
```

## State of the Art

| Old approach | Current approach | Changed | Impact |
|--------------|------------------|---------|--------|
| the questions thunk is a diagnostics option sampled with the poll | a dock input owned by the gates feed | this phase | a throwing thunk is a stated panel state, never a poll defect |
| the registry watch inline in `DockModel` (8 `let`s) | a scoped feed beside the timeline and diagnostics feeds | this phase | the watch's tests run without building the model |
| panel joined a polled list with a `gates` array in the view | the model joins both at one moment (`joinQuestions`) | ADR-QD-162 | unchanged by this phase |

**Deprecated/outdated by this phase:** `DiagnosticsDockOptions.questions`, `DiagnosticsOptions.questions`, `DevtoolsDiagnosticsFeed.questions` (removed, Breaking).

## Runtime State Inventory

Not a rename/migration phase. Stated explicitly: **Stored data:** none (the model holds in-memory snapshots only). **Live service config:** none. **OS-registered state:** none. **Secrets/env vars:** none. **Build artifacts:** none. (`reports/mutation-devtools/mutation.json` is a generated report that the harness refuses when stale; regenerate, do not edit.)

## Environment Availability

| Dependency | Required by | Available | Version | Fallback |
|------------|-------------|-----------|---------|----------|
| node | everything | yes | v26.13.0 | none needed |
| pnpm | scripts | yes | 10.17.1 | none needed |
| vitest | tests | yes | 5.1.0 (ran) | none needed |
| Stryker | WX-05 | declared | 10.1.1 | the executor runs it; research does not |
| tstyche | tst pins | declared in `package.json` scripts (`test:tstyche`) | n/a | none needed |

Missing with no fallback: none. Context7 and several MCP servers timed out this session; nothing here depends on them (all facts are in-repo).

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest 5.1.0 + `@effect/vitest`, `@testing-library/react` with happy-dom, tstyche (`*.tst.ts`), Stryker for `src/model/` |
| Config file | root `vitest.config.ts` (projects `devtools`, `react`), `packages/devtools/vitest.config.ts`, `tstyche.json`, `stryker.devtools.mjs`; coverage `src/model/**` 95%, `src/react/**` 90% (AGENTS §10 and Phase 55's VALIDATION) |
| Quick run command | `pnpm exec vitest run --project devtools packages/devtools/test/model/GatesFeed.test.ts packages/devtools/test/model/DockModel.test.ts packages/devtools/test/react/QuestionsPanel.characterisation.test.tsx < /dev/null` (repo root, stdin closed) |
| Full suite command | `pnpm check:pr < /dev/null` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| GFED-01 | feed owns the watch; twins of M31..M47, P2 | unit (feed alone) | `pnpm exec vitest run --project devtools packages/devtools/test/model/GatesFeed.test.ts < /dev/null` | ❌ Wave 0 (RED by import) |
| GFED-02 | model composes the feed, "join moves first", one configure one snapshot | model | `pnpm exec vitest run --project devtools packages/devtools/test/model/DockModel.test.ts < /dev/null` | ✅ (edited) |
| GFED-03 | twins green before cases are deleted | model | same + `git diff` check | ❌ Wave 0 |
| GFED-04 | panel markup unchanged | characterisation through the dock | `pnpm exec vitest run --project devtools packages/devtools/test/react/QuestionsPanel.characterisation.test.tsx <new file> < /dev/null` | ❌ Wave 0 (new file + `questionsProp.ts`) |
| GFED-05 | thunk owned by the feed; throw stated, poll `Live` | model + dock RED→green | `…DockModel.test.ts … QuestionsPanel.thunk…test.tsx` | ❌ Wave 0 |
| GFED-05 | misuse is a compile error (`extra.questions`; `diagnostics.questions`) | tstyche | `pnpm exec tstyche packages/react/test/DevtoolsFeed.tst.ts < /dev/null` | ✅ (edited) |
| WX-02/03/07 | records, overview rows, changesets, 0.13 note | gate | `node scripts/spec-revise.mjs --check`; `pnpm spec:verify:strict`; `pnpm spec:gates`; `pnpm spec:claims`; `pnpm spec:api` | ✅ |
| WX-04 | no banned constructs | lint | `pnpm lint`; `pnpm circular` | ✅ |
| WX-05 | mutation not lower | harness | `node .planning/phases/QD-56-…/56-mutation.mjs compare <static json>` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** the quick run plus the touched file's own test (about 5 s).
- **Per wave merge:** `pnpm exec vitest run --project devtools < /dev/null`, `--project react`, `pnpm exec tstyche`, `pnpm lint`, `pnpm circular`.
- **Phase gate:** `pnpm check:pr < /dev/null` green, then the two scoped Stryker runs and `56-mutation.mjs compare`.

### Wave 0 Gaps
- [ ] `packages/devtools/test/model/GatesFeed.test.ts` (RED by import), covering GFED-01/03/05
- [ ] `packages/devtools/test/react/questionsProp.ts` (the input seam) and the new characterisation file, written on the base, GFED-04
- [ ] the D-03 RED test (dock-level) and its `DockModel` twin
- [ ] a dying-collector test helper (replaces `source`/`throwsFirst`)
- [ ] `56-mutation.mjs` + `56-mutation-base.json` (four base files), WX-05
- Framework install: none.

## Security Domain

`security_enforcement` is on (`.planning/config.json`, ASVS level 1). The change adds no network, storage, parsing or authentication.

### Applicable ASVS Categories
| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication / V3 Session | no | none involved |
| V4 Access Control | no | the dock holds guards and questions, never a verdict (ADR-QD-080, INV-QD-343) |
| V5 Input Validation / output encoding | yes | host-thrown values are rendered as React text (`{reason}`), never `dangerouslySetInnerHTML`; the reason is rendered raw per UI-SPEC and never sent to a sink, response, log or metric (BEH-QD-507's rule, which the new BEH repeats) |
| V7 Error handling | yes | a host throw is stated, never swallowed, never fatal (the whole point of D-01/D-03); stating is total |
| V6 Cryptography | no | none |

### Known Threat Patterns
| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Hostile thrown value (a Proxy) breaking the error path | Denial of service | `stated` is total, with a fixed fallback sentence per input (M46) |
| Hostile `asked()` answer throwing in the compare | Denial of service | the compare shares the thunk's `try` (Pitfall 2) |
| A closed model running host code after unmount | Tampering / Information disclosure | `runs.closed()` and `closed` guards; M35/M36 twins |
| A failure reason (with a stack) leaving the process | Information disclosure | rendered as text only; unchanged rule |

## Open Questions

1. **What does `Diagnostics.questions` mean once the poll no longer samples it?** (owner-confirmable)
   - Known: D-02 says the reading's own `questions` field "(`Diagnostics`/`DiagnosticsReading`, a reading supplied from elsewhere) stays". After the move the poll never fills `Diagnostics.questions`; only a supplied reading does, via `mergeReading`.
   - Option A (recommended, literal D-02): keep both fields; `runDiagnostics` accepts a reading whose `questions` is `undefined`; document the slot as "only a supplied reading carries it". Zero change to `Diagnostics`' shape; `DiagnosticsStore.test.ts` `accept`/`mergeReading` cases stay.
   - Option B (cleaner, narrower than D-02): drop `Diagnostics.questions` (and `accept`'s `keep`) and let the model read `supplied?.questions` directly. Removes a half-orphan slot but changes the public `Diagnostics` type and `useDiagnostics().reading` for a field only a supplied reading ever set.
   - Recommendation: A, and ask the owner once whether to take B as a follow-up. The plan must not pick B silently.
2. **Should `intervalMillis` be forwarded from `diagnostics` to the feed?** Recommended yes (one "how often to sample" dial). The alternative (a feed-only default) would silently speed no `diagnostics.intervalMillis` host up or down. Low risk; the planner may confirm.
3. **`FeedOwnedKey` = `"layer" | "questions"`** (Q1 row 10): recommended; the alternative leaves a silent-ignore trap.
4. **INV-QD-357's wording.** "No mutable gate-watch state in `DockModel`" is true of the watch (registry, subscription, failure, thunk), but `DockModel` keeps `closed` and `lastJoin`. Word the invariant by what the feed owns.
5. **Registry re-read on non-question diagnostics publishes is dropped** (Anti-patterns). It matches ADR-QD-162's wording; it is a (tiny) observable change for a registry that mends silently. Record it in BEH-QD-617 rather than reintroducing the read.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `Diagnostics.questions` stays as a never-sampled slot (Option A) is what the owner meant by D-02's last sentence | Q1, Open Q1 | the owner wanted B; a small follow-up type change |
| A2 | Mutation scores for `DiagnosticsFeed.ts`, `DiagnosticsStore.ts`, `Gates.ts` are unknown (not recorded by Phase 55) and may be below 1.0 | Q6 | the D-11 comparison has a different baseline; Plan 01 measures it |
| A3 | The first read of the thunk at feed build (rather than after the layer builds) changes nothing a user can see except possible staleness up to one interval at the `Starting`→`Live` flip | Q3 | a characterisation cell with a changing thunk and a slow layer could differ; keep the cells' thunks constant |
| A4 | New test files are added to `spec/traceability.md` by hand and checked by `spec:verify:strict` (Phase 55's CCR-QD-446 row and traceability Rev 1.216 say so) | Q7 | a gate fails at records time; cheap to fix |
| A5 | Proposed BEH split (616..620) and file placement (all in `28-devtools-screens.md`) | Q7 | BEH placement is discretionary (CONTEXT); a reviewer may prefer 620 in `09-react.md` |
| A6 | Re-reading the registry only on notification, a changed answer, or `configure` (not on every diagnostics publish) is acceptable | Anti-patterns, Open Q5 | an unlisted test or host relied on the broader re-read |

## Plan Shape (suggested, D-12 order)

1. **56-01 evidence on the base:** base facts at HEAD, reserved-id check (grep `spec/`, `packages/`, `.changeset/`, `AGENTS.md` for ARCH-103, ADR-QD-169, CCR-QD-447, BEH-QD-616..620, INV-QD-357/358; never run `scripts/next-id.mjs`), `56-mutation.mjs`, `56-mutation-base.json` for the four files.
2. **56-02 characterise and RED, on the base:** `questionsProp.ts`, the new characterisation (cells 1-10), the D-03 RED test (RED on the base).
3. **56-03 the feed:** `GatesFeed.test.ts` RED by import, then `GatesFeed.ts` (both halves), twins green.
4. **56-04a the watch moves (pure refactor):** `DockModel` composes the feed for the **registry only** (thunk still read from the poll's reading), characterisation unchanged and green; "join moves first" test; delete watch-only cases whose twins are green.
5. **56-04b the thunk moves (the deliberate change):** `DockModelInputs.questions`, `useDockModel`, `DevtoolsDock`, remove `questions` from `DiagnosticsDockOptions`/`DiagnosticsOptions`/`runDiagnostics`/`DiagnosticsFeed`, `QuestionsView.Failed` + `JoinInput.questionsFailed` + panel arm; the seam flips; D-03 test goes green; dying-collector rewrite of the eleven poll-defect tests; `@qadi/react` feed; example comment.
6. **56-05 mutation after + evidence;** 7. **56-06 ADR-QD-169, BEH-QD-616..620, amendments;** 8. **56-07 INV-QD-357/358, traceability, CCR-QD-447, two changesets, upgrade note, READMEs/website prose, overview rows;** 9. **56-08 phase scan and `pnpm check:pr`.**

## Sources

### Primary (HIGH confidence): files read this session at HEAD `427a2065`
- `packages/devtools/src/model/DockModel.ts`, `DiagnosticsFeed.ts`, `DiagnosticsStore.ts`, `Gates.ts`, `SupersedingRun.ts`, `ExternalStore.ts`, `TimelineFeed.ts` (head), `PortCalls.ts:167-179`
- `packages/devtools/src/react/DevtoolsDock.tsx`, `QuestionsPanel.tsx`, `useDockModel.ts`, `useDiagnostics.ts`, `index.ts`; `packages/devtools/src/index.ts`
- `packages/react/src/DevtoolsFeed.ts`, `QuestionBook.ts:184`
- `packages/devtools/test/model/DockModel.test.ts` (1-190, 720-800, 1005-1780), `DiagnosticsFeed.test.ts`, `DiagnosticsStore.test.ts`, `Gates.test.ts` (grep), `gateRegistryDouble.ts`, `helpers.ts:175`, `react/QuestionsPanel.characterisation.test.tsx`, `QuestionsPanel.gates.test.tsx` (head), `DiagnosticsScreens.test.tsx`, `useDiagnostics.test.tsx`, `DevtoolsDock.test.tsx`, `surface.test.ts`, `surface.tst.ts`; `packages/react/test/DevtoolsFeed.test.tsx`, `DevtoolsFeed.tst.ts`
- `spec/decisions/162-…md`, `047-…md` (395-500), `spec/behaviors/28-devtools-screens.md` (1270-1330, 1885-2070), `09-react.md` (625-700), `spec/invariants.md` (3977-3990, 4105-4130), `spec/overview.md` rows 584/909/913/919/920/923, `spec/traceability.md`, `spec/README.md:383`, `spec/decisions/index.yaml`
- `.planning/phases/QD-56-…/56-CONTEXT.md`, `56-UI-SPEC.md`; `.planning/phases/QD-55-…/55-RESEARCH.md` (head), `55-VALIDATION.md`, `55-mutation.mjs`, `55-mutation-base.json`, `55-mutation-after.json`, `55-REVIEW.md` (IN-03); `_WAVE11-CONTEXT.md`
- `stryker.devtools.mjs`, `stryker.react.mjs`, `package.json` scripts, `.planning/config.json`, `.changeset/devtools-port-activity-is-a-port-name.md`, `.changeset/devtools-feed-hands-the-gate-registry.md`, `apps/website/.../devtools.md`, `hooks.md`, `upgrading.md` (headers), `packages/devtools/README.md`, `packages/react/README.md`, `examples/nextjs-newsroom/src/client/Dock.tsx`, `test/dock-wiring.test.tsx`
- A test run on the base: `pnpm exec vitest run --project devtools` over `DockModel.test.ts`, `QuestionsPanel.characterisation.test.tsx`, `QuestionsPanel.gates.test.tsx`: 3 files, 101 tests passed.

### Secondary / Tertiary
- none. No web source was needed; Context7 timed out and is not needed for an in-repo refactor.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH, nothing new is installed.
- Architecture (feed shape, ordering, cadence): HIGH on the base facts and the five guarded paths; MEDIUM on the two judgement calls (the `Diagnostics.questions` slot, the dropped non-question re-read), both flagged.
- Pitfalls: HIGH, each is tied to an existing test or ADR line.
- Mutation baselines for three files: unknown until Plan 01 (A2).

**Research date:** 2026-11-18
**Valid until:** stable until `DockModel.ts`, `DiagnosticsFeed.ts` or `DevtoolsFeed.ts` change (Phases 57-61 touch other packages; Phase 60 touches the feeds and `index.ts`, so re-check line numbers if 60 lands first).
