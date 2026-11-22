---
phase: QD-63-the-packed-install-gate-probes-every-new-public-name
reviewed: 2026-11-20T00:00:00Z
depth: standard
files_reviewed: 6
files_reviewed_list:
  - scripts/check-package-install.mjs
  - AGENTS.md
  - spec/README.md
  - spec/decisions/033-the-packed-artifact-is-the-product.md
  - spec/process/definitions-of-done.md
  - spec/traceability.md
findings:
  critical: 0
  warning: 2
  info: 4
  total: 6
status: issues_found
---

# Phase QD-63: Code Review Report

**Reviewed:** 2026-11-20
**Depth:** standard
**Files Reviewed:** 6
**Status:** issues_found

## Summary

The guard is sound on the cases named as already proven. Its load, read and parse failures all route through `fail()`. The probes are bounded: the diagnostics loop is capped at 200 turns, and the gates feed iterates a `Set` its listener never mutates. No crash path or unbounded loop was found. The spec prose is factually consistent with the script, with the revision numbers cross-checked (ADR 1.2, DoD 1.19, RTM 1.225, README 1.262, CCR-QD-454 row).

The remaining weaknesses are false greens. The guard is lexical, so it can be satisfied without a probe running. It also covers fewer public names than the script's header claims, and one probe added by this same change is unguarded.

## Warnings

### WR-01: The `DiagnosticsOptions` refusal is not held by the guard, though the header says every public name is held

**File:** `scripts/check-package-install.mjs:59-71` (header), `:101-102` (`REFUSED_SHAPE_PROBES`), fixture `noSchedule` at `:615-619`
**Issue:** The header says "a public name the consumer never compiles cannot ship unnoticed". The CCR-QD-454 row says the consumer "refuses a `schedule` in `DiagnosticsOptions` (TS2353)". Only the `DecisionCacheShape` refusal is on `REFUSED_SHAPE_PROBES`. Delete the `noSchedule: DiagnosticsOptions = {...}` literal together with its directive, and the compiler stays green. The sandbox tsconfig has no `noUnusedLocals`, so the then-unused `type DiagnosticsOptions` import is no error. The guard stays green too. That is the exact failure the guard exists to prevent, for a probe this change adds.
`GateInstanceLike` and `GateRegistryLike` are likewise not on `TYPE_ONLY_PROBES`. Deleting the whole gates probe would still fail on the `makeGatesFeed` call check. Removing only the typed literals would not.
**Fix:** Either add `["DiagnosticsOptions", "schedule"]` to `REFUSED_SHAPE_PROBES` and the two `*Like` names to `TYPE_ONLY_PROBES`, or narrow the header and the CCR/ADR wording to "every `make*Feed` call and the `DecisionCacheShape` probes".

### WR-02: The feed check is "a call whose callee is that identifier", not "a feed that runs"

**File:** `scripts/check-package-install.mjs:857`
**Issue:** `if (isCallExpression(node) && isIdentifier(node.expression)) called.add(...)` accepts any call anywhere in `consumer.ts`. A satisfying call can sit in an arrow function that is never invoked, in an `Effect` that is built and never run, or after a local shadow `const makeXFeed = ...`. Example: `const _unused = () => makeNewFeed();` passes the guard, and the compiler type-checks the call. The task asked for false greens specifically. The guard proves the name is spelled in a call position, not that a probe executes or asserts anything.
**Fix:** Accept the limit and say so in the header, as a `shortcut:` note. Or tighten it: require the call to be the operand of a `yield*` inside the `Effect.gen` passed to `Effect.runPromise`, or require the file's `expect(...)` calls to reference a variable derived from the call. The first is cheap. Reject calls whose enclosing function is not an `Effect.gen` generator (`isYieldExpression(node.parent)`).

## Info

### IN-01: The directive is matched by comment text, so the ADR's "a directive on another property does not stand in" is overstated

**File:** `scripts/check-package-install.mjs:831-842` (`holdsDirective`), `spec/decisions/033-the-packed-artifact-is-the-product.md` amendment
**Issue:** `comment.startsWith("// @ts-expect-error") && comment.includes(member)` asks only that some leading comment anywhere in the declaration names `getOrCompute`. A directive above `size:` whose text mentions `getOrCompute` satisfies it. In practice the compiler's unused-directive error covers most of this. The guard still does not enforce "the directive sits on the property". `//@ts-expect-error` and `/* @ts-expect-error */` are valid TypeScript but fail this match, which gives a false red.
**Fix:** Either soften the ADR sentence to "a directive in its own text that names the member", or attach the check to the `PropertyAssignment` whose `name.text === member`.

### IN-02: The type-use check accepts any type reference outside a refused literal

**File:** `scripts/check-package-install.mjs:858-860`
**Issue:** `declare const x: DecisionCacheShape;` or `type T = DecisionCacheShape` satisfies `typed` without any host-cache probe. This is low risk because the refused-literal check removes the pre-0.13 literal's own reference. It is another lexical-only acceptance.
**Fix:** Optional. Document it, or require the reference to annotate a declaration whose initializer contains a `getOrCompute` property.

### IN-03: A caret range on `typescript` carries the guard on an `unstable` API

**File:** `scripts/check-package-install.mjs:870-873`, `pnpm-workspace.yaml:32` (`typescript: ^7.0.0`)
**Issue:** The guard imports `typescript/unstable/sync`, `/ast/is` and `/ast/scanner`. The `unstable` entry points may change in a 7.x minor. The failure would be loud and correct, since the catch calls `fail()`, but it would break the merge gate on a routine dependency bump, with the message "could not load or run the TypeScript parser".
**Fix:** Name the coupling in the catch message (for example, "unstable API, pinned by ^7"). Alternatively pin the catalog to the minor that was verified (7.0.2).

### IN-04: The probe code has no timeout and a run-dependent assertion label

**File:** `scripts/check-package-install.mjs:823-826`, `:893`, fixture diagnostics probe
**Issue:** The `execFileSync("node", ...)` read and the `tsgo` child behind `new API(...)` have no `timeout`. A hung child hangs `pnpm check`. This matches the pre-existing calls in the file, so it is consistent. The diagnostics assertion label embeds the turn count (`"... reached Live in " + turns + " turns"`), so the label varies between runs. A label should be constant. The bound `200` is a magic number repeated in the loop condition and in the prose. A failure also looks like "Live never reached in 200 turns" with no reason, because the loop cannot see a `Stopped` status.
**Fix:** Keep the label constant and put the count in a separate `expect` or log. Hoist `200` to a const. Break the loop on `Stopped` and include `status.reason` in the message.

---

_Reviewed: 2026-11-20_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
