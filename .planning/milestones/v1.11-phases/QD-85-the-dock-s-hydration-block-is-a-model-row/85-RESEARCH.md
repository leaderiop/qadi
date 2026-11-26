# Phase 85: The dock's hydration block is a model row - Research

**Researched:** 2026-11-25
**Domain:** `@qadi/devtools` headless dock model (`src/model/`), its React panel (`src/react/`), the spec registers that state it, and the Stryker/vitest/tstyche gates that measure it
**Confidence:** HIGH for every file:line, store pin, spec location and gate rule (each was opened this session at HEAD `0f790a4d`; `packages/devtools/` and `spec/` are byte-identical to `ac7578f3`, checked with `git diff ac7578f3 HEAD -- packages/devtools spec`, empty). MEDIUM for the predicted per-store notification counts and the Stryker run time (derived by reading, not run: tagged `[ASSUMED]` below).

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Binding milestone decisions (from `_WAVE16-CONTEXT.md`, ROADMAP, REQUIREMENTS)**
- **D-01:** Work on branch `arch-wave-16` only, one phase at a time, on the main tree (`use_worktrees` is false). No
  merge, push, tag, release, publish, `changeset version` or version-packages PR (WX-07). Never `git add -A` under
  `.planning/milestones` (untracked `*.iter*.md` review backups exist there).
- **D-02:** Use only the reserved records: ARCH-132, ADR-QD-198, CCR-QD-477, BEH-QD-761..765, INV-QD-415..416. The
  reservation file (`$(git rev-parse --git-common-dir)/qadi-reserved-ids.json`) reads CCR 483, ADR 204, BEH 795, INV 428;
  none of these ids appears in `spec/`, `packages/`, `scripts/` or AGENTS.md at HEAD. Never run `node scripts/next-id.mjs`.
  An unused reservation is named in the CCR row ("Unused: …"). Pass `--date 2026-11-25` (or the real edit date) to
  `scripts/spec-revise.mjs`.
- **D-03:** Every behaviour change is preceded by a characterisation written on the phase base (green there and
  after) and every new check is shown failing once, with the scratch variant and failing text recorded in
  `85-RED-EVIDENCE.md` (WX-06). `pnpm check:pr < /dev/null` is green at the phase end (WX-01).

**Wave-wide policy decided here (applies to Phases 85–91)**
- **D-04 (changeset policy, WX-03):** every phase that edits a public package's `src` ships one `.changeset/*.md`
  per edited package: a `patch` stating the consumer-visible change, or "No export changes." when there is none
  (the v1.10 Phase 84 precedent); a **Breaking** minor only where a public name or shape moves, with an upgrade-guide
  entry. Rejected: no changeset for package-private moves (FEATURES' reading). Reason: the published changelog of a
  package whose shipped code changed should say so, and one rule for the whole wave removes a per-phase judgement call.
  Phase 85 ships one `@qadi/devtools` patch ("No export changes.").

**Area 1: The view's home and shape**
- **D-05 (home):** the view is its own derived store, exposed as `DockModel.hydration: ReadableStore<HydrationView>`:
  the model's eleventh store (BEH-QD-700's list) and its fifth derived store (rail, shown reading, `questions`,
  `services`, `hydration`), built with `makeDerivedStore` after `services` and before any host listener, with
  `parents: [shownReading]`. It follows `shownReading` through `parents`, as `services` does; no new `configure` step
  (a step would change the `AggregateError.errors` order BEH-QD-742 pins). Rejected: riding the questions store (its
  key would carry two different `unsampled` booleans, `joinQuestions` would recompute on every count move, and
  `useLens` would be re-notified; ADR-QD-185 decision 11 and ADR-QD-168 both make a computed view its own model store);
  an internal (non-exposed) store (the panel must read it).
- **D-06 (key and the "unsampled" rule):** the key is `{ hydration: reading.hydration, unsampled }`, compared by
  identity per field (`sameFields`, ADR-QD-185 decision 2); `undefined` is stated explicitly (the key type refuses an
  optional field). One module-scope key reader in `DockModel.ts` derives `{ reading, unsampled: isUnsampled(status) }`
  from the shown snapshot and is read by both `services` and `hydration`; `questions` keeps its own guard
  (`supplied === undefined && isUnsampled(status)`) around the same `isUnsampled`. The three predicates stay as they
  are and are not flattened into one flag (Pitfall 85-A): questions guarded by "host supplied questions", services
  unguarded, hydration with activity precedence. The activity-precedence rule lives inside `hydrationView`:
  `hydration !== undefined` → Counts whatever the status; otherwise `unsampled` → Pending, else Unwired. Rejected:
  putting `status` itself in the key (it recomputes on status moves the view ignores, e.g. Off → Live, and the
  hydration decision only reads `isUnsampled(status)`); a public `unsampled` on `DiagnosticsSnapshot` (public type
  change).
- **D-07 (where the text lives):** every data-dependent sentence is composed in the model, where the devtools mutation
  gate measures it: the rate sentence (and its absence at `rechecked === 0`, the singular at `rechecked === 1`), the
  no-drops sentence with the watched count, each raised drop's `{ count, reason, meaning }` (the `UNRECOGNISED`
  meaning for a foreign reason kept), and the scope sentence in both branches with its plural rule. Counts keep their
  four numbers as numbers for the four count cells. The fixed advice of Unwired (its JSX with three `<code>` spans) and
  `NO_COUNTS_YET` stay panel constants selected by tag: text that is not a rule may stay in the view (ADR-QD-168
  decision 8), and `model/` imports no React. The exact field names (`rate`, `drops` as `None { watched } | Raised {
  rows }`, `scope`) are the planner's, within these constraints. Rejected: the model returning JSX/`ReactNode`
  (cannot live in `model/`); the panel keeping the plurals (nothing would move under mutation).
- **D-08 ("0 dehydrated entries"):** pinned as it renders today; it is correct English (`entr{y}` only at 1). No
  wording change in this phase. `hasHydrated`, `hydrationActivity`, `unaccountedEntries`, `HydrationActivity`,
  `HydrationDrops` stay public and unchanged (`src/index.ts:53`); the view calls `unaccountedEntries`. No fourth
  "nothing hydrated" state.

