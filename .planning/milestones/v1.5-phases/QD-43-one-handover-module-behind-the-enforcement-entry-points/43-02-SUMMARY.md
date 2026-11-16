---
phase: QD-43-one-handover-module-behind-the-enforcement-entry-points
plan: 02
subsystem: testing
tags: [characterisation, handover, enforcement, spans, smuggled-resource]
phase_base: 712317c10688ebce97b8b29b5a5c515b84a8d71b
plan_head_before: ca9bbcf1b01d4dfd2c134f9b7bfa1dfdef00ce64
plan_head_after: 718c1f226ff033154eaf917238ec9f8bc6f3398b
requires: ["43-01"]
provides:
  - "packages/core/test/Handover.test.ts: the ten-entry-point characterisation table, the span pin and the smuggled-resource defence, written on the untouched base"
affects: [43-03, 43-04, 43-08]
actuals:
  tokens: 5500
  tasks: 2
  commits: 2
tech-stack:
  added: []
  patterns: ["a row table per effect entry point (allow, denial, binding-with-no-handler columns) over core's testLayer and a recording DecisionSink"]
key-files:
  created:
    - packages/core/test/Handover.test.ts
  modified: []
key-decisions:
  - "Core's testLayer plus a hand-made recording sink, not the testing package's qadiTestLayer (a dependency cycle): orchestrator resolution 2 to D-09"
  - "The Item fixture is a type alias, not an interface: only an alias is assignable to Resource's index signature"
requirements-completed: [HAND-03, HAND-04, WX-06]
status: complete
---

# Phase 43 Plan 02: Handover characterisation table Summary

A 39-case `Handover.test.ts` pins on the untouched base what the handover module must keep for all ten enforcing entry points: the resource decided on is the value handed over, discharge runs before the work, a denial hands nothing over, a binding obligation with no handler is refused with a `Refused` record, and the span names one enforcing call opens. Every case is green on the base except one named defect case (`enforceProjected` evaluating a smuggled resource), which 43-03 closes.

## Commits

- `ef3ed80e` test(43-02): the effect shapes' handover and spans pinned on the base
- `718c1f22` test(43-02): the collection shapes' handover pinned, enforceProjected's smuggled resource RED

No `packages/*/src`, spec or script file changed since `phase_base` (`git diff --stat` empty).

## Cases per describe

| Describe | Cases |
|---|---|
| the resource decided on is the value handed over: effect shapes | 18 (6 entry points x allow, denial, binding with no handler) |
| the spans one enforcing call opens | 5 |
| the resource decided on is the value handed over: collection shapes | 8 |
| a resource smuggled in at runtime is never the one decided on | 8 (guard, enforceLoaded, enforceProjectedLoaded, four collections, and the one RED case) |

Effect shapes: each allow row asserts the recorded `resource` (the handed value, or `Object.hasOwn(decision, "resource") === false` for `enforceProjected`), the released value (`strictEqual` for a whole release, `deepStrictEqual` plus `notStrictEqual` to the source for a projected one), the event order (`O,W` for `enforce`/`enforceProjected`/`guard`, `W,O` for the loaded pair, `O` for `assert`) and an `Obligations` row with outcome `Discharged`. Each denial row asserts `AccessDenied` with the policy's `policyTag`, no handler, and `W` only for the loaded pair. Each binding row asserts `UndischargedObligation` and an `Obligations` row with outcome `Refused`.

Collections: partition, array = stream, same references for a whole release, per-item narrowing, allow-record resources equal the admitted items (as a set), one handler call per admitted item with that item as `question.resource`, input order under `concurrency: "unbounded"` (the first admitted item is the slowest to discharge, run under `it.live`), twins returned as their own references, empty array and empty `Stream.empty`, a single item, and `UndischargedObligation` for all four.

## Record field names confirmed

`DecisionRecord`: `_tag: "Decision"`, `outcome: Decided | Failed` (`outcome.decision._tag` is `Allow | Deny`), `resource` present only when the question had one. `ObligationRecord`: `_tag: "Obligations"`, `outcome` one of `Discharged | HandlerFailed | NotRequired | Refused` (`SinkRecordFields.ts`).

## Verification output

Green run (`pnpm exec vitest run --project core packages/core/test/Handover.test.ts -t "^(?!.*enforceProjected ignores a smuggled resource)"`), exit 0:

```
 Test Files  1 passed (1)
      Tests  38 passed | 1 skipped (39)
```

## RED on the base

Inclusion run (`-t "enforceProjected ignores a smuggled resource"`), exit 1, the only failure in the file:

```
 Test Files  1 failed (1)
      Tests  1 failed | 38 skipped (39)
```

The failing assertion: `expected 'AccessDenied' to equal 'MissingResource'`. On the base `enforceProjected` passes the runtime `resource` straight to the decision, so `ownedByMe` is evaluated against `{ ownerId: "someone-else" }` and denies, instead of deciding with no resource. The expected `MissingResource` was confirmed on the base with a throwaway scratch test (`enforceProjected(ownedByMe)` with no smuggled value fails `MissingResource` with `attribute: "ownerId"`), then the scratch file was deleted.

Full file, no filter: `Tests  1 failed | 38 passed (39)` on the base. `pnpm exec tsc -p tsconfig.test.json` exit 0, `pnpm lint` exit 0 (existing warnings elsewhere only).

## Deviations from Plan

### Auto-fixed Issues

None.

### Notes

- **Plan verify regex is crude.** Task 2's third verify strips comments and tests `/\bas\s+(?!const\b)[A-Za-z_{(\[]/`, which also matches every `import * as Effect` namespace import (mandatory house style) and three test titles containing the word "as". Running the token check over non-import code with title text excluded found no `as`, `any` or `!` token in code; the regex's own pass condition cannot hold for any file that follows the import rule. `pnpm lint` (oxlint plus the house-style gate) exits 0 and is the real check.
- **Header comment wording.** The plan's first verify rejects the literal `@qadi/testing` anywhere in the file text; the header comment refers to "the testing package" instead, so the cycle is explained without the token.
- **Ordering edge.** The plan says both `test(43-02)` commits sit "directly after `test(43-01)`"; `docs(43-01)` (the 43-01 summary commit, `ca9bbcf1`) sits between, which is the planned docs commit and not a source commit. Both precede the first `packages/*/src` commit.
- **`it.live` for the ordering case.** The concurrency-order case uses real sleeps (0 and 30 ms) so a result built in completion order would visibly reverse; it can only pass spuriously, never fail spuriously, if scheduling jitter swallowed the 30 ms.

## Known Stubs

None.

## Threat Flags

None.

## Self-Check: PASSED

- `packages/core/test/Handover.test.ts` exists; `ef3ed80e` and `718c1f22` are ancestors of HEAD, each carrying that one file and the `Co-Authored-By` trailer; no `packages/*/src`, `packages/promise/src`, spec or script diff since `phase_base`.
