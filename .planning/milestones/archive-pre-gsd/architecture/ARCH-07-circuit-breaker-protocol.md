---
id: ARCH-07
title: Move the half-open probe protocol out of AuditDecisionSinkLive and into the CircuitBreaker module
strength: Speculative   # from the 2026-10-02 architecture review
status: implemented (branch worktree-agent-a27b027832b9075cf, not merged)   # T1–T3 are unblocked (T3 needs D-07-c) and can start now; T5–T9 wait on D-07-a/b/f
evidence_verified_at: 1caf04c
depends_on: []
blocks: []
adrs_touched:
  - ADR-QD-056 (read: audit package, breaker "fully internal, no port"; no amendment planned)
  - ADR-QD-057 (read: signature harmonization; no effect on this plan)
  - ADR-QD-012 (read: deterministic time, Clock/TestClock only)
  - ADR-QD-025 (read: mutation testing; stryker.audit.mjs is gate 20)
  - ADR-QD-037 (read: madge circular-import gate)
  - ADR-QD-051 (read: a span says what was asked; naming of the new Effect.fn span)
  - ADR-QD-073 (read: UNTRACED_BUDGET; no new Effect.fnUntraced)
packages: [audit]
estimate: M   # T1–T4 ≈ ½ day; T5–T9 ≈ 1 day; T10–T11 ≈ ½ day
---

# ARCH-07 — Move the half-open probe protocol out of AuditDecisionSinkLive and into the CircuitBreaker module

## 1. Verified evidence (at `1caf04c`)

Everything below was re-read at `1caf04c`. Since the review, `effect` became a
peer dependency (`packages/audit/package.json`, `"effect": "catalog:peer"`) and
the installed version is now `4.0.0`
(`packages/audit/node_modules/effect/package.json:4`). Import paths in the two
files are already submodule-style (`effect/Effect`, `effect/Exit`, …), and the
tests import `TestClock` from `effect/testing/TestClock`
(`packages/audit/test/CircuitBreaker.test.ts:4`).

**How the suspected claims were settled.** I wrote throwaway vitest files in
the session scratchpad
(`/private/tmp/claude-502/…/scratchpad/cb/{probe,interrupt,stale,overcount,fixed}.test.ts`).
They import the real `packages/audit/src` modules by absolute path and run with
the same vitest instance `@effect/vitest` resolves:

```sh
P=$(readlink -f node_modules/.pnpm/@effect+vitest@4.0.0_effect@4.0.0_vitest@5.0.0/node_modules/vitest)
cd <scratch>/cb && $P/vitest.mjs run --config vitest.config.ts --root . --reporter=verbose --silent=false
```

Every scenario is written again as a real test in §6 (T1–T4), so the scratch
files are not needed to reproduce anything.

### C1. The breaker's interface is five separate effects — **CONFIRMED**

`packages/audit/src/CircuitBreaker.ts:54-128` declares `interface CircuitBreaker`
with `status` (:61), `recordSuccess` (:63), `recordFailure` (:65), `claimProbe`
(:90) and `releaseProbe` (:127). `makeCircuitBreaker` (:204-366) returns exactly
these five (:365). Each is a bare `Effect.Effect` value, not a function, so
AGENTS.md §5's `Effect.fn` rule does not apply to them today.

### C2. The legal sequencing lives in the sink — **CONFIRMED** (one detail **CHANGED**)

`packages/audit/src/AuditDecisionSinkLive.ts`, inside `record` (:127-284):

| Step | Review's description | HEAD |
| ---- | -------------------- | ---- |
| 1 | read status | `:158` `const initialStatus = yield* breaker.status` |
| 2 | on HalfOpen, claimProbe | `:160` `if (initialStatus === "HalfOpen" && !(yield* breaker.claimProbe))` |
| 3 | on a lost claim, re-read and map Closed/Open | `:161-162` `status = current === "Closed" ? "Closed" : "Open"` |
| 4 | derive isProbe | `:169` `const isProbe = status === "HalfOpen"` |
| 5 | attemptWrite | `:233-256`, write under `Effect.exit` at `:234` |
| 6 | recordSuccess / recordFailure | `:236` / `:251` |
| 7 | `Effect.onExit` → releaseProbe | `:279-283`, `Exit.isFailure(exit) ? breaker.releaseProbe : Effect.void` |

The quoted comment is at `:147-157`. Its exact wording is "A lost `claimProbe`
has two distinct causes a single `"Open"` fallback would conflate" (ticket #46).

**CHANGED detail that matters:** staging (`:176-213`, including
`stagingPort.stage(entry)` at `:184`) runs **after** the claim at `:160` and
**before** the `Effect.onExit` guard is installed at `:279`. So the claim lives
longer than the guard that is supposed to release it. C4b is the consequence.

### C3. SUSPECTED: "`attemptWrite` uses `Effect.exit` internally, so `Exit.isFailure` in the `onExit` wrapper fires only on defect or interruption" — **CONFIRMED as mechanics, with one correction**

`trailPort.write(entry)` runs under `Effect.exit` (`:234`), so a typed
`AuditWriteError` never reaches `attemptWrite`'s own error channel. The `onExit`
at `:280-281` therefore sees `Exit.isFailure` only in two cases: a defect inside
the steps after the write (`recordSuccess`/`recordFailure`, `commitStaged`'s
handler, metric updates), or an interruption.

**Correction (effect 4.0.0):** `Effect.exit` does **not** capture a *caller's*
interruption, such as `Fiber.interrupt`, a client disconnect, or an
`Effect.timeout` around `sink.record`. I tested this with a scratch program:
`Effect.onExit(Effect.gen(function* () { yield* Effect.exit(never); log("next step") }), …)`,
forked and then interrupted. Only the `onExit` line logged, and the step after
`Effect.exit` never ran. With the real breaker (scratch D), the calls were
`["releaseProbe"]`, ending at status `Open`. So for a caller-interrupted probe,
`releaseProbe` is the **primary** release path, not the "fallback for the
narrower window after that" that the comments describe (see C7).

### C4. SUSPECTED consequence: "a failed probe write could wedge a half-open breaker with a claim never released" — **REFUTED**

A typed failure on the probe write becomes an `Exit.Failure` at `:234`. Control
then goes to the `else` branch, which runs `breaker.recordFailure` (`:251`).
`recordFailure`'s `HalfOpen` branch (`CircuitBreaker.ts:302-313`) moves the
breaker to `Open`, sets `probeClaimed: false`, `openedAt: now` and
`halfOpenAt: undefined`. The claim is released by `recordFailure` itself, and
`releaseProbe` is never needed.

Driven through the real `AuditDecisionSinkLive` (scratch A and B, both pass):

- **A, typed `AuditWriteError` on the probe:** 5 failures, then +30 s, then the
  probe fails (write attempt 6). An immediate `record` skips the write (attempts
  stay at 6). After another +30 s a fresh probe is admitted (attempt 7) and
  succeeds, and the next `record` writes (attempt 8). No wedge.
- **B, defecting probe (`Effect.die`):** the result is identical. `Effect.exit`
  folds the defect, so `recordFailure` runs.

There is also a third safety net. `status` ages out a stale `HalfOpen` once
`resetTimeoutMs` has passed since `halfOpenAt` (`CircuitBreaker.ts:245-257`). So
even a claim that is never released cannot wedge the breaker *permanently*. The
unit test at `CircuitBreaker.test.ts:101-134` pins this.

### C4b. Found while settling C4: the probe claim is held outside its guard — **CONFIRMED defect (bounded, not a permanent wedge)**

Suppose the probe's fiber is interrupted anywhere between `claimProbe` (`:160`)
and the moment `Effect.onExit` is entered (`:279`). The most realistic case is
during a slow `stagingPort.stage` (`:184`). Then neither `recordFailure` nor
`releaseProbe` runs. The breaker stays `HalfOpen` with `probeClaimed: true`
until the age-out at `CircuitBreaker.ts:245-257` fires, and that age-out only
starts *another* full `resetTimeoutMs` of `Open`.

Scratch E drives this. Staging hangs on the probe's `stage`, the test
interrupts the probe, and then:

| | HEAD | Prototype fix (`acquireUseRelease` around claim → settle) |
| - | ---- | ---- |
| write attempts at +30 s after the interrupt | **5** (no probe admitted; every `record` in the window is treated as `Open`) | **6** (probe admitted, succeeds, closes) |
| write attempts at +60 s | 6 | 7 |

