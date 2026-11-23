# Phase 77: An audit row is a value only its codec makes - Pattern Map

**Mapped:** 2026-11-23
**Analogs found:** all code files matched; a few prose/record files cite earlier-phase rows by id (not re-excerpted).
**Tracked-source gate:** every path below is under `packages/`, `scripts/`, `spec/`, `.changeset/`, `.planning/`; none is a `.gsd` mirror.

## File Classification

| File | Role | Data flow | Closest analog | Match |
|---|---|---|---|---|
| `packages/audit/src/AuditEntry.ts` | model + codec | transform (untrusted decode) | `packages/core/src/Admission.ts:87-92` (nominal), `packages/core/src/SinkCodec.ts:590-651` (envelope-first) | exact |
| `packages/audit/src/ArchiveFacts.ts` | utility | transform | self (delete `isSequenceNumber`, `invalidSequenceNumber`) | n/a |
| `packages/audit/src/AuditArchive.ts` | service/writer | batch, request-response | self; `RetentionInputInvalid` for the new error | role |
| `packages/audit/src/Retention.ts` | utility | transform | self (drop `undated`; D-14 re-measure) | n/a |
| `packages/audit/src/SequenceIntegrity.ts` | utility | transform | self (re-export list shrinks) | n/a |
| `packages/audit/src/AuditStagingPortTest.ts` | test double | event-driven | self; only type-imports `AuditEntry` (lines 14, 48, 58, 60), so likely no edit | n/a |
| `packages/audit/test/AuditEntry.tst.ts` (new) | type test | n/a | `packages/core/test/PolicyArity.tst.ts` | exact |
| `packages/audit/test/helpers.ts` (add `numbered`) | test helper | transform | `entryAt` in `Retention.test.ts:14-15` | role |
| record-domain property | test | property | `ArchiveRoundTrip.test.ts:259-309` | exact |
| `77-mutation.mjs` / `77-mutation-base.json` | script | batch | `.planning/milestones/v1.8-phases/QD-72-.../72-mutation.mjs` | exact |
| spec, changeset, prose | docs | n/a | ADR-QD-170 / CCR-QD-448; ADR-QD-110 | exact |

## Pattern Assignments

### `AuditEntry.ts` — nominal class (D-01)

Analog `packages/core/src/Admission.ts:87-97`:
```ts
export class Admitted<Source extends RowSource = RowSource> {
  /** Makes the type nominal ... Declared only: it has no slot at run time. */
  declare private readonly nominal: never;
  private constructor(
```
Same-package precedent `packages/audit/src/AuditArchive.ts:186-239`: `class VerifiedArchiveImpl {...}` and `export type VerifiedArchive = VerifiedArchiveImpl;` (fallback only, per D-01). Its `holds()` uses `MutableHashMap.get(this.#counts, entry)`, which needs the row to be `Equal`/`Hash` structural, hence `Data.Class`. `StoredRecord extends Data.Class<…>` is at `packages/core/src/DecisionRecord.ts:122-146` (read at plan time; not excerpted).

Target shape:
```ts
class AuditEntry extends Data.Class<{ readonly record: SinkRecordJson; readonly sequenceNumber: number | undefined }> {
  declare private readonly nominal: never;
}
export type { AuditEntry };
```
Module-local `Data` import is `import * as Data from "effect/Data"` (AGENTS §1). Doc comment: one-line summary first, ADR citations after.

Current code to replace (`AuditEntry.ts`):
- :56 `const SequenceNumber = Schema.optional(Schema.Int)` stays, the one place the safe-integer rule lives (D-04).
- :80-84 `export const AuditEntry = Schema.Struct(...)` and `export type AuditEntry = typeof AuditEntry.Type`: remove the value (D-02).
- :106 `const entry: AuditEntry = { record: json, sequenceNumber: undefined };` becomes `new AuditEntry({ record: json, sequenceNumber: undefined })`. Keep both keys present (the spec needs key-present rows so encode- and decode-made rows are `Equal`).
- :157 `const entry: AuditEntry = { record: decoded.success.json, sequenceNumber: row.success.sequenceNumber };` becomes `new AuditEntry({...})`.

