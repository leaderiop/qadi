---
phase: QD-65-only-admit-builds-an-admitted
verified: 2026-11-20T22:00:00Z
status: passed
score: 5/5 must-haves verified
covered_files:
  - ".planning/phases/QD-65-only-admit-builds-an-admitted/65-01-PLAN.md"
  - ".planning/phases/QD-65-only-admit-builds-an-admitted/65-01-SUMMARY.md"
  - ".planning/phases/QD-65-only-admit-builds-an-admitted/65-02-PLAN.md"
  - ".planning/phases/QD-65-only-admit-builds-an-admitted/65-02-SUMMARY.md"
  - ".planning/phases/QD-65-only-admit-builds-an-admitted/65-03-PLAN.md"
  - ".planning/phases/QD-65-only-admit-builds-an-admitted/65-03-SUMMARY.md"
  - ".planning/phases/QD-65-only-admit-builds-an-admitted/65-04-PLAN.md"
  - ".planning/phases/QD-65-only-admit-builds-an-admitted/65-04-SUMMARY.md"
  - ".planning/phases/QD-65-only-admit-builds-an-admitted/65-05-PLAN.md"
  - ".planning/phases/QD-65-only-admit-builds-an-admitted/65-05-SUMMARY.md"
  - ".planning/phases/QD-65-only-admit-builds-an-admitted/65-06-PLAN.md"
  - ".planning/phases/QD-65-only-admit-builds-an-admitted/65-06-SUMMARY.md"
  - "packages/core/src/Admission.ts"
  - "packages/core/test/Admission.test.ts"
  - "packages/core/test/WalkEnvironment.tst.ts"
covered_digest: "v4:sha256:34973f63d1c7418cdd77685e6b01cce1f4629f5f86f42bf878886da2ba77d65a"
behavior_unverified: 0
overrides_applied: 0
re_verification:
  previous_status: gaps_found
  previous_score: 4/5
  gaps_closed:
    - "The CCR-QD-456 row in spec/README.md cited the pre-review-fix revisions (b56f32c0 now cites ADR-QD-172 Rev 1.2, 05-evaluator.md Rev 1.19, invariants.md Rev 1.163, traceability.md Rev 1.230, spec/README.md Rev 1.266 and records the narrowed read-once wording)"
  gaps_remaining: []
  regressions: []
---

# Phase 65: Only `admit` builds an `Admitted` Verification Report

**Phase Goal:** An `Admitted` can be built only by `admit`, and the `"asked"` row's supplied flags are derived from the matcher context `admit` builds, so the question's resource is read for the flag and for the context from one place and the two agree by construction.
**Verified:** 2026-11-20 (re-verification)
**Status:** passed
**Re-verification:** Yes, after gap closure (previous: gaps_found, 4/5)
**Base / HEAD:** d1ac1df0 / b56f32c0

The code goal was met on the first pass; the one gap, the CCR-QD-456 register row citing stale revisions, is closed by b56f32c0. `git diff cc7fdc37 HEAD` is `spec/README.md` alone (3 lines), so everything verified on the first pass stands, and `check:pr` (green on cc7fdc37) is not re-run: the change is one Markdown row and the revision header.

## Goal Achievement

### Observable Truths

