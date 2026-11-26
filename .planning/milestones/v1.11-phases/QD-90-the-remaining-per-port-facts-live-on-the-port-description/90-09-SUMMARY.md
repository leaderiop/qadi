---
phase: QD-90-the-remaining-per-port-facts-live-on-the-port-description
plan: 09
subsystem: core
status: complete
tags: [port-names, tuple, metrics, public-api]

phase_base: 46174873c60e85bcd0c6702867c602cad8460310
plan_head_before: f564059860828f3396bafcd092fda728197f77da
plan_head_after: b60c2af2f559e7dc9f222e61c29519abbe10aefd

requires:
  - phase: QD-90-the-remaining-per-port-facts-live-on-the-port-description
    provides: the characterisation (plan 03), the pin file PortFacts.tst.ts (plan 04), the checks and variant modes (plans 02, 07)
provides:
  - PORT_NAMES, the five port names as one public readonly tuple in the import-free leaf PortName.ts
  - PortName as its element type; the four port metrics preregister the tuple
  - PREDICATE_PORT_NAMES checked against PortName, so a misspelt member is a compile error
  - the overview row for PORT_NAMES (api surface 942 to 943, overview revision 1.147)
affects: [QD-90 plans 10 and 11 (the span and the fixture build on the tuple), plan 14 and 15 (records, changeset)]

requirements-completed: []

actuals:
  tokens: 9000
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "a closed name set is a tuple declared once as a value, its union derived with (typeof T)[number]; a subset is an unexported tuple that satisfies ReadonlyArray of the full union"

key-files:
  created: []
  modified:
    - packages/core/src/PortName.ts
    - packages/core/src/PortMetrics.ts
    - packages/core/test/PortFacts.tst.ts
    - spec/overview.md
    - .planning/phases/QD-90-the-remaining-per-port-facts-live-on-the-port-description/90-RED-EVIDENCE.md

key-decisions:
  - "The spike's a.patch was applied as measured; only its doc comments were reworded to carry no id and no history sentence."
  - "The tuple pin is the PORT_NAMES test of the spike's tests.patch alone; the rest of that patch belongs to later plans."

duration: 15min
completed: 2026-11-26
---

# Phase 90 Plan 09: The Port Names as One Tuple Summary

**`PORT_NAMES` is the five names in registry order, declared once in the import-free `PortName.ts`; `PortName` is its element type, the four port metrics preregister it, and the two-member predicate subset is a tuple that must satisfy `PortName` (a misspelt name fails `tsc`).**

## What changed

- `packages/core/src/PortName.ts`: `export const PORT_NAMES = [...] as const` and `export type PortName = (typeof PORT_NAMES)[number]`; still no import. `PortSpans`, `PortSpanOf` and `PortSpanName` stay, keyed by the same five names.
- `packages/core/src/PortMetrics.ts`: imports `PORT_NAMES` as a value; `PORT_NAMES_BY_NAME`, its `Record<PortName, true>` and the `effect/Record` import are gone; `PREDICATE_PORT_NAMES` is an unexported tuple `as const satisfies ReadonlyArray<PortName>` and `PredicatePortName` is its element type (the same union). Every metric id, description and word order is unchanged (the held `Ports.test.ts` and the characterisation are green).
- `packages/core/test/PortFacts.tst.ts`: the `PORT_NAMES` pin appended after the born text, plus its value import.
- `spec/overview.md`: a `PORT_NAMES` row beside the `PortName` row, revision 1.146 to 1.147 (one bump).

## Checks run (all at the feature commit)

| Check | Result |
| ----- | ------ |
| `pnpm typecheck` | clean |
| `node scripts/check-house-style.mjs` | 648 files clean |
| `node scripts/check-api-surface.mjs` | 943 exports documented |
| `node scripts/run-tstyche.mjs packages/core/test/PortFacts.tst.ts` | 5 tests pass |
| `pnpm circular` | no cycle |
| `90-check.mjs suite` | 5314 tests in 214 files, all passed |
| `90-check.mjs port-facts names` | passes |
| `90-pinned-check.mjs` | 408 files hold base text, 3 of 3 born files held, 1 of 5 declared edits applied |
| `90-check.mjs commit` (both subjects), `trailers` | pass; 28 commits since phase_base, each with the one trailer |

## Seen failing (4 blocks in 90-RED-EVIDENCE.md, on scratch clones of the feature commit, removed afterwards)

| Label | Edit | Result |
| ----- | ---- | ------ |
| `port-names-swap-vitest` | two names swapped in `PORT_NAMES` | exit 1; the characterisation's four preregistered-words rows fail |
| `port-names-swap-tstyche` | the same swap | exit 1; `PORT_NAMES is the five names, in the registry's order` fails |
| `port-names-predicate-misspelt` | `"AttributeResolvr"` in `PREDICATE_PORT_NAMES` | exit 2; `PortMetrics.ts(135,3): error TS2820` |
| `port-names-imports-ports` | `PortName.ts` imports `./Ports.ts` | exit 1; three cycles through `PortName.ts` |

## Task Commits

1. **Task 1: the tuple, the metrics, the pin, the overview row** - `61ff69b8` `feat(90-09): export the port names as one tuple`
2. **Task 2: the variants seen failing** - `b60c2af2` `docs(90-09): record the port names variants`

## Deviations from Plan

### Choices the plan left open

1. **Doc comments.** The patch's comments were kept in meaning but reworded: the history sentence ("both were declared in PortMetrics.ts before") and its `ARCH-77` id are removed from the added lines, and `PortMetrics.ts`'s header gains the sentence that each metric preregisters `PORT_NAMES` and that `PREDICATE_PORT_NAMES` is checked against `PortName`.
2. **Variant labels.** The plan names the four variants but not their labels; they are `port-names-swap-vitest`, `port-names-swap-tstyche`, `port-names-predicate-misspelt`, `port-names-imports-ports`. The cycle variant uses a value import (`PORTS`) so the cycle tool sees it.

### Plan defects

None.

## Known Stubs

None.

## Threat Flags

None. T-90-18 (a metric key or word order moving) is mitigated: the held `Ports.test.ts` and the characterisation pass unchanged, and the swap variant fails the order rows.

## Not done

- No coverage, Stryker or bench run (the core mutation close is plan 13's).
- `packages/http/src/PortRoutes.ts` still has its own file-local `PORT_NAMES` (derived from the registry); it is not imported from core and was left alone.
- The scratch root still holds earlier runs' files (`earlier/`, logs, vitest reports); the close removes it.

## Denied commands

None.

## Self-Check: PASSED

- `PortName.ts`, `PortMetrics.ts`, `PortFacts.tst.ts`, `spec/overview.md`, `90-RED-EVIDENCE.md` and this file exist; commits `61ff69b8` and `b60c2af2` are ancestors of HEAD; `90-check.mjs commit` accepted both subjects with exactly their paths; `90-check.mjs trailers` passes; no `.vitest/` directory exists.
