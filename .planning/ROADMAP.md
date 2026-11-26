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
- ✅ **v1.10 Arch Wave 15** — Phases 81-84 (completed 2026-11-25; not released) — [archive](milestones/v1.10-ROADMAP.md)
- 🚧 **v1.11 Arch Wave 16** — Phases 85-91 (in progress)

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

<details>
<summary>✅ v1.10 Arch Wave 15 (Phases 81-84) — COMPLETED 2026-11-25 (not released)</summary>

- [x] Phase 81: The dock model applies every input whatever a listener throws, ARCH-128 (devtools patch; live defect) (11/11 plans) — completed 2026-11-25
- [x] Phase 82: `QadiProvider`'s registry has one owner for its lifetime, ARCH-129 (react patch; live defect) (10/10 plans) — completed 2026-11-25
- [x] Phase 83: The diagnostics feed folds its reading as a value, ARCH-130 (devtools minor, Breaking) (11/11 plans) — completed 2026-11-25
- [x] Phase 84: `useConfigured` requires `configure`, and the review's small finds, ARCH-131 (devtools patch) (13/13 plans) — completed 2026-11-25

Full details: [milestones/v1.10-ROADMAP.md](milestones/v1.10-ROADMAP.md) · requirements:
[milestones/v1.10-REQUIREMENTS.md](milestones/v1.10-REQUIREMENTS.md) · audit:
[milestones/v1.10-MILESTONE-AUDIT.md](milestones/v1.10-MILESTONE-AUDIT.md)

</details>

## 🚧 v1.11 Arch Wave 16 (Phases 85-91)

### Overview

Wave 16 resolves the seven candidates of the 2026-11-25 architecture review, one phase each, strictly serial, in the order the review ranked them, and every candidate ends in a change or a recorded decision. There is no live defect in this wave and no phase is expected to be Breaking: each phase moves a rule that is written in several places into one place, with the observable behaviour pinned first by a characterisation that is green on the phase base (RED only where a change is named, which is Phase 87's one message inconsistency). Phases 85 and 88 deepen the devtools dock (the hydration block becomes a model row; `StoppedBox` owns the announce-once ledger), 86 gives `QadiProvider`'s registry lifetime a React-free owner, 87 factors the "scoped run that states its stop" out of the timeline, diagnostics and simulation feeds, 89 admits an audit host batch once, 90 moves the remaining per-port facts onto the port description, and **91 goes last by design**: `@qadi/core`, `@qadi/react` and `@qadi/audit` take named barrels as `@qadi/devtools` does (ADR-QD-047), and the visibility-only files fold into the modules that own their concepts, so every earlier phase lands on the file layout it was reviewed against. `.planning/phases/_WAVE16-CONTEXT.md` is authoritative for per-phase evidence (verified against `ac7578f3`), decisions and reserved ids; `.planning/research/` (STACK, FEATURES, ARCHITECTURE, PITFALLS, SUMMARY) is this wave's research and `SUMMARY.md` is the planner's primary input; the review HTML is session-scoped and may be gone. Branch `arch-wave-16`, off `main` at `ac7578f3` (v1.9 and v1.10 merged as #165). No dependency or version changes: every API the wave needs is installed (effect 4.1.2, React 19.3.1, TypeScript 7.0.2).

**The seven phases and their order are fixed (2026-11-25).** Scope (all seven), the Phase 91 fold rule (fold, prove acyclic) and research (run) are the owner's decisions; nothing is added, merged, split or reordered, whatever the `fine` granularity setting would suggest: each review candidate is one phase (D1).

**Standing direction (owner, unchanged):** the cleanest, most complete design wins, not the simplest, and the project is not in production, so compatibility is never the tiebreaker. Nobody is asked: each grey area is decided at its phase's discuss step and recorded there as decided, with the rejected options. No phase is expected to be Breaking (the public surface is 942 exports at the Phase 91 base and the same at its end); Phase 87 is a `@qadi/devtools` patch (the Simulator's broken-run text), and Phase 91 needs a changeset line only if `Hydration.ts` folds through a structural `hydrateDecisions` parameter. The wave-wide changeset policy (a patch per edited public package vs none for package-private moves) is decided once, at Phase 85's discuss step. Nothing is released or published, no version-packages PR is merged, and the branch is not merged and not pushed.

Order: the dock model's hydration row (85), the provider's lifetime owner (86), the feeds' stated-stop run (87), the `StoppedBox` ledger (88), the audit admission step (89), the per-port facts (90), then the named barrels and folds (91). **Execution order: phases run strictly one at a time, in numeric order (85 → 91).** Every records plan edits the same spec registers (CCR tail, invariants, traceability, `index.yaml`, `overview.md`, behaviour docs) and `use_worktrees` is false, so each phase depends on the previous one. **Phases 87, 90 and 91 open with a spike or research plan** (SUMMARY "Research Flags").

**Decisions** (`_WAVE16-CONTEXT.md`, all locked):

| Decision | Phase | What it fixes |
|----------|-------|---------------|
| D1 | all | All seven review candidates become phases (owner, 2026-11-25) |
| D2 | 91 | A visibility-only file folds, including an ADR-QD-037 cycle-breaker, only where `pnpm circular` proves no cycle returns; ADR-QD-037 is amended and the PROJECT.md Out of Scope line it supersedes is removed (owner) |
| D3 | all | Research run; `.planning/research/` is this wave's research (owner) |
| D4 | all | Order 85 → 91, strictly serial: 85 before 88 (both edit `DevtoolsDock.tsx` ≈110-115, 258); 87 before 88 (88 keys on the status identity 87 keeps); 86, 89 and 90 before 91 (91 edits `QadiProvider.tsx` imports, folds `SequenceIntegrity` into `ArchiveFacts`, and names every export 89 and 90 settle) |
| D5 | all | Branch `arch-wave-16` off `main` at `ac7578f3`; no merge, no push, no release |
| D6 | all | Every other choice is decided at its phase's discuss step under the standing instruction (a breaking change is fine with a **Breaking** changeset and an upgrade-guide entry) |

**Grey areas each phase's discuss step decides** (researchers disagree or the spec is silent; `research/SUMMARY.md` "Where the researchers disagree" carries each recommendation):

| Phase | Decided at the discuss step |
|-------|-----------------------------|
| 85 | The view's home (its own derived store, the model's eleventh, vs riding an existing one); `DockFrame`'s status read (an optional selector on `useStoreSnapshot`, precedent `usePaused`, vs a status store); the view's input shape (`{hydration, unsampled}` vs the view taking `status`; activity precedence either way). **Also the wave-wide changeset policy (WX-03)** |
| 86 | One commit effect vs three ordered effects (tie-break: LT6, LT8, LT13, LT16-LT18 stay green unedited); where `AtomsReplaced` identity detection lives (reporting stays in the component) |
| 87 | The feeds' self-interrupt policy (today a self-interrupted timeline or diagnostics run keeps `Reading`/`Live` with nothing running; BEH-QD-519 is silent), characterised first; whether `restart` on a bare timeline feed stays an empty read; rendering `Broke.message` in the `<pre>` treatment `Stopped.reason` has |
| 88 | Relocate the render-phase ref read into the wrapper (recommended) vs remove it (key from a React-held value, or a per-feed model store) |
| 89 | An admitted-rows brand with admission before the `qadi.audit.verifySequenceIntegrity` span vs a plain refusal-or-undefined function with spans unchanged (tie-break: spans unchanged unless the change is pinned and recorded) |
| 90 | Which of span name, serving shape and fixture type move onto the description, decided by plan 1's spike; a pairwise-distinct span-name type check to replace `PortSpanOf<N>`'s cross-check |
| 91 | `Hydration.ts`: a structural `hydrateDecisions` parameter declared in the engine (folds; a public `.d.ts` change with a changeset line) vs keep the file and record the cycle; `EvaluationSpan` stays apart unless `pnpm circular` proves the fold |

