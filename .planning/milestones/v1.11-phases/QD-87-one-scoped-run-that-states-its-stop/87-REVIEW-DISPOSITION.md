---
phase: 87
review: 87-REVIEW.md
findings:
  - id: WR-01
    severity: warning
    disposition: fixed
    title: "The feeds' public subscribe docs pointed at a package-private module and dropped the listener contract"
  - id: WR-02
    severity: warning
    disposition: fixed
    title: "The changeset omitted that a session run dying outside its own exit read now reads Broke"
  - id: IN-01
    severity: info
    disposition: fixed
    title: "The stated run's docs cited ADR-QD-150 and never ADR-QD-200"
  - id: IN-02
    severity: info
    disposition: fixed
    title: "The changeset said reading or starting where a live diagnostics poll stalled too"
  - id: IN-03
    severity: info
    disposition: fixed
    title: "The Simulator's broken-run box was not announced to assistive technology"
  - id: IN-04
    severity: info
    disposition: deferred
    title: "SB1 and SB4 hard-code palette hex values"
  - id: SEC-OBS-2
    severity: info
    disposition: fixed
    title: "The stated run built the engine eagerly inside the finally"
  - id: SEC-OBS-1
    severity: info
    disposition: accepted
    title: "The session land guard is held by argument, not by a killing row"
open: 0
---

# Phase 87 — Review disposition

Findings from `87-REVIEW.md`, plus the two observations in `87-SECURITY.md`. All decided autonomously 2026-11-25.

| Finding | Severity | Disposition | Source |
|---------|----------|-------------|--------|
| WR-01 | warning | fixed | `b55b6b11`: `TimelineFeed.ts` / `DiagnosticsFeed.ts` `subscribe` docs state the listener contract in place (every listener is called; one throw rethrown as itself, several as one `AggregateError`, ADR-QD-177; the starting publishes rethrown once the new run has started, ADR-QD-194). The pointer to `StatedRun.ts` is gone. Doc only. |
| WR-02 | warning | fixed | `05a167b8`: `.changeset/devtools-one-stated-run.md` names the session change (a run that fails outside its own result read, and stayed running, reads broken). "No export changes." and the patch bump kept. |
| IN-01 | info | fixed | `63ed0b9a`: ADR-QD-200 cited in the `StatedRun.ts`, `ConfigurePrologue.ts` and `SimulationSession.ts` headers; ADR-QD-150 and ADR-QD-194 kept where they are the source. |
| IN-02 | info | fixed | `05a167b8`, with WR-02: a feed that interrupts itself reads stopped where it showed "reading, starting or live". |
| IN-03 | info | fixed | `ad081edc`: `role="alert"` on the broken-run box's heading in `Simulator.tsx`, matching `StoppedBox`; the `<pre>` is unchanged so the born `Simulator.broke.test.tsx` and `simulator-pre` still hold. New `test/react/Simulator.announce.test.tsx` SA1, seen failing without the attribute. |
| IN-04 | info | deferred | `Simulator.broke.test.tsx` is a born file `87-pinned-check.mjs` holds byte for byte. Revisit in the next phase that edits the Simulator's tests, reading the colours from `theme.ts`. |
| SEC-OBS-2 | info | fixed | `d4e886a4`: `StatedRun.ts` forks `Effect.suspend(() => plan.engine(live))`, so a throw while building the engine is a defect of the run, stated as a stop, and never replaces the listeners' throw. ST18 and ST19 (`StatedRun.test.ts`) fail on the old module. Mutation re-closed: `StatedRun.ts` 23/23, touched group unchanged, `87-mutation-close.json` at `f3d933fa`, `compare` green. |
| SEC-OBS-1 | info | accepted | `SimulationSession.ts:419` stays; its mutant is recorded EQUIVALENT in `87-mutation.mjs` with the reason (a newer fork interrupts the older fiber at its suspension first), and the stale-write property is pinned at the stated run (ST14, ST15). |

`pnpm check:pr` exited 0 after the fixes (17 of 18 steps; mutation skipped by definition), on head `f3d933fa`.
