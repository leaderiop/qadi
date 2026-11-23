---
phase: QD-73-one-pure-reconcile-for-gate-registration
fixed_at: 2026-11-23T03:10:00Z
review_path: /Users/mohammadalmechkor/Projects/Perso/qadi/.planning/phases/QD-73-one-pure-reconcile-for-gate-registration/73-REVIEW.md
iteration: 3
findings_in_scope: 5
fixed: 5
skipped: 0
status: all_fixed
---

# Phase 73: Code Review Fix Report (iteration 3)

**Fixed at:** 2026-11-23
**Source review:** 73-REVIEW.md (iteration 3)
**Iteration:** 3

**Summary:**
- Findings in scope: 5 (fix scope all)
- Fixed: 5
- Skipped: 0

Edits and commits were made in the main checkout (`workflow.use_worktrees` is `false`). The gates below ran there.

## Fixed Issues

### WR-01: `guardTrees`, `listed` and `snapshotOf` sat in shared support with one consumer each

**Files modified:** `packages/react/test/GateRegistration.characterisation.test.tsx`, `packages/react/test/GateRegistry.test.tsx`, `packages/react/test/GateWriter.reconcile.test.ts`, `packages/react/test/support/trees.tsx`, `packages/react/test/support/gates.ts`
**Commits:** ba548dfc (`snapshotOf` into the characterisation: import and helper only, no row's input, title or expected value changed), 25351205 (the rest)
**Applied fix:**
- `snapshotOf` now lives in the characterisation.
- `guardTrees` and `GuardTrees` are gone. `GateRegistry.test.tsx` has its own `current`, `mount` (through the shared `providerTree`) and `gateInstances`, as at the phase base. `listed` is local to the grouped-reads block.
- Audit of every export of both support modules by importers:
  - `newCanWrite` had one importer (`GateWriter.reconcile.test.ts`), so it moved into that file.
  - `TreeOptions` and `Notifications` had no importer outside their module and are no longer exported.
  - `listenTo`, `notificationsOf`, `newCanRead`, `canRead`, `canWrite`, `isAdmin`, `docA`, `docB`, `atoms`, `providerTree` and `Group` each have at least two importers.
- `trees.tsx`'s header now says what it holds and who shares it, and `gates.ts`'s header lists only what it still holds.

Deliberate exception: `alice` has one importer (`GateRegistry.test.tsx`, which mounts 13 providers of its own). It stays exported because `providerTree` mounts under it, and a second copy of the subject could drift from the one `providerTree` uses. The `trees.tsx` header says so.

### IN-01: the `.tst.ts` comment said "any more" and "the one it had"

**Files modified:** `packages/react/test/GateWriter.reconcile.tst.ts`
**Commit:** 11a3b63c
**Applied fix:** the comment now reads "No index-aligned type is exported, so naming `GateCurrent` is refused. A pin on that name alone."

### IN-02: `useGateRegistrations` doc comment said "tells what it keeps its state"

**Files modified:** `packages/react/src/useGate.ts`
**Commit:** edaa89b4
**Applied fix:** "and tells each kept handle its state: an unchanged identity and an unchanged state make no notifying call, because the handle decides equality." The single-ref statement is untouched, so it still equals INV-QD-392 and the CCR row.

### IN-03: the characterisation header prescribed a commit process; the reconcile test header had a grammar slip

**Files modified:** `packages/react/test/GateRegistration.characterisation.test.tsx`, `packages/react/test/GateWriter.reconcile.test.ts`
**Commits:** 2e8e7947 (characterisation header only), 3feae24a (reconcile test header)
**Applied fix:** the "inputs and expected values are fixed ... each such edit is its own commit" sentence is removed. The other header now says "`wanted` is keyed by gate id", rewrapped within 90 columns.

### IN-04: the "count rule" and the INV-QD-391 traceability row

**Files modified:** `spec/decisions/186-gate-registration-is-one-keyed-reconcile.md` (Rev 1.4 to 1.5), `spec/traceability.md` (Rev 1.259 to 1.260), `spec/README.md` (Rev 1.312 to 1.313)
**Commit:** fec1ddc9
**Applied fix:** the rejected alternative now says what the rule counted ("how many of a step's writes threw and reports them together") and cites ADR-QD-177. The INV-QD-391 traceability row no longer lists the characterisation, so it lists exactly the files INV-QD-391 cites. The revisions went through `spec-revise.mjs`, and CCR-QD-465's row cites 1.5, 1.260 and 1.313. Its file list still equals the 20 files of `git diff --name-only 1dbaf1a9 HEAD` outside `.planning/`, because no file was added or removed.

## Gates

All passed in the main checkout after the last commit:

- `vitest run --project react`: 646 tests passed
- `pnpm typecheck`
- `pnpm test:tstyche`: 70 files, 375 tests passed
- `node scripts/check-house-style.mjs`: 574 files clean
- `node scripts/check-doc-examples.mjs`: 118 blocks compile
- `node scripts/check-api-surface.mjs`: 941 exports
- `pnpm exec oxlint`: no finding in a touched file. Two `no-unused-vars` warnings remain in `v4-reactivity-smoke.test.ts`, which this iteration did not touch.
- `node scripts/spec-revise.mjs --check`
- `bash spec/scripts/verify-traceability.sh --strict`: 21 PASS, 0 FAIL

---

_Fixed: 2026-11-23_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 3_
