---
phase: 12-lost-wave-integrity
plan: 05
subsystem: release-records
tags: [integrity, spec, changesets, upgrading, lost-id-sweep, mutation, phase-gate, lost-wave-port]

requires: ["12-02", "12-04"]
provides:
  - "BEH-QD-349, INV-QD-250, INV-QD-251; BEH-QD-311/314/337/203/146/152/230/231 amended; INV-QD-045 restated; INV-QD-100 cites INV-QD-250"
  - "ADR-QD-097 amendment, ADR-QD-047 cross-reference, ADR-QD-052 and ADR-QD-041 amendments, ADR-QD-078 revision note; index.yaml statuses"
  - "CCR-QD-397 (stream) and CCR-QD-398 (hydration) directly after CCR-QD-396"
  - "spec/overview.md names every Phase 12 export: gate 13 green (872 exports, 9 packages)"
  - "Two 0.12 upgrading.md entries with compiled `typescript` after-fences; changesets decision-stream-order and hydration-one-event; decision-log-http and dehydrate-in-engine amended in place"
  - "Mutation comparison against the phase base: every touched file at or above base; pnpm check:pr green"
affects: [13-01]

actuals:
  tokens: 110000
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns: []

key-files:
  created:
    - .changeset/decision-stream-order.md
    - .changeset/hydration-one-event.md
    - .planning/phases/12-lost-wave-integrity/12-05-SUMMARY.md
  modified:
    - spec/behaviors/26-decision-stream.md
    - spec/behaviors/27-devtools-timeline.md
    - spec/behaviors/19-hydration.md
    - spec/invariants.md
    - spec/traceability.md
    - spec/README.md
    - spec/overview.md
    - spec/decisions/097-a-decision-log-is-a-sink-and-its-own-history.md
    - spec/decisions/047-a-headless-devtools-model.md
    - spec/decisions/052-hydration-is-counted-where-both-ends-can-see-it.md
    - spec/decisions/041-a-mismatch-is-announced.md
    - spec/decisions/078-a-seed-is-its-own-type-and-the-payload-is-versioned.md
    - spec/decisions/index.yaml
    - apps/website/src/content/docs/docs/concepts/decision-lifecycle.md
    - apps/website/src/content/docs/docs/packages/devtools.md
    - apps/website/src/content/docs/docs/packages/react/hydration.md
    - apps/website/src/content/docs/docs/reference/upgrading.md
    - .changeset/decision-log-http.md
    - .changeset/dehydrate-in-engine.md
    - packages/core/src/DecisionStream.ts (comment only)
    - packages/react/src/HydrationEvent.ts (comment only)

key-decisions:
  - "12-01 T1 (D-54-c/e) from `_DECISIONS.md`: `option-a` — \"Cursor order on the wire, ordered by core's encoder; remove `frame`, `syncedFrame`, `decisionFrames` from `@qadi/http` (Breaking)\". Quoted in ADR-QD-097's 2026-11-10 amendment."
  - "12-03 T1 (D-53-b/g) from `_DECISIONS.md`: `option-a` — \"One `HydrationDrop` type for both ends (Breaking dehydrate `onDropped`); `HydrationEvent.ts` joins the react Stryker run\". Quoted in ADR-QD-052's 2026-11-10 amendment."
  - "No new ADR: both changes complete existing decisions (ADR-QD-097, ADR-QD-052/041/078), so they are amendments. ADR-QD-119 and ADR-QD-120 stay unused."
  - "Pending changesets that the change made false are amended in place (11-07's rule); the new behaviour gets its own changeset."

requirements-completed: [INT-01, INT-02, INT-03, INT-04, INT-05, INT-06]

