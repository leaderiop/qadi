---
phase: QD-48-audit-reports-core-s-refusal-and-derives-lost
plan: 01
subsystem: audit
tags: [adr-check, mutation-baseline, evidence]
phase_base: c9fde4ba08f8cb8b4bfd5a230616f026f2a49eaa
requires: []
provides:
  - "ADR check of ADR-QD-054 and ADR-QD-056 against core's SinkRecordNotEncodable (input to ADR-QD-161)"
  - "48-mutation-base.json, the Stryker baseline of the four touched audit source files"
affects: [48-02, 48-03, 48-04, 48-05, 48-06, 48-07, 48-08]
key-files:
  created:
    - .planning/phases/QD-48-audit-reports-core-s-refusal-and-derives-lost/48-mutation-base.json
status: complete
plan_head_before: c9fde4ba08f8cb8b4bfd5a230616f026f2a49eaa
plan_head_after: d1428895e7423872b01706b91210320c280dca8c
commits: 1
actuals:
  tokens: 3500
  tasks: 2
  commits: 1
---

# Phase QD-48 Plan 01: Evidence on the untouched base Summary

**ADR-QD-054 and ADR-QD-056 do not forbid `@qadi/audit` reporting core's `SinkRecordNotEncodable`; the mutation baseline of the four touched audit files is committed alone as the phase's first plan commit.**

## ADR check

Read at `phase_base` (`c9fde4ba`, 2026-11-16), before any code. Quotes are verbatim, with the line numbers of the file they come from.

### ADR-QD-054

`spec/decisions/054-a-companion-package-may-compile-a-dialect.md:92-95`:

> the AST. Each companion package declares its own unprefixed
> `PredicateNotRenderable` error, matching `PolicyNotTranslatable`'s shape —
> not shared via `@qadi/core`, because `@qadi/core` has no reason to know this
> error exists.

`:97-99`, the amendment beneath it:

> **Amended by [ADR-QD-079](./079-renderability-is-a-core-rule.md) (2026-10-04).** The paragraph above is superseded:
> `@qadi/core` now declares the one `PredicateNotRenderable` (a `QadiError` member, code `ACL018`) and both
> packages re-export it. Ticket 95's shared-`_tag` rationale no longer applies.

Forbids: core depending on a companion package, and a compiler stringifying a value it cannot render rather than refusing; the sentence that each package declares its own error was about two packages with no shared home, and ADR-QD-079 withdrew it.
Does not forbid: a companion package reporting an error core declares, which is what both predicate packages already do for `PredicateNotRenderable` after ADR-QD-079.

### ADR-QD-056

`spec/decisions/056-audit-companion-package.md:58-62` ("gains zero new dependencies"):

> `@qadi/predicate-prisma`, `@qadi/promise` and `@qadi/http`. `@qadi/core`
> gains zero new dependencies. `@qadi/audit` itself is dependency-free too —
> every capability that needs real storage, I/O, identity or crypto is a
> caller-supplied port; nothing here opens a connection, generates a key, or
> assumes a schema.

`:72-74` (the seam):

> `@qadi/audit` hangs off `packages/core/src/DecisionSink.ts` — write-only,
> read via `Effect.serviceOption`, error channel `never` by design — the same
> seam ADR-QD-054's companion packages need nothing from `@qadi/core` to reach.

`:99-103` (refuse rather than approximate):

