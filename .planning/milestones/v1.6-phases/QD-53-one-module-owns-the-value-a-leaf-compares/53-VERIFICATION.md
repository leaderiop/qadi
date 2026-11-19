---
phase: QD-53-one-module-owns-the-value-a-leaf-compares
verified: 2026-11-18T06:35:00Z
status: passed
score: 4/4 must-haves verified
covered_files:
  - ".changeset/operand-read-in-one-place.md"
  - ".planning/phases/QD-53-one-module-owns-the-value-a-leaf-compares/53-01-PLAN.md"
  - ".planning/phases/QD-53-one-module-owns-the-value-a-leaf-compares/53-01-SUMMARY.md"
  - ".planning/phases/QD-53-one-module-owns-the-value-a-leaf-compares/53-02-PLAN.md"
  - ".planning/phases/QD-53-one-module-owns-the-value-a-leaf-compares/53-02-SUMMARY.md"
  - ".planning/phases/QD-53-one-module-owns-the-value-a-leaf-compares/53-03-PLAN.md"
  - ".planning/phases/QD-53-one-module-owns-the-value-a-leaf-compares/53-03-SUMMARY.md"
  - ".planning/phases/QD-53-one-module-owns-the-value-a-leaf-compares/53-04-PLAN.md"
  - ".planning/phases/QD-53-one-module-owns-the-value-a-leaf-compares/53-04-SUMMARY.md"
  - ".planning/phases/QD-53-one-module-owns-the-value-a-leaf-compares/53-05-PLAN.md"
  - ".planning/phases/QD-53-one-module-owns-the-value-a-leaf-compares/53-05-SUMMARY.md"
  - ".planning/phases/QD-53-one-module-owns-the-value-a-leaf-compares/53-06-PLAN.md"
  - ".planning/phases/QD-53-one-module-owns-the-value-a-leaf-compares/53-06-SUMMARY.md"
  - ".planning/phases/QD-53-one-module-owns-the-value-a-leaf-compares/53-07-PLAN.md"
  - ".planning/phases/QD-53-one-module-owns-the-value-a-leaf-compares/53-07-SUMMARY.md"
  - ".planning/phases/QD-53-one-module-owns-the-value-a-leaf-compares/53-08-PLAN.md"
  - ".planning/phases/QD-53-one-module-owns-the-value-a-leaf-compares/53-08-SUMMARY.md"
  - "packages/core/src/AttributeResolver.ts"
  - "packages/core/src/CustomPredicate.ts"
  - "packages/core/src/Decision.ts"
  - "packages/core/src/FieldPath.ts"
  - "packages/core/src/Matcher.ts"
  - "packages/core/src/Operand.ts"
  - "packages/core/src/PortAccess.ts"
  - "packages/core/src/Predicate.ts"
  - "packages/core/src/Walk.ts"
  - "packages/core/test/Operand.test.ts"
  - "packages/core/test/Predicate.test.ts"
  - "spec/decisions/166-one-module-owns-the-value-a-leaf-compares.md"
  - "spec/invariants.md"
covered_digest: "v4:sha256:1b88850e4907320d38c0aebdad70c886d95a258f194ad763f334479802ea02cf"
behavior_unverified: 0
overrides_applied: 0
---

# Phase 53: One module owns "the value a leaf compares" - Verification Report

**Phase Goal:** A decoded key is read as an own property by exactly one package-private module that every interpreter uses, so the reference interpreter `evaluatePredicate` can no longer allow a row that `evaluate` denies, and INV-QD-091's "cannot disagree by construction" holds for the operand read as well as for the verdict.
**Verified:** 2026-11-18
**Status:** passed
**Re-verification:** No, initial verification

## Goal Achievement

