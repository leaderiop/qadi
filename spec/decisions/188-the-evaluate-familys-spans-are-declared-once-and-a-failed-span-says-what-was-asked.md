# ADR-QD-188 — The evaluate family's spans are declared once, and a failed span says what was asked

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-ADR-188                                   |
> | Revision       | 1.0                                            |
> | Effective Date | 2026-11-23                                     |
> | Status         | Accepted — extends ADR-QD-051 and ADR-QD-109   |
> | Author         | Qadi Engineering                               |
> | Classification | Architecture Decision Record                   |
> | Change History | 1.0 (2026-11-23): Initial release (ARCH-122, CCR-QD-467) |

---

## Context

`@qadi/core` writes five spans around a question besides the port spans: `qadi.evaluate`,
`qadi.toPredicate`, `qadi.decideSubjects`, `qadi.decideSubjectsStream` and
`qadi.guardHealthCheck`. Each one spelled its `qadi.*` keys by hand, in `Lifecycle.ts`,
`Predicate.ts`, `SubjectSet.ts` and `GuardHealthCheck.ts`, and again in the tests that read
them, and the root one changed its shape depending on how the evaluation ended.

A failed `qadi.evaluate` span carried only `qadi.outcome: "Failed"` and `qadi.error_tag`. The
question keys, the subject, the evaluation id and the policy tag, were written after the
decision was made, so a tracer filtering by subject or by evaluation id missed every failed
evaluation. The outcome sat under two keys: `qadi.decision` on an Allow or a Deny and
`qadi.outcome` on a failure. `toPredicate` annotated nothing at all when a translation
failed, and the guard health probe never said which subject or policy it probed.

The port spans and the sink record already state their fields once. A port span's question
and answer are structs built with `spanStruct` and written through `encodeSpan`, the question
before the call, so a failed port span still says what it was asked (ADR-QD-051,
ADR-QD-109, BEH-QD-227). The sink record names its fields once in `SinkRecordFields.ts`
(ADR-QD-135), with `subjectId` a top-level field so a consumer reads one field whatever the
outcome. The evaluate family had neither: one fact was spelled in several places, and the
spellings had already drifted.

Nothing outside `packages/core/test` reads these keys: not `@qadi/devtools`, `@qadi/http`,
`@qadi/react`, the apps, the examples or the website.

## Decision

1. **One outcome key.** `qadi.outcome`, with the closed values `Allow`, `Deny` and `Failed`,
   is the one outcome key of `qadi.evaluate`, on every path. `qadi.decision` is removed.
   The record of a decision already names the same fact `outcome`, and a failure is not a
   decision, so `qadi.decision: "Failed"` would say something false.
2. **No release writes both keys.** `qadi.decision` does not stay for a release beside
   `qadi.outcome`. Breaking changes are allowed, nothing is in production, and nothing in
   this repository reads these spans; two keys would be a second statement of one fact,
   which is the defect this decision removes. A tracer query on `qadi.decision` moves to
   `qadi.outcome`, and the changeset and the upgrade guide say so.

   Decisions 1 and 2 were decided autonomously on 2026-11-23 under the owner's standing
   instruction ("do not ask me; always pick the most complete and clean solutions"), in place
   of the roadmap's human checkpoint, and they are recorded here before any source change.
3. **One declaration module.** One package-private module, `EvaluationSpan.ts`, beside
   `PortSpan.ts`, declares `evaluateSpan`, `toPredicateSpan`, `decideSubjectsSpan`,
   `decideSubjectsStreamSpan` and `guardHealthCheckSpan`, each a `{ name, question, answer }`
   whose structs are built with `spanStruct`, and the `denialEvent` struct. Each key is
   spelled once there; `qadi.subject_id` is read from `sharedQuestionKeys`, so a tracer
   filtering on it finds the port spans and the evaluate family under one key.
4. **What each span asks and answers.**

   | Span | Question, annotated before the work | Answer, annotated after |
   | ---- | ----------------------------------- | ----------------------- |
   | `qadi.evaluate` | `subject_id`, `evaluation_id`, `policy_tag`, `action` when supplied | `outcome`; `error_tag` on Failed; `obligations` on an Allow that owes some |
   | `qadi.toPredicate` | `subject_id`, `policy_tag`, `action` when supplied | `predicate_tag` on success; `error_tag` on failure |
   | `qadi.guardHealthCheck` | `subject_id`, `policy_tag`, `action` when supplied | `healthy`; `error_tag` when unhealthy |
   | `qadi.decideSubjects` | `subject_count`, `policy_tag`, `action` when supplied | none |
   | `qadi.decideSubjectsStream` | `policy_tag`, `action` when supplied | none |
   | denial event, a log on `qadi.evaluate` | `policy_tag`, `subject_id` | `reason` |

   Every field is a string, a number or a boolean. The outcome is closed over the decision's
   tags plus `Failed`, and the policy tag is closed over the policy tags. No span carries a
   resource, because a resource is arbitrary data. `qadi.decideSubject` stays keyless: the
   `qadi.evaluate` it opens carries the question.
5. **The question comes first, on every path.** Each span is annotated with its question
   before the work that can fail, so a failed span says what was asked, and a translation that
   fails answers its error tag.
6. **One key per fact.** Only `qadi.evaluate` carries the outcome, since it is the one span
   whose answer is a decision. `qadi.error_tag` is shared by the three spans that can fail.
   `qadi.obligations` is the comma-joined ids and appears only on an Allow that owes some.
   The denial log line keeps its message and its three annotations, built from `denialEvent`,
   and stays a debug log, so the reason sentence is not copied onto the span's attributes.
7. **Names come from the declaration.** Each span's name is read from its declaration, as a
   port read reads its name from its description. The names themselves do not change.
8. **A rule guards the keys.** A house-style rule reads the key set from the declaration, and
   refuses a family key typed by hand outside it. A What-enforces-it section names the rule
   when it is added.

## Alternatives considered

- **Keep `qadi.decision` and add `Failed` to it.** Rejected: a failure is not a decision, and
  the sink record names the same fact `outcome`.
- **Write both keys for one release.** Rejected: a second definition of one fact, and nothing
  here reads the old key, so the overlap protects no one.
- **A declaration beside each writer.** Rejected: four places to spell one shared key, which
  is how the keys drifted.
- **Exporting the declaration.** Rejected: a host has no span of this family to write, and
  ADR-QD-099 keeps a module out of the barrel unless another package needs it (AGENTS.md §9).
- **The predicate tag as a closed literal list.** Rejected: the tags live in `Predicate.ts`,
  which reads this module, so the list would be a second copy or an import cycle.

## Consequences

- Breaking for a tracer query on `qadi.decision`: it moves to `qadi.outcome`. It ships with a
  `@qadi/core` changeset and an upgrade-guide section that list every new key a tracer sees.
- Every evaluation annotates twice, the question and then the answer, where it annotated once.
  The cost is measured and recorded in a later revision of this decision.
- `decideQuestion` stays exported, package-private, because its type test pins its options.
- No public name changes, so `check-api-surface` stays at 941 exports.

## Related

[ADR-QD-051](./051-a-span-says-what-was-asked.md),
[ADR-QD-109](./109-a-ports-span-is-projected-once-and-every-read-is-one-body.md),
[ADR-QD-135](./135-sink-record-fields-stated-once.md),
[ADR-QD-094](./094-a-port-is-described-once.md),
[ADR-QD-123](./123-a-metric-is-declared-once.md) (the metric-literal budget this rule's shape
follows), BEH-QD-227 and INV-QD-044.
