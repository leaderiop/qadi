---
phase: QD-68-hygiene-and-recorded-close-outs
verified: 2026-11-21T20:10:00Z
status: passed
score: 7/7 must-haves verified
covered_files:
  - ".changeset/devtools-capacity-change-reads.md"
  - ".planning/phases/QD-68-hygiene-and-recorded-close-outs/68-01-PLAN.md"
  - ".planning/phases/QD-68-hygiene-and-recorded-close-outs/68-01-SUMMARY.md"
  - ".planning/phases/QD-68-hygiene-and-recorded-close-outs/68-02-PLAN.md"
  - ".planning/phases/QD-68-hygiene-and-recorded-close-outs/68-02-SUMMARY.md"
  - ".planning/phases/QD-68-hygiene-and-recorded-close-outs/68-03-PLAN.md"
  - ".planning/phases/QD-68-hygiene-and-recorded-close-outs/68-03-SUMMARY.md"
  - ".planning/phases/QD-68-hygiene-and-recorded-close-outs/68-04-PLAN.md"
  - ".planning/phases/QD-68-hygiene-and-recorded-close-outs/68-04-SUMMARY.md"
  - ".planning/phases/QD-68-hygiene-and-recorded-close-outs/68-05-PLAN.md"
  - ".planning/phases/QD-68-hygiene-and-recorded-close-outs/68-05-SUMMARY.md"
  - ".planning/phases/QD-68-hygiene-and-recorded-close-outs/68-06-PLAN.md"
  - ".planning/phases/QD-68-hygiene-and-recorded-close-outs/68-06-SUMMARY.md"
  - ".planning/phases/QD-68-hygiene-and-recorded-close-outs/68-07-PLAN.md"
  - ".planning/phases/QD-68-hygiene-and-recorded-close-outs/68-07-SUMMARY.md"
  - ".planning/phases/QD-68-hygiene-and-recorded-close-outs/68-08-PLAN.md"
  - ".planning/phases/QD-68-hygiene-and-recorded-close-outs/68-08-SUMMARY.md"
  - ".planning/phases/QD-68-hygiene-and-recorded-close-outs/68-09-PLAN.md"
  - ".planning/phases/QD-68-hygiene-and-recorded-close-outs/68-09-SUMMARY.md"
  - ".planning/phases/QD-68-hygiene-and-recorded-close-outs/68-10-PLAN.md"
  - ".planning/phases/QD-68-hygiene-and-recorded-close-outs/68-10-SUMMARY.md"
  - ".planning/phases/QD-68-hygiene-and-recorded-close-outs/68-11-PLAN.md"
  - ".planning/phases/QD-68-hygiene-and-recorded-close-outs/68-11-SUMMARY.md"
  - ".planning/phases/QD-68-hygiene-and-recorded-close-outs/68-12-PLAN.md"
  - ".planning/phases/QD-68-hygiene-and-recorded-close-outs/68-12-SUMMARY.md"
  - ".planning/phases/QD-68-hygiene-and-recorded-close-outs/68-13-PLAN.md"
  - ".planning/phases/QD-68-hygiene-and-recorded-close-outs/68-13-SUMMARY.md"
  - ".planning/phases/QD-68-hygiene-and-recorded-close-outs/68-14-PLAN.md"
  - ".planning/phases/QD-68-hygiene-and-recorded-close-outs/68-14-SUMMARY.md"
  - ".planning/phases/QD-68-hygiene-and-recorded-close-outs/68-15-PLAN.md"
  - ".planning/phases/QD-68-hygiene-and-recorded-close-outs/68-15-SUMMARY.md"
  - "packages/core/src/Admission.ts"
  - "packages/core/src/DecisionLog.ts"
  - "packages/core/src/SinkCodec.ts"
  - "packages/core/src/UntrustedDecode.ts"
  - "packages/core/test/Admission.test.ts"
  - "packages/devtools/src/model/DiagnosticsFeed.ts"
  - "packages/devtools/src/model/TimelineFeed.ts"
  - "packages/devtools/test/model/TimelineFeed.test.ts"
  - "scripts/bench/ab.sh"
  - "scripts/bench/analyze.mjs"
  - "scripts/check-house-style.mjs"
  - "scripts/check-package-install.mjs"
  - "scripts/run-tstyche.mjs"
  - "scripts/spec-revise.mjs"