### Observable Truths (ROADMAP success criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | A regression test committed on the phase base is RED (`hasResourceAttribute("constructor", neq(literal("x")))` on `{ id: "r1" }`: `evaluate` denies, `evaluatePredicate` allows); GREEN after, both deny | VERIFIED | `837ffb6b` (RED tests only, 3 test files, 207 insertions) precedes the first src commit `1573cdbf`. I checked out `837ffb6b` in a throwaway worktree and ran `Predicate/Layers/CustomPredicate` tests: 4 fail, 120 pass (the four are the roadmap probe "a prototype-named column denies on both sides", the prototype-names agreement property, `attributeResolverFromRecord`, `customPredicateFromRecord`). The probe test (`Predicate.test.ts:1029`) uses exactly the roadmap policy and row. At HEAD the same tests pass (8 touched test files, 601 tests green). Worktree removed. |
| 2 | One package-private module beside `Compare.ts` owns the single-key and dot-path own reads; walk, port read, matcher refs, FieldMatch, `evaluatePredicate`, projection, `Decision.ts` read only through it; no other `Object.hasOwn` on a decoded key; mirroring comments gone | VERIFIED | `packages/core/src/Operand.ts` is import-free with `ownValue`, `isOwnKey`, `getByPath`; it is not in the barrel. Scoped grep of the eight reader files (`AttributeResolver, CustomPredicate, Decision, FieldPath, Matcher, PortAccess, Predicate, Walk`) for `Object.hasOwn` returns zero hits; the only `Object.hasOwn` in those files plus `Operand.ts` is in `Operand.ts` lines 32 and 42. Every reader imports from `./Operand.ts` (Walk:346 `ownValue`, PortAccess:351 `isOwnKey`/`ownValue`, Matcher FieldMatch `ownValueLocal`, `resolveRef` `getByPathLocal`, Predicate:166-167 `ownValueLocal` and :223 `getByPath`, FieldPath:333/335, Decision:345, AttributeResolver:233, CustomPredicate:291). The old bare `row[p.column]` is gone. The remaining "mirror" hits are unrelated prose (mirror-image, `NO_OBLIGATIONS`, `exceedsJsonDepth`) and none points at an own-property restatement. `isFieldOf` deleted. No bare-bracket decoded-key read remains in `packages/core/src` besides `DecodeDepthGuard`'s `Object.keys` walk. `pnpm circular` clean (part of `check:pr`). |
| 3 | Agreement property over `constructor`, `toString`, `__proto__`, `hasOwnProperty`, `valueOf` shows `evaluate` = `evaluatePredicate . toPredicate`; predicate-sql and predicate-prisma engine-agreement suites stay green | VERIFIED | `Predicate.test.ts:1121` "PROPERTY: the two interpreters agree on prototype names, row by row" enumerates every prototype-named leaf (columns, attributes, `a.constructor`, `__proto__.x` paths, FieldMatch fields), has non-vacuity assertions, and builds rows with `JSON.parse` so `__proto__` is an own key. RED on the base (above), GREEN at HEAD. The existing seeded agreement property is byte-identical. `pnpm exec vitest run --project predicate-sql --project predicate-prisma`: 8 files, 198 tests pass; the suites are not edited (`git diff 44510112 --stat` touches no predicate-* package file). |
| 4 | ADR-QD-166 extends ADR-QD-091 and ADR-QD-024; INV-QD-091 restated to cover the operand read; `SWITCH_BUDGET` switches unchanged | VERIFIED | `spec/decisions/166-...md` Rev 1.0, status "Accepted - extends ADR-QD-091, ADR-QD-024", indexed in `index.yaml`, with amendment pointers in 091 (Rev 1.2) and 024. `spec/invariants.md:2823` INV-QD-091 keeps its heading and now says both sides "read the value they compare as an own property", sources `Operand.ts`. INV-QD-351 and INV-QD-352 at :4061 and :4073. `scripts/check-house-style.mjs` and `AGENTS.md` have no diff vs `44510112`; `SWITCH_BUDGET` stays `Walk.ts: 1`, `Matcher.ts: 2`. Added src lines contain no `switch`, `as`, `!`, `any`, `fnUntraced`, `async`/`await`, `console` or `process.env`. |

**Score:** 4/4 truths verified (0 present-behavior-unverified)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `packages/core/src/Operand.ts` | Own-read module | VERIFIED | Substantive (three functions, header states the why once), wired from nine files, `getByPath` re-exported by `Matcher.ts` (`export { getByPath } from "./Operand.ts"`) so the public name and overview row are unchanged. |
| `packages/core/test/Operand.test.ts` | Pins for own, inherited, `__proto__`, boundaries, re-export identity | VERIFIED | Passes at HEAD. |
| `spec/decisions/166-*.md`, BEH-QD-601..605, INV-QD-351/352, traceability, CCR-QD-444 | Records | VERIFIED | Present in `04-matchers`, `16-predicates`, `06-services`, `32-custom-predicates`, `invariants`, `traceability`, `README` (Rev 1.247). Only the reserved ids are used; `pnpm spec:verify:strict` is inside `check:pr`. |
| `.changeset/operand-read-in-one-place.md` | `@qadi/core` patch, no Breaking | VERIFIED | Patch changeset, three fixes plus the class-instance-row note. |
| `53-mutation-base.json`, `53-mutation-after.json`, `53-mutation.mjs` | D-14 evidence | VERIFIED | `node 53-mutation.mjs compare` re-run by me prints "WX-05 holds (D-14)". |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `Predicate.ts` Compare/MemberOf | `Operand.ts` | `ownValueLocal(row, p.column)` | WIRED | the defect site |
| `Walk.ts` HasResourceAttribute, `PortAccess.ts` readAttribute | `Operand.ts` | `ownValue`, `isOwnKey` | WIRED | `readAttribute` keeps an own `undefined` distinct from no key (characterisation test GREEN before and after). |
| `Matcher.ts` resolveRef / FieldMatch | `Operand.ts` | `getByPathLocal`, `ownValueLocal` | WIRED | |
| `FieldPath.ts` projectAt, `Decision.ts` | `Operand.ts` | `isOwnKey`/`ownValue` | WIRED | |
| Both fixture builders | `Operand.ts` | `ownValue(table, name)` | WIRED | D-02: the two extra fail-open/defect sites also fixed. |

