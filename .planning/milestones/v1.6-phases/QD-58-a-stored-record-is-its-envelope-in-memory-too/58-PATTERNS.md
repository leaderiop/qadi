# Phase 58: A stored record is its envelope in memory too - Pattern Map

**Mapped:** 2026-11-19
**Files analyzed:** 24 (4 src code, ~7 src doc-only, ~13 test/gate/record artefacts)
**Analogs found:** 24 / 24 (the phase is a deletion plus one class; nearly every pattern is the file's own current code or a Phase 57 artefact)

All analog paths below were checked as git-tracked (`git ls-files`) where they are non-source; every source path is under `packages/`, `scripts/`, `.changeset/` or `.planning/phases/`, none under a `.gsd` mirror.

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `packages/core/src/DecisionRecord.ts` (add `StoredRecord` class and `sinkRecordOrder`; delete 4 exports and the `Match` import) | model | transform | `packages/core/src/DecisionHistory.ts:274` (`extends Data.Class<...>`), and its own `storedRecordOrder` body (`:205-210`) | exact |
| `packages/core/src/DecisionLog.ts` (`:38-39` import, `:237` construct, delete `isolate` `:180-185` and its 2 call sites) | service | event-driven | itself (`:237`); research Pattern 5 | exact |
| `packages/core/src/SinkCodec.ts` (`:63-64` imports, `:577`, `:616`, docs `:608-610`, `:642-643`) | codec | transform | itself; Phase 57's `fromEnvelope` | exact |
| `packages/core/src/DecisionStream.ts`, `AttributeResolver.ts:51` | service/doc | streaming | none to copy (type-neutral, doc only) | n/a |
| `packages/devtools/src/model/Timeline.ts` (`ingest`, `ingestDecision`, `ingestObligations`, `sameSlot`/`sameEvaluation`, `isAfter`) | model | transform | itself; research Pattern 6 and `recordOf` | exact |
| `packages/devtools/src/model/Source.ts`, `TimelineStore.ts` | model | streaming | none (docs `:106`, `:225-227`; optional param rename) | n/a |
| `packages/http/src/DecisionLogHttp.ts`, `DecisionBacklogRoute.ts`, `DecisionStreamRoute.ts` | controller | request-response | none (doc only) | n/a |
| `packages/audit/src/AuditArchive.ts:102` | doc | n/a | none (rename `storedRecordOrder` to `sinkRecordOrder` in a comment) | n/a |
| `packages/core/test/DecisionRecord.test.ts` (order grid rebuilt on `SinkRecord`s) | test | transform | its own grid `:20-58`; `ObligationRecord` as the cheapest builder | role-match |
| `packages/core/test/SinkCodec.test.ts` (builders `:2100-2133`, `:2148-2182`; goldens) | test | transform | itself, `:2111` describe | exact |
| `packages/core/test/{DecisionLog,DecisionSinkForwarding,DecisionStream,EvaluationEnvironment}.test.ts` | test | event-driven | themselves | exact |
| `packages/core/test/DecisionSink.tst.ts:70-76` | test (tstyche) | transform | itself | exact |
| `packages/core/test/ShippedSinkReports.test.ts` (delete C4 `:129-147`) | test | event-driven | itself | exact |
| `packages/devtools/test/helpers.ts` (`:107`, `:150` builders) | test helper | transform | itself; precedent "test-builder helper" | exact |
| `packages/devtools/test/model/Source.test.ts` (27 flat reads) | test | streaming | itself | exact |
| `packages/http/test/{decisionStream,DecisionLogHttp,decisionBacklog}.test.ts` | test | request-response | themselves (`stored` builders `:141`, `:56`, `:110`) | exact |
| `packages/react/test/QadiAtoms.test.ts:572`, `packages/testing/test/QadiReviewLayer.test.ts:56` | test | transform | themselves (flat `_tag` read) | exact |
| `features/features/{decision-log,merged-sources,devtools*}/*.steps.test.ts` | test (BDD) | event-driven | themselves | exact |
| `scripts/check-package-install.mjs:419, :487` | gate script | transform | itself (template literal) | exact |
| `.planning/phases/QD-58-.../58-mutation.mjs` (new) | script | batch | `.planning/phases/QD-57-untrusteddecoder-states-the-envelope-s-unknown-key-policy/57-mutation.mjs` | exact |
| ADR-QD-171, CCR-QD-449, BEH-QD-626..630, INV-QD-361..362, `spec/overview.md`, traceability | records | n/a | Phase 57's 57-08/09/10 plans, `spec/decisions/169-...md` shape | exact |
| three `.changeset/*.md` (core, http, devtools) | config | n/a | `.changeset/devtools-malformed-frame-is-a-decode-refusal.md` | exact |
| `apps/website/src/content/.../upgrading.md` (0.13 section) | doc | n/a | the last 0.13 section (`:926`) | exact |

## Pattern Assignments

### `packages/core/src/DecisionRecord.ts` (model, transform)

**Analog for the class:** `packages/core/src/DecisionHistory.ts:274` and `RelationshipResolver.ts:381`, both `export class X extends Data.Class<Input> {}`. The precedent for a plain (untagged) `Data.Class` in core.

**Delete** (current lines, read this session): `Stamped` (`:112-125`; its doc moves onto the new field), `StoredDecisionRecord`, `StoredObligationRecord`, the `StoredRecord` union type (`:145-153`), `stampRecordMatch` and `stampRecord` (`:155-190`), and the now-unused `Match` import. `SinkRecord` (`:109`) stays.

**New class** (spike-verified in research, Pattern 1):
```ts
export class StoredRecord extends Data.Class<{
  /** (the `Stamped.environment` doc moves here verbatim: a label, not an input, so a plain `string`) */
  readonly environment: string;
  /** What core reported, unchanged, kept by reference. */
  readonly record: SinkRecord;
}> {}
```
Doc-comment shape per AGENTS.md: one-line summary first ("A record as this sink stores it: the producer's label and what core reported."), then the why (ADR-QD-097 D-11-e now true in memory, ADR-QD-171).

**Orders** (move today's body at `:205-210` unchanged into `sinkRecordOrder`, declared BEFORE `storedRecordOrder`, which is a module-scope initialiser):
```ts
export const sinkRecordOrder: Order.Order<SinkRecord> = Order.make((a, b) => {
  const aUnknown = Number.isNaN(a.at);
  const bUnknown = Number.isNaN(b.at);
  if (aUnknown || bUnknown) return aUnknown === bUnknown ? 0 : aUnknown ? 1 : -1;
  return a.at < b.at ? -1 : a.at > b.at ? 1 : 0;
});
export const storedRecordOrder: Order.Order<StoredRecord> =
  Order.mapInput(sinkRecordOrder, (s: StoredRecord) => s.record);
```
Keep the INV-QD-039 doc block (`:192-204`), updating its "devtools' `compareByAt` / `isAfter`" history sentence only if it becomes false. Imports are already `import * as Order from "effect/Order"` and `import * as Data from "effect/Data"`.

---

### `packages/core/src/DecisionLog.ts` (service, event-driven)

**Imports** (current `:38-39`) become:
```ts
import { StoredRecord, storedRecordOrder } from "./DecisionRecord.ts";
import type { SinkRecord } from "./DecisionRecord.ts";
```
(`StoredRecord` is now a value import because `new` is used. `verbatimModuleSyntax`.)

**Construct** (current `:237`, replace the `stampRecord` call):
```ts
const entry: LogEntry = { cursor: { epoch, seq }, record: new StoredRecord({ environment, record }) };
```
`byRecord` (`:160`) and the snapshot sort are type-compatible, no edit.

**D-12 deletion:** delete the `isolate` helper (`:180-185`, with its doc block above it that says "these catches stay") and both call sites (`isolate("append")` around `append`, `isolate("publish")` inside it; `:251-268` region). Keep the doc for the surrounding function but remove the sentences saying the halves are caught. A defect now propagates to the sink emitter (`SinkEmit.ts`, ADR-QD-159). The excerpt being deleted:
```ts
const isolate = (half: "append" | "publish") =>
  Effect.catchCause((cause) =>
    Effect.logWarning(`qadi: a decision log's ${half} half failed`).pipe(
      Effect.annotateLogs({ "qadi.cause": String(cause) }),
    ),
  );
