---
phase: QD-80-the-highlight-lens-is-a-headless-session-instrument-resolved
reviewed: 2026-11-24T00:00:00Z
depth: standard
iteration: 2
files_reviewed: 19
files_reviewed_list:
  - packages/devtools/src/model/DockModel.ts
  - packages/devtools/src/model/LensSession.ts
  - packages/devtools/src/react/DevtoolsDock.tsx
  - packages/devtools/src/react/Lens.ts
  - packages/devtools/src/react/QuestionsPanel.tsx
  - packages/devtools/src/react/useLens.ts
  - packages/devtools/test/model/ConfigureRule.test.ts
  - packages/devtools/test/model/DockModel.test.ts
  - packages/devtools/test/model/LensSession.test.ts
  - packages/devtools/test/react/Lens.adapter.test.tsx
  - packages/devtools/test/react/Lens.click.test.ts
  - packages/devtools/test/react/Lens.dock.characterisation.test.tsx
  - packages/devtools/test/react/Lens.dock.test.tsx
  - packages/devtools/test/react/QuestionsPanel.gates.test.tsx
  - packages/devtools/test/react/questionsPanelInput.ts
  - packages/react/src/QadiProvider.tsx
  - packages/react/test/GateId.remount.test.tsx
  - packages/react/test/InstrumentToggle.characterisation.test.tsx
  - packages/react/test/QadiProvider.tst.ts
findings:
  critical: 0
  warning: 1
  info: 4
  total: 5
  necessity: 1
status: issues_found
---

# Phase QD-80: Code Review Report (iteration 2)

**Reviewed:** 2026-11-24
**Depth:** standard
**Files Reviewed:** 19
**Status:** issues_found

## Summary

All nine iteration-1 fixes hold. I read the code and the new tests for each, ran the lens suites (7 files, 84 tests, all
pass) and the two react cells, and ran both held-text checks (`80-pinned-check.mjs --all-applied`: 4 of 4;
`80-characterisation-check.mjs --all-flipped`: 4 of 4 and 1 of 1).

- **try/finally click decision (`useLens.ts:73-89`)**: holds. `choose` can throw only out of `store.publish`, after the value
  is held and `armed` is set, so `consumed = true` at entry is the right answer on a throw. When `choose` returns `false`
  nothing is swallowed. The throw still reaches the dispatch. No path swallows a click that made no pick.
- **`gateIdOfClick` (`Lens.ts:207-219`)**: holds. `detail === 0` with an `Element` target is placed by the target, and
  everything else keeps its coordinates. The `Lens.click.test.ts` cells and the adapter cell fail if the rule is reverted.
  The held tests dispatch on `document`, which is not an `Element`, so they still use coordinates.
- **Reveal disarm (`LensSession.ts:155-182`)**: holds. `toggle`, `cancel` and `highlight` clear `armed` before `move`, so a
  no-op still disarms. The reveal cell pins each branch. The panel's unmount exit is `cancel`, so it drops an untaken reveal
  as the changeset says. The StrictMode double effect still takes the reveal once, because a mount-time `cancel` of an idle
  session changes nothing.
- **`useLens` returning the snapshot**: holds. The panel holds one lens subscription, and the adapter cell fails on two.
- **`instrument` removal**: complete. No reader of the field remains in `packages/*/src`, the type pin, the memo deps,
  BEH-QD-740, the overview row, the changeset and the 0.13 upgrade section agree.

One WARNING remains, in the ADR and changeset text. Four INFO items follow. No source defect was found.

## Warnings

### WR-01: ADR-QD-193 Rev 1.2's "What changes for a reader" table and its count do not match the changeset or the code

