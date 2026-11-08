---
phase: 02-one-port-read
plan: 03
subsystem: spec
tags: [spec, adr, invariants, traceability, ports, spans, qadi-core]

requires:
  - phase: 02-one-port-read
    provides: "02-01: pose/disclose on every description, readPort, signatureMatches; 02-02: the signature requirement on the wire and the key, PortWire without span projections"
provides:
  - "ADR-QD-109 (A port's span is projected once, and every read is one body), indexed, recording D-02 and D-03's choice"
  - "dated amendments to ADR-QD-077, ADR-QD-094, ADR-QD-107 and ADR-QD-058 citing ADR-QD-109 and CCR-QD-386"
  - "BEH-QD-227 and BEH-QD-332 requiring local equals served span attributes, apart from qadi.interpreter"
  - "INV-QD-244: a port's span says the same thing whoever asked"
  - "traceability rows for INV-QD-244 and ADR-QD-109 and the updated test rows"
affects: [02-04 CCR-QD-386 register row, overview, changeset and the gate run]

actuals:
  tokens: 37163
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "a spec amendment is an appended dated section on the amended ADR plus a spec-revise bump, never a rewrite of earlier text"

key-files:
  created:
    - spec/decisions/109-a-ports-span-is-projected-once-and-every-read-is-one-body.md
  modified:
    - spec/decisions/index.yaml
    - spec/decisions/077-both-interpreters-read-ports-through-one-module.md
    - spec/decisions/094-a-port-is-described-once.md
    - spec/decisions/107-a-port-is-answered-remotely-through-its-description.md
    - spec/decisions/058-hassignature-a-ninth-service-and-a-decomposable-leaf.md
    - spec/behaviors/30-port-calls.md
    - spec/behaviors/34-remote-ports.md
    - spec/invariants.md
    - spec/traceability.md

key-decisions:
  - "The new invariant is INV-QD-244, not the INV-QD-242 the plan saw at planning time: next-id printed 244 at execution (INV-QD-243 landed from phase 1)"
  - "ADR-QD-109 names the inaccurate PORT-04 premise plainly: the local signature span never carried onFile; it is recorded on neither span"
  - "BEH-QD-227's listing lines stay unchanged; the new REQUIREMENT block and its rationale paragraph go after the existing 'write through the description' requirement and its history paragraph"

patterns-established:
  - "Pass --date to scripts/spec-revise.mjs: without it the first positional argument (the document) is dropped by the argument filter and the script prints its usage line"

requirements-completed: [XC-02, PORT-04]

coverage:
  - id: D1
    description: "ADR-QD-109 exists with Document ID QADI-ADR-109, is indexed, cites D-02 against ADR-QD-107 and records D-03's choice including onFile"
    requirement: XC-02
    verification:
      - kind: other
        ref: "test \"$(ls spec/decisions/109-*.md | wc -l)\" = 1 && grep -c 'id: \"ADR-QD-109\"' spec/decisions/index.yaml = 1 && grep -q QADI-ADR-109 spec/decisions/109-*.md"
        status: pass
      - kind: other
        ref: "bash spec/scripts/verify-traceability.sh (ADR Document ID = file number, decisions/index.yaml -> disk: PASS)"
        status: pass
    human_judgment: false
  - id: D2
    description: "ADR-QD-077, 094, 107 and 058 each carry a dated amendment citing ADR-QD-109 and CCR-QD-386, with Revision bumped by spec-revise"
    requirement: XC-02
    verification:
      - kind: other
        ref: "test \"$(grep -l 'ADR-QD-109' spec/decisions/{077,094,107,058}-*.md | wc -l)\" = 4 && node scripts/spec-revise.mjs --check"
        status: pass
    human_judgment: false
  - id: D3
    description: "BEH-QD-227 and BEH-QD-332 state the one-projection, local-equals-served requirement; INV-QD-244 exists with Source and Enforcement; traceability links all of it"
    requirement: PORT-04
    verification:
      - kind: other
        ref: "node scripts/spec-revise.mjs --check && pnpm spec:examples (101 blocks compile)"
        status: pass
      - kind: other
        ref: "bash spec/scripts/verify-traceability.sh: 20 PASS, 1 FAIL (CCR register coverage names 386 until 02-04 adds its row)"
        status: unknown
    human_judgment: true
    rationale: "Whether the prose matches the code's meaning is a judgment; the gates check structure, links and compilation only. The strict traceability gate runs in 02-04"

duration: 18min
completed: 2026-11-08
status: complete
plan_head_before: f667543fe8f10b19586301730b3c2ba1fed60649
plan_head_after: da6d18d2407456499e04fc4dcad0609c5fe61efb
---

# Phase 2 Plan 03: Spec and decision records Summary

**ADR-QD-109 records that a port's span is projected once (`pose` and `disclose` on the description) and read through one body (`readPort`), with four amended ADRs, the local-equals-served requirement in BEH-QD-227 and BEH-QD-332, the new INV-QD-244, and its traceability rows.**

## Performance

- **Duration:** 18 min
- **Started:** 2026-11-08T02:26:00Z (approximate; the plan_head ledger was written at the first commit)
- **Completed:** 2026-11-08T02:45:00Z
- **Tasks:** 3
- **Files modified:** 10 (1 created, 9 modified), no code

## Accomplishments

