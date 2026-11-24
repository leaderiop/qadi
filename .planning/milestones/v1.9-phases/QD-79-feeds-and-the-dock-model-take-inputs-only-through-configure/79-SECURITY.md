---
phase: "79"
slug: "feeds-and-the-dock-model-take-inputs-only-through-configure"
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
created: "2026-11-24"
---

# Phase 79 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| Host inputs → feed `configure` / `DockModel.configure` | A host (or a React render) hands the feeds and the dock their inputs, and a feed reads host code (gate registry, questions thunk, source, diagnostics layer) only through them | Source, capacity, catalogue, ports, diagnostics options, reading, gate registry, questions thunk |
| React props → `useConfigured` → a model's `configure` | The dock, timeline and diagnostics hooks build in a scope and configure with the latest inputs record, on the build and after each commit whose record changed identity | The inputs record |
| Published `.d.ts` → a consumer's compiler / a headless host | A host upgrading must hand its inputs through `configure`, and the props type must resolve in an installed package whose `exports` map is closed | Constructor and props types |
| Gate registry (host code) → `GatesFeed.configure` | The registry may throw, and a watch that failed is retried | A throwing `subscribe` |
| Phase records → reviewers | The mutation base and close, the RED evidence, the pinned and characterisation checks, and the ADR/BEH/INV/CCR rows are the evidence a reviewer trusts | Measurements and decisions |
| The phase's commits → the branch and the release | What is committed, under whose attribution, and what a changeset says is what review and release read | Commits, trailers, the changeset |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-79-SC | Tampering | dependency installs | high | mitigate | No `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml` or `.npmrc` in `git diff --name-only 910cb783 HEAD` (nor against 775043dd); no per-package manifest, stryker, vitest or house-style config changed. The changeset is the only non-source file added outside docs | closed |
| T-79-01 | Tampering | `79-mutation-base.json`, base facts | medium | mitigate | `775043dd..910cb783` has an empty diff outside `.planning/`. All 5 group heads equal 910cb783. `70cb0901` is the only commit after the base to touch the record, and it holds exactly the scorer and the record. Scorer `--self-test` prints 32 passed. The base facts (590 files, 942 exports, 21/0) match the later tree by the phase's own additions (+6 files, +1 type test, exports unchanged) | closed |
| T-79-02 | Spoofing | first reader commit of `useDockModel`, `useDiagnostics`, `useTimeline` | medium | mitigate | `useConfigured.ts:24` configures inside the scoped build. C1 to C9 pass at HEAD and each failed under edit F1 (`79-RED-EVIDENCE.md`, 79-02). U1 (`useConfigured.test.tsx:74`) pins it | closed |
| T-79-03 | Tampering | `ConfigureFirstRender.characterisation.test.tsx` | medium | mitigate | One commit touches the file (`cf3186d9`). `79-characterisation-check.mjs` exits 0 at HEAD and its `--self-test` (3 passed) includes the one-byte failure | closed |
| T-79-04 | Denial of service | scope left open when the first configure throws | low | mitigate | C10 and C11 pass at HEAD; C10 failed under F1 and C11 under F3. `useScoped.ts:29-32` closes the scope and rethrows | closed |
| T-79-05 | Denial of service | `GatesFeed.configure` re-reading host code when nothing moved | medium | mitigate | CR11 and CR12 were red on the base (RED-EVIDENCE lines 33-34, 105-106) and pass at HEAD. `GatesFeed.ts:284` returns before any read when `sameFields(held, wanted)` and no watch failed | closed |
| T-79-06 | Tampering | a test cell that cannot fail | low | mitigate | Re-ran the title scan: all 57 test titles added under `packages/devtools/test` appear on a `- failed:`, `- red on the base:` or `- red before the rule:` line of `79-RED-EVIDENCE.md` (the retitled M2 (b) cell sits under "IN-02" without its `M2 (b):` prefix) | closed |
| T-79-07 | Denial of service | `DockModel.configure` reading host code when nothing moved | medium | mitigate | CR16 and CR17 were red on the base (RED-EVIDENCE lines 107-108) and pass at HEAD. `DockModel.ts:418-419` dispatches to feeds that return on no change | closed |
| T-79-08 | Repudiation | headless host subscribed before its first configure | low | accept | Accepted. CR22 pins the counts; ADR-QD-192 decision 10 (line 112) and BEH-QD-735 state them; `packages/devtools/README.md:255` tells a host to configure before it subscribes | closed |
| T-79-09 | Tampering | migrated feed tests and the fifteen pinned tests | medium | mitigate | `79-pinned-check.mjs` prints `pinned: 15 tests hold their assertions` at HEAD (blocks compared with their text at the phase base); its `--self-test` passes 3 | closed |
| T-79-10 | Tampering | `DockModel.test.ts`, its characterisation, M55, M56 | medium | mitigate | M55 (`DockModel.test.ts:454`) and M56 (:480) are among the 15 held by the same check; the dock tests pass at HEAD | closed |
| T-79-11 | Denial of service | diagnostics and timeline feeds restarting or re-reading on no change | medium | mitigate | `TimelineFeed.ts:199-200` normalises then returns on `sameFields`; `DiagnosticsFeed.ts:216-217` returns on `sameFieldsOrAbsent`; both rules at `ExternalStore.ts:138` and `:154`. CR1 to CR10 and CR23 pass. Mutation close: 0 Survived and 0 NoCoverage in both files, 0 new Ignored | closed |
| T-79-12 | Tampering | `DiagnosticsOptions` widened to accept `undefined` | low | accept | Accepted. Non-breaking widening, pinned in `surface.tst.ts:295-300` and stated in the changeset (`DiagnosticsOptions accepts undefined`) | closed |
| T-79-13 | Denial of service | `GatesFeed.configure` re-reading a throwing registry each commit | medium | mitigate | `GatesFeed.ts:284` is the early return. CR11, CR12 (red on the base) and G44 plus case 13 (red before the rule, RED-EVIDENCE lines 201-202) pass at HEAD | closed |
| T-79-14 | Denial of service | a failed watch retried by every configure | low | accept | Accepted. G43 (`GatesFeed.test.ts:715`) requires the retry; ADR-QD-192 lines 76-77, 161-162 and 191-196 record the per-commit retry. The code review's WR-01 raised it and the stated behaviour was kept and pinned by two cells in `DockRegistryReads.test.tsx` (`:145`) | closed |
| T-79-15 | Denial of service | `DockModel.configure` called on every host commit | low | mitigate | The dock adds no guard of its own beyond its catalogue check; it dispatches once per feed through `feedInputsOf` (`DockModel.ts:403-419`) to feeds that return on no change. CR16 and CR17 pass | closed |
| T-79-16 | Tampering | capacity check moving behind a feed's publish | low | mitigate | `completeDockInputs` runs `effectiveCapacity` (`DockModel.ts:178`) at :398, before `held = wanted` at :402. M55 passes unedited | closed |
| T-79-17 | Information disclosure | a reader committing an unconfigured dock | medium | mitigate | `useConfigured.ts:24` configures inside the build before `useScoped` sets the value. U1 and C1 pass at HEAD; C1 to C9 failed under F1 | closed |
| T-79-18 | Denial of service | scope left open when the first configure throws | medium | mitigate | `useScoped.ts:29-32` `catch` calls `close()` then rethrows. U2 (`useConfigured.test.tsx:80`) and C11 pass; C11 failed under F3 | closed |
| T-79-19 | Tampering | a React upgrade that stops re-running an effect's latest closure | low | mitigate | U4 (`useConfigured.test.tsx:116`) and C7 to C9 pin it and failed under F2. ADR-QD-192 lines 204-209 record the ref-in-a-layout-effect fallback | closed |
| T-79-20 | Tampering | `DevtoolsDockProps` naming a module kept out of the barrel | low | mitigate | Gate 14's packed consumer imports `DevtoolsDockProps` from `@qadi/devtools/react` and types a ten-prop literal (`check-package-install.mjs:513`, `:691-702`). It failed under scratch edit P2 (TS2353). The recorded gate run is `package-install: 9 package(s) pack, resolve and authorize`. api-surface stays at 942, so no fallback export was taken | closed |
| T-79-21 | Denial of service | dock configured on every commit with a new inputs record | low | accept | Accepted. Each feed's rule returns when nothing moved (CR16, CR17); ADR-QD-192 lines 191-196 record it | closed |
| T-79-22 | Tampering | a host passing inputs to a parameterless constructor | medium | mitigate | `surface.tst.ts:307-309` pins `Parameters<typeof makeX>` as `[]`; gate 14 aliases at `check-package-install.mjs:665-670` fail with TS2322 on a parameter (RED-EVIDENCE lines 254-257); the changeset opens `**Breaking.**` | closed |
| T-79-23 | Repudiation | a consumer left calling the old signature | low | mitigate | A grep over `spec apps packages scripts examples features` finds a constructor call with an argument only in the upgrade page's uncompiled `ts` Before fence (`upgrading.md:1307-1308`) and the git-ignored build output `apps/website/dist`. No `make...Feed(` or `makeDockModel(` call with an argument remains in `src` or `test` | closed |
| T-79-24 | Repudiation | records stating the constructors take inputs | low | mitigate | ADR-QD-192 Rev 1.4; ADR-QD-137 Rev 1.5, ADR-QD-173 Rev 1.3 and ADR-QD-185 Rev 1.4 each carry one `Amended 2026-11-24 (CCR-QD-471)` note. `verify-traceability.sh --strict` PASS 21, FAIL 0; `spec-revise.mjs --check` exit 0; `check-doc-examples.mjs` 119 blocks compile | closed |
| T-79-25 | Tampering | a number written outside the reserved set | low | mitigate | The highest ids in the phase's added lines are ADR-QD-192, CCR-QD-471, BEH-QD-735 and INV-QD-404; the base maxima were 191, 470, 730 and 402. BEH-QD-731 to 735 and INV-QD-403 and 404 all exist. No `-NEXT` placeholder was added | closed |
| T-79-26 | Repudiation | BEH-QD-584 and BEH-QD-619 stating reads the code no longer makes | low | mitigate | 7 `Restated by ADR-QD-192 (CCR-QD-471)` notes in doc 28 (BEH-QD-465, 584, 619, 636 to 639); the final code review (iteration 3) found no remaining contradiction with the code | closed |
| T-79-27 | Repudiation | an unlisted observable change in the release notes | low | mitigate | The changeset names `subscribe`, `configure`, `DiagnosticsOptions`, `DevtoolsDockProps` and `undefined`, and its eight bullets cover the pre-subscribed publishes and the quiet mend. The 0.13 upgrade section compiles (`check-website-doc-examples.mjs`, 75 blocks) | closed |
| T-79-28 | Elevation of privilege | an accidental version or publish | low | mitigate | No tag contains 910cb783 and none points at HEAD; no `CHANGELOG` or `package.json` version changed; the changeset is still in `.changeset/`. Nothing is pushed (no upstream, no `origin/arch-wave-14`) | closed |
| T-79-29 | Tampering | a survivor closed by re-baselining or a suppression comment | medium | mitigate | Only `70cb0901` ever touched the base record. `79-mutation.mjs compare` exits 0: 0 Survived and 0 NoCoverage in all 5 files, 0 new Ignored; dock 72/72 to 69/69 (score 1, lost only killed mutants); the one base survivor `ExternalStore.ts:113` is killed (77/78 to 88/88). No `Stryker disable` in `packages/devtools/src`; `stryker.devtools.mjs` unchanged | closed |
| T-79-30 | Repudiation | a plan-local id or placeholder shipped | low | mitigate | No `T-79-`, `D-79-`, `CONF-`, `WX-`, `QD-79` or `-NEXT` token in any added line of `packages`, `spec`, `apps` or `.changeset`; the only phrase hit is a reflowed pre-existing sentence | closed |
| T-79-31 | Repudiation | a commit without its trailer, or a non-plan commit on shipped paths | low | mitigate | 88 commits since the base. All 38 that touch a path outside `.planning/` carry exactly one Claude trailer. 30 match the plan pattern. The other 8 are review-fix commits (`(79)` scope, no plan number: `2e4f5b23`, `d7ee2b1c`, `35ec9a9a`, `49c9ff7e`, `3b25a7e1`, `12e53e3f`, `63157bbc`, `4ac58dcd`), each named in a `79-REVIEW-FIX` report. The 5 commits without a trailer are review reports that touch `.planning/` only | closed |
| T-79-32 | Information disclosure | a private file committed | low | mitigate | No `.planning/config.json`, `.planning/state.json`, `.agents/`, `.codex/` or `*REVIEW*.iter*.md` in any commit since the base (`git log --name-only 910cb783..HEAD`). `config.json` is modified but unstaged | closed |

