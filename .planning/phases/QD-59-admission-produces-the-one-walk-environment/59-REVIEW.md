---
phase: QD-59-admission-produces-the-one-walk-environment
reviewed: 2026-11-19T05:37:36Z
depth: standard
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
  warning: 2
  info: 2
  total: 4
  necessity: 0
status: issues_found
---

# Phase 59: Code Review Report

**Reviewed:** 2026-11-19T05:37:36Z
**Depth:** standard
**Files Reviewed:** 6
**Status:** issues_found

## Summary

I reviewed the diff from `83cbd5c5` to `HEAD` for the six files in scope.

**Clean on the points I was asked to check:**
- **`"asked"` path.** `walk` admits with `"asked"`. `supplied.resource` is `question.resource !== undefined`, and `matcherContext.resource` is `question.resource`, so the two agree. A resource leaf with no resource fails `MissingResource` (confirmed by running it).
- **Divergence.** Both interpreters read `maxDepth`, `action` and `supplied` from the one `admit`.
- **Hot path.** The environment is built once per walk, inside `Effect.suspend`, so a cache hit never runs `admit`.
- **Stale docs.** No comment in the six files still describes the six-argument tuple or `Admitted.question`. A grep of `packages/` and `spec/` found none either.
- **House rules.** No `as`, `!`, `any` or new `switch` was added. Type-only imports use `import type`.

**Two weaknesses are new in this phase.** Both concern the claim "holding an `Admitted` is the proof":
- **WR-01.** Under `"row"`, the environment stores two facts about the resource that disagree: `supplied.resource` is `true`, but `matcherContext.resource` is `undefined`. The walk's parameter type accepts this row environment. Fed to `evaluateNode`, `not(hasResourceAttribute(...))` returns **allow** instead of `MissingResource`; I confirmed this by running it. The only caller that does this today is a test, `WalkDepthGuard.test.ts`.
- **WR-02.** `Admitted` no longer carries the policy it admitted. The depth proof therefore no longer covers the policy each interpreter walks, and a comment in `Predicate.ts` still says it does.

I read `necessity-review.md`. No finding qualifies as a necessity finding. The walk's own depth guard is deliberate defence in depth (ADR-QD-172), and `RESOURCE_SUPPLIED` has two rows.

## Narrative Findings (AI reviewer)

## Warnings

### WR-01: A row-sourced environment typechecks as a walk environment, and the walk then fails open on a resource leaf

**File:** `packages/core/src/Walk.ts:62-63`, `packages/core/src/Walk.ts:356-359`, `packages/core/src/Admission.ts:59-64`, `packages/core/src/Admission.ts:88-99`, `packages/core/test/WalkDepthGuard.test.ts:19`

**Issue:**
- **Two facts that disagree.** `admit(question, "row")` sets `supplied.resource: true`. `matcherContext.resource` is still `question.resource`, and `toPredicate` sets that to `undefined` (`Predicate.ts:659`). So an `Admitted<true>` stores two facts about the resource that disagree. This contradicts ADR-QD-172 D-02: "each fact is stored once and nowhere else".
- **The type lets it into the walk.** `Evaluation.admitted` is typed `Admitted`, which is `Admitted<boolean>`, and `Admitted<true>` is assignable to it. Nothing stops a row environment from entering `evaluateNode`.
- **What the walk does with it.** In `HasResourceAttribute`, `absenceOf(policy, supplied)` passes because `supplied.resource` is `true`. Then `resource ?? NO_RESOURCE` reads `{}`. The comment there, "`absenceOf` has ruled out an absent resource; the `??` is the type's", is false for this environment.
- **Reproduced.** I ran `evaluateNode(not(hasResourceAttribute("owner", eq(literal("u7")))), { admitted: <admit(q, "row")>, concurrency: undefined }, 0)` through tsx against the committed source:
  - With `"asked"`: `Fail(MissingResource)`.
  - With `"row"`: `{ allowed: true }`.
- **The fail-open case from the brief.** This is exactly "a resource leaf must fail `MissingResource`, never read `{}`", reached through a `supplied` that reads true when the question lacks a resource.
- **Who reaches it today.** `walk` is correct, because it passes `"asked"`. But `evaluateNode` is now exported (D-14). The repo's own new test, `WalkDepthGuard.test.ts:19`, already builds the walk's environment with `"row"`, and the types did not object.

**Fix:** Index the environment by its row source, not by a boolean, so the walk's parameter names the one source it accepts. Also make the leaf fail closed instead of defaulting to `{}`:

```ts
// Admission.ts
export class Admitted<Source extends RowSource = RowSource> {
  constructor(
    readonly source: Source,
    readonly subject: AuthSubject,
    readonly supplied: Supplied<Source extends "row" ? true : boolean>,
    readonly matcherContext: MatcherContext,
    readonly maxDepth: number,
  ) {}
}
// overloads: "row" -> Admitted<"row">, "asked" -> Admitted<"asked">

// Walk.ts
interface Evaluation {
  readonly admitted: Admitted<"asked">;
  readonly concurrency: Concurrency | undefined;
}

// Walk.ts, HasResourceAttribute: no `{}` default
if (resource === undefined) return Effect.fail(new MissingResource({ attribute: policy.attribute }));
```

