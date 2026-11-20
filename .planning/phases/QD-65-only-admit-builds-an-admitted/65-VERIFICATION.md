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
covered_digest: "v4:sha256:88da6f09d5bf6a044568a9835f03e996e2606dc8739e4b59b6e999b175c3dc91"
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
