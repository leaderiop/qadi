# ADR-QD-158 — The breaker's rules are one transition function

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-ADR-158                                   |
> | Revision       | 1.3                                            |
> | Effective Date | 2026-11-15                                     |
> | Status         | Accepted — amends ADR-QD-126                   |
> | Author         | Qadi Engineering                               |
> | Classification | Architecture Decision Record                   |
> | Change History | 1.3 (2026-11-15): the safe-integer bound stated as exactness, not reachability; a string or Duration cooldown is read as Duration reads it (ARCH-92, CCR-QD-436)<br>1.2 (2026-11-15): Decision 4: the bounds are the safe integers, a raw non-whole reset is refused (ARCH-92, CCR-QD-436)<br>1.1 (2026-11-15): Related: BEH-QD-561 and INV-QD-335 (ARCH-92, CCR-QD-436)<br>1.0 (2026-11-15): Initial (ARCH-92, CCR-QD-436) |

---

## Context

`@qadi/audit`'s circuit breaker had five `Ref.modify` bodies in `CircuitBreaker.ts`, one per event, and each restated the
same rules: the stale-generation check, the generation's increment (eight copies across the file), the state rebuild and
the announcement of the transition. A matcher was rebuilt per call. A change to one rule meant finding every body that
restated it.

And nothing checked the options. Measured on the phase base before any source change (plan 45-01), by a table of 26
option rows over `makeCircuitBreaker` and the sink:

- `failureThreshold: NaN` built a breaker that never opened, `Infinity` the same; `0`, a negative and `-Infinity` opened it
  on the first failure; `2.5` on the third.
- A `resetTimeoutMs` at or below zero, or `NaN` (which decodes to a zero duration), flapped Open to HalfOpen on every
  read; `Infinity` never left Open; a malformed duration died with a defect when the breaker was built.
- A zero `storeCallTimeout` timed every store call out at once, which [ADR-QD-126](./126-an-audit-store-call-has-a-deadline.md)
  pinned rather than chose.

The rows ran RED against the base:

```
 Test Files  1 failed (1)
      Tests  21 failed | 5 passed (26)
```

The `failureThreshold NaN` row failed with `built a breaker that reads Closed then Closed after 10 consecutive failures`.
The five that passed are the options that work.

## Decision

**The breaker's rules are one transition function, and an option that cannot work is refused when it is built.**
(ARCH-92, CCR-QD-436.)

1. **One pure `step`.** `step(rules)(state, event, now)` in `CircuitBreaker.ts` answers `{ next, announced }`. It is
   package-private ([ADR-QD-099](./099-entry-points-are-a-closed-list.md)): the barrel does not export it. `Success`,
   `Failure` and `Release` carry the generation they were admitted under; `Observe` and `Claim` act on the current state.
2. **Each rule once.** The stale check is written once and the generation's increment once, through a closed `ENTER`
   record keyed by status, so a status change, the increment and the announcement cannot disagree. The matchers are
   hoisted to module scope (`Match.type`, AGENTS.md §5a).
