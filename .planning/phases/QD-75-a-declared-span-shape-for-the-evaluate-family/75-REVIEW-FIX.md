---
phase: 75
fixed_at: 2026-11-23T00:00:00Z
review_path: .planning/phases/QD-75-a-declared-span-shape-for-the-evaluate-family/75-REVIEW.md
iteration: 1
findings_in_scope: 15
fixed: 14
skipped: 0
no_change: 1
status: all_fixed
---

# Phase 75: Code Review Fix Report

**Fixed at:** 2026-11-23
**Source review:** .planning/phases/QD-75-a-declared-span-shape-for-the-evaluate-family/75-REVIEW.md
**Iteration:** 1
**Fix scope:** all (6 warnings, 9 info)

**Summary:**
- Findings in scope: 15
- Fixed: 14 (one commit each)
- No code change, by decision: 1 (IN-07)
- Skipped: 0

All edits, commits and checks ran in the **main checkout** on branch `arch-wave-13`
(`workflow.use_worktrees` is `false`). No worktree was created, so every number below can be
reproduced from this tree.

Logic fixes flagged **fixed: requires human verification**: WR-01, WR-02, IN-02, IN-03.

Source code changed in `packages/core/src`: `EvaluationSpan.ts`, `PortSpanEncode.ts`,
`PortAccess.ts`, `PortDerivation.ts`, `Lifecycle.ts`, `Predicate.ts`, `GuardHealthCheck.ts`,
`SubjectSet.ts`. The phase's mutation record may need re-recording for these files.
`75-mutation-base.json`, `75-mutation.mjs` and `75-mutation-close.json` were not touched, and
neither were the contract's titles, inputs, expected values or row order.

## Fixed Issues

### WR-01: "Outcome on every path" is false for an interrupted or defected evaluation

**Status:** fixed: requires human verification
**Commit:** 5de0fe09
**Files modified:** `packages/core/src/Lifecycle.ts`, `packages/core/src/EvaluationSpan.ts`,
`packages/core/test/Evaluate.test.ts`, `spec/behaviors/30-port-calls.md`, `spec/invariants.md`,
`spec/traceability.md`, ADR-QD-051, ADR-QD-188, `spec/README.md`, the changeset, `upgrading.md`
**Applied fix:** No outcome value was invented. Every claim now says the outcome is written on
every path that ends in a decision or a typed failure. An interrupted or defected evaluation
carries its question and no outcome, and its span's exit says why. Two rows outside the contract
pin both cases in `Evaluate.test.ts`:
- "an interrupted evaluation carries its question and no outcome": a resolver that never answers
  (`Effect.never`), the evaluation forked with a timeout, `TestClock.adjust`, then the attributes
  are asserted to be exactly the question and `Exit.hasInterrupts` holds on the span exit.
  `PortReply` has no latch member, so this resolver is hand-built. It builds no port error, so
  `PORT_DOUBLE_BUDGET` is unaffected. `DecisionCache.test.ts` already uses this pattern.
- "a defected evaluation carries its question and no outcome": a host `DecisionCache` whose
  `getOrCompute` dies. A port defect becomes a typed error, so the defect must come from outside
  the port. The attributes are exactly the question and `Exit.hasDies` holds.

INV-QD-395 and BEH-QD-712's Pinned-by cite both rows.
**Checked:** both rows pass. Core vitest, typecheck, house-style, spec-revise `--check` and oxlint
are clean.

### WR-02: A question's completeness is not compiler-held

**Status:** fixed: requires human verification
**Commit:** 7442fe10
**Files modified:** `PortSpanEncode.ts`, `EvaluationSpan.ts`, `Lifecycle.ts`, `Predicate.ts`,
`GuardHealthCheck.ts`, `SubjectSet.ts`, `EvaluationSpan.tst.ts`, `scripts/check-house-style.mjs`,
`AGENTS.md`, spec (ADR-QD-188, ADR-QD-109, BEH, INV, traceability, README)
**Applied fix:** `annotateAsked(struct, value: PoseOf<…>)` is used at every question write
(evaluate, toPredicate, guard health check, decideSubjects). The stream's question is a
`PoseOf`-typed local passed to `encodeSpan`. A tstyche negative pin goes through the parameter
type, "a question that leaves a member out is refused", with its positive twin "a question that
names every member is accepted". The `NOT_CALLABLE_PIN_BUDGET` row and the AGENTS.md table row
are added. ADR-QD-188's What enforces it lists this, and the ADR-QD-109 amendment claims exactly
that.
**Checked:** the negative pin was seen failing by temporarily widening the type, then restored.
`pnpm test:tstyche` (both passes), typecheck and house-style are clean.

