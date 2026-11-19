---
phase: QD-59-admission-produces-the-one-walk-environment
reviewed: 2026-11-19T06:00:32Z
depth: standard
iteration: 2
files_reviewed: 6
files_reviewed_list:
  - packages/core/src/Admission.ts
  - packages/core/src/Walk.ts
  - packages/core/src/Predicate.ts
  - packages/core/test/Admission.test.ts
  - packages/core/test/WalkDepthGuard.test.ts
  - packages/core/test/WalkEnvironment.tst.ts
findings:
  critical: 0
  warning: 1
  info: 2
  total: 3
  necessity: 0
status: issues_found
---

# Phase 59: Code Review Report (iteration 2)

**Reviewed:** 2026-11-19T06:00:32Z
**Depth:** standard
**Files Reviewed:** 6
**Status:** issues_found

## Summary

I reviewed `git diff 83cbd5c5 HEAD` for the six files, and fix commit `4da12142` on its own.

**The iteration-1 fixes hold.**
- **WR-01 is fixed.** `Admitted<Source extends RowSource>` stores `source: Source`, so `Admitted<"row">` is not assignable to `Evaluation.admitted: Admitted<"asked">`. The tstyche negatives pin both directions. `WalkDepthGuard.test.ts` now admits with `"asked"`.
- **WR-02 is fixed.** `Admitted.policy` is set from `question.policy`. `walk` starts from `admitted.success.policy`, and `compileTree(admitted: Admitted<"row">)` folds `admitted.policy`. Neither interpreter takes a policy separately from the proof any more. As instructed, no brand was added.
- **IN-01 is fixed.** `Result.getOrThrow` gives one failure path. If admission failed, the throw would become a defect inside `Effect.gen`, which `Effect.flip` does not turn into a pass. So the helper cannot hide a failure. Both tests pass (`vitest --project core`: 15 of 15 across the two files).
- **IN-02 is fixed.** `Environment["admitted"]` is pinned to the named `Admitted<"asked">`, not compared with itself.

**Clean on the points in the brief.**
- **Fail-open.** Under `"asked"`, `supplied.resource` is `question.resource !== undefined`, and `matcherContext.resource` is `question.resource`. The two agree at runtime, and Admission.test.ts E1–E4 pin it.
- **Divergence.** Depth, action and resource come from one `admit` in both interpreters.
- **Hot path.** `admit` runs once per walk, inside `Effect.suspend`. A cache hit never runs it.
- **Stale docs in the six files.** None mention the six-argument tuple or `Admitted.question`.
- **House rules.** No `as`, `!`, `any`, new `switch` or `Record<string, unknown>`. `effect` imports are namespace imports.

**One new weakness, and it comes from the fix itself (WR-01).** The fix made `admit` a generic overload over a wider implementation signature. That overload is the only thing that turns a runtime `boolean` into the type `Supplied<true>`. So the type-level proof is now an unchecked assertion. I compiled a direct, checked alternative.

I read `necessity-review.md`. No finding qualifies. `source` is never read at runtime, but it does real work: it is the discriminant that keeps the two environments apart.

## Narrative Findings (AI reviewer)

## Warnings

### WR-01: `admit`'s generic overload asserts `Supplied<true>` without checking it, and the fact lives in two unconnected tables

**File:** `packages/core/src/Admission.ts:49-52`, `packages/core/src/Admission.ts:58-61`, `packages/core/src/Admission.ts:91-119`

**Issue:**
- **The overload is unchecked.** The public signature returns `Result<Admitted<Source>, PolicyTooDeep>`. The implementation signature returns the wider `Result<Admitted, PolicyTooDeep>`, which is `Admitted<RowSource>`. TypeScript checks an implementation only against that wider signature. So nothing checks that `"row"` really produces `supplied.resource === true`, or that `source` equals the `Source` the caller passed. The overload works as a cast, which AGENTS.md §6 forbids. ADR-QD-160 rejects the same pattern as R7: "an overload whose implementation widens … dodges `as` by widening the implementation type".
- **The fact is stated twice, and the two statements are not connected.**
  - `SuppliedBy` (lines 58-61) states the type: `row: Supplied<true>`.
  - `RESOURCE_SUPPLIED` (lines 49-52) states the value, and its rows are typed `(question) => boolean`.
  - Nothing ties the two together. If `row: () => true` became `() => false`, or `asked` became `() => true` (the fail-open case in the brief), the code would still compile. `admit(q, "row").success.supplied.resource` would still be typed `true`.
  - Today only the runtime tests catch this (Admission.test.ts E1–E5).