The impact is that recovery takes 2× `resetTimeoutMs` instead of 1×. During the
extra window, an unwired deployment drops entries with the "circuit breaker open"
warning (`:200-212`) even though the store may already be healthy. The age-out
also announces an `Open` transition and adds one to `consecutiveFailures` for a
write that never failed. The cause is architectural: the claim's lifetime and
the guard's scope are chosen separately, at the call site, by hand.

### C5. Found while settling: a failure landing on an already-`Open` breaker re-announces `Open` and restarts the window — **CONFIRMED defect**

`recordFailure` (`CircuitBreaker.ts:299-330`) has no `Open` branch. When it
runs while the breaker is already `Open`, it increments `consecutiveFailures`,
finds the count still ≥ `failureThreshold`, and returns `[true, {status: "Open",
openedAt: now, …}]` (`:314-326`). That **restarts `openedAt`** and calls
`announceTransition("Open")` again. This contradicts `announceTransition`'s own
doc comment (`:195-199`: "never called for a `Ref.modify` that left status
unchanged").

It is reachable from the sink: under `filter`/`filterStream` fan-out, writes
admitted while `Closed` can settle after the trip. Scratch I (threshold 3, three
failures, +9 s, one late failure, +2 s) gives status still `Open` at 11 s
(10 s reset), and transition occurrences `Open = 2`.

INV-QD-052's concurrency test (`CircuitBreaker.test.ts:223-252`) fires
*exactly* `failureThreshold` failures, so it never sees this.

### C6. Found while settling: outcomes cross half-open windows — **CONFIRMED behavior (design question, not filed as a defect)**

Scratch H runs this sequence. A write is admitted while `Closed`. The breaker
trips and goes `HalfOpen`, and B claims the probe. Then A's late failure arrives
and runs `recordFailure` on B's window, which reopens it (`:302-313`). Then B's
probe success runs `recordSuccess` on `Open`, which leaves it `Open` (`:294`).
Result: `{"aAdmittedAs":"Closed","afterA":"Open","afterB":"Open"}`. The probe's
evidence is discarded, and recovery waits another `resetTimeoutMs`. Whether a
stale outcome should affect a newer window is D-07-d.

### C7. Doc claims about interruption — **partially REFUTED**

These four places claim that an interrupted write reaches `recordFailure`:

- `CircuitBreaker.ts:22-29`: "`recordFailure` itself now covers a defecting or interrupted probe write directly".
- `CircuitBreaker.ts:110-116`: "a defecting or interrupted write already reaches `recordFailure` directly".
- `AuditDecisionSinkLive.ts:258-263`.
- BEH-QD-251's prose (`spec/behaviors/33-audit-pipeline.md:126-135`: "`Effect.exit` folds every way `write` can conclude — success, typed failure, defect, interruption").

The claim holds only when the **adapter interrupts itself**. Scratch F has
`write` return `Effect.interrupt` with threshold 2, and the breaker trips after
2 attempts. It does not hold for a **caller** interruption. In scratch G, two
caller-interrupted writes in `Closed` did not trip the threshold-2 breaker
(attempt 3 still happened), and in scratch C/D only `releaseProbe` ran. BEH-QD-251's
REQUIREMENT text ("an unexpected defect/interruption **from a misbehaving store
adapter**") is still accurate. The prose and the code comments are not.

### C8. "Only one caller exists" — **CONFIRMED for sources; CHANGED for reachability**

`grep -rn makeCircuitBreaker packages/*/src` finds one call site,
`AuditDecisionSinkLive.ts:122`, plus the definition. The module is not in the
barrel (`packages/audit/src/index.ts`). It is still **importable by consumers**
as `@qadi/audit/CircuitBreaker` through the `"./*"` wildcard export
(`packages/audit/package.json:28`). `spec/overview.md:700` records this in its
"Not listed above" table: "reachable via `@qadi/audit/CircuitBreaker`". Changing
the interface is therefore a breaking change to a reachable export, even though
nothing in this repository outside the sink imports it (D-07-b).

### C9. Baseline test run — **CONFIRMED green, with one tooling caveat**

`pnpm exec vitest run --project audit` (repo root) passes 111 tests, 12 files.
`pnpm exec vitest run --project audit packages/audit/test/CircuitBreaker.test.ts packages/audit/test/AuditDecisionSinkLive.test.ts`
passes 30 tests.

**Caveat:** `pnpm --filter @qadi/audit test` fails at HEAD in all 12 files with
`TypeError: Cannot read properties of undefined (reading 'config')`. The cause is
two vitest instances: `packages/audit/node_modules/vitest` resolves to a
different `.pnpm` path than `@effect/vitest`'s peer. Use the root `--project audit`
form everywhere in this plan. Fixing the filter form is out of scope (§3).

### C10. Effect APIs this plan relies on exist in `effect@4.0.0`

`Effect.acquireUseRelease` (`node_modules/effect/src/Effect.ts:13185`; it
acquires uninterruptibly), `Effect.onExit` (:13662), `Effect.uninterruptibleMask`
(:14736) and `Effect.exit` (:3772) all exist. I also checked a generic
`Effect.fn("…")(function* <A, E, R>(use: (permit: Permit) => Effect<A, E, R>) { … })`
against an interface property typed `<A, E, R>(use) => Effect<A, E, R>`. It
type-checks under the repo's `tsconfig.base.json` (scratch `proto/Proto.ts`, `tsc`
clean), so a named, traced, generic entry point is expressible without `as`.

### C11. Uncommitted work on the current branch shifts some cited lines

While this plan was written, the working tree of branch `ci/stryker-ignore-static`
picked up uncommitted edits that are not part of `1caf04c`:

- `stryker.audit.mjs` gains `ignoreStatic: true` (ADR-QD-076, untracked
  `spec/decisions/076-mutation-runs-skip-static-mutants.md`), so mutants in
  module-load-time code are skipped. This affects `CircuitBreaker.ts`'s
  `CIRCUIT_BREAKER_STATUSES*`/`transitionsTotal` and the sink's metric
  constants.
- `spec/traceability.md` gains one row, which moves `:297`/`:299` to `:298`/`:300`.

The `file:line` references in this plan are to `1caf04c`. Re-anchor them with
`grep` if that branch lands first. The plan does not depend on either edit.

## 2. Goal and success criteria

**Goal.** Deepen the `CircuitBreaker` module so the half-open probe protocol is
its own implementation detail. That protocol is: read status, claim, re-read on a
lost claim, settle, and release on every exit path. Today the module's interface
is five shallow effects whose legal order, and the lifetime of the one claim they
share, exist only as a convention inside `AuditDecisionSinkLive.record`. C4b
shows the cost: the sink scoped the release guard to the write instead of to the
claim, and nothing in the interface could have stopped it.

After the change, the interface has one admission entry point (a "guarded run":
see D-07-a) plus a read-only `status`. The claim is acquired and released inside
the module, so the claim's lifetime and its guard have **locality**: one place,
one scope. The sink, the module's only adapter-side caller, decides only *what a
write is* and *what to do around it* (staging, metrics, commit). It no longer
decides *when a write is allowed* or *how the breaker learns its outcome*.

The leverage is modest because there is one caller. The depth gain is real
because the five-member interface becomes one or two members with the same
behavior behind it. Independently of the refactor, the defects found while
verifying (C4b, C5, C7) are fixed test-first.

**Success criteria** (each checkable):

1. A test in `AuditDecisionSinkLive.test.ts` interrupts a probe while `stage`
   hangs, then shows a probe is admitted exactly `resetTimeoutMs` later. It fails
   at `1caf04c` and passes after T1:
   `pnpm exec vitest run --project audit packages/audit/test/AuditDecisionSinkLive.test.ts`.
2. Sink-level tests show that a typed-failing and a defecting probe write both
   reopen the breaker and re-probe after exactly `resetTimeoutMs` (T2). These
   permanently settle the review's suspicion.
3. A failure landing on an already-`Open` breaker counts **no** transition. Firing
   `failureThreshold + 5` concurrent failures records exactly one `Open` in
   `qadi_audit_circuit_breaker_transitions_total` (T3).
4. `grep -nE "claimProbe|releaseProbe|recordSuccess|recordFailure" packages/audit/src/AuditDecisionSinkLive.ts`
   prints nothing (T7).
5. `CircuitBreaker`'s interface has at most two members (`status` plus the
   admission entry point chosen in D-07-a), and `claimProbe`/`releaseProbe`/
   `recordSuccess`/`recordFailure` are not members of it:
   `grep -n "readonly " packages/audit/src/CircuitBreaker.ts` within the interface block (T5).
