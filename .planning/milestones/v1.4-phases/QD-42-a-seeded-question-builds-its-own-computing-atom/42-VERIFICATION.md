---
phase: QD-42-a-seeded-question-builds-its-own-computing-atom
verified: 2026-11-14T19:20:00Z
status: passed
score: 7/7 must-haves verified
covered_files:
  - ".changeset/react-seeded-question-owns-its-computing-atom.md"
  - ".planning/phases/QD-42-a-seeded-question-builds-its-own-computing-atom/42-01-PLAN.md"
  - ".planning/phases/QD-42-a-seeded-question-builds-its-own-computing-atom/42-01-SUMMARY.md"
  - ".planning/phases/QD-42-a-seeded-question-builds-its-own-computing-atom/42-02-PLAN.md"
  - ".planning/phases/QD-42-a-seeded-question-builds-its-own-computing-atom/42-02-SUMMARY.md"
  - ".planning/phases/QD-42-a-seeded-question-builds-its-own-computing-atom/42-03-PLAN.md"
  - ".planning/phases/QD-42-a-seeded-question-builds-its-own-computing-atom/42-03-SUMMARY.md"
  - ".planning/phases/QD-42-a-seeded-question-builds-its-own-computing-atom/42-04-PLAN.md"
  - ".planning/phases/QD-42-a-seeded-question-builds-its-own-computing-atom/42-04-SUMMARY.md"
  - ".planning/phases/QD-42-a-seeded-question-builds-its-own-computing-atom/42-05-PLAN.md"
  - ".planning/phases/QD-42-a-seeded-question-builds-its-own-computing-atom/42-05-SUMMARY.md"
  - "AGENTS.md"
  - "packages/react/src/HydrationEngine.ts"
  - "packages/react/src/QadiAtoms.ts"
  - "packages/react/src/QuestionBook.ts"
  - "packages/react/src/SeededQuestion.ts"
  - "packages/react/test/HydrationEngine.test.ts"
  - "packages/react/test/QadiAtoms.test.ts"
  - "packages/react/test/SeededQuestion.test.ts"
  - "scripts/check-house-style.mjs"
  - "spec/decisions/155-a-seeded-question-owns-its-computing-atom.md"
covered_digest: "v4:sha256:8eb3320533119a4c5619466ad6551e9ea892fd8a4216ebfda8f4f69231e6dd00"
behavior_unverified: 0
overrides_applied: 0
---

# Phase 42: A seeded question builds its own computing atom - Verification Report

**Phase Goal:** The seed-to-evaluation link is owned by one module and tested through a real atom runtime (no callback that receives a callback); anything Phases 37-41 left stale is corrected and the milestone is re-verified at its final head. By the user's choice of option 1b the module is `packages/react/src/SeededQuestion.ts` (`makeSeededQuestion`).
**Verified:** 2026-11-14
**Status:** passed
**Re-verification:** No, initial verification

## Goal Achievement

### Observable Truths (ROADMAP success criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | The first plan records spike evidence per option and the human's decision before any source change (SC1) | VERIFIED | `17500850` (mutation base alone, one file) then `980a94ba` (ADR-QD-155 with options and the choice 1b) precede every `packages/*/src` edit. The first src commit is `c65199e1` (`refactor(42-03)`). D-01 in 42-CONTEXT.md records the AskUserQuestion answer. |
| 2 | On a go, `makeSeededQuestion` takes no function that receives a function (SC2a) | VERIFIED | `SeededQuestion.ts` `makeSeededQuestion` takes `{ policy, resource, runtime, subject, report, live }`. `live: () => () => void` returns a function and receives none. `grep computedFor` over `packages`, `spec`, `AGENTS.md`, `website` hits only ADR-QD-155, the decision text. `QadiAtoms.ts` builds a question with one `makeSeededQuestion({...})` call, and `seededDecision` and the local `DECISIONS_KEY` are gone. |
| 3 | The seed-to-evaluation link is tested through a real atom runtime with no fake `computedFor` (SC2b) | VERIFIED | `SeededQuestion.test.ts` uses `Atom.runtime(EvaluationServicesNone)` (line 24) and the real subject atom. `QadiAtoms.test.ts` gained 150 added lines of seam tests through `makeQadiAtoms`. `HydrationEngine.test.ts` lost 156 lines, the fake-callback cases. All 510 react tests pass (`vitest run --project react`, 33 files). |
| 4 | The two trap tests are real: they go red under the `get(grantAtom)` trap | VERIFIED | I replaced `seededIn(get.registry)` with a `get(grantAtom)` read in the computing atom. "a seed given after the first read does not re-run the computation" and "an unhydrated question leaves no grant node, after a computation has run" both failed, in `SeededQuestion.test.ts` and in `QadiAtoms.test.ts`. I restored the file from a backup, and `git status` shows no `packages` change. |
| 5 | The liveness rule is stated once, with pointers elsewhere (SC2c) | VERIFIED | The rule's prose is at `QuestionBook.ts` (header and `BookOptions.build`). `SeededQuestion.ts` has only a doc pointer ("stated once at `BookOptions.build`") and the single `get.addFinalizer(live())` as the reader's first statement. |
| 6 | Every existing pin holds untouched (SC3) | VERIFIED | `git diff 7e5dafdb HEAD` over `packages/*/test`, `features/`, `examples/` and `packages/*/package.json` touches only `HydrationEngine.test.ts` (fakes removed), `QadiAtoms.test.ts` (added only) and the new `SeededQuestion.test.ts`. So `QadiProvider.test.tsx`, the SD/HL suites, the lifetime/sweep/eviction suites and the e2e specs are byte-identical. `checkpr42.log`: coverage run 209 files and 5139 tests pass, and `pnpm example` shows `30 passed`. `grep scheduleTask\|defaultIdleTTL` over the added lines finds nothing. |
| 7 | A final sweep corrects anything Phases 37-41 left stale, and the milestone is re-verified at its final head with a mutation re-check of every touched file (SC4) | VERIFIED | `42-milestone-mutation.json` has 15 files, each at or above its recorded score. The stale-name grep (`asDecodeRefusal`, `recordJsonOf`, `MEANINGS`, `reasonOf`, `MalformedReason`) finds hits only in CCR history rows and the changeset that records their removal. Overview rows for `HydrationMismatch` and `InitialValues` still name `HydrationEngine.ts`, which still declares or re-exports them. Nothing is released: the `@qadi/*@0.12.0` tags point at the milestone base `637c0601` itself (0 commits between), with no version or CHANGELOG diff. |

