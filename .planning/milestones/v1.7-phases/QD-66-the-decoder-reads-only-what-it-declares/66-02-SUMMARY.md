---
phase: QD-66-the-decoder-reads-only-what-it-declares
plan: 02
subsystem: untrusted-decode
tags: [untrusted-decode, projection, accessors, tdd-green]
phase_base: 48921088b0228724469b6624de91658c650e46c3
plan_head_before: a78cae146759e8d9eb949eba8a39c1a46023b685
plan_head_after: d192a3041c4e3a091874d678d8f0b30852643f8e
requires:
  - phase: QD-66
    provides: "66-01's eight RED cases and the measured reads on the base"
provides:
  - "the ignore projection reading Object.keys first and each kept value once, into a fresh object built by Object.fromEntries"
  - "envelopeKeysOf answering per input, reading the own enumerable _tag only for a union"
  - "the SinkCodec comments scoped to what the ignore seams read"
  - "the reads after the change, the four variants and the added-lines scan, in 66-RED-EVIDENCE.md"
affects: [QD-66-03, QD-66-04, QD-66-05]
actuals:
  tokens: 6000
  tasks: 3
  commits: 3
tech-stack:
  added: []
  patterns: ["names first, then each kept value once, into Object.fromEntries (never assignment, so an own __proto__ key stays data)"]
key-files:
  created: []
  modified:
    - packages/core/src/UntrustedDecode.ts
    - packages/core/src/EnvelopeKeys.ts
    - packages/core/src/SinkCodec.ts
    - .planning/phases/QD-66-the-decoder-reads-only-what-it-declares/66-RED-EVIDENCE.md
key-decisions:
  - "keysOf takes the input, not its entries, and reads _tag only for a union; a one-object schema's keysOf reads nothing"
  - "the copy is built by Object.fromEntries from the filtered Object.keys, so an own __proto__ key is never a prototype write"
requirements-completed: [DECL-02, WX-04, WX-06]
coverage:
  - id: D1
    description: "The ignore projection reads only the declared values: each once, an undeclared one never, a union's _tag twice, a one-object schema's declared _tag once"
    requirement: DECL-02
    verification:
      - kind: unit
        ref: "packages/core/test/UntrustedDecode.test.ts and packages/core/test/UntrustedSeams.test.ts: 127 tests, 0 failed; core project 82 files, 2667 tests, 0 failed"
        status: pass
      - kind: other
        ref: "node <S>/reads.mjs equals the planned output byte for byte"
        status: pass
    human_judgment: false
  - id: D2
    description: "Each part of the change is necessary: four variants fail exactly their named cases"
    requirement: WX-06
    verification:
      - kind: other
        ref: "python3 <S>/variants.py: A R15,R16,S16,S17,U22,U23,U24,U25; B S16,U23,U29; C U26; D U26"
        status: pass
    human_judgment: false
  - id: D3
    description: "The phase's added lines under packages carry no forbidden token or id; the scan fails on a planted assertion"
    requirement: WX-04
    verification:
      - kind: other
        ref: "node <S>/added-tokens.mjs <phase_base>: 0 hit(s); planted run: 1 hit(s), exit 1"
        status: pass
    human_judgment: false
duration: 2min
completed: 2026-11-20
status: complete
---

# Phase 66 Plan 02: The projection reads only what it declares Summary

**The `ignore` projection takes `Object.keys`, keeps the keys `keysOf` names and reads each kept value once into an `Object.fromEntries` copy, so an undeclared accessor is never invoked and the eight RED cases from 66-01 are green.**

## Accomplishments

- Task 1 (tracer, `19fe60a0`): `projection.patch` applied (SHA-256 `9280fbd1…`). `UntrustedDecode.ts` is `94fb1f346b44f2ebec0553b8d8e92ae4eba320d1f6750bca33c2ed945879dce2` (271 lines), `EnvelopeKeys.ts` is `d92146ecb7c77dff6a93235d51107da85af47e0862ab4bbba7cb9be3e6e2b80f` (89 lines). The two extended files ran 127 tests, 0 failed; the core project 82 files, 2667 tests, 0 failed. `pnpm typecheck`, `pnpm build` (`lib/EnvelopeKeys.d.ts` holds `readonly [TAG]?: unknown`), oxlint and house-style (`560 file(s) clean (3 declared switch(es), 66 type-test file(s))`, unchanged) pass. `reads.mjs` equals the planned output.
- Task 2 (`0a772919`): `sinkcodec-docs.patch` applied (`SinkCodec.ts` `071b1ffe…`); every changed line is a doc-comment line; the old-claim regex finds nothing under `packages`.
- Task 3 (`d192a304`): the variants, the added-lines scan and the reads after the change are appended to `66-RED-EVIDENCE.md`.

## Reads after the change

See `66-RED-EVIDENCE.md`, `## Reads after the change`. Under `ignore` each declared value is read once and an undeclared one never; a union's `_tag` is read twice (to choose the member, then as a kept value); a one-object schema's declared `_tag` once and an undeclared one never; the `refuse` and one-level-down lines are unchanged from the base.

## The projection's variants

```text
A the projection reads every own value: R15,R16,S16,S17,U22,U23,U24,U25 of 127
B a one-object schema reads _tag: S16,U23,U29 of 127
C an inherited _tag chooses: U26 of 127
D a non-enumerable own _tag chooses: U26 of 127
```

## Added-lines scan

`node <S>/added-tokens.mjs <phase_base>`: `added-tokens: 0 hit(s)`, exit 0. With one planted `x as string` appended to `EnvelopeKeys.ts`: `added-tokens: 1 hit(s)`, exit 1; the plant was restored and `packages` is clean.

## TDD Gate Compliance

RED `f89e6451` (66-01) precedes GREEN `19fe60a0`, which turns exactly the eight RED cases green.

## Deviations from Plan

None - plan executed exactly as written.

## Flagged for the owner

- A union's `_tag` is read twice: once by `keysOf` to choose the member, once as a kept value.
- A one-object schema now reads no `_tag` to choose a member, so a declared `_tag` is read once, as a kept value (U29), and an undeclared one never. The base read every own value, so this is a rule it did not have; U23 and S16 pin the undeclared case.
- A declared accessor that throws is still thrown out (R17, S18), and under `refuse` and below the top level own accessors are still read (U27, U28), as the owner scoped it.

## Known Stubs

None.

## Self-Check: PASSED

- Commits `19fe60a0`, `0a772919` and `d192a304` are ancestors of HEAD.
- The three task verifies exited 0; `git diff --name-only <phase_base> -- packages` lists exactly the two test files and the three source files.
