---
phase: QD-61-decisioncache-is-asked-only-the-question
fixed_at: 2026-11-19T00:00:00Z
review_path: .planning/phases/QD-61-decisioncache-is-asked-only-the-question/61-REVIEW.md
iteration: 1
findings_in_scope: 8
fixed: 8
skipped: 0
status: all_fixed
---

# Phase 61: Code Review Fix Report (iteration 1)

**Source review:** `61-REVIEW.md` (3 warnings, 5 info). All eight are fixed, each in its own `fix(61): ...` commit. Every change is a comment, a doc, a spec edit or one test; no behaviour changed.

**Run in:** the main checkout (`.claude/worktrees` was not used), so the numbers below are reproducible from this tree.

## Commits

| Commit | Finding |
| ------ | ------- |
| `a534d5bb` | the scan amendment (below), made first |
| `22a967ce` | IN-02, the RED-checked test |
| `c68d265f` | WR-01 |
| `61f9fb4b` | WR-02 |
| `ba4492b0` | IN-01 |
| `41eef299` | IN-04 |
| `e6c9c9f5` | IN-03 |
| `d0ca3df6` | IN-05 |
| `db9e8f46` | WR-03 |
| `8b3cf5d9` | IN-02, the spec side |

## Fixed Issues

### Scan amendment (prerequisite for IN-05)

