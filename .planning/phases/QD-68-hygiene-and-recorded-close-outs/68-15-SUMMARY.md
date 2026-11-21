---
phase: QD-68-hygiene-and-recorded-close-outs
plan: 15
subsystem: verification sweep and phase close
status: complete
tags: [hygn-06, hygn-07, wx-01, re-verification, merge-gate, open-items]

requires:
  - phase: QD-68-hygiene-and-recorded-close-outs
    provides: 68-13's and 68-14's re-verifications of Phases 62 to 65, the reverify and sweep-check helpers, 68-stale.mjs, every fix and record of 68-01 to 68-12
provides:
  - "66-VERIFICATION.md and 67-VERIFICATION.md each re-verified: a Re-verification section, a refreshed covered_digest, verdict passed"
  - "pnpm check:pr green once, on the swept tree"
  - "HYGN-01 to HYGN-07 ticked complete; no WX requirement ticked"
  - "the open-items map: OI-01 to OI-29 each mapped to the commit that fixed it or the CCR-QD-459 record"
affects: []

actuals:
  tokens: 10800
  tasks: 3
  commits: 2
plan_head_before: 0f7b536a0bea0ba6acbced64dc3b026719245e6f
plan_head_after: eb6d2f12f986d35b6a25e1e723dcf035a5db02bf
commits: 2

tech-stack:
  added: []
  patterns:
    - "a verification report kept whole, with a dated section appended and only its digest line replaced"
    - "a RED reproduction by planting a defect in a scratch edit, reading the failure, and restoring the file by SHA-256"

key-files:
  created:
    - .planning/phases/QD-68-hygiene-and-recorded-close-outs/68-15-SUMMARY.md
  modified:
    - .planning/phases/QD-66-the-decoder-reads-only-what-it-declares/66-VERIFICATION.md
    - .planning/phases/QD-67-no-equivalent-mutants-no-magic-race-bound/67-VERIFICATION.md
    - .planning/REQUIREMENTS.md

key-decisions:
  - "Phases 66 and 67 are re-verified by re-running each of the report's checks on the current tree, including the two RED reproductions that edit a file and restore it, not by reading the old results"
  - "HYGN-01 to HYGN-07 are ticked after the one green check:pr run, and every WX requirement stays Pending for the milestone audit (OI-27)"

requirements-completed: [HYGN-06, HYGN-07, WX-01]
---

# Phase 68 Plan 15: Re-verify Phases 66 and 67, run the merge gate once, close the phase Summary

**Phases 66 and 67 re-verified against the tree Phase 68 leaves, `pnpm check:pr` green once on it, HYGN-01 to HYGN-07 ticked, and OI-01 to OI-29 each mapped to the commit that fixed it or the CCR-QD-459 line that records it.**

## Performance

- **Duration:** about 15 min (2026-11-21, 14:02 to 14:17 CET)
- **Tasks:** 3 (Task 1 a tracer, committed and verified end to end before Task 2)
- **Files:** the two verification reports, `REQUIREMENTS.md` and this summary

## Accomplishments

- Phase 66: each of the report's 8 Observable Truths re-checked on the current tree. The RED run was repeated by putting the base versions of `UntrustedDecode.ts`, `EnvelopeKeys.ts` and `SinkCodec.ts` back under the HEAD tests (10 of 129 fail: the report's eight, plus U30 and U31 which Phase 68 added), then restoring them. The bench gate re-ran on the committed data (`# slower: 0`, geomean -2.13%, `gate: pass`), the compiled code of the three source files and the bench is the same as at the report's commit and at the bench commit, and the spec gates pass. Verdict passed.
- Phase 67: the report's six spot-checks re-run, with the race test's two reproductions repeated after Phase 68 removed its separate sweep assertion (the hit check split fails it at budgets 3, 4 and 6 with `kWalks: 2`, and the owner spinning past the cap fails it with every budget named in `capped`), the scorer's `compare` (same figures) and its self-test (17 cases, Phase 68's additions). Verdict passed.
- `pnpm check:pr < /dev/null` ran once, in the foreground, alone, and exited 0.
- HYGN-01 to HYGN-07 ticked (28 lines, boxes and rows); every WX line stays `[ ]` and every WX row `Pending`.
- The open-items map below holds OI-01 to OI-29 once each; `oi-map-check.mjs` prints `oi-map: 25 fixed, 4 recorded`.

## Task Commits

1. **Task 1 (tracer): Phase 66 re-verified** - `9214d081` docs(68-15): re-verify Phase 66 after Phase 68
2. **Task 2: Phase 67 re-verified** - `eb6d2f12` docs(68-15): re-verify Phase 67 after Phase 68
3. **Task 3: HYGN-01 to HYGN-07 ticked and this summary** - the commit `docs(68-15): HYGN-01 to HYGN-07 complete`, which is the third commit of the plan (`commits: 2` above is measured at the HEAD before it)

