---
phase: QD-82-qadiprovider-s-registry-has-one-owner-for-its-lifetime
plan: 09
subsystem: react-registry-lifetime-close
tags: [mutation-close, stryker, react, registry-lease, close-scans, ancestry]
requires: [82-08]
provides:
  - 82-mutation-close.json, the react group (four files) and the lease group measured at one head, each by its own Stryker run made alone with stdin closed
  - the close facts, the edge-coverage lift (30 surfaced, 30 lifted) and the prohibition recall
affects: [82-10]
key-files:
  created:
    - .planning/phases/QD-82-qadiprovider-s-registry-has-one-owner-for-its-lifetime/82-mutation-close.json
  modified: []
key-decisions:
  - "Decided autonomously: no survivor needed closing, so no test(82-09) commit exists; the close record is taken as measured, with the three QuestionBook.ts survivors the base already held carried through unchanged (never re-baselined, no Stryker disable comment, no EXAMINED entry)"
  - "Decided autonomously: the two Stryker runs were made one after the other on one head (04c19a2e, the head of 82-08), so the record's every group is measured on one commit; the record was committed after both, before the checks that need its commit"
requirements-completed: [WX-04, WX-05, WX-06, WX-07, LEASE-02]
duration: 12min
completed: 2026-11-25
status: complete
commits: 1
plan_head_before: 04c19a2eeb8853cbd4d307936ec5920fe3c86731
plan_head_after: 45f6349ceac5647c16c6ed72324c7619532c0a8b
actuals:
  tokens: 7500
  tasks: 2
  commits: 1
---

# Phase QD-82 Plan 09: The mutation close, the close scans and the close facts Summary

**The four react files close at 147/150 exactly as at the base (the three `QuestionBook.ts` survivors carried through, no new open or Ignored mutant), `RegistryLease.ts` closes 28/28 with every kill in its own test file, and the scans, earlier checks and both test-before-fix pairs hold.**

phase_base: 16f09f776fbb9c8c8c2b9b9452e7cf6994a727e3

## Close facts

Each command and its last line, run from the repository root with stdin closed and nothing else running.

```
stryker react (alone): Final mutation score of 98.00 is greater than or equal to break threshold 80
  node 82-mutation.mjs record close react: wrote react into 82-mutation-close.json
stryker lease (alone, --disableBail): Final mutation score of 100.00 is greater than or equal to break threshold 80
  node 82-mutation.mjs record close lease: wrote lease into 82-mutation-close.json
node 82-mutation.mjs compare: no file has an open or Ignored mutant its base did not have, and every score that fell lost only killed mutants
node 82-check.mjs scan-ids: scan-ids: no id or phase wording in added lines
node 82-check.mjs scan-forbidden: scan-forbidden: no forbidden form in added lines
node 82-check.mjs trailers: trailers: 34 plan commits, each with one Claude trailer
node 82-check.mjs single-owner: single-owner: the registry's lifetime is decided once, in RegistryLease.ts
git diff phase_base -- AGENTS.md scripts/check-house-style.mjs .oxlintrc.json pnpm-lock.yaml pnpm-workspace.yaml: empty
git diff --name-only phase_base -- package.json **/package.json: empty
vitest run --project react packages/react/test/InstrumentToggle.characterisation.test.tsx: Tests  2 passed (2)
```

Per-file close scores, from `compare` (killed/total; survived; no coverage; Ignored):

```
packages/react/src/DecisionOutcome.ts   8/8 -> 8/8,   survived 0 -> 0, no coverage 0 -> 0, ignored 11 -> 11 (0 new)
packages/react/src/QuestionBook.ts     85/88 -> 85/88, survived 3 -> 3, no coverage 0 -> 0, ignored 0 -> 0 (0 new)
packages/react/src/HydrationEvent.ts   33/33 -> 33/33, survived 0 -> 0, no coverage 0 -> 0, ignored 8 -> 8 (0 new)
packages/react/src/SweepScheduler.ts   21/21 -> 21/21, survived 0 -> 0, no coverage 0 -> 0, ignored 2 -> 2 (0 new)
packages/react/src/RegistryLease.ts    28/28, survived 0, no coverage 0, ignored 0, timeout 0 (absolute bar, every killer in RegistryLease.test.ts)
```

