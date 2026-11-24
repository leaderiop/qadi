---
phase: QD-79-feeds-and-the-dock-model-take-inputs-only-through-configure
plan: 07
subsystem: devtools-feeds
tags: [configure, same-fields, normaliser, timeline-feed, diagnostics-feed, devtools]
requires: ["79-06"]
provides:
  - sameFields exported from ExternalStore.ts, body unchanged, and sameFieldsOrAbsent beside it
  - completeTimelineInputs and the timeline feed's configure over complete records
  - completeDiagnosticsOptions and the diagnostics feed's configure by the presence rule
  - DiagnosticsOptions fields widened to `?: T | undefined`, pinned and listed in one commit
affects: [79-08, 79-09, 79-12, 79-16]
key-files:
  modified:
    - packages/devtools/src/model/ExternalStore.ts
    - packages/devtools/src/model/TimelineFeed.ts
    - packages/devtools/src/model/DiagnosticsStore.ts
    - packages/devtools/src/model/DiagnosticsFeed.ts
    - packages/devtools/test/model/ExternalStore.test.ts
    - packages/devtools/test/model/ConfigureRule.test.ts
    - packages/devtools/test/surface.tst.ts
    - spec/behaviors/28-devtools-screens.md
key-decisions:
  - "The normaliser output is held by the feed (`held`), so an omitted field and one holding `undefined` are one field before the rule compares anything"
  - "completeTimelineInputs is typed `Required<TimelineFeedInputs> & { readonly capacity: number }`, so `resize` takes the held capacity without a cast and a new input is a compile error until listed"
  - "The doc 28 listings now spell `Layer.Layer<never, unknown> | undefined`, exactly as the source does, rather than the shorter `Layer<never, unknown>` they used before"
  - "A configure(undefined) on a feed already off now returns before off(); the old off() on an already-off feed changed nothing observable"
requirements-completed: []
metrics:
  duration: 35min
  completed: 2026-11-24
status: complete
commits: 4
plan_head_before: c362ee3bbb4dadf84b2f095db8afcd6007e21f6e
plan_head_after: 3ac747f06cbd03421b87a33faff3b756f9ef2bfc
actuals:
  tokens: 4200
  tasks: 3
  commits: 4
coverage:
  - deliverable: "sameFields exported with an unchanged body, sameFieldsOrAbsent beside it, neither in a barrel; cells for both shown failing against four scratch edits (E1 to E4); the cells at :444 and :491 unchanged"
    verification:
      - kind: command
        ref: "the Task 1 verify of 79-07-PLAN.md (exit 0); ExternalStore.test.ts 41 tests passed"
        status: pass
    human_judgment: false
  - deliverable: "completeTimelineInputs declared as the plan states; the timeline feed holds the complete record and configure returns on sameFields(held, wanted); TF cells and CR1 to CR5 pass, pinned check passes"
    verification:
      - kind: command
        ref: "the Task 2 verify of 79-07-PLAN.md (exit 0); 79-pinned-check.mjs printed `pinned: 15 tests hold their assertions`"
        status: pass
    human_judgment: false
  - deliverable: "DiagnosticsOptions widened and pinned (the old pin fails against it, E7) and listed twice in doc 28 (revision 1.55); completeDiagnosticsOptions and sameFieldsOrAbsent(held, wanted) in configure; CR23 shown failing (E5, E6); the devtools project fails exactly CR11, CR12, CR16, CR17 (1857 tests); typecheck, tstyche, spec-revise check, api-surface (942 exports), house-style (3 switches, 75 type-test files) hold; pinned and characterisation checks pass; no forbidden construct added"
    verification:
      - kind: command
        ref: "the Task 3 verify of 79-07-PLAN.md (exit 0)"
        status: pass
    human_judgment: false
---

# Phase QD-79 Plan 07: The rule in the model, applied by the timeline and diagnostics feeds

**`sameFields` is a named export of `ExternalStore.ts` with `sameFieldsOrAbsent` beside it, and the timeline and diagnostics feeds each normalise their inputs once and ask the one rule whether anything moved; the devtools project now fails only the four RED cells that belong to the gates feed and the dock.**

## Accomplishments

