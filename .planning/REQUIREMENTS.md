# Requirements: Qadi v1.6 Arch Wave 11

**Defined:** 2026-11-18
**Core Value:** An authorization decision is never wrong and never silent.

**Source:** the 2026-11-16 architecture review. Per-phase evidence and reserved numbers are in
`.planning/phases/_WAVE11-CONTEXT.md`. Every phase runs on branch `arch-wave-11`, strictly serial.

## v1.6 Requirements

### One module owns "the value a leaf compares" (Phase 53, ARCH-100, core; live defect)

- [x] **OPND-01**: A regression test written on the phase base is RED: for `hasResourceAttribute("constructor", neq(literal("x")))` on `{ id: "r1" }`, `evaluate` denies but `evaluatePredicate(toPredicate(…))` allows. It is GREEN after the change.
- [x] **OPND-02**: One package-private module, beside `Compare.ts`, owns reading the value a leaf compares: a single-key cell read and a dot-path read, both own-property only.
- [x] **OPND-03**: Every interpreter reads leaf values only through that module: the walk, the port attribute read, matcher refs (`getByPath`), FieldMatch, `evaluatePredicate`, field projection and `Decision.ts`. No other `Object.hasOwn` key read on a decoded key remains in those files, and the "mirroring" comments are gone.
- [x] **OPND-04**: An agreement property over keys that include prototype names (`constructor`, `toString`, `__proto__`, `hasOwnProperty`, `valueOf`) shows `evaluate` ≡ `evaluatePredicate ∘ toPredicate`. The predicate-sql and predicate-prisma engine-agreement suites stay green.
- [x] **OPND-05**: ADR-QD-166 extends ADR-091 and ADR-024. INV-QD-091 is restated to cover the operand read.

### LeafNeeds turns every leaf's answer into a verdict (Phase 54, ARCH-101, core)

- [x] **VERD-01**: The acted leaf's polarity mapping (`HasActed` → `Acted`, `HasNotActed` → `NotActed`) and its verdict rule (`answer === wanted`, where `Unknown` denies both polarities, ADR-020) are each written once, in `LeafNeeds.ts` or a sibling, and both `Walk` and `toPredicate` read them.
- [x] **VERD-02**: Every leaf's answer-to-verdict step lives in that one place. The walk keeps only its reason sentence, and the translator keeps only constant folding.
- [x] **VERD-03**: A per-leaf verdict table test (answer × polarity → verdict) covers every leaf tag, and the existing evaluate/toPredicate agreement for `scope: "Any"` acted leaves stays green.
- [x] **VERD-04**: ADR-QD-167 extends ADR-163. `SWITCH_BUDGET` and `UNTRACED_BUDGET` are unchanged.

### A port card is a model row, not a view join (Phase 55, ARCH-102, devtools)

- [x] **CARD-01**: A characterisation of every port card's text and `data-testid`s is written on the phase base and stays byte-identical.
- [x] **CARD-02**: One pure model function takes the wiring read, the port activity, the call log and the unsampled flag, and returns one row per `PortName`: its state, activity line, recent calls with the count beyond them, and consequence voice.
- [x] **CARD-03**: All three readings are keyed by `PortName`. A misspelt or unknown port is a compile error, and no `string` key comparison remains in the join.
- [x] **CARD-04**: `ServicesPanel.tsx` renders rows only. Most of its ≈30 render cases move to model tests, and a short render test keeps the `data-testid`s.
- [x] **CARD-05**: ADR-QD-168 follows ADR-162's precedent, and ADR-047 ("the panel renders that model and computes nothing") is restated for the Services tab.

### The gate-registry watch becomes the dock model's third feed (Phase 56, ARCH-103, devtools)

