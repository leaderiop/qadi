---
phase: QD-75-a-declared-span-shape-for-the-evaluate-family
reviewed: 2026-11-23T09:37:28Z
depth: standard
files_reviewed: 26
files_reviewed_list:
  - packages/core/src/EvaluationSpan.ts
  - packages/core/src/Lifecycle.ts
  - packages/core/src/Predicate.ts
  - packages/core/src/GuardHealthCheck.ts
  - packages/core/src/SubjectSet.ts
  - packages/core/src/PortSpanEncode.ts
  - packages/core/test/EvaluationSpan.contract.test.ts
  - packages/core/test/EvaluationSpan.test.ts
  - packages/core/test/EvaluationSpan.tst.ts
  - packages/core/test/Evaluate.test.ts
  - packages/core/test/Predicate.test.ts
  - packages/core/test/GuardHealthCheck.test.ts
  - packages/core/test/SubjectSet.test.ts
  - scripts/check-house-style.mjs
  - AGENTS.md
  - spec/decisions/188-the-evaluate-familys-spans-are-declared-once-and-a-failed-span-says-what-was-asked.md
  - spec/decisions/051-a-span-says-what-was-asked.md
  - spec/decisions/109-a-ports-span-is-projected-once-and-every-read-is-one-body.md
  - spec/decisions/index.yaml
  - spec/behaviors/30-port-calls.md
  - spec/behaviors/05-evaluator.md
  - spec/invariants.md
  - spec/traceability.md
  - spec/README.md
  - .changeset/core-evaluate-span-declared.md
  - apps/website/src/content/docs/docs/reference/upgrading.md
findings:
  critical: 0
  warning: 6
  info: 9
  total: 15
  necessity: 1
status: issues_found
---

# Phase 75: Code Review Report

**Reviewed:** 2026-11-23T09:37:28Z
**Depth:** standard
**Files Reviewed:** 26
**Status:** issues_found

## Summary

Scope: the phase diff `c054c2b1..HEAD` across the 26 files the phase changed. The CCR-QD-467
file list matches `git diff --name-only` exactly, and every cited revision matches its document
header. Before writing anything I checked the following:

- `node scripts/check-house-style.mjs` exits clean.
- `check-api-surface` reports 941 exports, as ADR-QD-188 and CCR-QD-467 state.
- The four new or changed span test files pass under vitest (92 tests).
- A script compared every test title quoted in a "Pinned by" or Enforcement line of the changed
  spec text against the named files. All of them exist verbatim. The one miss it found is an
  older INV entry and outside this phase.
- `qadi.decision` appears nowhere outside spec text, the changeset and the upgrade guide.
- No added line is longer than 90 characters.

The regression fix is correct for every typed failure. `decideQuestion` annotates its question
before the lookup (`Lifecycle.ts:80-85`). `toPredicate`'s `tapError` pipeable runs inside the
span, and the four failure rows prove it. The probe and the batches annotate first. Obligations
are written only on an Allow. The denial event carries exactly `policy_tag`, `subject_id` and
`reason`.

There are no blockers. The main concerns:

1. The spec, the declaration's doc and the changeset all promise `qadi.outcome` "on every path".
   That is false for an interrupted or defected evaluation (WR-01).
2. A question's completeness is held only by the contract rows, not by the compiler. This is
   the same gap ADR-QD-133's `PoseOf` closed for port spans (WR-02).
3. The asked projection is restated in three writers (WR-03).
4. The new house-style rules have scope gaps (WR-04).
5. The spec text has two stale passages (WR-05, WR-06).

On the static mutants in `75-RED-EVIDENCE.md`, mutating `declareSpan` or `askedFields` crashes
the import. That does not point to dead code: both are values every writer reads at import, so
a crash is the mutant being detected. Item 6 (cheaper annotation) is recorded as IN-07, with
the code evidence and no measured claim. `necessity-review.md` was read. One necessity finding
is recorded (IN-04).

## Warnings

### WR-01: "Outcome on every path" is false for an interrupted or defected evaluation, and the "abandoned part way" claim is unpinned

