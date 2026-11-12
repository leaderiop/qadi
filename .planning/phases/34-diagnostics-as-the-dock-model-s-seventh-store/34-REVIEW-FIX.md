---
phase: 34-diagnostics-as-the-dock-model-s-seventh-store
fixed_at: 2026-11-12T20:00:00Z
review_path: .planning/phases/34-diagnostics-as-the-dock-model-s-seventh-store/34-REVIEW.md
iteration: 1
findings_in_scope: 11
fixed: 9
skipped: 2
status: partial
---

# Phase 34: Code Review Fix Report

**Fixed at:** 2026-11-12
**Source review:** 34-REVIEW.md (WR-01..03, IN-01..05) plus UI-1..UI-3 from 34-UI-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 11 (8 review findings, 3 UI warnings)
- Fixed: 9
- Skipped: 2 (IN-01, IN-05, both by orchestrator direction)

Edits and commits ran in the main checkout (`workflow.use_worktrees` is `false`), on `arch-wave-8`. Verification ran in the main checkout: `pnpm vitest run --project devtools` (55 files, 1320 tests passing), `pnpm typecheck`, `pnpm lint` (no warning in a touched file), `pnpm circular`, `pnpm spec:examples`, `pnpm spec:verify:strict`.

## Fixed Issues

### WR-01: A defect while the scope closes is reported as `Stopped`
**Files modified:** `packages/devtools/src/model/DiagnosticsFeed.ts`, `packages/devtools/test/model/DiagnosticsFeed.test.ts`, spec (BEH-QD-507, INV-QD-313, ADR-QD-047)
**Commit:** 880f9285
**Applied fix:** `Effect.addFinalizer` after `FiberHandle.make` bumps `generation`, so it runs first on close and the interrupted run is a replaced one. F24 (dying release, close, no `Stopped`, snapshot identity kept) was red before the fix. Logic fix: requires human verification.

### WR-02: `restart()` / `configure` on a closed feed publishes `Starting`
**Files modified:** same three areas
**Commit:** d23e9021
**Applied fix:** the finalizer also sets `closed`; `configure` and `restart` return at once when set. F25 closes the scope and calls `restart`, `configure({...})`, `configure(undefined)`, `restart`; asserts no publish, snapshot identity, no further samples. Logic fix: requires human verification.

### IN-02: `configure(undefined)` redoes `off()` when already off
**Commit:** f505d303
**Applied fix:** `off()` only when `before !== undefined`. F26 pins no notification and identity. The test is a regression pin, not a kill: the churn it removes (token bump, fork of `Effect.void`, fresh store) is unobservable, so the `if (true) off()` mutant survives and is named. Logic fix: requires human verification.

### IN-03: A restart while `Starting` publishes `Starting` again
**Commit:** a130b14b
**Applied fix:** `start` publishes `diagnosticsStarting.status`, the one module-scope value, so `show`'s identity dedup holds. F27 (asynchronous layer, `restart()` and a changed-interval `configure` while `Starting` notify nothing, the sample still arrives as `Live`) fails without the change. Logic fix: requires human verification.

### IN-04: A second stop flips `role` instead of remounting
**Files modified:** `DiagnosticsNotice.tsx`, `DevtoolsDock.tsx`, `test/helpers.ts`, notice and screen tests, spec, `34-UI-SPEC.md`
**Commit:** 558683bf (shared with UI-1, UI-2, UI-3; see note below)
**Applied fix:** the dock's `announced` ref now holds a `StopLedger` (`{ stop, count }`, exported with `noStops`). The stopped notice decides `alert` once at mount, records the stop in a layout effect, and is keyed per stop (`count` when the ledger holds this stop, `count + 1` otherwise), so `Stopped` then `Stopped` remounts. The `seen`/`setSeen` block is gone. New N12 asserts the element is replaced and the role is present on the second mount. The ledger holds no decision (AGENTS.md §13). Logic fix: requires human verification.

### UI-1: Focus invisible after Restart
**Commit:** 558683bf
**Applied fix:** the dock has no focus token in `theme.ts` (its buttons use the browser default), so `diagnosticsRootProps` drops `outline: "none"`, keeping `tabIndex: -1` and the focus move to `closest("[data-diagnostics-status]")`. Not verified in a real browser: the ring shows for keyboard-initiated focus per browser `:focus-visible` heuristics.

### UI-2: `role="alert"` wrapped the `Cause.pretty` `<pre>`
**Commit:** 558683bf
**Applied fix:** the notice is now `<section data-testid="qadi-diagnostics-notice">` (the amber box) holding the alert `<div data-testid="qadi-diagnostics-stopped">` (lead and body only, with `role`, `data-announce`, `data-sampled`), then the reason `<pre>` (same testid, `tabIndex 0`, maxHeight 96, pre-wrap), then the button. One new testid, `qadi-diagnostics-notice`.
**Changed assertions (intended behaviour change):**
- `DiagnosticsNotice.test.tsx` N4: the border and background style assertions moved from the alert element to the box (`qadi-diagnostics-notice`); the alert assertions (role, testid, `data-sampled`, `data-announce`, text) are unchanged.
- New N11: the alert text is exactly lead plus body, the reason is not inside it and is its next sibling inside the box.
- N8, N9, N5, N6, N7 and `DiagnosticsScreens.test.tsx` D4, D5, D6, D7, D8 were not changed: the stopped testid still carries `role`, `data-announce` and `data-sampled`.

