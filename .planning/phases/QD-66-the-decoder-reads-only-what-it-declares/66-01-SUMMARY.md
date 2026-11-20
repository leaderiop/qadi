---
phase: QD-66-the-decoder-reads-only-what-it-declares
plan: 01
subsystem: testing
tags: [untrusted-decode, mutation, tdd, red-evidence]
phase_base: 48921088b0228724469b6624de91658c650e46c3
plan_head_before: 48921088b0228724469b6624de91658c650e46c3
plan_head_after: 55b8e09c1cc1dcae18cefbb21b987bde5ee75b47
requires: []
provides:
  - the mutation base of EnvelopeKeys.ts, SinkCodec.ts and UntrustedDecode.ts, with its committed scorer
  - eight RED cases and six characterisations for the ignore projection reading an undeclared accessor
  - the measured reads on the base and the cited hydration pin
affects: [QD-66-02, QD-66-03, QD-66-04, QD-66-05]
actuals:
  tokens: 28000
  tasks: 3
  commits: 3
tech-stack:
  added: []
  patterns: ["accessor-counting inputs built with Object.defineProperty, decoders built inside the it body"]
key-files:
  created:
    - .planning/phases/QD-66-the-decoder-reads-only-what-it-declares/66-mutation.mjs
    - .planning/phases/QD-66-the-decoder-reads-only-what-it-declares/66-mutation-base.json
    - .planning/phases/QD-66-the-decoder-reads-only-what-it-declares/66-RED-EVIDENCE.md
  modified:
    - packages/core/test/UntrustedDecode.test.ts
    - packages/core/test/UntrustedSeams.test.ts
key-decisions:
  - "The mutation base is recorded before any test of the phase exists, because a red test aborts Stryker's initial run"
  - "The hydration pin is cited (H1, line 203), not added; packages/react is untouched"
requirements-completed: [DECL-01, DECL-03, WX-05, WX-06, WX-07]
coverage:
  - id: D1
    description: "Eight accessor cases are RED on the phase base for the reason each names, directly and through both ignore seams; six characterisations pass"
    requirement: DECL-01
    verification:
      - kind: unit
        ref: "packages/core/test/UntrustedDecode.test.ts and packages/core/test/UntrustedSeams.test.ts: 127 tests, 8 failed (U22-U25, R15, R16, S16, S17)"
        status: pass
    human_judgment: false
  - id: D2
    description: "The mutation base of the three untrusted-decode files is recorded at the phase base by a committed scorer"
    requirement: WX-05
    verification:
      - kind: other
        ref: "bash verify of task 1 (66-mutation-base.json head equals phase_base, scorer SHA-256 as planned)"
        status: pass
    human_judgment: false
  - id: D3
    description: "The hydration pin H1 is green on the base and cited"
    requirement: DECL-03
    verification:
      - kind: unit
        ref: "packages/react/test/UntrustedSeams.test.ts#H1 a shallow unknown envelope key -> MalformedPayload, nothing seeded (25 tests, 0 failed)"
        status: pass
    human_judgment: false
completed: 2026-11-20
status: complete
---

# Phase 66 Plan 01: The base measured and the defect pinned RED Summary

**The ignore projection's reading of an undeclared accessor is pinned by eight cases that fail on the phase base for the reason each names, behind a mutation base of the three untrusted-decode files recorded before any test of the phase existed.**

## Accomplishments

- Task 1 (tracer): gate lines, the six old-claim sentences, the core suite, the measured reads and the Stryker record, committed with the scorer as 02e71682.
- Task 2: U22 to U29 appended to `UntrustedDecode.test.ts` and R15 to R17, S16 to S18 to `UntrustedSeams.test.ts` (f89e6451). 127 tests, 8 failed: U22 to U25 with `Error: the accessor was read`; R15, S16 and S17 with `AssertionError: expected [Function] to not throw an error but 'Error: the accessor was read' was thrown`; R16 with `AssertionError: expected 1 to equal +0`. U26 to U29, R17 and S18 pass on the base. Typecheck, oxlint and house-style unchanged; additions only.
- Task 3: `66-RED-EVIDENCE.md` (55b8e09c) holds the RED table, the measured reads (byte for byte the planned output) and the H1 citation.

## RED evidence

See `66-RED-EVIDENCE.md`. The RED set observed is R15, R16, S16, S17, U22, U23, U24, U25, as planned.

## TDD Gate Compliance

RED commit `f89e6451` (test) exists and its cases fail for the planned reasons. The GREEN commit belongs to plan 66-02, which applies the projection; this plan is the RED half by design, so no `feat(66-01)` commit exists.

## Base facts