**Every phase** carries the seven cross-cutting requirements (WX-01..07): `pnpm check:pr < /dev/null` green at the end of each phase; its ADR (or "Unused" in its CCR row), CCR, BEH/INV and traceability records using only its reserved numbers, never `node scripts/next-id.mjs`; `spec/overview.md` names every added export and drops every removed one (gate 13), and gate 14 probes every changed public signature; no new `as`, `!`, `any`, `switch`, `Effect.fnUntraced`, `async`/`await` in src, ambient `console`/`process.env`/clock, `Record<string, unknown>`, `// Stryker disable` or module-scope `let`, and a budget changes only together with its AGENTS.md table in one commit; coverage held (core at least 95 percent, the others at least 90) and the Stryker score of every touched file re-taken per phase in `NN-mutation-base.json` at the phase base and at close with the same invocation (a `RENAMED` map for folds), a drop closed with a test and never re-baselined, unmeasured React files listed per phase; a characterisation or regression test written on the phase base before any behaviour change (RED for a change, green for preserved behaviour) and every new check shown failing once, with its scratch variant and failing text recorded; no D-numbers, plan-local ids or phase numbers in shipped source, test titles or BDD scenarios, and nothing released, published, pushed or merged. House rules, verify-command hygiene and the Stryker procedure are in `.planning/phases/_SHARED-CONTEXT.md`, overridden where `_WAVE16-CONTEXT.md` says so. A record's plan is the phase's last plan.

**Soft edges** (from `_WAVE16-CONTEXT.md`, `research/SUMMARY.md` and the files each phase edits; serial order covers all of them):

| Edge | Strength | Reason |
|------|----------|--------|
| 85 → 88 | hard | both edit `DevtoolsDock.tsx` (≈110-115 and 258); 85 removes `DockFrame`'s whole-reading subscription before 88 touches the same notice wiring |
| 87 → 88 | hard | `TimelineStatus` and `DiagnosticsStatus` keep their shape through 87 so 88 keys the announce-once ledger on status identity; one reviewer holds "what a stop is" |
| 86 → 91 | ordering | 91 edits `QadiProvider.tsx` imports (and `Hydration.ts`, `GateRegistry.ts`) over the settled provider |
| 89 → 91 | hard | 91 folds `SequenceIntegrity.ts` into `ArchiveFacts.ts`; admission stays out of `ArchiveFacts.ts` and 89's post-review score is 91's mutation base for that file |
| 90 → 91 | hard | 91 names the `Ports.ts` and `PortServing.ts` exports 90 settles |
| 91 last | by design | the biggest behaviour-free diff; it generates barrels from the exports 85-90 leave, so the 942 baseline is the Phase 91 base figure, not a literal |
| all → close | re-verify | later phases make earlier ones stale (85 and 88 share files; 91 moves files 86, 89 and 90 edit), so the milestone close re-verifies and re-runs each phase's record scripts |

