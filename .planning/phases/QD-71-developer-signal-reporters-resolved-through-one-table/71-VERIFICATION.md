---
phase: QD-71-developer-signal-reporters-resolved-through-one-table
verified: 2026-11-22T19:30:00Z
status: passed
score: 9/9 must-haves verified
covered_files:
  - ".planning/phases/QD-71-developer-signal-reporters-resolved-through-one-table/71-01-PLAN.md"
  - ".planning/phases/QD-71-developer-signal-reporters-resolved-through-one-table/71-01-SUMMARY.md"
  - ".planning/phases/QD-71-developer-signal-reporters-resolved-through-one-table/71-02-PLAN.md"
  - ".planning/phases/QD-71-developer-signal-reporters-resolved-through-one-table/71-02-SUMMARY.md"
  - ".planning/phases/QD-71-developer-signal-reporters-resolved-through-one-table/71-03-PLAN.md"
  - ".planning/phases/QD-71-developer-signal-reporters-resolved-through-one-table/71-03-SUMMARY.md"
  - ".planning/phases/QD-71-developer-signal-reporters-resolved-through-one-table/71-04-PLAN.md"
  - ".planning/phases/QD-71-developer-signal-reporters-resolved-through-one-table/71-04-SUMMARY.md"
  - ".planning/phases/QD-71-developer-signal-reporters-resolved-through-one-table/71-05-PLAN.md"
  - ".planning/phases/QD-71-developer-signal-reporters-resolved-through-one-table/71-05-SUMMARY.md"
  - ".planning/phases/QD-71-developer-signal-reporters-resolved-through-one-table/71-06-PLAN.md"
  - ".planning/phases/QD-71-developer-signal-reporters-resolved-through-one-table/71-06-SUMMARY.md"
  - ".planning/phases/QD-71-developer-signal-reporters-resolved-through-one-table/71-07-PLAN.md"
  - ".planning/phases/QD-71-developer-signal-reporters-resolved-through-one-table/71-07-SUMMARY.md"
  - ".planning/phases/QD-71-developer-signal-reporters-resolved-through-one-table/71-08-PLAN.md"
  - ".planning/phases/QD-71-developer-signal-reporters-resolved-through-one-table/71-08-SUMMARY.md"
  - "AGENTS.md"
  - "packages/react/src/DeveloperSignals.ts"
  - "packages/react/src/GateRegistry.ts"
  - "packages/react/src/GateWriter.ts"
  - "packages/react/src/HydrationEngine.ts"
  - "packages/react/src/QadiAtoms.ts"
  - "packages/react/src/QadiProvider.tsx"
  - "packages/react/test/DeveloperSignalReporters.test.tsx"
  - "packages/react/test/DeveloperSignals.tst.ts"
  - "scripts/check-house-style.mjs"
covered_digest: "v4:sha256:ad9434bca5125e370f5773bf3ac9c49e0b4a1a93342377369b1b097b82d2d9e2"
behavior_unverified: 0
overrides_applied: 0
---

# Phase 71: Developer-signal reporters resolved through one table - Verification Report

**Phase Goal:** Every developer-signal reporter is resolved through one table that states where it runs, how often and what it is named, so a failing reporter is reported under the option name the caller actually passed.
**Verified:** 2026-11-22T19:30:00Z
**Status:** passed
**Re-verification:** No, initial verification

## Goal Achievement

### Observable Truths

