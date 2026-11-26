---
phase: QD-90-the-remaining-per-port-facts-live-on-the-port-description
plan: 03
subsystem: testing
status: complete
tags: [core, characterisation, ports, scoped-read, red-evidence]

phase_base: 46174873c60e85bcd0c6702867c602cad8460310
plan_head_before: da2376fdb6fc409b6d3a725cbb5e0decca377080
plan_head_after: e8ecfa3cec02bd11b6705dc431a76579ea0f3db6

born_characterisation:
  commit: 8e04476105be1dd166bd1c1bf55f59f8d037bf8c
  file: packages/core/test/PortFacts.characterisation.test.ts
  rows: 72
  import_region:
    first_line: 24
    last_line: 61
    first_text: 'import { assert, describe, it } from "@effect/vitest";'
    last_text: 'import { collectingTracer, isolatedMetrics, leafOf } from "./helpers.ts";'
  row_groups:
    facts: 5
    order: 2
    metric_words: 5
    wire: 10
    served: 6
    scoped_read: 44

requires:
  - phase: QD-90-the-remaining-per-port-facts-live-on-the-port-description
    provides: 90-check.mjs (vitest, commit, scratch, variant, seen-failing, unchanged, trailers modes) from plan 02
provides:
  - packages/core/test/PortFacts.characterisation.test.ts, 72 rows green on the base source, every expectation a literal
  - 20 recorded scratch variants in 90-RED-EVIDENCE.md, after which every one of the 72 titles is seen failing
affects: [QD-90 plans 04 to 16 - the file is held byte for byte except its import lines (24 to 61), declared by exact lines in 90-pinned-check.mjs]

actuals:
  tokens: 16283
  tasks: 3
  commits: 2

tech-stack:
  added: []
  patterns:
    - "a characterisation whose expectations are test-owned literals and whose subject is read through the registry (tabulatePorts, forEveryPort, PORTS, PORT_FIXTURES)"
    - "a route table of literal rows, each stating outcome, spans, the question the span carries (decoded through the port's own span struct), the resource ids the port was asked with and the call count per interpreter series"

key-files:
  created:
    - packages/core/test/PortFacts.characterisation.test.ts
  modified:
    - .planning/phases/QD-90-the-remaining-per-port-facts-live-on-the-port-description/90-RED-EVIDENCE.md

key-decisions:
  - "The route table reads span names unfiltered and asserts the list equals the one port span. No evaluate runs in a read, so no evaluate-family name can appear, none is written in the file, and a nested helper span is seen instead of filtered away."
  - "The question a span carries is read through the port's own span struct (`attributes.question.decode`): acted and signature rows state `{ scope, resourceId }`, relationship rows state `{ relation, resourceId }` because that struct has no scope field."
  - "Imports come from the barrel (`../src/index.ts`) plus `PortAccess.ts`, `Matcher.ts`, `Policy.ts` and `./helpers.ts`, so a moved export changes no import line except where it leaves the barrel."

patterns-established:
  - "scratch variants named after the edit (`pf-<name>`) with a driver that applies exact-once replacements, region-limited, and refuses a replacement that matches other than once"

requirements-completed: []

coverage:
  - id: D1
    description: "the characterisation is green on the base source: 72 tests, 5 facts, 2 order, 5 metric-word, 10 wire, 6 served and 44 route rows"
    verification:
      - kind: unit
        ref: "node 90-check.mjs vitest packages/core/test/PortFacts.characterisation.test.ts (vitest: 72 tests in 1 files, all passed), tsc -p tsconfig.test.json --noEmit, node scripts/check-house-style.mjs, node 90-check.mjs scan-ids and scan-forbidden"
        status: pass
    human_judgment: false
  - id: D2
    description: "every row seen failing at least once on a scratch clone, recorded by 90-check.mjs variant"
    verification:
      - kind: unit
        ref: "node 90-check.mjs seen-failing packages/core/test/PortFacts.characterisation.test.ts (72 titles, each seen failing), node 90-check.mjs trailers (9 commits, each with the one trailer)"
        status: pass
    human_judgment: false

duration: 45min
completed: 2026-11-26
---

# Phase 90 Plan 03: The Port Facts Characterisation Summary

**A 72-row characterisation, green on the unchanged source, pins each port's name, method, span, allowlist term, default and fixture shape, the registry and metric-word order, every wire and served byte, and the 44-row scoped read table, and every row has been seen failing on a scratch clone.**

## Accomplishments

- `packages/core/test/PortFacts.characterisation.test.ts` (696 lines, commit `8e044761`). Rows:
  - facts: 5 (one per port through `tabulatePorts`, the fixture shape name read by providing each `PORT_FIXTURES` layer from empty data);
  - order: 2 (`forEveryPort` and `Object.keys(tabulatePorts(...))`, each the five names in registry order);
  - metric words: 5 (`portCallsTotal`, `portRetriesTotal`, `portTimeoutsTotal`, `servedPortCallsTotal`: five words; `predicatePortCallsTotal`: two; each read with `Metric.value` in an isolated registry, no `qadi_` literal);
  - wire: 10 (one encoded question and one encoded answer per port);
  - served: 6 (one `answerRemotely` round per port over a fixture layer, and `servingFor` over one policy per port);
  - scoped read: 44 (HasRelationship 4, HasActed 16 and HasNotActed 16 over `Resource`/`Any` x 4 site shapes x `evaluate`/`toPredicate`, HasSignature 8).