**File:** `spec/decisions/193-the-highlight-lens-is-a-headless-session-the-dock-model-owns.md` (section "What changes for a
reader", and Consequences item 2); `.changeset/devtools-lens-is-a-headless-session.md:5-12`
**Issue:** The ADR says "Four interaction rules and the instrument toggle change" and "Each row names the test that holds
its after", and Consequence 2 repeats "four". The table has five interaction rows plus the toggle. It has no row for the
keyboard click, which Rev 1.2 added to decision 6 and BEH-QD-737, and the reveal row does not say that a reveal not yet
taken is dropped when the reader leaves the panel or presses a highlight. Those are two of the changeset's six listed
behaviour changes. The changeset's own count is also short by one: it opens "differently in six ways" and its closing
paragraph adds a seventh, that the document listeners are added once per picking session, which is a row in the ADR table
and not in the changeset list. AGENTS.md §11 makes the spec normative and gates it, but no gate checks a count in prose, so
the ADR has two stale claims and the two documents disagree about what changed.
**Fix:** Add two rows to the ADR table, "A click made from the keyboard while picking" with `Lens.adapter.test.tsx` and
`Lens.click.test.ts`, and "A reveal not yet taken" with the reveal cell of `LensSession.test.ts`. Change "Four interaction
rules" to the count of the interaction rows (seven), in the section lead and in Consequence 2. Make the changeset say
"in seven ways" with the listener row as the seventh bullet, or fold the closing paragraph into a bullet. Do it through
`scripts/spec-revise.mjs` as before.

## Info

### IN-01: Impossible-state guard: "`hover` leaves the reveal armed" states a rule over a state that cannot occur

**File:** `packages/devtools/src/model/LensSession.ts:14-17` and `:73-75`; ADR-QD-193 decision 8; BEH-QD-739
**Category:** necessity
**Issue:** The requirement that `hover` MUST NOT disarm a reveal is a rule about a state the session cannot be in. `hover`
acts only from `Picking`. A reveal is armed only by `choose`, which leaves `Picking`, and `toggle` disarms on entering it
(`LensSession.ts:156`). So when `hover` has an effect, `armed` is already `undefined`. The only way the cell reaches the
rule is `kept.session.hover("b")` from `Idle`, where `hover` is a no-op (`LensSession.test.ts:253-257`). That pins that
`hover` has no `armed = undefined` line, which is harmless, but it reads as pinning behaviour while `Picking`. The evidence
is the three call sites above, so it is provable from the repository; it is Info because it is a documentation claim and
removing the sentence is a scope call.
**Fix:** Drop "and `hover` does not" from the doc comments, the ADR and BEH-QD-739, or state that it is vacuous. Keep the
test line, which still stops a future `hover` from disarming.

### IN-02: The throwing-subscriber test pins happy-dom's propagation, and the spec says "reaches the dispatch"

**File:** `packages/devtools/test/react/Lens.adapter.test.tsx:70-90`; BEH-QD-737; ADR-QD-193 decision 6
**Issue:** The cell asserts `thrown === boom` from `target.dispatchEvent(click)`. A browser never throws a listener's error
out of `dispatchEvent`; it reports it to `window.onerror` and carries on. happy-dom 21 throws it out only under its default
`errorCapture` setting (`EventTarget.js` routes it to `window[dispatchError]` under `tryAndCatch`). The property that
matters, that the click stays default-prevented and the failure is not swallowed by `choose`'s caller, is held, since
`defaultPrevented` is asserted. But the test would fail for an unrelated reason if the environment's error capture
changed, and BEH-QD-737's "MUST still reach the dispatch" overstates what a browser does.
**Fix:** Reword the requirement to "is not caught by the adapter", and in the test collect the error with a `window` `error`
listener or accept either outcome, then assert it equals `boom`.

### IN-03: The panel still subscribes to the questions store twice

**File:** `packages/devtools/src/react/QuestionsPanel.tsx:114-116` and `packages/devtools/src/react/useLens.ts:41`
**Issue:** IN-06 of iteration 1 removed the second lens subscription. The same shape remains for `questions`: the panel
calls `useStoreSnapshot(questions)` and `useLens(lens, questions)` calls it again for `instances`. The panel already holds
`snapshot.instances`. The new cell counts only lens subscriptions, so it does not catch this. It costs one extra listener
and no wrong render, so it is Info.
**Fix:** Either leave it and say why in the `useLens` doc comment (the adapter must stand alone, as `Lens.adapter.test.tsx`
mounts it), or let `useLens` take the snapshot's instances and keep reading `questions.getSnapshot()` in the handlers.

### IN-04: `gateIdOfClick` names its first parameter `target`, beside `click.target`

**File:** `packages/devtools/src/react/Lens.ts:207-219`
**Issue:** The `Document` is `target` and the event's element is `click.target`, in the same expression
(`click.target instanceof Element ? ... : gateIdAt(target, ...)`). `gateIdAt` already uses `target: Document`, so it is
consistent, but the pair is easy to misread in a function whose whole point is which target decides.
**Fix:** Rename the first parameter to `doc` in `gateIdOfClick`, or leave it for consistency with `gateIdAt`.

---

_Reviewed: 2026-11-24_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
_Iteration: 2_