- **Confirmed by compiling.** I built a standalone reproduction with the same types and ran the repo's `tsc --strict`. With `row: () => false` behind the overload, it compiles, and `const r: true = admit({}, "row").supplied.resource` typechecks.
- **The ADR overclaims.**
  - ADR-QD-172 Decision 3 says `toPredicate`'s `Supplied<true>` "stays precise without `as`".
  - Its Consequences say "a new row source is one more row in `RESOURCE_SUPPLIED`, which does not compile without it". In fact a new row source needs a row in two tables, and the value row is not checked against the type row.
  - Line 200 still refers to "the `"row"` overload", which no longer exists. There is now one generic overload.

**Fix:** Merge the two tables into one table typed by `SuppliedBy`, then drop the overload. Indexing a mapped type with a generic key resolves to `SuppliedBy[Source]`. I checked with `tsc --strict` that the version below compiles, and that a `row` entry returning `resource: false` fails with TS2322:

```ts
/** What a request supplied, one row per row source; each row is checked against its type. */
const SUPPLIED: { readonly [Source in RowSource]: (question: Question) => SuppliedBy[Source] } = {
  asked: (question) => ({
    action: question.action !== undefined,
    resource: question.resource !== undefined,
  }),
  row: (question) => ({ action: question.action !== undefined, resource: true }),
};

export const admit = <Source extends RowSource>(
  question: Question,
  rowSource: Source,
): Result.Result<Admitted<Source>, PolicyTooDeep> =>
  policyDepth(question.policy) > question.maxDepth
    ? Result.fail(new PolicyTooDeep({ maxDepth: question.maxDepth }))
    : Result.succeed(
        new Admitted(
          rowSource,
          question.policy,
          question.subject,
          SUPPLIED[rowSource](question),
          { subject: question.subject.attributes, subjectId: question.subject.id,
            resource: question.resource, action: question.action },
          question.maxDepth,
        ),
      );
```

Then delete `RESOURCE_SUPPLIED`, and update ADR-QD-172 Decision 3, line 200 and the Consequences bullet to name `SUPPLIED`. The tstyche pins in `WalkEnvironment.tst.ts` stay as they are.

## Info

### IN-01: A comment in `Evaluate.test.ts` still says the matcher context is "threaded as a parameter" through `evaluateNode`

**File:** `packages/core/test/Evaluate.test.ts:1448-1451`

**Issue:** The comment says "`matcherContext` is now built once, in `evaluate`'s `Effect.suspend`, and threaded as a parameter through `evaluateNode` and its `AllOf`/`Rules` helpers". After this phase, the matcher context is not a parameter. It is `request.admitted.matcherContext`, built by `admit`. The test still exercises the right thing. Only the prose is stale. This file is outside the six in scope, but this phase made the comment stale.

**Fix:** Reword it, for example: "`matcherContext` is built once by `admit` and read from the walk environment (`request.admitted`) at every node; this exercises every shape the environment has to survive…".

### IN-02: The module doc and a test title still list four parts of the environment after WR-02 added `policy`

**File:** `packages/core/src/Admission.ts:20-24`, `packages/core/test/WalkEnvironment.tst.ts:27`

**Issue:**
- **The module doc.** `Admission.ts`'s header describes the walk environment as "the subject, what the request supplied, what its matchers see and the depth bound". It leaves out the admitted policy, which is now the field that ties the depth proof to the tree being walked. The class doc, by contrast, is correct.
- **The test title.** The tstyche test is titled "the environment holds the subject, what was supplied, the matcher context and the bound", but its pin now lists `source` and `policy` as well.

**Fix:** Add "the policy it admitted" to the header sentence, and retitle the test, for example "the environment holds its row source, the admitted policy, the subject, what was supplied, the matcher context and the bound".

---

_Reviewed: 2026-11-19T06:00:32Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
