---
phase: 21-port-request-derivation
plan: 01
subsystem: testing
tags: [tdd, red, tstyche, fast-check, stryker, port-description, ARCH-69]

requires:
  - phase: 20-decision-cache-shared-computation
    provides: a clean packages/ tree and spec registers at the v1.2 base
provides:
  - the phase base and the per-file mutation baseline for the nine core files this phase touches
  - PREQ-04's defect shown by hand on the base (a dropped key field compiles)
  - PortRequest.tst.ts, committed red (a question or a pose that leaves a member out type-checks today)
  - the ARCH-69 key and defect law over the four derived ports, committed red for the key
  - the wire bytes of every port's question pinned green
affects: [21-02, 21-03, 21-04, 21-05]

phase_base: ba38f367
plan_head_before: ba38f367f785fa0d3b34d665dda0045c30cfa771
plan_head_after: 464544e3fb78fac507619db90cd604d02d6ce9ee
commits: 3

actuals:
  tokens: 3500
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "A law over a closed, written-out union of ports: a table typed { [K in DerivedPort]: Arbitrary<ArgsOf<PortTypes[K]>> } plus a generic helper over a structural DerivedLike<Args>"
    - "RED type tests are not.toBeAssignableTo / toBeAssignableTo on function-type aliases, never a deliberate compile error"

key-files:
  created:
    - packages/core/test/PortRequest.tst.ts
    - .planning/phases/21-port-request-derivation/21-base.txt
    - .planning/phases/21-port-request-derivation/21-mutation-base.json
  modified:
    - packages/core/test/PortDescription.test.ts
    - packages/core/test/PortWire.test.ts

key-decisions:
  - "Phase base is ba38f367 (the v1.2 planning commit, HEAD when the plan started). packages/ and spec/ are identical to 965ff14c, so every line number in 21-CONTEXT.md holds."
  - "The law's DerivedLike helper is structural (wire.encodeQuestion, key, failure, defect) so four differently-typed descriptions share one body without a cast"

patterns-established:
  - "Test-first for a type-level defect: demonstrate it by hand on the base, then pin it with a tstyche assignability assertion"

requirements-completed: [PREQ-03, PREQ-04, PREQ-05, WX-02, WX-05, WX-06]

duration: 8 min
completed: 2026-11-11
status: complete
---

# Phase 21 Plan 01: Port request derivation, RED baseline Summary

The phase's regression tests exist and are red on the phase base for the right reasons: the four hand-written port keys are not their wire question's key, and a wire question or a signature pose that leaves a member out still type-checks. The wire bytes are pinned green so 21-02 can prove it changed none.

## Reserved numbers (WX-02)

ARCH-69, ADR-QD-133, CCR-QD-411, BEH-QD-440..444, INV-QD-286..287 were each grepped over `spec packages .changeset AGENTS.md` (minus `/lib/` and "Unused" lines): no hits. `spec/decisions` has no `133-*` file. `node scripts/next-id.mjs` was not run.

## Mutation baseline (WX-05)

`pnpm exec stryker run stryker.config.mjs --mutate <nine files>`: exit 0, 30 seconds. Per-file score (Killed + Timeout over Killed + Timeout + Survived + NoCoverage), recorded in `21-mutation-base.json`:

| File | Score |
| ---- | ----- |
| AttributeResolver.ts | 1.000 |
| RelationshipResolver.ts | 1.000 |
| DecisionHistory.ts | 1.000 |
| PortDescription.ts | 1.000 |
| PortDerivation.ts | 0.978 |
| SignatureHistory.ts | 0.955 |
| CustomPredicate.ts | 0.932 |
| PortSpanEncode.ts | 0.800 |
| PortWireEncode.ts | 0.619 |

`PortWireEncode.ts` (0.619) and `PortSpanEncode.ts` (0.800) are the low ones; 21-02 and 21-04 rewrite parts of them, so their comparison against this file is the one to watch.

## PREQ-04 on the base

Hand edit: `query.signerRole` removed from the `canonicalKey([...])` tuple in `SignatureHistory.ts`'s `key`.

- `pnpm exec tsc -b packages/core`: **exit 0**. A dropped key field compiles.
- `pnpm vitest run --project core packages/core/test/PortConformance.test.ts`: **exit 1**, `2 failed | 112 passed`. Exactly:
  - `request keys > are canonicalKey over the question each port is asked` (`expected '[s"alice",u,u]' to equal '[s"alice",u,u,u]'`)
  - `every argument reaches the key > holds for every port in the registry` (`a request differing only in signerRole must key differently`)
