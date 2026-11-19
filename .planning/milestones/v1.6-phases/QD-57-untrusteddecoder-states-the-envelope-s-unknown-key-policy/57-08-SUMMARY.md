---
phase: QD-57-untrusteddecoder-states-the-envelope-s-unknown-key-policy
plan: 08
subsystem: spec
tags: [adr, unknown-key-policy, spec-revise, amendment]
requires: [57-07]
provides:
  - ADR-QD-170 (Rev 1.0), indexed after ADR-QD-169
  - ADR-QD-096 Rev 1.6 and ADR-QD-143 Rev 1.4, each with an ADR-QD-170 amendment
affects: [57-09, 57-10, 57-11]
actuals:
  tokens: 9000
  tasks: 2
  commits: 1
plan_head_before: 0a8cba2ff4485348702aaca20adc2424c69b297a
plan_head_after: f4245b39686e280e9511903737c24882f7b67d3c
tech-stack:
  added: []
  patterns: ["an amendment appended after the original text, revision moved by spec-revise"]
key-files:
  created:
    - spec/decisions/170-an-envelope-states-its-unknown-key-policy-at-its-decoder.md
  modified:
    - spec/decisions/index.yaml
    - spec/decisions/096-the-sink-wire-is-versioned-and-its-outcome-exclusive.md
    - spec/decisions/143-untrusted-json-is-decoded-through-one-module.md
key-decisions:
  - "ADR-QD-170 records D-01 with the owner's instruction quoted verbatim, D-16..D-20 with their reasons and nine rejected alternatives, D-09's hydration report as not acted on, and the 57-07 mutation result"
requirements-completed: []
duration: 10min
completed: 2026-11-19
status: complete
---

# Phase QD-57 Plan 08: ADR-QD-170 and its two amendments Summary

ADR-QD-170 records the unknown-key policy decision (D-01, D-16..D-21) and amends ADR-QD-096 (Rev 1.6) and ADR-QD-143 (Rev 1.4), whose original text stands as written.

## Accomplishments

- `spec/decisions/170-...md`: Document Control per the plan, six sections, the owner's instruction quoted on one line, the D-17 message table (was and is), D-18, D-20, the D-09 hydration report left as not acted on, nine rejected alternatives, the D-12 base-and-after table, and the Breaking migration `{ unknownKeys: "refuse" }`. Only reserved numbers are cited.
- `spec/decisions/index.yaml`: the ADR-QD-170 entry after ADR-QD-169; ADR-QD-096 and ADR-QD-143 statuses name `amended 2026-11-19 (ADR-QD-170)`.
- ADR-QD-096: amendment (project, guard, version, decode; `checkVersion` only in `prepare`; stored envelope read by the decoder); revision moved by `spec-revise` to 1.6.
- ADR-QD-143: amendment (required `unknownKeys`, the seam policies, stored-record non-seam retired, `SinkCodec.ts` counts 1, total 10, leaf names `EnvelopeKeys.ts`, ADR-QD-153 kept); revision moved by `spec-revise` to 1.4.

## Task Commits

Both tasks land in one commit by design (the plan's single-commit rule): `f4245b39` `docs(57-08): ADR-QD-170, an envelope states its unknown-key policy at its decoder` (four files, trailer last).

## Evidence

- Task 1 verify (ADR content, index order, reserved numbers) and `spec-revise --check`: pass.
- Task 2 verifies (revisions, amendment contents, index statuses, no body line removed since `chore(57-07)`, one `docs(57-08)` commit with exactly the four files and the trailer): pass.
- `pnpm spec:verify` reads 2 FAIL rows, both expected until 57-09 and 57-10 (judged by `spec:verify:strict` in 57-10): `decisions -> traceability` (`untraced: ADR-QD-170`) and `CCR register coverage` (CCR-QD-448 has no register row yet).

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None.

## Threat Flags

None.

## Self-Check: PASSED

- `spec/decisions/170-an-envelope-states-its-unknown-key-policy-at-its-decoder.md` exists; commit `f4245b39` is an ancestor of HEAD.
