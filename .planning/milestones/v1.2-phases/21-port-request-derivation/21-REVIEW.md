---
phase: 21-port-request-derivation
reviewed: 2026-11-11T00:00:00Z
depth: standard
files_reviewed: 15
files_reviewed_list:
  - packages/core/src/AttributeResolver.ts
  - packages/core/src/CustomPredicate.ts
  - packages/core/src/DecisionHistory.ts
  - packages/core/src/PortDerivation.ts
  - packages/core/src/PortDescription.ts
  - packages/core/src/PortSpanEncode.ts
  - packages/core/src/PortWireEncode.ts
  - packages/core/src/RelationshipResolver.ts
  - packages/core/src/SignatureHistory.ts
  - packages/core/test/PortConformance.test.ts
  - packages/core/test/PortDescription.test.ts
  - packages/core/test/PortRequest.tst.ts
  - packages/core/test/PortSpan.test.ts
  - packages/core/test/PortWire.test.ts
  - packages/core/test/SignatureHistory.test.ts
findings:
  critical: 0
  warning: 2
  info: 4
  total: 6
  necessity: 0
status: issues_found
---

# Phase 21: Code Review Report

**Reviewed:** 2026-11-11
**Depth:** standard
**Files Reviewed:** 15
**Status:** issues_found

## Summary

Reviewed the ARCH-69 / ADR-QD-133 change: `makePortDescription` derives a port's `key` and `defect` from its wire question; `QuestionOf` and `portSpan`/`PoseOf` make a forgotten question or pose member a compile error; `presentMembers` drops `undefined` members before the strict encode.

Verification run: the five affected test files pass (207 tests), `tsc --noEmit -p tsconfig.test.json` is clean, and `oxlint` over the changed sources and tests reports nothing.

Behaviour is preserved. I traced each of the four derived ports (key text, wire bytes, defect equivalence) against the old hand-written versions and found no regression. Request keys are in-memory only: `Capture.ts` and `PortDoubles.ts` build and read them in the same process, so the change in key text format (tuple to object) invalidates nothing persisted. No critical issues. Two warnings are inaccurate claims about the key's law, and one contract is not honoured for a hostile request. The rest are info.

## Warnings

### WR-01: Test comment and `key` doc claim absent and `undefined` optional members are told apart; they collide

**File:** `packages/core/test/PortDescription.test.ts:451-456` (also `packages/core/src/PortDescription.ts:211-212`, `packages/core/src/SignatureHistory.ts:188-191`)
**Issue:** The `ARBITRARIES` comment says `meaning`/`signerRole` are generated "absent, `undefined` or a string: the three are different requests to `Equal`, and the key must tell them apart exactly as the wire question does". The key cannot do that. `key` is `canonicalKey(presentMembers(toQuestion(args)))`, and `presentMembers` drops every `undefined` member, so `{subjectId, resourceId: undefined}` and `{subjectId, resourceId: undefined, meaning: undefined}` produce the same key text. The old tuple key had the same collision (both `u`), so behaviour is unchanged and benign: a store treats the two alike. But the property test cannot detect the difference, because it compares `key` to `canonicalKey` of the encoded question, which is itself built through `presentMembers`. The `PortDescription.key` doc ("share a key exactly when every argument is `Equal.equals`") and the `signatureHistoryPort` doc ("injective over every argument the port receives") overstate the law in the same way. A future reader will trust a guarantee that is not there.
**Fix:** State the actual law: two requests share a key exactly when they ask the same wire question, and an absent optional member and one stated `undefined` are the same question. Reword the three comments to say so, and add one explicit assertion pinning it:
```ts
assert.strictEqual(
  keyText(signatureHistoryPort.key([{ subjectId: aliceId, resourceId: undefined }])),
  keyText(signatureHistoryPort.key([{ subjectId: aliceId, resourceId: undefined, meaning: undefined }])),
);
```

### WR-02: A derived `key` can throw, contradicting "a getter or proxy trap that throws is refused, never thrown"

