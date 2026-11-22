---
phase: QD-59-admission-produces-the-one-walk-environment
reviewed: 2026-11-19T06:18:41Z
depth: standard
iteration: 3
files_reviewed: 7
files_reviewed_list:
  - packages/core/src/Admission.ts
  - packages/core/src/Walk.ts
  - packages/core/src/Predicate.ts
  - packages/core/test/Admission.test.ts
  - packages/core/test/WalkDepthGuard.test.ts
  - packages/core/test/WalkEnvironment.tst.ts
  - packages/core/test/Evaluate.test.ts
findings:
  critical: 0
  warning: 2
  info: 1
  total: 3
  necessity: 0
status: issues_found
---

# Phase 59: Code Review Report (iteration 3)

**Reviewed:** 2026-11-19T06:18:41Z
**Depth:** standard
**Files Reviewed:** 7 (`Evaluate.test.ts` for its one changed comment only)
**Status:** issues_found

## Summary

I reviewed `git diff 83cbd5c5 HEAD` for each file, and fix commit `1ac8bccc` on its own. I also re-ran the tests:
- `vitest --project core` on `Admission.test.ts`, `WalkDepthGuard.test.ts` and `RolesAndDepth.test.ts`: 52 of 52 pass.
- `tstyche` on `WalkEnvironment.tst.ts`: 4 tests and 18 assertions pass.
- `oxlint` on the changed files: clean.

**The iteration-2 fixes hold.**
- **WR-01 is fixed.** `RESOURCE_SUPPLIED` and the overload are gone. `SUPPLIED` is typed `{ [Source in RowSource]: (question) => SuppliedBy[Source] }`, and `admit` is one generic signature. I compiled a standalone reproduction with `tsc --strict`: a `row` entry returning `resource: false` fails with TS2322, as claimed.
- **IN-01 is fixed.** The `Evaluate.test.ts:1448-1451` comment now says the context is built by `admit` and read from `request.admitted`.
- **IN-02 is fixed.** The `Admission.ts` header lists "the policy it admitted". The tstyche title names all six fields.

**Clean on the points in the brief.**
- **Divergence.** Depth, action, subject and resource come from one `admit` in both interpreters. `compileTree` walks `admitted.policy`. `toPredicate` still sets `resource: undefined` before admitting (`Predicate.ts:660`).
- **Hot path.** `admit` runs once per walk, inside `Effect.suspend` (`Walk.ts:876-880`). A cache hit never reaches it.
- **Stale docs in the source files.** Nothing still mentions the six-argument tuple, `Admitted.question` or a `supplied` built in `walk` or `compileTree`.
- **The `WalkDepthGuard.test.ts` helper.** If admission fails, `Result.getOrThrow` throws a defect, which `Effect.flip` does not turn into a pass. So the helper cannot hide a failure. The `> ` to `>=` mutant is killed by the at-the-bound test.
- **House rules.** No `as`, `!`, `any`, new `switch` or `Record<string, unknown>`. `effect` imports are namespace imports, and type-only imports use `import type`.

**What is left.** Both warnings are about claims rather than behaviour.
- **WR-01.** The iteration-2 fix states a type guarantee in two places that holds in only one direction, and the missing direction is the fail-open case.
- **WR-02.** The fix renamed the table and removed the overload, but the normative spec documents outside ADR-QD-172 still name both.

I read `necessity-review.md`. No finding qualifies.

## Narrative Findings (AI reviewer)

## Warnings

### WR-01: The fail-open direction, an `"asked"` row claiming a resource, is not type-checked, though the source doc and ADR-QD-172 say it is

**File:** `packages/core/src/Admission.ts:54-63`, `packages/core/src/Admission.ts:104-112`, `spec/decisions/172-admission-produces-the-one-walk-environment.md:55-57`

**Issue:**
- **The two claims.**
  - `SUPPLIED`'s doc says: "Each row is checked against its `SuppliedBy` type, so a row that claims a resource it does not have does not compile."
  - ADR-QD-172 Decision 3 says: "a `"row"` row that stops supplying the resource, or an `"asked"` row that claims one, fails with TS2322."
- **The second half of the ADR claim is false.** `SuppliedBy.asked` is `Supplied`, whose `resource` is `boolean`, and the literal `true` is assignable to `boolean`. I compiled the following with the repo's `tsc --strict`, and it exits 0. I also bound `asked: SUPPLIED.row`, and that compiles too.
  ```ts
  asked: (question) => ({ action: question.action !== undefined, resource: true }),
  ```
- **This is exactly the fail-open case in the brief.**
  - `supplied.resource` is computed in `SUPPLIED.asked` (line 60).
  - `matcherContext.resource` is copied from `question.resource` separately (line 110).
  - If the two disagree, `absenceOf` passes a `HasResourceAttribute` leaf, and `Walk.ts:359` reads `resource ?? NO_RESOURCE`. The leaf then judges `{}` instead of failing with `MissingResource`.
  - The type system does not guard this. Only runtime tests do: `Admission.test.ts` E2 and E4, and `LeafMatrix.test.ts`. They do catch it today, but the docs tell a maintainer the compiler is the guard.
