---
phase: 22-scoped-port-read
reviewed: 2026-11-11T00:00:00Z
depth: standard
files_reviewed: 41
files_reviewed_list:
  - packages/core/src/PortAccess.ts
  - packages/core/src/PortDescription.ts
  - packages/core/src/PortServing.ts
  - packages/core/src/Ports.ts
  - packages/core/src/PortDerivation.ts
  - packages/core/src/PortDoubles.ts
  - packages/core/src/PortRemote.ts
  - packages/core/src/Walk.ts
  - packages/core/src/Predicate.ts
  - packages/core/src/Resource.ts
  - packages/core/src/AttributeResolver.ts
  - packages/core/src/RelationshipResolver.ts
  - packages/core/src/DecisionHistory.ts
  - packages/core/src/CustomPredicate.ts
  - packages/core/src/SignatureHistory.ts
  - packages/core/test/PortAccess.test.ts
  - packages/core/test/PortAccess.tst.ts
  - packages/core/test/PortAsks.tst.ts
  - packages/core/test/PortConformance.test.ts
  - packages/core/test/PortDescription.test.ts
  - packages/core/test/PortRemote.test.ts
  - packages/core/test/SignatureHistory.test.ts
  - packages/core/test/Evaluate.test.ts
  - packages/core/test/helpers.ts
  - spec/decisions/134-a-resource-scoped-port-read-is-one-read.md
  - spec/behaviors/30-port-calls.md
  - spec/behaviors/34-remote-ports.md
  - spec/behaviors/06-services.md
  - spec/invariants.md
  - spec/overview.md
  - spec/traceability.md
  - spec/decisions/077-both-interpreters-read-ports-through-one-module.md
  - spec/decisions/094-a-port-is-described-once.md
  - spec/decisions/109-a-ports-span-is-projected-once-and-every-read-is-one-body.md
  - spec/decisions/114-a-port-states-what-it-serves.md
  - spec/decisions/index.yaml
  - spec/README.md
  - .changeset/one-port-read.md
  - .changeset/port-serving.md
  - apps/website/src/content/docs/docs/reference/upgrading.md
  - AGENTS.md
findings:
  critical: 0
  warning: 2
  info: 5
  total: 7
  necessity: 0
status: issues_found
---

# Phase 22: Code Review Report

**Reviewed:** 2026-11-11
**Depth:** standard
**Files Reviewed:** 41
**Status:** issues_found

## Summary

Reviewed the phase diff (`git diff 7f64db9a`) with the full files for context. The refactor folds three
resource-scoped reads into `readScoped`, moves the leaf-to-request mapping into each port's `asks`, and
derives `servingFor` from it.

Checked and found sound:

- No fail-open path was found. A `Resource`-scoped leaf whose resource has no string id fails with
  `MissingResourceId` before the port is called and before any call is counted, on all three scoped ports.
  Both the `asks` entry and the read branch on the same `leaf.scope`.
- `servingFor` names exactly the ports whose `asks` state the node's tag, and the name is `asked` of the
  same request the read builds. The six port-reading tags (HasAttribute, HasActed, HasNotActed,
  HasRelationship, HasCustom, HasSignature) are pinned by `PORT_LEAVES`. The opt-in signature port is
  declared exactly when a leaf asks it, which is the old `names.length > 0` behaviour.
- A missing-id failure stays a typed `MissingResourceId`, never a defect. Defect mapping is unchanged
  (`readPort` plus `catchPortDefect`).
- The overload on `askActed` keeps `toPredicate`'s error type free of `MissingResourceId`. The Any-scope
  path cannot raise it.
- House rules hold in the diff: no `as`, `!` or `any` outside `as const` in a test, `Match` where it was
  already used, `.ts` import extensions, and `readScoped` opens no span so `UNTRACED_BUDGET` is untouched.
- Stale-name grep: `askActedAny`, `askActedForResource`, `ServedLeaves` and `serving.leaves` survive only in
  historical ADR text and Change History. `requireScopedResourceId` is covered under IN-02.

Verified by running:

