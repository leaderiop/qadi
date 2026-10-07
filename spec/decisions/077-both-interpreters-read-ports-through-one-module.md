# ADR-QD-077 — Both interpreters read ports through one module, and stop where the evaluator stops

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-ADR-077                                   |
> | Revision       | 1.1                                            |
> | Effective Date | 2026-10-04                                     |
> | Status         | Accepted                                       |
> | Author         | Qadi Engineering                               |
> | Classification | Architecture Decision Record                   |
> | Change History | 1.1 (2026-10-07): addendum — a pure short-circuit stepper both interpreters would call was not adopted; the benchmark gate could not be met on a loaded machine (ARCH-26, CCR-QD-192)<br>1.0 (2026-10-04): Initial release (CCR-QD-153) |

---

## Context

[ADR-QD-024](./024-predicate-output.md) accepted two interpreters over one policy
tree — `evaluate` and `toPredicate` — and said they must agree, and made the
agreement executable ([INV-QD-018](../invariants.md)). That covers the *answer*. It
said nothing about *how a port is asked*, and the two interpreters had drifted on
exactly that, by convention rather than by structure. ARCH-01 found ten things
true at `1caf04c`:

- **E1–E3.** Issue #100 added `catchPortDefect` so a port that dies reaches a
  caller as the port's own typed error instead of a defect that bypasses
  `Effect.retry` — at five call sites in `Evaluate.ts`.
- **E4/E6.** `Predicate.ts` called the same ports at two further sites with no
  wrapper, and carried its own copy of the subject-first attribute lookup. A dying
  resolver was a typed `AttributeResolveError` through `evaluate` and a raw `Die`
  through `toPredicate`; so was a synchronous throw.
- **E5/E7.** The defect handling and the missing spans were nowhere documented as
  deliberate. Only the *metric* omission was ([`PortMetrics.ts`](../../packages/core/src/PortMetrics.ts)).
- **E8.** `translateNode` folded `allOf`, `anyOf` and `rules` with `Effect.forEach`,
  which visits every child. The evaluator stops at the first denying child of an
  `allOf`, at the first allowing child of a `First` `anyOf`, and per
  [INV-QD-017](../invariants.md) for `rules`. With a failing port behind a constant
  that already decided, `evaluate` allowed and `toPredicate` failed. The divergence
  was fail-closed — an error, never a widening — but it was a liveness divergence
  and an extra port call the evaluator would never make.
- **E9/E10.** No test pinned either behaviour, and the dialect compilers' agreement
  properties cannot see a port fault: a fault produces no `Predicate`.

## Decision

**Both interpreters read ports through one module, `PortAccess.ts`, and the stop
rules live in one place, `ShortCircuit.ts`.** The interpreters are not merged
(ADR-QD-024 stands); they share how a port is asked and where a walk may stop, and
keep only what to do with the answer.

| Decision | Chosen |
| -------- | ------ |
| Where the shared module lives | A new internal module, `packages/core/src/PortAccess.ts`, out of the barrel (AGENTS.md §9), owning the whole read: subject-first lookup, question forming, span, call metric, defect mapping |
| Does it own evaluator-only question forming | Yes — the span's question must be annotated before the resource-id requirement can abandon the call ([BEH-QD-227](../behaviors/30-port-calls.md)), so whichever function owns the span runs the precondition |
| Does `toPredicate` get spans and a metric | Spans, plus a `qadi.interpreter` annotation on every port span, plus a sibling metric `qadi_predicate_port_calls_total`; `qadi_port_calls_total` keeps its meaning, description and registry key |
| Does translation stop where the evaluator stops | Yes, through a compile/run split: `compile` turns the tree into a plan and produces every refusal; `run` walks the plan and stops at a child whose *constant* result settles the composite |
| When is `MissingAction` raised | On reach, as the evaluator does ([INV-QD-011](../invariants.md)) |
| Does the stop rule get its own home | Yes — `ShortCircuit.ts`, read by both interpreters |

### One module per concern, not per port

`PortAccess.ts` exports one function per port read — `readAttribute`,
`askActedAny`, `askActedForResource`, `askRelationship`, `askCustom`,
`askSignature` — and `catchPortDefect`. Each read is a named `Effect.fn` because it
owns a span. None is in `UNTRACED_BUDGET`: none runs once per policy *node* the way
the three composite dispatchers do, and the port call under them is the expensive
part ([ADR-QD-073](./073-the-fnuntraced-exception-is-measured.md)). The evaluator's
port arms become plain functions returning `Effect.map(PortAccess.askX(…), verdict)`
— the span now belongs to the read, and a second named wrapper would double it.