**File:** `packages/core/src/Lifecycle.ts:137-148` (and `packages/core/src/EvaluationSpan.ts:85`, `spec/behaviors/30-port-calls.md` BEH-QD-712 REQUIREMENT, `spec/decisions/051-a-span-says-what-was-asked.md` amendment, ADR-QD-188 decision 1, `.changeset/core-evaluate-span-declared.md:5`, `spec/invariants.md` INV-QD-395)
**Issue:** Only two places write the answer:

- the `Effect.tapError` on the lookup, which sees typed failures only;
- the success annotation at `:158-166`.

An interrupted evaluation never reaches either one. That covers a caller's `Effect.timeout`
around `evaluate`, a `decideSubjects` fiber interrupted when it races another, and a host
`DecisionCache.getOrCompute` that dies. In each case the span ends with its question and **no
`qadi.outcome`**.

Yet several texts state the outcome as one of Allow/Deny/Failed "on every path":

- BEH-QD-712's REQUIREMENT ("MUST be `qadi.outcome` … on every path");
- the declaration's doc ("The answer is the outcome on every path", `EvaluationSpan.ts:85`);
- ADR-QD-188 decision 1;
- the ADR-QD-051 amendment;
- the changeset.

INV-QD-395 also says "a span that … is abandoned part way, still says what was asked". That is
true by construction, but no row pins it: every failed-span row in the contract file uses a
typed port failure.

**Fix:** Scope the claim to what the code does, and pin the interrupted case once outside the
locked contract file. For example, in `EvaluationSpan.test.ts` or `Evaluate.test.ts`:

```ts
// BEH-QD-712 REQUIREMENT, reworded:
// The outcome of `qadi.evaluate` MUST be `qadi.outcome`, one of `Allow`, `Deny` and
// `Failed`, on every path that ends in a decision or a typed failure. An interrupted or
// defected evaluation carries its question and no outcome; the span's status says why.

it.effect("an interrupted evaluation carries its question and no outcome", () =>
  Effect.gen(function* () {
    const spans: Array<Tracer.Span> = [];
    yield* Effect.exit(evaluate(clearance).pipe(Effect.timeout("1 millis"))).pipe(
      Effect.provide(Layer.mergeAll(testLayer(u3, { AttributeResolver: hanging }),
        collectingTracer(spans))),
    );
    assert.deepStrictEqual(Object.fromEntries(named(spans, evaluateSpan.name)!.attributes),
      encodeSpan(evaluateSpan.question, { subjectId: "u3", evaluationId: "eval-1",
        policyTag: "HasAttribute" }));
  }));
```

(Use a `scriptedPort` latch or `PortReply` that never answers for `hanging`, and narrow
instead of using `!`.)

### WR-02: A question's completeness is not compiler-held, which is the gap `PoseOf` closed for port spans

**File:** `packages/core/src/EvaluationSpan.ts:214-217` (writers: `Lifecycle.ts:80`, `Predicate.ts:665`, `GuardHealthCheck.ts:103`, `SubjectSet.ts:180`, `SubjectSet.ts:267`)
**Issue:** `annotateSpan` takes `SpanType<SpanStruct<F>>`, in which every member is optional
(`PortSpan.ts`, `SpanType`). A writer that drops `evaluationId` or `policyTag` from its question
therefore compiles and ships a span that says less than was asked.

`PortSpanEncode.ts:87-101` documents this exact defect class: "`SpanType` makes every member
optional, so a `pose` that forgot one compiled and the span said less than was asked — the
shape of the ADR-QD-109 defect". It introduced `PoseOf` to make that a compile error. The
port path enforces it through `portSpan`. The family path does not.

Today only the contract rows catch an omission, and only on the paths they exercise. The
ADR-QD-109 amendment says "the projection this decision states once for a port's span is
applied to `qadi.evaluate` … too", which claims more than the code gives. ADR-QD-188's "What
enforces it" does not list question completeness at all.

**Fix:** Hold every question to `PoseOf`. No family question has an `interpreter` field, so it
fits as is:

```ts
/** Annotates the current span with a family span's question; every member must be named. */
export const annotateQuestion = <F extends SpanFields>(
  struct: SpanStruct<F>,
  value: PoseOf<SpanStruct<F>>,
): Effect.Effect<void> => Effect.annotateCurrentSpan(encodeSpan(struct, value));
```

Keep `annotateSpan` for answers, which legitimately omit members (for example
`{ outcome: "Failed", errorTag }`). Build the stream attributes from a `PoseOf`-typed value too.

