---
phase: QD-63-the-packed-install-gate-probes-every-new-public-name
verified: 2026-11-20T00:00:00Z
status: passed
score: 4/4 must-haves verified
covered_files:
  - ".planning/phases/QD-63-the-packed-install-gate-probes-every-new-public-name/63-01-PLAN.md"
  - ".planning/phases/QD-63-the-packed-install-gate-probes-every-new-public-name/63-01-SUMMARY.md"
  - ".planning/phases/QD-63-the-packed-install-gate-probes-every-new-public-name/63-02-PLAN.md"
  - ".planning/phases/QD-63-the-packed-install-gate-probes-every-new-public-name/63-02-SUMMARY.md"
  - ".planning/phases/QD-63-the-packed-install-gate-probes-every-new-public-name/63-03-PLAN.md"
  - ".planning/phases/QD-63-the-packed-install-gate-probes-every-new-public-name/63-03-SUMMARY.md"
  - ".planning/phases/QD-63-the-packed-install-gate-probes-every-new-public-name/63-04-PLAN.md"
  - ".planning/phases/QD-63-the-packed-install-gate-probes-every-new-public-name/63-04-SUMMARY.md"
  - ".planning/phases/QD-63-the-packed-install-gate-probes-every-new-public-name/63-05-PLAN.md"
  - ".planning/phases/QD-63-the-packed-install-gate-probes-every-new-public-name/63-05-SUMMARY.md"
  - "scripts/check-package-install.mjs"
covered_digest: "v4:sha256:43710d14b6a332f32ae43ba851ed02e2888c9f4aff687beb207119607cc8deda"
behavior_unverified: 0
overrides_applied: 0
---

# Phase QD-63: The packed-install gate probes every new public name — Verification Report

**Phase Goal:** Gate 14's packed consumer compiles and runs every public name Phases 60 and 61 made public that it never touched (`makeGatesFeed`, `makeDiagnosticsFeed`, `DecisionCacheShape`), so a broken `exports` map entry or `.d.ts` for any of them fails the merge gate, and a future `make*Feed` export cannot be left unprobed.
**Verified:** 2026-11-20
**Status:** passed
**Re-verification:** No, initial verification

## Goal Achievement

### Observable Truths

| # | Truth (ROADMAP Success Criterion) | Status | Evidence |
|---|-----------------------------------|--------|----------|
| 1 | Gate 14 fails when any `make*Feed` runtime export of the packed `@qadi/devtools` root is not called in the consumer (comments stripped, call not mention); guard written first and RED on the phase base, where two names are unprobed | VERIFIED | Guard reads the feed set from the installed artifact (`Object.keys(await import("@qadi/devtools"))` filtered by `/^make\w*Feed$/`, `scripts/check-package-install.mjs` ~l.828) and decides "call" from a TypeScript parse (`isCallExpression` + `isIdentifier`), so comments, strings, `typeof`, imports are not calls. A vacuous feed set, a parser load failure and a missing `consumer.ts` each call `fail(...)`. Guard commit `161637ab` is a pure addition (157 insertions, no fixture edit), so the fixture is the base's. I re-ran that commit's script (scratch copy with `ROOT`/`SANDBOX` overridden, deleted afterwards): exit non-zero with `the consumer fixture never calls makeDiagnosticsFeed, makeGatesFeed` plus the two `DecisionCacheShape` lines, `3 failure(s)`. Matches `63-RED-EVIDENCE.md`. Commit order (guard `161637ab`, probes `a5f1ab5d`/`70676684`/`fc282f72`) confirms guard-first. |
| 2 | Fixture runs `makeGatesFeed` over a one-instance registry and asserts a read state differing from the initial snapshot; runs `makeDiagnosticsFeed` and asserts a field only a completed first read sets; bounded yield loop, no wall clock, closed scope | VERIFIED | Fixture (diff of `scripts/check-package-install.mjs`): bare feed asserted `Unwatched`, registry feed `Read` with count 1, one subscription, follows a second instance, releases on scope close. Diagnostics: yield loop capped at 200 `Effect.yieldNow` turns (no clock), asserts `Live` and `hydration !== undefined`, inside `Effect.scoped`; a `schedule` literal is refused by `@ts-expect-error`. Mutations m1 (options dropped, fails `was Off, wanted Live`) and m3 (empty registry, fails `instance count was 0, wanted 1`) are recorded failing the gate in `63-RED-EVIDENCE.md`. |
| 3 | Fixture builds a typed host cache from `DecisionCacheShape` wrapping `decisionCacheLayer()`, runs a decision twice, asserts a hit; `@ts-expect-error` refuses the pre-0.13 `(question, compute)` shape | VERIFIED | `hostCache` is `Layer.effect(DecisionCache, ...)` over `decisionCacheLayer()`, `shape: DecisionCacheShape`, asserts `miss,hit`, resolver walked once, size 1. `preThirteen: DecisionCacheShape` holds `// @ts-expect-error getOrCompute(question, compute) no longer exists`. Recorded failures: m2 (`miss,miss`), r3 (directive dropped, TS2345), `dts` (reverted packed `.d.ts`, `Unused '@ts-expect-error'`). |
| 4 | A deliberately removed probe is shown failing gate 14, and the DoD table is unchanged | VERIFIED | `63-RED-EVIDENCE.md` records r1 (gates probe), r2 (diagnostics probe), r4 (host cache), r5 (refused literal) removed, each exit 1 naming the right name; plus r3, r6, dts, m1-m3. DoD: `git diff 11dc168f..HEAD -- spec/process/definitions-of-done.md` touches only the Revision (1.18 to 1.19), the Change History cell and one prose paragraph under step 14. No table row line changed (grep over changed `\|` lines other than Revision/Change History: none). `package.json` and `packages/` have no diff. `node scripts/check-dod-table.mjs`: `dod-table: 25 step(s) match pnpm check, 151 reference(s) resolve`. |

