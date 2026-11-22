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
covered_digest: "v4:sha256:1b4ae721cae328a194ccd47a635b4a79e83c2d5007a50c082a17568f8ca65a40"
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

## Re-verification (2026-11-21, after Phase 68.1)

**Staleness:** `68: stale, verification 96e396a1, 52 cited, 5 changed since` (`68.1-stale.mjs`, run at `8af05394`).

| Cited file | Changed since `96e396a1` by |
| --- | --- |
| `package.json` | `ecb4ed90` fix(68.1-02): analyze.mjs exits 1 on a failed gate, and pnpm check runs its self-test |
| `scripts/bench/ab.sh` (covered) | `c876dc54` fix(68.1-02): ab.sh refuses an odd round count |
| `scripts/bench/analyze.mjs` (covered) | `327d93ee` fix(68.1-02): analyze.mjs exits 2 on any input it cannot analyze<br>`ecb4ed90` fix(68.1-02): analyze.mjs exits 1 on a failed gate, and pnpm check runs its self-test |
| `scripts/check-package-install.mjs` (covered) | `cc58b8e6` fix(68.1-04): the probe guard's parse runs in a child under the gate's timeout |
| `spec/README.md` | `a8b36092` docs(68.1-05): ADR-QD-033 amended and CCR-QD-460 recorded |

**Trailers on this phase's commits:** 75 `Claude Opus 5.5 <noreply@anthropic.com>`.

**Validation record:** no VALIDATION.md.

**Digest:** `covered_digest: "v4:sha256:1616a9cad495ab09ae99a6b8d165f00fcb1b1da61a54623744ca008bbeab6932"` becomes `covered_digest: "v4:sha256:899612991214c021e5abd4157ceb92352b2846829a60ae74986263690d21a260"`, over the same 45 covered files.

**Staleness by `68.1-stale.mjs`:** `68: stale, verification 96e396a1, 52 cited, 5 changed since` (run at `8af05394`).

### Spot-checks re-run (Re-verification (2026-11-21, after Phase 68.1))

Every row was run on a tree whose tracked files outside the planning directory are those of `8af05394`, one command at a time, in the foreground, with stdin closed and nothing else running beside it. The spec-revise, traceability, DoD-table, analyzer self-test, bench-reproduction and `--print-order` results are shared with the other re-verifications of this phase and were taken once at `c3d8553a`; no tracked file outside the planning directory differs between that head and `8af05394` (`git diff --quiet c3d8553a 8af05394 -- . ':(exclude).planning'` is silent). The gate-14 row reads the one run of Plan 68.1-04, taken at `cc58b8e6`; nothing gate 14 reads has changed since (`git diff --quiet cc58b8e6 HEAD -- packages scripts package.json pnpm-lock.yaml` is silent). No source or test file changed in this phase (`git diff --name-only 0e3f3438 HEAD -- packages` lists 0 files), so the report's vitest, mutation and bench-run rows were not run again; Phase 68's `bench/final` is left as recorded and is read below only by re-analysing it.

