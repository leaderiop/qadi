---
phase: QD-66-the-decoder-reads-only-what-it-declares
fixed_at: 2026-11-20T23:50:00Z
review_path: .planning/phases/QD-66-the-decoder-reads-only-what-it-declares/66-REVIEW.md
iteration: 1
findings_in_scope: 5
fixed: 5
skipped: 0
status: all_fixed
---

# Phase QD-66: Code Review Fix Report

**Fixed at:** 2026-11-20
**Source review:** `.planning/phases/QD-66-the-decoder-reads-only-what-it-declares/66-REVIEW.md`
**Iteration:** 1

**Summary:**
- Findings in scope: 5 (WR-01, IN-01, IN-04, IN-05, IN-06; orchestrator-selected)
- Fixed: 5
- Skipped: 0
- Left for the milestone audit, by the orchestrator: IN-02, IN-03

`workflow.use_worktrees` is `false`, so every edit and commit landed in the main checkout. The gates below ran there.

## Fixed Issues

### WR-01: INV-QD-097 still opens with an unscoped "never throw, whatever they are given"

**Files modified:** `spec/invariants.md` (Rev 1.164 to 1.165, through `spec-revise`)
**Commit:** a25de426
**Applied fix:** Rewrote the first paragraph of INV-QD-097. `encodeSinkRecord` and `encodeSinkRecordString` never throw whatever they are given. `decodeSinkRecord` and `decodeSinkRecordString` never throw on any JSON text or JSON value, and `decodeSinkRecordString` is total for every input because it takes text. The "no adapter lets one record end a feed" clause now rests on what holds: each adapter encodes a record or decodes what a store or a wire returned, which is JSON text or a JSON value. A closing sentence says that on an in-process value an own accessor the decoder reads and that throws is thrown out of `decodeSinkRecord`. It names the declared top-level accessor, and one the depth guard or the strict decode reads under a kept value, one level down included (INV-QD-377). No title changed, so no anchor changed.
**Status:** fixed: requires human verification (a wording change to a claim about behaviour).

### IN-01: "a union's `_tag` is read twice" while the code gates on the flattened member count

**Files modified:** `spec/behaviors/08-serialization.md` (Rev 1.7), `spec/invariants.md` (INV-QD-377, same Rev 1.165 entry), `spec/decisions/170-an-envelope-states-its-unknown-key-policy-at-its-decoder.md` (Rev 1.2, D-19 and the amendment), `spec/traceability.md` (Rev 1.232, the INV-QD-377 row), `spec/README.md` (the CCR-QD-457 row), `.changeset/core-decoder-reads-declared-keys.md`, `packages/core/src/UntrustedDecode.ts`, `packages/core/src/EnvelopeKeys.ts`
**Commits:** a25de426 (spec and changeset), 179285d1 (src comments)
**Applied fix:** Every text now says `_tag` is read to choose a member only when the schema flattens to more than one member, and then it is read twice (once to choose, once as a kept value). A schema that flattens to one member, a one-object schema or a union of one, chooses no member: a declared `_tag` is read once, as a kept value, and an undeclared `_tag` accessor is never invoked. A grep of `spec/`, `AGENTS.md`, `.changeset` and `packages/core/src` found no other occurrence (AGENTS.md §7a has none). `SinkCodec.ts:520` says "the union's `_tag` twice" of the record wire, which is a true union of more than one member, so it was left as it is. I added no U-test for the one-member union, which the review called optional.
**Status:** fixed: requires human verification (a wording change to a MUST).

### IN-04: the ADR quotes the bench gate's statistic without naming it

**Files modified:** `spec/decisions/170-an-envelope-states-its-unknown-key-policy-at-its-decoder.md`, `spec/README.md` (the CCR-QD-457 row)
**Commit:** a25de426
**Applied fix:** The ADR and the CCR row now say the gate is on the median of per-run minima, with the 5% band and the +2% geometric mean taken over those deltas. They say the p50 and the mean of each workload are recorded beside it, decide nothing, and are held in the phase's `66-BENCH.md` and `bench/final/analysis.tsv`. That is how `66-BENCH.md` itself puts it: it points to `analysis.tsv` for the p50 and mean figures. I wrote it that way so the text does not claim more than `66-BENCH.md` holds. The `ab.sh` arm-order change the review suggested was not in scope and was not made. It would also be a phase-artifact change, not a spec text.