**File:** `packages/core/src/PortDerivation.ts:105`
**Issue:** `key: (args) => canonicalKey(presentMembers(wire.toQuestion(args)))`. `canonicalKey` never throws, but `wire.toQuestion(args)` runs outside it. It reads `request.depth`, `query.meaning` and so on, and `presentMembers` runs `Object.entries`, which invokes getters. A request whose property is a throwing getter, or an untyped caller passing `undefined` for the query, throws out of `key` instead of returning `KeyRefusal.Unreadable`. `PortDescription.key`'s own doc promises a `Result`, never a throw. The callers sit on a live path: `devtools/src/model/Capture.ts:106` calls `d.key(args)` inside the wrapper around the real port call, so the throw becomes a defect in the live port instead of the intended "pass through unrecorded". The old per-port `canonicalKey([query.subjectId, ...])` read the properties outside the walk in the same way, so this predates the change. Deriving the key in one place now gives a single place to fix it for all four ports.
**Fix:** Catch around the question read and map to the refusal the type already has:
```ts
key: (args) =>
  Result.try({
    try: () => presentMembers(wire.toQuestion(args)),
    catch: (error) => KeyRefusal.Unreadable({ path: [], message: String(error) }),
  }).pipe(Result.flatMap(canonicalKey)),
```
Add a test with a throwing getter on a `RelationshipCheck` asserting a `KeyRefusal`.

## Info

### IN-01: The key law test is tautological with the implementation

**File:** `packages/core/test/PortDescription.test.ts:503-509`
**Issue:** The test asserts `d.key(args) === canonicalKey(JSON.parse(JSON.stringify(encodeQuestion(args))))`. Both sides derive from the same `toQuestion`, so a member omitted from `toQuestion` is absent from both and the test still passes. The compile-time `QuestionOf` check and `PortRequest.tst.ts` are what actually guard that, and they are the right layer. The runtime test mostly proves that the schema encode does not transform values. That is worth having, but it should not be read as the "a forgotten member cannot be left out of the key" guard. The `describe` title in the same file implies it does.
**Fix:** Retitle it, or add one independent oracle per port: build the expected key from a hand-written object (`{ subjectId, event, resourceId }`) for a fixed request, which is what the removed exact-text pins in `PortConformance.test.ts` used to provide.

### IN-02: `portWire` no longer ties the encoded value to the question type

**File:** `packages/core/src/PortWireEncode.ts:101,111`
**Issue:** `Schema.encodeResult` became `Schema.encodeUnknownResult` and `presentMembers` returns `unknown`. The compiler no longer checks that what is encoded is a `Q`. `QuestionOf` covers the `toQuestion` side, but a bug inside `presentMembers` itself (it is a generic shallow filter) would be invisible to the type system and caught only at runtime by the strict schema. Acceptable, but worth a one-line comment saying the runtime schema is the check.
**Fix:** Either type `presentMembers` as `<Q extends object>(question: QuestionOf<Q>) => Q` with an internal narrowing, or note at the call site that the strict encode is the verification.

### IN-03: Duplicate "full" and "sparse" rows in the span-question test

**File:** `packages/core/test/PortSpan.test.ts` (the `attribute` and `custom` rows used for both `full` and `sparse`)
**Issue:** For `AttributeResolver` and `CustomPredicate` the same `Row` is used for both cases, so two identical tests run per port under different names. The comment explains why (no optional member), but `Object.entries(CASES)` still reports four tests that check the same thing.
**Fix:** Make `sparse` optional in the `CASES` type and skip the loop iteration when it is absent.

### IN-04: Lines well past the hand-wrap width

**File:** `packages/core/src/SignatureHistory.ts:333,377`; `packages/core/src/PortDerivation.ts:198`
**Issue:** Lines of 123, 114 and 122 columns in files that otherwise wrap by hand near 90 (AGENTS.md section 17). Not a gate, but these are the only outliers in the diff.
**Fix:** Wrap `pairKey`'s declaration, the `onFailure` arm and the `Effect.annotateCurrentSpan(encodeSpan(...))` call.

---

_Reviewed: 2026-11-11_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
