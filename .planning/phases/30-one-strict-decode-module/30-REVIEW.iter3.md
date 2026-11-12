---
phase: 30-one-strict-decode-module
reviewed: 2026-11-12T00:00:00Z
depth: standard
files_reviewed: 38
files_reviewed_list:
  - features/features/hydration-counts/hydration-counts.feature
  - features/features/hydration-counts/hydration-counts.steps.test.ts
  - packages/audit/src/AuditArchive.ts
  - packages/audit/src/AuditEntry.ts
  - packages/audit/test/UntrustedSeams.test.ts
  - packages/core/bench/UntrustedDecode.bench.ts
  - packages/core/src/DecodeDepthGuard.ts
  - packages/core/src/Errors.ts
  - packages/core/src/HydrationMetrics.ts
  - packages/core/src/Policy.ts
  - packages/core/src/PortRemote.ts
  - packages/core/src/PortWireEncode.ts
  - packages/core/src/SinkCodec.ts
  - packages/core/src/UntrustedDecode.ts
  - packages/core/src/index.ts
  - packages/core/test/DecisionWire.test.ts
  - packages/core/test/Errors.tst.ts
  - packages/core/test/HydrationMetrics.test.ts
  - packages/core/test/Policy.test.ts
  - packages/core/test/SinkCodec.test.ts
  - packages/core/test/UntrustedDecode.test.ts
  - packages/core/test/UntrustedDecode.tst.ts
  - packages/core/test/UntrustedSeams.test.ts
  - packages/core/test/v4-api-smoke.test.ts
  - packages/devtools/src/model/ExplorerSession.ts
  - packages/devtools/src/model/SimulationForm.ts
  - packages/devtools/test/model/ExplorerSession.test.ts
  - packages/devtools/test/model/ExplorerSessionRefusal.test.ts
  - packages/devtools/test/model/Hydration.test.ts
  - packages/react/src/DeveloperSignals.ts
  - packages/react/src/HydrationEngine.ts
  - packages/react/src/HydrationEvent.ts
  - packages/react/test/Hydration.test.ts
  - packages/react/test/UntrustedSeams.test.ts
  - scripts/check-house-style.mjs
  - .changeset/untrusted-decode-core.md
  - .changeset/untrusted-decode-react.md
  - .changeset/untrusted-decode-audit.md
  - .changeset/untrusted-decode-devtools.md
findings:
  critical: 0
  warning: 0
  info: 2
  total: 2
  necessity: 1
status: issues_found
---

# Phase 30: Code Review Report

**Reviewed:** 2026-11-12
**Depth:** standard
**Files Reviewed:** 38
**Status:** issues_found

## Summary

Iteration 2 of the auto fix loop. All 7 findings from the previous review are resolved in the source, not just claimed. The six fix commits (`b1299653`..`22d2f24d`) introduce no defect; two minor Info items remain.

Verification of the previous findings:

- **WR-01 resolved.** `UntrustedDecode.ts:196-198` builds `NotJson` from `error.message`. The three pins (`Policy.test.ts:448`, `ExplorerSession.test.ts:355`, `UntrustedDecode.test.ts:212`) now assert the prefix is absent. The `PolicyNotJson` doc (`Policy.ts:950`) is corrected and the devtools changeset is accurate as written.
- **WR-02 resolved.** A grep of every line added by the phase diff for `D-NN`, `30-0N`, "phase base", "flipped in", "flips in", "the plan expected", "NS-01" and "Phase 30" finds nothing, apart from the intended `ADR-QD-096 D-15-c` references, which point at the ADR.
- **WR-03 resolved.** The `PortSpanEncode.ts` reason is reworded in `scripts/check-house-style.mjs`, `AGENTS.md` and ADR-QD-143 to the property that holds (own named keys only, `SpanValue` primitive leaves). The optional half, removing the final `decodeUnknownSync`, was declined with a stated reason (it would need an `as`). That is acceptable.
- **IN-01 resolved.** `UnwalkedKey` now keys on `S["Encoded"]` (`UntrustedDecode.ts:170`), the doc says "`unknown` or `ReadonlyArray<unknown>`", and a new tstyche pin covers the encoded-side case.
- **IN-02 resolved.** `JSON.parse` is in `UNTRUSTED_DECODE_TOKEN` with budget rows for `UntrustedDecode.ts` (5), `SinkCodec.ts` (1) and `SimulationForm.ts` (1), and a names guard. The grep for `JSON.parse` in `packages/*/src` finds exactly those three call sites; every other hit is a comment. `AGENTS.md`, ADR-QD-143 ("Six files carry a count") and INV-QD-305 agree with the budget.
- **IN-03 resolved.** `entryDropReason(refusal, malformed)` in `HydrationEngine.ts:245` is a plain two-argument function over `Match.value` and `Match.tagsExhaustive`; both call sites pass the reason. No cast.
- **IN-04 resolved.** `isPlainObject` is exported once from `DecodeDepthGuard.ts`. `UntrustedDecode.ts` and `SinkCodec.ts` import it, and it is not in the barrel (`index.ts` exports only `UntrustedDecode.ts`). The NS-01 history comment is gone.

