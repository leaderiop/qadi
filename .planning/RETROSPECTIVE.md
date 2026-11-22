# Project Retrospective

*A living document updated after each milestone. Lessons feed forward into future planning.*

## Milestone: v1.0 — Arch Wave 5

**Shipped:** 2026-11-09
**Phases:** 9 | **Plans:** 33 | **Sessions:** not tracked

### What Was Built
- ARCH-46: one enforcement module for every `@qadi/http` request path, which fixed the missing `SubjectExtractionFailed` log on unguarded port routes (ENF-03).
- ARCH-47: one span projection per port (`pose`/`disclose`) and one `readPort` body, so local and served spans are equal.
- ARCH-48: `ArchiveFacts.ts` shared by the audit archive's writer and reader, plus the new `SequenceNumberInvalid` refusal.
- ARCH-49 to ARCH-52: single owners for gate instrumentation, decision-log HTTP, hydration in both directions, and the remote-port route address.
- ARCH-53: serving tables derived from a serving facet on each port description (ADR-QD-114), and `mapPorts` removed (Breaking).
- ARCH-54: `SinkEmit` owns every sink record, and the refusal vocabulary moved to `JsonRefusal.ts`.

### What Worked
- One phase per review finding, each with its own reserved ARCH/ADR/CCR numbers. Phases stayed independent, and an unused number was simply recorded as unused.
- Characterisation tests landed before the refactor moved anything (03-01's fast-check properties, 06-01's pinned outputs), so "behaviour unchanged" was proven, not asserted.
- The code-review → disposition → fix loop caught real defects after verification had passed: WR-01 in phases 02, 03, 07 and 09 (e.g. the obligation record being projected after the handler ran).
- The human checkpoint before amending ADR-QD-094 (Phase 8, D-01) kept the one cross-cutting design change deliberate.

### What Was Inefficient
- The literal `pnpm check:pr` could not run on the Fedora dev host (sudo-only `playwright install --with-deps`), so every phase spent effort on workarounds until Phase 06 found the podman Ubuntu container route.
- The full `pnpm check` (with mutation) does not fit the 60-minute CI job limit on the Node 26 leg, so "green CI" needed per-leg interpretation.
- Verification reports went stale whenever a later phase touched a file they covered. Four phases had to be re-verified at milestone close.
- Requirement ranges (`XC-01..05`) in ROADMAP could not be parsed by `phase.complete`, so traceability rows drifted (ENF-03 stayed unticked though satisfied).

### Patterns Established
- Package-private leaf modules (`AuthorizeRequest.ts`, `ArchiveFacts.ts`, `DecisionLogHttp.ts`, `PortRouteAddress.ts`, `JsonRefusal.ts`) as the home for one concept, kept out of the barrel per ADR-QD-099.
- An ADR only when a documented contract changes; otherwise a CCR row (Phases 5, 6, 7, 9).
- UAT checks that commands can settle are run by the agent (push + `gh workflow run check.yml`), not asked of the user.

### Key Lessons
1. Fix the dev-host merge-gate route before the first phase. A container that runs the literal gate saves a workaround in every phase.
2. Name requirements explicitly in ROADMAP (no ranges), so tooling can keep traceability honest.
3. Expect shared hot-spot files to invalidate earlier verification reports. Re-verify at close rather than treating stale as failed.
4. Run the review-fix loop even after verification passes. It found defects verification missed.

### Cost Observations
- Model mix: planning on opus; verification and plan checking on sonnet.
- Sessions: not tracked.
- Notable: 240 commits in two days. Four parallel re-verifications at close took about 1–2 minutes each.

---

## Milestone: v1.2 — Arch Wave 7

**Completed:** 2026-11-12 (not merged, not released)
**Phases:** 9 | **Plans:** 38 | **Tasks:** 75 | **Sessions:** one autonomous run (`/gsd-autonomous`), with context compactions