covered_digest: "v4:sha256:1616a9cad495ab09ae99a6b8d165f00fcb1b1da61a54623744ca008bbeab6932"
behavior_unverified: 0
overrides_applied: 0
re_verification: null
---

# Phase QD-68: Hygiene and recorded close-outs Verification Report

**Phase Goal:** The v1.6 audit's remaining wording and record items are fixed or recorded with evidence. The milestone's stale verification is swept. Every item still open from phases 62 to 67 (OI-01..OI-29) is fixed with its evidence or recorded with its reason.
**Verified:** 2026-11-21
**Status:** passed
**Re-verification:** No, initial verification
**Phase base:** `3d66becb`. HEAD `e07ea925` on `arch-wave-12`.

Every check below was run against the tree with my own commands. The summaries were read for the deviations and
not taken as evidence.

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
| - | ----- | ------ | -------- |
| 1 | Each of OI-01..OI-29 is fixed (with a commit) or recorded (with a reason), exactly once | VERIFIED | 68-15's table names 25 fixes and 4 records. All 14 distinct commits it names are ancestors of HEAD and descendants of the base (`git merge-base --is-ancestor`). Each fix was read in the tree, see the OI spot-checks below. `oi-map-check.mjs` is not committed, so the check was by hand. OI-26..OI-29 are recorded in the CCR-QD-459 row (`spec/README.md:396`). |
| 2 | OI-09: a throwing listener on the capacity publish no longer stops the read; TF26..TF29 pass; the dock characterisation files are unchanged; `rethrow-gate` passes on six texts; one `@qadi/devtools` patch changeset | VERIFIED | `TimelineFeed.ts:178-187`: `try { push(); } finally { readSource(next.source); }` in the resized branch. `vitest run TimelineFeed.test.ts -t "TF2[6-9]"`: 4 passed. `git diff --name-only 3d66becb..HEAD -- ':(glob)packages/**/*.characterisation.test.tsx'` prints nothing, and the three files exist. `rethrow-gate.mjs`, extracted from 68-11's plan (SHA-256 `ea216115...f82a`, the plan's own hash): `8 statement(s) in 6 file(s) carry the replacement`. The only changeset added since the base is `.changeset/devtools-capacity-change-reads.md`, `"@qadi/devtools": patch`. |
| 3 | OI-10 and HYGN-01: `admit` reads each field once; E11..E13 pass; bench verdict pass (35 workloads, 0 slower, geomean +0.01%); no source, bench or `package.json` change since the bench; mutation close >= base for every file | VERIFIED | `Admission.ts:114`: `const { policy, maxDepth, subject } = question;` and nothing else reads those three. `vitest run Admission.test.ts -t "E1[1-3] "`: 3 passed. `68-BENCH.md` and `bench/final/analysis.tsv` read `# workloads: 35`, `# slower: 0`, `# geomean_d_min_pct: 0.01`, `# gate: pass`, `verdict: pass`, and 35 `ok` rows. `git diff --stat 17dfa4ef..HEAD` and `769bf57c..HEAD` over `:(glob)packages/*/src/**`, `:(glob)packages/*/bench/**` and `package.json` are empty. Not vacuous: the glob matches `packages/core/bench/*.bench.ts`, and `3d66becb..17dfa4ef` over the same pathspec lists the six edited source files. Mutation, computed from the two JSON files: DiagnosticsFeed 72/73 to 73/73, TimelineFeed 49/49 to 50/50, Admission 20/20 to 20/20, DecisionLog 66/66 to 66/66, SinkCodec 123/127 to 123/127, UntrustedDecode 44/46 to 44/46. No file fell. Ignored counts are equal for every file. The close was measured at `10880abb`, and source is unchanged since. The three over-width lines of HYGN-01 are wrapped in `d9e2e96b` (steps test, `DecisionLog.ts`, `SinkCodec.ts`). |
| 4 | HYGN-02..05: stale ids and "stamp" wording gone, ADR-QD-174 re-wrapped, ADR-QD-173 amended, 939 exports, `61-SETTLED-ITEMS.md` added and nothing else in the Phase 61 archive changed | VERIFIED | `StoredEnvelope.test.ts` holds no `STOR-` or `D-NN` id (the two grep hits are `ADR-QD-171` and `INV-QD-039`, real spec ids). `Source.test.ts` holds no "stamp". `68-compare.mjs 3d66becb` reports `same` for `StoredEnvelope.test.ts`, `Source.test.ts` and `FloatingEffectPins.tst.ts`. `DecisionCache.test.ts` "differs" on the removed `sides`/`oneSided` identifiers only, which is OI-14 and is stated; the diff is four comment edits, one title, and that deletion. ADR-QD-174: no line over 119 columns outside the Document Control table (the base had three at 189/168/129). ADR-QD-173 Rev 1.2 carries the amendment "the port cards stay package-private" and says no export is added. `pnpm spec:api`: `939 export(s) documented across 9 package(s)`. `git diff --name-status` over the Phase 61 archive: one `A`, `61-SETTLED-ITEMS.md`. Its second claim (`d0ca3df6` comments only in `Simulator.test.tsx`) was re-run through `68-compare.mjs`: `same`. |
| 5 | HYGN-06: `68-stale.mjs` ends `redo: none`; each of 62..67 keeps its report whole with appended re-verification sections, the latest "after the code review's fixes"; GSD reads `passed` for each | VERIFIED | `68-stale.mjs` run: all six `current ... 0 changed since`, `redo: none`. `git diff 3d66becb..HEAD` of each `NN-VERIFICATION.md` removes exactly one line, the `covered_digest`; everything else is added. Each file ends with `## Re-verification (2026-11-21, after the code review's fixes)` and `**Verdict:** passed`. `gsd-tools query verification.status` prints `passed` for all six phase directories. Since the last re-verification commit the only commits are those six reports. |
| 6 | The six gates pass | VERIFIED | `check-house-style`: `560 file(s) clean (3 declared switch(es), 66 type-test file(s))`. `spec-revise --check`: `every Revision matches its newest Change History entry`. `verify-traceability.sh --strict`: `PASS: 21 FAIL: 0 SKIP: 0`. `check-api-surface`: 939. `check-dod-table`: `25 step(s) match pnpm check, 151 reference(s) resolve`. `check-devtools-claims`: `8 claim(s) registered across 6 file(s)`. |
| 7 | Records: CCR-QD-459 cites current revisions; reserved ids only; HYGN-01..07 ticked, all WX Pending; every commit carries the Opus trailer; nothing released, tagged or pushed | VERIFIED | CCR-QD-459 row (`spec/README.md:396`) cites ADR-QD-033 Rev 1.4, 172 Rev 1.4, 173 Rev 1.2, 174 Rev 1.3, 175 Rev 1.5, 177 Rev 1.1, `05-evaluator` Rev 1.21, `28-devtools-screens` Rev 1.38, `invariants` Rev 1.168, `traceability` Rev 1.236 and `README` Rev 1.274. I read each document's own Revision line and all eleven equal it. New ids: highest ADR 181, BEH 676, INV 381 and CCR 459 appear only as ARCH-115, CCR-QD-459 and the row's "Unused: ADR-QD-181, BEH-QD-676-680, INV-QD-381-382". These sit inside 68-CONTEXT's reserved set. `REQUIREMENTS.md`: HYGN-01..07 `[x]` and `Complete`; WX-01..07 `[ ]` and `Pending`, with no WX line in the phase's diff. All 71 commits in `3d66becb..HEAD` carry exactly `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. `git rev-parse arch-wave-12@{upstream}`: `no upstream configured`. No tag was created after 2026-11-13 (latest `@qadi/*@0.12.0`). `package.json`, `pnpm-lock.yaml` and `pnpm-workspace.yaml` have no diff since the base. |

**Score:** 7/7 truths verified (0 present, behavior-unverified).

The behavior-dependent truths (the cancellation and ordering invariant of OI-09, the read-once invariant of OI-10) are
each backed by a named test I ran: TF26..TF29 and E11..E13.

### OI spot-checks in the tree (a sample over every class, not the summary's word)

| OI | What I found |
| -- | ------------ |
| 01 | `FloatingEffectPins.tst.ts:27`: "The two blocks that a pass skips each carry the text their skip uses ... the third runs in both passes and carries none". ADR-QD-175 Rev 1.5 names "all three" blocks. |
| 02 | `DiagnosticsFeed.ts:100-102`: "the `Stopped` is held even when a listener throws on that publish too". |
| 03 | Subsumed by OI-09's fix. `TimelineFeed.ts` base lines 81-83 (118/114/114 columns) no longer exist. The six texts pass `rethrow-gate`. |
| 04 | `UntrustedDecode.ts:142-144`: "for a schema of more than one member those of the member the input's own enumerable `_tag` selects". |
| 05, 06, 07 | INV-QD-377 and INV-QD-375 (Rev 1.167, 1.168) and BEH-QD-661 now say the codes are "read by the phase-record script `pin-codes.mjs`, and only the literal pin has a positive control". The INV-QD-364 trace row now says `supplied` "is read, by the row for the environment's row source, from the matcher context". |
| 08, 14 | `DecisionCache.test.ts`: title now "rejects a negative capacity rather than retaining nothing"; `sides` and `oneSided` are gone. |
| 11, 12 | TF26..TF29 and the `ExternalStore.test.ts` test throwing a `Proxy` (`const hostile = new Proxy(`, asserted by identity). |
| 13 | `UntrustedSeams.test.ts` H6 (two unknown keys) and H7 (nested unknown key). |
| 15, 16, 17 | `run-tstyche.mjs:64` reads `process.argv.slice(2)`. `check-house-style.mjs:2294` reads `readJsonc("tstyche.json")` and `:2352` has a `listed.has` guard. `CHARACTERISATION` is exported once, from `scripts/lib/type-tests.mjs:9`, and imported by `check-house-style.mjs:89`. |
| 18 | `spec-revise.mjs:70-72`: `dateFlag === -1 \|\| index !== dateFlag + 1`. |
| 19, 20, 21 | `check-package-install.mjs`: `CHILD_TIMEOUT_MS` on every `execFileSync` (lines 200, 221, 235, 356, 443, 832, 883, 903), `LIVE_TURNS = 200`, a message naming "typescript@${version}'s unstable API". The review's WR-01..WR-03 fixes (`5d44982d`, `8c3375fb`, `7aa1150b`) came after and were re-reviewed with 0 critical and 0 warnings. |
| 22 | `pin-codes.mjs` counts diagnostics and its header says a run that read none says so. |
| 23, 25 | `66-mutation.mjs compare` still passes on the committed record (`UntrustedDecode.ts ... 46/48`, "no touched file's score fell"). `67-mutation.mjs --self-test`: `17 passed`; `compare` passes. |
| 24 | `scripts/bench/ab.sh` alternates the arm order by round (odd rounds head first); the two earlier `bench/` directories have no diff since the base. |
| 26..29 | Recorded in the CCR-QD-459 row; no history rewritten (the base was not touched, the first phase commit sits on top of it). |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
| -------- | ------- | ------ | ------ |
| Capacity-change throw stops no read | `pnpm exec vitest run packages/devtools/test/model/TimelineFeed.test.ts -t "TF2[6-9]"` | 4 passed, 25 skipped | PASS |
| `admit` reads each field once | `pnpm exec vitest run packages/core/test/Admission.test.ts -t "E1[1-3] "` | 3 passed, 17 skipped | PASS |
| Six texts carry the residue | `node rethrow-gate.mjs <six files>` | `8 statement(s) in 6 file(s)` | PASS |
| 66's record script still compares | `node 66-mutation.mjs compare` | no score fell | PASS |
| 67's scorer self-test | `node 67-mutation.mjs --self-test` | 17 passed | PASS |

Not run, as instructed: `pnpm check:pr` (green twice, last after the review fixes), Stryker and the bench. Their
recorded results were read from the committed files and recomputed where a number could be recomputed (mutation scores, the
bench `#` lines).

### Requirements Coverage

| Requirement | Status | Evidence |
| ----------- | ------ | -------- |
| HYGN-01 | SATISFIED | Truth 3 |
| HYGN-02 | SATISFIED | Truth 4 |
| HYGN-03 | SATISFIED | Truth 4 (ADR-QD-174 Rev 1.3, one bump) |
| HYGN-04 | SATISFIED | Truth 4 (ADR-QD-173 Rev 1.2; 939 exports, so no export added) |
| HYGN-05 | SATISFIED | Truth 4 |
| HYGN-06 | SATISFIED | Truth 5 |
| HYGN-07 | SATISFIED | Truths 1 to 3 |
| WX-01..07 | Pending by decision | Cross-cutting rules, ticked by the milestone audit. The evidence they ask for is present: `check:pr` ran green, 939 and 524 exports unchanged, a mutation close with no drop, 71 commits with a trailer, nothing released. |

No requirement mapped to Phase 68 in `REQUIREMENTS.md` is missing from the plans (no orphans).

### Anti-Patterns Found

No `TBD`, `FIXME` or `XXX` marker was added in the source files the phase edited (a `git diff` over the six source files shows
only comment, wrap and the two behaviour edits). The two behaviour edits (`TimelineFeed.ts`, `Admission.ts`) were each made
after a RED test on the unchanged tree (`68-RED-EVIDENCE.md`: `red-check: all passed`, six RED tests and eight plants).

### Known deviations, all accepted

- Owner reorder (68-06..68-09 before 68-05): a commit order the original close scan rejects; `close-scan-reordered.txt` passes 13 checks and the owner decided it.
- 68-06's identifier grep narrowed (`917adb23`), no file change.
- 68-12 corrected-copy close scan and mutation-base diff: the checks were not weakened per its summary, and the numbers above are my own recomputation.
- 68-04 narrowed U31's guard to `Malformed` so it typechecks (`8016587b`).

### Notes (not gaps)

1. The task text says ADR-QD-174 has "no line over 119 columns". Strictly, line 13, the Document Control "Change History"
   table row, is 458 columns (315 at the base). 68-10 records this: the bound is 119 columns outside the Document Control
   block, and the table rows of every ADR are single lines. HYGN-03 names lines 73, 75 and 94, which are fixed. I read this
   as met.
2. The code review's four Info items (IN-01..IN-04: odd round count, a failing bench gate exits 0, `68-stale.mjs` rename and
   path-root blind spots, text-comparing self-tests) are carried forward and record-only. IN-03 is the one that touches my
   checks, so I re-ran the staleness question differently: the only commits since the last re-verification change the six
   reports and nothing they cite. This is not a gap.
3. `oi-map-check.mjs` is scratch and not in the tree, so the OI map was checked by hand (commits exist, descend from the
   base, subjects match, and the fixes are in the files).
4. `.planning/config.json` is modified in the working tree and was already modified before the phase; it is not part of it.

### Human Verification Required

None.

### Gaps Summary

None. Every must-have resolved to VERIFIED on commands I ran against the real tree.

---

_Verified: 2026-11-21_
_Verifier: Claude (gsd-verifier)_
