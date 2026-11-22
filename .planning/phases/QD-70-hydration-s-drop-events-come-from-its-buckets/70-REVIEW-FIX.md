---
phase: QD-70-hydration-s-drop-events-come-from-its-buckets
fixed_at: 2026-11-22T00:00:00Z
review_path: .planning/phases/QD-70-hydration-s-drop-events-come-from-its-buckets/70-REVIEW.md
iteration: 1
findings_in_scope: 7
fixed: 7
skipped: 0
status: all_fixed
---

# Phase QD-70: Code Review Fix Report

**Fixed at:** 2026-11-22
**Source review:** .planning/phases/QD-70-hydration-s-drop-events-come-from-its-buckets/70-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 7 (3 warning, 4 info; fix scope `all`)
- Fixed: 7
- Skipped: 0

Verification ran in the main checkout (`workflow.use_worktrees` is `false`), after the last commit: `vitest --project react` (578 passed), `pnpm typecheck`, `pnpm test:tstyche` (both passes), `check-house-style`, `check-doc-examples` (118 blocks), `check-api-surface` (941 exports, barrel unchanged), `spec-revise --check`, and `verify-traceability.sh --strict` (21 pass, 0 fail).

Two pairs of findings share a commit because they edit one block of code or one set of documents: WR-01 with IN-02 (the producer record's declarations and doc), and WR-03 with the spec half of IN-04.

## Fixed Issues

### WR-01: The "named by two rows or by none does not compile" direction has no standing pin

**Files modified:** `packages/react/src/HydrationEngine.ts`, `packages/react/test/HydrationBuckets.tst.ts`
**Commit:** 92a65bd8
**Applied fix:** Exported `PayloadProducer`, `OnlyMember`, `ReasonRaisedBy` and `PAYLOAD_REASONS` from the package-private engine module, each doc comment saying it is exported for the type pins and out of the barrel. `ReasonRaisedBy` gained a second parameter (default `typeof PAYLOAD_PRODUCERS`) so a pin can supply a record that names a producer twice or not at all. Added pins with positive twins: `OnlyMember` of one member, two members and `never`; `ReasonRaisedBy` of each of the four producers; `never` for a doubled and for an unnamed producer; `PAYLOAD_REASONS`'s type written out; and an annotated inverse over the doubled record refused by `@ts-expect-error ... is not assignable to type 'never'` beside the accepted real one. No negative `toBeCallableWith`/`toBeConstructableWith` pin was added, so `NOT_CALLABLE_PIN_BUDGET` and the AGENTS.md section 6 table are untouched. The gutting check was run once on a scratch edit (`OnlyMember<U, All = U> = U`): three assertions went red ("Type '"A" | "B"' is not the same as type 'never'", the doubled-record `ReasonRaisedBy` pin, and an unused `@ts-expect-error`), then the edit was reverted. Status: fixed, requires human verification (type-level logic).

### WR-02: `entries` is shadowed in both planners' event callbacks

**Files modified:** `packages/react/src/HydrationEngine.ts`, `packages/react/src/HydrationBuckets.ts`
**Commit:** b0a7b095
**Applied fix:** Both callbacks are now `(reason, dropped) => ...Event({ reason, entries: dropped })`, and `dropEvents`'s own callback parameter is named `bucket`.

### WR-03: The spec says every kind is a compile error "until produced and reported"

**Files modified:** `spec/decisions/183-hydration-drop-events-are-derived-from-their-buckets.md` (Rev 1.1), `spec/decisions/152-each-hydration-drop-reason-is-stated-once-with-its-kind.md` (Rev 1.2), `spec/invariants.md` (Rev 1.171), `spec/behaviors/19-hydration.md` (Rev 1.25), `spec/traceability.md` (Rev 1.241), `spec/decisions/index.yaml`, `spec/README.md` (Rev 1.283)
**Commit:** 724a4157
**Applied fix:** The ADR-QD-183 Consequences bullet, decision 4, the ADR-QD-152 amendment (heading and body), INV-QD-385 (statement, implication, enforcement), INV-QD-045's and INV-QD-323's enforcement text and BEH-QD-688 now state per kind what the compiler enforces: an `entry` or `dehydration` row is a compile error until it has a bucket, and so an event; a `payload` row until its producer is named in `PAYLOAD_PRODUCERS`, and a new producer until it has its `PAYLOAD_REASONS` slot; and the compiler cannot check that a call site raises a producer. Revisions were bumped only through `scripts/spec-revise.mjs --date 2026-11-22`. CCR-QD-462's row in `spec/README.md` cites the new revisions (183 1.1, 152 1.2, behaviors/19 1.25, invariants 1.171, traceability 1.241, README 1.283), checked equal to each header. The code comments, BEH-QD-688 and the changeset already said "until its producer is stated" or equivalent and were consistent; the changeset needed no edit. The 1.1 history entry on ADR-QD-152 still carries its original wording as history; the new 1.2 entry records the correction. No new BEH, INV, ADR or CCR id was introduced.

### IN-01: New lines far past the ~90-column hand-wrapping

**Files modified:** `packages/react/src/HydrationBuckets.ts`, `packages/react/src/HydrationEngine.ts`, `packages/react/test/HydrationBuckets.tst.ts`, `packages/react/test/HydrationDropEvents.test.ts`, `packages/react/test/HydrationPayload.test.ts`
**Commits:** e9165235 (bucket constructors, two engine lines), 92a65bd8 (engine producer block, `.tst.ts`), 1d3c61bd (payload test), c32ac34b (characterisation)
**Applied fix:** Wrapped the two 139-column constructors as one key per line, the engine lines the phase added or changed (including `PAYLOAD_REASONS.SubjectCheck` at 114 columns), and the long lines of the phase's test files. Lines the phase did not touch were left alone. A few unbreakable string titles and one-line comments stay at 99-103 columns.

### IN-02: `PAYLOAD_PRODUCERS` is a runtime value that exists for types and one test

**Files modified:** `packages/react/src/HydrationEngine.ts`
**Commit:** 92a65bd8
**Applied fix:** Kept as a runtime value, per the owner's direction. Its doc comment now says why: the engine reads it only as a type, but the conformance test drives one refusal per row and it is the source of truth `PAYLOAD_REASONS` is checked against.

### IN-03: Tests that cannot fail for the reason their title names, or pin the same fact twice

**Files modified:** `packages/react/test/HydrationBuckets.tst.ts`, `packages/react/test/HydrationBuckets.test.ts` (new), `packages/react/test/HydrationPayload.test.ts`, `packages/react/test/HydrationDropEvents.test.ts`
**Commits:** 1d3c61bd (type pins, new runtime test, payload test), c32ac34b (characterisation, its own commit)
**Applied fix:**
- The two constructor pins that compared a constructor to its own annotation now spell the reasons out (`{ readonly EntryTooDeep: Array<unknown>; ... }`), so a reason core's table gains fails them. The missing-reason pins gained an excess-key `@ts-expect-error ... does not exist in type` line each, with the positive twin kept. Directive text matching was confirmed once (a deliberately wrong text went red).
- The derivation pin is retitled for what it pins (the callback's types); a new `HydrationBuckets.test.ts` adds the runtime rows: each constructor's key order is its side's emission order, a call's buckets are its own, every reason core states is in exactly one of the three records (derived from `hydrationDropReasons`, not hard-coded), and `dropEvents` calls its event once per non-empty bucket in key order, skipping empty ones.
- The hard-coded key-list test in `HydrationPayload.test.ts` was dropped; the next test ties each row to its observed reason.
- `HydrationDropEvents.test.ts` (committed on its own): `assertDeltas` compares against `hydrationDropReasons.length`; the three hydrate pair-order rows are retitled for what they feed ("when the input lists X first") with their payloads and expectations untouched, and each gained a twin feeding the earlier reason first; the header no longer says "never edited". No existing row's expected values changed (the diff's removed lines are wrapping, titles and the one literal), and all existing rows pass (35 tests, up from 32).

### IN-04: Doc comments that overstate what the code does

**Files modified:** `packages/react/src/HydrationEngine.ts`, `spec/invariants.md`
**Commits:** 7b6e4ef0 (code), 724a4157 (spec)
**Applied fix:** `planHydration`'s doc now says the entry-drop events come from the bucket record alone, and a refused payload is one `PayloadRefused` event under the reason its producer's row names, with no bucket. INV-QD-386's Enforcement now names the runtime rows (the pair and triple rows of the characterisation and the constructors' key-order rows) as the order's enforcement, and the `.tst.ts` pins as totality's.

---

_Fixed: 2026-11-22_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
