---
phase: QD-57-untrusteddecoder-states-the-envelope-s-unknown-key-policy
plan: 01
subsystem: core
tags: [stryker, mutation-baseline, evidence, reserved-ids, api-surface]
phase_base: 8a594712e559fe76a0fb11b0706eb1df28e96cb4
requires: []
provides:
  - phase_base and the re-verified base facts
  - ten reserved ids confirmed free at the base
  - the 935-export API surface baseline
  - 57-mutation.mjs and 57-mutation-base.json (D-12's rule and baseline, fixed before the change)
affects: [57-02, 57-03, 57-04, 57-05, 57-06, 57-07, 57-11]
actuals:
  tokens: 9000
  tasks: 2
  commits: 1
plan_head_before: 8a594712e559fe76a0fb11b0706eb1df28e96cb4
plan_head_after: 1b7c5da56d36e949cb20f0aa87c7aaa0b4a02f6a
tech-stack:
  added: []
  patterns: ["mutation baseline over three Stryker suites committed alone as the phase's first commit, rule constants fixed before the change"]
key-files:
  created:
    - .planning/phases/QD-57-untrusteddecoder-states-the-envelope-s-unknown-key-policy/57-mutation.mjs
    - .planning/phases/QD-57-untrusteddecoder-states-the-envelope-s-unknown-key-policy/57-mutation-base.json
  modified: []
key-decisions:
  - "Three base files are below 1 (AuditArchive 52/53, SinkCodec 159/163, UntrustedDecode 29/31); the close compares against those floors with unchanged survivor sets, not against 1"
requirements-completed: [WX-02, WX-05, WX-06]
duration: 9min
completed: 2026-11-18
status: complete
---

# Phase QD-57 Plan 01: Evidence on the untouched base

## Base facts

Read at `phase_base` (`8a594712`). Every site matched.

`packages/core/src/UntrustedDecode.ts`: `readonly unwalked?: ReadonlyArray<UnwalkedKey<A>>;` `:141`; `readonly prepare?` `:142`; `options?: UntrustedDecoderOptions<S["Encoded"], R> & FreeRefusalTag<R>,` `:172`; leaf sentence "A leaf: it imports `effect`, `DecodeDepthGuard.ts` and `JsonShape.ts` only" `:18`. The file names no `unknownKeys` (0 hits).

`packages/core/src/SinkCodec.ts`: `DECISION_KEYS` `:178`, `OBLIGATIONS_KEYS` `:179`; `ownValue` `:420`; `envelopeOf` `:434`; `sinkWire = untrustedDecoder(SinkRecordWithJson, { prepare: versionThenEnvelope })` `:524`; the stored reader's `isPlainObject` import `:82`, its first reason `:635`, and "a bare record, not a stored-record envelope { environment, record }" `:637`.

`packages/audit/src/AuditEntry.ts` `:119` `{ unwalked: ["record"] }`; `packages/audit/src/AuditArchive.ts` `:258` `untrustedDecoder(ArchiveEnvelope, { unwalked: ["entries"] })`.

`packages/react/src/HydrationEngine.ts`: `decodePolicy = untrustedDecoder(PolicySchema).decode` `:164`; `decodeEnvelope = untrustedDecoder(Envelope, { unwalked: ["entries"], prepare: checkVersion })` `:193`; `decodeEntry = untrustedDecoder(DehydratedEntryWire).decode` `:205` (three decoders, two with no options).

Pins that say `TooDeep`: `packages/core/test/UntrustedSeams.test.ts:195`; `packages/audit/test/AuditEntryDifferential.test.ts:127` (`deepExtra`).

Budget: `scripts/check-house-style.mjs` `:643` `"packages/core/src/SinkCodec.ts": 2` and `:658` its names row; AGENTS.md `:543` section 7a row counts 2.

`apps/website/src/content/docs/docs/reference/upgrading.md:427` `const decodeSettings = untrustedDecoder(Settings);`.

`packages/core/src/EnvelopeKeys.ts` does not exist at `phase_base`.

## Reserved numbers

`ARCH-104`, `ADR-QD-170`, `CCR-QD-448`, `BEH-QD-621`..`BEH-QD-625`, `INV-QD-359`, `INV-QD-360`: `git grep -lwF` at `phase_base` over spec, packages, .changeset, AGENTS.md, CONTRIBUTING.md, features, apps/website/src, examples and scripts prints nothing for any of the ten. No `spec/decisions/170-*` exists at `phase_base`. The reservation file reads `{"CCR":452,"ADR":174,"BEH":645,"INV":368}`. `node scripts/next-id.mjs` was not run.

## API surface base

`pnpm -s spec:api` at `phase_base`:

```
api-surface: 935 export(s) documented across 9 package(s)
```

(57-05 and 57-11 compare against this line, adjusted only by the exports this phase documents.)

## Mutation base

Three scoped runs, one at a time on the untouched green tree (no test written yet, nothing else running), each exit 0. `node .../57-mutation.mjs base core|audit|react` merged each report into `57-mutation-base.json`.

1. `pnpm exec stryker run stryker.config.mjs --mutate 'packages/core/src/SinkCodec.ts,packages/core/src/UntrustedDecode.ts' < /dev/null`: 1 minute 54 seconds (122 s wall).

```
packages/core/src/SinkCodec.ts 0.9754601226993865 (159/163) ignored 38
  survivor packages/core/src/SinkCodec.ts:328:10 EqualityOperator | Survived | stack.length >= 0 | stack.length > 0 | while (stack.length > 0) {
  survivor packages/core/src/SinkCodec.ts:330:9 ConditionalExpression | Survived | false | frame === undefined | if (frame === undefined) break;
  survivor packages/core/src/SinkCodec.ts:393:7 ConditionalExpression | Survived | false | Result.isFailure(before) | if (Result.isFailure(before)) return refuse(before.failure);
  survivor packages/core/src/SinkCodec.ts:397:7 ConditionalExpression | Survived | false | Result.isFailure(encoded) | if (Result.isFailure(encoded)) return refuse(encoded.failure);
packages/core/src/UntrustedDecode.ts 0.9354838709677419 (29/31) ignored 2
  survivor packages/core/src/UntrustedDecode.ts:179:5 EqualityOperator | Survived | unwalked.size >= 0 | unwalked.size > 0 | unwalked.size > 0 && isPlainObject(input)
  survivor packages/core/src/UntrustedDecode.ts:179:5 ConditionalExpression | Survived | true | unwalked.size > 0 | unwalked.size > 0 && isPlainObject(input)
wrote .planning/phases/QD-57-untrusteddecoder-states-the-envelope-s-unknown-key-policy/57-mutation-base.json (core)
```

2. `pnpm exec stryker run stryker.audit.mjs --mutate 'packages/audit/src/AuditEntry.ts,packages/audit/src/AuditArchive.ts' < /dev/null`: 29 seconds (32 s wall).

```
packages/audit/src/AuditArchive.ts 0.9811320754716981 (52/53) ignored 13
  survivor packages/audit/src/AuditArchive.ts:263:58 ObjectLiteral | Survived | {} | { message } | Malformed: ({ message }) => ArchiveRefusal.Malformed({ message }),
packages/audit/src/AuditEntry.ts 1 (17/17) ignored 7
wrote .planning/phases/QD-57-untrusteddecoder-states-the-envelope-s-unknown-key-policy/57-mutation-base.json (audit)
```

3. `pnpm exec stryker run stryker.react.mjs --mutate 'packages/react/src/HydrationEngine.ts' < /dev/null` (`--mutate` on the command line, `stryker.react.mjs` unedited, D-22): 1 minute 10 seconds (73 s wall).

```
packages/react/src/HydrationEngine.ts 1 (169/169) ignored 31
wrote .planning/phases/QD-57-untrusteddecoder-states-the-envelope-s-unknown-key-policy/57-mutation-base.json (react)
```

Status counts in the JSON:

| File | Killed | Timeout | Survived | NoCoverage | Ignored | Score |
|---|---|---|---|---|---|---|
| `AuditArchive.ts` | 52 | 0 | 1 | 0 | 13 | 0.9811320754716981 |
| `AuditEntry.ts` | 17 | 0 | 0 | 0 | 7 | 1 |
| `SinkCodec.ts` | 158 | 1 | 4 | 0 | 38 | 0.9754601226993865 |
| `UntrustedDecode.ts` | 29 | 0 | 2 | 0 | 2 | 0.9354838709677419 |
| `HydrationEngine.ts` | 169 | 0 | 0 | 0 | 31 | 1 |

The base is below 1 for `AuditArchive.ts` (1 survivor), `SinkCodec.ts` (4) and `UntrustedDecode.ts` (2). These are pre-existing and recorded as the floor, not defects of this phase.

## Task Commits

1. Task 1 (evidence, no commit): base facts, reserved numbers, API surface base; all three verifies exit 0.
2. Task 2: `1b7c5da5` `chore(57-01): mutation baseline of the five envelope files on the untouched base` (57-mutation.mjs, 57-mutation-base.json); parent is `phase_base`; the two files alone; Stryker configs unchanged.

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None.

## Self-Check: PASSED

- `57-mutation.mjs` and `57-mutation-base.json` exist on disk; `1b7c5da5` is an ancestor of HEAD; its parent is `phase_base`.
- Task 1's three verifies and Task 2's two verifies exit 0.
- No change under packages, spec, scripts, .changeset, apps, examples, features or AGENTS.md; `node scripts/next-id.mjs` was not run; `.planning/config.json` not staged.
