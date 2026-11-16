---
phase: QD-50-what-a-leaf-needs-from-the-request-stated-once
reviewed: 2026-11-16T15:30:00Z
depth: standard
iteration: 2
files_reviewed: 21
files_reviewed_list:
  - .changeset/leaf-needs-stated-once.md
  - packages/core/bench/Evaluate.bench.ts
  - packages/core/src/LeafNeeds.ts
  - packages/core/src/PortAccess.ts
  - packages/core/src/Predicate.ts
  - packages/core/src/Walk.ts
  - packages/core/test/LeafFixtures.ts
  - packages/core/test/LeafMatrix.test.ts
  - packages/core/test/LeafNeeds.test.ts
  - packages/core/test/LeafNeeds.tst.ts
  - packages/core/test/Predicate.test.ts
  - spec/README.md
  - spec/behaviors/05-evaluator.md
  - spec/behaviors/10-actions.md
  - spec/behaviors/30-port-calls.md
  - spec/decisions/163-what-a-leaf-needs-from-the-request-is-stated-once.md
  - spec/decisions/index.yaml
  - spec/invariants.md
  - spec/traceability.md
  - .planning/phases/QD-50-what-a-leaf-needs-from-the-request-stated-once/bench/ab.sh
  - .planning/phases/QD-50-what-a-leaf-needs-from-the-request-stated-once/bench/analyze.mjs
findings:
  critical: 0
  warning: 2
  info: 2
  total: 4
  necessity: 0
status: issues_found
---

# Phase QD-50: Code Review Report (iteration 2)