**Area 2: `DockFrame` and the panel's reads**
- **D-09 (frame status read):** `DockFrame` reads only the status, through `useStoreSnapshot` with a derived
  `getSnapshot` (the `usePaused` shape in `useStoreSnapshot.ts`: `{ subscribe: store.subscribe, getSnapshot: () =>
  store.getSnapshot().status }`), as a named package-private hook beside `usePaused` (name is the planner's). React
  compares the selected status with `Object.is`, and `Live`'s identity is kept across unchanged samples
  (`DiagnosticsFeed.ts` keep rule), so a hydration-only change no longer re-renders the frame. `Screen` loses its
  `shown` prop. Rejected: a status-only sixth store (another BEH-QD-700 edit to solve a React concern); changing
  `useStoreSnapshot`'s signature to take a selector (the `usePaused` shape already exists and needs no API change).
- **D-10 (who reads the view):** `QuestionsPanel` takes `hydration: ReadableStore<HydrationView>` beside `questions`
  and `lens` and reads it with `useStoreSnapshot`; tags map to JSX through a hoisted `Match.type<HydrationView>()` with
  `Match.tagsExhaustive` (AGENTS.md §5a). The panel stops importing `isUnsampled` and `unaccountedEntries`. Rejected:
  the frame reading the view and passing the snapshot down (two subscriptions' worth of re-render for one block).
- **D-11 (proof of the frame saving):** a render-count test: three polls whose hydration is equal cause zero extra
  `DockFrame` renders and a poll where it differs causes exactly one; its positive twin fails when the frame keeps the
  whole-reading subscription (scratch variant recorded). A model test pins that an identical poll publishes nothing
  from `model.hydration` (the M54-style pin) and that a changed `hydration` publishes once.

**Area 3: Records, tests and measurement**
- **D-12 (ADR):** a new ADR-QD-198 ("The hydration block is a model row") records D-05..D-11, with dated amendment
  notes on ADR-QD-185 (store count and build order: five derived stores) and ADR-QD-168 (the second model row of its
  kind). Amend, do not supersede; keep the "Noted 2026-11-22" ordinal-history style (older counts stay as written).
  Rejected: amending ADR-QD-185 alone and naming 198 unused (the block gains a rule set of its own, as the port card
  did in ADR-QD-168).
- **D-13 (spec):** a new BEH (from BEH-QD-761..765) states the block's states and their mapping (Counts / Pending /
  Unwired, activity precedence, "zero is never shown for no reporter"); BEH-QD-218's empty-states table gains a
  hydration row; BEH-QD-700's list becomes eleven members including `hydration`; BEH-QD-699 says five computed
  (derived) stores; BEH-QD-735's first-configure counts gain the hydration row; INV-QD-390 is amended; new INVs
  (INV-QD-415..416) state the view's purity/closedness and the per-field identity of its key. `spec/traceability.md`
  rows, the `spec/README.md` CCR-QD-477 row and `spec/decisions/index.yaml` move in the same change.
- **D-14 (store-name pins):** `ConfigureRule.test.ts` (CR22, `:583`, `:631`) and `DockModel.listeners.test.ts`
  (`:64`, `:101`, `:131`) sweep "the ten stores" by name; they become eleven, with a new row that throws from a
  listener on `hydration` and its place in the aggregate's order. The store-list test in `DockModel.test.ts` compares
  names as a set. `DockModel.ts`'s header comment (derived-store list) and `useDockModel`/types follow. One commit.
- **D-15 (tests):** the two characterisation files (`QuestionsPanel.characterisation.test.tsx`,
  `QuestionsPanel.feed.characterisation.test.tsx`) are the byte oracle and stay unedited; the cells they lack are added
  on the base first (at least: `rechecked === 1`, `rechecked === 0`, `dehydrated === seeded`, `seeded > dehydrated`
  (unaccounted `undefined`), a foreign drop reason, Stopped-unsampled with a supplied `hydration`, Starting with and
  without a supplied `hydration`, Off, Live, Stopped-sampled). A table test `test/model/HydrationView.test.ts` covers
  every arm and boundary (each plural, `rechecked === 0`, `count > 0`, the unaccounted branch) plus a `.tst.ts` pin
  that the union is closed. Per-branch copy assertions in `QuestionsPanel.test.tsx` that now duplicate the view's text
  rules move to the table test; the panel keeps one render-per-tag test each, and every `data-testid` stays.
- **D-16 (mutation):** `HydrationView.ts` is under `stryker.devtools.mjs`'s `src/model/**` glob and has no base
  score, so it gets its own bar: no `Survived`, `NoCoverage` or `Ignored` mutant (the `LensSession` precedent).
  `DockModel.ts` is measured at the phase base and at close with the same invocation (`85-mutation-base.json`,
  `85-mutation-close.json`) and does not fall; a drop is closed with a test. `QuestionsPanel.tsx`,
  `DevtoolsDock.tsx` and `useStoreSnapshot.ts` are `src/react/`, outside every Stryker config: listed in the phase's
  `UNMEASURED` and proved by tests seen failing. Coverage: `src/model/**` is held at 95%.

### Claude's Discretion
- Exact names of the view's payload fields and of the frame's status hook, within D-07 and D-09.
- Whether the shared key reader is a named module-scope function or a small `const` in `makeDockModel`'s closure, as
  long as `isUnsampled` is spelled once per derived store key and the three predicates stay distinct.
- Plan count and split, provided plan 1 is the characterisation on the base and the records plan edits the spec
  registers once.

### Deferred Ideas (OUT OF SCOPE)
- A "nothing hydrated yet" state using `hasHydrated` (new behaviour; would change pinned DOM).
- Wording changes to the hydration copy (none needed; "0 dehydrated entries" is correct).
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| HYDV-01 | Characterisation on the base pins every hydration state; two `QuestionsPanel` HTML-string files are the byte oracle plus the missing cells | § "Characterisation cells: what is pinned, what is missing" lists the 30 cells already pinned and the 11 to add; the new file is a born-green characterisation |
| HYDV-02 | Pure closed-union view beside `portCards`, table-tested under `src/model/` and the mutation gate; no JSX in `model/` | § Architecture Patterns 1 (view shape), § Stryker (module-scope literals become `Ignored`, so sentence templates live in function bodies) |
| HYDV-03 | Dock model serves the view, keyed per field; three unsampled predicates stay distinct | § Verified line map, § Store pins, Finding Q3 (an equal-content republish when `unsampled` flips with a hydration present) |
| HYDV-04 | Panel renders the tag and decides nothing; `DockFrame` reads status only; every `data-testid` unchanged | Finding Q1 (a held test renders the panel with no `hydration`), Finding Q2 (what the render-count test must move to fail on the old frame) |
| HYDV-05 | ADR-QD-198, BEH-QD-700/699/735, INV-QD-390, BEH-QD-218 row and the store-name pins move together | § Spec registers (exact lines), § Store pins (exact lines and what each becomes) |
| WX-01..WX-07 | Cross-cutting | § Gates, § Changeset, § House style, § Validation Architecture |
</phase_requirements>

## Summary

The change is small and well-precedented: `portCards` / `services` (ADR-QD-168, ADR-QD-185) is the template, line for line. Everything the CONTEXT cites was re-checked against HEAD and is correct (CONTEXT's `Hydration` range `347-369` is `347-370` and `Counts` is `372-428`; nothing else moved). `packages/devtools/` has not changed since `ac7578f3` and neither has `spec/`.

Six findings qualify a locked decision (§ "Findings that qualify a decision"). None reverses a decision; each is a constraint the plan must carry. **Q6** and **Q4** are the ones that change the most work: nine tests in a pinned file must be edited whatever else is decided, and D-16's "no `Ignored` mutant" holds only if `HydrationView.ts` (and the shared key reader in `DockModel.ts`) avoid module-scope arrow consts. The two that change plan content: **Q1**, `Lens.questions.characterisation.test.tsx` is a held file that renders `<QuestionsPanel>` with no `hydration` prop, so a *required* store prop breaks `pnpm typecheck` on a file D-15's neighbours say never to edit; and **Q2**, the render-count test as worded in D-11 cannot fail on the old frame (INV-QD-411 already keeps the reading's identity across equal polls), so it must move a reading field with the status held at `Live`, and the "exactly one" half belongs to the panel, not the frame.

**Primary recommendation:** write plan 1 as the born-green characterisation (the missing HTML cells in a new file, plus the model-level pins M57+ for the store), then the view and its table test, then the store with the eleven-store pins in one commit, then the panel and frame, then the records plan once. Keep every sentence template inside a function body in `HydrationView.ts` (module-scope literals become `Ignored` mutants under `ignoreStatic: true` and D-16 forbids those).

## Findings that qualify a decision

None of these re-opens a decision. Each states what the code shows and what the plan should do to honour the decision's intent.

### Q1 (D-10, D-15): a required `hydration` store prop breaks a held file

**Evidence.** `packages/devtools/test/react/Lens.questions.characterisation.test.tsx` renders the panel at lines 72 and 182 as `<QuestionsPanel diagnostics={liveNotice} questions={questions} lens={lens} />`, with no `hydration`. Its header (lines 1-8) says "This file is held byte for byte from its first commit", it was born in `ac7578f3`, and INV-QD-414's Enforcement and ADR-QD-197's decision 3 cite it (LQ1 to LQ4). Today `hydration` is optional (`QuestionsPanel.tsx:78`), so it compiles. With `hydration: ReadableStore<HydrationView>` required, `tsc -p tsconfig.test.json` (3.2 s here) fails on those two sites, and at runtime `useStoreSnapshot(undefined)` throws.

**What the plan should do.** Keep the prop optional: `readonly hydration?: ReadableStore<HydrationView> | undefined`, and read `hydration ?? NO_HYDRATION` where `NO_HYDRATION` is a module-scope `const` store (`{ subscribe: () => () => {}, getSnapshot: () => UNWIRED }`, the shape of `idle` in `DiagnosticsFeed.ts:122-126`) holding `HydrationView.Unwired()`. For every panel render that has no `hydration` and a `Live` notice this renders exactly what the base renders (`activity === undefined && !unsampled` is Unwired), so Lens.questions, Lens.adapter, VerdictTreatment, QuestionsPanel.gates and QuestionsPanel.thunk need no edit and `panelInput` (`questionsPanelInput.ts`) needs none either. The dock always passes the real store, so the default is never reached in the product. The only direct-render difference is a test that renders the panel with a `Starting` notice and no `hydration`: none exists (verified: the only `<QuestionsPanel` renders are in the five files above, all with `liveNotice`). The rejected alternative is to edit the held file; the held-file rule and the INV-QD-414 citation both refuse it.

### Q2 (D-11): the render-count test as worded cannot fail on the old frame

**Evidence.** "Three polls whose hydration is equal cause zero extra `DockFrame` renders" passes on the OLD code too: `foldReading` (`Diagnostics.ts:159-167`) returns `previous` itself when no field moved (INV-QD-411, BEH-QD-751), so an equal poll publishes nothing from the diagnostics store and the old frame never re-renders either. Also "a poll where it differs causes exactly one" is wrong for the NEW frame: it reads only `status`, `Live`'s identity is kept (`DiagnosticsFeed.ts:195`) and `mergedOf` (`DockModel.ts:315-319`) carries `status` over, so a hydration-only change causes **zero** frame renders. The one render that follows on the React tab is `QuestionsPanel`'s own subscription.

**What the plan should do.** The twin that fails on the old frame is "a poll that moves a reading field while the status stays `Live`". Drive it with a collector double whose `snapshot` answers a different `portCalls` log per call (`makeCollectorDouble((call) => logOf(...))`, `test/collectorDouble.ts`; `intervalMillis: 10`), stay on the default `log` tab (no hydration reader mounted), wrap `<DevtoolsDock>` in `<React.Profiler onRender>` and count commits after the `Live` settle (wait for `state.calls >= 2`, then `await act`). New frame: 0 commits across 3+ further polls. Old frame (scratch variant: restore `const { status } = useStoreSnapshot(model.diagnostics)`): at least one commit per poll. Add the control that a status move (`Live` to `Stopped`, collector throws) does commit once. For "a changed `hydration` re-renders the panel once and not the frame", open the React tab and assert on a probe that counts `QuestionsPanel` renders through the supplied-reading path, or accept the model-level pin only (`hydration` store heard once, `diagnostics`' subscribers per the log tab zero). No devtools test counts renders today (checked: no `Profiler`, no render counter in `packages/devtools/test`); the only precedent is `packages/react/test/InstrumentToggle.characterisation.test.tsx:17-35` (a memoised probe with `let renders`).

### Q3 (D-06, BEH wording): an equal-content republish when `unsampled` flips with a hydration present

**Evidence.** The key is `{ hydration, unsampled }`. With a supplied `reading.hydration` and a poll that goes `Starting` to `Live`, `hydration` keeps its identity but `unsampled` flips `true` to `false`, so `sameFields` sees a change, `hydrationView` returns a new `Counts` object with equal content, and `store.set` (`ExternalStore.ts:108-112`, identity compare) notifies once. The panel re-renders to identical output. This is the same shape ADR-QD-168's "Two things that differ" records for `services` (M54 comment, `DockModel.test.ts:1695-1700`).

**What the plan should do.** Keep D-06 (it is the stated decision and the cheaper key). State the rule in BEH-QD-763 as identity of the two key fields, as BEH-QD-615 does for services, not as "an equal view publishes nothing". Pin it with a model row that names it (a supplied hydration, `Starting` to `Live`: heard once, equal by `Equal.equals`). The alternative that removes it (`unsampled: hydration === undefined && isUnsampled(status)` in the key) is the questions store's guard shape and would be a reviewed change to D-06, not a silent one.

### Q4 (D-16): module-scope literals in `HydrationView.ts` become `Ignored` mutants

**Evidence.** `stryker.devtools.mjs:49` sets `ignoreStatic: true`: a mutant in module-scope code that runs once at import is `Ignored`, never run. Phase 84's `judgeNew` (`84-mutation.mjs`, "Ignored ones are allowed") tolerates them for a close-only file; D-16 does not. DockModel.ts already carries 12 `Ignored` mutants at the last two measures (`81-mutation-close.json`, `83-mutation-base.json`: 65/65, survived 0, no coverage 0, ignored 12), which is the figure `85-mutation-close.json` must not exceed per kind.

**Stronger evidence that the bar is hard to meet.** The 12 `Ignored` mutants of `DockModel.ts` at the last close are all module-scope initialisers, and they include plain arrow consts, not only literals [VERIFIED: `.planning/milestones/v1.10-phases/QD-83-the-diagnostics-feed-folds-its-reading-as-a-value/83-mutation-close.json`, group `diagnostics`, `DockModel.ts`: `killed 65, survived 0, noCoverage 0, ignored 12`]. Mapped onto the source at HEAD (`DockModel.ts` is byte-identical to the measured head's for these lines):

| Line | Mutator | Source line (verbatim) |
|------|---------|------------------------|
| 183 | ArrowFunction | `export const completeDockInputs = (inputs: DockModelInputs): Required<DockModelInputs> => …` |
| 211 | ArrowFunction | `export const feedInputsOf = (inputs: Required<DockModelInputs>): FeedInputs => ({` |
| 259, 271 | ObjectLiteral | `Match.tagsExhaustive({` |
| 260-262, 272-274 | ArrowFunction | `Unwatched: () => ({}),` … `Failed: ({ reason }) => ({ failed: reason }),` |
| 328 | ArrayDeclaration | `const NO_ROLES: ReadonlyArray<Role> = [];` |
| 337 | StringLiteral | `export const makeDockModel = Effect.fn("qadi.devtools.makeDockModel")(function* (): Effect…` |

So `export const hydrationView = (input) => …` would itself carry an `Ignored` ArrowFunction mutant, and so would a hoisted `Match.type(...).pipe(Match.tagsExhaustive({...}))`. The two ways to honour D-16 as written: (a) declare `hydrationView` and its helpers as function declarations (`export function hydrationView(…)`, four model files already use that form: `Diagnostics.ts`, `DockModel.ts`, `ExternalStore.ts`, `TimelineFeed.ts` each hold one) and dispatch with a ternary chain, so no static initialiser carries a mutable node [ASSUMED: Stryker treats a function declaration's body as non-static; probe it on the first draft with `pnpm exec stryker run stryker.devtools.mjs --mutate packages/devtools/src/model/HydrationView.ts < /dev/null`]; or (b) accept the `LensSession` precedent exactly (Phase 84 allowed `Ignored` there: its base held `killed 52, survived 0, noCoverage 0, ignored 22` [VERIFIED: `84-mutation-base.json`, group `lens`], `84-mutation.mjs` header: "a new open mutant (Survived or NoCoverage) never does, and neither does a new Ignored mutant" applies to base-vs-close, and `ABSOLUTE` forbids only open ones). D-16 says "no `Ignored`", so (a) is the path; (b) is the recorded fallback if the probe shows an unavoidable one, and it must be a reviewed edit to the decision, not a silent one.

**What the plan should do.** Put every sentence template and every `=== 1` / `=== 0` / `> 0` inside a function body. Module scope in `HydrationView.ts` holds only the type, `HydrationView = Data.taggedEnum<HydrationView>()` (a call with no literal argument), the `HydrationInput` interface, and function declarations. No module-scope `const NO_…`, no payload-free singleton constant (`HydrationView.Unwired()` is called inside the function). `DockModel.ts` must not gain a module-scope arrow const either: the shared key reader (D-06) is a function declaration or an inner `const` of `makeDockModel` (which is inside `function*`, so its mutants run), or the close would show a 13th `Ignored` mutant against "no new Ignored mutant". The 85 mutation script's new-file judge must fail on any `Ignored` mutant (Phase 84's did not); copy `judge`'s per-kind Ignored rule for `DockModel.ts` and give `HydrationView.ts` an absolute rule (no open, no Ignored).

### Q5 (D-14, minor): the CR22 title, not only its objects, states the ten counts

**Evidence.** `ConfigureRule.test.ts:895` is an `it.effect` whose *title* spells "hears 2, 2, 2, 2, 0, 1, 0, 2, 1 and 0 notifications ... and one more on three stores". BEH-QD-735 (`28-devtools-screens.md:3254`) repeats it and cites "CR22 ... each of the ten stores". The title, the two expected objects (`:903-914`, `:921-932`), the `silent` record (`:660-671`) and the spec sentence move together; a rename of the test is a traceability edit in the same commit (v1.9 Key Lesson 2, `PITFALLS.md` X-4).

### Q6 (D-10, D-15): nine tests of `QuestionsPanel.test.tsx` pass a raw `HydrationActivity` and must change whatever else is decided

**Evidence.** `QuestionsPanel.test.tsx:92-195` holds the `describe("hydration, with nothing read")` (1 test) and `describe("hydration, read from the metrics")` (8 tests) blocks. Eight of the nine render `<QuestionsPanel … hydration={reading({…})} />` with a bare `HydrationActivity` object (`:117`, `:128`, `:134`, `:142`, `:158`, `:175`, `:185`, `:193`). Once the prop is a `ReadableStore<HydrationView>` those eight no longer compile. The file is held byte for byte by `80-pinned-check.mjs` (`{ file: `${TEST_DIR}QuestionsPanel.test.tsx`, edits: [] }`) and by `84-pinned-check.mjs` (its `PINNED` list), both against their own `phase_base`. D-15's "may move to the table test" is therefore not optional hygiene: the edit is forced, and the earlier pinned checks will go red for this one file exactly as `79-pinned-check.mjs` already exits 1 on `TF29`.

**What the plan should do.** (1) `85-pinned-check.mjs` declares the edit for `QuestionsPanel.test.tsx` with the region `:92-195` as the only editable span (the 80 `edits`/`heldFrom` model: `before`/`after` per edit, every other byte held) and holds every other test file byte for byte. (2) Record in `85-RED-EVIDENCE.md`/the summary that `80-pinned-check.mjs` and `84-pinned-check.mjs` now exit 1 on that file, by name, like `TF29`; do not edit those scripts. (3) Keep `questionsPanelInput.ts` unedited (Q1's optional prop leaves it unchanged), and let the nine tests build a store with a local helper `storeOf(view)` (`{ subscribe: () => () => {}, getSnapshot: () => view }`) and a literal `HydrationView.Counts({…})`, so the panel tests do not call `hydrationView` (the same independence rule `questionsPanelInput.ts`'s header states for `joinQuestions`). (4) The text rules those eight tests assert (`1 of 4`, no-rate at 0, no-drops, raised-only filter, `Process-wide`, `6 dehydrated entries`, `seeded more than it built`, `1 dehydrated entry `) move to `HydrationView.test.ts` as exact-string assertions; the panel keeps one render-per-tag test each and the nine `data-testid`s.

## Verified line map (HEAD `0f790a4d`; unchanged since `ac7578f3`)

All `[VERIFIED: Read this session]` against the file named.

### `packages/devtools/src/react/QuestionsPanel.tsx` (444 lines)
| What | Line(s) | Verbatim |
|------|---------|----------|
| `"use client";` | 1 | |
| `isUnsampled` import | 29 | `import { isUnsampled } from "../model/DiagnosticsFeed.ts";` |
| `HydrationActivity` type import | 39 | `import type { HydrationActivity } from "../model/Hydration.ts";` (unused once the prop changes: remove) |
| `unaccountedEntries` import | 40 | `import { unaccountedEntries } from "../model/Hydration.ts";` |
| `QuestionsPanelProps` | 51-87 | `hydration?` at 78: `readonly hydration?: HydrationActivity \| undefined;`; `diagnostics` at 86 |
| `NO_COUNTS_YET` | 89-90 | `const NO_COUNTS_YET = "no counts read yet.";` |
| `row` style (used by drops) | 97-103 | |
| `isUnsampled` call | 112 | `const unsampled = isUnsampled(diagnostics.status);` |
| `<Hydration …/>` | 134 | `<Hydration activity={hydration} unsampled={unsampled} />` |
| `heading` style | 326-331 | |
| `Hydration` | 347-370 | decision at 353-366 |
| `Counts` | 372-428 | `unaccounted` 373, `raised` filter 374, rate 389-394, drops 396-416, scope 418-425 |
| `Count` | 430-439 | |

### `packages/devtools/src/model/DockModel.ts` (453 lines)
| What | Line(s) |
|------|---------|
| header "Its stores" paragraph, "four derived stores (ADR-QD-185): the sightings rail, the shown reading, `questions` and `services`" | 31-38 (the count is on 33-34) |
| `isUnsampled` import | 47 |
| `DockModel` interface | 221-255: `timeline` 223, `dock` 224, `lens` 229, `explorer` 230, `roles` 231, `simulation` 232, `diagnostics` 234, `timelineStatus` 236, `questions` 238, `services` 240, `sightings` 245, `configure` 254 |
| `JoinKey` | 282-286 |
| `MergeKey` / `mergedOf` | 305-309 / 315-319 |
| `makeDockModel` | 337-453 |
| rail | 350-354 |
| `shownReading` | 368-375 |
| `questions` store | 383-395: key 385-393, `unsampled: supplied === undefined && isUnsampled(status)` at 391 |
| `services` store | 397-409: key 399-407, `unsampled: isUnsampled(status)` at 405, `compute: portCards` 408 |
| `configure` | 411-433; seven steps 417-430 (`shownReading.refresh()` is the seventh, 429); message 431 |
| returned model | 435-452: `services: { subscribe: services.subscribe, getSnapshot: services.getSnapshot }` at 449 |

### `packages/devtools/src/react/DevtoolsDock.tsx` (271 lines)
`Diagnostics` type import 18 (used only by `Screen.shown`: remove); `DockFrame` 105-189; `const { status, reading: shown } = useStoreSnapshot(model.diagnostics);` **112**; `useStopNotice(status, …)` 113; `<Screen … shown={shown} …>` 178-185 (`shown` at 181); `Screen` 226-271 with `readonly shown: Diagnostics;` at **229**; the `questions` tab 254-262 with `hydration={props.shown.hydration}` at **258**. `shown` is used nowhere else (verified by reading the whole file).

### `packages/devtools/src/react/useStoreSnapshot.ts` (25 lines)
`useStoreSnapshot` 13-14 (`useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot)`); `usePaused` 24-25 (`useStoreSnapshot({ subscribe: timeline.subscribe, getSnapshot: timeline.isPaused })`).

### `packages/devtools/src/model/ExternalStore.ts` (228 lines)
`ReadableStore` 33-41; `makeExternalStore` 98-118 (`set` notifies on `!==`, 108-112); `DerivedStore` 131-137; `Parent` 140; `sameFields` 153-160 (own enumerable string-keyed fields, `===`); `sameFieldsOrAbsent` 169-172; `makeDerivedStore` 197-228 with `K extends object & Required<K>` at **198**. A key `{ hydration: HydrationActivity | undefined; unsampled: boolean }` satisfies it exactly as `ServicesInput`'s `portCalls: PortCallLog | undefined` does (`PortCards.ts:30-37`).

### `packages/devtools/src/model/Hydration.ts` (137 lines)
`HydrationDrops` 46-60; `HydrationActivity` 62-73; `UNRECOGNISED` 75 (module-private; the meaning is already inside each `drops` row, built by `meaningOf` 84-85 and `hydrationActivity` 95-120); `unaccountedEntries` 132-133 (`self.dehydrated >= self.seeded ? self.dehydrated - self.seeded : undefined`); `hasHydrated` 136-137. Public through `src/index.ts:53` (CONTEXT).

### `packages/devtools/src/model/DiagnosticsFeed.ts` (236 lines)
`DiagnosticsStatus` 44-59 (`Off`, `Starting`, `Live`, `Stopped { reason, sampled }`); `diagnosticsOff`/`diagnosticsStarting` 70-79; `isUnsampled` **87-94** (`Off: false`, `Starting: true`, `Live: false`, `Stopped: !stopped.sampled`); `show` 177-181; the sink and the `Live` keep rule 186-198, literally `DiagnosticsStatus.$is("Live")(current.status) ? current.status : DiagnosticsStatus.Live()` at **195**; `restart` 231-233.

### `packages/devtools/src/model/Diagnostics.ts` (270 lines)
`Diagnostics` 77-84 (`hydration: HydrationActivity | undefined`, 81); `noDiagnostics` 87-92; `mergeReading` 131-142; `keep` 144; `foldReading` **159-167** (`hydration: keep(previous.hydration, next.hydration)` 163; `sameFields(folded, previous) ? previous : folded` 166). `Equal.equals` on two structurally equal `HydrationActivity` values is `true` and after a one-field change `false` [VERIFIED: ran `Equal.equals` under effect 4.1.2 this session].

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Which of Pending / Unwired / Counts, and every data-dependent sentence | Headless model (`src/model/HydrationView.ts`) | — | A rule written in a render function is reachable only by rendering and sits outside the mutation glob (ADR-QD-168 decision 8) |
| Serving the view, recompute-only-when-key-moves | Headless model (`DockModel.ts`, `makeDerivedStore`) | — | ADR-QD-185 decision 11: a computed view is its own model store |
| Rendering a tag to JSX (test ids, colours, fixed advice, count labels) | Browser / React (`QuestionsPanel.tsx`) | — | Text that is not a rule stays beside the markup |
| Frame notice and tab chrome | Browser / React (`DockFrame`) | Model (`diagnostics` status) | The frame needs the status only |
| Hydration counts source | `@qadi/core` metrics, read passively by `Hydration.ts` | — | Unchanged; process-wide aggregates |

## Standard Stack

No package is added. Everything is installed and used by the sibling code.

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| effect | 4.1.2 [VERIFIED: `packages/devtools/node_modules/effect/package.json`] | `Data.taggedEnum`, `Match`, `Equal`, `Effect.fn`, `Scope` | The house idiom; `PortCards.ts` and `DiagnosticsFeed.ts` are the precedent |
| react | 19.3.1 [VERIFIED: node_modules] | `useSyncExternalStore` through `useStoreSnapshot`, `Profiler` for the render count | Already the dock's one subscription call |
| @effect/vitest | 4.1.2 | `it.effect`, `assert` | Every model test |
| @testing-library/react | 16.3.3 | `render`, `act`, `screen` | Every React test; happy-dom 21.0.4 |

### Supporting (tooling already in the repo)
| Tool | Version | Use |
|------|---------|-----|
| vitest | 5.1.0 [VERIFIED: ran this session] | `pnpm exec vitest run --project devtools <files> < /dev/null` from the root |
| tstyche | 7.2.5 [VERIFIED] | `*.tst.ts` (`pnpm test:tstyche`), target 6.0.3 per `tstyche.json` |
| Stryker | 10.1.1 [VERIFIED] | `pnpm exec stryker run stryker.devtools.mjs --mutate <files> < /dev/null` |

**Installation:** none.

## Package Legitimacy Audit

No external package is installed or added by this phase. Audit: **none**. Packages removed due to SLOP: none. Packages flagged SUS: none.

## Architecture Patterns

### System Architecture Diagram

```
host props ─► useDockModel ─► DockModel.configure ─► diagnosticsFeed.configure ─► poll
                                                         │ sample (fresh objects each tick)
                                                         ▼ foldReading keeps references (INV-QD-411)
                                                  DiagnosticsSnapshot {status, reading}
                                                         │
                       supplied reading ─► mergedOf ─► shownReading (derived store)
                                                         │ parents: [shownReading]
                        ┌────────────────────────────────┼────────────────────────────────┐
                        ▼                                ▼                                ▼
          questions store (key: feed,        services store (key: wiring,     hydration store (NEW; key:
          supplied, supplied===undefined     activity, portCalls,              hydration, unsampled)
          && isUnsampled)                    isUnsampled)                      compute: hydrationView
                        │                                │                                │
                  QuestionsPanel                  ServicesPanel                    QuestionsPanel
                                                                       (renders the tag; decides nothing)

shownReading ─► DockFrame reads status only ─► useStopNotice ─► notice props ─► Screen ─► panels
```

### Recommended structure
```
packages/devtools/
├── src/model/HydrationView.ts          # NEW: type, HydrationInput, hydrationView (package-private)
├── src/model/DockModel.ts              # + hydration store, DockModel.hydration, shared key reader, header
├── src/react/QuestionsPanel.tsx        # Hydration/Counts become tag renderers; reads model.hydration
├── src/react/DevtoolsDock.tsx          # DockFrame status-only; Screen loses `shown`; passes model.hydration
├── src/react/useStoreSnapshot.ts       # + status hook beside usePaused
├── test/model/HydrationView.test.ts    # NEW table test
├── test/model/HydrationView.tst.ts     # NEW closed-union pin (positive and .not.toBeAssignableFrom only)
└── test/react/QuestionsPanel.hydration.characterisation.test.tsx  # NEW born-green cells
```

### Pattern 1: the view, shaped like `portCards`
**What:** a pure function over a small input record, a closed `Data.TaggedEnum`, payload-free states as constants, every sentence composed inside function bodies.
**Example (shape, from `PortCards.ts:30-37, 60-110, 249-278`; field names are the planner's):**
```typescript
// Source: packages/devtools/src/model/PortCards.ts (the precedent), adapted
import * as Data from "effect/Data";
import type { HydrationActivity, HydrationDrops } from "./Hydration.ts";
import { unaccountedEntries } from "./Hydration.ts";

export interface HydrationInput {
  readonly hydration: HydrationActivity | undefined;
  /** No sample has been taken, so an absent reading is not yet a statement about the host. */
  readonly unsampled: boolean;
}

export type DropsView = Data.TaggedEnum<{
  None: { readonly watched: number };
  Raised: { readonly rows: ReadonlyArray<HydrationDrops> };
}>;
export const DropsView = Data.taggedEnum<DropsView>();

export type HydrationView = Data.TaggedEnum<{
  Pending: {};
  Unwired: {};
  Counts: {
    readonly dehydrated: number; readonly seeded: number;
    readonly rechecked: number; readonly mismatched: number;
    readonly rate: string | undefined;   // absent at rechecked === 0
    readonly drops: DropsView;
    readonly scope: string;
  };
}>;
export const HydrationView = Data.taggedEnum<HydrationView>();

// Function declarations, not arrow consts: a module-scope arrow initialiser is an `Ignored` mutant (Q4).
// Each sentence is built inside a function body, never at module scope.
function countsOf(activity: HydrationActivity): HydrationView { /* rate, drops, scope */ }

export function hydrationView(input: HydrationInput): HydrationView {
  return input.hydration !== undefined
    ? countsOf(input.hydration)
    : input.unsampled
      ? HydrationView.Pending()
      : HydrationView.Unwired();
}
```
**The byte-identity rules the composition must keep** (from `QuestionsPanel.tsx:389-425`, all `[VERIFIED]`):
- rate: absent when `rechecked === 0`; else `` `${mismatched} of ${rechecked} re-checked question${rechecked === 1 ? "" : "s"} disagreed with the server.` ``
- raised rows: `activity.drops.filter((drop) => drop.count > 0)`; the empty case is `` `Nothing was dropped. All ${activity.drops.length} reasons are watched.` `` with `length` of **all** drops (the golden reads "All 9 reasons", `QuestionsPanel.feed.characterisation.test.tsx`), not of the raised ones
- scope: `Process-wide totals, not this page's.` + one space + (`unaccountedEntries(activity) === undefined` ? `This process seeded more than it built, so it is a client reading payloads rendered elsewhere.` : `` `${n} dehydrated entr${n === 1 ? "y" : "ies"} have no seeding counted in this process.` ``); `0` reads "0 dehydrated entries" (pinned by 15 feed-characterisation cells)
- the third span of a drop row is `— {meaning}`: the panel keeps the em dash and the space as markup; the view's row carries `meaning` as it is in `HydrationDrops`
- composing one string where JSX had several adjacent text nodes cannot change the characterisations: they compare `outerHTML` of a client render, which serialises adjacent text nodes without separators [VERIFIED: both files call `.outerHTML` on a `render`ed tree, never `renderToString`]

### Pattern 2: the derived store, shaped like `services`
```typescript
// Source: packages/devtools/src/model/DockModel.ts:397-409 (the precedent), adapted
const hydration = yield* makeDerivedStore({
  parents: [shownReading],
  key: (): HydrationInput => {
    const { reading, unsampled } = shownInputOf(shownReading.getSnapshot()); // one reader (D-06): a function declaration, not an arrow const (Q4)
    return { hydration: reading.hydration, unsampled };
  },
  compute: hydrationView,
});
// …and in the returned model, after `services`:
hydration: { subscribe: hydration.subscribe, getSnapshot: hydration.getSnapshot },
```
Built after `services` (line 409) and before `configure` (411). `services` should read the same `shownInputOf` so `isUnsampled(status)` is spelled once for the two unguarded stores and once in `questions`' guard. `shownReading.refresh()` stays the seventh step; no eighth.

### Pattern 3: the panel renders a tag
Hoisted `Match.type<HydrationView>().pipe(Match.tagsExhaustive({ Pending, Unwired, Counts }))` like `gatesBlock`/`questionsBlock` (`QuestionsPanel.tsx:163, 178`) and `ServicesPanel.tsx:65`. `Unwired`'s JSX (three `<code>` spans) and `NO_COUNTS_YET` stay panel constants. The `DropsView` is a second hoisted match.

### Pattern 4: the frame reads status only
```typescript
// Source: packages/devtools/src/react/useStoreSnapshot.ts:24-25 (usePaused), adapted
export const useDiagnosticsStatus = (readout: DiagnosticsReadout): DiagnosticsStatus =>
  useStoreSnapshot({ subscribe: readout.subscribe, getSnapshot: () => readout.getSnapshot().status });
```
`getSnapshot` returns the same `status` object between publishes (the `Live` object is reused, `DiagnosticsFeed.ts:195`; `mergedOf` copies `key.fed.status`, `DockModel.ts:318`), so React's `Object.is` check holds and no "result of getSnapshot should be cached" warning fires.

### Anti-Patterns to Avoid
- **One merged `unsampled` flag** for the three views (Pitfall 85-A): questions keeps `supplied === undefined &&`, services stays unguarded, hydration decides by activity precedence inside `hydrationView`.
- **A key that spreads or rebuilds an object** (Pitfall 85-B): `reading.hydration` is read, not copied.
- **JSX or `ReactNode` in `model/`**; **the panel keeping a plural** (nothing would move under mutation).
- **Module-scope string constants in `HydrationView.ts`** (Q4).
- **Editing a held file** (`Lens.questions.characterisation`, `DockFrame.stops.characterisation`, `ConfigureFirstRender.characterisation`, the two QuestionsPanel characterisations).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Recompute only when a key field moves | a last-key variable in `DockModel` | `makeDerivedStore` (`ExternalStore.ts:197`) | INV-QD-390: `DockModel.ts` holds no last key and no closed state |
| Closed state union | a string union plus `switch` | `Data.TaggedEnum` + hoisted `Match.tagsExhaustive` | AGENTS §5a; `SWITCH_BUDGET` forbids a new `switch` |
| Scope-sentence arithmetic | `dehydrated - seeded` in the view | `unaccountedEntries` (`Hydration.ts:132`) | It already refuses a negative loss |
| Render-count of a private component | a mock of `DockFrame` | `React.Profiler` on the Log tab | The frame is module-private; a hydration reader is not mounted there (Q2) |
| A second `useSyncExternalStore` | a hand-written subscription | `useStoreSnapshot` (`useStoreSnapshot.ts:13`) | "the dock's one `useSyncExternalStore` call" |

## Runtime State Inventory

A move of where a rule lives, not a rename. Each category answered:

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | None: hydration counts are in-process `@qadi/core` metrics read passively; nothing persists the block's state | none |
| Live service config | None: no external service names the block or its test ids (searched `apps features examples scripts spec packages` for the copy and ids; only `spec/devtools-spec/Qadi Devtools UI Mock.html` (a static mock), `spec/behaviors/19-hydration.md:895` (prose), the five test files and the CHANGELOG hits) | none |
| OS-registered state | None | none |
| Secrets/env vars | None | none |
| Build artifacts | `packages/devtools/lib/`, `packages/devtools/coverage/` and `examples/nextjs-newsroom/.next/` hold the old strings; all three are git-ignored (`.gitignore:2,6`; `examples/nextjs-newsroom/.gitignore:5`) | none: regenerated by `pnpm build` / `pnpm coverage` / `pnpm example` |

**Stale reference:** `examples/nextjs-newsroom/test/dock-wiring.test.tsx:92` has a comment saying "`QuestionsPanel.test.tsx` already pins that `hydration` hides it". It asserts nothing about the panel (it reads `Dock.tsx` source), so it needs no edit.

## Project Constraints (from CLAUDE.md / AGENTS.md)

Binding for the new code (AGENTS.md sections cited; user memory in italics):
- §1 imports: `import * as Data from "effect/Data"` etc.; relative imports end in `.ts`; `import type` for types (`verbatimModuleSyntax`). A package-internal import is a relative path, never `@qadi/devtools`.
- §5 `Effect.fn` for effectful functions: `HydrationView.ts` has none (pure); `makeDockModel` is already `Effect.fn("qadi.devtools.makeDockModel")(function* …)`. No new `Effect.fnUntraced` (`UNTRACED_BUDGET`).
- §5a `Match`, not `switch`: the panel dispatches the tag with a hoisted `Match.type<HydrationView>()…Match.tagsExhaustive`; the model uses a ternary chain (Q4). `SWITCH_BUDGET` stays at the declared 3.
- §6 forbidden: no `as`, `!`, `any`; no `console`; no module-scope `let` (`MODULE_STATE_BUDGET` counts only `DeveloperSignals.ts`: 1). No new `not.toBeCallableWith` pin (`NOT_CALLABLE_PIN_BUDGET`): the closed-union `.tst.ts` uses `toBe`, `toBeAssignableTo` and `@ts-expect-error` only (the Phase 84 `useConfigured.tst.ts` pattern, Pitfall 2 of `84-RESEARCH.md`).
- §7 Schema: not applicable (the view is not a trust-boundary type; it is a `Data.TaggedEnum`, like `ServicesView`).
- §9 barrels: `HydrationView.ts` stays out of `src/index.ts` and `src/react/index.ts` (package-private; ADR-QD-099, `[devtools-named-barrel]`). `DockModel` gains the member `hydration`, a type-level change to an exported interface: gate 13 reads export names, not members, so it does not move, and `packages/devtools/test/surface.tst.ts` names neither `DockModel` nor `services` [VERIFIED: grep returned nothing this session], so no `.tst.ts` pins the member list.
- §10 tests: `@effect/vitest`, `it.effect`; `src/model/**` 95% / `src/react/**` 90% per-file thresholds (`vitest.config.ts:49-52`, `:112-115`).
- §11/§12 spec is normative; `typescript` fences are compiled by `scripts/check-doc-examples.mjs`, `ts` fences are not. BEH-QD-761..765 should use `ts` for signature listings unless the example imports what it uses.
- §13 React: decisions live in atoms in `@qadi/react`; this package has no such rule, but `"use client";` stays the first line of every `src/react` file, and the panel reads the store through `useStoreSnapshot` (the dock's one `useSyncExternalStore` call), never its own.
- Doc-comment shape: one-line summary first, the why after (ADR numbers in the second paragraph).
- *User memory:* closed union over widening (the view is the full `Pending | Unwired | Counts`, not `old | "New"`); prefer the complete design; `Record<string, unknown>` is a hack; in autonomous mode decide and record, never ask.
- Phase rules: never `node scripts/next-id.mjs`; reserved ids only; `--date` on `spec-revise`; no push/merge/tag/release/`changeset version`; never `git add -A` under `.planning/milestones`; verify commands run as `bash -c '…'` or `/usr/bin/grep` (zsh aliases `grep`), globs quoted, `< /dev/null` on every pnpm/vitest/stryker call.

## Characterisation cells: what is pinned, what is missing (D-15, HYDV-01)

Both files compare `outerHTML` of `[data-testid="qadi-questions"]` whole, through the public `<DevtoolsDock>`; neither is to be edited. State of each hydration cell, read by classifying every golden string this session (a script that matched `qadi-hydration-pending` / `-unwired` / `-dehydrated` in each golden) [VERIFIED: `QuestionsPanel.characterisation.test.tsx:99-186`, `QuestionsPanel.feed.characterisation.test.tsx:155-360`]:

| File | Cells | Hydration block pinned |
|------|-------|------------------------|
| `QuestionsPanel.characterisation.test.tsx` | 12 (`absent gates` … `scoped and unscoped`) | `Unwired` ×11 (status `Off`); `Pending` ×1, `questions absent, unsampled` (status `Starting`) |
| `QuestionsPanel.feed.characterisation.test.tsx` | 18 | `Counts` ×15 (cells 1, 2, 4, 7-18), every one the all-zero real poll: no rate div, `qadi-hydration-no-drops` with "All 9 reasons", scope "0 dehydrated entries"; `Pending` ×3 (cell 3 `poll starting`, cell 5 `poll starting`, cell 6 `stopped before a sample`) |

**Not byte-pinned anywhere** (only substring-asserted in `QuestionsPanel.test.tsx:92-195`, which Q6 says must change): the rate sentence (`rechecked` 1 and > 1, 0), a raised drop row, a foreign drop reason's `UNRECOGNISED` meaning, `Process-wide … seeded more than it built`, the singular `1 dehydrated entry`, the plural with `n > 1`, and `All 0 reasons` (the shared fixture `suppliedHydration` has `drops: []`, `dockModelFixtures.ts:90-96`). Also unpinned: activity precedence with a supplied `hydration` under each status.

**Cells to add, on the phase base, in one new born-green file** `QuestionsPanel.hydration.characterisation.test.tsx` (never edited afterwards; later rows go in a separate file, Pitfall 7 of `84-RESEARCH.md`), each comparing `screen.getByTestId("qadi-hydration").outerHTML` (the block's own root, `QuestionsPanel.tsx:351`) so the cell is not diluted by the rest of the panel, through `<DevtoolsDock reading={{ hydration }} …>` (a supplied reading is a dock input) with a real `hydrationActivity`-shaped object:

| # | Cell | Status | Expected state |
|---|------|--------|----------------|
| H1 | `rechecked === 1`, `mismatched` 1 | Off | Counts, rate "1 of 1 re-checked question disagreed with the server." |
| H2 | `rechecked === 4`, `mismatched` 1 | Off | Counts, rate with "questions" |
| H3 | `rechecked === 0` with `seeded` 3 | Off | Counts, no rate div |
| H4 | `dehydrated === seeded` (10, 10) | Off | scope "0 dehydrated entries …" (the D-08 pin) |
| H5 | `dehydrated` 11, `seeded` 10 | Off | scope "1 dehydrated entry have no seeding counted …" |
| H6 | `dehydrated` 10, `seeded` 4 | Off | scope "6 dehydrated entries …" |
| H7 | `seeded` 4 > `dehydrated` 0 | Off | the "seeded more than it built" scope |
| H8 | one raised drop (`count` 2) and one at 0 | Off | `qadi-hydration-drops` with exactly one `qadi-hydration-drop` row, no no-drops div |
| H9 | a drop whose `reason` is foreign, with the shipped `meaning` for the unrecognised case | Off | row text is the reason and its meaning verbatim |
| H10 | `drops: []` | Off | "All 0 reasons are watched." |
| H11 | supplied `hydration` under `Starting` (a `diagnostics.layer` that never builds) | Starting | Counts (precedence over Pending) |
| H12 | supplied `hydration` under `Stopped`, unsampled (collector that throws on the first sample) | Stopped | Counts |
| H13 | no `hydration`, status `Live` after a sample | Live | Counts of the real poll, as feed cells 1-2 already pin |
| H14 | no `hydration`, status `Stopped` sampled | Stopped | Counts (feed cell 7 pins this: do not duplicate) |
| H15 | `Off`, no `hydration` | Off | Unwired (pinned ×11: do not duplicate) |
| H16 | `Starting`, no `hydration` | Starting | Pending (pinned: do not duplicate) |

H13-H16 are listed so the table covers the matrix; they are already pinned and need no new cell. The new file holds H1-H12, plus the model-level pins in `DockModel.test.ts` (M57+, below). Every cell gets one scratch-edit failure recorded in `85-RED-EVIDENCE.md` (WX-06; format `- failed: <title>` per `84-RESEARCH.md` Pitfall 9).

## Store pins: every place the list or count of stores is written (D-14, HYDV-05)

Verified by reading each location this session. "Becomes" is the minimum edit; names are `hydration` (the model's member name, D-05).

| File:line | Today (verbatim) | Becomes |
|-----------|------------------|---------|
| `test/model/ConfigureRule.test.ts:583-595` | `/** The ten stores of a dock, by the names the model gives them. */` over `storesOf` listing `timeline … services, lens` | "The eleven stores"; add `hydration: model.hydration,` after `services` |
| `ConfigureRule.test.ts:597-608` | `storeNames` ends `"services", "lens",` | add `"hydration"` after `"services"` |
| `ConfigureRule.test.ts:610-623` | `snapshotsOf` | add `hydration: stores.hydration.getSnapshot(),` |
| `ConfigureRule.test.ts:631-657` | `/** One listener on each of the ten stores, counting what each hears. */`, `heard.services`, `services: heard.services.calls` | "eleven"; add the `hydration: heardOn(stores.hydration)` and `.calls` rows |
| `ConfigureRule.test.ts:660-671` | `silent = { …, services: 0, lens: 0 }` | add `hydration: 0` |
| `ConfigureRule.test.ts:895` (title) and `:903-932` | `CR22 … hears 2, 2, 2, 2, 0, 1, 0, 2, 1 and 0 notifications while the poll layer is still building, and one more …` ; expected objects end `questions: 2, services: 1, lens: 0` then `questions: 3, services: 2, lens: 0` | add `hydration: 1` (building) and `hydration: 2` (built) [ASSUMED: same as `services`, because the key's `unsampled` flips at `Starting` and again at `Live`, and the first Live sample moves `reading.hydration` from `undefined` to an object in the same publish; run the test red to read the numbers rather than trusting this], and rewrite the title's list and its "one more on three stores" to four |
| `test/model/DockModel.listeners.test.ts:64-76, 78-90` | `/** The ten stores … */` `storesOf`, `storeNames` | add `hydration` to both; "eleven" |
| `DockModel.listeners.test.ts:101-106, 108, 131-154` | "each of the ten stores"; `silent = Object.fromEntries(storeNames…)`; `stateOf` ("What each of the ten stores holds") with `services: rowOf(model)` | "eleven"; `silent` follows `storeNames`; add `hydration: model.hydration.getSnapshot()` to `stateOf` so an identical configure is compared on it |
| `DockModel.listeners.test.ts:328-346` | `DL9 … throwingRow("services", { heard: true })` then `DL10 … throwingRow("lens", { heard: false })`, `DL11 the rows above cover every store a built model exposes` comparing `storeNames` | add a row `DL9a` (title `with a throwing hydration listener, a configure applies every input, rethrows what it threw, and an identical configure changes nothing`) calling `throwingRow("hydration", { heard: true })`; DL11 then passes only with the row present because `storeNames` gained `hydration`. `heard: true` is [ASSUMED]: a bare-model `configure` that moves `unsampled` or `hydration` notifies it; the existing `services` row uses `heard: true` for the same reason |
| `DockModel.test.ts:1792-1819` | `"a built model's members with subscribe and getSnapshot are exactly this list"`, `assert.sameMembers(stores, [ … "services", "lens" ])` (the list at `:1810-1819`) | add `"hydration"` |
| `DockModel.test.ts:353` | the M9 tab list `"inspector", … "services", …` | **not** a store pin (a tab id): untouched |
| `DockModel.test.ts:1777` onward | `the services store moves once per key field` | add a sibling `the hydration store moves once per key field` and M57+ rows (below) |

**The AggregateError order (BEH-QD-742, `DockModel.listeners.test.ts` DL12/DL18/DL19).** `configure` runs seven steps; `hydration` is a derived store whose parent is `shownReading`, so it is notified from step 7's `shownReading.refresh()` (the seventh), after the diagnostics step (6) and after `questions` and `services` (notified in the same refresh, in construction order, `questions`, `services`, then `hydration`: build order is the notify order for stores sharing a parent). A throw from a `hydration` listener therefore lands inside step 7's one `AggregateError` slot, after `questions` and `services` listener throws of the same step and before no later step, because step 7 is last [VERIFIED: `DockModel.ts:417-430`, seven steps, `shownReading.refresh()` seventh at `:429`; the build-order claim is `[ASSUMED]`, derived from `callAll` and `makeDerivedStore` reading, and DL19 (`:518-541`, a step whose listeners threw twice is one nested AggregateError) is the test that would show it]. No existing DL12/DL18/DL19 assertion names `services` or `questions` as a thrower, so none changes; add one DL row for `hydration` throwing together with `services`, asserting `errors` order (`services` error before `hydration` error) in step 7's nested aggregate. BEH-QD-742's text (`28-devtools-screens.md:3502-3503`, "any of the model's ten stores") changes "ten" to "eleven".

**New model rows (`DockModel.test.ts`, M57+; the last existing is M56 at `:481`).**
- M57: `model.hydration` holds `Unwired` on a bare model, `Pending` under a diagnostics layer that never builds, `Counts` for a supplied reading, from the first snapshot (the M48 shape, `:1640-1675`).
- M58: an identical poll publishes nothing from `model.hydration` (the heard counter stays 0 and the snapshot is the same reference) while the poll's reading is a *fresh equal object* (`makeCollectorDouble` returning a new equal log, so `foldReading` keeps `reading.hydration`). The control, by the same file's M54 pattern: a changed `hydration` publishes exactly once.
- M59: Q3's equal-content republish: a supplied `hydration`, `Starting` to `Live`, is heard once and `Equal.equals(before, after)` holds. Names the rule in its title.
- M60: `Off` to `Live` and `Live` to a sampled `Stopped` do not republish (the M54 twin, with the status moves that leave `unsampled` alone).

## Spec registers: exact locations and formats (D-12, D-13, HYDV-05)

Template: Phase 84's record set, one CCR row naming each document and its new `Rev`. Each spec document opens with a Document Control table; edit its header only through `node scripts/spec-revise.mjs <doc> "<what changed>" --date 2026-11-25` (it bumps the minor version in both the `Revision` row and the `Change History` cell; `--check` is the drift gate, run by `pnpm spec:verify`) [VERIFIED: `scripts/spec-revise.mjs:1-60`].

| Record | File and line at HEAD | Edit |
|--------|-----------------------|------|
| ADR-QD-198 (new) | `spec/decisions/198-<slug>.md`, Document ID `QADI-ADR-198` (gate 10: the id equals the file number); copy the section layout of `197-…md` (Document Control, `## Context`, `## Decision`, `## Alternatives considered`, `## Consequences`, `## What enforces it`, `## Related`) [VERIFIED: read lines 1-40 and the alternatives/consequences/enforcement/related sections of `197-…md`] | new; slug suggested `the-hydration-block-is-a-model-row` |
| `spec/decisions/index.yaml` | entries are `- id`, `file`, `title`, `status` (last entry ADR-QD-197 at `:617-620`; status `Accepted — amends ADR-QD-192 and ADR-QD-193`) | append the ADR-QD-198 entry, status `Accepted — extends ADR-QD-168, amends ADR-QD-185`; update the ADR-QD-185 (`:572`) and ADR-QD-168 statuses with an `amended 2026-11-25 (ADR-QD-198: …)` clause as the 192/193 entries do |
| ADR-QD-185 | `spec/decisions/185-the-dock-models-computed-stores-are-derived-stores.md`: the amendment blockquotes at `:177` ("the lens is the tenth store", "The dock model has ten stores", `:178`) and `:185` ("the sightings rail is the fourth derived store", `:186`) | add a dated `> **Amended 2026-11-25 (CCR-QD-477): `hydration` is the eleventh store and the fifth derived store.**` blockquote; leave the older counts as written ("Noted 2026-11-22" style) |
| ADR-QD-168 | `spec/decisions/168-a-port-card-is-a-model-row.md` | dated amendment: the second model row of its kind |
| BEH-QD-700 | `28-devtools-screens.md:1098-1135`: the REQUIREMENT list `` `timeline`, `dock`, `explorer`, `roles`, `simulation`, `diagnostics`, `timelineStatus`, `questions`, `services` and `lens` ``; prose `:1111` "ten of them, in no particular order"; `` `diagnostics`, `questions` and `services` are derived stores `` (links BEH-QD-699); the Pinned-by paragraph `:1133` "sweeps all ten stores" | eleven; add `hydration` ("the dock's hydration block, as a view": link the new BEH); the derived list adds `hydration`; keep the `> **Noted 2026-11-22 (CCR-QD-464).**` block as written and add a `Restated 2026-11-25 (CCR-QD-477)` line |
| BEH-QD-699 | `:2940-2975`: title "The dock model's four computed stores are derived stores"; the REQUIREMENT "`sightings rail … shown reading … `questions` … and `services` … MUST be derived stores, built in that order"; "so it is not among the ten stores" (`:2965`); Pinned-by names three DockModel.test.ts titles | title "five"; add `hydration` (its key: the reading's hydration and whether the poll has not sampled) to the REQUIREMENT after `services`; "eleven stores"; add the new title to Pinned-by. The heading text changes, so every `#beh-qd-699-…` anchor link (BEH-QD-700 `:1124`, INV-QD-390, traceability, `index`) must change in the same commit: the anchor `#beh-qd-699-the-dock-models-four-computed-stores-are-derived-stores` is linked from `28-devtools-screens.md:945, 1123, 2015, 2024, 2391, 3529, 3802`, `invariants.md:4527` and `decisions/185-…md:162`, and from traceability and `index.yaml`: grep it before the heading moves. The safer alternative, which the plan may take, is to keep the heading and anchor (the title says "four" and a dated `Restated` note says five), as ADR-QD-185's own amendments left older counts as written |
| BEH-QD-735 | `:3254-3295`: REQUIREMENT unchanged; the prose counts "timeline, dock, explorer, simulation, roles, diagnostics, timeline status, questions, services and lens: 2, 2, 2, 2, 0, 1, 0, 2, 1 and 0 …, which hear 2, 3 and 2" (`:3281-3285`); Pinned-by `:3294-3295` "(CR22 … each of the ten stores of a bare dock …)" | add `hydration` after `services` with its two numbers (read from the red run, Q5/[ASSUMED] 1 then 2), "diagnostics, questions, services and hydration stores, which hear 2, 3, 2 and 2", "ten" to "eleven" in both places |
| BEH-QD-742 | `:3545` heading; REQUIREMENT `:3502-3503` "any of the model's ten stores"; `:3612` "so not among the ten stores"; `:3624` "each of the ten stores of a bare dock" | "ten" to "eleven"; one sentence that a `hydration` listener's throw is in step 7's slot |
| BEH-QD-218 | `:424-445`: the empty-states table (`| Screen | Absent | Present but empty |`, rows Policies, Roles, Services, React) | add a row to the table (header at `:439`): Screen `Questions: hydration`; Absent: no counts supplied and the poll not handed `diagnostics` (state `Unwired`, which names the fix), or not sampled yet (state `Pending`, "no counts read yet."); Present but empty: counts that are all zero (state `Counts`, "Nothing was dropped. All N reasons are watched."). Never zero for no reporter |
| BEH-QD-231 | `spec/behaviors/19-hydration.md:776` | optional one-line cross-reference only ("the dock shows these counts through BEH-QD-761"); not required by a gate [ASSUMED] |
| BEH-QD-583, BEH-QD-615, BEH-QD-619 | `:2007`, `:2353`, `:2497` | model for BEH-QD-761..765: BEH-QD-615's "the services store is one moment, and keeps its reference when nothing moved" is the template for the hydration store's key rule (state it as identity of the two key fields: Q3) |
| BEH-QD-761..765 (new) | after BEH-QD-760 (`:4011`, the last behaviour of the file) in `28-devtools-screens.md`; each starts `## BEH-QD-7NN: <title>` then the `> **Decision:** …` / `> **Scope:**` / `> **Invariant:**` blockquote, a fenced REQUIREMENT block, prose, and a `Pinned by …. Specified in ADR-QD-198 (CCR-QD-477).` paragraph | five behaviours (suggested): 761 the view's three states and the activity-precedence mapping; 762 the rate, drops and scope sentences; 763 the hydration store is one moment keyed per field (Q3); 764 the panel renders a tag and decides nothing, the frame reads status only; 765 an unrecognised state is shown as itself or the union is closed (the BEH-QD-582 role) |
| INV-QD-390 | `invariants.md:4517-4530`: "(the sightings rail, the shown reading, `questions` and `services`)", Source "(the four `makeDerivedStore` calls)" and "as its tenth store, `lens`", Enforcement "lists the ten members" | five derived stores / eleven members; the four-call and tenth-store sentences restated with the date |
| INV-QD-407 | `invariants.md:4723`: "any of the dock model's ten stores" | "eleven" |
| INV-QD-411 | `invariants.md:4769` | no edit (it is the premise Q2 relies on); cite in INV-QD-416 |
| INV-QD-415, 416 (new) | after INV-QD-414 (`:4805`, last); format `## INV-QD-NNN: <title>` then a paragraph, `**Source**:`, `**Implication**:`, `**Enforcement**:`, `**Related**:` | 415: `hydrationView` is pure and total over `{ hydration, unsampled }`, its union closed; 416: the hydration store's key compares its two fields by identity, `reading.hydration` read and never copied |
| `spec/traceability.md` | BEH rows `:98-106` (the 756-760 table, with a lead-in sentence `:98` "The configurable value … (ARCH-131, ADR-QD-197), behaviour by behaviour:"); INV rows `:266-267`; ADR rows `:452`; test-file rows `:627-723` (one row per test file: `| `packages/devtools/test/model/ConfigureRule.test.ts` | BEH-QD-743, … |`, rows for `DockModel.test.ts` `:660`, `DockModel.characterisation.test.ts` `:661`, `QuestionsPanel*.tsx`, `DiagnosticsScreens`, `DevtoolsDock`); the `28 — The Devtools Screens` summary row `:70` | add BEH-QD-761..765 rows, INV-QD-415/416 rows, the ADR-QD-198 row, a row for each new test file, and the new ids on the rows of the files whose tests change (`ConfigureRule.test.ts`, `DockModel.listeners.test.ts`, `DockModel.test.ts`, `QuestionsPanel.test.tsx`); extend the `:70` id list; the header Change History line `:13` is written by `spec-revise` |
| `spec/README.md` | CCR table rows, last `| CCR-QD-476 | 2026-11-25 | … |` at `:413`; header `Change History` at `:13` | add `| CCR-QD-477 | 2026-11-25 | `spec/README.md` Rev … (this row), <every document and its Rev>, … Unused: ADR numbers/BEH/INV not consumed |`; the row lists each touched document with the revision `spec-revise` printed (the 476 row is the template, quoted above in part) |

**Gates that read these** (each run alone, `< /dev/null`): `pnpm spec:verify:strict` (`bash spec/scripts/verify-traceability.sh --strict`: every id has a traceability row and every test file named exists), `node scripts/spec-revise.mjs --check`, `pnpm spec:claims` (gate 12, `check-devtools-claims.mjs`, reads `spec/devtools-spec/`), `pnpm spec:api` (gate 13), `pnpm spec:gates` (gate 11, `check-dod-table.mjs`), `pnpm spec:examples` (compiles ` ```typescript ` fences), and gate 10's ADR Document ID check (inside the verify script). The `[no-numbering-placeholder]` rule refuses `ADR-QD-NEXT` and siblings in any shipped file.

## Mutation and coverage mechanics (D-16, WX-05)

- **Invocation** (alone, stdin closed): `pnpm exec stryker run stryker.devtools.mjs --mutate packages/devtools/src/model/DockModel.ts < /dev/null` for `DockModel.ts`, and the same with `…/HydrationView.ts` for the new file; `Stryker 10.1.1`, `testRunner: "vitest"`, `coverageAnalysis: "perTest"`, `ignoreStatic: true`, `thresholds { high 90, low 80, break 80 }`, `timeoutMS 20000`, reports at `reports/mutation-devtools/mutation.json` (git-ignored) [VERIFIED: `stryker.devtools.mjs`, read in full]. `mutate` is `packages/devtools/src/model/**/*.ts` only, so `src/react/**` is unmeasured.
- **Script shape** (`85-mutation.mjs`, copy of `84-mutation.mjs`): `record base|close <group> [--restart]`, `compare`, `--self-test`. Two groups: `dock` over `DockModel.ts` (base at the phase base, close after; judged by the removed-mutant rule: the score may fall only through deleted killed mutants, no new `Survived`, `NoCoverage` or `Ignored`) and `hydration` over `HydrationView.ts` (close only; `ABSOLUTE`: no open mutant; and per Q4 no `Ignored`, which Phase 84's `ABSOLUTE` did not forbid). Change the phase string, the file names (`85-mutation-base.json`, `85-mutation-close.json`) and the usage message; the `GROUPS`/`ABSOLUTE`/`UNMEASURED` constants are the whole diff [VERIFIED: `84-mutation.mjs:1-60`].
- **`UNMEASURED`** (written into every record so the gap is stated): `QuestionsPanel.tsx`, `DevtoolsDock.tsx`, `useStoreSnapshot.ts`, each with the `REACT_WHY` string (`no Stryker config reaches src/react …`); `DockModel.ts` is measured, so it is not listed.
- **Base figure for `DockModel.ts`**: `killed 65, survived 0, noCoverage 0, ignored 12` at the Phase 83 close [VERIFIED: `83-mutation-close.json` group `diagnostics`]; The Ignored lines above map onto HEAD's source unchanged, but a base is always re-measured on a clean tree before any edit (`record base dock`), never taken from an older record. Runtime of the run: not measured here (not run, per the read-only brief) [ASSUMED: minutes; the `mutation` script runs seven configs serially].
- **Coverage**: `packages/devtools/src/model/**` 95% lines/functions/branches/statements, `src/react/**` 90% [VERIFIED: `vitest.config.ts:49-52`, `:112-115`]. `HydrationView.ts` is fully reachable through its table test; the `QuestionsPanel.tsx` hydration branches stay covered by one render-per-tag test each plus the dock-level characterisations. Run `pnpm coverage` (= `vitest run --coverage`) once at the end; a per-file shortfall fails the run.
- **After a review-fix round**: `record close <group> --restart`, then `compare`, then `pnpm check:pr < /dev/null` and `pnpm spec:package`, each alone (Phase 83's rule).

## How to prove the D-11 render count (and what it must move)

Precedent and fixtures [VERIFIED: grep this session found no `Profiler` and no render counter anywhere under `packages/devtools/test`; the one render-counting precedent in the repo is `packages/react/test/InstrumentToggle.characterisation.test.tsx:17-35`, a memoised probe with `let renders`]:
1. Drive the feed with `makeCollectorDouble(script)` (`test/collectorDouble.ts`): `snapshot` is an `Effect.sync` that counts calls (`state.calls`) and answers `script(call)`; mount `<DevtoolsDock diagnostics={{ collector, intervalMillis: 10 }} …>` (the option is `intervalMillis`, `DiagnosticsFeed.ts:153`); wait with `vi.waitFor(() => assert.isAtLeast(state.calls, n))` inside `act`, as `QuestionsPanel.feed.characterisation.test.tsx`'s `settledAs` does.
2. Count `DockFrame` commits with `<React.Profiler id="dock" onRender={…}>` around `<DevtoolsDock>`: `DockFrame` is module-private, but a Profiler counts every commit of the subtree, and on the default `log` tab (no hydration reader mounted) the only subtree work a poll can cause is `DockFrame`'s.
3. The test that fails on the old frame (Q2): a script that returns a *different* `portCalls` log every call while the status stays `Live`. New frame: 0 commits after the first `Live` settle across three more polls. Old frame (scratch variant: restore `const { status, reading: shown } = useStoreSnapshot(model.diagnostics)` at `DevtoolsDock.tsx:112`): at least one commit per poll, because `reading` is a fresh object when a field moved. Record the old frame's failing output in `85-RED-EVIDENCE.md`.
4. Control: a status move commits once (script throws on call N: `Live` to `Stopped`).
5. "A changed `hydration` re-renders the panel once, not the frame": open the React tab (`fireEvent.click(getByRole("button", { name: "React" }))`) and assert the block's text moved after the poll whose `hydration` differs; count nothing for the frame (it is already pinned zero by step 3). The `hydration` store's own heard counter (M58) is the model-level pin of "publishes once".

## Changeset (D-04, WX-03)

One file, `.changeset/devtools-the-hydration-block-is-a-model-row.md` (name is the planner's; the precedent is `.changeset/devtools-lens-reads-each-fact-once.md`):

```markdown
---
"@qadi/devtools": patch
---

The dock's hydration block is decided by the dock model, as the Services tab's port cards are: which of the three states it shows, the rate sentence, the raised drops and the scope sentence are one pure view the model serves, and the panel renders what it is given. The dock's frame follows the poll's status alone, so a poll that moved only the counts no longer re-renders it. Nothing a host renders, receives or calls changes. No export changes.
```

`.changeset/config.json` has `fixed` over all nine packages, so one patch bumps them together; do not run `changeset version` [CITED: `84-RESEARCH.md` "Gates and Changeset", read this session]. No `upgrading.md` entry (nothing breaking). Do not stage `.planning/config.json` or the untracked `*.iter*.md` files.

## House-style and verify commands

Rules the new code could trip, all in `scripts/check-house-style.mjs` (617 files clean at HEAD, `pnpm lint` ran in 1.5 s [VERIFIED: ran this session]): `no-catchtags-object-form` (not used), `[devtools-named-barrel]` (no new barrel line), `SWITCH_BUDGET` (3 declared; use none), `UNTRUSTED_DECODE_BUDGET` (do not write `JSON.parse`/`Schema.decode*` in the view), `MODULE_STATE_BUDGET` (no `let`/`var` at module scope), `NOT_CALLABLE_PIN_BUDGET` (no negative callable/constructable pin in the new `.tst.ts`), `[no-numbering-placeholder]`, `METRIC_ID_LITERAL_BUDGET`/`SPAN_KEY_LITERAL_BUDGET` (no `"qadi_…"` or `"qadi.…"` literal outside a title; the panel's `data-testid="qadi-hydration…"` strings are not in either family). `pnpm circular` (`madge --circular`): `HydrationView.ts` imports only `Hydration.ts` and `effect`, and `DockModel.ts` imports `HydrationView.ts`; `react/QuestionsPanel.tsx` imports the type from `../model/HydrationView.ts`: no cycle. Type-check cost: `tsc -p tsconfig.test.json` ran in 3.2 s warm, exit 0, at HEAD [VERIFIED].

Per-task verify commands, each runnable as written from the repository root with stdin closed:
- `bash -c 'pnpm exec vitest run --project devtools packages/devtools/test/model/HydrationView.test.ts < /dev/null'`
- `bash -c 'pnpm exec vitest run --project devtools packages/devtools/test/model/DockModel.test.ts packages/devtools/test/model/DockModel.listeners.test.ts packages/devtools/test/model/ConfigureRule.test.ts < /dev/null'`
- `bash -c 'pnpm exec vitest run --project devtools packages/devtools/test/react/QuestionsPanel.test.tsx packages/devtools/test/react/QuestionsPanel.characterisation.test.tsx packages/devtools/test/react/QuestionsPanel.feed.characterisation.test.tsx packages/devtools/test/react/DiagnosticsScreens.test.tsx packages/devtools/test/react/DevtoolsDock.test.tsx < /dev/null'` (the three QuestionsPanel files ran green at HEAD: 3 files, 47 tests, about 2.5 s [VERIFIED])
- `bash -c 'pnpm exec tsc -p tsconfig.test.json < /dev/null'`; `bash -c 'pnpm lint < /dev/null'`; `bash -c 'pnpm circular < /dev/null'`; `bash -c 'pnpm test:tstyche < /dev/null'`
- Phase end, each alone: `pnpm check:pr < /dev/null`, `pnpm spec:package < /dev/null`, `pnpm spec:verify:strict < /dev/null`, `node scripts/spec-revise.mjs --check`, the mutation `compare`.

## Common Pitfalls

### Pitfall 85-A: one `unsampled` flag for three views
**What goes wrong:** a shared "is it unsampled" boolean makes `questions` stop honouring a supplied list, or `hydration` show `Pending` while a supplied reading exists. **Why:** the three rules differ on purpose: questions `supplied === undefined && isUnsampled(status)` (`DockModel.ts:391`), services `isUnsampled(status)` (`:405`), hydration precedence inside the view. **Avoid:** the shared reader returns `{ reading, unsampled: isUnsampled(status) }` only; the questions store keeps its guard around it. **Detect:** H11/H12 (a supplied reading under `Starting` and `Stopped`) and the held feed cells 3, 5, 6.

### Pitfall 85-B: a key that builds a new object
**What goes wrong:** `key: () => ({ hydration: { ...reading.hydration }, unsampled })` makes every poll look changed. **Avoid:** read `reading.hydration` as it is; `sameFields` compares own fields by `===` (`ExternalStore.ts:153-160`). **Detect:** M58.

### Pitfall 85-C: `exactOptionalPropertyTypes` and the key type
**What goes wrong:** `{ hydration?: HydrationActivity }` is refused by `K extends object & Required<K>` (`ExternalStore.ts:198`). **Avoid:** `readonly hydration: HydrationActivity | undefined` stated explicitly, as `ServicesInput.portCalls` does.

### Pitfall 85-D: a rewritten held file
**What goes wrong:** `Lens.questions.characterisation`, `DockFrame.stops.characterisation`, both QuestionsPanel characterisations, `ConfigureFirstRender.characterisation` are held byte for byte; an edit to a header or title fails the pinned check. **Avoid:** later rows go in a new file (Pitfall 7, `84-RESEARCH.md`); Q1 and Q6 say which held-file edits are forced and how to declare them.

### Pitfall 85-E: the `Screen` prop removal leaves a dead import
**What goes wrong:** `import type { Diagnostics }` (`DevtoolsDock.tsx:18`) is used only by `Screen.shown`; `isUnsampled`, `unaccountedEntries`, `HydrationActivity` imports (`QuestionsPanel.tsx:29, 39, 40`) die with the panel's decision. `oxlint` fails on an unused import. **Avoid:** remove each with its last use; the held `Lens.questions` test needs the `NO_HYDRATION` default (Q1) not an import.

### Pitfall 85-F: the plan's own verify step that cannot pass
**What goes wrong:** Phase 83's `git diff --quiet <phase_base> -- 83-mutation-base.json` can never pass (the file is born after the base); a `commit` check mode only judges an existing commit. **Avoid:** run every `<verify>` once against the real tree before it is written (`84-RESEARCH.md` Pitfall 8).

### Pitfall 85-G: three-way mutual dependency in the plan order
**What goes wrong:** the store-name pins fail the moment `DockModel.hydration` exists; the panel tests fail the moment the prop changes. **Avoid:** the store plan edits the three pin files in the same commit as `DockModel.ts` (D-14, v1.9 Key Lesson 2); the panel plan edits `QuestionsPanel.test.tsx`'s nine tests in the same commit as `QuestionsPanel.tsx` (Q6).

### Pitfall 85-H: adjacent text nodes in the composed sentence
**What goes wrong:** JSX renders `{a} of {b} re-checked question{s} disagreed…` as several text nodes; `textContent` and `outerHTML` serialise them without separators, so one composed string is byte-identical. A `renderToString` comparison would insert `<!-- -->` markers and differ; both characterisations use a client `render` and `outerHTML`, so they do not [VERIFIED: both files call `render(...)` then `.outerHTML`]. **Avoid:** keep new characterisations on the same client path.

## Code Examples

### The key reader and the two stores that read it (shape)
```typescript
// Source: packages/devtools/src/model/DockModel.ts:383-409 (HEAD), adapted
function shownInputOf(snapshot: DiagnosticsSnapshot) {
  return { reading: snapshot.reading, unsampled: isUnsampled(snapshot.status) };
}
// services' key:  { wiring: reading.wiring, activity: reading.activity, portCalls: reading.portCalls, unsampled }
// hydration key:  { hydration: reading.hydration, unsampled }
// questions keeps:   unsampled: supplied === undefined && isUnsampled(status)   (its own guard)
```

### The status-only frame (Q2, Pattern 4)
```typescript
// Source: packages/devtools/src/react/useStoreSnapshot.ts:24-25 (usePaused)
// DevtoolsDock.tsx:112 becomes: const status = useDiagnosticsStatus(model.diagnostics);
// <Screen … shown={shown} …> loses `shown`; the questions tab passes hydration={model.hydration}
```

### The closed-union pin (no counted negative pin)
```typescript
// Source: the useConfigured.tst.ts pattern, Phase 84 (toBe / toBeAssignableTo / @ts-expect-error only)
// expect<HydrationView["_tag"]>().type.toBe<"Pending" | "Unwired" | "Counts">();
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| A panel decides its empty state and composes its sentences in JSX | A model row (`portCards`, ADR-QD-168) the panel renders by tag | Wave 11 (CCR-QD-55 era) | Mutation gate sees the rule |
| A frame subscribes to the whole diagnostics snapshot | A frame subscribes to `status` through a derived `getSnapshot` (`usePaused`) | Phase 85 (this) | A reading-only move no longer re-renders the frame |
| Computed store with its own last-key | `makeDerivedStore` (ADR-QD-185) | v1.8 | INV-QD-389/390 |

**Deprecated/outdated in the research inputs:** "ten stores" in 5 places and "four derived stores" in `.planning/research/*`; FEATURES' "no changeset" for private moves (overridden by D-04); PITFALLS' "BEH-QD-218's rule `:418-423`" is a blockquote (`:411-423`), and the empty-states table is at `:439-445` of `28-devtools-screens.md`.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | The `hydration` store hears 1 (poll layer building) and 2 (built) in CR22, same as `services` | Store pins, BEH-QD-735 | Wrong numbers in a test and in the spec; the red run reads the real ones, low risk |
| A2 | A function declaration's body is not a static mutant site in Stryker, so `HydrationView.ts` can reach 0 `Ignored` | Q4, Mutation | D-16 as written is unattainable; fall back to the Phase 84 precedent with a recorded decision |
| A3 | Build order is the notification order for stores sharing a parent, so a `hydration` throw follows `services`'s inside step 7's slot | Store pins | A DL row asserting `errors` order fails; the test reads the real order |
| A4 | `throwingRow("hydration", { heard: true })` is right (a bare-model configure notifies it) | Store pins | The row fails on `heard`; change to `false` and record why |
| A5 | Stryker run time is minutes for the two files | Mutation | Plan scheduling only |
| A6 | BEH-QD-231 needs no edit | Spec registers | None for gates; a missing cross-reference only |

## Open Questions

1. **Is the first Live sample one publish or two for the diagnostics store?**
   - Known: CR22's diagnostics hears 1 then 2. Unclear: whether `hydration` (undefined to object) and `unsampled` (true to false) move in the same publish (they should, `show` publishes one snapshot).
   - Recommendation: take the number from the red run.
2. **D-16 versus Stryker's static-mutant rule** (Q4): resolved by function declarations if A2 holds; else a recorded amendment.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| node | all scripts | yes | v26.13.0 [VERIFIED: `node -v`] | none needed |
| pnpm | all commands | yes | in use this session | none |
| vitest | tests | yes | 5.1.0 | none |
| @stryker-mutator (`stryker`) | mutation | yes | 10.1.1 | none |
| tstyche | `.tst.ts` | yes | 7.2.5 | none |
| happy-dom | React tests | yes | 21.0.4 | none |
| madge | `pnpm circular` | declared in `check`; not run here | — | none |

No missing dependency. No network or service dependency.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest 5.1.0 (project `devtools`) + `@effect/vitest` 4.1.2 + `@testing-library/react` 16.3.3 (happy-dom 21.0.4); tstyche 7.2.5 for `.tst.ts`; Stryker 10.1.1 for `src/model/` |
| Config file | root `vitest.config.ts` (thresholds `:49-52`, `:112-115`); `stryker.devtools.mjs`; `tstyche.json` + `tsconfig.tstyche.json` |
| Quick run command | `bash -c 'pnpm exec vitest run --project devtools <file> < /dev/null'` |
| Full suite command | `pnpm check:pr < /dev/null` (plus `pnpm spec:package`, `pnpm spec:verify:strict`, the mutation `compare`, each alone) |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| HYDV-01 | Every state and sentence byte-pinned on the base: Pending, Unwired, Counts with rate (1, n, 0), raised drop, foreign reason, `All 0 reasons`, the three scope sentences, precedence under Starting/Stopped | component (HTML golden) | `… vitest run --project devtools packages/devtools/test/react/QuestionsPanel.hydration.characterisation.test.tsx` | Wave 0 (new, born green) |
| HYDV-01 | The 30 held cells stay green | component (held) | `… QuestionsPanel.characterisation.test.tsx QuestionsPanel.feed.characterisation.test.tsx` | exist, held |
| HYDV-02 | Every arm and boundary of the view: `rechecked` 0/1/n, `count > 0`, unaccounted `undefined`/1/n, `0` entries, empty drops, foreign reason, three tags | unit (table) | `… packages/devtools/test/model/HydrationView.test.ts` | Wave 0 |
| HYDV-02 | The union is closed; `HydrationView.ts` imports no React | type + script | `pnpm test:tstyche`; `85-check.mjs no-react-in-model` | Wave 0 |
| HYDV-02 | No open or `Ignored` mutant in `HydrationView.ts` | mutation | `node …/85-mutation.mjs compare` after `record close hydration` | Wave 0 |
| HYDV-03 | `model.hydration` exists, correct snapshot per status (M57); an identical poll publishes nothing, a changed one once (M58); the equal-content republish (M59); status moves that leave `unsampled` alone (M60); questions/services unaffected | unit | `… DockModel.test.ts` | extend |
| HYDV-03 | The three unsampled predicates stay distinct | script | `85-check.mjs three-predicates` (greps `supplied === undefined && isUnsampled(status)` once in `questions`, plain `isUnsampled(status)` once in the shared reader) | Wave 0 |
| HYDV-03 | `DockModel.ts` does not fall under mutation | mutation | `record base dock` then `record close dock` + `compare` | Wave 0 |
| HYDV-04 | The panel renders each tag with every `data-testid`; the nine rewritten tests pass; the held Lens test renders with no `hydration` | component | `… QuestionsPanel.test.tsx Lens.questions.characterisation.test.tsx` | edit (Q6) / held |
| HYDV-04 | `DockFrame` re-renders on no reading-only move | component (Profiler) | `… DockFrame.renders.test.tsx` | Wave 0 (new) |
| HYDV-04 | `QuestionsPanel.tsx` imports neither `isUnsampled` nor `unaccountedEntries`; `Screen` has no `shown` | script | `85-check.mjs panel-decides-nothing` | Wave 0 |
| HYDV-05 | Eleven stores in every pin; the AggregateError row; spec edits | unit + script | `… ConfigureRule.test.ts DockModel.listeners.test.ts DockModel.test.ts`; `pnpm spec:verify:strict`; `node scripts/spec-revise.mjs --check` | edit |
| WX-01..07 | gate green, changeset, commit trailers, red evidence, no release | script | `pnpm check:pr < /dev/null`; `85-check.mjs commit`/`seen-failing`/`records` | Wave 0 |

### Sampling Rate
- **Per task commit:** the one to three vitest files the task touches, plus the matching `85-check.mjs` mode.
- **Per wave merge:** `pnpm exec vitest run --project devtools < /dev/null`, `pnpm test:tstyche`, `85-pinned-check.mjs`.
- **Phase gate:** `pnpm check:pr < /dev/null`, `pnpm spec:package`, `pnpm spec:verify:strict`, `pnpm spec:claims`, `pnpm spec:api`, mutation `compare`; all green before `/gsd-verify-work`.

### Wave 0 Gaps
- [ ] `QuestionsPanel.hydration.characterisation.test.tsx` (H1-H12), born green on the base; one recorded scratch failure each.
- [ ] `85-check.mjs`, `85-pinned-check.mjs` (with the `QuestionsPanel.test.tsx` region edit, Q6), `85-mutation.mjs`, `85-earlier-checks.mjs` (expect `80-pinned` and `84-pinned` to exit 1 on `QuestionsPanel.test.tsx`, plus the standing `79-pinned` `TF29`) and their `--self-test`s; ports of `84-*.mjs` (Pitfall 4 of `84-RESEARCH.md`: change every hard-coded `84` name, scratch dir, subject regex and id-token list).
- [ ] `HydrationView.test.ts`, `HydrationView.tst.ts`, `DockFrame.renders.test.tsx`.
- [ ] `85-mutation-base.json` taken on a clean tree before any edit (`record base dock`).
- Framework install: none.

## Security Domain

`security_enforcement` is not set to false in `.planning/config.json` (absent means enabled). ASVS level 1.

### Applicable ASVS Categories
| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | none: a dev-tool panel |
| V3 Session Management | no | none |
| V4 Access Control | no | the dock is guarded by its host (`spec` ADR on dock exposure); no change here |
| V5 Input Validation | yes (rendering) | React text rendering escapes every string; the drop `reason` and `meaning` strings (which can be foreign, from a payload's metrics) are rendered as children, never as HTML. No `dangerouslySetInnerHTML` or `innerHTML` anywhere in `packages/devtools/src` [VERIFIED: `grep -rn 'dangerouslySetInnerHTML\|innerHTML' packages/devtools/src` returned nothing this session] |
| V6 Cryptography | no | none |

### Known Threat Patterns
| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Foreign drop `reason` string injected into the page | Tampering / XSS | React child text; the view carries the string, the panel renders it as a text node (the foreign-reason cell H9 pins that `<` is not interpreted: add a reason containing `<b>` to it) |
| A hydration view that discloses more than the reading | Information disclosure | The view carries only the counts, reasons and meanings already shown today; no new field |

## Sources

### Primary (HIGH confidence)
- Files opened this session at HEAD `0f790a4d` (identical to `ac7578f3` for `packages/devtools/` and `spec/`): `packages/devtools/src/react/QuestionsPanel.tsx`, `DevtoolsDock.tsx`, `useStoreSnapshot.ts`; `src/model/DockModel.ts`, `ExternalStore.ts`, `Hydration.ts`, `DiagnosticsFeed.ts`, `Diagnostics.ts`, `PortCards.ts`; tests `ConfigureRule.test.ts`, `DockModel.listeners.test.ts`, `DockModel.test.ts`, `QuestionsPanel.test.tsx`, both characterisations, `questionsPanelInput.ts`, `collectorDouble.ts`, `dockModelFixtures.ts`; `stryker.devtools.mjs`; `vitest.config.ts`; `scripts/spec-revise.mjs`; `.changeset/devtools-lens-reads-each-fact-once.md`; `spec/behaviors/28-devtools-screens.md`, `spec/invariants.md`, `spec/decisions/197-…md`, `index.yaml`, `traceability.md`, `README.md`.
- `.planning/milestones/v1.10-phases/QD-83-…/83-mutation-close.json` (the `DockModel.ts` mutation figures and Ignored list); `QD-84-…/84-mutation.mjs`, `84-pinned-check.mjs`, `84-RESEARCH.md`; `QD-80-…/80-pinned-check.mjs`.
- Runs this session: `pnpm exec vitest run --project devtools` on the three QuestionsPanel files (47 tests green), `tsc -p tsconfig.test.json` (exit 0), `node scripts/check-house-style.mjs` (617 files clean), `Equal.equals` on two `HydrationActivity` values under effect 4.1.2.

### Secondary (MEDIUM confidence)
- `.planning/research/SUMMARY.md`, `PITFALLS.md`, `FEATURES.md` (read before compaction; errata noted in State of the Art).

### Tertiary (LOW confidence)
- None used.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH, no package added; versions read from `node_modules`.
- Architecture: HIGH, one-for-one precedent (`services`, ADR-QD-168/185).
- Pitfalls and findings Q1-Q6: HIGH for the evidence, MEDIUM for A1-A4 (predicted counts and Stryker's static rule, each with the test that settles it).

**Research date:** 2026-11-25
**Valid until:** 2026-12-25, or until `packages/devtools/` or `spec/` changes on `arch-wave-16` (check `git diff ac7578f3 HEAD -- packages/devtools spec`).
