---
phase: "74"
slug: "the-simulation-session-s-policy-choice-split-from-its-runs"
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
created: "2026-11-23"
---

# Phase 74 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

The phase moves the simulation session's policy choice into `@qadi/devtools`' package-private `SeededChoice.ts`. That
module is pure and immutable:
- **Transitions:** `seededChoice` and `seedFrom` answer a `Seeding`; `withSightings` and `choose` answer a
  `SeededChoice`. A transition that changes nothing answers its input reference.
- **Readings:** `policyChoice`, `policyOf`, `seedOf`, `seededFrom`, `menuOf` and `sightingAt`. They hold the pin rule,
  the orphan rule, the one menu list and the same-policy no-op.

`SimulationSession.ts` holds one `let choice`, writes the draft and its resource text only in `writeDraft`, and stops the
run and sets it `Idle` only in `clearRun`.

The three public types `PolicyChoice`, `PolicyMenu` and `PolicyMenuOption` are now declared in `SeededChoice.ts`. The
barrel names them from there with names and shapes unchanged, and `check-api-surface` still reads 941 exports. No
network, auth, file, dependency or manifest surface changes.

The threats are:
- a stale or wrong choice reaching a run;
- a run left in flight;
- a draft written twice;
- records, test moves, pins and mutation evidence that claim more than ran.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| host → simulation session | the sightings, the seed row, the menu position and the edits a host or the panel sends | host-supplied values the choice and the draft are built from |
| session → ports | the run the session starts against the live ports | the question (input, policy, seed) a run evaluates |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-74-01 | Tampering | mutation base measured on an already-edited tree | medium | mitigate | Both base groups record head `b22d97f9` (`phase_base`). The record was written by `45411e09`, the first commit after it, and no later commit touches it. The scorer refuses a dirty tree; its self-test pins that (37 passed). | closed |
| T-74-02 | Repudiation | helpers moved into `simulationFixtures.ts` | medium | mitigate | Across `ff758de0`, the `it(`, `describe(` and `assert.` lines of both session test files are identical (hashed whitespace-folded). Every removed line reappears in the fixtures, re-wrapped only. | closed |
| T-74-03 | Tampering | the characterisation edited to match changed behaviour | medium | mitigate | First commit `e25c8cfd` precedes the first source change, and it is recorded green 3/3 on the base. Later commits changed only its imports, header and 13 moved helper declarations. `74-characterisation-check.mjs` holds every row and every other statement to `e25c8cfd` (exit 0; self-test 49 passed). `git diff e25c8cfd HEAD` confirms no row's title, input, expected value or order changed. | closed |
| T-74-04 | Repudiation | ADR-QD-187 enforcement claims | medium | mitigate | "What enforces it" says which guarantees the compiler, the tests and review each keep, and every title it cites exists | closed |
| T-74-05 | Tampering | earlier records rewritten | medium | mitigate | ADR-QD-047, 137 and 150 are unchanged. In the behaviours, invariants and README documents, only Document Control cells were replaced, and each old Change History survives as the suffix of the new one. The BEH-QD-460, BEH-QD-466 and INV-QD-107 changes are dated additions. | closed |
| T-74-06 | Tampering | the moved public types | medium | mitigate | The barrel diff only re-points the three names to `./model/SeededChoice.ts`. Their shapes equal the base's, `surface.tst.ts` is unchanged, and api-surface reads 941. | closed |
| T-74-07 | Elevation of privilege | the menu's reverse lookup | low | mitigate | `sightingAt` reads the one menu list `menuOf` lists, and its leading entries carry no sighting, so the session chooses only through it. Pinned by characterisation rows and plain-value rows; the `lookup` gut failed 3 tests. | closed |
| T-74-08 | Denial of service | a run left in flight | medium | mitigate | `clearRun` stops the run (`runs.stop()`) and is called from `reseed`, `choosePolicy` and `setPorts`. Tests assert one interruption each, and each call was gutted once. | closed |
| T-74-09 | Tampering | the draft and its resource text | low | mitigate | Outside the declarations, the only `draft = ` and `resourceText = ` are inside `writeDraft`. Both of its rules were gutted once. Review alone keeps the single-assignment rule (ADR-QD-187, INV-QD-394), and it holds at HEAD by grep. | closed |
| T-74-10 | Repudiation | removed session tests | medium | mitigate | `81972903` removed exactly the 18 tests in the move table, and each has a survivor that exists. Review's two further removals (`3faf071c`) each name a characterisation survivor. | closed |
| T-74-11 | Tampering | tests that stay | low | mitigate | 82 tests remained after the move (100 − 18) and 80 after review. One test was retitled: its four dropped commands are each pinned by a characterisation no-op row (recorded). | closed |
| T-74-12 | Repudiation | Pinned-by / Enforcement citations | medium | mitigate | All 60 titles cited in the phase's spec additions exist verbatim in the file they name. The traceability §4 rows match each BEH's Pinned-by files. | closed |
| T-74-13 | Repudiation | CCR row omitting a file or citing a wrong revision | medium | mitigate | CCR-QD-466's 39 paths equal `git diff --name-only b22d97f9 HEAD -- packages spec`. Its 7 cited revisions equal the headers: ADR-187 1.2, 28 1.52, 29 1.26, invariants 1.189, overview 1.133, traceability 1.263, README 1.322. | closed |
| T-74-14 | Tampering | close measured on a tree that later changed / static mutants waved through | medium | mitigate | All three close groups are on head `1ae6035b`, and `packages/` has not changed since. `compare` exits 0. `EXAMINED`'s 11 static mutants were killed by hand (133/133). The `MOVED` pair (404:9 → 319:9) matches the source at both heads; see "The moved survivor". | closed |
| T-74-15 | Repudiation | requirements marked complete early or too widely | medium | mitigate | `2a03fc6f`, the only phase commit touching REQUIREMENTS.md, changes only the CHSE-01..05 lines. It came right after `check:pr` exit 0 on its parent `77ad0472`. WX-01..07 stay Pending. `check:pr` passed again on `6b706712` after code review. | closed |
| T-74-SC | Tampering | dependency installs (every plan) | high | mitigate | No `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml` or `.npmrc` changed since `phase_base`; nothing was installed | closed |

