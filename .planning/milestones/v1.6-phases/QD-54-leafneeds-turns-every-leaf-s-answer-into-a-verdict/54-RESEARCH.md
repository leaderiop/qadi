# Phase 54: LeafNeeds turns every leaf's answer into a verdict - Research

**Researched:** 2026-11-18
**Domain:** `@qadi/core` internals: two interpreters over one policy tree (`Walk.ts`, `Predicate.ts`), one package-private keyed-record module (`LeafNeeds.ts`), plus this repo's mutation, spec and gate mechanics
**Confidence:** HIGH on code facts, line numbers, reason strings, import graph and the typed record (all read or run this session, the record typechecked in a scratch project); MEDIUM on bench cost (not measured: Phase 54 forbids treating it as a gate); the Stryker figures are Phase 53/50 numbers, not a Phase 54 base run

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Where the verdict step lives, and its shape**
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

**Scope: what the walk and the translator keep**
- **D-05:** All ten leaf tags get a row, including `HasRelationship`, `HasCustom` and `HasSignature`, which `toPredicate` refuses. The table is total, and the per-leaf test covers every tag.
- **D-06:** `Walk.ts` keeps three things:
  - the `evaluateNode` `switch`, unchanged (`SWITCH_BUDGET`);
  - the port reads (in `PortAccess.ts`, unchanged);
  - the reason sentences, chosen by the row's denial kind.

  Every deny reason string is byte-identical to the base. The walk no longer decides held/not held itself.
- **D-07:** `toPredicate` keeps planning and constant folding only. The `AskActed` plan no longer carries `wanted`. It carries the leaf, and `run` asks the table whether the answer holds. The polarity map and the `answer === wanted` comparison then exist once, in the table (scoped grep in verification). `HasRole`/`HasPermission`/`HasAction` fold through the same table.
- **D-08:** No allocation is added per leaf on the evaluation path. `held` and the denial kinds are shared constants or string literals (an `Opposite` carrying the answer uses one constant per answer). A `pnpm bench` run before and after is recorded for information, not as a gate; the roadmap gates only Phase 59. `Effect.fnUntraced`, `UNTRACED_BUDGET` and `SWITCH_BUDGET` are unchanged.

**Tests, mutation, records**
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

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| VERD-01 | Acted polarity map and `answer === wanted` each written once, read by `Walk` and `toPredicate` | Rows `HasActed`/`HasNotActed` hard-code their own wanted answer; both interpreters index `LEAF_VERDICTS[leaf._tag]`; typechecked in scratch (Pattern 1). Sites to delete: `Walk.ts:182`, `:187`, `Predicate.ts:386`, `:596`, `Plan.AskActed.wanted` (`:309`) |
| VERD-02 | Every leaf's answer-to-verdict step in one place; walk keeps reason sentence, translator keeps constant folding | The per-leaf site census (Q1/Q2/Q3 below): ten rows, and the three reason tables that replace `evaluateActed`/`evaluateHasRelationship`/`evaluateHasSignature` branching |
| VERD-03 | Per-leaf verdict table test (answer × polarity → verdict), green before and after; `scope: "Any"` acted agreement stays green | Test strategy Q5: new `LeafVerdict.test.ts` on the base using only public API; existing pins listed with file:line; base suites ran green this session (417 tests) |
| VERD-04 | ADR-QD-167 extends ADR-163; `SWITCH_BUDGET`, `UNTRACED_BUDGET` unchanged | Records Q7; budgets read in `scripts/check-house-style.mjs`; rows are plain functions, no `switch`, no `Effect.fnUntraced` |
| WX-01 | `pnpm check:pr < /dev/null` green | Validation Architecture |
| WX-02 | Records use only reserved numbers; `next-id` never run | Reserved ids below; model: 53-07-SUMMARY |
| WX-03 | `spec/overview.md` names every added/removed export (gate 13) | `LeafNeeds.ts` is not in the barrel (`index.ts` has no `LeafNeeds` line), so no export is added; expect none |
| WX-04 | Nothing forbidden added | `as const satisfies` and `as const` are not `as` assertions (already used by `LEAF_NEEDS`); no `switch`, `any`, `!` |
| WX-05 | Coverage and Stryker score of touched files do not fall | Mutation Q6: touched files, 53's comparer, last known scores, the one Walk survivor this phase will touch |
| WX-06 | Characterisation tests precede behaviour change | RED/green order in Validation Architecture |
| WX-07 | Breaks recorded as Breaking | None: one `@qadi/core` patch changeset |
</phase_requirements>

## Summary

