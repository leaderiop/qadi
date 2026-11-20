---
phase: QD-66-the-decoder-reads-only-what-it-declares
verified: 2026-11-20T23:59:00Z
status: passed
score: 8/8 must-haves verified
covered_files:
  - .planning/phases/QD-66-the-decoder-reads-only-what-it-declares/66-01-PLAN.md
  - .planning/phases/QD-66-the-decoder-reads-only-what-it-declares/66-01-SUMMARY.md
  - .planning/phases/QD-66-the-decoder-reads-only-what-it-declares/66-02-PLAN.md
  - .planning/phases/QD-66-the-decoder-reads-only-what-it-declares/66-02-SUMMARY.md
  - .planning/phases/QD-66-the-decoder-reads-only-what-it-declares/66-03-PLAN.md
  - .planning/phases/QD-66-the-decoder-reads-only-what-it-declares/66-03-SUMMARY.md
  - .planning/phases/QD-66-the-decoder-reads-only-what-it-declares/66-04-PLAN.md
  - .planning/phases/QD-66-the-decoder-reads-only-what-it-declares/66-04-SUMMARY.md
  - .planning/phases/QD-66-the-decoder-reads-only-what-it-declares/66-05-PLAN.md
  - .planning/phases/QD-66-the-decoder-reads-only-what-it-declares/66-05-SUMMARY.md
  - packages/core/bench/UntrustedDecode.bench.ts
  - packages/core/src/EnvelopeKeys.ts
  - packages/core/src/SinkCodec.ts
  - packages/core/src/UntrustedDecode.ts
  - packages/core/test/UntrustedDecode.test.ts
  - packages/core/test/UntrustedSeams.test.ts
covered_digest: "v4:sha256:4b5c63c7624843714d4e41e072486a082bbbfadfd8c385fd92b7671359c604d6"
behavior_unverified: 0
overrides_applied: 0
---

# Phase 66: The decoder reads only what it declares, Verification Report

