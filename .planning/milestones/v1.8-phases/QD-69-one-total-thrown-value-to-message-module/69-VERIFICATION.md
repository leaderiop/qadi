---
phase: QD-69-one-total-thrown-value-to-message-module
verified: 2026-11-22T12:30:00Z
status: passed
score: 4/4 roadmap success criteria verified (12/12 requirement ids covered)
covered_files:
  - ".planning/phases/QD-69-one-total-thrown-value-to-message-module/69-01-PLAN.md"
  - ".planning/phases/QD-69-one-total-thrown-value-to-message-module/69-01-SUMMARY.md"
  - ".planning/phases/QD-69-one-total-thrown-value-to-message-module/69-02-PLAN.md"
  - ".planning/phases/QD-69-one-total-thrown-value-to-message-module/69-02-SUMMARY.md"
  - ".planning/phases/QD-69-one-total-thrown-value-to-message-module/69-03-PLAN.md"
  - ".planning/phases/QD-69-one-total-thrown-value-to-message-module/69-03-SUMMARY.md"
  - ".planning/phases/QD-69-one-total-thrown-value-to-message-module/69-04-PLAN.md"
  - ".planning/phases/QD-69-one-total-thrown-value-to-message-module/69-04-SUMMARY.md"
  - ".planning/phases/QD-69-one-total-thrown-value-to-message-module/69-05-PLAN.md"
  - ".planning/phases/QD-69-one-total-thrown-value-to-message-module/69-05-SUMMARY.md"
  - ".planning/phases/QD-69-one-total-thrown-value-to-message-module/69-06-PLAN.md"
  - ".planning/phases/QD-69-one-total-thrown-value-to-message-module/69-06-SUMMARY.md"
  - ".planning/phases/QD-69-one-total-thrown-value-to-message-module/69-07-PLAN.md"
  - ".planning/phases/QD-69-one-total-thrown-value-to-message-module/69-07-SUMMARY.md"
  - ".planning/phases/QD-69-one-total-thrown-value-to-message-module/69-08-PLAN.md"
  - ".planning/phases/QD-69-one-total-thrown-value-to-message-module/69-08-SUMMARY.md"
  - ".planning/phases/QD-69-one-total-thrown-value-to-message-module/69-09-PLAN.md"
  - ".planning/phases/QD-69-one-total-thrown-value-to-message-module/69-09-SUMMARY.md"
  - "packages/core/src/CustomPredicate.ts"
  - "packages/core/src/JsonHazard.ts"
  - "packages/core/src/PortDerivation.ts"
  - "packages/core/src/PortKey.ts"
  - "packages/core/src/PortWireEncode.ts"
  - "packages/core/src/SinkCodec.ts"
  - "packages/core/src/ThrownMessage.ts"
  - "packages/core/src/index.ts"
  - "packages/devtools/src/model/Capture.ts"
  - "packages/devtools/src/model/DiagnosticsFeed.ts"
  - "packages/devtools/src/model/DiagnosticsStore.ts"
  - "packages/devtools/src/model/ExplorerSession.ts"
  - "packages/devtools/src/model/GatesFeed.ts"
  - "packages/devtools/src/model/TimelineFeed.ts"
  - "packages/http/src/RemotePorts.ts"
  - "packages/react/src/DeveloperSignals.ts"
covered_digest: "v4:sha256:6ba9df60d39b1b7acf8bf531b73a7d9a9e78a625c3da3c5dc8668f4998b7d879"
behavior_unverified: 0
overrides_applied: 0
---

# Phase 69: One total thrown-value-to-message module Verification Report

**Phase Goal:** Every "never throws" function in core stays total when the value it caught is hostile, because one total rule exported by `@qadi/core` turns a caught value or a cause into a message and every copy uses it.
**Verified:** 2026-11-22
**Status:** passed
**Re-verification:** No, initial verification

## Goal Achievement

