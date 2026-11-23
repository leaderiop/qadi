---
phase: QD-75-a-declared-span-shape-for-the-evaluate-family
reviewed: 2026-11-23T10:24:16Z
depth: standard
iteration: 2
files_reviewed: 35
files_reviewed_list:
  - .changeset/core-evaluate-span-declared.md
  - AGENTS.md
  - apps/website/src/content/docs/docs/reference/upgrading.md
  - packages/core/src/EvaluationSpan.ts
  - packages/core/src/GuardHealthCheck.ts
  - packages/core/src/Lifecycle.ts
  - packages/core/src/PortAccess.ts
  - packages/core/src/PortDerivation.ts
  - packages/core/src/PortSpanEncode.ts
  - packages/core/src/Predicate.ts
  - packages/core/src/SubjectSet.ts
  - packages/core/test/Evaluate.test.ts
  - packages/core/test/EvaluationSpan.contract.test.ts
  - packages/core/test/EvaluationSpan.test.ts
  - packages/core/test/EvaluationSpan.tst.ts
  - packages/core/test/GuardHealthCheck.test.ts
  - packages/core/test/PortAccess.test.ts
  - packages/core/test/PortConformance.test.ts
  - packages/core/test/PortDescription.test.ts
  - packages/core/test/PortRemote.test.ts
  - packages/core/test/PortServe.test.ts
  - packages/core/test/Predicate.test.ts
  - packages/core/test/SubjectSet.test.ts
  - packages/core/test/helpers.ts
  - scripts/check-house-style.mjs
  - spec/README.md
  - spec/behaviors/05-evaluator.md
  - spec/behaviors/30-port-calls.md
  - spec/decisions/051-a-span-says-what-was-asked.md
  - spec/decisions/109-a-ports-span-is-projected-once-and-every-read-is-one-body.md
  - spec/decisions/188-the-evaluate-familys-spans-are-declared-once-and-a-failed-span-says-what-was-asked.md
  - spec/decisions/index.yaml
  - spec/invariants.md
  - spec/traceability.md
  - .planning/phases/QD-75-a-declared-span-shape-for-the-evaluate-family/75-contract-check.mjs
findings:
  critical: 0
  warning: 2
  info: 11
  total: 13
  necessity: 0
status: issues_found
---

# Phase 75: Code Review Report (iteration 2)

**Reviewed:** 2026-11-23T10:24:16Z
**Depth:** standard
**Files Reviewed:** 35
**Status:** issues_found

## Summary

**Scope.** The phase diff `git diff --name-only c054c2b1 HEAD -- packages spec scripts AGENTS.md apps .changeset features` has 34 files. The review also covered `75-contract-check.mjs`, including its `--self-test`.

**Fixes from iteration 1.** I re-checked all 15 iteration-1 findings against the source. Each fix is in place.

**What I ran on HEAD (`bd499c9c`):**
- `node scripts/check-house-style.mjs`: clean, 581 files.
- The six span test files under vitest: 423 tests pass.
- `75-contract-check.mjs`: 33 rows and 20 statements, exit 0.
- `75-contract-check.mjs --self-test`: 25 cases pass.
- A script checked every test title quoted in a Pinned-by or Enforcement line of the changed spec text. All 53 exist verbatim in the files they name.
- The CCR-QD-467 row: every cited revision equals its document's header (ADR-QD-188 1.6, ADR-QD-051 1.6, ADR-QD-109 1.7, `30-port-calls.md` 1.16, `05-evaluator.md` 1.23, `invariants.md` 1.195, `traceability.md` 1.271, `README.md` 1.332). Its file list, with brace groups expanded, is exactly the 34-file diff.

**Focus 1: WR-02, IN-01, IN-02.** I compiled a probe file in the scratchpad against `tsconfig.base.json`. Every writer call relies on inference, and inference works. The compiler refuses all of these:
- a question with `evaluationId` left out (TS2741);
- an extra member, or a member that belongs to another span (TS2353);
- a policy tag outside `POLICY_TAGS`;
- `denialEvent` passed to `annotateSpan` or to `annotateAsked`.

Complete questions compile. No call site uses `as`.

`annotateSpan<SpanFields>(struct, value)` inside `annotateAsked` widens only that function's own body. The external signature still enforces `PoseOf`.

Exactly one `Effect.annotateCurrentSpan(encodeSpan(…))` body remains in `packages/*/src`: `PortSpanEncode.ts:123`. `PortAccess.ts`'s question and answer helpers, and `PortDerivation.ts`'s retry, now call it with identical arguments. So no port span's attributes changed, and `PortConformance`'s attempts rows still pass.