### WR-03: The asked projection is restated in three writers, from different sources

**File:** `packages/core/src/Lifecycle.ts:80-85`, `packages/core/src/Predicate.ts:665-669`, `packages/core/src/GuardHealthCheck.ts:103-107`
**Issue:** Three writers build the same `{ subjectId, policyTag, action }` value by hand, each
from a different place:

| Writer | `subjectId` | `policyTag` | `action` |
| ------ | ----------- | ----------- | -------- |
| `decideQuestion` | `question.subject.id` | `question.policy._tag` | `question.action` |
| `toPredicate` | `subject.id` | `policy._tag` | `question.action` |
| the probe | `subject.id` | `canaryPolicy._tag` | `question.action` |

The phase's goal is that one fact is stated once. Here the projection from a `Question` to the
asked fields is written three times, and the copies can drift. A writer could read `options`
instead of the built question, for example. Nothing would notice except a contract row.

**Fix:** Declare the projection once in `EvaluationSpan.ts` and spread it:

```ts
/** What a question asks, as the family's shared question fields. */
export const askedOf = (question: Question) => ({
  subjectId: question.subject.id,
  policyTag: question.policy._tag,
  action: question.action,
});
// Lifecycle.ts:   annotateQuestion(evaluateSpan.question, { ...askedOf(question), evaluationId })
// Predicate.ts:   annotateQuestion(toPredicateSpan.question, askedOf(question))
// GuardHealthCheck.ts: annotateQuestion(guardHealthCheckSpan.question, askedOf(question))
```

### WR-04: `[span-key-literal]` / `[span-key-source]` have scope gaps and a narrow key extraction

**File:** `scripts/check-house-style.mjs:2475-2477`, `:2487-2499`, `:2557-2571` (and `AGENTS.md:474-486`)
**Issue:** The rules can be evaded in four ways besides concatenation and template
interpolation, which no line-regex rule can catch:

1. **The BDD tests are unscanned.** `[span-key-literal]` walks `testSourceSet` (`packages/*/test`
   and `bench`). `[span-key-source]` walks `srcSources`, and `collect()` drops `*.test.ts`
   there. So `features/features/**/*.steps.test.ts` is scanned by neither rule.
   `port-calls.steps.test.ts:392` already reads span output, so a hand-typed
   `"qadi.outcome"` there passes the gate.
2. **`.tst.ts` files are unscanned.** `collect()` skips them (`:1093`), and
   `EvaluationSpan.tst.ts` lives there.
3. **Extraction misses some spellings.** The declared-key extraction matches only
   double-quoted keys of the form `[a-z][a-z_]*` (`SPAN_KEY_LITERAL_SHAPE`, `:2475`). A key
   written `'qadi.foo'`, or one containing a digit, in `EvaluationSpan.ts` drops out of the key
   set. It is then neither checked for one spelling nor refused elsewhere. No formatter gate
   (AGENTS.md §17) forces double quotes.
4. **The scope is described two ways.** AGENTS.md calls the budget "Test-scope, like
   `PORT_DOUBLE_BUDGET`", but `PORT_DOUBLE_BUDGET`'s test scope includes
   `features/step-definitions` (script header `:33-36`) and this rule's does not. The script
   header says "like `METRIC_ID_LITERAL_BUDGET`", which is the accurate comparison.

**Fix:**
- Add `features/features` (with `.test.ts` kept) and the `.tst.ts` files to the
  `[span-key-literal]` walk. The tstyche walk in `scripts/lib/type-tests.mjs` already exists.