### Observable Truths (ROADMAP success criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Regression tests written on the phase base are RED for each unguarded site and GREEN after | VERIFIED | `69-RED-EVIDENCE.md` lists 21 RED titles (24 failed assertions) with first failure lines, each at its site: `PortDescription.test.ts` (request key, wire encodes), `PortKey.test.ts`, `PortWire.test.ts`, `SinkCodec.test.ts`, `Evaluate.test.ts` (dying predicate), `PortConformance.test.ts`, plus http, react and devtools. Run now: core 7 files / 641 tests, http 64, react 35, devtools 6 files / 227, all passing. |
| 2 | One total rule exported by `@qadi/core` guards `message`, `String()` and `Cause.pretty`, owns the single placeholder, with a table test | VERIFIED | `packages/core/src/ThrownMessage.ts`: `thrownMessage` (try on `instanceof`/`message`, try on `String`, fixed words) and `causeMessage` (try `Cause.pretty`, else `thrownMessage(Cause.squash)`). `UNDESCRIBABLE` is the only placeholder literal in `packages/*/src` (grep: the old `<unrenderable cause>` is gone). `ThrownMessage.test.ts` has 22 value rows (Error, plain, throwing toString, throwing message getter, both, no-proto, proxy, revoked proxy) and 7 cause rows. |
| 3 | All six core sites use it; no inline copy remains; SinkCodec and CustomPredicate pins assert the one placeholder | VERIFIED | `thrownMessage` is called in `SinkCodec.ts:363`, `JsonHazard.ts:184`, `PortKey.ts:200`, `PortDerivation.ts:115`, `PortWireEncode.ts:132,150`, `CustomPredicate.ts:226` (and `causeMessage` at `:227`). Outside core: `http/RemotePorts.ts:45`, `react/DeveloperSignals.ts` (namedLine/errorLine), `devtools/Capture.ts`, and `causeMessage` in `TimelineFeed`, `DiagnosticsFeed`, `DiagnosticsStore`, `ExplorerSession`, `GatesFeed`. `grep -rn "instanceof Error" packages/*/src` returns only `ThrownMessage.ts` plus three guarded, documented non-copies (`Source.ts` name-only read inside try, `GatesFeed.ts` compare key inside try with `UNREADABLE_KEY`, `DeveloperSignals.ts` `namedLine` inside try, falling to `thrownMessage`). No `instanceof Error ? ….message : String(…)` remains. |
| 4 | ADR-QD-182 records the rule; an invariant states each "never throws" function stays total | VERIFIED | `spec/decisions/182-one-total-thrown-value-to-text-rule-exported-by-core.md` (Rev 1.1, Accepted), `spec/decisions/index.yaml:557`. `INV-QD-383` (total whatever value it caught) and `INV-QD-384` (no cause rendered through a throwing call) in `spec/invariants.md:4364,4376`, cross-linked to the ADR and each other. |

**Score:** 4/4 truths verified, 0 behavior-unverified.

### Additional goal checks requested

| Check | Result |
|-------|--------|
| Exactly one `Cause.pretty(` call in `packages/*/src` | PASS: only `packages/core/src/ThrownMessage.ts:55`. Other hits are comments. |
| Both exports in the barrel | PASS: `packages/core/src/index.ts:58` `export * from "./ThrownMessage.ts"`. |
| Both exports in `spec/overview.md` | PASS: rows for `thrownMessage` (line 156) and `causeMessage` (157); `node scripts/check-api-surface.mjs`: 941 exports documented across 9 packages, clean. |
| ADR-QD-182, INV-QD-383/384, BEH-QD-681..685, CCR-QD-461 present and consistent | PASS: BEH-681/682 in `behaviors/06-services.md`, 683 in `32-custom-predicates.md`, 684 in `34-remote-ports.md`, 685 in `29-devtools-simulator.md`; CCR-QD-461 row in `spec/README.md:398` citing the ADR and the amended behaviour revisions; all ids appear in `spec/traceability.md` (24 matching lines). No `*-QD-NEXT` placeholder in shipped source, tests or features. |
| Hostile-value tests exist and pass | PASS: see command evidence below. |

