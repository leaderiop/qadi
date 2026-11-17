# Phase 48: Audit reports core's refusal and derives "lost" - Pattern Map

**Mapped:** 2026-11-16
**Files analyzed:** 21 (new/modified)
**Analogs found:** 20 / 21

All analogs below are git-tracked (checked `git ls-files` for the leaf modules and `driveExit.ts`). Line numbers for the phase-base files come from 48-RESEARCH.md (src unchanged since Phase 46) and were not re-derived; the planner should re-grep before citing a range.

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `packages/audit/src/UnwrittenRow.ts` (NEW, package-private) | utility (closed row table) | transform | `packages/audit/src/SinkOptionChecks.ts` (leaf, out of barrel) + `AuditWriteOutcome.ts` `unwrittenDurability` (Match + literal helper) | role-match |
| `packages/audit/src/AuditWriteOutcome.ts` | model | transform | itself (`unwrittenDurability`/`durabilityOf`, lines ~97-123) | exact |
| `packages/audit/src/AuditWriteReport.ts` | service (pure projection + emit) | event-driven (logging/metrics) | itself (hoisted `Match.type`s) | exact |
| `packages/audit/src/AuditDecisionSinkLive.ts` | service | request-response | itself (`stageEntry`/`writtenStaging` :175-204) + `AuditWriteOutcome.ts` `Data.taggedEnum` | exact |
| `packages/audit/src/AuditEntry.ts` | utility | transform | `decodeAuditEntry` in same file (already returns core's `SinkRecordNotDecodable`) | exact |
| `packages/audit/src/AuditTrailPort.ts` (doc) | config (comment) | n/a | n/a | n/a |
| `packages/core/src/JsonRefusal.ts` (doc comment :139-142) | utility (comment) | n/a | n/a | n/a |
| `packages/audit/test/observeLeaf.ts` (NEW helper) | test helper | event-driven | `packages/audit/test/driveExit.ts` | exact |
| `packages/audit/test/AuditWriteOutput.test.ts` (NEW characterisation) | test | event-driven | `AuditWriteExits.test.ts`, `Metrics.test.ts` | role-match |
| `packages/audit/test/AuditLostAgreement.test.ts` (NEW D-06 table) | test | transform | `AuditWriteOutcome.test.ts` ROWS + last test | role-match |
| `packages/audit/test/AuditRefusal.tst.ts` (NEW RED pin) | test (type) | n/a | `packages/audit/test/AuditDecisionSinkLive.tst.ts` | exact |
| `packages/audit/test/AuditEntry.test.ts`, `AuditWriteOutcome.test.ts`, `AuditDecisionSinkLive.test.ts` (edit) | test | n/a | themselves | exact |
| `.planning/phases/QD-48-.../48-mutation-base.json` + `48-mutation-after.json` | config (evidence) | batch | `45-mutation-base.json`/`45-mutation-after.json`, writer in `45-01-PLAN.md` line 183 | exact |
| `.changeset/<name>.md` | config | n/a | `.changeset/audit-options-refused-when-built.md` | exact |
| `apps/website/src/content/docs/docs/reference/upgrading.md` (new 0.13 entry) | docs | n/a | Phase 45 entry at `:742-771` | exact |
| `spec/behaviors/33-audit-pipeline.md`, `spec/invariants.md`, `spec/traceability.md`, `spec/README.md`, `spec/overview.md`, `spec/decisions/161-*.md`, `index.yaml`, `056-*.md`, `095-*.md` | docs | n/a | Phase 45 (ADR-QD-158, CCR-QD-436, BEH-QD-561, INV-QD-335); Phase 47 (ADR-QD-160, CCR-QD-438 at `spec/README.md:375`) | exact |
| `packages/audit/README.md:55`, website `capabilities.md:44` | docs | n/a | n/a (one-word rename) | n/a |

## Pattern Assignments

### `packages/audit/src/UnwrittenRow.ts` (NEW, utility, transform)

**Analog 1 (leaf shape, out of barrel):** `packages/audit/src/SinkOptionChecks.ts` lines 1-8. Header doc says "Package-private: not in the barrel", then `import * as … from "effect/…"`, relative imports with `.ts`. `PortDefault.ts` lines 1-10 does the same (doc states why it is package-private, cites ARCH/ADR).

```ts
/**
 * The checks that refuse a breaker or audit sink option that cannot work.
 *
 * Package-private: not in the barrel. Each check answers the decoded value it
 * approved, so the caller never decodes twice (ARCH-92, ADR-QD-158).
 */
import * as Duration from "effect/Duration";
import * as Effect from "effect/Effect";
```

**Analog 2 (closed Match with literal-typing helper):** `AuditWriteOutcome.ts` lines ~97-107.

```ts
// A helper, not a literal: a `Match` arm returning `"Lost"` infers `string`.
const durability = (d: Durability): Durability => d;

const unwrittenDurability: (self: UnwrittenStaging) => Durability = Match.type<UnwrittenStaging>().pipe(
  Match.tagsExhaustive({
    NotWired: () => durability("Lost"),
    Staged: () => durability("StagingOnly"),
    StageFailed: () => durability("Lost"),
  }),
);
```

**Pattern to apply (RESEARCH Code Example 2, compiled):** row type `{ durability: "StagingOnly" } | { durability: "Lost"; lost: "not_wired" | "failed" }`, builders `lostRow(word)` / `STAGING_ONLY`, no `as`/`!`/`any`.

**Cycle constraint:** the leaf must NOT `import type` `UnwrittenStaging` from `AuditWriteOutcome.ts` (madge counts type imports, ADR-QD-037). Key the leaf's table by the three literal tag names, and have `AuditWriteOutcome.ts` assign it to `{ readonly [K in UnwrittenStaging["_tag"]]: UnwrittenRow }`, so a fourth variant is a compile error. (The Match form on `UnwrittenStaging` then lives in `AuditWriteOutcome.ts` and is the one mapping; the leaf only owns the row type and builders. Planner decides; both compile per research Q5.) Do not export from `index.ts`; gate 13 then needs no overview row.

**Closed-table analogs for the chosen shape:** `packages/react/src/SeededDecision.ts` `VERDICTS` and `packages/core/src/FieldLattice.ts` (`Record<FieldStrategy, StrategyLaws>`, own-property read). Prefer the Match form: static table literals are `ignoreStatic` mutants and earn no mutation evidence.

---

### `packages/audit/src/AuditWriteOutcome.ts` (model, transform)

**Analog:** itself. Replace `unwrittenDurability` (above) so `durabilityOf` reads the row:

```ts
export const durabilityOf: (self: AuditWriteOutcome) => Durability = Match.type<AuditWriteOutcome>().pipe(
  Match.tagsExhaustive({
    Refused: () => durability("Refused"),
    Written: () => durability("Trail"),
    WriteFailed: (o) => unwrittenDurability(o.staging),   // -> durability(unwrittenRow(o.staging).durability)
    Skipped: (o) => unwrittenDurability(o.staging),
  }),
);
```

Refused arm of the ADT (line ~79): `Refused: { readonly refusal: AuditEntryNotEncodable }` becomes `SinkRecordNotEncodable` (`import type { SinkRecordNotEncodable } from "@qadi/core"`, named import per AGENTS §1). `Durability` type unchanged (D-08).

---

### `packages/audit/src/AuditWriteReport.ts` (service, event-driven)

**Analog:** itself (hoisted `Match.type<…>().pipe(Match.tagsExhaustive(…))`, per CONTEXT "Established Patterns"). Lines to change (base): `:84-85` `warning`/`info` helpers, `:97-113` per-arm level, `:115-126` `lostStaging`/`lostLabel`, `:144-145` `outcomePath`, `:208-246` emit options, `evaluationIdOf`, Refused branch.

**Exhaustive branches (RESEARCH Code Example 6):**

```ts
const evaluationIdOf: (self: AuditWriteOutcome) => string = Match.type<AuditWriteOutcome>().pipe(
  Match.tag("Refused", (o) => o.refusal.evaluationId),
  Match.tag("Written", "WriteFailed", "Skipped", (o) => o.entry.record.evaluationId),
  Match.exhaustive,
);
export const outcomePath: (self: AuditWriteOutcome) => string = Match.type<AuditWriteOutcome>().pipe(
  Match.tag("Refused", (o) => o._tag),
  Match.tag("Written", "WriteFailed", "Skipped", (o) => `${o._tag}.${o.staging._tag}`),
  Match.exhaustive,
);
```

`emitWriteOutcome` stays `Effect.fn("qadi.audit.emitWriteOutcome")` (UNTRACED_BUDGET untouched); its dispatch is `Match.value(outcome)` (once per record, sanctioned by §5a), Refused arm calls core's `reportEncodeRefusal(refusal, { message, onRefused })` (already at `:233`), other arm is `logLine(report.log, evaluationId)` guarded by `typeof line === "object"` (drops the redundant `report.log !== "encodeRefusal"` guard that produced two equivalent Stryker survivors).

**Lost label / level reading the row (RESEARCH Code Example 3):**

```ts
const lostLabel = (after: LostLabel["after"], staging: UnwrittenStaging): LostLabel | undefined => {
  const row = unwrittenRow(staging);
  return row.durability === "Lost" ? { after, staging: row.lost } : undefined; // narrows, no cast
};
const unwrittenLine = (staging: UnwrittenStaging, message: string): LogLine => ({
  level: unwrittenRow(staging).durability === "Lost" ? "Warn" : "Info",
  message,
  cause: undefined,
});
```

`Written.CommitFailed` line (`level: "Warn"`, `:93`) stays literal. Messages, annotations (`{ evaluationId }` only), metric ids, `LOST_COUNTERS` keys unchanged (D-07).

---

### `packages/audit/src/AuditDecisionSinkLive.ts` (service, request-response)

**Analog for the union:** `AuditWriteOutcome.ts`'s `Data.TaggedEnum` + `Data.taggedEnum<…>()` constructors. Replace the `StageResult` interface (`:110-118`: `{ staging; commit | undefined }`) with (Code Example 4, compiled and run):

```ts
type StageResult = Data.TaggedEnum<{
  NotWired: {};
  StageFailed: {};
  Staged: { readonly commit: () => Effect.Effect<void, AuditStagingError> };
}>;
const StageResult = Data.taggedEnum<StageResult>();

const writtenStaging: (self: StageResult) => Effect.Effect<WrittenStaging> = Match.type<StageResult>().pipe(
  Match.tagsExhaustive({
    NotWired: () => Effect.succeed(WrittenStaging.NotWired()),
    StageFailed: () => Effect.succeed(WrittenStaging.StageFailed()),
    Staged: (s) =>
      s.commit().pipe(
        Effect.as(WrittenStaging.Committed()),
        Effect.catchCause((cause) => Effect.succeed(WrittenStaging.CommitFailed({ cause }))),
      ),
  }),
);
```

`stageEntry` (`:175-191`) returns `StageResult.NotWired()`, `.StageFailed()`, `.Staged({ commit: () => bounded(stagingPort.commit(handle), entry, AuditStagingError) })`. `bounded` is applied where `commit` is built, which is what lets `writtenStaging` hoist to module scope.

**Conversion to the outcome's `staging` (no `commit` leak, Code Example 5):** `const unwrittenOf = (self: StageResult): UnwrittenStaging => UnwrittenStaging[self._tag]();` used in `Skipped({ entry, staging: unwrittenOf(staged) })` / `WriteFailed(...)`. Keep `StageResult` and `writtenStaging` unexported (the module is `export *`ed; gate 13).

`onRefused` option (`:90`) and the import (`:33`): `SinkRecordNotEncodable` from `@qadi/core`. Span attributes at `:239-247` unchanged.

---

### `packages/audit/src/AuditEntry.ts` (utility, transform)

**Analog:** `decodeAuditEntry` in the same file, which already returns core's `SinkRecordNotDecodable` (`:187`). Delete the class (`:51-73`) and the `mapError` (`:131-141`); `Data`, the `EncodeRefusal` type and `describeEncodeRefusal` imports become unused. Result (Code Example 1):

```ts
export const encodeAuditEntry = Effect.fn("qadi.audit.encodeAuditEntry")(function* (record: SinkRecord) {
  const json = yield* Effect.fromResult(encodeSinkRecord(record));
  const entry: AuditEntry = { record: json, sequenceNumber: undefined };
  return entry;
});
```

Reword the module doc `:26-32` and the `encodeAuditEntry` doc `:121-123` (drop the ADR-QD-054 misreading; cite ADR-QD-161).

---

### `packages/audit/test/observeLeaf.ts` (NEW helper) and `AuditWriteOutput.test.ts` (NEW characterisation)

**Analog:** `packages/audit/test/driveExit.ts` (tracked). Reuse its `ExitSpec` shape (wired, open, encode, replies; non-target entry's write is `AuditPortReply.Fail({ cause: "trip" })`, `failureThreshold: 1`, `storeCallTimeout: "5 seconds"`), `AuditTrailPortTest`/`AuditStagingPortTest`/`AuditPortReply`, and `isolatedMetrics`. Add what it lacks: a local `Logger.make` that records `options.cause` (do NOT edit `@qadi/testing`'s `collectingLogger`, which has a twin held equal by `test-helper-twin`), `collectingTracer(spans)` from `@qadi/testing` reading span `"qadi.audit.record"` attributes, counter deltas via `Metric.value(WRITES_COUNTERS.x)` etc. (no `"qadi_…"` literals, `METRIC_ID_LITERAL_BUDGET`), and the `onRefused` hook payload.

**Rules:** expectations are hard-coded literals (the 11-leaf table in RESEARCH Q3), whole-value `assert.deepStrictEqual`, annotations exactly `{ evaluationId: "target" }`; the file must not import `describeAuditWriteOutcome`. Wave-0 files import only what exists at the base. A broken port is scripted, never hand-built (`PORT_DOUBLE_BUDGET`, `AUDIT_HAND_LAYER_BUDGET`). Assert the hook's `outcome.staging` own keys are `["_tag"]` (guards the `commit` leak). Refusal payload asserted through fields surviving the change (`recordTag`, `evaluationId`, `refusal`); `_tag` and `reason` change in the AREF-01 edit of the existing hook test.

---

### `packages/audit/test/AuditLostAgreement.test.ts` (NEW, D-06 table)

**Analog:** `AuditWriteOutcome.test.ts` `ROWS` (11 rows, `deepStrictEqual`) and its last test "a lost report is set exactly when the entry is Lost", which already scopes the warning leg with `if (durability !== "Lost" && durability !== "StagingOnly") continue;`. Scope per D-06a: `durabilityOf === "Lost"` ⇔ lost counter ⇔ span `"Lost"` over all 11; warning ⇔ Lost over the six unwritten leaves, naming `Written.CommitFailed` and `Refused` as warn-but-not-lost. Feed it from `observeLeaf`.

---

### `packages/audit/test/AuditRefusal.tst.ts` (NEW, RED on base)

**Analog:** `packages/audit/test/AuditDecisionSinkLive.tst.ts` (header doc citing the ADR, `import { expect, test } from "tstyche"`, `import type` everywhere, `expect<…>().type.toBe<…>()`):

```ts
test("the layer fails only with InvalidAuditSinkOption", () => {
  expect<ReturnType<typeof AuditDecisionSinkLive>>().type.toBe<
    Layer.Layer<DecisionSink, InvalidAuditSinkOption, AuditTrailPort>
  >();
});
```

Content: RESEARCH Q7's four tests (`onRefused` param, emit options' `onRefused`, `Refused.refusal`, `Effect.Error<ReturnType<typeof encodeAuditEntry>>`), all `.toBe<SinkRecordNotEncodable>()`. New file so the green `AuditDecisionSinkLive.tst.ts` is not turned red; red only under `pnpm test:tstyche`, green under `tsc`. Verify steps before AREF-01 exclude it by exact path. Runtime complement: `assert.instanceOf(failure, SinkRecordNotEncodable)` in `AuditEntry.test.ts`.

