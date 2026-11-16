---
phase: QD-49-gates-as-the-dock-model-s-eighth-store-one-gate-state-vocabulary
reviewed: 2026-11-16T10:45:00Z
depth: standard
iteration: 3
files_reviewed: 46
files_reviewed_list:
  - .changeset/devtools-feed-hands-the-gate-registry.md
  - .changeset/dock-takes-the-gate-registry.md
  - .changeset/gate-states-stated-once.md
  - apps/website/src/content/docs/docs/packages/devtools.md
  - apps/website/src/content/docs/docs/packages/react/hooks.md
  - apps/website/src/content/docs/docs/reference/upgrading.md
  - examples/nextjs-newsroom/test/dock-wiring.test.tsx
  - packages/core/src/GateState.ts
  - packages/core/src/index.ts
  - packages/core/test/GateState.test.ts
  - packages/core/test/GateState.tst.ts
  - packages/devtools/README.md
  - packages/devtools/src/index.ts
  - packages/devtools/src/model/DiagnosticsFeed.ts
  - packages/devtools/src/model/DiagnosticsStore.ts
  - packages/devtools/src/model/DockModel.ts
  - packages/devtools/src/model/Gates.ts
  - packages/devtools/src/react/DevtoolsDock.tsx
  - packages/devtools/src/react/QuestionsPanel.tsx
  - packages/devtools/src/react/useDockModel.ts
  - packages/devtools/test/gateRegistryDouble.ts
  - packages/devtools/test/model/DockModel.test.ts
  - packages/devtools/test/model/Gates.test.ts
  - packages/devtools/test/react/DevtoolsDock.test.tsx
  - packages/devtools/test/react/QuestionsPanel.characterisation.test.tsx
  - packages/devtools/test/react/QuestionsPanel.gates.test.tsx
  - packages/devtools/test/react/QuestionsPanel.test.tsx
  - packages/devtools/test/react/VerdictTreatment.test.tsx
  - packages/devtools/test/react/gatesProp.ts
  - packages/devtools/test/react/questionsPanelInput.ts
  - packages/devtools/test/surface.tst.ts
  - packages/react/README.md
  - packages/react/src/DecisionOutcome.ts
  - packages/react/src/DevtoolsFeed.ts
  - packages/react/src/GateWriter.ts
  - packages/react/test/DecisionOutcome.tst.ts
  - packages/react/test/DevtoolsFeed.test.tsx
  - spec/README.md
  - spec/appendices/react-integration.md
  - spec/behaviors/09-react.md
  - spec/behaviors/28-devtools-screens.md
  - spec/decisions/047-a-headless-devtools-model.md
  - spec/decisions/053-a-gate-can-be-found.md
  - spec/decisions/162-gates-are-the-dock-models-eighth-store-and-their-states-are-stated-once.md
  - spec/decisions/index.yaml
  - spec/invariants.md
  - spec/overview.md
  - spec/traceability.md
findings:
  critical: 0
  warning: 0
  info: 6
  total: 6
status: issues_found
---

# Phase QD-49: Code Review Report (iteration 3)

**Reviewed:** 2026-11-16T10:45:00Z
**Depth:** standard
**Files Reviewed:** 46
**Status:** issues_found

## Summary

I checked the three iteration-2 fixes against the source and re-reviewed the whole non-planning diff (`76330fbd..HEAD`). I found no critical issues and no warnings. The six findings below are all info: stale spec text, one weak spot in a guard, and design judgements the fixer already wrote down.

I ran the devtools model and react suites (62 files, 1510 tests, all pass). I also re-ran Stryker on `DockModel.ts` alone: 117 killed, 0 survived, score 100.00.

**Verified as correct**

- **WR-01 (`8aceb349`), release of the old subscription.**
  - `watchGates` moves the handle out of `offGates` before calling it. The release and the new `subscribe` are two separate `try` blocks.
  - A throwing release therefore cannot skip the new subscription or the `rejoin`, and it cannot run again on a later `configure` or on close.
  - A failed `subscribe` overwrites the release failure, so `Failed` names the registry the model now reads.
  - The finalizer sets `closed` first, takes the handle out, and swallows the throw. I think swallowing is right: a closing model has no store left to state it in, and the scope must still close (M42 b pins that).
  - Both M42 cases fail with the source reverted, per the fixer. I did not revert them myself.
- **IN-02 (`02aa3fca`), the failure key.**
  - `failureKey` is `name: message` for an `Error` and the rendered reason for anything else.
  - Two genuinely different failures with the same name and message are merged, and the panel keeps showing the first one's stack. That is the stated trade-off and I accept it: nobody can tell them apart from the panel.
  - Failure to recovery, failure to `Absent`, and failure to a different failure all publish, because the key is compared separately from `gates`.