Then change `WalkDepthGuard.test.ts:19` to `"asked"`, and add a tstyche negative showing that `admit(q, "row").success` is not assignable to `Parameters<typeof evaluateNode>[1]["admitted"]`. If the `source` field is unwanted, a phantom brand per source does the same job.

### WR-02: `Admitted` no longer binds the policy it admitted, so the "proof" no longer covers what is walked

**File:** `packages/core/src/Admission.ts:53-64`, `packages/core/src/Predicate.ts:345-346`, `packages/core/src/Predicate.ts:360`, `packages/core/src/Walk.ts:880`

**Issue:**
- **What the proof used to cover.** At the base, `Admitted.question.policy` was the policy whose depth `admit` had checked. `compileTree` and `walk` both walked that policy, so holding an `Admitted` proved that the tree being walked was no deeper than `maxDepth`.
- **What changed.** The `question` field is gone (D-13). The policy now travels beside the proof, as `compileTree(policy, admitted)` and `evaluateNode(question.policy, ...)`. Nothing ties the two together.
  - Today both call sites pass the policy they admitted (`Predicate.ts:659,674`, `Walk.ts:878-880`), so the behaviour is correct.
  - But nothing in the types stops an `Admitted` from one policy being paired with a deeper one.
- **Why it matters for `compileTree`.** It has no per-node depth guard; it relies on admission. A mismatched pair would recurse without bound on hostile decoded input, the exact case `maxDepth` exists for.
- **The proof is also only structural.** `Admitted` has no private member or brand, and its constructor is public. So any object literal `{ subject, supplied, matcherContext, maxDepth }` typechecks as an `Admitted`. "Only `admit` builds one, so holding one is the proof" (`Admission.ts:57`) is therefore not enforced. This was already true at the base, but the claim matters more now that `supplied` and `maxDepth` live in the class.
- **A stale comment.** `compileTree`'s doc (`Predicate.ts:345-346`) still says the tree's depth is decided "by the `{@link Admitted}` proof it demands". It no longer is.

**Fix:**
- **Bind the policy back in.** Give `Admitted` a `readonly policy: Policy`, the root policy, which is not the question. Have `walk` start from `admitted.policy` and `compileTree` read `admitted.policy`, so the depth proof and the tree it covers cannot be separated. Recursion keeps passing child policies, so the hot path is unchanged.
- **Make the proof nominal.** Add a module-private brand so a structural literal no longer typechecks:
  ```ts
  declare const admittedBrand: unique symbol;
  export class Admitted<...> { declare private readonly [admittedBrand]: true; ... }
  ```
- **If the owner keeps the four-field shape (D-13).** At minimum, correct `Predicate.ts:345-346` to say that depth is proved for the policy passed to `admit`, and that callers must pass that same policy.

## Info

### IN-01: Unreachable `throw` in the `WalkDepthGuard.test.ts` environment helper

**File:** `packages/core/test/WalkDepthGuard.test.ts:20-21`

**Issue:** `assert.isTrue(Result.isSuccess(admitted))` throws an `AssertionError` before the next line runs, so `if (Result.isFailure(admitted)) throw admitted.failure;` never executes. It serves only to narrow the type. It does not hide a failure, because the assertion fires first. But it is a second, unreachable failure path, and it throws a domain error rather than an assertion error.

**Fix:** Use the narrowing form the sibling test already uses (`Admission.test.ts`: `return Result.isSuccess(admitted) ? admitted.success : undefined`), or keep just one of the two lines. Switch the row source to `"asked"` as WR-01 describes.

### IN-02: The tstyche tuple pin is partly tautological, and nothing pins which row source the walk accepts

**File:** `packages/core/test/WalkEnvironment.tst.ts:13-22`

**Issue:**
- **The tautology.** `Environment` is defined as `Recursion[1]`. So in `toBe<[policy: Policy, request: Environment, depth: number]>()`, the middle position compares the parameter with itself. The useful pins are the length (`3`), `number` not assignable both ways, and `Environment["admitted"]` being `Admitted`.
- **The missing pin.** No assertion stops a row-sourced environment (`Admitted<true>`) from entering the walk. That is the gap WR-01 exploits.

**Fix:** Pin the environment against a named type, not against itself, for example `expect<Environment>().type.toBe<{ readonly admitted: Admitted<"asked">; readonly concurrency: Concurrency | undefined }>()` once WR-01 lands. Then add `expect<Admitted<"row">>().type.not.toBeAssignableTo<Environment["admitted"]>()`.

---

_Reviewed: 2026-11-19T05:37:36Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
