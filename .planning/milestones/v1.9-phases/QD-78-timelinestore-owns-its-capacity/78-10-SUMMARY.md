---
phase: QD-78-timelinestore-owns-its-capacity
plan: 10
subsystem: devtools-model-mutation
tags: [mutation-close, stryker, scans, devtools]
requires: [78-09]
provides:
  - the mutation close of Timeline.ts, TimelineStore.ts, TimelineFeed.ts and DockModel.ts on one head, with no Survived or NoCoverage mutant
  - the close scans of the final tree
affects: [78-11]
key-files:
  created:
    - .planning/phases/QD-78-timelinestore-owns-its-capacity/78-mutation-close.json
  modified:
    - packages/devtools/src/model/TimelineStore.ts
decisions:
  - "The base's one survivor (TimelineStore.accept's `if (next === timeline) return;`) was equivalent, so the guard was deleted rather than tested or waived; ExternalStore.set is the one place that decides on identity (decided autonomously by the orchestrator, option 2 of three)"
requirements-completed: []
metrics:
  duration: 35min
  completed: 2026-11-24
status: complete
commits: 2
plan_head_before: 2141bb7dfba782a8232667a5462dd7aef18e501a
plan_head_after: 77ba1cc4
actuals:
  tokens: 30000
  tasks: 2
  commits: 2
---

# Phase QD-78 Plan 10: the mutation close and the close scans Summary

All four model files close at or above their base score with 0 Survived and 0 NoCoverage, after the store's one base
survivor was removed with the redundant guard it sat on. Every scan of the final tree is clean.

## Commits

| Task | Commit | Files |
| ---- | ------ | ----- |
| source (deviation, see below) | `4d013fbf` | `packages/devtools/src/model/TimelineStore.ts` |
| 1 (tracer) | `77ba1cc4` | `78-mutation-close.json` |
| 2 | none | scans only; this summary |

## Base and close scores

Measured with the base's invocation, `pnpm exec stryker run stryker.devtools.mjs --mutate <file>`, each group alone
in the background; the close record holds the four groups on `4d013fbf`.

| File | base detected/valid | close detected/valid | Survived | No coverage | Ignored (base to close) |
| ---- | ------------------- | -------------------- | -------- | ----------- | ----------------------- |
| Timeline.ts | 107/107 | 113/113 | 0 | 0 | 10 to 9 |
| TimelineStore.ts | 32/33 | 39/39 | 0 (base 1) | 0 | 1 to 1 |
| TimelineFeed.ts | 50/50 | 41/41 | 0 | 0 | 10 to 10 |
| DockModel.ts | 70/70 | 72/72 | 0 | 0 | 10 to 10 |

- `compare`: `no file has an open or Ignored mutant its base did not have, and every score that fell lost only killed
  mutants`; 0 new Ignored mutants in every file.
- The dock keeps its score: 72/72 is not below 70/70 by cross-multiplication.
- The feed's valid count fell from 50 to 41 because the feed lost its second store; every one of its mutants is detected.
- `EXAMINED`: no entry. No file holds an Ignored mutant its base did not have, so no by-hand run was needed.
- `--self-test` ends `self-test: 31 passed`.

## Deviations from Plan

### The base survivor was equivalent, so its guard was removed

**[Rule 4 - decided autonomously by the orchestrator]** The first close (head `2141bb7d`) held one open mutant,
`TimelineStore.ts:73:11 ConditionalExpression -> false`, the base's own survivor (`:58` at the base) moved by the
phase's edits. It is the guard in `accept`:

```ts
if (next === timeline) return;
timeline = next;
if (frozen === undefined) view.set(next);
```

No behaviour tells the mutant (`if (false) return;`) from the original. Paused, `frozen` is defined, so nothing after the
guard runs. Unpaused, the view's value is `timeline`: every writer of `timeline` (`accept`, `clear`, `resize`,
`setPaused(false)`) puts it into the view in the same step, and `ExternalStore` holds the value before it notifies. So
`view.set(next)` receives the reference it already holds, and `set` begins with `if (next === current) return;`
(`ExternalStore.ts`). The guard repeated `set`'s own.

