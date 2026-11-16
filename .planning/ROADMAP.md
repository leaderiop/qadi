# Roadmap: Qadi

## Milestones

- ✅ **v1.0 Arch Wave 5** — Phases 1-9 (shipped 2026-11-09) — [archive](milestones/v1.0-ROADMAP.md)
- 🚧 **v1.1 Arch Wave 6** — Phases 10-20 (all phases complete 2026-11-10; merged to `main` in #155; not archived as a GSD milestone; not released)
- ✅ **v1.2 Arch Wave 7** — Phases 21-29 (completed 2026-11-12; not released) — [archive](milestones/v1.2-ROADMAP.md)
- ✅ **v1.3 Arch Wave 8** — Phases 30-36 (completed 2026-11-13; not released) — [archive](milestones/v1.3-ROADMAP.md)
- ✅ **v1.4 Arch Wave 9** — Phases 37-42 (completed 2026-11-14; not released) — [archive](milestones/v1.4-ROADMAP.md)
- 🚧 **v1.5 Arch Wave 10** — Phases 43-52 (in progress)

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

## 🚧 v1.5 Arch Wave 10 (Phases 43-52)

### Overview

Wave 10 resolves the ten candidates of the 2026-11-15 architecture review. The first four each hide a silent wrong result, so they come first: `guard` and the four `filter*` entry points accept a `resource` option and silently drop it (43); hydration's `rebuild` copies the seed's fields by hand and drops any field added to the wire (44); an audit breaker built with `failureThreshold: NaN` never opens (45); and a user-written sink that fails or dies loses its records with no log line (46). The next three give a restated fact one owner: port facts read from the description rather than from display names (47), audit reports core's own refusal and derives "lost" from durability (48), and the gate registry becomes the dock model's eighth store over one gate-state vocabulary (49). Phase 50 opens on a benchmark and may end in a recorded rejection. Phases 51 and 52 are the two speculative ones. Base commit `ba0d0615` (the head of `arch-wave-9`; v1.4 is not merged), branch `arch-wave-10`. Read `.planning/phases/_SHARED-CONTEXT.md`, then `.planning/phases/_WAVE10-CONTEXT.md`, which overrides it only where it names the source review, the base, the numbering and the per-phase evidence. Each planner re-verifies that evidence against `ba0d0615` before planning.

**The ten phases and their order are fixed (2026-11-15).** Nothing is added, merged, split or reordered.

**Standing direction (user, unchanged):** the cleanest design wins, not the simplest, and the project is not in production, so breaking changes are allowed. Keeping a public name, avoiding a Breaking changeset or keeping source compatibility is never the reason to pick a design. Every break is recorded (changeset marked **Breaking**, `apps/website/.../reference/upgrading.md`). Nothing is released or published, no version-packages PR is merged, and the branch is not merged.

Order: defects first (43-46), then the "stated once" deepenings (47-49), then the benchmark-gated phase (50), then the two speculative phases (51-52). **Execution order: phases run strictly one at a time, in numeric order (43 → 52).** Every records plan edits the same spec registers (CCR tail, invariants, traceability, `index.yaml`, `overview.md`, behaviour docs) and `use_worktrees` is false. The per-phase "Depends on" lines name the soft content edges; serial order is the operational rule.

**Every phase** carries the seven cross-cutting requirements (WX-01 to WX-07): `pnpm check:pr < /dev/null` green at the end (ten silent minutes means hung); ADR (or "Unused" in its CCR row), CCR, BEH/INV and traceability records using only reserved numbers, never `node scripts/next-id.mjs`; `spec/overview.md` names every added export and drops every removed one (gate 13 checks names only, so a moved declaration's module column is corrected by hand); no new `as`, `!`, `any`, `switch`, `Effect.fnUntraced`, `async`/`await` or ambient `console`/`process.env`/clock, and a budget changes only together with its AGENTS.md table; coverage held (core at least 95 percent, the others at least 90) and per-file Stryker scores recorded in the first plan (`NN-mutation-base.json`, the same invocation at the base and the close) and compared in the last, a drop closed with a test and never re-baselined; a characterisation or regression test written on the phase base before any behaviour change; every public break recorded as **Breaking**. Re-run `pnpm circular` after the first source edit of every phase that moves a declaration, and `pnpm spec:website-examples` explicitly for any phase that edits a website page. Scope negative greps to the phase's added lines and exclude `.stryker-tmp`, `.next`, `node_modules` and `reports`; run vitest from the repo root with `--project`.

**Soft edges** (from `_WAVE10-CONTEXT.md`; none is a hard edge, serial order covers all of them):

| Edge | Strength | Reason |
|------|----------|--------|
| 45 → 48 | soft | both edit `AuditDecisionSinkLive.ts`; 48 starts from 45's version |
| 47 → 49 | soft | both edit devtools `ServicesPanel` and `DockModel`; 49 starts from 47's version |
| 50 → 51 | soft | both edit `Walk.ts` and `Policy.ts`; 51 starts from whatever 50 left (or from the base if 50 ends in a rejection) |

**Numbering reserved for v1.5** (the whole block is held in the shared reservation file, set to CCR 443, ADR 165, BEH 600, INV 350 on 2026-11-15; confirm a number is free by grepping `spec/`, `packages/`, `.changeset/` and `AGENTS.md` before using it; name an unused reservation "Unused:" in the phase's CCR row). Next free on `ba0d0615`: ADR-QD-156, CCR-QD-434, BEH-QD-551, INV-QD-331. Highest ARCH is ARCH-89; ARCH ids below 90 are never reused. ADR Document IDs equal the file number (gate 10).

| Phase | ARCH | ADR-QD | CCR-QD | BEH-QD | INV-QD |
|---|---|---|---|---|---|
| 43 | 90 | 156 | 434 | 551–555 | 331–332 |
| 44 | 91 | 157 | 435 | 556–560 | 333–334 |
| 45 | 92 | 158 | 436 | 561–565 | 335–336 |
| 46 | 93 | 159 | 437 | 566–570 | 337–338 |
| 47 | 94 | 160 | 438 | 571–575 | 339–340 |
| 48 | 95 | 161 | 439 | 576–580 | 341–342 |
| 49 | 96 | 162 | 440 | 581–585 | 343–344 |
| 50 | 97 | 163 | 441 | 586–590 | 345–346 |
| 51 | 98 | 164 | 442 | 591–595 | 347–348 |
| 52 | 99 | 165 | 443 | 596–600 | 349–350 |

**Already deep, not re-planned** (`_WAVE10-CONTEXT.md`): `SinkCodec`, the port descriptions and derivations, http request enforcement, `DecisionCache`/`SharedComputation`, the react atom core, `@qadi/promise`, `@qadi/testing`, devtools `Source.ts`/`Remedies.ts`. Settled by an ADR and not re-proposed: the composite folds in `Walk.ts` (ADR-QD-073/077), the http error tables (ADR-QD-102), a codec in `DecisionStream` (ADR-QD-097), the port question in several forms (ADR-QD-133), the shared `clockLayer` (ADR-QD-146), the backlog sort's place (ADR-QD-097 amendment), the SinkCodec depth walks (`UNTRUSTED_DECODE_BUDGET`), and `hydrateDecisions` versus `atoms.hydrate` (ADR-QD-078/039).

### Phases

- [x] **Phase 43: One handover module behind the enforcement entry points** - One package-private module owns ask → discharge → release; `guard` and `filter*` refuse a second `resource` at the type level (ARCH-90, Breaking, core) (completed 2026-11-15)
- [x] **Phase 44: The hydration seed's fields stated once** - Each verdict's seed fields derive from core's wire statement; dehydrate and rebuild are spreads, so a new wire field can no longer be dropped (ARCH-91, react) (completed 2026-11-15)
- [x] **Phase 45: The audit circuit breaker as one transition function** - One pure `(state, event, now)` function holds every generation and probe rule; a `NaN` threshold is refused at construction (ARCH-92, audit) (completed 2026-11-15)
- [x] **Phase 46: The sink emitter reports what it contains** - A failing or dying user sink is contained and reported with exactly one warning, naming the sink (ARCH-93, core) (completed 2026-11-15)
- [ ] **Phase 47: Port facts read from the description** - Defaultedness, consequence and call reading come from the port description, not from display names (ARCH-94, core, devtools)
- [ ] **Phase 48: Audit reports core's refusal and derives "lost"** - `AuditEntryNotEncodable` is deleted and the lost-staging label derives from durability (ARCH-95, Breaking, audit)
- [ ] **Phase 49: Gates as the dock model's eighth store, one gate-state vocabulary** - The gate registry joins the dock model and the five gate-state words are stated once in core (ARCH-96, core, react, devtools)
- [ ] **Phase 50: What a leaf needs from the request, stated once** - Opens on a benchmark; one table of leaf needs read by `Walk` and `Predicate`, or a recorded rejection (ARCH-97, core)
- [ ] **Phase 51: Policy tag arity stated once** - One closed record gives each tag's arity; `traceShapeOf` reads it and `leafTags` goes; `foldTrace` stays public (ARCH-98, core)
- [ ] **Phase 52: Core owns the predicate compile shell** - One core function owns defaults, renderability and outcome counting; each dialect keeps its rules, renderer and metric (ARCH-99, core, predicate-sql, predicate-prisma)

### Phase Details

### Phase 43: One handover module behind the enforcement entry points

**Goal**: The rule "the resource decided on is the value handed over" (INV-QD-108, ADR-QD-104) is written once in a package-private module behind the ten enforcement entry points, so `guard` and the four `filter*` entry points can no longer accept a `resource` option and silently drop it.
**Depends on**: Nothing in v1.5 (first phase; serial order).
**Requirements**: HAND-01, HAND-02, HAND-03, HAND-04, HAND-05, HAND-06, WX-01, WX-02, WX-03, WX-04, WX-05, WX-06, WX-07
**Records**: ARCH-90; ADR-QD-156 (extends ADR-QD-104); CCR-QD-434; BEH-QD-551 to 555; INV-QD-331 to 332 (INV-QD-108 restated in place to cover every handover entry point); changeset for `@qadi/core` (**Breaking**: the `guard` and `filter*` options lose `resource`) and `upgrading.md`
**Settled by the review check**: `LoadedEnforceOptions` already refuses `resource?: never` on `enforceLoaded`, `enforceProjected` and `enforceProjectedLoaded`; `guard` (`{ ...options, resource }`) and `decideOne` (`{ ...options, resource: item }`, behind all four `filter*`) take `EnforceOptions`, so `filter(p, items, { resource: x })` and `guard(perm, p, { resource: x })` compile and `x` is dropped.

**Success Criteria** (what must be TRUE):
  1. A tstyche test committed on the phase base shows `guard` and each of `filter`, `filterStream`, `filterProjected` and `filterStreamProjected` compiling with `{ resource: x }` (RED); after the phase each is a compile error, the way the three loaded entry points already are.
  2. One package-private module owns "ask against this value → discharge on allow → release whole or projected", and the ten entry points in `Qadi.ts` are adapters over it by shape (effect, array, stream). The allow → `discharge` / deny branch and the `project(decision, value)` step each appear once in the phase's added code (scoped grep; at the base the branch is written in `permitted` and `decideOne`, and `project` is applied in four places).
  3. A runtime test over all ten entry points shows the released value is the decided value, and for `filter*` that each released item is the item that was decided.
  4. Behaviour is otherwise unchanged, pinned by characterisation tests written on the base and green before and after: discharge precedes the guarded work (ADR-QD-011), `filter` partitions rather than fails (JA-04), obligation discharge precedes handover (ADR-QD-019), and an item's fate is the same in the array and stream forms.
  5. No call site passes `resource` to `guard` or `filter*` in `packages/*`, `examples/*`, `features/step-definitions` or the spec and website ` ```typescript ` fences (both doc-fence gates green); INV-QD-108 is restated, and the Breaking change is in the `@qadi/core` changeset and `upgrading.md`.

**Planning notes**: Re-verify the line numbers in `_WAVE10-CONTEXT.md` (`Qadi.ts` :113, :129, :197, :406, :430) against the base. **Plan shape, RED first**: the mutation base for `Qadi.ts`, the tstyche RED and the characterisation tests, committed first; then the module with one entry point converted at a time, deleting a duplicated branch only after the module's test covers it; then the call-site sweep across `packages/*`, `examples/*`, `features/step-definitions` and both fence sets; then the records plan; run `pnpm spec:website-examples` explicitly and `pnpm circular` after the first move.
**Plans**: 8/8 plans complete

Plans:
**Wave 1**
- [x] 43-01-PLAN.md — mutation baseline with the moved module (first commit), then the RED tstyche refusals for `guard`, `filter*` and the facade

**Wave 2** *(blocked on Wave 1 completion)*
- [x] 43-02-PLAN.md — characterisation on the base: the effect and collection shapes, the spans, the smuggled resource (RED for `enforceProjected`)

**Wave 3** *(blocked on Wave 2 completion)*
- [x] 43-03-PLAN.md — tracer: `Handover.ts` and `guard` through it; the effect shapes release through `RELEASE`; `LoadedEnforceOptions` → `HandoverOptions`

**Wave 4** *(blocked on Wave 3 completion)*
- [x] 43-04-PLAN.md — the four collections through `handOver`; the facade's `filter`/`filterProjected` refuse `resource`

**Wave 5** *(blocked on Wave 4 completion)*
- [x] 43-05-PLAN.md — website pages and glossaries, the two 0.13 upgrade sections, the two Breaking changesets

**Wave 6** *(blocked on Wave 5 completion)*
- [x] 43-06-PLAN.md — ADR-QD-156 and the dated amendments to ADR-QD-104, 105, 019, 022, 035

**Wave 7** *(blocked on Wave 6 completion)*
- [x] 43-07-PLAN.md — INV-QD-009/013/032/108 restated, INV-QD-331, BEH-QD-551/552, overview, traceability, the CCR-QD-434 row

**Wave 8** *(blocked on Wave 7 completion)*
- [x] 43-08-PLAN.md — close: mutation after vs base, scope and forbidden-construct scan, commit order and ids, `check:pr`, release check

### Phase 44: The hydration seed's fields stated once

**Goal**: Each verdict's seed fields are stated once, derived from core's wire statement, so a field added to the wire's `common` reaches the client's seed without a hand edit in `rebuild`, and the Allow/Deny branch is written once.
**Depends on**: Phase 43 (serial order only; no shared source).
**Requirements**: HYDF-01, HYDF-02, HYDF-03, HYDF-04, WX-01, WX-02, WX-03, WX-04, WX-05, WX-06, WX-07
**Records**: ARCH-91; ADR-QD-157 (the ADR-QD-135 pattern applied to the seed; ADR-QD-078 kept); CCR-QD-435; BEH-QD-556 to 560; INV-QD-333 to 334; changeset for `@qadi/react` (minor, **Breaking**: `SeededAllow.visibleFields` is an optional key, as on the wire; D-03)
**Settled by the review check**: the defect is real and compiles today: a field added to the wire's `common` reaches the payload and is dropped by `rebuild` on the client. The pattern is `SinkRecordFields.ts`: a `Schema.Struct` of fields, a `Data.TaggedClass` typed by its `Type`, and a wire that spreads it. ADR-QD-078 (a seed is its own type, `_tag` is `SeededAllow`, not `Allow`) and ADR-QD-155 (`SeededQuestion.ts` owns the computing atom) stay as they are.

**Success Criteria** (what must be TRUE):
  1. RED on the phase base: a property test that any `Decision` → dehydrated entry → `SeededDecision` keeps every disclosed wire field fails when a scratch field is added to core's wire `common` (the code still compiles and `rebuild` drops it); the scratch field is then removed and the property is green over the real fields.
  2. Each verdict's seed fields are one statement derived from `DecisionWireAllow`/`DecisionWireDeny` minus the withheld fields. `SeededAllow` and `SeededDeny` stay `Data.TaggedClass`es with `_tag` `SeededAllow`/`SeededDeny`, typed by it, and no hand-written field list remains in `SeededDecision.ts` or in `rebuild`.
  3. `dehydrateDecision` and `rebuild` are spreads with the one `subjectId` substitution, and the Allow/Deny branch is written once for dehydrate, rebuild and agreement (at the base it is written three times).
  4. `entryAgrees` still refuses a seed whose fields disagree with its trace through core's `decisionDisagreement` (INV-QD-170), existing tests unchanged, and the payload's wire form is byte-identical for existing entries (a golden committed on the base).

**Planning notes**: **Plan shape, RED first**: the mutation base for `HydrationEngine.ts` and `SeededDecision.ts`, the byte golden and the property with its scratch-field RED, committed first; then the derived statement; then the spreads; then records. Core's `DecisionWire.ts` is read, not edited, unless the planner records evidence that it must change.
**Plans**: 6/6 plans complete

Plans:
**Wave 1**
- [x] 44-01-PLAN.md — mutation baseline (first commit), then the round-trip property and the eight-string payload golden green on the base; RED under an uncommitted scratch wire field

**Wave 2** *(blocked on Wave 1 completion)*
- [x] 44-02-PLAN.md — tracer: the allow's seed fields stated once in `SeededDecision.ts`, entry and class derived, `rebuild` a spread (RED first for the absent key); then the denial; tests drop `visibleFields: undefined`; the type pin

**Wave 3** *(blocked on Wave 2 completion)*
- [x] 44-03-PLAN.md — the `VERDICTS` table read by dehydrate, rebuild and agreement; GREEN under the scratch field

**Wave 4** *(blocked on Wave 3 completion)*
- [x] 44-04-PLAN.md — ADR-QD-157, the ADR-QD-078 amendment, AGENTS.md §7, the `@qadi/react` minor Breaking changeset, the 0.13 upgrade entry

**Wave 5** *(blocked on Wave 4 completion)*
- [x] 44-05-PLAN.md — BEH-QD-556, INV-QD-333, the INV-QD-022/059 and BEH-QD-148 notes, traceability, overview, the CCR-QD-435 row

**Wave 6** *(blocked on Wave 5 completion)*
- [x] 44-06-PLAN.md — close: mutation after vs base, scope and forbidden-construct scan, commit order and ids, `check:pr`, release check

### Phase 45: The audit circuit breaker as one transition function

**Goal**: Every generation and probe rule of the audit circuit breaker lives in one pure transition function, tested without fibers or a clock, and a breaker whose options cannot work is refused when it is built rather than silently never opening.
**Depends on**: Phase 44 (serial order only). Soft edge to Phase 48 (both edit `AuditDecisionSinkLive.ts`).
**Requirements**: BRKR-01, BRKR-02, BRKR-03, BRKR-04, BRKR-05, WX-01, WX-02, WX-03, WX-04, WX-05, WX-06, WX-07
**Records**: ARCH-92; ADR-QD-158; CCR-QD-436; BEH-QD-561 to 565; INV-QD-335 to 336 (INV-QD-052, each event one atomic modify, is kept); changeset for `@qadi/audit` (minor: construction refuses bad options with a typed error)
**Settled by the review check**: `CircuitBreaker.ts` has five separate `Ref.modify` bodies (`observe`, `recordSuccess`, `recordFailure`, `claimProbe`, `releaseProbe`), each restating the stale-generation check, the bump (`generation + 1` appears eight times), the state rebuild and the announcement decision. History to keep: commit `9b2ca5d8` (a probe claim not released on abnormal exit), issue #72 (claim/release atomicity), and the regression tests at `CircuitBreaker.test.ts:339, 403, 426, 452`. By contrast `decisionCacheLayer`, `makeDecisionLog` and `decisionStreamRoute` already refuse a bad bound when built.

**Success Criteria** (what must be TRUE):
  1. A test with `failureThreshold: NaN` is RED on the phase base (the breaker never opens, because `consecutiveFailures >= NaN` is always false); after the phase, a non-finite, zero, negative or non-integer threshold or cooldown fails at construction with a typed error, one row per bad value.
  2. One pure function `(state, event, now) → (next state, transition announced)` over a closed event union (Observe, Success, Failure, Claim, Release, each with its generation) holds every generation and probe rule, and `generation + 1` is written once in the phase's added code (scoped grep; eight at the base).
  3. The `Ref`/`Clock`/metric adapter runs exactly one `Ref.modify` per event (INV-QD-052), and its matchers are built once at module scope (AGENTS.md §5a); `Match.value(state)` is no longer rebuilt per call.
  4. Table-driven tests of the transition function cover a stale generation, a release stealing a newer claim, a stale failure reopening a newer window and every legal transition, and need no fibers or `TestClock`.
  5. The existing concurrency regression tests (`CircuitBreaker.test.ts:339, 403, 426, 452`) pass unchanged as adapter tests, and the breaker's metrics and transition announcements are unchanged.

**Planning notes**: **Plan shape, RED first**: the mutation base for `CircuitBreaker.ts`, the `NaN` RED and the transition table written against the base's observable behaviour, committed first; then the pure function and the adapter, one event converted at a time; then option validation (`AuditDecisionSinkLive.ts` :127 passes options through unvalidated); then records. Keep the work off the lines Phase 48 will edit.
**Plans**: 8/8 plans complete

Plans:
**Wave 1**
- [x] 45-01-PLAN.md — mutation base for `CircuitBreaker.ts` and `AuditDecisionSinkLive.ts` (first commit); the adapter transition table green on the base; the option rows RED (`failureThreshold: NaN` never opens)

**Wave 2** *(blocked on Wave 1 completion)*
- [x] 45-02-PLAN.md — tracer: `step` and `run`, with Observe converted; then the pure transition table and the seeded property

**Wave 3** *(blocked on Wave 2 completion)*
- [x] 45-03-PLAN.md — Success, Failure, Claim and Release each one `step`, one commit per event; `generation + 1` written once; every converting commit replayed green

**Wave 4** *(blocked on Wave 3 completion)*
- [x] 45-04-PLAN.md — tracer: `InvalidAuditSinkOption` and the `failureThreshold` refusal through the sink's layer type; the barrel line and overview row; then `resetTimeoutMs`

**Wave 5** *(blocked on Wave 4 completion)*
- [x] 45-05-PLAN.md — the `storeCallTimeout` refusal (`Duration.infinity` kept) and the zero-deadline row; the option rows tightened; the layer's type pin; `check:fast`

**Wave 6** *(blocked on Wave 5 completion)*
- [x] 45-06-PLAN.md — ADR-QD-158, the ADR-QD-126 amendment, the CCR-QD-436 row started; the `@qadi/audit` minor Breaking changeset, the 0.13 upgrade entry, README and website claims

**Wave 7** *(blocked on Wave 6 completion)*
- [x] 45-07-PLAN.md — BEH-QD-561, INV-QD-335, the BEH-QD-249/251/379 and INV-QD-052 amendments, traceability, the overview options row, CCR-QD-436 completed

**Wave 8** *(blocked on Wave 7 completion)*
- [x] 45-08-PLAN.md — close: mutation after-run and comparison, scope and scan, commit order and ids, `check:pr`, release check

### Phase 46: The sink emitter reports what it contains

**Goal**: A decision sink that fails or dies is contained, as INV-QD-035 requires (an observer must never deny), and reported with exactly one warning, so a user-written sink can no longer lose records with no log at all.
**Depends on**: Phase 45 (serial order only; no shared source).
**Requirements**: EMIT-01, EMIT-02, EMIT-03, EMIT-04, WX-01, WX-02, WX-03, WX-04, WX-05, WX-06, WX-07
**Records**: ARCH-93; ADR-QD-159 (INV-QD-035 restated; ADR-QD-044 and ADR-QD-100 kept); CCR-QD-437; BEH-QD-566 to 570; INV-QD-337 to 338; changeset for `@qadi/core` (minor: an optional `name` on `DecisionSinkShape`; a failing user sink now logs once)
**Settled by the review check**: `sinkEmitter` runs `Effect.catchCause(sink.value.record(record), () => Effect.void)`, so it contains every failure and reports none. The shipped sinks report their own: `DecisionSinkForwarding.ts` :98 and :126 ("could not be forwarded", the encode-refusal report), :188 ("a fanned-out decision sink failed unexpectedly", sibling isolation) and `DecisionLog.ts` :174 (the append/publish half). The phase's research classifies each as "containment the emitter now covers" or "a report that says something else". Port shapes already carry a `name` (`PortDescription.ts`); `DecisionSinkShape` does not.

**Success Criteria** (what must be TRUE):
  1. A custom sink that fails, and one that dies, run through `evaluate` each produce exactly one warning and leave the decision unchanged; both are RED on the phase base, where they produce zero warnings.
  2. The warning names the sink when it has a `name` (an optional `name` added to `DecisionSinkShape`), and an unnamed sink still produces its one warning.
  3. Each existing shipped-sink warning is classified in the phase's records. Only containment the emitter now covers is removed, and what stays is a report that says something else (forwarding's encode refusal, `decisionSinkAll`'s sibling isolation, the decision log's append/publish split). No single failure of a shipped sink is reported twice.
  4. The sink is still read once per evaluation (ADR-QD-044/100, `sink-read-once`), a sink never changes a decision, and INV-QD-035 is restated to include the report.

**Planning notes**: **Plan shape, RED first**: the mutation base for `SinkEmit.ts` and the touched sinks, the two RED tests and a per-warning classification table committed first; then the emitter's report and the `name`; then removing only the covered duplicates; then records.
**Plans**: 7/7 plans complete

Plans:
**Wave 1**
- [x] 46-01-PLAN.md — mutation base for the five touched source files (first commit); the emitter's rows through `evaluate` and `enforce`, RED on the base (a dying, throwing, self-interrupting, type-escaped or synchronously throwing sink is reported nowhere)

**Wave 2** *(blocked on Wave 1 completion)*
- [x] 46-02-PLAN.md — one report per shipped-sink failure characterised green on the base; the names, the fan-out member and the forwarder rows RED; the audit name row; the W0-W10 classification table

**Wave 3** *(blocked on Wave 2 completion)*
- [x] 46-03-PLAN.md — tracer: `DecisionSinkShape.name` and the emitter that suspends, contains and reports once; then the type pin and the corrected test notes

**Wave 4** *(blocked on Wave 3 completion)*
- [x] 46-04-PLAN.md — tracer: the fan-out names its failed member and keeps going; the forwarder's outer catch removed and a throwing `send` made a send failure; every shipped sink named; `check:fast`

**Wave 5** *(blocked on Wave 4 completion)*
- [x] 46-05-PLAN.md — ADR-QD-159, the ADR-QD-044 amendment, the CCR-QD-437 row started; the `@qadi/core` minor and `@qadi/audit` patch changesets, the 0.13 upgrade entry, the website and overview prose

**Wave 6** *(blocked on Wave 5 completion)*
- [x] 46-06-PLAN.md — BEH-QD-566 to 570 and four amended behaviours; INV-QD-035 restated, INV-QD-337 and 338; traceability; CCR-QD-437 completed

**Wave 7** *(blocked on Wave 6 completion)*
- [x] 46-07-PLAN.md — close: mutation after-run and comparison, scope and scan, commit order and ids, `check:pr`, release check

### Phase 47: Port facts read from the description

**Goal**: Whether a port's service is its fail-closed default, what that costs, and how a call row reads are facts the port description states once, so devtools no longer parses a display-name convention and a hand-written wrapper can no longer make a fail-closed default look like a real adapter.
**Depends on**: Phase 46 (serial order only). Soft edge to Phase 49 (both edit devtools `ServicesPanel` and `DockModel`).
**Requirements**: PFCT-01, PFCT-02, PFCT-03, PFCT-04, PFCT-05, WX-01, WX-02, WX-03, WX-04, WX-05, WX-06, WX-07
**Records**: ARCH-94; ADR-QD-160 (ADR-QD-094 and ADR-QD-109 kept; BEH-QD-196's naming convention stays a display name only); CCR-QD-438; BEH-QD-571 to 575; INV-QD-339 to 340; changesets for `@qadi/core` (minor: the structural defaultedness fact) and `@qadi/devtools` (patch)
**Settled by the review check**: `PortDerivation.ts` names a wrapper `` `${inner.name ?? "?"} (${suffix})` `` and devtools' `isDefaultName` (`Wiring.ts`) parses that convention back, which is the misleading direction for a diagnostic. The devtools tables keyed by port that restate facts a description could own are `CONSEQUENCES` (`Wiring.ts`), `ROWS` (`model/PortCalls.ts`, five arms identical except the tag) and `describeOne` (`react/ServicesPanel.tsx`, a React view that knows each port's span fields). `forEveryPort` exists in core's `Ports.ts`. Devtools depends only on `@qadi/core`.

**Success Criteria** (what must be TRUE):
  1. Whether a port's service is its description's fail-closed default, through any number of derived wrappers, is a structural fact core exposes, and devtools' `isDefaultName` is deleted.
  2. RED on the phase base: a hand-written wrapper whose name does not follow `"<inner> (<suffix>)"`, around a fail-closed default, is reported as defaulted; on the base it shows as a real adapter.
  3. Each port's fail-closed consequence sentence and call-row reading are stated once per port, next to its description or in one devtools port-reading module keyed by `PortName`; `CONSEQUENCES` and the per-port arms of `describeOne` are gone, and `ServicesPanel.tsx` no longer knows any port's span fields.
  4. `PortCalls.ts`'s `ROWS` is built by one generic, fully type-checked row builder over the registry's descriptions (D-18), and a throwaway sixth port in the registry (recorded and reverted) needs no devtools edit beyond what the compiler asks for.
  5. Rendered output for the five ports is unchanged (characterisation tests written on the base), and devtools still depends only on `@qadi/core`.

**Planning notes**: **Plan shape, RED first**: the mutation base for the touched devtools files, the wrapper RED and a rendered-output characterisation for each port, committed first; then core's fact; then devtools' tables; then records. Re-run `pnpm circular` after the first move. Keep the work off the lines Phase 49 will edit in `ServicesPanel`/`DockModel`.
**Plans**: 6/7 plans executed

Plans:
**Wave 1**
- [x] 47-01-PLAN.md — mutation base for the six touched source files (first commit); `WiringDefaulted.test.ts` RED on the base (a renamed spreading wrapper around a default reads as a real adapter, a fresh object named after a default reads defaulted)

**Wave 2** *(blocked on Wave 1 completion)*
- [x] 47-02-PLAN.md — the services panel's wording for every port characterised green on the base (20 readings, four card rows); the captured-default row in `Capture.test.ts`

**Wave 3** *(blocked on Wave 2 completion)*
- [x] 47-03-PLAN.md — tracer: `PortDefault.ts`'s mark, `isPortDefault` and `nonePort` marking; every derived wrapper and `decoratePorts` carries it; the overview row and CCR-QD-438 started

**Wave 4** *(blocked on Wave 3 completion)*
- [x] 47-04-PLAN.md — tracer: `Wiring.ts` reads `isPortDefault` and `isDefaultName` is deleted (the RED goes green); `PortReading.ts` replaces `CONSEQUENCES` and `describeOne`; `ROWS` by one monomorphic row builder and a derived `PortCall`

**Wave 5** *(blocked on Wave 4 completion)*
- [x] 47-05-PLAN.md — the sixth-port scratch measured and reverted; ADR-QD-160; the two changesets and the upgrade entry

**Wave 6** *(blocked on Wave 5 completion)*
- [x] 47-06-PLAN.md — BEH-QD-571 to 575 with BEH-QD-196, 215 and 228 amended; INV-QD-339 and 340; traceability, the overview `PortReport` row, ADR links; CCR-QD-438 completed

**Wave 7** *(blocked on Wave 6 completion)*
- [ ] 47-07-PLAN.md — mutation after against the base plus the two new files; scope, scan, commit order, ids and held lines; `pnpm check:pr`; nothing released

### Phase 48: Audit reports core's refusal and derives "lost"

**Goal**: Audit reports the same refusal type core, forwarding and http use, and the "lost staging" label is derived from the outcome's durability in one place, so the span attribute and the metric/log label cannot disagree about whether a staged write was lost.
**Depends on**: Phase 47 (serial order only). Soft edge to Phase 45 (both edit `AuditDecisionSinkLive.ts`; start from 45's version).
**Requirements**: AREF-01, AREF-02, AREF-03, AREF-04, WX-01, WX-02, WX-03, WX-04, WX-05, WX-06, WX-07
**Records**: ARCH-95; ADR-QD-161 (written after checking ADR-QD-054 and ADR-QD-056); CCR-QD-439; BEH-QD-576 to 580; INV-QD-341 to 342; changeset for `@qadi/audit` (**Breaking**: `onRefused` takes core's `SinkRecordNotEncodable`, and `AuditEntryNotEncodable` is deleted) and `upgrading.md`
**Settled by the review check**: `AuditEntryNotEncodable` (`AuditEntry.ts`) copies core's `SinkRecordNotEncodable` field for field (`recordTag`, `evaluationId`, `refusal`) and adds only `reason`, which is `describeEncodeRefusal(refusal)`. Its doc cites ADR-QD-054 ("core has no reason to know this error exists"), but core already declares that error. "Lost" is stated twice: `unwrittenDurability` in `AuditWriteOutcome.ts` maps NotWired/StageFailed to `"Lost"`, and `lostStaging` in `AuditWriteReport.ts` maps NotWired to `not_wired`, StageFailed to `failed` and Staged to `undefined`; both are exhaustive, but a new variant could be mapped differently in each. **Check ADR-QD-056 (the audit companion package) before deciding.**

**Success Criteria** (what must be TRUE):
  1. `AuditEntryNotEncodable` is deleted; audit's `onRefused` takes core's `SinkRecordNotEncodable`, the same type forwarding and http use, and the logged reason is `describeEncodeRefusal(refusal)` computed at the one place a line is written.
  2. The lost-staging label is derived from the outcome's durability (`durabilityOf`), so the span attribute and the metric/log label cannot disagree: a table test over every outcome variant pins that they agree, and only one exhaustive mapping remains.
  3. `writtenStaging`'s hand-written `_tag` ternary is replaced by an exhaustive match.
  4. Audit's observable output is unchanged for existing inputs (log lines, span attributes, metric labels), pinned by characterisation tests written on the base.
  5. ADR-QD-161 records the decision after checking ADR-QD-054 and ADR-QD-056, and the `@qadi/audit` changeset and `upgrading.md` mark `onRefused`'s new type as **Breaking**.

**Planning notes**: **Research flag: the first plan checks ADR-QD-054 and ADR-QD-056 against core's `SinkRecordNotEncodable` before any code**, and records what the ADRs actually forbid. **Plan shape, RED first**: the mutation base for the audit files, the characterisation of log, span and metric output on every outcome variant, committed first; then the refusal type; then the durability-derived label; then records.
**Plans**: TBD

### Phase 49: Gates as the dock model's eighth store, one gate-state vocabulary

**Goal**: The gate registry is the dock model's eighth store, so `QuestionsPanel` renders one snapshot in which each question and the instances asking it come from the same moment, and the five gate-state words are stated once in core so react and devtools cannot drift.
**Depends on**: Phase 48 (serial order only). Soft edge to Phase 47 (both edit devtools `ServicesPanel` and `DockModel`; start from 47's version).
**Requirements**: GATE-01, GATE-02, GATE-03, GATE-04, GATE-05, WX-01, WX-02, WX-03, WX-04, WX-05, WX-06, WX-07
**Records**: ARCH-96; ADR-QD-162 (amends the dock model's store set, the ARCH-74/82 lineage; the ADR-QD-152 pattern for the vocabulary; ADR-QD-053 and ADR-QD-080 kept); CCR-QD-440; BEH-QD-581 to 585; INV-QD-343 to 344; changesets for `@qadi/core` (minor: the gate-state vocabulary), `@qadi/react` (patch) and `@qadi/devtools` (minor, marked **Breaking** if the design changes a public dock prop or `GateInstanceLike`)
**Settled by the review check**: today `QuestionsPanel.tsx` joins the polled `questions` (through `model/DiagnosticsStore.ts`) with the live `gates` prop (`react/DevtoolsDock.tsx`), which skips `DockModel`, and the per-row `instancesAsking` join runs in the view. `model/Gates.ts` restates `GateRenderState` (`"Failed" | "Denied" | "Rechecking" | "Pending" | "Allowed"`) and types `GateInstanceLike.state` as `string`; react's version is `GateWriter.ts`'s, derived from `DecisionOutcome.ts`'s tags; no test ties the two. Devtools takes no dependency on `@qadi/react`.

**Success Criteria** (what must be TRUE):
  1. The five gate-state words are stated once in `@qadi/core`, and react's `GateRenderState` and devtools' `GATE_DISPLAY` derive from that statement; a type-level test ties them together, and devtools has no dependency on `@qadi/react` (ADR-QD-053/080).
  2. A state this build does not know is still shown as `Unrecognised`, never as an answer.
  3. The gate registry's structural `subscribe`/`instances` is a `makeDockModel` store, the model produces the joined question × instance rows, and `QuestionsPanel` renders one snapshot with no `gates` prop join and no per-row `instancesAsking` join in the view.
  4. The join is tested headlessly through the dock model, as the ARCH-74/82 stores are: a test where gates change while the questions poll shows rows from one moment, with no render.
  5. With instrumentation off nothing is registered or rendered (AGENTS.md §13), the react suite passes untouched, and the panel's rendered output is unchanged for existing inputs.

**Planning notes**: **Plan shape, RED first**: the mutation base for `DockModel.ts`, `QuestionsPanel.tsx`, `Gates.ts` and react's `GateWriter.ts`, with a characterisation of the panel's current rows, committed first; then the vocabulary in core and both derivations; then the eighth store and the panel read; then records. Browser behaviour (Activity hide/show, focus) stays as it was; any change to it is named.
**UI hint**: yes
**Plans**: TBD

### Phase 50: What a leaf needs from the request, stated once

**Goal**: The rule that a leaf which reads the action or the resource fails when the request has none (INV-QD-011), together with the order in which absences are checked, is either stated once in one table that `Walk` and `Predicate` both read, or the phase ends with a measured rejection recorded in ADR-QD-163.
**Depends on**: Phase 49 (serial order only). Soft edge to Phase 51 (both edit `Walk.ts` and `Policy.ts`).
**Requirements**: LEAF-01, LEAF-02, LEAF-03, LEAF-04, LEAF-05, WX-01, WX-02, WX-03, WX-04, WX-05, WX-06, WX-07
**Records**: ARCH-97; ADR-QD-163 (the benchmark numbers, and the rejection if it ends in one); CCR-QD-441; BEH-QD-586 to 590; INV-QD-345 to 346 (INV-QD-011 is pinned, not duplicated); changeset for `@qadi/core` (patch) only if code changes
**Opens on a benchmark** (AGENTS.md §5a requires `pnpm bench` before a change near budgeted switch #1, `evaluateNode`): a prototype in which `evaluateNode` reads a module-scope leaf-needs table is measured against the phase base, and the numbers go in ADR-QD-163. If any workload regresses beyond run-to-run noise, the phase ends with a recorded rejection, no source change, and LEAF-02 to LEAF-05 marked "Not pursued (measured)".
**Settled by the review check**: the rule is written per leaf and per interpreter. In `Walk.ts`, `action === undefined && referencesAction(matcher)` appears twice, the `HasAction` check once, a resource-referencing matcher raises `MissingResource`, and `HasResourceAttribute` raises `MissingResource`; `PortAccess.ts`'s `readScoped` raises `MissingResourceId`; `Predicate.ts` rewrites the same checks as `NeedAction` plans. The check order differs per leaf (`HasAttribute` checks action then resource, `HasResourceAttribute` resource then action), so a request missing both gets a different error depending on the leaf, and nothing states whether that matters. The port-free `HasRole`/`HasPermission` are judged in both `Walk.ts` and `Predicate.ts`. ADR-QD-024/100 (admission is shared, the walks stay two) and the `SWITCH_BUDGET` stay.

**Success Criteria** (what must be TRUE):
  1. `pnpm bench` numbers for the table prototype against the phase base, per workload, are recorded in ADR-QD-163 with the noise band, and the phase's outcome (pursue or reject) follows from them. On a rejection no source file changes, ADR-QD-163 records the rejection and its numbers, and LEAF-02 to LEAF-05 are annotated "Not pursued (measured)".
  2. If pursued: one package-private module states, per leaf, which request inputs it needs (action, resource, resource id), which error each absence becomes, and one stated check order; `Walk` and `Predicate` both read it, and the per-leaf copies of those checks are gone from the phase's added code.
  3. If pursued: the difference in check order between leaves is preserved or changed deliberately, pinned by a RED-first test over a request missing both the action and the resource for each leaf kind, and a behaviour row states the decision.
  4. If pursued: the port-free `HasRole`/`HasPermission` judgement is written once and both interpreters use it, and an exhaustive table test over every leaf tag pins INV-QD-011.
  5. If pursued: `SWITCH_BUDGET` and `UNTRACED_BUDGET` are unchanged (the AGENTS.md tables and the budgets agree), and `pnpm bench` after the change shows no workload regressed beyond noise against the phase base.

**Planning notes**: **The benchmark is the first plan, and it gates the rest.** Prototype on a scratch branch or an unmerged commit, run `pnpm bench` against the base the way ADR-QD-073's addendum did, and record the table before writing any source that stays. Re-verify the `Walk.ts`, `PortAccess.ts` and `Predicate.ts` line numbers in `_WAVE10-CONTEXT.md` against the base. If pursued, **plan shape, RED first**: the mutation base for `Walk.ts`, `Predicate.ts` and `PortAccess.ts`, and the missing-both-inputs characterisation per leaf kind, committed first; then the module; then `Walk`; then `Predicate`; then records.
**Plans**: TBD

### Phase 51: Policy tag arity stated once

**Goal**: Each policy tag's arity (Leaf, Wrapper or Many) is stated once in `Policy.ts`, so `Decision.ts`'s trace shape reads it instead of a hand-kept `leafTags` array, and moving a tag's arity in one place and not the other fails to compile.
**Depends on**: Phase 50 (serial order only). Soft edge: both edit `Walk.ts` and `Policy.ts`, so this phase starts from whatever Phase 50 left (the base, if 50 ended in a rejection).
**Requirements**: ARTY-01, ARTY-02, ARTY-03, WX-01, WX-02, WX-03, WX-04, WX-05, WX-06, WX-07
**Records**: ARCH-98; ADR-QD-164 (or the CCR row states why `renderTrace` and `diffTraces` keep their own walks); CCR-QD-442; BEH-QD-591 to 595; INV-QD-347 to 348 (INV-QD-090 is kept); changeset for `@qadi/core` (patch; minor if the arity record is exported)
**Settled by the review check**: `Policy.ts`'s `childrenOf`, `LeafPolicy` and `leafCases` state which tags are leaf, wrapper or many; `Decision.ts` restates them in a hand-kept `leafTags` array plus `traceShapeOf`, exhaustive over tag names but tied to nothing, so moving a wrapper tag under "Many" there compiles. **Correction to the review:** `foldTrace` has no callers in the repo, by design: it is the stack-safe public primitive for hosts holding a `Trace` (INV-QD-090), and it stays. `renderTrace` (pre-order with indentation) and `diffTraces` (lockstep over two trees) keep their own walks, and the ADR or CCR states why.

**Success Criteria** (what must be TRUE):
  1. One closed record in `Policy.ts` gives each policy tag's arity (Leaf, Wrapper or Many); `traceShapeOf` reads it and `leafTags` is deleted.
  2. A type-level test ties `LeafPolicy` and `childrenOf` to the record: a checked `@ts-expect-error` negative shows that moving a tag's arity in one place and not the other fails to compile, where on the base moving a wrapper tag under "Many" in `Decision.ts` compiles (recorded).
  3. Every policy tag's trace shape is unchanged, pinned by a table test over all tags written on the base and green before and after.
  4. `foldTrace` stays public and unchanged (the barrel pin and its INV-QD-090 tests untouched), `renderTrace` and `diffTraces` keep their own walks, and the ADR or CCR states why; `SWITCH_BUDGET` is unchanged.

**Planning notes**: **Plan shape, RED first**: the mutation base for `Policy.ts` and `Decision.ts`, the all-tags shape table and the recorded base experiment (move a tag, it compiles), committed first; then the record and the two readers; then the type-level negative; then records. Re-run `pnpm circular`.
**Plans**: TBD

### Phase 52: Core owns the predicate compile shell

**Goal**: Core owns the shell every predicate dialect repeats (the defaults, renderability, and counting refused and compiled outcomes), so `@qadi/predicate-sql` and `@qadi/predicate-prisma` each keep only their rules, their renderer and their own metric.
**Depends on**: Phase 51 (serial order only; no shared source).
**Requirements**: COMP-01, COMP-02, COMP-03, COMP-04, WX-01, WX-02, WX-03, WX-04, WX-05, WX-06, WX-07
**Records**: ARCH-99; ADR-QD-165 (ADR-QD-054 and ADR-QD-079 kept: a companion package may compile a dialect, and renderability is a core rule; ADR-QD-123 kept); CCR-QD-443; BEH-QD-596 to 600; INV-QD-349 to 350; changesets for `@qadi/core` (minor: the new export), `@qadi/predicate-sql` (patch) and `@qadi/predicate-prisma` (patch)
**Settled by the review check**: `predicate-sql/src/index.ts` and `predicate-prisma/src/index.ts` repeat the same shell: `identifiers ?? "Ascii"`, `maxInValues ?? DEFAULT_MAX_IN_VALUES`, `toRenderable`, then `tapError(refused)` and `update(compiled)`. Both `CompileMetrics.ts` files are identical except for the metric id and description. The renderers are rightly different (Prisma folds vacuous identities; SQL accumulates parameters) and stay in their packages. ADR-QD-123 stands: each package declares its own metric once, the ids stay distinct, and the `[metric-table]` rows are unchanged.

**Success Criteria** (what must be TRUE):
  1. One core function owns compiling with a dialect's rules and renderer: the defaults (`identifiers`, `maxInValues`), `toRenderable`, and counting refused and compiled outcomes against a counter series the caller supplies. The repeated shell is gone from both packages' added code (scoped grep).
  2. `compileSql` and `compilePrismaWhere` keep only their rules, their renderer and their own declared metric; the ids are distinct, each metric is declared once, the `[metric-table]` rows and `METRIC_ID_LITERAL_BUDGET` are unchanged.
  3. Output is unchanged for both dialects, refusals included, shown by differential or characterisation tests written on the phase base (a row per refusal reason per dialect) and green before and after, and each call moves its dialect's counter exactly once.
  4. `spec/overview.md` names the new core export (gate 13), the changesets cover all three packages, and `pnpm check:pr < /dev/null` is green.

**Planning notes**: **Plan shape, RED first**: the mutation base for both dialects' `index.ts` and `CompileMetrics.ts`, and the differential tests, committed first; then core's function with one dialect converted; then the second; then records. Re-run `pnpm circular`, and check the packed `exports` map (gate 14) for the new core name.
**Plans**: TBD

### Progress (v1.5)

**Execution Order:**
Phases execute in numeric order: 43 → 44 → 45 → 46 → 47 → 48 → 49 → 50 → 51 → 52

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 43. One handover module behind the enforcement entry points | 8/8 | Complete    | 2026-11-15 |
| 44. The hydration seed's fields stated once | 6/6 | Complete    | 2026-11-15 |
| 45. The audit circuit breaker as one transition function | 8/8 | Complete    | 2026-11-15 |
| 46. The sink emitter reports what it contains | 7/7 | Complete    | 2026-11-15 |
| 47. Port facts read from the description | 6/7 | In Progress | - |
| 48. Audit reports core's refusal and derives "lost" | 0/TBD | Not started | - |
| 49. Gates as the dock model's eighth store, one gate-state vocabulary | 0/TBD | Not started | - |
| 50. What a leaf needs from the request, stated once | 0/TBD | Not started | - |
| 51. Policy tag arity stated once | 0/TBD | Not started | - |
| 52. Core owns the predicate compile shell | 0/TBD | Not started | - |
