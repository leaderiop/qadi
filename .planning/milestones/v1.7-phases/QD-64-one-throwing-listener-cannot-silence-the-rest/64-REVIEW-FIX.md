---
phase: QD-64-one-throwing-listener-cannot-silence-the-rest
fixed_at: 2026-11-20T16:30:00Z
review_path: /Users/mohammadalmechkor/Projects/Perso/qadi/.planning/phases/QD-64-one-throwing-listener-cannot-silence-the-rest/64-REVIEW.md
iteration: 1
findings_in_scope: 1
fixed: 1
skipped: 0
status: all_fixed
---

# Phase QD-64: Code Review Fix Report

**Fixed at:** 2026-11-20
**Source review:** 64-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 1
- Fixed: 1
- Skipped: 0

Verification ran in the main checkout (`use_worktrees` handling left to the orchestrator's setup; edits and the commit landed on `arch-wave-12` directly).

## Fixed Issues

### WR-01: The out-of-scope caveat omits the timeline's resize path

**Files modified:** `packages/devtools/src/model/TimelineFeed.ts` (comments only), `packages/devtools/README.md`, `spec/decisions/177-one-throwing-listener-cannot-silence-the-rest.md`, `spec/behaviors/28-devtools-screens.md`, `spec/README.md`
**Commit:** 87267447
**Applied fix:** Claim confirmed against `TimelineFeed.ts` `configure`: on a capacity change `push()` runs before `readSource`, so a throw there skips `begin()`, the new source is never read, the previous read keeps feeding the (new, emptied) store, and `inputs` already holds the new value so a repeat `configure` does not re-read; only `status.restart` does. Per the orchestrator's guidance this is fixed in the texts only (no code reordering). Added the case to the `subscribe` and `configure` doc comments, the devtools README listener paragraph, ADR-QD-177 decision 5, the BEH-QD-656 trailing paragraph and the CCR-QD-455 row. No new ids, no revision bump (the traceability gate reports every header agrees).

Checks (all with `< /dev/null`): `node scripts/check-doc-examples.mjs` (117 blocks compile), `node scripts/check-house-style.mjs` (clean), `bash spec/scripts/verify-traceability.sh --strict` (PASS 21, FAIL 0), `pnpm vitest run packages/devtools/test/model` (1277 passed), oxlint on `TimelineFeed.ts` (clean). `pnpm check:pr` and `check-package-install.mjs` not run.

## Out of fix scope (left as-is)

- IN-01: the "poll's stop" sentence in `DiagnosticsFeed.ts` holds only when the `Stopped` publish does not itself throw.
- IN-02: no test pins the `Starting` / `Reading` window claims (F30, TF25 cover only isolation and rethrow).

---

_Fixed: 2026-11-20_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