### What Was Built
- ARCH-69/70: a port's request key is derived from its wire question, and the request each policy leaf asks is stated once (`asks`). One `readScoped`, with one span, serves the three resource-scoped ports.
- ARCH-71: each sink record's fields are one `Schema.Struct`. The class, the v2 wire struct and the projection derive from it, and the wire stayed byte-identical.
- ARCH-72/73/74: `prepareSource` owns the simulation source rule. The Simulator is a scoped session that owns its runs through a `FiberHandle`, and the dock is one headless `makeDockModel`.
- ARCH-75: `addGuardedRoute` is the one bare guarded route constructor. The `/__permissions` routes moved out of the registry module.
- ARCH-76: the gate writer is a React-free leaf with a pure `reconcile`, and the test-only hook is deleted.
- ARCH-77: three facts are each stated once now: port name and span (`PortName.ts`), hydration's withheld fields, and devtools' failure sentence.

### What Worked
- Human decisions were answered up front, in one file (`_DECISIONS-v1.2.md`, D-01 for 22/23/25/28), so the run paused for the user only twice: the Phase 25 visual check and the tech-debt question.
- Each phase had a per-file Stryker baseline committed before any source change (WX-05). It caught real drops at phase end (`SimulationSession.ts`, `HydrationEngine.ts`) and at the milestone close (`SignatureHistory.ts`). Every drop was closed with a test, never by re-baselining.
- The review → fix → re-review loop found a warning in most phases after verification passed (e.g. Phase 29 WR-01, an ADR still naming the old home of `PortName`).
- Red tests committed before the refactor (26-01's sixteen dock rules, 25-01's 31 session tests) made "behaviour unchanged" checkable.

