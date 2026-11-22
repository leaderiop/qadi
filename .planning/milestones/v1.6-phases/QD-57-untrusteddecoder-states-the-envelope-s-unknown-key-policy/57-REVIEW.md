---
phase: QD-57-untrusteddecoder-states-the-envelope-s-unknown-key-policy
reviewed: 2026-11-19T02:00:00Z
depth: standard
files_reviewed: 20
files_reviewed_list:
  - packages/audit/src/AuditArchive.ts
  - packages/audit/src/AuditEntry.ts
  - packages/audit/test/AuditEntryDifferential.test.ts
  - packages/audit/test/UntrustedSeams.test.ts
  - packages/core/src/EnvelopeKeys.ts
  - packages/core/src/Policy.ts
  - packages/core/src/PortRemote.ts
  - packages/core/src/PortWireEncode.ts
  - packages/core/src/SinkCodec.ts
  - packages/core/src/UntrustedDecode.ts
  - packages/core/test/DecisionWire.test.ts
  - packages/core/test/DecodeRefusal.test.ts
  - packages/core/test/SinkCodec.test.ts
  - packages/core/test/UntrustedDecode.test.ts
  - packages/core/test/UntrustedDecode.tst.ts
  - packages/core/test/UntrustedSeams.test.ts
  - packages/devtools/test/model/Source.test.ts
  - packages/react/src/HydrationEngine.ts
  - packages/react/test/UntrustedSeams.test.ts
  - scripts/check-house-style.mjs
findings:
  critical: 0
  warning: 1
  info: 1
  total: 2
  necessity: 0
status: issues_found
---

# Phase 57: Code Review Report (iteration 2)

**Reviewed:** 2026-11-19T02:00:00Z
**Depth:** standard
**Files Reviewed:** 20
**Status:** issues_found

## Summary

Iteration 1's three warnings are resolved and the fix commits introduce no code defect. I checked each one against `git diff acc5849f~7 HEAD` and the real tree.

- **WR-01 (index signature or rest dropped under `ignore`) is resolved.** `EnvelopeKeys.ts` adds `open: ast.indexSignatures.length > 0` to `Member`. `envelopeKeysOf` throws `unknownKeys "ignore" needs objects with a closed key list ...` when any member is open. The message starts with the `unknownKeys "ignore" needs` prefix that BEH-QD-621 requires. The check sits after the no-member and no-distinct-`_tag` check, so each refusal keeps its own message. `Match` still resolves `Union` and `Suspend` members, so a rest member inside a union is caught (U20 covers it).
- **WR-02 (prototype-chain lookup) is resolved.** `Object.hasOwn(PROJECTION, options.unknownKeys)` runs before the table is indexed, so `constructor`, `toString` and `nope` throw at build, and so does `__proto__` and an omitted value (`got undefined`). The message is derived from `Object.keys(PROJECTION)`, so it cannot drift from the table. `String(...)` is safe for any value a JSON-sourced option can hold.
- **WR-03 (stale order in `decodeSinkRecord`'s doc) is resolved.** The paragraph now says project, guard, version, decode, which matches `UntrustedDecode.ts`. The sentence "never reaches the guard or the decode" is accurate for the decode path.
- **IN-01 stays as Info**, as instructed (see below).

U20 and U21 are sound. `ignoreNeeds` is `/unknownKeys "ignore" needs/`, which both build-time refusals satisfy. U20's three throwing cases do reach the new open-member refusal: a bare `Record` has one member with no property signatures, so the first check passes and the open check fires. A union with `_tag` literals on both members passes the discriminant check. U21's string matcher is a substring match on the exact message. U21 takes the untyped value from `JSON.parse`, so it needs no `as`, which matches §6. I ran `UntrustedDecode.test.ts`: 43 of 43 pass.

One finding remains: spec drift in files the fix did not touch.

## Warnings

### WR-01: INV-QD-359, its traceability rows and BEH-QD-621 are out of step with the fix commits

**File:** `spec/invariants.md:4167`, `spec/traceability.md:191`, `spec/traceability.md:475`, `spec/behaviors/08-serialization.md:238-239`

**Issue:** AGENTS.md §11 says changing public behavior means updating the behavior doc, the invariant and the traceability matrix in the same change. §15 names this drift pattern ("a claim was true when written and nobody was connecting it to the thing it described"). The fix commits changed behavior and tests but no `spec/` file.

1. **Test range stale (the drift you asked about).** `UntrustedDecode.test.ts` now has U1 to U21, because commits `4daeb9d2` and `cfa1f79e` added U20 and U21 (the file's `describe("unknownKeys ...")` block ends at U21). Three lines still cite "U1 to U19":
   - `spec/invariants.md:4167`: "(the `unknownKeys` describe, U1 to U19, including the build-time refusal of a schema whose keys cannot be derived)"
   - `spec/traceability.md:191`: "`UntrustedDecode.test.ts` (U1 to U19)"
   - `spec/traceability.md:475`: "the `unknownKeys` describe (U1 to U19: each policy, the projection before the guard, the keys of a union member by `_tag`, the build-time refusal)"

   `57-09-SUMMARY.md:67-69` records that the range was already corrected once, from U1 to U16 to U1 to U19, after 57-07 added tests. The same lag has now happened a second time.

2. **BEH-QD-621 defines "cannot be derived" without the new case.** `spec/behaviors/08-serialization.md:238-239` reads "A schema whose keys cannot be derived (one that is not an object or a union of objects with distinct literal `_tag`s) MUST refuse `ignore` when the decoder is built". This is the normative requirement. WR-01's fix adds a third refusal, an object member with an index signature or a rest element. Under the requirement as written, `Schema.Record(...)` is an object and is not required to be refused. The code now refuses it, so the code is ahead of the spec, and §11 says the spec leads. ADR-QD-170 D-03 (`spec/decisions/170-an-envelope-states-its-unknown-key-policy-at-its-decoder.md:54-56`) has the same wording ("a non-object, an array, or a union with no distinct literal `_tag`"), but it is the historical record and can be left alone.

**Fix:** Change "U1 to U19" to "U1 to U21" at the three lines above. Update `spec/behaviors/08-serialization.md:238-239` to something like:
```
REQUIREMENT: A schema whose keys cannot be derived (one that is not an object
             or a union of objects with distinct literal `_tag`s, or whose
             object has an index signature or a rest element) MUST refuse
             `ignore` when the decoder is built, with a message beginning
             `unknownKeys "ignore" needs`.
```
Optionally add "U21: a policy outside the closed set throws at build" to the traceability description so U20 and U21 are named, not only counted.

## Info

### IN-01: `project`'s "reads no value" claim is not accurate for accessor properties (carried from iteration 1, left as Info by decision)

**File:** `packages/core/src/UntrustedDecode.ts:166`
**Issue:** The doc says the projection "reads no value, so it cannot recurse". `Object.entries(input)` invokes the getter of every own enumerable accessor, including undeclared ones, before the filter runs. This holds for `JSON.parse` output, the intended input. It does not hold for the in-process `unknown` values the `decodeSinkRecord` family also accepts. The old `envelopeOf` behaved the same way, so this is not a regression. The same sentence appears in ADR-QD-170 D-19 (spec line 4 of the decision list), so any rewording belongs in both places.
**Fix:** Say "reads no nested value of parsed JSON", or note that accessors are invoked.

---

_Reviewed: 2026-11-19T02:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