The acted question is split by scope rather than widened: `askActedAny` fails only
with `DecisionHistoryUnavailable`, `askActedForResource` with that or
`MissingResourceId`. `Interpreter` is a closed pair, and the metric each read
counts in is chosen by a hoisted `Match.type<Interpreter>()`.

### Compile and run

A pure `compile` produces every refusal — `PolicyNotTranslatable`, and, through a
module-private `WithinDepth` proof, `PolicyTooDeep` — from the tree alone, so a
refusal cannot depend on the subject, the action, or any port's answer. An
effectful `run` then walks the plan through `PortAccess`. A node that cannot be
translated is not a member of the plan, so `run` has no refusal arm to leave
unreachable. Pruning never changes a successful predicate: a pruned `allOf` child
could only have been `and`-ed with a `False`, a pruned `anyOf` child `or`-ed with a
`True`, and a pruned rule-table suffix contributes only `False` terms
([BEH-QD-265](../behaviors/16-predicates.md)).

`MissingAction` is a plan node (`NeedAction`) that fails only when `run` reaches it.
`PolicyNotTranslatable` and `PolicyTooDeep` are properties of the tree, static;
`MissingAction` and port errors are properties of the request and the stores,
on reach.

## Consequences

**Positive.** Locality: the next port, the next defect rule, or the next span
attribute is one edit and reaches both interpreters. One defect rule and one span
rule. An executable error-mode invariant ([INV-QD-058](../invariants.md)), enforced
by three faulty-port properties. `toPredicate` is observable: a deployment leaning
on it for row-level security can see the port load it generates. Devtools can tell
the two apart (`PortCall.interpreter`, `PortActivity.translationCalls`).

**Negative.** One more internal module, and one more (`ShortCircuit.ts`). A plan
ADT inside `Predicate.ts`. Two behaviour changes for callers, both in the fail-safe
direction: translation may now *succeed* where it previously failed (a failing port
behind a decisive constant is no longer asked), and a refusal now wins over a port
failure elsewhere in the same tree. Every port span gains `qadi.interpreter`, so a
test asserting an exact attribute set must include it.

