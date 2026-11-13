---
phase: 36-carried-spec-debt-and-stale-records
reviewed: 2026-11-13T00:00:00Z
depth: standard
files_reviewed: 63
files_reviewed_list:
  - .changeset/devtools-timeline-status.md
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
  - packages/core/src/RelationshipResolver.ts
  - packages/core/src/SecurityLabel.ts
  - packages/core/src/UntrustedDecode.ts
  - packages/core/test/DecisionCache.test.ts
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
findings:
  critical: 0
  warning: 1
  info: 6
  total: 7
  necessity: 0
status: issues_found
---

# Phase 36: Code Review Report

**Reviewed:** 2026-11-13
**Depth:** standard
**Files Reviewed:** 63
**Status:** issues_found

## Summary

Reviewed the phase diff (`e018203..HEAD`) for the 63 files. The logic changes are sound:

- The A2 seed mechanism in `HydrationEngine.ts` and the `subject` keepAlive in `QadiAtoms.ts` hold up. `registry.getNodes()`, `Node.valueOption()` and `AtomContext.registry` all exist in `effect@4.1.2`. Lookups never create a node, a spent seed is never re-read, and grants are per-registry. A registry that was never seeded cannot read another's seed.
- The `TimelineFeed` per-read token and `onExit` stop are correct. The finalizer order (the generation bump is registered after `FiberHandle.make`, so it runs first on close) is right, and a replaced read can neither accept nor set `Stopped`.
- The `Baseline.Checked.reading` fold and the `describeSource` / `prepareSource` split are behaviour-preserving.
- The shared `StoppedBox` keeps the alert-at-mount rule.

Verification: `vitest run --project devtools --project react` passes (89 files, 1860 tests). `oxlint` is clean on the changed `.ts`/`.tsx` files. `scripts/check-house-style.mjs` reports 493 files clean.

Every corrected core/audit/http comment was checked against the code it now cites:

- `SinkEmit.ts` reads `DecisionSink` via `serviceOption`.
- `EvaluationMetrics.ts` carries the `*_BY_TAG` idiom and the cardinality note.
- `Walk.ts` has `subject.roles.has(policy.role)` and `exhaustive: !anyOfStopsAtAllow(...)`.
- `RelationshipResolver.ts` has `clampRelationshipDepth`, `MAX_RELATIONSHIP_DEPTH` and `relationshipAsks`.
- `AuthorizeRequest.ts` has `enforceRequest`, and `Lifecycle.ts` has the `logDebug`.
- `AccessPlan.ts` has `planApi`, and `GuardRoute.ts` has `addGuardedRoute`.

All are accurate. The `DecisionSink.ts` rewording shifts "denial reason on a span" to "keying anything on the denial reason". That is accurate to `EvaluationMetrics.ts`, which only discusses metric keys, but it is an analogy now rather than the original claim.

The one substantive gap is that the D-02 item 5 sweep ("any other src comment still naming `Evaluate.ts` for code that moved") was incomplete.

## Warnings

### WR-01: Live comments (and a shipped metric description) still name `Evaluate.ts` for port calls that live in `PortAccess.ts`

**File:** `packages/core/src/PortName.ts:28`, `packages/core/src/PortMetrics.ts:26`, `packages/core/src/PortMetrics.ts:35-36`, `packages/core/src/PortMetrics.ts:85`

**Issue:** D-02 item 5 required correcting "any other src comment still naming `Evaluate.ts` for code that moved to `Walk.ts`/`PortAccess.ts`". These present-tense claims were missed:

- `PortName.ts:28`: "Every port `Evaluate.ts` can call into".
- `PortMetrics.ts:26`: "one per port `Evaluate.ts` can call into".
- `PortMetrics.ts:35-36`: "not `Evaluate.ts`" and 'the "`Evaluate.ts` can call into" scoping'.
- `PortMetrics.ts:85`: the description string of `qadi_port_calls_total`, "Scoped to Evaluate.ts only".

`Evaluate.ts` now imports only `Lifecycle.ts`'s `ask`, so it calls no port. `portCallsTotal` is updated in `PortAccess.ts:163`, reached from `Walk.ts`. The comments are false today, which is the same class of defect the phase was closing. The history-style mentions are fine: `FieldLattice.ts:21`, `Matcher.ts:403` ("was deleted"), `Policy.ts:551`.

Line 85 is a shipped metric description. The registry keys a metric on `type:id:description`, and `spec/behaviors/25-inspection.md` is checked against it. Edit the comments freely, but change that string only deliberately, together with the spec table and any snapshot-golden row, or leave it and record why.

**Fix:** Reword the comments to the evaluator walk (`Walk.ts` through `PortAccess.ts`):

