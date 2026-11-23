---
phase: QD-75-a-declared-span-shape-for-the-evaluate-family
fixed_at: 2026-11-23T12:45:00Z
review_path: .planning/phases/QD-75-a-declared-span-shape-for-the-evaluate-family/75-REVIEW.md
iteration: 3
findings_in_scope: 8
fixed: 8
skipped: 0
status: all_fixed
---

# Phase 75: Code Review Fix Report (iteration 3)

**Fixed at:** 2026-11-23T12:45:00Z
**Source review:** `.planning/phases/QD-75-a-declared-span-shape-for-the-evaluate-family/75-REVIEW.md`
**Iteration:** 3

**Summary:**
- Findings in scope: 8 (2 warnings, 6 info; fix scope `all`)
- Fixed: 8
- Skipped: 0

`workflow.use_worktrees` is `false`, so every edit, commit and check ran in the main checkout on `arch-wave-13`. No
worktree was created. The final pass ran on `e9ebfe90`.

## Fixed Issues

### WR-01: `logAnnotations`'s doc comment says a log event cannot reach a span through it

**Files modified:** `packages/core/src/PortSpanEncode.ts`
**Commit:** `02682925`
**Applied fix:** The doc comment now says only what is true:
- the parameter type takes only a log event, so a span's struct cannot be encoded as a log line's annotations through it;
- the span-writing functions refuse the event itself;
- what it returns is a plain record, so a raw `Effect.annotateCurrentSpan` of it is not refused, and review keeps that, as
  `LogEventStruct` says.

This matches `LogEventStruct`'s doc, BEH-QD-715, INV-QD-396 and ADR-QD-188. The comment gained two lines, so the span
group's ranges moved (see "The GROUPS ranges" below).
**How checked:** Tier 1 re-read. `pnpm typecheck` and the core vitest project pass. No spec text quoted the old sentence
(grep over `packages`, `spec`, `apps` and `AGENTS.md`; the only hits are stale `lib/` build output).

### WR-02: The 75-07 and 75-08 summaries still state the superseded close and cost as current

**Files modified:** `75-07-SUMMARY.md`, `75-08-SUMMARY.md`
**Commit:** `916d18f8`
**Applied fix:** None of the original figures were rewritten. Each affected place got a dated "Superseded 2026-11-23 (code
review)" note that states the current figures:
- `core` 362/362 at `24ca9e2a`;
- the `span` group: `EvaluationSpan.ts` 3/3 valid with 38 Ignored, and `PortSpanEncode.ts` over its `GROUPS` ranges with 6
  Ignored, every Ignored mutant run by hand;
- +9.17% geometric mean, about 0.3 to 0.9 µs per `evaluate` call.

Each note points to `75-RED-EVIDENCE.md` "2026-11-23: The close after code review" and to ADR-QD-188 The cost, measured.

Where the notes went:
- **75-07:** under the one-line summary, and at the top of Accomplishments and Issues Encountered. YAML comments sit
  beside the `provides` EXAMINED line and the cost `key-decisions` line. A `superseded:` frontmatter key carries the note
  for tools that read only frontmatter. The two false statements ("nothing under `packages/` changed afterwards" and
  "Nothing under `packages/` changes after this plan") and the Threat Flags line each carry an inline bracketed
  superseded marker.
- **75-08:** a YAML comment beside the cost `key-decisions` line, the `superseded:` key, and a note at the top of Issues
  Encountered.

**How checked:** Both frontmatters parse with `yaml` (19 keys each, `superseded` present). Re-read.

### IN-01: `decideSubjectsStream` keeps a block body whose only statement is `return`

**Files modified:** `packages/core/src/SubjectSet.ts`
**Commit:** `b4cf04d3`
**Applied fix:** Restored the expression body (`=>\n  subjects.pipe(…);`). The behaviour is identical.
**How checked:** `tsc --noEmit -p packages/core/tsconfig.src.json` is clean. In the final pass, the core vitest project
(including `SubjectSet.test.ts` and the contract) and the contract check pass.

