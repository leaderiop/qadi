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
