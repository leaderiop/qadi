---
phase: 36-carried-spec-debt-and-stale-records
fixed_at: 2026-11-13T00:00:00Z
review_path: .planning/phases/36-carried-spec-debt-and-stale-records/36-REVIEW.md
iteration: 2
findings_in_scope: 8
fixed: 7
skipped: 1
status: partial
---

# Phase 36: Code Review Fix Report

**Fixed at:** 2026-11-13
**Source review:** .planning/phases/36-carried-spec-debt-and-stale-records/36-REVIEW.md
**Iteration:** 2 (iteration 1: 7 findings; iteration 2 re-review: 1 new info finding)

**Summary:**
- Findings in scope: 7
- Fixed: 6
- Skipped: 1 (IN-06, `no_change_needed`)

Verification ran in the main checkout (`workflow.use_worktrees` is `false`, so no worktree was created).
After all fixes: `pnpm build` exit 0; `pnpm vitest run` exit 0, 200 test files and 4917 tests passed; `pnpm typecheck` and `pnpm lint` clean.
For WR-01: `pnpm vitest run --project core packages/core/test/Ports.test.ts` (32 passed), `node scripts/spec-revise.mjs --check`, `pnpm spec:gates` and `pnpm spec:verify:strict` all green.
Logs are under the session scratchpad (`final-build.log`, `final-vitest.log`, `wr01-*.log`).

## Fixed Issues

### WR-01: Live comments (and a shipped metric description) still name `Evaluate.ts` for port calls

**Files modified:** `packages/core/src/PortMetrics.ts`, `packages/core/src/PortName.ts`, `packages/core/test/Ports.test.ts`, `.changeset/port-calls-description.md` (new), `spec/README.md`, `.planning/phases/36-carried-spec-debt-and-stale-records/36-LEDGER.md`
**Commits:** b3787bd9 (code, pin, changeset, spec row), 521c870e (ledger)
**Applied fix:** Per the orchestrator's guidance, the full fix. The comments in `PortMetrics.ts` (module doc, the `toPredicate` paragraph and the `portCallsTotal` doc's "not reworded here" sentence) and `PortName.ts` now name the evaluator (`Walk.ts` through `PortAccess.ts`). The `qadi_port_calls_total` description now reads "Scoped to the evaluator only — toPredicate reaches the same ports via a second interpreter and counts them in qadi_predicate_port_calls_total.", dropping both `Evaluate.ts` and the nonexistent `translateNode`. The pin in `Ports.test.ts` moved with it. `.changeset/port-calls-description.md` (`@qadi/core` patch) records that the description is part of the registry key (ADR-QD-052), so this is a new registry entry. The CCR-QD-427 row in `spec/README.md` gained the new files and a "changed in code review" clause, then `spec-revise` took it to Rev 1.168. No other spec document quoted the old description or tied it to `Evaluate.ts`, so nothing else needed an amendment. The ledger's two "Not changed" bullets carry an appended "Changed in code review (`b3787bd9`)" note, with the original reasoning kept. Status: fixed. The new description wording is a judgement call, worth a glance.

### IN-01: `v4-http-smoke.test.ts` header lists `PermissionRegistry.ts`, omits `AccessPlan.ts`

**Files modified:** `packages/http/test/v4-http-smoke.test.ts`
**Commit:** 157cdc41
**Applied fix:** `PermissionRegistry.ts` replaced by `AccessPlan.ts` in the header list. A grep shows `RequirePermission.ts` also has no `effect/http` import, which the review did not flag; the header was left otherwise as written.

### IN-02: Mis-indented `status:` literal in `makeTimelineFeed`

**Files modified:** `packages/devtools/src/model/TimelineFeed.ts`
**Commit:** beb1ee61
**Applied fix:** `restart` hoisted to a named const; the `status` object now uses the shorthand.

### IN-03: `rowsOf` builds `snapshot(capture)` twice per usable Snapshot row

**Files modified:** `packages/devtools/src/model/SimulationSource.ts`
**Commit:** 8e8ac22c
**Applied fix:** `replay` is built once at the top of `rowsOf` and shared by `source` and `prepare`. The Snapshot arm now tests `replay === undefined`, which narrows the same way `capture` did. The `Fixtures` arm already shared one constant.

### IN-04: `StoppedBox`'s `hooks` and `focusTarget` are independent unions

**Files modified:** `packages/devtools/src/react/StoppedBox.tsx`, `packages/devtools/src/react/DiagnosticsNotice.tsx`, `packages/devtools/src/react/TimelineNotice.tsx`
**Commit:** e57653bc
**Applied fix:** The two props are replaced by one closed `feed: StoppedFeed` (`"diagnostics" | "timeline"`). A module-level `FEEDS` record, closed over `StoppedFeed`, maps each feed to its `{ hooks, focusTarget }`, so a mismatched pair cannot be written and a third feed is a missing key (TS2741). Both callers updated; no test or spec referenced the old props.

### IN-05: The contrast helper uses the superseded sRGB linearisation threshold

**Files modified:** `packages/devtools/test/react/contrast.ts`
**Commit:** 0ad4c2be
**Applied fix:** `0.03928` changed to `0.04045`. `theme.contrast.test.ts` still passes, so no pinned ratio moved.

## Skipped Issues

### IN-06: `focusRingProps.onFocus` throws where `:focus-visible` is unsupported

**File:** `packages/devtools/src/react/focusRing.ts:18`
**Reason:** no_change_needed. `:focus-visible` has been supported by every evergreen browser since March 2022 (Safari 15.4), and every browser React 19 supports implements it. The only house-rule-compliant guard is a try/catch that swallows a `SyntaxError` and draws the ring anyway, which hides a real error for an engine the package does not target. The dock is a development overlay, as the review itself notes.
**Original issue:** `currentTarget.matches(":focus-visible")` throws in an engine that does not recognise the selector.

---

_Fixed: 2026-11-13_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_

## Iteration 2

The re-review (`36-REVIEW.md`, iteration 2) found every iteration-1 finding resolved, found IN-06's `no_change_needed` justified, and found no defect in the fix commits. It raised one new info finding.

### IN-01 (iteration 2): `StoppedFeed` exported but imported nowhere

**File:** `packages/devtools/src/react/StoppedBox.tsx:38`
**Status:** fixed
**Commit:** `522f2128`
**Fix:** dropped `export`; the `feed` prop and the `FEEDS` table use the type in place. `pnpm typecheck`, `pnpm lint` and `pnpm build` exit 0; `pnpm vitest run --project devtools` 1362 passed.

Applied by the orchestrator (a one-keyword change).
