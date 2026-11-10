---
phase: 16-role-graph-walk
plan: 03
subsystem: devtools
tags: [devtools, role, rendering, red-test, mutation]

requires: ["16-01", "16-02"]
provides:
  - "`RoleRow` and `RoleSummary.rows`: the role walk as a flat, depth-annotated list in walk order"
  - "`RoleViewer.tsx` renders `summary.rows` as sibling rows keyed on the step index; the recursive `Branch` is gone"
affects: [16-04]

actuals:
  tasks: 2
  commits: 2

key-files:
  modified:
    - packages/devtools/src/model/RoleTree.ts
    - packages/devtools/src/react/RoleViewer.tsx
    - packages/devtools/test/model/RoleTree.test.ts
    - packages/devtools/test/react/RoleViewer.test.tsx

key-decisions:
  - "16-01 T1 (D-04) = A, from `_DECISIONS.md`: \"A repeated role is a leaf referencing its first occurrence\". A repeated row has `repeated: true` and `first` = the first occurrence's step index; nothing is rendered beneath it"
  - "`tree` and `RoleNode` removed (deletion over addition): after this plan nothing but tests read them. `RoleTree.ts` is package-private (`surface.tst.ts` pins `roleSummary` as not exported), so this is not a public change"
  - "The repeated marker names its first occurrence through `data-first` (the row's `data-index`), not in its text: the first occurrence has the same name as the repeated row, so naming it in words adds nothing. No scroll-to link (kept out, per the plan)"

requirements-completed: [ROLE-03]

completed: 2026-11-10
status: complete
---

# 16-03 — The role viewer renders the walk flat

## Task 1 — RED (commit `a253594`)

Two tests in `packages/devtools/test/react/RoleViewer.test.tsx` ("the role viewer on a deep catalogue"):
- "a 20,000-deep chain renders" (60 s timeout): 20,000 `qadi-role-node` rows, first `r19999`, last `r0`.
  RED on the post-16-02 tree: **`RangeError: Maximum call stack size exceeded`**, after 69,120 ms (recursive `Branch`).
- "rows are siblings": no `qadi-role-node` contains another. RED: `AssertionError`, the `editor` node contains the
  `viewer` and `commenter` nodes.

Baseline `<Branch ` in `RoleViewer.tsx` = 2.

## Task 2 — GREEN (commit `a9e8709`)

- `RoleTree.ts`: `RoleRow { name; index; depth; own; repeated; first }`; `RoleSummary.rows` replaces `tree`. `rowsOf` is
  one `roleWalk(self).map(...)`: the walk is already pre-order with depths, so no tree is folded and nothing recurses.
  `RoleNode`, `treeOf` and the fold-from-the-end are gone.
- `RoleViewer.tsx`: `summary.rows.map(...)`, one `div[data-testid=qadi-role-node][data-role][data-repeated][data-index]`
  per row, `key={row.index}`, `paddingLeft: row.depth * 14`, the own-count chip and the "already reached above" marker
  (comment's reason kept, plus `data-first`). `<Branch ` 2 → 0.
- Tests: model tests ported from `tree` to `rows` (names, `[index, depth]`, `own` per row, the diamond as
  `[name, index, depth, repeated, first]`, same-name pair, 10,000/20,000 chains, stacked diamonds by `rows.length`);
  `nodeCount` helper deleted. The viewer's diamond test now follows `data-first` to the first `viewer` row.

Render time of the 20,000 test: **2,193 ms** (was a `RangeError` after 69 s).

## Gates

- `pnpm vitest run --project devtools`: 41 files / 1,115 tests — pass.
- `pnpm exec tstyche packages/devtools/test`: 20/20 (`surface.tst.ts` unchanged: nothing new exported) — pass.
- `pnpm typecheck` 0; `pnpm lint` 0 (house-style 435 files clean; no warnings in touched files) — pass.
- `pnpm coverage` 0: all files 99.34% statements; `RoleViewer.tsx` 94.44 (line 54, the `Evicted` arm, uncovered as before).
- Scoped Stryker (`stryker.devtools.mjs --mutate RoleTree.ts`): **100% (25/25)**; compare one-liner against
  `16-mutation-base-devtools.json` (base 1.0) exits 0. `RoleViewer.tsx` is outside the devtools `mutate` glob.
- Extra: `pnpm test:bdd` 34 files / 567 tests — pass.
- `pnpm spec:api` (gate 13) still knowingly red for `RoleStep`/`roleWalk` until 16-04. Not run here.

## Deviations

None from the plan's steps. The marker's first-occurrence link is an attribute rather than text (see key-decisions).
The task brief said 10,000-deep; the plan's 20,000 covers it.

## Deferred to 16-04

- The BEH for the devtools tree should describe it as flat rows: identity keying, stack safety (20,000-deep model and
  render), repeated-as-leaf with `data-first`. `RoleNode`/`tree` no longer exist (package-private, so no changeset
  Breaking; `@qadi/devtools` patch).
- Everything 16-02 deferred: overview rows for `roleWalk`/`RoleStep` (gate 13), glossary "role walk", ADR-QD-128,
  CCR-QD-406, INV-QD-038 note, traceability, changesets (incl. walk-order set filling), `pnpm check:pr`.
