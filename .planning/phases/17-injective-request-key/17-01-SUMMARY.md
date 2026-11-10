---
phase: 17-injective-request-key
plan: 01
subsystem: devtools, core
tags: [decision, replay, port-key, numbering]

phase_base: 1a14899
d04_outcome: A
d04_date: 2026-11-10
d04_reason: "Every port's unseen replay request is an outage (fail closed); `PortDescription.key` returns `Result<string, KeyRefusal>` (Breaking) — confirmed"
reserved_numbers_free: true
key_type_confirmed: true

requires: ["16-04"]
provides:
  - "Phase base `17-base.txt` (1a14899)"
  - "The D-04 outcome plan 17-05 branches on (`d04_outcome: A`) and the key-type confirmation plan 17-03 reads (`key_type_confirmed: true`)"
  - "Confirmation that ARCH-65, ADR-QD-129, CCR-QD-407, BEH-QD-409..418 and INV-QD-280..284 are unused"
affects: [17-02, 17-03, 17-04, 17-05, 17-06]

actuals:
  tasks: 2
  commits: 2

key-files:
  created:
    - .planning/phases/17-injective-request-key/17-base.txt
    - .planning/phases/17-injective-request-key/17-01-SUMMARY.md
  modified: []

key-decisions:
  - "17-01 T1 (D-04) = A + key confirmed, from `_DECISIONS.md`: \"Every port's unseen replay request is an outage (fail closed); `PortDescription.key` returns `Result<string, KeyRefusal>` (Breaking) — confirmed\""

requirements-completed: []  # KEY-04 decision half only; KEY-04 completes in 17-05, XC-02 in 17-06

completed: 2026-11-10
status: complete
---

# 17-01 — The replay miss policy is decided: every unseen request is an outage

`phase_base: 1a14899` (`17-base.txt`, written by this plan; the 16-04 docs commit).

## Task 1 — decision (D-04)

Answered up front in `.planning/phases/_DECISIONS.md`:

> | 17-01 T1 (D-04) | `A` + key confirmed | Every port's unseen replay request is an outage (fail closed); `PortDescription.key` returns `Result<string, KeyRefusal>` (Breaking) — confirmed |

So: **A** for all four undecided ports (`AttributeResolver`, `RelationshipResolver`, `DecisionHistory`,
`CustomPredicate`), and no `key: object` objection, so 17-03's `Result`-typed key goes ahead. That key uses
`effect/Result`, never `Either` (AGENTS.md §6).

## Task 2 — reserved numbers and what follows

Every reserved id was grepped over `spec/`, `packages/` (minus `lib/`), `.changeset/` and `AGENTS.md` with
`/usr/bin/grep -rlnE -- "<id>([^0-9]|$)"`: ARCH-65, ADR-QD-129, CCR-QD-407, INV-QD-280..284 and
BEH-QD-409..418 each printed nothing, and `spec/decisions` holds no `129-` file. The grep itself was checked
against ADR-QD-128, which it finds in `spec/overview.md`, `spec/glossary.md` and `spec/invariants.md`.

What plan 17-05 does with outcome A: it deletes `UNSEEN_REQUEST_IS_AN_OUTAGE` in
`packages/devtools/src/model/Capture.ts` (today `SignatureHistory: true`, the other four `false`), so a
Snapshot replay asked a request its capture never saw fails with that port's own typed error on every port,
and a sixth port is fail-closed by construction. Under `not(leaf)` a miss can then never report an allow the
capture cannot back. The six tests that pin today's `none` answers in `packages/devtools/test/model/Capture.test.ts`
(":581", ":593", ":604", ":702", ":791", ":228" at planning time) flip to the outage, and INV-QD-043 stops
recording the fail-open as known. Plans 17-02 to 17-04 (the injective, total key and its consumers) are
unaffected by this outcome; 17-06 quotes it in ADR-QD-129.

## Deviations

None. No file under `packages/`, `spec/` or `.changeset/` changed.

The scoped mutation base is not taken here: 17-02 Task 1 owns it ("before any src change"), and this plan
changes no source, so the tree 17-02 measures is still the phase base's.

## Gate results

- The plan's three `<automated>` checks: frontmatter keys, the B-only per-port check (not applicable), and
  "17-01's commits touch only `.planning/`". All pass.

## Commits

- `docs(17-01): record the replay miss policy` (this SUMMARY and `17-base.txt`)
- `docs(17-01): complete plan` (ROADMAP, STATE)
