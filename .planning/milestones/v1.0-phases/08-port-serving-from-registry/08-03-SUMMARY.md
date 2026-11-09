---
phase: 08-port-serving-from-registry
plan: 03
subsystem: core
tags: [arch-53, adr-qd-114, serving-facet, ports, serv-02, serv-03, ccr-qd-392]
requires: ["08-01", "08-02"]
provides:
  - "PortServing.ts: PortServing and PortServingOf (moved), PortServingFacet, ServedLeaves"
  - "PortDescription.serving: a required PortServingFacet<N, Args>"
  - "answerRemotely admits through d.serving; servingFor derives from every facet"
  - "PortWire without asked"
  - "spec/overview.md Revision 1.76"
affects: [08-04, 08-06]
key-files:
  created:
    - packages/core/src/PortServing.ts
    - packages/core/test/PortServing.tst.ts
  modified:
    - packages/core/src/PortDescription.ts
    - packages/core/src/PortRemote.ts
    - packages/core/src/PortWire.ts
    - packages/core/src/PortWireEncode.ts
    - packages/core/src/AttributeResolver.ts
    - packages/core/src/DecisionHistory.ts
    - packages/core/src/RelationshipResolver.ts
    - packages/core/src/CustomPredicate.ts
    - packages/core/src/SignatureHistory.ts
    - packages/core/src/index.ts
    - packages/core/test/PortDescription.test.ts
    - packages/core/test/PortRemote.test.ts
    - spec/overview.md
decisions:
  - "D-01 branch taken: RUN (08-01-SUMMARY d01_outcome: approved)"
  - "Facet names as planned: PortServingFacet, ServedLeaves; the dispatcher leafName and type NodeOf stay module-private in PortRemote.ts"
  - "The facet consts are module-private (attributeServing, actedServing, relationshipServing, customServing, signatureServing), each beside its description"
metrics:
  duration: "~35 min"
  completed: 2026-11-08
status: complete
actuals:
  tokens: 27700
  tasks: 3
  commits: 4
plan_head_before: f86dfd3667eddd4859b659a35ebca29f8609292c
plan_head_after: 9eafd8915989620e40a0c2f8aae5ded27f12440d
---

# Phase 8 Plan 3: Serving facet on every port description Summary

Each of the five port descriptions now states a `serving` facet; `answerRemotely` admits through it, `servingFor` collects and declares through it, and `PortWire` no longer carries `asked`. The admission table, the collector interface, the per-node name collector and the five hand-written sets are gone.

## TDD

### RED

Test: "the port's own facet names the one name an allowlist admits" (one per port, in `remoteCase`) in `packages/core/test/PortRemote.test.ts`. `CASES` gained an `asked` per row (`"clearance"`, `"approved"`, `"owner"`, `"isOwner"`, `undefined`), and Tests B and C were added in a describe "a declaration is admitted through the port's facet".

Why it failed: no description had a `serving` member yet, so `d.serving.asked` threw `TypeError: Cannot read properties of undefined (reading 'asked')` inside the target.

Evidence: `pnpm --silent vitest run --project core packages/core/test/PortRemote.test.ts -t 'own facet names' --reporter=tap-flat`, exit 1. `gsd_run check tdd-red-evidence` returned `RED_EVIDENCE_OK` (`target_test_failed`).

Semantic assessment: the target executed and failed on the planned access (the missing facet), not on an import, syntax or fixture fault. Tests B and C passed at the RED commit, because the behavior they pin (empty required lists refuse `constructor` and `__proto__` without a store call; open ports with no list admit any name) already held. They are regression pins for the refactor, not RED tests, and the plan's `<behavior>` lists them as such.

### GREEN

Task 1 landed the facets and the facet-based admission. All 2175 core and http tests passed.

### REFACTOR (Tasks 2 and 3)

`servingFor` derived from the facets; `PortWire.asked` removed. Tests D-F and `PortServing.tst.ts` were written after the facets existed, so they passed on first run; the unchanged `servingFor` tests ("exact declaration", "signature only when asked", generated-policy property) are the guard for the refactor, and they passed untouched.

### Commits

- `19453fa` test(08-03): failing tests for admission through each port's serving facet
- `3fbbb04` feat(08-03): every port states its serving facet and answerRemotely admits through it
- `cbb4a80` refactor(08-03): derive servingFor from every port's serving facet
- `9eafd89` refactor(08-03): PortWire loses asked; the overview names the serving facet

## Final exported names (cited by plans 08-04 and 08-06)

From `packages/core/src/PortServing.ts`, type-only, no runtime export (so the `export *` barrel leaks nothing):

