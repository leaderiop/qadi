# Roadmap: Qadi

## Milestones

- ✅ **v1.0 Arch Wave 5** — Phases 1-9 (shipped 2026-11-09) — [archive](milestones/v1.0-ROADMAP.md)
- 🚧 **v1.1 Arch Wave 6** — Phases 10-20 (all phases complete 2026-11-10; merged to `main` in #155; not archived as a GSD milestone; not released)
- ✅ **v1.2 Arch Wave 7** — Phases 21-29 (completed 2026-11-12; not released) — [archive](milestones/v1.2-ROADMAP.md)
- ✅ **v1.3 Arch Wave 8** — Phases 30-36 (completed 2026-11-13; not released) — [archive](milestones/v1.3-ROADMAP.md)
- ✅ **v1.4 Arch Wave 9** — Phases 37-42 (completed 2026-11-14; not released) — [archive](milestones/v1.4-ROADMAP.md)
- ✅ **v1.5 Arch Wave 10** — Phases 43-52 (completed 2026-11-16; not released) — [archive](milestones/v1.5-ROADMAP.md)
- ✅ **v1.6 Arch Wave 11** — Phases 53-61 (completed 2026-11-19; not released) — [archive](milestones/v1.6-ROADMAP.md)
- 🚧 **v1.7 Arch Wave 12** — Phases 62-68 (in progress)

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

<details>
<summary>🚧 v1.1 Arch Wave 6 (Phases 10-20) — all phases complete 2026-11-10; merged as #155; not archived as a GSD milestone</summary>

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

</details>

<details>
<summary>✅ v1.2 Arch Wave 7 (Phases 21-29) — COMPLETED 2026-11-12 (not released)</summary>

- [x] Phase 21: Port request derived from its description, ARCH-69 (5/5 plans) — completed 2026-11-11
- [x] Phase 22: One scoped port read, ARCH-70 (4/4 plans) — completed 2026-11-11
- [x] Phase 23: Sink record fields stated once, ARCH-71 (4/4 plans) — completed 2026-11-11
- [x] Phase 24: Simulation source preparation, ARCH-72 (3/3 plans) — completed 2026-11-11
- [x] Phase 25: Session-only Simulator, ARCH-73 (5/5 plans) — completed 2026-11-11
- [x] Phase 26: Headless dock model, ARCH-74 (6/6 plans) — completed 2026-11-11
- [x] Phase 27: Bare-route module, ARCH-75 (3/3 plans) — completed 2026-11-11
- [x] Phase 28: Gate registry dependency, ARCH-76 (5/5 plans) — completed 2026-11-11
- [x] Phase 29: Small restated facts, ARCH-77 (3/3 plans) — completed 2026-11-12

Full details: [milestones/v1.2-ROADMAP.md](milestones/v1.2-ROADMAP.md) · requirements:
[milestones/v1.2-REQUIREMENTS.md](milestones/v1.2-REQUIREMENTS.md) · audit:
[milestones/v1.2-MILESTONE-AUDIT.md](milestones/v1.2-MILESTONE-AUDIT.md)

</details>

<details>
<summary>✅ v1.3 Arch Wave 8 (Phases 30-36) — COMPLETED 2026-11-13 (not released)</summary>

- [x] Phase 30: One strict-decode module, ARCH-78 (9/9 plans) — completed 2026-11-12
- [x] Phase 31: A reset supersedes its claims, ARCH-79 (5/5 plans) — completed 2026-11-12
- [x] Phase 32: Evaluation options and services stated once, ARCH-80 (4/4 plans) — completed 2026-11-12
- [x] Phase 33: One sealed evaluation layer, ARCH-81 (6/6 plans) — completed 2026-11-12
- [x] Phase 34: Diagnostics as the dock model's seventh store, ARCH-82 (9/9 plans) — completed 2026-11-12
- [x] Phase 35: The atom set owns its eviction sweep, ARCH-83 (7/7 plans) — completed 2026-11-12
- [x] Phase 36: Carried spec debt and stale records, CCR-QD-427 (14/14 plans) — completed 2026-11-13

Full details: [milestones/v1.3-ROADMAP.md](milestones/v1.3-ROADMAP.md) · requirements:
[milestones/v1.3-REQUIREMENTS.md](milestones/v1.3-REQUIREMENTS.md) · audit:
[milestones/v1.3-MILESTONE-AUDIT.md](milestones/v1.3-MILESTONE-AUDIT.md)

</details>

<details>
<summary>✅ v1.4 Arch Wave 9 (Phases 37-42) — COMPLETED 2026-11-14 (not released)</summary>

- [x] Phase 37: A scoped run that a newer run supersedes, ARCH-84 (9/9 plans) — completed 2026-11-14
- [x] Phase 38: The sink wire version stated once, ARCH-85 (4/4 plans) — completed 2026-11-14
- [x] Phase 39: Each hydration drop reason stated once, with its kind, ARCH-86 (5/5 plans) — completed 2026-11-14
- [x] Phase 40: Core owns describing a decode refusal, ARCH-87 (Breaking, devtools) (9/9 plans) — completed 2026-11-14
- [x] Phase 41: One guarded value-to-text function, ARCH-88 (6/6 plans) — completed 2026-11-14
- [x] Phase 42: A seeded question builds its own computing atom, ARCH-89 (5/5 plans) — completed 2026-11-14

Full details: [milestones/v1.4-ROADMAP.md](milestones/v1.4-ROADMAP.md) · requirements:
[milestones/v1.4-REQUIREMENTS.md](milestones/v1.4-REQUIREMENTS.md) · audit:
[milestones/v1.4-MILESTONE-AUDIT.md](milestones/v1.4-MILESTONE-AUDIT.md)

</details>

<details>
<summary>✅ v1.5 Arch Wave 10 (Phases 43-52) — COMPLETED 2026-11-16 (not released)</summary>

- [x] Phase 43: One handover module behind the enforcement entry points, ARCH-90 (Breaking, core, promise) (8/8 plans) — completed 2026-11-16
- [x] Phase 44: The hydration seed's fields stated once, ARCH-91 (Breaking, react) (6/6 plans) — completed 2026-11-16
- [x] Phase 45: The audit circuit breaker as one transition function, ARCH-92 (Breaking, audit) (8/8 plans) — completed 2026-11-16
- [x] Phase 46: The sink emitter reports what it contains, ARCH-93 (7/7 plans) — completed 2026-11-16
- [x] Phase 47: Port facts read from the description, ARCH-94 (7/7 plans) — completed 2026-11-16
- [x] Phase 48: Audit reports core's refusal and derives "lost", ARCH-95 (Breaking, audit) (8/8 plans) — completed 2026-11-16
- [x] Phase 49: Gates as the dock model's eighth store, one gate-state vocabulary, ARCH-96 (Breaking, react, devtools) (9/9 plans) — completed 2026-11-16
- [x] Phase 50: What a leaf needs from the request, stated once, ARCH-97 (8/8 plans) — completed 2026-11-16
- [x] Phase 51: Policy tag arity stated once, ARCH-98 (5/5 plans) — completed 2026-11-16
- [x] Phase 52: Core owns the predicate compile shell, ARCH-99 (5/5 plans) — completed 2026-11-16

Full details: [milestones/v1.5-ROADMAP.md](milestones/v1.5-ROADMAP.md) · requirements:
[milestones/v1.5-REQUIREMENTS.md](milestones/v1.5-REQUIREMENTS.md) · audit:
[milestones/v1.5-MILESTONE-AUDIT.md](milestones/v1.5-MILESTONE-AUDIT.md)

</details>

<details>
<summary>✅ v1.6 Arch Wave 11 (Phases 53-61) — COMPLETED 2026-11-19 (not released)</summary>

- [x] Phase 53: One module owns "the value a leaf compares", ARCH-100 (core; closes the predicate interpreter's own-property fail-open) (8/8 plans) — completed 2026-11-18
- [x] Phase 54: LeafNeeds turns every leaf's answer into a verdict, ARCH-101 (8/8 plans) — completed 2026-11-18
- [x] Phase 55: A port card is a model row, not a view join, ARCH-102 (devtools) (9/9 plans) — completed 2026-11-18
- [x] Phase 56: The gate-registry watch becomes the dock model's third feed, ARCH-103 (devtools) (13/13 plans) — completed 2026-11-18
- [x] Phase 57: untrustedDecoder states the envelope's unknown-key policy, ARCH-104 (Breaking, core, audit, react) (11/11 plans) — completed 2026-11-19
- [x] Phase 58: A stored record is its envelope in memory too, ARCH-105 (Breaking, core, http, devtools) (9/9 plans) — completed 2026-11-19
- [x] Phase 59: Admission produces the one walk environment, ARCH-106 (benchmark gate passed) (10/10 plans) — completed 2026-11-19
- [x] Phase 60: Devtools' headless interface is the feeds, ARCH-107 (Breaking, devtools) (8/8 plans) — completed 2026-11-19
- [x] Phase 61: DecisionCache is asked only the question, ARCH-108 (Breaking, core) (7/7 plans) — completed 2026-11-19

Full details: [milestones/v1.6-ROADMAP.md](milestones/v1.6-ROADMAP.md) · requirements:
[milestones/v1.6-REQUIREMENTS.md](milestones/v1.6-REQUIREMENTS.md) · audit:
[milestones/v1.6-MILESTONE-AUDIT.md](milestones/v1.6-MILESTONE-AUDIT.md)

</details>

## 🚧 v1.7 Arch Wave 12 (Phases 62-68)

### Overview

Wave 12 resolves the 13 tech-debt items the v1.6 milestone audit carried forward (`.planning/milestones/v1.6-MILESTONE-AUDIT.md`, frontmatter `tech_debt:`, 13 items in 6 groups), investigated on 2026-11-20 at `8b22bd66`. Every item ends with a change or a recorded decision, so none is carried again. Nothing is added to the public API, and no dependency, tool or version changes. The first phase closes a class of check that cannot fail: `not.toBeCallableWith` passes for any `Effect`- or `Stream`-returning subject, and the research traced it to `@effect/language-service`'s `floatingEffect` diagnostic on tstyche's synthesized bare call (81 code pins in 27 files; exactly one is vacuous today, `DecisionLog.tst.ts:30`), so Phase 62 fixes the cause, rewrites the pin, controls eleven more and adds a gate. Phase 63 extends the packed-install gate (`scripts/check-package-install.mjs`) to the three public names v1.6 added and never compiled through the packed `exports` map. Phases 64 to 67 are the behaviour and robustness items: a shared devtools store that calls every listener (64), an `Admitted` only `admit` can build (65, bench-gated), a decoder projection that reads only declared keys (66, bench-gated) and two equivalent mutants plus a magic race bound removed (67). Phase 68 is last: hygiene, recorded close-outs and the milestone's stale-verification sweep. Base commit `8b22bd66` (the head of `arch-wave-11` after v1.6 was archived; not merged, not released), branch `arch-wave-12`, stacked on `arch-wave-11`. Read `.planning/phases/_SHARED-CONTEXT.md`, then `.planning/phases/_WAVE12-CONTEXT.md` (owner decisions D1 to D9, reserved ids, per-phase evidence), then `.planning/research/SUMMARY.md`. Each planner re-verifies that evidence against its own phase base before planning.

**The seven phases and their order are fixed (2026-11-20).** Nothing is added, merged, split or reordered.

**Standing direction (user, unchanged):** the cleanest design wins, not the simplest, and the project is not in production. This milestone expects no public break: a `@qadi/devtools` patch changeset (Phase 64) and a `@qadi/core` patch changeset (Phase 66) are the only changesets. Nothing is released or published, no version-packages PR is merged, and the branch is not merged.

Order: the check that cannot fail (62), the gate that protects v1.6's new names (63), then the behaviour phases (64 to 67), then hygiene and close-outs (68). **Execution order: phases run strictly one at a time, in numeric order (62 → 68).** Every records plan edits the same spec registers (CCR tail, invariants, traceability, `index.yaml`, `overview.md`, behaviour docs) and `use_worktrees` is false. Phases 62 and 63 are the cut point that protects what v1.6 ships: the v1.6 PR may be cut after 63 if the owner asks, so neither depends on Phases 64 to 68 or carries a changeset.

**Owner decisions** (`_WAVE12-CONTEXT.md`, asked once on 2026-11-20 and locked; a planner does not reopen them):

| Decision | Phase | What it fixes |
|----------|-------|---------------|
| D1 | 64 | A throwing `subscribe` listener no longer stops the others: every listener is called, one error is rethrown as-is after the loop, several as one `AggregateError`; nothing is swallowed |
| D2 | 66 | The hydration payload keeps `unknownKeys: "refuse"`; ADR-QD-170's D-09 report is resolved by recording why; `packages/react/src` is unchanged |
| D3 | 68 | Port cards stay package-private; an ADR-QD-173 amendment records why and that a headless consumer reads the diagnostics feed; no export is added |
| D4 | 66 | `project` reads only the declared keys (and the `_tag` its key selection needs), so an undeclared accessor is never invoked; not a wording-only fix |
| D5 | 67 | The two equivalent mutants are restructured away; no `// Stryker disable` convention is introduced |
| D6 | 62 | Fix the cause (a tstyche-only tsconfig turning `floatingEffect` off), rewrite `DecisionLog.tst.ts:30`, control the 11 uncontrolled pins and add `NOT_CALLABLE_PIN_BUDGET` |
| D7 | 64 | The publish-between-`begin()`-and-`fork()` window is out of scope; the CCR row says so and the README keeps a narrowed, accurate caveat |
| D8 | 68 | Fix all stale wording: the 10 plan-local ids in `StoredEnvelope.test.ts` and `Source.test.ts` :186, :291, :306 where they describe the same concept, proven by a compiler-based comparison to touch only titles and comments |
| D9 | 68 | Re-wrap ADR-QD-174 lines 73, 75 and 94 in one `spec-revise` bump; the Change History table row stays |

**Every phase** carries the seven cross-cutting requirements (WX-01, WX-02, WX-03, WX-04, WX-05, WX-06, WX-07): `pnpm check:pr < /dev/null` green at the end (ten silent minutes means hung); ADR (or "Unused" in its CCR row), CCR, BEH/INV and traceability records using only reserved numbers, never `node scripts/next-id.mjs`; `spec/overview.md` names every added export and drops every removed one (gate 13; this milestone expects none); no new `as`, `!`, `any`, `switch`, `Effect.fnUntraced`, `async`/`await`, ambient `console`/`process.env`/clock, `Record<string, unknown>` or `// Stryker disable`, and a budget changes only together with its AGENTS.md table; coverage held (core at least 95 percent, the others at least 90) and per-file Stryker scores recorded in the first plan (`NN-mutation-base.json`, the same invocation at the base and the close) and compared in the last, a drop closed with a test and never re-baselined; a characterisation or regression test written on the phase base before any behaviour change (RED for a defect, green for preserved behaviour) and every new check shown failing once; no D-numbers, plan-local ids or phase numbers in shipped source, test titles or BDD scenarios. Process: Stryker never runs beside vitest and Stryker steps are serialised across plans, every command takes `< /dev/null`, `grep` is aliased so use `/usr/bin/grep`, a verify command needs a positive twin on the base, and a stray probe file is never committed. A record's plan is the phase's last plan, so a re-opened phase does not re-bump a register.

**Soft edges** (from `_WAVE12-CONTEXT.md` and the research; serial order covers all of them):

| Edge | Strength | Reason |
|------|----------|--------|
| 62 → 65, 66 | hard | their new pins must be written in the corrected form; 65's construction pin must not be a raw negative callable form |
| 62 → 63, 64, 67 | soft | later phases that add a pin use the corrected form; 67 needs 62 for ordering only |
| 62 + 63 | cut point | together they protect what v1.6 ships; neither depends on 64 to 68 and neither has a changeset |
| 65, 66 | benches | each owns a benchmark that cannot run beside any other work and is invalidated by any later executable edit |
| 67 → 68 | soft | 68's per-file mutation base is taken on the post-67 tree before its first re-wrap |
| 64, 65, 66 → 68 | soft | they edit files Phase 62's verification covers, so 68's sweep re-verifies Phase 62; 68 also re-wraps lines they could shift |

**Numbering reserved for v1.7** (the whole block is held in the shared reservation file, set to CCR 459, ADR 181, BEH 680, INV 382 on 2026-11-20; confirm a number is free by grepping `spec/`, `packages/`, `.changeset/` and `AGENTS.md` before using it; name an unused reservation "Unused:" in the phase's CCR row). Next free on `8b22bd66`: ADR-QD-175, CCR-QD-453, BEH-QD-646, INV-QD-369. Highest ARCH is ARCH-108; ARCH ids below 109 are never reused. ADR Document IDs equal the file number (gate 10).

| Phase | ARCH | ADR-QD | CCR-QD | BEH-QD | INV-QD |
|---|---|---|---|---|---|
| 62 | 109 | 175 | 453 | 646–650 | 369–370 |
| 63 | 110 | 176 | 454 | 651–655 | 371–372 |
| 64 | 111 | 177 | 455 | 656–660 | 373–374 |
| 65 | 112 | 178 | 456 | 661–665 | 375–376 |
| 66 | 113 | 179 | 457 | 666–670 | 377–378 |
| 67 | 114 | 180 | 458 | 671–675 | 379–380 |
| 68 | 115 | 181 | 459 | 676–680 | 381–382 |

**Out of scope** (recorded, not planned): making `portCards` public (D3); `unknownKeys: "ignore"` for the hydration payload (D2); re-wrapping every over-width line (only the audit's named lines and D9's ADR siblings, because AGENTS.md §17 gates nothing); upgrading tstyche, TypeScript or any dependency; an upstream tstyche or Effect language-service issue (posts outside, needs the owner's explicit OK); guarding the devtools feeds' publish-between-`begin()`-and-`fork()` window (D7); aligning `@qadi/react`'s swallowing gate registry with D1; merge, release or publish.

### Phases

- [x] **Phase 62: Type pins that can fail** - A negative callable pin on an `Effect`- or `Stream`-returning function can fail for valid arguments, the one vacuous pin is rewritten, every remaining pin is controlled, and a gate keeps the count exact (ARCH-109, tests and gate) (completed 2026-11-20)
- [x] **Phase 63: The packed-install gate probes every new public name** - Gate 14's consumer compiles and runs `makeGatesFeed`, `makeDiagnosticsFeed` and a typed `DecisionCacheShape` host cache, and fails if a `make*Feed` export is left unprobed (ARCH-110, script) (completed 2026-11-20)
- [x] **Phase 64: One throwing listener cannot silence the rest** - Devtools' `ExternalStore` calls every listener, then rethrows what was thrown (ARCH-111, devtools; D1, D7) (completed 2026-11-20)
- [x] **Phase 65: Only `admit` builds an `Admitted`** - A private constructor and member make `admit` the only builder, and the `"asked"` row's flags are derived from the matcher context; bench-gated (ARCH-112, core) (completed 2026-11-20)
- [x] **Phase 66: The decoder reads only what it declares** - Under `ignore`, `project` reads only declared keys; hydration's `refuse` policy is recorded; bench-gated (ARCH-113, core; D2, D4) (completed 2026-11-20)
- [x] **Phase 67: No equivalent mutants, no magic race bound** - `DecisionCache`'s eviction and `SharedComputation`'s claim dispatch lose their equivalent mutants, and the I5 race test loses its step-count bound (ARCH-114, core; D5) (completed 2026-11-21)
- [ ] **Phase 68: Hygiene and recorded close-outs** - Named over-width lines, stale titles and ADR wrapping fixed; port cards recorded as private; two settled items evidenced; Phase 62 re-verified (ARCH-115; D3, D8, D9)

### Phase Details

### Phase 62: Type pins that can fail

**Goal**: A negative `not.toBeCallableWith` pin can fail for valid arguments whatever the subject returns, every negative callable pin that remains is either reason-stated or controlled by a positive pin, and a gate keeps their count from drifting.
**Depends on**: Nothing in v1.7 (first phase; serial order). Every later phase that writes a pin uses the form this phase corrects.
**Requirements**: PIN-01, PIN-02, PIN-03, PIN-04, PIN-05, WX-01, WX-02, WX-03, WX-04, WX-05, WX-06, WX-07
**Packages**: tests, `scripts/check-house-style.mjs`, `AGENTS.md`, a new tstyche-only tsconfig and `tstyche.json`; no `packages/*/src`
**Records**: ARCH-109; ADR-QD-175 (records D6: the tstyche configuration and the pin-classification rule; or named Unused in the CCR row); CCR-QD-453; BEH-QD-646 to 650; INV-QD-369 to 370; no changeset
**Settled by research (2026-11-20)**: the cause is not tstyche's matcher but `@effect/language-service`'s `floatingEffect` diagnostic. tstyche rewrites a pin to a bare call `(f)(a)` and reads any diagnostic as "not callable", and a bare `Effect` or `Stream` call is floating. Corrected counts: 81 code pins in 27 files (86 raw hits include 5 comments); exactly 1 is vacuous today (`DecisionLog.tst.ts:30`, which stays green if `environment` becomes optional), 12 return an `Effect` but are already wrapped in `Params<F>`, and 68 are honest; 11 negatives have no positive control. Flipping all 86 made 81 fail, which is not a classifier: classification is by the subject's return type. `scripts/check-house-style.mjs`'s `collect()` skips `.tst.ts`, so the new budget needs its own file walk.

**Success Criteria** (what must be TRUE):
  1. A committed characterisation `.tst.ts` pins tstyche's behaviour on this repo: with `floatingEffect` on, a negative `not.toBeCallableWith` on an `Effect`- and a `Stream`-returning subject passes for valid arguments; under the configuration this phase adds, the same pin fails for valid arguments.
  2. tstyche runs under a tsconfig that turns `floatingEffect` off, every `*.tst.ts` stays green, and a check fails when that tsconfig's Effect plugin settings drift from `tsconfig.base.json`'s apart from `floatingEffect`.
  3. `DecisionLog.tst.ts:30` states its reason through `Parameters<…>` (or an equivalent reason-checked form) and is shown failing once when `environment` is made optional; each of the 11 negative pins without a positive control gets a single-variable positive control in its file; the classification of all 81 code pins (subject, return type, control) is recorded in the phase directory.
  4. `NOT_CALLABLE_PIN_BUDGET` counts negative callable pins per `*.tst.ts` file in comment- and string-stripped code with its own file walk, is checked in both directions, has an AGENTS.md §6 paragraph and table the gate verifies, and is shown failing on an added pin, a removed pin, a commented pin and a line-split pin.

**Planning notes**: Probe first, before planning the file layout: whether `// @effect-diagnostics effect/floatingEffect:error` overrides a project-level `off` (unverified) decides whether the known-wrong control lives in a file that restores the rule by directive or the characterisation asserts the positive form on `Effect` and `Stream`. Build order from the research: characterisation file, classification record, rewrites package by package, the gate last (adding it first turns every intermediate commit red). D6 binds: the tstyche-only tsconfig is a child of `tsconfig.test.json` that restates the whole Effect `plugins` entry with `floatingEffect: "off"`, wired through `tstyche.json`, rather than 27 per-file directives (a line-level `-next-line` directive does not work: tstyche reports it "has no effect"). Open choices left to the planner: count-only budget plus a mechanical "positive count at least the negative count per budgeted file" check (recommended, with honest wording: a count cannot check "plain-return subject with a positive control") versus a per-pin marker comment; the replacement form where a reason matters (`@ts-expect-error <fragment>` on `void f(bad);` is reason-checked by tstyche, or `expect(f(bad)).type.toRaiseError(<code>)`, because `pnpm typecheck`'s tsgo does not read the directive's message). A pin must hold under both TypeScript 6.0.3 (tstyche) and 7.0.2 (tsgo); never write a bare `Effect` call. `not.toBeConstructableWith` is reason-blind (leave `Decision.tst.ts`'s nine as they are). Precedents for the gate's own walk: `[no-numbering-placeholder]` and `[metric-id-literal]`; count stripped code tokens so a multi-line pin counts once; use a unique AGENTS.md table header. No upstream issue without the owner's explicit OK.
**Plans**: 8/8 plans complete

Plans:
- [x] 62-01 (W1): Characterise tstyche's reading of a negative pin under each `floatingEffect` setting, give tstyche its own tsconfig with the rule off, and reword the five comments that describe the old reading (PIN-01, PIN-02, D-01..D-04).
- [x] 62-02 (W2): Rewrite `DecisionLog.tst.ts`'s pin through `Parameters<typeof makeDecisionLog>[0]`, shown failing with `environment` optional, and add a positive control beside each of the other ten uncontrolled negative pins (PIN-03, PIN-04).
- [x] 62-03 (W3): Flip-sweep every remaining negative pin once and record the classification of all 88 pins in the phase directory (PIN-04).
- [x] 62-04 (W4): `NOT_CALLABLE_PIN_BUDGET` with its own type-test walk, comment- and string-blanked counting, both directions, and the AGENTS.md section 6 table the gate checks (PIN-05).
- [x] 62-05 (W5): `[not-callable-control]` requires each negative pin's positive twin, and `[tstyche-plugin-drift]` holds the restated plugin entry to the base's (PIN-02, PIN-04).
- [x] 62-06 (W6): `scripts/run-tstyche.mjs` runs tstyche under each `floatingEffect` setting as `pnpm test:tstyche`, with the DoD, ADR-QD-037 and AGENTS.md updated (PIN-04).
- [x] 62-07 (W7): ADR-QD-175 and CCR-QD-453, traceability, the ADR-QD-037 amendment and the DoD revision (WX-02, WX-03).
- [x] 62-08 (W8): Close scan over the whole phase range, `pnpm check:pr`, the mutation record and PIN-01..05 complete (WX-01..WX-07).

### Phase 63: The packed-install gate probes every new public name

**Goal**: Gate 14's packed consumer compiles and runs every public name Phases 60 and 61 made public that it never touched (`makeGatesFeed`, `makeDiagnosticsFeed`, `DecisionCacheShape`), so a broken `exports` map entry or `.d.ts` for any of them fails the merge gate, and a future `make*Feed` export cannot be left unprobed.
**Depends on**: Phase 62 (serial order and the cut point; no shared source).
**Requirements**: PROBE-01, PROBE-02, PROBE-03, PROBE-04, PROBE-05, WX-01, WX-02, WX-03, WX-04, WX-05, WX-06, WX-07
**Packages**: `scripts/check-package-install.mjs` only (the consumer `FIXTURE` template literal); no `packages/*/src`
**Records**: ARCH-110; ADR-QD-176 (an ADR-QD-033 amendment suffices unless the derived guard is judged a new decision; otherwise named Unused in the CCR row); CCR-QD-454; BEH-QD-651 to 655; INV-QD-371 to 372; no changeset; the DoD table is unchanged (same `pnpm check` command), though AGENTS.md §16 and the step-14 paragraph each gain one sentence
**Settled by research (2026-11-20)**: the fixture imports from `@qadi/devtools` only `emptyTimeline, ingest, makeTimelineFeed, sourceFromRecords, verdictOf` and runs `makeTimelineFeed` once with fixed `Effect.yieldNow` turns and no clock. `DiagnosticsOptions` has no `schedule` option, only `intervalMillis` (the first read happens at once), so the context's "immediate schedule" wording is corrected. Type-only names have no runtime key, so the derived guard cannot cover them; the `tsc` run against the packed `.d.ts` is their guard. `check:fast` drops gate 14 and `check:pr` runs it.

**Success Criteria** (what must be TRUE):
  1. Gate 14 fails when any `make*Feed` runtime export of the packed `@qadi/devtools` root is not called in the consumer fixture (comments stripped, a call and not a mention); the guard is written first and shown RED on the phase base, where two names are unprobed.
  2. The fixture runs `makeGatesFeed` over a registry with one instance and asserts a read state that differs from the feed's initial snapshot, and runs `makeDiagnosticsFeed` and asserts a field only a completed first read sets, using a bounded yield loop with no wall clock and a closed scope.
  3. The fixture builds a typed host cache from the packed `DecisionCacheShape` that wraps `decisionCacheLayer()`, runs a decision twice through it and asserts a hit, and a `@ts-expect-error` refuses the pre-0.13 `(question, compute)` shape.
  4. A deliberately removed probe is shown failing gate 14, and the DoD table is unchanged.

**Planning notes**: Script only; this phase must not depend on Phases 64 to 68. Build order from the research: the guard first (RED: two names unprobed), then the probes (GREEN), then a recorded removed-probe failure, then records. Any "gate 14" in a record must name `scripts/check-package-install.mjs` (`scripts/check-dod-table.mjs` checks the numbers). The fixture is one `FIXTURE` template literal: escape backticks and `${`. Decisions left to the planner: the gates-feed assertion (recommended: a registry with one instance and assert `Read` with count 1; asserting `Unwatched` would be vacuous, since it is the initial value); the diagnostics loop (recommended: yield until the condition holds with a cap of 200, then fail with the observed state, close the scope so the 2000 ms default sleep is never awaited, and add a pin that `schedule` is refused; whether 20 fixed turns would suffice is unverified); host cache depth (recommended: run it twice and assert `calls` and a `hit`, delegating `getOrCompute`, `size` and `clear`, because a type-only proof proves less); and whether ADR-QD-176 is needed.
**Plans**: 5/5 plans complete

Plans:
**Wave 1**
- [x] 63-01-PLAN.md — the probe guard, alone and RED on the base (`makeDiagnosticsFeed, makeGatesFeed` uncalled; `DecisionCacheShape` neither typed nor refused), its fail-closed paths shown (a missing parser module included), mutation scope recorded empty

**Wave 2** *(blocked on Wave 1 completion)*
- [x] 63-02-PLAN.md — the three probes (gates feed, diagnostics feed, `DecisionCacheShape` host cache with the pre-0.13 refusal); gate 14 green

**Wave 3** *(blocked on Wave 2 completion)*
- [x] 63-03-PLAN.md — the removed and broken probes, each shown failing gate 14 in scratch copies (the host cache and the refused pre-0.13 literal apart), the DoD table unchanged

**Wave 4** *(blocked on Wave 3 completion)*
- [x] 63-04-PLAN.md — ADR-QD-033 amended, traced and registered as CCR-QD-454; one sentence each in AGENTS.md section 16 and the DoD

**Wave 5** *(blocked on Wave 4 completion)*
- [x] 63-05-PLAN.md — the close scan over the whole range, edge coverage, `pnpm check:pr`, PROBE-01..05 complete

### Phase 64: One throwing listener cannot silence the rest

**Goal**: A devtools `ExternalStore` calls every subscribed listener even when one throws and then rethrows what was thrown, so one failing listener (the React dock's `useStoreSnapshot` included) can no longer leave the others on a stale snapshot.
**Depends on**: Phase 63 (serial order only; no shared source). Soft edge to Phase 62 (any pin uses the corrected form).
**Requirements**: LSTN-01, LSTN-02, LSTN-03, LSTN-04, WX-01, WX-02, WX-03, WX-04, WX-05, WX-06, WX-07
**Packages**: `@qadi/devtools` (a **patch** changeset)
**Records**: ARCH-111; ADR-QD-177 (records D1 and amends ADR-QD-173's listener wording; or named Unused); CCR-QD-455 (states that the publish-between-`begin()`-and-`fork()` window is out of scope, D7); BEH-QD-656 to 660 (the BEH-QD-636 area in `spec/behaviors/28-devtools-screens.md` amended); INV-QD-373 to 374; the `@qadi/devtools` patch changeset
**Settled by research (2026-11-20)**: `packages/devtools/src/model/ExternalStore.ts` `notify` is `for (const listener of listeners) listener();`, so the first throw stops the loop. Thirteen importers in `packages/devtools/src` are enumerated (`TimelineFeed`, `GatesFeed`, `DiagnosticsFeed`, `DiagnosticsStore`, `DockModel`, `DockSession`, `SimulationSession`, `ExplorerSession`, `HeldChoice`, `TimelineStore`, `react/ServicesPanel`, `react/QuestionsPanel`, `react/useStoreSnapshot`). Phase 60 (WR-03) documented "a listener must not throw" on each feed's `subscribe`, in the devtools README and the "a feed that stops says so" line; those texts change with D1.

**Success Criteria** (what must be TRUE):
  1. Tests written on the phase base are RED: when one listener throws a later listener is still called; when two throw, one `AggregateError` carrying both is thrown; a single error is rethrown as the same value (including `undefined`); with no throw, behaviour is unchanged; subscribe- and unsubscribe-during-notify keep today's live-iteration semantics.
  2. `ExternalStore`'s notify calls every listener and then rethrows as criterion 1 states, and each of the three feeds (timeline, diagnostics, gates) is tested through `@qadi/devtools`' root.
  3. Every text that says a listener must not throw or is not isolated (the three feeds' `subscribe` docs, the `GatesFeed` module doc, the devtools README, the BEH text in `spec/behaviors/28-devtools-screens.md`) states the new contract and keeps an accurate caveat for the publish-before-fork window, which stays out of scope.
  4. The dock's `*.characterisation.test.tsx` files pass with an empty `git diff`, and a `@qadi/devtools` patch changeset records the change.

**Planning notes**: One three-line seam with all 13 importers enumerated, so no research phase is needed; the planner's one scope call is already made (D7). D1 and D7 bind. Mechanics from the research: collect thrown values in an array and decide by length, never "first error truthy" (`throw undefined` must work); rethrow a single error as the same value (reference-equal) and several as an `AggregateError` with a fixed, asserted message; iterate the live `Set` (a `[...listeners]` snapshot would change both removed-before-turn and added-during-notify behaviour) and pin both subscribe-during and unsubscribe-during; state is assigned before notify, as today. Texts to amend: `TimelineFeed.ts` `subscribe` docs, `DiagnosticsFeed.ts` (keep the poll-stop clause), `GatesFeed.ts` module doc, `devtools/README.md`, and the BEH at `spec/behaviors/28-devtools-screens.md`; re-grep the website's devtools page before editing (the research disagrees on whether it mirrors the README) and never touch `apps/website/dist/`. `TimelineFeed` nests stores, so an outer notify's error can be a thrown value inside an inner notify and a nested `AggregateError` can occur: decide, pin, do not flatten. `ExternalStore.ts` is in the devtools mutation set (break 80), so the `AggregateError` message literal and the length boundaries need asserts. React's behaviour on a thrown snapshot is unverified; the dock characterisation tests are the evidence. A test that asserts a message from a second throw may now see an `AggregateError` (none identified).
**Plans**: 5/5 plans complete
- [x] 64-01-PLAN.md
- [x] 64-02-PLAN.md
- [x] 64-03-PLAN.md
- [x] 64-04-PLAN.md
- [x] 64-05-PLAN.md

### Phase 65: Only `admit` builds an `Admitted`

**Goal**: An `Admitted` can be built only by `admit`, and the `"asked"` row's supplied flags are derived from the matcher context `admit` builds, so the question's resource is read for the flag and for the context from one place and the two agree by construction.
**Depends on**: Phase 64 (serial order only), and Phase 62 (hard: the construction pin must not be a raw negative callable form).
**Requirements**: ADMT-01, ADMT-02, ADMT-03, ADMT-04, WX-01, WX-02, WX-03, WX-04, WX-05, WX-06, WX-07
**Packages**: `@qadi/core` (`Admission.ts`, package-private per ADR-QD-099; no changeset)
**Records**: ARCH-112; ADR-QD-172 amended (its statement that the "asked" flags are pinned by tests becomes false); ADR-QD-178 only if a new decision is needed, else named Unused; CCR-QD-456; BEH-QD-661 to 665; INV-QD-375 to 376 (not worded as a compile-time guarantee for the flags)
**Opens on a benchmark** (the walk is a hot path and AGENTS.md §5a requires `pnpm bench` near budgeted switch #1): Phase 59's harness and bands, 3 + 3 interleaved on the committed source against the phase base, no workload slower beyond its band. `ab.sh` is hard-wired to `Evaluate.bench.ts`, which is correct for this phase. Any executable edit after a bench invalidates it, so the committed source is benched, any revert is a patch, and `uptime` is recorded.
**Settled by research (2026-11-20)**: `Admitted`'s constructor is public (`Admission.ts`, about line 81); `admit` (about line 97) builds it with `SUPPLIED[rowSource](question)` and a matcher context that both read `question.resource` separately, and their agreement is pinned only by tests (E1 to E5, `LeafMatrix.test.ts`). A private constructor alone still lets an object literal of the right shape type-check as `Admitted` (probed), so a private instance member is part of the change. `row` stays a constant `true`: `toPredicate` builds its question with `resource: undefined` on purpose, so it cannot derive. Probed: a static `admit` that names `Admitted` and never `this`, plus `export const admit = Admitted.admit`, gives no TS2883, keeps the generic, leaves `Walk.ts` (`admit(question, "asked")`) and `Predicate.ts` call sites unchanged and the `ADMISSION_ALLOWED` count at 1. No test does `new Admitted` today.

**Success Criteria** (what must be TRUE):
  1. A `@ts-expect-error` pin shows `new Admitted(…)` refused outside the class and an object literal of the same shape not assignable to `Admitted`, each with a positive control on `admit`, and both are RED on the phase base.
  2. `Admitted` has a private constructor and a private instance member, `admit` is its static method exported as `admit`, and the `Walk.ts` and `Predicate.ts` call sites are unchanged.
  3. The `"asked"` row's supplied flags are derived from the matcher context `admit` builds, the `"row"` row stays as it is, and E1 to E5 and `LeafMatrix.test.ts` pass unedited.
  4. A 3 + 3 interleaved benchmark of the committed source against the phase base, with Phase 59's harness and bands, shows no workload slower beyond its band.

**Planning notes**: Open choices left to the planner: the pin's wording (a short fragment such as `is private`, because only the TypeScript 6.0.3 message was observed and tsgo 7.0.2's wording is unverified, or `toRaiseError(2673)`, which holds even with bad arguments; the context fixes `@ts-expect-error`, so a code check is an addition, not a replacement); whether `declare private readonly …` works under this tsconfig (unverified) and that the existing `keyof Admitted` pins stay green (private members are excluded from `keyof`). 59a's RED is unverified: behavioural agreement already holds, so a value test cannot be RED, and the only candidate is an accessor-counting `Question.resource`; the compiler does not guard it either (`SuppliedBy.asked` has `boolean` fields), so say so in the INV. Do not use `not.toBeConstructableWith` (reason-blind). Scope any grep or gate to `packages/core/src/Admission.ts`: `packages/audit/src/CircuitBreaker.ts` has an unrelated `new Admitted(...)`. Keep the table shape so a new row source still fails to compile. Plan shape, RED first: the mutation base for `Admission.ts`, `Walk.ts` and `Predicate.ts` and the construction pins first; then the class; then the derivation; then the bench on the committed source; then records.
**Plans**: 6/6 plans complete
**Wave 1**
- [x] 65-01-PLAN.md — the mutation base, then both construction pins and the getter cases RED on the base

**Wave 2** *(blocked on Wave 1 completion)*
- [x] 65-02-PLAN.md — the private constructor, the nominal member and the static `admit`; each half shown necessary

**Wave 3** *(blocked on Wave 2 completion)*
- [x] 65-03-PLAN.md — the asked flags read from the matcher context `admit` builds once

**Wave 4** *(blocked on Wave 3 completion)*
- [x] 65-04-PLAN.md — the 3 + 3 bench of the committed source against the phase base

**Wave 5** *(blocked on Wave 4 completion)*
- [x] 65-05-PLAN.md — ADR-QD-172 amended, INV-QD-375/376, BEH-QD-661/662, traceability and CCR-QD-456

**Wave 6** *(blocked on Wave 5 completion)*
- [x] 65-06-PLAN.md — the Stryker close, the close scan, `check:pr` once, ADMT-01..04 complete

### Phase 66: The decoder reads only what it declares

**Goal**: Under `unknownKeys: "ignore"`, `untrustedDecoder`'s projection reads only the declared keys' values, so an undeclared accessor on an in-process value is never invoked, and the hydration payload's `refuse` policy is recorded as decided.
**Depends on**: Phase 65 (serial order only), and Phase 62 (hard: any new pin is written in the corrected form).
**Requirements**: DECL-01, DECL-02, DECL-03, DECL-04, WX-01, WX-02, WX-03, WX-04, WX-05, WX-06, WX-07
**Packages**: `@qadi/core` (a **patch** changeset); `@qadi/react` is read, not edited (`git diff -- packages/react/src` is empty)
**Records**: ARCH-113; ADR-QD-170 amended (D-19 wording scoped to the projection under `ignore`, D-09 resolved by D2's reasoning); ADR-QD-179 only if a new decision is needed, else named Unused; CCR-QD-457; BEH-QD-666 to 670; INV-QD-377 to 378; the `@qadi/core` patch changeset; `UNTRUSTED_DECODE_BUDGET` and AGENTS.md §7a's table unchanged (no token moves)
**Opens on a benchmark**: a decode micro-benchmark of the `ignore`-seam workloads, with its band fixed before measuring (see the notes).
**Settled by research (2026-11-20)**: `UntrustedDecode.ts` (about line 166) documents `project` as "It reads no value, so it cannot recurse", but `Object.entries(input)` (about line 171) invokes every own enumerable getter, declared or not, before `keysOf` filters; this is true for `JSON.parse` output and false for the in-process values the `decodeSinkRecord` family accepts. ADR-QD-170 D-19 repeats the sentence. The claim holds only under `ignore`: `walked()` (when `unwalked` is non-empty) and `exceedsJsonDepth` still read every own getter under `refuse`. The two `ignore` seams are `sinkWire` (`SinkCodec.ts`, about line 501) and `storedWire` (about line 603).

**Success Criteria** (what must be TRUE):
  1. A RED test on the phase base shows that decoding an in-process value with an undeclared throwing getter under `unknownKeys: "ignore"` invokes that getter, directly and through both `ignore` seams in `SinkCodec.ts`; after the phase the same tests are GREEN.
  2. The projection reads only own key names, then each declared key's value once (and the `_tag` its key selection needs), and the doc and ADR-QD-170 D-19 wording are scoped to the projection under `ignore`, stating what `refuse` and `unwalked` still read.
  3. The hydration payload keeps `unknownKeys: "refuse"`, pinned by a test that an unknown top-level key is refused (added if none exists), an ADR-QD-170 amendment records why, and `packages/react/src` is unchanged.
  4. A decode benchmark of the `ignore`-seam workloads, with its band fixed before measuring, shows no regression beyond that band; `UNTRUSTED_DECODE_BUDGET` is unchanged; a `@qadi/core` patch changeset records the change.

**Planning notes**: D2 and D4 bind. Research flag: probe the bench harness and the claim's scope before planning. Mechanics: `project` takes `Object.keys(input)` (names only, own enumerable), filters by the declared set and reads each kept value once; `keysOf` reads `_tag` instead of taking the entries array; change `UntrustedDecode.ts` and `EnvelopeKeys.ts` in one commit; no `Record<string, unknown>`, no `as`. Do not widen the code change to `walked()` or `exceedsJsonDepth` without the owner: the ADR amendment and the doc must instead scope the sentence and say what `refuse` plus `unwalked` do, or they repeat the overclaim one level down. Bench: `ab.sh` and `analyze.mjs` are Evaluate-specific (the analyzer refuses input missing two Evaluate keys), so parameterise a copy or interleave manually; the policy decoder group does not exercise `project`, so use the `decodeSinkRecord` and stored-envelope workloads plus a new `ignore` row in `UntrustedDecode.bench.ts`, and fix a tighter band (or a geomean limit) before the result is known, because a 10 percent band can hide a real 8 percent regression. Stryker: build decoders inside `it` bodies (module-scope decoders are `Ignored` as static); take a static evidence run with `ignoreStatic: false` from a config kept outside the repo and never edit `stryker.config.mjs`; `EnvelopeKeys.ts` is 58/58 and `UntrustedDecode.ts` 41/43 with two pre-existing survivors. Whether a declared getter is read once today is unverified: measure before stating the requirement. Check whether a test already pins an unknown top-level hydration key as `MalformedPayload` (BEH-QD-488 area, `spec/behaviors/19-hydration.md`) before adding one. Do not edit `StoredEnvelope.test.ts` (a pinned characterisation file; Phase 68 owns its wording).
**Plans**: 5/5 plans complete
**Wave 1**
- [x] 66-01-PLAN.md — the mutation base, then the ignore projection's accessor reads RED on the base (8 of 127), H1 cited

**Wave 2** *(blocked on Wave 1 completion)*
- [x] 66-02-PLAN.md — the projection reads names, then each declared value once; the sink codec's comments; the variants

**Wave 3** *(blocked on Wave 2 completion)*
- [x] 66-03-PLAN.md — the parameterised harness, the ignore bench rows, the 3 + 3 bench of record against the phase base

**Wave 4** *(blocked on Wave 3 completion)*
- [x] 66-04-PLAN.md — ADR-QD-170 amended, INV-QD-377, BEH-QD-666, traceability and CCR-QD-457; the `@qadi/core` patch changeset

**Wave 5** *(blocked on Wave 4 completion)*
- [x] 66-05-PLAN.md — the Stryker close and static evidence, the close scan, `check:pr` once, DECL-01..04 complete

### Phase 67: No equivalent mutants, no magic race bound

**Goal**: `DecisionCache`'s eviction and `SharedComputation`'s claim dispatch have no branch whose mutant is equivalent or surviving for want of a check, and the I5 race test finds both orderings without a bound tied to `walk`'s step count.
**Depends on**: Phase 66 (serial order only), and Phase 62 (ordering only).
**Requirements**: MUTE-01, MUTE-02, MUTE-03, MUTE-04, WX-01, WX-02, WX-03, WX-04, WX-05, WX-06, WX-07
**Packages**: `@qadi/core` (`DecisionCache.ts`, `SharedComputation.ts`, `DecisionCache.test.ts`); behaviour-neutral, no changeset
**Records**: ARCH-114; ADR-QD-180 (likely named Unused in the CCR row); CCR-QD-458; BEH-QD-671 to 675; INV-QD-379 to 380; no changeset
**Settled by research (2026-11-20)**: `DecisionCache.ts` (about line 287) has `if (Option.isSome(oldest)) entries = HashMap.remove(entries, oldest.value);` whose guard a comment says the loop condition makes impossible; `SharedComputation.ts` (about line 319) returns `{ _tag: "Claimed", entry }` and the mutant survives because the only check is `claimed._tag === "Hit"`; `DecisionCache.test.ts` (about line 1250) loops `for (let gap = 0; gap <= 48; gap++)`, a bound that depends on `walk`'s step count. Phase 61's scores are the floor: `DecisionCache.ts` 0.977, `SharedComputation.ts` 0.986, `Lifecycle.ts` 1.000. `SharedComputation.ts` is not in `SWITCH_BUDGET` and no `switch` is added.

**Success Criteria** (what must be TRUE):
  1. `DecisionCache.ts`'s eviction has no branch that cannot be taken, FIFO order and capacity validation are unchanged, and the former surviving mutant no longer exists or is killed.
  2. `SharedComputation.ts`'s claim result is dispatched closed, so mutating any of its tags (`"Claimed"`, `"Hit"`, `"Joined"`) is killed; the form is chosen after a `DecisionCache.bench.ts` measurement, and no `switch` or `// Stryker disable` is added.
  3. The I5 race test iterates until both orderings are observed at every budget, with a cap that fails loudly, a margin past the first flip, and no number tied to `walk`'s step count; it is shown RED with the I5 fix temporarily reverted.
  4. The Stryker scores of `DecisionCache.ts`, `SharedComputation.ts` and `Lifecycle.ts` do not fall below Phase 61's (0.977, 0.986, 1.000), and both named survivors are gone.

**Planning notes**: D5 binds. Research flag: measure before choosing a dispatch form. Eviction candidate: `Chunk.splitAt(insertionOrder, HashMap.size(entries) - capacity)` (clamps negative and oversize counts) then `HashMap.removeMany`, with `import * as Option` removed in the same commit; it has no throwing accessor and no impossible branch (a throwing accessor such as `Chunk.getUnsafe` has no place in an authorization path, AGENTS.md §4, and `Chunk.isNonEmpty(...) &&` added to the loop condition would re-create an equivalent mutant). Stryker was not run on any form, so the per-file compare is the check. Dispatch: `Match.value(claimed).pipe(Match.tagsExhaustive(...))` per call cannot be hoisted (`A` and `E` are generic in `run`) and AGENTS.md §5a measured `Match.value` rebuilt per call at 3.5 to 7.7 times a `switch`, so bench `DecisionCache.bench.ts` 3 + 3 before choosing `Match` over a closed `if` and narrowing or an own-property arm table (as `FieldLattice.ts` does); the owner arm is about 70 lines of `forkDetach`/`onExit` and must be extracted to a local function; keep the hit check inside the one synchronous claim step (ARCH-45 I5). Race loop: both orderings per budget (not overall), a cap of 512 that fails naming the budget and the counts, a margin of two or three gaps past the first flip (today's sweep also asserts no recompute and exact FIFO on every run, so stopping at the flip would lose that unless the per-run assertions are kept), the `:1248-1249` "re-measure" comment deleted, runtime measured (up to 2048 iterations against 192 today, and Stryker runs this test for many mutants with `timeoutMS: 20000`) and kills re-checked under per-test coverage. Acceptance for the loop: temporarily split the hit check from the claim (the pre-I5 shape), confirm RED, restore.
**Plans**: 7/7 plans complete
**Wave 1**
- [x] 67-01-PLAN.md — the mutation base of the three files and the fixed scorer; the race test sweeps each budget until it sees both sides (cap 512, margin 3), RED with the hit check split

**Wave 2** *(blocked on Wave 1 completion)*
- [x] 67-02-PLAN.md — the parameterised harness and a capacity-bound bench row, both dispatch candidates measured 3 + 3, and the form the fixed rule takes

**Wave 3** *(blocked on Wave 2 completion)*
- [x] 67-03-PLAN.md — the eviction as one `Chunk.splitAt` and one `HashMap.removeMany`, with no branch, the `Option` import and the loop's comments gone

**Wave 4** *(blocked on Wave 3 completion)*
- [x] 67-04-PLAN.md — the claim dispatched closed in the chosen form, every arm a call, the claim step unchanged; every tag mutant killed by hand

**Wave 5** *(blocked on Wave 4 completion)*
- [x] 67-05-PLAN.md — the 3 + 3 bench of record of the final source against the phase base

**Wave 6** *(blocked on Wave 5 completion)*
- [x] 67-06-PLAN.md — BEH-QD-166's reasons, INV-QD-379, traceability and CCR-QD-458 (ADR-QD-180 Unused), the register red then green

**Wave 7** *(blocked on Wave 6 completion)*
- [x] 67-07-PLAN.md — the Stryker close and static evidence, the close scan, `check:pr` once, MUTE-01..04 complete

### Phase 68: Hygiene and recorded close-outs

**Goal**: The v1.6 audit's remaining wording and record items are fixed or recorded with evidence, and the milestone's stale verification is swept, so nothing from the audit is carried forward again.
**Depends on**: Phases 62 to 67 (last: it re-wraps lines Phases 64 to 67 could shift, edits the same spec registers, and re-verifies Phase 62).
**Requirements**: HYGN-01, HYGN-02, HYGN-03, HYGN-04, HYGN-05, HYGN-06, HYGN-07, WX-01, WX-02, WX-03, WX-04, WX-05, WX-06, WX-07
**Packages**: `@qadi/core` and `@qadi/devtools` (tests, comments and one over-width source line only), `spec/`, `features/`; no changeset, no behaviour change
**Records**: ARCH-115; ADR-QD-173 amended (D3); ADR-QD-174 re-wrapped by `spec-revise` (D9); ADR-QD-181 likely named Unused; CCR-QD-459 (records the unused ids and the two no-op confirmations); BEH-QD-676 to 680; INV-QD-381 to 382
**Settled by research (2026-11-20)**: the `DecisionLog` `ingest` doc already names the uncontained defect path (`DecisionLog.ts:126-129`, ADR-QD-171), and `QadiAtoms.test.ts:570` is already clean; the Phase 61 `Simulator.test.tsx` diff (`d0ca3df6`) is two comment lines. Both are recorded as "confirmed, no edit". Over-width lines measured: `SinkCodec.ts:616` (137 characters) and `decision-log.steps.test.ts:197` (135); the `DecisionLog.ts` line named by 58-REVIEW IN-02 has moved and is located by content.

**Success Criteria** (what must be TRUE):
  1. The three over-width lines the v1.6 audit names (`SinkCodec.ts`, `decision-log.steps.test.ts`, and the `DecisionLog.ts` line from 58-REVIEW IN-02) are hand-wrapped, with a per-file mutation base taken on the post-Phase-67 tree before the first edit and scores not falling.
  2. All stale wording is fixed (D8): the 10 plan-local ids in `StoredEnvelope.test.ts` and the "stamp" wording in `Source.test.ts` where it means the same concept (:186, :291, :306), proven by a compiler-based comparison to change only titles and comments.
  3. ADR-QD-174 lines 73, 75 and 94 are re-wrapped in one `spec-revise` bump (D9), and an ADR-QD-173 amendment records that port cards stay package-private and that a headless consumer reads the diagnostics feed's reading (D3), with no export added (`pnpm spec:api` stays at 939 and `git diff -- packages/devtools/src/index.ts` is empty).
  4. The two settled items are recorded with evidence and no source edit: the `DecisionLog` `ingest` doc names the uncontained defect path, and `Simulator.test.tsx`'s Phase 61 diff (`d0ca3df6`) is comments only, in a new file in the Phase 61 archive directory.
  5. The milestone's stale-verification sweep re-verifies Phase 62 at least, since Phases 64 to 66 edit files it covers.

**Planning notes**: D3, D8 and D9 bind. Take a fresh per-file `68-mutation-base.json` on the post-67 tree before the first re-wrap: the harness keys mutant ids on line text and Phases 64 to 67 will have moved files. Change only the named over-width lines (many more exceed 100 and AGENTS.md §17 gates nothing). `StoredEnvelope.test.ts` is a pinned characterisation file: the header (lines 1 to 14) must stop claiming no row reads the in-memory shape while N1 to N4 do, and the edit is comments and titles only with every assertion kept. Read `Source.test.ts` :186 and :306 in context before deciding; `spec/behaviors/26-decision-stream.md:406` (an amendment quoting the old requirement) and `SinkCodec.test.ts:2233` (a different test) keep their wording unless the owner says otherwise. A title is program text, so prove "titles and comments only" with a compiler-based comparison (`ts.transpileModule` with `removeComments: true`, title strings masked, same test counts before and after), not a regex strip; 61d uses the same method and its proof goes in a new file in the Phase 61 archive directory (editing a Phase 61 SUMMARY, PLAN or the archived `61-scan.mjs` would stale its verification). D3's wording is written from `DockModel.ts` (about lines 255-263) and `PortCards.ts` (about lines 28-34): the inputs come from the diagnostics reading, `isUnsampled` is not exported, no "same view" promise; confirm `WiringRead`, `PortActivity` and `PortCallLog` are root exports before writing any fence (unverified), and make any code a `typescript` fence so `pnpm spec:examples` compiles it. D9: the 315-character Change History row at ADR-QD-174's line 13 is a table row and stays. The sweep checks verification trailers and `nyquist_compliant` at close; Phase 62's covered set (about 27 `.tst.ts` files, `check-house-style.mjs` and AGENTS.md) is edited by Phases 64 to 66. Records go in the last plan.
**Plans:** 3/15 plans executed
**Wave 1**
- [x] 68-01-PLAN.md — `spec-revise` keeps its first argument (OI-18, the phase's first commit), the one shared A/B bench harness (OI-24), and the phase's mutation scorer, compiler comparison and staleness check

**Wave 2** *(blocked on Wave 1 completion)*
- [x] 68-02-PLAN.md — the per-file mutation base of the six source files the phase edits, on the post-67 tree before any edit

**Wave 3** *(blocked on Wave 2 completion)*
- [x] 68-03-PLAN.md — every behaviour test written on the unchanged tree, RED where it pins a defect (OI-11, OI-12, OI-13), with the red and characterisation evidence

**Wave 4** *(blocked on Wave 3 completion)*
- [ ] 68-04-PLAN.md — every source change: a capacity change's publish stops no read (OI-09, OI-03), `admit` reads each field once, the comment-only fixes (OI-02, OI-04) and the three over-width lines wrapped (HYGN-01)

**Wave 5** *(blocked on Wave 4 completion)*
- [ ] 68-05-PLAN.md — the bench of record of the committed source against the phase base on the shared harness, under the quiet-host rule (OI-10)

**Wave 6** *(blocked on Wave 5 completion)*
- [ ] 68-06-PLAN.md — the stale test wording (HYGN-02, OI-08, OI-14), each proven by compiler comparison

**Wave 7** *(blocked on Wave 6 completion)*
- [ ] 68-07-PLAN.md — the characterisation's readings, the projection's accessors, the admit pins and the supplied trace (OI-01, OI-05, OI-06, OI-07)

**Wave 8** *(blocked on Wave 7 completion)*
- [ ] 68-08-PLAN.md — `test:tstyche` file filters, house-style's JSONC and duplicate-row reads, and the packed-install guard (OI-15 to OI-17, OI-19 to OI-21)

**Wave 9** *(blocked on Wave 8 completion)*
- [ ] 68-09-PLAN.md — the completed phases' record scripts fixed where their records still pass (OI-22, OI-23, OI-25)

**Wave 10** *(blocked on Wave 9 completion)*
- [ ] 68-10-PLAN.md — ADR-QD-174 re-wrapped (HYGN-03), ADR-QD-173 amended (HYGN-04), and the decisions, behaviours, invariants and traceability the phase's code changed

**Wave 11** *(blocked on Wave 10 completion)*
- [ ] 68-11-PLAN.md — CCR-QD-459 (records OI-26 to OI-29), the settled items confirmed in Phase 61's archive (HYGN-05), the one `@qadi/devtools` patch changeset

**Wave 12** *(blocked on Wave 11 completion)*
- [ ] 68-12-PLAN.md — the mutation close of the six edited files against the base, and the close scan

**Wave 13** *(blocked on Wave 12 completion)*
- [ ] 68-13-PLAN.md — the staleness of Phases 62 to 67 recorded, and Phase 62 re-verified fully (HYGN-06)

**Wave 14** *(blocked on Wave 13 completion)*
- [ ] 68-14-PLAN.md — Phases 63, 64 and 65 re-verified (HYGN-06)

**Wave 15** *(blocked on Wave 14 completion)*
- [ ] 68-15-PLAN.md — Phases 66 and 67 re-verified, `check:pr` once, HYGN-01..07 complete, and the OI-01..29 map

### Progress (v1.7)

**Execution Order:**
Phases execute in numeric order: 62 → 63 → 64 → 65 → 66 → 67 → 68

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 62. Type pins that can fail | 8/8 | Complete    | 2026-11-20 |
| 63. The packed-install gate probes every new public name | 5/5 | Complete    | 2026-11-20 |
| 64. One throwing listener cannot silence the rest | 5/5 | Complete    | 2026-11-20 |
| 65. Only `admit` builds an `Admitted` | 6/6 | Complete    | 2026-11-20 |
| 66. The decoder reads only what it declares | 5/5 | Complete    | 2026-11-20 |
| 67. No equivalent mutants, no magic race bound | 7/7 | Complete    | 2026-11-21 |
| 68. Hygiene and recorded close-outs | 3/15 | In Progress | - |