### IN-05: ragged comment wraps

**Files modified:** `packages/core/src/UntrustedDecode.ts`, `packages/core/src/EnvelopeKeys.ts`
**Commit:** 2b8e3249
**Applied fix:** Re-wrapped the `UntrustedDecoderOptions` doc, the `project` doc and the `envelopeKeysOf` doc to about 90 columns. Comment-only.

### IN-06: a test helper named `Either`

**Files modified:** `packages/core/test/UntrustedDecode.test.ts`
**Commit:** 5435e2fc
**Applied fix:** Renamed both `Either` helpers (one per `describe`) and their 9 call sites to `TwoMembers`. 11 lines changed, none added or removed. The three affected test files still run 149 tests, all green, the same count the review reported.

## Bench-of-record proof

The bench of record (66-03) stands only if no executable token changes. Nothing changed in `package.json`, `scripts/` or `packages/*/bench`. `git diff --name-only 778187a9 HEAD -- packages scripts package.json` lists exactly:

- `packages/core/src/EnvelopeKeys.ts`
- `packages/core/src/UntrustedDecode.ts`
- `packages/core/test/UntrustedDecode.test.ts`

`SinkCodec.ts` was not touched. I compared the two src files' token streams, with comments and whitespace dropped. The script is a TypeScript `createScanner` with `skipTrivia`, at `/private/tmp/claude-502/-Users-mohammadalmechkor-Projects-Perso-qadi/e439729a-b263-43f3-8b1d-7b4efda83c90/scratchpad/tok.mjs`. It compared the review-time version (`778187a9`) with HEAD:

- `UntrustedDecode.ts`: token streams identical (`cmp` exit 0).
- `EnvelopeKeys.ts`: token streams identical (`cmp` exit 0).

## Verification

Run in the main checkout, not a worktree, after the last commit:

| Check | Result |
| --- | --- |
| `bash spec/scripts/verify-traceability.sh --strict` | PASS 21, FAIL 0, SKIP 0 |
| `node scripts/spec-revise.mjs --check` | every Revision matches its newest history entry |
| `node scripts/check-doc-examples.mjs` | 117 blocks compile |
| `node scripts/check-dod-table.mjs` | 25 steps match, 151 references resolve |
| `node scripts/check-api-surface.mjs` | 939 exports documented |
| `node scripts/check-house-style.mjs` | 560 files clean |
| `node_modules/.bin/oxlint` on the two src files and the test file | exit 0, no output |
| `pnpm vitest run --project core` on `UntrustedDecode`, `UntrustedSeams`, `StoredEnvelope` | 3 files, 149 tests passed |
| `$TMPDIR/qd66/ccr-row.mjs <phase_base>` | 6 documents cited at their current Revision |

The `ccr-row.mjs` revisions are:

| Document | Revision |
| --- | --- |
| `spec/README.md` | 1.268 |
| `spec/behaviors/08-serialization.md` | 1.7 |
| `spec/decisions/170-an-envelope-states-its-unknown-key-policy-at-its-decoder.md` | 1.2 |
| `spec/invariants.md` | 1.165 |
| `spec/overview.md` | 1.130 (unchanged) |
| `spec/traceability.md` | 1.232 |

`pnpm check:pr` was not run, as instructed.

## Notes

- WR-01, IN-01 and IN-04 share `spec/invariants.md`, the ADR and the CCR-QD-457 row, and each document carries one revision entry. So the three are in one commit (a25de426), not three. The src comment fixes and the test rename are separate commits.
- Nothing was staged from `.planning/config.json`, `.agents/`, `.codex/` or any `*.iter*.md`.

---

_Fixed: 2026-11-20_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
