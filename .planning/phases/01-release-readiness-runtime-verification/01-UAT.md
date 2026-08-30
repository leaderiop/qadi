---
status: diagnosed
phase: 01-release-readiness-runtime-verification
source: [01-VERIFICATION.md]
started: 2026-08-30T04:35:00Z
updated: 2026-08-30T17:10:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Real CI run of the two-leg Node matrix
expected: Push this branch (or open a PR) and confirm on the `check` workflow run that both `check (20.19.0)` and `check (26)` legs conclude `success`, and that the floor leg resolved exactly v20.19.0.
result: issue
reported: "check (26) succeeded, but check (20.19.0) failed on both the initial run (33288841795) and a re-run of just that job — same test, same line, both times: `packages/react/test/edges.test.tsx:154:11`, `useDecisionSuspense > shows the Suspense fallback before the decision settles`, TestingLibraryElementError: Unable to find an element with the text: decided:Deny. Reproducible, not flaky — confirmed Node 20.19.0 was the actual runtime used (setup-node log line: 'node-version: 20.19.0' / 'Acquiring 20.19.0 - x64'). 1844/1845 tests pass on that leg; the same suite passes 1845/1845 locally and on check (26)."
severity: blocker

### 2. Final release-readiness read
expected: Confirm nothing was published (tag check already automated and clean) and read `packages/audit/CHANGELOG.md` as a first-time consumer to confirm the `ElectronicSignature` removal reads clearly.
result: pass

### 3. Re-verification of the two-leg Node matrix after G-01-1's fix (plan 01-05)
expected: With G-01-1's fix merged, `check (20.19.0)` concludes `success` end to end.
result: issue
reported: "Automated evidence from plan 01-05's Task 3 (GitHub Actions run 33314894440, triggered via workflow_dispatch on the fix branch at commit 809d56c): the react suite defect is gone — `edges.test.tsx` passes 8/8 under the real Node 20.19.0 runner, and the full `coverage` step (93 files / 1850 tests) passes — but `check (20.19.0)` still concludes `failure` overall. It now dies at the pipeline's last step: `pnpm --filter @qadi/website check` → `astro check` aborts with 'Node.js v20.19.0 is not supported by Astro! Please upgrade Node.js to a supported version: >=22.12.0'. This step was unreachable in every prior run because the react suite always failed first; G-01-1's fix is what let the pipeline run far enough to reach it. `check (26)` remains `success`."
severity: blocker

## Summary

total: 3
passed: 1
issues: 2
pending: 0
skipped: 0
blocked: 0

## Gaps

- gap_id: G-01-1
  truth: "CI runs the full `pnpm check` gate suite on Node.js 20.19.0 ... and it passes"
  status: resolved
  resolved_by: 01-05-PLAN.md
  resolved_at: 2026-08-30
  reason: "User reported: check (20.19.0) fails reproducibly (2/2 runs) on packages/react/test/edges.test.tsx:154 (useDecisionSuspense Suspense-fallback test) with TestingLibraryElementError: Unable to find an element with the text: decided:Deny. check (26) passes the identical suite. Not observed locally (1845/1845 pass) or on check (26) — appears specific to the Node 20.19.0 runtime's async/microtask scheduling interacting with the test's 1ms Effect.delay + default waitFor timeout."
  severity: blocker
  test: 1
  root_cause: "TOCTOU race in @qadi/react's settled() helper (packages/react/src/hooks.ts): registry.subscribe(atom, callback) is called without { immediate: true }, so if the atom has already settled by subscribe time, the callback never replays the current value and the returned promise hangs forever. On Node 20.17.0/20.19.0 (not Node 22/26), an extra stale re-render of the already-suspended component occurs after a preceding test drives an Effect.fail resolver to completion, causing useDecisionSuspense to call settled() a second time against an already-settled atom — permanent hang. Reproduced locally under Node 20.17.0 (byte-identical failure); passes 8/8 on Node 22.22.0. Confirmed via effect@4.0.0-rc.110's AtomRegistry.ts source that subscribe() does not replay the current value unless immediate:true is passed. Fixing this also required a second, deeper fix beyond the originally diagnosed root cause: 01-05-SUMMARY.md records that read-then-subscribe alone still hung under real Node 20.17.0, because AtomRegistry's unsubscribe-on-resolve created a zero-listener window a Node-20-specific scheduling race could win, tearing the atom down and resetting it to Initial a second time. The bridging listener now stays subscribed for the life of the atom."
  artifacts:
    - path: "packages/react/src/hooks.ts"
      issue: "settled() (lines ~58-102) subscribes without { immediate: true } and has no synchronous already-settled check before subscribing — TOCTOU window"
    - path: "packages/react/test/edges.test.tsx"
      issue: "Correct as written (lines 144-155) — exposes the real defect, not a test-only timing assumption; no change needed"
  missing: []
  debug_session: ".planning/debug/node20-suspense-fallback.md"

- gap_id: G-01-2
  truth: "check (20.19.0) concludes `success` end to end, satisfying COMPAT-01's declared Node 20.19.0 floor for the full `pnpm check` gate suite"
  status: failed
  reason: "Automated finding from plan 01-05's Task 3 CI verification: GitHub Actions run 33314894440, job check (20.19.0) concludes `failure` at its final step, `pnpm --filter @qadi/website check` -> `astro check`, with 'Node.js v20.19.0 is not supported by Astro! Please upgrade Node.js to a supported version: >=22.12.0'. Every step before it (typecheck, lint, circular, spec:api, spec:verify:strict, coverage — 1850/1850 tests, mutation testing) passes on this leg. check (26) remains success."
  severity: blocker
  test: 3
  root_cause: "apps/website depends on Astro 7.2.9, which declares an engine floor of Node >=22.12.0 — above the workspace's own declared Node >=20.19.0 floor (COMPAT-01, D-06). The root `pnpm check` script (via .github/workflows/check.yml's single Node matrix) runs apps/website's own `check` script (typecheck + build) unconditionally on both legs, so the 20.19.0 leg can never pass while apps/website carries this dependency and is included in that script's scope. This conflict pre-dates plan 01-05 but was previously unreachable — every prior check (20.19.0) run failed earlier, at the react suite (G-01-1), before execution ever reached the website step."
  artifacts:
    - path: "apps/website/package.json"
      issue: "Depends on astro@7.2.9 (or the currently installed 7.x version), which requires Node >=22.12.0 per Astro's own engine check — above the workspace floor"
    - path: ".github/workflows/check.yml"
      issue: "Runs the same `pnpm check` script (which includes apps/website's own check step) on both Node legs of the matrix; does not scope apps/website's build to only the higher-Node leg"
  missing:
    - "A decision on approach: (a) pin apps/website to a Node-20-compatible Astro version if one meets apps/website's own requirements, (b) scope check.yml / the root check script so apps/website's build only runs on the check (26) leg, or (c) formally exclude apps/website from COMPAT-01's Node floor (PROJECT.md already scopes this roadmap to apps/website's deployment only, not its content/framework) and adjust the merge gate accordingly."
  debug_session: null
