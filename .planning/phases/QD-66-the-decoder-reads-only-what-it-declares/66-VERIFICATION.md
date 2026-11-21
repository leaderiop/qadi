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
covered_digest: "v4:sha256:ff8bbd1ca720847f11e9809b8361d54adf2fe568fa79c424bb142bfeaf02cfa3"
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

## Re-verification (2026-11-21, Phase 68 sweep)

**Staleness:** `66: stale, verification ba4392cf, 23 cited, 8 changed since` (`68-stale.mjs`, run at `0f7b536a`).

| Cited file | Changed since `ba4392cf` by |
| --- | --- |
| `AGENTS.md` | `36036666` (before Phase 68) fix(67): IN-03 move the dispatch measurement into the evidence document<br>`dea2afb4` (before Phase 68) docs(67-06): BEH-QD-166's reasons and INV-QD-379, traced and registered as CCR-QD-458 |
| `packages/core/src/SinkCodec.ts` (covered) | `d9e2e96b` style(68-04): hand-wrap the three over-width lines, and the ingest doc names the envelope |
| `packages/core/src/UntrustedDecode.ts` (covered) | `2bea33b3` docs(68-04): the diagnostics poll's stop and the ignore projection's members, as the code holds them |
| `packages/core/test/UntrustedDecode.test.ts` (covered) | `8016587b` test(68-04): narrow U31's refusals to Malformed so the test typechecks<br>`045b00bf` test(68-03): pin admit's single read, a second and a nested unknown key, and two accessor readings |
| `packages/react/test/UntrustedSeams.test.ts` | `045b00bf` test(68-03): pin admit's single read, a second and a nested unknown key, and two accessor readings |
| `scripts/check-house-style.mjs` | `ec59e0ac` fix(68-08): test:tstyche takes file filters, house-style reads tstyche.json as JSONC, the characterisation is named once |
| `scripts/spec-revise.mjs` | `564818c0` fix(68-01): spec-revise keeps its first argument when --date is not given |
| `spec/README.md` | `eacfeb6c` docs(68-11): CCR-QD-459, the settled items confirmed, and the devtools patch changeset<br>`82f87b4f` (before Phase 68) docs(67): the later bench run's miss deltas are not the dispatch's alone<br>`e5c18e6f` (before Phase 68) fix(67): IN-04 state the dispatch run's base spreads and host load beside the verdict<br>`36036666` (before Phase 68) fix(67): IN-03 move the dispatch measurement into the evidence document<br>`dea2afb4` (before Phase 68) docs(67-06): BEH-QD-166's reasons and INV-QD-379, traced and registered as CCR-QD-458 |

**Trailers on this phase's commits:** 35 `Claude Opus 5.5 <noreply@anthropic.com>`.

**Validation record:** no VALIDATION.md.

**Digest:** `covered_digest: "v4:sha256:4b5c63c7624843714d4e41e072486a082bbbfadfd8c385fd92b7671359c604d6"` becomes `covered_digest: "v4:sha256:ff8bbd1ca720847f11e9809b8361d54adf2fe568fa79c424bb142bfeaf02cfa3"`, over the same 16 covered files.

### Spot-checks re-run (Phase 68 sweep)

The report has no spot-check table, so each of its eight Observable Truths is re-checked, one command at a time, in the foreground, with nothing else running beside it, on the tree at `0f7b536a`.