6. No comment or spec text says a *caller*-interrupted write reaches
   `recordFailure`. `grep -rn "interrupted write already reaches\|or is interrupted already reaches\|interrupted probe write directly" packages/audit/src spec/`
   prints nothing (T4).
7. `pnpm exec vitest run --project audit` is green. `pnpm coverage` keeps
   `packages/audit/src/**` at ≥ 90% on every axis (`vitest.config.ts:70-75`).
8. `pnpm exec stryker run stryker.audit.mjs` scores ≥ 80% (break threshold), and
   no lower than the 92% recorded in `spec/decisions/056-audit-companion-package.md:279`
   unless the drop is explained in the CCR.
9. `node scripts/check-house-style.mjs` passes with `SWITCH_BUDGET`,
   `UNTRACED_BUDGET`, `ANY_BUDGET`, `SCHEMA_ERROR_BUDGET` and `HAS_CUSTOM_BUDGET`
   unchanged (no edits to `scripts/check-house-style.mjs`).
10. `pnpm check` is green end to end, including gate 13
    (`node scripts/check-api-surface.mjs`) with the new `CircuitBreaker.ts`
    exports named in `spec/overview.md`'s "Not listed above" row.

## 3. Non-goals

- **Converting `record` itself to `Effect.fn`.** `record` (`AuditDecisionSinkLive.ts:127`)
  is an arrow that returns `Effect.gen`, which is a §5 deviation that predates
  this plan. Giving every decision record a span is an observability decision
  (ADR-QD-051), not part of moving the probe protocol, so it belongs in its own
  change.
- **Gap-marker entries for entries dropped while `Open`.** ADR-QD-056 lists this
  under Consequences — Negative (`:250-262`) as needing its own grilling session.
- **Changing defaults** (`failureThreshold` 5, `resetTimeoutMs` 30 000:
  `AuditDecisionSinkLive.ts:52-53`).
- **Making the breaker a `Context.Service` or a port.** ADR-QD-056 (`:113-121`)
  keeps it "fully internal, no port". It stays a plain value built inside the
  `Layer`, so AGENTS.md §2's `…Shape` naming does not apply.
- **Re-shaping `@qadi/audit`'s `"./*"` wildcard export** to hide internal
  modules. That policy affects every package. D-07-b only decides how to treat
  this module's break.
- **Fixing `pnpm --filter @qadi/audit test`** (C9 caveat). It is a tooling issue
  unrelated to the breaker. Raise it separately.
- **Counting caller interruptions as store failures**, unless D-07-e chooses
  otherwise. The recommended semantics keep today's behavior and only document
  it.

## 4. Constraints

| Constraint | Consequence for this plan |
| ---------- | ------------------------- |
| AGENTS.md §1 (submodule imports, `.ts` extensions, `import type`) | New imports are `import * as Data from "effect/Data"`, `import * as Match from "effect/Match"`. `Exit` stays a value import in the sink (it uses `Exit.isSuccess`). |
| AGENTS.md §4 (`Data.TaggedError` default; no `orDie` in enforcement paths) | The admission outcome is **not** an error. `Refused` is a `Data.TaggedClass` value, not an error, so `SCHEMA_ERROR_BUDGET` is unaffected and BEH-QD-251's "No public error type MAY be constructed for a tripped breaker" still holds. No `Effect.orDie` anywhere. |
| AGENTS.md §5 (`Effect.fn`) and ADR-QD-073 (`UNTRACED_BUDGET`) | The new entry point is a *function*, so it must be `Effect.fn("qadi.audit.circuitBreaker.withPermit")` (name per D-07-a). `Effect.fnUntraced` is not allowed: the budget is pinned to `packages/core/src/Evaluate.ts: 3` (`scripts/check-house-style.mjs:362-365`). One span per `record` costs ≈2.7–2.9 µs (AGENTS.md §5), which is negligible next to a store write. |
| AGENTS.md §5a (`Match`, not `switch`; `SWITCH_BUDGET`) | Dispatch on `Permit._tag` in the sink and on `State._tag` in the breaker (if D-07-f picks a tagged state) uses `Match.tagsExhaustive`. A per-call `Match.value` is acceptable here: §5a's hoisting advice targets per-node evaluation, and `record` is I/O-bound. No new `switch`. |
| AGENTS.md §6 (no `as`, `!`, `any`; no `Date.now`) and ADR-QD-012 | All time comes from `Clock.currentTimeMillis`. Tests use `TestClock.adjust`. `as const` is allowed (the `no-type-assertion` rule exempts it, `scripts/check-house-style.mjs:135-145`), but prefer typed literals in new code. A field-less variant uses the repo idiom `Data.TaggedClass("Refused")<Record<never, never>>` (`packages/devtools/src/model/Selection.ts:17`), not `{}` or `Record<string, unknown>` (user memory note). |
| User memory: closed unions over widening | `Permit` is the full closed union `Refused \| Admitted`. If D-07-f adopts a tagged `State`, it is `Closed \| Open \| HalfOpen` with per-variant fields, not a flat record with "set iff" comments (`CircuitBreaker.ts:133-142`, `:258-262`). `CircuitBreakerStatus` stays a closed literal union, and `CIRCUIT_BREAKER_STATUSES_BY_STATUS` (`:154-158`) keeps its exhaustiveness trick. |
| AGENTS.md §9 (barrels) | `CircuitBreaker.ts` stays out of `packages/audit/src/index.ts`. |
| AGENTS.md §10 (tests; coverage 90% for audit) | Tests use `@effect/vitest` (`it.effect`, `TestClock`). Coverage thresholds are `vitest.config.ts:70-75`. |
| AGENTS.md §11, §15 (spec normative; gate 13) | BEH-QD-251, INV-QD-052 and the traceability matrix change in the same PR as behavior (T10). New exports of `CircuitBreaker.ts` (`Permit`, `Admitted`, `Refused`, plus any renamed type) must appear in `spec/overview.md:700`, or `node scripts/check-api-surface.mjs` fails. |
| ADR-QD-056 (audit package) | The breaker remains "fully internal, no port", "Trips only on `AuditWriteError`, not `AuditStagingError`", and "While open, `record()` still calls `stage()` if wired … but skips `write()`". The refactor must keep staging running on `Refused`. |
| ADR-QD-057 | Read only. The signature capture path is wired through `ObligationHandler`, not `DecisionSink` (`AuditDecisionSinkLive.ts:18-21`), so it is untouched. |
| ADR-QD-037 (`madge --circular`, gate 5) | `Permit` lives in `CircuitBreaker.ts` and the sink imports from it. That is one direction, so no cycle. No new file is required. If one is added (D-07-a option B/E variants), it must not import the sink. |
| ADR-QD-025, `stryker.audit.mjs` (gate 20) | `mutate: packages/audit/src/**/*.ts` minus `index.ts`, break 80 (`stryker.audit.mjs:27-35` at `1caf04c`). The moved protocol must be killed by tests at the breaker level, not only through the sink. If ADR-QD-076's `ignoreStatic: true` lands first (C11), keep new protocol logic out of module-scope initializers so it stays inside the mutated set. Example: build `Refused` per call inside `withPermit`, or accept that a module-level `const REFUSED = new Refused()` is unmutated. |
| INV-QD-052 (single `Ref.modify` per transition) | Every transition, including the new admission and settle steps, stays one `Ref.modify`. Admission (status → claim → re-read) may span several `Ref.modify` calls, but it runs inside `acquireUseRelease`'s uninterruptible acquire, so there is no gap in which a fiber can be cut off while holding an unguarded claim. |

## 5. Decisions needed before work starts

### D-07-a — Shape of the admission entry point

The sink must know the admission result **before** the write, because staging
runs in between and its metric outcome (`failed` vs `failed_open`, `skipped_open`)
depends on it (`AuditDecisionSinkLive.ts:176-215`). After the write it needs the
write's `Exit` (for `commitStaged` and `writesWritten`/`writesWriteFailed`). Any
shape has to support both.

