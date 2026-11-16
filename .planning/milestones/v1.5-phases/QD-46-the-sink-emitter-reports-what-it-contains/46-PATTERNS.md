# Phase 46: The sink emitter reports what it contains - Pattern Map

**Mapped:** 2026-11-15
**Files analyzed:** 22 (6 src edits, 1 new test, 4 edited tests, 1 json, 1 classification doc, spec/changeset records)
**Analogs found:** 22 / 22 (all git-tracked; `packages/core/test/helpers.ts` verified with `git ls-files`)

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match |
|---|---|---|---|---|
| `packages/core/src/SinkEmit.ts` (report in `sinkEmitter`) | utility (emitter) | event-driven, contain-and-log | `DecisionSinkForwarding.ts:187-191` (catchCause + logWarning + annotateLogs) | exact |
| `packages/core/src/DecisionSink.ts` (`name?`) | service shape | n/a | `AttributeResolver.ts:40-53` | exact |
| `packages/core/src/DecisionSinkForwarding.ts` (names; drop `:122-129`; member `qadi.sink`) | service/layer | event-driven | itself | exact |
| `packages/core/src/DecisionLog.ts` (name; fix doc `:165-171`) | service/layer | CRUD+pubsub | itself | exact |
| `packages/core/src/EvaluationEnvironment.ts:75` (name shadow sink) | config/layer | none | `DecisionLog.ts:283` literal | role-match |
| `packages/audit/src/AuditDecisionSinkLive.ts:250` (`return { name, record }`) | service/layer | event-driven | `DecisionLog.ts:283` | role-match |
| `packages/core/test/SinkEmitReport.test.ts` (NEW) | test | request-response + log capture | `DecisionSinkForwarding.test.ts:141-157`, `DecisionSink.test.ts:1123-1190` | exact |
| `DecisionSinkForwarding.test.ts`, `DecisionLog.test.ts`, `DecisionSink.test.ts` | test | same | same files | exact |
| `packages/core/test/DecisionSink.tst.ts` | type test | n/a | itself `:43-57` | exact |
| `46-mutation-base.json`, `46-mutation-after.json` | evidence | batch | `45-mutation-base.json` (shape `{measured, unmeasured, new, deleted, moved}`) | exact |
| `46-classification.md` | doc | n/a | Research Q1 table W0-W10 | exact |
| spec: ADR-QD-159 file + `index.yaml`, CCR-QD-437 row in `spec/README.md`, BEH-QD-566..570 in `spec/behaviors/24-decision-sink.md`, INV-QD-337/338 + INV-QD-035 restate in `spec/invariants.md`, `spec/traceability.md` | spec | n/a | ADR-QD-158 file; CCR-QD-436 (`README.md:373`); BEH-QD-561 (`33-audit-pipeline.md`); INV-QD-335 (`invariants.md:3861`) | exact |
| `.changeset/<name>.md` (core minor, audit patch) | config | n/a | `.changeset/audit-options-refused-when-built.md` | role-match (not Breaking) |

## Pattern Assignments

### `packages/core/src/SinkEmit.ts` (emitter)

**Analog:** the shipped report shape, `DecisionSinkForwarding.ts:187-191`:
```typescript
Effect.catchCause((cause) =>
  Effect.logWarning("qadi: a fanned-out decision sink failed unexpectedly").pipe(
    Effect.annotateLogs({ "qadi.cause": String(cause) }),
  ),
),
```
**Current code to replace** (`SinkEmit.ts:49-55`): `Effect.map(Effect.serviceOption(DecisionSink), (sink) => Option.isSome(sink) ? (record) => Effect.catchCause(sink.value.record(record), () => Effect.void) : () => Effect.void)`.

**Target shape** (probed in 46-RESEARCH Code Examples). Compute `name` once in the `isSome` branch; the report is wrapped in an inner `catchCause(() => Effect.void)` (D-04):
```typescript
const name = sink.value.name ?? "unnamed";
return (record) =>
  Effect.catchCause(sink.value.record(record), (cause) =>
    Effect.logWarning("qadi: a decision sink failed; the record was not delivered").pipe(
      Effect.annotateLogs({
        "qadi.sink": name, "qadi.record_tag": record._tag,
        evaluationId: record.evaluationId, "qadi.cause": String(cause),
      }),
      Effect.catchCause(() => Effect.void),
    ));
```
Imports already present (`Effect`, `Option`, `DecisionSink`). Never add a second `serviceOption(DecisionSink)` (`sink-read-once`). Doc comment: rewrite the "swallows everything" summary to "contains and reports once", rationale in later paragraphs (AGENTS.md doc shape). A cold-path `Effect.fn("qadi.sinkEmitter.report")` helper is allowed (precedent `reportRefusal`, `DecisionSinkForwarding.ts:86-94`); no `fnUntraced`.

