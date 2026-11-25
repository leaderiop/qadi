# Phase 83 RED evidence

Every line below was produced by running the named command from the repository root on the phase base tree with stdin
closed. A `- check failed: <mode>: <first stderr line>` line is a run of `node <D>83-check.mjs <mode>` that exited 1
(the mode seen failing once), made by planting the fault named in its line and restoring the file from a copy kept in the
scratch directory with `cp`; `git status --porcelain -- packages scripts AGENTS.md` printed nothing after the last
restore. The three structural modes (`no-store`, `single-fold`, `stale-path`) are run on the base tree as it is, and
every stderr line each printed is listed after its line: those are the reasons the phase removes. Later plans append
their own sections.

## 83-01 the check helper

- check failed: commit: 0 commits since phase_base have the subject: docs(83-01): a wrong subject
- check failed: unchanged: packages/devtools/src/model/DiagnosticsFeed.ts differs from phase_base
- check failed: seen-failing: no failure line in the evidence for: planted
- check failed: scan-ids: packages/devtools/src/model/DiagnosticsFeed.ts:233 names a requirement id: // DIAG-01 planted
- check failed: scan-forbidden: packages/devtools/src/model/DiagnosticsFeed.ts:234 uses an as cast: const planted = value as Planted;
- check failed: trailers: db22074b feat(83-01): planted: the message has 2 Co-Authored-By lines, not one
- check failed: registers: the budget holds 0 Diagnostics type-test keys, not one:
- check failed: no-store: DiagnosticsStore named in packages/devtools/src/index.ts:35
- check failed: single-fold: foldReading is not declared as an exported function
- check failed: stale-path: packages/devtools/src/model/DiagnosticsStore.ts exists

How each was produced:

- `commit`: `commit "docs(83-01): a wrong subject" <D>83-check.mjs`, a subject no commit carries.
- `unchanged`: a comment line appended to `packages/devtools/src/model/DiagnosticsFeed.ts` (a copy kept first), then
  `unchanged packages/devtools/src/model/DiagnosticsFeed.ts`.
- `seen-failing`: a planted test file holding one `it("planted")` in the scratch directory, with no evidence line for it.
- `scan-ids` and `scan-forbidden`: two lines appended to a copy-backed `DiagnosticsFeed.ts`, `// DIAG-01 planted` and
  `const planted = value as Planted;`.
- `trailers`: a scratch repository whose one plan commit carries two Claude trailers, with its own `phase_base` in a
  scratch `TMPDIR`.
- `registers`: the budget key `packages/devtools/test/model/DiagnosticsStore.tst.ts` of a copy-backed
  `scripts/check-house-style.mjs` renamed to `packages/devtools/test/model/Planted.tst.ts`.

### `no-store` on the base tree

```
DiagnosticsStore named in packages/devtools/src/index.ts:35
DiagnosticsStore named in packages/devtools/src/index.ts:40
DiagnosticsStore named in packages/devtools/src/model/DiagnosticsFeed.ts:27
DiagnosticsStore named in packages/devtools/src/model/DiagnosticsFeed.ts:32
DiagnosticsStore named in packages/devtools/src/model/DiagnosticsFeed.ts:33
DiagnosticsStore named in packages/devtools/src/model/DiagnosticsFeed.ts:144
DiagnosticsStore named in packages/devtools/src/model/DiagnosticsFeed.ts:169
DiagnosticsStore named in packages/devtools/src/model/DiagnosticsFeed.ts:187
DiagnosticsStore named in packages/devtools/src/model/DiagnosticsFeed.ts:212
DiagnosticsStore named in packages/devtools/src/model/DiagnosticsStore.ts:146
DiagnosticsStore named in packages/devtools/src/model/DiagnosticsStore.ts:163
DiagnosticsStore named in packages/devtools/src/model/DiagnosticsStore.ts:239
DiagnosticsStore named in packages/devtools/src/model/DockModel.ts:56
DiagnosticsStore named in packages/devtools/src/model/ExternalStore.ts:6
DiagnosticsStore named in packages/devtools/src/model/Gates.ts:39
DiagnosticsStore named in packages/devtools/src/model/GatesFeed.ts:31
DiagnosticsStore named in packages/devtools/src/model/PortCards.ts:22
DiagnosticsStore named in packages/devtools/src/react/DevtoolsDock.tsx:20
DiagnosticsStore named in packages/devtools/src/react/index.ts:21
DiagnosticsStore named in packages/devtools/src/react/useDiagnostics.ts:15
DiagnosticsFeed.ts holds marking
off() is not exactly runs.stop(), sampled = false and view.set(diagnosticsOff)
the diagnostics module builds a store
```