---

### Existing test edits (AuditEntry / AuditWriteOutcome / AuditDecisionSinkLive tests)

Rename list is in RESEARCH Q1 (`AuditEntry.test.ts:69,106,139,151,169` tag; `:73,108,156` reason becomes `describeEncodeRefusal(result.failure.refusal)`; `AuditWriteOutcome.test.ts:5,14`; `AuditDecisionSinkLive.test.ts:11,510,694,526`). `AuditWriteOutcome.test.ts` keeps its `PORT_DOUBLE_BUDGET` count of 1 (`scripts/check-house-style.mjs:732`).

---

### Mutation evidence: `48-mutation-base.json`, `48-mutation-after.json`

**Analog:** `.planning/phases/QD-45-the-audit-circuit-breaker-as-one-transition-function/45-mutation-base.json` (shape `{measured, unmeasured, new, deleted, moved}`), its writer in `45-01-PLAN.md` line 183 (node one-liner that refuses a stale report, a report holding other files, a `source` differing from disk, a config reporting elsewhere), and its verifier at line 187. Retarget NAMED to the four files:

`pnpm exec stryker run stryker.audit.mjs --mutate 'packages/audit/src/AuditEntry.ts,packages/audit/src/AuditWriteOutcome.ts,packages/audit/src/AuditWriteReport.ts,packages/audit/src/AuditDecisionSinkLive.ts'`

