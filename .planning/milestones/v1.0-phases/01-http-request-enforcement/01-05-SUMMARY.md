---
phase: 01-http-request-enforcement
plan: 05
subsystem: spec
tags: [ccr, traceability, overview, changeset, merge-gate]
requires:
  - phase: 01-http-request-enforcement
    provides: "request-enforcement module, caller x failure table, ADR-QD-108 and BEH/INV records (plans 01-04)"
provides:
  - "CCR-QD-385 in the spec/README.md Document history register (README Rev 1.118)"
  - "traceability section 4 rows for RequestEnforcement.test.ts and RequestEnforcement.tst.ts; PortRoutes.test.ts and http.test.ts rows updated"
  - "overview Rev 1.70: who wires each log line is corrected, no export added or removed"
  - ".changeset/request-enforced-once.md (@qadi/http patch)"
  - "merge gate result for the phase"
affects: []
requirements-completed: [XC-01, XC-02, XC-03, XC-04, XC-05]
status: complete
commits: 1
plan_head_before: 636e10979822849cc0355894ec3fc9453cfb841f
plan_head_after: 936ee116103917dc6e5ef04ca57f00960fd0fe14
actuals:
  tokens: 5200
  tasks: 2
  commits: 1
key-files:
  created:
    - .changeset/request-enforced-once.md
  modified:
    - spec/traceability.md
    - spec/overview.md
    - spec/README.md
key-decisions:
  - "No traceability revision bump: Plan 04's 1.121 entry already announced the section 4 rows"
completed: 2026-11-08
---

# Phase 1 Plan 05: Close the phase Summary

CCR-QD-385, the section 4 traceability rows, the corrected overview prose and the `@qadi/http` patch changeset are recorded, and every step of `pnpm check:pr` is green except one that fails for an environment reason (Playwright's `--with-deps` needs sudo); its remaining work was run by hand and passes.

## Commits

| Commit | Message |
| ------ | ------- |
| `936ee11` | docs(01-05): CCR-QD-385, section 4 traceability rows, overview prose and the @qadi/http patch changeset |

## What changed

- **traceability.md** (Rev 1.121, not bumped): new rows for `RequestEnforcement.test.ts` (BEH-QD-335/336/321, INV-QD-243/006) and `RequestEnforcement.tst.ts`; `PortRoutes.test.ts` gains BEH-QD-336 and INV-QD-243 and the ENF-03 regression text; `http.test.ts` no longer claims the per-route log-line assertions, and says they moved to `RequestEnforcement.test.ts`.
- **overview.md** (1.69 to 1.70): `authorizeRequest`/`AuthorizedRequest` Source reads "`AuthorizeRequest.ts` (public through `GuardApi.ts`)" and the description names it the package-private request-enforcement module; `addGuardedRoute`, `portRoutes`/`portRoutesUnguarded` (unguarded form through the subject-only mode), `logDenial` (module's handler step) and `logSubjectExtractionFailed` (wired once, by the extraction step, for every surface) are corrected. No backticked name in an Export column added or removed.
- **README.md** (1.117 to 1.118): Change History entry and the CCR-QD-385 row after CCR-QD-384, listing the ADR, index, ADR-036 Rev 1.8, 23-http 1.11, 26-decision-stream 1.12, invariants 1.78, traceability 1.121, overview 1.70, README 1.118, the http source and test files the phase changed, and the changeset. `CCR-QD-385` was unused before the edit.
- **`.changeset/request-enforced-once.md`**: `"@qadi/http": patch`.

## Verification

Task 1 gates, run directly: `pnpm spec:verify:strict` (21 pass, 0 fail, including CCR register coverage and "Revision = newest history entry"), `pnpm spec:api` (862 exports documented), `pnpm spec:gates` (25 steps match `pnpm check`), `pnpm spec:examples` (101 blocks compile), and the five greps.

`pnpm check:pr` (16 steps): steps 1-12 passed (typecheck, lint, circular, tstyche, coverage, bdd, spec:examples, spec:verify:strict, spec:gates, spec:claims, spec:api, spec:package). Coverage: 151 files, 3830 tests pass, `http/src` 99.65% lines / 96.07% branches / 99.29% functions. Step 13 `pnpm example` failed, see below. `run-check` stops at the first failure, so the remaining steps were run by hand: `pnpm spec:website-examples`, `pnpm website` (45 pages built) and `pnpm spec:publish` (9 packages and 6 documents agree on 0.11.0) all exit 0. Mutation is skipped by `check:pr` by design.

### Environment failure in `pnpm example` (not caused by this phase)

The example's `check` script is `pnpm typecheck && pnpm test && pnpm build && playwright install --with-deps chromium && pnpm test:e2e`. Typecheck, test and build passed; `playwright install --with-deps chromium` then failed because it needs `sudo` (`sudo: a terminal is required to read the password`; Playwright also warns this OS is not officially supported). Chromium is already installed (`~/.cache/ms-playwright/chromium-1254`), so I ran the final step by hand, `pnpm test:e2e` in `examples/nextjs-newsroom`: **30 passed**. A literal `pnpm check:pr` exit 0 therefore needs a machine where `playwright install --with-deps` can run (CI), or where the system dependencies are already present and sudo is available. Nothing in this phase touches that step.

## Phase gates (Task 2)

- ROADMAP criterion 2 (no handler-denial tap or `HTTP_ENFORCEMENT_TAGS` catch outside `AuthorizeRequest.ts`): the grep prints nothing (baseline 4 lines).
- Criterion 4 (member key built once): `grep -rnF '.identifier}/${' packages/http/src` counts **1** (baseline 2).
- ENF-03 regression test "logs a subject extraction failure once, as a guarded route does (ENF-03)": passes (`pnpm vitest run --project http packages/http/test/PortRoutes.test.ts -t "logs a subject extraction failure once"`, 1 passed).

## Deviations from Plan

None to the plan's content. No fix was needed outside the files named in Plans 01-05, and no threshold, budget or step was changed. The only departure is the hand-run of the `pnpm example` tail and the three steps after it, forced by the sudo failure above.

## Known Stubs

None.

## Threat Flags

None. T-01-12: `pnpm check:pr` ran unmodified. T-01-13: `pnpm spec:api` and `pnpm spec:package` passed, so no package-private name of the module leaked into the `@qadi/http` surface.

## Self-Check: PASSED

- FOUND: .changeset/request-enforced-once.md
- FOUND commit 936ee11 (ancestor of HEAD)
