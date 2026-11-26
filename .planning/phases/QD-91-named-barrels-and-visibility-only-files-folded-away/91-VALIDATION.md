---
phase: "91"
slug: "named-barrels-and-visibility-only-files-folded-away"
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: validated
nyquist_compliant: false
wave_0_complete: true
created: "2026-11-26"
---

# Phase 91 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution. Seeded from `91-RESEARCH.md` §Validation
> Architecture. The planner fills in the task ids. Where the two disagree, `91-CONTEXT.md`'s "Addendum after research"
> wins (D-06a, D-09a/b, D-10a, D-11a, D-21a, D-24a, D-30a, D-31a, D-32a).

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest + @effect/vitest (runtime); tstyche in two passes (`scripts/run-tstyche.mjs`); the gates `scripts/check-house-style.mjs`, `scripts/check-api-surface.mjs` (gate 13), `scripts/check-package-install.mjs` (gate 14); madge (`pnpm circular`); the new `scripts/surface-diff.mjs` |
| **Config file** | `vitest.config.ts` and `packages/*/vitest.config.ts`; `tstyche.json`; `tsconfig.tstyche.json`; `tsconfig.test.json`; `tsconfig.build.json` |
| **Quick run command** | `pnpm exec vitest run packages/core/test/surface.test.ts packages/react/test/surface.test.ts packages/audit/test/surface.test.ts < /dev/null` |
| **Per-commit structural set** | `pnpm circular`, `tsc -b tsconfig.build.json`, `pnpm build` then `node scripts/surface-diff.mjs snapshot <out>` and `compare 91-surface-base.json <out>`, `node scripts/check-api-surface.mjs` (base figure, expected 943) |
| **Full suite command** | `pnpm check:pr < /dev/null` |
| **Mutation** | `91-mutation.mjs` over the D-32 invocations (core four files, audit two, react `RegistryLease.ts`), one config at a time; `RENAMED` map for folded files |
| **Estimated runtime** | quick ~5 s; structural set ~1-2 min; full suite several minutes; mutation tens of minutes |

---

## Sampling Rate

- **After every task commit:** the quick line; after a barrel or fold commit, the per-commit structural set, each exit
  code recorded (`91-BARRELS.md`, `91-FOLDS.md`).
- **After every plan wave:** `pnpm typecheck`, `91-check.mjs suite` (core, react, audit, devtools, http, testing),
  `pnpm test:tstyche`, `node scripts/check-house-style.mjs`, `pnpm spec:package`.