*Status: open · closed · open — below high threshold (non-blocking)*
*Severity: critical > high > medium > low — only open threats at or above workflow.security_block_on count toward threats_open*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

**Release/publish:** the changeset `.changeset/devtools-feeds-take-inputs-through-configure.md` is the one changeset added (none deleted) and is unconsumed. No tag contains 910cb783 or points at HEAD, no `CHANGELOG` changed, and no `package.json` version changed. The branch is `arch-wave-14`, it has no upstream, and nothing has been pushed.

**Evidence run at HEAD c110de25** (a `.planning/` only commit over the post-review tree 2d742ba9; `packages`, `spec`, `scripts`, `apps` and `.changeset` are identical to 92cfd986): `pnpm exec vitest run --project devtools` 80 files, 1869 tests passed; `79-mutation.mjs compare` exit 0 and `--self-test` 32 passed; `79-pinned-check.mjs` and `79-characterisation-check.mjs` exit 0; `verify-traceability.sh --strict` 21 pass, 0 fail; `check-house-style.mjs` 596 files clean; `check-api-surface.mjs` 942; `check-doc-examples.mjs` 119; `check-website-doc-examples.mjs` 75; `check-dod-table.mjs` 26 steps; `spec-revise.mjs --check` exit 0. Not re-run by this audit: Stryker, gate 14 (`pnpm spec:package`), `pnpm check:pr` and `pnpm test:tstyche`; their results are taken from the 79-17 summary and the orchestrator's post-review run, on a tree whose `packages/` is unchanged since.

