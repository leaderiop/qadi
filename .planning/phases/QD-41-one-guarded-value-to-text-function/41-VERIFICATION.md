---
phase: QD-41-one-guarded-value-to-text-function
verified: 2026-11-14T17:30:00Z
status: passed
score: 4/4 must-haves verified
covered_files:
  - ".planning/phases/QD-41-one-guarded-value-to-text-function/41-01-PLAN.md"
  - ".planning/phases/QD-41-one-guarded-value-to-text-function/41-01-SUMMARY.md"
  - ".planning/phases/QD-41-one-guarded-value-to-text-function/41-02-PLAN.md"
  - ".planning/phases/QD-41-one-guarded-value-to-text-function/41-02-SUMMARY.md"
  - ".planning/phases/QD-41-one-guarded-value-to-text-function/41-03-PLAN.md"
  - ".planning/phases/QD-41-one-guarded-value-to-text-function/41-03-SUMMARY.md"
  - ".planning/phases/QD-41-one-guarded-value-to-text-function/41-04-PLAN.md"
  - ".planning/phases/QD-41-one-guarded-value-to-text-function/41-04-SUMMARY.md"
  - ".planning/phases/QD-41-one-guarded-value-to-text-function/41-05-PLAN.md"
  - ".planning/phases/QD-41-one-guarded-value-to-text-function/41-05-SUMMARY.md"
  - ".planning/phases/QD-41-one-guarded-value-to-text-function/41-06-PLAN.md"
  - ".planning/phases/QD-41-one-guarded-value-to-text-function/41-06-SUMMARY.md"
  - "packages/core/src/Explanation.ts"
  - "packages/core/src/ValueText.ts"
  - "packages/core/src/index.ts"
  - "packages/core/test/NonJsonLiteral.test.ts"
  - "packages/core/test/ValueText.test.ts"
  - "packages/devtools/src/model/Filters.ts"
  - "packages/devtools/src/model/Remedies.ts"
  - "packages/devtools/src/model/SimulationForm.ts"
  - "packages/devtools/test/model/NonJsonWitness.test.ts"
  - "packages/devtools/test/model/ValueTextConsumers.test.ts"
covered_digest: "v4:sha256:7a297fa0457791c8af298a5bab60701578a51afe35f721700c8dd99fb318c658"
behavior_unverified: 0
overrides_applied: 0
---

# Phase 41: One guarded value-to-text function Verification Report

**Phase Goal:** No devtools panel or session command throws on a bigint or circular value: one guarded value-to-text function, a public `@qadi/core` export (D-13), is the single way core's `explain` and devtools' Remedies, Filters and SimulationForm turn an unknown value into text.
**Verified:** 2026-11-14
**Status:** passed
**Re-verification:** No, initial verification

## Goal Achievement

