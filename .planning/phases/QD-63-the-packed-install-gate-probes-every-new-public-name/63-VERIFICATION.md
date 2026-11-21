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
covered_digest: "v4:sha256:1f5cec5eb2848bf4853bf83f1082e58ca20f09316193a38395b6299580a5cb1e"
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

## Re-verification (2026-11-21, Phase 68 sweep)

**Staleness:** `63: stale, verification 321e213d, 18 cited, 5 changed since` (`68-stale.mjs`, run at `0eacebd0`).

| Cited file | Changed since `321e213d` by |
| --- | --- |
| `AGENTS.md` | `36036666` (before Phase 68) fix(67): IN-03 move the dispatch measurement into the evidence document<br>`dea2afb4` (before Phase 68) docs(67-06): BEH-QD-166's reasons and INV-QD-379, traced and registered as CCR-QD-458<br>`f62f450d` (before Phase 68) docs(66-04): ADR-QD-170 amended, BEH-QD-666 and INV-QD-377, traced and registered as CCR-QD-457 |
| `scripts/check-package-install.mjs` (covered) | `ca9ffb18` fix(68-08): the packed-install guard reads the consumer's run and the refused property, and bounds every child |
| `spec/README.md` | `eacfeb6c` docs(68-11): CCR-QD-459, the settled items confirmed, and the devtools patch changeset<br>`82f87b4f` (before Phase 68) docs(67): the later bench run's miss deltas are not the dispatch's alone<br>`e5c18e6f` (before Phase 68) fix(67): IN-04 state the dispatch run's base spreads and host load beside the verdict<br>`36036666` (before Phase 68) fix(67): IN-03 move the dispatch measurement into the evidence document<br>`dea2afb4` (before Phase 68) docs(67-06): BEH-QD-166's reasons and INV-QD-379, traced and registered as CCR-QD-458<br>`a25de426` (before Phase 68) fix(66): WR-01, IN-01, IN-04 state the spec text exactly<br>`f62f450d` (before Phase 68) docs(66-04): ADR-QD-170 amended, BEH-QD-666 and INV-QD-377, traced and registered as CCR-QD-457<br>`b56f32c0` (before Phase 68) docs(65): CCR-QD-456 cites the revisions the review fix left<br>`f8f7ed70` (before Phase 68) docs(65-05): ADR-QD-172 amended; INV-QD-375 and INV-QD-376 recorded, traced and registered<br>`1a800ebb` (before Phase 68) docs(64): the overview's gates-feed row states the listener contract<br>`87267447` (before Phase 68) fix(64): WR-01 state the timeline resize publish's throw in the listener texts<br>`f348c2ea` (before Phase 68) docs(64-04): ADR-QD-177 recorded, indexed, traced and registered |
| `spec/decisions/033-the-packed-artifact-is-the-product.md` | `5b603fea` docs(68-10): the amended decisions, behaviours and invariants say what the code holds |
| `spec/traceability.md` | `5b603fea` docs(68-10): the amended decisions, behaviours and invariants say what the code holds<br>`faec4fab` docs(68-07): the characterisation's readings, the projection's accessors, the admit pins and the supplied trace<br>`dea2afb4` (before Phase 68) docs(67-06): BEH-QD-166's reasons and INV-QD-379, traced and registered as CCR-QD-458<br>`a25de426` (before Phase 68) fix(66): WR-01, IN-01, IN-04 state the spec text exactly<br>`f62f450d` (before Phase 68) docs(66-04): ADR-QD-170 amended, BEH-QD-666 and INV-QD-377, traced and registered as CCR-QD-457<br>`a23dacf1` (before Phase 68) fix(65): WR-01 narrow the read-once claim to the question's resource and action<br>`7e2530f1` (before Phase 68) docs(65-05): BEH-QD-661 and BEH-QD-662<br>`f8f7ed70` (before Phase 68) docs(65-05): ADR-QD-172 amended; INV-QD-375 and INV-QD-376 recorded, traced and registered<br>`18afe3bf` (before Phase 68) docs(64-04): BEH-QD-656, INV-QD-373 and the ADR-QD-173 amendment<br>`f348c2ea` (before Phase 68) docs(64-04): ADR-QD-177 recorded, indexed, traced and registered |

**Trailers on this phase's commits:** 15 none, 14 `Claude Sonnet 5.5 <noreply@anthropic.com>`, 3 `Claude Opus 5.5 <noreply@anthropic.com>`.

**Validation record:** `63-VALIDATION.md` has status `draft` and nyquist_compliant `false`.

