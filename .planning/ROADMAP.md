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
- 🚧 **v1.9 Arch Wave 14** — Phases 77-80 (in progress)

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

## 🚧 v1.9 Arch Wave 14 (Phases 77-80)

### Overview

Wave 14 resolves the four candidates of the 2026-11-23 architecture review, one phase each, strictly serial, and every candidate ends in a change or a recorded decision. `.planning/phases/_WAVE14-CONTEXT.md` is authoritative for per-phase evidence (taken at `ab8ccb75`), owner decisions and reserved ids; `.planning/research/` (STACK, FEATURES, ARCHITECTURE, PITFALLS, SUMMARY) is this wave's research; the review HTML is session-scoped and may be gone. **Phase 77 is the one live defect and goes first**, opening with a regression test seen RED on its phase base. `@qadi/audit` can write an archive its own reader refuses: `archiveAuditTrail` checks only a row's sequence facts, so a type-valid row whose record has `at: NaN` is archived, `JSON.stringify` turns `at` into `null`, and `readAuditArchive` refuses the bundle as `EntryNotDecodable` (reproduced 2026-11-23 with a throwaway run, deleted afterwards). `archiveAuditTrail(entries, NaN)` writes `createdAt: null`, which the reader also refuses (reasoned, not yet run), and `keyMaterial` is a third unchecked pass-through. ADR-QD-110 closed this class for `sequenceNumber` only. Phases 78 to 80 are three `@qadi/devtools` deepenings in dependency order: the timeline store owns its capacity (78), every feed and the dock model take inputs only through `configure` (79), and the highlight lens becomes a headless session owned by the dock model, with the unread `QadiContextValue.instrument` resolved (80). Branch `arch-wave-14`, based on `main` at `5784bbd6` (v1.8 merged as #164; not released); the research base is `ab8ccb75`.

**The four phases and their order are fixed (2026-11-23, owner decision D2).** Nothing is added, merged, split or reordered, whatever the `fine` granularity setting would suggest: each review candidate is one phase, and the small find folds into Phase 80 (D1).

**Standing direction (owner, unchanged):** the cleanest, most complete design wins, not the simplest, and the project is not in production, so compatibility is never the tiebreaker. Phases 77 (`@qadi/audit`) and 79 (`@qadi/devtools`) are **Breaking**; 78 is a type-level change (a public `TimelineStore` gains a member); 80 is Breaking for `@qadi/react` only if `QadiContextValue.instrument` is removed. Nothing is released or published, no version-packages PR is merged, and the branch is not merged.

Order: the live defect (77), then the three devtools deepenings (78, 79, 80). **Execution order: phases run strictly one at a time, in numeric order (77 → 80).** Every records plan edits the same spec registers (CCR tail, invariants, traceability, `index.yaml`, `overview.md`, behaviour docs) and `use_worktrees` is false, so each phase depends on the previous one.

**Owner decisions** (`_WAVE14-CONTEXT.md`):

| Decision | Phase | What it fixes |
|----------|-------|---------------|
| D1 | all | All four review candidates become phases, and the small find (`QadiContextValue.instrument`, public, never read) folds into Phase 80 (asked 2026-11-23; locked) |
| D2 | all | Order 77 → 78 → 79 → 80: the audit row first because it holds the only live defect, and 78 before 79 (locked) |
| D3 | all | Branch `arch-wave-14` off `main` at `5784bbd6`; no merge, no release (locked) |
| D4 | all | Research run; `.planning/research/` is this wave's research (locked) |
| to ask | 77 | At the discuss step, once, after the probe: the brand mechanism (type-level `Brand.nominal` on a plain object, a private-constructor class with a private marker as Phase 65's `admit` is, or `Schema.brand`); whether the exported `AuditEntry` schema value stays; the fate of `undated` (INV-QD-101); how a host assigns `sequenceNumber` after encoding; the row's `unknownKeys`; the refusal-message table for the envelope-first decode |
| to ask | 79 | At the discuss step, once, after the spike: how `configure` folds into the build hook without an `Off` then `Starting` flash (inside the scoped build, a latest-inputs ref, or a second effect); omitted vs `undefined` under `sameFields`; diagnostics `undefined` (off) vs `{}` (on); whether `GatesFeed`'s restart on `watchFailure !== undefined` (G43) is part of the one rule or a stated exception; whether `capacity: undefined` vs the default capacity still wipes the timeline |
| to ask | 80 | At the discuss step, once: whether `picking` and `picked` survive a tab switch (`spec/devtools-spec/01-shell.md:72`, BEH-QD-234's three exits, INV-QD-107), the stale-pick rule (reuse `HeldChoice.resolveHeld`), and removing `instrument` (Breaking `@qadi/react`, amends ADR-QD-111) |

**Every phase** carries the seven cross-cutting requirements (WX-01, WX-02, WX-03, WX-04, WX-05, WX-06, WX-07): `pnpm check:pr < /dev/null` green at the end of each phase; its ADR (or "Unused" in its CCR row), CCR, BEH/INV and traceability records using only its reserved numbers, never `node scripts/next-id.mjs`; `spec/overview.md` names every added export and drops every removed one (gate 13), and gate 14 probes every changed `make*Feed` signature; no new `as`, `!`, `any`, `switch`, `Effect.fnUntraced`, `async`/`await`, ambient `console`/`process.env`/clock, `Record<string, unknown>`, `// Stryker disable` or module-scope `let`, and a budget changes only together with its AGENTS.md table; coverage held (core at least 95 percent, the others at least 90) and the Stryker score of every touched file recorded per phase in `NN-mutation-base.json` (the same invocation at the phase base and at close), a drop closed with a test and never re-baselined; a characterisation or regression test written on the phase base before any behaviour change (RED for a defect, green for preserved behaviour) and every new check shown failing once; no D-numbers, plan-local ids or phase numbers in shipped source, test titles or BDD scenarios; nothing released or published. House rules, verify-command hygiene and the Stryker procedure are in `.planning/phases/_SHARED-CONTEXT.md`, overridden where `_WAVE14-CONTEXT.md` says so. A record's plan is the phase's last plan.

**Soft edges** (from `_WAVE14-CONTEXT.md` and the files each phase edits; serial order covers all of them):

| Edge | Strength | Reason |
|------|----------|--------|
| 77 first | ordering | the only live defect goes first, with its regression test RED on its own phase base; `@qadi/audit` shares no source with 78 to 80 |
| 78 → 79 | hard | after 78, `TimelineFeed.configure` is two comparisons and the feed's `timeline` is the one store; doing 79 first would rewrite the `inner`/`push` plumbing that 78 deletes |
| 79 → 80 | soft | 80 adds a tenth member to the `DockModel` record and edits `DevtoolsDock.tsx`, both of which 79 reshapes; `DockModel.ts` and `dockModelFixtures.ts` are edited by both, and 80 needs no input from `configure` |
| 78, 79, 80 → close | re-verify | the three phases edit the same devtools files, so the milestone close re-verifies 77 to 79 and re-runs each phase's record scripts |

**Numbering reserved for v1.9** (the whole block is held in the shared reservation file, `$(git rev-parse --git-common-dir)/qadi-reserved-ids.json`, set to CCR 472, ADR 193, BEH 740, INV 406 on 2026-11-23; never run `node scripts/next-id.mjs` while executing these phases, because every call writes a reservation; name an unused reservation "Unused:" in the phase's CCR row; an amendment of an existing ADR leaves its new ADR number unused and says so; pass `--date 2026-11-23`, or the real date of the edit, to `spec-revise`). Next free on `ab8ccb75`: ADR-QD-190, CCR-QD-469, BEH-QD-721, INV-QD-399. Highest ARCH is ARCH-123; ARCH ids below 124 are never reused. ADR Document IDs equal the file number (gate 10).

| Phase | ARCH | ADR-QD | CCR-QD | BEH-QD | INV-QD |
|---|---|---|---|---|---|
| 77 | 124 | 190 | 469 | 721–725 | 399–400 |
| 78 | 125 | 191 | 470 | 726–730 | 401–402 |
| 79 | 126 | 192 | 471 | 731–735 | 403–404 |
| 80 | 127 | 193 | 472 | 736–740 | 405–406 |

**Out of scope** (recorded, not planned): a general "unwalked member decoded by its own decoder" option on `untrustedDecoder` (its four users have different refusal policies; Phase 77 takes the one concrete inconsistency); merging the tag-keyed error tables (each is compiler-checked, and `catchTag` needs a literal tuple); changing `ArchiveRefusal`'s members or `ARCHIVE_VERSION` (Phase 77 changes what the writer accepts, not the archive format); truncate-on-resize or grow-keeps-entries for the timeline; structural (deep) identity for feed inputs; exporting the lens session from `@qadi/devtools`' barrel; aligning `@qadi/react`'s swallowing gate registry with ADR-QD-177's rethrow contract and guarding the devtools feeds' publish-between-`begin()`-and-`fork()` window (both carried from v1.7); formatting with `oxfmt` (AGENTS.md §17); upgrading any dependency; merge, release or publish.

### Phases

- [ ] **Phase 77: An audit row is a value only its codec makes** - `AuditEntry` is obtainable only from `encodeAuditEntry` and `decodeAuditEntry`, so the writer can no longer write an archive its own reader refuses; the row decodes envelope-first (ARCH-124, audit; live defect; Breaking)
- [ ] **Phase 78: `TimelineStore` owns its capacity** - A `resize(capacity)` command replaces `TimelineFeed`'s mirror store, six-member forwarder and abandoned subscription, and the feed returns its one store (ARCH-125, devtools)
- [ ] **Phase 79: Feeds and the dock model take inputs only through `configure`** - Constructors take no inputs, one per-field identity rule decides a restart, one package-private hook does "scope, then configure", and the dock's input type is stated once (ARCH-126, devtools; Breaking)
- [ ] **Phase 80: The highlight lens is a headless session; `instrument` resolved** - The lens's rules move into a `LensSession` that the dock model owns as its tenth store, `useLens` shrinks to the DOM adapter, and the unread `QadiContextValue.instrument` is removed or its reason recorded (ARCH-127, devtools + react)

### Phase Details

### Phase 77: An audit row is a value only its codec makes

**Goal**: `@qadi/audit` can no longer write an archive its own reader refuses, because an `AuditEntry` is a value only its codec makes, so the archive, retention and the archive facts trust a row without re-checking it, and the row decodes envelope-first as core's stored record does.
**Live defect**: yes. `archiveAuditTrail` checks only sequence facts (`AuditArchive.ts:110-127`, `ArchiveFacts.ts:104-130`), so a type-valid row `{...e, record: {...e.record, at: NaN}}` is archived, `JSON.stringify` writes `at: null`, and `readAuditArchive` refuses the bundle's own output as `EntryNotDecodable` (`AuditArchive.ts:290-306`); a second, archive-level variant is `archiveAuditTrail(entries, NaN)` writing `createdAt: null`.
**Breaking**: yes (`@qadi/audit`). Amends ADR-QD-110.
**Depends on**: Nothing in v1.9 (first phase; serial order).
**Requirements**: AROW-01, AROW-02, AROW-03, AROW-04, AROW-05, AROW-06, WX-01, WX-02, WX-03, WX-04, WX-05, WX-06, WX-07
**Packages**: `@qadi/audit` (`AuditEntry.ts`, `ArchiveFacts.ts`, `AuditArchive.ts`, `Retention.ts`, their tests and type pins, one features step file); `@qadi/core` is untouched (`untrustedDecoder` already supports `unwalked`, so no `UNTRUSTED_DECODE_BUDGET` change)
**Records**: ARCH-124; ADR-QD-190 (new; amends ADR-QD-110; records the brand, the decode order and the refusal table); CCR-QD-469; BEH-QD-721 to 725 (BEH-QD-253 amended); INV-QD-399 to 400 (INV-QD-101 amended)
**Evidence** (`_WAVE14-CONTEXT.md`, at `ab8ccb75`): `AuditEntry` is a plain struct type any caller can build (`AuditEntry.ts:80-84`). The safe-integer rule for `sequenceNumber` is written twice, `AuditEntry.ts:56` (`Schema.optional(Schema.Int)`) and `ArchiveFacts.ts:56-64` (`Schema.is(Schema.Int)`), "kept in step" by a comment at `:50-54`. `decodeAuditEntry` reads the record first and then the row (`AuditEntry.ts:149-157`, with a hand `hasProperty(input, "record")` pre-check and its own message), where core's stored record is envelope-first with `record` unwalked (`SinkCodec.ts:603-651`, ADR-QD-170). Dead if the brand holds: `isSequenceNumber` (`ArchiveFacts.ts:64`), the write-path `SequenceNumberInvalid` (`:138`) and `Retention.ts`'s `undated` branch (`:80-90`). Pins that move: UntrustedSeams A11/A12 (`"an audit row has no record"` and the long `Expected {...}` text; tags stay) and `AuditEntryDifferential.test.ts`.

**Success Criteria** (what must be TRUE):
  1. Regression tests written on the phase base, without `as`, are RED for each writer input the reader refuses (at least the `at: NaN` row and `archiveAuditTrail(entries, NaN)`; every other enumerated input, `keyMaterial` included, is RED or recorded "refuted at the base"), and after the phase every archive `archiveAuditTrail` returns is read back by `readAuditArchive(JSON.parse(JSON.stringify(archive)))`.
  2. An `AuditEntry` can be obtained only from `encodeAuditEntry` or `decodeAuditEntry`: a literal, a spread of an existing row with a changed field, and the exported schema value each fail to compile, pinned by type tests that can fail (`@ts-expect-error` with `toRaiseError`, plus a positive twin); the row keeps its `JSON.stringify` bytes, its key-absent `sequenceNumber` and the structural `Equal`/`Hash` that `holds()` and `planPurge` use, and a host can still assign a `sequenceNumber` after encoding through a route the codec owns (decided and recorded).
  3. `decodeAuditEntry` reads the envelope first with `record` unwalked, then the record, through `untrustedDecoder` and with no new `Schema.decode*` or `JSON.parse` token; the refusal tags are unchanged, and a characterisation matrix written on the phase base (including a row where both envelope and record are bad) shows every message and precedence change, which ADR-QD-190 tabulates.
  4. The checks the brand makes dead (`isSequenceNumber`, the write-path `SequenceNumberInvalid`, `Retention`'s `undated` branch and fields) are removed or kept with a recorded reason, `sequenceNumber`'s safe-integer rule is stated in one place, and a record-domain round-trip property mirrors `ArchiveRoundTrip.test.ts`'s sequence-number one.
  5. ADR-QD-190 records the brand, the decode order and the refusal table and amends ADR-QD-110; INV-QD-101, BEH-QD-253 and the affected `spec/overview.md` rows move with it; a `@qadi/audit` changeset marks the change Breaking, with an upgrade-guide entry.

**Planning notes**: **Research flag: a pre-plan probe is required** (`/gsd-plan-phase --research-phase 77`). (a) Compile each candidate brand form under the audit tsconfig and probe its `Equal`, `Hash` and `JSON.stringify` behaviour: the researchers disagree (a type-level `Brand.nominal` on a plain object keeps structural equality but survives a spread, so `{...entry, sequenceNumber: 1.5}` still type-checks; a private-constructor class with a `declare private readonly` marker does not survive one but its `Equal`/`Hash` and the marker compile in audit are unverified), and an exported decodable schema value is a second way to mint. (b) Enumerate whole-archive writer inputs (entries, `now`, `keyMaterial`) through `readAuditArchive(JSON.parse(JSON.stringify(archive)))`; the `now: NaN` and `keyMaterial` variants are reasoned, not run, and any that does not reproduce is recorded "refuted at the base". The open decisions in the owner table above are asked once at the discuss step, after the probe. Test churn: about 35 literal or spread row sites in 9 audit test files, 5 type-pin files and one features step file; a `numbered(entry, n)` helper that goes through the codec avoids hand-built rows. Commit the per-file Stryker baselines (`AuditEntry.ts`, `ArchiveFacts.ts`, `AuditArchive.ts`, `Retention.ts`) alone and first, and re-close them after the review fixes. Do not delete a check the type cannot prove.
**Plans**: TBD

### Phase 78: `TimelineStore` owns its capacity

**Goal**: A `TimelineStore` owns its capacity through a `resize(capacity)` command, so `makeTimelineFeed` returns its one store and the mirror store, six-member forwarder and abandoned subscription that worked around a captured capacity are gone.
**Depends on**: Phase 77 (serial order only; `@qadi/audit` and `@qadi/devtools` share no source). Phase 79 depends on this phase.
**Requirements**: TRSZ-01, TRSZ-02, TRSZ-03, TRSZ-04, WX-01, WX-02, WX-03, WX-04, WX-05, WX-06, WX-07
**Packages**: `@qadi/devtools` (`TimelineStore.ts`, `TimelineFeed.ts`, their tests, `spec/overview.md`, one changeset)
**Records**: ARCH-125; ADR-QD-191 (new, or an amendment of ADR-QD-137 with 191 named unused; keeps ADR-QD-137); CCR-QD-470; BEH-QD-726 to 730; INV-QD-401 to 402
**Evidence** (`_WAVE14-CONTEXT.md`, at `ab8ccb75`): capacity is captured once (`TimelineStore.ts:49`). `TimelineFeed.ts:126-193` works around it with a mutable `inner`, a mirror `view` ExternalStore (`:129`), a `push` listener (`:132-133`), a six-member forwarder (`:136-141`) and a resize that drops the old store without unsubscribing (`:178`); `idleTimeline` (`:106`) writes the six members a third time. Today `configure` assigns `inputs = next` before an invalid capacity throws (half-applied), `accept` at capacity 0 is undecided, and resize while paused is untested. A public `TimelineStore` gaining a member is a type-level change, so it needs a changeset and a `spec/overview.md` row (gate 13).

**Success Criteria** (what must be TRUE):
  1. `TimelineStore.test.ts` pins `resize(capacity)` without a scope or a source: it validates the capacity before changing anything, does nothing for the same effective capacity, empties the timeline at the new bound, releases the pause and notifies subscribers once, and each rule is shown failing once.
  2. `makeTimelineFeed` returns its one store: the six-member forwarder, the mirror `view` store, the `push` listener and the subscription left on a dropped store are deleted (`/usr/bin/grep` finds none in `TimelineFeed.ts`), `idleTimeline` gains the member, and the host's store keeps the same identity across a capacity change.
  3. `try { resize } finally { readSource }` and the `reads.closed()` guard stay, TF4, TF14, TF26, TF27 and TF29 pass unedited, and a capacity change that throws leaves the feed's inputs unchanged (no half-applied state).
  4. ADR-QD-191 (or an ADR-QD-137 amendment that names 191 unused) records the command, and `spec/overview.md` (gate 13) and a `@qadi/devtools` changeset cover the new public member.

**Planning notes**: No research flag: `clear`, `setPaused` and `SupersedingRun` are direct precedents and TF1 to TF29 are the pinned proof. The decisions are small and go to the discuss step or the plan: an equal effective capacity is a store-level no-op and how that meets the feed's "omitted reads as `undefined`" rule (79 later owns that rule); resize while paused releases the pause like `clear`; an invalid capacity is validated before anything mutates (throw or typed result); `useTimelineStore(options)` leaves a changed `capacity` alone. Resize publishes with `publish`, not `set`, so the pause reset is heard. Commit the Stryker baselines of `TimelineStore.ts` and `TimelineFeed.ts` first and re-close them after the review.
**Plans**: TBD

### Phase 79: Feeds and the dock model take inputs only through `configure`

**Goal**: Every feed and the dock model are built with no inputs and take them only through `configure`, so one per-field identity rule decides whether an input moved, one package-private hook does "scope, then configure", and the dock's input type is stated once.
**Breaking**: yes (`@qadi/devtools`: `makeTimelineFeed`, `makeDiagnosticsFeed`, `makeGatesFeed` and `makeDockModel` lose their constructor inputs; `makeSimulationSession` if it has the same shape). Amends ADR-QD-137, ADR-QD-173 and ADR-QD-185.
**Depends on**: Phase 78 (hard: after 78, `TimelineFeed.configure` is two comparisons, so this phase does not rewrite plumbing 78 deletes).
**Requirements**: CONF-01, CONF-02, CONF-03, CONF-04, CONF-05, CONF-06, WX-01, WX-02, WX-03, WX-04, WX-05, WX-06, WX-07
**Packages**: `@qadi/devtools` (`TimelineFeed.ts`, `DiagnosticsFeed.ts`, `GatesFeed.ts`, `DockModel.ts`, `ExternalStore.ts`, `react/useDockModel.ts`, `useTimeline`, `useDiagnostics`, `useScoped`, `DevtoolsDock.tsx`), plus gate 14's packed consumer (`scripts/check-package-install.mjs:653-712`), `surface.tst.ts`, the compiled README fence, the website's devtools page, `spec/behaviors` and ADR fences
**Records**: ARCH-126; ADR-QD-192 (new; amends ADR-QD-137, ADR-QD-173 and ADR-QD-185); CCR-QD-471; BEH-QD-731 to 735; INV-QD-403 to 404
**Evidence** (`_WAVE14-CONTEXT.md`, at `ab8ccb75`): `useDockModel.ts:51-57` lists the eight inputs three times, and the same field set is three types (`DevtoolsDockProps`, `DevtoolsDock.tsx:80`; `UseDockModelInput`, `useDockModel.ts:28`; `DockModelInputs`, `DockModel.ts:73`). `DockModel` maps inputs twice (`{ capacity, source }` at `:188` and `:283`; `{ gates, questions, intervalMillis }` at `:227-230` and `:293-296`). Four hand-written restart rules: Timeline, Diagnostics (`DiagnosticsFeed.ts:197-200`), Gates (`GatesFeed.ts:261-268`, which also restarts when `watchFailure !== undefined`, G43) and Dock (an unconditional `refresh()`); a new options field compiles and never restarts. The shared rule is `sameFields` (`ExternalStore.ts:133-146`, private, used by `makeDerivedStore` under a `Required<K>` bound that is on that function only). Traps: `sameFields` counts `{a}` vs `{a, b: undefined}` as a change, diagnostics presence is not a field comparison, and `intervalMillis` crosses from diagnostics to gates. Constructors that lose `init`: `TimelineFeed.ts:123`, `DiagnosticsFeed.ts:121`/`:196`, `GatesFeed.ts:157`, `DockModel.ts:209`.

**Success Criteria** (what must be TRUE):
  1. A characterisation test written on the phase base, and green there, pins the dock's first-render sequence (diagnostics, gates and the Questions join), plain and under StrictMode, and the same test is green after the change: no reader sees an unconfigured model.
  2. `makeTimelineFeed`, `makeDiagnosticsFeed`, `makeGatesFeed` and `makeDockModel` are built with no inputs and `configure` is the only way inputs arrive, with the first `configure` producing what `init` produces today.
  3. One per-field identity rule, the one `makeDerivedStore` uses, decides whether an input moved: omitted and `undefined` are treated alike, diagnostics on and off stays a distinct transition, the gates feed's re-watch after a failed watch (G43) is either part of the rule or a stated exception, and a type pin that can fail shows a new input field cannot compile without being compared.
  4. One package-private hook does "build in a scope, then configure with the latest inputs", used by `useDockModel`, `useTimeline`, `useDiagnostics` (and `useSimulationSession` where it fits), and a hidden `Activity` or a StrictMode rebuild configures with the current inputs, not stale ones, pinned by a test.
  5. `UseDockModelInput` is gone, `DevtoolsDockProps` is `DockModelInputs` plus the host-only props, inputs are mapped onto each feed in one place in `DockModel`, and gate 14's packed consumer, `surface.tst.ts`, the compiled README fence, the website's devtools page, `spec/behaviors` and the ADR fences all use the new signatures in the same plan as the change, with ADR-QD-192 and a Breaking `@qadi/devtools` changeset and upgrade-guide entry.

**Planning notes**: **Research flag: a pre-plan render-sequence spike is required** (`/gsd-plan-phase --research-phase 79`). Today the first render is `Starting` then `Starting`, because the idle stand-ins hide an unconfigured feed; children's layout effects run before the parent's configure effect and `isUnsampled(Off)` is false, so a bare constructor could make the Questions join briefly claim "not handed over". That is derived by tracing, not run: the spike runs the sequence plain, under StrictMode and across a hidden `Activity` against a bare constructor, and `useScoped` reads `make` once per mount, so folding configure into the build needs the latest inputs (a ref, or a kept second effect). The open decisions in the owner table above are asked once at the discuss step, after the spike; also decide a throw during the first `configure` inside the build (scope closed vs model kept). `DockModel.configure`'s dispatch order (gates, then diagnostics, then `shownReading.refresh()`) stays written once, and the rule decides whether a feed restarts, not the order. Export `sameFields` from its file, not the barrel. Test churn: about 190 to 213 construction sites (`DockModel.test.ts` 77, `GatesFeed.test.ts` 38, `DiagnosticsFeed.test.ts` 33, `TimelineFeed.test.ts` 30), so use one fixture helper, and keep the characterisation file out of shared helpers because Phase 80 edits them. Gate 14's fixture is a template string that only `pnpm spec:package` compiles. Commit the Stryker baselines of `TimelineFeed.ts`, `DiagnosticsFeed.ts`, `GatesFeed.ts`, `ExternalStore.ts` and `DockModel.ts` (score 1, ADR-QD-168) first and re-close them after the review.
**Plans**: TBD

### Phase 80: The highlight lens is a headless session; `instrument` resolved

**Goal**: The highlight lens's rules live in a headless `LensSession` that the dock model owns as its tenth store, so they are tested and mutation-gated without the DOM and `useLens` is only the document adapter, and the unread public `QadiContextValue.instrument` is removed or its reason to stay is recorded.
**Depends on**: Phase 79 (soft: 80 adds a member to the `DockModel` record and edits `DevtoolsDock.tsx`, both of which 79 reshapes).
**Requirements**: LENS-01, LENS-02, LENS-03, LENS-04, LENS-05, WX-01, WX-02, WX-03, WX-04, WX-05, WX-06, WX-07
**Packages**: `@qadi/devtools` (new package-private `model/LensSession.ts`, `model/DockModel.ts`, `react/useLens.ts`, `react/QuestionsPanel.tsx`, `questionsPanelInput.ts`); `@qadi/react` (`QadiProvider.tsx`, only if `instrument` is removed)
**Records**: ARCH-127; ADR-QD-193 (new; amends ADR-QD-185's store count and ADR-QD-047; a dated ADR-QD-111 amendment if `instrument` is removed); CCR-QD-472; BEH-QD-736 to 740 (BEH-QD-700 "nine" becomes "ten"); INV-QD-405 to 406 (INV-QD-390 amended)
**Evidence** (`_WAVE14-CONTEXT.md`, at `ab8ccb75`): `useLens.ts:43-120` holds `highlighted`, `picking` and `picked` in three `useState`s and the rules are in DOM handlers (a pick swallows the click only when a guard was found; Escape cancels picking and does not reset `picked`; toggle clears both; hovering nothing clears the highlight), with the listeners torn down and re-added on every `instances` change. Only DOM tests cover it (`QuestionsPanel.gates.test.tsx:267-410`), so the rules sit outside the model's tests and Stryker gate, the defect class `ExplorerSession.ts`'s header records fixing. `DockModel.ts` holds a mutation score of 1 (ADR-QD-168). The small find: `QadiContextValue.instrument` (`QadiProvider.tsx:62`, written at `:307-308`) has no reader in `packages/*/src` or tests, and the provider's own `instrument` prop stays; it is public through the barrel, so removal is a Breaking `@qadi/react` minor (changeset, the `0.13` upgrade-guide section, `spec/overview.md:570`, the `useMemo` deps at `:91`).

**Success Criteria** (what must be TRUE):
  1. A package-private `LensSession` in `model/` holds `highlighted`, `picking` and `picked`, with transitions toggle, hover, choose (which says whether the click is consumed), cancel, highlight and clear, and each rule that today lives in `useLens`'s handlers is pinned by plain calls under the model's mutation gate.
  2. The dock model owns the session as its tenth store, BEH-QD-700, INV-QD-390, ADR-QD-185 and the store-list test move together, and `DockModel.ts`'s mutation score does not fall below its phase-base record.
  3. `useLens` keeps only the document listeners and `drawLens`/`clearLens`, the click is swallowed synchronously in the capture listener, the listeners are not re-added on every instance change, and `QuestionsPanel.gates.test.tsx` and `Lens.test.ts` keep passing, with any behaviour change preceded by a characterisation test.
  4. What happens to `picking` and `picked` across a tab switch, and to a picked id whose guard has gone, is decided against `spec/devtools-spec/01-shell.md:72`, BEH-QD-234 and INV-QD-107 (reusing `HeldChoice`'s rule where it fits), pinned by tests, and recorded in ADR-QD-193.
  5. After a repo-wide search that includes `examples/` and `website/`, `QadiContextValue.instrument` is removed with a Breaking `@qadi/react` changeset, an upgrade-guide entry, a `spec/overview.md` edit and a dated ADR-QD-111 amendment, or the reason it stays is recorded with a first reader.

**Planning notes**: No research flag: `DockSession`, `ExplorerSession` and `HeldChoice` are the precedents and the open items are decisions, not unknown technology. The one decision needing evidence first is persistence: the review treats "a pick survives a tab switch" as the point, while BEH-QD-234's third exit and `01-shell.md:72` say opening the inspector exits lens mode, and a persisted `picked` would re-run `scrollIntoView` on remount (`InstanceRow` must not re-fire) and a persisted highlight would redraw unasked; every changed behaviour gets an ADR row. `choose` is decided synchronously in the capture listener, and the cleanup calls `cancel()` so BEH-QD-234's exit-on-unmount holds. `QuestionsPanel` takes a `lens` prop and `questionsPanelInput.ts` is the single seam for about 42 panel renders. `LensSession.ts` is new and needs its mutation bar set at its first commit; commit `DockModel.ts`'s baseline first. The milestone close re-verifies 77 to 79 and re-runs each phase's record scripts, because 78 to 80 edit the same files.
**Plans**: TBD
**UI hint**: yes

### Progress (v1.9)

**Execution Order:**
Phases execute in numeric order: 77 → 78 → 79 → 80

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 77. An audit row is a value only its codec makes | 0/0 | Not started | - |
| 78. `TimelineStore` owns its capacity | 0/0 | Not started | - |
| 79. Feeds and the dock model take inputs only through `configure` | 0/0 | Not started | - |
| 80. The highlight lens is a headless session; `instrument` resolved | 0/0 | Not started | - |