- Widen the extraction to `/(["'`])(qadi\.[a-z][a-z0-9_]*)\1/g`, so the declaration cannot
  hold a key the rule does not see.
- Make AGENTS.md say "Test-scope, like `METRIC_ID_LITERAL_BUDGET`", and name the walked
  directories.

### WR-05: ADR-QD-188 states in current tense two things its own revision 1.1 has since done

**File:** `spec/decisions/188-the-evaluate-familys-spans-are-declared-once-and-a-failed-span-says-what-was-asked.md:89-91`, `:110-111`
**Issue:** Two sentences describe work as still to come, but the same document already holds
it:

- Decision 8 ends "A What-enforces-it section names the rule when it is added." The rule is
  added and named at `:124-126`.
- Consequences says "The cost is measured and recorded in a later revision of this decision."
  The cost is recorded at `:138-171` in this same revision (1.1).

Both are history written as current text, and both now misstate the document.

**Fix:** Replace them with pointers. For decision 8: "`[span-key-source]` and
`[span-key-literal]`; see What enforces it." For Consequences: "The cost is recorded under The
cost, measured: +6.79% geomean on a settled host, about 0.4–1.1 µs per call." The change
history already records when each was added.

### WR-06: BEH-QD-714's listing attributes `qadi.decideSubject` to `EvaluationSpan.ts`, which does not declare it

**File:** `spec/behaviors/30-port-calls.md` (BEH-QD-714 listing), `packages/core/src/SubjectSet.ts:126`
**Issue:** The BEH-QD-714 listing is headed `// packages/core/src/EvaluationSpan.ts —
package-private` and lists `"qadi.decideSubject"  // keyless …`. `EvaluationSpan.ts` declares no
such span, and its name is still spelled by hand at `SubjectSet.ts:126`
(`Effect.fn("qadi.decideSubject")`). It is the one span of the family (BEH-QD-714 counts it as
one) whose name is not read from the declaration. A reader following the listing looks for it
in the wrong file.

**Fix:** Either declare it, which keeps "span names come from the declaration" true for the
whole family:

```ts
/** The `qadi.decideSubject` span: keyless, because the `qadi.evaluate` it opens asks. */
export const decideSubjectSpan = declareSpan({
  name: "qadi.decideSubject",
  question: answersNothing,
  answer: answersNothing,
});
```

Or move the line out of the listing, with its own `// packages/core/src/SubjectSet.ts` source
comment.

## Info

### IN-01: `annotateSpan` duplicates the port path's two annotators and is not family-specific

**File:** `packages/core/src/EvaluationSpan.ts:214-217`; `packages/core/src/PortAccess.ts:93-96`, `:108-111`; `packages/core/src/PortDerivation.ts:210`
**Issue:** `annotateSpan`'s body, `Effect.annotateCurrentSpan(encodeSpan(struct, value))`, is
the same expression as `PortAccess.ts`'s `annotateQuestion` and `annotateAnswer`, and as the
retrying wrapper's attempts write. Nothing in it belongs to the evaluate family.
**Fix:** Move it beside `encodeSpan` in `PortSpanEncode.ts`. Then `PortAccess`'s two helpers
become `annotateSpan(d.attributes.question, …)`, and the family reads it from the same place.

### IN-02: Doc and spec text claim `annotateSpan` is the only write path, and that the reason is "never" copied to a span

**File:** `packages/core/src/EvaluationSpan.ts:7-8`, `:194`; `spec/behaviors/30-port-calls.md` BEH-QD-715 listing ("the one way a writer annotates a struct")
**Issue:** Two of the family's writes do not go through `annotateSpan`: the denial log
(`Lifecycle.ts:175`) and the stream span's attributes (`SubjectSet.ts:267`). Both call
`encodeSpan` directly. Separately, "The reason stays on the log line and is never copied to a
span" is enforced by nothing: `annotateSpan(denialEvent, …)` compiles and passes every rule.
**Fix:** Say "writes from the declaration (`annotateSpan` on a span, `encodeSpan` for log
annotations and `Stream.withSpan` attributes)". Make the reason sentence "is not copied to a
span (kept by review)".

### IN-03: `toPredicate`'s pipeable argument has a layout found nowhere else in `packages/*/src`

**File:** `packages/core/src/Predicate.ts:695-701`
**Issue:** The generator body closes with `},` at column 0, and the second argument to the
`Effect.fn(...)` call follows at 2-space indent with a comment between. This is the only
occurrence of that shape in library source, and the pipeable is easy to miss as part of the
call.
**Fix:** Indent both arguments one level inside `Effect.fn(toPredicateSpan.name)(`, or state the
pipeable in the doc comment and keep a one-line `Effect.tapError(annotateFailure)` with a
named local.

### IN-04: Generality without instantiation — `answersNothing` on the two batch spans

