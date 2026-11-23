---
phase: QD-76-remedies-uses-core-s-signature-match
plan: 07
subsystem: spec
tags: [spec, behaviours, invariants, traceability, adr, changesets, upgrade-guide, ccr]
phase_base: bf339146723bd1eabd1f08dd94f489d8480027ef
plan_head_before: ac768354c53d2c0c47eb64dca8595a35a23b2cce
plan_head_after: 64882d191f7d7a0087bdb502e5b9d7318ce98ea5

requires: ["76-06"]
provides:
  - "BEH-QD-716 to BEH-QD-720, INV-QD-397, INV-QD-398 and the dated notes on BEH-QD-410, BEH-QD-093, BEH-QD-260 and BEH-QD-222, each naming what holds it, every cited title read from its test file"
  - "ADR-QD-058 and ADR-QD-094 amended; ADR-QD-189 at 1.1 with 'What enforces it'"
  - "three changesets, the upgrade guide's 0.13 section and the CCR-QD-468 row"
  - "verify-traceability --strict at PASS 21 / FAIL 0 (146 ADRs, 170 invariants, 122 agreeing, 326 files)"
affects: [76-08]

actuals:
  tokens: 50000
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "a spec record cites a test by file and exact title, checked by evaluating the title's string literal, not by grepping its source line"

key-files:
  created:
    - .changeset/core-signature-answer-from-signatures.md
    - .changeset/http-port-error-members-optional.md
    - .changeset/devtools-remedy-asks-core-signature.md
    - .planning/phases/QD-76-remedies-uses-core-s-signature-match/76-07-SUMMARY.md
  modified:
    - spec/behaviors/06-services.md
    - spec/behaviors/12-history.md
    - spec/behaviors/23-http.md
    - spec/behaviors/29-devtools-simulator.md
    - spec/invariants.md
    - spec/traceability.md
    - spec/decisions/058-hassignature-a-ninth-service-and-a-decomposable-leaf.md
    - spec/decisions/094-a-port-is-described-once.md
    - spec/decisions/189-remedies-asks-core-whether-a-fixture-row-meets-a-signature-or-acted-leaf.md
    - spec/decisions/index.yaml
    - apps/website/src/content/docs/docs/reference/upgrading.md
    - spec/README.md

key-decisions:
  - "BEH-QD-717 and INV-QD-398 cite the two core 'on every case of the product' rows as the conformance of the one lookup; the devtools count titles stay with BEH-QD-718 and INV-QD-397"
  - "BEH-QD-410's note and its second requirement were edited in place; the older last paragraph (typed input never reaches the signature fixture's refusal branch) is left as written, as a dated note is an addition"

requirements-completed: []  # SIGM-05, WX-02, WX-03 and WX-07 are held by this plan but stay Pending: only 76-08 marks requirements

duration: about 35 min
completed: 2026-11-23
status: complete
---

# Phase 76 Plan 07: The fixture judgements stated, traced, amended and recorded

The spec states the two fixture judgements, the remedy table's reliance on them and the total refusal, each record naming the test titles, scripts and review that hold it; the ADRs, changesets, upgrade guide and CCR-QD-468 row record the change.

## Accomplishments