Trust-boundary behaviour is unchanged by the fixes. The order guard, prepare, strict decode still holds. `walked()` still filters only own top-level keys of a plain-object root. The `SinkCodec` `isJsonObject` to `isPlainObject` swap has the same runtime predicate. Its narrowing to `Record<string, unknown>` still satisfies `ownValue(input: object, ...)`. Nothing in the fixes touches `as`, `!`, `any`, `switch`, or non-namespace `effect` imports.

Checks run by the reviewer: `node scripts/check-house-style.mjs` clean (464 files); vitest over `UntrustedDecode`, `UntrustedSeams` (core, react, audit) and `SinkCodec` passed, 248 tests.

## Info

### IN-01: `decodeText`'s `String(error)` fallback is unreachable

**File:** `packages/core/src/UntrustedDecode.ts:196-198`
**Category:** necessity
**Issue:** `error instanceof Error ? error.message : String(error)` guards a state that cannot occur. `Result.try` wraps only `JSON.parse(text)`, which throws a `SyntaxError` (an `Error`) by specification, and `SimulationForm.ts:67` states the same premise ("only a `SyntaxError` is thrown"). The fallback is never exercised, and `JSON.parse` has no other throw path for a string argument. It also reintroduces the `SyntaxError: ` prefix if a cross-realm error ever missed the `instanceof` check, which the WR-01 fix removed. This is not a trust-boundary guard: the guarded value is the exception the parser throws, not the input, so the impossible-state rule applies. Info only, because it is harmless and rests on the platform contract rather than a repository proof.
**Fix:** Read the message without a fallback branch, for example `catch: (error) => UntrustedRefusal.NotJson({ message: Predicate.isError(error) ? error.message : "not JSON" })`, or keep it as written and add a one-line comment stating why the branch exists (a cross-realm parser).

### IN-02: Byte-identical `isPlainObject` still lives in `FieldPath.ts`

**File:** `packages/core/src/FieldPath.ts:166` (versus `packages/core/src/DecodeDepthGuard.ts:17`)
**Issue:** The IN-04 fix says `FieldPath.ts` keeps its own predicate because it is "unrelated". `FieldPath.ts`'s `isPlainObject` has the same name, signature and body as the one now exported from `DecodeDepthGuard.ts`. Only `JsonHazard.ts`'s same-named predicate really differs (a prototype check). Separately, `DecodeDepthGuard.ts`'s header describes it as a depth check "reached only from the decoder", and the `UNTRUSTED_DECODE_BUDGET` comment says the same, while the module now also hosts a general predicate imported by `SinkCodec.ts`. Both are minor cohesion drift, not defects.
**Fix:** Either import the shared predicate in `FieldPath.ts` too, or move it to a small neutral leaf (for example `JsonShape.ts`) imported by all three. If neither is wanted, drop the claim that the remaining copies are unrelated.

---

_Reviewed: 2026-11-12_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