## Sweep

`stale-before.txt` (taken by 68-13 at the start of the sweep) read every phase stale:

```
62: stale, verification b9ab1ea2, 30 cited, 9 changed since
63: stale, verification 321e213d, 18 cited, 5 changed since
64: stale, verification af3ef24e, 25 cited, 11 changed since
65: stale, verification 30582032, 24 cited, 7 changed since
66: stale, verification ba4392cf, 23 cited, 8 changed since
67: stale, verification 4f9d906a, 30 cited, 5 changed since
redo: 62 63 64 65 66 67
```

`stale-after.txt`, taken here before `check:pr` at `eb6d2f12`:

```
62: current, verification abf47015, 31 cited, 0 changed since
63: current, verification 44a87d05, 18 cited, 0 changed since
64: current, verification 1d472db7, 26 cited, 0 changed since
65: current, verification 0ff620df, 29 cited, 0 changed since
66: current, verification 9214d081, 30 cited, 0 changed since
67: current, verification eb6d2f12, 34 cited, 0 changed since
redo: none
```

| Phase | Re-verification commit | Plan | Verdict |
| --- | --- | --- | --- |
| 62 | `abf47015` docs(68-13): re-verify Phase 62 after Phase 68 | 68-13 | passed |
| 63 | `44a87d05` docs(68-14): re-verify Phase 63 after Phase 68 | 68-14 | passed |
| 64 | `1d472db7` docs(68-14): re-verify Phase 64 after Phase 68 | 68-14 | passed |
| 65 | `0ff620df` docs(68-14): re-verify Phase 65 after Phase 68 | 68-14 | passed |
| 66 | `9214d081` docs(68-15): re-verify Phase 66 after Phase 68 | 68-15 | passed |
| 67 | `eb6d2f12` docs(68-15): re-verify Phase 67 after Phase 68 | 68-15 | passed |

GSD's `verification.status` reads each of Phases 62 to 67 `passed`.

## Merge gate

- `check-pr.head`: `eb6d2f12f986d35b6a25e1e723dcf035a5db02bf`, recorded before the run. `pgrep -fl "vitest|stryker run|tstyche|check-package-install"` printed nothing before it, and nothing ran beside it.
- `pnpm check:pr < /dev/null`, once, in the foreground: exit status `0`; the log holds no `ELIFECYCLE`; its last line is `run-check: ran 16 of 17 steps; "pnpm mutation" was skipped (release PRs run it).`; the line before it is `publish-status: 9 package(s) and 6 document(s) agree on version (0.12.0)`.
- Since that head the tree differs only by this commit's two files, `.planning/REQUIREMENTS.md` and this summary. `git status` was clean under `packages`, `features`, `spec`, `scripts`, `AGENTS.md` and `.changeset` before the run and after it.

## Open items

Every item of the phase's open-items record, in one row: the plan whose must_haves name it, `fix` with the commit that fixed it or `record` with the commit that wrote its CCR-QD-459 line. The commit is read from `git log` over the phase, not from the plan's planned order: the owner reordered the run on 2026-11-21 (68-06 to 68-09 before 68-05), so `17dfa4ef` follows 68-09 and OI-18's `564818c0` is still the phase's first commit.

