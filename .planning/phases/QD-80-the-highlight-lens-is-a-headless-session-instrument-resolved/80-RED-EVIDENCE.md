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

## 80-05 the lens session

Each title was run against two scratch stubs, never committed: the inert one (every command a no-op, `choose` and
`takeReveal` false) and the eager one (starts picking, every command publishes a fresh snapshot, `highlight` keeps
picking, `choose`, `takeReveal` and `isPicking` always true). Each title below failed under the stub named; a title that
failed under both is listed under the inert one.

- stubs: inert and eager
- failed (eager): a new session is idle, draws nothing and holds no pick
- failed (inert): toggle from idle enters picking with nothing drawn and drops the pick; toggle while picking returns to idle with nothing drawn and nothing picked
- failed (inert): a hover while idle changes nothing and publishes nothing; a hover while picking draws the guard under the pointer, or nothing; a hover over the guard already drawn publishes nothing
- failed (inert): a choose while idle consumes nothing and publishes nothing; a choose over nothing while picking consumes nothing and keeps picking; a choose over a guard while picking consumes the click, picks it and leaves picking
- failed (inert): cancel while picking returns to idle with nothing drawn and nothing picked; cancel while idle clears the drawing and keeps the pick; cancel while idle with nothing drawn publishes nothing
- failed (inert): highlight while idle draws the guards asked for and keeps the pick; highlight with the same guards publishes nothing; highlight with the same guards in another order publishes; highlight while picking ends picking and draws the guards asked for
- failed (inert): highlight with no guards while idle draws nothing and keeps the pick
- failed (inert): a published snapshot keeps the array it was given
- failed (inert): a repeated cancel, hover or highlight publishes once
- failed (inert): a pick reveals its row once, and only for its own guard; toggle disarms a reveal that was not taken; takeReveal publishes nothing
- failed (inert): a listener told of a pick can take its reveal
- failed (inert): a command run from inside a listener sees the snapshot already published
- failed (inert): pickedOf reads the pick of an idle snapshot and nothing while picking; isPicking is true only while picking
- failed (eager): every sequence of commands keeps picking free of a pick and draws at most one guard while picking
- failed (eager): a command publishes exactly when the snapshot changes

## 80-06 the tenth store

The store-list cell, the bare-lens cell and the per-store sweep were changed first and run on the unchanged dock model
(`DockModel.test.ts` and `ConfigureRule.test.ts`: 8 failed, 77 passed).

- failed: a built model's members with subscribe and getSnapshot are exactly this list
- failed: a bare model holds the lens idle, with nothing drawn and nothing picked
- failed: CR16 a fresh literal holding the eight inputs notifies no store and reads no registry, thunk or source
- failed: CR17 an omitted input and one holding undefined are one input: nothing is notified and nothing is read
- failed: CR18 an omitted capacity, an undefined one and the default are one bound: the timeline snapshot stays and no read starts
- failed: CR19 a bare build reads what an empty input read in every store, and configuring an empty input right after it notifies none
- failed: CR20 each input moved alone makes the store it reaches react
- failed: CR22 a reader subscribed to every store of a bare dock before its first configure hears 2, 2, 3, 3, 0, 1, 0, 2, 1 and 0 notifications while the poll layer is still building, and one more on three stores once it has built

## 80-07 the adapter

The panel, the dock and the seam were changed first and `Lens.dock.characterisation.test.tsx` was run unflipped on the
changed code (3 failed, 7 passed). Four flips sit on three titles; every other cell, the held `scrolls() === 1` line
included, still holds.

- failed (unflipped): a pick, then a switch to the log and back
- failed (unflipped): the highlight button pressed while picking
- failed (unflipped): two pointer moves over one guard while picking

## 80-08 the context value

The type pin was written first and run on the unchanged provider (`pnpm test:tstyche
packages/react/test/QadiProvider.tst.ts`: 2 failed, 2 total, in both passes).

- failed: the context value is the atoms, the registry and the gates
- failed: a consumer reads the gates from the context, and instrumentation is not a field of it

## 80-09 the phase-relative wording scan

`scan-ids` was run on the committed ADR-QD-193 tree and failed on the one-line Change History row of
`spec/traceability.md`, an old entry of which holds the scanned wording; the row sits in the Document Control table, not
under a Change History heading, which the judge looked for. The judge now treats that row as history, and its self-test
holds three cases (the row is exempt, another Document Control row is flagged, an id in the row is flagged).

- check failed: scan-ids: spec/traceability.md:13 has phase-relative wording
