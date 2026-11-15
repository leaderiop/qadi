# Phase 45: The audit circuit breaker as one transition function - Pattern Map

**Mapped:** 2026-11-15
**Files analyzed:** 22 new/modified
**Analogs found:** 22 / 22 (all tracked; `git ls-files` checked for the src, test, changeset and core analogs)

Line numbers are the base's (HEAD 2a97ebfb). 45-RESEARCH.md holds the compiled `step`, the checks and the error class (Code Examples) and the Q3 transition table. Do not re-derive them; this map points at the real analogs for shape, placement and the records.

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `packages/audit/src/CircuitBreaker.ts` (mod: `step`, events, `run`) | service (pure transition + adapter) | event-driven (state machine) | itself (the five `Ref.modify` bodies, :242-379) + `packages/core/src/Matcher.ts` `referencesAction` (hoisted matcher) | exact |
| `packages/audit/src/InvalidAuditSinkOption.ts` (new) | model (error) | request-response | `packages/audit/src/AuditTrailPort.ts:35` `AuditWriteError`; `packages/core/src/Errors.ts:362` `InvalidBoundedPermits` | exact |
| `packages/audit/src/SinkOptionChecks.ts` (new, package-private; or beside `step`) | utility (validators) | transform | `packages/core/src/PortDerivation.ts:168-172` `boundedPermits` | exact |
| `packages/audit/src/AuditDecisionSinkLive.ts` (mod :109-129, :137 only) | service (layer) | request-response | itself | exact |
| `packages/audit/src/index.ts` (mod) | config (barrel) | n/a | its own alphabetical `export *` list | exact |
| `packages/audit/test/CircuitBreakerTable.test.ts` (new, green on base) | test | event-driven | `packages/audit/test/CircuitBreaker.test.ts` (`settleLater`/`holdPermit`, `isolatedMetrics`) | exact |
| `packages/audit/test/CircuitBreakerOptions.test.ts` (new, RED on base) | test | request-response | `CircuitBreaker.test.ts` (`it.effect` + `makeCircuitBreaker`) | role-match |
| `packages/audit/test/CircuitBreakerTransition.test.ts` (new) | test (pure table + property) | transform | `packages/react/test/HydrationSeedFields.test.ts:95-140` (fast-check) | role-match |
| `packages/audit/test/AuditSinkDeadline.test.ts` (mod :277-305) | test | request-response | itself | exact |
| `packages/audit/test/driveExit.ts:95`, `Agreement.test.ts:31-32` (mod) | test helper | request-response | themselves (widen `E`) | exact |
| `45-mutation-base.json` / `45-mutation-after.json` + writer/comparer | config / batch | batch | 44-01-PLAN Task 1 step 4 (:182), 44-06-PLAN Task 1 (:140) | exact |
| `spec/decisions/158-*.md` + `index.yaml` | spec record | n/a | `spec/decisions/157-a-seeds-fields-are-the-wires-stated-once.md`; `index.yaml` tail | exact |
| `spec/behaviors/33-audit-pipeline.md`, `invariants.md`, `traceability.md`, `overview.md`, `README.md` | spec | n/a | CCR-QD-435 row (`spec/README.md:372`), 44's records | exact |
| `.changeset/<slug>.md` | release note | n/a | `.changeset/react-seed-fields-stated-once.md` | exact |
| `apps/website/.../reference/upgrading.md` | docs | n/a | the `## 0.13:` entry at :716 | exact |
| `packages/audit/README.md`, `apps/website/.../packages/audit/capabilities.md` | docs | n/a | themselves | exact |

## Pattern Assignments

### `packages/audit/src/CircuitBreaker.ts` (service, event-driven)

**Hoisted matcher analog:** `packages/core/src/Matcher.ts` (`referencesAction`) and AGENTS.md §5a: annotate the const, build `Match.type<T>()` once at module scope.
```typescript
export const referencesAction: (self: Matcher) => boolean = Match.type<Matcher>().pipe(
  Match.tagsExhaustive({ Eq: (m) => m.ref._tag === "ActionRef", /* ...every tag */ }),
);
```
Apply: copy the compiled `step` from 45-RESEARCH.md "Code Examples" verbatim in shape (`ENTER` closed Record, `observeState`/`successState`/`failureState`/`claimState`/`releaseState`, `decide`, `admittedUnder`, `step`). Annotate every arm's return type (`(open): Arm => ...`), else TS7006/TS2322 (Pitfall 2). `Event` classes are `Data.TaggedClass`, like the module's states.

