# Roadmap: Qadi

## Milestones

- ✅ **v1.0 Arch Wave 5** — Phases 1-9 (shipped 2026-11-09) — [archive](milestones/v1.0-ROADMAP.md)
- 🚧 **v1.1 Arch Wave 6** — Phases 10-20 (all phases complete 2026-11-10; not released)
- 📋 **v1.2 Arch Wave 7** — Phases 21-29 (planned 2026-11-11; not started)

## Phases

<details>
<summary>✅ v1.0 Arch Wave 5 (Phases 1-9) — SHIPPED 2026-11-09</summary>

- [x] Phase 1: HTTP request enforcement, ARCH-46 (5/5 plans) — completed 2026-11-08
- [x] Phase 2: One port read, ARCH-47 (4/4 plans) — completed 2026-11-08
- [x] Phase 3: Audit archive facts, ARCH-48 (3/3 plans) — completed 2026-11-08
- [x] Phase 4: Gate instrumentation hook, ARCH-49 (4/4 plans) — completed 2026-11-08
- [x] Phase 5: Decision log over HTTP, ARCH-50 (2/2 plans) — completed 2026-11-08
- [x] Phase 6: Dehydration in the engine, ARCH-51 (2/2 plans) — completed 2026-11-08
- [x] Phase 7: One port route address, ARCH-52 (3/3 plans) — completed 2026-11-08
- [x] Phase 8: Port serving from the registry, ARCH-53 (6 plans, 08-05 skipped by design) — completed 2026-11-09
- [x] Phase 9: Sink record projection, ARCH-54 (4/4 plans) — completed 2026-11-09

</details>

## 🚧 v1.1 Arch Wave 6 (Phases 10-20)

### Overview

Wave 6 resolves the nine candidates of the 2026-11-10 architecture review and recovers the **lost 2026-10-13 wave**.
That wave's plans were implemented but never merged. Its commits were recovered from the reflog and pinned as
`rescue/wave5-1013`, and its still-live defects (two security, one data loss, several crashes) are re-verified on
`1721a42` in `.planning/phases/_SALVAGE.md`. Phases 11–13 port that work onto the merged codebase. Phases 14–20
are the review's deepenings: defects first, then the top recommendation (one role-graph walk), then the
exploratory ones. Shared rules for every phase: `.planning/phases/_SHARED-CONTEXT.md`.

**Execution order: phases run strictly one at a time, in numeric order (10 → 20).** Every phase's records plan edits the
same spec registers (CCR tail, invariants, traceability, `index.yaml`, `overview.md`, devtools behaviour docs), and several
phases hold a package intentionally red between their first and last plan; `use_worktrees` is false. The per-phase
"Depends on" lines name the *content* reasons; the serial order is the operational rule.

### Phases

- [x] **Phase 10: Planning reconciliation** - Make `.planning/` match `main`: supersede the lost tracker, decide its tracking, and clear the orphan build output (no ARCH id)
- [x] **Phase 11: Lost-wave security** - Port the signature-ledger keyed store and the guardApi closed access plan; both fix live privilege defects (ARCH-59)
- [x] **Phase 12: Lost-wave integrity** - Port the decision-stream order owner and the one-value hydration outcome; fix record loss on reconnect and SSR crashes (ARCH-60)
- [x] **Phase 13: Lost-wave gaps** - Port the public-endpoint denial log, the simulation field table, the evaluation metrics module, test gaps and doc defects (ARCH-61)
- [x] **Phase 14: Audit sink deadline** - The audit sink bounds every store call and the breaker sees hangs; the audit doubles become scriptable (ARCH-62)
- [x] **Phase 15: Dock session** - The dock's tab, filters, selection and replay become a headless session; replaying the same row re-seeds (ARCH-63)
- [x] **Phase 16: One role-graph walk** - One traversal in core backs every role walk, including the devtools tree (ARCH-64)
- [x] **Phase 17: Injective request key** - `PortKey` becomes a kind-tagged injective encoding for all five ports; the replay miss policy is decided (ARCH-65)
- [x] **Phase 18: Devtools HTTP surface** - The stream, backlog and registry routes share one address rule with the devtools client (ARCH-66)
- [x] **Phase 19: Verdict presentation** - One verdict-treatment module and one headless outcome reading in devtools (ARCH-67)
- [x] **Phase 20: DecisionCache shared computation** - Reproduce #64; if it reproduces, extract the single-flight regime and fix it (ARCH-68)

### Phase Details

### Phase 10: Planning reconciliation
**Goal**: Nothing under `.planning/` claims a status that `main` contradicts, and no orphan build output suggests modules that don't exist.
**Depends on**: Nothing (first phase)
**Requirements**: REC-01, REC-02, REC-03, REC-04, XC-01
**Success Criteria** (what must be TRUE):
  1. Every `.planning/milestones/archive-pre-gsd/architecture/ARCH-46…57-*.md` has a disposition status that names a wave-6 phase, a commit on main, `obsolete` or `deferred`.
  2. `.planning/milestones/archive-pre-gsd/architecture/README.md` opens with the superseded banner and links `_SALVAGE.md`.
  3. The orphan-`lib` finder loop returns nothing after the repo's clean/build.
  4. The tracking decision for `.planning/milestones/archive-pre-gsd/architecture/` is applied and `git status` reflects it.
