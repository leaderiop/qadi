---
phase: QD-60-devtools-headless-interface-is-the-feeds
iteration: 2
findings_in_scope: 5
fixed: 5
skipped: 0
status: all_fixed
---

# Phase 60: Code Review Fix Report (iteration 2)

The orchestrator fixed all five findings in one commit, `00729ec2`. The mutation evidence was re-run afterwards, because a test title counts as code to the phase scan. The result: `WX-05 holds (D-10)`.

- **WR-01.** BEH-QD-638 and the `makeGatesFeed` row in `spec/overview.md` now promise only that throws from the registry (`instances`, `subscribe`, the release handle) and the questions thunk are guarded. A listener on the feed's own `subscribe` must not throw. Both revisions were bumped (28 to 1.35, overview to 1.128).
- **WR-02.** The test for `configure` after the scope has closed is now TF24, and BEH-QD-636's pin names TF24.
- **IN-01.** The comment on the not-generic pin now says which line each arity fails.
- **IN-02.** `GatesFeed.ts`'s header and the README say a listener's throw escapes whatever published it: `configure`, a tick, or the registry's own notification. Only a throw on a tick ends the questions cadence.
- **IN-03.** `TimelineFeed.timeline`'s doc says its `subscribe` listener must not throw. `TimelineStore.ts` itself stays frozen, because the phase scan pins it, so the note sits on the public handle field that exposes it.

**Checks:**
- The TimelineFeed and GatesFeed suites pass: 55 tests.
- tstyche passes on `DiagnosticsStore.tst.ts`.
- These scripts pass: `check-doc-examples`, `check-api-surface` (939 exports), `check-dod-table`, `check-house-style` and `spec-revise --check`.
- `verify-traceability --strict` reports 21 PASS.

**Still deferred:** isolating a throwing listener in `ExternalStore`. The React dock shares that store, and CONTEXT puts the dock's behaviour out of scope.
