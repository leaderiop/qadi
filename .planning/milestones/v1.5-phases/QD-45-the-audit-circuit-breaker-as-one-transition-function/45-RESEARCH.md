# Phase 45: The audit circuit breaker as one transition function - Research

**Researched:** 2026-11-15 (branch `arch-wave-10`, HEAD `3c02edd9`)
**Domain:** `@qadi/audit` (`packages/audit/src/CircuitBreaker.ts`, `AuditDecisionSinkLive.ts`), Effect 4.1.2 `Duration`/`Match`/`Data`, fast-check 4.10.2, Stryker 10.1.1, spec records
**Confidence:** HIGH on the transition table, the Duration decoding, the call-site sweep, the type shapes and the records (all read this session; the candidate `step`, its property and the error class were compiled under strict flags and run in a scratch directory outside the repo, no repo file touched). MEDIUM on the Stryker run time (an estimate).

## Summary

The refactor is mechanical and low-risk: the base's five `Ref.modify` bodies collapse to one pure `step(rules)(state, event, now) → { next, announced }`, where every arm answers either a *status to enter* (the generation bumps, in one place) or a *replacement state* (no bump). A prototype of exactly that shape type-checks clean under the repo's strict flags, has `generation + 1` once, no `as`/`!`/`any`/`switch`, and held a 2000-run seeded property ("generation increments exactly when the status changes", "`announced` iff the status changed", "stale events leave the state untouched", "at most one probe claimed per window", "a claim is won iff `next` differs from `state`").

Seven findings change how the planner should write the work, and the first one blocks a decision:

1. **D-06 contradicts a normative MUST and a documented opt-out.** BEH-QD-379 says `Duration.infinity MUST leave the store call unbounded` (`spec/behaviors/33-audit-pipeline.md:304-305`), `AuditSinkDeadline.test.ts:277` pins it, `README.md:104`, `capabilities.md:71,87`, `upgrading.md:354-357` and ADR-QD-126 tell users to use it. D-06 says `storeCallTimeout` must be "finite and positive", which refuses it. The research cannot resolve this; it is Open Question 1 and needs one user confirmation before the `storeCallTimeout` validator is planned. Both variants are specified below (one flag in one predicate).
2. **`Duration` decodes `NaN` to zero.** `make` maps `isNaN(input) || input === 0 || Object.is(input, -0)` to a zero Millis value (`Duration.ts:465`), so after decoding a `NaN` is indistinguishable from `0`. Positivity checked on the *decoded* `Duration` refuses it (as zero), but the error's `received` must be the *raw* input. Today `resetTimeoutMs: NaN` silently becomes `0` (the breaker flaps `Open`→`HalfOpen`→`Open` on every read) and `storeCallTimeout: NaN` or a negative one fails every store call at once. Only `failureThreshold: NaN` is the "never opens" the roadmap names.
3. **A malformed duration is a defect today.** `Duration.fromInputUnsafe` throws `Invalid Input: nope` (`Duration.ts:385`), which inside the layer's `Effect.gen` is a `Die`. The safe decoder is `Duration.fromInput` (`Option`, `Duration.ts:405`); use it so a bad string is the typed refusal, not a defect.
4. **`received` must be one shape.** `Data.TaggedError("X")<A | B>` does not compile (TS2509, reproduced). Use `{ option: "failureThreshold" | "resetTimeoutMs" | "storeCallTimeout"; received: Duration.Input }`; `number` is already a member of `Duration.Input`.
5. **Match arms that return closures lose contextual typing.** Without return annotations the arms' parameters are implicit `any` (TS7006) and a returned `"Open"` widens to `string` (TS2322). Annotate every arm's return type (`(open): Arm => …`, `(): Move => "Closed"`). Verified by compiling both forms.
6. **Only two test helpers break at type level** when the layer's error channel stops being `never`: `driveExit.ts:95` and `Agreement.test.ts:31-32`. Every other site is generic in `E` (`it.effect`, `it.layer`, `Layer.provide`, `Effect.runPromise`). No example, feature or website fence breaks. Docs that *state* the old type are listed in Q2.
7. **A RED test must not import a symbol that does not exist on the base.** Assert through `Effect.exit` and a `_tag` string so the RED commit still type-checks and the failure is behavioural.

**Primary recommendation:** Plan 1 (first commits, `packages/*/src` untouched): the Stryker base JSON for `CircuitBreaker.ts` and `AuditDecisionSinkLive.ts` alone; an adapter-level transition table plus a bounds-checked bad-option file written against the base (the table green; the option rows RED, recorded). Plan 2: `step` and the adapter, one event converted at a time, the 400 existing audit tests green after every conversion. Plan 3: `InvalidAuditSinkOption`, the checks, the sink's `storeCallTimeout` check, the layer type, test fixes. Plan 4: records, changeset, `upgrading.md`, docs. Plan 5: Stryker comparison and `pnpm check:pr < /dev/null`.

## Architectural Responsibility Map

Single-package library work; the "tiers" are modules.

| Capability | Primary owner | Secondary | Rationale |
|------------|---------------|-----------|-----------|
| Every generation and probe rule (stale check, bump, rebuild, announcement decision) | `CircuitBreaker.ts` `step` (pure) | none | One function, no `Ref`, `Clock` or metric (D-01) |
| One atomic `Ref.modify` per event, clock read, metric announcement | `CircuitBreaker.ts` adapter `run(event)` | `transitionsTotal` (declared once, unchanged) | INV-QD-052 kept (D-09) |
| Admission protocol (observe, claim, re-observe, settle-once, release finalizer) | `CircuitBreaker.ts` `admit` / `withPermit` | none | Unchanged in shape (D-09) |
| Option validity of `failureThreshold` and `resetTimeoutMs` | `makeCircuitBreaker` (every breaker valid by construction) | package-private check module or beside `step` | D-07 |
| Option validity of `storeCallTimeout` | `AuditDecisionSinkLive.ts` (before building `bounded`) | the same checks | D-07 |
| The refusal value | `InvalidAuditSinkOption` in its own barrel-exported module | none | It is in the layer's public type; the breaker module stays package-private (ADR-QD-099), so the class cannot live there |
| The barrel and overview row | `packages/audit/src/index.ts`, `spec/overview.md` | gate 13 | One alphabetical `export *` line, one row |

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| BRKR-01 | One pure `(state, event, now) → (next, announced)` over a closed event union; `generation + 1` once | Q3 table (the rules), Code Examples `step` (compiled; one `generation + 1`) |
| BRKR-02 | Adapter: exactly one `Ref.modify` per event; matchers at module scope | Code Examples `run`; Q5 (hoisted `Match.type` compiles with `Data.TaggedClass`; annotate arms) |
| BRKR-03 | Options refused at construction with a typed error; `NaN` RED on the base | Q1 (decoding table and exact predicates), Q8 (error placement), Q9 (tests that change), Q4 (RED without new imports); **Open Question 1** |
| BRKR-04 | Table-driven pure tests, no fibers or clock | Q4 file layout, Q3 table rows, Q10 property |
| BRKR-05 | The four regression tests unchanged and green | `CircuitBreaker.test.ts:339, 403, 426, 452` read; Q4 (file stays untouched) |
| WX-01 | `pnpm check:pr < /dev/null` green | Validation Architecture |
| WX-02 | Reserved ids only; never `next-id.mjs` | ARCH-92, ADR-QD-158, CCR-QD-436, BEH-QD-561..565, INV-QD-335..336 all confirmed free by `git grep` this session |
| WX-03 | `spec/overview.md` names each added export | One export added: `InvalidAuditSinkOption` (Q6, Q8) |
| WX-04 | No `as`, `!`, `any`, `switch`, `Effect.fnUntraced`, ambient clock | Q8: no budget changes; prototype clean |
| WX-05 | Coverage holds; Stryker not below base | Q7 |
| WX-06 | Characterisation tests precede the change | Q4 |
| WX-07 | Break recorded as **Breaking** | Q6 formats; D-15 |
</phase_requirements>

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**The transition function's shape (accepted 2026-11-15)**
- **D-01: `step` lives in `CircuitBreaker.ts`**, beside the state classes. The module is already package-private (ADR-QD-099); tests import it from `src`. Nothing is added to the barrel for it.
- **D-02: Generations on events.** Success, Failure and Release carry the generation their permit was admitted under. Observe and Claim act on the current state, exactly as today, so behaviour is identical (no stricter Claim).
- **D-03: `step` returns `{ next, announced }`**, `announced` being the new status or nothing. Each event's reply is read from `next`: Observe → `[next._tag, next.generation]`; a Claim is won exactly when the state changed.
- **D-04: `generation + 1` is written once.** Each arm returns a target (stay / Open / HalfOpen / Closed); one `enter(state, target, now)` builds the new state with `generation + 1`, so "announced iff status changed" holds by construction. (A Closed→Closed reset of `consecutiveFailures` and a HalfOpen claim are same-status updates: no bump, no announcement, exactly as today.)

**Option validation (accepted 2026-11-15)**
- **D-05: Typed, not a defect.** A refused option is a typed error, as BRKR-03 says. The audit sink's thresholds are deployment configuration (often read from the environment), so a composition can report a bad one. The layer becomes `Layer<DecisionSink, InvalidAuditSinkOption, AuditTrailPort>`. ADR-QD-158 records why this differs from BEH-QD-166 (a bound written as a constant in code is a defect there).
- **D-06: All three duration/count options are checked.** `failureThreshold`: a positive integer (NaN, ±Infinity, 0, negative, non-integer refused). `resetTimeoutMs`: finite, positive, whole milliseconds. `storeCallTimeout`: finite and positive (a non-finite timeout lets a hung store call hold its record forever; zero is refused — see D-14). The researcher confirms how `Duration.Input` decodes NaN/negative/Infinity in the installed effect and picks the exact checks.
- **D-07: Where.** `makeCircuitBreaker` validates its own two options, so every breaker is valid by construction; the sink validates `storeCallTimeout`. Both use one error class.
- **D-08: `InvalidAuditSinkOption`**, a `Data.TaggedError` with `{ option: "failureThreshold" | "resetTimeoutMs" | "storeCallTimeout"; received }` (closed union; the planner picks `received`'s type — no `Record<string, unknown>`, no `any`). Exported from the `@qadi/audit` barrel (it is in the layer's type), with a `spec/overview.md` row (gate 13). Not a `Schema.TaggedError` (crosses no codec; `SCHEMA_ERROR_BUDGET` unchanged).