### `single-fold` on the base tree

```
foldReading is not declared as an exported function
keep is called outside foldReading: packages/devtools/src/model/DiagnosticsStore.ts:171
keep is called outside foldReading: packages/devtools/src/model/DiagnosticsStore.ts:172
keep is called outside foldReading: packages/devtools/src/model/DiagnosticsStore.ts:173
keep is called outside foldReading: packages/devtools/src/model/DiagnosticsStore.ts:174
keep is called outside foldReading: packages/devtools/src/model/DiagnosticsStore.ts:175
a reading field is compared with ===: packages/devtools/src/model/DiagnosticsStore.ts:178
a reading field is compared with ===: packages/devtools/src/model/DiagnosticsStore.ts:179
a reading field is compared with ===: packages/devtools/src/model/DiagnosticsStore.ts:180
a reading field is compared with ===: packages/devtools/src/model/DiagnosticsStore.ts:181
```

### `stale-path` on the base tree

```
packages/devtools/src/model/DiagnosticsStore.ts exists
packages/devtools/test/model/DiagnosticsStore.test.ts exists
packages/devtools/test/model/DiagnosticsStore.tst.ts exists
AGENTS.md:566 names an old path
packages/devtools/src/index.ts:35 names an old path
packages/devtools/src/index.ts:40 names an old path
packages/devtools/src/model/DiagnosticsFeed.ts:33 names an old path
packages/devtools/src/model/DiagnosticsFeed.ts:144 names an old path
packages/devtools/src/model/DockModel.ts:56 names an old path
packages/devtools/src/model/GatesFeed.ts:31 names an old path
packages/devtools/src/model/PortCards.ts:22 names an old path
packages/devtools/src/react/DevtoolsDock.tsx:20 names an old path
packages/devtools/src/react/index.ts:21 names an old path
packages/devtools/src/react/useDiagnostics.ts:15 names an old path
packages/devtools/test/builtFeeds.ts:12 names an old path
packages/devtools/test/dockModelFixtures.ts:11 names an old path
packages/devtools/test/model/ConfigureInputs.tst.ts:18 names an old path
packages/devtools/test/model/ConfigureRule.test.ts:19 names an old path
packages/devtools/test/model/DiagnosticsFeed.test.ts:28 names an old path
packages/devtools/test/model/DiagnosticsStore.test.ts:29 names an old path
packages/devtools/test/model/DiagnosticsStore.tst.ts:17 names an old path
packages/devtools/test/model/DockModel.test.ts:50 names an old path
packages/devtools/test/model/DockModel.test.ts:51 names an old path
packages/devtools/test/model/PortCards.test.ts:18 names an old path
packages/devtools/test/react/DevtoolsDock.test.tsx:41 names an old path
packages/devtools/test/react/DiagnosticsScreens.test.tsx:14 names an old path
packages/devtools/test/react/useDiagnostics.test.tsx:6 names an old path
scripts/check-house-style.mjs:771 names an old path
spec/behaviors/28-devtools-screens.md:2461 names an old path
spec/behaviors/28-devtools-screens.md:2715 names an old path
spec/behaviors/28-devtools-screens.md:2716 names an old path
spec/invariants.md:3829 names an old path
spec/invariants.md:3833 names an old path
spec/invariants.md:4335 names an old path
spec/invariants.md:4337 names an old path
spec/invariants.md:4341 names an old path
spec/invariants.md:4445 names an old path
spec/invariants.md:4449 names an old path
spec/overview.md:916 names an old path
spec/overview.md:917 names an old path
spec/overview.md:918 names an old path
spec/overview.md:919 names an old path
spec/overview.md:923 names an old path
spec/traceability.md:70 names an old path
spec/traceability.md:168 names an old path
spec/traceability.md:208 names an old path
spec/traceability.md:217 names an old path
spec/traceability.md:596 names an old path
spec/traceability.md:597 names an old path
```

## 83-02 the pinned-test check

- check failed: pinned: packages/devtools/test/model/DockModel.test.ts: differs from its base text at line 1833

How it was produced: one blank line appended to `packages/devtools/test/model/DockModel.test.ts` (a copy kept first in the
scratch directory), then `node <D>83-pinned-check.mjs`; the file was restored with `cp` and `git diff --quiet HEAD -- packages
scripts` held. On the tree as it stands the check prints `pinned: 6 files hold their base text, 0 of 2 born files held, 0 of
1 declared flips applied`, and `--all-applied` fails for the four reasons that are still true (the `F2` flip is unapplied and
unrecorded, and both born files do not exist). The `F2` flip is declared here, in the scratch copy of `81-pinned-check.mjs`,
and in the decision record: `DiagnosticsFeed.test.ts` `F2` asserts `reading.questions` is undefined, which stops compiling
once the field is removed, so the phase rewrites that one assertion to `assert.isFalse("questions" in reading);`, the title
unchanged. The `- flip F2: ` evidence line is written by the plan that applies it.

