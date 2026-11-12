---
phase: 30-one-strict-decode-module
verified: 2026-11-12T05:50:00Z
status: passed
score: 20/20 must-haves verified (5/5 roadmap success criteria, 15/15 requirements)
covered_files:
  - ".planning/phases/30-one-strict-decode-module/30-01-PLAN.md"
  - ".planning/phases/30-one-strict-decode-module/30-01-SUMMARY.md"
  - ".planning/phases/30-one-strict-decode-module/30-02-PLAN.md"
  - ".planning/phases/30-one-strict-decode-module/30-02-SUMMARY.md"
  - ".planning/phases/30-one-strict-decode-module/30-03-PLAN.md"
  - ".planning/phases/30-one-strict-decode-module/30-03-SUMMARY.md"
  - ".planning/phases/30-one-strict-decode-module/30-04-PLAN.md"
  - ".planning/phases/30-one-strict-decode-module/30-04-SUMMARY.md"
  - ".planning/phases/30-one-strict-decode-module/30-05-PLAN.md"
  - ".planning/phases/30-one-strict-decode-module/30-05-SUMMARY.md"
  - ".planning/phases/30-one-strict-decode-module/30-06-PLAN.md"
  - ".planning/phases/30-one-strict-decode-module/30-06-SUMMARY.md"
  - ".planning/phases/30-one-strict-decode-module/30-07-PLAN.md"
  - ".planning/phases/30-one-strict-decode-module/30-07-SUMMARY.md"
  - ".planning/phases/30-one-strict-decode-module/30-08-PLAN.md"
  - ".planning/phases/30-one-strict-decode-module/30-08-SUMMARY.md"
  - ".planning/phases/30-one-strict-decode-module/30-09-PLAN.md"
  - ".planning/phases/30-one-strict-decode-module/30-09-SUMMARY.md"
  - "AGENTS.md"
  - "packages/audit/src/AuditArchive.ts"
  - "packages/audit/src/AuditEntry.ts"
  - "packages/core/src/DecodeDepthGuard.ts"
  - "packages/core/src/JsonShape.ts"
  - "packages/core/src/Policy.ts"
  - "packages/core/src/PortRemote.ts"
  - "packages/core/src/PortWireEncode.ts"
  - "packages/core/src/SinkCodec.ts"
  - "packages/core/src/UntrustedDecode.ts"
  - "packages/react/src/HydrationEngine.ts"
  - "scripts/check-house-style.mjs"
covered_digest: "v4:sha256:cba0c06272a817daca38991ee8d2d728a018a4be33c2f620d304f82f22e701b1"
behavior_unverified: 0
overrides_applied: 0
advisory:
  - finding: "30-mutation-after.json predates the review fixes and no longer matches the shipped tree for four files"
    category: other
    reason: "Per-file Stryker runs on HEAD (this verification) give UntrustedDecode.ts 0.9355 (file says 0.9512), DecodeDepthGuard.ts 1.0 (0.9474), SinkCodec.ts 0.9634 (0.9657), HydrationEngine.ts 0.9776 (0.9773); JsonShape.ts (1.0) is not in the file. No file is below its base, so WX-05 holds; the committed artifact is simply stale. Regenerate it (or note it) in the next housekeeping commit."
    evidence_status: "reproduced on HEAD"
---

# Phase 30: One strict-decode module Verification Report

**Phase Goal:** A new untrusted-JSON seam gets the depth guard by default: the decode order (parse, depth guard, strict decode, closed refusal) is stated once in a core leaf, and each seam keeps only its error mapping.
**Verified:** 2026-11-12
**Status:** passed
**Re-verification:** No, initial verification (HEAD `0689238a`, which includes the 11 review-fix commits `b1299653..a460ebae`).

## Goal Achievement

The goal holds in the codebase. `packages/core/src/UntrustedDecode.ts` is the only module in `packages/*/src` that holds the strict decode options, the decode-depth constant and the guard-then-decode order. It is built with `untrustedDecoder(schema, { unwalked?, prepare? })`. The order inside `decode` is fixed by the code: `exceedsJsonDepth(walked(input))`, then `prepare`, then `strict(value)`. `decodeText` adds `JSON.parse` in front. The refusal union is closed (`NotJson | TooDeep | Malformed`, `Malformed` carrying the `SchemaError`). There is no export that lets a caller decode strictly without the guard, because the options are a module-private const and `exceedsJsonDepth` is not in the barrel (`packages/core/src/index.ts` exports only `UntrustedDecode.ts` of the family; `DecodeDepthGuard.ts` and `JsonShape.ts` are package-private).