### Data-Flow Trace (Level 4)

Not applicable: pure functions with no rendered or fetched data.

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Prototype-named column denies on both sides, property agrees, fixtures answer correctly | `pnpm exec vitest run --project core` on Operand, Predicate, Evaluate, Layers, CustomPredicate, PortAccess, FieldPath, Matcher tests | 8 files, 601 passed | PASS |
| RED on the base | same tests in a worktree at `837ffb6b` | 4 failed, 120 passed in the three RED files | PASS (RED as required) |
| Engine agreement | `--project predicate-sql --project predicate-prisma` | 198 passed | PASS |
| D-14 mutation rule | `node 53-mutation.mjs compare` | Matcher.ts 0.9775 to 0.9749, detected 217 to 194 with survivors +0 -0, `Operand.ts` 31/31 detected, 23 mutants moved; CustomPredicate.ts rose (one survivor gone); "WX-05 holds (D-14)" | PASS |

### Probe Execution

SKIPPED: the phase declares no `probe-*.sh`.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| OPND-01 | 53-02, 53-03 | Regression RED on base, GREEN after | SATISFIED | RED reproduced in a worktree; GREEN at HEAD. |
| OPND-02 | 53-03 | One package-private module, single-key and dot-path own read | SATISFIED | `Operand.ts`. |
| OPND-03 | 53-03..05 | Every interpreter reads through it; no other `Object.hasOwn`; mirroring comments gone | SATISFIED | Scoped grep, truth 2. |
| OPND-04 | 53-02, 53-03, 53-05 | Prototype-name agreement property; engine suites green | SATISFIED | Truth 3. |
| OPND-05 | 53-07 | ADR-QD-166 extends 091 and 024; INV-QD-091 restated | SATISFIED | Truth 4. |
| WX-01 | 53-08 | `pnpm check:pr < /dev/null` green | SATISFIED for this phase | I re-ran it on the HEAD tree: all 16 steps ran, exit 0 (mutation step skipped by design). Milestone-wide, stays Pending. |
| WX-02 | 53-01, 53-07, 53-08 | ADR, CCR, BEH/INV/traceability with reserved numbers only | SATISFIED for this phase | ADR-QD-166, CCR-QD-444 ("Unused: none"), BEH-QD-601..605, INV-QD-351..352 present; `spec:verify:strict` green. Stays Pending. |
| WX-03 | 53-07 | `spec/overview.md` names added/dropped exports | SATISFIED for this phase | No export added or removed; `getByPath` row notes its new home; gate 13 green. Stays Pending. |
| WX-04 | 53-08 | Nothing forbidden added; budgets move only with AGENTS.md | SATISFIED for this phase | Scan of added src lines clean; no budget or AGENTS.md diff. Stays Pending. |
| WX-05 | 53-01, 53-06 | Coverage holds; touched-file Stryker score does not fall | SATISFIED for this phase | Coverage thresholds are in `check:pr` (green); D-14 compare re-run, see above. Stays Pending. |
| WX-06 | 53-01, 53-02 | Characterisation or RED test on the base before each behaviour change | SATISFIED for this phase | `d91fda67` (GREEN characterisation) and `837ffb6b` (RED) precede all src commits `1573cdbf` onward. Stays Pending. |
| WX-07 | 53-08 | Public breaks recorded Breaking; nothing released | SATISFIED for this phase | No public break; patch changeset only; no version-packages PR touched. Stays Pending. |

No orphaned requirements: the 12 IDs in ROADMAP match the 12 in the plans, and all appear in REQUIREMENTS.md (OPND-01..05 marked Complete, WX-01..07 correctly left Pending as milestone-wide).

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `packages/core/src/Matcher.ts`, `Operand.ts` | n/a | `isObject` declared twice (review IN-01) | Info | Two lines; `Operand.ts` is import-free by design. Disposition: skipped. |
| `PortAccess.ts`, `FieldPath.ts` | 351-352, 333-335 | `isOwnKey` then `ownValue` does two own-checks (IN-02) | Info | Keeps own-`undefined` distinct; no behavioural effect. |
| `Operand.ts` | header | "allocates nothing" wording (IN-03) | Info | Comment only. |
| `Predicate.ts` | n/a | Class-instance rows no longer read inherited getters (IN-04) | Info | Behaviour change stated in the changeset, matches `evaluate`. |

No `TBD`/`FIXME`/`XXX` in changed files; no stubs. Review disposition confirmed: WR-01 fixed in `09f16437` (test only), `packages/*/src` untouched afterwards, so `53-mutation-after.json` still describes the shipped source.

### Human Verification Required

None.

### Gaps Summary

No gaps. The one thing that could have been hollow, the RED-first claim, was reproduced independently. At `837ffb6b` the four RED tests fail with the base source; at HEAD they pass. No Operand-style own-property read remains outside `Operand.ts` in the eight reader files, and the full `check:pr` gate is green on this tree.

---

_Verified: 2026-11-18_
_Verifier: Claude (gsd-verifier)_
