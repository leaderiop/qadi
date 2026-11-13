---
phase: 35-the-atom-set-owns-its-eviction-sweep
fixed_at: 2026-11-12T22:30:00Z
review_path: .planning/phases/35-the-atom-set-owns-its-eviction-sweep/35-REVIEW.md
iteration: 1
findings_in_scope: 4
fixed: 4
skipped: 0
status: all_fixed
---

# Phase 35: Code Review Fix Report

**Fixed at:** 2026-11-12T22:30:00Z
**Source review:** .planning/phases/35-the-atom-set-owns-its-eviction-sweep/35-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 4
- Fixed: 4
- Skipped: 0

`workflow.use_worktrees` is `false`, so all edits and commits are on `arch-wave-8` in the main checkout. No worktree, temp branch or sentinel was created.

## Fixed Issues

### WR-01: A fork that throws leaves the pending flag stuck true

**Files modified:** `packages/react/src/SweepScheduler.ts`, `packages/react/test/SweepScheduler.test.ts`
**Commit:** 230cf975
**Applied fix:** `request` now wraps `fork(episode)` in `try`/`catch`; on a throw it clears `pending` and rethrows. The header doc no longer implies the scheduler cannot wedge: it states that a throwing fork recovers, and that a runtime discarding the default fork's timer cannot be recovered at this layer (Node and browsers do not do this). New test C11 builds a fork that throws on its first call and hands it through `withSweepFork` and `sweepForkOf`. It asserts the first `request` throws, `pending()` is false, and the next request forks again and sweeps once. I confirmed C11 fails when the reset line is removed. Status: fixed (logic change, the test above is the evidence; a human should still read it).

### IN-02: S9's mid-wait assertions depend on the dispatcher's bucket-drain order

**Files modified:** `packages/react/test/v4-reactivity-smoke.test.ts`, `packages/react/test/QadiAtoms.sweep.test.ts`
**Commit:** 8f9bed4e
**Applied fix:** I chose to pin the ordering, not restate S9. S9's assertions are unchanged. A new canary test in `v4-reactivity-smoke.test.ts`, "a fork raised by the removal is begun, and not finished, when one yield after the unmount resumes", pins the order: the removal and the fork it raises run first, and a continuation that yielded once resumes before the episode's own yield completes. S9 gained a two-line comment citing the canary at the one-yield step.

### IN-01: The "What this closure owns" comment sat above `scheduler`

**Files modified:** `packages/react/src/QadiAtoms.ts`
**Commit:** f9d1941d
**Applied fix:** `const scheduler = ...` moved above the comment block with its own one-line comment, so the block leads into `const book` again.

### IN-03: "One macrotask later" understates the release path

**Files modified:** `packages/react/src/QadiAtoms.ts`, `.changeset/atom-set-sweep.md`, `apps/website/src/content/docs/docs/reference/upgrading.md`
**Commit:** f9d1941d (same commit as IN-01)
**Applied fix:** "one macrotask" became "within a few macrotasks" in the `maxTrackedQuestions` doc comment, the changeset and the upgrade note. The precise turn count stays in `settle.ts`. The doc comment cites no plan ids.

## Spec wording left for the spec owner

The same "one macrotask" claim appears in spec files I did not edit:

- `spec/behaviors/25-inspection.md:798` ("The atom set sweeps one macrotask after the book ...") and `:1119` (a comment inside an example fence).
- `spec/behaviors/25-inspection.md:13`, the 1.24 change-history row (history, exempt).
- `spec/decisions/148-the-atom-set-owns-its-eviction-sweep.md:72` ("forgotten one macrotask after the pressure").
- `spec/decisions/103-a-question-is-opened-once.md:13` (change-history row) and `:100` ("sweeps its own book one macrotask after the pressure").
- `spec/behaviors/09-react.md` has no such wording.

For an admission, "one macrotask" is exact. For a release after an unmount it is at least two. Whether to amend these (and ADR-QD-148, and BEH-QD-198's text) is a spec revision decision.

## Verification

All three ran from the repo root in the main checkout, not a worktree, so they are reproducible from this tree.

- `pnpm vitest run --project react < /dev/null`: exit 0, 475 tests passed.
- `pnpm typecheck < /dev/null`: exit 0.
- `pnpm lint < /dev/null`: exit 0. It reports only warnings that existed before, none in the lines changed here (including `QadiAtoms.ts` and `v4-reactivity-smoke.test.ts` unused-parameter warnings at the old locations). `house-style: 484 file(s) clean`.

`.planning/config.json` and `.planning/state.json` were not staged. Nothing was pushed. `stryker.react.mjs`, `AGENTS.md`, scripts and config were not edited. Every commit carries the `Co-Authored-By: Claude Opus 5.5` line.

---

_Fixed: 2026-11-12T22:30:00Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_

## Orchestrator follow-up (iteration 1)

The spec wording the fixer reported was corrected in 5ae3b761 (`fix(35): IN-03 … in the spec too`): `25-inspection.md` 1.24 → 1.25 (BEH-QD-511 prose and example), ADR-QD-148 1.0 → 1.1, ADR-QD-103 1.2 → 1.3, each through `scripts/spec-revise.mjs --date 2026-11-12`. `spec-revise --check`, `spec:verify:strict` (21/21), `spec:examples` and `spec:gates` exit 0.