- **Before `/gsd-verify-work`:**
  - `pnpm check:pr < /dev/null` is green;
  - `91-check.mjs records --close` and `91-check.mjs close` are clean (changesets: exactly D-29's three);
  - `91-pinned-check.mjs` and `91-earlier-checks.mjs` exit 0;
  - surface close equals the base; gate 13 prints the base figure;
  - mutation and coverage close do not fall below the base (folded files against the sum of their sources).
- **Max feedback latency:** 30 seconds per task, not counting the structural set, the phase gate and mutation.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| TBD | — | — | BARL-01 | — | the surface tool detects each planted defect (class as `export type`, pair as `export type`, dropped name, added name) and passes an identical pair | script self-test | `node scripts/surface-diff.mjs --self-test` | ✅ | ✅ green |
| TBD | — | — | BARL-01 | — | surface equals the base after every barrel and fold commit and at close | script | `surface-diff.mjs snapshot` + `compare` against `91-surface-base.json` | ✅ | ✅ green |
| TBD | — | — | BARL-02 | — | each barrel's runtime value names equal a written-out list (`useQadiContext` in react's) | unit | `pnpm exec vitest run packages/{core,react,audit}/test/surface.test.ts` | ✅ | ✅ green |
| TBD | — | — | BARL-02 | — | no packed `.d.ts` names a `/src/` path or a path outside its package; the check's planted self-check runs | script | `node scripts/check-package-install.mjs` (check 3c) | ✅ | ✅ green |
| TBD | — | — | BARL-02 | — | barrels named, relative, in module-path order, one value and one type group per module; homes per D-13 | phase judge | `91-check.mjs barrels`, `91-check.mjs homes` | ✅ | ✅ green |
| TBD | — | — | BARL-03 | — | no cycle after each fold; each fold its own commit | script + judge | `pnpm circular`; `91-check.mjs folds`, `circular` | ✅ | ✅ green |
| TBD | — | — | BARL-03 | — | `hydrateDecisions` accepts a `{ hydrate }`-only object (RED on base), `QadiAtoms` assignable, `QadiAtoms["hydrate"]` held | type test | `node scripts/run-tstyche.mjs <born tst file>` (both passes) | ✅ | ✅ green |
| TBD | — | — | BARL-03 | — | folded behaviour unchanged | unit | `91-check.mjs suite` | ✅ | ✅ green |
| TBD | — | — | BARL-04 | — | `named-barrel` covers the five barrels, refuses `export *`, mixed, unlisted, out-of-order; `[named-barrel-self-test]` runs every lint | lint | `node scripts/check-house-style.mjs`; `91-check.mjs rule` | ✅ | ✅ green |
| TBD | — | — | BARL-04 | — | span rules still bite after fold 1 (`[untrusted-decode]`, `[span-key-source]`) | scratch variants | `91-check.mjs seen-failing` | ✅ | ✅ green |
| TBD | — | — | BARL-05 | — | ADR-QD-204, amendments, notes, BEH-QD-791..795, INV-QD-427/428, overview Source cells | spec gates | `node scripts/check-api-surface.mjs`, `node scripts/check-doc-examples.mjs`, `bash spec/scripts/verify-traceability.sh --strict`, `91-check.mjs records --close` | ✅ | ✅ green |
| TBD | — | — | WX-03 | — | gate 14 probes `hydrateDecisions` (atom set, forwarding copy, `@ts-expect-error` on `{}`); one patch changeset per edited public package | script | `node scripts/check-package-install.mjs`; `91-check.mjs changesets` | ✅ | ⚠️ partial (gap G-1) |
| TBD | — | — | WX-05 | — | no touched file's score or coverage falls; folded files against Σ sources; UNMEASURED behaviours proven by seen-failing tests | mutation + coverage | `91-mutation.mjs`; `vitest run packages/<pkg>/test --coverage.enabled …` per package | ✅ | ✅ green |
| TBD | — | — | WX-06 | — | every new check seen failing once | scratch variants | `91-RED-EVIDENCE.md` via `91-check.mjs seen-failing` | ✅ | ✅ green |
| all | — | — | WX-04 / WX-07 | — | no forbidden forms in added lines; no ids in titles; one trailer; no release | check script | `91-check.mjs scan-forbidden`, `scan-ids`, `trailers` | ✅ | ✅ green |
| close | — | — | WX-01 / WX-02 | — | merge gate green; records registered; earlier phases' checks match the ledger | full suite | `pnpm check:pr < /dev/null`; `91-earlier-checks.mjs` | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `scripts/surface-diff.mjs` with `--self-test`; `surface:self-test` appended to `pnpm check`; DoD table row
- [x] `packages/{core,react,audit}/test/surface.test.ts`, born green on the base
- [ ] gate 14 check 3c (`.d.ts` escape) with its planted self-check, before any barrel commit
- [ ] the born `HydrationTarget` tstyche file (commit A, RED first)
- [x] `91-check.mjs`, `91-pinned-check.mjs`, `91-earlier-checks.mjs`, `91-mutation.mjs`, each with a `--self-test`
- [x] `91-SPIKE.md`, `91-surface-base.json`, `91-SURFACE.md`, `91-RED-EVIDENCE.md`, `91-mutation-base.json`, `91-coverage-base.json`

No framework install: vitest, tstyche, madge, oxlint and Stryker are present.

---

## Manual-Only Verifications

All phase behaviors have automated verification except the per-candidate spike verdicts (D-10), which are recorded
evidence in `91-SPIKE.md`; their outcome (no cycle after each landed fold) is re-checked by `pnpm circular` and
`91-check.mjs folds`. `portInterpreter`'s `Schema.Literals` mutants are run by hand with `ignoreStatic: false` and
recorded `EXAMINED` (D-32); the run is scripted, its result recorded.

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending

---

## Validation Audit 2026-11-26

Auditor: gsd-nyquist-auditor, at HEAD e083c5be (base 69e5247d). No tests written, no source edited.

| Metric | Count |
|--------|-------|
| Requirements audited | 12 (BARL-01..05, WX-01..07) + 7 records (BEH-QD-791..795, INV-QD-427..428) |
| Covered, run green, seen failing | 18 |
| Partial | 1 (WX-03, G-1) |
| Missing | 0 |

### Runs (this audit)