**Reviewed:** 2026-11-16T15:30:00Z
**Depth:** standard
**Files Reviewed:** 21 (iteration 1's 20 plus the new `LeafNeeds.tst.ts`)
**Status:** issues_found

## Summary

I checked each iteration-1 fix against the source and re-read the phase's whole non-planning diff (`git diff 5ab8d0c0..HEAD -- . ':!.planning'`). The fixes are real, and nothing they touched broke the runtime. Two defects remain, both narrower than iteration 1's. Two Info items are minor.

**What holds.**
- **Runtime unchanged.** `absenceOf`, its check order and the emitted `LEAF_NEEDS` value are untouched by `d9ef8c34`, and the `LeafNeeds.ts` diff is type-level only. `LeafNeeds.ts` is not on the barrel (`grep LeafNeeds packages/core/src/index.ts` is empty).
- **No casts.** `LeafNeeds.ts` and `LeafNeeds.tst.ts` have no `as` other than `as const`, and no `!`, `any`, `switch` or `Record<string, unknown>`. `scripts/check-house-style.mjs` reports 536 files clean with 3 declared switches. `scripts/` is unchanged since the phase base, so no budget moved.
- **Frozen characterisation.** `LeafMatrix.test.ts` and `LeafFixtures.ts` have exactly one commit since the base, `f6322ff9` (50-02).
- **Checks run.**
  - `tstyche` on `LeafNeeds.tst.ts`: 4 tests and 13 assertions pass.
  - `vitest --project core` on `LeafNeeds`, `LeafMatrix` and `Predicate` tests: 123 pass.
  - `pnpm typecheck`: clean.
- **Interpreters against the base.** `Walk.ts`, `Predicate.ts` and `PortAccess.ts` equal the base per leaf.
  - `HasAttribute` checks the action, then the resource.
  - `HasResourceAttribute` checks its own resource, then the matcher's action.
  - `toPredicate` passes `Supplied<true>`, so it only ever sees action absences.
  - `errorOf` reproduces `MissingAction({})` with no `expected` key.
- **WR-03, IN-01 and IN-04 spec text.** BEH-QD-586 and INV-QD-346's qualified `HasAttribute` outcomes, ADR-QD-163 Rev 1.3's `MissingAction({})`, and Rev 1.4's description of the leaf-heavy pair all match the fixtures and the code. Both `leafHeavy` workloads supply both inputs through `leafRequest`, so `absenceOf` returns before it walks a reference. A matcher holds at most one reference (`Matcher.ts:80-91`), so the "at most one reference" remark is true.
- **CCR-QD-441 row.** It lists every revision the fixes made: ADR Rev 1.1 to 1.4, `05-evaluator` Rev 1.12 and 1.13, `10-actions` Rev 1.3, invariants Rev 1.143 and 1.144, traceability Rev 1.208 and 1.209, and README Rev 1.228 to 1.232. It also lists `LeafNeeds.tst.ts`. No id was added.
- **IN-02 and IN-03.** The agreement property reads `f.own`/`f.refs` from the fixtures, not from the table. The pinned strings (`Deny: action is 'read', not 'write'`, the `True`/`False` constants, `18`) are literals, not derived from the code under test.
- **`bench/analyze.mjs`.** I did not re-review it. It is unchanged since iteration 1.
- **Necessity.** I did not read `necessity-review.md`. The only candidate is iteration 1's IN-05, a necessity note already resolved by D-06, so `necessity` is 0.

## Warnings

### WR-01: `LeafNeedOf`'s `own` is derived from two hard-coded tag names, not from the variant, so the guarantee the spec states does not hold for a new leaf

**File:** `packages/core/src/LeafNeeds.ts:56-63`. The overstated text is in `spec/invariants.md` (INV-QD-345 Source and Implication), `spec/decisions/163-what-a-leaf-needs-from-the-request-is-stated-once.md` (Decision 1) and `packages/core/test/LeafNeeds.tst.ts:1-8`.

**Issue:** `LeafNeedOf<K>["matcher"]` is genuinely derived from the variant's shape: it is `true` iff the variant has a `matcher: Matcher` field. `["own"]` is not. A leaf's type does not say which input it reads. `own` is `"Action"` iff the variant is the literal `HasAction`, `"Resource"` iff it is the literal `HasResourceAttribute`, and `"Nothing"` for every other tag, including a tag that does not exist yet. So:

- **The fail-open WR-01 closed is still open.** A future leaf that reads the action or the resource itself and has no `matcher` (say `HasActionIn { actions }`) gets `own: "Nothing"` from `LeafNeedOf`. The row `{ own: "Nothing", matcher: false, ... }` compiles. `absenceOf` then never reports the absence, and a request without an action reads as an ordinary denial or allow. That is the INV-QD-011 failure the table exists to prevent. Writing the correct `own: "Action"` is the one that fails, TS2322, and the author is sent to edit `LeafNeedOf`.
- **The same holds for a matcher leaf.** A new matcher leaf that reads the resource itself compiles with `own: "Nothing"`. The `matcher` derivation then makes its check fire, but only after the matcher's references, not before.
- **What the spec says.** It says a row whose `own` "disagrees with its leaf's variant MUST be a compile error" and that `own` "is the input its variant reads itself". That is true of the two named variants only. The test names ("own is the input the variant reads itself", "every row of the table is its leaf's") read the same way, but the assertions are only for four existing tags.
- **The real guard.** For a new leaf it is `LeafMatrix`'s fixture-per-tag check, and that depends on the author writing `own` correctly on the fixture. The spec does not say so.

**Fix:** Make the default fail closed, so a new tag has to be classified. List the tags that read nothing:

```ts
type ReadsNothing =
  | "HasPermission" | "HasRole" | "HasAttribute" | "HasRelationship"
  | "HasActed" | "HasNotActed" | "HasCustom" | "HasSignature";

export type LeafNeedOf<K extends LeafTag> = LeafNeed & {
  readonly own: K extends "HasAction" ? "Action"
    : K extends "HasResourceAttribute" ? "Resource"
    : K extends ReadsNothing ? "Nothing"
    : never;
  // matcher unchanged
};
```

A new leaf then makes every row for it TS2322 until someone adds it to one of the three lists. This needs no runtime change and no re-measurement, because the type is erased. Add one `.tst.ts` assertion that `LeafNeedOf<LeafTag>["own"]` is not `never`, and extend the `tst.ts` header to say `own` is classified by tag. Alternatively, reword INV-QD-345, ADR-QD-163 and the test header to "`own` is checked against the two variants that name an input; for a new leaf the fixture matrix is the guard". Do not leave the claim as it is.

### WR-02: `ab.sh` can leave the prototype applied when a signal lands during `git apply`, and a signal during a failing revert loses the message

**File:** `.planning/phases/QD-50-what-a-leaf-needs-from-the-request-stated-once/bench/ab.sh:51-59` and `:68-71`

**Issue:** Bash runs a trap only after the foreground command returns. `applied=1` is set on the line after `git apply "$PATCH"`.

- **The race.** A signal that arrives while `git apply` is running runs the trap right after it returns. The trap runs `exit 130` (or `143`) before `applied=1`, so the EXIT trap's `cleanup` sees `applied=0` and does nothing. `packages/core/src` is left patched, with exit 130 and no message. The header promises "src reverted" on a signal exit.
- **How I reproduced it.** A copy of the pattern with `sleep 2 && echo ...` standing in for `git apply` and `applied=1` on the next line. I sent `SIGTERM` at 0.7s. It exited 143, never printed the follow-on echo, and printed no `REVERT`.
- **Likelihood.** The window is one `git apply` (tens of ms) in every bench round, so it is small. The effect is the thing the WR-02 fix set out to remove: a silently patched tree. The next `ab.sh` run refuses to start on a dirty `src` (line 29), so the error is detectable but not announced.
- **The mirror case.** A signal during `cleanup`'s `git apply -R`. `applied=0` is already set. The trap runs `exit 130` before the `||` branch evaluates, so a failing revert is reported as 130, not as 5 with its message.

**Fix:** Set the flag before the command and clear it on failure, and make the final state check unconditional in the EXIT path:

```bash
applied=1
git apply "$PATCH" || { applied=0; echo "ab.sh: patch no longer applies before $arm-$i" >&2; exit 3; }
```

and have `cleanup` finish with `src_clean || { echo "ab.sh: $SRC is not clean after exit" >&2; exit 5; }`, so an exit by a signal in either window still ends non-zero with the message.

## Info

### IN-01: A comment the ADR calls inaccurate is left in the committed bench file

**File:** `packages/core/bench/Evaluate.bench.ts:354-358` and ADR-QD-163 (the leaf-heavy paragraph, Rev 1.4)

**Issue:** The `leafHeavyPlain` doc comment says the pair is "the control for `leafHeavy`, so the cost of reading the references is told from the cost of the arms". ADR-QD-163 Rev 1.4 now says it is not: both workloads supply both inputs, so no reference is read. The ADR states that the comment "is left as measured because a change to that file would no longer be the file the committed runs measured". A comment change alters no executed code. The `ab.sh` runs record `head` and the patch sha, not a hash of the bench file. `D-01` freezes the workloads and `absenceOf`'s runtime, not comment text. A source file that contradicts the decision record is a standing trap for the next reader.

**Fix:** Edit the comment to "the same eight tags and the same request, with matchers that reference neither input: both workloads take the same path (no reference is walked), so the delta they share is the table read". It needs no re-measurement, because no executable token changes.

### IN-02: Two names say "every row is its leaf's", but `resourceId` is not tied to the leaf at compile time

**File:** `packages/core/test/LeafNeeds.tst.ts:54` and `packages/core/src/LeafNeeds.ts:44-45`

**Issue:** `LeafNeedOf` constrains `own` and `matcher` only; `resourceId` stays the free union `"Never" | "Always" | "ByScope"`. The tst title "every row of the table is its leaf's" and the `LeafNeed.resourceId` comment ("which `readScoped` enforces") read as if the whole row were checked. The `resourceId` column is tied to behaviour only by the runtime D-06 test in `LeafNeeds.test.ts`, and nothing in `packages/*/src` reads it (iteration 1 IN-05, resolved as D-06). The spec text itself is accurate here: INV-QD-345 says "own or matcher".

**Fix:** Retitle the tst case "every row's own and matcher are its leaf's", and give `LeafNeed.resourceId` a doc line saying it is declarative and pinned by `LeafNeeds.test.ts`, not by the type, and not read by `readScoped`.

---

_Reviewed: 2026-11-16T15:30:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
_Iteration: 2_
