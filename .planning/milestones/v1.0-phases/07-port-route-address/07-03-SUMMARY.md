---
phase: 07-port-route-address
plan: 03
subsystem: verification
tags: [reconcile, gates, check-pr, spec, http, port-routes]
status: complete

requires:
  - phase: 07-01
    provides: "PortRouteAddress.ts, PORT_ROUTE_PREFIX, portPath, the three ARCH-52 describe blocks in PortRoutes.test.ts"
  - phase: 07-02
    provides: "BEH-QD-338, CCR-QD-391, traceability rows, the @qadi/http patch changeset"
provides:
  - "Confirmation that every name the phase's records cite exists in the built tree where the records say it does"
  - "Confirmation that CCR-QD-391's file list matches the phase's real diff (9 paths)"
  - "pnpm check:pr evidence: steps 1-12 green in one run, steps 13-16 green run individually"
affects: [phase 07 close-out, phase 08]

actuals:
  tokens: 0
  tasks: 2
  commits: 0
plan_head_before: 5e00ed2a970861c7ac2a35fd0f958712fb90f60b
plan_head_after: 5e00ed2a970861c7ac2a35fd0f958712fb90f60b

tech-stack:
  added: []
  patterns: []

key-files:
  created: []
  modified: []

key-decisions:
  - "No record needed correcting: Plan 02's names matched what Plan 01 built."
  - "ADR-QD-114 is not used by this phase and stays reserved for Phase 8 (ARCH-53)."

requirements-completed: [XC-01, XC-03, XC-04, XC-05]

coverage:
  - id: D1
    description: "The records' names and CCR-QD-391's file list match the built tree"
    requirement: "XC-03"
    verification:
      - kind: command
        ref: "git diff --name-only 1cb87a3 -- packages spec .changeset (9 paths, all in CCR-QD-391); grep of the default prefix in packages/http/src outside comments (1 hit, PortRouteAddress.ts:26)"
        status: pass
    human_judgment: false
  - id: D2
    description: "ROADMAP criteria 1 and 2 hold as gates"
    requirement: "XC-04"
    verification:
      - kind: unit
        ref: "vitest run of the ARCH-52 describe blocks in packages/http/test/PortRoutes.test.ts: 11 passed, 49 skipped"
        status: pass
    human_judgment: false
  - id: D3
    description: "The merge gate (pnpm check:pr) is green"
    requirement: "XC-01"
    verification:
      - kind: command
        ref: "pnpm check:pr steps 1-12 green in the run; step 13 failed on playwright install --with-deps (sudo); steps 13-16 then run individually and green"
        status: partial
    human_judgment: true
---

# Phase 7 Plan 03: Reconcile the records and run the merge gate Summary

**The records written in parallel by Plan 02 matched what Plan 01 built, so nothing needed correcting. Every spec and package gate is green, but the literal "`pnpm check:pr` exits 0" was not observed on this host: the run stopped at step 13 on a Playwright system-dependency install, and the user accepted the evidence below in its place.**

## Task 1: reconcile the records, run the phase gates

No record drifted, so there is no commit for this task.

- CCR-QD-391 lists all 9 paths that `git diff --name-only 1cb87a3 -- packages spec .changeset` reports for the phase.
- ROADMAP criterion 1: the default prefix appears once in `packages/http/src` outside comments, at `packages/http/src/PortRouteAddress.ts:26`. The grep count is 1.
- ROADMAP criterion 2: the vitest run of the ARCH-52 describe blocks (round trip under `/x/ports` in both route forms, the address unit, the status contract) gave 11 passed, 49 skipped.
- `node scripts/spec-revise.mjs --check` is OK.
- `pnpm spec:examples`: 101 blocks.
- `pnpm spec:api`: 862 exports across 9 packages, unchanged.
- `pnpm spec:verify:strict`: PASS 21, FAIL 0, SKIP 0.
- `pnpm spec:gates`: 25 steps match `pnpm check`, 139 references resolve.

## Task 2: `pnpm check:pr`

`pnpm check:pr` steps 1-12 were green inside the run: typecheck, lint with the house-style budgets, circular, tstyche, coverage, BDD, spec:examples, spec:verify:strict, spec:gates, spec:claims, spec:api, spec:package.

The run exited 1 at step 13/16, `pnpm example`. The failure is in the example's `check` script, at `playwright install --with-deps chromium`, not in any test or build. The log tail:

```
BEWARE: your OS is not officially supported by Playwright; installing dependencies for ubuntu24.04-x64 as a fallback.
Installing dependencies...
Switching to root user to install dependencies...
sudo: a terminal is required to read the password; either use the -S option to read from standard input or configure an askpass helper
sudo: a password is required
Failed to install browsers
Error: Installation process exited with code: 1
 ERR_PNPM_RECURSIVE_RUN_FIRST_FAIL  @qadi/example-nextjs@0.0.0 check: `pnpm typecheck && pnpm test && pnpm build && playwright install --with-deps chromium && pnpm test:e2e`
run-check: `pnpm example` failed (exit 1).
EXIT=1
```

Full log: `/tmp/claude-1002/-home-yopu-Project-Perso-qadi/1ceb8236-8846-4728-a046-04a7d30166e2/scratchpad/check-pr.log`. The same environment limit (Fedora host, no TTY for sudo) was recorded in the Phase 06 UAT.

Steps 13-16 were then run individually and are green:

| Step | Result |
| ---- | ------ |
| `pnpm --filter @qadi/example-nextjs test:e2e` | 30 passed |
| the example's typecheck, test and build | green |
| `pnpm spec:website-examples` | 40 blocks |
| `website` build | 45 pages |
| `pnpm spec:publish` | 9 packages, 6 docs, at 0.11.0 |

## Deviations from Plan

### Human-accepted deviation

**The literal "`pnpm check:pr` exits 0" was not observed on this host.** The plan's truth and requirement XC-01 ask for one `pnpm check:pr` run that exits 0. This host cannot run `playwright install --with-deps chromium` (it needs sudo and there is no terminal), so the run exits 1 at step 13 regardless of the tree's state. The remaining steps were run individually and passed. The user was shown this at the checkpoint and accepted the evidence as satisfying XC-01 on this host. The gate, the example script and the system packages were not modified. CI (`.github/workflows/check.yml`) is where `pnpm check:pr` will run in full.

Because XC-01 is recorded complete on that acceptance, it is not an independent observation of a clean exit.

### Auto-fixed issues

None.

## Follow-ups

- Candidate for a separate fix: `scripts/spec-revise.mjs` drops its document argument when `--date` is absent (its positional filter excludes index `dateFlag + 1`, which is index 0 when `dateFlag` is -1). Found in 07-02, not fixed.
- ADR-QD-114 stays reserved for Phase 8.

## Auth Gates

The Playwright system-dependency install needs sudo and a terminal. It was surfaced as a human-action checkpoint and resolved by the user's acceptance, described above.

## Known Stubs

None.

## Threat Flags

None. This plan changed no source file.

## Self-Check: PASSED

- FOUND: `packages/http/src/PortRouteAddress.ts`
- FOUND: `.changeset/port-route-address.md`
- `git rev-list --count 5e00ed2..HEAD` is 0 and the plan changed no file under `packages/` or `spec/`, so `commits: 0` is correct for a verification-only plan.
