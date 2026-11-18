# Roadmap: Qadi

## Milestones

- ✅ **v1.0 Arch Wave 5** — Phases 1-9 (shipped 2026-11-09) — [archive](milestones/v1.0-ROADMAP.md)
- 🚧 **v1.1 Arch Wave 6** — Phases 10-20 (all phases complete 2026-11-10; merged to `main` in #155; not archived as a GSD milestone; not released)
- ✅ **v1.2 Arch Wave 7** — Phases 21-29 (completed 2026-11-12; not released) — [archive](milestones/v1.2-ROADMAP.md)
- ✅ **v1.3 Arch Wave 8** — Phases 30-36 (completed 2026-11-13; not released) — [archive](milestones/v1.3-ROADMAP.md)
- ✅ **v1.4 Arch Wave 9** — Phases 37-42 (completed 2026-11-14; not released) — [archive](milestones/v1.4-ROADMAP.md)
- ✅ **v1.5 Arch Wave 10** — Phases 43-52 (completed 2026-11-16; not released) — [archive](milestones/v1.5-ROADMAP.md)
- 🚧 **v1.6 Arch Wave 11** — Phases 53-61 (in progress)

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

## 🚧 v1.6 Arch Wave 11 (Phases 53-61)

### Overview

Wave 11 resolves the nine candidates of the 2026-11-16 architecture review. The first is a live fail-open, so it comes first: `evaluatePredicate`, the reference interpreter the SQL and Prisma engines are differential-tested against, reads `row[p.column]` without the own-property rule that six other readers apply, so `hasResourceAttribute("constructor", neq(literal("x")))` on `{ id: "r1" }` is denied by `evaluate` and allowed by the reference (53). Five "stated once" deepenings follow: every leaf's answer-to-verdict step in `LeafNeeds.ts` (54); a port card as a model row keyed by `PortName` (55); the gate-registry watch as the dock model's third feed (56), which opens on a user decision about the `questions` thunk; the envelope's unknown-key policy as one `untrustedDecoder` option (57), which opens on a user decision about the record's `TooDeep` answer; and a stored record that is its envelope in memory too (58, Breaking). Phase 59 opens on a benchmark and may end in a recorded rejection. Phases 60 and 61 are the two speculative ones, each behind a human checkpoint, and either may end in a recorded rejection ADR. Base commit `44510112` (the head of `main`; v1.5 merged as #162), branch `arch-wave-11`. Read `.planning/phases/_SHARED-CONTEXT.md`, then `.planning/phases/_WAVE11-CONTEXT.md`, which overrides it only where it names the source review, the base, the numbering and the per-phase evidence. Each planner re-verifies that evidence against `44510112` before planning.

**The nine phases and their order are fixed (2026-11-18).** Nothing is added, merged, split or reordered.

**Standing direction (user, unchanged):** the cleanest design wins, not the simplest, and the project is not in production, so breaking changes are allowed. Keeping a public name, avoiding a Breaking changeset or keeping source compatibility is never the reason to pick a design. Every break is recorded (changeset marked **Breaking**, `apps/website/.../reference/upgrading.md`). Nothing is released or published, no version-packages PR is merged, and the branch is not merged.

Order: the defect first (53), then the "stated once" deepenings (54-58), then the benchmark-gated phase (59), then the two speculative phases (60-61). **Execution order: phases run strictly one at a time, in numeric order (53 → 61).** Every records plan edits the same spec registers (CCR tail, invariants, traceability, `index.yaml`, `overview.md`, behaviour docs) and `use_worktrees` is false. The per-phase "Depends on" lines name the soft content edges; serial order is the operational rule.

**Every phase** carries the seven cross-cutting requirements (WX-01, WX-02, WX-03, WX-04, WX-05, WX-06, WX-07): `pnpm check:pr < /dev/null` green at the end (ten silent minutes means hung); ADR (or "Unused" in its CCR row), CCR, BEH/INV and traceability records using only reserved numbers, never `node scripts/next-id.mjs`; `spec/overview.md` names every added export and drops every removed one (gate 13 checks names only, so a moved declaration's module column is corrected by hand); no new `as`, `!`, `any`, `switch`, `Effect.fnUntraced`, `async`/`await` or ambient `console`/`process.env`/clock, and a budget changes only together with its AGENTS.md table; coverage held (core at least 95 percent, the others at least 90) and per-file Stryker scores recorded in the first plan (`NN-mutation-base.json`, the same invocation at the base and the close) and compared in the last, a drop closed with a test and never re-baselined; a characterisation or regression test written on the phase base before any behaviour change (RED for a defect, green for preserved behaviour); every public break recorded as **Breaking** in its package's changeset and in `upgrading.md`. Re-run `pnpm circular` after the first source edit of every phase that moves a declaration, and `pnpm spec:website-examples` explicitly for any phase that edits a website page.

**Soft edges** (from `_WAVE11-CONTEXT.md`; none is a hard edge, serial order covers all of them):

| Edge | Strength | Reason |
|------|----------|--------|
| 53 → 54 | soft | both edit `Walk.ts`, `Predicate.ts` and `LeafNeeds.ts`; 54 starts from 53's version |
| 53, 54 → 59 | soft | 59 edits `Walk.ts` again; it starts from whatever 53 and 54 left |
| 55 → 56 | soft | both edit devtools' `DockModel` and panels; 56 starts from 55's version |
| 56 → 60 | soft | both edit the feeds and devtools' `index.ts`; 60 starts from 56's version |
| 57 → 58 | soft | both edit `SinkCodec.ts`; 58 starts from 57's version |

**Numbering reserved for v1.6** (the whole block is held in the shared reservation file, set to CCR 452, ADR 174, BEH 645, INV 368 on 2026-11-18; confirm a number is free by grepping `spec/`, `packages/`, `.changeset/` and `AGENTS.md` before using it; name an unused reservation "Unused:" in the phase's CCR row). Next free on `44510112`: ADR-QD-166, CCR-QD-444, BEH-QD-601, INV-QD-351. Highest ARCH is ARCH-99; ARCH ids below 100 are never reused. ADR Document IDs equal the file number (gate 10).

| Phase | ARCH | ADR-QD | CCR-QD | BEH-QD | INV-QD |
|---|---|---|---|---|---|
| 53 | 100 | 166 | 444 | 601–605 | 351–352 |
| 54 | 101 | 167 | 445 | 606–610 | 353–354 |
| 55 | 102 | 168 | 446 | 611–615 | 355–356 |
| 56 | 103 | 169 | 447 | 616–620 | 357–358 |
| 57 | 104 | 170 | 448 | 621–625 | 359–360 |
| 58 | 105 | 171 | 449 | 626–630 | 361–362 |
| 59 | 106 | 172 | 450 | 631–635 | 363–364 |
| 60 | 107 | 173 | 451 | 636–640 | 365–366 |
| 61 | 108 | 174 | 452 | 641–645 | 367–368 |

**Already deep, not re-planned** (`_WAVE11-CONTEXT.md`): `Ports.ts`/`PortAccess.ts`/`PortDerivation.ts` (ADR-QD-094/160), `Compare.ts` (ADR-QD-091; Phase 53's module sits beside it), audit `CircuitBreaker.ts`, http `AuthorizeRequest.ts`, `Handover.ts`/`Qadi.ts`, the audit outcome/report trio, devtools `model/Source.ts` and `model/Remedies.ts`, react `SeededQuestion.ts`, `HydrationEvent.ts` and devtools `model/Hydration.ts`. Settled by an ADR and not re-proposed: the decision stream's record codec parameter (ADR-QD-097 amendment 1.4), `QadiProvider`'s registry lifetime, "encode, then report a refusal" in each sink adapter (ADR-QD-095 D-09-e), QadiHttpError's `…Response` aliases (ADR-QD-102), `devtoolsPath`/`portPath` prefix joining, and a shared child-walk driver and the three `fnUntraced` functions (ADR-QD-073 addendum).

### Phases

- [x] **Phase 53: One module owns "the value a leaf compares"** - One own-property-only operand read for every interpreter; `evaluatePredicate` can no longer allow a row `evaluate` denies (ARCH-100, core; live defect) (completed 2026-11-18)
- [ ] **Phase 54: LeafNeeds turns every leaf's answer into a verdict** - The acted leaf's polarity map and verdict rule, and every other leaf's answer-to-verdict step, written once and read by `Walk` and `toPredicate` (ARCH-101, core)
- [ ] **Phase 55: A port card is a model row, not a view join** - One pure model function returns a row per `PortName`; `ServicesPanel` renders rows only (ARCH-102, devtools)
- [ ] **Phase 56: The gate-registry watch becomes the dock model's third feed** - Opens on a user decision; one scoped feed module owns the watch and `DockModel` composes three feeds (ARCH-103, devtools)
- [ ] **Phase 57: untrustedDecoder states the envelope's unknown-key policy** - Opens on a user decision; one stated option (refuse | ignore without walking) for both `SinkCodec` envelopes and the audit and hydration seams (ARCH-104, core, audit, react)
- [ ] **Phase 58: A stored record is its envelope in memory too** - The in-memory stored record is the producer's `environment` next to a `SinkRecord`; two classes and two stamp functions are deleted (ARCH-105, Breaking, core, http, devtools)
- [ ] **Phase 59: Admission produces the one walk environment** - Opens on a benchmark; recursion passes `(policy, env, depth)`, or a recorded rejection (ARCH-106, core)
- [ ] **Phase 60: Devtools' headless interface is the feeds** - Opens on a human checkpoint; the feeds replace the store/runner pairs in the barrel, or a recorded rejection (ARCH-107, Breaking, devtools)
- [ ] **Phase 61: DecisionCache is asked only the question** - Opens on a human checkpoint; core supplies the matching walk so no caller can pair a key with an unrelated computation, or a recorded rejection (ARCH-108, core)

### Phase Details

### Phase 53: One module owns "the value a leaf compares"

**Goal**: A decoded key is read as an own property by exactly one package-private module that every interpreter uses, so the reference interpreter `evaluatePredicate` can no longer allow a row that `evaluate` denies, and INV-QD-091's "cannot disagree by construction" holds for the operand read as well as for the verdict.
**Depends on**: Nothing in v1.6 (first phase; serial order).
**Requirements**: OPND-01, OPND-02, OPND-03, OPND-04, OPND-05, WX-01, WX-02, WX-03, WX-04, WX-05, WX-06, WX-07
**Packages**: `@qadi/core` (the predicate-sql and predicate-prisma suites are run, not edited)
**Records**: ARCH-100; ADR-QD-166 (extends ADR-QD-091 and ADR-QD-024); CCR-QD-444; BEH-QD-601 to 605; INV-QD-351 to 352 (INV-QD-091 restated in place to cover the operand read)
**Settled by the review check**: the rule is restated at six call sites, each with a comment saying it mirrors the others (`Walk.ts` `HasResourceAttribute`, `PortAccess.ts` `readAttribute`, `Matcher.ts` `getByPath` and FieldMatch, `FieldPath.ts` `projectAt`, `Decision.ts`); the seventh reader, `Predicate.ts:163-164`, never got it. Probe (built `lib` of arch-wave-10, same source): `evaluate` denies, `evaluatePredicate` on the same row returns `true`; the unguarded read is verified on `44510112`.

**Success Criteria** (what must be TRUE):
  1. A regression test committed on the phase base is RED: for `hasResourceAttribute("constructor", neq(literal("x")))` on `{ id: "r1" }`, `evaluate` denies and `evaluatePredicate(toPredicate(…))` allows. After the phase the same test is GREEN, and both deny.
  2. One package-private module beside `Compare.ts` owns reading the value a leaf compares: a single-key cell read and a dot-path read, both own-property only. The walk, the port attribute read, matcher refs (`getByPath`), FieldMatch, `evaluatePredicate`, field projection and `Decision.ts` read leaf values only through it; no other `Object.hasOwn` read on a decoded key remains in those files, and the "mirroring" comments are gone (scoped grep).
  3. An agreement property over keys that include prototype names (`constructor`, `toString`, `__proto__`, `hasOwnProperty`, `valueOf`) shows `evaluate` ≡ `evaluatePredicate ∘ toPredicate`, and the predicate-sql and predicate-prisma engine-agreement suites stay green.
  4. ADR-QD-166 extends ADR-QD-091 and ADR-QD-024 (two walks stay two), INV-QD-091 is restated to cover the operand read, and the `SWITCH_BUDGET` switches in `Matcher.ts` (`judgeMatcher`, `resolveRef`) are unchanged.

**Planning notes**: Re-verify the line numbers in `_WAVE11-CONTEXT.md` against `44510112`. Plan shape, RED first: the mutation base for the touched files and the RED probe, committed first; then the module with one reader converted at a time; then records. Re-run `pnpm circular` after the first move.
**Plans**: 8/8 plans complete

Plans:
- [x] 53-01 (W1): Base facts, engine suites and reserved ids re-verified at `phase_base`; the scoped Stryker baseline of the eight readers and the D-14 comparer, committed alone first (WX-02, WX-05, WX-06).
- [x] 53-02 (W2): GREEN characterisation of what the move keeps, then the four RED tests (the prototype-named column, the prototype-names agreement property, both fixture builders), before any src change (OPND-01, OPND-04, WX-06).
- [x] 53-03 (W3): Tracer: package-private `Operand.ts` (`ownValue`, `isOwnKey`, `getByPath`) with `Matcher.ts`'s re-export and `evaluatePredicate` reading through it; then both fixture builders (OPND-01..04).
- [x] 53-04 (W4): FieldMatch, the walk's `HasResourceAttribute` and `readAttribute` read through `Operand.ts`; mirroring comments gone (OPND-03).
- [x] 53-05 (W5): `projectAt` and `Decision.ts` read through `Operand.ts`; the eight-file OPND-03 check, engine suites, typecheck, lint, circular (OPND-03, OPND-04).
- [x] 53-06 (W6): Stryker after-run with the same invocation plus `Operand.ts`; D-14 compare; a drop closed with a test, never re-baselined (WX-05).
- [x] 53-07 (W7): ADR-QD-166 and the 091/024 amendments, BEH-QD-601..605, INV-QD-091 restated, INV-QD-351..352, traceability, the `getByPath` overview note (OPND-05, WX-02, WX-03).
- [x] 53-08 (W8): CCR-QD-444 and the `@qadi/core` patch changeset; the whole-phase scan; `pnpm check:pr`; the release check (WX-01..04, WX-06, WX-07).

### Phase 54: LeafNeeds turns every leaf's answer into a verdict

**Goal**: Every leaf's answer-to-verdict step lives in `LeafNeeds.ts` (or a sibling), finishing ADR-QD-163, so `Walk` keeps only its reason sentence and `toPredicate` keeps only constant folding.
**Depends on**: Phase 53 (soft: both edit `Walk.ts`, `Predicate.ts` and `LeafNeeds.ts`; start from 53's version).
**Requirements**: VERD-01, VERD-02, VERD-03, VERD-04, WX-01, WX-02, WX-03, WX-04, WX-05, WX-06, WX-07
**Packages**: `@qadi/core`
**Records**: ARCH-101; ADR-QD-167 (extends ADR-QD-163; ADR-QD-024 and ADR-QD-020 kept); CCR-QD-445; BEH-QD-606 to 610; INV-QD-353 to 354
**Settled by the review check**: ADR-QD-163 moved `holdsRole`, `holdsPermission` and `holdsAction` into `LeafNeeds.ts` and left the acted leaf out: the polarity map (`_tag === "HasActed" ? "Acted" : "NotActed"`) is at `Walk.ts:181` and `Predicate.ts:383`, and the verdict (`answer === wanted`, where `Unknown` denies both polarities, ADR-QD-020) at `Walk.ts:186` and `Predicate.ts:592`.

**Success Criteria** (what must be TRUE):
  1. The acted leaf's polarity mapping (`HasActed` → `Acted`, `HasNotActed` → `NotActed`) and its verdict rule (`answer === wanted`, `Unknown` denying both polarities) are each written once, in `LeafNeeds.ts` or a sibling, and both `Walk` and `toPredicate` read them; the second copy of each is gone from the phase's added code (scoped grep).
  2. Every leaf's answer-to-verdict step lives in that one place: the walk keeps only its reason sentence, and the translator keeps only constant folding.
  3. A per-leaf verdict table test (answer × polarity → verdict) covers every leaf tag, written on the phase base and green before and after, and the existing evaluate/`toPredicate` agreement for `scope: "Any"` acted leaves stays green.
  4. ADR-QD-167 extends ADR-QD-163, and `SWITCH_BUDGET` and `UNTRACED_BUDGET` are both unchanged (the AGENTS.md tables and the budgets agree).

**Planning notes**: Re-verify the line numbers against the base left by Phase 53 (the cell read moved there). Plan shape, RED first: the mutation base and the verdict table on the base, then the move, then records.
**Plans**: 8 plans

Plans:
- [ ] 54-01 (W1): mutation baseline for LeafNeeds, Predicate and Walk, plus base facts, verdict-step baselines and the bench base
- [ ] 54-02 (W2): LeafVerdict.test.ts characterises every leaf's answer through evaluate and toPredicate, on the base
- [ ] 54-03 (W3): tracer — the LEAF_VERDICTS record (RED unit test first) and the acted path through it in Walk and Predicate; type pins
- [ ] 54-04 (W4): every other leaf decided through its row; the walk keeps its sentences, the translator its folds
- [ ] 54-05 (W5): bench after (information) and the Stryker after-run; D-10 comparison holds
- [ ] 54-06 (W6): ADR-QD-167 with amendment pointers in ADR-QD-163, 020 and 024; BEH-QD-606..610
- [ ] 54-07 (W7): INV-QD-353..354 and traceability; CCR-QD-445 and the @qadi/core patch changeset; spec gates green
- [ ] 54-08 (W8): phase scan, verdict-step checks, check:pr, release check; VERD-01..04 complete

### Phase 55: A port card is a model row, not a view join

**Goal**: A port card is one row of a pure devtools model keyed by `PortName`, so a misspelt or renamed port is a compile error instead of rendering "never called", and `ServicesPanel.tsx` renders rows and computes nothing.
**Depends on**: Phase 54 (serial order only; no shared source).
**Requirements**: CARD-01, CARD-02, CARD-03, CARD-04, CARD-05, WX-01, WX-02, WX-03, WX-04, WX-05, WX-06, WX-07
**Packages**: `@qadi/devtools`
**Records**: ARCH-102; ADR-QD-168 (follows ADR-QD-162's precedent; ADR-QD-047's "the panel renders that model and computes nothing" restated for the Services tab; ADR-QD-160 kept); CCR-QD-446; BEH-QD-611 to 615; INV-QD-355 to 356
**Settled by the review check**: `ServicesPanel.tsx` pairs each `report.ports` row with `activityFor` and `callsFor` through three differently typed keys (`PortReport.port: WiredServiceName`, `PortActivity.port: string`, `PortCall["_tag"]`); state wording, "never called" vs "no activity reading" vs "absent", the retries/timeouts suffixes, newest-first with five shown and "N earlier", and the uncollected/unsampled note all live in the view. The consequence text is already model (`PORT_READING`, ADR-QD-160). Two test files hold about 30 cases, all render.

**Success Criteria** (what must be TRUE):
  1. A characterisation of every port card's text and `data-testid`s is written on the phase base and stays byte-identical after the phase.
  2. One pure model function, `joinQuestions`' counterpart, takes the wiring read, the port activity, the call log and the unsampled flag and returns one row per `PortName`: its state, activity line, recent calls with the count beyond them, and consequence voice.
  3. All three readings are keyed by `PortName`: a misspelt or unknown port is a compile error (shown by a type-level test), and no `string` key comparison remains in the join.
  4. `ServicesPanel.tsx` renders rows only. Most of its ≈30 render cases move to headless model tests, a short render test keeps the `data-testid`s, and ADR-QD-168 restates ADR-QD-047's "renders that model and computes nothing" for the Services tab.

**Planning notes**: Re-verify the evidence against the base (`ServicesPanel.tsx`, `model/Wiring.ts`, `model/PortCalls.ts`, `model/PortReading.ts`). Plan shape, RED first: the mutation base and the byte-identical characterisation first; then the model function and its tests; then the panel reads it; then records.
**UI hint**: yes
**Plans**: TBD

### Phase 56: The gate-registry watch becomes the dock model's third feed

**Goal**: The gate-registry watch is a scoped feed module shaped like the timeline and diagnostics feeds, so `DockModel` composes three feeds and no longer holds the watch's subscription, guarded reads, failure keying and finalizer inline.
**Depends on**: Phase 55 (soft: both edit devtools' `DockModel` and panels; start from 55's version).
**Requirements**: GFED-01, GFED-02, GFED-03, GFED-04, GFED-05, WX-01, WX-02, WX-03, WX-04, WX-05, WX-06, WX-07
**Packages**: `@qadi/devtools`
**Records**: ARCH-103; ADR-QD-169 (applies ADR-QD-137 and records the user's decision below; ADR-QD-162 left intact, ADR-QD-150 kept); CCR-QD-447; BEH-QD-616 to 620; INV-QD-357 to 358; **Breaking** (the `@qadi/devtools` changeset and `upgrading.md`) only if the user moves the `questions` thunk
**Opens on a user decision**: whether the feed also owns the `questions` thunk, giving one failure policy for the panel's two host inputs (today a throwing `questions` thunk ends the whole diagnostics poll while a throwing registry becomes only `GatesView.Failed`). Yes takes `questions` out of `DiagnosticsDockOptions` (Breaking for `useDevtoolsFeed`, amends ADR-QD-047's 2026-11-12 amendment). The planner surfaces it, and it is settled before the feed's interface is planned.
**Settled by the review check**: `DockModel.ts` (294 lines) reads two host inputs through `TimelineFeed.ts` and `DiagnosticsFeed.ts` and the third inline: `reasonOf`/`keyOf`, `readGates`, `rejoin`, `watchGates`, the finalizer, the `configure` branch and eight mutable `let`s. ADR-QD-162 decision 5 was revised three times on the day it was written, all about this guard. About 650 lines of `DockModel.test.ts` ("the questions store") build the whole model to exercise the watch.

**Success Criteria** (what must be TRUE):
  1. Before planning the user decides whether the feed also owns the `questions` thunk, and the decision and its reason are recorded in ADR-QD-169, which applies ADR-QD-137 and leaves ADR-QD-162 intact. The remaining criteria hold on either answer; on "yes", `questions` leaves `DiagnosticsDockOptions` and the Breaking change is recorded.
  2. One package-private scoped feed module owns the gate-registry watch (the subscription, the guarded reads, failure keying, re-subscription on `configure`, release in a finalizer) and exposes one snapshot (instances or failure) and `subscribe`, in the shape of the timeline and diagnostics feeds. `DockModel` composes three feeds and calls `joinQuestions`, and no mutable gate-watch state is left in `DockModel.ts` (eight `let`s at the base).
  3. The watch's cases (M31 to M47 and P2) run against the feed alone with `gateRegistryDouble.ts`: a throwing `instances` or `subscribe`, a swapped registry, a throwing release, a closed scope, and one failure arriving from two paths published once. `DockModel.test.ts` keeps one test showing that the join moves first.
  4. The questions panel's observable behaviour is unchanged, pinned by characterisation tests written on the phase base and green before and after, and the lifetime stays the scope (ADR-QD-137, ADR-QD-150).

**Planning notes**: The user decision is the first thing settled. Plan shape, RED first: the mutation base for `DockModel.ts` and the new feed, and the panel characterisation, committed first; then the feed with the watch moved out of the model; then the tests rewritten against the feed alone; then records.
**UI hint**: yes
**Plans**: TBD

### Phase 57: untrustedDecoder states the envelope's unknown-key policy

**Goal**: `untrustedDecoder` takes an envelope's unknown top-level key policy as one stated option (refuse, or ignore without walking), so both `SinkCodec` envelopes stop building the rule by hand and the five modules that wrap an envelope state the same policy the same way.
**Depends on**: Phase 56 (serial order only; no shared source).
**Requirements**: KEYP-01, KEYP-02, KEYP-03, KEYP-04, KEYP-05, WX-01, WX-02, WX-03, WX-04, WX-05, WX-06, WX-07
**Packages**: `@qadi/core`, `@qadi/audit`, `@qadi/react`
**Records**: ARCH-104; ADR-QD-170 (records the user's decision below; ADR-QD-096 D-15-c and its ADR-QD-143 amendment, ADR-QD-143 and ADR-QD-153 kept); CCR-QD-448; BEH-QD-621 to 625; INV-QD-359 to 360; `UNTRUSTED_DECODE_BUDGET` and AGENTS.md §7a's table move together (a budget edit, not a removal)
**Opens on a user decision**: is the record's `TooDeep` answer for a deep unknown key intended? Today `UntrustedSeams.test.ts:195` pins it (the guard walks before `prepare` drops the key) while `:249` pins the opposite for the stored envelope (a 60,000-deep unknown key succeeds). The user settles which way the policy goes before planning.
**Settled by the review check**: the record wire hand-writes its tolerance in a `prepare` step (`envelopeOf`, `ownValue`); the stored envelope bypasses the decoder with its own `isPlainObject`, `Object.hasOwn`, `ownValue` and `JSON.parse`; the audit row, the archive and hydration use `unwalked` and refuse an unknown top-level key. `UntrustedDecode.ts` has no option for "ignore an unknown top-level key".

**Success Criteria** (what must be TRUE):
  1. Before planning the user decides whether a record envelope's deep unknown key is `TooDeep` (today) or ignored, and the decision is recorded in ADR-QD-170.
  2. `untrustedDecoder` takes the envelope's unknown top-level key policy as one stated option (refuse, or ignore without walking). Both `SinkCodec` envelopes (the record wire and the stored record) decode through it; `ownValue`, `envelopeOf` and the hand-rolled stored reader are deleted; `UNTRUSTED_DECODE_BUDGET` and AGENTS.md §7a's table move together, checked in both directions.
  3. The audit row, the archive and hydration state their policy through the same option, with no hand-built partial walk left.
  4. The `UntrustedSeams` matrix runs per policy (a shallow unknown key, a deep unknown key, an excess key inside the payload, non-object input). Every seam's answer is unchanged except where the decision in criterion 1 changed it, and each changed answer has a RED test written on the phase base.

**Planning notes**: The user decision is the first thing settled. Plan shape, RED first: the mutation base for `SinkCodec.ts`, `UntrustedDecode.ts`, `AuditEntry.ts`, `AuditArchive.ts` and `HydrationEngine.ts`, and the per-policy matrix characterised on the base; then the option; then each envelope converted; then records. Keep ADR-QD-096 D-15-c's order (guard, version, project, decode).
**Plans**: TBD

### Phase 58: A stored record is its envelope in memory too

**Goal**: In memory a stored record is what it is on the wire, the producer's `environment` next to a `SinkRecord`, so the two flattened classes and the stamping that translates between the two shapes are gone and a new `SinkRecord` kind needs no stored class, stamp arm or decode re-stamp.
**Depends on**: Phase 57 (soft: both edit `SinkCodec.ts`; start from 57's version).
**Requirements**: STOR-01, STOR-02, STOR-03, STOR-04, WX-01, WX-02, WX-03, WX-04, WX-05, WX-06, WX-07
**Packages**: `@qadi/core`, `@qadi/http`, `@qadi/devtools` (**Breaking** for devtools' timeline and the http encoders; 11 `src` files name `StoredRecord`)
**Records**: ARCH-105; ADR-QD-171 (makes ADR-QD-097 D-11-e true in memory as well as on the wire); CCR-QD-449; BEH-QD-626 to 630; INV-QD-361 to 362; a **Breaking** changeset for each affected package and an `upgrading.md` entry
**Settled by the review check**: on the wire a stored record is `{ environment, record }` (`StoredRecordJson`); in memory `StoredDecisionRecord`, `StoredObligationRecord`, `stampRecord` and `stampRecordMatch` flatten it (`DecisionRecord.ts:118-186`), the codec flattens on decode and nests on encode, about 20 lines of doc explain the prototype-loss trap the flattening creates, and devtools writes a third spelling, `ObligationRecord & { environment: string }`.

**Success Criteria** (what must be TRUE):
  1. In memory the stored record is the envelope, the producer's `environment` next to a `SinkRecord`. `StoredDecisionRecord`, `StoredObligationRecord`, `stampRecord`, `stampRecordMatch` and the prototype-loss doc are deleted, and devtools' third spelling (`ObligationRecord & { environment }`) is gone.
  2. The stored codec is the record codec plus one field, and the stored byte goldens committed on the base are unchanged.
  3. `DecisionLog`'s backlog stamping, `storedRecordOrder` (which reads the record's `at`), the http encoders and devtools' timeline all read the envelope, pinned by a SinkCodec stored round trip, a backlog-stamping test and an order test written on the phase base and green before and after.
  4. ADR-QD-171 makes ADR-QD-097 D-11-e true in memory as well as on the wire, and the break is recorded as **Breaking** in each affected package's changeset and in `upgrading.md`.

**Planning notes**: Re-verify the 11 `src` files that name `StoredRecord` against the base Phase 57 leaves. Plan shape, RED first: the mutation base and the characterisation tests (stored round trip, backlog stamping, order, byte goldens) first; then core's envelope; then http and devtools; then records and changesets.
**Plans**: TBD

### Phase 59: Admission produces the one walk environment

**Goal**: Admission produces the one walk environment (subject, resource, action, `supplied`, matcher context, `maxDepth`) that both interpreters read, so recursion passes `(policy, env, depth)`, each fact is carried once and `depth` and `maxDepth` can no longer be swapped and still compile. Or, if a benchmark shows the change costs more than run-to-run noise, the phase ends with a measured rejection recorded in ADR-QD-172.
**Depends on**: Phase 58 (serial order only). Soft edge to Phases 53 and 54 (all edit `Walk.ts` and `Predicate.ts`; start from whatever they left).
**Requirements**: WENV-01, WENV-02, WENV-03, WENV-04, WX-01, WX-02, WX-03, WX-04, WX-05, WX-06, WX-07
**Packages**: `@qadi/core`
**Records**: ARCH-106; ADR-QD-172 (the benchmark numbers, and the rejection if it ends in one); CCR-QD-450; BEH-QD-631 to 635; INV-QD-363 to 364; a changeset only if code changes
**Opens on a benchmark** (AGENTS.md §5a requires `pnpm bench` before a change near budgeted switch #1, `evaluateNode`): a prototype in which recursion passes `(policy, env, depth)` is measured against the phase base with Phase 50's method (interleaved runs, median of per-run minima), and the numbers go in ADR-QD-172. If any workload regresses beyond run-to-run noise, the phase ends with a recorded rejection, no source change, and WENV-02 to WENV-04 marked "Not pursued (measured)". Not the shared child-walk driver (ADR-QD-073 addendum); the three `fnUntraced` functions stay.
**Settled by the review check**: `evaluateNode` takes `(policy, subject, request, matcherContext, depth, maxDepth)`; `resource` and `action` sit in both the `Evaluation` bundle and `MatcherContext`; the subject is carried three times; `matcherContext, depth, maxDepth` is threaded through 11 call sites; swapping `depth` and `maxDepth` still typechecks (Walk.ts's own comment says so). `Admission.ts`'s `Admitted` already holds the question plus the matcher context, yet `walk` builds `supplied` itself and `compileTree` builds a different one (`resource: true`) by hand (`Predicate.ts:358-362`).

**Success Criteria** (what must be TRUE):
  1. `pnpm bench` numbers for the `(policy, env, depth)` prototype against the phase base, per workload, are recorded in ADR-QD-172 with the noise band, and the outcome (pursue or reject) follows from them. On a rejection no source file changes, ADR-QD-172 records the rejection and its numbers, and WENV-02 to WENV-04 are annotated "Not pursued (measured)".
  2. If pursued: admission produces the one walk environment (subject, resource, action, `supplied`, matcher context, `maxDepth`) and each interpreter states only what differs (for `toPredicate`, that the row is always supplied); `admit(question)` gives the environment with each interpreter's `supplied` checked.
  3. If pursued: the subject, resource and action are each carried once, and `depth` and `maxDepth` can no longer be swapped and still compile (a tstyche negative).
  4. If pursued: `RolesAndDepth.test.ts`'s depth agreement test stays green, the three `Effect.fnUntraced` functions and `SWITCH_BUDGET` are unchanged (the AGENTS.md tables and the budgets agree), and `pnpm bench` after the change shows no workload regressed beyond noise against the phase base.

**Planning notes**: **The benchmark is the first plan, and it gates the rest.** Prototype on a scratch branch or an unmerged commit, run `pnpm bench` against the base the way Phase 50 did, and record the table before writing any source that stays. If pursued, plan shape, RED first: the mutation base for `Walk.ts`, `Predicate.ts` and `Admission.ts` and the `admit(question)` characterisation first; then the environment; then each interpreter; then records.
**Plans**: TBD

### Phase 60: Devtools' headless interface is the feeds

**Goal**: A headless devtools consumer gets the timeline and diagnostics feeds (and the gate feed, if the user chooses) from the package root, instead of pairing, forking, superseding and watching `makeTimelineStore`/`runSource` and `makeDiagnosticsStore`/`runDiagnostics` itself. Or, if the user decides no headless consumer is real, the phase ends with a recorded rejection ADR so a later review does not re-suggest it.
**Depends on**: Phase 59 (serial order only). Soft edge to Phase 56 (both touch the feeds and devtools' `index.ts`; start from 56's version).
**Requirements**: HDLS-01, HDLS-02, HDLS-03, HDLS-04, WX-01, WX-02, WX-03, WX-04, WX-05, WX-06, WX-07
**Packages**: `@qadi/devtools` (**Breaking** if pursued)
**Records**: ARCH-107; ADR-QD-173 (amends ADR-QD-047 amendment 1.6 and ADR-QD-099's closed entry list, or records the rejection); CCR-QD-451; BEH-QD-636 to 640; INV-QD-365 to 366; if pursued, **Breaking** in the `@qadi/devtools` changeset and in `upgrading.md`
**Gate (human checkpoint)**: the user decides before planning whether a headless consumer is real and the feeds should be the headless interface. "No" ends the phase with a recorded rejection in ADR-QD-173, no source change, and HDLS-02 to HDLS-04 marked "Not pursued (decided)".
**Settled by the review check**: `index.ts` exports `makeTimelineStore` + `runSource` and `makeDiagnosticsStore` + `runDiagnostics`; the modules that pair, fork, supersede and watch them are package-private (`model/TimelineFeed.ts`, `model/DiagnosticsFeed.ts`). `README.md:139` calls `runDiagnostics` "the same loop without React" but it lacks the stop detection whose absence was the ADR-QD-047 amendment 1.13 defect; two option shapes (`DiagnosticsOptions`, `DiagnosticsDockOptions`) configure one poll, translated by `runOptions`. The root interface was fixed by amendment 1.6 (2026-10-08), before the feeds existed (1.13/1.15, 2026-11-12).

**Success Criteria** (what must be TRUE):
  1. Before planning the user decides whether to make the feeds the headless interface. "No" ends the phase with a recorded rejection in ADR-QD-173 and HDLS-02 to HDLS-04 annotated "Not pursued (decided)"; no source file changes.
  2. If pursued: the timeline and diagnostics feeds (and the gate feed, if the user chooses) are exported from devtools' root, and `makeTimelineStore`/`runSource` and `makeDiagnosticsStore`/`runDiagnostics` are retired from the barrel.
  3. If pursued: one option shape configures the diagnostics poll, and the README's headless example uses the feeds (with the stop detection `runDiagnostics` lacks).
  4. If pursued: the feed tests run against the public entry, and `surface.test.ts`, `spec/overview.md` (gate 13), ADR-QD-047 amendment 1.6 and ADR-QD-099's entry list are updated; the break is **Breaking** in the changeset and in `upgrading.md`.

**Planning notes**: **The checkpoint is the first thing settled, before any plan.** If pursued, plan shape, RED first: the mutation base and the public-entry tests (`TimelineFeed.test.ts`, `DiagnosticsFeed.test.ts` moved to the root export) first; then the export change and the option shape; then README, docs and records. Check the packed `exports` map (gate 14).
**Plans**: TBD

### Phase 61: DecisionCache is asked only the question

**Goal**: `DecisionCache` is asked only the question and core supplies the matching walk, so no caller can pair a key with an unrelated computation and "this trace answers this key" no longer rests on one call site in `Lifecycle.ts`. Or, if the user decides not to pursue it, the phase ends with a recorded rejection ADR so a later review does not re-suggest it.
**Depends on**: Phase 60 (serial order only; no shared source).
**Requirements**: CASK-01, CASK-02, CASK-03, CASK-04, WX-01, WX-02, WX-03, WX-04, WX-05, WX-06, WX-07
**Packages**: `@qadi/core`
**Records**: ARCH-108; ADR-QD-174 (brushes ADR-QD-031 and ADR-QD-132, or records the rejection); CCR-QD-452; BEH-QD-641 to 645; INV-QD-367 to 368; a changeset only if code changes
**Gate (human checkpoint)**: the user decides before planning whether to pursue it. It brushes ADR-QD-031 (the key is the security boundary) and ADR-QD-132, and wave 10 recorded `DecisionCache`/`SharedComputation` as already deep; `concurrency` is deliberately not part of the key, so it needs another route to the walk. "No" ends the phase with a recorded rejection in ADR-QD-174, no source change, and CASK-02 to CASK-04 marked "Not pursued (decided)".
**Settled by the review check**: `DecisionCache.getOrCompute(question, compute)` accepts any `compute` for any `question`; ADR-QD-031 makes the key the security boundary, so the pairing holds only because `Lifecycle.ts:118-121` passes `walk(question, …)`. `SharedComputation.ts` (418 lines) has one adapter and is not exported.

**Success Criteria** (what must be TRUE):
  1. Before planning the user decides whether to pursue this. "No" ends the phase with a recorded rejection in ADR-QD-174 and CASK-02 to CASK-04 annotated "Not pursued (decided)"; no source file changes.
  2. If pursued: the cache's interface takes the question alone and core supplies the matching walk, so no caller can pair a key with an unrelated computation (a type-level negative shows an arbitrary `compute` is refused).
  3. If pursued: `concurrency` still reaches the walk and still does not join the key (ADR-QD-031): the same question asked with a different `concurrency` is one cache entry.
  4. If pursued: `DecisionCache.test.ts`'s coalescing and interruption tests are driven through a question alone and stay green, and `SharedComputation`'s rules (ADR-QD-132, ARCH-79) are unchanged.

**Planning notes**: **The checkpoint is the first thing settled, before any plan.** If pursued, plan shape, RED first: the mutation base for `DecisionCache.ts`, `Lifecycle.ts` and `SharedComputation.ts` and the existing coalescing and interruption tests characterised through a question alone first; then the interface; then records.
**Plans**: TBD

### Progress (v1.6)

**Execution Order:**
Phases execute in numeric order: 53 → 54 → 55 → 56 → 57 → 58 → 59 → 60 → 61

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 53. One module owns "the value a leaf compares" | 8/8 | Complete    | 2026-11-18 |
| 54. LeafNeeds turns every leaf's answer into a verdict | 0/TBD | Not started | - |
| 55. A port card is a model row, not a view join | 0/TBD | Not started | - |
| 56. The gate-registry watch becomes the dock model's third feed | 0/TBD | Not started | - |
| 57. untrustedDecoder states the envelope's unknown-key policy | 0/TBD | Not started | - |
| 58. A stored record is its envelope in memory too | 0/TBD | Not started | - |
| 59. Admission produces the one walk environment | 0/TBD | Not started | - |
| 60. Devtools' headless interface is the feeds | 0/TBD | Not started | - |
| 61. DecisionCache is asked only the question | 0/TBD | Not started | - |