- `tsc -b tsconfig.json` (clean).
- `pnpm vitest run --project core` (62 files, 2065 tests, all pass).
- `pnpm test:tstyche` (46 files, 218 tests, all pass).
- `node scripts/check-house-style.mjs` (clean).
- `node scripts/check-api-surface.mjs` (clean).

I could not run the full `pnpm check` (mutation, BDD, spec gates), so those gates are unverified.

Necessity: `.claude/gsd-core/references/necessity-review.md` was read. No necessity findings.
`completeRequest`'s two identity entries and the `askActed` overload wrapper both earn their place (type
closure and `toPredicate`'s error type respectively).

## Warnings

### WR-01: INV-QD-288 overclaims; "never reaches its port without a resource id" is a convention for two of the three ports, not a structural guarantee

**File:** `packages/core/src/PortAccess.ts:233-242` (also `spec/invariants.md` INV-QD-288, `spec/decisions/134-a-resource-scoped-port-read-is-one-read.md` D-01)
**Issue:** The invariant and its Implication state that "a request that has no resource id cannot be
completed into one the port accepts". That is true only for `RelationshipResolver`, whose
`RelationshipCheck.resourceId` is required and whose `completeRequest` entry rebuilds the request with the
checked id. For `DecisionHistory` and `SignatureHistory` the entries are `(request) => request`, and
`ActedQuery.resourceId` and `SignatureQuery.resourceId` are optional. Nothing in the types stops a
`Resource`-scoped request reaching `readPort` with no id.

What keeps the invariant true is that two places read `leaf.scope === "Resource"` independently:

- the port's `asks` entry (`DecisionHistory.ts` `askedActed`, `SignatureHistory.ts` `signatureAsks`), which
  decides whether the id is read at all;
- the read (`readActed`, `askSignature`), which decides whether to route through `readScoped`.

If either test drifts from the other, a `Resource`-scoped leaf is asked subject-wide, answers `"Acted"` for
any resource, and the policy allows. That is fail-open on an authorization read. There is no live bug
today, but the new "one read" design gives the two ports no structural enforcement, while the doc and the
invariant claim it.

**Fix:** Either soften the invariant text to say the guarantee rests on the leaf's `scope` deciding both the
request and the route, or make the route follow the request so there is one test.

```ts
// Sketch: let the read ask `asks` whether the request is scoped, instead of
// re-testing leaf.scope. A scoped request is one whose asks left `resourceId`
// unset because the site had none; the read cannot tell that from an Any-scoped
// one without the leaf, so state it once on the description:
readonly scoped: (leaf: LeafOf[...]) => boolean
```

Alternatively add a law test that for every generated `Resource`-scoped acted or signature leaf, at every
site, the port is never called without a `resourceId`. `PortAccess.test.ts`'s D-07 table covers only the
absent-resource site.

### WR-02: Traceability row claims a test file pins something it does not