- Reverted with `git checkout -- packages/core/src/SignatureHistory.ts`; `git diff -- packages/core/src` is empty.

So the type system never sees the omission; only those two PortConformance rows do.

## RED evidence (TDD)

**RED 1: PortRequest.tst.ts** (`b4f97956`). Command `pnpm exec tstyche PortRequest`, exit non-zero, `3 failed, 2 passed` of 5 tests.
- Fails on assignability assertions, not compile errors (`pnpm typecheck` exit 0):
  - "a question with an optional member left out is not a question": `Asking<{subjectId}>` **is** assignable to `toQuestion`'s slot today.
  - "a question states an absent member as undefined": `Asking<{subjectId; meaning: string | undefined}>` is **not** assignable today (exact optional keys).
  - "a pose with a member left out is not this port's pose": `DropsSignerRole` **is** assignable to SignatureHistory's pose today.
- Passes (pins): "a question's required member stays required and defined", "a pose that states every member is this port's pose".
- semanticAssessment: the target tests execute and fail on the planned assertion for the intended reason.

**RED 2: the ARCH-69 key law** (`464544e3`). Command `pnpm vitest run --project core packages/core/test/PortDescription.test.ts -t "ARCH-69"`: `4 failed | 4 passed | 15 skipped`. The four failures are the four key properties, e.g. `expected '[s" ",s""]' to equal '{"attribute":s"","subjectId":s" "}'`, `expected '[s" ",u,u,u]' to equal '{"subjectId":s" "}'`. The four defect properties pass. semanticAssessment: the key is a tuple today and the law says it is the wire question's key; each failure names both texts.

**Pins, green:** `PortWire.test.ts` "the wire bytes of a question" (5 tests); everything else in the two touched files passes (`43 passed | 8 skipped`, the 8 being the ARCH-69 ones).

`gsd_run check tdd-red-evidence` was not run: the plan's verify commands are the gate, and the vitest/tstyche reports above are the unmodified outputs.

## Task commits

| Task | Commit | Files |
| ---- | ------ | ----- |
| 1 base and baseline | `de20b46c` | 21-base.txt, 21-mutation-base.json |
| 2 RED type test | `b4f97956` | packages/core/test/PortRequest.tst.ts |
| 3 RED law, GREEN bytes | `464544e3` | packages/core/test/PortDescription.test.ts, packages/core/test/PortWire.test.ts |

## Deviations from Plan

**1. [Observation, no code change] Two of the three pose assertions are already green on the base.**
- **Found during:** Task 2.
- **Issue:** the plan expected the attribute and relationship "drops a member" assertions to be RED. Their `pose` bodies are un-annotated object literals, so their inferred return types already have required keys: leaving out `attribute` or `depth` is not assignable today. Only `SignatureHistory`'s pose, annotated `SpanType<typeof signatureQuestion>` (every member optional), is red.
- **Fix:** none needed. The three assertions stay in one test; the signature one is the RED half and the other two are pins that 21-04's `PoseOf` must keep. The attribute and relationship `DropsX` aliases use the exact parameter types of the real poses, so the assertions fail on the missing member, not on a parameter mismatch (checked: the "states every member" twins are assignable).
- **Impact:** 21-04 should expect the signature assertion to be the one that turns green.

**2. [Observation] Phase base is `ba38f367`, not `965ff14c`.** HEAD is the planning commit on top of the v1.1 merge; `packages/` and `spec/` are unchanged between them.

Total deviations: 0 auto-fixed, 2 observations. No `packages/core/src` change: `git diff ba38f367 -- packages/core/src` is empty.

## Known Stubs

None.

## Threat Flags

None. T-21-01..03 are mitigated as planned: the key law and the question pins exist; the wire bytes are pinned before any src change; each RED was checked to fail on an assignability assertion or on exactly the four key properties.

## Self-Check: PASSED

- Created files exist: `PortRequest.tst.ts`, `21-base.txt`, `21-mutation-base.json`.
- Commits `de20b46c`, `b4f97956`, `464544e3` are ancestors of HEAD; `commits: 3` measured from the ledger base.
- `pnpm typecheck` exit 0; `pnpm lint` clean (pre-existing oxlint warnings only).
