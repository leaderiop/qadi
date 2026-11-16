---
phase: QD-50-what-a-leaf-needs-from-the-request-stated-once
reviewed: 2026-11-16T15:00:00Z
depth: standard
files_reviewed: 20
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
  warning: 3
  info: 5
  total: 8
  necessity: 1
status: issues_found
---

# Phase QD-50: Code Review Report

**Reviewed:** 2026-11-16T15:00:00Z
**Depth:** standard
**Files Reviewed:** 20 (the 18 source/spec files plus the two committed bench tools)
**Status:** issues_found

## Summary

I reviewed the behaviour of `LeafNeeds.ts` against the base diff for every leaf arm in `Walk.ts`, `Predicate.ts` and `PortAccess.ts`. I also reviewed the characterisation and table tests, the two bench tools, and the ADR/BEH/INV/CCR claims. The source change holds up.

- **Base equivalence.** `absenceOf` reproduces the base's per-leaf order: HasAction's action first, HasResourceAttribute's resource then the matcher's action, HasAttribute's action then resource.
- **Short-circuit.** `referencesAction` and `referencesResource` run only when the input is absent.
- **`Supplied<true>` overload.** It is sound without a cast: a `Resource` absence needs `!supplied.resource`.
- **`errorOf`.** It is total through `Match.tagsExhaustive`. `MissingAction` omits `expected` when there is none (D-08a), and `readScoped` builds the same `MissingResourceId` after the port span annotation.
- **Reason sentences.** The `HasRole`, `HasPermission` and `HasAction` sentences in `Walk.ts` are textually unchanged.
- **Barrel.** Nothing from the module is reachable from the package root.
- **Walk's `Evaluation`.** `supplied` has a single construction site (`walk()`), so it cannot go stale against `resource` and `action`.
- **Checks run.** The three affected test files pass (121 tests) and `scripts/check-house-style.mjs` is clean (536 files, 3 declared switches). I did not typecheck, because `tsc -b` printed nothing. The oracle in `LeafFixtures.ts` and `LeafMatrix.test.ts` imports neither `LeafNeeds` nor `leafTags`. It uses `P.leafCases` for its tag list.
- **Bench and mutation numbers.** The ADR's two 35-row tables match `bench/gate/analysis.tsv` and `bench/after/analysis.tsv` cell for cell, including the load-average ranges, the 0.7-point-inside-band remark and the next-worst rows. The mutation counts (Walk 307/323 to 292/308, 64 to 42 detected inside the arms, LeafNeeds 52/53, PortAccess 47, Predicate 293) match the JSONs.
- **Bench analysis.** `analyze.mjs` implements D-03a as written: median of per-run minima, band = max(10%, (max-min)/median of the reference minima), strict `>`, and loud refusal on missing runs, rounds below 3, key mismatch or `success !== true`.

The defects are a type-level hole in the table, a signal-handling bug in `ab.sh`, and normative text that overstates what the code does. The five Info items are smaller.

## Warnings

### WR-01: A mis-specified `LeafNeeds` row is accepted by the compiler and fails open

**File:** `packages/core/src/LeafNeeds.ts:35-60` and `:90-113`

**Issue:** The claim "a new leaf is a compile error until it has a row" holds only for a missing row. Nothing ties a row's content to the leaf's shape. `LeafNeed`'s three fields are independent, and `absenceOf` reads the leaf's `matcher` and `attribute` through two type guards that trust the table.

- **`isMatcherLeaf`.** It returns `LEAF_NEEDS[leaf._tag].matcher`, and the whole matcher branch, including `own === "Resource"`, sits inside that guard. A future leaf that reads the resource itself but has `matcher: false` is silently never checked. `own: "Resource"` is accepted by `satisfies` and ignored. The absent resource then reads as an ordinary denial, which is the INV-QD-011 failure this table exists to prevent.
- **`matcher: true` on a leaf with no matcher.** The guard's cast makes `leaf.attribute` and `leaf.matcher` read as defined. The result would be `{ _tag: "Resource", attribute: undefined }` or a `TypeError` inside `referencesAction`.
- **`isActionLeaf`.** It is the same pattern: `own: "Action"` on a non-`HasAction` leaf would yield `expected: undefined`.

