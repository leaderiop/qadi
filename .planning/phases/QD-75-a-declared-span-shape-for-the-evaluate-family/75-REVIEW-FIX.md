---
phase: 75
fixed_at: 2026-11-23T10:46:00Z
review_path: .planning/phases/QD-75-a-declared-span-shape-for-the-evaluate-family/75-REVIEW.md
iteration: 2
findings_in_scope: 13
fixed: 12
skipped: 0
deferred_to_orchestrator: 1
status: partial
---

# Phase 75: Code Review Fix Report (iteration 2)

**Fixed at:** 2026-11-23
**Source review:** .planning/phases/QD-75-a-declared-span-shape-for-the-evaluate-family/75-REVIEW.md
**Iteration:** 2
**Fix scope:** all (2 warnings, 11 info)

**Summary:**
- Findings in scope: 13
- Fixed: 12, in 11 commits. IN-07 is fixed by IN-01's commit, because both findings are about the same pins.
- Deferred to the orchestrator, by its decision: 1 (WR-02, the mutation close)
- Skipped: 0

Every edit, commit and check ran in the **main checkout** on branch `arch-wave-13`
(`workflow.use_worktrees` is `false`). No worktree was created, so every number below can be
reproduced from this tree at `b818f498`.

**Needs human verification:** WR-01 (it changes the types of the span-writing functions) and IN-03
(the projections are moved; the contract shows that no span or log line changed).

I did not touch any of these:
- `75-mutation-base.json`, `75-mutation.mjs`, `75-mutation-close.json`;
- the contract's titles, inputs, expected values or row order;
- REQUIREMENTS.md, ROADMAP.md, STATE.md, `.planning/config.json`, `.agents/`, `.codex/`, `*.iter*.md`.

No new BEH/INV/ADR/CCR id was used, and `node scripts/next-id.mjs` was never run.

## Fixed Issues

### WR-01: the log-event refusal held only at the two annotators

**Status:** fixed: requires human verification
**Commit:** 5a97036e
**Files:**
- source: `packages/core/src/{PortSpanEncode,EvaluationSpan,Lifecycle,SubjectSet}.ts`;
- tests: `packages/core/test/{Evaluate,EvaluationSpan}.test.ts`, `EvaluationSpan.tst.ts`;
- gate: `scripts/check-house-style.mjs`, `AGENTS.md`;
- spec: `spec/behaviors/30-port-calls.md`, ADR-QD-188, `spec/invariants.md`, `spec/traceability.md`, `spec/README.md`.

**What changed in `PortSpanEncode.ts`:**
- **One encoding body.** The body is now a private `encodeStruct`. Two exported doors are typed views of that same function value, so neither adds a call frame on the hot path:
  - `encodeSpan` takes `SpanCarried<F>`, so it refuses a log event;
  - `logAnnotations` takes `LogEventStruct<F>` only.
- **A new builder for the stream span.** `askedAttributes(struct, value: PoseOf<…>)` builds the stream span's `Stream.withSpan` attributes. It refuses a log event and holds the question whole. `SubjectSet.ts` no longer needs its `PoseOf`-typed local or the comment beside it.

So all four span-writing functions refuse a log event at compile time: `encodeSpan`, `annotateSpan`, `annotateAsked` and `askedAttributes`.

**The denial line** builds its annotations with `logAnnotations`. So do the tests: `Evaluate.test.ts`, and the denial round trip in `EvaluationSpan.test.ts`.

**What every text now says:**
- The compiler refuses a log event at every span-writing function the library has.
- These are not refused, and review keeps them: a raw `Effect.annotateCurrentSpan`, a raw `Stream.withSpan` attribute map, and a log event upcast to a plain `SpanStruct`.

The texts that say this:
- the `LogEventStruct`, `denialEvent` and `EvaluationSpan.ts` header docs;
- BEH-QD-715's listing and prose;
- INV-QD-396 (Source and Enforcement);
- ADR-QD-188 decision 6, plus its What-enforces-it compiler and review bullets;
- the CCR-QD-467 row;
- the `EvaluationSpan.tst.ts` row in `traceability.md`.

