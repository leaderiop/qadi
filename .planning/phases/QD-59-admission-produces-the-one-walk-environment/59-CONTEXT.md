# Phase 59: Admission produces the one walk environment - Context

**Gathered:** 2026-11-19
**Status:** Ready for planning

<domain>
## Phase Boundary

**The change.**
- `evaluateNode` takes `(policy, subject, request, matcherContext, depth, maxDepth)` (`packages/core/src/Walk.ts`). That tuple is threaded through 11 recursive call sites, and swapping `depth` and `maxDepth` still typechecks; Walk.ts's own comment says so.
- `resource` and `action` sit both in the `Evaluation` bundle (`Walk.ts:67`) and in `MatcherContext` (`Matcher.ts:345`). The subject is carried three times: `subject`, `matcherContext.subject` and `matcherContext.subjectId`.
- `Admission.ts`'s `Admitted` already holds the question plus the matcher context. Yet `walk` builds `supplied` itself (`Walk.ts:898`), and `compileTree` builds a different `supplied`, `resource: true`, by hand (`Predicate.ts:360`).

This phase makes admission produce the one walk environment that both interpreters read. Recursion then passes `(policy, env, depth)`.

**It opens on a benchmark and may end in a recorded rejection** (AGENTS.md §5a: `evaluateNode` is budgeted switch #1).

**In scope:**
- core's `Admission.ts`, `Walk.ts`, `Predicate.ts`, and `Matcher.ts` only if a type moves;
- the benchmark harness, run the Phase 50 way;
- records: ARCH-106, ADR-QD-172, CCR-QD-450, BEH-QD-631..635, INV-QD-363..364;
- a changeset only if public code changes.

**Out of scope:**
- the shared child-walk driver (ADR-QD-073 addendum);
- converting any of the three `Effect.fnUntraced` functions;
- `SWITCH_BUDGET` changes;
- the public matcher API (D-02).
</domain>

<decisions>
## Implementation Decisions

### The environment (WENV-02, WENV-03), owner choices 2026-11-19

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

### The benchmark gate (WENV-01)

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
  - the phase still closes its records: ADR, CCR row, BEH/INV only where they describe the measured outcome, and any unused ids named "Unused: …".
- **D-06: if pursued**, `pnpm bench` after the change is measured the same way against the phase base, and the table goes in ADR-QD-172 (WENV-04).

### Tests and mutation (if pursued)

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

### Records

- **D-10:**
  - ARCH-106.
  - ADR-QD-172, holding the benchmark tables and the outcome.
  - CCR-QD-450.
  - BEH-QD-631..635 and INV-QD-363..364, reserved. On a rejection, unused ids are named "Unused: …" in the CCR row.
  - `spec/overview.md` (gate 13) only if a public export changes. `Admitted` and `admit` are package-internal unless research finds otherwise.
  - A changeset only if public behaviour or types change.
  - Nothing is released.

### Claude's Discretion

- The env's field names.
- Whether `Evaluation` is deleted or reduced to `concurrency`.
- How the prototype patch is stored, following Phase 50's `research-probes/proto-*.patch.txt`.
</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `Admission.ts`: `Admitted` (class, proof by construction) and `admit` (the depth gate plus the matcher context).
- `LeafNeeds.ts:180`: `Supplied<Resource extends boolean>`, which `compileTree` uses as `Supplied<true>`.
- Phase 50's bench harness and `50-BENCH.md`, and ADR-QD-163 § Measurement, which hold the method, the band and the gate line.

### Established Patterns
- `walk` is a plain function returning `Effect.suspend`, so a cache hit never calls `admit` (`Walk.ts` doc). Keep that.
- The three composite dispatchers (`evaluateAllOf`, `evaluateAnyOf`, `evaluateRules`) are `Effect.fnUntraced` and stay so (§5).

### Integration Points
- 11 `evaluateNode` call sites in `Walk.ts`.
- `compileTree`/`toPredicate` in `Predicate.ts`.
- `RolesAndDepth.test.ts`.
- The `Evaluate.bench.ts` workloads.
</code_context>

<specifics>
## Specific Ideas

The owner's standing preference is the cleanest, most complete design over the simplest. Breaking changes are acceptable when recorded, but D-02 keeps the matcher API stable on purpose.
</specifics>

<deferred>
## Deferred Ideas

- Narrowing or deleting the public `MatcherContext` (rejected in D-02 for now).
- The shared child-walk driver (ADR-QD-073 addendum; needs a new measurement).
</deferred>
