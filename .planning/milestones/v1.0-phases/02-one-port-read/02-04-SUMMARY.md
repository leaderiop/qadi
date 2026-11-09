---
phase: 02-one-port-read
plan: 04
subsystem: docs
tags: [spec, overview, changeset, website, merge-gate, ports, qadi-core]

requires:
  - phase: 02-one-port-read
    provides: "02-01 and 02-02: pose/disclose, readPort, the signature requirement on the wire; 02-03: ADR-QD-109, BEH-QD-227/332, INV-QD-244, traceability rows"
provides:
  - "spec/overview.md describes pose, the two-argument disclose, SignatureQuery's requirement and SignatureAnswer's role, and names no PortWireSpan (gate 13 green)"
  - "the CCR-QD-386 register row in spec/README.md, listing every file the phase changed with each spec document's new Revision"
  - ".changeset/one-port-read.md, the phase's release note (minor for the fixed group, not marked Breaking, with the version-skew note)"
  - "the pending ARCH-31 changeset no longer announces PortWireSpan"
  - "the signatures and upgrading website pages describe the requirement and pose/disclose"
  - "the merge gate run: every step of pnpm check:pr green except one environmental step (see Issues Encountered)"
affects: [phase 02 verification, the 0.12 release]

actuals:
  tokens: 9200
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "a published-vs-unpublished check decides Breaking: names added after the last release and removed again are described as unreleased, not breaking"

key-files:
  created:
    - .changeset/one-port-read.md
  modified:
    - spec/overview.md
    - spec/README.md
    - .changeset/a-port-is-answered-remotely.md
    - apps/website/src/content/docs/docs/concepts/signatures.md
    - apps/website/src/content/docs/docs/reference/upgrading.md
    - packages/testing/test/TestLayers.test.ts

key-decisions:
  - "CCR-QD-386 inserted after CCR-QD-385 (phase 1 had merged); overview Rev 1.71, README Rev 1.119"
  - "The changeset is not marked Breaking: every reshaped or removed name (PortSpanAttributes' shape, PortWire.spanQuestion/spanAnswer, PortWireSpan) was added after @qadi/core@0.11.0 and never published; SignatureQuery only gains optional fields"
  - "The plan's own scope did not cover packages/testing, but a test there asserted the exact keys of a SignatureQuery; updating it is a consequence of the phase's type change, not a widening"

patterns-established:
  - "Pass --date to scripts/spec-revise.mjs (carried from 02-03)"

requirements-completed: [XC-01, XC-02, XC-03, XC-05]

coverage:
  - id: D1
    description: "spec/overview.md names every changed export and no PortWireSpan outside Change History; gate 13 passes"
    requirement: XC-03
    verification:
      - kind: other
        ref: "pnpm spec:api (861 exports documented across 9 packages), run in Task 1 and again inside pnpm check:pr"
        status: pass
    human_judgment: false
  - id: D2
    description: "The CCR-QD-386 row exists with spec-revise'd Revisions; the register-coverage and Revision checks agree"
    requirement: XC-02
    verification:
      - kind: other
        ref: "node scripts/spec-revise.mjs --check; bash spec/scripts/verify-traceability.sh --strict (PASS 21, FAIL 0, SKIP 0)"
        status: pass
    human_judgment: false
  - id: D3
    description: "The changeset records ARCH-47, the served span attributes, the throwing-store fix, the requirement, the key change, the skew note and the never-published removals; the ARCH-31 note drops PortWireSpan; website pages updated"
    requirement: XC-02
    verification:
      - kind: other
        ref: "test -f .changeset/one-port-read.md && grep -q ADR-QD-109 && grep -c PortWireSpan .changeset/a-port-is-answered-remotely.md = 0; pnpm spec:website-examples (40 blocks compile)"
        status: pass
    human_judgment: true
    rationale: "Whether the release note reads accurately to a consumer is a judgment; the checks confirm presence and compilation only"
  - id: D4
    description: "The merge gate: pnpm check:pr, with coverage thresholds held (core 95%, others 90%)"
    requirement: XC-01
    verification:
      - kind: other
        ref: "pnpm check:pr: typecheck, lint+house-style, circular, tstyche (148), coverage (3892 tests, thresholds met), BDD (559), spec gates, package install, example typecheck/unit/build all passed; the run stopped at `playwright install --with-deps chromium` (needs sudo). Remaining steps run by hand: playwright test:e2e 30 passed, spec:website-examples, website build, spec:publish all passed"
        status: pass
    human_judgment: true
    rationale: "pnpm check:pr itself exits 1 in this sandbox because one command inside `pnpm example` needs a sudo password; a human or CI with that permission should confirm the single end-to-end exit 0"

duration: 25min
completed: 2026-11-08
status: complete
plan_head_before: 4ba93c11fd2023730184d09aa5c03f3e5865851c
plan_head_after: a452adacdb43f6a5990dbe4c18a62ca44cd67764
---

# Phase 2 Plan 04: Overview, change control, release note and merge gate Summary

**spec/overview.md and the CCR-QD-386 register row now follow the one-port-read code, the changeset records it as unreleased-only reshaping with a version-skew note, and every merge-gate step passes; `pnpm check:pr` as one command stopped only at a sudo-requiring Playwright dependency install.**

## Performance

- **Duration:** about 25 min
- **Tasks:** 3
- **Files modified:** 7 (1 created, 6 modified)

## Accomplishments

