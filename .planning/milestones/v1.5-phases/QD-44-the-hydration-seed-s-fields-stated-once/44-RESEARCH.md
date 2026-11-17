# Phase 44: The hydration seed's fields stated once - Research

**Researched:** 2026-11-15 (branch `arch-wave-10`, HEAD `9f48078d`)
**Domain:** `@qadi/react` hydration (`packages/react/src/HydrationEngine.ts`, `SeededDecision.ts`), `@qadi/core` `DecisionWire.ts`, Effect 4.1.2 Schema/Data, fast-check 4.10.2, Stryker 10.1.1, spec records
**Confidence:** HIGH. The whole design below was compiled and run in a scratch copy of core + react (no repo file touched): typecheck clean, the existing 511 react tests green, the new property RED with the scratch wire field on the base and GREEN on the candidate, the payload bytes identical.

## Summary

The defect is real and reproduced: add a field to the wire's `common` and emit it in `encodeDecision`, and the payload carries it (the entry schema is derived from `DecisionWire*.fields`, the dehydrate side spreads) but `rebuild` drops it, with the whole workspace still compiling. The fix is the ADR-QD-135 pattern: one `Schema.Struct` of seed fields per verdict in `SeededDecision.ts`, `Data.TaggedClass` classes typed by its `.Type`, entries built as `Schema.TaggedStruct("Allow", AllowSeedFields.fields)`, and one closed `VERDICTS` table in `HydrationEngine.ts` read by `dehydrateDecision`, `rebuild` and `entryAgrees`. No `as`, `!`, `any`, `switch`; every dispatch is `rowOf(tag)`.

Five findings change how the planner should write the work, and none is in CONTEXT:

1. **`Schema.optional` yields `?: T | undefined` even under `exactOptionalPropertyTypes`.** So `visibleFields` in the seed `.Type` is `readonly visibleFields?: readonly string[] | undefined`. Constructing with `visibleFields: undefined` still compiles; every existing test that does so keeps compiling and passing. D-03's "tests are updated to omit the key" is optional hygiene, not a compile or runtime necessity. The type change is a loosening of the constructor and a tightening of nothing readable; the only break is assignability of a `SeededAllow` to a type that requires the `visibleFields` key. D-12 (minor, **Breaking**) is locked by the user, so write the changeset that way, but describe the break honestly (Q4).
2. **The payload's byte order comes from `encodeDecision`'s literal order, not from any schema.** `dehydrateDecision` spreads `Struct.omit(wire, ...)`, so the allow entry is `_tag, evaluationId, durationMillis, obligations, visibleFields?, disclosure`. The seed struct's field order (from the wire's `fields`) is `evaluationId, durationMillis, visibleFields, obligations`. A refactor that builds the entry from the struct's keys silently moves `visibleFields` before `obligations`. The existing byte pin (`HydrationPayload.test.ts:420`) covers neither field, so D-09's golden is exactly the missing guard. Keep the omit-spread for the entry (Q2/Q3).
3. **The RED scratch edit needs three edits, not one.** A required scratch field in `common` makes `encodeDecision` fail to compile, and an optional one is never emitted, so the property cannot see it. Add it to `common` **and** emit it in both `encodeDecision` literals; then everything still compiles and the property fails (Q6, verified).
4. **`new SeededAllow({ ...Struct.omit(entry, ["_tag"]), subjectId })` has a dead `omit`.** The class field `_tag = tag` runs after `Object.assign`, so `{ ...entry, subjectId }` yields `_tag: "SeededAllow"` and compiles. The omit would be an equivalent Stryker mutant (ArrayLiteral `[]`) that survives and drops HydrationEngine below its base. Spread the entry directly (Q3, verified at runtime).
5. **The existing react suite does not run from `packages/react`.** `vitest run` inside `packages/react` fails with `TypeError: Cannot read properties of undefined (reading 'config')` in every `@effect/vitest` file (reproduced on the untouched repo). The working form is from the repo root: `pnpm exec vitest run --project react <paths>`.

**Primary recommendation:** Plan 1 (first commit, `packages/*/src` untouched): the Stryker base JSON for `HydrationEngine.ts` and `SeededDecision.ts`, then the byte golden and the property, both green on the base; the RED run with the uncommitted scratch edit is recorded in the SUMMARY. Plan 2: the seed fields structs, classes and entries (D-01..D-04). Plan 3: the `VERDICTS` table and the three call sites (D-05, D-06). Plan 4: ADR-QD-157 and the records, the changeset, `upgrading.md`. Plan 5: the Stryker comparison and `pnpm check:pr < /dev/null`.

## Architectural Responsibility Map

Single-package library work; the "tiers" are modules.

| Capability | Primary owner | Secondary | Rationale |
|------------|---------------|-----------|-----------|
| The set of fields a seed carries, per verdict | `SeededDecision.ts` (`AllowSeedFields`, `DenySeedFields`, the withheld lists) | `@qadi/core` `DecisionWire.ts` (read only) | One statement derived from the wire minus the withheld fields (D-01, D-07) |
| The payload entry schema | `HydrationEngine.ts` (`AllowEntry`/`DenyEntry` = `TaggedStruct` over the seed fields) | `SeededDecision.ts` | The entry and the seed read one statement |
| Allow/Deny branch (wire to entry, entry to seed, entry to claim) | `HydrationEngine.ts` `VERDICTS` table | `Decision.ts` `decisionDisagreement` (the rule, INV-QD-170) | The branch is the table; the three functions index it |
| Seed class identity (`_tag: "SeededAllow"`, ADR-QD-078) | `SeededDecision.ts` classes | none | Unchanged; classes stay `Data.TaggedClass` |
| The computing atom and seed slot | `SeededQuestion.ts` (ADR-QD-155) | none | Kept as is, not touched |
| Subject binding, strict decode, version | `HydrationEngine.ts` envelope decode | `UntrustedDecode.ts` | Unchanged; the spread only ever sees decoded output |

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| HYDF-01 | Seed fields stated once, derived from `DecisionWireAllow`/`DecisionWireDeny` minus withheld; classes typed by that statement | Q1 types (compiled), D-01 structs; `.d.ts` emission clean (no TS2883) |
| HYDF-02 | `dehydrateDecision` and `rebuild` are spreads with one `subjectId` substitution; branch written once | Q3 table (compiled, cast-free); `_tag === "Allow"` count in the engine goes 3 to 0 |
| HYDF-03 | Property: any `Decision` to entry to `SeededDecision` keeps every disclosed wire field; RED on base with a scratch field | Q5 arbitrary, Q6 procedure (run: RED on base, GREEN on candidate) |
| HYDF-04 | `entryAgrees` unchanged in rule; payload bytes identical | Q3 `claim` row; Q2/Q5 golden strings captured on the base and reproduced byte for byte by the candidate |
| WX-01 | `pnpm check:pr < /dev/null` green | Validation Architecture |
| WX-02 | Reserved ids only; never `next-id.mjs` | Q8: ARCH-91, ADR-QD-157, CCR-QD-435, BEH-QD-556..560, INV-QD-333..334 all free by `git grep` this session |
| WX-03 | `spec/overview.md` names every added export | No export is added (D-01 keeps the structs package-private); `overview.md:585` row stays true; gate 13 untouched unless TS2883 (it did not occur) |
| WX-04 | No `as`, `!`, `any`, `switch`, `fnUntraced`, `async`, ambient clock | Prototype has none; `oxlint` printed no diagnostics on it; no budget changes |
| WX-05 | Coverage holds; Stryker score of touched files does not fall | Q7 command, base JSON shape, the dead-`omit` trap |
| WX-06 | Characterisation tests precede the change | Plan 1: golden + property green on base, RED shown |
| WX-07 | Break recorded as **Breaking** in changeset and `upgrading.md` | Q8 formats; D-12 |
</phase_requirements>

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Where the seed fields are stated, and their shape (accepted 2026-11-15)**
- **D-01: The statement lives in `SeededDecision.ts`.**
  - It holds the withheld lists (today's `ALLOW_WITHHELD`/`DENY_WITHHELD`, moved from `HydrationEngine.ts`), one `Schema.Struct` of fields per verdict (the wire variant's fields minus the withheld ones, plus `disclosure`), and the two classes.
  - `HydrationEngine.ts`'s `AllowEntry`/`DenyEntry` derive from those structs, so the payload entry and the seed read one statement.
  - `SeededDecision.ts` reaches the public surface only through `Hydration.ts`'s named re-exports, so the new structs stay package-private (nothing added to the barrel; gate 13 unchanged unless a named type must be re-exported for `.d.ts` emission, TS2883).
