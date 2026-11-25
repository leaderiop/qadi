# Phase 82 RED evidence

Each line below was printed by a run on the phase base (`node <this directory>/82-check.mjs <mode>`), stdin closed, from the
repository root. A scratch edit was made to a copy-backed `packages/react/src/QadiProvider.tsx` and restored with `cp` from a
copy in the scratch directory; `git status --porcelain -- packages` printed nothing afterwards.

## 82-01 the check helper

- check failed: commit: 0 commits since phase_base have the subject: docs(82-01): a subject no commit has
- check failed: unchanged: packages/react/src/QadiProvider.tsx differs from phase_base
- check failed: seen-failing: no failure line in the evidence for: planted
- check failed: scan-ids: packages/react/src/QadiProvider.tsx:320 names a requirement id: // LEASE-01 planted
- check failed: scan-forbidden: packages/react/src/QadiProvider.tsx:321 uses an as cast: const planted = value as Planted;
- check failed: trailers: the message has 2 Co-Authored-By lines, not one

`trailers` is recorded through the judge the self-test drives (`judgeTrailer` on a planted message holding two trailers),
because a failing run needs a plan commit with two trailers, which no commit of this phase may be.

`single-owner` on the phase base, every line it prints (exit 1), the reasons the promotion of the registry's lifetime to
`RegistryLease.ts` removes:

- check failed: single-owner: RegistryLease.ts is missing
- check failed: single-owner: stryker.react.mjs does not mutate RegistryLease.ts
- check failed: single-owner: QadiProvider.tsx holds a timer
- check failed: single-owner: QadiProvider.tsx disposes the registry
- check failed: single-owner: QadiProvider.tsx clears registryRef
- check failed: single-owner: QadiProvider.tsx does not build one lease
- check failed: single-owner: QadiProvider.tsx does not hold and release the lease in one effect
