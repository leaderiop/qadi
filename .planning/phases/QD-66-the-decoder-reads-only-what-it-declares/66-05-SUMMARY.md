---
phase: QD-66-the-decoder-reads-only-what-it-declares
plan: 05
subsystem: testing
tags: [stryker, close-scan, merge-gate, requirements]
phase_base: 48921088b0228724469b6624de91658c650e46c3
plan_head_before: 6ace419f9b3e529ae74fdc8dfadbd6c35de1f282
plan_head_after: 83b62d8a8b819b182e2257701a77161e87bf96c2
commits: 1
requires:
  - phase: QD-66-the-decoder-reads-only-what-it-declares
    provides: "66-01 to 66-04 (the RED pins, the projection, the bench of record, the records)"
provides:
  - 66-mutation-close.json and 66-mutation-static.json, compare green
  - the 12-check close scan over the phase range, green
  - pnpm check:pr read once, alone, on the scanned tree
  - DECL-01 to DECL-04 recorded complete
affects: [v1.7 milestone audit]
tech-stack:
  added: []
  patterns: ["close = committed scorer's compare + scratch scan over the phase range + one merge-gate run on the scanned tree"]
key-files:
  created:
    - .planning/phases/QD-66-the-decoder-reads-only-what-it-declares/66-mutation-close.json
    - .planning/phases/QD-66-the-decoder-reads-only-what-it-declares/66-mutation-static.json
    - .planning/phases/QD-66-the-decoder-reads-only-what-it-declares/66-05-SUMMARY.md
  modified:
    - .planning/REQUIREMENTS.md
key-decisions:
  - "None beyond the plan: no score fell and no survivor sits on a line the phase wrote, so no test was added and no packages file changed in this plan"
requirements-completed: [DECL-01, DECL-02, DECL-03, DECL-04]
actuals:
  tokens: 6000
  tasks: 3
  commits: 2
duration: about 20 min
completed: 2026-11-20
status: complete
---

# Phase 66 Plan 05: The close Summary

**The Stryker close shows no touched file's score fell and no survivor on a line the phase wrote, the 12-check close scan and a single `pnpm check:pr` are green on one tree, and DECL-01 to DECL-04 are ticked.**

`commits` above is the count measured when this file was written (the record commit); the tick commit that holds this file and `REQUIREMENTS.md` is the second, so the plan's `actuals.commits` is 2.

## Mutation

Same invocation as the base, close HEAD `6ace419f` (the tree before the record commit), alone, foreground, stdin closed. The close run took 43 s, the evidence run 39 s.

| File | Base detected/valid | Close detected/valid | Ignored base -> close | Open at close |
| --- | --- | --- | --- | --- |
| `EnvelopeKeys.ts` | 58/58 | 57/57 | 9 -> 9 | 0 |
| `SinkCodec.ts` | 123/127 | 123/127 | 45 -> 45 | 4 (lines 322, 324, 387, 391), the base's four |
| `UntrustedDecode.ts` | 41/43 | 44/46 | 7 -> 5 | 2 (line 240, `unwalked.size > 0`), the base's two, moved from line 224 |

`node 66-mutation.mjs compare` exit 0, its output (`$TMPDIR/qd66/compare.txt`):

```text
packages/core/src/EnvelopeKeys.ts 58/58 -> 57/57, ignored 9 -> 9 (0 new)
packages/core/src/SinkCodec.ts 123/127 -> 123/127, ignored 45 -> 45 (0 new)
packages/core/src/UntrustedDecode.ts 41/43 -> 44/46, ignored 7 -> 5 (0 new)
packages/core/src/EnvelopeKeys.ts with static mutants scored 66/66
packages/core/src/UntrustedDecode.ts with static mutants scored 46/48
no touched file's score fell, and no mutant on a line the phase wrote is left open
```