- **D-02: `subjectId` is the one substitution.** It sits outside the struct (the entry carries no subject; the envelope does), and each class is typed by `typeof <Verdict>SeedFields.Type & { readonly subjectId: SubjectId }` (exact type spelling is the planner's).
- **D-03: `visibleFields` follows the wire.** An absent key stays absent (as ADR-QD-135's records do), so `SeededAllow`'s constructor type changes from a required key that may be `undefined` to the wire's optional key. `@qadi/react` takes a **minor** changeset marked **Breaking**; `upgrading.md` gets a `@qadi/react` entry. Tests that construct `SeededAllow` with `visibleFields: undefined` are updated to omit the key.
- **D-04: A denial's shape does not change.** `SeededDeny` still withholds `obligations` and `reason` (a denial's `obligations` are always `[]`, and its reason is disclosed only inside `disclosure`).
- ADR-QD-078 holds: a seed is its own type, `_tag` is `SeededAllow`/`SeededDeny`, and both stay `Data.TaggedClass`es (not `Schema.TaggedClass`: ADR-QD-135 measured and rejected that).

**The Allow/Deny branch written once (accepted 2026-11-15)**
- **D-05: One closed table at module scope**, keyed by the wire verdict `"Allow" | "Deny"`. Each row holds that verdict's withheld list, its disclosure builder (Withheld / Disclosed from a wire value), its seed class (rebuild = spread plus `subjectId`) and its claim for `decisionDisagreement`. `dehydrateDecision`, `rebuild` and `entryAgrees` each read the row. Exhaustive by construction (a missing verdict is a compile error, ADR-QD-152 / `FieldLattice.ts` pattern), no `as`, no `!`, no `switch`; dispatch on `_tag` uses `Match`. The exact encoding is the planner's, within those rules.
- **D-06: `entryAgrees` keeps its rule exactly.** A deny's claim is `{ verdict: "Deny", reason: disclosure.reason, obligations: [] }`, an allow's `{ verdict: "Allow", visibleFields, obligations }`, checked through core's `decisionDisagreement` (INV-QD-170); the `policyTag` check stays; a `Withheld` seed has nothing to compare.
- **D-07: Core's `DecisionWire.ts` is read, not edited.** If that proves impossible, the planner records the evidence.

**Proof and records (accepted 2026-11-15)**
- **D-08: RED-first property.** A seeded fast-check property: any `Decision` to `dehydrateWith` to `hydrateWith` to `SeededDecision` keeps every disclosed wire field (with `includeTrace` on and off). It is committed green on the base. RED is shown with a temporary, **uncommitted** scratch field added to core's wire `common`: the property fails while the code still compiles; the output and the revert command are recorded in the SUMMARY; the scratch edit is reverted.
- **D-09: Byte golden on the base.** A JSON golden of `dehydrateWith` output covering an allow with and without `visibleFields`, an allow with obligations, and a deny, each with `includeTrace` off and on. Byte-identical after.
- **D-10: Mutation base.** A per-file Stryker base for `HydrationEngine.ts` and `SeededDecision.ts`, committed before the first `src` edit; no drop allowed after.
- **D-11: Records.** ADR-QD-157 ("A seed's fields are the wire's, stated once", applies ADR-QD-135 to the seed; keeps ADR-QD-078 and ADR-QD-155). CCR-QD-435 row in `spec/README.md`, `spec/decisions/index.yaml`, BEH-QD-556 (the round trip keeps every disclosed field) in the hydration behaviour doc, INV-QD-333 only if no invariant covers it, traceability, `spec/overview.md` if a public type changes, AGENTS.md wherever a section names a moved constant.
- **D-12: Changeset.** One `@qadi/react` minor (**Breaking**: `SeededAllow`'s `visibleFields` is an optional key). Nothing consumed or released.

### Claude's Discretion
- The names of the per-verdict field structs and the table, and the table's row encoding (record of functions, or tagged rows), within D-05's rules.
- Whether `ALLOW_WITHHELD`/`DENY_WITHHELD` stay as two constants or become a row field.
- Plan split. Suggested: (1) mutation base, byte golden and property (green on base, RED with the scratch field); (2) the derived statement and classes; (3) the table and the spreads; (4) records and changeset; (5) mutation comparison and merge gate.

### Deferred Ideas (OUT OF SCOPE)
None. Discussion stayed within phase scope.
</user_constraints>

## Project Constraints (from CLAUDE.md / AGENTS.md)

- Submodule namespace imports for `effect/*` (`import * as Struct from "effect/Struct"`), named imports across `@qadi/*`, `.ts` extensions on relative imports, `import type` for type-only (AGENTS.md section 1). The new `Struct` import in `SeededDecision.ts` follows this.
- No `as`, `as any`, `!`, `any`; `Match` not `switch` for `_tag` dispatch (a table index is not a `switch`; `SWITCH_BUDGET` is unaffected); `Effect.fn` for effectful functions (none here, all pure); no `Effect.fnUntraced` (UNTRUSTED/UNTRACED budgets count it).
- `UNTRUSTED_DECODE_BUDGET` counts `onExcessProperty`, `exceedsJsonDepth`, `Schema.decode*`, `JSON.parse` per file in `packages/*/src`. The new code adds none (`Schema.TaggedStruct`, `Struct.omit` only).
- Layers/classes: `Data.TaggedClass`, not `Schema.TaggedClass` (ADR-QD-135 measured and rejected it: its constructor parses on every evaluation). `Schema.TaggedError` budget untouched.
- Doc-comment shape: one-line summary, then the why (ADR numbers) in following paragraphs.
- `spec/` is normative; a record change lands in the same change as the behaviour doc, invariant and traceability. Reserved placeholder ids are refused by `[no-numbering-placeholder]`; use only the reserved numbers.
- `pnpm check` is the only definition of done; `check:pr` skips mutation, so the Stryker comparison is a separate plan step.
- Memory: closed unions written out in full; prefer complete over simple; breaking changes are acceptable; never release.

## Standard Stack

No package is added or changed. The existing toolchain is used as installed.

### Core
| Library | Version | Purpose | Why |
|---------|---------|---------|-----|
| `effect` | 4.1.2 [VERIFIED: node_modules/effect/package.json `"version": "4.1.2"`] | `Schema.Struct`/`TaggedStruct`, `Struct.omit`, `Data.TaggedClass` | The ADR-QD-135 pattern, already how `SinkRecordFields.ts` works |
| `@qadi/core` | workspace | `DecisionWireAllow`/`DecisionWireDeny`, `encodeDecision`, `decisionDisagreement`, `DecisionClaim`, `makeDecision` | The wire statement being derived from, read not edited (D-07) |
| `fast-check` | 4.10.2 [VERIFIED: pnpm-workspace.yaml `fast-check: 4.10.2`] | the property | Existing convention: `FastCheck.assert(FastCheck.property(...), { numRuns, seed })` with a numeric literal seed |
| `vitest` | 5.1.0 [VERIFIED: pnpm-workspace.yaml `vitest: 5.1.0`] | runner | Run from the repo root with `--project react` |
| `@stryker-mutator/core` + `vitest-runner` | 10.1.1 [VERIFIED: package.json, node_modules/@stryker-mutator/{core,vitest-runner}] | mutation base and comparison | `stryker.react.mjs` |
| `tstyche` | ^7.2.5, target 6.0.3 [VERIFIED: package.json, tstyche.json] | optional type pin | `tsconfig.test.json` |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `Data.TaggedClass` typed by the struct | `Schema.TaggedClass` | Rejected by ADR-QD-135 (constructor parses on every evaluation) and by D-01 |
| Table index through a generic `rowOf` | `Match.tagsExhaustive` per function | Repeats the Allow/Deny branch three times, which is the defect being removed |
| Entry built from the seed struct's keys | omit-spread of the wire | Changes payload bytes (`visibleFields` before `obligations`); rejected by HYDF-04 |

**Installation:** none. **Version verification:** `effect` read from `node_modules/effect/package.json` this session; tool versions from `node -v` v26.13.0, `pnpm -v` 10.17.1.

## Package Legitimacy Audit

No external package is installed, added or upgraded by this phase. The `research-plan`/`package-legitimacy` seams were not needed: every claim is about in-repo code and the installed `effect` source, verified by reading and by compiling.

**Packages removed due to [SLOP] verdict:** none. **Packages flagged [SUS]:** none.

## Architecture Patterns

### System Architecture Diagram

```
 server                                                               client
 ------                                                               ------
 Decision ──encodeDecision──► DecisionWire (core: common + variant)
                                   │  wire._tag
                                   ▼
                        rowOf(tag).entry(wire, includeTrace)    [VERDICTS table, HydrationEngine.ts]
                          = { ...Struct.omit(wire, WITHHELD), disclosure }
                                   │
                                   ▼
        DehydratedEntry (entry type = TaggedStruct(tag, <Verdict>SeedFields.fields))
                                   │  JSON in the page (bytes pinned by the golden)
 ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ▼ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─
        decodeEnvelope (subject, version) ─► decodeEntry (strict, onExcessProperty "error")
                                   │ decoded output only (fresh object, declared keys)
                    decodePolicy ──┤
                                   ▼
        entryAgrees: policyTag check, then
          decisionDisagreement(rowOf(tag).claim(entry, disclosure), trace)   (INV-QD-170)
                                   │ agrees
                                   ▼
        rebuild: rowOf(tag).seed(entry, subject.id) = new SeededAllow|SeededDeny({ ...entry, subjectId })
                                   ▼
                       seedFor(policy, resource).hold(seed)   [SeededQuestion.ts, untouched]
```

### Recommended Project Structure
```
packages/react/src/
├── SeededDecision.ts      # + ALLOW_WITHHELD, DENY_WITHHELD, AllowSeedFields, DenySeedFields; classes typed by them
├── HydrationEngine.ts     # AllowEntry/DenyEntry = TaggedStruct over the seed fields; VERDICTS table; rowOf; entryOf/seedOf/claimOf
packages/react/test/
├── HydrationSeedFields.test.ts   # new: the property (HYDF-03) and the golden (HYDF-04)
└── (optional) SeededDecision.tst.ts or an added case in Hydration.tst.ts: constructor input = struct Type
```

### Pattern 1: the seed fields, stated once (compiled)
```typescript
// SeededDecision.ts (additions). Source: scratch prototype ws/packages/react/src/SeededDecision.ts, tsc clean.
import * as Struct from "effect/Struct";

export const ALLOW_WITHHELD = ["subjectId", "trace"] as const;
export const DENY_WITHHELD = [...ALLOW_WITHHELD, "obligations", "reason"] as const;

export const AllowSeedFields = Schema.Struct({
  ...Struct.omit(DecisionWireAllow.fields, ["_tag", ...ALLOW_WITHHELD]),
  disclosure: AllowDisclosure,
});
export const DenySeedFields = Schema.Struct({
  ...Struct.omit(DecisionWireDeny.fields, ["_tag", ...DENY_WITHHELD]),
  disclosure: DenyDisclosure,
});

export class SeededAllow extends Data.TaggedClass("SeededAllow")<
  typeof AllowSeedFields.Type & { readonly subjectId: SubjectId }
> {}
export class SeededDeny extends Data.TaggedClass("SeededDeny")<
  typeof DenySeedFields.Type & { readonly subjectId: SubjectId }
> {}
```
`_tag` is omitted from the seed fields because the class supplies its own `_tag`; the wire's `_tag: "Allow"` is re-added on the entry by `TaggedStruct` (Pattern 2). The unused imports `Obligation` and `VisibleFields` leave the file (`noUnusedLocals`).

### Pattern 2: the entry derives from the seed fields
```typescript
// HydrationEngine.ts
const AllowEntry = Schema.TaggedStruct("Allow", AllowSeedFields.fields);
const DenyEntry = Schema.TaggedStruct("Deny", DenySeedFields.fields);
```
Checked with a type-equality assertion (`(<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2`) against the base's `DecisionWireAllow.mapFields(...)` result: `.Type` and `.Encoded` are **identical** for both verdicts, so `DehydratedEntry` is unchanged.

### Pattern 3: the closed verdict table (compiled, cast-free)
```typescript
type Verdict = DecisionWire["_tag"];                       // "Allow" | "Deny"
type WireOf = { readonly Allow: typeof DecisionWireAllow.Type; readonly Deny: typeof DecisionWireDeny.Type };
type EntryOf = { readonly Allow: typeof AllowEntry.Type; readonly Deny: typeof DenyEntry.Type };
type SeedOf = { readonly Allow: SeededAllow; readonly Deny: SeededDeny };
type DisclosedOf = {
  readonly Allow: Extract<EntryOf["Allow"]["disclosure"], { readonly _tag: "Disclosed" }>;
  readonly Deny: Extract<EntryOf["Deny"]["disclosure"], { readonly _tag: "Disclosed" }>;
};

interface Row<V extends Verdict> {
  readonly entry: (wire: WireOf[V], includeTrace: boolean) => EntryOf[V];
  readonly seed: (entry: EntryOf[V], subjectId: SubjectId) => SeedOf[V];
  readonly claim: (entry: EntryOf[V], disclosure: DisclosedOf[V]) => DecisionClaim;
}

const VERDICTS: { readonly [V in Verdict]: Row<V> } = {        // a missing verdict is a compile error
  Allow: {
    entry: (wire, includeTrace) => ({
      ...Struct.omit(wire, ALLOW_WITHHELD),
      disclosure: includeTrace ? { _tag: "Disclosed", trace: wire.trace } : { _tag: "Withheld" },
    }),
    seed: (entry, subjectId) => new SeededAllow({ ...entry, subjectId }),
    claim: (entry) => ({ verdict: "Allow", visibleFields: entry.visibleFields, obligations: entry.obligations }),
  },
  Deny: {
    entry: (wire, includeTrace) => ({
      ...Struct.omit(wire, DENY_WITHHELD),
      disclosure: includeTrace
        ? { _tag: "Disclosed", trace: wire.trace, reason: wire.reason }
        : { _tag: "Withheld" },
    }),
    seed: (entry, subjectId) => new SeededDeny({ ...entry, subjectId }),
    claim: (_entry, disclosure) => ({ verdict: "Deny", reason: disclosure.reason, obligations: [] }),
  },
};

/** The one place a verdict becomes its row; generic so a call keeps its value and its row correlated. */
const rowOf = <V extends Verdict>(tag: V): Row<V> => VERDICTS[tag];

const entryOf = <V extends Verdict>(wire: WireOf[V] & { readonly _tag: V }, includeTrace: boolean): EntryOf[V] =>
  rowOf(wire._tag).entry(wire, includeTrace);
const seedOf = <V extends Verdict>(entry: EntryOf[V] & { readonly _tag: V }, subjectId: SubjectId): SeedOf[V] =>
  rowOf(entry._tag).seed(entry, subjectId);
const claimOf = <V extends Verdict>(entry: EntryOf[V] & { readonly _tag: V }, disclosure: DisclosedOf[V]): DecisionClaim =>
  rowOf(entry._tag).claim(entry, disclosure);

const dehydrateDecision = (decision: Decision, includeTrace: boolean): DehydratedEntry["decision"] =>
  entryOf(encodeDecision(decision), includeTrace);

const rebuild = (entry: DehydratedEntry, subjectId: SubjectId): SeededDecision => seedOf(entry.decision, subjectId);

const entryAgrees = (entry: DehydratedEntry, policy: Policy): boolean => {
  const decision = entry.decision;
  if (decision.disclosure._tag !== "Disclosed") return true;
  if (decision.disclosure.trace.policyTag !== policy._tag) return false;
  return decisionDisagreement(claimOf(decision, decision.disclosure), decision.disclosure.trace) === undefined;
};
```
The planner may rename and may place the withheld list in each row instead of two constants (Claude's discretion); the `Struct.omit(DecisionWireAllow.fields, ["_tag", ...WITHHELD])` in `SeededDecision.ts` needs the list there anyway, so keeping the two exported constants and reading them from the rows is simplest.

### Anti-Patterns to Avoid
- **Reading the row without the generic accessor.** `VERDICTS[tag].entry(wire, ...)` inside a generic function fails ("reduced to never": the union of rows has an intersected parameter). Only `rowOf`, whose declared return is `Row<V>`, correlates (Q3).
- **Dropping the `& { readonly _tag: V }` from the parameter.** `rowOf(wire._tag)` then fails to typecheck: `wire._tag` is not `V`. It is also what rejects `rebuild` called with an Allow tag and a Deny entry (probe verified RED).
- **`Struct.omit(entry, ["_tag"])` before the class.** Dead code and an equivalent mutant (finding 4).
- **Building the entry from `AllowSeedFields.fields` key order.** Moves bytes (finding 2).
- **Importing the withheld lists into the property test.** The property must be writable on the phase base, where they do not live in `SeededDecision.ts`; and a test that reads the code's own list proves nothing about it. Keep a test-local list.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| The seed's field list | a hand-written class field list or a field-by-field `rebuild` | `Schema.Struct` of fields + `Data.TaggedClass` typed by `.Type` (ADR-QD-135) | A field added to the wire cannot then be dropped on the client |
| The entry schema | a restated entry struct | `Schema.TaggedStruct(tag, SeedFields.fields)` | One statement for the payload and the seed |
| The agreement rule | a local verdict/fields comparison | core's `decisionDisagreement` through the row's `claim` | INV-QD-170 is the one rule |
| Verdict dispatch | `if (_tag === "Allow")` in three functions, or `switch` | the `VERDICTS` table through `rowOf` | Exhaustive by mapped type; no budget change |
| Untrusted decode | a second decoder | the existing `untrustedDecoder` envelope/entry decoders | UNTRUSTED_DECODE_BUDGET |

**Key insight:** the unit of safety here is that the *decoded* entry (a fresh Schema output holding only declared keys, after a strict decode) is the only thing ever spread into a class. Do not spread anything that has not passed `decodeEntry`.

## Runtime State Inventory

Not a rename/migration phase. The payload wire form is explicitly unchanged (HYDF-04), so there is no stored data, live service config, OS registration, secret or build-artifact change: **None, verified by the byte-identity run (Q5) and by `git grep` finding the moved constants named only in `HydrationEngine.ts` and one historical CCR row (`spec/README.md:357`)**. One build artifact note: `packages/core/lib` and `packages/react/lib` are gitignored `tsc -b` output; after the RED scratch edit to core, run `pnpm typecheck` once to rebuild `lib/` from the reverted source.

## Common Pitfalls

### Pitfall 1: the RED edit that does not fail
**What goes wrong:** adding an optional `scratch` to `common` leaves the property green (nothing emits it); adding a required one without emitting it breaks `encodeDecision`'s compile.
**How to avoid:** the exact edit is three lines in `packages/core/src/DecisionWire.ts` (Q6). Check `git status --short -- packages/core/src/DecisionWire.ts` is empty before, and revert with `git checkout -- packages/core/src/DecisionWire.ts`.

### Pitfall 2: payload bytes moved by key order
See finding 2. The golden (below) is the guard; run it before and after Plan 2 and Plan 3.

### Pitfall 3: the dead `omit` equivalent mutant
See finding 4. Also avoid any `x ? {} : { visibleFields }` shaped conditional spread: its `false` mutant is equivalent when the decoded key is simply absent (Phase 42/43 hit the same trap).

### Pitfall 4: HydrationEngine's base score is probably 1.0
Phase 42's run ended at 183/183 detected for `HydrationEngine.ts` [VERIFIED: `reports/mutation-react/mutation.phase-42.json`, `HydrationEngine.ts 183 183 18`]. The file has changed since (Phase 42 moved code out), so the base must be re-measured, but expect no survivors: **any new survivor is a drop**, and the comparer requires score at or above base, unrounded. Fewer mutants with the same survivors also lowers a score, so do not leave a line a test does not distinguish. The claim row's `obligations: []` is killed by the existing forged-disclosure tests (`DenyObligations`); the `includeTrace` ternaries by the byte pins.

### Pitfall 5: the react suite from the wrong directory
Finding 5. Always `pnpm exec vitest run --project react <paths>` from the repo root, which is also how `stryker.react.mjs` runs it (`dir: "packages/react"`).

### Pitfall 6: spec prose that names the old internals
`INV-QD-059`'s Source says "`HydrationEngine.ts`'s rebuild constructs only those classes" (`spec/invariants.md:2663`-ish); ADR-QD-078's Decision says "the hydration entry derives from it by omitting what the envelope or the disclosure replaces"; the doc comments on `AllowEntry` and `DehydratedEntryWire` say "derived from `DecisionWire`". All stay true in spirit but name a structure that moved; give them dated amendments rather than silent edits (Q8).

### Pitfall 7: a doc fence or example constructing a seed
None exist (Q4), so `pnpm spec:examples` and `pnpm spec:website-examples` are not at risk from the optional key.

## Code Examples

### The payload golden, captured on the base this session (D-09)
Produced by `dehydrateWith([{ policy: hasRole("admin"), decision }], { includeTrace })` and `JSON.stringify`, decisions built with `makeDecision({ evaluationId, subjectId: makeSubjectId("u1"), durationMillis: 3 }, trace)`. The same eight strings came out of the candidate implementation (diffed: `BYTE-IDENTICAL`).

Traces: `allowAll` = `{ policyTag: "HasRole", allowed: true, children: [], obligations: [] }` (id `e1`); `allowFields` = same plus `visibleFields: ["id","title"]` (id `e2`); `allowObliged` = `obligations: [obligation("audit.log", { level: "info" })]` (id `e3`); `deny` = `{ policyTag: "HasRole", allowed: false, reason: "lacks role admin", children: [], obligations: [] }` (id `e4`).

```
allowAll false   {"version":2,"subjectId":"u1","entries":[{"policy":{"_tag":"HasRole","role":"admin"},"decision":{"_tag":"Allow","evaluationId":"e1","durationMillis":3,"obligations":[],"disclosure":{"_tag":"Withheld"}}}]}
allowAll true    {"version":2,"subjectId":"u1","entries":[{"policy":{"_tag":"HasRole","role":"admin"},"decision":{"_tag":"Allow","evaluationId":"e1","durationMillis":3,"obligations":[],"disclosure":{"_tag":"Disclosed","trace":{"policyTag":"HasRole","allowed":true,"children":[],"obligations":[]}}}}]}
allowFields false {"version":2,"subjectId":"u1","entries":[{"policy":{"_tag":"HasRole","role":"admin"},"decision":{"_tag":"Allow","evaluationId":"e2","durationMillis":3,"obligations":[],"visibleFields":["id","title"],"disclosure":{"_tag":"Withheld"}}}]}
allowFields true  {"version":2,"subjectId":"u1","entries":[{"policy":{"_tag":"HasRole","role":"admin"},"decision":{"_tag":"Allow","evaluationId":"e2","durationMillis":3,"obligations":[],"visibleFields":["id","title"],"disclosure":{"_tag":"Disclosed","trace":{"policyTag":"HasRole","allowed":true,"children":[],"obligations":[],"visibleFields":["id","title"]}}}}]}
allowObliged false {"version":2,"subjectId":"u1","entries":[{"policy":{"_tag":"HasRole","role":"admin"},"decision":{"_tag":"Allow","evaluationId":"e3","durationMillis":3,"obligations":[{"id":"audit.log","attributes":{"level":"info"},"advisory":false}],"disclosure":{"_tag":"Withheld"}}}]}
allowObliged true  {"version":2,"subjectId":"u1","entries":[{"policy":{"_tag":"HasRole","role":"admin"},"decision":{"_tag":"Allow","evaluationId":"e3","durationMillis":3,"obligations":[{"id":"audit.log","attributes":{"level":"info"},"advisory":false}],"disclosure":{"_tag":"Disclosed","trace":{"policyTag":"HasRole","allowed":true,"children":[],"obligations":[{"id":"audit.log","attributes":{"level":"info"},"advisory":false}]}}}}]}
deny false       {"version":2,"subjectId":"u1","entries":[{"policy":{"_tag":"HasRole","role":"admin"},"decision":{"_tag":"Deny","evaluationId":"e4","durationMillis":3,"disclosure":{"_tag":"Withheld"}}}]}
deny true        {"version":2,"subjectId":"u1","entries":[{"policy":{"_tag":"HasRole","role":"admin"},"decision":{"_tag":"Deny","evaluationId":"e4","durationMillis":3,"disclosure":{"_tag":"Disclosed","trace":{"policyTag":"HasRole","allowed":false,"reason":"lacks role admin","children":[],"obligations":[]},"reason":"lacks role admin"}}}]}
```
Commit them as string constants (repo precedent: `packages/core/test/fixtures/sinkWireV2.ts` exports string goldens; `HydrationPayload.test.ts:420` pins inline template strings), compared with `assert.strictEqual(JSON.stringify(payload), GOLDEN)`. Re-capture on the actual phase base before committing; do not trust these literals blindly (the executor reproduces them with the generator in Q5).

### The property (HYDF-03), green on the base (ran: 300 runs, seed 2026111501)
```typescript
// packages/react/test/HydrationSeedFields.test.ts
import type { Decision, Trace } from "@qadi/core";
import { encodeDecision, hasRole, makeDecision, makeSubject, makeSubjectId, obligation } from "@qadi/core";
import * as Atom from "effect/reactivity/Atom";
import * as FastCheck from "fast-check";
import { describe, expect, it } from "vitest";
import { dehydrateWith, hydrateWith } from "../src/HydrationEngine.ts";
import type { HydrationSeedLookup } from "../src/HydrationEngine.ts";
import type { SeededDecision } from "../src/SeededDecision.ts";

// Test-local on purpose: the property must be writable on the phase base, where
// the engine's withheld lists are not importable from SeededDecision.ts.
const WITHHELD = {
  Allow: ["_tag", "subjectId", "trace"],
  Deny: ["_tag", "subjectId", "trace", "obligations", "reason"],
} as const;
const alice = makeSubject({ id: "u1" });
const policy = hasRole("admin");   // trace.policyTag "HasRole" so entryAgrees accepts a Disclosed seed

const traceArbitrary: FastCheck.Arbitrary<Trace> = FastCheck.record({
  policyTag: FastCheck.constant("HasRole" as const),
  allowed: FastCheck.boolean(),
  reason: FastCheck.option(FastCheck.constantFrom("r1", "r2"), { nil: undefined }),
  children: FastCheck.constant([]),
  visibleFields: FastCheck.constantFrom(undefined, [], ["a"], ["b", "a"]),
  obligations: FastCheck.constantFrom([], [obligation("x")], [obligation("x", { level: "warn" }), obligation("y")]),
});
const decisionArbitrary: FastCheck.Arbitrary<Decision> = FastCheck.tuple(
  traceArbitrary, FastCheck.string({ minLength: 1 }), FastCheck.nat(),
).map(([trace, evaluationId, durationMillis]) =>
  makeDecision({ evaluationId, subjectId: makeSubjectId("u1"), durationMillis }, trace));

// Capture what `hold` is handed (typed `SeededDecision`, so no cast), not what the pair says.
const seedsOf = (decision: Decision, includeTrace: boolean): ReadonlyArray<SeededDecision> => {
  const held: Array<SeededDecision> = [];
  const lookup: HydrationSeedLookup = () => ({
    hold: (seed) => { held.push(seed); return [Atom.make<SeededDecision | undefined>(undefined), seed]; },
  });
  const payload = JSON.parse(JSON.stringify(dehydrateWith([{ policy, decision }], { includeTrace })));
  void [...hydrateWith(lookup, payload, alice)];
  return held;
};

describe("a seed keeps every disclosed wire field (HYDF-01)", () => {
  it("PROPERTY: every wire field the payload discloses reaches the seed", () => {
    FastCheck.assert(
      FastCheck.property(decisionArbitrary, FastCheck.boolean(), (decision, includeTrace) => {
        const wire = encodeDecision(decision);
        const seeds = seedsOf(decision, includeTrace);
        expect(seeds).toHaveLength(1);
        const seed = new Map(Object.entries(seeds[0] ?? {}));
        const withheld: ReadonlyArray<string> = WITHHELD[wire._tag];
        expect(seed.get("_tag")).toBe(`Seeded${wire._tag}`);
        expect(seed.get("subjectId")).toBe(alice.id);
        for (const [key, value] of Object.entries(wire)) {
          if (!withheld.includes(key)) expect(seed.get(key)).toEqual(value);
        }
      }),
      { numRuns: 300, seed: 2026111501 },
    );
  });
});
```
The scratch run used `as SeededDecision` on the pairs; the version above captures `held` instead, which needs no cast (`SeedSlot.hold` takes a `SeededDecision`, quoted in Q5). Keep the loop `for (const [key, value] of Object.entries(wire))` over the **real `encodeDecision` output**: that is what makes a new wire key (once emitted) a failing key without the test naming it. Add: disclosed branch assertions (`seed.disclosure._tag` is `"Disclosed"` iff `includeTrace`, and equals `{ _tag: "Disclosed", trace: wire.trace }` / with `reason` for a deny), and `visibleFields` explicitly (`seed.get("visibleFields")` toEqual `decision.visibleFields`, covering the absent-versus-`[]` distinction, INV-QD-004).

### Mutation record (written once, never edited)
Reuse Phase 43's writer (`43-01-PLAN.md` Task 1 step 4, inline `node --input-type=module -e`), retargeted. Shape for this phase (no moved file, both files persist):
```json
{ "measured": { "packages/react/src/HydrationEngine.ts": 0.0, "packages/react/src/SeededDecision.ts": 0.0 },
  "unmeasured": {}, "new": [], "deleted": {}, "moved": {} }
```
Differences from 43's writer: config `stryker.react.mjs`, report `reports/mutation-react/mutation.json`, stale-check dirs `packages/react/src`, `packages/react/test` and `packages/core/src` (the vitest alias reads core's source), delete the `MOVE` anchor checks and the `Handover.ts`-exists check. Keep: refuse a report older than the newest file in those dirs (the report on disk now is from Nov 14 20:14 and holds only `SeededQuestion.ts` [VERIFIED: `python3` read of `reports/mutation-react/mutation.json` keys]), refuse a report holding a file not named on `--mutate`, and score = `(Killed + Timeout) / (Killed + Timeout + Survived + NoCoverage)`.

## Q1-Q8 Findings

### Q1: types under `exactOptionalPropertyTypes` (compiled with the repo's `tsconfig.react-base.json`, `tsc 7.0.2+effect-tsgo.0.67.5`)
- `typeof AllowSeedFields.Type` is `{ readonly evaluationId: string; readonly durationMillis: number; readonly visibleFields?: readonly string[] | undefined; readonly obligations: readonly { readonly id: string; readonly attributes: { readonly [x: string]: unknown }; readonly advisory: boolean }[]; readonly disclosure: { readonly _tag: "Withheld" } | { readonly _tag: "Disclosed"; readonly trace: Trace } }`. Quoted from the compiler's own diagnostic, which spelled `visibleFields?: readonly string[] | undefined`.
- The source is `DecisionWireAllow`'s `visibleFields: Schema.optional(Schema.Array(Schema.String))` [VERIFIED: `packages/core/src/DecisionWire.ts:42`, quoted: `visibleFields: Schema.optional(Schema.Array(Schema.String)),`]. In Effect 4.1.2 `Schema.optional` is `T | undefined` on the optional key; `Schema.optionalKey` would be the strict one. D-03 asks the seed to "follow the wire", so it follows `optional`.
- `new SeededAllow({ evaluationId, subjectId, durationMillis, obligations: [], disclosure })` (no `visibleFields`) compiles; `visibleFields: ["a"]` compiles; **`visibleFields: undefined` compiles**; `_tag: "SeededAllow"` in the argument is **rejected** (`'_tag' does not exist in type`), as `Data.TaggedClass` strips `_tag` from the constructor. `a1._tag` has type `"SeededAllow"`. The `Data.TaggedClass` signature is `new<A extends Record<string, any> = {}>(args: Types.VoidIfEmpty<{ readonly [P in keyof A as P extends "_tag" ? never : P]: A[P] }>) => Readonly<A> & { readonly _tag: Tag } & Pipeable.Pipeable` [VERIFIED: node_modules/effect/src/Data.ts:94-99].
- `Equal.equals` (Data structural equality, run on 4.1.2): `new A({e:1})` vs `new A({e:1, v: undefined})` is **false** and the hashes differ; two with `v: undefined` are equal. `Object.keys` shows the absent key is really absent. Nothing in `packages/react/src` compares seeds structurally: `Equal` appears only for `QuestionBook` policy keys, and `SeededQuestion.test.ts` asserts seed **identity** (`assert.strictEqual(decisionIn(first, q), allow)`). The whole react suite (511 tests) passed unchanged against the candidate.
- Behavioural consequence to record: after the change, a rebuilt allow whose payload had no `visibleFields` has no `visibleFields` key (it used to hold `visibleFields: undefined`). `hooks.ts:144` reads `outcome.decision.visibleFields` (type `VisibleFields` for `Allow`, now `... | undefined` optional for `SeededAllow`) and `projectVisible(visibleFields, data)` takes `VisibleFields`: both unchanged.
- `Data.TaggedClass("SeededAllow")<typeof X.Type & { readonly subjectId: SubjectId }>` as a class heritage compiles, and **declaration emit is clean** (no TS2883; `.d.ts` emitted `AllowSeedFields: Schema.Struct<{...}>` with `import("@qadi/core").Trace`). Verified with `tsc` `emitDeclarationOnly` over scratch core+react sources. So D-01's "package-private unless TS2883" resolves to: nothing is added to the barrel; `Hydration.ts`'s named re-exports (`export { SeededAllow, SeededDeny, isSeeded, permits }`, `export type { AllowDisclosure, ClientDecision, DenyDisclosure }`, `export type { SeededDecision }`) stay as they are.

### Q2: `AllowEntry`/`DenyEntry` from the seed structs
Right composition: `Schema.TaggedStruct("Allow", AllowSeedFields.fields)` (and Deny). Verified identical `.Type` and `.Encoded` to the base's `mapFields` result by a compile-time equality assertion (Pattern 2). Strict decode (`onExcessProperty: "error"` inside `untrustedDecoder`) is unchanged because the decode call and the struct shape are unchanged; `DehydratedEntryWire` still holds `Schema.Union([AllowEntry, DenyEntry])`. The base's `mapFields((fields) => ({ ...Struct.omit(fields, ALLOW_WITHHELD), disclosure }))` and the new form give `Object.keys(entry.fields)` in the same order for the Deny and the same keys for the Allow, but the **payload** order is not schema-driven (finding 2), so nothing about the decode order matters.

### Q3: the table encoding (prototype run)
What compiled and what did not, all against `tsconfig.react-base.json`:

| Encoding | Result |
|----------|--------|
| `interface Row<V>` + `VERDICTS: { [V in Verdict]: Row<V> }`, call `VERDICTS[tag].entry(wire, ...)` inside a generic function | **fails**: parameter reduced to `never` (union of rows) |
| same table, but an accessor `const rowOf = <V extends Verdict>(tag: V): Row<V> => VERDICTS[tag]`, helper `<V>(tag: V, wire: WireOf[V])` | **compiles**, including call sites with the union (`wire._tag`, `wire`) |
| helper reading the tag off the value, `<V>(wire: WireOf[V])` and `rowOf(wire._tag)` | **fails**: `wire._tag` is not `V` |
| helper `<V>(wire: WireOf[V] & { readonly _tag: V })` and `rowOf(wire._tag)` | **compiles**; call sites pass the union with no tag argument; `rebuild<"Allow">(denyEntry)` is **rejected** (soundness probe) |
| `new SeededAllow({ ...entry, subjectId })` (entry still carries `_tag: "Allow"`) | **compiles**; at runtime `_tag` is `"SeededAllow"` (class field assigned after `Object.assign`; `Object.keys` `['_tag','e','s']`) |
| `new SeededAllow({ ...Struct.omit(entry, ["_tag"]), subjectId })` | compiles, but the `omit` is dead (finding 4) |

The `claim` row takes `(entry, disclosure)`: `entryAgrees` narrows `decision.disclosure` (a property reference), not `decision`, so the narrowed disclosure is passed beside the entry; the Allow row uses the entry's `visibleFields`/`obligations`, the Deny row uses `disclosure.reason`, matching `entryAgrees` today exactly. Dispatch is an index, so D-05's "dispatch on `_tag` uses `Match`" has no occasion to apply; `FieldLattice.ts`'s own-property table is the precedent and no `Object.hasOwn` is needed because `_tag` is a decoded closed union, not an arbitrary string (the strict decode already refused anything else). If the planner prefers `Match.tagsExhaustive` returning the row, it needs one Match per accessor (three) and repeats the branch; not recommended.

Scratch prototypes: `/private/tmp/claude-502/-Users-mohammadalmechkor-Projects-Perso-qadi/bf083921-e7cd-4930-bcad-a3ef483d2ac8/scratchpad/p2/c.ts` (the type experiments) and the full candidate sources `.../scratchpad/ws/packages/react/src/{SeededDecision,HydrationEngine}.ts`. Candidate results: `tsc -p` over core+react `src` clean; `oxlint` printed no diagnostics on the two files; 511/511 react tests, 34 files, pass.

### Q4: every site that constructs or reads a seed, and what breaks
**Constructions of `SeededAllow`/`SeededDeny`** [VERIFIED: `grep -rn "SeededAllow(\|SeededDeny(\|new Seeded"` over `packages/*/test features examples spec apps/website/src`]: only the tests `DecisionOutcome.test.ts:74,82`, `HydrationEvent.test.ts:98`, `DeveloperSignals.test.ts:50`, `SeededQuestion.test.ts:14,153` (the last is a `SeededDeny`, no `visibleFields`); `HydrationEngine.ts` `rebuild`. None in `examples/`, `features/`, `apps/website` fences or `spec/` typescript fences. The four `SeededAllow` tests pass `visibleFields: undefined`; they still compile and pass, but D-03 asks to omit the key, so edit those four (one line each) and keep `HydrationEngine.test.ts`/`HydrationPayload.test.ts` untouched.
**Readers**: `DecisionOutcome.ts:42,71,72,87,89` (types and `Match` arms only), `components.tsx:14,71,73` (`SeededDeny` type), `hooks.ts:143-144` (`outcome.decision.visibleFields`), `SeededQuestion.ts` (no field read; comment only), `DeveloperSignals.ts` (names `SeededDecision`). `@qadi/devtools` has **no** read of a seed's fields: its `visibleFields` mentions (`Inspect.ts:87,119,183,229`) are trace/`Allow` fields. `examples/nextjs-newsroom` reads only the `_tag` name (`seed.test.tsx:97`, `ssr.spec.ts:191`).
**Type-surface pins**: `Hydration.tst.ts:40,41,56` and `DecisionOutcome.tst.ts:20,24` pin union membership of names (`Allow | Deny | SeededAllow | SeededDeny`), not field shapes, so they are unaffected. `spec/overview.md:585-586` rows describe `SeededAllow`/`SeededDeny` (class, "projection (verdict, visible fields, obligations) and a `disclosure`") and stay accurate; nothing is added or removed from any barrel, so gate 13 (`pnpm spec:api`) is unchanged. An optional tstyche pin is worthwhile and cheap (ADR-QD-135 precedent, `SinkRecord.tst.ts`): `ConstructorParameters<typeof SeededAllow>[0]` equals `typeof AllowSeedFields.Type & { readonly subjectId: SubjectId }`, importing the structs from `../src/SeededDecision.ts` as `Hydration.tst.ts:34` already imports `permits` from there. `tstyche.json` uses `tsconfig.test.json`.
**Public type-surface consequence of D-03, stated honestly:** the readable type of `visibleFields` on an instance changes from required `VisibleFields` (`ReadonlyArray<string> | undefined`) to optional with `| undefined`. Constructing gets looser (the key may be omitted; `undefined` still accepted). The only break is a consumer assigning a `SeededAllow` to a type that **requires** the key. D-12 is the user's locked decision (minor, Breaking), so the changeset says **Breaking** and names exactly that; the `upgrading.md` entry should say the instance no longer has the key when the server sent none.

### Q5: test infrastructure
- fast-check convention: `import * as FastCheck from "fast-check"`, `FastCheck.assert(FastCheck.property(arbs..., fn), { numRuns, seed: <numeric literal like 2026100801> })` [VERIFIED: `packages/core/test/DecisionAgreement.test.ts:127-142`; react: `DecisionOutcome.test.ts:269`, `HydrationPayload.test.ts:122`]. Tests in react use `vitest`'s `describe/it/expect` or `@effect/vitest`'s `assert`.
- **Arbitraries are not shared across packages.** `traceArbitrary` lives in `packages/core/test/TraceOracle.ts` (test-only, `maxDepth` recursive, `FastCheck.record` with `fieldsChoice = constantFrom(undefined, [], ["a"], ["b","a"])` and an `obligationsChoice` of `obligation("x")` variants [VERIFIED: TraceOracle.ts:141-173]); no react test imports core's test files. Build a small local root-only arbitrary as above (children `[]`, `policyTag` fixed to `"HasRole"` with policy `hasRole("admin")` so `entryAgrees` accepts the disclosed seed). `makeDecision(stamp, trace)` is the exported constructor (`packages/core/src/Decision.ts:185`, quoted: `export const makeDecision = (stamp: DecisionStamp, trace: Trace): Decision =>`); with `allowed: true` and a restricted trace it yields an `Allow` carrying the trace's `visibleFields` and `obligations`.
- **`SeedSlot`** [VERIFIED: `packages/react/src/SeededQuestion.ts:62-64`, quoted: `export interface SeedSlot { readonly hold: (decision: SeededDecision) => readonly [Atom.Atom<unknown>, unknown]; }`]; `HydrationSeedLookup = (policy: Policy, resource: Resource | undefined) => SeedSlot` [VERIFIED: HydrationEngine.ts:587]. `HydrationEngine.test.ts:60-90` already shows a recording lookup.
- **Existing byte pin:** `packages/react/test/HydrationPayload.test.ts:420-475`, "dehydrateDecisions' output is pinned byte for byte (ARCH-51)": covers an allow with all fields visible and no obligations plus a deny, each at `includeTrace` off and on, never `visibleFields` present and never non-empty `obligations`. D-09's golden therefore **extends** it (two new allow shapes); either add them there or in the new file. The new file also needs a row in `spec/traceability.md` (§4 test-file table; `verify-traceability.sh` check 6 requires every cited test file to exist, so cite only files that do).
- Existing per-field seed assertions are hand-written (`HydrationPayload.test.ts:244-247`: verdict, `evaluationId`, `visibleFields`, `obligations`); the property is what makes the set generic.
- To generate the golden strings: a throwaway `test/gen.test.ts` printing `JSON.stringify(dehydrateWith(...))` per case via `process.stdout.write`, run with `pnpm exec vitest run --project react packages/react/test/gen.test.ts`, then deleted (it must not be committed: `process.stdout` in test scope is fine but the file is scratch).

### Q6: the scratch-field RED procedure (run, in a scratch copy)
Precondition: `git status --short -- packages/core/src/DecisionWire.ts` prints nothing. Edit `packages/core/src/DecisionWire.ts` (line numbers are the base's):
1. `common` (lines 26-31): add `  scratch: Schema.String,` after `trace: TraceSchema,`.
2. `encodeDecision`'s Allow literal (:80-90) and Deny literal (:91-99): add `scratch: "x",` after `trace: decision.trace,`.

Quoted base `common`: `const common = { evaluationId: Schema.String, subjectId: Schema.String, durationMillis: Schema.Number, trace: TraceSchema, };` [VERIFIED: DecisionWire.ts:26-31].

Results on the **phase base** (react code unchanged): `pnpm exec vitest run --project react packages/react/test/HydrationSeedFields.test.ts` fails with `Property failed after 1 tests ... Caused by: AssertionError: expected undefined to deeply equal 'x'` (counterexample a `Deny`, `includeTrace` false). `tsc -p` over core+react `src` with the scratch edit applied printed **no diagnostics** (it compiles), because `encodeDecision` now emits the field and every other consumer of `DecisionWire` is `SinkCodec.ts` (embeds the union; its own tests would fail, irrelevant here) and `decodeDecision` (ignores it). `decisionDisagreement`/`makeDecision` do not interfere: they read the trace, not `common`. Vitest resolves `@qadi/core` through `packages/react/vitest.config.ts`'s alias to `../core/src/index.ts`, so **no core build is needed for the RED run**. `pnpm typecheck` (`tsc -b`) rebuilds `packages/core/lib` first, because `packages/react/tsconfig.src.json` references core's project.
On the **candidate** (after Plans 2 and 3) the same scratch edit makes the property pass (run: `Tests 1 passed`): the field flows entry to seed.
Revert: `git checkout -- packages/core/src/DecisionWire.ts`, then confirm `git status --short -- packages/core` is empty, then `pnpm typecheck` once so `lib/` matches. The scratch edit is never committed; record the failing output and the revert command in the SUMMARY.

### Q7: mutation baseline
- `stryker.react.mjs`'s own `mutate` list is `DecisionOutcome.ts`, `QuestionBook.ts`, `HydrationEvent.ts`, `SweepScheduler.ts` [VERIFIED: stryker.react.mjs]; **neither target file is in it**. As in Phase 42 (`42-01-PLAN.md`, `pnpm exec stryker run stryker.react.mjs --mutate '<comma list>'`), `--mutate` overrides it and the config is not edited.
- **Base and close command (the same string both times):** `pnpm exec stryker run stryker.react.mjs --mutate 'packages/react/src/HydrationEngine.ts,packages/react/src/SeededDecision.ts'`, in the background (ADR-QD-098), one Stryker run at a time. `thresholds { high: 90, low: 80, break: 80 }`; an exit 1 after "below breaking threshold" with the report written is not a failed baseline. Report: `reports/mutation-react/mutation.json` (gitignored, `.gitignore:19`).
- **Runtime:** Phase 42's 3-file run on `QadiAtoms/HydrationEngine/SeededQuestion` took 1 minute 15 seconds [VERIFIED: `42-01-SUMMARY.md` "final score 96.19, 1 minute 15 seconds"]. Two files with a similar suite should be comparable. I did not run Stryker here (it would overwrite the on-disk report and `.stryker-tmp`).
- **Phase 42's record:** `42-mutation-base.json` `measured`: `HydrationEngine.ts` 0.9783549783549783, `QadiAtoms.ts` 0.896551724137931; `moved.SeededQuestion.ts` region 62/67. The "57/62" in the brief is the `SeededQuestion.ts` row of the **after** run (`mutation.phase-42.json`: `SeededQuestion.ts 57 62`, `HydrationEngine.ts 183 183`, `QadiAtoms.ts 36 40`). `SeededDecision.ts` has no recorded score anywhere, so its base is new information; it is small, and its mutable code (`verdictOf`/`seededOf` `Match` arms, `permits`, `isSeeded`) is covered by `DecisionOutcome.test.ts` and `Hydration.test.ts`.
- **Writer/comparer:** no checked-in script; Phase 43 used inline `node --input-type=module -e '...'` in `43-01-PLAN.md` Task 1 (writer) and `43-08-PLAN.md` Task 1 (comparer: refuses a report whose files are not exactly the named ones or whose `source` differs from disk, requires each `measured` file at or above base unrounded, writes `4X-mutation-after.json` flat `{path: score}` only on success, committed `chore(44-0N)`). Retarget it (record shape above). Base JSON is committed alone as the first plan commit (`chore(44-01): mutation baseline ...`), "written once, never edited".
- `ignoreStatic: true` skips mutants in module-scope code, so the structs, withheld lists and `VERDICTS` object literal itself are not mutated; the row **function bodies** are (they run per call).

### Q8: spec landing spots
- **Free ids** [VERIFIED: `git grep -lE -- '(ARCH-91|ADR-QD-157|CCR-QD-435|BEH-QD-55[6-9]|BEH-QD-560|INV-QD-33[34])([^0-9]|$)' -- spec packages .changeset AGENTS.md CONTRIBUTING.md features apps/website/src examples scripts` printed nothing; no `spec/decisions/157-*` file exists]. Latest in use: ADR-QD-156, CCR-QD-434, BEH-QD-551/552, INV-QD-331. `scripts/next-id.mjs` was not run.
- **ADR-QD-157** file `spec/decisions/157-a-seeds-fields-are-the-wires-stated-once.md` (slug is the planner's), Document Control (ID `QADI-ADR-157`, Rev 1.0, Status `Accepted — amends ADR-QD-078; reads ADR-QD-135, ADR-QD-155`, Change History `1.0 (date): Initial (ARCH-91, CCR-QD-435)`), `## Context`, `## Decision`, `## Alternatives considered`, `## Consequences`, `## Related` (format of 155/156). Registry entry in `spec/decisions/index.yaml` after the ADR-QD-156 entry (`id`, `file`, `title`, `status`). Gate: Document ID equals the file number. ADR-QD-135's Context shows the evidence style to copy: "What it cost, measured on the phase base before any source change" (here: the Q6 scratch-field run).
- **Amendments (dated, with a Revision bump), not silent edits:** ADR-QD-078 (Decision paragraph "the hydration entry derives from it by omitting what the envelope or the disclosure replaces"; its Status line and Change History row; currently Rev 1.4); INV-QD-059's Source ("`HydrationEngine.ts`'s rebuild constructs only those classes", `spec/invariants.md`, section at ~2657); INV-QD-022's Source (entry "derived from `@qadi/core`'s `DecisionWire`, not restated"); the doc comments of `AllowEntry`/`DenyEntry`/`DehydratedEntryWire`. ADR-QD-155 only needs a "see ADR-QD-157" note if the planner wants one; it is not contradicted. ADR-QD-135 gets nothing but may be cited as the pattern in Related. **No AGENTS.md section names `ALLOW_WITHHELD`, `DENY_WITHHELD`, `AllowEntry` or `DenyEntry`** [VERIFIED: repo-wide grep; they appear only in `HydrationEngine.ts` and one historical CCR row, `spec/README.md:357`], so D-11's "AGENTS.md wherever a section names a moved constant" is **nothing to do**. Open Question 2 covers an optional section 7 sentence.
- **BEH:** `spec/behaviors/19-hydration.md` (Rev 1.21, Change History at the header row; effective 2026-10-08). BEH-QD-148's requirements already say a hydrated decision "MUST carry the same verdict, the same `visibleFields` and the same obligations" and keep `evaluationId`, and its prose lists the seed's fields. The new statement is the generic one: **BEH-QD-556** "A seed carries every field the payload discloses" (a field on the wire entry reaches the seed). Add it near BEH-QD-148 (the file is not in numeric order) with `> **Invariant:**`/`> **See:**` lines and a `REQUIREMENT:` block. BEH-QD-557..560 unused: name them in the CCR row. `spec/behaviors/index.yaml` lists files only.
- **INV:** no existing invariant says a seed carries every disclosed wire field: INV-QD-022 (subject binding and strict validation), INV-QD-059 (no fabricated trace), INV-QD-170 (agreement with the trace), INV-QD-045 (accounting) are different statements [VERIFIED: read each Source/statement]. **Use INV-QD-333**: "A seed's fields are the wire's: the fields a payload entry carries are the fields the seed carries, and a field added to the wire reaches both." Model: INV-QD-290 (`spec/invariants.md:3581`), format `## INV-QD-333: ...` then one-sentence statement, `**Source**:`, `**Implication**:`, `**Enforcement**:`, `**Related**:`, `---`, appended after the last. INV-QD-334 unused unless review finds another. Enforcement lists: the property, the golden, the optional tstyche pin, and `Hydration*.test.ts` round trips.
- **CCR-QD-435** row in `spec/README.md` after CCR-QD-434 (`:371`): `| CCR-QD-435 | 2026-11-15 | <every file with its new revision> | ARCH-91. **<bold title>.** <what and why> |`, plus a Change History line in README's Document Control and a Revision bump (currently 1.184). Name unused reservations ("Unused: BEH-QD-557..560, INV-QD-334").
- **Traceability** (`spec/traceability.md`, Rev 1.180): rows to touch: the "19 — Decision Hydration" behaviour row (`:61`, add BEH-QD-556 and `SeededDecision.ts`'s role), an INV-QD-333 row (model `:105` style), INV-QD-022/059/170 rows if their Source text changes, an ADR-QD-157 row beside `:315`/`:316`, the ADR-QD-078 row ("amended by ADR-QD-157"), the §4 test-file table: new `packages/react/test/HydrationSeedFields.test.ts` row (BEH-QD-556, BEH-QD-148, INV-QD-333, INV-QD-170, ADR-QD-157), `HydrationEngine.test.ts`/`HydrationPayload.test.ts` rows if touched (`:380`, `:382`). `pnpm spec:verify:strict` is the gate.
- **overview.md**: unchanged unless a barrel export moves; if the planner still bumps its revision for the SeededAllow row prose, that is optional. Gate 13 (`pnpm spec:api`) needs no row for the package-private structs.
- **Website docs** (`apps/website/src/content/docs/docs/packages/react/hydration.md:161-172`): describe `SeededAllow`/`SeededDeny` in prose ("carrying a `disclosure` ...") with no field table and no fence constructing one, so **no change is required**; `hooks.md:59-60,123,149,165` only type-reference them. `spec/behaviors/09-react.md:124-136` and `spec/appendices/react-integration.md:185` likewise.
- **Changeset:** `.changeset/<slug>.md`, front matter `"@qadi/react": minor`, prose beginning `**Breaking.**`, ending "See the 0.13 section of the upgrade guide, `/docs/reference/upgrading/`." (models: `core-handover-options.md`; the Phase 42 react changeset `react-seeded-question-owns-its-computing-atom.md` is a `patch` and is **not** the model for this break). Do not touch any `CHANGELOG.md`. `@qadi/react` is at `0.12.0` [VERIFIED: packages/react/package.json].
- **`upgrading.md`** (`apps/website/src/content/docs/docs/reference/upgrading.md`): the current latest entries are `## 0.13: ...` (`:619`, `:664`, `:693`). Add `## 0.13: a seeded allow has no visibleFields key when the server sent none` (or similar) with a Before block (` ```ts `, not compiled) and an After block (` ```typescript `, compiled by `pnpm spec:website-examples`, so it must type-check against the real API), ending "The decision is [ADR-QD-157](https://github.com/leaderiop/qadi/blob/main/spec/decisions/157-....md)." A compiling After fence can build a `SeededAllow` without `visibleFields` through `@qadi/react`'s public re-exports.

## State of the Art

| Old Approach | Current Approach | Changed | Impact |
|--------------|------------------|---------|--------|
| Field list in the class, the entry, `dehydrate` and `rebuild` | One struct, class typed by it, entry derived | ADR-QD-135 (sink records), ADR-QD-157 (seed) | A wire field cannot be dropped on read |
| Allow/Deny `if` written three times | One closed table read by three functions | ADR-QD-092/152 pattern | A new verdict is a compile error in one place |

**Deprecated/outdated:** `ALLOW_WITHHELD`/`DENY_WITHHELD` and `AllowEntry`/`DenyEntry` as engine-private constants (they move to / derive from `SeededDecision.ts`).

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | The two-file Stryker run takes about as long as Phase 42's three-file run (about 1 to 2 minutes) | Q7 | A longer wait only; no design change |
| A2 | `HydrationEngine.ts`'s base score is at or near 1.0 (inferred from Phase 42's final 183/183; the file changed after that) | Pitfall 4 | The base JSON records the truth either way; only the amount of test work to avoid a drop changes |
| A3 | An optional AGENTS.md section 7 sentence ("the seed's fields are a third schema-first definition") is wanted | Open Questions | None; section 7 prose is not gated by a budget table |
| A4 | The vitest property runtime is small (the scratch run was 2.25 s total for the one file) | Q5 | None |

All other claims were read or run this session.

## Open Questions

1. **Is `Breaking` the right label for D-12, given the type only loosens?**
   - What we know: `visibleFields` becomes `?: readonly string[] | undefined`; construction with or without the key compiles; reading is unchanged; the break is only assignability to a required-key type, plus the runtime fact that the key is absent when the server sent none (`"visibleFields" in seed`, `Object.keys`, `Equal.equals` against a seed built with an explicit `undefined`).
   - What's unclear: whether the user wants that called Breaking. D-12 says yes, so the plan follows it.
   - Recommendation: keep D-12 as locked; word the changeset/`upgrading.md` with the real consequence, not a claim that construction breaks.
2. **AGENTS.md section 7 names two schema-first exceptions ("the Policy ADT", "the sink record envelope is the second").** The seed's fields are a third by the same trust-boundary reasoning. Recommendation: one added sentence in section 7 naming ADR-QD-157, as ADR-QD-135 did for the second; it is not required by D-11 (no moved constant is named) and is not budget-gated.
3. **Where the golden lives.** Recommendation: the eight strings in the new `HydrationSeedFields.test.ts` (one file for HYDF-03 and HYDF-04, one traceability row), leaving the ARCH-51 pins untouched.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| node | everything | yes | v26.13.0 | none needed |
| pnpm | commands | yes | 10.17.1 | none needed |
| TypeScript (tsgo build) | typecheck | yes | 7.0.2+effect-tsgo.0.67.5 | none needed |
| vitest | tests | yes | 5.1.0 | none needed |
| Stryker core + vitest-runner | WX-05 | yes | 10.1.1 | none needed |
| tstyche | optional pin | yes | ^7.2.5 | none needed |

No missing dependency. (Not probed and not needed: a browser, Docker, a database.)

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest 5.1.0 (`@effect/vitest`, `fast-check` 4.10.2), tstyche for type pins |
| Config file | root `vitest.config.ts` (`projects: ["packages/*"]`), `packages/react/vitest.config.ts` (`name: "react"`, `happy-dom`, `setupFiles test/setupTests.ts`, alias `@qadi/core` to core source), `tstyche.json` |
| Quick run command | `pnpm exec vitest run --project react packages/react/test/HydrationSeedFields.test.ts packages/react/test/HydrationPayload.test.ts packages/react/test/HydrationEngine.test.ts` (from the repo root, not from `packages/react`) |
| Full suite command | `pnpm check:pr < /dev/null` (derives from `check`, skips only `pnpm mutation`); fast loop `pnpm check:fast` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| HYDF-01 | seed fields are the wire's minus withheld; classes typed by the struct | property + type pin | `pnpm exec vitest run --project react packages/react/test/HydrationSeedFields.test.ts`; `pnpm test:tstyche` (optional constructor-input pin) | Wave 0 (new) |
| HYDF-02 | branch written once; spreads with one `subjectId` | structural scan + typecheck | `pnpm typecheck`; a grep acceptance: `_tag === "Allow"` / `"Deny"` count in `HydrationEngine.ts` is 0, and no `evaluationId`/`durationMillis` token in `rebuild` or `SeededDecision.ts` field lists | n/a (gate in plan) |
| HYDF-03 | any Decision to entry to seed keeps every disclosed wire field; RED with scratch field | property | same property file; RED by the Q6 scratch edit on the base, GREEN on the candidate | Wave 0 (new) |
| HYDF-04 | `entryAgrees` unchanged; payload bytes identical | golden + existing forged-disclosure tests | `pnpm exec vitest run --project react packages/react/test/HydrationSeedFields.test.ts packages/react/test/HydrationPayload.test.ts` (golden, "four forged disclosures dropped", mutated-trace property, evaluated control) | Wave 0 (golden new); the forged-disclosure tests exist |
| WX-01 | `check:pr` green | gate | `pnpm check:pr < /dev/null` | exists |
| WX-02 | only reserved ids | scan | `git grep -nE 'ADR-QD-NEXT|CCR-QD-NEXT|BEH-QD-NEXT|INV-QD-NEXT' -- packages spec` empty; the ids used are exactly ARCH-91, ADR-QD-157, CCR-QD-435, BEH-QD-556..560, INV-QD-333..334 | exists (gate `[no-numbering-placeholder]`) |
| WX-03 | overview names added exports | gate | `pnpm spec:api` (nothing added; must stay green) | exists |
| WX-04 | no forbidden construct | `pnpm lint` (oxlint + `check-house-style.mjs`) and a diff scan over `packages/*/src` since the phase base (as `43-08` Task 2) | `pnpm lint` | exists |
| WX-05 | coverage holds; Stryker not below base | coverage + per-file Stryker | `pnpm coverage` (react 90); `pnpm exec stryker run stryker.react.mjs --mutate 'packages/react/src/HydrationEngine.ts,packages/react/src/SeededDecision.ts'` then the comparer against `44-mutation-base.json` | base in Wave 0 |
| WX-06 | tests precede the change | git order | the base JSON, golden and property commits precede the first `packages/react/src` edit (`git log --format=%H -- packages/react/src` has no earlier commit on the branch after the phase base) | Wave 0 |
| WX-07 | Breaking recorded | review | `.changeset/*.md` contains `"@qadi/react": minor` and `**Breaking.**`; `upgrading.md` has the entry; `pnpm spec:website-examples` for its After fence | Wave 0 |

### Sampling Rate
- **Per task commit:** the quick run command, plus `pnpm typecheck` after any `src` edit and `pnpm circular` after Plan 2 (no new edge is expected: `SeededDecision.ts` stays a leaf that imports only `@qadi/core` and `effect/*`).
- **Per wave merge:** `pnpm check:fast`.
- **Phase gate:** `pnpm check:pr < /dev/null` green, then the Stryker comparer exit 0, before `/gsd-verify-work`.

### Wave 0 Gaps
- [ ] `packages/react/test/HydrationSeedFields.test.ts`: property (HYDF-03) and the eight-string golden (HYDF-04).
- [ ] `44-mutation-base.json` (retargeted Phase 43 writer; first plan commit, alone).
- [ ] RED evidence recorded in the SUMMARY: the failing output and `git checkout -- packages/core/src/DecisionWire.ts`.
- [ ] Optional `SeededDecision` constructor-input pin in a `.tst.ts` (add the row to traceability).
- No framework install is needed.

## Security Domain

Security enforcement is enabled (`workflow.security_enforcement: true`, ASVS level 1, block on high).

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|------------------|
| V2 Authentication | no | none in this phase |
| V3 Session Management | no | none |
| V4 Access Control | yes (a seed is an authorization decision crossing a network) | subject-bound payload (INV-QD-022), a seed never outlives the client's answer (INV-QD-028), a seed is not an authority (ADR-QD-039); all unchanged |
| V5 Input Validation | yes | strict entry decode through `untrustedDecoder` (`onExcessProperty: "error"`, depth guard), `entryAgrees` through `decisionDisagreement`; unchanged |
| V6 Cryptography | no | none |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| A new `DecisionWire` field is auto-disclosed to the browser: the payload entry is a **deny-list** (`Struct.omit(wire, WITHHELD)`), so any field added to `common` ships by default. This is true on the base and does not change here; it is the sibling of the defect being fixed. | Information disclosure | The golden (any new shipped key changes the bytes and fails the test) and the withheld lists being the one place to say "not shipped". An allow-list was not requested; record it as a consequence in ADR-QD-157, not as a change. |
| Trace/reason leakage (BEH-QD-147 default `Withheld`) | Information disclosure | `disclosure` stays a tagged union, `Withheld` unless `includeTrace`; the property and golden cover both modes; `DENY_WITHHELD` keeps `obligations` and `reason` out of a denial's entry and seed (D-04) |
| An untrusted payload key reaching the seed through the new spread | Tampering | The only thing spread is the **decoded** entry (a fresh Schema output of declared keys after the strict decode, which already refuses an excess key such as `subjectId` or `scratch`); `subjectId` is written last from the envelope, which the strict decode already requires to equal the hydrating subject (INV-QD-022). Keep the spread behind `decodeEntry`, never a raw entry. |
| Forged or spliced disclosure (trace that contradicts the entry or names another policy) | Spoofing/Tampering | `entryAgrees`: `policyTag` check then `decisionDisagreement` with the row's claim (INV-QD-170); the Deny claim must keep `obligations: []` (so a denial entry with a trace that holds duties is refused) and the existing four forged-disclosure tests plus the mutated-trace property cover it |
| Fail-closed read of a seed (`SeededAllow` read as `Allow`) | Elevation of privilege | `_tag` stays `"SeededAllow"` (class field overrides the spread's `_tag: "Allow"`); the property asserts `_tag` equals `Seeded<verdict>` so a regression that lets the spread's tag win is caught |

## Sources

### Primary (HIGH confidence, read or run this session)
- `packages/react/src/HydrationEngine.ts`, `SeededDecision.ts`, `SeededQuestion.ts:62-64`, `Hydration.ts`, `hooks.ts:130-145`; `packages/core/src/DecisionWire.ts`, `Decision.ts` (`DecisionClaim`, `decisionDisagreement`, `makeDecision`), `SinkRecordFields.ts`, `FieldLattice.ts:79` (`VisibleFields`)
- `node_modules/effect/src/Data.ts:94-99` (`TaggedClass`), `Struct.ts` (`omit`), effect 4.1.2 behaviour by compiling (`tsc`) and running (`node`) scratch files under the scratchpad
- Scratch workspace runs: base property green, scratch-field RED, candidate GREEN, candidate full react suite 511/511, candidate vs base payload diff (`BYTE-IDENTICAL`), declaration emit
- `tsconfig.base.json`, `tsconfig.react-base.json`, `packages/react/{package.json,vitest.config.ts,tsconfig.src.json}`, `stryker.react.mjs`, `vitest.config.ts`, `tstyche.json`, `pnpm-workspace.yaml`
- Tests: `HydrationEngine.test.ts`, `HydrationPayload.test.ts` (pins at `:420-475`), `SeededQuestion.test.ts`, `DecisionOutcome.test.ts`, `HydrationEvent.test.ts`, `DeveloperSignals.test.ts`; `packages/core/test/DecisionAgreement.test.ts`, `TraceOracle.ts`
- `spec/behaviors/19-hydration.md`, `spec/invariants.md` (INV-QD-022, 059, 170, 290), `spec/decisions/{078,135}-*.md`, `index.yaml`, `spec/README.md`, `spec/traceability.md`, `spec/overview.md:585-586`
- `.planning/phases/QD-43-*/43-RESEARCH.md`, `43-01-PLAN.md`, `43-08-PLAN.md`, `43-mutation-base.json`; `.planning/milestones/v1.4-phases/QD-42-*/42-mutation-base.json`, `42-01-PLAN.md`, `42-01-SUMMARY.md`; `reports/mutation-react/mutation.phase-42.json`
- `.changeset/core-handover-options.md`, `react-seeded-question-owns-its-computing-atom.md`; `apps/website/.../reference/upgrading.md`

### Secondary / Tertiary
None. No web source was needed.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH. No change; versions read from the workspace.
- Architecture: HIGH. Compiled, linted, run against the full react suite and byte-diffed against the base.
- Pitfalls: HIGH. Each one was hit or reproduced (the vitest cwd failure, the RED edit shapes, the byte order, the `_tag` override).
- Spec landing spots: HIGH for formats and ids (read and `git grep`), MEDIUM for which prose needs amending (a judgement).

**Research date:** 2026-11-15
**Valid until:** 2026-12-15 (stable internal code; re-check line numbers if Phase 45/46 touch `packages/react`, which they should not).
