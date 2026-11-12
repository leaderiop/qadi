---
phase: 22-scoped-port-read
plan: 03
subsystem: core
tags: [port-description, scoped-read, asks, readScoped, effect-v4, tstyche]

requires:
  - phase: 22-scoped-port-read
    provides: "RED tests from 22-02 (D-07 table, PortAccess.tst.ts, PortAsks.tst.ts); D-02 = A and D-05 = state-once from 22-01"
provides:
  - "PortDescription.asks: the one leaf-to-request mapping, stated per port"
  - "One plain readScoped: a missing resource id leaves only the port span and fails with MissingResourceId"
  - "Every read takes its policy leaf (askActed replaces askActedAny and askActedForResource)"
  - "servingFor derives from asks; PortServingFacet.leaves and ServedLeaves are gone"
affects: [22-04]

plan_head_before: 6d4c7410b52a3b1c49e420af2cf5e1a0197cc200
plan_head_after: 7d8bd0211db3f9096a7931223cd5f2a1513ad288

actuals:
  tokens: 60000
  tasks: 3
  commits: 1

tech-stack:
  added: []
  patterns:
    - "A port description carries an exact per-port Asks object (LeafRequests<P>) with a covariant default, so d.asks[tag] resolves through DescriptionOf<K> without a cast"
    - "Overloaded askActed keeps toPredicate's public error type unchanged: the any-acted leaf overload cannot fail with MissingResourceId"

key-files:
  created: []
  modified:
    - packages/core/src/PortDescription.ts
    - packages/core/src/PortServing.ts
    - packages/core/src/Ports.ts
    - packages/core/src/PortDerivation.ts
    - packages/core/src/PortDoubles.ts
    - packages/core/src/PortAccess.ts
    - packages/core/src/PortRemote.ts
    - packages/core/src/Walk.ts
    - packages/core/src/Predicate.ts
    - packages/core/src/Resource.ts
    - packages/core/src/AttributeResolver.ts
    - packages/core/src/DecisionHistory.ts
    - packages/core/src/RelationshipResolver.ts
    - packages/core/src/CustomPredicate.ts
    - packages/core/src/SignatureHistory.ts
    - packages/core/test/PortAccess.test.ts
    - packages/core/test/PortAccess.tst.ts
    - packages/core/test/PortAsks.tst.ts
    - packages/core/test/PortRemote.test.ts
    - packages/core/test/PortConformance.test.ts
    - packages/core/test/PortDescription.test.ts
    - packages/core/test/SignatureHistory.test.ts
    - packages/core/test/helpers.ts

key-decisions:
  - "PortDescription takes P (the request as a leaf asks it, default Args) at the 7th position and an exact Asks at the 9th, so generic d.asks[tag] correlates without a cast"
  - "PortServingFacet.declare takes ({ names, asked }): an opt-in port is declared exactly when one of its leaves asks; the own-records pseudo-name is gone"
  - "askActed is overloaded on AnyActedLeaf so toPredicate's error type does not gain MissingResourceId"

requirements-completed: [SCOPE-01, SCOPE-02, SCOPE-03, SCOPE-04, SCOPE-05, WX-04, WX-06]

coverage:
  - id: D1
    description: "A missing resource id leaves exactly the port span and fails with MissingResourceId carrying the relation, on all three scoped ports (D-07, GREEN)"
    requirement: "SCOPE-02"
    verification:
      - kind: unit
        ref: "packages/core/test/PortAccess.test.ts#a missing resource id still leaves its question on the span (D-07)"
        status: pass
    human_judgment: false
  - id: D2
    description: "No read takes loose strings; each takes its leaf (and the resource where needed)"
    requirement: "SCOPE-03"
    verification:
      - kind: other
        ref: "pnpm test:tstyche packages/core/test/PortAccess.tst.ts"
        status: pass
    human_judgment: false
  - id: D3
    description: "Each description has asks, the facet has no leaves, and each ask is a request the facet reads a name from"
    requirement: "SCOPE-04"
    verification:
      - kind: other
        ref: "pnpm test:tstyche packages/core/test/PortAsks.tst.ts"
        status: pass
    human_judgment: false
  - id: D4
    description: "A served name is what a leaf's request asks, for every port and tag (law, 200 runs each)"
    requirement: "SCOPE-05"
    verification:
      - kind: property
        ref: "packages/core/test/PortRemote.test.ts#a served name is what a leaf's request asks (ARCH-70)"
        status: pass
    human_judgment: false
  - id: D5
    description: "Existing evaluation, toPredicate, http and acceptance behaviour unchanged"
    requirement: "WX-04"
    verification:
      - kind: unit
        ref: "pnpm test (173 files, 4497 tests); pnpm test:bdd (34 files, 568 tests)"
        status: pass
    human_judgment: false
  - id: D6
    description: "No budget in scripts/check-house-style.mjs edited; lint, circular and typecheck clean"
    requirement: "WX-06"
    verification:
      - kind: other
        ref: "git diff --name-only 7f64db9a -- scripts is empty; pnpm lint, pnpm circular, pnpm typecheck"
        status: pass
    human_judgment: false

duration: 70min
completed: 2026-11-11
status: complete
---

# Phase 22 Plan 03: One scoped port read, GREEN Summary

**Each port description now states, once, the request every policy leaf asks (`asks`); the five reads take their leaf, one plain `readScoped` serves the three resource-scoped ports with a single span, and `servingFor` derives from `asks` so the serving facet keeps no second leaf map.**

## Performance

- **Tasks:** 3 (tasks 1 and 2 land in one commit as the plan instructs; task 3 is verification only and has no commit)
- **Files modified:** 23 (15 src, 8 test), none created

## Counts, before and after