```text
sha: 72ebf322b490f6fe5de5a219869a90f38eedadf256cba08b6638b30f28ed1b79  packages/core/src/UntrustedDecode.ts
sha: df9670eb25f72b5040e3e49dbe6e79f381a1b38a88ffdd8095278746b9c72207  packages/core/src/EnvelopeKeys.ts
sha: ac1975fc102354d8ec8591a6b655f2d040066134be70d44b22fe17a423124ef3  packages/core/src/SinkCodec.ts
sha: 7fb2360f81e4ce110370f0811441f41ac9dc3639733660b776a7d53550161d0c  packages/core/test/UntrustedDecode.test.ts
sha: e6a6a70ef4fa3345371d670d3a99935e1bb50e14b438e067778ff4274d3e2472  packages/core/test/UntrustedSeams.test.ts
sha: dc10730b6e7b7f9db86217cfdeb5d87a98265e2058b4c6c8df0824649ac679fb  packages/core/test/StoredEnvelope.test.ts
sha: d4d33b1eee2a40c9d31523b93833a56ceb1365ee8606639d4ae3c1b665dc26c8  packages/core/bench/UntrustedDecode.bench.ts
sha: adea88d5cede8f84111ef1de30937d4be4f877fb08455923c018520a41b9f1e0  packages/react/test/UntrustedSeams.test.ts
house-style: 560 file(s) clean (3 declared switch(es), 66 type-test file(s))
api-surface: 939 export(s) documented across 9 package(s)
dod-table: 25 step(s) match pnpm check, 151 reference(s) resolve
devtools-claims: 8 claim(s) registered across 6 file(s)
doc-examples: 117 block(s) compile
spec-revise: 0
old-claim: AGENTS.md:612:undeclared top-level key before the guard, so it is never walked, ADR-QD-170), the
old-claim: packages/core/src/UntrustedDecode.ts:134: * decode does, or `ignore` it, dropped before the guard and the decode ever read it (ADR-QD-170).
old-claim: packages/core/src/UntrustedDecode.ts:166:/** A plain object reduced to the own keys `keysOf` names for it; anything else passes through. It reads no value, so it cannot recurse. */
old-claim: spec/behaviors/08-serialization.md:223:The projection is a shallow copy of the own keys, and it reads no value, so it
old-claim: spec/decisions/170-an-envelope-states-its-unknown-key-policy-at-its-decoder.md:58:   own-key copy that reads no value, so it cannot overflow and changes no declared key's answer. The precedence D-15-c
old-claim: spec/invariants.md:4195:**Implication**: a key whose content is ignored that could still refuse the input is not ignored, and keeping it would have needed a third policy, "ignore but walk". The projection is a shallow own-key copy that reads no value, so it cannot overflow on hostile nesting, and the guard's bound (INV-QD-305) is untouched for everything the strict decode reads. It widens what is accepted: a deep unknown record key was `TooDeep` before, in the record wire (D-01) and so in an audit row's and an archive entry's record (D-20). A deep `environment` on the stored envelope is `TooDeep`, because it is declared (D-18).
PASS: 21   FAIL: 0   SKIP: 0 (strict: skips count as failures)
core: 82 files, 2653 tests, 0 failed
```

## Mutation base

Recorded at `phase_base` by `pnpm exec stryker run stryker.config.mjs --mutate packages/core/src/EnvelopeKeys.ts,packages/core/src/SinkCodec.ts,packages/core/src/UntrustedDecode.ts` (1 minute 8 seconds).

| File | detected/valid | Ignored | Open mutants |
| --- | --- | --- | --- |
| `EnvelopeKeys.ts` | 58/58 | 9 | 0 |
| `SinkCodec.ts` | 123/127 (122 killed, 1 timeout) | 45 | 4 (lines 322, 324, 387, 391) |
| `UntrustedDecode.ts` | 41/43 | 7 | 2 (line 224, `unwalked.size > 0`) |

Difference from the last known 58/58, 122/126 and 41/43: `SinkCodec.ts` is 123/127, one more detected and one more valid. The run shows 122 killed and 1 timeout, so the earlier 122/126 omitted that timeout mutant. `EnvelopeKeys.ts` and `UntrustedDecode.ts` match.

## Deviations from Plan

None - plan executed exactly as written. `phase_base` is `48921088b0228724469b6624de91658c650e46c3` (the commit of the phase plans, `48921088`), not the plan-time `b75ff5f0`; the eight files of the interfaces table have the listed SHA-256 values at it.

## Issues Encountered

None.

## Flagged for the owner

- **A1 (DECL-01).** "In-process value" is read as any value that is not the result of `JSON.parse`, and "invokes that getter" as observable through a throwing accessor (the decode throws) or a counting one (the count is above zero). Checked by the RED truths.
- **A2 (DECL-03).** "Pinned by a test" is met by the existing H1, which asserts `MalformedPayload` for one shallow unknown envelope key; no test pins a second unknown key or a nested one under `refuse`.
- **A3 (DECL-04).** "No regression beyond that band" is read as the owner's fixed gate (no workload more than 5% slower by the median of per-run minima, geometric mean of deltas at most +2%) on one 3 + 3 run of record, with the host load recorded and not waited out.
- **A4 (WX-07).** "Nothing released" is read as: no `pnpm changeset version`, publish, tag or push, and no `package.json` version or `CHANGELOG.md` change; the one new `.changeset/*.md` file is a record, not a release.
- The `unwalked` premise ("`walked` reads every own getter") is true under `refuse` only. Under `ignore` an unwalked key's own value is read once, by the projection, and `walked` and the guard receive the copy.

## Self-Check: PASSED

The three commits exist (02e71682, f89e6451, 55b8e09c), the three task verifies exit 0, and `packages/*/src`, `StoredEnvelope.test.ts` and `packages/react` have empty diffs from `phase_base`.
