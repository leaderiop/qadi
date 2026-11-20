---
phase: QD-63-the-packed-install-gate-probes-every-new-public-name
plan: 05
subsystem: build-gate
tags: [gate-14, package-install, close-scan, merge-gate, requirements]
phase_base: 11dc168f4d8a8b295aef16f2d04b762c503d1ba8
plan_head_before: 53a12247e70d985c83116e4713edc2bc6f065cc9
requires: [63-04]
provides:
  - "close-scan.mjs: 21 of 21 cross-cutting checks green over phase_base..HEAD"
  - "the edge coverage table (29 items), the flagged assumptions and the diff review"
  - "pnpm check:pr green on the phase's final tree"
  - "PROBE-01..PROBE-05 complete in REQUIREMENTS.md; WX-01..WX-07 left Pending"
affects: []
tech-stack:
  added: []
  patterns:
    - "a scratch close scan: one pinned lexer, every rule, the whole range, a non-zero exit on any failure"
key-files:
  created:
    - .planning/phases/QD-63-the-packed-install-gate-probes-every-new-public-name/63-05-SUMMARY.md
  modified:
    - .planning/REQUIREMENTS.md
key-decisions:
  - "The scan's set-aside rule for the script's parser loads reads a line's trimmed form and pins the count at three"
requirements-completed: [PROBE-01, PROBE-02, PROBE-03, PROBE-04, PROBE-05]
status: complete
---

# Phase QD-63 Plan 05: Close scan, merge gate, requirements Summary

The whole phase range `11dc168f..HEAD` holds every cross-cutting rule (21 of 21 close checks), `pnpm check:pr` runs its 16 steps green, and PROBE-01..PROBE-05 are recorded complete.

## Close scan

`node close-scan.mjs 11dc168f4d8a8b295aef16f2d04b762c503d1ba8`, lexer SHA-256 `3efe72bd03e3929dbb6c1d5056f0e6226906c23b5d63b5508a2bdd4b2cae7d06` (matched). Final run, exit 0:

```
ok   no packages/*/src change since phase_base
ok   exactly the six planned files changed outside .planning: AGENTS.md, scripts/check-package-install.mjs, spec/README.md, spec/decisions/033-the-packed-artifact-is-the-product.md, spec/process/definitions-of-done.md, spec/traceability.md
ok   no changeset added
ok   no tag on the phase's commits
ok   no release or version commit
ok   the guard commit lands alone, before the first probe commit: guard at 0, first probe at 3, guard files [scripts/check-package-install.mjs]
ok   no forbidden construct, clock or timer added to the script's own code (3 parser load(s) by await import set aside, flagged)
ok   no forbidden construct, clock or timer added to the consumer fixture (3 added top-level await line(s) set aside, flagged)
ok   no Stryker disable added
ok   no plan, decision, requirement, change or phase id added to the script or AGENTS.md (282 added run(s))
ok   no plan, decision, requirement or phase id added under spec/ (30 added run(s))
ok   the unused ids appear only in the CCR-QD-454 row; no ADR-QD-176 file; index.yaml unchanged: 1 line(s) spec/README.md:391:| CCR-QD-454 | 2026-1;  
ok   house-style clean, line unchanged: house-style: 560 file(s) clean (3 declared switch(es), 66 type-test file(s))
ok   oxlint clean on the script
ok   939 exports documented
ok   gate 11 (node scripts/check-dod-table.mjs) at 25 steps; no table row, package.json or the check changed: 0 row line(s) changed; 
ok   verify-traceability --strict: PASS: 21   FAIL: 0   SKIP: 0 (strict: skips count as failures)
ok   spec-revise --check and devtools claims: 0 0
ok   gate 14 (node scripts/check-package-install.mjs) green with every probe
ok   63-mutation-base.json records the empty scope at phase_base
ok   no scratch copy or stray file left
close-scan: 21 of 21 check(s) green
```

## Deviations from Plan

### Orchestrator-approved fix to the scratch scan