- Commit ff510326: `sameFields` exported with its body byte-identical to `phase_base`; `sameFieldsOrAbsent` (absent equals only absent, else `sameFields`) added. Four cells in a new `describe("sameFields and sameFieldsOrAbsent")`.
- Commit 9fa2237b: `completeTimelineInputs` maps the capacity through `effectiveCapacity` (a refused bound throws before anything moves). `makeTimelineFeed` holds the complete record, builds the store at `held.capacity`, and `configure` is: closed check, normalise, return on `sameFields(held, wanted)`, otherwise `resize` and, in the `finally`, a read when the store resized or the source moved.
- Commit 60390277: `DiagnosticsOptions` fields are `?: T | undefined`; `completeDiagnosticsOptions` lives in `DiagnosticsFeed.ts` (a measured mutation file); the feed holds the complete record or `undefined`, and `configure` returns on `sameFieldsOrAbsent(held, wanted)`, else turns off for `undefined` and starts otherwise. CR23 pins `{ layer }` against `{ layer, collector: undefined, intervalMillis: undefined }` and `{}` against `{ layer: undefined }`. `surface.tst.ts` and both doc-28 listings state the widened shape in the same commit; `spec-revise` bumped doc 28 to 1.55.
- Whole devtools project (JSON reporter, run alone): 1857 tests, failing exactly CR11, CR12, CR16, CR17. `pnpm typecheck` and `pnpm test:tstyche` pass; `79-pinned-check.mjs` and `79-characterisation-check.mjs` pass.

Red evidence (in `79-RED-EVIDENCE.md`, section `## 79-07 ...`): E1 to E4 for the rule and its sibling, E5 (raw options held and compared) and E6 (identity comparison) for CR23 and CR6/CR7, E7 (the narrow pin against the widened type) for the type pin.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Two of the plan's verify one-liners failed on their own text, not on the code**
- **Found during:** running the Task 1 and Task 2 verifies after the commits
- **Issue:** Task 1's unchanged-cell diff ended its sed range at `^  }));`, a line the cell never has (it ends at four spaces), so the range ran to end of file and saw the cells this task appended. Task 2's normaliser grep required the whole declaration on one line, while the declaration is wrapped over several lines like the rest of the file.
- **Fix:** the range ends at `^    }));`; the Task 2 grep reads the file with line breaks flattened and tolerates the wrap. The checks are otherwise the same.
- **Files modified:** `79-07-PLAN.md`
- **Commit:** 3ac747f0 (`docs(79-07): fix verify quoting`)

No other deviation.

## Decisions Made (autonomous)

- Kept the feeds' constructor parameters as the plan states (`init ?? {}` for the timeline, `init` for diagnostics); 79-12 removes them.
- Spelled the doc-28 listings' `layer` field as `Layer.Layer<never, unknown> | undefined`, matching the source and the plan's verify, over leaving the older short form.

## Risks for 79-16 (mutation close)

- `TimelineFeed.ts`: the early `return` on `sameFields(held, wanted)` has no observable effect, since the code after it already did nothing for an unmoved capacity and source (`resize` returns false and no read starts). With the check replaced by `false`, CR1 to CR5 still pass, so its ConditionalExpression mutant may survive as an equivalent mutant against a base of 41/41.
- `DiagnosticsFeed.ts`: for `configure(undefined)` on a feed already off, dropping the `undefined`/`undefined` case from the rule changes nothing observable either (`off()` on an off feed publishes nothing). The same kind of survivor is possible. Neither was measured here; the plan leaves the mutation run to 79-16.

## Known Stubs

None.

## Threat Flags

None. No endpoint, auth path or file access was added; `DiagnosticsOptions` is a non-breaking widening (T-79-12, accepted).

## Self-Check: PASSED

- `packages/devtools/src/model/ExternalStore.ts` exports `sameFields` and `sameFieldsOrAbsent`; `TimelineFeed.ts` exports `completeTimelineInputs`; `DiagnosticsFeed.ts` exports `completeDiagnosticsOptions`.
- Commits ff510326, 9fa2237b, 60390277 and 3ac747f0 are ancestors of HEAD, each with the one trailer; the timeline commit holds exactly `TimelineFeed.ts`.
