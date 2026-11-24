# Phase 80 RED evidence

Each line is a failure seen once, on the base or on a planted input, before the thing that makes it pass was relied on.
A check is trusted only after it is seen to fail here.

## 80-01 the check helper

Each run mode of `80-check.mjs`, driven once on a planted input. Scratch edits to `DockModel.ts` were made from a copy in
the scratch directory and restored with `cp`; `git status --porcelain -- packages` printed nothing afterwards.

- check failed: commit: 0 commits since phase_base have the subject: docs(80-01): a wrong subject
- check failed: unchanged: packages/devtools/src/model/DockModel.ts differs from phase_base
- check failed: seen-failing: no failure line in the evidence for: planted
- check failed: scan-ids: packages/devtools/src/model/DockModel.ts:444 names a requirement id: // LENS-01 scratch
- check failed: scan-forbidden: packages/devtools/src/model/DockModel.ts:445 uses an as cast: const planted = value as Planted;
- check failed: branch: no useId evidence line