**Plans**: 3 plans

Plans:
- [x] 10-01 (W1): Make the untracked 2026-10-13 tracker stop claiming work is on `main`.
- [x] 10-02 (W1): Remove the stale build output the lost wave left in `packages/*/lib/`, through the repo's own clean and build scripts (D-03), so nobody grepping `lib/` finds modules…
- [x] 10-03 (W2): Take the one human decision this phase has (D-02: track, ignore or archive the old tracker), apply it so `git status` shows it, confirm the milestone's lost-wave note… ⛳ checkpoint

### Phase 11: Lost-wave security
**Goal**: A signature never grants beyond the resource it was captured for, and `guardApi` never serves an endpoint it didn't vet.
**Depends on**: Phase 10 (soft: records only)
**Requirements**: SEC-01, SEC-02, SEC-03, SEC-04, SEC-05, SEC-06, XC-01..06
**Success Criteria** (what must be TRUE):
  1. The `{id: 7}` signature probe denies on another resource, and the discharge is refused with nothing stored (RED on `1721a42`).
  2. The B1/B2/B4 guardApi probes each answer 500 with one log line; a mis-wired prefix fails closed with a 500, and a correctly wired prefixed API lists exactly `GET /v1/a` (RED on `1721a42`).
  3. `SignatureLedger.test.ts`'s subject-wide assertion is inverted, not deleted.
  4. No lost-wave spec id (ADR-QD-108..110, CCR-QD-383..391, BEH-QD-334..336, INV-QD-242..244) appears in a ported line.
  5. `pnpm check:pr` is green, with the ADR, CCR and changesets recorded (Breaking where an export is removed).
**Plans**: 7 plans

