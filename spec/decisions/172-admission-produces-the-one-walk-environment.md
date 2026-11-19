# ADR-QD-172 — Admission produces the one walk environment

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-ADR-172                                   |
> | Revision       | 1.0                                            |
> | Effective Date | 2026-11-19                                     |
> | Status         | Accepted — amends ADR-QD-024, ADR-QD-100, ADR-QD-163 |
> | Author         | Qadi Engineering                               |
> | Classification | Architecture Decision Record                   |
> | Change History | 1.0 (2026-11-19): Initial release (ARCH-106, CCR-QD-450) |

---

## Context

`admit` ([ADR-QD-100](./100-a-question-is-asked-once.md)'s ARCH-41 amendment) already shared the depth gate and the
matcher context between the two interpreters. The walk itself still did not read one environment:

- **`walk` copied.** It copied the resource and the action into its own `Evaluation` bundle, although `MatcherContext`
  already held both, and it hand-built the `supplied` object (`{ action, resource }`) itself.
- **`compileTree` copied differently.** `toPredicate`'s translator hand-built a second `Supplied<true>` literal
  (`resource: true`).
- **Recursion threaded six positional arguments.** `evaluateNode(policy, subject, request, matcherContext, depth,
  maxDepth)` ran at 13 call sites (9 recursive, 3 hand-offs from the composite dispatchers, and the root; D-16), and
  `depth` and `maxDepth` were adjacent numbers whose swap compiled. `Walk.ts`'s own comment said so.
- **The subject was carried three times**: as `subject`, as `matcherContext.subject` and as `matcherContext.subjectId`.

Every fact the walk reads was stored in more than one place, and each interpreter decided for itself what the request
supplied.

## Decision

Each item cites the phase decision it records.

1. **D-01: `Admitted` becomes the environment.** `admit(question, rowSource)` returns the one walk environment, and
   `rowSource` is a closed union: `"asked"` for `evaluate`, where the resource is supplied when the question has one, and
   `"row"` for `toPredicate`, where the row is always supplied. `supplied` is computed in one place, from `rowSource`, so
   each interpreter states only `rowSource`. Holding an `Admitted` is still the proof of admission, because only `admit`
   builds one. The question is no longer carried.
2. **D-02: the environment holds the public `MatcherContext`, built once.** `admit` builds the matcher context a single
   time, and the walk reads the resource and the action from it, so each is stored once and nowhere else. Matchers keep
   their public signature, so this is not Breaking for the matcher API. The matcher context's `subject` and `subjectId`
   are a derived projection of `Admitted.subject` that `admit` builds, so WENV-03's "each carried once" holds for stored
   facts and the projection is not a second source.
3. **D-13: the environment type is `Admitted<Resource extends boolean = boolean>`**, holding `subject`, `supplied`,
   `matcherContext` and `maxDepth`. `admit` has two overloads, `"row"` giving `Admitted<true>` and `RowSource` giving
   `Admitted`, so `toPredicate`'s `Supplied<true>` stays precise without `as`. `RESOURCE_SUPPLIED` is one closed row per
   row source: a row source without a row does not compile.
4. **D-03 and D-16: recursion passes `(policy, request, depth)`.** `maxDepth` moved into the environment, so the
   recursion carries one number and a depth cannot land where the bound belongs and compile. All 13 sites use the new
   shape (D-16), and `WalkEnvironment.tst.ts` pins it with a negative (WENV-03).
5. **D-12: a Walk-private `Evaluation { admitted, concurrency }`.** `concurrency` is a property of how the walk is
   performed, never a value a matcher compares, so it is not in the environment. A fourth positional `concurrency` would
   typecheck when swapped with `depth`, so it travels in the bundle instead. The bundle repeats no fact and has one
   construction site, so D-01's objection to a second type does not apply to it.
6. **D-14: `evaluateNode` is exported from the package-private `Walk.ts`**, so the type pins can name it. It is not in
   the barrel, so gate 13 (`scripts/check-api-surface.mjs`) stays at 933 exports, and there is no changeset: nothing
   public changed. The walk's own
   `depth > maxDepth` guard is kept as defence in depth (ADR-QD-090): admission now proves the bound before the walk
   starts, so `evaluate` cannot reach it, and `WalkDepthGuard.test.ts` pins it by entering `evaluateNode` directly.
7. **D-15: the mutation rule.** The killed mutants on the two hand-built `supplied` literals move into `Admission.ts`:
   Phase 54's moved-with-receiver rule with Phase 58's mechanics and static credit. See `## Mutation`.

The benchmark came first and gated the rest (D-04, D-05, D-11); see `## Benchmark`.

## Benchmark

The method is Phase 50's ([ADR-QD-163](./163-what-a-leaf-needs-from-the-request-is-stated-once.md) § Measurement): the
same harness (`bench/ab.sh`, `bench/analyze.mjs`), all 35 `Evaluate.bench.ts` workloads, runs interleaved 3 + 3 (base,
candidate, base, candidate, ...), with the candidate's patch applied and reversed around each of its runs so no source is
committed to measure it (D-04). The decision statistic is the median of per-run minima per workload. A workload is slower
only when the candidate's delta is strictly greater than its band, `max(10%, the base's own spread of that statistic)`.
The verdict is the analysis's last line, `# gate: pass` or `# gate: fail`, not judgement.