Base at HEAD (re-run on the untouched tree first; the writer rejects the stale session report): `AuditDecisionSinkLive` 1, `AuditEntry` 1, `AuditWriteOutcome` 1, `AuditWriteReport` 0.9659090909090909. Run in background; written alone as the phase's first commit, never edited. `UnwrittenRow.ts` goes in `new`, measured once after. Close: same invocation, a comparer failing on any `measured` file below base, then `48-mutation-after.json` as flat `{path: score}`.

---

### `.changeset/<name>.md` and `upgrading.md`

**Analog:** `.changeset/audit-options-refused-when-built.md`: front matter `"@qadi/audit": minor`, body begins `**Breaking.**`, states the runtime consequence, ends `See the 0.13 section of the upgrade guide, \`/docs/reference/upgrading/\`.` Content per D-13 / RESEARCH Q9 (rename, `reason` replacement via `describeEncodeRefusal(e.refusal)`, new `catchTag` tag `"SinkRecordNotEncodable"`, code `ACL019`, log/span/metrics unchanged). `upgrading.md`: new `## 0.13:` entry after `:794`, Phase 45's entry at `:742-771` is the format: ` ```ts ` Before fence (not compiled), ` ```typescript ` After fence (compiled by `scripts/check-website-doc-examples.mjs`; close step runs `pnpm spec:website-examples`), ends by linking the ADR.

