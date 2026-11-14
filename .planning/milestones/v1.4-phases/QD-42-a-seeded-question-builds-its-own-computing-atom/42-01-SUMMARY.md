---
phase: QD-42-a-seeded-question-builds-its-own-computing-atom
plan: 01
subsystem: react-hydration
tags: [mutation-baseline, adr, spec-records, seeded-question, human-decision]
phase_base: 7e5dafdbf1cc266310586b1a3c5064346e0b8360
plan_head_before: 7e5dafdbf1cc266310586b1a3c5064346e0b8360
plan_head_after: 980a94ba1d0f8d49f3e48384ff0a12584a170c37
requires: []
provides:
  - 42-mutation-base.json (HydrationEngine.ts and QadiAtoms.ts measured at the phase base; SeededQuestion.ts recorded as moved, with its five base survivors)
  - ADR-QD-155 (a seeded question owns its computing atom, in its own module), with its index.yaml entry, its traceability row and the begun CCR-QD-433 row
  - the per-option evidence table and the user's choice of option 1b, recorded before any packages/*/src edit
affects: [42-02, 42-03, 42-04, 42-05]
actuals:
  tokens: 5800
  tasks: 2
  commits: 2
tech-stack:
  added: []
  patterns: [baseline committed alone on the untouched base, decision recorded before code, moved module judged by its carried survivors]
key-files:
  created:
    - .planning/phases/QD-42-a-seeded-question-builds-its-own-computing-atom/42-mutation-base.json
    - spec/decisions/155-a-seeded-question-owns-its-computing-atom.md
  modified:
    - spec/decisions/index.yaml
    - spec/traceability.md
    - spec/README.md
key-decisions:
  - "Option 1b: a seeded question builds its own computing atom in packages/react/src/SeededQuestion.ts, makeSeededQuestion({ policy, resource, runtime, subject, report, live }); chosen by the user on 2026-11-14 through one AskUserQuestion after the spike evidence; 1a, 2 and 3 are not implemented, and SEED-05 (reject) is not taken"
  - "ADR-QD-155 is used (the inversion creates a module boundary and moves the live() call site); it amends ADR-QD-149 and ADR-QD-140 by dated amendment, and ADR-QD-103 and ADR-QD-148 stay true as written"
  - "SeededQuestion.ts is judged by the five base survivors that move with its code and is never re-baselined; the WeakSet reshape of AnnounceState is not taken (unmeasured)"
requirements-completed: [SEED-01, SEED-02, SEED-05, WX-02, WX-05, WX-06]
duration: 4 min
completed: 2026-11-14
status: complete
commits: 2
---

# Phase 42 Plan 01: Baseline, Evidence and ADR-QD-155 Summary

Mutation baseline of the two files the inversion edits (`HydrationEngine.ts` 0.9784, `QadiAtoms.ts` 0.8966) with `SeededQuestion.ts` recorded as moved and its five survivors named, committed alone as the phase's first commit; then the per-option evidence, the user's choice of option 1b, and ADR-QD-155, all before any `packages/*/src` change.

## Reserved numbers

ARCH-89, ADR-QD-155, CCR-QD-433, BEH-QD-546 to 550 and INV-QD-329 to 330 were each free at `phase_base` (`git grep -E "<id>([^0-9]|$)"` over spec, packages, .changeset, AGENTS.md, CONTRIBUTING.md, features, apps/website/src, examples and scripts printed nothing; no `spec/decisions/155-*` file). `node scripts/next-id.mjs` was never run. This plan uses ARCH-89, ADR-QD-155 and CCR-QD-433; the CCR-QD-433 row names only those, and 42-04 completes it.

## Mutation base

One Stryker run on the untouched base, in the background, exit 0 above the break threshold (final score 96.19, 1 minute 15 seconds). The exact string the close repeats:

`pnpm exec stryker run stryker.react.mjs --mutate 'packages/react/src/QadiAtoms.ts,packages/react/src/HydrationEngine.ts,packages/react/src/SeededQuestion.ts'`