| OI | Plan | Disposition | Closed by |
| --- | --- | --- | --- |
| OI-01 | 68-07 | fix | `faec4fab` docs(68-07): the characterisation's readings, the projection's accessors, the admit pins and the supplied trace |
| OI-02 | 68-04 | fix | `2bea33b3` docs(68-04): the diagnostics poll's stop and the ignore projection's members, as the code holds them |
| OI-03 | 68-04 | fix | `456be457` fix(68-04): a capacity change's publish stops no read (subsumed by OI-09; its texts with OI-09's) |
| OI-04 | 68-04 | fix | `2bea33b3` docs(68-04): the diagnostics poll's stop and the ignore projection's members, as the code holds them |
| OI-05 | 68-07 | fix | `faec4fab` docs(68-07): the characterisation's readings, the projection's accessors, the admit pins and the supplied trace (pins U30 and U31 from 68-03) |
| OI-06 | 68-07 | fix | `faec4fab` docs(68-07): the characterisation's readings, the projection's accessors, the admit pins and the supplied trace |
| OI-07 | 68-07 | fix | `faec4fab` docs(68-07): the characterisation's readings, the projection's accessors, the admit pins and the supplied trace |
| OI-08 | 68-06 | fix | `d06f8bc5` test(68-06): the capacity tests describe the validation, and the race test drops its redundant assertion |
| OI-09 | 68-04 | fix | `456be457` fix(68-04): a capacity change's publish stops no read (texts in 68-10, changeset and the CCR-QD-455 correction in 68-11) |
| OI-10 | 68-05 | fix | `17dfa4ef` docs(68-05): the bench of record (code `0136e327` fix(68-04): admit reads each field of the question once, RED in 68-03, texts in 68-10) |
| OI-11 | 68-03 | fix | `2b79b7f5` test(68-03): pin the feeds' states after a listener throws, and a thrown value that throws when read |
| OI-12 | 68-03 | fix | `2b79b7f5` test(68-03): pin the feeds' states after a listener throws, and a thrown value that throws when read |
| OI-13 | 68-03 | fix | `045b00bf` test(68-03): pin admit's single read, a second and a nested unknown key, and two accessor readings |
| OI-14 | 68-06 | fix | `d06f8bc5` test(68-06): the capacity tests describe the validation, and the race test drops its redundant assertion |
| OI-15 | 68-08 | fix | `ec59e0ac` fix(68-08): test:tstyche takes file filters, house-style reads tstyche.json as JSONC, the characterisation is named once |
| OI-16 | 68-08 | fix | `ec59e0ac` fix(68-08): test:tstyche takes file filters, house-style reads tstyche.json as JSONC, the characterisation is named once |
| OI-17 | 68-08 | fix | `ec59e0ac` fix(68-08): test:tstyche takes file filters, house-style reads tstyche.json as JSONC, the characterisation is named once |
| OI-18 | 68-01 | fix | `564818c0` fix(68-01): spec-revise keeps its first argument when --date is not given |
| OI-19 | 68-08 | fix | `ca9ffb18` fix(68-08): the packed-install guard reads the consumer's run and the refused property, and bounds every child |
| OI-20 | 68-08 | fix | `ca9ffb18` fix(68-08): the packed-install guard reads the consumer's run and the refused property, and bounds every child |
| OI-21 | 68-08 | fix | `ca9ffb18` fix(68-08): the packed-install guard reads the consumer's run and the refused property, and bounds every child |
| OI-22 | 68-09 | fix | `35597a5c` fix(68-09): the completed phases' record scripts fixed where their records still pass |
| OI-23 | 68-09 | fix | `35597a5c` fix(68-09): the completed phases' record scripts fixed where their records still pass |
| OI-24 | 68-01 | fix | `585c33ea` feat(68-01): one shared A/B bench harness that alternates the arm order by round |
| OI-25 | 68-09 | fix | `35597a5c` fix(68-09): the completed phases' record scripts fixed where their records still pass |
| OI-26 | 68-11 | record | `eacfeb6c` docs(68-11): CCR-QD-459, the settled items confirmed, and the devtools patch changeset, recorded in CCR-QD-459 (Sonnet trailers in published history, not rewritten) |
| OI-27 | 68-11 | record | `eacfeb6c` docs(68-11): CCR-QD-459, the settled items confirmed, and the devtools patch changeset, recorded in CCR-QD-459 (WX rows are cross-cutting, ticked by the milestone audit) |
| OI-28 | 68-11 | record | `eacfeb6c` docs(68-11): CCR-QD-459, the settled items confirmed, and the devtools patch changeset, recorded in CCR-QD-459 (stated and accepted limits) |
| OI-29 | 68-11 | record | `eacfeb6c` docs(68-11): CCR-QD-459, the settled items confirmed, and the devtools patch changeset, recorded in CCR-QD-459 (completed phases' plan verifies stay records) |

## After the sweep

A commit after this plan that changes a file a re-verified phase cites makes that report stale again. The code review's fix step is such a commit: its fixer runs after 68-15. Whoever lands the change (the orchestrator, after the review's fixes) runs, from the repository root:

1. `node .planning/phases/QD-68-hygiene-and-recorded-close-outs/68-stale.mjs < /dev/null`. Its last line `redo: <phases>` names the phases to redo; `redo: none` means nothing is stale and the rule is done.
2. For each phase `<NN>` named: `node .planning/phases/QD-68-hygiene-and-recorded-close-outs/68-reverify.mjs <NN> 3d66becb9034fb16ffd97ccd5966b92d972e3b8e "Re-verification (<YYYY-MM-DD>, after <the change>)" > "${TMPDIR:-/tmp}/reverify-<NN>.md"`. Append all of its output but the last line to `<NN>-VERIFICATION.md` as a new section after the earlier ones, which stay; add `### Spot-checks re-run (<the same label>)` for the rows the changed files touch; end the section with `**Verdict:** passed`, or `**Verdict:** gaps_found` with the gaps listed, and stop; replace the `covered_digest:` line with the printed last line; commit the report alone as `docs(68): re-verify Phase <NN> after <the change>`.
3. Run step 1 again, until it prints `redo: none`.

At this plan's close step 1 prints `redo: none`.

