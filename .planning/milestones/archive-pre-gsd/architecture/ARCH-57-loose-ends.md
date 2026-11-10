---
id: ARCH-57
title: Wave-5 loose ends — an optional no-resource loader and one unguarded-route constructor, fixture setups as one union, the gate writer resolved once, stale test citations, cache-capacity validation, the subject-set lifecycle, and ADR-QD-NEXT placeholders
strength: n/a (mixed — three Speculative "also seen" deepenings from the 2026-10-13 review, plus small items the orchestrator added; no defect above "docs/test gap" survived verification)
status: superseded-by-phase-13
disposition: "ported or recorded obsolete by Phase 13 (GAP-08…GAP-11) from rescue/wave5-1013 4b1ed49; was `done` on the unmerged branch only (wave 6, 2026-11-10)"
evidence_verified_at: b655b3b
depends_on:
  - ARCH-47 (hard, for L1b/T4 only: the package-private unguarded-route constructor composes with ARCH-47's `identify` step and must not re-fix the unguarded port route's missing extraction log, which ARCH-47 owns)
blocks:
  - ARCH-48 (soft: L2/T6 changes `fixturePortsLayer`'s argument, which `@qadi/devtools`' `SimulationSource.ts` calls; land L2 first, or ARCH-48 carries the one-line wrap)
