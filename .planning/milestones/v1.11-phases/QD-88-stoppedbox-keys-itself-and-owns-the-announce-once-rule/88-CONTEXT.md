# Phase 88: `StoppedBox` keys itself and owns the announce-once rule - Context

**Gathered:** 2026-11-25 (smart discuss, autonomous mode. Every decision below was decided autonomously on 2026-11-25 under the owner's standing instruction of 2026-11-22: "do not ask me, you are in the autonomous mode. always pick the most complete and clean solutions not the simplest". Breaking changes are allowed; source compatibility is never the tiebreaker.)
**Status:** Ready for planning

<domain>
## Phase Boundary

A feed's stop is shown in one box, `StoppedBox`, and announced once per stop: the box's `role="alert"` is fixed when
it mounts, a second stop is a new mount, and a remount for a stop already announced (a tab switch) stays silent. Today
that rule is spread over four files, and it reads a ref during render twice:

Code at HEAD `c99015e9`. Phase 87 commit `d7ac15fb` moved `reasonStyle` to `theme.ts` and shifted `StoppedBox.tsx`'s
lines, so `_WAVE16-CONTEXT.md`'s "layout effect 130-134" is stale. The numbers below are re-read at HEAD:
- `react/StoppedBox.tsx` (149 lines) declares the ledger `StopLedger<S> = { stop, count }` (25-28), `noStops` (31),
  `StopNoticeProps<S>` with `announced: RefObject<StopLedger<S>>` (34-46, field at 45), and
  `stoppedKey(ledger, status)` (48-50). The box decides its alert with `useState(() => announced.current.stop !==
  status)` (116), which is a **render-phase ref read**: a `useState` initializer runs during render. It records the
  stop in a `useLayoutEffect` keyed `[announced, status]` (117-120). The header doc (9-11) names `stoppedKey`.
- `react/TimelineNotice.tsx:33` and `react/DiagnosticsNotice.tsx:85` each pass `key={stoppedKey(announced.current,
  status)}`. That is the **second render-phase ref read**, done by the callers. Both thread `announced` through a
  private `Binding = Pick<…, "onRestart" | "announced">` (TimelineNotice 25, DiagnosticsNotice 66) into a curried
  `noticeOf` (27-47 and 76-100).
- `react/useStopNotice.ts:15-19` holds `useRef<StopLedger<S>>(noStops)` and returns
  `useMemo(() => ({ status, onRestart, announced }), [status, onRestart])` (ADR-QD-197 decision 4).
- `react/DevtoolsDock.tsx`'s `DockFrame` (104-…) calls `useStopNotice` once per feed (111 diagnostics, 113 timeline),
  and `Screen` (222-269) hands `notice` and `timeline` down (226-227, 263).

After this phase:
- A pure, React-free ledger module under `model/` states the whole announce-once rule: the transition (record a stop),
  the key, and the alert decision. It has a table test, and `stryker.devtools.mjs` measures it.
- Each feed's ledger is a React-held value (a `useReducer` whose reducer is that pure transition), held per feed by
  `useStopNotice` in `DockFrame` so it outlives every screen. **No ref is read or written anywhere on the stop path.**
- `StoppedBox` is an outer wrapper that derives its own key from the ledger value and renders a module-private keyed
  body. The body decides the alert at mount from its props and records the stop at commit. The notices pass no key
  and have no `Binding`. They hand the box the notice props whole, the same memoised value the hook returns.
- The announced alert, its test ids and every DOM attribute are unchanged.

ARCH-135. Package: `@qadi/devtools` only, all package-private (a patch changeset, "No export changes."). Records:
ADR-QD-201 (new), CCR-QD-480, BEH-QD-776..780, INV-QD-421..422. ADR-QD-197 decision 4, BEH-QD-759 and BEH-QD-509's
"new mount" paragraph get dated amendments.

Evidence: the code at HEAD (file:line above and in `<code_context>`); `.planning/phases/_WAVE16-CONTEXT.md` §Phase 88;
`.planning/research/` (SUMMARY §Phase 88 and "Where the researchers disagree", ARCHITECTURE §Phase 88, PITFALLS
88-A/B/C, FEATURES §Phase 88, STACK §Phase 88); ADR-QD-197; BEH-QD-509, 520, 759; AGENTS.md §6 (`MODULE_STATE_BUDGET`)
and §13.
</domain>

<decisions>
## Implementation Decisions

### Binding milestone decisions (carried forward from Phase 85; not re-decided)
- **D-01:** Work only on branch `arch-wave-16`, on the main tree, one phase at a time. No merge, push, tag, release,
  publish, `changeset version` or version-packages PR (WX-07). Never `git add -A` under `.planning/milestones`. Never
  stage `.planning/config.json`, `README.md`, `.agents/`, `.codex/`, `.planning/state.json`, `assets/` or `*.iter*.md`.
- **D-02:** Use only the reserved records: ARCH-135, ADR-QD-201, CCR-QD-480, BEH-QD-776..780, INV-QD-421..422. Never
  run `node scripts/next-id.mjs`. Name any unused reservation in the CCR row ("Unused: …"). Pass `--date 2026-11-25`
  (or the real edit date) to `scripts/spec-revise.mjs`.
- **D-03:** Every behaviour change is preceded by a test written on the phase base: RED there for a change, green for
  preserved behaviour. Every new check is shown failing once, with the scratch variant and the failing text recorded
  in `88-RED-EVIDENCE.md` (WX-06). `pnpm check:pr < /dev/null` is green at the phase end (WX-01).
- **D-04 (the wave's changeset policy, Phase 85 D-04):** one `.changeset/*.md` for `@qadi/devtools`, a **patch**:
  "A stop notice's box derives its own key and records the announced stop through state its dock holds for each feed;
  the announced alert is unchanged. No export changes." Not Breaking: no public name, type or tag moves. Every touched
  name is package-private, and `surface.tst.ts` already refuses `useStopNotice` and `StopNoticeProps` from both
  entries (301-310).
- **D-05:** Every commit ends with exactly one trailer line, `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

### Area 1: Relocate or remove the render-phase ref read (the roadmap's open choice)
- **D-06 (remove it; decided autonomously, against the research's "relocate" recommendation):** the ledger becomes a
  React-held value and is never read through a ref. `useStopNotice` holds
  `const [ledger, record] = useReducer(recordStop, noStops)`, where `recordStop` is the pure transition (D-10), and
  returns `useMemo(() => ({ status, onRestart, announced: { ledger, record } }), [status, onRestart, ledger, record])`.
  The box reads `announced.ledger` as a prop and calls `announced.record(status)` from its layout effect.
  - **Why this is the complete option.** There are two render-phase reads today, not one: the callers' `key` and the
    box's own `useState` initializer (StoppedBox.tsx:116). "Relocate into the wrapper with an opaque closure"
    centralises the first and keeps both. Holding the value in React state removes both, and render becomes a pure
    function of props. That makes the StrictMode guarantee structural rather than a property of how the ref happens
    to be read.
  - **Why the key does not churn (the property that makes it work, INV-QD-421).** `stoppedKey(ledger, s)` is
    `ledger.stop === s ? ledger.count : ledger.count + 1`, so the key for `s` is the same before and after `s` is
    recorded. The record's re-render keeps the box mounted, and the alert fixed at mount stays on the same element.
    `recordStop` returns the **same ledger by identity** for a stop already recorded, so React bails out of a repeat
    record (StrictMode's re-run effect, a tab switch's remount). It commits at most one extra pass per newly
    shown stop.
  - **Semantics kept.** A stop is recorded only when a box for it commits, so a stop no box ever showed is not
    "announced" (D8: it alerts on the first visit to a screen with a notice). That is exactly the meaning the
    `WeakMap` alternative would change.
  - **Cost, accepted and recorded in ADR-QD-201:** one extra `DockFrame` subtree render the first time each stop is
    shown, from a layout effect, before paint. `DockFrame.renders.test.tsx` R1 has no stop and stays at zero. R2
    asserts `isAbove` and still holds. No configure re-runs, because `useDockModel`'s hand-over is in `DevtoolsDock`,
    above `DockFrame`.
  - **AGENTS.md §13 is not engaged:** the ledger records which stop was announced, never a decision or what a status
    says. It is the same kind of value as the box's existing `alert` `useState`. ADR-QD-201 says so in one sentence,
    and AGENTS.md is unchanged.
  - Rejected: **relocate into the wrapper with an opaque closure** (`keyOf`/`announced`/`record` over a ref), the
    research's recommendation. It moves the first read into one place and leaves both reads in render, and its
    closure would put the rule in the hook, not the box.
  - Rejected: **an identity-to-ordinal `WeakMap`**. It changes what "announced" means for a never-mounted stop (the
    roadmap's own finding).
  - Rejected: **a per-feed model store** (a twelfth `DockModel` store or a ledger inside each feed). It puts a pure UI
    announcement concern into the headless public model, widens a public shape for no consumer, and moves the
    eleven-store count and its sweeps.
  - Rejected: **`setState` during render** to derive the key, which is legal but loops easily and moves the alert
    decision's timing (PITFALLS 88-B).
  - Rejected: **`useState` plus a hand-written updater** in place of `useReducer`, which would state the transition
    twice: the reducer is the pure function itself.
- **D-07 (where the ledger lives):** above the screens, one per feed. `useStopNotice` keeps its role and its file, and
  `DockFrame` keeps calling it once per feed (111, 113), unchanged. The box owns the rules (key, alert, record). The
  hook owns where the ledger is held. A ledger is never inside the box or a screen, because every tab switch would
  re-announce. There is one reducer per feed, never one for both, because a second stop of one feed would re-announce
  the other (ADR-QD-197's rejection). No module-scope ledger (`MODULE_STATE_BUDGET`, AGENTS.md §6, still only
  `DeveloperSignals.ts`). The memo stays keyed on the feed's `restart` as well as `status`, never on `status` alone,
  so a model rebuilt after a hidden `Activity` hands the rebuilt `restart` (DS3).

### Area 2: How `StoppedBox` keys itself, and "decided at mount, recorded at commit"
- **D-08 (outer wrapper, keyed body):** `StoppedBox` (exported, package-private) renders
  `<StoppedBody key={stoppedKey(notice.announced.ledger, notice.status)} … />`, and `StoppedBody` is module-private.
  A component cannot set its own `key`, so the wrapper is the only shape. The body holds:
  - `const [alert] = useState(() => announcesStop(announced.ledger, status))`. This is decided at mount, from a prop.
  - `useLayoutEffect(() => announced.record(status), [announced.record, status])`. This is recorded at commit, and the
    layout timing is kept, so the record's re-render lands before paint. The effect is keyed on `record` and not on
    the handle, so the record's own re-render (which builds a new handle) re-runs nothing. A box handed another
    feed's ledger (another `record`) records there (TN15's property).
  - Nothing is written during render. A discarded or doubled render records nothing: StrictMode's double render reads
    the same unrecorded ledger twice, so the alert is kept (TN7, N9).
  - No `role="alert"` is ever added to or removed from a mounted element (BEH-QD-509), and the role, `data-announce`,
    `data-sampled`, test ids, focus target and copy are unchanged.
- **D-09 (the box takes the notice whole; no `Binding`):** `StoppedBoxProps<S>` replaces its three props `status`,
  `onRestart` and `announced` with one, `notice: StopNoticeProps<S>`, plus the copy (`reason`, `lead`, `body`,
  `reasonLabel`, `restartLabel`), `feed` and `sampled?`. Each notice's `noticeOf` arm takes the notice props whole,
  `(notice: StopNoticeProps<…>) => …`, and both `Binding` types are deleted. Hook, notice and box then share one value,
  the hook's memoised props, and the success criterion's "stop threading the ledger through private bindings" holds
  literally. `StopNoticeProps<S>` keeps its name and its home in `StoppedBox.tsx`, and `DiagnosticsNoticeProps` and
  `TimelineNoticeProps` stay its aliases, so "the prop type names stay" holds. The field keeps the name `announced`,
  and its type becomes `AnnouncedStops<S> = { readonly ledger: StopLedger<S>; readonly record: (status: S) => void }`,
  declared beside `StopNoticeProps` (React-side: `record` is a dispatch). It is immutable, so a caller that reads it
  reads a React-held value, never a mutable `.current`.
  - Rejected: **keeping the three props and the `Binding`**, because they restate the hand-off the criterion removes.
  - Rejected: **making the handle a class with private fields** for true opacity. That is ceremony for an immutable
    value. Opacity is enforced structurally instead (D-17's import judge: only `StoppedBox.tsx` and
    `useStopNotice.ts` import the ledger module).

### Area 3: The pure ledger module
- **D-10 (home, names, contents):** a new package-private `packages/devtools/src/model/StopLedger.ts`. It is React-free,
  contains no JSX, and is in neither barrel (ADR-QD-099; the named-barrel rule exports nothing it does not name). It
  holds:
  - `StopLedger<S>` (moved unchanged: `{ readonly stop: S | undefined; readonly count: number }`) and `noStops`
    (moved).
  - `stoppedKey(ledger, status): number` (moved; formula unchanged).
  - `announcesStop(ledger, status): boolean`, which is `ledger.stop !== status`. This is the alert decision, stated
    once.
  - `recordStop(ledger, status): StopLedger<S>`. It returns `ledger` itself when `ledger.stop === status`, otherwise
    `{ stop: status, count: ledger.count + 1 }`, and it is the reducer. It keeps references and never spreads a fresh
    record for an unchanged ledger.
  - Identity per stop value (`===`), as today; Phase 87 kept the `Stopped` values' identity rules (FEATURES §87 "88
    keys on identity").

  `StoppedBox.tsx` stops declaring `StopLedger`, `noStops` and `stoppedKey`, and its header doc is rewritten to name the
  wrapper and the ledger module. The planner may rename the two new functions if a clearer name exists, but must keep
  the three functions distinct (one transition, two reads) and must keep the module under `model/`.
  - Rejected: **keeping the functions in `StoppedBox.tsx`**, because no Stryker config reaches `src/react` and the one
    real decision would stay unmeasured (PITFALLS 88-C).
  - Rejected: **folding the key and the alert into one function** returning `{ key, alert }`. The key is read on every
    render and the alert only at mount, and one return shape would blur the two moments the ADR distinguishes.
- **D-11 (the table test):** `packages/devtools/test/model/StopLedger.test.ts` is a table over
  `(ledger, status) → (key, announces, recorded)`. Rows: an empty ledger and a first stop; the recorded stop again
  (same key, does not announce, `recordStop` returns the same ledger by `===`); a second, distinct stop (key + 1,
  announces, count + 1); a stop after a restart that is a new identity with equal fields (announces: identity, not
  structure); a ledger of count n.

  It also holds the two laws as rows over the table, not prose:
  - the key is stable across the record: `stoppedKey(recordStop(l, s), s) === stoppedKey(l, s)` (INV-QD-421);
  - recording is idempotent by identity: `recordStop(recordStop(l, s), s) === recordStop(l, s)`.

  Each law is shown failing once with a scratch variant (a fresh spread on the known stop; a key that reads `count`
  without the `+ 1` branch), recorded in `88-RED-EVIDENCE.md`. A row's title names the property, never a D-number or a
  phase number (WX-07).

### Area 4: Characterisation, held tests and measurement
- **D-12 (plan 1: the characterisation on the base, SBOX-01):** a new file through the public seam `DevtoolsDock`
  (whose props are the only seam the rows touch), so the same rows hold before and after the change. The working
  name is `test/react/DockFrame.announce.characterisation.test.tsx`, and the planner may rename it. It reads only the
  DOM: `data-announce`, `role`, and element identity. Rows:
  - each feed's stop is announced once and is silent on every revisit across tab switches, under `<StrictMode>` (DS1
    and D7 under StrictMode, with `role="alert"` present exactly once per distinct stop);
  - TN14's property stated observably: after a remount for the announced stop, a re-render keeps the same `-stopped`
    element, and the next distinct stop remounts with the alert;
  - a stop that happened while no notice was mounted alerts on the first visit (D8 and TN8, both feeds);
  - a second stop after Restart alerts again under StrictMode;
  - a box is not remounted by the commit that records its stop, which is the DOM face of INV-QD-421 and the row that
    catches a double count: the element identity is kept across the record's re-render.

  The file is green on the base and after the change. It is held byte for byte from the commit that adds it.
  DS1-DS3 (`DockFrame.stops.characterisation.test.tsx`), D7/D8 (`DiagnosticsScreens.test.tsx` 249, 268) and
  TN1-TN10 and TN13 are held unedited.
- **D-13 (declared edits; every other test held):** every `packages/devtools/test` file is held byte for byte except
  these declared edits, which are confined to declared regions in the 87-pinned-check style:
  - `test/helpers.ts` (`noStops` import at 14 and `liveNotice` at 222-225 build the new handle; the name
    `liveNotice` stays);
  - `test/react/TimelineNotice.test.tsx` (`ledger()` at 73, TN11 224-229, TN12 251, TN14 273-285, TN15 288-299);
  - `test/react/DiagnosticsNotice.test.tsx` (`freshRef` at 19, `notice()` at 60-61, N9, N12, N13);
  - `test/react/Simulator.broke.test.tsx` (SB1 74-95 renders `StoppedBox` with `announced={{ current: noStops }}` at
    86, so its props must change; see D-15);
  - `test/surface.tst.ts`, for D-16's refusals only.

  Rows that need a ledger that moves (N9, N12, N13, TN14, TN15) render through a small harness that calls the real
  `useStopNotice`, so the hook is tested too. Rows that do not care use a fixed handle over `noStops`. TN14 reads
  `announced.current.count`, a ledger internal, and TN15 reads `second.current.stop`. Their properties are re-homed:
  TN14's goes to the table test's idempotence law plus D-12's DOM row, and TN15's becomes "a box handed another
  feed's ledger records there and its stop is then silent on that ledger". ADR-QD-201 carries an audit table (the
  ADR-QD-200 precedent) naming each edited row and the test that now holds its property ("no property lost").
- **D-14 (scratch variants for the unmeasured React files, SBOX-04, WX-06):** each variant is seen failing with its
  text recorded:
  - drop the layout-effect record, which fails DS1 and D7 (a revisit re-announces);
  - record during render, which fails D-12's StrictMode row;
  - a constant key, which fails N12 and DS2 (a second stop does not remount);
  - move the reducer into the box, which fails DS1 (a tab switch re-announces);
  - one reducer for both feeds, which fails DS2;
  - key the memo on `status` alone, which fails DS3;
  - add the role to a mounted element (decide the alert per render rather than at mount), which fails N9 and D7.

  `88-mutation.mjs`'s `UNMEASURED` lists `react/StoppedBox.tsx`, `react/useStopNotice.ts`, `react/TimelineNotice.tsx`
  and `react/DiagnosticsNotice.tsx`, each with its reason, plus `react/DevtoolsDock.tsx` only if a plan edits it
  (D-07 expects it unchanged).
- **D-15 (Phase 87's deferred IN-04: taken, because its trigger is met):** 87-REVIEW-DISPOSITION.md defers IN-04 to
  "the next phase that edits the Simulator's tests", and D-13 must edit `Simulator.broke.test.tsx`, because SB1
  renders `StoppedBox` with the old props. In the same edit:
  - SB4 compares the Simulator block's `style` attribute to the stopped box's rendered `style` attribute;
  - SB1 keeps the literal `REASON_STYLE` (28-29) only as the byte-identity golden of Phase 87's move, with a comment
    saying it is a deliberate golden;
  - the file header's "held byte for byte from the commit that adds it" is reworded to name the commit that last
    edits it.

  Taking it costs nothing extra, because the file is reopened anyway. Leaving it would knowingly re-defer a finding
  whose stated trigger fired.
- **D-16 (surface refusals):** `test/surface.tst.ts` gains "no exported member" refusals of `StopLedger`, `noStops`,
  `stoppedKey`, `announcesStop`, `recordStop` and `AnnouncedStops` from both entries, the ADR-QD-197 precedent that
  pinned `useStopNotice` and `StopNoticeProps`. They are `@ts-expect-error` lines and count against no budget. Gate 13
  is unmoved: no export is added or removed.
- **D-17 (phase scripts, the Phase 85-87 pattern):**
  - `88-check.mjs`: base, trailers, scan-ids, scan-forbidden, records, and a **shape judge**. The judge requires no
    `useRef` and no `.current` in the four stop-path files; no `key=` on a `StoppedBox` element in either notice; no
    `Binding` in either notice; `model/StopLedger.ts` imported in `src` only by `react/StoppedBox.tsx` and
    `react/useStopNotice.ts`; no `react` import and no JSX in `model/StopLedger.ts`; and no module-scope `let` in the
    touched files.
  - `88-pinned-check.mjs`, implementing D-13's held and declared sets and D-12's born file.
  - `88-mutation.mjs`, implementing D-18.
  - `88-earlier-checks.mjs`, which runs Phases 85-87's checks from scratch copies with an **expected-reports ledger**:
    87's and 86's pinned checks will report the D-13 files, and each report is named with the 88 commit that explains
    it. The script never edits an archived check's path constants.

  Each script has a self-test, and each mode is seen failing once. New phase scripts start with the directive
  exemption the earlier scripts use (PITFALLS: `"use client";` first line where `scan-forbidden` needs it).
- **D-18 (mutation, WX-05):** `stryker.devtools.mjs` already mutates `packages/devtools/src/model/**/*.ts`, so
  `model/StopLedger.ts` is measured. `88-mutation-base.json` is taken on the phase base with the same invocation, and
  it records that no measured file is touched there (`stoppedKey` comes from the unmeasured `StoppedBox.tsx`, so
  there is no `RENAMED` comparison). At close, `StopLedger.ts` must have **every mutant killed**, or each survivor must
  be recorded as an equivalent with its reason. A survivor is closed with a test, never re-baselined. Coverage stays
  at or above 90% for devtools.

### Area 5: Records
- **D-19 (ADR-QD-201 new, ADR-QD-197 amended; not "197 amended and 201 unused"):** a new ADR is the complete record. The
  change replaces a mechanism (ref to reducer), moves the rule into a measured module, changes the box's input, and
  carries its own rejected alternatives (relocate, `WeakMap`, model store, render-phase `setState`) and an audit table
  (D-13). Folded into a five-decision ADR it would bury all of that in one decision. The Phase 85-87 precedent is a new
  ADR for each phase's mechanism.
  - ADR-QD-201 states D-06 to D-11, the cost (D-06), the §13 note, the audit table, and "What enforces it" naming
    commands, never gate numbers.
  - ADR-QD-197 gets a dated amendment on decision 4 (revision 1.5): "the ledger is held by `useReducer` over
    `model/StopLedger.ts`'s `recordStop`, and the box derives its key; see ADR-QD-201". Its "A hook and not a plain
    helper" reason still stands, with a reducer and a memo now. Its other decisions are untouched.
- **D-20 (BEH and INV allocation):** the planner may rebalance the allocation, but must use all five BEH and both INV
  ids or name an unused one in CCR-QD-480.
  - BEH-QD-776: a stop notice's box derives its own key, and a notice passes no key.
  - BEH-QD-777: the alert is decided at a box's mount from the committed ledger, and the stop is recorded at commit,
    never during render.
  - BEH-QD-778: the ledger transition is one pure function: a new stop counts once, and a recorded stop returns the
    same ledger.
  - BEH-QD-779: each feed's ledger is a React-held value per feed, held above the screens, and handed hook to notice to
    box as one value.
  - BEH-QD-780: a stop no box has shown is not announced, and it alerts on the first screen that shows it.
  - INV-QD-421: a stop's key is the same before and after it is recorded, and recording a recorded stop returns the
    same ledger, so the record never remounts the box.
  - INV-QD-422: the stop ledger is written only at commit, by the box, once per feed, never during render and never at
    module scope; the alert role is never added to or removed from a mounted element.
  - BEH-QD-759 is restated (its "the ledger is a `useRef`" sentence at 28-devtools-screens.md:4072, and its
    "Pinned by" list). BEH-QD-509's "every new stop is a new mount" paragraph (1554-1556) gains a link to BEH-QD-776
    and BEH-QD-777.
  - The `spec/traceability.md` rows, `spec/decisions/index.yaml`, and the CCR-QD-480 row in `spec/README.md` move with
    them. Any ` ```typescript ` fence must compile (`check-doc-examples.mjs`). The new signatures are listed in
    ` ```ts ` fences.

### Claude's Discretion
- The exact names of `announcesStop`, `recordStop`, `AnnouncedStops` and `StoppedBody`, and of the characterisation
  file (D-10, D-12), within the shapes fixed above.
- The harness's shape for the notice tests (D-13), as long as it calls the real `useStopNotice`.
- The plan count and the wave split, as long as plan 1 is the characterisation (D-12) plus the mutation base (D-18),
  the table test is seen RED before `model/StopLedger.ts` exists, and the records plan comes last.

### Addendum after research (2026-11-25, decided autonomously)
Every bullet below was decided autonomously on 2026-11-25 under the owner's standing instruction of 2026-11-22. The
evidence is the measured spike in `88-RESEARCH.md` §Spike evidence: D-06 was built on the real source files, and the
devtools suite ran green against it (109 files, 2086 tests) with the declared test edits. `tsc`, house style,
`pnpm circular`, `pnpm test:tstyche` and `oxlint` were clean. The tree was then restored. D-06 stands.
- **D-06a (the cost, as measured):** `useReducer` has no eager bail-out, so ADR-QD-201's cost sentence says: "one
  extra `DockFrame` pass per newly shown stop (2 parent renders and 2 commits, against 1 and 1 on the base); a remount
  for a recorded stop, or an `Activity` show, costs one `DockFrame` function call and renders nothing below it". It
  replaces D-06's "React bails out of a repeat record". The body keeps the same DOM node across its own record,
  StrictMode keeps the alert, and `Activity` behaves as the ref version does. R1, R2, DS1-DS3, D7 and D8 stay green
  unedited. Evidence: spikes S1c, S2 and S3.
- **D-09a (typing):** `AnnouncedStops<S>.record` makes `StopNoticeProps<S>` invariant in `S`, so tests write
  `useStopNotice<TimelineStatus>(…)` wherever a narrowed `const` status would otherwise fix `S`. No src change follows.
- **D-11a (one more row):** the table test also carries a `fast-check` property row: the count equals the number of
  changes, and the key is stable at every step. It is green, and it fails under V10.
- **D-12a (a second born file):** the dock rows A1-A5 stay in `DockFrame.announce.characterisation.test.tsx`. Some
  rows cannot be stated through `DevtoolsDock`, and they go in a second born file, `test/react/useStopNotice.test.tsx`:
  - H1: a render that is thrown away announces nothing (an error boundary plus a throwing sibling);
  - H2: a notice follows its feed's restart while the status stays the same stop;
  - H3: the notice value is stable across a no-op re-render and new for a new stop;
  - a commit-bound row: a newly shown stop adds at most one commit over a live source.

  Plan 1 commits both files on the base **with the base `test/helpers.ts`**, because the edited `helpers.ts` imports
  the new module and would break the born files on the base. Both are then held byte for byte.
- **D-13a (a narrower declared set):** `freshRef` keeps its name and returns a fixed handle `{ ledger: noStops, record:
  () => undefined }`. Held unedited: N4-N8, N11, N13, N15, `notice()` (60-62), TN11 and TN12. The declared edits are:
  - `DiagnosticsNotice.test.tsx`: N9 and N12, through a `Held` harness over the real `useStopNotice`, plus imports.
  - `TimelineNotice.test.tsx`: TN14, TN15 (an `Either` harness with two hook ledgers), `ledger()` and imports.
  - `test/helpers.ts`: line 14 and `liveNotice` at 225.
  - `Simulator.broke.test.tsx`: import 22, SB1's props, SB4 and the header (D-15).
  - `surface.tst.ts`: six refusal pairs after line 310.

  Without these edits, the prototype fails 15 rows. With them, all 2086 tests pass.
- **D-14a (the variant map, corrected and measured):**
  - V1 (drop the record) fails DS1 and D7, as stated.
  - V2 (record during render) fails no dock row. Only H1 catches it.
  - V3 (a constant key) fails N9, N12, DS2 and TN14.
  - V4 (the reducer in the box) fails DS1, DS2, TN4, N9 and D7.
  - V5 (one reducer for both feeds) fails DS1, DS2, A1, A2 and A4.
  - V6 (the memo keyed without `onRestart`) fails not DS3 but H2.
  - V7 (the alert decided per render) fails 28 rows, including N9 and D7.
  - V8 (the effect keyed on the handle) is invisible in the DOM. Only the commit-bound row catches it.
  - V9 (the memo without `ledger`) fails 13 rows.
  - V10, added: a key that does not hold across the record (always `count + 1`) fails 33 rows, including A5, the
    table laws and TN4.
  - H3's variant (the notice value rebuilt every render) and the surface-refusal variant were not run in research.
    The plans run them.
- **D-15a (the Simulator header):** the header describes the file's history ("the first row is the byte-identity
  golden of the move to the shared theme; the others compare to the stopped box's own rendered style"). It does not
  name a commit hash, because a file cannot name the commit that adds its own text. `88-pinned-check.mjs` holds it
  against the 88 commit. SB4 compares the block's `style` to the rendered stopped box's `style` (4 of 4 green).
- **D-17a (the ledger and the scans):** 87's pinned check reports five files (`helpers.ts`,
  `DiagnosticsNotice.test.tsx`, `TimelineNotice.test.tsx`, `surface.tst.ts`, `Simulator.broke.test.tsx`). The 85 and 86
  pinned checks report nothing new. The 88 id scan adds `SBOX-0\d`, `88-\d{2}`, `QD-88` and `Phase 88`.
- **D-18a (an `EXAMINED` allowance):** `model/StopLedger.ts` measures 12 Killed and 4 Ignored (static: the `noStops`
  literal and three const-arrow bodies), a score of 100%. With `ignoreStatic: false` all 16 are Killed. `88-mutation.mjs`
  records the four as `EXAMINED` by the 87 mechanism: a clean tree, run by hand, each seen Killed.
- **D-19a (the ADR-QD-201 audit table):** rows are rewritten and none is removed (`Tests removed: 0`):
  - N9 and N12 run through a `Held` harness, with the same assertions.
  - TN14's `.current.count` read is re-homed to the table's identity law and to A3: a remount for the announced stop is
    silent, and a re-render keeps the element.
  - TN15 is re-homed to "a notice handed another feed's ledger records its stop there".
  - SB1 takes the new props.
  - SB4 compares to the rendered stopped box.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Scope and requirements
- `.planning/ROADMAP.md` §"Phase 88: `StoppedBox` keys itself and owns the announce-once rule": the goal, the four
  success criteria, and the planning notes ("constraints that are findings").
- `.planning/REQUIREMENTS.md`: SBOX-01..04 and WX-01..07.
- `.planning/phases/_WAVE16-CONTEXT.md` (reserved ids, D4 order, §Phase 88 evidence) and
  `.planning/phases/_SHARED-CONTEXT.md` (house rules, verify-command hygiene, the XC-05 mutation procedure).
- `.planning/phases/QD-85-the-dock-s-hydration-block-is-a-model-row/85-CONTEXT.md` D-04, the wave's changeset policy.
- `.planning/phases/QD-87-one-scoped-run-that-states-its-stop/87-REVIEW-DISPOSITION.md` (IN-04, taken by D-15) and
  `87-pinned-check.mjs` (the declared-region and born-file pattern).

### Research
- `.planning/research/SUMMARY.md` §Phase 88 and "Where the researchers disagree" (88).
- `.planning/research/ARCHITECTURE.md` §Phase 88: the relocate recommendation that D-06 overrides, and the `WeakMap`
  rejection, which stands.
- `.planning/research/PITFALLS.md` 88-A (the ledger outlives screens), 88-B (no write during render; StrictMode) and
  88-C (unmeasured React; scratch variants).
- `.planning/research/FEATURES.md` §Phase 88 ("remove it, key from a React-held value": the differentiator D-06 takes).

### Spec
- `spec/decisions/197-a-configurable-value-one-questions-path-for-the-lens-and-one-stop-ledger.md`, decision 4 (lines
  83-91) and its rejected alternatives (one ref for both ledgers; a memo keyed on `status` alone). Amended by D-19.
- `spec/decisions/200-one-scoped-run-that-states-its-stop.md`: the audit-table precedent for re-homed rows.
- `spec/decisions/099-entry-points-are-a-closed-list.md`: package-private modules stay out of both barrels.
- `spec/behaviors/28-devtools-screens.md`: BEH-QD-509 (line 1528; the "new mount" paragraph at 1554-1556),
  BEH-QD-520 (1748) and BEH-QD-759 (4046).
- `AGENTS.md` §6 (`MODULE_STATE_BUDGET`, forbidden list), §9 (barrels), §13 (React rules: the ledger is not a
  decision), §15 (name the script, not the gate number).

### Code
- `packages/devtools/src/react/StoppedBox.tsx`, `TimelineNotice.tsx`, `DiagnosticsNotice.tsx`, `useStopNotice.ts`,
  `DevtoolsDock.tsx` (`DockFrame` 104-…, `Screen` 222-269).
- `stryker.devtools.mjs` (`mutate: ["packages/devtools/src/model/**/*.ts"]`, line 47).
</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `stoppedKey` (StoppedBox.tsx:48-50) moves unchanged into `model/StopLedger.ts`. Its formula already has the
  record-stable property that D-06 relies on.
- `FEEDS` (StoppedBox.tsx:62-67), the closed per-feed test-id prefix and focus target, stays in `StoppedBox.tsx` with
  the body.
- `DockFrame.stops.characterisation.test.tsx` (DS1-DS3, through `DevtoolsDock` only) and `DiagnosticsScreens.test.tsx`
  D7/D8 are already seam-only characterisations, held unedited, and are the template for D-12.
- `test/helpers.ts` `liveNotice` (222-225) is the shared fixed notice for panel tests.
- The Phase 87 scripts (`87-check.mjs`, `87-pinned-check.mjs` with declared regions and born files, `87-mutation.mjs`
  with `UNMEASURED`, `87-earlier-checks.mjs`) are the pattern for D-17.

### Established Patterns
- Alert fixed at mount, a second stop remounts (BEH-QD-509; StoppedBox.tsx:9-11, 115-116, 132).
- A ledger per feed, held by the frame (ADR-QD-197 decision 4); the memo follows the feed's `restart` (useStopNotice.ts
  header 5-8).
- `Match.type<…>().pipe(Match.tagsExhaustive(...))` hoisted at module scope for each notice's `noticeOf`, with no
  `switch` (AGENTS.md §5a). Both stay. Only their arms' parameter changes (D-09).
- `"use client";` first line in every `src/react` file. The new model file has none (it is React-free).
- Pure model modules with table tests under `test/model/`, measured by `stryker.devtools.mjs`. The precedents are
  `PortCards.ts` (ADR-QD-168) and `HydrationView.ts` (ADR-QD-198).

### Integration Points
- `useStopNotice(status, onRestart)`'s signature is unchanged, so `DockFrame` (DevtoolsDock.tsx:111, 113) and `Screen`
  (226-227, 263) need no edit.
- `ServicesPanel.tsx:42, 96` and `QuestionsPanel.tsx:85, 126` take `diagnostics: DiagnosticsNoticeProps` and spread it
  into `DiagnosticsNotice`. The alias name is unchanged, so they need no edit.
- `surface.tst.ts:301-310` already refuses `useStopNotice` and `StopNoticeProps` from both entries. D-16 adds the new
  names beside them.
- The tests that touch the old ledger shape are `test/helpers.ts:14, 222-225`, `DiagnosticsNotice.test.tsx:15, 19,
  60-61`, `TimelineNotice.test.tsx:19, 73, 224-229, 251, 273-299` and `Simulator.broke.test.tsx:22, 86`.
</code_context>

<specifics>
## Specific Ideas
- Every test that reads the alert reads `data-announce` and `role` (and element identity for remounts), never a ledger
  field. After this phase no test reads `.current` on the stop path.
- The changeset says the alert is unchanged. It does not claim a defect was fixed: this is the review's "speculative"
  candidate, and the phase stays narrow (no copy, style, test-id or focus change).
- `DockFrame.renders.test.tsx` R2 (`isAbove`) is the existing row that already tolerates the record's one extra
  commit. Nothing pins an exact commit count after a stop.
</specifics>

<deferred>
## Deferred Ideas
- A model-side announcement store, so a headless host could ask "was this stop announced?": rejected for this phase
  (D-06). It would be a public shape with no consumer.
- Merging `TimelineNotice` and `DiagnosticsNotice` into one generic notice: out of scope. Their region and copy
  differ (diagnostics has the polite `Starting` region), and BEH-QD-509 and BEH-QD-520 state them separately.
- Phase 85's IN-01 and IN-02 (the optional `hydration` prop fallback; the "1 dehydrated entry have" wording): not
  touched here. The hydration block is not on the stop path.
</deferred>
