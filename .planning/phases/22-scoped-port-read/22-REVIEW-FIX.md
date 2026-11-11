---
phase: 22-scoped-port-read
fixed_at: 2026-11-11T00:00:00Z
review_path: .planning/phases/22-scoped-port-read/22-REVIEW.md
iteration: 1
findings_in_scope: 2
fixed: 2
skipped: 0
status: all_fixed
---

# Phase 22: Code Review Fix Report

**Fixed at:** 2026-11-11
**Source review:** .planning/phases/22-scoped-port-read/22-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 2
- Fixed: 2
- Skipped: 0

Out of scope (fix_scope `critical_warning`): IN-01 to IN-05 remain open in REVIEW.md.

## Fixed Issues

### WR-01: INV-QD-288 overclaims for the two optional-id ports

**Files modified:** `packages/core/src/ScopedLeaf.ts` (new), `packages/core/src/DecisionHistory.ts`, `packages/core/src/SignatureHistory.ts`, `packages/core/src/PortAccess.ts`, `packages/core/test/PortAccess.test.ts`, `spec/invariants.md`, `spec/decisions/134-a-resource-scoped-port-read-is-one-read.md`, `spec/traceability.md`
**Commit:** 23e54421
**Status:** fixed: requires human verification (logic change on an authorization read)
**Applied fix:**
- Structural: the leaf's `scope === "Resource"` test now exists once, in a new package-private `ScopedLeaf.ts` (`isResourceScoped`, and `scopedResourceIdOf`, which calls it). `asks` in `DecisionHistory.ts` and `SignatureHistory.ts` read the id through `scopedResourceIdOf`; `readActed` and `askSignature` route on `isResourceScoped`. The request's id and the route can no longer disagree. A new file, not `Resource.ts`, because `Resource.ts` is in the barrel and the API-surface gate would have demanded two new public exports.
- Law test in `PortAccess.test.ts`: over an absent resource, an id-less one, a non-string id and a usable id, a `Resource`-scoped acted or signature leaf calls its port only with the site's id (else `MissingResourceId`, no call) and an `Any`-scoped one calls it with none. Mutation-checked: forcing `readActed` to route to `readPort` made the new law test and the D-07 table fail.
- Text: INV-QD-288 now says the guarantee is structural for `RelationshipResolver` and rests on the one shared scope test for the other two, and lists the law test in Enforcement. ADR-QD-134 D-01 and the traceability rows name it.

### WR-02: Traceability row claims a test file pins something it does not

**Files modified:** `spec/traceability.md`
**Commit:** d4d62133
**Applied fix:** The `PortServing.tst.ts` row is back to "has the five members"; the no-`leaves` claim stays on the `PortAsks.tst.ts` row only. Revision entries added with `scripts/spec-revise.mjs` (invariants 1.103, ADR-QD-134 1.1, traceability 1.145 and 1.146). The older 1.144 history line still says the PortServing row was "updated"; it is change history and left as written.

## Verification

Run in the main checkout (`workflow.use_worktrees` is false, so no worktree was created). After the final source edit:

- `pnpm typecheck`: clean
- `pnpm vitest run --project core`: 62 files, 2069 tests pass
- `pnpm test:tstyche`: 46 files, 218 tests pass
- `node scripts/check-house-style.mjs`: clean (446 files)
- `node scripts/check-api-surface.mjs`: clean
- `pnpm spec:verify:strict`: PASS 21, FAIL 0, SKIP 0
- `pnpm spec:gates`: dod-table 25 steps match
- Not run: full `pnpm check` (mutation, BDD).

---

_Fixed: 2026-11-11_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
