---
phase: QD-60-devtools-headless-interface-is-the-feeds
reviewed: 2026-11-19T15:02:47Z
depth: standard
iteration: 1
files_reviewed: 28
files_reviewed_list:
  - examples/nextjs-newsroom/src/client/Counters.tsx
  - packages/devtools/README.md
  - packages/devtools/src/index.ts
  - packages/devtools/src/model/DiagnosticsFeed.ts
  - packages/devtools/src/model/DiagnosticsStore.ts
  - packages/devtools/src/model/DockModel.ts
  - packages/devtools/src/model/GatesFeed.ts
  - packages/devtools/src/model/TimelineFeed.ts
  - packages/devtools/src/react/DevtoolsDock.tsx
  - packages/devtools/src/react/index.ts
  - packages/devtools/src/react/useDiagnostics.ts
  - packages/devtools/src/react/useDockModel.ts
  - packages/devtools/test/model/DiagnosticsFeed.test.ts
  - packages/devtools/test/model/DiagnosticsStore.test.ts
  - packages/devtools/test/model/DiagnosticsStore.tst.ts
  - packages/devtools/test/model/GatesFeed.test.ts
  - packages/devtools/test/model/TimelineFeed.test.ts
  - packages/devtools/test/react/DiagnosticsLifetime.test.tsx
  - packages/devtools/test/react/DiagnosticsScreens.test.tsx
  - packages/devtools/test/react/QuestionsPanel.feed.characterisation.test.tsx
  - packages/devtools/test/react/questionsProp.ts
  - packages/devtools/test/react/useDiagnostics.test.tsx
  - packages/devtools/test/surface.test.ts
  - packages/devtools/test/surface.tst.ts
  - scripts/check-package-install.mjs
  - packages/devtools/src/model/ExternalStore.ts
  - packages/devtools/src/model/SupersedingRun.ts
  - packages/devtools/src/model/TimelineStore.ts
findings:
  critical: 0
  warning: 3
  info: 4
  total: 7
  necessity: 0
status: issues_found
---

# Phase 60: Code Review Report (iteration 1)

**Reviewed:** 2026-11-19T15:02:47Z
**Depth:** standard
**Files Reviewed:** 28 (the 25 in scope, plus `ExternalStore.ts`, `SupersedingRun.ts` and `TimelineStore.ts` read as callees)
**Status:** issues_found

## Summary

I reviewed `git diff 35a48554 HEAD` for each file in scope and read the three callee modules the feeds are built on. I re-ran the tests:
- `vitest --project devtools` on `DiagnosticsFeed`, `DiagnosticsStore`, `GatesFeed`, `TimelineFeed` and `surface`: 112 of 112 pass.
- `tstyche` on `surface.tst.ts` and `DiagnosticsStore.tst.ts`: 15 tests and 26 assertions pass.
- A scratch probe outside the repo built each feed from `src/index.ts` with `Effect.runSync` and exercised the edge cases below. Its results are quoted where used.

**Clean on the points in the brief.**
- **Interface.** A headless consumer can build, configure, observe, restart and tear down all three feeds from root exports alone. Every type a public signature names is exported from the root. I traced each one:
  - `TimelineFeed` names `TimelineStore`, `TimelineStatusReadout`, `TimelineFeedInputs`, `Source` and `Timeline`.
  - `DiagnosticsFeed` names `DiagnosticsReadout`, `DiagnosticsSnapshot`, `DiagnosticsStatus`, `Diagnostics`, `DiagnosticsOptions`, `WiringRead`, `WiringReport`, `HydrationActivity`, `PortActivity`, `PortCallLog`, `PortCallCollector` and `AskedQuestionLike`.
  - `GatesFeed` names `GatesSnapshot`, `RegistryRead`, `AskedRead`, `GateInstanceLike`, `GateRegistryLike` and `GatesFeedInputs`.

  The retired names (`makeTimelineStore`, `runSource`, `makeDiagnosticsStore`, `runDiagnostics`, `noDiagnostics`, the `DiagnosticsStore` type, `DiagnosticsDockOptions`) are refused at both entries. The idle readouts and `isUnsampled` stay private. Nothing is exported that should not be.
