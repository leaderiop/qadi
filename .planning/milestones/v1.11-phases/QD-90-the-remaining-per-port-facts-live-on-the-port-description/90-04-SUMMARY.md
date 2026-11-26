---
phase: QD-90-the-remaining-per-port-facts-live-on-the-port-description
plan: 04
subsystem: testing
status: complete
tags: [core, type-pins, scoped-read, red-evidence, ports]

phase_base: 46174873c60e85bcd0c6702867c602cad8460310
plan_head_before: 3fc4b9150d14a85c4c5f66eb5128f006c12604b1
plan_head_after: d329fdd8823bf7e4c031b20ff21e34f9db420f6e

born_types:
  commit: ed4c14f55019caa6abaaaf3d516b642e2d0be1b0
  file: packages/core/test/PortFacts.tst.ts
  sha256: 6266f2f480d059ba7daa113bf1f007d8142a0083bcc98225e6bee362ed1a822a
  tests: 4
  assertions: 8
  import_region:
    first_line: 11
    last_line: 20
    first_text: 'import { expect, test } from "tstyche";'
    last_text: '} from "../src/index.ts";'

leafneeds_edit:
  commit: f6bc8f4aca11356f16761d017aa46bd5b429820d
  file: packages/core/test/LeafNeeds.test.ts
  sha256: e8615ddfd453be6a9e28854c146d3f1add88a6315f342e00a675bdcb9c59078d
  import_region:
    first_line: 9
    last_line: 49
    base_first_line: 9
    base_last_line: 43
  replaced_describe:
    new_first_line: 139
    new_last_line: 212
    base_first_line: 133
    base_last_line: 160
    new_title: "a scoped read requires an id exactly where its leaf's row says"

requires:
  - phase: QD-90-the-remaining-per-port-facts-live-on-the-port-description
    provides: 90-check.mjs (commit, variant, seen-failing --titles-matching, trailers, scan modes) from plan 02, and the 72-row characterisation of plan 03
provides:
  - packages/core/test/PortFacts.tst.ts, the base type pins of PortFixtureData, PortSpanName, PortSpanOf and PortName, read through the barrel
  - the LeafNeeds.test.ts describe that holds the scoped read equal to its leaf rows and to the fixture judgements
  - 7 recorded scratch variants in 90-RED-EVIDENCE.md, after which every type pin and every row of the new describe is seen failing
affects: [QD-90 plans 05 to 16 - PortFacts.tst.ts is held through the move (only later pins are appended); LeafNeeds.test.ts is held outside its import block (lines 9 to 49) and the new describe (lines 139 to 212)]

actuals:
  tokens: 3000
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "a type pin file that reads every moved type through the barrel and uses toBe only, so no negative callable pin and no budget row moves"
    - "a property stated once over the fixture table: the read (evaluate), the history judgements and the leaf row all refuse a missing resource id in the same cells"

key-files:
  created:
    - packages/core/test/PortFacts.tst.ts
  modified:
    - packages/core/test/LeafNeeds.test.ts
    - .planning/phases/QD-90-the-remaining-per-port-facts-live-on-the-port-description/90-RED-EVIDENCE.md

key-decisions:
  - "The attribute fixture member is pinned as the readonly string index signature; tstyche reads it as identical to `Readonly<Record<string, unknown>>`, so the stated fallback (the builder's parameter) is not needed. The custom-predicate member is pinned the same way."
  - "HasNotActed's judgement is read through the HasActed leaf with the same event and scope, because the two tags ask the one request (`actedAsks`) and `actedAnswerFromEvents` takes the HasActed leaf."

patterns-established:
  - "a vitest variant per property cell: the route forced to the bare read, a row's word changed, a judgement's id test turned round, each failing the rows that state that cell"

requirements-completed: []

