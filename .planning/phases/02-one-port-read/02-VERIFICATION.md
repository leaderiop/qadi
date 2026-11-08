---
phase: 02-one-port-read
verified: 2026-11-08T04:20:00Z
status: human_needed
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
covered_digest: "v4:sha256:2497ee2b510448d3bee7ed4085613a4a42ddde14ce7053f7cd6f023672c2ae2f"
behavior_unverified: 0
overrides_applied: 0
human_verification:
  - test: "Run `pnpm check:pr` end to end on a machine where `playwright install --with-deps chromium` can run (CI, or a host with sudo)."
    expected: "Exit 0 in one run."
    why_human: "The sandbox cannot satisfy `playwright install --with-deps` (sudo password). Every other step of `check:pr` was run separately by the verifier and passed, and the example's e2e suite (30 tests) passed with the already-installed chromium, so only the single-run exit is unproven. Phase 01 left the same item."
  - test: "Decide WR-02: accept the three hand-written pre-validation question objects in askActedForResource, askRelationship and askSignature as the recorded D-07 trade-off, or derive them from `pose`."
    expected: "A recorded decision. Accepted means ADR-QD-109's wording is enough. Derived means a follow-up edit to PortAccess.ts."
    why_human: "Whether 'stated once' is satisfied is a judgment call. The success-path projection is stated once, but the local failure-path span restates the question by hand (`scope: \"Resource\"` is hard-coded where `pose` derives it)."
  - test: "Decide WR-01: should `disclose` run inside `catchPortDefect`?"
    expected: "A recorded decision. If yes, a signature store returning a malformed list must give the port's typed error on a served read, not a defect."
    why_human: "This is a narrow regression against a type-violating store. It conflicts with `answerRemotely`'s documented 'never fails' contract, but it is not part of the phase's stated goal."
---

# Phase 02: One port read Verification Report

**Phase Goal:** A port's span projection is stated once on its description, and every local and served read shares one body, so local and served spans cannot diverge.
**Verified:** 2026-11-08
**Status:** human_needed
**Re-verification:** No, initial verification

## Goal Achievement

The goal is achieved in the code. Each port description carries `attributes.pose` and a two-argument `attributes.disclose`. `PortAccess.ts` has one plain `readPort` body that all six local reads and `servePortRead` run. The wire's `spanQuestion`, `spanAnswer` and `PortWireSpan` are gone. The signature requirement crosses the wire, so a remote signature ask leaves a served span equal to the local one. Three warnings and one environment-only item remain, listed below.

### Observable Truths (ROADMAP success criteria)

| # | Truth | Status | Evidence |
| - | ----- | ------ | -------- |
| 1 | Served and local signature reads of the same question leave identical span attributes (including `meaning`, `signerRole`, `matched`); `onFile` is on neither | VERIFIED | `signatureSpan.pose` and `.disclose` in `SignatureHistory.ts:140-153`. `readPort` annotates `pose(args)` plus `interpreter`, then `disclose(answer, args)`, for both interpreters. `PortAccess.test.ts` has a per-port table (lines 310-540) asserting local equals served, and the signature case at line 258. `PortRemote.test.ts:277-313` runs a real `askRemotely`/`answerRemotely` round trip and asserts `qadi.meaning` and `qadi.signer_role` on the served span. `signatureWire` carries `meaning` and `signerRole` as optional keys. The 6 Port test files pass (303 tests). |
| 2 | No port module's `wire` block declares `spanQuestion` or `spanAnswer` | VERIFIED | `grep -rn "spanQuestion\|spanAnswer\|PortWireSpan" packages/*/src packages/*/test apps` returns nothing. In `spec/overview.md` the only match is a Change History line (line 13). |
| 3 | `PortAccess.ts` has one generic read body, and each `ask*` holds only argument shaping and its own validation | VERIFIED (with warning WR-02) | `readPort` (`PortAccess.ts`) is the only place that annotates, counts, invokes, catches and annotates the answer. All six reads and `servePortRead` call it. Three reads (`askActedForResource`, `askRelationship`, `askSignature`) still build the question by hand for the annotate-before-validate step. That step is D-07 and ADR-QD-077 behaviour and is pinned by tests, but it is a second statement of the question. |
| 4 | Traced span names are unchanged and UNTRACED_BUDGET is unchanged | VERIFIED | Every read is still `Effect.fn(<port>.span)`. `readPort` opens no span. `node scripts/check-house-style.mjs` reports "397 file(s) clean (3 declared switch(es))". No new `fnUntraced`, `as`, `any`, `!`, `switch`, `async` or `console` in the `packages/*/src` diff since `9b5b880` (the only matches are comments). |
| 5 | `pnpm check:pr` is green; ADR-QD-109, CCR-QD-386 and a changeset recorded | VERIFIED (single-run exit unconfirmed, see Human Verification) | ADR file `spec/decisions/109-...md` exists. The CCR-QD-386 row is in `spec/README.md`. INV-QD-244 exists. `.changeset/one-port-read.md` exists, and the ARCH-31 changeset no longer announces `PortWireSpan`. Each step of `check:pr` was run by the verifier: typecheck, lint, circular, test:tstyche, coverage, test:bdd, spec:examples, spec:verify:strict, spec:gates, spec:claims, spec:api, spec:package, spec:website-examples, website, spec:publish and `spec-revise --check` all exit 0. The example's typecheck, test and build pass and its 30 Playwright tests pass. `pnpm example` fails only at `playwright install --with-deps` (sudo). |