**Measured.** `Evaluate.bench.ts` was run before and after moving the evaluator's
reads (ADR-QD-034's habit); the figures are in the PR description, not here, for
the reason AGENTS.md §5a gives about absolute throughput.

## Alternatives considered

**One function per port module** (`readAttribute` in `AttributeResolver.ts`, …).
Locality per port, but the *policy* — span rules, metric routing, defect rule — is
spread over five files again, and each port module would pull in `PortMetrics`,
`AuthSubject` and span conventions. Recreates the problem one level down.

**Export the wrappers from `Evaluate.ts` and import them in `Predicate.ts`.** No
cycle today, but it couples the second interpreter to the first's module, and
`Evaluate.ts` is barrelled, so internals become public exports.

**Share only `catchPortDefect`.** Fixes E4 and leaves E6 duplicated and the span and
metric policy still divergent by convention.

**Count translation's reads in `qadi_port_calls_total` via an `interpreter`
attribute.** Either the evaluator's series gains the attribute too, and devtools'
`Metric.value(portCallsTotal)` reads the unattributed series and goes to zero, or
only translation is attributed, an asymmetric shape. Either way the description
must change, which changes the registry key ([ADR-QD-052](./052-hydration-is-counted-where-both-ends-can-see-it.md)).

**Keep eager translation and document the divergence.** Smallest diff, but the
error-mode invariant could only be stated as "translation may fail where evaluation
decides".

**Prune inside a single `translateNode` with no static refusal pass.** Makes
`PolicyNotTranslatable` depend on the subject — `anyOf([hasRole("editor"),
hasRelationship("owner")])` would translate for editors and refuse for everyone
else. A policy that works in development for admins and fails in production.

**Prune after a separate static refusal pre-pass inside `translateNode`.** Its
refusal arms become unreachable, and Stryker reports them — including the worst
mutant, "refusal → `True`" — as unkillable survivors; the configuration has no
ignore list ([ADR-QD-025](./025-mutation-testing.md)).

**Raise `MissingAction` statically.** More conservative, but disagrees with
`evaluate` on trees where a constant decides first.

**Inline the stop rules in both interpreters.** Kept honest only by the
walk-equality property; a change to when `anyOf` may stop would have to be made
twice.

## Amendment (2026-10-05, CCR-QD-177)

`PortAccess.ts` no longer names a port's error class or span. Each read builds its
request once, passes it to the port, and on a defect builds the typed error through
the port description's `defect` with that same request; each `Effect.fn` is named
from the description's `span`. Results are byte-identical —
`CustomPredicateError.reason` is still `Cause.pretty(cause)`, which is why the
description carries `defect` beside `failure`. The defect *rule* — which causes are
converted at all — stays here, in `catchPortDefect`
([ADR-QD-094](./094-a-port-is-described-once.md)).

> **Addendum 2026-10-07 (CCR-QD-192) — a pure short-circuit stepper both interpreters would call was not adopted.**
>
> **What was proposed.** `ShortCircuit.ts` hands out inputs (a law, an effect), and
> each interpreter combines one with its child's result by hand: three conjunctions,
> written twice, six sites (`stepAllOf`, `stepAnyOf` and `evaluateRules`'s step in
> `Walk.ts`; `Conjunction`, `Disjunction` and `RuleTable` in `Predicate.ts`'s `run`).
> ARCH-26 proposed pure functions from a composite's configuration and one child's
> certain outcome to `"Stop" | "Continue"` (`allOfStep`, `anyOfStepper`,
> `rulesStepper`), selected once per node into a local, so that both interpreters
> ask one question and each keeps what "certain" means for its own result type
> (ADR-QD-024). It is not the driver ADR-QD-073's Rev 1.3 addendum measured and
> dropped: no `Effect`, no loop and no schedule, the three `fnUntraced` dispatchers
> and their folds stay where they are, and no closure is allocated per node.
>
> **What was measured.** The plan's gate (D-26-a) is an interleaved A/A control, so
> that a variant is only compared where two identical copies of the code agree to
> within 5%. It was run twice on the same commit, with the in-process harness
> (live ESM bindings) over the 26 `Evaluate.bench.ts` workloads, on an Apple M3 Pro
> (12 cores), Node v22.22.0. The machine was far from quiet: load averages of
> 125 (session 1) and 126 to 63 (session 2), against the plan's advisory start
> condition of below 4.
>
> | Session | Rounds x ms | Workloads where the A/A control (A2/A) differs by more than 5% | Largest A/A difference |
> | ------- | ----------- | ------------------------------------------------------------- | ---------------------- |
> | 1 | 5 x 150 | 23 of 26 | 57.5% (`wide`, A2/A = 1.575) |
> | 2 | 9 x 250 | 14 of 26 | 51.5% (`obligation-heavy`, A2/A = 1.515) |
>
> A session is conclusive only when the A/A band is at most 5% on every workload.
> Neither was, so neither could say whether a stepper costs 0% or 3%, which is the
> smallest loss the gate was sized to refuse. Two consecutive inconclusive sessions
> are DROP (D-26-a, D2): the burden of proof is on the change, as in ADR-QD-073.
> The stepper itself was therefore not built into a variant for the gate; the plan's
> orientation run on a quiet machine (spike, 1466 of 1466 unchanged core tests, V
> inside the A/A band on all 26 workloads) is evidence that it is plausible, not a
> measurement that meets the gate. The sessions were minutes apart, not an hour,
> which does not change the verdict: the noise was in the control, not in a variant.
>
> **What stays.** The conjunctions stay in the interpreters. What pins them is now
> stated directly: `ShortCircuit.test.ts`'s "both interpreters stop where the stop
> rule says" tests enumerate every flat composite of up to three children and
> generate up to eight, against an oracle written from ADR-QD-013 and INV-QD-017's
> table, and kill each of six hand-made stop-rule mutants (a stop dropped or widened
> in either interpreter) on their own. `ShortCircuit.test.ts` previously killed none
> of them.
>
> **What would justify reopening it.** Two things: a measurement meeting the gate
> (every A/A band at most 5%, no composite workload at least 3% slower by both
> methods, the paired-vitest method run as well) on a quiet machine, or a fourth
> combining algorithm or field strategy, which would make a third and fourth
> hand-written conjunction. A new argument is not enough; it needs a new measurement.