| #   | Truth | Status | Evidence |
| --- | ----- | ------ | -------- |
| 1 | SC1: a throwing `makeGateRegistry({ onIdCollision })` reporter is named `onIdCollision`, not `onGateIdCollision`; RED on the base | VERIFIED | `GateRegistry.ts:58-60` resolves `reporterFor(SIGNALS.GateIdCollision, "makeGateRegistry", options?.onIdCollision)` and hands the result to `buildGateRegistry`. `GateRegistry.store.test.ts:294,300` pin the name in development and production. `71-RED-EVIDENCE.md` records the pair red on the base. Targeted vitest: 3 files, 104 tests pass. |
| 2 | SC2: `SIGNALS` is total over every `DeveloperSignal` tag and states condition (`speaks`), frequency (`often`), per-entry-point `resolved` and `option` | VERIFIED | `DeveloperSignals.ts` `SIGNALS satisfies SignalTable`. `SignalTable` is keyed by `SignalTag`, so a missing row is a compile error. `DeveloperSignals.tst.ts` pins it ("a table missing a row is refused", the `@ts-expect-error` on `takeTable(withoutAtomsReplaced)`). `pnpm test:tstyche`: 68 files, 366 passed, 0 failed. |
| 3 | SC2: every reporter in `packages/react/src` goes through `reporterFor`; no hand-written per-signal resolver remains; `ReporterName` is derived | VERIFIED | The call sites are `GateRegistry.ts:59`, `QadiAtoms.ts:246,252`, `HydrationEngine.ts:479,670` and `providerSignalReporter`. A grep for `hydrationMismatchReporter`, `gateIdCollisionReporter`, `hydrationDropReporter`, `saysHydrationDropped` and `saysDehydrationDropped` finds nothing in `packages/react/src`. `ReporterName` is read off `typeof SIGNALS` (`OptionOf<Rows[T]["entries"][...]>`) and pinned by `ReporterName is every option an entry point reports under, written out`. |
| 4 | Condition, once-latch and containment are each written once (`holdsHere`, `once`, `contain`); `QadiProvider` reads the row's condition | VERIFIED | `CONDITIONS` + `holdsHere` is the only environment read besides `isDevelopment`. `once` holds the latch; `contain` is the only try/catch around a supplied reporter. `QadiProvider.tsx:274` uses `holdsHere(SIGNALS.InstrumentedInProduction)`. A grep for `isDevelopment`/`NODE_ENV` outside `DeveloperSignals.ts` finds nothing in `packages/react/src`. |
| 5 | `makeGateRegistry({ onIdCollision })` with a throwing reporter names `onIdCollision`, and the atom set names `onGateIdCollision`, each exactly once | VERIFIED | `buildGateRegistry` (`GateWriter.ts`) takes an already-resolved reporter, so no throw is contained twice. `makeQadiAtoms` resolves under `onGateIdCollision` and calls `buildGateRegistry` directly. `DeveloperSignals.test.ts:453-487` and `GateRegistry.store.test.ts` pin each name, `saidOnly` enforcing a single line. |
| 6 | SC4 / SIGR-04: the characterisation's 35 rows hold their expected values and pass | VERIFIED | `DeveloperSignalReporters.test.tsx` has 35 passing tests (verbose run). The diff from the Plan 01 commit `7d565d81` changes only helper extraction (`threwBoom`), wrapping and comments; no expected value changed. |
| 7 | SC3 / SIGR-03: the module-scope latch is the one rebindable module binding in library source, enforced both ways by `MODULE_STATE_BUDGET`, with its AGENTS.md §6 table; AGENTS.md §13 no longer claims no module-scope state | VERIFIED | `warnedInstrumentedInProduction` (`DeveloperSignals.ts:379`) is the only `let` in `packages/react/src`. `scripts/check-house-style.mjs` has `MODULE_STATE_BUDGET` with `[module-state]`, `[module-state-names]`, `[module-state-table]` and `[module-state-scan]` checks. The AGENTS.md §6 table has one row. §13 now says "One rebindable module-scope name is left in this package, and it is counted". `node scripts/check-house-style.mjs` printed `569 file(s) clean`, exit 0. |
| 8 | SIGR-05 / spec: ADR-QD-184, the ADR-041/052/033 amendments, INV-QD-387/388, INV-QD-064/251 corrections, BEH-QD-691..695, CCR-QD-463 present, consistent with the code, saying plainly what the compiler does and does not enforce | VERIFIED | `spec/decisions/184-...md` exists and is in `index.yaml`. ADR-041 and ADR-052 carry 2026-11-22 amendments. The ADR-033 amendment is in `033-the-packed-artifact-is-the-product.md`. INV-QD-387/388 are in `invariants.md`, and 064/251 are updated by changelog row 1.175. BEH-QD-691/693/694 are in `09-react.md`, 692 in `28-devtools-screens.md`, 695 in `19-hydration.md`. CCR-QD-463 is cited across the spec and `traceability.md`. ADR-184 has "What the compiler refuses" and "What it does not, and what pins each instead". INV-387 Enforcement lists the compiler's refusals and the runtime pins separately. INV-388 states plainly that `const` mutable containers are out of scope. |
| 9 | No new export reached the `@qadi/react` barrel; `check-api-surface` says 941 | VERIFIED | `index.ts` has no diff against the base and matches no Signal/Reporter/Drop export. `node scripts/check-api-surface.mjs`: `941 export(s) documented across 9 package(s)`. |

