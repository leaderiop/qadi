---
phase: QD-38-the-sink-wire-version-stated-once
verified: 2026-11-14T05:25:00Z
status: passed
score: 4/4 roadmap success criteria verified (plus all plan must-haves)
covered_files:
  - ".planning/phases/QD-38-the-sink-wire-version-stated-once/38-01-PLAN.md"
  - ".planning/phases/QD-38-the-sink-wire-version-stated-once/38-01-SUMMARY.md"
  - ".planning/phases/QD-38-the-sink-wire-version-stated-once/38-02-PLAN.md"
  - ".planning/phases/QD-38-the-sink-wire-version-stated-once/38-02-SUMMARY.md"
  - ".planning/phases/QD-38-the-sink-wire-version-stated-once/38-03-PLAN.md"
  - ".planning/phases/QD-38-the-sink-wire-version-stated-once/38-03-SUMMARY.md"
  - ".planning/phases/QD-38-the-sink-wire-version-stated-once/38-04-PLAN.md"
  - ".planning/phases/QD-38-the-sink-wire-version-stated-once/38-04-SUMMARY.md"
  - "packages/core/src/SinkCodec.ts"
  - "packages/core/src/SinkWire.ts"
  - "packages/core/test/SinkCodec.test.ts"
  - "packages/core/test/SinkWire.tst.ts"
covered_digest: "v4:sha256:66110f01c61dbcc13f4adc248607b555e7b001bf3ffdd4844550236fd18c660f"
behavior_unverified: 0
overrides_applied: 0
---

# Phase QD-38: The sink wire version stated once - Verification Report

**Phase Goal:** The sink record wire's version number is written once, in `SinkWire.ts`, and the schema literals, the encoder, the decoder's check, `WIRE_VERSIONS` and `WireVersion` all derive from it, so retyping it cannot leave half the codec behind.
**Verified:** 2026-11-14
**Status:** passed
**Re-verification:** No, initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | `WIRE_VERSION` is the only place the version number appears in `packages/core/src/Sink*.ts` code, and `WIRE_VERSIONS`, `WireVersion`, both schema literals, the encoder and the decoder check derive from it | VERIFIED | Code-only scan (comment lines dropped) of `Literal(2)`, `version: 2`, `= 2`, `2 as const`, `[2]` over `Sink*.ts` returns exactly `SinkWire.ts:43: export const WIRE_VERSION = 2 as const;`. `SinkWire.ts` has `WIRE_VERSIONS = [WIRE_VERSION] as const` and `WireVersion = (typeof WIRE_VERSIONS)[number]`. `SinkCodec.ts:145,153` `Schema.Literal(WIRE_VERSION)`; `:223,225` `version: WIRE_VERSION` after the record spread; `:459` `isReadVersion = Schema.is(Schema.Literals(WIRE_VERSIONS))` used at `:477`; the private constant and the `WireVersion` import are gone. |
| 2 | Retyping the version without editing the codec fails to compile (tstyche pin) and a retype-to-3 experiment is recorded | VERIFIED | `packages/core/test/SinkWire.tst.ts` pins `typeof WIRE_VERSION` = `2`, `WireVersion` = `2`, `typeof WIRE_VERSIONS` = `readonly [2]`, and both `SinkRecordJson` members' `version` = `2`, all hand-written expectations, imported through the barrel. 38-01-SUMMARY records the base retype (compiles half-retyped, encoder keeps writing 2, decoder refuses own output, goldens stay green) and 38-02-SUMMARY records the after-conversion retype (src compiles, tstyche 5/5 and goldens red); both reverted (`git status` clean for `packages`). |
| 3 | Wire bytes unchanged (byte golden with key order, committed on the base) and every other version still `UnsupportedVersion({ version, supported })` | VERIFIED | The version-2 goldens (`V2_DECIDED_ALLOW`, `V2_OBLIGATIONS`) predate the phase and are hand-written; `git diff` of `SinkCodec.test.ts` since base shows additions only in the written-out describe (no golden edited), and `fixtures/sinkWireV2.ts` is not in the diff. `test(38-01)` adds five written-out rows (`supported: [2]`: absent, 1, 3, string "2", and 2 decodes). `SinkCodec.test.ts` run by me: 156/156 pass. Key order preserved: `Schema.Literal(WIRE_VERSION)` and `version: WIRE_VERSION` sit in the slots the literals held. |
| 4 | INV-QD-096 states the codec reads what it writes (amended, no duplicate); `spec/overview.md` row and `@qadi/core` minor changeset exist and record the narrowing | VERIFIED | `spec/invariants.md` Rev 1.119 appends the read-what-it-writes paragraph to INV-QD-096 in place (heading unchanged, Source and Related extended, no new INV). `spec/overview.md` names `WIRE_VERSION` at both locations and states `WIRE_VERSIONS` is `readonly [2]`. `.changeset/sink-wire-version-stated-once.md` is `"@qadi/core": minor`, records the narrowing as source-compatible, no Breaking marker. |

**Score:** 4/4 roadmap truths verified; 0 present-but-behavior-unverified.

