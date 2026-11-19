---
phase: QD-60-devtools-headless-interface-is-the-feeds
iteration: 3
findings_in_scope: 4
fixed: 4
skipped: 0
status: all_fixed
---

# Phase 60: Code Review Fix Report (iteration 3)

The orchestrator fixed all four findings in one commit, `18059863`. The mutation evidence was re-run afterwards, because a type test is code to the phase scan.

- **WR-01.** BEH-QD-638 now says a release that throws is swallowed and not stated, matching BEH-QD-584, test G42 and `GatesFeed.ts:194-206`. Spec 28 went from 1.35 to 1.36.
- **WR-02.** The README listener paragraph now names `restart` and every way a listener throw leaves a feed wrong: the gates questions cadence ends; a diagnostics feed stays `Starting` with no poll; a timeline restarted from `Stopped` says `Reading` with nothing reading.
  - The optional code fix (publish inside a `try`/`finally` after the fork) was not made. It changes behaviour after the last review round, and it belongs with the deferred listener isolation below.
- **WR-03.** The three `not.toBeCallableWith` pins on `runDiagnostics` could not fail. They now check its parameters through `Params<F>`, the form `packages/core/test/PortAccess.tst.ts` uses, and a positive control was added.
  - Proven by a deliberate break: turning the `schedule` refusal into a valid `intervalMillis` call made tstyche fail with 1 failed assertion. Restored, all 16 pass.
  - 60-03-SUMMARY's statement that the negative pins were "unaffected" was wrong at the time. The SUMMARY is history and is left as written; this report corrects it.
- **IN-01.** The README example now reports both halves of the gates snapshot (`registry` and `asked`).

Checks after the commit:

- whole devtools project: 70 files, 1647 tests;
- tstyche on `surface.tst.ts` and `DiagnosticsStore.tst.ts`: 27 assertions;
- `pnpm typecheck`;
- check-doc-examples: 117 blocks;
- check-website-doc-examples: 70 blocks;
- check-api-surface: 939 exports;
- check-dod-table, check-house-style and `spec-revise --check`;
- `verify-traceability --strict`: 21 PASS.

Not checked: `packages/core/test/DecisionLog.tst.ts:30`, which the reviewer flagged as possibly the same broken-pin shape. It is outside this phase and was not opened.