- **Behaviours and invariants** (Task 1): BEH-QD-716 and BEH-QD-717 follow BEH-QD-410 in `06-services.md`; BEH-QD-718 to BEH-QD-720 follow BEH-QD-223; INV-QD-397 and INV-QD-398 follow INV-QD-396; INV-QD-057's Source names `SignatureMatch.ts`. BEH-QD-410 names the history fixture and both judgements as consumers of the key and carries a dated note that the refusal is total; BEH-QD-093 lists `readonly event?: string | undefined;` with its note; BEH-QD-222 points at BEH-QD-718 and BEH-QD-719. The traceability matrix maps every new record, the two agreement tests and the two type tests, and BEH-QD-410 and ADR-QD-189 on the `SinkCodec.test.ts`, `QadiHttpError.test.ts` and `DecisionHistory.test.ts` rows.
- **ADRs and the response body** (Task 2): ADR-QD-058 and ADR-QD-094 each gain `## Amendment (2026-11-23, ADR-QD-189, CCR-QD-468)` after their last, with Status rows and index entries listing every amendment; ADR-QD-189 gains `## What enforces it` (compiler, the three scripts, the tests by exact title, the totality's mechanism, review, the acted evidence); BEH-QD-260 notes that the two history bodies carry a member only when the error has it.
- **Changesets, guide and CCR row** (Task 3): `@qadi/core` minor and `@qadi/http` minor, each with a `**Breaking.**` paragraph and the guide pointer, `@qadi/devtools` patch; the upgrade guide's appended `## 0.13:` section with its `| Change | Before | After |` table and no compiled fence; the CCR-QD-468 row directly after CCR-QD-467 listing all 36 paths, with the two sentences the plan names (the two exports where the milestone expected at most one; the three removed classes) and the reserved-ids sentence.
- No file under `packages/` or `scripts/`, no other file under `apps/`, and neither AGENTS.md nor `scripts/check-house-style.mjs` changed; no changeset command ran.

## Measured facts for later plans

### Spec revisions (all through `spec-revise`, README last)

| Document | Revision |
| -------- | -------- |
| `spec/behaviors/06-services.md` | 1.18 |
| `spec/behaviors/12-history.md` | 1.3 |
| `spec/behaviors/23-http.md` | 1.18 |
| `spec/behaviors/29-devtools-simulator.md` | 1.27 |
| `spec/invariants.md` | 1.202 |
| `spec/traceability.md` | 1.278 |
| `spec/decisions/058-...md` | 1.3 |
| `spec/decisions/094-...md` | 1.12 |
| `spec/decisions/189-...md` | 1.1 |
| `spec/overview.md` (76-04, unchanged here) | 1.135 |
| `spec/README.md` | 1.343 |

All as the plan predicted; none differed.

### verify-traceability --strict on HEAD (64882d19)

`PASS: 21   FAIL: 0   SKIP: 0`; decisions 146 entries and 146 ADRs traced; all 170 invariants traced; 122 ADRs agree; 5110 relative links resolve; 326 test files exist (322 plus the four new §4 rows). `check-doc-examples` 118 blocks compile; `check-website-doc-examples` 71 blocks compile; `check-dod-table` 26 steps match, 154 references resolve; `check-house-style` 584 files clean (3 declared switches, 74 type-test files); `spec-revise --check` passes.

### The CCR-QD-468 row

Directly after CCR-QD-467, dated 2026-11-23, 36 paths each in full: `spec/behaviors/{06-services,12-history,23-http,29-devtools-simulator}.md`, the three ADRs and `spec/decisions/index.yaml`, `spec/invariants.md`, `spec/overview.md`, `spec/traceability.md`, `spec/README.md`, the three changesets, the upgrade guide, 14 `packages/` source and test files and `scripts/check-package-install.mjs`, equal to `git diff --name-only <phase_base> HEAD -- packages spec scripts .changeset apps` (README included). Cited revisions: 06 1.18, 12 1.3, 23 1.18, 29 1.27, ADR-058 1.3, ADR-094 1.12, ADR-189 1.1, invariants 1.202, overview 1.135, traceability 1.278, README 1.343. It says plainly that core gained two exports where the milestone expected at most one, that `ActedEvent`, `ActedAnywhere` and `ActedAnywhereInput` were removed, the measured figures (agreement products 1184 and 144, 14 base acted divergences at `Any` scope), and that every reserved id was used.

### Changesets

- `.changeset/core-signature-answer-from-signatures.md`: `@qadi/core` minor, `**Breaking.**` naming the three removed classes, `ActedEventInput` staying, the two optional members and the fixtures' refusal; a paragraph naming both judgements; the guide pointer.
- `.changeset/http-port-error-members-optional.md`: `@qadi/http` minor, `**Breaking.**` for the two response bodies; the guide pointer.
- `.changeset/devtools-remedy-asks-core-signature.md`: `@qadi/devtools` patch.

### Cited titles

Between the new sections, notes and ADR-QD-189's enforcement list, the plan's verifies counted at least 28 (Task 1) and 14 (Task 2) cited titles, each a verbatim title of the cited file. Almost every title the phase added is written in its source with a `\` line continuation, so a plain `includes` on the source text cannot match it; see deviation 1.

## Task Commits

1. **Task 1 (tracer): behaviours, invariants and trace** - `f4358350` (docs) - `06-services.md`, `12-history.md`, `29-devtools-simulator.md`, `invariants.md`, `traceability.md`.
2. **Task 2: the two amendments, what ADR-QD-189 enforces, the response body note** - `70a1d56f` (docs) - ADR-058, ADR-094, ADR-189, `index.yaml`, `23-http.md`.
3. **Task 3: changesets, upgrade guide, CCR-QD-468** - `64882d19` (docs) - three changesets, `upgrading.md`, `spec/README.md`.

## Deviations from Plan

**1. [Verification-only] The title check of Tasks 1 and 2 cannot match a title written with a line continuation**
- **Found during:** Task 1 verify.
- **Issue:** the verify's `body.includes('"' + title + '"')` reads the source text, and most of the cited titles are string literals split with a trailing `\` and a newline (`it.effect("fails as \` / `SignatureHistoryUnavailable with ...")`). The title the test runner prints is the evaluated string, which is what the spec cites.
- **Fix:** ran the same verify with one clause changed, `body=rd(m[1]).replace(/\\\n/g, "")` (continuations joined, which is exactly what the literal evaluates to), and every other check unchanged; additionally read every cited title as an evaluated literal with a small extractor (`$TMPDIR/qd76/titles-07.mjs`). Both pass. Nothing was weakened and no title was reworded.
- **Files modified:** none.

**2. [Verification-only] `PASS: 21   FAIL: 0` before the README row exists**
- **Found during:** Tasks 1 and 2 verifies.
- **Issue:** as the run notes record, the CCR register coverage row reads FAIL until CCR-QD-468's README row lands in Task 3.
- **Fix:** Tasks 1 and 2 were checked for exactly `PASS: 20   FAIL: 1` with that one row, every other line unchanged; Task 3's verify ran unchanged and reads `PASS: 21   FAIL: 0` on the committed head.

**3. [Rule 1 - claim checked against the evidence] The CCR row's measured sentence**
- A first draft said the codec rows had each failed once on a scratch edit; 76-06's guts did not include one, so the sentence names only what was measured: the refusal rows and the response-body rows.

**Total deviations:** 1 Rule 1 wording correction made before commit, 2 verification-only. **Impact:** none on content; one verify was run through an equivalent form.

## Known Stubs

None.

## Threat Flags

None. T-76-17 and T-76-19 are mitigated as the plan states (every cited title checked, no section says a refused request throws); T-76-18 by the row-versus-diff comparison in Task 3's verify; T-76-27 by the two breaking changesets and the guide section.

## Issues Encountered

None.

## Next Phase Readiness

76-08 can read `bash spec/scripts/verify-traceability.sh --strict` at PASS 21 / FAIL 0 and `spec/README.md` at 1.343; every SIGM, WX and edge requirement is held but still Pending for 76-08 to mark.

## Self-Check: PASSED

Commits `f4358350`, `70a1d56f` and `64882d19` are ancestors of HEAD; the three changesets, the upgrade guide's section, the three new BEH sections and the two INV sections exist; the three task verifies pass on HEAD (Tasks 1 and 2 through the equivalent forms in deviations 1 and 2); `git diff --quiet 7fe82541 HEAD -- packages scripts` holds; nothing under `packages/` or `scripts/` was touched.