The `SeededQuestion.ts` glob only warned ("did not result in any files"); 2 of 5088 files were mutated, 310 mutants. Printed by the writer (run verbatim, rc 0):

- `packages/react/src/HydrationEngine.ts 0.9783549783549783 (226/231) ignored 19`
  - survivors 488:93 ArrayDeclaration (the codec, stays), 716:12 ConditionalExpression (moves), 628:19 StringLiteral (moves), 716:12 LogicalOperator (moves), 724:36 ObjectLiteral (moves)
- `packages/react/src/QadiAtoms.ts 0.896551724137931 (52/58) ignored 2`
  - survivors 234:3 ConditionalExpression, 234:15 LogicalOperator, 234:15 ConditionalExpression (twice), 234:34 ConditionalExpression (all in `subjectsEqual`, stay), 291:19 ConditionalExpression (moves)
- moved region: 62/67 = 0.9253731343283582
- `{"measured":{"packages/react/src/HydrationEngine.ts":0.9783549783549783,"packages/react/src/QadiAtoms.ts":0.896551724137931},"unmeasured":{},"new":[],"deleted":{},"moved":{"packages/react/src/SeededQuestion.ts":{"from":[HydrationEngine.ts,QadiAtoms.ts],"region":{"detected":62,"scored":67,"score":0.9253731343283582},"survivors":[five, listed below]}}}`

The five moved survivors (mutator, original source text): `StringLiteral "SeedGrant"` (HydrationEngine.ts:628:19); `ConditionalExpression` and `LogicalOperator` on `Option.isSome(held) && held.value instanceof SeedGrant` (716:12); `ObjectLiteral { announced: false }` (724:36); `ConditionalExpression resource === undefined` (QadiAtoms.ts:291:19). These match the planning-time measurements exactly. The close recognises each by mutator and original text in `SeededQuestion.ts`; the baseline is never re-taken.

## Decision evidence

Copied verbatim from `42-RESEARCH.md` (`### Per-option evidence (SEED-01)`). Source: research commit `2ec342d9`, built and measured in throwaway worktrees from `c0aa00fe` (spike runs); option 3 was not spiked (prose only).

| | 1a invert in place | 1b invert into `SeededQuestion.ts` | 2 seed holder first | 3 reject |
|---|---|---|---|---|
| Spiked | yes | yes (1a + extraction) | yes | prose only (not spiked) |
| src lines (`git diff --numstat`, add/del) | HydrationEngine +50/-18, QadiAtoms +13/-57 | HydrationEngine +7/-198, QadiAtoms +14/-60, **SeededQuestion.ts +247 (new)**, check-house-style +2/-2 | HydrationEngine +47/-32, QadiAtoms +8/-17 | 0 code; comments only (see Open Q 1) |
| src total lines (base 1177 = 779 + 398) | 1165 (-12) | 1187 (+10; HE 588, QA 352, SQ 247) | 1183 (+6) | 1177 |
| test lines | HydrationEngine.test +108/-75, QadiAtoms.test +12 | HydrationEngine.test +17/-139, **SeededQuestion.test.ts +162 (new)**, QadiAtoms.test +12 | HydrationEngine.test +29/-14 | 0 |
| Exports that move | `DECISIONS_KEY` QadiAtoms → HydrationEngine (package-private). `SeededQuestion<E>` loses `<E>` (fixed to `EvaluationError`). `QadiRuntimeServices` **does not move** | `DECISIONS_KEY`, `SeededQuestion`, `makeSeededQuestion`, `SeedSlot`, `SeedGrant`, `isMismatch` → `SeededQuestion.ts`. `HydrationSeedLookup` stays (imports `type SeedSlot`) | new `SeedHolder`, `makeSeedHolder` in HydrationEngine | none |
| Fake `computedFor` removed | all 4 (HydrationEngine.test.ts:57, 77, 101, 128) → real runtime | all 4 → real runtime, moved to `SeededQuestion.test.ts` | callback gone, but the 4 cases still pass a **fake `computed` atom** (`Atom.readable`) | none (fake stays) |
| `makeSeededQuestion` takes a function that receives a function | no (`live: () => () => void` receives nothing) | no | no | yes (`computedFor(seededIn)`, `track(get)`) |
| Seed-to-evaluation link in one module | yes (HydrationEngine) | yes (SeededQuestion) | **no**: the computing atom stays in QadiAtoms | no |
| typecheck / lint / circular | 0 / 0 / 0 | 0 / 0 (after the budget key move) / 0 | 0 / 0 / 0 | n/a |
| react suite (base 32 files, 498 tests) | 32 / 503, 0 fail | 33 / 503, 0 fail | 32 / 499, 0 fail | n/a |
| Render-sequence diff | none (no pinned test file edited, all pass) | none | none | none |
| `pnpm example` (30 e2e) | not run (same code as 1b) | **30 passed** | not run | n/a |
| `pnpm check:pr` | not run | **exit 0**, 110 s | not run | n/a |
| Mutation, no new tests (base HE 0.9784 226/231, QA 0.8966 52/58) | HE 0.9755 (239/245) ↓, QA 0.8750 (35/40) ↓ | not measured without tests | HE 0.9784 (227/232) =, QA 0.8909 (49/55) ↓ | unchanged |
| Mutation, + 2 closing tests | **HE 0.9796 (240/245), QA 0.9000 (36/40)**, both ≥ base | **HE 1.0000 (183/183), QA 0.9000 (36/40), SQ 0.9194 (57/62) new** | QA closable by the same subject test (shown in 1a) | n/a |
| Records cost | INV-028/105/317/318 Source+Enforcement, traceability rows, QuestionBook header comment | 1a's + DECISION_READ_BUDGET/_NAMES keys, AGENTS.md §13 sentence, ADR-149 dated amendment, BEH-517/518 Source lines | INV-105 Source (`track` gone); ADR-149 still true | ADR-QD-155, CCR row naming the unused numbers |

