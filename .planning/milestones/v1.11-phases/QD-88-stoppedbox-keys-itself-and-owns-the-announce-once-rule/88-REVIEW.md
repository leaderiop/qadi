---
phase: QD-88-stoppedbox-keys-itself-and-owns-the-announce-once-rule
reviewed: 2026-11-26T01:20:00Z
depth: deep
files_reviewed: 15
files_reviewed_list:
  - packages/devtools/src/model/StopLedger.ts
  - packages/devtools/src/react/StoppedBox.tsx
  - packages/devtools/src/react/useStopNotice.ts
  - packages/devtools/src/react/DiagnosticsNotice.tsx
  - packages/devtools/src/react/TimelineNotice.tsx
  - packages/devtools/test/helpers.ts
  - packages/devtools/test/model/StopLedger.test.ts
  - packages/devtools/test/react/DiagnosticsNotice.test.tsx
  - packages/devtools/test/react/DockFrame.announce.characterisation.test.tsx
  - packages/devtools/test/react/Simulator.broke.test.tsx
  - packages/devtools/test/react/TimelineNotice.test.tsx
  - packages/devtools/test/react/useStopNotice.test.tsx
  - packages/devtools/test/surface.tst.ts
  - .changeset/devtools-stop-box-keys-itself.md
  - spec/decisions/201-a-stop-notices-box-keys-itself-and-owns-the-announce-once-rule.md
findings:
  critical: 0
  warning: 2
  info: 6
  total: 8
  necessity: 0
status: issues_found
---

# Phase 88: Code Review Report

**Reviewed:** 2026-11-26T01:20:00Z
**Depth:** deep (cross-file: `DevtoolsDock.tsx`'s `DockFrame`/`Screen`, `ServicesPanel.tsx`, `QuestionsPanel.tsx` and `useStoreSnapshot.ts` traced as callers; the spec hunks in `spec/behaviors/28-devtools-screens.md`, `spec/invariants.md`, ADR-QD-197's amendment and `spec/traceability.md` read against the code)
**Files Reviewed:** 15 listed. The spec hunks of the 197 amendment, `28-devtools-screens.md` and `invariants.md` were reviewed too, as part of the ADR-QD-201 scope item.
**Status:** issues_found

## Summary

The mechanism is sound. I traced these paths and found no defect in any of them:

- **Key stability across the record.** `stoppedKey` (`StopLedger.ts:29-30`) returns `count + 1` for an unrecorded stop and `count` once it is recorded at `count + 1`. So the record's re-render (`useStopNotice.ts:19-20`, then a new memo, then `Screen`, then `StoppedBox.tsx:93`) gives the same key, and the body that decided `alert` stays mounted. A5 pins this in the DOM, and LAW1/LAW3 pin it in the model.
- **StrictMode.** The doubled render runs the `useState` initializer (`StoppedBox.tsx:108`) twice over the same committed ledger. The re-run layout effect dispatches `recordStop` twice. The queue folds them as `recordStop(recordStop(noStops, s), s)`, which by identity is `recordStop(noStops, s)`, so the count is 1. A1 to A5 cover this under `<StrictMode>`.
- **Effect deps.** `[announced.record, status]` (`StoppedBox.tsx:109`): `record` is a stable `useReducer` dispatch, so the new handle that the record's re-render builds re-runs nothing. A box handed another ledger's `record` re-runs and records there (TN15).
- **Discarded renders.** Nothing is written during render. A sibling that throws (H1), a Suspense hide or reveal, and a hidden `<Activity>` all leave the ledger unrecorded until a layout effect actually mounts. Re-showing re-runs the effect, and that is a no-op on a recorded stop (TN10).
- **Unbounded growth and misidentification.** The ledger is a fixed two-field record. `count` grows by one per newly shown stop, never per render. Identity holds because `useDiagnosticsStatus` and `useStoreSnapshot` read through `useSyncExternalStore`, which needs stable snapshots. A stop that went back to an older identity would announce again, and that is the stated identity rule.
- **Accessibility.** The role is fixed at mount, and a new stop is a new element. `data-announce`, the test ids, the reason `pre` outside the alert and the focus targets are byte-identical to the base.
- **House rules.** Effect imports are namespaced, relative imports use `.ts`/`.tsx`, and there is no `as`, `!`, `any`, `switch`, `useRef` or `.current` on the stop path. `model/StopLedger.ts` has no React and no JSX, and inside `src` only `StoppedBox.tsx:20` and `useStopNotice.ts:14` import it.
- **Verification run.** I ran the six new and edited devtools test files: 57 of 57 tests pass.

