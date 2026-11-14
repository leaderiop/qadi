---
phase: QD-42-a-seeded-question-builds-its-own-computing-atom
plan: 03
subsystem: react-hydration
tags: [seeded-question, module-extraction, decision-read-budget, trap-proof, real-atom-runtime]
phase_base: 7e5dafdbf1cc266310586b1a3c5064346e0b8360
plan_head_before: 9b6c4123df4f121efa4fa143ac25c02fc7ace5a5
plan_head_after: f4320fdc440bdeb2f9fbbc84bff9db297222c07f
requires: [42-01, 42-02]
provides:
  - packages/react/src/SeededQuestion.ts (isMismatch, SeedSlot, SeedGrant, AnnounceState, DECISIONS_KEY, SeededQuestion, makeSeededQuestion), package-private, out of the barrel, no "use client"
  - HydrationEngine.ts reduced to the payload codec (imports type SeedSlot, keeps HydrationSeedLookup)
  - QadiAtoms.ts building each question with one makeSeededQuestion call over its own runtime, subject atom, report and the book's live
  - DECISION_READ_BUDGET and DECISION_READ_BUDGET_NAMES keyed on SeededQuestion.ts (count 2, name makeSeededQuestion), with the AGENTS.md section 13 sentence
  - packages/react/test/SeededQuestion.test.ts (nine cases through Atom.runtime(EvaluationServicesNone))
affects: [42-04, 42-05]
actuals:
  tokens: 12000
  tasks: 3
  commits: 3
tech-stack:
  added: []
  patterns: [a module owns the whole seed-to-evaluation link, liveness rule stated once at BookOptions.build with a one-line pointer, fakes replaced by a real atom runtime]
key-files:
  created:
    - packages/react/src/SeededQuestion.ts
    - packages/react/test/SeededQuestion.test.ts
  modified:
    - packages/react/src/HydrationEngine.ts
    - packages/react/src/QadiAtoms.ts
    - packages/react/test/HydrationEngine.test.ts
    - scripts/check-house-style.mjs
    - AGENTS.md
key-decisions:
  - "AnnounceState reshape (WeakSet) not taken: the { announced: false } survivor is equivalent (an absent announced reads as falsy) and the move stays a move so 42-05 compares survivors mutator for mutator"
  - "QadiRuntimeServices stays in QadiAtoms.ts; only DECISIONS_KEY moved down into SeededQuestion.ts (importing it back up would be a madge cycle, ADR-QD-037)"
requirements-completed: [SEED-03, SEED-04, WX-04]
duration: 3 min
completed: 2026-11-14
status: complete
commits: 3
---

# Phase 42 Plan 03: The Seeded Question Builds Its Own Computing Atom Summary

`makeSeededQuestion({ policy, resource, runtime, subject, report, live })` now lives in its own `SeededQuestion.ts` and builds its own computing atom, so no input is a function that receives a function; `HydrationEngine.ts` is the payload codec only, `QadiAtoms.ts` builds each question with one call, and the decision-read budget and its AGENTS.md sentence moved with the code.

## Performance

- **Duration:** 3 min
- **Started:** 2026-11-14T18:27:56Z
- **Completed:** 2026-11-14T18:31:10Z
- **Tasks:** 3
- **Files modified:** 7 (2 created, 5 modified)

## Accomplishments

- `SeededQuestion.ts` (251 lines) holds the seven moved names. The computing atom reads the seed with `seededIn(get.registry)` and is piped through `runtime.factory.withReactivity([DECISIONS_KEY])`; the one `Atom.readable` opens with `get.addFinalizer(live())`; one `WeakMap<SeedGrant, SeededDecision>`. The liveness rule is stated only at `BookOptions.build` in `QuestionBook.ts`, and `makeSeededQuestion`'s doc points there in one sentence.
- `HydrationEngine.ts` went from 779 to 587 lines: header now opens `The hydration payload codec, in both directions.`, names none of the moved symbols in code, keeps `HydrationSeedLookup`.
- `QadiAtoms.ts` went from 398 to 352 lines: `seededDecision` and the local `DECISIONS_KEY` are gone; the book is `makeQuestionBook<SeededQuestion>` with one `makeSeededQuestion({ ... })` call handing the atom set's own post-pipe `subject` atom.
- `SeededQuestion.test.ts` holds the nine cases on a real runtime and a real kept-alive subject atom, each registry disposed in an `afterEach`.
- The react project: 510 tests pass (the seven seam cases and two closing cases from 42-02 unchanged); `pnpm typecheck`, `pnpm circular`, `pnpm lint` (oxlint plus house style) are green.

## Task Commits

1. **Task 1 (tracer): a seeded question builds its own computing atom in SeededQuestion.ts** - `c65199e1` (refactor)
2. **Task 2: the decision-read budget follows the seed precedence to SeededQuestion.ts** - `3eeddb68` (chore)
3. **Task 3: the seeded question's cases on a real atom runtime** - `f4320fdc` (test)

