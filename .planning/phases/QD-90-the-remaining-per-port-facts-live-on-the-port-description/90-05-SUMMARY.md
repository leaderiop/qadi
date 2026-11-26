---
phase: QD-90-the-remaining-per-port-facts-live-on-the-port-description
plan: 05
subsystem: testing
status: complete
tags: [core, spike, madge, tsc, scratch-clones, sixth-port, ports]

phase_base: 46174873c60e85bcd0c6702867c602cad8460310
spike_base: 8ae31ae12ece7802501746569dda85ac427693b9
plan_head_before: 8ae31ae12ece7802501746569dda85ac427693b9
plan_head_after: 5105fef2444251741ad6a56b83fd41fd425c7bb6

requires:
  - phase: QD-90-the-remaining-per-port-facts-live-on-the-port-description
    provides: 90-check.mjs (scratch, variant, spike, sixth-port, trailers) from plan 02, the characterisation of plan 03 and the type pins of plan 04, all carried by the spike base
provides:
  - spike/a.patch to g.patch, the patches plans 09 to 12 apply, each measured on a scratch clone of the spike base
  - spike/e.patch, spike/b-alone.patch and spike/leaf-imports-registry.patch, the three recorded failures
  - spike/tests.patch, the declared test edits and the end pins, proved on the end state
  - 90-SPIKE.md, ten chain rows with patch hashes and outputs, the decided forms and the end-state proofs
  - 90-RED-EVIDENCE.md blocks for the registry variant, the sixth-port base and close sets, and the sixth-port judge seen failing
affects: [QD-90 plans 06 to 16 - 06 measures f+g, 09 to 12 land a to d, f and g, 13 records the sixth-port close]

actuals:
  tokens: 30700
  tasks: 2
  commits: 1

tech-stack:
  added: []
  patterns:
    - "a candidate chain is a series of incremental patches, each the diff of one candidate over the committed result of the previous ones in an authoring clone, and a chain is re-measured by applying them in order to a fresh clone of the base"
    - "a scoped port table whose `bare` call is typed `undefined` exactly when every scoped leaf of the port is `Always`, so reclassifying a row is a compile error at the table"

key-files:
  created:
    - .planning/phases/QD-90-the-remaining-per-port-facts-live-on-the-port-description/90-SPIKE.md
    - .planning/phases/QD-90-the-remaining-per-port-facts-live-on-the-port-description/spike/a.patch
    - .planning/phases/QD-90-the-remaining-per-port-facts-live-on-the-port-description/spike/b.patch
    - .planning/phases/QD-90-the-remaining-per-port-facts-live-on-the-port-description/spike/c.patch
    - .planning/phases/QD-90-the-remaining-per-port-facts-live-on-the-port-description/spike/d.patch
    - .planning/phases/QD-90-the-remaining-per-port-facts-live-on-the-port-description/spike/e.patch
    - .planning/phases/QD-90-the-remaining-per-port-facts-live-on-the-port-description/spike/f.patch
    - .planning/phases/QD-90-the-remaining-per-port-facts-live-on-the-port-description/spike/g.patch
    - .planning/phases/QD-90-the-remaining-per-port-facts-live-on-the-port-description/spike/b-alone.patch
    - .planning/phases/QD-90-the-remaining-per-port-facts-live-on-the-port-description/spike/leaf-imports-registry.patch
    - .planning/phases/QD-90-the-remaining-per-port-facts-live-on-the-port-description/spike/tests.patch
    - .planning/phases/QD-90-the-remaining-per-port-facts-live-on-the-port-description/spike/out/
  modified:
    - .planning/phases/QD-90-the-remaining-per-port-facts-live-on-the-port-description/90-RED-EVIDENCE.md

key-decisions:
  - "The serving declaration stays written out: deriving PortServing from the facets (candidate e) closes 16 cycles and fails tsc, measured on the spike base."
  - "The span is `typeof` a module-private const in each of the five port modules; the fixture is taken by reference after each builder moves above its description; PORT_FIXTURES derives through a third tabulatePorts overload with its helper types unexported."
  - "The attribute fixture's data type is written as an index signature, `{ readonly [key: string]: unknown }`, because Record<string, unknown> is a forbidden form in an added line and a moved line is an added line."

requirements-completed: []