### Observable Truths (ROADMAP success criteria)

| # | Truth | Status | Evidence |
| - | ----- | ------ | -------- |
| 1 | `UntrustedDecode.ts` is the only place holding the strict options, the depth constant and the guard-then-decode order; `Policy.ts` declares/re-exports none; a house-style rule refuses a second copy, both directions, and AGENTS.md states it | VERIFIED | Token scan of `packages/*/src` (`onExcessProperty`, `Schema.decode*`, `JSON.parse`, `exceedsJsonDepth`, `fromJsonString`) finds hits only in `UntrustedDecode.ts`, `DecodeDepthGuard.ts` (declaration) and the five budgeted exceptions (`AuditEntry.recordJsonOf`, `PortSpanEncode.spanStruct`, `SinkCodec.decodeStoredRecordString`, `SimulationForm.parseJson`, and `Policy.ts:916` which is the encode-only `Schema.fromJsonString(Policy)` used by `toJson`). `Policy.ts` has no `MAX_DECODE_DEPTH` or options declaration. `UNTRUSTED_DECODE_BUDGET` (check-house-style.mjs:631) is checked for undercount and overcount (lines 1548-1566), plus a names guard and an AGENTS.md section 7a table cross-check; AGENTS.md section 7a states the rule. `pnpm lint` (which runs the house-style script) is green. |
| 2 | Every untrusted JSON seam decodes through the leaf; the refusal-precedence tables written green on the base pass; too-deep reports as too-deep everywhere, audit included | VERIFIED | `untrustedDecoder(` is used by `Policy.ts:959`, `SinkCodec.ts:486` (`prepare: versionThenEnvelope`), `PortWireEncode.ts:125,127`, `PortRemote.ts:123`, `HydrationEngine.ts:197,226,238`, `AuditArchive.ts:258`, `AuditEntry.ts:153`. Each seam keeps a `Match.tagsExhaustive` mapping (`Policy.ts textFailure/valueFailure`, `asArchiveRefusal`, `asDecodeRefusal`, `payloadRefusalReason`, `entryDropReason`). Tables are `UntrustedSeams.test.ts` in core, react and audit plus devtools `ExplorerSessionRefusal.test.ts`; all pass inside the 4706-test coverage run. Flipped rows (the too-deep ones) are the intended DEC-04 changes. `ArchiveRefusal.TooDeep` exists (AuditArchive.ts:~153) and `DecodeRefusal.TooDeep` is raised for a too-deep row. |
| 3 | No public entry point decodes untrusted JSON without the guard: `PolicyFromJson` removed or routed, `UNTRUSTED_DECODE_OPTIONS` off the public surface, breaks recorded as Breaking in changesets and `upgrading.md` | VERIFIED | `PolicyFromJson` and `UNTRUSTED_DECODE_OPTIONS` appear nowhere in `packages/*/src` or tests (only in historical spec text, the changeset and `upgrading.md` migration tables). Changesets `.changeset/untrusted-decode-{core,react,audit}.md` open with `**Breaking.**`; devtools is a patch. `apps/website/.../reference/upgrading.md` has the "0.12: untrusted JSON is decoded through `untrustedDecoder`" section with before/after. No `package.json` version or `CHANGELOG.md` was touched since the base. |
| 4 | Every guarded seam has a test deeper than the bound; one property test (guard precedes decode, kind is a function of the input); `wireHazard`'s depth count equals `exceedsJsonDepth` (INV-QD-096) | VERIFIED | Core `UntrustedSeams.test.ts` has too-deep rows for `fromJson`, `fromJsonValue`, `decodeSinkRecord(String)`, `decodeQuestion`, `decodeAnswer` and the remote reply; react has hydration envelope, entry and boundary rows; audit has envelope and row rows. `UntrustedDecode.test.ts` carries the FastCheck property "TooDeep exactly when `exceedsJsonDepth`, on both sides of the bound, never throwing", with 255-258 drawn explicitly. `SinkCodec.test.ts` keeps `(refusalOf(record)?._tag === "TooDeep") === exceedsJsonDepth(wire, MAX_DECODE_DEPTH)`. |
| 5 | Hydration's `{ ...payload, entries: [] }`, the audit envelope `entries` and the row `record` are module options; per-entry attribution preserved | VERIFIED | `grep "entries: \[\]"` in `packages/react/src` is empty. `unwalked: ["entries"]` at `HydrationEngine.ts:226` and `AuditArchive.ts:258`; `unwalked: ["record"]` at `AuditEntry.ts:153`. `UnwalkedKey<A>` limits keys to `unknown` / `ReadonlyArray<unknown>` slots (type pins in `UntrustedDecode.tst.ts`, which `pnpm test:tstyche` ran green). Entries are still read one at a time from their own root (`EntryNotDecodable{ index, refusal }`, `entryDropReason`). |

