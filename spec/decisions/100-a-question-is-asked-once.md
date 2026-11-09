# ADR-QD-100 — A question is asked once: one request value, an internal walk, a probe that is not a decision

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-ADR-100                                   |
> | Revision       | 1.3                                            |
> | Effective Date | 2026-10-07                                     |
> | Status         | Accepted — amends ADR-QD-031, ADR-QD-044, ADR-QD-073 |
> | Author         | Qadi Engineering                               |
> | Classification | Architecture Decision Record                   |
> | Change History | 1.3 (2026-11-09): amended — the obligation projection is curried and made once before the duty handler runs (ARCH-54, CCR-QD-393)<br>1.2 (2026-11-09): amended — obligationRecord joins failedRecord/decidedRecord: SinkEmit.ts projects all three records from the question (ARCH-54, CCR-QD-393)<br>1.1 (2026-10-08): Amendment, `toPredicate` admits through `Question` (CCR-QD-205)<br>1.0 (2026-10-07): Initial (CCR-QD-189) |

---

## Context

`evaluate` was a wide, shallow module: one call, but a ~220-line body that re-derived the
request from `options` at every point that needed it (the interpreter's input, the matcher
context, the cache key, the `Failed` record, the `Decided` record, the span, both `Decision`
constructors) with `options?.maxDepth ?? DEFAULT_MAX_DEPTH` computed twice. Which options change
the answer, and so belong in the cache key, was prose in three files. Two emitters
(`evaluate`, `discharge`) each re-read `DecisionSink` and re-wrapped it, so "an observer can
never deny" (INV-QD-035) was enforced twice.

`createGuardHealthCheck` went through `decide`. With a `DecisionCache` wired, every probe after
the first was a cache hit (a cache keeps successes and has no TTL, ADR-QD-031), never reached a
port, and reported `healthy: true` while the store was down (reproduced: one port call across two
probes). Each probe also wrote a `DecisionRecord` (a permanent audit row per poll under
`@qadi/audit`), bumped `qadi_decisions_total` and minted an evaluation id.

## Decision

- **`Question`** (`Question.ts`, public): `{ subject, policy, resource, action, maxDepth }`, all
  five keys always present, built once by `questionOf`. It is the cache key and the source of a
  record's request half. `QuestionOptions` holds the options that can change the answer;
  `EvaluateOptions extends QuestionOptions` and adds `concurrency` and `evaluationId`, which do
  not. `DecisionCacheKey` is removed (breaking); `getOrCompute` takes a `Question`.
- **`Walk.ts`** (internal) owns the depth gate and the interpreter; `walk(question, concurrency)`
  is a plain function returning `Effect.suspend`, with no id, cache, record or span. `evaluate`
  is the lifecycle around it.
- **`SinkEmit.ts`** (internal) is the one reader of `DecisionSink` (`sinkEmitter`) and the one
  projection of a `Question` into a record (`failedRecord`, `decidedRecord`). `check-house-style.mjs`'s
  `sink-read-once` rule fails a second `serviceOption(DecisionSink)` in library source.
- **A readiness probe walks.** It records nothing, counts no decision metrics, never consults the
  cache and needs only `CurrentSubject` and the ports. Its `qadi.guardHealthCheck` span carries
  `qadi.healthy` and `qadi.error_tag`.

## Alternatives considered

- Keep records and metrics, bypass only the cache: leaves the audit pollution.
- Mark probe records: a new `DecisionRecord` field, a wire version 3 under ADR-QD-096, for a consumer nobody has.
- Export `walk` publicly: an unaudited second decision path, the shape ADR-QD-004 deleted.
- A bypass option on `evaluate`: a public footgun with one legitimate caller.
- Keep `DecisionCacheKey` as an alias: two exports for one concept.
- A bench-threshold gate: AGENTS.md §5a records ~30% machine variance.

## Consequences

- `DecisionCacheKey` is removed; anything naming it uses `Question`.
- `createGuardHealthCheck`'s requirement narrows to `CurrentSubject | PortServices`; dashboards
  that counted probe traffic in `qadi_decisions_total` or `qadi.evaluate` spans change.
- `evaluateNode`, `evaluateAllOf`, `evaluateAnyOf`, `evaluateRules` move to `Walk.ts`; the
  `SWITCH_BUDGET` and `UNTRACED_BUDGET` counts (1 and 3) are unchanged, re-keyed.
- Measured cost: see CCR-QD-189 in `spec/README.md`.

## Amendment (2026-10-08, ARCH-41): `toPredicate` is admitted by the same rule

`toPredicate` asks the same `Question` (with no resource, explicitly) and is admitted by
the same rule as `walk`: internal `Admission.ts`'s `admit(question)` returns either
`PolicyTooDeep` or an `Admitted` proof carrying the question and its matcher context. The
depth gate, the matcher context and the `maxDepth` default (only `questionOf` defaults it
now) were each written twice, in `Walk.ts` and `Predicate.ts`; they agreed, but nothing
made them. Only admission is shared, never the walk (ADR-QD-024). `PredicateOptions` is
`Omit<QuestionOptions, "resource">`, so an option added to `QuestionOptions` reaches
translation by type, and `Question.test.ts` classifies every key for translation
(`folds`, `bounds`, `absent-by-design`; TS2741 until classified). `evaluateNode`'s
per-node guard stays as defense in depth (ADR-QD-090). `scripts/check-house-style.mjs`'s
`admission-once` rule enforces the single owner. This closes the "optional polish" ARCH-16
left in `toPredicate`'s own default.

## Amendment (2026-11-09, ARCH-54): the obligation record is projected here too

`obligationRecordFor` joins `failedRecord` and `decidedRecord` in `SinkEmit.ts`, so that module
is the one projection of a `Question` into each of the three records. ADR-QD-105's obligation
record had been built in `discharge` (`Qadi.ts`) since ARCH-30; it is now projected from the
same question the allow answered, so a row's identity keys cannot disagree with what was
asked. The record is unchanged, pinned whole before and after the move (CCR-QD-393). The
projection is curried, `obligationRecordFor(question, decision, at)(outcome)`, and `discharge`
makes it once, before the duty handler runs, as it did before the move: the question's resource
is the caller's own object, so reading its id after the handler would let a handler that
reassigns it make the row disagree with the decision row, and a throwing read there would be a
defect after the duty had already run (INV-QD-035).