**Score:** 7/7 truths verified (0 behavior-unverified).

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `packages/react/src/SeededQuestion.ts` | Owns `DECISIONS_KEY`, `SeededQuestion`, `makeSeededQuestion`, `SeedSlot`, `SeedGrant`, `isMismatch` (package-private), the computing atom, the announce state and the read atom | VERIFIED | 251 lines, substantive. The `seeds` `WeakMap<SeedGrant, ...>` is the only seed holder. It has one `Atom.readable` and one `runtime.atom`, no `"use client"`, and does not import `HydrationEngine`, `QadiAtoms` or `QadiProvider`. |
| `packages/react/src/HydrationEngine.ts` | Pure codec, `import type { SeedSlot }` only | VERIFIED | 218 lines removed, and its own mutation score is 183/183. |
| `packages/react/src/QadiAtoms.ts` | One `makeSeededQuestion` call per book entry | VERIFIED | Passes the `subject` const, the final kept-alive atom, and the book's `live`. |
| `scripts/check-house-style.mjs` and `AGENTS.md` | Budget keys and §13 move together | VERIFIED | The diff is exactly the two `DECISION_READ_BUDGET` keys (count 2 kept) and `_NAMES` (`makeSeededQuestion`), plus one AGENTS.md line. |
| ADR-QD-155, ADR-QD-149 and ADR-QD-140 amendments, CCR-QD-433, `.changeset/react-seeded-question-owns-its-computing-atom.md` (`@qadi/react` patch) | Records | VERIFIED | The ADR exists. The CCR-QD-433 row is at `spec/README.md:370`. The changeset is present. INV-QD-028/105/317/318 Source and Enforcement name `SeededQuestion.ts` (`spec/invariants.md` 1081, 3233, 3737, 3751). The BEH-QD-151 source line is at `19-hydration.md:380`. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `QadiAtoms.ts` build | `makeSeededQuestion` | direct call with `runtime`, `subject`, `report`, `live` | WIRED | `QadiAtoms.ts:276`. |
| computing atom | grant | `seededIn(get.registry)` through `registry.getNodes()`, not `get(grantAtom)` | WIRED | Proven by the trap tests going red when it is swapped. |
| read atom | `QuestionBook.live` | `get.addFinalizer(live())` first | WIRED | `SeededQuestion.ts:202`. |
| `HydrationEngine.hydrate` | question seed slot | `SeedSlot.hold` returning `[grantAtom, grant]` | WIRED | Covered by the SD and HL suites, which pass untouched. |

### Data-Flow Trace (Level 4)

| Artifact | Data | Source | Real data | Status |
|----------|------|--------|-----------|--------|
| `read` | `ClientDecision` | `get(computed)`, the runtime evaluating the policy with `CurrentSubject` | Yes | FLOWING |
| `computed` | seed's `evaluationId` | grant node, `seeds` WeakMap | Yes, test "carries the seed's evaluation id into the client's own evaluation (BEH-QD-186)" | FLOWING |

