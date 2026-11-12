---
phase: 30-one-strict-decode-module
fixed_at: 2026-11-12T00:00:00Z
review_path: .planning/phases/30-one-strict-decode-module/30-REVIEW.md
iteration: 1
findings_in_scope: 7
fixed: 7
skipped: 0
status: all_fixed
---

# Phase 30: Code Review Fix Report

**Fixed at:** 2026-11-12
**Source review:** .planning/phases/30-one-strict-decode-module/30-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 7
- Fixed: 7
- Skipped: 0

`workflow.use_worktrees` is `false`, so every edit and commit happened in the main checkout on `arch-wave-8`. Verification ran in the main checkout: `pnpm check:pr < /dev/null` exited 0 (16 of 17 steps; `pnpm mutation` is the skipped one by design), and Stryker ran for the touched files below.

## Fixed Issues

### WR-01: `NotJson` text carries a `SyntaxError:` prefix

**Files modified:** `packages/core/src/UntrustedDecode.ts`, `packages/core/src/Policy.ts`, `packages/core/test/Policy.test.ts`, `packages/core/test/UntrustedDecode.test.ts`, `packages/devtools/test/model/ExplorerSession.test.ts`
**Commit:** b1299653
**Applied fix:** `decodeText` now builds `NotJson` from `error instanceof Error ? error.message : String(error)`. The three pins now assert the prefix is absent (`notInclude "SyntaxError"`) and `UntrustedDecode.test.ts` asserts the message equals the parser's own text exactly. The `PolicyNotJson` doc was corrected. The `NotJson` doc, the devtools changeset and BEH-QD-487 already said "the parser's own text / message", so they are now accurate with no edit; no spec or website text quotes the prefix. `SimulationForm.ts` keeps its own `String(error)` and its tests (not part of this finding).
Logic change: requires human verification.

### WR-02: Plan-local decision and plan numbers in shipped comments and test titles

**Files modified:** `packages/audit/src/AuditEntry.ts`, `packages/devtools/src/model/ExplorerSession.ts`, `packages/react/src/HydrationEngine.ts` (in the IN-03 commit), `packages/core/bench/UntrustedDecode.bench.ts`, `packages/audit/test/UntrustedSeams.test.ts`, `packages/core/test/UntrustedSeams.test.ts`, `packages/react/test/UntrustedSeams.test.ts`, `packages/devtools/test/model/ExplorerSession.test.ts`, `packages/devtools/test/model/ExplorerSessionRefusal.test.ts`, `packages/core/test/UntrustedDecode.test.ts`
**Commits:** d42e8de4 (all but `HydrationEngine.ts`), 19109ce7 (`HydrationEngine.ts` comment, shared with IN-03)
**Applied fix:** Removed every `D-NN`, `30-0N`, "phase base", "flipped in", "flips in" and "the plan expected" from the listed files. Headers now cite ADR-QD-143 and BEH-QD-486/487/488/489 and state the invariant (the guard runs before anything else reads the input). Row counts are unchanged: audit 18, core 41, react 20, devtools `ExplorerSession` 47 + `ExplorerSessionRefusal` 5. Titles that carried a BEH/REQ id were not touched. `ADR-QD-096 D-15-c` references were kept (they point at the ADR). A grep for the plan-local markers over `packages/{audit,core,react,devtools}` is clean.
Note: 30-09's embedded git-history check (plan-local, not a repo gate) would see these as expectation-line deletions in characterisation files without a src change; it is a phase-history check, not part of `pnpm check`.

### WR-03: `PortSpanEncode.ts` budget exemption rests on a false provenance claim

**Files modified:** `scripts/check-house-style.mjs`, `AGENTS.md`, `spec/decisions/143-untrusted-json-is-decoded-through-one-module.md`
**Commit:** 5f32f335 (shared with IN-02)
**Applied fix:** Reworded the reason in all three places to the property that holds: it reads only its own named keys and every leaf is a `SpanValue` primitive (INV-QD-044), so there is no nesting or excess key for a guard to bound, whoever supplies the map. ADR-QD-143 revised via `spec-revise.mjs` (1.0 to 1.1, dated 2026-11-12).
**Not done (the optional half):** replacing the final `Schema.decodeUnknownSync` in `spanStruct`'s `decode` with assembly from the already-decoded fields. The return type is `SpanType<SpanStruct<Fields>>`, a conditional mapped type over a generic `Fields`; building it from a `Record<string, unknown>` needs an assertion (`as`), which is forbidden, and the sync decode also enforces required fields. So the budget count stays 2. Worth knowing: that decode can throw for a leaf with a transformation, as the review noted.

### IN-01: `unwalked` doc and key space

