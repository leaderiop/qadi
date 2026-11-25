---
phase: QD-84-useconfigured-requires-configure-and-the-review-s-small-fin
plan: 10
subsystem: spec
tags: [adr, changeset, records]
requires: ["84-09"]
provides:
  - "ADR-QD-197 at Rev 1.0: the five decisions, every rejected alternative, the useTimeline memo rejection with its four reasons and the two records quoted as they read at 8ff027e1"
  - "ADR-QD-192 Rev 1.6 (dated amendment to decision 8, past text kept) and ADR-QD-193 Rev 1.11, both linking ADR-QD-197"
  - ".changeset/devtools-lens-reads-each-fact-once.md, a devtools patch ending No export changes."
affects: [84-11, 84-12, 84-13]
key-files:
  created:
    - spec/decisions/197-a-configurable-value-one-questions-path-for-the-lens-and-one-stop-ledger.md
    - .changeset/devtools-lens-reads-each-fact-once.md
  modified:
    - spec/decisions/192-feeds-and-the-dock-model-take-inputs-only-through-configure.md
    - spec/decisions/193-the-highlight-lens-is-a-headless-session-the-dock-model-owns.md
    - spec/decisions/index.yaml
    - spec/traceability.md
    - spec/README.md
status: complete
completed: 2026-11-25
commits: 2
plan_head_before: 64cf45bb
plan_head_after: ed31899b
actuals:
  tokens: 14000
  tasks: 2
  commits: 2
requirements-completed: []
---

# Phase QD-84 Plan 10: ADR-QD-197, the amendments and the changeset Summary

ADR-QD-197 records the `Configurable<I>` constraint with its inference at the three hooks, the lens publishing through
`set` with the reveal armed first, `useLens(lens, questions)`, the one stop ledger, and the `useTimeline` memo as a
rejection; ADR-QD-192 and ADR-QD-193 point at it, and the patch changeset claims no host-visible change.

## What was written

- ADR-QD-197 quotes `useTimeline.ts:69-71` and `DevtoolsDock.tsx:86` verbatim from `git show 8ff027e1:<path>`, each
  cited by file, line range, revision and enclosing function, and names the three call sites (`useDockModel.ts:30`,
  `useTimeline.ts:71`, `useDiagnostics.ts:44`) at that revision. The packages tree is identical between `3d0ccfbc` (the
  scratch inference check) and `8ff027e1`, so the claim that the check ran on equal source holds.
- Reason 4 of the rejection is worded as a reason not to make memoisation the hooks' rule, with the note that
  `useTimeline` never reaches the gates feed.
- Registered in `index.yaml`, a section 3 row naming the five source files, and the CCR-QD-476 row in `spec/README.md`
  (Rev 1.409) lists every document revised with the revision `spec-revise.mjs` gave it. BEH-QD-756 to 760 and
  INV-QD-413 and 414 are not named; plan 84-11 writes them.

## Checks

Both task verifies pass as written (the second ran after its commit, since it judges the commit). After each commit:
`spec-revise.mjs --check`, `verify-traceability.sh --strict` (PASS 21, FAIL 0), `check-doc-examples` (119 blocks),
`check-devtools-claims` (8 claims), `check-house-style` (617 files clean), and `84-check.mjs` `scan-ids`, `records`,
`commit` and `trailers` all pass. The ADR-QD-192 diff removes only Revision, Status and Change History rows.

## Commits

- d793a385: docs(84-10): record ADR-QD-197
- ed31899b: docs(84-10): amend ADR-QD-192 and ADR-QD-193, and add the changeset

## Deviations from Plan

- The commits were made with `git commit` directly and judged afterwards with `84-check.mjs commit`, as in 84-09; the
  verify lines run `commit` mode, which judges an existing commit, so both verifies ran after their commit.
- One phrase ("no longer") in the new ADR-QD-192 amendment was reworded before committing because `scan-ids` refuses
  phase-relative wording outside a change history.

## Known Stubs

None.