---

### Spec records

Models: Phase 45 (ADR-QD-158, CCR-QD-436 row in `spec/README.md`, BEH-QD-561 in `spec/behaviors/33-audit-pipeline.md`, INV-QD-335 in `spec/invariants.md`) and Phase 47 (ADR-QD-160 file `160-port-facts-are-read-from-the-description.md`, CCR-QD-438 at `spec/README.md:375`). ADR-QD-161 follows 160's Document Control table (`Document ID` `QADI-ADR-161` equal to the file number), sections Context / Decision / Alternatives considered / Consequences / Related, and an `index.yaml` entry `id`, `file`, `title`, `status: "Accepted — amends ADR-QD-056, ADR-QD-095"`. Revise each document with `node scripts/spec-revise.mjs <file> "<what>" --date 2026-11-16`; never run `scripts/next-id.mjs`. Reserved ids: ARCH-95, ADR-QD-161, CCR-QD-439, BEH-QD-576..580, INV-QD-341..342. `spec/overview.md`: delete the `AuditEntryNotEncodable` row (`:757`), amend `:758`/`:761`; gate 13 goes 929 to 928 exports. ADR-056 gets a dated amendment section plus `>` pointers, ADR-095 a superseded `>` note under `:65`; the ADR must not link to gitignored paths (`reports/`, `.planning/`).