coverage:
  - id: D1
    description: "Spec records under Phase 12's reservations only"
    requirement: XC-02
    verification:
      - kind: command
        ref: "Task 1 verify (spec:verify:strict 21/21, spec:claims, spec-revise --check) + word-diff lost-id sweep"
        status: pass
    human_judgment: false
  - id: D2
    description: "Gate 13 and the public record"
    requirement: XC-03
    verification:
      - kind: command
        ref: "Task 2 verify: spec:api, spec:examples (102), spec:website-examples (43), spec:gates, CCR order"
        status: pass
    human_judgment: false
  - id: D3
    description: "Mutation at or above the phase base; full PR gate"
    requirement: XC-01, XC-05
    verification:
      - kind: command
        ref: "12-mutation-score.mjs compare; pnpm check:pr"
        status: pass
    human_judgment: false

completed: 2026-11-10
status: complete
---

# Phase 12 Plan 05: Phase 12 in the spec, the overview, the website and the changesets — Summary

**Phase 12 is recorded: BEH-QD-349, INV-QD-250 and INV-QD-251 state what 12-01..12-04 built, gate 13 names every
new export, two upgrade entries and two changesets state the two Breaking changes, every touched file's mutation score
is at or above the phase base, and `pnpm check:pr` is green.**

## Decisions applied

- `_DECISIONS.md` "12-01 T1 (D-54-c/e)": **`option-a`** — "Cursor order on the wire, ordered by core's encoder; remove
  `frame`, `syncedFrame`, `decisionFrames` from `@qadi/http` (Breaking)". BEH-QD-314's requirement now says cursor order;
  BEH-QD-316 is unchanged (it changes only under option-c).
- `_DECISIONS.md` "12-03 T1 (D-53-b/g)": **`option-a`** — "One `HydrationDrop` type for both ends (Breaking dehydrate
  `onDropped`); `HydrationEvent.ts` joins the react Stryker run". BEH-QD-146 and BEH-QD-230 carry the one shape;
  ADR-QD-041 lists `ReporterThrew` and `DehydrationDropped` (option-a replaced `PayloadMixedSubjects`).

## Commits

| sha | subject |
|---|---|
| 071cbc3 | docs(12-05): record the stream's order and the hydration event in the behaviours, invariants and traceability |
| f2f3dd0 | docs(12-05): ADR amendments, overview rows, upgrade notes and changesets for the stream's order and the hydration event |
| (this) | docs(12-05): complete plan |

## Ids used (all grepped free before use)

| Reserved | Used for | Where |
|---|---|---|
| ARCH-60 | the ticket | every record below |
| BEH-QD-349 | a resumed stream loses and repeats nothing | `spec/behaviors/26-decision-stream.md` |
| INV-QD-250 | a resumed read loses nothing | `spec/invariants.md`, traceability §2 |
| INV-QD-251 | a supplied reporter cannot change a hydration outcome | `spec/invariants.md`, traceability §2 |
| CCR-QD-397 | the stream (ADR-QD-097, BEH-QD-349, INV-QD-250) | `spec/README.md`, after CCR-QD-396 |
| CCR-QD-398 | the hydration event (ADR-QD-052/041/078, INV-QD-251, INV-QD-045) | `spec/README.md`, after CCR-QD-397 |

**Unused:** ADR-QD-119, ADR-QD-120 (amendments, no new decision), BEH-QD-350..358 (`ReporterThrew` fitted BEH-QD-230
as a requirement, so BEH-QD-350 was not needed), INV-QD-252..254.

## Spec documents and revisions

