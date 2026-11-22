---
phase: "68"
slug: "hygiene-and-recorded-close-outs"
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
created: "2026-11-21"
---

# Phase 68 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

The phase changes six `packages/*/src` files and tooling around them:
- `Admission.ts` reads `policy`, `maxDepth` and `subject` of the question once (`const { policy, maxDepth, subject } = question`).
- `TimelineFeed.ts` starts the refilling read in a `finally` after the emptied timeline is published, so a throwing listener stops no read.
- `DecisionLog.ts`, `SinkCodec.ts`, `UntrustedDecode.ts` and `DiagnosticsFeed.ts` get comment, wrap and wording edits.

It also fixes gate scripts (`check-package-install.mjs`, `run-tstyche.mjs`, `check-house-style.mjs`, `spec-revise.mjs`, the bench harness and the Phase 65 to 67 record scripts), amends spec texts, re-verifies the stale reports of Phases 62 to 67, and records the open items OI-01..OI-29. It adds no export (939 before and after, 524 runtime exports in gate 14), no network, auth, file or schema surface, and one `@qadi/devtools` patch changeset.

Its threats are:
- a weakened or false-green gate;
- a mutation, bench or verification record that is not what it claims;
- a source change that leaves a plant behind or widens a trust boundary;
- a release made without the owner.

