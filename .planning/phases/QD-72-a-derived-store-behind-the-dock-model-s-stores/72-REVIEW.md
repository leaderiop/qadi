---
phase: QD-72-a-derived-store-behind-the-dock-model-s-stores
reviewed: 2026-11-22T22:30:00Z
depth: standard
files_reviewed: 22
files_reviewed_list:
  - packages/devtools/src/model/ExternalStore.ts
  - packages/devtools/src/model/DockModel.ts
  - packages/devtools/src/react/QuestionsPanel.tsx
  - packages/devtools/src/react/ServicesPanel.tsx
  - packages/devtools/src/react/useStoreSnapshot.ts
  - packages/devtools/test/dockModelFixtures.ts
  - packages/devtools/test/model/DockModel.characterisation.test.ts
  - packages/devtools/test/model/DockModel.test.ts
  - packages/devtools/test/model/ExternalStore.test.ts
  - packages/devtools/test/model/ExternalStore.tst.ts
  - spec/decisions/185-the-dock-models-computed-stores-are-derived-stores.md
  - spec/decisions/047-a-headless-devtools-model.md
  - spec/decisions/162-gates-are-the-dock-models-eighth-store-and-their-states-are-stated-once.md
  - spec/decisions/168-a-port-card-is-a-model-row.md
  - spec/decisions/169-the-questions-panels-two-host-inputs-are-one-feed.md
  - spec/decisions/index.yaml
  - spec/behaviors/28-devtools-screens.md
  - spec/invariants.md
  - spec/traceability.md
  - spec/README.md
  - AGENTS.md
  - .planning/phases/QD-72-a-derived-store-behind-the-dock-model-s-stores/72-CONTEXT.md
findings:
  critical: 0
  warning: 5
  info: 7
  total: 12
status: issues_found
---

# Phase QD-72: Code Review Report

**Reviewed:** 2026-11-22
**Depth:** standard
**Files Reviewed:** 22
**Status:** issues_found

## Summary

`makeDerivedStore` is correct on every path the brief asked about, and `DockModel.ts` restates
none of its logic. I verified:

- Compute, then commit the key, then `set`: a throwing compute leaves `held` and the store
  untouched. A re-entrant `refresh` from a listener sees the committed key, so it does nothing.
  A throwing key thunk throws before anything is read or written.
- No parent notification can arrive during construction, because the parents are subscribed
  after the first compute and nothing runs between the subscription and the return.
- `stopped` and the parent release are both needed. The release stops parent-driven triggers.
  `stopped` stops the public `refresh`, which a parent release cannot reach. Nothing stays
  subscribed after close.
- ADR-QD-177's contract holds. The refresh is one listener in the parent's set, so a throw
  from the store's listeners enters the parent's loop as one value.
- The three derived stores are built in the order the spec states, and `configure` refreshes
  the shown reading after both feeds. The characterisation file passes against the new code
  (107 tests across the three DockModel and ExternalStore files). `oxlint` and
  `scripts/check-house-style.mjs` are clean. No added line in the seven code files passes 90
  characters. Every test title quoted in BEH-QD-696 to BEH-QD-699 exists verbatim in the files
  it names, and every Source line names code that exists.

The real defects are one behavioural gap in `sameFields` (its own-fields claim is repeated in
four documents), two false or overstated statements in the spec, one test whose title claims
more than it can fail on, and history written as current-tense normative text in BEH-QD-700.
The rest is duplication and small cleanliness items.

I did not load `necessity-review.md`, so the necessity category was not assessed and no
`necessity:` count is emitted.

## Warnings

### WR-01: `sameFields` walks inherited keys, so a key with an inherited enumerable field is never equal, even to itself

**File:** `packages/devtools/src/model/ExternalStore.ts:115-122`
(documented at `:111-114`, ADR-QD-185 decision 2, BEH-QD-696, INV-QD-389 and its traceability
row, all of which say "own fields")
**Issue:** `for (const field in a)` enumerates inherited enumerable keys as well as own ones,
and the guard is `Object.hasOwn(b, field)`. For a key whose enumerable field lives on its
prototype, `hasOwn` is false on both sides. I ran it: `sameFields(a, a)` returns `false` for
`a = Object.create({ x: 1 })`. The store then recomputes and notifies on every trigger.
`makeDerivedStore` exists to prevent exactly that, and nothing pins or forbids the shape.

