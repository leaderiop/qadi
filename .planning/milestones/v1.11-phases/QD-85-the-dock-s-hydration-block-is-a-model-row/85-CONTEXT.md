# Phase 85: The dock's hydration block is a model row - Context

**Gathered:** 2026-11-25 (smart discuss, autonomous mode. Every decision below was decided autonomously on 2026-11-25 under the owner's standing instruction of 2026-11-22: "do not ask me, you are in the autonomous mode. always pick the most complete and clean solutions not the simplest". Each grey area is recorded with its evidence and the rejected alternatives.)
**Status:** Ready for planning

<domain>
## Phase Boundary

The hydration block of the dock's Questions tab is the one dock view whose state is decided inside React. Every other
view (the Services port cards, the questions and gates views) is a model row the panel only renders (ADR-QD-168,
ADR-QD-185 decision 11). This phase makes the hydration block a model row too.

Today (code at `ac7578f3`, unchanged at HEAD `66352987`; `packages/devtools` last changed by `ac7578f3`):
- `packages/devtools/src/react/QuestionsPanel.tsx:112` computes `const unsampled = isUnsampled(diagnostics.status)`.
- `Hydration` (`:347-369`) decides Pending (`activity === undefined && unsampled`, `qadi-hydration-pending`,
  `NO_COUNTS_YET`), Unwired (`activity === undefined && !unsampled`, `qadi-hydration-unwired`, a fixed JSX sentence
  with three `<code>` spans) and Counts (`activity !== undefined`, whatever the status).
- `Counts` (`:371-427`) works out, in the component: the rate sentence (only when `rechecked !== 0`;
  `"{mismatched} of {rechecked} re-checked question{s} disagreed with the server."`, `s` dropped at `rechecked === 1`);
  the raised-drops filter (`count > 0`) and the no-drops sentence (`"Nothing was dropped. All {drops.length} reasons
  are watched."`); each raised drop row (`count`, `reason`, `"— {meaning}"`); and the scope sentence
  (`"Process-wide totals, not this page's."` then either the "seeded more than it built" sentence when
  `unaccountedEntries(activity) === undefined`, or `"{n} dehydrated entr{y|ies} have no seeding counted in this
  process."`, `y` only at 1, so 0 reads "0 dehydrated entries", which is correct English).
- `packages/devtools/src/model/DockModel.ts:383-409`: the questions store keys
  `unsampled: supplied === undefined && isUnsampled(status)` (≈391); the services store keys
  `unsampled: isUnsampled(status)` (≈405). `isUnsampled` is one function (`DiagnosticsFeed.ts:87`).
- `packages/devtools/src/react/DevtoolsDock.tsx:112`: `DockFrame` reads `{ status, reading: shown }` from
  `useStoreSnapshot(model.diagnostics)`; `status` feeds `useStopNotice` (`:113`); `shown` is used only to pass
  `shown.hydration` through `Screen` (`:229` prop, `:258`) to `QuestionsPanel`.

After this phase:
- A pure, package-private `hydrationView` (new `src/model/HydrationView.ts`, beside `PortCards.ts`) returns a closed
  `Data.TaggedEnum` `HydrationView` = `Pending | Unwired | Counts`, with every data-dependent sentence already composed.
- The dock model serves it as its own derived store, `model.hydration` (the eleventh store, the fifth derived store),
  keyed `{ hydration, unsampled }` by identity per field, so an identical reading publishes nothing.
- `QuestionsPanel` reads `model.hydration` itself and renders the tag; it decides nothing and imports no
  `isUnsampled`.
- `DockFrame` reads only the diagnostics status (for its notice) and forwards no reading.
- Every rendered byte and `data-testid` of the block is unchanged for every status × reading combination.

ARCH-132. Package: `@qadi/devtools` (package-private change; gate 13 stays at 942, gate 14 unmoved). Records:
ADR-QD-198 (new), CCR-QD-477, BEH-QD-761..765, INV-QD-415..416, with BEH-QD-700, 699, 735, INV-QD-390 and BEH-QD-218's
table restated and dated notes on ADR-QD-185 and ADR-QD-168.

Evidence: the code at HEAD; `.planning/phases/_WAVE16-CONTEXT.md`; `.planning/research/` (ARCHITECTURE §Phase 85,
FEATURES §85, PITFALLS 85-A..D, STACK §Phase 85, SUMMARY §Phase 85).
</domain>

<decisions>
## Implementation Decisions

### Binding milestone decisions (from `_WAVE16-CONTEXT.md`, ROADMAP, REQUIREMENTS)
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

### Wave-wide policy decided here (applies to Phases 85–91)
- **D-04 (changeset policy, WX-03):** every phase that edits a public package's `src` ships one `.changeset/*.md`
  per edited package: a `patch` stating the consumer-visible change, or "No export changes." when there is none
  (the v1.10 Phase 84 precedent); a **Breaking** minor only where a public name or shape moves, with an upgrade-guide
  entry. Rejected: no changeset for package-private moves (FEATURES' reading). Reason: the published changelog of a
  package whose shipped code changed should say so, and one rule for the whole wave removes a per-phase judgement call.
  Phase 85 ships one `@qadi/devtools` patch ("No export changes.").

### Area 1: The view's home and shape
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

### Area 2: `DockFrame` and the panel's reads
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

### Area 3: Records, tests and measurement
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

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `makeDerivedStore` / `sameFields` (`packages/devtools/src/model/ExternalStore.ts`, `sameFields` ≈153,
  `makeDerivedStore` ≈197): the derived-store builder every computed view uses; `K extends object & Required<K>`.
- `portCards` (`model/PortCards.ts`) and its store in `DockModel.ts` (≈396-409): the precedent shape (pure function,
  derived store over `shownReading`, panel renders tags).
- `isUnsampled` (`model/DiagnosticsFeed.ts:87`): the one status predicate, a hoisted `Match.type`.
- `hydrationActivity`, `unaccountedEntries`, `HydrationActivity` (`model/Hydration.ts`): the passive reader and the
  scope rule's helper; public root exports.
- `usePaused` (`react/useStoreSnapshot.ts`): the derived-`getSnapshot` read through `useStoreSnapshot`.

### Established Patterns
- A computed view is a model store built with `makeDerivedStore`; the panel renders and computes nothing (ADR-QD-168
  d8, ADR-QD-185 d11). The store count is stated once in BEH-QD-700 and pinned by a set-comparison test.
- Closed unions as `Data.TaggedEnum`, dispatched with module-scope `Match.type<T>().pipe(Match.tagsExhaustive(...))`.
- The fold keeps a field's reference while `Equal.equals` says it is unchanged (`foldReading`), so identity keys are
  stable across identical polls (INV-QD-411).

### Integration Points
- `DockModel.ts`: new store after `services`; `DockModel` interface gains `hydration`; header comment; key reader.
- `react/QuestionsPanel.tsx`: props (`hydration` becomes a store), `Hydration`/`Counts` become tag renderers.
- `react/DevtoolsDock.tsx`: `DockFrame` status-only read; `Screen` drops `shown`; passes `model.hydration`.
- `react/useStoreSnapshot.ts`: the status hook beside `usePaused`.
- Tests: the two characterisation files, `QuestionsPanel.test.tsx`, `DiagnosticsScreens.test.tsx` (D5/D6),
  `DevtoolsDock.test.tsx`, `test/model/DockModel.test.ts`, `ConfigureRule.test.ts`, `DockModel.listeners.test.ts`.
- Spec: `spec/behaviors/28-devtools-screens.md` (BEH-QD-700 ≈1098, BEH-QD-699 ≈2940, BEH-QD-615 ≈2353, BEH-QD-735
  ≈3254, BEH-QD-218), `spec/behaviors/19-hydration.md` (BEH-QD-231 ≈776), `spec/invariants.md` (INV-QD-390, 389, 411),
  `spec/decisions/` (185, 168, new 198), `spec/traceability.md`, `spec/README.md`, `spec/decisions/index.yaml`.

</code_context>

<specifics>
## Specific Ideas

- Order of the view's arms: `hydration === undefined` → (`unsampled` ? Pending : Unwired), else Counts.
- The model's own notification note (ADR-QD-168): the shown reading notifies twice `Off → Live` (Starting is published
  between); state the hydration store's rule as identity of its key fields, as BEH-QD-615 does for services, not as a
  transition promise.
- Hydration counts are process-wide and read passively; the key field is the `HydrationActivity` object whose identity
  `foldReading`'s keep rule preserves; verify with a test that an unchanged sample publishes nothing.

</specifics>

<deferred>
## Deferred Ideas

- A "nothing hydrated yet" state using `hasHydrated` (new behaviour; would change pinned DOM).
- Wording changes to the hydration copy (none needed; "0 dehydrated entries" is correct).

</deferred>