| Behaviour | Command run now | Result now | Status |
| --------- | --------------- | ---------- | ------ |
| What the phase changed in the package manifest | `git diff -U0 0e3f3438 HEAD -- package.json` | two scripts-table changes and nothing else: `bench:self-test` is added (`node scripts/bench/analyze.mjs --self-test`) and `check` gains ` && pnpm bench:self-test` at its end; every script the report cites and every dependency field is unchanged | PASS |
| What the phase changed in the spec register, and the revisions | `git diff -U0 0e3f3438 HEAD -- spec/README.md`, and `node scripts/spec-revise.mjs --check < /dev/null` (shared) | the Revision header (1.274 to 1.275), the Change History cell (a 1.275 entry in front of the 1.274 one) and one added row, CCR-QD-460, at line 397; no row is edited or removed, so the CCR-QD-459 row is still at line 396; `spec-revise` exit 0, `spec-revise: every Revision matches its newest Change History entry` | PASS |
| Phase 68's gate-14 truths read against the gate as it now stands | the one run of `node scripts/check-package-install.mjs < /dev/null` (Plan 68.1-04, head `cc58b8e6`: exit 0, 15 s), and `git diff --quiet cc58b8e6 HEAD -- packages scripts package.json pnpm-lock.yaml` | last line `package-install: 9 package(s) pack, resolve and authorize (524 runtime export(s))`, the count the report's Truth 6 cites; nothing gate 14 reads changed since that head | PASS |
| Every child of gate 14 still runs under a timeout | `grep -n "CHILD_TIMEOUT_MS\|LIVE_TURNS = \|unstable API" scripts/check-package-install.mjs` | `CHILD_TIMEOUT_MS` on the nine `execFileSync` calls, at lines 202, 223, 237, 358, 445, 834, 885, 905 and the new 922; `LIVE_TURNS = 200` at 644; the message naming `typescript@${version}'s unstable API` at line 930 | PASS |
| `ab.sh` alternates the arm order by round, and refuses an odd count | `bash scripts/bench/ab.sh --print-order 4 final base` and `--print-order 3 final base` (shared) | the first prints `final-1 base-1 base-2 final-2 final-3 base-3 base-4 final-4` (odd rounds head first); the second exits 2 with `<rounds> must be even` | PASS |
| The analyzer, self-tested and on Phase 68's own record | `node scripts/bench/analyze.mjs --self-test < /dev/null` (shared), and Phase 68's `bench/final` copied to a scratch directory and analysed with the committed `workloads.txt`, reference `base`, then `cmp` with the committed `analysis.tsv` (shared) | `self-test: 25 passed`; the analysis exits 0 with `# workloads: 35`, `# slower: 0`, `# geomean_d_min_pct: 0.01`, `# gate: pass`, and `cmp` is silent | PASS |
| The merge gate's step list the report's Truth 6 counts | `node scripts/check-dod-table.mjs < /dev/null` (shared) | `dod-table: 26 step(s) match pnpm check, 153 reference(s) resolve` | PASS |
| The report's other gate runs that read scripts | `node scripts/check-house-style.mjs < /dev/null` and `node scripts/check-devtools-claims.mjs < /dev/null` | `house-style: 560 file(s) clean (3 declared switch(es), 66 type-test file(s))`; `devtools-claims: 8 claim(s) registered across 6 file(s)` | PASS |
| Traceability | `bash spec/scripts/verify-traceability.sh --strict < /dev/null` (shared) | exit 0; `PASS: 21   FAIL: 0   SKIP: 0 (strict: skips count as failures)` | PASS |

### Changed cited files read against the truths that cite them (Re-verification (2026-11-21, after Phase 68.1))

