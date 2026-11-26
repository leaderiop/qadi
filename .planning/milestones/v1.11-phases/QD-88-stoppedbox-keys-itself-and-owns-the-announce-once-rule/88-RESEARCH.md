# Phase 88: `StoppedBox` keys itself and owns the announce-once rule - Research

**Researched:** 2026-11-25
**Domain:** React 19 stop-notice state (a reducer-held per-feed ledger), a pure `model/` ledger module, characterisation and scratch-variant proof for unmeasured React files, spec records
**Confidence:** HIGH. The D-06 design was built, run against the whole devtools suite and mutated; every measurement below is from this session at HEAD `947bb0a3` (source identical to `c99015e9`; `git diff --stat c99015e9 HEAD -- . ':!.planning'` is empty).

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

Standing instruction (verbatim, 88-CONTEXT.md line 3): "do not ask me, you are in the autonomous mode. always pick the most complete and clean solutions not the simplest". Breaking changes are allowed; source compatibility is never the tiebreaker.

#### Binding milestone decisions (carried forward from Phase 85; not re-decided)
- **D-01:** Work only on branch `arch-wave-16`, on the main tree, one phase at a time. No merge, push, tag, release, publish, `changeset version` or version-packages PR (WX-07). Never `git add -A` under `.planning/milestones`. Never stage `.planning/config.json`, `README.md`, `.agents/`, `.codex/`, `.planning/state.json`, `assets/` or `*.iter*.md`.
- **D-02:** Use only the reserved records: ARCH-135, ADR-QD-201, CCR-QD-480, BEH-QD-776..780, INV-QD-421..422. Never run `node scripts/next-id.mjs`. Name any unused reservation in the CCR row ("Unused: …"). Pass `--date 2026-11-25` (or the real edit date) to `scripts/spec-revise.mjs`.
- **D-03:** Every behaviour change is preceded by a test written on the phase base: RED there for a change, green for preserved behaviour. Every new check is shown failing once, with the scratch variant and the failing text recorded in `88-RED-EVIDENCE.md` (WX-06). `pnpm check:pr < /dev/null` is green at the phase end (WX-01).
- **D-04 (the wave's changeset policy, Phase 85 D-04):** one `.changeset/*.md` for `@qadi/devtools`, a **patch**: "A stop notice's box derives its own key and records the announced stop through state its dock holds for each feed; the announced alert is unchanged. No export changes." Not Breaking: no public name, type or tag moves. Every touched name is package-private, and `surface.tst.ts` already refuses `useStopNotice` and `StopNoticeProps` from both entries (301-310).
- **D-05:** Every commit ends with exactly one trailer line, `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

#### Area 1: Relocate or remove the render-phase ref read (the roadmap's open choice)
- **D-06 (remove it; decided autonomously, against the research's "relocate" recommendation):** the ledger becomes a React-held value and is never read through a ref. `useStopNotice` holds `const [ledger, record] = useReducer(recordStop, noStops)`, where `recordStop` is the pure transition (D-10), and returns `useMemo(() => ({ status, onRestart, announced: { ledger, record } }), [status, onRestart, ledger, record])`. The box reads `announced.ledger` as a prop and calls `announced.record(status)` from its layout effect.
  - **Why this is the complete option.** There are two render-phase reads today, not one: the callers' `key` and the box's own `useState` initializer (StoppedBox.tsx:116). "Relocate into the wrapper with an opaque closure" centralises the first and keeps both. Holding the value in React state removes both, and render becomes a pure function of props. That makes the StrictMode guarantee structural rather than a property of how the ref happens to be read.
  - **Why the key does not churn (the property that makes it work, INV-QD-421).** `stoppedKey(ledger, s)` is `ledger.stop === s ? ledger.count : ledger.count + 1`, so the key for `s` is the same before and after `s` is recorded. The record's re-render keeps the box mounted, and the alert fixed at mount stays on the same element. `recordStop` returns the **same ledger by identity** for a stop already recorded, so React bails out of a repeat record (StrictMode's re-run effect, a tab switch's remount). It commits at most one extra pass per newly shown stop.
  - **Semantics kept.** A stop is recorded only when a box for it commits, so a stop no box ever showed is not "announced" (D8: it alerts on the first visit to a screen with a notice). That is exactly the meaning the `WeakMap` alternative would change.
  - **Cost, accepted and recorded in ADR-QD-201:** one extra `DockFrame` subtree render the first time each stop is shown, from a layout effect, before paint. `DockFrame.renders.test.tsx` R1 has no stop and stays at zero. R2 asserts `isAbove` and still holds. No configure re-runs, because `useDockModel`'s hand-over is in `DevtoolsDock`, above `DockFrame`.
  - **AGENTS.md §13 is not engaged:** the ledger records which stop was announced, never a decision or what a status says. It is the same kind of value as the box's existing `alert` `useState`. ADR-QD-201 says so in one sentence, and AGENTS.md is unchanged.
  - Rejected: **relocate into the wrapper with an opaque closure** (`keyOf`/`announced`/`record` over a ref), the research's recommendation. It moves the first read into one place and leaves both reads in render, and its closure would put the rule in the hook, not the box.
  - Rejected: **an identity-to-ordinal `WeakMap`**. It changes what "announced" means for a never-mounted stop (the roadmap's own finding).
  - Rejected: **a per-feed model store** (a twelfth `DockModel` store or a ledger inside each feed). It puts a pure UI announcement concern into the headless public model, widens a public shape for no consumer, and moves the eleven-store count and its sweeps.
  - Rejected: **`setState` during render** to derive the key, which is legal but loops easily and moves the alert decision's timing (PITFALLS 88-B).
  - Rejected: **`useState` plus a hand-written updater** in place of `useReducer`, which would state the transition twice: the reducer is the pure function itself.
- **D-07 (where the ledger lives):** above the screens, one per feed. `useStopNotice` keeps its role and its file, and `DockFrame` keeps calling it once per feed (111, 113), unchanged. The box owns the rules (key, alert, record). The hook owns where the ledger is held. A ledger is never inside the box or a screen, because every tab switch would re-announce. There is one reducer per feed, never one for both, because a second stop of one feed would re-announce the other (ADR-QD-197's rejection). No module-scope ledger (`MODULE_STATE_BUDGET`, AGENTS.md §6, still only `DeveloperSignals.ts`). The memo stays keyed on the feed's `restart` as well as `status`, never on `status` alone, so a model rebuilt after a hidden `Activity` hands the rebuilt `restart` (DS3).

#### Area 2: How `StoppedBox` keys itself, and "decided at mount, recorded at commit"
- **D-08 (outer wrapper, keyed body):** `StoppedBox` (exported, package-private) renders `<StoppedBody key={stoppedKey(notice.announced.ledger, notice.status)} … />`, and `StoppedBody` is module-private. A component cannot set its own `key`, so the wrapper is the only shape. The body holds:
  - `const [alert] = useState(() => announcesStop(announced.ledger, status))`. This is decided at mount, from a prop.
  - `useLayoutEffect(() => announced.record(status), [announced.record, status])`. This is recorded at commit, and the layout timing is kept, so the record's re-render lands before paint. The effect is keyed on `record` and not on the handle, so the record's own re-render (which builds a new handle) re-runs nothing. A box handed another feed's ledger (another `record`) records there (TN15's property).
  - Nothing is written during render. A discarded or doubled render records nothing: StrictMode's double render reads the same unrecorded ledger twice, so the alert is kept (TN7, N9).
  - No `role="alert"` is ever added to or removed from a mounted element (BEH-QD-509), and the role, `data-announce`, `data-sampled`, test ids, focus target and copy are unchanged.
- **D-09 (the box takes the notice whole; no `Binding`):** `StoppedBoxProps<S>` replaces its three props `status`, `onRestart` and `announced` with one, `notice: StopNoticeProps<S>`, plus the copy (`reason`, `lead`, `body`, `reasonLabel`, `restartLabel`), `feed` and `sampled?`. Each notice's `noticeOf` arm takes the notice props whole, `(notice: StopNoticeProps<…>) => …`, and both `Binding` types are deleted. Hook, notice and box then share one value, the hook's memoised props, and the success criterion's "stop threading the ledger through private bindings" holds literally. `StopNoticeProps<S>` keeps its name and its home in `StoppedBox.tsx`, and `DiagnosticsNoticeProps` and `TimelineNoticeProps` stay its aliases, so "the prop type names stay" holds. The field keeps the name `announced`, and its type becomes `AnnouncedStops<S> = { readonly ledger: StopLedger<S>; readonly record: (status: S) => void }`, declared beside `StopNoticeProps` (React-side: `record` is a dispatch). It is immutable, so a caller that reads it reads a React-held value, never a mutable `.current`.
  - Rejected: **keeping the three props and the `Binding`**, because they restate the hand-off the criterion removes.
  - Rejected: **making the handle a class with private fields** for true opacity. That is ceremony for an immutable value. Opacity is enforced structurally instead (D-17's import judge: only `StoppedBox.tsx` and `useStopNotice.ts` import the ledger module).

#### Area 3: The pure ledger module
- **D-10 (home, names, contents):** a new package-private `packages/devtools/src/model/StopLedger.ts`. It is React-free, contains no JSX, and is in neither barrel (ADR-QD-099; the named-barrel rule exports nothing it does not name). It holds:
  - `StopLedger<S>` (moved unchanged: `{ readonly stop: S | undefined; readonly count: number }`) and `noStops` (moved).
  - `stoppedKey(ledger, status): number` (moved; formula unchanged).
  - `announcesStop(ledger, status): boolean`, which is `ledger.stop !== status`. This is the alert decision, stated once.
  - `recordStop(ledger, status): StopLedger<S>`. It returns `ledger` itself when `ledger.stop === status`, otherwise `{ stop: status, count: ledger.count + 1 }`, and it is the reducer. It keeps references and never spreads a fresh record for an unchanged ledger.
  - Identity per stop value (`===`), as today; Phase 87 kept the `Stopped` values' identity rules (FEATURES §87 "88 keys on identity").

  `StoppedBox.tsx` stops declaring `StopLedger`, `noStops` and `stoppedKey`, and its header doc is rewritten to name the wrapper and the ledger module. The planner may rename the two new functions if a clearer name exists, but must keep the three functions distinct (one transition, two reads) and must keep the module under `model/`.
  - Rejected: **keeping the functions in `StoppedBox.tsx`**, because no Stryker config reaches `src/react` and the one real decision would stay unmeasured (PITFALLS 88-C).
  - Rejected: **folding the key and the alert into one function** returning `{ key, alert }`. The key is read on every render and the alert only at mount, and one return shape would blur the two moments the ADR distinguishes.
- **D-11 (the table test):** `packages/devtools/test/model/StopLedger.test.ts` is a table over `(ledger, status) → (key, announces, recorded)`. Rows: an empty ledger and a first stop; the recorded stop again (same key, does not announce, `recordStop` returns the same ledger by `===`); a second, distinct stop (key + 1, announces, count + 1); a stop after a restart that is a new identity with equal fields (announces: identity, not structure); a ledger of count n.

  It also holds the two laws as rows over the table, not prose:
  - the key is stable across the record: `stoppedKey(recordStop(l, s), s) === stoppedKey(l, s)` (INV-QD-421);
  - recording is idempotent by identity: `recordStop(recordStop(l, s), s) === recordStop(l, s)`.

  Each law is shown failing once with a scratch variant (a fresh spread on the known stop; a key that reads `count` without the `+ 1` branch), recorded in `88-RED-EVIDENCE.md`. A row's title names the property, never a D-number or a phase number (WX-07).

#### Area 4: Characterisation, held tests and measurement
- **D-12 (plan 1: the characterisation on the base, SBOX-01):** a new file through the public seam `DevtoolsDock` (whose props are the only seam the rows touch), so the same rows hold before and after the change. The working name is `test/react/DockFrame.announce.characterisation.test.tsx`, and the planner may rename it. It reads only the DOM: `data-announce`, `role`, and element identity. Rows:
  - each feed's stop is announced once and is silent on every revisit across tab switches, under `<StrictMode>` (DS1 and D7 under StrictMode, with `role="alert"` present exactly once per distinct stop);
  - TN14's property stated observably: after a remount for the announced stop, a re-render keeps the same `-stopped` element, and the next distinct stop remounts with the alert;
  - a stop that happened while no notice was mounted alerts on the first visit (D8 and TN8, both feeds);
  - a second stop after Restart alerts again under StrictMode;
  - a box is not remounted by the commit that records its stop, which is the DOM face of INV-QD-421 and the row that catches a double count: the element identity is kept across the record's re-render.

  The file is green on the base and after the change. It is held byte for byte from the commit that adds it. DS1-DS3 (`DockFrame.stops.characterisation.test.tsx`), D7/D8 (`DiagnosticsScreens.test.tsx` 249, 268) and TN1-TN10 and TN13 are held unedited.
- **D-13 (declared edits; every other test held):** every `packages/devtools/test` file is held byte for byte except these declared edits, which are confined to declared regions in the 87-pinned-check style:
  - `test/helpers.ts` (`noStops` import at 14 and `liveNotice` at 222-225 build the new handle; the name `liveNotice` stays);
  - `test/react/TimelineNotice.test.tsx` (`ledger()` at 73, TN11 224-229, TN12 251, TN14 273-285, TN15 288-299);
  - `test/react/DiagnosticsNotice.test.tsx` (`freshRef` at 19, `notice()` at 60-61, N9, N12, N13);
  - `test/react/Simulator.broke.test.tsx` (SB1 74-95 renders `StoppedBox` with `announced={{ current: noStops }}` at 86, so its props must change; see D-15);
  - `test/surface.tst.ts`, for D-16's refusals only.

  Rows that need a ledger that moves (N9, N12, N13, TN14, TN15) render through a small harness that calls the real `useStopNotice`, so the hook is tested too. Rows that do not care use a fixed handle over `noStops`. TN14 reads `announced.current.count`, a ledger internal, and TN15 reads `second.current.stop`. Their properties are re-homed: TN14's goes to the table test's idempotence law plus D-12's DOM row, and TN15's becomes "a box handed another feed's ledger records there and its stop is then silent on that ledger". ADR-QD-201 carries an audit table (the ADR-QD-200 precedent) naming each edited row and the test that now holds its property ("no property lost").
- **D-14 (scratch variants for the unmeasured React files, SBOX-04, WX-06):** each variant is seen failing with its text recorded:
  - drop the layout-effect record, which fails DS1 and D7 (a revisit re-announces);
  - record during render, which fails D-12's StrictMode row;
  - a constant key, which fails N12 and DS2 (a second stop does not remount);
  - move the reducer into the box, which fails DS1 (a tab switch re-announces);
  - one reducer for both feeds, which fails DS2;
  - key the memo on `status` alone, which fails DS3;
  - add the role to a mounted element (decide the alert per render rather than at mount), which fails N9 and D7.

  `88-mutation.mjs`'s `UNMEASURED` lists `react/StoppedBox.tsx`, `react/useStopNotice.ts`, `react/TimelineNotice.tsx` and `react/DiagnosticsNotice.tsx`, each with its reason, plus `react/DevtoolsDock.tsx` only if a plan edits it (D-07 expects it unchanged).
- **D-15 (Phase 87's deferred IN-04: taken, because its trigger is met):** 87-REVIEW-DISPOSITION.md defers IN-04 to "the next phase that edits the Simulator's tests", and D-13 must edit `Simulator.broke.test.tsx`, because SB1 renders `StoppedBox` with the old props. In the same edit:
  - SB4 compares the Simulator block's `style` attribute to the stopped box's rendered `style` attribute;
  - SB1 keeps the literal `REASON_STYLE` (28-29) only as the byte-identity golden of Phase 87's move, with a comment saying it is a deliberate golden;
  - the file header's "held byte for byte from the commit that adds it" is reworded to name the commit that last edits it.

  Taking it costs nothing extra, because the file is reopened anyway. Leaving it would knowingly re-defer a finding whose stated trigger fired.
- **D-16 (surface refusals):** `test/surface.tst.ts` gains "no exported member" refusals of `StopLedger`, `noStops`, `stoppedKey`, `announcesStop`, `recordStop` and `AnnouncedStops` from both entries, the ADR-QD-197 precedent that pinned `useStopNotice` and `StopNoticeProps`. They are `@ts-expect-error` lines and count against no budget. Gate 13 is unmoved: no export is added or removed.
- **D-17 (phase scripts, the Phase 85-87 pattern):**
  - `88-check.mjs`: base, trailers, scan-ids, scan-forbidden, records, and a **shape judge**. The judge requires no `useRef` and no `.current` in the four stop-path files; no `key=` on a `StoppedBox` element in either notice; no `Binding` in either notice; `model/StopLedger.ts` imported in `src` only by `react/StoppedBox.tsx` and `react/useStopNotice.ts`; no `react` import and no JSX in `model/StopLedger.ts`; and no module-scope `let` in the touched files.
  - `88-pinned-check.mjs`, implementing D-13's held and declared sets and D-12's born file.
  - `88-mutation.mjs`, implementing D-18.
  - `88-earlier-checks.mjs`, which runs Phases 85-87's checks from scratch copies with an **expected-reports ledger**: 87's and 86's pinned checks will report the D-13 files, and each report is named with the 88 commit that explains it. The script never edits an archived check's path constants.

  Each script has a self-test, and each mode is seen failing once. New phase scripts start with the directive exemption the earlier scripts use (PITFALLS: `"use client";` first line where `scan-forbidden` needs it).
- **D-18 (mutation, WX-05):** `stryker.devtools.mjs` already mutates `packages/devtools/src/model/**/*.ts`, so `model/StopLedger.ts` is measured. `88-mutation-base.json` is taken on the phase base with the same invocation, and it records that no measured file is touched there (`stoppedKey` comes from the unmeasured `StoppedBox.tsx`, so there is no `RENAMED` comparison). At close, `StopLedger.ts` must have **every mutant killed**, or each survivor must be recorded as an equivalent with its reason. A survivor is closed with a test, never re-baselined. Coverage stays at or above 90% for devtools.

#### Area 5: Records
- **D-19 (ADR-QD-201 new, ADR-QD-197 amended; not "197 amended and 201 unused"):** a new ADR is the complete record. The change replaces a mechanism (ref to reducer), moves the rule into a measured module, changes the box's input, and carries its own rejected alternatives (relocate, `WeakMap`, model store, render-phase `setState`) and an audit table (D-13). Folded into a five-decision ADR it would bury all of that in one decision. The Phase 85-87 precedent is a new ADR for each phase's mechanism.
  - ADR-QD-201 states D-06 to D-11, the cost (D-06), the §13 note, the audit table, and "What enforces it" naming commands, never gate numbers.
  - ADR-QD-197 gets a dated amendment on decision 4 (revision 1.5): "the ledger is held by `useReducer` over `model/StopLedger.ts`'s `recordStop`, and the box derives its key; see ADR-QD-201". Its "A hook and not a plain helper" reason still stands, with a reducer and a memo now. Its other decisions are untouched.
- **D-20 (BEH and INV allocation):** the planner may rebalance the allocation, but must use all five BEH and both INV ids or name an unused one in CCR-QD-480.
  - BEH-QD-776: a stop notice's box derives its own key, and a notice passes no key.
  - BEH-QD-777: the alert is decided at a box's mount from the committed ledger, and the stop is recorded at commit, never during render.
  - BEH-QD-778: the ledger transition is one pure function: a new stop counts once, and a recorded stop returns the same ledger.
  - BEH-QD-779: each feed's ledger is a React-held value per feed, held above the screens, and handed hook to notice to box as one value.
  - BEH-QD-780: a stop no box has shown is not announced, and it alerts on the first screen that shows it.
  - INV-QD-421: a stop's key is the same before and after it is recorded, and recording a recorded stop returns the same ledger, so the record never remounts the box.
  - INV-QD-422: the stop ledger is written only at commit, by the box, once per feed, never during render and never at module scope; the alert role is never added to or removed from a mounted element.
  - BEH-QD-759 is restated (its "the ledger is a `useRef`" sentence at 28-devtools-screens.md:4072, and its "Pinned by" list). BEH-QD-509's "every new stop is a new mount" paragraph (1554-1556) gains a link to BEH-QD-776 and BEH-QD-777.
  - The `spec/traceability.md` rows, `spec/decisions/index.yaml`, and the CCR-QD-480 row in `spec/README.md` move with them. Any ` ```typescript ` fence must compile (`check-doc-examples.mjs`). The new signatures are listed in ` ```ts ` fences.

### Claude's Discretion
- The exact names of `announcesStop`, `recordStop`, `AnnouncedStops` and `StoppedBody`, and of the characterisation file (D-10, D-12), within the shapes fixed above.
- The harness's shape for the notice tests (D-13), as long as it calls the real `useStopNotice`.
- The plan count and the wave split, as long as plan 1 is the characterisation (D-12) plus the mutation base (D-18), the table test is seen RED before `model/StopLedger.ts` exists, and the records plan comes last.

### Deferred Ideas (OUT OF SCOPE)
- A model-side announcement store, so a headless host could ask "was this stop announced?": rejected for this phase (D-06). It would be a public shape with no consumer.
- Merging `TimelineNotice` and `DiagnosticsNotice` into one generic notice: out of scope. Their region and copy differ (diagnostics has the polite `Starting` region), and BEH-QD-509 and BEH-QD-520 state them separately.
- Phase 85's IN-01 and IN-02 (the optional `hydration` prop fallback; the "1 dehydrated entry have" wording): not touched here. The hydration block is not on the stop path.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SBOX-01 | A characterisation written on the base pins announce-once (once per stop, not again on a tab switch, not lost under StrictMode), including TN14, D7 and the `DockFrame` stop characterisation | Drafted rows A1-A5 (plain and StrictMode) and the hook rows H1-H3 were run on the base: 11/11 and 3/3 green, then on the D-06 build: all green (Spike 4). Plan 1 must commit them with the base `helpers.ts` (see Pitfall 7). |
| SBOX-02 | `StoppedBox` derives its own key and writes the ledger (outer keyed wrapper, inner body); callers stop calling `stoppedKey` and stop threading the ledger ref; the ledger stays above the screens, per feed | D-06 build run on the full suite: 2086 passed after the declared test edits (Spike 3). The wrapper/body, hook and notice shapes are in "Prescriptive module API". |
| SBOX-03 | The ledger transition is a pure function with a table test; alert decided at mount, recorded at commit, never during render; no module-scope ledger | `model/StopLedger.ts` (15 lines) with a 6-row table, three laws and a property test; Stryker 12 Killed + 4 Ignored (static) = 16 Killed with `ignoreStatic:false` (Spike 7). Record-during-render is caught only by a new row (Spike 5, V2). |
| SBOX-04 | ADR-QD-201 records the change; BEH/INV/traceability move with it; unmeasured React files in `UNMEASURED` and proved with scratch variants | Spec amendment table, variant table V1-V10 with the exact failing rows, and the script porting notes below. Two of D-14's expected failures are refuted and corrected (Spike 5). |
| WX-01..WX-07 | Wave cross-cutting: green `pnpm check:pr`, spec gates, mutation, changeset, trailers, no merge/push/release | Environment, gates and house-style traps below; trailer convention D-05. |
</phase_requirements>

## Summary

D-06 works as decided, with one measured refinement and two corrections to D-14. The reducer-held ledger keeps the body mounted across its own record (the key `ledger.stop === s ? ledger.count : ledger.count + 1` is the same before and after the record), the alert fixed at mount stays on the same DOM node, and StrictMode's double render reads the same unrecorded ledger twice, so the alert survives. Applied to the real files the whole devtools suite is green (109 files, 2086 tests) once the declared test edits are made, `tsc`, `check-house-style`, `oxlint` (only the pre-existing `.codex` warnings) and `pnpm circular` are clean, and `pnpm test:tstyche` passes with the new surface refusals.

The refinement is the cost statement. React's `useReducer` has no eager-state bail-out (unlike `useState`), so a dispatch of an unchanged ledger is not skipped at the dispatch: it costs one extra function call of the dock frame and one Profiler commit, and zero renders of the box or body. A newly shown stop therefore costs one record pass (2 parent renders, 2 commits against the base's 1 and 1); a remount for an already recorded stop or an `Activity` show costs one bailed-out parent call. ADR-QD-201's cost sentence should say exactly that, not "React bails out of a repeat record".

Two of D-14's expected failures are wrong and a third scratch variant is invisible to every DOM row. Recording during render (the record moved out of the layout effect into the body's render) fails NO existing or drafted dock row, so D-14's "fails D-12's StrictMode row" is refuted; it is caught only by a new "a render that is thrown away announces nothing" row through the hook (error boundary plus a throwing sibling). A memo keyed without `onRestart` fails NOT DS3 (a rebuilt model hands a new `Stopped` identity anyway), only a new "restart follows while the status is the same" row. An effect keyed on the handle instead of `record` is unobservable in the DOM and costs one more commit, so it needs an upper-bound commit-count row. Those three rows are drafted below and each was seen failing.

**Primary recommendation:** Implement D-06..D-11 as written (code in "Prescriptive module API", validated on the full suite), add the three hook rows plus the commit-bound row to plan 1's born set, take the 88 ledger rows from "Script porting", amend ADR-QD-201's cost sentence per the addendum, and prove each React-side variant with the exact failing rows in the variant table.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| The announce-once rule (transition, key, alert decision) | Headless model (`src/model/StopLedger.ts`, React-free) | — | The one real decision; a pure function is measurable by `stryker.devtools.mjs` and testable as a table. |
| Where a feed's ledger is held (outlives screens, one per feed) | Browser / client, React hook (`useStopNotice`, in `DockFrame`) | — | UI state about what a human was shown; it never enters the public model (D-06 rejection of a model store). |
| Keying and alert-at-mount, record-at-commit | Browser / client, `StoppedBox` wrapper and `StoppedBody` | — | A key is an element property, so only a wrapper can set it; the effect belongs to the mounted body. |
| Copy, test ids, focus target, styles | Browser / client, `StoppedBox` `FEEDS` row and the two notices | — | Unchanged by the phase. |
| Spec records (ADR/BEH/INV/CCR, traceability, index.yaml) | Docs / spec tree | — | Gated by `spec:verify`, `spec:examples`, `spec:claims`, `spec:api`, `spec:gates`. |

No server, API, CDN or database tier is touched.

## Standard Stack

Nothing is installed. Every tool already resolves in the repo.

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| react | 19.3.1 (peer `>=19.2.4`) | `useReducer`, `useMemo`, `useState`, `useLayoutEffect` | The binding already uses these hooks; the reducer is the pure function itself [VERIFIED: `packages/devtools/package.json:51` `"react": ">=19.2.4"`; installed 19.3.1 from the Spike 1 run] |
| effect | 4.1.2 | `Match.tagsExhaustive` stays in the two notices | Unchanged [VERIFIED: AGENTS.md §4 "The installed `effect@4.1.2`"] |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| vitest | 5.1.0 (project `devtools`, happy-dom) | Test runner | All new tests |
| @testing-library/react | ^16.3.3 | `render`, `act`, `screen` | Component rows [VERIFIED: `pnpm-workspace.yaml:23`] |
| fast-check | 4.10.2 | One property row over `recordStop` sequences | `StopLedger.test.ts` LAW3; already a devtools devDependency [VERIFIED: `pnpm-workspace.yaml:28`, `packages/devtools/package.json:65`] |
| @stryker-mutator/core + vitest-runner | 10.1.1 | Mutates `model/StopLedger.ts` | D-18 [VERIFIED: `package.json:61-62`] |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `useReducer(recordStop, noStops)` | `useState` + hand-written updater | Restates the transition twice (D-06 rejection) |
| `useReducer` | an opaque ref closure | Keeps two render-phase reads (D-06 rejection) |

**Installation:** none.

**Version verification:** `react` 19.3.1 and `effect` 4.1.2 are the installed versions used by every run in this session; no package is added, so no registry check applies.

## Package Legitimacy Audit

No external package is installed or added by this phase. **Packages removed due to [SLOP] verdict:** none. **Packages flagged as suspicious [SUS]:** none. `fast-check` is already a catalog devDependency of `@qadi/devtools` (4.10.2); it is not new.

## Architecture Patterns

### System Architecture Diagram

```
 DevtoolsDock (useDockModel: configure hand-over, above DockFrame, untouched)
   |
   v
 DockFrame  -- useStopNotice(diagnosticsStatus, diagnostics.restart) --> noticeD
   |        \- useStopNotice(timelineStatus,    timeline.restart)    --> noticeT
   |              each call:  [ledger, record] = useReducer(recordStop, noStops)   (one per feed, above every screen)
   |                          notice = useMemo({ status, onRestart, announced: { ledger, record } },
   |                                           [status, onRestart, ledger, record])
   v
 Screen(tab) --hands noticeD / noticeT down (unchanged)--> ServicesPanel / QuestionsPanel / Log / Inspector ...
   |
   v
 DiagnosticsNotice(notice) / TimelineNotice(notice)      noticeOf(status)(notice)  -- Match.tagsExhaustive, arm takes the notice whole
   |   Stopped arm only
   v
 StoppedBox(props)   (wrapper)  key = stoppedKey(notice.announced.ledger, notice.status)   <- pure read of a prop
   |
   v
 StoppedBody (module-private, keyed)
   |  mount : useState(() => announcesStop(ledger, status))        -> role="alert" decided here, never again
   |  commit: useLayoutEffect(() => record(status), [record, status])
   |            |
   |            +--> reducer recordStop(ledger, status):  same stop -> SAME ledger (identity)  |  new stop -> { stop, count + 1 }
   |                   -> DockFrame re-renders once, before paint; key for `status` is unchanged (count rose by one, branch flipped)
   |                      -> StoppedBody stays mounted, same DOM node, alert kept
   v
 DOM: section[-notice] > div[-stopped, role/data-announce] + pre[-reason] + button[-restart]   (unchanged)
```

Entry points: the feed's `status` and `restart` (from the dock model) enter `DockFrame`. The only write path is `record`, called from a layout effect. A discarded render dispatches nothing.

### Recommended Project Structure
```
packages/devtools/src/
├── model/StopLedger.ts        # NEW: StopLedger<S>, noStops, stoppedKey, announcesStop, recordStop (no React, no JSX, no "use client")
├── react/StoppedBox.tsx       # AnnouncedStops<S>, StopNoticeProps<S>, StoppedBoxProps<S>, StoppedBox (wrapper), StoppedBody (private)
├── react/useStopNotice.ts     # useReducer + useMemo; "use client"; signature unchanged
├── react/TimelineNotice.tsx   # no key, no Binding; arm takes the notice whole
└── react/DiagnosticsNotice.tsx
packages/devtools/test/
├── model/StopLedger.test.ts                                   # NEW table + laws (RED before the module exists)
├── react/DockFrame.announce.characterisation.test.tsx         # NEW born file on the base (rows A1-A5, plain and StrictMode)
└── react/useStopNotice.test.tsx                               # NEW born file on the base (rows H1-H3 + the commit bound)
```

### Prescriptive module API (built and run this session; names are the D-10 defaults)

`model/StopLedger.ts` [VERIFIED: file at the spike, 15 lines; run through the full suite, `tsc`, `check-house-style`, Stryker]. The prototype carried no doc comments; the real file needs the house shape (one-line summary, then the why).

```ts
/** What a dock has announced: the last stop a box showed, and how many distinct stops boxes have shown. ... */
export interface StopLedger<S> {
  readonly stop: S | undefined;
  readonly count: number;
}

/** A ledger with no stop in it: what a dock starts from. */
export const noStops: StopLedger<never> = { stop: undefined, count: 0 };

/** The key of the box for `status`: the same before and after `status` is recorded, one higher for a new stop. */
export const stoppedKey = <S,>(ledger: StopLedger<S>, status: S): number =>
  ledger.stop === status ? ledger.count : ledger.count + 1;

/** Whether a box mounting for `status` announces it: only a stop the ledger has not recorded. */
export const announcesStop = <S,>(ledger: StopLedger<S>, status: S): boolean => ledger.stop !== status;

/** The ledger after a box for `status` committed; the same ledger, by identity, for a stop already recorded. */
export const recordStop = <S,>(ledger: StopLedger<S>, status: S): StopLedger<S> =>
  ledger.stop === status ? ledger : { stop: status, count: ledger.count + 1 };
```

`react/StoppedBox.tsx` (changed parts; `"use client";` stays line 1; `FEEDS`, styles, JSX body unchanged) [VERIFIED: the applied diff, full suite green]:

```tsx
import type { CSSProperties, MouseEvent, ReactElement } from "react";
import { useLayoutEffect, useState } from "react";
import { announcesStop, stoppedKey, type StopLedger } from "../model/StopLedger.ts";

/** The ledger a feed's notice reads, and the call that records a stop in it. */
export interface AnnouncedStops<S> {
  readonly ledger: StopLedger<S>;
  readonly record: (status: S) => void;
}

export interface StopNoticeProps<S> {
  readonly status: S;
  readonly onRestart: () => void;
  readonly announced: AnnouncedStops<S>;     // was RefObject<StopLedger<S>>
}

export interface StoppedBoxProps<S> {
  readonly notice: StopNoticeProps<S>;       // replaces status, onRestart, announced
  readonly reason: string; readonly lead: string; readonly body: string;
  readonly reasonLabel: string; readonly restartLabel: string;
  readonly feed: StoppedFeed; readonly sampled?: boolean | undefined;
}

export const StoppedBox = <S,>(props: StoppedBoxProps<S>): ReactElement => (
  <StoppedBody key={stoppedKey(props.notice.announced.ledger, props.notice.status)} {...props} />
);

const StoppedBody = <S,>({ notice: { status, onRestart, announced }, reason, lead, body, reasonLabel, restartLabel, feed, sampled }: StoppedBoxProps<S>): ReactElement => {
  const { hooks, focusTarget } = FEEDS[feed];
  const [alert] = useState(() => announcesStop(announced.ledger, status));
  useLayoutEffect(() => announced.record(status), [announced.record, status]);
  // restart handler and JSX unchanged
};
```

`react/useStopNotice.ts`:

```ts
"use client";
import { useMemo, useReducer } from "react";
import { noStops, recordStop, type StopLedger } from "../model/StopLedger.ts";
import type { StopNoticeProps } from "./StoppedBox.tsx";

export const useStopNotice = <S>(status: S, onRestart: () => void): StopNoticeProps<S> => {
  const [ledger, record] = useReducer<StopLedger<S>, [S]>(recordStop, noStops);
  return useMemo(() => ({ status, onRestart, announced: { ledger, record } }), [status, onRestart, ledger, record]);
};
```

Notices: delete `type Binding`, drop the `stoppedKey` import, give the `noticeOf` arm the whole notice, pass `notice={notice}`, delete `key`, `status`, `onRestart` and `announced` from the `<StoppedBox>` call; the components become `TimelineNotice = (notice) => <>{noticeOf(notice.status)(notice)}</>` and `DiagnosticsNotice = (notice) => { const { region, stopped } = noticeOf(notice.status)(notice); ... }`. `noticeOf`'s annotation becomes `(self: S) => (notice: XNoticeProps) => …`. No other src file changes (`DevtoolsDock.tsx`, `ServicesPanel.tsx`, `QuestionsPanel.tsx` untouched) [VERIFIED: tsc clean on the prototype].

Typing facts the planner must carry:
- `useReducer<StopLedger<S>, [S]>(recordStop, noStops)` types without a cast: `noStops: StopLedger<never>` is assignable to `StopLedger<S>` and `recordStop` is generic, so no `as` is needed (`check-house-style` clean) [VERIFIED].
- `AnnouncedStops<S>.record: (status: S) => void` makes `StopNoticeProps<S>` **invariant** in `S`. A test that writes `const status: TimelineStatus = TimelineStatus.Stopped(...)` is control-flow narrowed to `Stopped`, so a bare `useStopNotice(status, restart)` infers the wrong `S` and does not typecheck against `TimelineNoticeProps`. Write `useStopNotice<TimelineStatus>(status, restart)` in tests. The src is unaffected because `DockFrame`'s statuses are typed as the unions [VERIFIED: the TS error and the fix in the hook row H2].

### Anti-Patterns to Avoid
- **A ref anywhere on the stop path** (D-17 shape judge): reading `.current` in render is the defect being removed.
- **Writing the ledger during render**: not caught by any DOM row (Spike 5, V2). Only the discarded-render row (H1) catches it, so H1 must exist.
- **A memo keyed on `[status]` alone, or without `onRestart`**: loses the rebuilt feed's `restart` while the status identity is unchanged; only H2 catches it.
- **An effect keyed on the handle**: re-runs after every record and costs a commit, invisible in the DOM; only the commit-bound row catches it.
- **One reducer for both feeds, or a reducer inside the box**: fail DS1/DS2 and A1-A4 (V4, V5).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| A stop ledger that outlives screens | A second updater/`useState` with its own merge logic, or a ref closure | `useReducer(recordStop, noStops)` | The reducer is the pure transition; state is stated once and measured by Stryker |
| Cross-render element identity for "the same stop" | A `WeakMap` of identities to ordinals | The `StopLedger` `{ stop, count }` and `===` | A `WeakMap` changes what "announced" means for a never-mounted stop (D-06) |
| "A stop is announced once under StrictMode" | A dev-only workaround | Render purity: decide at mount from a prop, record at commit | StrictMode's doubled render then cannot change the answer |
| Broken-port or broken-feed fixtures | Hand-built failing layers | Existing `makeCollectorDouble`, `decisionRecord`, `Stream.die` sources used by DS1-DS3 | Already the dock tests' seam |
| Phase gates | New ad hoc shell | Port `87-check.mjs`, `87-pinned-check.mjs`, `87-mutation.mjs`, `87-earlier-checks.mjs` | Each already has a self-test and judges |

**Key insight:** the rule is five lines of arithmetic. The risk is not in the arithmetic but in *when* it runs (render vs commit), so the proof is mostly DOM-timing rows plus scratch variants, and the arithmetic goes into the measured `model/` file.

## Common Pitfalls

### Pitfall 1: Believing D-14's variant-to-row map
**What goes wrong:** V2 (record during render) and V6 (memo without `onRestart`) are expected to fail D-12's StrictMode row and DS3; they fail nothing. V8 (effect keyed on the handle) is DOM-invisible.
**Why it happens:** the dock rows read only `data-announce`, `role` and element identity; a rebuilt model hands a new `Stopped` identity so DS3 passes anyway.
**How to avoid:** ship H1 (discarded render), H2 (restart follows), H3 (stable value) and the commit-bound row, each seen failing against its variant (table below).
**Warning signs:** a scratch variant run that prints a green suite.

### Pitfall 2: `useReducer` is not an eager bail-out
**What goes wrong:** the ADR sentence "React bails out of a repeat record" is read as "no extra render". A same-identity dispatch still costs one function call of the owning component (`DockFrame`) and one Profiler commit; the box and body do not re-render [VERIFIED: Spike 1c; consistent with React's documented caveat that React "may still need to call your component before ignoring the result" — CITED: react.dev/reference/react/useReducer].
**How to avoid:** word ADR-QD-201's cost as "one extra `DockFrame` pass per newly shown stop; a remount for a recorded stop or an `Activity` show costs one bailed-out call of `DockFrame` and renders nothing below it".
**Warning signs:** a test that asserts an exact commit count after a stop (none exists; R1 has no stop, R2 is `isAbove`).

### Pitfall 3: The record's re-render must not remount the box
**What goes wrong:** a key that is not record-stable (`count + 1` always) remounts the body on the record's re-render, so the node is replaced and the alert flips.
**How to avoid:** keep the `ledger.stop === status ? count : count + 1` branch. Variant V10 (always `count + 1`) fails 33 rows including A5, the table LAWs and TN4.

### Pitfall 4: An `Activity` that starts hidden
**What goes wrong:** layout effects do not run while an `Activity` subtree is hidden, so the body renders and decides its alert against the unrecorded ledger and only records on reveal.
**How to avoid:** nothing to do; it is identical to the ref version (same DOM and effect counts) [VERIFIED: Spike 2]. Do not "fix" it by recording in render.

### Pitfall 5: `"use client";` and the scan scripts
**What goes wrong:** `87-check.mjs`/`85-check.mjs` `scan-forbidden` flags a module-scope string literal in a new devtools `src` file. The exemption is exactly the line `"use client";` (a trailing comment defeats it: `85-check.mjs` self-test `"a use client line with a trailing comment is not exempt"`) [VERIFIED: `85-check.mjs:314` and its self-test at 1022-1025]. `model/StopLedger.ts` has no directive; the three `react/` files keep theirs.

### Pitfall 6: Phase-relative wording in new test titles and comments
The earlier scans' `PHRASE` regex `/this phase|until now|any more|no longer|from now on/i` and the id tokens `D-\d+`, plan ids `NN-NN`, `WX-0\d`, `STOP-0\d`, `QD-NN`, `Phase NN`, `-NEXT` apply to added lines in `src` and `test`. 88's `scan-ids` should add `SBOX-0\d`, `88-\d{2}`, `QD-88`, `Phase 88`. Row titles name the property (D-11), and the existing `A1`..`A5`/`H1`..`H3` labels are fine (they are not id tokens).

### Pitfall 7: Plan order and the helpers file
The born characterisation `DockFrame.announce.characterisation.test.tsx` imports `decisionRecord` from `test/helpers.ts`. On the base `helpers.ts` imports `noStops` from `StoppedBox.tsx`; after D-13's edit it imports it from `model/StopLedger.ts`. Measured: with the *edited* `helpers.ts` on base src the born file fails at import (module missing). So plan 1 must commit the born files while `helpers.ts` is still the base text, and the `helpers.ts` edit belongs to the later change plan.

### Pitfall 8: Two Stryker ignored-static families
`ignoreStatic: true` marks mutants in module-load initialisers as Ignored. `StopLedger.ts` has 4 (the `noStops` `{}` ObjectLiteral and three const-arrow ArrowFunction bodies). All 16 are Killed with `ignoreStatic: false` [VERIFIED: Spike 7]. Use 87's `EXAMINED` mechanism rather than rewriting to function declarations (whether declarations are non-static is [ASSUMED: not measured]).

### Pitfall 9: The new module must stay out of both barrels
`noStops`, `stoppedKey` etc. must stay out of both barrels; gate 13 (`pnpm spec:api`) and the `devtools-named-barrel` house-style rule both stay green because nothing is added to `src/index.ts` or `src/react/index.ts` [VERIFIED: `check-house-style.mjs` clean with the new module present].

## Code Examples

### The hook harness rows (drafted, green on base and on D-06)

[VERIFIED: file was run on the base src (3/3) and on the D-06 build; it only goes hook to notice, so it holds however the hook keeps its ledger.]

```tsx
// useStopNotice.test.tsx (born file; imports: assert/describe/it, act/fireEvent/render/screen, Component/ReactElement/ReactNode,
// vi, TimelineStatus, StopNoticeProps (type), TimelineNotice, useStopNotice)
class Boundary extends Component<{ readonly children: ReactNode }, { readonly failed: boolean }> {
  override state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  override render() { return this.state.failed ? <span data-testid="fallback" /> : this.props.children; }
}
const Thrower = ({ now }: { readonly now: boolean }): ReactElement => {
  if (now) throw new Error("a sibling died after the notice rendered");
  return <></>;
};
const Held = ({ status, dies, boundaryKey }: { status: TimelineStatus; dies: boolean; boundaryKey: number }): ReactElement => {
  const notice = useStopNotice(status, () => undefined);
  return (<Boundary key={boundaryKey}><TimelineNotice {...notice} /><Thrower now={dies} /></Boundary>);
};
// H1  a render that is thrown away announces nothing, so the stop alerts when it is first shown
//     (spy console.error + window "error" listener; render dies; assert fallback shown and no -stopped; rerender dies={false} boundaryKey=1;
//      assert data-announce === "alert")
// H2  a notice follows its feed's restart while the status stays the same stop
//     const status: TimelineStatus = TimelineStatus.Stopped({ reason: "boom" });
//     Probe = ({ restart }) => <TimelineNotice {...useStopNotice<TimelineStatus>(status, restart)} />
//     render first restart, rerender second restart, click -restart, assert calls deepEqual ["second"]
// H3  the notice is one value across a re-render that changes nothing it holds, and a new one for a new stop
//     seen: StopNoticeProps<TimelineStatus>[]; same status + tick change => seen.at(-1) === seen.at(-2);
//     Stopped({reason:"a"}) a second time (new identity) => notStrictEqual
```

### Commit-bound row (V8 catcher; measured, not yet drafted into the final file)

Profiler measurement at the dock: reaching a shown timeline stop was 3 commits on a live source plus the stop's record on the prototype (+1) and +2 on the V8 build; the base is +0. The row asserts an upper bound so it is green on base and D-06 and red on V8. Planner: write it with `Profiler` around `DevtoolsDock` for the same `dyingSource()` used by the born file, `commitsWithStop - commitsWithLiveSource <= 1`, and prove it with V8 (the effect keyed `[announced, status]`). [ASSUMED: the exact assertion shape; the +0/+1/+2 numbers are VERIFIED measurements from Spike 5 V8.]

### Table test (drafted, 6 rows, three laws; RED on base because the module is missing)

[VERIFIED: ran GREEN against the prototype module; RED on base with "Failed to resolve import ../../src/model/StopLedger.ts".]

```ts
import { assert, describe, it } from "@effect/vitest";
import * as fc from "fast-check";
import { announcesStop, noStops, recordStop, stoppedKey, type StopLedger } from "../../src/model/StopLedger.ts";

interface Stop { readonly name: string }
const a: Stop = { name: "a" }; const b: Stop = { name: "b" }; const aAgain: Stop = { name: "a" };
const after = (ledger: StopLedger<Stop>, stop: Stop): StopLedger<Stop> => recordStop(ledger, stop);
const three = after(after(after(noStops, a), b), a);
// rows: { title, ledger, status, key, announces, recorded: StopLedger | "same" }
//  "an empty ledger and a first stop"                 noStops,        a,      key 1, announces, { stop: a, count: 1 }
//  "the recorded stop again"                          after(noStops,a), a,    key 1, silent,   "same"
//  "a second, distinct stop"                          after(noStops,a), b,    key 2, announces, { stop: b, count: 2 }
//  "an equal-field stop that is a new identity"       after(noStops,a), aAgain, key 2, announces, { stop: aAgain, count: 2 }
//  "a ledger of count three"                          three,          b,      key 4, announces, { stop: b, count: 4 }
//  "the last stop of a ledger of count three"         three,          a,      key 3, silent,   "same"
// LAW1 key stable across the record (every row); LAW2 recordStop idempotent by identity (every row);
// LAW3 fc.property over arrays of 0..2 indices into [a, b, aAgain], length <= 30: count === number of changes and key stable at every step
```

### The held-test edits (drafted; full suite green with them)

[VERIFIED: applied to the tree, 109 files 2086 tests, `tsc -p tsconfig.test.json` clean.]

```tsx
// helpers.ts   line 14 import -> from "../src/model/StopLedger.ts";  liveNotice 225 -> announced: { ledger: noStops, record: () => undefined },

// DiagnosticsNotice.test.tsx  (imports: StrictMode, type ReactElement; noStops from model/StopLedger.ts; useStopNotice)
const freshRef = (): DiagnosticsNoticeProps["announced"] => ({ ledger: noStops, record: () => undefined });   // fixed handle; N4-N8, N11, N13, N15 and notice() are untouched
const Held = ({ status, show }: { readonly status: DiagnosticsStatus; readonly show: boolean }): ReactElement => {
  const held = useStopNotice(status, noop);
  return show ? <DiagnosticsNotice {...held} /> : <></>;
};
const held = (status: DiagnosticsStatus, show = true) => <Held status={status} show={show} />;
// N9: render(held(first)); remount via rerender(held(first,false)) then rerender(held(first)) -> data-announce "none";
//     rerender(held(stopped("boom", true))) -> "alert"; strict: render(<StrictMode>{held(stopped("boom", true))}</StrictMode>)
// N12: same shape with held(...) in place of notice(..., announced); the old `announced` locals are deleted

// TimelineNotice.test.tsx
const ledger = (): StopNoticeProps<TimelineStatus>["announced"] => ({ ledger: noStops, record: () => undefined });  // TN11, TN12 unchanged
const Held = ({ status, show }) => { const notice = useStopNotice(status, () => undefined); return show ? <TimelineNotice {...notice} /> : <></>; };
const Either = ({ status, which, show }) => {   // two feeds' ledgers side by side; the notice is handed one of them
  const one = useStopNotice(status, () => undefined); const two = useStopNotice(status, () => undefined);
  return show ? <TimelineNotice {...(which === 1 ? one : two)} /> : <></>;
};
// TN14 "...stays silent and is kept by a re-render": held(status) alert; hide/show -> "none"; same element kept across rerender;
//      held(Stopped({reason:"boom"})) -> a new element with "alert"
// TN15 "a notice handed another feed's ledger records its stop there": either(status,1) alert; switch to which=2; hide/show -> "none"

// Simulator.broke.test.tsx
//  import { noStops } from "../../src/model/StopLedger.ts"; import { StoppedBox } from "../../src/react/StoppedBox.tsx";
//  SB1: notice={{ status: "stopped", onRestart: () => undefined, announced: { ledger: noStops, record: () => undefined } }}  (drop onRestart/announced props)
//  SB4 (D-15): render a StoppedBox (feed="timeline", reasonLabel "Why the timeline stopped") and compare
//      whyBroke().getAttribute("style") to screen.getByRole("group", { name: "Why the timeline stopped" }).getAttribute("style")  -> 4/4 green
```

## Spike evidence

All runs on branch `arch-wave-16`, HEAD `947bb0a3`, with the prototype applied to `packages/devtools` as a scratch change and reverted afterwards (`git status --short -- packages stryker.devtools.mjs spec` printed nothing at the end of the research; no `.stryker-tmp`; `reports/mutation-devtools/` is git-ignored). Commands carried `< /dev/null`. `[VERIFIED: this session]` applies to every line in this section.

### S1. Standalone prototype (reducer-held ledger against the ref ledger)
- (a) The body carries `role="alert"` after the first commit of a new stop, plain and `<StrictMode>`.
- (b) The body is the SAME DOM node before the record's re-render and after it.
- (c) Commits and parent calls per newly shown stop. Plain: 2 parent renders, 2 commits (base 1 and 1). StrictMode: 4 parent function calls, 2 commits (the re-run effect's second dispatch folds into the same pass).
  A same-identity dispatch (a remount for a recorded stop, an `Activity` show) is NOT eagerly bailed out: one extra parent function call and one Profiler commit, zero Box and Body renders. `useReducer` has no eager-state path. This refines D-06's "React bails out".
  Dock-level Profiler (the real `DevtoolsDock`): reaching a shown timeline stop is 3 commits against 2 on a live source on the prototype (+1), and 2 against 2 on the base. Plain and strict are the same.
- (d) A remount for the recorded stop has no alert, with a new node.
- (e) A distinct stop B remounts with the alert; the initializers read the unrecorded ledger.
- (f) StrictMode's double render gives the initializers `[true, true]`: the alert is kept.
- Back to stop A after B alerts again (its identity differs from the last stop), the same as the base.

### S2. `Activity` (holder outside and inside, start visible and hidden)
- A hidden initial mount renders the body with `fx=0` (no layout effect runs while hidden); the alert is decided against the unrecorded ledger. On reveal the effect records, the node is the same and the alert is kept.
- Hide then show re-runs the effect (a record no-op) and keeps the node.
- A new stop arriving while hidden remounts the body with the alert (`sameNode=false`); on reveal it is recorded.
- Every DOM observable and effect count equals the base ref version. Only the parent render count differs (+1 per record pass).

### S3. The D-06 prototype applied to the real files, whole devtools suite
Base: `106 files, 2064 tests green (11 s)`. With the prototype and no test edits there were exactly 15 failures, all old-shape rows:

```
TimelineNotice.test.tsx : TN11, TN12, TN14, TN15
Simulator.broke.test.tsx: SB1
DiagnosticsNotice.test.tsx: N4, N5, N6, N7, N8, N9, N11, N12, N13, N15   (TypeError ... reading 'stop' / 'announced')
```
DS1-DS3, D7, D8, TN1-TN10, TN13, R1, R2, N1-N3, N10, N14 and SB2-SB4 stayed green. `tsc` errors only at `helpers.ts` (14, 225), `DiagnosticsNotice.test.tsx` (15, 19), `Simulator.broke.test.tsx` (22, 78) and `TimelineNotice.test.tsx` (19, 229, 251, 276, 281, 291, 295).

Declared-set refinement: if `freshRef` keeps its name and returns a fixed handle `{ ledger: noStops, record: () => undefined }`, only N9 and N12 need body edits in `DiagnosticsNotice.test.tsx` (N4-N8, N11, N13, N15 and `notice()` at 60-62 stay byte for byte). With the drafted edits (Code Examples):

```
 Test Files  109 passed (109)
      Tests  2086 passed (2086)
house-style: 640 file(s) clean (3 declared switch(es), 79 type-test file(s))
✔ No circular dependency found!
 Test files: 79 passed, 79 total   (pnpm test:tstyche: Tests 429 passed, 2 skipped; Assertions 931 passed, 6 skipped)
```
`tsc -p tsconfig.test.json --noEmit` printed nothing. `oxlint` printed only the pre-existing `.codex/hooks/gsd-statusline.js` warnings.

### S4. Characterisation rows on both sides
The drafted born files (A1-A5, each plain and StrictMode, = 10 rows plus the hook rows H1-H3): green on the base (11/11 with base `helpers.ts`; the hook file 3/3 on its own) and green on the D-06 build. The A5 `MutationObserver` row (count distinct `-stopped` elements added, in a `Set<HTMLElement>`) gives 1 per stop on base and prototype (the first attempt counted nested added nodes twice and printed 2 on both; fixed by de-duplicating by element).

### S5. D-14 variants run against the suite including the drafted rows

| # | Variant | Rows that fail (count) | Note |
|---|---------|------------------------|------|
| V1 | drop the layout-effect record | 16: DS1, D7, TN4, N9, N12, TN14, TN15, A1-A4 | |
| V2 | record during render | **0** | D-14 refuted. H1 fails: `expected 'none' to equal 'alert'`. A `console.error` spy does not catch it generally. |
| V3 | constant key | 8: N9, N12, DS2, TN14, A2, A3 (plain and strict) | |
| V4 | reducer inside the box | 15: DS1, DS2, TN4, N9, D7, A1-A4, TN14, TN15 | D-14 said only DS1 |
| V5 | one reducer for both feeds | DS1, DS2, A1, A2, A4 | |
| V6 | memo keyed without `onRestart` | **0** | D-14 refuted (DS3 passes: a rebuilt model hands a new `Stopped` identity anyway). H2 fails: `expected ['first'] to deeply equal ['second']` |
| V7 | alert decided per render | 28: N9, N12, D7, DS1-DS3, TN3, TN4, TN6-TN8, TN10, D4, D8, A1-A5, ... | |
| V8 | effect keyed on the handle instead of `record` | **0** DOM rows | Profiler: +2 commits against +1; needs the commit-bound row |
| V9 | memo missing the ledger dep | 13 | |
| V10 | key always `count + 1` (record-unstable) | 33 | below |

V10 output, condensed from the run's failure list (33 failed, 2053 passed; the list also held the two `Simulator`-family rows `6 thunk handed, stopped before a sample` and `7 thunk handed, stopped after a sample`):
```
##### VARIANT: V10 key always count+1 (record-unstable key)
     × A1 [plain] ... × A5 [plain]   × A1 [StrictMode] ... × A5 [StrictMode]
     × D4  × D7  × D8  × TN3  × TN4  × TN6  × TN7  × TN8  × TN10  × TN14  × TN15
     × DS1  × DS2  × DS3  × N9  × N12
     × a render that is thrown away announces nothing, so the stop alerts when it is first shown
     × L the recorded stop again   × L the last stop of a ledger of count three
     × LAW1 the key is the same before and after the stop is recorded
     × LAW3 (property) any sequence of stops: count equals the number of changes, key stable across record
 Test Files  8 failed | 101 passed (109)      Tests  33 failed | 2053 passed (2086)
```

### S6. Table-test laws against scratch `StopLedger.ts` variants
A fresh spread on the known stop fails the rows "the recorded stop again" and "the last stop of a ledger of count three" plus LAW2. A key that reads `count` with no `+1` branch fails LAW1, LAW3 and 4 rows. A key that is always `count + 1` fails LAW1, LAW3 and 2 rows. Announce inverted, `count + 2` and a structural compare each fail table rows and LAW3. RED on the base for the missing module:
```
Error: Failed to resolve import "../../src/model/StopLedger.ts" from "packages/devtools/test/model/StopLedger.test.ts". Does the file exist?
 Test Files  1 failed (1)    Tests  no tests
```

### S7. Mutation
`pnpm exec stryker run stryker.devtools.mjs --mutate packages/devtools/src/model/StopLedger.ts < /dev/null` (45 s): 12 Killed, 4 Ignored (the `noStops` `{}` ObjectLiteral and three ArrowFunction `() => undefined` mutants on the const arrows, all static), score 100%. With `ignoreStatic: false` (a scratch config spreading the base one) all 16 are Killed. The base `88-mutation-base.json` therefore records no measured file touched.

### S8. Earlier-phase checks
On the clean base the 87 earlier-checks ledger matches exactly, including the two known exit-1 rows (`85-check.mjs scan-ids` and `86-check.mjs scan-ids`: `packages/devtools/test/model/DiagnosticsFeed.stop.test.ts:35 has phase-relative wording: /** The status tag of every notification a feed publishes from now on, in order. */`). Self-tests: 87-check 301, 87-pinned 35, 87-mutation 103, 87-earlier 21. 87 pinned on the clean base: `122 files hold their base text, 5 of 5 born files held, 2 of 2 declared edits applied`.

With the 88 delta applied, 85/86 earlier checks are unchanged, 87 `scan-ids` and `scan-forbidden` print `no id or phase wording in added lines` and `no forbidden form in added lines`, and `87-pinned-check.mjs` reports exactly five files:
```
packages/devtools/test/helpers.ts: differs from its base text at line 14
packages/devtools/test/react/DiagnosticsNotice.test.tsx: differs from its base text at line 12
packages/devtools/test/react/TimelineNotice.test.tsx: differs from its base text at line 14
packages/devtools/test/surface.tst.ts: differs from its base text at line 312
packages/devtools/test/react/Simulator.broke.test.tsx: differs from the commit that added it at line 22
```
(The line numbers move with the final edits.)

## The D-13 regions at HEAD, verbatim (the pinned-check's declared regions)

Lines are HEAD `947bb0a3` (= `c99015e9` for source). [VERIFIED: read this session with `sed -n`.]

### `test/helpers.ts`
```
14: import { noStops } from "../src/react/StoppedBox.tsx";
221-226:
/** The binding for a panel rendered on its own, in a live poll. */
export const liveNotice: DiagnosticsNoticeProps = {
  status: DiagnosticsStatus.Live(),
  onRestart: () => undefined,
  announced: { current: noStops },
};
```

### `test/react/DiagnosticsNotice.test.tsx`
```
12: import { StrictMode } from "react";
15: import { noStops } from "../../src/react/StoppedBox.tsx";
19: const freshRef = (): DiagnosticsNoticeProps["announced"] => ({ current: noStops });
60-62: const notice = (status: DiagnosticsStatus, announced = freshRef(), onRestart = noop) => (
         <DiagnosticsNotice status={status} onRestart={onRestart} announced={announced} />
       );
152-172 N9:
  it("N9 a stop alerts once, again for a new stop, and a strict-mode first render still alerts", () => {
    const announced = freshRef();
    const first = stopped("boom", true);
    const view = render(notice(first, announced));
    assert.strictEqual(screen.getByTestId("qadi-diagnostics-stopped").getAttribute("data-announce"), "alert");

    view.unmount();
    const again = render(notice(first, announced));
    const silent = screen.getByTestId("qadi-diagnostics-stopped");
    assert.strictEqual(silent.getAttribute("data-announce"), "none");
    assert.isNull(silent.getAttribute("role"));

    again.rerender(notice(stopped("boom", true), announced));
    const next = screen.getByTestId("qadi-diagnostics-stopped");
    assert.strictEqual(next.getAttribute("data-announce"), "alert");
    assert.strictEqual(next.getAttribute("role"), "alert");
    again.unmount();

    render(<StrictMode>{notice(stopped("boom", true), freshRef())}</StrictMode>);
    assert.strictEqual(screen.getByTestId("qadi-diagnostics-stopped").getAttribute("data-announce"), "alert");
  });
203-223 N12:
  it("N12 a second stop on a mounted notice remounts it, so its alert is present on the new mount", () => {
    const announced = freshRef();
    const view = render(notice(stopped("first", true), announced));
    const first = screen.getByTestId("qadi-diagnostics-stopped");
    assert.strictEqual(first.getAttribute("role"), "alert");

    view.rerender(notice(stopped("second", true), announced));

    const second = screen.getByTestId("qadi-diagnostics-stopped");
    assert.notStrictEqual(second, first);
    assert.isFalse(first.isConnected);
    assert.strictEqual(second.getAttribute("role"), "alert");
    assert.strictEqual(screen.getByTestId("qadi-diagnostics-reason").textContent, "second");

    const same = stopped("second", true);
    view.rerender(notice(same, announced));
    const third = screen.getByTestId("qadi-diagnostics-stopped");
    assert.strictEqual(third.getAttribute("role"), "alert");
    view.rerender(notice(same, announced));
    assert.strictEqual(screen.getByTestId("qadi-diagnostics-stopped"), third);
  });
225-250 N13: renders with `announced = freshRef()` as a fixed handle: HELD UNEDITED (a fixed handle is enough; CONTEXT D-13 lists it as declared, research refines it to held)
```

### `test/react/TimelineNotice.test.tsx`
```
14: import { Activity, StrictMode, type RefObject } from "react";
19: import { noStops, type StopLedger } from "../../src/react/StoppedBox.tsx";
72-73:
/** A ledger with no stop in it, in the shape the dock hands the notice. */
const ledger = (): RefObject<StopLedger<TimelineStatus>> => ({ current: noStops });
221-248 TN11: renders <TimelineNotice status=... onRestart=... announced={ledger()} /> (229)   -> HELD UNEDITED once `ledger()` returns a fixed handle
250-259 TN12: render(<TimelineNotice status=... onRestart={() => {}} announced={ledger()} />) (251)   -> HELD UNEDITED
273-286 TN14:
  it("TN14 a notice mounted again for the stop already announced does not count it twice", async () => {
    const announced = ledger();
    const status = TimelineStatus.Stopped({ reason: "boom" });
    const view = render(<TimelineNotice status={status} onRestart={() => {}} announced={announced} />);
    await settle();
    assert.strictEqual(announced.current.count, 1);
    view.unmount();

    render(<TimelineNotice status={status} onRestart={() => {}} announced={announced} />);
    await settle();

    assert.strictEqual(announced.current.count, 1);
    assert.strictEqual(stopped().getAttribute("data-announce"), "none");
  });
288-299 TN15:
  it("TN15 a notice handed another ledger records its stop there", async () => {
    const status = TimelineStatus.Stopped({ reason: "boom" });
    const first = ledger();
    const view = render(<TimelineNotice status={status} onRestart={() => {}} announced={first} />);
    await settle();
    const second = ledger();

    view.rerender(<TimelineNotice status={status} onRestart={() => {}} announced={second} />);
    await settle();

    assert.strictEqual(second.current.stop, status);
  });
```
(TN11 and TN12 only need the `ledger()` change; they are NOT body edits. A fixed handle with a no-op `record` is correct for them: neither asserts an alert.)

### `test/react/Simulator.broke.test.tsx` (a 87 BORN file, held against the commit that added it)
```
1-11 header:  "... These rows were written before the simulator took that block, and the file is held byte
              for byte from the commit that adds it."   (lines 9-11)
22: import { noStops, StoppedBox } from "../../src/react/StoppedBox.tsx";
25-30: /** The `style` attribute of the stopped box's reason block, measured before the style moved
       to the shared theme. */  const REASON_STYLE = "margin: 8px 0px 0px; padding: 8px; background: #14161a; border: 1px solid #2a2f39; border-radius: 4px; font-family: inherit; font-size: 11px; white-space: pre-wrap; overflow-wrap: anywhere; max-height: 96px; overflow: auto;";
74-95 SB1: <StoppedBox status="stopped" reason={reason} lead="Timeline stopped." body="It stopped." reasonLabel="Why the timeline stopped"
       restartLabel="Restart timeline" feed="timeline" onRestart={() => undefined} announced={{ current: noStops }} />   (status 78, announced 86)
119-123 SB4: await broken(); assert.strictEqual(whyBroke().getAttribute("style"), REASON_STYLE);
```

### `test/surface.tst.ts`
```
301-310 (verbatim):
// @ts-expect-error no exported member
export { useStopNotice } from "../src/index.ts";

// @ts-expect-error no exported member
export { useStopNotice as reactUseStopNotice } from "../src/react/index.ts";

// @ts-expect-error no exported member
export type { StopNoticeProps } from "../src/index.ts";

// @ts-expect-error no exported member
export type { StopNoticeProps as ReactStopNoticeProps } from "../src/react/index.ts";
312: test("the React entry's AskedQuestionLike is the model's", () => {
```
Add six pairs after line 310 (value names `export { name }` and `export { name as React<name> }`; types `export type { ... }`). `pnpm test:tstyche` passed with them; `tsc` clean. They count against no budget (no negative `toBeCallableWith` pin) [VERIFIED: `check-house-style` clean].

### Held and sampled held rows (D-12/D-13 "held unedited")
`DockFrame.stops.characterisation.test.tsx` DS1-DS3, `DiagnosticsScreens.test.tsx` D7 (249) and D8 (268), `DockFrame.renders.test.tsx` R1/R2 (49-85): all green on the D-06 build without edits.

## Project Constraints (from CLAUDE.md / AGENTS.md)

Every directive below was applied to the prototype and the drafts (`check-house-style` clean, `tsc` clean, `oxlint` clean).
- **Imports (§1):** `effect` submodule namespace imports only; relative imports carry `.ts`; `import type` for type-only (`verbatimModuleSyntax`). The new `model/StopLedger.ts` imports nothing.
- **Services/Layers/Errors (§2-4):** not touched. No new error class, so `SCHEMA_ERROR_BUDGET` stays 12.
- **Functions (§5):** no new `Effect.fn`/`fnUntraced` (`UNTRACED_BUDGET` unmoved). The three `noticeOf` arms stay hoisted `Match.type<…>().pipe(Match.tagsExhaustive(...))`; only their parameter changes. No `switch` (`SWITCH_BUDGET` unmoved: 3).
- **Forbidden (§6):** no `as`, `!`, `any`, `Record<string, unknown>`; no `console.*`/`process.env`/`Date`/`performance` in `src`; no module-scope `let`/`var` (`MODULE_STATE_BUDGET` stays `DeveloperSignals.ts: 1`; the new module has only `const`s). `useReducer<StopLedger<S>, [S]>(...)` needs no cast.
- **Doc comments:** a one-line summary first, then the why (ADR cite, predecessor) in the paragraph after. The three `react/` files and the new module follow it. StoppedBox's header paragraph "a second stop is a new mount (`stoppedKey`)" must be rewritten to name the wrapper and `model/StopLedger.ts`.
- **Barrels (§9):** package-private, in neither barrel (ADR-QD-099). `pnpm spec:api` and the `devtools-named-barrel` rule stay green.
- **React (§13):** no React state for *decisions*: the ledger records which stop was announced, never a decision or what a status says. §13's wording ("An instance registry would not breach...", `DECISION_READ_BUDGET`) is unaffected: `outcomeOf` is not involved, and no `AsyncResult` is read. AGENTS.md is unchanged (D-06).
- **Tests (§10):** `@effect/vitest`; devtools model coverage held at 95%, `src/react/**` at 90% [VERIFIED: `vitest.config.ts:44-52` and `:112-117`]. `it.effect` is not needed for these pure/DOM rows.
- **Spec (§11, §12, §15):** spec is normative; compile-checked ` ```typescript ` fences versus ` ```ts ` signature fences; name the script, not the gate number. Placeholder ids (`ADR-QD-NEXT`...) are refused.
- **§16/§17:** no new package; no formatter gate. A patch changeset only (D-04).

## Script porting (Phase 87's scripts to Phase 88's)

All four 87 scripts were read in full this session; each carries a `--self-test`. The 88 scripts are copies with the data replaced, never an edit of an archived script (D-17).

| 87 script | What it holds | What 88 changes |
|-----------|---------------|-----------------|
| `87-check.mjs` (base, commit, unchanged, seen-failing, scan-ids, scan-forbidden, trailers, shape judges, records, `--close`, `--self-test`) | `PHRASE` `/this phase\|until now\|any more\|no longer\|from now on/i` (87 exempts only `publishes from now on`); id tokens `D-\d+`, plan ids `NN-NN`, `WX-0\d`, `STOP-0\d`, `QD-NN`, `Phase NN`, `-NEXT`; scan-forbidden bans (tests too) `Effect.fnUntraced`, `switch(`, `Record<string, unknown>`, `any`, a non-null `!`, `as` other than `as const`; src also bans async/await, `console`, `process.env`, `Date.now`, `new Date`, `performance.now`, module-scope `let`/`var`; the `"use client";` line exempt from the module-scope-literal rule | Keep the phrase list and add `SBOX-0\d`, `88-\d{2}`, `QD-88`, `Phase 88` to the id tokens. New shape judges (D-17, with scratch variants below). `records` mode reads the 88 rows (CCR-QD-480 names ARCH-135 and "Unused: ..."; ADR-QD-201; BEH-QD-776..780; INV-QD-421..422). The 87 `records` mode keeps passing: it requires the CCR-QD-479 row to remain (`87-check.mjs:983-987`), which the new CCR-QD-480 row does not disturb [VERIFIED: grep]. |
| `87-pinned-check.mjs` | `judgeRegions` over declared `from`/`to` anchor lines (`startsWith`, exactly one occurrence at base) and `kept` lines; BORN files held byte for byte against the adding commit | Declared regions per the verbatim section above; BORN = the three new test files. `Simulator.broke.test.tsx` moves from "BORN, held" (87) to "declared regions" (88): header 9-11, import 22, comment 25-30, SB1 74-95, SB4 119-123. |
| `87-mutation.mjs` | `UNMEASURED`, `EXAMINED` (static Ignored mutants run by hand with `ignoreStatic:false` and seen Killed), `EQUIVALENT`, `closeOnly`/`killers` groups, clean-tree rule | `UNMEASURED` = `react/StoppedBox.tsx`, `react/useStopNotice.ts`, `react/TimelineNotice.tsx`, `react/DiagnosticsNotice.tsx` (87's list was `Simulator.tsx`, `StoppedBox.tsx`, `theme.ts`, `REACT_WHY` text). One measured group: `model/StopLedger.ts`, 16 mutants, 12 Killed + 4 `EXAMINED`. `88-mutation-base.json` records no measured file touched. |
| `87-earlier-checks.mjs` | A `LEDGER` of 28 rows over the 85 and 86 checks, run from scratch copies in `$TMPDIR/qd87` (`P86_COPIED` list) | Add the 87 files to the copied set; rows for 87's modes and self-tests; each expected report named with the 88 commit that explains it. |

88 ledger rows (measured on the clean base, then with the delta): 
- `85-check.mjs scan-ids` and `86-check.mjs scan-ids` exit 1 on `DiagnosticsFeed.stop.test.ts:35` ("publishes from now on"): unchanged, known.
- `87-check.mjs scan-ids`, `scan-forbidden`, `trailers`, the shape judges (`stated-run-shape`, `prologue-shape`, `feeds-supply-only-engine`, `session-stop`, `simulator-pre`, `onfailure-gone`, `built-feeds-once`), `records`, `--close`: exit 0 with the delta.
- `87-pinned-check.mjs`: **exit 1, five files** (see S8). Only 87's pinned check reports; the 85 and 86 pinned checks report nothing new.
- Self-test counts: 87-check 301, 87-pinned 35, 87-mutation 103, 87-earlier 21.

### Scratch variants for the new 88 checks (each seen failing once, WX-06)
- Shape judge: add `useRef` to `react/StoppedBox.tsx`; add `.current` to `react/useStopNotice.ts`; add `key={...}` on a `<StoppedBox>` in a notice; reintroduce `type Binding` in a notice; import `model/StopLedger.ts` from a third src file (`DevtoolsDock.tsx`); add `import { useState } from "react"` to `model/StopLedger.ts`; add JSX to it; add a module-scope `let` to a touched file.
- `scan-ids`: a row title containing `SBOX-01` or `Phase 88` in an added test line.
- `pinned-check`: edit one byte inside a held test (`N13`), and one byte of a born file.
- `mutation`: delete a `StopLedger.test.ts` row and see a survivor; remove an `EXAMINED` entry.

## Spec amendments (sentences and anchors at HEAD)

| Document | Anchor | Change |
|----------|--------|--------|
| `spec/behaviors/28-devtools-screens.md` | BEH-QD-759 header block at 4046-4049 | Add ADR-QD-201 to the Decision line. |
| same | 4071-4072: "A hook and not a plain helper, because the ledger is a `useRef` and the props a `useMemo`, which a function that is not a hook cannot own." | "...because the ledger is a `useReducer` over `recordStop` and the props a `useMemo`..." |
| same | "Pinned by" list 4076-4079 and "Specified in ADR-QD-197 (CCR-QD-476)" | Add `StopLedger.test.ts`, `DockFrame.announce.characterisation.test.tsx`, `useStopNotice.test.tsx`; "amended by ADR-QD-201 (CCR-QD-480)". |
| same | BEH-QD-509 1554-1556: "A role added to an element already in the tree is generally not announced, so every new stop is a new mount and its alert is decided as it mounts." | Append links to BEH-QD-776 and BEH-QD-777 (anchors by heading slug). |
| same | new BEH-QD-776..780 after BEH-QD-773's block (starts 4380; format `## BEH-QD-NNN: title`, then `> **Decision:** ... · **Invariant:** ...`, then a ` ```ts ` signature fence, a ` ``` ` REQUIREMENT block, prose, "Pinned by") | Signatures go in ` ```ts ` fences (never ` ```typescript ` unless compiled). |
| `spec/invariants.md` | after INV-QD-420 (4903): format `## INV-QD-NNN: title`, prose, **Source**, **Implication**, **Enforcement**, **Related** | INV-QD-421, INV-QD-422. |
| `spec/decisions/197-...md` | Revision table row (`1.4` to `1.5`, Status line), decision 4 lines 83-91 ("holds its own `useRef<StopLedger<S>>(noStops)`", "keyed on `[status, onRestart]`", "declared once in `StoppedBox.tsx` beside `StopLedger<S>`", "because the pair is a `useRef` and a `useMemo`"), rejected alternatives 154-156 ("One ref holding both ledgers", "A memo keyed on `status` alone"), evidence line ~193 ("Decision 4: ...DockFrame.stops.characterisation.test.tsx (DS1 to DS3)...") | A dated note under decision 4 (`ledger held by useReducer over model/StopLedger.ts's recordStop; the box derives its key; see ADR-QD-201`); the two rejected alternatives still apply (read "ledger" for "ref"); the evidence line gains the new pins. |
| `spec/decisions/201-<slug>.md` | new, Rev 1.0, structure of ADR-QD-200 (Context, Decision, Alternatives considered, Consequences, What enforces it, Related; an audit table with "Tests removed: N") | See the audit table in the addendum. |
| `spec/decisions/index.yaml` | after the `ADR-QD-200` entry (ends line 632-ish; fields `id`, `file`, `title`, `status`); ADR-QD-197 status currently `"Accepted — amends ADR-QD-192 and ADR-QD-193"` | New `ADR-QD-201` entry; 197's status gains `; amended 2026-11-25 (ADR-QD-201: ...)`. |
| `spec/traceability.md` | Revision 1.332 to 1.333; line 70 (file 28's BEH list, "BEH-QD-771–773" form) and the code-file mapping row that names `useStopNotice` (BEH-QD-759); BEH rows after 103; INV rows after 300; ADR row after 488; test rows 670-677 and the `DiagnosticsNotice.test.tsx` (682), `TimelineNotice.test.tsx` (683), `DockFrame.stops...` (684) rows | New rows for BEH-776..780, INV-421..422, ADR-201, the three new test files and `model/StopLedger.ts`; add the new ids to the edited test rows. |
| `spec/README.md` | Rev 1.413 to 1.414; CCR-QD-480 row after the CCR-QD-479 row (README:416) | Row lists every touched doc with its revision, ARCH-135, and `Unused: ...` for any unused reservation. |
| `spec/overview.md`, `spec/devtools-spec/*` | no mention of `StoppedBox`/`useStopNotice`/`StopLedger`/`stoppedKey` (grep over `spec`, `apps/website/src`, package READMEs, README: only ADR-197, traceability, README, behaviors/28) | No edit. Gate 13 (`pnpm spec:api`) unaffected. |
| `.changeset/devtools-<slug>.md` | patch for `@qadi/devtools`; the 87 file `devtools-one-stated-run.md` is the format example | D-04 text. |

Revisions: use `node scripts/spec-revise.mjs <doc> "<what changed>" --date 2026-11-25`; `pnpm spec:verify` runs `--check`. Gates after editing: `pnpm spec:examples`, `spec:verify:strict`, `spec:claims`, `spec:api`, `spec:package`, `spec:gates` (names from the milestone's earlier phases; run each as a script from `package.json`).

## House-style traps (found or confirmed this session)
1. **`.tsx` generics need the trailing comma** (`<S,>(…)`) as the existing `StoppedBox` and `stoppedKey` do; the hook file is `.ts` (`<S>`).
2. **`announced.record` is a function-typed property**: `StopNoticeProps<S>` is invariant in `S`; tests use `useStopNotice<TimelineStatus>(...)` (Prescriptive API).
3. **Spread into the body**: `<StoppedBody key={...} {...props} />` forwards `notice` to the body; no prop is read twice. Do not also pass `key` through the spread.
4. **`useLayoutEffect(() => announced.record(status), [announced.record, status])`** returns `undefined` (a `void` dispatch), so it never returns a cleanup by accident; keep the arrow body an expression only while `record` returns `void`.
5. **Test-scope budgets**: no `qadi_*` metric literal, no span key literal, no hand-built failing port layer in the new rows (`PORT_DOUBLE_BUDGET`, `METRIC_ID_LITERAL_BUDGET`, `SPAN_KEY_LITERAL_BUDGET` all untouched); no negative `toBeCallableWith` pin (`NOT_CALLABLE_PIN_BUDGET` untouched).
6. **`.codex/` untracked tree** carries oxlint warnings that are not ours; `git add` named paths only (D-01).
7. **`it(...)` titles** name the property, never a D-, SBOX- or plan number (WX-07, `scan-ids`).
8. **Drafted characterisation formatting**: the drafted `DockFrame.announce.characterisation.test.tsx` has two stray blank-indented lines (after `await settle();` in A2). Tidy them before committing; hand-wrapping at about 90 columns is the house style (§17).

## The mutation invocation (the 87 form)
```
pnpm exec stryker run stryker.devtools.mjs --mutate packages/devtools/src/model/StopLedger.ts < /dev/null
pnpm exec stryker run stryker.devtools.mjs --mutate packages/devtools/src/model/StopLedger.ts --disableBail < /dev/null   # born files
```
`stryker.devtools.mjs` mutates `packages/devtools/src/model/**/*.ts` with `ignoreStatic: true`, `coverageAnalysis: "perTest"`; the JSON report is `reports/mutation-devtools/mutation.json` (git-ignored, overwritten by each run). Run time for this file: about 45 s. For the 4 static Ignored mutants run once with `ignoreStatic:false` (a scratch config that spreads the base config) and record them as `EXAMINED`. Close on a clean tree.

## Runtime State Inventory

This is a refactor of how React holds a ledger. No string, name or key is renamed, and no persisted state exists.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | None: the ledger is component state of a mounted `DockFrame`; nothing is persisted or hydrated (the hydration seed is a different feature) | None |
| Live service config | None | None |
| OS-registered state | None | None |
| Secrets/env vars | None | None |
| Build artifacts | `packages/devtools/lib/` (emitted `.d.ts` for the barrels): the package-private names are not exported, so nothing stale; `pnpm spec:package` (gate on the packed install) reconfirms | None beyond the gate |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Rewriting `StopLedger.ts`'s const arrows as function declarations would make their mutants non-static | Pitfall 8 | Low: the recommendation is the `EXAMINED` allowance, which does not rely on it |
| A2 | The commit-bound row asserts `commitsWithStop - commitsWithLiveSource <= 1` through a `Profiler` around `DevtoolsDock` | Code Examples | Low: the +0/+1/+2 numbers are measured; the planner proves the row with V8 |
| A3 | The 87 `records`/`--close` modes stay green after the 88 spec edits (no spec edit was made in this research, so they were not run against one) | Script porting | Low-Medium: re-run `87-earlier-checks.mjs` after the records plan |
| A4 | Devtools coverage stays at or above 90% (react) and 95% (model) | Project Constraints | Low: the per-file coverage run printed no table in this session, so it was not measured; the new module is 15 lines fully covered by the table test, and the whole-suite thresholds run in `pnpm check:pr` |
| A5 | `spec-revise` behaviour and the gate script names `spec:examples`/`spec:verify:strict`/`spec:claims`/`spec:api`/`spec:package`/`spec:gates` as listed in the milestone notes | Spec amendments | Low: the planner reads `package.json` scripts when writing the records plan |

## Open Questions

1. **How should the Simulator test's header "name the commit that last edits it" (D-15) without a hash?**
   - What we know: a file cannot contain the hash of the commit that adds its own text, and a hash in a test comment trips no scan but is stale-prone.
   - Recommendation: reword to describe, not cite: the first row is the byte-identity golden of the move to the shared theme, and the other rows compare to the stopped box's own rendered style. The 88 pinned-check holds the file against the 88 commit.
2. **Is the optional property row (LAW3, `fast-check`) worth keeping?** Recommendation: keep it. It cost nothing, ran green, and failed under the record-unstable key variant (V10).

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node | scripts, vitest | ✓ | v26.13.0 | — |
| pnpm | `pnpm exec`, gates | ✓ | 10.17.1 | — |
| vitest (project `devtools`, happy-dom) | tests | ✓ | 5.1.0 | — |
| React / RTL | component rows | ✓ | 19.3.1 / 16.3.3 | — |
| Stryker + vitest-runner | `model/StopLedger.ts` | ✓ | 10.1.1 | — |
| tstyche | `surface.tst.ts` | ✓ | `pnpm test:tstyche` passes | — |
| git | phase scripts | ✓ | — | — |

**Missing dependencies with no fallback:** none. **With fallback:** none.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest 5.1.0, project `devtools` (happy-dom), `@effect/vitest`; tstyche for `surface.tst.ts` |
| Config file | `vitest.config.ts` (coverage thresholds: model 95%, `src/react/**` 90%), `stryker.devtools.mjs`, `tsconfig.tstyche.json` |
| Quick run command | `pnpm exec vitest run --project devtools <file ...> < /dev/null` (whole devtools project: about 11 s) |
| Full suite command | `pnpm check:pr < /dev/null` (the merge gate minus mutation; mutation for this phase is `pnpm exec stryker run stryker.devtools.mjs --mutate packages/devtools/src/model/StopLedger.ts < /dev/null`) |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SBOX-01 | each feed's stop announced once, silent on revisits, kept under StrictMode, no remount by the record | component (dock) | `pnpm exec vitest run --project devtools packages/devtools/test/react/DockFrame.announce.characterisation.test.tsx < /dev/null` | ❌ Wave 0 (drafted, green on base) |
| SBOX-01 | a discarded render announces nothing; restart follows while the status is the same; the notice value is stable | component (hook) | `... test/react/useStopNotice.test.tsx` | ❌ Wave 0 (drafted, green on base) |
| SBOX-01 | a shown stop adds at most one commit over a live source | component (Profiler) | same file or the characterisation | ❌ Wave 0 (to write; V8 proves it) |
| SBOX-01 | DS1-DS3, D7, D8, TN1-TN10, TN13, R1, R2 held | component | `pnpm exec vitest run --project devtools < /dev/null` | ✅ existing, held |
| SBOX-02 | no `key=`, no `Binding`, no ref on the stop path | script | `node .planning/phases/QD-88-*/88-check.mjs shape` (name of mode is the planner's) | ❌ Wave 0 |
| SBOX-03 | transition, key, alert decision, laws | unit table + property | `... test/model/StopLedger.test.ts` | ❌ Wave 0 (RED before the module) |
| SBOX-03 | mutation floor on `model/StopLedger.ts` | mutation | the invocation above | ❌ close step |
| SBOX-04 | records, surface refusals, held tests | scripts, tstyche | `pnpm test:tstyche < /dev/null`; `88-check.mjs records`; `pnpm spec:verify:strict` | ❌ records plan |

### Sampling Rate
- **Per task commit:** the two touched test files plus `pnpm exec tsc -p tsconfig.test.json --noEmit < /dev/null`.
- **Per wave merge:** `pnpm exec vitest run --project devtools < /dev/null`, `node scripts/check-house-style.mjs`, `pnpm test:tstyche`, the 88 scripts' self-tests and `88-pinned-check.mjs`.
- **Phase gate:** `pnpm check:pr < /dev/null` green, the mutation invocation closed, `88-earlier-checks.mjs` matching its ledger.

### Wave 0 Gaps
- [ ] `packages/devtools/test/react/DockFrame.announce.characterisation.test.tsx`: A1-A5 plain and StrictMode (drafted; tidy two stray indented lines).
- [ ] `packages/devtools/test/react/useStopNotice.test.tsx`: H1-H3 (drafted) plus the commit-bound row (write).
- [ ] `packages/devtools/test/model/StopLedger.test.ts`: table, LAW1-LAW3 (drafted); RED run recorded before `model/StopLedger.ts` exists.
- [ ] `88-mutation-base.json`, `88-RED-EVIDENCE.md`, the four 88 scripts with self-tests.
- Framework install: none.

### Scratch variants for each new check (each must be seen failing, WX-06)

| Check | Variant | Expected failing rows (measured unless noted) |
|-------|---------|------|
| A1-A5 | drop the layout-effect record (V1) | DS1, D7, TN4, N9, N12, TN14, TN15, A1-A4 (16) |
| A2, A3 | constant key (V3) | N9, N12, DS2, TN14, A2, A3 (8) |
| A1-A4 | reducer in the box (V4); one reducer for both feeds (V5) | V4: 15; V5: DS1, DS2, A1, A2, A4 |
| A1-A5 | alert decided per render (V7) | 28 |
| A5, LAW1, LAW3 | key always `count + 1` (V10) | 33 |
| H1 | record during render (V2) | H1 only: `expected 'none' to equal 'alert'` |
| H2 | memo keyed without `onRestart` (V6) | H2 only: `expected ['first'] to deeply equal ['second']` |
| H3 | rebuild the notice value every render (memo removed) | H3 [ASSUMED: not run; the planner records it] |
| commit-bound row | effect keyed `[announced, status]` (V8) | the commit-bound row only (+2 against +1, measured as a Profiler count) |
| memo ledger dep | memo missing `ledger` (V9) | 13 |
| table LAW2 | `recordStop` spreads a fresh record for the known stop | "the recorded stop again", "the last stop of a ledger of count three", LAW2 |
| table keys | key reads `count` with no `+1` branch | LAW1, LAW3, 4 rows |
| surface refusals | export `noStops` from `src/index.ts` | `tsc`/tstyche fails on the `@ts-expect-error` (unused directive) [ASSUMED: not run for the new names; the existing `useStopNotice` pair has the same form] |

## Security Domain

`security_enforcement` is enabled (`.planning/config.json`, `security_asvs_level: 1`, `security_block_on: "high"`) [VERIFIED: `.planning/config.json` lines 10-12].

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | — |
| V3 Session Management | no | — |
| V4 Access Control | no | — |
| V5 Input Validation / output encoding | yes, unchanged | A stop's `reason` is rendered as a React text child inside `<pre>`, escaped by React; no `dangerouslySetInnerHTML` is added or moved [VERIFIED: the applied diff touches no markup] |
| V6 Cryptography | no | — |

### Known Threat Patterns for this change

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| A stale or missing announcement (an accessibility regression, not a data one) | Repudiation/Info | The announce-once rows A1-A5 and N9/N12/TN* hold the alert exactly once per stop |
| A ledger holding what a status says | Info disclosure | The ledger holds identity and a count only (`StopLedger`), never the reason or a reading (AGENTS.md §13) |

No new trust boundary, no new data crosses one, and the devtools package ships no untrusted decode here.

## Sources

### Primary (HIGH confidence)
- Repo files read this session at HEAD `947bb0a3`: `packages/devtools/src/react/{StoppedBox,useStopNotice,TimelineNotice,DiagnosticsNotice,DevtoolsDock}.tsx`, the test files in the D-13 list, `surface.tst.ts`, `stryker.devtools.mjs`, `vitest.config.ts`, `.planning/phases/QD-85..87` scripts, ADR-QD-197/200, BEH-QD-509/759/771-773, INV-QD-419/420, traceability, README, `decisions/index.yaml`, AGENTS.md.
- Measurements: the spikes above (runs recorded in this file).
- Context7 `/websites/react_dev_reference`: `useReducer` dispatch caveats (same state skips rendering the children; the component may still be called) and `useLayoutEffect` (a state update inside it runs synchronously before paint; StrictMode's extra setup+cleanup cycle).

### Secondary (MEDIUM confidence)
- `.planning/research/` (PITFALLS 88-A/B/C, SUMMARY, ARCHITECTURE, FEATURES): superseded where D-06 decided otherwise.

### Tertiary (LOW confidence)
- None used for a recommendation.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH, nothing is installed.
- Architecture: HIGH, built and run on the full suite plus tsc, house-style, tstyche, circular, Stryker.
- Pitfalls: HIGH for the variant map (each measured), MEDIUM for the commit-bound row (numbers measured, assertion shape not yet written).

**Research date:** 2026-11-25
**Valid until:** the source files under `packages/devtools/src/react` and `test/` change, or React is bumped (the extra-pass count is React-version-sensitive).

## Recommended CONTEXT addendum

One bullet per overturned or refined decision, for 88-CONTEXT.md "### Addendum after research" (shape of 87-CONTEXT.md's: D-xxa naming, decided autonomously on 2026-11-25 under the standing instruction, with an evidence line).

- **D-06a (cost statement refined; the design stands):** `useReducer` has no eager bail-out, so ADR-QD-201's cost says: "one extra `DockFrame` pass per newly shown stop (2 parent renders and 2 commits against 1 and 1); a remount for a recorded stop or an `Activity` show costs one `DockFrame` function call and renders nothing below it". Replace "React bails out of a repeat record". Evidence: Spike S1c (parent calls and Profiler commits, plain and StrictMode), S2 (Activity), S3 (R1/R2 green).
- **D-12a (a second born file, and the rows it holds):** the dock rows A1-A5 stay in `DockFrame.announce.characterisation.test.tsx`. Three further rows cannot go through `DevtoolsDock` and go in a separate born file `test/react/useStopNotice.test.tsx`: H1 (a render that is thrown away announces nothing: error boundary plus a throwing sibling), H2 (a notice follows its feed's restart while the status stays the same stop) and H3 (the notice value is stable across a no-op re-render and new for a new stop), plus a commit-bound row (a shown stop adds at most one commit over a live source). Both files are committed in plan 1 on the base **with the base `helpers.ts`** (the edited `helpers.ts` imports the new module and breaks the born file on the base). Evidence: S4, S5 (V2, V6, V8), Pitfall 7.
- **D-13a (the declared set is narrower):** `freshRef` keeps its name and returns a fixed handle `{ ledger: noStops, record: () => undefined }`. Held unedited: N4-N8, N11, N13, N15, `notice()` (60-62), TN11, TN12. Body edits: `DiagnosticsNotice.test.tsx` N9 and N12 (through a `Held` harness over the real `useStopNotice`); `TimelineNotice.test.tsx` TN14 and TN15 (`Held`, and `Either` with two hook ledgers); `ledger()`; imports. `helpers.ts`: line 14 and 225. `Simulator.broke.test.tsx`: import 22, SB1 props, SB4 and the header (D-15). `surface.tst.ts`: six pairs after line 310. Tests that read a ledger field (TN14's `.current.count`, TN15's `.current.stop`) are re-homed, not dropped. Evidence: S3 (15 failing rows with the prototype and no edits; 2086 green with the narrowed edits).
- **D-14a (the variant map is corrected; V10 added):** V2 (record during render) fails no dock row and is caught only by H1. V6 (memo without `onRestart`) fails not DS3 but H2. V8 (effect keyed on the handle) is invisible in the DOM and is caught only by the commit-bound row. V1 fails DS1 and D7 as stated (16 rows), V3 fails N9, N12, DS2 and TN14 (8), V4 fails DS1, DS2, TN4, N9, D7 (15), V5 fails DS1, DS2, A1, A2, A4, V7 fails 28 rows including N9 and D7. Add V10, the record-unstable key (always `count + 1`): 33 rows, including A5, the table LAWs and TN4. Evidence: the S5 table.
- **D-15a (the Simulator header):** reword the file header to describe the history ("the first row is the byte-identity golden of the move to the shared theme; the others compare to the stopped box's own rendered style") and do not name a commit hash (a file cannot name the commit that adds its own text; the 88 pinned-check holds it against the 88 commit). SB4 compares to the rendered stopped box's `style` attribute (4 of 4 green, verified).
- **D-17a (the ledger and the scans):** 87's pinned check reports **five** files (helpers, DiagnosticsNotice.test, TimelineNotice.test, surface.tst and Simulator.broke.test), and only 87's: the 85 and 86 pinned checks report nothing new. The 88 scans add `SBOX-0\d`, `88-\d{2}`, `QD-88`, `Phase 88` to the id tokens. Evidence: S8.
- **D-18a (an `EXAMINED` allowance):** `model/StopLedger.ts` measures 12 Killed and 4 Ignored (static: the `noStops` `{}` and three const-arrow bodies), score 100%; with `ignoreStatic:false` all 16 are Killed. `88-mutation.mjs` records the four as `EXAMINED` by the 87 mechanism (clean tree, run by hand, seen Killed). Evidence: S7.
- **D-09a (typing):** `AnnouncedStops<S>.record` makes `StopNoticeProps<S>` invariant in `S`. Tests write `useStopNotice<TimelineStatus>(...)` where a `const status: TimelineStatus = TimelineStatus.Stopped(...)` would otherwise narrow `S`. The src needs no change. Evidence: the TS error and fix in H2.
- **D-11a (one extra row):** the table test also carries a `fast-check` property row (count equals the number of changes, key stable at every step). It is green and fails under V10.
- **D-19a (the ADR-QD-201 audit table):** rows rewritten, none removed (`Tests removed: 0`): N9 and N12 (a `Held` harness; same assertions), TN14 (the `.current.count` read is re-homed to the table's LAW2 and to A3: a remount for the announced stop is silent and a re-render keeps the element), TN15 (re-homed to "a notice handed another feed's ledger records its stop there": `Either` with two hook ledgers), SB1 (new props) and SB4 (compares to the rendered stopped box). The commit trailer of every 88 commit is D-05's `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`; the `trailers` mode checks it, so the committing agent must use that line and not a session default.

