# ADR-QD-161 — Audit reports core's refusal and decides lost once

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-ADR-161                                   |
> | Revision       | 1.2                                            |
> | Effective Date | 2026-11-16                                     |
> | Status         | Accepted — amends ADR-QD-056, ADR-QD-095       |
> | Author         | Qadi Engineering                               |
> | Classification | Architecture Decision Record                   |
> | Change History | 1.2 (2026-11-16): decision 2: describeEncodeRefusal may carry caller text, so it is for diagnosis, not a log line (ARCH-95, CCR-QD-439); a host logs encodeRefusalAnnotations<br>1.1 (2026-11-16): Related links the behaviours and invariants it names (ARCH-95, CCR-QD-439)<br>1.0 (2026-11-16): accepted (ARCH-95, CCR-QD-439) |

---

## Context

`@qadi/audit` declared its own refusal error beside `@qadi/core`'s `SinkRecordNotEncodable` (`packages/core/src/Errors.ts`).
`encodeAuditEntry` mapped the one into the other and added a `reason` sentence that the default warning never logged:
core's `reportEncodeRefusal` annotates `qadi.refusal`, `qadi.path` and `evaluationId`, and the sentence reached a reader
only through the `onRefused` hook. Forwarding and `@qadi/http` already report core's class, so one refusal had two names
depending on which adapter met it.

The class cited ADR-QD-054 for being separate, and ADR-QD-056 repeats the citation twice. The ADR check made before any
code was written read both ADRs, and their text is quoted here as it was read.

ADR-QD-054 (`spec/decisions/054-a-companion-package-may-compile-a-dialect.md:92-95`):

> the AST. Each companion package declares its own unprefixed
> `PredicateNotRenderable` error, matching `PolicyNotTranslatable`'s shape —
> not shared via `@qadi/core`, because `@qadi/core` has no reason to know this
> error exists.

beneath which (`:97-99`) the ADR carries its amendment:

> **Amended by [ADR-QD-079](./079-renderability-is-a-core-rule.md) (2026-10-04).** The paragraph above is superseded:
> `@qadi/core` now declares the one `PredicateNotRenderable` (a `QadiError` member, code `ACL018`) and both
> packages re-export it. Ticket 95's shared-`_tag` rationale no longer applies.

ADR-QD-056 (`spec/decisions/056-audit-companion-package.md:72-74`, the seam):

> `@qadi/audit` hangs off `packages/core/src/DecisionSink.ts` — write-only,
> read via `Effect.serviceOption`, error channel `never` by design — the same
> seam ADR-QD-054's companion packages need nothing from `@qadi/core` to reach.

and the two sentences that call the refusal this package's own (`:300-301` and `:340`):

> gains `refusal` (core's `EncodeRefusal`); it stays this package's own error, per
> ADR-QD-054 ([ADR-QD-095](./095-sinkcodec-owns-both-directions.md)).

> date); this package keeps its own error and its own message (ADR-QD-054).

The verdict: ADR-QD-054 concerns compile-only dialect packages and forbids nothing here, and ADR-QD-079 already withdrew
its "each package declares its own error" sentence for them. ADR-QD-056's seam is core's `DecisionSink`, which this
change keeps. Neither ADR forbids `@qadi/audit` reporting core's `SinkRecordNotEncodable`; the two "own error" sentences
state what was true and cite ADR-QD-054 as their only reason, so they are what this ADR amends.

The second defect sat in the same files. Whether an unwritten entry was lost was decided three times: `unwrittenDurability`
(`AuditWriteOutcome.ts`) mapped each unwritten variant to a durability, `lostStaging` (`AuditWriteReport.ts`) mapped it
again to a counter word, and the per-arm `warning(...)` or `info(...)` choice in the report decided it a third time.
`durabilityOf`'s doc comment claimed it was the one place, which was false. And four branches were hand-written on a
`_tag` rather than matched: `writtenStaging`'s optional `commit` and ternary, `evaluationIdOf`, `outcomePath` and the emit
branch for `Refused`.

## Decision

1. **The audit class is deleted, with no alias** (D-01, D-02). `encodeAuditEntry` fails with core's
   `SinkRecordNotEncodable` exactly as `encodeSinkRecord` returns it, with no `mapError`. `onRefused` (the sink's option
   and the emit option) and `AuditWriteOutcome.Refused.refusal` take that class, so the type and the `_tag` of the value
   are the only things a caller sees change.
