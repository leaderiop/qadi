# Phase 45: The audit circuit breaker as one transition function - Context

**Gathered:** 2026-11-15
**Status:** Ready for planning

<domain>
## Phase Boundary

Every generation and probe rule of the audit circuit breaker (`packages/audit/src/CircuitBreaker.ts`) moves into one pure
transition function, tested without fibers or a clock. A breaker, or an audit sink, whose options cannot work is refused
when it is built rather than silently never opening.

Today:
- five separate `Ref.modify` bodies (`observe`, `recordSuccess`, `recordFailure`, `claimProbe`, `releaseProbe`) each
  restate the stale-generation check, the bump (`generation + 1` appears eight times), the state rebuild and the
  announcement decision;
- `Match.value(state)` is rebuilt on every call (AGENTS.md §5a prefers a module-scope matcher);
- `AuditDecisionSinkLive.ts:127` passes `failureThreshold`/`resetTimeoutMs` through unchecked, so
  `failureThreshold: NaN` builds a breaker that never opens (`consecutiveFailures >= NaN` is always false).

History to keep: commit `9b2ca5d8` (a probe claim not released on abnormal exit), issue #72 (claim/release atomicity),
ticket #38/H4, ticket #46, and the regression tests at `CircuitBreaker.test.ts:339, 403, 426, 452`.

Records: ARCH-92; ADR-QD-158; CCR-QD-436; BEH-QD-561..565 and INV-QD-335..336 are reserved (use only what is needed;
name unused ids in the CCR row). Requirements: BRKR-01..05, plus WX-01..07.

Read first:
- `.planning/phases/_SHARED-CONTEXT.md`, `.planning/phases/_WAVE10-CONTEXT.md`
- the Phase 45 section of `.planning/ROADMAP.md`
- `spec/behaviors/33-audit-pipeline.md` (BEH-QD-249, 251, 379), `spec/invariants.md` (INV-QD-052)
- `spec/behaviors/21-decision-cache.md` BEH-QD-166 and `packages/core/src/Errors.ts` `InvalidBoundedPermits` (the two
  existing refusal styles)

</domain>

<decisions>
## Implementation Decisions

### The transition function's shape (accepted 2026-11-15)
- **D-01: `step` lives in `CircuitBreaker.ts`**, beside the state classes. The module is already package-private
  (ADR-QD-099); tests import it from `src`. Nothing is added to the barrel for it.
- **D-02: Generations on events.** Success, Failure and Release carry the generation their permit was admitted under.
  Observe and Claim act on the current state, exactly as today, so behaviour is identical (no stricter Claim).
- **D-03: `step` returns `{ next, announced }`**, `announced` being the new status or nothing. Each event's reply is
  read from `next`: Observe → `[next._tag, next.generation]`; a Claim is won exactly when the state changed.
- **D-04: `generation + 1` is written once.** Each arm returns a target (stay / Open / HalfOpen / Closed); one
  `enter(state, target, now)` builds the new state with `generation + 1`, so "announced iff status changed" holds by
  construction. (A Closed→Closed reset of `consecutiveFailures` and a HalfOpen claim are same-status updates: no bump,
  no announcement, exactly as today.)

### Option validation (accepted 2026-11-15)
- **D-05: Typed, not a defect.** A refused option is a typed error, as BRKR-03 says. The audit sink's thresholds are
  deployment configuration (often read from the environment), so a composition can report a bad one. The layer becomes
  `Layer<DecisionSink, InvalidAuditSinkOption, AuditTrailPort>`. ADR-QD-158 records why this differs from BEH-QD-166
  (a bound written as a constant in code is a defect there).
- **D-06: All three duration/count options are checked.** `failureThreshold`: a positive integer (NaN, ±Infinity, 0,
  negative, non-integer refused). `resetTimeoutMs`: finite, positive, whole milliseconds. `storeCallTimeout`: positive
  (NaN, zero, negative, `-Infinity` and a malformed string are refused; zero is refused — see D-14).
- **D-06a (amended 2026-11-15 after research): `Duration.infinity` stays accepted for `storeCallTimeout`** and means
  "no deadline", as BEH-QD-379 requires (`spec/behaviors/33-audit-pipeline.md:304-305`, `AuditSinkDeadline.test.ts:277`,
  ADR-QD-126, README, website). The user chose to keep the documented opt-out over the literal "finite" rule. The
  validators check the *decoded* duration (`Duration.millis(NaN)` decodes to zero) and report the raw input.
- **D-07: Where.** `makeCircuitBreaker` validates its own two options, so every breaker is valid by construction; the
  sink validates `storeCallTimeout`. Both use one error class.
