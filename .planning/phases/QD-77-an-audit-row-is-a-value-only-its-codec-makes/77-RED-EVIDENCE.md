# QD-77 RED evidence

The writer-input regression, run on the unchanged source of the phase base.

- HEAD: `0e8e482c732cb5e007f76a4c26ad407cc3ce36bf` (no file under `packages/audit/src` differs from `phase_base`
  `4d0d3627b93d344efa880be83430166698864600`)
- Command: `pnpm vitest run --project audit packages/audit/test/ArchiveWriterInputs.test.ts --reporter=json --outputFile=<S>/red.json`
- Result: `Tests  7 failed | 8 passed (15)`; the command exits non-zero

## RED rows

Each row is a writer input the writer archives and the reader then refuses.

- RED: a record with at NaN is archived only when its reader reads it back
  - `EntryNotDecodable` at index 0, `Malformed`: `Expected number at ["at"]`
- RED: a row with an extra top-level key is archived only when its reader reads it back
  - `EntryNotDecodable` at index 0, `Malformed`: `Expected no excess property at ["extra"]`
- RED: a row whose record disagrees with its own decision is archived only when its reader reads it back
  - `EntryNotDecodable` at index 0, `Inconsistent` (`EvaluationId`)
- RED: now NaN is archived only when its reader reads it back
  - `Malformed`: `Expected number at ["metadata"]["createdAt"]` (`createdAt` written as `null`)
- RED: now positive infinity is archived only when its reader reads it back
  - `Malformed`: `Expected number at ["metadata"]["createdAt"]`
- RED: now negative infinity is archived only when its reader reads it back
  - `Malformed`: `Expected number at ["metadata"]["createdAt"]`
- RED: a keyMaterial item with an extra key is archived only when its reader reads it back
  - `Malformed`: `Expected no excess property at ["keyMaterial"][0]["extra"]`

## Refuted at the base

Each row passes on the base: the writer fails a typed error, or its bundle reads back. None is claimed RED.

- refuted: a row with sequenceNumber 1.5 is archived only when its reader reads it back
  - the writer fails `SequenceNumberInvalid`, a typed error
- refuted: now negative zero is archived only when its reader reads it back
  - reads back with `createdAt` 0
- refuted: no entries with an empty keyMaterial is archived only when its reader reads it back
- refuted: a resource holding a lone surrogate is archived only when its reader reads it back
- refuted: a resource holding negative zero is archived only when its reader reads it back
- refuted: a resource holding an own __proto__ key is archived only when its reader reads it back
- refuted: a resource holding a Date is archived only when its reader reads it back
- refuted: two rows encoded from one record are archived and read back in the order given

## The api-surface gate reads a local export list

A local export list in a barrel-reachable module was refused by the gate as unsupported. The gate was run with two
lines appended to `packages/audit/src/AuditEntry.ts`, `type GateProbe = string;` and `export type { GateProbe };`,
once before the change and once after. The plant was removed before the commit, and `packages/audit/src` equals
`phase_base`.

Before the change (`node scripts/check-api-surface.mjs`, exit 1):

```
packages/audit/src/AuditEntry.ts:161  [unsupported] this checker only understands declaration-form exports; teach it this form rather than letting it under-report: export type { GateProbe };
```

After the change (exit 1; the name is read and is not yet in `spec/overview.md`):

```
packages/audit/src/AuditEntry.ts  [missing] `GateProbe` is exported by @qadi/audit and is not named in spec/overview.md's Public API surface section. Add it to a table, or to "Not listed above" with a reason.
```

Without the plant the gate prints `api-surface: 940 export(s) documented across 9 package(s)`.

## The row pins without the brand

`declare private readonly nominal: never;` was deleted from `packages/audit/src/AuditEntry.ts`, `pnpm test:tstyche`
was run (exit 1, both passes), and the line was restored (`git diff --quiet -- packages/audit/src` holds).
`packages/audit/test/AuditEntry.tst.ts` has 6 negative `@ts-expect-error` pins, each with a positive twin.

Pass one (`tsconfig.tstyche.json`) and pass two (`tsconfig.test.json`) each reported `Tests: 2 failed`,
`Suppressed: 2 failed, 78 matched, 80 total`, and these four lines:

- `Error: Unused '@ts-expect-error' directive. ts(2578)` at `AuditEntry.tst.ts:45:3`, the spread of an encode-made
  row (`takesRow({ ...encoded, sequenceNumber: 2 })`): without the brand the spread type has `record`,
  `sequenceNumber` and `pipe`, so it is assignable to `AuditEntry` and nothing errors.
- `Error: Unused '@ts-expect-error' directive. ts(2578)` at `AuditEntry.tst.ts:51:3`, the same for a decode-made row.
- `Error: The diagnostic message did not match.` at `AuditEntry.tst.ts:39:23`, the literal
  (`takesRow({ record, sequenceNumber: 1 })`): it still errors, but on `Property 'pipe' is missing ... but required in
  type 'Pipeable'`, which does not contain `nominal`.