```
Check that `Effect.catchCause`, `Effect.logWarning` and `Effect.annotateLogs` remain used elsewhere in the file; drop an import only if unused.

---

### `packages/core/src/SinkCodec.ts` (codec, transform)

**Imports** (`:63-64`): `StoredRecord` moves from `import type` to the value import; drop `stampRecord`:
```ts
import type { DecisionOutcome, SinkRecord } from "./DecisionRecord.ts";
import { Decided, DecisionRecord, Failed, ObligationRecord, StoredRecord } from "./DecisionRecord.ts";
```
**Encode** (`:574-577`): `encodeSinkRecord(stored)` becomes `encodeSinkRecord(stored.record)`; the `.map(... => ({ environment: stored.environment, record }))` stays.
**Decode** (`:611-616`, `fromEnvelope`): replace only the last arm:
```ts
Result.map(decodeSinkRecord(read.success.record), (record) =>
  new StoredRecord({ environment: read.success.environment, record }));
```
Rewrite the docs at `:608-610` ("The one isolated `stampRecord` call") and `:642-643` ("rebuilt and stamped here, with `stampRecord`"). No decode token is added, so `UNTRUSTED_DECODE_BUDGET` does not move. Phase 57's refusal tags and messages are unchanged.

---

### `packages/devtools/src/model/Timeline.ts` (model, transform)

**Analog:** itself; research Pattern 6 (compiled clean in the scratch copy). Current code `:114` and `:144` spell `DecisionRecord & { environment: string }` and `ObligationRecord & { environment: string }`; both intersections are deleted.

```ts
export const ingest = (self: Timeline, stored: StoredRecord): Timeline =>
  stored.record._tag === "Decision"
    ? ingestDecision(self, stored.environment, stored.record)
    : ingestObligations(self, stored.environment, stored.record);