| Truth | Command run now | Result now | Status |
| ----- | --------------- | ---------- | ------ |
| 1. RED on the phase base, GREEN after | `git show 48921088:packages/core/src/<F>.ts > packages/core/src/<F>.ts` for `UntrustedDecode`, `EnvelopeKeys` and `SinkCodec`, then `pnpm exec vitest run packages/core/test/UntrustedDecode.test.ts packages/core/test/UntrustedSeams.test.ts < /dev/null`, then `git checkout HEAD -- ` the three files and `git status --porcelain -- packages` | on the base sources 10 of 129 failed: U22 to U25, R15, R16, S16 and S17, the eight of the report, and U30 and U31, which Phase 68 added and which also fail on the base; the tree was restored and `git status` is clean for `packages`. At HEAD `UntrustedDecode.test.ts`, `UntrustedSeams.test.ts`, `SinkCodec.test.ts` and `StoredEnvelope.test.ts` pass, 319 of 319 (the report's 317 plus U30 and U31). `f89e6451` is an ancestor of `19fe60a0` | PASS |
| 2. The projection reads names, then each declared value once | the same run at HEAD, plus reading `project` (`UntrustedDecode.ts`) and `envelopeKeysOf` (`EnvelopeKeys.ts`) | `project` is still `Object.keys(input).filter(keys.has).map(key => [key, input[key]])`, and `envelopeKeysOf` still returns `() => first.keys` when `members.length === 1`. U22 to U29, R15 to R17 and S16 to S18 pass (row 1's HEAD run). Compiled with comments removed, `UntrustedDecode.ts`, `SinkCodec.ts` and `EnvelopeKeys.ts` are the same at HEAD as at `ba4392cf`, the report's commit (`node` the phase's compiler comparison, three `same:` lines) | PASS |
| 3. Hydration keeps `refuse`; empty `packages/react/src` diff | `grep -n unknownKeys packages/react/src/HydrationEngine.ts`, `git diff --name-only 48921088 HEAD -- packages/react/src`, `pnpm exec vitest run packages/react/test/UntrustedSeams.test.ts < /dev/null` | `unknownKeys: "refuse"` at lines 164, 194 and 209 (`HydrationEngine.ts`); the `packages/react/src` diff lists 0 files; 27 of 27 pass, H1 among them (the report's 25 plus H6 and H7, which Phase 68 added and which pin two unknown envelope keys and a nested unknown key) | PASS |
| 4. Bench gate, budget unchanged, one changeset | `node analyze.mjs final base final < /dev/null` run in the phase's `bench` directory; `node scripts/check-house-style.mjs < /dev/null`; the `UNTRUSTED_DECODE_BUDGET` block of `scripts/check-house-style.mjs` at `48921088` and now, compared; `git diff --name-status 48921088 ba4392cf -- .changeset`; `cat .changeset/core-decoder-reads-declared-keys.md` | 6 workloads, 0 slower, geomean -2.13%, worst +3.5%, `gate: pass`, the figures of the report. `house-style: 560 file(s) clean (3 declared switch(es), 66 type-test file(s))`. The budget block is the same text as at the base. The phase added exactly one changeset (`A .changeset/core-decoder-reads-declared-keys.md`, `"@qadi/core": patch`), whose wording matches the code. The report's "`git diff 48921088 HEAD -- scripts` is empty" is no longer true of the tree, because Phase 68 edited `scripts/check-house-style.mjs`, `scripts/spec-revise.mjs` and other gate scripts; the budget block, which is what the claim was about, is unchanged | PASS |
| 5. The bench of record still describes the HEAD code | the phase's compiler comparison, `<ref> <file>...` against `ed3c44f0` (the bench commit) for `UntrustedDecode.ts`, `EnvelopeKeys.ts`, `SinkCodec.ts` and `UntrustedDecode.bench.ts` | four `same:` lines, so each is the same compiled code token for token as at the bench commit. `git diff --stat ed3c44f0 HEAD -- packages/core/bench/UntrustedDecode.bench.ts` is empty. Phase 68 changed `packages/core/bench/DecisionCache.bench.ts`, which this bench does not read | PASS |
| 6. Every text says only what the code holds | `git grep -n -i "reads no value\|cannot recurse\|read no value" -- packages/*/src spec apps examples AGENTS.md`, then reading each hit | `UntrustedDecode.ts:178` ("it cannot recurse", of the projection reading nothing below the top level, and followed by what the guard and the decode read), `08-serialization.md:223` ("reads no value below the top level and no undeclared value") and `170-*.md:161` (the amendment that says D-19 was wrong) are all scoped as the code holds; no unscoped "reads no value" claim remains. `ba4392cf..HEAD` changed only comments in `UntrustedDecode.ts` and a line break in `SinkCodec.ts` (row 2); ADR-QD-170 and `08-serialization.md` are unchanged since; `spec/invariants.md` changed only the INV-QD-375 and INV-QD-376 rows, the new INV-QD-379 and the Enforcement line of INV-QD-377, which now lists U22 to U31 | PASS |
| 7. CCR-QD-457 cites each revised document at the Revision it left | `node scripts/spec-revise.mjs --check < /dev/null`, `bash spec/scripts/verify-traceability.sh --strict < /dev/null`, and reading each Change History for the Revision the row names | `spec-revise: every Revision matches its newest Change History entry`; `PASS: 21   FAIL: 0   SKIP: 0`. ADR-QD-170 is at 1.2 and `08-serialization.md` at 1.7, as the row says. The row's Revisions for `spec/invariants.md` 1.165, `spec/traceability.md` 1.232, `spec/overview.md` 1.130 and `spec/README.md` 1.268 are entries in those documents' Change History, dated 2026-11-20; later phases moved the headers on to 1.168, 1.235, 1.130 and 1.273, and a CCR row records the Revision its change left. ADR-QD-179, BEH-QD-667 to 670 and INV-QD-378 appear only in that row, which says they are Unused | PASS |
| 8. WX-01 to WX-07 as they apply | `node scripts/check-api-surface.mjs`, `node scripts/check-doc-examples.mjs`, a scan of the 333 lines the phase added under `packages` for the forbidden tokens, and Phase 68's mutation comparison for the three files | `api-surface: 939 export(s) documented across 9 package(s)`; `doc-examples: 117 block(s) compile`; the scan's only hits are the words "as a kept value" inside comments, no code token, as the report found. WX-05: Phase 68's own base and close read `SinkCodec.ts` 123/127 to 123/127 and `UntrustedDecode.ts` 44/46 to 44/46, the report's scores, with no new open or Ignored mutant; `EnvelopeKeys.ts` is code-identical since the report. WX-01: the `pnpm check:pr < /dev/null` row of the report was "taken from the caller"; this verdict is answered by the one `check:pr` run of plan 68-15, which reads the whole tree, and stands only while that run is green | PASS (WX-01 ANSWERED BY 68-15) |

### Changed covered files read against the truths that cite them (Phase 68 sweep)

- `packages/core/src/UntrustedDecode.ts` (`2bea33b3`): Truths 2 and 6 still hold. The diff since `ba4392cf` changes the doc of `UntrustedDecoderOptions` only: `ignore` keeps the keys the schema declares, "for a schema of more than one member those of the member the input's own enumerable `_tag` selects". That is the sentence the report's Gaps Summary called imprecise for a one-member schema, and it now agrees with BEH-QD-623 and ADR-QD-170. No code token changed (row 2).
- `packages/core/src/SinkCodec.ts` (`d9e2e96b`): Truth 2 still holds. The change wraps one over-width line of `fromEnvelope`, and the compiled output is the same (row 2).
- `packages/core/test/UntrustedDecode.test.ts` (`8016587b`, `045b00bf`): Truth 1 still holds, and the file only gained tests. U30 pins that a union's `_tag` answering differently on its second read chooses one member's keys and is copied as the other's tag, which the strict decode refuses. U31 pins that an accessor which deletes a later own key leaves that key in the projection with no value, so the refusal names the value's type. They are the two Phase 68 readings of the projection the report's observations left open, and both fail on the base sources (row 1).
- Cited, not covered, and changed since: `packages/react/test/UntrustedSeams.test.ts` (`045b00bf`) only gained H6 and H7, so Truth 3 still holds (row 3). `scripts/check-house-style.mjs` (`ec59e0ac`) reads `tstyche.json` as JSONC; the `UNTRUSTED_DECODE_BUDGET` block Truth 4 cites is unchanged (row 4). `scripts/spec-revise.mjs` (`564818c0`) keeps its first argument when `--date` is not given, which the `--check` run of Truth 7 does not use. `spec/README.md` and `AGENTS.md` were moved on by Phases 67 and 68; the CCR-QD-457 row and the section on the untrusted decode that Truths 6 and 7 cite are unchanged in what they say (rows 6 and 7).

### Notes on the original report's evidence

Kept whole above; recorded here, not edited.

- The report's Truth 1 states the base as `48921088` and its restore as `git checkout HEAD -- packages/core/src`. Both were re-run in the form above, on three named files, with the same eight failures plus Phase 68's two.
- The report's Truth 4 pathspec `scripts` selects every file under the directory, so its emptiness claim was not vacuous; it was true of the range the report names and is replaced above by the comparison of the budget block it was about.
- The report's deferred review items IN-02 (two behaviours on a non-idempotent in-process accessor, neither stated nor pinned) and IN-03 (the mutation scorer's `compare` is weaker than its header) went to the milestone audit. Phase 68 pinned the two behaviours IN-02 names as U30 (a `_tag` that answers differently on its second read) and U31 (an accessor that deletes a later own key). `66-mutation.mjs` was changed by `35597a5c` (`fix(68-09)`) to match a mutant by status, mutator, replacement and its line carried through `git diff -U0`, counted as a multiset, which is IN-03's fix. The staleness check does not list `66-mutation.mjs`, because the report does not cite it; that script was not re-run here.
- The report records no validation file; none exists.

**Verdict:** passed
