# Phase 46: The sink emitter reports what it contains - Research

**Researched:** 2026-11-15 (branch `arch-wave-10`, HEAD `88ae497c`; `packages/*/src` is unchanged since Phase 45 closed)
**Domain:** `@qadi/core` `SinkEmit.ts`, `DecisionSink.ts`, the shipped sinks (`DecisionSinkForwarding.ts`, `DecisionLog.ts`, `@qadi/audit`'s `AuditDecisionSinkLive.ts`), Effect 4.1.2 `catchCause`/`Logger`, Stryker 10.1.1, spec records
**Confidence:** HIGH on the Effect semantics (every claim in Q2 was run on the installed `effect@4.1.2` in a throwaway test and a throwaway `tsc` project, both deleted), on the warning inventory (every `logWarning`/`catchCause` in `packages/*/src` was grepped and the sink-path ones read), and on the mutation base (run this session, report not stale). MEDIUM on the one claim marked `[ASSUMED]` (reaching `DecisionLog`'s append half from a test).

## Summary

The change is small and mechanical. `sinkEmitter` (`SinkEmit.ts:49-55`) becomes `Effect.catchCause(sink.record(record), cause => report(...))`, where the report is one `Effect.logWarning` with fixed text and four annotations, and is itself wrapped in a second `Effect.catchCause(() => Effect.void)` so a throwing logger cannot break the decision (D-04). The sink is still read once (`serviceOption(DecisionSink)` in `SinkEmit.ts` only); the name is read from the same `sink.value` already in hand, so `sink-read-once` is untouched. A candidate emitter was run against a dying sink, a throwing sink, a self-interrupting sink and a named sink: each produced exactly one `Warn` line, and the call itself succeeded with `void`.

Six findings change how the planner should write the work. The first two block or reshape a locked decision, and are listed under Open Questions:

1. **The self-interrupt row is already half-green on the base.** `Effect.catchCause` recovers a sink's self-interruption (`Effect.interrupt` on the evaluating fiber), so on `88ae497c` `evaluate` already returns the unchanged `Allow`. Only the warning count is RED. An *external* interruption is not recovered (the handler never runs), so there is no spurious warning on cancellation. [VERIFIED: probe A1, A2, A4, outputs below]
2. **D-11's premise is not literally true.** `DecisionLog`'s `isolate("append")` does not let "the other half still run": the chain is append, then publish, so an append defect skips publish. The catch still earns its place under D-12's second test ("says something the emitter cannot": which half), and it is the only catch in the codebase with **no test at all** (every mutant on it is `NoCoverage` or `Survived`). Keep it; pin it. [VERIFIED: `DecisionLog.ts:243-260`, Stryker report]
3. **A typed failure *can* leak without `as` or `any`** (D-14): a user-written type predicate `(_: unknown): _ is never` narrows a value to `never`, so `Effect.fail(e)` types as `Effect<never, never>` and is assignable to `record`. Plain `Effect.fail`, a generic `E`, a wider shape through `Layer.succeed`, and `Effect.flip` are all compile errors. `JSON.parse(...)` (an `any` source) also compiles. oxlint passes both. So D-14's "pin one if it can" is satisfiable. [VERIFIED: tsc output below]
4. **Under `enforce` an obliged allow emits two records** (a `Decision` then an `Obligations` record), so a sink that dies on every record yields two warnings. The obligation RED test needs a sink that dies only on `_tag === "Obligations"` (the tag is `"Obligations"`, not `"Obligation"`: `SinkRecordFields.ts:29`) to get "exactly one". [VERIFIED]
5. **No existing test reaches forwarding's outer catch** (`DecisionSinkForwarding.ts:125-129`, `NoCoverage`), so D-09's removal changes behaviour no test pins today. Add a characterisation test (green on the base, count 1) for "`send` fails and `onFailure` throws". Removing the catch also removes three uncovered mutants, so that file's score can only rise. [VERIFIED: Stryker]
6. **There is no devtools or react `DecisionSink` implementation.** `packages/devtools/src/model/Wiring.ts:106` only reads sink *presence*; no file in `packages/react/src` or `packages/http/src` implements one. The shipped implementations are exactly five (Q1). [VERIFIED: grep]

**Primary recommendation:** Plan 1 (first commits, `packages/*/src` untouched): the Stryker base JSON for `SinkEmit.ts`, `DecisionSinkForwarding.ts`, `DecisionLog.ts` (core) and `AuditDecisionSinkLive.ts` (audit), the per-warning classification table, and the RED/characterisation tests in one new `packages/core/test/SinkEmitReport.test.ts`. Plan 2: the emitter's report and `name?`. Plan 3: the three `name`s plus the two D-09/D-10 edits. Plan 4: records. Plan 5: Stryker comparison and `pnpm check:pr < /dev/null`.

## Architectural Responsibility Map

Single-package library work; the "tiers" are modules.

| Capability | Primary owner | Secondary | Rationale |
|------------|---------------|-----------|-----------|
| Containment of every cause + the one report + swallowing a throwing logger | `SinkEmit.ts` `sinkEmitter` (the one emitter, one read) | none | INV-QD-035 and `sink-read-once` already make this module the only place; D-04 |
| A sink's name | `DecisionSinkShape.name?` (`DecisionSink.ts`) | each shipped sink's own record literal | D-05/D-06; the same label-only contract as `AttributeResolverShape.name` (`AttributeResolver.ts:53`) |
| Sibling isolation + the failing member's name | `decisionSinkAll` (`DecisionSinkForwarding.ts:187`) | none | Changes behaviour (later members still run), D-10 |
| Which log half failed | `DecisionLog.ts` `isolate` | none | Says something the emitter cannot, D-11 |
| Encode-refusal and send-failure reports | `decisionSinkForwarding` (`:90-108`) via `reportEncodeRefusal` | `EncodeRefusalReport.ts` | The sink handled the failure; D-09 |
| Audit write-outcome report and `onOutcome` hook containment | `AuditWriteReport.ts` | `AuditDecisionSinkLive.ts` only gains `name` | Not outer containment; D-12 |

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| EMIT-01 | `sinkEmitter` contains and reports with exactly one warning, naming the sink | Q2 (probe A5), Code Examples `sinkEmitter`, Q4 (`name`) |
| EMIT-02 | A failing and a dying custom sink through `evaluate`: one warning, decision unchanged, RED on the base | Q2a/Q2b (the test set: die, throw, self-interrupt, typed-leak), Q3 (obligation path), Q5 |
| EMIT-03 | Each shipped sink keeps only reports that change behaviour or say something else; each warning classified | Q1 classification table; Open Question 2 |
| EMIT-04 | One read per evaluation; INV-QD-035 restated | Q3 (`sink-read-once` regex), Q6 |
| WX-01 | `pnpm check:pr < /dev/null` green | Validation Architecture |
| WX-02 | Reserved ids only | ARCH-93, ADR-QD-159, CCR-QD-437, BEH-QD-566..570, INV-QD-337..338 all confirmed free by `git grep` over `spec packages .changeset AGENTS.md scripts features apps examples` this session |
| WX-03 | `spec/overview.md` names each added export | No export is added (a field on an exported type); Q4, Q6 |
| WX-04 | No `as`, `!`, `any`, `switch`, `fnUntraced`, ambient clock/console | Code Examples compile clean; no budget changes |
| WX-05 | Coverage holds; Stryker not below base | Q7 base figures |
| WX-06 | Tests precede the change | Wave 0 list |
| WX-07 | Breaks recorded as Breaking | None: not Breaking (Q6); a changeset still ships |
</phase_requirements>

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**The emitter's report**
- **D-01:** A contained sink failure produces one `Effect.logWarning` and nothing else. No metric.
- **D-02:** The warning text is fixed: "qadi: a decision sink failed; the record was not delivered". Its annotations are:
  - the sink's name;
  - the record's `_tag`;
  - its `evaluationId`;
  - `qadi.cause` (`String(cause)`, the annotation the shipped sinks already use).
- **D-03:** Every cause the emitter contains is reported: a defect (`Effect.die` or a throw), a typed failure leaking through a type escape, and the sink's own self-interruption. Each one lost the record.
- **D-04:** The report runs inside the containment. A logger that throws is swallowed too, so INV-QD-035 holds whatever the logger does.

**The sink's `name`**
- **D-05:** `DecisionSinkShape` gains `readonly name?: string | undefined`, the same shape `AttributeResolverShape` uses (AGENTS.md §2). It is optional, so existing sinks still compile.
- **D-06:** Every shipped sink names itself: `decisionSinkForwarding`, `decisionSinkAll`, `DecisionLog`'s sink, `AuditDecisionSinkLive`, and any devtools or react sink research finds. A warning from a shipped sink never says "unnamed".
- **D-07:** `decisionSinkAll` is named a fixed `"decisionSinkAll"`.
- **D-08:** An unnamed sink's warning carries `"unnamed"` in the name annotation, with the same message. It still produces its one warning.

**Classifying the shipped sinks' warnings**
- **D-09:** In `DecisionSinkForwarding.ts`:
  - keep the encode-refusal report (`reportRefusal`) and the send-failure report (`reportSendFailure`, which calls `onFailure`). Both say something else: the sink handled the failure.
  - remove the outer defence-in-depth `Effect.catchCause` (the one for a throwing `onFailure`). It is containment the emitter now covers, so a throwing `onFailure` gets the emitter's one warning.
- **D-10:** `decisionSinkAll`'s per-member catch stays, because it changes behaviour: the members after a failed one still run. Its warning gains the failing member's `name` (`"unnamed"` when the member has none). A member's failure is reported once, by `decisionSinkAll`, and the emitter sees success.
- **D-11:** `DecisionLog`'s `isolate` stays. It changes behaviour (the other half still runs) and says which half failed.
- **D-12:** For any other shipped sink found in research (audit, devtools, react), the rule is one failure, one report:
  - a sink's own catch stays only if it changes behaviour or says something the emitter cannot;
  - pure outer containment is removed.

  Every existing warning gets a row in the phase's classification table, which is committed with the RED tests.

**Tests and evidence**
- **D-13:** The RED tests drive both record kinds through public entry points: a decision record through `evaluate`, and an obligation record through `enforce`'s discharge. Each runs with three sinks:
  - a dying sink (`Effect.die`);
  - a throwing sink (a throw inside `Effect.sync`);
  - a self-interrupting sink.

  Each asserts exactly one warning (zero on the phase base) and an unchanged decision. A named sink's warning carries its name, and an unnamed one carries `"unnamed"`.
- **D-14:** A "failing" sink is written without `as`. `record`'s error is `never`, so a test fails a sink as a defect. Research checks whether a typed failure can leak without a cast, and pins one if it can.
- **D-15:** Warnings are counted with a test logger (`Logger.make` collecting entries), which reads the level and the annotations. No `console`.
- **D-16:** The base Stryker scores for `SinkEmit.ts`, `DecisionSinkForwarding.ts`, `DecisionLog.ts` and every other edited sink file are committed alone, first. No touched file's score may drop.

### Claude's Discretion
- The exact module layout of the report (inline in `sinkEmitter`, or a small package-private helper beside it), as long as `sink-read-once` holds.
- Annotation key names, as long as `qadi.cause` keeps its existing meaning.

### Deferred Ideas (OUT OF SCOPE)
- A `qadi_*` counter of contained sink failures (declined in D-01; a later phase may add it with its ADR-QD-123 metric-table row).
</user_constraints>

## Project Constraints (from CLAUDE.md / AGENTS.md)

- `effect/*` submodule namespace imports; relative imports carry `.ts`; `import type` for type-only (§1).
- `Context.Service` with a separately exported `…Shape` interface; the field belongs on `DecisionSinkShape` (§2).
- No `as`, `!`, `any`; `Match` not `switch`; `Effect.fn` for effectful functions, `fnUntraced` only on the three budgeted `Walk.ts` sites (§5, §5a). The cold-path report may be an `Effect.fn` (precedent `reportEncodeRefusal`, `reportRefusal`: "runs only on the refusal branch, so an accepted record pays for no span").
- Never `Effect.orDie` on evaluation or enforcement paths (§4). Unchanged: the new `catchCause` is the same inverse the doc already explains.
- No `console.*`, no `Date.now`, no `process.env` (§6). Tests count warnings with the existing `collectingLogger`, not `console`.
- `sink-read-once` (`scripts/check-house-style.mjs:566,575-578,1124-1132,1435-1454`): `SINK_READ = /serviceOption\(\s*DecisionSink\s*\)/`, `SINK_READ_ALLOWED = { "packages/core/src/SinkEmit.ts": 1, "packages/devtools/src/model/Wiring.ts": 1 }`, checked both directions. Reading `sink.value.name` does not match the regex.
- Doc-comment shape: one-line summary, then the why (§ header).
- `spec/` is normative; ` ```typescript ` fences compile, ` ```ts ` fences (BEH-QD-181's) do not (§12).
- Placeholder ids refused; only reserved numbers; **never run `scripts/next-id.mjs`** (_WAVE10-CONTEXT.md).
- Memory: closed unions in full; prefer the complete design; `Record<string, unknown>` is a hack; never release or merge a version-packages PR.

## Standard Stack

No package is added or changed.

| Library | Version | Purpose |
|---------|---------|---------|
| `effect` | 4.1.2 [VERIFIED: `node -e` reading `node_modules/effect/package.json`] | `Effect.catchCause`, `Effect.logWarning`, `Effect.annotateLogs`, `Logger` |
| `vitest` + `@effect/vitest` | 5.1.0 [VERIFIED: run banner `RUN v5.1.0`] | `it.effect`; `pnpm exec vitest run --project core <file>` from the repo root |
| `@stryker-mutator/core` | 10.1.1 [CITED: 45-RESEARCH.md Q7, same install] | per-file mutation base and comparison |
| `tstyche` | 7.2.5 [CITED: 45-RESEARCH.md] | optional type pin of `DecisionSinkShape["name"]` in `packages/core/test/DecisionSink.tst.ts` |

**Package Legitimacy Audit:** no external package is installed, added or upgraded; the `package-legitimacy` seam was not needed. **Packages removed [SLOP]:** none. **Flagged [SUS]:** none.

## Architecture Patterns

### System Architecture Diagram

```
 evaluate  (Lifecycle.ts:83)                    discharge  (Handover.ts:122, after the no-duties early return)
   emit(decisionRecordFor(...))  :131 :177        emit(record("HandlerFailed"|"Discharged"|"NotRequired"|"Refused"))  :135 :136 :143 :149
        \                                              /
         v                                            v
   sinkEmitter  (SinkEmit.ts)   reads DecisionSink ONCE (serviceOption), captures  name = sink.value.name ?? "unnamed"
        |  record -> catchCause( sink.record(record),
        |                         cause -> report(name, record, cause)  .pipe( catchCause(() => void) ) )   <- D-04
        |                                         |
        |                                         +-> Effect.logWarning("qadi: a decision sink failed; the record was not delivered")
        |                                               annotated: qadi.sink, qadi.record_tag, evaluationId, qadi.cause
        v
   the sink's record   (an Effect<void>; never typed-fails, but can die, throw in Effect.sync, self-interrupt,
                        or - through a type escape - Effect.fail)
        |
        +- decisionSinkForwarding : encode -> refusal? reportEncodeRefusal | send -> catchCause(reportSendFailure)   [keeps both]
        +- decisionSinkAll        : forEach member: record.pipe(catchCause(warn + qadi.sink = member name))           [keeps, names the member]
        +- makeDecisionLog        : append -> publish, each isolate(half)                                           [keeps]
        +- AuditDecisionSinkLive  : its own outcome report (AuditWriteReport)                                        [only gains name]
```

An external interruption of the evaluating fiber is not a cause the handler sees (probe A4): the report fires only for a failure the sink produced.

### Recommended Project Structure
```
packages/core/src/
├── DecisionSink.ts           # + readonly name?: string | undefined (doc: label only, never an input to a decision)
├── SinkEmit.ts               # sinkEmitter reports; report inline or a small module-scope helper beside it (D discretion)
├── DecisionSinkForwarding.ts # name x2; outer catchCause removed; member warning gains qadi.sink
└── DecisionLog.ts            # name on its layer's sink record
packages/audit/src/AuditDecisionSinkLive.ts   # return { name: "AuditDecisionSinkLive", record } (line 250 on the base)
packages/core/test/
├── SinkEmitReport.test.ts    # NEW (Wave 0): RED + characterisation tests (names below)
├── DecisionSinkForwarding.test.ts / DecisionLog.test.ts / DecisionSink.tst.ts   # edited (Q5)
```

### Pattern 1: The report is inside the containment, and never throws out
**What:** `Effect.catchCause(sink.record(record), cause => report.pipe(Effect.catchCause(() => Effect.void)))`.
**When:** the only form. Probe D1: with a logger whose `log` throws, the candidate returns `Success(undefined)`; the same handler **without** the inner guard returned `Failure(Error: logger exploded)`, i.e. the decision would die. `withFiber` runs the loggers inline and a throw there is a defect on the fiber [VERIFIED: `node_modules/effect/src/internal/effect.ts:6718-6737`, and probe D1].

### Pattern 2: Name read once, "unnamed" defaulted where the emitter is built
`sinkEmitter` already maps over `Effect.serviceOption(DecisionSink)`. Compute `const name = sink.value.name ?? "unnamed"` in the `Option.isSome` branch (once per emitter, not per record), so the per-record closure allocates nothing on the success path.

### Anti-Patterns to Avoid
- **A second `serviceOption(DecisionSink)`** for the name (breaks `sink-read-once`).
- **Annotating the record, the resource, the subject id or any field of the record other than `_tag` and `evaluationId`** (Security Domain).
- **Pinning the exact `String(cause)` of an interrupt:** it contains a fiber id (`Cause([Interrupt(51)])`), not stable. Assert it `include`s `Interrupt`.
- **Removing `isolate` or `decisionSinkAll`'s catch** to "tidy" (D-10, D-11, Open Question 2).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Capturing log lines in a test | a new `Logger.make` collector | `collectingLogger` from `packages/core/test/helpers.ts:137` (core), `@qadi/testing` `CollectingLogger.ts` (other packages) | exists, reads `level`, `message` and `CurrentLogAnnotations`; the `test-helper-twin` gate holds the two equal; **replaces** ambient loggers, so a run stays quiet |
| Making a broken sink | hand-built failing layers with a typed error | `Effect.die`, a throw inside `Effect.sync`, `Effect.interrupt`; one type-escape pin | `record`'s error is `never` (`DecisionSink.ts:50`) |
| A broken port in a test | n/a | n/a | this phase touches no port; `PORT_DOUBLE_BUDGET` is untouched |
| A second emitter to name members | per-site `serviceOption` | `shape.name ?? "unnamed"` on the `DecisionSinkShape` `decisionSinkAll` already holds (`DecisionSinkForwarding.ts:165`) | no new read |

## Common Pitfalls

### Pitfall 1: Two warnings from one failure
**What goes wrong:** a member of `decisionSinkAll` dies, `decisionSinkAll` warns, and the emitter also warns.
**Why it cannot happen:** `decisionSinkAll`'s catch turns the failure into success, so the emitter sees none. The same holds for `isolate` and forwarding's `catchCause(reportSendFailure)`. The classification table below proves each shipped path yields one warning; Wave 0 asserts the count for each.
**Warning sign:** a test sees `lines.length === 2`.

### Pitfall 2: `enforce` with an obliged policy has two sink calls
A `Decision` record, then an `Obligations` record. A sink that dies on every record yields two warnings, one per `qadi.record_tag`. Use a sink that dies only for the record under test (probe the tag with `Match`-free equality on `record._tag`), and filter by annotation.

### Pitfall 3: The RED test for the self-interrupt is not RED for the decision
Base: `evaluate` with `record: () => Effect.interrupt` returns `Allow` (A1). Only `lines.length` is RED (0 vs 1). Say so in the SUMMARY; do not claim the decision changes on the base.

### Pitfall 4: A `Logger.layer([...])` replaces the default loggers
Default test environment has two loggers (`CurrentLoggers size 2`); `Logger.layer([x])` leaves only `x` (probe C1), which is what `collectingLogger` relies on. To add instead, pass `{ mergeWithExisting: true }` [VERIFIED: `Logger.ts:1163-1215`].

### Pitfall 5: `Effect.logWarning` is dropped below the minimum level
`MinimumLogLevel` defaults to Info, so `Warn` passes (probe C2: `[["Warn",["w"]]]`). A deployment that raises the minimum above Warn will not see the report; that is configuration, not a defect.

### Pitfall 6: The oxlint unused-parameter warning on the predicate
The type-escape helper `(_: unknown): _ is never` produced `warning eslint(no-unused-vars): Parameter '_' is declared but only used as a type`. A warning is not a failure (`oxlint` exited with only that warning). The planner either accepts it and confirms `pnpm lint` stays green, or writes a body that reads the parameter (for example `(value: unknown): value is never => value === value`; `NaN` is the only value for which it is false, so prefer a body whose truth is not input-dependent, such as `Object.is(value, value)`).

## Code Examples

### The emitter (compiled shape probed; not yet committed to the repo)
```typescript
// Source: probe `candidateEmit`, run against effect 4.1.2 this session (probe A5, D1, T5), then deleted.
export const sinkEmitter: Effect.Effect<(record: SinkRecord) => Effect.Effect<void>> = Effect.map(
  Effect.serviceOption(DecisionSink),
  (sink) => {
    if (Option.isNone(sink)) return () => Effect.void;
    const name = sink.value.name ?? "unnamed";
    return (record) =>
      Effect.catchCause(sink.value.record(record), (cause) =>
        Effect.logWarning("qadi: a decision sink failed; the record was not delivered").pipe(
          Effect.annotateLogs({
            "qadi.sink": name,
            "qadi.record_tag": record._tag,
            evaluationId: record.evaluationId,
            "qadi.cause": String(cause),
          }),
          Effect.catchCause(() => Effect.void), // D-04: a logger that throws is swallowed too
        ),
      );
  },
);
```
The probe used `qadi.record` for the tag key; see Q3 for why `qadi.record_tag` is recommended. A cold-path `Effect.fn("qadi.sinkEmitter.report")` helper for the `logWarning` pipe is equally valid.

### Probe outputs, verbatim (throwaway test file under `packages/core/test/`, deleted afterwards)
```
A1 base evaluate with Effect.interrupt sink: Success(Allow)
A2 forked fiber exit: Success(Allow) | isInterrupted: false
A3 catchCause(Effect.interrupt) then yieldNow: Success(after) after
A4 externally interrupted, catchCause body: Failure interrupts=true
A5 die Success(undefined) lines: 1 [["Warn",["qadi: a decision sink failed; the record was not delivered"],{"qadi.sink":"unnamed","qadi.record":"Decision","evaluationId":"e1","qadi.cause":"Cause([Die(Error: boom)])"}]]
A5 throws Success(undefined) lines: 1 [["Warn",[...same message...],{"qadi.sink":"unnamed",...,"qadi.cause":"Cause([Die(Error: thrown)])"}]]
A5 interrupt Success(undefined) lines: 1 [["Warn",[...],{"qadi.sink":"unnamed",...,"qadi.cause":"Cause([Interrupt(51)])"}]]
A5 named Success(undefined) lines: 1 [["Warn",[...],{"qadi.sink":"mine",...,"qadi.cause":"Cause([Die(\"x\")])"}]]
D1 throwing logger + inner catchCause: Success(undefined)
D1 throwing logger WITHOUT inner guard: Failure(Error: logger exploded)
C1 Logger.layer([..]) lines: ["only:Warn"]
C1 default CurrentLoggers size (test env): 2
C2 collected: [["Warn",["w"]]]
E1 n            (Effect.serviceOption(DecisionSink) then sink.value.name)
T5 candidate emit over typed-fail sink: Success(undefined) lines: 1 ["Cause([Fail(\"typed failure\")])"]
T5 raw record exit: Fail=true
```
(`message` arrives as a one-element array; assert with `String(entry.message)`, as the existing tests do.)

## Findings by Question

### Q1. Inventory and classification

**Every `DecisionSink` implementation** in `packages/*/src` [VERIFIED: `grep -rn "Layer.succeed(DecisionSink" packages/*/src`, `Layer.effect(DecisionSink`]: five.

| # | Implementation | Location | Today's name | Proposed `name` (discretion) | Can its `record` fail/die? |
|---|----------------|----------|--------------|------------------------------|-----------------------------|
| 1 | `decisionSinkForwarding` | `DecisionSinkForwarding.ts:110` | none | `"decisionSinkForwarding"` (D-06) | die only via a throwing `onFailure`, or a logger throw |
| 2 | `decisionSinkAll` | `DecisionSinkForwarding.ts:161,169` | none | `"decisionSinkAll"` (D-07, fixed) | its members are caught; a logger throw in its own warning |
| 3 | `makeDecisionLog(...).layer` | `DecisionLog.ts:283` | none | `"decisionLog"` (see below) | caught by `isolate` |
| 4 | `AuditDecisionSinkLive` | `packages/audit/src/AuditDecisionSinkLive.ts:250` (`return { record }`) | none | `"AuditDecisionSinkLive"` | a defect outside its own exits escapes |
| 5 | the shadow sink | `EvaluationEnvironment.ts:75` (`{ record: () => Effect.void }`) | none | leave unnamed (Open Question 3) | never |

Devtools, react, http, promise, testing, predicate-*: **no implementation** (devtools `Wiring.ts:106` reads presence only; `packages/testing/src/QadiReviewLayer.ts` mentions the sink in docs only). Examples: `examples/nextjs-newsroom/src/server/forwarding.ts:40` and `examples/http-advanced/server.ts:241` use shipped sinks; no example edit. `features/`: the three step files only provide shipped sinks; none counts warnings.

Naming convention: the identifier of the export. `makeDecisionLog` returns a log whose sink is the log, so `"decisionLog"`; do not put `environment` in the name (a label, but two logs in one `decisionSinkAll` would then differ only by a deployment string; a stable name is what a log query wants). [ASSUMED: names are the planner's, per D "Claude's Discretion"; D-06/D-07 fix only the first two literally]

**Warning classification** (every `logWarning`/`logError`/`catchCause` on a sink's `record` path):

| # | file:line | Message / what it contains | Kind | Decision | Reported twice after the change? |
|---|-----------|----------------------------|------|----------|----------------------------------|
| W0 | `SinkEmit.ts:53` | `catchCause(..., () => Effect.void)`: contains every cause, **reports none** | outer containment | becomes the report (D-01..D-04) | n/a |
| W1 | `DecisionSinkForwarding.ts:90-93` -> `EncodeRefusalReport.ts:37` | "qadi: a decision record could not be encoded for forwarding", annotations `qadi.refusal`, `qadi.path`, `evaluationId` | says something else (an encode refusal, not a delivery failure) | **keep** (D-09) | no: it returns success |
| W2 | `EncodeRefusalReport.ts:41-45` (called from W1 and `AuditWriteReport.ts:218-222`) | "qadi: an encode-refusal hook threw" + `qadi.cause` | contains a hook the sink was handed; says which hook | **keep** | no |
| W3 | `DecisionSinkForwarding.ts:98-99` (`reportSendFailure`, no `onFailure`) | "qadi: a decision record could not be forwarded" + `qadi.cause`: `send` failed or died | the sink handled the failure | **keep** (D-09) | no |
| W3b | `DecisionSinkForwarding.ts:108` (`reportSendFailure`, with `onFailure`) | no log; calls the caller's hook with `Cause.squash(cause)` | behaviour (BEH-QD-187) | **keep** | a hook that throws dies out of W3b: after D-09 the emitter reports it once |
| W4 | `DecisionSinkForwarding.ts:125-129` | same text as W3, `qadi.cause`: outer "defence in depth" for a throwing `onFailure` | **pure outer containment** | **remove** (D-09) | removing it prevents a second report when composed (it would be a second `Warn` beside the emitter's) |
| W5 | `DecisionSinkForwarding.ts:187-191` | "qadi: a fanned-out decision sink failed unexpectedly" + `qadi.cause` | **changes behaviour** (later members still run) | **keep**, add `qadi.sink` = member `name ?? "unnamed"` (D-10) | no: it returns success, so the emitter is silent; a member that is itself a `decisionSinkAll` reports once at the innermost level |
| W6 | `DecisionLog.ts:172-177` `isolate("append")` (`:259`) | "qadi: a decision log's append half failed" + `qadi.cause` | says which half; see Open Question 2 for the "other half still runs" caveat | **keep** (D-11) | no |
| W7 | `DecisionLog.ts:257` `isolate("publish")` | "... publish half failed" | behaviour-neutral but *needed*: without it the outer `isolate("append")` would mislabel a publish defect as "append" | **keep** | no: inner catch returns success, outer sees none |
| W8 | `AuditWriteReport.ts:241` `Effect.logWithLevel(...).pipe(annotateLogs({ evaluationId }))` | the audit outcome line (`describeAuditWriteOutcome`) | a report, not containment | **keep**, untouched | no |
| W9 | `AuditWriteReport.ts:254-258` | "qadi/audit: an onOutcome hook threw" + `evaluationId`, `qadi.cause` | contains a caller's hook; says which | **keep** | no |
| W10 | `AuditDecisionSinkLive.ts:203` | `catchCause(... CommitFailed({ cause }))`: a value, not a log | behaviour (an outcome) | **keep** | n/a |

Not on a sink's `record` path, so not rows: `Source.ts:266,273` (the devtools feed reader), `QadiHttpError.ts:431,451`, `DecisionStreamRoute.ts:129`, `DenialLog.ts`, `PortAccess.ts:146` (`catchPortDefect`, port reads), `PortRemote.ts:86,93`, `Role.ts:323`, `Lifecycle.ts:166` (a `logDebug` on denial). [VERIFIED: grep of `logWarning|logError|catchCause|annotateLogs` over `packages/*/src`]

Net effect of the phase on shipped sinks: **one removal (W4)**, **one annotation added (W5)**, **four names added**. A throwing `onFailure` on a send failure now logs the emitter's text (sink `decisionSinkForwarding`) instead of W4's; the count stays one.

### Q2. Effect 4.1.2 semantics (all probed)

**a. Self-interruption.** `Effect.catchCause` recovers `Effect.interrupt` on the evaluating fiber. On the base, `evaluate` with `record: () => Effect.interrupt` returns `Success(Allow)`; the forked fiber's exit is `Success`, `isInterrupted: false` (A1, A2); recovery then continues normally (A3). An **external** `Fiber.interrupt` is *not* recovered: the handler body is skipped and the fiber ends `Failure interrupts=true` (A4). So D-03's self-interrupt row is achievable and means: warn once, decision unchanged. Assert it with `Cause.hasInterrupts`-free checks (the annotation `qadi.cause` includes `Interrupt`); do not pin the fiber id.

**b. Typed failure through a type escape** (D-14). Compiled under the repo's strict flags (`tsconfig.react-base.json`, `exactOptionalPropertyTypes`) in a throwaway `tsc -p` project, deleted afterwards:

| Attempt | Result |
|---------|--------|
| `{ record: () => Effect.fail("x") }` | error TS2375 and TS377003 (`Missing errors string in the expected Effect type`) |
| `<E>(f: Effect<void, E>): DecisionSinkShape => ({ record: () => f })` | error TS2375, `Type 'E' is not assignable to type 'never'` |
| `Layer.succeed(DecisionSink, { record: (_r): Effect<void, string> => Effect.fail("x") })` | error TS2345 |
| `{ record: () => Effect.flip(Effect.void) }` | error TS2375 (`Effect<never, void>`) |
| `const isNever = (_: unknown): _ is never => true; record: () => isNever(e) ? Effect.fail(e) : Effect.void` | **compiles**; at runtime `Cause.hasFails` is true and the candidate emitter reports `Cause([Fail("typed failure")])` once |
| `{ record: JSON.parse("null") }` (an `any` source, no literal `any`) | **compiles** |
| `{ record: () => Effect.die("x") }` | compiles (the documented gap) |

`oxlint` on the probe: only the unused-parameter warning for the predicate (Pitfall 6); no `no-explicit-any` error. **Test set (D-13/D-14):** `Effect.die`, a throw in `Effect.sync`, `Effect.interrupt`, plus one typed-failure-through-predicate row. The `DecisionSink.tst.ts` pin ("a sink that can fail is unrepresentable", `:43-57`) is unaffected: it asserts assignability of `Effect<void, string>`, which stays false; add a comment there that the predicate hole exists. BEH-QD-182 and INV-QD-035 call a failing sink "unrepresentable" (`spec/behaviors/24-decision-sink.md:74-78`, `spec/invariants.md:1437-1439`); restate it as "not representable without a type escape" in the same records change.

**c. Capturing log entries.** Use the existing helper: `collectingLogger()` in `packages/core/test/helpers.ts:137-150` returns `{ lines, layer }`, where `layer = Logger.layer([Logger.make(options => lines.push({ message: options.message, level: options.logLevel, annotations: options.fiber.getRef(References.CurrentLogAnnotations) }))])`. `Logger.layer(loggers)` **overwrites** the current set unless `{ mergeWithExisting: true }` [VERIFIED: `Logger.ts:1163-1215`]; probe C1 confirms it replaces (the default set has 2 loggers). Install it either as `Layer.mergeAll(sinkLayer, logger)` (the pattern at `DecisionSinkForwarding.test.ts:143-148`) or `Effect.provide(logger)` around the evaluation. `entry.level` is `"Warn"`. Other packages import `collectingLogger` from `@qadi/testing` (`AuditDecisionSinkLive.test.ts:9`).

**d. A report that cannot break the decision.** The minimal correct composition is Pattern 1 above (probe D1). To test it, provide `Logger.layer([Logger.make(() => { throw new Error("logger exploded"); })])` with a dying sink through `evaluate`, and assert the decision equals the no-sink baseline. This also kills the Stryker mutant that removes the inner `catchCause`.

### Q3. The emitter, its callers, the `sink-read-once` count, annotation keys

- Callers: `Lifecycle.ts:83` (`const emit = yield* sinkEmitter`, then `emit(...)` at `:131` Failed record and `:177` Decided record) and `Handover.ts:122` (inside `discharge`, after the early return at `:114`; emits at `:135 :136 :143 :149`). No other reader. [VERIFIED: `grep -rn sinkEmitter packages/*/src`]
- **Obligation record through public `enforce`** (the existing idiom, `DecisionSink.test.ts:1143-1154`): `enforce(P.obliged(obligation("audit.log"), P.hasPermission(read)), { onObligations: () => Effect.void })(Effect.succeed("ran"))` emits a `Decision` then an `Obligations` record (`Discharged`). Without `onObligations` it emits `Refused` and fails `UndischargedObligation` (`:1131-1140`). Both are driven with `testLayer(allowed)`.
- `sink-read-once` counts the textual match of `/serviceOption\(\s*DecisionSink\s*\)/` per file in non-test `packages/*` source (`check-house-style.mjs:566,1124-1132`) and requires `SinkEmit.ts` = 1, `Wiring.ts` = 1 (`:575-578`). `sink.value.name` does not match; nothing in `SINK_READ_ALLOWED` changes.
- **Annotation key conventions in use** [VERIFIED: `grep -o 'annotateLogs([^)]*'` over `packages/*/src`]: `qadi.cause` (4x), `qadi.port` (2x), `qadi.refusal`/`qadi.path` (via `encodeRefusalAnnotations`, `JsonRefusal.ts:123-130`), `qadi.unknown_roles`, `qadi.thrown`, `qadi.frame`, `qadi.denial_site`, `qadi.policy_tag`, `qadi.subject_id`, `qadi.reason`, and the **unprefixed `evaluationId`** (used by `encodeRefusalAnnotations` and `AuditWriteReport.ts:241,256`). Recommendation: `qadi.sink` (the sink's name, parallel to `qadi.port`), `qadi.record_tag` (parallel to `qadi.policy_tag`; the span uses `qadi.error_tag`), `evaluationId` (unprefixed, so one log query on `evaluationId` joins the encode-refusal, audit and sink lines), `qadi.cause` unchanged. [ASSUMED: the exact key spelling is discretion; the convention evidence is verified]

### Q4. `DecisionSinkShape.name`

- Edit `packages/core/src/DecisionSink.ts:34-51`: add above `record`
  ```ts
  /** A label a reader sees in a report, never an input to a decision. */
  readonly name?: string | undefined;
  ```
  mirroring `AttributeResolverShape.name` (`AttributeResolver.ts:53`, doc "a label a reader sees ... never an input to a decision" at `:50-52`; `PortDescription.ts:48` carries the same shape).
- `spec/overview.md:338` lists `DecisionSinkShape` as an exported type only; adding a field adds no export, so gate 13 (`pnpm spec:api`) is unaffected. `spec/behaviors/24-decision-sink.md:37-40`'s ` ```ts ` fence (not compiled) should still gain the field. `spec/overview.md:387-391` ("whatever happens to it ... cannot change the decision") gets one clause for the report.
- Pins: `packages/core/test/DecisionSink.tst.ts` (add `expect<DecisionSinkShape["name"]>().type.toBe<string | undefined>()`, and that a record-only literal is still assignable). No other test pins the shape. Places that construct a sink shape and should set it: the four shipped literals (Q1), plus `examples/` and tests that build ad-hoc sinks keep compiling unchanged (optional field).
- Constructs to touch: `DecisionSinkForwarding.ts:110` and `:169`, `DecisionLog.ts:283`, `AuditDecisionSinkLive.ts:250`. A string-literal name is a Stryker `StringLiteral` mutant in each; one test per sink pinning `(yield* DecisionSink).name` kills it.

### Q5. Tests that change

| Test | File:line | Change |
|------|-----------|--------|
| "a member's death is reported through a log" | `DecisionSinkForwarding.test.ts:433-455` | keeps `failed unexpectedly` and `qadi.cause` (message is unchanged); add `qadi.sink === "unnamed"`, and a named-member row |
| "with no onFailure it warns" | `:141-157` | unchanged (W3 stays) |
| "an onFailure that throws on a refusal still cannot change the decision" | `:330-342` | unchanged; passes through W2, which contains the hook, so the outer catch (W4) was never reached |
| (none) onFailure throws on a *send* failure | new | characterisation, green on the base (W4 logs once), count 1 after (the emitter logs once); assert count, **not** message |
| `DecisionSink.test.ts:341-395, 1123-1190` (dying/throwing sinks, no logger) | | still pass; they now print a `Warn` through the default logger. Optionally add `collectingLogger` to keep the run quiet |
| "a sink that can fail is unrepresentable" | `DecisionSink.tst.ts:43-57` | comment amended; assertions unchanged |
| `DecisionLog.test.ts` | | no assertion names the "half failed" lines today; add pins (Open Question 2) |
| Audit tests | `AuditDecisionSinkLive.test.ts`, `driveExit.ts` | unchanged: they call `(yield* DecisionSink).record(...)` directly, not through the emitter, so no new line appears |

BDD: `features/features/{decision-log,devtools-simulator,merged-sources}/*.steps.test.ts` provide shipped sinks only and count no warnings [VERIFIED: grep for `logWarning|Logger|collectingLogger` over `features/` found none].

### Q6. Spec records

- **INV-QD-035** lives at `spec/invariants.md:1426-1470` ("A sink cannot change a decision"). Its Source paragraph (`:1432-1434`) and Implication (`:1436-1450`) must be restated: the emitter contains *and reports*; the "unrepresentable" wording becomes "not representable without a type escape"; Enforcement (`:1458-1463`) gains the new test file. Restate in place; add **INV-QD-337** (a contained sink failure is reported exactly once, naming the sink) and **INV-QD-338** (the report cannot change the outcome: a logger that throws is swallowed; or a second statement the planner prefers). Reserved INV range 337..338 [VERIFIED free].
- **Behaviours** live in `spec/behaviors/24-decision-sink.md`: BEH-QD-181 (`:32`, the shape fence), BEH-QD-182 (`:66`, "A sink cannot change a decision", amend), BEH-QD-187 (`:350`, forwarding and `decisionSinkAll`), BEH-QD-185 (the decision log). New rows BEH-QD-566..570 (all free): suggested 566 the emitter reports every cause it contains once; 567 the report names the sink or says `unnamed`; 568 the report cannot change the outcome; 569 a shipped sink keeps only the reports that change behaviour (the classification table, W4 removed); 570 `decisionSinkAll` names the failing member. Unused numbers go in the CCR row ("Unused: ...") per _WAVE10-CONTEXT.md.
- **ADR-QD-159**: new file `spec/decisions/159-the-sink-emitter-reports-what-it-contains.md` (Status: "Accepted"; ADR-QD-044 and ADR-QD-100 kept), plus an `index.yaml` entry (format at `spec/decisions/index.yaml`, entries `id/file/title/status`), plus a short amendment line on ADR-QD-044 only if its text claims the emitter reports nothing (it does not; skip).
- **CCR-QD-437** row in `spec/README.md` (the latest is CCR-QD-436 at `:373`; the row lists files with their new revisions, then "ARCH-93. **...**" prose). Bump documents with `node scripts/spec-revise.mjs <doc> "<what changed>" --date 2026-11-15` (`scripts/spec-revise.mjs:1-30`); `--check` verifies (`pnpm spec:verify`).
- **Traceability** (`spec/traceability.md`): the 24 row's BEH list (the "24" document row follows the pattern at `:75` for 33), the INV-QD-035 row (`:118`) and new INV-QD-337/338 rows, an ADR-QD-159 row after ADR-QD-158 (`:320`), the test-file table rows near `:418` (`DecisionSink.test.ts`), `:437` (forwarding), `:438` (`DecisionLog.test.ts`), and a row for the new `SinkEmitReport.test.ts`. `spec/behaviors/index.yaml` needs no edit (it lists documents, `:75`).
- **Changesets:** `.changeset/<name>.md` with `"@qadi/core": minor`: an optional `name` on `DecisionSinkShape`; a user sink that fails or dies now logs one warning (text above). `"@qadi/audit": patch`: the audit sink names itself. No devtools/react/http change. Not Breaking (a new log line and an optional field), so WX-07 needs no `Breaking` marker; the existing 0.13 entries in `apps/website/src/content/docs/docs/reference/upgrading.md` (`:619-742`) are all consequential changes. A short non-breaking `## 0.13: a failing decision sink is now reported` entry is recommended because a deployment counting warnings or alerting on them will see a new line (check `pnpm spec:website-examples` if the entry has a ` ```typescript ` fence).
- **AGENTS.md:** no section names a moved file in this change; `:50-51,145` mention `AuditDecisionSinkLive.ts` as a path only. No AGENTS.md edit needed.
- **Website:** `apps/website/src/content/docs/docs/concepts/decision-lifecycle.md:76-86` ("`evaluate` additionally catches any defect at the call site") and `packages/core/services.md:79-83` ("Whatever happens inside a sink ... cannot change the decision") each gain "and is reported once as a warning, naming the sink". `packages/audit/{index,capabilities}.md` mention the sink but make no failure-behaviour claim [VERIFIED: grep]. `spec/overview.md:387-391`, `spec/behaviors/24-decision-sink.md:96-99`, and `AuditDecisionSinkLive.ts:121-125` docs are the other prose to touch.

### Q7. Mutation evidence

Configs: core is `stryker.config.mjs` (the default; `jsonReporter` -> `reports/mutation/mutation.json`, `thresholds.break: 80`, `coverageAnalysis: "perTest"`, `ignoreStatic: true`, `timeoutMS: 20000`); audit is `stryker.audit.mjs` (-> `reports/mutation-audit/mutation.json`). Both reports are gitignored (`git check-ignore` printed them). The phase base must be taken from two runs, because core and audit use two configs.

**Commands** (repo root; both run on the untouched tree):
```
pnpm exec stryker run --mutate 'packages/core/src/SinkEmit.ts,packages/core/src/DecisionSinkForwarding.ts,packages/core/src/DecisionLog.ts'
pnpm exec stryker run stryker.audit.mjs --mutate 'packages/audit/src/AuditDecisionSinkLive.ts'
```
Run time measured this session: core **58 s** (1223 tests, initial run 19 s, 11 runner processes), audit **17 s**. [VERIFIED: `time` output]

**Per-file scores at HEAD `88ae497c`** (detected = Killed + Timeout; scored = detected + Survived + NoCoverage; Ignored excluded, the 45 writer's definition):

| File | Score | (detected/scored) | Ignored | Survivors / NoCoverage |
|------|-------|-------------------|---------|------------------------|
| `packages/core/src/SinkEmit.ts` | 1.0 | 28/28 | 2 | none |
| `packages/core/src/DecisionSinkForwarding.ts` | 0.8065 | 25/31 | 1 | NoCoverage `:126` StringLiteral, `:127` ObjectLiteral (W4); Survived `:87` span name `"qadi.decisionSinkForwarding.refused"`, `:125` ArrowFunction (W4), `:193:13` `{discard:true}`->`{}`, `:193:24` `true`->`false` |
| `packages/core/src/DecisionLog.ts` | 0.9275 | 64/69 | 3 | NoCoverage `:174` message, `:175` `{ "qadi.cause" }`; Survived `:173` ArrowFunction, `:257` `"publish"`->`""`, `:259` `"append"`->`""` |
| `packages/audit/src/AuditDecisionSinkLive.ts` | 1.0 | 58/58 | n/a | none |

The core run's overall score was 91.41 (117/128), `All files`. Removing W4 deletes three uncovered mutants (126, 127, 125) so `DecisionSinkForwarding.ts` becomes 25/28 = 0.893 with no new test; adding a name adds one `StringLiteral` mutant per sink, killed by a name-pin test. The 45 writer (`45-01-PLAN.md:183`) retargets directly: `NAMED` becomes the four files, but because two reports are involved, run it twice (once per config) and merge the `measured` objects into `46-mutation-base.json` (`measured`, `unmeasured`, `new`, `deleted`, `moved`). It refuses a stale report (mtime) and a report whose `source` differs from disk; the reports in `reports/mutation/` and `reports/mutation-audit/` were regenerated this session and will be stale-by-mtime relative to any later `packages/core/test` edit, so the planner reruns the writer's Stryker step on the actual base. The comparer is a node one-liner failing if any touched file's score drops; "a drop is closed with a test, never re-baselined" (WX-05).

New mutants to kill in `SinkEmit.ts`: the message string, each of the four annotation keys/values, `"unnamed"`, the inner `catchCause` (throwing-logger test), the `Option.isNone` branch (no-sink baseline), and the `name` read.

### Q8. Validation Architecture: see the section below.

## Runtime State Inventory

Not a rename, refactor or migration phase; omitted. (No stored data, live service config, OS registration, secret or build artefact carries the strings changed. The one persisted artefact is operator log queries keyed on the removed W4 text "a decision record could not be forwarded" when `onFailure` throws on a send failure; that is a behavioural note for the upgrade entry, not a migration.)

## State of the Art

| Old | Current | When | Impact |
|-----|---------|------|--------|
| the emitter contains and reports nothing | contains and reports once | this phase (ADR-QD-159) | a user-written sink can no longer lose records silently |
| each shipped sink has its own outer containment | the emitter is the containment; sinks keep only reports that say something else | this phase | W4 removed |
| "a failing sink is unrepresentable" | not representable without a type escape | this phase's records | wording only |

**Deprecated/outdated:** BEH-QD-182's and INV-QD-035's "enforced twice" paragraph says the emitter swallows; both are restated.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | The shipped sink names (`"decisionLog"`, `"AuditDecisionSinkLive"`) | Q1 | None: D "Claude's Discretion"; names are labels |
| A2 | The key spellings `qadi.sink`, `qadi.record_tag` | Q3 | Low: D "Claude's Discretion"; `qadi.cause` is fixed |
| A3 | `DecisionLog`'s append half is reachable from a test via `ingest` of a `DecisionRecord` that has an own, enumerable, throwing getter (`stampRecord` spreads `{ ...r, environment }`, `DecisionRecord.ts:181-182`); the publish half is not reachable | Open Question 2 | Medium: if neither is reachable the three `isolate` mutants stay as survivors (they already are, so no score drop, but D-11's keep is then unpinned) |
| A4 | A cold-path `Effect.fn` span for the report adds no existing-test breakage (no test counts spans with a failing sink) | Code Examples | Low: if one does, use a plain function |

## Open Questions (RESOLVED)

All four were put to the user on 2026-11-15 and are now decisions in `46-CONTEXT.md`.

1. **EMIT-02 / D-14: a "failing" sink is reachable only through a type escape.** RESOLVED as **D-14a**: pin one row, named for what it is (a typed failure leaked through a `(x: unknown): x is never` predicate, then `Effect.fail`), alongside the die, throw and self-interrupt rows. BEH-QD-182's restatement says the type closes the gap except by deliberate escape.
2. **D-11's stated reason does not hold for the append half.** RESOLVED as **D-11 (amended)**: keep both `isolate` calls because they say which half failed, which the emitter cannot. Correct the doc comment at `DecisionLog.ts:165-171` and the BEH text to say that. Pin each half where reachable (A3). If the publish half is unreachable from a test, record it as kept but unreachable.
3. **Does D-06 include the shadow sink (`EvaluationEnvironment.ts:75`)?** RESOLVED as **D-06a**: name it too, applying D-06 literally (`"evaluationEnvironment.shadow"`).
4. **`decisionSinkAll`'s message text stays.** "qadi: a fanned-out decision sink failed unexpectedly" is unchanged, and the member name is added as an annotation (D-10). No conflict.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| node | everything | yes | v26.13.0 [CITED: 45-RESEARCH.md; unchanged install] | none needed |
| pnpm | all commands | yes | 10.17.1 [CITED: 45-RESEARCH.md] | none needed |
| vitest / `@effect/vitest` | tests | yes | 5.1.0 / 4.1.2 [VERIFIED: run banner, `effect` 4.1.2] | none needed |
| Stryker + vitest runner | base and after | yes | ran this session, 58 s and 17 s | none needed |
| tstyche | optional `.tst.ts` pin | yes | 7.2.5 [CITED: 45-RESEARCH.md] | skip the pin |

**Missing dependencies:** none.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest 5.1.0 + `@effect/vitest` 4.1.2; `tstyche` for type pins |
| Config | `packages/core/vitest.config.ts` (`name: "core"`, `include: ["test/**/*.test.ts"]`), `packages/audit/vitest.config.ts`, `stryker.config.mjs`, `stryker.audit.mjs`; coverage thresholds core 95 / others 90 |
| Quick run | `pnpm exec vitest run --project core packages/core/test/SinkEmitReport.test.ts packages/core/test/DecisionSink.test.ts packages/core/test/DecisionSinkForwarding.test.ts packages/core/test/DecisionLog.test.ts` (from the repo root) |
| Full suite | `pnpm check:pr < /dev/null` (`node scripts/run-check.mjs --skip-mutation`); fast loop `pnpm check:fast`; core project alone `pnpm exec vitest run --project core` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| EMIT-01 | one `Warn`, fixed text, annotations `qadi.sink`, `qadi.record_tag`, `evaluationId`, `qadi.cause`, for die / throw / self-interrupt / typed-escape, through `evaluate` | `it.effect` table | `pnpm exec vitest run --project core packages/core/test/SinkEmitReport.test.ts` | Wave 0 (RED on base) |
| EMIT-01 | the same for an `Obligations` record through `enforce` (a sink that dies only on `_tag === "Obligations"`; both `Discharged` and `Refused` paths) | `it.effect` | same file | Wave 0 (RED) |
| EMIT-02 | decision unchanged (equal to the no-sink baseline, as `DecisionSink.test.ts:353-357` does) and the typed `EvaluationError` survives on the failure path | `it.effect` | same file | Wave 0 (the decision half is green on the base; the warning half is RED) |
| EMIT-01 (D-08) | unnamed sink -> `qadi.sink === "unnamed"`; named -> its name | `it.effect` | same file | Wave 0 (RED) |
| EMIT-01 (D-04) | a throwing logger: decision still unchanged | `it.effect` | same file | Wave 0 (green on base trivially, green after; kills the inner `catchCause` mutant) |
| EMIT-03 | W4 removed: `send` fails and `onFailure` throws -> exactly one warning, decision unchanged | `it.effect` | `DecisionSinkForwarding.test.ts` | Wave 0 characterisation (green before and after) |
| EMIT-03 | W5: member name annotation, `"unnamed"` for an unnamed member, and one warning when the member dies | `it.effect` | `DecisionSinkForwarding.test.ts` | Wave 0 (named part RED) |
| EMIT-03 | W1/W3/W5/W6/W7 each yield exactly one warning, none doubled; `isolate` halves pinned | `it.effect` | `DecisionSinkForwarding.test.ts`, `DecisionLog.test.ts` | Wave 0 (green on the base) |
| EMIT-03 | each shipped sink's `name` (`decisionSinkForwarding`, `decisionSinkAll`, `decisionLog`, `AuditDecisionSinkLive`) | `it.effect` | the four test files | Wave 0 (RED) |
| EMIT-04 | one read per evaluation; `name` read through the existing service handle | `pnpm lint` (`check-house-style.mjs`'s `[sink-read-once]`) and the existing `SinkEmit` suite | `pnpm lint` | exists |
| EMIT-04 | `DecisionSinkShape["name"]` is `string \| undefined`, optional | tstyche | `pnpm test:tstyche` | extends `DecisionSink.tst.ts` |
| WX-01 | `check:pr` green | gate | `pnpm check:pr < /dev/null` | exists |
| WX-02 | reserved ids only; no placeholder ids | `[no-numbering-placeholder]`, `git grep` | `pnpm lint` | exists |
| WX-03 | overview unaffected, no export added | `pnpm spec:api` | `pnpm spec:api` | exists |
| WX-04 | no forbidden construct | `pnpm lint` and a diff scan of `packages/*/src` for `\bas\b`, `!`, `any`, `switch`, `fnUntraced` | `pnpm lint` | exists |
| WX-05 | coverage holds; Stryker not below base for the four files | `pnpm coverage` and the comparer | commands in Q7 | base in Wave 0 |
| WX-06 | tests precede the change | git order | `git log --format=%H -- packages/core/src packages/audit/src` has no commit before the test commits | Wave 0 |
| WX-07 | a changeset exists; not Breaking | review | `.changeset/*.md` has `"@qadi/core": minor` and `"@qadi/audit": patch` | Wave 0 |

### Sampling Rate
- **Per task commit:** the quick run command, plus `pnpm typecheck` after any `src` edit (it also runs `tsc -p tsconfig.test.json`).
- **After the emitter edit:** the core project alone (`pnpm exec vitest run --project core`, about 20 s).
- **Per wave merge:** `pnpm check:fast`.
- **Phase gate:** `pnpm check:pr < /dev/null` green, then the Stryker comparison exit 0, before `/gsd-verify-work`.
- A task whose verify would run a RED file excludes it by exact path until the fixing task (_SHARED-CONTEXT hygiene).

### Wave 0 Gaps
- [ ] `46-mutation-base.json`: four files, written from two Stryker runs (Q7), the phase's first plan commit, alone.
- [ ] `46-classification.md` (or the plan's table): Q1's W0-W10 rows, committed with the RED tests (D-12).
- [ ] `packages/core/test/SinkEmitReport.test.ts`: the EMIT-01/02 tables above, with `collectingLogger` from `./helpers.ts`.
- [ ] Characterisation and pin tests in `DecisionSinkForwarding.test.ts` and `DecisionLog.test.ts`.
- [ ] `DecisionSink.tst.ts` extension for `name`.
- No framework install is needed.

## Security Domain

Security enforcement is enabled (`workflow.security_enforcement: true`, ASVS level 1, block on high; `.planning/config.json`).

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|------------------|
| V2 Authentication | no | none |
| V3 Session Management | no | none |
| V4 Access Control | yes (INV-QD-035: an observer must never deny) | the emitter contains every cause; the report is itself contained (D-04) |
| V5 Input Validation | partly (the sink `name` is a caller-supplied string) | a label only, rendered as a structured log annotation, never parsed or branched on |
| V6 Cryptography | no | none |
| V7 Error Handling / Logging | yes | a fixed message and a closed annotation set carrying no record content |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| The report discloses a resource, a subject or a policy through the log | Information disclosure | annotate only the sink name, the record `_tag`, `evaluationId` (an opaque correlation id, already logged by `encodeRefusalAnnotations` and `AuditWriteReport.ts`) and `qadi.cause`. Never `subjectId`, `resource`, `resourceId`, `policy`, `action`. `String(cause)` renders the cause's error message, so a user sink that puts record content in its own thrown message leaks it: the same exposure `qadi.cause` already has in W3/W5/W6, so it is not new, but state it in the BEH |
| A logger that throws turns an observer into a denier | Denial of service / Elevation | inner `catchCause(() => Effect.void)` (probe D1); a test with a throwing logger |
| A sink failing on every evaluation floods the log | Denial of service | no throttle (D-01 declines a metric and nothing else is asked); one line per failed record. State it in the ADR as an accepted consequence; an operator filters on `qadi.sink`. A throttle is a separate decision |
| A hostile `name` forges log lines (newlines) | Tampering (log forging) | the name is an annotation value, so structured loggers escape it; a pretty logger may print it raw. Accept (the caller owns both the sink and the logger); do not interpolate the name into the message text. The fixed message makes that the design |
| A throwing sink *name* getter | Denial of service | the name is read once when the emitter is built, inside the `Effect.map`; a getter that throws there would die in `evaluate`. Low likelihood (the name is a string on an object literal), but read it inside the same containment if the planner wants no residual risk [ASSUMED: not probed] |

## Sources

### Primary (HIGH confidence)
- `packages/core/src/SinkEmit.ts`, `DecisionSink.ts`, `DecisionSinkForwarding.ts`, `DecisionLog.ts`, `EncodeRefusalReport.ts`, `EvaluationEnvironment.ts`, `Lifecycle.ts:70-180`, `Handover.ts:100-155`, `DecisionRecord.ts`, `SinkRecordFields.ts:26-29`, `packages/audit/src/AuditDecisionSinkLive.ts`, `AuditWriteReport.ts:225-260` (read this session)
- `packages/core/test/DecisionSink.test.ts`, `DecisionSinkForwarding.test.ts`, `DecisionSink.tst.ts`, `helpers.ts:120-175`; `packages/testing/src/CollectingLogger.ts`
- `scripts/check-house-style.mjs:566-578, 1124-1132, 1429-1454`; `stryker.config.mjs`; `.oxlintrc.json`; `.planning/phases/QD-45-*/45-01-PLAN.md:183` (the baseline writer)
- `node_modules/effect/src/Logger.ts:1163-1215`, `internal/effect.ts:6698-6739`, `Effect.ts:5726` (`catchCause`)
- `spec/invariants.md:1426-1470`, `spec/behaviors/24-decision-sink.md:32-130, 350-450`, `spec/traceability.md`, `spec/README.md:373`, `spec/decisions/index.yaml`, `spec/decisions/044-*`, `158-*`, `.changeset/audit-options-refused-when-built.md`, `apps/website/.../upgrading.md`, `decision-lifecycle.md:76-86`, `core/services.md:79-83`
- Probes: a throwaway vitest file (A1-A5, C1-C2, D1, E1, T5) and a throwaway `tsc -p` project (T1-T7) in the repo, both deleted; `git status` afterwards shows no change to tracked or untracked files other than the pre-existing planning files
- Stryker runs: core 58 s, audit 17 s; reports in the gitignored `reports/mutation/` and `reports/mutation-audit/`

### Secondary (MEDIUM confidence)
- `.planning/phases/QD-45-*/45-RESEARCH.md` for tool versions (node, pnpm, tstyche) not re-read from the install this session

### Tertiary (LOW confidence)
- none beyond the `[ASSUMED]` rows in the Assumptions Log

## Metadata

**Confidence breakdown:**
- Emitter shape and Effect semantics: HIGH, run on the installed `effect@4.1.2`
- Inventory and classification: HIGH, every warning on the sink path read and grepped
- Records and test inventory: HIGH for locations and formats, MEDIUM for the exact BEH wording (planner's)
- Mutation base: HIGH (run this session; the planner re-runs it on the actual phase base)
- `DecisionLog` half reachability: MEDIUM (A3)

**Research date:** 2026-11-15
**Valid until:** 2026-12-15 (re-verify line numbers against the phase base, and the effect version if `pnpm-lock.yaml` moves)
