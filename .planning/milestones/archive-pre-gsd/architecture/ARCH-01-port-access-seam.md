---
id: ARCH-01
title: One port-access module for both Policy interpreters, so evaluate and toPredicate differ only in what they do with the answer
strength: Strong
status: done
evidence_verified_at: 1caf04c
depends_on: []
blocks: []
adrs_touched:
  - ADR-QD-024 (amend — translation's error modes and where it stops asking)
  - ADR-QD-051 (amend — port spans in both interpreters, `qadi.interpreter`)
  - ADR-QD-073 (amend — names only; the traced port wrappers move module)
  - ADR-QD-005 (read — lazy attribute resolution)
  - ADR-QD-013 (read — short-circuit by default)
  - ADR-QD-017/026 (read — concurrent evaluation folds in declaration order)
  - ADR-QD-034 (read — measured exceptions, `SWITCH_BUDGET`)
  - ADR-QD-037 (read — madge circular-import gate)
  - ADR-QD-025 (read — mutation gate, no ignore list)
  - ADR-QD-052 (read — metric declared once, description is part of the key)
  - ADR-QD-NEXT (new — both interpreters read ports through one module and stop where the evaluator stops)
packages: ["@qadi/core", "@qadi/devtools", "features (acceptance suite)"]
estimate: L
---

# ARCH-01 — One port-access module for both Policy interpreters

## 1. Verified evidence (at `1caf04c`)

Re-checked against `git rev-parse --short HEAD` = `1caf04c`. Since the review
was written, `effect` became a peer dependency (`pnpm-workspace.yaml:34-37`,
`catalog:peer` → `effect: ^4.0.0`; `packages/core/package.json` `peerDependencies`)
and the installed build is `effect@4.0.0` (not the `rc.116` AGENTS.md §4 still
names). The `Cause.hasFails`/`Cause.hasDies`/`Effect.catchCause` functions the fix
relies on exist in 4.0.0; `Evaluate.ts` compiles and its tests pass against it.

Settling runs used a throwaway script outside the repo
(`/private/tmp/claude-502/…/scratchpad/repro.mts`, run with
`node_modules/.bin/tsx` from the repo root, importing `packages/core/src/*.ts`
and `packages/core/test/helpers.ts` by absolute path). Baseline:
`pnpm vitest run packages/core/test/Predicate.test.ts` → 65/65 pass.

| # | Review claim | Verdict | What HEAD shows |
| - | ------------ | ------- | --------------- |
| E1 | Issue #100 added `catchPortDefect` (Evaluate.ts ~375) | **CONFIRMED** | Doc comment `packages/core/src/Evaluate.ts:343-374`, definition `:375-384`. Rewrites only a cause with a `Die` and no `Fail`; a `Fail` or an interrupt-only cause passes through `Effect.failCause` unchanged (`:379-383`). |
| E2 | Applied at 5 port call sites, so a throwing adapter becomes a typed error | **CONFIRMED** | `AttributeResolver.resolve` `Evaluate.ts:416-420` → `AttributeResolveError`; `DecisionHistory.hasActed` `:656-664` → `DecisionHistoryUnavailable`; `RelationshipResolver.check` `:741-755` → `RelationshipResolveError`; `CustomPredicate.evaluate` `:801-811` → `CustomPredicateError` (`Cause.pretty` into `reason`); `SignatureHistory.signaturesFor` `:847-859` → `SignatureHistoryUnavailable`. Pinned by `packages/core/test/Evaluate.test.ts:3741-3931` ("port defects become typed errors", 8 tests) and `features/features/port-calls/port-calls.feature:52-58`. |
| E3 | A bare defect would otherwise reach `@qadi/http` as 500, not 502 | **CHANGED** | True for `evaluate`: `packages/http/src/QadiHttpError.ts:126` (`OUTAGE_STATUS = 502`) and `:155-157` classify the typed port errors as `"outage"`; a defect bypasses the classification. For `toPredicate` there is **no** `@qadi/http` call site (`git grep toPredicate -- packages/http` is empty); the HTTP consequence arises only in caller-written handlers. The reachable consequence for `toPredicate` is that a caller's `Effect.retry`/`Effect.catchTag` around it can never see the failure. |
| E4 | `foldAttribute` (~424) and `foldHistory` (~443) call the same ports with no `catchPortDefect` | **CONFIRMED** | `packages/core/src/Predicate.ts:422-424` (`AttributeResolver.resolve`), `:442-445` (`DecisionHistory.hasActed`); neither is wrapped. Scratch run: `toPredicate(hasAttribute("riskScore", lt(50)))` with `resolve: () => Effect.die(…)` → exit `Die` (`hasDies=true, hasFails=false`); same policy through `evaluate` → `Fail(AttributeResolveError)`. Same for `hasActed("onboarded", {scope:"Any"})` → `Die` vs `Fail(DecisionHistoryUnavailable)`. A **synchronous throw** inside `resolve` (`() => { throw … }`) also dies under `toPredicate` and is typed under `evaluate`. |
| E5 | That defect violates AGENTS.md §4 | **CHANGED** | The letter of §4 ("Never `Effect.orDie` in evaluation or enforcement paths") is not broken — no `orDie` exists. What is broken: §4's stated reason ("an authorization decision must never become a defect"); the port contract each Shape publishes — `AttributeResolver.ts:45-52` ("An implementation is not required to fail cleanly … converts it into this same `AttributeResolveError`"), `DecisionHistory.ts:58-61` — which an implementer reads as a guarantee that holds for every core caller; and the signature `BEH-QD-123` publishes (`spec/behaviors/16-predicates.md:78-82`: error channel `PolicyNotTranslatable \| EvaluationError`, i.e. typed). `BEH-QD-261` (`spec/behaviors/05-evaluator.md:168-202`) and `INV-QD-006`'s Source (`spec/invariants.md:170-194`) are scoped to `evaluate` only, so this is a **spec gap**, not a spec violation. Additional drift found: `AttributeResolver.ts:54-56` says "`Evaluate.ts`'s only call site" — false, `Predicate.ts:424` is a second one; `AttributeResolver.ts:112` names a `qadi.attempt` span that does not exist (the span is `qadi.attribute`). |
| E6 | The subject-first read is duplicated | **CONFIRMED** | `Evaluate.ts:433-439` (`readAttribute`) and `Predicate.ts:422-424` are the same three lines. The evaluator's miss path is the traced, counted, defect-mapped `resolveAttribute` (`:404-425`); the translator's miss path is the bare port call. |
| E7 | Omitting `portCallsTotal` in Predicate is documented as deliberate; the defect handling is not | **CONFIRMED** | Deliberate omission: `Predicate.ts:373-384`, `PortMetrics.ts:30-35` and `:76-91` (repeated in the metric's own `description`). Nothing anywhere states the defect gap or the span gap is deliberate: `git grep -i toPredicate -- spec` finds no sentence about spans, defects, or catching. ADR-QD-051's decision ("**Every port call gets a span**", `spec/decisions/051-a-span-says-what-was-asked.md`) is silent on the translator. |
| E8 | SUSPECTED — `translateNode` folds with `Effect.forEach`, no short-circuit, so a later failing `anyOf` child fails `toPredicate` where `evaluate` allows | **CONFIRMED, and broader** | `Predicate.ts:512-513` (`AllOf`/`AnyOf` via `Effect.forEach`) and `:547-550` (`translateRules` via `Effect.forEach`) visit every child; `Effect.forEach` is sequential fail-fast but has no notion of a decisive child. The evaluator stops at the first `Deny` of `AllOf` (`Evaluate.ts:1092-1101`, `:1163-1170`), at the first `Allow` of `AnyOf` only when `fieldStrategy === "First"` (`:1225`, `:1243-1249`), and per `INV-QD-017` for `Rules` (`:1355-1360`, `:1385-1397`). Scratch run with a resolver that **fails** (typed) and counts calls: `anyOf([hasRole("editor"), hasAttribute(…)])` (default `fieldStrategy` is `"First"`) → `evaluate` **Allow**, 0 resolver calls; `toPredicate` **Fail(AttributeResolveError)**, 1 call. `allOf([hasRole("admin"), hasAttribute(…)])` → `evaluate` **Deny**, 0 calls; `toPredicate` **Fail**, 1 call. `rules([permitWhen(hasRole("editor")), permitWhen(hasAttribute(…))], PermitOverrides)` → `evaluate` **Allow**, 0 calls; `toPredicate` **Fail**, 1 call. Under `anyOf(…, {fieldStrategy: "Union"})` `evaluate` is exhaustive and also fails — the two agree there. The divergence is fail-closed (an error, never a widening), but it is a liveness divergence and an extra port call `INV-QD-005` would forbid in the evaluator. |
| E9 | Check whether `Predicate.test.ts` pins this | **SETTLED: not pinned** | No test in `packages/core/test/Predicate.test.ts` counts port calls or composes a constant sibling with a failing port (`grep -n "Ref\.\|calls" …` finds only the metric tests at `:909-938`). The single port-failure test (`:384-398`) is a bare leaf. The property (`:858-880`) wires only well-behaved ports (`:26-36`). Changing the behaviour breaks no existing test. |
| E10 | Check whether the INV-QD-047 differential exercises port defects | **SETTLED: no, and it cannot** | `packages/predicate-sql/test/Agreement.test.ts` (and `predicate-prisma`'s) never calls `toPredicate` or any port (`git grep` for `toPredicate\|AttributeResolver\|DecisionHistory` in both `test/` dirs hits only comments in `CompileSql.test.ts`/`CompilePrismaWhere.test.ts`). INV-QD-047/048 compare `Predicate → SQL/Prisma` against `evaluatePredicate`, both pure. A port failure produces no `Predicate`, so it never reaches them. The right home for a port-fault differential is INV-QD-018's property in `@qadi/core`, which today samples only well-behaved ports. |

Further facts this plan depends on, all verified at `1caf04c`:

- **Unnamed `Effect.fn` opens no span.** `node_modules/.pnpm/effect@4.0.0/…/dist/internal/effect.js:890-930`: `addSpan` is `nameFirst`. Only `Effect.fn("name")` spans.
- **The evaluator's port spans wrap the whole arm, not just the call**: `qadi.acted` (`Evaluate.ts:635-678`) annotates the question, then runs `requireScopedResourceId` (`:615-623`, itself `Effect.fn("qadi.requireScopedResourceId")`), then the call. `BEH-QD-227` (`spec/behaviors/30-port-calls.md`) requires "A span MUST carry its question even when the port failed, or when the call was abandoned before it was made", so the question-forming precondition must live **inside** whichever function owns the span.
- **Devtools reads port calls by span name + annotations**: `packages/devtools/src/model/PortCalls.ts:44-50` (`PORT_SPANS`) and `rowOf` (`:257+`); and reads `portCallsTotal` with `Metric.value` on the un-attributed series (`packages/devtools/src/model/Wiring.ts:145`). Any `qadi.attribute` span `toPredicate` starts emitting will appear in that collector.
- **Metric identity**: `effect/Metric` keys its registry on `type:id:description` (user memory `reference_effect_metric_registry_keying.md`; ADR-QD-052). Editing `portCallsTotal`'s `description` (`PortMetrics.ts:85-91`) changes its key.
- **Import graph**: none of `AttributeResolver.ts`, `DecisionHistory.ts`, `RelationshipResolver.ts`, `CustomPredicate.ts`, `SignatureHistory.ts`, `Errors.ts`, `PortMetrics.ts`, `Identity.ts`, `Policy.ts` imports `Evaluate.ts` or `Predicate.ts` (only `GuardHealthCheck.ts`, `EvaluationServicesNone.ts`, `Qadi.ts`, `SubjectSet.ts` and the barrel do). `pnpm circular` is clean at HEAD.
- **Out-of-barrel precedent**: `packages/core/src/RetryingLayer.ts:1-15` is shared scaffolding kept out of `index.ts` (AGENTS.md §9) and listed under `spec/overview.md`'s "Not listed above" (`:699`), because gate 13 (`node scripts/check-api-surface.mjs`) expands the `./*` wildcard subpath to every `src/*.ts`.
- **Budgets at HEAD**: `UNTRACED_BUDGET = { "packages/core/src/Evaluate.ts": 3 }` (`scripts/check-house-style.mjs:362-366`, names at `:377-379`); `SWITCH_BUDGET` 4 switches (`Evaluate.ts` 2, `Matcher.ts` 2). Mutation gate: `stryker.config.mjs` mutates `packages/core/src/**/*.ts`, break at 80, **no ignore list** ("If one becomes necessary it belongs in an ADR first").

## 2. Goal and success criteria

**Goal.** Today the two Policy interpreters (ADR-QD-024) share port-access
semantics only by convention: `Evaluate.ts` reads each port through a traced,
counted, defect-mapped wrapper, and `Predicate.ts` re-implements two of those
reads bare. Deepen this into one **module**, `packages/core/src/PortAccess.ts`,
whose small **interface** — one function per port read — hides the whole
policy for asking a port: subject-first lookup, forming the question
(resource-id requirement, depth clamp), the span and its annotations, the
call metric, and defect-to-typed-error mapping. Both interpreters become
**adapters** over that **seam** and keep only what is genuinely theirs: what
to do with the answer (a `Trace` verdict vs. a constant `Predicate`). The
module earns **depth** (five reads, each ~25 lines of policy, behind one call
each) and **locality** (the next port, the next defect rule, the next span
attribute is one edit, reaching both interpreters). As a second, smaller
seam, the *stop rule* — which child result settles a composite — moves into
one place so translation stops asking ports exactly where evaluation does.
The interpreters are **not** merged (ADR-QD-024).

**Success criteria** (each observable):

1. `git grep -nE "AttributeResolver\.resolve\(|DecisionHistory\.hasActed\(|RelationshipResolver\.check\(|CustomPredicate\.evaluate\(|SignatureHistory\.signaturesFor\(" -- packages/core/src` lists only `PortAccess.ts` (plus each port module's own `static` accessor definition, e.g. `AttributeResolver.ts:76`).
2. `git grep -n "catchPortDefect" -- packages/core/src` shows its definition only in `PortAccess.ts`; `Evaluate.ts` and `Predicate.ts` do not define it.
3. `git grep -n "Object.hasOwn(subject.attributes" -- packages/core/src` returns exactly one hit, in `PortAccess.ts`.
4. New tests in `packages/core/test/Predicate.test.ts` — a dying/throwing `AttributeResolver` and `DecisionHistory` under `toPredicate` fail with `AttributeResolveError`/`DecisionHistoryUnavailable`, never a `Die` — fail at `1caf04c` and pass after T4.
5. `packages/core/test/PortAccess.test.ts` (*new*) pins the full cause matrix of `catchPortDefect` (Fail, Die, sync throw, Interrupt, Fail+Die, Die+Interrupt) and passes.
6. The faulty-port differential properties (T7) pass: on resource-free trees the two interpreters make the identical sequence of port calls and end in the same outcome; on full trees a successful translation agrees with `evaluate` on every row; no translation ever ends in a defect.
7. `pnpm circular` reports no cycle; `node scripts/check-house-style.mjs` passes with `UNTRACED_BUDGET` and `SWITCH_BUDGET` **unchanged**.
8. `pnpm exec stryker run --mutate packages/core/src/PortAccess.ts,packages/core/src/ShortCircuit.ts,packages/core/src/Predicate.ts` reports zero surviving mutants in `PortAccess.ts` and `ShortCircuit.ts`, and no new survivors in `Predicate.ts` versus a HEAD baseline run; the full `stryker run` stays ≥ 80.
9. `pnpm check` passes (all 24 gates in `spec/process/definitions-of-done.md`).
10. Every existing `Evaluate.test.ts`, `Ports.test.ts`, `port-calls.feature`, and `packages/devtools/test/model/PortCalls.test.ts` assertion passes unchanged after T3 (the evaluator's span names, annotations and metric are byte-for-byte what they were).

## 3. Non-goals

- **Merging the two interpreters.** ADR-QD-024 accepts two; this plan shares the port read and the stop rule, never the fold.
- **Translating more nodes.** `HasRelationship`, `HasCustom`, `HasSignature`, resource-scoped history and `Obliged` stay refused (BEH-QD-123, INV-QD-050, INV-QD-056). `PortAccess` exposes their reads because the evaluator needs them, not because translation will.
- **Concurrency for `toPredicate`.** Translation stays sequential; `EvaluateOptions.concurrency` (ADR-QD-026) has no translator counterpart and gains none.
- **`@qadi/devtools`' `Capture.ts`** (`packages/devtools/src/model/Capture.ts:167-199`) calls ports directly to *record* answers for the simulator. It is a decorating adapter that passes causes through to whichever interpreter runs on top, so it stays as is.
- **Dialect compilers** (`@qadi/predicate-sql`, `@qadi/predicate-prisma`). E10: they consume a `Predicate`, which a port fault never produces. No change.
- **Retry/timeout/bounded wrappers** (`attributeResolverRetrying`, `…TimingOut`, `…Bounded`). They wrap the *port*, below this seam, and keep working for both interpreters unchanged.
- **The four budgeted `switch`es and the three `fnUntraced` dispatchers.** Untouched.

## 4. Constraints

| Constraint | Consequence for this plan |
| ---------- | ------------------------- |
| AGENTS.md §1 imports | `PortAccess.ts`/`ShortCircuit.ts` use `import * as Effect from "effect/Effect"` etc., `.ts` relative specifiers, `import type` for type-only imports. |
| AGENTS.md §2 `Context.Service` | No new service. `PortAccess` is a module of functions over the existing five services, not a sixth port. |
| AGENTS.md §4 errors | No `Effect.orDie`, no `catchTags({...})`. Defect mapping stays `Effect.catchCause` + `Cause.hasFails`/`Cause.hasDies` exactly as `Evaluate.ts:375-384`. No new error class; `SCHEMA_ERROR_BUDGET` unchanged (12). |
| AGENTS.md §5 `Effect.fn` | Each port read in `PortAccess` is a **named** `Effect.fn` (it owns the span). No new `Effect.fnUntraced` → `UNTRACED_BUDGET` stays `{Evaluate.ts: 3}` and `UNTRACED_BUDGET_NAMES` stays `evaluateAllOf/evaluateAnyOf/evaluateRules`. The evaluator arms that stop owning a span become plain functions returning `Effect.map(…)`, the shape `readAttribute` (`Evaluate.ts:433`) and `evaluateNode` (`:892`) already have; they must **not** become `fnUntraced`. Translation's per-node runner (T9) is a plain function like today's `translateNode` (once per translation, not per row). |
| AGENTS.md §5a `Match`, `SWITCH_BUDGET` | All new dispatch is `Match.tagsExhaustive` / `Match.type<…>()` hoisted where it returns a closure (the `dispatchCompare` shape, `Predicate.ts:123-173`). No new `switch` → `SWITCH_BUDGET` unchanged. |
| AGENTS.md §6 forbidden | No `as`, `!`, `any`; `ANY_BUDGET` unchanged. No `Date.now`/`performance.now`. `HAS_CUSTOM_BUDGET` unchanged (tests stay in `packages/core/test`). |
| AGENTS.md §9 barrels | `PortAccess.ts` and `ShortCircuit.ts` stay **out** of `packages/core/src/index.ts` (scaffolding, like `RetryingLayer.ts`). Gate 13 still sees them through the `./*` subpath, so every export gets a "Not listed above" row in `spec/overview.md`. A new public metric (D-01-c) goes into `PortMetrics.ts`, which *is* barrelled. |
| AGENTS.md §10 tests | `@effect/vitest` `it.effect`; core coverage 95%. `PortAccess.ts` must be ≥ 95% covered by core tests alone. |
| AGENTS.md §11/§12 spec normative | Behaviour docs, invariants and traceability change in the same change set (§8). New ` ```typescript ` fences must compile (gate 9). |
| AGENTS.md §15 gates 11-13 | Name the script with any gate number in prose. `spec/overview.md` must list every new export. |
| ADR-QD-037 madge (gate 5) | `PortAccess.ts` may import the five port modules, `Errors.ts`, `PortMetrics.ts`, `Identity.ts`, `Policy.ts` (for `DEFAULT_MAX_DEPTH`), and types from `AuthSubject.ts`/`Resource.ts`/`Signature.ts`. It must **never** import `Evaluate.ts`, `Predicate.ts`, `Qadi.ts`, `SubjectSet.ts`. `ShortCircuit.ts` imports only types from `Policy.ts`. |
| ADR-QD-024 | Two interpreters; failing beats approximating; refusals are tree-wide and conservative ("any `fields` anywhere"). Any pruning must keep refusals independent of the subject and of port answers. |
| ADR-QD-013 / INV-QD-005 / INV-QD-017 | The evaluator's stop rules are the reference; translation mirrors them, not the reverse. Nothing here changes when the evaluator stops. |
| ADR-QD-051 / INV-QD-044 / BEH-QD-227 | Span names and annotations are product observability; a subject hit emits nothing; a resolved value is never recorded; the question is annotated before any precondition can abandon the call. |
| ADR-QD-052 / metric keying | A metric is declared once; its `description` is part of its key and is pinned by a test. Do not edit `portCallsTotal`'s description. |
| ADR-QD-025 / Stryker | Unreachable code is an unkillable survivor and there is no ignore list. Designs that leave unreachable refusal arms are rejected (D-01-d). |
| Memory: closed unions, no `Record<string, unknown>` | New discriminants are closed unions (`Interpreter`, `PredicatePortName`, the plan ADT). The acted-question error channel is split by scope rather than widened (T3 step 4). Test generators use typed records over closed keys. |
| Memory: prefer complete | Recommendations below favour the fuller option where it is not wrong. |

## 5. Decisions needed before work starts

### D-01-a — Where the shared module lives, and how deep it is

- **(1) New internal module `packages/core/src/PortAccess.ts`, out of the barrel, owning the whole read** — subject-first lookup, question forming, span, metric, defect mapping. Deepest; one home; no cycle risk (it imports only leaves); precedent `RetryingLayer.ts`. Cost: gate-13 rows, a doc sweep for renamed wrappers.
- **(2) One function per port module** (`readAttribute` in `AttributeResolver.ts`, `askActed` in `DecisionHistory.ts`, …). Locality per port, but the *policy* (span rules, metric routing, defect rule) is spread over five files again, and each port module would pull in `PortMetrics`, `AuthSubject`, span conventions. Recreates today's problem one level down.
- **(3) Export the wrappers from `Evaluate.ts` and import them in `Predicate.ts`.** No cycle today, but couples the second interpreter to the first's module, and `Evaluate.ts` is barrelled, so internals become public exports.
- **(4) Shallow: share only `catchPortDefect`.** Fixes E4, leaves E6 duplicated and the span/metric policy still divergent by convention.

**Recommendation: (1).** `status: decided (2026-10-04, recommended default)`

### D-01-b — Does the module own evaluator-only question-forming (resource-id requirement, depth clamp, signature matching)?

- **(1) Yes.** The span's question must be annotated before `requireScopedResourceId` can abandon the call (BEH-QD-227), so whichever function owns the span must run the precondition. `requireScopedResourceId` (`Evaluate.ts:615-623`), `clampRelationshipDepth`/`MAX_RELATIONSHIP_DEPTH` (`:699-717`) and the signature match (`:860-865`, needed for the `qadi.matched` annotation) move into `PortAccess`. The evaluator arm keeps only the verdict sentence.
- **(2) No; `PortAccess` takes fully formed queries and the evaluator keeps its arm spans.** Then the span cannot live in `PortAccess`, so the module cannot own the span policy — the evaluator and translator would each open their own spans again (back to convention).

**Recommendation: (1).** `status: decided (2026-10-04, recommended default)`

### D-01-c — Does `toPredicate` get port spans and port metrics?

Context: ADR-QD-051 decided "every port call gets a span" while only the
evaluator existed as a caller; `Predicate.ts:373-384` and `PortMetrics.ts:30-35`
document the *metric* omission as deliberate because `portCallsTotal` means
"one per port `Evaluate.ts` can call into"; nothing documents a *span*
omission. Devtools collects every span named `qadi.attribute`/`qadi.acted`
regardless of parent.

- **(i) Status quo**: no spans, no metric for translation. The shared module needs an "untraced" mode — a second code path inside the seam, and a deployment leaning on row-level security keeps undercounting port load.
- **(ii) Spans only.** Satisfies ADR-QD-051's literal decision; devtools shows translation reads mixed with evaluation reads, indistinguishable.
- **(iii) Spans + count translation reads in `qadi_port_calls_total` via `Metric.withAttributes({interpreter})`.** Either the evaluator's series also gains the attribute — then `Wiring.ts:145`'s `Metric.value(portCallsTotal)` reads the unattributed series and goes to zero — or only translation is attributed, an asymmetric shape. Either way the description string must change, which changes the registry key (ADR-QD-052).
- **(iv) Spans + a `qadi.interpreter` annotation (`"evaluate" | "toPredicate"`, closed) on every port span + a sibling metric `qadi_predicate_port_calls_total`** (`Metric.frequency`, `preregisteredWords` over a closed `PredicatePortName = "AttributeResolver" | "DecisionHistory"`, declared once in `PortMetrics.ts`). `portCallsTotal` keeps its meaning, description and key; operators get the translation total; devtools can tell the two apart.

**Recommendation: (iv).** It is the complete option and the only one that
changes no existing contract. Cost: one public export pair, one
`BEH-QD-227` table column, one devtools field (T6). `status: decided (2026-10-04, recommended default)`

### D-01-d — Does translation stop asking ports where the evaluator stops?

- **(a) Keep eager translation; document the divergence.** `toPredicate` keeps asking every port in the tree and may fail where `evaluate` decides on every row (E8). Smallest diff; the error-mode invariant must then be stated as "translation may fail where evaluation decides".
- **(b) Mirror the evaluator's stop rules through a compile/run split.** A pure `compile` step turns the `Policy` into an internal plan (refusals produced here, independent of subject and ports); an effectful `run` step walks the plan, asks ports through `PortAccess`, and stops at a child whose *constant* result settles the composite under the evaluator's rule. Refusals stay reachable code (they are compile's outputs), and the runner never sees an untranslatable node. Pruning never changes a successful predicate (the dropped children could only contribute `FALSE` to an `Or`/`TRUE` to an `And`, see T9 step 6).
- **(c) Prune inside today's single `translateNode` with no static refusal pass.** Makes `PolicyNotTranslatable` depend on the subject: `anyOf([hasRole("editor"), hasRelationship("owner")])` would translate for editors and refuse for everyone else. Rejected as a correctness hazard (a policy that works in development for admins and fails in production).
- **(d) Prune in `translateNode` after a separate static refusal pre-pass.** `translateNode`'s refusal arms become unreachable; Stryker reports them (including the worst mutant, "refusal → `True`") as unkillable survivors, and the config has no ignore list.

**Recommendation: (b).** `status: decided (2026-10-04, recommended default)`

### D-01-e — Under (b), when is `MissingAction` raised?

- **(1) On reach**, as the evaluator does (INV-QD-011): the plan carries a "needs the action" node; the runner fails when it reaches it. Mirrors `evaluate` exactly, so the walk-equality property (T7, Property A) holds including `MissingAction`.
- **(2) Statically**, like refusals: any action-reading node anywhere fails without an action. More conservative, but disagrees with `evaluate` on trees where a constant decides first.

**Recommendation: (1).** `PolicyNotTranslatable` and `PolicyTooDeep` are
properties of the *tree* (static); `MissingAction` and port errors are
properties of the *request and the stores* (on reach). `status: decided (2026-10-04, recommended default)`

### D-01-f — Does the stop rule get its own home?

- **(1) Yes: new internal `packages/core/src/ShortCircuit.ts`** with two pure functions — `anyOfStopsAtAllow(fieldStrategy: FieldStrategy): boolean` and `rulesDecisiveEffect(combining: Combining): RuleEffect | undefined` — used by `Evaluate.ts:1225`/`:1355-1360` and by translation's runner. A change to when `anyOf` may stop changes both interpreters at once.
- **(2) Inline the rule in both interpreters**, kept honest only by Property A.

**Recommendation: (1).** (Only relevant if D-01-d is (b).) `status: decided (2026-10-04, recommended default)` — implemented as `Record` tables over each closed union rather than `Match.type` (a hand-built out-of-union value must read as the safe answer, not throw a `MatchError`); see the progress log.

## 6. Tasks

Phases: **A** = T1–T4 (the defect fix behind the new seam; shippable alone).
**B** = T5–T6 (observability, D-01-c). **C** = T7–T10 (error-mode
differential and stop-rule mirroring, D-01-d/e/f). **D** = T11–T13 (spec,
docs, gates). Each phase is its own PR.

### T1 — Reproduce the `toPredicate` port defect, test-first
- **Status:** [x] done (2026-10-04)
- **Depends on:** —
- **Files:** `packages/core/test/Predicate.test.ts`
- **Steps:**
  1. Add imports: `DecisionHistoryUnavailable` from `../src/Errors.ts`, `* as Cause from "effect/Cause"`, `* as Exit from "effect/Exit"`, `* as Ref from "effect/Ref"`, `* as Schedule from "effect/Schedule"`.
  2. Add `describe("BEH-QD-NEXT-a: a defecting port fails translation typed, not dead", …)` next to the existing `"INV-QD-006: a broken lookup fails rather than folding to False"` test (`:384`), with tests that mirror `Evaluate.test.ts:3754-3931` one for one:
     - `resolve: () => Effect.die(new Error("boom"))` on `P.hasAttribute("riskScore", M.lt(50))` → `Effect.result(toPredicate(…))` is `Failure`, `instanceOf AttributeResolveError`, `.attribute === "riskScore"`.
     - `resolve: () => { throw new Error("boom") }` (a synchronous throw while building the Effect) → same assertion.
     - `hasActed: () => Effect.die(…)` on `P.hasActed("onboarded", { scope: "Any" })` → `DecisionHistoryUnavailable`, `.event === "onboarded"`.
     - A port's own typed failure is the **same instance** after translation (`assert.strictEqual(r.failure, original)`).
     - An interrupting port (`resolve: () => Effect.interrupt`) → `Effect.exit(toPredicate(…))` is a failure whose cause `Cause.hasInterruptsOnly` (interruption is never converted into a retryable error).
     - `Effect.retry(Schedule.recurs(2))` around `toPredicate` with a resolver that dies twice then answers `9` for `M.gte(5)` → 3 attempts, result `{ _tag: "True" }`.
  3. Run and confirm the defect cases fail (they die). Do not commit red; T1 and T4 land in the same commit, but run T1 alone first and paste the failing output into the PR description as the reproduction.
- **Tests:** the six above. No existing test changes.
- **Verify:** `pnpm vitest run packages/core/test/Predicate.test.ts -t "defecting port"` — expect 3 failures (die, throw, history-die) before T4; the typed-instance, interrupt and retry-of-typed tests may already pass or fail on the die path (record which).
- **Done when:** the reproduction output is captured and the tests are on the branch.

### T2 — Extract `catchPortDefect` into `PortAccess.ts` with a cause-matrix test
- **Status:** [x] done (2026-10-04)
- **Depends on:** D-01-a
- **Files:** `packages/core/src/PortAccess.ts` (*new*), `packages/core/src/Evaluate.ts`, `packages/core/test/PortAccess.test.ts` (*new*)
- **Steps:**
  1. Create `PortAccess.ts` with a module doc comment (summary line first, per AGENTS.md doc-comment shape): "Every port read either interpreter makes, with its question, span, call metric and defect mapping." Second paragraph: why (ADR-QD-024's two interpreters, issue #100, E4/E6 of this plan → cite ADR-QD-NEXT once it has a number), and "Deliberately out of the barrel (AGENTS.md §9)".
  2. Move `catchPortDefect` verbatim from `Evaluate.ts:343-384` (doc comment and body), make it `export const`. Update the doc comment's "the five call sites below" to "every port read in this module".
  3. In `Evaluate.ts`, delete the local definition and `import { catchPortDefect } from "./PortAccess.ts";`. Remove the now-unused `Cause` import only if nothing else uses it (it is still used for `Cause.squash`/`Cause.pretty` until T3).
  4. Write `PortAccess.test.ts` (`it.effect`), driving `catchPortDefect((cause) => new AttributeResolveError({ attribute: "x", cause: Cause.squash(cause) }))` over:
     - `Effect.fail(original)` → same instance;
     - `Effect.die(err)` → `AttributeResolveError` whose `cause` is `err`;
     - `Effect.sync(() => { throw err })` → `AttributeResolveError`;
     - `Effect.interrupt` → exit cause `hasInterruptsOnly`;
     - a cause with both `Fail` and `Die` (`Effect.failCause(Cause.combine(Cause.fail(original), Cause.die(err)))`) → passes through unchanged (`Cause.hasDies` still true on the exit) — this kills the `||`→`&&` mutant;
     - a cause with `Die` and `Interrupt` (`Cause.combine(Cause.die(err), Cause.interrupt())`) → converted (no `Fail`, has `Die`) — this kills the `!Cause.hasDies` removal mutant;
     - `Effect.succeed(1)` → `1` untouched.
     `Cause.fail`, `Cause.die`, `Cause.interrupt`, `Cause.combine`, `Cause.hasInterruptsOnly` all exist in `effect@4.0.0` (`dist/Cause.d.ts:460-951`); if a later bump renames one, adjust the test, not the semantics.
- **Tests:** `PortAccess.test.ts` (new, 7 cases). `Evaluate.test.ts` unchanged.
- **Verify:** `pnpm vitest run packages/core/test/PortAccess.test.ts packages/core/test/Evaluate.test.ts` ; `pnpm circular` ; `pnpm typecheck`
- **Done when:** both files pass, `git grep -n "const catchPortDefect" packages/core/src` shows only `PortAccess.ts`.

### T3 — Move the evaluator's five port reads behind the seam
- **Status:** [x] done (2026-10-04)
- **Depends on:** T2, D-01-b, D-01-c (only for the `Interpreter` parameter's existence; with D-01-c (i) the parameter is dropped)
- **Files:** `packages/core/src/PortAccess.ts`, `packages/core/src/Evaluate.ts`, `packages/core/bench/Evaluate.bench.ts` (run only)
- **Steps:**
  1. **Baseline bench first**: `pnpm vitest bench --run packages/core/bench/Evaluate.bench.ts` 3×, record `resolver miss — one port call`, `one node`, `matcher-heavy` means in the PR (ADR-QD-034 habit; ADR-QD-051 measured 13.35 µs for `resolver miss`).
  2. In `PortAccess.ts` add `export type Interpreter = "evaluate" | "toPredicate";` (closed; doc comment says a third interpreter is a compile error everywhere it is matched).
  3. Move `resolveAttribute` (`Evaluate.ts:386-425`) and `readAttribute` (`:427-439`) into `PortAccess.ts`. Signature: `readAttribute(interpreter: Interpreter, subject: AuthSubject, attribute: string): Effect.Effect<unknown, AttributeResolveError, AttributeResolver>` — note the **narrowed** error channel (today `EvaluationError`, `:436`); `resolveAttribute` stays `Effect.fn("qadi.attribute")`, private to the module. Annotate `"qadi.interpreter": interpreter` with the question (D-01-c (iv)). Route the metric through a hoisted `Match.type<Interpreter>()` that returns the `Metric.update` to run (evaluate → `portCallsTotal`, toPredicate → the T5 metric; until T5 lands, both arms may target `portCallsTotal` **only if** T5 lands in the same PR — otherwise keep the parameter but pass only `"evaluate"` in this task).
  4. Move `evaluateActed`'s port half into two exported, named reads that share one private body (no widening of the error channel by scope):
     - `askActedAny = Effect.fn("qadi.acted")(function* (interpreter, subject, event) …)` → `Effect<ActedResult, DecisionHistoryUnavailable, DecisionHistory>`;
     - `askActedForResource = Effect.fn("qadi.acted")(function* (interpreter, subject, event, rawResourceId: unknown) …)` → `Effect<ActedResult, DecisionHistoryUnavailable | MissingResourceId, DecisionHistory>`;
     - both annotate `qadi.subject_id`, `qadi.event`, `qadi.scope`, `qadi.interpreter`, and `qadi.resource_id` exactly as `Evaluate.ts:647-652` does, **before** `requireScopedResourceId` (moved here from `:615-623`, still `Effect.fn("qadi.requireScopedResourceId")`); then a plain private function `callHasActed(query, event)` does metric + call + `catchPortDefect` + `qadi.answer` annotation.
  5. Move `MAX_RELATIONSHIP_DEPTH`, `clampRelationshipDepth` (`:680-717`, with their doc comments) and the port half of `evaluateHasRelationship` into `askRelationship = Effect.fn("qadi.hasRelationship")(function* (subject, relation, rawResourceId: unknown, depth: number | undefined) …)` → `Effect<RelatedResult, RelationshipResolveError | MissingResourceId, RelationshipResolver>`. Evaluator-only: annotate `qadi.interpreter: "evaluate"` as a constant (translation refuses this node statically, so no parameter that admits `"toPredicate"`).
  6. Same for `askCustom = Effect.fn("qadi.hasCustom")(…)` → `Effect<boolean, CustomPredicateError, CustomPredicate>` and `askSignature = Effect.fn("qadi.hasSignature")(…)` → `Effect<SignatureAnswer, SignatureHistoryUnavailable | MissingResourceId, SignatureHistory>` where `interface SignatureAnswer { readonly matched: boolean; readonly onFile: number }` — the match (`:860-865`) moves in so `qadi.matched` is annotated inside the span; the evaluator needs only `matched` and `onFile === 0` for its reason sentence.
  7. In `Evaluate.ts`, rewrite the five arms as plain functions returning `Effect.map(PortAccess.askX(…), verdictOf)`: `evaluateActed`, `evaluateHasRelationship`, `evaluateHasCustom`, `evaluateHasSignature` keep their names (fewer doc references to sweep) but lose `Effect.fn(…)` (the span now lives in `PortAccess`; keeping a named wrapper would double it). `HasAttribute`'s arm calls `PortAccess.readAttribute("evaluate", …)`. Each arm keeps its deny-reason sentences verbatim.
  8. Update `evaluateAllOf`'s doc comment (`:1135-1143`) to name the traced reads by their new home, and the `PortAccess.ts` doc to say these five stay traced per ADR-QD-051 and why they are not in `UNTRACED_BUDGET`.
  9. Re-run the bench 3×. Acceptance: each workload's mean within run-to-run noise of the baseline (ADR-QD-034 notes ~30% machine variance; compare same machine, same session). Record both tables in the PR.
- **Tests:** none added; this is behaviour-neutral for the evaluator. Every existing span/metric/defect test must pass unchanged: `Evaluate.test.ts` (incl. `:3741-3931` and the observability suite), `Ports.test.ts`, `RolesAndDepth.test.ts`, `Policy.test.ts`, `features/features/port-calls`, `packages/devtools/test/model/PortCalls.test.ts`.
- **Verify:** `pnpm typecheck && pnpm circular && node scripts/check-house-style.mjs && pnpm vitest run packages/core packages/devtools && pnpm test:bdd`
- **Done when:** success criteria 1, 2 (evaluator half), 7 and 10 hold, bench recorded.

### T4 — Route translation's two port reads through the seam (T1 goes green)
- **Status:** [x] done (2026-10-04)
- **Depends on:** T1, T3
- **Files:** `packages/core/src/Predicate.ts`, `packages/core/test/Predicate.test.ts`
- **Steps:**
  1. In `foldAttribute` (`Predicate.ts:410-426`) replace the inline `Object.hasOwn … ? Effect.succeed : AttributeResolver.resolve` (`:422-424`) with `PortAccess.readAttribute("toPredicate", subject, attribute)`.
  2. In `foldHistory` (`:433-446`) replace the bare call (`:442-445`) with `PortAccess.askActedAny("toPredicate", subject, event)`.
  3. Drop the now-unused `AttributeResolver`/`DecisionHistory` value imports from `Predicate.ts` if nothing else uses them (`PredicateServices` keeps them as types via `import type`).
  4. Rewrite the doc comment at `:373-384`: the reads now go through `PortAccess.ts`; whether they count and how they span is D-01-c's outcome (T5) — until T5 lands, state the interim truth precisely.
- **Tests:** T1's tests pass. The existing `"INV-QD-006: a broken lookup fails…"` (`:384`) still passes.
- **Verify:** `pnpm vitest run packages/core/test/Predicate.test.ts packages/core/test/PortAccess.test.ts` ; `git grep -n "Object.hasOwn(subject.attributes" packages/core/src` → one hit
- **Done when:** success criteria 1, 2, 3, 4 hold. **Phase A is shippable here.**

### T5 — Give translation's port reads spans and their own count
- **Status:** [x] done (2026-10-04)
- **Depends on:** T4, D-01-c (blocked until decided; the steps below assume (iv))
- **Files:** `packages/core/src/PortMetrics.ts`, `packages/core/src/PortAccess.ts`, `packages/core/src/Predicate.ts`, `packages/core/test/Ports.test.ts`, `packages/core/test/Predicate.test.ts`
- **Steps:**
  1. In `PortMetrics.ts` add `export type PredicatePortName = "AttributeResolver" | "DecisionHistory";`, a `Record<PredicatePortName, true>` (the `PORT_NAMES_BY_NAME` idiom, `:56-62`), and `export const predicatePortCallsTotal = Metric.frequency("qadi_predicate_port_calls_total", { description: "Calls toPredicate made into a resolver or history port while folding a policy, by port. The evaluator's calls are qadi_port_calls_total.", preregisteredWords: PREDICATE_PORT_NAMES })`. Do **not** edit `portCallsTotal` or its description.
  2. Update `PortMetrics.ts`'s module doc (`:30-35`) and `portCallsTotal`'s doc (`:76-84`): translation is now counted, in the sibling metric; keep the "do not read `qadi_port_calls_total` as total port traffic" warning, now pointing at the sum.
  3. In `PortAccess.ts` finish the hoisted `Interpreter` → metric dispatch (T3 step 3): `"toPredicate"` → `Metric.update(predicatePortCallsTotal, port)`. The `port` argument's type is `PredicatePortName` on the paths both interpreters share, so a translation read of a port outside that set is a compile error.
  4. In `Predicate.ts` replace the `:373-384` doc with the new truth: same spans as evaluation (`qadi.attribute`, `qadi.acted`) under `qadi.toPredicate`, annotated `qadi.interpreter: "toPredicate"`; counted in `qadi_predicate_port_calls_total`.
- **Tests:**
  - `Ports.test.ts`: (a) `qadi_predicate_port_calls_total` exists with both preregistered words at zero; (b) a translation that resolves one attribute and asks history once increments `AttributeResolver` and `DecisionHistory` by one each **and leaves `qadi_port_calls_total` unchanged** (delta reads around the act — the metric memoises on the object, so use `isolatedMetrics` and deltas, per the memory note); (c) a subject-held attribute counts nothing in either metric; (d) the description string is pinned verbatim (it is part of the registry key).
  - `Predicate.test.ts`: under `collectingTracer`, `toPredicate(hasAttribute("riskScore", …))` with a resolving port emits one `qadi.attribute` span whose parent is `qadi.toPredicate`, annotated `qadi.attribute`, `qadi.subject_id`, `qadi.interpreter === "toPredicate"`, `qadi.resolved === true`, and **no value**; a subject-held attribute emits no `qadi.attribute` span; a failing port's span still carries the question.
  - `Evaluate.test.ts`: one added assertion that evaluator port spans carry `qadi.interpreter === "evaluate"` (kills the annotation-literal mutant).
- **Verify:** `pnpm vitest run packages/core/test/Ports.test.ts packages/core/test/Predicate.test.ts packages/core/test/Evaluate.test.ts` ; `node scripts/check-api-surface.mjs` (expect it to fail until T11 adds the overview rows — run again there)
- **Done when:** the tests pass and `Wiring.test.ts`/`PortCalls.test.ts` in devtools still pass untouched.

### T6 — Let devtools tell evaluation's port calls from translation's
- **Status:** [x] done (2026-10-04)
- **Depends on:** T5, D-01-c = (iv)
- **Files:** `packages/devtools/src/model/PortCalls.ts`, `packages/devtools/test/model/PortCalls.test.ts`, `packages/devtools/src/model/Wiring.ts`, `packages/devtools/test/model/Wiring.test.ts`, the dock row renderer that displays `PortCall` (locate with `git grep -n "PortCall\b" packages/devtools/src/react`)
- **Steps:**
  1. Add `readonly interpreter: "evaluate" | "toPredicate" | undefined` to `PortCallBase` (`PortCalls.ts:56-69`), read with the existing typed `stringAt`-style helper and narrowed by a type predicate over the closed pair; anything else (including an older core that does not annotate) reads as `undefined` — "not recorded", per ADR-QD-051's consequence paragraph.
  2. Extend `portActivity` (`Wiring.ts:138-155`) to also read `predicatePortCallsTotal` and expose it as a separate `translationCalls` count per port (keep `calls` meaning evaluator calls, so no existing reader changes meaning). Keep the `> 0` filter semantics (issue #107) across both.
  3. Show the interpreter in the devtools Services screen's row (one short label), and the translation count beside the evaluator count.
- **Tests:** `PortCalls.test.ts` — a span annotated `toPredicate` yields `interpreter: "toPredicate"`, an unannotated one `undefined`, an unexpected string `undefined`. `Wiring.test.ts` — a `Metric.update(predicatePortCallsTotal, "AttributeResolver")` makes `AttributeResolver` appear with `translationCalls: 1, calls: 0`.
- **Verify:** `pnpm vitest run packages/devtools` ; `pnpm exec stryker run stryker.devtools.mjs`
- **Done when:** devtools tests and its mutation gate pass. **Phase B done.**

### T7 — Write the faulty-port differential properties (Property A red until T9)
- **Status:** [x] done (2026-10-04)
- **Depends on:** T4 (B and C), D-01-d/e (A's exact statement)
- **Files:** `packages/core/test/Predicate.test.ts`
- **Steps:**
  1. Add a closed behaviour type and generator, typed over closed keys (no `Record<string, unknown>`):
     ```ts
     type Behavior<A> =
       | { readonly _tag: "Answer"; readonly value: A }
       | { readonly _tag: "Fail" }
       | { readonly _tag: "Die" }
       | { readonly _tag: "Throw" };
     interface PortWorld {
       readonly riskScore: Behavior<number | undefined>;
       readonly absent: Behavior<number | undefined>;
       readonly onboarded: Behavior<ActedResult>;
       readonly never: Behavior<ActedResult>;
     }
     ```
     Bias the generator: ~70% `Answer`, ~10% each fault, so most trees still translate.
  2. Build `worldLayer(world, log: Ref<Array<PortCallKey>>)` where `PortCallKey = "attr:riskScore" | "attr:absent" | "acted:onboarded" | "acted:never"`, appending to the log on every call before honouring the behaviour (`Fail` → the port's own typed error; `Die` → `Effect.die`; `Throw` → a synchronous throw in the method body).
  3. **Property A — same walk on resource-free trees.** Leaves: `hasRole`, `hasPermission`, `hasAttribute(riskScore|absent|seniority, gte(3))`, `hasActed(onboarded|never, Any)`, `hasNotActed(…, Any)`, `hasAction("read")`; composites `allOf`/`anyOf` (each `fieldStrategy` sampled from all three) /`not`/`labeled`/`rules` (all three algorithms). For each `(tree, world, action ∈ {undefined, "read", "write"})`: run `toPredicate` and `evaluate(tree, { resource: { id: "r" }, action })` against fresh logs. Assert: the two logs are deep-equal (same calls, same order); if `evaluate` succeeded, `toPredicate` succeeded with `{_tag: isAllowed ? "True" : "False"}`; if `evaluate` failed with tag *t*, `toPredicate` failed with tag *t* and the same identifying field (`attribute`/`event`/`expected`). 200 samples, fixed seed.
  4. **Property B — full trees, faulty ports.** Reuse the existing `leaf`/`tree`/`rows` arbitraries (`:754-856`) with `worldLayer`. For each `(tree, world)`: if `toPredicate` succeeds with `Q`, then for every sampled row `evaluate` succeeds and `evaluatePredicate(Q, row) === isAllowed(decision)`, and the row's evaluator log is a subset of the translation log; if it fails, the failure is typed (`Exit` cause has no `Die`) and its tag is one of `AttributeResolveError | DecisionHistoryUnavailable | MissingAction`. 120 policies × 12 rows, fixed seed (same budget as `:863-864`).
  5. **Property C — a death reads as a failure.** For each `(tree, world)`, map every `Die`/`Throw` in `world` to `Fail` and assert both interpreters' outcomes (tag, predicate or verdict) are unchanged.
  6. Name the tests `"PROPERTY: …"` like `:858`; reference INV-QD-NEXT and INV-QD-018 in a comment.
- **Tests:** three properties. Expected at this point: B and C green after T4; A **red** under D-01-d (a) or before T9 (record the shrunk counterexample — it will be an `anyOf`/`allOf`/`rules` with a constant sibling, as E8 found). If D-01-d is decided (a), restate A as "the translation log is a superset of the evaluator log, and when evaluation fails translation fails" and it should be green now.
- **Verify:** `pnpm vitest run packages/core/test/Predicate.test.ts -t PROPERTY`
- **Done when:** B and C pass; A's status matches the D-01-d outcome.

### T8 — Give the stop rule one home
- **Status:** [x] done (2026-10-04)
- **Depends on:** D-01-d = (b), D-01-f = (1)
- **Files:** `packages/core/src/ShortCircuit.ts` (*new*), `packages/core/src/Evaluate.ts`, `packages/core/test/ShortCircuit.test.ts` (*new*)
- **Steps:**
  1. `ShortCircuit.ts` (out of the barrel): `export const anyOfStopsAtAllow = (strategy: FieldStrategy): boolean` (true exactly for `"First"`, via `Match.value(strategy)` with all three literals and `Match.exhaustive` so a fourth strategy is a compile error); `export const rulesDecisiveEffect = (combining: Combining): RuleEffect | undefined` (`DenyOverrides` → `"Deny"`, `PermitOverrides` → `"Permit"`, `FirstApplicable` → `undefined`). Doc comments cite ADR-QD-013, INV-QD-005, INV-QD-017. (`Combining` and `RuleEffect` are exported from `Policy.ts:90-99`.)
  2. `Evaluate.ts:1225` → `exhaustive: !anyOfStopsAtAllow(policy.fieldStrategy)`; `:1355-1360` → `const decisiveEffect = rulesDecisiveEffect(policy.combining);`.
- **Tests:** `ShortCircuit.test.ts` — all three strategies, all three algorithms (kills every literal/boolean mutant). Evaluator tests unchanged.
- **Verify:** `pnpm vitest run packages/core/test/ShortCircuit.test.ts packages/core/test/Evaluate.test.ts packages/core/test/Rules.test.ts` ; `pnpm circular`
- **Done when:** behaviour-neutral, both helpers 100% covered.

### T9 — Split translation into compile and run, and stop where the evaluator stops
- **Status:** [x] done (2026-10-04)
- **Depends on:** T7, T8, D-01-d = (b), D-01-e
- **Files:** `packages/core/src/Predicate.ts`, `packages/core/test/Predicate.test.ts`
- **Steps:**
  1. Define the internal plan ADT in `Predicate.ts` (not exported; closed):
     ```ts
     type Plan =
       | { readonly _tag: "Constant"; readonly value: boolean }
       | { readonly _tag: "Column"; readonly predicate: Predicate }
       | { readonly _tag: "AskAttribute"; readonly attribute: string; readonly matcher: Matcher }
       | { readonly _tag: "AskActed"; readonly wanted: ActedResult; readonly event: string }
       | { readonly _tag: "NeedAction"; readonly expected: string | undefined }
       | { readonly _tag: "Conjunction"; readonly plans: ReadonlyArray<Plan> }
       | { readonly _tag: "Disjunction"; readonly plans: ReadonlyArray<Plan>; readonly stopsAtTrue: boolean }
       | { readonly _tag: "Negation"; readonly plan: Plan }
       | { readonly _tag: "RuleTable"; readonly rules: ReadonlyArray<{ readonly effect: RuleEffect; readonly plan: Plan }>; readonly combining: Combining };
     type Compiled = { readonly _tag: "Planned"; readonly plan: Plan } | { readonly _tag: "Refused"; readonly policyTag: string; readonly reason: string };
     ```
  2. `compile(policy, subject, action, within: WithinDepth): Compiled` — pure, synchronous, `Match.tagsExhaustive` over all 16 `Policy` tags. Every refusal that `translateNode` raises today is produced **here** with the identical `policyTag`/`reason` strings (`Predicate.ts:414-417`, `:439`, `:468-471`, `:478-482`, `:487-491`, `:497-501`, `:506-510`); the first refusal in depth-first declaration order wins (same order as today). `HasRole`/`HasPermission`/`HasAction`-with-action fold to `Constant`; `HasAction`/action-reading matchers without an action become `NeedAction` (D-01-e (1)); `HasAttribute` → `AskAttribute`; `HasActed`/`HasNotActed` `Any` → `AskActed`; `HasResourceAttribute` → `Column` via `columnPredicate`; `AnyOf` → `Disjunction` with `stopsAtTrue: anyOfStopsAtAllow(p.fieldStrategy)`.
  3. Depth: `restrictsFields` (`:330-362`) already rejects any tree deeper than `maxDepth` before `compile` runs. Make that a type-level proof instead of a second runtime check (a second check would be unreachable and an unkillable mutant): `restrictsFields` returns a closed result `{ _tag: "TooDeep" } | { _tag: "Within"; readonly restricts: boolean; readonly proof: WithinDepth }`, where `WithinDepth` is a module-private branded type only `restrictsFields` can construct. `compile` requires it. Keep `restrictsFields`'s existing early-exit order exactly (fields-or-too-deep, first found wins), so precedence between `PolicyTooDeep` and the `fields` refusal is unchanged.
  4. `run(plan, subject, context): Effect<Predicate, PredicateError, AttributeResolver | DecisionHistory>` — plain function, `Effect.gen` for loops, `Match.tagsExhaustive` over `Plan`. `AskAttribute` → `Effect.map(PortAccess.readAttribute("toPredicate", subject, attribute), (v) => constant(evaluateMatcher(matcher, v, context)))`. `AskActed` → `PortAccess.askActedAny`. `NeedAction` → `Effect.fail(new MissingAction({ expected }))`. `Conjunction`: run children in order; return `FALSE` at the first child that runs to `False`; else `and(collected)`. `Disjunction`: return `TRUE` at the first `True` child **only if** `stopsAtTrue`; else `or(collected)`. `RuleTable`: run conditions in order; stop after the first condition that runs to `True` when `rulesDecisiveEffect(combining)` is `undefined` (any effect) or equals the rule's effect; apply the existing `translateRules` formula (`:547-582`) to the collected prefix — extract the formula into a pure `formulaFor(combining, translated)` so both the old and new paths share it during the change.
  5. `toPredicate` becomes: `restrictsFields` → `compile` → `run` (refusal → `untranslatable(policyTag, reason)`), then the existing annotation/metric tail (`:628-636`). Delete `translateNode`, `foldAttribute`, `foldHistory` and the old `translateRules`.
  6. Write the proof sketch into `run`'s doc comment, because Stryker cannot tell a reader why pruning is safe: a pruned `Conjunction` child could only have been `and`-ed with a `False` (result `False` regardless); a pruned `Disjunction` child could only have been `or`-ed with a `True`; a pruned `RuleTable` suffix contributes only `False` terms under `FirstApplicable` (each later permit conjoins `¬cᵢ = False`), cannot undo a `True` permit under `PermitOverrides`, and cannot undo the `Negate(Or(denies)) = False` under `DenyOverrides`. So pruning never changes a successful predicate; it only removes port calls and failures the evaluator would also never reach (Property A).
- **Tests:**
  - Property A (T7) turns green.
  - New named cases (the E8 shapes, so a reader can check them by eye): `anyOf([hasRole("editor"), hasAttribute(failing)])` → `True`, 0 resolver calls; same with `fieldStrategy: "Union"` → `AttributeResolveError`, 1 call (mirrors the evaluator's exhaustive walk); `allOf([hasRole("admin"), hasAttribute(failing)])` → `False`, 0 calls; `rules([permitWhen(hasRole("editor")), permitWhen(hasAttribute(failing))], PermitOverrides)` → `True`, 0 calls; `DenyOverrides` with a constant-true deny first → `False`, 0 calls; `FirstApplicable` with a constant-true deny first → `False`, 0 calls.
  - **Refusals stay subject-independent:** `anyOf([hasRole("editor"), hasRelationship("owner")])` refuses with `HasRelationship` for a subject holding `editor` **and** for one that does not.
  - **Refusal beats a port fault:** `allOf([hasAttribute(failing), hasCustom("x")])` → `PolicyNotTranslatable` (`HasCustom`), 0 resolver calls. (Behaviour change from HEAD, where the port error surfaced first; note in the changeset.)
  - Every existing `Predicate.test.ts` case passes unchanged (refusal tags and reasons are identical strings).
- **Verify:** `pnpm vitest run packages/core/test/Predicate.test.ts` ; `pnpm test:bdd` ; `node scripts/check-house-style.mjs` (no new switch, no fnUntraced)
- **Done when:** all Predicate tests including the three properties pass; `git grep -n "translateNode" packages/core/src` is empty.

### T10 — Acceptance scenarios
- **Status:** [x] done (2026-10-04)
- **Depends on:** T4 (scenario 1), T5 (scenario 3), T9 (scenario 2)
- **Files:** `features/features/predicates/predicates.feature`, `features/features/predicates/predicates.steps.test.ts`, `features/features/port-calls/port-calls.feature`, `features/features/port-calls/port-calls.steps.test.ts`, `features/step-definitions/Bridge.ts`
- **Steps:**
  1. `predicates.feature` (`@REQ-QD-016`): "A resolver that dies during compilation is an error, not a crash" (reuse the `"a resolver that dies unexpectedly"` Given from `port-calls.steps.test.ts:245-252`, lifted into a shared step or duplicated per the suite's convention; `compile` in `Bridge.ts:181-198` already records `refusedTag` from the typed failure, so assert `compilation fails with an AttributeResolveError`).
  2. "A role that already decides the filter asks no store": subject with `editor`, failing resolver, `anyOf(editor, riskScore)` → predicate is true, no AttributeResolver call recorded.
  3. `port-calls.feature` (`@REQ-QD-027`): "A compiled filter's lookups are recorded as compilation": collector + `toPredicate` → one AttributeResolver call whose interpreter is `toPredicate`.
- **Tests:** three scenarios.
- **Verify:** `pnpm test:bdd`
- **Done when:** scenarios pass. **Phase C done.**

### T11 — Normative spec updates
- **Status:** [x] done (2026-10-04)
- **Depends on:** T4 (always), T5/T6 (D-01-c), T9 (D-01-d)
- **Files:** `spec/behaviors/16-predicates.md`, `spec/behaviors/05-evaluator.md`, `spec/behaviors/30-port-calls.md`, `spec/behaviors/25-inspection.md`, `spec/behaviors/index.yaml`, `spec/invariants.md`, `spec/traceability.md`, `spec/decisions/024-predicate-output.md`, `spec/decisions/051-a-span-says-what-was-asked.md`, `spec/decisions/073-the-fnuntraced-exception-is-measured.md`, `spec/decisions/NEXT-both-interpreters-read-ports-through-one-module.md` (*new*), `spec/decisions/index.yaml`, `spec/overview.md`, `spec/README.md`
- **Steps:** exactly the edits listed in §8, each with a document-control revision bump and a change-history row citing CCR-QD-NEXT.
- **Tests:** ` ```typescript ` fences added to `16-predicates.md` (e.g. a `toPredicate` under a dying resolver caught with `Effect.catchTag("AttributeResolveError", …)`) must compile.
- **Verify:** `node scripts/check-doc-examples.mjs && bash spec/scripts/verify-traceability.sh --strict && node scripts/check-api-surface.mjs && node scripts/check-dod-table.mjs && node scripts/check-devtools-claims.mjs`
- **Done when:** all five scripts pass.

### T12 — Code-comment and convention sweep, changeset
- **Status:** [x] done (2026-10-04)
- **Depends on:** T3–T9
- **Files:** `AGENTS.md` (§5 prose at `:280-288` and §5a at `:383`), `scripts/check-house-style.mjs` (comment at `:352-358` only — no budget change), `packages/core/src/AttributeResolver.ts` (`:45-56`, `:112`), `packages/core/src/DecisionHistory.ts` (`:58-61`), `packages/core/src/RelationshipResolver.ts` (`:76`, `:91-94`), `packages/core/src/CustomPredicate.ts` (`:40-44`), `packages/core/src/SignatureHistory.ts` (`:3-8`, `:47-50`, `:84`), `packages/core/src/Policy.ts` (`:404`, `:412`, `:467`, `:719`), `packages/core/src/Signature.ts` (`:43-61`), `packages/http/src/QadiHttpError.ts` (`:289`), `features/features/port-calls/port-calls.steps.test.ts` (`:245`), `.changeset/arch-01-port-access.md` (*new*)
- **Steps:**
  1. `git grep -n "resolveAttribute\|evaluateActed\|evaluateHasRelationship\|evaluateHasCustom\|evaluateHasSignature\|requireScopedResourceId\|clampRelationshipDepth\|catchPortDefect" -- ':!spec/README.md' ':!**/CHANGELOG.md'` and update each live reference to name where the behaviour now lives (`PortAccess.ts`'s `readAttribute`/`askActedAny`/…). Change history (CHANGELOGs, CCR rows, ADR change-history tables) is exempt (AGENTS.md §15).
  2. Each port Shape's defect paragraph says the conversion happens in `PortAccess.ts` for **every** core caller (both interpreters); fix `AttributeResolver.ts:54-56` ("only call site" — now false twice over) and `:112` (`qadi.attempt` → `qadi.attribute`).
  3. AGENTS.md §5: the paragraph that limits `fnUntraced` to three functions (`:280-288`) names the traced reads by their new module; nothing else in AGENTS.md changes.
  4. Changeset: `"@qadi/core": minor` (0.x; say it is a behaviour change): `toPredicate` converts a defecting port into its typed error; translation now stops asking ports where `evaluate` stops (may now succeed where it previously failed; never admits differently — INV-QD-018); a refusal now wins over a port fault in the same tree; new `qadi_predicate_port_calls_total`/`PredicatePortName`; port spans gain `qadi.interpreter`. `"@qadi/devtools": minor` if T6 landed.
- **Tests:** none.
- **Verify:** `git grep` from step 1 shows no stale reference outside exempt history; `pnpm lint`
- **Done when:** sweep clean, changeset present.

### T13 — Mutation and the full merge gate
- **Status:** [x] done (2026-10-04) — with the environment caveats in the progress log
- **Depends on:** T1–T12
- **Files:** none (reports only)
- **Steps:**
  1. Baseline on `main` first: `pnpm exec stryker run --mutate packages/core/src/Predicate.ts,packages/core/src/Evaluate.ts` and keep the survivor list.
  2. On the branch: `pnpm exec stryker run --mutate packages/core/src/PortAccess.ts,packages/core/src/ShortCircuit.ts,packages/core/src/Predicate.ts,packages/core/src/Evaluate.ts,packages/core/src/PortMetrics.ts`. Expected killers: cause-matrix tests (`catchPortDefect` condition), interpreter-annotation and metric-delta tests (`Interpreter` dispatch, literal strings), T1/T4 typed-error tests (each `onDefect` constructor's field), ShortCircuit tests, Property A + the named E8 cases (pruning conditions, `stopsAtTrue`, rule decisiveness), refusal-string equality tests (reason literals).
  3. Any survivor in `PortAccess.ts`/`ShortCircuit.ts` gets a test. Any survivor that cannot be killed is recorded in ADR-QD-NEXT first (stryker config's rule), not suppressed.
  4. `pnpm check`.
- **Tests:** whatever step 3 requires.
- **Verify:** `pnpm check`
- **Done when:** success criteria 8 and 9 hold. **Phase D done; set status `done`.**

## 7. Test strategy

**Survive unchanged** (they are the evaluator's contract and must not move):
all of `Evaluate.test.ts` including `"port defects become typed errors"`
(`:3741-3931`) and the observability/span suites; `Ports.test.ts`;
`Rules.test.ts`; `RolesAndDepth.test.ts`; `features/features/port-calls`;
`packages/devtools/test/model/PortCalls.test.ts` and `Wiring.test.ts` until T6
extends them; every existing `Predicate.test.ts` case (refusal tags and
reason strings are kept byte-identical in T9 precisely so these stay put);
`predicate-sql`/`predicate-prisma` `Agreement.test.ts` (E10 — out of reach of
port faults).

**Move to the new interface:** none of the evaluator's tests move — they test
`evaluate`, which is the right level (behaviour through the public function,
not through the seam). What is *new* at the seam is only what cannot be seen
cheaply from outside: `PortAccess.test.ts`'s cause matrix (Fail+Die and
Die+Interrupt combinations are awkward to produce through a port) and
`ShortCircuit.test.ts`'s literal table.

**Deleted as redundant (replace, don't layer):** after T4, the T1 suite in
`Predicate.test.ts` is the *only* translation-side defect test; do not add a
second copy at the `PortAccess` level for the same five ports — the seam's
per-port `onDefect` constructors are already pinned by `Evaluate.test.ts`
(evaluator side) and T1 (translator side). After T9, `translateNode`-specific
comments in tests (e.g. the `"translateMatcher's other branch"` comment at
`Predicate.test.ts:814-815`) are reworded, not duplicated.

**Property / differential coverage:**
- INV-QD-018's existing property (`:858-880`) is kept as is (well-behaved ports, row agreement).
- T7 adds three properties under faulty ports: **A** walk-equality on resource-free trees (the strongest statement: same port calls, same order, same outcome); **B** success-implies-agreement and failure-is-typed on full trees; **C** death-equals-failure. Together they make INV-QD-NEXT executable, the same way INV-QD-018 is.
- Generator discipline (INV-QD-018's own lesson: "a property is only as strong as the untidiness of its data"): faults are sampled per key, including `Throw` (sync throw while building the Effect), not just `Die`; every `fieldStrategy` and every combining algorithm is sampled, because the stop rule differs by exactly those.

**Mutation (Stryker, ADR-QD-025):** T13. `PortAccess.ts` and `ShortCircuit.ts`
are small, total and fully reachable by design (D-01-d rejects the
unreachable-arm design for this reason). Target: zero survivors in both; no
new survivors in `Predicate.ts`/`Evaluate.ts` relative to the `main`
baseline.

**Benchmarks:** T3 runs `Evaluate.bench.ts` before/after (ADR-QD-034,
ADR-QD-051 habit). No predicate benchmark exists or is added: translation runs
once per query, not per row.

## 8. Spec and documentation updates

All under **CCR-QD-NEXT** (one CCR for the plan, or one per phase if the
phases ship separately — `CCR-QD-NEXT-a/b/c`).

**Behaviour docs**
- `spec/behaviors/16-predicates.md` (rev bump):
  - BEH-QD-123: keep the subset table; restate "A failure MUST fail the translation" as "… MUST fail the translation **with that port's own typed error**"; reword the `HasCustom`/`HasSignature` rows' Source wording if they name `translateNode`.
  - **BEH-QD-NEXT-a — A defecting port fails translation typed, not dead**: the BEH-QD-261 requirement text, for `AttributeResolver.resolve` and `DecisionHistory.hasActed` under `toPredicate`; interruption passes through; `Effect.retry` sees it.
  - **BEH-QD-NEXT-b — Translation asks no port a constant has already decided** (D-01-d (b)): the three stop rules, stated by reference to BEH-QD-034/035 and INV-QD-017, plus "pruning never changes a successful predicate".
  - **BEH-QD-NEXT-c — A refusal depends on the tree alone**: `PolicyNotTranslatable`/`PolicyTooDeep` do not depend on the subject, the action, or any port's answer; a refusal anywhere wins over a port fault; `MissingAction` is raised on reach (D-01-e).
  - BEH-QD-127: add a sentence pointing at INV-QD-NEXT for faulty ports.
- `spec/behaviors/05-evaluator.md` BEH-QD-261: scope sentence — the conversion lives in `PortAccess.ts` and applies to every port read core makes; the requirement text for `evaluate` is unchanged.
- `spec/behaviors/30-port-calls.md` (D-01-c (iv)): BEH-QD-227's span table gains `qadi.interpreter` on all five rows and a note that `qadi.attribute`/`qadi.acted` are also emitted under `qadi.toPredicate`; new **BEH-QD-NEXT-d — Translation's port reads are spans too** (subject hit emits nothing; value never recorded); the "`packages/core/src/Evaluate.ts` — spans, not exports" code-block caption → `PortAccess.ts`. BEH-QD-228's `PortCall` sentence gains the `interpreter` field (T6).
- `spec/behaviors/25-inspection.md` BEH-QD-197: second metric requirement — `qadi_predicate_port_calls_total` MUST count translation's port calls by port; `qadi_port_calls_total` keeps counting the evaluator's only.
- `spec/behaviors/index.yaml`: register the new BEH ids.

**Invariants** (`spec/invariants.md`, rev bump)
- INV-QD-006 Source: "`PortAccess.ts` — every port read either interpreter makes is wrapped in `catchPortDefect` …"; Related gains BEH-QD-NEXT-a.
- INV-QD-018 Enforcement: add the T7 properties and the faulty-port generator; keep the existing history paragraphs (they are history).
- **INV-QD-NEXT — Translation fails only as evaluation would.** Statement (adjust to the D-01-d outcome): for every translatable policy *P* and every port behaviour: (1) `toPredicate(P)` never ends in a defect; (2) if *P* references no resource, `toPredicate(P)` and `evaluate(P)` make the same port calls in the same order and end in the same outcome; (3) if `toPredicate(P)` succeeds, `evaluate(P, {resource: R})` succeeds for every row *R* and agrees with `evaluatePredicate`. Source: `PortAccess.ts`, `ShortCircuit.ts`, `Predicate.ts`'s compile/run. Enforcement: T7's Properties A–C. Related: INV-QD-005, INV-QD-006, INV-QD-017, INV-QD-018.
- INV-QD-050 / INV-QD-056 Source: "`translateNode`'s `HasCustom`/`HasSignature` arm" → "`compile`'s … arm" (T9).

**Traceability** (`spec/traceability.md`, rev bump; change-history row)
- §1 row for behaviour 16: `BEH-QD-121–128, BEH-QD-NEXT-a–c`; Source gains `PortAccess.ts`, `ShortCircuit.ts`. Row for behaviour 30: gains BEH-QD-NEXT-d and `PortAccess.ts`. Row for behaviour 05: Source gains `PortAccess.ts`.
- §2: INV-QD-006 row (Source text, `Predicate.test.ts`, `predicates.feature`); INV-QD-018 row (properties); new INV-QD-NEXT row; INV-QD-050/056 rows (lines 130, 136 name `translateNode`).
- §3: ADR-QD-NEXT row; ADR-QD-024 row gains INV-QD-NEXT.
- §4: `Predicate.test.ts` row gains BEH-QD-NEXT-a–c, INV-QD-NEXT; new rows for `PortAccess.test.ts` (BEH-QD-261, BEH-QD-NEXT-a, INV-QD-006) and `ShortCircuit.test.ts` (INV-QD-005, INV-QD-017, INV-QD-NEXT); `Ports.test.ts` row gains BEH-QD-197's new requirement; devtools `PortCalls.test.ts` row gains BEH-QD-228.
- §5: REQ-QD-016 row gains BEH-QD-NEXT-a–c, INV-QD-NEXT; REQ-QD-027 row gains BEH-QD-NEXT-d.

**ADRs**
- **ADR-QD-NEXT** (*new*, `spec/decisions/NEXT-both-interpreters-read-ports-through-one-module.md`, status Accepted): Context = E1–E10; Decision = D-01-a…f as decided; Consequences (positive: locality, one defect rule, one span rule, error-mode invariant; negative: one more internal module, plan ADT in `Predicate.ts`, refusal precedence change); Alternatives = the rejected options with their reasons (including the unreachable-arm/Stryker argument). Register in `spec/decisions/index.yaml`.
- ADR-QD-024: dated amendment note under "Untranslatable fails loudly" — refusals are static; translation's error modes and its stop rule are ADR-QD-NEXT's; the agreement REQUIREMENT is unchanged.
- ADR-QD-051: dated amendment — port spans are emitted by both interpreters, distinguished by `qadi.interpreter`; the metric for translation is a sibling, not `portCallsTotal`.
- ADR-QD-073: dated amendment note only — the traced port reads it lists now live in `PortAccess.ts`; the three `fnUntraced` dispatchers and the budget are unchanged.

**Overview** (`spec/overview.md`, gate 13 — `node scripts/check-api-surface.mjs`)
- Metrics table (`:240-241`): add `predicatePortCallsTotal` and `PredicatePortName` (T5).
- "Not listed above": rows for every `PortAccess.ts` export (`catchPortDefect`, `Interpreter`, `readAttribute`, `askActedAny`, `askActedForResource`, `askRelationship`, `askCustom`, `askSignature`, `SignatureAnswer`) and `ShortCircuit.ts` exports, reason "scaffolding shared by the two interpreters, reachable only via the `./*` subpath (AGENTS.md §9)", mirroring the `RetryingLayer.ts` row (`:699`). Rev bump + change-history row.

**CCR log**: `spec/README.md` CCR table row for CCR-QD-NEXT summarising the above.

**Changeset / CHANGELOG**: T12 step 4 (`pnpm changeset` writes `.changeset/*.md`; CHANGELOGs are generated at release, never hand-edited).

## 9. Risks and rollback

| Risk | How it shows up | Mitigation / back-out |
| ---- | --------------- | --------------------- |
| Evaluator span tree subtly changes in T3 (span now ends before the verdict is built; a nested span lost or doubled) | `Evaluate.test.ts` observability suite, `port-calls.feature`, devtools `PortCalls.test.ts` fail | Success criterion 10 is the gate for T3; revert T3 alone (T2 stands on its own). |
| Evaluator slows on the resolver-miss path | `Evaluate.bench.ts` `resolver miss` mean moves beyond noise | T3 steps 1/9; the restructure removes a wrapper rather than adding one, so a regression means a mistake (e.g. a double `Effect.fn`). |
| A cycle appears (`PortAccess.ts` importing an interpreter) | `pnpm circular` (gate 5) | Import rule in §4; fix the import, never the gate. |
| New metric reads zero in devtools | `Wiring.test.ts` (T6) | Declared once in `PortMetrics.ts`, imported by devtools (ADR-QD-052); description pinned in `Ports.test.ts`. |
| Pruning changes a successful predicate | INV-QD-018 property, Property B | The proof in T9 step 6; Property A/B; revert Phase C only — Phase A/B are independent. |
| A caller relied on `toPredicate` failing on a port fault behind a decisive constant, or on the port error winning over a refusal | Their own tests/alerts | Changeset calls both out as behaviour changes; both changes are in the fail-safe direction (no widening). |
| Refusal reason strings drift during T9 | Existing `Predicate.test.ts` refusal tests, `predicates.feature` `refusedTag` | Strings copied verbatim; tests unchanged. |
| Unkillable mutants | T13 | Design keeps every branch reachable; any genuine survivor goes into ADR-QD-NEXT before merge. |
| Spec gates fail on numbering | gates 10, 11, 13 | Use placeholders until merge; assign real numbers in the final commit of each phase. |

**Rollback:** each phase is one PR and reverts cleanly in reverse order (D → C → B → A). Phase A (T1–T4) alone fixes the defect with no public-surface change beyond behaviour; if B or C are rejected after D-01-c/D-01-d are decided against, drop those phases and keep A, then run T11/T12 scoped to Phase A (BEH-QD-NEXT-a, INV-QD-006, BEH-QD-261 scope, doc sweep).

## 10. Progress log

| Date | Task | Change | By |
| ---- | ---- | ------ | -- |
| 2026-10-04 | — | Plan written; evidence re-verified at `1caf04c`; E8 (short-circuit divergence) confirmed by scratch run and found to cover `allOf` and `rules` too; E10 settled (INV-QD-047 cannot see port faults). Status `needs-decision` on D-01-a…f. | Claude (planning agent) |
| 2026-10-04 | decisions | D-01-a…f all taken at the plan-recommended option and recorded `decided (2026-10-04, recommended default)` in §5: (a)(1) `PortAccess.ts`, (b)(1) module owns question forming, (c)(iv) spans + `qadi.interpreter` + sibling metric, (d)(b) compile/run split, (e)(1) `MissingAction` on reach, (f)(1) `ShortCircuit.ts`. Status moved to `in-progress`. Implemented on worktree branch `worktree-agent-a3b97e26f18ad377b` from `c75220e` (newer than the cited `1caf04c`; lines re-located). | Claude (implementation agent) |
| 2026-10-04 | T1 | Six tests added to `Predicate.test.ts`. Run against HEAD before T4: 4 failed with a raw `Die` (dying resolver, synchronously throwing resolver, dying history, `Effect.retry` of a defecting resolver); the typed-instance and interrupt tests already passed. | Claude (implementation agent) |
| 2026-10-04 | T2 | `PortAccess.ts` created with `catchPortDefect` moved verbatim; `PortAccess.test.ts` (7-case cause matrix) added. Commit `8b7d29f`. | Claude (implementation agent) |
| 2026-10-04 | T3 | Five evaluator reads moved behind `PortAccess` (`readAttribute`, `askActedAny`, `askActedForResource`, `askRelationship`, `askCustom`, `askSignature`); `requireScopedResourceId` became `requireResourceId`, returning the id so no unreachable `typeof` branch remains. Arms in `Evaluate.ts` are plain functions. **Deviation from success criterion 10:** every port span gains `qadi.interpreter` (D-01-c (iv)), so 7 exact-attribute-set assertions in `Evaluate.test.ts` gained that key; no other existing assertion moved. Bench before/after in the PR notes (machine noise ~15–20% on the control workload). Commit `e685f51` (also carries T5's `PortMetrics` addition, because the interpreter dispatch needs the metric). | Claude (implementation agent) |
| 2026-10-04 | T4 | `Predicate.ts`'s two reads routed through `PortAccess`; T1 tests green; the only `Object.hasOwn(subject.attributes` is in `PortAccess.ts`. Commit `4c9510d`. | Claude (implementation agent) |
| 2026-10-04 | T5 | `predicatePortCallsTotal`/`PredicatePortName` added (description pinned in `Ports.test.ts` together with `portCallsTotal`'s, which is unchanged); translation span and metric tests added. Commit `828660d`. | Claude (implementation agent) |
| 2026-10-04 | T6 | Devtools: `PortCall.interpreter` (closed pair, `undefined` = not recorded), `PortActivity.translationCalls`, Services panel label. Existing devtools test fixtures gained the two required fields. Commit `ed738c5`. | Claude (implementation agent) |
| 2026-10-04 | T7 | Three faulty-port properties added to `Predicate.test.ts`. Property A was red against the old translator; first counterexample: `allOf([hasPermission, hasAttribute(absent), hasNotActed(never)])` under `Not(Not(Labeled(…)))` — evaluation made 1 port call (`attr:absent` denied), translation made 2 (also `acted:never`). B and C were green after T4. Commit `36e83c2` (with T9). | Claude (implementation agent) |
| 2026-10-04 | T8 | `ShortCircuit.ts` added. **Deviation:** implemented as `Record` tables over the closed unions rather than `Match.type`, so a hand-built out-of-union value reads as the safe answer (sees everything) instead of throwing a `MatchError` from an authorization decision, which `Match.exhaustive` would have done where `!== "First"` did not. A fourth strategy is still a compile error (TS2741). Commit `9e0b977`. | Claude (implementation agent) |
| 2026-10-04 | T9 | `Predicate.ts` split into `compile` (pure, all refusals, `WithinDepth` proof) and `run` (stops where the evaluator stops); `translateNode`/`foldAttribute`/`foldHistory`/`translateRules` deleted. Property A green; eight named stop-rule cases and three refusal/`MissingAction` cases added. No `switch`, no `fnUntraced`; budgets unchanged. | Claude (implementation agent) |
| 2026-10-04 | T10 | Three acceptance scenarios (two in `predicates.feature`, one in `port-calls.feature`); `WorldState` gained `attributeFault`/`attributeCalls`. Commit `54bb980`. | Claude (implementation agent) |
| 2026-10-04 | T11 | ADR-QD-077, INV-QD-058, BEH-QD-264–267, CCR-QD-153 written under real numbers; amendments to ADR-QD-024/051/073, BEH-QD-123/127/197/227/228/261, INV-QD-006/018/050/056/057, traceability, overview, spec README. `spec:examples`, `spec:verify:strict`, `spec:api`, `spec:gates`, `spec:claims`, `spec:publish`, `spec:website-examples` all pass. Commit `a089d70`. | Claude (implementation agent) |
| 2026-10-04 | T12 | Live references swept (AGENTS.md §5/§5a prose, house-style comment, port-Shape doc comments incl. the false "only call site" and the `qadi.attempt` slip); `.changeset/arch-01-port-access.md` added (`@qadi/core` and `@qadi/devtools` minor). `portCallsTotal`'s description still names `translateNode` and was deliberately not edited (registry key, ADR-QD-052). Commit `cda3ab2`. | Claude (implementation agent) |
| 2026-10-04 | T3 (bench) | `Evaluate.bench.ts`, 3 runs each, same machine and session, branch vs a `git archive` of `c75220e` run back to back. Means of the hz column (higher is better): `resolver miss` 64.8k (branch) vs 60.9k (base); `one node` (control) 106k vs 106k; `wide` 76k vs 82k; `matcher-heavy` 67k vs 68k; `deep` 57k vs 58k; `obligation-heavy` 58k vs 57k; `field-heavy` 36k vs 35k — all within run-to-run noise (the machine itself drifted ~20% across the session on the control workload). No regression on the port path. Two pre-existing bench cases (`filter`, `decideSubjects`) fail on both trees with "`bench.compare()` requires at least 2 benchmarks". | Claude (implementation agent) |
| 2026-10-04 | T13 | Targeted Stryker run over `PortAccess.ts`, `ShortCircuit.ts`, `Predicate.ts`, `Evaluate.ts`, `PortMetrics.ts`. Baseline (`c75220e`, same files): `Evaluate.ts` 46 survived + 7 no-cov, `Predicate.ts` 29 + 1. Branch, after adding span/metric/refusal-reason tests and removing avoidable equivalent mutants (`Checked`/`Refusal` classes instead of unread tag literals; clamp rewritten without the `<= 0` equivalence): `PortAccess.ts` 99.14 (1 survivor, the `typeof rawResourceId === "string"` operand of the signature span's resource-id annotation; a test for it was added after this run and the mutation run was **not** repeated), `Predicate.ts` 96.78 (14 survivors, **all pre-existing** in `compare`/`constantRef`/`restrictsFields`; none in `compile`/`run`), `Evaluate.ts` 93.38 (22 + 7 no-cov, fewer than baseline because the port code moved), `ShortCircuit.ts`/`PortMetrics.ts` n/a (all static mutants, skipped by `ignoreStatic`, ADR-QD-076). Devtools mutation (`stryker.devtools.mjs`) passes (98.22%). **Not run:** the full `stryker run` and the predicate-sql/predicate-prisma/audit/http configs — the full-core dry run fails on this machine on baseline too (`FieldPath.test.ts` deep-recursion tests time out at 5 s under instrumentation); the other four packages' sources are unchanged. `pnpm coverage` fails on baseline and branch for the same `FieldPath.test.ts` timeouts; `vitest run --coverage --testTimeout=60000` passes with thresholds met (2310 tests). `pnpm check` steps that ran green: typecheck, lint, circular, test:tstyche, test:bdd, spec:examples, spec:verify:strict, spec:gates, spec:claims, spec:api, spec:package, example, spec:website-examples, website, spec:publish. | Claude (implementation agent) |
