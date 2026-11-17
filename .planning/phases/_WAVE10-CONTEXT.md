# Wave 10 (v1.5): shared context for Phases 43–52

**Read first:** `.planning/phases/_SHARED-CONTEXT.md`. Its house rules, user preferences, verify-command hygiene and the XC-05
mutation procedure all apply. **This file overrides only what it names:** the source review, the base commit, the
numbering, and the per-phase evidence below.

**Source review:** the 2026-11-15 architecture review,
`/private/tmp/claude-502/-Users-mohammadalmechkor-Projects-Perso-qadi/bf083921-e7cd-4930-bcad-a3ef483d2ac8/scratchpad/architecture-review-20261115.html`.
That file is local and session-scoped, so it may be gone. This file holds everything a planner needs from it. The review was
checked against ARCH-01…89 and `spec/decisions/` up to ADR-QD-155. The approved plan is
`~/.claude/plans/enumerated-yawning-thimble.md`.

**Base commit:** `ba0d0615`, the head of `arch-wave-9` (v1.4, **not merged**). Branch `arch-wave-10`. Each phase's base is
its first commit's parent; that rule is unchanged from `_SHARED-CONTEXT.md`.

## Execution order
Phases run strictly one at a time, in numeric order (43 → 52), for the same reasons as waves 6–9: every records plan edits the
same spec registers, and `use_worktrees` is false.

1. **Defects first (43–46).** Each hides a silent wrong result.
2. **Then the "stated once" deepenings (47–49).**
3. **Then the benchmark-gated phase (50).**
4. **Then the two speculative phases (51–52).**

Soft edges between phases:
- 45 and 48 both touch `AuditDecisionSinkLive.ts`.
- 47 and 49 both touch devtools `ServicesPanel`/`DockModel`.
- 50 and 51 both touch `Walk.ts`/`Policy.ts`.

## Numbering reserved for v1.5
Next free on `ba0d0615`: ADR-QD-156, CCR-QD-434, BEH-QD-551, INV-QD-331. The highest ARCH id is ARCH-89.

**The whole block below is reserved** in the shared reservation file
(`$(git rev-parse --git-common-dir)/qadi-reserved-ids.json`), set to CCR 443, ADR 165, BEH 600, INV 350 on 2026-11-15.
- **Never run `node scripts/next-id.mjs` while executing these phases**: every call writes a reservation.
- Confirm a reserved number is free by grepping `spec/`, `packages/`, `.changeset/` and `AGENTS.md`.
- If a reservation goes unused, name it in the phase's CCR row ("Unused: …").

| Phase | ARCH | ADR-QD | CCR-QD | BEH-QD | INV-QD |
|---|---|---|---|---|---|
| 43 | 90 | 156 | 434 | 551–555 | 331–332 |
| 44 | 91 | 157 | 435 | 556–560 | 333–334 |
| 45 | 92 | 158 | 436 | 561–565 | 335–336 |
| 46 | 93 | 159 | 437 | 566–570 | 337–338 |
| 47 | 94 | 160 | 438 | 571–575 | 339–340 |
| 48 | 95 | 161 | 439 | 576–580 | 341–342 |
| 49 | 96 | 162 | 440 | 581–585 | 343–344 |
| 50 | 97 | 163 | 441 | 586–590 | 345–346 |
| 51 | 98 | 164 | 442 | 591–595 | 347–348 |
| 52 | 99 | 165 | 443 | 596–600 | 349–350 |

ARCH ids below 90 are never reused. ADR Document IDs must equal the file number (gate 10).

## Already deep (do not re-plan)
The review checked these and found nothing to propose:
- `SinkCodec` (ADR-095/096/135/151);
- the port descriptions and derivations (ADR-094/107/109/114/133/134);
- http request enforcement (ADR-108/118, ARCH-75);
- `DecisionCache` and `SharedComputation` (ADR-132, ARCH-79);
- the react atom core (`QadiAtoms`, `QuestionBook`, `SeededQuestion`, `DecisionOutcome`, `SweepScheduler`);
- `@qadi/promise`;
- `@qadi/testing` (`evaluationEnvironment`);
- devtools `Source.ts`/`Remedies.ts`.