- **ADR-QD-109** written from the facts verified at planning time and checked against the code (`readPort`, `countFor`'s three-arm `Match.type`, `servePortRead` as `readPort` under `Effect.withSpan`): the served signature span's missing requirement, the seven repeated bodies, the throwing store that exited as a Die. It states D-02 (not a contradiction of ADR-QD-107: the wire still never becomes a span), D-03's choice (served gains `qadi.meaning`, `qadi.signer_role`, `qadi.matched`; `onFile` on neither) and names PORT-04's inaccurate `onFile` premise.
- **Four amendments** appended to ADR-QD-077 (every read is one body), 094 (`pose` beside `disclose`, the signature key covers the requirement), 107 (the span projections leave `PortWire`, a throwing store is `Unavailable`) and 058 (the query carries the requirement as optional context). No earlier text rewritten.
- **BEH-QD-227** gains the REQUIREMENT that a span's question is `pose(request)` and its answer `disclose(answer, request)`, written by one body, local equal to served apart from the interpreter, with the history paragraph and the `onFile` statement. **BEH-QD-332** now says the served span carries exactly what a local read does, including a signature asker's requirement, and that a store that dies or throws is the port's typed error.
- **INV-QD-244** ("A port's span says the same thing whoever asked") with Source, Implication, Enforcement and Related, and traceability rows for it and for ADR-QD-109, plus updated rows for doc 30, `PortAccess.test.ts`, `PortServe.test.ts`, `PortRemote.test.ts` and `PortConformance.test.ts`.

## Task Commits

1. **Task 1: ADR-QD-109 and its index entry** - `9137da5` (docs)
2. **Task 2: amendments to ADR-QD-077, 094, 107 and 058** - `b93a3d1` (docs)
3. **Task 3: BEH-QD-227/332, INV-QD-244 and the traceability rows** - `da6d18d` (docs)

**Plan metadata:** the docs commit that carries this SUMMARY.

## Revisions and ids (for plan 02-04's CCR-QD-386 row)

| Document | New Revision |
| -------- | ------------ |
| `spec/decisions/109-…md` (new) | 1.0 |
| `spec/decisions/077-…md` | 1.2 |
| `spec/decisions/094-…md` | 1.5 |
| `spec/decisions/107-…md` | 1.1 |
| `spec/decisions/058-…md` | 1.1 |
| `spec/behaviors/30-port-calls.md` | 1.6 |
| `spec/behaviors/34-remote-ports.md` | 1.1 |
| `spec/invariants.md` | 1.79 |
| `spec/traceability.md` | 1.122 |

`spec/decisions/index.yaml` has no revision header. **INV id used: INV-QD-244.** If a sibling phase claims the same id before merge, renumber on merge (the README register's rule); the id appears in the ADR's Related, BEH-QD-227, the invariant, and three traceability rows.

## Decisions Made

- INV-QD-244 rather than 242: `next-id INV` printed 244 at execution because phase 1 landed INV-QD-243. Recorded, as the threat register's T-02-10 asks.
- The ADR's Related links ADR-QD-037 through its real file name (`037-circular-imports-and-type-level-tests-are-gates.md`), not a guessed one.
- BEH-QD-227's code-fence listing is untouched, as the plan said: it was already right for the signature span.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] `scripts/spec-revise.mjs` prints its usage line unless `--date` is passed**
- **Found during:** Task 2
- **Issue:** the plan's `node scripts/spec-revise.mjs <file> "<what changed>"` form exited 2. The script filters positional arguments with `index !== dateFlag + 1`; with no `--date`, `dateFlag` is `-1`, so index 0 (the document) is dropped and `doc` is undefined.
- **Fix:** passed `--date 2026-11-08` on every call (today's date, the same value the default would give). The script itself is not edited, as it is outside this plan's files; logged below.
- **Files modified:** none beyond the intended spec files.
- **Verification:** `node scripts/spec-revise.mjs --check` passes.

**Total deviations:** 1 auto-fixed (1 blocking, worked around). **Impact:** none on content.

## Deferred Issues

- `scripts/spec-revise.mjs`: the argument filter drops the document when `--date` is omitted (see above). Not fixed here; a one-line fix is to filter on `dateFlag === -1 ? true : index !== dateFlag + 1`. Out of scope for a spec-only plan.

## Issues Encountered

- `bash spec/scripts/verify-traceability.sh` fails exactly one check, "CCR register coverage", because CCR-QD-386 is cited by the amendments and the register row does not exist yet. That is expected and owned by 02-04 (the plan defers `spec:verify:strict` for this reason). Every other check passes: 89 invariants traced, 90 ADRs traced, ADR Document ID equals file number, 2930 relative links resolve, 180 test files exist, every Revision agrees.

## Verification

- `node scripts/spec-revise.mjs --check`: green.
- `pnpm spec:examples`: 101 blocks compile.
- Task 1 gates: one ADR-QD-109 file, one index entry, `QADI-ADR-109`, `ADR-QD-107` and `onFile` named. Task 2 gate: four ADRs mention ADR-QD-109. Task 3 grep gates: `ADR-QD-109` in traceability, `` `pose `` in both behaviour docs.
- Gate 13 (`spec:api`) was not run here; it is 02-04's.

## Known Stubs

None.

## Threat Flags

None. Documentation only; T-02-09 (names taken from 02-01-SUMMARY and checked against `PortAccess.ts`) and T-02-10 (INV id re-read at execution, 244) are mitigated as planned.

## Next Phase Readiness

Plan 02-04 can add the CCR-QD-386 register row, the `spec/README.md` line, the `spec/overview.md` changes and the changeset, then run `pnpm spec:verify:strict` and `pnpm check:pr`. It needs the revisions in the table above for the CCR row.

## Self-Check: PASSED

- Files: the ADR, all nine modified spec documents and this SUMMARY exist on disk.
- Commits: `9137da5`, `b93a3d1`, `da6d18d` are ancestors of `HEAD`.

---
*Phase: 02-one-port-read*
*Completed: 2026-11-08*
