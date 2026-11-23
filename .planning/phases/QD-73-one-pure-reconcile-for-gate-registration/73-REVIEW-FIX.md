---
phase: QD-73-one-pure-reconcile-for-gate-registration
fixed_at: 2026-11-23T02:00:00Z
review_path: .planning/phases/QD-73-one-pure-reconcile-for-gate-registration/73-REVIEW.md
iteration: 2
findings_in_scope: 6
fixed: 6
skipped: 0
status: all_fixed
---

# Phase QD-73: Code Review Fix Report

**Fixed at:** 2026-11-23
**Source review:** .planning/phases/QD-73-one-pure-reconcile-for-gate-registration/73-REVIEW.md
**Iteration:** 2

**Summary:**
- Findings in scope: 6 (fix scope: all)
- Fixed: 6 (WR-01 and IN-01/IN-02 remove or reduce code and text: fixed, requires human verification)
- Skipped: 0

Verification ran in the main checkout (`workflow.use_worktrees` is `false`), on the final tree
(head `11ae27d9`), with stdin closed.

## Fixed Issues

### WR-01: Necessity: `Boundary` moved into shared support for a second user that is gone

**Files modified:** `packages/react/test/edges.test.tsx`, `packages/react/test/support/trees.tsx`, `spec/README.md`
**Commit:** 2be8c7d4
**Status:** fixed: requires human verification (it removes code)
**Applied fix:** `edges.test.tsx` is restored from the phase base, so `git diff 1dbaf1a9 HEAD --
packages/react/test/edges.test.tsx` is empty. `Boundary`, the `Component` import and the trees header's mention of the
error boundary are gone from `support/trees.tsx`. The CCR-QD-465 row's file list no longer names `edges.test.tsx`
(README Rev 1.310, the row cites it).

### WR-02: ADR-QD-186 said the behaviours enforce what only review keeps

**Files modified:** `spec/decisions/186-gate-registration-is-one-keyed-reconcile.md`, `spec/README.md`
**Commit:** 99307aba
**Applied fix:** "What enforces it" now ends "Review does.", which is what INV-QD-391, INV-QD-392, BEH-QD-702,
BEH-QD-703, the hook's doc comment and the CCR row say. ADR-QD-186 Rev 1.3, README Rev 1.311, the row cites both.

### WR-03: `support/gates.ts` header said its helpers are for tests that need no rendering

**Files modified:** `packages/react/test/support/gates.ts`
**Commit:** 08ea0005
**Applied fix:** The header says "What the gate tests share: the count of notifications a gate registry makes
(`listenTo`, `notificationsOf`), and policies that are new on every call (`newCanRead`, `newCanWrite`)."

### IN-01 + IN-02: the writer's contract stated once, on `GateWriter`, with only its true reasons

**Files modified:** `packages/react/src/GateWriter.ts`, `spec/decisions/186-gate-registration-is-one-keyed-reconcile.md`,
`spec/behaviors/09-react.md`, `spec/invariants.md`, `spec/traceability.md`, `spec/README.md`
**Commit:** 11ae27d9
**Status:** fixed: requires human verification (a contract statement and its reasoning)
**Applied fix:** `GateWriter`'s doc comment states the contract (`register`, and `update` and `unregister` on its
handle, do not throw; `reconcile` handles no throw of its own and relies on that). `buildGateRegistry`'s doc comment
gives the reasons: each is a synchronous `Map`/`Set` write, `changed` isolates every listener, and the collision reporter
it is handed never throws. That last one was verified in `DeveloperSignals.ts`: the default for `GateIdCollision` is
`say`, one `console.warn`, which `contain`'s own comment says does not throw, and a supplied reporter is wrapped by
`contain` in `reporterFor`. `reconcile`'s doc comment is one sentence citing the contract (a writer that breaks it
propagates the throw part-way, with the steps before it applied). Idempotence is gone from the reasoning everywhere
(code, ADR-QD-186 decision 6 and "What enforces it", BEH-QD-702, INV-QD-391, the traceability row, the CCR row), and so
are the two citations of `unregister is idempotent` and `an update firing after the matching unregister stays a
no-op`, which pin a different rule (the handle's no-op after unregister, ADR-QD-080), not that nothing throws. BEH-QD-702,
ADR-QD-186 decision 6 and the CCR row state the contract in the same words; only ADR-QD-186 decision 6 carries the
reasons (BEH-QD-702 points at it). Every remaining Pinned-by title is verbatim. ADR-QD-140's amendment already said the
contract in the same words and is unchanged. Revisions: ADR-QD-186 1.4, BEH 3.16, INV 1.186, traceability 1.259,
README 1.312; the CCR-QD-465 row cites them.

### IN-03: one added line was 91 columns

**Files modified:** `packages/react/src/useGate.ts`
**Commit:** 5e2802db
**Applied fix:** Rewrapped the doc comment's last paragraph to 90 columns or fewer. No added line in `packages/` is over
90 columns.

## Gate results (final tree, head `11ae27d9`)

- `pnpm exec vitest run --project react`: 646 passed.
- `pnpm typecheck`: clean.
- `pnpm test:tstyche`: 70 files, 375 passed, 2 skipped.
- `node scripts/check-house-style.mjs`: 574 files clean.
- `node scripts/check-doc-examples.mjs`: 118 blocks compile.
- `node scripts/check-api-surface.mjs`: 941 exports (barrel unchanged).
- `pnpm exec oxlint` on every touched `packages/react` file: clean.
- `node scripts/spec-revise.mjs --check`: every Revision matches.
- `bash spec/scripts/verify-traceability.sh --strict`: exit 0, 21 PASS, 0 FAIL, 0 SKIP.
- CCR-QD-465's file list equals the 20 files of `git diff --name-only 1dbaf1a9 HEAD` outside `.planning/`.

---

_Fixed: 2026-11-23_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 2_