### What Was Inefficient
- `astro check` waited on an install prompt, and one `pnpm check:pr` run hung for 30 minutes before anyone noticed. The gate only runs reliably with stdin closed.
- Phases 21–23 went stale again because later phases touched the files their reports covered. They were re-verified at close, the same as v1.0.
- `phase.complete` could not update REQUIREMENTS.md's grouped traceability rows, so they were updated by hand again (v1.0's lesson 2, not applied to the table shape).
- `scripts/spec-revise.mjs` silently drops its document argument without `--date`.
- A network failure in 28-03 needed a resume.
- v1.1 was merged (#155) but never closed as a GSD milestone, which left its phases and requirements unarchived for v1.2's close to find.

### Patterns Established
- A decisions file answered before the run (`_DECISIONS-v1.2.md`). Each checkpoint plan quotes the human's words into its ADR.
- A mutation re-check at milestone close (`*-mutation-recheck.json`) on top of the per-phase check, because later phases can lower an earlier phase's file.
- A finding that only an untyped caller can reach is recorded as tech debt, not pinned by a test that would lock in the bad behaviour.

### Key Lessons
1. Close each milestone in GSD as soon as it merges. An unarchived milestone leaks into the next close.
2. Run `pnpm check:pr` with `< /dev/null` until gate 15's install prompt is fixed, and treat a step silent for more than 10 minutes as hung.
3. Make REQUIREMENTS traceability one row per ID, so `phase.complete` can tick it. A grouped table drifts every milestone.
4. Re-measure mutation for every touched file at close, not only per phase.

### Cost Observations
- Model mix: opus for the orchestrator and every subagent (planner, executor, reviewer, verifier).
- Sessions: one long autonomous run across several context compactions.
- Notable: 272 commits over two days. Stryker runs strictly one at a time, and they were the longest step of each phase close.

---

## Milestone: v1.3 — Arch Wave 8

**Completed:** 2026-11-13 (not merged, not released)
**Phases:** 7 | **Plans:** 54 | **Tasks:** 56 | **Sessions:** one autonomous run (`/gsd-autonomous`), with context compactions

### What Was Built
- ARCH-78: `untrustedDecoder` is the only strict decode of untrusted JSON; nine seams keep only their refusal mapping, and the unguarded `PolicyFromJson` path is gone.
- ARCH-79/80: `SharedComputation` owns staleness (closed claim `standing`), and evaluation options and services are each declared once.
- ARCH-81: one sealed `evaluationEnvironment` builder with a closed shadowing union, shared by `@qadi/testing` and devtools' Simulation.
- ARCH-82: diagnostics is the dock model's seventh store, with a closed status and no merge left in the view.
- ARCH-83: the atom set owns its eviction sweep (edge-triggered, deferred, once per episode); the provider forks nothing.
- Phase 36: the v1.2 spec debt closed, plus two live defects the debt work exposed: a hydration seed lost one macrotask after hydration, and a timeline feed whose death read as live.

### What Worked
- A ledger of every carried item, re-verified at the phase base (36-LEDGER.md, 37 rows), turned "clear the debt" into a checkable list. It also gave a third disposition, refuted, for findings that were wrong at the base.
- Phase 35 opened with a mechanism spike that ranked three candidates on six fixed criteria before any production code. The decision rule was written before the results, so the pick was not argued after the fact.
- Committing a pin of the AtomRegistry's removal timing before the seed fix caught the ordering hazard: a seed fix without the `subject` keepAlive would have shown a server allow forever (SD5).
- The code review loop still found a real issue after verification passed: a metric description claiming reads it does not count (WR-01). That finding overrode a ledger decision to keep it.

### What Was Inefficient
- Phases 30–35 went stale again at close, because Phase 36 touched files their reports covered. This is the third milestone in a row.
- 33 early commits went in without the Opus trailer (31 none, 2 Sonnet), because the SDK `commit` verb omits it and one fixer used its own model name. They were caught only at audit, too late to rewrite without breaking hash citations.
- An e2e pin (`Success,Initial+waiting,Success`) encoded a defect as a rule. The fix broke it, and the run had to stop for a user decision (D-20).
- `pnpm check:pr` still needs `< /dev/null` because of gate 15's install prompt.

### Patterns Established
- A ledger with a "Closed by" cell per carried item, plus an order check that each RED commit precedes its fix.
- A mechanism spike with fixed criteria and a ranking rule, for a phase marked speculative.
- Amend the trailer after every SDK `commit` call. Check `git log` for trailers per phase, not at audit.

### Key Lessons
1. Check commit trailers at each phase close. At milestone close, a rewrite would break every hash citation.
2. A test that pins an intermediate state should cite the rule that state comes from. `Initial+waiting` was a symptom, and nothing said so.
3. Expect the last phase to stale earlier verifications, and schedule the re-verify as part of the close rather than discovering it.

### Cost Observations
- Model mix: opus for the orchestrator and most subagents; sonnet for executors in some phases.
- Sessions: one long autonomous run across several context compactions.
- Notable: 333 commits over two days. Phase 36 alone had 14 plans, more than any earlier phase.

---

## Milestone: v1.4 — Arch Wave 9

**Completed:** 2026-11-14 (not merged, not released)
**Phases:** 6 | **Plans:** 38 | **Sessions:** one autonomous run (`/gsd-autonomous`), with context compactions

### What Was Built
- ARCH-84: one devtools module, `SupersedingRun.ts`, owns the scoped-run protocol that three stores had restated by hand.
- ARCH-85: the sink wire version is stated once (`WIRE_VERSION`), and everything else derives from it.
- ARCH-86: each hydration drop reason is stated once in core's `HYDRATION_DROP_TABLE` with its kind, and react's groups derive from it.
- ARCH-87: core describes a decode refusal. Devtools passes it through, which is the milestone's one Breaking change. Audit decodes a row once.
- ARCH-88: one guarded value-to-text function and one label rule in core, read by `explain` and by the devtools panels. This closes a live throw on a bigint or a cycle.
- ARCH-89: a seeded question builds its own computing atom in `SeededQuestion.ts`, tested on a real atom runtime.

### What Worked
- Each phase opened with a mutation baseline committed alone and first, on the untouched base. Every close compared against it with the same invocation, and nothing was re-baselined.
- In Phase 42, a human checkpoint came after spike evidence for all four options (lines moved, fakes removed, mutation delta). The user picked from measured options, not from argument.
- Trap tests were written on the base and shown red under a deliberate wrong edit before the code moved. That proved they bite (Phase 42's `get(grantAtom)` trap).
- The review loop again found real issues after verification passed: stale normative spec in Phase 42 (WR-01), the label rule written twice in Phase 41, and a test that could pass vacuously.

### What Was Inefficient
- Phases 38, 39 and 40 went stale at close, because later phases edited files their reports covered. This is the fourth milestone in a row. The re-verify was planned this time, but it still costs a verifier run per phase.
- Planning in Phase 41 found that core's `explain` had the same throw. That reopened CONTEXT after planning (D-13..D-16) and forced a re-plan.
- Plan verifies that count commits by subject prefix also counted each plan's own SUMMARY and state commits (42-02, 42-05). Executors had to check the guarded facts by hand.
- A mutation-after JSON written before the review fixes was not the latest recorded score. The milestone re-check had to read the review disposition instead.

### Patterns Established
- A milestone re-check of every touched file against its latest recorded score, in the last plan, with five Stryker runs one at a time.
- A cross-phase stale sweep in the last plan: no live record names a removed or moved name, and every citation resolves.
- Executor prompts are generated from a per-phase script with shared constraints plus per-plan reading and constraint files.

### Key Lessons
1. Record a post-review mutation figure as the phase's final score. Otherwise later comparisons read a pre-fix number.
2. A verify that counts commits should filter on content paths, not only the subject prefix.
3. When a planner finds the same defect in a second package, take it back to the user before planning. The fix's placement can change (Phase 41's core export).

### Cost Observations
- Model mix: opus for the orchestrator, planners and research; sonnet for executors, checkers, reviewers, fixers and verifiers.
- Sessions: one long autonomous run across several context compactions.
- Notable: 228 commits in about a day. Three human decisions (Phases 40, 41, 42), each asked once.

---

## Milestone: v1.5 — Arch Wave 10

**Completed:** 2026-11-16 (not merged, not released)
**Phases:** 10 | **Plans:** 71 | **Sessions:** one autonomous run (`/gsd-autonomous`), with context compactions

### What Was Built
- ARCH-90: one package-private `Handover.ts` behind every enforcement entry point. `guard` and `filter*` refuse a second `resource` at the type level (Breaking, core and promise).
- ARCH-91: the hydration seed's fields are derived from core's wire form, so a new wire field reaches the seed untouched (Breaking, react).
- ARCH-92: the audit breaker is one pure `step`. Options that cannot work (`NaN`, zero, negative) are refused when the layer is built (Breaking, audit).
- ARCH-93: `sinkEmitter` contains a failing or dying sink and reports it once, by name. A synchronous throw from `record` no longer kills `evaluate`.
- ARCH-94/95: port defaultedness is a mark, not a name. Audit reports core's `SinkRecordNotEncodable` and derives "lost" from durability (Breaking, audit).
- ARCH-96..99: one gate-state vocabulary, and gates as the dock model's eighth store (Breaking, react and devtools). Leaf request needs, stated once and benchmarked within noise. Policy tag arity, stated once. Core's `compilePredicate` shell, shared by both SQL dialects.

### What Worked
- The four silent defects went first, each with a RED test on the untouched base before any code moved.
- Phase 50 opened on its benchmark gate (3 + 3 interleaved runs, median of per-run minima) and only then planned the change. The rule "may end in a recorded rejection" kept it honest.
- Recording post-review mutation (`NN-mutation-review.json`) from Phase 51 on applied v1.4's lesson. The milestone gate then had the latest scores.
- The milestone audit fixed its own info findings (six in 43/44) instead of carrying them, then re-verified the phases they touched.

### What Was Inefficient
- Five phases went stale at close (43, 44, 45, 46, 48). Again the cause was later phases or the audit's fixes touching covered files.
- Backfilling `requirements-completed` into four SUMMARYs made those reports stale too, because SUMMARYs are covered inputs. Only a digest refresh was needed, but it cost a second pass.
- Plan-local ids (D-NN, BRKR-, EMIT-) leaked into shipped test titles and comments in most phases. About 20 remain as tech debt.
- Under zsh, an unquoted `$files` does not word-split. A fingerprint loop failed silently until it switched to `xargs`.

### Patterns Established
- A disposition file for every review, with each finding fixed, skipped with a reason, or refuted, and `open: 0` before close.
- Characterisation tests kept byte-identical across a refactor as before/after evidence (Phase 52's `CompileShell.test.ts`).
- One brief file per subagent in the scratchpad ("Read and follow …"), so prompts stay reviewable and reusable.

### Key Lessons
1. Write `requirements-completed` in each closing SUMMARY when the phase closes. A backfill at audit makes verification stale.
2. A plan-local id belongs in `.planning`, never in shipped source or test titles. The house-style gate should refuse it the way it refuses `ADR-QD-NEXT`.
3. Budget one re-verify per phase whose files a later phase touches. It has happened in every milestone so far.

### Cost Observations
- Model mix: opus for the orchestrator, planners and research. Sonnet for executors, checkers, reviewers, fixers, verifiers and the integration check.
- Sessions: one long autonomous run across several context compactions.
- Notable: 510 commits in about two days. Twelve discuss/research decisions, each answered once ("Accept all" or the recommended option). Tech debt accepted at the audit.

---

## Milestone: v1.6 — Arch Wave 11

**Completed:** 2026-11-19 (not merged, not released)
**Phases:** 9 | **Plans:** 83 | **Sessions:** one autonomous run (`/gsd-autonomous`), with context compactions

### What Was Built
- ARCH-100: one package-private `Operand.ts` owns the own-property read. This closed a live fail-open: the predicate reference interpreter's `row[p.column]` allowed a row that `evaluate` denies.
- ARCH-101: `LeafNeeds` turns every leaf's answer into a verdict, finishing ADR-QD-163.
- ARCH-102/103: a port card is a model row keyed by one `PortName`, and the gate-registry watch is the dock model's third scoped feed (Breaking, devtools and react).
- ARCH-104/105: `untrustedDecoder` takes a required unknown-key policy, and a stored record is its envelope in memory too (Breaking, core, http, devtools).
- ARCH-106: admission produces the one walk environment, typed by its row source. The phase opened on a benchmark gate, which passed with 0 of 35 workloads slower.
- ARCH-107/108: devtools' headless interface is its three feeds, and a `DecisionCache` is asked only the question while core runs the matching walk (Breaking, devtools and core).

### What Worked
- The three human checkpoints (59, 60, 61) were asked once each, before planning, with the evidence attached. All three were decided "pursue", and nothing was re-litigated afterwards.
- Each phase had a verbatim scan script with its SHA pinned in the plan. It caught out-of-scope edits and stale mutation evidence mechanically. Review rounds amended the scan in a `fix(NN)` commit instead of loosening it silently.
- Mutation evidence was dated by the newest commit touching either the after file or the static file. A re-run that leaves the after file byte-identical no longer looks stale.
- A type pin on an Effect-returning function goes through `Params<F>`, with a positive control and one deliberate break. This was learned in Phase 60 and applied from the start in Phase 61.

### What Was Inefficient
- Every review round that touched a source comment or a test forced a fresh Stryker run, plus a static run of about 4 minutes, and a commit. Phase 60 needed three, and Phase 61 two.
- Three phases (54, 56, 59) closed with `nyquist_compliant: false` left over from plan-phase's seed, although every row was green and the sign-off was ticked. The audit caught and corrected it.
- A plan's commit-shape verify compared a file to `phase_base` that an earlier plan of the same phase had created (61-03). The check's intent held, but the executor had to record a deviation.
- Gate 14's packed-install probe was extended for only one of the new public names, which is now carried as tech debt.

### Patterns Established
- Records name the party that sees each error. TS2559/TS2554 are what a caller gets, and TS2345/TS2322/TS2416 are what an implementer gets, each probed with `tsc` before it is written.
- An "owner decision → research → post-research decisions (D-11+)" sequence in CONTEXT. Choices left to discretion are recorded as decisions before planning, not left implicit.
- The review runs up to three iterations with a disposition file, and Info findings are fixed too when they cost no locked decision.

### Key Lessons
1. When a phase adds public names, its plan should extend gate 14's packed-install probe for every one of them, not a sample.
2. validate-phase must flip `nyquist_compliant` itself. A green map with a `false` flag is a recording slip that only an audit notices.
3. A commit-shape verify should compare against the commit that created the file when that commit belongs to the same phase, not against `phase_base`.

### Cost Observations
- Model mix: opus for the orchestrator, planners, research and reviewers. Sonnet for executors, fixers, auditors, verifiers and the integration check.
- Sessions: one long autonomous run across several context compactions.
- Notable: 436 commits in about two days. Three checkpoints and five discretionary choices were answered or recorded once. Tech debt was accepted at the audit.

---

## Milestone: v1.7 — Arch Wave 12

**Completed:** 2026-11-22 (not merged, not released)
**Phases:** 8 (62–68 and the inserted 68.1) | **Plans:** 60 | **Sessions:** one autonomous run (`/gsd-autonomous`), with context compactions

### What Was Built
- ARCH-109: negative type pins can fail. tstyche compiles with `floatingEffect` off, every negative pin has a passing same-subject twin, and the count is budgeted (`NOT_CALLABLE_PIN_BUDGET`).
- ARCH-110: gate 14 compiles every new public name through the packed `exports` map, and fails on an unprobed `make*Feed` or a vacuous probe.
- ARCH-111/112/113: one throwing devtools listener no longer silences the rest; only `admit` builds an `Admitted`; the decoder's `ignore` projection reads only declared keys. Two patch changesets, no Breaking change.
- ARCH-114/115: the two equivalent mutants and the race test's magic bound are gone, and every v1.6 close-out is a fix or a recorded decision.
- DEBT-01..06 (Phase 68.1): the bench harness balances arm order and fails loudly, the record scripts got corrected copies that re-checked every Phase 68 verdict, gate 14 bounds every child it starts, and all eight phases carry validated Nyquist records.

### What Worked
- Asking once when blocked. The busy host (load up to 177 from another session) was one question, "keep waiting"; after that the run waited in 30-minute windows and ran `check:pr` alone each time.
- Staleness as a script. `68-stale.mjs`/`68.1-stale.mjs` named exactly which phases a commit made stale, and a re-verify driver appended a section and replaced `covered_digest`, so the re-verification after the final inline fixes took minutes.
- A record keeps the tool that produced it. Phase 68's scripts stayed as recorded; corrected copies in 68.1 re-ran all ten verdicts, and none flipped.
- Nyquist validation by gate scripts and self-tests, not only vitest: all eight phases validated with zero gaps and no new tests.

### What Was Inefficient
- The first audit carried six fixable items, and fixing them took a whole inserted phase plus a second audit. The re-audit then carried five info findings that took one more inline round, `check:pr` and four re-verifications.
- `68.1-compare.mjs`'s fix regressed in review iteration 1 and needed a correct-by-construction rewrite (a parse-tree walk), then a third iteration; the iteration-3 fix had no fourth review.
- Long waits on a host shared with another session's vitest loop; one wait was killed by a signal with no output.

### Patterns Established
- A cross-cutting requirement (WX-*) is ticked only at the milestone audit; a phase-scoped tool (`phase.complete`) that ticks it is reverted.
- An info finding is checked against the codebase before fixing: IN-03's "convention" was the reviewer's misreading, and it needed no change.
- A gate's child process runs under the same timeout as every other child, and the server that child starts is killed with it. A first measurement caught an idle server and read the risk as narrow; a fourth review measured the busy case, which the gate's timeout actually hits, and the gate now kills that server.

### Key Lessons
1. Write the phase's record scripts with their own self-test that plants the defect class (rename, type-only edit) before trusting their verdicts.
2. Run the review's info findings at the end of the phase that raised them, not at the next audit; each deferral costs a `check:pr` and a re-verification sweep.
3. Keep `check:pr` alone on a quiet host; a run beside another vitest loop is not evidence.

### Cost Observations
- Model mix: opus for the orchestrator; sonnet for executors, fixers, checkers, verifiers, validation auditors and the integration check.
- Sessions: one long autonomous run across several context compactions.
- Notable: 383 commits in about three days; outside `.planning` only 78 files (+4,036 / −473) changed, most of it gate, test and spec work.

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Sessions | Phases | Key Change |
|-----------|----------|--------|------------|
| v1.0 | n/a | 9 | First GSD milestone; one phase per architecture-review finding |
| v1.2 | 1 (autonomous) | 9 | Decisions answered up front; per-file mutation baseline per phase (WX-05) and a re-check at close |
| v1.3 | 1 (autonomous) | 7 | A carried-debt ledger with a per-row closer; a mechanism spike with fixed criteria before a speculative phase |
| v1.4 | 1 (autonomous) | 6 | Spike evidence for every option before a human checkpoint; a milestone-wide mutation re-check and stale sweep in the last plan |
| v1.5 | 1 (autonomous) | 10 | Defects first with RED on base; a benchmark gate opening a phase; post-review mutation records; the audit fixes its own info findings |
| v1.6 | 1 (autonomous) | 9 | Pinned per-phase scan scripts; three human checkpoints asked once before planning; review fixes Info findings too, with a mutation re-run per round |
| v1.7 | 1 (autonomous) | 8 | Debt-only wave; an inserted cleanup phase after the first audit; staleness and re-verify as scripts; Nyquist validation by gate scripts and self-tests |

### Cumulative Quality

| Milestone | Tests | Coverage | Zero-Dep Additions |
|-----------|-------|----------|-------------------|
| v1.0 | vitest 3974+559+42, e2e 30 (Phase 07 UAT run) | core ≥95%, others ≥90% (enforced) | 0 |
| v1.2 | vitest 4400 (core/react/http/devtools/audit at audit), tstyche 233, e2e 30 | core ≥95%, others ≥90% (enforced); no touched file's mutation score fell | 0 |
| v1.3 | vitest 200 files / 4917 tests, tstyche, e2e 30 | 99.47% statements / 99.75% lines overall; no measured file's mutation score fell | 0 |
| v1.4 | vitest 5139 tests, tstyche, e2e 30 | core ≥95%, others ≥90% (enforced); all 15 touched files at their latest recorded mutation score | 0 |
| v1.5 | vitest 231 files / 5656 tests (+568, +43), tstyche, e2e 30 | core ≥95%, others ≥90% (enforced); full `pnpm check` with mutation green, every Stryker run ≥ 80 | 0 |
| v1.6 | vitest core 2649 + devtools 1647 (at audit), tstyche, e2e 30 | core ≥95%, others ≥90% (enforced); every phase's scoped Stryker compare held (no touched file's score fell) | 0 |
| v1.7 | vitest 242 files / 5985 tests, BDD 568, tstyche 759 assertions (both passes) | core ≥95%, others ≥90% (enforced); no touched file's mutation score fell in any phase | 0 |

### Top Lessons (Verified Across Milestones)

1. Re-verify at close: a later phase that touches shared files makes earlier verification stale (v1.0: 4 phases; v1.2: 3 phases; v1.3: 6 phases; v1.4: 3 phases; v1.5: 5 phases). v1.6 relied on each phase's own verifier plus the milestone integration check (2649 core and 1647 devtools tests at the audit head) instead of per-phase re-verification. v1.7 made it mechanical: a staleness script names the stale phases and a driver re-verifies them (63, 67, 68 and 68.1 after the final fixes).
2. Run review → fix after verification passes: it found warnings verification missed in every milestone.
3. Shape tooling inputs so tools can read them: v1.0's requirement ranges and v1.2's grouped traceability rows both forced hand edits.