| Option | Plain-words shape | For | Against |
| ------ | ----------------- | --- | ------- |
| **A. `withPermit(use)`** (callback, `acquireUseRelease` inside) | `breaker.withPermit((permit) => …)`. `permit` is `Refused` or `Admitted { probe, attempt }`. `attempt(write)` runs the write under `Effect.exit`, records the outcome on the breaker (first call only) and returns the `Exit`. The breaker acquires uninterruptibly and releases an unsettled probe on any exit of `use`. | The claim's lifetime equals the callback's scope by construction, which closes C4b structurally. No `Scope` in the sink's types. The sink keeps full control of staging and metrics. It mirrors `acquireUseRelease`, an idiom Effect users already know. Prototype type-checks (C10). | Inversion of control. `attempt` must be single-use: a second call has to be defined (proposal: it runs the write but does not record). |
| B. `admit: Effect<Permit, never, Scope.Scope>` | Same `Permit`, with release registered on the caller's `Scope` (`Effect.acquireRelease`). The sink wraps the body in `Effect.scoped`. | Linear code, no callback. | `Scope` appears in the sink's types. Release timing is tied to the scope's close rather than to "the probe settled", which is subtler to reason about. |
| C. `run(write, { beforeWrite })` | The breaker runs the whole thing and calls a hook with the admission result so the caller can stage. | The fewest moving parts at the call site. | The breaker learns a staging-shaped hook, which leaks the sink's concerns into the module and makes it shallower in the wrong direction. |
| D. `admit` + `settle(permit, exit)` without scope | A pure decision and an explicit settle. | Simple. | Does not fix C4b: the caller still has to install its own guard. This moves code without adding depth. |
| E. No refactor | Keep five primitives and land only T1–T4. | Least churn. One caller. | The protocol stays a call-site convention. C4b's root cause (claim lifetime chosen by hand) remains for the next edit. |

**Recommendation: A**, with `attempt` recording only the first outcome per
permit, and the span named `qadi.audit.circuitBreaker.withPermit`, annotated with
the permit's tag and `probe` via `Effect.annotateCurrentSpan`, per ADR-QD-051's
"a span says what was asked". If the reviewer rejects the refactor, fall back to
**E**. T1–T4 already fix every defect found.

`status: decided (2026-10-04, recommended default)`

### D-07-b — What stays exported from `CircuitBreaker.ts`, and how to version the break

The interface currently exposes five members and is reachable as
`@qadi/audit/CircuitBreaker` (C8).

- **(i) Narrow and accept the break.** The interface becomes `status` plus the
  D-07-a entry point. The primitives become module-local. A changeset bumps
  `@qadi/audit` (the fixed group in `.changeset/config.json` bumps all public
  packages together) as `minor` (pre-1.0 breaking), and `spec/overview.md:700` is
  updated.
- (ii) Keep the five primitives exported beside the new entry point, marked
  "low-level". This layers instead of replacing, the protocol stays callable out
  of order, and the depth gain is lost.
- (iii) Narrow, and also block the subpath with `"./CircuitBreaker": null` in the
  exports map. This is truly internal, but it edits the exports map for one file
  and interacts with gate 14 (`check-package-install.mjs`). It is out of scope
  per §3.

**Recommendation: (i)**, and keep `status` as the read-only observation channel.
`transitionsTotal`'s doc comment (`CircuitBreaker.ts:178-188`) names
`CircuitBreaker.status` as the way to ask "which state right now", and tests use
it.

`status: decided (2026-10-04, recommended default)`

### D-07-c — A failure that lands on an already-`Open` breaker (C5)

- **(i) Ignore it for state.** No transition is announced and `openedAt` is not
  restarted. The open window is measured from the trip.
- (ii) Do not announce, but restart `openedAt`. This silently extends the window,
  treating late failures as fresh evidence.
- (iii) Keep today's behavior. This leaves the metric over-count, which
  contradicts `CircuitBreaker.ts:195-199`.

**Recommendation: (i).** A write admitted before the trip and settling after it
is not new evidence about the store's state after the trip. Restarting the window
lets a burst of in-flight failures from one fan-out push recovery out by up to
`resetTimeoutMs` per straggler. (i) is also what D-07-d's generation check
produces automatically, so the two decisions agree.

`status: decided (2026-10-04, recommended default)`

### D-07-d — Outcomes that cross half-open windows (C6)

- **(i) Generation-tagged permits.** `State` carries a `generation` that
  increments on every status transition. `Admitted` captures it. `attempt`
  records an outcome only if the generation still matches. Otherwise the outcome
  is ignored by the breaker, but the sink still meters it (`write_failed` /
  `written`).
- (ii) Keep today's behavior. Any outcome applies to whatever window is current.

**Recommendation: (i)**, landed as T8 after the refactor. It makes C5 and C6
structurally impossible rather than patched. It also gives `releaseProbe`'s
"cannot steal a different claim" argument (`CircuitBreaker.ts:340-346`) a
mechanical basis instead of a timing argument.

`status: decided (2026-10-04, recommended default)`

### D-07-e — Caller interruption of a non-probe write (C7)

- **(i) Not a store failure.** Document and pin today's behavior: a
  caller-interrupted `Closed`-state write records nothing. A caller-interrupted
  probe releases its claim (breaker → `Open`). An adapter that interrupts itself
  is a failure (it is folded by `Effect.exit`).
- (ii) Count caller interruption as a failure. A cancellation storm, such as
  clients disconnecting, would then trip the breaker on a healthy store.

**Recommendation: (i).** Change the prose, not the behavior.

`status: decided (2026-10-04, recommended default)`

### D-07-f — Internal state representation

- **(i) Tagged union** `Closed { consecutiveFailures } | Open { openedAt } | HalfOpen { halfOpenAt, probeClaimed }`
  (plus `generation` if D-07-d(i)), each a `Data.TaggedClass`, with transitions
  dispatched by `Match.tagsExhaustive`. "`openedAt` set iff `Open`"
  (`CircuitBreaker.ts:258-262`) becomes a type fact. It also removes the
  unobservable inconsistency where `releaseProbe` and the age-out do
  `consecutiveFailures + 1` (`:251`, `:355`) while `recordFailure` from `HalfOpen`
  sets `1` (`:307`).
- (ii) Keep the flat `State` record (`:130-143`).

**Recommendation: (i)**, consistent with the closed-union preference. It is
internal, so there is no export cost.

`status: decided (2026-10-04, recommended default)`

## 6. Tasks

### T1 — Release the probe claim on every exit from the moment it is claimed (test-first defect fix, C4b)
- **Status:** [x] done
- **Depends on:** —
- **Files:** `packages/audit/test/AuditDecisionSinkLive.test.ts`, `packages/audit/src/AuditDecisionSinkLive.ts`
- **Steps:**
  1. Add the test below to the `describe` block in `AuditDecisionSinkLive.test.ts`, after the existing interruption test (`:249-326`). Import `AuditStagingPort` from `../src/AuditStagingPort.ts`; the file already imports `AuditStagingError` from there.
     ```ts
     it.effect(
       "a probe interrupted while staging releases its claim at once — the next probe comes " +
         "resetTimeoutMs later, not twice that",
       () =>
         Effect.gen(function* () {
           let writeAttempts = 0;
           const stageStarted = yield* Latch.make();
           const trail = Layer.succeed(AuditTrailPort, {
             write: (entry) => {
               writeAttempts++;
               return writeAttempts <= 5
                 ? Effect.fail(new AuditWriteError({ entry, cause: "offline" }))
                 : Effect.void;
             },
           });
           const staging = Layer.succeed(AuditStagingPort, {
             stage: (entry) =>
               entry.record.evaluationId === "probe"
                 ? stageStarted.open.pipe(Effect.andThen(Effect.never))
                 : Effect.succeed(0),
             commit: () => Effect.void,
           });
           yield* Effect.gen(function* () {
             const sink = yield* DecisionSink;
             for (let i = 0; i < 5; i++) yield* sink.record(decisionRecord({ evaluationId: `fail-${i}` }));
             yield* TestClock.adjust("30 seconds");
             const probe = yield* Effect.forkChild(sink.record(decisionRecord({ evaluationId: "probe" })));
             yield* stageStarted.await; // the claim is held; staging is in flight
             yield* Fiber.interrupt(probe);
             yield* TestClock.adjust("30 seconds");
             yield* sink.record(decisionRecord({ evaluationId: "recovered" }));
             assert.strictEqual(writeAttempts, 6, "a fresh probe is admitted one resetTimeoutMs after the interrupt");
           }).pipe(Effect.provide(Layer.provideMerge(AuditDecisionSinkLive(), Layer.mergeAll(trail, staging))));
         }),
     );
     ```
  2. Run it and confirm it **fails** with `expected 5 to equal 6`. This reproduces scratch E.
  3. In `record`, replace the block from `:158` (`const initialStatus = …`) through `:283` with one `Effect.acquireUseRelease`:
     - **acquire**: the existing status → `claimProbe` → re-read logic (`:158-163`), returning the resolved `status` (`"Closed" | "Open" | "HalfOpen"`, where `"HalfOpen"` means "this call holds the claim").
     - **use** `(status) => Effect.gen(…)`: the existing staging block (`:176-213`), `if (status === "Open") return;` (`:215`), and `yield* attemptWrite` (`:233-256`), all unchanged.
     - **release** `(status, exit) => status === "HalfOpen" && Exit.isFailure(exit) ? breaker.releaseProbe : Effect.void`.
     - Delete `isProbe` (`:169`) and the old `Effect.onExit` (`:279-283`).
  4. Rewrite the comment that sat above `:279`. State that the claim is acquired uninterruptibly and released by the `acquireUseRelease` finalizer on any non-success exit of the staging-plus-write body, so no instant exists in which the claim is held unguarded. Cite this plan's CCR (`CCR-QD-NEXT`). Do not repeat the caller-interruption claim; T4 corrects it.
  5. Keep this interim shape small. T7 replaces it.