const ingestDecision = (self: Timeline, environment: string, record: DecisionRecord): Timeline => { ... };
const ingestObligations = (self: Timeline, environment: string, record: ObligationRecord): Timeline => { ... };

const sameSlot = (entry: TimelineEntry, environment: string, record: { evaluationId: string; at: number }): boolean =>
  sameEvaluation(entry, environment, record) && entry.at === record.at;
const sameEvaluation = (entry: TimelineEntry, environment: string, record: { evaluationId: string }): boolean =>
  entry.evaluationId === record.evaluationId && entry.environment === environment;
```
Inside the bodies replace `record.environment` with `environment` (e.g. `environment: record.environment` on `new TimelineDecision({...})` becomes `environment`). `entryKey` (`:102-103`) and `TimelineDecision`/`TimelineOrphan` are untouched.

**Order (D-13)**, replacing `const isAfter = Order.isGreaterThan(storedRecordOrder);` at `:201`; no new export:
```ts
const recordOf = (entry: TimelineEntry): SinkRecord =>
  entry._tag === "TimelineDecision" ? entry.decision : entry.obligations;
const isAfter = Order.isGreaterThan(Order.mapInput(sinkRecordOrder, recordOf));
```
Keep the existing `isAfter` doc, "Hoisted to module scope" (`insert` runs once per ingested record). Match the existing `_tag` ternary style (no `switch`).

`TimelineStore.accept: (record: StoredRecord) => void` keeps its type; optional param rename to `stored`.

---

### Doc-only src files (Source.ts, TimelineStore.ts, DecisionLogHttp.ts, the two routes, DecisionStream.ts, AttributeResolver.ts:51, AuditArchive.ts:102)

No code analog needed. `Source.ts:218` `backlogs.flat().sort(storedRecordOrder)` and `DecisionStream.ts:291` `.toSorted(storedRecordOrder)` are type-compatible. Rephrase `Source.ts:106` and `:225-227` ("decodeStoredRecordString, which stamps the producer's label"). `AuditArchive.ts:102` and `spec/behaviors/33-audit-pipeline.md:772`: archive entries are bare `SinkRecord`s, so the name becomes `sinkRecordOrder`. `@qadi/http` has no code change (D-15); its Breaking changeset rests on `DecisionLogReader`'s element type changing.

---

### Tests

**`packages/devtools/test/helpers.ts`** (first, highest leverage). Builders `decisionRecord` (`:107`) and `obligationRecord` (`:150`) wrap `stampRecord(new DecisionRecord({...}), options?.environment ?? "Server")`. Rewrite:
```ts
new StoredRecord({
  environment: options?.environment ?? "Server",
  record: new DecisionRecord({ evaluationId: ..., at: ..., subjectId: ..., policy: ..., outcome: ... }),
})
```
Keep the optional-spread idiom `...(options?.x === undefined ? {} : { x: options.x })` as is. Most devtools tests then compile unchanged; `Source.test.ts` needs a real rewrite (`x.evaluationId` becomes `x.record.evaluationId`, `x._tag` becomes `x.record._tag`; never weakened).

**`packages/core/test/SinkCodec.test.ts`** `describe("the stored-record envelope ...")` at `:2111`. Builders `decision`/`failed`/`obligations` (`:2100-2133`) take `environment` and call `stampRecord(new X(...), environment)`; the pinned golden at `:2178-2182`:
```ts
assert.strictEqual(
  Result.getOrThrow(encodeStoredRecordString(obligations("Edge"))),
  '{"environment":"Edge","record":{"_tag":"Obligations","version":2,"evaluationId":"e-3","at":3,"outcome":"Discharged","obligationIds":["o"]}}',
);
```
Characterisation is written on the base THROUGH THE WIRE (D-14, Pitfall 5): same API before and after. Only the builder construction line differs. Extend with the golden grid from research "Code Examples": for each `V2_*` fixture in `packages/core/test/fixtures/sinkWireV2.ts` (hand-written, not encoder-captured) times `["Server", "édge ✓", 'a"b']`, assert `` `{"environment":${JSON.stringify(environment)},"record":${fixture}}` ``. Add a text fixed point `text -> decodeStoredRecordString -> encodeStoredRecordString === text`. New-shape rows (`stored.record` identity, `instanceof DecisionRecord`) are committed RED on the base, like Phase 57's rows. The `:2171-2175` test "the environment is the producer's and survives unchanged" stays (spoofing mitigation).

**`packages/core/test/DecisionRecord.test.ts`** INV-QD-039 grid (`:20-58`) calls the order with `{ at }` doubles and sorts `{ at, id }`; rebuild on `ObligationRecord`s (cheapest) under `sinkRecordOrder`, and add the same rows through `storedRecordOrder` (NaN last, two unknowns equal, stable arrival).

**`packages/core/test/DecisionSink.tst.ts:70-76`** tstyche pin; rewrite the narrowing:
```ts
const narrow = (stored: StoredRecord) =>
  stored.record._tag === "Decision" ? stored.record.policy : stored.record.obligationIds;