Run order: the owner reordered the run on 2026-11-21, so 68-06 to 68-09 ran before the bench 68-05 because the host was busy (commit `b34cf1e5`). The bench commit is `17dfa4ef`, and `git diff --stat 17dfa4ef..HEAD` over `packages/*/src`, `packages/*/bench` and `package.json` is empty.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| `Admission.admit` → the walk | the question's fields are read once, then the depth gate and the environment use that one read | policy, `maxDepth`, subject (an authorization input) |
| `TimelineFeed.configure` → listeners | a listener's throw must not stop the read that refills the timeline | feed state, a thrown value |
| gate 14 → packed packages, child processes | the packed artifact is installed and a consumer authorizes through its `exports` map | tarballs, child process output |
| record scripts and reports → the milestone audit | a verification, mutation or bench record is trusted by later phases | scores, digests, verdicts |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Evidence | Status |
|-----------|----------|-----------|----------|-------------|----------|--------|
| T-68-01 | Tampering | blocks extracted from the 68-01 plan | medium | mitigate | 68-01-SUMMARY line 149: every extracted tool present at its planned SHA-256; `bench/workloads.txt` `e858c90a...`; the tools run and pass today (`analyze.mjs --self-test` 21 passed, `68-mutation.mjs --self-test` 16 passed, `68-compare.mjs --self-test` 14 passed) | closed |
| T-68-02 | Tampering | `spec-revise.mjs` (a gate step) | medium | mitigate | `node scripts/spec-revise.mjs --check`: `every Revision matches its newest Change History entry`; the OI-18 fix is in `564818c0` (`spec-revise.mjs:70-72`, `dateFlag === -1 \|\| index !== dateFlag + 1`) | closed |
| T-68-03 | Repudiation | the bench gate | medium | mitigate | 68-01-SUMMARY: three planted gate defects (band widened by reference spread, geomean ignored, workload read by position) each fail a named case; `analyze.mjs --self-test` now 21 passed | closed |
| T-68-04 | Tampering | `68-mutation-base.json` | medium | mitigate | `node 68-mutation.mjs compare` reads both JSON files and passes; the scorer's three plants m1 to m3 fail named cases (16 passed); base commit `4813c67c` is the plan's only commit | closed |
| T-68-05 | Denial of service | Stryker beside vitest | low | mitigate | 68-02-SUMMARY: `pgrep -fl "vitest\|stryker run"` empty before each run, runs in sequence; 68-12 and 68-15 state the same for their runs | closed |
| T-68-06 | Tampering | plants under `packages/*/src` | high | mitigate | `git diff 3d66becb..HEAD -- ':(glob)packages/*/src/**'` lists only the six planned files and `grep -c plant` over it is 0; `git status --short packages scripts spec features` is empty; 68-RED-EVIDENCE ends `red-check: all passed` for six RED tests and eight plants, with "no source modified". `red-check.sh` and the plant patches are scratch and not committed, so the trap itself was not re-run (see Not threats) | closed |
| T-68-07 | Information disclosure | `notify` reading a thrown value | medium | mitigate | `ExternalStore.test.ts:225` `const hostile = new Proxy(`, asserted by identity; 68-RED-EVIDENCE: `plant-es` (reads the value with `instanceof`) fails that test | closed |
| T-68-08 | Elevation of privilege | `admit` passing a deep policy judged shallow | high | mitigate | `Admission.test.ts:214,230,252` hold E11 to E13; `vitest run Admission.test.ts -t "E1[1-3] "`: 3 passed; 68-RED-EVIDENCE shows E11 to E13 failing on the base (`expected 10 to equal 3` for E12) | closed |
| T-68-09 | Elevation of privilege | `admit` (depth gate) | high | mitigate | `Admission.ts:114` `const { policy, maxDepth, subject } = question;` and `policyDepth(policy) > maxDepth` and `new PolicyTooDeep({ maxDepth })` use only those locals; E11 to E13 pass; mutation `Admission.ts` 20/20 base and close (`68-mutation.mjs compare`) | closed |
| T-68-10 | Denial of service | `TimelineFeed.configure` | medium | mitigate | `TimelineFeed.ts:178-187` `try { push(); } finally { readSource(next.source); }`; `vitest run TimelineFeed.test.ts -t "TF2[6-9]"`: 4 passed; the comment states the one residue (a status listener's throw replaces the timeline listener's), which TF29 pins | closed |
| T-68-11 | Tampering | comment-only edits | low | mitigate | `68-compare.mjs 3d66becb` on `StoredEnvelope.test.ts`, `Source.test.ts` and `FloatingEffectPins.tst.ts`: `same`; 68-compare self-test 14 passed (two plants fail) | closed |
| T-68-12 | Repudiation | the bench verdict | medium | mitigate | `68-BENCH.md`: gate fixed before the run (5% per workload, geomean +2%), one run, arm order `final-1 base-1 base-2 final-2 final-3 base-3`, `# workloads: 35`, `# slower: 0`, `# geomean_d_min_pct: 0.01`, `# gate: pass`; `analyze.mjs` rewrote `analysis.tsv` byte for byte (SHA-256 `c23e42fd...bb75`) after WR-03 (68-REVIEW-FIX) | closed |
| T-68-13 | Tampering | `packages/` during the bench | medium | mitigate | `git diff --stat 17dfa4ef..HEAD -- ':(glob)packages/*/src/**' ':(glob)packages/*/bench/**' package.json` is empty; the same pathspec over `3d66becb..17dfa4ef` lists the six edited files (not vacuous); the bench `head` is `769bf57c` and source is unchanged since | closed |
| T-68-14 | Tampering | a wording edit that changes a test | medium | mitigate | `68-compare.mjs 3d66becb` on `DecisionCache.test.ts`: `differs ... "sides = [ ]" became "capped = [ ]"`, which is the OI-14 deletion of `sides`/`oneSided` and nothing else (`git diff` over those identifiers shows only removals); the other three files `same` | closed |
| T-68-15 | Repudiation | the race test's strength after OI-14 | medium | mitigate | the `oneSided` assertion was redundant with `capped`; the diff removes only `sides`/`oneSided`; the race test's RED capability was proved in Phase 67 (67-RED-EVIDENCE) and `SharedComputation.ts` is not in this phase's diff; DecisionCache tests run green inside `check:pr` at `eb6d2f12` | closed |
| T-68-16 | Repudiation | INV-QD-375, BEH-QD-661, ADR-QD-172 | medium | mitigate | `grep pin-codes.mjs`: `spec/behaviors/05-evaluator.md:452` and `spec/decisions/172-...md:282` say the codes are read by the phase-record script `pin-codes.mjs` and only the literal pin has a positive control; `spec/invariants.md` Rev 1.168 | closed |
| T-68-17 | Tampering | the characterisation header | medium | mitigate | `FloatingEffectPins.tst.ts` `same` under `68-compare.mjs`; `pnpm test:tstyche`: 66 files, 348 passed, 2 skipped, 57 suppressed matched | closed |
| T-68-18 | Tampering | gate 14's guard (false green) | high | mitigate | 68-08-SUMMARY table: plants a, b, c fail naming their reason and d1, d2 pass, `pi-plants: all passed`; the plan-time record is that a, b, c passed the base and d1, d2 failed it, and that was not re-run against the base; gate 14 today: `package-install: 9 package(s) pack, resolve and authorize (524 runtime export(s))` | closed |
| T-68-19 | Denial of service | gate 14's children and read loop | medium | mitigate | `check-package-install.mjs`: `CHILD_TIMEOUT_MS = 600_000` on all eight `execFileSync` calls (lines 200, 221, 235, 356, 443, 832, 883, 903), `LIVE_TURNS = 200` (line 642), loop ends on `Stopped` (line 649); plants `stop` and `timeout` fail by name. The TypeScript API child is not bounded (see Accepted Risks, AR-68-02) | closed |
| T-68-20 | Tampering | `run-tstyche.mjs` filters | medium | mitigate | `run-tstyche.mjs:63-68` refuses any argument starting `-`; `--listFiles` is run without the filters (line 70); `pnpm test:tstyche` green | closed |
| T-68-21 | Tampering | plants on tracked files | medium | mitigate | `git status --short scripts packages spec features tstyche.json AGENTS.md` empty; `git diff --stat 3d66becb..HEAD -- tstyche.json AGENTS.md package.json` empty | closed |
| T-68-22 | Repudiation | Phase 66's scorer | medium | mitigate | `node 66-mutation.mjs compare` still passes on the committed record: `UntrustedDecode.ts with static mutants scored 46/48`, `no touched file's score fell`; plants p1, p2 are in 68-09-SUMMARY | closed |
| T-68-23 | Repudiation | Phase 67's dirty-tree refusal | medium | mitigate | `node 67-mutation.mjs --self-test`: `self-test: 17 passed`; `compare` passes | closed |
| T-68-24 | Tampering | completed-phase records | medium | mitigate | `git diff --name-only 3d66becb..HEAD` over Phases 62 to 67, minus `*-VERIFICATION.md`, lists only the three record scripts `pin-codes.mjs`, `66-mutation.mjs`, `67-mutation.mjs`; no JSON or Markdown record differs | closed |
| T-68-25 | Repudiation | ADR-QD-177, BEH-QD-656 | medium | mitigate | the residue text is in `ADR-QD-177`, `28-devtools-screens.md`, the README, the changeset, `TimelineFeed.ts` and `TimelineFeed.test.ts` (six files each state "rethrow"); `spec-revise --check` passes; `rethrow-gate.mjs` ran in verification (`8 statement(s) in 6 file(s)`) and is scratch | closed |
| T-68-26 | Information disclosure | ADR-QD-173 (D3) | low | mitigate | ADR-QD-173 Rev 1.2: "the port cards stay package-private"; `check-api-surface.mjs`: `939 export(s) documented across 9 package(s)` | closed |
| T-68-27 | Tampering | revision headers | low | mitigate | `spec-revise.mjs --check` passes; `bash spec/scripts/verify-traceability.sh --strict`: `PASS: 21 FAIL: 0 SKIP: 0`, rc 0 | closed |
| T-68-28 | Repudiation | the CCR-QD-459 row | medium | mitigate | `spec/README.md:396` cites eleven documents at their Revision (ADR-QD-033 Rev 1.4, 172 Rev 1.4, 173 Rev 1.2, 174 Rev 1.3, 175 Rev 1.5, 177 Rev 1.1, and the rest); WR-02's fix re-aligned them (68-REVIEW-FIX: `ccr-row: 11 document(s) cited at their current Revision`); strict traceability passes | closed |
| T-68-29 | Elevation of privilege | release (a version or publish without the owner) | high | mitigate | `git diff --name-status 3d66becb..HEAD -- .changeset CHANGELOG.md '*/CHANGELOG.md'`: one `A`, `.changeset/devtools-capacity-change-reads.md` (`"@qadi/devtools": patch`); newest tag is `@qadi/*@0.12.0`, none after the base; `git rev-parse arch-wave-12@{upstream}`: `no upstream configured`; the 73 commits carry no version, publish or tag step | closed |
| T-68-30 | Tampering | the Phase 61 archive | low | mitigate | `git diff --name-status` over `.planning/**/*61*/**` since the base: one `A`, `.planning/milestones/v1.6-phases/QD-61-decisioncache-is-asked-only-the-question/61-SETTLED-ITEMS.md` | closed |
| T-68-31 | Repudiation | `68-mutation-close.json` | high | mitigate | `node 68-mutation.mjs compare`: Admission 20/20 to 20/20, DecisionLog 66/66, SinkCodec 123/127, UntrustedDecode 44/46, DiagnosticsFeed 72/73 to 73/73, TimelineFeed 49/49 to 50/50, Ignored counts equal, `no file's score fell below its base`; `git diff 3d66becb..HEAD -- stryker.config.* vitest.config.*` empty; no source change since the close (`10880abb`) | closed |
| T-68-32 | Tampering | `// Stryker disable` | medium | mitigate | `git diff 3d66becb..HEAD -- . ':!.planning'` has 0 added lines containing `Stryker disable` | closed |
| T-68-33 | Elevation of privilege | an export added by the phase | medium | mitigate | `check-api-surface`: 939 exports; `check-package-install`: 524 runtime exports; no barrel or `spec/overview.md` path in `git diff --name-only 3d66becb..HEAD` | closed |
| T-68-34 | Repudiation | `62-VERIFICATION.md` | medium | mitigate | the diff since the base removes exactly one line (the old `covered_digest`) and adds 88 lines; the file ends with two `## Re-verification` sections, both `**Verdict:** passed`; `68-stale.mjs`: `62: current, verification 9a92e1d3, 33 cited, 0 changed since` | closed |
| T-68-35 | Tampering | a digest refreshed without a re-check | medium | mitigate | each of 62 to 67 has two re-verification sections and two `passed` verdicts, and each diff removes one line (the digest) and adds 83 to 91; `68-stale.mjs` ends `redo: none`; `sweep-check.mjs` is scratch and not re-run | closed |
| T-68-36 | Repudiation | the 63, 64 and 65 reports | medium | mitigate | same checks as T-68-35 for 63 (`510d731d`), 64 (`3b92bac7`) and 65 (`21977478`): original kept whole, `0 changed since`, verdict passed | closed |
| T-68-37 | Repudiation | the 66 and 67 reports | medium | mitigate | same checks for 66 (`94a90d66`) and 67 (`e07ea925`): original kept whole, `0 changed since`, verdict passed | closed |
| T-68-38 | Repudiation | a `check:pr` result that is not of the final tree | medium | mitigate | `check:pr` exit 0 is recorded at `eb6d2f12` (68-15-SUMMARY lines 110-111). The review fixes after it changed five non-planning files (`analyze.mjs`, `check-package-install.mjs`, `spec/README.md`, ADR-QD-033, `spec/traceability.md`). The orchestrator then ran `pnpm check:pr < /dev/null` once, alone, in the foreground on `5ee91190` (21:09:07–21:12:04, 2026-11-21): exit 0, no `ELIFECYCLE`, ending `run-check: ran 16 of 17 steps; "pnpm mutation" was skipped (release PRs run it).`; `git diff --quiet e07ea925 5ee91190 -- . ':!.planning'` holds, so this is the final tree's code. The re-stale sweep's own run after the fixes (on `e07ea925`, exit 0) was reported but not written down; this run is the recorded one | closed |
| T-68-39 | Elevation of privilege | a WX requirement, or a HYGN one before the gate, ticked | medium | mitigate | `git diff 3d66becb..HEAD -- .planning/REQUIREMENTS.md`: 28 changed lines, 0 naming WX-; the file holds seven `- [ ] **WX-0` lines; HYGN-01..07 were ticked in `0624aa3c`, after the `eb6d2f12` `check:pr` | closed |
| T-68-40 | Repudiation | an open item closed by neither a fix nor a record | medium | mitigate | 68-15-SUMMARY lists OI-01..OI-29 once each (29 distinct ids), 25 fixes and 4 records; every commit it names is in `git log 3d66becb..HEAD` (e.g. `faec4fab`, `2bea33b3`, `456be457`, `0136e327`, `ca9ffb18`, `35597a5c`); OI-26..OI-29 are recorded in the CCR-QD-459 row (`spec/README.md:396`); `oi-map-check.mjs` is scratch | closed |
| T-68-41 | Denial of service | `check:pr` run beside another heavy process | low | mitigate | 68-15-SUMMARY line 110: `pgrep -fl "vitest\|stryker run\|tstyche\|check-package-install"` printed nothing before the single foreground run | closed |
| T-68-42 | Repudiation | the capacity change's texts (OI-09) | medium | mitigate | six files carry the rethrow with its residue (see T-68-25); TF29 passes in the run above; `rethrow-gate.mjs` itself is scratch, and was run by the verifier only | closed |
| T-68-43 | Repudiation | a report re-staled after the sweep (the code review's fix step) | medium | mitigate | the fixes did re-stale 62 to 67 (68-REVIEW-FIX: `redo: 62 63 64 65 66 67`); commits `9a92e1d3`, `510d731d`, `3b92bac7`, `21977478`, `94a90d66`, `e07ea925` re-verified each; `68-stale.mjs` today ends `redo: none`; `68-reverify.mjs` is committed | closed |
| T-68-SC | Tampering | npm/pip/cargo installs | high | accept | `git diff --stat 3d66becb..HEAD -- package.json pnpm-lock.yaml pnpm-workspace.yaml` prints nothing; `git diff --name-only` since the base lists no manifest; gate 14 installs the repository's own packed packages under the existing lockfile | closed |

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-68-01 | T-68-SC | No dependency is installed, upgraded or removed in this phase | plan-time disposition (68-01..68-15) | 2026-11-21 |
| AR-68-02 | T-68-19 | One child of gate 14 has no timeout: the TypeScript server that `typescript/unstable/sync`'s `API` spawns and blocks on with `Atomics.wait`, which takes no timeout option. Bounding it would mean moving the whole parse into an `execFileSync`. It is stated, not fixed: `check-package-install.mjs:88`, ADR-QD-033 Rev 1.4 and the CCR-QD-459 row name it, and the other eight children are bounded | plan-time disposition and the review fix `8c3375fb` (WR-02) | 2026-11-21 |

*Accepted risks do not resurface in future audit runs.*

Not threats, recorded for the milestone audit:
- **Owner decisions.** The owner decided to absorb every open item, the sweep's scope (62 plus a staleness check of 63 to 67), the quiet-host rule, and the reorder of 68-06 to 68-09 before the bench (`68-CONTEXT.md`, `b34cf1e5`). Everything else in the register is a plan-time disposition.
- **Review.** It found three warnings, all fixed: `5d44982d` (a killed child names its cause), `8c3375fb` (the timeout text is narrowed to `execFileSync` children and the TypeScript server child is named as unbounded), `7aa1150b` (the analyzer checks its labels). Iteration 2 found 0 critical and 0 warnings.
- **IN-01:** an odd bench round count leaves the arm order unbalanced (`ab.sh:35-44`); the recorded run has 3 rounds.
- **IN-02:** a failing bench gate still exits 0, and the analyzer self-test is run by no gate.
- **IN-03:** `68-stale.mjs` can miss a renamed cited file or one outside its path roots.
- **IN-04:** the record scripts' self-tests compare source text, and `68-compare.mjs` does not compare types.
- **OI-26:** the Sonnet trailers left in published history are recorded only, in CCR-QD-459. No history was rewritten. The 73 commits of this phase all carry `Co-Authored-By: Claude Opus 5.5`.
- **Scratch tooling.** `red-check.sh`, the plant patches, `pi-plants.sh`, `rethrow-gate.mjs`, `sweep-check.mjs`, `oi-map-check.mjs` and `ccr-row.mjs` are not committed. Their results are quoted in the summaries and the verification, and where cited above the underlying state was re-checked directly.
- **Order.** The original close scan rejects the reordered commit order; the corrected copy passes 13 checks and still fails on a wrong order (68-12-SUMMARY).

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-11-21 | 44 | 43 | 1 | orchestrator, L1 grep verification (ASVS 1, register authored at plan time, auditor skipped by rule) |
| 2026-11-21 | 44 | 44 | 0 | orchestrator: T-68-38 closed by `pnpm check:pr` exit 0 on `5ee91190`, the final tree's code |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed (all 44 closed; T-68-38 closed by the recorded `check:pr` on `5ee91190`)
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-11-21
