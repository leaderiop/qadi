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