> time. Encoding refuses rather than approximates: a `resource`, or `policy`'s
> `HasCustom.params` (ADR-QD-055's escape hatch), carrying a value with no safe
> durable representation fails `AuditEntryNotEncodable` rather than being
> partially written, coerced, or silently dropped — the same rule ADR-QD-054
> generalized for predicate compilation, one layer further from the wire.

`:300-301` (the 2026-09-19 revision):

> gains `refusal` (core's `EncodeRefusal`); it stays this package's own error, per
> ADR-QD-054 ([ADR-QD-095](./095-sinkcodec-owns-both-directions.md)).

`:340` (the 2026-10-07 amendment):

> date); this package keeps its own error and its own message (ADR-QD-054).

Forbids: `@qadi/core` gaining a dependency (the audit package hangs off core's `DecisionSink`, core never imports it), and writing a value with no safe durable representation partially, coerced or silently dropped.
Does not forbid: reporting core's `SinkRecordNotEncodable` from `@qadi/audit`. Both "own error" sentences (`:300-301`, `:340`) state what was true and cite ADR-QD-054 as their only reason; they carry no rule of their own, and the ADR-QD-054 sentence they rest on was superseded by ADR-QD-079 for the compile-only packages.

### Core's SinkRecordNotEncodable

`packages/core/src/Errors.ts:369-372`:

> A refusal is a value, never a thrown error and never a defect: every
> outbound adapter (forwarding, the decision stream, the audit encoder)
> reports it and drops that one record (INV-QD-097).

`packages/core/src/Errors.ts:381-385`:

> export class SinkRecordNotEncodable extends Data.TaggedError("SinkRecordNotEncodable")<{
>   readonly recordTag: SinkRecordTag;
>   readonly evaluationId: string;
>   readonly refusal: EncodeRefusal;
> }> {}

Forbids: nothing; it is a plain `Data.TaggedError` that crosses no codec, so `SCHEMA_ERROR_BUDGET` is unchanged.
Does not forbid: the audit encoder reporting it; its own doc names the audit encoder as an adapter that does. `AuditEntryNotEncodable` (`packages/audit/src/AuditEntry.ts:51-73`) is the same three fields plus `reason`.

Verdict: neither ADR forbids `@qadi/audit` reporting core's `SinkRecordNotEncodable`. The two "own error" sentences of ADR-QD-056 rest on a reading of ADR-QD-054 that ADR-QD-079 already reversed for the compile-only packages, so they are what ADR-QD-161 (48-06) amends; no decision checkpoint is needed and D-01 stands.

## Reserved ids

Checked against `phase_base` itself with `git grep -lwF` over `spec packages .changeset AGENTS.md CONTRIBUTING.md features apps/website/src examples scripts`, whole-id matched (`node scripts/next-id.mjs` was not run). All ten are free: ARCH-95, ADR-QD-161, CCR-QD-439, BEH-QD-576, BEH-QD-577, BEH-QD-578, BEH-QD-579, BEH-QD-580, INV-QD-341, INV-QD-342. No `spec/decisions/161-*` exists at the base (the highest is `160-port-facts-are-read-from-the-description.md`). The reservations file holds `{"CCR":443,"ADR":165,"BEH":600,"INV":350}`, read and not written.

## Mutation base

One run, the close's exact invocation (48-08), in the background, on a tree with no tracked change under `packages/`, `spec/`, `scripts/` or `stryker.audit.mjs`: `pnpm exec stryker run stryker.audit.mjs --mutate 'packages/audit/src/AuditEntry.ts,packages/audit/src/AuditWriteOutcome.ts,packages/audit/src/AuditWriteReport.ts,packages/audit/src/AuditDecisionSinkLive.ts'` (exit 0, 15 s; overall 98.25). The writer accepted the report (newer than every file it checks, exactly the four files, `source` equal to disk).

| File | Score | (detected/scored) | Ignored (static) |
|---|---|---|---|
| `packages/audit/src/AuditDecisionSinkLive.ts` | 1 | 59/59 | 1 |
| `packages/audit/src/AuditEntry.ts` | 1 | 19/19 | 8 |
| `packages/audit/src/AuditWriteOutcome.ts` | 1 | 5/5 | 10 |
| `packages/audit/src/AuditWriteReport.ts` | 0.9659090909090909 | 85/88 | 80 |

Survivors (all in `AuditWriteReport.ts`):

- `:238:42 ConditionalExpression Survived -> true on: report.log !== "encodeRefusal"` (equivalent)
- `:238:57 StringLiteral Survived -> "" on: "encodeRefusal"` (equivalent)
- `:240:43 ConditionalExpression Survived -> true on: cause === undefined` is the real **`:240` cause gap** that 48-02's characterisation must kill: the cause can be dropped from the `Written.CommitFailed` line and no test notices.

Written `48-mutation-base.json` (`chore(48-01)`, `d1428895e7423872b01706b91210320c280dca8c`, parent `phase_base`):

```json
{"measured":{"packages/audit/src/AuditDecisionSinkLive.ts":1,"packages/audit/src/AuditEntry.ts":1,"packages/audit/src/AuditWriteOutcome.ts":1,"packages/audit/src/AuditWriteReport.ts":0.9659090909090909},"unmeasured":{},"new":["packages/audit/src/UnwrittenRow.ts"],"deleted":{},"moved":{}}
```

## Task Commits

1. Task 1 (ADR check, reserved ids): no commit by design; recorded here.
2. Task 2 (mutation baseline): `d1428895e7423872b01706b91210320c280dca8c` `chore(48-01): mutation baseline for the audit refusal, outcome, report and sink`.

## Deviations from Plan

None - plan executed exactly as written. The only edit to this file after drafting was correcting ADR-QD-056 line ranges to the ones the quotes actually come from (`:58-62`, `:99-103`, `:300-301`).

## Known Stubs

None. No source file was touched.

## Threat Flags

None. No file outside `.planning/` changed.

## Self-Check: PASSED

- `48-mutation-base.json`: FOUND; `chore(48-01)` `d1428895` is the phase's first plan commit, alone, parent `phase_base`, trailer last.
- Task 1 and Task 2 verifies: all exit 0; no `git diff` against `phase_base` outside `.planning/`.