**Score:** 9/9 truths verified. The state-transition and ordering invariants (once per process, contained once, resolved at the stated time) all have passing named tests, so none is left as present-but-behavior-unverified.

### Required Artifacts

| Artifact | Expected | Status | Details |
| -------- | -------- | ------ | ------- |
| `packages/react/src/DeveloperSignals.ts` | `SIGNALS`, `SignalTable`, `ReporterName` (derived), `reporterFor`, `holdsHere`, `once`, `contain` | VERIFIED | Substantive (556 lines) and wired. |
| `packages/react/src/GateWriter.ts` | `buildGateRegistry` takes a resolved reporter | VERIFIED | Called from `GateRegistry.ts` and `QadiAtoms.ts`. |
| `packages/react/src/GateRegistry.ts` | `makeGateRegistry` resolves under `onIdCollision` | VERIFIED | |
| `packages/react/test/DeveloperSignals.tst.ts` | Type pins for totality, the single latch, derived `ReporterName` and per-row entry points | VERIFIED | Passes under both tstyche passes. |
| `packages/react/test/DeveloperSignalReporters.test.tsx` | 35-row characterisation | VERIFIED | 35 of 35 pass. |
| `scripts/lib/module-state-scan.mjs` + `check-house-style.mjs` | `MODULE_STATE_BUDGET`, checked in both directions | VERIFIED | Gate clean. |
| `.changeset/react-reporter-option-names.md` | Patch changeset for the behaviour change | VERIFIED | Present. |

### Key Link Verification

| From | To | Via | Status | Details |
| ---- | -- | --- | ------ | ------- |
| `QadiProvider.tsx` | `SIGNALS.InstrumentedInProduction` | `holdsHere(...)` at line 274 | WIRED | No local environment check. |
| `HydrationEngine.ts` dehydrate / hydrate | `DehydrationDropped` / `HydrationDropped` rows | `reporterFor(row, entry, options?.onDropped)` | WIRED | Pairing is type-enforced; the tst pin "the hydrate row refuses the dehydrate reporter" covers it. |
| `QadiAtoms.ts` | `SeedSuperseded` / `GateIdCollision` rows, then `buildGateRegistry` | `reporterFor` | WIRED | |
| `makeGateRegistry` | `buildGateRegistry` | `reporterFor(..., "makeGateRegistry", ...)` | WIRED | |

### Data-Flow Trace (Level 4)

Not applicable: no rendered dynamic data. The reporters carry events from the call site to a supplied callback or the console.

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
| -------- | ------- | ------ | ------ |
| Table, reporter and registry behaviour | `npx vitest run --project react DeveloperSignals.test.ts DeveloperSignalReporters.test.tsx GateRegistry.store.test.ts` | 3 files, 104 tests passed | PASS |
| Characterisation row count | verbose run of the characterisation file | 35 passes | PASS |
| Type pins | `pnpm test:tstyche` | 68 files, 366 passed, 2 skipped (by design), 0 failed | PASS |
| House style, including `MODULE_STATE_BUDGET` | `node scripts/check-house-style.mjs` | `569 file(s) clean`, exit 0 | PASS |
| API surface | `node scripts/check-api-surface.mjs` | 941 exports documented | PASS |
| Mutation close vs base | `node 71-mutation.mjs compare` (compares the recorded close; Stryker was not run) | exit 0, no new open or ignored mutants; scores 86/89, 2/2, 95/96, 34/38, 128/128 | PASS |

### Probe Execution

SKIPPED: the phase declares no `probe-*.sh` probes.

### Requirements Coverage

| Requirement | Description | Status | Evidence |
| ----------- | ----------- | ------ | -------- |
| SIGR-01 | RED regression, then GREEN naming the passed option | SATISFIED | Truths 1 and 5. |
| SIGR-02 | One table of where, how often and option name; `ReporterName` derived | SATISFIED | Truths 2 and 3. |
| SIGR-03 | The production-once rule is in the table; module-scope state recorded as the documented exception | SATISFIED | Truth 7: the `OncePerProcess` row plus the `MODULE_STATE_BUDGET` exception and AGENTS.md §6 and §13. |
| SIGR-04 | Observable behaviour unchanged, pinned on the base; `DeveloperSignals.ts` remains the only `no-ambient-console` file | SATISFIED | Truth 6. House-style `no-ambient-console` is clean, and `process.env`/`console` appear nowhere else in `packages/react/src`. |
| SIGR-05 | ADR-QD-184 extends ADR-QD-041 and ADR-QD-052 | SATISFIED | Truth 8. |
| WX-01..07 | Milestone-wide; they stay Pending until the milestone closes | PHASE CONTRIBUTION OK | WX-01: `pnpm check:pr` exit 0 at `02daf4f9`, per the caller, and only `.planning` files changed after it. WX-02: records present (truth 8). WX-03: the barrel is unchanged and gate 13 is green. WX-04: no added `as`/`switch`/`fnUntraced`/Stryker-disable/ambient clock or `Record<string, unknown>` in the `packages/react/src` diff, and house-style is clean. WX-05: the mutation compare is clean (no score fell except by removed killed mutants). WX-06: `71-RED-EVIDENCE.md` shows the regression and characterisation written on the base, and the type pins red on the base. WX-07: no D-number, plan-local id or phase number in shipped source or tests; the `ARCH-118` comment mention follows the existing `ARCH-60` precedent. |