2. **`reason` goes, and the sentence is computed once** (D-03, D-03a). A hook that wants it calls
   `describeEncodeRefusal(e.refusal)`, which is byte for byte the sentence the field held and, like it, may carry caller text
   (an `EncodeFailed` sentence includes a throwing getter's message), so it is for diagnosis in code holding the refusal,
   never a log line (INV-QD-104); a host that logs a refusal annotates `encodeRefusalAnnotations(e)`, as the default
   warning does. The one line audit writes about
   a refusal is `reportEncodeRefusal`'s, unchanged, and no `qadi.reason` annotation is added to core, because that would
   change the forwarding and http lines.
3. **One closed row per unwritten staging variant** (D-05, D-05a), in the package-private `UnwrittenRow.ts`:
   `{ durability: "StagingOnly" } | { durability: "Lost"; lost: "not_wired" | "failed" }`, typed so durability and the lost
   word cannot disagree. `durabilityOf`, the lost label and the unwritten line's level (Lost warns, StagingOnly informs)
   all read it, so `unwrittenDurability` and `lostStaging` are deleted and `durabilityOf`'s doc is now true.
4. **The agreement is tested over the eleven leaves** (D-06, D-06a): `durabilityOf(o) === "Lost"` if and only if a lost
   counter is incremented if and only if the span's `qadi.audit.durability` is `"Lost"`. The warning leg is scoped to the
   six unwritten leaves, because `Written.CommitFailed` (durability `Trail`) and `Refused` (durability `Refused`) also warn
   without being lost.
5. **Nothing observable moves** (D-07, D-08): metric ids and labels, the `LOST_COUNTERS` keys and the public `Durability`
   union are unchanged, and so is every log line, span attribute and counter, pinned by a characterisation written on the
   base before any source edit.
6. **`StageResult` is a closed tagged union in which only `Staged` carries `commit`** (D-09), matched exhaustively at
   module scope by `writtenStaging`; `evaluationIdOf`, `outcomePath` and the refusal branch of the report become
   exhaustive matches too (D-10, D-10a), so no hand-written `_tag` branch is left in the audit report.

Behaviours BEH-QD-576 to BEH-QD-580 and invariants INV-QD-341 and INV-QD-342 state the rule in `spec/`; they are written
by the plan that follows this one, so they are named, not linked, here.

## Alternatives considered

- **Keep the audit class as an alias of core's.** Rejected (D-01): two names for one refusal is the defect.
- **Add a `qadi.reason` annotation in core.** Rejected (D-03): it changes the forwarding and http lines, and the phase
  changes no line.
- **Keep the row beside `UnwrittenStaging` in `AuditWriteOutcome.ts`.** Rejected: that module is in the barrel, so the row
  would be public; and a leaf that imported `UnwrittenStaging` from there would be a madge cycle, so the leaf declares the
  three tags structurally.
- **Derive lost-ness from `durabilityOf` and keep a separate word table.** Rejected: that is two mappings again.
- **Keep the per-arm level choice.** Rejected (D-05a): it is the third restatement of lost-ness.
- **Leave `outcomePath` and `evaluationIdOf` as `_tag` branches.** Rejected (D-10, D-10a): the same defect in the same file.

## Consequences

- **Breaking for `@qadi/audit`**: a `catchTag` on the old tag, an `onRefused` annotated with the old class and a read of
  `reason` stop compiling or stop matching. It is recorded in the `@qadi/audit` changeset, marked **Breaking**, and in the
  0.13 entry of the upgrade guide, which gives the rename, the replacement for `reason` and the new tag. `@qadi/core`
  changes only a doc comment, so it has no changeset.
- **Output is byte-identical**: the characterisation written before the first source edit passes unchanged after every
  commit of the phase.
- **A fourth staging variant is a compile error at every reader**, because the row, the durability, the lost label, the
  level and `writtenStaging` are all exhaustive.
- **`Written.CommitFailed` and `Refused` warn without being lost**, by design (D-06a), and the tests say so rather than
  pretending the warning and the loss are one fact.
- **No new public export, and one fewer**: the row is package-private and the audit class is gone.
- ADR-QD-056 and ADR-QD-095 are amended in dated sections and keep their text; the ADR-QD-054 citation is recorded as a
  misreading, not repeated.

## Related

- [ADR-QD-054](./054-a-companion-package-may-compile-a-dialect.md), whose "own error" sentence the audit class cited
- [ADR-QD-056](./056-audit-companion-package.md), amended where it calls the refusal this package's own
- [ADR-QD-095](./095-sinkcodec-owns-both-directions.md), whose D-09-e audit clause no longer holds
- [ADR-QD-123](./123-a-metric-is-declared-once.md), whose metric rows this change leaves untouched
- ARCH-95, CCR-QD-439
- [BEH-QD-576](../behaviors/33-audit-pipeline.md#beh-qd-576-an-audit-refusal-is-cores-sinkrecordnotencodable), [BEH-QD-577](../behaviors/33-audit-pipeline.md#beh-qd-577-a-refused-records-default-line-is-cores-report-and-its-sentence-is-cores-to-compute), [BEH-QD-578](../behaviors/33-audit-pipeline.md#beh-qd-578-one-row-per-unwritten-staging-decides-whether-the-entry-is-lost), [BEH-QD-579](../behaviors/33-audit-pipeline.md#beh-qd-579-the-spans-durability-the-lost-counter-and-the-unwritten-lines-level-agree-on-every-leaf), [BEH-QD-580](../behaviors/33-audit-pipeline.md#beh-qd-580-the-stage-result-is-a-closed-union-and-every-branch-on-an-outcome-is-exhaustive)
- [INV-QD-341](../invariants.md#inv-qd-341-an-unwritten-audit-entry-is-lost-exactly-when-its-stagings-row-says-so) and [INV-QD-342](../invariants.md#inv-qd-342-an-audit-refusal-is-cores-one-sinkrecordnotencodable)