What remains: the type only stops a log event at the two annotators, and three texts claim more than that (WR-01).

**Focus 2: WR-01 (iteration 1).** Both new rows compare the whole attribute map with `deepStrictEqual` against `encodeSpan(evaluateSpan.question, …)`. So each row fails if an outcome is written, and fails if a question member is missing. Each also asserts the span's exit (`hasInterrupts` / `hasDies`). The scoped wording ("on every path that ends in a decision or a typed failure", with interrupted or defected carrying the question and no outcome) is the same in substance in all of these:
- BEH-QD-712, INV-QD-395 and INV-QD-396;
- ADR-QD-188 decision 1 and the ADR-QD-051 amendment;
- `EvaluationSpan.ts:103-106` and `Lifecycle.ts:64-69`;
- the changeset, the upgrade guide and CCR-QD-467.

**Focus 3: WR-03 and WR-06.** Every family span name comes from the declaration, including `decideSubjectSpan`. Every span question that has a built `Question` reads it through `askedOf`. The health check's span still states its question before the walk (`GuardHealthCheck.ts:104`). The denial log line and the two batch writers still build their fields by hand (IN-03).

**Focus 4: WR-04.** The budget (9 rows), the AGENTS.md table and the script header agree. The `features/features` walk and the tstyche type-test walk run inside `node scripts/check-house-style.mjs`, which `pnpm lint` runs, so they are part of `pnpm check`. Two evasion paths remain: a narrow lookbehind gap (IN-10), and concatenation or interpolation, which is known.

**Focus 5: IN-09 and the contract check.** The check parses the real files, both at `ecb0256f` and in the working tree. It compares every `it`/`it.<member>` call text and every other top-level statement. "Exact" is exact except for whitespace runs inside string literals (IN-08).

I read the nine test files that moved onto `attributesOf`/`allAttributesOf` line by line:
- the expected values are unchanged;
- six lookups that used to fall back to `{}` when a span was missing now assert the span exists. Those tests are now stricter, never looser;
- the `PortServe` SECRET row could pass on a missing span before, and now cannot.

**Focus 6: pins.** `NOT_CALLABLE_PIN_BUDGET` lists `EvaluationSpan.tst.ts` with 2 callable pins and 0 constructable pins, and the AGENTS.md table agrees. Each negative pin has a positive twin with the same subject text. The pins have one gap (IN-01).

**Findings.** Two warnings:
- WR-01: compile-time claims about the denial reason that go further than the type does.
- WR-02: the phase's mutation close record predates the fix loop, whose new code includes `PortSpanEncode.ts` code under D-15's own trigger.

The info items are small accuracy, duplication and pin-coverage points. `necessity-review.md` was read, and no necessity finding applies: `logEvent: true` is the runtime half of a brand that has no cast-free type-only form.

## Warnings

### WR-01: The compiler is said to keep the denial reason off a span, but it only refuses the two annotators, and `annotateSpan` is called "the one body" that writes a struct to a span

**File:** `packages/core/src/PortSpanEncode.ts:75-78`, `:88-123`; `packages/core/src/SubjectSet.ts:266-274`; `spec/README.md:404` (CCR-QD-467); `spec/behaviors/30-port-calls.md` (BEH-QD-715 prose); `packages/core/src/EvaluationSpan.ts:226-227`

**Issue:** `encodeSpan` takes any `SpanStruct<Fields>`, and `LogEventStruct` extends `SpanStruct`. So each of these compiles with the reason on it (confirmed with the probe):
- `Stream.withSpan(name, { attributes: encodeSpan(denialEvent, …) })`. This is the third write form, the one the stream span already uses.
- `Effect.annotateCurrentSpan(encodeSpan(denialEvent, …))`.
- An upcast (`const s: SpanStruct<typeof denialEvent.fields> = denialEvent; annotateSpan(s, …)`).

ADR-QD-188's What-enforces-it is accurate: "cannot be written to a span **through them**". Three other texts claim more:
- CCR-QD-467 says "the compiler holds … the denial reason off a span, its struct being a log event the span annotators refuse".
- BEH-QD-715 says "so the reason sentence is not copied onto a span's attributes: `denialEvent` is a log event … and the two span annotators refuse it".
- `EvaluationSpan.ts:226-227` says "so the span annotators refuse it and the reason stays on the log line".

Separately, `annotateSpan`'s doc (`PortSpanEncode.ts:114`) calls it "The one body that writes a struct to a span". `SubjectSet.ts:273` writes `decideSubjectsStreamSpan.question` to a span through `Stream.withSpan` attributes, without it.

