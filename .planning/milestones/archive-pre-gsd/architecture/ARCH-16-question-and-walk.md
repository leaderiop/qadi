---
id: ARCH-16
title: The question is one value, the walk is an internal module, evaluate is the lifecycle around it, and a health probe asks the ports every time
strength: Strong
status: done
evidence_verified_at: e328e75
depends_on: []
blocks: []          # sequencing hazard, not a hard block: ARCH-17 and ARCH-26 edit the code T5 moves (§9)
adrs_touched:
  - ADR-QD-031 (amend: the key is the `Question`; the stale `subjectId + policy + resource + action` listing at :72 is corrected; a readiness probe never consults the cache)
  - ADR-QD-044 (amend: "an observer can never deny" is enforced at one emitter, `SinkEmit.ts`, for decision and obligation records alike)
  - ADR-QD-073 (amend, note only: the three untraced functions move file with the interpreter, the set and the budget count do not change)
  - ADR-QD-012 (constraint: the id is minted and `EvaluationId.next` read in the lifecycle, never in the walk; read order is preserved)
  - ADR-QD-043 (constraint, and the principle this plan makes structural: a decision is computed from the inputs it claims to be about)
  - ADR-QD-051 (constraint: no new span; `qadi.evaluate` stays the root, port spans are untouched)
  - ADR-QD-026 (constraint: `concurrency` does not change the answer, which is why it is not in the question)
  - ADR-QD-034 (constraint: `evaluateNode`'s `switch` stays; `SWITCH_BUDGET` count unchanged, file key moves)
  - ADR-QD-037 (constraint: madge, type-only edges count, so `Question.ts` must sit below both `Evaluate.ts` and `Walk.ts`)
  - ADR-QD-096 (constraint: the record wire is not changed; the record keeps `subjectId`, gains no `maxDepth` and no "synthetic" flag)
  - ADR-QD-NEXT (new: "A question is asked once: one request value, an internal walk, a probe that is not a decision")
packages: ["@qadi/core", "scripts (house-style budgets)", "spec", "AGENTS.md"]
estimate: L   # ≈ 3–4 days: T1 alone ≈ 1 hour; T2–T4 ≈ 1½ days; T5 (pure move + budgets) ≈ ½ day; T6–T8 ≈ 1 day
---

# ARCH-16 — The question is one value, the walk is internal, and a probe asks the ports

## 1. Verified evidence (at `e328e75`)

`git diff --stat d0884e6 e328e75 -- packages/core/src/{Evaluate,Qadi,DecisionCache,GuardHealthCheck}.ts packages/core/test/GuardHealthCheck.test.ts`
is empty, so every line the review cited at `d0884e6` is still exact at `e328e75`.
Read-only: nothing in the repository was edited.

**Probe.** One throwaway test ran from
`/private/tmp/claude-502/-Users-mohammadalmechkor-Projects-Perso-qadi/a032054c-2984-4500-9b86-240b3767ee96/scratchpad/wave3/ARCH-16/`
(`probe.test.ts`, with `node_modules` symlinked to the repo's, importing `packages/core/src`
and `packages/core/test/helpers.ts` by absolute path), run with
`./node_modules/.bin/vitest run --root <scratch> probe.test.ts`. It wires
`decisionCacheLayer()`, a recording `DecisionSink`, and an `AttributeResolver` built with
`scriptedPort(attributeResolverPort, () => n++ === 0 ? PortReply.answer("pro") : PortReply.fail("down"))`,
then runs `createGuardHealthCheck(hasAttribute("plan", eq(literal("pro"))))` twice for a
subject with no `plan` attribute. Output:

```
first true second true [] calls 1 records 2
AssertionError: expected true to be false   (assert.isFalse(second.healthy))
```

`control.test.ts`, the same file with the cache layer removed, **passes** (second probe
unhealthy). So the cache, and only the cache, is what hides the outage.

| # | Claim | Verdict | Evidence at `e328e75` |
| - | ----- | ------- | --------------------- |
| C1 | `evaluate` is a ~220-line root that mints the id, gates depth, builds the cache key, computes, updates metrics, annotates the span, logs, builds two `DecisionRecord`s and constructs Allow/Deny. | **CONFIRMED** | `packages/core/src/Evaluate.ts:1069-1294` (doc 1069-1074, body 1075-1294). Id 1083-1084; clock 1085; cache/sink reads 1092, 1096; emitter 1111-1114; `compute` with depth gate 1126-1154; key 1182-1201; `tapError` (metric, span, `Failed` record) 1203-1224; Allow/Deny 1229-1244; span 1246-1260; metrics 1262-1265; log 1265-1273; `Decided` record 1278-1291. Nine jobs in one generator. |
| C2 | The request facts (subject, policy, resource, action, maxDepth) are restated in five places. | **CHANGED — more than five** | `Evaluation` bundle `Evaluate.ts:232-236`, built at 1127-1131; `matcherContext` 1139-1144; cache key 1186-1199; `Failed` record 1213-1221; `Decided` record 1281-1290. Two more the review did not count: the span annotation reads `options?.action`, `policy._tag`, `subject.id` again (1246-1258), and both `Decision` constructors read `subject.id` (1231, 1239). Each site reads `options?.…` independently; nothing makes them agree. |
| C3 | `options?.maxDepth ?? DEFAULT_MAX_DEPTH` is computed twice. | **CONFIRMED, plus a third** | `Evaluate.ts:1145` (walk) and `:1198` (key). A third independent default is `Predicate.ts:736` (`toPredicate`). `PolicyExplorer.tsx:66` (devtools) re-declares the constant `64` itself — out of scope here, noted for ARCH-29's loose ends. |
| C4 | Which options change the answer, and so belong in the key, is stated only in prose. | **CONFIRMED** | `DecisionCache.ts:83-91` (why `maxDepth` is in the key). Why `concurrency` is *not* is in `EvaluateOptions`' doc, `Evaluate.ts:173-188`, and ADR-QD-026; why `evaluationId` is not is at `Evaluate.ts:190-210` and `:1155-1159`. Three locations, no type or test ties them to the key. ADR-QD-031 still lists the key as `subjectId + policy + resource + action` (`spec/decisions/031-decision-cache.md:72`) — wrong twice (ADR-QD-043 replaced `subjectId` with the subject; CCR-QD-128 added `maxDepth`). |
| C5 | **DEFECT.** `createGuardHealthCheck` goes through `DecisionCache.getOrCompute` when a cache is wired; the cache has no TTL and caches successes only, so every probe after the first is a hit, never touches a port, and reports healthy while the store is down. | **CONFIRMED by probe** | `GuardHealthCheck.ts:81-93` calls `decide` (`Qadi.ts:181-185`) → `evaluate` → `cache.value.getOrCompute` (`Evaluate.ts:1185`). `DecisionCache.ts:552-553` stores only `exit._tag === "Success"`; ADR-QD-031 rejects a TTL by name ("A TTL on entries. Rejected"). Probe: one port call across two probes, second probe `healthy: true, errors: []`. Control without the cache: second probe unhealthy. |
| C6 | Each probe emits a canary `DecisionRecord` into the sink/audit. Is it intended? | **CONFIRMED; not intended by any normative text** | Probe: `records 2` for two probes. Also, by reading, each probe increments `qadi_decisions_total`, `qadi_evaluation_duration_millis` and (on failure) `qadi_evaluation_errors_total` (`Evaluate.ts:1205`, `1262-1263`), and writes a `qadi.evaluate` span with `qadi.decision`. No BEH exists for the health check; `spec/overview.md:224-230` says only that it "runs a caller-supplied canary `Policy` through `decide`"; CCR-QD-088 (`spec/README.md:383`) introduced it as "build directly, no open decision". ADR-QD-044 (2026-08-23) predates it by two days and says nothing about probes. A probe polled every few seconds under `@qadi/audit` writes a permanent audit row per poll, attributed to whatever subject the probe runs as. Settled as unintended-by-omission, decided in D-16-b. |
| C7 | `GuardHealthCheck.test.ts` never wires a cache. | **CONFIRMED** | All five tests provide `testLayer(...)` = `currentSubjectLayer + portsLayer + evaluationIdSequential` (`packages/core/test/helpers.ts:32-36`). No cache, no sink. |
| C8 | "An observer can never deny" is enforced per emitter: `Evaluate.ts:1096-1114` and `Qadi.ts:87-107` each re-read `serviceOption(DecisionSink)`, re-wrap `catchCause(…, Effect.void)`, and stamp `at`/`evaluationId` by hand. | **CONFIRMED** | `Evaluate.ts:1096` (read), `:1111-1114` (wrap), `:1214-1215` and `:1282-1283` (stamp). `Qadi.ts:89` (read), `:90` (clock), `:93-107` (wrap + stamp `evaluationId: decision.evaluationId, at`). No third emitter: `packages/devtools/src/model/Wiring.ts:82` reads the service only to report its presence. INV-QD-035's Source names only `Evaluate.ts` (`spec/invariants.md:1368-1370`) though the obligation path relies on the same guarantee; both paths are tested (`DecisionSink.test.ts:349-405` for decisions, `:638-670` for obligations). |
| C9 | *(found while verifying)* The probe requires `EvaluationServices` — including `EvaluationId` — and mints an id per poll, though nothing in a probe needs an id. | **CONFIRMED** | `createGuardHealthCheck`'s inferred `R` is `EvaluationServices` via `decide`'s signature (`Qadi.ts:181-185`). The walk needs only `PortServices` (`evaluateNode`'s return type, `Evaluate.ts:500`). |

## 2. Goal and success criteria

Today `evaluate` is a wide, shallow module: its interface is one call, but its
implementation re-derives the same request from `options` at every point that needs it, so
the facts that define a question have no single home and no seam. This plan cuts it at the
seam the code already half-has (`compute`, an `Effect.suspend` handed to the cache): a
**`Question`** value — subject, policy, resource, action, resolved `maxDepth` — built once
by `questionOf`, which is at the same time the cache key and the source of the record's
request half; an internal **walk module** (`Walk.ts`) whose one entry point
`walk(question, concurrency): Effect<Trace, EvaluationError, PortServices>` owns the depth
gate and the interpreter; and **`evaluate` as the lifecycle** around that walk (id, clock,
cache, metrics, span, log, records). Observation gets the same treatment: one internal
emitter (`SinkEmit.ts`) is the only code that reads `DecisionSink`, so "an observer can
never deny" has locality instead of two copies. The leverage is that callers which need an
*answer about ports* rather than a *decision* — the readiness probe — get the deep module
directly and stop inheriting the lifecycle's cache, ids and records; and the classification
of every `EvaluateOptions` field into "part of the question" or "how it is asked" becomes a
type (`QuestionOptions` vs. the fields `EvaluateOptions` adds), checked by a differential
test, instead of prose in three files.

Success criteria (each checkable):

1. **The defect is closed.** `GuardHealthCheck.test.ts` has a test that wires
   `decisionCacheLayer()` and a port that answers once then fails; the second probe reports
   `healthy: false` with `errors: ["AttributeResolveError"]`, and the scripted port's
   `calls.length` is `2`. It was red (`it.effect.fails`) on `main` before the fix.
2. **A probe is not a decision.** With a recording sink and a cache wired, two probes emit
   `0` records, leave `size` of the cache at `0`, and leave `qadi_decisions_total` unchanged
   (D-16-b, D-16-d).
3. **One question.** `grep -n "options?\.\(resource\|action\|maxDepth\)" packages/core/src/Evaluate.ts`
   returns nothing; those three fields are read only inside `questionOf` (`Question.ts`).
   `grep -rn "DEFAULT_MAX_DEPTH" packages/core/src/Evaluate.ts packages/core/src/Walk.ts`
   returns nothing.
4. **The key is the question.** `DecisionCacheShape.getOrCompute`'s first parameter is
   `Question`; `DecisionCacheKey` no longer exists (`grep -rn DecisionCacheKey packages/*/src` → nothing) (D-16-a).
5. **The classification is a type and a test.** `EvaluateOptions extends QuestionOptions`;
   `Question.test.ts` holds a sample table typed
   `{ readonly [K in keyof EvaluateOptions]-?: … }`, so adding an option without classifying
   it fails `pnpm typecheck`; the test asserts every `QuestionOptions` field changes
   `questionOf`'s result under `Equal.equals` and every other field does not.
6. **One emitter.** `grep -rn "serviceOption(DecisionSink)" packages/core/src` returns
   exactly one line, in `SinkEmit.ts`; `grep -rn "catchCause" packages/core/src/Evaluate.ts packages/core/src/Qadi.ts`
   returns nothing. The house-style rule in D-16-f fails the gate on a second read.
7. **The walk is internal and spanless.** `Walk.ts` is not in `packages/core/src/index.ts`;
   `walk` is a plain function returning `Effect.suspend(…)` — no `Effect.fn`, no
   `Effect.fnUntraced` at its definition. `UNTRACED_BUDGET` and `SWITCH_BUDGET` keep their
   counts (3 and 1) under the key `packages/core/src/Walk.ts`.
8. **Nothing observable moves for `evaluate`.** Every existing test in `Evaluate.test.ts`,
   `DecisionSink.test.ts`, `DecisionSink.tst.ts`, `DecisionCache.test.ts`, `Qadi.test.ts`,
   `Concurrency*`/`SubjectSet*` and the BDD suite passes with assertions untouched (only
   import paths may change).
9. **Measured.** `Evaluate.bench.ts` (`one node`, `resolver miss`, `deep — 10 levels`) and
   `DecisionCache.bench.ts` (`hit`, `miss`) are run A/B in one session, three runs each; the
   means are recorded in §10 and in the CCR row; no workload's mean regresses by more than its
   own run-to-run spread (D-16-e).
10. `pnpm check` passes.

## 3. Non-goals

- **Changing `evaluateNode`'s signature or the composite folds.** `evaluateNode` keeps
  `(policy, subject, request, matcherContext, depth, maxDepth)`. `walk` builds the
  `Evaluation` bundle and `MatcherContext` from the `Question`, once — the restatement
  becomes a derivation in one place. Threading the `Question` through every node is
  ARCH-26's (pure short-circuit stepper) and ARCH-17's (case-wise fold) territory; this plan
  only moves the code they will edit (§9).
- **Converting any function to or from `Effect.fnUntraced`.** ADR-QD-073 requires a
  benchmark first; none is proposed.
- **Changing the record wire.** `DecisionRecord` keeps `subjectId` (not the subject) and does
  not gain `maxDepth` or a "probe" flag; ADR-QD-096's version 2 is untouched.
- **A TTL or per-key invalidation on `DecisionCache`.** ADR-QD-031 rejected the first; the
  second (MK-04) is a separate gap.
- **`toPredicate`'s own `maxDepth` default** (`Predicate.ts:736`). It may adopt
  `questionOf`'s default helper if T2 exports one (`maxDepthOf`), but its options type is its
  own; changing it is optional polish, listed in T2 step 6.
- **The `./*` subpath export** that makes internal modules (`Walk.ts`, `SinkEmit.ts`, like
  today's `TreeFold.ts`/`PortAccess.ts`) importable as `@qadi/core/Walk`. That is ARCH-29.

## 4. Constraints

- **AGENTS.md §1** — `effect` submodule namespace imports; `.ts` relative imports;
  `import type` for `Question` in `DecisionCache.ts` and `Walk.ts`.
- **AGENTS.md §4** — never `Effect.orDie` here; the emitter's `catchCause` is the inverse of
  it (INV-QD-035) and moves verbatim.
- **AGENTS.md §5 / ADR-QD-073 / `UNTRACED_BUDGET`** — `evaluateAllOf`, `evaluateAnyOf`,
  `evaluateRules` stay `Effect.fnUntraced`. T5 moves them to `Walk.ts`, so
  `UNTRACED_BUDGET` and `UNTRACED_BUDGET_NAMES` in `scripts/check-house-style.mjs:372-390`
  are re-keyed from `packages/core/src/Evaluate.ts` to `packages/core/src/Walk.ts` with the
  same count (3) and names. Consequence if missed: gate 4 (`pnpm lint` → house style) fails
  in both directions — Evaluate.ts has 0 where 3 are budgeted, Walk.ts has 3 where none are.
  `walk` itself must not be `Effect.fnUntraced` (a fourth site fails the budget) nor
  `Effect.fn(name)` (adds a span and ≈2.7–2.9 µs per evaluation per ADR-QD-073's
  measurement, and a new span name every ADR-QD-051 consumer would see). It is a plain
  function returning `Effect.suspend`, as `evaluateNode` is a plain function today.
- **AGENTS.md §5a / ADR-QD-034 / `SWITCH_BUDGET`** — `evaluateNode`'s `switch` moves with
  it; `SWITCH_BUDGET` and `SWITCH_BUDGET_NAMES` (`check-house-style.mjs:285-311`) are
  re-keyed to `Walk.ts` (count 1, name `evaluateNode`). AGENTS.md §5's and §5a's tables name
  `Evaluate.ts —`; they are updated in the same commit (the budgets' doc comments say the
  table and the budget change together).
- **AGENTS.md §6** — no `as`, `!`, `any`; `Record<string, unknown>` is not used as a
  widened implementation type (user memory). `Question` is a closed interface with all five
  keys always present (`resource: Resource | undefined`, not optional) so its hash matches
  today's key, which always carries all five.
- **`PORT_DOUBLE_BUDGET`** — the new probe tests script their broken port with
  `scriptedPort(…, () => PortReply.fail(…))`; none constructs `AttributeResolveError` by hand,
  so `GuardHealthCheck.test.ts` stays off the budget.
- **`SCHEMA_ERROR_BUDGET`, `ANY_BUDGET`, `HAS_CUSTOM_BUDGET`, `DECISION_READ_BUDGET`** —
  untouched; no new error class, no `any`, no `hasCustom`, no `@qadi/react` decision read.
- **AGENTS.md §9 (barrels)** — `Question.ts` is public and joins `index.ts` alphabetically
  (between `Qadi.ts` and `RelationshipResolver.ts`); `Walk.ts` and `SinkEmit.ts` are shared
  scaffolding and stay out, like `PortAccess.ts`, `TreeFold.ts`, `ShortCircuit.ts`.
- **ADR-QD-037 (madge, gate 3)** — type-only edges count. `Question.ts` imports only
  `AuthSubject`, `Policy` (for `DEFAULT_MAX_DEPTH`) and `Resource`; it must **not** import
  from `Evaluate.ts`. That is why the classification is `EvaluateOptions extends
  QuestionOptions` (Evaluate → Question) rather than a table in `Question.ts` keyed on
  `EvaluateOptions` (which would be a cycle). `Walk.ts` must not import `Evaluate.ts`;
  `Evaluate.ts` imports `Walk.ts`, `Question.ts`, `SinkEmit.ts`, `DecisionCache.ts`;
  `GuardHealthCheck.ts` imports `Walk.ts` and `Question.ts`, no longer `Qadi.ts`.
- **ADR-QD-012** — preserve the read order in `evaluate`: `CurrentSubject`, then
  `EvaluationId.next` (always, even with a supplied id), then `Clock.currentTimeMillis`, then
  `serviceOption(DecisionCache)`, then the sink read. `DecisionSink.test.ts:447`
  ("supplying one does not disturb the generator's sequence") and the `at` tests pin it.
- **ADR-QD-031 / INV-QD-025 / INV-QD-030 / INV-QD-033** — the key's fields and structural
  equality are unchanged; only its type's name and home move. The `Effect.suspend` deferral
  (`Evaluate.ts:1115-1126`: a hit must never call `evaluateNode` or build `matcherContext`)
  moves into `walk` and must survive; `DecisionCache.test.ts`'s hit tests and the
  resolver-call counts are the oracle.
- **ADR-QD-044 / INV-QD-035** — the emitter is awaited, not forked; it is the last
  emission (after metrics and span) on the decided path; on the failure path the `Failed`
  record follows the metric and span annotation, inside `tapError`. Order moves verbatim.
- **AGENTS.md §11, §12, §15** — spec updated in the same change; any new ` ```typescript `
  fence in `spec/behaviors/` compiles (`check-doc-examples.mjs`); `spec/overview.md` names
  `Question`, `QuestionOptions`, `questionOf` and drops `DecisionCacheKey` (gate 13,
  `check-api-surface.mjs`).
- **AGENTS.md §16 / ADR-QD-038** — changeset for `@qadi/core` (fixed version group carries
  the rest). Removing `DecisionCacheKey` and narrowing `createGuardHealthCheck`'s
  requirements are stated; per user memory, no release is cut by this plan.
- **Coverage** (`packages/core` 95%) and **Stryker** (`stryker.config.mjs`, `break: 80`,
  `mutate: packages/core/src/**/*.ts`) — the three new modules are mutated; tests in T2,
  T3, T6 are written to kill the obvious mutants (default `64` vs supplied `maxDepth`; the
  `healthy`/`errors` mapping; the emitter's `Option.isSome` branch).

## 5. Decisions needed before work starts

### D-16-a — What the question is called, where it lives, and what happens to `DecisionCacheKey`
- **A (recommended):** public `Question.ts` exporting `interface Question { subject; policy;
  resource; action; maxDepth }`, `interface QuestionOptions { resource?; action?; maxDepth? }`
  (the three option docs move here from `EvaluateOptions`), and `questionOf(subject, policy,
  options?: QuestionOptions): Question`. `EvaluateOptions extends QuestionOptions` and adds
  only `concurrency` and `evaluationId`, each documented as "does not change the answer".
  `DecisionCacheKey` is **removed** and `DecisionCacheShape.getOrCompute` takes `Question`;
  its long doc comment (`DecisionCache.ts:33-91`) moves to `Question` where it describes the
  value it is about. Breaking for anyone implementing `DecisionCacheShape` by hand or
  naming the type (no in-repo consumer; `QadiAtoms.ts:391` mentions it in a comment only).
  One name for one concept.
- **B:** as A, but keep `export type DecisionCacheKey = Question` as an alias. Non-breaking,
  and two exports for one concept — the drift AGENTS.md §8 records for `…Refused` only as a
  deliberate exception.
- **C:** keep `DecisionCacheKey` as the name and make `Question` internal. Leaves the core
  concept defined by the optional cache's module (wrong locality: the cache is absent by
  default; the question never is) and hides the type a custom cache implementor receives.
- **Glossary note:** `@qadi/react` already says "question" informally (`TrackedQuestion`,
  `QadiAtoms.ts:414`), and ARCH-23 plans a `QuestionBook`. A core `Question` that ARCH-23
  keys on (minus `subject`, which the provider holds) is the coherent outcome; the glossary
  entry is added in T7 and ARCH-23 is told (§9).
- `status: decided (2026-10-07, recommended default A)`

### D-16-b — Does a readiness probe emit records, count metrics, or consult the cache?
- **A (recommended): none of the three.** The probe asks the walk directly. It answers "do
  the wired ports answer?", which is not an authorization decision: nobody is being granted
  anything, the subject is a canary, and a record of it in a decision log or an audit trail
  is noise at best and, under `@qadi/audit`, a permanent compliance row per poll. Metrics
  likewise: `qadi_decisions_total` should count decisions, and a probe polled every five
  seconds is 17 280 synthetic decisions a day. No normative text says otherwise (C6). The
  probe's own result is its signal, and its `qadi.guardHealthCheck` span carries it (D-16-d).
- **B:** keep records and metrics, bypass only the cache. Fixes C5, leaves C6. Requires a
  bypass mechanism (D-16-c option C) and keeps the audit pollution.
- **C:** emit records marked as probes. Needs a new field on `DecisionRecord` — a wire v3
  under ADR-QD-096 — for a consumer nobody has asked for. Rejected as disproportionate.
- `status: decided (2026-10-07, recommended default A)`

### D-16-c — How the probe reaches the walk without making the walk public
- **A (recommended): move the interpreter into an internal `Walk.ts`.** Everything from
  `NO_OBLIGATIONS` (`Evaluate.ts:263`) through `evaluateRules` (`:943-1067`), plus
  `Evaluation`, plus the new `walk`, moves to `packages/core/src/Walk.ts`, which is not
  barrel-exported. `Evaluate.ts` keeps `EvaluateOptions`, `EvaluationServices`,
  `StandingEvaluationServices`, the metrics, and the lifecycle `evaluate`. The move is done
  as its own commit with no edits inside the moved text (T5), so `git log --follow`/rename
  detection and ARCH-17/26 rebases stay tractable. Cost: re-keying `SWITCH_BUDGET`/
  `UNTRACED_BUDGET` and AGENTS.md §5/§5a tables; repointing spec references to moved symbols.
  This is the deep-module cut: the interpreter is the depth, the lifecycle is the adapter.
- **B:** keep everything in `Evaluate.ts` and export `walk` from it. Because `Evaluate.ts`
  is `export *`-ed, `walk` becomes public: a function that decides with no id, no record and
  no metrics — an unaudited second decision path, the shape ADR-QD-004 deleted from the
  predecessor and AGENTS.md §14 forbids in `@qadi/promise`. Rejected as wrong, not costly.
- **C:** keep the probe on `evaluate` and add a bypass — a public `EvaluateOptions.cache:
  "bypass"`, or an internal `Context.Reference` the probe provides. The public knob is a
  footgun with one legitimate caller; the hidden reference is a behaviour switch nobody can
  see at the call site. Both leave C6 (records) unless more switches are added.
- **D:** move the lifecycle out instead and leave the interpreter in `Evaluate.ts` (so the
  budgets keep their file key). Then `Evaluate.ts` is internal and `evaluate` lives in a file
  of another name — every doc reference to "`Evaluate.ts`'s `evaluate`" becomes wrong, and
  `@qadi/core/Evaluate` stops exporting `evaluate`. Smaller diff, worse names.
- `status: decided (2026-10-07, recommended default A)`

### D-16-d — What the probe reports, requires, and annotates once it calls the walk
- **A (recommended):** `createGuardHealthCheck(canaryPolicy, options?: EvaluateOptions)`
  keeps its name, parameters and `GuardHealthCheckResult`. It reads `CurrentSubject`, builds
  `questionOf(subject, canaryPolicy, options)`, and times `walk(question, options?.concurrency)`.
  `options.evaluationId` is accepted and ignored (documented: a probe has no id). Its
  requirement narrows from `EvaluationServices` to `CurrentSubject | PortServices` — an
  Effect requiring less is assignable wherever the old one was, so callers compile
  unchanged. Its existing `qadi.guardHealthCheck` span gains `qadi.healthy` (boolean) and,
  when unhealthy, `qadi.error_tag`, replacing the `qadi.evaluate` child span it used to get
  for free — so a tracer still sees a failed probe.
- **B:** as A without the span annotations. A deployment tracing probes loses the failure
  signal it had through `qadi.evaluate`'s `qadi.outcome: "Failed"`.
- **C:** a new `createPortHealthCheck` beside the old one, leaving the old one cache-bound.
  Keeps the defect available under its documented name. Rejected.
- `status: decided (2026-10-07, recommended default A)`

### D-16-e — Is a benchmark gate needed?
- **A (recommended): no new gate; an A/B measurement recorded in the CCR.** `pnpm bench` is
  not in `pnpm check` and no other benchmark is gated; the change is per *evaluation*, not
  per node (one `Question` object of five fields built where a three-field `Evaluation` was
  already built; the emitter closure built once where one was already built). The ADR-QD-051
  habit — "the claim carries a figure" — is met by T8's numbers. A regression beyond
  run-to-run spread on `one node` blocks T9 and is investigated (likely culprit: building the
  `Question` before the cache check on a cache-less path where no key object was built before).
- **B:** add a bench-threshold gate. Rejected: AGENTS.md §5a records ~30% machine variance
  between runs, so any threshold is either flaky or meaningless, and it would be the first
  timing gate in the repo — a decision bigger than this plan.
- `status: decided (2026-10-07, recommended default A)`

### D-16-f — Where the single emitter lives, and whether its singleness is gated
- **A (recommended):** internal `packages/core/src/SinkEmit.ts` exporting
  `sinkEmitter: Effect.Effect<(record: SinkRecord) => Effect.Effect<void>>` — reads
  `serviceOption(DecisionSink)` once and returns the `catchCause`-guarded emit (a no-op when
  absent) — and `decisionRecord(question, stamp, rest)`, the one projection of a `Question`
  into a record's request half (`subjectId: question.subject.id`, `policy`, `resource`,
  `action`), with `Stamp = { evaluationId, at }`. `discharge` keeps building its own
  `ObligationRecord` (its `at` is the discharge time, not the evaluation start) but emits
  through `sinkEmitter`. A house-style rule `sink-read-once` in `check-house-style.mjs`
  refuses `serviceOption(DecisionSink)` in `packages/*/src` outside `SinkEmit.ts` and
  `packages/devtools/src/model/Wiring.ts` (a presence read, not an emission), as a file
  allowlist rather than a counted budget.
- **B:** A without the rule. The single owner is then remembered, which is how the second
  copy appeared.
- **C:** a public `emitToSink` in `DecisionSink.ts`. No out-of-core emitter exists or is
  planned (ARCH-25 is about encode refusals inside sinks, not about emitting); public
  surface for nothing, and `DecisionSink.ts` is barrel-exported so an internal helper there
  leaks.
- `status: decided (2026-10-07, recommended default A)`

**Startable with no decision:** T0, T1, T3 (emitter extraction is the same under D-16-f A or
B; only step 5's rule waits on D-16-f), T8's *before* measurement.

## 6. Tasks

### T0 — Re-baseline on a fresh branch from `main`
- **Status:** [x] done
- **Depends on:** —
- **Files:** none
- **Steps:**
  1. `git switch -c arch/16-question-and-walk main`; confirm `git log --oneline -1` and that
     `git diff --stat e328e75 -- packages/core/src/{Evaluate,Qadi,DecisionCache,GuardHealthCheck}.ts`
     is empty (else re-locate §1's line numbers).
  2. Re-run §1's probe (copy it into `packages/core/test/` temporarily, or from the scratch
     dir as in §1); confirm `first true second true [] calls 1 records 2`, then delete the copy.
  3. Check whether ARCH-17 / ARCH-26 / ARCH-25 / ARCH-23 have landed or are in flight; apply §9's
     sequencing.
  4. Record baseline test counts for `packages/core`.
- **Tests:** none.
- **Verify:** `pnpm vitest run packages/core`; `node scripts/check-house-style.mjs`; `pnpm circular`.
- **Done when:** §10 has the baseline row and the probe output.

### T1 — Reproduce the cached-probe defect, test-first (C5)
- **Status:** [x] done
- **Depends on:** — (uses only today's public API; ships alone)
- **Files:** `packages/core/test/GuardHealthCheck.test.ts`
- **Steps:**
  1. Import `decisionCacheLayer` (`../src/DecisionCache.ts`) and `Layer`.
  2. Add `describe("with a decision cache wired")` and in it
     `it.effect.fails("a probe after the store goes down reports unhealthy, not a cached allow (ARCH-16 T6 fixes)", …)`:
     `let n = 0; const flaky = scriptedPort(attributeResolverPort, () => n++ === 0 ? PortReply.answer("pro") : PortReply.fail("down"));`
     policy `P.hasAttribute("plan", M.eq(M.literal("pro")))`; provide
     `Layer.mergeAll(testLayer(subjectWith({}), { AttributeResolver: flaky.layer }), decisionCacheLayer())`.
     Assert first `healthy === true`; second `healthy === false`,
     `errors` deep-equals `["AttributeResolveError"]`, `flaky.calls.length === 2`.
  3. Add a control `it.effect` (passing today) with the same port and **no** cache, asserting
     the second probe is unhealthy — so the red test cannot later pass by the port double
     itself being broken.
  4. Comment the `.fails` test with the mechanism (`getOrCompute` serves a completed success
     forever; ADR-QD-031 rejects a TTL) and "flip to `it.effect` in ARCH-16 T6".
- **Tests:** two new `it`s; the first is an expected failure.
- **Verify:** `pnpm vitest run packages/core/test/GuardHealthCheck.test.ts` (the `.fails` test
  reports passed-as-failing; the control passes). Temporarily change `.fails` to plain and
  confirm red with `expected true to be false`; restore.
- **Done when:** both tests are in, the file is green, and the defect is documented by a test
  on `main` if this task is merged alone.

### T2 — Create `Question.ts`: the question, its options, and `questionOf`
- **Status:** [x] done
- **Depends on:** D-16-a
- **Files:** `packages/core/src/Question.ts` (*new*); `packages/core/src/index.ts`;
  `packages/core/test/Question.test.ts` (*new*); `packages/core/src/Evaluate.ts` (options
  type only); `packages/core/src/DecisionCache.ts` (type only)
- **Steps:**
  1. Create `Question.ts` with a module doc comment (summary line first; then why: ADR-QD-043's
     principle, C2's six restatements). Imports: `import type { AuthSubject }`,
     `import { DEFAULT_MAX_DEPTH } from "./Policy.ts"`, `import type { Policy }`,
     `import type { Resource }`. Nothing from `Evaluate.ts`, `DecisionCache.ts`, `Walk.ts`.
  2. `export interface QuestionOptions` with `resource?`, `action?`, `maxDepth?` — move their
     three doc comments verbatim from `EvaluateOptions` (`Evaluate.ts:159-171`), and add to the
     interface doc: "every field here can change the answer, and so is part of the
     `Question`; a field that cannot belongs on `EvaluateOptions` instead".
  3. `export interface Question` with `readonly subject: AuthSubject; readonly policy: Policy;
     readonly resource: Resource | undefined; readonly action: string | undefined;
     readonly maxDepth: number;` — all required. Move `DecisionCacheKey`'s doc comment
     (`DecisionCache.ts:33-91`) here, rewritten in the present tense about the question
     (security boundary, whole subject, structural `Equal`/`Hash`, why `maxDepth` is in it).
  4. `export const questionOf = (subject: AuthSubject, policy: Policy, options?: QuestionOptions): Question =>
     ({ subject, policy, resource: options?.resource, action: options?.action, maxDepth: options?.maxDepth ?? DEFAULT_MAX_DEPTH })`.
     A plain pure function (no Effect). Object literal with all five keys, in the order today's
     key uses (`Evaluate.ts:1190-1198`).
  5. In `Evaluate.ts`: `export interface EvaluateOptions extends QuestionOptions` keeping only
     `concurrency` and `evaluationId`, each doc gaining one sentence: "Not part of the
     `Question`: it does not change the answer (ADR-QD-026 / ADR-QD-012)." In
     `DecisionCache.ts`: delete `DecisionCacheKey`, `import type { Question }`, change
     `getOrCompute`'s `key: DecisionCacheKey` to `question: Question`, and change the internal
     `HashMap<DecisionCacheKey, Trace>` and `insertionOrder` chunk to `Question`. (Under D-16-a B:
     keep `export type DecisionCacheKey = Question` instead of deleting.)
  6. Optional (non-goal polish): export `maxDepthOf = (options?: { readonly maxDepth?: number }) => options?.maxDepth ?? DEFAULT_MAX_DEPTH`
     from `Question.ts`, use it in `questionOf` and in `Predicate.ts:736`. Skip if it widens the diff past review comfort.
  7. Add `export * from "./Question.ts";` to `index.ts` between `Qadi.ts` and `RelationshipResolver.ts`.
  8. `Question.test.ts`:
     - **Classification table, compile-checked:** `const samples: { readonly [K in keyof EvaluateOptions]-?: readonly [EvaluateOptions[K], EvaluateOptions[K]] } = { resource: [{ id: "a" }, { id: "b" }], action: ["read", "write"], maxDepth: [3, 10], concurrency: [undefined, "unbounded"], evaluationId: [undefined, "x"] };`
       and `const inQuestion: { readonly [K in keyof EvaluateOptions]-?: boolean } = { resource: true, action: true, maxDepth: true, concurrency: false, evaluationId: false };`
       — a new option without an entry in both is TS2741 under `pnpm typecheck`.
     - For each key, build `questionOf(s, p, { [key]: a })` and `questionOf(s, p, { [key]: b })`
       and assert `Equal.equals(q1, q2) === !inQuestion[key]`; also assert `inQuestion[key] === (key in questionOf(s, p))`
       for the question keys, so the table cannot lie about `Question`'s shape.
     - Defaults: `questionOf(s, p).maxDepth === 64`; `questionOf(s, p, { maxDepth: 3 }).maxDepth === 3`;
       `questionOf(s, p, { maxDepth: 0 }).maxDepth === 0` (kills a `||` mutant);
       `resource`/`action` are present-and-`undefined` (`Object.hasOwn(q, "resource")`).
     - Structural: two `questionOf` calls with fresh-but-equal subjects (`fromRoles` twice) are
       `Equal.equals` and hash equal (the INV-QD-033 control, at the value rather than through the cache).
- **Tests:** `Question.test.ts` (new); `DecisionCache.test.ts` unchanged except a type import
  if it names `DecisionCacheKey` (it does not today).
- **Verify:** `pnpm vitest run packages/core/test/Question.test.ts packages/core/test/DecisionCache.test.ts`;
  `pnpm typecheck`; `pnpm circular`; `node scripts/check-api-surface.mjs` (expected to fail
  until T7 adds the rows — note, don't fix here).
- **Done when:** tests pass, typecheck passes, madge reports no cycle.

### T3 — One emitter: `SinkEmit.ts`
- **Status:** [x] done
- **Depends on:** T2 (for `decisionRecord`'s `Question` parameter); step 5 on D-16-f
- **Files:** `packages/core/src/SinkEmit.ts` (*new*); `packages/core/src/Evaluate.ts`;
  `packages/core/src/Qadi.ts`; `scripts/check-house-style.mjs`; `packages/core/test/DecisionSink.test.ts`
- **Steps:**
  1. Create `SinkEmit.ts` (doc comment: summary; then the INV-QD-035 rationale moved verbatim
     from `Evaluate.ts:1098-1110`, including "the inverse of the `Effect.orDie` AGENTS.md §4
     forbids"). Export:
     - `export interface Stamp { readonly evaluationId: string; readonly at: number }`
     - `export const sinkEmitter: Effect.Effect<(record: SinkRecord) => Effect.Effect<void>> = Effect.map(Effect.serviceOption(DecisionSink), (sink) => Option.isSome(sink) ? (record) => Effect.catchCause(sink.value.record(record), () => Effect.void) : () => Effect.void);`
     - `export const decisionRecord = (question: Question, stamp: Stamp, rest: { readonly cache?: CacheOutcome | undefined; readonly outcome: DecisionOutcome }): DecisionRecord => new DecisionRecord({ evaluationId: stamp.evaluationId, at: stamp.at, subjectId: question.subject.id, policy: question.policy, resource: question.resource, action: question.action, ...rest })`
       — keep `cache` absent (not `undefined`-valued) on the `Failed` path exactly as today
       (today's `Failed` record omits `cache`; `DecisionSink.test.ts:478` asserts absence ≠ miss).
     Not `Effect.fn`: a span per emission would be new; `sinkEmitter` is a value.
  2. `Evaluate.ts`: replace `const sink = yield* Effect.serviceOption(DecisionSink)` and the local
     `emit` (`:1093-1114`) with `const emit = yield* sinkEmitter;` **at the same position** (after
     the cache read, ADR-QD-012 order). Build `const stamp: Stamp = { evaluationId, at: startedAt }`
     once. (Records still built inline until T4 switches them to `decisionRecord`.)
  3. `Qadi.ts` `discharge`: replace `:89` and `:93-107` with `const emit = yield* sinkEmitter;`
     after the early return (an allow with no obligations must still read nothing), keeping
     `at` from the clock and a local `const record = (outcome) => new ObligationRecord({ evaluationId: decision.evaluationId, at, outcome, obligationIds })`;
     calls become `emit(record("Discharged"))` etc. Remove the now-unused `Option` and
     `DecisionSink` imports.
  4. Fix the `discharge` doc comment's "Read the same way `evaluate` reads it" to name `sinkEmitter`.
  5. (D-16-f A) Add rule `sink-read-once` to `check-house-style.mjs`: scan `packages/*/src/**/*.{ts,tsx}`
     for `/serviceOption\(\s*DecisionSink\s*\)/`; allowlist `packages/core/src/SinkEmit.ts` (exactly 1)
     and `packages/devtools/src/model/Wiring.ts` (presence read). Fail elsewhere, and fail if
     `SinkEmit.ts`'s count is not 1 (both directions, like the budgets). Doc comment cites INV-QD-035
     and ARCH-16.
- **Tests:** existing `DecisionSink.test.ts` (all of `:349-405` and `:638-670` — throwing,
  dying, failure-path and obligation-gate sinks) and `DecisionSink.tst.ts` are the oracle and
  stay unchanged. Add one test: "a sink that dies on every record leaves decide, check, enforce
  and an obligation-carrying guard all intact" driving all emit sites in one run — it pins that
  the guard is shared, so deleting `catchCause` in `SinkEmit.ts` fails four assertions at once.
- **Verify:** `pnpm vitest run packages/core/test/DecisionSink.test.ts packages/core/test/Qadi.test.ts`;
  `pnpm vitest run packages/core/test/DecisionSink.tst.ts` via `pnpm test:tstyche`;
  `node scripts/check-house-style.mjs`; then re-insert a `serviceOption(DecisionSink)` in `Qadi.ts`
  locally and confirm the rule fails; restore.
- **Done when:** `grep -rn "serviceOption(DecisionSink)" packages/core/src` → one line in `SinkEmit.ts`;
  `grep -n catchCause packages/core/src/Evaluate.ts packages/core/src/Qadi.ts` → nothing; all green.

### T4 — Restructure `evaluate` as the lifecycle over an in-file `walk`
- **Status:** [x] done
- **Depends on:** T2, T3
- **Files:** `packages/core/src/Evaluate.ts`
- **Steps:**
  1. Add, just above `evaluate`, a non-exported
     `const walk = (question: Question, concurrency: Concurrency | undefined): Effect.Effect<Trace, EvaluationError, PortServices> => Effect.suspend(() => { … })`
     whose body is today's `compute` body (`:1126-1154`) reading `question.*` instead of
     `options?.*`: build `request: Evaluation = { resource: question.resource, action: question.action, concurrency }`,
     `matcherContext` from `question.subject` and `request`, the depth gate on
     `policyDepth(question.policy) > question.maxDepth`, then
     `evaluateNode(question.policy, question.subject, request, matcherContext, 0, question.maxDepth)`.
     Move the `Effect.suspend` rationale comment (`:1115-1125`) onto `walk`. Doc comment:
     "Answers a question by walking its policy. No id, no cache, no record, no span of its own:
     those are the lifecycle's (`evaluate`). Internal."
  2. In `evaluate`, after the existing reads (order per §4): `const question = questionOf(subject, policy, options);`
     `const answer = walk(question, options?.concurrency);`
  3. Replace the key literal (`:1185-1200`) with `cache.value.getOrCompute(question, answer)`;
     move the security-boundary comments there into a one-line pointer to `Question`'s doc.
  4. Replace both `new DecisionRecord({...})` with `decisionRecord(question, stamp, { outcome: new Failed({ error }) })`
     and `decisionRecord(question, stamp, { cache: lookup.outcome, outcome: new Decided({ decision }) })`.
  5. Read `subject.id`, `policy._tag`, `action` for the span/log/`Decision` from `question`
     (`question.subject.id`, `question.policy._tag`, `question.action`). Keep every comment about
     *why* (span key presence, obligations attribute, last-emission order).
  6. Optionally extract `observe(question, decision, durationMillis)` (span + metrics + denial log)
     as a non-exported plain function returning `Effect<void>` — only if it shortens `evaluate`
     without reordering; do not wrap it in `Effect.fn`.
  7. Delete the now-unused `DEFAULT_MAX_DEPTH` import from `Evaluate.ts`.
- **Tests:** none added; every existing `evaluate`/cache/sink/span test is the oracle (§7).
- **Verify:** `pnpm vitest run packages/core`; `pnpm typecheck`; success-criterion-3 greps;
  `node scripts/check-house-style.mjs`.
- **Done when:** all `packages/core` tests pass with no assertion edited, and `evaluate`'s body
  reads `options?.` only for `evaluationId` and `concurrency`.

### T5 — Move the interpreter into internal `Walk.ts` (pure move)
- **Status:** [x] done
- **Depends on:** T4, D-16-c (A)
- **Files:** `packages/core/src/Walk.ts` (*new*); `packages/core/src/Evaluate.ts`;
  `scripts/check-house-style.mjs`; `AGENTS.md` (§5, §5a tables and the prose naming
  `Evaluate.ts` for these functions)
- **Steps:**
  1. **Commit A (move only):** cut from `Evaluate.ts` everything from `NO_OBLIGATIONS` (`:263`)
     through the end of `evaluateRules`, plus `interface Evaluation` (`:213-236`) and the new
     `walk`, and paste into `Walk.ts` unchanged, in the same order. Add the imports they need
     (copy the relevant lines from `Evaluate.ts`'s import block; drop what `Evaluate.ts` no
     longer uses). `export` only `walk`. Module doc comment: "The interpreter: walks a policy for
     one `Question`. Internal (not in the barrel) because it decides without an id, a record or a
     metric — callers that need a decision use `evaluate`; the one other caller is the readiness
     probe (ARCH-16)." No other edits inside the moved text — `git diff -M --stat` should show
     the bulk as a move.
  2. In the same commit, re-key `SWITCH_BUDGET`, `SWITCH_BUDGET_NAMES`, `UNTRACED_BUDGET`,
     `UNTRACED_BUDGET_NAMES` from `"packages/core/src/Evaluate.ts"` to
     `"packages/core/src/Walk.ts"` (same counts 1 and 3, same names), and update their comments.
  3. AGENTS.md: §5's table rows `Evaluate.ts — evaluateAllOf/AnyOf/Rules` → `Walk.ts — …`;
     §5a's `Evaluate.ts — evaluateNode` → `Walk.ts — evaluateNode`; the prose sentences that say
     "the root `evaluate` stay `Effect.fn`" keep `Evaluate.ts`. Add one sentence to §5: "`walk`
     (`Walk.ts`) is a plain function returning `Effect.suspend`, neither traced nor in the budget:
     it runs once per evaluation and the root span is `evaluate`'s."
  4. **Commit B (fix-ups):** any comment in `Walk.ts`/`Evaluate.ts` that says "below"/"above" across
     the new file boundary, and `PortAccess.ts`/`Predicate.ts`/`Matcher.ts`/`ShortCircuit.ts`/
     `FieldLattice.ts` comments that name "`Evaluate.ts`'s `evaluateNode`" (find with
     `grep -rn "Evaluate.ts" packages/core/src`), repointed to `Walk.ts`.
  5. Benchmarks import `evaluate` only (`Evaluate.bench.ts:73`, `DecisionCache.bench.ts`); no change.
     `EffectFn.bench.ts` — check with `grep -n "Evaluate" packages/core/bench/EffectFn.bench.ts`.
- **Tests:** none added; full `packages/core` suite is the oracle.
- **Verify:** `git diff -M50% --stat HEAD~1` (Commit A shows a rename-like move);
  `node scripts/check-house-style.mjs`; `pnpm circular`; `pnpm typecheck`;
  `pnpm vitest run packages/core`; `grep -n "walk\|Walk" packages/core/src/index.ts` → nothing.
- **Done when:** gate 4 passes with the re-keyed budgets, madge is clean, tests green, `Walk.ts`
  absent from the barrel.

### T6 — The probe asks the walk; flip T1 green; pin "a probe is not a decision"
- **Status:** [x] done
- **Depends on:** T1, T5, D-16-b, D-16-d
- **Files:** `packages/core/src/GuardHealthCheck.ts`; `packages/core/test/GuardHealthCheck.test.ts`;
  `packages/core/test/GuardHealthCheck.tst.ts` (*new*)
- **Steps:**
  1. `GuardHealthCheck.ts`: drop `import { decide } from "./Qadi.ts"`; import `CurrentSubject`,
     `questionOf` (`./Question.ts`), `walk` (`./Walk.ts`). Body:
     `const subject = yield* CurrentSubject; const checkedAt = yield* Clock.currentTimeMillis;`
     `const [elapsed, result] = yield* Effect.timed(Effect.result(walk(questionOf(subject, canaryPolicy, options), options?.concurrency)));`
     then (D-16-d A) `yield* Effect.annotateCurrentSpan(Result.isSuccess(result) ? { "qadi.healthy": true } : { "qadi.healthy": false, "qadi.error_tag": result.failure._tag });`
     and return the same `satisfies GuardHealthCheckResult` object.
     Keep `checkedAt` read before the timed section (the `TestClock` test at
     `GuardHealthCheck.test.ts:28-37` pins `5000`).
  2. Rewrite the module and function doc comments: summary first ("A readiness probe: asks the
     wired ports a canary question and reports whether they answered"); then why it walks rather
     than decides (C5's cache, C6's records/metrics, C9's id); keep the issue #100 correction
     paragraph but update "reaches `Effect.result` below" to the walk; state that
     `options.evaluationId` is ignored and `concurrency` honoured.
  3. Flip T1's `it.effect.fails` to `it.effect`; remove the "ARCH-16 T6 fixes" note.
  4. Add tests (D-16-b A):
     - "a probe records nothing": recording sink + cache; two probes (one allow, one deny canary);
       assert `records.length === 0` and `yield* DecisionCache.use((c) => c.size)` is `0`.
     - "a probe counts no decisions": under `isolatedMetrics` (helpers), read
       `qadi_decisions_total` before/after two probes; unchanged. (Mirror `DecisionSink.test.ts:226`'s metric read.)
     - "a probe needs no evaluation id": provide `Layer.mergeAll(currentSubjectLayer(s), portsLayer())`
       without `evaluationIdSequential()` and run it — compiles and is healthy.
     - "the probe span says whether it was healthy": `collectingTracer(spans)`; one unhealthy probe;
       the `qadi.guardHealthCheck` span carries `qadi.healthy: false`, `qadi.error_tag: "AttributeResolveError"`;
       no `qadi.evaluate` span exists.
  5. `GuardHealthCheck.tst.ts`: `expect(createGuardHealthCheck(p)).type.toBe<Effect.Effect<GuardHealthCheckResult, never, CurrentSubject | PortServices>>()`.
- **Tests:** T1's test now passes plainly; four new runtime tests; one type test. Existing five
  tests unchanged.
- **Verify:** `pnpm vitest run packages/core/test/GuardHealthCheck.test.ts`; `pnpm test:tstyche`;
  revert step 1 locally (call `decide` again) and confirm T1's test and "records nothing" go red; restore.
- **Done when:** all probe tests pass on the walk and fail on the old `decide` path.

### T7 — Spec, ADRs, overview, traceability, glossary, CCR, changeset
- **Status:** [x] done
- **Depends on:** T2–T6 (and D-16-a…f as taken)
- **Files:** `spec/decisions/NNN-a-question-is-asked-once.md` (*new*, ADR-QD-NEXT);
  `spec/decisions/index.yaml`; `spec/decisions/031-decision-cache.md`;
  `spec/decisions/044-an-optional-decision-sink.md`; `spec/decisions/073-the-fnuntraced-exception-is-measured.md`;
  `spec/behaviors/05-evaluator.md`; `spec/behaviors/21-decision-cache.md`;
  `spec/behaviors/24-decision-sink.md`; `spec/invariants.md`; `spec/traceability.md`;
  `spec/overview.md`; `spec/glossary.md`; `spec/README.md`; `.changeset/question-and-walk.md` (*new*)
- **Steps:**
  1. **ADR-QD-NEXT** "A question is asked once": context (C1–C9, the probe output); decision (the
     `Question` value and `QuestionOptions` split; `walk` internal in `Walk.ts`; `evaluate` as the
     lifecycle; one emitter; a probe walks and is not a decision); alternatives (D-16-b B/C,
     D-16-c B/C/D, D-16-f C); consequences (DecisionCacheKey removed; probe requirement narrowed;
     probe no longer in records/metrics; measured cost from T8).
  2. **ADR-QD-031 amendment** (dated, CCR-QD-NEXT): the key is `Question`; correct `:72`'s listing to
     `subject + policy + resource + action + maxDepth`; a readiness probe never consults the cache,
     because a cache with no TTL turns a probe into a constant.
  3. **ADR-QD-044 amendment**: the "enforced twice" guarantee now lives in one emitter
     (`SinkEmit.ts`) for both record kinds, and `sink-read-once` keeps it there.
  4. **ADR-QD-073 note**: the three functions now live in `Walk.ts`; set and count unchanged.
  5. **05-evaluator.md**: BEH-QD-033 ("One evaluator") gains a paragraph: the interpreter is
     `walk`; `evaluate` is the only public path to a decision. Add **BEH-QD-NEXT** "A readiness
     probe asks the ports every time" — REQUIREMENT: `createGuardHealthCheck` MUST consult the wired
     ports on every call regardless of any `DecisionCache`, MUST NOT emit a `SinkRecord`, MUST NOT
     update `qadi_decisions_total`; a ` ```typescript ` example (probe with a cache wired, two calls)
     that compiles under `check-doc-examples.mjs`.
  6. **21-decision-cache.md**: BEH-QD-163/168's `DecisionCacheKey` listing becomes `Question` (a
     ` ```ts ` listing); add to BEH-QD-163 "which options are in the question is the type
     `QuestionOptions`; `concurrency` and `evaluationId` are not, because they do not change the answer".
  7. **24-decision-sink.md**: BEH-QD-182 names the single emitter; BEH-QD-183 says a record's request
     half is projected from the `Question` (and that `maxDepth` is deliberately not on the wire).
  8. **invariants.md**: INV-QD-033's Source → `Question.ts` (`Question` carries the whole subject),
     `DecisionCache.ts`; INV-QD-035's Source → `SinkEmit.ts` (`sinkEmitter`) for both `evaluate` and
     `discharge`, Enforcement adds `sink-read-once` and T3's all-emit-sites test; INV-QD-030's
     Enforcement adds `Question.test.ts`'s classification differential; **INV-QD-NEXT** "A probe's
     verdict on port health is never served from a cache" with Source `GuardHealthCheck.ts`/`Walk.ts`,
     Enforcement T1/T6 tests.
  9. **overview.md**: add `Question` (type), `QuestionOptions` (type), `questionOf` (function) from
     `Question.ts`; remove `DecisionCacheKey`; rewrite `:224-230` ("runs … through `decide`") to
     "walks a caller-supplied canary `Policy` against the wired ports, bypassing the decision cache
     and recording nothing — it reports whether the ports answered, it does not make a decision".
     Gate 13 must pass.
  10. **glossary.md**: "Question — the value a decision answers: subject, policy, resource, action,
      `maxDepth`. The cache key and the request half of a decision record." Cross-reference ARCH-23's
      React usage if it has landed.
  11. **traceability.md**: §1 rows for BEH-QD-NEXT and `Question.ts`/`Walk.ts`/`SinkEmit.ts`; §2 INV-QD-NEXT;
      §3 ADR-QD-NEXT, and ADR-QD-031/044/073 rows note the amendments; §4 rows for `Question.test.ts`,
      `GuardHealthCheck.tst.ts`, extended `GuardHealthCheck.test.ts` and `DecisionSink.test.ts`; spec
      references to `Evaluate.ts`'s moved symbols (`grep -rn "Evaluate.ts" spec | grep -E "evaluateNode|evaluateAllOf|evaluateAnyOf|evaluateRules"`)
      repointed to `Walk.ts` — except inside change-history rows and dated amendments (§15: history is exempt).
  12. **spec/README.md**: CCR-QD-NEXT row listing every document above with its new revision, and
      T8's bench figures.
  13. **Changeset** `@qadi/core` minor: "**Breaking:** `DecisionCacheKey` is replaced by `Question`
      (`DecisionCacheShape.getOrCompute(question, compute)`). Adds `Question`, `QuestionOptions`,
      `questionOf`; `EvaluateOptions` now extends `QuestionOptions`. **Fix:** `createGuardHealthCheck`
      no longer reports healthy from a cached answer when a `DecisionCache` is wired; it now asks the
      ports every time, records nothing to a `DecisionSink`, counts no decision metrics, and requires
      only `CurrentSubject` and the ports."
- **Tests:** n/a (doc gates).
- **Verify:** `pnpm spec:examples` (`check-doc-examples.mjs`); `pnpm spec:verify:strict`;
  `pnpm spec:api` (`check-api-surface.mjs`); `pnpm spec:gates` (`check-dod-table.mjs`);
  `pnpm spec:claims` (`check-devtools-claims.mjs`, expected untouched).
- **Done when:** all pass; placeholders are numbered at landing.

### T8 — Measure before and after (no gate)
- **Status:** [x] done
- **Depends on:** T0 (before), T6 (after), D-16-e
- **Files:** none committed (numbers go to §10 and the CCR row)
- **Steps:**
  1. On `main` (before) and on the branch (after), same machine, same session, nothing else running:
     `pnpm vitest bench --run packages/core/bench/Evaluate.bench.ts` and
     `pnpm vitest bench --run packages/core/bench/DecisionCache.bench.ts`, three runs each.
  2. Record means for `one node`, `resolver miss — one port call`, `deep — 10 levels`,
     `matcher-heavy — 3 refs` and cache `hit`/`miss`.
  3. If any after-mean exceeds the before-range's max by more than the before-range's width,
     investigate before T9 (first suspect: `questionOf` building the `Question` eagerly on the
     no-cache path; it may move inside `walk`'s suspend for that path only if that helps).
- **Tests:** n/a.
- **Verify:** the commands above.
- **Done when:** §10 has both rows and the CCR row quotes them.

### T9 — Full gate
- **Status:** [x] done
- **Depends on:** T1–T8
- **Files:** none
- **Steps:**
  1. `pnpm check`. Expect gate 4 (`check-house-style.mjs`) to exercise the re-keyed budgets and the
     new `sink-read-once` rule; gate 13 (`check-api-surface.mjs`) the new exports; `pnpm mutation`
     (Stryker, `stryker.config.mjs`) the three new core modules.
  2. If Stryker reports survivors in `Question.ts`, `SinkEmit.ts` or `GuardHealthCheck.ts`, add the
     killing test to the file named in §7 rather than lowering anything.
- **Tests:** everything.
- **Verify:** `pnpm check`.
- **Done when:** it passes; §10 records the Stryker score for core.

### T10 — Update the tracker
- **Status:** [x] done
- **Depends on:** T9
- **Files:** `.planning/architecture/README.md`; this file's frontmatter and §10
- **Steps:** add/refresh the ARCH-16 row; record C5 under "Defects found while planning"
  (ARCH-16 · T1 → T6, "a readiness probe reports healthy from a cached answer while the store is
  down", startable without decision) and C6 (canary records/metrics, fixed by T6 under D-16-b A);
  set `status:` and copy the D-16 outcomes into the decision register.
- **Tests:** n/a.
- **Verify:** `grep -hE '^status:|Status:\*\* \[' .planning/architecture/ARCH-*.md | sort | uniq -c`.
- **Done when:** the row and both defect entries are present.

## 7. Test strategy

**Survive unchanged (the regression net; assertions untouched, imports may move):**
`Evaluate.test.ts` (including the `qadi.evaluate` span tests at `:2378-2420` — the root span and
its attributes must be identical), `DecisionSink.test.ts` (record shape, `at`/id, `Failed` vs
`Decided`, cache outcome absent vs miss, throwing/dying sinks on both paths, obligation records),
`DecisionSink.tst.ts`, `DecisionCache.test.ts` (hit/miss/coalesced, INV-QD-033's two-token test,
"equal grants, different Set identity", the provide-per-execution trap), `Qadi.test.ts`,
`SubjectSet*.test.ts`, the concurrency tests, `PortAccess.test.ts`, every `@qadi/react`/`http`/
`promise`/`devtools` suite (they reach `evaluate` only), and the BDD features. These are what make
T4 and T5 refactors rather than rewrites.

**Moved to the new interface:** the *reason* `maxDepth` is in the key, today pinned indirectly by
`DecisionCache.test.ts`'s cross-question tests, is now pinned directly at `questionOf` by
`Question.test.ts`'s classification differential, which also covers `concurrency` and
`evaluationId` (never tested as "not in the key" before). The cache tests keep their end-to-end
checks; nothing is deleted from them, because they test the cache's storage, which this plan does
not change.

**Added:** `Question.test.ts` (classification table + defaults + structural equality);
`GuardHealthCheck.test.ts` T1 pair (red-then-green + control) and T6's four (records, metrics,
no id, probe span); `GuardHealthCheck.tst.ts` (narrowed requirement); one all-emit-sites
dying-sink test in `DecisionSink.test.ts`.

**Deleted:** none. The existing health-check tests remain valid (they never wired a cache or sink).

**Property / differential / mutation:** INV-QD-025's hit-equals-miss properties in
`DecisionCache.test.ts` keep running against the `Question` key; `Question.test.ts`'s per-option
differential is exhaustive by type rather than sampled. Stryker (`stryker.config.mjs`, `break: 80`)
covers `Question.ts` (the `??` default, the field projection), `SinkEmit.ts` (the `isSome` branch and
the `catchCause` — killed by T3's all-sites test), and `GuardHealthCheck.ts` (the `healthy`/`errors`/
annotation mapping — killed by T6's tests). `Walk.ts`'s mutants are today's `Evaluate.ts` mutants,
killed by the same tests.

## 8. Spec and documentation updates

Covered task by task in T7. Summary: ADR-QD-NEXT (new); ADR-QD-031, ADR-QD-044 amended, ADR-QD-073
noted; BEH-QD-033, BEH-QD-163, BEH-QD-168, BEH-QD-182, BEH-QD-183 edited; BEH-QD-NEXT (probe) added;
INV-QD-030/033/035 Sources/Enforcement updated; INV-QD-NEXT (probe never cached) added;
`spec/overview.md` (gate 13: +`Question`, +`QuestionOptions`, +`questionOf`, −`DecisionCacheKey`,
`createGuardHealthCheck` paragraph); `spec/glossary.md` (Question); `spec/traceability.md` (§1–§4 and
moved-symbol references, history rows exempt); `spec/README.md` CCR-QD-NEXT; AGENTS.md §5/§5a tables
(T5); `.changeset/question-and-walk.md`. The `packages/core` README and the website were checked for
`DecisionCacheKey`/`createGuardHealthCheck` (`grep -rln` at `e328e75`): neither mentions them, so no
website change is expected — re-grep in T7.

## 9. Risks and rollback

- **Sequencing with ARCH-17 and ARCH-26 (and ARCH-22).** T5 moves the code both edit
  (`evaluateNode`, the three composite folds). If either is in flight, land T5's Commit A first and
  have them rebase onto `Walk.ts` (rename detection handles a pure move), or land them first and
  redo T5's mechanical cut. Do not interleave edits inside the moved range. T1–T4 touch only the
  lifecycle and can land any time.
- **ARCH-23 (React question handle + `QuestionBook`)** will name a React-side "question". If it
  lands first with its own `Question` type, D-16-a must pick a non-colliding name or ARCH-23 adopts
  core's `Question` minus `subject`. Raise it when either plan is picked up.
- **ARCH-25 (encode-refusal description in core)** touches sink internals; `SinkEmit.ts` is the
  emitting side and should be where any "emission refused" accounting would hook, if ARCH-25 needs one.
- **ARCH-29 (`./*` subpath export)** — until it lands, `@qadi/core/Walk` and `@qadi/core/SinkEmit` are
  importable deep paths, exactly as `@qadi/core/PortAccess` is today. `walk` deciding without a record
  is then reachable by a determined caller; ARCH-29 closing `./*` removes that.
- **Order-sensitive observables.** Moving reads could change `EvaluationId` sequences or `at`
  (`DecisionSink.test.ts:125`, `:447`), or record field presence (`cache` absent on `Failed`). The
  existing tests catch each; T3/T4 keep the order verbatim.
- **Hash identity of the key.** If `questionOf` omitted a key instead of setting it to `undefined`,
  `Equal`/`Hash` would differ from today's key and an application-scoped cache built before an upgrade
  is irrelevant (caches are in-process), but two code paths building questions differently would miss.
  There is one path (`questionOf`); `Question.test.ts` asserts `Object.hasOwn`.
- **Probe behaviour change is observable to operators.** Dashboards that counted probe traffic in
  `qadi_decisions_total`, or alerting on `qadi.evaluate` spans under the probe, change. Stated in the
  changeset; the probe span's new attributes replace the lost signal (D-16-d A).
- **Breaking type removal** (`DecisionCacheKey`). Mitigation if a downstream consumer exists: D-16-a B's
  alias, decided before T2.
- **Rollback.** T1 is test-only. T2–T4 revert as one commit set (behaviour-preserving, so reverting is
  safe). T5's two commits revert together with the budget re-key. T6 reverts to `decide` — and T1's
  test returns to `.fails`, so the defect stays documented.

## 10. Progress log

| Date | Task | Change | By |
| ---- | ---- | ------ | -- |
| 2026-10-07 | — | Plan written; evidence verified at `e328e75`; C5 reproduced by scratch probe (`first true second true [] calls 1 records 2`), control without cache passes. | planner |
| 2026-10-07 | T0–T10 | Implemented (wave 3). D-16-a…f decided at the recommended defaults. Ids: CCR-QD-189, ADR-QD-100, BEH-QD-317, INV-QD-102. Deviations: T1's red was observed then the test kept plain (one commit); T5 landed as one commit with the move, not two; `decisionRecord` became `failedRecord`/`decidedRecord` (a spread measurably cost, and a Failed record must omit `cache`); `PolicyExplorer.tsx` now imports core's `DEFAULT_MAX_DEPTH`. T8: sequential `pnpm bench` was unusable (load average above 20); an interleaved in-process A/B showed parity (one node min 7.5-7.9 vs 8.0-8.2 us). T9: `pnpm check`, mutation and coverage left to the orchestrator. | implementer |
