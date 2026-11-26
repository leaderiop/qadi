---
phase: QD-90-the-remaining-per-port-facts-live-on-the-port-description
plan: 10
subsystem: core
status: complete
tags: [port-description, span-name, type-level-check, breaking]

phase_base: 46174873c60e85bcd0c6702867c602cad8460310
plan_head_before: a72d60697f8f6f9b1a4160cac445a926c4402aa9
plan_head_after: 38cc5c6d72bc39914695cae19f3a6aec3137f22b

requires:
  - phase: QD-90-the-remaining-per-port-facts-live-on-the-port-description
    provides: PORT_NAMES and the import-free PortName.ts (plan 09), the pin file PortFacts.tst.ts (plan 04), the checks and variant modes (plans 02, 07)
provides:
  - PortDescription's SpanName type parameter and `span: SpanName`, each port module's own `const <x>SpanName` declaration
  - PortSpanOf and PortSpanName read from the registry in Ports.ts (same names, same values)
  - DistinctSpanNames, package-private in PortDerivation.ts, applied at PORTS
affects: [QD-90 plans 11 (the fixture), 14 and 15 (records, changeset, upgrade note)]

requirements-completed: []

actuals:
  tokens: 14000
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "a per-port fact is a module-private const whose `typeof` is a description type argument, and a registry-wide property of those facts is a `satisfies` on the registry"

key-files:
  created: []
  modified:
    - packages/core/src/PortName.ts
    - packages/core/src/PortDescription.ts
    - packages/core/src/PortDerivation.ts
    - packages/core/src/Ports.ts
    - packages/core/src/AttributeResolver.ts
    - packages/core/src/DecisionHistory.ts
    - packages/core/src/RelationshipResolver.ts
    - packages/core/src/CustomPredicate.ts
    - packages/core/src/SignatureHistory.ts
    - packages/core/test/PortName.tst.ts
    - packages/core/test/PortFacts.tst.ts
    - .planning/phases/QD-90-the-remaining-per-port-facts-live-on-the-port-description/90-RED-EVIDENCE.md

key-decisions:
  - "The spike's b and c patches were applied as measured, except that makePortDescription's SpanName bound is derived from the description's own `span` member and not written as a pattern literal, because the span-literal check refuses a `qadi.` literal in PortDerivation.ts."

duration: 30min
completed: 2026-11-26
---

# Phase 90 Plan 10: The Span on the Description Summary

**Each of the five port descriptions states its own span through a `typeof` const, `PortSpans` is gone, `PortSpanOf`/`PortSpanName` are read from the registry, and `DistinctSpanNames` at `PORTS` makes a shared or non-literal span a compile error (TS1360).**

## What changed

- `PortName.ts`: exports exactly `PORT_NAMES` and `PortName`, no import; `interface PortSpans` and the two span types are gone.
- `PortDescription.ts`: `SpanName extends` the `qadi.` pattern, defaulted to it, after `Asks`; `span: SpanName`.
- `PortDerivation.ts`: `makePortDescription` carries `SpanName`; `DistinctSpanNames` (with unexported `IsPattern` and `SpanOffenders`) is exported from the module and not from the barrel.
- `Ports.ts`: `PortSpanOf<N> = PortTypes[N]["span"]`, `PortSpanName = PortSpanOf<PortName>`, `DescriptionOf<K>` passes `PortSpanOf<K>`, and `PORTS: PortTypes = { … } satisfies DistinctSpanNames<PortTypes>`.
- The five port modules each declare `const <x>SpanName = "qadi.…"` once and pass `typeof` it as the type argument and the const as the value.
- `PortName.tst.ts`: the declared edit (header, imports, the third test holding only its `not.toBeAssignableTo` row).
- `PortFacts.tst.ts`: `DistinctSpanNames` over a six-entry record (`unknown`), the real registry (`unknown`), two adjacency/encoding records (`qadi.acted` with `qadi.actedX`, `qadi.Acted` with `qadi.acted`: both `unknown`), a duplicate, a widened span and the registry with AttributeResolver claiming `"qadi.acted"` (each `never`); and per port `Omit<PortTypes[K], "span">` not assignable to `DescriptionOf<K>`, with the positive anchor.

## Checks run (at the feature commit)

| Check | Result |
| ----- | ------ |
| `pnpm typecheck`, and `npx tsc -p tsconfig.test.json --noEmit` before the first edit | clean (the editor's TS2345 at `PortFacts.characterisation.test.ts:194` is not real under the repo's compiler) |
| `node scripts/check-house-style.mjs` | 648 files clean, no budget moved |
| `node scripts/check-api-surface.mjs` | 943 exports documented |
| `node scripts/run-tstyche.mjs` (both passes, every type test) | 81 files, 441 tests passed |
| `pnpm circular` | no cycle |
| `90-check.mjs suite` | 5314 tests in 214 files, all passed |
| `90-check.mjs port-facts names`, `port-facts spans` | pass |
| `90-check.mjs commit` (both subjects), `trailers` | pass; 31 commits since phase_base, each with the one trailer |
| `90-pinned-check.mjs` | `pinned: 408 files hold their base text, 3 of 3 born files held, 2 of 5 declared edits applied` (exit 0) |