Nothing at compile time or in `LeafMatrix` catches this for a new leaf unless its author also writes a fixture with the right `refs`.

**Fix:** Make the row type depend on the leaf, so the type predicates are no longer needed:

```ts
type MatcherTag = MatcherLeaf["_tag"];
type RowFor<K extends LeafTag> = K extends MatcherTag
  ? { own: "Nothing" | "Resource"; matcher: true; resourceId: ResourceIdNeed }
  : K extends "HasAction"
    ? { own: "Action"; matcher: false; resourceId: ResourceIdNeed }
    : { own: "Nothing"; matcher: false; resourceId: ResourceIdNeed };
// ... as const satisfies { readonly [K in LeafTag]: RowFor<K> }
```

Or drop the two guards and discriminate on `leaf._tag === "HasAction"` and `"matcher" in leaf`, which is what the guards already assert and which the compiler can check.

### WR-02: `ab.sh` does not stop on INT/TERM; it reverts, then carries on benching

**File:** `.planning/phases/QD-50-what-a-leaf-needs-from-the-request-stated-once/bench/ab.sh:62` and `:66-81`

**Issue:** `trap cleanup EXIT INT TERM` runs `cleanup` on a signal, but a trap handler for INT or TERM does not end the script in bash.

- **What I reproduced.** I ran a minimal copy of the pattern (`trap ... EXIT; trap ... INT TERM` around a loop of `sleep 2`) and sent `kill -TERM` to the script. It printed `cleanup sig`, then continued with the remaining iterations, and exited 0.
- **What that means here.** A `kill` of `ab.sh` during a candidate run reverts the patch after the current bench finishes, then proceeds to the next arm and re-applies the patch. The user's "stop" is not honoured, and an ongoing run writes into `$OUT`. The script's own header promises that nothing is left applied. After a signal it reverts and then re-applies the patch for the next arm, so that promise holds only for the first stop.
- **Silent failure.** `cleanup` also ignores a failing `git apply -R`.

**Fix:**

```bash
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
```

so the signal ends the script and the EXIT trap does the revert. Check the revert result: `git apply -R "$PATCH" || echo "ab.sh: could not revert $PATCH" >&2`.

### WR-03: BEH-QD-586 and INV-QD-346 state a `HasAttribute` outcome the code does not give

**File:** `spec/behaviors/10-actions.md` (BEH-QD-586 REQUIREMENT, "`HasAttribute` (which owns neither) with `MissingAction`") and `spec/invariants.md` (INV-QD-346 Implication, "a request missing both the action and the resource fails ... `HasAttribute` with `MissingAction`")

**Issue:** Both sentences are unconditional, and both are wrong in two cases, as `LeafFixtures.ts` shows.

- **A matcher that references nothing.** `HasAttribute[no ref]` with neither input does not fail at all. It gives its settled `Allow` (fixture `HasAttribute[no ref]`).
- **A matcher that references the resource.** `HasAttribute[ref resource]` and `HasAttribute[nested ref resource]` give `MissingResource:department` in `evaluate`, because `absenceOf` asks the action only when `referencesAction` is true. The oracle row is `refs === "resource" && !resource -> Resource:name`.

The REQUIREMENT block is normative (AGENTS.md §11, spec is authoritative), and a reader implementing from it would build the wrong thing.

**Fix:** Qualify both. For example: "`HasAttribute` (which owns neither) with `MissingAction` when its matcher references the action, `MissingResource` when it references the resource, and no failure when it references neither."

## Info

### IN-01: ADR-QD-163's Context misdescribes the base's errors

**File:** `spec/decisions/163-what-a-leaf-needs-from-the-request-is-stated-once.md:21-22`

**Issue:** The Context says `HasAttribute` and `HasResourceAttribute` each tested `action === undefined && referencesAction(policy.matcher)` "and each built `new MissingResource(...)`". On the base (`git show 5ab8d0c0:packages/core/src/Walk.ts`) the action check built `MissingAction({})`. `MissingResource` came from the resource check. This is a history record, so precision matters.