**File:** `packages/core/src/EvaluationSpan.ts:149`, `:171`, `:187`; `packages/core/test/EvaluationSpan.test.ts:168-171`
**Category:** necessity
**Issue:** No source file reads `decideSubjectsSpan.answer` or `decideSubjectsStreamSpan.answer`
(`grep` over `packages/*/src` finds nothing). The empty struct exists only to satisfy
`declareSpan`'s required `answer`. One test pins that the placeholder is a single shared
object, which is an implementation detail and not a behaviour. Whether the uniform shape is
worth keeping is a judgment call.
**Fix:** Make `answer` optional in `declareSpan` and drop `answersNothing` and its identity
test. Or keep it, and replace the identity test with one stating that the batch spans write
nothing after their question.

### IN-05: The contract's "cache hit" rows cannot fail for the cache-hit reason their titles name

**File:** `packages/core/test/EvaluationSpan.contract.test.ts:132-145`, `:252-269` (cited by BEH-QD-711)
**Issue:** Nothing in either row shows that the second `evaluate` was served from the cache.
If `decisionCacheLayer()` missed, both rows would pass unchanged. Because the question is
annotated before the lookup, hit and miss cannot differ on the span. That makes the row's
"cache hit" evidence nominal, even though BEH-QD-711 cites it as pinning the hit path. (The
contract's inputs and titles are locked; no edit to them is proposed.)
**Fix:** Outside the contract file (for example in `Evaluate.test.ts`), add a row with the same
setup. It should assert the second decision record's `cacheOutcome` is `"hit"` alongside the
span, and BEH-QD-711 should cite it.

### IN-06: Files the phase rewrote still find spans by literal names beside the declared ones

**File:** `packages/core/test/Evaluate.test.ts:2667`, `:2729`, `:3303`; `packages/core/test/Predicate.test.ts:1668`
**Issue:** The same `describe("observability")` block now uses `named(spans, evaluateSpan.name)`
in some rows and `named(spans, "qadi.evaluate")` in neighbouring ones. D-09 leaves untouched
tests as they are, so this is not a breach. Still, a reader of one file sees two conventions.
**Fix:** Optionally convert these four lines to `evaluateSpan.name` / `toPredicateSpan.name` in
a follow-up, so each rewritten file uses one convention.

### IN-07: Each annotation walks its record twice and allocates one intermediate object (cost note, no measured alternative)

**File:** `packages/core/src/EvaluationSpan.ts:217`; `packages/core/src/PortSpanEncode.ts:74-85`; `node_modules/effect/src/internal/effect.ts:6337-6350`
**Issue:** Each annotation does the following:

1. `encodeSpan` runs `Object.entries(value)` and builds a fresh record.
2. `Effect.annotateCurrentSpan(record)` runs `Object.entries` on that record again.
3. It then calls `span.attribute` for each entry.

Every evaluation now does this twice. Before the phase it did one walk of a literal. This is
one concrete contributor to the +6.79% recorded in ADR-QD-188. It is probably not the main
one: the extra `withFiber` step likely costs more.
**Fix:** None proposed without a measurement. A single-pass writer would have to read
`Effect.currentSpan`, which has a `NoSuchElementError` channel, so the saving is not obvious.
If the cost is ever revisited, benchmark a one-walk `annotateSpan` against the current one
first.

### IN-08: The changeset says "the benchmark records the cost"

**File:** `.changeset/core-evaluate-span-declared.md:9`
**Issue:** The figure is recorded in ADR-QD-188's "The cost, measured" section, not by the
benchmark. The upgrade guide says it correctly ("The cost is recorded in the decision").
**Fix:** "… and ADR-QD-188 records the measured cost (about 0.4–1.1 µs per call)."

### IN-09: A third copy of the find-a-span-by-name test helper

**File:** `packages/core/test/EvaluationSpan.contract.test.ts:63-71`; `packages/core/test/Evaluate.test.ts:2442-2443`; inline `spans.find((s) => s.name === …)` in `GuardHealthCheck.test.ts`, `SubjectSet.test.ts`, `Predicate.test.ts`
**Issue:** `attributesOf` and `allAttributesOf` restate `named` plus `Object.fromEntries`, which
the other span tests already write by hand.
**Fix:** One `spanAttributes(spans, name)` / `allSpanAttributes(spans, name)` in
`packages/core/test/helpers.ts`, beside `collectingTracer`. This changes the helper layout
only, not the contract's inputs, titles or expected values.

---

_Reviewed: 2026-11-23T09:37:28Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