These are claims of compiler or structural enforcement that the code does not give. A later reader will trust them.

**Fix:** Scope the three texts to what the type does, and fix the "one body" sentence. For example:

```ts
// PortSpanEncode.ts:114
 * The one body that annotates the current span with a struct: a port's question and
 * answer (`PortAccess.ts`), … The stream span's `Stream.withSpan` attributes are the
 * one struct written to a span without it (`SubjectSet.ts`).
```

```text
CCR-QD-467:  "... and the denial reason off a span through the two annotators, its struct
              being a log event they refuse; the stream span's attributes and a raw
              Effect.annotateCurrentSpan are kept by review"
BEH-QD-715:  "... and the two span annotators refuse it; `encodeSpan`, which builds the line's
              annotations and the stream span's attributes, does not, so that the reason stays
              off a span written another way is kept by review."
```

To make the stream path compiler-held too, the cleanest option is two functions:
- `encodeSpan(struct: SpanCarried<F>, …)` for span attributes;
- `encodeLogEvent(struct: LogEventStruct<F>, …)` for the denial line, with the same body.

The `Stream.withSpan` path then refuses a log event as well. A raw `Effect.annotateCurrentSpan` of a log record would still be review-held.

### WR-02: The phase's mutation close record predates the fix loop, and `PortSpanEncode.ts` gained code without joining a group (D-15)

**File:** `.planning/phases/QD-75-a-declared-span-shape-for-the-evaluate-family/75-mutation-close.json:5`, `:268` (`"head": "a61a47c4…"`); `packages/core/src/PortSpanEncode.ts:88-154`; `packages/core/src/Predicate.ts:639-650`; `packages/core/src/EvaluationSpan.ts:71-84`, `:170-181`

**Issue:** Both groups of the close record (`core` and `span`) were recorded at `a61a47c4`. The fix loop then changed runtime code in every mutated file:
- `askedOf`, `decideSubjectSpan` and the `logEventStruct` use in `EvaluationSpan.ts`;
- `answerFailure` in `Predicate.ts`;
- the `annotateAsked` rewiring in `Lifecycle.ts`, `GuardHealthCheck.ts` and `SubjectSet.ts`.

It also added runtime code to `PortSpanEncode.ts`: `annotateSpan`, `logEventStruct` and `annotateAsked`. D-15 is a locked decision that says `PortSpanEncode.ts` "joins `core` only if a plan changes its code". That code changed here, so D-15's trigger has fired. It was not acted on, and nothing records this as an accepted exception.

The fix report itself notes "The phase's mutation record may need re-recording for these files". ESPN-05's closing claim (every mutant killed or examined) therefore describes a tree that is no longer HEAD.

**Fix:** Re-record the close on HEAD: `node 75-mutation.mjs record close core --restart` and `record close span --restart`. Add `PortSpanEncode.ts` to the `core` group as D-15 requires (it has no phase base, so close-only, like `span`). Close any new survivor with a test, never by re-baselining (D-15). If re-recording is deliberately deferred, state that in the phase's SUMMARY/VERIFICATION rather than leaving the stale `head` to stand as the close.

## Info

### IN-01: The log-event refusal of `annotateAsked` is unpinned, and both annotator pins use an explicit instantiation rather than the inference writers rely on

**File:** `packages/core/test/EvaluationSpan.tst.ts:84-123`

**Issue:** "the denial event's struct cannot annotate a span" pins `annotateSpan` only (`DenialParams`). `annotateAsked`'s refusal of `denialEvent` is asserted by `PortSpanEncode.ts:92-93` and by ADR-QD-188 ("which `annotateSpan` and `annotateAsked` refuse"), but no pin holds it.

Both `AskedParams` and `DenialParams` also instantiate the generic explicitly (`annotateAsked<typeof evaluateSpan.question.fields>`). Every writer calls `annotateAsked(struct, value)` and relies on `Fields` being inferred from `SpanCarried<Fields>`. Suppose an edit made that inference fall back to the constraint `SpanFields`. Then `PoseOf` would accept any record at the call sites, and these pins would still pass. Today inference is correct (the probe confirms it).

**Fix:** Add a negative pin and its twin on `Params<typeof annotateAsked>` with `denialEvent`. Also add one inference-shaped pin, for example:

```ts
expect(annotateAsked).type.not.toBeCallableWith(...)
```