- **One `DiagnosticsOptions` (D-03, D-15).**
  - It is declared once, non-generic, at `DiagnosticsStore.ts:198`, and `react/index.ts:21` re-exports that same declaration.
  - `runDiagnostics` builds `Schedule.spaced(options?.intervalMillis ?? DEFAULT_DIAGNOSTICS_INTERVAL_MILLIS)` (`:250`), so the default holds when the options or the field are absent.
  - `configure` compares `layer`, `collector` and `intervalMillis` by identity against the previous options (`DiagnosticsFeed.ts:186-191`). `runOptions`, `Schedule` and the `Layer` import are gone from the feed. No translation code is left.
- **The removed D-16 guard.** `configure(undefined)` on a feed that is already off is still silent.
  - `off()` calls `runs.stop()`, which forks `Effect.void` under a fresh token while no run is live. It then allocates a store and calls `view.set(diagnosticsOff)`.
  - `ExternalStore.set` returns early on the same reference, so nothing is published.
  - The probe saw 0 notifications and the same snapshot identity across two calls on a never-configured feed, and F26 pins both cases.
  - The only effects are a throwaway store and one `Effect.void` fiber, which nothing can observe.
- **The `5d297faf` positive pins.** They are as strong as claimed. `expect(makeDiagnosticsFeed({ intervalMillis: 1_000 })).type.toBe<…>()` fails on an excess or mistyped option, and it also pins the result type, which `toBeCallableWith` did not. The *negative* "not generic" pin is weaker than it reads (IN-02).
- **Re-pointed suites.** `DiagnosticsFeed.test.ts`, `GatesFeed.test.ts` and `TimelineFeed.test.ts` import every public name from `src/index.ts`. They reach into `model/` only for package-private helpers (`idleDiagnostics`, `isUnsampled`, `idleTimeline`, `noDiagnostics`). The React suites take `DiagnosticsOptions` from `src/react/index.ts`.
  - No assertion was lost in the renames.
  - The schedule-override test became an interval-override test with the same clock steps and read count.
  - A span-name test was added.
  - The characterisation file changed on exactly lines 26 and 66 (D-12).
- **House rules.** The changed lines add no `as` cast, `!`, `any`, `switch`, `fnUntraced`, `async`/`await` (outside the `.mjs` gate script), `Record<string, unknown>` or `effect` barrel import. Every relative import carries `.ts`/`.tsx`, and both devtools barrels stay named.
- **Retired names in docs.** None of the retired names appears in `packages/devtools/README.md`, `website/`, `examples/` or `packages/react/src`. Inside `packages/devtools/src`, the only use outside their own modules is `useTimeline.ts` calling `makeTimelineStore` internally, which is legitimate.

**What is left.**
- **WR-01.** The README's headless example, which is the phase's own stop-detection showcase, misses a stop or failure reached while the feed is built.
- **WR-02.** `TimelineFeed.configure` is the one command on the three now-public feeds with no closed-scope guard, and after a close it falsely reports `Reading`.
- **WR-03 (UF-2).** A throwing listener escapes `configure` and silently kills the gates cadence. That contradicts `GatesFeed.ts`'s own isolation claim and the README's new "a feed that stops says so".
- **UF-1** is IN-01.

I read `necessity-review.md`. No finding qualifies.

## Narrative Findings (AI reviewer)

## Warnings

### WR-01: The README's headless example subscribes after the build, so a stop reached during the build is never reported

**File:** `packages/devtools/README.md:160-231` (subscriptions at `:209-212`)

**Issue:**
- **The example's pattern.** It builds each feed and only then subscribes `report` to it. It never reads the current snapshot. So it reports *transitions after subscription* and nothing that happened inside `yield* makeXFeed(...)`.
- **Each feed reaches a state synchronously, during the build.**
  - `SupersedingRun` runs a run's synchronous prefix inside `fork` (`SupersedingRun.ts:25-27`).
  - `TimelineFeed.test.ts` TF10 pins "a read that dies is Stopped with its reason, at once".
  - The probe built `makeDiagnosticsFeed({ collector })` with a collector whose snapshot dies, and `getSnapshot().status._tag` was already `Stopped` when the `Effect` returned.
  - `makeDiagnosticsFeed({})` was already `Live`.
  - `makeGatesFeed` publishes a throwing registry's `Failed` in its build (`GatesFeed.ts:232-233`).