## Shared Patterns

### Imports / house rules
**Source:** AGENTS.md §1. `import * as Match from "effect/Match"` style, relative `.ts`, `import type` for types, named import from `@qadi/core` across packages (precedent: `AuditEntry.ts:39-49` already imports `encodeSinkRecord`, `SinkRecordJson`, `SinkRecordNotDecodable`).
**Apply to:** every changed src file.

### Exhaustive dispatch
**Source:** `AuditWriteOutcome.ts` `unwrittenDurability`/`durabilityOf` (module-scope `Match.type<T>().pipe(Match.tagsExhaustive({…}))`, annotated const). Hoist where nothing per-call is closed over; `Match.value(x)` only for the once-per-record `emitWriteOutcome`. No `switch`, no new `Effect.fnUntraced`.
**Apply to:** `UnwrittenRow` reader, `evaluationIdOf`, `outcomePath`, `writtenStaging`, `emitWriteOutcome`'s refusal branch.

### Package-private leaf kept out of the barrel
**Source:** `packages/audit/src/SinkOptionChecks.ts`, `packages/core/src/PortDefault.ts` (header doc says why). `packages/audit/src/index.ts` is a closed `export *` list; `AuditWriteReport.ts` is already not in it. Anything newly exported from `AuditWriteOutcome.ts` or `AuditDecisionSinkLive.ts` is public and fails gate 13 `[missing]` without an overview row.

