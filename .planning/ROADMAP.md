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
- ✅ **v1.8 Arch Wave 13** — Phases 69-76 (completed 2026-11-23; not released) — [archive](milestones/v1.8-ROADMAP.md)
- ✅ **v1.9 Arch Wave 14** — Phases 77-80 (completed 2026-11-24; not released) — [archive](milestones/v1.9-ROADMAP.md)
- 🚧 **v1.10 Arch Wave 15** — Phases 81-84 (in progress)

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

<details>
<summary>✅ v1.8 Arch Wave 13 (Phases 69-76) — COMPLETED 2026-11-23 (not released)</summary>

- [x] Phase 69: One total thrown-value-to-message module, ARCH-116 (core minor) (9/9 plans) — completed 2026-11-22
- [x] Phase 70: Hydration's drop events come from its buckets, ARCH-117 (react patch) (7/7 plans) — completed 2026-11-22
- [x] Phase 71: Developer-signal reporters resolved through one table, ARCH-118 (react patch) (8/8 plans) — completed 2026-11-22
- [x] Phase 72: A derived store behind the dock model's stores, ARCH-119 (8/8 plans) — completed 2026-11-22
- [x] Phase 73: One pure reconcile for gate registration, ARCH-120 (7/7 plans) — completed 2026-11-23
- [x] Phase 74: The simulation session's policy choice split from its runs, ARCH-121 (7/7 plans) — completed 2026-11-23
- [x] Phase 75: A declared span shape for the evaluate family, ARCH-122 (core minor, Breaking; checkpoint decided autonomously) (9/9 plans) — completed 2026-11-23
- [x] Phase 76: Remedies uses core's signature match, ARCH-123 (core and http minor, Breaking; a change, not a rejection) (8/8 plans) — completed 2026-11-23

Full details: [milestones/v1.8-ROADMAP.md](milestones/v1.8-ROADMAP.md) · requirements:
[milestones/v1.8-REQUIREMENTS.md](milestones/v1.8-REQUIREMENTS.md) · audit:
[milestones/v1.8-MILESTONE-AUDIT.md](milestones/v1.8-MILESTONE-AUDIT.md)

</details>

<details>
<summary>✅ v1.9 Arch Wave 14 (Phases 77-80) — COMPLETED 2026-11-24 (not released)</summary>

- [x] Phase 77: An audit row is a value only its codec makes, ARCH-124 (audit minor, Breaking) (7/7 plans) — completed 2026-11-24
- [x] Phase 78: `TimelineStore` owns its capacity, ARCH-125 (devtools minor, Breaking) (11/11 plans) — completed 2026-11-24
- [x] Phase 79: Feeds and the dock model take inputs only through `configure`, ARCH-126 (devtools minor, Breaking) (17/17 plans) — completed 2026-11-24
- [x] Phase 80: The highlight lens is a headless session; `instrument` resolved, ARCH-127 (react minor, Breaking; devtools patch) (13/13 plans) — completed 2026-11-24

Full details: [milestones/v1.9-ROADMAP.md](milestones/v1.9-ROADMAP.md) · requirements:
[milestones/v1.9-REQUIREMENTS.md](milestones/v1.9-REQUIREMENTS.md) · audit:
[milestones/v1.9-MILESTONE-AUDIT.md](milestones/v1.9-MILESTONE-AUDIT.md)

</details>

## 🚧 v1.10 Arch Wave 15 (Phases 81-84)

### Overview

Wave 15 resolves the four candidates of the 2026-11-24 architecture review, one phase each, strictly serial, and every candidate ends in a change or a recorded decision. `.planning/phases/_WAVE15-CONTEXT.md` is authoritative for per-phase evidence (taken at `902d2128`), decisions and reserved ids; `.planning/research/` (STACK, FEATURES, ARCHITECTURE, PITFALLS, SUMMARY) is this wave's research; the review HTML is session-scoped and may be gone. **Phases 81 and 82 are the two live defects and go first**, each opening with a regression test seen RED on its phase base (both were reproduced on `902d2128` on 2026-11-24 with throwaway tests, deleted afterwards). In Phase 81 the dock model's `configure` guards one step: a throwing explorer, simulation, dock, roles, questions, services or diagnostics listener skips every later step (roles stay `[]`, explorer and simulation end on different sightings, the dock on a stale row, diagnostics `Off`), a second throw replaces the first, and an identical second `configure` does not heal it; the same unguarded fan-out (`spread`) sits under the record path, where a throwing explorer listener leaves the dock with 0 rows. In Phase 82 a `QadiProvider` inside `<Activity>`, hidden longer than a macrotask and shown again with stable children, throws `registry is disposed` from the consumer's atom subscription and from the provider's own subject effect (`QadiProvider.tsx:258`). Phases 83 and 84 are two `@qadi/devtools` deepenings in dependency order: the diagnostics feed holds its reading as a value folded by a pure per-field rule, with the never-written `Diagnostics.questions` resolved (83), and `useConfigured` takes a value that has `configure`, with the review's four small finds (84). Branch `arch-wave-15`, off `arch-wave-14` at `902d2128` (v1.9 is not merged; stacked as v1.6 and v1.7 were); the research base is `911aa37f`, whose source is identical.