**File:** `spec/traceability.md` (`packages/core/test/PortServing.tst.ts` row)
**Issue:** The row was edited to read "a port's `serving` facet has no `leaves`", but
`packages/core/test/PortServing.tst.ts` was not changed in this phase and contains no `leaves` assertion
(`grep -n leaves` finds nothing). That assertion lives in the new `PortAsks.tst.ts` ("the serving facet
keeps no leaf map"), which has its own row. The edited text was also never true of this file, which pins
the `PortServing` shape, the allowlist words and the facet word/slot agreement. A spec/traceability claim
that a test enforces something it does not is the failure mode AGENTS.md §15 gates exist to prevent.
**Fix:** Restore the row's description to what the file pins (the five-member declaration, `serving`
required, the allowlist word per slot, a mismatched word is not the port's facet), and leave the "no
`leaves`" claim on the `PortAsks.tst.ts` row only.

## Info

### IN-01: `readAttribute`/`servingFor` and `Walk.evaluateHasRelationship` read the resource id two different ways

**File:** `packages/core/src/Walk.ts:198`
**Issue:** `evaluateHasRelationship` still takes `rawId = resource?.["id"]` and interpolates it into the
deny reasons, while the request it asks about carries `resourceIdOf(resource)` (`asks`). Today these agree
on every path that reaches the reason, because a non-string id fails with `MissingResourceId` first. But
the phase's stated goal is that the reader's rule and the writer's rule are one (`Resource.ts` doc), and
this leaves a second, untyped (`unknown`) read of the id feeding user-visible text.
**Fix:** Use the id the request carries, e.g. `const id = resourceIdOf(resource)`. `Walk.ts` is the one
remaining raw reader.

### IN-02: Stale comment in `scripts/check-house-style.mjs` names removed reads and a deleted helper

**File:** `scripts/check-house-style.mjs:448-452`
**Issue:** The `UNTRACED_BUDGET` doc still lists `askActedAny` and `askActedForResource` as the traced port
reads and says "neither is `requireResourceId`, a helper rather than a per-node dispatch point". All three
were removed or merged by this phase (`askActed`, `readScoped`). AGENTS.md §5 was updated but this
mirror of it was not. The file is outside the declared scope, but it is the enforcement point AGENTS.md
cites.
**Fix:** Replace the list with `readAttribute`, `askActed`, `askRelationship`, `askCustom`, `askSignature`
and drop the `requireResourceId` clause (or point at `readScoped`).

### IN-03: `Predicate.ts` re-spells `Extract<Policy, …>` where this phase introduced `LeafOf`

**File:** `packages/core/src/Predicate.ts:305, 379`
**Issue:** `Plan.AskAttribute` and `history` write `Extract<Policy, { readonly _tag: "HasAttribute" }>` and
`Extract<Policy, { readonly _tag: "HasActed" | "HasNotActed" }>`. ADR-QD-134 centralises exactly this
index as `LeafOf` and removed `NodeOf` for the same duplication. `Walk.ts` has the same pattern on its
leaf arms (pre-existing).
**Fix:** `LeafOf["HasAttribute"]`, and `LeafOf["HasActed"] | LeafOf["HasNotActed"]` (or export `ActedLeaf`
from `PortAccess.ts`). The `Folded` rewrite in the same file (`{ ok, value }` to `{ value } | undefined`)
is behaviour-neutral and unrelated to ARCH-70. It is not in the ADR or changeset; note it in the commit
message or split it out.

### IN-04: Doc-comment shape and wrapping drift

**File:** `packages/core/src/PortAccess.ts:14, 224-225, 252`; `packages/core/src/PortDescription.ts:198`
**Issue:**
- The header says "Every read is a named `Effect.fn` that owns its span", but `readAttribute` and
  `askActed` are plain functions. `askActed` is an overload wrapper around `readActed`, whose `Effect.fn`
  owns the span.
- `readActed` and `actedAsks` have no doc comment, unlike every sibling.
- `ScopedRequest`'s doc reads "which every scoped port's states a `resourceId` in", which is garbled.
- `PortAccess.ts:252` ("Annotate-before-validate is still ADR-QD-077's rule…") and `PortDescription.ts:198`
  (the `pose` paragraph) run past the hand-wrap width (about 90 columns) the codebase keeps (AGENTS.md §17).
**Fix:** Say "every read is, or wraps, a named `Effect.fn`"; add one-line summaries to `readActed` and
`actedAsks`; fix the `ScopedRequest` sentence; rewrap the two long lines.

### IN-05: `one-port-read.md` changeset appends a user-visible span removal under a "Not marked Breaking" paragraph

**File:** `.changeset/one-port-read.md:13`
**Issue:** The new paragraph about the removed `qadi.requireScopedResourceId` span follows the "Not marked
**Breaking**…" paragraph with no separation of topic. It reads as if the span removal were covered by that
claim, which is scoped to the ARCH-47 types. Removing a span name is observable to a deployment's tracer
(the changeset itself says so). The ADR's "nothing in this repository read it" is true, but the changeset
should state clearly that this is a deliberate observable change and not marked breaking.
**Fix:** Lead the paragraph with a bold "Observable change (not Breaking):" and keep the "Not marked
Breaking" sentence about the ARCH-47 types separate.

---

_Reviewed: 2026-11-11_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