- **IN-03 (`f0e8ee6c`), the retry.**
  - `configure` re-watches when `next.gates !== gatesNow || watchFailure !== undefined`.
  - A working watch is never subscribed twice, because `watchFailure` is `undefined` and the registry has not changed.
  - A silent mend stays `Failed`. A quiet poll tick reads nothing, so it is read at the next registry notification, a poll that changed the questions, or any `configure`. BEH-QD-584 and ADR-QD-162 decision 5 (Rev 1.4) say exactly that, and M44 pins it.
- **Iteration-1 fixes.**
  - No throw from `instances()` or `subscribe` reaches the host, a layout effect, or another store's listener. This holds on the build, `configure`, a registry notification and a poll tick (M37 to M41).
  - `configure` is never half applied.
  - Recovery restores a `Listed` view.
  - The lens gets `NO_INSTANCES` while the view is `Failed`.
  - A row with `asking: undefined` renders no unmounted note, no highlight and no instance rows.
- **`IN-04` and the characterisation.**
  - `panelInput` still matches `joinQuestions` output.
  - The characterisation test was not touched by the fixes.
  - The only moved expected values are the D-12a copy literals.
- **Stale claims.**
  - `DiagnosticsStore.ts` and `DiagnosticsFeed.ts` no longer say gates "stay a plain prop". I grepped `packages/*/src`, the READMEs, `apps/website/src/content`, `spec/behaviors`, `spec/appendices`, `spec/overview.md` and `examples/*/src`.
  - What is left is history under an explicit correction: `spec/behaviors/28-devtools-screens.md:372,379`, `spec/decisions/047-a-headless-devtools-model.md:197` (superseded by its own amendment), the `upgrading.md` "Before" snippet, and the react-integration appendix, which now says `gates.instances()`.
  - The `useGateInstances()` mention in `QadiAtoms.ts:132` is about the hook for a component, which still exists.
- **House rules.**
  - I found no `as`, `!`, `any`, `switch` or `console` in the phase's `packages/*/src` diff.
  - `Match.tagsExhaustive` is hoisted at module scope in `QuestionsPanel.tsx`.
  - `scripts/` and `.oxlintrc.json` are unchanged against the phase base, so no budget moved.
  - oxlint is clean on the changed model, panel and test files.

## Info

### IN-01: `reasonOf` is the one step inside the guard that can still throw

**File:** `packages/devtools/src/model/DockModel.ts:96, 169-170, 211, 216`
**Issue:** Each `catch` block calls `reasonOf(thrown)`, which is `Cause.pretty(Cause.die(thrown))`. For an ordinary `Error`, a string, `null`, a circular object, a null-prototype object or a bigint it returns a string. I ran these through `Cause.pretty` and all of them returned text. A thrown value whose own properties throw on access, such as a Proxy or an object with a throwing `message` getter, makes `Cause.pretty` throw, and that throw leaves the `catch`. In `readGates` it escapes `rejoin`, then the registry notification, the poll tick or the layout effect. That is the path the guard exists to close. A registry would have to throw such an object, which is very unlikely, so I rate this info.
**Fix:** If the guarantee should be absolute, make `reasonOf` total:

```ts
const reasonOf = (thrown: unknown): string => {
  try {
    return Cause.pretty(Cause.die(thrown));
  } catch {
    return "The registry threw a value that could not be described.";
  }
};
```

Otherwise leave it and let decision 5 say "any throw whose value `Cause.pretty` can render".

### IN-02: A failed release is stated with copy that says the registry "threw when it was read", and it stays `Failed` while the new registry works

**File:** `packages/devtools/src/model/DockModel.ts:204-218, 264-267`; `packages/devtools/src/react/QuestionsPanel.tsx` (`qadi-gates-failed` copy)
**Issue:** After a swap `a` to `b` where `a`'s unsubscribe throws, `b` is subscribed and works, yet the model holds `watchFailure` and stays `Failed`. The new registry's notifications call `rejoin`, which sees `watchFailure` and keeps the failure. Only a `configure` clears it. In a real host `atoms.gates` is stable, so `configure` does not run again. The panel stays in "The registry handed to the dock threw when it was read, so who is asking cannot be shown: …" for the rest of the dock's life. That sentence is wrong for a failed release or a failed `subscribe`, because nothing was read. ADR-QD-162 decision 5 documents the choice and `@qadi/react`'s own unsubscribe cannot throw, so this only affects a custom registry and I do not rate it above info.
**Fix:** Either do not let a release failure outlast the swap, because it concerns a registry the model has left:

```ts
catch (thrown) { if (registry === undefined) watchFailure = reasonOf(thrown); }
```

or keep it and make the copy say what threw. For example carry a `watch` flag in `GatesView.Failed` and render "The registry handed to the dock threw when it was subscribed to or released: …".

