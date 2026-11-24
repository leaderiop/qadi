---
phase: QD-80-the-highlight-lens-is-a-headless-session-instrument-resolved
reviewed: 2026-11-24T00:00:00Z
depth: standard
iteration: 3
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
  info: 1
  total: 2
  necessity: 1
status: issues_found
---

# Phase QD-80: Code Review Report (iteration 3)

**Reviewed:** 2026-11-24
**Depth:** standard
**Files Reviewed:** 19
**Status:** issues_found

## Summary

I re-read the five iteration-2 fixes in the code and in the spec text. I ran the lens suites (`LensSession.test.ts`,
`DockModel.test.ts`, every file under `test/react`: 36 files, 500 tests, all pass). Both held-text checks pass:
`80-pinned-check.mjs --all-applied` reports 4 of 4, and `80-characterisation-check.mjs --all-flipped` reports 4 of 4
(devtools) and 1 of 1 (react). I also checked every test title quoted in ADR-QD-193 Rev 1.7 and BEH-QD-736..740 against
the test files, and the counts (seven interaction rows plus the toggle, ten stores, six commands, seven changeset
bullets, three `gateIdOfClick` cells).

**The five fixes hold, with no regression in the code.**

- **`useLens(lens, questions, instances)`** (`useLens.ts:37-41`). The draw effect keeps `[highlighted, instances]`
  (line 60). `instances` is `snapshot.instances` from the panel's own `useStoreSnapshot(questions)`
  (`QuestionsPanel.tsx:114-118`), the same reference the hook used to read for itself, so the overlay still follows the
  guards. Both handlers still read `questions.getSnapshot().instances` when the event arrives (lines 72 and 80), and the
  listener effect keeps `[picking, lens, questions]`. `QuestionsPanel` is the only caller. The new cell counts the panel's
  subscriptions to the questions store (1 while mounted, 0 after) and was seen failing first.
- **The either-channel error cell** (`Lens.adapter.test.tsx:70-90`). It collects the error from a throw out of
  `dispatchEvent` or from a `window` `error` event, so it holds in happy-dom and in jsdom. It asserts the pick, the
  default-prevented click and that `boom` surfaced. The handler's `try/finally` (`useLens.ts:83-91`) still swallows the click
  and does not catch the failure. A throw before the `try` (inside `gateIdOfClick`) swallows nothing, which is right.
- **`gateIdOfClick(doc, …)`** (`Lens.ts:207-219`). Rename only. `gateIdAt` and the three `Lens.click.test.ts` cells are
  unchanged.
- **The reveal disarm** (`LensSession.ts:157-189`). It is unchanged, and the row effect (`QuestionsPanel.tsx:276`) takes the
  reveal under StrictMode once.
- **ADR-QD-193 Rev 1.7, the changesets and BEH-QD-736..739.** The counts and quoted titles agree with the code. One citation
  is stale (WR-01), and one reachability claim is not supported (IN-01).

No source defect was found.

## Warnings

### WR-01: ADR-QD-193 and BEH-QD-740 quote a test title that no longer exists

**File:** `spec/decisions/193-the-highlight-lens-is-a-headless-session-the-dock-model-owns.md:199` (the "Toggling `instrument`"
row); `spec/behaviors/09-react.md:1055-1056` (BEH-QD-740, "Pinned by")
**Issue:** Both documents name the characterisation cell `"a memoised consumer of the context renders again when instrument is
toggled"` and gloss it "its assertion is the render count, now zero". Iteration 1's commit `79273c7b` renamed that cell to
`"a memoised consumer of the context does not render again when instrument is toggled"`
(`InstrumentToggle.characterisation.test.tsx:20`) and recorded the rename as the declared flip in
`80-characterisation-check.mjs:62-74`. The title quoted in the spec is the pre-flip one and matches no test.
AGENTS.md §11 makes `spec/` normative, and a reader who searches the quoted title finds nothing. No gate catches it,
because `verify-traceability.sh` does not match quoted titles, which is why `spec:verify:strict` stays green. The test
file is held text with one declared title flip, so the fix is in the spec only.
**Fix:** In both places quote the current title, `"a memoised consumer of the context does not render again when instrument
is toggled"`. Drop the "whose assertion is a render count of zero" and "its assertion is the render count, now zero"
glosses, which existed to explain the old title. Revise through `scripts/spec-revise.mjs` as before.

## Info

### IN-01: The "a hover can arrive in `Idle` with the reveal armed" claim is not supported by React's flush order

**File:** `packages/devtools/src/model/LensSession.ts:14-18` and `:73-77`; ADR-QD-193 decision 2 (the "`hover` and `choose`
from `Idle` reach the session…" sentence) and decision 8; BEH-QD-736 (last paragraph) and BEH-QD-739
**Category:** necessity
**Issue:** Iteration 2 kept the rule "a `hover` leaves the reveal and moves nothing from `Idle`" and restated it as reachable.
Its reasoning is that `choose` publishes `Idle` and the `pointermove` listener "stays attached until React commits that
snapshot, so a pointer move can still arrive in it". The window exists, but no user event can land in it. The publish comes
from the document's capture `click` listener. A `useSyncExternalStore` update is a sync-lane update that React processes in
the microtask checkpoint right after that listener returns. A sync-lane commit flushes its passive effects in the same
commit (`react-dom@19.3.1`, `react-dom-client.development.js:20016`: `0 !== (pendingEffectsLanes & 3) && flushPendingEffects()`).
The `pointermove` and `click` listeners are removed (the cleanup of the effect at `useLens.ts:64-111`) before the next task,
so the next real pointer or click event finds none. The state can only be entered by a script that dispatches a second event
inside the same task as the click. I did not run a test that dispatches in one task, so the unreachability for user input
rests on the React source above, and the sync-lane classification of a store update on React's documented behaviour.
The rule is harmless and the test cell is cheap, but ADR decision 8's "so a pointer move can still arrive in it" and
the changed decision 2 and BEH-QD-736 sentences ("reached by the adapter … between a pick and its listeners coming off")
imply a user-reachable state. Iteration 1's finding was that the state was not reachable, and the iteration 2 edit moved the
claim without adding evidence for it.
**Fix:** State what is true. The session is defended against `hover` and `choose` from `Idle` because it is a public-to-the-package
API and a headless caller or a script can send them, not because a user's pointer can. Reword the five places
(`LensSession.ts` doc comments, ADR decisions 2 and 8, BEH-QD-736, BEH-QD-739) to "reached only headlessly, or by a script
that dispatches a second event in the click's task". Keep the test line that pins that `hover` does not disarm.

---

_Reviewed: 2026-11-24_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
_Iteration: 3_
