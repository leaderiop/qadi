# Phase 44: The hydration seed's fields stated once - Context

**Gathered:** 2026-11-15
**Status:** Ready for planning

<domain>
## Phase Boundary

Each verdict's seed fields are stated once, derived from core's wire statement (`DecisionWireAllow`/`DecisionWireDeny`,
`packages/core/src/DecisionWire.ts:26–55`), so a field added to the wire's `common` reaches the client's seed without a
hand edit, and the Allow/Deny branch is written once.

Today:
- `rebuild` (`packages/react/src/HydrationEngine.ts:375`) copies `evaluationId`, `durationMillis`, `visibleFields`,
  `obligations` and `disclosure` by hand;
- `SeededAllow`/`SeededDeny` (`packages/react/src/SeededDecision.ts:76–92`) write their field lists out;
- so a field added to the wire's `common` reaches the payload (the entries are already derived, `AllowEntry`/`DenyEntry`
  at `HydrationEngine.ts:77–101`) and is silently dropped by `rebuild` on the client. This compiles.
- The Allow/Deny branch is written three times: `dehydrateDecision` (:269), `rebuild` (:375), `entryAgrees` (:409).

Records: ARCH-91; ADR-QD-157 (the ADR-QD-135 pattern applied to the seed; ADR-QD-078 and ADR-QD-155 kept);
CCR-QD-435; BEH-QD-556..560 and INV-QD-333..334 are reserved (use only for statements nothing already covers).
Requirements: HYDF-01, HYDF-02, HYDF-03, HYDF-04, plus WX-01..07.

Read first:
- `.planning/phases/_SHARED-CONTEXT.md`, `.planning/phases/_WAVE10-CONTEXT.md` (Phase 44 evidence)
- the Phase 44 section of `.planning/ROADMAP.md`
- `spec/decisions/135-*.md` (the pattern), `spec/decisions/078-*.md`, `spec/decisions/155-*.md`
- `packages/core/src/SinkRecordFields.ts` (the pattern in code)

</domain>

<decisions>
## Implementation Decisions