**Digest:** `covered_digest: "v4:sha256:43710d14b6a332f32ae43ba851ed02e2888c9f4aff687beb207119607cc8deda"` becomes `covered_digest: "v4:sha256:94bd2f022b75b791fddcf966a89e93fc8a1c68c9eddd7fd8d1f1349751e5f105"`, over the same 11 covered files.

### Spot-checks re-run (Phase 68 sweep)

Every row below was run on the tree at `0eacebd0`, one command at a time, in the foreground, with nothing else running beside it.

| Behaviour | Command run now | Result now | Status |
| --------- | --------------- | ---------- | ------ |
| Guard RED on base fixture | a scratch copy of `161637ab`'s `scripts/check-package-install.mjs` with `ROOT` set to the repository and `SANDBOX` to a gitignored scratch directory, run as `node <copy> < /dev/null`; the copy and its sandbox were deleted after | exit 1; `the consumer fixture never calls makeDiagnosticsFeed, makeGatesFeed`, the `DecisionCacheShape` type line and the `DecisionCacheShape` refusal line, then `package-install: 3 failure(s) across 9 package(s).`, the same three lines as the RED evidence | PASS |
| Gate 14 on the tree | `node scripts/check-package-install.mjs < /dev/null`, run once | exit 0; `package-install: 9 package(s) pack, resolve and authorize (524 runtime export(s))`, the same count as at the verification | PASS |
| DoD table | `node scripts/check-dod-table.mjs < /dev/null` | exit 0; `dod-table: 25 step(s) match pnpm check, 151 reference(s) resolve` | PASS |
| Whole merge gate minus mutation | `pnpm check:pr < /dev/null` is not run here, so that the one run of the phase is the one that covers the tree its last plan leaves | Answered by the single `check:pr` run in plan 68-15, which reads the whole tree; this verdict stands only while that run is green | ANSWERED BY 68-15 |

The guard mechanism the original rows describe was replaced by 68-08 (see the next section), so the file at `HEAD` was also run against the planted defects the plan that changed it recorded, with `bash` over its scratch script, from the repository root, nothing running beside it. Each plant is a copy of the working `scripts/check-package-install.mjs` written to a scratch path, run as the gate, and removed. The script ended `pi-plants: all passed` with eight `ok` lines: a directive on another property than the refused member fails, naming `whose property named by its refused member carries a @ts-expect-error`; a feed call written but never run fails, naming `the consumer fixture never calls makeDiagnosticsFeed`; an alias and an array type left in place of the type use fail, naming `never declares a value typed DecisionCacheShape`; a block-comment directive and a `//@ts-expect-error` directive both pass; an absent `typescript/unstable/*` entry fails, naming the installed TypeScript's unstable API; a collector whose snapshot dies fails, naming `diagnostics feed stop reason was Error: planted`; a one-millisecond child timeout fails, naming `pnpm build FAILED`. `git status` afterwards showed no plant file and no change to `packages`, `scripts`, `spec` or `features`.

### Changed covered files read against the truths that cite them (Phase 68 sweep)

