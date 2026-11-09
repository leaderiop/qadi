---
phase: 02-one-port-read
verified: 2026-11-09T22:35:00Z
status: passed
score: 5/5 must-haves verified
covered_files:
  - ".planning/phases/02-one-port-read/02-01-PLAN.md"
  - ".planning/phases/02-one-port-read/02-01-SUMMARY.md"
  - ".planning/phases/02-one-port-read/02-02-PLAN.md"
  - ".planning/phases/02-one-port-read/02-02-SUMMARY.md"
  - ".planning/phases/02-one-port-read/02-03-PLAN.md"
  - ".planning/phases/02-one-port-read/02-03-SUMMARY.md"
  - ".planning/phases/02-one-port-read/02-04-PLAN.md"
  - ".planning/phases/02-one-port-read/02-04-SUMMARY.md"
  - "packages/core/src/PortAccess.ts"
  - "packages/core/src/PortSpan.ts"
  - "packages/core/src/PortWire.ts"
  - "packages/core/src/SignatureHistory.ts"
  - "packages/core/src/SignatureMatch.ts"
  - "packages/core/test/PortAccess.test.ts"
  - "packages/core/test/PortRemote.test.ts"
  - "packages/devtools/src/model/Capture.ts"
  - "packages/devtools/test/model/Capture.test.ts"
covered_digest: "v4:sha256:994545ef775e726fafdc3bdb47fd92de4ed409d234d8718bdab2ec6ded1ea7c0"
behavior_unverified: 0
overrides_applied: 0
re_verification:
  previous_status: passed
  previous_score: 5/5
  gaps_closed: []
  gaps_remaining: []
  regressions: []
---

# Phase 02: One port read Verification Report

**Phase Goal:** A port's span projection is stated once on its description, and every local and served read shares one body, so local and served spans cannot diverge.
**Verified:** 2026-11-09 (milestone-close re-verification)
**Status:** passed
**Re-verification:** Yes. The previous passing report was stale because Phase 8 (removed `PortWire.asked`, added the `serving` facet) and Phase 9 (refusal vocabulary) edited `PortWire.ts`, `SignatureHistory.ts`, `PortRemote.test.ts`, `Capture.ts` and `Capture.test.ts`. I re-checked each truth against today's code.

## Goal Achievement

The goal still holds. Each port description carries `attributes.pose` and a two-argument `attributes.disclose`. `PortAccess.ts` has one plain `readPort` body. The six local reads and `servePortRead` all run it. The later phases reshaped the wire (the `asked` name moved to `serving.asked`, and refusal vocabulary moved) but did not put a span projection back on it. The `PortWire.ts` header comment still states that the wire "carries no span projection".

### Observable Truths

| # | Truth | Status | Evidence |
| - | ----- | ------ | -------- |
| 1 | Served and local signature reads of one question leave identical span attributes (`meaning`, `signerRole`, `matched`); `onFile` on neither | VERIFIED | `signatureSpan.pose` and `.disclose` in `SignatureHistory.ts` (about lines 140-155): `pose` carries `meaning` and `signerRole`, and `disclose` computes `matched` through `signatureMatches`. `signatureWire` carries the requirement as optional keys. `onFile` is only on `SignatureAnswer`, not a span field. Local and served run the same `readPort`. The round-trip tests in `PortRemote.test.ts` pass today. |
| 2 | No port module's `wire` block declares `spanQuestion` or `spanAnswer` | VERIFIED | `grep -rn "spanQuestion\|spanAnswer\|PortWireSpan" packages/*/src packages/*/test apps examples` returns nothing. |
| 3 | `PortAccess.ts` has one generic read body; each `ask*` has only argument shaping and its own validation | VERIFIED | `readPort` (`PortAccess.ts:182`) annotates the question from `d.attributes.pose(args)`, invokes the store, then annotates `d.attributes.disclose(answer, args)` inside the defect mapping. Call sites: `resolveAttribute` (235), `askActedAny` (288), `askActedForResource` (327), `askRelationship` (404), `askCustom` (422), `askSignature` (463), and `servePortRead` (496, `readPort(d, "remote", args)` under `Effect.withSpan(d.span)`). The three early D-07 annotations build their question with the description's own `pose` (lines 322, 398, 450). |
| 4 | Traced span names unchanged; `UNTRACED_BUDGET` unchanged | VERIFIED | `node scripts/check-house-style.mjs` reports 408 files clean (3 declared switches). `readPort` opens no span. |
| 5 | `pnpm check:pr` green; ADR-QD-109, CCR-QD-386 and a changeset recorded | VERIFIED | `spec/decisions/109-a-ports-span-is-projected-once-and-every-read-is-one-body.md` exists, `CCR-QD-386` is in `spec/README.md`, and `.changeset/one-port-read.md` and `.changeset/devtools-unseen-signature-fails.md` exist. GitHub Actions run 42676403473 at 127d6fa ran the full `pnpm check` green, and no non-`.planning` file has changed since. I ran `pnpm typecheck` (exit 0). |

**Score:** 5/5 truths verified, 0 behavior-unverified.

### Plan-level must-haves