Explicitly not re-proposed, because an ADR settled each one:
- the composite folds in `Walk.ts` (ADR-073 and ADR-077 addenda);
- the http error tables (ADR-102);
- a codec in `DecisionStream` (ADR-097);
- the port question in several forms (ADR-133);
- the shared `clockLayer` (ADR-146);
- the backlog sort's place in the encoder (ADR-097 amendment);
- the SinkCodec depth walks (`UNTRUSTED_DECODE_BUDGET`).

`Hydration.ts`'s `hydrateDecisions` and `atoms.hydrate` were noticed as two public routes into one capability. ADR-078/039
chose that deliberately, and it is not in scope.

## Evidence per phase
Each planner re-verifies this evidence against `ba0d0615` before planning. Line numbers are as of that commit.

### Phase 43: one handover module behind the enforcement entry points (review #1, Strong, top recommendation)
- **The rule.** INV-QD-108 and ADR-104 say the resource decided on is the value handed over. `packages/core/src/Qadi.ts`
  states that rule in four forms:
  - `LoadedEnforceOptions` (:113) refuses `resource?: never` on `enforceLoaded`/`enforceProjected`/`enforceProjectedLoaded`;
  - `withLoadedResource` (:129) overrides the resource;
  - `guard` (:406) takes `EnforceOptions` and does `{ ...options, resource }` (:416);
  - `decideOne` (:430) does `{ ...options, resource: item }` (:440) for all four `filter*` (:483, :527, :555, :585), and
    each of them takes `EnforceOptions`.
- **So** `filter(p, items, { resource: x })` and `guard(perm, p, { resource: x })` compile, and `x` is silently dropped.
- **Further duplication:**
  - the allow → `discharge` / deny branch is written in both `permitted` (:197) and `decideOne`;
  - `project(decision, value)` is applied in four places (~:299, :353, :571, :604).
- **Must keep:**
  - ADR-011: discharge precedes the guarded work;
  - JA-04: `filter` partitions, it does not fail;
  - ADR-019: obligation discharge before handover;
  - the per-item fate shared between the array and stream forms.