Plans:
- [x] 11-01 (W1): Close the live over-grant: a signature captured while discharging an obligation on a resource whose id is not a string is stored subject-wide today (`resourceIdOf`…
- [x] 11-02 (W1): Close the live guardApi bypass: the middleware decides membership by the string `group/endpoint` (`endpointMemberKey`, `packages/http/src/AuthorizeRequest.ts:41-56`,…
- [x] 11-03 (W2): Make the signature ledger a keyed store, so the read rule that 11-01's fix depends on ("a resource-scoped query sees only its own resource
- [x] 11-04 (W2): Finish the guardApi port: make the plan the only reader of access declarations, and make the docs say what the code now does.
- [x] 11-05 (W3): Give ledger adapters a way to prove the one obligation 11-03 left them: `entriesAt(key)` answers exactly the entries appended under `key`, byte for byte.
- [x] 11-06 (W4): Record Phase 11 in the spec: two ADRs, the behaviour/invariant/traceability corrections, the overview rows that close gate 13, and the CCR rows.
- [x] 11-07 (W5): Finish Phase 11: the changesets and upgrade notes, the sweep for reused lost ids, and the full PR gate.

### Phase 12: Lost-wave integrity
**Goal**: The decision stream never loses a record across a reconnect, and hydration never crashes a render or miscounts because of a policy shape or a host reporter.
**Depends on**: Phases 10 and 11 (serialised: 10 cleans `lib/` and rewrites plan references; 11 appends to the same spec registers — CCR tail, invariants, traceability, overview, ADR index)
**Requirements**: INT-01, INT-02, INT-03, INT-04, INT-05, INT-06, XC-01..06
**Success Criteria** (what must be TRUE):
  1. The mid-backlog reconnect probe receives every record exactly once (RED on `1721a42`).
  2. `dehydrateDecisions` on `gte(NaN)`, `gte(-Infinity)` and `depth: 1.5` returns, with the entry dropped and counted.
  3. A throwing `onDropped` or `onHydrationMismatch` leaves the seeded and counted results identical to a non-throwing one.
  4. A zero-entry subject mismatch moves the counter by at least one.
  5. `pnpm check:pr` is green, with records and changesets in place.
**Plans**: 5 plans

Plans:
- [x] 12-01 (W1): The decision stream's WRITER: give the backlog's wire order and resume cursor one owner in `@qadi/core` and stop a reconnect during (or after) the backlog losing or… ⛳ checkpoint
- [x] 12-02 (W2): The decision stream's READER: move the prelude/timeout/live rules from `@qadi/devtools` into core's `decodeDecisionStream`, prove writer and reader agree with two…
- [x] 12-03 (W1): Make a hydration outcome one value, counted once and reported once, and make every host reporter unable to change it (INT-04, INT-05, INT-06). ⛳ checkpoint
- [x] 12-04 (W2): Make dehydration total and give its drop hook the shape 12-03's checkpoint chose
- [x] 12-05 (W3): Record Phase 12 in the normative spec, the public overview, the website and the changesets

### Phase 13: Lost-wave gaps
**Goal**: Every remaining live row of the lost wave is fixed, ported or recorded obsolete, and placeholders can no longer ship.
**Depends on**: Phases 11 and 12 (13-01/13-08 edit the http enforcement files 11 changes; 13-10 edits files 12 touches)
**Requirements**: GAP-01 … GAP-12, XC-01..06
**Success Criteria** (what must be TRUE):
  1. The public-endpoint denial probe logs one line; the enforcement matrix has a public-endpoint row.
  2. The simulation sweep offers `DropSignature`; `hasSignature`/`hasCustom` show a remedy or a named skip.
  3. Renaming an evaluation metric id fails every test that reads it, including the negative ones.
  4. `grep -rn "ADR-QD-NEXT" packages/*/src packages/*/test` is empty, and the new gate refuses one.
  5. The rescue-branch deletion checkpoint has been answered.
**Plans**: 13 plans

Plans:
- [x] 13-01 (W1): Port the one live part of lost ARCH-47 (`b0b9363`, its C3 defect, tasks T3/T4) onto current `main`: a `publicEndpoint` handler's own `guard` denial is logged exactly…
- [x] 13-02 (W1): Fix the two live defects of lost ARCH-48 (`950977f`, its T1 and T2), test-first, on current `main`: the simulation sweep cannot drop a signature (`DropSignature` is…
- [x] 13-03 (W2): Port the deepening of lost ARCH-48 (`950977f`, its T3–T8) onto current `main`: one closed field table from which the sweep, the remedies' grants, the rename, the…
- [x] 13-04 (W3): Finish the lost ARCH-48 port (`950977f`, T9–T12) on current `main`: the session gains chip commands and a `fields` view derived from the table, the Simulator renders… ⛳ checkpoint
- [x] 13-05 (W1): Port the core half of lost ARCH-56 (`d089c1d`, T2–T4 and T7) onto current `main`: one exported `EvaluationMetrics` module the core writers write through, and typed…
- [x] 13-06 (W2): Port the audit and compiler half of lost ARCH-56 (`d089c1d`, T5–T6): their metrics become typed, package-private reads, so the same vacuous-negative defect 13-05…
- [x] 13-07 (W3): Port the gate and record half of lost ARCH-56 (`d089c1d`, T1/T8/T9): three house-style rules that keep metrics declared once and read by reference, the…
- [x] 13-08 (W2): Close the http half of lost ARCH-57 (`4b1ed49`) on current `main`: pin both unguarded-route logging cadences with tests (GAP-08, lost T3), then port the two ARCH-57…
- [x] 13-09 (W2): The 13-D core tests: the precedence pin (GAP-07), the batch-under-cache-and-sink tests from lost ARCH-57 `4b1ed49` (GAP-09, test half
- [x] 13-10 (W4): 13-E, part 1: resolve every numbering placeholder (the placeholder row of GAP-11) and make the class un-reintroducible (GAP-12).
- [x] 13-11 (W5): Write Phase 13's shared registers once, after every content plan has landed: invariants, traceability, overview, ADR index, and the CCR register.
- [x] 13-12 (W6): Close Phase 13: the merge gate (`pnpm check:pr`, the derived PR gate — `scripts/run-check.mjs --skip-mutation`), a scoped mutation comparison for the files whose… ⛳ checkpoint
- [x] 13-13 (W2): 13-E, part 2 (split from 13-10 for size): the GAP-11 doc defects other than the placeholders, and lost ARCH-57 L4 (seven stale citations, two tense fixes) and L5…

### Phase 14: Audit sink deadline
**Goal**: A hung audit store can neither stall a decision nor keep the breaker closed.
**Depends on**: Phase 13 (13-C touches the audit metrics and `CircuitBreaker.ts`)
**Requirements**: AUD-01, AUD-02, AUD-03, AUD-04, AUD-05, XC-01..06
**Success Criteria** (what must be TRUE):
  1. With a trail write of `Effect.never`, `decide` settles within the deadline under `TestClock` (RED on `1721a42`).
  2. With `failureThreshold: 1`, the first hung write opens the breaker, and later writes are `Skipped`.
  3. `grep` finds no hand-written failing audit port layer in `packages/audit/test`; `driveExit.ts`'s mode table is gone.
  4. `pnpm check:pr` is green, with the ADR/BEH amendment and changeset in place.
**Plans**: 7 plans

Plans:
- [x] 14-01 (W1): Settle the phase's one human decision and prove the defect, before any source changes. ⛳ checkpoint
- [x] 14-02 (W2): Give the shipped audit doubles a per-call script (D-05): each call to `write`, `stage` or `commit` is answered by a reply from a closed union — Ok, Fail, Die,…
- [x] 14-03 (W3): Bound every audit store call by a deadline the sink owns, and count a deadline as a failed attempt.
- [x] 14-04 (W4): Rewrite every hand-built audit port in the audit tests as a scripted double, and delete `driveExit.ts`'s mode table (D-06).
- [x] 14-05 (W5): Close the door behind 14-04: refuse a hand-built audit port layer or error in tests, and remove (or demote) the legacy fail options, per the 14-01 decision (D-07).
- [x] 14-06 (W6): Write Phase 14's spec records: ADR-QD-126, the ADR-QD-044/056 amendments, the BEH-QD-251 amendment, BEH-QD-379/380, the INV-QD-035 note, traceability and CCR-QD-404.
- [x] 14-07 (W7): Close Phase 14: the package-facing docs, the changeset, the PROJECT.md decision row, the per-file mutation comparison and `pnpm check:pr`.

### Phase 15: Dock session
**Goal**: The dock's navigation is a headless session, and replay is an act that always re-seeds.
**Depends on**: Phase 13 (13-B edits `SimulationSession.ts`/`Simulator.tsx`)
**Requirements**: DOCK-01, DOCK-02, DOCK-03, DOCK-04, DOCK-05, XC-01..06
**Success Criteria** (what must be TRUE):
  1. The test "replay A → choose another policy → replay A" shows A's policy (RED on `1721a42`).
  2. `DevtoolsDock.tsx` contains no `useState` for tab, filters, selection or seed.
  3. The session's rules are tested in `test/model/` without rendering.
  4. `pnpm check:pr` is green; gate 12 is green.
**Plans**: 4 plans

Plans:
- [x] 15-01 (W1): Fix the replay-same-row defect at its root: replaying is a command on the simulation session, not a prop React may skip.
- [x] 15-02 (W2): Build the headless dock session: the dock's tab, filters, selection and the readings derived from them, as a store a test can drive without React (D-02).
- [x] 15-03 (W3): Make `DevtoolsDock` a view of the dock session: no React state for tab, filters, selection or replay
- [x] 15-04 (W4): Write Phase 15's records and close the phase green: the ADR-QD-047 amendment, BEH-QD-389/390, INV-QD-107's sources, traceability, CCR-QD-405, the changeset, a…

### Phase 16: One role-graph walk
**Goal**: The role-inheritance walk exists once, so identity keying, stack safety and first-path-wins cannot drift again.
**Depends on**: Phase 13 (soft: 13-10 fixes the stale citation in `Role.ts`; rebase on it)
**Requirements**: ROLE-01, ROLE-02, ROLE-03, ROLE-04, ROLE-05, XC-01..06
**Success Criteria** (what must be TRUE):
  1. Distinct same-named roles, a 20,000-deep chain and 20 stacked diamonds all render correctly in the devtools tree (RED on `1721a42`).
  2. `Role.ts` contains one traversal; the four former walkers are projections of it.
  3. The INV-QD-038 property test passes over random DAGs.
  4. The bench shows no flatten regression beyond noise, and a `fromRoles` improvement.
**Plans**: 4 plans

Plans:
- [x] 16-01 (W1): Give the role graph one traversal and make the devtools tree its first projection, fixing the devtools defects: the tree keys `seen` on `self.name`… ⛳ checkpoint
- [x] 16-02 (W2): Turn core's three hand-written walkers into projections of the traversal 16-01 added, and make `fromRoles` walk once.
- [x] 16-03 (W3): Finish ROLE-03 on screen.
- [x] 16-04 (W4): Record Phase 16 and run the full gate.

### Phase 17: Injective request key
**Goal**: Two port requests share a key exactly when they are the same request, and devtools replay cannot fail open on a miss.
**Depends on**: Phase 13 (13-B edits `Replay.ts`)
**Requirements**: KEY-01, KEY-02, KEY-03, KEY-04, KEY-05, XC-01..06
**Success Criteria** (what must be TRUE):
  1. The key property test passes (RED on `1721a42` for Date, NaN, Infinity, undefined keys and Set).
  2. No port description writes `JSON.stringify` for its key.
  3. Replay of a capture miss on every port follows the decided policy, with one test per port.
**Plans**: 6 plans

Plans:
- [x] 17-01 (W1): Ask the phase's one human question (D-04, KEY-04) and record the answer where the later plans read it: what does `@qadi/devtools`' replay answer for a request the… ⛳ checkpoint
- [x] 17-02 (W1): Write the phase's regression tests first and see them fail on the phase base (D-01, XC-06): the key law as a property over values chosen to collide, the totality of…
- [x] 17-03 (W2): Make the request key injective and total (D-02, D-03
- [x] 17-04 (W3): Handle the key's `Result` at every consumer (KEY-01, KEY-03), against the tree as Phases 11 and 13 left it: a refused request fails closed with the port's own typed…
- [x] 17-05 (W4): Implement the human's D-04 answer (KEY-04): what a devtools Snapshot replay answers for a request its capture never saw, on every port, with one test per port proving…
- [x] 17-06 (W5): Record the phase in the normative spec (D-05, KEY-05, XC-02) and prove the merge gate (XC-01): amend ADR-QD-094's key law, write ADR-QD-129 for the replay miss…

### Phase 18: Devtools HTTP surface
**Goal**: The devtools routes and their client agree on one address that a host can prefix.
**Depends on**: Phases 11, 12 and 13 (they edit `PermissionRegistry.ts`, the stream routes and the unguarded-route constructor 13-08 adds)
**Requirements**: SURF-01, SURF-02, SURF-03, SURF-04, XC-01..06
**Success Criteria** (what must be TRUE):
  1. The round trip under `/x/devtools` passes for stream, backlog and registry.
  2. Neither example hard-codes `__decisions` or `__permissions`.
**Plans**: 3 plans

Plans:
- [x] 18-01 (W1): Give the devtools HTTP routes (the decision stream, its JSON backlog and the permission registry) one address rule that a host can prefix, shared with the client that… ⛳ checkpoint
- [x] 18-02 (W2): Prove the shared address end to end with the real devtools reader, and move both examples onto it (SURF-02, SURF-04).
- [x] 18-03 (W3): Record Phase 18 in the spec, the overview, the website and a changeset, then prove the tree with `pnpm check:pr` (XC-01..XC-06

### Phase 19: Verdict presentation
**Goal**: Every devtools panel shows a verdict through one treatment, and each screen's panels come from one outcome reading.
**Depends on**: Phases 13 and 15 (the Simulator and dock change there first)
**Requirements**: VIEW-01, VIEW-02, VIEW-03, VIEW-04, XC-01..06
**Success Criteria** (what must be TRUE):
  1. A Denied row and a Failed row have different treatments (RED on `1721a42`).
  2. `allowOf` and the Simulator's inline narrowing are gone; the Inspector has its own test file.
**Plans**: 3 plans

Plans:
- [x] 19-01 (W1): Give every verdict on screen one treatment (D-01, D-02
- [x] 19-02 (W2): Read a decision record's outcome and obligation state once, into a closed union both screens consume (D-03
- [x] 19-03 (W3): Record Phase 19 in the normative spec (D-04, XC-02) and prove the merge gate (XC-01): two behaviours, two invariant notes, the devtools-spec statement, the…

### Phase 20: DecisionCache shared computation
**Goal**: The #64 regime is either shown unreachable or pinned and fixed at a seam that can test it with plain keys.
**Depends on**: Phase 13 (13-C/13-D touch `DecisionCache.ts`)
**Requirements**: CACHE-01, CACHE-02, CACHE-03, CACHE-04, XC-01..06
**Success Criteria** (what must be TRUE):
  1. A RED #64 test exists, or a written finding shows it unreachable (and the phase ends there).
  2. If reproduced: the existing cache tests pass unchanged and the #64 test is green.
**Plans**: 4 plans

Plans:
- [x] 20-01 (W1): Reproduce the issue-#64 follow-up gap as a RED test through `DecisionCache`'s current interface, before any extraction (D-01, CACHE-01). ⛳ checkpoint
- [x] 20-02 (W2): Extract `DecisionCache`'s single-flight protocol into a package-private module with its own seam (D-02, CACHE-02), behaviour-preserving, so the #64 gap can be pinned…
- [x] 20-03 (W3): Pin the #64 follow-up gap at the new seam and close it (CACHE-03): an abandoned shared computation leaves the in-flight table in the same step that abandons it, so…
- [x] 20-04 (W4): Record Phase 20 in the normative spec (D-04, XC-02) on whichever branch D-01 took, and prove the merge gate (XC-01).

### Progress (v1.1)

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 10. Planning reconciliation | 3/3 | Complete | 2026-11-10 |
| 11. Lost-wave security | 7/7 | Complete | 2026-11-10 |
| 12. Lost-wave integrity | 5/5 | Complete | 2026-11-10 |
| 13. Lost-wave gaps | 13/13 | Complete | 2026-11-10 |
| 14. Audit sink deadline | 7/7 | Complete | 2026-11-10 |
| 15. Dock session | 4/4 | Complete | 2026-11-10 |
| 16. One role-graph walk | 4/4 | Complete | 2026-11-10 |
| 17. Injective request key | 6/6 | Complete | 2026-11-10 |
| 18. Devtools HTTP surface | 3/3 | Complete | 2026-11-10 |
| 19. Verdict presentation | 3/3 | Complete | 2026-11-10 |
| 20. DecisionCache shared computation | 4/4 | Complete | 2026-11-10 |

## 📋 v1.2 Arch Wave 7 (Phases 21-29)

### Overview

Wave 7 resolves the eight candidates and three footnotes of the 2026-11-11 architecture review. That review covered the files
that changed in each of the last five waves (#148–#155). Base commit `965ff14c`. Read `.planning/phases/_SHARED-CONTEXT.md`, then
`.planning/phases/_WAVE7-CONTEXT.md` (base, numbering, per-phase evidence, and the correction that port keys are read by devtools
replay and test doubles, not by evaluation). Order: core first (21–23), then devtools (24–26), then `@qadi/http` (27), `@qadi/react` (28),
and the footnotes last (29).

**Execution order: phases run strictly one at a time, in numeric order (21 → 29)**, for the same reasons as wave 6: shared spec
registers, packages held red between a phase's first and last plan, and `use_worktrees` false.

**Human checkpoints, all answered 2026-11-11 in `.planning/phases/_DECISIONS-v1.2.md` (cleanest option, ADRs overridable):** 22-01 (the trace a missing resource id leaves), 23-01 (record
shape from benchmark numbers, plus the absent-vs-undefined key convention), 25-01 (how a superseded simulation run is stopped once
`reap` leaves the interface), 28-01 (how far ARCH-76 reopens ADR-QD-111).

### Phases

- [x] **Phase 21: Port request derived from its description** - Derived `key`/`defect` for four ports, exhaustive wire and span questions by type; CustomPredicate overrides (ARCH-69) (completed 2026-11-11)
- [ ] **Phase 22: One scoped port read** - `readScoped` owns the id check and one trace shape; one leaf→request function per port drives reads and serving (ARCH-70)
- [ ] **Phase 23: Sink record fields stated once** - Benchmark first; one field statement per record drives the class type and the v2 wire; one record projection (ARCH-71)
- [ ] **Phase 24: Simulation source preparation** - `prepareSource` in `SimulationSource.ts` owns availability, refusal and capture (ARCH-72)
- [ ] **Phase 25: Session-only Simulator** - The view renders a session; commands and readings move into the session; runs live in the session's FiberHandle and Scope (ARCH-73)
- [ ] **Phase 26: Headless dock model** - `makeDockModel` owns the six stores and the cross-store rules; one hook; one held-choice cell (ARCH-74)
- [ ] **Phase 27: Bare-route module** - `addGuardedRoute` absorbs `guardRoute`; one route-method union; the registry route moves out (ARCH-75)
- [ ] **Phase 28: Gate registry dependency** - Checkpoint on ADR-QD-111; React-free `reconcile`; `useGateRegistration` deleted (ARCH-76)
- [ ] **Phase 29: Small restated facts** - Port identity in a metric-free leaf; hydration withheld fields once; one "not a denial" sentence (ARCH-77)

### Phase Details

### Phase 21: Port request derived from its description
**Goal**: No port module lists its request fields by hand for its key, and a field left out of a wire or span question is a compile error.
**Depends on**: Nothing in v1.2 (first phase; builds on Phase 17's `PortKey`)
**Requirements**: PREQ-01, PREQ-02, PREQ-03, PREQ-04, PREQ-05, WX-01, WX-02, WX-03, WX-04, WX-05, WX-06
**Success Criteria** (what must be TRUE):
  1. The key law ("derived key = `canonicalKey` of the wire question") passes as a property over the four derived ports; CustomPredicate's override is documented and tested.
  2. A type test fails when a wire or span question omits a member (RED on the phase base).
  3. Wire-byte goldens are unchanged.
**Plans**: 5/5 plans complete

Plans:
- [x] 21-01 (W1): Record the phase base and mutation baseline; demonstrate PREQ-04 by hand; commit the RED type test, key law and wire-byte goldens
- [x] 21-02 (W2): Make a port's wire question exhaustive by type (`QuestionOf<Q>`, `presentMembers`); remove the conditional spreads
- [x] 21-03 (W3): Derive `key` and `defect` for the four total-question ports; CustomPredicate overrides; delete the exact pins once the law is green
- [x] 21-04 (W4): Make a port's span question exhaustive by type (`portSpan`/`PoseOf`)
- [x] 21-05 (W5): Records (ADR-QD-133, ADR-094/107 amendments, BEH-QD-440/441, INV-QD-286, CCR-QD-411, changeset), mutation comparison, `pnpm check:pr`

### Phase 22: One scoped port read
**Goal**: The three resource-scoped port reads are one read with one trace shape, every read takes its policy leaf, and the leaf→request mapping is stated once for evaluation and serving.
**Depends on**: Phase 21 (both edit the port modules and `PortAccess.ts`)
**Requirements**: SCOPE-01, SCOPE-02, SCOPE-03, SCOPE-04, SCOPE-05, WX-01, WX-02, WX-03, WX-04, WX-05, WX-06
**Success Criteria** (what must be TRUE):
  1. One parameterised test over the three descriptions pins the chosen trace shape for a missing id, and `MissingResourceId`'s `relation`.
  2. `UNTRACED_BUDGET` and `SWITCH_BUDGET` are unchanged.
  3. The span change is recorded as public behaviour (BEH-QD-227 amended, BEH-QD-445).
**Plans**: 1/4 plans executed

Plans:
- [x] 22-01 (W1): Record the two answers from `_DECISIONS-v1.2.md` (D-02 = A; D-05 overridden: the leaf→request mapping stated once)
- [ ] 22-02 (W2): Mutation baseline; RED missing-id table, `PortAccess.tst.ts` and `PortAsks.tst.ts`
- [ ] 22-03 (W3): `asks` on every description (one leaf→request function per tag) drives both the reads and `servingFor`; `LeafRequests` replaces `ServedLeaves`; `readScoped` and reads that take their leaf
- [ ] 22-04 (W4): Records (ADR-QD-134 overriding D-05 and amending ADR-077/094/109/114, BEH-QD-227/331/445/446, INV-QD-288/289, CCR-QD-412, overview, AGENTS.md §3/§5, core minor changeset), `pnpm check:pr`

### Phase 23: Sink record fields stated once
**Goal**: Each sink record's fields are stated once, and a field dropped from projection or rebuild cannot compile or pass the round trip silently.
**Depends on**: Phase 21 (serial order only; no shared files)
**Requirements**: SREC-01, SREC-02, SREC-03, SREC-04, SREC-05, WX-01, WX-02, WX-03, WX-04, WX-05, WX-06
**Success Criteria** (what must be TRUE):
  1. Bench numbers for both record shapes are recorded and the human's GO/NO-GO is in 23-01's SUMMARY.
  2. The round trip covers both record types and every optional field.
  3. `SinkCodec.test.ts`'s wire goldens are unchanged and the encoded value has no `undefined`-valued keys.
**Plans**: 4 plans

Plans:
- [ ] 23-01 (W1): Phase base and mutation scores; show a dropped field compiles; a full round-trip test and pins; a bench of both record shapes; checkpoint — answered A + keys absent ⛳ checkpoint (answered)
- [ ] 23-02 (W2): One field statement per record; the class type and the v2 wire derive from it; `project`/`rebuild` only add or strip `version`; derive `SinkRecordTag` (skipped under C)
- [ ] 23-03 (W3): Merge `failedRecord` and `decidedRecord` into one projection, test first
- [ ] 23-04 (W4): Records (ADR-QD-135, ADR-095 amendment, AGENTS.md §7, BEH-QD-450/451, INV-QD-290, CCR-QD-413, changeset), mutation comparison, `pnpm check:pr`

### Phase 24: Simulation source preparation
**Goal**: The rule for which simulation source is available, and that a Live run captures so Snapshot unlocks, lives in `SimulationSource.ts` alone.
**Depends on**: Nothing in v1.2 (serial order only)
**Requirements**: SRC-01, SRC-02, SRC-03, WX-01, WX-02, WX-03, WX-04, WX-05, WX-06
**Success Criteria** (what must be TRUE):
  1. A 12-row table test covers every (choice × ports × capture) combination.
  2. The session no longer inspects a source variant's `_tag`; `resolveSource`/`sourceOptions` are gone.
  3. Each Live run captures with its own recorder (pinned).
**Plans**: 3 plans

Plans:
- [ ] 24-01 (W1): Mutation baseline; pin the per-run recorder; RED 12-row `prepareSource` table in its own file
- [ ] 24-02 (W2): `prepareSource` with a closed availability table; the session stores what it returns; availability tests move
- [ ] 24-03 (W3): Records (ADR-050 amendment, ADR-QD-136 unused, BEH-QD-455, BEH-QD-220/322 corrected, CCR-QD-414, changeset), `pnpm check:pr`

### Phase 25: Session-only Simulator
**Goal**: The Simulator is a view of its session: no owned mode, no form codecs or readings in the view, and the session owns its runs' lifetime through a FiberHandle in a Scope.
**Depends on**: Phase 24 (both edit `SimulationSession.ts`)
**Requirements**: SIM-01, SIM-02, SIM-03, SIM-04, SIM-05, WX-01, WX-02, WX-03, WX-04, WX-05, WX-06
**Success Criteria** (what must be TRUE):
  1. `OwnedSimulator` is gone; all 32 `<Simulator>` renders in its test build a session.
  2. `setAction`, `choosePolicyAt`, the run reading, cost and baseline reading are session-level and model-tested.
  3. `reap`, `hasRetired` and `dispose` are gone; a superseded run is interrupted before the command returns; closing the session's scope interrupts the run in flight.
**Plans**: 5 plans

Plans:
- [ ] 25-01 (W1): Record the answer from `_DECISIONS-v1.2.md` (D: the session owns a FiberHandle in a Scope; overrides ARCH-20 D-20-b)
- [ ] 25-02 (W2): Mutation baseline; RED model tests (a superseded run is interrupted through the handle with no `reap`; closing the scope interrupts the run in flight; commands and readings)
- [ ] 25-03 (W3): Scoped `makeSimulationSession` (an `Effect.fn` over `FiberHandle`), with `supersede()` for synchronous cancels; `reap`/`hasRetired`/`dispose` deleted; package-private `useScoped`; owner/frame split in the dock; commands and readings
- [ ] 25-04 (W4): DOM tests own their scopes; the view becomes session-only; a new hook test
- [ ] 25-05 (W5): Records (ADR-QD-137 supersedes ARCH-20 D-20-b, ADR-047 amendment, BEH-QD-460/461, BEH-QD-322 fence in a scope, CCR-QD-415, minor changeset), `pnpm check:pr`

### Phase 26: Headless dock model
**Goal**: The dock's cross-store rules live in one headless model and are tested without rendering.
**Depends on**: Phase 25 (the model constructs the session Phase 25 shapes)
**Requirements**: DMOD-01, DMOD-02, DMOD-03, DMOD-04, DMOD-05, WX-01, WX-02, WX-03, WX-04, WX-05, WX-06
**Success Criteria** (what must be TRUE):
  1. `DockModel.test.ts` covers rules M1–M16 and P1 without rendering (including: a source change or closing the scope interrupts a read); 13 DOM duplicates are deleted only after it is green.
  2. One `useDockModel` hook; the four `useOwnedX` hooks are gone; `Screen` takes 4 props, with no conditional spreads.
  3. Both sessions embed one held-choice cell; `RoleViewer` no longer re-maps.
**Plans**: 6 plans

Plans:
- [ ] 26-01 (W1): Preconditions, phase base, mutation baseline; RED `DockModel.test.ts` (M1–M16, P1), run in scopes the tests own
- [ ] 26-02 (W2): Build the scoped `makeDockModel` (six stores, one `configure`; the session in the model's scope; `read(source)` through the model's own FiberHandle), GREEN
- [ ] 26-03 (W3): One held-choice cell shared by both sessions; `PolicyChoice` reshaped; `RoleViewer` stops re-mapping
- [ ] 26-04 (W4): One `useDockModel` over `useScoped` that forks nothing; the owned hooks deleted; `Screen` reduced; `DevtoolsDock.test.tsx` passes unedited
- [ ] 26-05 (W5): Delete the 13 DOM duplicates of model rules; `pnpm coverage`
- [ ] 26-06 (W6): Records (ADR-047 amendment, ADR-QD-138 unused, BEH-QD-465/466, INV-QD-296, CCR-QD-416, changesets), `pnpm check:pr`

### Phase 27: Bare-route module
**Goal**: `addGuardedRoute` is the one bare-route seam: its typing rule is pinned on the public function, and the route-method union is stated once.
**Depends on**: Nothing in v1.2 (serial order only)
**Requirements**: ROUTE-01, ROUTE-02, ROUTE-03, WX-01, WX-02, WX-03, WX-04, WX-05, WX-06
**Success Criteria** (what must be TRUE):
  1. `GuardRoute.tst.ts` pins `CurrentSubject` exclusion, the error channel and the method union on `addGuardedRoute`.
  2. `guardRoute` is gone; `@qadi/http`'s public surface is unchanged.
  3. `pnpm circular` is green with `/__permissions` in `PermissionRegistryRoute.ts`.
**Plans**: 3 plans

Plans:
- [ ] 27-01 (W1): Mutation baseline; pins on `addGuardedRoute`; ordering test retargeted (all green on the base)
- [ ] 27-02 (W2): `addGuardedRoute` absorbs `guardRoute`; `RouteMethod` stated once; `/__permissions` moves out; old tests deleted
- [ ] 27-03 (W3): Records (BEH-QD-470, ADR-036 amendment, ADR-QD-139 unused, CCR-QD-417, patch changeset), `pnpm check:pr`

### Phase 28: Gate registry dependency
**Goal**: The gate reconcile is testable without React, and the human has decided how far ADR-QD-111 reopens.
**Depends on**: Nothing in v1.2 (serial order only)
**Requirements**: GATE-01, GATE-02, GATE-03, GATE-04, WX-01, WX-02, WX-03, WX-04, WX-05, WX-06
**Success Criteria** (what must be TRUE):
  1. 28-01's SUMMARY records A, B or C.
  2. Under A or B: `reconcile` is tested against a fake writer. Under A: `GateAtoms` is a `Pick<QadiAtoms>` and `pnpm circular` is green.
  3. `useGateRegistration` is deleted, and its tests are moved onto `useGateRegistrations`.
**Plans**: 5 plans

Plans:
- [ ] 28-01 (W1): Checkpoint: how far ARCH-76 reopens ADR-QD-111 — answered A: split write side from hooks ⛳ checkpoint (answered)
- [ ] 28-02 (W2): Mutation baseline; move tests onto `useGateRegistrations`; delete `useGateRegistration`
- [ ] 28-03 (W3): (A/B) RED reconcile test against a fake writer, then extract the React-free `reconcile`
- [ ] 28-04 (W4): (A) Split `GateWriter.ts` (write side) from `useGate.ts` (hooks); `GateAtoms` = `Pick<QadiAtoms>`
- [ ] 28-05 (W5): Records per outcome (ADR-QD-140 or an ADR-111 amendment, CCR-QD-418, patch changeset), `pnpm check:pr`

### Phase 29: Small restated facts
**Goal**: The three footnoted facts are each stated once.
**Depends on**: Phases 21, 22, 25 and 28 (each edits files this phase touches)
**Requirements**: TIDY-01, TIDY-02, TIDY-03, WX-01, WX-02, WX-03, WX-04, WX-05, WX-06
**Success Criteria** (what must be TRUE):
  1. `PortName.ts` holds one five-row table; `PortDescription.span` is `PortSpanOf<N>` (or the recorded fallback).
  2. `HydrationEngine.ts`'s withheld fields are one constant per entry kind.
  3. One `FAILURE_IS_NOT_A_DENIAL` constant serves the Inspector and the Simulator; literal test assertions are unedited.
**Plans**: 2 plans

Plans:
- [ ] 29-01 (W1): Preconditions and baselines; TIDY-01 port identity leaf; TIDY-02 withheld fields; TIDY-03 the shared sentence
- [ ] 29-02 (W2): Records (ADR-094 note, ADR-QD-141 unused, CCR-QD-419, changesets), `pnpm check:pr`

### Progress (v1.2)

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 21. Port request derivation | 5/5 | Complete    | 2026-11-11 |
| 22. One scoped port read | 0/4 | Planned | - |
| 23. Sink record fields | 0/4 | Planned | - |
| 24. Simulation source preparation | 0/3 | Planned | - |
| 25. Session-only Simulator | 0/5 | Planned | - |
| 26. Headless dock model | 0/6 | Planned | - |
| 27. Bare-route module | 0/3 | Planned | - |
| 28. Gate registry dependency | 0/5 | Planned | - |
| 29. Small restated facts | 0/2 | Planned | - |
