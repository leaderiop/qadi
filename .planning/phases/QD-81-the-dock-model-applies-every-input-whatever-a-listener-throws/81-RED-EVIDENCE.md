# Phase 81 RED evidence

Each line below was printed by a run on the phase base (`node <this directory>/81-check.mjs <mode>`), stdin closed, from the
repository root. A scratch edit was made to a copy-backed `packages/devtools/src/model/DockModel.ts` and restored with
`cp` from a copy in the scratch directory; `git status --porcelain -- packages` printed nothing afterwards.

## 81-01 the check helper

- check failed: commit: 0 commits since phase_base have the subject: docs(81-01): a subject no commit has
- check failed: unchanged: packages/devtools/src/model/DockModel.ts differs from phase_base
- check failed: seen-failing: no failure line in the evidence for: planted
- check failed: scan-ids: packages/devtools/src/model/DockModel.ts:452 names a requirement id: // COLL-01 planted
- check failed: scan-forbidden: packages/devtools/src/model/DockModel.ts:453 uses an as cast: const planted = value as Planted;
- check failed: trailers: the message has 2 Co-Authored-By lines, not one

`trailers` is recorded through the judge the self-test drives (`judgeTrailer` on a planted message holding two trailers),
because a failing run needs a plan commit with two trailers, which no commit of this phase may be.

`single-source` on the phase base, every line it prints (exit 1), the reasons the promotion of the collect-and-rethrow rule
removes:

- check failed: single-source: callAll is not declared in ExternalStore.ts
- check failed: single-source: collect loop outside callAll: packages/devtools/src/model/ExternalStore.ts:78
- check failed: single-source: collect loop outside callAll: packages/devtools/src/model/ExternalStore.ts:211
- check failed: single-source: throwCollected is reached other than through callAll
- check failed: single-source: DockModel.ts holds a try
