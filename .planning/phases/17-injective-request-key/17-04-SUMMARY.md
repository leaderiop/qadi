---
phase: 17-injective-request-key
plan: 04
subsystem: core, devtools
tags: [port-key, result, fail-closed, capture, replay, mutation]

phase_base: 1a14899

requires: ["17-03"]
provides:
  - "`replyTable` keys a `Map<string, PortReply<A>>` by the key's text; a request with no key fails with the port's own typed error (cause: `describeKeyRefusal`), an entry with no key is left out"
  - "`signatureHistoryFromSignatures` groups by the key's text; a refused fixture entry fails every read and a refused query fails its own with `SignatureHistoryUnavailable`, never an empty list"
  - "devtools `capturing` passes a request with no key through to the live port unrecorded; `replayLayer` answers it `PortReply.fail(\"this <Port> request cannot be keyed: …\")`"
affects: [17-05, 17-06]

actuals:
  tasks: 3
  commits: 4

key-files:
  modified:
    - packages/core/src/PortDoubles.ts
    - packages/core/src/SignatureHistory.ts
    - packages/devtools/src/model/Capture.ts
    - packages/core/test/PortDescription.test.ts
    - packages/core/test/SignatureHistory.test.ts
    - packages/devtools/test/model/Capture.test.ts
    - packages/audit/test/SignatureLedger.test.ts

key-decisions:
  - "Applied 17-01 T1 (D-04) from `_DECISIONS.md`: \"Every port's unseen replay request is an outage (fail closed); `PortDescription.key` returns `Result<string, KeyRefusal>` (Breaking) — confirmed\". This plan handles only the `Result`; the unseen-request half (`UNSEEN_REQUEST_IS_AN_OUTAGE`, `unseenReply`) is untouched and stays 17-05's."
  - "The signature fixture's refusal branch is unreachable from typed input (a `SubjectId`/`ResourceId` pair is two strings, which always key). It is kept, fail closed, for an untyped caller; the doc comment says so, and a test pins what it answers through `signatureHistoryPort.failure` directly."

requirements-completed: [KEY-01, KEY-03]  # KEY-01: replay half (ARCH-65 Date vs ISO). XC-04/XC-06 are cross-cutting.

completed: 2026-11-10
status: complete
---

# 17-04: every key consumer branches on the Result

## Key consumers (re-derived on this tree before any edit)

`src` and `features/step-definitions` (`grep -rnE "[A-Za-z_]\.key\("`):

| Site | Owner |
|---|---|
| `packages/core/src/PortDoubles.ts:108-109` `replyTable` (build + lookup) | Task 2 |
| `packages/core/src/SignatureHistory.ts:331, :358` `signatureHistoryFromSignatures` (build + read) | Task 2 |
| `packages/devtools/src/model/Capture.ts:98` `capturing` | Task 2 |
| `packages/devtools/src/model/Capture.ts:229` `replayLayer` | Task 2 |

No hit in `features/step-definitions`. `SignatureLedgerTest.ts` is not a consumer:
`grep -cF "signatureHistoryPort.key" packages/audit/src/SignatureLedgerTest.ts` is `0` (it keys a
`MutableHashMap` by `ledgerKeyOf`). `PortRemote.ts` never calls `key`.

Tests (`packages/*/test`, `features`):

| Site | Owner |
|---|---|
| `packages/core/test/PortConformance.test.ts` (35 reads) | already through `keyText` (17-03) |
| `packages/devtools/test/model/Capture.test.ts:138, :265, :518, :550, :566, :666, :776` | Task 2: a test-local `keyText` |
| `packages/audit/test/SignatureLedger.test.ts:348` (`key(…) === key(…)`, always false on `Result`s) | Task 2: a test-local `keyText` |

Difference from `<interfaces>`: `PortDescription.test.ts:99` was already moved to `canonicalKey` by 17-03,
so it no longer appears. `SignatureLedger.test.ts:348` was not in `<interfaces>`. The orchestrator's
brief named it as a known breakage, and the change is test-only (it reads the key text), so it was
folded into Task 2 without stopping the plan.

## Task 2: consumers

- RED commit `11c117d`. New tests: `replyTable` fails a request with no key with
  `CustomPredicateError` and never answers it from an entry built from that same request
  (`PortDescription.test.ts`). The signature fixture's refusal answer, pinned through
  `signatureHistoryPort.failure` (`SignatureHistory.test.ts`). `capturing` passes a function-param
  request through unrecorded, identical to the uncaptured exit, with an empty `CustomPredicate` map.
  `replayLayer` fails it with `CustomPredicateError` `"this CustomPredicate request cannot be keyed: …"`
  (`Capture.test.ts`, describe "a request with no key (KEY-03)"). The existing hit tests were already red
  on the 17-03 tree: 44 failing across core, devtools, audit and testing, including audit
  `SignatureLedgerConformance` and testing `TestLayers` "resolves configured signatures", which
  17-03-SUMMARY did not list. The new replyTable and capture tests failed for the right reason: Success instead of
  Failure, and `CustomPredicate.size` 1 instead of 0.