**The adapter and the tests (accepted 2026-11-15)**
- **D-09: One `run(event)`.** `Clock.currentTimeMillis`, one `Ref.modify(ref, s => step(s, event, now))`, then announce if `announced` is set. Every event reads the clock (harmless; one path). `observe`, `recordSuccess`, `recordFailure`, `claimProbe` and `releaseProbe` become one-line uses of `run` (or disappear). Exactly one `Ref.modify` per event (INV-QD-052 kept). `admit`, `withPermit`, `attempt`'s settle-once `Ref` and the release finalizer keep their shape.
- **D-10: Hoisted matchers (§5a).** One module-scope `Match.type<Event>()` … `Match.tagsExhaustive` whose arms return a function of `(state, now, rules)`, and per-state choices through a second hoisted `Match.type<State>()`. No `Match.value` per event, no `switch` (`SWITCH_BUDGET` unchanged).
- **D-11: `step(rules)(state, event, now)`**, curried once over the validated options when the breaker is built. Tests build their rules inline.
- **D-12: Tests.** A new `packages/audit/test/CircuitBreakerTransition.test.ts` with plain `it` (no fibers, no `TestClock`): one table row for every legal transition, plus a stale generation, a release stealing a newer claim, and a stale failure reopening a newer window; plus one seeded fast-check property over random event sequences (the generation never decreases; it increments exactly when the status changes; `announced` equals the new status exactly when it changed; at most one probe is claimed per window). The regression tests at `CircuitBreaker.test.ts:339, 403, 426, 452` stay unedited and green, and the breaker's metrics and announcements are unchanged.

