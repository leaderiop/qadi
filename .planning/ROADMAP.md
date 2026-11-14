# Roadmap: Qadi

## Milestones

- ✅ **v1.0 Arch Wave 5** — Phases 1-9 (shipped 2026-11-09) — [archive](milestones/v1.0-ROADMAP.md)
- 🚧 **v1.1 Arch Wave 6** — Phases 10-20 (all phases complete 2026-11-10; merged to `main` in #155; not archived as a GSD milestone; not released)
- ✅ **v1.2 Arch Wave 7** — Phases 21-29 (completed 2026-11-12; not released) — [archive](milestones/v1.2-ROADMAP.md)
- ✅ **v1.3 Arch Wave 8** — Phases 30-36 (completed 2026-11-13; not released) — [archive](milestones/v1.3-ROADMAP.md)
- 🚧 **v1.4 Arch Wave 9** — Phases 37-42 (planned 2026-11-14; not started)

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

## 🚧 v1.4 Arch Wave 9 (Phases 37-42)

### Overview

Wave 9 resolves the six candidates of the 2026-11-14 architecture review. It is six relocations, not six capabilities: each phase
takes one fact that is restated by hand and gives it one owner. The superseding-run protocol goes to one devtools module (37), the
sink wire version to one core constant (38), the hydration drop-reason set and its kinds to one core table (39), the decode-refusal
vocabulary to core (40), the value-to-text guard to one devtools function (41), and the seed-to-evaluation link to one react module,
or the human rejects that change (42). No new dependency, no Effect API change, no version bump. Base commit `637c0601` (`main`,
v1.3 merged as #157, release PR #158), branch `arch-wave-9`. Read `.planning/phases/_SHARED-CONTEXT.md`, then
`.planning/phases/_WAVE9-CONTEXT.md` (base, numbering, per-phase evidence from the review), then `.planning/research/SUMMARY.md`.
Its reconciliations R1 to R6 are binding unless a phase's planner records evidence against one.

**The six phases and their order are fixed by the user (2026-11-14).** Nothing is added, merged, split or reordered. Research notes
that 41 could run ahead of 40 (a reproduced throw outranks a Breaking rename, and they share no file); that is raised only if the
user asks for defects first.

**Standing direction (user, unchanged):** the cleanest design wins, not the simplest, and the project is not in production, so
breaking changes are allowed. Keeping a public name, avoiding a Breaking changeset or keeping source compatibility is never the
reason to pick a design. Every break is recorded (changeset marked **Breaking**, `apps/website/.../reference/upgrading.md`).
Nothing is released or published, and no version-packages PR is merged.

Order: the top recommendation first (37, devtools, self-contained), then the three core-owned "stated once" phases (38-40), then
the devtools render guard (41), then the one speculative react phase (42), which also corrects anything 37-41 left stale.
**Execution order: phases run strictly one at a time, in numeric order (37 → 42).** Every records plan edits the same spec
registers (CCR tail, invariants, traceability, `index.yaml`, `overview.md`, behaviour docs) and `use_worktrees` is false. The
per-phase "Depends on" lines name the *content* reasons; serial order is the operational rule.

**Every phase** carries the seven cross-cutting requirements (WX-01 to WX-07): `pnpm check:pr < /dev/null` green at the end (ten
silent minutes means hung); ADR (or "Unused" in its CCR row), CCR, BEH/INV and traceability records using only reserved numbers,
never `node scripts/next-id.mjs`; `spec/overview.md` names every added export and its module column is corrected by hand for every
moved declaration (gate 13 checks names only); no new `as`, `!`, `any`, `switch`, `Effect.fnUntraced`, `async`/`await` or ambient
`console`/`process.env`/clock; coverage held, and per-file Stryker scores recorded in the first plan (`NN-mutation-base.json`,
the same invocation at the base and the close) and compared in the last, a drop closed with a test and never re-baselined; a
characterisation or regression test written on the phase base before any behaviour change; every public break recorded as
**Breaking**. Re-run `pnpm circular` after the first source edit of every phase that moves a declaration, and
`pnpm spec:website-examples` explicitly for any phase that edits a website page (the website typecheck inside `check:pr` can be
skipped). Scope negative greps to the phase's added lines and exclude `.stryker-tmp`, `.next`, `node_modules` and `reports`; run
vitest from the repo root with `--project`.

**Cross-phase ordering edges** (from `research/SUMMARY.md`):

| Edge | Strength | Reason |
|------|----------|--------|
| 38 → 40 | hard | both edit `SinkWire.ts` and `SinkCodec.ts`; 40's describer is built on the vocabulary 38 settles |
| 39 → 42 | hard | both edit `HydrationEngine.ts`; 42 starts from the table-derived groups |
| 37 → 41 | soft | both touch `SimulationSession.ts`; 41's RED session test should target the final session (a new test file, because `SimulationSession.test.ts` is 1,809 lines) |
| 37-41 → 42 | ordering | 42's last plan sweeps anything 37-41 left stale and re-verifies the milestone |
| 37, 38, 39 vs 41 | none | no shared source files beyond the soft edge above |

**Numbering reserved for v1.4** (the whole block is held in the shared reservation file; confirm a number is free by grepping
`spec/`, `packages/`, `.changeset/` and `AGENTS.md` before using it; name an unused reservation "Unused:" in the phase's CCR row).
Highest ARCH is ARCH-83; ARCH ids below 84 are never reused. ADR Document IDs equal the file number (gate 10).

| Phase | ARCH | ADR-QD | CCR-QD | BEH-QD | INV-QD |
|---|---|---|---|---|---|
| 37 | 84 | 150 | 428 | 521–525 | 319–320 |
| 38 | 85 | 151 | 429 | 526–530 | 321–322 |
| 39 | 86 | 152 | 430 | 531–535 | 323–324 |
| 40 | 87 | 153 | 431 | 536–540 | 325–326 |
| 41 | 88 | 154 | 432 | 541–545 | 327–328 |
| 42 | 89 | 155 | 433 | 546–550 | 329–330 |

**Human checkpoints.** Each phase opens on the `checkpoint:decision` items listed in its detail (Phases 37, 38 and 39 have none:
research settled them). They are settled in `/gsd-discuss-phase` before planning, or in the phase's first plan when a human answer
is needed during execution, and recorded in the phase CONTEXT and its ADR or CCR row. Phase 42's is a hard human checkpoint: its
first plan gathers evidence and presents options, asks once (one `AskUserQuestion`), and stays quiet through stop-hook repeats.

### Phases

- [x] **Phase 37: A scoped run that a newer run supersedes** - One devtools module owns the run protocol (generation, close, finalizer order, stop, land only while current) that three stores restate by hand (ARCH-84) (completed 2026-11-14)
- [x] **Phase 38: The sink wire version stated once** - One exported `WIRE_VERSION` in `SinkWire.ts`; the schema literals, encoder and decoder check derive from it (ARCH-85) (completed 2026-11-14)
- [ ] **Phase 39: Each hydration drop reason stated once, with its kind** - One keyed table in core; the unions, the list, the meanings and react's payload and entry groups derive from it (ARCH-86)
- [ ] **Phase 40: Core owns describing a decode refusal** - Core describes `DecodeRefusal`; devtools passes it through (Breaking) and audit decodes a row's record once (ARCH-87)
- [ ] **Phase 41: One guarded value-to-text function** - A bigint or circular value no longer throws from Remedies or a session command; Remedies, Filters and SimulationForm read through one function (ARCH-88)
- [ ] **Phase 42: A seeded question builds its own computing atom** - Opens on a human checkpoint: invert the callback, or record the rejection; then a cross-phase stale sweep and milestone re-verify (ARCH-89)

### Phase Details

### Phase 37: A scoped run that a newer run supersedes

**Goal**: A scoped run that a newer run supersedes (generation, close, finalizer order, stop, land only while current) is written once in one package-private devtools module, so the three stores that restate it by hand stop drifting, and a restart from inside a store's own notification leaves the newest run live.
**Depends on**: Nothing in v1.4 (first phase; serial order). Soft edge to Phase 41.
**Requirements**: RUN-01, RUN-02, RUN-03, RUN-04, RUN-05, RUN-06, RUN-07, RUN-08, WX-01, WX-02, WX-03, WX-04, WX-05, WX-06, WX-07
**Records**: ARCH-84; ADR-QD-150 (amends ADR-QD-137 §7 and point 3, and states the stop rule); CCR-QD-428; BEH-QD-521 to 525; INV-QD-319 to 320; changeset for `@qadi/devtools` (patch); AGENTS.md §10 corrected
**Settled by research** (`SUMMARY.md` R1, R2; reopened only if a RED reproduction says otherwise): `stop` is one unconditional rule (bump the generation, fork `Effect.void`, no guard; the guarded form saves one throwaway fiber with no observable effect); the interface is two-step, `begin()` → publish → `fork(token, effect)`, plus `isCurrent(token)`, because each store publishes between the bump and the fork and a one-call `run` breaks all three; the feeds' interrupt-only failure filter is one named hook that `SimulationSession` does not use (its `land` maps every non-success exit with a current token to `Broke`); a body's synchronous prefix keeps starting immediately (no `Effect.yieldNow` first, no `FiberHandle.run({ startImmediately: false })`), and a body that starts a command before its first yield is reported rather than left silently idle.

**Success Criteria** (what must be TRUE):
  1. One package-private module owns the run handle, the generation token, the closed state, the finalizer ordering (registered after the handle, so it runs first), interrupt-on-replace, `stop` and "land only while current"; `SimulationSession`, `TimelineFeed` and `DiagnosticsFeed` use it, and none of them declares `let generation`, `let closed`, `FiberHandle.make`/`FiberHandle.runtime` or its own bump-in-finalizer block (negative grep scoped to the phase's added lines).
  2. The module is tested through its own interface: supersede, close mid-run (including a defecting finalizer), stop in each state (not started, running, completed, closed), interrupt versus failure, two instances in two scopes, and a seeded model-based property over random begin, fork, land, stop and close interleavings (only the current run's result lands, nothing lands after close).
  3. `stop` is one unconditional rule used by both former call sites and pinned by one test: stopping with no run changes nothing and notifies nobody.
  4. A restart from inside a store's Starting or Reading notification leaves the newest run live in all three stores (RED on the phase base, or refuted with recorded evidence), and a run body that starts a command before its first yield is reported, not left silently idle.
  5. Observable behaviour is unchanged: the session run is still a root span, interruption never reads as `Stopped` (INV-QD-313), the session still reads a defect or self-interrupt as `Broke`, and every pre-existing store test passes unchanged on day one; ADR-QD-137 §7 and point 3 are corrected (no `useRunningStore`; the unconditional stop) and AGENTS.md §10 stops naming `it.scoped`, which `@effect/vitest@4.1.2` does not have.

**Planning notes**: **Research flag: needs `/gsd-plan-phase --research-phase 37`.** Run the two RED reproductions first (a feed restarted inside its Starting or Reading notification; a body whose synchronous prefix starts a command) and count the store tests that depend on a synchronous prefix before fixing the interface. **Plan shape, RED first**: the mutation base for all three stores, committed alone and first (`DiagnosticsFeed.ts` has no recorded base, `TimelineFeed.ts` was 1.0, `SimulationSession.ts` about 0.97; the close uses the same invocation); then the module's RED tests (re-entrancy, close with a defecting finalizer, the stop table, two instances, the self-interrupt row); then one store converted at a time, deleting a store-level case only after the module's test covers it; then the records plan (ADR-QD-150, the CCR README row in the same plan as its first citation, BEH/INV, traceability, changeset, the three "Added after the handle" comments and `DiagnosticsFeed`'s "without a Stopped" doc, AGENTS.md §10, `spec-revise --date` then `--check`); the mutation comparison last. A test that closes its scope mid-test builds `Scope.makeUnsafe()` and runs `Scope.provide` then `Scope.close`; `it.effect` already scopes a test. A `Scope.make("parallel")` voids the finalizer ordering, so the module's doc says so. The module builds synchronously (`useScoped` uses `Effect.runSync`) and holds per-build closure state only.
**Plans**: 9/9 plans complete

Plans:
**Wave 1**
- [x] 37-01-PLAN.md — Mutation baseline for the three stores, committed alone and first; the timeline ordering pin and the session self-interrupt and no-run stop pins, green on the base

**Wave 2** *(blocked on Wave 1 completion)*
- [x] 37-02-PLAN.md — Tracer: the timeline feed's three re-entrancy cases RED, then the `SupersedingRun` module and the timeline feed on it, GREEN

**Wave 3** *(blocked on Wave 2 completion)*
- [x] 37-03-PLAN.md — The module's interface rows R1 to R17 (supersede, close, stop in four states, failure hook, two scopes, held forks, synchronous build)

**Wave 4** *(blocked on Wave 3 completion)*
- [x] 37-04-PLAN.md — The seeded interleaving property over begin, fork, land, stop and close, proved to catch each subtle line

**Wave 5** *(blocked on Wave 4 completion)*
- [x] 37-05-PLAN.md — The diagnostics feed's two re-entrancy cases RED, then the feed on the module, GREEN

**Wave 6** *(blocked on Wave 5 completion)*
- [x] 37-06-PLAN.md — The session's in-prefix case RED, then the session on the module with the unconditional stop, GREEN

**Wave 7** *(blocked on Wave 6 completion)*
- [x] 37-07-PLAN.md — ADR-QD-150 amending ADR-QD-137, the CCR-QD-428 row, AGENTS.md section 10 and the devtools patch changeset

**Wave 8** *(blocked on Wave 7 completion)*
- [x] 37-08-PLAN.md — BEH-QD-521 to 525, INV-QD-319 and 320, the session behaviours and INV-QD-313 restated, traceability

**Wave 9** *(blocked on Wave 8 completion)*
- [x] 37-09-PLAN.md — Close: gate integrity, the WX-04 scan, commit order and test shape, the mutation comparison and `check:pr`

### Phase 38: The sink wire version stated once

**Goal**: The sink record wire's version number is written once, in `SinkWire.ts`, and the schema literals, the encoder, the decoder's check, `WIRE_VERSIONS` and `WireVersion` all derive from it, so retyping it cannot leave half the codec behind.
**Depends on**: Nothing in v1.4 (serial order only). Hard edge to Phase 40, which edits the same two files.
**Requirements**: WIRE-01, WIRE-02, WIRE-03, WIRE-04, WIRE-05, WX-01, WX-02, WX-03, WX-04, WX-05, WX-06, WX-07
**Records**: ARCH-85; ADR-QD-151 (ADR-QD-095/096 amended; Unused if the amendments suffice); CCR-QD-429; BEH-QD-526 to 530; INV-QD-321 to 322 (INV-QD-096 is amended rather than duplicated, so likely Unused); changeset for `@qadi/core` (minor: the new export)
**Settled by research** (`SUMMARY.md` R5): `WIRE_VERSION` is exported, because `SinkWire.ts` is `export *`'d from the barrel and ADR-QD-116 forbids re-exports, and a private constant that the codec restates is the defect being fixed. The form is `WIRE_VERSION = 2 as const` (a bare `= 2` widens to `number` in the encoder's spread), `WIRE_VERSIONS = [WIRE_VERSION] as const`, `WireVersion` from it, `Schema.Literal(WIRE_VERSION)` in both field structs, the encoder's `version: WIRE_VERSION` after the record spread (same key order), and decoder membership by `.some`. `WIRE_VERSIONS` narrows to `readonly [2]`, a type-only, source-compatible change that the changeset records. Hydration's payload `version: 2` and audit's bundle version are different wires and stay untouched.

**Success Criteria** (what must be TRUE):
  1. `WIRE_VERSION` is the only place the record wire's version number appears in `packages/core/src/Sink*.ts` (a scoped grep for `Literal(2)`, `version: 2` and `= 2` is empty), and `WIRE_VERSIONS`, `WireVersion`, both schema literals, the encoder and the decoder check derive from it.
  2. Retyping the version without editing the codec fails to compile, pinned by a tstyche test and shown by a recorded throwaway retype-to-3 experiment.
  3. Wire bytes are unchanged (a byte golden with the key order, committed on the phase base, stays green), and every other version is still refused as `UnsupportedVersion({ version, supported })`.
  4. INV-QD-096 states that the codec reads what it writes for every supported version (amended, no duplicate invariant); the new export has its `spec/overview.md` row and a `@qadi/core` minor changeset that records the `WIRE_VERSIONS` narrowing.

**Planning notes**: **Research flag: standard, skip research-phase** (one constant, verified under strict flags). **Plan shape**: the byte golden (with key order) and the throwaway retype-to-3 experiment first, because mutation will not guard this phase (`ignoreStatic` hides module-scope constants); the edit sites are those `_WAVE9-CONTEXT.md` lists plus the decoder's comparison, which the review undercounted; one conversion plan; then the records plan. No new counted `Schema.decode*` token (`UNTRUSTED_DECODE_BUDGET` is untouched). The mutation base is still recorded for the touched files so the close can compare.
**Plans**: 4/4 plans complete

Plans:
**Wave 1**
- [x] 38-01-PLAN.md — Mutation baseline for SinkCodec.ts and SinkWire.ts, committed alone and first; the version-2 goldens recorded and the read set written out as `[2]`, green on the base; the base retype-to-3 recorded and reverted

**Wave 2** *(blocked on Wave 1 completion)*
- [x] 38-02-PLAN.md — Tracer: `WIRE_VERSION` exported once from `SinkWire.ts`, `WIRE_VERSIONS`, `WireVersion`, both schema literals, the encoder and the decoder's read check derived from it; the tstyche pin; the post-change retype-to-3 recorded and reverted

**Wave 3** *(blocked on Wave 2 completion)*
- [x] 38-03-PLAN.md — ADR-QD-151 amending ADR-QD-096, the CCR-QD-429 row, INV-QD-096 amended in place, BEH-QD-199 and the overview naming `WIRE_VERSION`, and the `@qadi/core` minor changeset

**Wave 4** *(blocked on Wave 3 completion)*
- [x] 38-04-PLAN.md — Close: gate integrity, the WX-04 scan, commit order, the scoped greps, the mutation comparison against the base, and `pnpm check:pr`

### Phase 39: Each hydration drop reason stated once, with its kind

**Goal**: Each hydration drop reason is stated once in core with its kind (`dehydration`, `payload` or `entry`), so the reason unions, the value list, the meanings and react's payload and entry groups derive from one table, and a new reason without a kind is a compile error.
**Depends on**: Nothing in v1.4 (serial order only; core first, then react, within the phase). Hard edge to Phase 42 (the shared `HydrationEngine.ts`).
**Requirements**: DROP-01, DROP-02, DROP-03, DROP-04, WX-01, WX-02, WX-03, WX-04, WX-05, WX-06, WX-07
**Records**: ARCH-86; ADR-QD-152 (ADR-QD-123 and ADR-QD-037 touched; Unused if amendments suffice); CCR-QD-430; BEH-QD-531 to 535; INV-QD-323 to 324; changesets for `@qadi/core` (minor: one new public kind-subset type) and `@qadi/react` (patch)
**Settled by research** (`SUMMARY.md`): one keyed `as const` object in today's interleaved order (ForeignSubject, UnencodablePolicy, PayloadSubjectMismatch, MalformedEntry, UndecodablePolicy, EntryTooDeep, UnsupportedPayloadVersion, MalformedPayload, PayloadTooDeep), because that key order is the metric's `preregisteredWords` order and is observable in devtools' `Hydration.ts` and two tests; `MEANINGS` folded into the rows (two tables keyed by one union is the same defect one level down); enumeration through an `Object.hasOwn` predicate (`Struct.keys` is unverified in `effect@4.1.2`); the written-out order lists and the `length === 9` pin are kept as independent oracles, and completeness is added as a tstyche negative.

**Success Criteria** (what must be TRUE):
  1. One keyed table in `HydrationMetrics.ts` states each reason once with its kind and meaning; the reason unions, `hydrationDropReasons`, `isHydrationDropReason` (by `Object.hasOwn`), the folded `MEANINGS` and react's payload and entry groups all derive from it, and a reason without a kind fails to compile (a tstyche negative).
  2. The list order and the label set are exactly today's: a written-out nine-word snapshot committed on the phase base stays green, and the existing written-out lists and the `length === 9` pin stay as independent oracles.
  3. `qadi_hydration_dropped_total`'s declaration, id, description and `[metric-table]` row are unchanged.
  4. A throwaway new row reaches the metric, the devtools hydration panel (at zero) and react's reporters with one edit, recorded; names and runtime exports are unchanged.

**Planning notes**: **Research flag: standard, skip research-phase** (the `ENFORCEMENT_ERROR_CLASSES` precedent). **Plan shape**: commit the written-out ordered nine-word snapshot first, with the mutation base (`HydrationEvent.ts` is in the react Stryker list); core first, then react derives from it (delete the "placed by hand" doc); keep the metric's declaration line, id and description untouched, because the registry key includes the description; `METRIC_ID_LITERAL_BUDGET` for `HydrationMetrics.test.ts` stays 5; overview rows for the new public type; `bucketOf` and the refusal maps stay exhaustive.
**Plans**: TBD

### Phase 40: Core owns describing a decode refusal

**Goal**: Core owns describing a decode refusal, the mirror of ADR-QD-116's encode side, so devtools passes `DecodeRefusal` through instead of renaming it and audit decodes a row's record once.
**Depends on**: Phase 38 (hard: both edit `SinkWire.ts` and `SinkCodec.ts`, and the describer is built on the vocabulary 38 settles).
**Requirements**: DREF-01, DREF-02, DREF-03, DREF-04, DREF-05, DREF-06, DREF-07, WX-01, WX-02, WX-03, WX-04, WX-05, WX-06, WX-07
**Records**: ARCH-87; ADR-QD-153; CCR-QD-431; BEH-QD-536 to 540; INV-QD-325 to 326; changesets for `@qadi/core` (minor), `@qadi/devtools` (**Breaking**: `onMalformed`, `MalformedReason`) and `@qadi/audit` (patch); AGENTS.md §7a table and `UNTRUSTED_DECODE_BUDGET` changed together
**Opens on** (`checkpoint:decision`; the cleanest design wins, a Breaking change is not a cost):
  1. What devtools' malformed-frame callback and its `qadi.reason` log annotation carry after the change (DREF-01), decided and recorded before any code. Recommended: the refusal's `_tag`, recorded as Breaking, with the five-word upgrade map (`not-json` to `NotJson`, `too-deep` to `TooDeep`, `not-a-record` to `Malformed`, `unsupported-version` to `UnsupportedVersion`, `inconsistent` to `Inconsistent`); note that `not-a-record` collapses into `Malformed`.
  2. How core hands audit the record's JSON form with one narrow checked step and no `as` (DREF-05). Research rejects re-encoding (it can fail with `SinkRecordNotEncodable` on a read path, normalises differently, and could change what `Retention`'s `MutableHashMap<AuditEntry>` counts): core returns the strict decode's already-validated JSON form with the record, a new minor export that adds no counted `Schema.decode*` token.

**Success Criteria** (what must be TRUE):
  1. Core exports a total `describeDecodeRefusal` (module-scope `Match.tagsExhaustive`, safe for an `unknown` version or message) and a tag-only annotations helper, and owns the one `UntrustedValueRefusal` → `DecodeRefusal` mapping, so a new refusal is a compile error in core only; a sentinel-value test shows no annotation carries `Malformed.message` or `UnsupportedVersion.version` (INV-QD-104).
  2. Devtools passes `DecodeRefusal` through: `reasonOf` and `MalformedReason` are gone and `onMalformed` receives the refusal.
  3. Audit decodes a row's record once, taking its JSON form from core's strict decode with no re-encode: output is identical on a differential over existing fixtures (unknown envelope key still dropped, key-order permutation, `undefined` fields, a float), a 60,000-deep record is still `TooDeep`, and `Retention` is untouched; `recordJsonOf` and audit's copy of the refusal mapping are deleted, with `UNTRUSTED_DECODE_BUDGET`, its `_NAMES` and the AGENTS.md §7a table agreeing in the same task.
  4. The break is recorded wherever a consumer reads it: the `@qadi/devtools` Breaking changeset with the upgrade map, `upgrading.md`, the devtools README, the website devtools page, the Next.js example's `Dock.tsx`, the `DecisionStreamRoute.ts` comment, BEH-QD-204 and the overview rows.

**Planning notes**: **Research flag: needs `/gsd-plan-phase --research-phase 40`** (the compatibility decision, and the typing of the JSON form returned with the record). Core states no reporter (one consumer; devtools keeps its `Effect.logWarning` adapter with `qadi.frame`). A third restatement exists: `AuditEntry.ts:159-164` repeats `SinkCodec.ts:489-498`. **Plan shape**: the compatibility decision first, with a table pin of the five words on the base and the mutation base; then the describer and annotations in core; then devtools; then audit with the differential rows; then the one budget row that goes away, with AGENTS.md §7a, `[untrusted-decode-table]` and `[untrusted-decode-names]` in the same task; the break recorded in every place DREF-07 lists (also `surface.tst.ts`, `Source.tst.ts` and `26-decision-stream.md`); run `pnpm spec:website-examples` explicitly.
**Plans**: TBD

### Phase 41: One guarded value-to-text function

**Goal**: No devtools panel or session command throws on a bigint or circular value: one guarded value-to-text function is the single way Remedies, Filters and SimulationForm turn an unknown value into text.
**Depends on**: Phase 37 (soft: both touch `SimulationSession.ts`; 41's RED session test targets the final session). No hard edge.
**Requirements**: TEXT-01, TEXT-02, TEXT-03, TEXT-04, WX-01, WX-02, WX-03, WX-04, WX-05, WX-06, WX-07
**Records**: ARCH-88; ADR-QD-154 (Unused if the non-JSON display decision needs only its CCR row); CCR-QD-432; BEH-QD-541 to 545; INV-QD-327 to 328; changeset for `@qadi/devtools` (patch: a fix)
**Opens on** (`checkpoint:decision`):
  1. RED first, on `637c0601`. The defect is reproduced, not hypothetical: research ran the real `remedyEdits` against built core and six probes (`contains(10n)`, `contains(circular)`, `inArray([1n])`, `inArray([circular])`, `eq(literal(1n))`, `eq(literal(circular))`) all throw `TypeError`, which escapes `SimulationSession.commit()` synchronously through `derive` and `sweepPlan`, outside any Effect, so nothing captures it as `Broke`. "Refute and downgrade" is no longer an available outcome.
  2. How a remedy over a non-JSON value is shown (TEXT-04): a degraded label (`10n`, a fixed placeholder, no value content in logs) or skipped with a stated reason. Decided and pinned; BEH-QD-223 is not weakened.

**Success Criteria** (what must be TRUE):
  1. On the phase base, a bigint or circular value through `contains`, `inArray` and `eq(literal)` makes `remedyEdits` and a session command (`setPolicy`, `chooseSight`) throw (RED, in a new test file); after the phase none of them throws.
  2. One package-private total primitive returns `string | undefined` and is never the cause of a throw, including a throwing `toJSON` or getter; its rules are asserted in one test table and nowhere else.
  3. Remedies, Filters and SimulationForm read through it, with no other `JSON.stringify` of an unknown value left in those modules (scoped grep), and their existing outputs are pinned unchanged (bare strings, the word `undefined` in a remedy label, Filters' `[]`, the form's round-trip refusal).
  4. The way a remedy over a non-JSON value is shown is decided and pinned, with BEH-QD-223 intact.

**Planning notes**: **Research flag: standard, skip research-phase** (the language semantics are settled; the work is the RED test and the adapters). Only `Remedies.ts:574` is live (used at `:481`, `:496` and for the size at `:249`); `Inspect.ts`'s `outsideUnion` and `QuestionsPanel.tsx`'s `resourceOf` cannot throw and are not folded in, because folding would change visible output. Filters (`[]`), SimulationForm (`undefined`, then its round-trip check) and Remedies (the word `undefined`) keep thin local mappings over the primitive. Wrap the stringify call (`Result.try` or the existing try/catch precedent), because a throwing `toJSON` or getter is reachable; no blanket catch, no `orDie`. **Plan shape, RED first**: RED tests at two levels (`remedyEdits`, and `makeSimulationSession` with `setPolicy`/`chooseSight`) in a new file, together with the mutation base for the four touched model files; then the primitive and its one test table (bigint, circular, nested bigint, symbol, function, `undefined`, `NaN`, `-0`, null-prototype, throwing `toJSON`, throwing getter) with a per-consumer pinned-output row; then the three consumers; then records; the mutation comparison last.
**Plans**: TBD

### Phase 42: A seeded question builds its own computing atom

**Goal**: The seed-to-evaluation link is either owned by one module and tested through a real atom runtime (no callback that receives a callback), or the human's rejection of that change is recorded with the source untouched; either way anything Phases 37-41 left stale is corrected and the milestone is re-verified at its final head.
**Depends on**: Phase 39 (hard: the shared `HydrationEngine.ts`). Ordering edge to Phases 37-41, whose leftovers the last plan sweeps.
**Requirements**: SEED-01, SEED-02, SEED-03, SEED-04, SEED-05, SEED-06, WX-01, WX-02, WX-03, WX-04, WX-05, WX-06, WX-07
**Records**: ARCH-89; ADR-QD-155 (the rejection ADR if the human rejects; on a go it is Unused unless liveness bookkeeping moves, and then ADR-QD-103, ADR-QD-148 and ADR-QD-149 get amendments); CCR-QD-433; BEH-QD-546 to 550; INV-QD-329 to 330 (INV-QD-028, 105, 317 and 318 have their Source and Enforcement updated on a go); changeset for `@qadi/react` (patch) only if code changes
**Opens on** (human checkpoint, `checkpoint:decision`; the first plan is evidence and options only, no code):
  1. Spike evidence for each option (lines moved, test fakes removed, render-sequence diff, mutation delta; the Phase 35 template) is gathered first. Then one `AskUserQuestion`, and the answer is recorded before any source change. The consolidated options (`SUMMARY.md` R4):
     - **1a, invert in place**: `makeSeededQuestion({ policy, resource, runtime, subject, report, live })` builds its own computing atom in `HydrationEngine.ts` and calls the liveness release itself; `DECISIONS_KEY` and `QadiRuntimeServices` move down (importing back up is a madge cycle, ADR-QD-037).
     - **1b, invert into its own module** `react/src/SeededQuestion.ts` (the architecture research's recommendation): as 1a, and it also moves `DECISION_READ_BUDGET` and its `_NAMES` file keys, AGENTS.md §13 wording and ADR-QD-149's file citation, both directions.
     - **2, a seed holder first**: a first-class `{ seededIn, hold }` per question, handed to the computing atom and to `makeSeededQuestion`; no layering change and no ADR reopened, but the link stays split across two modules.
     - **3, reject**: ADR-QD-155 records it, no source change, and only the liveness rule's three prose statements are reduced to one (at `QuestionBook.ts`'s `BookOptions.build`).
  2. State the ADR conflict as it is: ADR-QD-148 names neither `makeSeededQuestion`, `computedFor` nor `seededIn`; ADR-QD-149 names `makeSeededQuestion` only as the home of the seed (its `WeakMap<SeedGrant, ...>` survives any option); ADR-QD-103 contributes "the atom set is the one adapter" and the liveness-first rule. "Go" needs INV Source and Enforcement updates and text amendments, not an ADR reversal. `effect@4.1.2` neither blocks nor forces the inversion; do not present a nonexistent limitation.

**Success Criteria** (what must be TRUE):
  1. The phase's first plan records spike evidence for each option and the human's decision before any source change.
  2. On a go: `makeSeededQuestion` takes no function that receives a function, the seed-to-evaluation link is tested through a real atom runtime with no fake `computedFor`, and the liveness rule ("`live()` first inside the reader, release in its finalizer") is stated once, with pointers elsewhere.
  3. On a go, every existing pin holds untouched: render sequences, the seed, lifetime and sweep suites, the 30 e2e scenarios (`pnpm example`), INV-QD-028, INV-QD-105, INV-QD-317 and INV-QD-318, and the `maxTrackedQuestions` proofs (StrictMode, `<Activity>`, no leaked fibers, one sweeper per atom set), with no `scheduleTask` or `defaultIdleTTL`. On a reject, ADR-QD-155 records the rejection, no source file changes, and the CCR row names the unused numbers.
  4. A final sweep corrects anything Phases 37-41 left stale (citations, overview module columns, BEH/INV Sources), and the milestone is re-verified at its final head with a mutation re-check of every touched file.

**Planning notes**: **Research flag: needs `/gsd-plan-phase --research-phase 42`, but the human checkpoint is the research.** Stay quiet through stop-hook repeats once the question is asked. **Plan shape, human checkpoint first**: on a go, base both files with the same `--mutate` list (`QadiAtoms.ts` about 0.8966, `HydrationEngine.ts` about 0.9776); real-runtime seam tests before the fakes are deleted (four fake-`computedFor` cases in `HydrationEngine.test.ts`); RED for "no node for an unhydrated question" and "a late seed does not re-run the computation". Timing traps: read the seed through `seededIn(get.registry)`, never `get(grantAtom)` (a new dependency and a re-run); add no second `Atom.readable` (it changes render sequences); `live()` stays first; hand the question the final `keepAlive`/`withEquality` subject atom object, not the pre-pipe base; `WeakMap<SeedGrant, ...>` stays the only seed holder. The SD1-SD5, HL1-HL6, eviction pins and `QadiProvider.test.tsx` render sequences are untouched. `pnpm example` needs Playwright: use CI or the rootless podman route if the host cannot run it. The last plan is the cross-phase stale sweep and a named milestone re-verify.
**Plans**: TBD

### Progress (v1.4)

**Execution Order:**
Phases execute in numeric order: 37 → 38 → 39 → 40 → 41 → 42

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 37. A scoped run that a newer run supersedes | 9/9 | Complete    | 2026-11-14 |
| 38. The sink wire version stated once | 4/4 | Complete    | 2026-11-14 |
| 39. Each hydration drop reason stated once, with its kind | 0/0 | Not started | - |
| 40. Core owns describing a decode refusal | 0/0 | Not started | - |
| 41. One guarded value-to-text function | 0/0 | Not started | - |
| 42. A seeded question builds its own computing atom | 0/0 | Not started | - |
