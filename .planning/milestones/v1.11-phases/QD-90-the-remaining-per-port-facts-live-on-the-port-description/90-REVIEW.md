---
phase: QD-90-the-remaining-per-port-facts-live-on-the-port-description
reviewed: 2026-11-26T10:23:47Z
depth: deep
files_reviewed: 36
files_reviewed_list:
  - .changeset/core-port-facts-on-the-description.md
  - AGENTS.md
  - apps/website/src/content/docs/docs/reference/upgrading.md
  - packages/core/bench/Evaluate.bench.ts
  - packages/core/src/AttributeResolver.ts
  - packages/core/src/CustomPredicate.ts
  - packages/core/src/DecisionHistory.ts
  - packages/core/src/LeafNeeds.ts
  - packages/core/src/PortAccess.ts
  - packages/core/src/PortDerivation.ts
  - packages/core/src/PortDescription.ts
  - packages/core/src/PortMetrics.ts
  - packages/core/src/PortName.ts
  - packages/core/src/Ports.ts
  - packages/core/src/RelationshipResolver.ts
  - packages/core/src/ScopedLeaf.ts
  - packages/core/src/SignatureHistory.ts
  - packages/core/test/LeafNeeds.test.ts
  - packages/core/test/PortDescription.test.ts
  - packages/core/test/PortFacts.characterisation.test.ts
  - packages/core/test/PortFacts.tst.ts
  - packages/core/test/PortName.tst.ts
  - spec/README.md
  - spec/behaviors/30-port-calls.md
  - spec/decisions/094-a-port-is-described-once.md
  - spec/decisions/134-a-resource-scoped-port-read-is-one-read.md
  - spec/decisions/163-what-a-leaf-needs-from-the-request-is-stated-once.md
  - spec/decisions/203-the-remaining-per-port-facts-live-on-the-port-description.md
  - spec/decisions/index.yaml
  - spec/invariants.md
  - spec/overview.md
  - spec/traceability.md
  - .planning/phases/QD-90-the-remaining-per-port-facts-live-on-the-port-description/90-check.mjs
  - .planning/phases/QD-90-the-remaining-per-port-facts-live-on-the-port-description/90-mutation.mjs
  - .planning/phases/QD-90-the-remaining-per-port-facts-live-on-the-port-description/90-pinned-check.mjs
  - .planning/phases/QD-90-the-remaining-per-port-facts-live-on-the-port-description/90-earlier-checks.mjs
findings:
  critical: 0
  warning: 7
  info: 7
  total: 14
  necessity: 1
status: issues_found
---

# Phase 90: Code Review Report

**Reviewed:** 2026-11-26T10:23:47Z
**Depth:** deep
**Files Reviewed:** 36
**Status:** issues_found

## Summary

Scope: `git diff 46174873..060f2eae -- packages spec AGENTS.md .changeset apps` (32 files), plus the four phase scripts,
checked for whether they can fail on what they claim. HEAD has since moved to `2c225694`, a planning-only commit. Its
product diff against `060f2eae` is empty, so the findings hold at HEAD.

The runtime behaviour is unchanged. Every scoped read routes as it did at the base: an `Any` read takes `readPort` with
the request as it is, and a `Resource` or relationship read runs `requireResourceId` first. The fixture builders that
moved above their descriptions are only taken by reference, so they cause no TDZ hazard. The metric preregistration order
is preserved.

The defects are in the guarantees the phase claims and in what it says about them:

- The `Always` arm of the route matcher is dead code. The spec claims the row is read on every scoped read, and that is
  false for the relationship port.
- The derived `ScopedPort` makes the compiler ask for a `scopedCall` row, but nothing makes the read site route through
  `readScoped`. I verified this in a scratch clone: a reclassified leaf compiles and skips the id check.
- `DistinctSpanNames` accepts union spans, including two ports that share a literal through overlapping unions. Verified
  with `tsc`.
