---
phase: QD-77-an-audit-row-is-a-value-only-its-codec-makes
reviewed: 2026-11-24T06:00:00Z
depth: standard
files_reviewed: 19
files_reviewed_list:
  - packages/audit/src/ArchiveFacts.ts
  - packages/audit/src/AuditArchive.ts
  - packages/audit/src/AuditEntry.ts
  - packages/audit/src/CodecMade.ts
  - packages/audit/src/Retention.ts
  - packages/audit/src/SequenceIntegrity.ts
  - packages/audit/test/ArchiveFacts.test.ts
  - packages/audit/test/ArchiveRoundTrip.test.ts
  - packages/audit/test/ArchiveWriterInputs.test.ts
  - packages/audit/test/AuditArchive.test.ts
  - packages/audit/test/AuditEntry.characterisation.test.ts
  - packages/audit/test/AuditEntry.test.ts
  - packages/audit/test/AuditEntry.tst.ts
  - packages/audit/test/ForeignRows.test.ts
  - packages/audit/test/Retention.test.ts
  - packages/audit/test/SequenceIntegrity.test.ts
  - packages/audit/test/UntrustedSeams.test.ts
  - packages/audit/test/helpers.ts
  - scripts/check-api-surface.mjs
findings:
  critical: 0
  warning: 3
  info: 2
  total: 5
  necessity: 0
status: issues_found
---

# Phase QD-77: Code Review Report (iteration 3)

**Reviewed:** 2026-11-24
**Depth:** standard
**Files Reviewed:** 19
**Status:** issues_found

## Summary

All three iteration-2 findings are fixed as the disposition decided, and I found no BLOCKER.

- **WR-01 (`keyMaterial`)**: fixed. The check runs after `now` and before the entries, and uses the module's own `KeyMaterialSchema`, which the reader also uses. A probe against `effect` confirmed what the check covers. A number `keyId`, a `null` item, a string item, a missing field, a hole and a non-list value are each refused, and an extra key is dropped. Two gaps are left: the check reads host values twice (WR-01 below), and the "whatever the value given" claim does not hold for `entries` (WR-02).
- **IN-01 (per-copy `WeakSet`)**: recorded in `CodecMade.ts`, ADR-QD-190 item 6 and the upgrade guide, as the disposition decided. Not re-raised.
- **IN-02 (freeze)**: fixed, and the one-level freeze is correct. Probed on `effect@4.1.2`: `Hash.hash` caches in a `WeakMap` (`Hash.ts:131-166`) and `Equal` caches pair results in a `WeakMap` (`Equal.ts:217`). Neither writes to the object, so a frozen `Data.Class` row still `Equal`s its twin and hashes alike. The top-level `json` in the decode path is never the host's object, because `untrustedDecoder`'s `ignore` projection builds a fresh envelope before the schema walk. Freezing the two top-level fields the writer and purge read as identity (`at`, `sequenceNumber`) is sufficient for INV-QD-400.

`ArchiveInputInvalid.value: unknown` is not wrong, but a cleaner closed shape exists in this codebase (WR-03 below).

The docs and spec records match the code, apart from the two overclaims in WR-02 and IN-01.

## Warnings

### WR-01: `archiveAuditTrail` checks `keyMaterial` and then re-reads it, so the check and the written value can differ

**File:** `packages/audit/src/AuditArchive.ts:117-134`
**Issue:** The guard reads `options?.keyMaterial` once into `given` and validates `given` and each item. The projection then reads `options?.keyMaterial?.map(...)` a second time, and destructures each item a second time. The two reads see different values if `options.keyMaterial` or an item field is an accessor. Probed: `{ get keyId() { return n++ ? 5 : "a" }, algorithm: "b", publicKey: "c" }` passes `Schema.is`, then destructures to `keyId: 5`. The writer then archives a bundle its reader refuses as `Malformed`, which is the failure WR-01 of iteration 2 set out to close. The input comes from a host or a JavaScript caller, the exact population the check is for. The trigger is contrived, but INV-QD-399 and the ADR claim the writer cannot archive an item the reader refuses.
**Fix:** Validate and project the same snapshot, once per item.
```ts
const given: unknown = options?.keyMaterial;
let keyMaterial: Array<KeyMaterial> | undefined;
if (given !== undefined) {
  if (!Array.isArray(given)) return yield* Effect.fail(new ArchiveInputInvalid({ field: "keyMaterial", value: given }));
  const projected = [];
  for (const [index, item] of given.entries()) {
    const copy = isRecordLike(item) ? { keyId: item.keyId, algorithm: item.algorithm, publicKey: item.publicKey } : item;
    if (!isKeyMaterial(copy)) return yield* Effect.fail(new ArchiveInputInvalid({ field: "keyMaterial", value: index }));
    projected.push(copy);
  }
  keyMaterial = projected;
}
```
Here `isRecordLike` is a `Predicate.isObject`-style guard, so a `null` item still fails by index and no `as` is needed. This reads each field once and validates what it writes. At minimum, map over `given` rather than re-reading `options.keyMaterial`.