**Base to replace** (`CircuitBreaker.ts:242-277`, the per-call matcher and the repeated bump):
```typescript
const observe: Effect.Effect<Observed> = Effect.gen(function* () {
  const now = yield* Clock.currentTimeMillis;
  const [observed, justTransitioned] = yield* Ref.modify(ref, (state): Observation =>
    Match.value(state).pipe(Match.tagsExhaustive({ Closed: ..., HalfOpen: ... generation + 1 ..., Open: ... })),
  );
```
`generation + 1` appears at :258, :259, :265, :267, :299, :327, :332, :376; after the phase exactly one in added lines (and none in added comments).

**Adapter** (one `Ref.modify` per event; INV-QD-052): sketch at 45-RESEARCH.md "The adapter". Use an annotated callback return type, not `as const` (house idiom `(state): Observation =>` at :246). Keep `Effect.gen` plain arrows (no `Effect.fn`, no `fnUntraced`; `UNTRACED_BUDGET`). Announce via the existing `announceTransition` / `Metric.update(transitionsTotal, to)`. `transitionsTotal` stays the one declaration.

**Validation entry:** `makeCircuitBreaker` (:218-226) currently does `const resetTimeoutMillis = Duration.toMillis(options.resetTimeoutMs);` inside `Effect.fn("qadi.audit.makeCircuitBreaker")(function* ...)`. Add `yield* checkFailureThreshold(...)` / `yield* checkResetTimeoutMs(...)` there, then `const transition = step({ failureThreshold, resetTimeoutMillis })`.

### `packages/audit/src/InvalidAuditSinkOption.ts` (model, error)

**Analog:** `AuditTrailPort.ts:35-38` (bare class in its own module, doc comment first line then why) and `Errors.ts:362-364`.
```typescript
export class AuditWriteError extends Data.TaggedError("AuditWriteError")<{
  readonly entry: AuditEntry;
  readonly cause: unknown;
}> {}
```
Apply: `Data.TaggedError("InvalidAuditSinkOption")<{ readonly option: "failureThreshold" | "resetTimeoutMs" | "storeCallTimeout"; readonly received: Duration.Input }>` (a union of field shapes fails TS2509). Add a `message` getter (default is empty). Imports: `import * as Data from "effect/Data"; import type * as Duration from "effect/Duration";`. Own module because `CircuitBreaker.ts` is package-private and the sink imports it (a class in the sink module would cycle). Not a `Schema.TaggedError`; join no `QadiError`/`ERROR_CODES` (audit errors never do).

### `packages/audit/src/SinkOptionChecks.ts` (utility, transform)

**Analog:** `PortDerivation.ts:168-172` (typed construction refusal):
```typescript
export const boundedPermits = (permits: number): Effect.Effect<Semaphore.Semaphore, InvalidBoundedPermits> =>
  Number.isInteger(permits) && permits > 0
    ? Semaphore.make(permits)
    : Effect.fail(new InvalidBoundedPermits({ permits }));
```
Apply: the three checks from 45-RESEARCH.md "The checks" (`checkFailureThreshold`, `checkResetTimeoutMs`) plus `checkStoreCallTimeout` with **D-06a: `Duration.fromInput` some, `Duration.isPositive` only** (`Duration.infinity` accepted; `NaN`/0/negative/`-Infinity`/malformed refused; `received` is the raw input). Use `Duration.fromInput` (Option), never `fromInputUnsafe`. Keep this module out of the barrel (a barrel `export *` would publish the checks; §9). Imports only `effect/*` and the error module (`pnpm circular`).

### `packages/audit/src/AuditDecisionSinkLive.ts` (service, layer)

**Current** (:109-129):
```typescript
export const AuditDecisionSinkLive = (options?: AuditDecisionSinkOptions): Layer.Layer<DecisionSink, never, AuditTrailPort> =>
  Layer.effect(DecisionSink, Effect.gen(function* () {
    ...
    const breaker = yield* makeCircuitBreaker({ failureThreshold: options?.failureThreshold ?? DEFAULT_FAILURE_THRESHOLD, resetTimeoutMs: ... });
```
Change the error to `InvalidAuditSinkOption` (type and the doc comment at :109/:120), and replace `:137` `Duration.fromInputUnsafe(options?.storeCallTimeout ?? DEFAULT_STORE_CALL_TIMEOUT)` with the checked decode. Do not touch :78 or :176 (Phase 48).

