# Phase 53: One module owns "the value a leaf compares" - Research

**Researched:** 2026-11-18
**Domain:** Own-property reads of decoded policy keys in `@qadi/core` (TypeScript, Effect v4); mutation/spec/gate mechanics of this repo
**Confidence:** HIGH (every site, line number and gate was read or run this session; the two timing figures are `[ASSUMED]`)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Scope: which readers move**
- **D-01:** The seven readers named in the roadmap move to the module: `Walk.ts` `HasResourceAttribute` (:343-350), `PortAccess.ts` `readAttribute` (:348), `Matcher.ts` `getByPath` (:341-353) and FieldMatch (:725-740), `FieldPath.ts` `projectAt` (:332), `Decision.ts` `isFieldOf` (:289), and `Predicate.ts`'s `Compare`/`MemberOf` arms (:163-164, the defect).
- **D-02 (new finding, accepted into scope):** both fixture builders also read the decoded key without the own-property guard, and both move to the module, each RED-first:
  - `AttributeResolver.ts:227` `attributeResolverFromRecord`: `resolve: (_, attribute) => Effect.succeed(table[attribute])`. Probe on the built `lib`: `evaluate(hasAttribute("constructor", neq(literal("x"))))` **allows** under `attributeResolverFromRecord({ dept: "eng" })` and denies under `AttributeResolverNone`. This is a fail-open in `evaluate` itself, in a configuration the doc calls "useful for tests and fixed configuration".
  - `CustomPredicate.ts:289` `customPredicateFromRecord`: `const registered = table[name]`. Probe: `hasCustom("constructor")` and `hasCustom("toString")` **die** ("Fiber.runLoop: Not a valid effect"), and `hasCustom("hasOwnProperty")` fails with a `TypeError` message. All three should fail with the documented `CustomPredicateError` "no predicate is registered under this name". AGENTS.md: an authorization decision must never become a defect.
  - Both feed `PORT_FIXTURES` (`Ports.ts:259-268`), which `@qadi/testing`'s review layer and devtools' Fixtures simulation use.