### Required Artifacts / Key Links

| Artifact | Status | Details |
|----------|--------|---------|
| `packages/core/src/ThrownMessage.ts` | VERIFIED | substantive (60 lines, two guarded functions), exported, imported by 6 core files and by http, react and devtools through `@qadi/core`. |
| Core call sites (6) | WIRED | each routes its `catch`/`failure`/`defect` through the rule (see truth 3). |
| Out-of-core copies (http, react, devtools capture and 5 devtools cause renderers) | WIRED | see truth 3. |

Data-flow: the message produced flows into typed refusals (`EncodeRefusal.EncodeFailed`, `KeyRefusal.Unreadable`, `RemotePortFailure.Transport`, `CustomPredicateError`, feed `Stopped`/`Failed` reasons); tests assert the placeholder arrives in each.

### Behavioral Spot-Checks (run in this verification, one vitest at a time)

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Core total-function tables and sites | `pnpm exec vitest run --project core` on ThrownMessage, PortWire, PortKey, PortDescription, SinkCodec, PortConformance, Evaluate tests | 7 files, 641 passed | PASS |
| http transport | `--project http packages/http/test/PortRoutes.test.ts` | 64 passed | PASS |
| react reporter line | `--project react packages/react/test/DeveloperSignals.test.ts` | 35 passed | PASS |
| devtools capture and feeds | `--project devtools` Capture, ExplorerSession, TimelineFeed, DiagnosticsFeed, DiagnosticsStore, GatesFeed | 6 files, 227 passed | PASS |
| Gate 13 | `node scripts/check-api-surface.mjs` | clean | PASS |
| House style | `node scripts/check-house-style.mjs` | 563 files clean | PASS |
| Mutation record | `node .planning/phases/QD-69-.../69-mutation.mjs compare` | exit 0; "no file has an open or Ignored mutant its base did not have, and every score that fell lost only killed mutants"; `ThrownMessage.ts` 12/12 killed | PASS |
| Merge gate | `$TMPDIR/qd69/check-pr.log` | "ran 17 of 18 steps; pnpm mutation skipped (release PRs run it)", spec:publish and bench self-test last, no failure | PASS (log read, not re-run) |

Stryker was not run (per instruction); the committed record was compared only.

### Probe Execution

No `scripts/*/tests/probe-*.sh` declared by the phase. SKIPPED.

### Requirements Coverage

| Requirement | Status | Evidence |
|-------------|--------|----------|
| THRW-01 | SATISFIED | RED evidence file on phase base, GREEN now (truth 1). |
| THRW-02 | SATISFIED | `ThrownMessage.ts`, exported from the barrel (ADR-QD-099), one placeholder. |
| THRW-03 | SATISFIED | six core sites, three outside copies and every devtools `Cause` render use it; one `Cause.pretty(`. |
| THRW-04 | SATISFIED | `ThrownMessage.test.ts` table; SinkCodec and PortConformance pins assert the one placeholder. |
| THRW-05 | SATISFIED | ADR-QD-182, INV-QD-383/384. |
| WX-01 | Contribution met | `check:pr` 17/18 steps exit 0 at HEAD (log); mutation step deferred by design to the release PR. Milestone row stays Pending. |
| WX-02 | Contribution met | ADR-QD-182, CCR-QD-461, BEH-QD-681..685, INV-QD-383/384, traceability present; reserved numbers only, no placeholder ids. |
| WX-03 | Contribution met | both exports named in `spec/overview.md`; gate 13 clean. |
| WX-04 | Contribution met | added-line scan of `packages/*/src` for `as`, `switch`, `Stryker disable`, `fnUntraced`, `async/await`, `console`, `process.env`, `Record<string, unknown>`, `!`, `any`: no hits; house-style gate clean with the three declared switches unchanged. |
| WX-05 | Contribution met | mutation compare exit 0, no score fell except by removed (killed) mutants; coverage thresholds are part of the `check:pr` run that exited 0. |
| WX-06 | Contribution met | `69-RED-EVIDENCE.md`: RED before fix at `phase_base` for every defect site; green characterisation pins for preserved behaviour. |
| WX-07 | Contribution met | scan of added lines in `packages/*/src` and `packages/*/test` for `Phase 69`, `D-NN`, plan ids and review ids: no hits. No release or version-packages merge observed in the diff. |