- `PortServing`, `PortServingOf` (moved verbatim from `PortRemote.ts`; still importable from `@qadi/core`)
- `PortServingFacet<N extends PortName, Args extends ReadonlyArray<unknown>>` with `allowlist`, `leaves`, `asked`, `admitted`, `declare`
- `ServedLeaves`

Module-private: `LeafOf`, `AllowlistOf`. In `PortRemote.ts`, private: `NodeOf`, `leafName`. No renames from the plan. `PortServing.ts` imports only `type Policy` and `type PortName`; `pnpm circular` is clean.

`AllowlistOf<S>` is `undefined extends S[keyof S] ? "open" : S[keyof S] extends ReadonlyArray<string> ? "required" : "opt-in"`. No `as`, `!`, `any` or `switch` was needed anywhere.

`PortServing.tst.ts` pins the five-member shape, the required `serving` member (`Omit<..., "serving">` is not a description), the five allowlist words, and that a DecisionHistory facet whose word is `"required"` is not that port's facet.

## spec-revise outcome (cited by plan 08-06)

`spec/overview.md` Revision **1.75 -> 1.76** (2026-11-08): "PortServing and PortServingOf move to PortServing.ts beside the new PortServingFacet and ServedLeaves; PortDescription gains serving; PortWire loses asked (ARCH-53, ADR-QD-114, CCR-QD-392)". Rows edited: `PortDescription`/`PortShape`/`PortScript`, `PortWire`/`DecodedQuestion`, and `PortServing`/`PortServingOf`/`servingFor` (Source now `PortServing.ts` and `PortRemote.ts`). One row added for `PortServingFacet`/`ServedLeaves`. Called with explicit `--date 2026-11-08` (the parsing defect 08-01 logged).

## Measured gates

| Check | Before | After |
| ----- | ------ | ----- |
| `ADMITTED` in `PortRemote.ts` | 2 | 0 |
| `d.serving.admitted(serving)` in `PortRemote.ts` | 0 | 1 |
| `interface Collector` / `collectNames` code lines | 3 | 0 |
| `new Set<string>()` in `PortRemote.ts` | 5 | 0 |
| port-reading leaf tag strings in `PortRemote.ts` code | 5 | 0 |
| port or declaration-field names inside `servingFor` | 5 | 0 |
| `readonly asked` in `PortWire.ts` and `PortWireEncode.ts` | 2 | 0 |
| `wire.asked` under `packages/` | 1 | 0 |
| `asked` inside a `portWire({...})` call, per module | 1 | 0 |
| `Effect.fnUntraced` in `packages/*/src` | 3 | 3 |

Green: `pnpm vitest run --project core --project http --project devtools` (107 files, 3118 tests), `pnpm typecheck`, `pnpm test:tstyche` (36 files, 162 tests), `pnpm lint` (house-style 407 files clean, 3 declared switches), `pnpm circular`, `pnpm spec:api` (863 exports), `spec-revise --check`, `pnpm spec:verify:strict` (21 pass), `pnpm spec:examples` (101 blocks).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Test constant typed too loosely**
- **Found during:** Task 1 typecheck
- **Issue:** `const refused = { _tag: "Refused", reason: "NotServed" }` widened `_tag` to `string`, so it did not satisfy `assert.deepStrictEqual` against `PortWireReply`.
- **Fix:** annotated it `PortWireReply`.
- **Files modified:** `packages/core/test/PortRemote.test.ts`
- **Commit:** 3fbbb04

**2. [Rule 2 - Missing] Stale wire doc in SignatureHistory.ts**
- **Found during:** Task 3
- **Issue:** the wire doc said a host opts in via `PortServing`; the facet is now where that is stated.
- **Fix:** it points at `signatureServing`, as the plan's step 3 asked.
- **Commit:** 9eafd89

The RED evidence record was written into the project directory (the classifier refuses paths outside it) and removed after the check; it was never committed.

## Known Stubs

None.

## Threat Flags

None. T-08-07 (required list cannot be admitted open): `admitted` is typed by the port's `PortServing` slot, the word is tied to the slot by type (pinned in `PortServing.tst.ts`), and Test B pins that an empty list refuses `clearance`, `constructor` and `__proto__` with the store never called. T-08-08 (signature port without opt-in): `declare([])` is `{}` for the opt-in port, and "serves the signature port only when a policy asks it" is untouched. T-08-09 (leaf mapped to the wrong port): Test D pins each of the six port-reading tags to exactly one port and no other tag to any, and the generated-policy property still passes.

## Self-Check: PASSED

- `packages/core/src/PortServing.ts` and `packages/core/test/PortServing.tst.ts` exist.
- Commits 19453fa, 3fbbb04, cbb4a80, 9eafd89 are ancestors of HEAD; `commits:` is measured from the plan ledger (4).
- `.planning/config.json` and `.planning/state.json` were not staged.
