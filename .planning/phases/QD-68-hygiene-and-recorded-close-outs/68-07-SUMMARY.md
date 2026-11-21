---
phase: QD-68-hygiene-and-recorded-close-outs
plan: 07
subsystem: spec, core type tests
status: complete
tags: [hygn-07, wx-02, oi-01, oi-05, oi-06, oi-07, spec-wording]

requires:
  - phase: QD-68-hygiene-and-recorded-close-outs
    provides: 68-06's last commit c4e94344 plus the orchestrator's plan-file fix 917adb23
provides:
  - "FloatingEffectPins.tst.ts's header, ADR-QD-175 and the traceability row name all three blocks (OI-01)"
  - "INV-QD-377 states how the ignore projection reads an accessor that answers differently or deletes a later key (OI-05)"
  - "INV-QD-375, BEH-QD-661, ADR-QD-172 and the WalkEnvironment traceability row say the gate reads refusal only (OI-06)"
  - "the INV-QD-364 traceability row says where supplied is read from (OI-07)"
affects: [68-10, 68-11, 68-15]

actuals:
  tokens: 48000
  tasks: 2
  commits: 1
plan_head_before: 917adb239d838c376765772727cd192862f32e6c
plan_head_after: faec4fabb6465f641bbc5dbe5183fb87c6b35776
commits: 1

tech-stack:
  added: []
  patterns:
    - "a wording edit to a pinned test header is proven by 68-compare.mjs reporting the emitted code identical"

key-files:
  created: []
  modified:
    - packages/core/test/FloatingEffectPins.tst.ts
    - spec/decisions/175-a-negative-type-pin-can-fail.md
    - spec/decisions/172-admission-produces-the-one-walk-environment.md
    - spec/behaviors/05-evaluator.md
    - spec/invariants.md
    - spec/traceability.md

key-decisions:
  - "OI-05 taken by the wording route: INV-QD-377's Implication states the two accessor behaviours, with 68-03's U30 and U31 as the pins (Enforcement now reads U22 to U31)"

requirements-completed: [HYGN-07, WX-02]
completed: 2026-11-21
---

# Phase 68 Plan 07: the characterisation's readings, the projection's accessors, the admit pins and the supplied trace Summary

Four wording items now say what the code and the gate hold: the characterisation names all three of its blocks, the ignore projection's accessor behaviour is stated with its pins, the `admit` pins are described as refusal-only with `pin-codes.mjs` reading the codes, and the `supplied` row names the matcher context `admit` builds.

## Commit

- `faec4fab` `docs(68-07): the characterisation's readings, the projection's accessors, the admit pins and the supplied trace` (one commit, six files)

## Items

- **OI-01.** `FloatingEffectPins.tst.ts`'s header now says the two blocks a pass skips each carry their skip text and the third runs in both passes and carries none. ADR-QD-175's "The tool's reading is pinned" names the three readings, and the traceability row names the block that holds under the config alone. `68-compare.mjs <B>` reports `same: packages/core/test/FloatingEffectPins.tst.ts (5 tests, 4 describes)` (comment-only edit, SHA-256 `53cdd009…`), and `pnpm test:tstyche` exits 0, so each skip text still appears once.
- **OI-05.** INV-QD-377's Implication states that a union's `_tag` answering differently on its second read can choose one member's keys and copy another `_tag`, which the strict decode then refuses as malformed, and that an accessor deleting a later own key changes which refusal is reported. Enforcement and the traceability row now cite U22 to U31.
- **OI-06.** INV-QD-375's Enforcement, BEH-QD-661, ADR-QD-172's 2026-11-20 amendment and the WalkEnvironment traceability row say the gate reads only that each pin is refused, that TS2673 and TS2741 are read by `pin-codes.mjs` (which `pnpm check:pr` does not run), and that only the literal pin has a positive control.
- **OI-07.** The INV-QD-364 traceability row says `supplied` is read from the matcher context `admit` builds from the question.

## Revisions (WX-02, each through `scripts/spec-revise.mjs --date 2026-11-21`)

| Document | Revision | Entry cites |
|----------|----------|-------------|
| ADR-QD-175 | 1.4 -> 1.5 | ARCH-115, CCR-QD-459 |
| ADR-QD-172 | 1.2 -> 1.3 | ARCH-115, CCR-QD-459 |
| 05-evaluator | 1.19 -> 1.20 | ARCH-115, CCR-QD-459 |
| invariants | 1.166 -> 1.167 | ARCH-115, CCR-QD-459 |
| traceability | 1.233 -> 1.234 | ARCH-115, CCR-QD-459 |

All five files have the SHA-256 the plan recorded (175 `123de60f…`, 172 `fe8523fe…`, 05-evaluator `dc8396b2…`, invariants `5b22cbfe…`, traceability `33002845…`). `spec-revise --check` passes; `pnpm spec:examples` prints `doc-examples: 117 block(s) compile`.

## Verification

- `verify-traceability.sh --strict`: `PASS: 20   FAIL: 1   SKIP: 0`. The one FAIL is the CCR register coverage, `got [... 136 137 459]` against `expected [... 136 137]`: CCR-QD-459 is cited before 68-11 writes its row, which the plan names as the expected state.
- Both task `<verify>` blocks pass on HEAD after the commit, including the one-commit/six-files/trailer check. The commit touches no `packages/*/src`, bench or `package.json` file.
- The run did not depend on 68-05 having run.

## Deviations from Plan

None - plan executed exactly as written. Task 1 (tracer) ended at its verify and did not commit; the plan's one commit is Task 2's, as the plan states.

## Known Stubs

None.

## Self-Check: PASSED

- All six files modified and present; commit `faec4fab` is an ancestor of HEAD.
