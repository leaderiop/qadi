---
phase: "QD-82"
slug: "qadiprovider-s-registry-has-one-owner-for-its-lifetime"
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_total: 29
threats_open: 0
asvs_level: 1
block_on: high
created: "2026-11-25"
---

# Phase QD-82 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

The ten plans register 28 numbered threats (T-82-01 to T-82-28) and `T-82-SC`, which each of the ten plans repeats as
its own row. `T-82-SC` is one threat here, so the register has 29.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| React lifecycle → registry lease | React runs an effect's cleanup on a StrictMode double effect, every `<Activity>` hide and unmount, and gives no sign which; the lease must answer every order of hold and release | `hold` / `release` calls; the recycle's one deferred run |
| Lease → provider registry | A recycle clears every node (`reset()`); a consumer revealed later subscribes to what is left | The registry's nodes, the written-back subject |
| Server seed → client registry | A hydration seed or `initialValues` entry is not an authority and must not stand after the registry is recycled | Seeded allows, host atoms |
| Host code → provider registry | A host holding its own `registry.subscribe` or `mount` sits outside the lease's rule | A direct subscription |
| Last committed props → the recycle's subject write | The recycle re-seeds the subject of the last commit whose effects ran, so a prop changed while hidden is read one frame late | `latestRef` (atoms, subject) |
| Scratch edit, test, harness → committed tree | An instrumented provider or a left-over harness would ship test-only behaviour | Files under `packages/` |
| Decision record, specification, changeset, website page → readers | ADR-QD-195, the amended ADRs, BEH/INV records and the changeset state what the code does and what a host loses | Claims about behaviour |
| Working tree → mutation record; close record → the phase's claim | The base and close Stryker records stand for the source they were measured on | Scores, survivors, head commits |
| Archived checks and base facts → this phase's evidence | Phase 79, 80 and 81 checks re-run from scratch copies; the base's gate lines | Pass/fail lines |
| The phase's commits → the branch → the package registry | Commits on `arch-wave-15` (never pushed); a version, tag or publish would ship the change outside review | Files staged, trailers, manifests, lockfile |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation / evidence | Status |
|-----------|----------|-----------|----------|-------------|-----------------------|--------|
| T-82-01 | Tampering | `82-mutation-base.json`, the close-only judge | medium | mitigate | The base record's `head` is `phase_base` 16f09f77 (the plan's `d8b8bfa3` differs from it in no file outside `.planning/`); `82-mutation.mjs` `dirtyReasons` (line 47) refuses a record from a modified tree, the invocation check `reportReasons` (lines 51-56) refuses a report another invocation made, and `judgeNew` (lines 203-218) refuses an open, Ignored, Timeout or outside-killed mutant, each driven by the self-test (49 passed at audit); 9930fb28 is the only commit touching the record | closed |
| T-82-02 | Repudiation | base facts, archived-check lines | low | mitigate | The reservation file's sha256 (`.git/qadi-reserved-ids.json`) is e9c52607… both in `82-01-SUMMARY.md` and in a fresh run; api-surface 942 is the base's and is unchanged at the close; house-style 607 → 610 is the three added files; `81-archived-checks.mjs` re-run at audit prints the five lines the base recorded, byte for byte (the one failing line is `79-pinned-check.mjs` on TF29, Phase 81's flip) | closed |
| T-82-03 | Tampering | `82-check.mjs` (`single-owner`) | medium | mitigate | `82-RED-EVIDENCE.md` § "82-01 the check helper" shows each run mode failing once (`trailers` through the judge the self-test drives) and `single-owner` failing on the base with exactly its seven reasons; `--self-test` 147 passed at audit; `single-owner` exits 0 now; scratch edits restored (`git status --porcelain` over `packages`, `spec`, `.changeset`, `apps`, `stryker.react.mjs` is empty, no `*scratch*` file under `packages/react`) | closed |
| T-82-04 | Denial of service | `QadiProvider` revealed after a long hide | high | mitigate | `QadiProvider.lifetime.test.tsx` LT1 (line 261), LT2 (282), LT3 (314) and LT4 (346) assert nothing is thrown and the decision renders; red on the base with three `registry is disposed` errors (`82-RED-EVIDENCE.md` lines 36, 66, 71, 76); green at audit (3 files, 41 tests, exit 0); the provider recycles with `registry.reset()` (`QadiProvider.tsx:284`) and holds no `dispose(` | closed |
| T-82-05 | Tampering | `QadiProvider.tsx` during scratch runs | medium | mitigate | Every scratch edit was a copy-backed edit restored with `cp`, recorded in `82-RED-EVIDENCE.md` (the variants, the instrumented commit-order run, the review-fix table); at audit `QadiProvider.tsx` holds no `globalThis`, `console.`, `PROVIDER ` marker or `dispose(`, `CommitOrder.scratch.test.tsx` is absent, `git status --porcelain -- packages` is empty and `scan-forbidden` exits 0 | closed |
| T-82-06 | Spoofing | the subject a revealed consumer reads | high | mitigate | LT6 (line 394) hides, changes the subject while hidden, waits past the release and reveals: the consumer reads `["u1", "u2"]` and settles on `subject:u2`, in one registry (`r.seen.size` 1); LT13 (590), LT16 (635) and LT17 (661) pin the first frame; red on the base (`82-RED-EVIDENCE.md` line 82); a render-phase write of `latestRef` fails LT6 alone. The first frame of a reveal after a change made while hidden reads the last committed subject, the one-frame window BEH-QD-067 Rev 2.8 already accepted for a subject change; ADR-QD-195 decision 4 and its table row 134, BEH-QD-749 and the provider comment (`QadiProvider.tsx:265-268`) record it | closed |
| T-82-07 | Elevation of privilege | a seeded allow after a long hide | high | mitigate | `initialValues` is read only inside `registryRef.current ??=` (`QadiProvider.tsx:239-244`) and the recycle writes only `latestRef.current.atoms.subject` (line 286); LT9 (465), LT10 (491) and LT11 (513) assert, frame by frame, that no allow renders (`expect(frames).not.toContain(true)`) and the gate reads `pending` or the client's own denial; red on the base (lines 138, 147, 153); the `skip` variant fails LT9, LT10, LT15 | closed |
| T-82-08 | Repudiation | hydration mismatch reports | low | mitigate | LT11 asserts `expect(mismatches).toHaveLength(1)` across a long hide with a re-render (line 540), where the base reports twice; ADR-QD-195 table row 140; BEH-QD-750 | closed |
| T-82-09 | Denial of service | the sweep bound across a long hide | medium | mitigate | LT12 (line 548) begins a pressure episode while hidden and asserts `sweeps` equals `forks`, each fork saw exactly the sweeps before it, and the gate's question is asked once; a scratch edit making `SweepScheduler.request` return early fails LT12 alone (`expected +0 to be 1`); `SweepScheduler.ts` is 21/21 in the compare, unchanged | closed |
| T-82-10 | Information disclosure | a straggling read after unmount | low | accept | Accepted (AR-82-01). LT14 (line 613) pins that the read throws nothing and the node is gone a macrotask later (`registry.getNodes().has(decision)` is `false`); ADR-QD-195 states the trade at "The accepted trade" (line 191) and table row 142 | closed |
| T-82-11 | Denial of service | `makeRegistryLease`, a release while held | high | mitigate | A hold from `Releasing` calls `cancel` (`RegistryLease.ts:64-67`); both state matchers are `Match.tagsExhaustive` over the closed union (lines 60-76); RL1 (`RegistryLease.test.ts:46`), RL5 (118) and RL10 (207) pin it; the compare judges the lease absolutely: 28/28, 0 survived, 0 no coverage, 0 ignored, 0 timeout (the first run's one survivor, line 74, was closed by RL10, c9154405) | closed |
| T-82-12 | Tampering | the lease's state after a throwing recycle or defer | medium | mitigate | `fire` sets `Unheld` before it calls `recycle` (`RegistryLease.ts:56-59`) and `state` takes `afterRelease`'s result only once `defer` has returned (lines 73, 81-83); RL7 (162) and RL8 (184) pin both; LT18 (691) pins the provider's side | closed |
| T-82-13 | Elevation of privilege | the lease reached from outside the package | low | mitigate | No `RegistryLease` in `packages/react/src/index.ts`; `QadiProvider.tsx` is the only importer in `packages/*/src`; `packages/react/package.json` `exports` is the one `.` entry; `spec/overview.md` is unchanged and api-surface reads 942; `single-owner` exits 0 | closed |
| T-82-14 | Denial of service | `QadiProvider` after a long hide | high | mitigate | `registry.reset()`, never `dispose()` (`QadiProvider.tsx:284`); LT1 to LT4 pass; the `dispose` variant fails LT1 and LT14 (and 13 more) per `82-RED-EVIDENCE.md` § "the fix's variants" | closed |
| T-82-15 | Elevation of privilege | a seed after a recycle | high | mitigate | The recycle writes the subject only (`QadiProvider.tsx:282-288`); LT9 to LT11 pass; the `skip` variant (no cleanup, so a retained grant) fails LT9, LT10, LT15 and the edges unmount test; BEH-QD-750 and ADR-QD-195 decision 5 | closed |
| T-82-16 | Spoofing | the subject after a recycle | high | mitigate | `latestRef` is written in an effect from committed props (`QadiProvider.tsx:269-272`) and read by the recycle (line 286); LT6, LT13, LT16, LT17 and LT18 pass; the `noreseed` variant fails LT13, the render-phase write fails LT6, a stale atom set fails LT17, a missing `finally` fails LT18 alone (`82-RED-EVIDENCE.md`); the one-frame window is the one recorded at T-82-06 | closed |
| T-82-17 | Tampering | a host's direct subscription | low | accept | Accepted (AR-82-02). LT15 (line 735) pins the detach; stated in the provider's header doc (`QadiProvider.tsx:30-32`), ADR-QD-195 (line 188), BEH-QD-067's note (`09-react.md:340-354`), BEH-QD-750 and the changeset | closed |
| T-82-18 | Repudiation | ADR-QD-195's commit order | medium | mitigate | ADR-QD-195 lines 83-85 are the three `ORDER` lines of `82-RED-EVIDENCE.md` § "observed commit order with the lease", printed by an instrumented run; the scratch harness is absent | closed |
| T-82-19 | Tampering | amended ADRs | low | mitigate | Diffed against `phase_base`: ADR-QD-014 has no removed line, ADR-QD-148 and ADR-QD-149 lose only their Revision and Change History rows; the amendments sit beside the past text | closed |
| T-82-20 | Repudiation | BEH-QD-067's note, BEH-QD-750 | medium | mitigate | BEH-QD-067's note (`09-react.md:340-354`) states the subjectless pending seed (`LT10`, `LT9`) and the detached host subscription (`LT15`); BEH-QD-750 (lines 1191-1225) lists both losses and names LT9, LT10, LT11, LT15 and the edges unmount test | closed |
| T-82-21 | Tampering | the spec's claims | low | mitigate | BEH-QD-746 to BEH-QD-750 and INV-QD-409 and INV-QD-410 each name their tests; strict traceability passes 21/0 and doc examples compile in `pnpm check:pr` exit 0 | closed |
| T-82-22 | Repudiation | the changeset | medium | mitigate | `.changeset/react-registry-recycled-in-place.md` (`"@qadi/react": patch`) names pending after a long hide, a host atom returning to its default, a detached host subscription, and that no export changes | closed |
| T-82-23 | Tampering | the public surface | medium | mitigate | api-surface 942 equals the base's; `git diff 16f09f77 HEAD -- spec/overview.md` is empty and no upgrade guide is in the range's file list; `pnpm spec:package` exit 0 (9 packages, 527 runtime exports) | closed |
| T-82-24 | Elevation of privilege | a release from this branch | high | mitigate | No tag contains `phase_base`; the range lists no `package.json`, lockfile or CHANGELOG; the changeset is tracked and unconsumed; `arch-wave-15` has no remote ref, so it was never pushed | closed |
| T-82-25 | Tampering | `82-mutation-close.json` | medium | mitigate | The close's `head` is 56fd5e57, taken after the review fixes, and nothing outside `.planning/` changed from it to the audited head; each record checks its invocation and that the measured files equal HEAD (`dirtyReasons`); `compare` exits 0 at audit: `RegistryLease.ts` 28/28 absolute, `QuestionBook.ts` 85/88 → 86/88 with 3 → 2 survivors, the other three files unchanged, no new Ignored mutant | closed |
| T-82-26 | Repudiation | test-before-fix | low | mitigate | `git merge-base --is-ancestor` holds for 9e71d664, cab1e0ce, f5e03744, 1e003037 and 57f3bff6 (the lifetime tests) against 8cc55c1e (the provider fix), and for e0be9a0e (RL tests) against d7fc1f1e (the lease). The review fix d8b30584 precedes the pins 80c70d55 and 2042d271; their red is the scratch-variant table in `82-RED-EVIDENCE.md` § "review fixes" | closed |
| T-82-27 | Elevation of privilege | a release from this branch | high | mitigate | As T-82-24: no tag, no CHANGELOG, no version change, changeset unconsumed, no push; no commit subject in the range is a version, publish or merge | closed |
| T-82-28 | Repudiation | requirement completion | low | mitigate | `.planning/REQUIREMENTS.md` marks LEASE-01 to LEASE-05 `[x]` and `Complete` (lines 23-27, 82-86), in 7b3d5deb after `pnpm check:pr` and `pnpm spec:package` exited 0, with the gate facts in `82-10-SUMMARY.md` | closed |
| T-82-SC | Tampering | package installs | high | mitigate | `git diff 16f09f77 HEAD` (and from `d8b8bfa3`) over `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml` and `packages/*/package.json` (9 manifests matched) is empty | closed |

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-82-01 | T-82-10 | After a true unmount a straggling `registry.get` recreates a node instead of throwing; the node holds nothing alive and is removed a macrotask later (LT14), and the registry is unreachable with the provider. Recorded as the accepted trade in ADR-QD-195 | Plan 82-03 threat register (accept) | 2026-11-25 |
| AR-82-02 | T-82-17 | A recycle detaches a subscription a host holds directly on the registry (`registry.subscribe`, or `mount`, reached through `RegistryContext`); this package's own hooks have already unsubscribed. It adds no state and crosses no process boundary, and it is stated in the provider's header doc, ADR-QD-195, BEH-QD-067, BEH-QD-750 and the changeset | Plan 82-05 threat register (accept) | 2026-11-25 |

Both accepted risks are low severity and below the `high` block threshold.

Residual noted, not a register entry: after a hide in which the subject changed, the first frame of the reveal reads the
last committed subject and the provider's subject effect then writes the new one. It is the one-frame window BEH-QD-067
already accepted for a subject change and it sits under T-82-06 and T-82-16, closed above; LT6 pins both frames.

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-11-25 | 29 | 29 | 0 | gsd-security-auditor (ASVS L1, block_on high), at 24213323 (source, tests, spec and changeset identical to 4ec88995 outside `.planning/`) |

Checks run at audit, from the repository root with stdin closed: the three react test files (`QadiProvider.lifetime.test.tsx`,
`RegistryLease.test.ts`, `edges.test.tsx`: 41 passed); `82-mutation.mjs compare` (exit 0) and `--self-test` (49 passed);
`82-check.mjs` `single-owner`, `scan-ids`, `scan-forbidden` (exit 0), `trailers` (38 plan commits, each with one trailer) and
`--self-test` (147 passed); `81-archived-checks.mjs`. Every one of the 48 commits in `16f09f77..HEAD` carries exactly one
Claude trailer, and none lists `.planning/config.json`, `.planning/state.json`, `.agents/`, `.codex/`, `*.iter*.md`,
`.review-diagnostics/` or `.gitkeep`. Facts cited from the orchestrator's run at 4ec88995: `pnpm check:pr` exit 0 (17 of 18
steps, 6613 unit tests, BDD 568, strict traceability 21/0, api-surface 942), `pnpm spec:package` exit 0.

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-11-25