| #   | Truth | Status | Evidence |
| --- | ----- | ------ | -------- |
| 1 | SC1 / ADMT-01: a `@ts-expect-error` pin shows `new Admitted(...)` refused outside the class and a same-shape object literal not assignable, each with a positive control on `admit`, both RED on the base | VERIFIED | `WalkEnvironment.tst.ts` lines 57-82. The directive text names the reason, so tstyche checks it. `tstyche --config tstyche.json` on the file: 6 passed, 23 assertions, 2 suppressed matched, TypeScript 6.0.3. `pin-codes.mjs` (directives blanked) prints TS2673 on the constructor call and TS2741 on the literal and nothing else, exit 0. The 65-RED-EVIDENCE table shows both pins failing with "Unused '@ts-expect-error'" (ts2578) on the base in both tstyche passes, and `pnpm typecheck` red. Each half of the lock is shown necessary: a public constructor reads TS2741 only, and no `nominal` reads TS2673 only. |
| 2 | SC2 / ADMT-02: `Admitted` has a private constructor and a private instance member, `admit` is its static method exported as `admit`, `Walk.ts` and `Predicate.ts` call sites unchanged | VERIFIED | `Admission.ts`: `declare private readonly nominal: never;`, `private constructor(...)`, `static admit<Source extends RowSource>(...)`, `export const admit = Admitted.admit;`. The static method names `Admitted`, never `this`, so the detached export is safe. `git diff d1ac1df0 HEAD -- packages` touches only `Admission.ts`, `Admission.test.ts` and `WalkEnvironment.tst.ts`: `Walk.ts` (`admit(question, "asked")`, line 878) and `Predicate.ts` (`admit(question, "row")`, line 664) are untouched. The only other `new Admitted` in `packages/*/src` is the unrelated `packages/audit/src/CircuitBreaker.ts:484`. The member is `declare`, so it has no run-time slot (65-RED-EVIDENCE: `lib/Admission.d.ts` holds `private readonly nominal;` and `.js` has no code line naming it). |
| 3 | SC3 / ADMT-03: the `"asked"` flags are derived from the matcher context `admit` builds, the `"row"` row stays as is, E1-E5 and `LeafMatrix.test.ts` pass unedited | VERIFIED | `SUPPLIED` rows now take a `MatcherContext`: `asked: context.action !== undefined, context.resource !== undefined`; `row: action from the context, resource: true`. `admit` builds `context` once from `question.subject`, `question.resource` and `question.action` and passes that same object to `SUPPLIED[rowSource](context)` and to the constructor. The test diff only adds lines (E7 to E10, 77 insertions, 0 deletions in `Admission.test.ts`); `LeafMatrix.test.ts` is not in the diff. Vitest on `Admission.test.ts` and `LeafMatrix.test.ts`: 2 files, 22 tests passed. E7, E8 and E9 are RED on the base (`expected undefined to equal ...`), E10 is green on the base as preserved behaviour (WX-06). Each derivation variant that reads the question again fails E7-E10 (65-RED-EVIDENCE). |
| 4 | SC4 / ADMT-04: a 3 + 3 interleaved bench of the committed source against the phase base, with Phase 59's harness and bands, shows no workload slower beyond its band | VERIFIED | `65-BENCH.md`: 35 workloads, `# slower: 0`, geomean -0.51%, worst +1.6% (width 8) against a 10% band, harness SHA-256 recorded, `uptime` logged for each of the six runs. No code token changed after the bench: a comment-stripped, whitespace-collapsed diff of `Admission.ts` between 6c4be029 and HEAD is empty, and `git diff 96771886 HEAD -- packages scripts` is 3 lines in `Admission.ts` (comments, from a23dacf1 and c0be0db8). `Walk.ts` and `Predicate.ts` were not touched at all. |
| 5 | Every text that says how `Admitted` is built or how the flags are set says only what the code holds, and the phase's CCR row records the revisions it leaves | VERIFIED | Prose accurate (audit below, unchanged). Gap closed: the CCR-QD-456 row now reads ADR-QD-172 Rev 1.2 (amendment at 1.1, narrowed in code review at 1.2), `05-evaluator.md` Rev 1.19, `invariants.md` Rev 1.163, `traceability.md` Rev 1.230, `spec/README.md` Rev 1.266. Each matches the header at HEAD (read from line 8 of each file). It also carries a "Changed in code review" clause saying the read-once wording is scoped to the question's resource and action and that `admit` still reads policy, bound and subject more than once. README Change History has the 1.266 entry. |

**Score:** 5/5 truths verified.

### Text-vs-code audit for truth 5

