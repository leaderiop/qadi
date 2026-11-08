---
phase: 03-audit-archive-facts
plan: 03
subsystem: spec
tags: [spec, adr, audit-archive, traceability, changeset]

requires:
  - phase: 03-audit-archive-facts
    provides: "ArchiveFacts.ts (03-02) and ArchiveRoundTrip.test.ts (03-01), which the spec text now describes"
provides:
  - "BEH-QD-254 requires the reader to accept every bundle the writer writes and the order, claim and break to be computed once by archiveFacts"
  - "INV-QD-054 and INV-QD-130 Source and Enforcement name ArchiveFacts.ts and ArchiveRoundTrip.test.ts; headings unchanged"
  - "ADR-QD-110 (QADI-ADR-110) with index entry, ADR-QD-056 amendment and traceability rows"
  - "CCR-QD-387 register row and README change history; .changeset/archive-facts.md patch for @qadi/audit"
affects: []

plan_head_before: af4d8aafd3ac2ac00c1c52096622d5c229a0dd4d
plan_head_after: 1ad379be52e10fe2a944f9895873a4dfe511b67f

actuals:
  tokens: 9000
  tasks: 3
  commits: 2

tech-stack:
  added: []
  patterns:
    - "A rule that moves between modules is recorded as an ADR plus an amendment to the ADR that named the old home, not a CCR alone"

key-files:
  created:
    - spec/decisions/110-an-archives-facts-are-computed-once.md
    - .changeset/archive-facts.md
  modified:
    - spec/behaviors/33-audit-pipeline.md
    - spec/invariants.md
    - spec/overview.md
    - spec/decisions/index.yaml
    - spec/decisions/056-audit-companion-package.md
    - spec/traceability.md
    - spec/README.md

key-decisions:
  - "ADR-QD-110 and CCR-QD-387 were used as reserved: phases 1 and 2 had landed ADR-108/109 and CCR-385/386, so 110 and 387 were next free"
  - "INV-QD-054's Implication, including the not-cryptographic-tamper-evidence paragraph, was left untouched (T-03-05)"

requirements-completed: [ARC-01, ARC-02, ARC-03, ARC-04, XC-01, XC-02, XC-03, XC-05]

coverage:
  - id: D1
    description: "BEH-QD-254, INV-QD-054, INV-QD-130, the overview Source cells and ADR-QD-110 state where the archive's rules live and what the round trip enforces"
    requirement: ARC-04
    verification:
      - kind: command
        ref: "node scripts/spec-revise.mjs --check; pnpm spec:api; pnpm spec:verify:strict (21 PASS, 0 FAIL)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Every D-07 record exists: ADR-QD-110, CCR-QD-387 row, README change history, traceability rows, patch changeset"
    requirement: XC-02
    verification:
      - kind: command
        ref: "pnpm spec:verify:strict (index, ADR traceability, Document ID, links, section 4 test paths, CCR registration, revision headers)"
        status: pass
    human_judgment: false
  - id: D3
    description: "Phase gate: pnpm check:pr, with no budget, threshold or timeout moved"
    requirement: XC-01
    verification:
      - kind: command
        ref: "pnpm check:pr steps 1-12 passed in one run; step 13 pnpm example failed at its playwright install --with-deps (sudo); that example's typecheck, test, build and e2e were then run by hand; steps 15-17 (spec:website-examples, website, spec:publish) run by hand and passed"
        status: pass
    human_judgment: true
    rationale: "pnpm check:pr as a single command did not exit 0 in this environment (sudo-requiring playwright dependency install). Every other step ran and passed; a human or CI should confirm the one-command run where sudo is available."

duration: 20min
completed: 2026-11-08
status: complete
---

# Phase 3 Plan 03: Archive facts records Summary

**The spec now says the audit archive's order, claim and sequence break are computed once in `ArchiveFacts.ts`: BEH-QD-254 requires the reader to accept every bundle the writer writes, INV-QD-054 and INV-QD-130 name the new source and test, and ADR-QD-110 and CCR-QD-387 record the move with an amendment to ADR-QD-056.**

## Performance

- **Duration:** about 20 min, most of it `pnpm check:pr`
- **Completed:** 2026-11-08
- **Tasks:** 3 (Task 3 made no file change)
- **Files:** 2 created, 7 modified

## Accomplishments