- The upgrade guide's migration example cannot compile, before or after the change.
- Several doc and spec sentences about `PORT_FIXTURES` and about the description's own span are false at HEAD.

No product file added in this phase uses phase-relative wording (grep over added lines). Necessity rubric loaded.

Re-bench constraint: `routing-landed` (90-check.mjs:1215-1232) compares `PortAccess.ts`, `LeafNeeds.ts` and `ScopedLeaf.ts`
whole against the base plus `routing.patch`, with comments blanked. `90-pinned-check.mjs` also holds declared regions of
`LeafNeeds.ts` and `ScopedLeaf.ts`. So every code fix below that touches those three files fails the phase close, even a
fix that only changes types (WR-03, IN-03, IN-05's LeafNeeds part). A change to the hot path (WR-01 option B) also needs a
new bench gate of record: a new patch, a new `ab.sh` run and a new analysis. A type-only edit leaves the emitted JS
unchanged, so it needs no re-bench in substance, but the gate still needs its expected text refreshed.

## Warnings

### WR-01: The `Always` arm of `needsResourceId` is unreachable, and the spec says every scoped read reads the row

**File:** `packages/core/src/PortAccess.ts:299-307, 347`; `packages/core/src/LeafNeeds.ts:44-50`; `spec/behaviors/30-port-calls.md` (BEH-QD-789 REQUIREMENT 1); `spec/invariants.md` (INV-QD-426 Source); `spec/decisions/203-…md:98-112`
**Issue:** `if (bare !== undefined && !needsResourceId(LEAF_NEEDS[leaf._tag].resourceId)(leaf))` checks `bare` first. The
one `"Always"` leaf is `HasRelationship`, and it reads the one port whose `bare` is `undefined`. So for a relationship read
the row is never read and `needsResourceId("Always")` is never called. The `Match.when("Always", () => () => true)` arm (line
301) runs for no input. This contradicts three statements:
- BEH-QD-789: "Every read of a scoped port MUST go through `readScoped`, which MUST read the leaf's `LEAF_NEEDS` row".
- The `resourceId` doc in `LeafNeeds.ts:47`: "`readScoped` reads this column to decide whether a read needs an id".
- INV-QD-426: "reads `LEAF_NEEDS[leaf._tag].resourceId` through one hoisted `Match`".

The fact "Always means no id-free call" is stated twice, once by `BareOf` (types) and once by the matcher arm (runtime), and
only the first one decides. The `ByScope` arm also allocates a fresh closure on every read (`() => (leaf) => …`). It needs
`"scope" in leaf` only because `leaf` is typed over all four scoped tags. The Any-scoped bench workload moved +2.4% against
a base spread of 1.4% (`bench/analysis.txt`), so this is a measured cost, not noise.

**Fix:** Two options.

(A) Minimal, with no change to the design: swap the operands to
`!needsResourceId(LEAF_NEEDS[leaf._tag].resourceId)(leaf) && bare !== undefined`, so the row really is read on every route.
This kills the arm's `() => undefined` and `"Always"→""` mutants. Two equivalent mutants remain: the arm's `true→false`, and
`bare !== undefined`→`true`. The relationship read then pays a `Match` dispatch it did not pay before, so this needs a
re-bench.

(B) Cleanest, with no unreachable code and a stronger compile-time guarantee: make a mixed port impossible and move the id
test into the per-port row, then delete the matcher.
```ts
type ScopedLeafOf<K extends ScopedPort> = LeafOf[keyof PortTypes[K]["asks"] & ScopedLeafTag];
type BareOf<K extends ScopedPort> = [PortNeed<K>] extends ["Always"]
  ? undefined
  : [PortNeed<K>] extends ["ByScope"]
    ? {
        readonly call: (request: AskedOf<PortTypes[K]>) => ArgsOf<PortTypes[K]>;
        readonly needsId: (leaf: ScopedLeafOf<K>) => boolean;
      }
    : never; // a port mixing Always and ByScope leaves has no writable row: decide it here
// rows: DecisionHistory/SignatureHistory: bare: { call: (r) => r, needsId: isResourceScoped }; RelationshipResolver: bare: undefined
// readScoped(d, interpreter, leaf: ScopedLeafOf<K>, …):
//   if (bare !== undefined && !bare.needsId(leaf)) return readPort(d, interpreter, bare.call(request));
```
Every reclassification is then a compile error at `scopedCall`. Today, by contrast, a `ByScope→Always` change on one
history leaf compiles silently. Every mutant of the guard is killable, and there is no `in`, no `Match` and no per-read
closure. This sketch has not been compiled. It reverses D-15/D-16 and ADR-QD-203 decision 7 (the row is then read by the
type, not at runtime). It also changes `judgeScopedRoute`/`judgeScopedDerived`, `LEAF_NEEDS`'s value import and the hot
path, so it needs an ADR amendment and a new bench gate of record before `routing-landed` can pass.

Whichever option is taken, correct the three sentences above to say what the code does.

### WR-02: The mutation record understates the dead arm: five undetected mutants, not "three equivalent"

**File:** `spec/decisions/203-…md:267-271`; `90-mutation.mjs:77-90, 113-118`
**Issue:** ADR-QD-203 says `PortAccess.ts` is "54 of 57 detected, whose three open mutants are equivalent and not killable".
Two of the three are `NoCoverage`: no test runs the code at all. That makes them unreachable, not equivalent. Two more
mutants of the same arm are kept out of the score by `ignoreStatic`. They are the `"Always"` StringLiteral and the outer
`ArrowFunction`, and `STATIC_PROVEN` records that both Survive when run by hand. Their "proof" is the row "HasRelationship,
absent resource, under evaluate". That row passes with the whole arm deleted, so it proves nothing about the arm. In total
the arm and its guard leave five mutants undetected. "Not killable" holds only for the current shape (see WR-01).
**Fix:** Restate the consequence as "five undetected mutants on unreachable code (two NoCoverage, two static survivors, one
equivalent guard)". Better, remove the arm (WR-01), so that the `EQUIVALENT` and `STATIC_PROVEN` entries become stale and the
script's own staleness check forces their removal.