**1. [Rule 1 - Bug] The scan's set-aside regex could not match a multi-line destructuring**
- **Found during:** Task 1, first scan run (20 of 21).
- **Verbatim FAIL line:** `FAIL no forbidden construct, clock or timer added to the script's own code (2 parser load(s) by await import set aside, flagged): await: await import("                          ");`
- **Issue:** the plan's regex `/= await import\(" *"\);/` needs the `=` on the same line as `await import`. The script's second parser load is a destructuring split over two lines (`const { isCallExpression, … } =` then `await import("typescript/unstable/ast/is");`), so its continuation line was reported as a stray `await`. This contradicted the plan's own stated truth (three parser loads set aside and counted, one a multi-line destructuring). The script was correct and was not touched.
- **Old regex:** `!/= await import\(" *"\);/.test(line)`, with the check passing on `inScript.length === 0 && strayAwaits.length === 0`.
- **New regex and count pin:** `!/^(?:.*= )?await import\(" *"\);$/.test(line.trim())` sets a line aside when its trimmed form is `… = await import("   ");` or a bare continuation `await import("   ");`. The check now passes only if `strayAwaits.length === 0` and the set-aside count `=== 3`, so a fourth `await import` of any form, or a lost one, fails. The label text is unchanged and still prints the count.
- **Proof it can still fail** (run on scratch copies of the script only, through a harness that is the scan up to this check; the tracked script was never edited):
  - (a) a stray `await Effect.runPromise(x);` added next to the loads: `FAIL … (3 parser load(s) by await import set aside, flagged): await: await Effect.runPromise(x);`
  - (b) a fourth bare `await import("typescript/unstable/x");`: `FAIL … (4 parser load(s) by await import set aside, flagged): set-aside count 4, wanted 3`
  - (c) the repo script as is: `ok … (3 parser load(s) by await import set aside, flagged)`
- **Re-run:** the full scan then printed `close-scan: 21 of 21 check(s) green` (the log above).
- **Files modified:** none tracked (scratch `close-scan.mjs` only, never committed).

No other deviation: every other observed line and count matched its expected value.

## Diff review

Read `git diff 11dc168f -- scripts AGENTS.md spec` in full.

- `scripts/check-package-install.mjs` (script code): adds the header paragraph, `TYPE_ONLY_PROBES`, `REFUSED_SHAPE_PROBES`, `consumerReady` and the guard block. The added code has no `as`, `any`, `!`, `switch`, `async`, `new Promise`, `.then`, clock, timer, `process.env` or `console` use, and no construct split across lines or hidden in a regex literal: the only regex literal is `/^make\w*Feed$/`. The only added `await`s are the three parser loads (`await import("typescript/unstable/sync")`, `…/ast/is` as a two-line destructuring, `…/ast/scanner`), each inside the guard's `try`, and the key-read child's `await import("@qadi/devtools")`, which sits inside a single-quoted string for `node -e` and so is text, not script code.
- Consumer fixture: the added `await` lines are exactly three top-level `await Effect.runPromise(…)` calls (`gated`, `diagnosed`, `cached`), the form its existing probes use. The only loop is the bounded `while … turns < 200` with `Effect.yieldNow`; no clock, timer or `Effect.sleep`; no assertion operator; the two `@ts-expect-error` directives each sit directly above the line the compiler reports on.
- `AGENTS.md` and `spec/`: prose and register cells only. They carry `ARCH-110` and `CCR-QD-454` where the register requires them (change history, the CCR row, the ADR amendment heading) and no plan, decision, requirement or phase id of the kinds the leak patterns name. `ADR-QD-176`, `BEH-QD-651–655` and `INV-QD-371–372` appear only in the CCR-QD-454 row. Every Revision equals its newest Change History entry (`spec-revise --check`).

## Edge coverage