coverage:
  - id: D1
    description: "every candidate has a recorded verdict from its own outputs: (a), (a)+(b), (a)+(b)+(c), (a)+(b)+(c)+(d), (f), (f)+(g) and the end state add no cycle and compile; (b) alone fails with TS2308; (e) gives 16 cycles and TS2456, TS2502, TS2315; PortName.ts importing Ports.ts gives 11 cycles"
    verification:
      - kind: unit
        ref: "node 90-check.mjs spike --rerun (10 chains, each patch hashed and each re-applied and re-measured on the base)"
        status: pass
    human_judgment: false
  - id: D2
    description: "the end state with the declared test edits is proved on a scratch clone against the test graph, vitest, tstyche both passes, house style, the API surface (943), pnpm circular, pnpm spec:package and core coverage (each total at least 95)"
    verification:
      - kind: unit
        ref: "tsc -p tsconfig.test.json (3 declared errors before, 0 after), vitest core (86 files, 2871 tests), run-tstyche (2 files, 11 tests, 35 assertions, both passes), check-house-style (648 files clean), check-api-surface (943), pnpm circular, pnpm spec:package, coverage close (99.86, 99.7, 98.33, 99.58)"
        status: pass
    human_judgment: false
  - id: D3
    description: "the sixth-port base and close sets are recorded as (file, code) groups, PortMetrics.ts in the first and absent from the second, and the judge was seen failing once"
    verification:
      - kind: unit
        ref: "node 90-check.mjs sixth-port base (53 errors in 22 groups), the close (spike: end) block (57 errors in 25 groups), variant sixth-port-base-group-missing (exit 1)"
        status: pass
    human_judgment: false

duration: 12min
completed: 2026-11-26
---

# Phase 90 Plan 05: The Spike Summary

**Every candidate is a patch measured on a scratch clone: the tuple, the span type parameter, the distinct-span check, the fixture member, the derived scoped sets and the routing add no cycle and compile; deriving `PortServing` closes 16 cycles; the end state passes every gate this phase faces, and both sixth-port error sets are recorded.**

## Performance