- **D-08: `InvalidAuditSinkOption`**, a `Data.TaggedError` with `{ option: "failureThreshold" | "resetTimeoutMs" |
  "storeCallTimeout"; received }` (closed union; the planner picks `received`'s type — no `Record<string, unknown>`,
  no `any`). Exported from the `@qadi/audit` barrel (it is in the layer's type), with a `spec/overview.md` row
  (gate 13). Not a `Schema.TaggedError` (crosses no codec; `SCHEMA_ERROR_BUDGET` unchanged).

### The adapter and the tests (accepted 2026-11-15)
- **D-09: One `run(event)`.** `Clock.currentTimeMillis`, one `Ref.modify(ref, s => step(s, event, now))`, then announce
  if `announced` is set. Every event reads the clock (harmless; one path). `observe`, `recordSuccess`, `recordFailure`,
  `claimProbe` and `releaseProbe` become one-line uses of `run` (or disappear). Exactly one `Ref.modify` per event
  (INV-QD-052 kept). `admit`, `withPermit`, `attempt`'s settle-once `Ref` and the release finalizer keep their shape.
- **D-10: Hoisted matchers (§5a).** One module-scope `Match.type<Event>()` … `Match.tagsExhaustive` whose arms return a
  function of `(state, now, rules)`, and per-state choices through a second hoisted `Match.type<State>()`. No
  `Match.value` per event, no `switch` (`SWITCH_BUDGET` unchanged).
- **D-11: `step(rules)(state, event, now)`**, curried once over the validated options when the breaker is built. Tests
  build their rules inline.
- **D-12: Tests.** A new `packages/audit/test/CircuitBreakerTransition.test.ts` with plain `it` (no fibers, no
  `TestClock`): one table row for every legal transition, plus a stale generation, a release stealing a newer claim, and
  a stale failure reopening a newer window; plus one seeded fast-check property over random event sequences (the
  generation never decreases; it increments exactly when the status changes; `announced` equals the new status exactly
  when it changed; at most one probe is claimed per window). The regression tests at `CircuitBreaker.test.ts:339, 403,
  426, 452` stay unedited and green, and the breaker's metrics and announcements are unchanged.

### Proof and records (accepted 2026-11-15)
- **D-13: On the phase base, before any `src` edit:** a per-file Stryker base for `CircuitBreaker.ts` and
  `AuditDecisionSinkLive.ts` (`pnpm exec stryker run stryker.audit.mjs --mutate '…'`), committed alone; the transition
  table/property written against the base's observable behaviour (through the adapter, green on the base); and the
  bad-option rows, RED on the base (the `NaN` threshold row shows the breaker never opening). RED output recorded in the
  SUMMARY.
- **D-14: Records.** ADR-QD-158 ("The breaker's rules are one transition function"; records D-05's reasoning against
  BEH-QD-166). BEH-QD-251 amended (one transition function; announcements unchanged). BEH-QD-561 new (a bad option is
  refused at construction, one row per bad value). BEH-QD-379's "`Duration.zero` is pinned" paragraph becomes a refusal
  (a consequence of D-06). INV-QD-335: the generation increments exactly when the status changes, written once.
  INV-QD-052 kept. CCR-QD-436 row in `spec/README.md`, `spec/decisions/index.yaml`, traceability, the overview row for
  `InvalidAuditSinkOption`, `spec-revise.mjs --date 2026-11-15` bumps.
- **D-15: Changeset `@qadi/audit` minor, marked Breaking** (the layer's error channel goes from `never` to
  `InvalidAuditSinkOption`; a zero, negative or non-finite option once accepted is now refused), plus an
  `apps/website/src/content/docs/docs/reference/upgrading.md` entry. Check `packages/audit/README.md` and
  `apps/website/src/content/docs/docs/packages/audit/capabilities.md` for claims to update.
- **D-16: Plan order.** Evidence → `step` + adapter (one event converted at a time) → option validation → records →
  close (`pnpm check:pr < /dev/null`, Stryker after-run and comparison). Keep off the lines Phase 48 edits
  (`AuditDecisionSinkLive.ts` :78 and :176).

### Claude's Discretion
- Exact type spellings of `Event`, `Target`, `Transition` and `rules`; whether the five named helpers survive as
  one-liners or are inlined into `admit`/the finalizer.

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `CircuitBreaker.ts`: `StateClosed`/`StateOpen`/`StateHalfOpen` (`Data.TaggedClass`), `transitionsTotal`
  (`Metric.frequency`, preregistered words), `announceTransition`.
- `CIRCUIT_BREAKER_STATUSES_BY_STATUS` closed-record idiom (TS2741 on a missing status).
- `InvalidBoundedPermits` (`packages/core/src/Errors.ts:362`) — the typed construction-refusal precedent.
- `fast-check` is already a dev dependency (used in Phase 44).

### Established Patterns
- Hoisted `Match.type<T>().pipe(Match.tagsExhaustive(...))` at module scope (AGENTS.md §5a).
- Construction refusal: `decisionCacheLayer`/`makeDecisionLog` (defect), `…Bounded` (typed).
- Test-first RED on the phase base; per-file Stryker comparison (`_WAVE10-CONTEXT.md`).

### Integration Points
- `AuditDecisionSinkLive.ts:127` builds the breaker; its `Layer` type gains the error.
- Tests constructing the sink/breaker: `CircuitBreaker.test.ts`, `Metrics.test.ts`, `AuditDecisionSinkLive.test.ts`,
  `AuditSinkDeadline.test.ts`, `Agreement.test.ts`, `driveExit.ts`; docs: `packages/audit/README.md`,
  `apps/website/.../packages/audit/capabilities.md`; examples/features that provide `AuditDecisionSinkLive`.

</code_context>

<specifics>
## Specific Ideas

- `generation + 1` scoped grep: written once in the phase's added code (eight at the base).
- One table row per bad option value (NaN, ±Infinity, 0, negative, non-integer for the threshold; the equivalents for
  each duration).

</specifics>

<deferred>
## Deferred Ideas

- Renaming `resetTimeoutMs` (a `Duration.Input` with an `Ms` suffix) — out of scope.

</deferred>
