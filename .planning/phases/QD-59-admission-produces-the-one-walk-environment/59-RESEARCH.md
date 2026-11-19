# Phase 59: Admission produces the one walk environment - Research

**Researched:** 2026-11-19
**Domain:** `@qadi/core` internals: `Admission.ts`, `Walk.ts`, `Predicate.ts` (the two interpreters' shared environment), plus the benchmark gate that decides whether the change ships. Effect v4 (`effect@4.1.2`).
**Confidence:** HIGH. The prototype was written, typechecked (`tsc` src and test graphs), run against all of core's vitest project, house-style and madge, and benchmarked twice (3 + 3 and 5 + 5, 35 workloads) before this file was written. Source head at all of it: `e9b98bb8` (`git log --oneline -1`). `git status --short packages` is empty now: the prototype exists only as a patch.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**The environment (WENV-02, WENV-03), owner choices 2026-11-19**

- **D-01, shape: `Admitted` becomes the environment.**
  - `admit(question, rowSource)` returns `Admitted` holding the subject, resource, action, `supplied`, the matcher context and `maxDepth`.
  - `rowSource` is a closed union: `"asked"` for `evaluate`, where the resource is supplied when the question has one, and `"row"` for `toPredicate`, where the row is always supplied.
  - `supplied` is computed in one place, from `rowSource`. Each interpreter states only `rowSource`.
  - Recursion passes `(policy, env, depth)`. `walk` keeps `concurrency` beside the env, because it is a property of the evaluation, never a value a matcher compares; it is not in the env.
  - Holding an `Admitted` stays the proof of admission: only `admit` builds one.
  - **Rejected:** a separate `WalkEnv` built from `Admitted` by each interpreter. That is two types and two construction sites, and the `supplied` rule would stay per interpreter.
- **D-02, `MatcherContext`: the env holds it, built once.**
  - The env carries the public `MatcherContext` that `admit` builds once. The walk reads `resource` and `action` from it, so each fact is stored once and nowhere else.
  - Matchers keep their public signature, so this is not Breaking for the matcher API.
  - The subject's `AuthSubject` is held once in the env. The matcher context's `subject`/`subjectId` are its projection, built by `admit`.
  - **Rejected:** deleting or narrowing `MatcherContext`, which is Breaking for the public matcher API.
- **D-03, `depth`/`maxDepth`.** `maxDepth` moves into the env, so recursion passes one number. A swap can no longer compile, and a tstyche negative pins it (WENV-03).

**The benchmark gate (WENV-01)**

- **D-04: the first plan is the benchmark, and it gates the rest.**
  - A prototype in which recursion passes `(policy, env, depth)` is measured against the phase base with Phase 50's method (ADR-QD-163 § Measurement):
    - `bench/ab.sh`-style interleaved runs, base then candidate then base, three runs each;
    - the patch is applied and reversed around each candidate run, so no source is committed to measure it;
    - all 35 `Evaluate.bench.ts` workloads are measured.
  - **The statistic** is the median of per-run minima per workload.
  - **The slower rule:** a workload is slower only when its delta is strictly greater than its band, `max(10%, the base's own spread of that statistic)`.
  - **The verdict:** the gate passes when no workload is slower, and the analysis's last line says so (`# gate: pass`), not judgement.
  - The harness and its outputs follow Phase 50's: `.planning/milestones/v1.5-phases/QD-50-what-a-leaf-needs-from-the-request-stated-once/bench/` (`ab.sh`, `analyze.mjs`) and `50-BENCH.md`.
- **D-05: on a gate failure** the phase ends with a recorded rejection:
  - no source file changes;
  - ADR-QD-172 records the rejection and its numbers;
  - WENV-02..04 are annotated "Not pursued (measured)";
  - the phase still closes its records: ADR, CCR row, BEH/INV only where they describe the measured outcome, and any unused ids named "Unused: ...".
- **D-06: if pursued**, `pnpm bench` after the change is measured the same way against the phase base, and the table goes in ADR-QD-172 (WENV-04).

**Tests and mutation (if pursued)**

- **D-07 (WX-06): characterisation on the phase base, green before and after.**
  - `admit(question)` today: the depth refusal and the matcher context.
  - Each interpreter's `supplied`: `evaluate` with and without a resource and an action; `toPredicate`'s row always supplied.
  - `RolesAndDepth.test.ts`'s depth agreement test, which must stay green unedited.
  - RED rows for the new `admit(question, rowSource)` shape and the tstyche negative are committed failing before the src change.
- **D-08 (WX-05): mutation follows Phase 58's D-16 rule** with ADR-QD-167 Rev 1.1's static credit.
  - The base covers `Admission.ts`, `Walk.ts` and `Predicate.ts`, plus `Matcher.ts` if it is touched, scoped with `--mutate` on core's `stryker.config.mjs`.
  - The base is committed alone as the first commit after the benchmark plan, and never re-baselined.
- **D-09: plan order.**
  1. Benchmark gate (prototype, no committed source).
  2. If pass: mutation base.
  3. Characterisation and RED.
  4. Environment and interpreters (one atomic commit if the typecheck needs it).
  5. Bench after-run.
  6. Mutation after-run.
  7. Records.
  8. Close.
  9. If fail: benchmark plan, then records, then close.

**Records**

- **D-10:**
  - ARCH-106.
  - ADR-QD-172, holding the benchmark tables and the outcome.
  - CCR-QD-450.
  - BEH-QD-631..635 and INV-QD-363..364, reserved. On a rejection, unused ids are named "Unused: ..." in the CCR row.
  - `spec/overview.md` (gate 13) only if a public export changes. `Admitted` and `admit` are package-internal unless research finds otherwise.
  - A changeset only if public behaviour or types change.
  - Nothing is released.

### Claude's Discretion

- The env's field names.
- Whether `Evaluation` is deleted or reduced to `concurrency`.
- How the prototype patch is stored, following Phase 50's `research-probes/proto-*.patch.txt`.

### Deferred Ideas (OUT OF SCOPE)

- Narrowing or deleting the public `MatcherContext` (rejected in D-02 for now).
- The shared child-walk driver (ADR-QD-073 addendum; needs a new measurement).
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| WENV-01 | Bench a `(policy, env, depth)` prototype vs the base, Phase 50 method; numbers in ADR-QD-172; reject on regression | `59-BENCH.md`: **gate: pass**, slower 0 of 35, twice (3 + 3: geomean -1.15%, worst +6.7%; 5 + 5: geomean -0.03%, worst +5.6%). The phase is **pursued**. Prototype `research-probes/proto-p1.patch.txt` (SHA-256 `7cd868b63554766fe928355e9d4478a166df91fc12d20ec6ad40b7015b144ee3`) |
| WENV-02 | Admission produces the one walk environment; each interpreter states only what differs | Section "The proposed shape": `Admitted<Resource>` + `admit(question, rowSource)` with two overloads, no `as`; `Walk.ts` and `Predicate.ts` each state only `"asked"` / `"row"` |
| WENV-03 | Subject, resource, action carried once; `depth`/`maxDepth` swap cannot compile (tstyche negative) | "The proposed shape" (what is stored where) and "Tests": the negative needs `evaluateNode` exported from the package-private `Walk.ts` (the one new export) |
| WENV-04 | `RolesAndDepth.test.ts` depth agreement green; three `fnUntraced` and `SWITCH_BUDGET` unchanged | Prototype: full core vitest run green except one `Admission.test.ts` row (`.question`); `check-house-style` clean ("559 file(s) clean (3 declared switch(es))"), madge no cycle. Budgets: "Records" |
| WX-01 | `pnpm check:pr` green at close | "Validation Architecture" |
| WX-02 | Reserved ids only, `next-id.mjs` never run | "Records": all reserved ids free by grep |
| WX-03 | `spec/overview.md` follows gate 13 | `Admission.ts`/`Walk.ts` are not in the barrel; `Predicate.ts` is, but nothing in it that changes is exported. **No overview row changes** (measured below) |
| WX-04 | Nothing new from the banned list | Prototype passes `check-house-style` and typecheck with no `as`, `!`, `any`, `switch`, `fnUntraced`, `async`, ambient clock/console |
| WX-05 | Coverage holds; Stryker score of touched files does not fall | "Mutation"; last recorded scores: `Walk.ts` 0.946 (264/279), `Predicate.ts` 1.0 (284/284); `Admission.ts` has no recorded base |
| WX-06 | Characterisation on the base first | "Tests": `LeafMatrix.test.ts` (126+ cells, both interpreters) already pins every `supplied` outcome green on the base |
| WX-07 | Breaking recorded per package; nothing released | Not applicable if pursued as measured: no public type or behaviour changes, so **no changeset** (see Records) |
</phase_requirements>

## Summary

**The benchmark gate passes, so the phase is pursued.** The prototype is `evaluateNode(policy, ev, depth)` where `ev` is a Walk-private `{ admitted, concurrency }` and `admitted` is the new `Admitted` environment. Against the phase base (`e9b98bb8`) it was slower on 0 of 35 workloads in both a 3 + 3 run (the gate of record, geomean -1.15%, worst +6.7% inside a 10% band) and a 5 + 5 confirmation (geomean -0.03%, worst +5.6%). The host was not quiet (an unrelated build job; load averages 6 to 19), which the band absorbs by rule, and the second run exists because of it. Full tables: `59-BENCH.md`.

**The change is smaller than the 13 call sites suggest.** In `src`, three files change code: `Admission.ts` (the environment and `admit`), `Walk.ts` (every `evaluateNode` signature and call), `Predicate.ts` (`compileTree` and the `admit` call). Nothing else in `packages/` reaches `admit` or `Admitted` (`@qadi/audit`'s `Admitted` is an unrelated `Data.TaggedClass` in `CircuitBreaker.ts`; `@qadi/react`'s `admit` is `QuestionBook`'s own local). The typecheck of the whole test graph (`tsc -p tsconfig.test.json`) breaks in **one file**, `packages/core/test/Admission.test.ts` (4 errors: three calls missing the second argument, one read of the removed `.question`). The whole core vitest project (81 files, 2637 tests) passes against the prototype except the one row that reads `admitted.success.question`. Gate 13 (`spec/overview.md`) is untouched.

**One decision the CONTEXT leaves implicit and the planner must carry:** D-01 says `concurrency` stays "beside the env, not in it", yet the three composite dispatchers (`evaluateAllOf/AnyOf/Rules`) read it, so recursion cannot pass the bare `Admitted`. The prototype resolves it with a Walk-private `Evaluation { admitted, concurrency }` (the discretion item "reduced to `concurrency`", plus the pointer to `Admitted`). A fourth positional parameter is worse: `Concurrency` is `number | "unbounded" | "inherit"`, so it would sit beside `depth: number` and a swap would compile, the exact hazard `Walk.ts:51-62` documents. `Evaluation` repeats no fact, so D-01's rejection ("two types, two construction sites") does not apply: it has one construction site (`walk`) and carries nothing the environment carries. It is also what Phase 61 (CASK-03, "`concurrency` reaches the walk without joining the key") will want.

**Primary recommendation:** pursue. Plan 1 records the gate (the evidence is already in `59-BENCH.md` and `bench/`; the plan commits it and the harness), then the mutation base, then characterisation and RED, then one atomic commit for the environment, both interpreters and `Admission.test.ts`, then the after-bench, mutation after-run, records and close.

## Architectural Responsibility Map

This phase is inside one library package; the "tiers" are the library's layers.

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Depth gate (`policyDepth > maxDepth` before any node) | Admission (`Admission.ts`) | Walk's per-node guard (defense in depth, ADR-QD-090) | INV-QD-037: judged on the policy alone, once, for both interpreters |
| What a request supplied (`supplied`) | Admission, from `rowSource` | `LeafNeeds.ts` `absenceOf` consumes it | The one rule per interpreter lives in `admit`; `absenceOf` is the one reader (ADR-QD-163) |
| Subject / resource / action facts | Admission builds them once into the env | `MatcherContext` holds resource and action; `AuthSubject` held once beside it | D-02 |
| `concurrency` | Walk (`Evaluation`) | `evaluate`'s options via `Lifecycle.ts` | A property of the evaluation, never an input to a matcher; not part of the `Question` (ADR-QD-026) |
| Recursion over the policy tree | Walk (`evaluateNode` + three `fnUntraced` dispatchers) | — | Budgeted switch #1 and the three `UNTRACED_BUDGET` functions stay where they are |
| Translation plan + run | Predicate (`compileTree`, `run`) | Admission supplies `Admitted<true>` | Two interpreters stay two (ADR-QD-024) |

## Standard Stack

No packages are added. Everything is in-repo.

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `effect` | 4.1.2 [VERIFIED: `packages/core/node_modules/effect/package.json` `"version": "4.1.2"`] | `Effect`, `Result`, `Match` as already used | house style (AGENTS.md §1) |
| vitest + `@effect/vitest` | catalog | unit tests, bench | existing |
| tstyche | `^7.2.5` [VERIFIED: `package.json:71`] | the depth/maxDepth negative | existing `*.tst.ts` suite (32 files in `packages/core/test`) |
| Stryker | repo config `stryker.config.mjs` | mutation base/after | existing; never edit the config, narrow with `--mutate` |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Walk-private `Evaluation { admitted, concurrency }` (prototype P1) | `concurrency` as a 4th positional parameter | Rejected: swap with `depth` compiles (see Summary) |
| Two overloads on `admit` keyed on the literal | A conditional type `Admitted<S extends RowSource>` with a generic `admit<S>` | A generic body cannot build `Supplied<true>` for `"row"` without an `as`; overloads typecheck with none (measured) |
| Env as a class `Admitted<Resource extends boolean>` | A plain readonly interface | Keep the class: it is the existing proof-by-construction and its call sites already `new` it only in `admit` |

**Installation:** none. **Package Legitimacy Audit:** not applicable (no external package is installed); `package-legitimacy` was not run because there is nothing to check.

## Architecture Patterns

### System Architecture Diagram

```
 evaluate(policy, options)               toPredicate(policy, options)
   (Lifecycle.ts:88, GuardHealthCheck.ts:101)        (Predicate.ts toPredicate)
          |                                           |
          | question = questionOf(...)                | question = { ...questionOf(...), resource: undefined }
          v                                           v
   walk(question, concurrency)                 admit(question, "row")
   Effect.suspend  (cache hit never runs it)         |
          |                                          |
          v                                          |
   admit(question, "asked") ---------+               |
          |                          |               |
   PolicyTooDeep? --yes--> Effect.fail               |  PolicyTooDeep? --yes--> fail
          | no                                       | no
          v                                          v
   Admitted  { subject, supplied: Supplied<boolean>, matcherContext, maxDepth }
                                                     Admitted<true> (supplied.resource === true)
          |                                          |
          v                                          v
   evaluation = { admitted, concurrency }     compileTree(policy, admitted) -> Plan | Refusal
          |                                          |
          v                                          v
   evaluateNode(policy, evaluation, 0)        run(plan, admitted.subject, admitted.matcherContext)
     |  depth > admitted.maxDepth -> fail (per-node guard)       -> Predicate
     |  leaves read admitted.subject / .supplied / .matcherContext
     |  composites -> evaluateAllOf/AnyOf/Rules(policy, evaluation, depth)
     |        each child: evaluateNode(child, evaluation, depth + 1)
     v
   Trace
```

### Recommended Project Structure

Unchanged. `Admission.ts` stays beside `Walk.ts`/`Predicate.ts` in `packages/core/src` and stays out of the barrel (ADR-QD-099).

### Current shape (measured at HEAD `e9b98bb8`; line numbers re-measured)

`Walk.ts`, 906 lines:

- `interface Evaluation` at `Walk.ts:67-72`, verbatim:
  ```ts
  interface Evaluation {
    readonly resource: Resource | undefined;
    readonly action: string | undefined;
    readonly supplied: Supplied;
    readonly concurrency: Concurrency | undefined;
  }
  ```
- `evaluateNode` at `Walk.ts:319-326` takes six: `(policy, subject: AuthSubject, request: Evaluation, matcherContext: MatcherContext, depth: number, maxDepth: number)`, and its first line is `if (depth > maxDepth) return Effect.fail(new PolicyTooDeep({ maxDepth }));` (`:327`).
- The four functions carrying the tuple: `evaluateNode` (`:319`) and `evaluateAllOf` (`:548`), `evaluateAnyOf` (`:685`), `evaluateRules` (`:743`).
- Tuple call sites, **13** by `grep -n "evaluateNode(\|evaluateAllOf(\|evaluateAnyOf(\|evaluateRules("`: 9 recursive `evaluateNode(child..., depth + 1, maxDepth)` (`:410, 425, 443` the three wrappers; `:562, 582` AllOf sequential/concurrent; `:699, 713` AnyOf; `:797-804, 827` Rules), 3 dispatcher hand-offs (`:399, 402, 405`), and the root call in `walk` (`:905`). The CONTEXT says 11; the measured count is 13 (9 + 3 + 1).
- What each leaf reads: `subject` (the `AuthSubject`) feeds `LEAF_VERDICTS.HasPermission/HasRole(policy, subject)`, `readAttribute("evaluate", subject, policy)`, and the four port arms `evaluateActed/HasRelationship/HasCustom/HasSignature(policy, subject, resource)`. `matcherContext` feeds only `LEAF_VERDICTS.HasAttribute` (`:351`) and `HasResourceAttribute` (`:364`). `request.supplied` feeds `absenceOf` at `:347, 359, 379`. `request.resource`/`request.action` (destructured `:329`) feed `HasResourceAttribute` (`:362`), the four port arms, and `HasAction` (`:382`). `request.concurrency` feeds the three dispatchers (`:558, 695, 794`) and their `Effect.forEach` options.
- `walk` at `Walk.ts:889-906` builds `supplied` itself (`:898`): `supplied: { action: question.action !== undefined, resource: question.resource !== undefined },`, builds the `Evaluation` (`:895-900`), then calls `admit(question)` (`:903`) and `evaluateNode(policy, subject, request, admitted.success.matcherContext, 0, maxDepth)` (`:905`). `Walk.ts:51-62` states, in prose, that `depth`/`maxDepth` can still be swapped.

`Admission.ts`, 53 lines: `export class Admitted { constructor(readonly question: Question, readonly matcherContext: MatcherContext) {} }` (`:35-40`) and `export const admit = (question: Question): Result.Result<Admitted, PolicyTooDeep>` (`:43`), which builds the matcher context with `subject: question.subject.attributes, subjectId: question.subject.id, resource: question.resource, action: question.action`.

`Predicate.ts`, 687 lines:
- `compileTree(admitted: Admitted)` at `:356`; reads `const { policy, subject, action } = admitted.question;` (`:357`), `const context = admitted.matcherContext;` (`:358`), and builds `const supplied: Supplied<true> = { action: action !== undefined, resource: true };` (`:360`, under the comment "A predicate filters rows, so the resource is the row and is always present.").
- `toPredicate` (`:661` area): `const admitted = admit(question);` then `restrictsFields(policy)`, `compileTree(admitted.success)` and `run(compiled, subject, admitted.success.matcherContext)` (`:676`). `run` (`:~555`) and `columnPredicate` take `(…, subject, context: MatcherContext)` and thread no depth: depth is `foldPolicy`'s, not a parameter.
- `toPredicate` calls `admit` **before** `restrictsFields` so a too-deep, field-restricting policy is always `PolicyTooDeep` (ARCH-02 D-02-e, INV-QD-037). Keep that order.

Callers of `admit` / `Admitted` (grep over `packages/*/src`, `packages/*/test`, `packages/*/bench`, `features`, `scripts`, this session):
- src: `Walk.ts:14,903`, `Predicate.ts:19-20,346,356,661`; a doc mention in `Handover.ts:173` (a naming note, no code).
- tests: `packages/core/test/Admission.test.ts` only (`admit(` at `:23, 61, 73`; `.success.question` at `:78`).
- scripts: `scripts/check-house-style.mjs:588` (`ADMISSION_ALLOWED`, `"packages/core/src/Admission.ts": 1`) and `:1457-1470` (the `admission-once` rule). Other `Admitted`/`admit` hits are `@qadi/audit`'s unrelated `CircuitBreaker` `Admitted` and `@qadi/react`'s local `QuestionBook` `admit(entry)`; they share nothing with core's.
- **Barrel and gate 13:** `packages/core/src/index.ts` has no `Admission` or `Walk` line (grep returned only `CustomPredicate`, `Predicate`, `PredicateLiteral`, `RenderablePredicate` for the pattern); `spec/overview.md` names neither `Admitted` nor `admit`. `Predicate.ts` is `export *`-ed, but `compileTree`, `run` and the `admit` call are not exports. **No public export changes; gate 13 count unchanged.**

### The proposed shape (typechecked prototype)

Stored as `research-probes/proto-p1.patch.txt` (416 lines of `git diff -- packages/core/src`; SHA-256 `7cd868b63554766fe928355e9d4478a166df91fc12d20ec6ad40b7015b144ee3`; `git apply --check` passes on `e9b98bb8`). Facts: `tsc -p packages/core/tsconfig.src.json --noEmit` clean; `tsc -p tsconfig.test.json` has only the 4 errors in `Admission.test.ts`; `node scripts/check-house-style.mjs` printed `house-style: 559 file(s) clean (3 declared switch(es))`; `madge --circular --extensions ts,tsx packages/*/src` printed `No circular dependency found!`; `oxlint` on the three files printed nothing.

```ts
// Admission.ts (prototype; the new types)
export type RowSource = "asked" | "row";

export class Admitted<Resource extends boolean = boolean> {
  constructor(
    readonly subject: AuthSubject,                  // held once (D-02)
    readonly supplied: Supplied<Resource>,          // computed once, from rowSource (D-01)
    readonly matcherContext: MatcherContext,        // holds resource and action, once (D-02)
    readonly maxDepth: number,                      // one number for recursion to compare (D-03)
  ) {}
}

export function admit(question: Question, rowSource: "row"): Result.Result<Admitted<true>, PolicyTooDeep>;
export function admit(question: Question, rowSource: RowSource): Result.Result<Admitted, PolicyTooDeep>;
export function admit(question: Question, rowSource: RowSource): Result.Result<Admitted, PolicyTooDeep> {
  return policyDepth(question.policy) > question.maxDepth
    ? Result.fail(new PolicyTooDeep({ maxDepth: question.maxDepth }))
    : Result.succeed(
        new Admitted(
          question.subject,
          {
            action: question.action !== undefined,
            resource: rowSource === "row" || question.resource !== undefined,
          },
          { subject: question.subject.attributes, subjectId: question.subject.id,
            resource: question.resource, action: question.action },
          question.maxDepth,
        ),
      );
}
```

- **Field set.** `Admitted` drops `question`: the only readers were `compileTree` (`:357`) and `Admission.test.ts:78`. The policy stays a parameter of both interpreters (`evaluateNode(policy, ...)`, `compileTree(policy, admitted)`), so nothing needs the question inside the environment. `Question.resource` is `Resource | undefined` and `MatcherContext.resource` is `Readonly<Record<string, unknown>> | undefined`; `Resource` is `export type Resource = Readonly<Record<string, unknown>>` [VERIFIED: `packages/core/src/Resource.ts:15`], the same type, so reading `resource` from `matcherContext` needs no widening or cast.
- **`supplied` precision without `as`.** `Supplied<Resource extends boolean = boolean>` is `{ readonly action: boolean; readonly resource: Resource }` [VERIFIED: `LeafNeeds.ts:~180`, read this session]. The first overload (`"row"`) returns `Admitted<true>`; the second (`RowSource`) returns `Admitted`. A call `admit(q, "row")` gets `Admitted<true>`, which `absenceOf(leaf, supplied: Supplied<true>)`'s first overload (`LeafNeeds.ts` `absenceOf` overloads, measured) accepts and which narrows `NeedAction`'s absence to `ActionAbsence`. A call with `"asked"` or a `RowSource` variable resolves to the second. The implementation signature returns `Result<Admitted<boolean>, ...>`; both overloads are accepted by tsc (measured).
- **`Evaluation` reduced (Walk-private, not exported):**
  ```ts
  interface Evaluation {
    readonly admitted: Admitted;
    readonly concurrency: Concurrency | undefined;
  }
  ```
  `evaluateNode(policy: Policy, ev: Evaluation, depth: number)`. Prologue in the prototype: `const { admitted } = ev; if (depth > admitted.maxDepth) return Effect.fail(new PolicyTooDeep({ maxDepth: admitted.maxDepth })); const { subject, supplied, matcherContext } = admitted; const { action, resource } = matcherContext;`. Dispatchers: `evaluateAllOf/AnyOf/Rules(policy, ev, depth)` read `ev.concurrency`. Every recursion is `evaluateNode(child, ev, depth + 1)`.
- **`walk`** becomes (inside the existing `Effect.suspend`): `const admitted = admit(question, "asked"); if (Result.isFailure(admitted)) return Effect.fail(admitted.failure); return evaluateNode(question.policy, { admitted: admitted.success, concurrency }, 0);`. One `Evaluation` and one `Admitted` per evaluation, never per node. Allocation count per evaluation equals the base (base: `Evaluation` + `supplied` + matcher context + `Admitted`; prototype: `Evaluation` + `supplied` + matcher context + `Admitted`).
- **`Predicate.ts`:** `compileTree(policy: Policy, admitted: Admitted<true>)` with `const { subject, supplied, matcherContext: context } = admitted; const { action } = context;`; `toPredicate` calls `admit(question, "row")`, keeps the `restrictsFields` order, passes `policy` to `compileTree` and `admitted.success.subject` / `.matcherContext` to `run` (the prototype left `run`'s signature alone; passing `admitted` is an optional follow-up inside the same commit). The import `Supplied` is no longer used in `Predicate.ts` and `Walk.ts` (tsc `TS6196` told: remove both).
- **Depth/maxDepth swap.** With `maxDepth` inside `Admitted`, `evaluateNode`'s only number is `depth`; `(policy, ev, depth)` cannot be called as `(policy, depth, ev)`. The `Walk.ts:51-62` doc paragraph describing the unclosed class must be rewritten (it is false after the change), as must `Admission.ts`'s header ("`Admitted` ... the question plus the matcher context") and `Walk.ts:301-318`'s mention of `maxDepth`.
- **Not in the env (decided):** the policy, `concurrency` (D-01), the question.

### Anti-Patterns to Avoid

- **Re-deriving `resource`/`action` from `question` in `walk`.** The point of D-02 is that the walk reads them from `matcherContext` only.
- **Building `Admitted` anywhere but `admit`.** Today the constructor is public (a pre-existing property); a second `new Admitted` re-opens the proof. Do not add one in tests (build through `admit`).
- **Calling `admit` outside `Effect.suspend`** (Walk) or before a cache check: it would build the context on a cache hit. `walk` keeps its `Effect.suspend`.
- **`Effect.fn`/`Effect.fnUntraced` additions, `switch`, `as`, `!`, `any`, or a `Record<string, unknown>` env type.** The prototype adds none.
- **A per-node env object.** One per evaluation.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| What the request supplied, per interpreter | a second `supplied` literal in `compileTree` or `walk` | `admit(question, rowSource)`'s one computation, read by `absenceOf` | the duplicated literal is the defect this phase removes (ADR-QD-163 had to measure a mutation shift on exactly this object, `163-*.md:256`) |
| Absence classification | any `if (!supplied.action ...)` outside `LeafNeeds.ts` | `absenceOf` / `errorOf` | ADR-QD-163 |
| A depth guard in either interpreter | a new `new PolicyTooDeep(` | `admit`'s (one) plus `evaluateNode`'s per-node guard (one) | `ADMISSION_ALLOWED` counts exactly `Admission.ts: 1`, `Walk.ts: 1` |
| The swap-proof of depth/maxDepth | a branded number or a wrapper object for depth | the env holding `maxDepth` so recursion has one number | measured: zero extra cost, and no type machinery |

**Key insight:** the phase is deletion of repeated facts, not addition of a new abstraction. The measured result agrees: no workload is slower.

## Runtime State Inventory

Not a rename/migration phase. Omitted per the template.

## Common Pitfalls

### Pitfall 1: The concurrency dispatchers need `concurrency`, which D-01 says is not in the env
**What goes wrong:** An implementer reads "recursion passes `(policy, env, depth)`" literally, passes `Admitted`, and finds `evaluateAllOf` cannot read `concurrency`; the fix reached for is a fourth `Concurrency | undefined` parameter, which typechecks when swapped with `depth`.
**How to avoid:** the Walk-private `Evaluation { admitted, concurrency }` of the prototype. Name the recursion parameter `ev` (prototype) or keep `request` (see Pitfall 5).
**Warning signs:** a function in `Walk.ts` with `depth: number` and `concurrency` adjacent.

### Pitfall 2: Cache-hit laziness
**What goes wrong:** `admit` runs before the cache is consulted, paying `policyDepth` (memoised) and the context allocation on a hit.
**How to avoid:** `admit` stays inside `walk`'s `Effect.suspend`. `DecisionCache.test.ts` "a cache hit never runs evaluateNode at all, not even the leaf-level synchronous work" (`:449`) is the existing characterisation (it counts `Set.has` calls on the subject's roles); it passes against the prototype.

### Pitfall 3: Budgets, house-style and cycles
**What goes wrong:** the guard count, the switch count or the untraced count drifts; an import cycle appears.
**How to avoid / measured:** `evaluateNode` keeps its one `switch` and `new PolicyTooDeep(` (Walk.ts: 1, Admission.ts: 1 = `ADMISSION_ALLOWED` [VERIFIED: `scripts/check-house-style.mjs:588-589`]). `SWITCH_BUDGET` `"packages/core/src/Walk.ts": 1` and `SWITCH_BUDGET_NAMES` `["evaluateNode"]` [VERIFIED: `check-house-style.mjs:380, 399`] require the function name `evaluateNode` to stay. `UNTRACED_BUDGET` `Walk.ts: 3` with names `["evaluateAllOf", "evaluateAnyOf", "evaluateRules"]` [VERIFIED: `check-house-style.mjs:467, 480`] stay. `Admission.ts` gains only `import type` of `AuthSubject` and `Supplied` (erased); madge reports no cycle.

### Pitfall 4: Hot-path cost
**What goes wrong:** the prototype reads `ev.admitted`, `admitted.maxDepth`, and destructures five fields per node where the base read two. A reader might expect a regression.
**Measured:** none beyond noise (twice). If the after-run (D-06) disagrees, the cheap fallback is to read `supplied`/`matcherContext` only inside the arms that use them. Do not pre-optimise.

### Pitfall 5: Survivor identity in the mutation compare
**What goes wrong:** Stryker keys a mutant by mutator, replacement, mutated text and normalised line. Rewriting `if (depth > maxDepth) return Effect.fail(new PolicyTooDeep({ maxDepth }));` to `{ maxDepth: admitted.maxDepth }` changes the mutated text of the `NoCoverage` `{}` -> `{ maxDepth }` survivor, so it reads as a new survivor plus a gone one, and `{ concurrency: request.concurrency }` -> `{ concurrency: ev.concurrency }` does the same for the two `ObjectLiteral` survivors.
**How to avoid:** keep those texts byte-identical (cost-free): destructure `const { maxDepth } = admitted;` before the guard so the line is unchanged, and keep the recursion parameter named `request` (type `Evaluation`) so `{ concurrency: request.concurrency }` is unchanged. The nine `depth - 1` survivors on the rewritten call lines are matched by 58's "a survivor whose line was rewritten is the same survivor" rule (same status, mutator, replacement and mutated text `depth + 1`).

### Pitfall 6: `Admission.test.ts` is the only test that breaks, and it breaks twice
`admit(...)` is called with one argument at `:23, 61, 73` (TS2554) and `:78` reads `admitted.success.question.policy._tag` (TS2339). Rewrite in the atomic commit with the new signature; never weaken (D-07). The `question` row's intent ("the admitted value is for this policy") has no analogue now; replace it with an assertion on `supplied`/`maxDepth`.

### Pitfall 7: The tstyche negative needs one export
`evaluateNode` is a non-exported `const` in `Walk.ts` (package-private, not in the barrel). The depth/maxDepth negative must name it. Tests already import package-private modules directly (`packages/core/test/LeafNeeds.tst.ts:13` imports `../src/LeafNeeds.ts`). Add `export` to `evaluateNode` and `type Evaluation` (or read it via `Parameters<typeof evaluateNode>`); neither touches gate 13 because `Walk.ts` is not in the barrel. Gate 14 and the `exports` map are unaffected.

## Code Examples

### The tstyche shape (to write; style from the repo)
```ts
// packages/core/test/WalkEnvironment.tst.ts (new). Style: packages/core/test/DecisionLog.tst.ts:30
// `expect(makeDecisionLog).type.not.toBeCallableWith({ capacity: 10 });`
import { expect, test } from "tstyche";
import type { Admitted } from "../src/Admission.ts";
import type { Policy } from "../src/Policy.ts";
import { evaluateNode } from "../src/Walk.ts";

declare const policy: Policy;
declare const ev: Parameters<typeof evaluateNode>[1];

test("recursion passes the policy, the environment and one depth, in that order", () => {
  expect<Parameters<typeof evaluateNode>>().type.toBe<[policy: Policy, ev: typeof ev, depth: number]>();
  expect(evaluateNode).type.toBeCallableWith(policy, ev, 0);
  expect(evaluateNode).type.not.toBeCallableWith(policy, 0, ev); // depth in the environment's place
  expect(evaluateNode).type.not.toBeCallableWith(policy, ev, 0, 64); // a maxDepth cannot ride along
});

test("the environment holds the bound and no depth", () => {
  expect<Admitted["maxDepth"]>().type.toBe<number>();
  expect<keyof Admitted>().type.toBe<"subject" | "supplied" | "matcherContext" | "maxDepth">();
});
```
Run with `pnpm exec tstyche packages/core/test/WalkEnvironment.tst.ts` (not executed in this research: it needs the `evaluateNode` export, which the prototype deliberately left out so the patch stays a pure refactor; [ASSUMED] that tstyche resolves `Parameters<typeof evaluateNode>` without trouble, A1).

### The tstyche pin for `supplied`'s precision (RED on the base)
```ts
declare const question: Question;
const row = admit(question, "row");
if (Result.isSuccess(row)) expect(row.success.supplied.resource).type.toBe<true>();
const asked = admit(question, "asked");
if (Result.isSuccess(asked)) expect(asked.success.supplied.resource).type.toBe<boolean>();
```
This is what makes `compileTree`'s `Admitted<true>` parameter a compile-time promise: `toPredicate` cannot hand it an `"asked"` environment.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `admit(question)` gives `Admitted { question, matcherContext }`; `walk` builds `supplied` and `Evaluation`, `compileTree` builds `Supplied<true>` by hand | `admit(question, rowSource)` gives the one environment | this phase | the two hand-built `supplied` objects and the `question` field are deleted |
| six-parameter recursion `(policy, subject, request, matcherContext, depth, maxDepth)` | `(policy, ev, depth)` | this phase | `depth`/`maxDepth` adjacency is gone |

**Deprecated/outdated by this change:** the `Walk.ts:51-62` doc paragraph; `Admission.ts`'s "once, for both interpreters" header (still true, extend it to the environment); ADR-QD-100's 2026-10-08 amendment sentence "an `Admitted` proof carrying the question and its matcher context".

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `expect(evaluateNode).type.not.toBeCallableWith(policy, 0, ev)` and `Parameters<typeof evaluateNode>` work in tstyche 7.x against a function returning `Effect.Effect<Trace, EvaluationError, PortServices>` (the repo's precedent `DecisionStream.tst.ts:49-51` warns that a negative `toBeCallableWith` can be taken for an argument refusal when the call "makes an Effect" unrelated; here the refusal is an argument error, which is what is wanted) | Code Examples | the negative needs the `Parameters<...>` form only; planner should run it once in the RED commit |
| A2 | The new mutants in `Admission.ts` (`||` -> `&&`, `"row"` -> `""`, `!==` flips, the two literal objects) are all killed by `LeafMatrix.test.ts`'s 6 resource shapes x action x 126+ cells and `Predicate.test.ts` absences | Mutation | a survivor appears in the after-run; close with a test in the same plan, as 53/54/58 did |
| A3 | Per-node cost of the extra property reads stays inside the band on a quiet host | Pitfall 4 | the after-run (D-06) shows it; a quiet-host rerun is cheap (about 4 minutes for 3 + 3, measured) |
| A4 | The 1-minute load averages are an honest proxy for contention on this host; the high load came from an unrelated process, not from the bench | `59-BENCH.md` Host | the gate would be measured on noise; mitigated by the confirmation run, the min-based statistic and the band |

## Open Questions

1. **Does the owner want `Evaluation { admitted, concurrency }` (the prototype) or `Admitted` carrying `concurrency`?**
   - What we know: D-01 says not in the env; the dispatchers need it; a 4th positional parameter reopens the swap hazard.
   - What's unclear: whether "beside the env" was meant as this Walk-private bundle.
   - Recommendation: the bundle, as measured. It is the discretion item ("`Evaluation` ... reduced to `concurrency`"); the planner should state it in ADR-QD-172 and not ask.
2. **Export `evaluateNode` from `Walk.ts` for the tstyche negative?**
   - Recommendation: yes. It is package-private; gate 13 and `exports` are unaffected (see Pitfall 7). The RED commit adds the test file only, so the test fails to compile on the base (RED), and the atomic commit adds the `export` keyword with the new signature.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node | everything | yes | v26.13.0 | — |
| pnpm | `pnpm check:pr`, `pnpm bench` | yes | 10.17.1 | — |
| Apple M3 Pro, 12 cores | the benchmark | yes | (`sysctl` `machdep.cpu.brand_string`, 12 cores) | — |
| Quiet host | benchmark credibility | **no** (another project's Rust build/test job running; load average 6 to 19) | — | the min-based statistic, the band, and the confirmation run; rerun the after-run when quiet |
| Stryker | mutation | yes (config exists; not run here) | — | — |

**Missing dependencies with no fallback:** none. **With fallback:** a quiet host (above).

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest + `@effect/vitest` (core project: 81 files, 2637 tests, ~10 s); tstyche `^7.2.5`; Stryker |
| Config file | root `vitest.config.ts`, `packages/core/vitest.config.ts`, `tstyche.json` (`"tsconfig": "tsconfig.test.json"`), `stryker.config.mjs` |
| Quick run command | `pnpm exec vitest run --project core packages/core/test/Admission.test.ts packages/core/test/LeafMatrix.test.ts packages/core/test/RolesAndDepth.test.ts packages/core/test/Predicate.test.ts packages/core/test/DecisionCache.test.ts < /dev/null` |
| Full suite command | `pnpm check:pr < /dev/null` (repo root, stdin closed) |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| WENV-01 | gate numbers | harness | `node .planning/phases/QD-59-admission-produces-the-one-walk-environment/bench/analyze.mjs <dir> base proto` | done (`bench/gate`, `bench/gate-r2`) |
| WENV-02 | `admit(q, "asked")` gives the environment; `"row"` always supplies the resource | unit (RED) | `pnpm exec vitest run --project core packages/core/test/Admission.test.ts < /dev/null` | rows to add (Admission.test.ts exists) |
| WENV-02 | each interpreter's `supplied` outcome unchanged | unit (green on base) | `pnpm exec vitest run --project core packages/core/test/LeafMatrix.test.ts packages/core/test/Predicate.test.ts < /dev/null` | yes: `LeafMatrix.test.ts` (6 cells per fixture, `assert.isAtLeast(cells, 126)`), `Predicate.test.ts:425-470` (MissingAction both interpreters, D-08a) |
| WENV-03 | depth/maxDepth swap cannot compile | tstyche (RED) | `pnpm exec tstyche packages/core/test/WalkEnvironment.tst.ts` | no, Wave 0 |
| WENV-04 | depth agreement | unit | `pnpm exec vitest run --project core packages/core/test/RolesAndDepth.test.ts < /dev/null` | yes: `:96` ("agrees with the evaluator's bound exactly, in both directions"), `:130` (short-circuit), plus the `toPredicate` property |
| WENV-04 | budgets | gate | `node scripts/check-house-style.mjs` | yes |
| WX-06 | cache-hit laziness | unit | `... packages/core/test/DecisionCache.test.ts` | yes (`:449`) |

### Sampling Rate
- **Per task commit:** the quick run above, plus `node scripts/check-house-style.mjs`.
- **Per wave merge:** `pnpm exec tsc -b tsconfig.json && pnpm exec tsc -p tsconfig.test.json`, `pnpm exec vitest run --project core < /dev/null`, `pnpm test:tstyche`, `pnpm lint`, `pnpm circular`.
- **Phase gate:** `pnpm check:pr < /dev/null`, then the Stryker runs one at a time, then the compare. Never run Stryker or vitest beside the benchmark.

### What can be written green on the base (D-07)
The environment is not observable through the public API, so the characterisation is behavioural and already exists: `LeafMatrix.test.ts` evaluates every leaf fixture with the action absent/present and the resource none / no `id` / with `id` through **both** `evaluate` and `toPredicate` against a hand-written oracle (its header: "It reads no table of what a leaf needs, so it stays green through the change"); `Predicate.test.ts:425-470`; `RolesAndDepth.test.ts:96-160` and its `toPredicate` property; `DecisionCache.test.ts:449`. `Admission.test.ts` rows at `:25-58` (depth boundary, `NaN`, negative, default, matcher nesting) and `:60-70` (matcher context carries subject attributes, id, resource, action) characterise `admit` itself: they are green on the base and must be re-pointed (second argument) in the atomic commit, otherwise unedited.
**Gap to fill on the base (green):** none through the public API. **RED rows to add before the src change:** in `Admission.test.ts`, `admit(q, "asked").success.supplied` for `{resource, action}`, `{resource}`, `{action}`, `{}`; `admit(q, "row").success.supplied.resource === true` whatever `question.resource` is; `admit(q, "row").success.supplied.action` follows `question.action`; `.success.maxDepth === question.maxDepth` and `.success.subject === question.subject` (identity); plus the tstyche file.

### Wave 0 Gaps
- [ ] `packages/core/test/WalkEnvironment.tst.ts` (RED on the base: `evaluateNode` is not exported)
- [ ] `Admission.test.ts` RED rows above (on the base, `.supplied` does not exist, and the `"row"` argument is a TS error)
- [ ] `59-mutation.mjs` (adapt Phase 54's, see Mutation)
- Framework install: none.

## Mutation (D-08)

**Command** (Phase 54/58 form, one config at a time, stdin closed, background, never beside vitest or the bench): `pnpm exec stryker run stryker.config.mjs --mutate 'packages/core/src/Admission.ts,packages/core/src/Predicate.ts,packages/core/src/Walk.ts' < /dev/null`, then `node <phase dir>/59-mutation.mjs base core` (the Phase 58 script's `write`, `reportOf` staleness checks and `keyOf` identity are reusable verbatim; `SUITES.core.files` becomes these three files). Config facts [VERIFIED: `stryker.config.mjs` read this session]: `ignoreStatic: true`, `coverageAnalysis: "perTest"`, `timeoutMS: 20000`, thresholds `break: 80`, json report `reports/mutation/mutation.json`. The existing `reports/mutation/mutation.json` (dated Nov 19 03:55) holds Phase 58's four files only, so it is not a base for this phase. Run time for core was 32 s in Phase 57 [CITED: `58-RESEARCH.md` Mutation section].

**Last recorded scores** [VERIFIED: `54-mutation-after.json` `counts`/`measured`, read this session; `git log` shows no change to these files after Phase 54's last commit `1732f03e`]: `Walk.ts` killed 264, survived 12, noCoverage 3, ignored 27, measured 0.946236559139785; `Predicate.ts` killed 284, survived 0, noCoverage 0, ignored 22, measured 1. `Admission.ts` has no recorded score: record it in the base.

**What moves** (expected, from reading the code; the base run decides): the killed mutants on the two hand-built `supplied` literals (`Walk.ts:898`: an `ObjectLiteral`, two `!== undefined` equality/conditional mutants; `Predicate.ts:360`: the same plus the `true` of `resource: true`) and on the `Evaluation` literal's `resource: question.resource, action: question.action` lines leave their files and reappear on `Admission.ts`'s new `supplied` literal, which also gains `rowSource === "row" ||` (EqualityOperator, StringLiteral, LogicalOperator, Conditional mutants). So the rule is Phase 54's (a MOVED pair with a receiver), not 58's pure deletion: `Walk.ts` and `Predicate.ts` may fall by exactly their moved killed mutants, `Admission.ts` must rise by at least that many (`det(receiver) + gain >= lost`), and every **new** `Admission.ts` mutant must be killed. 58's mechanics still apply unchanged on the deletion side: killed ids stored at the base; a lost killed mutant must have its source line absent from the after file or be matched by a killed mutant of the same mutator on a rewritten line; survivor sets unchanged, with rewritten lines treated as moved when status, mutator, replacement and mutated text are equal; ADR-QD-167 Rev 1.1's static credit for new `ignored` mutants (run the same suite with `ignoreStatic: false` through a scratchpad config spreading the gate config; never edit the repository's). Declare `DELETED` (`"supplied: { action: question.action"`, `"const supplied: Supplied<true>"`) and the moved survivors before the change. Base survivors on `Walk.ts` (15): nine `ArithmeticOperator depth - 1`, the guard `ConditionalExpression false` and `ObjectLiteral {}` (NoCoverage), two `{ concurrency: request.concurrency }` `ObjectLiteral`, two `StringLiteral` NoCoverage. See Pitfall 5 to keep the last four byte-identical.

## Records (D-10): measured facts

- **Free-ness** [VERIFIED: `grep -rnE 'ARCH-106|ADR-QD-172|CCR-QD-450|BEH-QD-63[1-5]|INV-QD-36[34]'` over the repo excluding `.planning`, `node_modules`, `lib`, `.git`, `coverage`: no output]. Inside `.planning/` the ids appear only in `REQUIREMENTS.md`, `ROADMAP.md`, `PROJECT.md`, `STATE.md`, `_WAVE11-CONTEXT.md` and this phase's directory. The previous phase's numbers (ADR-QD-171, CCR-QD-449, BEH-QD-626..630, INV-QD-361..362) are present in `spec/`, so the next free ones are the reserved ones (`_WAVE11-CONTEXT.md:47`: `| 59 | 106 | 172 | 450 | 631–635 | 363–364 |`). Never run `scripts/next-id.mjs`.
- **ADRs to amend** (each a Rev bump in its own header): **ADR-QD-100** (`spec/decisions/100-a-question-is-asked-once.md`, Rev 1.3): the "Amendment (2026-10-08, ARCH-41)" paragraph at `:69-82` says `admit(question)` "returns either `PolicyTooDeep` or an `Admitted` proof carrying the question and its matcher context"; that is exactly what changes. **ADR-QD-163** (`:57-62` says `absenceOf(leaf, supplied)` and `Supplied<true>` for the predicate; `:256` records the `supplied` object `walk()` built): amend that the object is now built by `admit`. **ADR-QD-024** (two interpreters; "only admission is shared, never the walk"): a one-line addendum is enough; the claim stays true. **ADR-QD-090** and **ADR-QD-073** describe the per-node guard and the three untraced dispatchers: no text names the parameter list; a mention in ADR-QD-172 that both are unchanged suffices. **ADR-QD-156** `:45` names `Admission.ts`'s `Admitted` as a naming precedent: unaffected.
- **Spec prose to update:** `spec/invariants.md` INV-QD-037 (`:1515-1575`: "Source" names `Admission.ts`'s `admit` rejecting before any node, and "Enforcement" names `Admission.test.ts` pinning `admit`; add the environment and the new rows). `spec/traceability.md:388` (the `Admission.test.ts` row) and a row for the new tstyche file. `spec/behaviors/05-evaluator.md` (the per-node guard note near `:150`) and `spec/behaviors/16-predicates.md` are the natural homes for BEH-QD-631..635 (the evaluator and the translator state the environment; Phase 54's BEH-QD-606 lives in `05-evaluator.md`). INV-QD-363 and INV-QD-364 are the next two after `INV-QD-362` (`spec/invariants.md`), suggested: 363 "a question's walk environment is built once, by admission, for both interpreters (each fact carried once)", 364 "an interpreter's `supplied` is a function of its `rowSource` and the question alone". `spec/README.md` CCR-QD-450 row (format: CCR-QD-445's, `spec/README.md:382`). `spec/decisions/index.yaml` and `spec/behaviors/index.yaml` get the new ADR / BEH ranges.
- **Gate 13 / overview:** none. **Changeset:** none: no public type, export or behaviour changes (`@qadi/core`'s published surface is unchanged; `Admitted`/`admit` are package-private; `PolicyTooDeep`'s behaviour is identical). The CONTEXT says "only if public behaviour or types change"; they do not. Nothing is released.
- **AGENTS.md:** no table changes (§5's three untraced and §5a's three switches are unchanged); the §5a text "`Walk.ts` — `evaluateNode` | `policy._tag`" is still true. Gate checks: `check-house-style.mjs` `ADMISSION_ALLOWED` unchanged.
- **If the planner prefers the rejection path** (not recommended; the gate passed): the same records with D-05 wording. It does not apply.

## Security Domain

`security_enforcement` is enabled (absent = enabled).

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2/V3/V4 | no | not touched |
| V5 Input Validation | yes, indirectly: the depth gate bounds recursion on hostile decoded policies | unchanged: `admit`'s `policyDepth(policy) > maxDepth` before any node (INV-QD-037); the per-node guard stays as defense in depth; no decode token is added (house-style clean; AGENTS.md §7a) |
| V6 Cryptography | no | — |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| An environment built without admission (a second constructor call) lets a too-deep policy be walked | Denial of service | only `admit` builds `Admitted`; do not `new Admitted` in `src` or tests (`admission-once` counts `new PolicyTooDeep(`, not `new Admitted(`, so add a review check) |
| `supplied.resource` wrongly `true` for `evaluate` hides a `MissingResource` and decides on an absent resource | Tampering / wrong decision | `resource: rowSource === "row" \|\| question.resource !== undefined`; pinned by the RED rows and by `LeafMatrix.test.ts` (INV-QD-011) |

## Project Constraints (from CLAUDE.md / AGENTS.md)

- Effect v4; `effect` submodule namespace imports only, relative imports carry `.ts`, `import type` for type-only (`verbatimModuleSyntax`) (AGENTS.md §1). The prototype's `Admission.ts` adds `import type { AuthSubject }` and `import type { Supplied }`.
- No `as`, `!`, `any`, `switch` on `_tag` outside the three budgeted switches (§5a, §6); no `Effect.fnUntraced` addition (§5, `UNTRACED_BUDGET` 3); no ambient clock/console/process.env.
- Doc comments: one-line summary first, the why after (AGENTS.md preamble). Rewrite `Admission.ts`'s header and `Walk.ts`'s `Evaluation` and `evaluateNode` docs.
- §11: `spec/` is normative; behaviour doc, invariant and traceability change together. §12: `typescript` fences compile; `ts` fences are listings.
- §15: `pnpm check` is the only definition of done; `check:pr` skips only mutation. Nothing is released.
- Owner memory: never `Record<string, unknown>` as a widened type; a new case is the full closed union (`RowSource` is `"asked" | "row"`, closed); prefer the cleanest complete design; breaking is allowed but recorded (not needed here); no releases.
- Shell: zsh with `grep` aliased to ugrep (use `/usr/bin/grep`); vitest from the repo root with stdin closed; never run `scripts/next-id.mjs`; Stryker never beside vitest or the bench.

## Sources

### Primary (HIGH confidence)
- In-repo, read this session: `packages/core/src/Admission.ts`, `Walk.ts` (all), `Predicate.ts` (`:1-80, 268-440, 560-687`), `LeafNeeds.ts` (`:160-260`), `Matcher.ts` (`:325-375`), `Question.ts`, `Resource.ts`, `packages/core/test/Admission.test.ts`, `RolesAndDepth.test.ts` (`:96-160`), `LeafMatrix.test.ts` (`:1-60`), `DecisionCache.test.ts` (`:430-480`), `scripts/check-house-style.mjs` (`:370-402, 1450-1475`), `stryker.config.mjs`, `tstyche.json`.
- Phase 50 harness and precedent: `.planning/milestones/v1.5-phases/QD-50-*/50-BENCH.md`, `bench/ab.sh`, `bench/analyze.mjs`; `spec/decisions/163-*.md` § Measurement. Phase 54/58 mutation scripts and JSON.
- Measurements made this session: `59-BENCH.md`, `bench/gate/`, `bench/gate-r2/`, the typecheck, vitest, house-style, madge and oxlint runs on the prototype.

### Secondary / Tertiary
- None. No web search or Context7 was needed: the phase uses no new library or API (Context7's MCP server also failed to connect this session).

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH, nothing new.
- Architecture: HIGH, written, typechecked and tested as a patch.
- Benchmark: HIGH for the verdict (two runs agree, 0 of 35 slower); MEDIUM for the absolute deltas because the host was loaded.
- Mutation: MEDIUM, expectations from the code and Phase 54's scores; the base run decides.
- Pitfalls: HIGH.

**Research date:** 2026-11-19
**Valid until:** 2026-12-19, or the next change to `Walk.ts`, `Predicate.ts` or `Admission.ts` (Phases 60 and 61 do not touch them; Phase 61 touches the cache's caller of `walk`).