- **Duration:** about 12 minutes of wall clock (the clock the run's start and end were read from)
- **Tasks:** 2
- **Files:** 33 created or modified, all under the phase directory; `packages/`, `spec/` and `scripts/` are unchanged

## Spike base and verdict table

`spike_base: 8ae31ae12ece7802501746569dda85ac427693b9`, whose `packages/*/src` equals `phase_base`.

| chain | madge | tsc | verdict |
| ----- | ----- | --- | ------- |
| a | no cycle | 0 | accept |
| a+b | no cycle | 0 | accept |
| a+b+c | no cycle | 0 | accept |
| a+b+c+d | no cycle | 0 | accept |
| e | 16 cycles, first `PortDerivation.ts > PortDescription.ts > PortServing.ts > Ports.ts > AttributeResolver.ts` | 5 errors: TS2456, TS2502, TS2315 (x3) | reject |
| f | no cycle | 0 | accept |
| f+g | no cycle | 0 | accept, subject to the bench gate (plan 06) |
| end (a, b, c, d, f, g) | no cycle | 0 | accept |
| b-alone | no cycle | 2 errors: TS2308 at `index.ts(42,1)` for `PortSpanName` and `PortSpanOf` | reject |
| leaf-imports-registry | 11 cycles, first `PortDerivation.ts > PortDefault.ts > PortName.ts > Ports.ts > AttributeResolver.ts` | 0 | reject |

Every measurement equals the research's. The only difference is (b) alone, whose madge run the research skipped.

## End state, on a scratch clone with `spike/tests.patch`

- Test graph before the test edits: exactly the three declared errors (`PortDescription.test.ts(83,7)` TS2741, `PortName.tst.ts(12,25)` TS2724, `PortName.tst.ts(12,39)` TS2305); after: none.
- `vitest run --project core`: 86 files, 2871 tests, all passed (the characterisation and `LeafNeeds.test.ts`: 95 tests).
- `run-tstyche` on `PortFacts.tst.ts` and `PortName.tst.ts`: both passes, 11 tests, 35 assertions.
- `check-house-style`: 648 files clean, no budget moved; `check-api-surface`: 943 with `PORT_NAMES` the one addition; `pnpm circular`: clean; `pnpm spec:package`: passes, the three unexported helper types sit in the emitted `Ports.d.ts`.
- Core coverage: lines 99.86, functions 99.7, branches 98.33, statements 99.58 (base 99.89, 99.78, 98.33, 99.63).
- `scan-ids` and `scan-forbidden` over the same tree: clean.

## Sixth port

- `## sixth-port base` (a sixth `PortSpans` row): 53 errors in 22 groups; `PortMetrics.ts` TS2741 is in it.
- `## sixth-port close (spike: end)` (`"FakePort"` in `PORT_NAMES`): 57 errors in 25 groups; `PortMetrics.ts` is not in it.
- `sixth-port-base-group-missing`: against a recorded base set without its `PortMetrics.ts` group the judge exits 1 with `a group the record lacks: packages/core/src/PortMetrics.ts TS2741`.
- The registry variant is recorded as `registry-leaf-imports-registry` (circular, exit 1).

## Task Commits

1. **Tasks 1 and 2: the spike** - `5105fef2` `docs(90-05): record the spike` (the patches and their outputs, 90-SPIKE.md and 90-RED-EVIDENCE.md, under the phase directory only). The plan names this one commit for both tasks.

## Deviations from Plan

### Plan defects (recorded, no check weakened)

**1. [Plan defect] `90-mutation.mjs coverage spike` is not a mode.**
- **Issue:** the script's coverage modes are `base` and `close`, and both refuse a tree that is not clean.
- **Fix:** the end state and the test edits were committed inside the scratch clone, and `node 90-mutation.mjs coverage close` was run there. It ran the same path-filtered command the close will and wrote the totals recorded above into the clone, not the real tree.

**2. [Rule 1 - Bug in a patch] the first `d.patch` and `tests.patch` carried `Record<string, unknown>`.**
- **Found during:** the `scan-forbidden` run over the end tree, after the first commit.
- **Issue:** the attribute fixture's builder parameter and its data type argument were moved lines, so they counted as added lines of a forbidden form; the appended `PORT_FIXTURES` pin repeated the spelling.
- **Fix:** all three are written `{ readonly [key: string]: unknown }` (tstyche reads it as identical, the held `PortFacts.tst.ts` pin already uses it). `d.patch` and `tests.patch` were regenerated, the chains `a+b+c+d` and `end` re-measured, the hashes in `90-SPIKE.md` replaced, and the first commit amended (it was local and the only commit of the plan) so the plan keeps its one commit.

### Choices the plan left open (recorded, most complete option taken)

3. **`b-alone`** is `b.patch` without its `PortName.ts` hunk, applied to the base. Its two TS2308 errors are the failure the plan names.
4. **`leaf-imports-registry`** is a type import of `./Ports.ts` plus one exported type that uses it, so the file compiles (0 tsc errors) and only madge rejects it.
5. **`g.patch` keeps the per-call closure in the `ByScope` arm**, as the research's code does; plan 06 measures it and falls back to the hoisted predicates only if its gate fails. `g.patch` also edits the prose that the routing makes false (`LeafNeeds.ts`'s `resourceId` doc, `ScopedLeaf.ts`'s header, `PortAccess.ts`'s doc comments).
6. **Output files** start with a `# exit <code>` line the runner writes; the madge banner holds the scratch path. `spike --rerun` compares only the verdict line and the (file, code) groups.
7. **The sixth-port close set** was recorded on the first `d.patch` and re-checked by hand on the final chain (57 errors, 25 groups); `sixth-port close --on-chain end` without `--record` reads the unqualified `## sixth-port close` block, which plan 13 writes, so it was not re-run.

## Known Stubs

None.

## Threat Flags

None. T-90-11 (a patch changed after it was measured) is held by the SHA-256 of every patch in `90-SPIKE.md` and `spike --rerun`; T-90-12 (a cycle reaching a published package) by `pnpm circular` on every chain.

## Issues Encountered

- A first `run-chain.sh` call split `a b` into one word; the chains were then run with their patches as separate arguments.
- `scratch-clean` removes the whole scratch root, authoring clones included, so the regenerated `d.patch` was made from a fresh clone with `a`, `b` and `c` committed there first.

## Denied commands

None.

## Self-Check: PASSED

- `90-SPIKE.md`, the ten patches under `spike/` and the twenty output files exist; commit `5105fef2` is an ancestor of HEAD and holds only files under the phase directory; the commit message has the one trailer.
- `node 90-check.mjs spike --rerun` (10 chains), `sixth-port base`, `trailers` (15 commits since phase_base, each with the one trailer) and `unchanged` for `Ports.ts`, `PortAccess.ts` and `PortName.ts` all exit 0; `packages/`, `spec/` and `scripts/` are unchanged.
- The scratch root was removed with `scratch-clean` and `scratch-clean --check` passes.