- The import block is lines 24 to 61 (first `import { assert, describe, it } from "@effect/vitest";`, last `import { collectingTracer, isolatedMetrics, leafOf } from "./helpers.ts";`): the one region `90-pinned-check.mjs` declares.
- 20 scratch variants, in 90-RED-EVIDENCE.md under `## port-facts-<name>`, each failing on rows only in its own area: spans (49: facts 5 and all 44 routes), methods (5), allowlists (6), none-names (5), fixture-names (5), tabulate-swap (3), metric-names-swap (4), predicate-names-swap (1), wire-question-rename (10), wire-answer-wrap (10), serving-for-reversed (1), acted-bare (12), acted-scoped (16), signature-bare (3), signature-scoped (4), id-check-skipped (18), annotation-removed (18), scoped-wrong-interpreter (6), scoped-effect-fn (24), predicate-counted-as-evaluator (10).
- The main tree's `packages/core/src` is unchanged (`node 90-check.mjs unchanged PortAccess.ts Ports.ts PortName.ts PortMetrics.ts` exits 0).

## Task Commits

1. **Tasks 1 and 2: the born file** - `8e044761` `test(90-03): pin the port facts on the base` (the file alone)
2. **Task 3: the evidence** - `e8ecfa3c` `docs(90-03): record the port facts rows seen failing` (90-RED-EVIDENCE.md alone)

## Deviations from Plan

### Plan defects (recorded, no check weakened)

**1. [Plan defect] "a port's span literal changed in `PortName.ts`" cannot fail a vitest row.**
- **Issue:** on the base, `PortName.ts` states each span only as a type (`PortSpans`). Vitest does not type-check, so the runtime span stays the description's own value and no row can read the edit.
- **Fix:** the `spans` variant changes each description's `span:` value in its port module (`"qadi.acted"` to `"qadi.actedX"`, and so on). The type edit in `PortName.ts` is what `tsc` would see, and `90-check.mjs port-facts` and the type pins of the later plans judge that half.

**2. [Plan wording] the span name list is not filtered to the five port span names.**
- The plan asks for a list "filtered to the five port span names". A read opens no evaluate-family span (nothing here calls `evaluate`), and a filter would hide a nested helper span, which is the property the row guards. Each row asserts the complete list of span names equals `[the port's span]`. No evaluate-family name or key is written.

### Choices the plan left open (recorded, most complete option taken)

3. **Question read per port.** The span's question is decoded through the port's own span struct. The relationship struct has no `scope` field, so its rows state `{ relation, resourceId }`; the others `{ scope, resourceId }`.
4. **Signature answer text.** The wire's encoded signature record lists `signerRole` before `signedAt` (the schema's field order); the literal says so.
5. **Wire rows are 10, not 5.** The plan's minimum was 5 wire rows; one row each for the question and for the answer of every port was written, since a variant on one half would otherwise leave the other half untested.
6. **Extra variants.** The plan lists the minimum edits; the `wire-answer-wrap`, `serving-for-reversed`, `acted-scoped`/`signature-scoped`, `scoped-wrong-interpreter` and `predicate-counted-as-evaluator` variants were added so that the answer, `servingFor`, the usable-id route rows and the interpreter series are each seen failing on their own.
7. **Imports from the barrel.** Public names come from `../src/index.ts` (so a name that moves inside the package changes no import); the package-private reads come from `../src/PortAccess.ts`. `PortRemote.ts`'s `answerRemotely` and `servingFor` are public and come from the barrel.

## Known Stubs

None.

## Threat Flags

None. The route table covers the plan's threat register: T-90-06 (id-less resource-scoped reads fail with `MissingResourceId` and never reach the port, 18 rows), T-90-07 (every `Any`-scoped row reaches its port and answers, 20 rows) and T-90-08 (every refused row leaves its question on the port span, 18 rows), each seen failing under a variant.

## Issues Encountered

- `Record<string, unknown>` in the first draft was refused by `90-check.mjs scan-forbidden`; the test uses core's `Resource` type instead.
- The first run of the wire rows pinned the signature answer's field order wrongly (written by hand as `signedAt` first); the base's schema order is the literal now.

## Denied commands

None.

## Not done

- No `pnpm check:pr`, `pnpm coverage` or Stryker run: the plan adds only a test file and evidence, and its verifies are the ones named. The file's coverage of `packages/core/src` is not claimed.
- `90-pinned-check.mjs` does not exist yet (a later plan writes it); the import region above is the datum it will declare.

## Self-Check: PASSED

- `packages/core/test/PortFacts.characterisation.test.ts` and `90-RED-EVIDENCE.md` exist; `node 90-check.mjs vitest` reports `72 tests in 1 files, all passed`; `node 90-check.mjs seen-failing` reports `72 titles, each seen failing`; `node 90-check.mjs trailers` reports `9 commits since phase_base, each with the one trailer`.
- Commits `8e044761` and `e8ecfa3c` are ancestors of HEAD; `node 90-check.mjs commit` accepts both subjects with exactly their one path each.
- `tsc -p tsconfig.test.json --noEmit`, `node scripts/check-house-style.mjs`, `oxlint` on the file, `90-check.mjs scan-ids` and `scan-forbidden` are clean; the scratch root was removed and `scratch-clean --check` passes.