Each ends with `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.

## Files Created/Modified

- `packages/react/src/SeededQuestion.ts` - new: slot, grant, announce state, computing atom, reader
- `packages/react/src/HydrationEngine.ts` - moved code removed, `import type { SeedSlot }` added, header and `hydrateWith` link reworded
- `packages/react/src/QadiAtoms.ts` - one-call book build, unused `@qadi/core` imports dropped, closure comment names SeededQuestion.ts
- `packages/react/test/HydrationEngine.test.ts` - the six fake computing-atom cases, their fixtures and unused imports removed
- `packages/react/test/SeededQuestion.test.ts` - new: describes `makeSeededQuestion, through a real atom runtime` (6) and `a seed slot gives each registry its own grant` (3)
- `scripts/check-house-style.mjs` - exactly the two budget keys moved
- `AGENTS.md` - exactly the one section 13 line

## Verify results

| Verify | Exit |
| ------ | ---- |
| Task 1 shape check (source files changed, declarations, inputs, counts, liveness rule once, doc wording) | 0 |
| Task 1 `pnpm typecheck && pnpm circular && pnpm exec oxlint` | 0 |
| Task 1 react-suite check (all cases pass, seam describe 7, two closing cases, six removed, no pinned file changed) | 0 |
| Task 2 `pnpm lint` | 0 |
| Task 2 exactly-two-keys and exactly-one-line diff check | 0 |
| Task 3 nine titles in order, all passing, real runtime, no fake atom, disposal | 0 |
| Task 3 trap proof (below) | 0 |
| Task 3 order, shapes and trailer of the seven commits since `phase_base` | 0 |

## Trap proof (moved code)

The second Task 3 verify replaced the computing atom's `seededIn(get.registry)` (the one between `.atom(` and `withReactivity([DECISIONS_KEY])`, not the reader's two) with a read of the grant through `get(grantAtom)`, ran `SeededQuestion.test.ts` and `QadiAtoms.test.ts`, and restored the source in a `finally`. Exactly the four trap cases failed (two per file), every other case passed:

```
RED QadiAtoms.test.ts > a seed given after the first read does not re-run the computation: AssertionError: expected Allow{ evaluationId: 'seed-1', …(6) } to be Allow{ …(7) } // Object.is equality
RED QadiAtoms.test.ts > an unhydrated question leaves no grant node, after a computation has run: AssertionError: expected true to be false // Object.is equality
RED SeededQuestion.test.ts > a seed given after the first read does not re-run the computation: AssertionError: expected Allow{ evaluationId: 'e1', …(6) } to equal Allow{ …(7) }
RED SeededQuestion.test.ts > an unhydrated question leaves no grant node, after a computation has run: AssertionError: expected true to be false
```

The edit was temporary and never committed; the verify's `git diff --quiet -- packages/react/src` held afterwards and holds at HEAD.

## Decisions Made

- The `AnnounceState` WeakSet reshape was not taken. The `{ announced: false }` survivor is equivalent (an absent `announced` reads as falsy), and the move stays a move so 42-05 can compare the five carried survivors mutator for mutator.
- `QadiRuntimeServices` stays in `QadiAtoms.ts`; only `DECISIONS_KEY` moved (down into `SeededQuestion.ts`).

## Deviations from Plan

**1. [Trailer] Commits name the executing model**
- As in 42-01 and 42-02, the trailer is `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`, which the plan's trailer check accepts.

**2. [Note] D-05 says four fake computedFor cases; the plan removes six**
- `HydrationEngine.test.ts` held six cases on a fake computing atom: three in describe `makeSeededQuestion`, each with its own `computedFor`, and three in `a seed slot gives each registry its own grant`, which share one helper holding a fourth `computedFor`. D-05 counts those four `computedFor` sites; the cases are six. All six were removed and all six return in `SeededQuestion.test.ts`; the verify names their titles.

**3. [Plan-verify defect] Subject-prefix commit count: not triggered**
- The known defect from 42-02 (a check counting commits by subject prefix also counts the plan's own SUMMARY and state commits) did not fire here: Task 1's precondition counts only `^test(42-02):` (exactly 2) and the order check filters out `.planning/` commits. The guarded facts were also checked directly before editing: `git diff --quiet <phase_base> -- packages/*/src/* scripts AGENTS.md` and `git status --porcelain -- packages scripts AGENTS.md` were clean, and no `(42-03`..`(42-09` commit existed. Nothing edited.

**Total deviations:** 3 (documentation only). **Impact:** none.

## TDD Gate Compliance

Plan type is `execute` (Task 3 carries `tdd="true"`): the cases are characterisation of moved code, already green on the base through the atom set in 42-02. Their RED evidence is the trap proof above on the moved code; the GREEN commit is Task 1's move.

## Known Stubs

None.

## Threat Flags

None. T-42-05 to T-42-08 are mitigated as planned: no `get(grantAtom)` in `packages/react/src`, one `WeakMap<SeedGrant`, the barrel does not name SeededQuestion, `get.addFinalizer(live())` is the reader's first statement, and the budget differs by exactly the two key lines.

## Self-Check: PASSED

- `SeededQuestion.ts`, `SeededQuestion.test.ts` exist; `c65199e1`, `3eeddb68`, `f4320fdc` are ancestors of HEAD; `git diff --quiet -- packages/react/src` holds; `git status --porcelain` shows only the intentionally uncommitted `.planning/config.json`, `.planning/state.json`, `.agents/`, `.codex/`.
