---
phase: 13-lost-wave-gaps
plan: 10
subsystem: numbering-placeholder-gate
tags: [house-style, citations, lost-wave-port]

phase_base: 0925c2f
requires: ["13-07"]
provides:
  - "`scripts/check-house-style.mjs`: `[no-numbering-placeholder]`"
  - "AGENTS.md §11: the rule documented (ARCH-61, CCR-QD-403)"
  - "the 14 `…-QD-NEXT` placeholders resolved to ADR-QD-107, ADR-QD-101, INV-QD-241, INV-QD-103, BEH-QD-264, BEH-QD-267"
affects: [13-11, 13-12, 13-13]

actuals:
  tasks: 2
  commits: 3

key-files:
  created: []
  modified:
    - scripts/check-house-style.mjs
    - AGENTS.md
    - packages/core/src/PortWire.ts
    - packages/core/src/PortRemote.ts
    - packages/core/src/PortDescription.ts
    - packages/core/src/TreeFold.ts
    - packages/devtools/src/model/Inspect.ts
    - packages/core/test/PortWire.test.ts
    - packages/core/test/PortServe.test.ts
    - packages/core/test/PortConformance.test.ts
    - packages/core/test/PortRemote.test.ts
    - features/step-definitions/SharedWorld.ts
    - features/features/port-calls/port-calls.steps.test.ts

requirements-completed: []
---

# 13-10 — A numbering placeholder cannot reach source, a test or a feature

`phase_base: 0925c2f`. 13-E part 1 (ARCH-61): the placeholder row of GAP-11, and GAP-12.

## Decisions applied

No `checkpoint:decision` in this plan. CONTEXT D-05: the gate is a `check-house-style.mjs` rule (runs under
`pnpm lint`), documented in AGENTS.md; no new `pnpm check` step, so `spec/process/definitions-of-done.md` is untouched.

## CONTEXT correction