**Score:** 5/5 roadmap truths verified; no truth is behavior-dependent without a passing test.

### PLAN `must_haves` prohibitions (spot-checked)

| Prohibition | Status | Evidence |
| ----------- | ------ | -------- |
| No catch of a throw from the strict decode (30-02) | VERIFIED | Only `JSON.parse` is wrapped (`Result.try` in `decodeText`); `strict(value)` is called bare. `UntrustedDecode.ts` doc says so, and `UNTRUSTED_DECODE_BUDGET` pins the `JSON.parse` count. |
| Too-deep never reported as `Malformed` at the module or any seam (30-02) | VERIFIED | The guard runs first and returns `TooDeep`; seam tables and the property test pin it. |
| Strict excess-property stance not weakened (30-02) | VERIFIED | `UNTRUSTED_DECODE_OPTIONS = { onExcessProperty: "error" }` applied in `untrustedDecoder`; excess-key rows are `Malformed` in all three tables. |
| Stored-record envelope not walked; unknown envelope key still ignored (30-03) | VERIFIED | `decodeStoredRecordString` parses itself (budgeted, 1 token); `record` goes through the guarded `decodeSinkRecord`. |
| One entry cannot poison its siblings (30-04, 30-05) | VERIFIED | `entries` is `unwalked` at the envelope; each entry has its own decoder root; react and audit tables have the sibling rows. |
| Nothing versioned/released/published (30-08) | VERIFIED | `git diff 055c8593 HEAD` touches no `packages/*/package.json` or `CHANGELOG.md`. |
| No gate loosened to pass (30-09) | VERIFIED | Only `[untrusted-decode]` additions to `check-house-style.mjs`, each with its AGENTS.md table row (checked by `[untrusted-decode-table]`); `30-mutation-base.json` unchanged since `c7e52f9f`. |

### Required Artifacts

| Artifact | Status | Details |
| -------- | ------ | ------- |
| `packages/core/src/UntrustedDecode.ts` (208 lines) | VERIFIED | Substantive, wired by 9 seams, exported in the barrel. |
| `packages/core/src/DecodeDepthGuard.ts` (35 lines) | VERIFIED | Array-backed stack walk, package-private; loop restructured by review fix WR-01, mutation score 1.0. |
| `packages/core/src/JsonShape.ts` (13 lines) | VERIFIED | One `isPlainObject`, shared by the guard, the leaf, `SinkCodec.ts` and `FieldPath.ts`; not in the barrel. |
| `packages/core/test/UntrustedDecode.test.ts`, `.tst.ts`, `UntrustedSeams.test.ts` (core, react, audit), `ExplorerSessionRefusal.test.ts` | VERIFIED | Present, substantive, run green. |
| `scripts/check-house-style.mjs` `UNTRUSTED_DECODE_BUDGET` + AGENTS.md section 7a | VERIFIED | Both directions, names guard, table cross-check. |
| `spec/decisions/143-...md`, `spec/overview.md` rows, BEH-QD-486..490, INV-QD-305..306, CCR-QD-421 | VERIFIED | Present; gates 11/12/13 and `spec:verify:strict` pass; no `*-NEXT` placeholder in shipped source, tests or features. |
| Changesets (core, react, audit, devtools) and `upgrading.md` | VERIFIED | See truth 3. |
| `30-mutation-after.json` | PRESENT, STALE | See advisory and WX-05. |

### Key Link Verification