- **Tests:** the new test (red → green). The existing `"an interrupted half-open probe releases its claim — H4 …"` test (`:249-326`) must stay green unchanged.
- **Verify:** `pnpm exec vitest run --project audit packages/audit/test/AuditDecisionSinkLive.test.ts` then `pnpm exec vitest run --project audit`
- **Done when:** the new test failed before step 3 and passes after it, and the whole audit project (111 tests at `1caf04c`, plus the new one) passes.

### T2 — Pin the settled suspicion: a failed or defecting probe write reopens and re-probes (tests only)
- **Status:** [x] done
- **Depends on:** — (independent of T1; green at HEAD)
- **Files:** `packages/audit/test/AuditDecisionSinkLive.test.ts`
- **Steps:**
  1. Add `"a half-open probe whose write fails reopens the breaker and a fresh probe follows one resetTimeoutMs later — no wedge"`. Use a trail that fails attempts 1–6 with `AuditWriteError` and succeeds after that. Trip it with 5 records, `TestClock.adjust("30 seconds")`, and record `probe-fails` (assert attempts = 6). Record again immediately (assert still 6, because the breaker is `Open`). Adjust 30 s and record `probe-2` (assert 7). Record `closed` (assert 8, because the breaker is `Closed`).
  2. Add the same scenario with attempt 6 returning `Effect.die(new Error("caller's trail store bug"))` (scratch B).
  3. Add a comment on both tests that names the review's suspicion and how `recordFailure`'s `HalfOpen` branch releases the claim. A reader who wonders about the wedge again then finds the answer.
- **Tests:** two new sink-level tests. These kill mutants on the sink → `recordFailure` path that `CircuitBreaker.test.ts:74-84` covers only at unit level.
- **Verify:** `pnpm exec vitest run --project audit packages/audit/test/AuditDecisionSinkLive.test.ts`
- **Done when:** both pass at HEAD and after T1.

### T3 — A failure landing on an already-`Open` breaker is not a transition (test-first defect fix, C5)
- **Status:** [x] done
- **Depends on:** D-07-c
- **Files:** `packages/audit/test/CircuitBreaker.test.ts`, `packages/audit/src/CircuitBreaker.ts`
- **Steps:**
  1. Add a scripted test: `{ failureThreshold: 3, resetTimeoutMs: 10_000 }`, three failures, `TestClock.adjust("9 seconds")`, one more `recordFailure`, `TestClock.adjust("1 second")`. Assert `status === "HalfOpen"` (D-07-c (i): the window is measured from the trip). Wrap it in `isolatedMetrics` (`test/helpers.ts:23-27`) and assert the `Open` occurrences are `1`.
  2. Extend the concurrency `describe` (`:223-252`) with a sibling: `failureThreshold: 25`, **30** concurrent `recordFailure`s, then assert `Open` occurrences are exactly `1` and status is `Open`. At HEAD this counts 6.
  3. Run both and confirm they fail. Expected at HEAD: status `Open` at 10 s, and occurrences 2 and 6.
  4. In `recordFailure`'s `Ref.modify` (`:301-328`), add an `Open` case before the threshold arithmetic that returns `[false, state]` unchanged (D-07-c (i)). If D-07-c chose (ii), return `[false, { ...state, openedAt: now }]` instead, and change the step-1 assertion to `Open`.
  5. Update the `recordFailure` interface doc (`:64-65`) with one line: "A no-op while `Open`: a write admitted before the trip and settling after it is not evidence about the store since."
- **Tests:** two new tests (red → green). All existing `CircuitBreaker.test.ts` tests stay green.
- **Verify:** `pnpm exec vitest run --project audit packages/audit/test/CircuitBreaker.test.ts packages/audit/test/Metrics.test.ts`
- **Done when:** both new tests failed before step 4 and pass after it, and `Metrics.test.ts`'s transition tests (`:126-260`) are unchanged and green.

### T4 — Correct the interruption claims and pin caller-interruption semantics (C7, D-07-e)
- **Status:** [x] done
- **Depends on:** D-07-e (only for the wording in step 4; steps 1–3 hold under either choice)
- **Files:** `packages/audit/test/AuditDecisionSinkLive.test.ts`, `packages/audit/src/CircuitBreaker.ts`, `packages/audit/src/AuditDecisionSinkLive.ts`, `spec/behaviors/33-audit-pipeline.md`
- **Steps:**
  1. Add test `"an adapter that interrupts itself is a write failure and trips the breaker"`: `write: () => Effect.interrupt`, `failureThreshold: 2`, three records, assert attempts = 2. This is scratch F, green at HEAD.
  2. Add test `"a caller's interruption of a Closed-state write is not a store failure"`: `failureThreshold: 2`, two writes that each open a latch then `Effect.never`, both forked and interrupted, then a third record; assert attempts = 3. This is scratch G, green at HEAD under D-07-e (i).
  3. Rewrite `CircuitBreaker.ts:22-29` and `:98-126`, and `AuditDecisionSinkLive.ts:217-232` (plus whatever T1 left of `:258-278`), so they say: `Effect.exit` folds a typed failure, a defect, and an adapter's self-interruption into `recordFailure`. A *caller's* interruption is not folded by `Effect.exit` (the fiber itself is interrupted), so for a probe the release finalizer (`releaseProbe`) is the primary path and for a non-probe write nothing is recorded. Keep the ticket #38/#47 history as one sentence each. Follow AGENTS.md's doc-comment shape: summary line first, then the why.
  4. In BEH-QD-251 (`spec/behaviors/33-audit-pipeline.md:126-135`), replace "folds every way `write` can conclude — success, typed failure, defect, interruption" with the same three-way statement, and add a sentence for D-07-e's chosen semantics. T10 handles the Change History and CCR.
- **Tests:** two new pinning tests.
- **Verify:** `pnpm exec vitest run --project audit` and `grep -rn "interrupted write already reaches\|or is interrupted already reaches\|interrupted probe write directly" packages/audit/src spec/` (expect no output)
- **Done when:** both tests pass and the grep is empty.