coverage:
  - id: D1
    description: "the type pins pass in both tstyche passes on the base: 4 tests, 8 assertions, no negative callable or constructable pin"
    verification:
      - kind: unit
        ref: "node scripts/run-tstyche.mjs packages/core/test/PortFacts.tst.ts (pass 1 and pass 2, 4 tests, 8 assertions), node scripts/check-house-style.mjs (648 files clean, 81 type-test files), tsc -p tsconfig.test.json --noEmit (no output)"
        status: pass
    human_judgment: false
  - id: D2
    description: "the replaced describe has three rows, all green on the base source; the other rows of LeafNeeds.test.ts are untouched"
    verification:
      - kind: unit
        ref: "node 90-check.mjs vitest packages/core/test/LeafNeeds.test.ts (23 tests), and with PortFacts.characterisation.test.ts (95 tests in 2 files, all passed); git diff of the file changes only lines 9-49 and 139-212"
        status: pass
    human_judgment: false
  - id: D3
    description: "every type pin and every row of the new describe seen failing on a scratch clone, written by 90-check.mjs variant"
    verification:
      - kind: unit
        ref: "node 90-check.mjs seen-failing packages/core/test/PortFacts.tst.ts (4 titles), node 90-check.mjs seen-failing packages/core/test/LeafNeeds.test.ts --titles-matching (3 titles), node 90-check.mjs commit (evidence commit), node 90-check.mjs trailers (13 commits, each with the one trailer)"
        status: pass
    human_judgment: false

duration: 25min
completed: 2026-11-26
---

# Phase 90 Plan 04: The Port Types Pinned and the Scoped Read Held to Its Rows Summary

**The four moved port types are pinned through the barrel with `toBe` only, and the one test that tied the `resourceId` column to the code is replaced by a describe that holds the read, the history judgements and the leaf rows equal over every fixture and shape; all 4 pins and all 3 rows are green on the base and each was seen failing on a scratch clone.**

## Accomplishments

- `packages/core/test/PortFacts.tst.ts` (54 lines, commit `ed4c14f5`): `PortFixtureData` written out as its five members, `PortSpanName` the five span literals, `PortSpanOf<K>` per port (five assertions), `PortName` the five names. Everything is imported from `../src/index.ts`, so the file holds when the declarations move. Both `run-tstyche.mjs` passes are green; `check-house-style` counts 81 type-test files and no budget moves.
- `packages/core/test/LeafNeeds.test.ts` (commit `f6bc8f4a`): the describe at base lines 133 to 160 is replaced by `a scoped read requires an id exactly where its leaf's row says`, three rows, all green on the base:
  1. `a read is refused for a missing id exactly when its row and scope ask for one` is the base oracle (`claimed`, the absence skip, `refused === claimed && shape !== "id"`, the per-row `Never`/`Always` assertions on `f.scoped`), with the read factored into a local `refusedByRead`.
  2. `a ByScope leaf's judgement refuses exactly when its read does` runs, for the 6 `ByScope` fixtures over the 3 shapes (18 cells, counted), `actedAnswerFromEvents` (HasActed, and HasNotActed through the HasActed leaf of the same event and scope) and `signatureAnswerFromSignatures` over empty data and asserts `MissingResourceId` exactly where the read refused.
  3. `the leaf tags that ask about one resource are exactly four` asserts the sorted keys of `LEAF_NEEDS` whose `resourceId` is not `"Never"` equal HasActed, HasNotActed, HasRelationship, HasSignature.
- The diff against the base changes `LeafNeeds.test.ts` only in the import block (4 added import lines, now lines 9 to 49) and the describe (now lines 139 to 212); the `D-05 rule` header is byte for byte.
- 7 scratch variants in 90-RED-EVIDENCE.md under `## port-facts-04-<name>`:
  - tstyche: `span-literal` (PortSpanName, PortSpanOf fail), `span-key` (PortSpanOf, PortName fail), `fixture-member` (PortFixtureData fails);
  - vitest: `acted-bare-read` (rows 1 and 2), `signature-row-always` (rows 1 and 2), `signature-row-never` (rows 1, 2 and 3), `signature-judgement-inverted` (row 2).
- `packages/core/src` and `90-check.mjs` are unchanged.

