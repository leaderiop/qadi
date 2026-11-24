---
phase: QD-81
plan: 07
subsystem: spec
tags: [adr, callAll, collect-and-rethrow, derived-store, begin-to-fork-window, spec-registers]
requires:
  - phase: QD-81
    provides: callAll, the closed windows, the rail as the fourth derived store and configure as seven steps (81-04 to 81-06), with their measured counts
provides:
  - ADR-QD-194 (Revision 1.0), registered in index.yaml and traced in section 3 of the traceability matrix
  - dated 2026-11-24 amendments of ADR-QD-177, ADR-QD-185, ADR-QD-191 and ADR-QD-192, past text untouched
  - CCR-QD-473 begun in spec/README.md
affects: [81-08, 81-09, 81-10, 81-11]
key-files:
  created:
    - spec/decisions/194-a-run-of-calls-applies-every-call-whatever-one-throws.md
  modified:
    - spec/decisions/177-one-throwing-listener-cannot-silence-the-rest.md
    - spec/decisions/185-the-dock-models-computed-stores-are-derived-stores.md
    - spec/decisions/191-a-timeline-store-owns-its-capacity.md
    - spec/decisions/192-feeds-and-the-dock-model-take-inputs-only-through-configure.md
    - spec/decisions/index.yaml
    - spec/traceability.md
    - spec/README.md
key-decisions:
  - "Decided autonomously: the CCR-QD-473 row is begun in the first commit, not the second, because verify-traceability.sh --strict fails on any CCR cited under spec/ with no register row, and ADR-QD-194's own Change History cites it"
  - "Decided autonomously: ADR-QD-192's amendment also restates decision 10's explorer and simulation counts (3 and 3 become 2 and 2), since they are the counts CR22 and BEH-QD-735 encode"
  - "Decided autonomously: BEH-QD-741 to BEH-QD-745, INV-QD-407 and INV-QD-408 are named in ADR-QD-194's Related as plain text, not links, because they do not exist until the next plan writes them"
requirements-completed: [COLL-06, WX-02, WX-07]
duration: 14min
completed: 2026-11-24
status: complete
commits: 2
plan_head_before: c35a5d19905cbb7f8e7bc34a79c5bfcf469b0367
plan_head_after: 929e4e04be0f607d206ce01491ac0309e4902b40
actuals:
  tokens: 14000
  tasks: 2
  commits: 2
coverage:
  - id: D1
    description: "ADR-QD-194 records callAll and its rule, the dock's seven steps and why each is idempotent, the rail as the fourth derived store, the timeline feed's two steps, the closed windows and why a publish-then-fork site is try/finally, the before/after table with each test, the alternatives and the consequences, with both messages quoted exactly"
    requirement: COLL-06
    verification:
      - kind: command
        ref: "pnpm spec:verify:strict; node scripts/spec-revise.mjs --check; 81-check.mjs scan-ids; 81-check.mjs commit"
        status: pass
    human_judgment: false
  - id: D2
    description: "ADR-QD-177, ADR-QD-185, ADR-QD-191 and ADR-QD-192 each carry a dated 2026-11-24 amendment naming ADR-QD-194 and CCR-QD-473, with their index.yaml statuses and traceability rows amended, and the CCR-QD-473 row names every document at its revision and the README at its own"
    requirement: WX-02
    verification:
      - kind: command
        ref: "pnpm spec:verify:strict; node scripts/spec-revise.mjs --check; the README row regex of the plan's second verify"
        status: pass
    human_judgment: false
  - id: D3
    description: "Only the reserved ids appear, in the ASCII form the registers use, and no decision number, plan id, requirement id, phase number or phase-relative wording enters spec text"
    requirement: WX-07
    verification:
      - kind: command
        ref: "node 81-check.mjs scan-ids"
        status: pass
    human_judgment: false
---

# Phase QD-81 Plan 07: ADR-QD-194 and the amendments it makes Summary

ADR-QD-194 records the decision of the phase (the listener contract stated once as `callAll`, the dock's seven idempotent steps, the sightings rail as the fourth derived store, the timeline feed's two steps and the closed begin-to-fork windows), and ADR-QD-177, ADR-QD-185, ADR-QD-191 and ADR-QD-192 each carry a dated amendment pointing at it, with CCR-QD-473 begun.

## Accomplishments

