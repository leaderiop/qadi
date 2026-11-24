---
phase: QD-80-the-highlight-lens-is-a-headless-session-instrument-resolved
plan: 09
subsystem: spec-decisions
tags: [adr, spec, amendment, ccr, traceability]
requires: [80-08]
provides:
  - ADR-QD-193 (Rev 1.0), registered in index.yaml and traced in section 3
  - dated amendments of ADR-QD-185 (Rev 1.5), ADR-QD-047 (Rev 1.22) and ADR-QD-111 (Rev 1.3)
  - the CCR-QD-472 row begun in spec/README.md (Rev 1.371)
affects: [80-10, 80-11, 80-13]
key-files:
  created:
    - spec/decisions/193-the-highlight-lens-is-a-headless-session-the-dock-model-owns.md
  modified:
    - spec/decisions/index.yaml
    - spec/traceability.md
    - spec/decisions/185-the-dock-models-computed-stores-are-derived-stores.md
    - spec/decisions/047-a-headless-devtools-model.md
    - spec/decisions/111-a-gate-writer-is-resolved-once-by-its-provider.md
    - spec/README.md
    - .planning/phases/QD-80-the-highlight-lens-is-a-headless-session-instrument-resolved/80-check.mjs
    - .planning/phases/QD-80-the-highlight-lens-is-a-headless-session-instrument-resolved/80-RED-EVIDENCE.md
key-decisions:
  - "ADR-QD-193's Change History and the section 3 revision entry name ARCH-127 only; CCR-QD-472 is cited first by the amendments and the README row, because the strict gate fails a cited CCR with no register row"
  - "scan-ids reads only the newest entry of a Document Control history row, because every spec-revise on a document with an old entry holding the scanned wording or a decision number otherwise fails"
requirements-completed: []
metrics:
  duration: 55min
  completed: 2026-11-24
status: complete
commits: 4
plan_head_before: bb33665bd5f4ea90d9df4501378a6d7a2e0cb4fd
plan_head_after: 1254633d3c1e1f988bcb9e069cfa30b2c80b9db7
actuals:
  tokens: 21000
  tasks: 2
  commits: 4
---

# Phase QD-80 Plan 09: ADR-QD-193 and the amended decisions Summary

ADR-QD-193 records the decision (the headless lens session and its closed snapshot, the transition table, the tenth store,
the three-effect adapter, what a tab switch keeps, the one-shot reveal, the pick held by id and why `resolveHeld` is not
reused, the useId evidence and branch, and `QadiContextValue` without `instrument`), with a before/after table whose every
row names the test that holds its after. ADR-QD-185, ADR-QD-047 and ADR-QD-111 carry dated 2026-11-24 amendments, and the
CCR-QD-472 row is begun.

## Commits

- `c86341af` docs(80-09): ADR-QD-193, the highlight lens is a headless session the dock model owns (the ADR, `index.yaml`, `traceability.md` Rev 1.301)
- `7c57f73a` chore(80-09): scan-ids reads the Document Control history row as history (`80-check.mjs`, the evidence)
- `6ce43149` chore(80-09): scan-ids judges only the newest entry of the Document Control history row (`80-check.mjs`, the evidence)
- `1254633d` docs(80-09): amend ADR-QD-185, ADR-QD-047 and ADR-QD-111, and begin CCR-QD-472 (five files)

## Documents and revisions

| Document | Revision |
| -------- | -------- |
| `spec/decisions/193-the-highlight-lens-is-a-headless-session-the-dock-model-owns.md` | 1.0 (new) |
| `spec/decisions/185-the-dock-models-computed-stores-are-derived-stores.md` | 1.5 |
| `spec/decisions/047-a-headless-devtools-model.md` | 1.22 |
| `spec/decisions/111-a-gate-writer-is-resolved-once-by-its-provider.md` | 1.3 |
| `spec/traceability.md` | 1.302 (1.301 the ADR-QD-193 row, 1.302 the three amended rows) |
| `spec/README.md` | 1.371 (the CCR-QD-472 row says `Rev 1.371 (this row)`) |
| `spec/decisions/index.yaml` | no revision header; the ADR-QD-193 entry after ADR-QD-192 |

## Facts the ADR states, taken from the code and the evidence

- useId branch `new`: no `retain(ids)` command and no `clear`; the evidence is split between `GateId.remount.test.tsx` (the id)
  and the dock characterisation's gone-guard cell (the panel half), because `@qadi/devtools` does not import `@qadi/react`.
