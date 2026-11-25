---
phase: QD-82-qadiprovider-s-registry-has-one-owner-for-its-lifetime
plan: 05
subsystem: react-provider-lease
tags: [provider, lease, registry-reset, activity, strict-mode, mutation-probe, scratch-variants]
requires: [82-04]
provides:
  - packages/react/src/QadiProvider.tsx on the lease: one registry per provider, never cleared, recycled in place (`reset()` then the latest committed subject re-seeded)
  - the three scratch variants of the fix, each caught by named tests, and the commit order with the lease observed, in 82-RED-EVIDENCE.md
  - a lease-only Stryker probe at 28 of 28 killed, with RL10 closing the one survivor
affects: [82-06, 82-07, 82-08, 82-09, 82-10]
key-files:
  created: []
  modified:
    - packages/react/src/QadiProvider.tsx
    - packages/react/test/RegistryLease.test.ts
    - .planning/phases/QD-82-qadiprovider-s-registry-has-one-owner-for-its-lifetime/82-RED-EVIDENCE.md
key-decisions:
  - "The recycle is `registry.reset()` then `registry.set(latestRef.current.atoms.subject, latestRef.current.subject)`; `latestRef` is written in an effect on `[atoms, subject]`, so a render React discards never reaches it, and the subject effect keeps its `!==` guard"
  - "`initialValues` and a hydration seed are not re-applied by a recycle: a server seed is not an authority, and LT9 to LT11 hold it"
  - "One effect, declared last, holds the lease in setup and releases it in cleanup; the deferred-dispose timer and its effect are gone, and `registryRef` is never cleared"
  - "The header doc cites ADR-QD-195 as plain text, not a link: its spec file is written by a later plan, and a link to it would not resolve yet"
  - "Decided autonomously: the one lease survivor (the `Releasing` arm of the release matcher) is closed by a new lease test, RL10, not by a change to the module or a disable comment"
requirements-completed: [LEASE-01, LEASE-02, LEASE-03, LEASE-04, WX-04, WX-06]
duration: 20min
completed: 2026-11-25
status: complete
commits: 4
plan_head_before: bfee8b038f320e6deb9a9cd630ef4f9bd194c5ad
plan_head_after: e2e9bf88e46d7e5a9ca3b7f5d5310ec5fe9bcba8
actuals:
  tokens: 5500
  tasks: 3
  commits: 4
---

# Phase QD-82 Plan 05: the provider on the lease Summary

**`QadiProvider` now builds one registry for its life and recycles it in place through the lease, one macrotask after the last release: `reset()` clears every node and the latest committed subject is written back, while `initialValues` and hydration seeds are not; every lifetime test written red on the base (LT1 to LT15, the edges unmount test) passes, and each part of the fix is shown load-bearing by a scratch variant.**

## Accomplishments

