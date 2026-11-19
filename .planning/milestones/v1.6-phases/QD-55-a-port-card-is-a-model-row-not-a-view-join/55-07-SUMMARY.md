---
phase: QD-55-a-port-card-is-a-model-row-not-a-view-join
plan: 07
subsystem: spec
tags: [adr, behaviours, devtools, services-store, mutation-evidence, ARCH-102]
phase_base: 0c349d6fc46978fe546dcb4767b94c17cbf7b03c
requires: ["55-06"]
provides:
  - "ADR-QD-168 (spec/decisions/168-a-port-card-is-a-model-row.md, Rev 1.0) and its index.yaml entry"
  - "ADR-QD-047 Rev 1.17 with the CCR-QD-446 ninth-store amendment"
  - "BEH-QD-611..615 in spec/behaviors/28-devtools-screens.md (Rev 1.31) and four dated amendment notes"
affects: [55-08, 55-09]
tech-stack:
  added: []
  patterns: ["ADR in ADR-QD-162's shape with ADR-QD-167's Alternatives rejected and Mutation sections; mutation numbers copied from the committed JSONs"]
key-files:
  created:
    - spec/decisions/168-a-port-card-is-a-model-row.md
  modified:
    - spec/decisions/index.yaml
    - spec/decisions/047-a-headless-devtools-model.md
    - spec/behaviors/28-devtools-screens.md
key-decisions:
  - "ADR-QD-168 states the services store's rule as the identity of its four inputs, not as a promise about a status transition (Off to Live passes through Starting and notifies twice)"
  - "ADR-QD-168 and BEH-QD-614 record that a metric word outside the registry is no longer reported, a behaviour change from the base that the PortActivity.port narrowing makes"
requirements-completed: [CARD-05, WX-02]
duration: 15min
completed: 2026-11-18
status: complete
commits: 2
plan_head_before: 84bf595a6bc713fc77089a559909db5b980241fb
plan_head_after: 6a3b4c723a0d661b9ba5c68ae104c77012eaee28
actuals:
  tokens: 13000
  tasks: 2
  commits: 2
---

# Phase QD-55 Plan 07: ADR-QD-168 and BEH-QD-611..615

**ADR-QD-168 records the port card as a model row (four-tag `ServicesView`, closed calls union, `PortActivity.port` as `PortName`, the dock model's ninth store) with the mutation numbers copied from the committed JSONs, ADR-QD-047 is amended for the Services tab, and BEH-QD-611..615 are normative in doc 28.**

Note: `REQUIREMENTS.md` is untouched per the phase instructions (CARD-* close at 55-09, WX-* with the milestone); `requirements-completed` copies the plan's ids per the template.

## Records, each at its final revision

| Record | Revision | Commit |
| ------ | -------- | ------ |
| `spec/decisions/168-a-port-card-is-a-model-row.md` (QADI-ADR-168, Status `Accepted — amends ADR-QD-047; follows ADR-QD-162; keeps ADR-QD-160`) | 1.0 | `2d30caed` |
| `spec/decisions/index.yaml` (ends with the ADR-QD-168 entry; ADR-QD-047's status string gains `; amended 2026-11-18 (the port cards are the dock model's ninth store)`) | n/a | `2d30caed` |
| `spec/decisions/047-a-headless-devtools-model.md` (CCR-QD-446 amendment, Status row entry; the CCR-QD-440 amendment untouched) | 1.16 -> 1.17 via spec-revise | `2d30caed` |
| `spec/behaviors/28-devtools-screens.md` (BEH-QD-611..615 after BEH-QD-585; notes on BEH-QD-465, 573, 575, 216; no `typescript`/`tsx` fence added) | 1.30 -> 1.31 via one spec-revise | `6a3b4c72` |

## What ADR-QD-168's `## Mutation` says

Copied from `55-mutation-base.json` and `55-mutation-after.json` (Task 1's verify recomputes every `detected/scored` and requires it in the section): `DockModel.ts` 1 (123/123) -> 1 (145/145); `PortCards.ts` not on the base -> 1 (126/126); `Wiring.ts` 1 (50/50) -> 1 (48/48); no survivor in any. D-15's comparison held (`WX-05 holds (D-15)`); the static-ignored credit is counted for `PortCards.ts` only (14 ignored mutants, all Killed in the `ignoreStatic:false` evidence run, 140 Killed in all), `DockModel.ts` is judged on its gate-run score. The `Wiring.ts` loss of 2 detected mutants is stated as not traced to lines, as 55-06 recorded it.

## Anchors 55-08 must match

The five BEH headings (each once, in doc 28):

- `## BEH-QD-611: A port card is one model row, keyed by its wired service`
- `## BEH-QD-612: A card's wording is stated once, in the model`
- `## BEH-QD-613: A card's recent calls are a closed union the panel prints`
- `## BEH-QD-614: Port activity reads one entry per registry port`
- `## BEH-QD-615: The services store is one moment, and keeps its reference when nothing moved`

The two INV headings 55-08 must write exactly (they are linked from the five BEHs and from ADR-QD-168):

- `## INV-QD-355: A port card's readings are joined by PortName in one pure model function` (`../invariants.md#inv-qd-355-a-port-cards-readings-are-joined-by-portname-in-one-pure-model-function`; linked from BEH-QD-611, 613, 614, 615)
- `## INV-QD-356: The Services panel computes nothing` (`../invariants.md#inv-qd-356-the-services-panel-computes-nothing`; linked from BEH-QD-612)

## Truthful restatements of the two deviations

- **M54 (55-05):** ADR-QD-168 (Decision, "Two things that differ from what was first planned") and BEH-QD-615 say that `Off` to `Live` passes through `Starting`, so the store notifies twice and ends on a new, structurally equal view, and that M54 pins `Live` to `Stopped(sampled)` keeping its reference. The rule is stated as the identity of the four inputs.
- **`PortActivity.port` narrowing (55-03):** ADR-QD-168 item 6, BEH-QD-614 and the BEH-QD-216 note say that a word written to a port metric outside the registry is no longer reported, where the base reported it, and that this is Breaking for `@qadi/devtools`.

## Verification

- Task 1 verify (the plan's node script) exit 0: `ADR-QD-168 recorded; ADR-QD-047 amended`. Task 2 verify exit 0: `BEH-QD-611..615 recorded; four behaviours amended`.
- `node scripts/spec-revise.mjs --check` exit 0 after each revision; `pnpm spec:examples` (`doc-examples: 116 block(s) compile`) and `pnpm spec:claims` (`devtools-claims: 8 claim(s) registered`) pass.
- No source, test, script, `AGENTS.md` or `spec/overview.md` change since `phase_base`. No id outside the reservation; `next-id.mjs` was not run. `spec:verify:strict` is left to 55-08 as planned.

## Task Commits

1. Task 1: `2d30caed` `docs(55-07): ADR-QD-168, a port card is a model row`
2. Task 2: `6a3b4c72` `docs(55-07): BEH-QD-611..615`

## Deviations from Plan

None - plan executed exactly as written. (Two statements in the ADR go beyond the plan's list and are recorded above as key decisions: the M54 and the registry-word restatements the orchestrator asked for.)

## Known Stubs

None.

## Self-Check: PASSED

- `spec/decisions/168-a-port-card-is-a-model-row.md` exists; `2d30caed` and `6a3b4c72` are ancestors of HEAD.
- `git status` shows only the pre-existing `.planning/config.json` modification (never staged).