| Document | Revision | What |
|---|---|---|
| `behaviors/26-decision-stream.md` | 1.13 → 1.14 | BEH-QD-349 new; BEH-QD-314 cursor order; BEH-QD-311/314/337 listings drop `frame`/`syncedFrame`/`decisionFrames` |
| `behaviors/27-devtools-timeline.md` | 1.10 → 1.11 | BEH-QD-203: prelude rules are core's `decodeDecisionStream` |
| `behaviors/19-hydration.md` | 1.15 → 1.16 | BEH-QD-146 (total dehydrate, `UnencodablePolicy`, `DehydrateOptions.onDropped` listing), BEH-QD-152 (throwing mismatch reporter contained), BEH-QD-230 (`HydrationDrop<A, R>`, eight reasons, reporter requirement), BEH-QD-231 (at least once) |
| `invariants.md` | 1.88 → 1.89 | INV-QD-250, INV-QD-251 new; INV-QD-045 restated; INV-QD-100 cites INV-QD-250 |
| `traceability.md` | 1.133 → 1.134 | §1 rows 19/26/27; §2 INV-QD-045/100/250/251; §3 ADR 041/047/052/078/097; §4 DecisionStream.test.ts/.tst.ts, HydrationEvent.test.ts and the http type-pin rows; §5 REQ-QD-028/033 |
| `README.md` | 1.129 → 1.130 | CCR-QD-397, CCR-QD-398 |
| `overview.md` | 1.78 → 1.79 | six core rows; vocabulary rows → `DecisionStream.ts`; http rows removed; react/devtools rows |
| ADR-QD-097 | 1.3 → 1.4 | amendment: order and cursor in core's codec-free `DecisionStream.ts` |
| ADR-QD-047 | 1.7 → 1.8 | cross-reference |
| ADR-QD-052 | 1.2 → 1.3 | amendment: one `HydrationEvent`, at least once, `UnencodablePolicy`, confinement file `HydrationEvent.ts` |
| ADR-QD-041 | 1.3 → 1.4 | amendment: `ReporterThrew`, `DehydrationDropped` |
| ADR-QD-078 | 1.3 → 1.4 | revision note: dehydration is total |

## Changesets

| Changeset | Bump | What |
|---|---|---|
| `decision-stream-order.md` (new) | `@qadi/core` minor, `@qadi/http` minor, `@qadi/devtools` patch | reconnect fix; six core exports; **Breaking** http `frame`/`syncedFrame`/`decisionFrames` removed; an older server still loses on a mid-prelude reconnect |
| `hydration-one-event.md` (new) | `@qadi/react` minor, `@qadi/core` minor | total dehydrate, contained reporters, at-least-once; **Breaking** `DehydrateOptions.onDropped` shape and `HydrationDrop`/`HydrationDropReporter` R; core `UnencodablePolicy` |
| `decision-log-http.md` (amended) | unchanged | its "`frame` is unchanged and still exported" and `decisionFrames` options line were false in this release |
| `dehydrate-in-engine.md` (amended) | unchanged | its "no public signature changes" was false in this release; points at `hydration-one-event` |

All three removed names and the `onDropped` shape were in 0.11.0 (checked against the `@qadi/http@0.11.0` and
`@qadi/react@0.11.0` tags), so both are Breaking. `upgrading.md` gains two `## 0.12:` entries, each with a `ts`
before-listing and a compiled `typescript` after-fence (website examples 41 → 43 blocks).

## Mutation comparison (XC-05)