### WR-02: INV-QD-399 says no input is a defect "whatever the value given", but a non-list `entries` still throws

**File:** `packages/audit/src/CodecMade.ts:40-45`, `packages/audit/src/ArchiveFacts.ts:153-165`, `spec/invariants.md` (INV-QD-399 statement)
**Issue:** The iteration-2 fix treats a non-list `keyMaterial` as an input the type does not bind and refuses it as a value. `entries` has the same trust boundary, and a JavaScript caller can pass `undefined`, `null` or an object for it. `firstNotCodecMade(entries)` calls `entries.findIndex`, which throws a `TypeError`. Inside `Effect.fn` that is a defect (a die), not an `ArchiveInputInvalid`. `planRetention`, `planPurge` and `verifySequenceIntegrity` share the call. INV-QD-399 ends "None of the three is a defect, whatever the value given", and ADR-QD-190 and BEH-QD-722 are worded the same way. A throwing accessor or Proxy on `keyMaterial` is also a defect, and `Schema.is` on a hostile item can throw. The statement is stronger than the code.
**Fix:** Either guard the list in `firstNotCodecMade`/`verifiedArchiveFacts`, with a non-list reported as `ArchiveInputInvalid { field: "entries", value: <given> }` (consistent with `keyMaterial`) and the same for `RetentionInputInvalid`, or narrow the invariant, ADR item and BEH requirement to "a list". Add a `ForeignRows` test for a non-list `entries` whichever way it goes.

### WR-03: `ArchiveInputInvalid.value: unknown` overloads one slot for an index and for a given value, and a closed shape that avoids it already exists in this package

**File:** `packages/audit/src/ArchiveFacts.ts:131-140`
**Issue:** `value` is the given value for `now`, the index for `entries`, and for `keyMaterial` either an index or the given value. The type cannot tell a handler which, so a handler (a log line, a retry policy, a user message) cannot narrow `value` from `field` alone. For `keyMaterial` it cannot tell index 3 from a given `3` without the host's original input, as the doc comment concedes ("asks `Array.isArray` of what it passed"). That is the widening the owner's memory warns about (`unknown` to dodge a union, no closed shape). It also diverges from the sibling `RetentionInputInvalid.value: number`, which the doc says this error is "shaped like", while that one can hold a non-number `now` too.

ADR-QD-190 item 2 is right that `Data.TaggedError` cannot extend a union of shapes (TS2509), and a `Schema.TaggedError` is outside the §4 budget. The same file already shows the in-house closed shape: `ArchiveNotVerified { refusal: ArchiveRefusal }`, with `ArchiveRefusal` a `Data.TaggedEnum`, consumed through `Match.tagsExhaustive`. For example:
```ts
export type ArchiveInputRefusal = Data.TaggedEnum<{
  NowNotFinite: { readonly value: unknown };
  KeyMaterialNotAList: { readonly value: unknown };
  KeyMaterialItemRefused: { readonly index: number };
  EntryNotMadeByCodec: { readonly index: number };
}>;
export class ArchiveInputInvalid extends Data.TaggedError("ArchiveInputInvalid")<{
  readonly refusal: ArchiveInputRefusal;
}> {}
```
`unknown` then appears only where a value is a given value, `index` is always a `number`, and nothing needs `Array.isArray` to disambiguate. The release is already marked Breaking and `ArchiveInputInvalid` is new in it, so the shape costs nothing to change now. `RetentionInputInvalid` would take the same treatment for symmetry.
**Fix:** Owner decision. If the owner prefers the single `field`/`value` pair, keep `unknown` but add a `keyMaterial` member for the non-list case (`"keyMaterial" | "keyMaterialItem" | ...`) so `value` is an index for every member except `now` and the non-list one. The overloaded slot is the part to remove.