### IN-03: A watch failure is not compared by name and message, so a retry on another call path can publish an identical failure

**File:** `packages/devtools/src/model/DockModel.ts:161-165, 211, 216`
**Issue:** IN-02 of iteration 2 made `failureKey` the error's name and message, so the same throw from another call path publishes nothing. `readGates` sets `failureKey = watchFailure` for a failed watch, and `watchFailure` is the full rendered reason, stack included. A `subscribe` that throws a fresh `Error` each call is first called from the build and then from `configure`. The two stacks differ, so the first retry publishes a new `Failed` snapshot for a failure nobody can tell apart. BEH-QD-583 says the same failure "MUST publish nothing". The cost is one extra notification, so this is info.
**Fix:** Keep a separate key for the watch failure:

```ts
let watchKey: string | undefined;
const keyOf = (thrown: unknown): string =>
  thrown instanceof Error ? `${thrown.name}: ${thrown.message}` : reasonOf(thrown);
// in the two watch catches: watchFailure = reasonOf(thrown); watchKey = keyOf(thrown);
// in readGates: failureKey = watchKey
```

and reuse `keyOf` in the `instances()` catch.

### IN-04: The `instanceof Error` branch of `failureKey` is not tested, and the mutation tool cannot see that

**File:** `packages/devtools/src/model/DockModel.ts:169`; `packages/devtools/test/model/DockModel.test.ts` (M38)
**Issue:** `failureKey` is `thrown instanceof Error ? name: message : reasonOf(thrown)`. Every test throws an `Error` (`boom`, `new Error("registry exploded")`), so the second arm never runs. Stryker reports 117 of 117 killed, but I read the mutant list for this line and it has only the template-literal mutant, with no `ConditionalExpression` mutant for the ternary. The 100% score therefore says nothing about the non-`Error` arm. If that arm broke, two different thrown strings would be merged, or one string would publish on every read, and no test would fail.
**Fix:** Add one case to M38: throw a string, then a different string, and assert one `Failed` snapshot for the first and a new one for the second. Then throw the first string again from another path and assert nothing is published.

### IN-05: `configure` reads and publishes with the old registry before it swaps in the new one

**File:** `packages/devtools/src/model/DockModel.ts:260-267`
**Issue:** `configure` calls `remerge()` at line 262 and only then sets `gatesNow = next.gates` and re-watches. When `next.reading` changed, `remerge` reaches `shownReading.set`, so `rejoin` runs. It reads the old registry's `instances()` and publishes a snapshot that joins the new questions to the old guards. The swap then publishes a second snapshot. Two synchronous notifications go out, the first with a registry the host has just handed away. If the host has already torn that registry down and its `instances()` throws, the first snapshot is `Failed` and the second recovers. React's `useSyncExternalStore` reads once after the layout effect, so a reader never sees it, but a test or a non-React listener does, and it runs host code on a registry the host has left.
**Fix:** Take the swap first, then remerge:

```ts
if (next.gates !== gatesNow || watchFailure !== undefined) {
  gatesNow = next.gates;
  watchGates(gatesNow);
}
remerge();
rejoin();
```

If you keep the order, note it in the `configure` comment.

### IN-06: Spec text did not follow iteration 2 in INV-QD-343, and BEH-QD-584's first requirement overreaches

**File:** `spec/invariants.md:3965, 3971`; `spec/behaviors/28-devtools-screens.md` (BEH-QD-584 requirement 2); `spec/traceability.md` (Rev 1.205 history)
**Issue:** Three small mismatches against the code and the rest of the spec.
- INV-QD-343's statement says a recompute that finds "the same failure reason" keeps the snapshot. BEH-QD-583 Rev 1.27 and decision 5 say the failure is compared by an error's name and message, not the rendered reason.
- INV-QD-343's enforcement cites "`DockModel.test.ts` M36 to M41, each of which fails with the guard it pins removed (the guarded read, the guarded subscribe, or the closed check)". Iteration 2 added M42 to M44 (the release guard, the retry and the silent mend) and the revised M38, and BEH-QD-584 already cites M42 to M44.
- BEH-QD-584's second requirement says "with the same registry it MUST NOT subscribe again". Since IN-03 a `configure` with the same registry after a failed watch does subscribe again, and the failed-watch requirement below it says so. The first needs "after a watch that worked".
- The traceability history (Rev 1.205) and the DockModel.test.ts row stop at iteration 1.

**Fix:** Edit the INV-QD-343 statement to "the same failure (an error's name and message)". Change its enforcement to "M36 to M44". Qualify the BEH-QD-584 requirement with "after a watch that worked". Add the M42 to M44 rows to the traceability entry. Bump all three through `scripts/spec-revise.mjs`.

---

_Reviewed: 2026-11-16T10:45:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
_Iteration: 3_