| Text | Claim checked | Result |
| ---- | ------------- | ------ |
| `Admission.ts` module, `SUPPLIED`, `Admitted` and `Admitted.admit` doc comments | Read-once is scoped to the question's resource and action; `policy` and `maxDepth` are said to be read separately for the depth check; the `"asked"` flags are said not to be checked by the compiler; "no `this`" | Matches the code. `question.policy` is read twice and `question.maxDepth` is read twice or more, and the comment says so. |
| `Walk.ts` doc comments (`Evaluation`, `walk`) and `Predicate.ts` (`compileTree`, `toPredicate`) | `Admitted<"asked">` / `Admitted<"row">`, "supplied by type", the environment is built only for a walk that runs | Accurate and unchanged. None claims who builds an `Admitted`. |
| ADR-QD-172 Decision 1, Decision 3 and the 2026-11-20 amendment (Rev 1.2) | "only `admit` builds one, which the compiler has held since the amendment", type-level only, "type assertion could still claim an Admitted", flags `boolean` so the compiler does not check them, depth judged on a separate read | Accurate. Run-time constructor is an ordinary function, and the text says so. The Consequences line "933 exports before and after" is Phase 59's history, and the amendment states the current 939. Not a gap. |
| INV-QD-364 | `SUPPLIED` rows read the matcher context `admit` builds once (cites INV-QD-376) | Accurate. |
| INV-QD-375 | Private constructor and `nominal`; TS2673 and TS2741; type-level only; the depth check reads `policy` and `maxDepth` apart, "this invariant does not cover that"; `pin-codes.mjs` is not part of `pnpm check:pr` | Accurate. I ran `pin-codes.mjs`: TS2673 at line 62, TS2741 at line 68. |
| INV-QD-376 | Resource and action each read once; compiler does not check the `"asked"` flags | Accurate. |
| BEH-QD-631/632/633 | Pre-existing and still true. 633's "`supplied.action` true exactly when the question carries an action" holds because the context holds exactly what the question's single read returned. | Accurate. |
| BEH-QD-661, BEH-QD-662 | Pin wording and codes; "wherever code is type-checked"; E7-E10 | Accurate. |
| `spec/overview.md` (Rev 1.129) | Phase is package-private (ADR-QD-099), so no row is needed or changed. `grep -i "admission\|admitted"` finds only unrelated rows (`enforceLoaded` and similar). `pnpm check:pr` ran gate 13 green at 939 exports. | No stale row. |
| `spec/traceability.md` rows for INV-QD-375/376, ADR-QD-172, `Admission.test.ts`, `WalkEnvironment.tst.ts` | Link slugs, BEH list for 05-evaluator, test lists | Present and correct. `verify-traceability.sh --strict`: PASS 21, FAIL 0, SKIP 0. `spec-revise.mjs --check`: every Revision matches its newest Change History entry. Info: the INV-QD-364 trace row (line 196) still says `admit` computes `supplied` "from it and from the question alone". The context is derived from the question, so it is not false, only less precise than INV-QD-364 itself. |

### Required Artifacts

| Artifact | Expected | Status | Details |
| -------- | -------- | ------ | ------- |
| `packages/core/src/Admission.ts` | Private constructor, `nominal`, static `admit`, context-derived `SUPPLIED` | VERIFIED | Substantive, wired from `Walk.ts:878` and `Predicate.ts:664`, data flows (E1-E10, LeafMatrix). |
| `packages/core/test/WalkEnvironment.tst.ts` | Two construction pins and positive controls | VERIFIED | See truth 1. |
| `packages/core/test/Admission.test.ts` | E7-E10 getter cases | VERIFIED | Run: green. |
| `65-RED-EVIDENCE.md`, `65-BENCH.md`, `65-mutation-base.json`, `65-mutation-close.json` | Phase records | VERIFIED | Content read and cross-checked against the code. |
| `spec/README.md` CCR-QD-456 row | The phase's change record at current revisions | VERIFIED | Revisions current at HEAD (b56f32c0). |

### Key Link Verification