### `packages/core/src/DecisionSink.ts` (`name?`)

**Analog:** `AttributeResolver.ts:40-53`: doc says "a label a reader sees ... Nothing branches on it", then
```typescript
readonly name?: string | undefined;
```
Add above `record` in `DecisionSinkShape` (`DecisionSink.ts:34-51`); also amend the `record` doc ("`evaluate` also catches defects" -> contained and reported once).

### `DecisionSinkForwarding.ts`

- `:110` `Layer.succeed(DecisionSink, { name: "decisionSinkForwarding", record: ... })`.
- Remove only the outer `Effect.catchCause(...)` at `:122-129` (the whole trailing pipe argument plus its comment). Keep `reportRefusal` (`:87-94`), `reportSendFailure` (`:96-108`) and the inner `catchCause(reportSendFailure)` at `:119`.
- `:169` `return { name: "decisionSinkAll", record: ... }` (fixed, D-07).
- `:175-191` member catch: shape is `forEach(shapes, (shape) => shape.record(record).pipe(Effect.catchCause(...)))`; keep message text unchanged and extend annotations: `{ "qadi.sink": shape.name ?? "unnamed", "qadi.cause": String(cause) }`. Update the JSA doc at `:147-155` only if it claims the emitter reports nothing.

### `DecisionLog.ts`

- `:283` `layer: Layer.succeed(DecisionSink, { name: "decisionLog", record: ... })`.
- `isolate` (`:172-177`) unchanged in code; rewrite the doc `:165-171` to say it reports which half failed and that it does NOT let the other half run (an append defect skips publish, `:243-260` chain is append then publish). Pins: append half via `ingest` of a record with an own throwing getter (`stampRecord` spreads, A3, MEDIUM); publish half likely unreachable, record as kept but unreachable.

### `EvaluationEnvironment.ts:75` and `AuditDecisionSinkLive.ts:250`

```typescript
Layer.succeed(DecisionSink, { name: "evaluationEnvironment.shadow", record: () => Effect.void })   // D-06a
return { name: "AuditDecisionSinkLive", record };                                                  // audit; changeset audit patch
```
One name-pin test per sink: `(yield* DecisionSink).name` (kills the StringLiteral mutant).

### `packages/core/test/SinkEmitReport.test.ts` (NEW)

**Analog:** `DecisionSinkForwarding.test.ts:141-157` (log counting) and `DecisionSink.test.ts:1143-1154` (obligation through `enforce`; `testLayer(allowed)`):
```typescript
it.effect("with no onFailure it warns rather than going quiet", () =>
  Effect.gen(function* () {
    const { lines: logs, layer: logger } = collectingLogger();
    yield* evaluate(policy).pipe(
      Effect.provide(Layer.mergeAll(decisionSinkForwarding({ send: () => Effect.fail("unreachable") }), logger)),
    );
    assert.strictEqual(logs.length, 1);
    const [entry] = logs;
    assert.isDefined(entry);
    if (entry === undefined) return;
    assert.include(String(entry.message), "could not be forwarded");
    assert.include(String(entry.annotations["qadi.cause"]), "unreachable");
  }).pipe(Effect.provide(testLayer(allowed))));
```
**Log helper:** `collectingLogger()` from `./helpers.ts:137-152` returns `{ lines, layer }`; `layer` REPLACES ambient loggers (`Logger.layer([...])`). `entry.level === "Warn"`; `message` is an array, use `String(entry.message)`.

**Rows** (decision via `evaluate`, obligation via `enforce(P.obliged(obligation("audit.log"), ...), { onObligations: () => Effect.void })(Effect.succeed("ran"))`): `Effect.die`, throw inside `Effect.sync`, `Effect.interrupt` (decision already unchanged on base; only the count is RED; assert `qadi.cause` `include`s `"Interrupt"`, never the fiber id), a type-escape row, a named vs unnamed (`"unnamed"`) row, a throwing-logger row (`Logger.layer([Logger.make(() => { throw ... })])`, decision equals no-sink baseline). The obligation sink must die only when `record._tag === "Obligations"` (an obliged allow emits `Decision` then `Obligations`).

Type-escape (D-14a), no `as`/`any`; mind oxlint unused-param warning (use `Object.is(value, value)` body, Pitfall 6):
```typescript
const isNever = (value: unknown): value is never => Object.is(value, value);
record: () => (isNever(e) ? Effect.fail(e) : Effect.void)
```