- **The type pins do not cover it either.** `WalkEnvironment.tst.ts` checks that an asked `supplied.resource` is `boolean`. It cannot tell a correct row from one that always says `true`.

**Fix:** At minimum, make the claims true.
- Change the `SUPPLIED` doc to: "Each row is checked against its `SuppliedBy` type, so a `"row"` row that stops supplying the resource, or a row source without a row, does not compile. The `"asked"` row's boolean is a runtime fact, pinned by `Admission.test.ts` E1–E4."
- Change ADR-QD-172 Decision 3 to drop "or an `"asked"` row that claims one".

Optionally, remove the second source of truth, so that `supplied.resource` and `matcherContext.resource` cannot disagree. Build the context first and derive the asked row from the stored value:

```ts
const SUPPLIED: { readonly [Source in RowSource]: (context: MatcherContext) => SuppliedBy[Source] } = {
  asked: (context) => ({ action: context.action !== undefined, resource: context.resource !== undefined }),
  row: (context) => ({ action: context.action !== undefined, resource: true }),
};
// in admit: const matcherContext = { … }; … SUPPLIED[rowSource](matcherContext), matcherContext, …
```

### WR-02: `spec/invariants.md`, `spec/traceability.md` and ADR-QD-163 still name `RESOURCE_SUPPLIED` and the `"row"` overload, which iteration 2 removed

**File:** `spec/invariants.md:4239`, `spec/invariants.md:4241`, `spec/traceability.md:58`, `spec/traceability.md:196`, `spec/decisions/163-what-a-leaf-needs-from-the-request-is-stated-once.md:292`, `spec/decisions/163-what-a-leaf-needs-from-the-request-is-stated-once.md:294`

**Issue:** Fix commit `1ac8bccc` renamed `RESOURCE_SUPPLIED` to `SUPPLIED` and deleted the `"row"` overload, but it updated only ADR-QD-172. The other spec documents still name both:
- **INV-QD-364.** The statement says "`admit` computes both from one closed table, `RESOURCE_SUPPLIED`". Its **Source** line names `RESOURCE_SUPPLIED`, a symbol that no longer exists in `Admission.ts`.
- **`traceability.md`.** Row 58 names "`RESOURCE_SUPPLIED`'s `"row"`" for BEH-QD-633. Row 196 says "`RESOURCE_SUPPLIED` is one closed row per `RowSource`".
- **ADR-QD-163's 2026-11-19 amendment.** It says "`admit` builds `supplied` once from the row source (`RESOURCE_SUPPLIED`)". It also says the resource is supplied "through `admit`'s `"row"` overload". That is the cast pattern ADR-QD-172 now lists as rejected.

`spec/` is normative (AGENTS.md §11), and an invariant's Source line that points at a nonexistent symbol is the drift this repo gates against elsewhere.

**Fix:**
- In `invariants.md:4239,4241` and `traceability.md:58,196`, replace `RESOURCE_SUPPLIED` with `SUPPLIED`.
- In ADR-QD-163:292, do the same. In ADR-QD-163:294, change "through `admit`'s `"row"` overload (`Admitted<"row">`)" to "through `admit`'s `"row"` row source (`Admitted<"row">`, `SUPPLIED`'s `row` row typed `Supplied<true>`)".

To confirm nothing else is left:

```
/usr/bin/grep -rn "RESOURCE_SUPPLIED\|\"row\"\` overload" spec packages
```

## Info

### IN-01: "Only `admit` builds one" is a convention, and the public six-field constructor makes the proof's invariants easy to break

**File:** `packages/core/src/Admission.ts:66-87`

**Issue:**
- **The claim.** `Admitted`'s doc says "Only `admit` builds one, so holding one is the proof, and the policy rides with it so the proof cannot be paired with a deeper tree."
- **Nothing enforces it.** The constructor is public. Any module in core can write `new Admitted("asked", deeperPolicy, subject, { action: false, resource: true }, ctxWithoutResource, 1)`, and it typechecks.
  - That breaks the depth proof: `policy` and `maxDepth` are independent arguments.
  - It also breaks the supplied-versus-context agreement from WR-01.
- **This is not a regression.** The public constructor dates from before this phase, the module is package-private, and today the only `new Admitted` is inside `admit`. But the phase raised the stakes, from two fields to six independently settable ones, and WR-02 of iteration 1 added `policy` precisely to make the pairing unforgeable.

**Fix:** Make the constructor private and build through a static factory inside the class, so the claim is enforced rather than remembered. `admit` would then call `Admitted.make(...)`, or become that static. Alternatively, soften the doc to "by convention only `admit` builds one".

---

_Reviewed: 2026-11-19T06:18:41Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
