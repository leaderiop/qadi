---
phase: QD-64-one-throwing-listener-cannot-silence-the-rest
plan: 05
subsystem: verification
tags: [close, mutation, close-scan, merge-gate, devtools, listeners]
phase_base: 8f3cb792c3a92acefadcd32be0f38b0df8f46641
plan_head_before: a28df72f0bdc539a8174b2ef3e76370d55ffe7e5
requires:
  - phase: QD-64-one-throwing-listener-cannot-silence-the-rest
    provides: "plans 01 to 04: the base record and RED pins, the seam, the texts and changeset, the spec records"
provides:
  - "the close mutation record, no touched file's score fell"
  - "the 24-check close scan over the whole phase range, green"
  - "pnpm check:pr green on the final tree, LSTN-01..04 complete"
affects: []
requirements-completed: [LSTN-01, LSTN-02, LSTN-03, LSTN-04, WX-01, WX-02, WX-03, WX-04, WX-05, WX-06, WX-07]
status: complete
---

# Phase QD-64 Plan 05: The phase closed Summary

**The Stryker close run, the 24-check close scan and a hand review of the phase's diff show the seam, the texts and the records say what the code holds and nothing else, with no touched file's mutation score lower than at the base.**

## Close scan

`node <S>/close-scan.mjs 8f3cb792c3a92acefadcd32be0f38b0df8f46641`, exit 0, verbatim:

```text
ok   the touched packages/*/src files are exactly the four model files: packages/devtools/src/model/DiagnosticsFeed.ts, packages/devtools/src/model/ExternalStore.ts, packages/devtools/src/model/GatesFeed.ts, packages/devtools/src/model/TimelineFeed.ts
ok   exactly the 18 planned files changed outside .planning: .changeset/devtools-every-listener-is-called.md, packages/devtools/README.md, packages/devtools/src/model/DiagnosticsFeed.ts, packages/devtools/src/model/ExternalStore.ts, packages/devtools/src/model/GatesFeed.ts, packages/devtools/src/model/TimelineFeed.ts, packages/devtools/test/helpers.ts, packages/devtools/test/model/DiagnosticsFeed.test.ts, packages/devtools/test/model/ExternalStore.test.ts, packages/devtools/test/model/GatesFeed.test.ts, packages/devtools/test/model/TimelineFeed.test.ts, spec/README.md, spec/behaviors/28-devtools-screens.md, spec/decisions/173-the-devtools-headless-interface-is-its-feeds.md, spec/decisions/177-one-throwing-listener-cannot-silence-the-rest.md, spec/decisions/index.yaml, spec/invariants.md, spec/traceability.md
ok   one changeset added, a @qadi/devtools patch and nothing else: .changeset/devtools-every-listener-is-called.md | "@qadi/devtools": patch
ok   no tag on the phase's commits and no release or version commit:  
ok   the RED tests land before the seam, and the seam commit holds only ExternalStore.ts: red at 1, seam at 6, seam files [packages/devtools/src/model/ExternalStore.ts]
ok   the three feed sources change in comment lines only
ok   no forbidden construct, clock or timer added to ExternalStore.ts
ok   no forbidden construct, clock or timer added to the five test files
ok   no Stryker disable added
ok   no plan, decision, requirement, change or phase id added to packages or the changeset (288 added run(s))
ok   no plan, decision, requirement or phase id added under spec/ (138 added run(s))
ok   the unused ids appear only in the CCR-QD-455 row; ADR-QD-177, BEH-QD-656 and INV-QD-373 exist once: 1 unused-id line(s); ADR true indexed true
ok   no old-contract sentence remains
ok   the website and the dock characterisation tests are unchanged:  
ok   the AggregateError message is one literal, the same in source, test and BEH-QD-656: source 1, test 1, BEH true
ok   one CCR-QD-455 row, citing every spec document the phase revised at its current Revision: 1 row(s); cited [spec/README.md,spec/behaviors/28-devtools-screens.md,spec/decisions/173-the-devtools-headless-interface-is-its-feeds.md,spec/decisions/177-one-throwing-listener-cannot-silence-the-rest.md,spec/invariants.md,spec/traceability.md]; 
ok   house-style clean, line unchanged: house-style: 560 file(s) clean (3 declared switch(es), 66 type-test file(s))
ok   oxlint clean on packages/devtools and the committed scorer
ok   939 exports documented
ok   gate 11 (node scripts/check-dod-table.mjs) at 25 steps; package.json, the DoD and the overview unchanged
ok   verify-traceability --strict: PASS: 21   FAIL: 0   SKIP: 0 (strict: skips count as failures)
ok   spec-revise --check and devtools claims: 0 0
ok   the mutation compare holds, against a base recorded at phase_base: base head 8f3cb792c3a92acefadcd32be0f38b0df8f46641
ok   no untracked file under packages, scripts, spec or .changeset (no probe or scratch copy left)
close-scan: 24 of 24 check(s) green
```