The duplication is real and exactly where the roadmap says. At HEAD `6b1bb95d` (docs only on top of Phase 53's last source commit `aff20dc6`) the acted polarity map is `Walk.ts:182` and `Predicate.ts:386`, and the verdict rule `answer === wanted` is `Walk.ts:187` and `Predicate.ts:596`. Beyond the acted leaf, the other nine leaves already share their *answer* (a port read in `PortAccess.ts`, `judgeMatcher`, a membership test) but each interpreter still turns it into held/not held itself: the walk with a ternary or `Match` per leaf, `toPredicate` with `holdsRole(...)` as a constant and `evaluateMatcher(...)` in `run`. This phase moves that last step into one closed record in `LeafNeeds.ts`.

The record is `LEAF_VERDICTS`, `as const satisfies { readonly [K in LeafTag]: LeafVerdictRows[K] }` over a hand-written per-tag interface of row signatures. I typechecked this shape in a scratch project against the real `Policy.ts`, `Matcher.ts`, `DecisionHistory.ts`, `RelationshipResolver.ts`, `SignatureHistory.ts` and `Compare.ts` types: it compiles with no `as`/`any`/`Record<string, unknown>`; a missing row is TS2741; a row returning a value outside its outcome union is TS2322; and the two acted rows have an identical parameter type, so `LEAF_VERDICTS[leaf._tag](answer)` typechecks on a `HasActed | HasNotActed` leaf (which is what `Predicate.ts`'s `AskActed` plan carries). Outcomes are string literals, so no row allocates. `Walk.ts` keeps its reason sentences as module-scope closed tables keyed by denial kind (the `DENIAL_TEXT` precedent already in the file), and `toPredicate` keeps only `isHeld(row(answer))` folding.

The hard parts are not the types. They are: (1) writing the characterisation table on the base through the public API with scripted ports so every reason string is pinned before `Walk.ts` moves; (2) the mutation rule, because `Walk.ts` carries a survivor on exactly the line this phase will edit (`allow("HasCustom", …)`) and survivor identity includes the source line; (3) keeping the circular-import gate and the budgets untouched, which the import graph analysis below shows is safe.

**Primary recommendation:** Add `LEAF_VERDICTS` (ten rows) and `isHeld` to `LeafNeeds.ts`; keep `holdsRole`/`holdsPermission`/`holdsAction` as the answer producers whose boolean the three port-free rows consume (honours D-02 literally and leaves `LeafNeeds.test.ts` untouched); replace `Walk.ts`'s held/not-held decisions with `isHeld(LEAF_VERDICTS.<Tag>(answer…))` plus three denial-reason tables; delete `wanted` from `Predicate.ts`'s `AskActed` plan and fold every leaf through the same record. Write `LeafVerdict.test.ts` and record `54-mutation-base.json` on the untouched green tree before touching `src`.

## Base facts (verified against HEAD this session)

- `git log --oneline -1` → `6b1bb95d docs(54): smart discuss context`. Last commits touching the three files: `aff20dc6 refactor(53-04)` (Walk), `1573cdbf fix(53-03)` (Predicate), `44510112` (LeafNeeds, unchanged since the Wave 10 merge). `git status --porcelain packages` was empty at start. [VERIFIED: git]
- Roadmap line numbers all confirmed by `Read`: `Walk.ts:182` `const wanted: ActedResult = policy._tag === "HasActed" ? "Acted" : "NotActed";`, `Walk.ts:187` `answer === wanted`, `Predicate.ts:386` `wanted: leaf._tag === "HasActed" ? "Acted" : "NotActed",`, `Predicate.ts:596` `constant(answer === p.wanted),`. [VERIFIED: Walk.ts:182,187; Predicate.ts:386,596]
- `LeafTag` is at `LeafNeeds.ts:27`: `type LeafTag = LeafPolicy["_tag"];`. It is **not exported**; a new export or a local alias is needed in any new code that names it. [VERIFIED: LeafNeeds.ts:27]
- The ten tags, verbatim from `LEAF_NEEDS` (`LeafNeeds.ts:163-174`): `HasPermission`, `HasRole`, `HasAttribute`, `HasResourceAttribute`, `HasRelationship`, `HasAction`, `HasActed`, `HasNotActed`, `HasCustom`, `HasSignature`. [VERIFIED: LeafNeeds.ts:163-174]
- Base suites green: `pnpm exec vitest run --project core LeafNeeds LeafMatrix Predicate Evaluate < /dev/null` → `Test Files 8 passed (8)`, `Tests 417 passed (417)`, 2.3 s. [VERIFIED: ran this session]
- A stale `.stryker-tmp/` directory exists at the repo root and contains copies of `spec/` and `packages/`. Any "scoped grep" that walks the repo root, or `packages/`, without excluding it returns false hits. The grep gates below name `packages/core/src` and exclude it explicitly. [VERIFIED: grep output this session]

### Reserved ids (Phase 54)

| Kind | Reserved | Source |
|---|---|---|
| ARCH | ARCH-101 | `_WAVE11-CONTEXT.md` table |
| ADR-QD | 167 | same; file `spec/decisions/167-<slug>.md`, Document ID `QADI-ADR-167` must equal the number (gate 10) |
| CCR-QD | 445 | same; row goes in `spec/README.md` after the CCR-QD-444 row (`:381`) |
| BEH-QD | 606–610 | same |
| INV-QD | 353–354 | same; existing neighbours: INV-QD-345, 346 (leaf needs), 351, 352 (Phase 53) |

Never run `node scripts/next-id.mjs`. Confirm a number is free with `/usr/bin/grep` over `spec/`, `packages/`, `.changeset/`, `AGENTS.md` (exclude `.stryker-tmp`). [CITED: `.planning/phases/_WAVE11-CONTEXT.md`]

## Architectural Responsibility Map

This is a library, so "tier" here means module role inside `@qadi/core`, not a deployment tier.

| Capability | Primary module | Secondary | Rationale |
|---|---|---|---|
| Read an answer (port call, subject membership, attribute cell) | `PortAccess.ts`, `Operand.ts`, `LeafNeeds.ts` `holds*` | — | Answers are produced once; unchanged by this phase |
| Turn an answer into a verdict outcome (per leaf tag) | `LeafNeeds.ts` `LEAF_VERDICTS` | `Matcher.ts` `judgeMatcher` for the two matcher leaves | The new single owner; delegates comparison meaning to ADR-091's module |
| Decide whether an outcome holds | `LeafNeeds.ts` `isHeld` | — | One statement of "only `Held` holds" for every outcome vocabulary |
| Turn an outcome into a reason sentence and a `Trace` | `Walk.ts` | — | Presentation of the walk; the only thing the walk keeps |
| Turn an outcome into a constant, plan and fold | `Predicate.ts` | — | Planning and constant folding only |
| Column predicate for `HasResourceAttribute` | `Predicate.ts` `columnPredicate` / `evaluatePredicate` | `Compare.ts` | Not an answer-to-verdict step on the subject side; ADR-091/166 own it. Untouched |

## Standard Stack

No new packages. Everything below is already in the repo.

| Tool | Version | Purpose | Provenance |
|---|---|---|---|
| vitest | 5.1.0 | tests, `vitest bench` | [VERIFIED: banner `RUN v5.1.0` this session] |
| `@effect/vitest`, fast-check | in repo | `it.effect`, properties | [VERIFIED: imports in `LeafMatrix.test.ts`, `Predicate.test.ts`] |
| tstyche | in repo | `*.tst.ts` type tests (`LeafNeeds.tst.ts`) | [VERIFIED: `node_modules/.bin/tstyche` present; `package.json` `test:tstyche`] |
| madge | `^8.0.0` | `pnpm circular` | [VERIFIED: package.json:66] |
| Stryker + `@stryker-mutator/vitest-runner` | per `stryker.config.mjs` | mutation evidence | [VERIFIED: stryker.config.mjs read] |
| tsc | repo's TypeScript | `pnpm typecheck` | [VERIFIED: `node_modules/.bin/tsc`] |
| Node | v26.13.0 | scripts | [VERIFIED: `node --version`] |

**Installation:** none.

## Package Legitimacy Audit

No external packages are installed or recommended by this phase. Audit not applicable.

**Packages removed due to [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

## Architecture Patterns

### System Architecture Diagram

```
                      policy leaf (one of ten tags)
                              |
        +---------------------+------------------------+
        |                                              |
   evaluate (Walk.ts evaluateNode)             toPredicate (Predicate.ts compile + run)
        |                                              |
   ANSWER PRODUCERS (unchanged)                 ANSWER PRODUCERS (unchanged)
   holdsRole/Permission/Action(subject,..)      same, or askActed / readAttribute
   readAttribute / ownValue(resource,..)        (HasRelationship, HasCustom, HasSignature
   askRelationship / askActed /                  never reach run: compile refuses them)
   askCustom / askSignature
        |                                              |
        +------------------+---------------------------+
                           v
        LEAF_VERDICTS[leaf._tag](answer ...)       <-- LeafNeeds.ts, the ONE row per tag
                           |   returns a closed string-literal outcome (no allocation)
                           v
        +------------------+---------------------------+
        |                                              |
   Walk.ts                                        Predicate.ts
   isHeld(outcome) ? allow(...)                   constant(isHeld(outcome))
   : deny(policyTag, REASON_TABLE[outcome](...))   (True / False constant, folds and prunes)
        |                                              |
     Trace                                          Predicate
```

### Recommended Project Structure
```
packages/core/src/
├── LeafNeeds.ts        # + LEAF_VERDICTS, LeafOutcome types, isHeld (D-01: no sibling module)
├── Walk.ts             # reads LEAF_VERDICTS; keeps evaluateNode switch + 3 reason tables
└── Predicate.ts        # Plan.AskActed loses `wanted`; run/cases read LEAF_VERDICTS
packages/core/test/
├── LeafVerdict.test.ts # NEW, written on the base, public API only (answer x polarity -> verdict)
├── LeafNeeds.test.ts   # + "LEAF_VERDICTS" describe (RED by import) + barrel list extended
└── LeafNeeds.tst.ts    # + type pins: missing row refused, wrong outcome refused
```

### Q1. The answer type per tag, where it comes from, and the record (typechecked)

| Tag | Answer produced by | Answer type | Outcome (closed literals) |
|---|---|---|---|
| `HasPermission` | `holdsPermission(subject, leaf)` `LeafNeeds.ts:265` (`subject.permissions.has(permissionKey(leaf.permission))`) | `boolean` | `"Held" \| "NotHeld"` |
| `HasRole` | `holdsRole(subject, leaf)` `LeafNeeds.ts:259` (`subject.roles.has(leaf.role)`) | `boolean` | `"Held" \| "NotHeld"` |
| `HasAction` | `holdsAction(leaf, action)` `LeafNeeds.ts:271` (`action === leaf.action`) | `boolean` | `"Held" \| "NotHeld"` |
| `HasAttribute` | `readAttribute("evaluate"\|"toPredicate", subject, leaf)` `PortAccess.ts:344` | `unknown` (+ `MatcherContext`) | `Verdict` |
| `HasResourceAttribute` | `ownValue(row, leaf.attribute)` `Walk.ts:345-347` (`Operand.ts`, Phase 53) | `unknown` (+ `MatcherContext`) | `Verdict` |
| `HasRelationship` | `askRelationship(subject, leaf, resource)` `PortAccess.ts:440` | `RelatedResult` | `"Held" \| "Unrelated" \| "Unknown"` |
| `HasActed` | `askActed(interpreter, subject, leaf, resource)` `PortAccess.ts:414` | `ActedResult` | `"Held" \| "Unknown" \| "Performed" \| "NotPerformed"` |
| `HasNotActed` | same | `ActedResult` | same |
| `HasCustom` | `askCustom(subject, leaf, resource)` `PortAccess.ts:456` (port returns `Effect<boolean, CustomPredicateError>`, `CustomPredicate.ts:66`) | `boolean` | `"Held" \| "NotHeld"` |
| `HasSignature` | `askSignature(subject, leaf, resource)` `PortAccess.ts:481` | `SignatureAnswer` | `"Held" \| "NoneOnFile" \| "NoneMatching"` |

Verbatim type facts the table relies on:

- `Verdict`: `export type Verdict = "Held" | "NotHeld" | "ValueAbsent" | "ReferenceAbsent" | "Incomparable";` [VERIFIED: Compare.ts:47]. `holds`: `export const holds = (verdict: Verdict): verdict is "Held" => verdict === "Held";` [VERIFIED: Compare.ts:53].
- `ActedResult`: `Schema.Literals(["Acted", "NotActed", "Unknown"])` [VERIFIED: DecisionHistory.ts:58].
- `RelatedResult`: `Schema.Literals(["Related", "Unrelated", "Unknown"])` [VERIFIED: RelationshipResolver.ts:98].
- `SignatureAnswer`: `readonly matched: boolean; readonly onFile: number;` [VERIFIED: SignatureHistory.ts:118-121].
- The acted/signature/relationship leaf types are `Extract<Policy, { _tag: T }>` (`LeafOf`, `PortDescription.ts:120`), and `AnyActedLeaf = ActedLeaf & { readonly scope: "Any" }` [VERIFIED: PortAccess.ts:368].

**The record's type.** A hand-written interface, one property per leaf tag, is the mapped type's source; `satisfies` over `{ [K in LeafTag]: LeafVerdictRows[K] }` makes a leaf tag with no property in the interface an error at the type (TS2536) and a leaf tag with no row an error at the table (TS2741). This was compiled this session in a scratch project (`/private/tmp/claude-502/.../scratchpad/proto/`, outside the repo) against the real source types; only the two noise errors of a non-relative import path and an unused import appeared. Negative probes: removing the `HasCustom` row → `TS2741: Property 'HasCustom' is missing`; returning `"Bogus"` from the acted row → `TS2322: Type '"Bogus" | "Held"' is not assignable to type 'ActedOutcome'`. [VERIFIED: tsc run this session]

```ts
// Source: scratch prototype typechecked this session against packages/core/src types.
// Lives in LeafNeeds.ts. Needs: import type { ActedResult } from "./DecisionHistory.ts";
//   import type { Verdict } from "./Compare.ts"; import type { RelatedResult } from "./RelationshipResolver.ts";
//   import type { SignatureAnswer } from "./SignatureHistory.ts"; judgeMatcher from "./Matcher.ts" (already imported module).

/** Outcome of a leaf whose answer is a plain yes or no. */
type BinaryOutcome = "Held" | "NotHeld";
type RelationshipOutcome = "Held" | "Unrelated" | "Unknown";
/** `Performed` / `NotPerformed`: the opposite answer came back (the one constant per answer of D-08). */
type ActedOutcome = "Held" | "Unknown" | "Performed" | "NotPerformed";
type SignatureOutcome = "Held" | "NoneOnFile" | "NoneMatching";

/** Every outcome a row can return; `Verdict` is a member, so the matcher leaves need no mapping. */
export type LeafOutcome =
  | Verdict | RelationshipOutcome | ActedOutcome | SignatureOutcome;

interface LeafVerdictRows {
  readonly HasPermission: (held: boolean) => BinaryOutcome;
  readonly HasRole: (held: boolean) => BinaryOutcome;
  readonly HasAction: (held: boolean) => BinaryOutcome;
  readonly HasAttribute: (
    leaf: Extract<LeafPolicy, { readonly _tag: "HasAttribute" }>,
    value: unknown,
    context: MatcherContext,
  ) => Verdict;
  readonly HasResourceAttribute: (
    leaf: Extract<LeafPolicy, { readonly _tag: "HasResourceAttribute" }>,
    value: unknown,
    context: MatcherContext,
  ) => Verdict;
  readonly HasRelationship: (answer: RelatedResult) => RelationshipOutcome;
  readonly HasActed: (answer: ActedResult) => ActedOutcome;
  readonly HasNotActed: (answer: ActedResult) => ActedOutcome;
  readonly HasCustom: (held: boolean) => BinaryOutcome;
  readonly HasSignature: (answer: SignatureAnswer) => SignatureOutcome;
}

const binary = (held: boolean): BinaryOutcome => (held ? "Held" : "NotHeld");

export const LEAF_VERDICTS = {
  HasPermission: binary,
  HasRole: binary,
  HasAction: binary,
  HasAttribute: (leaf, value, context) => judgeMatcher(leaf.matcher, value, context),
  HasResourceAttribute: (leaf, value, context) => judgeMatcher(leaf.matcher, value, context),
  HasRelationship: (answer) => (answer === "Related" ? "Held" : answer),
  // Each row states its own wanted answer: this is the polarity map, once.
  // `"Unknown"` is neither, so both polarities deny (ADR-QD-020, INV-QD-014).
  HasActed: (answer) =>
    answer === "Acted" ? "Held" : answer === "Unknown" ? "Unknown" : "NotPerformed",
  HasNotActed: (answer) =>
    answer === "NotActed" ? "Held" : answer === "Unknown" ? "Unknown" : "Performed",
  HasCustom: binary,
  HasSignature: ({ matched, onFile }) =>
    matched ? "Held" : onFile === 0 ? "NoneOnFile" : "NoneMatching",
} as const satisfies { readonly [K in LeafTag]: LeafVerdictRows[K] };

export const isHeld = (outcome: LeafOutcome): outcome is "Held" => outcome === "Held";
```

Also confirmed by the same scratch run: `export const viaTag = (tag: "HasActed" | "HasNotActed", answer: ActedResult): ActedOutcome => LEAF_VERDICTS[tag](answer);` typechecks, because the two acted rows have the identical parameter type. That is what lets `Predicate.ts`'s `run` index by `p.leaf._tag` without a ternary (which would be the polarity map again).

Naming is Claude's discretion (CONTEXT). `Performed` means "the answer that came back was `Acted`" (so the `HasNotActed` leaf is contradicted: "has already performed"); `NotPerformed` means `NotActed` came back (the `HasActed` leaf is contradicted: "has not performed"). They are D-03's "Opposite carrying which answer came back", spelled as two literals so no object is allocated.

`isHeld` takes the whole `LeafOutcome` union. `Verdict` is a member, so `Walk.ts`'s attribute arms narrow exactly as `holds(verdict)` does today (the false branch is `Exclude<Verdict, "Held">`, which `DENIAL_TEXT`'s key type needs). Do not widen `Compare.ts`'s `holds` (ADR-091's, Phase 53 adjacent); pin `isHeld(v) === holds(v)` for every `Verdict` in `LeafNeeds.test.ts` instead.

### Q2. Every deny reason `Walk.ts` produces per leaf today (byte-identical, D-06)

Read from `Walk.ts` at HEAD. "Depends on" names everything beyond the outcome the sentence needs. All allows are `allow(policyTag, policy.fields)`.

| Leaf (`Walk.ts` line) | Outcome that denies | Reason, verbatim | Depends on beyond the outcome |
|---|---|---|---|
| `HasPermission` (`:319`) | `NotHeld` | `` `subject lacks permission '${permissionKey(policy.permission)}'` `` | the leaf's permission |
| `HasRole` (`:326`) | `NotHeld` | `` `subject lacks role '${policy.role}'` `` | the leaf's role |
| `HasAttribute` (`:337`) | `NotHeld`, `ValueAbsent`, `ReferenceAbsent`, `Incomparable` | `` `subject attribute '${attribute}' ${DENIAL_TEXT[verdict](matcher)}` `` via `attributeReason("subject", policy.attribute, verdict, policy.matcher)` (`:151-156`) | the attribute name and **the matcher's `_tag`** (`NotHeld` reads "matched an excluded value" for `Neq`, else "did not match") |
| `HasResourceAttribute` (`:351-354`) | same four | same with `"resource"` | same |
| `HasRelationship` (`:212-231`) | `Unrelated` | `` `subject '${subject.id}' has no '${policy.relation}' relation to '${resourceId}'` `` | subject id, relation, `resourceIdOf(resource)` |
| | `Unknown` | `` `no relationship resolver could confirm the '${policy.relation}' relation to '${resourceId}'` `` | relation, resource id (no wiring claim: INV-QD-029, BEH-QD-045) |
| `HasAction` (`:367`) | `NotHeld` | `` `action is '${action}', not '${policy.action}'` `` | the **request's action** and the leaf's action |
| `HasActed` / `HasNotActed` (`:189-194`) | `Unknown` | `` `no history is available for '${policy.event}'` `` | event |
| | the opposite answer | `` `subject '${subject.id}' ${answer === "Acted" ? "has already" : "has not"} performed '${policy.event}'` `` | subject id, event, **which answer came back** (hence two outcome literals) |
| `HasCustom` (`:249`) | `NotHeld` | `` `custom predicate '${policy.name}' returned false` `` | the predicate name |
| `HasSignature` (`:270-278`) | `NoneOnFile` | `` `no signatures are on file for subject '${subject.id}'` `` | subject id |
| | `NoneMatching` | `` `subject '${subject.id}' has no signature matching meaning '${policy.meaning}'` + (policy.signerRole === undefined ? "" : ` and signer role '${policy.signerRole}'`) `` | subject id, meaning, **optional signer role** |

The denial-kind to sentence mapping needs the leaf, the subject, and for two leaves the resource id or the request action. None needs the answer beyond the outcome. That is why the walk-side tables below take `(policy, subject, …)` and not the raw answer.

**The walk's remaining code**, following the `DENIAL_TEXT` precedent already at `Walk.ts:144-149` (a module-scope closed record keyed by `Exclude<Outcome, "Held">`, so a new denial kind is a compile error and nothing is allocated per call):

```ts
// Source: pattern of Walk.ts:144-149 (DENIAL_TEXT); sentences copied from Walk.ts:189-194, 212-231, 270-278.
const ACTED_DENIAL: { readonly [K in Exclude<ActedOutcome, "Held">]: (event: string, subjectId: string) => string } = {
  Unknown: (event) => `no history is available for '${event}'`,
  Performed: (event, id) => `subject '${id}' has already performed '${event}'`,
  NotPerformed: (event, id) => `subject '${id}' has not performed '${event}'`,
};
```
`ActedOutcome` must therefore be exported from `LeafNeeds.ts` (or the row-derived type used: `ReturnType<(typeof LEAF_VERDICTS)["HasActed"]>`; an exported alias is simpler). Do the same for `RelationshipOutcome` and `SignatureOutcome`. `evaluateActed` then reads:

```ts
Effect.map(asked, (answer) => {
  const outcome = LEAF_VERDICTS[policy._tag](answer);   // union-indexed, typechecked in the scratch run
  return isHeld(outcome)
    ? allow(policy._tag, policy.fields)
    : deny(policy._tag, ACTED_DENIAL[outcome](policy.event, subject.id));
});
```
(`isHeld`'s false branch narrows `outcome` to the three denial kinds.) The `evaluateHasRelationship` `Match.value` and its long comment about `"Unknown"` move to the table's `Unknown` entry; the comment stays, because it is the BEH-QD-045 / INV-QD-029 rationale. `resourceIdOf(resource)` stays in the walk (a template prints `undefined` if absent; `readScoped` guarantees a usable id before the port answers, so this is unreachable and byte-identical either way).

### Q3. How `toPredicate` consumes each leaf today, and what changes (D-07)

`compileTree`'s `cases: PolicyCases<Compiled>` (`Predicate.ts:397-506`) and `run` (`:581-641`):

| Leaf | Today (HEAD) | After D-07 |
|---|---|---|
| `HasRole` `:398` | `Constant` of `holdsRole(subject, p)` | `Constant` of `isHeld(LEAF_VERDICTS.HasRole(holdsRole(subject, p)))` |
| `HasPermission` `:400` | same with `holdsPermission` | same through `LEAF_VERDICTS.HasPermission` |
| `HasAction` `:402-407` | `absenceOf` → `NeedAction`, else `Constant` of `holdsAction(p, action)` | else `Constant` of `isHeld(LEAF_VERDICTS.HasAction(holdsAction(p, action)))` |
| `HasAttribute` `:409-421` | refuses if matcher references the resource; `NeedAction` on absence; else plan `AskAttribute { leaf }` | planning unchanged. `run` `:590-593`: `constant(evaluateMatcher(p.leaf.matcher, value, context))` becomes `constant(isHeld(LEAF_VERDICTS.HasAttribute(p.leaf, value, context)))` |
| `HasResourceAttribute` `:423-433` | `Column` plan via `columnPredicate` | **unchanged**: a column predicate is the translator's own output, not an answer-to-verdict step on the subject side; `evaluatePredicate` reads `Compare.ts` verdicts directly (ADR-091/166) |
| `HasActed` / `HasNotActed` `:382-389`, `:435-436` | refuses non-`Any` scope; else plan `AskActed { wanted, leaf }` | plan `AskActed { leaf }` (delete `wanted` `:309` and `:386`); `run` `:594-597`: `constant(isHeld(LEAF_VERDICTS[p.leaf._tag](answer)))` |
| `HasRelationship`, `HasCustom`, `HasSignature` | `refused(...)` | unchanged (never reach `run`); they still have rows, per D-05 |

**`evaluateMatcher` in `run`'s `AskAttribute` arm is an answer-to-verdict step and must read the table.** `evaluateMatcher` is `holdsLocal(judgeMatcher(self, value, context))` (`Matcher.ts:737-738`), which is exactly the `HasAttribute` row plus `isHeld`. Leaving it would keep a second statement of "this leaf's answer holds" in the translator. `evaluateMatcher` itself stays exported (it is a public `Matcher.ts` export through `index.ts:29`'s `export * from "./Matcher.ts"`), only `Predicate.ts` stops importing it (it is `Predicate.ts`'s only src caller). `referencesResource` stays imported.

**Import cleanup (noUnusedLocals is on):** `Predicate.ts` drops `import type { ActedResult }` (`:27`) and `evaluateMatcher` (`:33`); `Walk.ts` drops `import type { ActedResult }` (`:18`), `import { holds } from "./Compare.ts"` (`:23`) and `import { judgeMatcher } from "./Matcher.ts"` (`:27`); both add `LEAF_VERDICTS`, `isHeld` to their `LeafNeeds.ts` import. `Walk.ts` still imports the `Verdict` type (`DENIAL_TEXT`) and `ownValue`, `permissionKey`.

### Q4. The hot path (D-08)

What `evaluateNode` allocates per leaf today: the `Trace` object from `allow`/`deny` (`Walk.ts:79-109`), the reason template string on a deny, and for port leaves the `Effect.map` closure plus the port effect. The verdict step itself allocates nothing: `holdsRole` etc. return booleans, `judgeMatcher` returns a string literal (`Matcher.ts:662`), `answer === wanted` is a comparison. [VERIFIED: Walk.ts, Matcher.ts read]

Keeping it allocation-free: every row returns a string literal; no row returns an object; the three denial tables are module-scope constants whose entries are functions built once. `Performed`/`NotPerformed` are two literals precisely so the opposite-answer outcome is not an `{ _tag, answer }` object. Do **not** use `Match.value(outcome)` in the leaf arms for the three binary-outcome leaves or the matcher leaves: a ternary on `isHeld` is what the code does today. (`Match.value` is already used in `evaluateHasRelationship` and `Matcher.ts`; its replacement by a table is allocation-neutral or better.)

One real cost to know about, not an allocation: each leaf gains **one extra call** (the row), and one extra property read off the imported `LEAF_VERDICTS`. `Matcher.ts:624-641` and `Predicate.ts:124-130` document that under a module runner (vitest's, which `pnpm bench` uses) an imported binding is a getter, and a direct call "paid that getter on every node" (`Compare.bench.ts` measured `judgeMatcher` ~2.4x slower per leaf until module-local aliases were added, ARCH-08 T8). The planner may add `const roleVerdict = LEAF_VERDICTS.HasRole` style module-scope aliases in `Walk.ts`/`Predicate.ts` **after** the informational bench shows a regression; do not add them speculatively. [VERIFIED: Matcher.ts:624-641, Predicate.ts:124-130 read]

Do the bench workloads exercise these leaves? `packages/core/bench/Evaluate.bench.ts` is built from `hasPermission` (many workloads), and from `hasAttribute`/`hasResourceAttribute` for the two `leafHeavy` workloads (`:343`, `:360`); `DecisionCache.bench.ts:56-57` uses `hasRole`. `grep` for `hasActed|hasRelationship|hasSignature|hasCustom` across `packages/core/bench/*.ts` found **no** use. So the permission, role, attribute and resource-attribute arms are measured; acted, relationship, custom and signature are not. [VERIFIED: /usr/bin/grep this session]

Exact command (from Phase 50's research Q5): `--project core` is not valid for `vitest bench` ("No projects matched the filter 'core'"), so:
```bash
pnpm exec vitest bench --run --reporter=json --outputFile=<file>.json packages/core/bench/Evaluate.bench.ts < /dev/null
```
One run is about 44 s on a loaded host; the JSON has `testResults[0].assertionResults[].benchmarks[].tasks[].latency.{min,p50,mean}` in ms. Phase 50 recorded its run in `50-BENCH.md` and interleaved base/prototype with `bench/ab.sh` + `bench/analyze.mjs` under `.planning/milestones/v1.5-phases/QD-50-…/`. Phase 53 did **not** run the bench ("informational only, no gate reads it", `53-08-SUMMARY.md:110`). For Phase 54 D-08 asks for a before and after recorded for information: run the command once on the untouched base, once after, and record min/p50 for the `one node`, `leaf-heavy` ×2 and `matcher-heavy` workloads in the SUMMARY; no threshold. A shared host makes a single run noisy (Phase 50 saw load 8.6 to 54.9); note `uptime` beside the numbers. [CITED: `.planning/milestones/v1.5-phases/QD-50-…/50-RESEARCH.md` Q5, `50-BENCH.md`] [ASSUMED: that a single run per side is enough for an informational record]

### Pattern: Plan/arm shape that survives mutation and the gates
- Rows are plain arrow functions in an object literal: no `switch` (SWITCH_BUDGET counts them, `Walk.ts: 1`, `Matcher.ts: 2`, `scripts/check-house-style.mjs:376-381`), no `Effect.fn`/`fnUntraced` (UNTRACED_BUDGET `Walk.ts: 3`, `:464-467`).
- Nested ternaries in `HasActed`/`HasSignature` rows are the shape the repo already uses; `Match.type` hoisting is only required where a `Match` is used on the hot path (AGENTS.md §5a), and these rows do not use one.

### Anti-Patterns to Avoid
- **A ternary on `leaf._tag` to pick the acted row.** `LEAF_VERDICTS[leaf._tag](answer)` already works (identical parameter types); a ternary restates the polarity map.
- **An outcome object `{ _tag: "Opposite", answer }`.** Allocates per denied leaf; two literals do the same.
- **`Record<string, unknown>` or a widened implementation type to dodge `as`** (user memory; AGENTS.md §6). The interface-plus-`satisfies` form needs neither.
- **`old | "New"` widening of an outcome union** (user memory). Each outcome union is written out in full.
- **Putting the reason sentences in `LeafNeeds.ts`.** The sentences stay in `Walk.ts` (D-06, roadmap "Walk keeps only its reason sentence").
- **Changing `Compare.ts`'s `holds` signature** to accept `LeafOutcome`. It is ADR-091's module; add `isHeld` instead and pin their agreement in a test.

## Don't Hand-Roll

| Problem | Don't build | Use instead | Why |
|---|---|---|---|
| "Held" test for every outcome | A second `=== "Held"` per interpreter | `isHeld` from `LeafNeeds.ts` | One statement of "only `Held` holds" (the `Verdict` rule, extended) |
| Comparison meaning for the matcher leaves | A copy of `judgeMatcher` logic in a row | `judgeMatcher` (`Matcher.ts:662`), called from the row | ADR-QD-091 owns it; D-04 |
| Scripted port doubles in the new test | A hand-built failing/answering `Layer.succeed(<Port>, …)` | `scriptedPort(<port>Port, script).layer` with `PortReply.answer(...)` (`PortDoubles.ts:44`, `PortDescription.ts:328-333`) | `PORT_DOUBLE_BUDGET`; answering doubles do not trip it (it counts lines constructing a port error) |
| Signature fixtures | Raw signature rows | `signatureHistoryFromSignatures([...])` (used at `Evaluate.test.ts:596-627`) | The existing fixture builder |
| Mutation comparison | A new harness | Copy `53-mutation.mjs` (`.planning/phases/QD-53-…/53-mutation.mjs`) | Already encodes D-14 and survivor identity |
| Spec revision bookkeeping | Hand-editing Document Control | `node scripts/spec-revise.mjs <doc> "<what changed>" --date 2026-11-18` and `--check` | The gate reads it (usage line verified this session) |

**Key insight:** every piece of this phase already has a precedent in the repo (`LEAF_NEEDS`, `DENIAL_TEXT`, the `holds*` trio, 53's comparer). The risk is in sequencing and in mutation identity, not in inventing structure.

## Common Pitfalls

### Pitfall 1: `Unknown` slipping into "held" (a fail-open)
**What goes wrong:** an acted or relationship row written as `answer !== "Unknown"` or with a default arm grants under an unwired port.
**Why:** `Unknown` is a third value on purpose (ADR-QD-020, INV-QD-014); a boolean-style default has a polarity.
**How to avoid:** each acted row names its own wanted literal and maps `Unknown` to its own outcome; the per-leaf test pins **both polarities deny** for `Unknown`, with the exact `no history is available for 'e'` sentence for each.
**Warning signs:** `LeafMatrix.test.ts` `settled` cells for `HasActed[Any]`/`HasNotActed[Any]` flip from `Deny: no history is available for 'e'`.

### Pitfall 2: Survivor identity includes the source line (D-10)
**What goes wrong:** 53's comparer identifies a mutant by `mutatorName | status | replacement | original text | full line` (`53-mutation.mjs`, `idOf`). A survivor on a line this phase edits reads as "gone + new", so "survivor set unchanged" fails literally.
**Known case in this phase:** `Walk.ts` has a survivor `StringLiteral | Survived | "" | "HasCustom" | ? allow("HasCustom", policy.fields)` (nothing today asserts the allow trace's `policyTag` for `HasCustom`). Phase 54 edits that arm. Walk's 16 survivors per `53-mutation-after.json`: nine `depth - 1`, one `depth > maxDepth`, three `{ concurrency: … }`/`{ maxDepth }`/`a required policy denied`/`the obliged policy denied` literals, and that one.
**How to avoid:** the new table test asserts `trace.policyTag` on **every leaf's allow and deny** (this kills the `HasCustom` survivor, which is allowed: a score that rises needs no rule). If a survivor line is edited and not killed, declare it in a `RENAMED` map in `54-mutation.mjs` before the change, as 53 did for `Decision.ts`.
[VERIFIED: 53-mutation-after.json read this session; orientation only until a Phase 54 base run]

### Pitfall 3: `Walk.ts` and `Predicate.ts` scores fall by construction
**What goes wrong:** moving killed mutants out lowers the numerator with the survivor count fixed (`Walk.ts` 0.9481 = 292 detected / 308; `Predicate.ts` 1.0 with 293 killed). The comparer must allow exactly that, and only if `LeafNeeds.ts` still kills them.
**How to avoid:** put both files in the comparer's `MOVED` list; `LeafNeeds.ts` is a base file here (not new), so its own score must not fall: last recorded 0.9811 (52 killed, 1 survivor `isActionLeaf`'s `LEAF_NEEDS[leaf._tag].own === "Action"` → `true`, `50-mutation-after.json`). Every new row mutant must be killed by the table test (each outcome literal asserted, each ternary arm reached). Stryker mutants on `isHeld`'s `=== "Held"` and on each row's ternaries are killed only if the test covers `Held` and every denial for that row.

### Pitfall 4: Recording the mutation base after a test is added
**What goes wrong:** the base is measured on the tree that already has the new table test, so the new test's kills inflate the base and the "after" cannot beat it.
**How to avoid:** as in 53 (Pitfall 1 there): record `54-mutation-base.json` on the **untouched green tree**, commit it with `54-mutation.mjs` alone, then add tests. A RED suite also breaks Stryker's dry run [ASSUMED: standard Stryker behaviour, not re-run here]. Run Stryker alone, never next to vitest or `check:pr`. Invocation, from 53: `pnpm exec stryker run stryker.config.mjs --mutate '<files>' < /dev/null` (`stryker.config.mjs` writes `reports/mutation/mutation.json`; `timeoutMS: 20000`, `coverageAnalysis: "perTest"`, `ignoreStatic: true`).

### Pitfall 5: New circular import
**Safe.** `madge --json packages/core/src` this session: `LeafNeeds.ts` depends on `AuthSubject.ts, Errors.ts, Matcher.ts, Permission.ts, Policy.ts`. The new edges are `DecisionHistory.ts`, `RelationshipResolver.ts`, `SignatureHistory.ts`, `Compare.ts` (type-only or already reachable through `Matcher.ts`). None of those four reaches `LeafNeeds.ts` in the graph, and `LeafNeeds.ts` reaches neither `Walk.ts` nor `Predicate.ts`. `madge` counts type imports (it lists `AuthSubject.ts` and `Policy.ts`, both type-only imports today), so the check is the right one. Re-run `pnpm circular` after the edit anyway. [VERIFIED: madge JSON + reachability script, this session]

### Pitfall 6: Scoped greps that match prose or `.stryker-tmp`
The D-07 grep must pass on code and not trip on comments. `Walk.ts`'s doc comment on `evaluateActed` says "the wanted `ActedResult`" and the `evaluateNode` comment mentions `subject.roles.has(...)`; reword them when the code changes. Suggested gates (measure the baseline with the same command first, per `_SHARED-CONTEXT.md` hygiene):
```bash
# the polarity map and the verdict comparison exist once, in LeafNeeds.ts
bash -c "/usr/bin/grep -rnE 'wanted|answer === (\"Acted\"|\"NotActed\"|\"Unknown\")|_tag === \"HasActed\"' packages/core/src --include='*.ts' | /usr/bin/grep -v '^packages/core/src/LeafNeeds.ts'"   # expect: no output (comments reworded)
# the walk and the translator no longer decide
bash -c "/usr/bin/grep -nE 'onFile === 0|matched \\?|\\.roles\\.has|\\.permissions\\.has|holds\\(|evaluateMatcher' packages/core/src/Walk.ts packages/core/src/Predicate.ts"   # expect: no output
```
`RelationshipResolver.ts` legitimately contains `"Related"`/`"Unrelated"` literals; do not include it in a pattern that matches those.

### Pitfall 7: Closed lists and `never` defaults
`LEAF_NEEDS`' classification lists (`ReadsAction`, `AsksByScope`, …) default an unlisted tag to `never`. The new record needs no list because `LeafVerdictRows` is an explicit interface keyed by tag, and `[K in LeafTag]` over it fails for a missing key. A `.tst.ts` pin should state both directions (see Validation). The `Walk.ts` reason tables are keyed by `Exclude<Outcome, "Held">`, so a new denial kind is a compile error there too, not a silent `undefined`.

### Pitfall 8: Barrel and gate 13
`LeafNeeds.ts` is not exported from `index.ts` (`/usr/bin/grep -n LeafNeeds packages/core/src/index.ts` prints nothing). `LEAF_VERDICTS`, `isHeld` and the outcome types therefore add no export; extend `LeafNeeds.test.ts`'s "does not export" list (`LeafNeeds.test.ts:~229`) with `"LEAF_VERDICTS"` and `"isHeld"`. `pnpm spec:api` should keep reporting the same count (935 at Phase 53). [VERIFIED: index.ts grep; 53-07-SUMMARY gate output]

## Test strategy (D-09, VERD-03, WX-06)

### Q5a. What already pins the reasons (do not duplicate; do not edit)

- `Evaluate.test.ts`: `HasPermission` `:66`; relationship unrelated `:369`, unwired and wired-Unknown `:393`, `:427`; signature none-on-file `:584-591`, none-matching `:604-605`, with signer role `:627`; custom `:747`; role `:805`; acted `:1818` (has not performed), `:1831` (has already performed), `:1856-1857` (both polarities under an unwired port: identical `no history is available for 'raised'`); `HasAction`'s `action is 'read', not 'write'` is `LeafNeeds.test.ts:201`.
- `LeafFixtures.ts` + `LeafMatrix.test.ts` (Phase 50): every leaf fixture's `settled` decision with all inputs present, but with **default (fail-closed) ports**, so each of acted/relationship/signature shows only its `Unknown`/no-signature sentence. They pin no `Acted`/`NotActed`/`Related`/`Unrelated` cell and no `Held` cell for the port leaves. That is the gap the new table fills.
- `Predicate.test.ts`: `scope: "Any"` folding `:196-208` (`describe` at `:152`: `HasActed` folds to `True`, `HasNotActed` to `False`; `:206`: `HasNotActed` `True` when the subject has not acted); the agreement property `describe("INV-QD-018: a predicate admits exactly the rows the evaluator allows")` at `:879` whose leaf arbitrary includes `P.hasActed(e, { scope: "Any" })` (`:968`), and the resource-free `freeLeaf` arbitrary with `hasActed` and `hasNotActed` `scope: "Any"` at `:1340-1341`. These are the "scope: Any acted agreement" tests of VERD-03: they stay unedited. The `acted` layer at `Predicate.test.ts:47-49` answers `Acted` for `"onboarded"` and `NotActed` otherwise (a hand-built `Layer.succeed(DecisionHistory, …)`; fine, it constructs no port error).
- `LeafNeeds.test.ts:~190-226`: allow is `True` and deny is `False` for every constant-folding leaf, with `constants === 18`; a `HasAction` deny keeps its reason.

### Q5b. The new characterisation: `packages/core/test/LeafVerdict.test.ts`

Written and committed on the untouched base (after the mutation base is recorded), using **only** `evaluate`, `toPredicate`, `Policy` constructors, `scriptedPort`/`PortReply`, `testLayer`, `subjectWith`. It imports nothing from `LeafNeeds.ts`, so it compiles and passes on the base and is unchanged after (green before and after, the VERD-03 requirement).

Drive each cell as `(leaf, scripted answer, polarity) → { allowed, policyTag, reason }`, asserting `trace.policyTag` on both allow and deny (this is also what closes the `HasCustom` Walk survivor). Cells (every reason string is from Q2):

| Leaf | Answers to script | How |
|---|---|---|
| `HasActed` / `HasNotActed`, `scope: "Any"` and `"Resource"` | `Acted`, `NotActed`, `Unknown` × both polarities (12 cells) | `scriptedPort(decisionHistoryPort, () => PortReply.answer("Acted"))`, passed as `testLayer(subject, { DecisionHistory: <layer> })`. Resource scope needs `{ resource: { id: "inv-1" } }` |
| `HasRelationship` | `Related`, `Unrelated`, `Unknown` | `scriptedPort(relationshipResolverPort, …)`; needs a resource with an `id` |
| `HasCustom` | `true`, `false` | `scriptedPort(customPredicatePort, …)`; asserts the `custom predicate 'c' returned false` sentence |
| `HasSignature` | no signatures (`NoneOnFile`), one non-matching (`NoneMatching`), non-matching with `signerRole` set (the ` and signer role` suffix), one matching | `signatureHistoryFromSignatures([...])` or `scriptedPort(signatureHistoryPort, …)`; needs a resource with an `id` |
| `HasPermission`, `HasRole`, `HasAction` | held / not held | subject permissions/roles, request action |
| `HasAttribute` | all five `Verdict` values: `Held`, `NotHeld` (including a `neq` for the "matched an excluded value" sentence), `ValueAbsent`, `ReferenceAbsent`, `Incomparable` | subject attributes and matcher choice; existing `Evaluate.test.ts` cases pin the sentences, copy their policies |
| `HasResourceAttribute` | the same five | resource rows |

Plus, for the leaves that fold, the same cell through `toPredicate` and `evaluatePredicate` (compare `evaluate`'s `allowed` with the predicate's `True`/`False`): role, permission, action, subject-side `HasAttribute`, `HasActed`/`HasNotActed` with `scope: "Any"`. For the acted pair assert the full table `Acted → (True, False)`, `NotActed → (False, True)`, `Unknown → (False, False)`. A relationship, custom or signature leaf gets one assertion that `toPredicate` refuses it with the same message `LeafFixtures.ts` records (`PolicyNotTranslatable`).

`PORT_DOUBLE_BUDGET`: the scripted answers above construct no port error, so no budget entry is needed. A script that needs a failing port is **not** part of this table (existing tests cover `PortReply.fail/die/throw`).

### Q5c. After the change: a unit test of the record (RED by import)

In `LeafNeeds.test.ts`, a new `describe("LEAF_VERDICTS")` importing `LEAF_VERDICTS` and `isHeld` (RED on the base because they do not exist, as 53 did for `Operand.test.ts`): one row per leaf tag (the keys equal `Object.keys(P.leafCases(() => 0))`), each row's outcome for every answer, `isHeld(v) === holds(v)` for all five `Verdict` values, and the barrel not exporting either name. In `LeafNeeds.tst.ts`: a row set missing `HasCustom` is refused; a row returning a value outside its outcome union is refused; a leaf variant whose tag has no entry in `LeafVerdictRows` is refused (mirror the existing `LeafNeeds.tst.ts` style; read it before writing).

## Mutation (D-10, WX-05)

- **Config:** `stryker.config.mjs` at the repo root (there is none under `packages/core`). `mutate` is `packages/core/src/**/*.ts`; run scoped with `--mutate`. `jsonReporter.fileName` is `reports/mutation/mutation.json`. `thresholds.break` is 80. [VERIFIED: stryker.config.mjs read]
- **Phase 53's harness** `.planning/phases/QD-53-…/53-mutation.mjs`: `base|after|compare`, reads the report, refuses a report older than the newest `src`/`test` file or one whose `source` differs from disk, writes `counts`, `measured` and `survivors` (identity = mutator | status | replacement | original text | whole source line). `compare` applies D-14 with a `MOVED` list and a `RENAMED` map. Copy it to `54-mutation.mjs`, retarget `D`, `BASE`, `MOVED`.
- **Files Phase 54 touches:** `packages/core/src/LeafNeeds.ts`, `Walk.ts`, `Predicate.ts`. `Matcher.ts`, `Compare.ts`, `PortAccess.ts` are **not** edited (D-04, D-06); do not put them in `BASE` (53 included them because it edited them). `BASE = [LeafNeeds.ts, Predicate.ts, Walk.ts]`, `MOVED = [Predicate.ts, Walk.ts]`.
- **Last known scores (orientation; a Phase 54 base run replaces them):** `Walk.ts` 0.9481 (292 killed, 13 survived, 3 no-coverage, 16 survivors, `53-mutation-after.json`); `Predicate.ts` 1.0 (293 killed, 0 survivors); `LeafNeeds.ts` 0.9811 (52 killed, 1 survivor, from Phase 50's after-run, i.e. before Phase 53 and 54; Phase 53 never measured it). [VERIFIED: the two JSON files read this session]
- **Expected movement:** `Walk.ts` and `Predicate.ts` lose killed mutants to `LeafNeeds.ts`; `LeafNeeds.ts` gains rows. The comparer must additionally assert `LeafNeeds.ts` detects at least as many mutants as `Walk.ts` + `Predicate.ts` lost (53's `det(o) < left` check, generalised from one new file to one base file whose detected count must grow by at least `left`).
- Do not run Stryker as part of research or alongside any other run; the planner schedules it.

## Records (D-12, WX-02, VERD-04)

- **ADR-QD-163 text** lives at `spec/decisions/163-what-a-leaf-needs-from-the-request-is-stated-once.md` (Rev 1.7). Its Decision 4 is "The port-free judgements are written once (D-10). `holdsRole`, `holdsPermission` and `holdsAction` live in the same …". The new ADR is `spec/decisions/167-<slug>.md` (Document ID `QADI-ADR-167`, status "Accepted — extends ADR-QD-163; keeps ADR-QD-020, ADR-QD-024"), modelled on `166-one-module-owns-the-value-a-leaf-compares.md`; add an index entry to `spec/decisions/index.yaml`; add an amendment pointer in ADR-163 (53 did this for ADR-091 and ADR-024) and one in ADR-020/024 if their text claims the polarity or the two-walks rule (read them first). Record the mutation before/after table and the informational bench numbers in the ADR (D-10).
- **Behaviour placement** (Claude's discretion; model: 53-07 put BEH-601 in `04-matchers`, 602/603 in `16-predicates`, 604 in `06-services`, 605 in `32-custom-predicates`):
  - BEH-QD-606: every leaf's answer becomes a verdict in one row; both interpreters read it, neither restates it. `spec/behaviors/05-evaluator.md`, next to BEH-QD-589 (port-free judgements, "see ADR-QD-163") and BEH-QD-590 (leaf-needs table, `:~320-350`).
  - BEH-QD-607: an acted `Unknown` holds under neither polarity, in both interpreters. `spec/behaviors/12-history.md` (BEH-QD-090 "Three values", BEH-QD-091 "`hasNotActed` is not `not(hasActed)`", BEH-QD-093 "Unknown is a denial").
  - BEH-QD-608: `toPredicate` folds a leaf through the same row; its plan carries the leaf, not a wanted answer. `spec/behaviors/16-predicates.md` (BEH-QD-127 "The two interpreters agree").
  - BEH-QD-609: each denial kind has one reason sentence, unchanged. `spec/behaviors/05-evaluator.md` or `06-services.md` next to BEH-QD-045 ("A denial's reason names only what was consulted").
  - BEH-QD-610: the matcher leaves' rows delegate to `judgeMatcher`; no comparison meaning restated. `spec/behaviors/04-matchers.md` (BEH-QD-305 "comparison semantics have one owner").
  Per CONTEXT, if a number ends up unused, the CCR row says "Unused: BEH-QD-6xx".
- **Invariants** (`spec/invariants.md`): INV-QD-353 "Every leaf tag has one verdict row, read by both interpreters" (sibling of INV-QD-345 at the "Every leaf tag has one row in the leaf-needs table" heading, `:~4001`); INV-QD-354 "An acted `Unknown` holds under neither polarity". **INV-QD-014 already exists** ("An unwired history port denies both polarities", `invariants.md:414`); 354 must cross-reference it and state the new fact (one row decides it, in both interpreters) rather than duplicate its text. Restating a heading in place is how 53 kept INV-QD-091's inbound anchors.
- **Traceability** (`spec/traceability.md`): rows for BEH-606..610, INV-353/354, ADR-167, the new `LeafVerdict.test.ts` row in the test-file table (`:~389` pattern for `LeafNeeds.test.ts`) and amend the `05 — Evaluator` row (`:47`) which lists `LeafNeeds.ts` (`holdsRole`, `holdsPermission`, `holdsAction`, BEH-QD-589; `LEAF_NEEDS` …).
- **CCR-QD-445 row**: `spec/README.md`, after the CCR-QD-444 row (`:381`); also bump `spec/README.md`'s own Change History (Rev 1.247 → 1.248) through `scripts/spec-revise.mjs`. Revise every behaviour doc, `invariants.md`, `traceability.md` and the ADR through the script, then `node scripts/spec-revise.mjs --check`.
- **Overview and gate 13:** no export is added or removed, so `spec/overview.md` needs no row. Expect `pnpm spec:api` unchanged (935). `spec/overview.md`'s change history is not touched unless a package-private note is wanted.
- **AGENTS.md:** no cited location moves (`Walk.ts` keeps `evaluateNode` and the three fnUntraced functions; `PortAccess.ts` unchanged). AGENTS.md §5 says `Walk.ts`'s `evaluateActed` family are "plain functions that turn an answer into a verdict". After this phase they turn an outcome into a `Trace`; the sentence stays true (a `Trace` is a verdict) and D-12 says edit AGENTS.md only if a location moves, so leave it. Mention it to the user in the SUMMARY. Both budget tables unchanged. [VERIFIED: AGENTS.md read; budgets read in `scripts/check-house-style.mjs:376-381, 464-467`]
- **Changeset (D-11):** one file, e.g. `.changeset/leaf-verdict-stated-once.md`: `"@qadi/core": patch`, one paragraph saying the verdict step of every leaf is now one package-private record that `evaluate` and `toPredicate` both read, with reasons and results unchanged. No "Breaking", no `upgrading.md` entry. Follow `.changeset/leaf-needs-stated-once.md` and `.changeset/operand-read-in-one-place.md`.
- **Reserved-but-unused:** all of BEH-606..610 and INV-353..354 are used by the layout above; if the planner drops one, name it "Unused: …" in the CCR-QD-445 row (53's `53-07-SUMMARY` states the same expectation).

## Runtime State Inventory

Not a rename/refactor-of-names phase: no string, key or id is renamed, and nothing persisted or registered embeds the moved code. Explicitly:

| Category | Items Found | Action Required |
|---|---|---|
| Stored data | None — verified by the phase being package-private source with unchanged reason strings; no key, collection or id changes | none |
| Live service config | None — no external service names a symbol touched here | none |
| OS-registered state | None | none |
| Secrets/env vars | None | none |
| Build artifacts | `packages/core/lib/` is a build output; `.stryker-tmp/` holds stale sandboxes | `pnpm typecheck` rebuilds; keep `.stryker-tmp` out of every grep |

Persisted `Trace.reason` strings are the one stored artefact that depends on this code (decisions are logged and replayed through `SinkCodec`); D-06's byte-identical reasons are what keeps them stable, so the characterisation test is the migration guard.

## Code Examples

### `Predicate.ts` after (shape; line numbers are today's)
```ts
// Source: edits to Predicate.ts:303-311, :382-389, :398-406, :590-597 (read this session).
type Plan =
  | { readonly _tag: "Constant"; readonly value: boolean }
  | { readonly _tag: "Column"; readonly predicate: Predicate }
  | { readonly _tag: "AskAttribute"; readonly leaf: LeafOf["HasAttribute"] }
  | { readonly _tag: "AskActed"; readonly leaf: AnyActedLeaf }   // `wanted` deleted
  // ...

const history = (leaf: LeafOf["HasActed"] | LeafOf["HasNotActed"]): Compiled =>
  isAnyActedLeaf(leaf)
    ? planned({ _tag: "AskActed", leaf })
    : refused(leaf._tag, "a resource-scoped history question is keyed by the row");

HasRole: (p) => planned({ _tag: "Constant", value: isHeld(LEAF_VERDICTS.HasRole(holdsRole(subject, p))) }),

// in run:
AskAttribute: (p) =>
  Effect.map(readAttribute("toPredicate", subject, p.leaf), (value) =>
    constant(isHeld(LEAF_VERDICTS.HasAttribute(p.leaf, value, context)))),
AskActed: (p) =>
  Effect.map(askActed("toPredicate", subject, p.leaf, undefined), (answer) =>
    constant(isHeld(LEAF_VERDICTS[p.leaf._tag](answer)))),
```

### `Walk.ts` leaf arms after (shape)
```ts
case "HasRole":
  return Effect.succeed(
    isHeld(LEAF_VERDICTS.HasRole(holdsRole(subject, policy)))
      ? allow("HasRole", policy.fields)
      : deny("HasRole", `subject lacks role '${policy.role}'`),
  );

case "HasAttribute": {
  const absent = absenceOf(policy, request.supplied);
  if (absent !== undefined) return Effect.fail(errorOf(absent));
  return Effect.map(readAttribute("evaluate", subject, policy), (value) => {
    const verdict = LEAF_VERDICTS.HasAttribute(policy, value, matcherContext);
    return isHeld(verdict)
      ? allow("HasAttribute", policy.fields)
      : deny("HasAttribute", attributeReason("subject", policy.attribute, verdict, policy.matcher));
  });
}
```
The `evaluateNode` `switch` and every `absenceOf`/`errorOf` call stay exactly as they are (SWITCH_BUDGET, INV-QD-011).

## State of the Art

| Old approach | Current approach | When | Impact |
|---|---|---|---|
| Each interpreter turns an answer into held/not held itself | One keyed record, both read it | ADR-QD-163 did this for the three port-free leaves (2026-11-16); this phase finishes it | Removes the acted duplicate and the per-interpreter restatement |
| `Verdict` for matcher leaves only (ADR-QD-091) | `LeafOutcome` superset with `Verdict` as a member | this phase | one `isHeld` for every outcome |

**Deprecated/outdated:** none. No dependency moves.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | The outcome names `Performed` / `NotPerformed`, `NoneOnFile` / `NoneMatching`, `Unrelated` / `Unknown`, `LEAF_VERDICTS`, `isHeld` are acceptable domain words | Q1 | Cosmetic; CONTEXT leaves naming to Claude, but the user may prefer others |
| A2 | Keeping `holdsRole`/`holdsPermission`/`holdsAction` as answer producers and having the three rows consume their boolean (rather than the rows absorbing them) is the better reading of D-02/D-01 | Summary, Q1 | If the user wants the rows to absorb them, `LeafNeeds.test.ts`'s `holdsRole` etc. tests and BEH-QD-589 change and `Walk`/`Predicate` import one thing fewer; no behaviour risk |
| A3 | A single bench run per side is enough for the informational record | Q4 | None to correctness; D-08 says it is not a gate |
| A4 | Stryker's dry run requires a green suite | Pitfall 4 | Order of commits only |
| A5 | BEH placement across 05/12/16/04 (and which of 05/06 holds BEH-609) | Records | Cosmetic; CONTEXT leaves it to Claude |
| A6 | No module-local alias of the rows is needed in `Walk.ts`/`Predicate.ts` until the informational bench shows a regression | Q4 | A measurable per-leaf slowdown under vitest bench; fixable afterwards with the ARCH-08 T8 alias pattern |
| A7 | ADR-QD-020 and ADR-QD-024 carry text that wants an amendment pointer (not read in full this session) | Records | A missed pointer fails a doc review, not a gate |

## Open Questions

1. **Should `holds*` be absorbed into the rows (CONTEXT discretion)?**
   - What we know: D-02 lists "boolean membership" as an answer type, and D-01 says the step lives "beside" `holds*`; `LeafNeeds.test.ts` calls all three directly.
   - What's unclear: whether the user wants `Walk`/`Predicate` to import only `LEAF_VERDICTS`.
   - Recommendation: keep them as answer producers (A2). It costs one extra call per port-free leaf and no behaviour change. If the planner prefers absorption, the row signatures become `(leaf, subject)` / `(leaf, action)` and BEH-QD-589 is amended.
2. **`isHeld` or widening `Compare.ts`'s `holds`?**
   - Recommendation: `isHeld` in `LeafNeeds.ts` plus an agreement test; `Compare.ts` is ADR-091's.
3. **Does `LeafNeeds.ts` or `Walk.ts` own the exported denial-outcome types the reason tables need?**
   - Recommendation: `LeafNeeds.ts` exports `ActedOutcome`, `RelationshipOutcome`, `SignatureOutcome` (the rows define them); `Walk.ts` imports them as types.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node | scripts, tests | yes | v26.13.0 | — |
| pnpm + vitest | tests, bench | yes | vitest 5.1.0 | — |
| tsc, tstyche, madge | typecheck, type tests, circular gate | yes | repo-pinned | — |
| Stryker | mutation | yes (repo script) | per config | planner schedules it; not run here |
| `/usr/bin/grep` | scoped greps (zsh aliases `grep` to ugrep) | yes | — | — |

No external services. **Missing dependencies with no fallback:** none.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest 5.1.0 + `@effect/vitest`, fast-check, tstyche (`*.tst.ts`), Stryker |
| Config file | root `vitest.config.ts` (projects `packages/*`), `packages/core/vitest.config.ts` (`name: "core"`, bench include `bench/**/*.bench.ts`), `stryker.config.mjs` |
| Quick run command | `pnpm exec vitest run --project core LeafVerdict LeafNeeds LeafMatrix Predicate Evaluate PortAccess < /dev/null` (repo root only; stdin closed) |
| Full suite command | `pnpm check:pr < /dev/null` (repo root) |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| VERD-03 | every leaf tag × answer × polarity → allow/deny + exact reason + `policyTag`, through `evaluate`; folds agree through `toPredicate` | unit | `pnpm exec vitest run --project core LeafVerdict < /dev/null` | ❌ Wave 0 (new, written on the base) |
| VERD-03 | `scope: "Any"` acted agreement stays green, unedited | property | `pnpm exec vitest run --project core Predicate -t "INV-QD-018" < /dev/null` | ✅ `Predicate.test.ts:879` |
| VERD-01 | polarity map and verdict rule once | shell | the Pitfall 6 greps, baseline measured first | ✅ (commands) |
| VERD-02 | walk keeps reasons, translator keeps folding | unit + shell | `LeafVerdict` + the second Pitfall 6 grep | ❌ Wave 0 |
| VERD-02 | one row per leaf tag, outcomes, `isHeld` ≡ `holds` | unit | `pnpm exec vitest run --project core LeafNeeds < /dev/null` | ✅ file, ❌ new `describe` (RED by import) |
| VERD-02 | missing row / wrong outcome refused | type test | `pnpm test:tstyche` | ✅ `LeafNeeds.tst.ts`, ❌ new pins |
| VERD-04 | budgets unchanged | gate | `pnpm lint` (`node scripts/check-house-style.mjs`); `git diff <base> --stat -- scripts/check-house-style.mjs AGENTS.md` empty | ✅ |
| WX-01 | gate green | full | `pnpm check:pr < /dev/null` | ✅ |
| WX-02 | only reserved ids | shell | id diff grep over the phase's added lines; reservation file unchanged | ✅ |
| WX-03 | no export change | gate | `pnpm spec:api` | ✅ |
| WX-04 | no forbidden construct | gate | `pnpm lint` | ✅ |
| WX-05 | coverage ≥ 95% core; mutation not below base (D-10) | coverage + mutation | `pnpm coverage`; Stryker scoped run, then `node .planning/phases/QD-54-…/54-mutation.mjs compare` | ❌ Wave 0 (`54-mutation.mjs`, `54-mutation-base.json`) |
| WX-06 | characterisation before change | git | first `packages/core/src` commit after base is later than the `LeafVerdict.test.ts` commit | ✅ |
| WX-07 | patch changeset only | shell | `/usr/bin/grep -c Breaking .changeset/<new>.md` prints 0 | ✅ |

### Sampling Rate
- **Per task commit:** the quick command scoped with `-t`, plus `pnpm typecheck` when a signature moves.
- **Per wave merge:** `pnpm exec vitest run --project core < /dev/null`, `pnpm circular`, `pnpm lint`, `pnpm test:tstyche`.
- **Phase gate:** `pnpm check:pr < /dev/null` green, then the mutation after-run and comparer, then the scoped greps. Never run Stryker alongside vitest or `check:pr`.

### Wave 0 Gaps
- [ ] `54-mutation.mjs` + `54-mutation-base.json`, recorded on the untouched green tree, committed alone before any test (Pitfall 4)
- [ ] `packages/core/test/LeafVerdict.test.ts` — the base characterisation (Q5b)
- [ ] An informational `pnpm exec vitest bench …` run of `Evaluate.bench.ts` on the base, kept out of the repo or in the phase dir
- Suggested order: base facts and mutation base → `LeafVerdict.test.ts` (green) → RED `LeafNeeds.test.ts`/`.tst.ts` additions → `LeafNeeds.ts` rows → `Walk.ts` → `Predicate.ts` → mutation after + compare + bench after → records (ADR, BEH, INV, traceability, CCR row, changeset) → `check:pr` and scoped greps. `use_worktrees` is false, so plans touching `Walk.ts` and `Predicate.ts` run one at a time.

## Security Domain

`security_enforcement` is enabled (absent = enabled; `security_asvs_level: 1` in `.planning/config.json`). This phase touches the authorization evaluator, so the relevant control is **fail-closed correctness**, not input handling.

### Applicable ASVS Categories
| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | — |
| V3 Session Management | no | — |
| V4 Access Control | yes | Closed per-tag outcome unions + `Match.exhaustive`/closed reason tables; `Unknown` denies both polarities (INV-QD-014); no default arm that holds |
| V5 Input Validation | no (no new input; decoded policy keys are Phase 53's) | — |
| V6 Cryptography | no | — |

### Known Threat Patterns for this stack
| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| An unmapped or defaulted outcome treated as held (fail-open) | Elevation of Privilege | `isHeld` is true only for the literal `"Held"`; every row's return type is a closed union; a new denial kind is a compile error in the walk's tables and rows |
| A new leaf tag shipped with no verdict row | Elevation of Privilege | `satisfies { [K in LeafTag]: … }` (TS2741) plus a `.tst.ts` pin |
| Walk and translator disagree on an acted leaf (the row restated twice) | Tampering with the decision | One row, read by both; the `INV-QD-018` agreement property stays green |
| A changed deny reason leaking a value or breaking replay | Information Disclosure / Repudiation | Reasons byte-identical (D-06), pinned by `LeafVerdict.test.ts`; the reason tables take names (event, relation, meaning, signer role), never an attribute value (INV-QD-029) |

## Project Constraints (from CLAUDE.md / AGENTS.md)

- Imports: `effect/*` submodule namespace imports; relative imports carry `.ts`; `import type` for type-only (`verbatimModuleSyntax`). In `LeafNeeds.ts` the new type imports are `import type`.
- No `as`, `as any`, `!`, `any`, `Record<string, unknown>` (user memory: a hack). `as const` and `satisfies` are not assertions and are already how `LEAF_NEEDS` is written.
- `Match` not `switch`; the three budgeted switches stay and no new `switch` is added (`SWITCH_BUDGET`: `Walk.ts` 1, `Matcher.ts` 2).
- `Effect.fnUntraced` count unchanged (`UNTRACED_BUDGET`: `Walk.ts` 3). Rows are plain functions; `evaluateActed` and friends stay plain functions.
- Closed union over widening: write each outcome union out in full.
- Prefer complete over simple: all ten tags get a row, including the three `toPredicate` refuses (D-05).
- Doc-comment shape: one-line summary first, the why (ADR-QD-163/167, INV citations) after.
- Spec is normative: ADR, BEH, INV, traceability, CCR row, `spec-revise.mjs`; `typescript` fences in `spec/` are compiled (prefer prose or `ts` fences for signatures).
- No placeholder ids (`ADR-QD-NEXT` etc.) in source or tests; never run `next-id.mjs`.
- Test doubles: a broken port is scripted (`scriptedPort`), never a hand-built error (`PORT_DOUBLE_BUDGET`).
- Hand-wrapped lines at about 90 columns; `oxfmt` is not a gate.
- No release, publish or version-packages merge (standing instruction).
- Shell: zsh, `/usr/bin/grep`, vitest from the repo root with stdin closed.

## Sources

### Primary (HIGH confidence, read or run this session)
- `packages/core/src/LeafNeeds.ts` (whole), `Walk.ts` (whole), `Predicate.ts` (1-130, 255-696), `PortAccess.ts` (300-521), `Matcher.ts` (1-60, 620-738), `Compare.ts` (via grep), `DecisionHistory.ts`, `RelationshipResolver.ts`, `SignatureHistory.ts` (type excerpts), `PortDoubles.ts`, `PortDescription.ts` (`PortReply`), `Resource.ts` (`resourceIdOf`)
- `packages/core/test/LeafNeeds.test.ts`, `LeafMatrix.test.ts`, `LeafFixtures.ts`, `Evaluate.test.ts` and `Predicate.test.ts` (the cited ranges), `packages/core/bench/Evaluate.bench.ts`
- `stryker.config.mjs`, `scripts/check-house-style.mjs` (budget tables), `package.json` scripts, `.planning/config.json`
- `.planning/phases/QD-53-…` (`53-RESEARCH.md` pitfalls, `53-mutation.mjs`, `53-mutation-base/after.json`, `53-07-SUMMARY.md`, `53-VALIDATION.md`), `.planning/milestones/v1.5-phases/QD-50-…` (`50-RESEARCH.md` Q5, `50-BENCH.md`, `50-mutation-after.json`)
- `spec/decisions/163-…md` (head), `spec/behaviors/05-evaluator.md` (BEH-QD-589/590), `spec/invariants.md` (INV-QD-345/346, INV-QD-014 heading), `spec/README.md` (CCR rows), `.changeset/leaf-needs-stated-once.md`, `.changeset/operand-read-in-one-place.md`
- A scratch TypeScript project (outside the repo) typechecking the record, the union-indexed call, and two negative probes; `madge --json` reachability; a green run of 417 tests

### Secondary (MEDIUM)
- Phase 50's timing statements on host load (not re-measured)

### Tertiary (LOW)
- none

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH, nothing new is installed
- Architecture (record, outcome types, interpreter edits): HIGH, typechecked in scratch; the in-repo edits themselves are not yet compiled against `Walk.ts`/`Predicate.ts`
- Pitfalls: HIGH for import graph, survivor identity and budgets; MEDIUM for bench cost
- Mutation outcome: MEDIUM until a Phase 54 base run replaces the Phase 50/53 figures

**Research date:** 2026-11-18
**Valid until:** until Phase 55 starts editing the same registers, or any commit touches `Walk.ts`, `Predicate.ts` or `LeafNeeds.ts`
