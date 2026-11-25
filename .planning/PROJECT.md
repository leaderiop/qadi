# Qadi — Architecture Waves (current: v1.11 Arch Wave 16)

## What This Is

Qadi is an Effect v4-native authorization library: a pnpm monorepo of `@qadi/core`,
`@qadi/http`, `@qadi/react`, `@qadi/audit`, `@qadi/promise`, `@qadi/testing`,
`@qadi/devtools`, `@qadi/predicate-sql` and `@qadi/predicate-prisma`. Milestone v1.0
(shipped 2026-11-09) was the fifth architecture-deepening wave. It resolved the nine findings
from the 2026-11-08 architecture review: one live logging defect and eight places where
knowledge about one concept was spread across several modules (poor locality) or where a
module was a shallow pass-through.

The review is at https://claude.ai/artifact/LH5dLGadz28NyzmZez9jcX, with a local copy at
`/tmp/claude-1002/-home-yopu-Project-Perso-qadi/588341bb-9f42-4e6e-b1a3-ed991ed47acf/scratchpad/qadi-architecture-review.html`.

## Current Milestone: v1.11 Arch Wave 16

**Goal:** Resolve all seven candidates of the 2026-11-25 architecture review, in the order the review ranked them, with
the house-rule change (named barrels) last so every earlier phase lands on the file layout it was reviewed against.

**Target features (Phases 85–91, ARCH-132…138, strictly serial):**
- 85: The dock's hydration block is a model row. A pure hydration view (Pending / Unwired / Counts, with the rate,
  drops and scope text worked out) sits beside `portCards`, and the dock model serves it; the three distinct
  "unsampled" predicates (`DockModel.ts:391`, `:405`, `QuestionsPanel.tsx:112`) are each stated once, not flattened; `DockFrame` stops subscribing to
  the whole reading to pass one field (devtools; amends ADR-QD-185 / BEH-QD-700 if a fifth derived store)