**Proof and records (accepted 2026-11-15)**
- **D-13: On the phase base, before any `src` edit:** a per-file Stryker base for `CircuitBreaker.ts` and `AuditDecisionSinkLive.ts` (`pnpm exec stryker run stryker.audit.mjs --mutate '…'`), committed alone; the transition table/property written against the base's observable behaviour (through the adapter, green on the base); and the bad-option rows, RED on the base (the `NaN` threshold row shows the breaker never opening). RED output recorded in the SUMMARY.
- **D-14: Records.** ADR-QD-158 ("The breaker's rules are one transition function"; records D-05's reasoning against BEH-QD-166). BEH-QD-251 amended (one transition function; announcements unchanged). BEH-QD-561 new (a bad option is refused at construction, one row per bad value). BEH-QD-379's "`Duration.zero` is pinned" paragraph becomes a refusal (a consequence of D-06). INV-QD-335: the generation increments exactly when the status changes, written once. INV-QD-052 kept. CCR-QD-436 row in `spec/README.md`, `spec/decisions/index.yaml`, traceability, the overview row for `InvalidAuditSinkOption`, `spec-revise.mjs --date 2026-11-15` bumps.
- **D-15: Changeset `@qadi/audit` minor, marked Breaking** (the layer's error channel goes from `never` to `InvalidAuditSinkOption`; a zero, negative or non-finite option once accepted is now refused), plus an `apps/website/src/content/docs/docs/reference/upgrading.md` entry. Check `packages/audit/README.md` and `apps/website/src/content/docs/docs/packages/audit/capabilities.md` for claims to update.
- **D-16: Plan order.** Evidence → `step` + adapter (one event converted at a time) → option validation → records → close (`pnpm check:pr < /dev/null`, Stryker after-run and comparison). Keep off the lines Phase 48 edits (`AuditDecisionSinkLive.ts` :78 and :176).

### Claude's Discretion
- Exact type spellings of `Event`, `Target`, `Transition` and `rules`; whether the five named helpers survive as one-liners or are inlined into `admit`/the finalizer.

### Deferred Ideas (OUT OF SCOPE)
- Renaming `resetTimeoutMs` (a `Duration.Input` with an `Ms` suffix) — out of scope.
</user_constraints>

## Project Constraints (from CLAUDE.md / AGENTS.md)

- `effect/*` submodule namespace imports (`import * as Match from "effect/Match"`); named imports across `@qadi/*`; `.ts` extensions on relative imports; `import type` for type-only (AGENTS.md section 1).
- No `as`, `as any`, `!`, `any`; `Match` not `switch` for `_tag` dispatch (§5a); every hoisted matcher is `Match.type<T>().pipe(Match.tagsExhaustive(...))` at module scope with the const annotated (`: (self: X) => Y`) (§5a, `Matcher.ts`, `v4-api-smoke.test.ts:91`).
- `Data.TaggedError` for the new error, unprefixed tag (`[no-prefixed-error-tag]`); `Schema.TaggedError` budget (12) unchanged (§4).
- No `Effect.fnUntraced` (`UNTRACED_BUDGET`), no `Date.now`/`new Date`, no `Effect.orDie` in evaluation or enforcement paths (§4, §6). The adapter's inner helpers stay plain arrows over `Effect.gen`, as the base's helpers are, so no new span appears (the tracer test at `AuditDecisionSinkLive.test.ts:775-795` looks up `qadi.audit.record` by name, so a new span would not fail it, but none is wanted).
- Metrics: `transitionsTotal` stays the one declaration (`[metric-declaration]`, `[metric-table]`, INV-QD-259); the adapter calls `Metric.update(transitionsTotal, to)` as `announceTransition` does today.
- Doc-comment shape: one-line summary first, the why after (ADR numbers in later paragraphs).
- `spec/` is normative; ` ```typescript ` fences compile (`check-doc-examples.mjs`, `check-website-doc-examples.mjs`); ` ```ts ` fences do not (AGENTS.md §12).
- Placeholder ids refused (`[no-numbering-placeholder]`); only the reserved numbers; `scripts/next-id.mjs` is never run (it writes reservations).
- `pnpm check` is the only definition of done; `check:pr` skips mutation, so the Stryker comparison is its own plan step.
- Memory: closed unions written out in full (the `option` union, the `Event` union, `received` is one closed type, not widened); prefer the complete design; `Record<string, unknown>` is a hack; never release or merge a version-packages PR.

## Standard Stack

No package is added or changed.

### Core
| Library | Version | Purpose | Why |
|---------|---------|---------|-----|
| `effect` | 4.1.2 [VERIFIED: `node_modules/effect/package.json` line 4 `"version": "4.1.2"`] | `Data.TaggedClass`/`TaggedError`, `Match`, `Duration`, `Ref`, `Clock`, `Metric`, `Equal` | Already the breaker's stack |
| `fast-check` | 4.10.2 [VERIFIED: `pnpm-workspace.yaml` `fast-check: 4.10.2`; `packages/audit/node_modules/fast-check/package.json`] | the seeded property | Existing convention in this package and Phase 44 |
| `vitest` + `@effect/vitest` | 5.1.0 / 4.1.2 [VERIFIED: `node -e require(...).version` this session] | runner | `pnpm exec vitest run --project audit` from the repo root |
| `@stryker-mutator/core` + `vitest-runner` | 10.1.1 [VERIFIED: package versions read this session] | mutation base and comparison | `stryker.audit.mjs` |
| `tstyche` | 7.2.5, target 6.0.3 [VERIFIED: `tstyche.json`] | optional type pin of the layer's error channel | `packages/audit/test/*.tst.ts` |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| One `Match.type<Event>()` whose arms return `(state, now, rules)` closures | A `Record<EventTag, …>` table | The table is cheaper per call, but D-10 locks `Match` (hoisted); the breaker runs about 2 to 3 events per `record()`, not per policy node, so the closure allocation §5a measures is not on a hot path here |
| `Duration.fromInputUnsafe` + `try/catch` | `Duration.fromInput` (`Option`) | The safe decoder is shipped; no catch needed |
| `Data.TaggedEnum` events | `Data.TaggedClass` events | The module already uses `Data.TaggedClass` for states, `Refused`, `Admitted`; stay consistent. `Match.tagsExhaustive` works over the class union (compiled) |
| Discriminated `received` per option | One `received: Duration.Input` | The union form does not compile on `Data.TaggedError` (TS2509); `number` is already inside `Duration.Input` |

**Installation:** none. **Version verification:** versions read from `node_modules`; `node -v` v26.13.0, `pnpm -v` 10.17.1.

## Package Legitimacy Audit

No external package is installed, added or upgraded; the `package-legitimacy` seam was not needed. Every claim is about in-repo code and the installed `effect` source.

**Packages removed due to [SLOP] verdict:** none. **Packages flagged [SUS]:** none.

## Architecture Patterns

### System Architecture Diagram

```
 record(sinkRecord)                                   [AuditDecisionSinkLive.ts]
   │
   │  layer build (once):  checkStoreCallTimeout ──✗──► InvalidAuditSinkOption
   │                       makeCircuitBreaker(options)
   │                         checkFailureThreshold ──✗──► InvalidAuditSinkOption
   │                         checkResetTimeoutMs  ──✗──► InvalidAuditSinkOption
   ▼
 breaker.withPermit(use)                              [CircuitBreaker.ts, package-private]
   │ admit:  run(Observe) ─► (status, generation)
   │         status = HalfOpen ? run(Claim) ─► won? probe : re-run(Observe)
   │         Refused | Admitted{probe, generation, attempt}
   │ attempt(write): Effect.exit(write) ─► settle-once Ref ─► run(Success{g}) | run(Failure{g})
   │ release finalizer (probe && failed exit): run(Release{g})
   ▼
 run(event):  now ← Clock.currentTimeMillis
              Ref.modify(ref, s ⇒ { t = transition(s, event, now); [t, t.next] })     ◄── exactly one modify
              t.announced ≠ undefined ⇒ Metric.update(transitionsTotal, t.announced)
   │
   ▼
 step(rules)(state, event, now) → { next, announced }   [pure; module-scope matchers]
   guard:   Success|Failure|Release whose generation ≠ state.generation ⇒ unchanged
   decide:  event ─► per-state arm ─► Move = a status to enter | the replacement state
   enter:   status ─► new state, generation + 1 (the one bump); announced = that status
```

### Recommended Project Structure
```
packages/audit/src/
├── CircuitBreaker.ts            # + step, Event classes, Rules, ENTER table, run adapter (edited)
├── InvalidAuditSinkOption.ts    # new, barrel-exported: the error class only
├── SinkOptionChecks.ts          # new, package-private (not in the barrel): the three checks
├── AuditDecisionSinkLive.ts     # edited at :109-129 and :137 only; not :78, not :176
└── index.ts                     # + export * from "./InvalidAuditSinkOption.ts" (between AuditWriteOutcome and Retention)
packages/audit/test/
├── CircuitBreaker.test.ts       # UNCHANGED (D-12, BRKR-05); its 150-run model property stays the adapter oracle
├── CircuitBreakerTable.test.ts  # new, plan 1: adapter-level table, green on the base
├── CircuitBreakerOptions.test.ts# new, plan 1: bad-option rows, RED on the base (runtime-only assertions)
└── CircuitBreakerTransition.test.ts # new, plan 2: pure step table + seeded property, plain `it`
```
The checks need a package-private home because a barrel `export *` re-exports everything a module exports, so putting the validators in `InvalidAuditSinkOption.ts` would publish them (AGENTS.md section 9). Splitting them out, or placing the two breaker checks beside `step` and the one sink check in `AuditDecisionSinkLive.ts`, are both acceptable; the plan picks one. [ASSUMED: file names are a suggestion]

### Pattern 1: One bump, one announcement (the whole point)
**What:** each arm answers a `Move`, a closed type that is either a `CircuitBreakerStatus` (enter it: bump) or a `State` (replace: no bump). `step` is the only place a generation is incremented and the only place `announced` is set, so "announced iff the status changed" and "the generation increments exactly when the status changes" hold by construction (INV-QD-335).
**Source:** compiled and run in scratch this session; see Code Examples.

### Pattern 2: The stale check, once
`Success`, `Failure` and `Release` carry the generation their permit was admitted under; `step` compares it with `state.generation` once, before any arm runs, via one hoisted `admittedUnder` matcher (D-02). The base restates it three times (`CircuitBreaker.ts:288`, `:316`, `:374`).

### Anti-Patterns to Avoid
- **`Match.value(state)` per call** (the base at `CircuitBreaker.ts:247, 290, 318`): rebuilt each call, which §5a prefers to avoid.
- **`typeof move === "string"` replaced by a tag on `Move`:** unnecessary; the two members are a string literal union and a class union, disjoint by `typeof`.
- **Writing the literal `generation + 1` in a comment or doc line the phase adds:** the scoped grep counts added lines, comments included. Say "the one bump" instead.
- **Detecting a claim win by reference alone:** `Success` on `Closed` returns a fresh equal object, so reference identity is fragile outside `Claim`. Use `Equal.equals(next, state)` (structural, `Data.TaggedClass` implements `Equal`) or the explicit `claimed` comparison for the Claim reply.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Safe duration decoding | `try { Duration.fromInputUnsafe } catch` | `Duration.fromInput` (`Option`) | `Duration.ts:405` ships it; no catch, no defect |
| Finite / positive duration | custom arithmetic on the millis number | `Duration.isFinite`, `Duration.isPositive` | `Duration.ts:516`, `:594`; they read the tagged representation, not a lossy number |
| Whole-millisecond test | a modulus | `Number.isInteger(Duration.toMillis(d))` | sub-millisecond nanos give a fractional millis (`1500000n` nanos is `1.5`) |
| Structural "did the state change" | field-by-field compare | `Equal.equals` (`effect/Equal`) | `Data.TaggedClass` is `Equal` |
| Random event sequences | hand-rolled loops | `FastCheck.assert(FastCheck.property(...), { numRuns, seed })` | house convention |
| A broken port in a test | a hand-built failing layer | n/a here | this phase builds no port double; `PORT_DOUBLE_BUDGET` / `AUDIT_HAND_LAYER_BUDGET` are untouched, and tests keep using `AuditTrailPortTest` |

**Key insight:** the base is correct; the work is relocation. Almost no new logic is invented, so the mutation score and the existing 150-run model property are the equivalence proof, not new reasoning.

## Runtime State Inventory

Not a rename or migration phase; omitted. (The only persisted artefact that mentions the layer's type is documentation; the breaker holds in-process `Ref` state only, so there is no stored data, live service config, OS registration, secret or build artefact to migrate. Stale `.stryker-tmp/sandbox-FbYuh2` and `reports/mutation-audit/mutation.json` (1 file, 17 mutants, dated 2026-11-14) exist on disk and are gitignored; they are not evidence for this phase, and the baseline writer must refuse a stale report by mtime as 44's did.)

## Common Pitfalls

### Pitfall 1: `NaN` is zero after decoding
**What goes wrong:** a validator that decodes first and tests `millis > 0` reports `received: 0` for a `NaN` input, or accepts a stored `NaN` as "decoded fine".
**Why:** `Duration.millis(NaN)` is the zero duration (`Duration.ts:465`).
**How to avoid:** keep the raw input, decode with `Duration.fromInput`, test the decoded value for finite and positive, and put the *raw* input in `received`.
**Warning signs:** a refusal row for `NaN` whose `received` prints `0`.

### Pitfall 2: Arms that return functions lose contextual typing
**What goes wrong:** `Closed: (closed) => (now, rules) => …` compiles to implicit-`any` errors, and a bare `"Open"` widens to `string` so the arm no longer matches `Move`.
**How to avoid:** annotate each arm's return type with the named alias (`(closed): Arm => () => closed`, `(): Move => "Closed"`). Verified in scratch: the unannotated form produced TS7006 and TS2322, the annotated form compiled clean.

### Pitfall 3: RED commit that does not type-check
**What goes wrong:** the bad-option rows import `InvalidAuditSinkOption`, which does not exist on the base, so `pnpm typecheck` fails on the RED commit for the wrong reason.
**How to avoid:** assert at runtime only: `Effect.exit(makeCircuitBreaker({ failureThreshold: NaN, resetTimeoutMs: 10_000 }))` must be a failure whose squashed cause has `_tag` `"InvalidAuditSinkOption"`. On the base the breaker builds, the exit is a success, and the row fails with a behavioural message. After the fix, tighten to the class in the fixing task.

### Pitfall 4: The base's "bad option" behaviours differ, so the RED rows must not all say "never opens"
Measured from the base source: `failureThreshold` `NaN` or `Infinity`: never opens (`consecutiveFailures >= NaN` is false, `>= Infinity` is false); `0`, a negative or `-Infinity`: opens on the first failure (as `1`); `2.5`: opens on the third. `resetTimeoutMs` `NaN`, `0`, negative: the cooldown is `<= 0` so every read flips `Open`→`HalfOpen`→`Open` (the comparison `now - openedAt < resetTimeoutMillis` is never true); `Infinity`: never leaves `Open`. [VERIFIED: `CircuitBreaker.ts:225,255,262,331` read this session]. Only the `NaN` and `Infinity` threshold rows show "never opens"; the SUMMARY should record each row's base behaviour honestly.

### Pitfall 5: Scoped greps count comments and docs
`generation + 1` scoped to `git diff <base> -U0 -- packages/audit/src | /usr/bin/grep '^+'` must be exactly 1. A doc comment quoting the phrase makes it 2. Also write the grep as `/usr/bin/grep -F 'generation + 1'` (zsh `grep` is ugrep).

### Pitfall 6: The zero test and the infinity test change with the fix
`AuditSinkDeadline.test.ts:292-305` (`Duration.zero`) and `:277-290` (`Duration.infinity`) must be changed in the same commit as the validator, or the suite is red at that commit. See Q9 and Open Question 1.

### Pitfall 7: `Observe` reads the clock even for `Closed`
The base's `observe` already reads the clock for every call, so D-09's "every event reads the clock" changes nothing observable for `Observe`; for `Success` and `Claim` it adds a harmless read. `TestClock` makes the read deterministic. No test counts clock reads (grep of `packages/audit/test` for `currentTimeMillis` finds only `CircuitBreaker.test.ts`'s model setup).

### Pitfall 8: A `Layer.mergeAll`-style assumption that the error channel stays `never`
Anything that `yield*`s a provided sink inside an `Effect<…>` annotated with `E = never` breaks; the two sites are in Q2. After the change, `Effect.runPromise` and `it.effect` are unaffected.

## Code Examples

Compiled under strict flags (`strict`, `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`, `noUnusedLocals`, `noUnusedParameters`, `verbatimModuleSyntax`, bundler resolution) in a scratch directory against the repo's `effect@4.1.2`, and run. The states are the base's classes unchanged.

### `step` (the whole function; one `generation + 1`)
```typescript
// Source: scratch prototype, compiled and run against effect 4.1.2 this session (not committed)
import * as Data from "effect/Data";
import * as Match from "effect/Match";

export type CircuitBreakerStatus = "Closed" | "Open" | "HalfOpen";
// StateClosed / StateOpen / StateHalfOpen: the base's three Data.TaggedClass states, unchanged.

export class Observe extends Data.TaggedClass("Observe")<Record<never, never>> {}
export class Success extends Data.TaggedClass("Success")<{ readonly generation: number }> {}
export class Failure extends Data.TaggedClass("Failure")<{ readonly generation: number }> {}
export class Claim extends Data.TaggedClass("Claim")<Record<never, never>> {}
export class Release extends Data.TaggedClass("Release")<{ readonly generation: number }> {}
export type Event = Observe | Success | Failure | Claim | Release;

export interface Rules {
  readonly failureThreshold: number;
  readonly resetTimeoutMillis: number;
}
export interface Transition {
  readonly next: State;
  readonly announced: CircuitBreakerStatus | undefined;
}

/** A status to enter (the generation bumps) or the state that replaces this one (it does not). */
type Move = CircuitBreakerStatus | State;
type Arm = (now: number, rules: Rules) => Move;
type Decide = (state: State, now: number, rules: Rules) => Move;

// A closed Record: a fourth status is TS2741 here, as in CIRCUIT_BREAKER_STATUSES_BY_STATUS.
const ENTER: Record<CircuitBreakerStatus, (generation: number, now: number) => State> = {
  Closed: (generation) => new StateClosed({ generation, consecutiveFailures: 0 }),
  HalfOpen: (generation, now) => new StateHalfOpen({ generation, halfOpenAt: now, probeClaimed: false }),
  Open: (generation, now) => new StateOpen({ generation, openedAt: now }),
};

const observeState: (state: State) => Arm = Match.type<State>().pipe(
  Match.tagsExhaustive({
    Closed: (closed): Arm => () => closed,
    HalfOpen: (halfOpen): Arm => (now, rules) =>
      now - halfOpen.halfOpenAt < rules.resetTimeoutMillis ? halfOpen : "Open",
    Open: (open): Arm => (now, rules) => (now - open.openedAt < rules.resetTimeoutMillis ? open : "HalfOpen"),
  }),
);
const successState: (state: State) => Move = Match.type<State>().pipe(
  Match.tagsExhaustive({
    Closed: (closed): Move => new StateClosed({ generation: closed.generation, consecutiveFailures: 0 }),
    HalfOpen: (): Move => "Closed",
    Open: (open): Move => open,
  }),
);
const failureState: (state: State) => (rules: Rules) => Move = Match.type<State>().pipe(
  Match.tagsExhaustive({
    Open: (open): ((rules: Rules) => Move) => () => open,
    HalfOpen: (): ((rules: Rules) => Move) => () => "Open",
    Closed: (closed): ((rules: Rules) => Move) => (rules) => {
      const consecutiveFailures = closed.consecutiveFailures + 1;
      return consecutiveFailures >= rules.failureThreshold
        ? "Open"
        : new StateClosed({ generation: closed.generation, consecutiveFailures });
    },
  }),
);
const claimState: (state: State) => Move = Match.type<State>().pipe(
  Match.tagsExhaustive({
    Closed: (closed): Move => closed,
    Open: (open): Move => open,
    HalfOpen: (halfOpen): Move =>
      halfOpen.probeClaimed
        ? halfOpen
        : new StateHalfOpen({ generation: halfOpen.generation, halfOpenAt: halfOpen.halfOpenAt, probeClaimed: true }),
  }),
);
const releaseState: (state: State) => Move = Match.type<State>().pipe(
  Match.tagsExhaustive({
    Closed: (closed): Move => closed,
    Open: (open): Move => open,
    HalfOpen: (halfOpen): Move => (halfOpen.probeClaimed ? "Open" : halfOpen),
  }),
);

const decide: (event: Event) => Decide = Match.type<Event>().pipe(
  Match.tagsExhaustive({
    Observe: (): Decide => (state, now, rules) => observeState(state)(now, rules),
    Success: (): Decide => (state) => successState(state),
    Failure: (): Decide => (state, _now, rules) => failureState(state)(rules),
    Claim: (): Decide => (state) => claimState(state),
    Release: (): Decide => (state) => releaseState(state),
  }),
);

/** The generation an event was admitted under; `undefined` for an event that acts on the current state. */
const admittedUnder: (event: Event) => number | undefined = Match.type<Event>().pipe(
  Match.tagsExhaustive({
    Observe: () => undefined,
    Claim: () => undefined,
    Success: (e) => e.generation,
    Failure: (e) => e.generation,
    Release: (e) => e.generation,
  }),
);

export const step =
  (rules: Rules) =>
  (state: State, event: Event, now: number): Transition => {
    const admitted = admittedUnder(event);
    if (admitted !== undefined && admitted !== state.generation) return { next: state, announced: undefined };
    const move = decide(event)(state, now, rules);
    return typeof move === "string"
      ? { next: ENTER[move](state.generation + 1, now), announced: move }
      : { next: move, announced: undefined };
  };
```

### The adapter (one `Ref.modify` per event; sketch, not compiled against the repo)
```typescript
// Inside makeCircuitBreaker, after validation and `const transition = step({ failureThreshold, resetTimeoutMillis })`.
const run = (event: Event): Effect.Effect<{ readonly before: State; readonly t: Transition }> =>
  Effect.gen(function* () {
    const now = yield* Clock.currentTimeMillis;
    const taken = yield* Ref.modify(ref, (before) => {
      const t = transition(before, event, now);
      return [{ before, t }, t.next] as const; // see note: the base uses an annotated tuple, not `as const`
    });
    if (taken.t.announced !== undefined) yield* announceTransition(taken.t.announced);
    return taken;
  });
```
Note: house style forbids `as`; `as const` is a const assertion and appears in tests, but the base's own idiom is an annotated return type (`(state): Observation => …`, `CircuitBreaker.ts:246`). Annotate the callback's return type instead. The replies: `observe` reads `[next._tag, next.generation]`; `claimProbe` is `won = !Equal.equals(before, t.next)` then `t.next.generation`; `recordSuccess`/`recordFailure`/`releaseProbe` discard the reply. [ASSUMED: the adapter sketch was not compiled; `step` was]

### The typed error (compiled)
```typescript
// Source: scratch prototype, compiled against effect 4.1.2 (the union-of-fields form fails with TS2509)
import * as Data from "effect/Data";
import type * as Duration from "effect/Duration";

export class InvalidAuditSinkOption extends Data.TaggedError("InvalidAuditSinkOption")<{
  readonly option: "failureThreshold" | "resetTimeoutMs" | "storeCallTimeout";
  readonly received: Duration.Input;
}> {}
```
`message` is the empty string by default (printed `(empty message)` in scratch); add a `message` getter so a thrown or logged refusal names the option and the value.

### The checks (compiled; `storeCallTimeout` variants in Q1)
```typescript
export const checkFailureThreshold = (received: number): Effect.Effect<number, InvalidAuditSinkOption> =>
  Number.isInteger(received) && received > 0
    ? Effect.succeed(received)
    : Effect.fail(new InvalidAuditSinkOption({ option: "failureThreshold", received }));

export const checkResetTimeoutMs = (received: Duration.Input): Effect.Effect<number, InvalidAuditSinkOption> => {
  const millis = Option.filter(Duration.fromInput(received), (d) => Duration.isFinite(d) && Duration.isPositive(d)).pipe(
    Option.map(Duration.toMillis),
    Option.filter(Number.isInteger),
  );
  return Option.isSome(millis)
    ? Effect.succeed(millis.value)
    : Effect.fail(new InvalidAuditSinkOption({ option: "resetTimeoutMs", received }));
};
```

## Findings by Question

### Q1. `Duration.Input` decoding in the installed effect [VERIFIED: `node_modules/effect/src/Duration.ts` lines cited; every row below was run through `fromInputUnsafe`, `toMillis`, `isFinite`, `isPositive`, `isZero` and `fromInput` against `node_modules/effect/dist/Duration.js`]

The decode is `fromInputUnsafe` (`Duration.ts:275-361`); `number` goes to `millis(input)` which is `make(millis)` (`:764`); `make` (`:462-480`) contains the line `if (isNaN(input) || input === 0 || Object.is(input, -0)) {` assigning the zero Millis value, then `else if (!Number.isFinite(input))` to the two infinities, then `else if (!Number.isInteger(input))` to `{ _tag: "Nanos", nanos: roundMillisToNanos(input) }`. A bad string reaches `invalid(input)` which throws (`const invalid = (input: unknown): never => { throw new Error(`Invalid Input: ${input}`) }`, `:384-386`). `fromInput` is `Option.liftThrowable(fromInputUnsafe)` (`:405-407`).

| Input | decoded `value` | `toMillis` | `isFinite` | `isPositive` | `fromInput` |
|-------|-----------------|-----------|-----------|-------------|------------|
| `NaN` | `Millis 0` | 0 | true | **false** | some |
| `-5` | `Millis -5` | -5 | true | false | some |
| `Infinity` | `Infinity` | Infinity | **false** | true | some |
| `-Infinity` | `NegativeInfinity` | -Infinity | false | false | some |
| `0`, `-0`, `Duration.zero`, `"0 millis"`, `{}` | `Millis 0` | 0 | true | false | some |
| `1.5` / `"1.5 millis"` | `Nanos 1500000n` | 1.5 | true | true | some |
| `0.0000001` | `Nanos 0n` (rounds to zero) | 0 | true | false | some |
| `1n` nanos | `Nanos 1n` | 0.000001 | true | true | some |
| `2000000n` nanos | `Nanos 2000000n` | 2 | true | true | some |
| a huge bigint | `Nanos …` | 1.23e23 | true | true | some |
| `"1 second"` | `Millis 1000` | 1000 | true | true | some |
| `"0.5 seconds"` | `Millis 500` | 500 | true | true | some |
| `"-1 second"` | `Millis -1000` | -1000 | true | false | some |
| `"Infinity"`, `Duration.infinity` | `Infinity` | Infinity | false | true | some |
| `"-Infinity"` | `NegativeInfinity` | -Infinity | false | false | some |
| `"nope"`, `"NaN seconds"`, `[1]`, `null`, `undefined` | throws `Invalid Input: …` | throws | n/a | n/a | **none** |

**The exact checks.**
- `failureThreshold` (a plain `number`, not a `Duration`): `Number.isInteger(n) && n > 0`. Refuses `NaN`, `±Infinity`, `0`, negatives and fractions (`Number.isInteger(Infinity)` is false).
- `resetTimeoutMs`: `Duration.fromInput(input)` is `some`, then `Duration.isFinite(d) && Duration.isPositive(d)`, then `Number.isInteger(Duration.toMillis(d))`. Refuses `NaN` (decoded to zero, not positive), `±Infinity`, zero, negatives, `1.5`, `1n` nanos and a malformed string; accepts `10_000`, `"10 seconds"`, `Duration.millis(5)`, `2000000n` nanos.
- `storeCallTimeout`, **variant A (D-06 literal)**: `fromInput` some, `isFinite && isPositive`. Refuses `NaN`, `0`, negatives, `-Infinity`, **and `Duration.infinity`/`"Infinity"`**. Fractions and sub-millisecond positive durations are accepted (no whole-ms rule in D-06).
- `storeCallTimeout`, **variant B (keeps the documented opt-out)**: `fromInput` some, `isPositive` only (`isPositive(Infinity)` is true), which still refuses `NaN`, `0`, negatives and `-Infinity`.

**What the sink throws today.** `AuditDecisionSinkLive.ts:137` is `const storeCallTimeout = Duration.fromInputUnsafe(options?.storeCallTimeout ?? DEFAULT_STORE_CALL_TIMEOUT);` inside the layer's `Effect.gen`. A malformed value throws and the layer fails with a `Die` carrying `Error: Invalid Input: nope` (run: `Failure [ 'Die:Error: Invalid Input: nope' ]`). A `NaN`, zero or negative value does not throw: `Effect.timeoutOrElse` with that duration times out at once (run: `NaN` settled `Failure` in 2 ms; `-5` against a 20 ms sleep ended `Fail "timed-out"`), which is the pinned `Duration.zero` behaviour in BEH-QD-379. `makeCircuitBreaker` calls `Duration.toMillis(options.resetTimeoutMs)` (`:225`), which throws the same way for a malformed value.

### Q2. Every call site of `AuditDecisionSinkLive(` and `makeCircuitBreaker(` [VERIFIED: `git grep` this session over packages, examples, features, apps, spec, scripts, README]

`examples/` and `features/` contain no call (`features` only depends on `@qadi/audit` for signature steps). No file under `packages/*/src` other than `AuditDecisionSinkLive.ts:126` calls `makeCircuitBreaker`.

**Break at type level (error channel `never` to `InvalidAuditSinkOption`):**
| File:line | Why it breaks | Minimal fix |
|-----------|---------------|-------------|
| `packages/audit/test/driveExit.ts:95` `export const driveExit = (spec: ExitSpec): Effect.Effect<ExitObservation> =>` | the body ends `.pipe(Effect.provide(sinkLayer))` with `sinkLayer` over `AuditDecisionSinkLive({...})`; `E = never` no longer holds | widen the annotation to `Effect.Effect<ExitObservation, InvalidAuditSinkOption>` (import the type from `../src/index.ts`). Its consumer `AuditWriteExits.test.ts:151` is `yield* driveExit(...)` inside `it.effect`, generic in `E` |
| `packages/audit/test/Agreement.test.ts:31-32` `): Effect.Effect<ReadonlyArray<{ … }>> =>` (`runPipeline`) | `Effect.provide(Layer.provideMerge(AuditDecisionSinkLive(), trail))` at `:40` | widen the annotation the same way; its callers are inside `it.effect` |

[Inferred by reading the signatures; not compiled, because compiling needs a `src` edit. The `it.effect` tester is generic in `E`: `readonly effect: Vitest.Tester<R | Scope.Scope, ExtraContext>` with `TestFunction<A, E, R, TestArgs>` returning `Effect.Effect<A, E, R>`, `@effect/vitest/src/index.ts:45-47, 140`, and `it.layer` is `<R2, E>(layer: Layer.Layer<R2, E, R>, …)` at `:145`.]

**Unaffected (generic in `E`):** `Metrics.test.ts` (8 sites, all `Effect.provide(Layer.provideMerge(AuditDecisionSinkLive(), …))` inside `it.effect`), `AuditDecisionSinkLive.test.ts` (about 40 sites, same shape), `AuditSinkDeadline.test.ts:67,83` (`sinkOver` has an inferred return; `Layer.provide(AuditDecisionSinkLive(...), ports)`), `CircuitBreaker.test.ts` (31 `yield* makeCircuitBreaker(...)` inside `it.effect`; the property at `:634` is inside `isolatedMetrics`, generic `<A, E, R>`, `packages/testing/src/IsolatedMetrics.ts:23`), `scripts/check-package-install.mjs:524` (`Effect.provide(AuditDecisionSinkLive())` then `Effect.runPromise`; defaults are valid, `E` is accepted), `spec/behaviors/33-audit-pipeline.md:317` and `:852` (` ```typescript ` fences that end `void sink` / `void program`), `packages/audit/README.md:23,103,104`, `apps/website/.../capabilities.md:17,82,87,199` (fences that only construct and `.pipe(Layer.provide…)`).

**Docs that state the old type and must change (not type errors):** `packages/audit/src/AuditDecisionSinkLive.ts:109` (the doc comment) and `:120`; `spec/behaviors/33-audit-pipeline.md:35` (a ` ```ts ` signature fence, not compiled, so it needs a hand edit); `apps/website/src/content/docs/docs/packages/audit/capabilities.md:8` (`is a `Layer<DecisionSink, never, AuditTrailPort>``); `spec/decisions/056-audit-companion-package.md:125` (a historical quotation, leave it and record the amendment in ADR-QD-158, or amend with a note).

### Q3. The base transition table, read from `packages/audit/src/CircuitBreaker.ts` [VERIFIED: file read in full this session]

States: `Closed{generation, consecutiveFailures}`, `Open{generation, openedAt}`, `HalfOpen{generation, halfOpenAt, probeClaimed}` (`:143-156`). `g` is the state's generation, `g'` an event's. `reset` is `resetTimeoutMillis` (`:225`).

**Boundary:** `Open`'s test is `now - open.openedAt < resetTimeoutMillis` stays (`:262`) and `HalfOpen`'s is `now - halfOpen.halfOpenAt < resetTimeoutMillis` stays (`:255`), so elapsed time **equal to** `reset` transitions (the existing tests pin `9999 millis` stays and `10 seconds` transitions, `CircuitBreaker.test.ts:87-101`). The test model uses `>= resetMillis` (`:577-579`, same boundary).

| Row | State | Event | Next state | Announced | Bumps | Reply |
|-----|-------|-------|-----------|-----------|-------|-------|
| O1 | Closed | Observe | same | none | no | `[Closed, g]` |
| O2 | Open | Observe, elapsed `< reset` | same | none | no | `[Open, g]` |
| O3 | Open | Observe, elapsed `>= reset` (incl. `==`) | `HalfOpen{g+1, halfOpenAt: now, probeClaimed: false}` | HalfOpen | yes | `[HalfOpen, g+1]` |
| O4 | HalfOpen (claimed or not) | Observe, elapsed `< reset` | same (claim kept) | none | no | `[HalfOpen, g]` |
| O5 | HalfOpen (claimed or not) | Observe, elapsed `>= reset` | `Open{g+1, openedAt: now}` | Open | yes | `[Open, g+1]` |
| S1 | any | Success, `g' != g` | unchanged | none | no | none |
| S2 | Closed | Success, `g' == g` | `Closed{g, consecutiveFailures: 0}` | none | no | none |
| S3 | HalfOpen (claimed or not) | Success, `g' == g` | `Closed{g+1, 0}` | Closed | yes | none |
| S4 | Open | Success, `g' == g` | unchanged | none | no | none |
| F1 | any | Failure, `g' != g` | unchanged | none | no | none |
| F2 | Closed, `cf+1 < threshold` | Failure, `g' == g` | `Closed{g, cf+1}` | none | no | none |
| F3 | Closed, `cf+1 >= threshold` | Failure, `g' == g` | `Open{g+1, openedAt: now}` | Open | yes | none |
| F4 | HalfOpen (claimed or not) | Failure, `g' == g` | `Open{g+1, openedAt: now}` | Open | yes | none |
| F5 | Open | Failure, `g' == g` | unchanged (openedAt kept: the window is not restarted) | none | no | none |
| C1 | HalfOpen, not claimed | Claim | `HalfOpen{g, same halfOpenAt, probeClaimed: true}` | none | no | `g` (won) |
| C2 | HalfOpen, claimed | Claim | unchanged | none | no | `undefined` |
| C3 | Closed or Open | Claim | unchanged | none | no | `undefined` |
| R1 | HalfOpen, claimed | Release, `g' == g` | `Open{g+1, openedAt: now}` | Open | yes | none |
| R2 | HalfOpen, claimed | Release, `g' != g` (steals a newer claim) | unchanged | none | no | none |
| R3 | HalfOpen, not claimed | Release, `g' == g` | unchanged | none | no | none |
| R4 | Closed or Open | Release | unchanged | none | no | none |

Source lines: Observe `:242-277`; Success `:283-308` (stale `:288`, Closed `:292-295`, HalfOpen `:296-302`, Open `:303`); Failure `:310-342` (stale `:316`, Open `:324`, HalfOpen `:325-328`, Closed `:329-337`); Claim `:348-361`; Release `:368-379` (the single guard `:374`). Notes the table encodes that are easy to get wrong:
- `Success` and `Failure` on `HalfOpen` do **not** require `probeClaimed`; only `Release` and `Claim` read it.
- A closed breaker that trips drops `consecutiveFailures` (the new state is `Open`), and a closing breaker restarts it at 0.
- `generation + 1` appears eight times: `:258, :259, :265, :267, :299, :327, :332, :376`.
- Bumping events: Observe (aged `Open` or aged `HalfOpen`), Success (`HalfOpen`), Failure (`HalfOpen`, `Closed` at threshold), Release (claimed `HalfOpen`, generation match). Claim never bumps; Success on `Closed` never bumps.
- `admit` (`:381-404`) is: observe, `claimProbe` only if `HalfOpen`, observe again only if the claim was lost, then `Refused` unless a probe or `Closed`.

### Q4. Writing the table against the base, and reconciling D-12 with D-13

**Recommendation: two tables, one row vocabulary, three files.** D-12 (plain `it`, no fibers or `TestClock`) is about `step`, which does not exist on the base; D-13 (written against the base, green on it) is about observable behaviour through the adapter. They are two different test objects and both are needed.

1. **`CircuitBreakerTable.test.ts` (plan 1, adapter level, green on the base, then unchanged).** One `it.effect` row per Q3 row that is observable through `makeCircuitBreaker` + `TestClock`: status via `breaker.status`, permit kind via `withPermit`, announcements via `Metric.value(transitionsTotal)` under `isolatedMetrics`, and the generation via the permit's public `Admitted.generation` (`CircuitBreaker.ts:78-85`, "opaque to callers" but readable). This pins "announced iff status changed" and "generation increments exactly when the status changes" at the adapter, on the base, so the refactor is checked against the base's own behaviour. Rows that need a stale generation or a stolen claim reuse the existing `settleLater` / `holdPermit` idiom (`CircuitBreaker.test.ts:390-402`, `:61-65`).
2. **`CircuitBreakerOptions.test.ts` (plan 1, RED on the base).** The bad-option rows (Q9, Open Question 1), runtime-only assertions (Pitfall 3).
3. **`CircuitBreakerTransition.test.ts` (plan 2, with `step`, plain `it`).** The pure table mirrors the same row ids, each as `[state, event, now] → { next, announced }` with literal states and no Effect import, plus the seeded property (Q10).

The existing `CircuitBreaker.test.ts` stays byte-for-byte unchanged (D-12). It already holds the strongest base-evidence oracle: a 150-run seeded model-based property (`FastCheck.sample(..., { numRuns: 150, seed: 52 })`, `:618-724`) that drives the real breaker and a pure reference model through generated command sequences and compares status and transition counts. It is green on the base and is the equivalence proof for every adapter conversion, so run it after each converted event.

**Base-evidence equivalent for `step`:** there is none in the strict sense (the function does not exist), which is why the adapter table carries D-13 and the pure table is added with `step`. If extra assurance is wanted, a throwaway differential check (not committed) can drive `step` and the model of `CircuitBreaker.test.ts:559-615` over the same commands; the prototype's property already agrees with the model's rules.

### Q5. The hoisted-matcher shape [VERIFIED: compiled in scratch; idiom read at `packages/core/test/v4-api-smoke.test.ts:91-96` and `packages/core/src/SinkCodec.ts:182,223`]

- `Match.type<Event>().pipe(Match.tagsExhaustive({...}))` over a `Data.TaggedClass` union compiles and exhaustiveness is enforced; so is `Match.type<State>()` over the three state classes. Both const annotations (`: (event: Event) => Decide`) keep the inference finite.
- The arms may return functions; **annotate each arm's return type** (Pitfall 2).
- Existing precedent for module-scope `Match.type<T>()` with tagged classes: `describeNode` in the v4 smoke test, `outcomeOf`/`project` in `SinkCodec.ts`, `Explanation.ts:130`.
- `Data.TaggedEnum` is not needed: the breaker already uses `Data.TaggedClass` (`Refused`, `Admitted`, the states); stay with it.
- Per §5a, the `switch` budget is unaffected: `step` has none; `typeof move === "string"` is a ternary.

### Q6. Spec records [VERIFIED: files read this session]

| Record | Location and exact text to change |
|--------|-----------------------------------|
| BEH-QD-249 | `spec/behaviors/33-audit-pipeline.md:25-36`, a ` ```ts ` fence (not compiled): line 35 `) => Layer.Layer<DecisionSink, never, AuditTrailPort>;` becomes the `InvalidAuditSinkOption` error type; the options block `:26-30` lists `failureThreshold`, `resetTimeoutMs`, `storeCallTimeout`. |
| BEH-QD-251 | `:200-286`; its `REQUIREMENT` block lists the atomic transition rule at `:215-218` ("A state transition MUST be computed and written back to the breaker's Ref as one atomic step…"); the closing paragraph `:248-254` says "`CircuitBreaker.ts` closes this by computing every transition inside a single `Ref.modify` call." Amend: every rule is one pure transition function; each event is one `Ref.modify`; announcements unchanged. |
| BEH-QD-379 | `:289-350`. The **MUST that conflicts with D-06** is at `:304-305`: `REQUIREMENT: storeCallTimeout MUST default to 5 seconds when omitted, and Duration.infinity MUST leave the store call unbounded.` Also `:338-340` ("or sets `Duration.infinity` to keep the unbounded wait") and `:342-344`: `**`Duration.zero` is pinned, not chosen.** With a zero deadline the store call starts — a `Latch` reply's latch is open afterwards — and then fails at once, with no clock movement: the record is `WriteFailed`.` That paragraph becomes a refusal (D-14). |
| INV-QD-052 | `spec/invariants.md:2281-…`; its **Source** text names `claimProbe` and `releaseProbe` and says every transition is "a single `Ref.modify` call" (`:2286-2299`). Kept, but restate the Source over `run`/`step` so it stops naming helpers that may disappear (D-09 allows that). Its Enforcement block names the model property, which stays. |
| New | BEH-QD-561 in `33-audit-pipeline.md` (the file's last id is BEH-QD-489); INV-QD-335 in `invariants.md` after INV-QD-333 (`:3845`; the file's newest is INV-QD-333 and INV-QD-334 is Phase 44's unused number, check its CCR row). Suggested: use BEH-QD-561 and INV-QD-335 only, and name BEH-QD-562..565 and INV-QD-336 "Unused" in the CCR row, as `_WAVE10-CONTEXT.md` requires. |
| ADR | next is **ADR-QD-158**; the newest file is `157-a-seeds-fields-are-the-wires-stated-once.md` and `index.yaml` ends with the `ADR-QD-157` entry (`id`, `file`, `title`, `status: "Accepted — amends …"`). Suggested file: `158-the-breakers-rules-are-one-transition-function.md`; sections `Context`, `Decision`, `Alternatives considered`, `Consequences`, `Related` (ADR-157's layout). Gate 10 requires the Document ID to equal the file number (`QADI-ADR-158`). Cite ADR-QD-126 (amends) and BEH-QD-166 (the contrast: `spec/behaviors/21-decision-cache.md:155-172`, a defect there, "a constant the caller wrote"). |
| CCR | `spec/README.md:372` is `CCR-QD-435`, the latest; the CCR-QD-436 row goes after it. Row format: `\| CCR-QD-436 \| 2026-11-15 \| <files with Rev>… \| ARCH-92. **<title>.** <what/why>…` (see the CCR-QD-435 row, `:372`, for the exact shape and level of detail). `spec/README.md`'s own Change History (`:13`) gets an entry per revision. |
| Mechanical revisions | `node scripts/spec-revise.mjs <spec-doc.md> "<what changed>" --date 2026-11-15` bumps the Document Control Revision and prepends the Change History entry for one document (`spec-revise.mjs:1-30`); `node scripts/spec-revise.mjs --check` (`pnpm spec:verify`) verifies. Run once per entry per document: `33-audit-pipeline.md` (Rev 1.19 now), `invariants.md` (Rev 1.126), `traceability.md` (Rev 1.186), `overview.md` (Rev 1.109), `README.md` (Rev 1.188), the new ADR, `index.yaml` is not a revised document. |
| Traceability | `spec/traceability.md`: the behaviour-doc row `:75` (BEH-QD-249–257, 312, 326, 339, 379–380, 489: add BEH-QD-561 and name the new modules in its file list), the `INV-QD-052` row `:190` and a new INV-QD-335 row, the ADR table near `:297` (ADR-QD-126's row) plus a new ADR-QD-158 row, and the test-file table rows `:559-577` (`CircuitBreaker.test.ts` `:561`, `AuditSinkDeadline.test.ts` `:575`, whose text reads "`Duration.infinity` opts out; `Duration.zero` pinned") plus three new rows for the new test files. `bash spec/scripts/verify-traceability.sh --strict` is the gate. |
| Overview | `spec/overview.md:744-762` is the `@qadi/audit` export table (`\| Export \| Kind \| Source \|`). Add `\| `InvalidAuditSinkOption` \| error \| `InvalidAuditSinkOption.ts` — … \|` near `AuditWriteError`/`AuditStagingError` (`:749, :751`). Update the `AuditDecisionSinkOptions` row at `:758`, which says "`storeCallTimeout` (… `Duration.infinity` for none …)". Its Change History (`:13`) gets an entry (gate 13, `check-api-surface.mjs`). |
| Docs | `packages/audit/README.md:23, 94-104` (the deadline paragraph and the `Unbounded` example); `apps/website/.../packages/audit/capabilities.md:8` (the `never` type), `:55-62` (the "Circuit breaker — internal, no port and no public error type" paragraph: still true of a tripped breaker, but add that a breaker or sink whose options cannot work is refused when built), `:63-90` (the deadline section and the `Bounded`/`Unbounded` fences), `:199`. |
| Upgrading | `apps/website/src/content/docs/docs/reference/upgrading.md`: the file's headings are `## 0.13: <title>` entries appended at the end; the newest is `## 0.13: a seeded allow has no `visibleFields` key when the server sent none` at `:716`. Add `## 0.13: a breaker or audit sink option that cannot work is refused when it is built` after it. Format: one paragraph naming the break, a ` ```ts ` **Before** fence, a ` ```typescript ` **After** fence (compiled by `check-website-doc-examples.mjs`), then "The decision is [ADR-QD-158](https://github.com/leaderiop/qadi/blob/main/spec/decisions/158-….md)." The 0.12 audit section `:323-358` (`:354-358`) tells readers to pass `Duration.infinity`; see Open Question 1. `@qadi/audit` is at `0.12.0` (`package.json:3`), so a minor is `0.13.0`, which matches the `0.13:` headings. |
| Changeset | `.changeset/<name>.md` with front matter `"@qadi/audit": minor` and a body that starts `**Breaking.**` (see `.changeset/react-seed-fields-stated-once.md`), ending "See the 0.13 section of the upgrade guide, `/docs/reference/upgrading/`." The `fixed` group in `.changeset/config.json` moves all nine packages together. |

### Q7. Mutation testing [VERIFIED: `stryker.audit.mjs` read; 44-01-PLAN/44-06-PLAN/44-SUMMARY read]

- **Config:** `stryker.audit.mjs`: `testRunner: "vitest"`, `vitest.configFile: "packages/audit/vitest.config.ts"`, `coverageAnalysis: "perTest"`, `ignoreStatic: true`, `thresholds: { high: 90, low: 80, break: 80 }`, `timeoutMS: 20000`, `jsonReporter.fileName: "reports/mutation-audit/mutation.json"` (gitignored, written at the repo root), HTML at `reports/mutation-audit/index.html`.
- **Base command (the exact string the close repeats):** `pnpm exec stryker run stryker.audit.mjs --mutate 'packages/audit/src/CircuitBreaker.ts,packages/audit/src/AuditDecisionSinkLive.ts'`. Run in the background, log in the scratchpad. An exit 1 after "below breaking threshold" with the report written is not a failed baseline (44-01 Task 1 step 3).
- **Base file:** `.planning/phases/QD-45-…/45-mutation-base.json`, shape `{ "measured": { "<path>": <0..1> }, "unmeasured": {}, "new": [], "deleted": {}, "moved": {} }` (Phase 44's was `{"measured":{"packages/react/src/HydrationEngine.ts":1,"packages/react/src/SeededDecision.ts":0.875},…}`). Score is `(Killed + Timeout) / (Killed + Timeout + Survived + NoCoverage)`, unrounded.
- **Writer and comparer:** retarget 44-01-PLAN Task 1 step 4's writer (config `stryker.audit.mjs`, report `reports/mutation-audit/mutation.json`, the two named files, scan dirs `packages/audit/src`, `packages/audit/test`, `packages/core/src`, `packages/testing/src`). It refuses a stale report (older than the newest source or test file), a report holding any file other than the two named, a report whose `source` is not the file on disk, and a config reporting elsewhere. The close step is 44-06's comparer, writing `45-mutation-after.json` (`{path: score}`), failing if a touched file is below its base. **There is already a stale `reports/mutation-audit/mutation.json` (one file, 17 mutants, 2026-11-14); the writer's staleness check must be kept so it is never mistaken for a base.**
- **New files have no base.** `InvalidAuditSinkOption.ts` and any new checks module are `new` in the comparison: record their scores and require no survivor that is not a documented equivalent; they are covered by the refusal rows.
- **Run time (estimate):** the audit project is 22 test files and 400 tests, 1.2 s end to end this session (`pnpm exec vitest run --project audit`: `Test Files 22 passed, Tests 400 passed, Duration 1.18s`). Phase 44's two-file react run took 1 min 36 s with 442 tests. Expect **about 2 to 5 minutes** for `CircuitBreaker.ts` + `AuditDecisionSinkLive.ts`. [ASSUMED: extrapolated, not measured; the first run will say]
- **Equivalent-mutant traps:** with `ignoreStatic: true` the hoisted `Match.type<…>()` calls themselves are static, so mutants in module-scope construction are not scored, but arm bodies are (they run per call). The `ENTER` table's arms and the `admittedUnder` arms are covered by the pure table. A `typeof move === "string"` mutant is killed by any row that expects a bump. `now - x < reset` to `<=` is killed by the exact-boundary rows (O2 vs O3, O4 vs O5).

### Q8. House-style gates this phase can trip [VERIFIED: `scripts/check-house-style.mjs` read; rule names grepped]

- **Budgets unchanged:** `SWITCH_BUDGET` (`Walk.ts` 1, `Matcher.ts` 2; none in audit), `UNTRACED_BUDGET` (no `Effect.fnUntraced`), `ANY_BUDGET`, `SCHEMA_ERROR_BUDGET`, `HAS_CUSTOM_BUDGET`, `PORT_DOUBLE_BUDGET`, `AUDIT_HAND_LAYER_BUDGET` (a refusal test builds no port; use `AuditTrailPortTest().layer`), `METRIC_ID_LITERAL_BUDGET` (`packages/audit/test/Metrics.test.ts` has 4 literal pins; a new test reads `Metric.value(transitionsTotal)` and adds no `"qadi_…"` literal), `UNTRUSTED_DECODE_BUDGET` (none of its tokens appear).
- **Rules that apply:** `[no-prefixed-error-tag]` (tag `InvalidAuditSinkOption`, no `qadi/`), `[no-catchtags-object-form]` (use `Effect.catchTag("InvalidAuditSinkOption", …)` if a catch is needed), `[no-named-effect-submodule-import]`, `[barrel-order]` (alphabetical `export *`), `[metric-declaration]`/`[metric-table]` (`transitionsTotal` stays declared once in `CircuitBreaker.ts`, row in `spec/behaviors/25-inspection.md`), `[no-numbering-placeholder]`, `[port-error-list]` (only the two audit port modules; not the new error), `pnpm circular` (the new checks module imports only `effect/*` and the error module; no cycle).
- **The error class:** `export class InvalidAuditSinkOption extends Data.TaggedError("InvalidAuditSinkOption")<{ … }> {}`, exactly like `AuditWriteError` (`AuditTrailPort.ts:35`) and `AuditStagingError` (`AuditStagingPort.ts:36`). No `ERROR_CODES` registry or `QadiError` union applies: `InvalidBoundedPermits` (`packages/core/src/Errors.ts:362`) is in core's, but every audit error is declared bare in its own module and joins nothing. Put it in a **new module** (`InvalidAuditSinkOption.ts`): `CircuitBreaker.ts` is package-private and cannot be `export *`d without leaking `makeCircuitBreaker`, and `AuditDecisionSinkLive.ts` imports `CircuitBreaker.ts`, so declaring it in the sink module would make `CircuitBreaker.ts` import its own consumer (a cycle). Add `export * from "./InvalidAuditSinkOption.ts";` to `packages/audit/src/index.ts` between `AuditWriteOutcome.ts` and `Retention.ts`.
- **Scoped grep for BRKR-01:** `git diff <phase-base> -U0 -- packages/audit/src | /usr/bin/grep '^+' | /usr/bin/grep -cF 'generation + 1'` must print `1` (Pitfall 5). Count the base the same way: `git grep -cF 'generation + 1' -- packages/audit/src/CircuitBreaker.ts` is 8.

### Q9. Tests that pass a value the new validation refuses [VERIFIED: grep of `failureThreshold|resetTimeoutMs|storeCallTimeout|Duration.zero|Duration.infinity` over tests, features, examples, website, spec]

- `packages/audit/test/AuditSinkDeadline.test.ts:292-305`: `it.effect("storeCallTimeout: Duration.zero (pinned, not chosen): the call starts, then fails at once", …)` with `sinkOver(trail.layer, { storeCallTimeout: Duration.zero })`. Becomes a refusal row (D-14). Same commit as the validator.
- `packages/audit/test/AuditSinkDeadline.test.ts:277-290`: `it.effect("storeCallTimeout: Duration.infinity opts out: a hung write is still pending after an hour", …)`. **Refused under D-06 variant A; stays under variant B.** Open Question 1.
- Every other value in the tests is valid: `failureThreshold` 1, 2, 3, 5, 25 (`AuditDecisionSinkLive.test.ts:223, 267, 453, 480`; `AuditSinkDeadline.test.ts:104, 125, 223, 246, 267, 314`; `driveExit.ts:111`; `CircuitBreaker.test.ts:15, 375, 469, 502`), `resetTimeoutMs` `10_000` and the property's `FastCheck.integer({ min: 1, max: 20_000 })` (`CircuitBreaker.test.ts:623-624`), `storeCallTimeout` `"5 seconds"` (`driveExit.ts:36`), `"1 millis"` (`AuditSinkDeadline.test.ts:191`), `"2 seconds"`, `"1 second"`.
- Docs fences that pass `Duration.infinity`: `capabilities.md:87` (`Unbounded`), `README.md:104`; they still type-check (variant A refuses at runtime, not at type level), but the prose is false under variant A.

### Q10. The fast-check property (D-12) [VERIFIED: ran 2000 seeded runs against the prototype]

- fast-check **4.10.2**. The repo convention for a pure property is `FastCheck.assert(FastCheck.property(arbs…, (…) => { … }), { numRuns, seed })` with a numeric literal seed (`packages/react/test/HydrationSeedFields.test.ts:110-111`). The breaker's own existing model property uses `FastCheck.sample(arb, { numRuns: 150, seed: 52 })` then iterates inside the Effect (`CircuitBreaker.test.ts:620-628`); the pure `step` property needs no Effect, so use `assert`/`property`. Suggested `{ numRuns: 1000, seed: 45 }`.
- **Generators:** the threshold in `1..4`; the reset fixed or `1..200`; a command array (length up to 60) of `{ e: "O"|"S"|"F"|"C"|"R", back: -1..3, dt: 0..150 }`; the clock `now` is the running sum of `dt` (monotonic non-decreasing, as `Clock.currentTimeMillis` is); `Success`/`Failure`/`Release` take `generation = state.generation - back`, so equal, stale (behind) and a generation ahead are all generated.
- **Sound statements** (all held over 2000 runs; each is checkable from the transition alone, with `before` the state and `t = step(before, event, now)`):
  1. `t.next.generation >= before.generation` (never decreases).
  2. `t.next.generation === before.generation + (t.next._tag !== before._tag ? 1 : 0)` (increments exactly when the status changes, and by exactly one).
  3. `t.announced === (t.next._tag !== before._tag ? t.next._tag : undefined)`.
  4. A `Success`, `Failure` or `Release` whose generation differs from `before.generation` returns `t.next === before` (reference-equal), so a stale event can never move state.
  5. **At most one probe claimed per window:** a window is one `HalfOpen` generation (generations only grow, so each `HalfOpen` generation is one contiguous window). Count the `Claim` events whose `before` was an unclaimed `HalfOpen` and whose `next` is a claimed `HalfOpen`, keyed by `t.next.generation`; every count is `<= 1`. Also: a claimed `HalfOpen` stays claimed until a status change, and `Claim` on a claimed window returns `next === before`.
  6. The claim reply: `Claim` is won iff `t.next !== before` (and iff `!Equal.equals(before, t.next)`).
- Do not state "at most one probe" as "at most one `Claim` event succeeds in a run": there can be many windows in one run.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Five `Ref.modify` bodies, each with its own stale check, bump and announcement | one pure `step` + one `run` | this phase | the rule is stated once and testable with no fibers |
| `Match.value(state)` per call | hoisted `Match.type<…>()` | §5a (ADR-QD-034) | no per-call matcher build |
| Option passed through unchecked | typed refusal at construction | this phase (ADR-QD-158) | a wrong threshold or cooldown is reported by the composition |

**Deprecated/outdated:** BEH-QD-379's "`Duration.zero` is pinned, not chosen" (becomes a refusal); the `README`/website/`upgrading.md` advice to pass `Duration.infinity` (depends on Open Question 1).

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Stryker run time for the two files is about 2 to 5 minutes | Q7 | Low: only affects scheduling; the first run measures it |
| A2 | The adapter sketch (`run`, the replies) compiles as written | Code Examples | Low: `step` was compiled; the adapter mirrors the base's own `Ref.modify` shapes, and the existing 400 tests plus the model property check it |
| A3 | File names `InvalidAuditSinkOption.ts`, `SinkOptionChecks.ts`, `CircuitBreakerTable.test.ts`, `CircuitBreakerOptions.test.ts` | Recommended Project Structure | None: planner's choice |
| A4 | `driveExit.ts` and `Agreement.test.ts` are the only type-level breaks | Q2 | Medium: derived by reading signatures, not by compiling; the first `pnpm typecheck` after the layer type changes confirms it, and any further site has the same one-line fix |
| A5 | INV-QD-334 is Phase 44's unused number (so INV-QD-335 is the next used) | Q6 | Low: confirm from the CCR-QD-435 row's "Unused" text before writing; INV-QD-335 is reserved for this phase either way |

## Open Questions

1. **D-06 refuses `Duration.infinity` for `storeCallTimeout`, which BEH-QD-379 requires to be accepted. (Needs a user decision before the validator is planned.)**
   - What we know: D-06 says `storeCallTimeout`: "finite and positive (a non-finite timeout lets a hung store call hold its record forever; zero is refused)". BEH-QD-379 (`33-audit-pipeline.md:304-305`) says `Duration.infinity MUST leave the store call unbounded`; `AuditSinkDeadline.test.ts:277` is its test; ADR-QD-126 D-02 and the 0.12 upgrade note (`upgrading.md:354-357`) tell operators with a slow store to pass `Duration.infinity`; the README (`:94-104`) and `capabilities.md` (`:71, :87`) document it with a compiled example.
   - What's unclear: whether D-06 deliberately withdraws that opt-out (an operator then can only pass a large finite duration), or the opt-out was not in view when D-06 was written. The "hold its record forever" reasoning is exactly what ADR-QD-126 chose to allow as an explicit opt-in.
   - **Variant A (literal D-06):** `isFinite && isPositive`. Then change: BEH-QD-379 `:304-305` and `:338-340`; the test at `:277-290` (becomes a refusal row); `README.md:94-104`; `capabilities.md:63-90`; `upgrading.md:354-358` (rewrite the advice); `spec/overview.md:758`; the traceability row `:575`; ADR-QD-126 gets an amendment; the changeset says the opt-out is removed. This also makes `Duration.infinity` for `resetTimeoutMs` refused, which is uncontroversial (the breaker would never leave `Open`).
   - **Variant B (recommended):** `storeCallTimeout` accepts positive durations including `Duration.infinity`, and refuses `NaN`, zero, negatives and `-Infinity` (all four silently fail every store call today). `resetTimeoutMs` and `failureThreshold` stay as D-06 says. Smaller blast radius, keeps a MUST and a documented, tested opt-out, and still closes the actual silent-failure hole (`NaN` decoding to zero). The difference between the variants is one predicate (`Duration.isFinite`) and the rows and docs listed above.
   - Recommendation: one `checkpoint:decision` with these two variants; plan variant B unless the user says otherwise. The refusal table in `CircuitBreakerOptions.test.ts` carries the `Infinity` row under whichever variant is chosen.
2. **Should `step` be exported from `CircuitBreaker.ts` for tests?** D-01 says tests import from `src`; the module is package-private, so exporting `step`, `Event` classes and `Rules` costs nothing and needs no overview row (not in the barrel). Yes.
3. **Is the claim reply `!Equal.equals` or reference inequality?** Both held in the property; `Equal.equals` is the sturdier choice (Anti-Patterns). Planner's discretion within D-03.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| node | everything | yes | v26.13.0 | none needed |
| pnpm | all commands | yes | 10.17.1 | none needed |
| vitest | tests | yes | 5.1.0 | none needed |
| fast-check | the property | yes (`packages/audit/node_modules`) | 4.10.2 | none needed |
| `@stryker-mutator/core` + vitest-runner | the base and after runs | yes | 10.1.1 | none needed |
| tstyche | optional type pin | yes | 7.2.5 (target 6.0.3) | skip the pin |

**Missing dependencies with no fallback:** none. **Missing with fallback:** none.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest 5.1.0 (`@effect/vitest` 4.1.2, `fast-check` 4.10.2); `tstyche` for type pins |
| Config file | root `vitest.config.ts` (`projects: ["packages/*"]`, coverage thresholds core 95 / others 90), `packages/audit/vitest.config.ts` (`name: "audit"`, `include: ["test/**/*.test.ts"]`), `stryker.audit.mjs` |
| Quick run command | `pnpm exec vitest run --project audit packages/audit/test/CircuitBreaker.test.ts packages/audit/test/CircuitBreakerTable.test.ts packages/audit/test/CircuitBreakerTransition.test.ts packages/audit/test/CircuitBreakerOptions.test.ts` (from the repo root, never from `packages/audit`) |
| Full suite command | `pnpm check:pr < /dev/null` (`node scripts/run-check.mjs --skip-mutation`); fast loop `pnpm check:fast`; the audit project alone: `pnpm exec vitest run --project audit` (22 files, 400 tests, about 1.2 s on the base) |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| BRKR-01 | every generation/probe rule in one pure function; one `generation + 1` | pure table + property; scoped grep | `pnpm exec vitest run --project audit packages/audit/test/CircuitBreakerTransition.test.ts`; `bash -c 'git diff <phase-base> -U0 -- packages/audit/src \| /usr/bin/grep "^+" \| /usr/bin/grep -cF "generation + 1"'` prints 1 | Wave 0 (new) |
| BRKR-02 | one `Ref.modify` per event; hoisted matchers | existing adapter suite + structural scan | `pnpm exec vitest run --project audit`; `bash -c '/usr/bin/grep -c "Match.value" packages/audit/src/CircuitBreaker.ts'` prints 0; `/usr/bin/grep -cF "Ref.modify" packages/audit/src/CircuitBreaker.ts` prints 1 | exists (suite); scan in plan |
| BRKR-03 | bad options refused at construction, one row per value; `NaN` RED on the base | table of `it.effect` rows | `pnpm exec vitest run --project audit packages/audit/test/CircuitBreakerOptions.test.ts packages/audit/test/AuditSinkDeadline.test.ts` | Wave 0 (new, RED on base) |
| BRKR-04 | stale generation, release stealing a newer claim, stale failure reopening a newer window, every legal transition; no fibers/clock | pure table (plain `it`) | same file as BRKR-01; plus the adapter table `packages/audit/test/CircuitBreakerTable.test.ts` | Wave 0 (new) |
| BRKR-05 | the four regression tests unchanged and green | existing | `pnpm exec vitest run --project audit packages/audit/test/CircuitBreaker.test.ts`; `git diff <phase-base> --stat -- packages/audit/test/CircuitBreaker.test.ts` is empty | exists |
| WX-01 | `check:pr` green | gate | `pnpm check:pr < /dev/null` | exists |
| WX-02 | reserved ids only | scan | `git grep -nE 'ADR-QD-NEXT\|CCR-QD-NEXT\|BEH-QD-NEXT\|INV-QD-NEXT' -- packages spec` empty; ids used are exactly ARCH-92, ADR-QD-158, CCR-QD-436, BEH-QD-561 (+ named unused 562..565), INV-QD-335 (+ named unused 336) | exists (`[no-numbering-placeholder]`) |
| WX-03 | overview names `InvalidAuditSinkOption` | gate | `pnpm spec:api` | exists |
| WX-04 | no forbidden construct | `pnpm lint` (oxlint + `check-house-style.mjs`) and a diff scan over `packages/audit/src` for `\bas\b`, `!`, `any`, `switch`, `fnUntraced` | `pnpm lint` | exists |
| WX-05 | coverage holds; Stryker not below base | coverage + per-file Stryker | `pnpm coverage`; `pnpm exec stryker run stryker.audit.mjs --mutate 'packages/audit/src/CircuitBreaker.ts,packages/audit/src/AuditDecisionSinkLive.ts'` then the comparer vs `45-mutation-base.json` | base in Wave 0 |
| WX-06 | tests precede the change | git order | the base JSON, the adapter table and the RED option rows are committed before the first `packages/audit/src` edit (`git log --format=%H -- packages/audit/src` has no earlier commit after the phase base) | Wave 0 |
| WX-07 | Breaking recorded | review | `.changeset/*.md` has `"@qadi/audit": minor` and `**Breaking.**`; `upgrading.md` has the entry; `pnpm spec:website-examples` compiles its After fence | Wave 0 |

### Sampling Rate
- **Per task commit:** the quick run command, plus `pnpm typecheck` after any `src` edit (it also runs `tsc -p tsconfig.test.json`, which is where `driveExit.ts` and `Agreement.test.ts` fail) and `pnpm circular` once the new modules exist.
- **Per converted event (plan 2):** `pnpm exec vitest run --project audit` (about 1 s) so a conversion that breaks the model property or a regression test is caught on the commit that did it.
- **Per wave merge:** `pnpm check:fast`.
- **Phase gate:** `pnpm check:pr < /dev/null` green, then the Stryker comparer exit 0, before `/gsd-verify-work`.
- A task whose verify would run the not-yet-fixed `CircuitBreakerOptions.test.ts` excludes it by exact file path until the fixing task (`_SHARED-CONTEXT.md` hygiene).

### Wave 0 Gaps
- [ ] `45-mutation-base.json` (retargeted 44-01 writer; the phase's first plan commit, alone).
- [ ] `packages/audit/test/CircuitBreakerTable.test.ts`: the adapter-level Q3 table, green on the base.
- [ ] `packages/audit/test/CircuitBreakerOptions.test.ts`: one row per bad value, runtime assertions only, RED on the base; the RED output (and the base behaviour per row, Pitfall 4) recorded in the SUMMARY.
- [ ] `packages/audit/test/CircuitBreakerTransition.test.ts`: the pure table and the seeded property (plan 2, with `step`).
- [ ] Optional `packages/audit/test/AuditDecisionSinkLive.tst.ts` (or a row in an existing `.tst.ts`): pin `Layer.Layer<DecisionSink, InvalidAuditSinkOption, AuditTrailPort>`; add its traceability row.
- No framework install is needed.

## Security Domain

Security enforcement is enabled (`workflow.security_enforcement: true`, ASVS level 1, block on high; `.planning/config.json`).

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|------------------|
| V2 Authentication | no | none in this phase |
| V3 Session Management | no | none |
| V4 Access Control | no (the breaker gates audit writes, not access decisions) | n/a; INV-QD-035 (a sink cannot change a decision) is untouched |
| V5 Input Validation | yes (deployment configuration is read from the environment, D-05) | validate at construction with a typed, closed error; `Duration.fromInput` instead of a throwing decoder; no `any` or `Record<string, unknown>` in the error |
| V6 Cryptography | no | none |
| V7 Error Handling / Logging | yes | a refusal names the option and the received value (not secrets); a bad option fails closed (the layer does not build) rather than building a breaker that never opens |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| A mis-set threshold (`NaN`, `Infinity`) silently disables the breaker, so an outage of the audit store is never contained and records are written to a dead store with no trip | Denial of service / Repudiation (audit gap) | refuse at construction (BRKR-03); `NaN` and `Infinity` rows RED on the base |
| A zero, negative or `NaN` cooldown flaps the breaker every read, hammering a recovering store | Denial of service | refuse (`resetTimeoutMs` finite, positive, whole milliseconds) |
| A zero, negative or `NaN` `storeCallTimeout` makes every store call fail instantly, losing every record | Repudiation (every entry lost) | refuse; the base silently accepted these |
| An unbounded `storeCallTimeout` holds a decision behind a hung store | Denial of service | Open Question 1: a documented, deliberate opt-out under variant B; refused under variant A |
| A stale outcome moves a newer window (a permit admitted earlier settling later) | Tampering of breaker state | one stale check at the top of `step`, tested by rows S1/F1/R2 and property statement 4 |
| Two fibers both believe they hold the one probe | Elevation of a second probe | `Claim` is one `Ref.modify`; property statement 5 and the existing ten-racer test (`CircuitBreaker.test.ts:188`) |

## Sources

### Primary (HIGH confidence)
- `packages/audit/src/CircuitBreaker.ts`, `AuditDecisionSinkLive.ts`, `index.ts`, `AuditTrailPort.ts:35`, `AuditStagingPort.ts:36` (read in full or at the cited lines this session)
- `node_modules/effect/src/Duration.ts` (`:275-361`, `:384-386`, `:405-407`, `:462-480`, `:516`, `:594`, `:891`) and `node_modules/effect/dist/Duration.js` (executed)
- `packages/audit/test/CircuitBreaker.test.ts` (read in full), `AuditSinkDeadline.test.ts`, `driveExit.ts`, `Agreement.test.ts`, `AuditDecisionSinkLive.test.ts:775-795`
- `spec/behaviors/33-audit-pipeline.md`, `21-decision-cache.md:150-175`, `06-services.md:270-285`, `spec/invariants.md` (INV-QD-052, INV-QD-333), `spec/decisions/126-…`, `157-…`, `index.yaml`, `spec/README.md:372`, `spec/overview.md:744-762`, `spec/traceability.md`
- `scripts/check-house-style.mjs`, `scripts/spec-revise.mjs`, `stryker.audit.mjs`, `tstyche.json`, `package.json` scripts, `.changeset/react-seed-fields-stated-once.md`, `apps/website/.../upgrading.md`
- `.planning/phases/QD-44-…/44-RESEARCH.md`, `44-01-PLAN.md`, `44-06-PLAN.md`, `44-06-SUMMARY.md`, `44-mutation-base.json`
- Scratch prototype (`step`, the property, the error class) compiled with `tsc` and run with `node` in the session scratchpad, outside the repo

### Secondary (MEDIUM confidence)
- none

### Tertiary (LOW confidence)
- the Stryker run-time estimate (A1)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH, no change; versions read from `node_modules`
- Architecture: HIGH, the `step` shape was compiled and a 2000-run property passed
- Duration decoding and validation predicates: HIGH, read and executed
- Pitfalls: HIGH for 1 to 5 (each reproduced); MEDIUM for the type-level site list (A4)
- Records: HIGH, formats read from the latest phase's artefacts

**Research date:** 2026-11-15
**Valid until:** 2026-12-15 (stable; re-verify line numbers against `phase_base`, and the effect version if `pnpm-lock.yaml` moves)
