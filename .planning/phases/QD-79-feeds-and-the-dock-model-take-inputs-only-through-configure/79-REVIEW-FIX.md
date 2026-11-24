---
phase: QD-79-feeds-and-the-dock-model-take-inputs-only-through-configure
fixed_at: 2026-11-24T00:00:00Z
review_path: .planning/phases/QD-79-feeds-and-the-dock-model-take-inputs-only-through-configure/79-REVIEW.md
iteration: 1
findings_in_scope: 6
fixed: 6
skipped: 0
status: all_fixed
---

# Phase QD-79: Code Review Fix Report

**Fixed at:** 2026-11-24
**Source review:** .planning/phases/QD-79-feeds-and-the-dock-model-take-inputs-only-through-configure/79-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 6 (WR-01, IN-01 to IN-05; scope `all`)
- Fixed: 6
- Skipped: 0

Edited in the main checkout (`workflow.use_worktrees` is `false`), one commit per finding, explicit paths staged.

## Fixed Issues

### WR-01: A registry whose `subscribe` throws is re-subscribed on every host render

**Status:** fixed (behaviour kept and pinned, as orchestrator-decided; no source change)
**Files modified:** `packages/devtools/test/react/DockRegistryReads.test.tsx`, `spec/decisions/192-feeds-and-the-dock-model-take-inputs-only-through-configure.md`, `spec/README.md`, `79-RED-EVIDENCE.md`
**Commits:** `12e53e3f` (tests and evidence), `63157bbc` (ADR-QD-192 Rev 1.2 to 1.3 names the test where it states the consequence; CCR-QD-471 row's ADR citation moved to Rev 1.3 and `spec/README.md` to Rev 1.369)
**Applied fix:** Two cells. One: a registry that keeps refusing is subscribed exactly once more by each of three host re-renders with a fresh, unchanged inputs record, is read never, and notifies none of the questions, services, diagnostics and dock stores. Two: once the registry accepts, the next commit subscribes once and reads once and publishes, and the commit after that does nothing. The "no extra render" requirement is pinned as store notifications (the dock component has no subscription of its own, so a render count would be vacuous).
**Evidence:** each cell shown failing once. W1 (`GatesFeed.ts` early return without `&& watchFailure === undefined`) fails both cells and the pre-existing "subscribed again by each build" cell. W2 (a new `Failed` on every retry) fails the first cell with `expected 3 to equal +0`. Restored from a copy; `git status --porcelain -- packages/devtools/src` empty. Recorded under `## 79 review fix` in 79-RED-EVIDENCE.md.
`pnpm spec:verify:strict` 21 pass, 0 fail; `spec-revise --check` clean.

### IN-01: duplicate value imports in `ConfigureRule.test.ts`

**Status:** fixed
**Files modified:** `packages/devtools/test/model/ConfigureRule.test.ts`
**Commit:** `2e4f5b23`
**Applied fix:** one value import from `DockModel.ts` and one from `builtFeeds.ts`.

### IN-02: stale test documentation

**Status:** fixed
**Files modified:** `packages/devtools/test/model/ConfigureRule.test.ts` (header), `packages/devtools/test/model/DockModel.test.ts` (M2 (b) title), `79-RED-EVIDENCE.md`
**Commit:** `d7ee2b1c`
**Applied fix:** header says every cell builds bare and configures; M2 (b) retitled "a catalogue handed to a bare model's first configure fills both rails and the role list at once". `79-pinned-check.mjs` confirms M2 is not among the 15 pinned tests (still "15 tests hold their assertions").
**Evidence:** the retitled cell failed once against `DockModel.ts:398` `spread();` replaced by `void 0;` (edit T1), restored from a copy; recorded in 79-RED-EVIDENCE.md.

### IN-03: constructor signatures and doc lines past the hand-wrapping width

**Status:** fixed
**Files modified:** `packages/devtools/src/model/TimelineFeed.ts`, `GatesFeed.ts`, `DiagnosticsFeed.ts`, `DockModel.ts`
**Commits:** `35ec9a9a` (source), `b2e61752` (plan verify text)
**Applied fix:** the four `function* (): Effect.fn.Return<…>` signatures wrapped; the `source` field doc, the `FeedInputs` doc, the four "Builds the … bare" doc lines, the `completeDiagnosticsOptions` signature and one over-long comment in `DockModel.ts` wrapped.
**Plan verify:** the only plan that greps the single-line signature is `79-12-PLAN.md` (its task verify). Its clause now strips whitespace before matching (`tr -d " \n" < "$f" | grep -qF "function*():Effect.fn.Return<$r,never,Scope.Scope>"`) and passes on the four files. The `contains:` line in that plan's `must_haves` frontmatter (line 65) and the sentences in 79-12-SUMMARY.md still show the single-line form and were left as history; the two hold scripts and the other plans do not grep it.

### IN-04: vacuous runtime assertion in the packed-artifact check

**Status:** fixed
**Files modified:** `scripts/check-package-install.mjs`
**Commit:** `49c9ff7e`
**Applied fix:** removed `expect("devtools dock props", Object.keys(dockProps).length, 10)`; the literal's type-check against the packed `DevtoolsDockProps` stays the check. `node scripts/check-package-install.mjs` and `pnpm spec:package`, each run alone, pass (9 packages, 527 runtime exports).

### IN-05: `feedInputsOf` normalised the diagnostics options a second time

**Status:** fixed (necessity finding; removed the second normalisation)
**Files modified:** `packages/devtools/src/model/DockModel.ts`, `packages/devtools/test/model/ConfigureInputs.tst.ts`, `packages/devtools/test/model/ConfigureRule.test.ts`
**Commit:** `3b25a7e1`
**Applied fix:** `feedInputsOf` hands `inputs.diagnostics` on as given; `FeedInputs.diagnostics` is `DiagnosticsOptions | undefined`; the now-unused `completeDiagnosticsOptions` import is gone; the `FeedInputs` doc says the diagnostics feed's own `configure` normalises. `ConfigureInputs.tst.ts`'s golden for `ReturnType<typeof feedInputsOf>` and CR24's expected diagnostics record (`{ layer, intervalMillis: 250 }`, no `collector: undefined` key) follow. CR24's title is unchanged. No observable behaviour changed: the feed still normalises and compares by field, and the whole devtools project stays green. No spec or ADR text states `feedInputsOf`'s return type, so no spec revision was needed.
**Status note:** a logic-adjacent change, so it is flagged "fixed: requires human verification" for the mutation re-close.

## Verification (run in the main checkout, not a worktree)

- `pnpm exec vitest run --project devtools`: 80 files, 1869 tests, all pass (was 1867; two new cells).
- `node 79-pinned-check.mjs`: "15 tests hold their assertions". `node 79-characterisation-check.mjs`: first-render characterisation holds its first commit.
- `pnpm typecheck` clean; `pnpm test:tstyche` both passes green; `node scripts/check-house-style.mjs` clean.
- `pnpm exec oxlint packages/devtools`: warnings only, in `HeldChoice.test.ts` (not touched).
- `scripts/check-doc-examples.mjs` (119 blocks) and `scripts/check-website-doc-examples.mjs` (75 blocks) compile; `scripts/spec-revise.mjs --check` clean; `pnpm spec:verify:strict` 21 PASS, 0 FAIL.
- Stryker was not run.

## `packages/devtools/src/model/**` files changed (for the mutation re-close)

- `TimelineFeed.ts`: signature and doc wrap only.
- `GatesFeed.ts`: signature and doc wrap only.
- `DiagnosticsFeed.ts`: signature, `completeDiagnosticsOptions` signature and doc wrap only.
- `DockModel.ts`: wrap only, plus the IN-05 change (`feedInputsOf` no longer calls `completeDiagnosticsOptions`; the `FeedInputs.diagnostics` type). This is the one source change with a new mutant surface (`diagnostics: inputs.diagnostics` in `feedInputsOf`).

---

_Fixed: 2026-11-24_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
