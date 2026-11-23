# ADR-QD-188 — The evaluate family's spans are declared once, and a failed span says what was asked

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-ADR-188                                   |
> | Revision       | 1.2                                            |
> | Effective Date | 2026-11-23                                     |
> | Status         | Accepted — extends ADR-QD-051 and ADR-QD-109   |
> | Author         | Qadi Engineering                               |
> | Classification | Architecture Decision Record                   |
> | Change History | 1.2 (2026-11-23): Decision 1 scopes the outcome to a path that ends in a decision or a typed failure; an interrupted or defected evaluation carries no outcome (code review, CCR-QD-467)<br>1.1 (2026-11-23): What enforces it (the compiler, the rule, the tests, review) and the measured cost of the second annotation; related records INV-QD-395, INV-QD-396, BEH-QD-711 to BEH-QD-715 (ARCH-122, CCR-QD-467)<br>1.0 (2026-11-23): Initial release (ARCH-122, CCR-QD-467) |

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
   is the one outcome key of `qadi.evaluate`, on every path that ends in a decision or a
   typed failure. `qadi.decision` is removed. The record of a decision already names the
   same fact `outcome`, and a failure is not a decision, so `qadi.decision: "Failed"` would
   say something false. An interrupted or defected evaluation carries its question and no
   outcome: the span's status already says why it ended, and a value of `qadi.outcome` for
   it would state that fact a second time.
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

## What enforces it

The decision is held by four things, and the last of them is not a machine.

- **The compiler.** Every field of every struct in `EvaluationSpan.ts` is a `SpanValue`, so a field
  that could hold a resolved attribute, a resource or a policy body does not compile. The outcome is
  tied to the decision's tags plus `Failed`, the policy tag to the policy tags, and each span name to
  a `SpanKey`, so every name is a `qadi.` key. `packages/core/test/EvaluationSpan.tst.ts` pins each
  tie ([INV-QD-396](../invariants.md#inv-qd-396-one-fact-has-one-key-across-the-evaluate-family)).
- **The rule.** `[span-key-source]` and `[span-key-literal]` in `scripts/check-house-style.mjs`, run
  by `pnpm lint`, read the key set from the declaration. The first refuses a family key spelled in
  library source outside it; the second refuses one typed by hand in a test outside its counted goldens.
- **The tests.** `packages/core/test/EvaluationSpan.contract.test.ts` pins what a tracer receives from
  each span, the whole record, written with literal keys, so it reads the same whichever way the
  writers change. `packages/core/test/EvaluationSpan.test.ts` holds the declaration's rules as plain
  values: no key shared between a question and its answer, one shared subject, policy tag and action
  field, one error tag, each field read back.
- **Review alone.** That each question is annotated before the work that can fail, inside its writer,
  is kept by review and by the contract rows that read a failed span; no rule checks the position of
  a statement. The rows were seen failing once: moving the annotation after the work turned the failed-span
  rows red
  ([INV-QD-395](../invariants.md#inv-qd-395-a-span-of-the-evaluate-family-carries-its-question-on-every-path-that-reaches-its-work)).

## The cost, measured

Every evaluation annotates twice, the question and then the answer, where it annotated once. The
price was measured against the writers this decision replaced: the tree with the declaration
(`close`) and the same tree with `packages/core/src` patched back to the earlier writers (`base`),
interleaved so each arm runs first in half the rounds.

```
bash scripts/bench/ab.sh <patch back to the earlier writers> <out> 6 close base packages/core/bench/Evaluate.bench.ts "^evaluate$" < /dev/null
node scripts/bench/analyze.mjs <out> base close <the 17 workloads of the evaluate bench> < /dev/null
```

Six rounds, twelve runs, on an Apple M3 Pro with node v26.13.0. The first run began while the
machine was still shedding the load of an earlier run (a falling load is not a steady one), so it
was repeated on a host that had settled. Both are recorded, and they agree. Each cell is the median of
the per-run minima, in ns, as `base -> close, delta, spread`, the spread being the reference arm's
across the six runs.

| Workload | First run (load falling) | Second run (settled) |
| -------- | ------------------------ | -------------------- |
| `one node` | 5687 -> 6375, +12.1%, 11.7% | 5833 -> 6479, +11.1%, 10.0% |
| `resolver miss — one port call` | 11041 -> 11958, +8.3%, 13.6% | 11833 -> 12209, +3.2%, 9.2% |
| `wide — allOf of 8` | 7584 -> 8250, +8.8%, 11.0% | 7750 -> 8438, +8.9%, 9.1% |

The geometric mean over all 17 workloads is +7.83% in the first run and +6.79% in the second, with
15 and 14 of the 17 over the analyzer's 5% band. The analyzer's verdict was a failure in both runs.
The absolute cost is about 0.4 to 1.1 µs per `evaluate` call, one more annotation and its encode,
so the percentage is lowest where the work is most expensive: `field-heavy — allOf of 8 under
Intersection` is +2.2% and +2.3%.

The figure is a record and not a gate, in the habit of [ADR-QD-034](./034-the-switch-exception-is-measured.md), which measures a cost
and does not make a benchmark a merge gate: the second annotation is the price of annotating the question before the work, so that a failed span
says what was asked, and a decision to pay it is not reversed by a percentage. It is stated here so
that a later change which moves it is compared with a number, not with a memory.

## Related

[ADR-QD-051](./051-a-span-says-what-was-asked.md),
[ADR-QD-109](./109-a-ports-span-is-projected-once-and-every-read-is-one-body.md),
[ADR-QD-135](./135-sink-record-fields-stated-once.md),
[ADR-QD-094](./094-a-port-is-described-once.md),
[ADR-QD-123](./123-a-metric-is-declared-once.md) (the metric-literal budget this rule's shape
follows), BEH-QD-227 and INV-QD-044.

Added in revision 1.1: [INV-QD-395](../invariants.md#inv-qd-395-a-span-of-the-evaluate-family-carries-its-question-on-every-path-that-reaches-its-work),
[INV-QD-396](../invariants.md#inv-qd-396-one-fact-has-one-key-across-the-evaluate-family) and BEH-QD-711 to BEH-QD-715
([30 — Port Calls](../behaviors/30-port-calls.md)).
