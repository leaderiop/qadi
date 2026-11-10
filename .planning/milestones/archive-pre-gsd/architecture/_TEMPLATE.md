---
id: ARCH-NN
title: <one line, what gets deepened>
strength: Strong | Worth exploring | Speculative   # from the 2026-10-02 architecture review
status: not-started        # not-started | needs-decision | ready | in-progress | blocked | done | dropped
evidence_verified_at: <git sha the evidence was re-checked against>
depends_on: []             # other ARCH-NN ids
blocks: []
adrs_touched: []           # ADR-QD-NNN read as constraints; mark "amend" if the plan changes one
packages: []
estimate: S | M | L | XL   # S ≤ ½ day, M ≤ 2 days, L ≤ 1 week, XL > 1 week
---

# ARCH-NN — <title>

## 1. Verified evidence (at `<sha>`)

What the review claimed and what HEAD actually shows, with `file:line` refs.
Each claim is tagged **CONFIRMED**, **CHANGED** (still true, details moved),
**REFUTED**, or **UNVERIFIED** (with what would verify it). Suspected claims
from the review are settled here, with the command or test that settled them.

**Name the symbol; the line number is a hint.** Cite `Qadi.ts` — `discharge`, not
`Qadi.ts:66-125`. When sixteen plans edit the same files, a line range is stale
within hours (wave 4: five implementers reported plan line numbers that no longer
held), while a symbol survives a move. Put a line range after the symbol only as
a convenience, and re-check it at T0.

## 2. Goal and success criteria

The goal in one paragraph, using the vocabulary: module, interface, depth,
seam, adapter, leverage, locality. Then numbered, checkable success criteria,
each one observable by a command, a test, or a grep.

## 3. Non-goals

What stays out of scope, and why.

## 4. Constraints

The AGENTS.md sections, ADRs, budgets (`SWITCH_BUDGET`, `UNTRACED_BUDGET`,
`SCHEMA_ERROR_BUDGET`, `ANY_BUDGET`, `HAS_CUSTOM_BUDGET`), merge gates, and the
madge circular-import gate (ADR-QD-037) the change must respect, each with the
specific consequence for this plan.

## 5. Decisions needed before work starts

Each one gets a `D-NN-x` id, the options with tradeoffs, a recommendation, and
`status: open | decided (<date>, <choice>)`. Work that depends on an open
decision is marked as blocked on it in §6.

## 6. Tasks

Ordered. Each task:

### T1 — <imperative title>
- **Status:** [ ] todo
- **Depends on:** — / T0 / D-NN-a
- **Files:** exact paths (new files marked *new*)
- **Steps:** numbered, concrete enough to execute without re-deriving the plan
- **Tests:** what is added or changed, written test-first where it reproduces a defect
- **Verify:** exact commands (e.g. `pnpm vitest run packages/core/test/Predicate.test.ts`)
- **Done when:** the observable condition

## 7. Test strategy

Which tests survive unchanged, which move to the new interface, and which are
deleted as redundant (replace, don't layer). Name the property, differential,
and mutation (Stryker) coverage involved.

## 8. Spec and documentation updates

`spec/` is normative (AGENTS.md §11): behavior docs, invariants, the
traceability matrix, CCR entries, ADR amendments, `spec/overview.md` export
tables (gate 13), and CHANGELOG/changeset. Use `CCR-QD-NEXT` / `ADR-QD-NEXT`
as placeholders. Numbers are assigned when the work lands, so parallel plans
don't collide.

## 9. Risks and rollback

What could break, how it shows up, and how to back out.

## 10. Progress log

| Date | Task | Change | By |
| ---- | ---- | ------ | -- |