| # | Requirement | Category | Disposition | Evidence |
| --- | --- | --- | --- | --- |
| 1 | PROBE-01 | unclassified | assumption (flagged) | Flagged for review item 1 |
| 2 | PROBE-02 | unclassified | assumption (flagged) | Flagged for review item 2 |
| 3 | PROBE-03 | adjacency | explicit | 63-02 diagnostics probe; 63-03 m1 (`diagnostics feed reached Live in 200 turns was Off, wanted Live`) |
| 4 | PROBE-03 | empty | explicit | 63-02 `Off` and `{}` feeds asserted separately; 63-03 m1 |
| 5 | PROBE-03 | ordering | backstop | `@qadi/devtools` feed and store tests inside `pnpm check:pr` (Merge gate) |
| 6 | PROBE-04 | unclassified | assumption (flagged) | Flagged for review item 3 |
| 7 | PROBE-05 | unclassified | assumption (flagged) | Flagged for review item 4 |
| 8 | WX-01 | adjacency | explicit | Merge gate: `ran 16 of 17 steps`; close scan gate 11 at 25 steps |
| 9 | WX-01 | empty | explicit | Merge gate: exit status and the `ran 16 of 17 steps` line both read |
| 10 | WX-01 | ordering | explicit | Merge gate `[run-check N/16]` order; close scan gate 11 `25 step(s) match pnpm check` |
| 11 | WX-02 | adjacency | explicit | 63-04 amendment and traceability row amended in place; close scan: six files, no ADR file |
| 12 | WX-02 | empty | explicit | Close scan: unused ids only in the CCR-QD-454 row |
| 13 | WX-02 | encoding | explicit | 63-04; close scan verify-traceability strict and `spec-revise --check` |
| 14 | WX-02 | ordering | explicit | 63-04 Task 1 RED on register coverage before the row; CCR-QD-454 directly after CCR-QD-453 |
| 15 | WX-03 | adjacency | explicit | Close scan: `api-surface: 939 export(s) documented across 9 package(s)` |
| 16 | WX-03 | empty | explicit | Close scan: no `packages/*/src` change; gate 14 prints 524 |
| 17 | WX-03 | encoding | explicit | Close scan: the six-file list holds no barrel and not `spec/overview.md` |
| 18 | WX-03 | ordering | explicit | Close scan: `spec/overview.md` unchanged since `phase_base` |
| 19 | WX-04 | adjacency | explicit | Close scan script and fixture checks on blanked code; Diff review |
| 20 | WX-04 | empty | explicit | Close scan: per-line comparison against `phase_base`; Diff review |
| 21 | WX-04 | encoding | explicit | Close scan: fixture unescaped as the sandbox receives it; Diff review |
| 22 | WX-04 | ordering | explicit | Close scan: house-style line and budgets unchanged (`560 file(s) clean (3 declared switch(es), 66 type-test file(s))`) |
| 23 | WX-05 | boundary | explicit | Merge gate: `pnpm coverage` step green inside `check:pr`; no `packages/*/src` change |
| 24 | WX-05 | precision | explicit | Merge gate: coverage step green; no source line changed |
| 25 | WX-05 | concurrency | explicit | Close scan: empty mutation scope in `63-mutation-base.json`; `check:pr` ran alone |
| 26 | WX-06 | adjacency | explicit | `63-RED-EVIDENCE.md`: c0 against r1 to r6, dts, m1 to m3; 63-01 matrix |
| 27 | WX-06 | empty | explicit | `63-RED-EVIDENCE.md`: every new check shown failing at least once |
| 28 | WX-06 | ordering | explicit | Close scan: guard commit alone and before the first probe commit; 63-02 gate runs |
| 29 | WX-07 | unclassified | assumption (flagged) | Flagged for review item 5 |

## Flagged for review

1. **[PROBE-01]** The guard reads the root's runtime keys by importing the packed `@qadi/devtools` in a child process, so a `make*Feed` exported only as a type, or only from a subpath, is outside its reach; call detection is syntactic, so a call anywhere in the fixture counts, and the probe's runtime assertions, not the guard, prove the call did something.
2. **[PROBE-02]** The gates probe drives a structural registry literal, because `@qadi/react`'s real registry needs a DOM; the packed `GateRegistryLike` type is what ties the two, so a real registry that kept the type but changed behaviour would not be caught here.
3. **[PROBE-04]** The host-cache probe asserts `miss,hit` with one resolver call over two sequential decisions; the `coalesced` outcome under concurrent asks is not probed through the packed artifact and rests on core's own cache tests.
4. **[PROBE-05]** The removal proof is a recorded run over scratch copies (`63-RED-EVIDENCE.md`), not a committed self-test, so it holds for the script as committed in this phase; every whole-probe removal it ran fails, the pre-0.13 literal with its directive (r5) included.
5. **[WX-07]** The leak scan's patterns catch the spellings this repository uses; another spelling would pass it, so the Diff review reads the added text by hand.
6. **[WX-04, not an edge item]** The script gains three `await import("typescript/unstable/…")` parser loads inside the guard's `try` (so a missing parser module reports through `fail()`), and the consumer fixture gains three top-level `await Effect.runPromise(…)` lines, the form its existing probes use. WX-04's list is the house rule for `packages/*/src`, which the phase does not touch; the close scan sets exactly these aside, counts them (three, pinned), and fails on any other added `await`.

## Known Stubs

None.

## Threat Flags

None. This plan adds no code, only records.
