---
phase: 08-port-serving-from-registry
fixed_at: 2026-11-08T00:00:00Z
review_path: /home/yopu/Project/Perso/qadi/.planning/phases/08-port-serving-from-registry/08-REVIEW.md
iteration: 1
findings_in_scope: 1
fixed: 1
skipped: 0
status: all_fixed
---

# Phase 08: Code Review Fix Report

**Fixed at:** 2026-11-08
**Source review:** /home/yopu/Project/Perso/qadi/.planning/phases/08-port-serving-from-registry/08-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 1
- Fixed: 1
- Skipped: 0

IN-01 and IN-02 are Info findings and out of scope for `critical_warning`; they remain in REVIEW.md.

## Fixed Issues

### WR-01: A "required" allowlist is enforced by the type only; a declaration missing its list serves the port open

**Files modified:** `packages/core/src/PortRemote.ts`, `packages/core/test/PortRemote.test.ts`, `spec/behaviors/34-remote-ports.md`
**Commit:** 6ac8416
**Applied fix:** `answerRemotely` now refuses with `NotServed` when `admitted` is not an array and either it is defined (a non-list value, which would otherwise get `String#includes` substring semantics) or the port's facet says `allowlist: "required"`. Only an `"open"` or `"opt-in"` port reads a missing list as open, so `allowlist` now has a runtime consumer. Two tests (attribute and predicate ports) feed declarations loaded through `JSON.parse` (`{}`, `null`, a string) and assert `NotServed` with zero store calls; both fail without the fix. BEH-QD-331 gains the run-time fail-closed statement and `spec-revise.mjs` bumped 34-remote-ports.md to 1.5. INV-QD-095 needed no change. Status: fixed, requires human verification (logic change in an admission path).

## Verification

Run in the main checkout (`workflow.use_worktrees=false`): PortRemote vitest suite (83 passed), `pnpm typecheck` (clean), `pnpm lint` (house-style clean; remaining oxlint warnings are pre-existing and in other files), `pnpm spec:verify:strict` (21 pass, 0 fail), `node scripts/spec-revise.mjs --check` (clean).

---

_Fixed: 2026-11-08_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