**Unregistered flags:** none. Every `## Threat Flags` section in the 79-NN summaries reads None. The code review's WR-01 (a throwing registry is re-subscribed once per host re-render) is an interaction of T-79-14, not new attack surface.

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-79-01 | T-79-08 | A headless host that subscribes before its first `configure` hears that `configure`'s publishes. The hooks never show it. CR22 pins the counts; ADR-QD-192 and BEH-QD-735 state them; the README tells a host to configure first | Plan 79-04 threat register (accept); recorded in ADR-QD-192 | 2026-11-24 |
| AR-79-02 | T-79-12 | `DiagnosticsOptions` now accepts `undefined` for each field. A non-breaking widening, pinned in `surface.tst.ts` and stated in the changeset | Plan 79-07 threat register (accept) | 2026-11-24 |
| AR-79-03 | T-79-14 | A registry whose `subscribe` keeps throwing is re-subscribed once per host commit, and a repeat of the same failure publishes nothing. Host code with side effects in `subscribe` is hit once per render while the registry stays broken. The retry is required by G43, so it is kept and pinned | Plan 79-08 threat register (accept); recorded in ADR-QD-192; kept by the orchestrator after review WR-01 | 2026-11-24 |
| AR-79-04 | T-79-21 | The dock is configured on every host commit with an inputs record that is new each render. Each feed's rule returns when nothing moved (CR16, CR17), so the cost is one comparison per feed | Plan 79-11 threat register (accept); recorded in ADR-QD-192 | 2026-11-24 |

All four are low severity and below the `high` block threshold.

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-11-24 | 33 | 33 | 0 | gsd-security-auditor (ASVS L1, block_on high) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-11-24