- Fix commit `5331525`:
  - `PortDoubles.ts`: `new Map<string, PortReply<A>>(Arr.getSuccesses(entries.map(… Result.map(d.key(args), …))))`.
    The lookup is `Result.match(d.key(args), { onSuccess: table.get, onFailure: PortReply.fail(describeKeyRefusal(…)) })`.
  - `SignatureHistory.ts`: `Result.all` over the entries' keys, then a `Map<string, Array<Signature>>`.
    The read is `Result.flatMap(grouped, … pairKey(query …))` matched into `Effect.succeed` (a copy) or
    `Effect.fail(signatureHistoryPort.failure([query], describeKeyRefusal(refusal)))`. The doc comment
    now says the group is the key's injective text, not a `JSON.stringify`, and covers the fail-closed
    refusal and that typed input never reaches it.
  - `Capture.ts`: `capturing` matches the key: `Success` records as before, `Failure` calls through.
    `replayLayer` matches it before the lookup. `CapturedAnswers`' and `replayLayer`'s docs say a
    request with no key is never captured and always fails on replay.
- 17-02's ARCH-65 test (`-t "ARCH-65"`) passes: a Date param's captured allow no longer answers the
  ISO string's question. Before 17-03 that answer was a shared-key allow. On 17-03's tree it was a vacuous
  pass, because every lookup missed.

## Task 3: map-key gates

Gate 1 (key result as a collection key or `===` operand, `src`+`test`+`features`): **no output**.
Gate 2 (every `src` call site branches on the `Result` or binds a `const`): **no output**.

Site review (`src`, after the change):

| Site | Review |
|---|---|
| `SignatureHistory.ts:334` `const pairKey = … signatureHistoryPort.key(…)` | its `Result` goes to `Result.map` (build) and `Result.flatMap`/`Result.match` (read) only |
| `PortDoubles.ts:117` `Result.map(d.key(args), …)` | successes only, via `Arr.getSuccesses`, into a `Map<string, …>` |
| `PortDoubles.ts:121` `Result.match(d.key(args), …)` | success: `table.get(text)`, failure: typed `Fail` |
| `Capture.ts:106` `Result.match(d.key(args), …)` | success: `record(…, text, …)`, failure: live call, unrecorded |
| `Capture.ts:245` `Result.match(d.key(args), …)` | success: captured lookup and 17-05's untouched miss policy, failure: typed `Fail` |

## Mutation (XC-05)

A clean scoped Stryker run on the committed tree (`stryker.config.mjs --mutate`, `stryker.devtools.mjs --mutate`). No measurement patch was used.

| File | Base (`17-mutation-base.json`) | Now |
|---|---|---|
| PortDoubles.ts | 1.0000 | 1.0000 (36/36) |
| SignatureHistory.ts | 0.8452 | 0.9551 (85/89) |
| devtools Capture.ts | 1.0000 | 1.0000 (51/51) |

The first run had SignatureHistory at 0.8427 and Capture at 0.9804. Capture's survivor was the replay
reason's template literal. It was reachable: the test compared `Exit`s with `deepStrictEqual`, which did not
read the error's `reason`. Both refusal tests now assert `reason` directly. For SignatureHistory, a test now
pins `signerRole`/`algorithm`/`keyId` kept or omitted and the layer's name, which kills 9 reachable
pre-existing survivors. That leaves 4 survivors:
- `:378` ArrowFunction and ArrayDeclaration: the refusal branch, unreachable from typed input, documented.
- `:340` `resourceId === undefined ?` → `false`: equivalent, because `makeResourceId` is the identity.
- `:212` `"own-records"`: pre-existing and outside this plan.

## Deviations

1. [Rule 3] `SignatureLedger.test.ts:348` was not in `<interfaces>` (see "Key consumers"). It was fixed test-only.
2. [Rule 1] The plan's refusal test expected the `replyTable` reason to "name `params`". The custom
   predicate key is a positional tuple, so the path is an index (`2`) and the reason is
   `describeKeyRefusal` of the key's own refusal. The test asserts that exact sentence.
3. [house style] The refusal tests build the expected error with the description's `failure` or read
   its fields. A hand-built `new CustomPredicateError(…)` tripped `PORT_DOUBLE_BUDGET`, which stays
   unchanged.
4. [XC-05] One extra fixture test (optional fields and name) was added to hold SignatureHistory.ts at or
   above its base after the new unreachable branch.

## Gate results

- `pnpm vitest run --project core --project devtools --project audit --project testing`: 125 files, 3552 tests, green.
- `pnpm typecheck` green. `pnpm test:tstyche` 194/194. `pnpm test:bdd` 567/567.
- `-t "ARCH-65"` green. Task 3's two gates print nothing.
- `check-house-style.mjs` clean, `pnpm lint` exit 0, `pnpm circular` clean, `check-dod-table.mjs` clean.
- Not run: `check:pr`, which is 17-06's.

## For 17-05

- `UNSEEN_REQUEST_IS_AN_OUTAGE` and `unseenReply` are untouched. A keyable request's miss still answers
  `none` on four ports.

## For 17-06

- `spec/behaviors/06-services.md`'s `replyTable` REQUIREMENT should add that a request with no key fails
  with the port's typed error and is never answered from the table. The capture docs and INV-QD-043 should
  state that a request with no key is never captured and fails on replay. The signature fixture fails closed
  on a refusal.
- Changeset: the behavior notes above (core: `replyTable`, `signatureHistoryFromSignatures`; devtools: capture/replay).

## Commits

- `11c117d` test(17-04): every key consumer finds what it stored and fails closed on a refusal, red
- `5331525` fix(17-04): every key consumer branches on the Result and fails closed on a refusal
- `0355c9c` test(17-04): hold the touched files' mutation ratios at the phase base
- `docs(17-04): complete plan` (this SUMMARY, ROADMAP, STATE, REQUIREMENTS untouched: the phase is not complete)