Plan-level must-haves checked beyond the roadmap: commit order (`chore(38-01)` baseline alone, then `test(38-01)`, then `refactor(38-02)` src, then `test(38-02)` tst alone, all verified from `git log`); ADR-QD-151 exists (Document ID QADI-ADR-151, Rev 1.0, amends ADR-QD-096), CCR-QD-429 row present in `spec/README.md` (Rev 1.172), BEH-QD-199 listing restated; packages diff since base is limited to `SinkWire.ts`, `SinkCodec.ts`, `SinkCodec.test.ts`, `SinkWire.tst.ts`; `AGENTS.md`, `scripts/`, manifests and lockfile have no diff since base (no budget changed).

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `packages/core/src/SinkWire.ts` | one `WIRE_VERSION`, derived read set and type | VERIFIED | exists, substantive, exported through the barrel (tst imports it from `../src/index.ts`) |
| `packages/core/src/SinkCodec.ts` | codec reads the constant | VERIFIED | imports `WIRE_VERSION, WIRE_VERSIONS`; four use sites plus `supported: WIRE_VERSIONS` in the refusal |
| `packages/core/test/SinkWire.tst.ts` | compile-time pin | VERIFIED | five tests, run inside `check:pr` |
| `packages/core/test/SinkCodec.test.ts` | goldens + written-out rows | VERIFIED | 156 cases green |
| `38-mutation-base.json`, `38-mutation-after.json` | per-file Stryker comparison | VERIFIED | see below |
| ADR-QD-151, `index.yaml`, ADR-QD-096 amendment, INV-QD-096, BEH-QD-199, overview, traceability, README CCR row, changeset | records | VERIFIED | all present in the diff; spec gates pass inside `check:pr` |

### Key Link Verification

| From | To | Via | Status |
|------|----|-----|--------|
| `SinkCodec.ts` | `SinkWire.ts` | value import `DecodeRefusal, WIRE_VERSION, WIRE_VERSIONS` (`:86`) | WIRED |
| `SinkWire.tst.ts` | `index.ts` | type imports through the barrel | WIRED |
| `spec/README.md` | ADR-QD-151 | CCR-QD-429 row names the ADR file | WIRED (spec gates green) |

### Data-Flow Trace (Level 4)

Not applicable: no dynamic rendering. The encode-to-bytes-to-decode path is exercised by the golden and round-trip tests, which pass.

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Codec goldens, written-out rows, round trips | `pnpm exec vitest run --project core packages/core/test/SinkCodec.test.ts` | 156 passed | PASS |
| Single-constant scan | `/usr/bin/grep` over `Sink*.ts`, comments dropped | one line, `SinkWire.ts:43` | PASS |
| Mutation, same invocation as base, run fresh by me after the post-review test commits | `pnpm exec stryker run stryker.config.mjs --mutate 'packages/core/src/SinkCodec.ts,packages/core/src/SinkWire.ts'` | SinkCodec.ts 97.52% (157/161), above base 96.34%; SinkWire.ts has no scored mutant (reads 1, as at base); break threshold 80 met | PASS |

### Probe Execution

SKIPPED: the phase declares no `probe-*.sh`.

### Fresh full gate

`pnpm check:pr < /dev/null` run by me on the current HEAD (including the three post-review commits `4fd82be6`, `df5811e1`, `24dabf2a`): exit 0, 16 of 17 steps ran, the skipped step is `pnpm mutation` only (covered by the scoped Stryker run above). The tree was clean for packages, spec, scripts, `.changeset` and `AGENTS.md` before and after.

### Requirements Coverage

All twelve IDs in the phase's PLAN frontmatter (38-01: WIRE-02, WIRE-03, WX-02, WX-05, WX-06; 38-02: WIRE-01, WIRE-02, WIRE-03, WX-04, WX-06; 38-03: WIRE-04, WIRE-05, WX-02, WX-03, WX-07; 38-04: WX-01 to WX-07, WIRE-01, WIRE-05) are in REQUIREMENTS.md and marked complete, and every ID in the phase's ROADMAP requirement list is claimed by at least one plan. No orphans.

| Requirement | Status | Evidence |
|-------------|--------|----------|
| WIRE-01 | SATISFIED | Truth 1 |
| WIRE-02 | SATISFIED | Truth 2 (tstyche pin plus both recorded retype experiments) |
| WIRE-03 | SATISFIED | Truth 3 |
| WIRE-04 | SATISFIED | INV-QD-096 amended in place, no new INV |
| WIRE-05 | SATISFIED | overview rows, minor changeset, narrowing recorded; `PAYLOAD_VERSION` and `ARCHIVE_VERSION` files are outside the diff |
| WX-01 | SATISFIED | fresh `check:pr` exit 0 |
| WX-02 | SATISFIED | only ARCH-85, ADR-QD-151, CCR-QD-429 used; spec id gates pass |
| WX-03 | SATISFIED | overview names `WIRE_VERSION`; gate 13 inside `check:pr` green |
| WX-04 | SATISFIED | no budget file, `AGENTS.md` or script changed; added source lines carry no `as` (other than `as const`), `!`, `any`, `switch`, `fnUntraced`, `async`, console or clock; house-style gate green |
| WX-05 | SATISFIED | SinkCodec.ts 0.9634 base, 0.9752 after (re-measured fresh); SinkWire.ts 1 and 1; core coverage thresholds enforced inside `check:pr` |
| WX-06 | SATISFIED | baseline and goldens/written-out rows committed before any `packages/*/src` change |
| WX-07 | SATISFIED | no break; changeset is minor with no Breaking marker; `upgrading.md` and CHANGELOGs untouched; no release commit |

### Anti-Patterns Found

None. No `TBD`/`FIXME`/`XXX` introduced in the four changed package files; no stubs.

### Human Verification Required

None. The one behavior-dependent claim (retyping fails loudly) rests on a tstyche pin that `check:pr` runs and on two recorded, reverted experiments, and is not a runtime state-transition invariant.

### Gaps Summary

None. Minor note, not a gap: the `38-mutation-after.json` in the phase directory was measured before the review-fix test commits; the fresh run above (97.52%) supersedes it and is not lower.

---

_Verified: 2026-11-14_
_Verifier: Claude (gsd-verifier)_