## Seen failing (8 blocks in 90-RED-EVIDENCE.md, on scratch clones of the feature commit)

| Label | Edit | Result |
| ----- | ---- | ------ |
| `span-shared-claim` | relationship span const set to `"qadi.acted"` | tsc-src exit 2; `Ports.ts(65,3) TS1360` |
| `span-widened-string` | custom-predicate span const annotated `string` | tsc-src exit 2; `CustomPredicate.ts TS2344` (the bound) and `Ports.ts TS1360` |
| `span-widened-pattern` | the same const annotated with the pattern | tsc-src exit 2; `Ports.ts(65,3) TS1360` |
| `span-literal-house-style` | `"qadi.attribute"` in `PortAccess.ts` | house-style exit 1; `[no-port-span-key-literals]` |
| `span-literal-port-facts` | the same | `port-facts spans` exit 1 |
| `span-declared-twice` | a second span const for `"qadi.attribute"` | `port-facts spans` exit 1 |
| `span-check-always-unknown` | `DistinctSpanNames` always `unknown` | tstyche exit 1; the three `never` pins fail |
| `span-optional` | `PortDescription.span` optional | tstyche exit 1; the span-required pin and the span pins fail |

`seen-failing packages/core/test/PortFacts.tst.ts` reports 7 titles, each seen failing.

## Task Commits

1. **Task 1: the span on the description, the check and the pins** - `71885b1e` `feat(90-10)!: a port description states its own span name`
2. **Task 2: the span variants seen failing** - `38cc5c6d` `docs(90-10): record the span variants`

## Deviations from Plan

### Choices the plan left open

1. **The `SpanName` bound in `makePortDescription`.** The spike's patch wrote the bound as the `qadi.` template literal; `90-check.mjs port-facts spans` refuses any `qadi.` literal in `PortDerivation.ts`. The bound is the description's own member type, `PortDescription<N, Self, Shape, Args, A, E, P, Span, Asks>["span"]` (the same pattern by default), so the file holds no span literal and the inference of each port's literal span is unchanged.
2. **Patch application.** `b.patch`'s `PortName.ts` header hunk did not apply (plan 09 reworded that comment), so `PortName.ts`'s header was written by hand to the same meaning; the other hunks applied as measured. Doc comments of `PortDescription.span` and `DistinctSpanNames` state what the check refuses and what it does not (a rename to a new literal compiles and is caught by the span pins).
3. **Extra pins.** The plan's adjacency and encoding truths (`qadi.acted` with `qadi.actedX`; `qadi.Acted` with `qadi.acted`) got a pin each, as two more rows of the distinct-span test. The fixture and `PORT_FIXTURES` pins of the spike's `tests.patch` and its `PortDescription.test.ts` line belong to plan 11 and were left out.
4. **An extra evidence block**, `span-optional`, for the "span is a required member" test, which none of the plan's five variants made fail; and a second widened-span variant (the pattern annotation) so a block names `Ports.ts` with TS1360.

### Plan defects

1. **Task 2's duplicate-declaration variant** names the second const `attributeSpanName2`. `port-facts spans` counts declarations by the pattern `const <name>SpanName = "qadi.…"`, which a name ending in `2` does not match, so the variant passed ("was not seen failing"). Before: `const attributeSpanName2 = "qadi.attribute"`. After: `const attributeSecondSpanName = "qadi.attribute"`. The check was not changed.
2. **Task 2's widened-span variant** says `string`, whose error lands at the bound in `CustomPredicate.ts` (TS2344), while the acceptance criterion wants the `tsc-src` blocks to name `Ports.ts`. Both were recorded (`string` and the pattern annotation), so a block names `Ports.ts` TS1360.

### Process incident

`state.advance-plan` was run twice by mistake (a second call was issued while inspecting the result of the first, against the run rules). STATE.md's `Plan:` line therefore reads `12 of 16` and not `11 of 16`; `progress.completed_plans` (61), ROADMAP.md (`10/16`, 90-10 checked) and the metrics row are right. STATE.md was not hand-edited; the orchestrator should correct the counter.

## Known Stubs

None.

## Threat Flags

None. T-90-19 (a port claiming another's span) is mitigated by `DistinctSpanNames` at `PORTS`, seen failing; T-90-20 (a span silently renamed) by the span pins and the facts golden, unchanged and green.

## Not done

- No coverage, Stryker or bench run (the core mutation close is plan 13's).
- The scratch clones `span-dup`, `span-wide`, `span-pat`, `span-lit`, `span-always`, `span-two` and `span-optional` remain under the scratch root; the close removes the root.
- Spec records (overview, behaviors, ADR-QD-094/163/134) are plan 14's.

## Denied commands

None.

## Self-Check: PASSED

- Every file listed above exists; commits `71885b1e` and `38cc5c6d` are ancestors of HEAD; `90-check.mjs commit` accepted both subjects with exactly their paths; `90-check.mjs trailers` passes; no `.vitest/` directory exists.