- **D-03:** Lookups on module-owned tables (`ShortCircuit.ts`, `FieldLattice.ts`, `GateState.ts`, `HydrationMetrics.ts`) are out of scope. Each asks "is this word a row of my own closed table" (ADR-QD-152's keyed-table pattern), not "what value does a leaf compare".
- **D-04:** `SinkCodec.ts`'s envelope key reads (:636, :641) are out of scope. Phase 57 deletes the hand-rolled stored reader.
- **D-05:** `getByPath` stays public (`spec/overview.md:148`, imported by devtools' `model/Remedies.ts`). Its body moves into `Operand.ts`, and `Matcher.ts` re-exports it (`export { getByPath } from "./Operand.ts"`), the precedent `Compare.ts`'s `Verdict` set at `Matcher.ts:374`. Public name, signature and behaviour are unchanged; the overview row's note says where it now lives.

**The module's interface**
- **D-06:** `packages/core/src/Operand.ts`, package-private: out of the barrel (AGENTS.md §9) and not an entry point (ADR-QD-099). "The value a leaf compares" is the operand.
- **D-07:** It offers three pure, synchronous, span-free functions:
  - a single-key own read: the value at `key`, or `undefined` when `key` is not an own property;
  - the dot-path own read `getByPath`, keeping today's `indexOf` walk (no intermediate segment array);
  - an own-key check written as a type predicate (it replaces `Decision.ts`'s `isFieldOf` crossing from `string` to `keyof A & string`).
  Where a reader needs it, "own key holding `undefined`" stays distinct from "no key": `readAttribute` consults the resolver only when the key is not own, and `projectAt` keeps an own `undefined`. The comparison path allocates nothing per read (no `Present | Absent` result object). Exact names and signatures are Claude's discretion.
- **D-08:** The why is stated once, in `Operand.ts`'s header: a decoded policy is untrusted input; `JSON.parse` gives an object its own `__proto__` key without touching the real prototype; an inherited `Object.prototype` member reads as absent, so a prototype-named key behaves like any other missing key. The six "mirroring" comments are deleted with no per-site pointer comment, because the import is the pointer.
- **D-09:** The projection write guards stay where they are: `Object.create(null)` in `FieldPath.ts` and `Object.defineProperty` in `Decision.ts`. They are writes of untrusted keys, not operand reads.

**Tests and evidence**
- **D-10 (RED first, WX-06):** committed on the phase base and seen RED before any source change:
  - the roadmap probe: `hasResourceAttribute("constructor", neq(literal("x")))` on `{ id: "r1" }`, where `evaluate` denies and `evaluatePredicate(toPredicate(…))` must deny too (it returns `true` on the base);
  - `evaluate(hasAttribute("constructor", neq(literal("x"))))` denies under `attributeResolverFromRecord({ dept: "eng" })` (it allows on the base);
  - `hasCustom("constructor" | "toString" | "hasOwnProperty")` under `customPredicateFromRecord(table)` fails with `CustomPredicateError` "no predicate is registered under this name" (on the base it dies, dies, and fails with a `TypeError` message).
- **D-11 (OPND-04):** a **new** property beside `Predicate.test.ts`'s "PROPERTY: the two interpreters agree, row by row" (:1000). That property's generators and seeded sample stay byte-identical. The new property's leaves name the five prototype names (`constructor`, `toString`, `__proto__`, `hasOwnProperty`, `valueOf`) alongside ordinary names, on `HasResourceAttribute` attributes, `ResourceRef`/`SubjectRef` paths (including dotted `a.constructor` and `__proto__.x`) and FieldMatch field names. It runs over rows that lack those keys and rows that hold them as own keys, built with `JSON.parse` so `__proto__` is a real own key. It asserts `evaluate` ≡ `evaluatePredicate ∘ toPredicate`.
- **D-12:** `packages/core/test/Operand.test.ts` pins own, inherited, and `JSON.parse`'s own `__proto__` for each of the three functions. `getByPath`'s boundary pins (trailing dot, doubled dot, single segment, empty path) move there from `Matcher.test.ts`, and one test pins that `Matcher.ts`'s public `getByPath` is the module's function.
- **D-13:** the predicate-sql and predicate-prisma `EngineAgreement` suites are run, not edited, and stay green.
- **D-14 (WX-05, adopted from Phase 50's D-13):** record `53-mutation-base.json` for every touched file at the phase base. A touched file whose score drops passes only when its survivor set is unchanged and the drop is exactly the killed mutants that moved into `Operand.ts`, where they are still killed. The SUMMARY and ADR-QD-166 record the before and after scores, the identical survivor list, and where the moved mutants went. Any other drop is closed with a test, never re-baselined.

**Records and enforcement**
- **D-15:** `@qadi/core` **patch** changeset, written as fixes with no type change: `evaluatePredicate` no longer admits a row through an inherited member; `attributeResolverFromRecord` answers `undefined` for a non-own name; `customPredicateFromRecord` fails with its documented `CustomPredicateError` instead of dying. No other package changes.
- **D-16:** no new house-style gate. The defect was a bare `row[key]`, which an `Object.hasOwn` count cannot see. The enforcement is D-11's agreement property plus `Operand.test.ts`, and a scoped grep is a phase verification (no `Object.hasOwn` on a decoded key and no "mirroring" comment left in the files D-01 and D-02 name).
- **D-17:** ADR-QD-166 extends ADR-QD-091 (the operand read is the half of a comparison ADR-091 left out) and ADR-QD-024 (two walks stay two). It records D-02's finding and probe, and D-14's mutation numbers. INV-QD-091 is restated in place: the matcher and its predicate leaf read the operand through the same own-property read. INV-QD-351: every interpreter and both fixture builders read a decoded key only through `Operand.ts`. INV-QD-352: an inherited member reads as absent, so a prototype-named key behaves like any missing key. CCR-QD-444 and BEH-QD-601 to 605 cover the rest (placement is Claude's discretion: `16-predicates.md`, `04-matchers.md`, `06-services.md`); an unused reservation is named "Unused: …" in the CCR row. AGENTS.md is edited only if a location it cites moves.

### Claude's Discretion
- Exact names and signatures of `Operand.ts`'s three functions (D-07), and how the own-key check reads at `readAttribute` and `projectAt`.
- BEH row placement and wording across the behaviour files, and the INV wording (D-17).
- Plan split. The roadmap's planning note applies: RED and the mutation base first, then the module with one reader converted at a time, then records; re-run `pnpm circular` after the first move.

### Deferred Ideas (OUT OF SCOPE)
None. The discussion stayed within phase scope. D-02 widened it to the two fixture builders, by decision.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| OPND-01 | RED regression test on the phase base for `hasResourceAttribute("constructor", neq(literal("x")))` on `{ id: "r1" }`; GREEN after | Probe reproduced this session (see Summary). Test home and names in Validation Architecture; RED-by-assertion, runs in ~2 s |
| OPND-02 | One package-private module beside `Compare.ts`: single-key own read + dot-path own read | Proposed signatures typechecked under the repo's strict flags (Architecture Patterns, Pattern 1); import-free so no cycle |
| OPND-03 | Every interpreter reads leaf values only through it; no other `Object.hasOwn` on a decoded key; "mirroring" comments gone | Complete reader census (Q1) and per-site before/after (Pattern 2); scoped-grep baseline and command (Validation Architecture) |
| OPND-04 | Agreement property over prototype names; predicate-sql/prisma engine suites green | Harness reuse and what `toPredicate` folds/refuses (Q5); engine suites need no DB, 1.2 s, green on base (Q6) |
| OPND-05 | ADR-QD-166 extends ADR-091 and ADR-024; INV-QD-091 restated | Records mechanics (Q7): index.yaml, amendment precedent, anchor pitfall |
| WX-01 | `pnpm check:pr < /dev/null` green at phase end | Command and host notes in Validation Architecture |
| WX-02 | ADR/CCR/BEH/INV/traceability using only reserved numbers; `next-id` never run | All reserved ids verified free; reservation file content recorded |
| WX-03 | `spec/overview.md` names every added export (gate 13) | No export added or removed; re-export parse verified by reading the gate |
| WX-04 | Nothing new from the forbidden list; budgets change only with AGENTS.md table | No budget moves; proposed code uses none of `as`/`!`/`any`/`switch`/`fnUntraced` |
| WX-05 | Coverage thresholds hold; Stryker score of touched files does not fall | Mutation procedure, files, ordering trap, survivor-identity trap (Q4) |
| WX-06 | Behaviour change preceded by RED test; preserved behaviour by characterisation | RED set plus GREEN characterisation set (Q8) |
| WX-07 | Public breaks recorded as Breaking | None expected: patch changeset, no signature change (one behavioural note in Pitfalls) |
</phase_requirements>

## Summary

The defect is real and reproduces on the current tree. Running the discuss-time probe against the built `packages/core/lib` this session printed: `1 evaluate: Deny | predicate: {"_tag":"Compare","column":"constructor","op":"Neq","value":"x"} | evaluatePredicate(row): true`; `2 evaluate, AttributeResolverNone: Deny | attributeResolverFromRecord({dept}): Allow`; and for `hasCustom`: `isOwner` Allow, `nope` fails with the documented error, `constructor` and `toString` `THREW/DEFECT Fiber.runLoop: Not a valid effect`, `hasOwnProperty` fails with `TypeError: Cannot convert undefined or null to object`. `git diff 44510112 --stat -- packages scripts spec .changeset AGENTS.md` is empty; HEAD is `feebcfac` (docs-only commits on top of `44510112`). `[VERIFIED: probe run this session]`

All nine reader sites (7 from D-01, 2 from D-02) are at the stated lines. A census of every index/`hasOwn`/`Reflect`/`in` read in `packages/core/src` found **no other reader of a decoded policy key**. The only fix that changes an interpreter's answer is `Predicate.ts:163-164`; the other six moves are behaviour-preserving, and the two fixture builders change behaviour only for prototype-named keys. Only `Neq` (and an `inArray`/`eq` against an inherited function's value, which cannot be written in JSON) can show the divergence through `toPredicate`, because every other matcher denies an inherited function (`Incomparable` or `NotHeld`) on both sides.

The module is a leaf with no imports, so it cannot create a cycle (`pnpm circular` is clean today: "No circular dependency found!"). The two real risks are procedural, not design: (1) Stryker's dry run needs a green suite, so the mutation base must be recorded **before** the RED tests are committed; (2) survivor identities in the Phase 50 comparer include the full source line, so a survivor sitting on a line this phase edits (`Decision.ts:356`, `isFieldOf(data, field)`) changes identity when the call is renamed and the comparer must be told. A third, performance, risk has a repo precedent: importing a function into a hot module costs a getter per call under vitest's module runner (ADR-QD-091), so `Matcher.ts` and `Predicate.ts` should bind module-local consts the way they already do for `Compare.ts`.

**Primary recommendation:** Add `packages/core/src/Operand.ts` (import-free; `ownValue`, `isOwnKey`, `getByPath`), convert `Predicate.ts` first (turns OPND-01 GREEN), then one reader per task, with the mutation base recorded on the untouched green tree before the RED commit.

## Architectural Responsibility Map

This is a library; the "tiers" are its internal layers.

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Reading the value a leaf compares (own-key rule) | Operand module (`Operand.ts`, new, package-private) | — | The rule is a fact about untrusted keys, not about any one interpreter (ADR-QD-091's gap) |
| What a comparison means | `Compare.ts` (unchanged) | — | ADR-QD-091; the operand read feeds it |
| Matcher judgement / ref resolution | `Matcher.ts` | `Operand.ts` (reads) | `judgeMatcher`, `resolveRef` stay budgeted switches |
| Evaluation walk | `Walk.ts` | `Operand.ts` | Only the `HasResourceAttribute` cell read moves |
| Port attribute read (subject-first, resolver on miss) | `PortAccess.ts` | `Operand.ts` | Needs the own-key check *and* the value; miss stays "not own" |
| Reference interpreter | `Predicate.ts` `evaluatePredicate` | `Operand.ts` | The defect site |
| Field projection | `FieldPath.ts`, `Decision.ts` | `Operand.ts` | Reads move; null-prototype / `defineProperty` write guards stay (D-09) |
| Test/fixed-config port fixtures | `AttributeResolver.ts`, `CustomPredicate.ts` (via `Ports.ts` `PORT_FIXTURES`) | `Operand.ts` | Table lookups by a decoded name |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `Object.hasOwn` (ES2022 built-in) | Node v26.13.0 | The own-property test | Already the repo's rule at every existing guard; no dependency |
| `effect` | repo catalog (`pnpm-workspace.yaml`, lock-pinned) | `Effect.fn`, `Match` in callers | Unchanged; `Operand.ts` imports nothing from it |
| `vitest` + `@effect/vitest` | vitest v5.1.0 (printed by the run) | Tests | Existing |
| `fast-check` | repo-installed | New agreement property | Same harness as `Predicate.test.ts` |
| `@stryker-mutator/vitest-runner` | stryker 10.1.1 (`pnpm exec stryker --version`) | Mutation base/after | `stryker.config.mjs` requires `>=10.1.1` |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Three exports | A 4th exported `isObject` | Would deviate from locked D-07; a private 1-line guard duplicated in `Operand.ts` is cheaper |
| `Result`/`Option` read | `Present \| Absent` object | Rejected by D-07 (allocation on the hot path) |
| New house-style gate | `Object.hasOwn` count | Rejected by D-16 (cannot see a bare `row[key]`) |

**Installation:** none. **Version verification:** no package is added.

## Package Legitimacy Audit

No external package is installed or added by this phase. `Packages removed due to [SLOP] verdict:` none. `Packages flagged as suspicious [SUS]:` none. The planner needs no `checkpoint:human-verify` install task.

## Architecture Patterns

### System Architecture Diagram

```
decoded Policy (untrusted JSON)             caller-built rows / subjects / tables
   │ attribute | column | ref path | field | custom name
   ▼
┌──────────────────────────────────────────────────────────────────────┐
│ Operand.ts  (package-private, imports nothing)                       │
│   ownValue(cell, key)  →  V | undefined      (own only)              │
│   isOwnKey(data, key)  →  key is keyof A & string                    │
│   getByPath(input, "a.b.c") → unknown        (own only, indexOf walk)│
└───────────────┬──────────────────────────────────────────────────────┘
   used by      │
   ┌────────────┼───────────────┬───────────────┬──────────────┬───────────────┐
   ▼            ▼               ▼               ▼              ▼               ▼
Walk.ts     PortAccess.ts   Matcher.ts      FieldPath.ts   Predicate.ts   AttributeResolver.ts
HasResource  readAttribute   resolveRef,     projectAt      Compare/       CustomPredicate.ts
Attribute    (isOwnKey then  FieldMatch,                    MemberOf       (fixture tables)
             ownValue; miss  re-exports                     arms +
             → resolver)     getByPath (D-05)               SubjectRef fold
                              │                  Decision.ts isOwnKey replaces isFieldOf
                              ▼
                         Compare.ts verdicts (ADR-QD-091, unchanged)
                              │
          evaluate (walk)  ◄──┴──►  evaluatePredicate ∘ toPredicate   (two walks stay two, ADR-QD-024)
```

### Recommended Project Structure
```
packages/core/src/
├── Operand.ts          # NEW. Header states the why once (D-08). No imports.
├── Compare.ts          # unchanged (header may gain one sentence naming Operand.ts)
├── Matcher.ts          # imports ownValue/getByPath; `export { getByPath } from "./Operand.ts"`
└── …readers above
packages/core/test/
└── Operand.test.ts     # NEW (D-12)
```

### Pattern 1: The module (typechecked this session)
Scratch copy compiled clean with `tsc --ignoreConfig --noEmit --strict --noUncheckedIndexedAccess --exactOptionalPropertyTypes --verbatimModuleSyntax --allowImportingTsExtensions --target es2023 --module esnext --moduleResolution bundler` (`TSC-OK`), including usages mirroring all nine sites. `[VERIFIED: tsc run, scratchpad `opnd/`]`

```typescript
// Operand.ts — signatures proposed; names are Claude's discretion (D-07).
const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null;

/** The value at `key`, or undefined when `key` is not an own property.
 *  Undefined for an own key holding undefined too: ask isOwnKey when that matters. */
export const ownValue = <V>(cell: Readonly<Record<string, V>>, key: string): V | undefined =>
  Object.hasOwn(cell, key) ? cell[key] : undefined;

export const isOwnKey = <A extends object>(data: A, key: string): key is keyof A & string =>
  Object.hasOwn(data, key);

export const getByPath = (input: unknown, path: string): unknown => {
  if (path === "") return input;
  let current: unknown = input;
  let start = 0;
  const length = path.length;
  for (;;) {
    const dot = path.indexOf(".", start);
    const end = dot === -1 ? length : dot;
    const part = path.slice(start, end);
    if (!isObject(current) || !isOwnKey(current, part)) return undefined;
    current = current[part];
    if (dot === -1) return current;
    start = dot + 1;
  }
};
```
The `getByPath` body above is the `Matcher.ts:341-353` body verbatim except `Object.hasOwn(current, part)` becomes `isOwnKey(current, part)` (same-module call, no getter cost). It may equally move byte-for-byte. Move the long `indexOf`/allocation doc comment with it.

### Pattern 2: Before/after per site (current text read this session)

| Site | Before (verbatim) | After |
|------|-------------------|-------|
| `Walk.ts:350` | `const value = Object.hasOwn(row, policy.attribute) ? row[policy.attribute] : undefined;` | `const value = ownValue(row, policy.attribute);` Delete comment :343-349 (the `mirroring \`readAttribute\`` block); keep the `??` note |
| `PortAccess.ts:348-350` | `return Object.hasOwn(subject.attributes, attribute)` / `? Effect.succeed(subject.attributes[attribute])` / `: resolveAttribute(interpreter, request);` | `isOwnKey(subject.attributes, attribute) ? Effect.succeed(ownValue(subject.attributes, attribute)) : resolveAttribute(interpreter, request)`. The miss stays "not an own key"; an own `undefined` still skips the resolver. Two `hasOwn` per read, no allocation |
| `Matcher.ts:341-353` | `export const getByPath = …` body | Deleted; `import { getByPath, ownValue } from "./Operand.ts";` plus `export { getByPath } from "./Operand.ts";` (precedent: `import type { Verdict }` at :25 and `export type { Verdict }` at :374) |
| `Matcher.ts:740` (FieldMatch) | `Object.hasOwn(value, self.field) ? value[self.field] : undefined,` | `ownValueLocal(value, self.field),`. `!isObject(value) ? "Incomparable"` stays in `Matcher.ts` (a matcher fact; arrays are objects, so `fieldMatch("length", …)` on `[1,2,3]` still reads own `length`). Delete comment :725-731 |
| `Matcher.ts:315` `isObject` | private | Stays (FieldMatch's `Incomparable` test). `Operand.ts` keeps a private copy |
| `FieldPath.ts:332-334` | `if (!Object.hasOwn(frame.value, key)) continue;` / `const child = frame.value[key];` | `if (!isOwnKey(frame.value, key)) continue;` / `const child = ownValue(frame.value, key);` Keeps an own `undefined` (probe on built lib: `project({a:undefined,b:1},["a"])` has keys `['a']`). Reword prose at :13 and :22 (`mirrors \`Matcher.ts\`'s \`getByPath\``) |
| `Decision.ts:286-289, 356` | `const isFieldOf = <A extends Resource>(data: A, field: string,): field is keyof A & string => Object.hasOwn(data, field);` | Delete; `import { isOwnKey } from "./Operand.ts"`; `if (isOwnKey(data, field)) {`. `projected[field]` at :358 is a read of a key from `Object.keys(projected)` of the null-prototype projection (D-09 territory), leave |
| `Predicate.ts:163-164` | `Compare: (p) => (row: Row) => holdsLocal(compareLocal(p.op, row[p.column], p.value)),` and `MemberOf: (p) => (row: Row) => holdsLocal(memberLocal(row[p.column], p.values)),` | `…compareLocal(p.op, ownValueLocal(row, p.column), p.value)` / `…memberLocal(ownValueLocal(row, p.column), p.values)`; add `const ownValueLocal = ownValue;` beside `compareLocal` (:129-131). `Predicate.ts:33` imports `getByPath` from `./Matcher.ts`: change to `./Operand.ts` |
| `AttributeResolver.ts:227` | `resolve: (_subjectId, attribute) => Effect.succeed(table[attribute]),` | `Effect.succeed(ownValue(table, attribute))` (V = unknown) |
| `CustomPredicate.ts:289` | `const registered = table[name];` | `const registered = ownValue(table, name);` (V inferred as the predicate function type; the existing `registered === undefined ? Effect.fail(new CustomPredicateError({ name, reason: "no predicate is registered under this name", }))` branch now covers prototype names) |

### Pattern 3: Module-local binding for hot imports
`Matcher.ts` and `Predicate.ts` already bind imported `Compare.ts` functions to module-local consts, with this recorded reason: "under a module runner that turns each imported binding into a getter (vitest's, which `pnpm bench` uses) a direct call paid that getter on every node" (`Matcher.ts` comment above `equalsLocal`; ADR-QD-091 (c) measured ~2.4x). Follow it: `const ownValueLocal = ownValue; const getByPathLocal = getByPath;` in `Matcher.ts` (used by `resolveRef`, a budgeted switch that stays a switch) and `const ownValueLocal = ownValue;` in `Predicate.ts`. Module-level consts are `ignoreStatic` mutants, so they add nothing to the score.

### Anti-Patterns to Avoid
- **A fourth export, a `Present | Absent` result, or a segment array in `getByPath`:** violates D-07 and the allocation rule.
- **Using the type predicate's narrowing and then a bare `data[key]`:** that is exactly the defect pattern; read through `ownValue`.
- **Restating a "mirrors X" comment at a call site:** D-08 forbids a per-site pointer.
- **Changing the `INV-QD-091` heading text:** its anchor `inv-qd-091-a-primitive-matcher-and-its-predicate-leaf-are-one-function` is linked from `spec/behaviors/04-matchers.md`, `spec/decisions/091-…md`, `spec/invariants.md` and twice from `spec/traceability.md`; ADR-QD-156's history records a prior "link uses the restated heading's anchor" fix. Restate the body, keep the heading (or update all five links).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| A broken-port test double | Hand-written failing port layer | `scriptedPort(attributeResolverPort, …)` (AGENTS.md §6, `PORT_DOUBLE_BUDGET`) | Budgeted; a test that needs the resolver *not consulted* can use `scriptedPort(...).calls` |
| Metric reads in tests | `Metric.snapshot` id lookup | exported series | `METRIC_ID_LITERAL_BUDGET` |
| Untrusted JSON decode | `JSON.parse` in `packages/*/src` | `untrustedDecoder` | §7a budget. `Operand.ts` must contain no `JSON.parse`/`Schema.decode*` token (comments are stripped by the gate, so the header may mention `JSON.parse`); tests are exempt |
| A shape-checking `isObject` shared across files | exporting `Matcher.ts`'s | private copy | Keeps the export count at the locked three |

**Key insight:** the rule is five characters (`Object.hasOwn`); the defect came from nine places each having to remember it. One module is the fix, and the agreement property is what proves it, because no count can see a bare `row[key]`.

## Runtime State Inventory

(Refactor phase: reads move, no string is renamed.)

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | None. No store keys on a read helper; policies persisted as JSON are untouched. `[VERIFIED: census, no datastore reads in the touched files]` | none |
| Live service config | None | none |
| OS-registered state | None | none |
| Secrets/env vars | None | none |
| Build artifacts | `packages/core/lib` is built output and currently holds the base behaviour (the probe runs against it); `pnpm typecheck` (`tsc -b`) regenerates it and adds `lib/Operand.js`. `reports/mutation/*` is gitignored (`.gitignore:19 reports/*`) and overwritten per Stryker run. `.stryker-tmp/` exists | rebuild via `pnpm typecheck`; never trust the existing `reports/mutation/mutation.json` as a base |

## Common Pitfalls

### Pitfall 1: RED tests break Stryker's dry run
**What goes wrong:** committing the intentionally RED tests first, then running the mutation base, makes the initial test run fail.
**Why:** Stryker's dry run requires a green suite `[ASSUMED: standard Stryker behaviour, not re-run here]`.
**How to avoid:** record `53-mutation-base.json` on the untouched, green tree, commit it, then add RED tests.
**Warning signs:** "failed tests in the initial test run".

### Pitfall 2: Survivor identity includes the source line
**What goes wrong:** the Phase 50 comparer's identity is `mutatorName | status | replacement | original text | full line`. A survivor on a line this phase edits looks like "gone + new", so D-14's "survivor set unchanged" fails literally.
**Known case:** `Decision.ts:356` `if (isFieldOf(data, field)) {` ConditionalExpression → `true` (Survived; the guard is always true because `field` comes from `Object.keys(projected)`). Renaming the call to `isOwnKey` changes the line. Handle it explicitly in the comparer (a declared rename map) or keep the line text; document it in the SUMMARY.
**Other survivors in touched regions** (`FieldPath.ts:331` `if (key === undefined) continue;`, `CustomPredicate.ts:287` and `:294` string literals) sit on lines that do not change text, so their identity is stable.
`[VERIFIED: reports/mutation/mutation.json, generated 2026-11-16 on the same source for these files; orientation only]`

### Pitfall 3: Matcher.ts's score will fall by construction
Region `Matcher.ts:314-353` holds 32 mutants (30 killed, 1 timeout, 1 ignored) and the FieldMatch arm 8 (all killed); `Matcher.ts` has exactly 5 survivors (lines 365, 421 ×2, 613 ×2) with a score of 0.9775. Moving the killed ones out lowers the numerator with the survivor count fixed, which is exactly what D-14 allows, provided `Operand.ts` kills them (Operand.test.ts must pin own/inherited/`JSON.parse` `__proto__` for all three functions before the old tests move).

### Pitfall 4: Behaviour change for class-instance rows
`evaluatePredicate(predicate, row)` formerly read inherited accessors too (a row that is a class instance with prototype getters). Own-only reads make such a row read as absent and deny, matching `evaluate` (which already reads resources own-only). Callers in the repo pass plain objects (`features/step-definitions/PredicateThenSteps.ts`, `Bridge.ts:304`, the engine suites, `RenderablePredicate.ts:312,344` with `{ [column]: value }` computed-key rows). Say so in the changeset and BEH-QD-602. `[ASSUMED: no external consumer passes class-instance rows]`

### Pitfall 5: Hot-path getter cost
See Pattern 3. Run `Compare.bench.ts` and `Evaluate.bench.ts` ("matcher-heavy — 3 refs") before/after as an informational check (no gate in this phase; `pnpm check` does not run benches). `packages/core/bench/Dispatch.bench.ts:37` imports `getByPath` from `../src/Matcher.ts`; the D-05 re-export keeps it compiling.

### Pitfall 6: Gate 13 parse
`export { getByPath }` with no `from` is `UNSUPPORTED` in `check-api-surface.mjs`. The `from "./Operand.ts"` form is required (regex `^export (?:type )?\{([^}]*)\} from "` matched `export { getByPath } from "./Operand.ts";` in a node check this session). `[VERIFIED: scripts/check-api-surface.mjs read, regex run]`

### Pitfall 7: Prose that trips the scoped grep
`FieldPath.ts:13` and `:218` mention `Object.hasOwn` in doc comments. The code-line grep filters comments; still reword :13 and :22 so no stale "mirrors getByPath" remains.

## Code Examples

### The RED probe as a test (OPND-01), shape only
```typescript
// Predicate.test.ts, inside describe("INV-QD-018: …"), reusing translate/layer (module scope)
it.effect("a prototype-named column denies on both sides", () =>
  Effect.gen(function* () {
    const policy = P.hasResourceAttribute("constructor", M.neq(M.literal("x")));
    const row = { id: "r1" };
    const predicate = yield* translate(policy);
    const decision = yield* evaluate(policy, { resource: row }).pipe(Effect.provide(layer));
    assert.isFalse(isAllowed(decision));
    assert.isFalse(evaluatePredicate(predicate, row)); // true on the base: RED
  }));
```

### Fixture builders (D-10 second and third bullets)
```typescript
// Layers.test.ts (resolver) and CustomPredicate.test.ts (registry); names illustrative
// evaluate(P.hasAttribute("constructor", M.neq(M.literal("x")))) under
//   attributeResolverFromRecord({ dept: "eng" })  -> Deny (Allow on base)
// for (const name of ["constructor", "toString", "hasOwnProperty"])
//   Effect.flip(CustomPredicate.evaluate(name, alice, undefined, undefined))
//     -> error._tag === "CustomPredicateError", reason "no predicate is registered under this name"
```
The existing sibling test is `CustomPredicate.test.ts` "fails, rather than denies, on a name the table does not recognize" (`customPredicateFromRecord({})`, `Effect.flip`, asserts `_tag` and `name`).

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Rule restated per reader with "mirrors" comments | One owner for the operand read | this phase | Same shape as ADR-QD-091 for comparison meaning |
| Bare `row[column]` in the reference interpreter | Own-only read | this phase | INV-QD-091 covers the read as well as the verdict |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Stryker's dry run fails on a failing test, so the base must precede RED tests | Pitfall 1 | Low: ordering base-first is safe either way |
| A2 | A scoped Stryker run over 8 files takes about 2-4 minutes (extrapolated: Phase 50 recorded 54 s for 3 files / 703 mutants; the 8 files total about 1,500 mutants in the 2026-11-16 report) | Validation | Low: planning only |
| A3 | No external consumer passes class-instance rows to `evaluatePredicate` | Pitfall 4 | Medium: changelog wording must tell them |
| A4 | A before/after bench shows no regression when module-local bindings are used | Pitfall 5 | Low: informational, no gate |

## Open Questions

1. **Survivor-identity handling for `Decision.ts:356`.**
   - What we know: the survivor is on a line the rename edits.
   - What's unclear: whether to add a rename map to the comparer or keep the call text.
   - Recommendation: comparer rename map `isFieldOf(data, field)` → `isOwnKey(data, field)`, recorded in the SUMMARY; do not re-baseline.
2. **Own `undefined` read cost in `projectAt`/`readAttribute` (two `hasOwn` per read).**
   - Recommendation: accept (no allocation; not per-node hot). If a reviewer objects, the alternative is a bare read after the type predicate, which reintroduces the pattern D-16 describes.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node | everything | yes | v26.13.0 | — |
| pnpm | scripts | yes | 10.17.1 | — |
| Stryker | WX-05 | yes | 10.1.1 | — |
| vitest | tests | yes | v5.1.0 | — |
| PGlite, `node:sqlite`, Prisma + better-sqlite3 | engine-agreement suites | yes, in-process | — | none needed; no DB or container |
| `packages/predicate-prisma/prisma/generated` | prisma suite | yes (`client.js` present) | — | `globalSetup.ts` runs `prisma generate` if absent |
| `packages/core/lib` (built) | scratch probe only | yes | — | `pnpm typecheck` rebuilds |

**Missing dependencies with no fallback:** none. Host load was ~2.5 at research time.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest v5.1.0 + `@effect/vitest`; fast-check; tstyche for `*.tst.ts` |
| Config file | `vitest.config.ts` (root `projects: ["packages/*"]`), `packages/core/vitest.config.ts` (project name `core`), `packages/predicate-sql/vitest.config.ts` (`predicate-sql`), `packages/predicate-prisma/vitest.config.ts` (`predicate-prisma`) |
| Quick run command | `pnpm exec vitest run --project core Operand Predicate Matcher Layers CustomPredicate FieldPath Evaluate PortAccess < /dev/null` (the same list without `Operand` ran 10 files / 642 tests in 1.9 s this session) |
| Full suite command | `pnpm check:pr < /dev/null` (16 steps: typecheck, lint, circular, test:tstyche, coverage, test:bdd, spec:examples, spec:verify:strict, spec:gates, spec:claims, spec:api, spec:package, example, spec:website-examples, website, spec:publish; mutation skipped). Always from the repo root, stdin closed (astro check prompt, per STATE.md) |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| OPND-01 | prototype-named column denies on both sides; RED on base, GREEN after | unit | `pnpm exec vitest run --project core Predicate -t "prototype-named column" < /dev/null` | ❌ Wave 0 (RED plan) |
| OPND-01 (D-02) | `evaluate(hasAttribute("constructor", neq(literal("x"))))` denies under `attributeResolverFromRecord` | unit | `pnpm exec vitest run --project core Layers < /dev/null` | ❌ Wave 0 |
| OPND-01 (D-02) | `hasCustom("constructor"\|"toString"\|"hasOwnProperty")` fails with `CustomPredicateError` | unit | `pnpm exec vitest run --project core CustomPredicate < /dev/null` | ❌ Wave 0 |
| OPND-02 | module exists, import-free, outside the barrel, no cycle | unit + shell | `pnpm exec vitest run --project core Operand < /dev/null`; `bash -c '/usr/bin/grep -c "^import" packages/core/src/Operand.ts'` prints 0; `bash -c '/usr/bin/grep -c Operand packages/core/src/index.ts'` prints 0; `pnpm circular` | ❌ Wave 0 |
| OPND-03 | no code-line `Object.hasOwn` in the 8 files; no mirroring comment; each file imports `./Operand.ts` | shell | `bash -c 'cd packages/core/src && /usr/bin/grep -nE "Object\.hasOwn" Walk.ts PortAccess.ts Matcher.ts FieldPath.ts Decision.ts Predicate.ts AttributeResolver.ts CustomPredicate.ts \| /usr/bin/grep -vE ":[0-9]+:[[:space:]]*(//\|\\*\|/\\*)"'` must print nothing. **Baseline measured today: 6 code lines** (`Decision.ts:289`, `FieldPath.ts:332`, `Matcher.ts:350`, `Matcher.ts:740`, `PortAccess.ts:348`, `Walk.ts:350`). Mirroring phrases (fixed strings, must print nothing after): `mirroring \`readAttribute\``, `already guard the same way`, `reason \`getByPath\` above needs it`, `mirrors \`Matcher.ts\`'s \`getByPath\``. Bare reads of the two fixture tables: `table[attribute]`, `table[name]`, `row[p.column]` absent | ✅ (commands) |
| OPND-04 | `evaluate` ≡ `evaluatePredicate ∘ toPredicate` over prototype-named keys | property | `pnpm exec vitest run --project core Predicate -t "prototype names" < /dev/null` (RED on base: at least one `Neq` disagreement); engines: `pnpm exec vitest run --project predicate-sql --project predicate-prisma EngineAgreement < /dev/null` (20 tests, 1.2 s, green on base) | ❌ Wave 0 / ✅ |
| OPND-05 | ADR extends 091/024; INV-QD-091 covers the operand read | spec gates | `node scripts/spec-revise.mjs --check`; `pnpm spec:verify:strict`; `/usr/bin/grep -c "extends ADR-QD-091" spec/decisions/index.yaml` | ❌ records plan |
| WX-01 | gate green | full | `pnpm check:pr < /dev/null` | ✅ |
| WX-02 | only reserved ids used, `next-id` never run | shell | `git diff <phase_base> -U0 -- spec .changeset packages AGENTS.md \| /usr/bin/grep '^+' \| /usr/bin/grep -oE '(ADR\|CCR\|BEH\|INV)-QD-[0-9]+' \| sort -u` must be within ADR-QD-166, CCR-QD-444, BEH-QD-601..605, INV-QD-351..352 plus pre-existing ids cited; `cat "$(git rev-parse --git-common-dir)/qadi-reserved-ids.json"` still `CCR 452, ADR 174, BEH 645, INV 368` | ✅ |
| WX-03 | gate 13 | gate | `pnpm spec:api` | ✅ |
| WX-04 | no forbidden construct, no budget moved | shell + gate | `pnpm lint`; `git diff <phase_base> --stat -- scripts/check-house-style.mjs` empty; `git diff <phase_base> -U0 -- packages/core/src \| /usr/bin/grep -E '^\+.*(\bswitch\b\|fnUntraced\|\basync\b\|\bawait\b\| as \|!\.)'` prints nothing | ✅ |
| WX-05 | coverage and mutation not below base | coverage + mutation | `pnpm coverage`; mutation procedure below | ❌ base JSON |
| WX-06 | RED committed before any `src` change | git | node one-liner: first commit touching `packages/core/src` after `<phase_base>` is later than the RED test commit; RED output pasted in the SUMMARY | ❌ |
| WX-07 | no Breaking entry | shell | `/usr/bin/grep -c Breaking .changeset/<new-file>.md` prints 0; `git diff --name-only <phase_base> -- .changeset` is the one `@qadi/core` patch file | ❌ |

### Mutation procedure (Q4 answer)
- **Config and invocation:** `stryker.config.mjs` (core; `jsonReporter` writes `reports/mutation/mutation.json`; `thresholds break: 80`; `ignoreStatic: true`; `coverageAnalysis: "perTest"`). Scoped run, as Phase 50 did (`50-01-SUMMARY.md`, "Mutation base"):
  `pnpm exec stryker run stryker.config.mjs --mutate 'packages/core/src/Walk.ts,packages/core/src/PortAccess.ts,packages/core/src/Matcher.ts,packages/core/src/FieldPath.ts,packages/core/src/Decision.ts,packages/core/src/Predicate.ts,packages/core/src/AttributeResolver.ts,packages/core/src/CustomPredicate.ts' < /dev/null`
  Add `packages/core/src/Compare.ts` only if its header is edited. The after-run appends `packages/core/src/Operand.ts`.
- **Writer/comparer to reuse:** Phase 50's JSON writer (`50-01-PLAN.md` step 2, line 178) and comparer (`50-06-PLAN.md` line 168), retargeted: `NAMED` = the 8 files, `OUT` = `.planning/phases/QD-53-one-module-owns-the-value-a-leaf-compares/53-mutation-base.json`; drop the Walk-specific `leafArms`; `new: ["packages/core/src/Operand.ts"]`; `moved` entries from `Matcher.ts` (getByPath, isObject copy), `FieldPath.ts`, `Decision.ts`, `Walk.ts`, `PortAccess.ts`, `Predicate.ts`, the two fixture files to `Operand.ts`. It refuses a stale report (mtime vs newest file under `packages/core/src|test`), a report with a different file set, a `source` not equal to the file on disk, and a config reporting elsewhere. The existing `reports/mutation/mutation.json` (2026-11-16, whole-core run) would be refused as stale and must not be used.
- **Orientation scores (same source, 2026-11-16 report; not the base):** Walk 0.9481 (13 survived, 3 no coverage), Matcher 0.9775 (5), FieldPath 0.9348 (12), Decision 0.9677 (5), CustomPredicate 0.9459 (2), PortAccess 1.0000, Predicate 1.0000, AttributeResolver 1.0000. Mutant counts in the exact regions edited: `Walk.ts:343-351` 1, `PortAccess.ts:345-350` 2, `FieldPath.ts:330-334` 6 (1 survivor), `Decision.ts:286-290` 1 (ignored), `Predicate.ts:160-166` 19 (12 killed, 7 ignored), `AttributeResolver.ts:222-228` 4, `CustomPredicate.ts:285-300` 8 (2 survivors).
- **Order:** green tree → base JSON commit → RED tests commit → source moves. Run Stryker alone (not alongside vitest, per Phase 50/52 practice).
- **Duration:** about 2-4 minutes `[ASSUMED, A2]`.

### Sampling Rate
- **Per task commit:** the quick command with `-t` for the task's tests, plus `pnpm typecheck` when a signature moves.
- **Per wave merge:** `pnpm exec vitest run --project core < /dev/null` and `pnpm exec vitest run --project predicate-sql --project predicate-prisma < /dev/null`, `pnpm circular`, `pnpm lint`.
- **Phase gate:** `pnpm check:pr < /dev/null` green, then the mutation after-run and comparer, then the OPND-03 scoped grep, before `/gsd-verify-work`. Never run `check:pr` concurrently with Stryker.

### Wave 0 Gaps
- [ ] `packages/core/test/Operand.test.ts` (new): own, inherited, and `JSON.parse`-own `__proto__` for `ownValue`, `isOwnKey`, `getByPath`; the `getByPath` boundary pins moved from `Matcher.test.ts`; `assert.strictEqual(M.getByPath, getByPath)` for the re-export identity. RED on base by import.
- [ ] RED tests in `Predicate.test.ts` (OPND-01 and the D-11 property), `Layers.test.ts`, `CustomPredicate.test.ts`.
- [ ] GREEN characterisation tests written on the base (WX-06 preserved behaviour), see Q8 list below.
- [ ] Framework install: none.

### Q5 details: building the property
- Harness: `leaf`, `tree`, `rows`, `show` are scoped inside `describe("INV-QD-018: …")` (`Predicate.test.ts:879` onward, `Row` type at :880, `show` :888, `rows` :893, `leaf` :903, `tree` after), while `tenant`, `layer`, `translate` are module scope (:34-60). The new property sits in that describe so it can reuse `Row`, `show`, `translate`; it brings its own generators. The seeded sample style at :1000 is `FastCheck.sample(arb, { numRuns, seed })`; use fixed seeds.
- Own `__proto__` rows and attributes: `JSON.parse('{"__proto__":{"x":1},"constructor":"c"}')` and `Object.fromEntries([["__proto__", v]])` both produce a real own `__proto__` key with the real prototype untouched, and `{ ...obj }` preserves it (node check this session). `makeSubject`/`subjectWith` copy attributes with `{ ...config.attributes }`, so a subject with own prototype-named attributes survives (`AuthSubject.ts:78`).
- What reaches `toPredicate` (read `Predicate.ts:210-262, 395-440`):
  - `HasResourceAttribute` + `Eq`/`Neq`/`Gte`/`Lt`/`In` → a column (`Compare`/`MemberOf`); the only place the base disagrees. `Eq`/`Neq` whose ref is a `SubjectRef` fold through `getByPath(context.subject, r.path)` (`constantRef`); an absent folded value yields a `Compare` with `value: undefined` that denies on both sides.
  - `ResourceRef` anywhere → `constantRef` returns `undefined` → refused. `HasAttribute` whose matcher references the resource → refused. So `ResourceRef` paths never reach agreement; pin `evaluate` on prototype-named `ResourceRef` paths in a separate table test (GREEN on base, characterisation).
  - `FieldMatch`, `Exists`, `Contains`, `SomeMatch`, `EveryMatch`, `Size`, `Dominates` on a resource attribute → refused (`columnPredicate` returns `undefined`). On a subject `HasAttribute` the leaf becomes `AskAttribute` and is judged by the same `judgeMatcher` as `evaluate`, so FieldMatch names agree trivially there; keep them in the property anyway.
  - Assert agreement only where `translate` succeeds (use `Effect.result` and skip `PolicyNotTranslatable`).
- On the base the new property must fail with a counterexample (a `neq` over a prototype-named column on a row lacking it); record the shrunk counterexample in the SUMMARY.

### Q6 details: engine suites
Columns the generators use are `tenantId`, `level`, `sealed`, `tag`, `score` (`predicate-sql/test/generators.ts:18-76`), and the rows are plain 48-row fixtures built as `EngineRow` objects; no generator can produce a prototype-named column, so the `evaluatePredicate` fix cannot change their expected answers. The vitest alias resolves `@qadi/core` to `../core/src/index.ts`, so core `src` edits are seen without rebuilding `lib`. `[VERIFIED: packages/predicate-sql/vitest.config.ts, generators.ts]`

### Q8: existing tests that pin behaviour that must not change
- `getByPath`: `Matcher.test.ts:904-907` empty path returns the input; `:910` dot path; `:914-915` missing step and `undefined` root; `:923` single segment; `:927-928` trailing dot; `:932` doubled dot; `:401-408` `null` root; `:421-428` prototype names; `:431-442` own `__proto__` via `Object.defineProperty`.
- FieldMatch: `Matcher.test.ts:132-149` (non-object `Incomparable`; arrays read `length`); `:231-241` composite verdicts; `:445-463` inherited member and missing own field (`NotHeld`); `:969-970` table rows.
- `readAttribute` present-but-undefined: `Evaluate.test.ts:243-253` ("A PRESENT-BUT-UNDEFINED VALUE IS STILL 'has no value'") only asserts the reason sentence, not that the resolver is skipped. **Gap:** write a GREEN characterisation test on the base with a scripted resolver (`scriptedPort(attributeResolverPort, …).calls`): own `undefined` attribute → 0 calls; missing key → 1 call; `constructor` not own → 1 call.
- `HasResourceAttribute` inherited member: `Evaluate.test.ts:317-327` (`toString`, reason `"resource attribute 'toString' has no value"`).
- `projectAt`: `FieldPath.test.ts:298-315` (own `__proto__` from `JSON.parse` does not pollute); `Qadi.test.ts:161` public-API variant. **Gap:** `FieldPath.test.ts` has no `undefined` case; add a GREEN characterisation (probe on built lib: `project({a:undefined,b:1},["a"])` keys `['a']`; `project({b:1},["constructor","b"])` keys `['b']`).
- `customPredicateFromRecord`: `CustomPredicate.test.ts:39-100` (resolves, forwards resource, fails rather than denies on an unknown name via `customPredicateFromRecord({})`, forwards own failure); `Evaluate.test.ts:645,728,739,752,3111`; `PortDefault.test.ts:140`.
- `attributeResolverFromRecord`: `Layers.test.ts:31-35` (reads a table; absent → `undefined`), `EvaluationEnvironment.test.ts:180`, `PortDefault.test.ts:62,323,333`, `Ports.test.ts`.
- `Decision` projection: `Qadi.test.ts:161`; `FieldPath.test.ts:298`.

## Security Domain

`security_enforcement` is enabled (ASVS level 1, block on high).

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | — |
| V3 Session Management | no | — |
| V4 Access Control | yes | Fail-closed: an inherited member reads as absent, which denies (INV-QD-092); `evaluatePredicate` must never admit what `evaluate` denies (INV-QD-018/091) |
| V5 Input Validation | yes | Own-property-only reads of decoded keys, in one module; `untrustedDecoder` for decoding (untouched) |
| V6 Cryptography | no | — |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Prototype-named key (`constructor`, `toString`, `__proto__`, `hasOwnProperty`, `valueOf`) in a decoded policy reads an inherited member as a value | Elevation of privilege / Tampering | `Object.hasOwn` in `Operand.ts`; agreement property over those names |
| Reference interpreter fail-open used as a row filter | Elevation of privilege | `evaluatePredicate` through `ownValue` (the defect) |
| Registry/resolver fixture turns a name into a defect or an allow | Denial of service / Elevation | `ownValue` in both fixture builders; a decision must never become a defect (AGENTS.md §4) |
| Own `__proto__` key written through `out[key] =` | Tampering | Write guards stay (D-09): `Object.create(null)` in `FieldPath.ts`, `Object.defineProperty` in `Decision.ts` |

## Project Constraints (from CLAUDE.md)

`CLAUDE.md` is `@AGENTS.md`, which is authoritative. Directives that bind this phase:
- Imports: `import * as X from "effect/X"` for effect submodules; relative imports carry `.ts`; `import type` for type-only (`verbatimModuleSyntax`). Package boundaries use named root imports.
- Services `Context.Service` with a separate `…Shape`; layers are top-level consts, beside the service; no `static layer`.
- Errors `Data.TaggedError` (12 budgeted `Schema.TaggedError` exceptions); array-form `catchTag`; never `Effect.orDie` in evaluation paths; a decision must never become a defect.
- Effectful functions `Effect.fn`; the three `fnUntraced` exceptions are budgeted; `Match` not `switch` except the 3 budgeted (`Walk.ts` `evaluateNode`, `Matcher.ts` `judgeMatcher` and `resolveRef`); no `as`, `!`, `any`.
- Forbidden: `async`/`await`, `new Promise`, `node:fs`, `Date.now`, `performance.now`, `crypto.randomUUID`, `console.*`/`process.env`, `Effect.either`.
- §7a: `JSON.parse`/`Schema.decode*`/`onExcessProperty`/`exceedsJsonDepth` tokens in `packages/*/src` only in the budgeted files; `Operand.ts` must have none.
- §9: `Operand.ts` stays out of the barrel and is not an entry point; gate 13 and gate 14 check it.
- §10: tests use `@effect/vitest`; coverage thresholds in config (core 95%).
- §11/§15: spec is normative; every record change updates behaviour doc, invariant, traceability, README Document history and CCR row; `scripts/spec-revise.mjs` always with `--date YYYY-MM-DD`.
- Doc-comment shape: one-line summary first, the why after.
- Shell: zsh with `grep` aliased to ugrep; use `/usr/bin/grep` or `bash -c`; run vitest from the repo root with `--project`; never run `node scripts/next-id.mjs`.
- User memory: closed unions over widening; prefer the complete design; `Record<string, unknown>` is not a hack target (the proposed generic `Readonly<Record<string, V>>` parameter is a read-only table type, not a widened implementation type).

## Q1 census: readers of a decoded key in `packages/core/src`

Greps run this session: `Object.hasOwn`, `hasOwnProperty`, `.attributes[`, `[<ident>]` index reads (excluding `i`/`index`/`0`), `Reflect.get|has`, `in` operator. Result:
- **Exactly the nine in D-01/D-02.** Line numbers re-verified: `Walk.ts:343-350`, `PortAccess.ts:348-349`, `Matcher.ts:341-353` and `:725-740`, `FieldPath.ts:332`, `Decision.ts:286-289`, `Predicate.ts:163-164`, `AttributeResolver.ts:227`, `CustomPredicate.ts:289`, `Ports.ts:259-268`.
- **Audited and not readers of a policy-supplied key:** `Predicate.ts:220` (`getByPath`, already guarded; switches to the `Operand.ts` import), `Matcher.ts:412,416` (`resolveRef` via `getByPath`), devtools `Remedies.ts:291,297` (public `getByPath`, unchanged), `PortSpanEncode.ts:54,78` (`fieldOf[prop]`/`keyOf[prop]`, keys from `Object.entries` of the code-built span structs; in §7a's budget rationale), `DecodeDepthGuard.ts:30`, `JsonHazard.ts:147`, `PortKey.ts:79,90`, `SinkCodec.ts:203` (`for…in` over a freshly built object), `PortRemote.ts:197` (`d.asks[tag]`, a closed registry keyed by a leaf `_tag`), `Errors.ts:469,557`, `LeafNeeds.ts`/`PolicyArity.ts` tables (D-03 category), `RenderablePredicate.ts:312,344` (`{ [column]: value }` rows: computed keys create own properties, so unaffected), `Resource.ts` `resource?.["id"]` (fixed key).
- `Explanation.ts`, `SubjectSet.ts`/`decideSubjects`, `filter` and `Admission.ts` read no key by a policy string; `Remedies.ts` uses only `getByPath`.
- Other packages: no `.attributes[`, `row[`, `[column]` read of a policy key (`predicate-prisma/src/index.ts:297-317` build objects with computed keys, which are writes); `devtools/src/model/SimulationForm.ts`, `react/src/useGate.ts`, `react/src/HydrationEngine.ts:183` read fixed or table keys.

## Q7 records mechanics

- **Free ids:** `git grep -lwF` over `spec packages .changeset AGENTS.md CONTRIBUTING.md features apps examples scripts` returns 0 files for ADR-QD-166, CCR-QD-444, BEH-QD-601..605, INV-QD-351/352, ARCH-100; no `spec/decisions/166-*` exists; reservation file holds `{"CCR":452,"ADR":174,"BEH":645,"INV":368}`.
- **Revisions today:** `spec/README.md` Rev 1.246, `spec/overview.md` Rev 1.121, `spec/traceability.md` Rev 1.213, `spec/invariants.md` Rev 1.150, `spec/behaviors/04-matchers.md` Rev 1.7. Bump each edited document with `node scripts/spec-revise.mjs <doc> "<what changed>" --date 2026-11-18` (omitting `--date` drops the first positional argument, per STATE.md). Check with `node scripts/spec-revise.mjs --check`.
- **ADR shape:** copy `spec/decisions/165-core-owns-the-predicate-compile-shell.md` (Document Control table with `Document ID | QADI-ADR-166`, sections Context / Decision / Alternatives rejected / Consequences). Gate 10 (`verify-traceability.sh` 3a) requires the ID number to equal the file number. File: `spec/decisions/166-<slug>.md`. `index.yaml` entry: `id: "ADR-QD-166"`, `file`, `title`, `status: "Accepted — extends ADR-QD-091, ADR-QD-024"` (precedent: ADR-156 `"Accepted — extends ADR-QD-104"`; ADR-104 received an `## Amendment (date, ADR, CCR)` pointer section and a history entry rather than an index change). Also add `ADR-QD-166` to `spec/traceability.md` (check 3).
- **INV-QD-091:** body at `spec/invariants.md:2823` (Statement, Source, Implication, Enforcement, Related). Restate Source to name `Operand.ts` and add the new agreement property to Enforcement; keep the heading (anchor pitfall). INV-QD-351/352 added after INV-QD-349; each needs a `spec/traceability.md` row (check 2).
- **BEH placement (discretion):** BEH-QD-601 `04-matchers.md` (a leaf's operand is an own-property read through one module: refs, FieldMatch, resource attribute; sits beside BEH-QD-305); BEH-QD-602 `16-predicates.md` (the reference interpreter reads a column as an own property; extends BEH-QD-122); BEH-QD-603 `16-predicates.md` (BEH-QD-127's "for every translatable policy and row" now includes prototype-named columns); BEH-QD-604 `06-services.md` (`attributeResolverFromRecord` answers `undefined` for a non-own name, beside BEH-QD-043); BEH-QD-605 `32-custom-predicates.md` (a prototype name fails with `CustomPredicateError`, beside BEH-QD-247, whose text already says an unrecognised name is an error). Any unused number goes in the CCR row as "Unused: …".
- **Registers touched (CCR-QD-443 is the template):** `spec/decisions/166-….md` and `index.yaml`, the behaviour files, `spec/invariants.md`, `spec/traceability.md` (BEH range rows, INV rows, ADR row, test-file rows incl. `Operand.test.ts`; check 6 requires every cited test file to exist), `spec/overview.md` (row 148 note: `getByPath` is re-exported from `Operand.ts`; no export added), `spec/README.md` (Document history + CCR-QD-444 row), the changeset. AGENTS.md cites no `getByPath`, `isFieldOf` or reader location (grep'd), so it is untouched.
- **Changeset:** frontmatter shape as in `.changeset/core-compile-predicate.md`: `---\n"@qadi/core": patch\n---\n` then prose (D-15 wording; add the class-instance-row note from Pitfall 4). No `Breaking`.
- **Spec `typescript` fences:** compiled by `check-doc-examples.mjs`. Fences that call `attributeResolverFromRecord`, `customPredicateFromRecord`, `evaluatePredicate`, `fieldMatch` or `hasResourceAttribute` exist (`spec/behaviors/06-services.md`, `32-custom-predicates.md`, `16-predicates.md`, `spec/models/*`), all with ordinary names; none uses a prototype-named key (grep over spec and website docs found the five names only in prose about field strategies), so existing fences are unaffected. Any new fence must import what it uses.
- **Gate 13:** `getByPath` stays in the `evaluateMatcher, judgeMatcher, referencesAction, referencesResource, getByPath` row; `Operand.ts` is out of the barrel, so it needs no "Not listed above" row (`Compare.ts` has none). No `.d.ts`/api-extractor golden pins `getByPath`'s declaring module (`git grep getByPath` outside `lib`/`.planning`: `Matcher.ts`, `Predicate.ts`, `FieldPath.ts` comment, `Matcher.test.ts`, `bench/Dispatch.bench.ts`, devtools `Remedies.ts`, spec prose).
- **`pnpm circular`:** `madge --circular --extensions ts,tsx packages/*/src`; clean today (232 files). `Operand.ts` has no imports, so no edge into it can close a cycle; re-run after the first import lands (`Predicate.ts`) and at close.

## Sources

### Primary (HIGH confidence)
- In-repo files read this session: `packages/core/src/{Walk,PortAccess,Matcher,FieldPath,Decision,Predicate,AttributeResolver,CustomPredicate,Ports,Compare,AuthSubject,Resource,PortSpanEncode,SinkCodec}.ts`; `packages/core/test/{Predicate,Matcher,Evaluate,Layers,CustomPredicate,PortAccess,FieldPath}.test.ts`; `scripts/check-api-surface.mjs`, `scripts/spec-revise.mjs`, `spec/scripts/verify-traceability.sh`, `stryker.config.mjs`, `package.json` scripts, `tsconfig.base.json` (`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`); `spec/invariants.md` INV-QD-091, `spec/decisions/091`, `156`, `165`, `index.yaml`; Phase 50/52 SUMMARY and PLAN files.
- Commands run this session: the discuss probe (output quoted in Summary); `pnpm exec vitest run --project predicate-sql --project predicate-prisma EngineAgreement` (2 files, 20 tests, 1.17 s); `pnpm exec vitest run --project core Predicate Matcher Layers CustomPredicate FieldPath Evaluate PortAccess` (10 files, 642 tests); `pnpm circular`; the scratch `tsc` typecheck; node checks of own `__proto__` preservation and the gate-13 regex.

### Secondary (MEDIUM confidence)
- `reports/mutation/mutation.json` (2026-11-16): orientation counts only.

### Tertiary (LOW confidence)
- Stryker dry-run behaviour and run duration (A1, A2).

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH (no new packages; built-in `Object.hasOwn`)
- Architecture: HIGH (signatures typechecked; every site read)
- Pitfalls: HIGH for 2, 3, 6, 7 (read/run), MEDIUM for 1 and 5

**Research date:** 2026-11-18
**Valid until:** 2026-12-18, or until any `packages/core/src` change lands (re-check the line numbers with `git diff 44510112 --stat -- packages/`)