The react group is 147/150 as at the base (Stryker total 98.00). The three survivors are the base's: `QuestionBook.ts:109`
(`BooleanLiteral -> false`) and `QuestionBook.ts:170` (`EqualityOperator -> excess < 0` and `ConditionalExpression -> false`).
No file under `packages/react/src` holds a `Stryker disable` comment.

ancestry: test before fix (2 pairs)

- `9e71d664` `test(82-02): a provider revealed after a long hide pins the decision and no error` is an ancestor of `8cc55c1e` `fix(82-05): a provider's registry is recycled in place through its lease`.
- `e0be9a0e` `test(82-04): the registry lease's rule over every state, seen red` is an ancestor of `d7fc1f1e` `feat(82-04): a package-private lease decides when a provider's registry is recycled`.

archived checks: unchanged from the base

`node 81-archived-checks.mjs` printed the five lines the base printed, byte for byte (the one failing line is `79-pinned-check.mjs` for
TF29, the flip Phase 81 made on purpose). The React-held `InstrumentToggle.characterisation.test.tsx` passes.

WX-04 ordering holds by construction: no budget in `scripts/check-house-style.mjs` changed, so no budget change could precede
its `AGENTS.md` table (`AGENTS.md`, `scripts/check-house-style.mjs` and `.oxlintrc.json` equal `phase_base`).

## Edge coverage

All thirty items of the probe, by requirement and category (no SPEC; the fallback lift), with where each is lifted:

| # | Requirement | Category | Lifted as | Plan |
| - | ----------- | -------- | --------- | ---- |
| 1 | LEASE-01 | unclassified | flagged assumption | 82-09 |
| 2 | LEASE-02 | unclassified | flagged assumption | 82-09 |
| 3 | LEASE-03 | adjacency | truth (RL1, RL6) | 82-04 |
| 4 | LEASE-03 | empty | truth (RL4) | 82-04 |
| 5 | LEASE-03 | ordering | truth (RL3, RL5) | 82-04 |
| 6 | LEASE-04 | boundary | truth (LT5 against LT1) | 82-02 |
| 7 | LEASE-04 | precision | truth (every frame read; the re-seed by identity) | 82-03, 82-05 |
| 8 | LEASE-05 | unclassified | flagged assumption | 82-09 |
| 9 | WX-01 | adjacency | backstop | 82-10 |
| 10 | WX-01 | empty | backstop | 82-10 |
| 11 | WX-01 | ordering | backstop | 82-10 |
| 12 | WX-02 | adjacency | backstop | 82-08 |
| 13 | WX-02 | empty | backstop | 82-08 |
| 14 | WX-02 | encoding | backstop | 82-08 |
| 15 | WX-02 | ordering | backstop | 82-08 |
| 16 | WX-03 | adjacency | backstop | 82-08 |
| 17 | WX-03 | empty | backstop | 82-08 |
| 18 | WX-03 | encoding | backstop | 82-08 |
| 19 | WX-03 | ordering | backstop | 82-08 |
| 20 | WX-04 | adjacency | backstop | 82-01 |
| 21 | WX-04 | empty | backstop | 82-01 |
| 22 | WX-04 | encoding | backstop | 82-01 |
| 23 | WX-04 | ordering | backstop | 82-09 |
| 24 | WX-05 | boundary | backstop | 82-01, 82-09 |
| 25 | WX-05 | precision | backstop | 82-01, 82-09 |
| 26 | WX-05 | concurrency | backstop | 82-01, 82-09 |
| 27 | WX-06 | adjacency | truth (LT5 failing under a scratch edit) | 82-02 |
| 28 | WX-06 | empty | backstop | 82-01 |
| 29 | WX-06 | ordering | backstop | 82-09 |
| 30 | WX-07 | unclassified | flagged assumption | 82-09 |