## 83-02 the earlier checks

- check failed: earlier: 81-pinned-check.mjs: exit 1: packages/devtools/test/model/ConfigureRule.test.ts: differs from its base text at line 919
- earlier on the tree: 81-pinned-check.mjs: exit 0: pinned: 8 files hold their base text, 4 of 5 declared flips applied
- earlier on the tree: 81-check.mjs single-source: exit 0: single-source: one collect loop, in callAll
- earlier on the tree: 79-pinned-check.mjs: exit 1: packages/devtools/test/model/TimelineFeed.test.ts: TF29: an assertion or a line other than a construction changed (the one accepted failing line; the other four archived lines exit 0)

How it was produced: one blank line appended to `packages/devtools/test/model/ConfigureRule.test.ts` (a copy kept first in the
scratch directory), then `node <D>83-earlier-checks.mjs`; the scratch copy of `81-pinned-check.mjs` failed on it and the file
was restored with `cp`. The scratch copy declares the rename's four import edits and the `F2` flip; `4 of 5 declared flips
applied` is the `F2` flip not yet applied. Phase 81's directory and the archive are only read.

## 83-03 the characterisation

- characterisation green on the base: Tests  11 passed (11)
- failed (no-guard): FC9 a sample the superseded run takes is dropped, so the feed stays Starting until the newest run samples
  - expected [ { status: 'Starting', …(2) }, …(1) ] to deeply equal [ { status: 'Starting', …(2) } ]
- failed (no-keep): FC2 configure with empty options publishes Starting over the empty reading, then Live with the first sample folded in
  - expected [ { status: 'Starting', …(2) }, …(1) ] to deeply equal [ { status: 'Starting', …(2) }, …(1) ]
- failed (no-keep): FC3 identical samples after the first Live publish nothing
  - expected [ { status: 'Live', …(2) }, …(2) ] to deeply equal []
- failed (no-keep): FC4 one field moving publishes once, and the other fields keep their references
  - expected [ { status: 'Live', …(2) }, …(1) ] to deeply equal [ { status: 'Live', …(2) } ]
- failed (no-keep): FC7 restart over an unchanged world publishes Starting then Live over the same reading object
  - expected [ { status: 'Starting', …(2) }, …(1) ] to deeply equal [ { status: 'Starting', …(2) }, …(1) ]
- failed (no-keep): FC8 configure undefined publishes Off by identity, and a stop before the next run's first sample is unsampled
  - expected [ { status: 'Off', …(2) }, …(2) ] to deeply equal [ { status: 'Off', …(2) }, …(2) ]
- failed (no-keep): FC9 a sample the superseded run takes is dropped, so the feed stays Starting until the newest run samples
  - expected [ { status: 'Starting', …(2) }, …(1) ] to deeply equal [ { status: 'Starting', …(2) }, …(1) ]
- failed (no-keep): FC10 a start after Off folds into the empty reading, not the reading shown before Off
  - expected [ { status: 'Starting', …(2) }, …(1) ] to deeply equal [ { status: 'Starting', …(2) }, …(1) ]

How it was produced: with the copies kept first in the scratch directory, line 191 of `packages/devtools/src/model/DiagnosticsFeed.ts`
(the run guard, `if (!runs.isCurrent(token)) return;`) was deleted for the `no-guard` run, and for the `no-keep` run `keep` in
`packages/devtools/src/model/DiagnosticsStore.ts` was made to return `next` unconditionally. Each file was restored with `cp` before
the next edit and before the commit; `git diff --quiet HEAD -- packages scripts` held afterwards. The row FC9 is the only one the
guard's removal fails (the stale run's sample publishes a `Live` the tape does not expect); the removal of the keep fails the
rows that compare reading identity (FC2, FC3, FC4, FC7, FC8, FC9, FC10).

## 83-05 the removal pins

Run on the renamed base (`packages/devtools/src` unchanged), the pins written first.

- red on the base: the reading carries no questions field
  - tstyche: `Type 'Diagnostics' has property 'questions'.` (`Diagnostics.tst.ts`, both passes)
- red on the base: the root's Diagnostics holds exactly the four sampled fields
  - tstyche: `Type 'Diagnostics' has property 'questions'.` and `Type 'keyof Diagnostics' is not the same as type '"wiring" | "activity" | "hydration" | "portCalls"'.` (`surface.tst.ts`, both passes)
- red on the base: a supplied reading's questions are not part of the merged reading
  - `AssertionError: expected true to be false` (`Diagnostics.test.ts`)
- red on the base: a sample carries exactly the four fields the poll reads
  - `expected [ 'activity', 'hydration', …(3) ] to deeply equal [ 'activity', 'hydration', …(2) ]` (`Diagnostics.test.ts`)
- red on the base: F2 an empty options object samples the metric reads only and is Live once built
  - `AssertionError: expected true to be false` (`DiagnosticsFeed.test.ts:118`)
- red on the base: MR1 a supplied reading's questions are not part of the shown reading
  - `AssertionError: expected true to be false` (`DockModel.reading.test.ts`)
- green on the base: a supplied reading carries its questions (`Diagnostics.tst.ts`)
- green on the base: the root's DiagnosticsReading carries questions (`surface.tst.ts`)
- green on the base: MR2 a supplied reading's questions reach the questions store on the configure that hands them

Flips (the two existing cases the removal changes; the pinned check accepts the `F2` one):

- flip F2: `assert.isUndefined(reading.questions);` -> `assert.isFalse("questions" in reading);`
- flip mergeReading: "supplied questions win" and "absent questions fall through to the sample" -> "a supplied reading's questions are not part of the merged reading"

```ts
// before (Diagnostics.test.ts, mergeReading)
it("supplied questions win", () => {
  assert.strictEqual(
    mergeReading(sampled, { questions: suppliedQuestions }).questions,
    suppliedQuestions,
  );
});
it("absent questions fall through to the sample", () => {
  assert.strictEqual(
    mergeReading(sampled, { wiring: suppliedWiring }).questions,
    sampledQuestions,
  );
});

