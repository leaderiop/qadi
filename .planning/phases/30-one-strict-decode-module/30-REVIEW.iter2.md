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
  warning: 3
  info: 4
  total: 7
  necessity: 0
status: issues_found
---

# Phase 30: Code Review Report

**Reviewed:** 2026-11-12
**Depth:** standard
**Files Reviewed:** 38
**Status:** issues_found

## Summary

The decoder is sound on the trust boundary: no depth-guard bypass, no non-total mapping, no precedence regression beyond the documented `PayloadTooDeep` flip.

- **Totality.** Every seam maps `UntrustedRefusal` with `Match.tagsExhaustive` (`Policy.ts`, `SinkCodec.ts`, `AuditArchive.ts`, `AuditEntry.ts`, `HydrationEngine.ts`, `PortWireEncode.ts`, `ExplorerSession.ts`).
- **Precedence.** The order guard → prepare → decode is preserved; the version check is still after the guard in `SinkCodec` and now after it in hydration.
- **`walked()` bypass.** None found. Non-plain roots (arrays, `null`) are never filtered; `unwalked` removes only own top-level keys of the raw input, and `prepare` runs after the guard on that same raw input; every consumer reads the unwalked slot from the same key the second decoder uses. A 1,000,000-deep non-array `entries` value reaches strict decode unwalked and fails `Malformed` with a short message, no throw.
- **`unwalked` keys** are decoded again from their own root: each hydration entry and its policy, each archive entry through `decodeAuditEntry`, the audit row's `record` through `decodeSinkRecord`.

Checks run by the reviewer: `node scripts/check-house-style.mjs` clean (464 files); `oxlint` on the four packages' src shows one unrelated pre-existing warning (`packages/react/src/QadiAtoms.ts:381`); 1282 tests pass across the seam tests, `Policy.test.ts`, `SinkCodec.test.ts` and the devtools model tests; two hostile probes (1,000,000-deep non-array `entries`, 60,000-deep `entries` array) neither threw.

## Warnings

### WR-01: `NotJson` text carries a `SyntaxError:` prefix; docs and the changeset call it the parser's own message

**File:** `packages/core/src/UntrustedDecode.ts:199` (also `:88`, `packages/core/src/Policy.ts` `PolicyNotJson` doc, `.changeset/untrusted-decode-devtools.md:5`)
**Issue:** `decodeText` builds `NotJson({ message: String(error) })`. `String(new SyntaxError(m))` is `"SyntaxError: m"`, so the message is not the parser's own text. `Policy.fromJson` copies it into `PolicyNotJson`; `ExplorerSession.formatDecodeFailure` renders `The text is not JSON: ${message}`, so the paste box shows `The text is not JSON: SyntaxError: Expected property name or '}' in JSON at position 1 ...`. The `UntrustedRefusal` doc says "`message` is the parser's own text" and the devtools changeset says "with the parser's message". Tests pin the wart: `ExplorerSession.test.ts` asserts `include(refusal, "SyntaxError")`, `Policy.test.ts` (~447) asserts the same on `PolicyNotJson.message`, and `UntrustedDecode.test.ts` comments that the prefix is expected. `JSON.parse` only throws `SyntaxError`, so `error.message` is always available.
**Fix:**
```ts
catch: (error) =>
  UntrustedRefusal.NotJson({ message: error instanceof Error ? error.message : String(error) }),
```
Then drop the `"SyntaxError"` assertions in the three tests. (If the prefix is kept deliberately, correct the `NotJson`/`PolicyNotJson` docs and the devtools changeset instead.)

### WR-02: Plan-local decision and plan numbers are baked into shipped doc comments and test titles

**File:** `packages/audit/src/AuditEntry.ts:158` ("(D-07)"), `packages/devtools/src/model/ExplorerSession.ts:123` ("(D-06)"), `packages/react/src/HydrationEngine.ts:224` ("(D-04, D-07)"), `packages/core/bench/UntrustedDecode.bench.ts:3` ("D-15"); ~23 occurrences in test files.
**Issue:** `D-04`, `D-06`, `D-07`, `D-15` are ids from `30-CONTEXT.md`, a planning artifact outside the spec and the repo's id space (`D-15-c` references that point at ADR-QD-096 are fine). The house rule is that a doc comment must not name a plan number or describe a transient state; these do both, and resolve to nothing once the phase directory is archived. Test titles read `(flipped in 30-02 (D-06))`, `(flipped in 30-04 (D-07))`, `(flipped in 30-05 (D-07))`; headers say "Phase 30's refusal-precedence tables ... written green on the phase base (D-13) ... A row marked `flips in 30-0N`"; one comment says "The plan expected UnsupportedPayloadVersion here ... the base refuses an array". Affected tests: `packages/audit/test/UntrustedSeams.test.ts` (6), `packages/core/test/UntrustedSeams.test.ts` (5), `packages/react/test/UntrustedSeams.test.ts` (7), `packages/devtools/test/model/ExplorerSession.test.ts` (4), `packages/devtools/test/model/ExplorerSessionRefusal.test.ts` (1). Test titles also feed the traceability and mutation reports.
**Fix:** Cite the ADR/BEH instead (ADR-QD-143, BEH-QD-486..489) or drop the parenthetical; in tests state the invariant ("a payload nested past the bound is `PayloadTooDeep`: the guard runs before the version check") and remove the "flipped in" / "phase base" language.