One defect in the scan itself is recorded under Deviations: its first check read an empty list.

## Mutation

The invocation is the one recorded in `64-mutation-base.json` (its `head` is `phase_base`), run alone with stdin closed; `record close` then `compare`:

```text
packages/devtools/src/model/ExternalStore.ts 29/30 -> 41/42
packages/devtools/src/model/TimelineFeed.ts 49/49 -> 49/49
packages/devtools/src/model/DiagnosticsFeed.ts 72/73 -> 72/73
packages/devtools/src/model/GatesFeed.ts 118/118 -> 118/118
no touched file's score fell
```

- Base record head: `8f3cb792c3a92acefadcd32be0f38b0df8f46641` (`64-mutation-base.json`, committed in 64-01); close record: `64-mutation-close.json`, written by `record close` from `reports/mutation-devtools/mutation.json`.
- ExternalStore.ts went from 29/30 to 41/42: the seam and its nine cases added twelve killed mutants. Its one survivor is the base's own `sameElements` mutant (`a === b` to `false`, now at line 89), matched by its line text.
- No file's detected/valid ratio fell, no new open mutant, no more static-ignored mutants.

## Diff review

Read by hand: `git diff 8f3cb792c3a92acefadcd32be0f38b0df8f46641 -- packages .changeset` (10 files under `packages`, 299 insertions, 19 deletions, plus the changeset).

