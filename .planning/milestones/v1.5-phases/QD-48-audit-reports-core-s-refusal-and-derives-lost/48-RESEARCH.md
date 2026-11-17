# Phase 48: Audit reports core's refusal and derives "lost" - Research

**Researched:** 2026-11-16 (branch `arch-wave-10`, HEAD `dd336d94`; `packages/*/src` is unchanged since Phase 46's `e649b0d6`, so the line numbers below are the phase base's)
**Domain:** `@qadi/audit` (`AuditEntry.ts`, `AuditWriteOutcome.ts`, `AuditWriteReport.ts`, `AuditDecisionSinkLive.ts`), `@qadi/core`'s `SinkRecordNotEncodable` and `reportEncodeRefusal`, Effect 4.1.2 `Match`/`Data`, tstyche 7.2.5, Stryker 10.1.1, spec records
**Confidence:** HIGH on the base output of all eleven leaves (a throwaway probe drove each one through the public sink and the output is recorded below), HIGH on the typing (every candidate compiled under `tsc -p tsconfig.test.json`, negative controls included), HIGH on the type pin (RED output on HEAD pasted), HIGH on the mutation base (run this session, 21 s), HIGH on gate 13 (run on a scratch copy in both directions), MEDIUM on spec-record placement (the planner's call).

All probes were temporary files under `packages/audit/test/`, each deleted: after the last one `git status --short` shows only the pre-existing `.planning/`, `.agents/`, `.codex/` and `.vitest/` entries. Nothing was staged, committed or pushed, and `scripts/next-id.mjs` was not run. The one generated artefact is `reports/mutation-audit/mutation.json`/`index.html`, which `.gitignore:19` (`reports/*`) ignores.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**The refusal type (AREF-01)**
- **D-01:** `AuditEntryNotEncodable` is deleted with no alias. `AuditDecisionSinkLive`'s `onRefused`, `AuditWriteEmitOptions.onRefused` and `AuditWriteOutcome.Refused.refusal` take core's `SinkRecordNotEncodable` (`packages/core/src/Errors.ts:381`), the type `decisionSinkForwarding` and `@qadi/http`'s `DecisionLogHttp` already use.
- **D-02:** `encodeAuditEntry` fails with core's `SinkRecordNotEncodable` exactly as `encodeSinkRecord` returns it. The `mapError` goes. This is Breaking for a caller's `catchTag("AuditEntryNotEncodable")`.
- **D-03:** The `reason` field goes away. The default refusal warning stays byte-identical: it never carried the reason, because core's `reportEncodeRefusal` annotates `qadi.refusal`, `qadi.path` and `evaluationId`. A hook that wants the sentence calls `describeEncodeRefusal(e.refusal)`. Success criterion 1's "logged reason ... computed at the one place a line is written" is read this way: the one place the sentence is computed is core's `describeEncodeRefusal`, and audit's one line is written by `reportEncodeRefusal`. No `qadi.reason` annotation is added to core, because that would change the forwarding and http lines (criterion 4).
- **D-04:**
  - ADR-QD-161 records the decision. The class's ADR-QD-054 citation ("core has no reason to know this error exists") was a misreading: ADR-054 concerns compile-only dialect packages, and core already declares the error.
  - ADR-QD-056 is checked and unaffected: core's `DecisionSink` is the seam.
  - `JsonRefusal.ts`'s doc comment, which names the class, is updated.

**"Lost" decided once (AREF-02)**
- **D-05:**
  - One closed row per `UnwrittenStaging` variant, typed so that durability and the lost label cannot disagree: `{ durability: "StagingOnly" } | { durability: "Lost"; lost: "not_wired" | "failed" }`.
  - `durabilityOf` and the lost label (`lostLabel`) both read it.
  - `unwrittenDurability` and `lostStaging` are deleted, so only one exhaustive mapping remains.
- **D-06:** A table test over all 11 outcome leaves (Refused; Written × NotWired/StageFailed/Committed/CommitFailed; WriteFailed × NotWired/Staged/StageFailed; Skipped × NotWired/Staged/StageFailed) pins that `durabilityOf(o) === "Lost"` ⇔ a lost counter is incremented ⇔ the line is a warning ⇔ span `qadi.audit.durability` is `"Lost"`.
- **D-07:** Metric ids, labels and the `LOST_COUNTERS` keys are unchanged (ADR-QD-123; the `[metric-table]` rows are untouched).
- **D-08:** The public `Durability` type is unchanged.

**Exhaustive branches (AREF-03)**
- **D-09:**
  - `StageResult` (`AuditDecisionSinkLive.ts`) becomes a closed tagged union in which only `Staged` carries `commit`.
  - `writtenStaging` is an exhaustive match: NotWired → `WrittenStaging.NotWired`, StageFailed → `WrittenStaging.StageFailed`, Staged → commit, then Committed/CommitFailed.
  - The `_tag` ternary and the `commit === undefined` check both go.
  - Hoisted to module scope where it closes over no per-call state (§5a).
- **D-10:** `evaluationIdOf` and `emitWriteOutcome`'s `if (outcome._tag === "Refused")` in `AuditWriteReport.ts` also become exhaustive matches, because they are the same defect class in the same file.

**Evidence and records**
- **D-11:** Committed first, before any `packages/*/src` edit:
  - Characterisation on the phase base of all 11 leaves through `AuditDecisionSinkLive`: each log line's level, message and annotations; the span attributes `qadi.audit.outcome` and `qadi.audit.durability`; the metric deltas; the default refusal warning; and the `onRefused` payload's fields.
  - A tstyche pin that `onRefused`'s parameter is `SinkRecordNotEncodable`. It is RED on the base.
- **D-12:** The mutation base is measured on the base for `AuditEntry.ts`, `AuditWriteOutcome.ts`, `AuditWriteReport.ts` and `AuditDecisionSinkLive.ts`, and committed alone. No touched file's score may drop.
- **D-13:**
  - The `@qadi/audit` changeset is minor and marked **Breaking** (the 0.x convention of Phases 43–45).
  - The 0.13 entry in `upgrading.md` gives the rename (`AuditEntryNotEncodable` → `SinkRecordNotEncodable`), the replacement for `reason` (`describeEncodeRefusal(e.refusal)`) and the new `catchTag` tag.
- **D-14:** Docs updated:
  - `spec/behaviors/33-audit-pipeline.md`;
  - `spec/overview.md` (gate 13: the export is gone);
  - the audit README;
  - the website's `docs/packages/audit/capabilities.md`;
  - ADR-QD-056's revision note;
  - ADR-QD-095 wherever it names the class.

  Change history (CHANGELOGs, old CCR rows) is not rewritten.

### Claude's Discretion
- The row table's name and file (it should sit beside `UnwrittenStaging` in `AuditWriteOutcome.ts`, so `AuditWriteReport.ts` imports it).
- The characterisation harness, reusing the log/span capture helpers already in `packages/audit/test`.

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope. (Out of scope per the phase boundary: changing any log line, span attribute, metric id or label; core's `reportEncodeRefusal` and its annotations; the circuit breaker; the gap marker ADR-QD-056 leaves to callers.)
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| AREF-01 | `AuditEntryNotEncodable` deleted; `onRefused` takes core's `SinkRecordNotEncodable` | Q1 (every mention, classified), Q2 (gate 13 both ways), Q7 (the RED pin), Q8 (the ADR check), Code Example 1. Wording note: Open Question 1 |
| AREF-02 | The lost-staging label derives from durability; one exhaustive mapping | Q5 (three places decide lost-ness, not two; the row, compiled), Q3 (the leaf table), Code Examples 2-3. Open Questions 2, 3, 5 |
| AREF-03 | `writtenStaging`'s `_tag` ternary becomes an exhaustive match | Q6 (`StageResult` union, hoisted matcher, compiled and run), Code Examples 4-6. Open Question 4 |
| AREF-04 | ADR-QD-161 after checking ADR-054/056; changeset marks the type Breaking | Q8 (what the ADRs say, verbatim), Q9 (records, changeset, upgrading), Q12 |
| WX-01 | `pnpm check:pr < /dev/null` green | Validation Architecture (constituents run at HEAD: `tsc` clean, house-style clean, audit suite 479/479) |
| WX-02 | Reserved ids only, `next-id.mjs` never run | Q9: ARCH-95, ADR-QD-161, CCR-QD-439, BEH-QD-576..580, INV-QD-341..342 grepped free in `spec/`, `packages/`, `.changeset/`, `AGENTS.md`, `apps/website/src` |
| WX-03 | `spec/overview.md` names every added export and drops every removed one | Q2: gate 13 run on a scratch copy: deleting the class without the row is `[stale]`; a new barrel export without a row is `[missing]` |
| WX-04 | No `as`, `!`, `any`, `switch`, `fnUntraced`, ambient clock/console | Q5/Q6 candidates compile with none (the probe's one `as unknown as` was a test fixture and is not recommended); `SWITCH_BUDGET`/`UNTRACED_BUDGET` untouched |
| WX-05 | Coverage holds; Stryker not below base | Q10: base scores measured (three files 1.0, `AuditWriteReport.ts` 0.9659), exact command, 21 s |
| WX-06 | Behaviour change preceded by characterisation or regression test on the base | Q3/Q4 (what is unpinned today), Q7 (RED pin), Validation Architecture Wave 0 |
| WX-07 | Public break recorded as Breaking in changeset and `upgrading.md` | Q9: Phase 45's changeset and 0.13 entry are the templates |
</phase_requirements>

## Project Constraints (from CLAUDE.md / AGENTS.md)

`./CLAUDE.md` is `@AGENTS.md`; its rules are binding. Those that bear on this phase:

- **§1 imports:** `import * as X from "effect/X"`; relative imports carry `.ts`; `import type` for type-only. Crossing a package boundary is a named import from `@qadi/core`.
- **§2/§3:** `Context.Service` with a separate `…Shape`; layers are top-level consts. Nothing here adds a service or a layer.
- **§4 errors:** `Data.TaggedError`, plain unprefixed tags; handle with the array form of `Effect.catchTag`, never `catchTags({...})` (`no-catchtags-object-form`). `SinkRecordNotEncodable` is a `Data.TaggedError` and is not on the twelve-class `Schema.TaggedError` list, so `SCHEMA_ERROR_BUDGET` is unaffected by deleting audit's class (`Errors.ts:366-380`: "`Data.TaggedError`, not `Schema.TaggedError`: it is reported where it happens and crosses no codec, so `SCHEMA_ERROR_BUDGET` is unchanged").
- **§5 / §5a:** `Effect.fn` for effectful functions; `Match`, not `switch`; hoist `Match.type<…>()` to module scope; `Match.value(x)` is acceptable once per request. `UNTRACED_BUDGET` and `SWITCH_BUDGET` must not move. `emitWriteOutcome` stays `Effect.fn("qadi.audit.emitWriteOutcome")`.
- **§6 forbidden:** no `as`, `!`, `any`; no `console`, ambient clock. `PORT_DOUBLE_BUDGET` (a test that needs a broken port scripts it; `packages/audit/test/AuditWriteOutcome.test.ts` is on the list with count 1 for its `AuditStagingError` value, `scripts/check-house-style.mjs:732`), `AUDIT_HAND_LAYER_BUDGET` (empty; use `AuditTrailPortTest`/`AuditStagingPortTest`), `METRIC_ID_LITERAL_BUDGET` (read a metric through its export, no `"qadi_…"` literal outside a title).
- **§9 barrels:** `export *` per module; "Shared scaffolding stays out of the barrel — exporting internal helpers leaks generic names into the flat namespace"; "Out of the barrel means not importable" (ADR-QD-099). `AuditDecisionSinkLive.ts`, `AuditEntry.ts` and `AuditWriteOutcome.ts` are `export *`ed, so anything newly exported there is public (Q2).
- **§10:** `@effect/vitest`; the audit package's coverage threshold is 90%.
- **§11/§12:** `spec/` is normative; ` ```typescript ` fences compile (`spec:examples`, `spec:website-examples`), ` ```ts ` fences are listings. A placeholder id in source or tests is refused (`[no-numbering-placeholder]`).
- **§15:** gate 13 (`pnpm spec:api`) requires `spec/overview.md` to name every export, in both directions (Q2).
- **§16:** the changeset `fixed` group moves all nine packages together (`.changeset/config.json`).
- **Memory (user feedback):** `Record<string, unknown>` is a hack; closed unions in full; prefer the complete design; never run `next-id.mjs`; never release. No `.claude/skills/` exists; `.agents/skills/` holds only `source-command-gsd-review-backlog` and `source-command-gsd-workstreams`, neither relevant.

## Summary

The refusal-type half of the phase is a mechanical substitution, and the research confirms its premise: `AuditEntryNotEncodable` is core's `SinkRecordNotEncodable` plus one derived field. `encodeAuditEntry` already calls core's `encodeSinkRecord`, which returns the class the phase wants (`SinkCodec.ts:388`), and `emitWriteOutcome` already hands the refusal to core's generic `reportEncodeRefusal`. Probed on HEAD, audit's default refusal warning carries exactly `qadi.refusal`, `qadi.path` and `evaluationId` and no reason, and the `onRefused` hook receives an object whose own keys include `reason`; deleting the class therefore changes only the hook payload's type, its `_tag` and the absent `reason`. Neither ADR forbids it. ADR-QD-054's sentence is about `PredicateNotRenderable`, and ADR-QD-054's own 2026-10-04 amendment (by ADR-QD-079) already says core "now declares the one `PredicateNotRenderable`"; ADR-QD-056's amendments chose "keeps its own error" citing ADR-QD-054 and never required it; and `decodeAuditEntry` already returns core's `SinkRecordNotDecodable`.

The "lost" half is wider than the roadmap says. Lost-ness is decided in **three** places, not two: `unwrittenDurability` (`AuditWriteOutcome.ts:101`), `lostStaging` (`AuditWriteReport.ts:115`) and the per-variant `warning(...)`/`info(...)` choice in `writeFailedStagingReport` and `skippedStagingReport` (`AuditWriteReport.ts:97-113`). `durabilityOf`'s doc comment says the counter and the warning-versus-info choice "all read it"; only the span attribute does (`AuditDecisionSinkLive.ts:246`). A closed row type, `{ durability: "StagingOnly" } | { durability: "Lost"; lost: "not_wired" | "failed" }`, compiles with no `as`, `!` or `any`, `durabilityOf`/`lostLabel` read it, and `row.durability === "Lost" ? row.lost : undefined` narrows without a cast. The row can sit package-private (a leaf module) or beside `UnwrittenStaging`, in which case it becomes public API and needs overview rows (gate 13, run both ways on a scratch copy): Open Question 5.

The evidence half is cheaper than feared. A harness already exists (`driveExit.ts`, `collectingLogger`, `collectingTracer`, `isolatedMetrics`) but captures too little: no annotation key set, no log cause, no span attributes, no hook payload. Stryker for the four files runs in 21 s: three files score 1.0 and `AuditWriteReport.ts` scores 0.9659 with three survivors, one of them real (the cause attached to the `CommitFailed` line is pinned by no test), which the characterisation will kill.

**Primary recommendation:** Plan 1 (src untouched, in this order): the Stryker base JSON alone; a hard-coded-literal characterisation of the eleven leaves plus the default refusal warning and the hook payload, green on the base; the D-06 agreement table, green on the base; the RED tstyche pin. Then the refusal type (AREF-01), then the row and the durability-derived label, including the log level (AREF-02), then `StageResult` and the exhaustive branches, including `outcomePath` (AREF-03), then the records, then close with `pnpm check:pr < /dev/null` and the Stryker comparison.

## Architectural Responsibility Map

Single-package library work; the "tiers" are modules.

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| The refusal value (type, tag, fields) | `@qadi/core` `Errors.ts` (`SinkRecordNotEncodable`) | `@qadi/audit` re-uses it | One class for forwarding, http and audit; audit already imports core's `encodeSinkRecord`, `SinkRecordJson`, `SinkRecordNotDecodable` |
| The refusal's sentence | `@qadi/core` `JsonRefusal.ts` `describeEncodeRefusal` | a hook that wants it calls it | One place the sentence is computed (D-03) |
| Writing the refusal line | `@qadi/core` `reportEncodeRefusal` | audit supplies message + hook | ADR-QD-095 D-09-e: "Each adapter keeps its own message and its own hook" |
| Whether an unwritten entry is lost, and which lost word | `@qadi/audit` one row per `UnwrittenStaging` variant | `durabilityOf`, `lostLabel`, the line's level read it | AREF-02 |
| What each outcome reports (labels, line) | `AuditWriteReport.ts` `describeAuditWriteOutcome` (package-private) | `emitWriteOutcome` applies it | unchanged (ADR-QD-099, BEH-QD-252) |
| The stage result and its commit | `AuditDecisionSinkLive.ts` module scope | `attemptWrite` | `commit` exists exactly when the stage succeeded, by construction |

## Standard Stack

No package is added, removed or upgraded. [VERIFIED: `package.json` read; runs this session]

| Library | Version | Purpose |
|---------|---------|---------|
| `effect` | 4.1.2 [VERIFIED: `node -e 'require("effect/package.json").version'` printed `4.1.2`] | `Match`, `Data.taggedEnum`, `Metric`, `Logger` |
| `typescript` | 7.0.2 (`tsc --version`: `Version 7.0.2+effect-tsgo.0.67.5`) [VERIFIED] | `pnpm exec tsc -p tsconfig.test.json` is the typecheck for every probe |
| `tstyche` | 7.2.5 [VERIFIED]; `tstyche.json` pins `"target": "6.0.3"` and `"tsconfig": "tsconfig.test.json"` | the RED pin (`uses TypeScript 6.0.3 with ./tsconfig.test.json`) |
| `vitest` | 5.1.0 [VERIFIED: run banner] | `pnpm exec vitest run --project audit <files>` |
| `@stryker-mutator/core` + `vitest-runner` | 10.1.1 [VERIFIED: `package.json:60-61`] | `stryker.audit.mjs` |
| node / pnpm | v26.13.0 / 10.17.1 [VERIFIED] | |

**Package Legitimacy Audit:** no external package is installed, added or upgraded, so the `package-legitimacy` seam was not needed. **Packages removed [SLOP]:** none. **Flagged [SUS]:** none.

## Architecture Patterns

### System Architecture Diagram

```
record(SinkRecord)                                   AuditDecisionSinkLive.record  (Effect.fn "qadi.audit.record")
  |
  |-- encodeAuditEntry --- encodeSinkRecord (core) ---> Result<SinkRecordJson, SinkRecordNotEncodable>
  |        AFTER: the failure is core's value as is (no mapError, no `reason`)
  |
  |-- Failure --> AuditWriteOutcome.Refused { refusal: SinkRecordNotEncodable }
  |-- Success --> breaker.withPermit(permit => attemptWrite(entry, permit))
  |                 stageEntry(entry) --> StageResult  (AFTER: NotWired | StageFailed | Staged{commit})
  |                 permit Refused  --> Skipped { entry, staging: unwritten(stageResult) }
  |                 permit Admitted --> write fails --> WriteFailed { entry, staging: unwritten(stageResult) }
  |                                 --> write ok    --> Written { entry, staging: writtenStaging(stageResult) }
  |
  v   .pipe(Effect.tap(emit))   emit = emitWriteOutcome(outcome, { onRefused, onOutcome })
  |
  |   describeAuditWriteOutcome(outcome) --> { writes, staging[], lost, log }      (pure, one arm per leaf)
  |        unwritten leaves read ONE row per UnwrittenStaging variant:
  |           NotWired    -> { Lost, "not_wired" }      StageFailed -> { Lost, "failed" }     Staged -> { StagingOnly }
  |              |- durabilityOf(outcome)   -> span "qadi.audit.durability"
  |              |- lostLabel(after, staging) -> LOST_COUNTERS[after][word]
  |              '- (recommended) the line's level: Lost -> Warn, StagingOnly -> Info
  |   emit: Refused -> reportEncodeRefusal(refusal, { message, onRefused })   (core: 3 annotations, or the hook)
  |         Written/WriteFailed/Skipped -> logLine(report.log) annotated { evaluationId }
  |         then WRITES_COUNTERS / STAGING_COUNTERS / LOST_COUNTERS updates, then the onOutcome hook (contained)
  v
  annotateCurrentSpan { "qadi.audit.outcome": outcomePath(outcome), "qadi.audit.durability": durabilityOf(outcome) }
```

### Recommended Project Structure
```
packages/audit/src/
├── AuditEntry.ts            # class deleted; encodeAuditEntry unwrapped; imports pruned (Data, EncodeRefusal, describeEncodeRefusal)
├── AuditWriteOutcome.ts     # Refused.refusal: SinkRecordNotEncodable; durabilityOf reads the row
├── UnwrittenRow.ts          # NEW, package-private (not in the barrel): the closed row and its three entries  [Option P, Open Question 5]
├── AuditWriteReport.ts      # lostStaging deleted; lostLabel reads the row; evaluationIdOf/outcomePath/emit are exhaustive matches
└── AuditDecisionSinkLive.ts # onRefused: SinkRecordNotEncodable; StageResult closed union; writtenStaging hoisted
packages/audit/test/
├── AuditWriteOutput.test.ts     # NEW, Wave 0: the characterisation (hard-coded literals), green on base and after
├── AuditLostAgreement.test.ts   # NEW, Wave 0: the D-06 table, green on base and after
├── AuditRefusal.tst.ts          # NEW, Wave 0: the type pin, RED on base
└── observeLeaf.ts               # NEW helper: logger-with-cause + tracer + metric deltas + hook payload (Q4)
```

### Pattern 1: one row, read three ways
**What:** the facts "is this unwritten entry lost, and which word names why" are one value per variant; `durabilityOf`, `lostLabel` and the log level are three readings of it (Code Examples 2-3).
**When to use:** any time a second `Match.tagsExhaustive` over `UnwrittenStaging` would restate a fact the row already holds.

### Pattern 2: a stage result whose `commit` exists only on `Staged`
**What:** a `Data.TaggedEnum` with `Staged: { commit }` and no `commit` anywhere else; `writtenStaging` is a module-scope `Match.type` with `Effect` arms (Code Examples 4-5).

### Anti-Patterns to Avoid
- **Passing the `StageResult` value as the outcome's `staging`.** `Staged` carries `commit`; `Skipped({ entry, staging })` stores the object as given, so `onOutcome` would receive a function-bearing `staging` and the outcome's observable shape would change (reasoning from `Data.taggedEnum`'s constructors storing the argument; the probe confirmed the *safe* conversion leaves own keys `["_tag"]`). Convert through `UnwrittenStaging[self._tag]()` (Code Example 5).
- **Keeping `report.log !== "encodeRefusal"` as a second guard.** It is redundant after the `Refused` match and produced two of the three Stryker survivors (Q10). `typeof line === "object"` has no equivalent mutant.
- **A `Record<string, unknown>` or a widened implementation type to build the row.** Not needed; contextual typing on a declared mapped type keeps the literals.
- **Adding a `qadi.reason` annotation to core.** Out of scope and it would change forwarding's and http's lines (D-03).
- **A hand-written failing audit port in a new test.** `PORT_DOUBLE_BUDGET` counts `new AuditStagingError(`/`new AuditWriteError(` in tests; use `AuditPortReply.Fail({ cause })` through `AuditTrailPortTest`/`AuditStagingPortTest`.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| The refusal sentence | `reason` on an audit error | core's `describeEncodeRefusal(e.refusal)` | one place the sentence is computed (D-03) |
| The refusal log line and its annotations | audit-side annotation code | core's `reportEncodeRefusal`, already called at `AuditWriteReport.ts:233` | `no-refusal-annotation-outside-core` (house-style) forbids restating them |
| Log capture | a new logger | `collectingLogger` from `@qadi/testing` for message/level/annotations; a local `Logger.make` only for `options.cause` | `collectingLogger` records no cause (below) |
| Span capture | the inline tracer at `AuditDecisionSinkLive.test.ts:775` | `collectingTracer(spans)` from `@qadi/testing` | one implementation, `Layer<never>` |
| Metric isolation | a manual registry | `isolatedMetrics` from `@qadi/testing` | on-fiber updates only; the audit sink's are on-fiber (verified by the probe: counts did not accumulate across tests) |
| Broken audit ports | a hand layer | `AuditTrailPortTest({ write })`, `AuditStagingPortTest({ stage, commit })`, `AuditPortReply` | `AUDIT_HAND_LAYER_BUDGET` is empty and `PORT_DOUBLE_BUDGET` counts hand-built errors |
| Opening the breaker | a mock clock dance | `failureThreshold: 1` plus one record whose write fails, then the target | `driveExit.ts` does exactly this |

**Key insight:** every fact this phase touches already has one home (core's error, core's reporter, `durabilityOf`'s table); the work is making four restatements read it.

## Findings by Question

### Q1. Inventory of the refusal type

`AuditEntryNotEncodable`, grepped over the whole tree (excluding `node_modules`, `.git`, `.stryker-tmp`, `lib`, generated `coverage/`, `.next/`, `.astro/`). [VERIFIED: grep this session]

**Must change (live source, tests, live spec, user docs):**

| File:line | What | Change |
|-----------|------|--------|
| `packages/audit/src/AuditEntry.ts:51-73` | the class and its doc | delete; `Data` (:34), `EncodeRefusal` type (:39) and `describeEncodeRefusal` (:44) become unused imports; `SinkRecord` stays (used by `encodeAuditEntry` and `decodeAuditEntry`) |
| `AuditEntry.ts:121-123` | `encodeAuditEntry`'s doc: "an unsafe record fails `AuditEntryNotEncodable`" | say `SinkRecordNotEncodable` |
| `AuditEntry.ts:131-141` | `Effect.mapError((error) => new AuditEntryNotEncodable({ recordTag: record._tag, evaluationId: record.evaluationId, refusal: error.refusal, reason: describeEncodeRefusal(error.refusal) }))` | delete the `mapError`: `yield* Effect.fromResult(encodeSinkRecord(record))` |
| `AuditEntry.ts:26-32` | module doc cites "each companion package owns its shape — that principle covers *error* types (ADR-QD-054)" | reword: the principle no longer applies to this error |
| `AuditWriteOutcome.ts:21`, `:79` | `import type { AuditEntry, AuditEntryNotEncodable }`; `Refused: { readonly refusal: AuditEntryNotEncodable };` | `SinkRecordNotEncodable` from `@qadi/core` |
| `AuditWriteReport.ts:22`, `:209` | `import type { AuditEntryNotEncodable }`; `readonly onRefused: ((refusal: AuditEntryNotEncodable) => void) \| undefined;` | `SinkRecordNotEncodable` |
| `AuditDecisionSinkLive.ts:33`, `:90` | `import type { AuditEntry, AuditEntryNotEncodable }`; `readonly onRefused?: (refusal: AuditEntryNotEncodable) => void;` | `SinkRecordNotEncodable`; the doc at :85-89 stays true |
| `packages/audit/src/AuditTrailPort.ts:15-17` | "a real I/O failure, distinct from `AuditEntryNotEncodable`" | "distinct from core's `SinkRecordNotEncodable`" |
| `packages/core/src/JsonRefusal.ts:141` | "`@qadi/audit` fills `AuditEntryNotEncodable.reason` with this." | D-04: a hook that wants the sentence calls it; no audit field carries it |
| `packages/audit/test/AuditEntry.test.ts:69, 106, 139, 151, 169` | `assert.strictEqual(result.failure._tag, "AuditEntryNotEncodable")` | `"SinkRecordNotEncodable"` |
| `AuditEntry.test.ts:73, 108, 156` | `result.failure.reason` equals `"resource.handler: a function has no JSON form"`, includes `"a circular reference has no JSON form"`, equals `"policy.params.limit: a bigint has no JSON form"` | the field is gone: assert `describeEncodeRefusal(result.failure.refusal)` equals the same sentence (keeps the sentence pinned through audit's input) |
| `packages/audit/test/AuditWriteOutcome.test.ts:5, 14` | `import type { AuditEntry, AuditEntryNotEncodable }`; `const refusal: AuditEntryNotEncodable = Effect.runSync(Effect.flip(encodeAuditEntry(...)))` | `SinkRecordNotEncodable` (type from `@qadi/core`); the `Effect.flip` stays valid |
| `packages/audit/test/AuditDecisionSinkLive.test.ts:11, 510, 694` | the type import and two `Array<AuditEntryNotEncodable>` | `SinkRecordNotEncodable` |
| `AuditDecisionSinkLive.test.ts:526` | `assert.strictEqual(seen[0]?.reason, "resource.tags: a Set has no JSON form");` | `describeEncodeRefusal(seen[0].refusal)` |
| `spec/behaviors/33-audit-pipeline.md:30, 64-65, 73, 88` | the options listing (`:30`), the class + `encodeAuditEntry` listings (`:64-65`, a ` ```ts ` fence, not compiled), two REQUIREMENT lines (`:73` "MUST fail AuditEntryNotEncodable", `:88` "`AuditEntryNotEncodable.reason` MUST be `@qadi/core`'s `describeEncodeRefusal`") | restate (BEH-QD-250's listing and requirements; new BEH-QD-576/577) |
| `spec/overview.md:757` | `\| \`AuditEntryNotEncodable\` \| error \| \`AuditEntry.ts\` — carries core's \`EncodeRefusal\` as \`refusal\`, the refused record's \`evaluationId\`, and \`reason\`, core's \`describeEncodeRefusal\` of the refusal \|` | **delete the row** (gate 13 `[stale]`, Q2); amend :758 (`encodeAuditEntry`) and :761 (`AuditDecisionSinkOptions`'s `onRefused`) to name core's type |
| `spec/decisions/056-audit-companion-package.md:101, 299-301, 335-342` | live prose: "fails `AuditEntryNotEncodable`" (:101), "it stays this package's own error, per ADR-QD-054" (:300-301), "this package keeps its own error and its own message (ADR-QD-054)" (:340-341) | a dated amendment section plus a change-history entry (Q8) |
| `spec/decisions/095-sinkcodec-owns-both-directions.md:65` | D-09-e's table row "Audit: `AuditEntryNotEncodable` gains `refusal`, and `reason` is that refusal as a sentence" | a superseded `>` note under it (Q8) |
| `packages/audit/README.md:55` | "fails `AuditEntryNotEncodable`, with the refusal and the path it was found at" | `SinkRecordNotEncodable` |
| `apps/website/src/content/docs/docs/packages/audit/capabilities.md:44` | "fails `AuditEntryNotEncodable`, naming the refusal and its path" | `SinkRecordNotEncodable` |
| `apps/website/.../reference/upgrading.md` | (new) | the 0.13 entry (Q9) |

**Change history, leave alone:** `packages/{core,audit,http,devtools}/CHANGELOG.md` (`audit/CHANGELOG.md:23, 126`, `core/CHANGELOG.md:49, 313`, `http/CHANGELOG.md:101, 215`, `devtools/CHANGELOG.md:301`); `spec/README.md:314` (CCR-QD-193) and `:414` (CCR-QD-179); `spec/overview.md:13` (change history); `spec/decisions/095-…md:151, 168` (the 2026-10-07 `>` amendment blockquote: history); `.planning/**` (archived ARCH-09/25/35 documents, milestone plans); `reports/audit-2026-09-08/**`. **Generated, ignored, not edited:** `coverage/**`, `packages/audit/coverage/**`, `reports/mutation-audit/**`, `examples/nextjs-newsroom/.next/**`, `apps/website/.astro/data-store.json`.

**Nothing else names it:** `features/` (no hit), `examples/*/src` (no hit), every `*.tst.ts` (none), `AGENTS.md` (none), `scripts/` (none; `scripts/check-house-style.mjs:732` names `AuditWriteOutcome.test.ts`, which keeps its count of 1), `spec/invariants.md` (none), `spec/traceability.md` (none), `spec/devtools-spec/` (none).

**Is it in `QadiError`, `ERROR_CODES`, an audit error union, `SinkCodec` or a `catchTag` site?** No. `AuditEntryNotEncodable` is declared bare and joins nothing (grep of `packages/core/src` for the name: no hit). No source file calls `catchTag("AuditEntryNotEncodable")` anywhere in `packages/`, `features/` or `examples/` (grep). The *replacement* is in the registry: `Errors.ts:433` `| SinkRecordNotEncodable`, `Errors.ts:462` `"SinkRecordNotEncodable": "ACL019",`. So after the change audit's refusal is a `QadiError` member with a stable code; `errorCode(refusal)` works on it.

**`recordTag: SinkRecord["_tag"]` versus core's `SinkRecordTag`:** no difference. `SinkWire.ts:36` `export type SinkRecordTag = typeof DECISION_RECORD_TAG | typeof OBLIGATION_RECORD_TAG;` and `packages/core/test/Errors.tst.ts:72` pins `expect<SinkRecordTag>().type.toBe<SinkRecord["_tag"]>();`. The class is declared `readonly recordTag: SinkRecordTag;` (`Errors.ts:382`).

**Field-for-field claim, verified.** Core's class (`Errors.ts:381-385`), verbatim:

```ts
export class SinkRecordNotEncodable extends Data.TaggedError("SinkRecordNotEncodable")<{
  readonly recordTag: SinkRecordTag;
  readonly evaluationId: string;
  readonly refusal: EncodeRefusal;
}> {}
```

Audit's (`AuditEntry.ts:68-73`), verbatim:

```ts
export class AuditEntryNotEncodable extends Data.TaggedError("AuditEntryNotEncodable")<{
  readonly recordTag: SinkRecord["_tag"];
  readonly evaluationId: string;
  readonly refusal: EncodeRefusal;
  readonly reason: string;
}> {}
```

**What each existing test asserts and how it must change:** `AuditEntry.test.ts` pins `_tag`, `recordTag === "Decision"`, `evaluationId`, `refusal._tag`/`refusal` deep-equal, and `reason`. After: `_tag` becomes `"SinkRecordNotEncodable"`, `recordTag`/`evaluationId`/`refusal` assertions are unchanged, `reason` becomes `describeEncodeRefusal(refusal)`. Add one instance check, `assert.instanceOf(failure, SinkRecordNotEncodable)` (class value imported from `@qadi/core`), which is RED on the base and is the runtime half of the type pin. `AuditDecisionSinkLive.test.ts:506-527` pins `evaluationId`, `refusal._tag`, `reason`; after, `reason` becomes the `describeEncodeRefusal` call. No existing test checks `instanceof`, `recordTag` at the hook, or the hook payload's own keys (Q3).

### Q2. The barrel and gate 13

`packages/audit/src/index.ts` (verbatim, 16 lines) is `export *` of: `AuditArchive.ts`, `AuditDecisionSinkLive.ts`, `AuditEntry.ts`, `AuditPortReply.ts`, `AuditStagingPort.ts`, `AuditStagingPortTest.ts`, `AuditTrailPort.ts`, `AuditTrailPortTest.ts`, `AuditWriteOutcome.ts`, `InvalidAuditSinkOption.ts`, `Retention.ts`, `SequenceIntegrity.ts`, `SignatureCapturePort.ts`, `SignatureLedger.ts`, `SignatureLedgerConformance.ts`, `SignatureLedgerTest.ts`. **`AuditWriteReport.ts` is not in it.** [VERIFIED: `cat packages/audit/src/index.ts`]

| Name | In the barrel? | Where `spec/overview.md` lists it |
|------|----------------|-----------------------------------|
| `AuditEntryNotEncodable` | yes (`AuditEntry.ts`) | `:757` (row) |
| `encodeAuditEntry` | yes | `:758` |
| `AuditDecisionSinkOptions` (the sink's options interface, `export interface` at `AuditDecisionSinkLive.ts:44`) | yes | `:761` |
| `AuditWriteOutcome`, `WrittenStaging`, `UnwrittenStaging` | yes (`AuditWriteOutcome.ts`) | `:763` |
| `Durability`, `durabilityOf` | yes | `:764` |
| `AuditWriteEmitOptions`, `emitWriteOutcome`, `describeAuditWriteOutcome`, `AuditWriteReport`, `LostLabel`, `LOST_COUNTERS` | **no** (`AuditWriteReport.ts` is package-private) | not listed (correctly) |
| `StageResult`, `writtenStaging` | not exported at all (`interface StageResult` at `AuditDecisionSinkLive.ts:115`, `const writtenStaging` at :196) | n/a. **Keep them unexported**: `AuditDecisionSinkLive.ts` is `export *`ed |

**Gate 13 run both ways** on a scratch copy of `scripts/`, `spec/overview.md` and `packages/*/{package.json,src}` (the real repo untouched). Baseline on HEAD: `api-surface: 929 export(s) documented across 9 package(s)`. [VERIFIED: runs this session]

```
--- (a) class deleted, overview row kept
spec/overview.md  [stale] `AuditEntryNotEncodable` is listed in the API surface and is exported by nothing. Renamed or removed? (near table row 697 of the section)
1 API-surface drift(s). spec/overview.md must name every export of every public package.
--- (b) row removed too
api-surface: 928 export(s) documented across 9 package(s)
--- (c) two new exports in AuditWriteOutcome.ts, no overview row
packages/audit/src/AuditWriteOutcome.ts  [missing] `UnwrittenRow` is exported by @qadi/audit and is not named in spec/overview.md's Public API surface section. Add it to a table, or to "Not listed above" with a reason.
packages/audit/src/AuditWriteOutcome.ts  [missing] `unwrittenRowOf` is exported by @qadi/audit and is not named in spec/overview.md's Public API surface section. Add it to a table, or to "Not listed above" with a reason.
2 API-surface drift(s). spec/overview.md must name every export of every public package.
--- (d) with the overview row
api-surface: 930 export(s) documented across 9 package(s)
```

**The overview edit for the deletion:** delete the row at `:757`; reword `:758` to "…one `encodeSinkRecord` call, failing with core's `SinkRecordNotEncodable`…"; extend `:761`'s `onRefused` clause with "(core's `SinkRecordNotEncodable`)"; add the Rev bump through `node scripts/spec-revise.mjs spec/overview.md "<what>" --date 2026-11-16` (current Rev 1.114). The count goes 929 → 928 with the deletion, plus one per new public export. Removing the class does not need a "Not listed above" row.

### Q3. Base output of every outcome leaf

Produced by a throwaway vitest that drove each leaf through the public `AuditDecisionSinkLive` with `AuditTrailPortTest`/`AuditStagingPortTest`/`AuditPortReply`, a `Logger.make` that also records `options.cause`, a `Tracer.make` span collector, and `isolatedMetrics`, and wrote the result to JSON. `Vitest: Tests 13 passed (13)`. The tripping record of the three `Skipped` rows also logs and counts; the table below subtracts it (deltas). [VERIFIED: probe output]

**How each leaf is driven** (spec of the probe, all through `failureThreshold: 1`, `storeCallTimeout: "5 seconds"`):

| Leaf | wired | open | encode | stage | write | commit |
|------|-------|------|--------|-------|-------|--------|
| `Refused` | no | no | refused (`resource: { tags: new Set(["x"]) }`) | | | |
| `Written.NotWired` | no | no | ok | | ok | |
| `Written.StageFailed` | yes | no | ok | `Fail` | ok | |
| `Written.Committed` | yes | no | ok | ok | ok | ok |
| `Written.CommitFailed` | yes | no | ok | ok | ok | `Fail` |
| `WriteFailed.NotWired` | no | no | ok | | `Fail` | |
| `WriteFailed.Staged` | yes | no | ok | ok | `Fail` | |
| `WriteFailed.StageFailed` | yes | no | ok | `Fail` | `Fail` | |
| `Skipped.NotWired` | no | **yes** | ok | | | |
| `Skipped.Staged` | yes | yes | ok | ok | | |
| `Skipped.StageFailed` | yes | yes | ok | `Fail` | | |

"Open" is forced deterministically: a first record (`evaluationId: "trip"`) whose write fails opens a threshold-1 breaker, then the target arrives (`driveExit.ts:104-112` does the same: any non-target entry's write is `AuditPortReply.Fail({ cause: "trip" })`). No clock is needed for `Fail` replies; only `Never`/`Latch` replies need `TestClock.adjust`.

**What each leaf emits at the base** (target record only; counters are deltas; `evaluationId` is `"target"`). Every non-refusal line's annotations are exactly `{ "evaluationId": "target" }`, and its `message` array holds the message string alone (a `Cause` argument is lifted into `options.cause` by `logWithLevel`, `effect/src/internal/effect.ts:6698-6716`):

| Leaf | Log line (level, message) | Span attributes (`qadi.audit.record`) | Counters moved |
|------|---------------------------|----------------------------------------|----------------|
| `Refused` | `Warn`, `["qadi/audit: a decision record could not be encoded for the audit trail; no row was written"]`, annotations `{"qadi.refusal":"Opaque","qadi.path":"resource.tags","evaluationId":"target"}`, cause empty | `outcome: "Refused"`, `durability: "Refused"` | `WRITES_COUNTERS.encode_failed` |
| `Written.NotWired` | none | `"Written.NotWired"` / `"Trail"` | `WRITES_COUNTERS.written` |
| `Written.StageFailed` | none | `"Written.StageFailed"` / `"Trail"` | `written`, `STAGING_COUNTERS.failed` |
| `Written.Committed` | none | `"Written.Committed"` / `"Trail"` | `written`, `STAGING_COUNTERS.staged` |
| `Written.CommitFailed` | `Warn`, `["audit staging commit failed: entry is durable in the trail, but its staged copy will remain marked uncommitted in the staging store"]`, **cause present** (`AuditStagingError`, first line `AuditStagingError: `) | `"Written.CommitFailed"` / `"Trail"` | `written`, `staged`, `commit_failed` |
| `WriteFailed.NotWired` | `Warn`, `["audit entry dropped: trail write failed and no staging port wired"]` | `"WriteFailed.NotWired"` / `"Lost"` | `WRITES_COUNTERS.write_failed`, `LOST_COUNTERS.write_failed.not_wired` |
| `WriteFailed.Staged` | `Info`, `["audit entry not written: trail write failed; its staged copy is left for reconciliation"]` | `"WriteFailed.Staged"` / `"StagingOnly"` | `write_failed`, `STAGING_COUNTERS.staged` |
| `WriteFailed.StageFailed` | `Warn`, `["audit entry dropped: trail write failed and staging failed"]` | `"WriteFailed.StageFailed"` / `"Lost"` | `write_failed`, `STAGING_COUNTERS.failed`, `LOST_COUNTERS.write_failed.failed` |
| `Skipped.NotWired` | `Warn`, `["audit entry dropped: circuit breaker open and no staging port wired"]` | `"Skipped.NotWired"` / `"Lost"` | `WRITES_COUNTERS.skipped_open`, `STAGING_COUNTERS.skipped_open`, `LOST_COUNTERS.skipped_open.not_wired` |
| `Skipped.Staged` | `Info`, `["audit entry not written: circuit breaker open; its staged copy is left for reconciliation"]` | `"Skipped.Staged"` / `"StagingOnly"` | `skipped_open`, `STAGING_COUNTERS.staged` |
| `Skipped.StageFailed` | `Warn`, `["audit entry dropped: circuit breaker open and staging failed"]` | `"Skipped.StageFailed"` / `"Lost"` | `skipped_open`, `STAGING_COUNTERS.failed_open`, `LOST_COUNTERS.skipped_open.failed` |

The span carries exactly those two attributes (`Object.fromEntries(span.attributes)` printed two keys for every leaf). Metric exports: `WRITES_COUNTERS`, `STAGING_COUNTERS`, `LOST_COUNTERS` (`AuditWriteReport.ts:158, 184, 196`); the untagged bases `writesTotal`, `stagingTotal`, `entriesLostTotal` are deliberately unexported.

**`Refused` with an `onRefused` hook** (the payload, verbatim from the probe): no line is logged; `WRITES_COUNTERS.encode_failed` is still 1; the hook received `{"ownKeys":["stack","recordTag","evaluationId","refusal","reason","_tag",<a symbol>],"_tag":"AuditEntryNotEncodable","recordTag":"Decision","evaluationId":"target","refusalTag":"Opaque","isError":true,"reason":"resource.tags: a Set has no JSON form"}`. After the change the object is core's: `_tag` `"SinkRecordNotEncodable"`, no `reason`. Everything else in that payload (`recordTag`, `evaluationId`, `refusal`) must stay byte-identical.

**What existing tests already pin, and what is unpinned today**

| Observable | Pinned by | Unpinned |
|------------|-----------|----------|
| Projection of every leaf (labels, level, message, cause identity) | `AuditWriteOutcome.test.ts` `ROWS` (11 rows, `deepStrictEqual` on `describeAuditWriteOutcome`) and "a lost report is set exactly when the entry is Lost" | |
| `durabilityOf` and `outcomePath` per leaf | the same `ROWS` | |
| Observed write/staging counters per exit, observed line count, message, level, `evaluationId` | `AuditWriteExits.test.ts` (21 exits; every expectation is **derived from `describeAuditWriteOutcome`**, so it ties emission to the projection, and the projection to `ROWS`) | independence from the projection |
| Which `LOST_COUNTERS` series moved | `Metrics.test.ts:223-256` (11 cases through `driveExit`'s `lostLabels`) | |
| Warn-when-lost, Info-when-staged | `AuditWriteOutcome.test.ts` last test (projection level) | the *emitted* level for each leaf is only checked through the derived Exits assertion |
| Span attributes | `AuditDecisionSinkLive.test.ts:769-795`, **one leaf** (`WriteFailed.NotWired`) | **ten leaves** |
| The annotation key set of an emitted line (`evaluationId` only) | nothing | all of them |
| The cause attached to the `CommitFailed` line | nothing | **real gap: Stryker survivor `L240 ConditionalExpression → true` (Q10)** |
| Default refusal warning | `AuditDecisionSinkLive.test.ts:488-504` (message `include`, the three annotations read one by one), `:557-577` (`EncodeFailed`: empty path, no getter text) | the exact message, the exact key set, absence of a reason |
| `onRefused` payload | `:506-527` (`evaluationId`, `refusal._tag`, `reason`) | `recordTag`, `_tag`, own keys, `instanceof` |
| A throwing `onRefused` / `onOutcome` | `:529-555`, `:737-767` | |

So the characterisation file is net-new work for four classes of cell: the annotation key sets, the `CommitFailed` cause, the ten span rows, and the hook payload's fields. It must not derive any expectation from `describeAuditWriteOutcome`: that function is what the phase edits.

**Caveat on D-06 as worded.** The statement "`durabilityOf(o) === "Lost"` ⇔ a lost counter ⇔ the line is a warning ⇔ span `Lost`" is true over the six unwritten leaves (`WriteFailed.*`, `Skipped.*`) and the lost-counter and span legs hold over all eleven, but "the line is a warning" is **not** an equivalence over all eleven: `Written.CommitFailed` logs `Warn` with durability `Trail`, and `Refused` logs `Warn` (core's report) with durability `Refused` (probe table above). The existing test already scopes it (`AuditWriteOutcome.test.ts`: `if (durability !== "Lost" && durability !== "StagingOnly") continue;`). State the scoped form in BEH/INV and in the test title. Open Question 2.

### Q4. Capture helpers and the harness

**Existing:**
- `packages/audit/test/driveExit.ts` (the ARCH-35 harness): `driveExit(spec: ExitSpec)` builds the sink over `AuditTrailPortTest`/`AuditStagingPortTest`, `collectingLogger()`, `isolatedMetrics`, and returns an `ExitObservation` (`outcome`, per-label `writes`/`staging` deltas, `lost`, `lostLabels`, `logs: { level, message[0], evaluationId }`, `rows`, `hookCalls`). Used by `AuditWriteExits.test.ts` and `Metrics.test.ts`. It does **not** return: the annotation set, the log cause, span attributes, the refusal hook payload.
- `@qadi/testing`: `collectingLogger()` → `{ lines, layer }` where `CapturedLog` is `{ message, level, annotations }` (`CollectingLogger.ts:14-23`, **no `cause`**); `collectingTracer(spans)` → `Layer<never>` (`CollectingTracer.ts`); `isolatedMetrics(effect)` provides a fresh `Metric.MetricRegistry`.
- Do **not** extend `collectingLogger` to add `cause`: `@qadi/core`'s tests keep a twin held equal by the `test-helper-twin` rule (`CollectingTracer.ts` header), so a change there is a cross-package edit.

**Recommended harness:** a new `packages/audit/test/observeLeaf.ts` (no existing test file changes shape), exporting one `observeLeaf(spec)` that runs exactly what the probe ran and returns `{ outcomeTag, path, logs: [{ level, message, annotations, cause }], span: { outcome, durability }, counters (the twelve series as deltas), hookPayload }`, built from:
1. a local `Logger.layer([Logger.make((o) => lines.push({ level: o.logLevel, message: o.message, annotations: o.fiber.getRef(References.CurrentLogAnnotations), cause: o.cause }))])`;
2. `collectingTracer(spans)` from `@qadi/testing`, reading the span named `"qadi.audit.record"` (`span.attributes` is a `Map`);
3. `isolatedMetrics`, reading each series through `Metric.value(WRITES_COUNTERS.x)` etc. (ADR-QD-123; no `"qadi_…"` literal, so `METRIC_ID_LITERAL_BUDGET` is untouched), taking deltas around the target record;
4. the `driveExit` spec shape (`wired`, `open`, `encode`, replies) so the two harnesses are driven identically.

**Metric isolation.** Needed per test, and `isolatedMetrics` is sufficient: the audit sink updates metrics on its own fiber (`Metric.update` inside `emitWriteOutcome`), so a fresh registry isolates them. Probe evidence: run in one vitest file, back to back, `Written.StageFailed` showed only `staging.failed: 1` and `Written.Committed` only `staging.staged: 1`, with no accumulation. The off-fiber exception (react's hydration counters) does not apply.

**Hard-coded expectations.** Write the eleven expected rows as literals (the table in Q3), not as a function of `describeAuditWriteOutcome`; assert whole values with `assert.deepStrictEqual`, including `annotations` as exactly `{ evaluationId: "target" }` and, for `Written.CommitFailed`, that `cause` is a `Cause` whose first failure has `_tag: "AuditStagingError"`. Assert the refusal payload through fields that survive the change (`recordTag`, `evaluationId`, `refusal` deep-equal `EncodeRefusal.Opaque({ path: ["resource", "tags"], kind: "Set", brand: "Set" })`) in the base-green file; the two fields that change by design (`_tag`, `reason`) are asserted in the AREF-01 plan's edit of the existing hook test, not in the characterisation.

### Q5. The lost/durability row (D-05, D-06)

Read in full: `AuditWriteOutcome.ts` (123 lines) and `AuditWriteReport.ts` (261 lines).

**Every place lost-ness is decided at the base:**

1. `AuditWriteOutcome.ts:101-107`, `unwrittenDurability`: `NotWired: () => durability("Lost")`, `Staged: () => durability("StagingOnly")`, `StageFailed: () => durability("Lost")`. Read by `durabilityOf` (:120-121) only.
2. `AuditWriteReport.ts:115-121`, `lostStaging`: `NotWired: () => lostWord("not_wired")`, `Staged: () => undefined`, `StageFailed: () => lostWord("failed")`. Read by `lostLabel` (:123-126) and so by the `LOST_COUNTERS` update.
3. `AuditWriteReport.ts:97-113`, `writeFailedStagingReport` and `skippedStagingReport`: `NotWired` and `StageFailed` use `warning(...)`, `Staged` uses `info(...)`. **A third restatement.**

**Confirmed: the `durabilityOf` doc is false today.** Its comment (`AuditWriteOutcome.ts:109-115`) says: "The single place "lost or not" is decided: the lost-entry counter, the warning-versus-info choice and a caller's dead-letter decision all read it, so they cannot disagree." `durabilityOf` is read by exactly one `packages/*/src` call site, the span attribute (`AuditDecisionSinkLive.ts:246`: `"qadi.audit.durability": durabilityOf(outcome),`); the counter reads `lostStaging`, and the level is chosen by the arms. After the phase the comment becomes true only if the level also reads the row (Open Question 3).

Today the three agree (the table test and the probe both show it), so nothing is wrong yet; the defect is that adding a fourth `UnwrittenStaging` variant means three independent decisions, and two of them (the level and the word) are not tied to `durabilityOf` by any type.

**The closed row.** Compiled under this repo's `tsconfig.test.json` (TypeScript 7.0.2), no `as`/`!`/`any`:

```ts
type LostWord = "not_wired" | "failed";
type UnwrittenRow =
  | { readonly durability: "StagingOnly" }
  | { readonly durability: "Lost"; readonly lost: LostWord };
```

Negative controls (each is a compile error, verified with `// @ts-expect-error` and a clean `tsc`): a `StagingOnly` row with `lost: "failed"`; a `Lost` row with no `lost`; `lost: "elsewhere"`; a table missing a variant (TS2741); a fourth `UnwrittenStaging` tag with the same `Match.tagsExhaustive` (`Property 'Extra' is missing in type '{ NotWired: () => UnwrittenRow; … }' but required in type 'TagHandlers<…>'`). Narrowing works with no cast: `const row = unwrittenRow(self); return row.durability === "Lost" ? row.lost : undefined;`.

Two forms compile and agree at runtime (probe test `rows`: `deepStrictEqual(unwrittenRow(s), unwrittenRowTable(s))`):
- **Match form (recommended).** Hoisted `Match.type<UnwrittenStaging>().pipe(Match.tagsExhaustive({…}))` with two builders (`lostRow(word)`, a `STAGING_ONLY` const), the file's own idiom ("A helper, not a literal: a `Match` arm returning `"Lost"` infers `string`", `AuditWriteOutcome.ts:98`). Its arms run per call, so Stryker scores them (the `ignoreStatic` setting skips only module-scope construction).
- **Table form.** `const ROWS: { readonly [K in UnwrittenStaging["_tag"]]: UnwrittenRow } = {…}` and `ROWS[self._tag]`; contextual typing keeps the literals, no builders. Equivalent, but its literals are static mutants (skipped by `ignoreStatic`), so it earns no mutation evidence, which is a reason to prefer the Match form.

**Where the row sits.** CONTEXT prefers "beside `UnwrittenStaging` in `AuditWriteOutcome.ts`". That module is `export *`ed, and `emit`'s consumer `AuditWriteReport.ts` is not, so the row would have to be exported, and its type too (declaration emit must name `UnwrittenRow`). Gate 13 then demands overview rows (scratch run (c) above). A cycle-free alternative keeps it package-private: a new leaf `UnwrittenRow.ts` that imports nothing, declares `UnwrittenRow` and a table keyed by the three literal tag names, and is imported by `AuditWriteOutcome.ts` (for `durabilityOf`) and `AuditWriteReport.ts`. A type import back from the leaf to `AuditWriteOutcome.ts` would be a madge cycle (`madge --circular --extensions ts,tsx packages/*/src`; ADR-QD-037 counts type imports), so the leaf must not name `UnwrittenStaging`; instead `AuditWriteOutcome.ts` assigns the leaf's table to `{ readonly [K in UnwrittenStaging["_tag"]]: UnwrittenRow }`, which fails to compile if a variant has no row. Open Question 5 asks the user.

**`lostLabel` reading the row** (Code Example 3): `row.durability === "Lost" ? { after, staging: row.lost } : undefined`. `LostLabel["staging"]` is `"not_wired" | "failed"` (`AuditWriteReport.ts:35`), the same type as the row's word; `LostLabel` is exported from a non-barrel module so it can keep its own declaration or alias the leaf's `LostWord`.

**The level** (Code Example 3): `unwrittenLine(staging, message)` returns `{ level: unwrittenRow(staging).durability === "Lost" ? "Warn" : "Info", message, cause: undefined }`, replacing the `warning`/`info` helpers (`AuditWriteReport.ts:84-85`) in the six unwritten arms. The arms keep their six message strings; the `Written.CommitFailed` line (`level: "Warn"`, :93) is not an unwritten line and stays literal. Output is byte-identical (the characterisation pins it).

**Import cycles:** `AuditWriteReport.ts` already has `import type { AuditWriteOutcome, UnwrittenStaging, WrittenStaging } from "./AuditWriteOutcome.ts"` (:24), so a value import from the same module adds no edge; `AuditWriteOutcome.ts` imports only `AuditEntry.ts` and `AuditStagingPort.ts` types and never `AuditWriteReport.ts`. `pnpm circular` is therefore unaffected by either option.

### Q6. `StageResult`, `writtenStaging`, and the `Refused` branches (D-09, D-10)

**Current `StageResult`** (`AuditDecisionSinkLive.ts:110-118`, verbatim):

```ts
interface StageResult {
  readonly staging: UnwrittenStaging;
  readonly commit: (() => Effect.Effect<void, AuditStagingError>) | undefined;
}
```

Constructors: `stageEntry` (:175-191) returns `{ staging: UnwrittenStaging.NotWired(), commit: undefined }` (:178), `{ staging: UnwrittenStaging.StageFailed(), commit: undefined }` (:184) and `{ staging: UnwrittenStaging.Staged(), commit: () => bounded(stagingPort.commit(handle), entry, AuditStagingError) }` (:187-190). Readers: `attemptWrite` reads `staged.staging` twice (:221, :226) and passes `staged` to `writtenStaging` (:228); `writtenStaging` (:196-204) reads `staged.commit === undefined` and `staged.staging._tag === "StageFailed" ? … : …`. It is non-exported.

**Closed replacement, compiled and run** (probe: `tsc` clean; `vitest` `Tests 3 passed (3)`):

```ts
type StageResult = Data.TaggedEnum<{
  NotWired: {};
  StageFailed: {};
  Staged: { readonly commit: () => Effect.Effect<void, AuditStagingError> };
}>;
const StageResult = Data.taggedEnum<StageResult>();
```

`writtenStaging` closes over nothing (it takes the stage result and calls the `commit` the `Staged` variant carries; `bounded` is applied where `commit` is *built*, in `stageEntry`), so it hoists to module scope as a `Match.type<StageResult>()` with `Effect` arms (Code Example 4). Probe run: `NotWired`→`NotWired`, `StageFailed`→`StageFailed`, a succeeding commit→`Committed`, `Effect.die("boom")`→`CommitFailed`.

**Getting the outcome's `staging` back out** (the part D-09 does not state): `attemptWrite` must put an `UnwrittenStaging` into `Skipped`/`WriteFailed`. The variants share tags with `UnwrittenStaging`, so `UnwrittenStaging[self._tag]()` converts with no restated mapping, and a tag present in one union but not the other is a compile error. Probe: `Object.keys(unwrittenOfIndex(StageResult.Staged({ commit })))` is `["_tag"]` (no `commit` leak). An explicit three-arm `Match` also compiles but restates an identity mapping, which is the defect class this phase removes.

**`evaluationIdOf`, `outcomePath` and the `Refused` branch of `emitWriteOutcome` (D-10).** Note: **`AuditWriteReport.ts` has a third `_tag === "Refused"` ternary that D-10 does not name**: `outcomePath` (:144-145), `self._tag === "Refused" ? self._tag : \`${self._tag}.${self.staging._tag}\``. D-10's reason ("the same defect class in the same file") covers it; recommend including it (Open Question 4). All three compile as module-scope `Match.type<AuditWriteOutcome>()` with `Match.tag("Refused", …)`, `Match.tag("Written", "WriteFailed", "Skipped", …)` and `Match.exhaustive` (multi-tag `Match.tag` is accepted; `Match.tagsExhaustive` with three identical arms is the alternative). Probe: a fifth `Extra` variant makes both an error (`TS2345`, "Extra" missing; verified with `@ts-expect-error`).

`emitWriteOutcome` needs per-call `options`/`report`, so its dispatch is `Match.value(outcome)` (once per record, the §5a-sanctioned case), with the refusal arm calling core's reporter and the other arm a small `logLine(report.log, evaluationId)` guarded by `typeof line === "object"` (Code Example 6). Probe: with `outcome.refusal: SinkRecordNotEncodable` this compiles clean; against HEAD's types the *only* error is the expected `AuditEntryNotEncodable is not assignable to SinkRecordNotEncodable` at the `reportEncodeRefusal` call, i.e. it type-checks exactly when AREF-01 lands. (The Effect language service adds a `TS377003 missingEffectError` diagnostic for the same line.)

**Budgets.** No `switch` is added or removed (`SWITCH_BUDGET` names only `Walk.ts` and `Matcher.ts`; `node scripts/check-house-style.mjs` on HEAD: `house-style: 521 file(s) clean (3 declared switch(es))`). No `Effect.fnUntraced` appears; `emitWriteOutcome` stays `Effect.fn("qadi.audit.emitWriteOutcome")` and `record` stays `Effect.fn("qadi.audit.record")`. `UNTRACED_BUDGET`/`SWITCH_BUDGET` are unchanged.

### Q7. The type pin (D-11)

**tstyche coverage for `@qadi/audit` exists.** `tstyche.json` is `{ "target": "6.0.3", "tsconfig": "tsconfig.test.json" }`; `pnpm test:tstyche` is `tstyche`. Existing audit `*.tst.ts`: `AuditArchive.tst.ts`, `AuditDecisionSinkLive.tst.ts`, `AuditPortReply.tst.ts`, `AuditWriteOutcome.tst.ts`, `Retention.tst.ts`, `SignatureCapturePort.tst.ts`, `SignatureLedger.tst.ts`. `AuditDecisionSinkOptions` is exported (`AuditDecisionSinkLive.ts:44`, `export interface`), so the pin can name `AuditDecisionSinkOptions["onRefused"]`.

**The pin** (new file, recommended name `packages/audit/test/AuditRefusal.tst.ts`, so the green `AuditDecisionSinkLive.tst.ts` is not turned red); ran as `pnpm exec tstyche packages/audit/test/Probe48.tst.ts` on HEAD:

```ts
import { expect, test } from "tstyche";
import type * as Effect from "effect/Effect";
import type { SinkRecordNotEncodable } from "@qadi/core";
import type { AuditDecisionSinkOptions } from "../src/AuditDecisionSinkLive.ts";
import type { encodeAuditEntry } from "../src/AuditEntry.ts";
import type { AuditWriteOutcome } from "../src/AuditWriteOutcome.ts";
import type { AuditWriteEmitOptions } from "../src/AuditWriteReport.ts";

test("onRefused takes core's SinkRecordNotEncodable", () => {
  expect<Parameters<NonNullable<AuditDecisionSinkOptions["onRefused"]>>[0]>().type.toBe<SinkRecordNotEncodable>();
});
test("the emit options' onRefused takes it too", () => {
  expect<Parameters<NonNullable<AuditWriteEmitOptions["onRefused"]>>[0]>().type.toBe<SinkRecordNotEncodable>();
});
test("Refused carries it", () => {
  expect<Extract<AuditWriteOutcome, { readonly _tag: "Refused" }>["refusal"]>().type.toBe<SinkRecordNotEncodable>();
});
test("encodeAuditEntry fails with it", () => {
  expect<Effect.Error<ReturnType<typeof encodeAuditEntry>>>().type.toBe<SinkRecordNotEncodable>();
});
```

**RED output on HEAD** (verbatim head and tail of the run):

```
uses TypeScript 6.0.3 with ./tsconfig.test.json

fail ./packages/audit/test/Probe48.tst.ts
  × onRefused takes core's SinkRecordNotEncodable
  × the emit options' onRefused takes it too
  × Refused carries it
  × encodeAuditEntry fails with it

Error: Type 'AuditEntryNotEncodable' is not the same as type 'SinkRecordNotEncodable'.
   (… the same message at :13:86, :16:91 and :19:73)

Targets:    1 failed, 1 total
Test files: 1 failed, 1 total
Tests:      4 failed, 4 total
Assertions: 4 failed, 4 total
Duration:   2.5s
```

**It does not break `pnpm typecheck`.** With the file present, `pnpm exec tsc -p tsconfig.test.json` printed no `packages/` error and `node scripts/check-house-style.mjs` stayed `521 file(s) clean`: a `.type.toBe` mismatch is a tstyche failure, not a tsc one. So the RED pin can be committed without turning the per-task typecheck red; only `pnpm test:tstyche` is red until AREF-01, so the verify steps of Plans before it must run `pnpm test:tstyche` with the file excluded by exact path (the hygiene rule in `_SHARED-CONTEXT.md`). The file is deleted after the probe.

A runtime RED row complements it: `assert.instanceOf(failure, SinkRecordNotEncodable)` in `AuditEntry.test.ts` (Q1) is RED on the base and green after.

### Q8. ADR check (AREF-04)

**ADR-QD-054** (`spec/decisions/054-a-companion-package-may-compile-a-dialect.md`) is about a *compile-only dialect package*. The sentence the class's doc borrowed, verbatim (the Decision's "Refuse rather than approximate" section):

> Each companion package declares its own unprefixed `PredicateNotRenderable` error, matching `PolicyNotTranslatable`'s shape — not shared via `@qadi/core`, because `@qadi/core` has no reason to know this error exists.

It is followed immediately by the ADR's own correction (`054-…md:97-99`, verbatim):

> **Amended by [ADR-QD-079](./079-renderability-is-a-core-rule.md) (2026-10-04).** The paragraph above is superseded:
> `@qadi/core` now declares the one `PredicateNotRenderable` (a `QadiError` member, code `ACL018`) and both
> packages re-export it. Ticket 95's shared-`_tag` rationale no longer applies.

So (a) the sentence names `PredicateNotRenderable`, not an audit error; (b) it is superseded for that very error by the same pattern this phase applies; (c) the audit class's doc (`AuditEntry.ts:63-66`: "declared here rather than shared, per ADR-QD-054: `@qadi/core` has no reason to know this error exists") copied the sentence out of context, and `AuditEntry.ts:26-32` stretches "each companion package owns its shape — that principle covers *error* types (ADR-QD-054)". ADR-054 contains no sentence about audit or about reusing core's types. **It does not forbid reusing `SinkRecordNotEncodable`.**

**ADR-QD-056** (`056-audit-companion-package.md`). The boundary it states, verbatim:

> `@qadi/audit` may exist; `@qadi/core` still may not depend on it, and does not … `@qadi/core` gains zero new dependencies.
> `@qadi/audit` hangs off `packages/core/src/DecisionSink.ts` — write-only, read via `Effect.serviceOption`, error channel `never` by design — the same seam ADR-QD-054's companion packages need nothing from `@qadi/core` to reach.

Reusing a core error adds no dependency in core's direction and touches no seam; audit already imports `encodeSinkRecord`, `SinkRecordJson`, `EncodeRefusal` and `SinkRecordNotDecodable` from `@qadi/core` (`AuditEntry.ts:39-49`), and `decodeAuditEntry` already *returns* core's `SinkRecordNotDecodable` (`AuditEntry.ts:187`). The only places 056 touches the error's ownership are two amendments that **chose** it, citing ADR-QD-054:
- `:299-301` (CCR-QD-179): "`AuditEntryNotEncodable` gains `refusal` (core's `EncodeRefusal`); it stays this package's own error, per ADR-QD-054 ([ADR-QD-095](./095-sinkcodec-owns-both-directions.md))."
- `:335-342` (CCR-QD-193): "… calls `AuditDecisionSinkOptions.onRefused` with the `AuditEntryNotEncodable` (which carries `evaluationId`) … The wording, the annotations and the hook's containment are core's … this package keeps its own error and its own message (ADR-QD-054)."
- `:101` (the Decision): "fails `AuditEntryNotEncodable` rather than being partially written, coerced, or silently dropped — the same rule ADR-QD-054 generalized for predicate compilation, one layer further from the wire." The "rule" there is *refuse rather than approximate*, which the change keeps.

The unchanged half of that last quote is the point: ADR-056 requires refusing, not owning the error. **It does not forbid the change; three of its sentences name the old class and need a revision note.** What ADR-056's `:340-341` ("keeps its own message") says stays true: audit keeps its own message (`"qadi/audit: a decision record could not be encoded for the audit trail; no row was written"`) and its own hook.

**ADR-QD-095** names the class at `:65` (D-09-e's table: "Audit: `AuditEntryNotEncodable` gains `refusal`, and `reason` is that refusal as a sentence"), and in the 2026-10-07 amendment blockquote at `:151` and `:168` (history). D-09-e's operative rule, "Each adapter keeps its own message and its own hook", is unaffected.

**How to record.** ADR-QD-056 follows the pattern its own Rev 1.13 used for ADR-QD-126 (change-history entry, no status change) plus a new dated section: bump to Rev 1.14 with `node scripts/spec-revise.mjs spec/decisions/056-audit-companion-package.md "<what>" --date 2026-11-16`, append `## Amendment (2026-11-16, ADR-QD-161, CCR-QD-439)` after `:413-420`, and leave the three old sentences as they are with a `>` pointer, the form ADR-054 itself uses for superseded text (quoted above). ADR-QD-095: add a `> **Superseded for audit by ADR-QD-161.**` note under the `:65` row and a revision entry. `spec/decisions/index.yaml` needs no entry change for 056 and 095 (their `status` lines stay; ADR-QD-158's amendment of 126 changed 126's status line because it changed behaviour, here the `status` of 056 is "Accepted — narrows ADR-QD-016" and stays).

**The ADR template and index entry.** ADR-QD-160 (`160-port-facts-are-read-from-the-description.md`) is the model: a `> **Document Control**` table (rows `Document ID` `QADI-ADR-161` (gate 10 requires it to equal the file number), `Revision`, `Effective Date`, `Status`, `Author` `Qadi Engineering`, `Classification` `Architecture Decision Record`, `Change History`), then `## Context`, `## Decision` (numbered), `## Alternatives considered`, `## Consequences`, `## Related`. The index entry shape (`spec/decisions/index.yaml`, verbatim for 160):

```yaml
  - id: "ADR-QD-160"
    file: "160-port-facts-are-read-from-the-description.md"
    title: "Port facts are read from the description"
    status: "Accepted — reads ADR-QD-094, ADR-QD-109"
```

For 161: `id: "ADR-QD-161"`, a file name like `161-audit-reports-cores-refusal-and-derives-lost-from-durability.md`, `status: "Accepted — amends ADR-QD-056, ADR-QD-095"`. Gate checks: `spec/scripts/verify-traceability.sh` (index↔disk, ADR Document ID = file number, ADR traced in `traceability.md`, Revision = newest history entry, relative-link integrity incl. no link into a gitignored path).

### Q9. Spec records

**Reserved ids all free.** `grep` over `spec/`, `packages/*/src`, `packages/*/test`, `.changeset/`, `AGENTS.md`, `apps/website/src` for `BEH-QD-57[6-9]`, `BEH-QD-580`, `INV-QD-34[12]`, `ADR-QD-161`, `CCR-QD-439`: no hit for any. `ARCH-95` appears only in `.planning/ROADMAP.md:376, 590` and `REQUIREMENTS.md:67`. The reservation file `$(git rev-parse --git-common-dir)/qadi-reserved-ids.json` holds `"CCR": 443, "ADR": 165, "BEH": 600, "INV": 350` (read only). [VERIFIED]

**Where the behaviours live.** `spec/behaviors/33-audit-pipeline.md` (Rev 1.21): BEH-QD-249 (the options listing at `:26-31`, `onRefused?: (refusal: AuditEntryNotEncodable) => void;`), BEH-QD-250 (`:60`, the refusal: listing, five REQUIREMENT lines, the last stating `.reason`), BEH-QD-252 (`:510`, the eleven-leaf table at `:547-565`, whose `Refused` row says "`onRefused`, else a warning (core's report)" and stays true), BEH-QD-251, -379, -561. Existing invariants: INV-QD-106 (`spec/invariants.md:3298`, "Every audit record has exactly one write outcome", whose Source and Enforcement lines name `durabilityOf`, `AuditWriteOutcome.test.ts`, `AuditWriteExits.test.ts`), INV-QD-104 (`:3215`, "A refusal report says where, never what"; its Source already reads through core), INV-QD-052.

**Proposed record map** (the planner finalises; ids are the reserved ones):

| Id | Suggested statement | Home |
|----|--------------------|------|
| BEH-QD-576 | `encodeAuditEntry`, `AuditWriteOutcome.Refused.refusal` and `onRefused` carry core's `SinkRecordNotEncodable`; the audit class and its `reason` are gone | `33-audit-pipeline.md` (BEH-QD-250's listing and its two class-naming REQUIREMENTS restated) |
| BEH-QD-577 | A refused record's default line is core's report byte for byte (message, `qadi.refusal`, `qadi.path`, `evaluationId`, no reason); a hook that wants the sentence calls `describeEncodeRefusal(e.refusal)` | `33-audit-pipeline.md` |
| BEH-QD-578 | One closed row per unwritten staging says whether the entry is lost and which word names why; `durabilityOf`, the lost label and the line's level read it | `33-audit-pipeline.md`, next to BEH-QD-252's table |
| BEH-QD-579 | Across the eleven leaves, the span's `qadi.audit.durability`, the lost counter and (over the unwritten leaves) the warning agree | `33-audit-pipeline.md` |
| BEH-QD-580 | The stage result is a closed union (only `Staged` carries `commit`); the staging conversion, `evaluationIdOf`, `outcomePath` and the refusal branch are exhaustive | `33-audit-pipeline.md` |
| INV-QD-341 | An unwritten entry is lost exactly when its variant's row says so; the span attribute, counter and line level are readings of that row | `spec/invariants.md`, after INV-QD-340 (`:3923`) |
| INV-QD-342 | An audit refusal is the one `SinkRecordNotEncodable` core, forwarding and http report; the audit package adds no error of its own for it | `spec/invariants.md` |

**Record checklist** (Phase 47's CCR-QD-438 row at `spec/README.md:375` is the model; each document's revision is bumped with `node scripts/spec-revise.mjs <file> "<what>" --date 2026-11-16`): `spec/behaviors/33-audit-pipeline.md`; `spec/invariants.md` (INV-QD-341/342 new; INV-QD-106's Source/Enforcement/Implication amended in place to name the row and the new tests); `spec/traceability.md` (Rev 1.199 at HEAD: BEH row at `:75` gains `BEH-QD-576–580`; INV rows near `:169-172`; ADR row near `:326`; §4 test-file rows near `:574-596` for the new test files; the verifier checks "§4 test files → disk" so every named file must exist); `spec/decisions/161-….md` (new), `spec/decisions/index.yaml`, `spec/decisions/056-…md` and `095-…md` (Q8); `spec/overview.md` (Q2); `spec/README.md` (a new `CCR-QD-439` row after `:375`: date, files with Revs, then "Phase 48. **ARCH-95, …**" prose ending "Used: ARCH-95, ADR-QD-161, CCR-QD-439, BEH-QD-576..580, INV-QD-341..342. Unused: none."; the "CCR register coverage" check requires every cited CCR id registered; plus README's own Rev bump); `.changeset/<name>.md`; `apps/website/.../upgrading.md`; `packages/audit/README.md`; the website `capabilities.md`; `packages/core/src/JsonRefusal.ts:141`. `AGENTS.md` needs no edit (it names none of the changed items; `grep` for `AuditEntry`/`Durability` returned nothing relevant).

**Changeset shape** (copy `.changeset/audit-options-refused-when-built.md`, Phase 45): front matter `"@qadi/audit": minor` (the `fixed` group moves all nine together, `.changeset/config.json`; `@qadi/audit` is `0.12.0`), body starting `**Breaking.**`, ending "See the 0.13 section of the upgrade guide, `/docs/reference/upgrading/`." State: `AuditEntryNotEncodable` is removed; `encodeAuditEntry` fails, and `onRefused` and `AuditWriteOutcome.Refused.refusal` carry, core's `SinkRecordNotEncodable` (`_tag` `"SinkRecordNotEncodable"`, code `ACL019`); its `reason` is gone (`describeEncodeRefusal(e.refusal)` gives the sentence); `catchTag("AuditEntryNotEncodable")` must name the new tag; the default warning, the span, the metrics and every other log line are unchanged. A comment-only edit to core (`JsonRefusal.ts`) needs no core changeset; if Option S (Q5) is chosen, the changeset also lists the added `UnwrittenRow`/`unwrittenRowOf` exports (additive, not Breaking).

**The 0.13 upgrading entry.** `apps/website/src/content/docs/docs/reference/upgrading.md` has `## 0.13:` headings at `:619, 664, 693, 716, 742, 773, 794`; the newest is `## 0.13: a port's defaulted state is read from the port, not its name` (`:794`). Add `## 0.13: audit reports core's refusal, and AuditEntryNotEncodable is gone` after it, in the format of `:742-771` (the Phase 45 entry): one paragraph naming the break, a ` ```ts ` **Before** fence (not compiled), an **After** fence in ` ```typescript ` (compiled by `scripts/check-website-doc-examples.mjs`, so it must compile against the new types: an `onRefused: (e: SinkRecordNotEncodable) => … describeEncodeRefusal(e.refusal)` hook and `Effect.catchTag("SinkRecordNotEncodable", …)` on `encodeAuditEntry`; I could not compile it on HEAD because it only type-checks after the change, so the plan's close step runs `pnpm spec:website-examples`), then "The decision is [ADR-QD-161](https://github.com/leaderiop/qadi/blob/main/spec/decisions/161-….md)."

**Docs that must be edited, by passage.** `packages/audit/README.md:55` and `capabilities.md:44` (the class name), plus `:77`/`:109` (`Refused | nowhere (never encodable) | encode_failed | | onRefused, else a warning naming the refusal`) which stay true. `packages/core/src/JsonRefusal.ts:139-142` (the doc comment of `describeEncodeRefusal`, quoted in Q1).

**Do the fences compile after the change?** No ` ```typescript ` fence in `spec/` or `apps/website/src` names the class or audit's `onRefused`: the class appears only in the ` ```ts ` listing at `33-audit-pipeline.md:62-66` (a signature listing, not compiled) and in prose; the website's `onRefused` fences at `upgrading.md:246-254` are core's `decisionFrames`. So `spec:examples` and `spec:website-examples` need only keep passing, apart from the new After fence.

### Q10. Mutation evidence

- **Config:** `stryker.audit.mjs` (verbatim essentials): `testRunner: "vitest"`, `vitest: { configFile: "packages/audit/vitest.config.ts", dir: "packages/audit" }`, `coverageAnalysis: "perTest"`, `ignoreStatic: true`, `jsonReporter: { fileName: "reports/mutation-audit/mutation.json" }`, `htmlReporter: { fileName: "reports/mutation-audit/index.html" }`, `thresholds: { high: 90, low: 80, break: 80 }`, `timeoutMS: 20000`. The report path is gitignored (`.gitignore:19` `reports/*`); there was an older one-file report there, now overwritten by this run.
- **Exact command** (run in the background with the log in the scratchpad; a non-zero exit after "below breaking threshold" with the report written is not a failed baseline):

```
pnpm exec stryker run stryker.audit.mjs --mutate 'packages/audit/src/AuditEntry.ts,packages/audit/src/AuditWriteOutcome.ts,packages/audit/src/AuditWriteReport.ts,packages/audit/src/AuditDecisionSinkLive.ts'
```

- **Run time:** `Found 4 of 5347 file(s) to be mutated. Instrumented 4 source file(s) with 270 mutant(s)`, `Done in 20 seconds`, `21.199 total` wall. [VERIFIED: log]
- **Scores at HEAD** (unrounded `(Killed+Timeout)/(Killed+Timeout+Survived+NoCoverage)`, computed from `reports/mutation-audit/mutation.json`; Ignored mutants are static ones skipped by `ignoreStatic`):

| File | Killed | Survived | Ignored (static) | Score |
|------|--------|----------|------------------|-------|
| `packages/audit/src/AuditDecisionSinkLive.ts` | 59 | 0 | 1 | **1** |
| `packages/audit/src/AuditEntry.ts` | 19 | 0 | 8 | **1** |
| `packages/audit/src/AuditWriteOutcome.ts` | 5 | 0 | 10 | **1** |
| `packages/audit/src/AuditWriteReport.ts` | 85 | 3 | 80 | **0.9659090909090909** |

`All files 98.25`. The base file (shape of Phase 45's `45-mutation-base.json`; written by a retargeted 44-01/45-01 writer that refuses a stale report, a report holding other files, and a report whose `source` is not the file on disk): `{"measured":{"packages/audit/src/AuditDecisionSinkLive.ts":1,"packages/audit/src/AuditEntry.ts":1,"packages/audit/src/AuditWriteOutcome.ts":1,"packages/audit/src/AuditWriteReport.ts":0.9659090909090909},"unmeasured":{},"new":[],"deleted":{},"moved":{}}` as `.planning/phases/QD-48-…/48-mutation-base.json`. **Re-run it on the untouched tree before writing it**: this session's report is from the phase base but is older than any test file the phase adds, and the writer's staleness check will rightly reject it.

- **The three survivors, all in `AuditWriteReport.ts`** (`mutation.json`, `L238`/`L240`):
  1. `L238` `ConditionalExpression → true` on `report.log !== "encodeRefusal"` (`} else if (report.log !== undefined && report.log !== "encodeRefusal") {`): equivalent, the `Refused` outcome never reaches the `else`.
  2. `L238` `StringLiteral "encodeRefusal" → ""`: the same equivalent mutant.
  3. `L240` `ConditionalExpression → true` on `cause === undefined ? [message] : [message, cause]` (`yield* Effect.logWithLevel(level)(...(cause === undefined ? [message] : [message, cause]))`): **a real gap**. Forcing the condition true drops the cause from the `CommitFailed` line, and no test notices (Q3). The characterisation kills it.

  So the comparison has room: killing #3 and replacing the redundant guard with `typeof line === "object"` (no equivalent mutants) can only raise the file's score, while a design that keeps the redundant guard re-creates #1 and #2 and may not clear 0.9659 unless #3 is killed. "A drop is closed with a test, never re-baselined" (`REQUIREMENTS.md` WX-05).
- **New file:** under Option P (Q5) `UnwrittenRow.ts` has no base; record it as `new` and run it once after (`--mutate` its path), requiring no survivor that is not a documented equivalent.
- **Close:** the same invocation after the phase, then a node comparer that fails if any file in `measured` scores below its base (`XC-05`, `_SHARED-CONTEXT.md:59-61`: "'The report exists' is not a check"); write `48-mutation-after.json` as `{path: score}`.

### Q11. Validation Architecture

See the dedicated section below.

### Q12. Security Domain

See the dedicated section below.

## Common Pitfalls

### Pitfall 1: a characterisation that derives its expectation from the code under change
**What goes wrong:** `AuditWriteExits.test.ts` compares observed output to `describeAuditWriteOutcome(outcome)`. If the characterisation did the same, a change to that projection would move expectation and observation together and the test stays green.
**How to avoid:** hard-code the eleven rows (Q3) and assert whole values (`deepStrictEqual`), including annotation key sets and the `CommitFailed` cause.
**Warning signs:** the new test imports `describeAuditWriteOutcome`.

### Pitfall 2: D-06 stated as a four-way equivalence over all eleven leaves
**What goes wrong:** `Written.CommitFailed` is `Warn`/`Trail` and `Refused` is `Warn`/`Refused`, so "warning ⇔ Lost" fails for two leaves and the test would be written wrong or the leaves excluded silently.
**How to avoid:** assert Lost ⇔ lost counter ⇔ span `"Lost"` over all eleven, and Warn ⇔ Lost over the six unwritten leaves, naming the two Warn-but-not-Lost leaves explicitly. Open Question 2.

### Pitfall 3: a leak of `commit` into the outcome
**What goes wrong:** `Skipped({ entry, staging: stageResult })` compiles if `StageResult`'s variants are structural subtypes of `UnwrittenStaging`, and then `onOutcome` sees `staging.commit`.
**How to avoid:** convert with `UnwrittenStaging[self._tag]()` and keep a characterisation row asserting the hook's `outcome.staging` own keys are `["_tag"]` (probe: `["_tag"]`).

### Pitfall 4: a new public export from a barrel module
**What goes wrong:** exporting the row, `StageResult` or `writtenStaging` from `AuditWriteOutcome.ts`/`AuditDecisionSinkLive.ts` makes it public: gate 13 fails `[missing]` (Q2 run (c)) and the surface grows by accident.
**How to avoid:** keep `StageResult`/`writtenStaging` unexported; decide Open Question 5 deliberately.

### Pitfall 5: a RED file turning the per-task gate red
**What goes wrong:** the RED tstyche pin is red under `pnpm test:tstyche` until AREF-01. It is green under `tsc`, so `pnpm typecheck` is fine (verified), but any verify step running `pnpm test:tstyche` fails.
**How to avoid:** exclude the file by exact path in the verify steps of every plan before AREF-01 (shared-context hygiene), and put it in its own file.

### Pitfall 6: tests that name an export that does not exist yet
**What goes wrong:** a Wave 0 test importing `unwrittenRowOf`, `SinkRecordNotEncodable` as the hook parameter type in a value position, etc., breaks `pnpm typecheck` on the base (Phase 47 Pitfall 1).
**How to avoid:** Wave 0 files import only what exists at the base (`encodeAuditEntry`, `durabilityOf`, the counters, `@qadi/core`'s `SinkRecordNotEncodable`, which already exists). The unit test of the row itself is written in the AREF-02 plan with the row.

### Pitfall 7: the comparison base measured after a test change
**What goes wrong:** the Stryker base must be measured on the untouched tree with the same invocation; adding the characterisation first changes which mutants are killed.
**How to avoid:** the base JSON is the phase's first commit, alone; the characterisation follows. (Both orders are legitimate under WX-05 as long as the comparison is on the same invocation; the roadmap and D-12 fix the order.)

### Pitfall 8: link integrity to ignored paths
**What goes wrong:** `verify-traceability.sh` fails a relative link into a gitignored path (`reports/`, `.planning/`); the ADR must not link to the mutation report or phase files.
**How to avoid:** cite the evidence by prose.

## Code Examples

All compiled under `pnpm exec tsc -p tsconfig.test.json` (TypeScript 7.0.2) as temporary files, then deleted; examples 1, 4 and 5 were also run.

### 1. `encodeAuditEntry` after (AREF-01)
```ts
// packages/audit/src/AuditEntry.ts
export const encodeAuditEntry = Effect.fn("qadi.audit.encodeAuditEntry")(function* (record: SinkRecord) {
  const json = yield* Effect.fromResult(encodeSinkRecord(record));
  const entry: AuditEntry = { record: json, sequenceNumber: undefined };
  return entry;
});
// Error channel: SinkRecordNotEncodable (pinned by the RED tstyche file, Q7).
```

### 2. The closed row, Match form (AREF-02, Q5)
```ts
type LostWord = "not_wired" | "failed";
type UnwrittenRow =
  | { readonly durability: "StagingOnly" }
  | { readonly durability: "Lost"; readonly lost: LostWord };

// Builders, not literals: a Match arm returning an object literal infers `string` for its fields.
const lostRow = (lost: LostWord): UnwrittenRow => ({ durability: "Lost", lost });
const STAGING_ONLY: UnwrittenRow = { durability: "StagingOnly" };

const unwrittenRow: (self: UnwrittenStaging) => UnwrittenRow = Match.type<UnwrittenStaging>().pipe(
  Match.tagsExhaustive({
    NotWired: () => lostRow("not_wired"),
    Staged: () => STAGING_ONLY,
    StageFailed: () => lostRow("failed"),
  }),
);
```

### 3. Three readings of the row (AREF-02)
```ts
// AuditWriteOutcome.ts — replaces unwrittenDurability
WriteFailed: (o) => durability(unwrittenRow(o.staging).durability),
Skipped:     (o) => durability(unwrittenRow(o.staging).durability),

// AuditWriteReport.ts — replaces lostStaging + lostLabel
const lostLabel = (after: LostLabel["after"], staging: UnwrittenStaging): LostLabel | undefined => {
  const row = unwrittenRow(staging);
  return row.durability === "Lost" ? { after, staging: row.lost } : undefined; // narrows, no cast
};

// AuditWriteReport.ts — replaces warning()/info() in the six unwritten arms (recommended, Open Question 3)
const unwrittenLine = (staging: UnwrittenStaging, message: string): LogLine => ({
  level: unwrittenRow(staging).durability === "Lost" ? "Warn" : "Info",
  message,
  cause: undefined,
});
// e.g. NotWired: (s) => stagingReport([], unwrittenLine(s, DROPPED_WRITE_UNWIRED)),
```

### 4. `StageResult` and the hoisted `writtenStaging` (AREF-03)
```ts
type StageResult = Data.TaggedEnum<{
  NotWired: {};
  StageFailed: {};
  Staged: { readonly commit: () => Effect.Effect<void, AuditStagingError> };
}>;
const StageResult = Data.taggedEnum<StageResult>();

// Module scope: closes over nothing (`bounded` is applied where `commit` is built, in stageEntry).
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
`stageEntry` returns `StageResult.NotWired()`, `StageResult.StageFailed()`, or `StageResult.Staged({ commit: () => bounded(stagingPort.commit(handle), entry, AuditStagingError) })`.

### 5. Converting a stage result into the outcome's `staging` (no restated mapping, no `commit` leak)
```ts
// Tag identity between the two unions is the compiler's check; result own keys are ["_tag"].
const unwrittenOf = (self: StageResult): UnwrittenStaging => UnwrittenStaging[self._tag]();
// attemptWrite: Skipped({ entry, staging: unwrittenOf(staged) }), WriteFailed({ entry, staging: unwrittenOf(staged) })
```

### 6. The `Refused` branches as exhaustive matches (D-10, and `outcomePath`)
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

const logLine = (line: AuditWriteReport["log"], evaluationId: string) =>
  typeof line === "object"
    ? Effect.logWithLevel(line.level)(...(line.cause === undefined ? [line.message] : [line.message, line.cause])).pipe(
        Effect.annotateLogs({ evaluationId }),
      )
    : Effect.void;

// inside emitWriteOutcome (Effect.fn, unchanged name), replacing the if/else-if:
yield* Match.value(outcome).pipe(
  Match.tag("Refused", (o) =>
    reportEncodeRefusal(o.refusal, {
      message: "qadi/audit: a decision record could not be encoded for the audit trail; no row was written",
      onRefused: options.onRefused,
    }),
  ),
  Match.tag("Written", "WriteFailed", "Skipped", () => logLine(report.log, evaluationId)),
  Match.exhaustive,
);
```
(The message literal is the base's, `AuditWriteReport.ts:234-235`, and must stay byte-identical.)

## State of the Art

| Old | Current | When | Impact |
|-----|---------|------|--------|
| Audit's own `AuditEntryNotEncodable` (+ `reason`) | core's `SinkRecordNotEncodable` | this phase (ADR-QD-161) | one refusal type for forwarding, http, audit; one fewer error class |
| Same pattern, predicate packages | core declares `PredicateNotRenderable`, packages re-export | ADR-QD-079, 2026-10-04 | the precedent the ADR cites |
| Three restatements of "lost" | one row | this phase | a new variant is one compile error |
| `if (outcome._tag === "Refused")` and ternaries on a tagged union | `Match.tag(...)` + `Match.exhaustive` | this phase | a new outcome tag is a compile error |

**Deprecated/outdated:** `AuditEntryNotEncodable` and its doc's reading of ADR-QD-054; the doc comment on `durabilityOf` (false today); the roadmap's line numbers for the two options (`:78`, `AuditWriteReport.ts:209`), which CONTEXT.md already updated.

## Runtime State Inventory

Not a rename or data-migration phase in the sense of persisted names: the deleted class's `_tag` is a runtime error tag, not stored anywhere. Stated explicitly per category:

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | None. `AuditEntryNotEncodable` is never persisted: a refused record writes no row, and `SinkCodec`/`AuditEntry` schemas do not carry error tags. Verified by `grep` (no hit in `packages/*/src` outside the five files listed in Q1). | none |
| Live service config | None. | none |
| OS-registered state | None. | none |
| Secrets / env vars | None. | none |
| Build artifacts | Stale generated copies name the class: `packages/audit/coverage/**`, `coverage/**`, `reports/mutation-audit/**`, `apps/website/.astro/data-store.json`, `examples/nextjs-newsroom/.next/**`. All are generated and gitignored (or regenerated by `pnpm coverage`/`website`); `packages/audit/lib/` is the `tsc -b` output. | none; do not edit |
| Callers' code | A caller's `catchTag("AuditEntryNotEncodable")` or `_tag === "AuditEntryNotEncodable"` and any read of `.reason` (the one real runtime consequence) | covered by the Breaking changeset and the 0.13 entry (D-13); see Security Domain |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Option P (package-private `UnwrittenRow.ts`) is preferable to making the row public beside `UnwrittenStaging` | Q5, Open Question 5 | Low: both compile; P keeps the public surface, S adds two exports and overview rows (measured) |
| A2 | Deriving the line's level from the row is within discretion and wanted | Q5, Open Question 3 | Low: output is byte-identical (the characterisation pins it); if declined, the D-06 table still pins agreement and the `durabilityOf` doc comment must be reworded instead |
| A3 | `outcomePath` should be converted with the other two `Refused` branches | Q6, Open Question 4 | Low: same file, same defect class; if declined it stays a documented ternary |
| A4 | The per-leaf expected rows (Q3) will be unchanged by the phase except the hook payload's `_tag`/`reason` | Q3 | Low: they were measured on the base; the characterisation green-on-after is the proof |
| A5 | `Skipped({ entry, staging: stageResult })` would leak `commit` to `onOutcome` | Anti-patterns, Pitfall 3 | None: the recommended conversion avoids it either way; reasoning from `Data.taggedEnum` constructors storing their argument, not probed |
| A6 | The new 0.13 After fence compiles once the types change | Q9 | Low: verified at plan close by `pnpm spec:website-examples`; it could not be compiled on HEAD |

## Open Questions

1. **AREF-01's text and D-03's reading differ.** `REQUIREMENTS.md:69` says "the logged reason is `describeEncodeRefusal(refusal)` at the one place a line is written", and the roadmap's success criterion 1 repeats it. D-03 settles that audit's default line never carried a reason (probe: annotations exactly `qadi.refusal`, `qadi.path`, `evaluationId`; message has no sentence) and that the sentence is computed in core. What is unclear: nothing in the code; only that the requirement's wording will read as unmet when the phase closes. Recommendation: ADR-QD-161 states the reading, and the orchestrator edits AREF-01's wording (as Phase 47 did for PFCT-04) when it marks the requirement complete. No user decision is needed unless the user wants `reason` kept on the log line, which would contradict criterion 4.

2. **D-06's "the line is a warning" is not an equivalence over all eleven leaves** (Q3 caveat, Pitfall 2): `Written.CommitFailed` and `Refused` log at `Warn` and are not `Lost`. Recommendation: scope the warning leg to the six unwritten leaves in the test, BEH-QD-579 and INV-QD-341, and assert the two Warn-but-not-Lost leaves separately. Planner-level wording; flagged so the table is not written as the literal four-way ⇔.

3. **Derive the log level from the row too?** D-05 names `durabilityOf` and `lostLabel` only. The level of the six unwritten lines is a third restatement today (`warning(...)`/`info(...)` per arm), and `durabilityOf`'s doc already claims it reads the row. Recommendation: yes, `unwrittenLine(staging, message)` (Code Example 3); output is byte-identical and the doc claim becomes true. If the user wants D-05 kept literal, the D-06 test still pins agreement and the doc comment must be reworded to say only the span and the lost word read the row. This is the one place the phase's design could be read as wider than the decision.

4. **`outcomePath` is a third `_tag === "Refused"` ternary** (`AuditWriteReport.ts:144-145`). D-10 names `evaluationIdOf` and the `if` in `emitWriteOutcome`. Recommendation: convert it too, for D-10's own stated reason; it is exported from a non-barrel module and pinned by `AuditWriteOutcome.test.ts`'s `ROWS`.

5. **Where the row lives, and whether it may become public.** CONTEXT prefers `AuditWriteOutcome.ts`; that module is `export *`ed, so the row and its type become public API and gate 13 requires overview rows (measured: `[missing] UnwrittenRow`, `[missing] unwrittenRowOf` until a row names them), plus a line in the changeset (additive). AGENTS.md §9 and ADR-QD-099 say internal scaffolding stays out of the barrel. Option P (a package-private leaf `UnwrittenRow.ts` importing nothing, checked against `UnwrittenStaging["_tag"]` in `AuditWriteOutcome.ts`) keeps the surface and avoids a cycle (Q5). Recommendation: P, as `file` is explicitly Claude's discretion; confirm only if the user wants the row public.

6. **Whether the first plan's "ADR check" is a separate artefact.** The roadmap says the first plan "checks ADR-QD-054 and ADR-QD-056 … and records what the ADRs actually forbid". Q8 is that record, with quotes. Recommendation: the plan's Task 1 writes it as the ADR-QD-161 Context section draft (no code), committed with the plan's SUMMARY; nothing further is needed from the user.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| node | everything | yes | v26.13.0 [VERIFIED] | none needed |
| pnpm | all commands | yes | 10.17.1 [VERIFIED] | none needed |
| vitest | tests | yes | 5.1.0 [VERIFIED] | none needed |
| `@stryker-mutator/core` + vitest runner | base and after | yes | 10.1.1; the four-file run took 21 s | none needed |
| tstyche | the RED pin | yes | 7.2.5 (TS 6.0.3 target) [VERIFIED] | none needed |
| `madge` | `pnpm circular` | yes (used by the gate; no edge added by this phase) | n/a | none needed |

**Missing dependencies:** none. `pnpm check:pr < /dev/null` was not run end to end (it is long); its constituents were run at HEAD this session: `pnpm exec tsc -p tsconfig.test.json` clean; `node scripts/check-house-style.mjs` `521 file(s) clean (3 declared switch(es))`; `node scripts/check-api-surface.mjs` `929 export(s) documented across 9 package(s)`; `pnpm exec vitest run --project audit`: `Test Files 25 passed (25)`, `Tests 479 passed (479)`, `Duration 1.45s`.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest 5.1.0 + `@effect/vitest` (`it.effect`); `tstyche` 7.2.5 for the type pin |
| Config | `packages/audit/vitest.config.ts` (`name: "audit"`, `include: ["test/**/*.test.ts"]`, aliases `@qadi/core` and `@qadi/testing` to source), root `vitest.config.ts` (coverage thresholds core 95, others 90), `stryker.audit.mjs`, `tstyche.json` |
| Quick run | `pnpm exec vitest run --project audit packages/audit/test/AuditWriteOutput.test.ts packages/audit/test/AuditLostAgreement.test.ts packages/audit/test/AuditWriteOutcome.test.ts packages/audit/test/AuditEntry.test.ts packages/audit/test/AuditDecisionSinkLive.test.ts packages/audit/test/AuditWriteExits.test.ts packages/audit/test/Metrics.test.ts` |
| Full suite | `pnpm check:pr < /dev/null` (`node scripts/run-check.mjs --skip-mutation`); the fast loop `pnpm exec vitest run --project audit` (479 tests, 1.5 s) plus `pnpm exec tsc -p tsconfig.test.json` (about 3 s warm) |
| Type pin | `pnpm exec tstyche packages/audit/test/AuditRefusal.tst.ts` (RED until AREF-01); whole set `pnpm test:tstyche` |
| Mutation | the Q10 command, then the comparer |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| AREF-01 | `onRefused`, `Refused.refusal`, `encodeAuditEntry`'s error are core's `SinkRecordNotEncodable` | tstyche (RED on base) | `pnpm exec tstyche packages/audit/test/AuditRefusal.tst.ts` | Wave 0 |
| AREF-01 | `encodeAuditEntry` fails with an instance of core's class; the sentence is `describeEncodeRefusal(refusal)` | unit | `pnpm exec vitest run --project audit packages/audit/test/AuditEntry.test.ts` | exists; edited (Q1) |
| AREF-01 | the default refusal warning is byte-identical (message, three annotations, no more); the hook payload's `recordTag`/`evaluationId`/`refusal` unchanged | characterisation | `pnpm exec vitest run --project audit packages/audit/test/AuditWriteOutput.test.ts` | Wave 0 (green on base) |
| AREF-02 | the eleven leaves' lines, span attributes, counter deltas, hook-visible `staging` own keys | characterisation | same file | Wave 0 (green on base) |
| AREF-02 | Lost ⇔ lost counter ⇔ span `"Lost"` (eleven leaves); Warn ⇔ Lost over the six unwritten leaves | table | `pnpm exec vitest run --project audit packages/audit/test/AuditLostAgreement.test.ts` | Wave 0 (green on base and after) |
| AREF-02 | one row per `UnwrittenStaging` variant; `durabilityOf` and `lostLabel` read it | unit | `pnpm exec vitest run --project audit packages/audit/test/UnwrittenRow.test.ts` (Option P) or inside `AuditWriteOutcome.test.ts` | written in the AREF-02 plan with the row |
| AREF-02 | the old pins keep passing | existing | `AuditWriteOutcome.test.ts` (`ROWS`), `AuditWriteExits.test.ts`, `Metrics.test.ts:223-256` | exist |
| AREF-03 | stage result variants and `writtenStaging`; `evaluationIdOf`/`outcomePath` exhaustive | existing + characterisation | `AuditWriteExits.test.ts` (21 exits), the characterisation, `tsc` | exist |
| AREF-04 | ADR-QD-161 recorded; the changeset is Breaking | review + gates | `pnpm spec:verify:strict`, `pnpm spec:gates`, `pnpm spec:api`, `.changeset/*.md` front matter | at close |
| WX-01 | gate green | gate | `pnpm check:pr < /dev/null` | exists |
| WX-02 | reserved ids only | `[no-numbering-placeholder]` + grep | `pnpm lint`; `git grep -nE "ADR-QD-NEXT\|BEH-QD-NEXT"` | exists |
| WX-03 | overview names added exports and drops the class | gate 13 | `pnpm spec:api` | exists |
| WX-04 | no forbidden construct | lint | `pnpm lint` (house-style: 521 files clean at HEAD) | exists |
| WX-05 | coverage holds; Stryker not below base | coverage + comparer | `pnpm coverage`; the Q10 command, then a node comparer against `48-mutation-base.json` | base JSON Wave 0 |
| WX-06 | tests precede the change | git order | `git log --format=%H -- packages/audit/src` shows no commit before the base, characterisation and pin commits | Wave 0 |
| WX-07 | Breaking recorded | review | `.changeset/*.md` starts `**Breaking.**`; the 0.13 heading exists in `upgrading.md`; `pnpm spec:website-examples` | at close |

### Sampling Rate
- **Per task commit:** the quick-run files touched, plus `pnpm exec tsc -p tsconfig.test.json`.
- **After each of AREF-01/-02/-03:** `pnpm exec vitest run --project audit`, `node scripts/check-house-style.mjs`, `pnpm circular`.
- **Per wave merge:** `pnpm check:fast` if present, else `pnpm typecheck && pnpm lint && pnpm test:tstyche`.
- **Phase gate:** `pnpm check:pr < /dev/null` green, then the Stryker after-run and comparer exit 0, before `/gsd-verify-work`.
- A verify step whose command would run the RED tstyche file excludes it by exact path until AREF-01.

### Wave 0 Gaps
- [ ] `48-mutation-base.json` (the phase's first commit, alone; re-run the Q10 command on the untouched tree first).
- [ ] `packages/audit/test/observeLeaf.ts`, `AuditWriteOutput.test.ts` (characterisation, Q3/Q4, green on base) and `AuditLostAgreement.test.ts` (D-06, green on base).
- [ ] `packages/audit/test/AuditRefusal.tst.ts` (RED on base, Q7).
- [ ] An `instanceOf(SinkRecordNotEncodable)` assertion: a RED row, in `AuditEntry.test.ts`'s edit in the AREF-01 plan or as one extra RED test in Wave 0 if the plan wants a runtime RED beside the type RED.
- No framework install needed.

## Security Domain

Security enforcement is enabled (`workflow.security_enforcement: true`, `security_asvs_level: 1`, `security_block_on: "high"`; `.planning/config.json`).

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | none |
| V3 Session Management | no | none |
| V4 Access Control | no (no authorization decision changes; the audit sink observes decisions, INV-QD-035) | n/a |
| V5 Input Validation | yes (the refusal carries paths made of the caller's keys; the hook receives it) | core's `encodeRefusalAnnotations` says where, never what (INV-QD-104); no value from the record enters a line |
| V6 Cryptography | no | none |
| V7 Error Handling and Logging | yes | `reportEncodeRefusal` contains a throwing hook (`"qadi: an encode-refusal hook threw"`, annotations plus `qadi.cause`), INV-QD-035/097; the audit lines annotate `evaluationId` only |
| V10/V14 Build and dependency / config | yes (evidence integrity: the mutation base, the changeset) | the base JSON is written by a script that refuses a stale or foreign report; the change is Breaking and says so |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| The hook payload or a log line disclosing record content (INV-QD-104) | Information disclosure | The change *narrows* the payload: `reason` carried `describeEncodeRefusal`'s sentence, which for `EncodeFailed` includes `message`, "text a caller wrote (a throwing getter's message)" (`JsonRefusal.ts:136-141`). Removing the field cannot add a disclosure; `refusal` (with `EncodeFailed.message`) was already on both classes. The default warning's annotations are unchanged (probe: exactly three keys). The characterisation asserts the exact key set and the existing test at `AuditDecisionSinkLive.test.ts:557-577` still asserts the getter's text appears nowhere |
| A hook that throws | Denial of service | Contained by core's reporter and `emitWriteOutcome`'s `Effect.catchCause` for `onOutcome`; both logged, never a defect, the next record is still written (existing tests `:529-555`, `:737-767`; the characterisation leaves them green) |
| A deletion that silently changes a caller's `catchTag`/`_tag` check | Tampering / fail-open | A typed `Effect.catchTag("AuditEntryNotEncodable", …)` stops compiling (loud), but a string comparison on `unknown` (`e._tag === "AuditEntryNotEncodable"`) compiles and never matches, so the refusal falls to the caller's generic path (likely fail-closed, but not guaranteed). Mitigation: the **Breaking** changeset and the 0.13 entry name the new tag (D-13), the RED `instanceOf` row and the tstyche pin pin the new type, and the error code (`ACL019`) is stable |
| A characterisation taken on edited `src` | Repudiation / false assurance | Commit order: base JSON, then characterisation, then `src`; verify with `git diff --stat <base> -- 'packages/*/src'` empty at the characterisation commit and run the file on that commit. The expectations are literals, not derived from the code under change (Pitfall 1) |
| Mutation evidence tampering or a stale report | Tampering | `48-mutation-base.json` produced by the retargeted writer that refuses a stale report, a report with other files, a `source` that is not the file on disk; a drop is closed with a test, never re-baselined (WX-05) |
| A new public export reached by accident | Information disclosure (API surface) | gate 13 (`[missing]`/`[stale]`), run both ways above; `StageResult`/`writtenStaging` stay unexported |
| `qadi.audit.outcome`/`durability` span attributes | Information disclosure | unchanged and constant words (`outcomePath`'s closed values); the characterisation pins all eleven |

## Sources

### Primary (HIGH confidence)
- Read this session, with line citations above: `packages/audit/src/{AuditEntry,AuditWriteOutcome,AuditWriteReport,AuditDecisionSinkLive,AuditTrailPort,index}.ts`; `packages/core/src/{Errors (360-470),EncodeRefusalReport,JsonRefusal (100-175),SinkCodec (370-420),SinkWire (20-40),DecisionSinkForwarding (60-100)}.ts`; `packages/http/src/DecisionLogHttp.ts`; `packages/audit/test/{helpers,driveExit,AuditWriteExits,AuditWriteOutcome,AuditWriteOutcome.tst,AuditDecisionSinkLive (1-18, 486-800),AuditDecisionSinkLive.tst,AuditEntry (50-180),Metrics (1-80, 215-262)}.ts`; `packages/testing/src/{CollectingLogger,CollectingTracer,IsolatedMetrics}.ts`; `node_modules/effect/src/internal/effect.ts:6698-6738` (`logWithLevel`)
- Spec and process: `spec/decisions/{054,056 (1-110, 295-345, 405-420),095 (60-70, 145-175),160,159,index.yaml}`, `spec/behaviors/33-audit-pipeline.md` (1-110, 505-575), `spec/invariants.md` (3211-3325, 3905-3940), `spec/overview.md` (`:61-72`, `:750-770`, `:920`), `spec/README.md` (`:13`, `:372-375`), `spec/traceability.md` (rows near `:67-75, :132, :169-172, :324-326, :574-596`), `spec/scripts/verify-traceability.sh`, `scripts/{check-api-surface,spec-revise,check-house-style (700-760)}.mjs`, `.changeset/{audit-options-refused-when-built,audit-entry-decoded-once,audit-sink-names-itself,port-default-is-a-mark}.md`, `.changeset/config.json`, `apps/website/.../upgrading.md` (`:619-800`), `packages/audit/README.md`, `apps/website/.../packages/audit/capabilities.md`, `stryker.audit.mjs`, `tstyche.json`, `tsconfig.test.json`, `package.json`, `.planning/{config.json,REQUIREMENTS.md,phases/_WAVE10-CONTEXT.md,phases/QD-47-…/47-RESEARCH.md,phases/QD-45-…/45-RESEARCH.md (Q7), 45-mutation-base.json, 45-mutation-after.json}`
- Probes this session, all temporary and removed: the eleven-leaf driver (`Tests 13 passed (13)`); the row/`StageResult`/`Match.tag` type probe (`tsc` clean, negatives verified, `Tests 3 passed (3)`); the `emit` rewrite compiled against the after-state types; the tstyche pin (RED, 4 failed); the gate-13 scratch copy (a)-(d); Stryker run (21 s)

### Secondary (MEDIUM confidence)
- none

### Tertiary (LOW confidence)
- none. No web source was needed: every claim is about this repository and the installed toolchain.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH, no package change
- Refusal type and the ADR check: HIGH, read and quoted
- "Lost" and the row: HIGH, compiled with negative controls
- Base output of the eleven leaves: HIGH, measured through the public sink
- Mutation base: HIGH, measured (a re-run on the untouched tree is the plan's first task)
- Spec-record placement: MEDIUM, the planner's call (ids are fixed)

**Research date:** 2026-11-16
**Valid until:** 2026-12-16 (re-verify line numbers against the phase base; re-run the Q10 command on the untouched tree; effect/TypeScript versions if `pnpm-lock.yaml` moves)