| Truth | Status | Evidence |
| ----- | ------ | -------- |
| A served read whose store throws becomes the port's typed error, not a defect | VERIFIED | The store call runs inside the effect under `catchPortDefect` in `readPort`. Covered by `PortRemote.test.ts` and `PortServe.test.ts`, which pass. |
| A malformed store answer does not escape as a defect (WR-01) | VERIFIED | `disclose` runs in `Effect.tap` before `catchPortDefect` (`PortAccess.ts:198`). The `[null]`-store tests pass. |
| Signature key is injective over the requirement | VERIFIED | `PortRemote` and `PortConformance` tests pass. |
| A resource-scoped read with no usable id fails `MissingResourceId` and counts no port call (D-07) | VERIFIED | D-07 tests in `PortAccess.test.ts` pass. |
| An unseen SignatureHistory request in devtools replay fails closed (WR-04) | VERIFIED | `UNSEEN_REQUEST_IS_AN_OUTAGE` (`Capture.ts:180`) is a `PortName`-keyed record read by `unseenReply` (`:193`) and wired into the replay layer (`:229`). `Capture.test.ts` passes after the Phase 8/9 edits. |
| `PortWire` is JSON only | VERIFIED | No span member on the wire types. The Phase 8 serving facet sits on the description (`PortDescription.ts:120`), separate from the span projection. |

### Required Artifacts

| Artifact | Status | Details |
| -------- | ------ | ------- |
| `packages/core/src/PortAccess.ts` | VERIFIED | `readPort` is substantive and wired into 7 call sites. |
| `packages/core/src/PortSpan.ts` | VERIFIED | `pose` and `disclose` on the attributes type. |
| `packages/core/src/SignatureMatch.ts` | VERIFIED | Used by `disclose` and `askSignature`. |
| `packages/core/src/SignatureHistory.ts` | VERIFIED | `pose`/`disclose` and the requirement on the wire are still present after Phase 8. |
| `packages/devtools/src/model/Capture.ts` | VERIFIED | `unseenReply` wired into replay. |
| ADR-QD-109, INV-QD-244, CCR-QD-386, changesets | VERIFIED | Present. |

### Key Link Verification

| From | To | Status |
| ---- | -- | ------ |
| `readPort` | each description's `attributes.pose` / `disclose` | WIRED (`PortAccess.ts:190`, `:198`) |
| `servePortRead` | `readPort(d, "remote", args)` | WIRED (`:496`) |
| `askRemotely` / `answerRemotely` | `signatureWire` carrying the requirement | WIRED (round-trip test passes) |
| Early annotation in the three D-07 reads | the description's `pose` | WIRED |

### Data-Flow Trace (Level 4)

| Artifact | Data | Source | Real data | Status |
| -------- | ---- | ------ | --------- | ------ |
| Served signature span | `qadi.meaning`, `qadi.signer_role`, `qadi.matched` | Wire question requirement and the store's list through `disclose` | Yes, shown by the `PortRemote.test.ts` round trip | FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
| -------- | ------- | ------ | ------ |
| Port and capture tests | `pnpm vitest run` (from the repo root) on `PortAccess`, `PortRemote`, `PortServe`, `PortConformance` and `devtools/Capture` tests | 5 files, 325 tests pass | PASS |
| Typecheck | `pnpm typecheck` | exit 0 | PASS |
| House style | `node scripts/check-house-style.mjs` | 408 files clean | PASS |
| Full gate | CI run 42676403473 at 127d6fa, `pnpm check`, Node 22.12.0 | green; no non-`.planning` change since | PASS (not re-run by me) |

Running vitest from inside `packages/core` fails at collection with "Cannot read properties of undefined (reading 'config')" (the Vitest 5 project config only resolves from the repo root). That is how the runner is set up, not a code failure. It is an invocation detail for whoever re-runs this.

### Probe Execution

No phase-declared probes. Step 7c does not apply.

### Requirements Coverage

| Requirement | Source Plan | Status | Evidence |
| ----------- | ----------- | ------ | -------- |
| PORT-01 | 02-01, 02-02 | SATISFIED | `pose` and `disclose` on every description. |
| PORT-02 | 02-02 | SATISFIED | No `spanQuestion`, `spanAnswer` or `PortWireSpan` anywhere. |
| PORT-03 | 02-01 | SATISFIED | `readPort`, with `disclose` under the defect mapping. |
| PORT-04 | 02-01, 02-02, 02-03 | SATISFIED | Per-port table and signature round trip pass. |
| PORT-05 | 02-01 | SATISFIED | Span names kept; house-style budgets clean. |
| PORT-06 | 02-01 | SATISFIED | Per-port table in `PortAccess.test.ts` (`table(PORTS.X, ROWS.X)` for all five ports). |
| XC-01 | 02-04 | SATISFIED | `pnpm check` green in CI at 127d6fa. |
| XC-02 | 02-03, 02-04 | SATISFIED | ADR-QD-109, CCR-QD-386, changesets. |
| XC-03 | 02-04 | SATISFIED | Gate 13 is part of the green `pnpm check`. |
| XC-04 | 02-01, 02-02 | SATISFIED | House-style clean. |
| XC-05 | 02-04 | SATISFIED | Coverage is part of the green `pnpm check`. |

All 11 IDs in the ROADMAP row appear in a PLAN's `requirements` and in REQUIREMENTS.md. No orphans. Note: the REQUIREMENTS.md traceability row `XC-01..05 | All phases | Pending` (line 162) is a cross-phase row, and is not specific to this phase. `ENF-01..06` and `GATE-01..05` are also Pending there.

### Anti-Patterns Found

No TBD, FIXME or XXX in the covered files. No stubs. Open info-level review findings (stale `ADR-QD-NEXT` comment placeholders and similar) are recorded in `02-REVIEW-DISPOSITION.md`. They do not touch the goal.

### Human Verification Required

None. `02-UAT.md` is 3 of 3 pass and `02-SECURITY.md` has no open threats.

### Gaps Summary

No gaps. All five ROADMAP success criteria hold on today's code, and the later-phase edits to the covered files did not undo the single-projection, single-read-body property.

---

_Verified: 2026-11-09_
_Verifier: Claude (gsd-verifier)_
