---
phase: QD-91-named-barrels-and-visibility-only-files-folded-away
plan: 04
subsystem: testing
tags: [public-surface, runtime-values, root-barrels, type-only-trap, red-evidence]

requires:
  - phase: QD-91-named-barrels-and-visibility-only-files-folded-away
    provides: 91-check.mjs (vitest, scratch, variant, seen-failing, commit, scan-ids) and 91-surface-base.json (the value kinds the lists are cross-checked against)
provides:
  - packages/core/test/surface.test.ts (342 runtime values), packages/react/test/surface.test.ts (28, useQadiContext included), packages/audit/test/surface.test.ts (41, verifySequenceIntegrity included), each green on the base source
  - three blocks of 91-RED-EVIDENCE.md showing each list failing on a value turned type-only
affects: [91-09 (the named barrels must keep these lists green), 91-10 through 91-13 (each fold moves a value and edits the matching list), 91-21 close]

phase_base: 69e5247d205949df7396dfacb0a29bc96a02f321
plan_head_before: 8d9967bb04c630cbbb116d8cd3773367498d9d21
plan_head_after: db2e6fd19e1246e5554a1ecaf1405459ef561187
commits: 2

actuals:
  tokens: 31000
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "a literal, ASCII-sorted ROOT_VALUES list beside Object.keys of the root, after packages/devtools/test/surface.test.ts"
    - "a type-only trap is planted by replacing a module's export * line with its named values minus one, plus export type of that one"

key-files:
  created:
    - packages/core/test/surface.test.ts
    - packages/react/test/surface.test.ts
    - packages/audit/test/surface.test.ts
  modified:
    - .planning/phases/QD-91-named-barrels-and-visibility-only-files-folded-away/91-RED-EVIDENCE.md

key-decisions:
  - "The lists were read from the base roots by a throwaway vitest test in a scratch clone and then cross-checked: each equals the set of names the base surface snapshot gives kind value or both, exactly"

requirements-completed: []

duration: 25min
completed: 2026-11-26
status: complete
---

# Phase QD-91 Plan 04: The root value lists Summary

**Each changed root's runtime value names are pinned as a literal list on the base source, 342 for `@qadi/core`, 28 for `@qadi/react` and 41 for `@qadi/audit`, and each list has been seen failing when one value becomes type-only.**

## What was built

