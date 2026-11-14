# Phase 41: One guarded value-to-text function - Context

**Gathered:** 2026-11-14
**Status:** Ready for planning

<domain>
## Phase Boundary

No devtools panel or session command throws on a bigint or circular value. One package-private, guarded value-to-text
function is the single way Remedies, Filters and SimulationForm turn an unknown value into text. The defect is real:
research ran the real `remedyEdits` against built core, and six probes threw `TypeError`. The probes are `contains(10n)`,
`contains(circular)`, `inArray([1n])`, `inArray([circular])`, `eq(literal(1n))` and `eq(literal(circular))`. The throw
escapes `SimulationSession.commit()` synchronously, through `derive` and `sweepPlan`, outside any Effect.

Records:
- ARCH-88 and CCR-QD-432.
- ADR-QD-154 is **Unused**; the CCR row names it.
- BEH-QD-541..545 and INV-QD-327..328 are reserved; use them only for statements nothing already covers.
- Changeset: `@qadi/devtools` patch (a fix).

Requirements: TEXT-01 to TEXT-04, plus the WX cross-cutting rows.

Read first:
- `.planning/phases/_SHARED-CONTEXT.md`
- `.planning/phases/_WAVE9-CONTEXT.md` (Phase 41 evidence)
- the Phase 41 section of `.planning/ROADMAP.md`

The roadmap marks this phase standard: **skip research-phase**.

</domain>

<decisions>
## Implementation Decisions

### The RED tests and the primitive (accepted 2026-11-14)
- **D-01: RED first, on the phase base.**
  - A new test file reproduces the throw at two levels:
    - `remedyEdits`;
    - `makeSimulationSession` with `setPolicy`/`chooseSight`.
  - It covers `contains`, `inArray` and `eq(literal)` over a bigint and a circular value.
  - It is committed alongside the mutation baseline for the touched model files. The baseline is measured on the untouched base, committed alone and first, with the exact invocation the close will use.
  - The tests fail on the base and pass after the change.
- **D-02: Placement.** The primitive lives in a new package-private module under `packages/devtools/src/model/`, kept out of both devtools barrels (ADR-QD-099).
- **D-03: Contract.** `(value: unknown) => string | undefined`: the JSON text, or `undefined` when there is none.
  - It never throws, including on a throwing `toJSON` or getter.
  - Its rules are asserted in one test table and nowhere else. The table rows: bigint, circular, nested bigint, symbol, function, `undefined`, `NaN`, `-0`, null-prototype, throwing `toJSON`, throwing getter.
  - Each consumer keeps its own thin mapping over it:
    - Remedies: bare strings, and the word `undefined` in a label;
    - Filters: `[]`;
    - SimulationForm: `undefined`, then its round-trip refusal.
- **D-04: Guard.** Use the existing `try`/`catch` precedent (`Filters.ts`, `SimulationForm.ts`). No blanket catch, no `orDie`, no `Result.try`.

### How a remedy over a non-JSON value is shown (TEXT-04, accepted 2026-11-14)
- **D-05: Degraded label, not skipped.** The witness `[10n]` really satisfies `contains(10n)`. So the remedy is still offered and still applies; only its label degrades.
- **D-06: Label form.**
  - A bigint is shown as `10n`.
  - Any other value with no JSON form (circular, throwing `toJSON`, throwing getter) gets one fixed placeholder that contains none of the value's content.
  - The placeholder's exact wording is Claude's discretion.
  - No value content reaches any log.
- **D-07: Existing labels stay byte-identical.** A value that rendered before renders the same: bare strings, JSON text, and the word `undefined` for an `undefined` value (and for a function or symbol, as today). Only a value that threw before gets the new label. These outputs are pinned in tests written on the base.
- **D-08: Spec.**
  - BEH-QD-223 is untouched and not weakened.
  - A new BEH-QD-541 (in `spec/behaviors/29-devtools-simulator.md`) states the label rule.
  - INV-QD-327 is used only if an invariant is needed that nothing already covers.

### Scope and records (accepted 2026-11-14)
- **D-09: `Inspect.ts`'s `outsideUnion` and `QuestionsPanel.tsx`'s `resourceOf` are not folded in.** Neither can throw, and folding them in would change what they show.
- **D-10: ADR-QD-154 is Unused.** The decision is local to devtools, pinned by BEH-QD-541 and named in CCR-QD-432. Reserved numbers only: never run `node scripts/next-id.mjs`.
- **D-11: Changeset.** `@qadi/devtools` patch, a fix. Nothing is consumed or released.
- **D-12: Plan order.**
  1. RED tests plus the mutation baseline, on the base.
  2. The primitive and its one test table, with a pinned-output row per consumer.
  3. The three consumers.
  4. The records (BEH-QD-541, CCR-QD-432, the changeset).
  5. The mutation comparison and the merge gate, last.

### Claude's Discretion
- The primitive's module and function names (for example `ValueText.ts`/`valueText`).
- The placeholder wording for a non-JSON value.
- How the plans split within D-12's order (granularity is `fine`).

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `packages/devtools/src/model/SimulationForm.ts:95-103` `stringify`: already a guarded `JSON.stringify` returning `string | undefined`. It is the closest analog, and probably what the primitive becomes.
- `packages/devtools/src/model/Filters.ts:136-146` `render`: guarded, and maps `undefined` or a throw to `[]`.

### Established Patterns
- Bare `catch {` already appears in `packages/*/src` (`CustomPredicate.ts`, `Filters.ts`, `SimulationForm.ts`, `Capture.ts`).
- Package-private devtools modules are named per module in the narrow barrel (ARCH-40, ADR-QD-047). The new module stays out of it.
- One test table per rule set, as in the Phase 39 and 40 written-out pins.

### Integration Points
- `packages/devtools/src/model/Remedies.ts:574` `render = (v) => typeof v === "string" ? v : String(JSON.stringify(v))` is unguarded, and it is the live defect. It is used at `:481`, `:496` and in `Size`'s refusal at `:249`.
- `SimulationForm.ts:179` `encodeName`'s `JSON.stringify(name)` takes a `string`, not an unknown value, so it is not in scope for TEXT-03's "no other `JSON.stringify` of an unknown value".
- `SimulationSession.ts` `commit()` → `derive`/`sweepPlan` is where the throw escapes today.
- Core's `Matcher.ts` `contains(value: unknown)` admits a bigint or a circular value.

</code_context>

<specifics>
## Specific Ideas

- The user accepted every recommended answer in all three areas.
- Phase 38–40's proof shape is the model: the baseline committed alone and first, characterisation and RED on the base, then the change.
- The cleanest design wins, and compatibility is never the tiebreaker (memory). Here, though, existing labels are pinned unchanged by requirement (TEXT-03).

</specifics>

<deferred>
## Deferred Ideas

None. Discussion stayed within phase scope.

</deferred>