- `package.json` (68.1-02, `ecb4ed90`): the report cites the manifest in Truth 3 (`package.json` has no change between the bench and the head the report was written at) and Truth 7 (`package.json`, the lockfile and the workspace file have no diff since the base). Both are claims about the ranges they name, which end at the head that report was written at, and they were true of those ranges. The commit adds the `bench:self-test` script and appends it to `check`. It changes no dependency, no version and no script the report's truths read, so the bench of record, which was taken on source this phase did not touch, still describes the code it measured. Truth 7's "nothing released" is unaffected: the phase adds no changeset, tag or version.
- `scripts/bench/ab.sh` (covered; 68.1-02, `c876dc54`): the report cites it in OI-24 (the arm order alternates by round, odd rounds head first) and in Truth 3's bench of record. The commit makes `rounds_ok` refuse an odd count and adds the usage line and the header text saying why; the order is unchanged, so OI-24 holds (row 5). Phase 68's own bench of record took 3 rounds, the count the script now refuses. That record is left as recorded: the script change does not alter what the record measured, and the verdict, `# gate: pass`, is reproduced byte for byte by the current analyzer (row 6).
- `scripts/bench/analyze.mjs` (covered; 68.1-02, `327d93ee` and `ecb4ed90`): the report cites it in Truth 3, through `68-BENCH.md` and `analysis.tsv` (`# gate: pass`, 35 `ok` rows). The commits change the exit status only: 1 on a failed gate, 2 on any input it cannot analyze, and a self-test that runs the file end to end. Its analysis of Phase 68's `bench/final` is byte-identical to the committed `analysis.tsv` and exits 0, so every number Truth 3 reads holds.
- `scripts/check-package-install.mjs` (covered; 68.1-04, `cc58b8e6`): the report cites it in OI-19, OI-20 and OI-21 (a `CHILD_TIMEOUT_MS` on every `execFileSync`, `LIVE_TURNS = 200`, the message naming the unstable API) and, through its gate-14 runs, in Truth 6. The commit moves the probe guard's parse into a child run under the same timeout (`scripts/lib/probe-guard-parse.mjs`), so every child now has the bound, which strengthens OI-19; the line numbers the report gives are two lines higher now (row 4) and the message is the same text at line 930. Plan 68.1-04 showed the guard's answers identical to the base's on four sandboxes and a planted load failure, and the one gate-14 run reads 524 runtime exports as before (row 3). The bound is on the child: the TypeScript server the child starts is not killed with it, and the file's header says so.
- `spec/README.md` (68.1-05, `a8b36092`): the report cites the CCR-QD-459 row at line 396 (Truths 1 and 7) and its revision pointers. The row is unedited and still at line 396. Its pointers (ADR-QD-033 Rev 1.4, the register's Rev 1.274) were the current revisions when the report was written, and are not now: the commit moves the register to 1.275, ADR-QD-033 is amended to 1.5, and adds the CCR-QD-460 row, which carries the later revisions. The row itself is unedited, so Truth 7 holds as a claim about what the row cited at the head the report was written at. The digest changes because this file is covered, and no other covered file changed.

**Verdict:** passed

## Re-verification (2026-11-22, after the 68.1 code-review fixes)

**Staleness:** `68: stale, verification 97a2ca68, 56 cited, 2 changed since` (`68.1-stale.mjs`, run at `3c39c3c0`).

| Cited file | Changed since `97a2ca68` by |
| --- | --- |
| `scripts/bench/ab.sh` (covered) | `70574a33` fix(68.1): WR-06 ab.sh refuses a round count below 4 in both modes |
| `spec/README.md` | `79a685b4` docs(68.1): WR-02 WR-03 scope CCR-QD-460's odd-count and hang claims to what was shown |

**Trailers on this phase's commits:** 75 `Claude Opus 5.5 <noreply@anthropic.com>`.

**Validation record:** no VALIDATION.md.

**Digest:** `covered_digest: "v4:sha256:899612991214c021e5abd4157ceb92352b2846829a60ae74986263690d21a260"` becomes `covered_digest: "v4:sha256:5814f8faac671ad442cb38c03fa1a686dda5c5d56a16845bed7fd31a406786dd"`, over the same 45 covered files.

**Staleness by `68.1-stale.mjs`:** `68: stale, verification 97a2ca68, 56 cited, 2 changed since` (run at `3c39c3c0`).

### Spot-checks re-run (Re-verification (2026-11-22, after the 68.1 code-review fixes))

Every row was run on the tree at `3c39c3c0`, one command at a time, in the foreground, with stdin closed. The spec-revise, traceability, DoD-table, analyzer self-test, bench-reproduction and `--print-order` results are shared with the Phase 62 to 67 sections of this re-verification: each was taken once at `ae42c2b2`, in a fresh set after the code-review fixes (the earlier set, taken at `c3d8553a`, is not reused because `scripts/bench/ab.sh` and `spec/` changed), and no tracked file outside the planning directory differs between that head and `3c39c3c0`. Gate 14 was not run again: the gate-14 row reads the one run of Plan 68.1-04, taken at `cc58b8e6`, and shows that nothing gate 14 reads has changed since. No source or test file changed (`git diff --name-only 0e3f3438 HEAD -- packages` lists 0 files), so the report's vitest, mutation and bench-run rows were not run again; Phase 68's `bench/final` and `68-BENCH.md` are left as recorded (`git diff --quiet 0e3f3438 HEAD` over them is silent) and are read below only by re-analysing the former.

| Behaviour | Command run now | Result now | Status |
| --------- | --------------- | ---------- | ------ |
| `ab.sh` alternates the arm order by round | `bash scripts/bench/ab.sh --print-order 4 final base` and `--print-order 6 final base` (shared) | exit 0; at 4, `final-1 base-1 base-2 final-2 final-3 base-3 base-4 final-4` (odd rounds head first); at 6 the same pattern continues (`final-5 base-5 base-6 final-6`), so OI-24's order is as the previous section read it | PASS |
| `ab.sh` refuses an odd count, and now one below 4 | `bash scripts/bench/ab.sh --print-order 3 final base` and `--print-order 2 final base` (shared) | both exit 2 and run nothing; the usage text now ends `<rounds> must be even and at least 4: odd rounds run the head arm first and even rounds the patched arm, so only an even count runs each arm first equally often, and analyze.mjs refuses fewer than 3 rounds`, where the previous section quoted `<rounds> must be even` | PASS |
| What the code-review fixes changed in the harness since the previous section | `git diff -U0 97a2ca68 HEAD -- scripts/bench/ab.sh` | four hunks, at lines 10 (header comment: a count below 4 is refused in both modes), 20 (the exit-code comment), 28 (the usage text above) and 31 (the `rounds_ok` pattern, which gains `2`); the arm order is outside the hunks | PASS |
| The analyzer is unchanged, self-tested, and on Phase 68's own record | `git diff --quiet 97a2ca68 HEAD -- scripts/bench/analyze.mjs`; `node scripts/bench/analyze.mjs --self-test < /dev/null` (shared); Phase 68's `bench/final` copied to a scratch directory and analysed with the committed `workloads.txt`, reference `base`, then `cmp` with the committed `analysis.tsv` (shared) | the diff is silent (exit 0); `self-test: 25 passed`; the analysis exits 0 with `# max_slowdown_pct: 5.0`, `# max_geomean_pct: 2.0`, worst `4.7` and `# gate: pass`, and `cmp` is silent, so the file is byte-identical | PASS |
| Phase 68's gate-14 truths read against the gate as it now stands | the one run of `node scripts/check-package-install.mjs < /dev/null` (Plan 68.1-04, head `cc58b8e6`: exit 0, 15 s), and `git diff --quiet cc58b8e6 HEAD -- packages scripts/check-package-install.mjs scripts/lib package.json pnpm-lock.yaml 'tsconfig*.json'` now | last line `package-install: 9 package(s) pack, resolve and authorize (524 runtime export(s))`, the count the report's Truth 6 cites; the diff is silent (exit 0), so none of what gate 14 reads changed after that run; the gate and its library are also unchanged since the previous section (`git diff --quiet 97a2ca68 HEAD -- scripts/check-package-install.mjs scripts/lib package.json` is silent) | PASS |
| The merge gate's step list the report's Truth 6 counts | `node scripts/check-dod-table.mjs < /dev/null` (shared) | `dod-table: 26 step(s) match pnpm check, 153 reference(s) resolve` | PASS |
| What the phase and its fixes changed in the spec register, and the revisions | `git diff -U0 0e3f3438 HEAD -- spec/README.md`, and `node scripts/spec-revise.mjs --check < /dev/null` (shared) | 3 insertions and 2 deletions: the Revision header (1.274 to 1.276), the Change History cell (the 1.276 and 1.275 entries in front) and one added row, CCR-QD-460, at line 397; no existing row is removed or edited, so the CCR-QD-459 row is still at line 396; `spec-revise` exit 0, `spec-revise: every Revision matches its newest Change History entry` | PASS |
| Traceability | `bash spec/scripts/verify-traceability.sh --strict < /dev/null` (shared) | exit 0; `PASS: 21   FAIL: 0   SKIP: 0 (strict: skips count as failures)` | PASS |

### Changed cited files read against the truths that cite them (Re-verification (2026-11-22, after the 68.1 code-review fixes))

- `scripts/bench/ab.sh` (covered; `70574a33`): the report cites it in OI-24 (the arm order alternates by round, odd rounds head first) and in Truth 3's bench of record. The commit makes `rounds_ok` refuse a count below 4 as well as an odd one, and changes the usage text, the header comment and the exit-code comment to say so; the order is outside the changed lines, so OI-24 holds (rows 1 and 3). The previous section's quotation of the usage text (`<rounds> must be even`) no longer holds as worded: the text now reads `<rounds> must be even and at least 4: …` (row 2). Phase 68's own bench of record took 3 rounds, a count the script refuses (it is odd, and the previous section's script already refused it). That record is left as recorded: the script change does not alter what the record measured, and its verdict, `# gate: pass`, is reproduced byte for byte by the unchanged analyzer (row 4).
- `spec/README.md` (`79a685b4`): the report cites the CCR-QD-459 row at line 396 (Truths 1 and 7) and its revision pointers. The row is unedited and still at line 396. Its pointers (ADR-QD-033 Rev 1.4, the register's Rev 1.274) were the current revisions when the report was written, and are not now: the commit moves the register to 1.276, the decision is at 1.6, and the CCR-QD-460 row, which carries the later revisions, is rewritten to scope two claims (the odd-round-count claim to Phase 68's bench, the hang evidence to a blocked parser call in the child, not a stopped TypeScript server). The row the report cites is unedited, so Truth 7 holds as a claim about what the row cited at the head the report was written at; OI-19 (a `CHILD_TIMEOUT_MS` on every `execFileSync`) is a reading of the gate's source, which did not change (row 5). The digest of the report's covered files is replaced because `scripts/bench/ab.sh` is covered; `spec/README.md` is not, and no other covered file changed.