Three `surface.test.ts` files after `packages/devtools/test/surface.test.ts`: a header doc comment (what the list is, the three-edit rule of a barrel line, a `spec/overview.md` row checked by `node scripts/check-api-surface.mjs`, and this file, type names being that script's, ADR-QD-099), `import { assert, describe, it } from "@effect/vitest"`, `import * as Root from "../src/index.ts"`, a literal `ROOT_VALUES: ReadonlyArray<string>` one quoted name per line in ASCII order, and `assert.deepStrictEqual(Object.keys(Root).sort(), [...ROOT_VALUES].sort())`. `Object.keys` appears once per file (the actual side). No `surface.tst.ts` was added.

| File | describe | titles | values |
| ---- | -------- | ------ | -----: |
| `packages/core/test/surface.test.ts` | `@qadi/core's root` | `exports exactly these runtime values` | 342 |
| `packages/react/test/surface.test.ts` | `@qadi/react's root` | `exports exactly these runtime values`, `reaches useQadiContext from the package root` | 28 |
| `packages/audit/test/surface.test.ts` | `@qadi/audit's root` | `exports exactly these runtime values` | 41 |

The method: `git diff --quiet phase_base HEAD -- packages` was clean (no source moved); a scratch clone (`scratch`, outside the repository) got one throwaway vitest file per package printing `Object.keys` of the root to a file under the scratch root; each key list is already ASCII-sorted and duplicate-free. The three lists were then compared with `91-surface-base.json`: for each package, the names of kind `value` or `both` are the same set as the keys (342, 28, 41).

## Verification

- `node 91-check.mjs vitest` over the three files: `vitest: 4 tests in 3 files, all passed`.
- `pnpm exec tsc -p tsconfig.test.json --noEmit` clean; `pnpm exec oxlint` over the three files exits 0; `node scripts/check-house-style.mjs` clean; `91-check.mjs scan-ids` and `scan-forbidden` exit 0; `91-check.mjs trailers` reports 13 commits, each with the one trailer.

## Evidence: each list seen failing (91-RED-EVIDENCE.md)

| Label | Edit in the scratch clone | Titles seen failing |
| ----- | ------------------------- | ------------------- |
| `values-core-type-only` | core barrel: `export * from "./Errors.ts"` replaced by a named list of that module's values without `AccessDenied`, plus `export type { AccessDenied } from "./Errors.ts"` | `@qadi/core's root exports exactly these runtime values` |
| `values-react-type-only` | react barrel: the same for `./QadiProvider.tsx` and `useQadiContext` | both react titles (the list, and `reaches useQadiContext from the package root`: expected 'undefined' to equal 'function') |
| `values-audit-type-only` | audit barrel: `export * from "./SequenceIntegrity.ts"` replaced by `export { SequenceIntegrityError }` plus `export type { verifySequenceIntegrity } from "./SequenceIntegrity.ts"` | `@qadi/audit's root exports exactly these runtime values` |

`91-check.mjs seen-failing` exits 0 for all three files (1, 2 and 1 titles).

## Task Commits

1. Task 1: `02009ea4` `test(91-04): pin each root's runtime values on the base` (exactly the three files)
2. Task 2: `db2e6fd1` `docs(91-04): record the value lists seen failing` (exactly `91-RED-EVIDENCE.md`)

Each carries the one trailer; `91-check.mjs commit` passes for both.

## Deviations from Plan

### Plan defects resolved by the smallest honest reading

**1. [Plan defect] The appended `export type` line is not a trap on an `export *` barrel.**
- **Found during:** Task 2, the first run of the three variants (all three reported `was not seen failing`; nothing was written to the evidence file).
- **Issue:** the plan's edit appends `export type { AccessDenied } from "./Errors.ts";` (and the react and audit equivalents) to a barrel that still holds `export * from "./Errors.ts"`. The star line keeps supplying the value at run time and the type-only line is erased, so the root's keys do not change and the list stays green. The trap exists only on a named barrel.
- **Before:** `printf 'export type { AccessDenied } from "./Errors.ts";' >> packages/core/src/index.ts` (likewise `useQadiContext` from `./QadiProvider.tsx`, `verifySequenceIntegrity` from `./SequenceIntegrity.ts`).
- **After:** in each clone the module's `export * from "./<module>";` line is replaced by `export { <every runtime value of the module except the target> } from "./<module>";` followed by `export type { <target> } from "./<module>";`, the shape a named barrel takes when one name goes type-only. The module's value names were read from the clone by a throwaway test (core's `Errors.ts` has 27, react's `QadiProvider.tsx` 4, audit's `SequenceIntegrity.ts` 2). The check is no weaker: it still plants exactly one value type-only and the list must fail on exactly that name.
- **Files modified:** none in the repository (scratch clones only); the evidence blocks' `edit:` lines record the real edit.
- **Commit:** `db2e6fd1`

### Choices the plan left open (autonomous, most complete option)

- The header wording says what each root's values are (policy language, evaluator, ports and sinks for core; provider, atoms, hooks, hydration and gate registry for react; sink, ports, signature ledger, archive, retention and sequence integrity for audit), and says "the root" rather than "the barrel names its exports", because the base barrels are still `export *` lines.
- The throwaway key-printing tests lived only in a scratch clone and were deleted with it; the scratch root was removed with `scratch-clean` and checked gone.

## Authentication gates

None.

## Known Stubs

None.

## Threat Flags

None: three test files and an evidence file; no source, network or schema change.

## Self-Check: PASSED

- `packages/core/test/surface.test.ts`, `packages/react/test/surface.test.ts` and `packages/audit/test/surface.test.ts` exist; `/usr/bin/grep -c Object.keys` is 1 in each.
- `02009ea4` and `db2e6fd1` are ancestors of HEAD, each with the one trailer.
- `node 91-check.mjs vitest` over the three files passes (4 tests); `seen-failing` exits 0 for each; three evidence blocks, each with exit 1.