3. **Each event is one atomic step.** `run(event)` reads the clock once and calls `Ref.modify` once, so
   [INV-QD-052](../invariants.md#inv-qd-052-once-a-circuit-breaker-trips-write-is-never-attempted-again-until-reset)
   holds as before. `admit`, `withPermit` and the release finalizer keep their shape, and a tripped breaker still has no
   public error ([BEH-QD-251](../behaviors/33-audit-pipeline.md#beh-qd-251-a-tripped-circuit-breaker-skips-the-write-not-the-stage-and-its-transitions-are-atomic-under-concurrency)).
4. **A typed refusal.** `InvalidAuditSinkOption` is a `Data.TaggedError` carrying `option` (the closed three:
   `failureThreshold`, `resetTimeoutMs`, `storeCallTimeout`) and the raw `received`. `makeCircuitBreaker` refuses a
   `failureThreshold` that is not a positive safe integer and a `resetTimeoutMs` that is not a finite, positive, whole
   number of milliseconds within the safe integers (a raw number is tested for being whole before it is decoded, because
   `Duration.millis` rounds `1.0000000001` to one millisecond; a string or `Duration` value is read as `Duration` reads it).
   Past `Number.MAX_SAFE_INTEGER` a count by one and a millisecond sum stop being exact, so such a bound is refused with
   `NaN` and `Infinity`; a large value under it is accepted as the host's choice, however long it takes to reach. The sink refuses a `storeCallTimeout` that is not a positive duration, and keeps
   `Duration.infinity` as no deadline
   ([BEH-QD-379](../behaviors/33-audit-pipeline.md#beh-qd-379-a-store-call-is-bounded-by-the-sinks-deadline)).
5. **The layer's type moves.** `AuditDecisionSinkLive` is
   `Layer.Layer<DecisionSink, InvalidAuditSinkOption, AuditTrailPort>`, where its error was `never`.

## Alternatives considered

- **A defect at construction, as BEH-QD-166 makes a cache bound.** Rejected. A `decisionCacheLayer`'s `capacity` is a
  constant the caller wrote in code, so a bad one is a programming error. These options are deployment configuration,
  often read from the environment, so a composition must be able to report a bad one; a defect would end the process with
  no way for the caller to say which value was wrong. (BEH-QD-166 is in `spec/behaviors/21-decision-cache.md`.)
- **Refuse `Duration.infinity` for `storeCallTimeout` too.** Rejected: [BEH-QD-379](../behaviors/33-audit-pipeline.md#beh-qd-379-a-store-call-is-bounded-by-the-sinks-deadline)'s
  MUST and the documented opt-out. Only zero, a negative, `NaN`, `-Infinity` and a malformed value become refusals.
- **Validate in the sink only.** Rejected: a breaker built anywhere else would be unchecked, and the breaker is where
  the threshold and the cooldown are used.
- **A `Claim` carrying a generation.** Rejected: stricter than the base. A claim acts on the current state, as it did.
- **A shared helper over the five bodies.** Rejected: it leaves five places that call it and restate the increment.
- **A `switch` in `step`.** Rejected: `SWITCH_BUDGET` ([AGENTS.md](../../AGENTS.md) §5a) is an exact list, and `step`
  runs on a path where the hoisted `Match.type` is the house form.
- **`step` in the barrel.** Rejected by [ADR-QD-099](./099-entry-points-are-a-closed-list.md): out of the barrel means
  not importable, and the rules stay free to change.

## Consequences

- **Breaking** for `@qadi/audit` (minor). The layer's error channel is `InvalidAuditSinkOption` where it was `never`. A
  zero, negative, non-finite, fractional or malformed option once accepted is refused. A composition passing no option, or
  valid ones, behaves as before; code that annotates the layer, or an `Effect` that provides it, with an error of `never`
  must widen it.
- **Unchanged.** A breaker's status, its announcements and `transitionsTotal`, and every existing breaker test.
- **`Duration.zero` for `storeCallTimeout` is refused**, amending ADR-QD-126: the pinned zero behaviour no longer
  happens. `Duration.infinity` still means no deadline.
- **ADR-QD-056's quote of the old layer type is history.** [ADR-QD-056](./056-audit-companion-package.md) quotes
  `Layer.Layer<DecisionSink, never, AuditTrailPort>` and is left as written; this decision records the change.
- `resetTimeoutMs` keeps its name. Mutation is measured on `CircuitBreaker.ts` and `AuditDecisionSinkLive.ts`. No
  house-style budget changes.

## Related

- [ADR-QD-126](./126-an-audit-store-call-has-a-deadline.md), which this amends
- [ADR-QD-056](./056-audit-companion-package.md)
- [ADR-QD-099](./099-entry-points-are-a-closed-list.md)
- [ADR-QD-044](./044-an-optional-decision-sink.md)
- [BEH-QD-251](../behaviors/33-audit-pipeline.md#beh-qd-251-a-tripped-circuit-breaker-skips-the-write-not-the-stage-and-its-transitions-are-atomic-under-concurrency), [BEH-QD-379](../behaviors/33-audit-pipeline.md#beh-qd-379-a-store-call-is-bounded-by-the-sinks-deadline)
- [BEH-QD-561](../behaviors/33-audit-pipeline.md#beh-qd-561-a-breaker-or-audit-sink-option-that-cannot-work-is-refused-when-it-is-built)
- [INV-QD-052](../invariants.md#inv-qd-052-once-a-circuit-breaker-trips-write-is-never-attempted-again-until-reset)
- [INV-QD-335](../invariants.md#inv-qd-335-a-circuit-breakers-generation-increments-exactly-when-its-status-changes)
- BEH-QD-166 (`spec/behaviors/21-decision-cache.md`), the contrast