- `EnvelopeKeys.ts` is one valid mutant fewer, all detected on both sides (100% -> 100%); the cause was not traced to a line.
- `UntrustedDecode.ts` lost two Ignored mutants (7 -> 5) and gained three valid ones that Stryker kills; the two survivors are the base's, on `unwalked.size > 0`, a line the phase did not write.
- The static evidence (`ignoreStatic: false`, `<S>/stryker66-static.config.mjs`, SHA-256 `4bb35fee...`, kept outside the repository) has zero Ignored mutants in both files and kills every mutant the gate run Ignored. Its report shows 3 errors in `UntrustedDecode.ts` (Stryker's own `# errors` column); the scorer excludes errored mutants from `valid`, so they sit in neither side of 46/48.
- `stryker.config.mjs` is unchanged; no `stryker66` file is tracked.

## Close scan

`$TMPDIR/qd66/close-scan.txt` (script SHA-256 `dcf0c7d0...`, as planned):

```text
ok 1 phase_base 48921088b0228724469b6624de91658c650e46c3 is an ancestor of HEAD
ok 2 packages: exactly the three sources and the bench file changed, and tests only under packages/core/test
ok 3 tests: the core test changes add lines only
ok 4 unchanged: StoredEnvelope.test.ts, packages/react, scripts, stryker.config.mjs, the core barrel, Phase 59's harness
ok 5 release: one new changeset, no version, changelog or tag
ok 6 bans: no banned path committed
ok 7 tokens: no forbidden token or milestone id on an added line
ok 8 ccr-row: the CCR-QD-457 row cites every revised document at its current Revision
ok 9 texts: no text claims the projection reads no value
ok 10 gates: house-style (the untrusted-decode budget), api-surface and dod-table unchanged
ok 11 commits: the phase's commits in order, each with exactly the trailer
ok 12 bench: the bench of record passed, and no source, bench file or check:pr script changed after it
close-scan: 12 checks passed
```

## Merge gate

- `pnpm check:pr < /dev/null`, run once, in the foreground, after `pgrep -fl "vitest|stryker run|tstyche|check-package-install"` printed nothing. Head `83b62d8a8b819b182e2257701a77161e87bf96c2` (`<S>/check-pr.head`), exit 0, 119 s.
- Last line: `run-check: ran 16 of 17 steps; "pnpm mutation" was skipped (release PRs run it).` No `ELIFECYCLE` in the log. Suites in the log: 242 files / 5971 tests, 34 / 568, 7 / 43, all passed; coverage thresholds held (the run exited 0).
- The tree since differs from that head only by `.planning/REQUIREMENTS.md` and this file (Task 3's verify checks it).

## Edge coverage

The 29 items of 66-01's table: 25 `must_haves.truths` and 4 flagged assumptions.

| Requirement | Edges | Plan | Evidence that settled it |
| --- | --- | --- | --- |
| DECL-01 | unclassified (A1) | 66-01 | RED set R15, R16, S16, S17, U22 to U25 fail on the base for the reasons recorded in `66-RED-EVIDENCE.md` |
| DECL-02 | adjacency, empty, encoding, ordering (4 truths) | 66-02 | U22 to U29, R15 to R17, S16 to S18 green on the projection; the decode and seam suites in `check:pr` |
| DECL-03 | unclassified (A2) | 66-01, 66-04 | H1 in `packages/react/test/UntrustedSeams.test.ts` cited; empty `packages/react` diff (close scan 4); ADR-QD-170 Rev 1.1 |
| DECL-04 | unclassified (A3) | 66-03, 66-04 | `66-BENCH.md` `verdict: pass`, slower 0, geomean -2.13%; changeset exists (close scan 5, 12); budget unchanged (close scan 10) |
| WX-01 | adjacency, empty, ordering (3 truths) | 66-05 | `check:pr` once, alone, exit 0, run-check line, tree since differs by two files only |
| WX-02 | adjacency, empty, encoding, ordering (4 truths) | 66-04 | register green (`PASS: 21 FAIL: 0`), `spec-revise --check` exit 0 |
| WX-03 | adjacency, empty, encoding, ordering (4 truths) | 66-04 | CCR-QD-457 row at current revisions (close scan 8, 9) |
| WX-04 | adjacency, empty, encoding, ordering (4 truths) | 66-02 | close scan 2, 3, 4, 10 |
| WX-05 | boundary, precision, concurrency (3 truths) | 66-05 | integer-cross-multiplication `compare` exit 0; alone, foreground runs; evidence run |
| WX-06 | adjacency, empty, ordering | 66-01, 66-02 | close scan 3 (added lines only), 11 (commit order) |
| WX-07 | unclassified (A4) | 66-04, 66-05 | close scan 5, 6, 7: one new changeset, no version, changelog, tag, banned path or milestone id |

WX-01 to WX-07 stay `[ ]` and `Pending`: they span every phase of the milestone and are ticked by the milestone audit.

## Deviations from Plan

None - plan executed exactly as written. Ordering check requested by the orchestrator: no 66-05 verify has the out-of-C-order list that 66-04's Task 1 verify had. Task 1's two-record list (`...-close.json ...-static.json`), Task 3's `.planning/REQUIREMENTS.md` before `.planning/phases/...` (`R` sorts before `p` in C order), and close scan check 2's bench, then `EnvelopeKeys`, `SinkCodec`, `UntrustedDecode` list were each run and passed.

## Flagged for the owner

From 66-01:
- **A1 (DECL-01).** "In-process value" is read as any value that is not the result of `JSON.parse`; "invokes that getter" as observable through a throwing accessor or a counting one.
- **A2 (DECL-03).** "Pinned by a test" is met by the existing H1 (one shallow unknown envelope key -> `MalformedPayload`); no test pins a second unknown key or a nested one under `refuse`.
- **A3 (DECL-04).** "No regression beyond that band" is read as the owner's fixed gate on one 3 + 3 run of record, host load recorded and not waited out.
- **A4 (WX-07).** "Nothing released" is read as no version, publish, tag or push and no version or changelog change; the new `.changeset/*.md` file is a record.
- The `unwalked` premise ("`walked` reads every own getter") holds under `refuse` only; under `ignore` an unwalked key's own value is read once, by the projection.

From 66-02:
- A union's `_tag` is read twice; a one-object schema's declared `_tag` is read once, as a kept value, and an undeclared one never (a rule the base did not have).
- A declared accessor that throws is still thrown out (R17, S18); under `refuse` and below the top level own accessors are still read (U27, U28).

From 66-03:
- No bench file other than `UntrustedDecode.bench.ts` holds a decode workload, so all decode workloads are in it.
- Harness debt: two copies of the A/B harness (Phase 59's and this phase's) live in phase directories; a third phase needing an A/B gate would force one harness under `scripts/`.
- The bench ran on a heavily loaded host (load averages 26 to 37, Apple M3 Pro); the verdict is a pass on the fixed gate and a quiet-machine rerun was not made. The six `*.log` files of the run are not committed (`.gitignore` carries `*.log`).

From 66-04:
- The hydration payload stays `refuse`; ADR-QD-179, BEH-QD-667 to BEH-QD-670 and INV-QD-378 are reserved ids named Unused in the CCR-QD-457 row only.

From 66-05:
- The surviving mutants (SinkCodec lines 322, 324, 387, 391 and UntrustedDecode line 240) are the base's own, on lines the phase did not write; none was suppressed or equivalence-argued here.
- The evidence run's 3 Stryker errors in `UntrustedDecode.ts` are not scored; their cause was not investigated.

## Known Stubs

None.

## Threat Flags

None.

## Self-Check: PASSED

- `83b62d8a` is an ancestor of HEAD; `66-mutation-close.json` and `66-mutation-static.json` exist; Task 1 and Task 2 verifies exited 0; `git diff` of `REQUIREMENTS.md` is eight lines changed, all DECL-01 to DECL-04.
