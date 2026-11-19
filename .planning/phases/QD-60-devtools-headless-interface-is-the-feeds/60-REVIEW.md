---
phase: QD-60-devtools-headless-interface-is-the-feeds
reviewed: 2026-11-19T15:36:10Z
depth: standard
iteration: 3
files_reviewed: 30
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
  - spec/behaviors/28-devtools-screens.md
  - spec/overview.md
findings:
  critical: 0
  warning: 3
  info: 1
  total: 4
  necessity: 0
status: issues_found
---

# Phase 60: Code Review Report (iteration 3)

**Reviewed:** 2026-11-19T15:36:10Z
**Depth:** standard
**Files Reviewed:** 30. These are the 25 in scope, plus three callees read for behaviour (`ExternalStore.ts`, `SupersedingRun.ts`, `TimelineStore.ts`), and the two spec files that fix commit `00729ec2` edited (read only where it touched them).
**Status:** issues_found

## Summary

I reviewed `git diff 35a48554 HEAD` for each file in scope. I also reviewed `00729ec2` as new code.

**Checks I ran:**
- `vitest --project devtools` on `TimelineFeed`, `DiagnosticsFeed`, `GatesFeed`, `DiagnosticsStore` and `surface`: 113 of 113 pass. TF ids are now unique, and the highest is TF24.
- `tstyche` on `surface` and `DiagnosticsStore`: 15 tests and 26 assertions pass.
- Three `node --experimental-strip-types` probes against the real feed modules (WR-02).
- Two `tstyche` probes in the scratchpad. Their `tsconfig` extends the repo's `tsconfig.test.json`, so the Effect language service is loaded (WR-03).

**I did not run** Stryker, `check:pr`, `pnpm check` or `check-doc-examples.mjs`. For the README fence compiling, I rely on the iteration-2 fix report.

**The iteration-2 fixes:**
- **WR-01 (BEH-QD-638 and the overview).** The overview row (`spec/overview.md:915`) is now accurate. BEH-QD-638's new wording names "the release handle" among the throws that become `Failed`. That contradicts BEH-QD-584, G42 and the code: see WR-01 below.
- **WR-02 (TF20 duplicate).** Fixed. The test is TF24, and BEH-QD-636's pin names TF24.
- **IN-01 (arity comment).** Fixed. With a two-parameter generic that has no defaults, the comment is exact. With the original `<ROut = never, E = never>`, both directives fail, which is stronger than the comment says, so it is not wrong.
- **IN-02 (gates listener sentence).** Fixed in `GatesFeed.ts:8-11`. The README took the same sentence but applies it to all three feeds, where it is wrong for two of them: see WR-02.
- **IN-03.** Fixed. `TimelineFeed.ts:66` is accurate: a listener there runs on every record. A throw on a record becomes `Stopped`, and a hand-fed `accept` throws it to the caller.

**Clean on the brief's points**, re-checked against HEAD:
- **The interface is complete.** A shell can build, configure, observe and tear down each feed using only root exports.
  - Every type a handle names is exported: `TimelineStore`, `TimelineStatusReadout`, `TimelineFeedInputs`, `Source`, `DiagnosticsReadout`, `DiagnosticsSnapshot`, `Diagnostics`, `WiringRead`, `PortCallCollector`, `GatesSnapshot`, `RegistryRead`, `AskedRead`, `GateRegistryLike` and `GateInstanceLike`.
  - The private helpers (`idle*`, `isUnsampled`, `diagnosticsOff`) are refused by `surface.tst.ts`.
- **There is one `DiagnosticsOptions`.**
  - It is declared once and is not generic (`DiagnosticsStore.ts:201`). It is pinned exactly by `surface.tst.ts:293-299`.
  - `runDiagnostics` builds `Schedule.spaced(options?.intervalMillis ?? DEFAULT_DIAGNOSTICS_INTERVAL_MILLIS)` (`:253`).
  - `configure` compares `layer`, `collector` and `intervalMillis` by identity (`DiagnosticsFeed.ts:187-192`).
  - No translation code is left.