adrs_touched:
  - ADR-QD-036 (read, L1: `@qadi/http`'s shape; `guardRoute` stays package-private, `addGuardedRoute` is the bare-route surface)
  - ADR-QD-107 (read, L1: the unguarded port route logs its reason once, at construction — specified there, not drift)
  - ADR-QD-094 (amend one sentence, L2: Amendment 1.3 names `fixturePortsLayer(data, overrides?)`; it becomes `fixturePortsLayer(setups)`. Amendment 1.3's decisions (D-42-d = B one way per port, D-42-e = A table in core, D-42-f = A answers-only custom fixture) are kept, not reopened)
  - ADR-QD-050 (constraint, L2: devtools' Fixtures mode stays data-only; it passes only `{ answers }` setups)
  - ADR-QD-053 (constraint, L3: "off means absent"; `instrument` stays on the public context)
  - ADR-QD-080 (constraint, L3: the writer is "a handle only `@qadi/react` can reach"; ARCH-43 D-43-b rejected a public writer capability — so the review's "on `QadiContextValue`" is refused)
  - ADR-QD-031 (read, L5: the capacity addendum)
  - ADR-QD-022 / ADR-QD-100 (read, L6: subject sets; `ask` is the only `src` site that calls `questionOf` for a decision)
  - ADR-QD-099 (constraint: out of the barrel means not importable; new internals stay out of every barrel)
  - ADR-QD-037 (constraint: madge; no new cross-module edge except `PortRoutes.ts`/`PermissionRegistry.ts` → the new internal unguarded-route module under L1b)
  - ADR-QD-038 (constraint: changesets only, fixed group; L2 edits two *pending* changesets rather than adding a breaking one; no release step)
packages: ["@qadi/http", "@qadi/core", "@qadi/testing", "@qadi/devtools (one call site)", "@qadi/react", "@qadi/predicate-sql (comment)", "@qadi/predicate-prisma (comment)", "spec", "apps/website"]
estimate: L   # L1a ½ d · L1b ½ d (blocked on ARCH-47) · L1 tests 1 h · L2 ¾ d · L3 ½ d · L4 1 h · L5 1 h · L6 2 h · L7 1 h ≈ 2½–3 d. Without L1b ≈ 2 d (M).
---

# ARCH-57 — Wave-5 loose ends

This plan is not one deepening. It collects the 2026-10-13 review's "Also seen, low leverage"
section (three items: L1, L2, L3) and four small items the wave-5 brief added (L4–L7). Each item
has its own evidence in §1, its own decisions, and its own tasks; any item can merge without the
others, except L1b, which waits on ARCH-47.

| Item | Area | Verdict at `b655b3b` | First task |
| ---- | ---- | -------------------- | ---------- |
| **L1** | `@qadi/http` introspection routes | **CONFIRMED.** All four guarded introspection routes pass `loadNoResource` by hand. ARCH-19 recorded that an optional loader could not be typed without a cast. **REFUTED by a tsc probe:** overloads (the shape `authorizeRequest` already uses) type it cast-free. The two unguarded variants hand-roll the same warning. Their **different cadences are both specified** (BEH-QD-180 per request, ADR-QD-107 once), so this is not drift. The port route's once-at-construction warning has **no test**. `reportRefused` was kept twice on purpose (ARCH-25). | T1 (red type test) |
| **L2** | `fixturePortsLayer` / `@qadi/testing` | **CONFIRMED.** `answersOf`/`layersOf` and `fixturePortsLayer`'s own record are three hand-written five-port records. The "override wins" rule can only be reached from `Ports.test.ts`. **New:** the whole surface is **unreleased** (pending changesets, core at 0.11.0 without it), so it can be reshaped at no cost. A tsc probe shows the setup-union form compiles cast-free with `mapPorts`. The review said "built with `tabulatePorts`"; **CHANGED**: `tabulatePorts`' own doc sends per-port-typed values to `mapPorts`. | T5 (red) |
| **L3** | `@qadi/react` gate writer | **CONFIRMED.** `instrument ? gateWriterFor(gates) : undefined` is derived twice, and the provider checks it a third time. **REFUTED as stated:** `QadiContextValue` is public, so a writer on it would expose the handle ADR-QD-080 and D-43-b keep private. The double subscription in `useDecisionSuspense` is **REFUTED as a cost**: a render-count probe shows identical counts with and without `useGate`. | T7 |
| **L4** | Stale test-file citations | **CONFIRMED, and wider.** `generators.ts` cites the deleted `Agreement.test.ts`, and so does `CompileSql.test.ts:550`. A one-grep sweep finds **7 present-tense citations of files that do not exist**, one of them in shipped `src` (`Role.ts`). | T10 |
| **L5** | `decisionCacheLayer` capacity | **CONFIRMED** that it throws `new Error` (a defect at layer build). **REFUTED as a defect:** BEH-QD-166 specifies "this fails as a defect rather than a typed error". `makeDecisionLog` and `decisionStreamRoute` throw too. Only the bounded wrappers are typed (`InvalidBoundedPermits`), and nothing says why the two differ. | T11 (docs) |
| **L6** | `decideSubject` and the lifecycle | **REFUTED as a bypass.** `decideSubject` → `evaluate` → `ask` → `questionOf` + `decideQuestion`; nothing `decideQuestion` does is skipped, and `ask` is ADR-QD-100's one `questionOf` site. **New:** INV-QD-016's Source says "nothing is memoised across elements", which is false once a `DecisionCache` is wired (it is correct only because of INV-QD-033's keying). No test runs a batch under a cache or a sink. | T12 (green pins) |
| **L7** | Found while verifying | 11 `ADR-QD-NEXT` placeholders in shipped comments and test titles, for ADRs numbered 101 and 107 two waves ago. Smaller: double blank lines in `NoResource.ts`/`AuthorizeRequest.ts`. Process note: a transient `.d.ts` emit into `packages/core/src` (see C7.3). | T13 |

## 1. Verified evidence (at `b655b3b`)

`git rev-parse --short HEAD` → `b655b3b` (`main`, after #150). Probes live in
`/private/tmp/claude-502/-Users-mohammadalmechkor-Projects-Perso-qadi/f10e9d09-77ac-4671-a5f3-770ae101c6fe/scratchpad/wave5/ARCH-57/`
(below: `$P`). They are ephemeral; the command that settles each claim is recorded so T0 can re-run it.

| Probe | Item | Run with (from the repo root unless stated) |
| ----- | ---- | ------------------------------------------- |
| `L1/optional-loader.ts` | L1 C1.3 | `./node_modules/.bin/tsc -p $P/L1/tsconfig.json` (needs `$P/node_modules → <repo>/node_modules`; **never** add `--emitDeclarationOnly` without `rootDir`, see C7.3) |
| `L2/setups.ts` | L2 C2.5 | `./node_modules/.bin/tsc -p $P/L2/tsconfig.json` |
| `L3/double-subscription.test.tsx` | L3 C3.4 | `cd packages/react && ./node_modules/.bin/vitest run --config $P/L3/vitest.config.ts --silent=false` (needs `$P/L3/node_modules → packages/react/node_modules`) |
| `L4/dangling-citations.sh` | L4 | `$P/L4/dangling-citations.sh` |

### L1 — The guarded introspection-route family

**C1.1 All four introspection routes pass `loadNoResource` explicitly — CONFIRMED.**
`git grep -n "loadNoResource" packages/http/src`: `PermissionRegistry.ts` — `permissionRegistryRoute`
(`:163-170`), `PortRoutes.ts` — `portRoutes` (`:132-138`), `DecisionStreamRoute.ts` —
`decisionStreamRoute` (`:292-297`), `DecisionBacklogRoute.ts` — `decisionBacklogRoute` (`:65-70`). Each
imports the package-private `NoResource.ts` by path only for that argument.

**C1.2 `authorizeRequest` already defaults it — CONFIRMED.** `AuthorizeRequest.ts` — `authorizeRequest`
has two overloads (with and without `loadResource`) and an implementation signature whose parameter
defaults to `loadNoResource` (`:62-89`). `addGuardedRoute` (`PermissionRegistry.ts:96-113`) is a curried
`const` arrow with a required `loadResource`, and forwards it to the package-private `guardRoute`
(`GuardRoute.ts:55-91`), which forwards it to `authorizeRequest`.

**C1.3 ARCH-19's "no cast-free way to keep `A`" — REFUTED by probe.** ARCH-19's progress log (deviation
row, 2026-10-07) says "`addGuardedRoute` was not made loader-optional (no cast-free way to keep `A`)".
The same overload shape `authorizeRequest` uses works. `$P/L1/optional-loader.ts` declares
`function addGuardedRoute2` with a four-argument overload (handler receives `Resource`) and a
five-argument overload (generic `A`, `LR`), with one implementation that defaults the loader to
`loadNoResource` and delegates to a module-private `build`. tsc is clean. A `@ts-expect-error` case
(a no-loader handler annotated to take a narrower `Doc`) is rejected as it should be, and a deliberate
`const bad: number = "x"` sanity line errors (so the probe really type-checks). Declaration output keeps
both overloads. ARCH-19 probably tried a default parameter on the `const` arrow, which TS rejects because
`loadNoResource` is not assignable to a loader of the generic `A`.

**C1.4 Exactly two declared-unguarded variants — CONFIRMED.** `permissionRegistryRouteUnguarded(reason)`
(`PermissionRegistry.ts:183-194`) and `portRoutesUnguarded(reason, serving, options?)` (`PortRoutes.ts:158-192`).
`/__decisions` and `/__decisions/backlog` have **no** unguarded variant by requirement (BEH-QD-202,
`spec/behaviors/26-decision-stream.md:415`; `DecisionBacklogRoute.ts:17-21`). Both variants hand-roll the
same three things: a never-read `reason`, a `logWarning` of the form
`"qadi/http: serving <what> unguarded — <consequence>. Reason given: <reason>"`, and no
`PermissionRegistry.register`.

**C1.5 The two cadences differ, and both are specified — CONFIRMED (the brief's "verify which is right").**
- `/__permissions`: per request. Source doc (`PermissionRegistry.ts:179-181`), BEH-QD-180's prose
  (`spec/behaviors/23-http.md:437-439`), website (`apps/website/src/content/docs/docs/packages/http.md:238-240`):
  "a local development choice that reaches production should be visible in the logs of the environment it
  is wrong in".
- port routes: once, at construction. Source doc (`PortRoutes.ts:150-152`) and ADR-QD-107
  (`spec/decisions/107-…md:97-99`): "a port route is hit on every client re-check, and a warning per
  request would bury the log it is meant to appear in". **`spec/behaviors/34-remote-ports.md` does not
  state it.** The behavior doc is silent where the ADR decides.

Both reasons hold: `/__permissions` is hit rarely, and port routes are hit on every re-check. So neither
cadence is wrong. What is wrong is that the cadence is implicit in how each body is written
(`Effect.gen` around the handler vs `Layer.effectDiscard` beside it). Nothing names it at the call site.

**C1.6 The port route's construction-time warning is untested — CONFIRMED.**
`grep -n "Reason given\|collectingLogger\|logWarning" packages/http/test/PortRoutes.test.ts` → nothing.
Moving the warning into the handler, or deleting it, keeps every test green. The `/__permissions` test
(`http.test.ts:313-340`, "Logged on every request, not once at construction") makes **one** request and
expects one line, so it does not tell per-request apart from once-at-construction either. Both cadences
are unpinned.

**C1.7 `reportRefused` near-duplicated — CONFIRMED, and settled by ARCH-25.** `DecisionStreamRoute.ts`
— `reportRefused` (`:165-171`) and `DecisionBacklogRoute.ts` — `reportRefused` (`:37-45`) are each a named
`Effect.fn` around one call to core's `reportEncodeRefusal` (itself `Effect.fn("qadi.encodeRefusal.report")`).
They differ in span name, message, and the stream's `Result.fail(refusal)` return. ARCH-25 T5 step 2
(`ARCH-25-encode-refusal-description.md:399-401`) decided that "each `reportRefused` keeps its span name
and message". The duplication left is two four-line adapters with distinct span names. **Not re-planned**
(D-57-c).

**C1.8 Overlap with ARCH-47 — CONFIRMED by reading the review.** The review's candidate #2 diagram shows
`portRoutesUnguarded` "extract by hand · toResponse", with "no extraction log → 502, silent"
(`PortRoutes.ts:180-181`: `Effect.result(SubjectExtractor.extract(request))` then `toResponse`, with no
`logSubjectExtractionFailed`). ARCH-47 owns that fix and the `identify` step. L1 must not touch
`PortRoutes.ts:178-187`'s extraction before ARCH-47 lands.

### L2 — Fixture setups

**C2.1 Three hand-enumerated five-port records — CONFIRMED.** `packages/testing/src/QadiReviewLayer.ts`
— `answersOf` (`:158-166`) and `layersOf` (`:169-177`) split each `PortSetup<K>` into `answers` and
`layer`. `packages/core/src/Ports.ts` — `fixturePortsLayer` (`:281-302`) zips them back in a third
hand-written record (`layers`, `:286-300`), with `overrides.X ?? fixtureLayer(PORT_FIXTURES.X, data.X)`
per port. The registry's own primitives (`PORTS`, `tabulatePorts`, `mapPorts`, `mergePorts`) enumerate
the five ports by design; those stay.

**C2.2 The "override wins" rule is unreachable from `src` — CONFIRMED.** Callers
(`git grep -n "fixturePortsLayer" packages/*/src`): `QadiReviewLayer.ts:148` passes the two halves of
`PortSetups`, whose `never` members make "both for one port" a type error
(`QadiReviewLayer.ts:44-46`; pinned by `packages/testing/test/TestLayerOptions.tst.ts` "answers and a
layer for one port is rejected"). `packages/devtools/src/model/SimulationSource.ts` — `fixtureLayer`
(`:117-134`) passes data only. The rule's one exercise is `packages/core/test/Ports.test.ts`'s "an
override wins over the same port's data, and leaves the others alone" (`:574-591`). The function's own
doc says so (`Ports.ts:277-279`).

**C2.3 The surface is unreleased — CONFIRMED (new; the review did not say).**
`grep -n "fixturePortsLayer\|PortSetup" packages/core/CHANGELOG.md packages/testing/CHANGELOG.md` →
nothing. `packages/core/package.json` is `0.11.0`. The exports arrive with the pending
`.changeset/port-fixture-table.md` (`@qadi/core` minor) and `.changeset/testing-observation-helpers.md`
(`@qadi/testing` minor, which introduces `PortSetup`/`PortSetups`). Reshaping now changes no released
signature; the two pending changesets are edited, and no new breaking note is written.

**C2.4 ARCH-42 planned this shape and the implementation deviated — CONFIRMED.** ARCH-42 T6 step 2
(`ARCH-42-…md:395-396`): "`qadiReviewLayer` maps each entry: `answers` → `PORT_FIXTURES[K](answers)`,
`layer` → itself; then `portsLayer`". What landed is `answersOf`/`layersOf` →
`fixturePortsLayer(data, overrides)`. The progress log records no reason. D-42-d/e/f stand. This
completes D-42-d's "precedence is gone by construction" on the core side too.

**C2.5 The union form compiles cast-free — CONFIRMED by probe.** `$P/L2/setups.ts` moves
`PortSetup<K>`/`PortSetups` beside `PORT_FIXTURES` and defines
`fixturePortsLayer2 = (setups: PortSetups = {}) => mergePorts(mapPorts((d) => setupLayer(d, setups[d.port])))`,
with `setupLayer` generic in `K` (`setup.answers !== undefined ? PORT_FIXTURES[d.port](setup.answers) : setup.layer ?? none`).
tsc is clean. Both `@ts-expect-error` cases (both forms for one port; relationship answers of the
attribute shape) are rejected. A devtools-shaped caller with optional fields compiles through a two-line
`answers(data)` helper.

**C2.6 "Built with `tabulatePorts`" — CHANGED.** `tabulatePorts`' doc (`Ports.ts:154-165`): it "suits
values that are uniform across ports … a value that depends on the port's own types belongs in
`mapPorts` or `decoratePorts`". A layer per port is per-port-typed, so the probe uses `mapPorts`, and so
should the implementation.

### L3 — The gate writer, resolved once

**C3.1 Derived twice, checked a third time — CONFIRMED.** `useGate.ts` — `useGate` (`:70-73`) and
`hooks.ts` — `useQuestionsAs` (`:107-110`) each compute
`useMemo(() => (instrument ? gateWriterFor(gates) : undefined), [instrument, gates])`.
`QadiProvider.tsx` (`:306-310`) checks `instrument && gateWriterFor(gates) === undefined` to report
`UnwritableGateRegistry`. "Off means absent" (AGENTS.md §13, ADR-QD-053, INV-QD-046) is therefore
decided in three places that must agree.

**C3.2 "Resolve the writer on `QadiContextValue`" — REFUTED as stated.** `QadiContextValue` and
`useQadiContext` are **public** (`packages/react/src/index.ts` exports `QadiProvider.tsx` with `export *`;
`spec/overview.md:528-529` lists both). A `writer` field there hands any consumer the registration handle
ADR-QD-080 calls "a handle only `@qadi/react` can reach" (`080-…md:48`). ARCH-43 D-43-b rejected
option (D), "a public writer capability", and made the writer an ES `#private` slot
(`GateWriter.ts` — `OwnedGateRegistry`, `:128-142`) precisely so that reflection cannot reach it.
A field on a public context object can be reached with `Object.keys`. The deepening has to keep the
resolved writer off the public value: a package-private React context (D-57-g).

**C3.3 `useDecisionSuspense` reads the atom twice — CONFIRMED.** `hooks.ts` — `useDecisionSuspense`
(`:66-81`) memoises `atoms.decision(policy, resource)`, then calls `useGate` (which memoises the same
call and subscribes with `useAtomValue`), then `useAtomSuspense(atom, { suspendOnWaiting: true })`.
That is two subscriptions to one registry node. The family keys structurally, so it is one atom.

**C3.4 …at no render cost — REFUTED as a defect, by probe.** `$P/L3/double-subscription.test.tsx`
renders a `<Suspense>` child using `useDecisionSuspense`, and the same read without `useGate`, under a
5 ms resolver. It waits for `Allow`, invalidates, and waits again. Three runs, each with `instrument`
false and true:
```
{"instrument":false,"gate":{"settled":3,"total":6,"commits":3},"only":{"settled":3,"total":6,"commits":3}}
{"instrument":true, "gate":{"settled":3,"total":6,"commits":3},"only":{"settled":3,"total":6,"commits":3}}
```
The render and commit counts are identical. React batches both subscriptions' notifications into one
render. No defect, so no red test. The duplicate `useMemo` is cosmetic (D-57-h).

**C3.5 `instrument` must stay on the context — CONFIRMED.** ADR-QD-053 ("carried on the context rather
than read from a global", `053-…md:80-81`) and the public type. L3 adds; it does not remove.

### L4 — Test files cited that no longer exist

**C4.1 `predicate-prisma/test/generators.ts` cites `Agreement.test.ts` — CONFIRMED.**
`generators.ts:2-3`: "agreement properties (`Agreement.test.ts`, `EngineAgreement.test.ts`)". Both
packages' `Agreement.test.ts` were deleted in `1fd8700` (ARCH-03, which replaced the JS readers with
real engines). `git ls-files | grep Agreement.test` → only `packages/audit/test/Agreement.test.ts`,
`core/test/{Decision,SinkCodec}Agreement.test.ts`, and the two `EngineAgreement.test.ts`.

**C4.2 Wider — CONFIRMED by `$P/L4/dangling-citations.sh`.** These are present-tense citations of files that
do not exist. Historical mentions ("used to live in", "learned the hard way") and deliberate negatives ("without its own
`X.test.ts`") are excluded.

| Site | Cites | Should cite |
| ---- | ----- | ----------- |
| `packages/predicate-prisma/test/generators.ts:3` | `Agreement.test.ts` | `EngineAgreement.test.ts` only |
| `packages/predicate-sql/test/CompileSql.test.ts:548-551` | "`interpretSqlFragment` re-derives …" and "the property test in `Agreement.test.ts`" | past tense: the retired reader and its property (ARCH-03 T7); the golden-text rationale stands |
| `packages/core/src/Role.ts:104` (**shipped source**) | "asserted in `Role.test.ts`" | `RolesAndDepth.test.ts` — "reports exactly the permissions flattenPermissions returns" (`:255-262`, CONFIRMED set equality) |
| `packages/core/test/helpers.ts:152` | `AttributeResolver.test.ts` (deleted in `1fd8700`) | drop it; `CustomPredicate.test.ts` and `Qadi.test.ts` exist |
| `packages/react/test/DevtoolsFeed.test.tsx:10` | `dock-wiring.test.ts` | `examples/nextjs-newsroom/test/dock-wiring.test.tsx` |
| `packages/devtools/test/react/QuestionsPanel.test.tsx:9` | `GatesPanel.test.tsx` (deleted in `45760c2`) | `QuestionsPanel.gates.test.tsx` |
| `packages/devtools/src/model/Verdict.ts:15` | `WhatIfTable.test.ts` | `WhatIfTable.test.tsx` |

Two more read a retired reader in the present tense without naming a file:
`predicate-prisma/test/generators.ts:45-46` ("Neither `matchesPrismaWhere` nor the reference
interpreter can find…") and `CompilePrismaWhere.test.ts:234-238` ("that reader computes…"). The
rationale is true; only the tense is wrong.

### L5 — `decisionCacheLayer`'s capacity check

**C5.1 It throws `new Error` inside the layer — CONFIRMED.** `DecisionCache.ts` — `decisionCacheLayer`
(`:245-254`): inside `Layer.effect(DecisionCache, Effect.sync(() => { … throw new Error(…) }))`, so a bad
`capacity` is a **defect** when the layer is built. `DecisionCache.test.ts` — `describe("capacity")`
(`:931-997`) pins `Cause.squash` → `Error` matching `/capacity/i` for `-1`, `NaN` and `1.5`.

**C5.2 The bounded wrappers fail typed — CONFIRMED.** `PortDerivation.ts:80-83` validates `permits` into
`Effect<Semaphore, InvalidBoundedPermits>`, and each `…Bounded` is `Layer.Layer<S, InvalidBoundedPermits>`
(`AttributeResolver.ts:227`; specified in `spec/behaviors/06-services.md:255-278`).

**C5.3 The defect is specified — CONFIRMED (the brief's framing is REFUTED).** BEH-QD-166
(`spec/behaviors/21-decision-cache.md:153-168`): "Any other value MUST fail the layer at construction …
Both are caller misconfiguration, not a runtime condition to recover from, so this fails as a defect
rather than a typed error." Behavior 24's decision-log requirement points back to it
(`24-decision-sink.md:229-233`).

**C5.4 House rules — CHECKED, not violated.** AGENTS.md §6 forbids no `throw`; §4's "never `Effect.orDie`
in evaluation or enforcement paths" is about decisions, and this is layer construction. `SCHEMA_ERROR_BUDGET`
is untouched in every option, because a new error would be `Data.TaggedError`.

**C5.5 The real inconsistency — CONFIRMED.** Five construction-time checks use three styles, and nothing
says why:

| Check | Style |
| ----- | ----- |
| `decisionCacheLayer` | `throw` inside `Effect.sync`: a defect at layer build |
| `makeDecisionLog` | `throw` before any `Effect` exists (`DecisionLog.ts:250-262`) |
| `decisionStreamRoute` | `throw` at call ("Throws synchronously", `DecisionStreamRoute.ts:270-291`) |
| devtools `collectPortCalls` / timeline | `throw` at call (`PortCalls.test.ts:510`, `Timeline.test.ts:36`) |
| `…Bounded(permits)` | typed `InvalidBoundedPermits` in the layer's error channel |

`InvalidBoundedPermits`' doc (`Errors.ts:345-354`) says why it fails at construction, but not why it is
typed when its siblings die. This is a docs gap, not a defect.

### L6 — `decideSubject` and the lifecycle

**C6.1 Nothing is bypassed — REFUTED as a defect, by reading.** `SubjectSet.ts` — `decideSubject`
(`:119-130`) runs `Effect.provideService(evaluate(policy, options), CurrentSubject, subject)`.
`Evaluate.ts` — `evaluate` (`:107-110`) is `Effect.map(ask(policy, options), …)`. `Lifecycle.ts` — `ask`
(`:297-306`) is `CurrentSubject.use((subject) => decideQuestion(questionOf(subject, policy, options), options))`.
Every step of `decideQuestion` (`:166-289`) runs per element: the id, the clock, `DecisionCache.getOrCompute`
keyed on the `Question`, the sink emitter, the metrics, the span and the log. Writing
`decideQuestion(questionOf(subject, …))` in `SubjectSet.ts` would add a **second** `src` call site of
`questionOf` for a decision. `ask`'s doc (`:291-296`) calls itself "the only place in `src` that calls
`questionOf` for a decision", which is ADR-QD-100's "a question is asked once". The current shape is the
ADR-conformant one. INV-QD-016's Enforcement also relies on the `provideService`: dropping it does not
compile, because `SubjectSetServices` excludes `CurrentSubject`.

**C6.2 INV-QD-016's Source overstates — CONFIRMED (new).** `spec/invariants.md:458-461`: "Nothing is
memoised across elements and the batch holds no state of its own". With a `DecisionCache` provided,
two **equal** subjects in one batch do share one cache entry (the walk runs once and the second is a
`hit`). That is correct, because the key is the whole subject (INV-QD-033), but the sentence is false.

**C6.3 No test runs a batch under a cache or a sink — CONFIRMED.**
`git grep -n "DecisionCache\|decisionCacheLayer\|DecisionSink" packages/core/test/SubjectSet.test.ts` →
nothing. That an access review records one `Decided` per subject, and that two subjects with one id and
different roles get their own decisions through a shared cache, holds by the code above and is pinned by
no test.

### L7 — Found while verifying

**C7.1 `ADR-QD-NEXT` in shipped comments — CONFIRMED.** `git grep -n "ADR-QD-NEXT" -- packages` → 11 sites:
`core/src/PortDescription.ts:86`, `core/src/PortRemote.ts:3`, `core/src/PortWire.ts:30`,
`http/src/PortRoutes.ts:3`, `http/src/RemotePorts.ts:3` (ARCH-31 → **ADR-QD-107**);
`core/src/TreeFold.ts:30` (ARCH-22 → **ADR-QD-101**); tests `core/test/PortConformance.test.ts:456`,
`PortRemote.test.ts:196`, `PortServe.test.ts:142`, `http/test/PortRoutes.test.ts:3,218` (→ ADR-QD-107).
Template placeholders were never replaced when the numbers were assigned. `spec/` and `apps/` are clean
(`git grep -n "QD-NEXT" -- spec apps` → nothing). `spec/scripts/verify-traceability.sh` gained an ADR-ID
check under ARCH-45 D-45-g but does not look for `NEXT` in `packages/`.

**C7.2 Cosmetic — CONFIRMED.** Double blank lines: `NoResource.ts:48-49`, `AuthorizeRequest.ts:30-31`.
These fold into T2's edit of the same files.

**C7.3 Process note — a transient declaration emit.** During this verification
`packages/core/src/*.d.ts{,.map}` files appeared (timestamp 00:53, beside a probe run with
`--emitDeclarationOnly --outDir` and no `rootDir`, which tsc 6 refuses with TS5011) and were gone again
minutes later. `git status --porcelain` was empty before and after, and
`find packages features examples -name '*.d.ts' -newer AGENTS.md | grep -v /lib/` → nothing. They are
neither tracked nor ignored, so they would have shown as untracked if left behind. The probe table above
therefore forbids declaration emit. **Wave-5 implementers: run `git status --porcelain` before committing.**

## 2. Goal and success criteria

Each item raises **locality** or removes a second statement of one fact. L1 gives
`addGuardedRoute`'s interface the same default `authorizeRequest`'s has, so a no-resource route states
nothing it does not mean. It gives the two unguarded routes one internal **module** whose interface
names the warning cadence as a closed value instead of leaving it implicit in how each body is written.
L2 makes `fixturePortsLayer` **deeper**: one argument, one way per port, built over `mapPorts`, with the
precedence rule gone because it cannot be expressed. L3 resolves "off means absent" once, at the
provider, behind a **seam** consumers cannot reach. L4–L7 correct the record so that a reader following
a citation finds what it names.

1. `git grep -n "loadNoResource" packages/http/src` → only `NoResource.ts`, `AuthorizeRequest.ts` and
   `PermissionRegistry.ts` (the default). The four introspection routes call
   `addGuardedRoute(method, path, permission, policy)(handler)`. (L1a)
2. `packages/http/test/PermissionRegistry.tst.ts` (*new*) passes: the four-argument form compiles and its
   handler receives `Resource`. The five-argument form keeps `A`. `tsc -b` shows no `as`/`any` added
   (`node scripts/check-house-style.mjs` budgets unchanged). (L1a)
3. Two new tests pin both cadences: two requests to `permissionRegistryRouteUnguarded` log two warnings,
   and two requests to `portRoutesUnguarded` log exactly one, emitted at layer build. (L1)
4. Under D-57-b = B: `git grep -n "Reason given" packages/http/src` → one site (the new internal
   module), and each unguarded route names its cadence (`"every-request"` / `"once"`) at the call. (L1b)
5. `git grep -n "answersOf\|layersOf\|PortFixtures\b\|overrides" packages/testing/src packages/core/src/Ports.ts`
   → nothing except `PortOverrides` used by `portsLayer`. `fixturePortsLayer` has one parameter.
   `Ports.test.ts` has no precedence test, and `Ports.tst.ts` rejects both forms for one port. (L2)
6. `git grep -n "gateWriterFor(" packages/react/src` → `GateWriter.ts` (definition) and `QadiProvider.tsx`
   (one call). `useGate.ts` and `hooks.ts` read a package-private context. `QadiContextValue` is
   unchanged (gate 13 shows no diff on `@qadi/react`). Every existing react test passes untouched. (L3)
7. `$P/L4/dangling-citations.sh` prints only historical mentions and deliberate negatives. (L4)
8. `Errors.ts`' `InvalidBoundedPermits` doc and BEH-QD-166 each say in one sentence why the bound on a
   port is typed and the cache's capacity is a defect. (L5, under D-57-j = A)
9. `SubjectSet.test.ts` gains a `describe("under a decision cache and a sink")` block (green on HEAD), and
   INV-QD-016's Source no longer says "nothing is memoised". (L6)
10. `git grep -n "QD-NEXT" -- packages` → nothing. Under D-57-k = A, `verify-traceability.sh --strict`
    fails on a reintroduced one. (L7)

## 3. Non-goals

- **The unguarded port route's missing extraction log and the `identify` step** — ARCH-47's (C1.8).
- **A public `addUnguardedRoute`** for host routes. Bare `HttpRouter.add` is already "unguarded", and
  nothing makes a host declare it. Making it declarable is a policy change to BEH-QD-174's scope, not a
  loose end (D-57-b option C).
- **Re-deciding either cadence.** Both are specified and both reasons hold (C1.5). L1 names the cadence
  and tests it; it does not change it.
- **Folding `reportRefused`** (C1.7, D-57-c): settled by ARCH-25.
- **Changing `decisionCacheLayer`'s failure channel** (D-57-j): BEH-QD-166 decided it, and typing it would
  change `Layer.Layer<DecisionCache>` for every caller.
- **Reopening ARCH-42's decisions** (D-42-d/e/f) or ARCH-43's (D-43-a/b): L2 and L3 complete them.
- **A gate for dangling test-file citations** unless D-57-i says so; the false-positive classes are real (C4.2).
- **Devtools' simulation fixture fields** — ARCH-48's. L2 touches `SimulationSource.ts` by one wrap.

## 4. Constraints

- **AGENTS.md §1** — namespace submodule imports; `import type` for types; the new L3 context lives in a
  `.ts` module (`createContext` needs no JSX).
- **§2/§3** — no new service; nothing here is a `Context.Service`.
- **§5** — L1b's internal constructor returns a `Layer`; any effectful helper inside it is
  `Effect.fn(name)`. **`UNTRACED_BUDGET` unchanged** (no `fnUntraced`).
- **§5a** — the cadence dispatch in L1b is a closed literal union (`"every-request" | "once"`), dispatched
  with `Match.value(...).pipe(Match.when…, Match.exhaustive)` once per route **construction** (not per
  request), so §5a's per-call cost note does not apply. **`SWITCH_BUDGET` unchanged.**
- **§6** — no `as`, `any`, `!`. The L1 overloads and the L2 generic `setupLayer` are probe-proven
  cast-free (C1.3, C2.5). **`ANY_BUDGET`, `HAS_CUSTOM_BUDGET` unchanged.** **`PORT_DOUBLE_BUDGET`:** L2's
  rewritten `Ports.test.ts` keeps `scriptedPort` for its layer case and constructs no port error by hand.
  L6's tests use fixtures, not hand-written failing layers.
- **§4** — **`SCHEMA_ERROR_BUDGET` unchanged** in every option.
- **§9 / ADR-QD-099** — L1b's module, L3's context and `useGateWriter` stay out of every barrel. L2's
  `PortSetup`/`PortSetups` move into `@qadi/core`'s barrel (through `Ports.ts`'s `export *`, or ARCH-55's
  named export list if it lands first). `@qadi/testing` stops exporting them (D-57-f).
- **§11** — spec is normative: BEH-QD-166 (L5), INV-QD-016 (L6), ADR-QD-094 amendment 1.3 (L2), BEH 34
  (L1 cadence sentence) and the overview rows change in the same commits as their code.
- **§13** — L3 must leave every react test green untouched ("the assertion that keeps this honest is that
  the React suite's existing tests pass untouched"). `DECISION_READ_BUDGET` unchanged: the `useDecisionSuspense`
  change keeps `useAtomSuspense` as the one delegated read.
- **§15 / gate 13** (`node scripts/check-api-surface.mjs`) — L2 moves two type names between packages and
  removes `PortFixtures`, so `spec/overview.md` rows change. L1a changes no export name, but its row text
  and the BEH-QD-180 listing change.
- **ADR-QD-037 / gate 5** (`madge --circular --extensions ts,tsx packages/*/src`) — L3's context must live
  in `GateWriter.ts` (already imported by `QadiProvider.tsx`, `useGate.ts` and `hooks.ts`), not in
  `QadiProvider.tsx`, which `GateWriter.ts` must not import. L1b's module imports `HttpRouter`, `Effect`
  and `Layer` only.
- **Mutation (gates 16, 17, 21, 22)** — `stryker run` (core), `stryker run stryker.http.mjs`,
  `stryker run stryker.devtools.mjs` and `stryker run stryker.react.mjs` must hold their 80% floor.
  L1's cadence tests kill the "move the warning" mutants (C1.6).
- **Changesets (ADR-QD-038)** — `@qadi/http: minor` for L1a (a new call form); `@qadi/http: patch` for L1b
  (internal); L2 **edits** `.changeset/port-fixture-table.md` and `.changeset/testing-observation-helpers.md`
  (both unreleased); L3–L7 need none (no observable change), except L4's `Role.ts`/`Verdict.ts` comments,
  which ship but change nothing. **No version PR is merged and nothing is published without the user's
  explicit go-ahead.**

## 5. Decisions needed before work starts

### D-57-a — Make `addGuardedRoute`'s loader optional (L1a)
- **A. Overloads, like `authorizeRequest`** (recommended). Four-argument form: handler gets `Resource`.
  Five-argument form: unchanged. One implementation defaulting to `loadNoResource`, delegating to a
  module-private `build`. Additive; no caller changes; cast-free (C1.3). `addGuardedRoute` becomes a
  `function` declaration (house style allows it; `authorizeRequest` is one).
- **B. Keep it required** (status quo, ARCH-19's outcome). Four routes keep importing a package-private
  module for one argument, and a host route with no resource writes `() => Effect.succeed(NO_RESOURCE)`
  because `loadNoResource` is not public.
- **C. Export `loadNoResource`.** Adds a public name to save an argument. ARCH-19 kept it private on purpose.
- **Recommendation: A.** `status: open`

### D-57-b — One constructor for the declared-unguarded routes (L1b)
- **A. Leave both hand-rolled**, with T3's tests pinning each cadence. That costs nothing, but the message
  shape and "no registration" stay restated, and the cadence stays implicit in how each body is written.
- **B. A package-private `unguardedRoutes` module** (recommended): `UnguardedRoute.ts` (*new*, out of the
  barrel) exporting `unguardedRoutes(declared, routes)`, where `declared = { what, consequence, reason, announce }`,
  `announce: "every-request" | "once"` is closed and required, and `routes` is a non-empty array of
  `{ method, path, handler }`. It writes the one warning text and applies the cadence **per family**:
  `"once"` is one `Layer.effectDiscard` warning beside all the routes, and `"every-request"` is
  `Effect.andThen(Effect.logWarning(message), handler)` per route. It never registers.
  `permissionRegistryRouteUnguarded` passes one route and `"every-request"`. `portRoutesUnguarded` passes
  its served ports and `"once"`, and **after ARCH-47** each handler is ARCH-47's `identify` composition
  (no extraction of its own). Plural, so that a once-per-family warning cannot become one per port by
  accident. Public signatures unchanged.
- **C. A public `addUnguardedRoute(reason, …)`** for hosts. A new public concept and a scope change to
  BEH-QD-174 (§3).
- **Recommendation: B, blocked on ARCH-47.** If ARCH-47's `identify` leaves `portRoutesUnguarded`'s body
  at three lines or fewer and the only shared text is the warning, B's leverage drops to one message
  template, and **A is acceptable** (record why and drop T4). `status: open`

### D-57-c — The two `reportRefused` adapters (L1)
- **A. Leave them** (recommended). ARCH-25 kept a span name per route on purpose (C1.7); each is one call.
- **B. Inline the backlog's** into a direct `reportEncodeRefusal` call and lose its
  `qadi.http.decisionBacklog.refused` span.
- **Recommendation: A.** `status: open` (no task under A)

### D-57-d — Where the port route's cadence is specified (L1)
- **A. Add one sentence to `spec/behaviors/34-remote-ports.md`** stating the once-at-construction warning
  and citing ADR-QD-107, so the behavior doc and the ADR agree (recommended).
- **B. Leave it in the ADR only.** The behavior doc is where §11 says behavior lives.
- **Recommendation: A.** `status: open`

### D-57-e — `fixturePortsLayer`'s argument (L2)
- **A. `fixturePortsLayer(setups: PortSetups = {})`, one argument** (recommended). `PortSetup<K>` (the
  `answers | layer` union with `never` members) moves into `Ports.ts`. `PortFixtures` and the `overrides`
  parameter go, and so does the private `fixtureLayer` helper. Built as
  `mergePorts(mapPorts((d) => setupLayer(d, setups[d.port])))`, where `setupLayer` falls back to the
  module's `NONE[d.port]`. `qadiReviewLayer` passes `options?.ports ?? {}` straight through. Devtools wraps
  each optional data field as `{ answers }`. Unreleased, so no break (C2.3).
- **B. Data only: `fixturePortsLayer(data: PortFixtures)`**, dropping `overrides`. `@qadi/testing` then
  composes its own `mapPorts` over `PortSetups` with `PORT_FIXTURES`. That keeps core's argument
  serializable-shaped, but puts a second generic per-port fold in testing.
- **C. Status quo.** Three hand-enumerated records and a rule nothing reaches.
- **Recommendation: A.** ARCH-42 T6 step 2 described this shape (C2.4), ADR-QD-050 is respected because
  devtools passes only `{ answers }`, and the precedence rule becomes inexpressible instead of
  documented. `status: open`

### D-57-f — Who exports `PortSetup`/`PortSetups` (L2)
- **A. `@qadi/core` only** (recommended). `@qadi/testing`'s `TestLayerOptions.ports` is typed with core's
  `PortSetups`; testing's barrel stops exporting the two names (never released). One overview row.
- **B. Core declares, testing re-exports** (`export type { PortSetup, PortSetups } from "@qadi/core"`). A
  testing user imports from one package, but one concept gets two overview rows.
- **Recommendation: A.** Testing users already import `scriptedPort`/`attributeResolverPort` from core
  for the `{ layer }` form. `status: open`

### D-57-g — Where the resolved gate writer lives (L3)
- **A. A package-private React context** (recommended). `GateWriter.ts` gains
  `GateWriterContext = createContext<GateWriter | undefined>(undefined)` and
  `useGateWriter = () => useContext(GateWriterContext)`. Neither is exported from the barrel. `QadiProvider`
  computes `writer = useMemo(() => (instrument ? gateWriterFor(gates) : undefined), [instrument, gates])`
  once, provides it, and reports `UnwritableGateRegistry` from `instrument && writer === undefined`.
  `useGate` and `useQuestionsAs` read `useGateWriter()`. That makes one decision, unreachable from outside
  (the context object is not exported), with no public change.
- **B. A package-private hook in `useGate.ts`** that re-derives from `useQadiContext` (two consumers
  share it). The provider still checks separately, so this is two derivations, not one.
- **C. `writer` on `QadiContextValue`** (the review's wording). **Rejected:** C3.2. It exposes the handle and
  contradicts ADR-QD-080 and D-43-b(D).
- **D. Status quo.**
- **Recommendation: A.** `status: open`

### D-57-h — `useDecisionSuspense`'s second memo (L3)
- **A. `useGate` returns its `atom` on the internal `Gate`, and `useDecisionSuspense` passes it to
  `useAtomSuspense`** (recommended). This drops one `useMemo` and one `useQadiContext` call. `Gate` is
  internal (`useGate` is out of the barrel). No render change (C3.4).
- **B. Leave it.** It is correct, and the probe shows no cost.
- **Recommendation: A**, as part of T8 only. Drop it if the reviewer prefers zero churn. `status: open`

### D-57-i — Gate the citations (L4)
- **A. No gate; fix the seven** (recommended). A rule would need an allowlist for "used to live in" and
  "without its own `X.test.ts`" phrasing, which costs more than the drift (seven sites in ~400 files over
  two months).
- **B. A `cited-test-exists` house-style rule** over backticked `*.test.ts(x)` names in present-tense
  sentences, with a reasoned allowlist.
- **Recommendation: A.** `status: open`

### D-57-j — Capacity validation style (L5)
- **A. Keep the defect as BEH-QD-166 specifies**; add one sentence to `InvalidBoundedPermits`' doc and to
  BEH-QD-166 saying why the two differ (recommended). The bound is derived generically for five ports
  whose layers already carry an error channel through `PortDerivation.ts`; the cache's and the log's
  check a constant a caller wrote. Docs only.
- **B. A typed `InvalidCacheCapacity` (`Data.TaggedError`)** in `decisionCacheLayer`'s error channel.
  `Layer.Layer<DecisionCache>` becomes `Layer.Layer<DecisionCache, InvalidCacheCapacity>`. That breaks every
  caller's provided type and reverses BEH-QD-166, for a misconfiguration nobody recovers from.
- **C. Validate eagerly** (throw from `decisionCacheLayer(...)` itself, like `makeDecisionLog`), so a
  module-scope layer fails at import, not at first build. It changes the three `capacity` tests' shape
  (they observe an `Exit`), and a per-request layer gains nothing.
- **Recommendation: A.** `status: open`

### D-57-k — `ADR-QD-NEXT` left in source (L7)
- **A. Replace the 11 and add a check** to `spec/scripts/verify-traceability.sh` (gate 10, the script that
  already checks ADR IDs since D-45-g): `git grep -n "QD-NEXT" -- packages spec apps examples features`
  must be empty (recommended). `.planning/` is git-ignored and `.changeset/` is excluded, so the
  template's legitimate placeholders are untouched.
- **B. Replace only.** It recurs once per wave whose plans use the placeholder.
- **Recommendation: A.** This is a check inside an existing gate, not a new gate (the DoD table is
  unchanged). `status: open`

## 6. Tasks

Every task branches from `main` on its own branch (`arch-57/<item>`). Tasks within an item are ordered.
Items are independent except as noted.

### T0 — Re-verify evidence at the branch point
- **Status:** [ ] todo
- **Depends on:** —
- **Files:** none
- **Steps:**
  1. `git switch -c arch-57/<item> main`; record `git rev-parse --short HEAD`.
  2. Re-run every probe in §1's table with its command; each result must match §1. Re-create the two
     `node_modules` symlinks first if the scratchpad was cleared.
  3. `git log --oneline b655b3b..main -- packages/http/src packages/core/src/Ports.ts packages/testing/src packages/react/src/{useGate.ts,hooks.ts,QadiProvider.tsx,GateWriter.ts}`.
     If ARCH-47, ARCH-48, ARCH-49, ARCH-54 or ARCH-55 touched a cited symbol, re-locate it **by name**
     and correct this plan's line hints first.
  4. `git status --porcelain` is empty (C7.3).
- **Tests:** none
- **Verify:** probe outputs as in §1
- **Done when:** every §1 claim is re-observed or the plan is corrected.

### T1 — Red: a no-resource guarded route needs no loader (L1a)
- **Status:** [ ] todo
- **Depends on:** T0, D-57-a = A
- **Files:** `packages/http/test/PermissionRegistry.tst.ts` (*new*)
- **Steps:**
  1. Write four tstyche cases modelled on `GuardRoute.tst.ts`:
     - `addGuardedRoute("GET", "/x", p, policy)((_w, r) => …)` compiles, and `r` is `Resource`;
     - the five-argument form with `() => Effect.succeed<Doc>(…)` still types the handler's resource as `Doc`;
     - a four-argument handler that annotates its resource as `Doc` is rejected
       (`expect(…).type.toRaiseError()`);
     - the four-argument form's layer requirements equal the five-argument form's with
       `loadNoResource` (`expect<A>().type.toBe<B>()`), so the default adds no requirement.
  2. Run; the first, third and fourth cases fail to compile today (arity).
- **Tests:** 4 type cases
- **Verify:** `pnpm tstyche packages/http/test/PermissionRegistry.tst.ts` (expect the arity cases red)
- **Done when:** red observed and recorded in the PR body.

### T2 — `addGuardedRoute` defaults its loader; the four routes stop naming it (L1a)
- **Status:** [ ] todo
- **Depends on:** T1
- **Files:** `packages/http/src/PermissionRegistry.ts` (`addGuardedRoute`, `permissionRegistryRoute`);
  `packages/http/src/PortRoutes.ts` (`portRoutes`); `packages/http/src/DecisionStreamRoute.ts`
  (`decisionStreamRoute`); `packages/http/src/DecisionBacklogRoute.ts` (`decisionBacklogRoute`);
  `packages/http/src/NoResource.ts` (doc, blank line); `packages/http/src/AuthorizeRequest.ts` (blank line);
  `spec/behaviors/23-http.md` (BEH-QD-180 listing, `:347`'s "through `addGuardedRoute`'s `loadResource`");
  `spec/overview.md` (`addGuardedRoute` row, `:597`); `apps/website/src/content/docs/docs/packages/http.md`
  (`:118-131`, `:220`); `.changeset/guarded-route-default-loader.md` (*new*)
- **Steps:**
  1. Rewrite `addGuardedRoute` as two overload signatures plus one implementation, exactly the probe's
     shape (`$P/L1/optional-loader.ts`): a module-private `build(method, path, permission, policy, loadResource, handler)`
     holds today's `Layer.merge(HttpRouter.add(…guardRoute…), Layer.effectDiscard(PermissionRegistry.register(…)))`.
     The implementation's `loadResource` parameter defaults to `loadNoResource`. Keep the doc comment and
     add one paragraph: "Omit `loadResource` to evaluate against `NO_RESOURCE`, as `authorizeRequest` does."
  2. Delete the `loadNoResource` argument and import from the four routes.
  3. `NoResource.ts`: the `loadNoResource` doc becomes "`authorizeRequest`'s and `addGuardedRoute`'s
     default loader; not in the barrel: a caller omits `loadResource` instead of naming it". Delete the
     double blank lines (C7.2).
  4. Spec, overview and website text: name the four-argument form. The website's runnable fences are
     compiled by gate 23, so keep the existing five-argument example and add one no-resource line.
  5. Changeset: `"@qadi/http": minor` — "`addGuardedRoute` takes `loadResource` optionally; omitted, the
     route evaluates against `NO_RESOURCE`, as `authorizeRequest` does."
- **Tests:** T1 green; `http.test.ts`, `PortRoutes.test.ts`, `decisionStream.test.ts`,
  `decisionBacklog.test.ts` unchanged and green.
- **Verify:** `pnpm tstyche packages/http/test/PermissionRegistry.tst.ts`;
  `pnpm vitest run --project http`; `pnpm typecheck`; `node scripts/check-house-style.mjs`;
  `node scripts/check-api-surface.mjs`; `node scripts/check-website-doc-examples.mjs`;
  `git grep -n "loadNoResource" packages/http/src` (criterion 1)
- **Done when:** criteria 1–2 hold.

### T3 — Pin both unguarded cadences (L1 test gap; ships alone)
- **Status:** [ ] todo
- **Depends on:** T0 (no decision; green on HEAD)
- **Files:** `packages/http/test/http.test.ts` (the `/__permissions` unguarded test, `:313-340`);
  `packages/http/test/PortRoutes.test.ts`; `spec/traceability.md`
- **Steps:**
  1. `http.test.ts`: extend the existing test, or add a sibling, so it makes **two** requests and asserts
     **two** identical warning lines. Today's one-request assertion cannot fail if the warning moves to
     construction (C1.6).
  2. `PortRoutes.test.ts`: add `it.effect("the unguarded form warns once, at construction, naming its reason")`.
     Build `portRoutesUnguarded("test: reason", serving)` with `collectingLogger()` from `@qadi/testing`
     provided to the layer (`Layer.provideMerge(logger)`), make two `POST`s, and assert exactly one line
     whose message contains `"serving port routes unguarded"` and `"Reason given: test: reason"`.
  3. Mutation check by hand: move `portRoutesUnguarded`'s `logWarning` into the handler; the new test fails.
     Revert.
- **Tests:** 2 (green on HEAD)
- **Verify:** `pnpm vitest run packages/http/test/http.test.ts packages/http/test/PortRoutes.test.ts`
- **Done when:** criterion 3 holds, and both hand mutants were observed killed.

### T4 — One internal constructor for the unguarded routes (L1b)
- **Status:** [ ] todo — **blocked on ARCH-47** (its `identify` step) and D-57-b = B
- **Depends on:** T3, ARCH-47 merged, D-57-b
- **Files:** `packages/http/src/UnguardedRoute.ts` (*new*, out of the barrel);
  `packages/http/src/PermissionRegistry.ts` (`permissionRegistryRouteUnguarded`);
  `packages/http/src/PortRoutes.ts` (`portRoutesUnguarded`); `spec/behaviors/34-remote-ports.md`
  (D-57-d); `spec/overview.md` (row text of `permissionRegistryRouteUnguarded`, `portRoutesUnguarded`
  only if wording changes); `.changeset/unguarded-route-one-constructor.md` (*new*, patch)
- **Steps:**
  1. Red first: extend T3's port test with "two requests to two **different** served ports still log one
     warning". It is green on HEAD, and it is the case a per-route `"once"` would break.
  2. `UnguardedRoute.ts`: `export type Announce = "every-request" | "once"`;
     `export interface DeclaredUnguarded { readonly what: string; readonly consequence: string; readonly reason: string; readonly announce: Announce }`;
     `export const unguardedRoutes = <R>(declared: DeclaredUnguarded, routes: readonly [UnguardedRouteSpec<R>, ...Array<UnguardedRouteSpec<R>>]): Layer.Layer<never, never, …>`,
     where `UnguardedRouteSpec<R> = { method; path; handler: Effect.Effect<HttpServerResponse, never, R> }`.
     Build the one message, `qadi/http: serving ${what} unguarded — ${consequence}. Reason given: ${reason}`,
     then `Match.value(declared.announce).pipe(Match.when("once", () => Layer.merge(Layer.effectDiscard(Effect.logWarning(message)), merged(routes.map(add)))), Match.when("every-request", () => merged(routes.map((r) => add({ ...r, handler: Effect.andThen(Effect.logWarning(message), r.handler) })))), Match.exhaustive)`.
     The doc comment says: the reason is never read; neither cadence registers; the cadence applies to
     the family, not per route; why each cadence exists (BEH-QD-180, ADR-QD-107). The two message texts
     stay byte-identical to today's, which T3 pins.
  3. `permissionRegistryRouteUnguarded(reason)` → `unguardedRoutes({ what: "/__permissions", consequence: "the full authorization topology is public", reason, announce: "every-request" }, [{ method: "GET", path: "/__permissions", handler: snapshotResponse }])`.
  4. `portRoutesUnguarded(reason, serving, options?)` → `unguardedRoutes({ what: "port routes", consequence: "each answers only about the request's own subject", reason, announce: "once" }, <one spec per served port, each handler ARCH-47's identify-based body>)`.
     An empty `serving` (no port routed) keeps today's behaviour: today it still logs once. Either pass
     through a `routes.length === 0` branch that only warns, or confirm with the reviewer that an empty
     family warns nothing, and record the choice in the doc comment and in T3.
  5. Spec: `34-remote-ports.md` gains the cadence sentence under the `portRoutesUnguarded` prose (D-57-d = A).
- **Tests:** T3's tests and step 1's case stay green.
- **Verify:** `pnpm vitest run --project http`; `madge --circular --extensions ts,tsx packages/*/src`;
  `node scripts/check-house-style.mjs`; `node scripts/check-api-surface.mjs`;
  `git grep -n "Reason given" packages/http/src` (criterion 4)
- **Done when:** criterion 4 holds, T3 is green, and the public signatures are byte-identical in
  `spec/overview.md`.

### T5 — Red: a fixture environment takes the setup union (L2)
- **Status:** [ ] todo
- **Depends on:** T0, D-57-e = A, D-57-f = A
- **Files:** `packages/core/test/Ports.tst.ts`; `packages/core/test/Ports.test.ts` (`describe("fixturePortsLayer")`, `:481-592`)
- **Steps:**
  1. `Ports.tst.ts`: four cases, copied in spirit from `packages/testing/test/TestLayerOptions.tst.ts`:
     `fixturePortsLayer({ AttributeResolver: { answers: { tier: 5 } } })` compiles;
     `fixturePortsLayer({ RelationshipResolver: { layer: relationshipResolverFromEdges([]) } })` compiles;
     both forms for one port are rejected; and answers of the wrong shape are rejected.
  2. `Ports.test.ts`: rewrite the five `run(…, { X: samples.X.data })` calls as `{ X: { answers: samples.X.data } }`.
     **Replace** "an override wins over the same port's data, and leaves the others alone" with
     "a layer setup answers in place of the default, and leaves the others alone"
     (`AttributeResolver: { layer: scriptedPort(attributeResolverPort, () => PortReply.answer(1)).layer }`,
     `CustomPredicate: { answers: { isOwner: true } }` → tier denies, custom allows). Replace, don't layer:
     the precedence case has nothing left to test.
  3. Run; all red (signature).
- **Tests:** 4 type cases; 1 replaced runtime case; 5 rewritten calls
- **Verify:** `pnpm tstyche packages/core/test/Ports.tst.ts`; `pnpm vitest run packages/core/test/Ports.test.ts` (red)
- **Done when:** red observed.

### T6 — `fixturePortsLayer(setups)`; `answersOf`/`layersOf` go (L2)
- **Status:** [ ] todo
- **Depends on:** T5
- **Files:** `packages/core/src/Ports.ts` (`PortFixtures`, `fixtureLayer`, `fixturePortsLayer`; new
  `PortSetup`, `PortSetups`); `packages/testing/src/QadiReviewLayer.ts` (`PortSetup`, `PortSetups`,
  `answersOf`, `layersOf`, `qadiReviewLayer`); `packages/testing/test/TestLayerOptions.tst.ts`
  (import path); `packages/devtools/src/model/SimulationSource.ts` (`fixtureLayer`);
  `spec/decisions/094-a-port-is-described-once.md` (Amendment 1.3 sentence + Change History 1.5);
  `spec/overview.md` (`:287-288` core rows; `:784` testing row); `spec/traceability.md` (`:339`);
  `.changeset/port-fixture-table.md`, `.changeset/testing-observation-helpers.md` (edit);
  `packages/testing/README.md`, `apps/website/src/content/docs/docs/packages/testing.md` (only if they name
  `PortSetup`'s home — `git grep -n "PortSetup" packages/testing/README.md apps/website` first)
- **Steps:**
  1. `Ports.ts`: move `PortSetup<K>` and `PortSetups` here, with testing's doc comments (the `never`
     members, `answers` vs `layer`). Delete `PortFixtures` and `fixtureLayer`. Add the module-private
     `setupLayer` from `$P/L2/setups.ts`, using `NONE[d.port]` instead of `nonePort(d)`.
     `fixturePortsLayer = (setups: PortSetups = {}): Layer.Layer<PortServices> => mergePorts(mapPorts((d) => setupLayer(d, setups[d.port])))`.
     Rewrite its doc: "Every port, each set up from its `answers` (through `PORT_FIXTURES`) or its `layer`,
     or at its fail-closed default when absent. One way per port: both for one port is a type error, so
     there is no precedence."
  2. `QadiReviewLayer.ts`: delete `PortSetup`, `PortSetups`, `answersOf`, `layersOf`;
     `import type { PortSetups } from "@qadi/core"`; `fixturePortsLayer(options?.ports ?? {})`.
     `TestLayerOptions.ports` keeps its doc.
  3. `SimulationSource.ts` — `fixtureLayer`: wrap each optional field with a two-line local
     `answers = <T>(data: T | undefined) => (data === undefined ? undefined : { answers: data })`. Keep
     the CustomPredicate comment. If ARCH-48 has landed and tabulated these fields, apply the wrap at its
     single site instead.
  4. ADR-QD-094 Amendment 1.3: replace "`fixturePortsLayer(data, overrides?)` is the one place a set of
     fixture data becomes an environment" with "`fixturePortsLayer(setups)` is the one place a port's setup
     (its fixture data, or a layer of its service) becomes an environment, one way per port". Add Change
     History "1.5 (date): amendment 1.3's signature corrected before release; precedence removed (ARCH-57,
     CCR-QD-NEXT)".
  5. Overview: core row `PortFixtureData`, `PortSetup`, `PortSetups` (drop `PortFixtures`); the
     `fixturePortsLayer` row reads "one setup per port"; the testing row drops `PortSetup`, `PortSetups`.
  6. Edit both pending changesets in place: core's names `PortSetup`/`PortSetups` and
     `fixturePortsLayer(setups)`; testing's says "`PortSetup`/`PortSetups` come from `@qadi/core`" and drops
     "New exports `PortSetup` and `PortSetups`".
- **Tests:** T5 green; `packages/testing/test/TestLayers.test.ts` and `TestLayerOptions.tst.ts` unchanged
  in substance; `packages/devtools/test/model/SimulationSource.test.ts` and `Simulation.test.ts` green;
  BDD (`features/step-definitions/Bridge.ts` goes through `qadiTestLayer`) green.
- **Verify:** `pnpm vitest run --project core --project testing --project devtools`; `pnpm tstyche`;
  `pnpm test:bdd`; `pnpm typecheck`; `node scripts/check-api-surface.mjs`;
  `bash spec/scripts/verify-traceability.sh --strict`; criterion 5's grep
- **Done when:** criterion 5 holds.

### T7 — Characterize "off means absent" on the multi-question surface (L3)
- **Status:** [ ] todo
- **Depends on:** T0 (no decision; green on HEAD)
- **Files:** `packages/react/test/GateRegistry.test.tsx`
- **Steps:**
  1. `git grep -n "usePolicies\|useQuestions" packages/react/test/GateRegistry.test.tsx`. If no case covers
     them under (a) `instrument` off and (b) `instrument` on with a hand-built `gates`, add
     `it("usePolicies registers nothing when off, or under a hand-built registry")`: render with each
     provider and assert `instances()` is empty and no `data-qadi-gate` element exists. This pins the
     `useQuestionsAs` third of C3.1 before T8 moves it. The `useGate` thirds are already pinned by
     "a hand-built `gates` registers nothing and renders no marker" (`:468`) and INV-QD-046's tests.
- **Tests:** 0–1 (green on HEAD)
- **Verify:** `pnpm vitest run packages/react/test/GateRegistry.test.tsx`
- **Done when:** all three derivation sites are pinned by a test.

### T8 — Resolve the writer once, in the provider, behind a private context (L3)
- **Status:** [ ] todo
- **Depends on:** T7, D-57-g = A (D-57-h optional)
- **Files:** `packages/react/src/GateWriter.ts` (`GateWriterContext`, `useGateWriter` — *new symbols*);
  `packages/react/src/QadiProvider.tsx` (`QadiProvider`); `packages/react/src/useGate.ts` (`useGate`,
  `Gate`); `packages/react/src/hooks.ts` (`useQuestionsAs`, `useDecisionSuspense`); `spec/invariants.md`
  (INV-QD-046 Source: name the provider as where "off" is decided)
- **Steps:**
  1. `GateWriter.ts`: `export const GateWriterContext = createContext<GateWriter | undefined>(undefined)`
     and `export const useGateWriter = (): GateWriter | undefined => useContext(GateWriterContext)`, with a
     doc comment: "the provider's resolved writer, `undefined` when instrumentation is off or the registry is
     not one this package built; package-private (not in the barrel), so the handle stays unreachable
     (ADR-QD-080)".
  2. `QadiProvider.tsx`: `const writer = useMemo(() => (instrument ? gateWriterFor(gates) : undefined), [instrument, gates])`.
     The unwritable effect becomes `if (instrument && writer === undefined) report(…)`, depending on
     `[instrument, writer]`. Wrap children in `<GateWriterContext.Provider value={writer}>` inside
     `QadiContext.Provider`. `value` is unchanged (`{ atoms, registry, instrument, gates }`).
  3. `useGate.ts`: replace the `writer` `useMemo` with `const writer = useGateWriter()`; `instrument`
     and `gates` drop out of its destructure. Under D-57-h = A, add `readonly atom: Atom.Atom<DecisionResult>`
     to `Gate` and return it.
  4. `hooks.ts` — `useQuestionsAs`: the same replacement. Under D-57-h = A, `useDecisionSuspense` becomes
     `const { atom } = useGate("useDecisionSuspense", policy, resource); return useAtomSuspense(atom, { suspendOnWaiting: true }).value;`.
     Keep its doc comment on the delegated read (ARCH-14 D-14-e).
- **Tests:** every existing react test passes **untouched** (AGENTS.md §13); T7 green.
- **Verify:** `pnpm vitest run --project react`; `stryker run stryker.react.mjs` (gate 22, unchanged
  scope); `madge --circular --extensions ts,tsx packages/*/src`; `node scripts/check-api-surface.mjs`
  (no `@qadi/react` diff); `node scripts/check-house-style.mjs` (`DECISION_READ_BUDGET`); criterion 6's grep
- **Done when:** criterion 6 holds.

### T9 — Render-count guard for the suspense surface (L3, optional)
- **Status:** [ ] todo — only if D-57-h = A
- **Depends on:** T8
- **Files:** `packages/react/test/hooks.test.tsx`
- **Steps:**
  1. Port `$P/L3/double-subscription.test.tsx`'s harness as one test: with a 5 ms resolver,
     `useDecisionSuspense` renders the same count (3 to settle, 6 after one invalidation, 3 commits) as a
     bare `useAtomSuspense` read. Assert equality between the two, not absolute numbers, so React
     upgrades do not break it.
- **Tests:** 1
- **Verify:** `pnpm vitest run packages/react/test/hooks.test.tsx`
- **Done when:** the test passes, and fails if `useDecisionSuspense` is changed to read the atom through
  a third subscription that re-renders (hand mutant: wrap in a `useState` mirror).

### T10 — Correct the citations (L4; docs-only, ships alone)
- **Status:** [ ] todo
- **Depends on:** T0, D-57-i
- **Files:** the seven sites of C4.2's table, plus `predicate-prisma/test/generators.ts:45-46` and
  `CompilePrismaWhere.test.ts:234-238` (tense only)
- **Steps:**
  1. Apply C4.2's "Should cite" column verbatim. For `CompileSql.test.ts:548-551`, keep the golden-text
     rationale and change the subject to the past: "the retired `interpretSqlFragment` (ARCH-03 T7), and
     the property that drove it, would have agreed with the old text too".
  2. `Role.ts:104` is shipped source. Re-read `RolesAndDepth.test.ts:255-265` and confirm it asserts
     set equality of `permissionProvenance(…)` and `flattenPermissions(…)` before citing it. If it
     asserts something weaker, add the equality assertion there in this task.
  3. Under D-57-i = B, add the rule to `scripts/check-house-style.mjs` with the allowlist, test it on a
     scratch edit, and add an AGENTS.md line. **Not recommended.**
- **Tests:** none (or the one assertion in step 2)
- **Verify:** `$P/L4/dangling-citations.sh` (criterion 7); `pnpm vitest run packages/core/test/RolesAndDepth.test.ts`
- **Done when:** criterion 7 holds.

### T11 — Say why the bound is typed and the capacity is a defect (L5; docs-only)
- **Status:** [ ] todo
- **Depends on:** T0, D-57-j = A
- **Files:** `packages/core/src/Errors.ts` (`InvalidBoundedPermits` doc); `packages/core/src/DecisionCache.ts`
  (`decisionCacheLayer` doc's capacity paragraph); `spec/behaviors/21-decision-cache.md` (BEH-QD-166 prose
  + Change History)
- **Steps:**
  1. One paragraph each, the same fact in both places: "`…Bounded` is derived for every port by
     `PortDerivation.ts`, whose layers already carry an error channel, so its permit check is a typed
     `InvalidBoundedPermits` a composition can report. `decisionCacheLayer({ capacity })` and
     `makeDecisionLog({ capacity })` check a constant the caller wrote, which no caller recovers from, so it
     fails as a defect (BEH-QD-166)."
  2. Under D-57-j = B or C instead: a red test first (`DecisionCache.test.ts`'s three capacity cases
     rewritten to expect the typed failure, or a synchronous throw), then the change, BEH-QD-166 rewritten,
     overview row, and `@qadi/core: minor` (**breaking** under B). **Not recommended.**
- **Tests:** none under A
- **Verify:** `bash spec/scripts/verify-traceability.sh --strict`; `pnpm typecheck`
- **Done when:** criterion 8 holds.

### T12 — Pin a batch under a cache and a sink; correct INV-QD-016 (L6)
- **Status:** [ ] todo
- **Depends on:** T0 (no decision; green on HEAD)
- **Files:** `packages/core/test/SubjectSet.test.ts`; `spec/invariants.md` (INV-QD-016 Source + Change
  History); `spec/traceability.md` (SubjectSet row gains INV-QD-033)
- **Steps:**
  1. Add `describe("under a decision cache and a sink")`, providing `decisionCacheLayer()` and a
     collecting `DecisionSink` (the helper `DecisionSink.test.ts` already uses; `git grep -n "collectingSink\|recordingSink" packages/core/test`):
     - "two subjects with one id and different roles each get their own decision" (INV-QD-033 through the
       batch: one allowed by role, one denied; the walk ran twice);
     - "two equal subjects share one walk, and each still has its own evaluation id" (INV-QD-025: the second
       record's `cacheOutcome` is `"hit"` and its `evaluationId` differs);
     - "the sink receives one decided record per element, in input order, each naming its own subject id".
  2. All three are green on HEAD (C6.1). They are characterizations, not reds. Hand-mutate `decideSubject`
     to `decideQuestion(questionOf(subjects[0], …))` and confirm at least one fails, then revert.
  3. INV-QD-016 Source: replace "Nothing is memoised across elements and the batch holds no state of its
     own" with "The batch holds no state of its own. A wired `DecisionCache` keys on the whole subject
     ([INV-QD-033](#…)), so it can share a walk only between equal subjects, and each element still gets
     its own evaluation id (INV-QD-025)." Enforcement gains the three test names. Change History row.
- **Tests:** 3 (green)
- **Verify:** `pnpm vitest run packages/core/test/SubjectSet.test.ts`;
  `bash spec/scripts/verify-traceability.sh --strict`
- **Done when:** criterion 9 holds.

### T13 — Replace `ADR-QD-NEXT`; refuse it in gate 10 (L7)
- **Status:** [ ] todo
- **Depends on:** T0, D-57-k
- **Files:** the 11 sites of C7.1; `spec/scripts/verify-traceability.sh` (under D-57-k = A)
- **Steps:**
  1. Replace per C7.1's mapping (ARCH-31 → ADR-QD-107, ARCH-22 → ADR-QD-101). Test titles change
     (`describe("wire (ADR-QD-107)")` etc.). Check `spec/traceability.md` for any row keyed on the old
     title text: `git grep -n "ADR-QD-NEXT" spec/traceability.md` (expected nothing).
  2. Under A: add to `verify-traceability.sh`, beside the D-45-g ADR-ID check, a step that fails with the
     offending `file:line` when `git grep -n "QD-NEXT" -- packages spec apps examples features` is non-empty.
     Prove it fails on a scratch edit, then revert.
- **Tests:** the gate step (A)
- **Verify:** `bash spec/scripts/verify-traceability.sh --strict`; `git grep -n "QD-NEXT" -- packages` (criterion 10);
  `pnpm vitest run packages/core/test/PortConformance.test.ts packages/core/test/PortRemote.test.ts packages/core/test/PortServe.test.ts packages/http/test/PortRoutes.test.ts`
- **Done when:** criterion 10 holds.

### T14 — Spec, traceability, CCR and changesets, one block per item
- **Status:** [ ] todo
- **Depends on:** the item's implementation task
- **Files:** `spec/README.md` (one CCR row per merged item, `CCR-QD-NEXT` until assigned, numbers taken
  at merge); `spec/traceability.md`; the `.changeset/` files named in T2, T4 and T6
- **Steps:**
  1. One CCR per item that changes spec text: L1a (BEH-QD-180 listing, overview), L1b (BEH 34 sentence),
     L2 (ADR-094 amendment correction), L3 (INV-QD-046 Source), L5 (BEH-QD-166), L6 (INV-QD-016), L7
     (gate 10 step). L4 changes no spec text.
  2. Changesets: as in §4. Do **not** run `changeset version`.
- **Tests:** —
- **Verify:** `bash spec/scripts/verify-traceability.sh --strict`; `node scripts/check-api-surface.mjs`
- **Done when:** every merged item has its CCR row and changeset (or a recorded "none").

### T15 — Full gate per item branch
- **Status:** [ ] todo
- **Depends on:** T14 for that item
- **Files:** none
- **Steps:** `pnpm check:pr` on each item branch. Run the full `pnpm check` (with mutation) for L1 and L3
  at least once, because they change pinned behavior in `stryker.http.mjs`'s and `stryker.react.mjs`'s
  scope. `git status --porcelain` is empty before committing (C7.3).
- **Verify:** `pnpm check:pr` exit 0
- **Done when:** green.

### T16 — Update the tracker
- **Status:** [ ] todo
- **Depends on:** T15
- **Files:** this plan (§10, task statuses); `.planning/architecture/README.md` (wave-5 table row and
  decision register)
- **Steps:** tick tasks; record D-57-x outcomes; mark T4 `[-] dropped` with a reason if D-57-b = A, and
  T9 if D-57-h = B.
- **Done when:** `./progress.sh 57` reflects the branch.

## 7. Test strategy

- **Survive unchanged:** every `http` test except the `/__permissions` unguarded case (extended, T3);
  every react test (§13's rule, T8); `TestLayers.test.ts`; `SimulationSource.test.ts`; the BDD suite;
  `DecisionCache.test.ts`'s capacity block (L5 = A).
- **Move to the new interface:** `Ports.test.ts`' five `fixturePortsLayer` calls (`{ answers }`);
  `TestLayerOptions.tst.ts`' import of `PortSetup` (now from core).
- **Deleted as redundant (replace, don't layer):** `Ports.test.ts` "an override wins over the same port's
  data". The type test "both forms for one port are rejected" (T5) takes its place, because the state
  it tested can no longer be built.
- **New type tests:** `PermissionRegistry.tst.ts` (T1, 4 cases); `Ports.tst.ts` (T5, 4 cases).
- **New characterizations (green on HEAD):** T3 (cadence ×2), T7 (0–1), T12 (×3). Each names the hand
  mutant it was checked against.
- **Property/differential:** none new. T12's "equal subjects share one walk" is a hit/miss differential
  in the sense of INV-QD-025's existing tests, applied to a batch.
- **Mutation (Stryker):** T3 kills the "move the warning" mutants in `PortRoutes.ts` and
  `PermissionRegistry.ts` (`stryker.http.mjs`, gate 21). L2's `setupLayer` has two branches: the
  `answers` arm is killed by the five rewritten `run` calls, and the `layer` arm by the replaced runtime
  case (core gate 16). L3 moves branches without adding any; T7 and INV-QD-046's tests keep
  `stryker.react.mjs`' scope (`DecisionOutcome.ts`, `QuestionBook.ts`) unaffected.

## 8. Spec and documentation updates

| Item | Spec / docs | Gate |
| ---- | ----------- | ---- |
| L1a | BEH-QD-180 listing (`23-http.md`), `:347` wording; overview `addGuardedRoute` row; website `packages/http.md`; `NoResource.ts` doc; changeset `@qadi/http: minor` | 13 (`check-api-surface.mjs`), 23 (`check-website-doc-examples.mjs`), 9 (`check-doc-examples.mjs`) |
| L1 (T3) | `traceability.md` rows for the two tests (BEH-QD-180; the remote-ports behavior doc, 34) | 10 (`verify-traceability.sh --strict`) |
| L1b | `34-remote-ports.md` cadence sentence (D-57-d); changeset `@qadi/http: patch` | 10 |
| L2 | ADR-QD-094 Amendment 1.3 sentence + Change History 1.5; overview core rows (`:287-288`) and testing row (`:784`); traceability `:339`; two **pending** changesets edited, none added | 13, 10 |
| L3 | INV-QD-046 Source names the provider's single resolution; no overview change | 10, 13 (no diff) |
| L4 | none in `spec/` | — |
| L5 | BEH-QD-166 prose + Change History; `Errors.ts`/`DecisionCache.ts` docs | 10 |
| L6 | INV-QD-016 Source + Enforcement + Change History; traceability | 10 |
| L7 | `verify-traceability.sh` gains the `QD-NEXT` refusal (inside gate 10; the DoD table is unchanged, so gate 11 `check-dod-table.mjs` is unaffected) | 10 |

CCRs: one `CCR-QD-NEXT` per item, numbered at merge. ADR: no new ADR. ADR-QD-094 is amended (L2).
ADR-QD-107's cadence sentence is mirrored into BEH 34, not changed. **Releases:** changesets only; no
version PR is merged without the user's explicit go-ahead.

## 9. Risks and rollback

- **L1a overloads change `addGuardedRoute` from a `const` to a `function`.** A host that wrote
  `typeof addGuardedRoute` against the curried arrow type sees an overload set. That is unlikely and
  additive for every call site. Rollback: revert T2; T1's type test goes with it.
- **L1b depends on ARCH-47's shape.** If ARCH-47 lands an `identify` that already wraps the whole unguarded
  body, T4 shrinks to the message template, and D-57-b's fallback (A) applies. The "once for the family"
  subtlety (T4 step 3) is the one way to get it wrong: a per-port `"once"` would log five warnings. T4's
  extra test catches it.
- **ARCH-54 (decision-stream protocol owner) and ARCH-49 (guardApi access plan)** edit
  `DecisionStreamRoute.ts` and `PermissionRegistry.ts`'s neighbours. T2's edits there are one argument each;
  rebase whichever lands second.
- **L2 vs ARCH-48.** ARCH-48 reshapes devtools' fixture fields around `SimulationSource.ts`. Land T6 first
  (one wrap), or let ARCH-48 apply the `{ answers }` wrap at its single site. **L2 vs ARCH-55** (named core
  barrel): if ARCH-55 lands first, T6 adds `PortSetup`/`PortSetups` to its named list and removes
  `PortFixtures`. Gate 13 fails loudly either way.
- **L2 must land before the next release.** After the pending changesets ship, D-57-e becomes a breaking
  change to two published packages. If wave 5 slips past a release, re-evaluate D-57-e against a
  deprecation path.
- **L3's second context adds one provider element.** It renders no DOM (a context provider is not a host
  element), so INV-QD-046's "a consumer's DOM must not change" holds. The react suite proves it.
  Rollback: revert T8; the three derivations return unchanged.
- **L6's tests could be read as specifying cache sharing between equal subjects.** That *is* specified
  (INV-QD-025/033). The test names say "equal", not "same id".
- **L7's gate step** could trip on a future wave's code that cites a plan's `ADR-QD-NEXT` before numbering.
  That is the intended effect: number it in the same PR.
- **ARCH-46/ARCH-51/ARCH-55 touch `PortDescription.ts`/`PortRemote.ts`/`PortWire.ts`**, three of T13's
  comment sites. Do T13 early, or have those plans carry the corrected numbers; the gate step makes the
  order safe either way.

## 10. Progress log

| Date | Task | Change | By |
| ---- | ---- | ------ | -- |
| 2026-10-13 | — | plan written; evidence verified at `b655b3b` (probes `scratchpad/wave5/ARCH-57/{L1,L2,L3,L4}`) | planner |
| 2026-10-13 | all | implemented in one commit (T9 skipped, O4 left) | impl |
