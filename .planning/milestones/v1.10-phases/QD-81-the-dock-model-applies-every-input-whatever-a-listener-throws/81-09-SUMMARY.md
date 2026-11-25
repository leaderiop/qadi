---
phase: QD-81
plan: 09
subsystem: docs
tags: [readme, changeset, spec, devtools, dock-model, callAll]
requires:
  - phase: QD-81
    provides: the listener contract specified (81-08), ADR-QD-194 and CCR-QD-473 begun (81-07), the measured behaviour (81-04 to 81-06)
provides:
  - packages/devtools/README.md feeds section restated for the closed windows and the capacity change's AggregateError
  - a @qadi/devtools patch changeset
  - CCR-QD-473 completed, README at its own Rev 1.389
affects: [81-10, 81-11]
key-files:
  created:
    - .changeset/devtools-configure-applies-every-input.md
  modified:
    - packages/devtools/README.md
    - spec/README.md
key-decisions:
  - "Decided autonomously: the README states the dock model's configure rule in the feeds section as the dock's, since makeDockModel is package-private and has no overview row"
  - "Decided autonomously: CCR-QD-473 needs no Unused entry, every reserved number is used once"
requirements-completed: [COLL-06, WX-02, WX-03, WX-07]
duration: 15min
completed: 2026-11-24
status: complete
commits: 2
plan_head_before: f2869506b4cfd3c5c46cbd793ba09da0a2d1bc55
plan_head_after: 3f8b01e75b024eda39c57c21894955bc57860559
actuals:
  tokens: 6000
  tasks: 2
  commits: 2
coverage:
  - id: D1
    description: "The README's feeds section and a @qadi/devtools patch changeset tell a host what a throwing listener now does"
    requirement: COLL-06
    verification:
      - kind: command
        ref: "the task 1 verify: three superseded-phrase refusals, check-doc-examples, check-website-doc-examples, scan-ids, the past changeset unchanged"
        status: pass
    human_judgment: false
  - id: D2
    description: "No export moved and CCR-QD-473 names every changed document at its final revision"
    requirement: WX-03
    verification:
      - kind: command
        ref: "the task 2 verify: unchanged overview, website and manifests; the api-surface line equals the base; spec-revise --check; pnpm spec:verify:strict"
        status: pass
    human_judgment: false
---

# Phase QD-81 Plan 09: The README, the changeset and CCR-QD-473 completed Summary

The devtools README and a `@qadi/devtools` patch changeset now state that the dock applies every input whatever a host listener throws, and CCR-QD-473 is complete with the public surface shown unmoved.

## Accomplishments

- **README** (`packages/devtools/README.md`, "Without React: the feeds"): the two superseded passages (a throw leaving a status wrong with nothing running; the status throw that escapes and starts no read) are replaced. A status that announces work starts it whatever a listener throws and the throw is rethrown after; the gates tick sentence stays; a capacity change's two throws come back as one `AggregateError`, the timeline's first, and the read starts; the dock's `configure` applies every input and rethrows after the last step; the sightings rail is a derived store.
- **Changeset** `.changeset/devtools-configure-applies-every-input.md`: `"@qadi/devtools": patch`, one paragraph; no upgrade-guide entry. `.changeset/devtools-capacity-change-reads.md` is unchanged.
- **CCR-QD-473** (`spec/README.md` Rev 1.389, "CCR-QD-473 completed"): the row names the README at its own revision and each document at its final revision (ADR-QD-194 1.1, 177 1.2, 185 1.7, 191 1.1, 192 1.5, 28-devtools-screens 1.68, invariants 1.220, traceability 1.311).

## Export surface

`spec/overview.md`, `apps/website` and every `packages/*/package.json` equal `phase_base`.

api-surface: 942 export(s) documented across 9 package(s)

## Reserved numbers

| Number | Used in |
| ------ | ------- |
| ADR-QD-194 | `spec/decisions/194-a-run-of-calls-applies-every-call-whatever-one-throws.md` (81-07) |
| BEH-QD-741 to BEH-QD-745 | `spec/behaviors/28-devtools-screens.md` (81-08) |
| INV-QD-407, INV-QD-408 | `spec/invariants.md` (81-08) |

None is Unused.

## Deviations from Plan

None - plan executed exactly as written.

## Task Commits

1. Task 1: `2d5c937f` docs(81-09): the devtools README and the patch changeset
2. Task 2: `3f8b01e7` docs(81-09): CCR-QD-473 completed

## Known Stubs

None.

## Self-Check: PASSED

Both files created or modified exist, both commits are reachable from HEAD, `pnpm spec:verify:strict` and `spec-revise.mjs --check` pass.
