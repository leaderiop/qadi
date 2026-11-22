---
phase: QD-66-the-decoder-reads-only-what-it-declares
plan: 04
subsystem: spec
tags: [spec, adr, invariant, behavior, traceability, changeset]
phase_base: 48921088b0228724469b6624de91658c650e46c3
plan_head_before: f5c7505e75a5602926d77b53afae9a24c3f68a32
plan_head_after: 21b74f2a3dd2e2da149c8c6083c4cebbd5d0e0c3
requires:
  - phase: QD-66
    provides: "66-02's projection and 66-03's bench of record (gate pass)"
provides:
  - "ADR-QD-170 Rev 1.1: D-19 scoped, D-09 resolved (the hydration payload stays refuse)"
  - "INV-QD-377 and BEH-QD-666, traced; INV-QD-097, INV-QD-306, INV-QD-360, BEH-QD-622, BEH-QD-623 scoped"
  - "the CCR-QD-457 row, citing six documents at their current Revision"
  - "the @qadi/core patch changeset"
affects: [QD-66-05]
actuals:
  tokens: 9000
  tasks: 2
  commits: 2
tech-stack:
  added: []
  patterns: ["records applied as verbatim edit lists; register shown red before its rows exist, then green"]
key-files:
  created:
    - .changeset/core-decoder-reads-declared-keys.md
  modified:
    - spec/decisions/170-an-envelope-states-its-unknown-key-policy-at-its-decoder.md
    - spec/decisions/index.yaml
    - spec/invariants.md
    - spec/behaviors/08-serialization.md
    - spec/overview.md
    - AGENTS.md
    - spec/traceability.md
    - spec/README.md
key-decisions:
  - "ADR-QD-170 alone is amended; ADR-QD-179, BEH-QD-667 to BEH-QD-670 and INV-QD-378 are named Unused in the CCR-QD-457 row and nowhere else"
  - "The hydration payload stays refuse: same build writes and reads it, its version is checked, a strict refusal reports tampering as MalformedPayload (pinned by H1)"
requirements-completed: [DECL-02, DECL-03, DECL-04, WX-02, WX-03, WX-06, WX-07]
coverage:
  - id: D1
    description: "Every spec text about the projection says what the code reads, including what refuse, unwalked and the levels below the top still read"
    requirement: DECL-02
    verification:
      - kind: other
        ref: "task 1 verify: old-claim regex finds exactly three correction lines; verify-traceability --strict PASS 21 FAIL 0; exited 0"
        status: pass
    human_judgment: false
  - id: D2
    description: "The amendment records why the hydration payload stays refuse"
    requirement: DECL-03
    verification:
      - kind: other
        ref: "ADR-QD-170 amendment section, cites H1 in packages/react/test/UntrustedSeams.test.ts"
        status: pass
    human_judgment: true
    rationale: "A recorded owner decision; no test asserts the wording"
  - id: D3
    description: "One @qadi/core patch changeset, nothing released"
    requirement: DECL-04
    verification:
      - kind: other
        ref: "task 2 verify exited 0 (SHA-256 3c805c00, only .changeset change, no version/changelog/tag)"
        status: pass
    human_judgment: false
duration: 11min
completed: 2026-11-20
status: complete
---

# Phase 66 Plan 04: The records Summary

**ADR-QD-170 amended (D-19 scoped, D-09 closed), INV-QD-377 and BEH-QD-666 added under reserved ids, the register shown red then green, and one `@qadi/core` patch changeset.**

## Accomplishments

- Task 1 (tracer, `f62f450d`): `records-t1.json` (16 edits, 6 files), four `spec-revise` calls, the register shown red, `records-t2.json` (7 edits, 2 files), two more `spec-revise` calls, the register green. Eight files committed as `docs(66-04): ADR-QD-170 amended, BEH-QD-666 and INV-QD-377, traced and registered as CCR-QD-457`.
- Task 2 (`21b74f2a`): `.changeset/core-decoder-reads-declared-keys.md` (SHA-256 `3c805c00...`), `"@qadi/core": patch`; no `pnpm changeset`, version, tag or push.