The mirror case is a non-enumerable own field, which `for…in` never visits. Two such keys
with different values compare equal, so a stale store is possible. A symbol-keyed own field is
skipped the same way. The dock's three keys are plain literals, so nothing breaks today. The
documents claim "own fields" and "own enumerable fields" for a function that does not
implement that. The ADR says "own enumerable"; the code walks more than that on one side and
does not check enumerability on the other.

**Fix:** Compare own enumerable string keys explicitly, with no cast:
```ts
function sameFields<K extends object>(a: K, b: K): boolean {
  const fromB = new Map(Object.entries(b));
  const fromA = Object.entries(a);
  return (
    fromA.length === fromB.size &&
    fromA.every(([field, value]) => fromB.has(field) && fromB.get(field) === value)
  );
}
```
Add a row to the `makeDerivedStore` tests for a key whose field is inherited, which must
compare equal to itself and recompute nothing. Alternatively, keep the loop and weaken every
"own fields" sentence to say what it does. The first option is shorter than the second.

### WR-02: BEH-QD-700 says "the last three" stores are derived; they are `timelineStatus`, `questions` and `services`

**File:** `spec/behaviors/28-devtools-screens.md:1088` (the BEH-QD-700 body, "The last three are derived stores")
**Issue:** The section lists the stores "in the order `DockModel` lists them": timeline, dock,
explorer, roles, simulation, diagnostics, timelineStatus, questions, services. The derived
stores are the shown reading (`diagnostics`), `questions` and `services` (BEH-QD-699).
`timelineStatus` is passed through from the timeline feed and is not derived. The sentence
names the wrong set. The section exists to be the one place that states the stores
correctly.
**Fix:** Name them: "`diagnostics`, `questions` and `services` are derived stores
([BEH-QD-699](#...))". Do not describe them by position.

### WR-03: "each parent is released" is pinned for one parent only

**File:** `packages/devtools/test/model/ExternalStore.test.ts:698-740`
(title at `:699`; BEH-QD-698 quotes it; INV-QD-389 and traceability repeat the claim)
**Issue:** The test has two parents. The hand-written one exposes a `held` set, so its release
is observed (`before === 1`, `held.size === 0`). The second parent is a `makeExternalStore`,
and its listener count is unobservable. `other.set(1)` after close cannot discriminate
anything, because `refresh` returns at `stopped` whether or not the second subscription was
released. A mutation that releases only `releases[0]` passes this test. Neither the title nor
BEH-QD-698's "release every parent" is pinned for every parent.
**Fix:** Make both parents hand-written (`held` sets, one per parent), and assert both sizes
before (1 each) and after (0 each). Or build one `handWritten` helper and use it twice.

### WR-04: BEH-QD-700 carries ordinal history in current-tense normative text

**File:** `spec/behaviors/28-devtools-screens.md:1092-1094`
("Earlier records counted the policy rail among the stores. They call the diagnostics the
seventh store, the timeline status the eighth readout, `questions` the eighth store and
`services` the ninth; those ordinals stay as written where they appear, and none of them is
this list.")
**Issue:** Item 3(c) of the brief is confirmed. This is a plain paragraph in the body of the
current requirement, not a dated amendment or blockquote. AGENTS.md §15 and the owner's bar
put history in dated amendments and notes. The sentence also says the opposite of what the
phase set out to do, which was to keep ordinals out of current text. A section that is
supposed to be the one statement of the store list should not itself recount the old counts.
**Fix:** Move the paragraph into a dated blockquote under the section ("**Noted 2026-11-22
(CCR-QD-464).**"), as the BEH-QD-583, BEH-QD-615 and BEH-QD-616 amendments in the same file do.
Or delete it. The ADR-QD-047 note already says the same thing.

### WR-05: the store-list test is described as checking BEH-QD-700, and INV-QD-390 claims a prevention nothing enforces

**File:** `packages/devtools/test/model/DockModel.test.ts:1760-1782` (title "…are the stores BEH-QD-700 names"),
`spec/behaviors/28-devtools-screens.md` BEH-QD-700 ("a test of a built model fails on any store added without it"),
`spec/invariants.md` INV-QD-390 Implication, `spec/decisions/185-…md` decision 10 and Consequences
**Issue:** Three overclaims, all in the territory the owner asked me to check:
1. The test hard-codes its own array. It does not read BEH-QD-700, and nothing, whether the
   `check-*` gates or a test, ties the spec's list to the test's. The title and BEH-QD-700
   say the test checks "that exact list". It checks the test's own copy of it. The two can
   drift without anything failing, which is the defect class the phase set out to remove.
2. INV-QD-390 Implication says "a computed store cannot keep a compare or a closed flag of its
   own, because the constructor holds both". Nothing prevents a new hand-written computed
   store built on `makeExternalStore`. The same invariant's Enforcement paragraph admits this
   ("checked by no test or gate"), which contradicts the Implication two paragraphs above it.
3. The test discriminates by the two property names only. A store-shaped member under another
   shape (a getter, a function pair) is invisible to it. That is acceptable, but "fails on
   any store added" is wider than that.
**Fix:** Soften BEH-QD-700 and INV-QD-390 to "a test of a built model lists the members that
have `subscribe` and `getSnapshot`, and fails when one is added; the list here and the list
there are kept equal by review". Retitle the test to describe its input, for example "a
built model's members with subscribe and getSnapshot are the nine stores named below". Rewrite
the Implication to match the Enforcement paragraph.

## Info

### IN-01: negative type pins do not differ from their twin in the argument under test alone

**File:** `packages/devtools/test/model/ExternalStore.tst.ts:42-61`
**Issue:** Item 3(b) is confirmed in part. The positive twin uses `key: (): Three`, a
key-reading `compute: (key) => key.a.length`. The empty-parent-list pin changes `parents` and
also `compute: () => 0`, so two arguments differ. The optional-field pin changes the key type,
which is the argument under test, and also `compute`. AGENTS.md §6 says a twin "varies only
the argument under test", reviewed by hand. Today each refusal is traceable to the
`@ts-expect-error` text fragment, which names the actual diagnostic, so the pins do fail for
the stated reason. They still do not meet the written bar. The compute reading the key is
irrelevant to those two pins.
**Fix:** Keep the twin's `compute: (key) => key.a.length` in the empty-parents pin. For the
optional-field pin, use a twin with `WithOptional`-shaped key that reads nothing, or state in
the header that the key type is the argument under test and `compute` is free.

### IN-02: ADR-QD-047's Status row omits its 2026-11-19 amendment (pre-existing, now extended past it)

**File:** `spec/decisions/047-a-headless-devtools-model.md:8` (Status), against `:9` (Change History) and the 2026-11-19 note at the end of the file
**Issue:** Item 3(d) is confirmed. The Status row lists amendments through 2026-11-18 and now
appends 2026-11-22. Change History has `1.19 (2026-11-19)`, the file has the dated note, and
`spec/decisions/index.yaml` lists "amended 2026-11-19 (ADR-QD-173…)". Only the file's own
Status row misses it. This phase edited that cell, so it was the moment to fix it, and the
`index.yaml` row (which has it) and the file now disagree.
**Fix:** Insert `2026-11-19 (the headless interface is the feeds, ADR-QD-173)` between the
2026-11-18 and 2026-11-22 entries.

### IN-03: duplicated test helpers, in the files this phase created to remove duplication

**File:** `packages/devtools/test/model/DockModel.test.ts:104-111` and
`packages/devtools/test/model/DockModel.characterisation.test.ts:56-62` (`heardOn`, identical);
`DockModel.test.ts:814-816` and `DockModel.characterisation.test.ts:43-45` (`suppliedActivity`,
identical); `packages/devtools/test/model/ExternalStore.test.ts:273-280` (a third `heardOn`,
returning `{ n }` instead of `{ calls }`); `packages/devtools/test/dockModelFixtures.ts:97-103`
(`heardOf` is `heardOn(model.services)`); `packages/devtools/test/model/GatesFeed.test.ts:36-40`
(`tick`, identical to the fixture's)
**Issue:** `dockModelFixtures.ts` was created so that "a fixture fixed in one file is fixed in
every file". It moved `tick`, `guard`, `wiringNamed` and the others, and left a two-file copy
of `heardOn` and `suppliedActivity` beside it. `heardOf` is a special case of `heardOn`. The
characterisation file may not change its expected values, but its imports and local helpers
can. The `GatesFeed.test.ts` `tick` predates the phase but is now a third copy of a fixture
with a shared home.
**Fix:** Export `heardOn` and `suppliedActivity` from `dockModelFixtures.ts`, define `heardOf`
as `(model) => heardOn(model.services)` or inline it, and import them. Move `tick` out of
`GatesFeed.test.ts` too.

### IN-04: `ExternalStore.ts` header is now stale for the derived store; the brief's placement suspicion is refuted

**File:** `packages/devtools/src/model/ExternalStore.ts:1-26`, `:31-52`
**Issue:** Item 3(a): the header sitting above the imports is the codebase's convention
(`DiagnosticsFeed.ts`, `TimelineStore.ts` and `HeldChoice.ts` all open with a file header, then
their imports), and the one-line comment on `ExternalStore` follows the AGENTS.md doc shape.
Placement is not a defect. The content is stale: the header describes only "the mechanics every
store shares: a current value, a listener set, and the subscribe / getSnapshot pair" and says
"This file owns only the mechanics", then the file gains `ReadableStore`, `sameElements`,
`DerivedStore`, `sameFields` and `makeDerivedStore`. A reader skimming the header will not
learn that a derived store lives here, or where its contract is. The header's `notify` and
"listener contract above" references also now point at a header, not at `ExternalStore`'s own
doc.
**Fix:** Add one paragraph to the header: the derived store is built on `makeExternalStore`
and its rules are in `makeDerivedStore`'s doc and BEH-QD-696 to BEH-QD-698. Change "owns only
the mechanics" to say it owns the mechanics and the derived store.

### IN-05: `makeDerivedStore` subscribes to the parents before the finalizer exists

**File:** `packages/devtools/src/model/ExternalStore.ts:163-170`
**Issue:** `options.parents.map((parent) => parent.subscribe(refresh))` runs before
`Effect.addFinalizer`. If the second parent's `subscribe` throws, the first subscription stays
in the first parent's listener set with no finalizer to release it and `stopped` still false,
so a half-built store keeps recomputing. The finalizer's `for (const release of releases)` also
stops at the first release that throws, leaving the rest subscribed. Every parent today is an
in-package store whose `subscribe` is a `Set.add`, so neither can happen. `Parent` is an
exported type that any `{ subscribe }` satisfies, so the constructor takes more than it
defends. Info, not a bug.
**Fix:** Register the finalizer first over a `const releases: Array<() => void> = []` that
the subscribe loop fills as it goes, and run each release inside its own `try`, rethrowing after
the loop as `notify` does. Or leave it and state in the doc that `Parent.subscribe` must not
throw.

### IN-06: small cleanliness items in the new tests and `DockModel.ts`

**File:** `packages/devtools/test/model/ExternalStore.test.ts:365-373` (the five-field key's
object literal sits one level left of its `key:` line, which hand-wrapping would indent),
`packages/devtools/test/model/DockModel.test.ts:113-118` (the `KeyRow` doc comment, "One input of
a computed store, moved or left alone in a fresh model: its count", does not say what `field`
and `heard` are), `packages/devtools/src/model/DockModel.ts:171` (`function mergedOf`, where
the sibling helpers `registryInput`, `askedInput` and `joinInputOf` are arrow consts; in
`ExternalStore.ts` `sameFields` is a `function` beside arrow exports),
`packages/devtools/test/model/DockModel.test.ts:1776-1779` (three or four string literals per
line in the expected store list, against the file's one-element-per-line arrays)
**Issue:** Four layout and naming nits, none a behaviour defect.
**Fix:** Indent the literal; reword `KeyRow` as "A key field and the number of notifications a
fresh model's store heard when the field moved or was left alone"; use `const mergedOf =
(key: MergeKey): DiagnosticsSnapshot =>` or note why the declaration form is chosen; put one
store name per line.

### IN-07: a characterisation title does not say its fourth step is a repeat

**File:** `packages/devtools/test/model/DockModel.characterisation.test.ts:346-375`
(title "a guard and three reading configures notify the stores in one fixed order")
**Issue:** I do not propose any change to the expected values. The title says three reading
configures, but the third and the fourth step pass the same `third` reading object, so the
fourth is an identical repeat that notifies nothing, and only two configures move anything.
The title also does not say that the recorded order includes a deliberate absence. A reader
sizing the five-entry array against "three configures" will count wrong. The file is frozen
at the phase base, so a rename is the only change available, and it is optional.
**Fix:** If a rename is allowed: "a guard, two moving configures and one repeated configure
notify the stores in one fixed order".

---

_Reviewed: 2026-11-22_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