`annotateSpan`'s doc is now true. It is the one body that annotates the current span with a struct. The stream span's question is built by `askedAttributes` instead.

**`encodeSpan(` calls in `packages/*/src`:** every one is inside `PortSpanEncode.ts`: `annotateSpan`'s body and `askedAttributes`'s body. `PortAccess.ts` and `PortDerivation.ts` call `annotateSpan` with port projections and `attemptsStruct`, which are plain `SpanStruct`s and cannot be a log event.

**A house-style rule was weighed and not added.**
- A rule refusing `encodeSpan(` of a log-event-named value would only repeat what the compiler now refuses.
- A rule refusing `encodeSpan(` outside its owning module would hold today, but it guards nothing the type does not already guard.
- What remains is a raw `annotateCurrentSpan` (fed with a hand-built map or with `logAnnotations` output) or an upcast that changes the name. A text rule cannot read either cleanly.

**Pins:** three new negative pins, each with a positive twin. The budget is 2 → 5; IN-01 later takes it to 6. The `NOT_CALLABLE_PIN_BUDGET` row and the AGENTS.md row are updated together.
- "the denial event's struct cannot build a span's attributes" (`encodeSpan`, bare: it returns a plain record);
- "the denial event's struct cannot open a span with its attributes" (`askedAttributes`, bare);
- "a span struct cannot annotate a log line" (`logAnnotations`, bare).