- **The removed D-16 guard.** On an off feed, `configure(undefined)` runs `off()`:
  - `runs.stop()` forks `Effect.void` under a fresh token.
  - A fresh store is allocated.
  - `view.set(diagnosticsOff)` returns early on the same reference.

  Nothing is published and no run is visible.
- **Retired names.** Outside change history, none appears in the README, `examples/` or the website. `upgrading.md:177` sits under the 0.12 heading, and `:1025-1037` is the 0.13 "Before" fence.
- **Tests.**
  - The feed suites import the public names from `../../src/index.ts`. Only package-private helpers (`idleTimeline`, `noDiagnostics`, `isUnsampled`) still come from `model/`.
  - The renames dropped no assertion. The schedule-override test became the interval-override test with the same `reads === 3` assertion.
  - The positive form from `5d297faf` is as strong as claimed. Its stated premise is not: see WR-03.
- **House rules.** The phase adds no `as` cast, `!`, `any`, `switch`, `fnUntraced`, `async`/`await` in src, `Record<string, unknown>`, `effect` barrel import or `export *`, and every relative import carries `.ts`.

**UF-1 and UF-2:**
- **UF-1: Info, in scope, closed.** `WiringRead.Failed` carries the trust-boundary sentence (`DiagnosticsStore.ts:63-66`), and so do the README (`:243-247`) and the website.
- **UF-2: Warning, behaviour out of scope.**
  - It predates the phase: `ExternalStore.notify` has no guard, and the store is shared with the dock.
  - The doc half is in scope, and it is still not right: WR-02 shows that a listener throw from `configure` or `restart` leaves the timeline or diagnostics feed claiming `Reading` or `Starting` with nothing running. The README's list of consequences omits that case.
- UF-4 is unchanged: BEH-QD-636 and BEH-QD-638 still do not repeat the trust-boundary rule. It is optional, and I raise no finding for it.

I read `necessity-review.md`. No finding qualifies.

## Narrative Findings (AI reviewer)

## Warnings

### WR-01: BEH-QD-638's new wording says a throwing release handle is a `Failed` in the snapshot, but BEH-QD-584, G42 and the code say it is never stated

**File:** `spec/behaviors/28-devtools-screens.md:2544-2547` (new in `00729ec2`); contradicts `:2060-2064` (BEH-QD-584), `packages/devtools/src/model/GatesFeed.ts:194-206` and `packages/devtools/test/model/GatesFeed.test.ts:612` (G42)

**Issue:**
- **What `00729ec2` wrote:** "Nothing the host throws from the registry (`instances`, `subscribe`, the release handle) or the questions thunk MUST leave the feed: each is a `Failed { reason }` in the snapshot."
- **What the code does.** `watch()` (`GatesFeed.ts:202-206`) and the finalizer (`:130-134`) swallow a release throw with an empty `catch`. The comment at `:196-197` says: "A release that throws is not stated".
- **What the other spec and the tests say.**
  - BEH-QD-584 says: "An unsubscribe that throws MUST NOT be stated as the `Failed` gates view".
  - G42 is titled "a release that throws is not stated".
  - `RegistryRead.Failed`'s own doc (`GatesFeed.ts:40`) names only "`instances` or `subscribe` threw".
- **Why it matters.** Two normative requirements in one spec document now contradict each other, and the new one is false. This is the iteration-2 WR-01 fix creating a new overclaim while narrowing the old one.
- **A related overclaim.** The module header (`GatesFeed.ts:5-6`) says "a throw is a statement in the snapshot", which has the same problem for the release handle. The header predates the phase, but `:194-197` corrects it only 190 lines later.