### `AuditEntry.ts` — envelope-first decode (D-06)

Analog `packages/core/src/SinkCodec.ts:597,608-651`:
```ts
const storedWire = untrustedDecoder(StoredEnvelopeWire, { unknownKeys: "ignore", unwalked: ["record"] });
const fromEnvelope = (read: Result.Result<typeof StoredEnvelopeWire.Type, UntrustedRefusal>) =>
  Result.isFailure(read)
    ? notDecodable(decodeRefusalOf(read.failure))
    : Result.map(decodeSinkRecord(read.success.record), (record) => new StoredRecord({ ... }));
export const decodeStoredRecord = (input: unknown) => fromEnvelope(storedWire.decode(input));
```
Apply to `AuditEntry.ts:117-120` (`decodeRow` already exists, with `unknownKeys: "refuse"`; keep it, D-07) and :149-159. Run `decodeRow(input)` first. On failure return `Result.fail(new SinkRecordNotDecodable({ refusal: decodeRefusalOf(row.failure) }))`, the same line as today's :156. Then run `decodeSinkRecordWithJson(row.success.record)`. Delete :152 (the `Predicate.hasProperty` pre-check), the `malformed` helper at :122-123, and the `effect/Predicate` import if nothing else uses it. No `Schema.decode*`, `JSON.parse`, `onExcessProperty` or `exceedsJsonDepth` token may be added, so `UNTRUSTED_DECODE_BUDGET` stays put.

### `AuditArchive.ts` — `ArchiveInputInvalid` (D-09)

Analog `packages/audit/src/Retention.ts:35-38`:
```ts
export class RetentionInputInvalid extends Data.TaggedError("RetentionInputInvalid")<{
  readonly field: "now" | "maxAgeMs";
  readonly value: number;
}> {}
```
New: `ArchiveInputInvalid` with `readonly field: "now"; readonly value: number`. Plain unprefixed tag, `Data.TaggedError` (AGENTS §4, not on the Schema.TaggedError budget). Check `Number.isFinite(now)` first, before the sequence facts. `keyMaterial` is mapped to a fresh `{ keyId, algorithm, publicKey }` per item (D-10). A `spec/overview.md` row is required (gate 13), plus a barrel export.

### `Retention.ts` — drop `undated` (D-05)

`RetentionInputInvalid` and the `now`/`maxAgeMs` refusals stay. Remove the `undated` branch and the `undated` field on `RetentionPlan` and `PurgePlan`. The D-14 claim "about 25 µs measured" is at `Retention.ts:127`.

### `ArchiveFacts.ts`, `SequenceIntegrity.ts`

Remove `isSequenceNumber`, the `invalidSequenceNumber` fact, and the first failure of `verifiedArchiveFacts`. Remove the public `SequenceNumberInvalid`. `SequenceIntegrity.ts` re-exports two names after this. The doc at `AuditEntry.ts:48-55` cites `SequenceNumberInvalid` and must be reworded.

### `AuditEntry.tst.ts` (new) — pins (D-11)

Analog `packages/core/test/PolicyArity.tst.ts`. Header idiom, lines 1-13: "Every negative is a `@ts-expect-error` on a line holding exactly one erroring expression... checked twice (TS2578 under typecheck; `checkSuppressedErrors` fragment under tstyche)".
```ts
import { expect, test } from "tstyche";
...
test("moving Not to Many with its arm unchanged is refused (the tuple direction)", () => {
  // @ts-expect-error is not assignable to type 'never'
  const arm: ChildArms<Policy, Moved<"Not", "Many">>["Not"] = (p) => [p.policy];
  expect(arm).type.toBe<ChildArms<Policy, Moved<"Not", "Many">>["Not"]>();
});
```
Negative+positive twin (lines 162-164): `// @ts-expect-error is not assignable to type 'never'` then `const literal: ChildrenOf<"Many", Policy> = [a, b];` and `expect(literal).type.toBe<...>()`. Use the fragment `nominal` for the row negatives (D-11). Each negative needs a positive twin: `encodeAuditEntry` success, `decodeAuditEntry`'s `entry`, and `archiveAuditTrail`/`planRetention`/`planPurge` accepting it. Do not use `not.toBeCallableWith`; if one is added, the budget moves too (see Shared Patterns).