### Behavioral Spot-Checks and Mutation

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| React suite | `npx vitest run --project react` | 33 files, 510 tests passed | PASS |
| Trap tests turn red under `get(grantAtom)` | temporary swap, then restore | 2 tests failed in each of 2 files | PASS |
| Moved module mutation | `npx stryker run stryker.react.mjs --mutate packages/react/src/SeededQuestion.ts` (my run) | 57 killed, 5 survived, 91.94%, survivor at `SeededQuestion.ts:196:36` ObjectLiteral among them | PASS, matches the five base survivors named in 42-01 |
| `HydrationEngine.ts` 1.0 and `QadiAtoms.ts` 0.9 against base 0.9784 and 0.8966 | read `42-mutation-after.json`, 42-REVIEW-DISPOSITION.md | At or above base | PASS (recorded, not re-run) |
| `pnpm check:pr` at HEAD | `checkpr42.log` (20:12, after the last commit at 20:08) | 16 of 16 steps ran, no `failed (exit` line, ends with `run-check: ran 16 of 17 steps`; coverage, BDD, spec gates, `pnpm example` 30 passed, website build, publish-status all pass | PASS |

### Probe Execution

No phase-declared probes. Step 7c: skipped.

### Requirements Coverage

Every ID in the phase's requirement list is claimed by at least one PLAN frontmatter, and none is orphaned. Plan 01 claims SEED-01, SEED-02, SEED-05, WX-02, WX-05, WX-06. Plan 02 claims SEED-03, SEED-04, WX-05, WX-06. Plan 03 claims SEED-03, SEED-04, WX-04. Plan 04 claims SEED-03, SEED-04, WX-02, WX-03, WX-07. Plan 05 claims SEED-04, SEED-06, WX-01 to WX-07.

| Requirement | Plans | Status | Evidence |
|-------------|-------|--------|----------|
| SEED-01 | 01 | SATISFIED | 42-RESEARCH.md evidence table, spike diff and the 1b `check:pr` run. |
| SEED-02 | 01 | SATISFIED | ADR-QD-155 and the mutation base committed before any src change. |
| SEED-03 | 02, 03, 04 | SATISFIED | Truths 2, 3 and 5. |
| SEED-04 | 02-05 | SATISFIED | Truth 6. |
| SEED-05 | 01 | SATISFIED as not applicable | The decision was a go. REQUIREMENTS.md ticks it, and the plan treats it as the other branch. Noted for transparency, not a gap. |
| SEED-06 | 05 | SATISFIED | Truth 7. |
| WX-01 | 05 | SATISFIED | `check:pr` log after the last commit. |
| WX-02 | 01, 04, 05 | SATISFIED | ADR-QD-155, the CCR-QD-433 row, and BEH-QD-546 to 550 and INV-QD-329 to 330 left reserved (the WX-05 scan found them only in `spec/README.md`). |
| WX-03 | 04, 05 | SATISFIED | `pnpm spec:api` passes in the log. The moved declarations are package-private and have no overview row. |
| WX-04 | 03, 05 | SATISFIED | My own scan over the added `packages/react/src` lines (no `as`, `!`, `any`, `switch`, `fnUntraced`, `async`, `console`, `process.env`, clock) found only a `import type * as AtomRegistry` line, which is a false positive on the `as` of a namespace import. |
| WX-05 | 01, 02, 05 | SATISFIED | Mutation results above. The two closing tests are in `QadiAtoms.test.ts` (equal-subject write) and `SeededQuestion.test.ts`. Coverage thresholds pass in the log. |
| WX-06 | 01, 02, 05 | SATISFIED | Both `test(42-02)` commits (`6460c15e`, `daa06ff3`) precede `c65199e1`. |
| WX-07 | 04, 05 | SATISFIED | The patch changeset is present. There is no public break, so no Breaking entry is needed. `package.json`, CHANGELOG and tags are unchanged since `637c0601`. |

### Anti-Patterns Found

None blocking. In `SeededQuestion.ts` there are no TODO, FIXME or XXX markers, no stub returns, and no hardcoded empties flowing to a consumer. `Effect.never` for an unknown subject is the intended "still loading" answer, documented in place.

### Human Verification Required

None. Behavior-dependent truths (the late-seed no-rerun and the no-grant-node-for-an-unhydrated-question invariants) are proven by named tests that I confirmed fail under the wrong implementation.

### Notes (non-blocking)

- `Explanation.ts` was judged against 41-REVIEW-DISPOSITION.md (228/231 = 0.98701), not `41-mutation-after.json` (0.9875), per the orchestrator's acceptance. The re-run equals the review figure, so there is no drop against the latest recorded score.
- Plan-verify defects in the 42-02 and 42-05 prefix-count preconditions are documented in the SUMMARYs, and the facts they guarded were checked directly.
- I did not re-run the full-milestone mutation or `pnpm example`. I relied on the recorded results and the `check:pr` log, and re-ran the moved module's mutation myself, which matches.
- `checkpr42.log` has no numeric exit line. Success is inferred from all 16 steps running, no `failed (exit` message and the final `run-check: ran 16 of 17 steps` line, which the script prints only on success.

## Gaps Summary

No gaps. The phase goal is achieved in the codebase: `SeededQuestion.ts` owns the seed-to-evaluation link, `HydrationEngine.ts` is a codec, the fake `computedFor` is gone, real-runtime tests guard the two timing traps, the pins are byte-identical, the records and budgets moved together, and the milestone was re-checked with nothing released.

---

_Verified: 2026-11-14_
_Verifier: Claude (gsd-verifier)_