**The gate of record (D-04, D-11).** The research prototype `research-probes/proto-p1.patch.txt` (SHA-256
`7cd868b6…4ee3`) against the base, on the 3 + 3 harness. It was measured against `e9b98bb8`, whose `packages/core/src` is
byte-identical to the phase base's (`83cbd5c5`).

Result: slower 0 of 35; geomean delta of minima -1.15%; worst 6.7% filter — 500 items, concurrency :: sequential
(default). **gate: pass**

Median of per-run minima (ns); delta is prototype over base.

| workload | base min (ns) | prototype min (ns) | delta | base spread | band | verdict |
|---|---|---|---|---|---|---|
| evaluate :: one node | 5,875 | 5,791 | -1.4% | 4.3% | 10.0% | ok |
| evaluate — rules DenyOverrides 8, concurrency :: sequential (default) | 7,458 | 7,666 | +2.8% | 2.8% | 10.0% | ok |
| evaluate — anyOf Union 8, concurrency :: sequential (default) | 7,750 | 7,958 | +2.7% | 4.3% | 10.0% | ok |
| evaluate — wide, concurrency :: sequential (default) | 7,833 | 7,958 | +1.6% | 5.8% | 10.0% | ok |
| evaluate :: wide — allOf of 8 | 7,916 | 7,708 | -2.6% | 6.8% | 10.0% | ok |
| evaluate :: rules DenyOverrides — 8 permits | 7,916 | 7,500 | -5.3% | 6.3% | 10.0% | ok |
| evaluate — anyOf Union 8, concurrency :: concurrency: unbounded | 8,041 | 8,500 | +5.7% | 2.1% | 10.0% | ok |
| evaluate :: anyOf First — 8, last allows | 8,083 | 7,750 | -4.1% | 6.2% | 10.0% | ok |
| evaluate — wide, concurrency :: concurrency: unbounded | 8,125 | 8,333 | +2.6% | 3.6% | 10.0% | ok |
| evaluate :: rules FirstApplicable — 8, last applies | 8,250 | 7,708 | -6.6% | 10.1% | 10.1% | ok |
| evaluate :: wrapper-heavy — 10 nested labeled/not/obliged | 8,292 | 8,125 | -2.0% | 3.0% | 10.0% | ok |
| evaluate :: anyOf Union — 8 | 8,333 | 7,708 | -7.5% | 8.0% | 10.0% | ok |
| evaluate :: field-heavy — anyOf of 8 under Union | 8,708 | 8,500 | -2.4% | 6.2% | 10.0% | ok |
| evaluate :: rules PermitOverrides — 8 denies | 8,875 | 8,541 | -3.8% | 3.3% | 10.0% | ok |
| evaluate — width scaling :: width 4 | 8,875 | 8,583 | -3.3% | 3.8% | 10.0% | ok |
| evaluate :: leaf-heavy — allOf of 8, matchers reference neither | 9,583 | 9,500 | -0.9% | 6.1% | 10.0% | ok |
| evaluate :: leaf-heavy — allOf of 8, matchers reference action and resource | 9,750 | 9,458 | -3.0% | 0.4% | 10.0% | ok |
| evaluate — rules DenyOverrides 8, concurrency :: concurrency: unbounded | 9,750 | 10,083 | +3.4% | 4.3% | 10.0% | ok |
| evaluate :: deep — 10 levels | 10,458 | 10,166 | -2.8% | 8.8% | 10.0% | ok |
| evaluate — width scaling :: width 8 | 10,708 | 10,458 | -2.3% | 3.9% | 10.0% | ok |
| evaluate :: deep rules — 10 nested | 10,792 | 10,250 | -5.0% | 1.5% | 10.0% | ok |
| evaluate :: matcher-heavy — 3 refs | 11,166 | 11,208 | +0.4% | 4.5% | 10.0% | ok |
| evaluate :: resolver miss — one port call | 11,833 | 11,667 | -1.4% | 4.9% | 10.0% | ok |
| evaluate — depth scaling :: depth 5 | 11,958 | 11,625 | -2.8% | 1.7% | 10.0% | ok |
| evaluate :: obligation-heavy — allOf of 8 distinct obligations | 12,458 | 12,209 | -2.0% | 5.4% | 10.0% | ok |
| evaluate — width scaling :: width 16 | 14,333 | 14,292 | -0.3% | 3.8% | 10.0% | ok |
| evaluate — depth scaling :: depth 10 | 16,750 | 16,292 | -2.7% | 4.7% | 10.0% | ok |
| evaluate :: field-heavy — allOf of 8 under Intersection | 17,250 | 16,875 | -2.2% | 9.9% | 10.0% | ok |
| evaluate — width scaling :: width 32 | 21,458 | 21,500 | +0.2% | 5.6% | 10.0% | ok |
| evaluate — depth scaling :: depth 20 | 25,750 | 25,792 | +0.2% | 1.1% | 10.0% | ok |
| evaluate — depth scaling :: depth 40 | 43,625 | 43,500 | -0.3% | 1.3% | 10.0% | ok |
| filter — 500 items, concurrency :: sequential (default) | 4,025,125 | 4,295,500 | +6.7% | 6.6% | 10.0% | ok |
| filter — 500 items, concurrency :: concurrency: unbounded | 4,054,541 | 4,259,625 | +5.1% | 6.8% | 10.0% | ok |
| filter — 500 items :: hasPermission | 4,122,375 | 4,046,708 | -1.8% | 9.9% | 10.0% | ok |
| decideSubjects — 500 subjects :: hasPermission | 5,439,416 | 5,262,417 | -3.3% | 6.4% | 10.0% | ok |