**Numbering reserved for v1.11** (the whole block is held in the shared reservation file, `$(git rev-parse --git-common-dir)/qadi-reserved-ids.json`, set to CCR 483, ADR 204, BEH 795, INV 428 on 2026-11-25; never run `node scripts/next-id.mjs` while executing these phases, because every call writes a reservation; name an unused reservation "Unused:" in the phase's CCR row; an amendment of an existing ADR leaves its new ADR number unused and says so; pass `--date 2026-11-25`, or the real date of the edit, to `spec-revise`). Next free on `ac7578f3`: ADR-QD-198, CCR-QD-477, BEH-QD-761, INV-QD-415. Highest ARCH is ARCH-131; ARCH ids below 132 are never reused. ADR Document IDs equal the file number (gate 10).

| Phase | ARCH | ADR-QD | CCR-QD | BEH-QD | INV-QD |
|---|---|---|---|---|---|
| 85 | 132 | 198 | 477 | 761–765 | 415–416 |
| 86 | 133 | 199 | 478 | 766–770 | 417–418 |
| 87 | 134 | 200 | 479 | 771–775 | 419–420 |
| 88 | 135 | 201 | 480 | 776–780 | 421–422 |
| 89 | 136 | 202 | 481 | 781–785 | 423–424 |
| 90 | 137 | 203 | 482 | 786–790 | 425–426 |
| 91 | 138 | 204 | 483 | 791–795 | 427–428 |

**Out of scope** (recorded, not planned): a one-call `run(effect)` for the feeds (ADR-QD-150 rejected it; Phase 87's callback keeps the publish gap); routing `SimulationSession` through `SupersedingRun`'s `onFailure` (it skips interrupt-only causes, so SR1's self-interrupt would sit `Running` forever); merging the two audit refusal unions or error classes (Breaking, and ADR-QD-190 rejected restating the row refusals); deriving `PortName` from `Ports.ts` (closes a madge cycle through every port module, ADR-QD-037); converting the http, testing, predicate-sql, predicate-prisma or promise barrels (not in the review); `export *` as a stepping stone in Phase 91 (makes folded internals public and is invisible to gate 13); a shared child-walk driver for Walk/Predicate (ADR-QD-073); upgrading any dependency; formatting with `oxfmt` (AGENTS.md §17); merge, release or publish. Carried forward as future work: aligning `@qadi/react`'s swallowing gate registry with ADR-QD-177's rethrow contract; structural (deep) identity for feed inputs; exporting the lens session from `@qadi/devtools`' barrel; the upstream `@effect/atom-react` `RegistryProvider`, which has the same dispose-in-cleanup shape as the defect v1.10 Phase 82 fixed; `HydrationEngine`'s tests consolidated onto the public seam.

### Phases

- [x] **Phase 85: The dock's hydration block is a model row** - A pure hydration view (Pending / Unwired / Counts, text worked out) is served by the dock model, `QuestionsPanel` renders its tag and decides nothing, and `DockFrame` stops subscribing to the whole reading to pass one field (ARCH-132, devtools) (completed 2026-11-25)
- [x] **Phase 86: `QadiProvider`'s registry lifetime has a React-free owner** - Create, seed, subject write, recycle and the lease live in one headless module tested with an injected defer; the component keeps one ref and forwards (ARCH-133, react) (completed 2026-11-25)
- [x] **Phase 87: One scoped run that states its stop** - Publish-then-fork, the stop rule, `restart`, the closed guard and the configure prologue are stated once above `SupersedingRun`; a dying simulation run reports the same stop text as the feeds (ARCH-134, devtools; opens with a RED test and a spike) (completed 2026-11-25)
- [x] **Phase 88: `StoppedBox` keys itself and owns the announce-once rule** - Callers stop computing `stoppedKey` from a ref during render; the ledger transition is a pure function, decided at mount and recorded at commit (ARCH-135, devtools react) (completed 2026-11-26)
- [ ] **Phase 89: One admission step for a host's audit batch** - `now`, rows and the caller's terms are checked once for `archiveAuditTrail`, `planRetention`, `verifiedArchiveFacts` and `planPurge`; `NowNotFinite` is stated once (ARCH-136, audit)
- [ ] **Phase 90: The remaining per-port facts live on the port description** - Span name, serving shape and fixture data type move onto the description as a spike allows, `PortName` stays a leaf, and `readScoped` routes off the `LEAF_NEEDS` row (ARCH-137, core; opens with a spike)
- [ ] **Phase 91: Named barrels, and visibility-only files folded away** - `@qadi/core`, `@qadi/react` and `@qadi/audit` name their exports per module, and each visibility-only file folds into its owner only where `pnpm circular` proves no cycle returns (ARCH-138, core / react / audit; opens with a surface-diff tool and a madge simulation)

### Phase Details

### Phase 85: The dock's hydration block is a model row

**Goal**: The dock model serves the hydration block as one pure view, so the Pending / Unwired / Counts decision and each "unsampled" decision are made in one place, `QuestionsPanel` renders the view's tag and decides nothing, and `DockFrame` no longer subscribes to the whole merged reading to pass one field along.
**Live defect**: no.
**Breaking**: no (`@qadi/devtools`; the dock model is package-private and no export is expected to change; the changeset policy for the wave is decided here). Amends ADR-QD-185 if the view is a fifth derived store.
**Depends on**: Nothing in v1.11 (first phase; serial order).
**Requirements**: HYDV-01, HYDV-02, HYDV-03, HYDV-04, HYDV-05. Cross-cutting: WX-01, WX-02, WX-03, WX-04, WX-05, WX-06, WX-07
**Packages**: `@qadi/devtools` (a new `model/HydrationView.ts` beside `PortCards.ts`, `model/DockModel.ts`, `react/QuestionsPanel.tsx`, `react/DevtoolsDock.tsx`'s `DockFrame`, the two `QuestionsPanel` HTML-string tests, `ConfigureRule.test.ts` and `DockModel.listeners.test.ts` store-name pins, `spec/behaviors`, a changeset per the policy)
**Records**: ARCH-132; ADR-QD-198 (new, or ADR-QD-185 amended and 198 named unused); CCR-QD-477; BEH-QD-761 to 765 (BEH-QD-700, 699 and 735 restated, BEH-QD-218's table gains a hydration row); INV-QD-415 to 416 (INV-QD-390 amended)
**Evidence** (`_WAVE16-CONTEXT.md`, at `ac7578f3`): `QuestionsPanel.tsx:112` calls `isUnsampled(diagnostics.status)`, and `Hydration` (346-368) and `Counts` (371-420) decide Pending, Unwired and Counts and work out the rate sentence, the raised-drops filter and the unaccounted scope text in the component. `DockModel.ts` 383-409: the questions store keys `unsampled: supplied === undefined && isUnsampled(status)` (≈391) and the services store keys `unsampled: isUnsampled(status)` (≈405). `DevtoolsDock.tsx:112` subscribes `DockFrame` to the merged diagnostics snapshot and `:258` passes `shown.hydration` to one tab; INV-QD-411 keeps the reading's identity when nothing moved. Precedent: `PortCards.ts` and ADR-QD-168. Store-name pins: `ConfigureRule.test.ts:583`, `DockModel.listeners.test.ts:64`.

**Success Criteria** (what must be TRUE):
  1. A characterisation written on the phase base is green there and after: it pins every state of the hydration block the panel renders today (Pending, Unwired, Counts with its rate sentence, the raised-drops filter, the unaccounted scope text, activity over status, and the "0 dehydrated entries" wording), with the two `QuestionsPanel` HTML-string files as the byte oracle, and every `data-testid` is unchanged (HYDV-01, HYDV-04).
  2. A pure hydration view returns a closed tagged union (Pending / Unwired / Counts, the text worked out) beside `portCards`, is tested as a table under `src/model/` and the devtools mutation gate, and no JSX enters `model/` (HYDV-02).
  3. The dock model serves the view keyed per field, so a repeated identical reading publishes nothing; the three distinct "unsampled" predicates (questions with `supplied === undefined`, services unguarded, hydration with activity precedence) each stay as they are, stated once each and not flattened into one (HYDV-03).
  4. `QuestionsPanel` renders the view's tag and decides nothing, and `DockFrame` no longer subscribes to the whole merged reading to pass `hydration` along: it keeps only what its notice needs, the status (HYDV-04).
  5. ADR-QD-198 (or ADR-QD-185 amended with 198 named unused), BEH-QD-700, 699 and 735, INV-QD-390, BEH-QD-218's table and the store-name pins are restated in the same change (HYDV-05).

**Planning notes**: Standard patterns (precedent ADR-QD-168 and ADR-QD-185); plan 1 is the characterisation, using the two HTML-string files and writing the cells they lack. The discuss step decides the view's home, `DockFrame`'s status read and the view's input shape (grey-area table), and the wave's changeset policy. Constraints that are findings: the derived key compares identity per field and the fold keeps references (never a fresh spread); the static Unwired advice stays a panel constant, so no JSX enters `model/`; the "0 dehydrated entries" plural is pinned, not fixed; no fourth "nothing hydrated" state; activity precedence is kept. If the view is the eleventh store, the "eleven" count, CR22 and the store-name sweeps move with it. Stryker: `stryker.devtools.mjs` measures the new view under `model/**` with its own bar; `QuestionsPanel.tsx` and `DockFrame` are unmeasured, so list them in `UNMEASURED` and prove them with scratch variants. Phase 88 edits the same `DevtoolsDock.tsx` lines, which is why 85 goes first.
**Plans**: 11/11 plans complete

Plans:
- [x] 85-01 (W1): The phase base and the mutation base of the dock model recorded; the hydration block characterised on the base, cells H1 to H13, each seen failing
- [x] 85-02 (W2): The phase check helper (`85-check.mjs`): ids, forbidden constructs, trailers, no React in the model, the three predicates, the panel deciding nothing, the frame reading the status, the records; each check seen failing
- [x] 85-03 (W3): The pinned-test check (18 held files, the born characterisation, the one declared panel-test edit) and the earlier-phase checks against a measured ledger
- [x] 85-04 (W4): `HydrationView.ts`, the block as a pure closed view, tested as a table (V1 to V17) and pinned closed by type tests, with its own mutation probe
- [x] 85-05 (W5): The dock model serves the view as its eleventh store, keyed per field over the shown reading; the store-name pins (CR22, DL21, the member list) move with it
- [x] 85-06 (W6): The hydration store's identity (an identical poll publishes nothing, activity over status, status outside the key) and its place in the listener aggregate pinned, each seen failing
- [x] 85-07 (W7): `QuestionsPanel` renders the view's tag and decides nothing, every byte and test id held; the panel's hydration tests become one render test per tag
- [x] 85-08 (W8): `DockFrame` reads the poll's status alone through `useDiagnosticsStatus`; a reading-only poll commits nothing under the dock (R1 to R3)
- [x] 85-09 (W9): ADR-QD-198, BEH-QD-761 to 765, INV-QD-415 and 416, the restated store records and the three registers, in one commit (CCR-QD-477)
- [x] 85-10 (W10): The Stryker close of the dock model and the view compared with the base, the devtools changeset, every phase check on the finished tree
- [x] 85-11 (W11): `pnpm check:pr` and `pnpm spec:package` green at the close, each alone; HYDV-01 to HYDV-05 complete; nothing released

**UI hint**: no (the panel renders the same markup, copy and test ids; the decision moves out of it)

### Phase 86: `QadiProvider`'s registry lifetime has a React-free owner

**Goal**: One package-private, React-free owner holds the registry's lifetime (create, seed the subject and `initialValues`, write the subject, recycle, hold and release the lease), tested with an injected `defer` and no rendering, while `QadiProvider` keeps one ref and forwards hold, release and subject changes.
**Live defect**: no (Phase 82 fixed the live defect; this moves the wiring that hid it out of the component).
**Breaking**: no (`@qadi/react`; no public export changes; the changeset follows the wave's policy). Amends ADR-QD-195, keeping its hold/defer semantics.
**Depends on**: Phase 85 (serial order only; `@qadi/react` and `@qadi/devtools` share no source).
**Requirements**: PREG-01, PREG-02, PREG-03, PREG-04, PREG-05. Cross-cutting: WX-01, WX-02, WX-03, WX-04, WX-05, WX-06, WX-07
**Packages**: `@qadi/react` (`QadiProvider.tsx`, a new package-private owner beside `RegistryLease.ts`, `stryker.react.mjs`, `packages/react/test`, `spec/behaviors/09-react.md`, `appendices/react-integration.md`, a changeset per the policy)
**Records**: ARCH-133; ADR-QD-199 (new, or ADR-QD-195 amended and 199 named unused); CCR-QD-478; BEH-QD-766 to 770; INV-QD-417 to 418
**Evidence** (`_WAVE16-CONTEXT.md`, at `ac7578f3`): `QadiProvider.tsx` is 359 lines with seven effect hooks and refs at ≈228, 259, 269 and 314; `RegistryLease.ts` is 85 lines, pure, takes an injected `defer` and is already in `stryker.react.mjs`. ADR-QD-195's context lists the bugs that lived in the wiring (a second registry built while hidden; a disposed registry on reveal), so the wiring is where the lifetime rule's risk sits.

**Success Criteria** (what must be TRUE):
  1. The existing lifetime suites (LT1-LT18, RL1-RL10 and the `QadiProvider.*.test.tsx` files) pass unedited across the phase, and a characterisation of create, seed, subject write, recycle and atoms-replaced was written on the base before anything moved (PREG-01).
  2. The owner has no React import, is inert at construction (only `release` calls `defer`) and is in `stryker.react.mjs`; tested without rendering against a real `AtomRegistry` and an injected `defer`, it never runs a recycle it did not schedule, cancels once, recycles nothing when a run follows a cancel, and recycles exactly once on a long hide and re-seeds from the latest props before any read, each "recycles nothing" test with a "recycles once" twin that fails if the recycle is removed (PREG-02, PREG-03).
  3. `QadiProvider` keeps one lifetime ref, forwards hold, release and subject changes, holds no branch of lifetime logic and keeps its effect order (commit before hold, hold last): a provider hidden in `<Activity>` past a macrotask and shown again still renders its decision with no disposed-registry throw, and every alternative ADR-QD-195 rejected stays rejected (PREG-04).
  4. ADR-QD-199 (or ADR-QD-195 amended with 199 named unused), BEH, INV and traceability record the owner, and the render suite shrinks to StrictMode, `<Activity>` and SSR smoke tests only where the owner's tests now hold the property (PREG-05).

**Planning notes**: Standard patterns (precedent ADR-QD-195 and `RegistryLease`); add before deleting, and open with the characterisation. The discuss step decides one commit effect vs three ordered effects and where `AtomsReplaced` detection lives (tie-break: LT6, LT8, LT13 and LT16-LT18 stay green and unedited). Constraints that are findings: `reset`, never `dispose`; seeds and `initialValues` are not re-applied beyond what ADR-QD-195 says; no registry in state or an effect; no `scheduleTask`/`defaultIdleTTL` (AGENTS.md §13, ADR-QD-148); no module-scope `let` (`MODULE_STATE_BUDGET` stays 1); checks that cannot fail are the risk (a one-tick hide-and-show, a fake `defer` nobody asserts on), so every check names the scratch variant that turns it RED. Stryker: add the owner to `stryker.react.mjs` (update its header and covering-tests comment); `QadiProvider.tsx` stays unmeasured and branch-free; if `RegistryLease.ts` is renamed or folded, run `stryker.react.mjs` once (Stryker's behaviour on a missing explicit `mutate` path is unverified).
**Plans**: 8/8 plans complete

Plans:
- [x] 86-01 (W1): The phase base and the mutation base of the registry lease recorded first; the provider registry characterised on the base, cells C1 to C9, each seen failing; every react test and the lease held by the pinned check
- [x] 86-02 (W2): The phase check helper (`86-check.mjs`): ids, forbidden constructs, the exact trailer, the owner's shape, a provider that only forwards, the records; each check seen failing
- [x] 86-03 (W3): The earlier-phase checks (Phase 82's `single-owner` with its recorded after-state, Phase 85's) against a measured ledger, seen failing
- [x] 86-04 (W4): `RegistryOwner.ts`, the React-free owner, in `stryker.react.mjs`; headless rows RO1 to RO16 (twins, the refresh difference) each seen failing; its Stryker probe clean
- [x] 86-05 (W5): `QadiProvider` forwards to the owner: one owner ref, the commit effect first, hold and release last; every test unedited and green; the forwarding check seen failing on the rewired provider
- [x] 86-06 (W6): ADR-QD-199 with the render-suite audit (0 removed), ADR-QD-195 amended, BEH-QD-766 and 767, INV-QD-417 and 418, the restated records and the registers, in one commit (CCR-QD-478)
- [x] 86-07 (W7): The Stryker close of the lease and the owner compared with the base, the react changeset, every phase check on the finished tree
- [x] 86-08 (W8): `pnpm check:pr` and `pnpm spec:package` green at the close, each alone; nothing released; no requirement ticked

**UI hint**: no (behaviour only; the provider renders the same tree)

### Phase 87: One scoped run that states its stop

**Goal**: One package-private "scoped run that states its stop" sits above `SupersedingRun` and owns publish-then-fork through a callback, failure to `Stopped(causeMessage)`, `restart`, the closed guard and the token-guarded sink; `TimelineFeed`, `DiagnosticsFeed` and `SimulationSession` supply only their engine and states, and `GatesFeed` shares the configure prologue.
**Live defect**: no. `String(exit.cause)` never throws; the session's message (`Cause([Die(...)])`) is an inconsistency with the feeds' `causeMessage` text, not a defect.
**Breaking**: no (`@qadi/devtools` patch: the Simulator's broken-run message text changes). Answers ADR-QD-150 point 2 as an application of it, not a reversal.
**Depends on**: Phase 86 (serial order only; `@qadi/react` and `@qadi/devtools` share no source).
**Requirements**: STOP-01, STOP-02, STOP-03, STOP-04, STOP-05. Cross-cutting: WX-01, WX-02, WX-03, WX-04, WX-05, WX-06, WX-07
**Packages**: `@qadi/devtools` (`model/SupersedingRun.ts` loses only `ForkHooks.onFailure`, which has no caller after the move (decided after research, 87-CONTEXT D-09); a new module above it, `model/TimelineFeed.ts`, `model/DiagnosticsFeed.ts`, `model/GatesFeed.ts`, `model/SimulationSession.ts`, `test/builtFeeds.ts`, their tests, `spec/behaviors`, a `@qadi/devtools` patch changeset); `@qadi/core`'s `ThrownMessage.ts` doc is amended
**Records**: ARCH-134; ADR-QD-200 (new; applies ADR-QD-150 point 2, extends ADR-QD-182 decision 10 to the session, amends ADR-QD-192 and 194 and the `ThrownMessage.ts` doc); CCR-QD-479; BEH-QD-771 to 775; INV-QD-419 to 420
**Evidence** (`_WAVE16-CONTEXT.md`, at `ac7578f3`): near-copies across the feeds: the status union with `Stopped{causeMessage}` (TimelineFeed 39-51, DiagnosticsFeed 44-61), the readout and the ADR-QD-194 rethrow paragraph (TF 62-73, DF 97-111), the idle readouts (TF 138-153, DF 122-137), the token-guarded sink (TF 175-180, DF 186-199), publish-then-fork (TF 182-188, DF 202-212, `SimulationSession` 446-453), the closed-guarded restart (TF 192-194, DF 231-233) and the configure prologue (TF 199-205, DF 221-226, `GatesFeed` 280-286). `SimulationSession.ts:418` sets `message: String(exit.cause)`. Build-then-configure is written five times (`test/builtFeeds.ts` 16-28 ×4 and `useConfigured.ts:34`). `Effect.fork` does not exist in effect 4.1.2: the "fork" is `SupersedingRun.fork`.

**Success Criteria** (what must be TRUE):
  1. A test written on the phase base is RED there and GREEN after: a `SimulationSession` run that dies reports `Broke.message` equal to `causeMessage(cause)` (today `String(exit.cause)`), with a hostile-value case; and a characterisation pins each feed's current status sequence, including what a self-interrupt does today (the session reads `Broke`, SR1) (STOP-01).
  2. One module above `SupersedingRun` owns publish-then-fork through a callback (a listener's throw on the start-up publish is rethrown after the new run has started, ADR-QD-194), failure to stopped with `causeMessage`, `restart`, the closed guard and the token-guarded sink, and `TimelineFeed` and `DiagnosticsFeed` supply only their engine and states (STOP-02).
  3. The configure prologue (closed guard, normaliser, identity gate) is stated once with a parameterised gate, used by the timeline, diagnostics (`sameFieldsOrAbsent`) and gates (`watchFailure` retry) feeds, and `GatesFeed` still forks before it publishes (INV-QD-408) (STOP-03).
  4. `SimulationSession` shares publish-then-fork and the stop-message rule and keeps its own exit read, so a self-interrupted run still reads `Broke`; the feeds' self-interrupt behaviour is decided and pinned (kept or changed, with its own test and ADR line) (STOP-04).
  5. ADR-QD-200 applies, and does not reopen, ADR-QD-150 point 2 and extends ADR-QD-182 decision 10 to the session; ADR-QD-192, ADR-QD-194 and the `ThrownMessage.ts` doc are amended in the same change; the per-feed tests (TF21-23, TF28, F28-31, F33, SR5-6) stay unedited; a `@qadi/devtools` patch changeset records the Simulator text change (STOP-05).

**Planning notes**: **Research flag: plan 1 is a spike plus the RED test** (`/gsd-plan-phase --research-phase 87`); several valid shapes exist and the self-interrupt behaviour must be characterised before a policy is chosen. Constraints that are findings: the session keeps `Effect.exit` in the run body (routing it through `onFailure` skips interrupt-only causes and leaves SR1 `Running` forever); `GatesFeed` forks before it publishes, so it shares only the prologue (three prologue rules exist: closed guard first; `sameFieldsOrAbsent` for diagnostics' absent options; `sameFields && watchFailure === undefined` for gates); `try { publish } finally { fork }` stays inside the shared helper; no named `Effect.fn` or `Effect.fnUntraced` on the factory (`UNTRACED_BUDGET`); `land` keeps `root: true`; `Broke` and `GatesSnapshot` shapes are unchanged. Add the row nobody has: a publish that throws and a superseding command from the same listener. Render `Broke.message` in the same `<pre>` treatment as `Stopped.reason` if the discuss step takes it. Stryker: `stryker.devtools.mjs` over `SupersedingRun`, the three feeds, `SimulationSession`, `GatesFeed` and the new module; re-take the base first.
**Plans**: 11/11 plans complete

Plans:
- [x] 87-01 (W1): The phase base and the touched files' mutation base recorded first; the spike re-run on the base; SX1 to SX3 and SB2 to SB4 (the broken simulation run) and TX1, TX2, DX1, DX2 (the feeds' self-interrupt) red on the base; SB1, TX3 to TX7 and DX3 to DX7 green and seen failing
- [x] 87-02 (W2): Twelve stated-run cells SC1 to SC12 green on the base (the bare restart, the throw-and-supersede rows, the landed session result), each seen failing; the pinned-test check holding every devtools test but the two declared files; the base facts
- [x] 87-03 (W3): The phase check (`87-check.mjs`): ids, forbidden constructs, the exact trailer, the suite judge for the open red rows, seven shape modes for the moved code, the records; each mode seen failing
- [x] 87-04 (W4): The earlier-phase checks (Phase 85's and 86's) from scratch copies against a measured ledger, seen failing
- [x] 87-05 (W5): `StatedRun.ts` (publish-then-fork, the one stop rule, the closed and token guards) with ST1 to ST17, and `ConfigurePrologue.ts` with CP1 to CP8, each row seen failing
- [x] 87-06 (W6): The timeline and diagnostics feeds supply only their engine and states (TX1, TX2, DX1, DX2 green); all three feeds configure through the prologue, gates still forking before it publishes
- [x] 87-07 (W7): The session on the stated run, `Broke.message` in `causeMessage` text with its `Running` guard (SX green); the Simulator's labelled `<pre>` with the reason style moved to the theme (SB green); the suite green
- [x] 87-08 (W8): `ForkHooks.onFailure` removed with the audited protocol rows (R9 removed; R3, R5 to R7 edited and seen failing); one build-then-configure helper; both declared edits applied
- [x] 87-09 (W9): ADR-QD-200 with the audit table, BEH-QD-771 to 775, INV-QD-419 and 420, the restated records and the moved INV-QD-313 anchor, ADR-QD-047/150/182/192/194/196 and the `ThrownMessage.ts` doc amended (CCR-QD-479)
- [x] 87-10 (W10): The Stryker close of the touched files and the two born modules compared with the base, coverage, the two patch changesets, every phase check on the close head
- [x] 87-11 (W11): `pnpm check:pr` green at the close, run alone; nothing released; every commit trailed and in scope

**UI hint**: no (headless run; the Simulator's broken-run text changes, with no markup or style change)

### Phase 88: `StoppedBox` keys itself and owns the announce-once rule

**Goal**: `StoppedBox` derives its own key and owns the announce-once ledger, so callers stop computing `stoppedKey` from a ref during render and stop threading the ledger through private bindings, while a stop is still announced once per stop.
**Live defect**: no.
**Breaking**: no (`@qadi/devtools`; the prop type names stay; the changeset follows the wave's policy). Amends ADR-QD-197.
**Depends on**: Phase 87 (hard: 88 keys on the status identity 87 keeps; 85 also edits `DevtoolsDock.tsx`).
**Requirements**: SBOX-01, SBOX-02, SBOX-03, SBOX-04. Cross-cutting: WX-01, WX-02, WX-03, WX-04, WX-05, WX-06, WX-07
**Packages**: `@qadi/devtools` (`react/StoppedBox.tsx`, `react/TimelineNotice.tsx`, `react/DiagnosticsNotice.tsx`, `react/useStopNotice.ts`, `react/DevtoolsDock.tsx`'s `DockFrame`, a pure ledger function under `model/` if the discuss step takes it, their tests, `spec/behaviors`)
**Records**: ARCH-135; ADR-QD-201 (new, or ADR-QD-197 amended and 201 named unused); CCR-QD-480; BEH-QD-776 to 780; INV-QD-421 to 422
**Evidence** (`_WAVE16-CONTEXT.md`, at `ac7578f3`): `StoppedBox.tsx` has `stoppedKey` (48-50) and writes the ledger in its layout effect (130-134); the callers are `TimelineNotice.tsx:33` and `DiagnosticsNotice.tsx:85`, the ref lives in `useStopNotice.ts`, and both notices thread `announced` through a private `Binding`. The review rates this candidate speculative, so the phase stays narrow.

**Success Criteria** (what must be TRUE):
  1. A characterisation written on the phase base pins the announce-once behaviour: a stop is announced once per stop, not again on a tab switch and not lost under StrictMode, including TN14, D7 and the `DockFrame` stop characterisation (SBOX-01).
  2. `StoppedBox` derives its own key and writes the ledger (an outer keyed wrapper over an inner body), so callers no longer call `stoppedKey` or thread the ledger ref through private bindings, and the ledger stays above the screens, one per feed, so it outlives tab switches (SBOX-02).
  3. The ledger transition is a pure function with a table test; the alert is decided at mount and recorded at commit, never written during render, and no ledger lives at module scope (SBOX-03).
  4. ADR-QD-201 (or ADR-QD-197 amended with 201 named unused), BEH, INV and traceability record the change, the unmeasured React files are listed in the phase's `UNMEASURED`, and each is proved with a scratch variant (SBOX-04).

**Planning notes**: Standard patterns (small; precedent ADR-QD-197). The discuss step decides to relocate the render-phase ref read into the wrapper (recommended; an opaque ledger closure) or remove it; a `WeakMap` is rejected because it changes what "announced" means for a never-mounted stop. Constraints that are findings: the ledger is never inside the box or a screen (every tab switch would re-announce); one ref per feed, not one for both; no memo keyed on `status` alone; no write during render (StrictMode loses the alert in dev and a discarded render would record a stop that never committed); no `role="alert"` added to a mounted element; no module-scope ledger (`MODULE_STATE_BUDGET`). Stryker: no config reaches `src/react`, so the one real decision (the ledger transition) goes into a pure function with a table test, ideally under `model/`, and the rest is `UNMEASURED` and proved with scratch variants.
**Plans**: 10/10 plans complete

Plans:
- [x] 88-01 (W1): The phase base and the mutation base (nothing measured is touched, the ledger module born) recorded first; A1 to A5 through the dock, plain and StrictMode, and H1 to H3 and C1 through the hook, green on the base and each seen failing
- [x] 88-02 (W2): The phase check (`88-check.mjs`): ids and phrases, forbidden constructs, the exact trailer, vitest and the suite judge, two shape modes for the box and the ledger module, the records; each mode seen failing
- [x] 88-03 (W3): The pinned-test check: every devtools test held but five declared files changed inside named regions, the dock and both barrels held, three born files held from their adding commits; seen failing
- [x] 88-04 (W4): The earlier-phase checks (Phases 85, 86 and 87) from scratch copies against a measured ledger, 87's pinned report computed and explained by named 88 commits; seen failing
- [x] 88-05 (W5): `StopLedger.test.ts` (L1 to L6, LAW1 to LAW3) seen red before the module exists, the run recorded with the test blob; `model/StopLedger.ts` written to it; each law seen failing under a module variant; test and module committed together
- [x] 88-06 (W6): The box keys itself, decides at mount and records at commit through a per-feed `useReducer`; the notices hand it the notice whole; the declared test edits, the Simulator reason comparison and the surface refusals; every phase check green
- [x] 88-07 (W7): The scratch variants V1 to V10, H3, VN1 and VN2 over the unmeasured React files, each recorded with the rows it fails
- [x] 88-08 (W8): The Stryker close of `model/StopLedger.ts` (every mutant killed, static ones examined), coverage, the patch changeset, every phase check on the close head
- [x] 88-09 (W9): ADR-QD-201 with its audit table, BEH-QD-776 to 780, INV-QD-421 and 422, BEH-QD-759 restated and BEH-QD-509 linked, ADR-QD-197 amended (CCR-QD-480)
- [x] 88-10 (W10): `pnpm check:pr` green at the close, run alone; nothing released; every commit trailed and in scope

**UI hint**: no (the announced alert and its test ids are unchanged; only where the key and ledger live moves)

### Phase 89: One admission step for a host's audit batch

**Goal**: A host's audit batch (`now`, rows, key material or max age) is admitted by one package-private step shared by `archiveAuditTrail`, `planRetention`, `verifiedArchiveFacts` and `planPurge`, and `NowNotFinite` is stated once.
**Live defect**: no.
**Breaking**: no (`@qadi/audit`; both public refusal unions, both error classes and every tag and member are unchanged, and `SCHEMA_ERROR_BUDGET` stays 12). Keeps ADR-QD-190's `RowsRefusalCases`.
**Depends on**: Phase 88 (serial order only; `@qadi/audit` shares no source with `@qadi/devtools`).
**Requirements**: ADMIT-01, ADMIT-02, ADMIT-03, ADMIT-04, ADMIT-05. Cross-cutting: WX-01, WX-02, WX-03, WX-04, WX-05, WX-06, WX-07
**Packages**: `@qadi/audit` (a new package-private admission module beside `ArchiveFacts.ts`, `Retention.ts`, `AuditArchive.ts`, `CodecMade.ts` unchanged as an import-free leaf, `test/ForeignRows.test.ts`, a type pin, `spec/behaviors`, a changeset per the policy)
**Records**: ARCH-136; ADR-QD-202 (new, or ADR-QD-190 amended and 202 named unused); CCR-QD-481; BEH-QD-781 to 785 (BEH-QD-722 restated); INV-QD-423 to 424
**Evidence** (`_WAVE16-CONTEXT.md`, at `ac7578f3`): `ArchiveFacts.ts:139` holds `ArchiveInputRefusal.NowNotFinite`, `Retention.ts:49` holds `RetentionInputRefusal`, and `AuditArchive.ts:185` checks its own batch; `test/ForeignRows.test.ts` (468 lines) re-tests the check order per entry point. The check order is BEH-QD-722; row refusals are already shared through `RowsRefusalCases` (ADR-QD-190).

**Success Criteria** (what must be TRUE):
  1. A characterisation written on the phase base pins, for each entry point (`archiveAuditTrail`, `planRetention`, `planPurge`, `verifiedArchiveFacts` and the public verify), which refusal wins for every pair of faults, and the spans each opens on a refusal (ADMIT-01).
  2. One package-private admission step checks a host batch in the order the characterisation pins, every entry point calls it first, it is a plain function with no new span, and `CodecMade.ts` stays an import-free leaf (ADMIT-02).
  3. `NowNotFinite` is stated once, as a fragment shared into both public refusal unions as `RowsRefusalCases` is, and both unions, both error classes, every tag and every member are unchanged; a type pin that can fail proves each union equals its fragments plus its own members (ADMIT-03).
  4. The check order is tested once, at the admission step, and `ForeignRows.test.ts` keeps one case per entry point proving it calls the step rather than re-testing the order (ADMIT-04).
  5. ADR-QD-202 (or ADR-QD-190 amended with 202 named unused), BEH-QD-722 and the invariant and traceability rows record the step (ADMIT-05).

**Planning notes**: Standard patterns (precedent ADR-QD-190's `RowsRefusalCases`). The discuss step decides a brand (admission before the `qadi.audit.verifySequenceIntegrity` span, so a refused public verify no longer opens it) vs a plain refusal-or-undefined function with spans unchanged; the tie-break is spans unchanged unless the change is pinned and recorded. Constraints that are findings: the order is per entry point, not one flat "now, rows, then terms" (key material against rows and max age against rows would change which refusal wins); no `Effect.fn` admission (it adds a span and makes `planRetention` effectful); the step is not exported (gate 13); keep `Number.isFinite` (not `isFinite`), `-0`, `+Infinity` `maxAgeMs` and key material read once; admission stays out of `ArchiveFacts.ts`, which Phase 91 folds `SequenceIntegrity.ts` into. Stryker: `stryker.audit.mjs` (a glob); the new file is under the floor from day one; record 89's post-review score as 91's base for `ArchiveFacts.ts`.
**Plans**: TBD

**UI hint**: no (library behaviour only)

### Phase 90: The remaining per-port facts live on the port description

**Goal**: The per-port facts that are still tables outside the port description (span name, serving shape and fixture data type, as the spike allows) move onto it, `PortName` stays an import-free leaf holding one tuple with everything else derived from the descriptions, and `readScoped` routes off the `LEAF_NEEDS` row so its `resourceId` column does real work.
**Live defect**: no.
**Breaking**: no (`@qadi/core`; served and wire bytes, metric ids and descriptions, and span names are unchanged; the changeset follows the wave's policy). Amends ADR-QD-163 D-06 and ADR-QD-094.
**Depends on**: Phase 89 (serial order only; `@qadi/core` and `@qadi/audit` share no source).
**Requirements**: PFACT-01, PFACT-02, PFACT-03, PFACT-04, PFACT-05. Cross-cutting: WX-01, WX-02, WX-03, WX-04, WX-05, WX-06, WX-07
**Packages**: `@qadi/core` (`PortName.ts`, `Ports.ts`, `PortServing.ts`, `PortMetrics.ts`, `PortAccess.ts`, the five port modules' descriptions, `LeafNeeds.test.ts`, `PortServing.tst.ts`, `spec/behaviors`, AGENTS.md §3 prose, a changeset per the policy)
**Records**: ARCH-137; ADR-QD-203 (new; amends ADR-QD-163 D-06 and ADR-QD-094, with a dated ADR-QD-114 note if `PortServing` stops being hand-written); CCR-QD-482; BEH-QD-786 to 790 (BEH-QD-445's annotate-before-fail order held); INV-QD-425 to 426
**Evidence** (`_WAVE16-CONTEXT.md`, at `ac7578f3`): per-port tables sit in `PortName.ts` (`PortSpans`), `Ports.ts` (`PortTypes`, `PORTS`, `PortFixtureData`, `PORT_FIXTURES`), `PortServing.ts` and `PortMetrics.ts` (`PredicatePortName`); `PortAccess.ts` ≈222-247 holds `ScopedPort` and `completeRequest`, and ≈397 and ≈496 choose `isResourceScoped(leaf) ? readScoped : readPort`. `LEAF_NEEDS.resourceId` is read only by `LeafNeeds.test.ts:137` (ADR-QD-163 D-06). `PortName` derived from `Ports.ts` closes a madge cycle through every port module (ADR-QD-037).

**Success Criteria** (what must be TRUE):
  1. Plan 1 is a spike on the phase base: a `pnpm circular` simulation of each proposed derivation and the benchmark gate for routing `readScoped` off `LEAF_NEEDS`; its verdict decides which facts move, a recorded subset is an acceptable outcome and a cycle is not (PFACT-01).
  2. `PortName.ts` stays an import-free leaf holding one tuple, and every other per-port table the spike clears (span names, fixture data type, serving shape, `PORT_NAMES_BY_NAME`, `ScopedPort`) is derived from the descriptions or the tuple, with registry order preserved so no metric key moves (ADR-QD-052) (PFACT-02).
  3. `readScoped` routes off the `LEAF_NEEDS` row: an id is required only where the row says so (a by-scope leaf only at `Resource` scope, so a scope-`Any` decision is not wrongly denied), it stays a plain function with no new span, dispatches with a hoisted `Match` and never a `switch`, and holds the annotate-before-fail order (BEH-QD-445); the tying test is replaced, not deleted (PFACT-03).
  4. A golden of `tabulatePorts`, a metric snapshot and the served and wire bytes are pinned on the base and unchanged after, `PortServing.tst.ts` passes unedited, and a fake sixth port without its facts is a compile error (PFACT-04).
  5. ADR-QD-203 records the change, amending ADR-QD-163 D-06 and ADR-QD-094 (with a dated ADR-QD-114 note if `PortServing` stops being hand-written), and AGENTS.md §3 prose, BEH, INV and traceability move with it (PFACT-05).

**Planning notes**: **Research flag: plan 1 is a spike** (`/gsd-plan-phase --research-phase 90`); the derivation is unproven acyclic, the benchmark gate (`pnpm bench`, 3+3 interleaved, median of per-run minima) must run before `readScoped` changes, and `PortServing.ts` and the remote wire were not read in full by research. Constraints that are findings: `PortName.ts` never imports `Ports.ts`; `ByScope` leaves (HasActed, HasNotActed, HasSignature) require an id only for `Resource` scope; `readScoped` stays a plain function (no `Effect.fn`, no new span); no span-name literals in `PortAccess.ts`, `PortDerivation.ts` or `PortCalls.ts`; metric ids and descriptions do not change. The discuss step decides which of span, serving and fixture move, and whether a pairwise-distinct span-name type check replaces `PortSpanOf<N>`'s cross-check. Stryker: static description tables are invisible under `ignoreStatic`, so the proof is the `tabulatePorts` golden and a metric snapshot, not a score; re-take the core base first.
**Plans**: TBD

**UI hint**: no (library internals only)

### Phase 91: Named barrels, and visibility-only files folded away

**Goal**: `@qadi/core`, `@qadi/react` and `@qadi/audit` take named barrels, as `@qadi/devtools` does (ADR-QD-047), and each visibility-only file folds into the module that owns its concept only where `pnpm circular` proves no cycle returns, with the public surface identical at the end.
**Live defect**: no.
**Breaking**: no (the public surface at the phase base is the baseline and is identical at the end; a changeset line only if `hydrateDecisions` takes a structural parameter, a public `.d.ts` change). Amends ADR-QD-037, 047 and 099 (house rule: AGENTS.md §9).
**Depends on**: Phase 90 (hard: 91 names the exports 89 and 90 settle, folds `SequenceIntegrity.ts` into `ArchiveFacts.ts` after 89, and edits `QadiProvider.tsx` imports after 86).
**Requirements**: BARL-01, BARL-02, BARL-03, BARL-04, BARL-05. Cross-cutting: WX-01, WX-02, WX-03, WX-04, WX-05, WX-06, WX-07
**Packages**: `@qadi/core`, `@qadi/react`, `@qadi/audit` (their `index.ts` barrels and the folded files), `scripts/check-house-style.mjs` (`devtools-named-barrel` becomes a named-barrel rule, `SPAN_KEY_SHARED`, `UNTRUSTED_DECODE_BUDGET`), `scripts/check-package-install.mjs` (a `../../` escape check), a committed surface-diff tool, AGENTS.md §7a, §9 and §16, `CONTRIBUTING.md`, `spec/overview.md`, a changeset per the policy
**Records**: ARCH-138; ADR-QD-204 (new; the barrel rule and the folds, amending ADR-QD-037, 047 and 099 and removing the PROJECT.md Out of Scope line the folds supersede); CCR-QD-483; BEH-QD-791 to 795; INV-QD-427 to 428
**Evidence** (`_WAVE16-CONTEXT.md`, at `ac7578f3`; SUMMARY's fold-verdict table): the visibility-only files are core `PortSpanDecode.ts` (26 lines) and `PortInterpreter.ts` (21), react `Hydration.ts` (95, forwards to `dehydrateWith` and `atoms.hydrate`) and `GateRegistry.ts` (60, wraps `buildGateRegistry`), and audit `SequenceIntegrity.ts` (26, re-exports from `ArchiveFacts.ts`). Madge verdicts on this tree: `PortSpanDecode` into `PortSpanEncode` is acyclic; `PortInterpreter` into `PortSpan.ts` is acyclic (into `PortSpanEncode` is a cycle); `GateRegistry` into `GateWriter` and `SequenceIntegrity` into `ArchiveFacts` are acyclic; `Hydration.ts` into `HydrationEngine.ts` is a cycle as written (`HydrationEngine -> QadiAtoms -> HydrationEngine`) and folds only through a structural `hydrateDecisions` parameter; `EvaluationSpan` stays apart unless proven. Gate couplings: the `devtools-named-barrel` rule (≈2171-2198), `SPAN_KEY_SHARED`, `UNTRUSTED_DECODE_BUDGET` (the `PortSpanEncode.ts` row), AGENTS.md §7a, §9 and §16.

**Success Criteria** (what must be TRUE):
  1. A surface-diff tool (`{name, value-or-type}` per package, from the built `lib/` and the compiler, with a planted-defect self-test) is committed before any barrel changes; the public surface at the phase base is the baseline and is identical at the end, both gate 13's count and every name's kind (BARL-01).
  2. The `@qadi/core`, `@qadi/react` and `@qadi/audit` barrels name their exports per module, generated from compiler symbol flags and never hand-typed, one commit per barrel with no mixed `export *` state; `useQadiContext` stays public, and no dependent package's `.d.ts` reaches into another's `src` (a `../../` escape check added to gate 14) (BARL-02).
  3. Each visibility-only file folds into the module that owns its concept, one fold per commit with `pnpm circular` clean after each (`PortSpanDecode` into `PortSpanEncode`, `PortInterpreter` into `PortSpan`, `GateRegistry` into `GateWriter`, `SequenceIntegrity` into `ArchiveFacts` with its "not tamper-evident" disclaimer and four citations re-pointed); `Hydration.ts` folds only if `hydrateDecisions` takes a structural parameter that removes the cycle, otherwise it stays and the cycle is recorded, and every fold madge refuses is recorded with its verdict (BARL-03).
  4. The house-style rule `devtools-named-barrel` becomes a named-barrel rule over all five named barrels with a self-test that plants an `export *`; `SPAN_KEY_SHARED`, the `UNTRUSTED_DECODE_BUDGET` row and AGENTS.md §7a follow the folded span file in the same commit, and AGENTS.md §9, §16 and `CONTRIBUTING.md` are rewritten for the new rule (BARL-04).
  5. ADR-QD-204 records the barrel rule and the folds, amending ADR-QD-037, 047 and 099 and removing the PROJECT.md Out of Scope line the folds supersede; `spec/overview.md` names each export at its new home; a changeset records any public declaration change (BARL-05).

**Planning notes**: **Research flag: plan 1 is the surface-diff tool and a pre-fold madge simulation on the Phase 91 base** (`/gsd-plan-phase --research-phase 91`); the barrel generator is new tooling (TypeScript 7 has no classic `ts.*` API, so use `typescript/unstable/{sync,ast}` as `scripts/lib/module-state-scan.mjs` does, and do not commit the generator). Plan order: (1) the tool with its self-test, then the three named barrels, zero file moves, one commit per barrel; (2) each fold, one per commit, `pnpm circular` after each, verdicts recorded for the ADR-QD-037 amendment; (3) generalise the house-style rule (rename it, five barrels, self-test) and rewrite AGENTS.md §9, §16 and CONTRIBUTING; (4) `SPAN_KEY_SHARED`, the `UNTRUSTED_DECODE_BUDGET` row and AGENTS.md §7a together; (5) re-point the `SequenceIntegrity` disclaimer citations (README, `spec/urs.md`, `spec/models/17-purpose.md`, ADR-QD-009); (6) the stale sweep as the last plan, mutation as the very last. Constraints that are findings: `export type { X }` of a const-and-type pair or a class compiles, passes gate 13 and deletes the value (about 34 names in core, 1 in react, 7 in audit), so generate from symbol flags; a barrel that omits a type makes a dependent `.d.ts` emit `import("../../a/src/priv")` with exit 0 and no TS2883; `GateWriter` stops being a zero-import leaf (reword it); `QadiProvider.tsx` publishes names by accident today. Run `pnpm build` and `pnpm spec:package` after each barrel. Stryker: `stryker.config.mjs` and `stryker.audit.mjs`; compare a folded file with the sum of its sources' latest post-review records through a `RENAMED` map; the react folds target files not in `stryker.react.mjs`.
**Plans**: TBD

**UI hint**: no (module layout and build gates only)

### Progress (v1.11)

**Execution Order:**
Phases execute in numeric order: 85 → 86 → 87 → 88 → 89 → 90 → 91

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 85. The dock's hydration block is a model row | 11/11 | Complete    | 2026-11-25 |
| 86. `QadiProvider`'s registry lifetime has a React-free owner | 8/8 | Complete    | 2026-11-25 |
| 87. One scoped run that states its stop | 11/11 | Complete    | 2026-11-25 |
| 88. `StoppedBox` keys itself and owns the announce-once rule | 10/10 | Complete    | 2026-11-26 |
| 89. One admission step for a host's audit batch | 0/TBD | Not started | - |
| 90. The remaining per-port facts live on the port description | 0/TBD | Not started | - |
| 91. Named barrels, and visibility-only files folded away | 0/TBD | Not started | - |
