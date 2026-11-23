---
phase: QD-75-a-declared-span-shape-for-the-evaluate-family
reviewed: 2026-11-23T11:28:34Z
depth: standard
iteration: 3
files_reviewed: 38
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
  - .planning/phases/QD-75-a-declared-span-shape-for-the-evaluate-family/75-mutation.mjs
  - .planning/phases/QD-75-a-declared-span-shape-for-the-evaluate-family/75-mutation-close.json
  - .planning/phases/QD-75-a-declared-span-shape-for-the-evaluate-family/75-RED-EVIDENCE.md
findings:
  critical: 0
  warning: 2
  info: 6
  total: 8
  necessity: 0
status: issues_found
---

# Phase 75: Code Review Report (iteration 3)

**Reviewed:** 2026-11-23T11:28:34Z
**Depth:** standard
**Files Reviewed:** 38
**Status:** issues_found

## Summary

**Scope.** The review covered:
- the 34-file phase diff, `git diff --name-only c054c2b1 HEAD -- packages spec scripts AGENTS.md apps .changeset features`, at HEAD `f27c5127`;
- `75-contract-check.mjs`, with `--self-test`;
- `75-mutation.mjs`: `GROUPS`, `EXAMINED` and `--self-test`;
- `75-mutation-close.json`;
- the section "2026-11-23: The close after code review" of `75-RED-EVIDENCE.md`.

The 75-07 and 75-08 summaries were read for focus 6.

**What I ran on HEAD:**
- `node scripts/check-house-style.mjs`: clean, 581 files, 72 type-test files.
- Six span test files under vitest (`EvaluationSpan`, `EvaluationSpan.contract`, `Evaluate`, `SubjectSet`, `GuardHealthCheck`, `Predicate`): 426 tests pass.
- `75-contract-check.mjs`: 33 rows and 20 statements as at `ecb0256f`, 15 helpers kept and 2 moved. Its `--self-test`: 28 cases pass.
- `75-mutation.mjs --self-test`: 36 cases pass. `75-mutation.mjs compare`: exit 0, with output identical to what the evidence records.
- A script checked every test title quoted in a Pinned-by, Enforcement or traceability line the phase added to the eight spec documents. All 62 exist verbatim in the files they name.
- tstyche was not re-run.

**Focus 1: WR-01's typed doors.** I compiled a probe in the scratchpad against `tsconfig.base.json`. Every call relies on inference, with no type argument.

The compiler refuses:
- `encodeSpan(denialEvent, …)`;
- `askedAttributes(denialEvent, …)`;
- `annotateAsked(denialEvent, …)`;
- `logAnnotations(evaluateSpan.answer, …)`;
- `askedAttributes` and `annotateAsked` with a member left out;
- an extra member (`{ ...askedOf(q), evaluationId }` on `toPredicateSpan.question`);
- an outcome outside the three.

It accepts:
- `annotateAsked(evaluateSpan.question, { ...askedOf(q), evaluationId })`;
- the upcast `const s: SpanStruct<…> = denialEvent; annotateSpan(s, …)`. This one is documented as kept by review.

No call site uses `as`. Most of the texts are exactly true:
- the doc comments on `LogEventStruct`, `denialEvent` and the `EvaluationSpan.ts` header;
- BEH-QD-715;
- INV-QD-396;
- ADR-QD-188 decision 6 and What enforces it;
- CCR-QD-467.

The one exception is `logAnnotations`'s own doc comment (WR-01).

**Focus 2: IN-03.**
- `askedOf` / `batchAskedOf` give the same values as before. `decideSubjects`, the stream span and the denial line state exactly what they stated before, and the contract check confirms it.
- Nothing is restated except the denial line's two-member pick from `asked`. That pick is needed, because `denialEvent` has no `action` key.

**Focus 3: the re-close.**
- `git diff -U0 c054c2b1 HEAD -- packages/core/src/PortSpanEncode.ts` has hunks `+90,64` and `+170,28`, which are exactly `90-153` and `170-197`. The other hunks are doc comments (24-26, 69-70, 73-75), the `Effect` import (32), and line 77. Line 77 renames and unexports the existing encoding arrow, so its static mutant is the one the base already had.
- Every `EXAMINED` admission matches the close record by kind and count:
  - `EvaluationSpan.ts`: 3 arrow, 22 object and 13 string mutants;
  - `PortSpanEncode.ts`: 4 arrow, 1 object and 1 boolean mutant;
  - `Predicate.ts`: one arrow beyond the base's.