that goes through a non-generic wrapper `(s: typeof evaluateSpan.question, v: …) => void` built by `Parameters`. Alternatively, pin a `@ts-expect-error` on an uninstantiated `annotateAsked(evaluateSpan.question, { subjectId: "u1", policyTag: "HasRole", action: undefined })` assigned to a `declare`d `Effect` value, which `typecheck` checks with the rule off. Update `NOT_CALLABLE_PIN_BUDGET` and the AGENTS.md row together.

### IN-02: A second assertion in "the batch spans write nothing after their question" cannot fail

**File:** `packages/core/test/EvaluationSpan.test.ts:190`

**Issue:** `encodeSpan(span.answer, {})` walks the entries of the empty value, so it returns `{}` for every struct whatever its keys. The `lengthOf(Object.keys(span.answer.keys), 0)` line above carries the whole test.

**Fix:** Drop the line, or replace it with an assertion that depends on the struct. For example, assert that `decodeSpan(span.answer, new Map([[evaluateSpan.answer.keys.outcome, "Allow"]]))` is `{}`.

### IN-03: The asked projection is still restated by hand in the denial log line and in the two batch writers

**File:** `packages/core/src/Lifecycle.ts:176-180`; `packages/core/src/SubjectSet.ts:181-185`, `:266-269`

**Issue:**
- The denial line builds `policyTag: question.policy._tag, subjectId: question.subject.id` two statements after the same writer called `askedOf(question)`. That is the projection WR-03 put in one place.
- `decideSubjects` and `decideSubjectsStream` each restate `{ policyTag: policy._tag, action: options?.action }`.

Small, but these are the remaining second statements of one projection inside the writers this phase owns.

**Fix:** Denial line: `encodeSpan(denialEvent, { ...askedOf(question), reason: decision.reason })`. `encodeSpan` drops `action`, which has no key in `denialEvent`. If the extra member reads as a smell, add a `pick`-style narrowing instead. Batches: one local `batchAsked(policy, options)` in `SubjectSet.ts` that both writers spread.

### IN-04: The ADR-QD-109 amendment says every family writer builds its question from a built question, which is false for the two batch spans

**File:** `spec/decisions/109-a-ports-span-is-projected-once-and-every-read-is-one-body.md:173`

**Issue:** The amendment names the two batch spans, then says "its writer builds the question from the built question it decides". Neither `decideSubjects` nor `decideSubjectsStream` builds a `Question`. Both read `policy` and `options` (`SubjectSet.ts:181-185`, `:266-269`).

**Fix:** "… its writer builds the question from what it decides: the built question for `qadi.evaluate`, `qadi.toPredicate` and the probe (`askedOf`), the policy and options for the two batch spans." Revise through `spec-revise.mjs` and update the CCR-QD-467 row's revision.

### IN-05: Two traceability rows do not name `PortSpanEncode.ts`, which the documents they trace now cite

**File:** `spec/traceability.md:72`, `:219`

**Issue:**
- Row 72 (30 — Port Calls) lists `EvaluationSpan.ts` and the four writers as the source of BEH-QD-711–715. BEH-QD-715's listing names `packages/core/src/PortSpanEncode.ts` (`annotateAsked`, `annotateSpan`, `encodeSpan`, `logEventStruct`).
- Row 219 (INV-QD-396) says "the subject id read from `sharedQuestionKeys`" without its file, and omits the `PoseOf` compile hold. INV-QD-396 1.192 and 1.194 added both to the invariant's own Source and Enforcement.

**Fix:** Add `` `packages/core/src/PortSpanEncode.ts` (`annotateAsked`, `annotateSpan`, `logEventStruct`) `` to row 72's source. Make row 219's source "…, the subject id read from `sharedQuestionKeys` in `PortSpanEncode.ts`; each question held whole by `annotateAsked`'s `PoseOf`".

### IN-06: An AGENTS.md line the phase wrote is 129 characters wide

**File:** `AGENTS.md:474`

**Issue:** `**A span key of the evaluate family is declared once, and read through its declaration: `SPAN_KEY_LITERAL_BUDGET`** (ADR-QD-188).` runs to 129 characters. Every neighbouring budget heading (`METRIC_ID_LITERAL_BUDGET`, `NOT_CALLABLE_PIN_BUDGET`, `MODULE_STATE_BUDGET`) wraps at about 85–90 (§17: hand-wrapping at about ninety columns).

**Fix:** Wrap after "declared once," or before "(ADR-QD-188)".

### IN-07: `EvaluationSpan.tst.ts` inlines the `Params` conditional twice instead of the file-local `Params<F>` the other type tests declare

