---
phase: QD-90-the-remaining-per-port-facts-live-on-the-port-description
plan: 11
subsystem: core
status: complete
tags: [port-description, fixture, tabulate-ports, breaking]

phase_base: 46174873c60e85bcd0c6702867c602cad8460310
plan_head_before: faaff622f4143c499f8dc0cab35f360d74576474
plan_head_after: 49909ec157cd7154fdddd89cd4e484c2043e7465

requires:
  - phase: QD-90-the-remaining-per-port-facts-live-on-the-port-description
    provides: the span on the description (plan 10), the pin file PortFacts.tst.ts (plan 04), the checks and variant modes (plans 02, 07)
provides:
  - PortDescription's FixtureData type parameter (default never) and the required `fixture` member
  - each port module's builder above its description, taken by reference as the description's fixture; customPredicatePort.fixture is the answers-to-functions arrow moved from Ports.ts
  - PortFixtureData as a mapped type over the registry and PORT_FIXTURES as tabulatePorts((d) => d.fixture), through a third tabulatePorts overload
affects: [QD-90 plans 12-15 (scoped read, mutation, records, changeset and upgrade note)]

requirements-completed: []

actuals:
  tokens: 9000
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "a per-port builder is declared above the description that names it by reference, so a description never uses a declaration before it is made"

key-files:
  created: []
  modified:
    - packages/core/src/PortDescription.ts
    - packages/core/src/PortDerivation.ts
    - packages/core/src/Ports.ts
    - packages/core/src/AttributeResolver.ts
    - packages/core/src/DecisionHistory.ts
    - packages/core/src/RelationshipResolver.ts
    - packages/core/src/CustomPredicate.ts
    - packages/core/src/SignatureHistory.ts
    - packages/core/test/PortDescription.test.ts
    - packages/core/test/PortFacts.tst.ts
    - .planning/phases/QD-90-the-remaining-per-port-facts-live-on-the-port-description/90-RED-EVIDENCE.md

key-decisions:
  - "The spike's d.patch was applied as measured; FixtureDataOf, FixtureBuilders and FixtureVisitor stay unexported, so the API surface stays at 943."

duration: 25min
completed: 2026-11-26
---

# Phase 90 Plan 11: The Fixture on the Description Summary

**Each of the five port descriptions states its own `fixture`; `PortFixtureData` and `PORT_FIXTURES` are read from the registry through a third `tabulatePorts` overload, with their names and shapes unchanged and the API surface at 943.**

## What changed

