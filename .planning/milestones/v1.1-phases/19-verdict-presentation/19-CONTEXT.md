# Phase 19: One verdict treatment and one outcome reading in devtools - Context

**Gathered:** 2026-11-10
**Status:** Ready for planning
**Ticket:** ARCH-67 · review candidates #7 and #8 (both Worth exploring; #7 carries a presentation defect)
**Read first:** `.planning/phases/_SHARED-CONTEXT.md`

<domain>
## Phase Boundary

Two deepenings in `@qadi/devtools`, both about how a decision is shown:
1. **Verdict treatment:** one module is the only place a verdict (Allow, Deny, Error, Unknown, plus the gate
   non-answers Pending and Rechecking) becomes a visual treatment (colour, weight, outline, label). `VerdictTag`,
   `QuestionsPanel` and `PolicyTree` all read it. Deny and Error are never shown alike in any channel
   (INV-QD-006).
2. **Outcome reading:** one headless function in `model/Inspect.ts`, next to `inspectEntry`, turns an outcome and
   a policy into a closed union: a failure, or a tree plus the allow's fields (`undefined` = every field, INV-QD-004),
   plus duties, plus the obligation state. The Inspector and the Simulator only choose their own sentences.
</domain>

<evidence>
## Evidence (verified by reading at 1721a42)
- `packages/devtools/src/react/VerdictTag.tsx:25-30` — Deny is solid `denySolid`, Error is outlined `colors.error`.
  Its doc says collapsing Error into Deny is "the misreading this whole tool exists to prevent".
- `react/QuestionsPanel.tsx:235-240` `stateColour` — `Denied` **and** `Failed` are both `colors.error`.
- `react/PolicyTree.tsx:28-32` `statusColor` — `Denied: colors.error`, the amber `theme.ts:39` reserves for errors.
- `model/Gates.ts:73-79` `GATE_STATES` restates `DecisionOutcome`'s tags separately from the model's `Verdict`.
- Outcome narrowing done twice: `react/Inspector.tsx:33-37` (`allowOf`), `:137-150`, `:203-217` (a three-way
  obligation-state nested ternary), and `react/Simulator.tsx:520-560,585`. `react/DecisionPanels.tsx` shares the
  components but not the decision about which panels exist. The Inspector has no test file of its own.
</evidence>

<decisions>
## Implementation Decisions
- **D-01 (test first):** a RED test that renders a `Denied` and a `Failed` question row and asserts their treatments
  differ (style or a data attribute from the treatment module). A RED model test for the outcome reading is not
  possible before the function exists, so its first test pins today's Inspector behaviour through the dock
  (`qadi-failure`, `qadi-obligation-state`) and must stay green across the move.
- **D-02:** treatment is a total `Record` over a closed union of every displayable state (user preference: a closed
  union written in full). The map from gate render state to that union lives in `model/Gates.ts` beside
  `GATE_STATES`. No `string` keys: `stateColour(state: string)` becomes typed.
- **D-03:** the outcome reading returns a closed union (e.g. `Failure | Answered{tree, fields, duties, obligation}`),
  with the obligation state as its own closed union replacing the nested ternary. Both screens consume it.
  `DecisionPanels.tsx` keeps the separate wording.
- **D-04:** Spec: INV-QD-006 / INV-QD-004 notes; a devtools-spec statement that every panel's colour comes from one
  treatment; gate 12 (`check-devtools-claims.mjs`) stays green. CCR row; changeset (`@qadi/devtools` patch).
- **D-05:** two plans (one per deepening), parallel within the phase if their `files_modified` don't overlap.

### Claude's Discretion
- Whether Pending and Rechecking share a treatment. The `QuestionsPanel` comment argues they should; keep it.
</decisions>

<canonical_refs>
## Canonical References
- `packages/devtools/src/react/VerdictTag.tsx`, `QuestionsPanel.tsx`, `PolicyTree.tsx`, `Inspector.tsx`, `Simulator.tsx`, `DecisionPanels.tsx`, `theme.ts`
- `packages/devtools/src/model/Gates.ts`, `Inspect.ts`, `Verdict*.ts`
- `packages/react/src/DecisionOutcome.ts` (the five outcomes)
- INV-QD-004, INV-QD-006; `spec/devtools-spec/`; ADR-QD-047, ADR-QD-053
</canonical_refs>

<deferred>
## Deferred Ideas
None.
</deferred>

---
*Phase: 19-verdict-presentation · Context gathered: 2026-11-10*