**Score:** 5/5 truths verified, 0 behavior-unverified. The behavior-dependent truths (served throw becomes a typed error, missing resource id still leaves a span, call counts per interpreter) each have a passing named test in `PortAccess.test.ts`.

### Plan-level must-haves not covered by the success criteria

| Truth | Status | Evidence |
| ----- | ------ | -------- |
| A served read whose store throws is the port's typed error, not a defect | VERIFIED | `readPort` calls the store inside `Effect.flatMap(d.service, ...)` under `catchPortDefect`. `PortAccess.test.ts:289` and the per-port "throws" rows pass. |
| Signature key is injective over the requirement | VERIFIED | `signatureHistoryPort.key` is over `[subjectId, resourceId, meaning, signerRole]`. `PortRemote.test.ts` and `PortConformance.test.ts` pass. |
| A resource-scoped read with no usable id leaves its question, fails `MissingResourceId`, counts no port call (D-07) | VERIFIED | `PortAccess.test.ts:545-593` passes. |
| `PortWire` is JSON only | VERIFIED | `PortWire.ts` and `PortWireEncode.ts` carry no span member. |

### Required Artifacts

| Artifact | Status | Details |
| -------- | ------ | ------- |
| `packages/core/src/PortAccess.ts` (`readPort`) | VERIFIED | Substantive and wired: six reads and `servePortRead` call it. |
| `packages/core/src/PortSpan.ts` (`pose`, two-argument `disclose`) | VERIFIED | Present on `PortSpanAttributes` and `PortSpanAttributesLike`. Implemented in all five port descriptions. |
| `packages/core/src/SignatureMatch.ts` | VERIFIED | 26 lines. Used by `askSignature` and the signature `disclose`. |
| `packages/core/test/PortAccess.test.ts` | VERIFIED | The per-port table calls `servePortRead`. |
| ADR-QD-109, index, INV-QD-244, README CCR row, overview, changeset | VERIFIED | Present. `spec:verify:strict`, `spec:api` and `spec-revise --check` are green. |

### Key Link Verification

| From | To | Status |
| ---- | -- | ------ |
| `readPort` | each description's `attributes.pose`/`disclose` | WIRED (`PortAccess.ts`, `readPort` body) |
| `servePortRead` | `readPort(d, "remote", args)` under `Effect.withSpan(d.span)` | WIRED |
| `askRemotely`/`answerRemotely` | `signatureWire` carrying the requirement | WIRED (round trip in `PortRemote.test.ts`) |
| `spec/overview.md` | `packages/core/src/index.ts` | WIRED (gate 13 passes, 861 exports documented) |

### Data-Flow Trace (Level 4)

| Artifact | Data | Source | Real data | Status |
| -------- | ---- | ------ | --------- | ------ |
| Served signature span | `qadi.meaning`, `qadi.signer_role`, `qadi.matched` | The wire question's requirement, and the store's signature list through `disclose` | Yes, shown by the `PortRemote.test.ts` round trip | FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
| -------- | ------- | ------ | ------ |
| Port tests | `pnpm vitest run` over the six `Port*` test files | 6 files, 303 tests pass | PASS |
| Full coverage run | `pnpm coverage` | exit 0; statements 99.06%, branches 96.75% | PASS |
| BDD | `pnpm test:bdd` | exit 0 | PASS |
| House style, API surface, spec revise | the three scripts | all clean | PASS |
| Example e2e | `pnpm test:e2e` in `examples/nextjs-newsroom` | 30 passed | PASS |

### Probe Execution