No orphaned requirements: every id mapped to Phase 69 in `REQUIREMENTS.md` appears in the phase plans.

### Anti-Patterns Found

None. No `TODO/FIXME/TBD/XXX` in `ThrownMessage.ts`; no stub returns. Residual `String(cause)` reads (`SinkReport`, `DecisionSinkForwarding`, `EncodeRefusalReport`, `AuditWriteReport`) render an Effect `Cause` object, which ADR-QD-182 and the `thrownMessage` doc name as an exception Effect guards itself. `SimulationForm` and `UntrustedDecode` read only `JSON.parse` errors, also a named exception. Both are outside the stated criteria.

### Human Verification Required

None. Security (`69-SECURITY.md` status verified, threats_open 0) and validation (`69-VALIDATION.md` validated, nyquist_compliant true) records agree.

### Gaps Summary

No gaps. The phase goal is observably achieved: the rule exists, is total, is exported and documented, every inline copy and every `Cause.pretty` render goes through it, and the hostile-value tests that were RED on the base are green at HEAD.

---

_Verified: 2026-11-22_
_Verifier: Claude (gsd-verifier)_

## Re-verification (2026-11-23, milestone close sweep)

**Staleness:** `69: stale, verification 9220fba1, 34 covered, 3 changed since` (`v18-stale.mjs`, run at `8752a052`).

| Cited file | Changed since `9220fba1` by |
| --- | --- |
| `packages/core/src/PortDerivation.ts` | `dc2a5a89` fix(76): IN-01 the port key reads through the one guarded read<br>`dfb5984d` fix(75): IN-01 one annotator body beside encodeSpan |
| `packages/core/src/PortKey.ts` | `474303fd` fix(76): IN-01 one builder for the unreadable refusal, and the comment says which reads guard themselves<br>`e0da53cd` fix(76): WR-02 a refusal names an unkeyable object's class only when its name is text<br>`3f01baa1` fix(76): WR-01 the list of rows is read through the guarded read in both lookups and the remedy table<br>`f4c0fd78` fix(76): WR-01 a row or a site that cannot be read is a refusal, never a throw |
| `packages/react/src/DeveloperSignals.ts` | `6c22f886` fix(71): read InstrumentedInProduction's environment condition once, from its row<br>`ede26ad1` refactor(71-08): leave no equivalent mutant in the moved gate store or the contained reporter<br>`4854696a` refactor(71-04): resolve every developer-signal reporter through the table and remove the hand-written resolvers<br>`9b8645ee` fix(71-03): name a throwing collision reporter by the option it was passed through |

**What each change did to the truths:**