---

## The moved survivor (T-74-14)

The base survivor at `SimulationSession.ts` 404:9 is the seed disjunct of `stale`. It is the close survivor at 319:9
after the seed was hoisted into one `const`.

No test can kill it: `reseed` and `choosePolicy`, the only commands that move the seed, both end in `clearRun()`. The
disjunct is kept because BEH-QD-322 states staleness covers the form, the policy and the seed, and
`SimulationQuestion.seed` is public.

`74-mutation.mjs` pairs the two through `MOVED`, a reviewed record. An entry is admitted only while the base mutant sits
on a rewritten line and the close mutant is present. Four self-test cases pin it, including that the same survivor fails
without its entry.

---

## Accepted Risks Log

No accepted risks. T-74-SC is a `mitigate` threat in every plan, closed by the absence of any install.

Not threats, recorded for the milestone audit:
- **Plan-time checks superseded by code review:**
  - 74-07's "the characterisation has one commit" was replaced first by an import-only rule, then by
    `74-characterisation-check.mjs`;
  - its "self-test: 33 passed" is now 37, because of `MOVED`;
  - its session test count is now 80.
  Each is judged against the substance, not the plan-time literal.
- **Non-durable evidence:** the Stryker and `check:pr` logs live in session scratch directories. The durable record is:
  - `74-RED-EVIDENCE.md`;
  - the `74-REVIEW-FIX.md` reports;
  - `74-mutation-close.json`;
  - this file;
  - the passing tests.

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-11-23 | 16 | 16 | 0 | gsd-security-auditor at 6b706712 (ASVS 1, block on high; register authored at plan time, judged against the post-review code). Checks: `compare` and `--self-test`, the characterisation check and its self-test, revisions and file list, every Pinned-by title, the characterisation diff since its first commit. `check:pr` exit 0 on 77ad0472 at the close and again on 6b706712 after code review, 17/18 steps, mutation skipped by design. |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-11-23