- BEH-QD-254 has a new REQUIREMENT in its plain fence plus a short paragraph linking ADR-QD-110. BEH-33 is Rev 1.16.
- INV-QD-054's Source names `ArchiveFacts.ts`, `archiveFacts`, `verifiedArchiveFacts` and the `SequenceBroken` refusal; Enforcement adds the two new tests. INV-QD-130 gains the writer-to-reader sentence, the same Source and the round-trip Enforcement. Both headings and the disclaimer text are unchanged. `invariants.md` is Rev 1.81.
- `spec/overview.md` (Rev 1.72) changed Source cells only, so gate 13 still documents all 861 exports.
- ADR-QD-110 created at Rev 1.0 with decisions D-48-a to D-48-f, listed in `index.yaml`, amended into ADR-QD-056 (Rev 1.12), given a traceability section 3 row, and the two new test files given section 4 rows. Traceability is Rev 1.123.
- CCR-QD-387 row added after CCR-QD-386 in `spec/README.md` (Rev 1.120), whose change history records it.
- `.changeset/archive-facts.md` records a patch for `@qadi/audit`, not marked breaking.

## Task Commits

1. **Task 1: BEH-QD-254, INV-QD-054, INV-QD-130, overview cells, changeset** - `f53622c` (docs)
2. **Task 2: ADR-QD-110, index, ADR-QD-056 amendment, traceability, CCR-QD-387** - `1ad379b` (docs)
3. **Task 3: phase gate** - no commit (verification only)

**Plan metadata:** committed separately (docs: complete plan)

## Phase gate (Task 3)

`pnpm check:pr` was run from the repo root and did **not** exit 0 as a single command.

- Steps 1 to 12 of 16 passed: typecheck, lint, circular, test:tstyche, coverage (thresholds met), test:bdd, spec:examples, spec:verify:strict, spec:gates, spec:claims, spec:api, spec:package.
- Step 13, `pnpm example`, failed with `run-check: pnpm example failed (exit 1)`. Cause: that script's chain is `pnpm typecheck && pnpm test && pnpm build && playwright install --with-deps chromium && pnpm test:e2e`, and the `--with-deps` install needs root: `sudo: a terminal is required to read the password`, `Failed to install browsers`. This is an environment limit unrelated to the spec change. Its typecheck, test and build had passed before it.
- Run by hand to cover the rest of that step: `pnpm test:e2e` in `examples/nextjs-newsroom` gave 29 passed, 1 failed (`ssr.spec.ts:273`, "the user switcher reports the user it switched to", a click timeout on `form button[type=submit]`). Rerun alone it passed. No code in that example or in anything it imports was changed by this plan or phase 3's earlier plans beyond `@qadi/audit`. I treat it as a flake, not as proof; it was not investigated further.
- Run by hand, steps 15 to 17 (`pnpm mutation` is skipped by `check:pr`): `pnpm spec:website-examples && pnpm website && pnpm spec:publish` exited 0 (45 pages built; "9 package(s) and 6 document(s) agree on version (0.11.0)").

Phase one-statement gates, after the above:

- code lines stating `sequencedCount >= 2` in `packages/audit/src`: 1
- files containing `POSITIVE_INFINITY` in `packages/audit/src`: `packages/audit/src/ArchiveFacts.ts` only
- `packages/audit/src/SequenceBreak.ts`: absent
- `scripts/check-house-style.mjs` and `stryker.audit.mjs`: no diff since phase 3 began (their last commits are the wave 3 and wave 4 merges)

ADR-QD-110 and CCR-QD-387 were used as reserved. `grep -rln` for them, and for ARCH-48, found nothing in `spec` or `AGENTS.md` before this plan; ADR-QD-108/109 and CCR-QD-385/386 from phases 1 and 2 were already in place, so the new entries sit after them.

## Deviations from Plan

None - plan executed exactly as written. The only departure is operational: `pnpm check:pr` could not finish as one command for the sudo reason above, and its remaining steps were run by hand (see the gate section). No gate, budget, threshold or timeout was changed.

## Issues Encountered

- `pnpm example` needs sudo for `playwright install --with-deps`. Chromium was already installed under `~/.cache/ms-playwright`, so the e2e suite itself ran.
- One e2e test failed once and passed on rerun.

## Known Stubs

None.

## Threat Flags

None. T-03-05 is mitigated: INV-QD-054's Implication and its tamper-evidence disclaimer are unchanged, and ADR-QD-110, BEH-QD-254 and the changeset say "gap-and-duplicate" and never call the facts tamper-evidence. T-03-06 is mitigated: `pnpm spec:verify:strict` passed after Task 2 and again inside `pnpm check:pr`.

## User Setup Required

None.

## Next Phase Readiness

Phase 3 plans are complete. The one open item is a single-command `pnpm check:pr` run on a host where Playwright's dependency install can run (CI, or a host with sudo).

## Self-Check: PASSED

- Files exist: `spec/decisions/110-an-archives-facts-are-computed-once.md`, `.changeset/archive-facts.md`.
- Commits `f53622c` and `1ad379b` are ancestors of HEAD; `git rev-list --count` from the ledger base gives 2.
- `node scripts/spec-revise.mjs --check`, `pnpm spec:api` and `pnpm spec:verify:strict` exit 0.

---
*Phase: 03-audit-archive-facts*
*Completed: 2026-11-08*
