# ADR-QD-201 — A stop notice's box keys itself and owns the announce-once rule

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-ADR-201                                   |
> | Revision       | 1.0                                            |
> | Effective Date | 2026-11-26                                     |
> | Status         | Accepted — amends ADR-QD-197                   |
> | Author         | Qadi Engineering                               |
> | Classification | Architecture Decision Record                   |
> | Change History | 1.0 (2026-11-26): Initial (ARCH-135, CCR-QD-480) |

---

## Context

The dock shows a feed's stop in one box, `StoppedBox`, and announces each stop once: the box's `role="alert"` is fixed when it
mounts, a second stop is a new mount, and a remount for a stop already announced (a tab switch) stays silent
([BEH-QD-509](../behaviors/28-devtools-screens.md#beh-qd-509-every-screen-that-reads-the-diagnostics-states-its-status-the-same-way)).
The rule was spread over four files, and it read a ref during render twice.

- **The ledger and its functions sat in a React file.** `StoppedBox.tsx` declared `StopLedger<S>`, `noStops` and `stoppedKey`.
  The mutation run measures `packages/devtools/src/model/**` and reaches no file under `src/react`, so the one real decision,
  when a stop announces, was held by no measurement.
- **The callers read the ref to key the box.** `TimelineNotice` and `DiagnosticsNotice` each passed
  `key={stoppedKey(announced.current, status)}`, a read of a ref in render, and threaded `announced` through a private `Binding`
  into a curried arm.
- **The box read the ref to decide its alert.** It decided with `useState(() => announced.current.stop !== status)`, a second
  read of the ref in render, because a `useState` initializer runs during render.
- **The hook held the ledger as a ref.** `useStopNotice` held `useRef<StopLedger<S>>(noStops)` and memoised
  `{ status, onRestart, announced }` ([ADR-QD-197](./197-a-configurable-value-one-questions-path-for-the-lens-and-one-stop-ledger.md)
  decision 4).

None was a defect a user could see. A render React discards, or a doubled render under StrictMode, read a ref no commit had
written, so the rule that nothing is announced twice held because of how the ref happened to be read, and not by structure.

## Decision

1. **The ledger is React state, one per feed, and no ref is read or written on the stop path.** `useStopNotice<S>(status,
   onRestart): StopNoticeProps<S>` holds `const [ledger, record] = useReducer(recordStop, noStops)` and returns a `useMemo` of
   `{ status, onRestart, announced: { ledger, record } }` keyed on `[status, onRestart, ledger, record]`. Its signature is
   unchanged, so `DockFrame` calls it once per feed as before: each feed has its own reducer, held above every screen, so it
   outlives them and a tab switch never re-announces. It is one reducer per feed and never one for both, because a second stop of
   one feed would then re-announce the other, which [ADR-QD-197](./197-a-configurable-value-one-questions-path-for-the-lens-and-one-stop-ledger.md)
   rejected for the ref and still holds for the reducer. The memo follows the feed's `restart` as well as its status, so a model
   rebuilt after a hidden `Activity` hands the notice the rebuilt `restart`. `StopNoticeProps<S>` keeps its name and its home in
   `StoppedBox.tsx`, `DiagnosticsNoticeProps` and `TimelineNoticeProps` stay its aliases, and its `announced` field is
   `AnnouncedStops<S> = { readonly ledger: StopLedger<S>; readonly record: (status: S) => void }`, declared beside it because
   `record` is a dispatch. It is immutable, so a caller that reads it reads a value React holds and never a mutable `.current`.

2. **One pure, React-free module states the rule: three functions, one transition and two reads.** `model/StopLedger.ts` holds
   `StopLedger<S>` (`{ stop, count }`), `noStops`, and
   - `stoppedKey(ledger, status)`, which is `ledger.stop === status ? ledger.count : ledger.count + 1`;
   - `announcesStop(ledger, status)`, which is `ledger.stop !== status`;
   - `recordStop(ledger, status)`, which returns `ledger` itself when `ledger.stop === status` and otherwise
     `{ stop: status, count: ledger.count + 1 }`. It is the reducer.

   A stop is its identity (`===`): an equal-field value that is another object is a new stop. The module contains no JSX and
   imports no React, is in neither barrel ([ADR-QD-099](./099-entry-points-are-a-closed-list.md)), and only `StoppedBox.tsx` and
   `useStopNotice.ts` import it. It sits under `model/**`, so the mutation run measures it.

3. **The box derives its own key.** A component cannot set its own `key`, so `StoppedBox` is a wrapper rendering
   `<StoppedBody key={stoppedKey(notice.announced.ledger, notice.status)} … />`, and `StoppedBody` is module-private. The two
   notices pass no key and have no `Binding`: each notice's arm takes the notice props whole, the memoised value the hook
   returns, and hands them to the box as one `notice` prop in place of `status`, `onRestart` and `announced`.

4. **The alert is decided at mount and the stop is recorded at commit.** The body decides
   `const [alert] = useState(() => announcesStop(announced.ledger, status))`, a decision made at mount from a prop, and records
   in `useLayoutEffect(() => announced.record(status), [announced.record, status])`. The layout timing lands the record's
   re-render before paint. The effect is keyed on `record` and not on the handle: the record's own re-render builds a new
   handle and re-runs nothing, and a box handed another feed's ledger, which carries another `record`, records there. Nothing is
   written during render, so a render that is thrown away, or a doubled one, records nothing and the alert is kept. No
   `role="alert"` is ever added to or removed from a mounted element, and the role, `data-announce`, `data-sampled`, the test ids,
   the focus target and the copy are what they were.

5. **The key is stable across the record.** The key of a stop is the same before and after it is recorded, so the re-render the
   record causes keeps the box mounted and its alert stays on the same element
   ([INV-QD-421](../invariants.md#inv-qd-421-a-stops-key-is-the-same-before-and-after-it-is-recorded-and-recording-a-recorded-stop-returns-the-same-ledger)).
   `recordStop` returns the same ledger for a stop already recorded, so a repeat record (StrictMode's re-run effect, a remount for
   the announced stop after a tab switch) makes no new state.

6. **A stop no box has shown is not announced.** A stop is recorded only when a box for it commits, so a stop that happened on a
   screen with no notice alerts on the first screen that shows it
   ([BEH-QD-780](../behaviors/28-devtools-screens.md#beh-qd-780-a-stop-no-box-has-shown-is-not-announced-and-it-alerts-on-the-first-screen-that-shows-it)).

7. **The cost, measured.** One extra `DockFrame` pass per newly shown stop (2 parent renders and 2 commits, against 1 and 1 on the base); a remount for a recorded stop, or an `Activity` show, costs one `DockFrame` function call and renders nothing below it.
   The base is the ledger as a ref. `useReducer` has no eager bail-out, so a record always schedules the second pass, from a layout
   effect and before paint; a feed with no stop adds none, and no `configure` re-runs, because the model's hand-over is in
   `DevtoolsDock`, above `DockFrame`.

8. **AGENTS.md §13 is not engaged.** The ledger records which stop was announced, never a decision or what a status says, and it
   is the same kind of value as the box's own `alert` `useState`; the rule that decisions live in atoms is untouched and AGENTS.md
   is unchanged.

## Audit of the rows this decision edits

Six rows of existing test files are edited because the old ledger was a ref a test could hold, and each property a row pinned is
held after the edit. Every other row of those files is untouched.

| Row | What it pinned | Change | Held by |
| --- | -------------- | ------ | ------- |
| N9 | a stop alerts once, again for a new stop, and a strict-mode first render still alerts | edited: the notice is built through a `Held` harness that calls the real `useStopNotice`; the assertions are the same | N9, A1, A2 |
| N12 | a second stop on a mounted notice remounts it, so its alert is present on the new mount | edited: through the same `Held` harness; the assertions are the same | N12, A2 |
| TN14 | a notice mounted again for the stop already announced does not count it twice, which the row read as the ledger's count | edited: the count is a value inside the hook, so the property is stated by the element, a remount for the announced stop is silent and a re-render keeps its element | LAW2, A3 |
| TN15 | a notice handed the ledger of another feed records its stop there, and that stop is then silent on it | edited: an `Either` harness holds two hook ledgers and the box records into the one it is handed | TN15 (restated) |
| SB1 | the stopped box shows its reason in a labelled focusable `pre` in the reason style | edited: it renders `StoppedBox` with the notice props whole; the literal reason style stays as the golden of the move to the shared theme | SB1 |
| SB4 | the broken simulation's `pre` has the stopped box's reason style | edited: it compares the block's `style` attribute to the style of a rendered stopped box, in place of the literal | SB4 |

Tests removed: 0.

Each row is rewritten and none is removed. The rows that read a ledger internal, TN14's count and TN15's stop, are the two whose
property moved: TN14's to the table test's identity law and the dock's element row, TN15's to a harness that holds two real
ledgers.

## Alternatives considered

- **Relocate the ref read into the wrapper behind an opaque closure** (`keyOf`, `announced` and `record` over a ref). Rejected: it
  moves the first render-phase read into one place and leaves both, and the closure would put the rule in the hook and not in the
  box. Holding the value in React state removes both reads and makes render a pure function of props.
- **An identity-to-ordinal `WeakMap`.** Rejected: it changes what "announced" means for a stop no box ever showed, which is the
  meaning [BEH-QD-780](../behaviors/28-devtools-screens.md#beh-qd-780-a-stop-no-box-has-shown-is-not-announced-and-it-alerts-on-the-first-screen-that-shows-it)
  states.
- **A per-feed model store**, a twelfth `DockModel` store or a ledger inside each feed. Rejected: it puts a pure UI announcement
  concern into the headless public model, widens a public shape for no consumer, and moves the store count and the sweeps over it.
- **`setState` during render to derive the key.** Rejected: it is legal and loops easily, and it moves the alert decision's timing.
- **`useState` with a hand-written updater in place of `useReducer`.** Rejected: it states the transition twice, where the reducer
  is the pure function itself.
- **Keeping the three props and the `Binding`.** Rejected: they restate the hand-off the notice prop removes.
- **A class with private fields for the handle.** Rejected: it is ceremony for an immutable value; opacity is held by the import
  rule, only the box and the hook import the module.
- **Folding the key and the alert into one function returning both.** Rejected: the key is read on every render and the alert
  only at mount, and one return shape would blur the two moments.
- **Keeping the functions in `StoppedBox.tsx`.** Rejected: nothing measures `src/react`, so the decision would stay unmeasured.

## Consequences

- No export is added or removed, so `pnpm spec:api` and `pnpm spec:package` are unmoved: `StopLedger`, `noStops`, `stoppedKey`,
  `announcesStop`, `recordStop` and `AnnouncedStops` are package-private, and `packages/devtools/test/surface.tst.ts` refuses each
  from both entries beside `useStopNotice` and `StopNoticeProps`. The change is a `@qadi/devtools` patch whose changeset says the
  announced alert is unchanged.
- **No host sees a difference.** The alert, its test ids and every attribute are what they were; the one observable change is the
  extra pass of decision 7, before paint.
- `AnnouncedStops<S>.record` makes `StopNoticeProps<S>` invariant in `S`, so a test that would otherwise fix `S` from a narrowed
  `const` status writes `useStopNotice<TimelineStatus>(…)`. No source changes follow.
- No budget moves: no module-scope `let` (`MODULE_STATE_BUDGET` still names `DeveloperSignals.ts` alone), no `switch`, no
  `Effect.fnUntraced` and no `not.toBeCallableWith` pin.
- `StopLedger.ts` is inside `stryker.devtools.mjs`'s `model/**`, so it is held to no surviving, uncovered, ignored or timed-out
  mutant: 12 mutants are killed and 4 static ones (the `noStops` literal and three const-arrow bodies) are ignored by Stryker's
  static rule and were each examined by hand with static mutants on, all killed by the table test.
- The four React files, `StoppedBox.tsx`, `useStopNotice.ts`, `TimelineNotice.tsx` and `DiagnosticsNotice.tsx`, are outside any
  mutation glob and are judged by their tests and by the variants below, each of which breaks one React rule.

## What enforces it

- `packages/devtools/test/model/StopLedger.test.ts`: L1 to L6, the table over `(ledger, status)` with its key, whether it
  announces and the recorded ledger; LAW1, the key is the same before and after the record; LAW2, recording a recorded stop
  returns the same ledger; LAW3, a property over random sequences of stops, the count equals the number of changes and the key
  holds across each record.
- `packages/devtools/test/react/DockFrame.announce.characterisation.test.tsx`: A1 to A5, through `DevtoolsDock` alone, plain and
  under StrictMode: each feed's stop announced once across tab switches; a second stop after Restart alerts again on its own feed
  only; a box mounted again for the announced stop is silent and kept by a re-render; a stop that happened with no notice mounted
  alerts on the first visit; the commit that records a stop does not mount its box again.
- `packages/devtools/test/react/useStopNotice.test.tsx`: H1, a render that is thrown away announces nothing; H2, a notice follows
  its feed's restart while the status stays the same stop; H3, the notice is one value across a re-render that changes nothing and
  a new value for a new stop; C1, a newly shown stop adds at most one commit over a live source.
- The held rows `packages/devtools/test/react/DockFrame.stops.characterisation.test.tsx` (DS1 to DS3),
  `packages/devtools/test/react/DiagnosticsScreens.test.tsx` (D7, D8), `packages/devtools/test/react/DockFrame.renders.test.tsx`
  (R1, R2) and the rows of `TimelineNotice.test.tsx` and `DiagnosticsNotice.test.tsx` the audit leaves alone.
- The six edited rows of the audit above, in `DiagnosticsNotice.test.tsx` (N9, N12), `TimelineNotice.test.tsx` (TN14, TN15) and
  `Simulator.broke.test.tsx` (SB1, SB4).
- `pnpm exec stryker run stryker.devtools.mjs --mutate packages/devtools/src/model/StopLedger.ts`, which leaves no mutant
  surviving, uncovered or timed out, and `pnpm test:tstyche`, which runs `packages/devtools/test/surface.tst.ts`'s refusals.
- Scratch variants of the four unmeasured React files and the ledger's key, each seen failing by a named row: dropping the layout
  effect fails the revisit rows (DS1, D7); recording during render fails H1 and C1 and no dock row; a constant key fails N9, N12,
  DS2 and TN14; the reducer held inside the box fails DS1 and DS2; one reducer for both feeds fails DS1, DS2, A1, A2 and A4; a
  memo that leaves out `onRestart` fails H2; deciding the alert on every render fails N9 and D7; an effect keyed on the handle fails
  C1; a memo that leaves out `ledger` fails D7 and A1 to A4; a key that is always `count + 1` fails A5, LAW1 and LAW3; a memo
  removed fails H3.
- The merge gate by command (`pnpm check`), never by number.

## Related

- [ADR-QD-197](./197-a-configurable-value-one-questions-path-for-the-lens-and-one-stop-ledger.md) — decision 4 is amended: the
  ledger is a reducer over a pure transition and the box derives its key
- [ADR-QD-099](./099-entry-points-are-a-closed-list.md) — the ledger module stays out of both barrels
- [ADR-QD-047](./047-a-headless-devtools-model.md) — the headless model is unchanged, and no announcement store enters it
- [BEH-QD-509](../behaviors/28-devtools-screens.md#beh-qd-509-every-screen-that-reads-the-diagnostics-states-its-status-the-same-way) and
  [BEH-QD-759](../behaviors/28-devtools-screens.md#beh-qd-759-the-docks-two-stop-notices-come-from-one-hook-each-with-its-own-ledger-each-following-its-feeds-restart) —
  restated and linked
- [BEH-QD-776](../behaviors/28-devtools-screens.md#beh-qd-776-a-stop-notices-box-derives-its-own-key-and-a-notice-passes-none),
  [BEH-QD-777](../behaviors/28-devtools-screens.md#beh-qd-777-a-box-decides-its-alert-as-it-mounts-from-the-committed-ledger-and-records-its-stop-at-commit-never-during-render),
  [BEH-QD-778](../behaviors/28-devtools-screens.md#beh-qd-778-the-ledger-transition-is-one-pure-function-a-new-stop-counts-once-and-a-recorded-stop-returns-the-same-ledger),
  [BEH-QD-779](../behaviors/28-devtools-screens.md#beh-qd-779-each-feeds-ledger-is-react-state-held-above-the-screens-and-handed-from-the-hook-to-the-notice-to-the-box-as-one-value)
  and [BEH-QD-780](../behaviors/28-devtools-screens.md#beh-qd-780-a-stop-no-box-has-shown-is-not-announced-and-it-alerts-on-the-first-screen-that-shows-it),
  which state it
- [INV-QD-421](../invariants.md#inv-qd-421-a-stops-key-is-the-same-before-and-after-it-is-recorded-and-recording-a-recorded-stop-returns-the-same-ledger) and
  [INV-QD-422](../invariants.md#inv-qd-422-the-stop-ledger-is-written-only-by-a-box-at-commit-never-during-render-or-at-module-scope-and-the-alert-role-is-never-added-to-or-removed-from-a-mounted-element),
  the two invariants it adds