- [x] **GFED-01**: One package-private scoped feed module owns the gate-registry watch: the subscription, the guarded reads, failure keying, re-subscription on `configure`, and release in a finalizer. It exposes one snapshot (instances or failure) and `subscribe`, in the shape of the timeline and diagnostics feeds.
- [x] **GFED-02**: `DockModel` composes three feeds and calls `joinQuestions`. No mutable gate-watch state is left in `DockModel.ts`.
- [x] **GFED-03**: The watch's cases are tested against the feed alone with `gateRegistryDouble.ts`: a throwing `instances` or `subscribe`, a swapped registry, a throwing release, a closed scope, and one failure arriving from two paths published once. `DockModel` keeps one test showing that the join moves first.
- [x] **GFED-04**: The questions panel's observable behaviour is unchanged, pinned by characterisation on the phase base.
- [x] **GFED-05**: Whether the feed also owns the `questions` thunk (one failure policy for both of the panel's host inputs; Breaking for `useDevtoolsFeed`) is a user decision recorded in ADR-QD-169, which applies ADR-137 and leaves ADR-162 intact.

### untrustedDecoder states the envelope's unknown-key policy (Phase 57, ARCH-104, core + audit + react)

- [x] **KEYP-01**: The user decides, before planning, whether a record envelope's deep unknown key should be `TooDeep` (today) or ignored. The decision is recorded in ADR-QD-170.
- [x] **KEYP-02**: `untrustedDecoder` takes the envelope's unknown top-level key policy as one stated option: refuse, or ignore without walking.
- [x] **KEYP-03**: Both `SinkCodec` envelopes (the record wire and the stored record) decode through `untrustedDecoder`. `ownValue`, `envelopeOf` and the hand-rolled stored reader are deleted. `UNTRUSTED_DECODE_BUDGET` and AGENTS.md §7a's table move together.
- [x] **KEYP-04**: The audit row, the archive and hydration state their policy through the same option.
- [x] **KEYP-05**: The UntrustedSeams matrix runs per policy (a shallow unknown key, a deep unknown key, an excess key inside the payload, non-object input). Every seam's answer is unchanged except where KEYP-01 changed it, with a RED test.

### A stored record is its envelope in memory too (Phase 58, ARCH-105, core + http + devtools; Breaking)

- [ ] **STOR-01**: In memory, the stored record is the envelope: the producer's `environment` next to a `SinkRecord`. `StoredDecisionRecord`, `StoredObligationRecord`, `stampRecord` and `stampRecordMatch` are deleted, along with the prototype-loss doc.
- [ ] **STOR-02**: The stored codec is the record codec plus one field. The stored byte goldens are unchanged.
- [ ] **STOR-03**: `DecisionLog`'s backlog stamping, `storedRecordOrder`, the http encoders and devtools' timeline read the envelope. Devtools' third spelling (`ObligationRecord & { environment }`) is gone.
- [ ] **STOR-04**: ADR-QD-171 makes ADR-097 D-11-e true in memory as well as on the wire. The break is recorded as **Breaking** in each affected package's changeset and in `upgrading.md`.

### Admission produces the one walk environment (Phase 59, ARCH-106, core; opens on a benchmark)

- [ ] **WENV-01**: `pnpm bench` measures a prototype in which recursion passes `(policy, env, depth)` against the phase base, using Phase 50's method (interleaved runs, median of per-run minima). The numbers go in ADR-QD-172. If any workload regresses beyond run-to-run noise, the phase ends with a recorded rejection, and WENV-02 to WENV-04 are marked "Not pursued (measured)".
- [ ] **WENV-02**: Admission produces the one walk environment: subject, resource, action, `supplied`, matcher context and `maxDepth`. Each interpreter states only what differs (for `toPredicate`, that the row is always supplied).
- [ ] **WENV-03**: The subject, resource and action are each carried once, and `depth` and `maxDepth` can no longer be swapped and still compile (a tstyche negative).
- [ ] **WENV-04**: `RolesAndDepth.test.ts`'s depth agreement test stays green. The three `Effect.fnUntraced` functions and `SWITCH_BUDGET` are unchanged.

### Devtools' headless interface is the feeds (Phase 60, ARCH-107, devtools; human checkpoint, Breaking)

- [ ] **HDLS-01**: The user decides at a checkpoint before planning whether to make the feeds the headless interface. "No" ends the phase with a recorded rejection in ADR-QD-173, and HDLS-02 to HDLS-04 are marked "Not pursued (decided)".
- [ ] **HDLS-02**: The timeline and diagnostics feeds (and the gate feed, if the user chooses) are exported from devtools' root. `makeTimelineStore`/`runSource` and `makeDiagnosticsStore`/`runDiagnostics` are retired from the barrel.
- [ ] **HDLS-03**: One option shape configures the diagnostics poll, and the README's headless example uses the feeds.
- [ ] **HDLS-04**: The feed tests run against the public entry. `surface.test.ts`, `spec/overview.md` (gate 13) and ADR-047 amendment 1.6 / ADR-099 are updated. **Breaking** in the changeset and in `upgrading.md`.

### DecisionCache is asked only the question (Phase 61, ARCH-108, core; human checkpoint)

- [ ] **CASK-01**: The user decides at a checkpoint before planning whether to pursue this. "No" ends the phase with a recorded rejection in ADR-QD-174, and CASK-02 to CASK-04 are marked "Not pursued (decided)".
- [ ] **CASK-02**: The cache's interface takes the question alone, and core supplies the matching walk, so no caller can pair a key with an unrelated computation.
- [ ] **CASK-03**: `concurrency` reaches the walk without joining the key (ADR-031).
- [ ] **CASK-04**: `DecisionCache.test.ts`'s coalescing and interruption tests are driven through a question alone. `SharedComputation`'s rules (ADR-132, ARCH-79) are unchanged.

### Every phase (cross-cutting)

- [ ] **WX-01**: `pnpm check:pr < /dev/null` is green at the end of each phase.
- [ ] **WX-02**: Each phase records its ADR (or names it "Unused" in its CCR row), its CCR row, and its BEH/INV/traceability changes, using only its reserved numbers. `node scripts/next-id.mjs` is never run.
- [ ] **WX-03**: `spec/overview.md` names every added export and drops every removed one (gate 13).
- [ ] **WX-04**: Nothing new is added from this list: `as`, `!`, `any`, `switch`, `Effect.fnUntraced`, `async`/`await`, ambient `console`/`process.env`/clock. A budget changes only together with its AGENTS.md table.
- [ ] **WX-05**: Coverage thresholds hold (core at least 95%, the others at least 90%). The Stryker score of touched files does not fall:
  - recorded per phase in `NN-mutation-base.json`;
  - measured with the same invocation at the phase base and at close;
  - a drop is closed with a test, never re-baselined.
- [ ] **WX-06**: Every behaviour change is preceded by a characterisation or regression test written on the phase base: RED for a defect, green for preserved behaviour.
- [ ] **WX-07**: Every public break is recorded as **Breaking** in its package's changeset and in `upgrading.md`. Nothing is released or published, and no version-packages PR is merged.

## Future Requirements

- `QadiProvider`'s registry lifetime as a headless module (review side note; bound to StrictMode, gain uncertain).
- Carried v1.5 tech debt: plan-local ids (BRKR-, EMIT-, PFCT-, GATE-04, bare D-NN) in test titles and comments from Phases 45–52; "written on the phase base" in two test titles (see `PROJECT.md` Known Issues).

## Out of Scope

| Item | Reason |
|------|--------|
| A shared child-walk driver for `Walk.ts`'s composite folds | Measured and rejected (ADR-073 and ADR-077 addenda) |
| A codec inside `DecisionStream` | ADR-097's codec-free amendment 1.4 |
| Converting the http error tables / `…Response` aliases | ADR-102: error tables stay tables |
| One shared "encode, then report a refusal" step across sink adapters | ADR-095 D-09-e keeps each adapter's message and hook |
| Merging `devtoolsPath` and `portPath` | Overlap too small; they treat the prefix differently |
| Merge, release or publish | Standing instruction: release only when the user explicitly asks for "the release" |

## Traceability

Which phases cover which requirements. One row per ID (`phase.complete` cannot parse grouped rows or ranges).
The seven WX rows apply to every phase 53 to 61, so each phase's Requirements line in `ROADMAP.md` lists all seven.

| Requirement | Phase | Status |
|-------------|-------|--------|
| OPND-01 | Phase 53 | Complete |
| OPND-02 | Phase 53 | Complete |
| OPND-03 | Phase 53 | Complete |
| OPND-04 | Phase 53 | Complete |
| OPND-05 | Phase 53 | Complete |
| VERD-01 | Phase 54 | Complete |
| VERD-02 | Phase 54 | Complete |
| VERD-03 | Phase 54 | Complete |
| VERD-04 | Phase 54 | Complete |
| CARD-01 | Phase 55 | Complete |
| CARD-02 | Phase 55 | Complete |
| CARD-03 | Phase 55 | Complete |
| CARD-04 | Phase 55 | Complete |
| CARD-05 | Phase 55 | Complete |
| GFED-01 | Phase 56 | Complete |
| GFED-02 | Phase 56 | Complete |
| GFED-03 | Phase 56 | Complete |
| GFED-04 | Phase 56 | Complete |
| GFED-05 | Phase 56 | Complete |
| KEYP-01 | Phase 57 | Complete |
| KEYP-02 | Phase 57 | Complete |
| KEYP-03 | Phase 57 | Complete |
| KEYP-04 | Phase 57 | Complete |
| KEYP-05 | Phase 57 | Complete |
| STOR-01 | Phase 58 | Pending |
| STOR-02 | Phase 58 | Pending |
| STOR-03 | Phase 58 | Pending |
| STOR-04 | Phase 58 | Pending |
| WENV-01 | Phase 59 | Pending |
| WENV-02 | Phase 59 | Pending |
| WENV-03 | Phase 59 | Pending |
| WENV-04 | Phase 59 | Pending |
| HDLS-01 | Phase 60 | Pending |
| HDLS-02 | Phase 60 | Pending |
| HDLS-03 | Phase 60 | Pending |
| HDLS-04 | Phase 60 | Pending |
| CASK-01 | Phase 61 | Pending |
| CASK-02 | Phase 61 | Pending |
| CASK-03 | Phase 61 | Pending |
| CASK-04 | Phase 61 | Pending |
| WX-01 | All v1.6 phases | Pending |
| WX-02 | All v1.6 phases | Pending |
| WX-03 | All v1.6 phases | Pending |
| WX-04 | All v1.6 phases | Pending |
| WX-05 | All v1.6 phases | Pending |
| WX-06 | All v1.6 phases | Pending |
| WX-07 | All v1.6 phases | Pending |

**Coverage:**
- v1.6 requirements: 47 total (40 phase-specific + 7 cross-cutting)
- Mapped to phases: 47 (40 phase-specific, each to exactly one of Phases 53 to 61; 7 cross-cutting, each applying to all nine)
- Unmapped: 0

---
*Requirements defined: 2026-11-18*
*Last updated: 2026-11-18 after roadmap creation (traceability filled)*
