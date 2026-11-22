---
phase: QD-66-the-decoder-reads-only-what-it-declares
reviewed: 2026-11-20T23:55:00Z
depth: standard
files_reviewed: 18
files_reviewed_list:
  - packages/core/src/UntrustedDecode.ts
  - packages/core/src/EnvelopeKeys.ts
  - packages/core/src/SinkCodec.ts
  - packages/core/test/UntrustedDecode.test.ts
  - packages/core/test/UntrustedSeams.test.ts
  - packages/core/bench/UntrustedDecode.bench.ts
  - .planning/phases/QD-66-the-decoder-reads-only-what-it-declares/bench/ab.sh
  - .planning/phases/QD-66-the-decoder-reads-only-what-it-declares/bench/analyze.mjs
  - .planning/phases/QD-66-the-decoder-reads-only-what-it-declares/66-mutation.mjs
  - AGENTS.md
  - spec/decisions/170-an-envelope-states-its-unknown-key-policy-at-its-decoder.md
  - spec/decisions/index.yaml
  - spec/invariants.md
  - spec/behaviors/08-serialization.md
  - spec/overview.md
  - spec/traceability.md
  - spec/README.md
  - .changeset/core-decoder-reads-declared-keys.md
findings:
  critical: 0
  warning: 0
  info: 2
  total: 2
status: clean
---

# Phase QD-66: Code Review Report (iteration 2)

**Reviewed:** 2026-11-20
**Depth:** standard
**Files Reviewed:** 18
**Status:** clean

## Summary

This re-review covers the four fix commits (a25de426, 179285d1, 2b8e3249, 5435e2fc) on top of the iteration-1 review (778187a9). Every finding that was in scope is resolved, and the fixes introduced nothing new. No Critical or Warning remains. Two Info items carry forward unchanged and are deferred to the milestone audit.

Each fix was checked against the source, not against the fix report.

| Finding | Result | Evidence |
| --- | --- | --- |
| WR-01 | Resolved | INV-QD-097 now says `encodeSinkRecord` and `encodeSinkRecordString` never throw whatever they are given. It says `decodeSinkRecord` and `decodeSinkRecordString` never throw on any JSON text or JSON value, and that `decodeSinkRecordString` is total because it takes text. The "no adapter lets one record end a feed" clause is now tied to "decodes what a store or a wire returned, which is JSON text or a JSON value". The closing sentence names the in-process accessor reads that are thrown out: a declared top-level one, or one the depth guard or strict decode reads under a kept value, one level down included. That matches R17 and U28. The paragraph no longer contradicts itself. No title changed, so no anchor changed. |
| IN-01 | Resolved | BEH-QD-666, INV-QD-377, ADR-QD-170 (D-19 and the amendment), the traceability row, the CCR-QD-457 row, the changeset, and the `envelopeKeysOf` and `project` doc comments all now say the same thing. `_tag` is read to choose a member only when the schema flattens to more than one member, and then twice. A schema that flattens to one member, whether a one-object schema or a union of one, reads a declared `_tag` once as a kept value and never invokes an undeclared `_tag` accessor. This matches the `members.length === 1` gate in `EnvelopeKeys.ts`. A grep of `spec/`, `AGENTS.md`, `.changeset` and `packages/core/{src,test,bench}` finds no leftover "a union's `_tag` is read twice". The one remaining hit, `SinkCodec.ts:520`, describes the record wire, which is a true multi-member union, so it is correct. |
| IN-04 | Resolved | The ADR and the CCR-QD-457 row name the gate as the median of per-run minima, with the 5% band and the +2% geometric mean taken over those deltas. They say the p50 and mean are recorded beside it, decide nothing, and live in `66-BENCH.md` and `bench/final/analysis.tsv`. Both files exist. `66-BENCH.md` states the same statistic (lines 5, 22, 52, 64), and `analysis.tsv` carries the p50 and mean columns. The `ab.sh` arm-order suggestion was not applied. It is a phase artifact, and the gate was fixed before the run, so I do not count it as a defect. |
| IN-05 | Resolved | The `EnvelopeKeys.ts` doc, the `UntrustedDecoderOptions` doc and the `project` doc are re-wrapped at about 90 columns. The `git diff -U0` hunks touch only those three comment blocks. The remaining lines over 100 columns are pre-existing and outside the hunks. |
| IN-06 | Resolved | `Either` is gone from `UntrustedDecode.test.ts` and replaced by `TwoMembers`: 11 lines changed, none added or removed. `pnpm vitest run --project core` on `UntrustedDecode`, `UntrustedSeams` and `StoredEnvelope` gives 3 files and 149 tests passed, the same count as the first review. |