### WR-03: The `PortSpanEncode.ts` budget exemption rests on a provenance claim that does not hold; its real reason is unstated

**File:** `scripts/check-house-style.mjs:638`, `AGENTS.md:534`
**Issue:** The exemption says `spanStruct` "reads span attributes this process wrote, not an untrusted seam". Nothing enforces that: `spanStruct`'s `decode` is reached through `decodePortSpan`, exported from the `@qadi/core` barrel, taking any `ReadonlyMap<string, unknown>`. A caller feeding it attributes parsed from another process's OTLP export is on a trust boundary. The exemption is still safe, for a different reason: it reads only its named keys through `.get` (no excess-key surface), and every leaf is a `SpanValue` primitive (INV-QD-044), so there is nothing to recurse into and no depth hazard.
Related (outside this diff): `decode` does a lenient per-field decode, then `Schema.decodeUnknownSync(schema)(lenient)` — a throwing decode in a path meant never to fail the row (BEH-QD-228). Redundant today (leaf schemas are literals/primitives), but it would throw for a leaf with a transformation, which `SpanFields` permits since it constrains only `Type`.
**Fix:** Reword both reasons to the property that holds: "reads only its own named keys, and every leaf is a SpanValue primitive (INV-QD-044), so there is no nesting or excess key for a guard to bound; not an untrusted seam regardless of who supplies the map." Optionally replace the final `decodeUnknownSync` with assembly from the already-decoded fields, dropping the budget count to 1.

## Info

### IN-01: `unwalked` is documented as "must be `Schema.Unknown`", but two of three seams use `Schema.Array(Schema.Unknown)`; the check is compile-time over the decoded type

**File:** `packages/core/src/UntrustedDecode.ts:111-125`, `:132`
**Issue:** Hydration's `Envelope.entries` and the audit `ArchiveEnvelope.entries` are `Schema.Array(Schema.Unknown)`; only the audit row's `record` is `Schema.Unknown`. INV-QD-306 correctly says "typed `unknown` (or `ReadonlyArray<unknown>`)"; the code doc is the inaccurate one. `UnwalkedKey<A>` keys on `S["Type"]` while the guard filters raw wire keys, so a schema that renames keys on decode would put the compile-time check and the runtime filter in different key spaces; it also admits an `any`-typed slot. None of the three present uses is affected.
**Fix:** Correct the doc to "`unknown` or `ReadonlyArray<unknown>`"; consider deriving the key from `S["Encoded"]`.

### IN-02: `decodeStoredRecordString` is still a hand-assembled `JSON.parse` seam, invisible to `[untrusted-decode]`

**File:** `packages/core/src/SinkCodec.ts:613-616`
**Issue:** It parses with its own `Result.try(JSON.parse)` and delegates to `decodeStoredRecord`, which hands `record` to the guarded `decodeSinkRecord`. Safe by delegation (the envelope's other key is a string), but INV-QD-305's "guarded by construction" holds here only by delegation, and `UNTRUSTED_DECODE_TOKEN` does not count `JSON.parse`, so a copy of this pattern elsewhere would pass the gate.
**Fix:** Either count `JSON.parse` in the token with budget rows for this file and `SimulationForm.ts`, or add a one-line comment on `decodeStoredRecordString` stating why it is not a `decodeText` call (the envelope must not be walked: an unknown envelope key is ignored, ADR-QD-096 D-15-c).

### IN-03: Closure-returning `Match` arms in `HydrationEngine.ts` are harder to read than what they replace

**File:** `packages/react/src/HydrationEngine.ts:~242-257` (`tooDeepEntry`, `asMalformed`, `entryDropReason`), used at `~536`, `~548`
**Issue:** `Match.type<UntrustedValueRefusal>()` returns a function taking the malformed reason, called as `entryDropReason(failure)("MalformedEntry")` — two named helpers and a curried call to say "`TooDeep` is `EntryTooDeep`, `Malformed` is the caller's reason".
**Fix:** A plain two-argument function, or keep `Match` and close over the reason at the two call sites.

### IN-04: Three copies of the plain-object predicate; a long history comment on the guard

**File:** `packages/core/src/UntrustedDecode.ts:157`, `packages/core/src/DecodeDepthGuard.ts:24`, `packages/core/src/SinkCodec.ts` (`isJsonObject`, ~418)
**Issue:** The same predicate is written three times in the leaf family with slightly different return types; `DecodeDepthGuard.ts` carries a 9-line NS-01 history comment and now has a second `/** */` block right after its header.
**Fix:** Export one `isPlainObject` package-privately from `DecodeDepthGuard.ts` and import it in `UntrustedDecode.ts`; trim the NS-01 comment to one line.

---

_Reviewed: 2026-11-12_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