- `PortDescription.ts`: a last type parameter `FixtureData = never` and a required member `fixture: (data: FixtureData) => Layer.Layer<Self>`, documented with the plain-serializable-data rule.
- `PortDerivation.ts`: `makePortDescription` carries `FixtureData` (inferred from the spec's `fixture`).
- `Ports.ts`: `PortFixtureData` is `{ readonly [K in PortName]: FixtureDataOf<PortTypes[K]> }`; `PORT_FIXTURES` is `tabulatePorts((d) => d.fixture)`; the third overload sits beside the layer overload; `fixturePortsLayer` reads `d.fixture`; `DescriptionOf<K>` passes `PortFixtureData[K]`. `FixtureDataOf`, `FixtureBuilders` and `FixtureVisitor` are unexported.
- The four builder-backed ports move `attributeResolverFromRecord`, `decisionHistoryFromEvents`, `relationshipResolverFromEdges` and `signatureHistoryFromSignatures` above their descriptions and pass them by reference; `customPredicatePort.fixture` is the arrow that mapped answers to functions in `Ports.ts`.
- `PortDescription.test.ts`: exactly the declared line `  fixture: () => named(undefined, 0),` after base line 120.
- `PortFacts.tst.ts`: per port `Omit<PortTypes[K], "fixture">` not assignable to `DescriptionOf<K>` (the test is retitled "span and fixture are required members of a description"), and a `toBe` pin of `typeof PORT_FIXTURES` written out. The born `PortFixtureData` pin is unedited.

## Checks run (at the feature commit)

| Check | Result |
| ----- | ------ |
| `pnpm typecheck` (`tsc -b` and `tsc -p tsconfig.test.json`) | clean |
| `node scripts/check-house-style.mjs` | 648 files clean |
| `node scripts/check-api-surface.mjs` | 943 exports documented |
| `node scripts/run-tstyche.mjs` | 81 files passed, 442 tests passed, 2 skipped (the tool-characterisation blocks) |
| `pnpm circular` | no cycle |
| `90-check.mjs port-facts` (names, spans, fixtures, serving) | pass; `PortServing.ts` is untouched |
| `90-check.mjs suite` | 5314 tests in 214 files, all passed |
| `90-check.mjs commit` (both subjects), `trailers` | pass; 35 commits since phase_base, each with the one trailer |
| `90-pinned-check.mjs` | `pinned: 408 files hold their base text, 3 of 3 born files held, 3 of 5 declared edits applied` (exit 0) |

## Seen failing (4 blocks in 90-RED-EVIDENCE.md, on scratch clones of the feature commit)

| Label | Edit | Result |
| ----- | ---- | ------ |
| `fixture-missing` | `fixture` removed from `signatureHistoryPort` | tsc-src exit 2; `SignatureHistory.ts(281,25) TS2345` |
| `fixture-builder-below` | `attributeResolverFromRecord` moved below `attributeResolverPort` | tsc-src exit 2; `AttributeResolver.ts(216,12) TS2448` and `TS2454` |
| `fixture-optional` | `PortDescription.fixture` made optional | tstyche exit 1; the `PortFixtureData` pin, the required-member test and the `PORT_FIXTURES` pin fail |
| `fixture-negated` | `customPredicatePort.fixture` answers `!answer` | vitest exit 1; three tests in `Ports.test.ts` and the characterisation fail |

`seen-failing packages/core/test/PortFacts.tst.ts` reports 8 titles, each seen failing.

## Task Commits

1. **Task 1: the fixture on the description and its pins** - `96009eb5` `feat(90-11)!: a port description states its own fixture`
2. **Task 2: the fixture variants seen failing** - `49909ec1` `docs(90-11): record the fixture variants`

## Deviations from Plan

### Choices the plan left open

1. **`PortDerivation.ts` hunk applied by hand.** `d.patch`'s one hunk in `PortDerivation.ts` did not apply because plan 10 changed the `SpanName` bound the hunk's context carries (it now reads the description's own `span` member type). The same three edits were made: a `FixtureData` type parameter after `SpanName`, passed through the `Omit<PortDescription<...>>` spec and the return type. Every other hunk applied as measured.
2. **Test pins written by hand, not from `tests.patch`.** `tests.patch` is built on the spike's own chain and also carries plan 10's span pins; only its fixture parts were added, and the earlier test title was renamed to cover both facts. The `PORT_FIXTURES` pin and the five `Omit<..., "fixture">` pins are as in the patch.

### Plan defects

None.

## Known Stubs

None.

## Threat Flags

None. T-90-21 (fixture data carrying non-serializable values) is mitigated: `PortFixtureData`'s shape is pinned unchanged and devtools' readers compile unedited. T-90-22 (a builder used before its declaration) is mitigated by the builders' placement, the suite loading the barrel and the TS2448 variant, seen failing.

## Not done

- No coverage, Stryker or bench run (the core mutation close is plan 13's).
- The scratch clones `fix-missing`, `fix-order`, `fix-optional` and `fix-negated` remain under the scratch root; the close removes the root.
- Spec records (overview, behaviors, ADR-QD-094/163/134) are plan 14's.

## Denied commands

None.

## Self-Check: PASSED

- Every file listed above exists; commits `96009eb5` and `49909ec1` are ancestors of HEAD; `90-check.mjs commit` accepted both subjects with exactly their paths; `90-check.mjs trailers` passes; no `.vitest/` directory exists.