- `ExternalStore.ts`: the only code change is `notify` (collect, call every listener, rethrow nothing, the value itself or one `AggregateError`) and the listener-contract paragraph; the paragraph states what `notify` does (live set, value held before any listener runs, `undefined` and `null` rethrown as themselves, an `AggregateError` a listener throws kept as one value). The message is one literal. No forbidden construct, clock or timer.
- `DiagnosticsFeed.ts`, `GatesFeed.ts`, `TimelineFeed.ts`: comment lines only (the scan's check). Each says the listeners are called, what they threw is rethrown out of whatever published, and the rest of that call does not run. The window between a run's `begin()` and `fork()` is described and not claimed closed: the `Starting` or `Reading` that `restart` or `configure` publishes escapes before the new poll or read is forked, so the status can say so with nothing running (diagnostics: `Starting`, no new poll; timeline: `Reading`, nothing reading), and a throw on a tick ends the gates feed's cadence without a statement. The README paragraph says the same in the same order.
- The README replaced the old "is not isolated: it must not throw" sentence where it stood; no other README text moved.
- The changeset is one sentence, one `@qadi/devtools` patch.
- Test titles carry the existing case ids (`TF25`, `F30`, `G48`, the same kind as the files' other cases) and no decision, plan, requirement or phase id; the leak scan found none in 288 added runs under `packages` and the changeset.
- A comment cites ADR-QD-177, which is house style for a spec id.

## Edge coverage

| # | Requirement | Category | Disposition | Evidence |
| --- | --- | --- | --- | --- |
| 1 | LSTN-01 | unclassified | flagged | Flagged for review (a thrown value that throws when read); see below |
| 2 | LSTN-02 | adjacency | explicit | C1, R3, R2, R4 green in the store suite; variants v3, v6, v8 each fail their named cases (64-02); the Stryker close run killed both length checks (ExternalStore.ts 41/42, the one survivor is `sameElements`) |
| 3 | LSTN-02 | empty | explicit | C1 and the three existing notify cases; R3; v3 (64-02); the close run's mutation record |
| 4 | LSTN-02 | ordering | explicit | C1, C2, C3, R2, C4; v1 and v2 fail (64-02) |
| 5 | LSTN-03 | adjacency | explicit | Close scan check "no old-contract sentence remains" (7 lines at the base, 0 at close); BEH-QD-638's dated note (64-04) |
| 6 | LSTN-03 | empty | explicit | Close scan: the website and the dock tests unchanged; `AGENTS.md` and the root README untouched (64-03's re-grep) |
| 7 | LSTN-03 | encoding | explicit | Close scan: the message one literal in source (1), test (1) and BEH-QD-656; 64-03's sentence checks |
| 8 | LSTN-03 | ordering | explicit | Commit order 64-02 (seam) then 64-03 (feed docs, README, changeset) then 64-04 (spec); each caveat in the diff review states the code's order |
| 9 | LSTN-04 | concurrency | backstop | The dock's four files are unchanged from `phase_base` (close scan) and ran inside `pnpm check:pr`; see Merge gate |
| 10 | WX-01 | adjacency | explicit | `check:pr` ran 16 of 17 steps; gate 11 at 25 steps (close scan) |
| 11 | WX-01 | empty | explicit | Exit status and the `ran 16 of 17 steps` line both read; see Merge gate |
| 12 | WX-01 | ordering | explicit | `check:pr` ran once, after the Stryker close run and the close scan, alone; the tree differs from it only by `REQUIREMENTS.md` (Task 2 verify) |
| 13 | WX-02 | adjacency | explicit | ADR-QD-173 amended in place, stays Accepted (64-04); close scan's register check |
| 14 | WX-02 | empty | explicit | Close scan: the unused ids appear only in the CCR-QD-455 row |
| 15 | WX-02 | encoding | explicit | Close scan: the CCR row cites each revised spec document at its current Revision |
| 16 | WX-02 | ordering | explicit | 64-04 Task 1's RED log (3 FAIL rows) precedes the row; the row follows CCR-QD-454's |
| 17 | WX-03 | adjacency | explicit | Close scan: `api-surface: 939 export(s) documented across 9 package(s)` |
| 18 | WX-03 | empty | explicit | Close scan: only the four model files under `packages/*/src`; `spec/overview.md` unchanged |
| 19 | WX-03 | encoding | explicit | Close scan; 64-02's typecheck (no signature or public type moved) |
| 20 | WX-03 | ordering | explicit | Close scan: `spec/overview.md` unchanged |
| 21 | WX-04 | adjacency | explicit | Close scan's whole-word scan on blanked code, each file against its own `phase_base` text |
| 22 | WX-04 | empty | explicit | Close scan over the seam and the five test files; the feeds comment-only; the diff review above |
| 23 | WX-04 | encoding | explicit | Close scan's blanking of comments and string text (plan-time planted constructs found) |
| 24 | WX-04 | ordering | explicit | Close scan: house-style line unchanged at `560 file(s) clean (3 declared switch(es), 66 type-test file(s))` |
| 25 | WX-05 | boundary | explicit | Mutation compare by integer cross-multiplication: 29/30 to 41/42, 49/49, 72/73, 118/118 |
| 26 | WX-05 | precision | explicit | Counts by status and open mutants matched by line text, not Stryker's percentages |
| 27 | WX-05 | concurrency | explicit | Stryker run alone, stdin closed, by the recorded invocation; `record close` accepted the report's sources |
| 28 | WX-06 | adjacency | explicit | 64-02's variant matrix, v0 to v8 |
| 29 | WX-06 | empty | explicit | 64-01 RED (store and feeds), 64-02 variants, 64-04 register RED, the plan-time planted checks, and this run's planted-base run of the scan's first check |
| 30 | WX-06 | ordering | explicit | Close scan: RED commits (position 1) before the seam commit (position 6), which holds only `ExternalStore.ts`; the Stryker base was recorded first (64-01) |
| 31 | WX-07 | unclassified | flagged | Flagged for review (leak-scan patterns); the diff review above |

## Deviations from Plan

**1. [Rule 1 - Bug] The close scan's first check could never pass**
- **Found during:** Task 1
- **Issue:** the scan read the touched source files with the git pathspec `packages/*/src`, which matches nothing in `git diff --name-only` (a wildcard pathspec does not match as a leading directory), so the check compared an empty list with the four model files and failed on a correct tree: 23 of 24 green.
- **Fix:** the scratch scan's pathspec became `packages/*/src/**`, which lists exactly the four model files. The tree was not touched, and no check was weakened: the corrected check reads more, not less. It was shown failing by running the scan with the seam commit as base (3 files listed, `FAIL`). The scan stays scratch and is not committed.
- **Files modified:** scratch `scan-tail.mjs` and `close-scan.mjs` only
- **Verification:** `close-scan: 24 of 24 check(s) green`

**Total deviations:** 1 auto-fixed (1 bug in a scratch check). **Impact:** none on the tree or the phase's files.

## Flagged for review

- **[LSTN-01, unclassified]** The RED cases throw plain values, `Error`s, `undefined`, `null` and an `AggregateError`; a thrown value that throws when read (a hostile getter, a revoked proxy) is collected the same way because `notify` never reads what it holds. The cases do not exercise it, and variant v4 (the one that reads a thrown value) stands in for it.
- **[WX-07, unclassified]** The leak scan's patterns (`\bD-?\d{1,2}\b`, `\b(LSTN|WX)-0\d\b`, `\b64-0\d\b`, `[Pp]hase 6\d`, `QD-64`, and in packages and the changeset also `ARCH-` and `CCR-QD-` ids) catch the spellings this repository uses; another spelling would pass, so the diff review reads the added text by hand. Nothing is released: no tag and no release commit.
- **[WX-02, assumption]** ADR-QD-173's own text named no listener rule (the rule lived in BEH-QD-638 and the feeds' docs), so its amendment adds the contract beside the decision rather than rewriting a sentence of it.
- **[WX-05, assumption]** The `sameElements` mutant `a === b` to `false` in `ExternalStore.ts` survived at `phase_base` and is equivalent (the element loop gives the same answer); the compare keeps it as a known open mutant, matched by its line text, rather than adding a test that cannot kill it.

## Known Stubs

None.

## Threat Flags

None. No network endpoint, auth path, file access or schema changed.

<!-- gsd:write-continue -->