**Files modified:** `.planning/phases/QD-61-decisioncache-is-asked-only-the-question/61-scan.mjs`
**Commit:** `a534d5bb`
**Applied fix:**
- `EvaluationMetrics.ts` and `packages/devtools/test/react/Simulator.test.tsx` join ALLOWED, and the Simulator test is excluded from the "another package changed" rule.
- `EvaluationMetrics.ts` left the frozen list. Instead every non-comment line of it is compared with `phase_base`, comments stripped from both sides, strings kept whole. Changing the metric's `description:` makes the scan fail with "changed beyond its comments" (checked by a temporary edit, restored).
- `DecisionCache.ts` may now hold the word `compute` only inside the cited test title (WR-02 needs it verbatim, and the scan's "no `compute`" rule read the raw file). The title is stripped before that one rule runs.
- Every other rule is unchanged.

### WR-01: "walks the question it is given" said of every implementation

**Files modified:** `packages/core/src/DecisionCache.ts`, `packages/core/src/Lifecycle.ts`
**Commit:** `c68d265f`
**Applied fix:** The interface doc now says `decisionCacheLayer` walks the question, and that this signature takes no computation. The `Lifecycle.ts` comment says the cache is handed the question and `options`, never a computation; core's layer walks it itself, and a host cache must answer for the question it is handed (BEH-QD-645).

### WR-02: a cited test title that does not exist

**Files modified:** `packages/core/src/DecisionCache.ts`
**Commit:** `61f9fb4b`
**Applied fix:** The doc now cites "a coalesced waiter's interruption does not interrupt the shared compute — the other waiter still gets a result", verbatim from `DecisionCache.test.ts:804`.

### WR-03: the implementer's compile errors, not the caller's

**Files modified:** `spec/decisions/174-a-decision-cache-is-asked-the-question.md` (Rev 1.0 to 1.1), `spec/README.md` (CCR-QD-452 row; Rev 1.255 to 1.256), `apps/website/src/content/docs/docs/reference/upgrading.md`
**Commit:** `db9e8f46`
**Applied fix:** Probed with `tsc` in a scratch project outside the repo against the real `DecisionCache.ts`:

| Who | Code | Case |
| --- | ---- | ---- |
| implementer | TS2345 | `getOrCompute: (question, compute) => Effect.map(compute, ...)` in `Layer.succeed(DecisionCache, ...)` (the upgrade note's "Before") |
| implementer | TS2322 | `compute` annotated as an `Effect`; the whole `DecisionCacheShape["getOrCompute"]` annotated; a third parameter |
| caller | TS2559 | `c.getOrCompute(q, compute)` and `c.getOrCompute(q, () => compute)` |
| caller | TS2554 | a third argument |

The ADR's Consequences, the CCR-QD-452 row and the upgrade note now name both parties. The upgrade note says "passing one **as a caller** is a compile error (TS2559)" (the 0.13 section still names TS2559, as the scan requires) and adds, before the "Before" fence, that an implementation written as below no longer compiles where it runs `compute` (TS2345) or annotates it (TS2322). The changeset says only "a compile error" with no code, so it is unchanged. `check-website-doc-examples` still compiles 71 blocks.

### IN-01: the cache receives the caller's whole options object

**Files modified:** `packages/core/src/DecisionCache.ts`
**Commit:** `ba4492b0`
**Applied fix:** The interface doc says that at runtime `options` is the caller's own object, passed by reference with no copy (ADR-QD-174 decision 4), so it may carry `resource`, `action`, `maxDepth` and `evaluationId` too; an implementation reads only `concurrency` and does not log or retain the rest. No `{ concurrency }` is allocated per lookup.

### IN-02: BEH-QD-644's "its own options object" was not pinned

**Files modified:** `packages/core/test/Lifecycle.test.ts`, `spec/behaviors/21-decision-cache.md` (Rev 1.10 to 1.11), `spec/README.md` (the CCR-QD-452 row's revisions; Rev 1.256 to 1.257)
**Commits:** `22a967ce` (test), `8b3cf5d9` (spec)
**Applied fix:** New test "the cache is handed the caller's own options object, not a copy of it": a wrapper over `decisionCacheLayer()` records `options`, `ask` is called with a held object, and `assert.strictEqual(seen[0], options)`.
- **Proven able to fail:** `Lifecycle.ts` was temporarily changed to pass `{ concurrency: options?.concurrency }`; the test went red (`Lifecycle.test.ts:87`, 1 failed of 3). Restored with `git checkout`, green again. The mutant was never committed.
- The commit subject is `fix(61): RED-checked pin ...` because the source was already correct, so the test is green on HEAD.
- BEH-QD-644's Enforcement names the new test.

### IN-03: the race test's bound depends on `walk`'s step count

**Files modified:** `packages/core/test/DecisionCache.test.ts`
**Commit:** `e6c9c9f5`
**Applied fix:** The switch-over comment now says the bound also depends on `walk`'s step count, so an effect upgrade or a `Walk.ts` change can move it; re-measure rather than retry. The bound (48) is unchanged.

### IN-04: `concurrency`'s doc, with and without a cache

**Files modified:** `packages/core/src/Question.ts`
**Commit:** `41eef299`
**Applied fix:** "It reaches the walk directly, or through `DecisionCacheShape.getOrCompute`'s second parameter when a cache is wired, and never the key (ADR-QD-174)."

### IN-05: stale `compute` wording in a metric doc and a test comment

**Files modified:** `packages/core/src/EvaluationMetrics.ts`, `packages/devtools/test/react/Simulator.test.tsx`
**Commit:** `d0ca3df6`
**Applied fix:** Comments only. The JSDoc says "joined another fiber's walk of the question, still in flight" and "this fiber walked it itself"; the two Simulator comments say the cache walks / forks its walk. The metric's `description:` string is untouched (ADR-QD-123).

## Verification

Run in the main checkout after the last commit:

- `pnpm exec vitest run --project core`: 82 files, 2649 tests pass.
- `Simulator.test.tsx` (devtools): 26 pass.
- `tstyche DecisionCache.tst.ts`: 4 tests, 9 assertions, 1 suppression matched.
- `pnpm typecheck`, `pnpm circular`: clean. `pnpm lint`: no error; only warnings already in the tree (in `.codex/` and other packages).
- `check-doc-examples`: 117 blocks. `check-website-doc-examples`: 71 blocks.
- `check-house-style`: 560 files clean. `check-api-surface`: 939 exports. `check-dod-table`: 25 steps.
- `spec-revise --check` and `verify-traceability --strict` (21 PASS).
- `61-scan.mjs`: one complaint, as expected: "the mutation evidence does not follow the last code change" (the new Lifecycle test is a code line after the Stryker evidence). Nothing else.

## Not done

- Stryker, `check:pr` and `pnpm check` were not run, as instructed. The orchestrator re-runs Stryker; the new test is a code line to the scan, so the evidence needs a fresh `chore(61)` commit.
- The changeset was not edited (it names no TS code).

---

_Fixed: 2026-11-19_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