- `Error: The diagnostic message did not match.` at `AuditEntry.tst.ts:57:23`, the writer given a plain row, for the
  same reason.

The two value pins (`new Row.AuditEntry(...)`, `Schema.decodeUnknownEffect(Row.AuditEntry)`) kept passing: they
depend on the type-only export, not on the brand. The finding behind the spread pins: the `Data.Class` base alone
refuses a literal (no `pipe`), and only the private `nominal` member refuses a spread of a real row.

## Each new check seen failing once

Each gut was applied to `packages/audit/src`, `pnpm vitest run --project audit` was run over the whole audit
project (exit 1 each time), and the file was restored with `git checkout -- packages/audit/src`
(`git diff --quiet -- packages/audit/src` held after each).

### The `now` guard removed (`AuditArchive.ts`)

The `if (!Number.isFinite(now)) { return yield* Effect.fail(new ArchiveInputInvalid(...)) }` block deleted.
`Tests  6 failed | 570 passed (576)`:

- `AuditArchive.test.ts > archiveAuditTrail > now > a now of NaN, +Infinity or -Infinity is ArchiveInputInvalid`
- `AuditArchive.test.ts > archiveAuditTrail > now > a non-finite now is refused before a sequence break is looked for`
- `ArchiveRoundTrip.test.ts > PROPERTY: every archive the writer returns is read back > refuses a now of NaN, +Infinity or -Infinity as ArchiveInputInvalid`
- `ArchiveWriterInputs.test.ts > a now the type admits > now NaN`, `now positive infinity` and `now negative infinity`
  `... is archived only when its reader reads it back`

### The `keyMaterial` projection removed (`AuditArchive.ts`)

`options?.keyMaterial?.map(({ keyId, algorithm, publicKey }) => ...)` replaced by `options?.keyMaterial`.
`Tests  3 failed | 573 passed (576)`:

- `AuditArchive.test.ts > archiveAuditTrail > keyMaterial > an item with an extra key is written as its three declared fields`
- `ArchiveRoundTrip.test.ts > PROPERTY: every archive the writer returns is read back > fails as the reader reads, or writes a bundle that reads back`
- `ArchiveWriterInputs.test.ts > key material the type admits > a keyMaterial item with an extra key is archived only when its reader reads it back`

### The decode order put back to record-first (`AuditEntry.ts`)

`decodeAuditEntry` made to call `decodeSinkRecordWithJson` on the input's `record` before `decodeRow`.
`Tests  9 failed | 567 passed (576)`, the seven exact-refusal rows of
`AuditEntry.characterisation.test.ts > decodeAuditEntry refuses each kind of stored row` (null, a string, a number, an
array, an empty object, a sequence number and no record, and the both-bad row `a bad record, a bad sequence number
and an extra key`), and two rows of `UntrustedSeams.test.ts` (`no record -> Malformed naming the missing key` and
`A11 5, null and [] -> not an object; {} -> the missing record`).

### The record-domain oracle broken (`AuditEntry.ts`)

The plan named `encodeAuditEntry` writing `sequenceNumber: 0` as this gut. It was run (`<S>/nofail-seq0.log`,
49 failed) and it does **not** fail the record-domain property: a `0` is a safe integer, so a row carrying it
round-trips with equal bytes, and the 49 failures are the sequence-sensitive tests of other files (`ArchiveFacts`,
`ArchiveRoundTrip`'s sequence properties, `ArchiveWriterInputs`). The property closes the record domain, so the gut
that breaks it is an encoder that writes a record its own codec cannot read back: `return new AuditEntry({ record:
{ ...json, at: Number.NaN }, sequenceNumber: undefined })`. `Tests  115 failed | 461 passed (576)`, among them:

- `ArchiveRoundTrip.test.ts > PROPERTY: over any record, the codec refuses it or reads it back > is refused as
  SinkRecordNotEncodable, or read back with its own bytes` (`Property failed after 6 tests`, counterexample
  `[0, {"resource": undefined, "stable": true}]`, shrunk: an `at` of `0` written as `NaN` is `null` in the bytes and
  the codec refuses the row it was handed)
- `ArchiveRoundTrip.test.ts > PROPERTY: every archive the writer returns is read back > fails as the reader reads, or
  writes a bundle that reads back`

### How often the record-domain property reaches each branch

A throwaway copy of the test counted its 500 runs: 278 records refused as `SinkRecordNotEncodable`, 222 read back
(210 with no `Date` and no `undefined` value, so asserted `Equal` to the encoded row; 12 with one, asserted on bytes
and fixed point only), 122 of the 222 with a `resource`. The copy was deleted.