- **This is a Breaking type change:** the `guard`/`filter*` options lose `resource`.
- **Call sites to sweep:** `packages/http`, `promise`, `react`, `examples/*`, `features/step-definitions`, and the
  ` ```typescript ` fences in `spec/` and on the website (both doc-fence gates).

### Phase 44: the hydration seed's fields stated once (review #3, Strong)
- `packages/react/src/HydrationEngine.ts`:
  - :77–101: `ALLOW_WITHHELD`/`DENY_WITHHELD` and `AllowEntry`/`DenyEntry`, derived from core's
    `DecisionWireAllow`/`DecisionWireDeny` (`packages/core/src/DecisionWire.ts:26–55`);
  - `dehydrateDecision` (:269) spreads;
  - `rebuild` (:375) copies `evaluationId`, `durationMillis`, `visibleFields`, `obligations` and `disclosure` by hand.
- `packages/react/src/SeededDecision.ts:76–92`: `SeededAllow`/`SeededDeny` are `Data.TaggedClass`es whose field lists are
  written out.
- **The defect:** a field added to the wire's `common` reaches the payload and is dropped by `rebuild` on the client, and
  this compiles.
- **More restatement:** the Allow/Deny branch is written three times (`dehydrateDecision`, `rebuild`, `entryAgrees` :409).
- **The pattern to follow** is ADR-135's `SinkRecordFields.ts`: a `Schema.Struct` of fields, a `Data.TaggedClass` typed by its
  `Type`, and a wire that spreads it.
- **Must keep:**
  - ADR-078: a seed is its own type, and `_tag` is `SeededAllow`, not `Allow`;
  - `entryAgrees`'s use of core's `decisionDisagreement` (INV-QD-170);
  - ADR-155: `SeededQuestion.ts` owns the computing atom.

### Phase 45: the audit circuit breaker as one transition function (review #2, Strong)
- `packages/audit/src/CircuitBreaker.ts` has five separate `Ref.modify` bodies: `observe` :242, `recordSuccess` :283,
  `recordFailure` :310, `claimProbe` :348, `releaseProbe` :368.
  - Each restates the stale-generation check (`state.generation !== generation`), the bump (`generation + 1` appears **8**
    times), the state rebuild and the `announceTransition` decision.
  - `admit` (:381) composes observe → claimProbe → observe by hand.
  - `Match.value(state)` is rebuilt per call, which AGENTS.md §5a says to avoid on a hot path.
- **History:** commit `9b2ca5d8` (a probe claim not released on abnormal exit); issue #72 (claim/release atomicity); the
  regression tests at `CircuitBreaker.test.ts:339, 403, 426, 452` (a stale failure reopening a newer window, a release
  stealing a newer claim).
- **The defect:** `failureThreshold: NaN` means `consecutiveFailures >= NaN` is always false, so the breaker never opens.
  `AuditDecisionSinkLive.ts:127` passes options through unvalidated. By contrast, `decisionCacheLayer`, `makeDecisionLog`
  and `decisionStreamRoute` refuse a bad bound when they are built.
- **Must keep:** INV-QD-052 (each event is one atomic modify) and the existing breaker metric and transition announcements.

### Phase 46: the sink emitter reports what it contains (review #5, Worth exploring)
- `packages/core/src/SinkEmit.ts:49–55`: `sinkEmitter` does `Effect.catchCause(sink.value.record(record), () => Effect.void)`.
  It contains every sink failure (INV-QD-035: an observer must never deny) and reports nothing.
- **Consequence:** a user-written sink that fails or dies loses records with no log at all.
- **Shipped sinks log their own failures:**
  - `DecisionSinkForwarding.ts:98` and `:126` ("could not be forwarded", the encode-refusal report; keep it);
  - `DecisionSinkForwarding.ts:188` ("a fanned-out decision sink failed unexpectedly", `decisionSinkAll`'s sibling isolation);
  - `DecisionLog.ts:174` (the append/publish half).
  - The phase's research classifies each one as either "containment the emitter now covers" or "a report that says something
    else".
- `DecisionSinkShape` (`DecisionSink.ts:34`) has no `name` today. Port shapes do (`PortDescription.ts:48`).
- **Must keep:** ADR-044/100's single read of the sink (the `sink-read-once` rule), and that a sink never changes a decision.

### Phase 47: port facts read from the description (review #4, Strong)
- `packages/core/src/PortDerivation.ts:239` names a wrapper `` `${inner.name ?? "?"} (${suffix})` `` (BEH-QD-196).
- `packages/devtools/src/model/Wiring.ts:143`'s `isDefaultName` parses that convention
  (`name === noneName || name.startsWith(\`${noneName} (\`)`). A hand-written wrapper that breaks it makes a fail-closed
  default show as a real adapter, which is the misleading direction for a diagnostic.
- Devtools tables keyed by port that restate facts the description could own:
  - `Wiring.ts:127` `CONSEQUENCES`;
  - `model/PortCalls.ts:253` `ROWS`, five arms identical except for the tag;
  - `react/ServicesPanel.tsx:268` `describeOne`, a React view that knows each port's span fields.
- `forEveryPort` exists in core's `Ports.ts`.
- **Must keep:**
  - ADR-094: a port is described once;
  - ADR-109: a span is projected once;
  - devtools depends only on `@qadi/core`.

### Phase 48: audit reports core's refusal and derives "lost" (review #8, Worth exploring)
- `packages/audit/src/AuditEntry.ts:64–73`: `AuditEntryNotEncodable` copies core's `SinkRecordNotEncodable`
  (`packages/core/src/Errors.ts:381`) field for field (`recordTag`, `evaluationId`, `refusal`). Its only addition is
  `reason`, which is `describeEncodeRefusal(refusal)`.
- Its doc cites ADR-054 ("core has no reason to know this error exists"), but core already declares that error.
- `onRefused` takes a different type in audit (`AuditDecisionSinkLive.ts:78`, `AuditWriteReport.ts:209`) than in forwarding
  and http.
- **"Lost" is stated twice:**
  - `AuditWriteOutcome.ts:101–123`: `unwrittenDurability` maps NotWired/StageFailed to `"Lost"`;
  - `AuditWriteReport.ts:115–127`: `lostStaging` maps NotWired → `not_wired`, StageFailed → `failed`, Staged → undefined.
  - Both are exhaustive, but a new variant could be mapped differently in each, and then the span and the metric/log label
    disagree.
- `writtenStaging` uses a hand-written `_tag` ternary.
- **Check ADR-056 (audit companion package) before deciding.**