### WR-03: A reclassified leaf makes its port "scoped" but its read never routes through `readScoped`. Verified to compile

**File:** `packages/core/src/PortAccess.ts:199` (`readPort` generic over every `PortName`), `:399`, `:529`; `spec/invariants.md` (INV-QD-426 Implication); BEH-QD-790 REQUIREMENT 2; ADR-QD-203 decision 6
**Issue:** INV-QD-426 says "the route is the row's value, so a leaf reclassified in `LeafNeeds.ts` changes the route". I ran
this in a scratch clone (the phase's `scratch` mode, cleaned afterwards):
1. Moved `HasAttribute` to `AsksAlways` and set its row to `"Always"`.
2. Added the row the compiler asked for, `AttributeResolver: { withId: (request) => request, bare: undefined }`.
3. Ran `tsc -p packages/core/tsconfig.src.json --noEmit`: exit 0, no diagnostics. A planted error in the same run was
   reported, so the check was real.

`readAttribute` still calls `readPort` directly, so the row says "needs an id" and the read never checks one. A future
reclassification would therefore ask a resource question subject-wide. That fails open, while the spec says the compiler
prevents it.
**Fix:** Give the direct reads a type that refuses scoped ports, and keep the unconstrained body for `readScoped` and
`servePortRead`:
```ts
const readUnscoped = <K extends Exclude<PortName, ScopedPort>>(
  d: DescriptionOf<K>, interpreter: Interpreter, args: ArgsOf<PortTypes[K]>,
) => readPort(d, interpreter, args);
// readAttribute / resolveAttribute (:399) and askCustom (:529) call readUnscoped
```
This is a type-only change with no new JS, so it needs no re-bench in substance. It does touch `PortAccess.ts`, so
`routing-landed` needs its expected text refreshed. If you do not take the fix, weaken INV-QD-426 and BEH-QD-790 to what the
compiler actually checks.

### WR-04: `DistinctSpanNames` accepts union spans, including two ports that share a literal

**File:** `packages/core/src/PortDerivation.ts:124-151`; `spec/behaviors/30-port-calls.md` (BEH-QD-787); `packages/core/test/PortFacts.tst.ts:108` (title "each names one literal")
**Issue:** `SpanOffenders` flags an entry only when the whole span type is contained in the union of the others, or when
`IsPattern` holds. I checked with `tsc --strict` on a self-contained copy of the three types. Each of these registries is
`unknown`, meaning accepted:
- `{ A: "qadi.a" | "qadi.x"; B: "qadi.b" }`: a span that is not one literal.
- `{ A: "qadi.a" | \`qadi.${string}x\`; B: "qadi.b" }`: a union that contains a pattern.
- `{ A: "qadi.a" | "qadi.shared"; B: "qadi.b" | "qadi.shared" }`: two ports share `"qadi.shared"`.

`SpanName` is bounded only by `` `qadi.${string}` ``, so a description can pass a union. Both properties the doc and
BEH-QD-787 state, "names one literal" and "no two share it", are unsound.
**Fix:**
```ts
type IsUnion<S, U = S> = S extends unknown ? ([U] extends [S] ? false : true) : never;
type SpanOffenders<R …> = {
  readonly [K in keyof R]: IsPattern<R[K]["span"]> extends true ? K
    : true extends IsUnion<R[K]["span"]> ? K
    : [Extract<R[K]["span"], R[Exclude<keyof R, K>]["span"]>] extends [never] ? never : K;
}[keyof R];
```
Then add the three registries above as `never` rows in `PortFacts.tst.ts`.

### WR-05: The overview and traceability say a description cannot name another port's span. Since this change it can

**File:** `spec/overview.md:329`; `spec/traceability.md` (row for `PortName.tst.ts`); `packages/core/src/PortDescription.ts:191, 202-207`
**Issue:** The overview says `PortSpanOf<N>` "is what `PortDescription.span` is, so a description cannot name another
port's". At HEAD `span` is `SpanName`, which defaults to `` `qadi.${string}` ``. Before this change it was `PortSpanOf<N>`.
Any hand-built description can now claim any port's span. The probe in `PortDescription.test.ts:83-121` borrows `span:
"qadi.attribute"` with no `SpanName` argument, and `"qadi.acted"` would compile there just as well. Only the five registry
entries are checked, by `DistinctSpanNames` at `PORTS`. The direction is also reversed: `PortSpanOf` reads `span`, not the
other way round. The traceability row for `PortName.tst.ts` repeats the claim, but that test only pins
`typeof attributeResolverPort`.
**Fix:** Reword both rows: "`PortSpanOf<N>` reads the registry entry's own span literal; two registry entries cannot share
one (`DistinctSpanNames`); a description outside the registry is not checked."

### WR-06: The upgrade guide's migration example cannot compile, and the changeset over-asks

**File:** `apps/website/src/content/docs/docs/reference/upgrading.md:1437-1480`; `.changeset/core-port-facts-on-the-description.md:13`
**Issue:**
- Both the "before" and "after" examples build `PortDescription<"NoticeBoard", …>`. `N extends PortName` and `PortName` is
  closed, so neither compiled at any point. The example teaches a migration for a port users cannot define. The fence is
  ```` ```ts ````, so `check-doc-examples` never noticed.
- The guide and the changeset both say a hand-built description "passes its span literal as the new type argument". That is
  not required. `PortDescription.test.ts:83-91` passes eight type arguments and compiles. The only edit a real hand-built
  description (one of the five names) needs is `fixture`.
- `const noticeSpanName = "qadi.notices" as const;` adds an `as const` that a `const` string does not need, and the port
  modules do not write it.

**Fix:** Rewrite the example around a description of one of the five names, the realistic case and the only one that
exists, and make it a compiled ```` ```typescript ```` fence. State that the minimal migration is adding `fixture`, and that
`SpanName` matters only for code that reads `span` as a literal.

### WR-07: `PORT_FIXTURES` is documented as the place fixtures are read from, but no source reads it

**File:** `packages/core/src/Ports.ts:286-294`; `spec/decisions/203-…md:185`; `spec/decisions/094-a-port-is-described-once.md:419`; `packages/testing/src/QadiReviewLayer.ts:146-147`
**Issue:**
- The doc at `Ports.ts:288` says "This is the one place the data-to-layer mapping is read from". Yet this change made
  `fixturePortsLayer` read `d.fixture` (`Ports.ts:336`), and nothing in `packages/*/src` reads `PORT_FIXTURES`.
- ADR-QD-203 and the ADR-QD-094 amendment justify reversing CCR-QD-270 by saying devtools' Fixtures simulation "already
  reads `PORT_FIXTURES`". It does not: `SimulationSource.ts:27,123` calls `fixturePortsLayer`.
- `QadiReviewLayer.ts:147` says a new port's fixture "is one row in core's `PORT_FIXTURES`", which went stale in this
  change.

**Fix:** Say that the description's `fixture` is the one statement, that `fixturePortsLayer` reads it, and that
`PORT_FIXTURES` is a convenience projection. Fix the two ADR sentences to name `fixturePortsLayer` (history stays in the
changelog line), and update `QadiReviewLayer.ts:147`.

## Info

### IN-01: `@qadi/http` keeps a file-local `PORT_NAMES` beside core's new public one

**File:** `packages/http/src/PortRoutes.ts:104`
**Issue:** `const PORT_NAMES: ReadonlyArray<PortName> = forEveryPort((d): PortName => d.port);` has the same name and the
same value as the export this change added (`packages/core/src/PortName.ts:26`). It is a second derivation, and a grep for
the name finds two concepts.
**Fix:** `import { PORT_NAMES } from "@qadi/core"` and delete the local constant.

### IN-02: Generality without instantiation: the third `tabulatePorts` overload exists for one constant that no source reads

**File:** `packages/core/src/Ports.ts:209, 272-294`
**Category:** necessity
**Issue:** `FixtureVisitor`, `FixtureBuilders` and the `tabulatePorts(f: FixtureVisitor)` overload have exactly one caller,
`PORT_FIXTURES`. Only tests and docs consume that constant (see WR-07). The overload, which widens the API, exists to keep
an export's name and shape. The owner's stated preference is that compatibility is never the tiebreaker. This is judgment,
not proof: `PORT_FIXTURES` is public.
**Fix:** Either drop `PORT_FIXTURES` with the overload and its two helper types, and let tests read `PORTS.X.fixture`, or
keep them and record why they stay.

### IN-03: `readScoped`'s `leaf` is not tied to its port

**File:** `packages/core/src/PortAccess.ts:337`
**Issue:** `leaf: LeafOf[ScopedLeafTag]` accepts any of the four scoped leaves for any `K`. For example,
`readScoped(decisionHistoryPort, …, relationshipLeaf, …)` compiles and routes on the wrong row. The three call sites are
correct today.
**Fix:** Type it `LeafOf[keyof PortTypes[K]["asks"] & ScopedLeafTag]`. This is type-only, but `routing-landed` holds the
file.

### IN-04: `Record<string, unknown>` was re-spelt, not redesigned, and the same type now has two spellings

**File:** `packages/core/src/AttributeResolver.ts:163,192`; `packages/core/src/CustomPredicate.ts:18,219`; `packages/core/test/PortFacts.tst.ts:34-38,161-168`
**Issue:** The moved builder's parameter changed from `Readonly<Record<string, unknown>>` to
`{ readonly [key: string]: unknown }`. That is the identical type, re-spelt so the phase's `scan-forbidden` pattern passes.
Meanwhile `CustomPredicate` keeps `Readonly<Record<string, boolean>>`, and `PortFacts.tst.ts` pins one type under both
spellings. `CustomPredicate.ts` now also has `import * as Record from "effect/Record"` beside the global `Record<…>` type,
which compiles only because a namespace has no type meaning.
**Fix:** Use one spelling for both ports' open tables. If the owner's rule targets this shape, give the attribute table a
named type (for example `AttributeTable`) rather than a spelling the grep misses.

### IN-05: The three base survivors: two can be killed, one is equivalent

**File:** `packages/core/src/PortDerivation.ts:202`; `packages/core/src/LeafNeeds.ts:204,224-226`; `packages/core/src/SignatureHistory.ts:423`
**Issue and fix:**
- `PortDerivation.ts:202` (`new InvalidBoundedPermits({ permits })` → `{}` survives). Killable: no test reads `permits`.
  Add `assert.strictEqual(result.failure.permits, <bad count>)` to `PortDescription.test.ts:259` and
  `PortConformance.test.ts:330`.
- `LeafNeeds.ts:204` (`isActionLeaf` → `true` survives). Killable by removing a redundancy. `isActionLeaf` is the same test
  as `need.own === "Action"` (line 224), so the `MISSING_ACTION` else-arm on line 225 is unreachable. Write
  `if (isActionLeaf(leaf) && !supplied.action) return { _tag: "Action", expected: leaf.action };`. The mutant then refuses
  every action-less non-action leaf and is killed. `LeafNeeds.ts` is held by `routing-landed` and `90-pinned-check`.
- `SignatureHistory.ts:423` (`row.resourceId === undefined ? undefined : makeResourceId(…)` → `false` survives).
  Equivalent: `makeResourceId` is `Brand.nominal`, the identity at runtime, so `makeResourceId(undefined)` is `undefined`.
  Record it as equivalent, or restructure so that no branch exists, for example `pairKey` taking `string | undefined` and
  branding inside.

### IN-06: Phase scripts: the shape judges can pass a hand list, and the routing gate locks whole files

**File:** `90-check.mjs:930-940` (`judgeScopedDerived`), `:1215-1232` (`judgeRouting`); `90-pinned-check.mjs` (declared regions of `LeafNeeds.ts`/`ScopedLeaf.ts`)
**Issue:** `judgeScopedDerived` rejects only a literal-union spelling of `ScopedPort`.
`type ScopedPort = Extract<PortName, "DecisionHistory" | "RelationshipResolver" | "SignatureHistory">` passes, so the judge
cannot fail on "derived". The ADR concedes that it judges shape, but `close` reports it as a passing check of the
property. `judgeRouting` compares three whole files, so any later fix in them fails `close`, including fixes unrelated to
routing.
**Fix:** Have `judgeScopedDerived` require that the `ScopedPort` body contains no string literal at all. Scope
`judgeRouting` to the `readScoped`/`needsResourceId`/`scopedCall` statements, or document that a fix round re-fixes the
patch of record.

### IN-07: Doc-comment shape and claims the types do not enforce

**File:** `packages/core/src/PortAccess.ts:272`; `packages/core/src/PortDerivation.ts:145-146`; `packages/core/src/PortDescription.ts:176-179, 333-340`
**Issue:**
- `ScopedCall.withId`'s doc is one ~200-column line that mixes what with why. That breaks the one-line-summary-first rule
  and the hand-wrapping at about 90 columns.
- `DistinctSpanNames`'s rationale explains why the type is not in `PortDescription.ts` by naming `Ports.ts`, and never says
  why it is in `PortDerivation.ts`.
- `FixtureData` / `fixture` are documented as "serializable" and "data only, never a layer", but `FixtureData` is
  unconstrained, so a function or a `Layer` type compiles.

**Fix:** Wrap `withId`'s doc as a summary line followed by the why. State the real reason for the type's location (or move
it to `Ports.ts`). Either bound `FixtureData`, or reword "serializable" as a convention that review checks.

---

_Reviewed: 2026-11-26T10:23:47Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: deep_