### Other edited tests

- `DecisionSinkForwarding.test.ts:433-455`: keep message and `qadi.cause`, add `qadi.sink === "unnamed"` plus a named-member row. New characterisation (green before/after, count 1, assert count not message): `send` fails and `onFailure` throws. Name pins for forwarding/all.
- `DecisionLog.test.ts`: name pin, append-half pin.
- `DecisionSink.tst.ts:43-57`: add `expect<DecisionSinkShape["name"]>().type.toBe<string | undefined>()`; comment that the predicate escape exists.

### Mutation base and after

**Analog:** `45-mutation-base.json` shape `{"measured": {path: score}, "unmeasured": {}, "new": [], "deleted": {}, "moved": {}}`; writer is the node one-liner in `45-01-PLAN.md` Task 1 step 4 (refuses a stale report by mtime and a mismatched `source`); commit alone as `chore(46-01): ...`. After-file `46-mutation-after.json` (`{path: score}`) as in `45-08-PLAN.md:25`. Retarget `NAMED` to four files and run twice (core `stryker.config.mjs` -> `reports/mutation/mutation.json`, audit `stryker.audit.mjs` -> `reports/mutation-audit/mutation.json`) and merge `measured`. Base scores: SinkEmit 1.0, DecisionSinkForwarding 0.8065, DecisionLog 0.9275, AuditDecisionSinkLive 1.0 (add `EvaluationEnvironment.ts` if it is edited and measured). Commands in 46-RESEARCH Q7.

### Spec and changeset records

- ADR: new `spec/decisions/159-the-sink-emitter-reports-what-it-contains.md`, copy the Document Control block of `158-...md` (Status "Accepted"), plus an `index.yaml` entry:
  ```yaml
    - id: "ADR-QD-159"
      file: "159-the-sink-emitter-reports-what-it-contains.md"
      title: "The sink emitter reports what it contains"
      status: "Accepted"
  ```
- CCR-QD-437 row after `spec/README.md:373` (CCR-QD-436 format: files with revisions, then "ARCH-93. **...**" prose, list unused ids). Bump docs with `node scripts/spec-revise.mjs <doc> "<what>" --date 2026-11-15`; verify `pnpm spec:verify`.
- BEH-QD-566..570 in `spec/behaviors/24-decision-sink.md` (format: BEH-QD-561 in `33-audit-pipeline.md`; amend BEH-QD-181 fence, 182, 187). INV-QD-337/338 in `spec/invariants.md` (format INV-QD-335 at `:3861`); restate INV-QD-035 (`:1426-1470`), "unrepresentable" -> "not representable without a type escape". `spec/traceability.md` rows (ADR after `:320`, INV rows, test rows near `:418,437,438`, new SinkEmitReport test). Do not run `scripts/next-id.mjs`.
- Changesets: `"@qadi/core": minor` and `"@qadi/audit": patch`; style of `.changeset/audit-options-refused-when-built.md` (frontmatter, bold lead paragraph, final "See the 0.13 section of the upgrade guide"), but WITHOUT "Breaking". Add an upgrading.md 0.13 entry.

## Shared Patterns

### Report shape
**Source:** `DecisionSinkForwarding.ts:187-191`, `DecisionLog.ts:172-177`. `Effect.logWarning(fixed text).pipe(Effect.annotateLogs({ "qadi.cause": String(cause) }))`. Keep message fixed and put variable data in annotations. Annotate only name, `_tag`, `evaluationId`, cause (no subject or resource).

### Containment
**Source:** `SinkEmit.ts:53`, BEH-QD-175: `catchCause`, never `catchAll`, never `orDie`.

### Annotation key convention
`qadi.*` prefixed, except unprefixed `evaluationId` (`EncodeRefusalReport.ts`, `AuditWriteReport.ts:241,256`).

### Test log capture
`collectingLogger` from `packages/core/test/helpers.ts`; other packages import it from `@qadi/testing` (`AuditDecisionSinkLive.test.ts:9`).

## No Analog Found

| File | Reason |
|---|---|
| Reaching `DecisionLog`'s publish half from a test | No existing test reaches either `isolate`; A3 (throwing getter via `ingest`) unproven for append, likely impossible for publish |

## Metadata

**Analog search scope:** `packages/core/src`, `packages/core/test`, `packages/audit/src`, `.planning/phases/QD-45-*`, `spec/`, `.changeset/`
**Pattern extraction date:** 2026-11-15
