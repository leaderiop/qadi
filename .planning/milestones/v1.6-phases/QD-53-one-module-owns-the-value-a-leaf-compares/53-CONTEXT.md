# Phase 53: One module owns "the value a leaf compares" - Context

**Gathered:** 2026-11-18
**Status:** Ready for planning

<domain>
## Phase Boundary

A key that a decoded policy names (an attribute, a column, a ref path or a FieldMatch field) is read as an own property by exactly one package-private module, `packages/core/src/Operand.ts`, beside `Compare.ts`. Every interpreter reads the value a leaf compares through it, so the reference interpreter `evaluatePredicate` can no longer allow a row that `evaluate` denies, and INV-QD-091's "cannot disagree by construction" covers the operand read as well as the verdict. ADR-QD-091 (one owner of operator meaning), ADR-QD-024 (the two walks stay two) and the `SWITCH_BUDGET` switches in `Matcher.ts` (`judgeMatcher`, `resolveRef`) are unchanged. Shared wave rules: `.planning/phases/_WAVE11-CONTEXT.md` (which defers to `_SHARED-CONTEXT.md`).

Requirements: OPND-01, OPND-02, OPND-03, OPND-04, OPND-05, WX-01, WX-02, WX-03, WX-04, WX-05, WX-06, WX-07. Reserved ids: ARCH-100, ADR-QD-166, CCR-QD-444, BEH-QD-601 to 605, INV-QD-351 to 352. Never run `node scripts/next-id.mjs`.

</domain>

<decisions>
## Implementation Decisions

### Scope: which readers move
- **D-01:** The seven readers named in the roadmap move to the module: `Walk.ts` `HasResourceAttribute` (:343-350), `PortAccess.ts` `readAttribute` (:348), `Matcher.ts` `getByPath` (:341-353) and FieldMatch (:725-740), `FieldPath.ts` `projectAt` (:332), `Decision.ts` `isFieldOf` (:289), and `Predicate.ts`'s `Compare`/`MemberOf` arms (:163-164, the defect).
- **D-02 (new finding, accepted into scope):** both fixture builders also read the decoded key without the own-property guard, and both move to the module, each RED-first:
  - `AttributeResolver.ts:227` `attributeResolverFromRecord`: `resolve: (_, attribute) => Effect.succeed(table[attribute])`. Probe on the built `lib`: `evaluate(hasAttribute("constructor", neq(literal("x"))))` **allows** under `attributeResolverFromRecord({ dept: "eng" })` and denies under `AttributeResolverNone`. This is a fail-open in `evaluate` itself, in a configuration the doc calls "useful for tests and fixed configuration".
  - `CustomPredicate.ts:289` `customPredicateFromRecord`: `const registered = table[name]`. Probe: `hasCustom("constructor")` and `hasCustom("toString")` **die** ("Fiber.runLoop: Not a valid effect"), and `hasCustom("hasOwnProperty")` fails with a `TypeError` message. All three should fail with the documented `CustomPredicateError` "no predicate is registered under this name". AGENTS.md: an authorization decision must never become a defect.
  - Both feed `PORT_FIXTURES` (`Ports.ts:259-268`), which `@qadi/testing`'s review layer and devtools' Fixtures simulation use.