- `pnpm exec vitest run` the three `surface.test.ts`, `PortSpanFold.mutation.test.ts`, `PortSpan.test.ts`, `GateRegistry.store.test.ts`, `SequenceIntegrity.test.ts`, `Hydration.test.ts`: 8 files, 121 tests, green
- `node scripts/run-tstyche.mjs packages/react/test/HydrationTarget.tst.ts`: 4 passed (both passes)
- `node scripts/check-house-style.mjs`: 648 files clean
- `node scripts/surface-diff.mjs --self-test`: 20 passed (in `pnpm check` as step `surface:self-test`)
- `--self-test` of `91-check` (477), `91-pinned-check` (97), `91-earlier-checks` (76), `91-mutation` (125): all exit 0
- `91-pinned-check.mjs`: 515 held, 27/27 applied, clean; `91-earlier-checks.mjs`: 87 runs match
- `91-check.mjs records --close` and `close`: exit 0 (24 checks and the no-release facts)
- Not run here: full `pnpm check:pr`, gate 14, Stryker (recorded green in 91-21-SUMMARY / 91-mutation-close.json)

### Per-requirement status

| Req / record | Check | In merge gate | Seen failing (91-RED-EVIDENCE.md) | Status |
|---|---|---|---|---|
| BARL-01 | `surface-diff.mjs --self-test`; phase compare vs `91-surface-base.json` | self-test yes (step 27); compare phase close | surface-type-only-class, surface-dropped-name, surface-missing-lib, surface-self-test-classifier | green |
| BARL-02 | three `surface.test.ts`; gate 14 check 3c | yes | values-{core,react,audit}-type-only, escape-self-check, escape-layout | green |
| BARL-03 | `HydrationTarget.tst.ts`; `pnpm circular`; fold tests | yes | hydrate-target-red, -atoms-lack-hydrate, -accepts-anything, fold-* | green |
| BARL-04 | `named-barrel` + `[named-barrel-self-test]` | yes | named-barrel-star-* (5), -mixed, -order, -self-test, span-*-after-folds | green |
| BARL-05 | gate 13, doc examples, traceability --strict, records --close | yes | 91-check records / records-close | green |
| WX-01/02 | `pnpm check:pr`, `91-earlier-checks.mjs` | yes / phase close | earlier-* | green (check:pr taken from 91-21-SUMMARY) |
| WX-03 | gate 14 hydrate probe; `91-check changesets` | yes | hydrate-probe-refusal, changesets | partial: G-1 |
| WX-04 | `91-check scan-forbidden`, `scan-ids` | phase close | scan-forbidden *, scan-ids | green |
| WX-05 | `91-mutation.mjs compare`, coverage close | phase close | 91-mutation compare/landed-*, coverage-close-floor | green |
| WX-06 | `91-check seen-failing` | phase close | seen-failing | green |
| WX-07 | `91-check close` no-release facts, `trailers` | phase close | trailers | green: no tag contains 69e5247d, no package version or CHANGELOG change, no upstream branch, exactly three new changesets |
| BEH-QD-791 | PortSpan.test.ts, PortSpanFold.mutation.test.ts, core surface.test.ts | yes | fold-if-false/-and/-remote-literal/-raw-false/-field-false | green |
| BEH-QD-792 | Hydration.test.ts, HydrationTarget.tst.ts, react surface.test.ts | yes | hydrate-target-*, hydrate-wrong-subject, dehydrate-drops-options | green |
| BEH-QD-793 | GateRegistry.store.test.ts, DeveloperSignalReporters.test.tsx | yes | gate-collision-ignored | green |
| BEH-QD-794 | SequenceIntegrity.test.ts, audit surface.test.ts | yes | sequence-check-type-only | green |
| BEH-QD-795 | three surface.test.ts, named-barrel, surface-diff | yes | values-*, named-barrel-* | green |
| INV-QD-427 | surface tests, surface-diff, gate 13, gate 14 3c | yes | escape-*, surface-* | green |
| INV-QD-428 | HydrationTarget.tst.ts, `pnpm circular`, gate 13 ENTRY | yes | hydrate-target-*, 91-check circular/folds | green |

### Gaps

- **G-1 (WX-03, BEH-QD-792 at the packed artifact) — WARNING, unguarded probe.** Gate 14's hydrate probe
  (`scripts/check-package-install.mjs` lines 666-682: `hydrateDecisions(hydrationAtoms, …)`, the `{ hydrate }`
  forwarding copy, `@ts-expect-error` on `{}`) is on none of `TYPE_ONLY_PROBES` (l.122), `RUNTIME_PROBES` (l.140:
  `["PORT_NAMES", "tabulatePorts"]`) or `REFUSED_SHAPE_PROBES` (l.158), all of which are core-only. Deleting the probe
  block leaves gate 14 green. `hydrate-probe-refusal` proves the probe bites while present, not that its absence is
  caught. Fix belongs to the orchestrator (a react-side probe guard plus a seen-failing deletion entry).
- Not a validation gap, noted: `packages/react/src/QadiProvider.tsx` l.49-50 import `./GateWriter.ts` twice (type and value);
  no house-style rule refuses it.

Compliance: `nyquist_compliant: false` until G-1 is closed.