### Record-domain and whole-archive properties (D-08)

Analog `packages/audit/test/ArchiveRoundTrip.test.ts:259-309`. Shape:
```ts
describe("PROPERTY: ...", () => {
  const anyNumber = FastCheck.oneof(FastCheck.integer({ min: 0, max: 4 }), FastCheck.double(), FastCheck.constantFrom(2 ** 53, ..., Number.NaN, 0.5, 1.5));
  const maybeNumbered = FastCheck.array(FastCheck.option(anyNumber, { nil: undefined }), { maxLength: 8 });
  it("...", () => { FastCheck.assert(FastCheck.property(maybeNumbered, (numbers) => {
    ... Effect.runSync(Effect.result(archiveAuditTrail(entries, 0))) ... }));
```
Today lines ~284-305 spread `{ ...entry, sequenceNumber }` and assert `SequenceNumberInvalid` on the writer. This moves to the reader: `decodeAuditEntry({ record, sequenceNumber: n })` refuses non-safe `n` as `Malformed`. Non-finite domain draw: `Retention.test.ts:272,309` use `FastCheck.constantFrom(NaN, +Inf, -Inf)`.
No reusable `SinkRecord` or `Policy` arbitrary exists. The only exported arbitrary in the tree is `arbitraryRoleGraph` (`packages/core/test/RoleGraphArbitrary.ts:41`), and it is a different domain. Build the record generator in the test file by varying `decisionRecord({ at, resource, ... })` from `packages/audit/test/helpers.ts:25-40` (it already takes `evaluationId`, `at`, `subjectId`, `policy`, `resource`). Do not put it in shared helpers (CONTEXT discretion).

### `numbered` helper (D-03)
Shape: `decodeAuditEntry({ ...JSON.parse(JSON.stringify(entry)), sequenceNumber: n })` returning `.entry`, with a `Result.isFailure` branch that calls `assert.fail`, no `as`, no `!`. The same flow is at `AuditEntry.test.ts:249`. `helpers.ts` holds the SinkRecord builders (`decisionRecord`, `read`, `readPolicy`, `allowTrace`).

### Mutation baseline (D-13)
Analog `.planning/milestones/v1.8-phases/QD-72-a-derived-store-behind-the-dock-model-s-stores/72-mutation.mjs` (also `70-mutation.mjs`). Copy and re-point:
```js
const D = ".planning/phases/QD-72-.../";
const R = "packages/devtools/src/model/";
const GROUPS = { model: { config: "stryker.devtools.mjs", report: "reports/mutation-devtools/mutation.json", files: [`${R}DockModel.ts`] }, ... };
const invocation = (group) => `pnpm exec stryker run ${GROUPS[group].config} --mutate ${GROUPS[group].files.join(",")}`;
```
Run (header lines 13-14): `node .planning/phases/QD-77-.../77-mutation.mjs record base <group>` from the repo root on a clean tree, after the invocation. Subcommands: `record base|close <group> [--restart]`, `compare`, `--self-test`; the base is never restarted. For 77: config `stryker.audit.mjs` (report `reports/mutation-audit/mutation.json`, jsonReporter), groups are the four files `AuditEntry.ts`, `ArchiveFacts.ts`, `AuditArchive.ts`, `Retention.ts` under `packages/audit/src/`. Rule: a score that fell only because killed mutants were deleted passes; a new open (Survived, NoCoverage) or Ignored mutant never does. Output `77-mutation-base.json`. Check that `stryker.audit.mjs`'s `mutate:` list (line ~30 onward) includes all four files before baselining.

