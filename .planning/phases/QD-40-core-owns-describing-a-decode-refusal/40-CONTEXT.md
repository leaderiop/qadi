# Phase 40: Core owns describing a decode refusal - Context

**Gathered:** 2026-11-14
**Status:** Ready for planning

<domain>
## Phase Boundary

Core owns describing a decode refusal, the mirror of ADR-QD-116's encode side. Core exports a total `describeDecodeRefusal`,
a tag-only annotations helper and the one `UntrustedValueRefusal` → `DecodeRefusal` mapping. Devtools passes `DecodeRefusal`
through (`reasonOf` and `MalformedReason` deleted, `onMalformed` receives the refusal). Audit decodes a row's record once,
taking its JSON form from core's strict decode (`recordJsonOf` and audit's mapping deleted, one `UNTRUSTED_DECODE_BUDGET` row
retired). This is the milestone's one Breaking change (`@qadi/devtools`).

Records:
- ARCH-87, ADR-QD-153 and CCR-QD-431.
- BEH-QD-536..540 and INV-QD-325..326 are reserved; use them only for statements nothing already covers.
- Changesets: `@qadi/core` minor, `@qadi/devtools` **Breaking**, `@qadi/audit` patch.
- The AGENTS.md §7a table and `UNTRUSTED_DECODE_BUDGET` change together.

Requirements: DREF-01 to DREF-07, plus the WX cross-cutting rows.

Read first:
- `.planning/phases/_SHARED-CONTEXT.md`
- `.planning/phases/_WAVE9-CONTEXT.md` (Phase 40 evidence)
- `.planning/research/SUMMARY.md` (the Phase 40 audit single-decode and reporter settlements, and the Phase 40 roadmap row)

</domain>

<decisions>
## Implementation Decisions

### Settled by research (not re-asked)
- **D-01: Audit gets the JSON form from core's strict decode, never by re-encoding.** Re-encoding can fail with `SinkRecordNotEncodable` on a read path, normalises differently, and could change what `Retention`'s `MutableHashMap<AuditEntry>` counts.
- **D-02: Core gets no reporter.** There is one consumer, and devtools keeps its `Effect.logWarning` adapter with `qadi.frame`.
- **D-03: Core's rows in `UNTRUSTED_DECODE_BUDGET` do not move.** Exactly one budget row goes away, for `AuditEntry.ts`. The new core export adds no counted `Schema.decode*` / `JSON.parse` token.
- **D-04: Plan shape, binding:**
  1. the compatibility decision first, with a table pin of the five words on the base and the mutation base;
  2. then the describer and annotations in core;
  3. then devtools;
  4. then audit, with the differential rows;
  5. then the one budget row that goes away, with AGENTS.md §7a, `[untrusted-decode-table]` and `[untrusted-decode-names]` in the same task;
  6. the break recorded in every place DREF-07 lists, plus `surface.tst.ts`, `Source.tst.ts` and `spec/behaviors/26-decision-stream.md`;
  7. run `pnpm spec:website-examples` explicitly.

### The Breaking surface in devtools (accepted 2026-11-14)
- **D-05:** `onMalformed(frame, refusal: DecodeRefusal)`: the callback receives core's own refusal value, passed through. Devtools stops renaming it.
- **D-06:** The default warning, used when no callback is given, is annotated by core's tag-only helper plus devtools' `qadi.frame`.
  - The helper sets `qadi.refusal`: the refusal's `_tag`, under the same key the encode side uses.
  - `qadi.reason` goes away.
  - This is DREF-01's compatibility decision. Record it in ADR-QD-153 before any code.
- **D-07:** `MalformedReason` and `reasonOf` are deleted outright, with no deprecated alias. The `@qadi/devtools` changeset is **Breaking** and carries the five-word upgrade map:
  - `not-json` → `NotJson`
  - `too-deep` → `TooDeep`
  - `not-a-record` → `Malformed`
  - `unsupported-version` → `UnsupportedVersion`
  - `inconsistent` → `Inconsistent`

  The map notes that `not-a-record` collapses into `Malformed`. A table pin of the five words is written on the base first.

### Core's describer (accepted 2026-11-14)
- **D-08: Placement.** `describeDecodeRefusal`, the annotations helper and the `UntrustedValueRefusal` → `DecodeRefusal` mapping live beside `DecodeRefusal`, in core's sink-wire vocabulary (`SinkWire.ts`).
  - If the import graph forbids the mapping there (`SinkWire.ts` is a leaf, ADR-QD-037), it goes in the nearest module that may import both. The planner states where and why.
  - The mapping is exported, because audit's row decode needs it.
  - `SinkCodec.ts`'s private `asDecodeRefusal` reads through the one mapping, and the duplicate in `AuditEntry.ts` is deleted.
- **D-09: What the sentence says.** `describeDecodeRefusal` is total, built once at module scope with `Match.tagsExhaustive`. It names the reason and its fix.
  - It may include `Malformed.message` and the `supported` versions.
  - It shows `UnsupportedVersion.version` (an `unknown`) only through a bounded, safe description, never raw.
  - It never throws, whatever the version or message is.
  - A new `DecodeRefusal` member is a compile error in core only.
- **D-10: The annotations helper carries exactly one key, `qadi.refusal`.** It never includes `Malformed.message` or `UnsupportedVersion.version`. A sentinel-value test proves this (INV-QD-104).