```ts
// PortName.ts:28
 * Every port the evaluator's walk (`Walk.ts`, through `PortAccess.ts`) can call into: the closed domain of
// PortMetrics.ts:26 / :35-36
 * one per port the evaluator's walk can call into
 * (ADR-QD-024), not `Walk.ts` — … per the "the evaluator's walk can call into" scoping above.
```

For line 85, either leave the description as is and add a line to CCR-QD-427 naming it as a known shipped string, or change the description and the metric-table row in the same change.

## Info

### IN-01: `v4-http-smoke.test.ts` header still lists `PermissionRegistry.ts` as an `effect/http` caller and omits `AccessPlan.ts`

**File:** `packages/http/test/v4-http-smoke.test.ts:15-16`

**Issue:** This phase fixed the `registerApi` citation at line 106 to `AccessPlan.ts`'s `planApi`. The file header, 90 lines above the fix, still says every API exercised is one that "`GuardRoute.ts`, `PermissionRegistry.ts`, `PermissionRegistryRoute.ts`, `RequirePermission.ts` or `DecisionStreamRoute.ts` actually calls". `PermissionRegistry.ts` has no `effect/http` import. `AccessPlan.ts` imports `effect/http-api/HttpApi` and calls `reflect`, but is not named. The header contradicts the corrected comment below it.

**Fix:** Replace `PermissionRegistry.ts` with `AccessPlan.ts` in the header list.

### IN-02: Mis-indented `status:` literal in `makeTimelineFeed`

**File:** `packages/devtools/src/model/TimelineFeed.ts:160-164`

**Issue:** The restart arrow is wedged inside a one-line object with the body indented at an unrelated column:

```ts
status: { subscribe: status.subscribe, getSnapshot: status.getSnapshot, restart: () => {
    if (!closed) readSource(inputs.source);
  },
},
```

It reads as a formatting accident. It is not caught because `oxfmt` is not a gate, but hand-wrapping is the house style (AGENTS.md §17).

**Fix:** Hoist it and name it:

```ts
const restart = () => {
  if (!closed) readSource(inputs.source);
};
// ...
status: { subscribe: status.subscribe, getSnapshot: status.getSnapshot, restart },
```

### IN-03: `rowsOf` builds `snapshot(capture)` twice per usable Snapshot row

**File:** `packages/devtools/src/model/SimulationSource.ts:229-233`

**Issue:** The new `source: snapshot(capture)` field is built eagerly, and `prepare` builds a second, equal `snapshot(capture)`. The same happens for `fixtures`, which is already a shared constant. Only the `Live` row needs two different values (`live(ports)` for the description, `live(recorder.layer)` plus a recorder for a run). `describeSource` runs on every `build()`, so the throwaway is allocated per snapshot.

**Fix:** For `Fixtures` and `Snapshot`, let `prepare` return the row's `source`:

```ts
const source = snapshot(capture);
return { usable: true, why, source, prepare: () => ({ _tag: "Ready", source, captured: undefined }) };
```

### IN-04: `StoppedBox`'s `hooks` and `focusTarget` are independent unions, so a mismatched pair type-checks

**File:** `packages/devtools/src/react/StoppedBox.tsx:49-53`

**Issue:** Only two pairings are valid: `"qadi-diagnostics"` with `"[data-diagnostics-status]"`, and `"qadi-timeline"` with `"[data-testid='qadi-dock-body']"`. Both are separate props over their own two-member unions, so `hooks="qadi-timeline"` with the diagnostics target compiles and would focus the wrong element after Restart. The project's stated preference is a closed form over widening.

**Fix:** Make one prop a closed pair, for example `readonly feed: "diagnostics" | "timeline"`, with a module-level `Record` mapping each to its `{ hooks, focusTarget }`.

### IN-05: The contrast helper uses the superseded sRGB linearisation threshold

**File:** `packages/devtools/test/react/contrast.ts:36`

**Issue:** `c <= 0.03928` is the WCAG 2.0 constant. The WCAG 2.2 text and the sRGB standard use `0.04045`. The file and its test claim to measure "WCAG 2.2". No pinned ratio changes at two decimals, because no dock channel falls between the two thresholds, but the helper is wrong in principle.

**Fix:** `return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;`

### IN-06: `focusRingProps.onFocus` throws where `:focus-visible` is unsupported

**File:** `packages/devtools/src/react/focusRing.ts:18`

**Issue:** `currentTarget.matches(":focus-visible")` throws a `SyntaxError` in an engine that does not recognise the selector (Safari before 15.4, older embedded webviews). It would throw inside a React event handler on the dock body and on every screen root, and the dock would lose focus handling. The dock is a development overlay, so exposure is small, but the guard is one line.

**Fix:**

```ts
const visible = (el: Element): boolean => {
  try {
    return el.matches(":focus-visible");
  } catch {
    return true; // draw the ring when the engine cannot say
  }
};
```

---

_Reviewed: 2026-11-13_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
