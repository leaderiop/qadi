# Requirements: Qadi v1.5 Arch Wave 10

**Defined:** 2026-11-15
**Core Value:** An authorization decision is never wrong and never silent.

**Source:** the 2026-11-15 architecture review. Per-phase evidence and reserved numbers are in
`.planning/phases/_WAVE10-CONTEXT.md`. Every phase runs on branch `arch-wave-10`, strictly serial.

## v1.5 Requirements

### One handover module behind the enforcement entry points (Phase 43, ARCH-90, core, Breaking)

- [x] **HAND-01**: One package-private module owns "ask against this value → discharge on allow → release whole or projected". The ten enforcement entry points in `Qadi.ts` are adapters over it, by shape (effect, array, stream).
- [x] **HAND-02**: `guard`, `filter`, `filterStream`, `filterProjected` and `filterStreamProjected` refuse a `resource` in their options at the type level, as the loaded entry points already do. A tstyche test shows each one compiling on the phase base (RED) and refused after the change.
- [x] **HAND-03**: The allow → discharge / deny branch and the `project(decision, value)` step are each written once. A runtime test shows that, for every entry point, the released value is the decided value.
- [x] **HAND-04**: Observable behaviour is otherwise unchanged:
  - discharge precedes the guarded work (ADR-011);
  - `filter` partitions rather than fails (JA-04);
  - an item's fate is the same in the array and stream forms;
  - pinned by characterisation tests written on the phase base.
