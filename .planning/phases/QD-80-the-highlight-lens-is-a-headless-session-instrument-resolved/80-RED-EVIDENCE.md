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

## 80-02 the lens through the dock

Each flip's after line was applied alone to a `cp`-backed copy of the committed file and run on the unchanged source: that
flip's test failed and the other nine passed. The file was restored with `cp` after each run, and
`git status --short -- packages` printed nothing afterwards.

- base: 7546f54e1a07abec7ea6aef328f9196a59a033c2
- red on the base (pick-kept): a pick, then a switch to the log and back
- red on the base (highlight-ends-picking): the highlight button pressed while picking
- red on the base (highlight-survives-move): the highlight button pressed while picking
- red on the base (same-hover-same-overlay): two pointer moves over one guard while picking
- check failed: 80-characterisation-check.mjs: packages/devtools/test/react/Lens.dock.characterisation.test.tsx differs from its first commit: sha256 1a46298d133f8af4b1719d2cc937c60155e016498a0240e75e97baf528590c9d with its flips reverted, dab45aaac1a71d410a81290259b6c559627814edb0110dc3cd5e2d6e6273ce89 at 7546f54e

## 80-03 the instrument toggle and the remounted guard

The flip's after line was applied to a `cp`-backed copy of the committed file and run on the unchanged source: the
toggle cell failed (`expected 1 to be +0`) and the registration cell passed. The file was restored with `cp`, and
`git status --short -- packages` printed nothing afterwards. The remounted-guard cell passes on the base with an
inequality, so the base gives a new id.

- base: 2cca1f46a30ea7fd50d070fc34cf3b0d7239a2b2
- red on the base (toggle-no-rerender): a memoised consumer of the context renders again when instrument is toggled
- useId: a remounted guard registers under a new id

## 80-04 the adapter regressions

Both cells of `Lens.dock.test.tsx` were run on the unchanged source: each failed on its own assertion, the first on the
listener types added again by a change in the listed guards (a second set of three on top of the first), the second on
the row marked after the switch to the log and back (`expected +0 to equal 1`).

- base: 55c79a96db057952465918e410c529b85dc3e4e7
- failed: entering picking adds three document listeners, and a change in the listed guards while picking adds none
- failed: under StrictMode a pick reveals its row once, and after a switch to the log and back the row is still marked with no second reveal

The pinned check was run once on a planted change: one assertion inside a lens cell of `QuestionsPanel.gates.test.tsx`
(`strictEqual` read as `notStrictEqual`, line 223) in a `cp`-backed copy, restored with `cp` afterwards; the run failed,
and `git status --short -- packages` printed nothing once restored.

- check failed: 80-pinned-check.mjs: packages/devtools/test/react/QuestionsPanel.gates.test.tsx: differs from its base text at line 223