## Task Commits

1. **Task 1: the type pins** - `ed4c14f5` `test(90-04): pin the moved port types on the base` (the file alone)
2. **Task 2: the scoped read** - `f6bc8f4a` `test(90-04): hold the scoped read to its leaf rows` (the file alone)
3. **Task 3: the evidence** - `d329fdd8` `docs(90-04): record the type pins and the scoped read seen failing` (90-RED-EVIDENCE.md alone)

## Deviations from Plan

### Plan defects (recorded, no check weakened)

**1. [Plan defect] Setting the HasSignature row to `"Always"` cannot fail the third row.**
- **Issue:** Task 3 says the `LEAF_NEEDS` HasSignature `"Always"` edit fails "the first and third rows". The third row filters on `resourceId !== "Never"`, and `"Always"` is still not `"Never"`, so the list is unchanged. The edit fails the first row (`HasSignature[Any]: expected false to be true`) and the second (the `ByScope` filter now skips HasSignature, so the count is 12, not 18).
- **Fix:** a second variant, `signature-row-never`, sets the row to `"Never"`; it fails all three rows, the third on the list losing HasSignature. Both variants are recorded.

**2. [Plan wording] the bare-read and the inverted-judgement variants fail more than the one row the plan names.**
- `acted-bare-read` fails rows 1 and 2 (the judgement still refuses where the read no longer does); the plan names the first. `signature-judgement-inverted` fails row 2 only, as the plan says. Both are consistent with the replaced describe stating one property three ways.

### Choices the plan left open (recorded, most complete option taken)

3. **Type pin spelling.** `PortFixtureData.AttributeResolver` is written `{ readonly [key: string]: unknown }` and tstyche reads it as identical to `Readonly<Record<string, unknown>>`, so no fallback to `Parameters<typeof attributeResolverFromRecord>[0]` was needed. `CustomPredicate` is `{ readonly [key: string]: boolean }` for the same reason.
4. **HasNotActed judgement.** `actedAnswerFromEvents` takes the HasActed leaf; HasNotActed fixtures are judged through `{ ...policy, _tag: "HasActed" }`, since both tags ask one request (`actedAsks`).
5. **Imports.** `Result` from `effect/Result`, `actedAnswerFromEvents` and `signatureAnswerFromSignatures` from their modules, `Resource` and `LeafPolicy` types, and the `Fixture` type from `./LeafFixtures.ts` (a second import line from that module, `import type`, beside its value import).

### Pre-start check requested by the caller

`npx tsc -p tsconfig.test.json --noEmit` printed no error before the first commit and after the last edit; the editor errors in `PortFacts.characterisation.test.ts` were stale.

## Known Stubs

None.

## Threat Flags

None. T-90-09 (a read or judgement answering a resource-scoped question without an id) is held by the three rows, each seen failing; T-90-10 (a public type changing shape on the move) is held by the four type pins, each seen failing.

## Issues Encountered

- The first draft of the judgement helper returned one `Result` union from a conditional and failed `tsc` (`TS2379`, the two answers are different `Result` types); it now maps each answer to a boolean through one `refuses` function.
- A `judged` count of 5 x 3 in the first draft was wrong: six `ByScope` fixtures (HasActed, HasNotActed and HasSignature at both scopes) give 18 cells.

## Denied commands

None.

## Self-Check: PASSED

- `packages/core/test/PortFacts.tst.ts`, `packages/core/test/LeafNeeds.test.ts` and the evidence file exist; commits `ed4c14f5`, `f6bc8f4a`, `d329fdd8` are ancestors of HEAD (`90-check.mjs commit` passed for each); `90-check.mjs trailers` reports 13 commits since phase_base, each with the one trailer; `seen-failing` passes for both files; `vitest` passes for `LeafNeeds.test.ts` and `PortFacts.characterisation.test.ts` (95 tests); `run-tstyche` passes both passes; `check-house-style`, `scan-ids`, `scan-forbidden` and `tsc -p tsconfig.test.json --noEmit` are clean.
