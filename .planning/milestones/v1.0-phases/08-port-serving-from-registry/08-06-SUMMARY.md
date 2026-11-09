---
phase: 08-port-serving-from-registry
plan: 06
subsystem: spec
tags: [arch-53, adr-qd-094, adr-qd-114, ccr-qd-392, changeset, merge-gate]
requires: ["08-02", "08-03", "08-04", "08-05"]
provides:
  - "ADR-QD-094 always-ship amendment (Rev 1.7)"
  - "CCR-QD-392 row completed (files, breaks, numbers consumed)"
  - ".changeset/port-serving.md"
  - "upgrading page: mapPorts replacement and serving"
affects: []
key-files:
  created:
    - .changeset/port-serving.md
  modified:
    - spec/decisions/094-a-port-is-described-once.md
    - spec/traceability.md
    - spec/README.md
    - apps/website/src/content/docs/docs/reference/upgrading.md
decisions:
  - "D-01 approved branch taken throughout: ADR-QD-114 used, 08-05 skipped"
  - ".changeset/port-fixture-table.md left untouched: it names the fixture table and fixturePortsLayer without a two-argument form, so nothing it says became false"
  - "spec/overview.md left untouched: pnpm spec:api was green and the overview names no removed or missing export"
metrics:
  duration: "~35 min"
  completed: 2026-11-08
status: complete
actuals:
  tokens: 6000
  tasks: 3
  commits: 2
plan_head_before: 6ffeae35a78df801597da0346ad3a63349b9de0c
plan_head_after: 2c6c5ca98ab7fb68def6e1fbd60034d0a78e7a70
---

# Phase 8 Plan 6: Phase close, records, release note and merge gate Summary

ADR-QD-094 carries the always-ship amendment, traceability and the CCR-QD-392 row match the built tree, a changeset and the upgrading page tell consumers that `mapPorts` is gone, and the merge gate is green except for one environmental step described below.

## Tasks

| Task | Name | Result | Commit |
| ---- | ---- | ------ | ------ |
| 1 | Spec records | ADR-094 amendment (Rev 1.6 -> 1.7), traceability (1.128 -> 1.129), CCR-QD-392 row completed; overview untouched | 7ff20c6 |
| 2 | Release notes and upgrading page | `.changeset/port-serving.md` (new), upgrading page: one section and one paragraph | 2c6c5ca |
| 3 | Merge gate | No fallout fixes needed; see the result below | none |

## pnpm check:pr result (reported as run, not as green)

`pnpm check:pr` exited **1**. Steps 1 to 12 of 16 passed in the run: typecheck, lint, circular, test:tstyche, coverage (statements 99.08%, branches 96.78%, functions 99.08%, lines 99.54%; no threshold edited), test:bdd, spec:examples, spec:verify:strict (21 pass, 0 fail, 0 skip), spec:gates, spec:claims, spec:api (863 exports), spec:package.

Step 13, `pnpm example`, ran the example app's typecheck (pass), vitest (42 pass) and `next build` (pass), then failed at `playwright install --with-deps chromium`: the `--with-deps` part calls `sudo`, which needs a terminal password on this machine ("sudo: a password is required", "Failed to install browsers"). That is a host-permission failure, not a code failure. The chromium browsers are already in `~/.cache/ms-playwright`.

I then ran the rest of what the run did not reach, by hand, with the same commands the gate uses:

| Command | Exit |
| ------- | ---- |
| `pnpm --filter @qadi/example-nextjs test:e2e` | 0 (30 Playwright tests passed) |
| `pnpm spec:website-examples` | 0 (40 blocks compile) |
| `pnpm website` | 0 (45 pages built) |
| `pnpm spec:publish` | 0 (9 packages agree on 0.11.0) |

So every check the gate performs has passed, but there is no single `pnpm check:pr` run that exited 0 on this machine. A host with passwordless sudo (or CI) should confirm it end to end. Mutation is not part of `check:pr`. Logs are in the session scratchpad (`checkpr.log`, `e2e.log`, `s14.log`, `s15.log`, `s16.log`).

No budget, threshold or gate script was edited: `git diff --name-only 799a928 HEAD -- scripts vitest.config.ts stryker.config.mjs` is empty.

## Reserved numbers consumed

- ARCH-53: used (this phase).
- CCR-QD-392: used (opened by 08-01, completed here).
- ADR-QD-114: used (08-04 wrote `spec/decisions/114-a-port-states-what-it-serves.md`); 08-05 skipped by design, so no rejection note exists.

## `.changeset/port-fixture-table.md`

Not edited. It describes `PortFixtureData`, `PortFixtures`, `PORT_FIXTURES` and `fixturePortsLayer` as the fixture table and the one place fixture data becomes an environment, with no argument shape stated, so the per-port-setups form makes none of its claims false.

## Published status recorded in the changeset

The removed `mapPorts` is **Breaking (`@qadi/core`)**, published in 0.10.0, with the one-line migration `tabulatePorts(f)`. `fixturePortsLayer`/`PortFixtures` (ARCH-42) and the serving facet plus the `PortWire.asked` move (ARCH-31) postdate 0.11.0 and are stated as unreleased, not breaking. Packages: `@qadi/core` minor, `@qadi/testing` patch, `@qadi/devtools` patch.

## Reconciliation (Task 1 step 5)

`tabulatePorts`, `PortLayerVisitor`, `fixturePortsLayer`, `PortFixtures`, `PORT_FIXTURES`, `PortServing`, `PortServingFacet`, `ServedLeaves` and `PortDescription.serving` were each grepped in `packages/*/src` and exist where the records cite them (`Ports.ts`, `PortServing.ts`, `PortDescription.ts`). `mapPorts` remains only in `CHANGELOG.md` history files and in the ADR/README history that records its removal.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Traceability line numbers in the plan were stale**
- **Found during:** Task 1
- **Issue:** The plan's row numbers (269, 270, 339, 405) no longer matched the file. Row for `PortsLayer.test.ts` already said `tabulatePorts`/`mergePorts` (08-02 changed it).
- **Fix:** located rows by content. Edited the `Ports.tst.ts`, `Ports.test.ts`, `TestLayers.test.ts` and `PortRemote.test.ts` rows, added a `PortServing.tst.ts` row, and added `PortServing.tst.ts` to INV-QD-095's enforcement cell.
- **Files modified:** `spec/traceability.md`
- **Commit:** 7ff20c6

**2. [Rule 3 - Blocking] `spec-revise.mjs` needs an explicit `--date`** (defect logged by 08-01). Passed `--date 2026-11-08`; the script was not changed.

## Known Stubs

None.

## Threat Flags

None. T-08-14: facts in the changeset were checked against the 0.10.0 changelog and the post-0.11.0 pending changesets. T-08-15: every cited name was grepped in the tree and gates 13, `spec:verify:strict` and `spec-revise --check` pass. T-08-16: the full suite, BDD and coverage passed with no gate weakened.

## Self-Check: PASSED

- `.changeset/port-serving.md` exists and contains ARCH-53, Breaking and tabulatePorts; `spec/README.md` has one `| CCR-QD-392 |` row naming `port-serving.md`; ADR-094 contains CCR-QD-392.
- Commits 7ff20c6 and 2c6c5ca are ancestors of HEAD; `commits: 2` is measured from the plan ledger.
- `.planning/config.json` and `.planning/state.json` were not staged.
- Caveat stands: `pnpm check:pr` itself exited 1 on a sudo prompt (see above).