| From | To | Via | Status |
| ---- | -- | --- | ------ |
| `Walk.ts` `walk` | `Admission.admit` | `admit(question, "asked")`, result passed as `Admitted<"asked">` | WIRED |
| `Predicate.ts` `toPredicate` | `Admission.admit` | `admit(question, "row")` into `compileTree(Admitted<"row">)` | WIRED |
| `Admitted.admit` | `SUPPLIED` | `SUPPLIED[rowSource](context)`, the same `context` is stored as `matcherContext` | WIRED |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
| -------- | ------- | ------ | ------ |
| Admission and LeafMatrix suites | `pnpm exec vitest run packages/core/test/Admission.test.ts packages/core/test/LeafMatrix.test.ts` | 22 passed | PASS |
| Construction pins | `tstyche --config tstyche.json packages/core/test/WalkEnvironment.tst.ts` | 6 passed, 2 suppressed matched | PASS |
| Pin codes | `node .planning/phases/QD-65-only-admit-builds-an-admitted/pin-codes.mjs` | TS2673, TS2741, exit 0 | PASS |
| Traceability | `spec/scripts/verify-traceability.sh --strict` | PASS 21, FAIL 0 | PASS |
| Revision headers | `node scripts/spec-revise.mjs --check` | clean | PASS |
| Merge gate | `pnpm check:pr`, run by the caller on cc7fdc37 | exit 0, 16 of 17 steps (mutation is release-PR only) | PASS (not re-run; only a Markdown row changed since) |
| Revision headers at HEAD | `node scripts/spec-revise.mjs --check` | clean; headers 05-evaluator 1.19, invariants 1.163, traceability 1.230, ADR-172 1.2, README 1.266 | PASS |
| Traceability at HEAD | `spec/scripts/verify-traceability.sh --strict` | PASS 21, FAIL 0, SKIP 0 | PASS |
| Code unchanged since the bench | `git diff 6c4be029 HEAD -- packages` | 6 changed lines, all comments in `Admission.ts` | PASS |

### Requirements Coverage

| Requirement | Status | Evidence |
| ----------- | ------ | -------- |
| ADMT-01 | SATISFIED | Truth 1. |
| ADMT-02 | SATISFIED | Truth 2. |
| ADMT-03 | SATISFIED | Truth 3. |
| ADMT-04 | SATISFIED | Truth 4. |
| WX-01 | Holds for this phase | `check:pr` green on HEAD. Stays Pending in REQUIREMENTS.md until the milestone audit, by design. |
| WX-02 | Holds | ADR amended (ADR-QD-178 named Unused), CCR-QD-456 at current revisions, BEH-QD-661/662, INV-QD-375/376, traceability; only the reserved ids were used. |
| WX-03 | Holds | No export added or dropped; `spec/overview.md` unchanged, 939 exports. |
| WX-04 | Holds | No `as`, `!`, `any`, `switch`, `fnUntraced`, `async`/`await`, console, clock, `Record<string, unknown>` or `Stryker disable` in the added lines of `packages/`; no TBD/FIXME/XXX. `declare private readonly nominal: never` is none of these. |
| WX-05 | Holds | `65-mutation-close.json` against base: `Admission.ts` 18/18 to 20/20, `Predicate.ts` 280/280 unchanged, `Walk.ts` 260/273 to 260/273 (one killed became timeout, still detected). Nothing fell. |
| WX-06 | Holds | RED on the base for the pins and E7-E9; E10 recorded as green-on-base preserved behaviour; each lock half and each derivation variant shown failing once. |
| WX-07 | Holds | No D-number, plan id or phase number in the added `packages/` lines. The ids cited in comments are INV/ADR ids. No changeset in the phase diff, no release. |

No orphaned requirements.

### Anti-Patterns Found

None in the phase's source or tests. Review items IN-02 and IN-03 are deferred to the milestone audit by decision and are not counted here.

### Human Verification Required

None.

### Gaps Summary

None remaining. The previous gap (the CCR-QD-456 row citing Rev 1.1 / 1.18 / 1.162 / 1.229 and README 1.265) is closed by b56f32c0 as specified: current revisions cited, the review's narrowing recorded, README bumped to 1.266 with a Change History entry, and the revision and traceability checks green.

### Accepted and not counted

The double reads of `policy`, `maxDepth` and `subject` (stated in the comments and INV-QD-375); the type-level-only lock (stated in ADR-QD-172, INV-QD-375 and BEH-QD-661); the pin form differing from the context's "plus toRaiseError" (reason recorded); IN-02 and IN-03; WX rows left Pending in REQUIREMENTS.md.

---

_Verified: 2026-11-20_
_Verifier: Claude (gsd-verifier)_

## Re-verification (2026-11-21, Phase 68 sweep)

**Staleness:** `65: stale, verification 30582032, 24 cited, 7 changed since` (`68-stale.mjs`, run at `1d472db7`).

