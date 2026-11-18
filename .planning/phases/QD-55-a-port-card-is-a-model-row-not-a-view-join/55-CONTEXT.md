# Phase 55: A port card is a model row, not a view join - Context

**Gathered:** 2026-11-18
**Status:** Ready for planning

<domain>
## Phase Boundary

A port card on the devtools Services tab becomes one row of a pure model function keyed by `PortName`. A misspelt or renamed port is then a compile error instead of a card that renders "never called", and `ServicesPanel.tsx` renders rows and computes nothing.

The live join today (`packages/devtools/src/react/ServicesPanel.tsx`) pairs each `report.ports` row with `activityFor` and `callsFor` through three differently typed keys:
- `PortReport.port: WiredServiceName` (`model/Wiring.ts`);
- `PortActivity.port: string` (`model/Wiring.ts`, exported from `@qadi/devtools`);
- `PortCall["_tag"]` (`model/PortCalls.ts`).

The view also holds:
- the state wording (`stateOf`), and "never called" vs "no activity reading" vs "absent";
- the `· N from translation` / `retried` / `timed out` suffixes;
- newest-first with five shown and "and N earlier", the `· N attempts` suffix, the "served"/"translation" labels, and "in flight" vs `x.x ms`;
- the uncollected and unsampled notes;
- the wiring-state `Match` (`NotHanded`/`Failed`/`Read`).

The consequence text is already model (`PORT_READING`, ADR-QD-160). The render cases (`ServicesPanel.test.tsx`, 32 cases; `ServicesPanel.reading.test.tsx`, 1) all render.

Package: `@qadi/devtools` only. Requirements: CARD-01..05, WX-01..07.
Records: ARCH-102, ADR-QD-168, CCR-QD-446, BEH-QD-611..615, INV-QD-355..356, all reserved; never run `next-id`.

</domain>

<decisions>
## Implementation Decisions

### Model shape and home
- **D-01:** The join lives in a new module, `packages/devtools/src/model/PortCards.ts`, exporting `portCards(input)`. It is the counterpart of `joinQuestions` in `Gates.ts` and sits beside `PortReading.ts`.
- **D-02:** It returns words, not raw data: a `ServicesView` tagged enum with `NotHanded`, `Failed{reason}` and `Read{rows, cache}`.
  - Each row carries:
    - the state text;
    - the activity line;
    - the consequence text and its tone (warning when defaulted, plain otherwise);
    - the `data-port` and `data-defaulted` values;
    - a closed calls union: `Hidden` (uncollected and unsampled), `Uncollected` (the "pass `portCalls`" note), or `Listed{calls, earlier}`.
  - The wiring-state `Match` moves into the model. The view only maps tags to JSX.
  - **Amended after research (owner, 2026-11-18):** a fourth tag, `Withheld`, carries "no layer handed and no sample yet", which renders nothing today (the `QuestionsView.Unsampled` precedent), so the view never inspects `unsampled` itself. The calls union `Hidden` covers both "uncollected while unsampled" and "collected, none for this port", so the view never inspects an empty list.
- **D-03:** The dock model calls it, once for each merged diagnostics snapshot, and `ServicesPanel` receives the `ServicesView`. This follows ADR-QD-162, where `joinQuestions` is a `DockModel` store. Phase 56 edits `DockModel` after this phase (soft dependency).
  - **Amended after research (owner, 2026-11-18):** the view is held as a `services` store, the dock model's **ninth** store, recomputed only when `wiring`, `activity`, `portCalls` or the unsampled flag changes identity (the `rejoin` precedent). `ServicesPanel` takes the store and reads it with `useStoreSnapshot`, as `QuestionsPanel` does. ADR-QD-168, the `DockModel.ts` header, BEH-QD-465 and an ADR-QD-047 amendment restate the store count (ADR-QD-162 says eight).
- **D-04:** The cache card's wording (`N completed entries` / `absent`) moves into the model. Fixed prose stays in the view, because it is text and not computation: the process-wide scope note and the no-TTL sentence.