- 86: `QadiProvider`'s registry lifetime has one React-free owner: create, seed (subject, `initialValues`), write the
  subject, recycle and hold the lease, tested with an injected defer and no rendering. The component keeps one ref and
  forwards hold, release and subject changes (react; keeps ADR-QD-195's hold/defer semantics)
- 87: One "scoped run that states its stop" sits above `SupersedingRun`: held inputs and the `sameFields` gate,
  publish-then-fork through a callback, failure → `Stopped(causeMessage)`, `restart`, the closed guard. `TimelineFeed`,
  `DiagnosticsFeed` and `SimulationSession` supply only their engine and states; `GatesFeed` shares the prologue.
  Opens with a RED test for `SimulationSession`'s `String(exit.cause)` (`SimulationSession.ts:418`) against ADR-QD-182
  (devtools; new ADR answering ADR-QD-150 point 2)
- 88: `StoppedBox` keys itself and owns the announce-once ledger; callers stop computing `stoppedKey` from a ref
  during render (devtools react; amends ADR-QD-197)
- 89: One admission step for a host's audit batch (`now`, rows, key material / max age), shared by
  `archiveAuditTrail`, `planRetention`, `verifiedArchiveFacts` and `planPurge`; `NowNotFinite` stated once (audit;
  keeps ADR-QD-190's `RowsRefusalCases`)
- 90: The remaining per-port facts move onto the port description: span name, serving shape and fixture data type;
  `PortName` derived; `readScoped` routes off the `LEAF_NEEDS` row so its `resourceId` column does real work (core;
  amends ADR-QD-163 D-06, ADR-QD-094)
- 91: `@qadi/core`, `@qadi/react` and `@qadi/audit` take named barrels, as `@qadi/devtools` does (ADR-QD-047), and the
  visibility-only files fold into the module that owns their concept: the span-attribute files, `Hydration.ts` into
  `HydrationEngine.ts`, `GateRegistry.ts` into `GateWriter.ts`, `SequenceIntegrity.ts` into `ArchiveFacts.ts`. An
  ADR-QD-037 cycle-breaker folds only where the madge graph proves no cycle returns (house rule: AGENTS.md §9; amends
  ADR-QD-037, ADR-QD-099)

**Source review:** `/private/tmp/claude-502/-Users-mohammadalmechkor-Projects-Perso-qadi/b04729bd-9815-4720-957d-3637602848ac/scratchpad/architecture-review-20261125.html`
(session-scoped; `.planning/phases/_WAVE16-CONTEXT.md` holds everything a planner needs). Branch `arch-wave-16`, off
`main` at `ac7578f3` (v1.9 and v1.10 merged as #165). No merge, no release. Scope (all seven), the barrel treatment
(fold, prove acyclic) and research (run) were chosen by the owner on 2026-11-25.

## Previous Milestone: v1.10 Arch Wave 15 (completed 2026-11-25; not released)

**Goal:** Resolve all four candidates of the 2026-11-24 architecture review. The two live defects go first, each opening
with a regression test seen RED on its phase base, then the two devtools deepenings.

**Target features (Phases 81–84, ARCH-128…131, strictly serial):**
- 81: The dock model's `configure` applies every input whatever a listener throws, and rethrows what was collected once
  at the end. Today only the timeline step is guarded: a throwing explorer, simulation, dock, roles, questions, services
  or diagnostics listener skips every later step, a second throw replaces the first, and an identical `configure` does
  not heal it (reproduced 2026-11-24). The double `spread` on a capacity-and-catalogue change goes with it (devtools;
  live defect; extends ADR-QD-191 decision 11 and ADR-QD-177)
- 82: `QadiProvider`'s registry has one owner for its lifetime. A provider hidden inside `<Activity>` longer than a
  macrotask and shown again with stable children throws `registry is disposed` from its subject effect
  (`QadiProvider.tsx:258`, reproduced 2026-11-24) (react; live defect)
- 83: The diagnostics feed holds its reading as a value folded by a pure per-field rule; the package-private
  `DiagnosticsStore` that nothing subscribes to goes, `runDiagnostics` takes an `accept` sink as `runSource` does,
  and the never-written `Diagnostics.questions` path is resolved (devtools; possibly Breaking; amends ADR-QD-173)
- 84: `useConfigured` takes a value that has `configure`, deleting its three identical adapters, with the review's
  small finds: `LensSession`'s `move` restating `ExternalStore.set`, `useLens` taking one fact two ways, the
  `DockFrame` stop-ledger written twice, and `useTimeline`'s per-render inputs record (devtools)

**Source review:** `/private/tmp/claude-502/-Users-mohammadalmechkor-Projects-Perso-qadi/8b5d3789-bd5e-4ce2-bf7e-0b31a0ae4995/scratchpad/architecture-review-20261124.html`
(session-scoped; `.planning/phases/_WAVE15-CONTEXT.md` holds everything a planner needs). Branch `arch-wave-15`, off
`arch-wave-14` at `902d2128` (v1.9 not merged; stacked as v1.6 and v1.7 were). No merge, no release. Scope, order,
branch and research were decided autonomously on 2026-11-24 under the owner's standing instruction of 2026-11-22.

v1.10 Arch Wave 15 completed 2026-11-25 on branch `arch-wave-15` (226 commits; 91 files, +5,870 / −723 outside
`.planning`): ARCH-128 to ARCH-131, ADR-QD-194 to ADR-QD-197, amendments to ADR-QD-014, 047, 148, 149, 169, 173, 177,
185, 191, 192 and 193, and CCR-QD-473..476. All 4 phases `passed`, Nyquist-compliant and secured (0 open threats; 2 low accepted in Phase
83). Each phase ran a three-iteration code review and re-took its mutation measurement after it. Every choice was decided
autonomously under the owner's standing instruction (take the most complete, clean solution), including Phase 83's removal
of `Diagnostics.questions` as a Breaking minor and Phase 84's recorded rejection of a memo for `useTimeline`'s inputs. The
audit is `passed`: 27/27 requirements, 4/4 integration seams, 4/4 flows; it re-verified Phases 81 and 83, which later
phases had made stale. `check:pr` exited 0 at the end of every phase and last at `ce02fbc7` (6638 tests, BDD 568).
Four changesets: one Breaking minor (`@qadi/devtools`: `Diagnostics.questions` removed, 0.13 upgrade entry) and three
patches (`@qadi/devtools` ×2: `configure` collects, the lens reads each fact once; `@qadi/react`: the registry lease).
api-surface 942 exports throughout. **Not merged and not released.** Archive: `.planning/milestones/v1.10-ROADMAP.md`,
`v1.10-REQUIREMENTS.md`, `v1.10-MILESTONE-AUDIT.md`.

## Previous Milestone: v1.9 Arch Wave 14 (completed 2026-11-24; not released)

**Goal:** Resolve all four candidates of the 2026-11-23 architecture review. The audit row goes first, because it may
hide a live defect (the package can write an archive its own reader refuses), then the three devtools deepenings.

**Target features (Phases 77–80, ARCH-124…127, strictly serial):**
- 77: An audit row is a value only its codec makes. `AuditEntry` is branded, so archive, retention and the archive
  facts trust a row without re-checking it. The row decodes envelope-first, as core's stored record does. Opens with a
  RED test for the archive that cannot be read back (audit; possible live defect; Breaking; amends ADR-QD-110)
- 78: `TimelineStore` owns its capacity through a resize command. `TimelineFeed`'s six-member forwarder, mirror store
  and abandoned subscription are deleted (devtools; keeps ADR-QD-137)
- 79: Each feed and the dock model take their inputs only through `configure`. One per-field identity rule decides a
  restart, the one `makeDerivedStore` uses. One package-private hook does "scope, then configure", and the dock's input
  type is stated once. Opens with a characterisation test of diagnostics' first-render sequence (devtools; Breaking;
  amends ADR-QD-137/173)
- 80: The highlight lens becomes a headless session owned by the dock model, and `useLens` shrinks to the DOM adapter.
  The unread public `QadiContextValue.instrument` is removed, or the reason it stays is recorded (devtools, react)

**Source review:** `/private/tmp/claude-502/-Users-mohammadalmechkor-Projects-Perso-qadi/8b5d3789-bd5e-4ce2-bf7e-0b31a0ae4995/scratchpad/architecture-review-20261123.html`
(session-scoped; `.planning/phases/_WAVE14-CONTEXT.md` holds everything a planner needs). Branch `arch-wave-14`, based on
`main` at `5784bbd6` (v1.8 merged as #164). No merge, no release.

v1.9 Arch Wave 14 completed 2026-11-24 on branch `arch-wave-14` (285 commits; 98 files, +9,623 / −1,278 outside
`.planning`): ARCH-124 to ARCH-127, ADR-QD-190 to ADR-QD-193, amendments to ADR-QD-047, 056, 110, 111, 137, 173 and 185,
and CCR-QD-469..472. All 4 phases `passed`, Nyquist-compliant and secured (0 open threats). Each phase ran a
three-iteration code review and re-closed its mutation measurement after it. Every choice was decided autonomously under
the owner's standing instruction (take the most complete, clean solution), including Phase 80's removal of
`QadiContextValue.instrument` (removed, the prop kept). The audit is `passed`: 28/28 requirements, 9/9 integration
points, 4/4 flows; it re-verified Phases 78 and 79, which later phases had made stale. `check:pr` exited 0 at the end of
every phase and last at `2eff29ae` (6550 tests). Five changesets: four Breaking minors (`@qadi/audit`: the codec-made
row; `@qadi/devtools` ×2: `resize` replacing the feed's forwarder, and bare constructors with inputs only through
`configure`; `@qadi/react`: `QadiContextValue` without `instrument`) and one `@qadi/devtools` patch (the headless lens),
with 0.13 upgrade-guide sections. **Not merged and not released.** Archive: `.planning/milestones/v1.9-ROADMAP.md`,
`v1.9-REQUIREMENTS.md`, `v1.9-MILESTONE-AUDIT.md`.

## Previous Milestone: v1.8 Arch Wave 13 (completed 2026-11-23; not released)

**Goal:** Resolve all eight candidates of the 2026-11-22 architecture review. The three live defects go first (the
"never throws" functions that throw, the hydration drops that are never reported, the reporter that blames the wrong
option name), then the three deepenings, then the change that tracers will see, then the speculative item.

**Target features (Phases 69–76, ARCH-116…123, strictly serial):**
- 69: One total "thrown value → message" module in core. The six inline copies use it, which closes the four
  throw-throughs in `JsonHazard`, `PortKey`, `PortDerivation` and `PortWireEncode` (core; live defect)
- 70: Hydration's drop events come from its reason-keyed buckets, on both the hydrate and dehydrate sides, which
  closes the INV-QD-045 gap where an unreported bucket compiles (react; live defect; cites ADR-QD-152)
- 71: Every developer-signal reporter is resolved through one table (where it runs, how often, what it is named), and
  the `onIdCollision` → `"onGateIdCollision"` naming drift is fixed (react; live defect)
- 72: `ExternalStore` gains a store derived from parent stores, used by the dock model's three hand-built stores;
  `DockModel.ts` keeps its mutation score of 1 (devtools; ADR-QD-168)
- 73: One pure `reconcile` keyed by id that registers, updates and unregisters; `useGate` loses its state-diff
  effect and the parallel-array contract (react; extends ADR-QD-140)
- 74: The simulation session's policy-choice and seed rules move into a pure module next to `HeldChoice`, and the
  session keeps only runs (devtools; ADR-QD-137/150 untouched)
- 75: A declared question/answer span shape for the `qadi.evaluate` family, built with `spanStruct`: a failed span
  carries the question and the outcome uses one key. Tracers will see this, so it has a human checkpoint (core)
- 76: Remedies uses core's signature-matching rule instead of its own copy, without exporting `SignatureMatch`
  (ADR-QD-099); may end in a recorded rejection (devtools + core)

**Source review and evidence:** `/var/folders/vn/44p0pxgs4z98v7cl11l4_r4c0000gp/T/architecture-review-20261122-075438.html`
(session-scoped; `.planning/phases/_WAVE13-CONTEXT.md` holds everything a planner needs). Branch `arch-wave-13`, based
on `main` at `2716def4` (v1.6 + v1.7 merged as #163). No merge, no release.

v1.8 Arch Wave 13 completed 2026-11-23 on branch `arch-wave-13` (630 commits; 198 files, +17,915 / −2,874 outside
`.planning`): ARCH-116 to ARCH-123, ADR-QD-182 to ADR-QD-189, amendments to ADR-QD-033, 041, 047, 051, 052, 058, 094,
103, 109, 111, 140, 152, 162, 163, 168 and 169, and CCR-QD-461..468. All 8 phases `passed`, Nyquist-compliant and
secured (0 open threats). Each phase ran a three-iteration code review and re-closed its mutation measurement after it.
Every choice was decided autonomously under the owner's standing instruction (take the most complete, clean solution),
including Phase 75's checkpoint (one outcome key, `qadi.outcome`) and Phase 76's owner question (a change, not a recorded
rejection). The audit is `passed`: 47/47 requirements, 14/14 integration points, 4/4 flows. It added a canary pinning
Effect's `String(cause)` totality and moved the fixture-judgement helpers out of the file the span contract imports. It
then re-verified the six phases that later work had made stale. `check:pr` exited 0 at the end of every phase and last at
`5640572d`. Ten changesets: three Breaking minors (`@qadi/core` ×2: `qadi.decision` → `qadi.outcome`, the removed
`ActedEvent`/`ActedAnywhere`/`ActedAnywhereInput` and the optional error members; `@qadi/http` ×1: the optional
members on the wire), one non-breaking `@qadi/core` minor (`thrownMessage`, `causeMessage`) and six patches. A 0.13
upgrade-guide section. **Not merged and not released.** Archive: `.planning/milestones/v1.8-ROADMAP.md`,
`v1.8-REQUIREMENTS.md`, `v1.8-MILESTONE-AUDIT.md`.

## Previous Milestone: v1.7 Arch Wave 12 (completed 2026-11-22; not released)

**Goal:** Resolve all 13 tech-debt items the v1.6 audit carried forward, each by a change or a recorded decision, so none
is carried again; the vacuous type-pin class found while investigating them goes first.

**Target features (Phases 62–68, ARCH-109…115, strictly serial):**
- 62: Type pins that can fail. `not.toBeCallableWith` passes for any Effect-returning subject; 86 pins in 27 files are
  classified, the vacuous ones rewritten and each shown failing once, and a `NOT_CALLABLE_PIN_BUDGET` gate added
- 63: Gate 14 (`check-package-install.mjs`) compiles `makeGatesFeed`, `makeDiagnosticsFeed` and `DecisionCacheShape`
  through the packed `exports` map, and fails if a `make*Feed` export is left unprobed
- 64: One throwing devtools `ExternalStore` listener cannot silence the rest; errors are rethrown after every listener ran (D1)
- 65: Only `admit` builds an `Admitted`, and the `"asked"` row's flag is derived from its matcher context (bench-gated)
- 66: `untrustedDecoder`'s projection reads only declared keys (D4); hydration's `refuse` policy recorded (D2)
- 67: The two equivalent surviving mutants restructured away (D5), and the I5 race test's magic bound removed
- 68: Hygiene and recorded close-outs: over-width lines, stale titles, ADR-QD-174 line 73, port cards stay private (D3),
  the Phase 61 scan's `Simulator.test.tsx` gap evidenced

**Source and evidence:** `.planning/phases/_WAVE12-CONTEXT.md` (owner decisions D1–D5, ids reserved, per-phase evidence)
and `.planning/milestones/v1.6-MILESTONE-AUDIT.md`. Branch `arch-wave-12`, stacked on `arch-wave-11` at `8b22bd66` (v1.6,
not merged). No merge, no release.

v1.7 Arch Wave 12 completed 2026-11-22 on branch `arch-wave-12` (383 commits, 78 files, +4,036 / −473 outside
`.planning`): ARCH-109 to ARCH-115 plus the inserted Phase 68.1 (DEBT-01..06), ADR-QD-175 and ADR-QD-177 (ADR-QD-176
and 178–181 reserved, unused), amendments to ADR-QD-033, 170, 172 and 173, CCR-QD-453..460. All 8 phases `passed`, Nyquist-compliant and
secured (0 open threats). The first audit was `tech_debt`; the owner inserted Phase 68.1 to fix the fixable items, and
the re-audit's info findings were then closed inline. The re-audit is `passed`: 46/46 requirements, 11/11 integration
points, 4/4 flows. `check:pr` exited 0 at the end of every phase and last at `334b014b`. Three patch changesets
(`@qadi/core` ×1, `@qadi/devtools` ×2); no Breaking change. **Not merged and not released.** Archive:
`.planning/milestones/v1.7-ROADMAP.md`, `v1.7-REQUIREMENTS.md`, `v1.7-MILESTONE-AUDIT.md`.

## Previous Milestone: v1.6 Arch Wave 11 (completed 2026-11-19; not released)

**Goal:** Resolve all nine candidates of the 2026-11-16 architecture review, closing the live fail-open in the predicate
reference interpreter first, then the "stated once" deepenings, then one benchmark-gated and two speculative phases.

**Target features (Phases 53–61, ARCH-100…108, strictly serial):**
- 53: One module owns "the value a leaf compares" (own-property reads only); fixes `evaluatePredicate`'s unguarded
  `row[p.column]` that allows a row `evaluate` denies (core; live defect)
- 54: `LeafNeeds` turns every leaf's answer into a verdict, finishing ADR-QD-163 (core)
- 55: A port card is a model row, not a view join; one `PortName` key for all three readings (devtools)
- 56: The gate-registry watch becomes the dock model's third scoped feed (devtools)
- 57: `untrustedDecoder` states the envelope's unknown-key policy; both `SinkCodec` envelopes go through it (core, audit, react)
- 58: A stored record is its envelope in memory too (core, http, devtools; Breaking)
- 59: Admission produces the one walk environment; opens on a benchmark gate and may end in a recorded rejection (core)
- 60: Devtools' headless interface is the feeds, not the store/runner pairs; human checkpoint, amends ADR-QD-047 1.6 (Breaking)
- 61: `DecisionCache` is asked only the question; human checkpoint, touches ADR-QD-031

**Source review and evidence:** `.planning/phases/_WAVE11-CONTEXT.md` (the review HTML is session-scoped and may be gone).
Branch `arch-wave-11`, based on `main` at `44510112` (v1.5 merged as #162). No merge, no release.

v1.6 Arch Wave 11 completed 2026-11-19 on branch `arch-wave-11` (436 commits, 190 files, +12,895 / −3,178
outside `.planning`): ARCH-100 to ARCH-108, ADR-QD-166..174, CCR-QD-444..452. All 9 phases `passed`, every phase
Nyquist-compliant and secured, every review converged within three iterations. The three human checkpoints (59, 60, 61)
were all decided "pursue". The milestone audit is `tech_debt`, accepted by the user: 49/49 requirements, 5/5
integration seams, 4/4 flows. `check:pr` exited 0 at the end of every phase, and each phase's scoped mutation compare
held. Breaking changes in `@qadi/core`, `@qadi/http`, `@qadi/react`, `@qadi/audit` and `@qadi/devtools`, pending as
changesets. **Not merged and not released.** Archive: `.planning/milestones/v1.6-ROADMAP.md`, `v1.6-REQUIREMENTS.md`,
`v1.6-MILESTONE-AUDIT.md`.

## Previous Milestone: v1.5 Arch Wave 10 (completed 2026-11-16; merged as #162; not released)

**Goal:** Resolve all ten candidates of the 2026-11-15 architecture review, closing the four silent defects first
(a caller's `resource` dropped by `guard`/`filter*`, a wire field dropped by hydration's `rebuild`, a `NaN` breaker
threshold that never opens, a failing user sink that loses records unlogged), then the six deepenings.

**Target features (Phases 43–52, ARCH-90…99, strictly serial):**
- 43: One handover module behind the ten enforcement entry points; `guard`/`filter*` refuse a second resource (Breaking, core)
- 44: The hydration seed's fields stated once; dehydrate and rebuild are spreads (react)
- 45: The audit circuit breaker as one pure transition function; options validated at construction (audit)
- 46: The sink emitter contains and reports a failing sink once (core)
- 47: Port facts (defaultedness, consequence, call reading) read from the port description, not names (core, devtools)
- 48: Audit reports core's `SinkRecordNotEncodable` and derives "lost" from durability (audit, Breaking)
- 49: Gates as the dock model's eighth store, with one gate-state vocabulary in core (core, react, devtools)
- 50: What a leaf needs from the request, stated once; opens on a benchmark and may end in a recorded rejection (core)
- 51: Policy tag arity stated once; `foldTrace` stays public (core)
- 52: Core owns the predicate compile shell; each dialect keeps its rules, renderer and metric (core, predicate-sql, predicate-prisma)

**Source review:** `/private/tmp/claude-502/-Users-mohammadalmechkor-Projects-Perso-qadi/bf083921-e7cd-4930-bcad-a3ef483d2ac8/scratchpad/architecture-review-20261115.html`
(session-scoped; `.planning/phases/_WAVE10-CONTEXT.md` holds everything a planner needs). Branch `arch-wave-10`, based on
`arch-wave-9` at `ba0d0615` (v1.4 is not merged). No merge, no release.

## Current State

v1.10 Arch Wave 15 completed 2026-11-25 on branch `arch-wave-15`, stacked on `arch-wave-14` (see the v1.10 entry above).
All four candidates of the 2026-11-24 architecture review are resolved:
- the dock model applies every input whatever a listener throws, through one package-private collect-and-rethrow rule
  (`callAll`), and the sightings rail moves once per change;
- `QadiProvider`'s registry has one owner for its lifetime: a headless lease recycles it in place, so a provider hidden
  in `<Activity>` and shown again never reaches a disposed registry;
- the diagnostics feed holds its reading only in its snapshot, folded by a pure `foldReading`, and `Diagnostics` carries
  only what the poll samples;
- `useConfigured` takes a value with its own `configure`, `LensSession` publishes through `ExternalStore.set`, `useLens`
  reads each fact once, and the dock keeps one stop ledger per feed.

Not merged and not released (neither is v1.9). The next milestone is not yet defined.

v1.9 Arch Wave 14 completed 2026-11-24 on branch `arch-wave-14` (see the v1.9 entry above). All four candidates of the
2026-11-23 architecture review are resolved:
- an audit row is a value only its codec makes, so the package can no longer write an archive its own reader refuses;
- `TimelineStore` owns its capacity through `resize`;
- every devtools feed and the dock model are built bare and take inputs only through `configure`, under one per-field
  identity rule;
- the highlight lens is a headless session the dock model owns, `useLens` is its document adapter, and
  `QadiContextValue` no longer carries the unread `instrument`.

Not merged and not released. The next milestone is v1.10 Arch Wave 15, on `arch-wave-15` stacked on this branch.

v1.8 Arch Wave 13 completed 2026-11-23 on branch `arch-wave-13` (see the v1.8 entry above). All eight candidates of the
2026-11-22 architecture review are resolved:
- every "never throws" function in core stays total for a hostile value, through one exported rule (`thrownMessage`,
  `causeMessage`);
- hydration's drop events come from its reason-keyed buckets;
- every developer-signal reporter is resolved through one table, with the option-name drift fixed;
- the dock model's computed stores are derived stores;
- gate registration is one pure `reconcile`;
- the simulation session's policy choice is a pure seeded choice beside its runs;
- the evaluate family's spans are declared once, with one outcome key and a failed span that says what was asked;
- whether a fixture row meets a signature or acted leaf is core's own answer, and a refused value fails typed wherever it
  is read.

Merged to `main` as #164 (`5784bbd6`); not released. The next milestone is v1.9 Arch Wave 14.

v1.7 Arch Wave 12 completed 2026-11-22 on branch `arch-wave-12` (see the v1.7 entry above): every tech-debt item the
v1.6 audit carried is resolved by a change or a recorded decision. Negative type pins can fail and are budgeted, gate 14
compiles every new public name through the packed `exports` map and bounds every child it starts, one throwing devtools
listener no longer silences the rest, only `admit` builds an `Admitted`, the decoder's `ignore` projection reads only
declared keys, the two equivalent mutants and the race test's magic bound are gone, and the bench harness balances arm
order and fails loudly. Nothing is merged or released; the next milestone is not yet defined.

v1.6 Arch Wave 11 completed 2026-11-19 on branch `arch-wave-11` (see the v1.6 entry above): the predicate
interpreter's own-property fail-open is closed (Phase 53), leaf verdicts, port cards, the gates feed, the envelope's
unknown-key policy, the stored envelope and the walk environment are each stated once, devtools' headless interface is
its three feeds, and a `DecisionCache` is asked only the question. Nothing is merged or released; the next milestone
is not yet defined.

v1.5 Arch Wave 10 completed 2026-11-16 on branch `arch-wave-10` (510 commits, 198 files, +14,406 / −1,559
outside `.planning`): ARCH-90 to ARCH-99, ADR-QD-156..165, CCR-QD-434..443. All 10 phases `passed`; 43, 44, 45, 46
and 48 were re-verified at the final head after later phases (and the audit's own fixes) edited files they cover. The
milestone audit is `tech_debt`, accepted by the user: 52/52 requirements, 6/6 integration seams, 3/3 flows, Nyquist
10/10. The full `pnpm check` (with mutation) exited 0 at the final head. Breaking changes in `@qadi/core`,
`@qadi/promise`, `@qadi/react`, `@qadi/audit` and `@qadi/devtools`, pending as changesets. Merged to `main` as #162
(`44510112`; v1.4 as #160) and **not released**. Archive: `.planning/milestones/v1.5-ROADMAP.md`,
`v1.5-REQUIREMENTS.md`, `v1.5-MILESTONE-AUDIT.md`.

v1.4 Arch Wave 9 completed 2026-11-14 on branch `arch-wave-9` (228 commits, 95 files, +6,124 / −1,115
outside `.planning`): ARCH-84 to ARCH-89, ADR-QD-150..155, CCR-QD-428..433. All 6 phases `passed`; 38, 39 and 40 were
re-verified at the final head after later phases edited files they cover. The milestone audit is `passed`: 41/41
requirements, 7/7 integration seams, 5/5 flows, minor tech debt recorded. `pnpm check:pr` exited 0 at the final head and
`pnpm example` passed 30/30. One Breaking change (`@qadi/devtools`, Phase 40). **Not merged and not released.** Archive:
`.planning/milestones/v1.4-ROADMAP.md`, `v1.4-REQUIREMENTS.md`, `v1.4-MILESTONE-AUDIT.md`.

v1.3 Arch Wave 8 completed 2026-11-13 on branch `arch-wave-8` (333 commits, 220 files, +12,836 / −1,914
outside `.planning`): ARCH-78 to ARCH-83 plus the carried spec debt, ADR-QD-143..149 (144, 145 and 147 unused),
CCR-QD-421..427. All 7 phases `passed`, every one re-verified at the final head. The milestone audit is `tech_debt`,
accepted by the user: 45/45 requirements, 7/7 integration seams, 4/4 flows, six manual browser checks never run.
`pnpm check:pr` exited 0 at the end of every phase. Merged to `main` as #157 (release PR #158). Archive:
`.planning/milestones/v1.3-ROADMAP.md`, `v1.3-REQUIREMENTS.md`, `v1.3-MILESTONE-AUDIT.md`.

v1.2 Arch Wave 7 completed 2026-11-12 on branch `arch-wave-7` (272 commits, 170 files, +9,900 / −3,457
outside `.planning`): ARCH-69 to ARCH-77, ADR-QD-133..140 (136, 138, 139 and 141 unused), CCR-QD-411..419.
All 9 phases `passed`. The milestone audit is `tech_debt`, accepted by the user: 44/44 requirements, 25 open
info-level review findings and one skipped warning. `pnpm check:pr` exited 0 at the end of every phase. **Not
merged and not released.** Archive: `.planning/milestones/v1.2-ROADMAP.md`, `v1.2-REQUIREMENTS.md`,
`v1.2-MILESTONE-AUDIT.md`.

v1.1 Arch Wave 6 (ARCH-59 to ARCH-68) is merged to `main` as #155. It was never archived as a GSD milestone,
so its phases 10–20 are still in `.planning/phases/`, and its requirements are in git at `965ff14c:.planning/REQUIREMENTS.md`.

v1.0 Arch Wave 5 shipped 2026-11-09 on branch `arch-wave-5` (240 commits, 134 files, +7,660 / −1,815
outside `.planning`): ARCH-46 to ARCH-54, ADR-QD-108..116 (112, 113 and 115 left unused), CCR-QD-385..393.
All 9 phases verified `passed` against the final tree; the full `pnpm check` is green on Node 22.12.0
(CI run 42676403473 at 127d6fa). Archive: `.planning/milestones/v1.0-ROADMAP.md`.

## Previous Milestone: v1.4 Arch Wave 9 (completed 2026-11-14; not released)

**Goal:** Resolve all six candidates of the 2026-11-14 architecture review (Phases 37–42, ARCH-84…89).

**Base commit:** `637c0601` (`main`, v1.3 merged as #157, release PR #158). Branch `arch-wave-9`. **Shared rules:**
`.planning/phases/_SHARED-CONTEXT.md`, overridden where stated by `.planning/phases/_WAVE9-CONTEXT.md` (base, numbering,
per-phase evidence from the review).

**Target features:**
- One devtools module for a scoped run that a newer run supersedes (generation, close, finalizer order, stop, "land only if current"), replacing three hand copies that already drifted (review #1, Strong; top recommendation)
- The sink record wire version stated once; schema literals, encoder and decoder check derived from it (review #2)
- Each hydration drop reason stated once in core with its kind; the unions, the value list and react's payload/entry split derived (review #3)
- Core owns describing a decode refusal (mirror of ADR-QD-116); devtools passes `DecodeRefusal` through (**Breaking** `MalformedReason`), audit decodes a row once (review #4)
- One guarded value-to-text function in devtools; no panel throws on a bigint or circular value (review #5, latent defect)
- A seeded question builds its own computing atom (callback inversion removed), reopening ADR-QD-148/149 behind a human checkpoint (review #6, Speculative)

**Review report (local, outside the repo):** `/private/tmp/claude-502/-Users-mohammadalmechkor-Projects-Perso-qadi/16926f1e-64de-452f-bf60-d41917101ad8/scratchpad/architecture-review-20261114.html`.

## Previous Milestone: v1.3 Arch Wave 8 (completed 2026-11-13; not released)

**Goal:** Resolve all six candidates of the 2026-11-12 architecture review and clear
the v1.2 spec debt (Phases 30–36, from ARCH-78).

**Base commit:** `aab87576` (v1.2 merged as #156). **Shared rules:** `.planning/phases/_SHARED-CONTEXT.md`, overridden where
stated by `.planning/phases/_WAVE8-CONTEXT.md` (base, numbering, per-phase evidence from the review).

**Target features:** see `.planning/milestones/v1.3-REQUIREMENTS.md` (DEC, SUPR, EOPT, SEAL, DIAG, SWEEP, DEBT, WX).

**Review report (local, outside the repo):** `/var/folders/vn/44p0pxgs4z98v7cl11l4_r4c0000gp/T/architecture-review-20261112-022336.html`.

<details>
<summary>v1.2 Arch Wave 7 (completed 2026-11-12; not released)</summary>

**Goal:** Resolve the eight candidates and three footnotes of the 2026-11-11 architecture review (Phases 21–29, ARCH-69…77).

**Base commit:** `965ff14c` (v1.1 merged as #155). **Shared rules:** `.planning/phases/_SHARED-CONTEXT.md`, overridden where
stated by `.planning/phases/_WAVE7-CONTEXT.md` (base, numbering, evidence, and the correction to the review's candidate 1: port
keys are read by devtools replay and test doubles, not by evaluation).

**Target features:** see `.planning/milestones/v1.2-REQUIREMENTS.md` (PREQ, SCOPE, SREC, SRC, SIM, DMOD, ROUTE, GATE, TIDY, WX).

**Numbering reserved for v1.2:** the table in `.planning/phases/_WAVE7-CONTEXT.md` (ADR-QD-133–141, CCR-QD-411–419,
BEH-QD-440–484, INV-QD-286–303, ARCH-69–77).

**Review report (local, outside the repo):** `/var/folders/vn/44p0pxgs4z98v7cl11l4_r4c0000gp/T/architecture-review-20261111-011702.html`.

</details>

<details>
<summary>v1.1 Arch Wave 6 (all phases complete 2026-11-10; merged as #155; not released)</summary>


**Goal:** Resolve the nine candidates of the 2026-11-10 architecture review, and recover the lost 2026-10-13 wave.

**The lost wave.** A second set of plans numbered ARCH-46…57 (2026-10-13 review; untracked until Phase 10 archived it to `.planning/milestones/archive-pre-gsd/architecture/`)
was implemented on `wave5/architecture-deepenings` and never merged. Its commits were recovered from the reflog on
2026-11-10 and pinned **locally** as `rescue/wave5-1013` (tip `950977f`), with `rescue/arch50-stash-a`/`-b` (superseded).
Its ids collide with merged #153, so it is ported under new numbers, never cherry-picked. Live defects and their
salvage sources: `.planning/phases/_SALVAGE.md`.

**Target features:** see `965ff14c:.planning/REQUIREMENTS.md` in git (REC, SEC, INT, GAP, AUD, DOCK, ROLE, KEY, SURF, VIEW, CACHE, XC).

**Review report (local, outside the repo):** `/var/folders/vn/44p0pxgs4z98v7cl11l4_r4c0000gp/T/architecture-review-20261110-004912.html`.

</details>

## Core Value

**An authorization decision is never wrong and never silent.** Each deepening must keep
evaluation fail-closed. It must also keep every denial, refusal and failure observable:
logged, counted or spanned.

## Requirements

### Validated

- ARCH-01 to ARCH-45 (waves 1–4, commits #140, #148, #150), ADR-QD-077 to ADR-QD-107.
- ✓ ARCH-46 HTTP request enforcement (ENF-01..06): every `@qadi/http` request path (guardRoute, port routes, RequirePermission middleware, decision-stream recheck) enforces and logs through the package-private `AuthorizeRequest.ts`; unguarded port routes now log `SubjectExtractionFailed` — Phase 1 (ADR-QD-108, CCR-QD-385, INV-QD-243, BEH-QD-335/336)
- ✓ ARCH-47 One port read (PORT-01..06): a port's span projection is stated once (`pose`/`disclose`) and every local and served read runs through `readPort` — Phase 2 (ADR-QD-109, CCR-QD-386, INV-QD-244)
- ✓ ARCH-48 Audit archive facts (ARC-01..04): the archive's order, claim, sequence break and sequence-number domain are stated once in the package-private `ArchiveFacts.ts`; `archiveAuditTrail` builds from them and `readAuditArchive` recomputes them; a whole-number-domain property proves the reader accepts every bundle the writer writes — Phase 3 (ADR-QD-110, CCR-QD-387; `@qadi/audit` minor: new `SequenceNumberInvalid`)
- ✓ ARCH-49 Gate instrumentation hook (GATE-01..05): `QadiProvider` resolves the gate writer once (`gateWriterFor` has one call site) and carries it on the package-private `GateScopeContext`; every gate kind's hook, `useGate` and `useQuestionsAs` included, is a thin caller of `useGates`; `usePolicies` is pinned not to re-create its group atom across equal re-renders — Phase 4 (ADR-QD-111, CCR-QD-388; `@qadi/react` patch)
- ✓ ARCH-50 Decision log over HTTP (LOGH-01..04): `/__decisions` and `/__decisions/backlog` encode and report refusals through one package-private `DecisionLogHttp.ts` (one `reportRefused` factory, per-route span and words); the backlog route no longer imports the stream route; one 12-cell table pins refusal in JSON, SSE backlog and SSE live — Phase 5 (no ADR, CCR-QD-389, BEH-QD-337; `@qadi/http` patch)
- ✓ ARCH-51 Dehydration in the engine (HYD-01..04): `HydrationEngine` exposes `dehydrateWith(entries, options)` beside `hydrateWith`, so both directions of the payload have one owner; `dehydrateEntry`/`dehydratedPayload` are private to the engine and the identity wrapper `resolveMismatchReporter` is deleted; a round-trip test drives both directions through the engine's interface — Phase 6 (ADR-QD-078 amended, ADR-QD-113 unused, CCR-QD-390, BEH-QD-146/INV-QD-022/INV-QD-045 restated; `@qadi/react` patch)
- ✓ ARCH-52 One port route address (ADDR-01..03): the default prefix `/__ports` and `portPath` live once in the package-private leaf `PortRouteAddress.ts`, used by both `portRoutes` and `remotePortsLayer`; the "decode the body whatever the status" reply contract is stated beside it; a round trip under `/x/ports` (guarded and unguarded) proves server and client agree, and `portPath` normalizes trailing slashes (WR-01) — Phase 7 (no ADR, CCR-QD-391, BEH-QD-338; `@qadi/http` patch)

- ✓ ARCH-53 Port serving from the registry (SERV-01..05): D-01 approved, so ADR-QD-094 is amended and every port description carries a serving facet (`PortServingFacet`, `PortServing.ts`); `servingFor` and `answerRemotely` derive admission from it, and a required port with a missing allowlist is refused (WR-01); `tabulatePorts` is two overloads over one body; `fixturePortsLayer` is derived from the registry; `mapPorts` removed (**Breaking**, shipped in 0.10.0) — Phase 8 (ADR-QD-114, CCR-QD-392, INV-QD-095 amended; 08-SECURITY.md 17/17 closed)

- ✓ ARCH-54 Sink record projection (SINK-01..03): `SinkEmit.ts` owns all three record projections (failed, decided, obligation), and `new ObligationRecord` is built only there and in the codec's decoder; the obligation record is projected once, before the handler runs (WR-01); the refusal vocabulary moved to the public leaf `JsonRefusal.ts`, and `SinkWire.ts` keeps only record-side words, so no port module imports the sink wire — Phase 9 (ADR-QD-116, ADR-QD-115 unused, CCR-QD-393)

- ✓ ARCH-69 Port request derived from its description (PREQ-01..05): four ports derive their request `key` and `defect` from the wire question (`makePortDescription`); the wire and span questions are exhaustive by type, so a dropped member is a compile error; CustomPredicate keeps its own `key`/`defect`; a property law ties each derived key to `canonicalKey` of its wire question — Phase 21 (ADR-QD-133, ADR-QD-094 and ADR-QD-107 amended, CCR-QD-411, BEH-QD-440/441, INV-QD-286)
- ✓ ARCH-70 One scoped port read (SCOPE-01..05): each port description states once, as `asks`, the request every policy leaf puts to it; the reads and `servingFor` derive from it (`ServedLeaves` and the facet's `leaves` removed, `LeafRequests`/`ReadSite`/`LeafOf`/`AskedOf` added); the three resource-scoped reads go through one `readScoped`, and a missing resource id leaves only the port span (`requireResourceId` deleted); every read takes its policy leaf — Phase 22 (ADR-QD-134, CCR-QD-412, BEH-QD-445/446, INV-QD-288/289; `@qadi/core` minor, `PortDescription` change marked Breaking)
- ✓ ARCH-71 Sink record fields stated once (SREC-01..05): each record's fields are one `Schema.Struct` in the package-private `SinkRecordFields.ts`; the record class is a `Data.TaggedClass` typed by it and the v2 wire struct spreads it; absent keys stay absent, wire byte-identical — Phase 23 (ADR-QD-135, ADR-QD-095 amended, CCR-QD-413, BEH-QD-450/451, INV-QD-290; `@qadi/core` patch)
- ✓ ARCH-72 Simulation source preparation (SRC-01..03): `prepareSource(choice, { ports, capture })` in `SimulationSource.ts` owns availability, refusal and the Live capture from one table closed over `SourceChoice`; the session branches only on `Ready`/`Refused` (`resolveSource`, `sourceOptions`, `ResolvedSource` removed, package-private) — Phase 24 (ADR-QD-050 Rev 1.4 amended, CCR-QD-414, BEH-QD-455; `@qadi/devtools` patch)
- ✓ ARCH-73 Session-only Simulator (SIM-01..05): `Simulator` is a view of its session (`OwnedSimulator` and the `sightings` prop removed); `setAction`, `choosePolicyAt`, `policyMenu`, `cost`, `baselineReading` and `Ran.reading` live in the session; `makeSimulationSession` is an `Effect.fn` in a `Scope` that owns its runs through a `FiberHandle`, `supersede()` interrupts a replaced run, and `reap`/`hasRetired`/`dispose` are gone; React owns the scope through the package-private `useScoped` — Phase 25 (ADR-QD-137 supersedes ARCH-20 D-20-b, ADR-QD-047 Rev 1.11, CCR-QD-415, BEH-QD-460/461; `@qadi/devtools` minor)
- ✓ ARCH-74 Headless dock model (DMOD-01..05): the dock's six stores and the rules between them live in the package-private scoped `makeDockModel` (one rail push per timeline or catalogue change, per-field identity `configure`, the source read through its own `FiberHandle`); React owns one model through `useDockModel` and the four owned hooks are gone; both sessions embed one `makeHeldChoice` cell, `PolicyChoice` is `Empty | Listed | Evicted | Seeded` and `HeldChoice` is public; 13 DOM duplicates moved to headless model tests — Phase 26 (ADR-QD-047 Rev 1.12, CCR-QD-416, BEH-QD-465/466, INV-QD-296; `@qadi/devtools` patch)
- ✓ ARCH-75 Bare-route module (ROUTE-01..03): `addGuardedRoute` is written once in `GuardRoute.ts` (`guardRoute`/`buildGuardedRoute` removed); its typing rule (the handler's `CurrentSubject` discharged, the loader's not, no "Error" marker) and method agreement are pinned on the public function in `GuardRoute.tst.ts`; `RouteMethod` is stated once in the package-private `UnguardedRoute.ts`; `PermissionRegistry.ts` holds only the registry and `/__permissions` moved to `PermissionRegistryRoute.ts`; export names unchanged, no import cycle — Phase 27 (ADR-QD-036 Rev 1.10 amended, CCR-QD-417, BEH-QD-470; `@qadi/http` patch)
- ✓ ARCH-76 Gate registry dependency (GATE-01..04): outcome A (the human's, from `_DECISIONS-v1.2.md`): `GateWriter.ts` is the React-free write side, a leaf below the registry with type-only imports, holding a pure `reconcile` tested against a fake writer without rendering; the hooks moved to `useGate.ts` above `QadiAtoms` and `GateAtoms` is `Pick<QadiAtoms, "decision" | "decisions">`; the test-only `useGateRegistration` is gone (its seven cases run on `useGateRegistrations`); public surface unchanged, no cycle — Phase 28 (ADR-QD-140 amends ADR-QD-111 and ADR-QD-080, CCR-QD-418; `@qadi/react` patch)
- ✓ ARCH-77 Small restated facts (TIDY-01..03): a port's name and span are stated once in the import-free `PortName.ts` (one five-row table; `PortName`, `PortSpanName` and the new `PortSpanOf<N>` read from it; metrics untouched), and `PortDescription.span` is `PortSpanOf<N>`, so a description can name only its own port's span; `HydrationEngine.ts` states each entry's withheld fields once (`ALLOW_WITHHELD`/`DENY_WITHHELD`); `FAILURE_IS_NOT_A_DENIAL` in devtools' `model/Verdict.ts` serves the Inspector and the Simulator — Phase 29 (ADR-QD-094 and ADR-QD-123 amended, CCR-QD-419, ADR-QD-141 unused; `@qadi/core` minor, `@qadi/react` and `@qadi/devtools` patch)
- ✓ ARCH-78 One strict decode module (DEC-01..08): `UntrustedDecode.ts` is the one way to strict-decode untrusted JSON (parse, depth guard, an optional seam `prepare`, strict decode; closed `NotJson | TooDeep | Malformed`), and the nine seams (`Policy.fromJson`/`fromJsonValue`, `SinkCodec`, the three port-wire decoders, `PortRemote`, hydration, the audit archive and row) keep only an exhaustive refusal mapping; `unwalked` replaces the hand-built partial-walk copies; `PolicyFromJson` removed, `UNTRUSTED_DECODE_OPTIONS`/`exceedsJsonDepth` off the surface, `PolicyNotJson`, `PayloadTooDeep` and `ArchiveRefusal.TooDeep` added (all **Breaking**); `[untrusted-decode]` budgets strict decode and `JSON.parse` outside the leaf both ways — Phase 30 (ADR-QD-143, ADR-QD-002/096/107 amended, CCR-QD-421, BEH-QD-486..489, INV-QD-305/306; `@qadi/core`, `@qadi/react`, `@qadi/audit` minor, `@qadi/devtools` patch)
- ✓ ARCH-79 A reset supersedes its claims (SUPR-01..05): `SharedComputation` owns its staleness rule — each in-flight claim carries a closed `standing: "Live" | "Superseded" | "Abandoned"`, `reset` supersedes every in-flight claim in one synchronous step, and only a Live claim's exit reaches the adapter through the new `settle(key, exit)` hook (replacing `claim`); a superseded claim still answers every waiter and is still interrupted when its last waiter leaves; `DecisionCache` keeps no generation counter (`clear` empties the map and calls `shared.reset()`); four clear-mid-compute races (RED first) and a model-based property (seed 3101, 300 runs) pin it, `DecisionCache.test.ts` unchanged; no public API change — Phase 31 (ADR-QD-132 amended, CCR-QD-422, BEH-QD-491, INV-QD-307, ADR-QD-144 unused; `@qadi/core` patch)
- ✓ ARCH-80 Evaluation options and services stated once (EOPT-01..04): `EvaluateOptions` is declared once, beside `QuestionOptions` in `Question.ts`; `EvaluationServices` and `StandingEvaluationServices` live in a new type-only leaf `EvaluationServices.ts`; `Evaluate.ts` declares only `evaluate`, with no re-export; `Lifecycle.ts` deleted its restated `LifecycleOptions` — `decideQuestion` takes `Omit<EvaluateOptions, keyof QuestionOptions>` and `ask` requires `EvaluationServices` by name. Public names and shapes unchanged, proven by a barrel tstyche pin committed on the phase base and kept byte-identical; mutation scores unchanged; `@qadi/core` patch changeset; CCR-QD-423 — v1.3 Phase 32
- ✓ ARCH-81 One sealed evaluation layer (SEAL-01..05): `@qadi/core` exports one builder, `evaluationEnvironment({ ports, idPrefix, clock, shadow })`, every option required, returning `StandingEvaluationServices`; `shadow` is the closed union `EvaluationShadowing` (`"none" | "sinkAndCache"`), dispatched exhaustively — `sinkAndCache` installs a discarding sink and a fresh private cache per build. Devtools' `simulationLayer` passes `sinkAndCache`, `@qadi/testing`'s `qadiReviewLayer` and core's test helpers pass `none`; INV-QD-042 restated, INV-QD-311/312, ADR-QD-146 amends ADR-QD-050. One clock vocabulary, core's type-only `EvaluationClock` (`"live" | "deterministic"`): **Breaking** for testing's `clock: "test"` and devtools' removed `SimulationClock`, each mapped to a layer once outside core (core imports no `effect/testing`). Characterisation pins first, a review–simulation conformance test, new module mutation 100%; changesets core minor, testing and devtools minor with Breaking; CCR-QD-424 — v1.3 Phase 33
- ✓ ARCH-82 Diagnostics as the dock model's seventh store (DIAG-01..06): `makeDockModel` takes `diagnostics` and `reading` through per-field `configure` and runs the poll on its own `FiberHandle` in the model's scope via `makeDiagnosticsFeed`. Its status is the closed `DiagnosticsStatus` (`Off`/`Starting`/`Live`/`Stopped{reason,sampled}`); interruption never reads as `Stopped`, and a generation token and closing finalizer guard late writes. The seventh store `diagnostics` holds `{status, reading}`, merged when an input changes, so the dock merges nothing. `useTimeline` runs a scoped `makeTimelineFeed`; one `useStoreSnapshot` replaces `useRunningStore`, and `useDockSession`/`useExplorerSession` are deleted. A Stopped notice on Services and Questions has a restart button and focus return, with the reason `<pre>` outside the alert. **Breaking:** `useDiagnostics` returns `{status, reading}`, and `useTimeline`'s lifetime is scoped. ADR-QD-047 and ADR-QD-137 are amended, BEH-QD-506..510, INV-QD-313..314; mutation DockModel 100, DiagnosticsFeed 92.8 with every survivor named; browser checks passed; CCR-QD-425 — v1.3 Phase 34
- ✓ ARCH-83 The atom set owns its eviction sweep (SWEEP-01..05): a spike measured three mechanisms against six criteria, and the edge-triggered deferred sweep won on the fixed ranking (no timer, no fiber lifetime, one sweeper by construction). `QuestionBook` signals through a package-private `signal` seam on an admission over capacity and on a release to zero while over it. The new package-private `SweepScheduler` coalesces signals behind one pending flag and forks `Effect.yieldNow` then the sweep, once per pressure episode; a throwing fork clears the flag. `maxTrackedQuestions` now holds on a bare registry with no provider, with one sweep per episode across any number of providers or registries, never on the render path or inside the dispose-then-reread window, under StrictMode and Activity. The provider forks nothing. **Breaking:** `QadiProviderProps.sweepIntervalMillis` and `QadiAtoms.sweepEvictions` are removed. ADR-QD-148 is new, ADR-QD-014 and ADR-QD-103 are amended, BEH-QD-511..515, INV-QD-315..316, and AGENTS.md §13 is amended with the user's approval; mutation SweepScheduler 100, and no touched file fell; e2e 30/30; CCR-QD-426 — v1.3 Phase 35

- ✓ Carried spec debt and stale records (DEBT-01..05): one BEH-QD-219..221 block in behaviour 29 (fail-closed replay kept); the stale `Sources.ts` token deleted (D-17 override of DEBT-02's wording); no live record claims replay fail-open is undecided; every open v1.2 info finding re-verified and fixed, resolved or refuted with evidence (`describeSource` beside `prepareSource`, one recorder per run); stale citations corrected. Two live defects found and fixed: a server seed lost one macrotask after hydration (now held by its question, a registry holding only a `SeedGrant`; the `subject` atom keepAlive first) and a timeline feed whose death read as live (closed `TimelineStatus`, Stopped notice with restart, shared `StoppedBox`). `qadi_port_calls_total`'s description corrected to say it counts the evaluator only. **Breaking** in `@qadi/devtools`: `Baseline.Checked` gains `reading`, `baselineReading` removed. ADR-QD-149 amends ADR-QD-039/103, BEH-QD-516..520, INV-QD-317..318; CCR-QD-427 — v1.3 Phase 36

- ✓ ARCH-84 A scoped run that a newer run supersedes (RUN-01..08): one package-private module, `SupersedingRun.ts` (`makeSupersedingRun`), owns the protocol the timeline feed, the diagnostics feed and the simulation session each restated by hand. The interface has two steps: `begin()` supersedes and returns an opaque token, the store publishes, then `fork(token, run, { onFailure? })` runs only while the token is current. `isCurrent` guards each landed write, `stop` is unconditional, and the finalizer is registered after the handle so it runs first on close. A restart from inside a store's own notification now leaves the newest run live: `fork` re-checks the token, and a fork requested during another fork's start is held in one slot and installed when that start returns (the in-prefix case is repaired rather than reported). This fixed three latent defects found RED first (TF21–TF23, F28/F29, SR5). Module rows R1–R17 and a seeded property (seed 3701, nine floors at least 30) cover it; mutation TimelineFeed 1, DiagnosticsFeed 0.928 to 0.947, SimulationSession 0.977 to 0.982, SupersedingRun 0.943 with three equivalent survivors named. ADR-QD-150 amends ADR-QD-137 (Rev 1.3), BEH-QD-521..525, INV-QD-319..320, AGENTS.md §10 no longer names `it.scoped`; `@qadi/devtools` patch changeset; CCR-QD-428 — v1.4 Phase 37

- ✓ ARCH-85 The sink wire version stated once (WIRE-01..05): `export const WIRE_VERSION = 2 as const` in `SinkWire.ts` is the one place the record wire's version number appears in `packages/core/src/Sink*.ts` code (seven sites at the base). `WIRE_VERSIONS = [WIRE_VERSION] as const` (the read set, now `readonly [2]`) and `WireVersion` derive from it; both schema literals and the encoder read it; the decoder tests membership in the read set (`isReadVersion = Schema.is(Schema.Literals(WIRE_VERSIONS))`), never `=== WIRE_VERSION`. A tstyche pin (`SinkWire.tst.ts`) and the byte goldens go red on a retype; on the base the same retype compiled with half the codec at 2 and the decoder refused its own output. Bytes unchanged. ADR-QD-151 amends ADR-QD-096; INV-QD-096 amended in place; CCR-QD-429; `@qadi/core` minor.

- ✓ ARCH-86 Each hydration drop reason stated once, with its kind (DROP-01..04): one module-private `HYDRATION_DROP_TABLE` in `HydrationMetrics.ts` (`as const satisfies` `HydrationDropRow`) holds each of the nine reasons, in the metric's preregistered order, with its kind (`dehydration`, `payload` or `entry`), summary and remedy; `MEANINGS` is gone. The three reason unions, `hydrationDropReasons` (`Object.keys` filtered by the guard, no cast), `isHydrationDropReason` (`Object.hasOwn`) and `hydrationDropMeaning` derive from it, and react's `PayloadRefusalReason`/`EntryDropReason` are `HydrationDropReasonOf<"payload">`/`<"entry">`. A row without a kind is TS2741; on the base a new reason needed 5 edits in 3 files and the compiler asked for one, now it is one row. A new `entry` row is a compile error at react's `bucketOf`; a `payload` row compiles (the payload map is keyed by refusal tags), recorded in ADR-QD-152. Metric declarations unchanged. New public types `HydrationDropReasonOf`, `HydrationDropRow`; INV-QD-323; CCR-QD-430; `@qadi/core` minor, `@qadi/react` patch.

- ✓ ARCH-87 Core owns describing a decode refusal (DREF-01..07), the mirror of ADR-QD-116's encode side: `SinkWire.ts` exports `decodeRefusalOf` (the one `UntrustedValueRefusal` → `DecodeRefusal` mapping; `SinkCodec.ts`'s and `AuditEntry.ts`'s copies deleted), a total `describeDecodeRefusal` (module-scope `Match.tagsExhaustive`, `typeof`-only bounded version, 40/200 caps) and the tag-only `decodeRefusalAnnotations` (`qadi.refusal` only, INV-QD-104; an `EXEMPTIONS` entry for `no-refusal-annotation-outside-core`). **Breaking (`@qadi/devtools`):** `onMalformed(frame, refusal: DecodeRefusal)`; `MalformedReason`, `reasonOf` and `qadi.reason` deleted, five-word upgrade map (`not-a-record` collapses into `Malformed`); a throwing `onMalformed` no longer ends the stream (code review). Audit decodes a row's record once through the new `decodeSinkRecordWithJson` (a counted `Schema.decodeTo` in `SinkCodec.ts`, 1 → 2 in `UNTRUSTED_DECODE_BUDGET`; `AuditEntry.ts`'s row and `recordJsonOf` retired, total unchanged), output identical on every differential row. A new refusal is now a compile error in core only. Cost: `decodeSinkRecord` 8.4 → 18.4 µs (~2.19×), accepted in ADR-QD-153. ADR-QD-153; CCR-QD-431; INV-QD-325; BEH-QD-536/537; `@qadi/core` minor, `@qadi/devtools` Breaking (minor), `@qadi/audit` patch.

- ✓ ARCH-88 One guarded value-to-text function (TEXT-01..04): `@qadi/core`'s new `ValueText.ts` exports `valueText` (`(value: unknown) => string | undefined`, never throws) and `valueLabel` (the one label rule: a bigint as `10n`, an object with no JSON form as `a value with no JSON form`, otherwise the word `undefined`). Core's `explain` (`LiteralRef`, `In`, `Contains`; an unwalkable `In` list reads through `valueLabel`) and devtools' remedy label, Filters' search text and SimulationForm all read through it, so a bigint, a cycle or a throwing `toJSON`/getter no longer throws out of `explain`, `policyLabel`, `inspect`, `remedyEdits` or `SimulationSession.commit()`. Existing labels unchanged except one recorded case (an object whose `toJSON` gives nothing: `undefined` → the fixed words). User decision: one primitive in core (D-13..D-16), not one in devtools. ADR-QD-154; CCR-QD-432; BEH-QD-541/542; `@qadi/core` minor, `@qadi/devtools` patch.

- ✓ ARCH-89 A seeded question builds its own computing atom (SEED-01..06): `@qadi/react`'s package-private `SeededQuestion.ts` exports `makeSeededQuestion({ policy, resource, runtime, subject, report, live })`, which builds the question's computing atom itself and reads its seed through `seededIn(get.registry)`; the `computedFor` callback-that-takes-a-callback and `QadiAtoms.ts`'s hand-wired `seededDecision` are gone, `HydrationEngine.ts` is the payload codec only, `DECISIONS_KEY` and the `DECISION_READ_BUDGET` key moved with the code (`QadiRuntimeServices` did not), and the fake computing-atom tests were replaced by real-runtime ones, including two trap tests proven red under a `get(grantAtom)` read. User decision: option 1b (own module) over 1a (in place), 2 (seed holder) and 3 (reject). Milestone re-check: all 15 touched files at their latest recorded score. ADR-QD-155 (amends ADR-QD-149, ADR-QD-140; review added dated amendments to ADR-QD-093, ADR-QD-041 and BEH-QD-151); CCR-QD-433; `@qadi/react` patch.

- ✓ ARCH-90 One handover module behind the enforcement entry points (HAND-01..06): the package-private `Handover.ts` owns "decide against this value, discharge on allow, release whole or projected" — `HandoverOptions` (`resource?: never`), the closed `HandoverVerdict` (`Released`/`Barred`, renamed from `Admitted`/`Refused` at the milestone audit) from `verdictOf` (the one allow → discharge / deny branch), `resourceFree`/`decidedOn` (the positional value written last), the closed `Release` table holding the one `project(` and the per-item `handOver`; `discharge` moved byte-identical. The ten entry points in `Qadi.ts` are adapters by shape; `permitted`, `decideOne`, `withLoadedResource` and `FilterVerdict` are gone. `guard` and the four `filter*` refuse `{ resource }` at compile time (RED on the base), and `enforceProjected` now decides resource-free even when a resource is smuggled in at runtime. `@qadi/promise`'s `filter`, `filterProjected` and `projected` refuse `resource` through `resource?: never`, so a `FacadeOptions` variable is refused as well as a literal (review WR-01). **Breaking:** `LoadedEnforceOptions` renamed `HandoverOptions` with no alias. Mutation Qadi.ts 0.973 → 1, Handover.ts 1. ADR-QD-156 (amends ADR-104/105/019/022/035), CCR-QD-434, BEH-QD-551/552, INV-QD-331, INV-QD-108/032/009/013 restated; `@qadi/core` and `@qadi/promise` minor (Breaking) — v1.5 Phase 43
- ✓ ARCH-91 The hydration seed's fields stated once (HYDF-01..04): `SeededDecision.ts` states each verdict's seed fields once — `AllowSeedFields`/`DenySeedFields` are `Struct.omit` of core's `DecisionWireAllow`/`DecisionWireDeny` fields minus `ALLOW_WITHHELD`/`DENY_WITHHELD`, plus `disclosure` — and `SeededAllow`/`SeededDeny` stay `Data.TaggedClass`es typed by them plus the one `subjectId` (ADR-QD-078 kept). The payload entries are `Schema.TaggedStruct`s of the same fields, `rebuild` is a spread, and the Allow/Deny branch is one closed `VERDICTS` table read by `dehydrateDecision`, `rebuild` and `entryAgrees` (no `_tag ===` branch left). A seeded round-trip property (RED on the base with a scratch wire field, GREEN after), an eight-string payload byte golden (unchanged), a wire key-set pin and a pin tying the test's classification to the engine's withheld lists (review WR-01 ×3) guard it. **Breaking:** `SeededAllow.visibleFields` is an optional key, absent when the server sent none. Mutation HydrationEngine.ts 1 → 1, SeededDecision.ts 0.875 → 0.875. ADR-QD-157 (Rev 1.3), ADR-QD-078 Rev 1.5, CCR-QD-435, BEH-QD-556, INV-QD-333, AGENTS.md §7; `@qadi/react` minor (Breaking) — v1.5 Phase 44
- ✓ ARCH-92 The audit circuit breaker as one transition function (BRKR-01..05): `CircuitBreaker.ts`'s rules are one pure `step(rules)(state, event, now)` over a closed event union (Observe, Success, Failure, Claim, Release; the last three carry a generation), with the stale-generation check written once (`admittedUnder`), `generation + 1` written once (eight copies at the base) and seven hoisted `Match.type` matchers; one `run(event)` does the one clock read, the one `Ref.modify` and the announcement (INV-QD-052 kept), and a Claim is won when the state changed. A 21-row pure table plus a seeded fast-check property tests it without fibers or a clock; the 16-row adapter table and `CircuitBreaker.test.ts` (byte-identical) stay green. Options are checked once when built (package-private `SinkOptionChecks.ts`) and refused with the typed `InvalidAuditSinkOption`: a `failureThreshold` that is not a positive safe integer, a `resetTimeoutMs` that is not a finite, positive, whole number of milliseconds within the safe integers, a `storeCallTimeout` that is not a positive duration (`Duration.infinity` kept as no deadline, user decision D-06a). RED on the base (`NaN` built a breaker that never opened). **Breaking:** `AuditDecisionSinkLive`'s layer error is `InvalidAuditSinkOption` (was `never`), and `Infinity`/`Duration.infinity` thresholds and cooldowns are refused. Mutation CircuitBreaker.ts 0.805 → 0.853, AuditDecisionSinkLive.ts 1 → 1, new files 1. ADR-QD-158 (Rev 1.4), ADR-QD-126 Rev 1.1, CCR-QD-436, BEH-QD-561, INV-QD-335, BEH-QD-249/251/379 and INV-QD-052 amended; `@qadi/audit` minor (Breaking) — v1.5 Phase 45
- ✓ ARCH-93 The sink emitter reports what it contains (EMIT-01..04): `sinkEmitter` suspends the sink's call, so a synchronous throw from `record` is contained too (on the base it made `evaluate` die), and turns every contained cause — failure, defect, self-interrupt — into exactly one `Warn` line, "qadi: a decision sink failed; the record was not delivered", annotated with exactly four keys (`qadi.sink`, `qadi.record_tag`, `evaluationId`, `qadi.cause`), inside a containment of its own so a throwing logger, `name` getter or cause rendering cannot defect or change a decision (INV-QD-035 restated, INV-QD-337/338). The report and the guarded `sinkName` live in package-private `SinkReport.ts`; `_tag`/`evaluationId` are captured before the sink runs (review WR-01), and an interruption of the evaluation itself propagates unreported (review WR-02). `DecisionSinkShape` gains optional `name`; all five shipped sinks name themselves (`decisionSinkAll`, `decisionSinkForwarding`, `decisionLog`, `evaluationEnvironment.shadow`, `AuditDecisionSinkLive`); the fan-out names its failed member with the same four keys and keeps going; the forwarder's outer catch is gone (one failure, one report — classification W0..W10); the sink is still read once. RED on the base: 14 + 12 + 1 rows logged nothing. Mutation DecisionLog.ts 0.93 → 0.99, DecisionSinkForwarding.ts 0.81 → 0.90, SinkEmit/EvaluationEnvironment/AuditDecisionSinkLive 1 → 1, SinkReport.ts 1. ADR-QD-159 (Rev 1.7), ADR-QD-044 Rev 1.3, CCR-QD-437, BEH-QD-566..570 (181/182/185/187 amended), INV-QD-337/338; `@qadi/core` minor, `@qadi/audit` patch — v1.5 Phase 46
- ✓ ARCH-94 Port facts read from the description (PFCT-01..05): whether a port's service is its fail-closed default is a structural fact, not a name. `nonePort` marks its shape with a package-private unique symbol (`PortDefault.ts`, holding the `PortName`, user decision D-20); `wrapPort`, `boundedPort` and `decoratePorts` (so retrying, timingOut, recording and devtools' `capturing`, D-17) carry it from a marked inner; `scriptedPort` and `askRemotely` never mark. The public `isPortDefault(d, service)` reads an own property only, compares the port, and is total (a hostile or revoked proxy answers false, review WR-02); `markDefault` defines the mark in place when the object accepts it and copies otherwise, so a decorator's `#private` state survives (review WR-01 ×3). Devtools' wiring report reads `defaulted` from `isPortDefault` (RED on the base: a renamed spreading wrapper around each default read real; `isDefaultName` gone); each port's consequence sentence and call-row reading live once in package-private `PortReading.ts` keyed by `PortName`; `ServicesPanel.tsx` keeps one generic `describe` and names no span field; `ROWS` is five `rowOf(PORTS.X)` lines (monomorphic R6 helper, D-18) and `PortCall` is derived from the registry (D-19). Wording byte-identical (24-row characterisation), except an unnamed default now reads `defaulted — unnamed` (review WR-01). A scratch sixth port flags only `PortCalls.ts`, `PortReading.ts`, `SimulationFields.ts`, `SimulationSource.ts`. Limits stated: a fresh-object wrapper reads real (D-04), a duplicate core install reads defaults as real (D-20). Mutation PortDerivation.ts 0.98 → 0.98, the other touched files 1 → 1, PortReading.ts 1, PortDefault.ts 0.857 (two equivalent catch-block survivors named). ADR-QD-160 (Rev 1.6), CCR-QD-438, BEH-QD-571..575 (196/215/228 amended), INV-QD-339/340; `@qadi/core` minor, `@qadi/devtools` patch — v1.5 Phase 47
- ✓ ARCH-95 Audit reports core's refusal and derives "lost" (AREF-01..04): `@qadi/audit` reports core's `SinkRecordNotEncodable` — `encodeAuditEntry`, `onRefused` and `AuditWriteOutcome.Refused.refusal` carry it, `AuditEntryNotEncodable` and its `reason` are deleted with no alias (Breaking, user decisions D-01..D-04; the sentence is core's `describeEncodeRefusal`, which may carry caller text and is not for a log). Whether an unwritten entry is lost is one closed row per staging variant in the package-private `UnwrittenRow.ts` (D-05), read by `durabilityOf`, the lost counter's label and the unwritten line's level and wording; `StageResult` is a closed `Data.TaggedEnum` and every branch is an exhaustive match (D-09/D-10). Output byte-identical on all eleven leaves (pinned on the base). ADR-QD-161, BEH-QD-576..580, INV-QD-341..342, CCR-QD-439 — Phase 48
- ✓ ARCH-96 Gates as the dock model's eighth store, one gate-state vocabulary (GATE-01..05): the five gate-state words are one keyed table in `@qadi/core`'s `GateState.ts` (ADR-QD-152 pattern, worst news first: `GateState`, `isGateState`, `gateStates`); react's `DecisionOutcome` tags and `GateRenderState` are that type and devtools' `GATE_DISPLAY` is mapped over it, with no `@qadi/react` dependency and an unknown state still `Unrecognised`. The gate registry is the dock model's eighth store, `questions`: `rejoin` builds one snapshot joining each question with the instances asking it from the same moment, on a diagnostics publish or a registry notification, and the model's scope releases the subscription; `QuestionsPanel` renders that snapshot through a hoisted `Match`. A registry whose `instances()`, `subscribe` or unsubscribe throws is a closed `GatesView.Failed { reason }` (`qadi-gates-failed`), rows make no claim about who is asking while it is failed, and `configure` re-watches after a failed watch (review). **Breaking:** `DevtoolsDock`'s `gates` prop and `useDevtoolsFeed().gates` are the registry (D-10, D-18). Characterisation byte-identical except the D-12a sentence. Mutation DockModel.ts 1, Gates.ts 1, DecisionOutcome.ts 1, others = base. ADR-QD-162 (Rev 1.5), ADR-047/053 amended, CCR-QD-440, BEH-QD-581..585, INV-QD-343..344; `@qadi/core` minor, `@qadi/react` and `@qadi/devtools` minor (Breaking) — Phase 49
- ✓ ARCH-97 What a leaf needs from the request, stated once (LEAF-01..05): the bench gate measured first and said pursue (3 + 3 interleaved, median of per-run minima, 0 of 35 workloads beyond their band); package-private `LeafNeeds.ts` states once, per leaf tag, which request inputs it reads, the absence each becomes and the order they are checked (a leaf's own input first, then what its matcher references, action before resource), and `Walk`, `toPredicate` and `readScoped` read it, with the port-free `HasRole`/`HasPermission`/`HasAction` judgement written once; the row types are derived per leaf with closed classification lists, so an unclassified new leaf does not compile; `MissingAction.expected` is omitted, not `undefined`, in both interpreters (wire-invisible) — Phase 50 (ADR-QD-163)
- ✓ ARCH-98 Policy tag arity stated once (ARTY-01..03): one closed record, `POLICY_ARITY` in package-private `PolicyArity.ts` (not `Policy.ts`, whose exports are all public through the barrel), gives each tag Leaf, Wrapper or Many; `traceShapeOf` reads it and `leafTags` is gone; `childrenOf`'s arms are typed by arity (`{ readonly 0?: never }` refuses a Wrapper's tuple under Many), `LeafPolicy` is derived from the record and type-equal to the old one, and `PolicyCases`/`TraceCases` are tied by tstyche negatives, so all 32 single-tag moves that compiled on the base now fail; `traceChildrenOf` dispatches through a closed per-arity table; `foldTrace`, `renderTrace` and `diffTraces` keep their walks — Phase 51 (ADR-QD-164)
- ✓ ARCH-99 Core owns the predicate compile shell (COMP-01..04): `@qadi/core`'s `compilePredicate` (beside `toRenderable`, a plain function with no span) applies the `identifiers`/`maxInValues` defaults, runs `toRenderable`, counts `refused` once on a refusal and `compiled` once after a successful render against a `CompileOutcomes` series the caller supplies; `compileSql` and `compilePrismaWhere` keep only their rules, renderer and own declared metric; `rules` refuses `identifiers`/`maxInValues` by type; outputs and refusals byte-for-byte unchanged (characterisation on the base); Prisma now counts `compiled` after render, as SQL did — Phase 52 (ADR-QD-165)

- ✓ ARCH-100 One module owns "the value a leaf compares" (OPND-01..05): package-private, import-free `Operand.ts` (`ownValue`, `isOwnKey`, `getByPath`) is the one own-property read of a decoded key, and every interpreter reads through it — `Walk`, `PortAccess`, `FieldPath`, `Decision`'s projection, `Predicate`'s `evaluatePredicate` row read, and the `attributeResolverFromRecord`/`customPredicateFromRecord` fixtures; `getByPath` stays public through `Matcher.ts`'s re-export, `isFieldOf` is gone. RED on the base: `evaluatePredicate` allowed `hasResourceAttribute("constructor", neq(...))` on a row `evaluate` denied, a fixture resolver answered `toString` from the prototype, and a fixture predicate died on an inherited name. A prototype-names agreement property ties `evaluate` to `evaluatePredicate ∘ toPredicate`. Class-instance rows now read inherited getters as absent (changeset states it). Mutation Operand.ts 31/31, Matcher.ts 0.9775 → 0.9749 with survivors unchanged (D-14 holds). ADR-QD-166 (extends 091/024), CCR-QD-444, BEH-QD-601..605, INV-QD-351..352, INV-QD-091 restated; `@qadi/core` patch — Phase 53

- ✓ ARCH-101 LeafNeeds turns every leaf's answer into a verdict (VERD-01..04): package-private `LEAF_VERDICTS` in `LeafNeeds.ts` is one closed per-tag record (`satisfies LeafVerdicts`, read through `isHeld`) holding every leaf's answer-to-verdict step, acted polarity included; `Walk` keeps only its deny sentences (`ACTED_DENIAL`, `RELATIONSHIP_DENIAL`, `SIGNATURE_DENIAL`) and `toPredicate` only constant folding, `AskActed` no longer carries `wanted`. Decisions and sentences byte-identical; no export changed (935) — Phase 54, ADR-QD-167

- ✓ ARCH-102 A port card is a model row, not a view join (CARD-01..05): pure `portCards` in `@qadi/devtools`' `model/PortCards.ts` returns a closed `ServicesView` (`Withheld | NotHanded | Failed | Read`), one `PortCardRow` per wired port with state, activity, consequence voice and a `CallsView` (`Hidden | Uncollected | Listed`, newest five plus `earlier`); activity and calls are `{ [K in PortName]: … }` records built by `tabulatePorts`, so a misspelt port is a compile error (`PortCards.tst.ts`). `DockModel.services` is the ninth store, recomputed only when one of its four inputs moves; `ServicesPanel.tsx` maps tags to JSX and computes nothing (INV-QD-356). Markup byte-identical (16-cell characterisation written on the base). Breaking: `PortActivity.port` is `PortName`, `portActivity` reads one entry per registry port. Mutation DockModel 145/145, Wiring 48/48, PortCards 126/126 (D-15) — Phase 55, ADR-QD-168

- ✓ ARCH-103 The gate-registry watch is the dock model's third feed (GFED-01..05): package-private `GatesFeed.ts` (`makeGatesFeed`, an `Effect.fn` built in the caller's scope) owns both host inputs of the questions panel: the gate-registry watch (guarded reads, name+message failure key, re-subscribe on identity change or after a failed watch, release in a finalizer) and the `questions` thunk (read on its own cadence, compared with `Equal.equals`). `DockModel` composes three feeds through a pure `rejoin`. A throwing thunk is `QuestionsView.Failed` and the diagnostics poll stays `Live` (INV-QD-358). Breaking: `questions` is a dock input and `useDevtoolsFeed` returns it at the top level (ADR-QD-169, Phase 56)
- ✓ ARCH-104 `untrustedDecoder` states an envelope's unknown-key policy (KEYP-01..05): a required, closed `unknownKeys: "refuse" | "ignore"` read through an own-key `PROJECTION` table; `ignore` projects the input onto its declared top-level keys (derived once from `SchemaAST.toEncoded` in package-private `EnvelopeKeys.ts`, refusing an underivable, index-signature or rest schema at build) before the depth guard, so an unknown key is never walked. Both `SinkCodec` envelopes use `ignore` and lose their hand-written readers (`UNTRUSTED_DECODE_BUDGET` 2 → 1); the audit row, archive, hydration, policy and port seams state `refuse`. A deep unknown record key now decodes (D-01, D-20), a deep `environment` is `TooDeep` (D-18), stored-envelope messages are the strict decoder's (D-17). Breaking: the option is required (ADR-QD-170, Phase 57)
- ✓ ARCH-105 A stored record is its envelope in memory too (STOR-01..04): `StoredRecord` is one `Data.Class<{ environment, record: SinkRecord }>`; `Stamped`, `StoredDecisionRecord`, `StoredObligationRecord` and `stampRecord` are deleted with no alias; `sinkRecordOrder` orders a record and `storedRecordOrder` maps onto it; the stored codec is the record codec plus one field, with byte-identical goldens; the log's two unreachable `isolate` catches and test C4 are deleted (owner choice D-12); devtools' timeline ingests the envelope; Breaking in `@qadi/core`, `@qadi/http` and `@qadi/devtools` (ADR-QD-171, Phase 58)
- ✓ ARCH-106 Admission produces the one walk environment (WENV-01..04): `admit(question, rowSource)` returns `Admitted<Source>` holding the row source, policy, subject, `supplied` (one closed `SUPPLIED` table typed per row source), matcher context and `maxDepth`; recursion is `evaluateNode(policy, request, depth)`, so a depth/maxDepth swap no longer compiles (tstyche); a `"row"` environment cannot reach the walk; four interleaved benches passed (0 of 35 slower each); mutation held (D-15); no public change — v1.6, Phase 59 (ADR-QD-172)
- ✓ ARCH-107 Devtools' headless interface is the feeds (HDLS-01..04): `@qadi/devtools`' root exports `makeTimelineFeed`, `makeDiagnosticsFeed` and `makeGatesFeed` (owner: pursue, all three public) and retires `makeTimelineStore`/`runSource`/`makeDiagnosticsStore`/`runDiagnostics`; one non-generic `DiagnosticsOptions { layer?, collector?, intervalMillis? }` replaces both option shapes; the README's headless example uses the feeds with stop detection; **Breaking** in a changeset and `upgrading.md` 0.13 (unreleased); mutation held (D-10) — v1.6, Phase 60 (ADR-QD-173)
- ✓ ARCH-108 A `DecisionCache` is asked only the question (CASK-01..04): `getOrCompute(question, options?)` with `options` a `Pick<EvaluateOptions, "concurrency">` replaces `getOrCompute(question, compute)`, and `decisionCacheLayer` walks the question it is given, so no caller can store a trace under a question it does not answer (owner: pursue, not sealed — the guarantee covers callers, a host cache wraps `decisionCacheLayer()`); `concurrency` reaches the walk and never the key; **Breaking** for `DecisionCacheShape` implementers in a changeset and `upgrading.md` 0.13 (unreleased); `SharedComputation` unchanged; mutation held (D-06) — v1.6, Phase 61 (ADR-QD-174)

- ✓ ARCH-109 Type pins that can fail (PIN-01..05): tstyche compiles under its own `tsconfig.tstyche.json` (`tsconfig.test.json` with the Effect language service's `floatingEffect` off, held to only that difference by `[tstyche-plugin-drift]`), so a negative `toBeCallableWith`/`toBeConstructableWith` pin on an `Effect`- or `Stream`-returning subject can fail; `FloatingEffectPins.tst.ts` pins tstyche's reading in three blocks; the `DecisionLog` pin states its refusal through `Parameters<typeof makeDecisionLog>[0]`; every negative pin has a same-subject positive twin (`[not-callable-control]`) and a one-off flip sweep saw all 87 fail; `NOT_CALLABLE_PIN_BUDGET` counts them per file in both directions against AGENTS.md §6; `pnpm test:tstyche` runs `scripts/run-tstyche.mjs`, two passes cross-checked against `--listFiles`; no `packages/*/src` change — v1.7, Phase 62 (ADR-QD-175)

- ✓ ARCH-110 The packed-install gate probes every new public name (PROBE-01..05): gate 14's consumer compiles `makeGatesFeed`, `makeDiagnosticsFeed` and the type-only `DecisionCacheShape` through the packed `exports` map, calls every `make*Feed` the packed devtools root exports and fails on one left uncalled, and refuses a vacuous probe through a parse-checked guard (`REFUSED_SHAPE_PROBES`, `TYPE_ONLY_PROBES`); ADR-QD-033 amended, CCR-QD-454 — v1.7, Phase 63
- ✓ ARCH-111 One throwing listener cannot silence the rest (LSTN-01..04): devtools' `ExternalStore` calls every listener and rethrows after the last (D1), shared by the three feeds and `useStoreSnapshot`; dock characterisation files unchanged; `@qadi/devtools` patch — v1.7, Phase 64 (ADR-QD-177, CCR-QD-455)
- ✓ ARCH-112 Only `admit` builds an `Admitted` (ADMT-01..04): a private constructor pinned by tstyche (TS2673/TS2741), and the `"asked"` row's resource flag derived from its matcher context; bench 0 of 35 slower — v1.7, Phase 65 (ADR-QD-172 amended, CCR-QD-456)
- ✓ ARCH-113 The decoder reads only what it declares (DECL-01..04): `untrustedDecoder`'s `ignore` projection reads only declared keys (D4, a getter on an undeclared key is never invoked), and hydration's `refuse` policy is recorded (D2); bench geomean −2.13%; `@qadi/core` patch — v1.7, Phase 66 (ADR-QD-170 amended, CCR-QD-457)
- ✓ ARCH-114 No equivalent mutants, no magic race bound (MUTE-01..04): `DecisionCache` eviction rewritten with no branch that cannot be taken (FIFO order and capacity validation unchanged), `SharedComputation`'s claim arms a closed table (CCR-QD-458 measured it against the hoisted `Match`), and the I5 race test iterates until both orderings are seen at every budget instead of asserting `gap <= 48`; mutation held — v1.7, Phase 67 (BEH-QD-166, INV-QD-379)
- ✓ ARCH-115 Hygiene and recorded close-outs (HYGN-01..07): over-width lines and stale titles fixed, ADR-QD-174 line 73, port cards stay package-private (D3, ADR-QD-173 amended), the Phase 61 scan's `Simulator.test.tsx` gap evidenced, OI-01..29 each closed or recorded, Phases 62–67 re-verified, bench of record vs `3d66becb` — v1.7, Phase 68 (CCR-QD-459)
- ✓ DEBT-01..06 The v1.7 audit's fixable debt (inserted Phase 68.1): `ab.sh` refuses an odd or short round count, `analyze.mjs` exits 0/1/2 with its self-test as `pnpm check` step 26, corrected staleness and type-aware comparison scripts re-checked all of Phase 68's verdicts (none flipped), gate 14's probe-guard parse runs in a time-limited child, and all eight phases carry validated Nyquist records — v1.7, Phase 68.1 (ADR-QD-033 Rev 1.6, CCR-QD-460)
- ✓ ARCH-116 One total thrown-value-to-message module (THRW-01..05): `@qadi/core` exports `thrownMessage` and `causeMessage`, total over a hostile value (throwing getters, proxies, an unrenderable cause fall to the fixed words); six inline copies in core plus the copies in http, react and devtools read through them, one `Cause.pretty` call left; a `null` capture cause records `"null"` — v1.8, Phase 69 (ADR-QD-182, INV-QD-383/384, BEH-QD-681..685, CCR-QD-461)
- ✓ ARCH-117 Hydration's drop events come from its buckets (DRPE-01..05): each entry drop is collected in a reason-keyed record (`DropBuckets`, total over core's reason unions, a missing key a compile error) and `EntriesDropped`/`LeftOut` are derived from it by `dropEvents`; the whole-payload refusal reason comes from a producer record and its checked inverse instead of a hand-written `Match`; events, order and counts unchanged (32-row characterisation) — v1.8, Phase 70 (ADR-QD-183, ADR-QD-152 amended, INV-QD-385/386, BEH-QD-686..690, CCR-QD-462)
- ✓ ARCH-118 Developer-signal reporters resolved through one table (SIGR-01..05): `SIGNALS`, total over every `DeveloperSignal` tag (a missing row a compile error), states each signal's condition, frequency, per-entry-point resolution time and option name; `reporterFor` is the one resolver, `contain`, `once` and `holdsHere` each written once; a throwing `onIdCollision` reporter is now named `onIdCollision`; the process-wide latch is the one module-scope binding, held by `MODULE_STATE_BUDGET` — v1.8, Phase 71 (ADR-QD-184, ADR-QD-041/052/033 amended, INV-QD-387/388, BEH-QD-691..695, CCR-QD-463)
- ✓ ARCH-119 A derived store behind the dock model's stores (DERV-01..05): `ExternalStore.ts`'s package-private `makeDerivedStore` owns key equality over every own enumerable string-keyed key field (an optional key field and a compute reading outside its key refused by type), commits the key only after compute returns, notifies once, stops when its scope closes and on close releases every parent even when a release throws, then rethrows; the dock model's diagnostics, questions and services stores are built with it and `DockModel.ts` keeps no last key or closed flag; the store list is stated once in BEH-QD-700 and pinned by a set test; `DockModel.ts` mutation score stays 1 — v1.8, Phase 72 (ADR-QD-185, ADR-QD-047/162/168/169 amended, INV-QD-389/390, BEH-QD-696..700, CCR-QD-464)
- ✓ ARCH-120 One pure reconcile for gate registration (RECN-01..05): `GateWriter.ts`'s package-private `reconcile` takes the live registrations and the wanted identities and states as maps keyed by gate id and makes every register, update and unregister call in one pass (live pass first, so a changed identity keeps its id); it never mutates `live` and relies on the writer contract stated on `GateWriter` (`register`, `update`, `unregister` do not throw), which `buildGateRegistry` keeps and tests on the real registry pin; `useGateRegistrations` keeps one ref, the writer-keyed teardown and one registration effect, with no `states.join` diff and no paired `Record.values`; the update half is tested without rendering; 19-row characterisation unchanged — v1.8, Phase 73 (ADR-QD-186, ADR-QD-140/111/103 amended, INV-QD-391/392, BEH-QD-701..705, CCR-QD-465)
- ✓ ARCH-121 The simulation session's policy choice split from its runs (CHSE-01..05): `@qadi/devtools`' package-private `SeededChoice.ts` is a pure, immutable module that owns the seeded choice — the pin-only-when-unseeded rule, the orphan rule, one menu list its reverse lookup reads (menu order written once) and the same-policy no-op; a transition that changes nothing answers its input reference; `SimulationSession.ts` keeps one `let choice`, its form and its runs, writes the draft only in `writeDraft`, and clears the run only in `clearRun`, called from `reseed`, `choosePolicy` and `setPorts`; `PolicyChoice`, `PolicyMenu` and `PolicyMenuOption` are declared there with names and shapes unchanged; the choice rules are tested as plain values; 35-row characterisation unchanged, held to its first commit by a script — v1.8, Phase 74 (ADR-QD-187, BEH-QD-460/466 and INV-QD-107 amended, INV-QD-393/394, BEH-QD-706..710, CCR-QD-466)
- ✓ ARCH-122 A declared span shape for the evaluate family (ESPN-01..05): `@qadi/core`'s package-private `EvaluationSpan.ts` declares every span of the family once — `qadi.evaluate`, `qadi.toPredicate`, `qadi.guardHealthCheck`, `qadi.decideSubject`, `qadi.decideSubjects`, `qadi.decideSubjectsStream` — with its name, question and answer built by `spanStruct`, and the denial log line as a log event no span-writing function accepts; a failed evaluate span carries its question (annotated before the lookup), and the outcome sits under one key, `qadi.outcome` (`Allow`/`Deny`/`Failed`), on every decided or typed-failure path, with `qadi.decision` removed (breaking, `@qadi/core` minor changeset, 0.13 upgrade section); an interrupted or defected evaluation carries its question and no outcome; the four writers hold no hand-typed key, and `[span-key-source]`/`[span-key-literal]` with `SPAN_KEY_LITERAL_BUDGET` keep test literals to budgeted goldens; 33-row contract held to its first commit by a script; cost +9.17% geometric mean (about 0.3–0.9 µs per call), recorded, not gated — v1.8, Phase 75 (ADR-QD-188, ADR-QD-051 and ADR-QD-109 amended, INV-QD-395/396, BEH-QD-711..715, CCR-QD-467)
- ✓ ARCH-123 Remedies uses core's signature match (SIGM-01..05): whether a fixture row meets a `hasSignature` or `hasActed` leaf is `@qadi/core`'s answer — `signatureAnswerFromSignatures` and `actedAnswerFromEvents` share one lookup and one answer rule with the fixture port read, and `SignatureMatch.ts` stays package-private; devtools' remedy table asks core instead of restating the match, and runs every requirement through one guard so it skips with a sentence for any form value; the fixture lookups, both judgements and the port reads over them fail typed for any value (one guarded read in core, `readGuarded`/`readRows`, a total `brandOf`), with `SignatureHistoryUnavailable.subjectId` and `DecisionHistoryUnavailable.event` optional (breaking, `@qadi/core` and `@qadi/http` minor changesets, 0.13 upgrade section); `ActedEvent`, `ActedAnywhere` and `ActedAnywhereInput` removed; the custom-predicate refusal is one sentence, `NO_CUSTOM_PREDICATE_FIELD`; agreement tests (1184 signature, 144 acted cases) held to their first commit by a script; api-surface 940 — v1.8, Phase 76 (ADR-QD-189, ADR-QD-058 and ADR-QD-094 amended, INV-QD-397/398, BEH-QD-716..720, CCR-QD-468)

- ✓ ARCH-124 An audit row is a value only its codec makes (AROW-01..06): `AuditEntry` is a nominal `Data.Class` exported type-only, made only by `encodeAuditEntry`/`decodeAuditEntry`, frozen one level, and recorded in a package-private `WeakSet` (`CodecMade.ts`) so `archiveAuditTrail`, `verifySequenceIntegrity`, `planRetention` and `planPurge` refuse a row the codec did not make at run time too (an `any`-typed or JavaScript caller included); the writer refuses a non-finite `now`, a bad or non-list `keyMaterial` (read once, projected to `{ keyId, algorithm, publicKey }`) and a non-list `entries`, so every archive it returns is read back by `readAuditArchive`; `decodeAuditEntry` reads the envelope first with `record` unwalked; `ArchiveInputInvalid`/`RetentionInputInvalid` carry closed `ArchiveInputRefusal`/`RetentionInputRefusal` tagged enums; `isSequenceNumber`, `SequenceNumberInvalid` and retention's `undated` removed; `scripts/check-api-surface.mjs` reads a local `export type { X }` list; breaking `@qadi/audit` minor changeset, 0.13 upgrade rows; api-surface 942 — v1.9, Phase 77 (ADR-QD-190 with three review amendments, ADR-QD-110 and ADR-QD-056 amended, INV-QD-399/400, BEH-QD-721/722, CCR-QD-469)
- ✓ ARCH-125 `TimelineStore` owns its capacity (TRSZ-01..04): `TimelineStore` has a `resize(capacity)` command that validates through `emptyTimeline` before moving anything, does nothing for the same effective capacity, empties the timeline at the new bound, releases the pause and notifies once; `clear` empties at the store's current bound; `makeTimelineFeed` returns its one store, so the host's store keeps its identity across a capacity change and the six-member forwarder, the mirror `view` store, the `push` listener and the subscription left on a dropped store are deleted; `idleTimeline` gains `resize`; a refused capacity leaves the feed and the dock unchanged (the dock applies a capacity whole or not at all, and a listener's throw still applies the rest of the update before it rethrows, ADR-QD-177); `bound` returns the given timeline when the kept entries are the held ones, so a replayed or evicted record costs no render; `useTimelineStore` resizes its hand-fed store from a layout effect; breaking `@qadi/devtools` minor changeset, 0.13 upgrade section; api-surface 942 — v1.9, Phase 78 (ADR-QD-191, ADR-QD-137 amended, INV-QD-401/402, BEH-QD-726..730, CCR-QD-470)
- ✓ ARCH-126 Feeds and the dock model take inputs only through `configure` (CONF-01..06): `makeTimelineFeed`, `makeDiagnosticsFeed`, `makeGatesFeed` and `makeDockModel` take no parameter, and `configure` is the only way inputs arrive (a bare build starts no read and shows what the empty input showed); one per-field identity rule, `ExternalStore`'s `sameFields`/`sameFieldsOrAbsent` over `Required<…>` normalisers, decides whether an input moved, so a new field cannot compile uncompared, and the gates feed's retry of a failed watch is the one stated exception (retried once per host commit, pinned); the dock has no guard of its own and hands its inputs to each feed through `feedInputsOf`; one package-private hook, `useConfigured`, builds in a scope and configures with the latest inputs, used by `useDockModel`, `useTimeline` and `useDiagnostics`; `UseDockModelInput` is gone and `DevtoolsDockProps extends DockModelInputs`; the dock's first-render sequence is held by a characterisation written on the base; gate 14 pins the bare constructors; breaking `@qadi/devtools` minor changeset, 0.13 upgrade section; api-surface 942 — v1.9, Phase 79 (ADR-QD-192, ADR-QD-137/173/185 amended, INV-QD-403/404, BEH-QD-731..735, CCR-QD-471)
- ✓ ARCH-127 The highlight lens is a headless session; `QadiContextValue.instrument` resolved (LENS-01..05): a package-private `LensSession` in `model/` (a closed `Idle`/`Picking` snapshot, commands toggle, hover, choose, cancel, highlight and a one-shot `takeReveal`, no `clear`; a no-op publishes nothing) holds every lens rule under the mutation gate (52/52); the dock model owns it as its tenth store and no `configure` touches it; `useLens` is only the document adapter (three effects: draw, listeners added while picking and reading the guards at event time, an unmount exit that cancels), and the panel takes the lens as a required prop with one subscription to each store; the pick survives a tab round trip and reveals its row once, highlight while picking ends picking, a keyboard click is placed by its control, a click that made a pick stays swallowed when a subscriber throws; `QadiContextValue` is `atoms`, `registry` and `gates` (Breaking `@qadi/react` minor, 0.13 upgrade section), the provider's `instrument` prop unchanged — v1.9, Phase 80 (ADR-QD-193; ADR-QD-047/111/185 amended; BEH-QD-736..740, INV-QD-405/406, CCR-QD-472)
- ✓ ARCH-128 The dock model applies every input whatever a listener throws (COLL-01..06): a package-private `callAll(calls, message)` in `ExternalStore.ts` is the one collect-and-rethrow rule (none thrown → return; one → rethrown as itself, `undefined` and `null` included; two or more → one `AggregateError` in call order, never flattened) and every multi-call command in the model runs on it: listener notification, the derived store's release, `TimelineFeed.configure` and `DockModel.configure` (seven steps, each reading the held inputs when it runs). The sightings rail is the dock model's fourth derived store, so the record path and a capacity-and-catalogue `configure` move it once; the timeline read, the diagnostics poll and the simulation run start whatever a listener throws on the status that announces them (`try { publish } finally { fork }`). ADR-QD-194, CCR-QD-473; `@qadi/devtools` patch — v1.10, Phase 81 (2026-11-25)
- ✓ ARCH-129 `QadiProvider`'s registry has one owner for its lifetime (LEASE-01..05): a package-private `RegistryLease.ts` (a closed `Unheld | Held | Releasing(cancel)` lease with an injected defer, two `Match.tagsExhaustive` matchers built per lease) decides the provider registry's lifetime and is mutation-gated (28/28); `QadiProvider` keeps one registry for its whole life, never clears its ref, holds the lease in its last effect and, a macrotask after the last cleanup, recycles in place (`registry.reset()`, then the latest committed subject written in a `finally` from a ref written in an effect) instead of disposing, so a provider hidden in `<Activity>` longer than a macrotask and shown again never reaches a disposed registry; `initialValues` and hydration seeds seed construction only and are never re-applied; the reveal's first frame after a subject change made while hidden reads the last committed subject (LT6); a host subscription held on the registry is detached by a recycle; LT1..LT18, RL1..RL10. ADR-QD-195, ADR-QD-014/148/149 amended, BEH-QD-746..750, INV-QD-409/410, CCR-QD-474; `@qadi/react` patch — v1.10, Phase 82 (2026-11-25)
- ✓ ARCH-130 The diagnostics feed folds its reading as a value (DIAG-01..04): the package-private diagnostics store is gone; the feed holds its reading only in its one published snapshot, folded through a pure `foldReading(previous, next)` in `Diagnostics.ts` (renamed from `DiagnosticsStore.ts`), one per-field keep-if-equal rule through `sameFields` that returns `previous` itself when nothing moved; `runDiagnostics(sink: DiagnosticsSink, options?)` takes a one-member `{ accept }` sink whose order is the `runs.isCurrent(token)` guard, the fold, `sampled = true`, then `Live`; `off()` stops the run and publishes the off state with no store replacement; `Diagnostics.questions` removed (the poll never sampled it) while `DiagnosticsReading.questions` and the dock's questions join are unchanged; `foldReading` and `DiagnosticsSink` stay off both barrels. Characterisation FC1..FC11 born before the change, SR1 (a superseded sample does not mark the feed sampled), MR1/MR2, the raw-sample four-field pin; mutation DiagnosticsFeed 59/59, Diagnostics 32/32, DockModel 65/65, no new Ignored. ADR-QD-196, ADR-QD-173/169/047 amended, BEH-QD-751..755, INV-QD-411/412, CCR-QD-475; `@qadi/devtools` Breaking minor — v1.10, Phase 83 (2026-11-25)

- ✓ ARCH-131 `useConfigured` requires `configure`, and the review's small finds (ADPT-01..05): `useConfigured(make, inputs)` takes a value that has its own `configure`, through a package-private `Configurable<I>` whose `configure` is a function property (checked contravariantly), so the three identical adapters `configureDock`, `configureTimeline` and `configureDiagnostics` are deleted and the three hooks call it with no type argument; `useConfigured.tst.ts` pins the three values and four refusals, each beside its accepted twin, the fourth refused by the property form alone; `LensSession` publishes every command through `ExternalStore.set` (`move` deleted) and `choose` still arms its reveal before it publishes; `useLens(lens, questions): UseLens` subscribes the questions store first and the lens second, draws from its own subscription, reads the store at event time and writes no ref, and the panel makes the one call; the dock's two stop notices come from one `useStopNotice` hook and one `StopNoticeProps<S>`, one ledger per feed; `useTimeline`'s per-render inputs record is a recorded rejection (ADR-QD-197). Characterisations LQ1..LQ4, DS1..DS3, TI1..TI3 born on the base; mutation LensSession 52/52 -> 47/47 (the deleted `move`'s mutants), no new Ignored. ADR-QD-197, ADR-QD-192 and ADR-QD-193 amended, BEH-QD-756..760, INV-QD-413/414, CCR-QD-476; `@qadi/devtools` patch, no export changes — v1.10, Phase 84 (2026-11-25)

### Active

v1.11 Arch Wave 16 requirements: see `.planning/REQUIREMENTS.md` (Phases 85–91, ARCH-132…138).

### Out of Scope

- Re-opening any ADR in 077–107 except ADR-QD-094, which Phase 8 amends under an explicit
  human checkpoint.
- Changing AGENTS.md budgets: UNTRACED_BUDGET, SWITCH_BUDGET, ANY_BUDGET, SCHEMA_ERROR_BUDGET,
  HAS_CUSTOM_BUDGET, DECISION_READ_BUDGET. Each needs a benchmark or an ADR. A phase that
  changes a budgeted count updates the table and the budget together, in the same plan.
- Formatting with `oxfmt` (AGENTS.md §17).
- Splitting the Port* family files that exist to break madge import cycles (ADR-QD-037), i.e.
  PortInterpreter, PortSpanDecode, PortSpanEncode and PortKey.
- The audit `*PortTest` doubles. Core's PortDoubles registry is closed, so they stay
  hand-written. (Revisited in v1.1 Phase 14: scripted, still not registry ports.)

## Context

- **Numbering reserved for v1.1 (Wave 6).** Next free on `1721a42`: ADR-QD-117, CCR-QD-395, BEH-QD-339, INV-QD-245.
  Executors grep `spec/` before using a number; an unused reservation is stated in the phase SUMMARY.

  | Phase | ARCH | ADR-QD | CCR-QD | BEH-QD | INV-QD |
  |---|---|---|---|---|---|
  | 10 | — | — | — | — | — |
  | 11 | 59 | 117–118 | 395–396 | 339–348 | 246–249 (245 is a lost-wave id; never use) |
  | 12 | 60 | 119–120 | 397–398 | 349–358 | 250–254 |
  | 13 | 61 | 121–125 | 399–403 | 359–378 | 255–264 |
  | 14 | 62 | 126 | 404 | 379–388 | 265–269 |
  | 15 | 63 | 127 | 405 | 389–398 | 270–274 |
  | 16 | 64 | 128 | 406 | 399–408 | 275–279 |
  | 17 | 65 | 129 | 407 | 409–418 | 280–284 |
  | 18 | 66 | 130 | 408 | 419–428 | 285–289 |
  | 19 | 67 | 131 | 409 | 429–438 | 290–294 |
  | 20 | 68 | 132 | 410 | 439–448 | 295–299 |

- **House rules:** `AGENTS.md` is authoritative. That means submodule namespace imports from
  `effect/*`, `.ts` relative imports, `Context.Service` with a separate `…Shape`, top-level
  layer consts, `Data.TaggedError`, `Effect.fn`, `Match` rather than `switch`, and no `as`, `!`
  or `any`.
- **Merge gate:** `pnpm check` and nothing else. During development, use `pnpm check:pr`,
  which skips mutation testing. A phase is done only when `pnpm check:pr` is green.
- **Spec is normative** (AGENTS.md §11). A change to public behavior updates in the same
  change: the behavior doc in `spec/behaviors/`, `spec/invariants.md`, `spec/traceability.md`,
  the Document history register and change history in `spec/README.md` (a CCR row), a new ADR
  in `spec/decisions/` plus `spec/decisions/index.yaml`, `spec/overview.md` (gate 13,
  `check-api-surface.mjs`) for any export that is added or removed, and a `.changeset/*.md`
  entry.
- **Numbering reserved for this wave.** The executor must confirm each number is still free
  by grepping `spec/` before using it:
  - ARCH ids: ARCH-46 (Phase 1) to ARCH-54 (Phase 9), in phase order.
  - ADR ids: ADR-QD-108 (Phase 1) to ADR-QD-116 (Phase 9), in phase order. A phase that
    turns out not to need an ADR (only a CCR) leaves its number unused and says so in its
    SUMMARY.
  - CCR ids: CCR-QD-385 (Phase 1) to CCR-QD-393 (Phase 9). The highest CCR in use on
    2026-11-08 is CCR-QD-384.
  - ADR Document IDs must equal the file number (`verify-traceability.sh`, gate 10).
- **Hot spots** (churn over the last 15 commits): react `QadiAtoms`/`Hydration`/`hooks`; http
  `RequirePermission`/`DecisionStreamRoute`; core `SinkCodec`/`Evaluate`/`PortAccess`.

### Known Issues (carried forward from v1.10)

- The v1.10 audit (`.planning/milestones/v1.10-MILESTONE-AUDIT.md`) is `passed`. It records what was left by decision:
  - each phase's record scripts judge the tree against that phase's own base, so a later phase's committed change shows
    in an earlier phase's `pinned-check` or `scan-forbidden` (all such reports at the close were traced and explained);
  - `src/react` stays outside every Stryker config (Phase 84's hooks are held by component tests and coverage), and
    `QadiProvider.tsx` is outside the react mutate list; QuestionBook keeps the base's two surviving mutants;
  - Phase 83 accepted two low threats; no milestone-level Stryker run was made.

### Known Issues (carried forward from v1.9) — unchanged in v1.10

- The v1.9 audit (`.planning/milestones/v1.9-MILESTONE-AUDIT.md`) is `passed`. It records what was left by decision or
  can only be checked by hand:
  - where a keyboard click (Enter or Space on a focused guard) lands while picking is checked in happy-dom only; a
    real-browser pass is manual;
  - the React 19.2.4 peer floor is not exercised (the repo installs 19.3.1);
  - `QadiProvider` keeps its `instrument` prop by decision (ADR-QD-193): the prop decides whether a guard registers,
    and a component that needs the flag is passed the host's own;
  - Phase 78's mutation record predates Phases 79 and 80's edits to `TimelineFeed.ts` and `DockModel.ts`; each file was
    re-measured at the later phase's close, and no milestone-level Stryker run was made.

### Known Issues (carried forward from v1.8) — unchanged in v1.9

- The v1.8 audit (`.planning/milestones/v1.8-MILESTONE-AUDIT.md`) is `passed`. It records what no change can undo or what
  was left by decision:
  - a policy leaf built untyped with a symbol event would throw in Remedies' `requirementLabel`, outside `readForm`; a
    decoded policy cannot hold one, and the totality rule (BEH-QD-719) covers form values;
  - the sibling fixture ports (attribute, relationship, custom predicate) may carry the same latent throw for values
    only an untyped caller can pass; the rule for them is decided where their fixtures live;
  - history: three commits that opened the milestone (`5e68b104`, `91d1b6ed`, `1666b620`) lack the trailer; the two
    milestone-close test changes (`a4741601`, `5640572d`) sit outside any phase's CCR row, and the audit is their
    record.

### Known Issues (carried forward from v1.7) — unchanged in v1.8

- The v1.7 re-audit (`.planning/milestones/v1.7-MILESTONE-AUDIT.md`) is `passed`; it records what no change can undo or
  what was accepted:
  - AR-68.1-01, closed 2026-11-22: a killed gate-14 child names its TypeScript server and the gate kills it (`b45e798a`);
  - the iteration-3 review fix had its fourth review pass on 2026-11-22: 3 warnings and 6 info, eight fixed
    (`b45e798a`, `7923af0e`), one kept (the revision dates);
  - history: commit `0378aad7` lacks its trailer and Phases 62–64 carry Sonnet 5.5 trailers (OI-26); Phase 62 SUMMARYs
    use `requirements:`; Phase 68's bench of record ran 3 rounds (now refused).

### Known Issues (carried forward from v1.6) — all resolved in v1.7 (Phases 62–68)

- The v1.6 audit (`.planning/milestones/v1.6-MILESTONE-AUDIT.md`) is `tech_debt`, accepted by the user:
  - gate 14 (`check-package-install.mjs`) probes only `makeTimelineFeed` of the new public names; `makeGatesFeed`,
    `makeDiagnosticsFeed` and the type-only `DecisionCacheShape` are not compiled through the packed `exports` map;
  - a throwing `subscribe` listener is not isolated in devtools' `ExternalStore` (shared with the React dock), and
    `packages/core/test/DecisionLog.tst.ts:30` may carry a type pin that cannot fail (Phase 60) — resolved in v1.7 Phase 62;
  - Phase 59 follow-ups: derive the `"asked"` row's resource flag from the matcher context, and a private `Admitted`
    constructor so only `admit` can build one;
  - Phase 57's D-09 hydration ignore and IN-01, and Phase 58's over-width lines and test-title wording;
  - Phase 61: two pre-existing surviving mutants (`DecisionCache.ts` eviction, `SharedComputation.ts` `"Claimed"`) and
    the I5 race test's `gap <= 48` bound, which depends on `walk`'s step count.

### Known Issues (carried forward from v1.5)

- The v1.5 audit (`.planning/milestones/v1.5-MILESTONE-AUDIT.md`) is `tech_debt`, accepted by the user:
  - plan-local ids (BRKR-, EMIT-, PFCT-, GATE-04, bare D-NN) remain in test titles and comments from Phases 45–52, and
    ADR-QD-163/164 prose cites WX-05/ARTY-03; each needs the fitting BEH/INV/ADR id chosen per describe block;
  - "written on the phase base" survives in audit `AuditWriteOutput.test.ts` and predicate-sql `CompileShell.test.ts`;
  - Phase 52 IN-03 skipped on purpose: a duplicated refusal row and one oxlint `no-new-array` warning in predicate-sql's
    `CompileShell.test.ts`, kept byte-identical as before/after evidence;
  - D-06a (Prisma counts compiled after render) is pinned only by core's throwing-render case; the real trigger is a
    renderer stack overflow on ~3000-deep `Negate` chains.

### Known Issues (carried forward from v1.4)

- The v1.4 audit (`.planning/milestones/v1.4-MILESTONE-AUDIT.md`) passed with minor tech debt:
  - Phase 40's VALIDATION.md is `nyquist_compliant: false`: two 40-09 checks failed only on recorded plan-verify defects;
  - core `HydrationMetrics.ts` (which now holds `HYDRATION_DROP_TABLE`) is in no Stryker mutate list;
  - `SeededQuestion.ts` carries five equivalent surviving mutants moved from the base, and `QadiAtoms.ts` four (0.9);
  - Phase 41 changed one label against D-07's wording (an object whose `toJSON` gives nothing now reads as the fixed
    words, not `undefined`), recorded in ADR-QD-154 and BEH-QD-541;
  - attribution: executor and fixer commits carry `Co-Authored-By: Claude Sonnet 5.5`, and one 41-02 docs commit has no
    trailer, left as is because commit hashes are cited across the records.

### Known Issues (carried forward from v1.3)

- The tech debt the v1.3 audit accepted is listed in `.planning/milestones/v1.3-MILESTONE-AUDIT.md`. Its main items:
  - six manual checks never run in a real browser: Activity hide/show timing, notice contrast and the focus ring
    (Phases 34, 36), the late render commit at the bound under 6x CPU throttle (Phase 35), and seed assumption A1
    (selective hydration mounting a gate after the provider's first macrotask in a streaming Next render). Each has
    an automated proxy in happy-dom or the e2e;
  - UI reviews 20/24 (Phase 34) and 21/24 (Phase 36): Restart and the reason block keep the browser default ring on
    the amber background;
  - one named mutation survivor, `TimelineNotice.tsx:40:20` (React renders `null` and `undefined` identically);
  - attribution: 33 early commits on `arch-wave-8` lack the Opus 5.5 trailer (31 none, 2 Sonnet), left as is because
    commit hashes are cited across the records.

### Known Issues (carried forward from v1.2)

- The tech debt the v1.2 audit accepted is listed in `.planning/milestones/v1.2-MILESTONE-AUDIT.md`. Its main items:
  - 25 open info-level review findings across Phases 24–29;
  - Phase 25 WR-01 skipped (unreachable while `simulate` goes through `DecisionCache`);
  - `signatureHistoryFromSignatures` dies, rather than failing typed, on an untyped query with an unkeyable subject;
  - devtools `Inspector.tsx` (0.68) and `Simulator.tsx` (0.54) mutation scores are below the 80 break threshold;
  - `useSimulationSession` stays a public second entry point (design to confirm);
  - two Phase 24 spec items were acknowledged at close (the duplicate BEH-QD-219..221 blocks, and `Sources.ts` in traceability).
- `astro check` (gate 15, `pnpm website`) shows an interactive `@astrojs/check` install prompt, so `pnpm check:pr` must run with
  stdin closed (`< /dev/null`), which makes the website typecheck effectively skipped.
- `scripts/spec-revise.mjs` drops its document argument when `--date` is omitted; always pass `--date`.

### Known Issues (carried forward from v1.0)

- CI: the Node 26 matrix leg exceeds the 60-minute `timeout-minutes` during mutation on a full
  `pnpm check` (seen at c807b64 and 127d6fa); release PRs will hit it.
- ~~Devtools replay fail-open on four ports~~: closed in v1.1 (ADR-QD-129, CCR-QD-407); this line was stale until 2026-11-12.
- Open review findings, all warning or info: Phase 01 WR-02/WR-03/IN-03, Phase 02 IN-01..07,
  Phase 04 IN-01..03, Phase 05 WR-01/IN-01/IN-02, Phase 07 IN-01..03, Phase 09 IN-01
  (see each phase's `*-REVIEW-DISPOSITION.md` in the archive).
- `pnpm example` needs sudo on the Fedora dev host (`playwright install --with-deps`); use CI or
  the podman Ubuntu Playwright container route.
- Running vitest from inside a package directory fails at collection; run from the repo root
  with `--project`.

## Constraints

- **Tech stack**: Effect v4 (`effect@4.1.2`), TypeScript with `verbatimModuleSyntax`, `@effect/vitest`.
- **Coverage**: `packages/core` at 95% or more, every other package at 90% or more, enforced.
- **Mutation**: Stryker runs only on release PRs. Plans must not lower the mutation score for
  touched files, so they add tests at the new seam before deleting the old ones.
- **Compatibility**: a removed public export is a breaking change. Record it in the changeset
  as **Breaking** (package-scoped) and in `apps/website/.../reference/upgrading.md` when a
  consumer-visible name moves.
- **Security**: fail-closed. Never `Effect.orDie` on evaluation or enforcement paths.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| One phase per review finding | Each finding is an independent deepening with its own ADR, CCR and changeset, matching ARCH-NN practice | Accepted |
| Phase 1 first | It is the only finding with a live defect (a missing `SubjectExtractionFailed` log) | Accepted; shipped (Phase 1) |
| Phase 8 amends ADR-QD-094 behind a human checkpoint | Serving facts belong to the port, but ADR-094 kept non-behavioral data out of descriptions | Accepted (Phase 8, D-01 approved, ADR-QD-114); 08-05 skipped |
| `AuthorizeRequest.ts` leaves the barrel; `authorizeRequest`/`AuthorizedRequest` re-exported by name from `GuardApi.ts` | Keeps the module package-private (ADR-QD-099) with no export added or removed | Accepted (Phase 1, ADR-QD-108) |
| Signature request key includes the requirement (meaning, signerRole) | A store receives the requirement and may filter on it, so the key must be injective over it (INV-QD-043) | Accepted (Phase 2) |
| Devtools replay fails closed on an unseen signature request | An empty list would let `not(hasSignature)` show an allow the real store might not give | Accepted (Phase 2, WR-04); the other four ports closed in v1.1 (ADR-QD-129, CCR-QD-407) |
| The archive writer refuses a sequence number the reader cannot decode (`SequenceNumberInvalid`), rather than scoping BEH-QD-254's agreement to safe integers | Scoping would have written writer/reader drift into the spec; refusing at the writer keeps the agreement true and closes the gap check's `2 ** 53` blind spot | Accepted (Phase 3, WR-01, D-48-g); widens the failure union, so `@qadi/audit` takes a minor |
| The per-entry decision lookup lives in `useGates`, memoised on the group atom, rather than using the group atom as each entry's identity | No `QadiAtoms` member returns entry atoms (widening it would break), and group-atom identity would re-register every sibling when one entry changes (BEH-QD-068) | Accepted (Phase 4, D-03, ADR-QD-111); D-07 pin found no re-creation, so no `Equal`-keyed memo was added |
| No ADR for ARCH-50; reserved ADR-QD-112 left unused | The refusal policy's documented owner is still core's `reportEncodeRefusal` (ADR-QD-095 D-09-e); the http module only frames and applies it per route | Accepted (Phase 5, CCR-QD-389) |
| `tabulatePorts` is two overloads over one body; the separate layer builder and `mapPorts` are removed | One enumeration of the five ports instead of pass-through copies; overload 1 is checked at every call site | Accepted (Phase 8, D-07); `mapPorts` removal is Breaking |
| `PortRouteAddress.ts` is a leaf module, not part of `PortRoutes.ts`; no ADR for ARCH-52 (ADR-QD-114 stays reserved for ARCH-53) | The browser-bundled client must not import server route code; no export changes and ADR-QD-107's route design is unchanged | Accepted (Phase 7, CCR-QD-391) |
| The refusal vocabulary lives in a new public leaf `JsonRefusal.ts`, not in `JsonHazard.ts` | The moved names are public and `JsonHazard.ts` is package-private (ADR-QD-099); a leaf keeps the port wire off the sink wire | Accepted (Phase 9, ADR-QD-116) |
| The obligation record is projected before the handler runs | A handler reassigning `resource.id` must not change the record it is logged under (WR-01) | Accepted (Phase 9, dafe9e1) |
| Audit doubles are scripted per call, outside core's port registry (D-05, ADR-QD-126); each audit store call gets a 5 s overridable `storeCallTimeout` (route A, `A interrupt remove`) | A store call that never settled held the decision and kept the breaker `Closed`; eleven hand-written failing layers restated the ports' error shapes, and core's closed registry is for the five evaluation ports | Accepted (Phase 14, ARCH-62, CCR-QD-404); removing `failWith`/`failStageWith`/`failCommitWith` is Breaking; the buffered sink (route C) is deferred |
| The leaf→request mapping is stated once, on each port description (`asks`), not in the reads and the serving facet separately (D-05, `state once`) | The human overrode the planner's decision: "the recommendation should be the cleanest solution, not the simplest one"; two statements could disagree | Accepted (Phase 22, ADR-QD-134); `ServedLeaves` removed (public); review WR-01 fixed: one shared scope test (`ScopedLeaf.ts`) plus a law test (23e54421) |
| A missing resource id leaves only the port span on every scoped port (D-02 = `A`) | One trace shape, whichever copy of the check ran; the nested `qadi.requireScopedResourceId` span is gone | Accepted (Phase 22, ADR-QD-134) |
| A sink record's fields are one `Schema.Struct`; the class is a `Data.TaggedClass` typed by it, keys absent (23-01 = A/absent) | One field list instead of four; `Schema.TaggedClass` measured 5.3x to 140x per record on the evaluation path | Accepted (Phase 23, ADR-QD-135); small-record encode 5 to 10 percent slower, inherent to the spread |
| Source availability moved into `SimulationSource.ts` as an amendment to ADR-QD-050, not a new ADR (ADR-QD-136 unused) | The rule moved; no new decision was made | Accepted (Phase 24, CCR-QD-414) |
| A run reads its generation before its last teardown yield and returns if a command moved the session (review WR-01) | A ports change or replay during a superseded Live run's teardown must not start the waiting run with the old environment's capture | Accepted (Phase 24, 1ad24867); the replayed policy is held with its row (6c198da1) so `SimulationSession.ts` stays above its mutation base |
| A devtools session owns its runs through a `FiberHandle` in a `Scope` (25-01 = D, from `_DECISIONS-v1.2.md`) | A host that never forked `reap` left runs querying live resolvers; the scope's close and `supersede()` interrupt through one handle | Accepted (Phase 25, ADR-QD-137, supersedes ARCH-20 D-20-b); `SimulationSession.ts` mutation 0.9641 to 0.9694 |
| `useScoped` clears its value on cleanup and closes the scope when the build throws (review WR-02, WR-03) | A hidden `<Activity>` kept a child reading a closed session; a throwing build leaked its scope | Accepted (Phase 25, 0a6872c6, df588d1a); WR-01 (synchronous-settle race) skipped: no run lands synchronously while `simulate` goes through `DecisionCache` |
| The dock is one headless model (`makeDockModel` in a `Scope`), owned by React through one hook (Phase 26, ARCH-74) | Cross-store rules were reachable only by rendering six hooks and their layout effects; the model states them once, under the model's coverage and mutation bar | Accepted (Phase 26, ADR-QD-047 Rev 1.12); `DockModel.ts` mutation 100; a hidden `<Activity>` rebuilds the model (pause returns to live, backlog re-read), accepted per 26-UI-SPEC |
| `PolicyChoice` keeps `HeldChoice`'s arms by use, not a standalone type assertion (26-03) | `noUnusedLocals` rejects an unused assertion constant; `policyChoice` returning `chosen.resolve()` as a `PolicyChoice` already makes a new arm a compile error | Accepted (Phase 26, verifier and code review concurred) |
| `unguardedRoutes` and `RouteMethod` stay in a package-private sibling; `/__permissions` moves to `PermissionRegistryRoute.ts` (27-CONTEXT D-02, D-03) | One module holding all three would export the unguarded internals through the barrel (ADR-QD-099); keeping `/__permissions` in `PermissionRegistry.ts` closes an import cycle (ADR-QD-037) | Accepted (Phase 27, CCR-QD-417, ADR-QD-036 Rev 1.10); ROUTE-01/ROUTE-03 annotated in REQUIREMENTS.md as delivered by intent |
| A phase that deletes duplicated code keeps the aggregate mutation bar by killing the survivors the baseline already had (27-03) | Removing code shrank the mutant total by one while two known survivors stayed, so the aggregate dipped below base with every file at or above its own | Accepted (Phase 27, 010d9f1e: two span-name tests); `AuthorizeRequest.ts` 0.9 to 1.0, aggregate 137/139 to 138/138 |
| The gate write side is a React-free leaf below the registry; the hooks sit above the atom set (28-01 = A, from `_DECISIONS-v1.2.md`) | The reconcile rules were reachable only through `renderHook`; the review's uncorrected A (types into `GateRegistry.ts`) would publish `gateWriterFor` or close a cycle | Accepted (Phase 28, ADR-QD-140); GATE-03 annotated (types in the leaf, re-exported by the registry); mutation aggregate 0.8239 → 0.8502 |
| A survivor that surfaces in an untouched file after a split is killed with a test, not re-baselined (28-05) | Moving tests between `GateWriter.ts` and `useGate.ts` exposed a real `GateRegistry.ts` survivor (a stale handle's `update` after a same-id re-registration) | Accepted (Phase 28, 8fbd9f58) |
| A port's span union is derived from a leaf table, not from the descriptions (29-CONTEXT D-02) | Each annotated description's `span` type is the whole union, and the leaf cannot import descriptions without a cycle; the inverse derivation also narrows `span` to `PortSpanOf<N>` | Accepted (Phase 29, ADR-QD-094 amendment, CCR-QD-419); TIDY-01 annotated as delivered by the inverse derivation |
| Moving per-call literals to module-scope constants can lower a file's mutation score with nothing worse; close it with a test (29-03) | `ignoreStatic` drops the moved lists' killed mutants while survivors stay (`HydrationEngine.ts` 0.9619 → 0.9605) | Accepted (Phase 29, 94841eb0: a nameless payload with entries is refused whole); 0.9619 → 0.9693 |
| Untrusted JSON is decoded only through `untrustedDecoder`; the strict options and depth walk are private to core (Phase 30) | `PolicyFromJson` skipped the depth guard and raised a raw `RangeError` on deep input; eight seams assembled the recipe by hand | Accepted (ADR-QD-143, INV-QD-305/306); `[untrusted-decode]` budgets every strict-decode and `JSON.parse` token both ways |
| `SharedComputation` owns staleness through a closed claim `standing`, not `DecisionCache`'s generation counter (Phase 31) | Two owners of one rule; a clear mid-compute could let a superseded exit reach the cache | Accepted (ADR-QD-132 amended, ADR-QD-144 unused) |
| One sealed evaluation builder with a closed `EvaluationShadowing` and one `EvaluationClock` vocabulary (Phase 33) | Testing and devtools each sealed their own layer and spelled the clock differently | Accepted (ADR-QD-146); testing's `clock: "test"` and devtools' `SimulationClock` removed (Breaking) |
| The atom set owns its eviction sweep: an edge-triggered, deferred, once-per-episode sweep (Phase 35) | A spike ranked three mechanisms on six fixed criteria; this one has no timer, no fiber lifetime and one sweeper by construction | Accepted (ADR-QD-148, AGENTS.md §13 amended with the user's approval); `sweepIntervalMillis`/`sweepEvictions` removed (Breaking) |
| A refuted finding is a third disposition; DEBT-02 met by deleting the stale token, not adding one (D-17) | `Sources.ts` had been renamed `SimulationSource.ts`, already in the row | Accepted (Phase 36, CCR-QD-427) |
| A seed is held by its question; a registry holds only a keepAlive `SeedGrant`, and the `subject` keepAlive lands first (D-19) | The seed node was dropped one macrotask after hydration; holding it in the shared book entry would leak across server requests | Accepted (Phase 36, ADR-QD-149); one tiny node per hydrated entry, bounded by the payload |
| The seed covers the client's whole first check, in flight or not (D-20, the user's choice) | ADR-QD-039: `Initial` is the only state where this client has never answered; Pending would make the first render disagree with the server HTML | Accepted (Phase 36); the example's e2e pin is `Success,Success` |
| A false metric description is corrected even though the registry key changes (review WR-01, overriding the 36-10 ledger) | Compatibility is never the tiebreaker; the description claimed `toPredicate` reads were counted | Accepted (Phase 36, b3787bd9); `@qadi/core` patch changeset |
| A fork requested while another fork's start is running is held and installed when that start returns (D-07, the user's choice over research's "report") | A body whose synchronous prefix starts a newer run left the newest run interrupted and the store idle; holding one pending slot makes the newest run live with no doc rule for callers | Accepted (Phase 37, ADR-QD-150); one slot suffices because each `begin` supersedes the last |
| `stop` is one unconditional rule: supersede, then fork `Effect.void` (D-05) | The session's guarded stop and the feeds' unguarded one had drifted; a no-run stop changes nothing visible, and allocating a fiber is not forbidden | Accepted (Phase 37, ADR-QD-150 amends ADR-QD-137 point 3) |
| The read set and the write version stay separate ideas: `WIRE_VERSIONS` derives from `WIRE_VERSION`, and the decoder checks membership in the set (D-02, D-03) | A reader that keeps an older version lists it beside a schema for it, without touching what the encoder writes; `=== WIRE_VERSION` would fuse them | Accepted (Phase 38, ADR-QD-151 amends ADR-QD-096) |
| Core owns each drop reason's kind; react's payload and entry groups are read off core's table, and react's dispatchers stay untouched (D-06, D-09, D-10) | One table means a reason cannot be added without its kind and meaning; reshaping `HydrationEngine.ts` to make a new payload reason a compile error was left out because Phase 42 shares that file | Accepted (Phase 39, ADR-QD-152 touches ADR-QD-123 and ADR-QD-037) |
| A decode refusal is described once, in core; devtools passes core's refusal through and audit takes its JSON form from the one strict decode, counted in the budget (D-03 amended, D-05..D-11) | Three restatements of the mapping and two exhaustive reads outside core were the defect; the counted `decodeTo` keeps the untrusted-decode gate honest rather than dodging its regex with `encodeTo` | Accepted (Phase 40, ADR-QD-153; Breaking for `@qadi/devtools`; ~2.19× decode cost accepted) |
| One guarded value-to-text function and one label rule live in core, read by `explain` and the devtools panels (D-13..D-16) | Core's `explain` threw on the same bigint and cycle probes as the devtools remedy label, and core cannot import a devtools-private module (ADR-QD-099); a second guard or a second wording of the rule would drift | Accepted (Phase 41, ADR-QD-154; one label change for an object whose `toJSON` gives nothing, against D-07's wording) |
| A seeded question builds its own computing atom, in its own package-private module `SeededQuestion.ts` (option 1b) | The seed-to-evaluation link was split across `HydrationEngine.ts` and `QadiAtoms.ts` through a callback that received a callback, and was tested only with fakes; one module owning it, tested on a real atom runtime, removes the split without a second `Atom.readable` or a new dependency | Accepted (Phase 42, ADR-QD-155; user choice of 1b over 1a, 2 and 3) |
| A handed-over value is decided through one package-private module, and every entry point that hands over a value refuses a second resource by type (`resource?: never`) | `guard` and `filter*` took `EnforceOptions` and silently overwrote `options.resource`; overriding is a second form of the rule ADR-104 stated by refusal for the loaded entry points, and a dropped argument is a silent wrong answer | Accepted (Phase 43, ADR-QD-156; `LoadedEnforceOptions` renamed `HandoverOptions` with no alias; the facade refuses with `resource?: never`, not `Omit`, after review WR-01) |
| A hydration seed's fields are the wire's minus the withheld ones, stated once, and the Allow/Deny branch is one closed table | `rebuild` restated the wire's fields by hand, so a field core's wire gained compiled and was silently dropped from the seed; the branch was written three times | Accepted (Phase 44, ADR-QD-157; the deny-list default is guarded by a wire key-set pin tied to the engine's withheld lists, after review WR-01; `visibleFields` optional key is Breaking) |
| A breaker's generation and probe rules are one pure transition function, and an option that cannot work is refused when the layer is built | The generation guard and `generation + 1` were restated in five `Ref.modify` bodies, and a `NaN` threshold built a breaker that never opened, so a down audit store was hit on every record | Accepted (Phase 45, ADR-QD-158; `Duration.infinity` stays the store-call deadline's opt-out, user decision D-06a; bounds tightened to the safe integers after review WR-01) |
| A sink's failure is contained by the one emitter and reported there, once, naming the sink | `sinkEmitter` contained every failure silently, so a user-written sink lost records with no log; a `record` that threw before returning an effect made `evaluate` die; shipped sinks each logged their own copy | Accepted (Phase 46, ADR-QD-159; one `logWarning` and no metric, D-01; DecisionLog's `isolate` kept, D-11; one shared report in `SinkReport.ts` after review IN-01) |
| Whether a port's service is its fail-closed default is a mark the description's default carries, read by `isPortDefault`, and each port's reading is one devtools row keyed by `PortName` | Devtools parsed a `"<inner> (<suffix>)"` display-name convention, so a hand-written wrapper hid a fail-closed default; consequences and call-row readings were restated in three tables | Accepted (Phase 47, ADR-QD-160; unique symbol D-20; R6 row helper D-18; reader made total and the mark defined in place after review) |
| Audit reports core's `SinkRecordNotEncodable`, and whether an unwritten entry is lost is one closed row per staging variant that every reader derives from | Audit had its own refusal class (on a misreading of ADR-QD-054) and decided "lost" in three separate exhaustive matches that could disagree | Accepted (Phase 48, ADR-QD-161) |
| The gate registry is the dock model's eighth store, and the five gate-state words are one keyed table in core | `QuestionsPanel` joined questions with instances read at two different moments, and react and devtools each spelled the five states | Accepted (Phase 49, ADR-QD-162; a throwing registry is a stated `Failed` view after review) |
| What a leaf needs from the request is one package-private table that `Walk` and `Predicate` both read | Each interpreter restated INV-QD-011's absence checks and their order per leaf, and the order differed by leaf without being stated | Accepted (Phase 50, ADR-QD-163, after a measured bench gate: geomean +1.87%, worst +9.3% inside a 10% band) |
| Each policy tag's arity is one package-private record that `childrenOf`, `LeafPolicy`, `PolicyCases`, `TraceCases` and the trace fold are typed against or read | `Decision.ts` restated it in a hand-kept `leafTags` list tied to nothing, so moving a tag's arity in one place compiled (32 of 32 moves on the base) | Accepted (Phase 51, ADR-QD-164; record beside `Policy.ts`, not in it, to stay out of the public barrel) |
| The predicate compile shell (defaults, renderability, outcome counting) is one core function every dialect calls with its rules, renderer and own counter series | `@qadi/predicate-sql` and `@qadi/predicate-prisma` repeated it, and had already drifted: Prisma counted `compiled` before rendering, SQL after | Accepted (Phase 52, ADR-QD-165; each package keeps its own metric declaration, ADR-QD-123; mutation judged by D-09a: a dialect's fall is only the shell's killed mutants moving to core) |
| A decoded key is read as an own property by one package-private module that every interpreter, fixture and projection uses | `evaluatePredicate` read `row[p.column]` while `evaluate` read own properties only, so the reference interpreter could allow a row the engine denied; six hand-written `Object.hasOwn` mirrors kept the rest in step by comment | Accepted (Phase 53, ADR-QD-166; `Operand.ts` import-free and out of the barrel; `@qadi/core` patch, no Breaking) |
| Each leaf's answer-to-verdict step is one row of a closed per-tag record that both interpreters read through `isHeld` | The walk and `toPredicate` each restated how an answer (acted polarity, relationship `Unknown`, custom, signature) becomes allow/deny, so a change to one could leave the row filter admitting what the walk denies | Accepted (Phase 54, ADR-QD-167; D-10 credits static-ignored mutants only when an `ignoreStatic:false` run kills each — accepted by the owner at UAT) |
| A devtools tab's wording is a pure model function over closed unions; the panel renders tags | `ServicesPanel.tsx` joined three readings through three differently typed keys (`WiredServiceName`, `string`, a call `_tag`), so a renamed port rendered "never called" instead of failing to compile | Accepted (Phase 55, ADR-QD-168; follows ADR-QD-162, restates ADR-QD-047 for the Services tab) |
| The questions panel's two host inputs are one scoped feed, and a throwing thunk is stated rather than stopping the poll (owner chose GFED-05 = Yes) | A throwing `questions` thunk was a defect in the diagnostics sample that froze every tab, while a throwing registry was only `GatesView.Failed`; one feed gives both inputs one failure policy | Accepted, ADR-QD-169 (Phase 56) |
| An envelope states its unknown top-level key policy at its decoder, as one required closed option (owner: "answer by the cleanest solutions not the simplest") | Both `SinkCodec` envelopes hand-built "ignore unknown keys" while five seams refused them, with nothing stating which rule a seam had; one option derived from the schema removes the hand-written key lists and makes every seam say its rule | Accepted, ADR-QD-170 (Phase 57) |
| In memory a stored record is its envelope, the producer's label beside the record, not a flattened copy per record kind | Two stored classes, a stamp arm and a decode re-stamp translated one fact between two shapes, and every new `SinkRecord` kind needed all three; the log's `isolate` catches were reachable only through the stamp's getter-reading spread, so they were deleted rather than kept as dead code (owner choice) | Accepted, ADR-QD-171 (Phase 58) |
| Admission produces the one walk environment both interpreters read, typed by its row source and carrying the policy it admitted | Two hand-built `supplied` objects and a six-argument recursion whose `depth` and `maxDepth` swapped silently; a benchmark gated the change (gate, then three after-runs, each 0 of 35 slower) | Accepted, ADR-QD-172 (Phase 59) |
| Devtools' headless interface is its feeds: the root exports the three feeds and one diagnostics option shape, not the store/runner pairs | A headless shell had to pair, fork, supersede and watch each store itself, and `runDiagnostics` lacked the feeds' stop detection the README claimed it had | Accepted, ADR-QD-173 (Phase 60) |
| A decision cache is asked only the question: the interface takes the question and a `concurrency`-only options type, and core's layer runs the matching walk | `getOrCompute(question, compute)` accepted any computation for any key, so ADR-QD-031's security-boundary key held only because one call site in `Lifecycle.ts` paired them | Accepted, ADR-QD-174 (Phase 61) |
| A negative type pin must be able to fail: tstyche compiles with `floatingEffect` off, every negative pin has a passing same-subject twin, and their count is budgeted | tstyche read any diagnostic on a compiled call as "not callable", and `floatingEffect` puts one on every bare `Effect`-returning call, so a negative pin on such a subject passed whatever its arguments were | Accepted, ADR-QD-175 amends ADR-QD-037 (Phase 62; review loop added the third characterisation block and the `--listFiles` cross-check) |
| Gate 14 compiles every new public name through the packed `exports` map and fails on an unprobed `make*Feed` or a vacuous probe | The packed-install gate probed only `makeTimelineFeed`, so a public feed or type could break in the tarball unseen | Accepted (Phase 63, ADR-QD-033 amended, CCR-QD-454) |
| Every `ExternalStore` listener is called; the first error is rethrown after the last (owner D1) | One throwing listener stopped the rest, so a broken panel silenced the timeline, diagnostics and gates feeds alike | Accepted, ADR-QD-177 (Phase 64) |
| Only `admit` builds an `Admitted`, and the `"asked"` row's resource flag comes from the matcher context | A hand-built `Admitted` or a restated flag could disagree with admission; bench-gated (0 of 35 slower) | Accepted (Phase 65, ADR-QD-172 amended) |
| The `ignore` projection reads only declared keys (owner D4); hydration keeps `refuse` (D2) | Reading every key to drop it invoked an attacker's getter on an untrusted envelope | Accepted (Phase 66, ADR-QD-170 amended) |
| Equivalent mutants are restructured away, not ignored; a race test asserts its property, not a step count | Two survivors no test could kill and a `gap <= 48` bound tied to `walk`'s step count hid regressions | Accepted (Phase 67, CCR-QD-458; claim-arm table measured against hoisted `Match`) |
| Port cards stay package-private (owner D3); records are closed or evidenced, not carried | v1.6's close-outs were carried as prose; each became a fix or a recorded decision | Accepted (Phase 68, ADR-QD-173 amended, CCR-QD-459) |
| Fix the audit's fixable debt in an inserted phase before completing; Phase 68's record scripts stay as recorded and corrected copies re-check them | Completing with known-fixable defects in the bench harness, gate 14 and the record scripts would carry them a third time; a record keeps the tool that produced it | Accepted (Phase 68.1, ADR-QD-033 Rev 1.6, CCR-QD-460; owner chose "Insert a cleanup phase first", then "Fix inline, then complete" for the re-audit's info findings) |
| One total rule turns a caught value or a cause into text, exported by core; `String(cause)` on an Effect `Cause` and the two `JSON.parse` catches stay as named exceptions | Six hand-copied `instanceof Error ? … : String(…)` reads each threw on a hostile value and turned a typed failure into a defect | Accepted (Phase 69, ADR-QD-182; `null` cause shown as `"null"` decided autonomously 2026-11-22) |
| A drop event is derived from the record its drops are collected in; a payload refusal is mapped through a producer record whose inverse the compiler checks; the spec says plainly the compiler cannot check that code drops under a reason | Three drop reasons reached no event and no count when added, because each bucket and its emission line were written by hand (INV-QD-045 broken by construction) | Accepted (Phase 70, ADR-QD-183; folding the payload path in decided autonomously 2026-11-22) |
| Every developer-signal reporter is resolved through one table; the production latch stays process-wide as the one budgeted module-scope binding | `makeGateRegistry`'s throwing reporter was announced under the atom set's option because each resolver restated the rules by hand, and AGENTS.md §13 denied the latch existed | Accepted (Phase 71, ADR-QD-184; keeping the latch process-scoped and moving the provider's environment check into the row decided autonomously 2026-11-22) |
| A computed dock store is a scoped derived store that owns its key comparison, stop-after-close and notify-once; a closed model's diagnostics store now stops too; a throwing parent release does not stop the others and the close rethrows | Three hand-built stores each restated a last key, a field-by-field compare and a closed flag, so a key field could be left out of a compare and the diagnostics store kept publishing after close | Accepted (Phase 72, ADR-QD-185; per-field identity over own enumerable string-keyed fields, the store list pinned in-test and compared as a set, and the ADR-QD-177 rethrow-after rule for releases decided autonomously 2026-11-22) |
| Gate registration is one pure keyed `reconcile`; it handles no throw and relies on a stated writer contract that the real registry keeps and tests pin | The hook diffed state by hand with four refs and three effects over two arrays that had to line up by index, and the registry's equal-state check was a third place deciding the same thing | Accepted (Phase 73, ADR-QD-186; removing the unreachable rollback in favour of the writer contract, the two-effect reading of "one effect", and one-consumer test helpers living in their consumer decided autonomously 2026-11-22) |
| The simulation session's policy choice is a pure seeded choice beside `HeldChoice.ts`; the session keeps one choice, its form and its runs, with one draft writer and one clear-the-run | The session restated the pin rule, the orphan rule and the menu order in several commands, cleared the run by hand in three places, and wrote the draft outside the one path its `edit` comment claimed | Accepted (Phase 74, ADR-QD-187; a no-op transition answering its input reference, keeping both staleness disjuncts to state BEH-QD-322, a script holding the characterisation to its first commit, and folding every copied devtools test helper onto the shared fixtures decided autonomously 2026-11-23) |
| An audit row is a value only its codec makes, enforced by type and at run time | `archiveAuditTrail` wrote archives its own reader refused (a type-valid row with `at: NaN`, a `NaN` `now`, a `keyMaterial` extra key), and the brand alone could not stop an `any`-typed or JavaScript caller | Accepted (Phase 77, ADR-QD-190; the nominal `Data.Class` brand and envelope-first decode at discuss; the run-time `WeakSet` membership, row freezing, `keyMaterial` and non-list checks and the closed refusal enums added over three code-review rounds, each decided autonomously 2026-11-24; the per-copy registry limit recorded rather than lifted, because a `globalThis` registry lets a host forge membership) |
| A timeline store owns its capacity through `resize`, and a feed hands the host its one store | A feed captured its capacity at construction, so a capacity change built a new store and the feed hid that behind a six-member forwarder, a mirror store, a `push` listener and a subscription left on the dropped store; a refused capacity could half-apply a feed or dock update | Accepted (Phase 78, ADR-QD-191; a resize that empties rather than truncates, the same-effective-capacity no-op, `clear` at the current bound, the dock applying a capacity whole or not at all, deleting the timeline store's redundant identity guard after the mutation close, and `bound` keeping the given timeline whenever the kept entries are unchanged (code review) decided autonomously 2026-11-24) |
| Feeds and the dock model are built bare and take inputs only through `configure`, under one per-field identity rule | Each feed took inputs twice, at construction and through `configure`, with its own hand-written "did this move" check, so the two paths could disagree and the dock re-stated the comparison above its feeds; a reader could see an unconfigured model | Accepted (Phase 79, ADR-QD-192; `Required<…>` normalisers so a new field cannot compile uncompared, the dock with no guard of its own, the timeline feed's one decision, deleting the bare build's unobservable read after the mutation close, judging the by-hand mutation check against the base's Ignored set, keeping and pinning the per-commit retry of a failed subscribe, one normaliser per input (code review), and correcting the ADR to the shipped bare read decided autonomously 2026-11-24) |
| The highlight lens is a headless session the dock model owns, and `useLens` is only its document adapter; `QadiContextValue` drops `instrument` | The lens's rules lived in a hook's DOM handlers, reachable only by rendering the dock, unmeasured by mutation and re-adding listeners on every guard change; the context published an `instrument` field nobody read | Accepted (Phase 80, ADR-QD-193; no `clear` command, the pick held by gate id after React was shown to give a remounted guard a new id, the reveal one-shot and dropped by cancel and highlight, `move` returning nothing after its unread boolean survived mutation, the click decision kept swallowed when a subscriber throws, keyboard clicks placed by their control, and one subscription per store (code review) decided autonomously 2026-11-24) |
| The evaluate family's spans are declared once, a failed span says what was asked, and the outcome has one key, `qadi.outcome` | A failed `qadi.evaluate` span carried only its outcome and error tag, the outcome used two keys, and the same keys were hand-typed in four writers and over a hundred test strings, so a tracer filtering by evaluation id or outcome missed half the evaluations | Accepted (Phase 75, ADR-QD-188; one key with no dual write as the checkpoint decision, a family question held to `PoseOf`, a log event refused by every span-writing function, an interrupted evaluation carrying no outcome, a script holding the contract to its first commit, and measuring `PortSpanEncode.ts` only over the lines the phase added decided autonomously 2026-11-23) |
| Whether a fixture row meets a signature or acted leaf is core's answer, and a refused value fails typed everywhere it is read | Remedies restated core's signature match and the fixture port's scoping inline, diverged from the port on 14 `Any`-scoped acted cases, and a refused fixture row or request died or was answered `NotActed` (an allow) | Accepted (Phase 76, ADR-QD-189; a change rather than a recorded rejection as the owner decision, the two judgements beside their fixture layers, the two error members made optional, the three unused classes removed, and the totality rule extended to every fixture read and to `remedyEdits` in code review, decided autonomously 2026-11-23) |
| A run of calls applies every call whatever one throws, through one package-private `callAll`; a status that announces work starts that work whatever its listener throws | The dock model's `configure` guarded one step, so a throwing listener on any other store left roles empty, the explorer and simulation on different sightings and diagnostics off, and an identical second `configure` did not mend it; the record path had the same unguarded fan-out | Accepted (Phase 81, ADR-QD-194, CCR-QD-473) |
| A provider's registry has one owner for its lifetime: a headless lease recycles it in place a macrotask after the last cleanup and never disposes it; seeds are not re-applied | A provider hidden in `<Activity>` longer than a macrotask disposed its registry, and the reveal rendered against it (`registry is disposed` from two consumers and the provider's own subject effect); the lifetime rule lived in a timer in the component, unmeasured | Accepted (Phase 82, ADR-QD-195, CCR-QD-474; recycle in place over rebuild, subject-only re-seed, the reveal's one-frame read of the last committed subject accepted and pinned, the re-seed in a `finally` and the review's tests decided autonomously 2026-11-25) |
| The diagnostics feed's reading is a value folded into its one snapshot by a pure `foldReading`; `runDiagnostics` takes a one-member sink; `Diagnostics` carries only what the poll samples | The feed kept the reading in a package-private store beside its snapshot, replaced the store in `off()`, marked `Live` through a second path, folded with a five-clause `===` chain, and typed a `questions` field the poll never sampled, so a reader of a sampled reading's `questions` read `undefined` | Accepted (Phase 83, ADR-QD-196, CCR-QD-475; removing `Diagnostics.questions` as a Breaking minor over routing it through the shown reading, the pure rename first, the sink shape, SR1 in a new file over editing the held characterisation, and the declined IN-02/IN-03 decided autonomously 2026-11-25) |
| A hook's value takes its own inputs through `configure`; the lens reads each fact once; one stop ledger per feed; `useTimeline`'s inputs record is not memoised | `useConfigured` took a value and a second adapter argument restated three times, `LensSession` restated the store's `set` as `move`, `useLens` was handed the guards beside a store it read anyway, `DockFrame` held two copies of the stop ledger and its memo | Accepted (Phase 84, ADR-QD-197, CCR-QD-476; the property-form constraint and its four pinned refusals, the memo recorded as a rejection, `useLens` returning both snapshots, `useStopNotice` keyed on the feed's `restart`, and the review's two added refusals decided autonomously 2026-11-25) |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-11-25 after starting v1.11 milestone*