- The by-hand table gives each of these a row with Killed. The two exceptions are the RuntimeError rows at `EvaluationSpan.ts` 53 and 60, which crash the module at import, as stated.
- The `PortAccess`/`PortDerivation` reasoning holds. The changed lines only replace an inlined call with `annotateSpan`. Call expressions produce no mutant, and the module-scope arrows are unchanged.
- The close JSON, the evidence and the ADR agree on head `24ca9e2a`, the counts and the cost figures.
- One comment is stale (IN-03).

**Focus 4: cost, +6.79% to +9.17%.** Between `a61a47c4` and `24ca9e2a`, `decideQuestion` gained two things per evaluation:
- one object, because `askedOf(question)` is then spread into `{ ...asked, evaluationId }` (`Lifecycle.ts:86-87`);
- one call frame, `annotateAsked` → `annotateSpan`, on the question annotation only.

The answer annotation already went through a one-frame `annotateSpan` at `a61a47c4` (`EvaluationSpan.ts:214` there). The port reads' `annotateQuestion`/`annotateAnswer` each gained a frame (`PortAccess.ts:96`, `:111`).

Neither cost can be removed without giving up a guarantee:
- **The extra object.** It is the price of the one projection that IN-03 asked for. A shape that writes the four members inline restates the projection.
- **The extra frame.** I tried aliasing `annotateAsked` and `askedAttributes` to the same function value, as `encodeSpan`/`logAnnotations` are aliased. Both are refused (TS2322): over a generic `Fields`, `PoseOf<SpanStruct<Fields>>` is not assignable to `SpanType<SpanStruct<Fields>>`, so the alias needs an `as`.

The rest of the rise is inside the reference arm's spread, which is 7.5–12.2%. There is no finding beyond the ADR's description of what changed (IN-02).

**Focus 5: the two new `EvaluationSpan.test.ts` rows.**
- "each span of the family keeps the public name a tracer keys on" compares all six names with literals. So `name: ""` on `decideSubjectSpan` fails it.
- "a log event declaration carries its marker at runtime and a span struct does not" fails on `logEvent: false`. It also fails if `spanStruct` ever emits a `logEvent` key.

Each can fail for the reason its title names. Neither is cited by any spec text (IN-05).

**Focus 6: spec records.**
- All 62 quoted titles exist verbatim.
- The traceability rows name `PortSpanEncode.ts` where it is cited.
- Every revision cited in CCR-QD-467 equals its document's header (ADR-QD-188 1.9, ADR-QD-051 1.6, ADR-QD-109 1.8, `30-port-calls.md` 1.20, `05-evaluator.md` 1.23, `invariants.md` 1.200, `traceability.md` 1.275, `README.md` 1.340). Its file list, with brace groups expanded, is exactly the 34-file diff.
- `NOT_CALLABLE_PIN_BUDGET` is 6/0 for `EvaluationSpan.tst.ts`. That matches the six negative pins (lines 100, 120, 132, 148, 156, 172), each with a positive twin of the same subject text, and the AGENTS.md row.
- The 75-07 and 75-08 summaries' superseded figures are **not** marked superseded (WR-02).

`necessity-review.md` was read. No necessity finding applies.

## Warnings

### WR-01: `logAnnotations`'s doc comment says a log event cannot reach a span through it, but its output annotates a span with no error

**File:** `packages/core/src/PortSpanEncode.ts:130-131`

**Issue:** The doc comment reads: "The encoding body under a type that takes only a log event, so a span's struct cannot be written to a log line through it, **nor a log event's to a span**."

`logAnnotations` returns a plain `Readonly<Record<string, SpanValue>>`. This compiles cleanly against HEAD (scratchpad probe, `tsc` exit 0):

```ts
Effect.annotateCurrentSpan(logAnnotations(denialEvent, { reason: "r" }))
```

That call writes the denial reason onto a span through `logAnnotations`.

The rest of the phase states this correctly:
- `LogEventStruct`'s doc at `:97-99`: "A raw `Effect.annotateCurrentSpan` … are not refused; review keeps those";
- BEH-QD-715, INV-QD-396 and ADR-QD-188 say the same;
- the iteration-2 fix report names this exact path: "a raw `annotateCurrentSpan` … fed with … `logAnnotations` output".

So the one doc comment on the function itself is the only text that claims the compiler holds this path. This is the class of overclaim WR-01 of iteration 2 was raised for.

**Fix:** Scope the sentence to what the parameter type does:

```ts
/**
 * The annotations of a log line, from a {@link LogEventStruct} and nothing else.
 *
 * The encoding body under a type that takes only a log event, so a span's struct
 * cannot be encoded as a log line's annotations through it. What it returns is a
 * plain record: passed to a raw `Effect.annotateCurrentSpan` it is not refused, and
 * review keeps that, as {@link LogEventStruct} says.
 */
```