### Audit decodes once (accepted 2026-11-14)
- **D-11: A new core export returns `{ record, json: SinkRecordJson }` from the one strict decode.**
  - `json` is the decode's already-validated JSON form, with unknown envelope keys absent.
  - `decodeSinkRecord` reads through the same path.
  - No `as`; at most one narrow checked step to type the JSON form.
  - Minor export, named in `spec/overview.md`.
  - The planner names it, consistently with `decodeSinkRecord`/`decodeStoredRecord`.
- **D-12: Proof is a differential over existing audit fixtures.** It covers:
  - an unknown envelope key, still dropped;
  - a key-order permutation;
  - `undefined` fields;
  - a float;
  - a 60,000-deep record, still `TooDeep`.

  `AuditEntry` output is identical to the base on every row. `Retention` is untouched. ADR-QD-110 (audit facts computed once) is cited.
- **D-13: Deleted together.** `recordJsonOf` and audit's `asDecodeRefusal` are deleted. In the same task, the `AuditEntry.ts` row leaves `UNTRUSTED_DECODE_BUDGET`, its `_NAMES` entry and the AGENTS.md §7a table.

### Proof and records
- **D-14: The mutation baseline is committed alone, first, on the phase base.** It covers the touched source files (core `SinkWire.ts`/`SinkCodec.ts`, devtools `Source.ts`, audit `AuditEntry.ts`) with each package's own Stryker config and the exact invocation the close will use. A drop is fixed with a test, never re-baselined.
- **D-15: Reserved numbers only.** ADR-QD-153, CCR-QD-431, BEH-QD-536..540, INV-QD-325..326. Confirm each is free by grep, never run `node scripts/next-id.mjs`, and name unused numbers in the CCR row.
- **D-16: The break is recorded wherever a consumer reads it.** That means:
  - the devtools Breaking changeset with the upgrade map;
  - `upgrading.md`;
  - the devtools README;
  - the website devtools page;
  - the Next.js example's `Dock.tsx`;
  - the `DecisionStreamRoute.ts:32` comment;
  - BEH-QD-204;
  - `spec/behaviors/26-decision-stream.md`;
  - the overview rows;
  - `surface.tst.ts` and `Source.tst.ts`.

### Claude's Discretion
- The new export's exact name, and the annotations helper's name (mirror `encodeRefusalAnnotations`, e.g. `decodeRefusalAnnotations`).
- The bounded description used for an `unknown` version: its length cap and its form.
- How the plans split, within D-04's order (granularity is `fine`).

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- The encode side, which this phase mirrors:
  - `packages/core/src/JsonRefusal.ts:143` `describeEncodeRefusal`: module-scope `Match.type<EncodeRefusal>().pipe(Match.tagsExhaustive(...))`;
  - `:123` `encodeRefusalAnnotations`, with its `EncodeRefusalAnnotations` type: `qadi.refusal`, `qadi.path`, `evaluationId`, and never a value (INV-QD-104);
  - `EncodeRefusalReport.ts`, the reporter, which has no decode counterpart (D-02).
- `packages/core/src/SinkWire.ts:95-104` `DecodeRefusal`: a `Data.TaggedEnum` with `NotJson`, `TooDeep{maxDepth}`, `Malformed{message}`, `Inconsistent{disagreement}` and `UnsupportedVersion{version: unknown, supported}`.

### Established Patterns
- `SinkCodec.ts:496` is a private `asDecodeRefusal(UntrustedRefusal | UnsupportedVersion)`. `AuditEntry.ts:159-164` repeats the `UntrustedValueRefusal` half of it; that is the third restatement.
- `SinkCodec.ts:524` `decodeSinkRecord` and `:532` `decodeSinkRecordString` go through `sinkWire.decode` / `decodeText`.
- `StoredRecordJson` / `decodeStoredRecord(String)` are the envelope readers. `decodeStoredRecordString` holds the counted `JSON.parse` (budget row 1).
- `AuditEntry.ts:193-209` `decodeAuditEntry` runs these steps:
  1. `decodeSinkRecord(input.record)`;
  2. `decodeRow` (untrusted, with `record` unwalked);
  3. `recordJsonOf(input.record)`, the lenient second decode (budget row 1 for `AuditEntry.ts`).

### Integration Points
- Devtools `packages/devtools/src/model/Source.ts`:
  - `:126` `onMalformed` option;
  - `:220` `reasonOf`;
  - `:241` `decodeFrame`;
  - `:273` `MalformedReason`;
  - `:281-291` `malformed`, which annotates `qadi.frame` + `qadi.reason`.
- `packages/devtools/src/index.ts:116` exports `MalformedReason`.
- `examples/nextjs-newsroom/src/client/Dock.tsx:73` uses `onMalformed: (frame, reason) => …`.
- `packages/http/src/DecisionStreamRoute.ts:32`'s comment names `not-a-record`.
- `scripts/check-house-style.mjs` `UNTRUSTED_DECODE_BUDGET` and `_NAMES`, with AGENTS.md §7a (the table lists `AuditEntry.ts` at 1).

</code_context>

<specifics>
## Specific Ideas

- The user accepted every recommended answer in all three areas.
- Phase 38's and 39's proof shape is the model: baseline committed alone first, a green-on-base characterisation (here the five-word table pin and the audit differential), then the change.
- The cleanest design wins and a Breaking change is not a cost (memory: prefer complete over simple; compatibility is never the tiebreaker).

</specifics>

<deferred>
## Deferred Ideas

None. Discussion stayed within phase scope.

</deferred>