### Phase 49: gates as the dock model's eighth store, with one gate-state vocabulary (review #7, Worth exploring)
- **Two channels:**
  - `packages/devtools/src/react/QuestionsPanel.tsx:96, 137–145` joins the polled `questions` (through
    `model/DiagnosticsStore.ts:200–232`) with the live `gates` prop (`react/DevtoolsDock.tsx:140, 336–343`), which skips
    `DockModel`;
  - the per-row `instancesAsking` join runs in the view, so the two halves can come from different moments.
- **The restated vocabulary:**
  - `packages/devtools/src/model/Gates.ts:60–114` restates `GateRenderState` (`"Failed" | "Denied" | "Rechecking" |
    "Pending" | "Allowed"`) and types `GateInstanceLike.state` as `string`;
  - react's version is `packages/react/src/GateWriter.ts:55`, derived from `DecisionOutcome.ts`'s tags;
  - no test ties the two together.
- **The pattern to follow** is ADR-152's (core's `HYDRATION_DROP_TABLE`, from which both packages derive).
- **Must keep:**
  - ADR-053/080: devtools has no dependency on `@qadi/react`;
  - an unknown state is still shown as `Unrecognised`;
  - §13 "instrumentation off means absent";
  - the ARCH-74/82 store set, amended in ADR form.

### Phase 50: what a leaf needs from the request, stated once (review #6, Worth exploring; opens on a benchmark)
- **INV-QD-011:** a leaf that reads the action or the resource fails when it is reached and the request has none. That rule is
  written per leaf and per interpreter.
- **In `packages/core/src/Walk.ts`:**
  - `action === undefined && referencesAction(matcher)` appears at :327 and :354;
  - the `HasAction` check is at :383;
  - a resource-referencing matcher raises `MissingResource` (:339);
  - `HasResourceAttribute` raises `MissingResource` (:351).
- **Elsewhere:**
  - `PortAccess.ts:271–290` `readScoped` raises `MissingResourceId`;
  - `Predicate.ts:392–425` and `:597` rewrite the same checks as `NeedAction` plans.
- **The check order differs per leaf:**
  - `HasAttribute` checks action first, then resource;
  - `HasResourceAttribute` checks resource first, then action;
  - so a request missing both gets a different error depending on the leaf, and nothing states whether that matters.
- The port-free `HasRole`/`HasPermission` are judged in both `Walk.ts:310–322` and `Predicate.ts:396–399`.
- **It is on the per-leaf hot path**, next to budgeted switch #1 (`evaluateNode`). AGENTS.md §5a requires `pnpm bench`
  first. If it regresses beyond run-to-run noise, the phase ends with ADR-QD-163 recording the rejection and its numbers.
- **Must keep:** ADR-024/100 (admission is shared, the walks stay two) and the `SWITCH_BUDGET`.

### Phase 51: policy tag arity stated once (review #9, Speculative)
- `packages/core/src/Policy.ts`: `childrenOf` (:1040), `LeafPolicy` and `leafCases` state which tags are leaf, wrapper or
  many.
- `packages/core/src/Decision.ts:410–450` restates them in a hand-kept `leafTags` array plus `traceShapeOf`. That is
  exhaustive over tag names, but nothing ties it to `childrenOf`, so moving a wrapper tag under "Many" there compiles.
- **Correction to the review:** `foldTrace` (Decision.ts:470–486) has no callers in the repo, **by design**. It is the
  stack-safe public primitive for hosts holding a `Trace` (INV-QD-090), and it **stays**.
  - `renderTrace` (pre-order with indentation) and `diffTraces` (lockstep over two trees) keep their own walks.
  - The ADR states why.

### Phase 52: core owns the predicate compile shell (review #10, Speculative)
- `packages/predicate-sql/src/index.ts:309–343` and `packages/predicate-prisma/src/index.ts:432–452` repeat the same shell:
  - `identifiers ?? "Ascii"`;
  - `maxInValues ?? DEFAULT_MAX_IN_VALUES`;
  - `toRenderable`;
  - `tapError(refused)` and `update(compiled)`.
- Both `CompileMetrics.ts` files are identical except for the metric id and description.
- The renderers are rightly different: Prisma folds vacuous identities; SQL accumulates parameters.
- **Must keep:**
  - ADR-054/079: a companion package may compile a dialect, and renderability is a core rule;
  - ADR-123: each package declares its own metric once, the ids stay distinct, and the `[metric-table]` rows are unchanged.
