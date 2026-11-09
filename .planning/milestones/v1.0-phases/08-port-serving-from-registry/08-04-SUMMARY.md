---
phase: 08-port-serving-from-registry
plan: 04
subsystem: spec
tags: [arch-53, adr-qd-114, serving-facet, ports, serv-02, xc-02, ccr-qd-392]
requires: ["08-01", "08-03"]
provides:
  - "ADR-QD-114 'A port states what it serves' (Revision 1.0), indexed and traced"
  - "ADR-QD-094 and ADR-QD-107 amendments citing ADR-QD-114 and CCR-QD-392"
  - "BEH-QD-331 and INV-QD-095 covering the serving facet"
affects: [08-06]
key-files:
  created:
    - spec/decisions/114-a-port-states-what-it-serves.md
  modified:
    - spec/decisions/index.yaml
    - spec/traceability.md
    - spec/decisions/094-a-port-is-described-once.md
    - spec/decisions/107-a-port-is-answered-remotely-through-its-description.md
    - spec/behaviors/34-remote-ports.md
    - spec/invariants.md
decisions:
  - "D-01 gate: RUN branch (08-01 d01_outcome: approved, d01_reason empty so none quoted); 08-03 status complete"
  - "INV-QD-095 was amended in place, not given a new invariant number"
metrics:
  duration: "~15 min"
  completed: 2026-11-08
status: complete
actuals:
  tokens: 6500
  tasks: 2
  commits: 2
plan_head_before: fbfd45f502af421f63833e4d60f0823e141210b2
plan_head_after: a23bb9cb4cbcba271b293479984892b89aa4a03b
---

# Phase 8 Plan 4: ADR-QD-114 and the serving-facet spec amendments Summary

ADR-QD-114 "A port states what it serves" records the serving facet 08-03 shipped (the D-01 approval, the six statements it removes, the rejected-`fixture` distinction and four alternatives), and ADR-QD-094, ADR-QD-107, BEH-QD-331 and INV-QD-095 follow it in the same change.

## Gate

`08-01-SUMMARY.md` has `d01_outcome: approved` (`d01_date: 2026-11-08`, `d01_reason: ""`) and `08-03-SUMMARY.md` has `status: complete`, so the plan ran. `ADR-QD-114` was free before Task 1 (only CCR-QD-391's reservation sentence and 08-03's own `spec/overview.md` change-history citation mentioned it).

## Tasks

| Task | Name | Commit |
| ---- | ---- | ------ |
| 1 | ADR-QD-114, index entry, traceability row | 7ca7435 |
| 2 | Amend ADR-QD-094, ADR-QD-107, BEH-QD-331, INV-QD-095 | a23bb9c |

## Spec documents touched, with the Revision spec-revise gave each (cited by plan 08-06's CCR row)

| Document | Revision | Note |
| -------- | -------- | ---- |
| `spec/decisions/114-a-port-states-what-it-serves.md` | 1.0 (new) | Document ID `QADI-ADR-114`, written with its own Change History |
| `spec/decisions/index.yaml` | n/a | entry after ADR-QD-111 (ADR-QD-112 and ADR-QD-113 are not in this tree) |
| `spec/traceability.md` | 1.127 -> 1.128 | ADR-QD-114 row, linking INV-QD-095 and INV-QD-241 |
| `spec/decisions/094-a-port-is-described-once.md` | 1.5 -> 1.6 | dated amendment, new port recipe adds the `PortServing` row |
| `spec/decisions/107-a-port-is-answered-remotely-through-its-description.md` | 1.1 -> 1.2 | dated amendment, `asked` left `PortWire` |
| `spec/behaviors/34-remote-ports.md` | 1.3 -> 1.4 | BEH-QD-331 paragraph |
| `spec/invariants.md` | 1.84 -> 1.85 | INV-QD-095 statement, Source, Enforcement, Related |

All `spec-revise` calls passed `--date 2026-11-08` (the parsing defect 08-01 logged); no Revision row was edited by hand.

## Names cited (all from 08-03-SUMMARY and re-read from disk)

`PortServing`, `PortServingOf`, `PortServingFacet<N, Args>` (`allowlist`, `leaves`, `asked`, `admitted`, `declare`), `ServedLeaves`, all in `packages/core/src/PortServing.ts`; `PortDescription.serving`; `answerRemotely` and `servingFor` in `PortRemote.ts`. Removed and described as such: `ADMITTED`, `Collector`, `collectNames`, `servingFor`'s five sets, `PortWire.asked`. Tests cited: `PortRemote.test.ts` describes "serving facets (SERV-02)" and "a declaration is admitted through the port's facet (SERV-02)", and `PortServing.tst.ts`. The ADR's description of `servingFor` was checked against the code on disk.

## Verification

`node scripts/spec-revise.mjs --check`, `pnpm spec:verify:strict` (21 pass, 0 fail, 0 skip) and `pnpm spec:examples` (101 blocks compile) are green. The region-scoped greps for BEH-QD-331 (`ADR-QD-114` present) and INV-QD-095 (`PortServing` present) pass, where both counted 0 before.

## Deviations from Plan

None - plan executed exactly as written. (The plan's step 3 for BEH-QD-331 allowed for a `typescript` fence naming a changed API; the section has none, so nothing needed to compile.)

## Known Stubs

None.

## Threat Flags

None. T-08-11: the approval date and (empty) reason come from 08-01-SUMMARY's `d01_*` keys and every code name from 08-03-SUMMARY, with `servingFor` and the facet shape re-read from disk. T-08-12: every revision went through `spec-revise.mjs`, and `--check` plus `spec:verify:strict` were run after each task.

## Self-Check: PASSED

- `spec/decisions/114-a-port-states-what-it-serves.md` exists; `ADR-QD-114` appears once in `spec/decisions/index.yaml` and in `spec/traceability.md`.
- Commits 7ca7435 and a23bb9c are ancestors of HEAD; `commits:` is measured from the plan ledger (2).
- `.planning/config.json` and `.planning/state.json` were not staged.