### T5 — Deepen `CircuitBreaker`: one admission entry point, primitives made module-local
- **Status:** [x] done
- **Depends on:** D-07-a, D-07-b, D-07-f (T1–T4 landed first, so behavior is pinned before the move)
- **Files:** `packages/audit/src/CircuitBreaker.ts`
- **Steps** (written for D-07-a = A, D-07-b = (i), D-07-f = (i); adjust names if the decisions differ):
  1. Add the permit union beside `CircuitBreakerStatus`:
     ```ts
     /** No write this time: the breaker is Open, or another caller holds this half-open window's probe. */
     export class Refused extends Data.TaggedClass("Refused")<Record<never, never>> {}
     /** A write may be attempted; `probe` is true when it is this half-open window's one trial write. */
     export class Admitted extends Data.TaggedClass("Admitted")<{
       readonly probe: boolean;
       readonly attempt: <A, E, R>(write: Effect.Effect<A, E, R>) => Effect.Effect<Exit.Exit<A, E>, never, R>;
     }> {}
     export type Permit = Refused | Admitted;
     ```
  2. Replace `interface CircuitBreaker` (`:54-128`) with two members: `status` (keep its doc comment, `:55-61`) and
     `readonly withPermit: <A, E, R>(use: (permit: Permit) => Effect.Effect<A, E, R>) => Effect.Effect<A, E, R>`.
     Its doc comment carries the protocol, moved from `AuditDecisionSinkLive.ts:137-169` and `CircuitBreaker.ts:66-127`, condensed. It must cover: one probe per window (and why: `filter`/`filterStream` fan-out); the lost-claim re-read and its two causes (ticket #46); the release-on-every-exit guarantee (ticket #38, this plan's C4b); and that `attempt` records only its first outcome.
  3. If D-07-f (i): replace `interface State` (`:130-143`) with `Data.TaggedClass` variants `StateClosed`/`StateOpen`/`StateHalfOpen`. Keep them module-local and unexported. Rewrite `status`, `recordSuccess`, `recordFailure` (with T3's `Open` case), `claimProbe` and `releaseProbe` as module-local transition functions. Each stays a single `Ref.modify`, now dispatching with `Match.tagsExhaustive` instead of `if (state.status === …)` chains. Keep `transitionsTotal`/`announceTransition` (`:190-202`) unchanged.
  4. Implement `withPermit` as `Effect.fn("qadi.audit.circuitBreaker.withPermit")(function* <A, E, R>(use) { … })`:
     - `acquire` (`Effect.acquireUseRelease` runs it uninterruptibly): `status` read; on `HalfOpen`, `claimProbe`; on a lost claim, re-read and map `Closed` → `Admitted{probe:false}`, anything else → `Refused`; on a won claim, `Admitted{probe:true}`; on `Closed`, `Admitted{probe:false}`; on `Open`, `Refused`. Each `Admitted` gets a fresh per-permit `Ref<boolean>` "settled" flag that its `attempt` closes over.
     - `attempt(write)`: `const exit = yield* Effect.exit(write)`. If not yet settled, mark settled and run `recordSuccess` or `recordFailure` according to `Exit.isSuccess(exit)`. Return `exit`.
     - `use`: the caller's callback, unchanged.
     - `release(permit, exit)`: if `permit` is `Admitted` with `probe: true` and `Exit.isFailure(exit)`, run `releaseProbe`. It is still guarded inside by `status === HalfOpen && probeClaimed`, so it is a no-op once `attempt` settled.
     - `yield* Effect.annotateCurrentSpan({ "qadi.audit.permit": permit._tag, "qadi.audit.probe": … })` inside `use` (ADR-QD-051).
  5. `makeCircuitBreaker` returns `{ status, withPermit } satisfies CircuitBreaker`.
  6. Rewrite the module header (`:1-32`). Line one is a summary ("A half-open circuit breaker that admits, guards and settles one write at a time"), followed by the existing HexDi and no-public-error reasoning, kept.
- **Tests:** none in this task. T6 migrates the unit tests in the same commit, so the tree compiles and is green at every commit. Commit T5 and T6 together.
- **Verify:** `pnpm typecheck` (expect errors only in `CircuitBreaker.test.ts` and `AuditDecisionSinkLive.ts` until T6/T7), then after T6+T7: `pnpm exec vitest run --project audit`
- **Done when:** the interface block has exactly two `readonly` members and `pnpm typecheck` is clean after T6/T7.

### T6 — Migrate `CircuitBreaker.test.ts` to the new interface (replace, don't layer)
- **Status:** [x] done
- **Depends on:** T5
- **Files:** `packages/audit/test/CircuitBreaker.test.ts`
- **Steps:**
  1. Add local helpers at the top of the file (not in `helpers.ts`; nothing else needs them):
     - `failOnce(b)` = `b.withPermit((p) => Match.value(p).pipe(Match.tagsExhaustive({ Refused: () => Effect.void, Admitted: (a) => a.attempt(Effect.fail("offline")).pipe(Effect.asVoid) })))`
     - `succeedOnce(b)`, the same shape with `Effect.void`.
     - `permitOf(b)` = `b.withPermit((p) => Effect.succeed(p._tag === "Admitted" ? (p.probe ? "probe" : "admitted") : "refused"))`.
     - `holdProbe(b, latch)`: forks `b.withPermit((p) => latch.open.pipe(Effect.andThen(Effect.never)))` and returns the fiber, so a claim can be held without settling.
  2. Rewrite each existing test against the helpers, keeping its name and assertion:
     - Threshold-edge tests (`:13-99`): `recordFailure` → `failOnce`, `recordSuccess` → `succeedOnce`. Status assertions are unchanged.
     - Aged-out claim (`:101-134`): `holdProbe` instead of a bare `claimProbe`. Do not interrupt the fiber. Assert status `HalfOpen` at +9999 ms and `Open` at +1 ms, then `permitOf` is `"probe"` 10 s later. Interrupt the held fiber at the end.
     - One-claim-per-window (`:136-153`): 10 concurrent `permitOf` while a probe is held. Exactly one `"probe"` across the window, the rest `"refused"`.
     - Ticket #46 re-read (`:155-179`): hold the probe, settle it with a success through the held permit, then a new `permitOf` returns `"admitted"` (not `"refused"`).
     - Claim reset across windows (`:181-197`) and the "false outside half-open" test (`:199-207`): these become `permitOf` equals `"admitted"` when `Closed` and `"refused"` when `Open` before the reset.
     - Concurrency stress (`:223-252`) and T3's two tests: switch to `failOnce`.
  3. Add two new tests: `"withPermit releases an unsettled probe when use is interrupted anywhere"` (hold, interrupt, status is `Open` immediately, a probe is admitted after exactly `resetTimeoutMs`), and `"attempt records only the first outcome per permit"` (an admitted probe calls `attempt(fail)` then `attempt(succeed)`, and status is `Open`).
  4. Delete the old primitive-level calls. No test may reference `claimProbe`, `releaseProbe`, `recordSuccess` or `recordFailure`.
- **Tests:** the migrated suite plus two new ones. The count of behaviors covered must not drop. List each old test name in the PR description against its new form.
- **Verify:** `pnpm exec vitest run --project audit packages/audit/test/CircuitBreaker.test.ts` and `grep -nE "claimProbe|releaseProbe|recordSuccess|recordFailure" packages/audit/test/CircuitBreaker.test.ts` (expect no output)
- **Done when:** the suite is green and the grep is empty.

### T7 — Rewrite `AuditDecisionSinkLive.record` on `withPermit`
- **Status:** [x] done
- **Depends on:** T5, T1
- **Files:** `packages/audit/src/AuditDecisionSinkLive.ts`
- **Steps:**
  1. Replace T1's `acquireUseRelease` block with `yield* breaker.withPermit((permit) => Effect.gen(function* () { … }))`.
  2. Inside it, let `const refused = permit._tag === "Refused"` drive the staging block (`:176-213`) exactly where `status === "Open"` does today. Metric and log outcomes do not change: `stagingFailedOpen`/`stagingSkippedOpen` when refused, `stagingFailed` otherwise.
  3. Replace the `if (status === "Open") return;` plus `attemptWrite` pair with a `Match.value(permit).pipe(Match.tagsExhaustive({ Refused: () => Effect.void, Admitted: (admitted) => writeAndCommit(admitted) }))`. `writeAndCommit` is the old `attemptWrite` body, with `Effect.exit(trailPort.write(entry))` replaced by `admitted.attempt(trailPort.write(entry))`. The `breaker.recordSuccess`/`breaker.recordFailure` lines are removed, because `attempt` records them. `commitStaged` and the `writesWritten`/`writesWriteFailed` updates stay as they are.
  4. Delete the protocol comments (`:140-169`, `:217-232`, `:258-278`) and replace them with one line pointing at `CircuitBreaker.ts`'s `withPermit` doc. Keep the staging and commit comments (`:171-215`, `:90-106`).
  5. Remove the `Exit` import only if it became unused. It is still used for `Exit.isSuccess` on the returned exit.
- **Tests:** none new. `AuditDecisionSinkLive.test.ts` (including T1/T2/T4), `Metrics.test.ts` and `Agreement.test.ts` (INV-QD-051 property) are the regression net and must pass **unmodified**.
- **Verify:** `pnpm exec vitest run --project audit` and `grep -nE "claimProbe|releaseProbe|recordSuccess|recordFailure|isProbe" packages/audit/src/AuditDecisionSinkLive.ts` (expect no output)
- **Done when:** every audit test passes with no test edits in this task, and the grep is empty.

### T8 — Generation-tagged permits: stale outcomes do not move a newer window (D-07-d)
- **Status:** [x] done
- **Depends on:** T5, T6, D-07-d = (i) (skip and mark `dropped` in the progress log if D-07-d = (ii))
- **Files:** `packages/audit/test/CircuitBreaker.test.ts`, `packages/audit/src/CircuitBreaker.ts`
- **Steps:**
  1. Test first (scratch H via the new interface): hold a non-probe permit A admitted while `Closed`, behind a latch. Trip with `failOnce`×threshold, adjust `resetTimeoutMs`, and hold probe B. Settle A with a failure, then assert status is still `HalfOpen`. Settle B with a success, then assert `Closed`. At T6's state this fails (A reopens the breaker).
  2. Add `generation: number` to every `State` variant. Increment it in every `Ref.modify` that changes `_tag`.
  3. `Admitted` captures the generation at acquire. `attempt`'s record step does a single `Ref.modify` that compares generations and applies the transition only when they match. When they do not, it returns `[false, state]` unchanged.
  4. Check that T3's tests still pass. They should now hold for a second reason: a permit admitted before the trip carries an older generation.
  5. Document the rule in `withPermit`'s doc comment: an outcome counts only toward the window in which it was admitted.
- **Tests:** the new stale-outcome test (red → green). T3's tests and the concurrency stress test remain green.
- **Verify:** `pnpm exec vitest run --project audit`
- **Done when:** the new test passes and nothing else changed.

### T9 — Model-based property for the breaker (replace scripted-only coverage with a generated check)
- **Status:** [x] done
- **Depends on:** T6 (T8 if adopted)
- **Files:** `packages/audit/test/CircuitBreaker.test.ts`
- **Steps:**
  1. Write a pure reference model: a reducer over `{ tag, consecutiveFailures, since, probeHeld, generation? }` and commands `Fail | Succeed | Advance(ms) | HoldProbe | ReleaseHeld | Permit`, with the same thresholds and semantics as D-07-c/d/e.
  2. Use `fast-check` (already a devDependency, `packages/audit/package.json`) to generate command sequences of length ≤ 40. Use `failureThreshold ∈ [1, 6]` and `resetTimeoutMs ∈ [1, 20_000]`, and draw `Advance` values both near `resetTimeoutMs` (±1 ms) and freely, so threshold edges are hit (the John Hughes review note that `CircuitBreaker.test.ts` only probes fixed edge values).
  3. Run each sequence against `makeCircuitBreaker` under `TestClock`. After every command, assert the real `status` equals the model's `tag`. At the end, assert `qadi_audit_circuit_breaker_transitions_total` occurrences equal the model's transition counts (`isolatedMetrics`).
  4. Keep the scripted tests too. ADR-QD-056 (`:179-185`) explains why random generation alone rarely lands on the exact threshold.
- **Tests:** one property (`it.effect` + `FastCheck`/`it.prop` per the existing pattern in `Agreement.test.ts`).
- **Verify:** `pnpm exec vitest run --project audit packages/audit/test/CircuitBreaker.test.ts`
- **Done when:** the property passes at 100+ runs and a deliberately injected bug, such as removing T3's `Open` case, makes it fail. Check that locally and revert.

### T10 — Spec, overview, CCR and changeset
- **Status:** [x] done
- **Depends on:** T1–T4 for the defect-fix half; T5–T8 for the refactor half. Land each half's spec edits in the same PR as its code (AGENTS.md §11).
- **Files:** `spec/behaviors/33-audit-pipeline.md`, `spec/invariants.md`, `spec/traceability.md`, `spec/overview.md`, `spec/README.md`, `.changeset/*new*.md` (*new*), optionally `apps/website/src/content/docs/docs/packages/audit/capabilities.md`
- **Steps:**
  1. **BEH-QD-251** (`:92-135`): add REQUIREMENT lines:
     - "A half-open probe claim MUST be released on every exit path from the moment it is claimed — including an interruption during staging — so the next half-open window opens `resetTimeoutMs` after the probe ends." (T1)
     - "A write failure that settles while the breaker is already `Open` MUST NOT count as a transition [and MUST NOT restart the open window]." (T3, per D-07-c)
     - "An outcome MUST count only toward the half-open window in which its write was admitted." (T8, if adopted)
     - The interruption wording from T4.

     Bump Revision 1.3 → 1.4 and add a Change History row citing `CCR-QD-NEXT`.
  2. **INV-QD-052** (`spec/invariants.md:1901-1931`): update **Source** to name `withPermit` and the module-local transitions (and generations if T8). Update **Enforcement** to add T3's over-threshold concurrency test, T6's release-on-interrupt test and T9's property. Revision 1.39 → 1.40, Change History row.
  3. **Traceability** (`spec/traceability.md:132`, `:297`, `:299`): add INV-QD-052 to the `AuditDecisionSinkLive.test.ts` row (it now enforces the probe-release clause). Revision 1.71 → 1.72.
  4. **Overview** (`spec/overview.md:700`): change the row to `CircuitBreakerStatus`, `CircuitBreakerOptions`, `CircuitBreaker`, `Permit`, `Admitted`, `Refused`, `makeCircuitBreaker`, with the same "reachable via `@qadi/audit/CircuitBreaker`" reason. Revision 1.24 → 1.25. Run gate 13 to confirm.
  5. **CCR register** (`spec/README.md`, table near `:313`): add `CCR-QD-NEXT` with today's date, listing the documents above and one sentence each for C4b, C5, C7 and the refactor.
  6. **ADR-QD-056**: no edit. Its `record()` sequence sentence (`:126-129`, "encode, read breaker state, stage if wired, write or skip, react to the outcome") is still true. Note in the CCR that it was checked.
  7. **Changeset**: one file. For the defect-fix PR (T1–T4), `"@qadi/audit": patch` with a summary of the three fixes. For the refactor PR (T5–T8), `"@qadi/audit": minor`, naming the narrowed `@qadi/audit/CircuitBreaker` interface as a breaking change for anyone importing that subpath (D-07-b (i)). The fixed group bumps the others.
  8. **Website** (`capabilities.md:38-45`): optional one sentence that half-open admits one trial write and releases it on every exit. It is not currently wrong, so skip this if it adds no value.
- **Tests:** n/a. Gates 9, 10 and 13 cover these files.
- **Verify:** `pnpm spec:verify:strict && pnpm spec:examples && pnpm spec:api`
- **Done when:** all three pass.

### T11 — Full gate, including mutation testing on `@qadi/audit`
- **Status:** [x] done
- **Depends on:** T1–T10
- **Files:** none, unless survivors need tests (then the relevant `packages/audit/test/*.test.ts`)
- **Steps:**
  1. `pnpm exec stryker run stryker.audit.mjs`. Open `reports/mutation-audit/index.html` and list survivors in `CircuitBreaker.ts` and `AuditDecisionSinkLive.ts`.
  2. For each survivor in the moved protocol (admission mapping, settle-once flag, release guard, generation compare, `Open` no-op), add a breaker-level test that kills it. Prefer tightening an existing assertion to adding a new test.
  3. Run `pnpm check` end to end.
- **Tests:** whatever step 2 requires.
- **Verify:** `pnpm exec stryker run stryker.audit.mjs` (score ≥ 80, target ≥ 92) and `pnpm check`
- **Done when:** `pnpm check` exits 0, and the mutation score is recorded in the progress log and the CCR.

## 7. Test strategy

**Survive unchanged** (the regression net for T7, which must pass with zero
edits):

- `packages/audit/test/AuditDecisionSinkLive.test.ts`: the 16 existing tests, plus the T1/T2/T4 additions.
- `packages/audit/test/Metrics.test.ts`: every outcome counter and the transition frequency, including the ticket #47 defect tests (`:79-108`, `:153-176`).
- `packages/audit/test/Agreement.test.ts`: the INV-QD-051 differential property (staging wired vs unwired gives identical committed entries). This is the strongest guard that T7 did not change *which* entries reach the trail.

**Move to the new interface** (T6): every test in `CircuitBreaker.test.ts`.
Behaviors are preserved one-for-one, and calls to the primitives are replaced
rather than layered beside new tests. After T6, no test can call the protocol
steps out of order, because the interface no longer allows it.

**Deleted as redundant:** none outright. The "`claimProbe` is false outside a
half-open window" test (`:199-207`) and "`claimProbe` resets on the next window"
(`:181-197`) are re-expressed as `permitOf` assertions. They are not deleted.

**Added:**

- Test-first defect reproductions: T1 (claim released during staging), T3 (no `Open`→`Open` transition; over-threshold concurrency), T8 (stale outcome).
- Pinning tests: T2 (failed and defecting probe re-probe, which settles the review's suspicion), T4 (adapter self-interrupt trips; caller interrupt does not).
- Interface tests: T6 (release on interrupt anywhere; `attempt` settles once).
- **Property:** T9, a model-based differential between the real breaker and a pure reducer, over generated command sequences with near-threshold time draws.
- **Mutation:** T11, `stryker.audit.mjs` (gate 20). The moved protocol must be killed at the breaker level, because the sink-level tests alone would let mutants in the admission mapping survive behind staging behavior.

## 8. Spec and documentation updates

| Document | Change | Task |
| -------- | ------ | ---- |
| `spec/behaviors/33-audit-pipeline.md` BEH-QD-251 | New REQUIREMENTs (probe released on every exit; `Open` absorbs late failures; window-scoped outcomes if D-07-d (i)). Interruption prose corrected. Rev 1.4. | T4, T10 |
| `spec/invariants.md` INV-QD-052 | Source and Enforcement updated for `withPermit`, generations, new tests. Rev 1.40. | T10 |
| `spec/traceability.md` | INV-QD-052 added to the `AuditDecisionSinkLive.test.ts` row. Rev 1.72. | T10 |
| `spec/overview.md:700` | `Permit`, `Admitted`, `Refused` added to the `CircuitBreaker.ts` "Not listed above" row (gate 13). Rev 1.25. | T10 |
| `spec/README.md` CCR register | `CCR-QD-NEXT` row. | T10 |
| `spec/decisions/056-audit-companion-package.md` | **No amendment.** Checked: the breaker is still "fully internal, no port", still trips only on write failure, and `record()` still stages while refused. | — |
| ADR | **No `ADR-QD-NEXT`.** The change narrows an internal module's interface and fixes defects. It does not reverse a recorded decision. If the reviewer reads D-07-d (window-scoped outcomes) as a new decision about breaker semantics, record it as `ADR-QD-NEXT` "A breaker outcome counts only toward the window that admitted it", narrowing ADR-QD-056's breaker paragraph. | T10 (conditional) |
| `.changeset/*.md` | `patch` for T1–T4; `minor` for T5–T8 (subpath break). | T10 |
| Code doc comments | `CircuitBreaker.ts` header and interface; `AuditDecisionSinkLive.ts` protocol comments removed or pointed to the breaker. | T1, T4, T5, T7 |
| `apps/website/.../audit/capabilities.md:38-45` | Optional one sentence on the single probe. | T10 |

## 9. Risks and rollback

| Risk | How it shows up | Mitigation / rollback |
| ---- | --------------- | --------------------- |
| T3 changes recovery timing under fan-out: the window is no longer pushed out by late failures | A deployment that relied on longer open windows during a burst sees an earlier half-open probe. | This is the intended fix per D-07-c. If it is unwanted, D-07-c (ii) keeps the extension without the metric over-count. Revert the T3 commit to restore exact HEAD behavior. |
| `acquireUseRelease`'s acquire is uninterruptible | A slow acquire would delay interruption. | Acquire is only `Clock` reads and `Ref.modify`, with no I/O, so it is effectively instant. Staging and the write stay in `use`, which is interruptible. |
| Generic `Effect.fn` inference regresses in a later effect release | `pnpm typecheck` fails at the `withPermit` definition. | The prototype type-checks on `effect@4.0.0` (C10). The fallback is to define `withPermit` as a plain generic arrow returning `Effect.acquireUseRelease(…).pipe(Effect.withSpan("qadi.audit.circuitBreaker.withPermit"))`, which is still traced and still has no `fnUntraced`. |
| A per-record span adds noise to traces | Tracers show one more span per decision record. | It is named and annotated, so it carries signal (ADR-QD-051). Cost ≈2.7–2.9 µs per call (AGENTS.md §5), against a store write. If a reviewer objects, drop the name and use `Effect.fn(function* …)` unnamed. That is still `Effect.fn`, per §5. |
| `attempt` called twice, or not at all, inside `use` | A second outcome is silently ignored; a `use` that never calls `attempt` on a probe permit leaves it unsettled until release. | T6 tests settle-once. An unsettled probe is released by `withPermit`'s finalizer only on a failure exit. If `use` succeeds without calling `attempt` on a probe, the age-out (`CircuitBreaker.ts:245-257`) recovers it. Document this in `withPermit`'s doc. The sink always calls `attempt` on `Admitted`. |
| Subpath consumers of `@qadi/audit/CircuitBreaker` break | A type error on upgrade for anyone calling `claimProbe`/`recordFailure` directly. | The `minor` changeset names it (D-07-b). Nothing in this repository imports the subpath (C8). |
| Mutation score drops when logic moves | Gate 20 fails (< 80) or falls below 92. | T11 adds breaker-level tests for survivors. T9's property kills most transition mutants. |
| Rollback | — | T1–T4 are independent commits on today's interface and can ship alone. T5+T6+T7 form one commit (the tree is only green with all three). T8, T9 and T10's halves are separate commits. Reverting T5–T8 restores the five-member interface while keeping the defect fixes. |

## 10. Progress log

| Date | Task | Change | By |
| ---- | ---- | ------ | -- |
| 2026-10-04 | — | Plan written. Evidence re-verified at `1caf04c`. The suspected wedge was settled as REFUTED by scratch tests A/B. New defects C4b (claim held outside its guard during staging) and C5 (`Open`→`Open` re-announce and window restart) were confirmed by scratch E/I. Doc drift C7 was confirmed by scratch C/D/F/G. Status `needs-decision` on D-07-a…f. T1, T2 and T4 steps 1–3 can start now. | Claude |
| 2026-10-04 | D-07-a..f | All six decisions set to `decided (2026-10-04, recommended default)`: A, (i), (i), (i), (i), (i). | Claude |
| 2026-10-04 | T1,T2,T4 | Tests added (T1 red at HEAD, 5 vs 6), `acquireUseRelease` fix; commit 8db151b. | Claude |
| 2026-10-04 | T3,T4 | `recordFailure` no-op while Open; comments and BEH-QD-251 prose corrected. | Claude |
| 2026-10-04 | T5,T6,T7 | `withPermit` entry point; tagged state (Closed/Open/HalfOpen, `consecutiveFailures` dropped from Open/HalfOpen as unobservable); breaker tests migrated; sink rewritten on `withPermit`. Commit d1900e3. | Claude |
| 2026-10-04 | T8 | Generation-tagged permits, test-first (both stale-outcome tests red before). `Admitted` also exposes an opaque `generation` for the release guard. | Claude |
| 2026-10-04 | T9 | Model-based property (150 runs, seed 52). Injected `<` to `<=` and removed the generation check: both fail it. Reverted. | Claude |
| 2026-10-04 | T10 | BEH-QD-251 1.4, INV-QD-052 1.40, traceability 1.72, overview 1.25, README 1.64 with CCR-QD-153; changeset `circuit-breaker-with-permit.md` (minor, fixed group). Website sentence skipped (not wrong today). Gates 11/12/13 and spec:verify:strict, spec:examples green. | Claude |
| 2026-10-04 | T11 | Stryker audit: 86.92% (CircuitBreaker.ts 80.51%, sink 90.57%), break 80 passed, below the 92% in ADR-056 (predates ADR-076 `ignoreStatic`). Survivors are equivalent mutants plus the lost-claim re-read race. Coverage audit/src 98.7/98.95/97.7/99.02; full vitest 2264 pass; typecheck, lint, circular, spec:package, test:bdd green. Full `pnpm check` not run end to end (website, example, other Stryker configs skipped). | Claude |