### WR-03: The asked projection is restated in three writers

**Status:** fixed
**Commit:** 37296184
**Applied fix:** There is one `askedOf(question)` in `EvaluationSpan.ts`, and every writer uses
it. The three writers were verified to hold the same `Question`: `questionOf` returns subject and
policy unchanged, so no span changes. `EvaluationSpan.test.ts` gains "a built question asks its
own subject, policy tag and action".
**Checked:** core vitest, the contract (33 rows) and typecheck.

### WR-04: `[span-key-literal]` / `[span-key-source]` scope gaps and narrow key extraction

**Status:** fixed
**Commit:** ee1b7378
**Files modified:** `scripts/check-house-style.mjs`, `AGENTS.md`
**Applied fix:**
- The span-key literal scan also walks `features/features` and every `.tst.ts` file.
- Key extraction reads single-quoted, double-quoted and backtick keys and digits
  (`/(["'`])(qadi\.[a-z][a-z0-9_]*)\1/g`).
- A declaration line holding a `qadi.` that the extraction cannot read now fails.
- AGENTS.md says "Test-scope, like `METRIC_ID_LITERAL_BUDGET`" and names the walked directories,
  the quote forms and the refusal.
- The budget was re-measured over the wider walk and is unchanged.

**Plants**, each applied to the working tree, run through `node scripts/check-house-style.mjs`
and reverted with `git checkout --`. Every one exited 1:

| Plant | Output |
| ----- | ------ |
| a span key literal in `features/features/port-calls/port-calls.steps.test.ts` | `[span-key-literal] 1 quoted span key literal(s) outside a test title.` |
| a span key literal in `packages/core/test/EvaluationSpan.tst.ts` | `[span-key-literal] 1 quoted span key literal(s) outside a test title.` |
| a single-quoted duplicate `'qadi.policy_tag'` in `decideSubjectsSpan` | ``EvaluationSpan.ts:67,186 [span-key-source] `qadi.policy_tag` is spelled more than once`` |
| a digit key `"qadi.obligations2"` spelled twice | ``EvaluationSpan.ts:120,142 [span-key-source] `qadi.obligations2` is spelled more than once``, plus the `SPAN_KEY_MIN` floor |
| an unreadable template key `` `qadi.${"reason"}` `` | ``EvaluationSpan.ts:224 [span-key-source] holds a `qadi.` the key extraction cannot read``, plus the `SPAN_KEY_MIN` floor |

**Checked:** house-style is clean on the restored tree.

### WR-05: ADR-QD-188 states in current tense two things its revision 1.1 has done

**Status:** fixed
**Commit:** 14c85bf8
**Applied fix:** The two stale sentences are replaced with pointers to the ADR's own What
enforces it and The cost, measured sections.
**Checked:** spec-revise `--check` and strict traceability.

### WR-06: BEH-QD-714 attributes `qadi.decideSubject` to `EvaluationSpan.ts`

**Status:** fixed
**Commit:** 785105a2
**Applied fix:** `decideSubjectSpan` is declared in `EvaluationSpan.ts` (name
`qadi.decideSubject`, question and answer both keyless), and `SubjectSet.ts` opens
`Effect.fn(decideSubjectSpan.name)`. BEH-QD-714's listing now matches the declaration. The span
appears in `EvaluationSpan.test.ts`'s span list and in the tstyche span-name test.
**Checked:** core vitest, tstyche, house-style (span-key budget) and doc-examples.

### IN-01: `annotateSpan` duplicates the port path's annotators

**Status:** fixed
**Commit:** dfb5984d
**Applied fix:** `annotateSpan` now lives in `PortSpanEncode.ts` beside `encodeSpan`, and is the
only body of `Effect.annotateCurrentSpan(encodeSpan(...))` in `packages/*/src`.
`PortAccess.ts`'s question and answer helpers and `PortDerivation.ts`'s retrying wrapper call it.
**Checked:** grep finds one such body. Full core vitest passed (85 files, 2756 tests at that
commit).

### IN-02: Claims that `annotateSpan` is the only write path and the reason is never on a span

**Status:** fixed: requires human verification
**Commit:** 3ae2ac73
**Applied fix:** `denialEvent` is built by `logEventStruct`, a `LogEventStruct` kind. The span
annotators take a `SpanCarried` struct (`logEvent?: never`), so the denial event cannot annotate
a span. A negative pin, "the denial event's struct cannot annotate a span", has a positive twin,
"a span struct of the same fields can annotate a span". The budget row and the AGENTS.md row are
updated. The header and BEH-QD-715 now name the three write forms: `annotateAsked`,
`annotateSpan`, and `encodeSpan` for the denial log line and the stream's attributes.
**Checked:** the negative pin was seen failing by temporarily weakening the type, then restored.
tstyche, typecheck, oxlint and house-style are clean.

### IN-03: `toPredicate`'s pipeable has a layout found nowhere else

**Status:** fixed: requires human verification
**Commit:** 08042aae
**Applied fix:** A named local `answerFailure` is a one-line `Effect.tapError` that writes the
error tag through `annotateSpan`. The generator ends `}, answerFailure);`.
**Checked:** typecheck, Predicate tests, and the contract's toPredicate failure row.

### IN-04: `answersNothing` on the batch spans

**Status:** fixed
**Commit:** 4815b791
**Applied fix:** `answersNothing` is kept. The identity test is replaced by "the batch spans
write nothing after their question", which asserts each batch answer has no keys and encodes to
`{}`.
**Checked:** `EvaluationSpan.test.ts` passes.

### IN-05: The contract's cache-hit rows cannot fail for the cache-hit reason

**Status:** fixed
**Commit:** 9778a79c
**Applied fix:** A new `Evaluate.test.ts` row, "a cache hit's span carries its question and
outcome, and its record says hit", runs the same cache-hit setup with a recording sink. It
asserts the decision records' cache outcomes are `["miss", "hit"]` beside the second span's
exact attributes. BEH-QD-711 cites it beside the contract row, and the traceability row names it.
**Checked:** `Evaluate.test.ts` passes (225 tests), and spec-revise `--check` passes.

### IN-06: Literal span names beside declared ones

**Status:** fixed
**Commit:** 37d5c535
**Applied fix:** The four literal names now read `evaluateSpan.name` (three in
`Evaluate.test.ts`) and `toPredicateSpan.name` (one in `Predicate.test.ts`).
**Checked:** both files pass (330 tests), and typecheck passes.

### IN-08: The changeset says "the benchmark records the cost"

**Status:** fixed
**Commit:** 25551b02
**Applied fix:** It now reads "ADR-QD-188 records the measured cost (about 0.4–1.1 µs per call)".
**Checked:** re-read.

### IN-09: A third copy of the find-a-span-by-name test helper

**Status:** fixed
**Commit:** 001dbaba
**Files modified:** `packages/core/test/helpers.ts`, `EvaluationSpan.contract.test.ts`,
`Evaluate.test.ts`, `GuardHealthCheck.test.ts`, `Predicate.test.ts`, `SubjectSet.test.ts`,
`PortAccess.test.ts`, `PortConformance.test.ts`, `PortDescription.test.ts`, `PortRemote.test.ts`,
`PortServe.test.ts`, `spec/README.md`, `75-RED-EVIDENCE.md`, `75-contract-check.mjs` (new)
**Applied fix:**
- `attributesOf` and `allAttributesOf` are exported from `helpers.ts` beside `collectingTracer`,
  with the contract's text unchanged. `helpers.ts` gains `import { assert } from "@effect/vitest"`.
- The contract's only change is the two deleted declarations and their import from
  `./helpers.ts`.
- Every span test that restated the lookup uses the shared helpers. This covers the local
  `attributes`/`attributesOf`/`attributesIn`/`signatureSpans` copies and the inline
  `Object.fromEntries(span.attributes)` finds. No `Object.fromEntries(… attributes …)` remains in
  `packages/core/test` outside `helpers.ts`.
- `75-contract-check.mjs` follows the model of `74-characterisation-check.mjs`. It parses the
  contract and `helpers.ts` at ecb0256f and at HEAD with TypeScript's own parse. It fails unless:
  - the multiset of `it`/`it.effect` call texts, whitespace collapsed and led by their
    `describe` titles, is identical;
  - every other top-level statement is the first commit's, in order;
  - each moved helper is declared in `helpers.ts` with an equivalent declaration, exported, and
    imported as itself from `./helpers.ts`. **Equivalent** means: the text, whitespace collapsed
    and a leading `export` dropped, is exactly the first commit's; and every name it reads binds
    the same name of the same module, where a type-only import may become a value import of that
    name and module, never the reverse;
  - helpers of `helpers.ts` the contract reached keep their first text;
  - new top-level statements of `helpers.ts` run nothing at load and load no new module;
  - the contract's imports are the first commit's apart from the moved helpers.
- Its `--self-test` has 25 cases. The required ones are: a title change, an expected-value change
  and a changed moved helper fail; an import move, a header edit and an identical helper move pass.
- `75-RED-EVIDENCE.md` gains a dated section, "2026-11-23: the contract's one-commit rule,
  replaced in code review". Earlier sections are not rewritten.
- The README CCR-QD-467 row adds `helpers.ts` and the `Port*.test.ts` files to its file list.

**Checked:**
- The contract check prints `contract-check: 33 rows and 20 statements as at ecb0256f;
  15 helpers kept, 2 moved (attributesOf, allAttributesOf)`, exit 0.
- `self-test: 25 passed`, exit 0.
- Two plants on the real tree, each restored from a copy afterwards:
  - a renamed contract title failed with three problems (the row gone, the row new, statement 16
    changed);
  - a changed `attributesOf` body in `helpers.ts` failed with `attributesOf moved to the helpers
    file with other text`.

## No code change

### IN-07: Each annotation walks its record twice and allocates one intermediate object

**Status:** no change, by the orchestrator's decision
**Reason:** The review proposes no fix without a measurement. A single-pass writer would have to
read `Effect.currentSpan`, whose `NoSuchElementError` channel makes the saving unclear, and no
measured alternative exists. ADR-QD-188's The cost, measured already records the whole cost
(+6.79% on a settled repeat, about 0.4–1.1 µs per call). The note stands as a pointer for any
future benchmark of a one-walk annotator against the current one.

## Final pass (HEAD 001dbaba, main checkout, one runner at a time, stdin closed)

| Check | Result |
| ----- | ------ |
| `bash spec/scripts/verify-traceability.sh --strict` | PASS: 21, FAIL: 0, SKIP: 0, exit 0 |
| `pnpm exec vitest run --project core < /dev/null` | 85 files, 2757 tests passed |
| `pnpm typecheck` | exit 0 |
| `pnpm test:tstyche < /dev/null` | exit 0. Rule-off pass: 72 files, 391 passed, 1 skipped. Rule-on pass: 72 files, 390 passed, 2 skipped. The skips are the characterisation blocks, as designed. |
| `pnpm circular` | No circular dependency found |
| `node scripts/check-house-style.mjs` | 581 file(s) clean (3 declared switch(es), 72 type-test file(s)) |
| `node scripts/check-doc-examples.mjs` | 118 block(s) compile |
| `node scripts/check-website-doc-examples.mjs` | 71 block(s) compile |
| `node scripts/check-api-surface.mjs` | 941 export(s) documented across 9 package(s) |
| `node scripts/spec-revise.mjs --check` | every Revision matches its newest Change History entry |
| `75-contract-check.mjs` | 33 rows and 20 statements as at ecb0256f; 15 helpers kept, 2 moved, exit 0 |
| `75-contract-check.mjs --self-test` | 25 passed, exit 0 |
| CCR-QD-467 file list vs `git diff --name-only c054c2b1 HEAD -- packages spec scripts AGENTS.md apps .changeset features` | identical, 34 files (brace groups expanded) |
| `pnpm exec oxlint` on touched files | clean, run per commit |
| added lines over 91 characters (`perl -CS`) | none in `packages/` |

The acceptance project was not run because no file under `features/` changed (the WR-04 plant
there was reverted).

Spec revisions at HEAD: ADR-QD-188 1.6, ADR-QD-051 1.6, ADR-QD-109 1.7, `30-port-calls.md` 1.16,
`invariants.md` 1.195, `traceability.md` 1.271, `README.md` 1.332. The CCR-QD-467 row's
revisions equal each header.

---

_Fixed: 2026-11-23_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