Options put to the owner's standing rule: accept it as equivalent, delete the redundant guard, or restructure. The
orchestrator chose to delete it (the most complete and clean). The line removed, with its comment:

```ts
// A duplicate returns the identical timeline, so this is where a replaying
// feed stops costing a render.
if (next === timeline) return;
```

`accept` is now `timeline = ingest(timeline, record); if (frozen === undefined) view.set(timeline);` with a two-line
comment that a duplicate returns the identical timeline and `set` notifies only for a new reference, so a replaying
feed costs no render. No `let`, `as` or `!` was added.

- Text that described the early return: grepped `packages/devtools/src`, `packages/devtools/README.md` and `spec/`; only
  the comment above held it, and it was reworded in the same edit. `DockSession.ts`'s own `if (next === timeline)
  return;` is a different store, outside this plan's four files, and unchanged.
- The whole devtools project stayed green with no test edited: `Tests  1817 passed (1817)`.
- Commit `4d013fbf` precedes the close. The first close was discarded by `record close --restart`, and all four groups
  were measured again on `4d013fbf`; `78-mutation-base.json` was never touched.
- No plan verify pinned the old head or forbade a source change, so no check was adjusted.

**Total deviations:** 1 (a source deletion that removes a survivor the plan's own close could not close by test).

## Close scans

The verify of each task ran as a script from the scratchpad (`verify10-1.sh`, `verify10-2.sh`, extracted unedited from
the plan). Task 1's verify exits 0. Task 2's verify exits 0 on everything but its final `## Close scans` check, which
this section satisfies.

- Budgets, gates, DoD table, lint config, Stryker configs and manifests (`AGENTS.md scripts .oxlintrc.json
  spec/process/definitions-of-done.md package.json pnpm-lock.yaml packages/*/package.json stryker*.mjs tsconfig*.json`)
  equal `phase_base`: no difference. No budget moved, so no AGENTS.md table moved.
- `.changeset/` since `phase_base`: exactly `devtools-timeline-store-owns-its-capacity.md` added, none removed.
- house-style: `590 file(s) clean (3 declared switch(es), 75 type-test file(s))`, equal to the base fact.
- Added `packages/*/src` and `packages/*/test` lines: none past 90 columns (a line opening an `it(`, `it.effect(`,
  `describe(` or `test(` with its title excepted); none holds a skip/todo/only, `as`, `!`, `any`, `switch`,
  `fnUntraced`, `Record<string, unknown>`, `async`/`await`, `process.env`, console, an ambient clock, a module-scope
  `let`/`var`, or a `Stryker disable` comment.
- Added lines under `packages spec apps .changeset`, outside Change History cells and CCR register rows: no decision
  number, plan id, requirement id, `QD-NEXT` placeholder or phase wording.
- Every added test title is listed in `78-RED-EVIDENCE.md` as RED, RED at the change, or shown failing.
- The two 78-02 and two 78-03 commits are ancestors of, and precede, the first commit touching
  `packages/devtools/src`.
- TF4, TF14, TF26, TF27 and TF29 equal `phase_base`, and M55 and M56 equal the dock RED commit, block by block. No
  test file was edited in this plan.
- The feed holds no second store; `effectiveCapacity` is not in the barrel; the dock checks the capacity before its
  inputs move.
- ADR-QD-191, BEH-QD-726 to BEH-QD-730, INV-QD-401 and INV-QD-402 are present where they belong; the CCR-QD-470 row
  carries ARCH-125, CONF-05 and `Unused: none.`.
- The reservation file's sha256 equals the `reservation-sha256:` base fact (`6ecf5aba...`).
- `78-mutation-base.json` has exactly one commit since `phase_base`; no `packages/` file changed after the close head.

## Known Stubs

None.

## Self-Check: PASSED

- FOUND: `78-mutation-close.json`
- FOUND: commits `4d013fbf` and `77ba1cc4` (ancestors of HEAD)
