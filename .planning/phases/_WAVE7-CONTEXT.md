# Wave 7 (v1.2): shared context for Phases 21–29

**Read first:** `.planning/phases/_SHARED-CONTEXT.md`. Its house rules, user preferences, verify-command hygiene and XC-05
mutation procedure all apply. **This file overrides only the items it names:** source review, base commit, numbering, and
the per-phase evidence below.

**Source review:** 2026-11-11 architecture review, `/var/folders/vn/44p0pxgs4z98v7cl11l4_r4c0000gp/T/architecture-review-20261111-011702.html`
(local, outside the repo; this file holds everything a planner needs from it). Review scope: the files that changed in each of
the last five architecture waves (#148–#155).

**Base commit:** `965ff14c` (`main`, v1.1 Arch Wave 6 merged as #155). Every phase's base is its first commit's parent (rule
unchanged from `_SHARED-CONTEXT.md`); "RED on the phase base" replaces "RED on `1721a42`".

## Execution order
Phases run strictly one at a time, in numeric order (21 → 29). Same reasons as wave 6: every records plan edits the same
spec registers, `use_worktrees` is false. Content dependencies are stated per phase in ROADMAP.md.

## Numbering reserved for v1.2
Next free on `965ff14c`: ADR-QD-133, CCR-QD-411, BEH-QD-440, INV-QD-286. Highest ARCH is ARCH-68. **The whole block below is
reserved in the shared reservation file** (`$(git rev-parse --git-common-dir)/qadi-reserved-ids.json` set to CCR 419, ADR 141,
BEH 484, INV 303 on 2026-11-11), so `next-id.mjs` run by any other work hands out numbers above it. **Never run
`node scripts/next-id.mjs` while executing these phases**: it writes a reservation on every call. Confirm a reserved number is
free with grep over `spec/`, `packages/`, `.changeset/` and `AGENTS.md` (excluding CCR rows that list it as "Unused"). A reservation that goes unused is named in the
phase's CCR row ("Unused: …"), the way CCR-QD-409/410 do it.

| Phase | ARCH | ADR-QD | CCR-QD | BEH-QD | INV-QD |
|---|---|---|---|---|---|
| 21 | 69 | 133 | 411 | 440–444 | 286–287 |
| 22 | 70 | 134 | 412 | 445–449 | 288–289 |
| 23 | 71 | 135 | 413 | 450–454 | 290–291 |
| 24 | 72 | 136 | 414 | 455–459 | 292–293 |
| 25 | 73 | 137 | 415 | 460–464 | 294–295 |
| 26 | 74 | 138 | 416 | 465–469 | 296–297 |
| 27 | 75 | 139 | 417 | 470–474 | 298–299 |
| 28 | 76 | 140 | 418 | 475–479 | 300–301 |
| 29 | 77 | 141 | 419 | 480–484 | 302–303 |

ARCH ids below 69 are never reused. ADR Document IDs must equal the file number (gate 10).

## Correction to the review (verified while planning, 2026-11-11)
The review's candidate 1 claimed a key that leaves out a field "makes two questions share one cached answer in an
authorization cache". That claim is wrong. Phase 17 (`17-CONTEXT.md`, Evidence) verified that **evaluation does not read the
port key**; `DecisionCache` and `Question` use `Equal.equals`. The key is read by devtools capture/replay
(`packages/devtools/src/model/Capture.ts:106,215`), `scriptedPort`/`replyTable` (`packages/core/src/PortDoubles.ts:117,121`)
and `SignatureHistory.ts:334` (`pairKey`). The harm of a dropped field is a wrong replay or a wrong test-double answer, which can
hide or invent a decision during review. That is still a defect worth closing, but not a production grant. Phase 21's
records say so.

## Already deep (do not re-plan)
Reviewed 2026-11-11 and found deep: `PortDerivation`, `PortDoubles`, `Ports.ts` (`tabulatePorts`, `portsLayer`,
`decoratePorts`), `readPort`, `PortRemote` (`answerRemotely`, `askRemotely`, `servingFor`), `PortWireEncode`, SinkCodec's
*public* interface, `DecisionLog`/`DecisionStream`/`DecisionCache`, `Qadi.permitted`/`discharge`, Walk's port arms, the error
tables (ADR-102), `AuthorizeRequest` (ADR-108), `GuardApi`/`AccessPlan`/`RequirePermissionMiddleware` (ADR-118), the decision
routes, `PortRoutes`, `HydrationEngine`'s planning, `QadiAtoms`, `Hydration.ts` (a deliberate facade, ADR-078), `Capture.ts`,
`Source.ts`, `PolicyExplorer`/`RoleViewer`/`Inspector`/`QuestionsPanel` (render-only). The small span/interpreter leaves
(`PortInterpreter.ts`, `PortSpanDecode.ts`, `SinkWire.ts`) fail the deletion test on paper, but merging them is a barrel-policy
change (AGENTS.md §9, ADR-099), not a deepening.

## Evidence per phase (from the review; each planner re-verifies against `965ff14c` before planning)

### Phase 21: the port request is derived from its description (review candidate 1)
- In 4 of 5 ports, `key` is `canonicalKey` over the wire question's fields, listed by hand in schema order:
  `AttributeResolver.ts:185`, `RelationshipResolver.ts:250-251`, `DecisionHistory.ts:192`, `SignatureHistory.ts:264-265`.
  The tuple is `unknown[]`, so a forgotten field compiles. Only `PortConformance.test.ts`'s "request keys" rows catch it.
- `defect` is `failure(args, Cause.squash(cause))` in the same four (`AttributeResolver.ts:183`, `RelationshipResolver.ts:244`,
  `DecisionHistory.ts:190`, `SignatureHistory.ts:258`). CustomPredicate differs on purpose: `Cause.pretty`
  (`CustomPredicate.ts:218`), and its key covers the whole subject and non-JSON `params` (`CustomPredicate.ts:219+`).
- SignatureHistory states its four request fields (`subjectId`, `resourceId`, `meaning`, `signerRole`) about 8 times: `SignatureQuery`
  (49–63), span struct (124–136), `pose` (143–149), wire schema (176–181), `toQuestion` (183–189), `fromQuestion` (190–197), `key`
  (264–265), and `PortAccess.ts` (450–456, 464). ADR-109 had to touch all of them to add `meaning`/`signerRole`.
- `toQuestion` builds optional keys with conditional spreads, so a missing field is silently dropped from the wire.
- ADRs: extends ADR-QD-094 (described once) and ADR-QD-107 (the wire question); Phase 17's ADR-094 amendment (the key law's
  equality is `PortKey`'s) stays.

### Phase 22: one resource-scoped port read (review candidate 3)
- `typeof rawResourceId === "string" ? makeResourceId(rawResourceId) : undefined` appears ×3 (`PortAccess.ts:316,394,453`), and
  `askSignature` calls `makeResourceId` again at 461.
- `askActedForResource` (326) and `askSignature` (461) validate through `requireResourceId` (264), an
  `Effect.fn("qadi.requireScopedResourceId")`, which opens a nested span. `askRelationship` inlines the check to avoid that span
  (comment at 389–390). So the trace for a missing id depends on which port was asked.
- `askSignature(subject, meaning, signerRole, scope, rawResourceId)` takes two adjacent `string`s; `Walk.ts:43-58` already warns
  about that slip.
- The leaf→question mapping is stated twice: by Walk/PortAccess when building requests, and by each port's `serving.leaves`
  (`SignatureHistory.ts:212`, `AttributeResolver.ts:151`). Only the `servingFor` property test (`PortRemote.ts:193-195`) keeps them
  in agreement.
- ADRs: ADR-QD-077 (both interpreters read ports through one module), ADR-QD-109 (span projected once; accepted the duplicate
  early annotation, never decided to merge the reads), ADR-QD-051 (spans are product observability: a span change is a
  public-behaviour change).

### Phase 23: the sink record's fields are stated once (review candidate 6)
- The record shape is written in 5 places: `DecisionRecord.ts:59-156`, `SinkCodec.ts` `decisionV2Fields` 138–149 and
  `obligationsV2Fields` 152–165, `project` 202–228, `rebuild` 278–315, `SinkEmit.ts` 66–133, plus `SinkWire.ts:29`'s restated
  `SinkRecordTag` (an import-cycle workaround pinned by a type test).
- The obligation record's optional `subjectId`/`action`/`resourceId` are conditional spreads ×3 (`SinkEmit.ts:130-131`,
  `SinkCodec.ts:211-213`, `SinkCodec.ts:288-292`). Leaving one out of `project` compiles; INV-QD-096's round trip catches it only
  if its generator produces the field.