### WR-02: The 75-07 and 75-08 summaries still state the superseded close and cost as current, with nothing marking them superseded

**File:**
- `.planning/phases/QD-75-a-declared-span-shape-for-the-evaluate-family/75-07-SUMMARY.md:14-16`, `:40`, `:51-53`, `:58-61`, `:72-76`, `:139`, `:144`;
- `75-08-SUMMARY.md:46`, `:143-144`.

**Issue:** A reader relies on these places, and some of their statements are now false:
- 75-07's one-line summary says the cost is "+6.8% to +7.8% geometric mean … (about 0.4 to 1.1 microseconds)".
- 75-07's `provides` says `EXAMINED` holds "EvaluationSpan.ts (35 static mutants)".
- Its Accomplishments say "Close measured on one head (`a61a47c4`, nothing under `packages/` changed afterwards): `core` 365/365 … `span` … 35 Ignored".
- Its Next Phase Readiness says "Nothing under `packages/` changes after this plan".
- 75-08 repeats "+7.83% and +6.79% geometric mean, 0.4 to 1.1 us per call" as the figures the records carry.

Since then:
- the code-review loop changed `packages/core/src`;
- the close was re-recorded at `24ca9e2a`: `core` 362/362, `span` 38 + 6 Ignored, with `PortSpanEncode.ts` in the group;
- the cost was re-measured at +9.17%, about 0.3–0.9 µs, and the ADR, CCR and changeset now carry that figure.

`75-RED-EVIDENCE.md` handles its own history correctly: "Sections above are left as they were written", followed by a dated section. The summaries have no such marker. `/gsd-milestone-summary` and `/gsd-extract-learnings` read SUMMARY frontmatter and one-line summaries, so they would carry the stale close and cost forward. The brief asked for these figures to be marked superseded where a reader would rely on them. They are not.

**Fix:** Leave the figures as written, as the evidence file does. Add one dated note under each affected summary's one-line summary, and beside the 75-07 `provides` and `key-decisions` lines. For example:

```markdown
> **Superseded 2026-11-23 (code review):** the close and the cost above describe `a61a47c4`. Code review then changed
> `packages/core/src`; the close was re-recorded at `24ca9e2a` (`core` 362/362, `span` with `PortSpanEncode.ts`) and the
> cost re-measured at +9.17% geomean, about 0.3–0.9 µs per call. See 75-RED-EVIDENCE.md, "2026-11-23: The close after
> code review", and ADR-QD-188, The cost, measured.
```

Also strike or annotate "nothing under `packages/` changed afterwards" and "Nothing under `packages/` changes after this plan", which are now false.

## Info

### IN-01: `decideSubjectsStream` keeps a block body whose only statement is `return`, left over from a removed local

**File:** `packages/core/src/SubjectSet.ts:263-274`

**Issue:** At `c054c2b1` this was an expression-bodied arrow. Iteration 1 turned it into a block so that it could hold a `PoseOf`-typed `asked` local. Iteration 2 removed that local in favour of `askedAttributes(…, batchAskedOf(…))`, which left `=> { return subjects.pipe(…); }`. The block now holds nothing, and it grows the phase's diff in a file the phase owns.

**Fix:** Restore the expression body: `): Stream.Stream<…> =>\n  subjects.pipe(…);`

### IN-02: ADR-QD-188's cost section says the rewiring "adds a call frame to each annotation", which is not what changed on the evaluate path

**File:** `spec/decisions/188-the-evaluate-familys-spans-are-declared-once-and-a-failed-span-says-what-was-asked.md` (The cost, measured, first paragraph); the same reading in `75-RED-EVIDENCE.md` ("The added call frames of the rewiring are inside the figure")

**Issue:** At `a61a47c4`, both evaluate annotations already went through a one-frame `annotateSpan` (`EvaluationSpan.ts:214` at that commit). The answer annotation is unchanged at HEAD (`Lifecycle.ts:143`, `:160`). `logAnnotations` is `encodeStruct` itself, so it adds no frame.

What did change per evaluation:
- one frame on the question annotation (`annotateAsked` → `annotateSpan`);
- one extra object (`askedOf(question)` spread into `{ ...asked, evaluationId }`, `Lifecycle.ts:86-87`);
- one frame on each port annotation (`PortAccess.ts:96`, `:111`).

The section's stated use is "so that a later change which moves it is compared with a number". That comparison needs an accurate list of what the second measurement added.