### `packages/audit/src/index.ts` (barrel)

Add `export * from "./InvalidAuditSinkOption.ts";` between `AuditWriteOutcome.ts` and `Retention.ts` (alphabetical; `[barrel-order]`). Not the checks module.

### `packages/audit/test/CircuitBreakerTransition.test.ts` (test, pure table + property)

**Analog:** `packages/react/test/HydrationSeedFields.test.ts:95-140` (seeded `FastCheck.assert(FastCheck.property(...))` inside plain `it`, literal numeric seed):
```typescript
FastCheck.assert(
  FastCheck.property(decisionArbitrary, FastCheck.boolean(), (decision, includeTrace) => { /* expect(...) */ }),
  { numRuns: 300, seed: 2026111501 },
);
```
Apply: plain `it`, no Effect/TestClock; table rows keyed by Q3 ids (O1..R4) as `[state, event, now] -> { next, announced }`, built from literal `StateClosed/StateOpen/StateHalfOpen` and `step({ failureThreshold, resetTimeoutMillis })`; property `{ numRuns: 1000, seed: 45 }` with the six statements in 45-RESEARCH.md Q10 (use `Equal.equals` for the claim reply). Imports: `import { describe, it } from "@effect/vitest"; import * as FastCheck from "fast-check"; import { step, ... } from "../src/CircuitBreaker.ts";` (note: `@effect/vitest`'s `it`, as in `CircuitBreaker.test.ts:1`).

### `packages/audit/test/CircuitBreakerTable.test.ts` and `CircuitBreakerOptions.test.ts` (adapter-level, base)

**Analog:** `CircuitBreaker.test.ts:1-16` header and `:618-634` model property:
```typescript
import { assert, describe, it } from "@effect/vitest";
import * as TestClock from "effect/testing/TestClock";
import { isolatedMetrics } from "@qadi/testing";
import { makeCircuitBreaker, transitionsTotal } from "../src/CircuitBreaker.ts";
const OPTIONS = { failureThreshold: 3, resetTimeoutMs: 10_000 };
```
Apply: Table reads status via `breaker.status`, announcements via `Metric.value(transitionsTotal...)` under `isolatedMetrics` (no `"qadi_..."` literal: `METRIC_ID_LITERAL_BUDGET`), generation via `Admitted.generation`. Options file: runtime-only (`Effect.exit(makeCircuitBreaker({failureThreshold: NaN, ...}))`, assert the squashed cause `_tag === "InvalidAuditSinkOption"`), no import of the new class so the RED commit type-checks (Pitfall 3); one row per bad value; record base behaviour per row (Pitfall 4). Leave `CircuitBreaker.test.ts` byte-unchanged; its 150-run model property (`seed: 52`) is the equivalence oracle after each converted event.

### Test edits
- `AuditSinkDeadline.test.ts:292-305` (`Duration.zero` becomes a refusal row) in the same commit as the validator. `:277-290` (`Duration.infinity`) stays under D-06a.
- `driveExit.ts:95`: `Effect.Effect<ExitObservation>` becomes `Effect.Effect<ExitObservation, InvalidAuditSinkOption>`; `Agreement.test.ts:31-32` likewise (`import type { InvalidAuditSinkOption } from "../src/index.ts"`).

### Mutation base and comparer

**Analog:** `44-01-PLAN.md:181-182` (run + writer) and `44-06-PLAN.md:134-140` (comparer). Retarget: config `stryker.audit.mjs`, report `reports/mutation-audit/mutation.json`, `NAMED=["packages/audit/src/CircuitBreaker.ts","packages/audit/src/AuditDecisionSinkLive.ts"]`, `DIRS=["packages/audit/src","packages/audit/test","packages/core/src","packages/testing/src"]`, `D=".planning/phases/QD-45-the-audit-circuit-breaker-as-one-transition-function/"`, outputs `45-mutation-base.json`/`45-mutation-after.json`. Command: `pnpm exec stryker run stryker.audit.mjs --mutate 'packages/audit/src/CircuitBreaker.ts,packages/audit/src/AuditDecisionSinkLive.ts'` in the background. Keep the stale-report refusal (a stale 17-mutant report exists on disk). New files (error, checks) are `new`, not compared. The 44 writer's trailer check hardcodes a model name; use this repo's current attribution trailer.

### Records

- **ADR-QD-158:** analog `spec/decisions/157-a-seeds-fields-are-the-wires-stated-once.md`: Document Control table (`Document ID QADI-ADR-158`, Revision, Effective Date 2026-11-15, Status `Accepted — amends ADR-QD-126`, Change History), then `## Context`, `## Decision`, `## Alternatives considered`, `## Consequences`, `## Related`. File `158-the-breakers-rules-are-one-transition-function.md`. Contrast BEH-QD-166 (`21-decision-cache.md:155-172`). `index.yaml` entry shape: `- id: "ADR-QD-158"` / `file:` / `title:` / `status: "Accepted — amends ADR-QD-126"`.
- **CCR-QD-436:** new row after `spec/README.md:372` (CCR-QD-435); name unused BEH-QD-562..565 and INV-QD-336 in it. Use `node scripts/spec-revise.mjs <doc> "<what>" --date 2026-11-15` per document; `pnpm spec:verify`.
- **Behaviours/invariants:** amend BEH-QD-249 (:35 signature fence, ` ```ts `), BEH-QD-251 (:215-218, :248-254), BEH-QD-379 (:304-305 stays; :342-344 zero becomes a refusal); new BEH-QD-561 after BEH-QD-489; INV-QD-335 after INV-QD-333; INV-QD-052 Source restated over `run`/`step`.
- **Overview:** `spec/overview.md:744-762`, add `InvalidAuditSinkOption` row near `AuditWriteError` (:749); update `AuditDecisionSinkOptions` row (:758).

### Changeset and upgrading

**Analog:** `.changeset/react-seed-fields-stated-once.md`:
```
---
"@qadi/react": minor
---

**Breaking.** ...what breaks...

See the 0.13 section of the upgrade guide, `/docs/reference/upgrading/`.
```
Apply: `"@qadi/audit": minor`, body begins `**Breaking.**` (layer error `never` becomes `InvalidAuditSinkOption`; zero/negative/non-finite option now refused; `Duration.infinity` for `storeCallTimeout` still accepted). `upgrading.md`: append `## 0.13: a breaker or audit sink option that cannot work is refused when it is built` after :716's entry; paragraph, ` ```ts ` Before fence, ` ```typescript ` After fence (compiled by `pnpm spec:website-examples`), then "The decision is [ADR-QD-158](https://github.com/leaderiop/qadi/blob/main/spec/decisions/158-the-breakers-rules-are-one-transition-function.md)."

## Shared Patterns

### Closed-union exhaustiveness
**Source:** `Matcher.ts` `referencesAction`; `CIRCUIT_BREAKER_STATUSES_BY_STATUS` in `CircuitBreaker.ts` (closed `Record`, TS2741 on a missing status). **Apply to:** `step`, `ENTER`, `admittedUnder`, every per-state matcher. No `switch`, no `Match.value`.

### Typed construction refusal
**Source:** `PortDerivation.ts:168-172`. **Apply to:** the three checks; refuse with `Effect.fail(new InvalidAuditSinkOption({ option, received }))`, never `Effect.orDie`.

### House rules in added lines
No `as`, `!`, `any`, `switch`, `Effect.fnUntraced`, `Date.now`; relative imports end `.ts`; `import type` for types; `effect/*` namespace imports; doc comments lead with a one-line summary. Scope greps use `/usr/bin/grep -F` (zsh `grep` is ugrep): `generation + 1` in added lines is exactly 1; `Ref.modify` in `CircuitBreaker.ts` is 1; `Match.value` is 0.

## No Analog Found

None. The nearest to a stretch is the pure `step` table test, which uses the react fast-check property for shape (no pure state-machine property exists in `packages/audit/test`).

## Metadata

**Analog search scope:** `packages/audit/src`, `packages/audit/test`, `packages/core/src` (Errors, PortDerivation, Matcher), `packages/react/test`, `.planning/phases/QD-44-*`, `spec/decisions`, `.changeset`, `apps/website/.../upgrading.md`
**Files scanned:** about 20 read or excerpted
**Pattern extraction date:** 2026-11-15
