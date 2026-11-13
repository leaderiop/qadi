---
phase: 36-carried-spec-debt-and-stale-records
reviewed: 2026-11-13T03:30:00Z
depth: standard
files_reviewed: 67
files_reviewed_list:
  - .changeset/devtools-timeline-status.md
  - .changeset/port-calls-description.md
  - .changeset/react-subject-and-seed.md
  - .changeset/simulator-session-only.md
  - apps/website/src/content/docs/docs/reference/upgrading.md
  - examples/nextjs-newsroom/e2e/ssr.spec.ts
  - examples/nextjs-newsroom/src/client/Divergent.tsx
  - packages/audit/src/AuditDecisionSinkLive.ts
  - packages/audit/src/CircuitBreaker.ts
  - packages/core/src/AttributeResolver.ts
  - packages/core/src/AuthSubject.ts
  - packages/core/src/DecisionSink.ts
  - packages/core/src/Explanation.ts
  - packages/core/src/Matcher.ts
  - packages/core/src/Policy.ts
  - packages/core/src/PortMetrics.ts
  - packages/core/src/PortName.ts
  - packages/core/src/RelationshipResolver.ts
  - packages/core/src/SecurityLabel.ts
  - packages/core/src/UntrustedDecode.ts
  - packages/core/test/DecisionCache.test.ts
  - packages/core/test/Ports.test.ts
  - packages/devtools/src/model/DockModel.ts
  - packages/devtools/src/model/Replay.ts
  - packages/devtools/src/model/SimulationSession.ts
  - packages/devtools/src/model/SimulationSource.ts
  - packages/devtools/src/model/TimelineFeed.ts
  - packages/devtools/src/model/TimelineStore.ts
  - packages/devtools/src/react/DevtoolsDock.tsx
  - packages/devtools/src/react/DiagnosticsNotice.tsx
  - packages/devtools/src/react/focusRing.ts
  - packages/devtools/src/react/index.ts
  - packages/devtools/src/react/Simulator.tsx
  - packages/devtools/src/react/StoppedBox.tsx
  - packages/devtools/src/react/TimelineNotice.tsx
  - packages/devtools/src/react/useDockModel.ts
  - packages/devtools/src/react/useScoped.ts
  - packages/devtools/src/react/useTimeline.ts
  - packages/devtools/test/helpers.ts
  - packages/devtools/test/model/DockModel.test.ts
  - packages/devtools/test/model/Replay.test.ts
  - packages/devtools/test/model/Replay.tst.ts
  - packages/devtools/test/model/SimulationSession.test.ts
  - packages/devtools/test/model/SimulationSource.prepare.test.ts
  - packages/devtools/test/model/TimelineFeed.test.ts
  - packages/devtools/test/react/contrast.ts
  - packages/devtools/test/react/DiagnosticsNotice.test.tsx
  - packages/devtools/test/react/Simulator.test.tsx
  - packages/devtools/test/react/theme.contrast.test.ts
  - packages/devtools/test/react/TimelineNotice.test.tsx
  - packages/devtools/test/react/useTimeline.test.tsx
  - packages/devtools/test/surface.test.ts
  - packages/devtools/test/surface.tst.ts
  - packages/http/src/GuardRoute.ts
  - packages/http/src/QadiHttpError.ts
  - packages/http/test/v4-http-smoke.test.ts
  - packages/react/src/GateWriter.ts
  - packages/react/src/HydrationEngine.ts
  - packages/react/src/QadiAtoms.ts
  - packages/react/test/GateRegistry.test.tsx
  - packages/react/test/GateWriter.test.tsx
  - packages/react/test/Hydration.lifetime.test.ts
  - packages/react/test/HydrationEngine.test.ts
  - packages/react/test/QadiProvider.seed.test.tsx
  - packages/react/test/QadiProvider.subject.test.tsx
  - packages/react/test/v4-reactivity-smoke.test.ts
  - stryker.http.mjs
iteration: 3
findings:
  critical: 0
  warning: 0
  info: 0
  total: 0
  necessity: 0
status: clean
---

# Phase 36: Code Review Report

**Reviewed:** 2026-11-13T03:30:00Z
**Depth:** standard (iteration 3 of the --auto fix loop)
**Files Reviewed:** 67
**Status:** clean

## Summary

Iteration 3 re-checks only what changed since the iteration-2 review: commit `522f2128`, which drops the `export` from `StoppedFeed` in `packages/devtools/src/react/StoppedBox.tsx`. The 67-file scope was reviewed clean in iteration 2 apart from that one info item, and `git log 68affb21..HEAD` shows no other commit after it. No other source file changed.

- **IN-01 (iteration 2) is resolved.** `StoppedFeed` is now `type StoppedFeed = ...` at `StoppedBox.tsx:38`. A repo-wide grep (excluding `node_modules`, `lib`, `.git`, `.planning`) finds it only at lines 38, 48 and 65 of that file: the declaration, the `FEEDS` table's mapped key type and `StoppedBoxProps.feed`. Nothing imports it, so no caller breaks.
- **Declaration emit is fine.** `StoppedBoxProps` is exported and references the now-local `StoppedFeed`. `tsc` inlines or keeps a local type alias in the emitted `.d.ts`, and `isolatedDeclarations` is not enabled anywhere (`tsconfig*.json`). `tsc --noEmit -p packages/devtools/tsconfig.src.json` with `declaration: true` inherited from `tsconfig.base.json` exits 0 with no diagnostics.
- **House rules are met.** The module is not in a barrel. `index.ts` does not re-export `StoppedFeed`, and AGENTS.md §9 and the `devtools-named-barrel` rule are unaffected. No `as`, `any`, `switch`, or ambient API was added. The `FEEDS` table is still closed over the union, so a third feed is a TS2741 error.
- **Callers are unchanged.** `DiagnosticsNotice.tsx` and `TimelineNotice.tsx` pass the literals `"diagnostics"` and `"timeline"`, which type-check against the local alias.

I did not re-run lint, the test suites or the house-style script. The change is a type-only visibility narrowing with no runtime effect.

All reviewed files meet quality standards. No issues found.

---

_Reviewed: 2026-11-13T03:30:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
