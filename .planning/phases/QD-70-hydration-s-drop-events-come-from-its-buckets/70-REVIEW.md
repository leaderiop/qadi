---
phase: QD-70-hydration-s-drop-events-come-from-its-buckets
reviewed: 2026-11-22T00:00:00Z
depth: standard
files_reviewed: 7
files_reviewed_list:
  - packages/react/src/HydrationBuckets.ts
  - packages/react/src/HydrationEngine.ts
  - packages/react/src/HydrationEvent.ts
  - packages/react/test/HydrationBuckets.tst.ts
  - packages/react/test/HydrationDropEvents.test.ts
  - packages/react/test/HydrationPayload.test.ts
  - .changeset/react-hydration-drop-buckets.md
findings:
  critical: 0
  warning: 3
  info: 4
  total: 7
  necessity: 1
status: issues_found
---

# Phase QD-70: Code Review Report

**Reviewed:** 2026-11-22
**Depth:** standard
**Files Reviewed:** 7 (plus ADR-QD-183, BEH-QD-686..690, INV-QD-385/386/045/323 and the ADR-QD-152 amendment, read against the code)
**Status:** issues_found

## Summary

No behavioural defect found. The refactor is behaviour-preserving: the dehydrate loop is the old `own` filter plus an inline foreign check, the hydrate side's
`MalformedEntry` push for a disagreeing entry is unchanged, and the old and new event order agree. The characterisation file has exactly one commit
(`b6434572`), so "never edited" is true. No `as`, `!`, `any`, `switch`, bare `effect` imports or `.js` relative imports were added.

The type-level machinery does what its comments claim, checked on a scratch copy with the repo's `tsc` (7.0.2): `satisfies` rejects a missing row (TS2741) and an
unknown row (TS2353); `OnlyMember` makes a producer named by two rows, or by none, type its slot `never`; a producer added to `PayloadProducer` without a slot is
TS2741; a missing key in a bucket constructor is TS2741 and a repeated one TS1117. `dropEvents`'s order guarantee is sound for both instantiations: reasons are
non-integer string keys of a fresh literal, so `Object.keys` gives insertion order (ES2015 OrdinaryOwnPropertyKeys), and "in the record's key order" is stated
accurately. The only caveat is that `R extends string` would admit integer-like reasons, which JS orders first; nothing instantiates it that way.

What is left is test coverage of the claimed guarantee, one overclaim in spec text, shadowing, and cleanliness.

## Warnings

### WR-01: The "named by two rows or by none does not compile" direction has no standing pin

**File:** `packages/react/src/HydrationEngine.ts:224-249` (claims at `spec/invariants.md` INV-QD-385, `spec/behaviors/19-hydration.md` BEH-QD-688, ADR-QD-183 decision 4)
**Issue:** The spec states, as an enforced invariant, that a producer named by two rows or by none does not compile. That is carried entirely by `OnlyMember`,
`ReasonRaisedBy` and the `PAYLOAD_REASONS` annotation, all module-private. `HydrationBuckets.tst.ts` pins only the forward direction (`keyof PAYLOAD_PRODUCERS`
equals `PayloadRefusalReason`, which `satisfies` already enforces) and `HydrationPayload.test.ts` is runtime. Nothing fails if `OnlyMember` is gutted to
`U`: with two rows naming one producer, the slot becomes a two-member union and both literals still type-check, so the uniqueness guarantee silently disappears.
It rests on the one-off RED experiment, not on a test, and INV-QD-385's Enforcement list names no pin for it.
**Fix:** Make the two types testable and pin them. Export `OnlyMember` and a `ReasonRaisedBy` parameterised on the producer record (or move both beside `DropBuckets`), then in
`HydrationBuckets.tst.ts` add `expect<OnlyMember<"A" | "B">>().type.toBe<never>()`, `expect<OnlyMember<never>>().type.toBe<never>()` and
`expect<OnlyMember<"A">>().type.toBe<"A">()`. Those are plain-type pins with the positive twin beside them, so `NOT_CALLABLE_PIN_BUDGET` is not touched. Alternatively
add the two-row and no-row cases as `@ts-expect-error` lines over a local copy of the record. Then add the pin to INV-QD-385's Enforcement.

### WR-02: `entries` is shadowed in both planners' event callbacks

**File:** `packages/react/src/HydrationEngine.ts:427` and `packages/react/src/HydrationEngine.ts:587`
**Issue:** `dropEvents(drops, (reason, entries) => ...)` rebinds `entries` inside `planDehydration` (whose parameter is every input entry) and inside `planHydration`
(where `entries` is destructured from the decoded envelope). Inside the callback `entries` means one bucket's entries; two lines above it means the whole input.
These two functions are the ones where `entries` carries the most meaning, so a later edit that reaches for the outer binding in that callback will compile
and be wrong. The repo's own bucket module names the callback parameter the same way, so the collision is the phase's, not pre-existing.
**Fix:** Rename the callback parameter at both sites, e.g. `(reason, dropped) => HydrationEvent.LeftOut({ reason, entries: dropped })`, or rename the
`dropEvents` callback's second parameter in `HydrationBuckets.ts` to `bucket` and use it consistently.

### WR-03: The spec says every kind is a compile error "until produced and reported", which is true of only two kinds