- **Overview (gate 13):** `PortWireSpan` removed from the `PortWire` row, which now says the wire is JSON only and a span is the description's `attributes`. The `PortSpanAttributes` row names `pose` and the two-argument `disclose`; `SignatureAnswer` is what `askSignature` hands the walk, with `onFile` never recorded; the `SignatureQuery` row names the optional `meaning`/`signerRole` as context, never a filter. Revision 1.70 to 1.71 by spec-revise.
- **CCR-QD-386** added after CCR-QD-385, listing the ADR, the four amended ADRs, the two behaviour documents, the invariant (INV-QD-244), traceability, overview and README with their new Revisions, the source and test files, the website pages and both changesets, with the live defect, the fix, the requirement and key change, the D-03 choice and the nothing-published-breaks statement. README Revision 1.118 to 1.119.
- **Changeset** `.changeset/one-port-read.md` (`@qadi/core: minor`, fixed group carries the rest). It states the served signature span's new attributes, the throwing-store fix, the optional requirement and the key `[subjectId, resourceId, meaning, signerRole]`, the version-skew behaviour (`Malformed`, fails closed, upgrade servers with or before clients), and why it is not Breaking. `.changeset/a-port-is-answered-remotely.md` lost `PortWireSpan` from its "New:" list.
- **Website:** `concepts/signatures.md` documents `signaturesFor({ subjectId, resourceId?, meaning?, signerRole? })`; `reference/upgrading.md` ("0.12: a port states its wire") says what a port's span says lives on `attributes` and links ADR-QD-109.

## Task Commits

1. **Task 1: overview rows and CCR-QD-386** - `2e37699` (docs)
2. **Task 2: changesets and website pages** - `425d6fb` (docs)
3. **Task 3: merge-gate fallout, one test updated** - `a452ada` (test)

**Plan metadata:** the docs commit that carries this SUMMARY.

## ID usage

ADR-QD-109, CCR-QD-386 and ARCH-47 were consumed exactly as reserved. The invariant id used was **INV-QD-244** (INV-QD-243 had landed from phase 1).

## Decisions Made

See key-decisions. The substantive one: not labelling the release note Breaking, per D-09, because the reshaped names are unpublished (`@qadi/core@0.11.0` is `d0884e6`; ARCH-21 and ARCH-31 came later).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] `packages/testing/test/TestLayers.test.ts` asserted the exact keys of a signature query**
- **Found during:** Task 3 (`pnpm check:fast`)
- **Issue:** "asks subject-global and resource-scoped questions as different queries" compared the recorded calls to `{ subjectId, resourceId }`; since 02-01 the evaluator passes the requirement too, so the calls are `{ subjectId, resourceId, meaning: "approved", signerRole: undefined }`. This is the plan's own type change, surfaced late because 02-01/02-02 ran vitest only on `packages/core`.
- **Fix:** the expected calls include `meaning` and `signerRole`. The assertion still distinguishes the subject-global from the resource-scoped question.
- **Files modified:** `packages/testing/test/TestLayers.test.ts`
- **Verification:** the file passes (35 tests); the full coverage run then passed 3892 tests.
- **Commit:** `a452ada`

**2. [Rule 3 - Blocking, not worked around] `pnpm example` calls `playwright install --with-deps chromium`**
- See Issues Encountered. No budget, threshold or gate script was modified.

**Total deviations:** 1 auto-fixed bug, 1 environmental stop. **Impact:** none on content.

## Issues Encountered

`pnpm check:pr` exits 1 in this environment, at one command. Output tail:

```
BEWARE: your OS is not officially supported by Playwright; installing dependencies for ubuntu24.04-x64 as a fallback.
Installing dependencies...
Switching to root user to install dependencies...
sudo: a terminal is required to read the password; either use the -S option to read from standard input or configure an askpass helper
sudo: a password is required
Failed to install browsers
 ERR_PNPM_RECURSIVE_RUN_FIRST_FAIL  @qadi/example-nextjs@0.0.0 check: `pnpm typecheck && pnpm test && pnpm build && playwright install --with-deps chromium && pnpm test:e2e`
run-check: `pnpm example` failed (exit 1).
```

Everything before it passed in that run: typecheck, lint plus house-style, circular, tstyche (148 tests), coverage (151 files, 3892 tests, thresholds met), BDD (559), `spec:examples`, `spec:verify:strict` (PASS 21), the DoD table, devtools claims, API surface, package install, and the example's typecheck, 42 unit tests and `next build`. The browser binaries were already cached (`~/.cache/ms-playwright`), so I ran the steps after the failing command by hand: `pnpm test:e2e` (30 passed), `pnpm spec:website-examples` (40 blocks), `pnpm website` (45 pages built) and `pnpm spec:publish` (9 packages, 0.11.0). All passed. This is an environment limit (no sudo password), not a code failure, but it means a single `pnpm check:pr` exit 0 was not observed here; CI or a developer with sudo should confirm it. The mutation step is skipped by design in `check:pr`.

## Known Stubs

None.

## Threat Flags

None. Documentation, a changeset and one test assertion. T-02-11 (the changeset states the published-version fact and the skew behaviour), T-02-12 (gate 13 green twice) and T-02-13 (the whole suite run, no gate weakened) are mitigated as planned.

## Next Phase Readiness

Phase 2 has all four plans complete. Verification should confirm the single `pnpm check:pr` exit on a machine that can run `playwright install --with-deps`.

## Self-Check: PASSED

- Files: `.changeset/one-port-read.md`, the edited spec, changeset, website and test files and this SUMMARY exist.
- Commits: `2e37699`, `425d6fb`, `a452ada` are ancestors of `HEAD`.

---
*Phase: 02-one-port-read*
*Completed: 2026-11-08*
