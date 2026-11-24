---
phase: QD-79-feeds-and-the-dock-model-take-inputs-only-through-configure
plan: 13
subsystem: spec-decisions
tags: [adr, amendments, ccr, traceability, spec-revise, docs]
requires: ["79-12"]
provides:
  - ADR-QD-192 at Revision 1.0 with its index entry, its section 3 traceability row and one compiled fence
  - dated amendments of ADR-QD-137 (Rev 1.5), ADR-QD-173 (Rev 1.3) and ADR-QD-185 (Rev 1.3), each with a Status note, an index status note, a traceability note and a revision line
  - the CCR-QD-471 register row, after CCR-QD-470's, listing every spec document changed so far with its revision
affects: [79-14, 79-15, 79-16, 79-17]
key-files:
  created:
    - spec/decisions/192-feeds-and-the-dock-model-take-inputs-only-through-configure.md
  modified:
    - spec/decisions/137-a-devtools-session-owns-its-runs-through-a-scope.md
    - spec/decisions/173-the-devtools-headless-interface-is-its-feeds.md
    - spec/decisions/185-the-dock-models-computed-stores-are-derived-stores.md
    - spec/decisions/index.yaml
    - spec/traceability.md
    - spec/README.md
key-decisions:
  - "The ADR states eleven decisions (bare constructors; one rule over one normaliser per input type; capacity through effectiveCapacity; presence; the gates retry as the one exception; a quiet mend read only by a configure that moves an input; the timeline feed's one decision; useConfigured; the dock's inputs stated once and mapped once; the pre-subscribed counts; the simulation session left out), seven rejected alternatives plus two more the research measured, and a consequences list that separates the breaking changes from the three that are not"
  - "The consequences quote the hook-level instances() counts measured for this record (healthy registry read once plain and twice under StrictMode, where the code before the ADR read it twice and three times; subscribe counts unchanged; a failing registry read never), because no earlier plan pinned them"
  - "The React fallback is recorded as a ref written in a layout effect declared before the build effect, never a render-phase write; the pins run on the installed React only and the 19.2.4 peer floor is stated as not run in CI"
requirements-completed: []
metrics:
  duration: 50min
  completed: 2026-11-24
status: complete
commits: 2
plan_head_before: 30714c1158a3d7feaca376329f4478622f1c02ba
plan_head_after: 98711b65d11020246ec0c0530e221125bc617158
actuals:
  tokens: 26000
  tasks: 2
  commits: 2
coverage:
  - deliverable: "ADR-QD-192 in the template's shape with every decision, alternative, consequence and enforcing test file the truths list, a compiled fence, its index entry and its traceability row"
    verification:
      - kind: command
        ref: "the Task 1 verify of 79-13-PLAN.md (exit 0)"
        status: pass
    human_judgment: false
  - deliverable: "the three amendments with their Status, index, traceability and revision notes, and the CCR-QD-471 row after CCR-QD-470's naming ARCH-126 and the README's own revision"
    verification:
      - kind: command
        ref: "the Task 2 verify of 79-13-PLAN.md (exit 0)"
        status: pass
    human_judgment: false
---

# Phase QD-79 Plan 13: ADR-QD-192 and the amendments it makes

**ADR-QD-192 records that the feeds and the dock model take inputs only through `configure`, with the rule, the hook, the rejected alternatives and the measured consequences, and ADR-QD-137, ADR-QD-173 and ADR-QD-185 each carry a dated amendment that says which of their sentences change.**

## Accomplishments