- `scripts/check-package-install.mjs` (68-08, `ca9ffb18`): Truths 1 to 4 still hold. The change is the guard's mechanism, and it narrows what the report calls a shortcut. Truth 1's guard no longer decides a call from a TypeScript parse (`isCallExpression` plus `isIdentifier`, the report's wording); the consumer now runs under a module hook that wraps each `make*Feed` of the packed `@qadi/devtools` and records each call, and the feed set still comes from `Object.keys(await import("@qadi/devtools"))` filtered by `/^make\w*Feed$/`. The report's Info row (a call written but never run counts as probed) therefore no longer holds as written: that case now fails, as the second plant above shows. A vacuous feed set, a missing `consumer.ts` and a parser that fails to load or run each still call `fail(...)`, and the parser failure now names `typescript@<version>`. Truth 2: the diagnostics yield loop is still bounded (`LIVE_TURNS = 200`, no wall clock) and now also ends on `Stopped` so its reason is reported; it still asserts `Live` and a first-read `hydration`. Truth 3: the host cache, its `miss,hit` assertion and the refused pre-0.13 literal are unchanged; the refusal now counts only where the literal's own property named by `getOrCompute` is led by the directive, and a type-only name counts only where it annotates a declared value outside a refused literal, both stricter than the report's. Truth 4: the removed-probe behaviour is the one the base-fixture row and the plants above show failing the gate, and the DoD table is unchanged (see the notes). Every child process now has a 600000 ms timeout, which does not touch a truth.
- Cited, not covered, and changed since: `AGENTS.md` section 16 still carries the one sentence the report cites (it names every `make*Feed` call and the `DecisionCacheShape` host cache); the ADR-QD-033 amendment the report cites is still in place at Revision 1.3, which adds a second amendment that states the run-reading guard; `spec/README.md` still registers CCR-QD-454 (line 391); `spec/traceability.md` still traces it, now at line 274, not 269.

### Notes on the original report's evidence

Kept whole above; recorded here, not edited.

- The DoD claim (Truth 4) holds on the current tree: `node scripts/check-dod-table.mjs` above passes; `git diff 11dc168f HEAD -- spec/process/definitions-of-done.md` is still only the Revision (1.18 to 1.19), the Change History cell and the one prose paragraph under step 14, with no table row line changed, and the file's only commit since the base is `744d415d`, Phase 63's own. `package.json` has no diff from `11dc168f` to `HEAD`. The claim "`packages/` has no diff" is true of Phase 63's own range (`git diff --name-only 11dc168f 321e213d -- ':(glob)packages/**'` lists 0 files, checked with a pathspec that selects files below the directory) and is not true of the tree now, because Phases 64 to 68 changed `packages/*/src`; none of that is part of Phase 63's truths.
- The report's line numbers for the registrations (`spec/README.md` l.391, `spec/traceability.md` l.269) are correct only for README; traceability's row moved to l.274 when later phases added rows above it.
- The report's merge-gate row ("reported, not re-run") is answered above by 68-15's one run, as for the other phases.
- `63-VALIDATION.md` is `draft` with `nyquist_compliant` `false`: reported, not edited. A validation audit is `/gsd-validate-phase`'s.

**Verdict:** passed

## Re-verification (2026-11-21, after the code review's fixes)

**Staleness:** `63: stale, verification 44a87d05, 18 cited, 4 changed since` (`68-stale.mjs`, run at `2367f9df`).

| Cited file | Changed since `44a87d05` by |
| --- | --- |
| `scripts/check-package-install.mjs` (covered) | `8c3375fb` fix(QD-68): WR-02 the timeout text claims only the execFileSync children<br>`5d44982d` fix(QD-68): WR-01 a timed-out or killed child names its cause in the packed-install guard |
| `spec/README.md` | `8c3375fb` fix(QD-68): WR-02 the timeout text claims only the execFileSync children |
| `spec/decisions/033-the-packed-artifact-is-the-product.md` | `8c3375fb` fix(QD-68): WR-02 the timeout text claims only the execFileSync children |
| `spec/traceability.md` | `8c3375fb` fix(QD-68): WR-02 the timeout text claims only the execFileSync children |

**Trailers on this phase's commits:** 15 none, 14 `Claude Sonnet 5.5 <noreply@anthropic.com>`, 3 `Claude Opus 5.5 <noreply@anthropic.com>`.

**Validation record:** `63-VALIDATION.md` has status `draft` and nyquist_compliant `false`.

**Digest:** `covered_digest: "v4:sha256:94bd2f022b75b791fddcf966a89e93fc8a1c68c9eddd7fd8d1f1349751e5f105"` becomes `covered_digest: "v4:sha256:2813dd3474a5e34d463c85d8b9d03c08b2ff4a05b9b6f48c7c49c325e436acec"`, over the same 11 covered files.

### Spot-checks re-run (Re-verification (2026-11-21, after the code review's fixes))

Every row was run on the tree at `2367f9df` (the commit `68-stale.mjs` named), one command at a time, in the foreground, with nothing else running beside it. Heavy commands were run once and their result is shared across the six phases' sections.

| Behaviour | Command run now | Result now | Status |
| --------- | --------------- | ---------- | ------ |
| Gate 14 on the tree | `node scripts/check-package-install.mjs < /dev/null`, run once, alone, in the foreground | exit 0; `package-install: 9 package(s) pack, resolve and authorize (524 runtime export(s))`, the same count as at the verification and at the earlier re-verification; 8.2 s | PASS |
| Revision headers and registers | `node scripts/spec-revise.mjs --check < /dev/null` | exit 0; `spec-revise: every Revision matches its newest Change History entry` | PASS |
| Traceability | `bash spec/scripts/verify-traceability.sh --strict < /dev/null` | exit 0; `PASS: 21   FAIL: 0   SKIP: 0 (strict: skips count as failures)` | PASS |
| What `8c3375fb` changed in the spec | `git show 8c3375fb -- spec` | `spec/README.md`: the Revision header (1.273 to 1.274), its Change History and the CCR-QD-459 row (ADR-QD-033 now cited at Rev 1.4). `spec/traceability.md`: the header (1.235 to 1.236), its Change History and the ADR-QD-033 row. `spec/decisions/033-*.md`: Revision 1.4 and the sentence on child timeouts. Every other row of both registers is unchanged | PASS |

### Changed cited files read against the truths that cite them (Re-verification (2026-11-21, after the code review's fixes))

- `scripts/check-package-install.mjs` (`5d44982d`, `8c3375fb`): Truths 1 to 4 still hold, as the gate run above shows. WR-01 makes a timed-out or killed child name its cause; WR-02 corrects the claim in the guard's text so that it covers only the `execFileSync` children. The earlier section's remark "every child process now has a 600000 ms timeout" is therefore narrowed, not contradicted: the one child without a timeout is the TypeScript server behind `typescript/unstable/sync`'s `API`, whose calls block and take no bound. No truth of this report rests on that sentence.
- `spec/decisions/033-the-packed-artifact-is-the-product.md` is at Revision 1.4 (`grep` of its header); the CCR-QD-454 amendment the report cites is unchanged. `spec/README.md` still registers CCR-QD-454 at line 391 and `spec/traceability.md` still traces ADR-QD-033 at line 274, both unchanged rows.

**Verdict:** passed

## Re-verification (2026-11-21, after Phase 68.1)

**Staleness:** `63: stale, verification 510d731d, 20 cited, 5 changed since` (`68-stale.mjs`, run at `f91b9f4b`).

| Cited file | Changed since `510d731d` by |
| --- | --- |
| `package.json` | `ecb4ed90` fix(68.1-02): analyze.mjs exits 1 on a failed gate, and pnpm check runs its self-test |
| `scripts/check-package-install.mjs` (covered) | `cc58b8e6` fix(68.1-04): the probe guard's parse runs in a child under the gate's timeout |
| `spec/README.md` | `a8b36092` docs(68.1-05): ADR-QD-033 amended and CCR-QD-460 recorded |
| `spec/decisions/033-the-packed-artifact-is-the-product.md` | `a8b36092` docs(68.1-05): ADR-QD-033 amended and CCR-QD-460 recorded |
| `spec/process/definitions-of-done.md` | `ecb4ed90` fix(68.1-02): analyze.mjs exits 1 on a failed gate, and pnpm check runs its self-test |

**Trailers on this phase's commits:** 15 none, 14 `Claude Sonnet 5.5 <noreply@anthropic.com>`, 3 `Claude Opus 5.5 <noreply@anthropic.com>`.

**Validation record:** `63-VALIDATION.md` has status `draft` and nyquist_compliant `false`.

**Digest:** `covered_digest: "v4:sha256:2813dd3474a5e34d463c85d8b9d03c08b2ff4a05b9b6f48c7c49c325e436acec"` becomes `covered_digest: "v4:sha256:1f5cec5eb2848bf4853bf83f1082e58ca20f09316193a38395b6299580a5cb1e"`, over the same 11 covered files.

**Staleness by `68.1-stale.mjs`:** `63: stale, verification 510d731d, 20 cited, 5 changed since` (run at `f91b9f4b`).

### Spot-checks re-run (Re-verification (2026-11-21, after Phase 68.1))

Every row was run on a tree whose tracked files outside the planning directory are those of `f91b9f4b`, one command at a time, in the foreground, with stdin closed and nothing else running beside it. Gate 14 was not run again for this section: its one run of this phase is Plan 68.1-04's, taken at `cc58b8e6` on the tree that holds every code change of the phase, and the first row shows nothing gate 14 reads has changed since. The spec-revise, DoD-table and traceability results are shared with the other re-verifications of this phase and were taken once at `c3d8553a`; no tracked file outside the planning directory differs between that head and `f91b9f4b`.

| Behaviour | Command run now | Result now | Status |
| --------- | --------------- | ---------- | ------ |
| Gate 14 on the tree (Plan 68.1-04's one run) | `node scripts/check-package-install.mjs < /dev/null`, run once by 68.1-04 at `cc58b8e6`, foreground, nothing beside it; and `git diff --quiet cc58b8e6 HEAD -- packages scripts package.json pnpm-lock.yaml` now | exit 0 (15 s); `package-install: 9 package(s) pack, resolve and authorize (524 runtime export(s))`, the count of the verification and of both earlier re-verifications; the diff is silent (exit 0), so nothing gate 14 reads changed after that run | PASS |
| The moved probe guard answers as the base's did | 68.1-04's parity run, compared again now with `cmp`: the guard's answers on four sandboxes (`full`, `no-registry`, `no-refusal`, `no-consumer`) and on a planted parser load failure, from the phase base's gate and from the gate at `cc58b8e6` | `cmp` is silent; both outputs are 5 lines with SHA-256 `d04ed1069682394b8fbe75a073c9b815508910c6fc2404096d7f50664075bc2d` | PASS |
| What the phase changed in the gate | `git diff -U1 0e3f3438 HEAD -- scripts/check-package-install.mjs` | four hunks: the guard's header comment, the comment above the child timeout, the guard's parse (now a call to a child process under the same timeout, with the same failure texts) and the line reporting a parser failure (now naming its cause); the probe fixtures, the host cache, the feed set and every assertion are outside the hunks | PASS |
| What the phase changed in the decision | `git diff -U0 0e3f3438 HEAD -- spec/decisions/033-the-packed-artifact-is-the-product.md` | the Revision (1.4 to 1.5), Status and Change History rows, one sentence of the ARCH-115 amendment put in the past tense (the unbounded server it named is now bounded), and a new amendment section after it; the earlier amendments, among them the CCR-QD-454 one this report cites, are otherwise unchanged | PASS |
| DoD table | `node scripts/check-dod-table.mjs < /dev/null` (shared), and `git diff -U0 0e3f3438 HEAD -- spec/process/definitions-of-done.md` | exit 0; `dod-table: 26 step(s) match pnpm check, 153 reference(s) resolve`; the diff is the Revision (1.19 to 1.20), the Change History cell, one added table row (26, after row 25) and one added paragraph about it; rows 1 to 25 and the step 14 paragraph are untouched | PASS |
| What the phase changed in the package manifest | `git diff -U0 0e3f3438 HEAD -- package.json` | the new `bench:self-test` script and ` && pnpm bench:self-test` at the end of `check`; the `spec:package` script that runs gate 14 and the `check:pr` script are unchanged; no dependency field is touched | PASS |
| What the phase changed in the spec register, and the revisions | `git diff -U0 0e3f3438 HEAD -- spec/README.md`, and `node scripts/spec-revise.mjs --check < /dev/null` (shared) | the Revision header (1.274 to 1.275), the Change History cell and one added row, CCR-QD-460 (line 397); no row is removed or edited, so CCR-QD-454's row is still at line 391; `spec-revise` exit 0 | PASS |
| Traceability | `bash spec/scripts/verify-traceability.sh --strict < /dev/null` (shared) | exit 0; `PASS: 21   FAIL: 0   SKIP: 0 (strict: skips count as failures)` | PASS |

### Changed cited files read against the truths that cite them (Re-verification (2026-11-21, after Phase 68.1))

- `scripts/check-package-install.mjs` (68.1-04, `cc58b8e6`): Truths 1 to 4 still hold. The change is the guard's TypeScript parse, which decides what annotates a value and which refusal carries the directive: it moved into a child process the gate starts with `execFileSync` under the timeout every other child has, so a TypeScript server that stops answering now ends the gate at that bound. Truth 1's feed set, its vacuous-set, missing-consumer and parser-failure refusals and its run-reading mechanism are outside the changed hunks, and the parser-failure text now also names the cause. The parity row shows the guard's answers on four sandboxes and a planted load failure equal to the base's, so each truth that reads the probes is answered as before. Truths 2 and 3 read the fixture's feed and host-cache probes and Truth 4 the removed-probe failures; no line of the fixture or of those assertions changed. The earlier plants of the Phase 68 section were not run again: the parity run is the evidence for the part that moved. The timeout bounds the child the gate starts; the TypeScript server that child started is not killed with it and may outlive a killed child, so the claim made here is that the gate no longer waits on it, not that no server process is left behind.
- `spec/decisions/033-the-packed-artifact-is-the-product.md` (68.1-05, `a8b36092`): the report cites the CCR-QD-454 amendment, which is unchanged; the document is now at Revision 1.5, where the earlier section read 1.4. The new amendment states the bounded child, and the sentence it turns into the past tense is the one the earlier section already said no truth rests on.
- `spec/process/definitions-of-done.md` (68.1-02, `ecb4ed90`): Truth 4 says the DoD table is unchanged over Phase 63's own range, with `25 step(s)` read at the time. That reading is now 26, because step 26 was appended after step 25 with no renumbering; the report's claim, that Phase 63 changed no row, is unaffected, and the paragraph under step 14 that Phase 63 amended is untouched.
- `package.json` (68.1-02, `ecb4ed90`): the report cites it as wiring gate 14 into `pnpm check` and `check:pr` unchanged. Both still run gate 14 where they did: `check` only gains a final step after `spec:publish`, and the manifest's `spec:package` script is as before.
- `spec/README.md` (68.1-05, `a8b36092`): the report cites the CCR-QD-454 registration at line 391, which is where it still is and unedited; the commit adds the CCR-QD-460 row after the other registrations and moves the revision.

**Verdict:** passed