### Refusal reporting
**Source:** core's `reportEncodeRefusal` (`packages/core/src/EncodeRefusalReport.ts`, generic over `{ refusal; evaluationId }`) and `describeEncodeRefusal` (`packages/core/src/JsonRefusal.ts:143`). Audit adds no annotation code (`no-refusal-annotation-outside-core`). Default line: message `"qadi/audit: a decision record could not be encoded for the audit trail; no row was written"`, annotations `qadi.refusal`, `qadi.path`, `evaluationId`, no reason.

### Test doubles and metrics
**Source:** `AuditTrailPortTest({ write })`, `AuditStagingPortTest({ stage, commit })`, `AuditPortReply.Fail({ cause })`, `isolatedMetrics`, `collectingTracer`, `Metric.value(WRITES_COUNTERS.x)`. Never a hand-built failing port or a `"qadi_…"` literal.

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| a logger that records `options.cause` (inside `observeLeaf.ts`) | test helper | event-driven | `@qadi/testing`'s `collectingLogger` has no `cause` and must not be extended (twin rule). Build a local `Logger.make` per RESEARCH Q4; no exact analog beyond `collectingLogger`'s shape (`CollectingLogger.ts:14-23`). |

## Metadata

**Analog search scope:** `packages/audit/src`, `packages/audit/test`, `packages/core/src`, `packages/react/src`, `.planning/phases/QD-45-*`, `QD-47-*`, `.changeset/`.
**Files read directly:** 48-CONTEXT.md, 48-RESEARCH.md (lines 1-757 of 936), `SinkOptionChecks.ts` and `PortDefault.ts` (heads), `AuditWriteOutcome.ts` (lines 60-123), `AuditDecisionSinkLive.tst.ts` (head), the Phase 45 changeset, `45-01-PLAN.md` (grep).
**Not re-read:** `AuditWriteReport.ts`, `AuditDecisionSinkLive.ts`, `AuditEntry.ts` bodies (excerpts are from RESEARCH, which read them in full at the same base); `SeededDecision.ts`/`FieldLattice.ts` only confirmed present.
**Pattern extraction date:** 2026-11-16