**Score:** 4/4 truths verified (0 behavior-unverified)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `scripts/check-package-install.mjs` | Guard + three probes + refusals | VERIFIED | Substantive, wired into `pnpm check`/`check:pr` unchanged; only non-planning source touched alongside docs |
| `spec/decisions/033-the-packed-artifact-is-the-product.md` | Amendment | VERIFIED | Revised; registered CCR-QD-454 in `spec/README.md` l.391, traced in `spec/traceability.md` l.269 |
| `AGENTS.md` section 16, DoD step-14 paragraph | One sentence each | VERIFIED | Present in diff |

### Key Link Verification

| From | To | Via | Status |
|------|----|-----|--------|
| Guard | Packed `@qadi/devtools` exports | `import()` in sandbox, regex on key | WIRED |
| Guard | Fixture `consumer.ts` | TS parse of the sandbox project | WIRED |
| Fixture | Packed `.d.ts` | `tsc -p` before guard; `@ts-expect-error` failures surface | WIRED |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Guard RED on base fixture | scratch copy of `161637ab` script, `ROOT`/`SANDBOX` overridden | exit non-zero, 3 failures incl. `makeDiagnosticsFeed, makeGatesFeed` | PASS |
| Gate 14 at HEAD | `node scripts/check-package-install.mjs < /dev/null` (run once, foreground) | `package-install: 9 package(s) pack, resolve and authorize (524 runtime export(s))`, exit 0 | PASS |
| DoD table | `node scripts/check-dod-table.mjs` | `25 step(s) match pnpm check, 151 reference(s) resolve` | PASS |
| Orchestrator `pnpm check:pr < /dev/null` | reported, not re-run | exit 0, 16 of 17 steps (mutation skipped by design) | ACCEPTED |

Scratch dir `.scratch/qd63-verify/` was deleted afterwards.

### Requirements Coverage

| Requirement | Status | Evidence |
|-------------|--------|----------|
| PROBE-01 | SATISFIED | SC1 |
| PROBE-02 | SATISFIED | SC2 |
| PROBE-03 | SATISFIED | SC2 |
| PROBE-04 | SATISFIED | SC3 |
| PROBE-05 | SATISFIED | SC4 |
| WX-01..07 | Cross-cutting; left Pending by design until the milestone audit | not scored here |

No orphaned requirements.

### Post-plan review fixes

`81847868` extended the guard to hold the `DiagnosticsOptions`/`schedule` refusal and `GateInstanceLike`/`GateRegistryLike` type uses; the real fixture satisfies them (gate green at HEAD). `f4398b04` (ADR/CCR prose) and `b5310eb7` (comments) are non-behavioral. The extension strengthens SC1-SC3 and does not narrow any criterion.

### Anti-Patterns Found

| File | Pattern | Severity | Impact |
|------|---------|----------|--------|
| `scripts/check-package-install.mjs` | No `TBD`/`FIXME`/`XXX` introduced | none | n/a |
| `scripts/check-package-install.mjs` (guard `visit`) | A call written but never executed (uninvoked arrow, shadowed name) counts as probed | Info | Documented in the code as a `shortcut:` comment with its upgrade condition; the compile and run of the same fixture still execute the real probes, whose assertions are mutation-tested (m1-m3). Matches the roadmap wording "a call and not a mention". |

### Human Verification Required

None.

### Gaps Summary

None. Every Success Criterion is backed by code I read, a gate run I made at HEAD, and an independent reproduction of the RED on the base fixture. The removed- and broken-probe table is the executor's recorded evidence (not re-run by me beyond the RED reproduction); it is internally consistent with the guard's code paths and with the orchestrator's green `check:pr`.

---

_Verified: 2026-11-20_
_Verifier: Claude (gsd-verifier)_