// after
it("a supplied reading's questions are not part of the merged reading", () => {
  assert.isFalse("questions" in mergeReading(sampled, { questions: suppliedQuestions }));
});
```

After the removal (`Diagnostics.questions` and its three writes deleted): typecheck clean, devtools suite 1954 passed, tstyche 53 passed in both passes, house style clean.

- green after the removal: the reading carries no questions field
- green after the removal: the root's Diagnostics holds exactly the four sampled fields
- green after the removal: a supplied reading's questions are not part of the merged reading
- green after the removal: a sample carries exactly the four fields the poll reads
- green after the removal: F2 an empty options object samples the metric reads only and is Live once built
- green after the removal: MR1 a supplied reading's questions are not part of the shown reading
- green after the removal: MR2 a supplied reading's questions reach the questions store on the configure that hands them

## 83-06 the fold

`pnpm exec vitest run --project devtools packages/devtools/test/model/Diagnostics.test.ts < /dev/null` on the tree where
the `foldReading` describe exists and `foldReading` does not: 5 failed, 24 passed; each failing row stops with
`TypeError: foldReading is not a function`. (The sixth row, "has a row for every field of the reading", reads no fold and
passes by design.)

- red on the base: returns the previous reading itself for a structurally equal fresh sample: TypeError: foldReading is not a function
- red on the base: gives only the field that moved a new reference, for each field: TypeError: foldReading is not a function
- red on the base: changes identity once however many identical samples are folded in: TypeError: foldReading is not a function
- red on the base: keeps the empty reading's fields for a first sample that equals them: TypeError: foldReading is not a function
- red on the base: decides each field by structural equality, not by reference: TypeError: foldReading is not a function

After the function: the `foldReading` file is 29 passed, the devtools suite is green, the typecheck and `pnpm test:tstyche
packages/devtools/test` (53 tests, both passes) are clean, `83-check.mjs single-fold` passes and so does house style.

- green after the change: returns the previous reading itself for a structurally equal fresh sample
- green after the change: has a row for every field of the reading
- green after the change: gives only the field that moved a new reference, for each field
- green after the change: changes identity once however many identical samples are folded in
- green after the change: keeps the empty reading's fields for a first sample that equals them
- green after the change: decides each field by structural equality, not by reference

The root's refusal of `foldReading`: with `foldReading` added to the `./model/Diagnostics.ts` value export of
`packages/devtools/src/index.ts` (a copy kept first, restored with `cp`; `git diff --quiet HEAD -- packages/devtools/src`
printed nothing after), `pnpm exec tsc -p tsconfig.test.json --noEmit < /dev/null` failed on the unused directive.

- check failed: surface foldReading: packages/devtools/test/surface.tst.ts(254,1): error TS2578: Unused '@ts-expect-error' directive.
