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
