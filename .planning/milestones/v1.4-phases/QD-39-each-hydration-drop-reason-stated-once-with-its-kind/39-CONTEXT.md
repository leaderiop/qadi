# Phase 39: Each hydration drop reason stated once, with its kind - Context

**Gathered:** 2026-11-14
**Status:** Ready for planning

<domain>
## Phase Boundary

Each hydration drop reason is stated once, in one keyed table in `packages/core/src/HydrationMetrics.ts`, with its kind
(`dehydration`, `payload` or `entry`) and its meaning (`summary`, `remedy`). The reason unions, `hydrationDropReasons`,
`isHydrationDropReason` (by `Object.hasOwn`), `hydrationDropMeaning` and react's payload and entry groups all derive from
it, so a new reason without a kind is a compile error. The list order and the label set are exactly today's, and
`qadi_hydration_dropped_total`'s declaration, id, description and `[metric-table]` row do not change. Records: ARCH-86,
ADR-QD-152, CCR-QD-430, BEH/INV amended in place (new numbers from BEH-QD-531..535 and INV-QD-323..324 only where nothing
covers a statement), changesets `@qadi/core` minor and `@qadi/react` patch. Requirements: DROP-01 to DROP-04, plus the WX
cross-cutting rows.

Read first: `.planning/phases/_SHARED-CONTEXT.md`, `.planning/phases/_WAVE9-CONTEXT.md` (Phase 39 evidence),
`.planning/research/SUMMARY.md` (the Phase 39 table-form and length-pin settlements, and the Phase 39 roadmap row).

</domain>

<decisions>
## Implementation Decisions