### Records (D-12)
- New ADR file: `spec/decisions/190-an-audit-row-is-a-value-only-its-codec-makes.md`. Model on `170-an-envelope-states-its-unknown-key-policy-at-its-decoder.md` and `110-an-archives-facts-are-computed-once.md`. 110's tail has the sections "## Alternatives considered" (bold rejected options) and "## See also" (links to ADR/BEH/INV). The header is a `> | Revision | 1.0 |` table. Read ADR-170's header in full when writing.
- `spec/decisions/index.yaml` entry (last 3 lines of the pattern at lines 529-532):
```yaml
  - id: "ADR-QD-190"
    file: "190-an-audit-row-is-a-value-only-its-codec-makes.md"
    title: "An audit row is a value only its codec makes"
    status: "Accepted — amends ADR-QD-110, ADR-QD-056; applies ADR-QD-170"
```
  Amended entries append `; amended 2026-11-23 (...)` to the status (see ADR-QD-170's own entry).
- CCR row: `spec/README.md:385` is the CCR-QD-448 row (`| CCR-QD-448 | 2026-11-19 | \`spec/decisions/170-...md\` Rev 1.0 (new: ADR-QD-170) and \`spec/decisions/index.yaml\`, ... Rev 1.6 (amendment), ...`). The change-history line is in the header table at line 13 (the latest is 1.348, so add 1.349). CCR-QD-469 must name any reserved-but-unused id.
- ADR amendments: dated, with a revision bump (`Rev 1.x`). Edit 110 (retire `SequenceNumberInvalid` and `invalidSequenceNumber`) and 056 (`undated` ~:215, `SequenceNumberInvalid` ~:426, schema note ~:315).
- Changeset `.changeset/audit-row-made-only-by-its-codec.md`. Frontmatter is `"@qadi/audit": minor`. The body starts `**Breaking.**` (the pattern is `.changeset/audit-options-refused-when-built.md` / `audit-refusal-is-cores.md`; the Breaking example is `"@qadi/core": minor` then a `**Breaking.** ...` paragraph). Non-breaking audit example: `audit-entry-decoded-once.md` is a `patch`.

## Shared Patterns

### House-style budgets (`scripts/check-house-style.mjs`)
- `UNTRUSTED_DECODE_BUDGET` (:656-666) must not move. Its shape: `"packages/core/src/SinkCodec.ts": 1,` with a comment per row. `AuditEntry.ts` has no row and must gain no token.
- `NOT_CALLABLE_PIN_BUDGET` (:750) shape: `"packages/audit/test/Retention.tst.ts": { callable: 3, constructable: 0 },`. Existing audit rows: `AuditPortReply.tst.ts` 2/0, `AuditWriteOutcome.tst.ts` 3/0, `Retention.tst.ts` 3/0. It moves only together with the AGENTS.md §6 table and `[not-callable-pin-table]`. The new `AuditEntry.tst.ts` needs no row if it uses only `@ts-expect-error`.
- `[not-callable-control]`: a file with a negative pin needs a same-form, same-subject positive twin, and may not use `.skip`, `.only` or `.todo`.
- Imports are `import * as X from "effect/X"` (AGENTS §1); relative imports carry `.ts`; `import type` is mandatory. `@qadi/core` imports are named.

### Test churn (`packages/audit/test`, all of which need re-pointing at `numbered` or `decodeAuditEntry`)
Object literal or spread builders (type errors after the brand):
- `ArchiveFacts.test.ts:15` `entryAt` returns a literal `AuditEntry`; :177, :181 (`sequenceNumber: 2.5`, `-(2**53)`) test the removed fact; :175,:179 assert `.invalidSequenceNumber` (delete).
- `SequenceIntegrity.test.ts:9` `entryWithSequence` literal; 4 `SequenceNumberInvalid` or `undated` hits in the file.
- `Retention.test.ts:20` `entryWithAt` spread with a changed `at` (non-finite domain moves to the record-domain property); :198, :206-207, :215, :225, :252-253 spreads; :199 `edited: AuditEntry = {...}`; :207 `renumbered`; :215 `second: AuditEntry = { ...first }`. 8 `undated`/`SequenceNumberInvalid` hits.
- `AuditArchive.test.ts:14-15, 43-44, 64-66, 98, 115, 147, 161, 188-190, 213` `{ ...a, sequenceNumber: n }`; :283 `{ record: { not: "a record" }, sequenceNumber: 2 }` (a deliberately bad row; hold as `unknown` JSON, not an `AuditEntry`).
- `ArchiveRoundTrip.test.ts:53` (spread into the pool) and :236, :285 (property spreads); 2 `SequenceNumberInvalid` hits (the property at :263-305).
- `AuditEntryDifferential.test.ts:97` `entryOf({ record: ..., sequenceNumber: undefined })` (check what `entryOf` builds); :99 `deepStrictEqual(Object.keys(entry), ["record","sequenceNumber"])` stays valid (class instance keeps both keys).
- `AuditEntry.test.ts:249, :257, :306` spread into `decodeAuditEntry` input (JSON-shaped inputs, fine); :287 `decodeAuditEntry({ sequenceNumber: 1 })` pins the "no record" message (changes under D-06); :310-320 and :358 use `Schema.decodeUnknownEffect(AuditEntry)` (delete or re-point); the `Schema` import there may go.
- `UntrustedSeams.test.ts:142, :227` pin `"an audit row has no record"` (A11/A12; rows move under D-06); :47 `rowWithRecord` and :153-235 spreads over `row(0)` are `unknown` JSON, fine.
- `UnwrittenRow.test.ts:17`, `AuditWriteOutcome.test.ts:14`: `encodeAuditEntry(...)` results, fine.

`deepStrictEqual` or `toStrictEqual` against a row array or object (prototype now differs, so compare with a decoded or encoded row, or `Equal.equals`, not a plain object):
- `AuditArchive.test.ts:24` (`archive.entries` vs `entries`: both instances once built through the codec; ok) and :244 (keyMaterial, plain, fine).
- `Retention.test.ts:69, :75, :176` (`retained`/`retain` vs `entries`: instances on both sides; check that the entries come through the codec).
- `AuditTrailPortTest.test.ts:21, :34`, `AuditStagingPortTest.test.ts:87, :109`, `AuditPortReply.test.ts:40, :41, :50, :68, :112, :168`: compare to `[entry]` built by `encodeAuditEntry`; instance vs instance, fine. Verify chai-like `deepStrictEqual` accepts `Data.Class` instances (same prototype, so it should).
- `AuditEntryDifferential.test.ts:71, :89, :98-99` only `Object.keys`, fine.
- `AuditEntry.test.ts:238` compares `result.success.record` (a `SinkRecord`), unaffected.

No `AuditEntry` literals live in `*.tst.ts` (grep for `sequenceNumber|record:` in `*.tst.ts` was empty). The type-test files named in CONTEXT (`Retention.tst.ts`, `AuditArchive.tst.ts`, `AuditPortReply.tst.ts`, `AuditWriteOutcome.tst.ts`, `AuditRefusal.tst.ts`) need a read to confirm how they obtain rows. Their pin counts are budgeted.

## No Analog Found
None. The one gap: no reusable `SinkRecord` arbitrary exists, so the record-domain property builds its own generator (see above).

## Metadata
**Analog search scope:** `packages/audit/{src,test}`, `packages/core/{src,test}`, `scripts/check-house-style.mjs`, `spec/decisions`, `.changeset`, `.planning/milestones/v1.8-phases`.
**Not done:** `spec/behaviors/33-audit-pipeline.md`, `spec/invariants.md`, `spec/traceability.md` and website docs row shapes were not excerpted (restate in place from the existing text); `DecisionRecord.ts:122-146` not re-read.