| Thing | Before | After |
| ----- | ------ | ----- |
| Scoped-read entry points | `askActedAny`, `askActedForResource`, `askRelationship`, `askSignature`, plus a nested `requireResourceId` helper | `askActed` (overloaded), `askRelationship`, `askSignature`, `askCustom`, all through one `readScoped` |
| Spans on a missing resource id | port span plus nested `qadi.requireScopedResourceId` (acted, signature) | the port span only, on every scoped port |
| Leaf-to-request mappings | two: the reads and `PortServingFacet.leaves` | one: `PortDescription.asks` |
| `ServedLeaves`, `leaves`, `NodeOf`, `leafName` | present | removed |
| Test files / tests (vitest) | 173 files, 4497 tests with 2 D-07 rows RED | 173 files, 4497 tests, all pass |
| tstyche | 12 RED assertions across two files | 46 files, 218 tests, 427 assertions pass |

## Spelling worth keeping (22-04 documents these)

- `declare` on the facet: `declare: (heard: { readonly names: ReadonlyArray<string>; readonly asked: boolean }) => Pick<PortServing, N>`; call sites destructure `({ names, asked })`. The signature facet's is `({ asked }) => asked ? { SignatureHistory: { signatures: "own-records" } } : {}`.
- The P extractor is `AskedOf<D>` in `packages/core/src/Ports.ts`: `D extends { readonly asks: LeafRequests<infer P> } ? P : never`; `DescriptionOf<K>` passes it as the description's `P`.
- `ReadSite`, `LeafRequests` and `LeafOf` are declared in `packages/core/src/PortDescription.ts` (`LeafOf` moved there from `PortServing.ts`). `ReadSite` is `{ subject: AuthSubject; resource: Resource | undefined }`; `LeafRequests<P>` is `{ readonly [T in Policy["_tag"]]?: (leaf: LeafOf[T], site: ReadSite) => P }`.
- `readScoped` is a plain `Effect.gen` in `PortAccess.ts`: with no resource id it annotates the question on the port span (`scope: "Resource"`) and fails `MissingResourceId({ relation })`; otherwise it completes the request through a closed `completeRequest` table and calls `readPort`.

## Task Commits

1. **Tasks 1 and 2: asks on each description, derived serving, one scoped read, leaf-taking reads** - `7d8bd021` (feat)
2. **Task 3: verification** - no commit (no code change)

**Plan metadata:** the STATE/ROADMAP close-out commit follows.

## Deviations from Plan

**1. [Rule 1 - Bug] Optional-key `asks` cannot be called per tag without `!`, and a registry-indexed `asks` lost its correlation (TS2536)**
- **Found during:** Task 1
- **Fix:** `PortDescription` takes an explicit `P` (request as a leaf asks it) and a separate exact `Asks extends LeafRequests<P>` with a covariant default; each port module declares a module-private exact `...Asks` const and passes `typeof ...Asks`. `pose` widened to `Args | P`.
- **Files modified:** PortDescription.ts, Ports.ts, PortDerivation.ts, PortDoubles.ts and the five port modules
- **Commit:** `7d8bd021`

**2. [Rule 1 - Bug] Unifying `askActed` put `MissingResourceId` in toPredicate's public error channel**
- **Found during:** Task 1 (Predicate typecheck, TS2375)
- **Fix:** `askActed` is overloaded: an `AnyActedLeaf` overload (scope not Resource, cannot fail that way) and the general overload over a private `readActed`; `isAnyActedLeaf` narrows in `Predicate.ts`. No public type change, no dead code.
- **Commit:** `7d8bd021`

**3. [Rule 3 - Blocking] Test helper `leafOf(tag, policy)` added to `helpers.ts`**
- Narrowing a policy to a leaf in tests without `as` needs a guard-based helper; used by PortAccess and PortRemote tests.

**4. Stale test row names renamed** in `PortAccess.test.ts` (`askActedAny`, `askActedForResource` no longer exist).

**5. New public exports.** `LeafOf`, `ReadSite`, `LeafRequests` are exported from `@qadi/core`'s port description module; 22-04 must list them in `spec/overview.md` (gate 13, `pnpm spec:api`). `LeafOf` is the one the plan did not name.

**Total deviations:** 2 bug fixes, 1 blocking, 2 notes. No scope change.

## TDD Gate Compliance

RED commits are in 22-02 (`aa595231`, `78a14584`, `e7c8d96c`). The GREEN commit is `7d8bd021` (`feat(22-03)`). No refactor commit.

## Issues Encountered

- The plan's verify greps first failed because the removed names survived in doc comments and `.asks.` occurred four times; reworded the comments and added the `<port>Port.asks.<Tag>(leaf, ...)` pattern to the section comment, then all greps passed.
- `pnpm lint` shows pre-existing oxlint warnings in other packages, none in core files touched here.

## Known Stubs

None

## Threat Flags

None. The plan's threat register (T-22-08..12) is mitigated by `readScoped` (a missing id cannot reach the port), the unchanged evaluation and http suites, and the law and property tests over `asks` and `servingFor`. No new endpoint, auth path or file access.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

22-04 writes ADR-QD-134, the behaviour and invariant entries, the `spec/overview.md` rows for `LeafOf`/`ReadSite`/`LeafRequests`, rewrites AGENTS.md §5's sentence, adds the changeset (`@qadi/core` minor), and re-checks the mutation scores against `22-mutation-base.json`.

## Self-Check: PASSED

- FOUND: packages/core/src/PortAccess.ts, packages/core/src/PortDescription.ts, packages/core/test/PortAsks.tst.ts
- FOUND commit: 7d8bd021 (ancestor of HEAD)

---
*Phase: 22-scoped-port-read*
*Completed: 2026-11-11*
