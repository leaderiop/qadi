---
phase: QD-49-gates-as-the-dock-model-s-eighth-store-one-gate-state-vocabulary
reviewed: 2026-11-16T09:30:00Z
depth: standard
iteration: 2
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
  warning: 1
  info: 3
  total: 4
status: issues_found
---

# Phase QD-49: Code Review Report (iteration 2)

**Reviewed:** 2026-11-16T09:30:00Z
**Depth:** standard
**Files Reviewed:** 46
**Status:** issues_found

## Summary

I re-checked each iteration-1 fix against the source and reviewed the whole non-planning diff (`76330fbd..HEAD`). The six iteration-1 findings are fixed, and the fixes hold except for one gap in the new guard. The 463 tests in `packages/devtools/test/model` and `packages/devtools/test/react` pass.

**Verified as correct**

- **WR-01, the `readGates` guard.**
  - `instances()` is read in exactly one place. A throw there becomes `GatesView.Failed`, so nothing throws out of `rejoin` on the build, `configure`, registry-notification or poll-tick path.
  - The poll fiber is not ended, the other `shownReading` listeners still run (M39), and the build cannot take down a host's layout effect (M37).
  - `configure` is not half-applied for a throwing `instances()` or `subscribe` (M41).
  - Recovery works when the registry mends and announces it (M38) or `configure` hands over a registry that works (M40, M41).
  - A failed `subscribe` is held in `watchFailure` and is deliberately not retried for the same registry object. It is left honestly failed.
- **Reason text.** `Cause.pretty(Cause.die(thrown))` is what `DiagnosticsStatus.Stopped` and `TimelineStatus.Stopped` carry. The panel's `qadi-gates-failed` copy and `colors.error` match `ServicesPanel`'s `qadi-wiring-failed`, and the 49-UI-SPEC amendment names them.
- **`asking: undefined`.** `QuestionRow` is typed for it, the panel renders no unmounted note, highlight or instance rows for it (`QuestionsPanel.tsx`), and `joinQuestions` returns the one `NO_INSTANCES` constant, so the lens points at nothing.
- **IN-02.** `rejoin` returns at once when `closed`, and M36 pins that neither registry is read.
- **IN-03.** `Listed` is `{}`. Only `snapshot.instances` states the list, and M31 and M32 assert it is the registry's own array.
- **IN-04.** `panelInput` writes the snapshot out with `Equal.equals` over policy and resource, in registry order. It matches what `joinQuestions` produces: `Listed()`/`Empty()`/`Absent()`, `asking` as the filtered list or `[]`, and `instances: gates ?? []`.
- **Characterisation and budgets.** `QuestionsPanel.characterisation.test.tsx` was not touched by `a017d7aa..da14a9c5`. The only expected values that moved against the base are the D-12a copy literals. `scripts/` and `.oxlintrc.json` are unchanged against the phase base, so no budget moved.
- **Spec text.** ADR-QD-162 Rev 1.1 decision 5, BEH-QD-583/584 Rev 1.25, the react-integration appendix, INV-QD-343/344 (they cite committed tests, and no `NN-NN` SUMMARY citation remains in `spec/`) and the CCR-QD-440 row all agree with the code. The one exception is the unguarded unsubscribe (WR-01 below).
- **House rules.** I found no `as`, `!`, `any`, `switch` or `console` in the diff. `Match.tagsExhaustive` is hoisted at module scope in `QuestionsPanel.tsx`.

The new finding is that the unguarded unsubscribe is not as harmless as ADR-QD-162 decision 5 leaves it: it re-creates the half-applied `configure` that the fix claims to remove. The rest is stale text, including the leftover the fixer flagged.

## Warnings

### WR-01: A throwing unsubscribe leaves `configure` half-applied and the model stuck, which the ADR and fix report say cannot happen

**File:** `packages/devtools/src/model/DockModel.ts:194-203, 243-247, 208-214`
**Issue:** `watchGates` calls `offGates()` bare as its first statement. If the old registry's unsubscribe throws (host code, the same class as `instances()` and `subscribe`), the following happens inside `configure`:

1. `inputs = next` and `gatesNow = next.gates` are already assigned (lines 232 and 244).
2. `watchGates` throws at line 195, before `offGates` is reset (line 198) and before `watchFailure` is cleared. The new registry is never subscribed to.
3. The throw leaves `configure` before `rejoin()` (line 247), so the snapshot keeps showing the old registry's guards. That throw comes out of `useDockModel`'s `useLayoutEffect`, which is the unmount-the-host failure WR-01 set out to remove.
4. The model is then stuck:
   - `offGates` still holds the throwing function, so every later `configure` with a different registry throws at the same line.
   - A repeat `configure` with the same new registry does nothing, because `next.gates !== gatesNow` is now false. The model never subscribes to it and never re-joins.
   - The finalizer (lines 208-214) calls the same `offGates()` inside `Effect.sync`, so closing the scope ends in a defect.

Decision 5 says the remaining unguarded throw is only "the function `subscribe` returned" and presents it as a minor leftover. The fix report and the ADR also state that a `configure` can no longer be left half applied. Both statements are false for this path. A custom registry is the only way to reach it, since react's unsubscribe cannot throw. It is still the one throw path that the other two guards leave, and the cost of closing it is two lines. No test covers it: M41 counts `releases()` but never makes a release throw.
**Fix:** Clear the handle before calling it, and state a failing unsubscribe the way the other two are stated.

