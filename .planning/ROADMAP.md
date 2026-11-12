# Roadmap: Qadi

## Milestones

- ✅ **v1.0 Arch Wave 5** — Phases 1-9 (shipped 2026-11-09) — [archive](milestones/v1.0-ROADMAP.md)
- 🚧 **v1.1 Arch Wave 6** — Phases 10-20 (all phases complete 2026-11-10; merged to `main` in #155; not archived as a GSD milestone; not released)
- ✅ **v1.2 Arch Wave 7** — Phases 21-29 (completed 2026-11-12; not released) — [archive](milestones/v1.2-ROADMAP.md)
- 🚧 **v1.3 Arch Wave 8** — Phases 30-36 (planned 2026-11-12; not started)

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

## 🚧 v1.3 Arch Wave 8 (Phases 30-36)

### Overview

Wave 8 resolves the six candidates of the 2026-11-12 architecture review and clears the v1.2 spec debt. Base commit `aab87576`
(v1.2 merged as #156), branch `arch-wave-8`. Read `.planning/phases/_SHARED-CONTEXT.md`, then `.planning/phases/_WAVE8-CONTEXT.md`
(base, numbering, per-phase evidence from the review), then `.planning/research/SUMMARY.md`. Where the research recommended a
compatible option only for the sake of compatibility, `REQUIREMENTS.md` takes the clean one and wins (strict decode's public
surface, audit's `TooDeep`, `sweepIntervalMillis`).

**Standing direction (user, 2026-11-12):** the cleanest design wins, not the simplest, and the project is not in production, so
breaking changes are allowed. Keeping a public name, avoiding a Breaking changeset or keeping source compatibility is never the
reason to pick a design. Every break is recorded (changeset marked **Breaking**, `apps/website/.../reference/upgrading.md`).
Nothing is released or published, and no version-packages PR is merged.

Order: core first (30-33), then devtools (34), then the one speculative react phase (35), then debt (36), which also corrects
anything 30-35 left stale. **Execution order: phases run strictly one at a time, in numeric order (30 → 36).** Every records plan
edits the same spec registers (CCR tail, invariants, traceability, `index.yaml`, `overview.md`, behaviour docs) and
`use_worktrees` is false. The per-phase "Depends on" lines name the *content* reasons; serial order is the operational rule.

**Every phase** carries the seven cross-cutting requirements (WX-01 to WX-07): `pnpm check:pr < /dev/null` green at the end; ADR
(or "Unused" in its CCR row), CCR, BEH/INV and traceability records using only reserved numbers, never `node scripts/next-id.mjs`;
`spec/overview.md` names every added export and its module column is corrected by hand for every moved declaration (gate 13 checks
names only); no new `as`, `!`, `any`, `switch`, `Effect.fnUntraced`, `async`/`await` or ambient `console`/`process.env`/clock;
coverage held, and per-file Stryker scores recorded in the first plan (`NN-mutation-base.json`) and compared in the last, a drop
closed with a test and never re-baselined; a characterisation or regression test written on the phase base before any behaviour
change; every public break recorded as **Breaking**. Run `pnpm circular` after the first source edit of Phases 30, 32 and 33, and
`pnpm spec:website-examples` explicitly for Phases 32, 33 and 35 (the website typecheck inside `check:pr` can be skipped).

**Cross-phase ordering edges** (from `research/SUMMARY.md`):

| Edge | Strength | Reason |
|------|----------|--------|
| 30 → 36 | hard | 36 corrects prose that 30 creates; 29 IN-01 is in `HydrationEngine.ts`, which 30 edits |
| 32 → 33 | soft | 33's builder imports `StandingEvaluationServices` from the leaf 32 creates; the names are public either way |
| 33 → 36 | hard | both edit `traceability.md` (behaviour 29 row) and INV-QD-042; 33 lands first |
| 34 → 36 | hard | 34 resolves 26 IN-01 and edits `DevtoolsDock.tsx` (26 IN-02) and `DockModel.test.ts` (26 IN-03) |
| 35 → 36 | ordering | 36 re-verifies anything 35 touches in spec |
| 31, 34, 35 vs 30, 32, 33 | none | no shared source files |
| within 30 | internal | the hydration and audit plans depend on the core export |

**Numbering reserved for v1.3** (the whole block is held in the shared reservation file; confirm a number is free by grepping
`spec/`, `packages/`, `.changeset/` and `AGENTS.md` before using it; name an unused reservation "Unused:" in the phase's CCR row).
Highest ARCH is ARCH-77; ARCH ids below 78 are never reused. ADR Document IDs equal the file number (gate 10).

| Phase | ARCH | ADR-QD | CCR-QD | BEH-QD | INV-QD |
|---|---|---|---|---|---|
| 30 | 78 | 143 | 421 | 486–490 | 305–306 |
| 31 | 79 | 144 | 422 | 491–495 | 307–308 |
| 32 | 80 | 145 | 423 | 496–500 | 309–310 |
| 33 | 81 | 146 | 424 | 501–505 | 311–312 |
| 34 | 82 | 147 | 425 | 506–510 | 313–314 |
| 35 | 83 | 148 | 426 | 511–515 | 315–316 |
| 36 | — | — | 427 | 516–520 | 317–318 |

**Human checkpoints.** Each phase opens on the `checkpoint:decision` items listed in its detail. They are settled in
`/gsd-discuss-phase` before planning (or in the phase's first plan when a human answer is needed during execution), and
recorded in the phase CONTEXT and its ADR or CCR row.

### Phases

- [x] **Phase 30: One strict-decode module** - Every untrusted JSON seam decodes through one core leaf (parse, depth guard, strict decode, closed refusal); each seam keeps only its error mapping (ARCH-78) (completed 2026-11-12)
- [x] **Phase 31: A reset supersedes its claims** - `SharedComputation.reset` supersedes in-flight claims, so `DecisionCache`'s generation counter goes (ARCH-79) (completed 2026-11-12)
- [x] **Phase 32: Evaluation options and services stated once** - `EvaluateOptions` beside `QuestionOptions`, `EvaluationServices` in a type-only leaf, `LifecycleOptions` deleted (ARCH-80) (completed 2026-11-12)
- [x] **Phase 33: One sealed evaluation layer** - One core builder for `@qadi/testing` and devtools' Simulation, with the sink and cache shadowing rule stated and required (ARCH-81) (completed 2026-11-12)
- [x] **Phase 34: Diagnostics as the dock model's seventh store** - The poll runs in the model's scope and the reading merge leaves the view (ARCH-82) (completed 2026-11-12)
- [ ] **Phase 35: The atom set owns its eviction sweep** - Opens on a spike: either a mechanism lands, or the sweep stays in the provider with the rule stated and tested (ARCH-83)
- [ ] **Phase 36: Carried spec debt and stale records** - Duplicate BEH-QD-219..221, `Sources.ts`, the stale replay line, selected v1.2 info findings (CCR-QD-427, no ARCH)

### Phase Details

### Phase 30: One strict-decode module
**Goal**: A new untrusted-JSON seam gets the depth guard by default: the decode order (parse, depth guard, strict decode, closed refusal) is stated once in a core leaf, and each seam keeps only its error mapping.
**Depends on**: Nothing in v1.3 (first phase; serial order). Hard edge to Phase 36.
**Requirements**: DEC-01, DEC-02, DEC-03, DEC-04, DEC-05, DEC-06, DEC-07, DEC-08, WX-01, WX-02, WX-03, WX-04, WX-05, WX-06, WX-07
**Records**: ARCH-78; ADR-QD-143; CCR-QD-421; BEH-QD-486 to 490; INV-QD-305 to 306; changesets for `@qadi/core`, `@qadi/react`, `@qadi/audit`
**Opens on** (`checkpoint:decision`; the cleanest design wins, a Breaking change is not a cost):
  1. `PolicyFromJson` (public, decodes without the guard today): remove it, or route it through the module (DEC-03). The research's doc-only option is off the table. `Policy.fromJson`'s error channel (`PolicyDecodeTooDeep | SchemaError`) and the 60,000-deep malformed-text test pin are kept or restated either way.
  2. The leaf's public surface (DEC-05): `UNTRUSTED_DECODE_OPTIONS` leaves it unless a consumer cannot use the decoder (audit's `recordJsonOf` is the one to check); `exceedsJsonDepth` and `MAX_DECODE_DEPTH` are decided toward the narrowest surface, and the hydration spec requirement that names them is restated to match.
  3. Audit `TooDeep` (DEC-04): the envelope and row decode report too-deep as too-deep, so `ArchiveRefusal` is written out as the full closed union and the break recorded. The research's "fold it into `Malformed`" is dropped.
  4. The module's shape and the rule's shape: the `untrustedDecoder` options (`maxDepth`, `unwalked`, `prepare`, fixed order guard, prepare, decode) and what the DEC-08 house-style rule refuses (strict options outside the leaf, a hand-assembled guard-then-decode), checked in both directions.
**Success Criteria** (what must be TRUE):
  1. `UntrustedDecode.ts` is the only place in `packages/*/src` that holds the strict decode options, the decode-depth constant and the guard-then-decode order; `Policy.ts` declares and re-exports none of them; the `scripts/check-house-style.mjs` rule refuses a second copy (checked in both directions) and AGENTS.md states it.
  2. Every untrusted JSON seam decodes through the leaf (`Policy.fromJson`, `SinkCodec`, the three port-wire decoders, `PortRemote`, hydration, the audit archive and entry decoders, and any seam the phase inventory finds). A refusal-precedence characterisation table (not JSON, too deep, deep and wrong version, wrong version, extra envelope key, excess key, valid), written green on the phase base, passes unchanged afterwards, and a too-deep input reports as too-deep at every seam, audit included.
  3. No public entry point decodes untrusted JSON without the guard: `PolicyFromJson` is removed or routed through the module, `UNTRUSTED_DECODE_OPTIONS` has left the public surface, and each break is recorded as Breaking in the changesets and `upgrading.md`.
  4. Every guarded seam has a test deeper than the bound (the port-wire decoders, the hydration envelope, and `PolicyFromJson` or its replacement); the module has one property test (the guard always precedes decode, the refusal kind is a function of the input); `wireHazard`'s outbound depth count still equals `exceedsJsonDepth` (INV-QD-096).
  5. Hydration's `{ ...payload, entries: [] }` workaround and the audit envelope's `entries` and row's `record` partial walks are module options, not hand-built copies, and per-entry attribution (`EntryNotDecodable{ index, refusal }`, hydration's per-entry drop reasons) is preserved.
**Planning notes**: plan order is the characterisation table (green on the base) first, then the leaf and its property test, then core seams, then audit, then hydration (needs the core export), then records. Small research items: the exact `prepare` typing for `SinkCodec`, and the double-walk cost (hydration entry then policy, sink record then row), measured once and never traded for dropping the guard.
**Plans**: 9/9 plans complete

Plans:
- [x] 30-01 (W1): Mutation baseline of the 13 seam files, the seam inventory, and the refusal characterisation tables (core, react, audit, the devtools paste-box pin) written green on the phase base.
- [x] 30-02 (W2): The `UntrustedDecode.ts` leaf (tracer through `Policy.fromJson`), `PolicyNotJson`, `PolicyFromJson` removed.
- [x] 30-03 (W3): The leaf's property test and type pins first, then `SinkCodec` (version and envelope as `prepare`) and the port wire / `PortRemote` decode through the leaf; the too-deep sentence written once.
- [x] 30-04 (W4): The audit archive envelope and row decode through the leaf; `ArchiveRefusal.TooDeep` and the row's too-deep.
- [x] 30-05 (W4): Hydration's payload, entry and policy decoders on the leaf; `PayloadTooDeep` across core, react and devtools.
- [x] 30-06 (W5): Narrow `@qadi/core`'s surface (private options, depth walk out of the barrel, after an importer scan proves no in-repo user is left); the `[untrusted-decode]` rule, its budget and AGENTS.md §7a.
- [x] 30-07 (W6): The double-check bench, ADR-QD-143 and the ADR-096/107 amendments, behaviours, invariants, traceability, overview, CCR-QD-421.
- [x] 30-08 (W6): Changesets for core, react, audit and devtools, the `upgrading.md` entries and the hydration and audit package docs.
- [x] 30-09 (W7): Gate integrity and WX-04 scan, characterisation-first check, mutation comparison, `pnpm check:pr` on the final tree.

### Phase 31: A reset supersedes its claims
**Goal**: `SharedComputation` owns its own staleness rule: a reset supersedes every in-flight claim, so the decision cache keeps no generation counter and a stale answer cannot re-enter a cleared cache.
**Depends on**: Phase 30 (serial order only; no shared source files)
**Requirements**: SUPR-01, SUPR-02, SUPR-03, SUPR-04, SUPR-05, WX-01, WX-02, WX-03, WX-04, WX-05, WX-06, WX-07
**Records**: ARCH-79; ADR-QD-144 (likely Unused: ADR-QD-132 is amended); CCR-QD-422; BEH-QD-491 to 495; INV-QD-307 to 308; changeset for `@qadi/core`
**Opens on** (`checkpoint:decision`):
  1. How "superseded" is carried (SUPR-01 requires it distinct from `abandoned`): a separate flag, with `onExit` settling only when neither is set, while `Deferred.done` and the last-leaver interrupt stay untouched so waiters are always answered; or one widened state. Confirm the distinct state.
  2. The `claim` hook shape: keep it, or change to `settle(key, exit)`. The research kept it to avoid about twenty test edits; test churn is not a reason, so pick the cleaner interface.
**Success Criteria** (what must be TRUE):
  1. After a `reset`, every waiter of an in-flight claim is answered exactly once, the superseded claim's exit never reaches `settle`, its compute is still interrupted when its last waiter leaves, and an ask after the reset claims afresh. This is pinned at the `SharedComputation` seam, without `evaluate`, by the stale-last, stale-first-then-a-third-ask-coalescing, two-key and parked-uninterruptible races.
  2. `DecisionCache` has no `generation` or `myGeneration`, no stale-write check, and `clear` is only the steps the adapter still owns; the seam tests land before `generation` is deleted, and the existing `DecisionCache.test.ts` race pins pass unchanged.
  3. A property test over generated `run`, `reset`, settle and leave interleavings holds: no superseded exit is ever settled, every waiter is answered exactly once, a post-reset ask claims afresh.
  4. The staleness rule is a stated behaviour (a stale answer never re-enters a cleared cache; an ask after `clear` computes afresh): a new BEH under the decision-cache behaviour, BEH-QD-439 and INV-QD-025's Enforcement restated, ADR-QD-132 amended.
**Plans**: 5/5 plans complete

Plans:
- [x] 31-01 (W1): Reserved-number check and the mutation baseline of `SharedComputation.ts` and `DecisionCache.ts` (alone, first); the four clear-mid-compute races and the amended reset test at the seam, RED on the phase base.
- [x] 31-02 (W2): Tracer: a closed `standing` (Live, Superseded, Abandoned) and a `reset` that supersedes, turning the races green; then, in its own commit, `DecisionCache` loses its generation counter with `DecisionCache.test.ts` byte-identical.
- [x] 31-03 (W3): The `settle(key, exit)` hook replaces the claim-time hook in the module, its adapter and every harness; the model-based property (seed 3101, 300 runs).
- [x] 31-04 (W4): ADR-QD-132 amendment, BEH-QD-491, BEH-QD-439 and INV-QD-025 restated, INV-QD-307, traceability, CCR-QD-422 and the `@qadi/core` patch changeset.
- [x] 31-05 (W5): Gate integrity, WX-04 scan and D-09 commit-order check, mutation comparison, `pnpm check:pr` on the final tree.

### Phase 32: Evaluation options and services stated once
**Goal**: `EvaluateOptions` and the evaluation services are each declared once, and reading the pipeline `Qadi.ts` → `Evaluate.ts` → `Lifecycle.ts` → `Walk.ts` meets no duplicated type.
**Depends on**: Phase 31 (serial order only). Soft edge to Phase 33 (the builder there imports from the leaf this phase creates).
**Requirements**: EOPT-01, EOPT-02, EOPT-03, EOPT-04, WX-01, WX-02, WX-03, WX-04, WX-05, WX-06, WX-07
**Records**: ARCH-80; ADR-QD-145 (likely Unused: ADR-QD-105 gets a revision note); CCR-QD-423; BEH-QD-496 to 500; INV-QD-309 to 310; changeset for `@qadi/core`
**Opens on** (`checkpoint:decision`):
  1. Declaration sites: `EvaluateOptions` in `Question.ts` beside `QuestionOptions`, `EvaluationServices` and `StandingEvaluationServices` in the new type-only `EvaluationServices.ts` (the research settled this on import-closure grounds: services in `Question.ts` would hang it on `Ports.ts`' closure). Confirm.
  2. Re-exports: none from `Evaluate.ts` (EOPT-03). If declaration emit raises TS2883, record the one named re-export it forces rather than restating a type.
  3. An ADR, or a revision note on ADR-QD-105.
**Success Criteria** (what must be TRUE):
  1. `EvaluateOptions` has one declaration, beside `QuestionOptions` in `Question.ts`; `LifecycleOptions` is deleted and every use reads `EvaluateOptions`.
  2. `EvaluationServices` and `StandingEvaluationServices` have one declaration, in the type-only `EvaluationServices.ts`; the hand-spelled services union in `Lifecycle.ts` is deleted.
  3. `Evaluate.ts` declares only `evaluate`, with no option or service type and no restatement of one.
  4. `pnpm circular` and `pnpm typecheck` stay green (no TS2883); `Lifecycle.tst.ts` pins the option key set once; `spec/overview.md`'s module column and `spec/traceability.md` (the row near line 470) name the new declaring modules.
**Plans**: 4/4 plans complete

Plans:
- [x] 32-01 (W1): Reserved-number check and the mutation baseline of the six touched files that carry mutants (alone, first); `EvaluationShapes.tst.ts`, five tests through the `@qadi/core` barrel, green on the phase base and left unchanged through the move.
- [x] 32-02 (W2): Tracer: `EvaluateOptions` moves to `Question.ts` and the services to the new type-only `EvaluationServices.ts`, in one commit with every importer and the barrel re-pointed; then `Lifecycle.ts` drops its restated options for `Omit<EvaluateOptions, keyof QuestionOptions>`, `ask` requires `EvaluationServices`, and `Lifecycle.tst.ts` is rewritten.
- [x] 32-03 (W3): ADR-QD-105 and ADR-QD-037 revision notes, `06-services.md`, the overview's module column, traceability rows, CCR-QD-423 and the `@qadi/core` patch changeset.
- [x] 32-04 (W4): Gate integrity, WX-04 scan and D-10 commit-order check, mutation comparison, `pnpm check:pr` on the final tree.

### Phase 33: One sealed evaluation layer
**Goal**: Review and simulation are built from one evaluation-environment builder in `@qadi/core`, and whether the sink and the decision cache are shadowed is stated, required and tested instead of decided silently by each copy.
**Depends on**: Phase 32 (soft: imports from the leaf it creates). Hard edge to Phase 36.
**Requirements**: SEAL-01, SEAL-02, SEAL-03, SEAL-04, SEAL-05, WX-01, WX-02, WX-03, WX-04, WX-05, WX-06, WX-07
**Records**: ARCH-81; ADR-QD-146 (amends ADR-QD-050 Rev 1.5); CCR-QD-424; BEH-QD-501 to 505; INV-QD-311 to 312; changesets for `@qadi/core`, `@qadi/testing`, `@qadi/devtools`
**Opens on** (`checkpoint:decision`):
  1. The required closed-union argument: which combinations it admits and its member names (review passes "none", simulation passes "sink and cache"). Never a default, never a boolean pair.
  2. The clock vocabulary (SEAL-05): the clock reaches core as an already-built layer, so core imports nothing from `effect/testing`; whether the public literals `"test"` and `"deterministic"` unify is decided on cleanliness, not compatibility.
  Settled by the requirements, not reopened: the review layer does not shadow (SEAL-03), and `packages/core/test/helpers.ts` is built from the builder (SEAL-04).
**Success Criteria** (what must be TRUE):
  1. `@qadi/core` exports one evaluation-environment builder (ports, evaluation-id prefix, an injected clock layer); `qadiReviewLayer` and devtools' `simulationLayer` are both built from it, the copied lines are gone, and devtools still does not depend on `@qadi/testing` (ADR-QD-050).
  2. Shadowing of the sink and the cache is a required closed-union argument, never a default and never a boolean pair, and the rule is stated in INV-QD-042 and in both layers' docs.
  3. A test's outer sink still receives records and an outer cache is still used under the review layer (new tests); the simulation layer shadows both (INV-QD-042's existing tests stay green); the `"sim"` id prefix is asserted.
  4. A conformance test shows the review and simulation layers agree on ids, clock determinism and fail-closed ports, and `packages/core/test/helpers.ts` is built from the same builder.
  5. The clock vocabulary is settled and recorded (unified literals, or kept apart by a stated reason), with no `effect/testing` import added to core.
**Planning notes**: test-scope budgets apply: read metrics by their export, never by a `qadi_*` literal, and script a broken port with `scriptedPort`.
**Plans**: 6/6 plans complete

Plans:
- [x] 33-01 (W1): Reserved-number check and the mutation baseline (nothing touched is measured at the base; the new module will be), committed alone, first; the review-layer pin (`QadiReviewLayer.test.ts`: outer sink, outer cache, ids, default clock) and the review/simulation conformance pin, both green on the phase base.
- [x] 33-02 (W2): Tracer: `evaluationEnvironment`, `EvaluationEnvironmentOptions`, `EvaluationShadowing` and `EvaluationClock` in core with runtime and type tests, and `simulationLayer` rebuilt on it (`shadow: "sinkAndCache"`, `"sim"`) with every INV-QD-042 test green; then `qadiReviewLayer` (`shadow: "none"`) and core's test helpers built on it.
- [x] 33-03 (W3): One clock vocabulary: `@qadi/testing`'s option takes `EvaluationClock` (`"deterministic"`), devtools' `SimulationClock` deleted; one literal-to-layer map per package; the two test renames line for line.
- [x] 33-04 (W4): ADR-QD-146 and ADR-QD-050's amendment (Rev 1.5); INV-QD-042 restated, INV-QD-311, INV-QD-312; BEH-QD-501..505 and BEH-QD-226 restated; devtools-spec prose.
- [x] 33-05 (W5): Overview rows, traceability rows, CCR-QD-424; changesets (core minor, testing and devtools Breaking); the upgrade note and the website's testing page.
- [x] 33-06 (W6): Gate integrity, WX-04 scan, commit-order and test-edit shape check, no surviving mutant in the new module, `pnpm check:pr` on the final tree.

### Phase 34: Diagnostics as the dock model's seventh store
**Goal**: The dock forks nothing from a React effect: the diagnostics poll runs in the model's scope, the "supplied reading wins per field" merge is a model store, and ARCH-74's rule ("one owned-model hook, and it forks nothing") finally holds.
**Depends on**: Phase 33 (serial order only; devtools-only, no shared source files with 30-33). Hard edge to Phase 36.
**Requirements**: DIAG-01, DIAG-02, DIAG-03, DIAG-04, DIAG-05, DIAG-06, WX-01, WX-02, WX-03, WX-04, WX-05, WX-06, WX-07
**Records**: ARCH-82; ADR-QD-147 (likely Unused: ADR-QD-047 is amended, Rev 1.13); CCR-QD-425; BEH-QD-506 to 510; INV-QD-313 to 314; changeset for `@qadi/devtools`
**Opens on** (`checkpoint:decision`):
  1. The reading across a hidden `<Activity>`: the model is rebuilt on hide and show (as pause and the backlog already are), so the reading blanks until the next poll, or it survives. Decided, stated in the ADR-QD-047 amendment, pinned, and confirmed once in a real browser (a human check, as in the v1.2 audit).
  2. `diagnostics` going `undefined` and defined again: reset to `noDiagnostics`, or hold the last reading. Pinned either way.
  3. A poll defect: the shape of the visible failed state in the store (DIAG-05 requires one), and the throwing source that tests it.
  4. The poll starts on the model's first `configure`, one render later than the effect did, because the host layer builds under `Effect.runSync`: accept, or design around it.
**Success Criteria** (what must be TRUE):
  1. `makeDockModel` takes `diagnostics` and `reading` as host inputs through `configure`, compared per field (an inline literal does not restart the poll), and runs the poll on its own `FiberHandle` in the model's scope; no poll is forked from a React effect, and the hand-written deps list and its `eslint-disable` are deleted.
  2. The merged reading is computed in the model when an input changes and exposed as a store; `DevtoolsDock` renders it and merges nothing; public `useDiagnostics` is a thin adapter over the same scoped feed, so there is one poll implementation, and `DiagnosticsDockOptions` is declared in the model.
  3. The dock's snapshot hooks are one store-snapshot hook, and no constant-`undefined` run is passed to `useRunningStore` (v1.2 Phase 26 IN-01).
  4. A poll defect shows as a failed state, not a silently stopped panel, and is tested with a throwing source; the behaviour across a hidden `<Activity>` and across `diagnostics` going `undefined` and back is stated and pinned.
  5. Model tests cover the poll's start, restart, stop and merge under `TestClock` with no render; ADR-QD-047 is amended, BEH-QD-465 (seven stores) and BEH-QD-323 are restated, and `DockModel.ts` keeps its mutation score (base 100).
**Planning notes**: `/gsd-plan-phase --research-phase` only for how a poll defect behaves inside `FiberHandle` and for the Activity decision; model tests run inside `it.effect` with `settleTurns` before each `adjust`. The merged reading is never computed inside `getSnapshot`.
**Plans**: 9/9 plans complete
- [x] 34-01-PLAN.md
- [x] 34-02-PLAN.md
- [x] 34-03-PLAN.md
- [x] 34-04-PLAN.md
- [x] 34-05-PLAN.md
- [x] 34-06-PLAN.md
- [x] 34-07-PLAN.md
- [x] 34-08-PLAN.md
- [x] 34-09-PLAN.md
**UI hint**: yes

### Phase 35: The atom set owns its eviction sweep
**Goal**: Either the atom set enforces `maxTrackedQuestions` wherever it runs, with no provider, through a mechanism that meets every criterion below, or the sweep stays in the provider and the rule (what happens without one, and under several) is stated and tested.
**Depends on**: Phase 34 (serial order only; react package, no shared source files with 30-34). Ordering edge to Phase 36.
**Requirements**: SWEEP-01, SWEEP-02, SWEEP-03, SWEEP-04, SWEEP-05, WX-01, WX-02, WX-03, WX-04, WX-05, WX-06, WX-07
**Records**: ARCH-83; ADR-QD-148 (written only if a mechanism lands; otherwise Unused in the CCR row); CCR-QD-426; BEH-QD-511 to 515; INV-QD-315 to 316; changeset for `@qadi/react`
**Opens on** (`checkpoint:decision`; the first plan is the spike):
  1. Spike order and the stop rule: (1) an edge-triggered deferred sweep (`QuestionBook` signals pressure; the atom set coalesces calls behind a pending flag and forks `yieldNow` then `sweepEvictions`), (2) a self-terminating book-level fiber, (3) a layer-scoped periodic fork. Stop at the first mechanism that passes every SWEEP-02 criterion. Never `scheduleTask`/`defaultIdleTTL`, never a sweep from the render path or inside the registry's dispose-reread window (so no sweep-on-`open`), never a module-scope timer.
  2. The fallback's acceptance criteria: what must be recorded to conclude "the sweep stays in the provider".
  3. Fate of `sweepIntervalMillis`: if the mechanism supersedes it, it is removed (Breaking, recorded); if it still needs an interval, the interval moves to the atom set's options. Keeping an inert prop for compatibility is not an option.
  4. The AGENTS.md §13 and CCR-QD-150 wording amendment (a human-approved edit), and `spec/process/house-rules-evidence.md` §4.
**Success Criteria** (what must be TRUE):
  1. The spike's evidence and conclusion are recorded: each mechanism tried in order, the SWEEP-02 criteria it was measured against (dispose-reread smoke, existing sweep pins, `examples/nextjs-newsroom` e2e unchanged, one sweep per atom set however many providers or registries, no second sweeper under StrictMode or a hidden `<Activity>`, no leaked fibers across many atom sets), and why it passed or failed.
  2. If a mechanism passes: `maxTrackedQuestions` holds with no provider, shown by a bare-registry graph test; the provider no longer forks a sweep; a superseded `sweepIntervalMillis` is removed or moved, recorded as Breaking where it breaks.
  3. If none passes: the sweep stays in the provider, and what happens without a provider and under several providers is stated in the spec and the atom set's docs and pinned by tests.
  4. Either way, `QadiProvider.test.tsx`'s "stays over the bound after unmount" pin is reconciled, AGENTS.md §13 and `house-rules-evidence.md` §4 describe the outcome, and any new reliance on an `@stability unstable` atom API is pinned in `v4-reactivity-smoke.test.ts`.
**Planning notes**: the mechanism is unproven, so a spike is mandatory and the e2e (`pnpm example`, about 30 tests) is an exit criterion; it needs Playwright, so use CI or the rootless podman container route if the host cannot run it. `runFork` runs synchronously to its first yield, so a sweep started from `live()` or `release` must begin with `yieldNow`. Only the e2e catches a dropped render (CCR-QD-150).
**Plans**: 7/7 plans executed
- [x] 35-01-PLAN.md
- [x] 35-02-PLAN.md
- [x] 35-03-PLAN.md
- [x] 35-04-PLAN.md
- [x] 35-05-PLAN.md
- [x] 35-06-PLAN.md
- [x] 35-07-PLAN.md

### Phase 36: Carried spec debt and stale records
**Goal**: The v1.2 spec debt and the stale records are cleared, after phases 30-35 have finished making their own corrections.
**Depends on**: Phases 30, 33 and 34 (hard) and Phase 35 (ordering); each edits files and rows this phase corrects.
**Requirements**: DEBT-01, DEBT-02, DEBT-03, DEBT-04, DEBT-05, WX-01, WX-02, WX-03, WX-04, WX-05, WX-06, WX-07
**Records**: no ARCH, no ADR; CCR-QD-427; BEH-QD-516 to 520 and INV-QD-317 to 318 (reserved; Unused unless a fixed finding needs one); changeset for `@qadi/devtools` if 24 IN-01 or IN-03 changes shipped code
**Opens on** (`checkpoint:decision`):
  1. Which v1.2 info findings stay in scope once re-verified at the phase base: each still true is fixed; each resolved by 30-35 (26 IN-01 by Phase 34; 26 IN-02 and IN-03 and 29 IN-01 re-checked after 34 and 30) is recorded resolved; 24 IN-02 is history and exempt (AGENTS.md §15).
  2. 28 IN-06: narrow it to its remaining gap (an identity-changing rerender under StrictMode) and test it, or close it with evidence.
  3. The BEH-QD-219..221 reconstruction: copy 1's current fail-closed requirement text (ADR-QD-129, BEH-QD-411) and copy 2's intact tail prose, reconciled by hand. No gate says which copy is kept, so it is reviewed as a diff.
  4. Confirm that no ADR or CCR number is minted beyond CCR-QD-427.
**Success Criteria** (what must be TRUE):
  1. `spec/behaviors/29-devtools-simulator.md` has exactly one BEH-QD-219..221 block that keeps the fail-closed replay text and the intact tail prose, with the spliced change-history fragment back in the header and the stale fail-open copy deleted; `scripts/spec-revise.mjs ... --date ... --check` is clean.
  2. `spec/traceability.md` behaviour 29 names `model/Source.ts`, and no live record still claims the replay fail-open is undecided (`PROJECT.md`, `MILESTONES.md`, `STATE.md` and `spec/`; historical change-history rows stay exempt).
  3. Every open v1.2 info finding listed in `_WAVE8-CONTEXT.md` has been re-verified at the phase base and is fixed or recorded as resolved by 30-35; 24 IN-01 (a recorder built and dropped per commit) and 24 IN-03 (`Ready` spelled twice) are fixed as tested code changes.
  4. The stale citations are corrected (`v4-http-smoke.test.ts:106` naming `registerApi`, and the `stryker.http.mjs` comment placing code in `PermissionRegistry.ts`), and 28 IN-06 is narrowed and tested or closed with evidence.
**Planning notes**: pure verification and edit work; the risk is reconstruction care, not research. Re-verify every item at its base before touching it.
**Plans**: TBD

### Progress (v1.3)

**Execution Order:**
Phases execute in numeric order: 30 → 31 → 32 → 33 → 34 → 35 → 36

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 30. One strict-decode module | 9/9 | Complete    | 2026-11-12 |
| 31. A reset supersedes its claims | 5/5 | Complete    | 2026-11-12 |
| 32. Evaluation options and services stated once | 4/4 | Complete    | 2026-11-12 |
| 33. One sealed evaluation layer | 6/6 | Complete    | 2026-11-12 |
| 34. Diagnostics as the dock model's seventh store | 9/9 | Complete    | 2026-11-12 |
| 35. The atom set owns its eviction sweep | 0/0 | Not started | - |
| 36. Carried spec debt and stale records | 0/0 | Not started | - |
