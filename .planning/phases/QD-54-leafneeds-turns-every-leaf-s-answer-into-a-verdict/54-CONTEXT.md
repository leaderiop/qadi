# Phase 54: LeafNeeds turns every leaf's answer into a verdict - Context

**Gathered:** 2026-11-18
**Status:** Ready for planning

<domain>
## Phase Boundary

Every leaf's answer-to-verdict step is stated once, in package-private `packages/core/src/LeafNeeds.ts`, finishing ADR-QD-163. The two interpreters keep only their own concerns: `Walk.ts` keeps its reason sentences, and `Predicate.ts` (`toPredicate`) keeps only planning and constant folding.

The live duplicate is the acted leaf, which ADR-163 left out:
- the polarity map `_tag === "HasActed" ? "Acted" : "NotActed"` is written at `Walk.ts:182` and `Predicate.ts:386`;
- the verdict rule `answer === wanted` is written at `Walk.ts:187` and `Predicate.ts:596`. Under it, `"Unknown"` denies both polarities (ADR-QD-020).

`holdsRole`, `holdsPermission` and `holdsAction` are already in `LeafNeeds.ts`. This phase covers the remaining leaves too, so every leaf tag has exactly one row.

Package: `@qadi/core` only. Requirements: VERD-01..04, WX-01..07.
Records: ARCH-101, ADR-QD-167, CCR-QD-445, BEH-QD-606..610, INV-QD-353..354, all reserved; never run `next-id`.

</domain>

<decisions>
## Implementation Decisions