```ts
const watchGates = (registry: GateRegistryLike | undefined) => {
  const release = offGates;
  offGates = () => {};
  watchFailure = undefined;
  try {
    release();
    offGates = closed || registry === undefined ? () => {} : registry.subscribe(rejoin);
  } catch (thrown) {
    watchFailure = reasonOf(thrown);
  }
};
```

Do the same in the finalizer, with `try { release() } catch {}` after `closed = true`, because a closing model has nowhere to state it. Add a double option such as `failRelease`, and an M41 case where `configure` to a second registry still ends with `rejoin` run and the old handle cleared. Then change ADR-QD-162 decision 5 and BEH-QD-584 to say a throwing unsubscribe is stated as `Failed`, not left uncaught.

If you keep it unguarded, decision 5 must say that a throwing unsubscribe leaves the model half-applied and permanently on the old snapshot. Do not claim "`configure` can no longer be left half applied" without that qualifier.

## Info

### IN-01: The header comments in `DiagnosticsFeed.ts` and `DiagnosticsStore.ts` still say gates "stay a plain prop"

**File:** `packages/devtools/src/model/DiagnosticsFeed.ts:74-75`, `packages/devtools/src/model/DiagnosticsStore.ts:34-35`, `spec/decisions/047-a-headless-devtools-model.md:197`
**Issue:** The two source headers say "They are pushed by the host's subscription to `@qadi/react`'s registry and stay a plain prop (AGENTS.md §13)". After this phase gates are a model input that the dock's model subscribes to, and the host does not subscribe. This is the leftover the fixer flagged, and it is confirmed. I found two more places:
- `spec/decisions/047-a-headless-devtools-model.md:197` still reads "gates stay a prop fed by the host's subscription (ADR-QD-080)" in the decision body. The dated Rev 1.16 amendment at the end of the file supersedes it, so this is stale only in the body's own text.
- `spec/process/house-rules-evidence.md:193` ("still fed `gates` as a plain prop") sits in a quoted history blockquote under a correction. It is exempt as change history.

I checked `packages/*/src`, the READMEs, `apps/website/src/content`, `spec/behaviors`, `spec/appendices`, `spec/overview.md` and `examples/*/src`. There is no other live "plain prop" or `useGateInstances()`-for-the-dock claim. The remaining `useGateInstances` hits are the `upgrading.md` "Before" snippet, BEH-QD-585 saying the hook stays for a component that wants the list, and the BEH-QD-217 correction history.
**Fix:** In both headers, replace the sentence with "Gates are not here. They are the dock model's own input (`DockModelInputs.gates`), a registry the model subscribes to (ADR-QD-162)." For ADR-QD-047:197, either edit the sentence to "gates are a model input, ADR-QD-162" or leave it and add a bracketed "(superseded by the 2026-11-16 amendment below)".

### IN-02: The failure reason carries the throw's stack, so the "same reason publishes nothing" dedup depends on the call path

**File:** `packages/devtools/src/model/DockModel.ts:96, 183-190`
**Issue:** `Cause.pretty(Cause.die(thrown))` for an `Error` includes its stack (I checked: the output is the message plus `at …` frames). `rejoin` compares `key.failed` by string, and M38 pins that the same throw publishes nothing. That holds for the double's single `boom` object. A registry that constructs a new `Error` on each read gets a stack that differs by caller: a registry notification, a poll tick and `configure` call `instances()` from different frames. Alternating paths then publish a new `Failed` snapshot each time, though nothing changed that a reader could tell apart. The reason is also shown verbatim in the panel, stack frames and host file paths included. That is consistent with the `Stopped` precedent, so I do not rate it above info.
**Fix:** None needed if the precedent's behaviour is wanted. If the dedup should be by what the registry said, compare `thrown instanceof Error ? thrown.message : String(thrown)` for the key and keep `Cause.pretty` for display. Or note in BEH-QD-583 that "the same reason" means the same rendered text, stack included.

### IN-03: Failed is left in place in two cases the spec does not say: the same registry mends silently, or its `subscribe` starts working

**File:** `packages/devtools/src/model/DockModel.ts:161-168, 243-247`; `spec/behaviors/28-devtools-screens.md` BEH-QD-584
**Issue:** Two recovery paths are honest but unspecified, and neither is tested:
- A registry whose `instances()` threw and then mends without announcing the change stays `Failed` until something else moves. A quiet poll tick keeps `fed` and publishes nothing, so `remerge` never reaches `rejoin`. ADR decision 5 says "reads again and announces it", which is correct. A silent mend is not covered, and the panel gives no hint that the failure is stale.
- A registry whose `subscribe` threw stays failed when `configure` is handed the same object again, because `next.gates !== gatesNow` is false. BEH-QD-584's "a later `configure` with a registry that subscribes MUST recover it" reads as covering that case. The code means a different registry.
**Fix:** Add "a different registry" to the BEH-QD-584 requirement, and one sentence to decision 5 saying a mend that is not announced is not noticed until the questions or a registry change moves. No code change is needed unless a retry is wanted. If it is, `watchGates` could be retried from `rejoin` while `watchFailure` is set. I do not recommend that, because it re-runs host code on every tick.

---

_Reviewed: 2026-11-16T09:30:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
_Iteration: 2_