## Info

### IN-01: `RetentionInputInvalid.value` is still `number` while `now` can be anything for a JavaScript caller

**File:** `packages/audit/src/Retention.ts:41-44`, `packages/audit/src/ArchiveFacts.ts:131-140`
**Issue:** The reasoning that widened `ArchiveInputInvalid.value` to `unknown` ("a caller the type does not bind can give a `now` that is a string") applies unchanged to `planRetention`, which does `new RetentionInputInvalid({ field: "now", value: now })` after `Number.isFinite(now)`. The two errors are documented as one shape and now differ in type.
**Fix:** Settle it with WR-03 so both errors carry the same shape, or record why they differ.

### IN-02: `README.md` leaves out the non-list `keyMaterial` value

**File:** `packages/audit/README.md:142-148`
**Issue:** The README says a refused `keyMaterial` is named by `keyMaterial` "and the index of the first item". It does not say that a non-list is named by the value given, which BEH-QD-722, the overview row and the upgrade guide all say.
**Fix:** Add "or the value given, when it is not a list" to the sentence. Change it again if WR-03 changes the shape.

---

_Reviewed: 2026-11-24_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_

## Orchestrator disposition, iteration 3 (decided autonomously, 2026-11-24, under the owner's standing instruction of 2026-11-22: "always pick the most complete and clean solutions"; owner memory: closed unions over widening, no `unknown`-bag hacks)

**WR-01: fix.** Validate one snapshot and project from it. Read `options?.keyMaterial` once into a local. Check it, then project each item from the values the check read: take each field once and build the fresh `{ keyId, algorithm, publicKey }` from those reads. Nothing is read twice. Pin it with the accessor probe the reviewer describes, a getter that passes the check and then changes. Show that probe RED on HEAD first.

**WR-02: fix. Do not narrow.** A non-list `entries` is refused as a typed error by every function that takes host rows: `archiveAuditTrail`, `verifySequenceIntegrity`, `planRetention` and `planPurge`. That also covers whatever `firstNotCodecMade` is given. INV-QD-399's "whatever the value given" then holds as written. Write the tests first and show them RED, then GREEN, each with a positive twin.

**WR-03 and IN-01: replace the overloaded `value: unknown` with a closed tagged refusal, the shape `ArchiveNotVerified { refusal: ArchiveRefusal }` already uses in this file.**
- `ArchiveInputInvalid { refusal: ArchiveInputRefusal }`. `ArchiveInputRefusal` is a `Data.TaggedEnum` with exactly one member per case the writer and `verifySequenceIntegrity` refuse:
  - `now` not finite, carrying the given value;
  - `keyMaterial` not a list, carrying the given value;
  - a `keyMaterial` item invalid, carrying its `index: number`;
  - `entries` not a list, carrying the given value;
  - an entry the codec did not make, carrying its `index: number`.
- `RetentionInputInvalid { refusal: RetentionInputRefusal }` follows the same discipline, with exactly its own cases: `now`, `maxAgeMs`, entries not a list, and an entry not codec-made.
- Typing. A member carries `unknown` only where it holds a value the caller gave, and `index: number` wherever it is an index. Nothing is overloaded and nothing is widened. Name the members in this codebase's style.
- Consumers. Read refusals with `Match.tagsExhaustive`, and update every consumer in src, tests, docs, fences, the website and the examples.
- Records. Update the `spec/overview.md` rows (gate 13 must list any newly exported refusal type or constructor), the changeset, the upgrade guide, README, `capabilities.md`, the ADR-QD-190 amendment, BEH/INV wording, the CCR-QD-469 row and the traceability mapping.
- Breaking is already declared for this release, and both errors' shapes are new or changed in it.

**IN-02: fix.** The README states the non-list `keyMaterial` case, worded to match the new refusal names.

Mutation: re-run the close for every touched group and re-commit `77-mutation-close.json`. Kill any survivor with a test; never re-baseline. `pnpm check:pr < /dev/null` must end green.