- Task 1 (tracer): `QadiProvider.tsx` drops the deferred-dispose timer and its effect, and never clears `registryRef`. It adds `latestRef` (written in an effect on `[atoms, subject]`), one `makeRegistryLease(...)` in `leaseRef` whose recycle is the reset then the subject re-seed, and one last effect on `[lease]` that calls `lease.hold()` and returns `() => lease.release()`. The comments state the construction-only `initialValues`, the seed not shown again, the pending subjectless gate, the host-subscription limit and ADR-QD-195. The whole react project passed (674 of 674 at that commit), as did `single-owner`, oxlint, house style, api-surface (942, equal to the base's line) and `pnpm typecheck`.
- Task 2: three scratch variants of the fixed provider, each restored with `cp` (`git diff --quiet HEAD -- packages/react/src` held). `skip` (no cleanup returned) fails the edges unmount test, LT9, LT10 and LT15. `dispose` (`registry.dispose()` for `reset()`) fails the edges unmount test and LT1 to LT4, LT6 to LT15. `noreseed` (no subject write) fails LT13 alone. The six pairs the plan named are all present. The commit order with the lease was observed by an instrumented run: on a reveal every consumer's passive setup runs before the provider's `PROVIDER hold`; the long hide runs the release as a passive cleanup, then one `recycle` a macrotask later, before the reveal.
- Task 3: the lease-only Stryker probe found one Survived mutant, `RegistryLease.ts:74` `Releasing: () => undefined` (a second release while one is pending leaves no state). RL3 counted defers only and the rendered tests did not observe it. RL10 (hold, release, release, hold cancels once and recycles nothing) closes it, seen red under the mutant with only RL10 failing. The re-run reads 100.00, 28 of 28 killed, 0 survived, 0 no coverage, 0 ignored, 0 timeout, and `82-mutation.mjs probe lease` exits 0. No `Stryker disable` comment.
- Final react project: 42 files, 675 tests, all passing. `packages/react/src/index.ts` equals `phase_base`; the barrel and the api-surface line are unchanged.

## Task commits

| Task | Commit | Files |
| ---- | ------ | ----- |
| 1 | 8cc55c1e `fix(82-05): a provider's registry is recycled in place through its lease` | `QadiProvider.tsx` |
| 2 | a626011e `docs(82-05): the fix's variants and the commit order with the lease` | `82-RED-EVIDENCE.md` |
| 3 (test) | c9154405 `test(82-05): a hold after a second release still cancels the one pending recycle` | `RegistryLease.test.ts` |
| 3 (evidence) | e2e9bf88 `docs(82-05): the lease's mutants, probed` | `82-RED-EVIDENCE.md` |

## Deviations from Plan

None - plan executed exactly as written. Inside the plan's latitude: the plan's Task 3 anticipated a `test(82-05)` commit "only if the probe finds a mutant to close", and it found one (RL10); the header doc cites ADR-QD-195 without a hyperlink because its spec file does not exist yet; and `82-check.mjs commit` is a post-commit check (it reads the commits since `phase_base`), so each commit was made with `git commit` and then confirmed by it. The `ORDER long hide:` evidence line joins the hide's own cleanups with the `recycle` entry the following 20 ms wait added, in the order the array held them, because the plan's verify reads `recycle` on that one line.

## Authentication Gates

None.

## Known Stubs

None.

## Threat Flags

None. No endpoint, auth path or schema changed; the lease stays out of the barrel and the `exports` map is closed. T-82-14 (disposed registry reached), T-82-15 (a retained or re-applied seed) and T-82-16 (a stale subject after a recycle) are mitigated by LT1 to LT4, LT9 to LT11 and LT6 and LT13, and each is shown caught by its variant.

## Self-Check: PASSED

- FOUND: `packages/react/src/QadiProvider.tsx`, `packages/react/test/RegistryLease.test.ts`, `82-RED-EVIDENCE.md` with the sections `the fix's variants`, `observed commit order with the lease` and `the lease mutation probe`; `packages/react/test/CommitOrder.scratch.test.tsx` is absent
- FOUND: commits 8cc55c1e, a626011e, c9154405, e2e9bf88 on `arch-wave-15`; `git rev-list --count bfee8b03..HEAD` read 4 at the last task commit
- Task 1 verify exit 0 (single-owner, latest-props effect, re-seed, reset, ADR-QD-195, react project, LT1, LT9, LT13, LT15, RL9 and the edges unmount test by name, oxlint, house style, api-surface equal, typecheck, `scan-ids`, `scan-forbidden`); Task 2 verify printed `VERIFYOK` (six variant pairs, three ORDER lines, recycle on the long hide, harness gone, `packages` clean, `single-owner`); Task 3 verify passed (probe exits 0, section recorded, no Stryker disable, lease tests pass, nothing uncommitted, `trailers`, `scan-ids`, `scan-forbidden`)

## Next Phase Readiness

Ready for 82-06. The provider is on the lease and every lifetime test is green; the later plans' specification, changeset, close-time mutation record and review work can quote the observed order and the variants.
