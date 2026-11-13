# Phase 36: Carried spec debt and stale records - Code-behaviour research

**Researched:** 2026-11-12
**Base:** `d31a25ee8207d4775d07253ea4e987cbe8daf0cc` (`git diff --stat d31a25ee HEAD -- packages spec scripts stryker.*.mjs` is empty; the later commits are planning docs only)
**Scope:** the code-behaviour half (D-02 items 1-4, DEBT-04 code items, DEBT-05's 28 IN-06, the `useScoped` suppression, D-10/D-11 inputs). The spec, record and wording items are `36-RESEARCH.md`.
**Installed Effect:** `effect@4.1.2` [VERIFIED: node_modules/effect/package.json `"version": "4.1.2"`]. The reactivity sources are at `node_modules/effect/src/reactivity/{Atom,AtomRegistry}.ts`, not `unstable/reactivity/`.

## Summary

Of the 13 code items, 5 are real defects reproduced RED at the base, 6 are still-true but are tidy-ups with no observable defect (so their tests are characterisations plus a structural pin), 1 is already resolved, and 1 is a green characterisation of an item whose fear did not materialise.

- **TimelineFeed untokened accept (34 IN-01): defect, reachable.** Only through a re-entrant `configure` (a timeline listener swapping the source mid-backlog), because Effect defers an interrupt of a *running* fiber. RED reproduced: the replaced read's remaining backlog still lands (`['a1','a2','a3','b']`, expected `['a1','b']`). A plain suspended read is interrupted synchronously and cannot write late (verified).
- **TimelineFeed silent death (34 IN-05): defect, confirmed.** A `die` in `read` or in the live stream ends the fiber with nothing observable (`FiberHandle` only resolves an internal deferred nobody awaits). Fix prototyped and green: a per-start `generation` token plus `Effect.onExit` with `Cause.hasInterruptsOnly`, and a smaller closed `TimelineStatus = Reading | Stopped { reason }`.
- **`subject` atom not keepAlive (35 spike): defect, and wider than the Activity case.** The seeded `subject` node is scheduled for removal at creation and removed on the next macrotask unless a decision atom (or `useSubject`) holds it. So a provider whose first gate mounts after one macrotask, a hidden-then-shown `<Activity>` with the provider outside, and a later `subject` prop change with no gate mounted all leave the next gate `Initial` forever. Three RED tests, all green with one line: `Atom.keepAlive` on `subject`. The seed atoms have the same gap (RED reproduced) but `keepAlive` is the wrong fix for them; see Q2.
- **28 IN-06: no defect.** The StrictMode identity-changing rerender prototype passes at the base (hook level and provider level). It is a green characterisation to add.
- **24 IN-04 is already resolved** (the test asserts `Idle` strictly, `SimulationSession.test.ts:978-1005`). 24 IN-01 and 24 IN-03, 25 IN-01, 26 IN-02, 29 IN-01 are still true and each has a clean fix. 26 IN-02's duplication was *created* by Phase 34, not resolved by it.
- **Phase 34 polish:** the Restart button's text contrast is 4.81:1 (passes 1.4.3 AA, thin margin) and its border is not a requirement; the real gap is the screen root's focus indicator, because the package's inline-only rule makes a `:focus-visible` rule impossible and the default UA ring on the dock's own dark background is both thin and clipped by the `overflow: auto` body.
- **`useScoped` suppression:** the directive is inert at the base (the repo's oxlint config does not run `react-hooks/exhaustive-deps`) and the file is `packages/devtools/src/react/useScoped.ts:45`; `packages/react/src/useScoped.ts` does not exist.

**Primary recommendation:** write the RED tests first (Q1 `TF9`..`TF11`, Q2 `SUBJ1`..`SUBJ3`), land a type skeleton for `TimelineStatus` so the status tests fail on behaviour not shape, then fix with the token+`onExit` pattern already in `DiagnosticsFeed.ts` and one `Atom.keepAlive`.

## Project Constraints (from AGENTS.md)

- Submodule namespace imports for `effect`; `.ts` extensions on relative imports; `import type` for types. No `as`, `!`, `any`, `switch` (use `Match`), `async/await`, `console` in src, `Effect.fnUntraced` (budgeted). Doc comments lead with a one-line summary and cite no plan or decision ids in new text (house practice cites ADR ids in the *why* paragraph; the executor brief forbids D-NN/36-NN).
- Tests: `@effect/vitest` `it.effect` with `TestClock` for the model; React Testing Library on happy-dom for React. Coverage thresholds are enforced (core 95%, others 90%).
- Barrels: adding a public name is a line in `packages/devtools/src/react/index.ts`, a row in `spec/overview.md` and a line in `packages/devtools/test/surface.test.ts` (and `surface.tst.ts`) [VERIFIED: `packages/devtools/src/react/index.ts:14-16`].
- `eslint-disable` is not part of the house style and nothing runs ESLint here (Q7).
- Packages are versioned in a `fixed` group at `0.11.0`; a Breaking change is recorded as **Breaking** and bumps `minor` [VERIFIED: `.changeset/config.json` `fixed`; `.changeset/dock-diagnostics-feed.md` `"@qadi/devtools": minor` with two **Breaking.** paragraphs].

## Ledger

| item | still true at base? | evidence | root cause | recommended fix | test (RED or green at base) | public surface change |
|---|---|---|---|---|---|---|
| 34 IN-01 TimelineFeed untokened accept | Yes, reachable only re-entrantly | `TimelineFeed.ts:73` (`accept: (record) => inner.accept(record)`), `:82` (`forkRead(runSource(timeline, ...))`), no token; `effect/src/internal/effect.ts:592-613` (`interruptUnsafe` sets `_deferredInterrupt` when `_running`), `:682-684` (checked per primitive op, not inside a JS `for` loop); `TimelineStore.ts:99-101` (the sync backlog loop) | The read's `accept` is the live store's; a replaced read that is mid-sync-loop is not stopped until its next primitive op | Per-start `generation` token, a gated `accept` handed to `runSource`, a finalizer that bumps it on close (the `DiagnosticsFeed.ts:169-181,205-216` pattern) | RED `TF9` (observed `['a1','a2','a3','b']`, expected `['a1','b']`); `TF2`-`TF6` stay green | None (package-private) |
| 34 IN-05 TimelineFeed silent death | Yes | `TimelineFeed.ts:79-83`; `FiberHandle.ts:420-437` (a failed fiber only resolves `self.deferred`, never read); prototype: `die` in `read` and `Stream.die` after a backlog leave no observable | Nothing watches the fiber's exit | `Effect.onExit` + `Cause.hasInterruptsOnly` -> closed `TimelineStatus = Reading \| Stopped { reason }`, a readout on the feed, exposed by `DockModel` and `useTimeline` | RED `TF10`, `TF11` (behaviour-RED once the skeleton lands), green `TF12`-`TF14` (interruption, close and recovery) | `UseTimeline.status` added; new `TimelineStatus` export on `@qadi/devtools/react`; overview row; additive, not Breaking |
| 35 spike: `subject` atom not keepAlive | Yes, wider than recorded | `QadiAtoms.ts:248-250`; `AtomRegistry.ts:497-505` (seed via `initialValues`), `:623-625` and `:635-641` (removal scheduled at node creation), `:811-812` (`canBeRemoved`); `QadiProvider.tsx:216-221,255-259` | The seed node has no reader at the first macrotask, so it is removed and the registry reads `undefined`; the provider only re-writes on a dependency change | `Atom.keepAlive` on `subject` | RED `SUBJ1` (Activity), `SUBJ2` (late gate), `SUBJ3` (later subject change); all three green with the fix (verified on a scratch copy) | None (`Atom.Writable` unchanged); no export change |
| 28 IN-06 StrictMode identity change | Gap exists, behaviour correct | `GateRegistry.test.tsx:489` (mount only), `GateWriter.test.tsx:95-105` (changed atom, no StrictMode), `QadiProvider.sweep.test.tsx` P3 (`instrument` off) | n/a | Add the tests; no src change | Green `GR-S1`, `GR-S2` (prototype passed both strict and non-strict) | None |
| 24 IN-01 recorder built per commit | Yes | `SimulationSession.ts:401` (`build()` -> `prepareSource`), `SimulationSource.ts:237-240` (`capturing(ports)`), `Capture.ts:99-111`; `WhatIf.ts:187` (`causesIO(options?.source ?? fixtures)`, tag-only) | One function serves a description (needs options, refusal, the source's tag) and a run (needs a recorder) | Split: `describeSource` (cheap, no recorder) for `build()`, `prepareSource` (recorder) for `start()` only | No behaviour RED is possible (verified: a counting `Proxy` on `ports` sees 0 reads either way); characterisation green (`SimulationSession.test.ts:1071-1076`) plus a new identity pin (the description's `Live` source holds the host's own ports) | None (`prepareSource` is not exported: `surface.tst.ts:150-151`) |
| 24 IN-03 `Ready` spelled twice | Yes (three spellings) | `SimulationSource.ts:187` (private `type Ready`), `SimulationSession.ts:472` and `:493` (inline `Extract<PreparedSource, { readonly _tag: "Ready" }>`) | `PreparedSource` is an anonymous union, so each use re-derives its arm | Declare `ReadySource` and `RefusedSource` interfaces and `PreparedSource = ReadySource \| RefusedSource`, as `FixtureSource`/`SnapshotSource`/`LiveSource` already are (`:36-58`) | No runtime test; the compiler is the pin (green) | None (package-private) |
| 24 IN-04 either-outcome test | No, already resolved | `SimulationSession.test.ts:978-1005` asserts `assert.strictEqual(after.run._tag, "Idle")` and `assert.isUndefined(after.baseline)`; the only trace of the history is the squash `aab87576` (`git log -S'after.run._tag === "Idle" \|\| after.stale'` is empty) | The review asked to tighten it "when Phase 25 settles the behaviour"; Phase 25 did | None. Optional: add a synchronous `Idle` assertion before the clock moves to state the order | Existing, green | None |
| 25 IN-01 `BaselineCard` blank sentence | Yes | `Simulator.tsx:470-474,483-486` (`reading?.matches`, `{reading?.sentence}`); `SimulationSession.ts:181-183,444` (two independent fields); `Replay.ts:106-114` | `baseline` and `baselineReading` are two fields whose agreement is a comment | Fold the reading into `Checked`: `Checked { ..., reading: BaselineReading }`, delete `SimulationSnapshot.baselineReading`; the card reads `baseline.reading.sentence` | Green characterisation moves (`SimulationSession.test.ts:737-741`); add a `.tst.ts` pin | **Breaking** (`SimulationSnapshot.baselineReading` removed; `Baseline` is exported, `index.ts:83`); overview and ADR-QD-047 line `:335` name it |
| 26 IN-02 dock `nothing` source | Yes; Phase 34 added the second copy | `DevtoolsDock.tsx:44` (`const nothing`), `:130` (`source = nothing`); `TimelineFeed.ts:35` (`NO_SOURCE`, added in `add1d189`, 2026-11-12); `DevtoolsDock.tsx:40-43` comment names `useTimeline`, which the dock no longer uses | Two empty-source defaults; the model already owns the empty case | Delete `nothing` and its comment; `useDockModel`'s `source` becomes optional; the dock passes `source` through | Green: `DevtoolsDock.test.tsx:77` ("mounted with no source renders an empty dock"); add a model pin that a feed with no source reads once | None (the model input is already `source?: Source \| undefined`, `DockModel.ts:36-37`) |
| 29 IN-01 `DENY_WITHHELD` restates fields | Yes | `HydrationEngine.ts:92,98` | Comment says "plus", tuple re-lists | `const DENY_WITHHELD = [...ALLOW_WITHHELD, "obligations", "reason"] as const;` (typechecked clean on a scratch copy under `tsconfig.react-base.json`) | Green: the round-trip tests in `HydrationPayload.test.ts` | None |
| 34 polish: root focus ring | Yes | `DiagnosticsNotice.tsx:60-71` (`tabIndex: -1`, `style: { padding: 12 }`, no outline); `theme.ts:1-14` (inline styles only, no stylesheet); `DiagnosticsNotice.test.tsx:152-165` (N10 pins `style` equal `{ padding: 12 }`) | An inline style cannot express `:focus-visible`; the UA ring on the author-painted dark surface is thin and clipped at the `overflow: auto` body | `onFocus`/`onBlur` on the root set `style.outline` to `2px solid colors.accent` with `outlineOffset: -2` when `matches(":focus-visible")` | Green DOM test (happy-dom returns `true` for `:focus-visible` after `focus()`, verified) plus a token-level contrast test | None |
| 34 polish: restart button contrast | Measured: passes | Text 4.81:1, border 1.11:1 (arithmetic below) | n/a | Optional hardening: `color: colors.text`, `borderColor: colors.error` (12.10:1 and 6.57:1) | Token-level test (green) | None |
| `useScoped.ts:45` suppression | Inert | `packages/devtools/src/react/useScoped.ts:45`; `.oxlintrc.json` has no react plugin; no ESLint dependency | Directive for a rule that nothing runs | Remove the directive line, keep the explanatory comment | None; `pnpm lint` stays green | None |

## Q1. TimelineFeed: the untokened accept (34 IN-01) and silent death (IN-05)

### What the base does

`makeTimelineFeed` builds one `FiberHandle` and forks `runSource(timeline, source ?? NO_SOURCE)` into it (`TimelineFeed.ts:79-83`). `timeline.accept` is a pass-through to whatever `inner` currently is (`:73`), so a read that outlives its replacement writes into the **new** `inner` after a capacity change as well. There is no token, no `onExit`, and no status.

`DiagnosticsFeed.ts` is the pattern to mirror: `generation` and `closed` (`:169-173`), a finalizer added **after** the handle so it runs first on close (`:176-181`), a `marking` store whose `accept` returns when `mine !== generation` (`:205-216`), and `Effect.onExit` that publishes `Stopped` only when `mine === generation && Exit.isFailure(exit) && !Cause.hasInterruptsOnly(exit.cause)` (`:219-225`).

### When can a late accept happen? (measured, not assumed)

Four scenarios, run against the base on `it.effect` with `TestClock`:

| Scenario | Result at base |
|---|---|
| A. A timeline listener calls `feed.configure({ source: b })` on the first notification of read `a`'s backlog (both sources start with `Effect.yieldNow`, so `a` is installed in the handle first) | **Late write**: `['a1','a2','a3','b']` |
| B. A live-stream read replaced while suspended, then a record offered to the old queue | No write (`[]`) |
| C. An uninterruptible `read` that finishes after the replacement | No write (`['new']`) |
| D. `read` is `Effect.die(new Error("boom"))`; E. live stream is `Stream.die(...)` after a one-record backlog | Silent: `D []`, `E ['x']`, no status, no log, no signal |

Root cause for A [VERIFIED: `effect/src/internal/effect.ts:592-613`]: `interruptUnsafe` evaluates the interruption at once only when the fiber is not `_running`; a running fiber gets `_deferredInterrupt = true`, which `runLoop` reads at the top of each primitive op (`:682-684`). `FiberHandle.setUnsafe` installs the replacement then calls `previous?.interruptUnsafe(...)` (`FiberHandle.ts:416-419`). The backlog loop `for (const record of backlog) store.accept(record)` (`TimelineStore.ts:99-101`) is plain JavaScript inside one `Effect.gen` step, so the re-entrant interrupt lands only after the loop. This is the same ordering fact 34's review recorded for the diagnostics guard ("unreachable on effect 4.1.2", `34-REVIEW-FIX.md:82-85`), and it explains why that guard is unreachable (a poll accepts once per op) while the timeline's loop is not.

How likely is it in production? A host must change `configure` synchronously from inside a timeline subscriber. The dock does not (`DockModel.ts:106-110` only calls `spread()`); React listeners schedule a render. So it is latent for the dock and real for any non-React host of `makeTimelineFeed`/`makeDockModel`, and the token is what the diagnostics feed already pays for the same property. Recommend fixing it, since the user asked for the cleanest and most complete design.

### Recommended design (prototyped green on a scratch copy, then deleted)

```ts
// Source: modelled on packages/devtools/src/model/DiagnosticsFeed.ts:49-63, 169-181, 205-225
export type TimelineStatus = Data.TaggedEnum<{
  /** The read has not failed: it is running, has ended by itself, or there was nothing to read. */
  Reading: {};
  /** The read ended on a defect. `reason` is `Cause.pretty` of it; the entries it delivered stay. */
  Stopped: { readonly reason: string };
}>;
export const TimelineStatus = Data.taggedEnum<TimelineStatus>();
const READING: TimelineStatus = TimelineStatus.Reading(); // one value, so `set` drops a repeat

// inside makeTimelineFeed, after `FiberHandle.make`:
let generation = 0;
let closed = false;
yield* Effect.addFinalizer(() => Effect.sync(() => { generation += 1; closed = true; }));
const status = makeExternalStore<TimelineStatus>(READING);

const readSource = (source: Source | undefined) => {
  if (closed) return;
  generation += 1;
  const mine = generation;
  status.set(READING);
  const marking = { accept: (record: StoredRecord) => { if (mine === generation) timeline.accept(record); } };
  forkRead(
    runSource(marking, source ?? NO_SOURCE).pipe(
      Effect.onExit((exit) =>
        Effect.sync(() => {
          if (mine === generation && Exit.isFailure(exit) && !Cause.hasInterruptsOnly(exit.cause)) {
            status.set(TimelineStatus.Stopped({ reason: Cause.pretty(exit.cause) }));
          }
        }),
      ),
    ),
  );
};
```

`runSource` needs a narrower parameter type: `store: Pick<TimelineStore, "accept">` (it calls only `store.accept`, `TimelineStore.ts:100,102`), so `marking` is not a faked full store. The existing `TimelineStore.test.ts` call sites still type-check.

**Closed status: smaller, not `DiagnosticsStatus`'s shape.** `Off`, `Starting`, `Live` and `Stopped.sampled` exist for `isUnsampled` and the first-sample gate (`DiagnosticsFeed.ts:113-126`); a timeline has no sampled/unsampled distinction and its entries are already visible in the store, so `Reading | Stopped { reason }` is the complete set. No `restart` command: a stop is recovered by configuring a new source (held by identity) or a new capacity, which starts a fresh run and returns the status to `Reading` (prototype `TF11`). A `restart` would be a command with no caller.

**Interruption is not a stop** (prototype `TF12`): replacing the source, `configure({})`, and closing the scope never publish `Stopped`, including when a replaced read's release dies, because the finalizer bumps `generation` first (the `DiagnosticsFeed` WR-01 fix).

### Where it surfaces (decision needed; recommendation is tier 1 + 2)

1. **Model + hook (required):** `TimelineFeed.status: { subscribe, getSnapshot }`; `idleTimelineStatus` constant for the pass before the feed exists (as `idleTimeline`, `TimelineFeed.ts:48-55`); `useTimeline` returns `status` read through `useStoreSnapshot(feed?.status ?? idleTimelineStatus)` (`useTimeline.ts:54-67`).
2. **Dock (recommended):** `DockModel` re-exposes `timelineStatus` (no merge; the diagnostics store is the one merged store) and `DevtoolsDock` states a stop on the Log screen, reusing `DiagnosticsNotice.tsx`'s alert-once and polite-region conventions in a small `TimelineNotice` (UI-SPEC needed). Without this the dock, the main consumer, still dies silently. It makes the model's readouts eight, so BEH-QD-465 ("seven stores", `28-devtools-screens.md:835-872`) and the ADR-QD-047 amendment text are restated. Say so in CCR-QD-427.
3. **Fallback (if the user wants no UI):** the "stated, tested rule" the context allows: report the defect once through `Effect.logError` annotated with `qadi.reason`, the precedent being `Source.ts:281-292` (`malformed` -> `Effect.logWarning` + `annotateLogs`), and state that the timeline keeps what it delivered. Smaller, but invisible in the UI.

### Public surface

| What | Change |
|---|---|
| `UseTimeline` (`useTimeline.ts:24-31`) | adds `readonly status: TimelineStatus` (additive) |
| `@qadi/devtools/react` barrel | adds `TimelineStatus` (value + type), like `DiagnosticsStatus` (`index.ts:15-16`) |
| `spec/overview.md` | one row beside `:904` (`useTimeline`) and a Change History line; `surface.test.ts` and `surface.tst.ts` each gain a line |
| `@qadi/devtools` (model barrel) | none: `TimelineFeed` is package-private (header, `TimelineFeed.ts:10`) |

Additive, so patch or minor under the repo's 0.x convention; if `useTimeline`'s *behaviour* when the source dies is considered changed, it is still not Breaking. No upgrading.md entry is needed unless the dock notice changes what a consumer must do (it does not).

### RED tests (add to `packages/devtools/test/model/TimelineFeed.test.ts`, after `TF8`)

Harness: `it.effect`, the file's own `flush` (`Effect.andThen(Effect.yieldNow, TestClock.adjust("10 millis"))`), `record`, `idsOf`, and `settleTurns` from `../helpers.ts:175` (needed after `Scope.close` so the replaced fibers' async finalizers run, as `DiagnosticsFeed.test.ts` F24 does).

```ts
/** A source whose read starts after one turn, so the fiber is installed in the handle before its backlog runs. */
const delayed = (backlog: ReadonlyArray<StoredRecord>): Source => ({
  read: Effect.as(Effect.yieldNow, { backlog, live: Stream.empty }),
});

it.effect("TF9 a read replaced while it is delivering its backlog writes nothing more", () =>
  Effect.gen(function* () {
    const feed = yield* makeTimelineFeed();
    let swapped = false;
    feed.timeline.subscribe(() => {
      if (swapped) return;
      swapped = true;
      feed.configure({ source: delayed([record("b", 1000)]) });
    });
    feed.configure({ source: delayed([record("a1", 100), record("a2", 200), record("a3", 300)]) });
    yield* flush;
    assert.deepStrictEqual(idsOf(feed), ["a1", "b"]);
  }));
```

| Test | Asserts | At the base |
|---|---|---|
| TF9 (above) | `['a1','b']`; a1 landed before the swap, a2/a3 never | **RED**, observed `['a1','a2','a3','b']`; types check at the base (existing API only) |
| TF10 a `read` that dies is `Stopped` with its reason, at once | after `makeTimelineFeed({ source: { read: Effect.die(new Error("boom")) } })`, `status.getSnapshot()` is `Stopped` and `reason` includes `boom` | RED (no `status`) |
| TF11 a live stream that dies after a backlog is `Stopped`, keeps the entries, and a new source returns to `Reading` and fills | `Stream.die(new Error("live boom"))` after `backlog: [x]`; `idsOf` is `['x']`; `configure({ source: delayed([y]) })` -> `Reading`, ids `['x','y']` | RED |
| TF12 replacing the source, `configure({})`, and closing the scope publish no `Stopped`, even when a replaced read's release dies | `status.subscribe` records nothing; ends `Reading` (mirror `DiagnosticsFeed.test.ts` F8/F17/F24) | green once `status` exists (prototype passed) |
| TF13 an end by itself is not a stop | `sourceFromRecords([...])` ends; status stays `Reading` | green |
| TF14 a capacity change while `Stopped` starts a new run and returns to `Reading` | `configure({ source, capacity: 2 })` | green |

Plus: `DockModel.test.ts` (`M`-series, near `M15`): `model.timelineStatus` follows the feed under `configure`; `useTimeline.test.tsx`: a dying source shows `Stopped` through the hook, and the idle first pass is `Reading`.

**RED-commit note (D-09):** TF10, TF11, and the hook/model tests reference a member that does not exist, so they fail on shape and `pnpm typecheck` is red between the RED and the fix. To make them fail on *behaviour*, land first a skeleton commit that adds `TimelineStatus`, `READING`, and a `status` that never leaves `Reading`; then TF10/TF11 fail with `expected Stopped, got Reading`. TF9 needs no skeleton.

## Q2. The `subject` atom is not keepAlive

### Reproduction at the base (run, actual output)

Prototype file (scratch, deleted) in `packages/react/test`, harness from `QadiProvider.sweep.test.tsx` (`render`, `Activity`, `settle` from `./support/settle.ts`). The provider is **outside** the Activity; the gate has `pending="pending"` so the stuck state is visible:

```
× S1 provider OUTSIDE a hidden-then-shown Activity
  Unable to find an element with the text: allowed ...   <body><div>pending</div></body>
× S2 provider with no gate for a macrotask, then a gate mounts (no Activity)
  Unable to find an element with the text: allowed ...   <body><div>pending</div></body>
× SUBJ3 a later subject change while no gate is mounted reaches the next gate   (same shape)
Test Files 1 failed (1)  Tests 2 failed (2)
```

On a scratch copy of `packages/react/src` with `Atom.keepAlive` added to the `subject` pipe, all three pass (`Tests 2 passed (2)`, `Tests 1 failed | 1 passed (2)` for the baseline-vs-fixed pair of SUBJ3). The copy was deleted; `git status --porcelain` shows only the two pre-existing `.planning` entries.

### Root cause

- `AtomRegistry.make({ initialValues })` calls `ensureNode(target).setInitialValue(...)` for each seed (`AtomRegistry.ts:497-505`); `QadiProvider.tsx:216-221` seeds `[atoms.subject, subject]`.
- `createNode` schedules removal at creation for any atom that is not keepAlive (`:623-625`, `scheduleAtomRemoval` `:635-641`, a macrotask-0 task), and removes the node when `canBeRemoved` (`:811-812`: `!keepAlive && no listeners && no children && state !== 0`).
- Nothing subscribes to `subject` except decision atoms (children, via `get(subject)`, `QadiAtoms.ts:270`) and `useSubject`. So any time with no mounted gate at the first macrotask, or while every gate is unmounted, the node goes and the registry reads `undefined`.
- The provider does not repair it: its effect writes only when `registry.get(atoms.subject) !== subject` **and** its dependency list `[registry, atoms, subject]` changes (`QadiProvider.tsx:255-259`); a hidden-then-shown Activity below the provider changes none of them.
- `Effect.never` for `undefined` (`QadiAtoms.ts:270-275`) turns the lost value into `Initial` forever, which is the symptom.

`useSubject()` in a mounted component keeps the node alive and masks the defect, which is why `edges.test.tsx` "survives a StrictMode double mount" (`:243-255`) never sees it. And the existing Activity pin `P4` puts the provider **inside** the Activity (a full unmount and registry dispose), which is why Phase 35's tests were green.

### Is `Atom.keepAlive` the right fix? Yes

`keepAlive` returns a copy with `keepAlive: true` (`Atom.ts:1747-1751`); `canBeRemoved` and `atomHasTtl` (`AtomRegistry.ts:582`) both honour it, and `createNode` then does not schedule a removal. Per registry, the node lives until `registry.dispose()`, which the provider already runs on unmount (`QadiProvider.tsx:279-292`) and `reset()` clears every node.

| Alternative | Verdict |
|---|---|
| Provider holds `registry.mount(atoms.subject)` in an effect | Rejected: an effect can lag the first macrotask or never run for a discarded render (the registry is created in render, `:215-221`), needs StrictMode cleanup handling, and is a hidden subscription where `keepAlive` is a declaration |
| Subject outside the atom graph | Rejected: the decision atoms read it reactively, so it is the graph's input; a larger redesign for no gain |
| `setIdleTTL` (`Atom.ts:229`) | Rejected: a finite TTL is a timer that still loses the value; infinite TTL is `keepAlive` |

Fix: `Atom.make<AuthSubject | undefined>(undefined).pipe(Atom.withEquality(subjectsEqual), Atom.keepAlive)` at `QadiAtoms.ts:248-250`. `keepAlive` after `withEquality`: both are copying combinators, equality is preserved (the scratch run passed the copy through the same equality path; also run `QadiAtoms.test.ts` and `QadiProvider.test.tsx` after the real change, since I could not run the full suite against the copy).

### Interplay with Phase 35 and the other atoms

- **Sweep, GC, bound:** none. The sweep acts on the question book and `asked()` (`QuestionBook.ts`, `SweepScheduler.ts`); the subject node is one extra node per registry and is not in the book. `maxTrackedQuestions` is unchanged.
- **`runtime` (`Atom.runtime(layer)`, `QadiAtoms.ts:247`):** not keepAlive (`Atom.ts:905`, `self.keepAlive = false`) but its `layerAtom` is (`:910`). Its built services are released when every reader leaves and rebuilt on the next read; that rebuilds and resolves (SUBJ1 passes with the fix), it does not stick. Observation only: a stateful service built in the application layer (a decision cache) is rebuilt after a full unmount. `v4-reactivity-smoke.test.ts:452-458` and `DevtoolsFeed.test.tsx:335-340` pin that a runtime is held and released by mount and unmount, so it is by design.
- **`decisions` family, `decision`:** derived and keyed in the book; no state to lose.
- **Seed atoms (`HydrationEngine.ts:694`, `Atom.make(undefined)`, written via `initialValues` from `hydrate`): same gap, RED reproduced.** `subject={undefined}` plus a hydrated deny, gate mounted after one macrotask: renders `pending`, not the seeded denial (`expected 'pending' to be 'denied'`). **Do not `keepAlive` them.** Seeds are one-shot by design (INV-QD-028: spent after the client's first answer, `HydrationEngine.ts` header and `state.observedSeed` at `:706-742` already treat a dropped seed as expected), and a keepAlive seed node per hydrated question would outlive the question book's eviction. The consequence is only the first frame (client computes instead), never a stale or wrong decision. Record it as a known limit; promote to an open question if the user wants hydrated seeds to survive a late mount (it would need a design, not a flag).
- **`gates` registry:** not an atom; no gap.

### Tests and spec

- New file `packages/react/test/QadiProvider.subject.test.tsx`: `SUBJ1` Activity, `SUBJ2` late gate, `SUBJ3` later subject change (all RED at the base, bodies as in the prototype, rendering `<Can policy={canRead} pending="pending">allowed</Can>` and asserting `screen.getByText("allowed")` after `settle()` plus a real 50 ms turn, because the registry's removal task is a real macrotask, not a `TestClock` event). Use the Activity harness shape of `P4` with the provider outside.
- A canary line in `v4-reactivity-smoke.test.ts`: a seeded non-keepAlive node is removed after a tick and a keepAlive one is not (guards an Effect bump, the file's stated purpose).
- No existing pin changes (`QadiAtoms.test.ts:490,511` and `v4-reactivity-smoke.test.ts:452-531` are about decision and runtime nodes).
- Spec: state it. Suggest `BEH-QD-516` in `spec/behaviors/09-react.md` beside BEH-QD-067's two subject requirements (`:267-283`): "the subject, once seeded or written, MUST stay in the registry for the provider's lifetime, whatever gates are mounted", and add one clause to BEH-QD-067's "later subject change" requirement; no ADR (D-12 not triggered). Reserved ranges are 516-520 (BEH) and 317-318 (INV) [VERIFIED: `qadi-reserved-ids.json` BEH 520, INV 318].
- Public surface: none. `@qadi/react` patch changeset.

## Q3. 28 IN-06: an identity-changing rerender under StrictMode

### Existing lifecycle tests

| Test | What it covers | StrictMode? |
|---|---|---|
| `GateRegistry.test.tsx:489` "StrictMode registers once" | mount and unmount, `instrument` on | Yes, no rerender |
| `GateWriter.test.tsx:56-130` | `useGateRegistrations` driven by `renderHook`: register, state update in place, equal-but-fresh policy no re-register, **different atom re-registers (`afterMount + 2`)**, writer undefined, unmount | No |
| `GateWriter.reconcile.test.ts`, `GateWriter.kinds.test.tsx`, `GateWriter.useGates.test.tsx` | pure reconcile; one-registration-per-kind; grouped re-register | No |
| `QadiProvider.sweep.test.tsx` P3 | the bound under StrictMode | Yes, but `instrument` is **off**, so it does not touch registration |
| `edges.test.tsx:243` | provider survives a StrictMode double mount | Yes, uninstrumented |

So the gap is exactly the narrowed one: an *instrumented* gate whose policy or resource identity changes across a rerender under StrictMode.

### Prototype (run at the base, deleted)

Hook level (`renderHook` with `wrapper: StrictMode`, a changed `atom` and policy) and provider level (`<StrictMode><QadiProvider instrument><Can policy={canRead}/>` rerendered with `canWrite`), each with and without StrictMode:

```
hook strict false  mount notifs 1  rerender notifs 2  [['g1', true]]
hook strict true   mount notifs 3  rerender notifs 2  [['g1', true]]
provider strict false  rerender notifs 2  [[true,'Denied',true]]
provider strict true   rerender notifs 2  [[true,'Denied',true]]
Tests 4 passed (4)
```

**No defect.** Under StrictMode the mount is register, unregister, register (3 notifications, matching the double effect), and an identity-changing rerender is exactly unregister then register (2), identical to non-strict; the registry ends with one entry carrying the new policy, the same React `id`, the marker element still present, and unmount leaves zero. This matches `reconcile`'s contract (`GateWriter.ts:196-240`) and the reviewer's probe.

### Tests to add (green characterisation; no fix)

- `GateRegistry.test.tsx`, beside `:489`, `GR-S1`: StrictMode + `instrument`, rerender `policy` from `canRead` to `canWrite` -> `instances()` length 1, `.policy === canWrite`, `.id` equal to the id before, `.element` defined, notifications since mount `=== 2`, the same notification count as the non-strict run in the same test, unmount -> 0.
- Same file, `GR-S2`: the same for a changed `resource` (`<Can policy resource={...}>`), which changes the decision atom as well.
- `GateWriter.test.tsx`, `GW-S1`: `renderHook` with `wrapper: StrictMode` for the "different atom re-registers" case: final registry has one entry; `subscribe` saw `mount + 2`.

## Q4. 24 IN-01, 24 IN-03, 24 IN-04

### IN-01: a recorder built and dropped per commit

Confirmed. `build()` runs on every `commit()` (`SimulationSession.ts:399-446,451-453`) and calls `prepareSource(sourceChoice, { ports, capture })` (`:401`), which for a chosen `Live` runs `ready()` -> `capturing(ports)` (`SimulationSource.ts:237-240`): five fresh maps and a `decoratePorts` layer (`Capture.ts:99-111`). Of the result `build()` uses `options`, the refusal, and `prepared.source` only for `sweepPlan`'s `causesIO`, which is `causesIO(options?.source ?? fixtures)` (`WhatIf.ts:187`), a tag-only `Match` (`SimulationSource.ts:79-86`). The recorder is discarded. Only `start()` (`:533`) needs a recorder, and it is per run on purpose (`SimulationSource.ts:265-269`: "a run never reuses a preparation").

Not a defect and not observable: the layer is lazy, nothing runs. I measured it: a `Proxy` on the `ports` layer counting any property read sees **0 reads** for five Live commits and 0 for a `prepareSource` call. So no behavioural RED exists and a module mock is not wanted; do not invent one.

**Fix (cleanest; no public change):**

```ts
// SimulationSource.ts: a description needs no recorder
export interface SourceDescription {
  readonly options: ReadonlyArray<SourceOption>;
  readonly refusal: SourceRefusal | undefined;
  /** The chosen source as the host gave it (Live: its own ports, unwrapped); absent when refused. Enough for `causesIO`. */
  readonly source: SimulationSource | undefined;
}
export const describeSource = (choice: SourceChoice, have: SourceHave): SourceDescription => { /* rowsOf rows gain `source` */ };
export const prepareSource = (choice: SourceChoice, have: SourceHave): PreparedSource => { /* only here: capturing(ports) */ };
```

`rowsOf`'s usable rows carry a plain `source` (`fixtures`, `snapshot(capture)`, `live(ports)`) and a `prepare` that, for `Live` only, wraps `ports` in `capturing`. `build()` calls `describeSource`; `start()` calls `prepareSource`. `SourcePreparation` is replaced by the two shapes; `SimulationSource.prepare.test.ts` (which destructures `{ options, prepared }`, `:44,95-96`) is rewritten, test churn not being a reason.

**Tests:**
- Green characterisation first, at the base: `SimulationSession.test.ts:1071-1076` (`plan.causesIO` per source) and `:686` (`cost.warns`) already pin that `build()` still plans correctly; add `refusal` and `options` per choice through the session if not already covered.
- New, in `SimulationSource.prepare.test.ts`: `describeSource("Live", { ports: realPorts, capture: undefined }).source` is a `Live` source whose `ports === realPorts` (observable identity; a recorder would be a different layer), and `prepareSource("Live", ...)`'s source's `ports !== realPorts`. At the base this fails on a missing export (RED by absence, not a defect); the existing test "each preparation records alone" (`:93-103`) keeps pinning `prepareSource`.

### IN-03: `Ready` spelled twice

Concretely **three** spellings of one type: a private alias `type Ready = Extract<PreparedSource, { readonly _tag: "Ready" }>` at `SimulationSource.ts:187` (used only by `SourceRow.ready`, `:191`), and the same `Extract<...>` written inline in `program` (`SimulationSession.ts:472`) and in `land` (`:493`). One source of truth: declare the arms as interfaces, as the file already does for the sources (`FixtureSource`, `SnapshotSource`, `LiveSource`, `:36-58`):

```ts
export interface ReadySource {
  readonly _tag: "Ready";
  readonly source: SimulationSource;
  readonly captured: Effect.Effect<CapturedAnswers> | undefined;
}
export interface RefusedSource {
  readonly _tag: "Refused";
  readonly refusal: SourceRefusal;
}
export type PreparedSource = ReadySource | RefusedSource;
```

`SourceRow.ready: () => ReadySource` and `program`/`land` take `ReadySource`. No `Extract` remains. Not exported from `index.ts` (`:112` lists only `SourceChoice, SourceOption, SourceRefusal`). No runtime test; `tsc` is the pin.

### IN-04: the either-outcome test

Already resolved. `SimulationSession.test.ts:978-1005` ("never shows a result as answering a row replayed while that run was starting") asserts `assert.strictEqual(after.run._tag, "Idle")` and `assert.isUndefined(after.baseline)` after `TestClock.adjust("1 second")`, with the comment "The replay superseded the run while it was in flight, so it never lands". The only possible outcome is `Idle`: `replay` -> `reseed` calls `supersede()`, which bumps `generation` and replaces the fiber synchronously (`SimulationSession.ts:456-470`), and `land` returns when `mine !== generation` (`:497-499`). The disjunction the review quoted (`after.run._tag === "Idle" || after.stale`) is gone, in the v1.2 squash (`aab87576`; per-phase history is not recoverable, and `git log -S` on the disjunction is empty). Disposition: resolved, cite `SimulationSession.test.ts:978-1005`; the file runs green at the base (120 tests across the three devtools files I ran). Optional: assert `Idle` synchronously right after `session.replay(orphan)`, before the clock moves, so the test no longer depends on the 1 s versus 100 ms interleaving the review flagged.

## Q5. 25 IN-01, 26 IN-02, 29 IN-01

### 25 IN-01: `BaselineCard` blank sentence

Still true. `BaselineCard` takes `reading: BaselineReading | undefined` and renders `{reading?.sentence}` and `reading?.matches === true` for a `Checked` baseline (`Simulator.tsx:470-486`). The snapshot carries `baseline` and `baselineReading` as two fields tied by a comment, "present exactly when `baseline` is `Checked`" (`SimulationSession.ts:181-183`), computed at `:444`. This is the two-field disagreement `DiagnosticsFeed.ts:43-48` already named as what a closed union rules out.

**Fix:** make the invariant a type. `Replay.ts:106-114` `Checked` gains `readonly reading: BaselineReading`, built where it is built (`baselineDiff`, `:126-137`, using `readBaseline` `:215-221`, which becomes the internal builder); `SimulationSnapshot.baselineReading` is deleted (`:183,444`); `BaselineCard` takes `baseline` only and reads `baseline.reading.sentence`/`.matches` with no optional chaining. A caveat: `baselineDiff` is tested with `deepStrictEqual` shapes in `Replay.test.ts`, which move with it.

**Public surface (Breaking):** `SimulationSnapshot` loses `baselineReading`; `Baseline` and `BaselineReading` are exported (`index.ts:83-85`) and `Baseline.Checked` gains a field. A consumer reading `snapshot.baselineReading` breaks; the spec names it in ADR-QD-047 `:335`. Record **Breaking** in the changeset and an upgrading.md section. Alternative if the user does not want a break: keep both fields and have `Simulator` pass them through a guard, which restates the invariant in the view and leaves the type honest only by comment; I recommend the break (the context's standing direction).

**Test:** green characterisation first (`SimulationSession.test.ts:737-741`, the describe "baselineReading is whether the reconstruction reproduces the replayed row, in one line"); move its assertions to `baseline.reading`. Add a `.tst.ts` pin that `Extract<Baseline, { _tag: "Checked" }>["reading"]` is `BaselineReading` (and that `SimulationSnapshot` has no `baselineReading` key), plus the existing DOM test for the baseline card.

### 26 IN-02: the dock's `nothing`

Still true, and Phase 34 made it worse, not better: `DevtoolsDock.tsx:44` (`const nothing: Source = sourceFromRecords([])`) and `:130` (`source = nothing`) now duplicate `TimelineFeed.ts:35` (`NO_SOURCE`), which commit `add1d189` (2026-11-12, "useTimeline reads through a scoped timeline feed") introduced; the dock's `nothing` is from `eabfb781` (2026-08-24). The comment above it (`:40-43`) says "`useTimeline` holds its source by identity", which describes a hook the dock stopped using; the model is what holds it now (`DockModel.ts:75`, `makeTimelineFeed({ capacity, source })`), and its input is already optional (`DockModelInputs.source?: Source | undefined`, `:36-37`).

**Fix:** delete `nothing` and its comment, drop the default, make `UseDockModelInput.source` optional (`useDockModel.ts:29-36`), and pass `source` through. Behaviour is identical: `readSource(undefined)` reads `NO_SOURCE`, a stable identity, so no re-subscription per render. `sourceFromRecords` and `Source` imports in the dock go if unused.

**Test:** green characterisation `DevtoolsDock.test.tsx:77` ("mounted with no source renders an empty dock rather than throwing"); add a model pin (`DockModel.test.ts`) that `makeDockModel()` with no source, configured repeatedly with `{}`, reads once (no `started` increment), the `TF2` shape with a counting source on the second configure.

### 29 IN-01: `DENY_WITHHELD`

Still true: `HydrationEngine.ts:92` `ALLOW_WITHHELD = ["subjectId", "trace"]`, `:98` `DENY_WITHHELD = ["subjectId", "trace", "obligations", "reason"]` with a comment saying it withholds "what an allow does, plus" two fields. **Fix:** `const DENY_WITHHELD = [...ALLOW_WITHHELD, "obligations", "reason"] as const;` (a spread inside `as const` keeps the literal tuple; `as const` is already used at `:92`). Typechecked clean on a scratch copy compiled with `tsconfig.react-base.json` (no diagnostics). `Struct.omit(fields, DENY_WITHHELD)` (`:114`) and `:292` are unchanged. **Test:** green, the existing dehydrate/hydrate round trips for both an allow and a deny entry (`HydrationPayload.test.ts`); no new test, the constant is not exported.

## Q6. Phase 34 polish: the focus ring and the restart contrast

### Where the styles live

All dock styling is inline objects in `packages/devtools/src/react/theme.ts`, deliberately: "Inline styles, and no stylesheet of any kind", no `<style>` at import time because the package is `sideEffects: false` (`theme.ts:1-14`). Consequence: **there is no way to write `:focus-visible` in this package.** The screen root is `diagnosticsRootProps(status)` (`DiagnosticsNotice.tsx:67-71`): `tabIndex: -1`, `style: { padding: 12 }`, no outline, used by `ServicesPanel.tsx:122` and `QuestionsPanel.tsx:102`. After Restart the handler focuses it (`:110-114`). 34-UI-SPEC says the dock "has no focus token of its own" and every button uses the browser default (`34-UI-SPEC.md:156-159`).

Tokens used (dark only; `colors` in `theme.ts:21-39`): `surface #14161a`, `surfaceRaised #1c1f26`, `border #2a2f39`, `text #e6e8ec`, `textMuted #8b93a3`, `accent #4ea1ff`, `error #e3a008`. The Restart button is `{ ...button(false), marginTop: 8 }` (`DiagnosticsNotice.tsx:153`): transparent background, `color: textMuted`, `border: 1px solid border`, font 11 px non-bold (`theme.ts:98-108`). The Stopped notice's background is `withAlpha(colors.error, 0.12)` = `rgba(227,160,8,0.12)` over the dock's `surface` (`DiagnosticsNotice.tsx:81-87`; `dock` has `background: surface`, `theme.ts:68-79`; the screen root and `body` set no background).

### Arithmetic

Relative luminance L = 0.2126 R + 0.7152 G + 0.0722 B with each channel c in [0,1] linearised as `c/12.92` if `c <= 0.03928`, else `((c + 0.055)/1.055)^2.4`; ratio = (Lhi + 0.05)/(Llo + 0.05).

- Notice background N: `0.12 * (227,160,8) + 0.88 * (20,22,26)` = (27.24+17.6, 19.2+19.36, 0.96+22.88) = (44.84, 38.56, 23.84), rounded to 8 bit (45, 39, 24) = `#2d2718`; L(N) = 0.02075.
- `textMuted #8b93a3` (139,147,163): linear (0.25818, 0.29177, 0.36625), L = 0.29001. Restart text on N: (0.29001 + 0.05)/(0.02075 + 0.05) = 0.34001/0.07075 = **4.81:1**.
- `text #e6e8ec` L = 0.80592 on N: 0.85592/0.07075 = **12.10:1** (matches the 12.10 in `34-VERIFICATION.md:123`).
- `error #e3a008` L = 0.41490 on N: 0.46490/0.07075 = **6.57:1** (matches 6.57 there).
- `border #2a2f39` L = 0.02821 on N: 0.07821/0.07075 = **1.11:1**.
- `accent #4ea1ff` L = 0.34329 on `surface` (L 0.00797): 0.39329/0.05797 = **6.78:1**; on N: 0.39329/0.07075 = **5.56:1**.
- Chromium's default ring is a dark ring with a white halo; a dark `#101010` ring on `surface` is 1.05:1 (an invisible half) and the white halo is 18.11:1 [ASSUMED: the Chromium ring colours are from training knowledge; UA rings are not measurable in happy-dom or by a unit test and differ per browser].

### Criteria

| Criterion | Level | Verdict for this dock |
|---|---|---|
| 1.4.3 Contrast (Minimum) | AA, 4.5:1 for 11 px non-bold text (large text is 18 pt or 14 pt bold) [CITED: w3.org/WAI/WCAG22/Understanding/contrast-minimum.html] | Restart text 4.81:1 **passes**, with 0.31 margin; the Stopped lead 6.57 and body 12.10 pass |
| 1.4.11 Non-text Contrast | AA, 3:1 against adjacent colours [CITED: .../non-text-contrast.html] | The button border (1.11:1) is **not required**: "if a control has visible content (such as text ...) ... a border or other indication of the overall boundary ... is not required". The focus indicator is covered here (see next row) |
| 2.4.7 Focus Visible | AA: a visible keyboard focus indicator exists; it sets no size or contrast of its own and defers contrast to 1.4.11 and size to 2.4.13 [CITED: .../focus-visible.html] | The root needs one that is actually visible on the dark surface; the default ring on an author-painted background is the weak point |
| 1.4.11 on the default ring | "the default focus style is exempt from contrast requirements (but must still be visible)" when the author does not adjust it [CITED: .../non-text-contrast.html] | The dock **does** paint its own background behind the default indicator, which the sister criterion 2.4.13 treats as cancelling the exemption ("the indicator and the indicator's background color are not modified by the author") [CITED: .../focus-appearance.html]; the safe reading is that the ring must be author-controlled |
| 2.4.11 Focus Not Obscured (Minimum) | AA: a focused component is not *entirely* hidden by author-created content [CITED: .../focus-not-obscured-minimum.html] | Inside the dock nothing overlays the focused root (the toolbar is a flex sibling). The dock itself is a fixed 45vh overlay that can cover *host* content; that is the host's concern for a development tool, not a Phase 36 defect. Not applicable to the fix |
| 2.4.13 Focus Appearance | **AAA** (not required at AA): a 2 CSS px thick perimeter and 3:1 between the focused and unfocused pixels [CITED: .../focus-appearance.html] | Adopt it anyway, free: a 2 px `accent` ring against `surface` is 6.78:1 |

### Recommendation (existing tokens only)

1. **Focus ring:** `diagnosticsRootProps` gains `onFocus` and `onBlur` that set the root's `style.outline` to `` `2px solid ${colors.accent}` `` and `outlineOffset` to `-2px` (inset, so the `overflow: auto` body cannot clip it at the edges, which is the probable reason the default 1 px ring read as subtle) only when `event.currentTarget.matches(":focus-visible")`, and clear both on blur. It reproduces the browser's own heuristic (keyboard-initiated programmatic focus shows it, a mouse click does not), needs no stylesheet and no React state, and writes through CSSOM so it is CSP-safe. A stored `<style>` element is not CSP-safe and breaks the package's rule. The existing pins keep passing: N10 compares `props.style` to `{ padding: 12 }` (handlers are extra keys) and N8 asserts the button's `style.outline` is `""`.
2. **Restart button:** passes 1.4.3 and is not required to pass 1.4.11. If the user wants margin rather than a pass: `{ ...button(false), color: colors.text, borderColor: colors.error, marginTop: 8 }` gives 12.10:1 text and a 6.57:1 boundary, with no new token. Without it, leave the button and add the token-level test so a later token change cannot regress it.
3. A shared `focusRing` token in `theme.ts` (so toolbar buttons and inputs could adopt the same) is a natural follow-up but is out of scope.

### How to pin it

- **No contrast helper exists** in the repo [VERIFIED: grep for `contrast|luminance|wcag` over `packages/*/{src,test}` and `scripts` finds only a WCAG 2.1.1 comment in `DecisionLog`]. Add `packages/devtools/test/react/contrast.ts` (relative luminance, `over(hexOrRgba, bg)` composite parsing `withAlpha`'s `rgba(r,g,b,a)` output, and `contrast(a, b)`), and `theme.contrast.test.ts` asserting from the **token source** (`colors`, `withAlpha`): Stopped body text `>= 4.5` (12.10), amber lead `>= 4.5` (6.57), Restart text `>= 4.5` (4.81, or 12.10 if hardened), the focus ring `>= 3` on `surface` (6.78) and on the notice (5.56). Fail messages print the computed ratio.
- **DOM test** (happy-dom, verified: `el.matches(":focus-visible")` is `true` after `el.focus()`): render a root with `diagnosticsRootProps`, `focus()` it, assert `style.outline` is the token's and `outlineOffset` is `-2px`; `blur()` clears it; a root never focused has no outline (N10 stays). Put it in `DiagnosticsNotice.test.tsx` as `N12`.
- **Human check:** the real-browser appearance stays a manual backstop (as `34-VERIFICATION.md` did); `examples/nextjs-newsroom` Playwright is possible but not needed to pin the style.

## Q7. The `eslint-disable` in `useScoped.ts`

- **Where:** `packages/devtools/src/react/useScoped.ts:45`, `// eslint-disable-next-line react-hooks/exhaustive-deps`, over `useLayoutEffect(..., [])` that reads `make` once per mount. There is **no** `packages/react/src/useScoped.ts` (the roadmap names the wrong package).
- **Which rule:** `react-hooks/exhaustive-deps`, here the missing dependency `make`.
- **Still needed? No, it is inert.** `.oxlintrc.json` sets no plugins or categories for React; `package.json` has `"lint": "oxlint && node scripts/check-house-style.mjs"` and no ESLint dependency [VERIFIED: grep of `package.json`, `packages/*/package.json`]. I linted a copy of the file with and without the directive using `oxlint@1.92.0` and the repo config: no diagnostic either way. Enabling the plugin explicitly (`--react-plugin -D react-hooks/exhaustive-deps`) reports `React Hook useLayoutEffect has a missing dependency: 'make'` on the directive-free copy, so the directive would matter only if someone enables that rule, and other effects in the repo already omit dependencies without any suppression (for example `QadiProvider.tsx:272-276` lists `[instrument, gates]` while reading `writer` and `report`).
- **Recommendation: remove the directive line** and keep the three-line justification above it (it is the real documentation: `make` is read once per mount, later inputs arrive as commands), since the repo disallows suppressions for rules it does not run. The "justified in place" half of the context is already satisfied by that comment. No test; `pnpm lint` stays green. If the user later enables `react-hooks`, restore the suppression there with the same comment.

## Q8. Mutation baseline (D-10) and changesets (D-11)

### Src files the code half will touch

| File | Package | In `mutate`? | Reason / last known score |
|---|---|---|---|
| `packages/devtools/src/model/TimelineFeed.ts` | devtools | Yes (`packages/devtools/src/model/**/*.ts`, `stryker.devtools.mjs:62`) | measured; 1.00 at the end of Phase 34 (`34-mutation-after.json`) |
| `packages/devtools/src/model/TimelineStore.ts` | devtools | Yes | `runSource` parameter narrowing; score not recorded recently |
| `packages/devtools/src/model/DockModel.ts` | devtools | Yes | measured; 1.00 (`34-mutation-after.json`), only if tier 2 is taken |
| `packages/devtools/src/model/SimulationSource.ts` | devtools | Yes | last 0.984 (`24-mutation-after.json`) |
| `packages/devtools/src/model/SimulationSession.ts` | devtools | Yes | last 0.969 (`25-mutation-after.json`) |
| `packages/devtools/src/model/Replay.ts` | devtools | Yes | last 1.00 (`25-mutation-after.json`); if 25 IN-01 folds the reading in |
| `packages/devtools/src/react/{useTimeline.ts,useDockModel.ts,DevtoolsDock.tsx,Simulator.tsx,DiagnosticsNotice.tsx,useScoped.ts}` (+ a new `TimelineNotice.tsx` if tier 2) | devtools | **No** (`src/model/` only: the model decides, `src/react/` renders, `stryker.devtools.mjs:9-17`) | unmeasured, as `34-mutation-base.json` classified the same files |
| `packages/react/src/QadiAtoms.ts` | react | **No** (`stryker.react.mjs:78-83` lists `DecisionOutcome`, `QuestionBook`, `HydrationEvent`, `SweepScheduler` only) | unmeasured: a one-line declarative `Atom.keepAlive`, not decision logic |
| `packages/react/src/HydrationEngine.ts` | react | **No** | unmeasured; a tuple expression |

(The wording items, such as `packages/core/src/DecisionSink.ts` and `stryker.http.mjs`'s comment, are `36-RESEARCH.md`'s; if the planner includes `DecisionSink.ts` it falls in core's `stryker.config.mjs` `packages/core/src`, comment-only.)

The recorded scores are historical and from different bases; **re-measure at `d31a25ee`**, none of them is the Phase 36 base.

### Commands (do not run here)

```bash
# devtools, the six measured model files in one run (the form 34-01 used), alone, before any src change
pnpm exec stryker run stryker.devtools.mjs --mutate 'packages/devtools/src/model/TimelineFeed.ts,packages/devtools/src/model/TimelineStore.ts,packages/devtools/src/model/DockModel.ts,packages/devtools/src/model/SimulationSource.ts,packages/devtools/src/model/SimulationSession.ts,packages/devtools/src/model/Replay.ts'
# report: reports/mutation-devtools/mutation.json ; score per file = killed+timeout over killed+timeout+survived (+ no-coverage)

# react, only if the user wants QadiAtoms.ts / HydrationEngine.ts measured despite being outside `mutate`
pnpm exec stryker run stryker.react.mjs --mutate 'packages/react/src/QadiAtoms.ts,packages/react/src/HydrationEngine.ts'
```

Time estimate [ASSUMED from the recorded plan durations, `34-01-SUMMARY.md:69` 8 min including the run for two files, `33-01-SUMMARY.md:33` 12 min]: devtools six files about 10-20 minutes (more files and `perTest` coverage over 55 files of tests); react two files about 5-15 minutes (many happy-dom tests per covered mutant; a one-line atom has very few mutants). The recommended record is `36-mutation-base.json` in the Phase 34 shape: `{ measured: {file: score}, unmeasured: {file: reason}, new: [...], deleted: {...} }`; the react files and the six `src/react` files go under `unmeasured`.

After the fixes the after-run must leave no measured file below its base; name survivors. The new `describeSource` and the token/`onExit` branches are the places a surviving mutant is plausible (the `mine === generation` comparison and `Cause.hasInterruptsOnly` negation); TF9, TF12 and the `generation`-bump-on-close test are what kill them.

### Changesets (D-11; packages are `fixed`)

| Package | Change | Level | Text must say |
|---|---|---|---|
| `@qadi/devtools` | TimelineFeed token and observable death; `useTimeline` `status`; `TimelineStatus` export; dock notice (tier 2) | patch (additive; minor if the user treats a new export as minor) | a replaced read can no longer write; a dying source is now stated; `useTimeline` returns `status` |
| `@qadi/devtools` | 24 IN-01, IN-03, 26 IN-02, focus ring | patch | internal; the dock's root shows a focus ring |
| `@qadi/devtools` | 25 IN-01 folds the reading into `Checked`, removes `SimulationSnapshot.baselineReading` | **minor, Breaking** | the removed field and the replacement `baseline.reading` |
| `@qadi/react` | `subject` atom `keepAlive` | patch | a gate mounted after the first macrotask, or after a hidden `<Activity>`, now sees the provider's subject |
| `@qadi/react` | `DENY_WITHHELD` | none (internal, covered by the above or no changeset) | n/a |

Nothing is released or published (memory: release only on the user's explicit "the release").

**upgrading.md** (`apps/website/src/content/docs/docs/reference/upgrading.md`, headings of the form `## 0.12: ...`): one section only if 25 IN-01 is taken, because it is the only Breaking item (`SimulationSnapshot.baselineReading` -> `baseline.reading`, with a compiled `typescript` example before/after, since `check-website-doc-examples.mjs` compiles these). A new `TimelineStatus` and `status` field need no migration section.

## Validation Architecture

### Test framework

| Property | Value |
|---|---|
| Framework | vitest 5.1.0 with `@effect/vitest` (model), React Testing Library on happy-dom (React); tstyche for `*.tst.ts` type pins |
| Config | `packages/devtools/vitest.config.ts` (project `devtools`), `packages/react/vitest.config.ts` (project `react`) |
| Quick run | `pnpm vitest run --project <pkg> <file> < /dev/null` |
| Full suites | `pnpm vitest run --project devtools`, `pnpm vitest run --project react` |
| Not for research | `pnpm check`, Stryker, the e2e |

### Item -> test map

| Item | Requirement | Test file | Framework | Command | At base |
|---|---|---|---|---|---|
| TimelineFeed late accept | DEBT-04 / D-02 item 1 | `packages/devtools/test/model/TimelineFeed.test.ts` `TF9` | `it.effect`, `flush` | `pnpm vitest run --project devtools packages/devtools/test/model/TimelineFeed.test.ts` | **RED** (observed `['a1','a2','a3','b']`) |
| TimelineFeed silent death, status, recovery, interruption | D-02 item 2 | same file `TF10`-`TF14` | `it.effect`, `TestClock`, `settleTurns` after `Scope.close` | same | **RED** `TF10`, `TF11` (behaviour-RED after the skeleton); green `TF12`-`TF14` |
| DockModel exposes the status (tier 2) | D-02 item 2 | `packages/devtools/test/model/DockModel.test.ts` (`M`-series) | `it.effect` | `pnpm vitest run --project devtools packages/devtools/test/model/DockModel.test.ts` | RED (no member) |
| `useTimeline` returns `status`; idle first pass | D-02 item 2 | `packages/devtools/test/react/useTimeline.test.tsx` | RTL, happy-dom | `pnpm vitest run --project devtools packages/devtools/test/react/useTimeline.test.tsx` | RED |
| Dock notice (tier 2) | D-02 item 2 | `packages/devtools/test/react/DevtoolsDock.test.tsx` or a new `TimelineNotice.test.tsx` | RTL | `pnpm vitest run --project devtools packages/devtools/test/react/DevtoolsDock.test.tsx` | RED |
| `TimelineStatus` exported | D-02 item 2 | `packages/devtools/test/surface.test.ts`, `surface.tst.ts` | vitest, tstyche | `pnpm vitest run --project devtools packages/devtools/test/surface.test.ts` and `pnpm test:tstyche` | RED |
| `subject` keepAlive | D-02 item 3 | `packages/react/test/QadiProvider.subject.test.tsx` `SUBJ1`-`SUBJ3` | RTL, happy-dom, `settle()` + a real 50 ms turn | `pnpm vitest run --project react packages/react/test/QadiProvider.subject.test.tsx` | **RED** (all three observed `pending`) |
| keepAlive canary | D-02 item 3 | `packages/react/test/v4-reactivity-smoke.test.ts` | vitest | `pnpm vitest run --project react packages/react/test/v4-reactivity-smoke.test.ts` | green once the canary is added (no src dependence) |
| Seed atoms lose a late-mounted seed | known limit (not fixed) | optional `QadiProvider.subject.test.tsx` `SEED` marked as a characterisation of current behaviour | RTL | same | RED against a "seed survives" expectation; add only if the user wants the limit pinned as is |
| StrictMode identity change | DEBT-05 (28 IN-06) / D-04 | `GateRegistry.test.tsx` `GR-S1`, `GR-S2`; `GateWriter.test.tsx` `GW-S1` | RTL / `renderHook` | `pnpm vitest run --project react packages/react/test/GateRegistry.test.tsx packages/react/test/GateWriter.test.tsx` | green (characterisation; prototype passed) |
| 24 IN-01 describe vs prepare | DEBT-04 | `packages/devtools/test/model/SimulationSource.prepare.test.ts`, `SimulationSession.test.ts:1071-1076,686` | `assert` + `it.effect` | `pnpm vitest run --project devtools packages/devtools/test/model/SimulationSource.prepare.test.ts packages/devtools/test/model/SimulationSession.test.ts` | green characterisation first; identity pin RED by absence |
| 24 IN-03 `ReadySource` | DEBT-04 | none (the compiler); `pnpm typecheck` | tsc | `pnpm typecheck` | green (no runtime) |
| 24 IN-04 | DEBT-04 (resolved) | `SimulationSession.test.ts:978-1005` | `it.effect` | as above | green; optional synchronous assertion |
| 25 IN-01 reading folded in | DEBT-04 | `SimulationSession.test.ts:737-741`, `Replay.test.ts`, a `Simulator` baseline DOM test, a `.tst.ts` pin | `it.effect`, tstyche | `pnpm vitest run --project devtools packages/devtools/test/model/Replay.test.ts packages/devtools/test/model/SimulationSession.test.ts` | green moves with the change |
| 26 IN-02 `nothing` | DEBT-04 | `DevtoolsDock.test.tsx:77`, `DockModel.test.ts` | RTL, `it.effect` | `pnpm vitest run --project devtools packages/devtools/test/react/DevtoolsDock.test.tsx` | green |
| 29 IN-01 `DENY_WITHHELD` | DEBT-04 | `packages/react/test/HydrationPayload.test.ts` | vitest | `pnpm vitest run --project react packages/react/test/HydrationPayload.test.ts` | green |
| Focus ring | D-02 item 4 | `DiagnosticsNotice.test.tsx` `N12` | RTL, happy-dom | `pnpm vitest run --project devtools packages/devtools/test/react/DiagnosticsNotice.test.tsx` | RED (no outline) |
| Contrast of the tokens | D-02 item 4 | `packages/devtools/test/react/theme.contrast.test.ts` + `contrast.ts` | vitest | `pnpm vitest run --project devtools packages/devtools/test/react/theme.contrast.test.ts` | green for the passing tokens (4.81, 12.10, 6.57, 6.78); the focus-ring ratio test is green once the token is chosen |
| `useScoped` directive | D-02 item 5 | none; `pnpm lint` | oxlint | `pnpm lint` | green |

### Sampling

- **Per task commit:** the touched test file(s) above, and `pnpm typecheck` for any commit that changes an interface (the skeleton, the `Ready` split, the `Checked` field).
- **Per wave merge:** `pnpm vitest run --project devtools` and `pnpm vitest run --project react`, `pnpm test:tstyche`.
- **Before verification:** `pnpm check:pr` on the final tree (the executor, not research); the Stryker after-run per D-10 on the measured files.

### Wave 0 gaps

- [ ] `packages/react/test/QadiProvider.subject.test.tsx`: new (SUBJ1-3).
- [ ] `packages/devtools/test/react/contrast.ts` and `theme.contrast.test.ts`: new (no helper exists).
- [ ] The `TimelineStatus` type skeleton commit so the status tests are behaviour-RED.
- [ ] `36-mutation-base.json` (alone, first commit).

## Security Domain

`security_enforcement` is not set false in the files I read; this slice has no authentication, session, access-control or cryptography surface. Relevant ASVS:

| ASVS area | Applies | Note |
|---|---|---|
| V5 Input validation | No change | no new untrusted input; `HydrationEngine` edit is a constant |
| V4 Access control | Indirectly | the `subject` atom is the authorization input the decision atoms read; the defect fails **closed** (it left gates `Initial`, never an allow), and `keepAlive` does not widen what a subject can do. State this in the review: no stale allow is introduced, because `DecisionOutcome` still reads only `Allowed` as allow |
| V7 Error handling | Yes | a stated stop with `Cause.pretty` as `reason`: a stack trace in the dock, the same exposure `DiagnosticsNotice` already has; the devtools is a development affordance guarded by the host |

## Assumptions Log

| # | Claim | Section | Risk if wrong |
|---|---|---|---|
| A1 | Chromium's default focus ring is a dark ring with a white halo (UA behaviour, not measurable here) | Q6 | Low: the recommendation (author-controlled ring) does not depend on it |
| A2 | Stryker run times (10-20 min devtools, 5-15 min react) extrapolated from earlier plan durations | Q8 | Low: planning only |
| A3 | The user will accept tier 2 (dock notice, eight readouts) for the timeline stop | Q1 | Medium: otherwise the "stated, tested rule" fallback applies; the model and hook parts are unchanged |
| A4 | Folding `reading` into `Baseline.Checked` (a Breaking change) is preferred over a non-breaking view guard | Q5 | Low: the standing direction says breaking is fine; the alternative is stated |
| A5 | `Atom.keepAlive` after `Atom.withEquality` keeps the equality; the scratch copy passed the three RED tests but I could not run the existing react suite against it | Q2 | Low: run `QadiAtoms.test.ts` and `QadiProvider.test.tsx` after the real change |

## Open Questions

1. **How far should the timeline's observable death reach?** Tier 1 (feed + `useTimeline`) is required; tier 2 (`DockModel.timelineStatus` + a dock notice) makes the dock stop dying silently but adds an eighth readout, a UI-SPEC and a BEH-QD-465 restatement. Recommendation: tier 2. The user decides before the plan is written.
2. **Hydrated seeds on a late mount.** The seed atoms lose their value at the first macrotask with no reader (RED reproduced: `pending` instead of the seeded denial). Recommendation: leave as a recorded, tested limit; a fix needs a design (not `keepAlive`).
3. **25 IN-01 as a Breaking change** (`SimulationSnapshot.baselineReading` removed) versus a non-breaking guard in the view. Recommendation: the break.
4. **Restart button:** passes 1.4.3 as is (4.81:1). Harden to `colors.text` and an amber border, or leave and pin? Recommendation: harden (cheap, no new token), but nothing is required.

## Sources

### Primary
- Source read this session, with the line ranges cited inline: `packages/devtools/src/model/{TimelineFeed,TimelineStore,DiagnosticsFeed,DockModel,Source,SimulationSource,SimulationSession,Replay,WhatIf,Capture}.ts`, `packages/devtools/src/react/{DevtoolsDock.tsx,DiagnosticsNotice.tsx,Simulator.tsx,theme.ts,useScoped.ts,useTimeline.ts,useDockModel.ts,index.ts,useStoreSnapshot.ts}`, `packages/react/src/{QadiAtoms.ts,QadiProvider.tsx,GateWriter.ts,GateRegistry.ts,useGate.ts,HydrationEngine.ts}`, `node_modules/effect/src/{FiberHandle.ts,internal/effect.ts,reactivity/Atom.ts,reactivity/AtomRegistry.ts}`, `stryker.{devtools,react,http}.mjs`, `.oxlintrc.json`, `.changeset/config.json`, `.changeset/dock-diagnostics-feed.md`.
- Phase records: `34-REVIEW.md` and `34-REVIEW-FIX.md` (IN-01, IN-05), `34-VERIFICATION.md` (Human Verification Outcome), `34-UI-SPEC.md`, `35-SPIKE.md` (pre-existing finding), `v1.2-MILESTONE-AUDIT.md`, the 24/25/29 review files, `36-CONTEXT.md`, `_WAVE8-CONTEXT.md`.
- [CITED: w3.org/WAI/WCAG22/Understanding/{non-text-contrast,focus-appearance,focus-not-obscured-minimum,focus-visible,contrast-minimum}.html] fetched this session.

### Secondary / measured
- Prototypes run at the base on vitest 5.1.0 (all deleted; `git status --porcelain` shows only `M .planning/config.json` and `?? .planning/state.json`): the timeline scenarios A-E, the subject tests S1/S2/SUBJ3, the seed test, the StrictMode gate tests, the recorder `Proxy` count, the happy-dom `:focus-visible` probe, the oxlint with/without-directive run, the `DENY_WITHHELD` typecheck, and a fixed-copy TimelineFeed with token+status.

## Metadata

**Confidence:** HIGH on the defects, the root causes (read in installed source and reproduced), the contrast arithmetic and the lint finding; MEDIUM on the UI reach of the timeline status (a user decision) and on mutation timings.
**Valid until:** until `packages/devtools/src/model/TimelineFeed.ts`, `packages/react/src/QadiAtoms.ts` or `effect` changes (30 days otherwise).