| Cited file | Changed since `30582032` by |
| --- | --- |
| `.planning/phases/QD-65-only-admit-builds-an-admitted/pin-codes.mjs` | `35597a5c` fix(68-09): the completed phases' record scripts fixed where their records still pass |
| `packages/core/src/Admission.ts` (covered) | `0136e327` fix(68-04): admit reads each field of the question once |
| `packages/core/test/Admission.test.ts` (covered) | `045b00bf` test(68-03): pin admit's single read, a second and a nested unknown key, and two accessor readings |
| `scripts/spec-revise.mjs` | `564818c0` fix(68-01): spec-revise keeps its first argument when --date is not given |
| `spec/README.md` | `eacfeb6c` docs(68-11): CCR-QD-459, the settled items confirmed, and the devtools patch changeset<br>`82f87b4f` (before Phase 68) docs(67): the later bench run's miss deltas are not the dispatch's alone<br>`e5c18e6f` (before Phase 68) fix(67): IN-04 state the dispatch run's base spreads and host load beside the verdict<br>`36036666` (before Phase 68) fix(67): IN-03 move the dispatch measurement into the evidence document<br>`dea2afb4` (before Phase 68) docs(67-06): BEH-QD-166's reasons and INV-QD-379, traced and registered as CCR-QD-458<br>`a25de426` (before Phase 68) fix(66): WR-01, IN-01, IN-04 state the spec text exactly<br>`f62f450d` (before Phase 68) docs(66-04): ADR-QD-170 amended, BEH-QD-666 and INV-QD-377, traced and registered as CCR-QD-457 |
| `spec/overview.md` | `f62f450d` (before Phase 68) docs(66-04): ADR-QD-170 amended, BEH-QD-666 and INV-QD-377, traced and registered as CCR-QD-457 |
| `spec/traceability.md` | `5b603fea` docs(68-10): the amended decisions, behaviours and invariants say what the code holds<br>`faec4fab` docs(68-07): the characterisation's readings, the projection's accessors, the admit pins and the supplied trace<br>`dea2afb4` (before Phase 68) docs(67-06): BEH-QD-166's reasons and INV-QD-379, traced and registered as CCR-QD-458<br>`a25de426` (before Phase 68) fix(66): WR-01, IN-01, IN-04 state the spec text exactly<br>`f62f450d` (before Phase 68) docs(66-04): ADR-QD-170 amended, BEH-QD-666 and INV-QD-377, traced and registered as CCR-QD-457 |

**Trailers on this phase's commits:** 34 `Claude Opus 5.5 <noreply@anthropic.com>`, 2 none.

**Validation record:** no VALIDATION.md.

**Digest:** `covered_digest: "v4:sha256:88da6f09d5bf6a044568a9835f03e996e2606dc8739e4b59b6e999b175c3dc91"` becomes `covered_digest: "v4:sha256:34973f63d1c7418cdd77685e6b01cce1f4629f5f86f42bf878886da2ba77d65a"`, over the same 15 covered files.

### Spot-checks re-run (Phase 68 sweep)

Every row below was run on the tree at `1d472db7`, one command at a time, in the foreground, with nothing else running beside it.

