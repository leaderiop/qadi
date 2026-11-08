---
phase: 06-dehydration-in-engine
plan: 02
subsystem: spec-records
tags: [spec, adr-amendment, ccr, traceability, changeset, hydration, arch-51]

requires:
  - phase: 06-dehydration-in-engine
    provides: "plan 06-01: dehydrateWith in HydrationEngine.ts, private payload builders, pinned dehydrateDecisions output and signature, engine round-trip test"
provides:
  - "BEH-QD-146's structural requirement: the payload builders are reachable only through dehydrateWith"
  - "INV-QD-022 and INV-QD-045 Source and Enforcement naming dehydrateWith and HydrationEngine.test.ts"
  - "ADR-QD-078 amendment (2026-11-08, ARCH-51, CCR-QD-390) and its index status"
  - "traceability rows for the three invariant/ADR rows and the three hydration test files"
  - "CCR-QD-390 register row and README change history"
  - ".changeset/dehydrate-in-engine.md, a patch for @qadi/react"
affects: [phase 6 verification]

actuals:
  tokens: 40000
  tasks: 3
  commits: 2
plan_head_before: 40794a41784622db7955235b7c6c293421406979
plan_head_after: 28e0cc1a353885dcd7e35fec9afbf0608e309f60

tech-stack:
  added: []
  patterns:
    - "A completed decision is recorded as a dated amendment, not a new ADR (ADR-QD-113 left unused)"

key-files:
  created:
    - .changeset/dehydrate-in-engine.md
  modified:
    - spec/behaviors/19-hydration.md
    - spec/invariants.md
    - spec/decisions/078-a-seed-is-its-own-type-and-the-payload-is-versioned.md
    - spec/decisions/index.yaml
    - spec/traceability.md
    - spec/README.md

key-decisions:
  - "ADR-QD-078 is amended, not superseded by ADR-QD-113: the amendment fits in one paragraph (D-08's threshold), so ADR-QD-113 is deliberately unused."
  - "CCR-QD-390 was free at execution time and used as reserved; no substitute was needed."
  - "The CCR-QD-390 row sits directly after CCR-QD-389 (the newest CCR row in the register's top block), since the register is not strictly numeric."

requirements-completed: [HYD-01, HYD-02, HYD-03, HYD-04, XC-01, XC-02, XC-03, XC-04, XC-05]

coverage:
  - id: D1
    description: "The spec states that the engine owns both directions of the payload: BEH-QD-146, INV-QD-022, INV-QD-045 and the ADR-QD-078 amendment"
    requirement: "XC-02"
    verification:
      - kind: other
        ref: "pnpm spec:verify:strict (PASS 21, FAIL 0) and node scripts/spec-revise.mjs --check"
        status: pass
    human_judgment: false
  - id: D2
    description: "Every D-08 record exists: amendment, CCR-QD-390, README line, 19-hydration.md requirement, traceability rows, patch changeset"
    requirement: "XC-02"
    verification:
      - kind: other
        ref: "Task 2 automated verify greps (amendment heading, index status, traceability HydrationEngine row, register row, no 113-* file)"
        status: pass
    human_judgment: false
  - id: D3
    description: "Public surface and quality gates unchanged: overview untouched, no budget, threshold or timeout moved"
    requirement: "XC-03"
    verification:
      - kind: other
        ref: "pnpm spec:api (862 exports documented); git log of scripts/check-house-style.mjs, vitest.config.ts, stryker.react.mjs shows no (06-0x) commit"
        status: pass
    human_judgment: false
  - id: D4
    description: "Phase gate pnpm check:pr: steps 1 to 12 pass inside the runner; step 13 (pnpm example) fails only at an environment-only sudo prompt, and its substance passes when run without it"
    requirement: "XC-01"
    verification:
      - kind: other
        ref: "pnpm check:pr stopped at step 13 on `playwright install --with-deps chromium` (sudo password); pnpm test:e2e in examples/nextjs-newsroom: 30 passed; spec:website-examples, website, spec:publish: pass"
        status: pass
    human_judgment: true
    rationale: "The runner itself exited non-zero at step 13 for a host reason (sudo needs a TTY). A human should confirm the gate on a host where `playwright install --with-deps` can run, or accept the split run recorded here."