- The dock model has ten stores; `lens` is built by `makeDockModel`, `configure` touches none of it (`DockModel.test.ts`
  store-list and bare-lens cells, `ConfigureRule.test.ts` CR16 to CR20 and CR22).
- The type pin is `QadiProvider.tst.ts`'s key-set pin and an `instrument`-absence pin with no negative callable pin.
- The first ADR table row (a pick, then a tab switch) names the held cell and the StrictMode cell; the reveal row names the
  `LensSession.test.ts` reveal cell. No dock mutation score is stated (that is measured at the close).

## Deviations from Plan

**1. [Rule 3 - Blocking] CCR-QD-472 not cited by Task 1's files.** The plan asked ADR-QD-193's Change History to read
`new (ARCH-127, CCR-QD-472)`, and the section 3 revision entry to name CCR-QD-472, but `pnpm spec:verify:strict` ("CCR register
coverage") fails while a CCR number is cited and has no row in `spec/README.md`, and the row is Task 2's. Task 1's files
therefore cite ARCH-127 only (`Initial (ARCH-127)`, `the ADR-QD-193 row`), and strict was green at its commit as the verify
requires. CCR-QD-472 is first cited by the three amendments and the README row. Commit `c86341af`.

**2. [Rule 3 - Blocking] `80-check.mjs scan-ids` flagged an old history entry.** The judge looked for a Change History
heading, and spec documents keep history in the one-line Document Control row, whose older entries hold the scanned wording
(`spec/traceability.md:13`) and a decision number (`spec/README.md:13`, "D-01 approved"). Every `spec-revise` of such a
document would have failed the scan. The judge now reads that row's newest entry only (text before the first `<br>`), which is
the brief's "spec Change History rows are exempt", and ids are still scanned in that new entry. Self-test 113 passed (four new
cases); both failures are in `80-RED-EVIDENCE.md` under `## 80-09 the phase-relative wording scan`. Commits `7c57f73a`,
`6ce43149`. No verify text in the plan changed.

## Checks

- `node scripts/spec-revise.mjs --check`: every Revision matches its newest Change History entry
- `pnpm spec:verify:strict`: PASS 21, FAIL 0, SKIP 0 (after each of the two spec commits); CCR register coverage unchanged at the 17 tracked gaps
- `node scripts/check-doc-examples.mjs`: `doc-examples: 119 block(s) compile` (ADR-QD-193 has no typescript fence; its listing is a `ts` fence)
- `node 80-check.mjs scan-ids`, `commit` for both tasks: pass
- `node scripts/check-house-style.mjs`: `602 file(s) clean (3 declared switch(es), 77 type-test file(s))`
- Both verify one-liners of the plan ran as written under `bash -c` and passed (rc 0)

## For 80-10 and 80-11

- ADR-QD-193 Related names BEH-QD-736 to BEH-QD-740, INV-QD-405 and INV-QD-406 as plain text, with no links: the anchors do
  not exist yet. 80-10 writes the records and can link them (a spec-revise of ADR-QD-193 then bumps it to 1.1, and the
  CCR-QD-472 row must follow: it names ADR-QD-193 at Rev 1.0 now). It can also add `CCR-QD-472` to the ADR's history then,
  since the register row exists.
- The CCR-QD-472 row is begun: its summary cell holds the account of the decision with the five behaviour changes folded into
  "a tab switch keeps the pick ...", and does not yet name the new BEH/INV records, the restated BEH-QD-234, BEH-QD-700,
  BEH-QD-735, INV-QD-390 and INV-QD-107, the changesets, the upgrade guide, `spec/overview.md`, or the two devtools-spec notes.
  80-10 and 80-11 each add their documents at their revisions and run `spec-revise.mjs spec/README.md "..." --date 2026-11-24`;
  every such call bumps the README, so the row's `Rev 1.371 (this row)` must be moved to the new revision each time (the
  verify reads the live revision). Current README revision: 1.371; traceability: 1.302.
- ADR-QD-193's Consequences promise a **Breaking** `@qadi/react` minor and a `@qadi/devtools` patch: 80-11 must ship both changesets.
- The ADR's "What enforces it" quotes test titles verbatim; if a title is renamed later the ADR must follow.
- `index.yaml` carries the ADR-QD-193 entry; the three amended ADRs' `index.yaml` status strings were not edited (not in this plan's files).

## Known Stubs

None.

## Threat Flags

None: spec text only.

## Self-Check: PASSED

- FOUND: spec/decisions/193-the-highlight-lens-is-a-headless-session-the-dock-model-owns.md
- FOUND: c86341af, 7c57f73a, 6ce43149, 1254633d (ancestors of HEAD)