### IN-02: ADR-QD-188's cost section says the rewiring "adds a call frame to each annotation"

**Files modified:** `spec/decisions/188-…-says-what-was-asked.md` (Rev 1.9 to 1.10), `spec/README.md` (Rev 1.340 to
1.341), `75-RED-EVIDENCE.md`
**Commit:** `7429e963`
**Applied fix:** The cost paragraph now names exactly what the rewiring added:
- a call frame on the question annotation;
- a call frame on each port annotation (`annotateQuestion`, `annotateAnswer`);
- one object per evaluation (`askedOf`'s result spread with the evaluation id).

The answer annotation and the denial line are unchanged. I checked each claim against `a61a47c4`: `PortAccess.ts:96`/`:111`
inlined `Effect.annotateCurrentSpan(encodeSpan(…))` there. At HEAD, `Lifecycle.ts:86-87` and the two answer writes use
`annotateSpan`.

The revision went through `spec-revise.mjs`. CCR-QD-467 now cites ADR-QD-188 "Rev 1.10 (new at 1.0; … corrected at 1.2, …,
1.9 and 1.10, in code review)" and README Rev 1.341.

The review's same reading in `75-RED-EVIDENCE.md`'s shipping-tree cost paragraph ("The added call frames … are inside the
figure") was corrected to the same list, in that one sentence only.
**How checked:** `spec-revise.mjs --check`, and strict verify-traceability in the final pass.

### IN-03: `EXAMINED`'s comment names the wrong static arrow in `Predicate.ts`

**Files modified:** `75-mutation.mjs`, comment only
**Commit:** `63c311b6`
**Applied fix:** The comment now reads "`Predicate.ts` gained one static arrow, `answerFailure`, the pipeable that annotates
a failed translation's error tag, Killed by hand". No `EXAMINED` count changed.
**How checked:** `75-mutation.mjs --self-test`: 36 passed.

### IN-04: AGENTS.md §6 does not name the `paramsOf` pin form

**Files modified:** `AGENTS.md`
**Commit:** `cd71008b`
**Applied fix:** The §6 paragraph names the third form: a generic function whose pin must infer its type parameters as a
writer's call does goes through a `declare`d `paramsOf`, `expect(paramsOf(f)).type.not.toBeCallableWith(…)`
(`EvaluationSpan.tst.ts`). The paragraph says what the form keeps and why it exists:
- it drops the result and keeps the type parameters;
- `Params<F>` on a generic needs an explicit instantiation, which can hide an inference regression.

The overload sentence now covers `paramsOf` too. The `EvaluationSpan.tst.ts` table row says "refused through
`paramsOf(…)`", and its counts (6/0) are unchanged. The paragraph is rewrapped at about 80 columns.
**How checked:** `check-house-style.mjs` (`[not-callable-pin-table]`) is clean, and `pnpm test:tstyche` passes.

### IN-05: The two rows added in `24ca9e2a` are cited by no spec text

**Files modified:**
- `spec/behaviors/30-port-calls.md` (1.20 to 1.21);
- `spec/invariants.md` (1.200 to 1.201);
- `spec/traceability.md` (1.275 to 1.276);
- `spec/README.md` (1.341 to 1.342).

**Commit:** `08011a28`
**Applied fix:** The two titles ("each span of the family keeps the public name a tracer keys on" and "a log event
declaration carries its marker at runtime and a span struct does not") are now cited in four places:
- BEH-QD-715's `EvaluationSpan.test.ts` Pinned-by list, appended to it;
- INV-QD-396's Enforcement, as the run-time hold of each span's public name and of the denial event's log-event marker,
  which no span struct carries;
- the traceability `EvaluationSpan.test.ts` row ("each span's public name, and the log event's runtime marker");
- INV-QD-396's traceability row.

The CCR-QD-467 row cites every new revision.
**How checked:** Each title occurs exactly once, verbatim, in `EvaluationSpan.test.ts`. `spec-revise.mjs --check` and
strict verify-traceability pass.

### IN-06: Lines the phase wrote past the file's wrap width

**Files modified:** `scripts/check-house-style.mjs`, `packages/core/test/EvaluationSpan.test.ts`
**Commit:** `4a7ddb00`
**Applied fix:**
- `check-house-style.mjs:2430` is rewrapped at the comment block's width.
- `EvaluationSpan.test.ts:208` and `:213` are broken at their argument lists.
- `:231`'s `it(` head is wrapped as a multi-line call, with the title kept as one string literal and unchanged, so the
  IN-05 citations still resolve.

No line the phase added in either file is over 91 characters.
**How checked:** `EvaluationSpan.test.ts` passes 13/13. `check-house-style.mjs` is clean. `oxlint` reports one warning, at
`check-house-style.mjs:1095`, which predates the phase (blame: 2026-09-08).

## The GROUPS ranges

They moved. WR-01 added two lines inside `PortSpanEncode.ts`'s first phase hunk. Re-derived from
`git diff -U0 c054c2b1 HEAD -- packages/core/src/PortSpanEncode.ts`, the hunks that add a declaration are now `+90,67` and
`+173,28`:
- `logEventStruct` to `annotateSpan` is lines 90-156 (was 90-153);
- `annotateAsked` to `askedAttributes` is lines 173-200 (was 170-197).

`GROUPS.span.mutate` and its comment were updated in `e9ebfe90` (docs(75)). `75-mutation-close.json` and
`75-mutation-base.json` were not touched. The orchestrator re-records the close, because `PortSpanEncode.ts` and
`SubjectSet.ts` changed after `24ca9e2a`. The ranges that `75-RED-EVIDENCE.md` quotes for the run at `24ca9e2a` are left as
that run's record.

## Final pass (on `e9ebfe90`, main checkout, one runner at a time, stdin closed)

| Check | Result |
| ----- | ------ |
| `pnpm exec vitest run --project core` | 85 files, 2760 tests passed |
| `pnpm typecheck` | exit 0 |
| `pnpm test:tstyche` | exit 0: 72 files, 398 passed, 2 skipped (both passes) |
| `pnpm circular` | No circular dependency found |
| `node scripts/check-house-style.mjs` | 581 files clean, 3 declared switches, 72 type-test files |
| `node scripts/check-doc-examples.mjs` | 118 blocks compile |
| `node scripts/check-website-doc-examples.mjs` | 71 blocks compile |
| `node scripts/check-api-surface.mjs` | 941 exports across 9 packages |
| `pnpm exec oxlint` on the touched source, test and script files | 0 errors; 1 warning that predates the phase (`check-house-style.mjs:1095`) |
| `node scripts/spec-revise.mjs --check` | every Revision matches its newest Change History entry |
| `75-contract-check.mjs` | 33 rows and 20 statements as at `ecb0256f`; 15 helpers kept, 2 moved |
| `75-contract-check.mjs --self-test` | 28 passed |
| `75-mutation.mjs --self-test` | 36 passed |
| `bash spec/scripts/verify-traceability.sh --strict` | PASS 21, FAIL 0, SKIP 0 |

The acceptance project was not run, because nothing under `features/` was touched. CCR-QD-467's file list still equals
`git diff --name-only c054c2b1 HEAD -- packages spec scripts AGENTS.md apps .changeset features` (34 files, none new). Its
cited revisions equal each header:
- ADR-QD-188 1.10;
- ADR-QD-051 1.6 and ADR-QD-109 1.8 (both unchanged);
- `30-port-calls.md` 1.21;
- `05-evaluator.md` 1.23 (unchanged);
- `invariants.md` 1.201;
- `traceability.md` 1.276;
- `README.md` 1.342.

---

_Fixed: 2026-11-23T12:45:00Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 3_
