---
phase: "60"
slug: "devtools-headless-interface-is-the-feeds"
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
status: validated
nyquist_compliant: true
wave_0_complete: true
created: "2026-11-19"
---

# Phase 60 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution. Source: `60-RESEARCH.md` § Validation Architecture and CONTEXT D-01..D-18.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest + `@effect/vitest` (project `devtools`); tstyche (`*.tst.ts`); Stryker via `stryker.devtools.mjs` (with `--mutate`, never edited) |
| **Config file** | `packages/devtools/vitest.config.ts`; root `vitest.config.ts` (coverage); `tstyche.json`; `stryker.devtools.mjs` |
| **Quick run command** | `pnpm exec vitest run --project devtools packages/devtools/test/model/TimelineFeed.test.ts packages/devtools/test/model/DiagnosticsFeed.test.ts packages/devtools/test/model/GatesFeed.test.ts packages/devtools/test/model/DiagnosticsStore.test.ts packages/devtools/test/surface.test.ts < /dev/null` (repo root) |
| **Type tests** | `pnpm exec tstyche packages/devtools/test/surface.tst.ts packages/devtools/test/model/DiagnosticsStore.tst.ts < /dev/null` |
| **Full suite command** | `pnpm check:pr < /dev/null` |
| **Estimated runtime** | quick ~1 s; type tests ~3 s; devtools project ~30 s |

---

## Sampling Rate

- **After every task commit:** run the quick command, the type tests and `node scripts/check-house-style.mjs`.
- **After every plan wave:** run these in order:
  1. `pnpm exec vitest run --project devtools < /dev/null`
  2. `pnpm typecheck`
  3. `node scripts/check-api-surface.mjs`
  4. `node scripts/check-doc-examples.mjs`
  5. `node scripts/check-website-doc-examples.mjs`
  6. `pnpm lint`
  7. `pnpm circular`
- **Before `/gsd-verify-work`:**
  1. Run `pnpm check:pr < /dev/null`.
  2. Run `node scripts/check-package-install.mjs`.
  3. Run the scoped Stryker run, then the mutation compare. Never run Stryker beside vitest or check:pr.