## Deviations from Plan

None - plan executed exactly as written. Notes that are not deviations:

- The plan's verify for Task 1 and Task 2 ran as written (`bash` over the extracted `<automated>` text) and passed; Task 3's verify is run after the tick commit, below.
- `oi-map-check.mjs` reads the real commit order from `git log`, not the planned order: it finds each named commit in `git log --reverse <base>..HEAD` and compares positions, so the reorder needed no corrected copy. The plan's table of OI to plan to commit needed no change either; every named subject exists once.
- A RED reproduction for Phase 67 needed a scratch plant of the hit check split, since the plan's own patch (`pre-i5-split.patch`) was never committed. The plant moves the same text the same way (`Effect.flatMap(Effect.sync(() => hooks.cached(key)), ...)`); both it and the `ownerSpin` edit were restored with `git checkout -- <file>` and the SHA-256 of each checked equal.

## Known Stubs

None.

## Threat Flags

None. The plan adds no code, no endpoint and no file access.

## Flagged for the owner

Gathered from the fourteen earlier summaries, and this plan's:

- **68-01.** `spec-revise.mjs` appears as a changed cited file for Phases 64, 65 and 66 because of its own OI-18 fix; each report names it and says what the change does not touch. The probe copy of the base `spec-revise.mjs` ran from a scratch path, because the harness refused the `rm -f` in the plan's verify.
- **68-03.** The RED evidence for TF27 prints `expected { reads: 1 } to deeply equal { reads: 2 }`, as the plan's interface note records.
- **68-04.** U31 did not typecheck as 68-03 wrote it (`TooDeep` has no `message`); fixed in `8016587b`. The residue of OI-09 is as stated and pinned (TF29): on a `Stopped` feed, a status listener that throws on the `Reading` the `finally`'s read publishes escapes in place of what `push()` threw, and no read is started. The executor protocol's commit ledger was not written at that plan's first commit; its `plan_head_before` is the HEAD at plan start.
- **68-05.** The bench of record is `verdict: pass`, from the second attempt: the first attempt halted on a busy host with no run, as the owner decided. The run measured the tree at `769bf57c`, and no `packages/*/src`, bench or `package.json` file has changed since.
- **68-06.** The plan's `oneSided or sides remains` grep also matched three prose uses of "sides"; it was narrowed to the identifiers for that run, with no file change.
- **68-08.** On Node 26 `module.register` prints a DEP0205 deprecation warning, seen only in a failing run's output; CI runs Node 22.12.0, where `module.registerHooks` does not exist, so the call stays.
- **68-09.** The 67 scorer's self-test compares `gitStatus.toString()` for one check, so reformatting that line fails it by design. Only the plants the plan names were run.
- **68-10.** A1: ADR-QD-174's width bound is 119 columns outside the Document Control block. A2: the port cards stay package-private rather than exported (HYGN-04). ADR-QD-033 was amended too, though 68-CONTEXT's list did not name it, because 68-08 changed what gate 14 reads.
- **68-11.** The one changeset is the `@qadi/devtools` patch; `.changeset/` already holds the earlier phases' changesets, so "exactly one added" is measured against the phase base.
- **68-12, 68-13, 68-14.** `close-scan.txt` ends `FAIL 11 commits: out of order` only because of the owner's reorder; `close-scan-reordered.txt` ends `close-scan: 13 checks passed`, and each of these plans accepted that as documented. This plan does the same.
- **68-14.** The one judgment of the sweep: Phase 65's Truth 4 (the bench) is answered by Phase 68's bench of record against Phase 68's base, `# slower: 0`, geomean `+0.01%`, worst `+4.7%`, and the section says no single run compares today's tree with Phase 65's base. The verdict is `passed` on that reading.
- **68-15.** Phase 66's report cited `git diff 48921088 HEAD -- scripts` as empty, and Phase 67's cited `git diff 0e3f9cbd..HEAD -- packages scripts package.json` as empty; both are true of the ranges they name and not of the tree Phase 68 leaves. The new sections say so and re-check the claim each was about (`UNTRUSTED_DECODE_BUDGET` unchanged; the three source files and the bench unchanged). `66-mutation.mjs` was changed by 68-09 and is not cited by Phase 66's report, so the staleness check does not list it; it was not re-run here (Stryker does not run beside the gate).
- Nothing is released, versioned, published, pushed or tagged.

## Self-Check: PASSED

- `66-VERIFICATION.md`, `67-VERIFICATION.md`, `REQUIREMENTS.md` and this summary exist; `9214d081` and `eb6d2f12` are ancestors of HEAD.
- Task 1's and Task 2's verifies pass on the tree after their commits; `68-stale.mjs` ends `redo: none`; `check:pr` exited 0 and its log ends with the run-check line.