Surfaced 30; authored 26 into `must_haves` and 4 as flagged assumptions.

The four flagged assumptions, held as stated in the plan: LEASE-01 (a hide longer than a macrotask is pinned with a 50 ms real
wait under React 19.3.1 and effect 4.1.2 as installed; a later React that defers passive effects past a macrotask is not
covered), LEASE-02 ("under the React mutation gate" is read as mutated by `stryker.react.mjs` and judged by the phase scorer's
absolute bar, with Stryker's own `break: 80` the package-level gate), LEASE-05 (ADR-QD-103 states no registry disposal; it was
read and is recorded as unchanged), and WX-07 (the labels LT1 to LT15 and RL1 to RL9 are file-local test names, as P4, SD3 and
SUBJ1 already are, not plan-local ids).

edge items: 30 surfaced, 30 lifted

## Prohibition recall

The values and safety prohibitions kept, and the plans that hold them; none dropped as canon.

- **A recycle never re-applies a seed as an authority** (ADR-QD-039, INV-QD-028, ADR-QD-017): held by 82-03 (LT9 pins that a
  seeded allow is never shown again after a recycle) and 82-05 (`reset()` clears every node and neither `initialValues` nor a
  hydration seed is written back), recorded by 82-06 (ADR-QD-195) and 82-07 (the behaviours and invariants), and named in 82-08's
  changeset as a loss a host can see.
- **A recycle never re-seeds a stale subject**: held by 82-03 (the subject in the first frame, the accepted straggler) and 82-05
  (the write-back is the latest committed subject, `registry.set(latest.atoms.subject, latest.subject)`, never an earlier one),
  recorded by 82-06 and 82-07.
- **No consumer reaches an unusable registry** (INV-QD-409): held by 82-04 (the lease recycles, it never disposes) and 82-05 (the
  provider builds one registry for its life and never calls `dispose()`; `single-owner` fails on any dispose or `registryRef`
  clear), recorded by 82-06 and 82-07, and checked again at this close by `single-owner`.

## Task commits

| Task | Commit | Files |
| ---- | ------ | ----- |
| 1 | 45f6349c `docs(82-09): the mutation close of the react files and the lease` | `82-mutation-close.json` |
| 2 | none: its output is this file, committed as `docs(82-09): the close facts` | `82-09-SUMMARY.md` |

## Deviations from Plan

None - plan executed exactly as written. The plan's `commit` mode of `82-check.mjs` is a post-hoc check (it judges a commit that
already exists), so Task 1's commit was made first and its verify run after it, as the same check does for 82-01.

## Authentication Gates

None.

## Known Stubs

None. No file under `packages/` changed in this plan.

## Threat Flags

None. Only the close record and this file were added under `.planning/`; no endpoint, auth path or schema changed. T-82-25 is
mitigated (each record refused a tree whose measured files differed from HEAD, each run was alone with stdin closed, and
`compare` applied the base floor and the lease's absolute bar); T-82-26 is mitigated (both pairs checked with
`git merge-base --is-ancestor`); T-82-SC is mitigated (no manifest, lockfile or workspace file differs from `phase_base`).

## Issues Encountered

None. No survivor was open, so no `test(82-09)` commit was needed. The close is taken again after the review fixes in 82-10
(D-16), with `record close <group> --restart` from the then-current head.

## Next Phase Readiness

Ready for 82-10: it re-takes this close at its own head after the review fixes, and carries WX-01's backstop.

## Self-Check: PASSED

- FOUND: `82-mutation-close.json` holding the `react` and `lease` groups, the lease's invocation ending `--disableBail`
- FOUND: commit 45f6349c, an ancestor of HEAD
- The two task verifies pass; `compare` exits 0