A confirming 5 + 5 run of the same patch gave slower 0 of 35; geomean -0.03%; worst 5.6% evaluate — width scaling :: width
8; **gate: pass**. The 3 + 3 run is the gate of record (D-04 names three runs each) and the 5 + 5 run is corroboration. The
host was not quiet in either: an unrelated build from another project was running, and the 1-minute load average was 6
to 19 around the gate runs. The statistic and the band are what keep the verdict meaningful under that load.

Both runs passed, so D-05's rejection path was not taken (D-11): the phase was pursued, the source changed, and no reserved
id goes unused.

**The after-run (D-06, D-18).** The committed source (`a4959680`, after `docs(59-04)`) against the phase base with the
same harness: `bench/ab.sh bench/after/to-base.patch bench/after 3 final base`, where `to-base.patch` is `git diff <head>
<phase_base> -- packages/core/src` (SHA-256 `e6cf4159…550c`), interleaved 3 + 3. Host: Apple M3 Pro, Node v26.13.0, started
2026-11-19T04:50:12Z. The host was shared (an unrelated build and a virtual machine ran beside it, nothing else of this
project): the 1-minute load average before and after the six runs ranged from 20.80 to 126.48, so the band is the guard
here too.

Result: slower 0 of 35; geomean delta of minima 1.60%; worst 7.3 evaluate — wide, concurrency :: concurrency: unbounded.
**gate: pass**

Median of per-run minima (ns); delta is final over base.