| Behavior | Command run now | Result now | Status |
| -------- | --------------- | ---------- | ------ |
| Admission and LeafMatrix suites | `pnpm exec vitest run packages/core/test/Admission.test.ts packages/core/test/LeafMatrix.test.ts < /dev/null` | exit 0; `Test Files  2 passed (2)`, `Tests  25 passed (25)`; the report's 22 plus the three tests Phase 68 added (E11 to E13: the policy, the bound and the subject each read once) | PASS |
| Construction pins | `node node_modules/tstyche/dist/bin.js --config tstyche.json packages/core/test/WalkEnvironment.tst.ts < /dev/null` | exit 0; `Tests: 6 passed, 6 total`, `Assertions: 23 passed, 23 total`, `Suppressed: 2 matched, 2 total`, the same as the report | PASS |
| Pin codes | `node .planning/phases/QD-65-only-admit-builds-an-admitted/pin-codes.mjs < /dev/null`, as 68-09 left it | exit 0; `TS2673 62: new Admitted("asked", policy, subject, ...` and `TS2741 68: const forged: Admitted<"asked"> = {`, then `pin-codes: 2 diagnostic(s) in WalkEnvironment.tst.ts under TypeScript 6.0.3`; the same two codes at the same two lines as the report, and the script now counts what it read | PASS |
| Traceability | `bash spec/scripts/verify-traceability.sh --strict < /dev/null` | exit 0; `PASS: 21   FAIL: 0   SKIP: 0 (strict: skips count as failures)` | PASS |
| Revision headers | `node scripts/spec-revise.mjs --check < /dev/null` | exit 0; `spec-revise: every Revision matches its newest Change History entry` | PASS |
| Merge gate | `pnpm check:pr < /dev/null` is not run here, so that the one run of the phase is the one that covers the tree its last plan leaves | Answered by the single `check:pr` run in plan 68-15, which reads the whole tree; this verdict stands only while that run is green | ANSWERED BY 68-15 |
| Revision headers at HEAD | the `Revision` line of each file the report names, read from its header on this tree | `spec/behaviors/05-evaluator.md` 1.21, `spec/invariants.md` 1.168, `spec/traceability.md` 1.235, ADR-QD-172 1.4, `spec/README.md` 1.273, all agreeing with their newest Change History entry (the row above). The report's 1.19, 1.163, 1.230, 1.2 and 1.266 were the headers at its commit; later phases moved each, and the CCR-QD-456 row still names the revisions it left, as a record of that change | PASS |
| Traceability at HEAD | the Traceability row above, the same run | `PASS: 21   FAIL: 0   SKIP: 0` | PASS |
| Code unchanged since the bench | `git diff 6c4be029 b56f32c0 -- packages`, the range the report states (`b56f32c0` is the HEAD it names), then the same against `HEAD` | on the report's range: 1 file, `Admission.ts`, 6 changed lines, all in comments, as the report says. Against `HEAD` it is not unchanged: Phase 68 changed `packages/core/src/Admission.ts` in code (see below) | PASS on the report's range; CHANGED BY 68-04 on the current tree, answered below |

The two checks of Truth 2 that read the tree were also re-run on it: `admit(question, "asked")` is still at `Walk.ts` line 878 and `admit(question, "row")` at `Predicate.ts` line 664, `git diff --name-only d1ac1df0 HEAD -- ':(glob)packages/core/src/Walk.ts' ':(glob)packages/core/src/Predicate.ts'` lists 0 files, and `git grep 'new Admitted'` over `packages/*/src` finds the constructor call only in `Admission.ts` and the unrelated `packages/audit/src/CircuitBreaker.ts:484`. `Admission.ts` still holds `declare private readonly nominal: never;`, `private constructor(`, `static admit<Source extends RowSource>(` and `export const admit = Admitted.admit;`.

### Changed covered files read against the truths that cite them (Phase 68 sweep)

- `packages/core/src/Admission.ts` (68-04, `0136e327`): Truths 2, 3 and 5 still hold; Truth 4 is answered below. `admit` now reads `policy`, `maxDepth` and `subject` once, at its top (`const { policy, maxDepth, subject } = question;`), judges the depth on that `policy` against that `maxDepth`, and builds the matcher context from that `subject` and from the question's `resource` and `action`, each read once. The private constructor, the `nominal` member, the static method that names `Admitted` and never `this`, and the context-derived `SUPPLIED` flags are unchanged, so Truths 1 and 2 are untouched. Truth 3's claim that the flags are derived from the one context `admit` builds, and that the question's resource and action are read once, is now stronger: every field is read once. Truth 5's text-vs-code audit has rows the change makes inaccurate as written, the report's "`question.policy` is read twice and `question.maxDepth` is read twice or more, and the comment says so" and the ADR-QD-172 and INV-QD-375 wording that the depth check reads `policy` and `maxDepth` apart no longer describe the code. The texts were amended with it and now agree with the code: the doc comments in `Admission.ts`, ADR-QD-172's 2026-11-21 amendment, BEH-QD-662 (`admit` MUST read each field of the question once) and the enforcement lines of INV-QD-375 and INV-QD-376 (E11 to E13) all say each field is read once.
- `packages/core/test/Admission.test.ts` (68-03, `045b00bf`): Truth 3 still holds. The change adds 55 lines and removes none, and the three tests it adds (E11, E12, E13) are the ones that pin the single read of the policy, the bound and the subject; E1 to E10 and `LeafMatrix.test.ts` are untouched and pass (row 1).
- Cited, not covered, and changed since: `.planning/phases/QD-65-only-admit-builds-an-admitted/pin-codes.mjs` (68-09) reads TypeScript through tstyche's own store instead of a fixed pnpm path and counts its output; it prints the same two codes (row 3), and the report's earlier review item about the script's pnpm path is the reason it changed. `spec/README.md`, `spec/overview.md` and `spec/traceability.md` were moved on by later phases (see the revision row); the Truth 5 audit's `spec/overview.md` finding stands (the phase is package-private, no row needed) and the traceability rows for INV-QD-375/376, ADR-QD-172 and the two test files are present and pass the strict check. `scripts/spec-revise.mjs` (68-01) keeps its first argument when `--date` is not given, which the `--check` row does not use.