- **What the example prints.** A shell copied from it says nothing about any of these states. The example's diagnostics feed reaches `Live` during the build and never notifies again (identical samples publish nothing), so its `diagnosticsLine` is never printed at all.
- **Why this is a defect.**
  - This is the exact silence the section opens by ruling out ("a feed that stops says so instead of leaving a dead fiber", `:163`). D-06 requires the example to show stop detection.
  - The fence compiles, so the documentation gate cannot catch it.

**Fix:** Have each line report the current state once after subscribing, then on every change.
```typescript
const say = (line: () => string) => {
  report(line());
  return line;
};
const timelineNow = say(() => timelineLine(timeline.status.getSnapshot()));
timeline.status.subscribe(() => report(timelineNow()));
const diagnosticsNow = say(() => diagnosticsLine(diagnostics.getSnapshot().status));
diagnostics.subscribe(() => report(diagnosticsNow()));
// …same for the entries count and gates
```
Also add one sentence to the prose: "Read `getSnapshot()` once after subscribing: a feed can already be `Live` or `Stopped` when its build returns."

### WR-02: `TimelineFeed.configure` has no closed-scope guard; after the scope closes it publishes `Reading` and empties the timeline

**File:** `packages/devtools/src/model/TimelineFeed.ts:150-161`

**Issue:**
- **The two siblings are guarded.** `DiagnosticsFeed.configure` (`DiagnosticsFeed.ts:178-179`, "A command on a closed feed would publish a state nothing follows") and `GatesFeed.configure` (`GatesFeed.ts:240`) both return early once `runs.closed()`. `TimelineFeed` guards `restart` (`:143-145`, pinned by TF17/TF18) but not `configure`.
- **What a configure after close does.**
  - A capacity change builds a new inner store and publishes an emptied timeline (`push()`, `:156-158`).
  - `readSource` then calls `status.set(READING)` (`:129`) before `fork` refuses the stale token. A feed that was `Stopped` now says `Reading` although nothing reads.
- **Probe result.** I built a feed on a dying source, closed its scope, then called `configure({ capacity: 5 })`. The status went from `Stopped` to `Reading`, with 2 notifications.
- **Why it matters now.** The feed was package-private at `phase_base`, and only `DockModel`/`useTimeline` called it inside a live scope. D-02 makes it public, so a headless shell holding the handle past its scope now gets a false "running" status. The `TimelineStatus` doc says a stop "must be stated, not left as a timeline that looks current". No test covers configure after close.

**Fix:** Mirror the sibling guard, and pin it beside TF17/TF18.
```ts
configure: (next) => {
  // A command on a closed feed would publish a state nothing follows.
  if (reads.closed()) return;
  const before = inputs;
  …
```
Add a test: "TF a configure after the scope closed reads nothing, publishes nothing and leaves a Stopped feed Stopped".

### WR-03 (UF-2): A throwing `subscribe` listener escapes `configure` and silently ends the gates cadence

**File:** `packages/devtools/src/model/ExternalStore.ts:34-36`, `packages/devtools/src/model/GatesFeed.ts:5-7`, `:211-230`, `:239-253`; `packages/devtools/README.md:163`

**Issue:**
- **No isolation.** `ExternalStore.notify` calls each listener with no isolation. For the gates feed, which phase 60 makes public, the probe showed two results.
  - A gates feed with a 5 ms thunk and one throwing subscriber called the thunk 2 times in the first 40 ms and still 2 times at 80 ms. The cadence fiber died: `Effect.sync(tick)` threw from `store.set`, and `cadence` forks with no `onFailure` (`:223-229`), so nothing states the death. The questions panel then freezes with no word.
  - `feed.configure({ questions: () => [] })` threw `listener boom` to the caller.
- **Two documents now say otherwise.**
  - `GatesFeed.ts:5-7` says "nothing the host throws leaves `makeGatesFeed`, `configure`, a registry listener or a tick". A subscriber is host code.
  - The README section phase 60 wrote says "a feed that stops says so instead of leaving a dead fiber" (`:163`).
- **The timeline and diagnostics feeds misattribute the throw.** In the timeline and diagnostics feeds, a listener throw inside `accept` becomes a `Stopped` whose reason blames the source or sampler.
- **Severity and scope.**
  - The behaviour predates the phase, and the listener is the host's own code in its own process, so this is a Warning, not Critical.
  - The two false claims are in scope: one is in a module whose doc this phase edited, and the other is new text.
  - Isolating `notify` changes `ExternalStore`, which the React dock shares. The phase context rules dock behaviour out of scope, so that half belongs in a follow-up.