**Comment-only src change.** I re-ran the token-stream comparison myself, with a TypeScript `createScanner` and `skipTrivia`. It compared `778187a9:packages/core/src/{UntrustedDecode,EnvelopeKeys}.ts` against the working tree. Both are identical (744 and 528 tokens, `cmp` clean). `SinkCodec.ts` and `packages/*/bench` are untouched since 778187a9, so the bench of record still stands.

**CCR-QD-457 row.** It cites every revised document at the Revision on line 8 of that document today.

| Document | Cited | Line 8 |
| --- | --- | --- |
| `spec/decisions/170-…-decoder.md` | 1.2 | 1.2 |
| `spec/behaviors/08-serialization.md` | 1.7 | 1.7 |
| `spec/invariants.md` | 1.165 | 1.165 |
| `spec/traceability.md` | 1.232 | 1.232 |
| `spec/overview.md` | 1.130 | 1.130 (unchanged) |
| `spec/README.md` | 1.268 | 1.268 |

**Gates I ran.**
- `node scripts/spec-revise.mjs --check`: every Revision matches its newest history entry.
- `bash spec/scripts/verify-traceability.sh --strict`: PASS 21, FAIL 0, SKIP 0.
- Tests as above: 149 passed.

I did not re-run the doc-example, DoD, API-surface or house-style gates. The fixer reported them clean, and the diff touches no code token, export, budget or table they read.

Necessity assessment (#4100) was not performed. I did not load `necessity-review.md`, so `necessity:` is omitted from the frontmatter. I found no candidate on inspection.

## Info

Both items are carried forward unchanged from iteration 1. Nothing in the four fix commits touches the code they describe, so both still hold. They are deferred to the milestone audit.

### IN-02: Two behaviour differences on non-idempotent in-process accessors are neither stated nor pinned

**File:** `packages/core/src/UntrustedDecode.ts:179-190`; `packages/core/src/EnvelopeKeys.ts:85-88`
**Issue:** Plain data and idempotent accessors behave exactly as before. Two cases differ:
- A `_tag` that answers differently on its second read can pick one member's keys and copy a different `_tag`. The strict decode then refuses, so this fails closed.
- An accessor that deletes a later own key leaves that key in the `Object.keys` snapshot. The copy then holds `undefined` for it, so the refusal message is "Expected number at …" where it was "Missing key". The refusal is still `Malformed`.

This is in-process hostile input, and no test or text mentions either.
**Fix:** Add one sentence to the INV-QD-377 Implication, or copy `_tag` from the value already read in the union branch.

### IN-03: Mutation scorer `compare` is weaker than its header says in two places

**File:** `.planning/phases/QD-66-the-decoder-reads-only-what-it-declares/66-mutation.mjs` (`compare`, the `atBase` loop and the `known`/`wasIgnored` sets)
**Issue:** A line is exempt as "not written by the phase" when its trimmed text also appears anywhere in the base file, even if its behaviour changed. Multiplicity is lost because `known` and `wasIgnored` are `Set`s, so two identical open mutants are matched as one. Neither changes this phase's result: close is 44/46 against 41/43 at base, with the same two pre-existing equivalent survivors.
**Fix:** Match against the diff's added lines, and compare counts per key with a `Map`.

---

_Reviewed: 2026-11-20_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