| workload | base min (ns) | final min (ns) | delta | base spread | band | verdict |
|---|---|---|---|---|---|---|
| evaluate :: one node | 6,000 | 6,000 | 0.0% | 2.1% | 10.0% | ok |
| evaluate :: rules DenyOverrides — 8 permits | 7,833 | 7,708 | -1.6% | 3.2% | 10.0% | ok |
| evaluate :: rules FirstApplicable — 8, last applies | 8,166 | 7,958 | -2.5% | 3.1% | 10.0% | ok |
| evaluate :: anyOf Union — 8 | 8,083 | 8,041 | -0.5% | 2.1% | 10.0% | ok |
| evaluate :: anyOf First — 8, last allows | 8,209 | 8,208 | -0.0% | 4.1% | 10.0% | ok |
| evaluate :: wrapper-heavy — 10 nested labeled/not/obliged | 8,500 | 8,208 | -3.4% | 2.9% | 10.0% | ok |
| evaluate :: wide — allOf of 8 | 8,125 | 8,042 | -1.0% | 1.5% | 10.0% | ok |
| evaluate :: rules PermitOverrides — 8 denies | 8,792 | 9,250 | +5.2% | 3.3% | 10.0% | ok |
| evaluate :: field-heavy — anyOf of 8 under Union | 8,916 | 8,750 | -1.9% | 2.3% | 10.0% | ok |
| evaluate :: leaf-heavy — allOf of 8, matchers reference action and resource | 9,791 | 10,042 | +2.6% | 2.6% | 10.0% | ok |
| evaluate :: leaf-heavy — allOf of 8, matchers reference neither | 9,958 | 10,125 | +1.7% | 2.9% | 10.0% | ok |
| evaluate :: deep rules — 10 nested | 10,292 | 10,708 | +4.0% | 5.3% | 10.0% | ok |
| evaluate :: deep — 10 levels | 10,791 | 10,333 | -4.2% | 1.5% | 10.0% | ok |
| evaluate :: matcher-heavy — 3 refs | 11,750 | 11,375 | -3.2% | 1.4% | 10.0% | ok |
| evaluate :: obligation-heavy — allOf of 8 distinct obligations | 12,833 | 12,542 | -2.3% | 2.3% | 10.0% | ok |
| evaluate :: resolver miss — one port call | 12,291 | 11,916 | -3.1% | 5.1% | 10.0% | ok |
| evaluate :: field-heavy — allOf of 8 under Intersection | 17,792 | 17,292 | -2.8% | 4.7% | 10.0% | ok |
| filter — 500 items :: hasPermission | 4,174,667 | 4,337,708 | +3.9% | 2.8% | 10.0% | ok |
| decideSubjects — 500 subjects :: hasPermission | 5,333,750 | 5,618,500 | +5.3% | 4.7% | 10.0% | ok |
| evaluate — depth scaling :: depth 5 | 11,833 | 12,084 | +2.1% | 6.0% | 10.0% | ok |
| evaluate — depth scaling :: depth 10 | 16,542 | 17,208 | +4.0% | 4.5% | 10.0% | ok |
| evaluate — depth scaling :: depth 20 | 26,125 | 26,667 | +2.1% | 4.9% | 10.0% | ok |
| evaluate — depth scaling :: depth 40 | 44,583 | 45,459 | +2.0% | 1.5% | 10.0% | ok |
| evaluate — width scaling :: width 4 | 8,792 | 9,208 | +4.7% | 8.1% | 10.0% | ok |
| evaluate — width scaling :: width 8 | 10,750 | 11,042 | +2.7% | 9.3% | 10.0% | ok |
| evaluate — width scaling :: width 16 | 14,541 | 15,125 | +4.0% | 7.2% | 10.0% | ok |
| evaluate — width scaling :: width 32 | 21,875 | 22,875 | +4.6% | 8.4% | 10.0% | ok |
| evaluate — wide, concurrency :: sequential (default) | 7,625 | 8,167 | +7.1% | 8.2% | 10.0% | ok |
| evaluate — wide, concurrency :: concurrency: unbounded | 8,000 | 8,583 | +7.3% | 7.8% | 10.0% | ok |
| evaluate — anyOf Union 8, concurrency :: sequential (default) | 7,708 | 8,209 | +6.5% | 6.5% | 10.0% | ok |
| evaluate — anyOf Union 8, concurrency :: concurrency: unbounded | 8,125 | 8,583 | +5.6% | 6.2% | 10.0% | ok |
| evaluate — rules DenyOverrides 8, concurrency :: sequential (default) | 7,458 | 7,958 | +6.7% | 6.7% | 10.0% | ok |
| evaluate — rules DenyOverrides 8, concurrency :: concurrency: unbounded | 9,958 | 10,417 | +4.6% | 5.0% | 10.0% | ok |
| filter — 500 items, concurrency :: concurrency: unbounded | 4,331,792 | 4,324,042 | -0.2% | 5.3% | 10.0% | ok |
| filter — 500 items, concurrency :: sequential (default) | 4,297,666 | 4,212,459 | -2.0% | 0.4% | 10.0% | ok |

The positive geomean and worst delta are inside every workload's 10% band. The after-run measured the final code, whose
`supplied` rule is a table (`RESOURCE_SUPPLIED`) rather than the prototype's inline conditional.

## Alternatives rejected

- **A separate `WalkEnv` built from `Admitted` by each interpreter** (D-01). That is two types and two construction sites,
  and the `supplied` rule would stay per interpreter, which is the defect this removes.
- **Deleting or narrowing `MatcherContext`** (D-02). Breaking for the public matcher API, for no gain the environment
  needs: it holds the context and reads the resource and the action from it.