### Keying by `PortName` (CARD-03)
- **D-05:** `PortActivity.port` narrows from `string` to `PortName`. It is exported from `@qadi/devtools`, so this is a public type change with a Breaking changeset entry (see D-15).
- **D-06:** `portActivity` reads one entry per registry port, using `forEveryPort` over the descriptions and looking up each port's own name in the metric. There is no cast and no iteration over the metric's string keys. The `> 0` "reached" filter (issue #107) is kept.
- **D-07:** Report rows stay keyed by `WiredServiceName`: the 5 ports plus `EvaluationId`, `CurrentSubject`, `DecisionCache` and `DecisionSink`.
  - Activity and calls become per-port records, `{ readonly [K in PortName]: … }`.
  - Calls are grouped once per log, not filtered once per card.
  - A non-port row takes a closed "not a port" branch through a type guard derived from the registry. It is not a string comparison.
- **D-08:** Proof:
  - a tstyche file pins two compile errors: a misspelt port in the activity/calls records, and one in a `PortActivity` literal;
  - a scoped grep in verification shows that no `===` on a port string remains in the join.

### Wording preserved (CARD-01)
- **D-09:** All text and `data-testid`s stay byte-identical. That includes today's "never called" on the four non-port service cards, although no metric ever counts them. That wording is deferred (see Deferred Ideas), not fixed here.
- **D-10:** `SHOWN_PER_PORT = 5` and `NO_ACTIVITY_READING` move to the model with their *why* comments.
- **D-11:** All per-call wording moves to the model row, and the view prints strings:
  - the `· N attempts` suffix (`describe`);
  - the "served"/"translation" labels (only `remote` and `toPredicate` are labelled);
  - "in flight" vs `x.x ms`;
  - "and N earlier".
- **D-12:** The model supplies each call row's React key, with the same value as today (`${span}-${String(at)}-${description}`).

### Tests, mutation, records
- **D-13 (CARD-01, WX-06):** A new `packages/devtools/test/react/ServicesPanel.characterisation.test.tsx` is written on the phase base. The precedent is `QuestionsPanel.characterisation.test.tsx`.
  - It asserts every card's full text and `data-testid`s, and `data-port`/`data-defaulted`.
  - It covers every combination of: wiring state, sampled or unsampled, calls collected or not, and fewer or more than 5 calls, including every interpreter label and the in-flight duration.
  - It is green before and after the change and is never edited.
- **D-14 (CARD-04):**
  - Each render case in `ServicesPanel.test.tsx` and `ServicesPanel.reading.test.tsx` first becomes a headless `packages/devtools/test/model/PortCards.test.ts` case.
  - The render case is deleted only once its model twin is green (Phase 26 precedent).
  - A short render test keeps the `data-testid`s and the tag-to-JSX mapping.
  - `portCards` gets a unit test that is RED by import before the module exists.
- **D-15 (WX-05):** Phase 53's D-14 rule applies, with the static-ignored credit the owner accepted in Phase 54 (ADR-QD-167 Rev 1.1).
  - Record `55-mutation-base.json` (`stryker.devtools.mjs`) for every touched model file on the phase base: `Wiring.ts`, `DockModel.ts`, and `PortCalls.ts`/`PortReading.ts` if touched.
  - A touched file whose score drops passes only when its survivor set is unchanged and the drop is exactly killed mutants that moved into `PortCards.ts`, where they are still killed.
  - Any other drop is closed with a test, never re-baselined.
  - New `PortCards.ts` has no surviving mutant that a test could kill.
  - The view is outside the mutate glob (`packages/devtools/src/model/**/*.ts`).
- **D-16 (WX-07):** One `@qadi/devtools` **minor** changeset with one **Breaking** entry: `PortActivity.port` is now `PortName`. The panel's wording is unchanged. WX-07 also requires the Breaking note in `apps/website/src/content/docs/docs/reference/upgrading.md` (a 0.13 section, prose-first). The two test sites the narrowing breaks (`DockModel.test.ts:787`, `features/features/devtools-screens/devtools-screens.steps.test.ts:419`) get type-only edits in the same commit as the type change.
- **D-17 (CARD-05, WX-02):**
  - ADR-QD-168 follows ADR-QD-162's precedent, restates ADR-QD-047's "the panel renders that model and computes nothing" for the Services tab, and keeps ADR-QD-160.
  - INV-QD-355: a port card's readings are joined by `PortName` in one pure model function.
  - INV-QD-356: the Services panel computes nothing.
  - CCR-QD-446 and BEH-QD-611..615 cover the rest. An unused reservation is named "Unused: …" in the CCR row.
  - `spec/overview.md` changes only if an export changes; gate 13 `check-api-surface.mjs` decides.

### Claude's Discretion
- Exact names of the view type, the row fields and the calls union, provided they read as domain words.
- Whether the non-port guard lives in `PortCards.ts` or `Wiring.ts`.
- BEH placement across the devtools behaviour docs.

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `model/Gates.ts`'s `joinQuestions(input): QuestionsSnapshot` is the pure-join precedent; `DockModel.ts` holds it as a store (`makeExternalStore`).
- `model/PortReading.ts`: `PORT_READING` (per-`PortName` record, consequence text) and `describeCall`.
- `model/PortCalls.ts`:
  - `PortCallOf<K>` and `PortCall` (mapped over `PortName`);
  - `PORT_BY_SPAN` built with `forEveryPort`, the cast-free way to go from a string to a `PortName`.
- `model/DiagnosticsFeed.ts`: `isUnsampled`.
- `model/Wiring.ts`: `WiredServiceName`, `PortReport`, `CacheReport`, `portActivity`, `portRow`/`required`/`optional`.
- `@qadi/core`: `PortName`, `forEveryPort`.

### Established Patterns
- Per-`PortName` mapped records, so a missing port is a compile error (`PORT_READING`, `ROWS`).
- Hoisted `Match.type` with `Match.tagsExhaustive` at module scope (AGENTS.md §5a).
- Characterisation is committed on the phase base before any `src` change (WX-06); the precedent is `QuestionsPanel.characterisation.test.tsx` (ADR-QD-162).
- Render cases are deleted only after their headless model twin is green (Phase 26).
- `@qadi/devtools`'s barrel is named exports (`devtools-named-barrel`). A Breaking changeset is a **minor** bump.

### Integration Points
- `react/ServicesPanel.tsx`: `wiringView`, `PortCard`, `RecentCalls`, `describe`, `callsFor`, `stateOf`, `activityFor`, `CacheCard`.
- `react/DevtoolsDock.tsx:330-337` passes `props.shown.wiring/activity/portCalls` and the notice.
- `model/DockModel.ts`: the diagnostics feed and the `remerge` that builds the shown snapshot (D-03).
- `model/DiagnosticsStore.ts`: `activity: ReadonlyArray<PortActivity>` (supplied or sampled).
- Tests: `test/react/ServicesPanel.test.tsx` (32), `ServicesPanel.reading.test.tsx` (1), `DiagnosticsScreens.test.tsx`, `DevtoolsDock.test.tsx`, and `test/model/Wiring.test.ts`.

</code_context>

<specifics>
## Specific Ideas

- "`ServicesPanel.tsx` renders rows and computes nothing" (roadmap). D-02's tagged view and D-11's strings make this literal: the panel's remaining code maps a tag to JSX and prints fields.
- Unchanged card text is the observable contract. D-13 pins every string on the base.

</specifics>

<deferred>
## Deferred Ideas

- The four non-port service cards (`EvaluationId`, `CurrentSubject`, `DecisionCache`, `DecisionSink`) read "never called" (or "no activity reading"), although no metric ever counts them. A later phase could say "not a port — no calls are counted". Kept byte-identical here under CARD-01 (D-09).

</deferred>