expect<StoredRecord["environment"]>().type.toBe<string>();   // keep
```

**`packages/core/test/ShippedSinkReports.test.ts`**: delete C4 (`:129-147`, the throwing-getter test) per D-12, and the traceability row/BEH-QD-569 wording that cites it. The `ShippedSinkReports.test.ts` containment rows (the emitter-contained defect rows) stay as the precedent for "a sink defect is contained and reported once".

**`scripts/check-package-install.mjs`** (gate 14; template literal; keep its escaping):
`:419` imports `stampRecord` (alphabetical in the import list; replace with `StoredRecord`, re-sorting) and `:487`
```js
stampRecord(
  new DecisionRecord({ ... }),
  "Server",
)
```
becomes `new StoredRecord({ environment: "Server", record: new DecisionRecord({ ... }) })`.

**Run order (D-14):** `pnpm exec tsc -b tsconfig.json` before `pnpm test:bdd` (features resolve `@qadi/core` through `lib/`). Vitest from the repo root with stdin closed (`< /dev/null`), one Stryker config at a time, never beside vitest.

---

### `58-mutation.mjs` (script, batch)

**Analog:** `.planning/phases/QD-57-untrusteddecoder-states-the-envelope-s-unknown-key-policy/57-mutation.mjs` (itself adapted from `QD-56-.../56-mutation.mjs` and `QD-53-.../53-mutation.mjs`). Structure to copy: header comment naming the rule; constants `D`, per-file path constants; a `SUITES` table, one entry per Stryker config, `{ cf, rp, dirs, base, after }`; helpers `fail`, `norm`, `text`, `idOf`, `det`; subcommands `base|after|evidence|compare`. Never edit a Stryker config; use `--mutate` on the command line.

```js
const SUITES = {
  core: { cf: "stryker.config.mjs", rp: "reports/mutation/mutation.json", dirs: [...], base: [DR, DL, DS, SC], after: [DR, DL, DS, SC] },
  devtools: { cf: "stryker.devtools.mjs", rp: "reports/mutation-devtools/mutation.json", ... base: [SRC, TL, TS] },
  http: { cf: "stryker.http.mjs", rp: "reports/mutation-http/mutation.json", ... base: [DLH] },
};
```
(Confirm each `rp` path against the config's `htmlReporter`/`jsonReporter` setting; Phase 57 `dirs` also list `packages/core/src` for dependants' vitest.)

**Phase 58 differences (D-16), from research "Mutation":**
1. Receivers are absent (deleted `stampRecordMatch` arms have none), so the `det(receiver) + proven + gain >= left` check cannot hold. Store base-KILLED mutant ids too (a `killed` list built with the same `idOf`: mutator, status, replacement, mutated text, normalised source line).
2. At `compare`: survivor set of every touched file unchanged; every base-killed mutant absent from the after report must be a deleted one, i.e. its normalised source line does not occur in the after file's normalised lines. Declare the expected deleted statements (the `isolate` helper, the stamp classes, `stampRecordMatch`) in the script BEFORE the change, as 57 declared `MOVED`.
3. Any new mutant (`sinkRecordOrder`, `recordOf` arms, `ingest` ternary, `sameSlot`/`sameEvaluation`) must be killed: a test with an orphan beside decisions of differing `at` kills both arms of `recordOf`.
`AuditArchive.ts` is a comment-only edit and needs no base. Commit the script plus base JSON alone, first (D-09).

---

### Records (ARCH-105, ADR-QD-171, CCR-QD-449, BEH-QD-626..630, INV-QD-361..362)

**Template plans:** `57-08-PLAN.md` (ADR plus amendments), `57-09-PLAN.md` (BEH/INV/traceability), `57-10-PLAN.md` (overview, changesets, upgrade guide, CCR row), `57-11-PLAN.md` with `57-scan.mjs` (phase scan).

- **ADR-QD-171:** copy the shape of `spec/decisions/169-the-questions-panels-two-host-inputs-are-one-feed.md`: a "Document Control" table (Document ID `QADI-ADR-171` equal to the file number, gate 10; Status "Accepted - amends ADR-QD-097 (D-11-e, D-11-h), ADR-QD-135 addendum, ADR-QD-159, BEH-QD-569"), then `## Context` and `## Decision` with D-01..D-04, D-12 and the rejected alternatives, and the owner's choices. Add the row to `spec/decisions/index.yaml`. ADR-QD-097 gets Rev 1.5 (lines `:131`, `:137`, `:149-155`, `:173-175`); ADR-QD-135 `:173` an addendum; ADR-QD-159 `:119-120`, `:178-179` and `spec/behaviors/24-decision-sink.md:397-404`, `:603-604` amended for D-12.
- **Reserved numbers only.** Never run `scripts/next-id.mjs`. The CCR row names any unused reservation "Unused: ...". No `*-NEXT` placeholder (`[no-numbering-placeholder]`).
- **overview.md** (`:347-350` rows; `:314`, `:319` prose): remove `Stamped`, `StoredDecisionRecord`, `StoredObligationRecord`, `stampRecord`; re-describe `StoredRecord` as a value class and `storedRecordOrder` as `Order<StoredRecord>`; add `sinkRecordOrder`. Gate 13 `spec:api` goes 936 to 933.
- **Changesets**, copy `.changeset/devtools-malformed-frame-is-a-decode-refusal.md` (frontmatter `"@qadi/<pkg>": minor`; body `**Breaking.** ...`; closing line `See the 0.13 section of the upgrade guide, `/docs/reference/upgrading/`.`). Three files: `core-*.md`, `devtools-*.md`, and `http-*.md` (no http changeset exists yet; its basis is `DecisionLogReader`'s element type, D-15).
- **upgrading.md:** append `## 0.13: a stored record is its envelope in memory` after the section at `:926`, with a compiled `typescript` fence (the website gate compiles it): `record.environment` becomes `stored.environment`; `stored._tag` becomes `stored.record._tag`; `stampRecord(r, e)` becomes `new StoredRecord({ environment: e, record: r })`; also the `isolate` removal.
- **Spec prose** (not exhaustive): `24:345,363,416,679-689`; `26:41-42,277,338-339,588-594`; `27:33-34,78-90,242,252`; `25:668`; `invariants.md` INV-QD-039 `:1624,1631`; `traceability.md:195,496`. `spec/README.md` change history is exempt.

## Shared Patterns

### Doc-comment shape
**Source:** AGENTS.md preamble; `DecisionRecord.ts:192-204`. **Apply to:** every changed export. One-line summary first, the why (ADR citations) after.

### Import discipline
**Source:** AGENTS.md §1. **Apply to:** all edits. `import * as Order from "effect/Order"`, relative imports end `.ts`, `import type` for type-only; `StoredRecord` is a value import only where `new` is used (`DecisionLog.ts`, `SinkCodec.ts`, `Timeline.ts` only if it constructs one; otherwise type import).

### Narrowing without `switch` or `as`
**Source:** `Timeline.ts` current `record._tag === "Decision" ? ... : ...` ternary; property-path narrowing (`stored.record._tag`) compiles. **Apply to:** `Timeline.ingest`, `recordOf`, tests. No `as`, `!`, `any`.

### Test-only builders, no new src factory
**Source:** `packages/devtools/test/helpers.ts`. **Apply to:** every test project. `src` gets only `new StoredRecord({ environment, record })`.

### Gates that move
Gate 13 (936 to 933) and gate 14 (`check-package-install.mjs`). Not affected (measured in research): `check-house-style` budgets, oxlint, madge, doc-example gates.

## No Analog Found

None needed. The one design call without a prior analog is `Timeline`'s `recordOf` order (D-13), covered by the research spike. The log's behavioural change (it now retains the caller's record instance by reference, where `stampRecord` made a shallow copy) has no precedent; record it in ADR-QD-171.

## Metadata

**Analog search scope:** `packages/core/src`, `packages/devtools/{src,test}`, `scripts/`, `.changeset/`, `.planning/phases/QD-5{3,6,7}-*`, plus the line-level blast radius already measured in 58-RESEARCH.md.
**Files read this session:** CONTEXT, RESEARCH, 57-PATTERNS, 57-mutation.mjs (head), `DecisionRecord.ts:100-215`, `DecisionLog.ts` snippets, `SinkCodec.ts` imports, `Timeline.ts` snippets, `helpers.ts` snippet, `SinkCodec.test.ts` snippets, `DecisionSink.tst.ts` snippet, `ShippedSinkReports.test.ts` C4, `check-package-install.mjs` snippets, `overview.md` rows.
**Pattern extraction date:** 2026-11-19
