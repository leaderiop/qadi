---
phase: QD-81-the-dock-model-applies-every-input-whatever-a-listener-throws
fixed_at: 2026-11-25T00:00:00Z
review_path: .planning/phases/QD-81-the-dock-model-applies-every-input-whatever-a-listener-throws/81-REVIEW.md
iteration: 3
findings_in_scope: 2
fixed: 2
skipped: 0
status: all_fixed
---

# Phase QD-81: Code Review Fix Report

**Fixed at:** 2026-11-25
**Source review:** .planning/phases/QD-81-the-dock-model-applies-every-input-whatever-a-listener-throws/81-REVIEW.md
**Iteration:** 3

**Summary:**
- Findings in scope: 2
- Fixed: 2
- Skipped: 0

Verification ran in the main checkout (`workflow.use_worktrees` is `false`; no worktree was created).

## Fixed Issues

### IN-01: The new BEH-QD-656 requirement is pinned for a read only through a derived-store listener and a backlog record

**Files modified:** `packages/devtools/test/model/TimelineFeed.listeners.test.ts` (new), `packages/devtools/README.md`, `spec/behaviors/28-devtools-screens.md`, `spec/traceability.md`, `spec/invariants.md`, `spec/decisions/194-a-run-of-calls-applies-every-call-whatever-one-throws.md`, `spec/README.md`
**Commits:** 98612f49 (test file and README), b43d20be (spec records, shared with IN-02)
**Applied fix:** A new test file, built through `timelineFeedOf`, with the label prefix `LF` (grep found no earlier use) and titles that carry no plan, phase or decision ids:
- LF1: a listener on the feed's own `timeline` that throws on a backlog record ends the read; the status is `Stopped` with the thrown message in its reason, and the timeline holds `["r1"]`, so `r2` is not accepted.
- LF2: the same for a record from the live stream (`Stream.make(r1, r2)`).
- LF3 (the cheap case (c), restoring the earlier IN-02 test): over a `Stopped` read, two timeline listeners and one status listener all throw on a capacity-and-source `configure`. The feed rethrows its own `AggregateError` ("More than one step of the timeline feed's configure threw."). Its first error is the store's one nested `AggregateError` `[first, second]` with the store's message, and its second is the status listener's throw. The read has started (`Reading`).

Red evidence, each shown by a scratch edit to `packages/devtools/src/model/TimelineFeed.ts`, restored with `git checkout -- packages/devtools/src/model/TimelineFeed.ts` (the src tree ends unchanged, `git diff -- packages/devtools/src` is empty):
- `marking.accept` changed to swallow a throw from `timeline.accept`: LF1 and LF2 failed, LF3 passed.
- `callAll([...resize, ...readSource])` in `configure` replaced by the two calls in sequence: LF3 failed, LF1 and LF2 passed.

Spec: the new file has its own `spec/traceability.md` row (LF1 to LF3), and BEH-QD-656's and BEH-QD-742's "Pinned by" clauses, INV-QD-373's enforcement in `spec/invariants.md` and ADR-QD-194's test list cite it. The README sentence about a nested `AggregateError` is widened back from "the dock keeps it whole" to "a feed's or the dock's `configure` keeps it whole", which LF3 and DL19 now pin.

### IN-02: BEH-QD-656's new requirement has no amendment banner and is not reflected in INV-QD-373's rows

**Files modified:** `spec/behaviors/28-devtools-screens.md`, `spec/traceability.md`, `spec/invariants.md`, `spec/README.md`
**Commit:** b43d20be
**Applied fix:** BEH-QD-656 gained a third banner, "Amended 2026-11-25 (ARCH-128, CCR-QD-473)", in the form of its earlier two, linking BEH-QD-744. The INV-QD-373 traceability row now lists `DockModel.listeners.test.ts` (and `TimelineFeed.listeners.test.ts`); its enforcement line in `spec/invariants.md` was extended the same way so the two agree.

Spec revisions, each through `node scripts/spec-revise.mjs ... --date 2026-11-25` (no new ids): 28-devtools-screens 1.69 to 1.70, traceability 1.312 to 1.313, invariants 1.221 to 1.222, ADR-QD-194 1.2 to 1.3, spec/README 1.390 to 1.391. The CCR-QD-473 row in `spec/README.md` is extended to those revisions and to the new citations.

## Gates run

- `pnpm vitest run --project devtools packages/devtools/test/model`: 52 files, 1515 tests passed.
- `node scripts/check-house-style.mjs`: 607 files clean.
- `node .planning/phases/QD-81-.../81-pinned-check.mjs --all-applied`: 8 files hold their base text, 4 of 4 declared flips applied (the script was not edited).
- `node scripts/spec-revise.mjs --check`: every Revision matches its newest entry.
- `pnpm spec:verify:strict < /dev/null`: PASS 21, FAIL 0, SKIP 0.
- Typecheck: `packages/devtools/tsconfig.json` is a solution-style file that checks nothing, so I ran `tsc -p tsconfig.test.json --noEmit`, which lists the new file. It reports no error in the new file. Errors elsewhere in that run were not examined.

No `as`, `!`, `any`, `switch`, `// Stryker disable` or module-scope `let` was added. No permission prompt blocked an action. `.planning/config.json`, `.agents/`, `.codex/` and every `*.iter*.md` stayed unstaged, and nothing was pushed.

---

_Fixed: 2026-11-25_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 3_