- **D-03:** Lookups on module-owned tables (`ShortCircuit.ts`, `FieldLattice.ts`, `GateState.ts`, `HydrationMetrics.ts`) are out of scope. Each asks "is this word a row of my own closed table" (ADR-QD-152's keyed-table pattern), not "what value does a leaf compare".
- **D-04:** `SinkCodec.ts`'s envelope key reads (:636, :641) are out of scope. Phase 57 deletes the hand-rolled stored reader.
- **D-05:** `getByPath` stays public (`spec/overview.md:148`, imported by devtools' `model/Remedies.ts`). Its body moves into `Operand.ts`, and `Matcher.ts` re-exports it (`export { getByPath } from "./Operand.ts"`), the precedent `Compare.ts`'s `Verdict` set at `Matcher.ts:374`. Public name, signature and behaviour are unchanged; the overview row's note says where it now lives.

### The module's interface
- **D-06:** `packages/core/src/Operand.ts`, package-private: out of the barrel (AGENTS.md §9) and not an entry point (ADR-QD-099). "The value a leaf compares" is the operand.
- **D-07:** It offers three pure, synchronous, span-free functions:
  - a single-key own read: the value at `key`, or `undefined` when `key` is not an own property;
  - the dot-path own read `getByPath`, keeping today's `indexOf` walk (no intermediate segment array);
  - an own-key check written as a type predicate (it replaces `Decision.ts`'s `isFieldOf` crossing from `string` to `keyof A & string`).
  Where a reader needs it, "own key holding `undefined`" stays distinct from "no key": `readAttribute` consults the resolver only when the key is not own, and `projectAt` keeps an own `undefined`. The comparison path allocates nothing per read (no `Present | Absent` result object). Exact names and signatures are Claude's discretion.
- **D-08:** The why is stated once, in `Operand.ts`'s header: a decoded policy is untrusted input; `JSON.parse` gives an object its own `__proto__` key without touching the real prototype; an inherited `Object.prototype` member reads as absent, so a prototype-named key behaves like any other missing key. The six "mirroring" comments are deleted with no per-site pointer comment, because the import is the pointer.
- **D-09:** The projection write guards stay where they are: `Object.create(null)` in `FieldPath.ts` and `Object.defineProperty` in `Decision.ts`. They are writes of untrusted keys, not operand reads.

### Tests and evidence
- **D-10 (RED first, WX-06):** committed on the phase base and seen RED before any source change:
  - the roadmap probe: `hasResourceAttribute("constructor", neq(literal("x")))` on `{ id: "r1" }`, where `evaluate` denies and `evaluatePredicate(toPredicate(…))` must deny too (it returns `true` on the base);
  - `evaluate(hasAttribute("constructor", neq(literal("x"))))` denies under `attributeResolverFromRecord({ dept: "eng" })` (it allows on the base);
  - `hasCustom("constructor" | "toString" | "hasOwnProperty")` under `customPredicateFromRecord(table)` fails with `CustomPredicateError` "no predicate is registered under this name" (on the base it dies, dies, and fails with a `TypeError` message).
- **D-11 (OPND-04):** a **new** property beside `Predicate.test.ts`'s "PROPERTY: the two interpreters agree, row by row" (:1000). That property's generators and seeded sample stay byte-identical. The new property's leaves name the five prototype names (`constructor`, `toString`, `__proto__`, `hasOwnProperty`, `valueOf`) alongside ordinary names, on `HasResourceAttribute` attributes, `ResourceRef`/`SubjectRef` paths (including dotted `a.constructor` and `__proto__.x`) and FieldMatch field names. It runs over rows that lack those keys and rows that hold them as own keys, built with `JSON.parse` so `__proto__` is a real own key. It asserts `evaluate` ≡ `evaluatePredicate ∘ toPredicate`.
- **D-12:** `packages/core/test/Operand.test.ts` pins own, inherited, and `JSON.parse`'s own `__proto__` for each of the three functions. `getByPath`'s boundary pins (trailing dot, doubled dot, single segment, empty path) move there from `Matcher.test.ts`, and one test pins that `Matcher.ts`'s public `getByPath` is the module's function.
- **D-13:** the predicate-sql and predicate-prisma `EngineAgreement` suites are run, not edited, and stay green.
- **D-14 (WX-05, adopted from Phase 50's D-13):** record `53-mutation-base.json` for every touched file at the phase base. A touched file whose score drops passes only when its survivor set is unchanged and the drop is exactly the killed mutants that moved into `Operand.ts`, where they are still killed. The SUMMARY and ADR-QD-166 record the before and after scores, the identical survivor list, and where the moved mutants went. Any other drop is closed with a test, never re-baselined.

### Records and enforcement
- **D-15:** `@qadi/core` **patch** changeset, written as fixes with no type change: `evaluatePredicate` no longer admits a row through an inherited member; `attributeResolverFromRecord` answers `undefined` for a non-own name; `customPredicateFromRecord` fails with its documented `CustomPredicateError` instead of dying. No other package changes.
- **D-16:** no new house-style gate. The defect was a bare `row[key]`, which an `Object.hasOwn` count cannot see. The enforcement is D-11's agreement property plus `Operand.test.ts`, and a scoped grep is a phase verification (no `Object.hasOwn` on a decoded key and no "mirroring" comment left in the files D-01 and D-02 name).
- **D-17:** ADR-QD-166 extends ADR-QD-091 (the operand read is the half of a comparison ADR-091 left out) and ADR-QD-024 (two walks stay two). It records D-02's finding and probe, and D-14's mutation numbers. INV-QD-091 is restated in place: the matcher and its predicate leaf read the operand through the same own-property read. INV-QD-351: every interpreter and both fixture builders read a decoded key only through `Operand.ts`. INV-QD-352: an inherited member reads as absent, so a prototype-named key behaves like any missing key. CCR-QD-444 and BEH-QD-601 to 605 cover the rest (placement is Claude's discretion: `16-predicates.md`, `04-matchers.md`, `06-services.md`); an unused reservation is named "Unused: …" in the CCR row. AGENTS.md is edited only if a location it cites moves.

### Claude's Discretion
- Exact names and signatures of `Operand.ts`'s three functions (D-07), and how the own-key check reads at `readAttribute` and `projectAt`.
- BEH row placement and wording across the behaviour files, and the INV wording (D-17).
- Plan split. The roadmap's planning note applies: RED and the mutation base first, then the module with one reader converted at a time, then records; re-run `pnpm circular` after the first move.

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `Compare.ts`: the package-private sibling the module sits beside (pure, synchronous, span-free, string-literal verdicts), and the re-export precedent `export type { Verdict } from "./Compare.ts"` at `Matcher.ts:374`.
- `Matcher.ts`'s `isObject` (:315) and the `getByPath` `indexOf` walk (:341-353), which moves verbatim.
- `Predicate.test.ts`'s agreement harness (:960-1023: `leaf`, `tree`, `rows`, `translate`, `layer`, `show`), which the new property reuses with its own generators.

### Established Patterns
- Untrusted-key reads return `undefined` for a non-own key. `Compare.ts`'s verdicts turn `undefined` into `ValueAbsent`, which denies (INV-QD-092).
- `readAttribute` (`PortAccess.ts:342-351`) is subject-first, then the resolver on a miss. The "miss" must stay "not an own key", not "value is `undefined`".
- `projectAt` (`FieldPath.ts:332`) skips a non-own key but keeps an own key holding `undefined`.
- Hot paths: `getByPath` runs once per ref resolution, per matcher node, per evaluation, and once per element under `filter`/`decideSubjects` (AGENTS.md §5/§5a). No allocation is added.

### Integration Points
- `Walk.ts` `evaluateNode` `HasResourceAttribute` arm (budgeted switch #1 stays a switch).
- `Matcher.ts` `resolveRef` (budgeted switch #3 stays a switch) calls `getByPath`; the FieldMatch arm of `judgeMatcher` (budgeted switch #2) reads the field.
- `Predicate.ts` `dispatchPredicate` `Compare`/`MemberOf` arms, and the `SubjectRef` fold at :220 (`getByPath`).
- `AttributeResolver.ts:222-228`, `CustomPredicate.ts:274-298`, and `Ports.ts` `PORT_FIXTURES`.
- `spec/overview.md:148` (`getByPath` row), `spec/invariants.md:2823` (INV-QD-091), `spec/behaviors/16-predicates.md`, `04-matchers.md`, `06-services.md`.

</code_context>

<specifics>
## Specific Ideas

- Probe script used during discuss (scratch only, against the built `packages/core/lib`):
  - 1: `evaluate` Deny, `toPredicate` → `Compare(constructor, Neq, "x")`, `evaluatePredicate(row)` → `true`.
  - 2: `attributeResolverFromRecord({ dept: "eng" })` → `evaluate` Allow; `AttributeResolverNone` → Deny.
  - 3: `hasCustom("isOwner")` Allow; `"nope"` fails with "no predicate is registered under this name"; `"constructor"`/`"toString"` die "Not a valid effect"; `"hasOwnProperty"` fails with "TypeError: Cannot convert undefined or null to object".
- Re-verify the line numbers above against `44510112` (`git diff 44510112 --stat -- packages/` was empty on 2026-11-18).

</specifics>

<deferred>
## Deferred Ideas

None. The discussion stayed within phase scope. D-02 widened it to the two fixture builders, by decision.

</deferred>
