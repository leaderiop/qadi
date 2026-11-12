---
phase: 22-scoped-port-read
fixed_at: 2026-11-11T00:00:00Z
review_path: .planning/phases/22-scoped-port-read/22-REVIEW.md
iteration: 1
findings_in_scope: 7
fixed: 7
skipped: 0
status: all_fixed
---

# Phase 22: Code Review Fix Report

**Fixed at:** 2026-11-11
**Source review:** .planning/phases/22-scoped-port-read/22-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 7 (fix_scope `all`)
- Fixed: 7
- Skipped: 0

WR-01 and WR-02 were fixed in an earlier pass and re-confirmed in place in this one (`ScopedLeaf.ts` and its two users, and the `PortServing.tst.ts` traceability row). IN-01 to IN-05 were fixed in this pass.

## Fixed Issues

### WR-01: INV-QD-288 overclaims for the two optional-id ports

**Files modified:** `packages/core/src/ScopedLeaf.ts` (new), `packages/core/src/DecisionHistory.ts`, `packages/core/src/SignatureHistory.ts`, `packages/core/src/PortAccess.ts`, `packages/core/test/PortAccess.test.ts`, `spec/invariants.md`, `spec/decisions/134-a-resource-scoped-port-read-is-one-read.md`, `spec/traceability.md`
**Commit:** 23e54421 (earlier pass)
**Status:** fixed: requires human verification (logic change on an authorization read)
**Applied fix:**
- Structural: the leaf's `scope === "Resource"` test now exists once, in a new package-private `ScopedLeaf.ts` (`isResourceScoped`, and `scopedResourceIdOf`, which calls it). `asks` in `DecisionHistory.ts` and `SignatureHistory.ts` read the id through `scopedResourceIdOf`; `readActed` and `askSignature` route on `isResourceScoped`. The request's id and the route can no longer disagree. A new file, not `Resource.ts`, because `Resource.ts` is in the barrel and the API-surface gate would have demanded two new public exports.
- Law test in `PortAccess.test.ts`: over an absent resource, an id-less one, a non-string id and a usable id, a `Resource`-scoped acted or signature leaf calls its port only with the site's id (else `MissingResourceId`, no call) and an `Any`-scoped one calls it with none. Mutation-checked in that pass.
- Text: INV-QD-288 says the guarantee is structural for `RelationshipResolver` and rests on the one shared scope test for the other two; ADR-QD-134 D-01 and the traceability rows name the law test.

### WR-02: Traceability row claims a test file pins something it does not

**Files modified:** `spec/traceability.md`
**Commit:** d4d62133 (earlier pass)
**Applied fix:** The `PortServing.tst.ts` row is back to "has the five members"; the no-`leaves` claim stays on the `PortAsks.tst.ts` row only. Revision entries were added with `scripts/spec-revise.mjs`.

### IN-01: `Walk.evaluateHasRelationship` read the resource id a second way

**Files modified:** `packages/core/src/Walk.ts`
**Commit:** 3371400e
**Applied fix:** `const rawId = resource?.["id"]` is now `const resourceId = resourceIdOf(resource)`, the reader `asks` uses, and the two deny reasons interpolate it. Reason text is unchanged on every reachable path: a non-string id fails with `MissingResourceId` before either reason can be built, and a string id renders identically. Evaluate, Walk and explain tests (the whole core project) pass.

### IN-02: Stale `UNTRACED_BUDGET` comment in `scripts/check-house-style.mjs`

**Files modified:** `scripts/check-house-style.mjs`
**Commit:** c76c3595
**Applied fix:** Comment only. It now lists `readAttribute` (and the `resolveAttribute` span under it), `askActed`, `askRelationship`, `askCustom`, `askSignature`, and points at `readScoped` (a plain function with no span) instead of `requireResourceId`, matching AGENTS.md §5. No budget value changed.

### IN-03: `Predicate.ts` re-spelled `Extract<Policy, ...>`

**Files modified:** `packages/core/src/Predicate.ts`
**Commit:** 2e4afe54
**Applied fix:** `Plan.AskAttribute.leaf` is `LeafOf["HasAttribute"]` and `history`'s parameter is `LeafOf["HasActed"] | LeafOf["HasNotActed"]`, with `import type { LeafOf } from "./PortDescription.ts"`. Type-identical, no new export, `check-api-surface` clean. `Walk.ts`'s pre-existing `Extract<Policy, ...>` uses were left alone. The commit message notes that the `Folded` rewrite committed with ARCH-70 is behaviour-neutral and outside ARCH-70 and cannot be split now.

### IN-04: Doc-comment shape and wrapping drift

**Files modified:** `packages/core/src/PortAccess.ts`, `packages/core/src/PortDescription.ts`, `packages/core/src/DecisionHistory.ts`, `packages/core/src/ScopedLeaf.ts`
**Commit:** 93f93cff
**Applied fix:** Comments only.
- `PortAccess.ts` header: "Every read is, or wraps, a named `Effect.fn` that owns its span (`askActed` wraps `readActed`, `readAttribute` calls `resolveAttribute`)".
- `readActed` and `actedAsks` gained one-line summaries with the why after.
- `ScopedRequest`'s garbled sentence is fixed.
- The `readScoped` and `PortDescription.attributes` (`pose`) over-wide lines were hand-wrapped.
- `ScopedLeaf.ts` now leads with a one-line summary.
- `PortAccess.ts`'s `readPort` doc has one over-wide line (the "`disclose` becomes the port's own typed error. A plain function ..." line, about 109 columns) that predates this phase and was not in the finding, so it is left as is.

### IN-05: `one-port-read.md` span removal under a "Not marked Breaking" paragraph

**Files modified:** `.changeset/one-port-read.md`
**Commit:** 9e2b90bc
**Applied fix:** The span-removal paragraph was already a separate paragraph; it now opens with a bold "**Observable change (not Breaking):**". The ARCH-47 "Not marked **Breaking**" sentence about the types stays in its own paragraph above it.

## Verification

Run in the main checkout (`workflow.use_worktrees` is false, so no worktree was created), after the final edit (`9e2b90bc`):

- `pnpm typecheck`: clean
- `pnpm vitest run --project core`: 62 files, 2069 tests pass
- `pnpm test:tstyche`: 46 files, 218 tests pass
- `node scripts/check-house-style.mjs`: clean (446 files, 3 declared switches)
- `node scripts/check-api-surface.mjs`: clean (900 exports documented)
- `pnpm changeset status`: runs without error (the only changeset-related script in `package.json`; there is no changeset lint)
- No `spec/` file was edited in this pass, so `spec:verify:strict` and `spec:gates` were not re-run (they passed after the earlier pass's spec edits).
- Not run: full `pnpm check` (mutation, BDD, coverage).

---

_Fixed: 2026-11-11_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