## Decision

Option **1b**, invert into its own module (`packages/react/src/SeededQuestion.ts`). The user chose it on 2026-11-14 through one AskUserQuestion that offered 1a, 1b, 2 and 3 after the evidence above was gathered. Options 1a, 2 and 3 are not implemented. SEED-05 (reject) is not taken: the decision is a go, so there is no rejection ADR and no "no source change" outcome, and the phase changes source. ADR-QD-155 is used (it records the inversion, not a rejection). The WeakSet reshape of `AnnounceState` is not taken: it is unmeasured (RESEARCH A1), and the moved-survivor gate judges the new module without it.

## ADR-QD-155

`spec/decisions/155-a-seeded-question-owns-its-computing-atom.md`, Revision 1.0 (2026-11-14), status `Accepted — amends ADR-QD-149, ADR-QD-140`. `spec/traceability.md` Rev 1.176 (§3 row directly after ADR-QD-154, citing INV-QD-028, INV-QD-105, INV-QD-317, INV-QD-318), `spec/README.md` Rev 1.181 (CCR-QD-433 row directly after CCR-QD-432). `node scripts/spec-revise.mjs --check` and `pnpm spec:verify:strict` (21 PASS, 0 FAIL) are green.

## Commits

- `17500850` chore(42-01): mutation baseline for the seeded question's move (the JSON alone, parent is `phase_base`)
- `980a94ba` docs(42-01): ADR-QD-155, a seeded question owns its computing atom (four spec files)

## Deviations from Plan

**1. [Trailer] Commit trailer names the executing model**
- The plan's example trailer names Opus 5.5; the plan says an executor on another model writes its own model's name, and the session attribution names Claude Sonnet 5.5. Both commits end with `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`, which the plan's trailer check accepts.

**Total deviations:** 1 (documentation only). **Impact:** none.

## Known Stubs

None.

## Threat Flags

None.

## Self-Check: PASSED

- 42-mutation-base.json, the ADR file, index.yaml, traceability.md and README.md exist; both commits are ancestors of HEAD; `git status --porcelain -- packages scripts .changeset AGENTS.md` is empty; Task 1's baseline-shape verify and Task 2's ADR/SUMMARY content verifies and order/trailer verify all pass; `spec-revise --check` and `spec:verify:strict` exit 0.