### Observable Truths (ROADMAP success criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | On the base, bigint/circular through `contains`, `inArray`, `eq(literal)` makes `remedyEdits` and a session command throw (RED); after the phase none throws | VERIFIED | RED commits `ef78a2a9` (core, 14 `it.fails`) and `06787363` (devtools, 21 `it.fails`: 14 `remedyEdits`, 5 through `makeSimulationSession`, 2 policy readings) are test-only commits; 41-02-SUMMARY records the base frames (`TypeError: Do not know how to serialize a BigInt`, `Converting circular structure`). Session-level tests use `choosePolicy`/`edit` (the roadmap's `setPolicy`/`chooseSight` do not exist). No `fails` remains in either file at HEAD, and I ran both files plus the other six touched test files at HEAD: 8 files, 295 tests, all pass. |
| 2 | One total primitive, a public `@qadi/core` export, returns `string \| undefined`, never the cause of a throw (including a throwing `toJSON` or getter); rules asserted in one test table | VERIFIED | `packages/core/src/ValueText.ts` `valueText` is a `try { JSON.stringify } catch { }` returning `string \| undefined`; `index.ts` has `export * from "./ValueText.ts"`; `spec/overview.md` rev 1.104/1.105 names `valueText` and `valueLabel`. One table in `packages/core/test/ValueText.test.ts` (rows for bigint, cycle, nested bigint, symbol, function, undefined, NaN, -0, null-prototype, throwing `toJSON`, throwing getter, plus a revoked proxy). The 41-REVIEW-DISPOSITION mutation score for `ValueText.ts` is 1 (13/13). |
| 3 | Remedies, Filters and SimulationForm read through it, no other `JSON.stringify` of an unknown value in those modules, existing outputs pinned unchanged | VERIFIED | Scoped grep at HEAD: `Remedies.ts`, `Filters.ts` have no `JSON.stringify`; `SimulationForm.ts:170` is `JSON.stringify(name)` on a `string` (`encodeName`, out of scope per CONTEXT). `Explanation.ts:474` `verbatim` stringifies a `string` only, so it cannot throw. `Remedies.render` = `typeof v === "string" ? v : valueLabel(v)`; `Filters.render` uses `valueText`; `SimulationForm.jsonText` uses `valueText` and keeps its round-trip refusal. Outputs written out green on the base in `8217de3f`, extended in `ValueTextConsumers.test.ts`; all pass at HEAD. |
| 4 | The way a remedy over a non-JSON value is shown is decided and pinned, BEH-QD-223 intact | VERIFIED | Decision: remedy still offered, label degraded (`10n` for a bigint, fixed words `a value with no JSON form` for other objects). BEH-QD-541 (`29-devtools-simulator.md`, rev 1.20/1.21) states it with the requirement that the words carry none of the value; BEH-QD-542 (`18-explanation.md`) states `explain`'s rule. BEH-QD-223 text is unchanged and `Remedies.test.ts` still carries it. |

**Score:** 4/4 truths verified.

### Required Artifacts

| Artifact | Status | Details |
|----------|--------|---------|
| `packages/core/src/ValueText.ts` | VERIFIED | 38 lines, `valueText` and `valueLabel`, exported from the barrel |
| `packages/core/src/Explanation.ts` | VERIFIED | `LiteralRef`, `In`, `Contains` read through `valueLabel`/`valueText`; `listText` walks inside one bare `try` |
| `packages/devtools/src/model/{Remedies,Filters,SimulationForm}.ts` | VERIFIED | each imports from `@qadi/core` and uses it; the local `stringify` in SimulationForm is deleted |
| `spec/decisions/154-...md`, `index.yaml`, `spec/overview.md`, BEH-QD-541/542, traceability, CCR-QD-432 row | VERIFIED | all present and cross-referenced; only reserved numbers (ADR-QD-154, BEH-QD-541 and 542, CCR-QD-432) |
| `.changeset/core-value-text.md` (`@qadi/core` minor), `.changeset/devtools-remedy-label-without-json.md` (`@qadi/devtools` patch) | VERIFIED | present, match D-11/D-13 |

### Key Link Verification

| From | To | Via | Status |
|------|----|-----|--------|
| `explain` (`Explanation.ts`) | `valueText`/`valueLabel` | direct import | WIRED |
| `Remedies.render` | `valueLabel` | import from `@qadi/core` | WIRED |
| `Filters.render`, `SimulationForm.jsonText` | `valueText` | import from `@qadi/core` | WIRED |
| `policyLabel`/`inspect` in devtools (rail, inspector) | `explain` | tests `policyLabel` and `inspectEntry` over bigint/cycle pass | WIRED |
| The `In` label | one rule | `valueLabel` is the single owner of the label rule (WR-01 fix `781f08e4`) | WIRED |

### Data-Flow Trace (Level 4)