- **Max feedback latency:** ~30 seconds.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 60-01-01 | 01 | 1 | WX-02, WX-03 | T-60-01 | phase_base recorded; reserved ids free; gate 13 base count 933 | record | node -e (phase_base, base facts, reservation JSON) + `node scripts/check-api-surface.mjs` | yes | ✅ green |
| 60-01-02 | 01 | 1 | WX-05 | T-60-02 | the harness is the plan's verbatim block (SHA pinned) | script | extract + `shasum -a 256 60-mutation.mjs` + `node --check` | Wave 0 (created here) | ✅ green |
| 60-01-03 | 01 | 1 | WX-05, WX-06 | T-60-02 | baseline taken on the untouched base, `DELETED` declared first; Stryker alone | mutation | `pnpm exec stryker run stryker.devtools.mjs --mutate '<5 files>' < /dev/null`; `node 60-mutation.mjs base`; commit check | Wave 0 (created here) | ✅ green |
| 60-02-01 | 02 | 2 | WX-06 | — | the poll's two spans pinned before GREEN | unit | `pnpm exec vitest run --project devtools …DiagnosticsStore.test.ts < /dev/null` green on base; commit check | yes (edit) | ✅ green |
| 60-02-02 | 02 | 2 | HDLS-02, HDLS-04 | T-60-03 | surface lists RED for the right reason | unit + type | vitest `surface.test.ts` fails; tstyche `surface.tst.ts`; tsc classifier (7 RED files, allowed codes only) | yes (edit) | ✅ green |
| 60-02-03 | 02 | 2 | HDLS-03, HDLS-04, WX-04 | T-60-03 | feed suites through the root RED; `schedule`, generic and unmet layer refused | unit + type | vitest four suites fail; tstyche `DiagnosticsStore.tst.ts`; tsc classifier; commit check | yes (edit) | ✅ green |
| 60-03-01 | 03 | 3 | HDLS-02, HDLS-03 | T-60-04 | tracer: one `DiagnosticsOptions` root → engine; no `runOptions`; D-16 guard gone | tracer (unit) | vitest DiagnosticsFeed/DiagnosticsStore green; node source pins | yes | ✅ green |
| 60-03-02 | 03 | 3 | HDLS-02, HDLS-04, WX-04 | T-60-04, T-60-05 | timeline/gates feeds at root; React barrel named; D-17 note | unit + type | vitest seven RED files green; node barrel/doc/kept-line pins | yes | ✅ green |
| 60-03-03 | 03 | 3 | HDLS-02, HDLS-04, WX-06 | T-60-05 | rename through tests/example; characterisation goldens untouched | unit + gates | `pnpm exec vitest run --project devtools < /dev/null`; typecheck; example; lint; circular; one `feat(60-03)!` commit | yes | ✅ green |
| 60-04-01 | 04 | 4 | HDLS-02, HDLS-04 | T-60-06, T-60-07 | the packed root builds a timeline feed | gate | `node scripts/check-package-install.mjs` (gate 14) with the feed probe; commit check | yes (extend consumer) | ✅ green |
| 60-05-01 | 05 | 5 | WX-05 | T-60-08 | after-run and compare (no evidence) | mutation | Stryker after-run alone; `node 60-mutation.mjs after` + `compare` | yes | ✅ green |
| 60-05-02 | 05 | 5 | WX-05 | T-60-08 | static-ignored credit only with Killed evidence from an out-of-repo config | mutation | evidence run in `mktemp -d`; `node 60-mutation.mjs evidence`; `compare <static>` prints `WX-05 holds (D-10)` | yes | ✅ green |
| 60-05-03 | 05 | 5 | WX-05 | T-60-08 | evidence committed after the last code line | record | node commit check (`chore(60-05)`) | yes | ✅ green |
| 60-06-01 | 06 | 6 | HDLS-03, HDLS-04 | T-60-09, T-60-10 | README headless example is the feeds; reason must not cross a trust boundary | gate | `node scripts/check-doc-examples.mjs`; node README/spec-28/website pins; commit check | yes | ✅ green |
| 60-06-02 | 06 | 6 | WX-07 | T-60-09 | 0.13 upgrade note; Breaking minor changeset; 0.12 After fence drops the type import | gate | `node scripts/check-website-doc-examples.mjs`; node upgrade/changeset pins; commit check | yes | ✅ green |
| 60-07-01 | 07 | 7 | HDLS-01 | T-60-11, T-60-12 | ADR-QD-173 + amendments of 047/099/169; gate numbers name scripts | record | node ADR pins; `node scripts/spec-revise.mjs --check`; commit check | yes | ✅ green |
| 60-07-02 | 07 | 7 | HDLS-04, WX-02 | T-60-11, T-60-12 | BEH-QD-636..640, INV-QD-365..366, dated amendments | record | node heading/Revision pins; spec-revise --check; check-doc-examples; gate 12 `check-devtools-claims.mjs`; commit check | yes | ✅ green |
| 60-07-03 | 07 | 7 | WX-02, WX-03 | T-60-11 | overview, traceability, CCR-QD-451; every reserved id used, no other | gate | spec-revise --check; `verify-traceability.sh --strict`; gate 11 `check-dod-table.mjs`; gate 12; gate 13 `check-api-surface.mjs`; check-doc-examples; node id check | yes | ✅ green |
| 60-08-01 | 08 | 8 | WX-01..07, HDLS-01..04 | T-60-13 | phase scan clean over phase_base..HEAD; D-10 holds at the close | scan | `node 60-scan.mjs` (SHA pinned) prints `phase scan clean`; `node 60-mutation.mjs compare <static>` | Wave 0 (created here) | ✅ green |
| 60-08-02 | 08 | 8 | WX-01, WX-07 | T-60-14 | merge gate green alone; nothing released | gate | `pnpm check:pr < /dev/null`; node release check (one changeset, no tag/remote/version) | yes | ✅ green |
| 60-08-03 | 08 | 8 | HDLS-01..04 | — | HDLS complete; WX stays Pending | record | node REQUIREMENTS.md check; commit check | yes | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

Requirement → test map (from research):

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| HDLS-01 | Owner checkpoint recorded (D-01..D-03, D-12) | record | `60-CONTEXT.md`, ADR-QD-173 | yes / Wave 3 |
| HDLS-02 | Root exports the three feeds; the four pair functions, `noDiagnostics` and `DiagnosticsStore` are gone | unit + type | `vitest … surface.test.ts`; `tstyche surface.tst.ts` | yes (edit) |
| HDLS-02 | The packed root builds a feed | gate | `node scripts/check-package-install.mjs` | yes (extend consumer) |
| HDLS-03 | One `DiagnosticsOptions`; no `schedule`; not generic | type + unit | `tstyche DiagnosticsStore.tst.ts`; `vitest … DiagnosticsStore.test.ts` | yes (edit) |
| HDLS-03 | README headless example compiles | gate | `node scripts/check-doc-examples.mjs` | yes |
| HDLS-04 | Feed suites run against the root entry | unit | `vitest … TimelineFeed DiagnosticsFeed GatesFeed` | yes (re-point) |
| HDLS-04 | Overview matches the interface | gate | `node scripts/check-api-surface.mjs` | yes |
| WX-05 | Touched model files' mutation scores do not fall | mutation | `pnpm exec stryker run stryker.devtools.mjs --mutate '<5 files>'` + `node <D>/60-mutation.mjs compare` | Wave 0 |
| (no behaviour change) | Dock unchanged; characterisation goldens untouched | unit | `pnpm exec vitest run --project devtools < /dev/null` | yes |

---

## Wave 0 Requirements

- [x] `60-mutation.mjs` and `60-mutation-base.json`, measured on the untouched tree (D-08 step 1)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| None | — | — | — |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 30s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** validated 2026-11-19 (audit on HEAD: devtools project 1646 tests, tstyche 15, gates 11-14 + spec-revise + traceability 21/21, scan clean, D-10 holds; no gap tests needed)