- `failedRecord` and `decidedRecord` are the same function apart from `cache`.
- SinkCodec has had 16 commits since September, the most of any core file.
- Precedent: ADR-060 ("the class is the wire schema", for errors). Caveat: if the record class becomes `Schema.TaggedClass`, its
  constructor may validate on every `new`, which costs time on every evaluation. Benchmark first, or keep `Data.TaggedClass` and derive its field
  type from the shared struct.
- ADRs: ADR-QD-095 (SinkCodec owns both directions), ADR-QD-096 (versioned wire, exclusive outcome), ADR-QD-106 (a decision is
  constructed from its trace: `rebuildOutcome`'s checks stay). Prior phase: v1.0 Phase 9 (ARCH-54), which put every projection in
  `SinkEmit.ts` (`.planning/milestones/v1.0-phases/09-sink-record-projection/`).

### Phase 24: the source-choice rule moves into SimulationSource (review candidate 4)
- `SourceChoice`, `SourceOption`, `SourceRefusal`, `resolveSource` and `sourceOptions` live in `model/SimulationSession.ts:43-123`,
  not in `model/SimulationSource.ts`.
- Availability is written twice: `capture === undefined` at :81 and :109–111, `ports === undefined` at :89 and :117–119, with the
  same two reason strings.
- `SimulationSession.ts:451-466` reaches into a variant and re-wraps it:
  `resolved.source._tag === "Live" && ports !== undefined ? capturing(ports) : undefined; const source = recorder === undefined ? resolved.source : live(recorder.layer)`.
  `ports !== undefined` re-checks a fact `Live` already carries.
- The defining rule of the three-source design ("a Live run captures so Snapshot unlocks") lives in neither source module.
- ADR: ADR-QD-050 (three sources).

### Phase 25: a session-only Simulator (review candidate 5)
- `react/Simulator.tsx:53-91` keeps an `OwnedSimulator`/`SharedSimulator` split. `OwnedSimulator` (:85) is used only by
  `test/react/Simulator.test.tsx`; production renders `<Simulator sightings={…} session={…} />` (DevtoolsDock :345) and silently ignores
  `sightings`. `PolicyExplorer` already went session-only (ARCH-58).
- View-side logic: `session.edit(withAction(draft, actionOf(...)))` composes form codecs in the view (resource and subject have
  commands); `/^\d+$/` parses select values back into sightings; the view builds the sweep cost sentence, calls `readOutcome(...)`,
  computes `summarise(baseline)` and `matchesBaseline` (`Simulator.tsx:162-187,253-264,351,437,544,573-595,648-656`).
- Leaked run lifecycle: `useSimulationSession.ts:47-52` runs `if (session.hasRetired()) Effect.runFork(session.reap)` on every
  notification. `makeSimulationSession` is public, so every other shell must copy that protocol.
- `Inspector.FailurePanel` and `Simulator.SimulatedFailure` repeat the same "This is not a denial" sentence (Phase 29 owns the shared
  constant; Phase 25 must not add a third copy).

### Phase 26: a headless dock model (review candidate 2)
- `react/DevtoolsDock.tsx:148-184` builds, in order: `useTimeline`, `sightings = useMemo(catalogueOf(timeline, catalogue))`,
  `useOwnedSimulationSession({sightings, ports})`, `useOwnedExplorerSession(sightings)`, `useOwnedHeldChoice(...)`,
  `useOwnedDockSession(timeline, simulation)`.
- Each `useOwnedX` (`useDockSession.ts`, `useExplorerSession.ts`, `useSimulationSession.ts:83-112`) repeats
  `useState(() => makeX(...))` plus one `useLayoutEffect(() => x.setY(y))` per input; 9 `useLayoutEffect`s in total.
- Cross-store rules therefore live only in layout effects and are tested only through the DOM: `test/react/DevtoolsDock.test.tsx`
  is 1,430 lines; cases such as "a timeline change after a replay keeps the replayed form" (l.1060) and "a new head during the
  visit does not change what the explorer shows" (l.1152) are model rules.
- `Screen` (`DevtoolsDock.tsx:306-357`) repeats about 18 props, eight as `{...(x === undefined ? {} : {x})}` spreads.
- `HeldChoice` is re-mapped into a local union three times: `SimulationSession.policyChoice`, `ExplorerSession.ts:207-215`,
  `RoleViewer.tsx:50-56`. Both sessions re-implement held/pin/resolve instead of embedding a `HeldChoiceStore`.
- ADR: extends ADR-QD-047 amendments 1.7 and 1.10 (ARCH-58 / ARCH-63, "the explorer's state is a session the dock owns"); does
  not reverse them. Prior phase: v1.1 Phase 15 (`.planning/phases/15-dock-session/`).

### Phase 27: one bare-route module in `@qadi/http` (review candidate 7)
- `guardRoute` (`http/src/GuardRoute.ts`) left the public surface in ADR-036 rev 1.7. It has one production caller,
  `buildGuardedRoute` (`PermissionRegistry.ts:106`), and only reshapes `{authorized, resource}` into `(authorized, resource)` around
  `enforceRequest`.
- Its ~30-line doc comment holds the `CurrentSubject` exclusion rule, which `GuardRoute.tst.ts` pins on this private function rather
  than on the public `addGuardedRoute`.
- The route-method union is written twice (`PermissionRegistry.ts:90`, `UnguardedRoute.ts:48`). `PermissionRegistry.ts` mixes the
  registry with the bare-route builder.
- ADRs: ADR-QD-036 (rev 1.7), ADR-QD-108 (a request is enforced once through one module).

### Phase 28: the gate registry and GateWriter dependency (review candidate 8; Speculative)
- `react/src/GateWriter.ts:94-195` holds `GateInstance`, `GateHandle`, `GateWriter` and `OwnedGateRegistry` (the private-slot class);
  `GateRegistry.ts:43-46,126` imports them back. That cycle costs about 10 lines of header explanation, and it is why `GateAtoms`
  (`GateWriter.ts:346-353`) restates `QadiAtoms.decision/decisions` (QadiAtoms :101, :110–112) by hand.
- Reconcile logic (unregister what changed, register what is new, update state) sits in three `useEffect`s with four refs
  (`GateWriter.ts:234-338`), testable only via `renderHook`.
- `useGateRegistration` (singular, :332) has no production caller; only `test/GateWriter.test.tsx` uses it.
- **Partly reopens ADR-QD-111** ("a gate writer is resolved once by its provider"): its import-rule rationale disappears if the
  dependency is inverted. Not yet checked against the `madge` cycle gate. The phase opens with a `checkpoint:decision`.

### Phase 29: small facts restated by hand (review footnotes)
- `PortName` and `PortSpanName` are declared in `core/src/PortMetrics.ts:60-80`; `PortDescription.ts:32`, `PortServing.ts` and
  `Ports.ts` import a port's identity from a metrics module. `PortSpanName` restates each description's `span` literal. Every list is
  compiler-checked (TS2741), so this is a locality fix, not a defect.
- `react/src/HydrationEngine.ts`: the `omit` lists in the `AllowEntry`/`DenyEntry` schemas (l.94–102) are repeated in
  `dehydrateDecision` (l.224–228).
- `Inspector.FailurePanel` and `Simulator.SimulatedFailure` share the sentence "This is not a denial" by copy.