**File:** `spec/decisions/183-hydration-drop-events-are-derived-from-their-buckets.md` (Consequences, first bullet) and
`spec/decisions/152-each-hydration-drop-reason-is-stated-once-with-its-kind.md` (the Rev 1.1 amendment); `spec/invariants.md` INV-QD-385 ("a reason with a source cannot go unreported")
**Issue:** For `entry` and `dehydration` the buckets plus `dropEvents` make the claim true, because the record is total and one function reports every key. For
`payload` the code only forces a producer to be *named*: `PayloadProducer` is a closed union of the decoder's tags plus `"SubjectCheck"`, so a new `payload` row must claim
an existing producer (compile error, since two rows then name it) or widen `PayloadProducer` and add a `PAYLOAD_REASONS` slot. Nothing makes a call site use that slot. A
reason with a new producer and no `PAYLOAD_REASONS.X` use compiles and is raised nowhere, which is the gap the phase set out to close for the other two kinds. The code's own
doc comments ("until its producer is stated"), the changeset and BEH-QD-688 ("MUST name what raises it") are accurate; the ADR consequence, the ADR-QD-152 amendment
and INV-QD-385's "cannot go unreported" are not.
**Fix:** Say "until its producer is stated" for the `payload` kind in ADR-QD-183 Consequences and the ADR-QD-152 amendment, and scope INV-QD-385's "cannot go unreported" to the
two bucketed kinds. Do this through `scripts/spec-revise.mjs` as the other edits were.

## Info

### IN-01: New lines far past the ~90-column hand-wrapping

**File:** `packages/react/src/HydrationBuckets.ts:33`, `:41`; `packages/react/src/HydrationEngine.ts:204`, `:232`, `:534`, `:545`, `:587`; `packages/react/test/HydrationBuckets.tst.ts` (header 100-119, lines 15, 24, 26, 31, 37, 39, 47); `packages/react/test/HydrationDropEvents.test.ts` (header 104-117; lines 127, 393, 507 at 120-125)
**Issue:** The two bucket constructors are 139 columns each. `HydrationEngine.ts:545` grew from 104 to 114 columns with the `PAYLOAD_REASONS.SubjectCheck` rename. AGENTS.md section 17 settles on hand-wrapping at about ninety columns.
**Fix:** Wrap the constructors, which also makes the declared order the thing the eye reads:
```ts
export const entryBuckets = (): DropBuckets<EntryDropReason, unknown> => ({
  EntryTooDeep: [],
  MalformedEntry: [],
  UndecodablePolicy: [],
});
```
and likewise `dehydrationBuckets`, and wrap the other lines above.

### IN-02: `PAYLOAD_PRODUCERS` is a runtime value that exists for types and one test

**File:** `packages/react/src/HydrationEngine.ts:216`
**Category:** necessity
**Issue:** The engine reads it only as `typeof PAYLOAD_PRODUCERS` (lines 230-232); the sole runtime reads are the two tests, and the doc says it is "exported only for its conformance test". The four-key object ships in the bundle to be a compile-time witness. Whether that is worth it is a judgment call (a `satisfies`-checked const is the repo's closed-table idiom), so this is Info, not provable waste.
**Fix:** Leave it if the one-row-per-reason witness is wanted as a value; otherwise state the producer table as a type alias checked by a mapped-type constraint and drop the runtime export, keeping the existing `.tst.ts` pin.

### IN-03: Tests that cannot fail for the reason their title names, or pin the same fact twice

**File:** `packages/react/test/HydrationBuckets.tst.ts:43`, `:17-20`, `:22-28`; `packages/react/test/HydrationPayload.test.ts` ("the producer record names every whole-payload reason, each producer once"); `packages/react/test/HydrationDropEvents.test.ts:169`, `:267-295`
**Issue:**
- "the derivation hands every reason of a record to its event" checks only the result's element type. A `dropEvents` that skipped a key would still pass; only the runtime rows catch that.
- "the entry buckets are one record keyed by every entry reason" and its dehydration twin compare `entryBuckets()` to `DropBuckets<...>`, which is the constructor's own return annotation, so they can fail only if the annotation is edited. They do pin that `DropBuckets` stays a mapped type. The `@ts-expect-error` rows test `DropBuckets` itself, not the two constructors, and accept any error on the line. `DropBuckets`'s doc also claims an unknown key is an excess-property error; no pin covers it.
- "the producer record names every whole-payload reason, each producer once" hard-codes the same four reasons and four producers a fourth time (record, inverse, tst, here); the next test already ties each row to its observed reason. It cannot fail without the compiler failing first.
- `assertDeltas` asserts `actual.length === 9`, a literal that fails any unrelated test the day core gains a reason; `hydrationDropReasons.length` is what `actual` is built from.
- The hydrate order rows are titled "whatever the input order" but each feeds a single input order (the dehydrate side does feed two).
**Fix:** Retitle the type pins for what they pin, add a runtime `dropEvents` row that asserts one call per key of a record with every bucket full, add the excess-key `@ts-expect-error` line, drop the hard-coded key list test, replace `9` with `hydrationDropReasons.length`, and either feed the reverse order in the hydrate order rows or drop "whatever the input order".

### IN-04: Doc comments that overstate what the code does

**File:** `packages/react/src/HydrationEngine.ts:519-520`; `spec/invariants.md` INV-QD-386 Enforcement
**Issue:** `planHydration`'s new sentence says "the drop events come from that record alone". The `PayloadRefused` events do not (they come from `refuse`, with no bucket), so a reader of the same function sees two sources. INV-QD-386's Enforcement lists the two "bucket record missing a reason" pins for an order that is complete and in the declared sequence; those pins test totality of `DropBuckets`, not the order or either constructor. The order is pinned only by the runtime rows.
**Fix:** Say "the entry-drop events come from that record alone; a refused payload is one `PayloadRefused` event". In INV-QD-386, name the runtime rows as the order's enforcement and the `.tst.ts` pins as totality's.

---

_Reviewed: 2026-11-22_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