| From | To | Via | Status |
| ---- | -- | --- | ------ |
| `Policy.fromJson` / `fromJsonValue` | the leaf | `policyDecoder.decodeText` / `.decode` through `Match.tagsExhaustive` | WIRED |
| `SinkCodec` | the leaf | `untrustedDecoder(SinkRecordWire, { prepare })`; order guard, version, project, decode kept | WIRED |
| `PortWireEncode`, `PortRemote` | the leaf | `untrustedDecoder(spec.question/answer)`, `untrustedDecoder(PortWireReply)` | WIRED |
| `HydrationEngine` | the leaf | envelope (`unwalked`, `prepare: checkVersion`), entry, policy decoders | WIRED |
| `AuditArchive`, `AuditEntry` | the leaf via `@qadi/core` | `unwalked: ["entries"]`, `unwalked: ["record"]` | WIRED |
| devtools paste box | `PolicyNotJson` | `ExplorerSession` maps the new arm; `ExplorerSessionRefusal.test.ts` | WIRED |

### Data-Flow Trace (Level 4)

Not applicable: no rendered dynamic data is introduced. Every refusal value originates from the actual decode result, not a static return.

### Behavioral Spot-Checks and Gates (run by me on HEAD)

| Check | Command | Result | Status |
| ----- | ------- | ------ | ------ |
| WX-01 full PR gate | `pnpm check:pr < /dev/null` (log `/private/tmp/claude-502/-Users-mohammadalmechkor-Projects-Perso-qadi/13b3a680-6983-4c4f-9cad-4ed79d71ff4f/scratchpad/check-pr.log`) | 16 of 16 steps ran, exit clean; coverage run 182 files / 4706 tests passed with thresholds holding; BDD 34 files / 568 tests; tstyche, circular, lint (house style), spec gates, api, package, example, website, publish all passed | PASS |
| WX-05 mutation, final tree | `stryker run --mutate UntrustedDecode.ts,DecodeDepthGuard.ts,JsonShape.ts,SinkCodec.ts` | 0.9355 / 1.0 / 1.0 / 0.9634 | PASS |
| WX-05 mutation, react | `stryker run stryker.react.mjs --mutate packages/react/src/HydrationEngine.ts` | 0.9776 (base 0.9693) | PASS |

Probes: none declared (SKIPPED, not a probe-based phase).

### Requirements Coverage

All 15 IDs are declared across the nine PLAN frontmatters, appear in REQUIREMENTS.md and the ROADMAP phase line, and none is orphaned.

| Requirement | Status | Evidence |
| ----------- | ------ | -------- |
| DEC-01 | SATISFIED | The leaf, its closed refusal, optional `prepare`, parse, guard, strict decode. Not bypassable: options are private, walk out of the barrel. |
| DEC-02 | SATISFIED | Truth 2. The inventory-found extra seam is the audit row and the devtools paste box (via `fromJson`). |
| DEC-03 | SATISFIED | `PolicyFromJson` removed; recorded Breaking. |
| DEC-04 | SATISFIED | `ArchiveRefusal.TooDeep`, `DecodeRefusal.TooDeep` for the row, `PayloadTooDeep`, `PolicyNotJson`; full closed unions written out, no fold into `Malformed`. |
| DEC-05 | SATISFIED | Options and constant in the leaf; `Policy.ts` holds neither; options private; `exceedsJsonDepth` out of the barrel; `MAX_DECODE_DEPTH` stays public with the reason in ADR-QD-143 and BEH-QD-059 restated. (Judgment call, defensible: BEH-QD-059 names it and `PolicyDecodeTooDeep` reports it.) |
| DEC-06 | SATISFIED | Truth 5. |
| DEC-07 | SATISFIED | Truth 4. |
| DEC-08 | SATISFIED | Truth 1. |
| WX-01 | SATISFIED | Re-run on HEAD, green. |
| WX-02 | SATISFIED | ADR-QD-143 (rev 1.2), CCR-QD-421, BEH-QD-486..490, INV-QD-305..306 present and in traceability; `spec:verify:strict` passes; no placeholder ids. That `next-id.mjs` was never run cannot be proven from the tree; the ids used are exactly the reserved ones. |
| WX-03 | SATISFIED | `spec/overview.md` names `untrustedDecoder`, `UntrustedDecoder`, `UntrustedDecoderOptions`, `UntrustedRefusal`, `UntrustedValueRefusal`, `UnwalkedKey`, `PolicyNotJson`; module column for `MAX_DECODE_DEPTH` corrected; gate 13 passes. |
| WX-04 | SATISFIED | Scan of added `packages/*/src` lines finds no new `as`/`!`/`any`/`switch`/`fnUntraced`/`async`/`console`/clock; all budgets in the house-style gate are green. |
| WX-05 | SATISFIED (artifact stale) | See below. |
| WX-06 | SATISFIED | See below. |
| WX-07 | SATISFIED | Truth 3. |