**Files modified:** `packages/core/src/UntrustedDecode.ts`, `packages/core/test/UntrustedDecode.tst.ts`
**Commit:** fe4795ff
**Applied fix:** The doc now says "`unknown` or `ReadonlyArray<unknown>`". `untrustedDecoder` keys `UnwalkedKey` on `S["Encoded"]` (the raw wire keys the guard filters). It was type-correct for all three seams. The existing pins stay green and one new pin covers the encoded-key case (a slot that is `unknown` on the encoded side is accepted; one that is `unknown` only on the decoded side is refused). `pnpm typecheck` and `tstyche` pass.

### IN-02: `decodeStoredRecordString` is a `JSON.parse` seam invisible to `[untrusted-decode]`

**Files modified:** `scripts/check-house-style.mjs`, `AGENTS.md`, `spec/decisions/143-untrusted-json-is-decoded-through-one-module.md`, `spec/invariants.md`, `packages/core/src/SinkCodec.ts`
**Commit:** 5f32f335 (shared with WR-03)
**Applied fix:** Took the gate option, because `packages/*/src` has only three real `JSON.parse` call sites and each has a real reason. `JSON.parse` is now part of `UNTRUSTED_DECODE_TOKEN`; budget rows: `UntrustedDecode.ts` 4 to 5 (`decodeText`), `SinkCodec.ts` 1 (`decodeStoredRecordString`, with `decodeStoredRecordString` in the names guard) and `SimulationForm.ts` 1 (`parseJson`, the form's own text), mirrored in AGENTS.md 7a and ADR-QD-143 ("Six files carry a count"). INV-QD-305's enforcement line now says "six budgeted files". I also added the short why-comment on `decodeStoredRecordString`. `spec-revise.mjs` ran for the ADR (1.1) and `spec/invariants.md` (1.108 to 1.109), both dated 2026-11-12. `node scripts/check-house-style.mjs` is clean (464 files).

### IN-03: Closure-returning `Match` arms in `HydrationEngine.ts`

**Files modified:** `packages/react/src/HydrationEngine.ts`
**Commit:** 19109ce7
**Applied fix:** `tooDeepEntry`, `asMalformed` and the curried `entryDropReason` are replaced by one `entryDropReason(refusal, malformed)` (`Match.value(...).pipe(Match.tagsExhaustive(...))`, no assertion); the two call sites pass the reason as a second argument.

### IN-04: Three copies of the plain-object predicate; long NS-01 comment

**Files modified:** `packages/core/src/DecodeDepthGuard.ts`, `packages/core/src/UntrustedDecode.ts`, `packages/core/src/SinkCodec.ts`
**Commit:** 22d2f24d
**Applied fix:** `isPlainObject` is exported once from `DecodeDepthGuard.ts` (package-private, still not in the barrel) with a one-line doc replacing the NS-01 history comment; `UntrustedDecode.ts` and `SinkCodec.ts` (which dropped `isJsonObject`) import it. The file header is separated from it by a blank line. `pnpm circular` passes. `FieldPath.ts` and `JsonHazard.ts` keep their own, unrelated predicates.

## Verification

- `pnpm check:pr < /dev/null`: exit 0. Final lines, verbatim:

```
[run-check 16/16] pnpm spec:publish

> qadi-monorepo@0.4.0 spec:publish /Users/mohammadalmechkor/Projects/Perso/qadi
> node scripts/check-publish-status.mjs

publish-status: 9 package(s) and 6 document(s) agree on version (0.11.0)

run-check: ran 16 of 17 steps; "pnpm mutation" was skipped (release PRs run it).
```

- Stryker, run in the main checkout after the last source commit (`UntrustedDecode.ts`, `DecodeDepthGuard.ts`, `SinkCodec.ts` with `stryker.config.mjs`; `HydrationEngine.ts` with `stryker.react.mjs`). `PortSpanEncode.ts` was not changed, and `HydrationMetrics.ts`/`Policy.ts`/audit/devtools src changed in comments or titles only:

| File | `30-mutation-base.json` | Now |
| ---- | ----------------------- | --- |
| `packages/core/src/UntrustedDecode.ts` | new leaf (floor 0.9) | 0.9333 |
| `packages/core/src/DecodeDepthGuard.ts` | 0.9474 | 0.9474 |
| `packages/core/src/SinkCodec.ts` | 0.9278 | 0.9634 |
| `packages/react/src/HydrationEngine.ts` | 0.9693 | 0.9776 |

  `UntrustedDecode.ts` dropped from 0.9512 (the committed `30-mutation-after.json`) to 0.9333 because `isPlainObject` and its mutants moved to `DecodeDepthGuard.ts`; its only two survivors are `unwalked.size > 0` mutated to `true` / `>= 0` on line 177, which are equivalent (filtering an empty set returns an equal copy, so no input distinguishes them). No file is below its baseline. `30-mutation-after.json` was not rewritten.

---

_Fixed: 2026-11-12_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
