# Requirements: Qadi v1.10 Arch Wave 15

**Defined:** 2026-11-24
**Core Value:** An authorization decision is never wrong and never silent.

**Source:** the 2026-11-24 architecture review and `.planning/research/` (STACK, FEATURES, ARCHITECTURE, PITFALLS,
SUMMARY). Per-phase evidence, autonomous decisions and reserved numbers are in `.planning/phases/_WAVE15-CONTEXT.md`.
Every phase runs on branch `arch-wave-15` (off `arch-wave-14` at `902d2128`), strictly serial (81 → 84).

## v1.10 Requirements

### The dock model applies every input whatever a listener throws (Phase 81, ARCH-128, devtools; live defect)

- [x] **COLL-01**: A regression test written on the phase base is RED there and GREEN after: for every store a host can subscribe to on the dock model (timeline, explorer, simulation, dock, roles, questions, services, diagnostics, and any other the model exposes, the lens included), a listener that throws during `configure` leaves every other input applied (roles listed, explorer and simulation on one sightings rail, the dock on the shown timeline, ports set, gates and diagnostics configured, the shown reading refreshed), and the throw is rethrown after the last step.
- [x] **COLL-02**: The record path is total too: a listener that throws on a timeline publish (no `configure` involved) does not leave the explorer, the simulation or the dock behind the timeline; the throw reaches the caller after every follower has moved. RED on the base.
- [x] **COLL-03**: One throw is rethrown as itself (`undefined` and `null` included); two or more are rethrown once, collected, in step order, by the same rule `ExternalStore`'s listener notification and derived-store release already use, which lives in one package-private place shared by all three (kept out of the barrel). No second copy of the loop.
- [x] **COLL-04**: A catalogue and a capacity changed in one `configure` move the sightings rail once, and the notification counts the configure-rule pins (CR22, BEH-QD-735) record are restated for it. The step order (held inputs first, then timeline, rail, roles, ports, gates, diagnostics, shown reading last, one join publish) is pinned. A refused capacity still throws before anything moves (M55), and M56 stays green.
- [x] **COLL-05**: The window between a run's `begin()` and its `fork()` is closed at every site in `packages/devtools/src/model/**` (the timeline feed's `Reading`, the diagnostics feed's `Starting`, the simulation's `Running`): the work a status announces starts whatever a listener throws on that status, and the throw is rethrown after, so the "applies every input" claim holds for the diagnostics, services, questions and timeline-status listeners too (ADR-QD-177 decision 5 amended; TF29's flip recorded). A listener that calls `configure` again from inside a step leaves the model on the inner call's inputs (pinned). Decided autonomously 2026-11-24 (81-CONTEXT D-09).
- [x] **COLL-06**: ADR-QD-194 records the rule (or ADR-QD-191 decision 11 and ADR-QD-177 are amended and 194 is named unused); BEH/INV/traceability and the dock model's file header move with it.

### `QadiProvider`'s registry has one owner for its lifetime (Phase 82, ARCH-129, react; live defect)

- [ ] **LEASE-01**: A regression test written on the phase base is RED there and GREEN after: a stable `QadiProvider` element with a real consumer (`<Can>`) below it, inside an `<Activity>` its parent toggles, hidden for longer than a macrotask and shown again, throws nothing (neither the provider's subject effect nor the consumer's subscription) and renders the decision.
- [ ] **LEASE-02**: The registry's lifetime rule lives in one package-private, headless module that a test drives with an injected timer, and that module is under the React mutation gate. The provider holds no lifetime logic of its own beyond calling it.
- [ ] **LEASE-03**: Every registry the provider builds is released exactly once on a real unmount, no registry is used after release, and none leaks (StrictMode double effects, a hide shorter and longer than a macrotask, a subject change while hidden, an `atoms` prop change, unmount). The vacuous "disposes its registry when unmounted" test asserts disposal.
- [ ] **LEASE-04**: After a long hide the provider answers with the current subject and its seeds: whatever the registry recycling loses (subject, `initialValues`, hydration seeds) is restored before any consumer reads, or the loss is recorded and pinned. The sweep scheduler's bound (ADR-QD-148) holds across a long hide and reveal.
- [ ] **LEASE-05**: ADR-QD-195 records the lifetime rule (amending ADR-QD-014/103/148 as needed); BEH/INV/traceability move with it. If no public export changes, no Breaking changeset; a `@qadi/react` patch changeset records the fix.

### The diagnostics feed folds its reading as a value (Phase 83, ARCH-130, devtools; Breaking)

- [ ] **DIAG-01**: A characterisation test written on the phase base, green there and after, pins every status and reading transition of the diagnostics feed (Off, Starting, Live, Stopped, the per-field identity kept when a sample repeats, the `isCurrent` token guard, the `sampled` flag), so the rewrite changes no observable behaviour except the one this phase names.
- [ ] **DIAG-02**: The feed holds its reading as a value folded by one pure per-field keep-if-equal function with value tests; the package-private store nothing subscribes to, its `marking` wrapper and the store replacement in `off()` are gone. `runDiagnostics` takes an `accept` sink, as `runSource` does.
- [ ] **DIAG-03**: `Diagnostics.questions`, which the poll never writes and nothing reads, is removed from the public `Diagnostics` type (kept on `DiagnosticsReading`, which the dock join reads), or the reason it stays is recorded. If removed: a `@qadi/devtools` changeset marked **Breaking** with a 0.13 upgrade-guide entry, `spec/overview.md`, gate 13 and gate 14 in the same plan.
- [ ] **DIAG-04**: Renamed or moved modules and tests keep every register that names them in step (`spec/traceability.md`, AGENTS.md §6's `NOT_CALLABLE_PIN_BUDGET` table and `scripts/check-house-style.mjs`'s budget together). ADR-QD-196 records the change, amending ADR-QD-173.

### `useConfigured` requires `configure`, and the review's small finds (Phase 84, ARCH-131, devtools)

- [ ] **ADPT-01**: `useConfigured` takes a value that has `configure`; the three identical adapters in `useDockModel`, `useTimeline` and `useDiagnostics` are deleted and its test double is an object. A hidden `Activity` or a StrictMode rebuild still configures with the current inputs.
- [ ] **ADPT-02**: `LensSession` publishes through `ExternalStore.set` (no restated `move`), and `choose` still arms its reveal before it publishes and still answers whether the click was consumed.
- [ ] **ADPT-03**: `useLens` receives each fact once: the draw and the event handlers read the same questions snapshot path, the panel keeps exactly one subscription to each store (traceability row pin), and the handlers still read the guards at event time.
- [ ] **ADPT-04**: `DockFrame`'s stop-ledger ref and memoised notice exist once, shared by the diagnostics and timeline notices.
- [ ] **ADPT-05**: `useTimeline`'s per-render inputs record is either memoised or recorded as a rejection against ADR-QD-192 decision 8, with the gates feed's retry-on-configure (G43) unaffected. ADR-QD-197 records the phase or is named unused.

### Cross-cutting (every v1.10 phase)

- [ ] **WX-01**: `pnpm check:pr < /dev/null` is green at the end of each phase.
- [x] **WX-02**: Each phase records its ADR (or names it "Unused" in its CCR row), its CCR row, and its BEH/INV/traceability changes, using only its reserved numbers. `node scripts/next-id.mjs` is never run.
- [x] **WX-03**: `spec/overview.md` names every added export and drops every removed one (gate 13). Gate 14 probes every changed public signature.
- [x] **WX-04**: Nothing new is added from this list: `as`, `!`, `any`, `switch`, `Effect.fnUntraced`, `async`/`await` in src, ambient `console`/`process.env`/clock, `Record<string, unknown>`, `// Stryker disable`, a module-scope `let`. A budget changes only together with its AGENTS.md table.
- [x] **WX-05**: Coverage thresholds hold (core at least 95%, the others at least 90%). The Stryker score of touched files does not fall: recorded per phase in `NN-mutation-base.json`, measured with the same invocation at the phase base and at close. A drop is closed with a test, never re-baselined.
- [x] **WX-06**: Every behaviour change is preceded by a characterisation or regression test written on the phase base: RED for a defect, green for preserved behaviour. Every new check is shown failing once.
- [x] **WX-07**: No D-numbers, plan-local ids or phase numbers enter shipped source, test titles or BDD scenarios. Nothing is released, published, pushed or merged, and no version-packages PR is merged.

## Future Requirements

- Align `@qadi/react`'s gate registry, which swallows listener errors, with ADR-QD-177's rethrow contract (carried from v1.7).
- Structural (deep) identity for feed inputs (carried from v1.9).
- Exporting the lens session from `@qadi/devtools`' barrel (carried from v1.9).
- Upstream: `@effect/atom-react`'s `RegistryProvider` has the same dispose-in-cleanup shape as the defect Phase 82 fixes.

## Out of Scope

| Item | Reason |
|------|--------|
| Using `AtomRegistry`'s `scheduleTask`/`defaultIdleTTL` for the registry lifetime | AGENTS.md §13 and ADR-QD-148: they reroute dispatch and dropped a required render |
| Reading `registry.disposed` | Not on `AtomRegistry`'s interface |
| Building the provider's registry in an effect (`useScoped` shape) | Children's effects run before the provider's on reveal, and it renders nothing on the server pass |
| Upgrading any dependency | STACK: every API needed is installed |
| Formatting with `oxfmt` | AGENTS.md §17 |
| Merge, release or publish | Standing instruction: release only when the user explicitly asks for "the release" |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| COLL-01 | Phase 81 | Complete |
| COLL-02 | Phase 81 | Complete |
| COLL-03 | Phase 81 | Complete |
| COLL-04 | Phase 81 | Complete |
| COLL-05 | Phase 81 | Complete |
| COLL-06 | Phase 81 | Complete |
| LEASE-01 | Phase 82 | Pending |
| LEASE-02 | Phase 82 | Pending |
| LEASE-03 | Phase 82 | Pending |
| LEASE-04 | Phase 82 | Pending |
| LEASE-05 | Phase 82 | Pending |
| DIAG-01 | Phase 83 | Pending |
| DIAG-02 | Phase 83 | Pending |
| DIAG-03 | Phase 83 | Pending |
| DIAG-04 | Phase 83 | Pending |
| ADPT-01 | Phase 84 | Pending |
| ADPT-02 | Phase 84 | Pending |
| ADPT-03 | Phase 84 | Pending |
| ADPT-04 | Phase 84 | Pending |
| ADPT-05 | Phase 84 | Pending |
| WX-01 | All v1.10 phases | Pending |
| WX-02 | All v1.10 phases | Complete |
| WX-03 | All v1.10 phases | Complete |
| WX-04 | All v1.10 phases | Complete |
| WX-05 | All v1.10 phases | Complete |
| WX-06 | All v1.10 phases | Complete |
| WX-07 | All v1.10 phases | Complete |

**Coverage:**
- v1.10 requirements: 27 total (20 phase-specific + 7 cross-cutting)
- Mapped to phases: 27 (20 phase-specific, each to exactly one of Phases 81 to 84; 7 cross-cutting, each applying to all four)
- Unmapped: 0

---
*Requirements defined: 2026-11-24*
*Last updated: 2026-11-24 after initial definition*