**Fix (this phase):** Make the docs true.
- Narrow `GatesFeed.ts:5-7` to "…a registry listener or a tick; a `subscribe` listener is the caller's and must not throw: a throw escapes `configure` and ends the questions cadence".
- Add the same sentence to the `subscribe` doc of `DiagnosticsReadout`, `TimelineStatusReadout` and `GatesFeed`, and to the README's headless section.

**Follow-up (backlog):** Decide whether a listener throw is a stop to state, for example by isolating each listener in `notify` or by giving the gates cadence an `onFailure` that publishes `AskedRead.Failed`. Then pin that decision.

## Info

### IN-01 (UF-1): `WiringRead.Failed.reason` lacks the trust-boundary sentence its four siblings gained

**File:** `packages/devtools/src/model/DiagnosticsStore.ts:63-64` (doc), `:268` (`Cause.pretty(built.cause)`); `packages/devtools/README.md:229-231`

**Issue:**
- **The doc gap.** This phase added "it must not cross a trust boundary" to `TimelineStatus.Stopped`, `DiagnosticsStatus.Stopped`, `RegistryRead.Failed` and `AskedRead.Failed`. `WiringRead.Failed.reason` is the same kind of `Cause.pretty` trace (a handed layer's build failure). It is public in every `DiagnosticsSnapshot.reading.wiring` and carries only "The handed layer failed to build".
- **The README gap.** The README paragraph covers only "A stop's `reason`", so a shell forwarding readings would read the `Failed` reasons as safe.
- **Severity and scope.** The type was already public at `phase_base`, so reachability is unchanged. Info, and in scope: a one-line doc fix in a file this phase rewrote.

**Fix:** Add a sentence to the doc: "`reason` is `Cause.pretty` of the build failure, a trace for the host's own process: it must not cross a trust boundary." In the README, change "A stop's `reason`" to "A stop's or a failed read's `reason` (`Stopped`, `WiringRead.Failed`, `RegistryRead.Failed`, `AskedRead.Failed`)".

### IN-02: The "not generic" type pin passes for a reintroduced one-parameter generic

**File:** `packages/devtools/test/model/DiagnosticsStore.tst.ts:284-285`

**Issue:**
- **What the pin checks.** `// @ts-expect-error not generic` over `DiagnosticsOptions<never, never>` is satisfied by *any* error on that line, including "expected 0-1 type arguments".
- **The gap.** I compiled `interface DiagnosticsOptions<ROut = never> { … }` with that line under `tsc --strict`, and it exits 0, so the pin passes. `surface.tst.ts`'s exact-shape pin compares only the default instantiation, so it passes too. A `<ROut = never>` parameter could come back with both pins green.

**Fix:** Add the one-argument form, so that every generic arity fails one of the two lines.
```ts
// @ts-expect-error not generic
export type NotGenericOne = DiagnosticsOptions<never>;
// @ts-expect-error not generic
export type NotGenericTwo = DiagnosticsOptions<never, never>;
```

### IN-03: The packed-consumer feed check asserts a status a feed that read nothing also has

**File:** `scripts/check-package-install.mjs:501-511`

**Issue:** `Reading` is the status a feed publishes before its read starts (`TimelineFeed.ts:123`, `:129`). It is also the status of a read that ended or never ran. The check proves the export resolves and the build runs. It does not prove the shipped feed read `sourceFromRecords([stored])`.

**Fix:** Inside the same `Effect.scoped`, after `yield* Effect.sleep("10 millis")`, also return `feed.timeline.getSnapshot().entries.length` and `expect("devtools feed entries", …, 1)`.

### IN-04: The now-public `DiagnosticsOptions` doc points readers at a package-private type

**File:** `packages/devtools/src/model/DiagnosticsStore.ts:194-196`

**Issue:** "They are the dock model's own inputs (`DockModelInputs.gates` and `DockModelInputs.questions`)". `DockModelInputs` is not exported from either entry, so a headless reader of the public type cannot follow the reference.

**Fix:** Change the reference to "They are the gates feed's inputs (`GatesFeedInputs.gates` and `GatesFeedInputs.questions`, `makeGatesFeed`)".

---

_Reviewed: 2026-11-19T15:02:47Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