**File:** `packages/core/test/EvaluationSpan.tst.ts:84-88`, `:108-112`

**Issue:** `AskedParams` and `DenialParams` each restate `F extends (...args: infer A) => unknown ? (...args: A) => void : never`. `DecisionCache.tst.ts:30`, `PortAccess.tst.ts:38` and `DiagnosticsStore.tst.ts:29` declare it once as `type Params<F>`, which is the form AGENTS.md §6 names ("`Params<F>` for a whole call").

**Fix:** Write `type Params<F> = …` once, then `Params<typeof annotateAsked<typeof evaluateSpan.question.fields>>` and `Params<typeof annotateSpan<typeof denialEvent.fields>>`.

### IN-08: The contract check's "exact" text comparison collapses whitespace inside string literals

**File:** `.planning/phases/QD-75-a-declared-span-shape-for-the-evaluate-family/75-contract-check.mjs:63`, `:169`, `:218`

**Issue:** `collapse` runs `replace(/\s+/g, " ")` over the whole source text of a row, statement or helper. That includes the inside of string and template literals. So a title or an expected value changed from `"a  b"` to `"a b"` passes. The header (`:18-21`) says "its text … is the first commit's text exactly". No contract string holds a whitespace run today, so nothing is hidden.

**Fix:** Compare token streams rather than collapsed text, for example by walking `getChildren()` and joining token texts. Or collapse only trivia between tokens. Add a self-test case that changes the whitespace inside a title.

### IN-09: The recorded cost was measured before the fix loop changed the hot path

**File:** `spec/decisions/188-the-evaluate-familys-spans-are-declared-once-and-a-failed-span-says-what-was-asked.md` (The cost, measured); `packages/core/src/Lifecycle.ts:86`

**Issue:** The +6.79% / 0.4–1.1 µs figure was measured on the 75-07 tree. Since then, `decideQuestion` builds `askedOf(question)` and spreads it into a second object, and annotates through `annotateAsked → annotateSpan → Effect.annotateCurrentSpan`, one extra call frame on each of its two annotations. The section does not name the commit it measured, so a later comparison cannot tell which tree the number describes. That is the use the section states for itself ("so that a later change which moves it is compared with a number").

**Fix:** Name the measured commit in the section. Either re-run the same `ab.sh` / `analyze.mjs` pair on HEAD and record it as a third column, or state that the figure predates the code-review rewiring.

### IN-10: `[span-key-literal]`'s title lookbehind also exempts a key passed to any `.test(`, `.it(` or `.describe(` method call

**File:** `scripts/check-house-style.mjs:2588-2591`

**Issue:** The exemption is `(?<!\b(?:describe|it|test|…)\(\s*)`. `\b` holds between `.` and a word character, so `pattern.test("qadi.outcome")` or `x.it("qadi.outcome")` is read as a test title and is not counted. The cost is narrow, but this is a way past the rule that AGENTS.md and the script header do not mention.

**Fix:** Require that the callee is not a member access: `(?<![.\w$]\s*)` in front of the name alternation. For example, `(?<!(?:^|[^.\w$])(?:describe|it|test|it\.effect|…)\(\s*)`. Add the plant to the WR-04 plant list.

### IN-11: Current-tense spec text the phase wrote narrates the old behaviour, and BEH-QD-712's title says "on every path" unscoped

**File:** `spec/behaviors/30-port-calls.md:165-170`, `:174`, `:197`, `:230`, `:263`; `spec/invariants.md:4551`

**Issue:** The rationale paragraphs of these entries describe what changed, not what holds:
- BEH-QD-711–714: "A failed evaluation used to carry …", "The question is now annotated first", "The outcome sat under two keys", "`toPredicate` annotated nothing … It now answers", "A probe never said …";
- INV-QD-395's Implication: "… used to carry only its outcome and its error tag".

The pattern is common in this repo's spec (for example `19-hydration.md` and many INV Implications), so this follows convention. It is still history inside normative text, which the owner's bar asks to flag. Separately, BEH-QD-712's title ("The outcome of an evaluation is one key on every path") still claims every path, while its REQUIREMENT now scopes the claim to a decision or a typed failure.

**Fix:** Optional. State each rationale as what holds ("A failed evaluation carries its question, so a tracer filtering by subject or evaluation id sees it"), and leave the history to ADR-QD-188's Context and the CCR row. For the title, "…is one key on every decided or failed path". That changes the anchor, so update the links in ADR-QD-051, INV-QD-396 and `traceability.md` in the same revision.

---

_Reviewed: 2026-11-23T10:24:16Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
