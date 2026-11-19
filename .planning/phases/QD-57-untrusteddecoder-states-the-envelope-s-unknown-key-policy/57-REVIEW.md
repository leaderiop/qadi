---
phase: QD-57-untrusteddecoder-states-the-envelope-s-unknown-key-policy
reviewed: 2026-11-19T01:30:00Z
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
  warning: 3
  info: 1
  total: 4
  necessity: 0
status: issues_found
---

# Phase 57: Code Review Report

**Reviewed:** 2026-11-19T01:30:00Z
**Depth:** standard
**Files Reviewed:** 20
**Status:** issues_found

## Summary

Phase 57's behaviour is sound for every seam that exists today. I traced the projection, the `_tag` member selection, the stored-envelope rewrite and the five `refuse` call sites, and found no path where an undeclared key reaches `prepare` or the strict decode for the schemas in use. The D-01, D-17, D-18 and D-20 changes are the only tag or answer changes I could find, and the matrices pin them.

I ran throwaway experiments against the real decoder (since deleted). They found three defects in the new, general-purpose `unknownKeys: "ignore"` machinery. None fires for a current seam. They matter because the option is public API and its doc and build-time guard promise more than they deliver. Structural findings (fallow) were not supplied.

## Warnings

### WR-01: `ignore` silently drops every key of an index-signature schema, and does not throw at build

**File:** `packages/core/src/EnvelopeKeys.ts:28-47, 65-72`
**Issue:** `memberOf` reads only `ast.propertySignatures`. An `Objects` node with `indexSignatures` (`Schema.Record`, `Schema.StructWithRest`) therefore declares an empty or partial key set, and `envelopeKeysOf` accepts it. The doc comment promises the opposite: it says the function "Throws, at build, for a schema with no object member ... a build that answered would drop keys it could not name". Verified against the real decoder:

- `untrustedDecoder(Schema.Record(Schema.String, Schema.Number), { unknownKeys: "ignore" }).decode({ a: 1, b: 2 })` returns `Success {}`.
- `Schema.StructWithRest(Struct({ a }), [Record(String, Number)])` with `{ a: 1, b: 2 }` returns `Success { a: 1 }`.

Both are silent data loss, which is the failure class ADR-QD-002 exists to prevent. The `ignore` machinery cannot name those keys, so it must refuse to build.

**Fix:** Make an index signature an underivable member. Throw in `envelopeKeysOf`, or have `membersOf` yield a marker that makes the build fail:
```ts
const members = membersOf(SchemaAST.toEncoded(ast));
...
// in memberOf's caller, or via a hasIndexSignatures flag on Member:
if (members.some((m) => m.openKeys)) throw new Error('unknownKeys "ignore" needs a closed object: an index signature declares no key list');
```
Add a `U16`-style test for `Schema.Record` and `Schema.StructWithRest` under `ignore`.

### WR-02: `PROJECTION[options.unknownKeys]` is an inherited-property lookup; the "throws when built" claim is false for `constructor` and `toString`

**File:** `packages/core/src/UntrustedDecode.ts:181-185, 212`
**Issue:** The doc says a policy outside the closed union "finds no row and throws when the decoder is built". `PROJECTION` is a plain object literal, so inherited names resolve to `Object.prototype` members. Verified:

- `unknownKeys: "constructor"` and `"toString"` build without error. The call returns the `Object` result or a string, and the first `decode` throws `TypeError: projection is not a function` at decode time, on the untrusted-input path.
- `"nope"` throws at build, but with `PROJECTION[options.unknownKeys] is not a function`, which does not name the option.

The type system closes this for TypeScript callers. A JS caller or a config-driven value is exactly the case the "closed table, never `===`" design (D-16) is meant to cover. `FieldLattice.ts`, which AGENTS.md §5a cites, reads its own-property table through `Object.hasOwn` for this reason.

**Fix:**
```ts
if (!Object.hasOwn(PROJECTION, options.unknownKeys)) {
  throw new Error(`untrustedDecoder: unknownKeys must be "refuse" or "ignore"`);
}
const projection = PROJECTION[options.unknownKeys](schema.ast);
```
Add a test that `"constructor"`, `"toString"` and `"nope"` all throw at build.

### WR-03: `decodeSinkRecord`'s doc states the pre-phase order, the opposite of what ADR-QD-170 makes true

**File:** `packages/core/src/SinkCodec.ts:517-520`
**Issue:** The doc says "The depth guard runs first ... then the version, then the projection onto the envelope's declared keys, then the strict decode". The order is now project, guard, version (`prepare`), decode. The projection running first is what makes D-01 true, and `UntrustedDecode.ts` and `checkVersion`'s own doc both say so. This public doc sits beside a contradicting one. A reader reasoning about whether a deep unknown key refuses the frame would get the wrong answer from it. The AGENTS.md §15 principle ("a claim was true when written and nobody was connecting it") applies.

**Fix:** Rewrite as "The projection onto the envelope's declared keys runs first, then the depth guard (so the schema's recursion through `Policy` and `Trace` cannot overflow), then the version, then the strict decode, all inside the decoder ({@link sinkWire})".

## Info

### IN-01: `project`'s "reads no value" claim is not accurate for accessor properties

**File:** `packages/core/src/UntrustedDecode.ts:166-173`
**Issue:** The doc says the projection "reads no value, so it cannot recurse". `Object.entries(input)` invokes the getter of every own enumerable accessor, including undeclared ones, before the filter runs. The claim holds for `JSON.parse` output, the intended input. It does not hold for the in-process `unknown` values `decodeSinkRecord` and friends also accept. The old `envelopeOf` had the same behaviour, so this is not a regression. The doc overstates the guarantee.

**Fix:** Say "reads no nested value of parsed JSON" (or note that accessors are invoked), or filter with `Object.keys` plus `Object.getOwnPropertyDescriptor(...).value`, as `checkVersion` already does for `version`.

---

_Reviewed: 2026-11-19T01:30:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