Runs (the scoped commands in `12-mutation-score.mjs`'s header; react unscoped, 3 files), then `compare`, exit 0:

| File | Base (f1041fe) | Final |
|---|---|---|
| packages/core/src/DecisionLog.ts | 92.41 | 92.75 |
| packages/core/src/DecisionStream.ts | absent | 97.22 |
| packages/core/src/HydrationMetrics.ts | 100.00 | 100.00 |
| packages/http/src/DecisionLogHttp.ts | 100.00 | 100.00 |
| packages/http/src/DecisionStreamRoute.ts | 97.44 | 100.00 |
| packages/devtools/src/model/Source.ts | 97.20 | 100.00 |
| packages/devtools/src/model/Hydration.ts | 100.00 | 100.00 |
| packages/react/src/HydrationEvent.ts | absent | 100.00 |

React run overall 96.46 (DecisionOutcome 100, QuestionBook 94.44, both untouched). Config diff against the phase
base: only 12-04's `stryker.react.mjs` mutate line and 12-03's `DECISION_READ_BUDGET` (`HydrationEngine.ts` 3 → 2,
a tightening). No threshold, other budget or `KNOWN_GAPS` edit.

## Lost-id sweep (XC-02)

`git diff --word-diff=porcelain f1041fe -- spec packages apps examples features .changeset 'stryker*.mjs' scripts`,
added segments, the full lost range (ADR-QD-108..110, CCR-QD-383..391, BEH-QD-334..336, INV-QD-242..245, ARCH-46..57):

- Two source comments cited "the lost ARCH-54" / "the lost ARCH-53" (`DecisionStream.ts`, `HydrationEvent.ts`, added
  by 12-01/12-03). Rewritten to cite the lost commits by sha (`6c67e44`, `f27d049`); one BEH-QD-349 line likewise.
- Remaining hits, all merged meanings in text that moved or was re-wrapped: `ARCH-51` (merged dehydration in the
  engine) in `HydrationEngine.ts` comments and a traceability row, and `CCR-QD-390` (that merged change's CCR) in
  ADR-QD-078's traceability row.

The plan's line-level gate (`git diff -U0 | grep '^+'`) counts the whole one-line Change History cells, which carry
merged ids from earlier revisions, so it cannot be 0 for any revised document; the word-diff sweep is the
check that means what the gate intends (as in 11-07).

## Deviations

1. **[Rule 3] CCR rows written in Task 1's commit.** `spec:verify:strict`'s "CCR register coverage" fails while
   CCR-QD-397/398 are cited and not registered, so Task 1's verify could not pass without them.
2. **`HydrationCounts.test.ts` still cited for INV-QD-045.** The plan said to stop citing it; its "ACCOUNTS FOR EVERY
   ENTRY…" tests still assert the partition, so dropping it would understate the enforcement. It is listed after
   `HydrationEvent.test.ts`, the zero-entry probe and the new scenarios.
3. **The hook-shape amendment sits in BEH-QD-146 and BEH-QD-230**, where `DehydrateOptions` and `HydrationDrop` are
   listed. BEH-QD-152 (the mismatch) got the throwing-reporter containment instead.
4. **`packages/http.md` (website) not edited:** it names none of the removed exports.
5. **Two pending changesets amended** (`decision-log-http.md`, `dehydrate-in-engine.md`) beside the two new ones.
6. **Mutation runs scoped** with `--mutate` for core/http/devtools, as 12-01 recorded them (the base needs the same scope).
7. **Lost-id gate:** word-diff instead of the plan's line diff (above); two source comments edited.

## Gate results

- Task 1 verify: `spec:verify:strict` 21/21, `spec:claims`, `spec-revise --check`, the four greps: pass. Lost-id
  check by word diff (above).
- Task 2 verify: `spec:api` (872 exports, 9 packages), `spec:examples` (102 blocks), `spec:website-examples` (43),
  `spec:gates` (DoD table 25 steps), `spec:verify:strict`, `spec-revise --check`, CCR-QD-398 directly after 397,
  which follows 396, both changesets present: pass. `spec:publish`: 9 packages and 6 documents agree on 0.11.0.
- Task 3: `12-mutation-score.mjs compare` exit 0; `pnpm check:pr` exit 0 (below).

`pnpm check:pr` from a clean tree at `f2f3dd0`: exit 0, 16 of 17 steps (mutation skipped by design). Typecheck;
lint and house-style (417 files clean); circular (none); tstyche 177/177 in 38 files; coverage 4144/4144 in 161 files
(thresholds held); BDD 565/565; `spec:examples` 102 blocks; `spec:verify:strict` 21/21; `spec:gates` (DoD 25 steps,
139 references); `spec:claims`; `spec:api` 872 exports; `spec:package`; the Next.js example (typecheck, 42 unit, build,
30 e2e); `spec:website-examples` 43 blocks; the website build; `spec:publish` (9 packages, 6 documents on 0.11.0).

## Notes for Phase 13

- Phase 13's base is this plan's last commit.
- The pending changesets now hold Phase 12's changes; a later change to the stream or hydration amends
  `decision-stream-order.md` or `hydration-one-event.md`.
- `BEH-QD-337` is also used in `spec/behaviors/28-devtools-screens.md` (ARCH-58) beside the decision stream's
  BEH-QD-337; pre-existing, not touched here.