### Truth 4 after Phase 68 changed `Admission.ts`

Truth 4 as written (a 3 + 3 bench of the committed source against Phase 65's base, Phase 59's harness and bands, no workload slower beyond its band, "no code token changed after the bench") is not reproduced by the tree: the code of `Admission.ts` changed after that bench, so the sentence "no code token changed" is no longer true of the tree, and the harness Phase 68 ran is not the one Phase 65 used (`scripts/bench/ab.sh` did not exist at the report's commit; it is 68-01's shared harness). The bench of record in Phase 68 measures the tree as it is: its `final` arm is `packages/*/src` at `769bf57c`, and no `packages/*/src` file has changed since (`git diff --name-only 769bf57c HEAD -- ':(glob)packages/**/src/**'` lists 0 files); its base is Phase 68's base `3d66becb`, so it measures Phase 68's changes, not Phase 65's, over the same 35 workloads. Its gate was fixed before the run and is stricter than Phase 65's (no workload more than 5% slower, a geometric mean no worse than +2%, against Phase 65's `max(10%, the base's spread)` band) and it passed: `# slower: 0`, `# geomean_d_min_pct: 0.01`, worst `+4.7%` on `evaluate :: field-heavy — anyOf of 8 under Union`, whose reference spread was 2.1%, so that delta is above its noise and below the 5% limit; its record does not read it as zero cost. The two arms differ in six source files (`Admission.ts`, `DecisionLog.ts`, `SinkCodec.ts`, `UntrustedDecode.ts` and two devtools feed files), and the run does not attribute the delta to one. Two measurements joined are therefore what stands behind ADMT-04 now, and one thing is not measured: no single run compares today's tree with Phase 65's base `d1ac1df0`. Phase 65's own measurement (worst `+1.6%` against a 10% band) is the part taken from the report; this section does not run the bench, which is Phase 68's one run of record.

### Notes on the original report's evidence

Kept whole above; recorded here, not edited.

- The report's `git diff d1ac1df0 HEAD -- packages` and `git diff 6c4be029 HEAD -- packages` use the pathspec `packages`, which selects every file below the directory, so neither is vacuous; both were true of the range the report names and are re-run on that range above.
- The report's Requirements Coverage rows for WX-01 to WX-07 describe Phase 65's own range and are not re-run here. WX-05's `Admission.ts` row (18 of 18 to 20 of 20) is joined by Phase 68's own close: `Admission.ts` 20 of 20 killed or detected at both the base and the close of that phase, with no survivor.
- The report's review items IN-02 (the constructor pin's "positive control" is not a twin of the call it guards) and IN-03 (`pin-codes.mjs` is tied to one pnpm store path and prints nothing on success) were "deferred to the milestone audit". Phase 68 settled both: the spec texts now say the `@ts-expect-error` pins are read by the gate as refused whatever the code and that only the literal pin has a positive control of its own, and `pin-codes.mjs` no longer depends on a store path and counts what it read. `WalkEnvironment.tst.ts` itself is unchanged since the report.
- The report records no validation file; none exists.

**Verdict:** passed
