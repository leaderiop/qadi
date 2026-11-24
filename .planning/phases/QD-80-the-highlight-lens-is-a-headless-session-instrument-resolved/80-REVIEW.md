---
phase: QD-80-the-highlight-lens-is-a-headless-session-instrument-resolved
reviewed: 2026-11-24T00:00:00Z
depth: standard
files_reviewed: 16
files_reviewed_list:
  - packages/devtools/src/model/DockModel.ts
  - packages/devtools/src/model/LensSession.ts
  - packages/devtools/src/react/DevtoolsDock.tsx
  - packages/devtools/src/react/QuestionsPanel.tsx
  - packages/devtools/src/react/useLens.ts
  - packages/devtools/test/model/ConfigureRule.test.ts
  - packages/devtools/test/model/DockModel.test.ts
  - packages/devtools/test/model/LensSession.test.ts
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
  warning: 3
  info: 6
  total: 9
status: issues_found
---

# Phase QD-80: Code Review Report

**Reviewed:** 2026-11-24
**Depth:** standard
**Files Reviewed:** 16
**Status:** issues_found

## Summary

The session (`LensSession.ts`) is sound. I traced every row of ADR-QD-193's transition table against the code and found no
mismatch. `Picking` cannot carry a pick. A no-op keeps the snapshot reference and publishes nothing. `armed` is set before
the publish and disarmed by `toggle`. The StrictMode double effect takes the reveal once. `document` is only reached
inside effects. The unmount exit is its own `[lens]` effect, so a highlight that ends picking is not cancelled by it. The
`instrument` removal is complete: the memo, the doc comments and the type pin agree, and nothing else in `packages/react/src`
reads the field.

No critical defect was found. The warnings are two gaps where a normative claim of ADR-QD-193 / BEH-QD-737 has no test
that would fail if the code regressed (the adapter sits outside the `src/model/**` mutation glob, so only DOM tests hold
it), and one place where the "click is consumed iff a pick was made" claim breaks when a store listener throws. The info
items are stale or vacuous held-test text, a keyboard-click edge, an over-claim in a comment, and a reveal that can fire
late.

Necessity: `necessity-review.md` was not loaded for this review, so no necessity findings are emitted and the
`necessity:` count is omitted.

## Warnings

### WR-01: Nothing pins `preventDefault` on the consumed click

**File:** `packages/devtools/src/react/useLens.ts:73`
**Issue:** The capture handler consumes a pick with `event.preventDefault(); event.stopPropagation();`. The tests assert
only that a target-phase listener on the guard does not fire (`pressed === 0`). That exercises `stopPropagation` alone.
`stopPropagation` does not cancel a default action, so a picked submit button or `<a href>` would still submit or
navigate if `preventDefault()` were removed, and no test would fail. `grep defaultPrevented packages/devtools/test`
returns nothing. The comment says "so picking a guarded button does not also press it", and BEH-QD-737 says the click is
"consumed". The adapter is outside the mutation gate, so this survives silently.
**Fix:** Add a test in a new file. The two held test files cannot be edited for this. Dispatch a cancelable click over a
guard while picking and assert `event.defaultPrevented === true`. Beside it, dispatch one over no guard and assert
`defaultPrevented === false`. Use a guarded `<a href="#x">` or a form submit button to show the default action is
suppressed.

### WR-02: Nothing pins that the handlers read the guard list at event time

**File:** `packages/devtools/src/react/useLens.ts:58-59`
**Issue:** ADR-QD-193 decision 6 and D-14 state that "each handler reads `questions.getSnapshot().instances` when the event
arrives". The only test, `Lens.dock.test.tsx` "entering picking adds three document listeners...", checks that no listener
is added or removed when a guard registers. It never picks, or hovers over, the guard that registered after picking began.
A regression that captured the render-time `instances` in the handlers while keeping the deps `[picking, lens, questions]`
would pass every listener-count test and every lens cell, and would leave picking blind to a late guard. That is exactly
the stale-closure class this phase removed the deps to avoid. The old code was correct only because it re-subscribed on
each change.
**Fix:** Add a cell to `Lens.dock.test.tsx`, or to a new file. Enter picking with guard `a`. Add guard `b` through
`double.add`. Point `elementFromPoint` at `b`'s marker. Click the document. Assert the row for `b` is the picked one.
Do the same with `pointermove` and one overlay.

### WR-03: `choose` can record a pick and still not consume the click when a lens listener throws

**File:** `packages/devtools/src/model/LensSession.ts:159-167` and `packages/devtools/src/react/useLens.ts:72-74`
**Issue:** `choose` is documented as "Whether the click is consumed: true only for that move". It sets `armed`, then
calls `store.publish(next)`, then `return true`. `makeExternalStore.notify` deliberately rethrows what a listener threw
(ADR-QD-177). If any subscriber to the lens store throws, `publish` throws after the snapshot is already held and
`armed` is set. `choose` never returns, and the adapter's `if (!lens.choose(...)) return;` is skipped by the exception.
The result is a recorded pick whose click was not swallowed, so the guarded control is pressed as well. That is the
outcome the capture listener exists to prevent. The listeners are React's `useSyncExternalStore` handlers today, so this
is unlikely, but the session is an `ExternalStore` consumers can subscribe to. The headless tests cover a throwing
listener for `ExternalStore` but not for `choose`'s answer.
**Fix:** Decide consumption before notifying, so a listener failure cannot change it. In the adapter, for example, call a
`choose` that returns the answer and defers the notify failure:
```ts
// LensSession.choose
armed = pickedOf(next);
try {
  store.publish(next);
} catch (error) {
  queueMicrotask(() => { throw error; }); // still reported, never changes the answer
}
return true;
```
Alternatively state in the doc comment that a throwing subscriber voids the answer, and pin that. Add a headless cell
either way: subscribe a throwing listener, call `choose`, and assert the return value.