**Fix:** "...each built `new MissingAction({})` from the action test and `new MissingResource(...)` from the resource test".

### IN-02: `LeafNeeds.test.ts`'s header is stale

**File:** `packages/core/test/LeafNeeds.test.ts:6-10`

**Issue:** The header says "Written before `LeafNeeds.ts` exists, so it is RED by import (D-14)". The module exists now and the sentence describes a commit, not the file. The test also derives one expectation from the table under change: `LEAF_NEEDS[f.policy._tag].own === "Nothing"` at line 74 selects which fixtures must give no absence. The fixture's own `f.own` is the independent source, and the oracle test already covers the same cells, so this only weakens that one test.

**Fix:** Drop the RED sentence. Use `f.own === "Nothing"` at line 74.

### IN-03: The agreement property and the `HasAction` deny sentence are thinner than BEH-QD-586/589 claim

**File:** `packages/core/test/LeafMatrix.test.ts:106-118` and `packages/core/test/LeafFixtures.ts:81-96`

**Issue:** D-11 asked for a property that `Walk` and `toPredicate` agree wherever both apply. The last matrix test compares labels only when one side starts with `Action:`. A `toPredicate` constant that disagrees with `evaluate`'s allow or deny is never compared. `f.settled` and `f.compiled` are each hand-copied from base runs and never related to each other.

BEH-QD-589 says `evaluate`'s reason sentences "MUST be unchanged". The matrix has no `HasAction` deny cell: the only fixture is `hasAction("read")` and the only action supplied is `"read"`. The sentence `action is 'x', not 'read'` is pinned only by `Evaluate.test.ts:1346`, which uses `assert.include` on the two quoted names, not byte equality. The code is unchanged and correct, so this is a test-strength gap and not a defect.

**Fix:** Add a `HasAction("write")` fixture (settled `Deny: action is 'read', not 'write'`, compiled `False`). In the agreement test, also assert `settled === "Allow"` iff `compiled` is a `True` predicate, for the leaves whose compiled form is a constant.

### IN-04: The leaf-heavy workloads never read the references they are described as measuring

**File:** `packages/core/bench/Evaluate.bench.ts:330-374` and ADR-QD-163 "The two leaf-heavy rows..."

**Issue:** The comment calls `leafHeavyPlain` "the control for `leafHeavy`, so the cost of reading the references is told from the cost of the arms". The request supplies both inputs. `absenceOf` therefore never evaluates `referencesAction` or `referencesResource` in either workload, because of the short-circuit that is part of the design. Both workloads execute the same path and differ only in the matchers' own cost.

The bench file comment ("the checks are on the hot path whether or not they fire, and the failing path is not the one measured") states this. The ADR sentence "The change costs about the same whether the matcher references the action and resource or not, which is the cost of the table read" does not follow: it measures the table read, not the matcher walk. The matcher walk is not measured, and that is acceptable only because it runs solely on the failing path.

**Fix:** Reword the ADR sentence to "the two workloads take the same path (both inputs supplied, so no reference is walked), and so the delta is the table read". Alternatively, add a third workload with the action absent on a failing leaf.

### IN-05: `LeafNeed.resourceId` has no reader in source

**Category:** necessity

**File:** `packages/core/src/LeafNeeds.ts:34-37` and `:51-60`

**Issue:** `/usr/bin/grep -rn "\.resourceId"` over `packages/*/src` finds no reader of `LEAF_NEEDS[...].resourceId`. Its only consumer is the D-06 test in `LeafNeeds.test.ts:116`. The column cannot say which scope a `ByScope` leaf takes (the fixtures' `scoped` flag does), and `readScoped` enforces it independently. It is a documented fact the test ties to behaviour. D-06 and BEH-QD-588 require it, so this is a note and not a defect.

**Fix:** None required. If BEH-QD-588's "MUST state" is kept, say in the `LeafNeed` doc that the field is declarative and enforced only by `LeafNeeds.test.ts`, so a reader does not assume `readScoped` consults it.

---

_Reviewed: 2026-11-16T15:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