### Where the seed fields are stated, and their shape (accepted 2026-11-15)
- **D-01: The statement lives in `SeededDecision.ts`.**
  - It holds the withheld lists (today's `ALLOW_WITHHELD`/`DENY_WITHHELD`, moved from `HydrationEngine.ts`), one
    `Schema.Struct` of fields per verdict (the wire variant's fields minus the withheld ones, plus `disclosure`), and the
    two classes.
  - `HydrationEngine.ts`'s `AllowEntry`/`DenyEntry` derive from those structs, so the payload entry and the seed read one
    statement.
  - `SeededDecision.ts` reaches the public surface only through `Hydration.ts`'s named re-exports, so the new structs stay
    package-private (nothing added to the barrel; gate 13 unchanged unless a named type must be re-exported for `.d.ts`
    emission, TS2883).
- **D-02: `subjectId` is the one substitution.** It sits outside the struct (the entry carries no subject; the envelope
  does), and each class is typed by `typeof <Verdict>SeedFields.Type & { readonly subjectId: SubjectId }` (exact type
  spelling is the planner's).
- **D-03: `visibleFields` follows the wire.** An absent key stays absent (as ADR-QD-135's records do), so
  `SeededAllow`'s constructor type changes from a required key that may be `undefined` to the wire's optional key.
  `@qadi/react` takes a **minor** changeset marked **Breaking**; `upgrading.md` gets a `@qadi/react` entry. Tests that
  construct `SeededAllow` with `visibleFields: undefined` are updated to omit the key.
- **D-04: A denial's shape does not change.** `SeededDeny` still withholds `obligations` and `reason` (a denial's
  `obligations` are always `[]`, and its reason is disclosed only inside `disclosure`).
- ADR-QD-078 holds: a seed is its own type, `_tag` is `SeededAllow`/`SeededDeny`, and both stay `Data.TaggedClass`es
  (not `Schema.TaggedClass`: ADR-QD-135 measured and rejected that).

### The Allow/Deny branch written once (accepted 2026-11-15)
- **D-05: One closed table at module scope**, keyed by the wire verdict `"Allow" | "Deny"`. Each row holds that verdict's
  withheld list, its disclosure builder (Withheld / Disclosed from a wire value), its seed class (rebuild = spread plus
  `subjectId`) and its claim for `decisionDisagreement`. `dehydrateDecision`, `rebuild` and `entryAgrees` each read the
  row. Exhaustive by construction (a missing verdict is a compile error, ADR-QD-152 / `FieldLattice.ts` pattern), no `as`,
  no `!`, no `switch`; dispatch on `_tag` uses `Match`. The exact encoding is the planner's, within those rules.
- **D-06: `entryAgrees` keeps its rule exactly.** A deny's claim is `{ verdict: "Deny", reason: disclosure.reason,
  obligations: [] }`, an allow's `{ verdict: "Allow", visibleFields, obligations }`, checked through core's
  `decisionDisagreement` (INV-QD-170); the `policyTag` check stays; a `Withheld` seed has nothing to compare.
- **D-07: Core's `DecisionWire.ts` is read, not edited.** If that proves impossible, the planner records the evidence.

### Proof and records (accepted 2026-11-15)
- **D-08: RED-first property.** A seeded fast-check property: any `Decision` → `dehydrateWith` → `hydrateWith` →
  `SeededDecision` keeps every disclosed wire field (with `includeTrace` on and off). It is committed green on the base.
  RED is shown with a temporary, **uncommitted** scratch field added to core's wire `common`: the property fails while the
  code still compiles; the output and the revert command are recorded in the SUMMARY; the scratch edit is reverted.
- **D-09: Byte golden on the base.** A JSON golden of `dehydrateWith` output covering an allow with and without
  `visibleFields`, an allow with obligations, and a deny, each with `includeTrace` off and on. Byte-identical after.
- **D-10: Mutation base.** A per-file Stryker base for `HydrationEngine.ts` and `SeededDecision.ts`, committed before
  the first `src` edit; no drop allowed after.
- **D-11: Records.** ADR-QD-157 ("A seed's fields are the wire's, stated once", applies ADR-QD-135 to the seed; keeps
  ADR-QD-078 and ADR-QD-155). CCR-QD-435 row in `spec/README.md`, `spec/decisions/index.yaml`, BEH-QD-556 (the round trip
  keeps every disclosed field) in the hydration behaviour doc, INV-QD-333 only if no invariant covers it, traceability,
  `spec/overview.md` if a public type changes, AGENTS.md wherever a section names a moved constant.
- **D-12: Changeset.** One `@qadi/react` minor (**Breaking**: `SeededAllow`'s `visibleFields` is an optional key).
  Nothing consumed or released.

### Claude's Discretion
- The names of the per-verdict field structs and the table, and the table's row encoding (record of functions, or
  tagged rows), within D-05's rules.
- Whether `ALLOW_WITHHELD`/`DENY_WITHHELD` stay as two constants or become a row field.
- Plan split. Suggested: (1) mutation base, byte golden and property (green on base, RED with the scratch field);
  (2) the derived statement and classes; (3) the table and the spreads; (4) records and changeset; (5) mutation
  comparison and merge gate.

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `DecisionWireAllow`/`DecisionWireDeny` and `encodeDecision` (`packages/core/src/DecisionWire.ts`); `decisionDisagreement`
  (`Decision.ts`).
- `AllowEntry`/`DenyEntry` already derive from the wire with `mapFields` + `Struct.omit` (`HydrationEngine.ts:77–101`).
- `AllowDisclosure`/`DenyDisclosure` already built from the wire's own `trace`/`reason` fields (`SeededDecision.ts:30–66`).
- `SinkRecordFields.ts` (core): `Schema.Struct` of fields, `Data.TaggedClass` typed by its `Type`, wire spreads it.

### Established Patterns
- Closed keyed tables over `switch`: `FieldLattice.ts` (ADR-QD-092), `HYDRATION_DROP_TABLE` (ADR-QD-152).
- `Match.type<…>().pipe(Match.tagsExhaustive(…))` hoisted to module scope (AGENTS.md §5a).
- Package-private modules reached only through named re-exports (`Hydration.ts`, ADR-QD-039).

### Integration Points
- `SeededAllow`/`SeededDeny` constructed in tests: `DecisionOutcome.test.ts:74,82`, `DeveloperSignals.test.ts:50`,
  `HydrationEvent.test.ts:98`, `SeededQuestion.test.ts:14,153`, `HydrationEngine.test.ts`; type pins in
  `DecisionOutcome.tst.ts`, `Hydration.tst.ts`.
- Readers: `DecisionOutcome.ts`, `components.tsx`, `DeveloperSignals.ts`, `SeededQuestion.ts`, `hooks.ts`; devtools
  reads seeds only through `@qadi/react`'s public types (check for `visibleFields` reads).

</code_context>

<specifics>
## Specific Ideas

- The pattern is ADR-QD-135's: the field list written once and spread, never restated in a class, a wire struct and a
  projection.
- Memory notes apply: prefer complete over simple; breaking changes are fine (not in production); compatibility is never
  the tiebreaker; closed unions written out in full.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>