**Verdict:** passed

## Re-verification (2026-11-22, after the re-audit's inline fixes)

**Staleness:** `68: stale, verification 756e5a79, 56 cited, 2 changed since` (`68.1-stale.mjs`, run at `334b014b`).

| Cited file | Changed since `756e5a79` by |
| --- | --- |
| `scripts/check-package-install.mjs` (covered) | `334b014b` fix(68.1): close the re-audit's info findings inline |
| `scripts/lib/probe-guard-parse.mjs` | `334b014b` fix(68.1): close the re-audit's info findings inline |

**Trailers on this phase's commits:** 76 `Claude Opus 5.5 <noreply@anthropic.com>`.

**Validation record:** `68-VALIDATION.md` has status `validated` and nyquist_compliant `true`.

**Digest:** `covered_digest: "v4:sha256:5814f8faac671ad442cb38c03fa1a686dda5c5d56a16845bed7fd31a406786dd"` becomes `covered_digest: "v4:sha256:1b4ae721cae328a194ccd47a635b4a79e83c2d5007a50c082a17568f8ca65a40"`, over the same 45 covered files.

### Spot-checks re-run (Re-verification (2026-11-22, after the re-audit's inline fixes))

Run on the tree at `334b014b`, one command at a time, in the foreground, with stdin closed, on a quiet host (load 11.7, no other vitest).