## Revisions

| Document | Revision |
| --- | --- |
| `spec/decisions/170-an-envelope-states-its-unknown-key-policy-at-its-decoder.md` | 1.0 -> 1.1 |
| `spec/invariants.md` | 1.163 -> 1.164 |
| `spec/behaviors/08-serialization.md` | 1.5 -> 1.6 |
| `spec/overview.md` | 1.129 -> 1.130 |
| `spec/traceability.md` | 1.230 -> 1.231 |
| `spec/README.md` | 1.266 -> 1.267 |

## Register

- Red (`$TMPDIR/qd66/trace-red.log`, before the second list): `PASS: 19   FAIL: 2   SKIP: 0 (strict: skips count as failures)`; the rows `invariants -> traceability` with `untraced: INV-QD-377` and `CCR register coverage` with `drift from KNOWN_GAPS ... 457`.
- Green: `PASS: 21   FAIL: 0   SKIP: 0 (strict: skips count as failures)`; `spec-revise --check` exit 0.

## Doc gates (each last line, unchanged from the base)

```text
doc-examples: 117 block(s) compile
api-surface: 939 export(s) documented across 9 package(s)
dod-table: 25 step(s) match pnpm check, 151 reference(s) resolve
devtools-claims: 8 claim(s) registered across 6 file(s)
house-style: 560 file(s) clean (3 declared switch(es), 66 type-test file(s))
```

`git diff <phase_base> -- packages/core/src/index.ts scripts` is empty; no AGENTS.md table row changed.

## ccr-row.mjs

```text
spec/README.md Rev 1.267
spec/behaviors/08-serialization.md Rev 1.6
spec/decisions/170-an-envelope-states-its-unknown-key-policy-at-its-decoder.md Rev 1.1
spec/invariants.md Rev 1.164
spec/overview.md Rev 1.130
spec/traceability.md Rev 1.231
ccr-row: 6 document(s) cited at their current Revision
```

Shown failing once on a planted later revision (`spec/overview.md` bumped to Rev 1.131, saved copy restored afterwards): exit 1, `the CCR-QD-457 row does not cite spec/overview.md at Rev 1.131`.

## Deviations from Plan

**1. [Rule 1 - Bug] Task 1's verify compares the committed file list in an order `sort` cannot produce**
- **Found during:** Task 1 verify.
- **Issue:** the check `git show --name-only ... | LC_ALL=C sort` is compared with `AGENTS.md $A spec/README.md ...`, which puts `spec/decisions/170-...` second. Under C order `spec/README.md` (capital R) and `spec/behaviors/...` precede `spec/decisions/...`, so the check fails on the correct eight-file commit.
- **Fix:** a scratch copy of the verify (`$TMPDIR/qd66/v04-1b.sh`) lists the same eight paths in C order (`AGENTS.md spec/README.md spec/behaviors/08-serialization.md $A spec/decisions/index.yaml spec/invariants.md spec/overview.md spec/traceability.md`). Same set, no check weakened; it exited 0. The plan file is untouched.
- **Files modified:** scratch only. **Commit:** none.

**Total deviations:** 1 auto-fixed (Rule 1, in the verify's expected string). **Impact:** none on the committed records.

## Notes for later plans

Any later fix to a spec document of this phase must re-run the matching `spec-revise --date 2026-11-20` call and re-align the CCR-QD-457 row's cited revision; 66-05's close scan runs `ccr-row.mjs` to check it. The unused reserved ids (ADR-QD-179, BEH-QD-667 to BEH-QD-670, INV-QD-378) must stay out of everything but that row.

## Known Stubs

None.

## Threat Flags

None.

## Self-Check: PASSED

- `.changeset/core-decoder-reads-declared-keys.md` exists; `f62f450d` and `21b74f2a` are ancestors of HEAD; both task verifies exited 0 (task 1 with the ordering fix above).
