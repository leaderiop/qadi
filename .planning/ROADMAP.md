# Roadmap: Qadi

## Milestones

- ✅ **v1.0 Arch Wave 5** — Phases 1-9 (shipped 2026-11-09) — [archive](milestones/v1.0-ROADMAP.md)
- 🚧 **v1.1 Arch Wave 6** — Phases 10-20 (all phases complete 2026-11-10; merged to `main` in #155; not archived as a GSD milestone; not released)
- ✅ **v1.2 Arch Wave 7** — Phases 21-29 (completed 2026-11-12; not released) — [archive](milestones/v1.2-ROADMAP.md)
- ✅ **v1.3 Arch Wave 8** — Phases 30-36 (completed 2026-11-13; not released) — [archive](milestones/v1.3-ROADMAP.md)
- ✅ **v1.4 Arch Wave 9** — Phases 37-42 (completed 2026-11-14; not released) — [archive](milestones/v1.4-ROADMAP.md)
- ✅ **v1.5 Arch Wave 10** — Phases 43-52 (completed 2026-11-16; not released) — [archive](milestones/v1.5-ROADMAP.md)
- ✅ **v1.6 Arch Wave 11** — Phases 53-61 (completed 2026-11-19; not released) — [archive](milestones/v1.6-ROADMAP.md)
- ✅ **v1.7 Arch Wave 12** — Phases 62-68.1 (completed 2026-11-22; not released) — [archive](milestones/v1.7-ROADMAP.md)
- 🚧 **v1.8 Arch Wave 13** — Phases 69-76 (in progress)

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

<details>
<summary>✅ v1.7 Arch Wave 12 (Phases 62-68.1) — COMPLETED 2026-11-22 (not released)</summary>

- [x] Phase 62: Type pins that can fail, ARCH-109 (8/8 plans) — completed 2026-11-20
- [x] Phase 63: The packed-install gate probes every new public name, ARCH-110 (5/5 plans) — completed 2026-11-20
- [x] Phase 64: One throwing listener cannot silence the rest, ARCH-111 (devtools patch) (5/5 plans) — completed 2026-11-20
- [x] Phase 65: Only `admit` builds an `Admitted`, ARCH-112 (benchmark gate passed) (6/6 plans) — completed 2026-11-20
- [x] Phase 66: The decoder reads only what it declares, ARCH-113 (core patch; benchmark gate passed) (5/5 plans) — completed 2026-11-20
- [x] Phase 67: No equivalent mutants, no magic race bound, ARCH-114 (7/7 plans) — completed 2026-11-21
- [x] Phase 68: Hygiene and recorded close-outs, ARCH-115 (15/15 plans) — completed 2026-11-21
- [x] Phase 68.1: Address tech debt, DEBT-01..06 (INSERTED after the first audit) (9/9 plans) — completed 2026-11-22

Full details: [milestones/v1.7-ROADMAP.md](milestones/v1.7-ROADMAP.md) · requirements:
[milestones/v1.7-REQUIREMENTS.md](milestones/v1.7-REQUIREMENTS.md) · audit:
[milestones/v1.7-MILESTONE-AUDIT.md](milestones/v1.7-MILESTONE-AUDIT.md)

</details>

## 🚧 v1.8 Arch Wave 13 (Phases 69-76)

### Overview

Wave 13 resolves the eight candidates of the 2026-11-22 architecture review, one phase each, strictly serial, and every candidate ends in a change or a recorded decision. `.planning/phases/_WAVE13-CONTEXT.md` is authoritative for per-phase evidence (taken at `2716def4`), owner decisions and reserved ids; the review HTML is session-scoped and may be gone. **Three candidates are live defects and go first**, each opening with a regression test seen RED on its phase base. Phase 69: only one of six inline "thrown value to message" copies is total, so `JsonHazard`, `PortKey`, `PortDerivation` and `PortWireEncode` let a hostile thrown value escape functions documented as "never throws" or "refused, never thrown" (probed 2026-11-22 against the installed `effect`), and `CustomPredicate` guards only half. Phase 70: a hydration drop reason can gain a bucket and never be reported or counted, which breaks INV-QD-045 with no compile error. Phase 71: `makeGateRegistry({ onIdCollision })` with a throwing reporter reports a message naming `"onGateIdCollision"`, an option the caller never passed. Phases 72 to 74 are the three deepenings (a derived store behind the dock model's stores, one pure `reconcile` for gate registration, the simulation session's policy choice split from its runs). Phase 75 is the one change tracers will see (a declared span shape for the `qadi.evaluate` family), so it opens on a human checkpoint. Phase 76 is speculative (Remedies uses core's signature match) and may end in a recorded rejection with no code change. Branch `arch-wave-13`, based on `main` at `2716def4` (v1.6 + v1.7 merged as #163; not released); the planning base is `5e68b104`.

**The eight phases and their order are fixed (2026-11-22).** Nothing is added, merged, split or reordered.

**Standing direction (user, unchanged):** the cleanest design wins, not the simplest, and the project is not in production, so compatibility is never the tiebreaker. This milestone expects no public API change except Phase 75's span keys (which need a `@qadi/core` changeset) and possibly one export in Phase 76 (WX-03). Nothing is released or published, no version-packages PR is merged, and the branch is not merged.

Order: the three live defects (69 to 71), the three deepenings (72 to 74), the change tracers will see (75, human checkpoint), then the speculative item (76). **Execution order: phases run strictly one at a time, in numeric order (69 → 76).** Every records plan edits the same spec registers (CCR tail, invariants, traceability, `index.yaml`, `overview.md`, behaviour docs) and `use_worktrees` is false, so each phase depends on the previous one.

**Owner decisions** (`_WAVE13-CONTEXT.md`):

| Decision | Phase | What it fixes |
|----------|-------|---------------|
| D1 | all | All eight review candidates become phases, including the speculative Phase 76 (asked 2026-11-22; locked) |
| D2 | all | Branch `arch-wave-13` off `main` at `2716def4`; no merge, no release (asked 2026-11-22; locked) |
| to ask | 70 | At the discuss step, once: whether the payload path (`refuse` reasons, ADR-QD-152's original subject) is folded into the same reason-keyed derivation or left as is |
| to ask | 75 | The human checkpoint, once: the outcome key (`qadi.decision` + `qadi.outcome` becoming one key, and its name) and whether the old keys stay for one release |
| to ask | 76 | At the discuss step, once: where core exposes "would this fixture signature satisfy this node" without exporting `SignatureMatch.ts` (ADR-QD-099), or a recorded rejection |

**Every phase** carries the seven cross-cutting requirements (WX-01, WX-02, WX-03, WX-04, WX-05, WX-06, WX-07): `pnpm check:pr < /dev/null` green at the end of each phase; its ADR (or "Unused" in its CCR row), CCR, BEH/INV and traceability records using only its reserved numbers, never `node scripts/next-id.mjs`; `spec/overview.md` names every added export and drops every removed one (gate 13; this milestone expects none, except possibly Phase 76); no new `as`, `!`, `any`, `switch`, `Effect.fnUntraced`, `async`/`await`, ambient `console`/`process.env`/clock, `Record<string, unknown>` or `// Stryker disable`, and a budget changes only together with its AGENTS.md table; coverage held (core at least 95 percent, the others at least 90) and the Stryker score of every touched file recorded per phase in `NN-mutation-base.json` (the same invocation at the phase base and at close), a drop closed with a test and never re-baselined; a characterisation or regression test written on the phase base before any behaviour change (RED for a defect, green for preserved behaviour) and every new check shown failing once; no D-numbers, plan-local ids or phase numbers in shipped source, test titles or BDD scenarios; nothing released or published. House rules, verify-command hygiene and the Stryker procedure are in `.planning/phases/_SHARED-CONTEXT.md`. A record's plan is the phase's last plan.

**Soft edges** (from `_WAVE13-CONTEXT.md` and the files each phase edits; serial order covers all of them):

| Edge | Strength | Reason |
|------|----------|--------|
| 69, 70, 71 first | ordering | the three live defects go before any deepening; each regression test is RED on its own phase base |
| 70 → 71 | soft | both edit `HydrationEngine.ts`: 70 rewrites the emission at `:382-386` and `:511-557`, 71 pairs each call site's `says…` default with its hook slot at `:408` and `:596` |
| 71 → 73 | soft | both edit `GateRegistry.ts`: 71 the `onIdCollision` option (`:57`, resolved at `:72`), 73 the equal-state check in `update` |
| 72 → 74 | soft | `DockModel.test.ts` reads the simulation half through the session's `policyMenu`, which 74 moves |
| 75 | checkpoint | the key change is visible to external tracers; nothing in this repo reads these spans |
| 76 | last | speculative: it may end in a recorded rejection (ADR-QD-189 + CCR-QD-468, no code change) |

**Numbering reserved for v1.8** (the whole block is held in the shared reservation file, `$(git rev-parse --git-common-dir)/qadi-reserved-ids.json`, set to CCR 468, ADR 189, BEH 720, INV 398 on 2026-11-22; never run `node scripts/next-id.mjs` while executing these phases, because every call writes a reservation; name an unused reservation "Unused:" in the phase's CCR row; an amendment of an existing ADR leaves its new ADR number unused and says so). Next free on `5e68b104`: ADR-QD-182, CCR-QD-461, BEH-QD-681, INV-QD-383. Highest ARCH is ARCH-115; ARCH ids below 116 are never reused. ADR Document IDs equal the file number (gate 10).

| Phase | ARCH | ADR-QD | CCR-QD | BEH-QD | INV-QD |
|---|---|---|---|---|---|
| 69 | 116 | 182 | 461 | 681–685 | 383–384 |
| 70 | 117 | 183 | 462 | 686–690 | 385–386 |
| 71 | 118 | 184 | 463 | 691–695 | 387–388 |
| 72 | 119 | 185 | 464 | 696–700 | 389–390 |
| 73 | 120 | 186 | 465 | 701–705 | 391–392 |
| 74 | 121 | 187 | 466 | 706–710 | 393–394 |
| 75 | 122 | 188 | 467 | 711–715 | 395–396 |
| 76 | 123 | 189 | 468 | 716–720 | 397–398 |

**Out of scope** (recorded, not planned): re-opening the ADRs the review left alone (ADR-QD-106's wire duplication, ADR-QD-117's error tables, ADR-QD-156's handover shapes, ADR-QD-174's cache); exporting `SignatureMatch.ts` (ADR-QD-099); a single "deliver, contained" sink operation for `SinkEmit.ts` and `DecisionSinkForwarding.ts` (two call sites; revisit at a third); folding the audit breaker's admission into its transition function (ADR-QD-158); aligning `@qadi/react`'s swallowing gate registry with ADR-QD-177's rethrow contract and guarding the devtools feeds' publish-between-`begin()`-and-`fork()` window (both carried from v1.7); formatting with `oxfmt` (AGENTS.md §17); upgrading any dependency; merge, release or publish.

### Phases

- [x] **Phase 69: One total thrown-value-to-message module** - Six inline copies of "caught value to message" become one total rule exported by `@qadi/core`, so a hostile thrown value can no longer escape `JsonHazard`, `PortKey`, `PortDerivation`, `PortWireEncode` or `CustomPredicate` (ARCH-116, core; live defect) (completed 2026-11-22)
- [x] **Phase 70: Hydration's drop events come from its buckets** - `EntriesDropped` and `LeftOut` events are derived from reason-keyed records on the hydrate and dehydrate sides, so a drop reason cannot gain a bucket without its event (ARCH-117, react; live defect) (completed 2026-11-22)
- [ ] **Phase 71: Developer-signal reporters resolved through one table** - One table states where each signal runs, how often and what it is named, and a throwing `onIdCollision` reporter is reported under that name (ARCH-118, react; live defect)
- [ ] **Phase 72: A derived store behind the dock model's stores** - `ExternalStore` gains a store derived from parent stores that owns key equality, stop-after-close and notify-once, and the dock model's three hand-built computed stores use it (ARCH-119, devtools)
- [ ] **Phase 73: One pure reconcile for gate registration** - One `reconcile` keyed by gate id registers, updates and unregisters, and `useGate` loses its state-diff effect and the index-aligned parallel arrays (ARCH-120, react)
- [ ] **Phase 74: The simulation session's policy choice split from its runs** - The policy-choice and seed rules move into a pure module beside `HeldChoice.ts`, and the session keeps only runs (ARCH-121, devtools)
- [ ] **Phase 75: A declared span shape for the evaluate family** - One question/answer span struct built with `spanStruct`, so a failed `qadi.evaluate` span carries the question and the outcome sits under one key; human checkpoint (ARCH-122, core)
- [ ] **Phase 76: Remedies uses core's signature match** - Remedies asks core whether a fixture signature satisfies a node, or the phase ends in a recorded rejection; speculative (ARCH-123, devtools + core)

### Phase Details

### Phase 69: One total thrown-value-to-message module

**Goal**: Every "never throws" function in core stays total when the value it caught is hostile, because one total rule exported by `@qadi/core` turns a caught value or a cause into a message and every copy uses it.
**Live defect**: yes. Five of the six copies are not total, so `toJson` and `toJsonRecord` ("Never throws") and `PortKey` and `PortDescription.key` ("a key is refused, never thrown") can throw.
**Depends on**: Nothing in v1.8 (first phase; serial order).
**Requirements**: THRW-01, THRW-02, THRW-03, THRW-04, THRW-05, WX-01, WX-02, WX-03, WX-04, WX-05, WX-06, WX-07
**Packages**: `@qadi/core` (`SinkCodec.ts`, `CustomPredicate.ts`, `JsonHazard.ts`, `PortKey.ts`, `PortDerivation.ts`, `PortWireEncode.ts`, and the new public `ThrownMessage.ts` with `thrownMessage` and `causeMessage`); `@qadi/http`, `@qadi/react`, `@qadi/devtools` (their copies, the capture and the feeds that render a cause switch to it)
**Records**: ARCH-116; ADR-QD-182 (new); CCR-QD-461; BEH-QD-681 to 685; INV-QD-383, INV-QD-384 (each "never throws" function stays total when the caught value is hostile, and no shipped code renders a cause through a call that can throw)
**Evidence** (`_WAVE13-CONTEXT.md`, at `2716def4`): `SinkCodec.ts:361-368` is total (both reads inside `Result.try`, placeholder `"a value that could not be described"`, pinned at `SinkCodec.test.ts:1105-1118`); `CustomPredicate.ts:89-95` guards `String()` but not `cause.message` (placeholder `"<unrenderable cause>"`, hostile-value test at `PortConformance.test.ts:743`); `JsonHazard.ts:182-183`, `PortKey.ts:197-200`, `PortDerivation.ts:113-118` and `PortWireEncode.ts:131,149` are unguarded. Probed: `Result.try({ try: () => { throw hostile }, catch: (e) => String(e) })` with a `toString` that throws throws out of `Result.try` instead of returning a failure.

**Success Criteria** (what must be TRUE):
  1. Regression tests written on the phase base are RED for each unguarded site (`JsonHazard.encodeFailed`, the `PortKey` and `PortDerivation` key refusals, both `PortWireEncode` catches, `CustomPredicate.renderReason`'s `message` read): given a thrown value whose `toString` and `message` getter both throw, the documented total function throws today and returns after the phase.
  2. One total rule exported by `@qadi/core` guards both the `message` getter and `String()` and owns the one placeholder wording, and a table test on it covers an `Error`, a plain value, a throwing `toString`, a throwing `message` getter, and both throwing at once.
  3. All six call sites (`SinkCodec`, `CustomPredicate`, `JsonHazard`, `PortKey`, `PortDerivation`, `PortWireEncode`) use it, `/usr/bin/grep` finds no `instanceof Error ? … .message : String(…)` in `packages/core/src`, and the `SinkCodec` and `CustomPredicate` pins assert the one placeholder.
  4. ADR-QD-182 (or an amendment of ADR-QD-154) records the rule, and the invariant states that each "never throws" function stays total when the caught value is hostile.

**Planning notes**: Shape: one total function, probably beside `ValueText.ts` (ADR-QD-154 unified value to text, not thrown value to text), owning the guard on both the `message` getter and `String()`. Changing the two existing placeholder strings to one is a visible text change, and the two pins move with it. Each RED regression names its site; one table test covers the function.
**Plans**: 9/9 plans complete

Plans:
- [x] 69-01 (W1): Measure the phase base (gate lines, the Stryker record of every touched source file in four groups, the committed scorer that tells removed mutants from a weakened test) and pin every core throw-through RED: `toJson`, `toJsonRecord`, `canonicalKey`, a derived key, the wire's encodes, SinkCodec's non-string message, the custom predicate's failure and defect, and an evaluation whose predicate dies.
- [x] 69-02 (W2): Pin the three copies outside core RED on the base: http's transport failure, react's reporter line (a hostile value, a non-string message, two green pins), and devtools' capture (a hostile cause, a failing custom predicate captured and replayed with its reason, a failure with no text of its own).
- [x] 69-03 (W3): Pin the devtools sites that render a cause RED on the base (the explorer's two exits, the timeline and diagnostics feeds' stop, the diagnostics store's failed wiring read) and commit the phase's RED record.
- [x] 69-04 (W4): Land `thrownMessage` and `causeMessage` (their module, barrel line, 29-row table and overview rows) and switch all six core sites to them, with the custom predicate's defect through `causeMessage` and the one placeholder pin.
- [x] 69-05 (W5): Switch http's `transport`, react's `errorLine` (an error named once) and devtools' `renderError` (the failure's own text) to `thrownMessage`, with the repository-wide negative gate.
- [x] 69-06 (W6): Switch the devtools timeline, diagnostics, explorer and gates feeds to `causeMessage`, move the gates pins and the `DiagnosticsStatus` overview row, and leave `causeMessage` the one `Cause.pretty` call in shipped code.
- [x] 69-07 (W7): Record ADR-QD-182 and CCR-QD-461, four changesets, gate 14's probes of the two new exports, and the requirement and roadmap wording for a public `thrownMessage` and `causeMessage`.
- [x] 69-08 (W8): Write INV-QD-383, INV-QD-384, BEH-QD-681 to 685, the BEH-QD-230 amendment and the devtools screens' stopped reasons, and bring every register to the Revision the CCR row cites.
- [x] 69-09 (W9): Close: the mutation close judged against the base (removed mutants recorded, any new open mutant closed with a test), the close scan of the phase's diff, `pnpm check:pr` alone, and THRW-01 to THRW-05 complete.

**Cross-cutting constraints:** <!-- gsd:generated -->
- No test title, helper or comment this plan adds holds a decision, plan, requirement or phase id (WX-07)

### Phase 70: Hydration's drop events come from its buckets

**Goal**: Every entry hydration drops is reported and counted, because the `EntriesDropped` and `LeftOut` events are derived from reason-keyed records, so a drop reason cannot gain a bucket without its event.
**Live defect**: yes. Nothing checks bucket to event, so a fourth reason with a bucket and no `if` compiles and its entries are never reported or counted, which breaks INV-QD-045 ("no entry leaves hydration unaccounted for") without an error.
**Depends on**: Phase 69 (serial order only; no shared source).
**Requirements**: DRPE-01, DRPE-02, DRPE-03, DRPE-04, DRPE-05, WX-01, WX-02, WX-03, WX-04, WX-05, WX-06, WX-07
**Packages**: `@qadi/react` (`HydrationEngine.ts`)
**Records**: ARCH-117; ADR-QD-183 (cites ADR-QD-152; INV-QD-045's enforcement restated; the payload-path decision recorded); CCR-QD-462; BEH-QD-686 to 690; INV-QD-385 to 386
**Evidence** (`_WAVE13-CONTEXT.md`, at `2716def4`): `HydrationEngine.ts:511-520` holds three arrays (`tooDeep`, `malformed`, `undecodable`) and a `bucketOf: Record<EntryDropReason, Array<unknown>>` pointing at them; `:543` does `malformed.push(entry)` directly; `:550-557` writes three hand-made `if (x.length > 0) events.push(HydrationEvent.EntriesDropped({ reason: "…" }))`; `:382-386` repeats the pattern for `LeftOut` (`ForeignSubject`, `UnencodablePolicy`). ADR-QD-152 turned down a reason-keyed record in react's payload path because a later phase shared the file.

**Success Criteria** (what must be TRUE):
  1. A check written on the phase base is RED: a drop reason can be given a bucket without being reported as an event, and it compiles (for example a type pin that the event derivation is total over `EntryDropReason`); it is GREEN after the phase and shown failing once.
  2. On the hydrate side the buckets are one record keyed by `EntryDropReason` and the `EntriesDropped` events are derived from it in one place, with no direct `malformed.push`; on the dehydrate side the `LeftOut` events are derived the same way from a record keyed by its reason.
  3. The hydration events, their order and their counts are byte-identical to the phase base's characterisation for every existing input.
  4. ADR-QD-183 cites ADR-QD-152 and says why "a later phase shares the file" no longer applies, INV-QD-045's enforcement is restated, and the payload-path question is decided once and recorded.

**Planning notes**: The owner decision (fold the payload path's `refuse` reasons into the same derivation, or leave it) is asked once at this phase's discuss step. This phase is about the entry path and the event emission, not ADR-QD-152's payload path unless the owner folds it in.
**Plans**: 7/7 plans complete

Plans:
- [x] 70-01 (W1): Record the phase base, its gate facts and the engine's Stryker base with a phase scorer whose self-test ignores close-time allowances, and pin every hydration drop event, its order, reporter call and count in a 32-row characterisation, green on the base and never edited after.
- [x] 70-02 (W2): Record the base experiment (an `entry` row given a bucket and no event compiles and its entries reach no event and no count; a `payload` and a `dehydration` row compile with nothing producing them) and the type pins of the bucket records and the payload producer record, red on the base.
- [x] 70-03 (W3): Add the package-private `HydrationBuckets.ts` (`DropBuckets`, `entryBuckets`, `dehydrationBuckets`, `dropEvents`) and derive the hydrate side's `EntriesDropped` and the dehydrate side's `LeftOut` events from one record each, in the base's order, with the characterisation unchanged.
- [x] 70-04 (W4): State each whole-payload refusal reason's producer in `PAYLOAD_PRODUCERS` with its compile-checked inverse in place of the `Match` dispatcher, add its conformance test, and re-run the experiment: each throwaway row now fails to compile at the record that lacks it.
- [x] 70-05 (W5): Record ADR-QD-183 (citing ADR-QD-152, its file-sharing reason stated truthfully), amend ADR-QD-152 to Revision 1.1, add CCR-QD-462 and the `@qadi/react` patch changeset.
- [x] 70-06 (W6): Write INV-QD-385, INV-QD-386 and BEH-QD-686 to 690, restate INV-QD-045's enforcement and correct INV-QD-323's, and trace them at the revisions the CCR row cites.
- [x] 70-07 (W7): Close: the mutation close judged against the base (static mutants of the payload records run by hand), the close scan of the phase's diff, `pnpm check:pr` alone, and DRPE-01 to DRPE-05 complete.

**Cross-cutting constraints:** <!-- gsd:generated -->
- No title, helper or comment this plan adds holds a decision number, plan id, requirement id or phase number (WX-07)

### Phase 71: Developer-signal reporters resolved through one table

**Goal**: Every developer-signal reporter is resolved through one table that states where it runs, how often and what it is named, so a failing reporter is reported under the option name the caller actually passed.
**Live defect**: yes. `GateRegistryOptions.onIdCollision` (`GateRegistry.ts:57`, resolved at `:72`) is contained as `"onGateIdCollision"` (`DeveloperSignals.ts:254`), so a throwing reporter gets a message naming an option the caller never passed; `ReporterName` (`:103`) is a hand-kept list.
**Depends on**: Phase 70 (serial order; soft edge: both edit `HydrationEngine.ts`).
**Requirements**: SIGR-01, SIGR-02, SIGR-03, SIGR-04, SIGR-05, WX-01, WX-02, WX-03, WX-04, WX-05, WX-06, WX-07
**Packages**: `@qadi/react` (`DeveloperSignals.ts`, `GateRegistry.ts`, `HydrationEngine.ts` call sites, `QadiProvider.tsx`); `DeveloperSignals.ts` stays the one file exempt from `no-ambient-console`
**Records**: ARCH-118; ADR-QD-184 (extends ADR-QD-041 and ADR-QD-052); CCR-QD-463; BEH-QD-691 to 695; INV-QD-387 to 388
**Evidence** (`_WAVE13-CONTEXT.md`, at `2716def4`): `DeveloperSignals.ts:222-254, 324-327` has `hydrationMismatchReporter`, `gateIdCollisionReporter` and `hydrationDropReporter` each restating one rule (a supplied reporter is wrapped so its throw is caught, otherwise the console default runs in development only, otherwise nothing); `providerSignalReporter` (`:382-408`) has a different rule, with the development check inside each branch and one signal firing in production once per process behind a module-scope `let`. Resolution timing varies: once per atom set, once per registry, once per call, and on every report in `QadiProvider.tsx`.

**Success Criteria** (what must be TRUE):
  1. A regression test written on the phase base is RED: `makeGateRegistry({ onIdCollision: () => { throw … } })` reports a message naming `"onGateIdCollision"`; after the phase it names `onIdCollision`, the option the caller passed.
  2. One table states, for each developer signal, where it runs (development or production), how often (per call, once per registry, once per atom set, once per process) and the option name it is reported under; every reporter is resolved through it and the hand-kept `ReporterName` list is derived from it or gone.
  3. `providerSignalReporter`'s production-once rule is stated in the same table, and its module-scope state is either brought under the atom set or recorded as the documented exception, consistent with AGENTS.md §13.
  4. A characterisation written on the phase base shows every existing reporter's behaviour (what fires, where, how often, with what text) unchanged apart from criterion 1, `DeveloperSignals.ts` stays the only file exempt from `no-ambient-console`, and ADR-QD-184 extends ADR-QD-041 and ADR-QD-052.

**Planning notes**: Check whether the module-scope `let` behind `providerSignalReporter`'s once-per-process rule is the one exempt file's carve-out or a breach of AGENTS.md §13 ("no module-scope state is left in this package") before choosing between bringing it under the atom set and recording the exception. Each `HydrationEngine` call site pairs the right `says…` default with the right hook slot (`:408`, `:596`); the table must keep that pairing.
**Plans**: 4/8 plans executed

Plans:
**Wave 1**
- [x] 71-01-PLAN.md — Record the phase base, its gate facts and the Stryker base of the five touched files with a scorer that gains `record close --restart`, and characterise every developer-signal reporter through its entry point in 35 rows, green on the base and never edited after.

**Wave 2** *(blocked on Wave 1 completion)*
- [x] 71-02-PLAN.md — Pin the option a throwing collision reporter is announced under (red on the base for `makeGateRegistry`) and the table's type guarantees in `DeveloperSignals.tst.ts`, red on the base.

**Wave 3** *(blocked on Wave 2 completion)*
- [x] 71-03-PLAN.md — Add `SIGNALS`, the derived `ReporterName` and `reporterFor`, move the registry closure to `buildGateRegistry` so each collision entry point names its own option, and gut each type guarantee once.

**Wave 4** *(blocked on Wave 3 completion)*
- [x] 71-04-PLAN.md — Resolve the hydration, mismatch and provider reporters through the table, keep the latch behind `once` alone, remove the hand-written resolvers, and pin the table's stated facts.

**Wave 5** *(blocked on Wave 4 completion)*
- [ ] 71-05-PLAN.md — Count module-scope `let`/`var` in library source with `MODULE_STATE_BUDGET` and its AGENTS.md §6 table, shown failing on each planted change, and correct AGENTS.md §13 with the old sentence kept in the evidence document's §7.

**Wave 6** *(blocked on Wave 5 completion)*
- [ ] 71-06-PLAN.md — Record ADR-QD-184 and CCR-QD-463, amend ADR-QD-041 and ADR-QD-052, and write the `@qadi/react` patch changeset.

**Wave 7** *(blocked on Wave 6 completion)*
- [ ] 71-07-PLAN.md — Write INV-QD-387, INV-QD-388 and BEH-QD-691 to 695, correct the stale resolver sentence, and trace them at the revisions the CCR row cites.

**Wave 8** *(blocked on Wave 7 completion)*
- [ ] 71-08-PLAN.md — Close: the mutation close judged against the base, the throwaway signal refused on the closed tree, the close scan, `pnpm check:pr` alone, and SIGR-01 to SIGR-05 complete.

**Cross-cutting constraints:** <!-- gsd:generated -->
- No title, helper or comment this plan adds holds a decision number, plan id, requirement id or phase number (WX-07)

### Phase 72: A derived store behind the dock model's stores

**Goal**: `ExternalStore` offers a store derived from parent stores that owns key equality, stopping after close and notifying once, so the dock model states only each computed store's key and compute function and a key field cannot be left out of a compare.
**Depends on**: Phase 71 (serial order only; no shared source).
**Requirements**: DERV-01, DERV-02, DERV-03, DERV-04, DERV-05, WX-01, WX-02, WX-03, WX-04, WX-05, WX-06, WX-07
**Packages**: `@qadi/devtools` (`ExternalStore.ts`, `DockModel.ts`)
**Records**: ARCH-119; ADR-QD-185 (extends ADR-QD-168; the store count stated in one place); CCR-QD-464; BEH-QD-696 to 700; INV-QD-389 to 390
**Evidence** (`_WAVE13-CONTEXT.md`, at `2716def4`): `DockModel.ts` repeats one pattern three times (a key type, a key reader, a `let` holding the last key, a field-by-field compare, a `closed` guard, `store.set(compute(key))`): `shownReading`/`remerge` at `:206-220`, `questions` (`keyNow`/`lastJoin`/`rejoin`, `:229-253`), `services` (`servicesKeyNow`/`lastServices`/`reservice`, `:254-279`), with the `closed` flag at `:230` and its finalizer at `:284-288`. A field added to `ServicesInput` or `JoinKey` and not to the compare compiles. The store count is written in four places (the `DockModel.ts` header, ADR-QD-047, BEH-QD-465 at `spec/behaviors/28-devtools-screens.md:934`, ADR-QD-168). `DockModel.test.ts` (`~:1034-1639`, 70 `makeDockModel(` calls) builds a whole scoped model to check rules such as "recompute only when a key changes".

**Success Criteria** (what must be TRUE):
  1. A characterisation of the dock model's `shownReading`, `questions` and `services` snapshots (when each recomputes, when it does not, and nothing after close) is written on the phase base and stays green.
  2. `ExternalStore.ts` gains a store derived from parent stores that compares every key field by construction, stops after close and notifies once, and ADR-QD-177's "every listener runs, rethrow after" holds for it; its rules are tested against `ExternalStore` alone.
  3. `DockModel.ts` builds its three computed stores with it, and `/usr/bin/grep` finds no `let last…`, field-by-field key compare or `closed` flag left in that file; `DockModel.test.ts` keeps one test per store showing its key and its order relative to host listeners.
  4. The Stryker scores of `DockModel.ts` (1, as ADR-QD-168 records) and `ExternalStore.ts` do not fall below the phase-base record, and ADR-QD-185 extends ADR-QD-168 and states the store count in one place.

**Planning notes**: ADR-QD-168 rejected a `useMemo` in the panel, not a derived store in the model. `DockModel.ts` holds a Stryker score of 1 (ADR-QD-168): record the base first, compare at close, and close any drop with a test.
**Plans**: TBD

### Phase 73: One pure reconcile for gate registration

**Goal**: Gate registration (register, update and unregister) is one pure `reconcile` keyed by gate id, so `useGate` and `useGates` lose their state-diff effect and the parallel-array contract.
**Depends on**: Phase 72 (serial order; soft edge to Phase 71: both edit `GateRegistry.ts`).
**Requirements**: RECN-01, RECN-02, RECN-03, RECN-04, RECN-05, WX-01, WX-02, WX-03, WX-04, WX-05, WX-06, WX-07
**Packages**: `@qadi/react` (`GateWriter.ts`, `useGate.ts`, `GateRegistry.ts`)
**Records**: ARCH-120; ADR-QD-186 (extends ADR-QD-140 and ADR-QD-111; AGENTS.md §13 unaffected, since this is registry state, not decision state); CCR-QD-465; BEH-QD-701 to 705; INV-QD-391 to 392
**Evidence** (`_WAVE13-CONTEXT.md`, at `2716def4`): `GateWriter.ts`'s `reconcile(writer, live, wanted, current)` handles add and remove only and takes two arrays that must line up by index; `useGate.ts`'s `useGateRegistrations` (`~:76-160`) has four refs (`stableRef`, `latest`, `statesRef`, `registered`) and three effects, the third diffing state by hand with `states.join("|")` as its key and calling `handle.update`; `useGates` (`:280-298`) calls `Record.values` twice and relies on both returning keys in the same order; `GateRegistry`'s own equal-state check in `update` is a third place. `GateWriter.reconcile.test.ts` covers add and remove without rendering, and the state half can only be tested by rendering (`GateRegistry.test.tsx`, 727 lines).

**Success Criteria** (what must be TRUE):
  1. A characterisation of `useGate` and `useGates` registration (register, state update, unregister, remount, StrictMode) is written on the phase base and stays green.
  2. `reconcile` takes identities and states keyed by gate id and does register, update and unregister in one pure step, and no caller passes arrays that must line up by index.
  3. `useGateRegistrations` has one effect plus the refs React needs, and `/usr/bin/grep` finds no `states.join("|")` diff or paired `Record.values` calls in `useGate.ts`.
  4. The state-update half is tested without rendering, beside `GateWriter.reconcile.test.ts`, `GateRegistry.test.tsx` loses the cases that move, and ADR-QD-186 extends ADR-QD-140 and ADR-QD-111.

**Planning notes**: AGENTS.md §13 holds: the gate registry records that a gate exists and what it renders now, never a retained verdict.
**Plans**: TBD

### Phase 74: The simulation session's policy choice split from its runs

**Goal**: The simulation session's policy-choice and seed rules live in one pure module beside `HeldChoice.ts`, and the session keeps only runs.
**Depends on**: Phase 73 (serial order; soft edge to Phase 72: `DockModel.test.ts` reads the simulation half through `policyMenu`).
**Requirements**: CHSE-01, CHSE-02, CHSE-03, CHSE-04, CHSE-05, WX-01, WX-02, WX-03, WX-04, WX-05, WX-06, WX-07
**Packages**: `@qadi/devtools` (`SimulationSession.ts`, `HeldChoice.ts` and the new module beside it)
**Records**: ARCH-121; ADR-QD-187 (records the split; ADR-QD-137 and ADR-QD-150 untouched, ADR-QD-047 v1.11's menu under the session still holds); CCR-QD-466; BEH-QD-706 to 710; INV-QD-393 to 394
**Evidence** (`_WAVE13-CONTEXT.md`, at `2716def4`): `SimulationSession.ts` (686 lines) holds three mutable values `chosen`, `seedEntry`, `seeded` (`:334-340`), `policyChoice`, `pin`, `policyOf`, `seedOf` (`:353-384`), the menu (`selectedOf`, `leading`, `policyMenuOf`, `:277-302`), `reseed` and `choosePolicy` (`:543-577`), `choosePolicyAt` (`:592-598`) and the `stale` rule (`:398-404`). Menu order is written twice (`policyMenuOf` puts the seeded or evicted entry first, `leading()` recounts how many come first); clearing the run (`supersede(); run = Idle`) is written in `reseed`, `choosePolicy` and `setPorts`; the comment at `:534` calls `edit` "the one path a draft changes by" while `editResourceText`, `renameSubject` and `reseed` write `draft` directly. About 600 of `SimulationSession.test.ts`'s 1809 lines need a scoped Effect session to test synchronous, pure rules.

**Success Criteria** (what must be TRUE):
  1. A characterisation of seeding, replaying a row, choosing a policy, the policy menu and its order, and staleness is written on the phase base and stays green.
  2. One pure module beside `HeldChoice.ts` owns the pin-only-when-unseeded rule, the orphan rule, the menu and its reverse lookup (menu order written once) and the same-policy no-op, and its rules are tested as plain values with no scope while the session tests that only exercised them move.
  3. `SimulationSession.ts` keeps only runs and uses that module, and "clear the run" is one operation called from `reseed`, `choosePolicy` and `setPorts`.
  4. The `edit` comment at `:534` is true: every draft write goes through one path, or the comment is corrected to say which writes do not.
  5. ADR-QD-187 records the split with ADR-QD-137 and ADR-QD-150 untouched and ADR-QD-047 v1.11 (the menu under the session) still holding.

**Plans**: TBD

### Phase 75: A declared span shape for the evaluate family

**Goal**: The `qadi.evaluate` span family states its question and answer once, so a failed span carries the question and the outcome sits under one key on every path, and a tracer filtering by evaluation id or by outcome no longer misses half the evaluations.
**Human checkpoint**: yes. The key changes are visible to external tracers (behaviour doc plus changeset); the owner decides the outcome key and whether the old keys stay for one release before any source change. Nothing in this repo reads these spans.
**Depends on**: Phase 74 (serial order only; no shared source).
**Requirements**: ESPN-01, ESPN-02, ESPN-03, ESPN-04, ESPN-05, WX-01, WX-02, WX-03, WX-04, WX-05, WX-06, WX-07
**Packages**: `@qadi/core` (`Lifecycle.ts`, `Predicate.ts`, `SubjectSet.ts`, `GuardHealthCheck.ts`, and the span declaration beside `PortSpan.ts` and `PortSpanEncode.ts`); a `@qadi/core` changeset
**Records**: ARCH-122; ADR-QD-188 (records the checkpoint decision; extends ADR-QD-051 and ADR-QD-109); CCR-QD-467; BEH-QD-711 to 715; INV-QD-395 to 396; the `@qadi/core` changeset
**Evidence** (`_WAVE13-CONTEXT.md`, at `2716def4`): on failure `Lifecycle.ts:126-161` annotates only `qadi.outcome: "Failed"` and `qadi.error_tag`; the question keys (`qadi.subject_id`, `qadi.evaluation_id`, `qadi.policy_tag`, `qadi.action`) are annotated only after success, and the outcome uses two keys (`qadi.decision` on success, `qadi.outcome` on failure). `Evaluate.test.ts:2500-2505` pins the failed shape exactly, and the file has 114 hand-typed `"qadi.*"` strings (ADR-QD-123's literal budget covers metric ids only). The same keys are hand-typed in `Predicate.ts:681-685`, `SubjectSet.ts:176,259` and `GuardHealthCheck.ts:105-106`. Model to follow: port spans declare a question struct and an answer struct (`PortSpan.ts`, `PortSpanEncode.ts` `spanStruct`, ADR-QD-051/109) and annotate the question before the call (BEH-QD-227); the sink record made the same fix (`SinkRecordFields.ts:71-78`).

**Success Criteria** (what must be TRUE):
  1. At one checkpoint the owner decides the outcome key (`qadi.decision` and `qadi.outcome` becoming one key, and its name) and whether the old keys stay for a release, and ADR-QD-188 records the decision before any source change.
  2. A regression test written on the phase base is RED: a failed `qadi.evaluate` span carries no `qadi.subject_id` or `qadi.evaluation_id`; after the phase the failed span carries the question (annotated before the lookup) and the outcome is under one key on Allow, Deny and Failed.
  3. One declared question/answer struct built with `spanStruct` serves the family, `Lifecycle.ts`, `Predicate.ts` (`toPredicate`), `SubjectSet.ts` and `GuardHealthCheck.ts` write span keys only through it, and the tests read the keys from it rather than as hand-typed `"qadi.*"` strings.
  4. The behaviour doc, the invariant, traceability and a `@qadi/core` changeset describe the span change that tracers will see, and ADR-QD-188 extends ADR-QD-051 and ADR-QD-109.

**Planning notes**: Open the phase on the checkpoint: evidence first, then one `AskUserQuestion`. `decideQuestion` in `Lifecycle.ts` is exported but used only in that file; take it as a hygiene note if the file is touched anyway (the review's own footnote, not a requirement).
**Plans**: TBD

### Phase 76: Remedies uses core's signature match

**Goal**: Remedies' "already met" verdict for a fixture signature is core's own answer, or the phase records why no shape fits without widening core's public surface, and either way an agreement test pins Remedies to the fixture signature port.
**Speculative**: yes. The phase may end in a recorded rejection (ADR-QD-189 and CCR-QD-468, no code change) because `SignatureMatch.ts` is deliberately package-private (ADR-QD-099 and its own header) and the fix belongs on core's fixture or port-description side, not in a new export.
**Depends on**: Phase 75 (serial order only; last, because it is speculative).
**Requirements**: SIGM-01, SIGM-02, SIGM-03, SIGM-04, SIGM-05, WX-01, WX-02, WX-03, WX-04, WX-05, WX-06, WX-07
**Packages**: `@qadi/devtools` (`Remedies.ts`, `SimulationFields.ts`) and `@qadi/core` (the fixture signature port or the port description only); `SignatureMatch.ts` stays package-private; no `packages/*/src` change at all if the phase ends in a rejection
**Records**: ARCH-123; ADR-QD-189 (records the outcome, change or rejection); CCR-QD-468; BEH-QD-716 to 720; INV-QD-397 to 398
**Evidence** (`_WAVE13-CONTEXT.md`, at `2716def4`): `Remedies.ts:531-545` decides whether a fixture signature meets a requirement with an inline `.some(held => held.subjectId === … && held.resourceId === … && held.meaning === … && (signerRole === undefined || held.signerRole === signerRole))`, restating core's `signatureMatches` (`SignatureMatch.ts`) and the fixture port's subject and resource scoping (`SignatureHistory.ts:332-348`). The same file avoids this for matchers (`satisfyingValue` asks `judgeMatcher`, comment at `:134-144`), and `Remedies.test.ts:590-640` checks against hand-written expected values rather than the port's answer, so drift would go unnoticed. Separately, the custom-predicate refusal is two sentences for one fact (`Remedies.ts:426`, `SimulationFields.ts:576`).

**Success Criteria** (what must be TRUE):
  1. An agreement test written on the phase base compares Remedies' "already met" verdict with the fixture signature port's own answer over subjects, resources, meanings and signer roles (including a node with no signer role), and it stays green whatever the phase decides.
  2. Either Remedies asks core (through the fixture signature port or the port description) and the inline match at `Remedies.ts:531-545` is gone, or the phase ends in a recorded rejection (ADR-QD-189 with CCR-QD-468) that says why no shape fits without widening core's public surface.
  3. `SignatureMatch.ts` stays package-private (ADR-QD-099): core's barrel is unchanged, or any added export is named in `spec/overview.md` (gate 13) and probed by the packed-install gate.
  4. The custom-predicate refusal is one sentence owned in one place, and ADR-QD-189 records the outcome (change or rejection).

**Planning notes**: The owner decision (where core exposes "would this fixture signature satisfy this node" without exporting `SignatureMatch.ts`, or a recorded rejection) is asked once at this phase's discuss step. The agreement test is the deliverable that survives a rejection.
**Plans**: TBD

### Progress (v1.8)

**Execution Order:**
Phases execute in numeric order: 69 → 70 → 71 → 72 → 73 → 74 → 75 → 76

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 69. One total thrown-value-to-message module | 9/9 | Complete    | 2026-11-22 |
| 70. Hydration's drop events come from its buckets | 7/7 | Complete    | 2026-11-22 |
| 71. Developer-signal reporters resolved through one table | 4/8 | In Progress | - |
| 72. A derived store behind the dock model's stores | 0/TBD | Not started | - |
| 73. One pure reconcile for gate registration | 0/TBD | Not started | - |
| 74. The simulation session's policy choice split from its runs | 0/TBD | Not started | - |
| 75. A declared span shape for the evaluate family | 0/TBD | Not started | - |
| 76. Remedies uses core's signature match | 0/TBD | Not started | - |