**Fix:** "…which adds a call frame to the question annotation and to each port annotation (`annotateQuestion`, `annotateAnswer`), and one object per evaluation (`askedOf`'s result spread with the evaluation id); the answer annotation and the denial line are unchanged." Revise through `spec-revise.mjs`, and update the CCR-QD-467 row's revision for ADR-QD-188 to match.

### IN-03: `EXAMINED`'s comment names the wrong static arrow in `Predicate.ts`

**File:** `.planning/phases/QD-75-a-declared-span-shape-for-the-evaluate-family/75-mutation.mjs:90-91`

**Issue:** The comment says "`Predicate.ts` gained one static arrow, the `tapError` callback of `toPredicate`'s span". That was true at `a61a47c4`, where the callback was inline (line 698). At HEAD the new static mutant is `645:23 ArrowFunction` (`75-mutation-close.json`). That position is `answerFailure`'s own module-scope arrow (`Predicate.ts:645`). The `tapError` callback inside it (`:648`) is created per call and is not static.

**Fix:** "…`Predicate.ts` gained one static arrow, `answerFailure`, the pipeable that annotates a failed translation's error tag, Killed by hand."

### IN-04: AGENTS.md §6 does not name the `paramsOf` pin form that `EvaluationSpan.tst.ts` introduces

**File:** `AGENTS.md` (§6, the paragraph beginning "A bare negative pin is for a subject that returns a plain value", and the `EvaluationSpan.tst.ts` table row at `:548`); `packages/core/test/EvaluationSpan.tst.ts:95-97`

**Issue:** §6 gives the forms for a negative pin on an `Effect`-returning function as `Params<F>` for a whole call (`PortAccess.tst.ts`) or `Parameters<typeof f>[i]` for one parameter (`DecisionLog.tst.ts`). `EvaluationSpan.tst.ts` adds a third form: a `declare`d value-level `paramsOf`, which keeps the callee's type parameters so the arguments are inferred as a writer's are. Iteration 2 chose this form for a real reason: a `Params<F>` on a generic needs an explicit instantiation, which hid an inference regression. The table row says only "refused through the parameter type, inferred at the call". The house rule's list of forms no longer covers every form in use, and the next reader looking for the sanctioned form for a generic `Effect` function will not find it.

**Fix:** Add one clause to the §6 paragraph, for example: "…or, for a generic function whose pin must infer its type parameters as a call does, a declared `paramsOf` that keeps them (`EvaluationSpan.tst.ts`)". Then make the table row say "refused through `paramsOf(…)`".

### IN-05: The two rows added in `24ca9e2a` are cited by no spec text

**File:** `packages/core/test/EvaluationSpan.test.ts:217`, `:231`; `spec/behaviors/30-port-calls.md` (BEH-QD-715 Pinned by); `spec/traceability.md` (the `EvaluationSpan.test.ts` row)

**Issue:** "each span of the family keeps the public name a tracer keys on" is the only runtime pin for ADR-QD-188 decision 7 ("The names themselves do not change"), and for `decideSubjectSpan`'s name in particular. "a log event declaration carries its marker at runtime and a span struct does not" pins the runtime half of the `LogEventStruct` brand. Neither appears in BEH-QD-715's Pinned-by line, in INV-QD-396's Enforcement, or in the traceability row for `EvaluationSpan.test.ts`. That row lists the file's other rules one by one.

**Fix:** Append both titles to BEH-QD-715's `EvaluationSpan.test.ts` list. Add "each span's public name, and the log event's runtime marker" to the traceability row. Both edits go through `spec-revise.mjs`, with the CCR-QD-467 revisions updated to match.

### IN-06: Lines the phase wrote past the file's wrap width

**File:**
- `scripts/check-house-style.mjs:2430`: 113 characters, written in `92ba8b43`;
- `packages/core/test/EvaluationSpan.test.ts:208` (95), `:213` (94), `:231` (96).

**Issue:**
- **The house-style comment.** It sits in a comment block (`:2420-2437`) whose other lines wrap at 72–86 characters. Line 2430 alone runs to 113 (`//     or \`test\` call is not counted; one passed to a method call is. It walks …`), which is a missed rewrap from the IN-10 fix.
- **The test lines.** These were written in the iteration-2 IN-02 fix and in `24ca9e2a`, past the ~90 columns of §17.

**Fix:** Rewrap line 2430 at the block's width. Break `:208` and `:213` at their argument lists. For `:231`, shorten the title or wrap the `it(` call head as the neighbouring rows do.

---

_Reviewed: 2026-11-23T11:28:34Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