There are no Critical findings. The two Warnings are a normative spec requirement that the code does not meet, and a doc comment that contradicts the ADR's measured cost. The six Infos are a fragile effect return, stale or imprecise prose, and style drift.

## Warnings

### WR-01: BEH-QD-779 and ADR-QD-201 decision 3 require the box to receive the hook's memoised value, but every caller spreads it into a fresh props object

**File:** `packages/devtools/src/react/DevtoolsDock.tsx:263`, `packages/devtools/src/react/ServicesPanel.tsx:96`, `packages/devtools/src/react/QuestionsPanel.tsx:126`, `packages/devtools/src/react/TimelineNotice.tsx:44`, `packages/devtools/src/react/DiagnosticsNotice.tsx:97-98`; spec `spec/behaviors/28-devtools-screens.md` (BEH-QD-779 REQUIREMENT 3), `spec/decisions/201-a-stop-notices-box-keys-itself-and-owns-the-announce-once-rule.md:66-67`

**Issue:** BEH-QD-779 states: "The hook, the notice and the box MUST share one value: the props the hook returns, whole, which MUST be the same value across a render that changes nothing it holds". ADR-QD-201 decision 3 says each notice's arm takes "the notice props whole, the memoised value the hook returns". The code does not do this. `Screen` renders `<TimelineNotice {...props.timeline} />`, and both panels render `<DiagnosticsNotice {...diagnostics} />`. JSX spread builds a new props object on every render. The notices then hand that object on (`noticeOf(notice.status)(notice)`), so `StoppedBox` and `StoppedBody` receive a different `notice` object each render. Only the nested `announced` handle keeps the hook's identity.

Nothing breaks today, because the body's effect is keyed on `announced.record` and `status`, never on `notice`. But a MUST in the normative spec is false. Its pin, H3 (`useStopNotice.test.tsx:105-119`), only checks the hook's return value and never the hops from notice to box. AGENTS.md §11 says code follows the spec, and a later change that keys something on `notice` identity would trust this requirement and churn on every render.

**Fix:** The identity of the outer object has no consumer, so pinning it would be a phantom requirement. Restate the spec to match the code:

```text
REQUIREMENT: The hook MUST return one value across a render that changes nothing it holds, and a new value for a new
             stop or a new restart; the notice MUST hand the box the fields it was given, whole, and the box MUST
             receive the hook's `announced` handle by identity.
```

Apply the same wording to ADR-QD-201 decision 3 ("the fields of the memoised value, with its `announced` handle by identity") and to the BEH-QD-779 title and traceability row ("handed … as one value"). If the identity is wanted, the other fix is to change both notices to take `{ readonly notice: StopNoticeProps<S> }` and pass `notice={props.timeline}` / `notice={diagnostics}` at the three call sites, then add an H-row that asserts the box's `notice` is the hook's value.

### WR-02: `recordStop`'s doc says no render follows a repeat record, which ADR-QD-201's measured cost contradicts

**File:** `packages/devtools/src/model/StopLedger.ts:42-43`

**Issue:** The doc says: "It returns the same ledger for a known stop, so a repeated record makes no new state and no render follows it." `useReducer` has no eager bail-out (88-CONTEXT D-06a). A dispatch that the reducer answers with the same ledger still schedules the owning component, and React calls `DockFrame` before it bails out. ADR-QD-201 decision 7 says exactly this: "a remount for a recorded stop, or an `Activity` show, costs one `DockFrame` function call and renders nothing below it". This comment sits on the one measured module, and a reader who trusts it would be wrong about the cost the ADR records, for example when deciding whether a record in a hot path is free.

**Fix:**
```ts
/**
 * The ledger after a stop is recorded.
 *
 * It returns the same ledger for a known stop, so a repeated record makes no new state: the
 * frame that holds it is called once and React renders nothing below it (ADR-QD-201).
 */
```

## Info

### IN-01: The layout effect returns `record`'s result, so a `record` that returns a function becomes a cleanup

**File:** `packages/devtools/src/react/StoppedBox.tsx:109`

**Issue:** `useLayoutEffect(() => announced.record(status), …)` returns whatever `record` returns. The type `(status: S) => void` accepts any function, whatever it returns, because a function returning a value is assignable to one returning `void`. A test double such as `record: (s) => seen.add(s)` would make React warn about a non-function effect return. A `record` that returns a function would be called as the effect's cleanup. The base wrote a block body that returned nothing. The dispatch returns `undefined` today, so this is robustness only.