**Plant:** in the working tree, I widened all three parameters to `SpanStruct` (`logAnnotations`'s too). In both tstyche passes, exactly the three new pins failed ("Expression is callable with the given arguments"). I restored the file from a copy, and `git diff` was empty.

**Checked:** typecheck, tstyche (both passes), house-style, the five affected vitest files (335 tests), oxlint, the contract check and `spec-revise --check`.

### IN-01: `annotateAsked`'s log-event refusal was unpinned, and the pins used an explicit instantiation

**Status:** fixed
**Commit:** d00be34c
**Files:** `packages/core/test/EvaluationSpan.tst.ts`, `scripts/check-house-style.mjs`, `AGENTS.md`, `spec/behaviors/30-port-calls.md`, `spec/invariants.md`, `spec/traceability.md`, `spec/README.md`

**Applied fix:**
- **One generic-preserving declaration.** `declare const paramsOf: <A extends ReadonlyArray<unknown>>(f: (...args: A) => unknown) => (...args: A) => void`. TypeScript's higher-order inference keeps the annotator's type parameters through it. So `expect(paramsOf(annotateAsked))` is called with no type argument, and `Fields` is inferred from the struct, as it is in a writer. The pin still drops the `Effect`, so it holds whichever way `floatingEffect` is set.
- **The two existing annotator pins** go through it now.
- **A new negative pin**, "the denial event's struct cannot annotate a span as its question" (`annotateAsked`). Its twin passes a span struct of the same fields.
- **Budget** 5 → 6, with the AGENTS.md row updated.

**Plants**, each applied to `PortSpanEncode.ts` and restored from a copy:

| Plant | Result |
| ----- | ------ |
| `annotateAsked`'s struct as `SpanCarried<NoInfer<Fields>>` (inference falls back to the constraint) | "a question that leaves a member out is refused" failed, in both passes |
| `annotateAsked` takes `SpanStruct` | one pin failed (the new log-event pin), in both passes |
| `annotateSpan` takes `SpanStruct` | one pin failed ("the denial event's struct cannot annotate a span"), in both passes |

**Checked:** typecheck, tstyche (both passes), house-style (`[not-callable-pin]`, `[not-callable-control]`, `[not-callable-pin-table]`).

### IN-07: `Params` was written inline twice in `EvaluationSpan.tst.ts`

**Status:** fixed (by IN-01's commit)
**Commit:** d00be34c
**Applied fix:** The inline conditionals `AskedParams` and `DenialParams` are gone. IN-01 required the annotator pins to infer their arguments, and a type-level `Params<F>` collapses a generic function's type parameters to their constraint. So the file now states the result-dropping call once, as the value-level `paramsOf`, which keeps them. No other type test exports a generic-preserving form to reuse: `DecisionCache.tst.ts`, `PortAccess.tst.ts` and `DiagnosticsStore.tst.ts` each declare a file-local, non-generic `Params`.

### IN-02: an assertion in "the batch spans write nothing after their question" could not fail

**Status:** fixed
**Commit:** 6b905ad8
**Applied fix:** I replaced `encodeSpan(span.answer, {})`, which is `{}` for any struct. The new assertion decodes each batch answer from a span that holds every answer key the evaluate span writes (`outcome`, `errorTag`, `obligations`) and asserts the result is `{}`. It now proves that a batch answer reads nothing back from a span, which holds even for a struct whose declared keys are empty but whose decode reads other keys.
**Plant:** I set `decideSubjectSpan`'s answer to `{ fields: {}, keys: {}, decode: (a) => evaluateSpan.answer.decode(a) }`. The `lengthOf` line passed, and the new line failed: "qadi.decideSubject reads one: expected { outcome: 'Allow', …(2) } to deeply equal {}". I restored the file from a copy.
**Checked:** `EvaluationSpan.test.ts` (10 tests), oxlint.

### IN-03: the asked projection was restated in the denial line and the two batch writers

**Status:** fixed: requires human verification
**Commit:** c5cc1f17
**Files:** `packages/core/src/{EvaluationSpan,Lifecycle,SubjectSet}.ts`, `packages/core/test/EvaluationSpan.test.ts`, BEH-QD-715, INV-QD-396, `traceability.md`, README

**Applied fix:**
- **`decideQuestion`** projects once (`const asked = askedOf(question)`). It annotates `{ ...asked, evaluationId }`. The denial line reads `policyTag` and `subjectId` from `asked`.
  - I did not spread `askedOf` into the denial line. That would carry an `action` member that `denialEvent` has no key for. It is dropped today, but it would silently join the line if the event ever gained the key. The line's own fact, `reason`, stays its own.
- **`batchAskedOf(policy, options)`** is declared beside `askedOf` in `EvaluationSpan.ts`. It is typed `PoseOf` the batch fields, which are declared once as `batchAskedFields`/`batchAskedKeys` and spread by both batch questions.
  - `decideSubjects` writes `{ subjectCount, ...batchAskedOf(policy, options) }`;
  - `decideSubjectsStream` writes `askedAttributes(question, batchAskedOf(policy, options))`.
  - The batch writers hold a policy and options, not a built question. That is why their projection is separate from `askedOf`.
- **New test:** "a batch asks its own policy tag and action".
- **No change for a reader.** Every span and log line states exactly what it stated before, in the same key order. The 33 contract rows pass, and so does `75-contract-check.mjs`.

**Checked:** typecheck, circular, three vitest files (307 tests), contract check, house-style (span-key rules).

### IN-04: the ADR-QD-109 amendment said every family writer builds from a built question

**Status:** fixed
**Commit:** b92c1d5f
**Applied fix:** The amendment now reads: "its writer builds the question from what it decides, the built question for `qadi.evaluate`, `qadi.toPredicate` and the probe (`askedOf`), and the policy and options for the two batch spans (`batchAskedOf`)". It also says "written through the encoding body port spans use" rather than naming `encodeSpan`. ADR-QD-109 1.7 → 1.8, and the CCR row cites 1.8.
**Checked:** `spec-revise --check`.

### IN-05: traceability rows 72 and 219 did not name `PortSpanEncode.ts`

**Status:** fixed
**Commit:** a86b1bfe
**Applied fix:**
- **Row 72 (30 — Port Calls)** lists `packages/core/src/PortSpanEncode.ts` (`annotateAsked`, `askedAttributes`, `annotateSpan`, `encodeSpan`, `logAnnotations`, `logEventStruct`).
- **Row 219 (INV-QD-396)** now says:
  - the subject id is read from `sharedQuestionKeys` in `PortSpanEncode.ts`;
  - each question is held whole by the `PoseOf` that `annotateAsked` and `askedAttributes` take;
  - the denial event is refused at every span-writing function there.
- **Row 218 (INV-QD-395) and INV-QD-395's own Source** cited code that moved too. Both now name the question writers in `PortSpanEncode.ts`.

### IN-06: an AGENTS.md line was 129 characters

**Status:** fixed
**Commit:** 5cf302fb
**Applied fix:** The heading wraps before "declaration" (74 + 54 characters). I reflowed the paragraph to at most 89 columns. It also names `logAnnotations` beside `encodeSpan` for a log line's expected record (a WR-01 consequence).

### IN-08: the contract check collapsed whitespace inside string literals

**Status:** fixed
**Commit:** a9164b74
**Applied fix:**
- **Exact literals.** Through the parse, the check collects the offsets of every literal token (string, no-substitution template, template head/middle/tail, regular expression, JSX text) under each row, `describe` title, statement and helper. A whitespace run outside those ranges collapses to one space; the literals' own text is compared exactly.
- **The header** defines "whitespace collapsed" once.
- **Three new self-test cases**, 25 → 28 cases:
  - a whitespace change inside a title fails;
  - a whitespace change inside a template literal fails;
  - a whitespace run changed between tokens passes.

**Plant:** I reverted `exact` to the old whole-text collapse. The two inside-a-literal cases failed (`self-test: 2 failed`). I restored the file from a copy.
**Real tree:** `contract-check: 33 rows and 20 statements as at ecb0256f; 15 helpers kept, 2 moved (attributesOf, allAttributesOf)`, exit 0.

### IN-09: the recorded cost predates the code-review rewiring

**Status:** fixed
**Commit:** 5bc70c02
**Applied fix:** ADR-QD-188's "The cost, measured" now names the `close` arm's tree, `a61a47c4`. This comes from 75-RED-EVIDENCE.md's cost section and 75-07-SUMMARY.md: the bench ran at plan head `a61a47c4` → `2c917b6b`, and no `packages/` file changed between those two commits. The section says three things:
- that tree predates the rewiring through `annotateAsked`, `askedAttributes`, `annotateSpan` and `logAnnotations`, which adds a call frame to each annotation;
- the figures are those of `a61a47c4`;
- they are re-measured on the tree that ships, and that run is recorded with its commit.

The CCR-QD-467 row says the same. ADR-QD-188 1.7 → 1.8.
**Left to the orchestrator:** the re-run of the benchmark on the final tree, and recording it.

### IN-10: `[span-key-literal]`'s title exemption also exempted method calls

**Status:** fixed
**Commit:** 92ba8b43
**Applied fix:** The lookbehind is now `(?<!(?:^|[^.\w$])(?:describe|it|test|it\.effect|it\.scoped|it\.live|it\.layer)\(\s*)`. The call head must follow neither a `.` nor a name character, so a method call `.test(` or `.it(` is counted. The script header and AGENTS.md say what a title is. I did not add `it.skip`: no test needs it, and adding it would widen the exemption.

**Plants**, each appended to `packages/core/test/EvaluationSpan.test.ts`, run, then `git checkout --`:

| Plant | Result |
| ----- | ------ |
| `export const matched = /x/.test("qadi.outcome");` | exit 1, `[span-key-literal] 1 quoted span key literal(s) outside a test title.` |
| `declare const suite: …; suite.it("qadi.outcome");` | exit 1, same line |
| control: `describe("qadi.outcome", () => {});` | exit 0, clean (a real title is still exempt) |
| the first plant against the HEAD~ script (the old rule) | exit 0, clean (the evasion passed before the fix) |

### IN-11: current-tense spec narrated the old behaviour, and BEH-QD-712's title was unscoped

**Status:** fixed
**Commit:** b818f498
**Applied fix:**
- **History wording removed.** BEH-QD-711, 712, 713 and 714 had "used to", "now annotated first", "sat under two keys", "annotated nothing… now answers" and "never said". INV-QD-395's Implication had "used to carry". Each now states what holds. That history stays in ADR-QD-188's Context, the CCR row, the changeset and the upgrade guide, which describe a change.
- **BEH-QD-712's new title:** "The outcome of an evaluation is one key on every decided or failed path". The only link to the old anchor, in INV-QD-396's Related, follows it. ADR-QD-051 and `traceability.md` cite BEH-QD-712 by id, not by anchor (checked with `git grep`).
- **Left as written:** ADR-QD-051's dated amendment ("`qadi.decision` is gone") and ADR-QD-188's Context. Both are dated or contextual history.
- **Re-checked:** the phase's other added text (`EvaluationSpan.ts` and the writers' docs, the BEH-QD-317 and INV-QD-044 notes, the ADR-QD-109 amendment). None of it narrates history.

## Deferred

### WR-02: the mutation close record predates the fix loop, and `PortSpanEncode.ts` gained code

**Status:** deferred to the orchestrator (its decision)
**Reason:** The orchestrator re-records the mutation close after the review loop, on the final tree, with `PortSpanEncode.ts` included. Under that decision I touched none of `75-mutation.mjs`, `75-mutation-base.json` or `75-mutation-close.json`.

This iteration changed runtime code in two mutated files and in `PortSpanEncode.ts`:
- `PortSpanEncode.ts`: `encodeStruct`, `encodeSpan` and `logAnnotations` as typed views, and `askedAttributes`;
- `EvaluationSpan.ts`: `batchAskedOf`, `batchAskedFields` and `batchAskedKeys`;
- `Lifecycle.ts` and `SubjectSet.ts`: their writers.

So the close must be re-recorded on a tree at or after `b818f498`.

## Spec revisions at the end

The CCR-QD-467 row cites each revision, and each equals its document's header. The row's file list equals `git diff --name-only c054c2b1 HEAD -- packages spec scripts AGENTS.md apps .changeset features` (34 files, none missing, none extra; checked by script).

| Document | Revision |
| -------- | -------- |
| ADR-QD-188 | 1.8 (row: "new at 1.0; … corrected at 1.2, 1.3, 1.4, 1.5, 1.6, 1.7 and 1.8, in code review") |
| ADR-QD-051 | 1.6 (unchanged) |
| ADR-QD-109 | 1.8 |
| `spec/behaviors/30-port-calls.md` | 1.20 |
| `spec/behaviors/05-evaluator.md` | 1.23 (unchanged) |
| `spec/invariants.md` | 1.200 |
| `spec/traceability.md` | 1.275 |
| `spec/README.md` | 1.339 |

## Final pass (on `b818f498`, main checkout, one runner at a time, stdin closed)

| Check | Result |
| ----- | ------ |
| `pnpm exec vitest run --project core < /dev/null` | exit 0: 85 files, 2758 tests passed |
| `pnpm typecheck` | exit 0 |
| `pnpm test:tstyche` | exit 0: both passes, 72 files; 399 passed and 1 skipped / 398 passed and 2 skipped (the characterisation's per-pass skips) |
| `pnpm circular` | exit 0: no circular dependency |
| `node scripts/check-house-style.mjs` | exit 0: 581 files clean, 72 type-test files |
| `node scripts/check-doc-examples.mjs` | exit 0: 118 blocks compile |
| `node scripts/check-website-doc-examples.mjs` | exit 0: 71 blocks compile |
| `node scripts/check-api-surface.mjs` | exit 0: 941 exports across 9 packages |
| `pnpm exec oxlint` (every touched file) | exit 0. One warning, on an untouched line (`check-house-style.mjs:1095`, from 2026-09-08) |
| `node scripts/spec-revise.mjs --check` | every Revision matches its newest Change History entry |
| `75-contract-check.mjs` | exit 0: 33 rows, 20 statements, 15 helpers kept, 2 moved |
| `75-contract-check.mjs --self-test` | exit 0: 28 passed |
| `bash spec/scripts/verify-traceability.sh --strict` | exit 0: PASS 21, FAIL 0, SKIP 0 (5061 links resolve) |

`features/` was not touched, so the acceptance project was not run.

---

_Fixed: 2026-11-23T10:46:00Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 2_