| Behaviour | Command run now | Result now | Status |
| --------- | --------------- | ---------- | ------ |
| The merge gate, gate 14 included | `NO_COLOR=1 pnpm check:pr < /dev/null` at `334b014b` | exit 0; ran 17 of 18 steps (`pnpm mutation` skipped outside release PRs); vitest 242 files, 5985 tests; BDD 34 files, 568 tests; `package-install: 9 package(s) pack, resolve and authorize (524 runtime export(s))`; traceability `PASS: 21 FAIL: 0` | PASS |
| The probe guard's child reports a bad argument | `node scripts/lib/probe-guard-parse.mjs /nonexistent 'not json'` | exit 1; the JSON parse message on stderr | PASS |
| What changed under the paths the report cites | `git show --stat 334b014b -- scripts` | `scripts/check-package-install.mjs` (the probe guard's call reads the child's output first and reports a non-JSON line with it) and `scripts/lib/probe-guard-parse.mjs` (arguments parsed inside the `try`; `String(error?.message ?? error)`) | PASS |

### Changed cited files read against the truths that cite them (Re-verification (2026-11-22, after the re-audit's inline fixes))

- `scripts/check-package-install.mjs` (`334b014b`): every check the report cites is unchanged: the refused-shape and type-only probes, the unprobed-feeds, untyped and unrefused comparisons, the `null` case and the failure naming `typescript@<version>`. Only the error path for a child line that is not JSON changed, and it still ends in that same failure, now carrying the child's output.
- `scripts/lib/probe-guard-parse.mjs` (`334b014b`): the parse, the `{typed, refused}`/`null` output and the exit-1 failure are unchanged; reading the arguments moved inside the `try`, so a bad argument is reported the same way as a parse failure.

**Verdict:** passed
