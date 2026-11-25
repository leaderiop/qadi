---
phase: QD-83-the-diagnostics-feed-folds-its-reading-as-a-value
plan: 07
subsystem: devtools
tags: [diagnostics, feed, sink, snapshot]
requires:
  - phase: QD-83-the-diagnostics-feed-folds-its-reading-as-a-value
    provides: foldReading (plan 06), the characterisation and checks (plans 01 to 03)
provides:
  - DiagnosticsSink and runDiagnostics(sink, options?), the feed's snapshot as the one holder of the reading, the store deleted
affects: [83-08, 83-09, 83-10, 83-11]
phase_base: bc02e8e625eed08227910dfdfd4544ae66ed23ca
plan_head_before: 9bacb88b0b218b307d701276e187e243761613c1
plan_head_after: e265bc83719d48b08d59822ad1c32188d91a0f9c
actuals:
  tokens: 6000
  tasks: 2
  commits: 2
tech-stack:
  added: []
  patterns: [a one-member sink handed to the poll engine (as runSource), the feed's published snapshot as the only copy of the reading]
key-files:
  created: []
  modified:
    - packages/devtools/src/model/Diagnostics.ts
    - packages/devtools/src/model/DiagnosticsFeed.ts
    - packages/devtools/src/model/ExternalStore.ts
    - packages/devtools/test/model/Diagnostics.test.ts
    - packages/devtools/test/model/Diagnostics.tst.ts
    - packages/devtools/test/surface.tst.ts
    - .planning/phases/QD-83-the-diagnostics-feed-folds-its-reading-as-a-value/83-RED-EVIDENCE.md
key-decisions:
  - "The sink the feed builds per start() runs the guard, the fold, the sampled flag, then the publish, in the order the marking wrapper had"
  - "off() is runs.stop(); sampled = false; view.set(diagnosticsOff): the constant resets the reading"
requirements-completed: []
duration: 12min
completed: 2026-11-25
status: complete
---

# Phase 83 Plan 07: The feed folds each sample into its one snapshot through a sink Summary

`runDiagnostics(sink: DiagnosticsSink, options?)` hands each sample to a one-member `{ accept }` sink, and the diagnostics feed
builds that sink per `start()`: run guard, `foldReading(view.getSnapshot().reading, sample)`, `sampled = true`, then
`show(Live-or-current, reading)`. The feed's published snapshot is the only copy of the reading; `DiagnosticsStore`,
`makeDiagnosticsStore`, `marking`, `let store` and the store replacement in `off()` are gone.

## What was done

- **Pins and harness first**: `Diagnostics.tst.ts` reads `declare const sink: DiagnosticsSink` (three negative pins, their
  positive twin and the `Effect<void, never, never>` pins; `callable: 3` unchanged). The engine tests' harness became a
  recording sink (folds each sample through `foldReading`, counts identity moves). Seen red on the base: typecheck TS2724 and
  both tstyche passes failing; recorded in `83-RED-EVIDENCE.md`, `## 83-07 the sink`.
- **Source**: `DiagnosticsSink` declared beside the engine; `runDiagnostics`'s tap calls `sink.accept`; span, scope, cadence and
  error channel untouched. `show(status, reading)` compares the pair with the snapshot and drops an unchanged pair. `start()`
  keeps `try { show(Starting, …) } finally { runs.fork(…) }`; `onFailure` keeps the reading in `Stopped`. Header and doc
  comments of `Diagnostics.ts` and `ExternalStore.ts` restated.
- **Root refusal** (`surface.tst.ts`): `type DiagnosticsSink` refused from the root; a scratch barrel export made the typecheck
  fail with TS2578 (barrel restored by `cp`, `git diff --quiet HEAD -- packages/devtools/src` held).

## Verification

Devtools suite 1955 passed; typecheck clean; `pnpm test:tstyche packages/devtools/test` passes both passes; house style clean;
api-surface 942; strict traceability FAIL 0; doc examples 119 and website 77 compile; `spec-revise --check` ok;
`83-check.mjs` `no-store`, `single-fold`, `scan-ids`, `scan-forbidden`, `trailers` pass; `83-pinned-check.mjs --all-applied` passes
(FC1 to FC11, F1 to F33 and every held file unedited). oxlint clean on the touched files (the warnings it prints are in
`HeldChoice.test.ts`, untouched here).

## Commits

- `16273275` refactor(83-07): the feed folds each sample into its one snapshot through a sink
- `e265bc83` test(83-07): the root does not export DiagnosticsSink

## Deviations from Plan

None - plan executed exactly as written. The type-test red evidence is per-title but file-wide: the missing import makes the whole
`.tst.ts` file fail to compile, so the six sink-reading titles are recorded together with the typecheck's first error line.

Remaining mentions of `DiagnosticsStore` outside `packages/devtools/src` and the surface refusal pin (spec documents, changeset,
CHANGELOG, `.planning`) are change history or are owned by later plans of this phase; none is a gate failure now.

## Known Stubs

None.

## Self-Check: PASSED