- **ADR-QD-194** (`spec/decisions/194-a-run-of-calls-applies-every-call-whatever-one-throws.md`, Revision 1.0): context with each defect and the failing assertion that reproduced it on the code before the change; six numbered decisions (the `callAll` rule with a `ts` signature fence, the seven steps in a table with what makes each idempotent, the rail, the timeline feed's two steps, the closed window with the `try`/`finally` reason decided autonomously at planning on 2026-11-24, reentrancy); a before/after table of fourteen behaviours each naming its test (DL1 to DL17, TF28, TF29, TF37, F31, SR6, G49, CR22); nine rejected alternatives, including the seven the plan listed; consequences (what stays: a gates tick's throw still ends the cadence, a listener that changes the inputs each time does not terminate; the mutation base of 88/88, 69/69, 35/35, 58/58 and 242/248 held as the floor for the close); what enforces it; Related.
- **Registers:** `index.yaml` entry after ADR-QD-193; a section 3 traceability row; the four earlier ADRs' index statuses, Document Control statuses and traceability rows each carry the amendment.
- **Amendments** (each in the file's own style, past text unchanged):
  - ADR-QD-177 Rev 1.2: `## Amendment` section. The rule is written once as `callAll`, decision 5 is closed, and the 2026-11-21 clause (a status listener's throw replaces the timeline listener's and starts no read) is superseded (TF29, with TF28 and F31).
  - ADR-QD-185 Rev 1.6: `> **Amended 2026-11-24 (CCR-QD-473)**` blockquote. The rail is the fourth derived store, internal, built first, the ten listed stores unchanged.
  - ADR-QD-191 Rev 1.1: `## Amendment` section. Decision 6's `finally` and decision 11's `try`/`finally` are `callAll` over the feed's two steps and the dock's seven; a refused capacity still throws first (M55), and a timeline listener's throw is still rethrown after the rest (M56).
  - ADR-QD-192 Rev 1.5: `## Amendment` section. Decisions 3 and 7 are `callAll`, every step runs on every `configure`, the dock's catalogue comparison is gone, and decision 10's counts are 2 and 2 for the explorer and the simulation.
- **CCR-QD-473** row in `spec/README.md` after CCR-QD-472, naming `spec/README.md` Rev 1.386 (this row), ADR-QD-194 Rev 1.0, ADR-QD-177 Rev 1.2, ADR-QD-185 Rev 1.6, ADR-QD-191 Rev 1.1, ADR-QD-192 Rev 1.5, `index.yaml` and `spec/traceability.md` Rev 1.309.

## Revisions produced by `spec-revise.mjs --date 2026-11-24`

| Document | Revision |
| -------- | -------- |
| `spec/decisions/194-...md` | 1.0 (new) |
| `spec/decisions/177-...md` | 1.1 to 1.2 |
| `spec/decisions/185-...md` | 1.5 to 1.6 |
| `spec/decisions/191-...md` | 1.0 to 1.1 |
| `spec/decisions/192-...md` | 1.4 to 1.5 |
| `spec/traceability.md` | 1.307 to 1.309 (two entries) |
| `spec/README.md` | 1.384 to 1.386 (two entries) |

## Task Commits

1. Task 1 (tracer): `881586e3` docs(81-07): ADR-QD-194, a run of calls applies every call whatever one throws (the ADR, `index.yaml`, `spec/traceability.md`, `spec/README.md`)
2. Task 2: `929e4e04` docs(81-07): amend ADR-QD-177, ADR-QD-185, ADR-QD-191 and ADR-QD-192, and begin CCR-QD-473 (the four ADRs, `index.yaml`, `spec/traceability.md`, `spec/README.md`)

## Verification

- `pnpm spec:verify:strict`: 21 pass, 0 fail, 0 skip, after each commit's content (relative links 5318 resolved; CCR register coverage unchanged at its known gap).
- `node scripts/spec-revise.mjs --check`: every revision matches its newest history entry.
- `81-check.mjs scan-ids`, `commit` (both subjects), `trailers` (19 plan commits, one trailer each): pass. `node scripts/check-doc-examples.mjs`: 119 blocks compile, the `ts` fence is not compiled.
- The second task's own verify, run as written apart from the shell-quoting of the revision read: four ADRs name CCR-QD-473 and ADR-QD-194, four index amendments, the README row names the README at 1.386, the amendment commit was the head when checked.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] CCR-QD-473 row begun in the first commit, so `spec:verify:strict` is green there**
- **Found during:** Task 1 (planning the commit)
- **Issue:** The plan has the first task's strict check pass with only the ADR, `index.yaml` and the traceability matrix, and begins the CCR row in the second task. `verify-traceability.sh` fails on any `CCR-QD-NNN` cited under `spec/` with no row in the README's register, and ADR-QD-194's Change History (a must-have: `Initial (ARCH-128, CCR-QD-473)`) and the traceability revision entry cite it.
- **Fix:** The first commit also holds `spec/README.md` at Rev 1.385 with the CCR-QD-473 row begun. The second commit extends the row with the four amended documents and takes the README to Rev 1.386. The `81-check.mjs commit` check was given the README as a fourth path for the first commit.
- **Files modified:** `spec/README.md`
- **Commit:** `881586e3`

**Total deviations:** 1 auto-fixed (1 blocking). **Impact:** none on content; the first commit holds four files, not three.

## Known Stubs

None.

## Threat Flags

None. T-81-15 is mitigated: every behaviour change in ADR-QD-194 names its test and the measured before and after, the four amended ADRs keep their past text, and `spec-revise.mjs --check` and `spec:verify:strict` are green.

## Next

Ready for 81-08: BEH-QD-741 to BEH-QD-745 and INV-QD-407 and INV-QD-408. ADR-QD-194's Related names them as plain text; 81-08 turns them into links, and the CCR-QD-473 row and the traceability matrix gain their revisions. ADR-QD-194's mutation paragraph states the base only; the close's numbers are recorded by the plan that takes them.

## Self-Check: PASSED

- `spec/decisions/194-a-run-of-calls-applies-every-call-whatever-one-throws.md`: found
- commits `881586e3` and `929e4e04`: found on `arch-wave-15`
- `spec:verify:strict`, `spec-revise.mjs --check`, `scan-ids`, `trailers`: pass
