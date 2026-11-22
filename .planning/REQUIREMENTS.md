# Requirements: Qadi v1.8 Arch Wave 13

**Defined:** 2026-11-22
**Core Value:** An authorization decision is never wrong and never silent.

**Source:** the 2026-11-22 architecture review. Per-phase evidence and reserved numbers are in
`.planning/phases/_WAVE13-CONTEXT.md`. Every phase runs on branch `arch-wave-13`, strictly serial.

## v1.8 Requirements

### One total "thrown value → message" module (Phase 69, ARCH-116, core; live defect)

- [x] **THRW-01**: A regression test written on the phase base is RED for each unguarded site (`JsonHazard.encodeFailed`, the `PortKey` and `PortDerivation` key refusals, both `PortWireEncode` catches, and `CustomPredicate.renderReason`'s `message` read): given a thrown value whose `toString` and `message` getter both throw, the documented total function throws. It is GREEN after the change.
- [x] **THRW-02**: One total rule, exported by `@qadi/core` (ADR-QD-099): `thrownMessage` turns a caught value into a message and `causeMessage` an Effect `Cause`. It guards the `message` getter, `String()` and `Cause.pretty`, and owns the one placeholder wording.
- [x] **THRW-03**: All six core call sites (`SinkCodec`, `CustomPredicate`, `JsonHazard`, `PortKey`, `PortDerivation`, `PortWireEncode`), the three copies outside core (`@qadi/http`'s transport failure, `@qadi/react`'s reporter line, `@qadi/devtools`' capture) and every devtools site that renders a `Cause` use it, and no inline rendering of a caught value or a cause remains in `packages/*/src`.
- [x] **THRW-04**: A table test on the function covers an `Error`, a plain value, a throwing `toString`, a throwing `message` getter, and both throwing at once. The existing `SinkCodec` and `CustomPredicate` pins move to the one placeholder.
- [x] **THRW-05**: ADR-QD-182 (or an amendment of ADR-QD-154) records the rule. An invariant states that each "never throws" function stays total when the caught value is hostile.

### Hydration's drop events come from its buckets (Phase 70, ARCH-117, react; live defect)

- [x] **DRPE-01**: A check written on the phase base is RED: a drop reason can be given a bucket without being reported as an event, and it compiles. It is GREEN after the change (for example, a type pin that the event derivation is total over `EntryDropReason`).
- [x] **DRPE-02**: On the hydrate side, the buckets are one record keyed by `EntryDropReason`, and `EntriesDropped` events are derived from it in one place. The direct `malformed.push` is gone.
- [x] **DRPE-03**: On the dehydrate side, `LeftOut` events are derived the same way from a record keyed by its reason.
- [x] **DRPE-04**: The hydration events, their order and their counts are byte-identical to the phase base's characterisation for every existing input.
- [x] **DRPE-05**: ADR-QD-183 cites ADR-QD-152 and says why the "a later phase shares the file" reason no longer applies. INV-QD-045's enforcement is restated. The payload-path question from `_WAVE13-CONTEXT.md` is decided once and recorded.

### Developer-signal reporters resolved through one table (Phase 71, ARCH-118, react; live defect)

- [x] **SIGR-01**: A regression test written on the phase base is RED: `makeGateRegistry({ onIdCollision })` with a reporter that throws reports a message naming `"onGateIdCollision"`. It is GREEN after the change, naming the option the caller passed.
- [x] **SIGR-02**: One table states, for each developer signal, where it runs (development or production), how often (per call, once per registry, once per atom set, once per process), and the option name it is reported under. Every reporter is resolved through it, and the hand-kept `ReporterName` list is derived from it or gone.
- [x] **SIGR-03**: `providerSignalReporter`'s production-once rule is stated in the same table. Its module-scope state is either brought under the atom set or recorded as the documented exception, consistent with AGENTS.md §13.
- [x] **SIGR-04**: Every existing reporter's observable behaviour (what fires, where, how often, with what text) is unchanged apart from SIGR-01, pinned by characterisation on the phase base. `DeveloperSignals.ts` stays the only file exempt from `no-ambient-console`.
- [x] **SIGR-05**: ADR-QD-184 extends ADR-QD-041 and ADR-QD-052.

### A derived store behind the dock model's stores (Phase 72, ARCH-119, devtools)

- [x] **DERV-01**: A characterisation of the dock model's `shownReading`, `questions` and `services` snapshots (when each recomputes, when it does not, and nothing after close) is written on the phase base and stays green.
- [x] **DERV-02**: `ExternalStore.ts` gains a store derived from parent stores. It owns key equality over every key field (a field added to the key and not compared is impossible by construction), stopping after close, and notifying once. ADR-QD-177's "every listener runs, rethrow after" holds for it.
- [x] **DERV-03**: `DockModel.ts` builds its three computed stores with it. No `let last…`, field-by-field key compare or `closed` flag is left in that file.
- [x] **DERV-04**: The derived store's rules are tested against `ExternalStore` alone. `DockModel.test.ts` keeps one test per store showing its key and its order relative to host listeners.
- [x] **DERV-05**: `DockModel.ts` and `ExternalStore.ts` keep their Stryker scores (`DockModel.ts` at 1, as ADR-QD-168 records). ADR-QD-185 extends ADR-QD-168, and the store count is stated in one place.

### One pure reconcile for gate registration (Phase 73, ARCH-120, react)

- [ ] **RECN-01**: A characterisation of `useGate`/`useGates` registration (register, state update, unregister, remount, StrictMode) is written on the phase base and stays green.
- [ ] **RECN-02**: `reconcile` takes identities and states keyed by gate id and does register, update and unregister in one pure step. No caller passes arrays that must line up by index.
- [ ] **RECN-03**: `useGateRegistrations` has one effect plus the refs React needs. The `states.join("|")` diff and the paired `Record.values` calls are gone.
- [ ] **RECN-04**: The state-update half is tested without rendering, beside `GateWriter.reconcile.test.ts`. `GateRegistry.test.tsx` loses the cases that move.
- [ ] **RECN-05**: ADR-QD-186 extends ADR-QD-140 and ADR-QD-111. AGENTS.md §13 is unaffected (registry state, not decision state).

### The simulation session's policy choice split from its runs (Phase 74, ARCH-121, devtools)

- [ ] **CHSE-01**: A characterisation of seeding, replaying a row, choosing a policy, the policy menu and its order, and staleness is written on the phase base and stays green.
- [ ] **CHSE-02**: One pure module beside `HeldChoice.ts` owns the seeded choice: the pin-only-when-unseeded rule, the orphan rule, the menu and its reverse lookup (menu order written once), and the same-policy no-op.
- [ ] **CHSE-03**: `SimulationSession.ts` keeps only runs and uses that module. "Clear the run" is one operation, called from `reseed`, `choosePolicy` and `setPorts`.
- [ ] **CHSE-04**: The choice rules are tested as plain values with no scope, and the session tests that only exercised those rules move. The `edit` comment at `:534` is made true: every draft write goes through one path, or the comment is corrected.
- [ ] **CHSE-05**: ADR-QD-187 records the split. ADR-QD-137 and ADR-QD-150 are untouched, and ADR-QD-047 v1.11 (the menu under the session) still holds.

### A declared span shape for the evaluate family (Phase 75, ARCH-122, core; human checkpoint)

- [ ] **ESPN-01**: The owner decides, at one checkpoint, the outcome key and whether the old keys stay for a release. The decision is recorded in ADR-QD-188.
- [ ] **ESPN-02**: A regression test written on the phase base is RED: a failed `qadi.evaluate` span carries no `qadi.subject_id` or `qadi.evaluation_id`. It is GREEN after the change.
- [ ] **ESPN-03**: One declared question/answer struct for the evaluate span family, built with `spanStruct`. The question is annotated before the lookup, and the outcome is under one key on every path.
- [ ] **ESPN-04**: `Lifecycle.ts`, `Predicate.ts` (`toPredicate`), `SubjectSet.ts` and `GuardHealthCheck.ts` write span keys only through that declaration. The tests read the keys from it, not as hand-typed `"qadi.*"` strings.
- [ ] **ESPN-05**: The behavior doc, the invariant, traceability and a `@qadi/core` changeset describe the span change that tracers will see. ADR-QD-188 extends ADR-QD-051 and ADR-QD-109.

### Remedies uses core's signature match (Phase 76, ARCH-123, devtools + core; speculative)

- [ ] **SIGM-01**: An agreement test written on the phase base compares Remedies' "already met" verdict with the fixture signature port's own answer, over subjects, resources, meanings and signer roles (including a node with no signer role). It stays green whatever the phase decides.
- [ ] **SIGM-02**: Either Remedies asks core (through the fixture signature port or the port description) whether a fixture signature satisfies a node, and the inline match at `Remedies.ts:531-545` is gone, or the phase ends in a recorded rejection that says why no shape fits without widening core's public surface.
- [ ] **SIGM-03**: `SignatureMatch.ts` stays package-private (ADR-QD-099). If any export is added, `spec/overview.md` names it (gate 13) and the packed-install gate probes it.
- [ ] **SIGM-04**: The custom-predicate refusal is one sentence, owned in one place (`Remedies.ts:426` and `SimulationFields.ts:576` today).
- [ ] **SIGM-05**: ADR-QD-189 records the outcome, change or rejection, with CCR-QD-468.

### Cross-cutting (every v1.8 phase)

- [ ] **WX-01**: `pnpm check:pr < /dev/null` is green at the end of each phase.
- [ ] **WX-02**: Each phase records its ADR (or names it "Unused" in its CCR row), its CCR row, and its BEH/INV/traceability changes, using only its reserved numbers. `node scripts/next-id.mjs` is never run.
- [ ] **WX-03**: `spec/overview.md` names every added export and drops every removed one (gate 13). This milestone expects two in Phase 69 (`thrownMessage`, `causeMessage`) and possibly one in Phase 76.
- [ ] **WX-04**: Nothing new is added from this list: `as`, `!`, `any`, `switch`, `Effect.fnUntraced`, `async`/`await`, ambient `console`/`process.env`/clock, `Record<string, unknown>`, `// Stryker disable`. A budget changes only together with its AGENTS.md table.
- [ ] **WX-05**: Coverage thresholds hold (core at least 95%, the others at least 90%). The Stryker score of touched files does not fall: recorded per phase in `NN-mutation-base.json`, measured with the same invocation at the phase base and at close. A drop is closed with a test, never re-baselined.
- [ ] **WX-06**: Every behaviour change is preceded by a characterisation or regression test written on the phase base: RED for a defect, green for preserved behaviour. Every new check is shown failing once.
- [ ] **WX-07**: No D-numbers, plan-local ids or phase numbers enter shipped source, test titles or BDD scenarios. Nothing is released or published, and no version-packages PR is merged.

## Future Requirements

- A single "deliver, contained" sink operation for `SinkEmit` and `DecisionSinkForwarding`: only two call sites today. Revisit when a third appears.
- Folding the audit breaker's admission sequence into its transition function: ADR-QD-158 keeps it in its shape. Revisit only if the breaker is reopened.
- Align `@qadi/react`'s gate registry, which swallows listener errors, with ADR-QD-177's rethrow contract (carried from v1.7).
- Guard the publish-between-`begin()`-and-`fork()` window in the devtools feeds (carried from v1.7, D7).

## Out of Scope

| Item | Reason |
|------|--------|
| Re-opening ADRs the review left alone (ADR-QD-106's wire duplication, ADR-QD-117's error tables, ADR-QD-156's handover shapes, ADR-QD-174's cache) | The review found them already well-shaped |
| Exporting `SignatureMatch.ts` | ADR-QD-099: package-private on purpose |
| Formatting with `oxfmt` | AGENTS.md §17 |
| Upgrading any dependency | No candidate needs one |
| Merge, release or publish | Standing instruction: release only when the user explicitly asks for "the release" |

## Traceability

Which phases cover which requirements. One row per ID (`phase.complete` cannot parse grouped rows or ranges).

| Requirement | Phase | Status |
|-------------|-------|--------|
| THRW-01 | Phase 69 | Complete |
| THRW-02 | Phase 69 | Complete |
| THRW-03 | Phase 69 | Complete |
| THRW-04 | Phase 69 | Complete |
| THRW-05 | Phase 69 | Complete |
| DRPE-01 | Phase 70 | Complete |
| DRPE-02 | Phase 70 | Complete |
| DRPE-03 | Phase 70 | Complete |
| DRPE-04 | Phase 70 | Complete |
| DRPE-05 | Phase 70 | Complete |
| SIGR-01 | Phase 71 | Complete |
| SIGR-02 | Phase 71 | Complete |
| SIGR-03 | Phase 71 | Complete |
| SIGR-04 | Phase 71 | Complete |
| SIGR-05 | Phase 71 | Complete |
| DERV-01 | Phase 72 | Complete |
| DERV-02 | Phase 72 | Complete |
| DERV-03 | Phase 72 | Complete |
| DERV-04 | Phase 72 | Complete |
| DERV-05 | Phase 72 | Complete |
| RECN-01 | Phase 73 | Pending |
| RECN-02 | Phase 73 | Pending |
| RECN-03 | Phase 73 | Pending |
| RECN-04 | Phase 73 | Pending |
| RECN-05 | Phase 73 | Pending |
| CHSE-01 | Phase 74 | Pending |
| CHSE-02 | Phase 74 | Pending |
| CHSE-03 | Phase 74 | Pending |
| CHSE-04 | Phase 74 | Pending |
| CHSE-05 | Phase 74 | Pending |
| ESPN-01 | Phase 75 | Pending |
| ESPN-02 | Phase 75 | Pending |
| ESPN-03 | Phase 75 | Pending |
| ESPN-04 | Phase 75 | Pending |
| ESPN-05 | Phase 75 | Pending |
| SIGM-01 | Phase 76 | Pending |
| SIGM-02 | Phase 76 | Pending |
| SIGM-03 | Phase 76 | Pending |
| SIGM-04 | Phase 76 | Pending |
| SIGM-05 | Phase 76 | Pending |
| WX-01 | All v1.8 phases | Pending |
| WX-02 | All v1.8 phases | Pending |
| WX-03 | All v1.8 phases | Pending |
| WX-04 | All v1.8 phases | Pending |
| WX-05 | All v1.8 phases | Pending |
| WX-06 | All v1.8 phases | Pending |
| WX-07 | All v1.8 phases | Pending |

**Coverage:**
- v1.8 requirements: 47 total (40 phase-specific + 7 cross-cutting)
- Mapped to phases: 47 (40 phase-specific, each to exactly one of Phases 69 to 76; 7 cross-cutting, each applying to all eight)
- Unmapped: 0

---
*Requirements defined: 2026-11-22*
*Last updated: 2026-11-22 after definition*