### Settled by research (not re-asked)
- **D-01:** One keyed `as const` object in today's interleaved key order: ForeignSubject, UnencodablePolicy,
  PayloadSubjectMismatch, MalformedEntry, UndecodablePolicy, EntryTooDeep, UnsupportedPayloadVersion, MalformedPayload,
  PayloadTooDeep. That order is the metric's `preregisteredWords` order and is observable in devtools' `Hydration.ts`
  (the panel's row order) and in two tests. Same shape as `ENFORCEMENT_ERROR_CLASSES` in `Errors.ts`
  (`as const satisfies …`, a kind-subset type read off it).
- **D-02:** `MEANINGS` is folded into the rows. Two tables keyed by one union is the same defect one level down.
- **D-03:** `isHydrationDropReason` narrows by `Object.hasOwn(table, word)`. `Struct.keys` is unverified in
  `effect@4.1.2`, so do not use it.
- **D-04:** The existing written-out order lists in core's `HydrationMetrics.test.ts` and the `length === 9` pin at
  `packages/devtools/test/model/Hydration.test.ts:109` are kept unedited, as independent oracles of the label set.

### Table and public surface (accepted 2026-11-14)
- **D-05:** The table is a **module-private** `const` in `HydrationMetrics.ts`. Runtime exports are unchanged, and
  readers keep reading `hydrationDropReasons` and `hydrationDropMeaning`.
- **D-06:** Exactly one new public type, `HydrationDropReasonOf<K>`, with `K` constrained to the three kinds
  (`"dehydration" | "payload" | "entry"`). `DehydrationDropReason` (`HydrationDropReasonOf<"dehydration">`),
  `ClientHydrationDropReason` (`HydrationDropReasonOf<"payload" | "entry">`) and `HydrationDropReason` (the table's
  keys) keep their names and become derived aliases. `hydrationDropReasons` is derived from the table's keys in
  declaration order, with no cast.
- **D-07:** The table `satisfies` a row constraint that requires `kind`, `summary` and `remedy`. tstyche pins:
  - the three kind subsets partition `HydrationDropReason` exactly and are pairwise disjoint;
  - an unknown kind is refused;
  - a kind-less row is a `toRaiseError`.
  The planner picks the narrowest export the negative needs. If the negative needs a second public type, it is named in
  the changeset and in `spec/overview.md`.
- **D-08:** The per-reason doc comments move from the union members onto their rows. `hydrationDropMeaning` returns the
  row, typed `HydrationDropMeaning`, so its signature and its `{ summary, remedy }` shape are unchanged.

### React and the readers (accepted 2026-11-14)
- **D-09:** `packages/react/src/HydrationEvent.ts`:
  - `PayloadRefusalReason = HydrationDropReasonOf<"payload">` and `EntryDropReason = HydrationDropReasonOf<"entry">`.
  - Both keep their names and exports.
  - The "Written out rather than `Extract`ed … a new reason is placed by hand" doc is deleted and replaced with one
    saying they are derived from core's table.
- **D-10:** React's dispatchers (`bucketOf`, the refusal maps, `DeveloperSignals.ts`) are untouched and stay exhaustive
  over the derived types. A new `payload` or `entry` row is a compile error there by design: the reporters must say
  something about it.
- **D-11:** Devtools (`packages/devtools/src/model/Hydration.ts`) and `examples/nextjs-newsroom` get no source change.
- **D-12:** Core first, then react, in separate plans. React's plan starts from core's committed table.

### Proof and records (accepted 2026-11-14)
- **D-13:** First, on the phase base and before any source edit, commit alone the mutation baseline
  (`39-mutation-base.json`), using the exact invocation the close will use:
  - core: `packages/core/src/HydrationMetrics.ts`, using `stryker.config.mjs`;
  - react: `packages/react/src/HydrationEvent.ts`, using `stryker.react.mjs`.
  Then commit a written-out, ordered nine-word snapshot test that is green on the base (DROP-03). A drop at the close is
  fixed with a test and never re-baselined (WX-05).
- **D-14:** The throwaway new-row experiment runs twice, like Phase 38's retype, and is recorded in the SUMMARYs and
  reverted each time:
  - **On the base:** count the edits a new reason needs, and record which of them compile when one is missed (the
    harm).
  - **After the change:** one row edit. Record the row reaching the metric's preregistered words, the devtools panel at
    zero, and react's reporters, where it appears as the compile error D-10 promises (the fix).
  `git status --porcelain -- packages` must be empty after each run.
- **D-15:** A new ADR-QD-152 records the decision: core owns each reason's kind, and react's groups derive from it. It
  touches ADR-QD-123 (the metric is unchanged) and ADR-QD-037 (meanings live in core). CCR-QD-429 is followed by
  CCR-QD-430's row.
- **D-16:** BEH and INV are amended in place wherever one already states the reason list or the payload and entry
  groups. Reserved new numbers (BEH-QD-531..535, INV-QD-323..324) are used only for a statement nothing covers yet
  (likely "the kinds partition the reasons"). Unused numbers are named in the CCR row.
  - Use only reserved numbers (ADR 150–155, CCR 428–433, BEH 521–550, INV 319–330) and confirm each is free by grep.
  - Never run `node scripts/next-id.mjs`.
  - Changesets: `@qadi/core` **minor** (the new public type), `@qadi/react` **patch**. Nothing is released.
- **D-17:** The metric stays exactly as it is:
  - `qadi_hydration_dropped_total`'s declaration line, id and description are untouched, because the registry key
    includes the description;
  - the `[metric-table]` row is unchanged;
  - `METRIC_ID_LITERAL_BUDGET` for `packages/core/test/HydrationMetrics.test.ts` stays 5.

### Claude's Discretion
- The table's name, the name and placement of the row constraint, and the exact tstyche file for the negatives
  (`packages/core/test/HydrationMetrics.tst.ts` exists and is the likely home).
- Whether the snapshot test goes in core's `HydrationMetrics.test.ts` or devtools' `Hydration.test.ts`. Core's is
  preferred, beside the existing lists.

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `ENFORCEMENT_ERROR_CLASSES` in `packages/core/src/Errors.ts`: the precedent. `as const satisfies`
  `EnforcementErrorClassTable`, with `EnforcementErrorTagOf<C>` read off it by a mapped type indexed with the union.
- `packages/core/test/HydrationMetrics.tst.ts` and `packages/react/test/Hydration.tst.ts` are existing tstyche files.

### Established Patterns
- `HydrationMetrics.ts` today:
  - unions at `:48` (`DehydrationDropReason`), `:71` (`ClientHydrationDropReason`) and `:126` (`HydrationDropReason`);
  - the hand list `hydrationDropReasons: ReadonlyArray<HydrationDropReason>` at `:129-139`, where a missing reason
    compiles;
  - `MEANINGS` as a mapped type at `:162`;
  - `hydrationDropMeaning`, then `isHydrationDropReason` by `.some(===)`;
  - `hydrationDroppedTotal = Metric.frequency("qadi_hydration_dropped_total", { …, preregisteredWords: hydrationDropReasons })`
    at `:282`.
- `HydrationEvent.ts:85` `PayloadRefusalReason` and `:92` `EntryDropReason` restate the client reasons as literals.
- House style: no `as`/`!`/`any`/`switch`; `Record<string, unknown>` is not a dodge; closed unions, not widening.

### Integration Points
- Readers of the names:
  - core: `HydrationMetrics.test.ts`, `HydrationMetrics.tst.ts`;
  - devtools: `src/model/Hydration.ts`, `test/model/Hydration.test.ts`;
  - react: `src/HydrationEvent.ts`, `src/HydrationEngine.ts`, `src/DeveloperSignals.ts`, and the tests
    `HydrationEngine`, `HydrationCounts`, `HydrationEvent`, `Hydration.tst`;
  - example: `examples/nextjs-newsroom` (`src/server/decide.ts`, `test/hydration.test.ts`).
- `HydrationEvent.ts` is in `stryker.react.mjs`'s mutate list.
- `METRIC_ID_LITERAL_BUDGET` has `packages/core/test/HydrationMetrics.test.ts: 5` (`scripts/check-house-style.mjs:1918`).
- Gate 13: `spec/overview.md` must name `HydrationDropReasonOf`.
- Phase 42 shares `HydrationEngine.ts` (a hard edge); this phase must not reshape that file beyond what D-09 and D-10 need.

</code_context>

<specifics>
## Specific Ideas

- The user accepted every recommended answer in all three areas.
- Phase 38's proof shape is the model: baseline committed alone first, a green-on-base characterisation, then a
  throwaway experiment run before and after the change, recorded and reverted.

</specifics>

<deferred>
## Deferred Ideas

None. Discussion stayed within phase scope. Devtools grouping its rows by kind was offered and not chosen.

</deferred>