No ORPHANED requirements: every ID that ROADMAP maps to Phase 71 is claimed.

### Anti-Patterns Found

None. No `TBD`/`FIXME`/`XXX`/`TODO`/`HACK` in the touched source files. No stub or placeholder implementations.

### Human Verification Required

None. The phase is library and spec code with no visual, real-time or external-service surface, and every behaviour-dependent truth has a passing named test.

### Gaps Summary

No gaps. The phase goal holds in the code: one total `SIGNALS` table drives every reporter through `reporterFor`; the environment condition, the once-latch and containment are each written once; the `makeGateRegistry` defect is fixed and pinned; and the one remaining module-scope `let` is counted by a gate checked in both directions. Spec, AGENTS.md and the changeset agree with the code.

Not re-run by this verification: Stryker (per the instructions; the recorded close was compared instead), the full `pnpm check:pr` (taken from the caller's record at `02daf4f9`; HEAD differs from it only in `.planning` files), and the full react vitest project (only the three phase-relevant files were run).

---

_Verified: 2026-11-22T19:30:00Z_
_Verifier: Claude (gsd-verifier)_

## Re-verification (2026-11-23, milestone close sweep)

**Staleness:** `71: stale, verification a9b22070, 26 covered, 3 changed since` (`v18-stale.mjs`, run at `8752a052`).

| Cited file | Changed since `a9b22070` by |
| --- | --- |
| `AGENTS.md` | `cd71008b` docs(75): IN-04 AGENTS.md names the paramsOf pin form for a generic Effect function<br>`92ba8b43` fix(75): IN-10 a span key passed to a method call is counted<br>`5cf302fb` fix(75): IN-06 wrap the span-key budget paragraph to the file's ninety columns<br>`d00be34c` fix(75): IN-01 pin every annotator refusal through inference at a writer-shaped call<br>`5a97036e` fix(75): WR-01 refuse a log event at every span-writing function<br>`3ae2ac73` fix(75): IN-02 keep the denial reason off a span by type, name every write form<br>`ee1b7378` fix(75): WR-04 close the span-key rules' scope and extraction gaps<br>`7442fe10` fix(75): WR-02 hold every family question to PoseOf<br>`6980ba12` feat(75-06): a span key of the evaluate family is declared once and read through its declaration |
| `packages/react/src/GateWriter.ts` | `11ae27d9` fix(73): IN-01 IN-02 state the writer's contract once, on GateWriter, with only its true reasons<br>`52c19e8b` fix(73): IN-02 stop exporting sameIdentity<br>`0c81a557` fix(73): WR-01 remove the dead rollback path from reconcile<br>`299297ad` refactor(73-03): reconcile gate registrations keyed by gate id in one step |
| `scripts/check-house-style.mjs` | `4a7ddb00` style(75): IN-06 wrap four over-long lines to their file's width<br>`92ba8b43` fix(75): IN-10 a span key passed to a method call is counted<br>`d00be34c` fix(75): IN-01 pin every annotator refusal through inference at a writer-shaped call<br>`5a97036e` fix(75): WR-01 refuse a log event at every span-writing function<br>`3ae2ac73` fix(75): IN-02 keep the denial reason off a span by type, name every write form<br>`ee1b7378` fix(75): WR-04 close the span-key rules' scope and extraction gaps<br>`7442fe10` fix(75): WR-02 hold every family question to PoseOf<br>`6980ba12` feat(75-06): a span key of the evaluate family is declared once and read through its declaration |

**What each change did to the truths:**

- `AGENTS.md` (Phase 75): adds the `SPAN_KEY_LITERAL_BUDGET` paragraph and table to §6, a `paramsOf` paragraph to the negative-pin text, and one row to the callable-pin table. The `MODULE_STATE_BUDGET` paragraph, its one-row table (`packages/react/src/DeveloperSignals.ts`, count 1) and §13's "One rebindable module-scope name is left in this package, and it is counted" are not in the diff. Truth 7 holds.
- `scripts/check-house-style.mjs` (Phase 75): adds the span-key rules (`[span-key-source]`, `[span-key-literal]`, `[span-key-literal-table]`) and wraps lines. `git diff a9b22070 HEAD` on the file has no line naming `MODULE_STATE` or `module-state`, so `MODULE_STATE_BUDGET` and its four checks are untouched, and the gate still passes with the budget in force (run below).
- `GateWriter.ts` (Phase 73): `reconcile` is now keyed by gate id in one step, `sameIdentity` is no longer exported and `GateIdentity` has no `id`. `buildGateRegistry(report)` is unchanged in signature: it still takes the already-resolved reporter (`((id: string) => void) | undefined`), and its new doc says the collision reporter "is contained by `reporterFor`". So truth 5 (each name reported once, nothing contained twice) and the key link `makeGateRegistry` to `buildGateRegistry` hold. No `let` was added at module scope: the only unindented `let` in `packages/react/src` is `warnedInstrumentedInProduction` (`DeveloperSignals.ts:379`), the other `let`s are inside function bodies.

Truths 1 to 9 hold on HEAD. `DeveloperSignals.ts` itself, the table and `reporterFor` are unchanged since the verification; `QadiProvider.tsx:274` still reads `holdsHere(SIGNALS.InstrumentedInProduction)`; a grep for the retired per-signal resolvers (`hydrationMismatchReporter`, `gateIdCollisionReporter`, `hydrationDropReporter`, `saysHydrationDropped`, `saysDehydrationDropped`) finds nothing in `packages/react/src`; `isDevelopment`/`NODE_ENV` appear only in `DeveloperSignals.ts`.

### Spot-checks re-run (Re-verification (2026-11-23, milestone close sweep))

Run on the tree at `8752a052`, one command at a time, in the foreground, with stdin closed. `pnpm check:pr` exited 0 at `a4741601` (17 of 18 steps, mutation skipped by design, `pnpm test:tstyche` included, so `DeveloperSignals.tst.ts` and `GateWriter.reconcile.tst.ts` ran); `git diff a4741601 HEAD -- . ':!.planning'` is empty.

| Behaviour | Command run now | Result now | Status |
| --------- | --------------- | ---------- | ------ |
| Table, reporter characterisation, registry store, registry, reconcile, writer | `pnpm exec vitest run packages/react/test/{DeveloperSignals.test.ts,DeveloperSignalReporters.test.tsx,GateRegistry.store.test.ts,GateRegistry.test.tsx,GateWriter.reconcile.test.ts,GateWriter.test.tsx} --project react` | 6 files, 167 tests passed | PASS |
| `MODULE_STATE_BUDGET` still counted both ways | `node scripts/check-house-style.mjs` | `585 file(s) clean (3 declared switch(es), 74 type-test file(s))` | PASS |
| The one module-scope `let`, no other environment read | `grep -rnE "^\s*(export )?(let\|var) " packages/react/src`; `grep -rln "isDevelopment\|NODE_ENV" packages/react/src` | `DeveloperSignals.ts:379` is the only unindented binding; `DeveloperSignals.ts` is the only file reading the environment | PASS |
| `QadiProvider` reads the row's condition | `grep -n "holdsHere" packages/react/src/QadiProvider.tsx` | `:274 holdsHere(SIGNALS.InstrumentedInProduction)` | PASS |
| Gate 13 | `node scripts/check-api-surface.mjs` | exit 0, `940 export(s) documented across 9 package(s)` (941 when verified; the change is in `@qadi/core`'s `DecisionHistory` exports from Phase 76, not `@qadi/react`, whose barrel is untouched) | PASS |

**Digest:** `covered_digest: "v4:sha256:3aa0efd3ba09d06fd9e349d6d72d2383504079d0d4ae556b98aaccf248b47b0e"` becomes `covered_digest: "v4:sha256:ad9434bca5125e370f5773bf3ac9c49e0b4a1a93342377369b1b097b82d2d9e2"`, over the same 26 covered files.

**Verdict:** passed
