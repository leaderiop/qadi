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

`scan-ids` was run again after the CCR-QD-472 row and the README revision, and failed on the same one-line row of
`spec/README.md`, whose older entries hold a decision number; only the newest entry of that row is new text, so the judge
now reads the text before its first `<br>`.

- check failed: scan-ids: spec/README.md:13 names a decision number

## review fixes (iteration 1)

Each scratch edit was made to `useLens.ts` from a copy taken just before it and restored with `cp`; `git status --short --
packages` showed only the intended files afterwards.

### WR-01 the consumed click's default action

The cell was run with `event.preventDefault();` deleted from the click handler.

- failed: a click a pick consumes has its default action cancelled, and a click over no guard keeps it

### WR-02 the guards are read when the event arrives

The cell was run with the handlers reading a guard list captured when the listeners were added.

- failed: a guard that registers while picking is found by the next pointer move and the next click

### WR-03 a click that made a pick is consumed whatever a subscriber does

The cell was run on the unchanged handler (`if (!lens.choose(...)) return;` before the two default-action calls): the
subscriber's throw skipped them (`the click was consumed: expected false to be true`).

- failed: a click that made a pick is still consumed when a subscriber throws while being told of it, and its failure still reaches the dispatch

### IN-03 a click with no pointer is placed by its target

The two new test files were run before `gateIdOfClick` existed and before the handler used it: the helper's three cells
failed (`gateIdOfClick is not a function`), and the adapter cell failed on the unchanged handler, which read the point
(`a control no guard holds keeps its click: expected false to be true`).

- failed: a click that reports a pointer is placed by its coordinates, wherever its target is
- failed: a click with no pointer is placed by the element it was made on, not by a point
- failed: a click with no pointer and no element to name falls back to its coordinates
- failed: a click made with no pointer is placed by the control it was made on, not by a point it did not report

### IN-05 a reveal belongs to the moment of its pick

The reveal cell of `LensSession.test.ts` was changed first (a cancel, a drawing then a cancel, a highlight and a highlight
that moves nothing each disarm; a hover does not) and run on the unchanged session (`expected true to be false`; 1 failed,
14 passed).

- failed: a pick reveals its row once, and only for its own guard; toggle, cancel and highlight disarm a reveal that was not taken and hover does not; takeReveal publishes nothing

### IN-06 one subscription to the lens

The new cell was run with `QuestionsPanel.tsx` and `useLens.ts` taken from the commit before the change, each restored with
`cp` afterwards (`while mounted: expected 2 to equal 1`; 1 failed, 2 passed).

- failed: the panel holds one subscription to the lens while it is mounted and none after

### IN-01 the react characterisation's title and header follow its flip

`toggle-no-rerender` became a declared multi-line flip (`edits`: two header lines, the title and the assertion; the
assertion line is the one seen red on the base above). The extended check was run against the file with only the
assertion applied, and against the restored base text; the file was then moved by the script's own `flip` command.

- check failed: 80-characterisation-check.mjs --all-flipped: flip toggle-no-rerender: only some of its edits are applied
- check failed: 80-characterisation-check.mjs --all-flipped: flip toggle-no-rerender is not applied

### IN-02 the Escape exit is asserted by something that can fail

The held assertion `notInclude(..., "Escape —")` was run against a scratch edit of `useLens.ts` that ignores `Escape` (restored
with `cp`): all 26 cells passed, so it could not fail. The replacement assertion (the button text is the idle text again)
was run against the same edit and failed. The pinned check refused the edit before it was declared as an in-region edit
with its reason.

- check failed: 80-pinned-check.mjs: packages/devtools/test/react/QuestionsPanel.gates.test.tsx: differs from its base text at line 391
- failed: leaves the mode on Escape

## review fixes (iteration 2)

### IN-01 a hover from idle leaves the reveal, and says so

`hover` acts only from `Picking`, and a reveal is armed only by `choose`, which leaves `Picking`, so the rule is held by the
one state where both are true: `Idle` between a pick and the listeners coming off. The cell's hover line was run against a
scratch edit of `LensSession.ts` that made `hover` disarm (restored with `cp`): `expected false to be true`; 1 failed, 14
passed. The title now states the rule as it holds.

- failed: a pick reveals its row once, and only for its own guard; toggle, cancel and highlight disarm a reveal that was not taken, and a hover, which moves nothing from idle, does not; takeReveal publishes nothing