### WX-05 detail

Base scores are the floor; the verification re-measured the touched files on the final tree.

| File | Base | Committed after-file | HEAD (re-measured) |
| ---- | ---- | -------------------- | ------------------ |
| `UntrustedDecode.ts` (new) | - | 0.9512 | 0.9355 |
| `DecodeDepthGuard.ts` | 0.9474 | 0.9474 | 1.0 |
| `JsonShape.ts` (new) | - | absent | 1.0 |
| `SinkCodec.ts` | 0.9278 | 0.9657 | 0.9634 |
| `HydrationEngine.ts` | 0.9693 | 0.9773 | 0.9776 |
| `Policy.ts`, `PortWireEncode.ts`, `PortRemote.ts`, `AuditArchive.ts`, `AuditEntry.ts`, `ExplorerSession.ts` | per base file | as committed | unchanged except comments since the after-file (Policy, AuditEntry, ExplorerSession diffs are comment-only) |

No file fell. The committed `30-mutation-after.json` was written before the review fixes and is stale for four files and incomplete (no `JsonShape.ts`); it does not describe the shipped tree, but its numbers are not the evidence this verdict rests on. Recorded as an advisory, not a gap. `UntrustedDecode.ts` has no base (new file); 0.9355 has two surviving mutants at line 179 (`unwalked.size > 0` guard), equivalent-looking for plain-object inputs.

### WX-06 detail

The 30-09 flip-marker scan exits 1 on `56214374` and `b3435e58`; both are false positives. I read both diffs. `56214374` deleted only the `@qadi/core` import line (it gained `exceedsJsonDepth`) and added one new boundary row. `b3435e58` removed that import name again and replaced a three-line search for the admitted depth with the constant `MAX_DECODE_DEPTH - 2` plus an explanatory comment; the row's two `hydrate(...)` expectations are unchanged. The later review fix `d42e8de4` renamed titles of flipped rows (dropping "flipped in 30-0N (D-0N)" annotations) and rewrote file header comments to cite ADR-QD-143 and BEH-QD-486..489; the diff changes no `expect`/`assert` and keeps the row counts (18 / 41 / 20, devtools 52). The same scan would list that commit, again a false positive. Side effect worth knowing: the "which rows flipped" marker now lives only in the plan SUMMARYs and the commit messages, no longer in the test titles, so the in-tree audit trail for flips is thinner than the plan intended. The other modified test files (`DecisionWire`, `HydrationMetrics`, `Policy`, `SinkCodec`, `v4-api-smoke`, react and devtools `Hydration`) changed only import sources, the 8-to-9 reason count, and the intended `NotJson`/`PayloadTooDeep` expectations; each change is traceable to a stated behaviour change.

### Anti-Patterns Found

| File | Pattern | Severity | Impact |
| ---- | ------- | -------- | ------ |
| (none) | `TBD`/`FIXME`/`XXX`/`TODO` in modified source: none; plan-local ids (`D-0N`, `30-0N`) in `packages/*/src` or tests: none after `d42e8de4` | - | - |
| `spec/decisions/002-schema-derived-policy-adt.md` lines 62, 80 | still names `UNTRUSTED_DECODE_OPTIONS` as a live symbol (an accepted ADR body, not amended by ADR-QD-143) | Info | Historical text; ADR-QD-143 and its supersession note carry the correction. |
| `[untrusted-decode]` rule | token-based: a decode reached through an aliased named import of `effect/Schema`'s `decode*` would not match `Schema.decode\w*` | Info | The repo style forbids named imports from `effect` submodules (AGENTS.md section 1), so the namespace form is the only one the house style allows. |

### Human Verification Required

None. Every behavior-dependent truth (guard precedes decode, refusal kind is a function of the input, each seam's precedence) has a passing behavioral test in the coverage run, so nothing is left at present-but-unexercised.

### Gaps Summary

No gaps. The phase goal is achieved: the decode recipe exists once, in `UntrustedDecode.ts`; nine seams use it and keep only a total mapping; nothing public can decode untrusted JSON without the guard; a house-style budget (both directions, AGENTS.md section 7a) refuses a second copy; `pnpm check:pr < /dev/null` is green on the current HEAD. One housekeeping item: regenerate or annotate `30-mutation-after.json`, which predates the review fixes.

---

_Verified: 2026-11-12_
_Verifier: Claude (gsd-verifier)_