- `PortDerivation.ts` (`dc2a5a89`, Phase 76; `dfb5984d`, Phase 75): the request `key` no longer carries its own `Result.try` and `thrownMessage` call. It reads the question through `readGuarded([], …)` from `PortKey.ts`, whose one `unreadable` builder calls `thrownMessage(error)` (`PortKey.ts:136`). The throw still becomes a `KeyRefusal.Unreadable` carrying the one rule's text, so truth 3 (the site routes through the rule) holds, by one call further in. `dfb5984d` swaps `encodeSpan` for `annotateSpan` in the attempts write and touches no thrown-value path. `defect` still goes through `spec.failure`/`causeMessage`.
- `PortKey.ts` (Phase 76): `canonicalKey`'s own `catch` now calls the shared `unreadable(path, error)`, which is the same `KeyRefusal.Unreadable({ path: [...path], message: thrownMessage(error) })`. `brandOf` reads a constructor's `name` only when it is a string, so a refusal's sentence cannot interpolate a symbol. `readGuarded` and `readRows` are new guarded reads that end in the same `thrownMessage`. Nothing weakens totality: every `try` in the module still renders through `thrownMessage`.
- `DeveloperSignals.ts` (Phase 71): the reporter resolvers were rewritten into one table. `namedLine` and `errorLine` still render a caught value through `thrownMessage` (`DeveloperSignals.ts:127,143`), so the react site of truth 3 holds.
- Not a regression, a widening: `Remedies.ts` (Phase 76) is a new devtools caller of `thrownMessage`. The inventory of `thrownMessage`/`causeMessage` callers is otherwise as truth 3 lists it.

Truths 1 to 4 and the additional checks still hold on HEAD: `UNDESCRIBABLE` is still the one placeholder literal in `packages/*/src` (`ThrownMessage.ts:4`, the old `<unrenderable cause>` is absent); `Cause.pretty(` is called once, in `ThrownMessage.ts:55`; `instanceof Error` appears only in `ThrownMessage.ts` and the same three guarded, documented non-copies (`Source.ts`, `GatesFeed.ts`, `DeveloperSignals.ts`).

### Spot-checks re-run (Re-verification (2026-11-23, milestone close sweep))

Run on the tree at `8752a052`, one command at a time, in the foreground, with stdin closed. `pnpm check:pr` exited 0 at `a4741601` (17 of 18 steps, mutation skipped as on every non-release PR); `git diff a4741601 HEAD -- . ':!.planning'` is empty.

| Behaviour | Command run now | Result now | Status |
| --------- | --------------- | ---------- | ------ |
| Core total-function tables and sites | `pnpm exec vitest run packages/core/test/{ThrownMessage,PortWire,PortKey,PortDescription,SinkCodec,PortConformance,Evaluate}.test.ts --project core` | 7 files, 647 tests passed | PASS |
| http transport | `pnpm exec vitest run packages/http/test/PortRoutes.test.ts --project http` | 1 file, 64 passed | PASS |
| react reporter line | `pnpm exec vitest run packages/react/test/DeveloperSignals.test.ts --project react` | 1 file, 43 passed | PASS |
| devtools capture and feeds | `pnpm exec vitest run packages/devtools/test/model/{Capture,ExplorerSession,TimelineFeed,DiagnosticsFeed,DiagnosticsStore,GatesFeed}.test.ts --project devtools` | 6 files, 227 passed | PASS |
| One placeholder, one `Cause.pretty(` | `grep -rn "UNDESCRIBABLE\|unrenderable" packages/*/src`; `grep -rn "Cause.pretty(" packages/*/src` (comments excluded) | one literal (`ThrownMessage.ts:4`); one call (`ThrownMessage.ts:55`) | PASS |
| House style | `node scripts/check-house-style.mjs` | `585 file(s) clean (3 declared switch(es), 74 type-test file(s))` | PASS |
| Gate 13 | `node scripts/check-api-surface.mjs` | exit 0, `940 export(s) documented across 9 package(s)` (941 when verified: Phase 76 removed `ActedEvent`, `ActedAnywhere` and `ActedAnywhereInput` and added `actedAnswerFromEvents` and `signatureAnswerFromSignatures`, and `spec/overview.md` names each) | PASS |

**Digest:** `covered_digest: "v4:sha256:4f92da386c108fb8805cec646333f39909e760447573d7b39c94c0d21228aa7a"` becomes `covered_digest: "v4:sha256:6ba9df60d39b1b7acf8bf531b73a7d9a9e78a625c3da3c5dc8668f4998b7d879"`, over the same 34 covered files.

**Verdict:** passed