### Where the verdict step lives, and its shape
- **D-01:** The step lives in `LeafNeeds.ts`, beside `holdsRole`/`holdsPermission`/`holdsAction` (ADR-163's placement). No sibling module.
- **D-02:** It is one closed record keyed by every leaf tag (`LeafTag`, ten tags), in the style of `LEAF_NEEDS`, so a new leaf tag with no row is a compile error. Each row maps the leaf and its answer to a verdict. The answer type is per tag (boolean membership, `ActedResult`, `RelatedResult`, the matcher `Verdict`, the signature `{ matched, onFile }`, the custom boolean), so the record is typed per tag, not widened. No `Record<string, unknown>`, `as` or `any`.
- **D-03:** A row returns a closed per-leaf outcome: `held`, or a named denial kind. Examples:
  - acted: `Unknown` / `Opposite`, the latter carrying which answer came back;
  - relationship: `Unrelated` / `Unknown`;
  - signature: `NoneOnFile` / `NoneMatching`;
  - attribute leaves: the matcher `Verdict`;
  - role/permission/action/custom: a single "not held" kind.

  The walk maps the denial kind to its reason sentence. `toPredicate` reads only whether it is held.
- **D-04:** The `HasAttribute`/`HasResourceAttribute` rows delegate to `Matcher.ts`'s `judgeMatcher`/`holds`. Comparison meaning stays owned by ADR-QD-091 (and the operand read by ADR-QD-166), with no second copy. The `SWITCH_BUDGET` switches in `Matcher.ts` are untouched.

### Scope: what the walk and the translator keep
- **D-05:** All ten leaf tags get a row, including `HasRelationship`, `HasCustom` and `HasSignature`, which `toPredicate` refuses. The table is total, and the per-leaf test covers every tag.
- **D-06:** `Walk.ts` keeps three things:
  - the `evaluateNode` `switch`, unchanged (`SWITCH_BUDGET`);
  - the port reads (in `PortAccess.ts`, unchanged);
  - the reason sentences, chosen by the row's denial kind.

  Every deny reason string is byte-identical to the base. The walk no longer decides held/not held itself.
- **D-07:** `toPredicate` keeps planning and constant folding only. The `AskActed` plan no longer carries `wanted`. It carries the leaf, and `run` asks the table whether the answer holds. The polarity map and the `answer === wanted` comparison then exist once, in the table (scoped grep in verification). `HasRole`/`HasPermission`/`HasAction` fold through the same table.
- **D-08:** No allocation is added per leaf on the evaluation path. `held` and the denial kinds are shared constants or string literals (an `Opposite` carrying the answer uses one constant per answer). A `pnpm bench` run before and after is recorded for information, not as a gate; the roadmap gates only Phase 59. `Effect.fnUntraced`, `UNTRACED_BUDGET` and `SWITCH_BUDGET` are unchanged.

### Tests, mutation, records
- **D-09 (VERD-03, WX-06):** A per-leaf verdict table test is written on the phase base through the public API, and is green before and after the change. It drives every leaf tag × answer × polarity through `evaluate` with scripted ports (`scriptedPort`, `PORT_DOUBLE_BUDGET`), and through `evaluatePredicate ∘ toPredicate` where the leaf folds. It asserts allow/deny and the exact deny reason string. The existing evaluate/`toPredicate` agreement for `scope: "Any"` acted leaves stays green and unedited. After the change, a unit test of the record is added (RED by import before it exists).
- **D-10 (WX-05):** Phase 53's D-14 rule applies:
  - record `54-mutation-base.json` for every touched file on the phase base;
  - a touched file whose score drops passes only when its survivor set is unchanged and the drop is exactly killed mutants that moved into `LeafNeeds.ts`, where they are still killed;
  - any other drop is closed with a test, never re-baselined;
  - the SUMMARY and ADR-QD-167 record the before and after numbers.
- **D-11 (WX-07):** One `@qadi/core` **patch** changeset with no Breaking entry. Every change is package-private, and deny reasons are byte-identical.
- **D-12 (VERD-04, WX-02):**
  - ADR-QD-167 extends ADR-QD-163 and keeps ADR-QD-020 and ADR-QD-024 (two walks stay two).
  - INV-QD-353: each leaf's answer becomes a verdict in exactly one row, which both interpreters read.
  - INV-QD-354: an acted `Unknown` denies both polarities, stated once.
  - CCR-QD-445 and BEH-QD-606..610 cover the rest. Placement is Claude's discretion, likely `16-predicates.md` and the walk/evaluation behaviour docs. An unused reservation is named "Unused: …" in the CCR row.
  - `SWITCH_BUDGET`, `UNTRACED_BUDGET` and the AGENTS.md tables stay unchanged. AGENTS.md is edited only if a location it cites moves.

### Claude's Discretion
- Names of the record, its outcome type and the denial kinds, provided they read as domain words. For example, "held" matches the existing `holds*` family and `Verdict`'s `Held`.
- Whether `holdsRole`/`holdsPermission`/`holdsAction` stay as named exports that the rows call, or become the rows themselves. Pick whichever keeps `Walk` and `Predicate` importing one thing.
- Exact BEH placement across the behaviour docs.

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `LeafNeeds.ts`:
  - `LEAF_NEEDS` is the per-tag closed record pattern, with derived row types per leaf and closed classification lists (`ReadsAction`/`ReadsResource`/`ReadsNothing`), so an unclassified new leaf does not compile (ADR-163);
  - `LeafTag = LeafPolicy["_tag"]`;
  - `holdsRole`/`holdsPermission`/`holdsAction`.
- `Matcher.ts`'s `judgeMatcher` (`SWITCH_BUDGET`) and `holds` (Verdict → boolean); `evaluateMatcher` = `holds(judgeMatcher(…))`.
- `PortAccess.ts`'s `askActed`/`askRelationship`/`askCustom`/`askSignature`/`readAttribute` return the answers the rows consume.
- `ActedResult` (`"Acted" | "NotActed" | "Unknown"`), `RelatedResult` (`"Related" | "Unrelated" | "Unknown"`).
- `scriptedPort` / `PortReply` for scripted port doubles in tests.

### Established Patterns
- Phase 50's closed classification lists with `never` defaults, so a new tag fails to compile instead of failing open.
- Hoisted `Match.type` at module scope on the hot path; `Match.value` only where arms close over per-call state (AGENTS.md §5a).
- RED/characterisation tests are committed on the phase base before any `src` change (WX-06).
- Mutation evidence follows the 53 D-14 rule: a phase-local `54-mutation.mjs` with base/after JSON and a comparer.

### Integration Points
- `Walk.ts`:
  - `evaluateActed` (:176-196), `evaluateHasRelationship` (:199-235), `evaluateHasCustom` (:241-250) and `evaluateHasSignature` (:259-279);
  - the `evaluateNode` arms for role/permission/attribute/resource-attribute/action (:310-370).
- `Predicate.ts`:
  - the `history` planner (:382-389) and `Plan`'s `AskActed` (`wanted`, :307-311);
  - the `cases` arms for role/permission/action (:398-406);
  - `run`'s `AskAttribute`/`AskActed` arms (:585-597).
- Tests: `packages/core/test/Evaluate.test.ts`, `Predicate.test.ts` (the `scope: "Any"` acted agreement), and a new `LeafNeeds` verdict test file or an extension of the existing `LeafNeeds.test.ts`.

</code_context>

<specifics>
## Specific Ideas

- "The walk keeps only its reason sentence; the translator keeps only constant folding" (roadmap). D-03's denial kinds are what make this literal: the walk's remaining code is a map from kind to sentence.
- Unchanged deny wording is the observable contract. The D-09 test pins every reason string on the base.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>