**Fix:** State the release handle separately, as BEH-QD-584 does:
```
REQUIREMENT: Nothing the host throws from the registry (`instances`, `subscribe`, the release
             handle) or the questions thunk MUST leave the feed. A throw from `instances`,
             `subscribe` or the thunk is a `Failed { reason }` in the snapshot; a release that
             throws is not stated (BEH-QD-584). A listener given to the feed's own `subscribe`
             is the caller's and is not guarded, so it MUST NOT throw.
```
Record it as revision 1.36 in the change history. Optionally, change `GatesFeed.ts:5-6` to "a throw from `instances`, `subscribe` or the thunk is a statement in the snapshot, never a stop".

### WR-02: The README's listener paragraph names a gates tick as the one silent end, but a listener throw from `configure` or `restart` leaves the timeline or diagnostics feed claiming `Reading` or `Starting` with nothing running

**File:**
- `packages/devtools/README.md:162-167` (reworded in `00729ec2`)
- `packages/devtools/src/model/DiagnosticsFeed.ts:97` and `:149-168`
- `packages/devtools/src/model/TimelineFeed.ts:57` and `:131-143`

**Issue:**
- **What the README says.** "A throw escapes whatever published (`configure`, a tick, or the host registry's own notification), and one thrown on a gates tick ends that feed's questions cadence without a statement." The paragraph opens with "a read that stops is stated in its feed's status instead of leaving a dead fiber". Read together, the reader learns that the only silent end is the gates tick.
- **What the code does.** Both `start` (`DiagnosticsFeed.ts:150-153`) and `readSource` (`TimelineFeed.ts:132-133`) call `runs.begin()`, then publish `Starting` or `Reading`, and only then call `runs.fork`. A listener that throws on that publish escapes before the fork. `view.set` and `status.set` have already stored the new status, so the feed claims a run that was never started. Nothing states this, and nothing recovers it until a later command.
- **What the probes showed** (real modules, `node --experimental-strip-types`):
  1. A diagnostics feed with a throwing listener: `configure({ intervalMillis: 5 })` threw `listener`. After the listener stopped throwing and 60 ms passed, the status was still `Starting`, so no sample was ever taken.
  2. A timeline feed whose source died once (`Stopped`): with a throwing status listener, `status.restart()` threw `listener`. The status then read `Reading`, and the source's read count stayed at 1, so nothing was reading.
- **Two smaller inaccuracies in the same paragraph.**
  - The list of publishers omits `restart`.
  - "a tick" is wrong for two of the three feeds. A throw on a diagnostics sample or a timeline record does not escape anywhere: it is stated as `Stopped`.
- **Why it matters.** This is the ADR-QD-047 amendment 1.13 defect class: a feed that reads as current with nothing running. The README's enumeration tells a headless reader that it cannot happen outside the gates feed.
- **Scope.** The isolation itself stays deferred, as briefed. What is in scope is the doc that this commit rewrote. `DiagnosticsReadout.subscribe`'s doc (`:97`) has the same omission: it covers only a publish from the poll.

**Fix (doc, in scope).** Replace the README sentence with:
```
A `subscribe` listener is yours and is not isolated: it must not throw. A throw while a
record, a sample or a gates tick publishes is stated as that read's stop (the gates
cadence ends without one). A throw while `configure` or `restart` publishes escapes to
the caller before the new read starts, so the feed keeps saying `Reading` or `Starting`
with nothing running until the next command. A throw during the host registry's own
notification escapes into that notification.
```
Mirror the `configure`/`restart` clause in the docs at `DiagnosticsFeed.ts:97` and `TimelineFeed.ts:57`.

**Optional code fix.** This makes the published state honest without isolating listeners, and it touches no dock-visible behaviour, because React listeners do not throw. Fork even when the publish throws:
```ts
// DiagnosticsFeed.ts start()
try {
  show(diagnosticsStarting.status);
} finally {
  runs.fork(token, runDiagnostics(marking, next), { onFailure: … });
}
```
Apply the same `try`/`finally` around `status.set(READING)` in `TimelineFeed.ts` `readSource`.

### WR-03: The new negative type pins in `DiagnosticsStore.tst.ts` cannot fail, because `not.toBeCallableWith` on an Effect-returning function always passes in this repo