### UI-3: Live region mounted with its content
**Commit:** 558683bf
**Applied fix:** `DiagnosticsNotice` always renders `<div role="status" data-testid="qadi-diagnostics-region">` (no style, so no visible space), empty for `Off`, `Live` and `Stopped`, holding the Starting box (`qadi-diagnostics-starting`, copy verbatim) for `Starting`. The starting box no longer carries `role="status"`; `Stopped` stays on its alert path. New testid: `qadi-diagnostics-region`.
**Changed assertions (intended behaviour change):**
- N1 and N2: `container.innerHTML === ""` became the exact empty-region markup.
- N3: `getByRole("status")` with a testid check became `getByTestId("qadi-diagnostics-starting")` whose parent is the status region; text and border assertions unchanged.
- N10: `style` deep-equals `{ padding: 12 }` (UI-1), previously `{ padding: 12, outline: "none" }`.
- `DiagnosticsScreens.test.tsx` D9: the `role="status"` assertion moved to the starting box's parent. D10: three `querySelector("[data-testid^='qadi-diagnostics-']")` null checks became `assertOnlyEmptyRegion` (only `qadi-diagnostics-region` present, empty); title adjusted.
- New N13: the region is the same node through `Off`, `Starting`, `Live`, `Stopped`, `Starting`, empty except on `Starting`.
- `test/helpers.ts` `liveNotice` fixture and N-test `freshRef` use `noStops` (type change, not an assertion).

### WR-03: Survivor evidence for the marking-accept token
**Files modified:** `34-mutation-survivors.json`, `34-mutation-after.json`
**Commit:** 40cb480e
**Applied fix:** the `DiagnosticsFeed.ts:209:13` entry now says: unreachable on effect 4.1.2 because the interrupted run never reaches its accept; kept as defence against a stale accept after `off()` publishing `Live` over `Off`; F16 does not distinguish it. No source comment made the F16 claim, so none changed. Line numbers moved and were updated, and two new equivalent survivors are named (the finalizer's `generation -= 1` at 178:7, and `if (true) off()` at 245:11).

**Mutation (Stryker, `stryker.devtools.mjs`, DiagnosticsFeed.ts and DockModel.ts):** DockModel.ts 1.0 (48 killed). DiagnosticsFeed.ts 0.9279 (103 killed, 8 survived), down from 0.9388 (92/98) because of the two new equivalent survivors; all eight are named with reasons. `34-mutation-after.json` updated; TimelineFeed.ts and DiagnosticsStore.ts kept at 1 (not re-run). Log: `/private/tmp/claude-502/-Users-mohammadalmechkor-Projects-Perso-qadi/13b3a680-6983-4c4f-9cad-4ed79d71ff4f/scratchpad/stryker-34-fix.log`. Older phase docs (`34-SECURITY.md` T-34-22, `34-09-SUMMARY.md`, `34-VALIDATION.md`) still quote 0.9388 and "six survivors"; not edited.

## Skipped Issues

### IN-01: Marking-accept guard unreachable
**File:** `packages/devtools/src/model/DiagnosticsFeed.ts:200`
**Reason:** carried to the milestone's carried-debt phase (Phase 36) together with IN-05. The guard stays per WR-03; `TimelineFeed`'s untokened accept is pre-existing reliance on the same interruption ordering.
**Original issue:** the `mine !== generation` guard is unreachable on effect 4.1.2.

### IN-05: `TimelineFeed` silent fiber death
**File:** `packages/devtools/src/model/TimelineFeed.ts:79-83`
**Reason:** predates this phase and is out of scope; carried to Phase 36's carried debt.
**Original issue:** a throwing source ends the fiber with no status.

## Notes

- **Records:** `spec/behaviors/28-devtools-screens.md` (BEH-QD-507 and BEH-QD-509 text and pinned ranges, F1 to F27, N1 to N13), `spec/invariants.md` (INV-QD-313) and `spec/decisions/047-a-headless-devtools-model.md` (the 1.13 amendment bullets) were corrected with the fixes. Each document was bumped once with `spec-revise.mjs --date 2026-11-12` (BEH 1.18 to 1.19, INV 1.112 to 1.113, ADR-QD-047 1.13 to 1.14), in the WR-01 commit, reusing existing ids; later edits to the same documents on the same day did not bump again. `34-UI-SPEC.md` structure, props, accessibility mechanism, test hooks and focus notes were updated in commit 558683bf.
- **Commit grouping:** IN-04, UI-1, UI-2 and UI-3 rewrite one component and its tests together, so they share commit 558683bf rather than four.
- **Process slip:** an earlier SubagentHandback was sent in error with the text "placeholder" before the mutation run finished. It carried no report; this file and the final message are the report.
- Not checked: a real-browser pass for the focus ring and the screen-reader behaviour of the new region and per-stop remount; the changeset (`.changeset/dock-diagnostics-feed.md`) was not touched.

---

_Fixed: 2026-11-12_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
