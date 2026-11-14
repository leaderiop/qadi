---
phase: QD-42-a-seeded-question-builds-its-own-computing-atom
plan: 02
subsystem: react-hydration
tags: [characterisation-tests, trap-proof, mutation-closing, seeded-question, tdd]
phase_base: 7e5dafdbf1cc266310586b1a3c5064346e0b8360
plan_head_before: 4591f327b0385a668d499a0b8c7e56a0bca28841
plan_head_after: daa06ff36f51542fb177e5b0bfbd8dc58eae0095
requires: [42-01]
provides:
  - describe `a seeded question, through the atom set's own runtime` in QadiAtoms.test.ts (7 cases, green on the base, built only through makeQadiAtoms)
  - the two trap tests, proven red under the get(grantAtom) trap and restored
  - two mutation-closing tests (subject-write equality, non-envelope payload)
affects: [42-03, 42-04, 42-05]
actuals:
  tokens: 4300
  tasks: 2
  commits: 2
tech-stack:
  added: []
  patterns: [characterisation through the real atom runtime, trap proof by temporary two-line source edit restored in a finally]
key-files:
  created: []
  modified:
    - packages/react/test/QadiAtoms.test.ts
    - packages/react/test/HydrationEngine.test.ts
key-decisions:
  - "The seam tests name no makeSeededQuestion and no fake computing atom, so 42-03 moves the code under them unchanged"
  - "The non-envelope case asserts the drop reason too: MalformedPayload, entries [], wholePayload true"
requirements-completed: [SEED-03, SEED-04, WX-05, WX-06]
duration: 2 min
completed: 2026-11-14
status: complete
commits: 2
---

# Phase 42 Plan 02: Seam Tests, Trap Proof and Mutation-Closing Tests Summary

The seed-to-evaluation link is pinned through the atom set's own runtime on the untouched base (seven cases, all green), the two trap tests are proven to go red under a `get(grantAtom)` read of the seed, and two cases close the mutants the move will leave behind; no `packages/*/src` file changed.

## The seven cases (describe `a seeded question, through the atom set's own runtime`)

All pass on the base; the file holds 34 cases, all passing (27 before this plan).

1. reads the seed while the subject is unknown, and drops it once the client answers
2. announces a disagreement once per registry, not once per question (two reports for two registries, one of them read twice)
3. carries the seed's evaluation id into the client's own evaluation (BEH-QD-186)
4. gives each registry the decision of the grant it was given (`seed-1` allow in one, `seed-2` deny in the other)
5. a registry given no grant reads none, and holds no grant node for it
6. a seed given after the first read does not re-run the computation (trap test; asserts `toBe` on the answer object)
7. an unhydrated question leaves no grant node, after a computation has run (trap test)

Each builds through `makeQadiAtoms(baseLayer)`, seeds only through `atoms.hydrate(dehydrateDecisions(...), admin)`, and disposes its registries through the file's `registries` list. Cases 5 and 7 assert the hydrate pairs hold exactly one grant before reading the grant atom, so a missing grant cannot make the node check vacuous.

## Trap proof (base)

The second verify replaced `const computed = input.computedFor(seededIn);` (HydrationEngine.ts) with a read of the seed through `get(grantAtom)`, and `const seeded = seededIn(get.registry);` (QadiAtoms.ts) with `seededIn(get)`, ran `QadiAtoms.test.ts`, and restored both files in a `finally`. Exactly the two trap cases failed, every other case passed:

```
RED a seed given after the first read does not re-run the computation: AssertionError: expected Allow{ evaluationId: 'seed-1', …(6) } to be Allow{ …(7) } // Object.is equality
RED an unhydrated question leaves no grant node, after a computation has run: AssertionError: expected true to be false // Object.is equality
```

The edit was temporary and never committed; the verify's `git diff --quiet -- packages/react/src` held afterwards, and it holds at HEAD.

## The two closing tests

- `counts a subject write as a change exactly when who is asking changed, undefined included` in describe `makeQadiAtoms`, directly before the RC-01 case: subscribed to `atoms.subject`, the writes `undefined`, `reader`, a fresh equal `reader`, `undefined` notify exactly `[reader, undefined]` (kills the `a === b` mutants of `subjectsEqual`).
- `a value that is not an envelope is refused whole and hands back no entries` in describe `a refused payload is always counted (INV-QD-045, ARCH-60)`, before its first case: `hydrateWith` over `42` returns no pairs and one drop `{ reason: "MalformedPayload", entries: [], wholePayload: true }` (kills the entries-fallback survivor at `HydrationEngine.ts:488`).

Both pass on the base. Their mutant-killing effect is measured by the 42-05 close, not here.

## Commits

- `6460c15e` test(42-02): a seeded question through the atom set's own runtime, with the two trap tests (QadiAtoms.test.ts only)
- `daa06ff3` test(42-02): two cases that close the mutants the move leaves behind (QadiAtoms.test.ts, HydrationEngine.test.ts)

Both end with `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`. Plan verifies: Task 1 verify 1 and verify 2 (trap) rc 0, Task 2 verify 1 and verify 2 (order, trailer, no removed line, nothing else under packages) rc 0. `tsc -p tsconfig.test.json`, `oxlint` on the touched files (only pre-existing warnings in `v4-reactivity-smoke.test.ts`) and `node scripts/check-house-style.mjs` are clean.

## Deviations from Plan

**1. [Plan-verify defect] Task 1 precondition count**
- The precondition requires `git log --grep="^docs(42-01):"` to count exactly 1; it counts 3, because 42-01's own SUMMARY and state commits (`82d0c067`, `4591f327`) also start with `docs(42-01):`. The facts the precondition guards were checked directly and hold: no `(42-02`..`(42-09` commit existed and `git diff --quiet <phase_base> -- packages` was clean. Nothing edited.

**2. [Trailer] Commits name the executing model**
- As in 42-01, the trailer is `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`, which the plan's trailer check accepts.

**Total deviations:** 2 (one plan-verify defect, one documentation). **Impact:** none.

## TDD Gate Compliance

Characterisation on the base (D-05): no RED-then-GREEN source change exists in this plan, by design. The RED evidence is the trap proof above; the GREEN commit is 42-03's move, which these tests must survive unchanged.

## Known Stubs

None.

## Threat Flags

None.

## Self-Check: PASSED

- `QadiAtoms.test.ts` and `HydrationEngine.test.ts` exist and carry the new cases; `6460c15e` and `daa06ff3` are ancestors of HEAD; `git diff --quiet -- packages/react/src` holds; `git status --porcelain` shows only the intentionally uncommitted `.planning/config.json`, `.planning/state.json`, `.agents/`, `.codex/`.