**Fix:** `useLayoutEffect(() => { announced.record(status); }, [announced.record, status]);`

### IN-02: ADR-QD-197 decision 4's amendment affirms a sentence the move made stale

**File:** `spec/decisions/197-a-configurable-value-one-questions-path-for-the-lens-and-one-stop-ledger.md:89, 97-98`

**Issue:** Decision 4 still says "`StopNoticeProps<S>` is declared once in `StoppedBox.tsx` beside `StopLedger<S>`". The amendment then says "The rest of this decision is as it was written". `StopLedger<S>` now lives in `model/StopLedger.ts`, and the type beside `StopNoticeProps` is now `AnnouncedStops<S>`.

**Fix:** Add one clause to the amendment: "`StopLedger<S>` and `noStops` moved to `model/StopLedger.ts`; `AnnouncedStops<S>` is declared beside `StopNoticeProps<S>`."

### IN-03: The ledger docs say "distinct stops" and "the stops the notice has shown", but the ledger counts changes and holds only the last stop

**File:** `packages/devtools/src/model/StopLedger.ts:10`, `packages/devtools/src/react/StoppedBox.tsx:40`

**Issue:** "how many distinct stops boxes have shown": recording A, then B, then A gives `count` 3 over two distinct stops. LAW3 (`StopLedger.test.ts:102`) correctly says "the count equals the number of changes". `StopNoticeProps.announced`'s doc, "The stops the notice has shown", suggests a set, but the ledger keeps one stop.

**Fix:** Write "how many times the shown stop has changed", and "The last stop a box of this feed showed, and the call that records one".

### IN-04: "Only the box and the hook import it" is stated without its `src` qualifier

**File:** `spec/decisions/201-a-stop-notices-box-keys-itself-and-owns-the-announce-once-rule.md:61-62`; BEH-QD-778 (`spec/behaviors/28-devtools-screens.md`, "only the box and the hook import it")

**Issue:** `test/helpers.ts:14`, `DiagnosticsNotice.test.tsx:15`, `TimelineNotice.test.tsx:19`, `Simulator.broke.test.tsx:24` and `StopLedger.test.ts:11-12` also import the module. The phase's shape judge (D-17) checks `src` only, so the ADR's unqualified sentence is broader than what is enforced.

**Fix:** Write "and in `packages/devtools/src` only `StoppedBox.tsx` and `useStopNotice.ts` import it".

### IN-05: The ADR-QD-201 audit says every other row is untouched, but the shared fixtures under eight more rows changed meaning

**File:** `spec/decisions/201-a-stop-notices-box-keys-itself-and-owns-the-announce-once-rule.md:99-100`; `packages/devtools/test/react/DiagnosticsNotice.test.tsx:21`, `packages/devtools/test/react/TimelineNotice.test.tsx:75`, `packages/devtools/test/helpers.ts:225`

**Issue:** `freshRef()` and `ledger()` used to return a ref that the box wrote into. They now return a handle whose `record` keeps nothing. The bodies of N4 to N8, N11, N13, TN11 and TN12 are byte-identical, but their fixture went from recording to non-recording. None of those rows asserts a revisit, so no property is lost. The audit's "every other row of those files is untouched" still hides a change in their fixture. The TN14 title, "does not count it twice", also names a count the row no longer reads (it now reads element identity).

**Fix:** Add one sentence to the audit: "`freshRef` and `ledger()` now return a fixed handle whose `record` keeps nothing; the rows that use them assert copy, focus and style, never a revisit."

### IN-06: The edited files drift from house formatting

**File:** `packages/devtools/src/react/DiagnosticsNotice.tsx:74`, `packages/devtools/src/react/TimelineNotice.tsx:25`, `packages/devtools/src/react/useStopNotice.ts:20`, `packages/devtools/src/react/StoppedBox.tsx:16,27,107`

**Issue:** The `noticeOf` declarations run to about 125 to 130 columns, and `useStopNotice`'s return line to about 118, against the ~90-column hand wrap in AGENTS.md §17. `StoppedBox.tsx` and `useStopNotice.ts` now write "AGENTS.md section 9/13", while `DiagnosticsNotice.tsx:15`, `TimelineNotice.tsx:9` and the rest of the package write "§9". This is cosmetic.

**Fix:** Wrap the three lines at the arrow or the dependency array, and use one citation form throughout the package.

---

_Reviewed: 2026-11-26T01:20:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: deep_