Not applicable: pure text functions with no stateful source. Values flow from the caller's policy literal to the label, and tests assert the rendered string.

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Phase test files at HEAD | `npx vitest run` over the 8 touched test files from the repo root | 8 files, 295 tests passed | PASS |
| Post-review gate | `/private/tmp/claude-502/.../scratchpad/checkpr41-post.log` (orchestrator's `pnpm check:pr` on HEAD) | 16 of 17 steps run, `mutation` skipped by design, last step `spec:publish` agrees on version; no FAIL/ELIFECYCLE lines. I did not re-run the whole gate, and I did not see the shell exit code, only the log. | PASS (log evidence) |

### Probe Execution

None declared. Step 7c: SKIPPED.

### Requirements Coverage

| Requirement | Source Plan(s) | Status | Evidence |
|-------------|----------------|--------|----------|
| TEXT-01 | 41-02, 41-04 | SATISFIED | RED tests on base, green at HEAD (Truth 1) |
| TEXT-02 | 41-01, 41-03 | SATISFIED | Truth 2 |
| TEXT-03 | 41-02, 41-03, 41-04 | SATISFIED, one edge noted below (WR-02) | Truth 3 |
| TEXT-04 | 41-04, 41-05 | SATISFIED | Truth 4 |
| WX-01 | 41-06 | SATISFIED | post-review `check:pr` log clean |
| WX-02 | 41-01, 41-05, 41-06 | SATISFIED | ADR-QD-154, CCR-QD-432, BEH-QD-541/542 recorded; no `next-id.mjs` evidence in the diff; reserved numbers only |
| WX-03 | 41-03, 41-05, 41-06 | SATISFIED | `spec/overview.md` rev 1.104 and 1.105 add `valueText`, `valueLabel` |
| WX-04 | 41-03, 41-04, 41-06 | SATISFIED | Added `src` lines contain no `as`, `any`, `switch`, `fnUntraced`, `async`/`await`, `console`, `process.env` or clock; no budget edited |
| WX-05 | 41-01, 41-06 | SATISFIED | Mutation, base vs after review fixes: Explanation 0.98673 to 0.98701, ValueText new to 1, Remedies 1 to 1, Filters 1 to 1, SimulationForm 0.98195 to 0.98367. None fell. These come from 41-REVIEW-DISPOSITION and the committed JSON, not re-run by me. |
| WX-06 | 41-02 | SATISFIED | RED and characterisation commits precede the fix commits (`06787363`, `ef78a2a9`, `8217de3f` before `192b70c1`, `f68e4565`, `b9f2ef63`, `39bbd155`) |
| WX-07 | 41-05 | SATISFIED | Changesets present. `valueText`/`valueLabel` are additions, not a break. One user-visible label change (WR-02) is recorded in both changesets. Nothing released. |

All 11 IDs appear in plan frontmatter (union of the six plans' `requirements`) and in REQUIREMENTS.md. No orphans.

### Anti-Patterns Found

None blocking. No TBD/FIXME/XXX/TODO in the phase's added source lines. Code review is clean (41-REVIEW.md, iteration 2). 41-SECURITY.md has `threats_open: 0`. 41-VALIDATION.md is `validated`.

### Deviation to judge: WR-02 (departs from D-07)

An object whose `toJSON` returns nothing used to label as the word `undefined` (`String(JSON.stringify(v))`). It now labels as `a value with no JSON form`. D-07 said "only a value that threw before gets the new label", so this is a real departure from the locked decision's wording. Judged against the requirements:

- TEXT-03's pinned outputs are "bare strings, the word `undefined` in a remedy label, Filters' `[]`, the form's round-trip refusal". The word `undefined` is still produced for `undefined`, a function and a symbol, the cases the phase pinned. The `toJSON`-gives-nothing object is not among the pinned outputs, and no test written on the base pins it.
- The new label is the more accurate one: an object is not "undefined". It was decided at plan time and is written in ADR-QD-154, BEH-QD-541 (lines 361-362) and both changesets, so it is disclosed rather than silent.
- It is a deliberate departure from the user's D-07 wording, so the user should be told. I do not count it as a goal failure. It is a WARNING-level note, not a BLOCKER.

Also noted, not gaps: IN-01 (two distinct non-JSON witnesses share one label, so one remedy is offered; documented in BEH-QD-541) and IN-03 (`valueText` is a generic name in core's flat barrel; deliberate under D-13).

### Human Verification Required

None.

### Gaps Summary

No gaps. All four ROADMAP success criteria and all 11 requirement IDs hold in the codebase at HEAD (`91c9de9f`). The one caveat is the WR-02 departure from D-07 above.

---

_Verified: 2026-11-14_
_Verifier: Claude (gsd-verifier)_