duration: 3min (plus about 3 min of unattended pnpm check:pr)
completed: 2026-11-08
status: complete
---

# Phase 6 Plan 2: Record dehydration in the engine Summary

**BEH-QD-146, INV-QD-022 and INV-QD-045 now state that `dehydrateWith` owns the dehydrate partition and that the payload builders are unreachable elsewhere; ADR-QD-078 carries a dated amendment, CCR-QD-390 is registered, traceability cites the new tests, and a patch changeset is written.**

## Performance

- **Duration:** about 3 min of authoring, then `pnpm check:pr` (about 3 min of wall time)
- **Started:** 2026-11-08T05:55:22Z
- **Tasks:** 3 (two commits; Task 3 is verification only)
- **Files:** 6 modified, 1 created

## Accomplishments

- BEH-QD-146 gained a plain-fence REQUIREMENT plus one paragraph (what was wrong before, what ARCH-51 changed, bytes unchanged), linking the ADR-QD-078 amendment. Its heading, and INV-QD-022's and INV-QD-045's, are unchanged, so no anchor broke.
- INV-QD-022's Source and Enforcement and INV-QD-045's Source, Enforcement and Related name `dehydrateWith`, `HydrationEngine.test.ts` and ADR-QD-078.
- ADR-QD-078: `## Amendment (2026-11-08, ARCH-51, CCR-QD-390)`, one paragraph, body above untouched; Status row and `index.yaml` `status:` both end `amended 2026-11-08 (both directions in the engine)`.
- Traceability: INV-QD-022, INV-QD-045 and ADR-QD-078 rows, and the section 4 rows for `HydrationEngine.test.ts` (BEH-QD-146 first), `HydrationPayload.test.ts` and `Hydration.tst.ts`.
- README register row CCR-QD-390 and its change-history line; `.changeset/dehydrate-in-engine.md` (`"@qadi/react": patch`, not marked Breaking, per 06-01's clean D-09 grep).
- Revisions printed by `spec-revise`: `19-hydration.md` 1.14 to 1.15, `invariants.md` 1.83 to 1.84, ADR-QD-078 1.2 to 1.3, `traceability.md` 1.125 to 1.126, `README.md` 1.122 to 1.123.

## Task Commits

1. **Task 1: BEH-QD-146, INV-QD-022, INV-QD-045 and the changeset** - `10f7e06` (docs)
2. **Task 2: ADR-QD-078 amendment, index status, traceability, CCR-QD-390 row** - `28e0cc1` (docs)
3. **Task 3: phase gate** - no commit (verification only, no fix was needed)

## Phase gate outcome (`pnpm check:pr`)

`pnpm check:pr` did **not** exit 0 as a single run. Steps 1 to 12 passed inside the runner: typecheck, lint, circular, test:tstyche, coverage, test:bdd, spec:examples, spec:verify:strict (PASS 21, FAIL 0), spec:gates, spec:claims, spec:api (862 exports), spec:package. It then stopped at step 13/16, `pnpm example`:

```
> @qadi/example-nextjs check: pnpm typecheck && pnpm test && pnpm build && playwright install --with-deps chromium && pnpm test:e2e
(typecheck, vitest and next build all passed)
Installing dependencies...
Switching to root user to install dependencies...
sudo: a terminal is required to read the password; either use the -S option to read from standard input or configure an askpass helper
sudo: a password is required
Failed to install browsers
run-check: `pnpm example` failed (exit 1).
```

The failure is the host, not the code: `--with-deps` runs `sudo apt-get` and this session has no TTY. To cover what the runner could not, I ran the remainder by hand, changing no gate:

- `pnpm exec playwright install chromium` (no `--with-deps`, no sudo): browsers already present or installed.
- `pnpm test:e2e` in `examples/nextjs-newsroom`: **30 passed**, including the SSR suite that dehydrates through the public `dehydrateDecisions` ("seeded server rendering", "what crosses to the browser", "the browser half": mixed-payload, wrong-subject).
- `pnpm spec:website-examples`: 40 blocks compile. `pnpm website`: 45 pages built. `pnpm spec:publish`: 9 packages and 6 documents agree on 0.11.0.

So every step of `check:pr` passed except that its Playwright system-dependency install could not be run here. A maintainer should rerun `pnpm check:pr` on a host with passwordless sudo or system deps already installed to get a literal exit 0. No budget, coverage threshold, timeout or Stryker config was touched.

Phase 6 ROADMAP criteria 1 to 4, rerun after the gate:

```
c1 dehydrateEntry/dehydratedPayload not exported from HydrationEngine.ts   OK (count 0)
c2 Hydration.ts holds no countDropped / droppedEntriesReporter / .filter(  OK (count 0)
c3 git grep -l resolveMismatchReporter -- packages                         OK (empty)
c4 HydrationEngine.test.ts exercises dehydrateWith                         OK
c5 no (06-0x) commit touches check-house-style.mjs, vitest.config.ts, stryker.react.mjs   OK
```

## Decisions Made

- **CCR-QD-390** was free (`grep -rln "ADR-QD-113\|CCR-QD-390\|ARCH-51" spec AGENTS.md` listed nothing at start), so it was used as reserved; no `next-id.mjs` substitution.
- **ADR-QD-113 is deliberately unused.** The record is a one-paragraph amendment to ADR-QD-078 (D-08's threshold is "exceed a paragraph"). The STATE pending todo about the reserved number is resolved: 113 stays free.
- The register row went directly after CCR-QD-389, the newest CCR row in the register's first block (that block is not strictly numeric: older ARCH-45 rows follow it).

## Deviations from Plan

None - plan executed exactly as written. Line numbers in the plan's reading hints had drifted (other phases added rows), so edits were located by content; the ADR-QD-078 traceability row is at line 240, not 238, and the section 4 rows at 316 to 319. The intentional `spec/README.md` row text mentions `resolveMismatchReporter`; the Task 3 grep covers `packages` only, so it does not trip.

The `pnpm check:pr` environment failure above is recorded as an outcome rather than a deviation, since no code or plan change was involved.

## Requirements reconciliation (orchestrator note)

`.planning/REQUIREMENTS.md` already shows HYD-01..04 and XC-01..05 as `[x]` in the checklist (set by earlier waves/phases), so `requirements.mark-complete` has no checkbox work left for them. The traceability table rows `HYD-01..04 | Phase 6 | Pending` and `XC-01..05 | All phases | Pending` are the mismatch wave 1 saw: their ID is a range (`HYD-01..04`), which the tool does not match. The HYD row is Phase 6's alone and is updated to Complete by this plan's state step (see below); the XC row spans all phases (7 to 9 still pending) and is left Pending.

## Issues Encountered

`pnpm check:pr` could not complete step 13 on this host (sudo prompt); handled as described above.

## Known Stubs

None.

## Threat Flags

None. Only spec text, registries and a changeset changed; the changeset names only module names already published in `src/` (T-06-08).

## User Setup Required

None.

## Next Phase Readiness

Phase 6 is complete in code and records. Ready for phase verification; a literal `pnpm check:pr` exit 0 on a host with Playwright system dependencies is the one outstanding confirmation.

## Self-Check: PASSED

- Created/modified files exist: `.changeset/dehydrate-in-engine.md`, `spec/behaviors/19-hydration.md`, `spec/invariants.md`, ADR-QD-078, `spec/decisions/index.yaml`, `spec/traceability.md`, `spec/README.md`.
- Commits `10f7e06` and `28e0cc1` are ancestors of HEAD.
- `pnpm spec:verify:strict` PASS 21 / FAIL 0, `node scripts/spec-revise.mjs --check` exit 0, `pnpm spec:api` exit 0, no `spec/decisions/113-*` file.

---
*Phase: 06-dehydration-in-engine*
*Completed: 2026-11-08*