**Phase Goal:** Under `unknownKeys: "ignore"`, `untrustedDecoder`'s projection reads only the declared keys' values, so an undeclared accessor on an in-process value is never invoked, and the hydration payload's `refuse` policy is recorded as decided.
**Verified:** 2026-11-20
**Status:** passed
**Re-verification:** No, initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
| --- | --- | --- | --- |
| 1 | SC1 / DECL-01: a RED test on the phase base shows an undeclared throwing getter is invoked, directly and through both `ignore` seams; GREEN after | VERIFIED | I put the `phase_base` (48921088) versions of `UntrustedDecode.ts`, `EnvelopeKeys.ts` and `SinkCodec.ts` back into the tree under the HEAD tests and ran `UntrustedDecode.test.ts` and `UntrustedSeams.test.ts` once. Exactly 8 of 127 failed: U22 to U25 (direct), R15 and R16 (`sinkWire`, via `decodeSinkRecord` and `decodeSinkRecordWithJson`), S16 and S17 (`storedWire`). The tree was restored with `git checkout HEAD -- packages/core/src` and `git status` is clean for `packages`. At HEAD, those two files plus `SinkCodec.test.ts` and `StoredEnvelope.test.ts` pass (317 of 317). The RED commit f89e6451 comes before the fix 19fe60a0, and `66-RED-EVIDENCE.md` agrees with my run. |
| 2 | SC2 / DECL-02: the projection reads own key names, then each declared value once (and the `_tag` its member choice needs); doc and ADR D-19 are scoped, stating what `refuse` and `unwalked` still read | VERIFIED | `project` in `UntrustedDecode.ts` is `Object.keys(input).filter(keys.has).map(key => [key, input[key]])`. `envelopeKeysOf` returns `() => first.keys` for a one-member schema, so it reads no `_tag` there, and reads `_tag` once otherwise. The measured reads in `66-RED-EVIDENCE.md` fit this: `extra=0`, an undeclared `_tag=0`, a declared `_tag=1`, a union `_tag=2`, `addedLater=0`. The tests U22 to U29, R15 to R17 and S16 to S18 pin them. The `project` doc, ADR-QD-170 D-19 and its amendment, INV-QD-377 and BEH-QD-666 all say that under `refuse` the guard (and `walked` for `unwalked` keys) reads every own value, and that only the top level is projected. This matches the `refuse` reads in the evidence (`a=2`, `id=2 entries=2 raw=2`) and the code (`exceedsJsonDepth` uses `Object.keys` plus an index read). |
| 3 | SC3 / DECL-03: hydration keeps `refuse`, pinned by a test, with an ADR amendment and an empty `packages/react/src` diff | VERIFIED | `HydrationEngine.ts` states `unknownKeys: "refuse"` at lines 164, 194 and 209. `git diff 48921088 HEAD -- packages/react` is empty. `packages/react/test/UntrustedSeams.test.ts` H1 (an unknown envelope key gives `{ seeded: 0, reasons: ["MalformedPayload"] }`) passes in the react project (25 of 25). The ADR-QD-170 amendment (2026-11-20, CCR-QD-457) records why the payload stays strict, and the index.yaml status carries the amendment. |
| 4 | SC4 / DECL-04: bench gate passes with the band fixed before measuring; `UNTRUSTED_DECODE_BUDGET` unchanged; one `@qadi/core` patch changeset | VERIFIED | `analyze.mjs` was committed in 4fbc4cb3, before the bench commit ed3c44f0. It fixes a 5% per-workload band and a +2% geomean, and the base spread never widens the band. I re-ran `node bench/analyze.mjs final base final` on the committed data: 0 slower, geomean -2.13%, worst +3.5%, gate pass. `git diff 48921088 HEAD -- scripts` is empty, and AGENTS.md §7a's change is prose only (the table is untouched). `node scripts/check-house-style.mjs` is clean (560 files). `git diff` shows exactly one new changeset, `.changeset/core-decoder-reads-declared-keys.md` (`"@qadi/core": patch`), and its wording matches the code. |
| 5 | The bench of record still describes the HEAD code | VERIFIED | I compared comment-stripped output (TypeScript 6.0.3 `transpileModule`, `removeComments`) of ed3c44f0 against HEAD. `UntrustedDecode.ts` and `EnvelopeKeys.ts` are code-identical, and `packages/core/bench` and `SinkCodec.ts` have no diff after ed3c44f0. The only code difference after the bench is the `Either` to `TwoMembers` rename in `UntrustedDecode.test.ts`. Between the fix 19fe60a0 and the measured tree b7fad179, `SinkCodec.ts` is code-identical (comments only) and the bench file only gained the `ignore` group. |
| 6 | Every text about what the projection or decoder reads says only what the code holds | VERIFIED | Compared against the measured reads: the `UntrustedDecode.ts` `project` and options docs, `EnvelopeKeys.ts` doc, `SinkCodec.ts` `sinkWire`, `decodeSinkRecord`, `storedWire` and `decodeStoredRecord` docs, ADR-QD-170 (D-19, D-09, amendment), INV-QD-097 (scoped to JSON text and JSON values, names the accessor reads), INV-QD-306 (a slot is read twice under `refuse`, once under `ignore`, which matches `id=2` and `id=1`), INV-QD-360, INV-QD-377, BEH-QD-621, 622, 623 and 666, BEH-QD-488 (does not mention reads), AGENTS.md §7a, `spec/overview.md` rows 134 and 360 (both updated, so the stale-row defect of phases 64 and 65 does not recur), the changeset and the website upgrade page (no read claim). A search of `packages/*/src`, `spec`, `apps` and `examples` finds no leftover "reads no value" or "cannot recurse" claim. The known and accepted items (`walked()` and `exceedsJsonDepth` reading under `refuse`, a union's `_tag` read twice) are stated, not hidden. |
| 7 | The CCR-QD-457 row cites every revised document at its current Revision | VERIFIED | The row in `spec/README.md:394` cites ADR-QD-170 Rev 1.2, 08-serialization 1.7, invariants 1.165, traceability 1.232, overview 1.130 and README 1.268. Line 8 of each document reads exactly those values. The row also names `index.yaml` (which has no Revision), AGENTS.md §7a, the changeset and every code and test file. `node scripts/spec-revise.mjs --check` passes, and `spec/scripts/verify-traceability.sh --strict` gives 21 PASS, 0 FAIL, 0 SKIP. ADR-QD-179, BEH-QD-667 to 670 and INV-QD-378 appear nowhere else, so "Unused" holds. |
| 8 | WX-01 to WX-07 as they apply to this phase | VERIFIED | See the WX table below. |

**Score:** 8/8 truths verified (0 present, behavior-unverified). Truths 1 and 2 are behavior-dependent, and each has a named passing test, not presence alone.

### WX rows (they stay Pending in REQUIREMENTS.md by design; they are cross-cutting)

| Row | Result | Evidence |
| --- | --- | --- |
| WX-01 | Holds | Taken from the caller: `pnpm check:pr < /dev/null` exited 0 on 678fb6d3 ("ran 16 of 17 steps"). I did not re-run it. I ran `check-house-style`, `check-api-surface` (939 exports documented), `check-doc-examples` (117 blocks), `spec-revise --check` and `verify-traceability --strict`, all green. |
| WX-02 | Holds | ADR-QD-170 amended, CCR-QD-457, BEH-QD-666, INV-QD-377 and the traceability rows are present. The reserved numbers only are used (ADR-QD-179, BEH-QD-667 to 670 and INV-QD-378 are named Unused). |
| WX-03 | Holds | No export added or removed; the two overview rows are reworded and gate 13 passes. |
| WX-04 | Holds | I scanned all 333 lines added under `packages` for `as`, `!`, `any`, `switch`, `fnUntraced`, `async`, `await`, `console`, `process.env`, clocks, `Record<string, unknown>` and `Stryker disable`. There are no hits. The `Record<string, unknown>` in `JsonShape.ts` is old and unchanged. |
| WX-05 | Holds | Scores (`detected/scored`) from `66-mutation-base.json` and `66-mutation-close.json`: `EnvelopeKeys.ts` 58/58 to 57/57 (1.0000), `SinkCodec.ts` 123/127 to 123/127 (0.9685, same four survivors), `UntrustedDecode.ts` 41/43 to 44/46 (0.9535 to 0.9565, the same two pre-existing survivors, now at line 240). The static run (`ignoreStatic: false`) has no Ignored mutants and kills all but those two. No file dropped, and nothing was re-baselined. |
| WX-06 | Holds | The RED tests were written on the base (f89e6451 before 19fe60a0) and I re-ran them red. The variants A to D in `66-RED-EVIDENCE.md` show each part of the change failing a test once. The added-lines scan was shown failing once on a planted `as`. |
| WX-07 | Holds | No plan-local id, phase number or new D-number in the added lines. The `D-15-c`, `D-17` and `D-18` references in `SinkCodec.ts` are ADR-QD decision ids and predate this phase. |

### Required Artifacts

| Artifact | Expected | Status | Details |
| --- | --- | --- | --- |
| `packages/core/src/UntrustedDecode.ts` | names-first `project`, scoped docs | VERIFIED | Substantive, wired through `PROJECTION.ignore`, used by `sinkWire` and `storedWire`. |
| `packages/core/src/EnvelopeKeys.ts` | one-member shortcut that reads no `_tag` | VERIFIED | `members.length === 1` returns `() => first.keys`. |
| `packages/core/src/SinkCodec.ts` | comments say what the `ignore` seams read | VERIFIED | Comment-only change (code-identical). |
| `packages/core/test/UntrustedDecode.test.ts`, `UntrustedSeams.test.ts` | U22 to U29, R15 to R17, S16 to S18 | VERIFIED | Real assertions (read counts, `doesNotThrow`, `throws`), not stubs. |
| `packages/core/bench/UntrustedDecode.bench.ts` | `ignore` rows | VERIFIED | Four workloads in the `ignore` group, committed before the run. |
| `.changeset/core-decoder-reads-declared-keys.md` | one `@qadi/core` patch | VERIFIED | One file, patch. |

### Key Link Verification

| From | To | Via | Status |
| --- | --- | --- | --- |
| `sinkWire` / `storedWire` | `project` | `untrustedDecoder(..., { unknownKeys: "ignore" })` and `PROJECTION[...]` | WIRED, and read-counted by R16 and S16 |
| `project` | `envelopeKeysOf` | `keysOf(input)` | WIRED |
| hydration decoders | `refuse` | `HydrationEngine.ts` lines 164, 194 and 209 | WIRED, and pinned by H1 |

### Anti-Patterns Found

None blocking. No TBD, FIXME or XXX in the added lines.

### Human Verification Required

None.

### Gaps Summary

No gaps. Three minor observations, none blocking:

- **ROADMAP.md bookkeeping (administrative).** The Phase 66 checkbox (`ROADMAP.md:430`) is still `[ ]` and the progress table row (`:638`) reads "In Progress". The orchestrator should flip them on phase completion. REQUIREMENTS.md already has DECL-01 to 04 Complete and WX-01 to 07 Pending, as intended.
- **Doc imprecision (info).** The `UntrustedDecoderOptions` doc says `ignore` keeps the keys "for the member the input's own enumerable `_tag` selects". For a one-member schema nothing selects by `_tag`. BEH-QD-623 and ADR-QD-170 say it correctly ("for a union member" and "only when more than one"). It is not a false claim of reads, so I did not raise it as a gap. The suggested fix is to add "when there is more than one" to that sentence.
- **Deferred by owner decision (carried).** Review IN-02 (an accessor whose second read differs) and IN-03 (the mutation scorer's `compare` is weaker than its header) go to the milestone audit.

---

_Verified: 2026-11-20_
_Verifier: Claude (gsd-verifier)_