**File:** `packages/devtools/test/model/DiagnosticsStore.tst.ts:50` and `:57` (new in this phase); `:45` predates it. The false premise is in `60-03-SUMMARY.md:47-49`.

**Issue:**
- **The pins.**
  - `:50` is `expect(runDiagnostics).type.not.toBeCallableWith(store, { schedule: spaced })`.
  - `:57` is `expect(runDiagnostics).type.not.toBeCallableWith(store, { layer: needs })`.
- **Why they cannot fail.**
  - `5d297faf` found that a *positive* `toBeCallableWith` on an Effect-returning function always fails, because the Effect language service reports the synthesized call as `floatingEffect`. The negative form is the same check inverted, so it always passes.
  - The SUMMARY says "the negative pins … are unaffected". That is false.
  - `packages/core/test/PortAccess.tst.ts:31-38` already documents this exact trap ("`not.toBeCallableWith` would pass") and the `Params<F>` workaround.
- **What the probe showed** (tstyche 7.2.5, TS 6.0.3, `tsconfig` extending `tsconfig.test.json`):
  - `expect(runDiagnostics).type.not.toBeCallableWith(store, {})` **passed**.
  - So did `…(store, { intervalMillis: 5 })`. Both are valid calls.
  - So did a `declare`d Effect-returning function that *accepts* `schedule`.
  - Only a sync function with the same parameters failed, as it should.
- **Effect on coverage.**
  - BEH-QD-639 ("a layer with an unmet requirement MUST be refused at compile time", "MUST NOT carry `schedule`") and INV-QD-366 cite this file as a pin.
  - The behaviour is still guarded *indirectly*, by the exact-shape `toBe` in `surface.tst.ts:293-299`, which fixes `layer?: Layer<never, unknown>` and has no `schedule` key. The named pins themselves prove nothing.
  - The `5d297faf` replacement form (`expect(runDiagnostics(store, { intervalMillis: 500 })).type.toBe<…>()`) is sound, because a bad argument is a compile error in the expression.

**Fix:** Use the repo's existing `Params<F>` form. I checked it in the scratch harness. The three refusals and the positive pin pass, and a deliberate `not.toBeCallableWith(store, { intervalMillis: 500 })` fails, so the form is not vacuous.
```ts
/** Drops the Effect result: the language service reports a call to one as floating, which tstyche reads as "not callable". */
type Params<F> = F extends (...args: infer A) => unknown ? (...args: A) => void : never;

expect<Params<typeof runDiagnostics>>().type.not.toBeCallableWith(store, { questions: () => [] });
expect<Params<typeof runDiagnostics>>().type.not.toBeCallableWith(store, { schedule: spaced });
expect<Params<typeof runDiagnostics>>().type.not.toBeCallableWith(store, { layer: needs });
expect<Params<typeof runDiagnostics>>().type.toBeCallableWith(store, { intervalMillis: 500 });
```
Also correct `60-03-SUMMARY.md`'s claim. Outside this phase, `packages/core/test/DecisionLog.tst.ts:30` (`makeDecisionLog`) looks like the same pattern and is worth one check.

## Info

### IN-01: The README fence never reports the gates feed's `asked` half, so a throwing questions thunk goes unreported

**File:** `packages/devtools/README.md:221`

**Issue:**
- **What the fence does.** `follow(gates.subscribe, () => \`gates: ${gates.getSnapshot().registry._tag}\`)` reports only `registry`.
- **Why that loses information.** `HostInputs` hands over `questions`, and a thunk that throws becomes `AskedRead.Failed` in `asked`. A shell copied from the fence would never say so.
- **Why it matters.** The section is about stating failures rather than hiding them, and the gates feed has no status of its own. Its `Failed` readings are its only statements.

**Fix:** Report both halves, for example:
```ts
follow(gates.subscribe, () => {
  const { registry, asked } = gates.getSnapshot();
  return `gates: ${registry._tag}, questions: ${asked._tag}`;
});
```

---

_Reviewed: 2026-11-19T15:36:10Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