## Info

### IN-01: `InstrumentToggle.characterisation.test.tsx` title and header describe the behaviour that was removed

**File:** `packages/react/test/InstrumentToggle.characterisation.test.tsx:2-8, 20-22`
**Issue:** The test is titled "a memoised consumer of the context renders again when instrument is toggled" and its header
says the consumer "is rendered again when the toggle flips, because the context value carries the flag". The assertion is
now `expect(rendersOnToggle).toBe(0)`. The title and header state the opposite of what the test checks. ADR-QD-193 says the
"assertion is now zero", but a reader of the test alone is misled. This file is held by the characterisation check, so the
text cannot be edited here. A rename needs a declared flip.
**Fix:** Add the corrected title in the new `QadiProvider` test, or add the title and header to the declared-flip list when
the file is next re-baselined.

### IN-02: A held assertion cannot fail, so it does not pin the Escape exit

**File:** `packages/devtools/test/react/QuestionsPanel.gates.test.tsx:359-368` ("leaves the mode on Escape")
**Issue:** The test ends with `assert.notInclude(pickButton.textContent, "Escape —")`. The picking text is "picking —
click a control, or press Escape" and the idle text is "pick a control on the page". Neither contains "Escape —", so the
assertion passes whether or not Escape ended picking. This text is in the span held byte for byte by
`80-pinned-check.mjs`, so it must not be edited. The Escape exit is genuinely pinned by the characterisation cell
"entering picking again drops the pick, and leaving it does not restore it", which asserts the idle text after Escape. The
finding is about the held cell, not an uncovered path.
**Fix:** Do not edit the held cell. The characterisation cell already carries the Escape pin. If it is ever flipped or
re-baselined, keep the Escape assertion there.

### IN-03: A keyboard-initiated click is hit-tested at its recorded coordinates

**File:** `packages/devtools/src/react/useLens.ts:58-59, 68-74`
**Issue:** The capture handler resolves the guard with `gateIdAt(document, event.clientX, event.clientY, ...)`. A click
produced by Enter or Space on a focused control carries `detail === 0`. In browsers that report `0,0` for such a click,
it is hit-tested at the page's top-left corner. A full-page `<Can>` wrapper that contains that corner would make a
keyboard user's Enter on the dock's own toggle or highlight button count as a pick, and be swallowed. The only
keyboard-reachable exit is then Escape. This predates the phase, since the old handler did the same, but ADR-QD-193
re-affirms the capture decision as the model of consumption. I could not verify per-browser coordinates, so this is
conditional.
**Fix:** Ignore `event.detail === 0` in `choose` (a click not produced by a pointer), or hit-test the event's target
instead of its coordinates. The held tests use `fireEvent.click(document, {clientX, clientY})`, which has `detail 0`.
Such a change needs those cells to pass `detail: 1`, and the held files cannot take that edit. Cover it with a new test.

### IN-04: The comment over-claims what a document-capture `stopPropagation` consumes

**File:** `packages/devtools/src/react/useLens.ts:81-82`
**Issue:** "Capture, so the click is intercepted before the page's own handlers see it." A `stopPropagation` on a
`document` capture listener stops the target and bubble phases. It does not stop a `window`-capture listener, which runs
earlier, and it does not stop other `document`-capture listeners registered before this one. An application that listens in
the window or document capture phase (for example analytics, or a router's link interceptor) still sees the click.
BEH-QD-737's wording, "consumed", inherits the same over-claim.
**Fix:** Say "before the page's target and bubble handlers" in the comment and in BEH-QD-737. Use `stopImmediatePropagation`
if swallowing other document-capture listeners is intended.

### IN-05: An armed reveal that no row takes fires later, unasked

**File:** `packages/devtools/src/model/LensSession.ts:136, 164, 177-181`
**Issue:** `armed` is cleared only by `takeReveal` for that id, by a second `choose`, or by `toggle`. `cancel` and `highlight`
do not touch it. If the pick is made while the picked guard has no row (the gates view is `Listed` but the questions view
is `Absent`, `Unsampled` or `Failed`), `armed` stays set. When the questions later arrive and the row first mounts, or on
the next return to the tab, the panel scrolls with no action from the reader. D-06 and decision 8 accept this as "the first
reveal, not a re-fire". The consequence is a late, unattended scroll, and no test covers it.
**Fix:** Either disarm in `cancel()` when it ends a panel visit (the unmount exit already calls it from `Idle`, so it would
disarm any reveal not taken by the time the panel closes), or add a cell stating the intended late-reveal behaviour so a
change to it is visible.

### IN-06: The panel subscribes to the lens twice

**File:** `packages/devtools/src/react/QuestionsPanel.tsx:116-117` and `packages/devtools/src/react/useLens.ts:32`
**Issue:** `useLens` reads `useStoreSnapshot(lens)`, and `QuestionsPanel` then reads `useStoreSnapshot(lens)` again to build
`view`. Two `useSyncExternalStore` subscriptions are held on one store, and the panel's `useLens(...)` call discards the
snapshot the hook already read.
**Fix:** Have `useLens` return the snapshot it read (`: LensSnapshot`) and build `view` from that. The adapter then holds
one subscription.

---

_Reviewed: 2026-11-24_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
