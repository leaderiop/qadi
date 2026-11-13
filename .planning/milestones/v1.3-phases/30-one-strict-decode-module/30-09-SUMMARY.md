---
phase: 30-one-strict-decode-module
plan: 09
subsystem: verification
tags: [mutation, merge-gate, house-style, characterisation]
plan_head_before: 1f3aeb3dcc14603aeaf5b35d3032d570c8e4eaef
plan_head_after: 0b5f2ab38b957cc77846688d237a85fa1818d01c
commits: 2
status: complete

requires:
  - phase: 30-07, 30-08
    provides: the spec records, changesets and upgrading entries
provides:
  - 30-mutation-after.json
  - a green `pnpm check:pr < /dev/null` on the final tree of the phase
affects: []

actuals:
  tokens: 6000
  tasks: 3
  commits: 2

key-files:
  created:
    - .planning/phases/30-one-strict-decode-module/30-mutation-after.json
    - packages/devtools/test/model/ExplorerSessionRefusal.test.ts
  modified:
    - packages/core/test/Policy.test.ts
    - packages/core/test/SinkCodec.test.ts
    - packages/core/test/UntrustedDecode.test.ts

key-decisions:
  - "Drop-closing tests for ExplorerSession.ts went in a new file, ExplorerSessionRefusal.test.ts, not ExplorerSession.test.ts: that file hosts the paste-box pin, and Task 3's constraint check forbids a 30-09 commit touching a characterisation file"

requirements-completed: [WX-01, WX-04, WX-05, WX-06]

duration: 25 min
completed: 2026-11-12
---

# Phase 30 Plan 09: Closing the phase Summary

The phase's history shows nothing loosened and nothing forbidden added, no mutation score ended below its baseline (the new leaf scores 0.9512), and `pnpm check:pr < /dev/null` is green on the final tree.

## Task 1: integrity checks over the phase history

| Check | Result |
|---|---|
| Gate integrity (T-30-17): RULES, EXEMPTIONS and every budget byte-identical, new constants `UNTRUSTED_DECODE_`-prefixed, no deleted lines, each script-touching commit also touches AGENTS.md, no other config changed | exit 0 |
| WX-04 forbidden tokens over added lines | exit 0 |
| WX-06 characterisation first, flips named | exit 1 on two commits, a false positive (below) |

**WX-06 finding.** The check counts any deleted line in a characterisation file as a changed expectation. Two commits deleted lines in `packages/react/test/UntrustedSeams.test.ts` and carry no `Flips:` line:

- `56214374` (`refactor(30-05)`): its only deleted line is the `@qadi/core` import line, which gained `exceedsJsonDepth` (the commit's added boundary row needed it).
- `b3435e58` (`refactor(30-06)`): deleted the same import's `exceedsJsonDepth` once 30-06 removed that export, and replaced three lines that computed the boundary row's `admitted` depth with the constant `MAX_DECODE_DEPTH - 2` plus a comment. The row's two `hydrate(...)` expectations are unchanged.

Neither changes the expected outcome of any row (no `toEqual` or `assert` over a result was removed or rewritten), so there is no flip to name. The history is not rewritten (26 commits since the base, referenced by hash in earlier summaries), and the check is not loosened. Reported for the verifier: `/gsd-verify-work`'s own run of this check will list the same two commits.

## Task 2: mutation scores

First comparison (four fresh reports) failed: `UntrustedDecode.ts` 0.7561 (LOW), and three DROPs (`Policy.ts` 0.9801 to 0.9797, `SinkCodec.ts` 0.9278 to 0.9257, `ExplorerSession.ts` 0.9162 to 0.9143). Closed with tests in commit `18959bdf`, core and devtools re-run, comparison exit 0.

| File | Base | After |
|---|---|---|
| core `Policy.ts` | 0.9801 | 0.9865 |
| core `Errors.ts` | 1.0000 | 1.0000 |
| core `SinkCodec.ts` | 0.9278 | 0.9657 |
| core `PortWireEncode.ts` | 0.6923 | 0.8621 |
| core `PortRemote.ts` | 0.8365 | 0.8654 |
| core `HydrationMetrics.ts` | 1.0000 | 1.0000 |
| core `DecodeDepthGuard.ts` | 0.9474 | 0.9474 |
| react `HydrationEngine.ts` | 0.9693 | 0.9773 |
| react `HydrationEvent.ts` | 1.0000 | 1.0000 |
| react `DeveloperSignals.ts` | 0.9663 | 0.9663 |
| audit `AuditArchive.ts` | 0.9808 | 0.9811 |
| audit `AuditEntry.ts` | 0.8000 | 0.9130 |
| devtools `model/ExplorerSession.ts` | 0.9162 | 0.9543 |
| core `UntrustedDecode.ts` (new) | n/a | 0.9512 (39 of 41) |

### Drops and the tests that closed them

- `Policy.ts`: `PolicyNotJson`'s message is asserted to carry the parser's text (`Policy.test.ts`); kills the `{}` ObjectLiteral mutant of `textFailure`.
- `SinkCodec.ts`: `decodeStoredRecord`'s five refusals are asserted by exact message (`SinkCodec.test.ts`); kills seven envelope mutants.
- `ExplorerSession.ts`: exact root, nested-path and decode-limit sentences, an empty rail loading a pasted draft, an empty rail ignoring `setPreviewing` (new `ExplorerSessionRefusal.test.ts`).
- `UntrustedDecode.ts`: tests for null, undefined, primitive and array roots under a decoder with `unwalked` slots, and one that builds a decoder inside the test and reads text. Stryker's per-test coverage attributes a decoder's arrow functions only to tests that construct a decoder inside the test body, so the module-scope decoders had hidden `decodeText` from the mutant at 195.

### Survivors of the new leaf, both equivalent

Both are at `UntrustedDecode.ts:179:5`, in `walked`'s `unwalked.size > 0 && isPlainObject(input)`:

- `unwalked.size >= 0`: with an empty set, the filter drops nothing, so `walked` returns a shallow copy of the same depth; no input distinguishes it from returning `input`.
- left operand replaced by `true`: the right operand then decides, and for an empty set that gives the same shallow copy (the null and undefined cases are guarded by `isPlainObject` itself).

### Other survivors left in the baselined files

Not required to close and not chased: `Policy.ts:1270` `value >= max` and `Policy.ts:813` `defaultFieldStrategy("")` (equivalent: any non-`"AllOf"` string gives `First`), `SinkCodec.ts` `traceExceeds` loop bounds and `refuse` guards, `ExplorerSession.ts` `issues.length === 0` and `join("\n")` (the decoder reports first issue only, so more than one issue is unreachable), `railIndex` on a `Draft` (no `index`, so `undefined` either way) and `choose`'s `refusal === undefined` (a refusal never exists without a pending edit).

## Task 3: merge gate on the final tree

- Ran on commit `0b5f2ab38b957cc77846688d237a85fa1818d01c` (HEAD after the last 30-09 commit), nothing uncommitted under packages, scripts, spec, apps, .changeset, AGENTS.md or CONTRIBUTING.md.
- `pnpm check:pr < /dev/null`: exit 0, 91 seconds (16 of 17 steps; `pnpm mutation` skipped by design). The 16 steps are typecheck, lint, circular, tstyche, coverage, bdd, spec:examples, spec:verify:strict, spec:gates, spec:claims, spec:api, spec:package, example, spec:website-examples, website, spec:publish.
- Unit tests: 182 files, 4705 tests passed; BDD: 34 files, 568 tests passed; examples: 7 files, 42 tests passed.
- Coverage (the workspace `pnpm coverage` step merges the packages; per-package thresholds core 95%, others 90% held): all files 99.74% lines (5979/5994), 99.42% statements, 97.99% branches, 99.21% functions.
- The constraint check (30-09 commits touch only package src/test and the phase directory, none a characterisation file, nothing uncommitted): exit 0.

## Commits

| Commit | Message |
|---|---|
| `18959bdf` | test(30-09): kill the mutants the decoder's move left in Policy, SinkCodec, ExplorerSession and the leaf |
| `0b5f2ab3` | chore(30-09): mutation scores after the untrusted decoder |

## Deviations from Plan

**1. [Rule 3 - Blocking] ExplorerSession drop closed in a new test file.** The plan names "the file's own unit test", but `ExplorerSession.test.ts` carries the paste-box characterisation pin and Task 3's check rejects a 30-09 commit that touches it. The new tests live in `packages/devtools/test/model/ExplorerSessionRefusal.test.ts`.

**2. WX-06 check false positive** on `56214374` and `b3435e58`, described under Task 1; no change made.

`30-mutation-base.json` is in one commit (`chore(30-01)`), unchanged.

## Known Stubs

None.

## Threat Flags

None.

## Self-Check: PASSED

- `30-mutation-after.json`, `ExplorerSessionRefusal.test.ts`: present.
- `18959bdf`, `0b5f2ab3`: ancestors of HEAD.
