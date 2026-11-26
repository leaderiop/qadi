---
phase: QD-90-the-remaining-per-port-facts-live-on-the-port-description
plan: 12
subsystem: core
status: complete
tags: [scoped-read, leaf-needs, port-access, routing]

phase_base: 46174873c60e85bcd0c6702867c602cad8460310
plan_head_before: 83aaaa240730a1bef2864e778d4a1231fc6665f9
plan_head_after: bf39a49035b074039b62fd440d9b75a77d0f4442

requires:
  - phase: QD-90-the-remaining-per-port-facts-live-on-the-port-description
    provides: the measured routing patch and its passing gate (plan 06), the fixture on the description (plan 11)
provides:
  - ScopedLeafTag and ScopedPort derived from LEAF_NEEDS and each description's asks
  - readScoped as the one route of every scoped read, deciding from the leaf's row through one hoisted Match
affects: [QD-90 plans 13-15 (mutation, records, changeset and upgrade note)]

requirements-completed: []

actuals:
  tokens: 7700
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "a route read off a data row: the row's value picks the arm of one module-scope Match, so reclassifying a leaf changes the route and the completion table together"

key-files:
  created: []
  modified:
    - packages/core/src/PortAccess.ts
    - packages/core/src/LeafNeeds.ts
    - packages/core/src/ScopedLeaf.ts
    - .planning/phases/QD-90-the-remaining-per-port-facts-live-on-the-port-description/90-RED-EVIDENCE.md

key-decisions:
  - "The measured routing.patch landed unchanged on the hot path (decided autonomously: the hoisted fallback was never measured and was not used)."

duration: 40min
completed: 2026-11-26
---

# Phase 90 Plan 12: The Scoped Read Routed Off Its Leaf Row Summary

**`ScopedPort` is derived from the leaf rows and `readScoped` routes every scoped read off its row through one hoisted `Match`, the exact per-call-closure form the bench passed; the 44-row route table and every existing test pass unedited.**

## Gate verdict

`90-check.mjs bench --pass` exited 0 (`# gate: pass`, `routing.patch` sha256 `fedbbea7...`). Both commits landed; PFACT-02 and PFACT-03 are met.

## What changed

- `PortAccess.ts` (derivation): `ScopedLeafTag` is every leaf tag whose `LEAF_NEEDS` row's `resourceId` is not `"Never"`; `ScopedPort` is every port whose description's `asks` names one. The hand union is gone; the derived set is `DecisionHistory`, `RelationshipResolver`, `SignatureHistory`.
- `PortAccess.ts` (routing): `readScoped(d, interpreter, leaf, request, relation)` is the one function `readActed`, `askRelationship` and `askSignature` call. It reads `LEAF_NEEDS[leaf._tag].resourceId`; the hoisted `needsResourceId` (`Match.type<"Always" | "ByScope">()`, `Match.exhaustive`) answers whether the read needs an id, its `ByScope` arm being `isResourceScoped(leaf)` (the one occurrence). A leaf that needs none is `readPort(d, interpreter, bare(request))` with no generator; a leaf that needs one runs `requireResourceId`, annotates the question on the port's own span on a miss, then fails with `MissingResourceId`. `ScopedCall<K> = { withId; bare: BareOf<K> }` replaces `completeRequest`; `BareOf<K>` is `undefined` for the relationship port (every leaf `Always`), so its not-needed branch is unreachable by type. `RESOURCE_SCOPED` survives. `readScoped` stays a plain function; no `switch`, no span literal, no `as`/`!`/`any`.
- `LeafNeeds.ts` lines 44-48 and `ScopedLeaf.ts` lines 8-19: prose only, stating that the read routes on the row and that its `ByScope` arm is `isResourceScoped`. No `LEAF_NEEDS` row changed.

## Landed routing against the measured routing.patch

Equal on every code line: `90-check.mjs routing-landed` reports "the routing equals the patch of record" (comment-free comparison of all three files at the routing commit and at HEAD). Differences are comments only: the `ScopedLeaf.ts` header sentence reads "the read routes on the leaf's `LEAF_NEEDS` row, whose `ByScope` arm is `isResourceScoped`" where the patch had "the read decides from the leaf's row and, for a `ByScope` row, from ...". No hunk on the hot path differs. The derivation commit carries `f.patch` except that its `LEAF_NEEDS` import is a value import (see plan defects).

## Checks run

| Check | Result |
| ----- | ------ |
| `pnpm typecheck` | clean, at the derivation commit and the routing commit |
| `node scripts/check-house-style.mjs` | 648 files clean (3 declared switches, no budget moved) |
| `node scripts/check-api-surface.mjs` | 943 exports documented |
| `pnpm circular` / `90-check.mjs circular` | no cycle, at both commits |
| `node scripts/run-tstyche.mjs` | 81 files, 442 tests passed, 2 skipped (the tool-characterisation blocks); second pass 443 passed, 1 skipped |
| `90-check.mjs suite` | 5314 tests in 214 files, all passed, at both commits and after the evidence commit |
| `90-check.mjs scoped-route derived` / `scoped-route` (derived and route) | pass |
| `90-check.mjs routing-landed` | pass |
| `90-check.mjs bench --pass` | pass |
| `90-check.mjs commit` (all three subjects), `trailers` | pass; 39 commits since phase_base, each with the one trailer |
| `90-pinned-check.mjs` (after the routing commit) | `pinned: 408 files hold their base text, 3 of 3 born files held, 5 of 5 declared edits applied` (exit 0) |