CONTEXT (and REQUIREMENTS GAP-11's text) names 7 `ADR-QD-NEXT`. The rule found **14** placeholders: 7 `ADR-QD-NEXT`,
5 `INV-QD-NEXT`, 2 `BEH-QD-NEXT-x`, exactly the plan's table. Re-anchored on the base: `PortServe.test.ts`'s title is
at line 157 (plan said 149, after 13-05's edits); every other line matched.

## Task 1 (a1aef7a, RED)

The rule sits before the stale-exemption loop. It reads raw lines (not `strip()`ed). It walks its own file list
rather than `sources`, which is wider than the plan asked:

- `packages/*/{src,test,bench}`, `features/step-definitions` and `features/features`;
- `.ts`/`.tsx` including `.tst.ts` (`collect` drops those, but a tstyche title is a test title);
- `.feature` files (a scenario title is a title);
- `node_modules` and `lib` skipped.

The regex is `/\b(?:ADR|CCR|BEH|INV)-QD-NEXT\b/`, which also catches suffixed forms (`-NEXT-a`).

RED output on the base tree (14 lines, the only failures):

```
packages/core/src/PortDescription.ts:99  [no-numbering-placeholder] a placeholder id is not a citation; reserve a number with scripts/next-id.mjs and write that.
packages/core/src/PortRemote.ts:3  [no-numbering-placeholder] …
packages/core/src/PortRemote.ts:18  [no-numbering-placeholder] …
packages/core/src/PortWire.ts:32  [no-numbering-placeholder] …
packages/core/src/PortWire.ts:143  [no-numbering-placeholder] …
packages/core/src/TreeFold.ts:30  [no-numbering-placeholder] …
packages/core/test/PortConformance.test.ts:456  [no-numbering-placeholder] …
packages/core/test/PortRemote.test.ts:3  [no-numbering-placeholder] …
packages/core/test/PortRemote.test.ts:223  [no-numbering-placeholder] …
packages/core/test/PortServe.test.ts:157  [no-numbering-placeholder] …
packages/core/test/PortWire.test.ts:2  [no-numbering-placeholder] …
packages/devtools/src/model/Inspect.ts:9  [no-numbering-placeholder] …
features/step-definitions/SharedWorld.ts:76  [no-numbering-placeholder] …
features/features/port-calls/port-calls.steps.test.ts:179  [no-numbering-placeholder] …

14 house-style violation(s). See AGENTS.md.
```

AGENTS.md: a paragraph at the end of §11. The plan said "after its first paragraph", but §11 is a single paragraph,
so splitting it would have been wrong. The paragraph names the rule, `scripts/next-id.mjs`, ARCH-61 and CCR-QD-403,
and says change history in `spec/` is exempt (§15).

## Task 2 (f6c48a9)

The plan's table was applied, matching lost `4b1ed49`'s resolutions. Every target was checked on the tree first:

- `spec/decisions/107-…`, `spec/decisions/101-…`;
- `invariants.md` INV-QD-241 (:3295) and INV-QD-103 (:3070);
- 16-predicates BEH-QD-264, 30-port-calls BEH-QD-267.

`spec/README.md:362` (CCR-QD-192's history row) still quotes the old placeholders. It is change history and stays.

Insertion probe: `// ADR-QD-NEXT` appended to `packages/core/src/Walk.ts`, and `// describe("x (INV-QD-NEXT)", …)` to
`packages/http/test/http.test.ts`:

```
packages/core/src/Walk.ts:913  [no-numbering-placeholder] a placeholder id is not a citation; reserve a number with scripts/next-id.mjs and write that.
packages/http/test/http.test.ts:931  [no-numbering-placeholder] a placeholder id is not a citation; reserve a number with scripts/next-id.mjs and write that.

2 house-style violation(s). See AGENTS.md.
exit=1
```

Both files were restored with `git checkout`, and the rule went back to `house-style: 424 file(s) clean`, exit 0. The
same probe was run for the widened scope: `BEH-QD-NEXT-a` in `packages/react/test/DecisionOutcome.tst.ts` and
`CCR-QD-NEXT` in `features/features/concurrency/concurrency.feature`. Both were reported, then reverted, and the rule
was clean again.

## Gates

| Gate | Result |
|---|---|
| Task 1 verify (14 reports + AGENTS.md mention) | pass |
| Task 2 verify (house-style exit 0, grep empty, 4 port suites 246/246) | pass |
| `pnpm lint` | pass (exit 0; pre-existing warnings only) |
| `pnpm typecheck` | pass |
| `pnpm vitest run --project core --project devtools` | 99 files, 3037 tests, pass |
| `pnpm test:bdd` | 34 files, 566 tests, pass |

## Mutation (XC-05)

None of the five touched src files is in `13-mutation-base.json`. Their base was measured at `0925c2f` in a temporary
detached worktree (`scratchpad/qadi-base-1310`, removed with `git worktree remove`). The same scoped runs were done on
the final tree: `stryker.config.mjs --mutate` for the four core files, and `stryker.devtools.mjs --mutate Inspect.ts`.

| File | base (0925c2f) | after |
|---|---|---|
| PortRemote.ts | .8242 (75/91) | .8242 (75/91) |
| PortDescription.ts | 1 (8/8) | 1 (8/8) |
| PortWire.ts | .8 (4/5) | .8 (4/5) |
| TreeFold.ts | 1 (34/34) | 1 (35/35) |
| devtools Inspect.ts | 1 (78/78) | 1 (78/78) |

There is no drop: the src diff is comment-only. TreeFold's extra mutant comes from earlier phase work, not from this
plan.

## Deviations

1. **[Scope widened, Rule 2] The rule also scans `.tst.ts` and `.feature`.** It does not reuse `sources`: a placeholder
   in a tstyche title or a Gherkin scenario is the same defect. The count on the base is still 14, and both new file
   kinds were proven by probe.
2. **[Plan text] AGENTS.md placement:** the paragraph is at the end of §11, not after its first paragraph (§11 has
   only one).
3. **[Re-anchor]** `PortServe.test.ts:157`, not `:149`.

No changeset: only comments and test titles changed, plus the lint script. No package behavior changed.

## For 13-11

- CCR-QD-403 register row: 13-10's half. It covers `[no-numbering-placeholder]`, the 14 placeholders resolved as
  lost `4b1ed49` did, and the AGENTS.md §11 paragraph. 13-13 shares the row.
- REQUIREMENTS GAP-11 text says "7 `ADR-QD-NEXT`"; there were 14. Correct the text when ticking it.
- Traceability: none needed. The rule is a house-style rule, like the other `[…]` rules.

## Ids

- Used: CCR-QD-403 (cited in AGENTS.md; register row is 13-11's). No new ADR/BEH/INV.
- Cited with merged meanings: ADR-QD-107, ADR-QD-101, INV-QD-241, INV-QD-103, BEH-QD-264, BEH-QD-267.
- Left free: ADR-QD-121, 122, 124, 125; BEH-QD-360..367, 369..378; INV-QD-255, 256, 258, 260..264.

## Commits

| sha | subject |
|---|---|
| a1aef7a | test(13-10): refuse a numbering placeholder in source, tests and features |
| f6c48a9 | docs(13-10): resolve the 14 numbering placeholders |