- **`concurrency` as a fourth positional parameter** (D-12). It is swappable with `depth`, so the slip D-03 closes would
  return with a different pair of numbers.
- **The prototype's inline `supplied` conditional.** A mutant replacing `"asked"` survived as equivalent, which D-15
  refuses. The table kills it and makes a missing row source a compile error.
- **A cast to `Supplied<true>` in `toPredicate`.** `as` is forbidden (AGENTS.md §6); the `"row"` overload says it.

## Mutation

The scoped core gate (`stryker.config.mjs`, unedited, narrowed by `--mutate` to `Admission.ts`, `Predicate.ts` and
`Walk.ts`) was run on the phase base and on the closing tree by `59-mutation.mjs`, committed with the base before any test
or source change. Each score is `(detected/scored)`, where detected is killed plus timeout and scored adds survivors and
no-coverage mutants (D-15). The numbers are those of `59-mutation-base.json` and `59-mutation-after.json`.

| File | Base | After |
| ---- | ---- | ----- |
| `Admission.ts` | 1 (6/6) | 1 (15/15) |
| `Predicate.ts` | 1 (284/284) | 1 (280/280) |
| `Walk.ts` | 0.9498 (265/279) | 0.9524 (260/273) |

Detected counts fell only where killed mutants moved out with deleted or rewritten code, and every lost killed mutant has
its source line absent from the after file. `Walk.ts` lost 40 detected mutants (10 on deleted lines, 30 on rewritten ones) and gained 35 on the rewritten lines; `Predicate.ts` lost 7 (6 deleted,
1 rewritten) and gained 3. `Admission.ts` lost 5 and gained 14, ending at 15 detected from 6, and its 3 static-ignored mutants (1 at the base) were measured too, with `ignoreStatic:
false` (`59-mutation-static.json`): all are `Killed`, and so is the one new static-ignored mutant in `Walk.ts`. The nine
`depth + 1` survivors moved with their lines (`depth - 1` replaced by `depth + 1` is the base's surviving arithmetic mutant
at each recursive call), and the two `{ concurrency: request.concurrency }` and two uncovered-literal survivors are the
base's.

One gap needed a test. Admission now proves `policyDepth <= maxDepth` before a walk starts, so the walk's own `depth >
maxDepth` guard in `Walk.ts` is unreachable through `evaluate`, and its mutant (replacing the condition by `false`),
detected at the base as a Stryker timeout, survived the first after-run. `WalkDepthGuard.test.ts` (`c518b5b8`) pins the
guard by entering `evaluateNode` directly with an environment one level past its bound; the guard is kept as defence in
depth, not deleted (Decision 6). The after-run was repeated once on that tree, and the base's `{ maxDepth }` no-coverage
literal on the same line is now covered and killed. The comparison printed `WX-05 holds (D-15)`.

## Consequences

- **No public change.** The barrel and `spec/overview.md` are untouched, `spec:api` counts 933 exports before and after,
  there is no changeset, and nothing is Breaking: `Admitted`, `admit` and `Walk.ts` are package-private (ADR-QD-099).
- **One environment object per evaluation, never per node.** `walk` builds it inside its `Effect.suspend`, so a cache hit
  never admits, and the recursion passes it unchanged.
- **Each fact is stored once and an interpreter states only where its resource comes from.** INV-QD-363 and INV-QD-364
  state the two properties and BEH-QD-631..635 the behaviours, and INV-QD-037 names the environment. They are written
  with the specification, not here.
- **A new request-supplied fact has one home.** It is added to the environment and `admit`'s one construction site, and
  both interpreters read it; a new row source is one more row in `RESOURCE_SUPPLIED`, which does not compile without it.
- **ADR-QD-024, ADR-QD-100 and ADR-QD-163 are amended**, each with a pointer here, not rewritten: the two walks stay two,
  and what changed is where each reads its environment from.

## Related

[ADR-QD-024](./024-predicate-output.md), [ADR-QD-099](./099-entry-points-are-a-closed-list.md),
[ADR-QD-100](./100-a-question-is-asked-once.md),
[ADR-QD-163](./163-what-a-leaf-needs-from-the-request-is-stated-once.md),
[ADR-QD-167](./167-each-leafs-answer-becomes-a-verdict-in-one-row.md),
[ADR-QD-171](./171-a-stored-record-is-its-envelope-in-memory-too.md),
BEH-QD-631..635, INV-QD-037, INV-QD-363, INV-QD-364, ARCH-106, CCR-QD-450.