- `spec/decisions/192-...md` (new, Rev 1.0, Status `Accepted — amends ADR-QD-137, ADR-QD-173 and ADR-QD-185`): Context (two ways in, the rule restated per feed, the dock's inputs stated three times, three hand-built hooks and the unconfigured first commit of fold (c)), eleven decisions, one `typescript` fence (a headless host builds `makeTimelineFeed()` bare, configures it, then subscribes), Alternatives considered, Consequences, What enforces it (each test file by path, with G43, G44, case 13, M55, M56 and TF4, TF14, TF26, TF27, TF29 named, gates 13 and 14, and the five base mutation scores) and Related.
- Facts quoted from the earlier summaries, not from the plan's expectations: no fallback export was needed (`DockModelInputs` stays package-private, the packed declaration names it through `DevtoolsDockProps`; api-surface stays at 942); the timeline feed's `configure` is the `sameFields` guard and then `try { resize } finally { readSource }`; G44's last stanza and case 13 changed with the gates rule; CR22's two count sets (timeline 2, dock 2, explorer 3, simulation 3, roles 0, diagnostics 1, timeline status 0, questions 2, services 1 while the layer is building, and 2, 3, 2 on diagnostics, questions and services when it builds at once); the mutation base 41/41, 73/73, 117/117, 77/78 and 72/72.
- ADR-QD-137 (Rev 1.5), ADR-QD-173 (Rev 1.3) and ADR-QD-185 (Rev 1.3): a `> **Amended 2026-11-24 (CCR-QD-471): ...**` blockquote linking ADR-QD-192, a Status note, an `index.yaml` status note, a note in each section 3 traceability row, and a revision line written by `spec-revise.mjs --date 2026-11-24`.
- `index.yaml` has the ADR-QD-192 entry after ADR-QD-191's, and `spec/traceability.md` (Rev 1.298) has its section 3 row after ADR-QD-191's.
- `spec/README.md` (Rev 1.365) has the CCR-QD-471 row after CCR-QD-470's, naming ARCH-126 and listing the README (this row), ADR-QD-192, the three amended ADRs, `index.yaml`, `traceability.md`, doc 28 (Rev 1.57) and `overview.md` (Rev 1.142) with their revisions.
- Both plan verifies exit 0; `spec:verify:strict` (21 pass, 0 fail), `spec-revise --check`, `check-doc-examples.mjs` (119 blocks, one more than before: the ADR's fence) and `check-house-style.mjs` pass. No number outside ADR-QD-192, CCR-QD-471 and ARCH-126 is written; no BEH or INV number is written (79-14's); `node scripts/next-id.mjs` was not run.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] The CCR-QD-471 row had to exist in Task 1's commit**
- **Found during:** the first `pnpm spec:verify:strict` after the ADR was written
- **Issue:** the register-coverage check fails on any cited CCR id with no row in `spec/README.md` ("drift from KNOWN_GAPS ... 471"). The ADR's Change History and the traceability revision line must cite CCR-QD-471, and Task 1's verify runs `spec:verify:strict`, but the plan adds the row in Task 2.
- **Fix:** Task 1's commit also carries `spec/README.md` (Rev 1.364) with a minimal "begun" row; Task 2 replaces it with the full row and bumps the README to Rev 1.365, as the plan describes. Both plan verifies pass as written.
- **Files modified:** `spec/README.md` in the Task 1 commit (outside that task's three files)
- **Commit:** 51ac3bab

No other deviation.

## Decisions Made (autonomous)

- The `instances()` counts in Consequences were measured for this plan with a scratch copy of the first-render harness (deleted afterwards, nothing left in the tree): healthy registry 1 read plain and 2 under StrictMode, failing registry 0, `subscribe` 1 and 2 healthy and 2 and 3 failing. The characterisation pins the `subscribe` counts and no `instances()` count, so the ADR states the change as a consequence rather than as a preserved fact.
- The amendment of ADR-QD-173 is a blockquote appended after Related, as the plan says, though the record's earlier amendments are `## Amendment` sections; ADR-QD-185 had none, so its blockquote follows Related too.
- The ADR names the changeset and the upgrade-guide section (`.changeset/devtools-feeds-take-inputs-through-configure.md`, `0.13: the feeds and the dock model take their inputs only through configure`) that the changeset plan writes.

## Risks for later plans

- 79-14 writes BEH-QD-731 to BEH-QD-735 and INV-QD-403 and INV-QD-404; the ADR and its traceability row name none of them yet, so that plan adds them to the ADR's Related list and to the row (each a `spec-revise` entry) and completes the CCR-QD-471 row, whose last sentence says it is completed with them.
- 79-15 completes the row with the changeset and upgrade-guide revisions and 79-16 re-closes the mutation floor the ADR quotes (the one `ExternalStore.ts` survivor is stated as closed with a test, never re-baselined).

## Known Stubs

None.

## Threat Flags

None. The change is spec text: no endpoint, auth path, file access or schema change.

## Self-Check: PASSED

- FOUND: spec/decisions/192-feeds-and-the-dock-model-take-inputs-only-through-configure.md
- FOUND commits: 51ac3bab (docs, ADR-QD-192), 98711b65 (docs, amendments and the CCR row), each with the one trailer