- [x] **HAND-05**: Every call site passing `resource` to `guard`/`filter*` is updated:
  - `packages/*`;
  - `examples/*`;
  - `features/step-definitions`;
  - the spec and website ` ```typescript ` fences (both doc-fence gates green).
- [x] **HAND-06**: ADR-QD-156 extends ADR-104, and INV-QD-108 is restated to cover every handover entry point.

### The hydration seed's fields stated once (Phase 44, ARCH-91, react)

- [x] **HYDF-01**: Each verdict's seed fields are stated once, derived from core's `DecisionWireAllow`/`DecisionWireDeny` minus the withheld fields. `SeededAllow`/`SeededDeny` stay `Data.TaggedClass`es (ADR-078), typed by that statement (the ADR-135 pattern).
- [x] **HYDF-02**: `dehydrateDecision` and `rebuild` are spreads with the one `subjectId` substitution, and the Allow/Deny branch is written once for dehydrate, rebuild and agreement.
- [x] **HYDF-03**: A property test checks that any `Decision` → entry → `SeededDecision` keeps every disclosed wire field. It is shown RED on the phase base with a scratch wire field, and the scratch field is then removed.
- [x] **HYDF-04**: `entryAgrees` still refuses a seed whose fields disagree with its trace (INV-QD-170), and the payload's wire form is byte-identical for existing entries.

### The audit circuit breaker as one transition function (Phase 45, ARCH-92, audit)

- [x] **BRKR-01**: One pure transition function, `(state, event, now) → (next state, transition announced)`, over a closed event union (Observe, Success, Failure, Claim, Release, each with its generation) holds every generation and probe rule. `generation + 1` is written once.
- [x] **BRKR-02**: The `Ref`/`Clock`/metric adapter runs exactly one `Ref.modify` per event (INV-QD-052), and its matchers are built once at module scope (AGENTS.md §5a).
- [x] **BRKR-03**: Breaker options are validated at construction, and a non-finite, zero, negative or non-integer threshold or cooldown fails with a typed error. A test with `failureThreshold: NaN` is RED on the phase base, where the breaker silently never opens.
- [x] **BRKR-04**: Table-driven tests of the transition function cover:
  - a stale generation;
  - a release stealing a newer claim;
  - a stale failure reopening a newer window;
  - every legal transition;
  - and need no fibers or `TestClock`.
- [x] **BRKR-05**: The existing concurrency regression tests (`CircuitBreaker.test.ts:339, 403, 426, 452`) stay green unchanged, as adapter tests.

### The sink emitter reports what it contains (Phase 46, ARCH-93, core)

- [x] **EMIT-01**: `sinkEmitter` contains a sink's failure or defect and reports it with exactly one warning, naming the sink when it has a `name` (an optional `name` added to `DecisionSinkShape`).
- [x] **EMIT-02**: A custom sink that fails and one that dies, run through `evaluate`, each produce exactly one warning and leave the decision unchanged. Both are RED on the phase base, where they produce zero warnings.
- [x] **EMIT-03**: Each shipped sink keeps only the reports that change behaviour or say something else:
  - forwarding's encode refusal;
  - `decisionSinkAll`'s sibling isolation;
  - the decision log's append/publish split.
  Each existing warning is classified, and only containment the emitter now covers is removed.
- [x] **EMIT-04**: The sink is still read once per evaluation (ADR-044/100, `sink-read-once`), and INV-QD-035 is restated to include the report.

### Port facts read from the description (Phase 47, ARCH-94, core + devtools)

- [ ] **PFCT-01**: Whether a port's service is its description's fail-closed default, through any number of derived wrappers, is a structural fact core exposes, not a parse of a display name. Devtools' `isDefaultName` is deleted.
- [x] **PFCT-02**: A wrapper whose name does not follow `"<inner> (<suffix>)"`, around a fail-closed default, is reported as defaulted. The test is RED on the phase base.
- [x] **PFCT-03**: Each port's fail-closed consequence sentence and its call-row reading are stated once per port, next to its description or in one devtools port-reading module keyed by `PortName`. `CONSEQUENCES` and the per-port arms of `describeOne` go.
- [ ] **PFCT-04**: `PortCalls.ts`'s `ROWS` is built by one generic, fully type-checked row builder over the registry's descriptions (no widened implementation type; reworded 2026-11-16 by the user's Phase 47 decision D-18), and `ServicesPanel.tsx` no longer knows any port's span fields.
- [ ] **PFCT-05**: Adding a port to the registry needs no edit in devtools beyond what the compiler asks for.

### Audit reports core's refusal and derives "lost" (Phase 48, ARCH-95, audit, Breaking)

- [ ] **AREF-01**: `AuditEntryNotEncodable` is deleted. Audit's `onRefused` takes core's `SinkRecordNotEncodable`, the same type forwarding and http use, and the logged reason is `describeEncodeRefusal(refusal)` at the one place a line is written.
- [ ] **AREF-02**: The lost-staging label is derived from the outcome's durability (`durabilityOf`), so the span attribute and the metric/log label cannot disagree. Only one exhaustive mapping remains.
- [ ] **AREF-03**: `writtenStaging`'s `_tag` ternary is replaced by an exhaustive match.
- [ ] **AREF-04**: ADR-QD-161 records the decision after checking ADR-054/056, and the `@qadi/audit` changeset marks `onRefused`'s type as **Breaking**.

### Gates as the dock model's eighth store, with one gate-state vocabulary (Phase 49, ARCH-96, core + react + devtools)

- [ ] **GATE-01**: The five gate-state words are stated once in `@qadi/core` (the ADR-152 pattern). React's `GateRenderState` and devtools' `GATE_DISPLAY` derive from that statement, and devtools takes no dependency on `@qadi/react` (ADR-053/080).
- [ ] **GATE-02**: A state this build does not know is still shown as `Unrecognised`, never as an answer.
- [ ] **GATE-03**: The gate registry (its structural `subscribe`/`instances`) is a `makeDockModel` store. The model produces the joined question × instance rows, and `QuestionsPanel` renders one snapshot rather than joining two sources.
- [ ] **GATE-04**: The join is tested headlessly through the dock model, as ARCH-74/82's stores are.
- [ ] **GATE-05**: With instrumentation off, nothing is registered or rendered (§13), and the react suite passes untouched.

### What a leaf needs from the request, stated once (Phase 50, ARCH-97, core; opens on a benchmark)

- [ ] **LEAF-01**: `pnpm bench` measures a prototype in which `evaluateNode` reads a module-scope leaf-needs table, against the phase base. The numbers go in ADR-QD-163. If any workload regresses beyond run-to-run noise, the phase ends with a recorded rejection, and LEAF-02 to LEAF-05 are marked "Not pursued (measured)".
- [ ] **LEAF-02**: One package-private module states, per leaf:
  - which request inputs it needs (action, resource, resource id);
  - which error each absence becomes;
  - in one stated check order.
  `Walk` and `Predicate` both read it.
- [ ] **LEAF-03**: The current per-leaf difference in check order is either preserved or changed deliberately, with a RED test and a behaviour row.
- [ ] **LEAF-04**: The port-free `HasRole`/`HasPermission` judgement is written once, and both interpreters use it.
- [ ] **LEAF-05**: An exhaustive table test over every leaf tag pins INV-QD-011, and `SWITCH_BUDGET`/`UNTRACED_BUDGET` are unchanged.

### Policy tag arity stated once (Phase 51, ARCH-98, core)

- [ ] **ARTY-01**: One closed record in `Policy.ts` gives each policy tag's arity (Leaf, Wrapper or Many). `Decision.ts`'s `traceShapeOf` reads it, and `leafTags` is deleted.
- [ ] **ARTY-02**: A type-level test ties `LeafPolicy` and `childrenOf` to the record, so moving a tag's arity in one place and not the other fails to compile.
- [ ] **ARTY-03**: `foldTrace` stays public and unchanged. `renderTrace`/`diffTraces` keep their own walks, and the ADR or CCR states why.

### Core owns the predicate compile shell (Phase 52, ARCH-99, core + predicate-sql + predicate-prisma)

- [ ] **COMP-01**: One core function owns compiling with a dialect's rules and renderer:
  - the defaults (`identifiers`, `maxInValues`);
  - `toRenderable`;
  - counting refused/compiled outcomes against a counter series the caller supplies.
- [ ] **COMP-02**: `compileSql` and `compilePrismaWhere` keep only their rules, their renderer and their own declared metric, with distinct ids, declared once (ADR-123). The `[metric-table]` rows are unchanged.
- [ ] **COMP-03**: Output is unchanged for both dialects, including refusals, which differential/characterisation tests written on the phase base show.
- [ ] **COMP-04**: `spec/overview.md` names the new core export, and the changesets cover all three packages.

### Every phase (cross-cutting)

- [x] **WX-01**: `pnpm check:pr < /dev/null` is green at the end of each phase.
- [x] **WX-02**: Each phase records its ADR (or names it "Unused" in its CCR row), its CCR row, and its BEH/INV/traceability changes, using only its reserved numbers. `node scripts/next-id.mjs` is never run.
- [x] **WX-03**: `spec/overview.md` names every added export and drops every removed one (gate 13).
- [x] **WX-04**: Nothing new is added from this list: `as`, `!`, `any`, `switch`, `Effect.fnUntraced`, `async`/`await`, ambient `console`/`process.env`/clock. A budget changes only together with its AGENTS.md table.
- [x] **WX-05**: Coverage thresholds hold (core at least 95%, the others at least 90%). The Stryker score of touched files does not fall:
  - recorded per phase in `NN-mutation-base.json`;
  - measured with the same invocation at the phase base and at close;
  - a drop is closed with a test, never re-baselined.
- [x] **WX-06**: Every behaviour change is preceded by a characterisation or regression test written on the phase base: RED for a defect, green for preserved behaviour.
- [x] **WX-07**: Every public break is recorded as **Breaking** in its package's changeset and in `upgrading.md`. Nothing is released or published, and no version-packages PR is merged.

## Future Requirements

- `Hydration.ts`'s `hydrateDecisions` versus `atoms.hydrate`: deciding which public route stays (ADR-078/039 chose two).
- `DecisionLog.readEntries` returning the backlog in cursor order (review #4 of the wire area). Low value, and the ADR-097 amendment keeps the encoder's sort.

## Out of Scope

| Item | Reason |
|------|--------|
| A shared child-walk driver for `Walk.ts`'s composite folds | Measured and rejected (ADR-073 and ADR-077 addenda) |
| Converting the http error tables | ADR-102: error tables stay tables |
| A codec inside `DecisionStream` | ADR-097's codec-free amendment |
| Merging the testing/devtools `clockLayer` | ADR-146 considered and rejected it |
| Deleting `foldTrace` | Public, stack-safe primitive for hosts (INV-QD-090) |
| Merge, release or publish | Standing instruction: release only when the user explicitly asks for "the release" |

## Traceability

Which phases cover which requirements. One row per ID (`phase.complete` cannot parse grouped rows or ranges).
The seven WX rows apply to every phase 43 to 52, so each phase's Requirements line in `ROADMAP.md` lists all seven.

| Requirement | Phase | Status |
|-------------|-------|--------|
| HAND-01 | Phase 43 | Complete |
| HAND-02 | Phase 43 | Complete |
| HAND-03 | Phase 43 | Complete |
| HAND-04 | Phase 43 | Complete |
| HAND-05 | Phase 43 | Complete |
| HAND-06 | Phase 43 | Complete |
| HYDF-01 | Phase 44 | Complete |
| HYDF-02 | Phase 44 | Complete |
| HYDF-03 | Phase 44 | Complete |
| HYDF-04 | Phase 44 | Complete |
| BRKR-01 | Phase 45 | Complete |
| BRKR-02 | Phase 45 | Complete |
| BRKR-03 | Phase 45 | Complete |
| BRKR-04 | Phase 45 | Complete |
| BRKR-05 | Phase 45 | Complete |
| EMIT-01 | Phase 46 | Complete |
| EMIT-02 | Phase 46 | Complete |
| EMIT-03 | Phase 46 | Complete |
| EMIT-04 | Phase 46 | Complete |
| PFCT-01 | Phase 47 | Pending |
| PFCT-02 | Phase 47 | Complete |
| PFCT-03 | Phase 47 | Complete |
| PFCT-04 | Phase 47 | Pending |
| PFCT-05 | Phase 47 | Pending |
| AREF-01 | Phase 48 | Pending |
| AREF-02 | Phase 48 | Pending |
| AREF-03 | Phase 48 | Pending |
| AREF-04 | Phase 48 | Pending |
| GATE-01 | Phase 49 | Pending |
| GATE-02 | Phase 49 | Pending |
| GATE-03 | Phase 49 | Pending |
| GATE-04 | Phase 49 | Pending |
| GATE-05 | Phase 49 | Pending |
| LEAF-01 | Phase 50 | Pending |
| LEAF-02 | Phase 50 | Pending |
| LEAF-03 | Phase 50 | Pending |
| LEAF-04 | Phase 50 | Pending |
| LEAF-05 | Phase 50 | Pending |
| ARTY-01 | Phase 51 | Pending |
| ARTY-02 | Phase 51 | Pending |
| ARTY-03 | Phase 51 | Pending |
| COMP-01 | Phase 52 | Pending |
| COMP-02 | Phase 52 | Pending |
| COMP-03 | Phase 52 | Pending |
| COMP-04 | Phase 52 | Pending |
| WX-01 | All v1.5 phases | Complete |
| WX-02 | All v1.5 phases | Complete |
| WX-03 | All v1.5 phases | Complete |
| WX-04 | All v1.5 phases | Complete |
| WX-05 | All v1.5 phases | Complete |
| WX-06 | All v1.5 phases | Complete |
| WX-07 | All v1.5 phases | Complete |

**Coverage:**
- v1.5 requirements: 52 total (45 phase-specific, 7 cross-cutting)
- Mapped to phases: 52
- Unmapped: 0 ✓

---
*Requirements defined: 2026-11-15*
*Last updated: 2026-11-15 after roadmap creation (Phases 43-52)*