No phase-declared probes. Step 7c does not apply.

### Requirements Coverage

| Requirement | Source Plan | Status | Evidence |
| ----------- | ----------- | ------ | -------- |
| PORT-01 | 02-01, 02-02 | SATISFIED | `pose`/`disclose` on every description (`PortSpan.ts`, the five port modules). |
| PORT-02 | 02-02 | SATISFIED | No `spanQuestion`, `spanAnswer` or `PortWireSpan` anywhere in `packages` or `apps`. |
| PORT-03 | 02-01 | SATISFIED | `readPort`. Note WR-01: `disclose` is outside the defect mapping. |
| PORT-04 | 02-01, 02-02, 02-03 | SATISFIED | The per-port table and the remote round trip. |
| PORT-05 | 02-01 | SATISFIED | Span names kept. House-style budgets are clean. |
| PORT-06 | 02-01 | SATISFIED | The per-port table in `PortAccess.test.ts`. |
| XC-01 | 02-04 | SATISFIED by parts. A single-run `check:pr` exit is not confirmed (environment). |
| XC-02 | 02-03, 02-04 | SATISFIED | ADR-QD-109, CCR-QD-386, README row, traceability, changeset. |
| XC-03 | 02-04 | SATISFIED | Gate 13 green. |
| XC-04 | 02-01, 02-02 | SATISFIED | Diff scan clean, house-style clean. |
| XC-05 | 02-04 | SATISFIED | Coverage run exits 0. |

All 11 IDs in the ROADMAP row appear in at least one PLAN's `requirements` and in REQUIREMENTS.md. No orphaned requirements. REQUIREMENTS.md's traceability table still lists PORT-01..06 and XC-01..05 as "Pending" (lines 154 and 162) while the checkboxes are `[x]`. This is a bookkeeping mismatch for the orchestrator to update.

### Anti-Patterns Found

No TBD, FIXME or XXX in the phase's changed source. No stubs.

| File | Pattern | Severity | Impact |
| ---- | ------- | -------- | ------ |
| `PortAccess.ts` (`askActedForResource`, `askRelationship`, `askSignature`) | Hand-written question object beside `pose` (WR-02) | Warning | A second statement of the question on the local failure path. `scope: "Resource"` is hard-coded where `pose` derives it. A new `pose` key would be missing from the failure span. |
| `PortAccess.ts` `readPort` | `disclose` and `pose` outside `catchPortDefect` (WR-01) | Warning | A signature store that returns a malformed list makes a served read die. Before the phase it was a clean `Unencodable` refusal. This is also true of `askSignature`'s own `signatureMatches` call locally. |
| `SignatureHistory.ts` doc comment and ADR-QD-109 consequences | "over-keying can only miss and deny" is false under `not(hasSignature(...))` (WR-03) | Warning | A devtools what-if that edits `meaning` or `signerRole` reads a miss as an empty list and can report an allow. It does not affect live enforcement. The claim in the ADR and the comment is incorrect. |
| Docs and comments (IN-01 to IN-05) | Stale `ADR-QD-NEXT` placeholders, a wrong "same type for all five ports" sentence, a ledger comment contradicting the new key, no unit test for the ledger key, version skew only in the changeset | Info | No effect on the goal. |

All eight review findings are recorded `open` in `02-REVIEW-DISPOSITION.md`. None is a must-have failure. WR-01 to WR-03 need a decision.

### Human Verification Required

1. **`pnpm check:pr` single-run exit 0.** Run it where `playwright install --with-deps chromium` can run. All components passed separately here, so this is expected to pass.
2. **WR-02 disposition.** Accept the three hand-written pre-validation question objects as the D-07 trade-off, or derive them from `pose`.
3. **WR-01 disposition.** Decide whether `disclose` should run under `catchPortDefect`. This is a one-line `Effect.tap` change, as the review suggests. WR-03 also needs a correction to the ADR and doc-comment claim.

### Gaps Summary

There are no gaps against the ROADMAP success criteria. Each of the five criteria holds in the code and is backed by passing tests or green gate scripts. The status is `human_needed`, not `passed`, because of the unconfirmed `check:pr` single-run exit (environment-limited) and three open review warnings that touch the goal's wording ("stated once", and "never a defect" for served reads). Neither fails the goal.

**Milestone note:** a phase-01 session holds the milestone claim, and STATE.md Current Position is a single slot. That is bookkeeping for the orchestrator and not a code finding.

---

_Verified: 2026-11-08_
_Verifier: Claude (gsd-verifier)_