**The four phases and their order are fixed (2026-11-24, decided autonomously under the owner's standing instruction).** Nothing is added, merged, split or reordered, whatever the `fine` granularity setting would suggest: each review candidate is one phase, the double `spread` belongs to Phase 81, and the other small finds fold into Phase 84 (D1).

**Standing direction (owner, unchanged):** the cleanest, most complete design wins, not the simplest, and the project is not in production, so compatibility is never the tiebreaker. Nobody is asked: each grey area is decided at its phase's discuss step and recorded there as "decided autonomously" with the date. Only Phase 83 may be **Breaking** (a `@qadi/devtools` minor, if `Diagnostics.questions` is removed from the public type); 81 is a `@qadi/devtools` patch, 82 a `@qadi/react` patch, and 84 needs no changeset or a `@qadi/devtools` patch that states "no export changes". Nothing is released or published, no version-packages PR is merged, and the branch is not merged and not pushed.

Order: the two live defects (81, 82), then the two devtools deepenings (83, 84). **Execution order: phases run strictly one at a time, in numeric order (81 → 84).** Every records plan edits the same spec registers (CCR tail, invariants, traceability, `index.yaml`, `overview.md`, behaviour docs) and `use_worktrees` is false, so each phase depends on the previous one.

**Decisions** (`_WAVE15-CONTEXT.md`, all locked):

| Decision | Phase | What it fixes |
|----------|-------|---------------|
| D1 | all | All four review candidates become phases; the small finds fold into Phase 84 except the double `spread`, which belongs to Phase 81 |
| D2 | all | Order 81 → 82 → 83 → 84: the two live defects first; 81 before 83 (both edit `DockModel.ts`'s `configure`); 83 before 84 (83 renames or edits the module `useDiagnostics.ts` and `DevtoolsDock.tsx` import) |
| D3 | all | Branch `arch-wave-15` off `arch-wave-14` at `902d2128`; no merge, no push, no release |
| D4 | all | Research run; `.planning/research/` is this wave's research |

**Grey areas each phase's discuss step decides** (researchers disagree or the spec is silent; `research/SUMMARY.md` carries each recommendation):

| Phase | Decided at the discuss step |
|-------|-----------------------------|
| 81 | Where the shared collect-and-rethrow rule lives (a package-private helper over an `Iterable` of calls in `ExternalStore.ts`, used by `notify`, the derived-store release and `configure`; `notify` keeps iterating the live `Set`); `spread` made total vs the sightings rail as the model's fourth derived store (removes the double `spread` by construction; amends ADR-QD-185, BEH-QD-699, INV-QD-390); the diagnostics `Starting`-publish window (ADR-QD-177 d5) closed here, closed in 83, or recorded as staying and pinned; reentrancy (a listener that calls `configure` again: steps read `held` when they run) |
| 82 | The registry lifetime design (research recommends recycling in place: one registry identity for the provider's life, `reset()` plus a re-seed instead of `dispose()`, in a pure injected-timer module); which seeds are re-applied after a recycle (the subject only, or also `initialValues` and hydration seeds); the accepted trade that a straggling read after a true unmount recreates a node instead of throwing |
| 83 | Remove `Diagnostics.questions` (Breaking) vs keep it; rename `DiagnosticsStore.ts` to `Diagnostics.ts` with its tests vs record "kept name"; the `{ accept }` shape of `runDiagnostics`'s sink |
| 84 | `useLens(lens, questions)` subscribing once and returning both snapshots vs keeping two inputs; `useTimeline`'s per-render inputs record memoised vs recorded as a rejection against ADR-QD-192 d8 |

**Every phase** carries the seven cross-cutting requirements (WX-01, WX-02, WX-03, WX-04, WX-05, WX-06, WX-07): `pnpm check:pr < /dev/null` green at the end of each phase; its ADR (or "Unused" in its CCR row), CCR, BEH/INV and traceability records using only its reserved numbers, never `node scripts/next-id.mjs`; `spec/overview.md` names every added export and drops every removed one (gate 13), and gate 14 probes every changed public signature; no new `as`, `!`, `any`, `switch`, `Effect.fnUntraced`, `async`/`await`, ambient `console`/`process.env`/clock, `Record<string, unknown>`, `// Stryker disable` or module-scope `let`, and a budget changes only together with its AGENTS.md table; coverage held (core at least 95 percent, the others at least 90) and the Stryker score of every touched file recorded per phase in `NN-mutation-base.json` (the same invocation at the phase base and at close), a drop closed with a test and never re-baselined; a characterisation or regression test written on the phase base before any behaviour change (RED for a defect, green for preserved behaviour) and every new check shown failing once; no D-numbers, plan-local ids or phase numbers in shipped source, test titles or BDD scenarios; nothing released or published. House rules, verify-command hygiene and the Stryker procedure are in `.planning/phases/_SHARED-CONTEXT.md`, overridden where `_WAVE15-CONTEXT.md` says so. A record's plan is the phase's last plan.

**Soft edges** (from `_WAVE15-CONTEXT.md`, `research/SUMMARY.md` and the files each phase edits; serial order covers all of them):

| Edge | Strength | Reason |
|------|----------|--------|
| 81 first | ordering | a live defect, with its regression test RED on its own phase base; 83 edits the same `configure` block and must not re-introduce an unguarded step |
| 82 second | ordering | the second live defect; `@qadi/react` shares no source with 81, 83 or 84, so it stays second only to land both live defects first (it can swap with 81 safely) |
| 81 → 83 | hard | both edit `DockModel.ts`'s `configure` tail and the diagnostics `start()` the `Starting` window belongs to |
| 83 → 84 | hard | 83 changes the module that `useDiagnostics.ts` and `DevtoolsDock.tsx` import and 84 edits both; doing 84 first re-touches the import lines and churns `useConfigured.test.tsx` twice |
| 81, 83, 84 → close | re-verify | the three devtools phases edit the same files, so the milestone close re-verifies 81 to 83 and re-runs each phase's record scripts |

**Numbering reserved for v1.10** (the whole block is held in the shared reservation file, `$(git rev-parse --git-common-dir)/qadi-reserved-ids.json`, set to CCR 476, ADR 197, BEH 760, INV 414 on 2026-11-24; never run `node scripts/next-id.mjs` while executing these phases, because every call writes a reservation; name an unused reservation "Unused:" in the phase's CCR row; an amendment of an existing ADR leaves its new ADR number unused and says so; pass `--date 2026-11-24`, or the real date of the edit, to `spec-revise`). Next free on `911aa37f`: ADR-QD-194, CCR-QD-473, BEH-QD-741, INV-QD-407. Highest ARCH is ARCH-127; ARCH ids below 128 are never reused. ADR Document IDs equal the file number (gate 10).

| Phase | ARCH | ADR-QD | CCR-QD | BEH-QD | INV-QD |
|---|---|---|---|---|---|
| 81 | 128 | 194 | 473 | 741–745 | 407–408 |
| 82 | 129 | 195 | 474 | 746–750 | 409–410 |
| 83 | 130 | 196 | 475 | 751–755 | 411–412 |
| 84 | 131 | 197 | 476 | 756–760 | 413–414 |

**Out of scope** (recorded, not planned): using `AtomRegistry`'s `scheduleTask`/`defaultIdleTTL` for the registry lifetime (AGENTS.md §13, ADR-QD-148); reading `registry.disposed` (not on the interface); building the provider's registry in an effect, the `useScoped` shape (children's effects run before the provider's on reveal, and it renders nothing on the server pass); the audit package's shallow freeze and `WeakSet` brand (ADR-QD-190 §7); `TimelineFeed`'s `idleTimeline` restating the store's members; upgrading any dependency; formatting with `oxfmt` (AGENTS.md §17); merge, release or publish. Carried forward as future work: aligning `@qadi/react`'s swallowing gate registry with ADR-QD-177's rethrow contract; structural (deep) identity for feed inputs; exporting the lens session from `@qadi/devtools`' barrel; the upstream `@effect/atom-react` `RegistryProvider`, which has the same dispose-in-cleanup shape as the defect Phase 82 fixes.

### Phases

- [x] **Phase 81: The dock model applies every input whatever a listener throws** - `configure` and the record path run every step and rethrow what was collected once; a catalogue-and-capacity change moves the sightings rail once (ARCH-128, devtools; live defect) (completed 2026-11-25)
- [x] **Phase 82: `QadiProvider`'s registry has one owner for its lifetime** - A provider hidden in `<Activity>` longer than a macrotask and shown again never reaches a disposed registry; the lifetime rule is one headless, mutation-gated module (ARCH-129, react; live defect) (completed 2026-11-25)
- [x] **Phase 83: The diagnostics feed folds its reading as a value** - A pure per-field fold replaces the package-private store nothing subscribes to, `runDiagnostics` takes an `accept` sink, and the never-written `Diagnostics.questions` is resolved (ARCH-130, devtools; possibly Breaking) (completed 2026-11-25)
- [ ] **Phase 84: `useConfigured` requires `configure`, and the review's small finds** - Three identical adapters deleted, `LensSession` publishes through `ExternalStore.set`, `useLens` receives each fact once, `DockFrame`'s stop ledger exists once, and `useTimeline`'s inputs record is decided (ARCH-131, devtools)

### Phase Details

### Phase 81: The dock model applies every input whatever a listener throws

**Goal**: The dock model applies every input whatever a host listener throws, on the `configure` path and on the record path, and rethrows what it collected once at the end, so no listener can leave the model half-applied; the double `spread` on a capacity-and-catalogue change goes with it.
**Live defect**: yes. Only the timeline step of `configure` is guarded (`DockModel.ts` ≈403-431); a throwing listener on any other store skips every later step, a second throw replaces the first, and an identical second `configure` does not heal it because the catalogue is compared by identity. The record path has the same fan-out: `spread()` runs from the dock's own timeline listener (≈349-356), and an always-throwing explorer listener left the timeline at 2 entries, the dock at 0 rows and the simulation at 0 sightings (reproduced 2026-11-24).
**Breaking**: no (`@qadi/devtools` patch; no public export changes). Extends ADR-QD-191 decision 11 and ADR-QD-177.
**Depends on**: Nothing in v1.10 (first phase; serial order).
**Requirements**: COLL-01, COLL-02, COLL-03, COLL-04, COLL-05, COLL-06, WX-01, WX-02, WX-03, WX-04, WX-05, WX-06, WX-07
**Packages**: `@qadi/devtools` (`model/ExternalStore.ts`, `model/DockModel.ts`, their tests including `DockModel.test.ts` M55/M56 and `ConfigureRule.test.ts` CR22, `spec/behaviors`, one changeset); `@qadi/core` and `@qadi/react` are untouched
**Records**: ARCH-128; ADR-QD-194 (new, recording the rule and amending ADR-QD-177, ADR-QD-191 decision 11, ADR-QD-192 decision 3 and, if the rail becomes a derived store, ADR-QD-185; or those amendments stand alone and 194 is named unused); CCR-QD-473; BEH-QD-741 to 745 (BEH-QD-465, 656, 699, 728's pinned-by list and 735's counts restated); INV-QD-407 to 408 (INV-QD-373 and 390 amended)
**Evidence** (`_WAVE15-CONTEXT.md`, at `902d2128`): the `finally` after `timelineFeed.configure` runs `spread` (explorer, simulation, dock), `roles.setList`, `simulation.setPorts`, `gatesFeed.configure`, `diagnosticsFeed.configure` and `shownReading.refresh` in a plain sequence, each of which publishes. Reproduced: an explorer listener that throws leaves roles `[]`, simulation and explorer on different sightings, the dock on a stale row and diagnostics `Off`; two throwing listeners escape as only the last, a plain `Error`. Capacity and catalogue in one `configure` spread twice (`catalogueOf` builds fresh sightings, `Catalogue.ts:155-189`), so CR22 (`ConfigureRule.test.ts:895`) and BEH-QD-735's counts encode two publishes; the second `spread` also masks a throwing dock listener today, so removing it without making `spread` total regresses that case. A throw on the diagnostics feed's `Starting` publish leaves the poll unforked (ADR-QD-177 d5 left it out of scope). The rule already exists twice: `ExternalStore.ts` `throwCollected` (≈63), used by `notify` and the derived-store release. Keep: M55 (a refused capacity throws before anything moves), M56, the step order (one join publish), the lens silent on configure. Phase 81's discuss step (81-CONTEXT D-09, decided autonomously 2026-11-24) closes the `begin()`-to-`fork()` window at every site in `src/model/**`, so `TimelineFeed`'s `try/finally` is rewritten on the shared rule and TF29's flip is recorded.

**Success Criteria** (what must be TRUE):
  1. A regression matrix written on the phase base is RED there and GREEN after: for every store a host can subscribe to on the dock model (timeline, explorer, simulation, dock, roles, questions, services, diagnostics, and any other the model exposes, the lens included), one listener that throws during `configure` leaves every other input applied (roles listed, explorer and simulation on one sightings rail, the dock on the shown timeline, ports set, gates and diagnostics configured, the shown reading refreshed), and the throw reaches the caller after the last step.
  2. One throw is rethrown as itself (`undefined` and `null` included); two or more are rethrown once, collected, in step order, by the rule `ExternalStore`'s listener notification and derived-store release already use, and that rule lives in one package-private place shared by all three call sites, kept out of the barrel, with no second copy of the loop.
  3. A listener that throws on a timeline publish with no `configure` involved does not leave the explorer, the simulation or the dock behind the timeline: every follower has moved when the throw reaches the caller (RED on the base).
  4. A catalogue and a capacity changed in one `configure` move the sightings rail once, the configure-rule counts (CR22, BEH-QD-735) are restated with the code, the step order (held inputs first, then timeline, rail, roles, ports, gates, diagnostics, shown reading last, one join publish) is pinned, a refused capacity still throws before anything moves (M55), and M56 stays green.
  5. The window between a run's `begin()` and its `fork()` is closed at every site in `src/model/**` (the timeline's `Reading`, the diagnostics' `Starting`, the simulation's `Running`): the work starts whatever a listener throws on that status, and the throw is rethrown after (TF29's flip recorded); a listener that calls `configure` again from inside a step leaves the model on the inner call's inputs (pinned); ADR-QD-194 (or the named amendments), BEH, INV, traceability and the dock model's file header carry the rule.

**Planning notes**: No external research: the open items are discuss-step decisions (the grey-area table above), and the researchers' recommendations are in `research/SUMMARY.md`. Open the plan with the ten-store throw matrix, the record path, the two-throw case, a reentrancy row and a publish count for a capacity-and-catalogue `configure`: FEATURES measured the explorer hearing two publishes there while ARCHITECTURE read the second spread as publishing nothing, so count first. Never collect the capacity refusal (M55); steps read `held` when they run, not entry-time locals; no did-spread flag (it skips heals and corrupts under nesting). `DockModel.ts` holds a mutation score of 1 (69 killed, 0 survived, 12 ignored at v1.9 close; a new `Ignored` mutant fails the compare, so new literals stay inside function bodies); commit the Stryker baselines of `DockModel.ts` and `ExternalStore.ts` alone and first, and re-close them after the review. The archived `79-pinned-check.mjs` and `80-pinned-check.mjs` hard-code `.planning/phases/QD-79...` and fail with ENOENT now that v1.9 is archived: the first plan records how to run them from a scratch copy with the paths rewritten (do not edit the archive) in `_WAVE15-CONTEXT.md`, and new record scripts take their directory from `import.meta.url`. No new `switch`, `Effect.fnUntraced`, `any` or module-scope `let`.
**Plans**: 11/11 plans complete

Plans:
- [x] 81-01 (W1): Record the mutation base of the five model files first, the base facts and archived checks, and the phase check helpers with `single-source` (D-03, D-12, D-13).
- [x] 81-02 (W2): `DockModel.listeners.test.ts`, the ten-store throw matrix, the record path, two throwers, `undefined`/`null`, one rail publish and the nested configure, seen red (COLL-01, COLL-02).
- [x] 81-03 (W3): TF28, TF29 and F31 flipped and retitled, TF37, SR6 and G49 added, seen red; the pinned check (COLL-05).
- [x] 81-04 (W4): `callAll(calls, message)` in `ExternalStore.ts`, test-first; `notify` and the derived release on it (COLL-03, D-04 to D-06).
- [x] 81-05 (W5): The timeline feed's `configure` through `callAll`; the timeline, diagnostics and simulation begin-to-fork windows closed (COLL-05, D-09).
- [x] 81-06 (W6): The rail as the fourth derived store, `configure` as seven steps through `callAll`, `spread` removed, CR22 restated from the measurement (COLL-01 to COLL-04, D-07, D-08, D-10).
- [x] 81-07 (W7): ADR-QD-194 and the dated amendments of ADR-QD-177, 185, 191 and 192; CCR-QD-473 begun (COLL-06, D-11).
- [x] 81-08 (W8): BEH-QD-741 to 745 and INV-QD-407, 408; BEH-QD-465, 656, 699, 728, 735 and INV-QD-373, 390 restated; traceability (COLL-06).
- [x] 81-09 (W9): The devtools README restated, the `@qadi/devtools` patch changeset, the export surface unchanged, CCR-QD-473 completed (COLL-06).
- [x] 81-10 (W10): The mutation close compared with the base, the close scans, the archived checks re-recorded, the flagged assumptions (D-12, D-13).
- [x] 81-11 (W11): `pnpm check:pr` and `pnpm spec:package` green on the measured tree, the trailer scan, COLL-01 to COLL-06 complete.
**UI hint**: no (headless model; no markup, copy or style change)

### Phase 82: `QadiProvider`'s registry has one owner for its lifetime

**Goal**: A `QadiProvider`'s atom registry has one owner for the provider's whole life, so a provider hidden inside `<Activity>` longer than a macrotask and shown again with stable children never lets any consumer or the provider's own effect reach a disposed registry, and the lifetime rule is testable and mutation-gated without React.
**Live defect**: yes. `QadiProvider.tsx` builds its registry lazily in a ref (≈217-218) and disposes it from an effect cleanup after `setTimeout(0)`, nulling the ref (≈285-299). React 19.3.1's `<Activity>` runs both effect kinds' cleanups on hide and re-runs both on reveal with the last committed closure and no re-render, children's effects first. A stable provider element with `<Can>` below it, hidden past a macrotask and shown again, throws `Cannot access Atom ...: registry is disposed` twice (an `AggregateError`): from the consumer's `useAtomValue` subscription, first, and from the provider's subject effect (`QadiProvider.tsx:258`) (reproduced 2026-11-24).
**Breaking**: no (`@qadi/react` patch) unless a public export changes. Amends ADR-QD-014, ADR-QD-103 and ADR-QD-148 as needed (LEASE-05).
**Depends on**: Phase 81 (serial order only; `@qadi/react` and `@qadi/devtools` share no source, and 82 can swap with 81 safely).
**Requirements**: LEASE-01, LEASE-02, LEASE-03, LEASE-04, LEASE-05, WX-01, WX-02, WX-03, WX-04, WX-05, WX-06, WX-07
**Packages**: `@qadi/react` (`QadiProvider.tsx`, a new package-private lifetime module beside `SweepScheduler.ts`, `stryker.react.mjs`, `packages/react/test`, `spec/behaviors/09-react.md`, `appendices/react-integration.md`, one changeset)
**Records**: ARCH-129; ADR-QD-195 (new; records the lifetime rule; amends ADR-QD-014, 103, 148 and 149 as needed, research naming 014's consequence and 149); CCR-QD-474; BEH-QD-746 to 750 (BEH-QD-067 and its SUBJ note, and BEH-QD-516 restated); INV-QD-409 to 410
**Evidence** (`_WAVE15-CONTEXT.md`, at `902d2128`): `AtomRegistry` (effect 4.1.2, `effect/reactivity/AtomRegistry`) `dispose()` is terminal, `reset()` clears nodes and runs finalizers but leaves the registry usable, `ensureNode(atom).setInitialValue(v)` re-seeds a node, and `disposed` is not on the interface; `@effect/atom-react`'s `RegistryProvider` has the same dispose-in-cleanup shape. Because children's effects run before the provider's on reveal, an effect-time or state-held rebuild is too late, and `useScoped` (renders nothing on the server pass) breaks SSR and the first-frame subject seed. Scenario table today: unmount disposes once after a macrotask; StrictMode keeps one registry; a short hide is fine; a long hide with a re-render silently builds a second registry and loses the decision cache; a subject change while hidden works; an `atoms` prop change keeps the registry and signals `AtomsReplaced` (must stay). Tests that cannot fail: P4 (`QadiProvider.sweep.test.tsx:136`) hides and shows in one tick, SUBJ1/SD3 re-render the provider or put the Activity below it, and `edges.test.tsx:257` ("disposes its registry when unmounted") only checks the body is empty. `QadiProvider.tsx` is outside `stryker.react.mjs`.

**Success Criteria** (what must be TRUE):
  1. A regression test written on the phase base is RED there and GREEN after: a stable `QadiProvider` element with a real consumer (`<Can>`) below it, inside an `<Activity>` its parent toggles, hidden for longer than a macrotask and shown again, throws nothing (neither the provider's subject effect nor the consumer's subscription) and renders the decision, and a `useSubject()` probe reads the prop.
  2. After a long hide the provider answers with the current subject, and whatever the registry recycling loses (`initialValues`, hydration seeds) is restored before any consumer reads or the loss is recorded and pinned; the sweep scheduler's bound (ADR-QD-148) holds across a long hide and reveal, asserted with the sweep counters rather than inferred from P4.
  3. Every registry the provider builds is released exactly once on a real unmount, none is used after release and none leaks, across StrictMode double effects, a hide shorter and longer than a macrotask, a subject change while hidden, an `atoms` prop change and unmount; the vacuous "disposes its registry when unmounted" test now fails if disposal is skipped.
  4. The registry's lifetime rule lives in one package-private, headless module that a test drives with an injected timer, that module is under the React mutation gate with no open mutant, and the provider holds no lifetime logic of its own beyond calling it.
  5. ADR-QD-195, BEH, INV and traceability record the rule, and the ADR's claims about React's commit order come from the RED/GREEN observation; a `@qadi/react` patch changeset records the fix (and, if hydration seeds are no longer re-applied after a long hide, says so), with no Breaking changeset unless a public export changed.

**Planning notes**: **Research flag: a pre-plan spike is required** (`/gsd-plan-phase --research-phase 82`); confidence in the fix's shape is MEDIUM until its RED test runs. Research recommends recycling in place: a pure, package-private, injected-timer lifetime module (the `SweepScheduler.ts` precedent, added to `stryker.react.mjs`) that keeps one registry identity for the provider's whole life and calls `reset()` plus a re-seed of the latest subject (from a ref written in an effect, never in render) in the deferred release instead of `dispose()`, never nulling the ref. Rejected with reasons: effect-time or state-held rebuild (too late on reveal), the `useScoped` shape (SSR and first-render subject), `scheduleTask`/`defaultIdleTTL` (ADR-QD-148), reading `registry.disposed`, never disposing. The RED test needs a stable provider element, a hide longer than a macrotask and a real consumer below (P4 passes on the defective code); companions cover `useInvalidate`, a `useDevtoolsFeed` consumer, StrictMode (one registry), a short-hide control and a subject change while hidden. The spike answers: does `reset()` plus a re-seed hold under StrictMode, two providers on one atom set and the sweep's pressure-episode forks after a long hide, and does a true unmount still release the `Atom.runtime` layer scope. The discuss step decides which seeds are re-applied (the subject only, as ARCHITECTURE recommends, or also `initialValues` and hydration seeds, as the context's complete answer suggests; re-applying server seeds could resurrect an answer the client superseded, ADR-QD-017) and records the accepted trade that a straggling read after a true unmount silently recreates a node instead of throwing. `MODULE_STATE_BUDGET` must not grow and AGENTS.md §13 holds (the module owns infrastructure, never a decision); `QadiProvider.tsx` stays `unmeasured` in the mutation record and the new module is close-only against an absolute bar of no open mutant.
**Plans**: 10/10 plans complete

Plans:
- [x] 82-01 (W1): Record the mutation base of the four react files first, the base facts and archived checks, and the phase check helpers with `single-owner` (D-03, D-16, D-18).
- [x] 82-02 (W2): `QadiProvider.lifetime.test.tsx` LT1 to LT8, the long-hide reveal and its companions, seen red; the base commit order observed (LEASE-01, LEASE-03, D-14, D-24).
- [x] 82-03 (W3): LT9 to LT15 (seeds not re-applied, one mismatch report, the sweep across a long hide, the re-seed frame, the straggler, a host subscription) and the unmount test made real, seen red (LEASE-03, LEASE-04, D-12, D-13, D-20 to D-22).
- [x] 82-04 (W4): `RegistryLease.ts`, test-first (RL1 to RL9), and the lease in `stryker.react.mjs` (LEASE-02, D-04, D-05, D-23).
- [x] 82-05 (W5): The provider on the lease, recycled in place; the scratch variants, the commit order with the lease, the lease's mutants probed (LEASE-01, LEASE-03, LEASE-04, D-06 to D-11).
- [x] 82-06 (W6): ADR-QD-195 and the dated amendments of ADR-QD-014, 148 and 149 (103 read, unchanged); CCR-QD-474 begun (LEASE-05, D-17).
- [x] 82-07 (W7): BEH-QD-746 to 750 and INV-QD-409, 410; BEH-QD-067, 516 and the integration appendix restated; traceability (LEASE-05).
- [x] 82-08 (W8): The `@qadi/react` patch changeset, the website's React page, the export surface unchanged, CCR-QD-474 completed (LEASE-05, WX-02, WX-03).
- [x] 82-09 (W9): The mutation close compared with the base and the lease's absolute bar, the close scans, the archived checks re-run, the flagged assumptions (D-16, D-18).
- [x] 82-10 (W10): `pnpm check:pr` and `pnpm spec:package` green, the release and trailer checks, LEASE-01 to LEASE-05 complete.
**UI hint**: no (behaviour only; the provider renders the same tree)

### Phase 83: The diagnostics feed folds its reading as a value

**Goal**: The diagnostics feed holds its reading as a value folded by one pure per-field keep-if-equal function, so the package-private store nothing subscribes to, its `marking` wrapper and the store replacement in `off()` are gone, `runDiagnostics` takes an `accept` sink as `runSource` does, and the never-written `Diagnostics.questions` is resolved.
**Breaking**: possibly (`@qadi/devtools` minor): removing `Diagnostics.questions` from the public type is a type change. Amends ADR-QD-173 (and ADR-QD-169 decision 10).
**Depends on**: Phase 81 (hard: both edit `configure`'s tail and the diagnostics `start()`; 83 must not re-introduce an unguarded step). Phase 84 depends on this phase.
**Requirements**: DIAG-01, DIAG-02, DIAG-03, DIAG-04, WX-01, WX-02, WX-03, WX-04, WX-05, WX-06, WX-07
**Packages**: `@qadi/devtools` (`model/DiagnosticsFeed.ts`, `model/DiagnosticsStore.ts` or its renamed successor, `builtFeeds.ts`'s `diagnosticsFeedOf`, their tests and type pins, `spec/overview.md`, `surface.tst.ts`, one changeset and the `0.13` upgrade-guide entry); gate 14's packed consumer compiles `makeDiagnosticsFeed`
**Records**: ARCH-130; ADR-QD-196 (new; amends ADR-QD-173 and ADR-QD-169 decision 10); CCR-QD-475; BEH-QD-751 to 755 (BEH-QD-323, 617, 637, 639, 640 and 699 restated); INV-QD-411 to 412 (INV-QD-314 and 366 amended)
**Evidence** (`_WAVE15-CONTEXT.md`, at `902d2128`): `DiagnosticsStore.ts` is a store with `subscribe`/`getSnapshot`/`accept` (≈146-189, 238-260) whose one caller is `DiagnosticsFeed`; its `subscribe` is reached only by its own test. `DiagnosticsFeed.ts` wraps it in `marking` (≈189-200) and replaces it in `off()`, and `runDiagnostics` takes the whole store but calls only `accept` (compare `runSource`'s `Pick<TimelineStore, "accept">`). `Diagnostics.questions` is never written by the poll (`DiagnosticsStore.ts:252`); only `mergeReading` copies a supplied value (`:143`), the dock join reads `held.reading?.questions` (`DockModel.ts:378`), and nothing in src, docs, examples or READMEs reads it. `DiagnosticsStore`, `makeDiagnosticsStore` and `runDiagnostics` are unexported (`surface.tst.ts:240-265`); `Diagnostics` is public. Registers that name the module: `spec/traceability.md:579-580`, AGENTS.md §6 (`DiagnosticsStore.tst.ts`, 3 callable pins) and `scripts/check-house-style.mjs:771`. Keep: the `isCurrent(token)` guard, the `sampled` flag, the `Live` mark, pins F1-F32.

**Success Criteria** (what must be TRUE):
  1. A characterisation test written on the phase base, green there and after, pins every status and reading transition of the diagnostics feed (Off, Starting, Live, Stopped, the per-field identity kept when a sample repeats, the `isCurrent` token guard, the `sampled` flag), so the rewrite changes no observable behaviour except the one the phase names.
  2. The feed holds its reading as a value updated by one pure per-field keep-if-equal function with value tests (it returns the previous reading itself when no field moved, and N identical samples publish nothing after the first); the package-private store, its `marking` wrapper and the store replacement in `off()` are gone, and `runDiagnostics` takes an `accept` sink as `runSource` does.
  3. `Diagnostics.questions` is removed from the public `Diagnostics` type (kept on `DiagnosticsReading`, which the dock join reads, so the join's timing is unchanged), shown by a type pin that can fail with its positive twin, with a `@qadi/devtools` changeset marked **Breaking**, a `0.13` upgrade-guide entry, `spec/overview.md`, gate 13 and gate 14 in the same plan; or the reason it stays is recorded.
  4. A renamed or moved module and its tests keep every register that names them in step (`spec/traceability.md`, AGENTS.md §6's `NOT_CALLABLE_PIN_BUDGET` table and `scripts/check-house-style.mjs`'s budget, edited together), gate 12 stays clean, and ADR-QD-196 records the change, amending ADR-QD-173.

**Planning notes**: Standard patterns (it mirrors 81 and `runSource`), but the discuss step makes the three decisions in the grey-area table and confirms the Breaking changeset. Research recommends removing `Diagnostics.questions` (Breaking minor; the join keeps `held.reading?.questions`; keeping it and routing it through the shown reading would change when the join sees new questions), renaming `DiagnosticsStore.ts` to `Diagnostics.ts` as a pure rename commit first (green on its own, with the budget row, AGENTS.md table and traceability rows in the same commit; the three `Params<typeof runDiagnostics>` pins are rewritten to the sink parameter so `callable: 3` holds), a `{ accept }`-shaped sink and the span `qadi.devtools.runDiagnostics` unchanged. Constraints that are findings: the sink the feed builds keeps the `runs.isCurrent(token)` guard before the fold, `sampled`, and the `Live` mark on an unchanged sample; F1-F32 and the held `ConfigureFirstRender` characterisation pass unedited; change `builtFeeds.ts`'s `diagnosticsFeedOf`, not about 33 sites. If Phase 81 did not close the diagnostics `Starting` window, 83 rewrites `start()` and is the other defensible home. The `0.13` fences in `apps/website/src/content/docs/docs/reference/upgrading.md` are compiled, so the sections that read `reading.hydration` must keep compiling; gate 14 runs once at the close. Commit the Stryker baselines of `DiagnosticsFeed.ts`, `DiagnosticsStore.ts` (60/60 at ADR-QD-169) and `DockModel.ts` first; the new module keeps the old score.
**Plans**: 11/11 plans complete

Plans:
- [x] 83-01 (W1): Record the mutation base of the three diagnostics model files first, the base facts, and the phase check helper with `no-store`, `single-fold`, `stale-path` and `registers` (D-18, D-20, D-23).
- [x] 83-02 (W2): The pinned-test check (the held files, the declared edits, the `F2` flip) and Phase 81's checks re-run from a scratch copy (D-16, D-20).
- [x] 83-03 (W3): `DiagnosticsFeed.characterisation.test.ts` FC1 to FC11 on the base, green, each guard seen failing under a scratch edit (DIAG-01, D-15).
- [x] 83-04 (W4): The pure rename of `DiagnosticsStore.ts` and its two tests to `Diagnostics.ts`, every importer and register in the same commit; CCR-QD-475 begun (DIAG-04, D-17).
- [x] 83-05 (W5): `Diagnostics.questions` removed: the pins seen red, the Breaking changeset, the `0.13` upgrade entry, the overview rows and gate 14's probe (DIAG-03, D-11 to D-14).
- [x] 83-06 (W6): `foldReading`, the one pure per-field keep-if-equal law, with its value tests, and the root refusing it (DIAG-02, D-05 to D-07).
- [x] 83-07 (W7): The feed folds each sample into its one snapshot through a `DiagnosticsSink`; the store, `marking` and the store replacement in `off()` removed (DIAG-02, D-08 to D-10, D-19).
- [x] 83-08 (W8): ADR-QD-196 and the dated amendments of ADR-QD-173, ADR-QD-169 and ADR-QD-047 (DIAG-04, D-22).
- [x] 83-09 (W9): BEH-QD-751 to 755 and INV-QD-411, 412; the restated behaviours and amended invariants; traceability; CCR-QD-475 completed (WX-02, D-22).
- [x] 83-10 (W10): The mutation close compared with the base through the rename, the close scans, the earlier checks re-run, the flagged assumptions (WX-05, D-23).
- [x] 83-11 (W11): `pnpm check:pr` and `pnpm spec:package` green, the release and trailer checks, DIAG-01 to DIAG-04 complete (WX-01, D-24).
**UI hint**: no (headless feed; no markup, copy or style change)

### Phase 84: `useConfigured` requires `configure`, and the review's small finds

**Goal**: `useConfigured` takes a value that has `configure`, so the three identical adapters are deleted, and the review's four small finds are settled in the same pass: `LensSession` publishes through `ExternalStore.set`, `useLens` receives each fact once, `DockFrame`'s stop ledger exists once, and `useTimeline`'s per-render inputs record is memoised or recorded as a rejection.
**Depends on**: Phase 83 (hard: 83 changes the module `useDiagnostics.ts` and `DevtoolsDock.tsx` import, and 84 edits both).
**Requirements**: ADPT-01, ADPT-02, ADPT-03, ADPT-04, ADPT-05, WX-01, WX-02, WX-03, WX-04, WX-05, WX-06, WX-07
**Packages**: `@qadi/devtools` (`react/useConfigured.ts`, `useDockModel.ts`, `useTimeline.ts`, `useDiagnostics.ts`, `useLens.ts`, `QuestionsPanel.tsx`, `DevtoolsDock.tsx`'s `DockFrame`, `model/LensSession.ts`, their tests); package-private edits, no export changes
**Records**: ARCH-131; ADR-QD-197 (likely unused: amend ADR-QD-192 decision 8 and ADR-QD-193's adapter paragraph and say so in the CCR row); CCR-QD-476; BEH-QD-756 to 760 (only for the hook and lens-return contract: BEH-QD-734, 736 and 737's pinned-by lists amended); INV-QD-413 to 414 (only if the lens return needs one)
**Evidence** (`_WAVE15-CONTEXT.md`, at `902d2128`): `useConfigured.ts:19-31`, with identical adapters at `useDockModel.ts:22`, `useTimeline.ts:44` and `useDiagnostics.ts:19`; `useConfigured.test.tsx`'s double passes a function and must become an object. `LensSession.ts`'s `move` (149-152) is exactly `ExternalStore.set`; `choose` (167-175) returns a boolean and arms before it publishes, so only its publish becomes `set`-like. `useLens.ts` takes `questions` and `instances` (`QuestionsPanel.tsx:114-118`), and render-time `instances` and event-time `questions.getSnapshot()` can differ; `Lens.adapter.test.tsx:160` and traceability row 661 pin one subscription each. `DockFrame` writes the stop-ledger ref and memoised notice twice (diagnostics, timeline). `useTimeline.ts:70` builds a fresh `{ source, capacity }` per render, which the feed no-ops on equal fields; `DevtoolsDock`'s `...inputs` and `useDiagnostics({})` build fresh records by design (ADR-QD-192 d8), and the gates feed's retry on any `configure` (G43) depends on repeated calls. `src/react` is outside the devtools mutation gate.

**Success Criteria** (what must be TRUE):
  1. `useConfigured` takes a value that has `configure`; the three identical adapters in `useDockModel`, `useTimeline` and `useDiagnostics` are deleted and its test double is an object; a hidden `Activity` or a StrictMode rebuild still configures with the current inputs, pinned by the existing tests unedited.
  2. `LensSession` publishes through `ExternalStore.set` with no restated `move`, and `choose` still arms its reveal before it publishes and still answers whether the click was consumed, shown by a pin that fails if the arming moves after the publish.
  3. `useLens` receives each fact once: the draw and the event handlers read the same questions snapshot path, the panel keeps exactly one subscription to each store (the traceability row's pin), and the handlers still read the guards at event time.
  4. `DockFrame`'s stop-ledger ref and memoised notice exist once, shared by the diagnostics and timeline notices.
  5. `useTimeline`'s per-render inputs record is either memoised or recorded as a rejection against ADR-QD-192 decision 8, with the gates feed's retry-on-configure (G43) unaffected, and ADR-QD-197 records the phase or is named unused in CCR-QD-476.

**Planning notes**: Standard patterns, and no defect, so no RED: open with characterisations green on the base before any edit (`useConfigured.test.tsx` U1-U4 re-expressed over an object double, `LensSession.test.ts:304/378` mutation-checked so a publish-before-arm fails it, `Lens.adapter.test.tsx:160`'s one-subscription pin); `ConfigureFirstRender` and `Lens.dock` stay unedited. The discuss step decides the `useLens` shape (research recommends `useLens(lens, questions)` subscribing once and returning both snapshots, handlers reading `questions.getSnapshot()` at event time, never writing a ref during render; amend ADR-QD-193 and BEH-QD-737, and edit traceability row 661 in the same commit) and the `useTimeline` record (research recommends a recorded rejection: the value's own rule makes memoisation a no-op, `DevtoolsDock`'s rest spread is fresh per render by construction, and memoising one of three hooks makes them asymmetric; if it memoises, only `useTimeline`, never the dock's or the gates' records). Use positive type pins only for the `Configurable` constraint (`DockModel`, `TimelineFeed` and `DiagnosticsFeed` assignable), which costs no `NOT_CALLABLE_PIN_BUDGET` row; check `useConfigured<A, I>`'s inference. Re-measure `LensSession.ts` (52/52, no open mutant) and list the `src/react` hooks as `unmeasured`. Changeset: none, or a `@qadi/devtools` patch stating "no export changes".
**Plans**: TBD
**UI hint**: no (behaviour only; no markup, copy, test id or style change)

### Progress (v1.10)

**Execution Order:**
Phases execute in numeric order: 81 → 82 → 83 → 84

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 81. The dock model applies every input whatever a listener throws | 11/11 | Complete    | 2026-11-25 |
| 82. `QadiProvider`'s registry has one owner for its lifetime | 10/10 | Complete    | 2026-11-25 |
| 83. The diagnostics feed folds its reading as a value | 11/11 | Complete    | 2026-11-25 |
| 84. `useConfigured` requires `configure`, and the review's small finds | 0/0 | Not started | - |