Before the routing commit the pinned check read `3 of 5 declared edits applied`; with the derivation commit alone it read the same (the declared files were still held).

## Seen failing (6 blocks in 90-RED-EVIDENCE.md, scratch clones of the routing commit)

| Label | Edit | Result |
| ----- | ---- | ------ |
| `route-byscope-true` | `ByScope` arm answers true | vitest exit 1; the route table (an `Any`-scoped acted read refused), `LeafNeeds.test.ts` and the evaluate/toPredicate agreement fail |
| `route-annotation-after-failure` | annotation placed after the failing return | vitest exit 1; the three "missing id still leaves its question" rows and every `Resource`-scoped no-id row fail |
| `route-effect-fn` | generator wrapped in `Effect.fn("qadi.readScoped")` | vitest exit 1; local/served span equality and the missing-id span rows fail |
| `route-switch` | `switch` on the row | house-style exit 1; `PortAccess.ts:348 [no-switch]` |
| `route-relationship-bare` | relationship port given a bare call | tsc-src exit 2; `PortAccess.ts(283,5) TS2322` (type `undefined` required) |
| `scoped-port-hand-union` | `ScopedPort` as a hand union plus `"CustomPredicate"` | tsc-src exit 2; `PortAccess.ts(277,7) TS2741` at the completion table |

## Deviations from Plan

### Plan defects

1. **The derivation patch's `LEAF_NEEDS` import is type-only, the plan's check wants a value import.** `spike/f.patch` writes `import type { LEAF_NEEDS } from "./LeafNeeds.ts";` (enough for `typeof`), while this task's own `scoped-route derived` (and the plan truth) require `LEAF_NEEDS` imported "as a value". Before: `import type { LEAF_NEEDS } from "./LeafNeeds.ts";` After: `import { LEAF_NEEDS } from "./LeafNeeds.ts";`, the form the routing patch also uses. `pnpm circular`, typecheck, house-style and lint stay clean (the module is already a value import of the routing commit, which the bench measured).
2. **The planned "`Always` arm returning false" variant cannot be seen failing.** The only `Always` leaf is `HasRelationship`, whose port has `bare: undefined`, so `readScoped` never consults the `Always` arm (the `bare !== undefined` guard comes first). `variant` ran the edit against `PortFacts.characterisation.test.ts`, `LeafNeeds.test.ts` and `PortAccess.test.ts` and reported `variant route-always-false was not seen failing`; nothing was recorded for it. That `Always` arm is unobservable by construction, which is the by-type guarantee of T-90-23, and plan 13's scorer should treat a mutant there as EQUIVALENT. The substitute block `route-relationship-bare` shows the guarantee itself failing at compile time when the relationship port is given a bare call. The plan's `tsc-src` hand-union acceptance (names TS2741) holds.
3. **Planned vitest kinds adjusted:** none beyond the above; the `route-annotation-after-failure` edit places the annotation after the failing `return` (unreachable), which is the reading under which "the question is missing from the span".

### Choices the plan left open

- The patch's prose for `readScoped`, `ScopedPort`, `ScopedCall`, `readActed`, `askRelationship`, `askSignature` and the read-section banner was kept as measured; only the `ScopedLeaf.ts` header sentence was reworded to the plan's wording (comment only, inside the declared lines 8-19).

## Known Stubs

None.

## Threat Flags

None. T-90-23 is mitigated by `BareOf<"RelationshipResolver">` being `undefined` (the `route-relationship-bare` variant fails TS2322), the 44-row route table and `LeafNeeds.test.ts`; T-90-24 by the `ByScope` arm being `isResourceScoped` (the always-true variant fails the route table); T-90-25 by annotate-before-fail (the reordered variant fails the span rows).

## Task Commits

1. **Task 1: scoped ports derived from the leaf rows** - `c7660557` `refactor(90-12): derive the scoped ports from the leaf rows`
2. **Task 2: every scoped read routed off its leaf row** - `9c12b14a` `refactor(90-12): route every scoped read off its leaf row`
3. **Task 3: the routing variants seen failing** - `bf39a490` `docs(90-12): record the routing variants`

## Not done

- No coverage, Stryker or bench run (plan 13 closes the mutation score; the bench of record is plan 06's).
- The seven scratch clones `r-byscope`, `r-always`, `r-order`, `r-fn`, `r-switch`, `r-hand`, `r-bare` remain under the scratch root; the close removes it.
- No requirement marked complete (the orchestrator does that at phase close).

## Self-Check: PASSED

Files found: `packages/core/src/PortAccess.ts`, `packages/core/src/LeafNeeds.ts`, `packages/core/src/ScopedLeaf.ts`, `90-RED-EVIDENCE.md`. Commits `c7660557`, `9c12b14a`, `bf39a490` are ancestors of HEAD.
