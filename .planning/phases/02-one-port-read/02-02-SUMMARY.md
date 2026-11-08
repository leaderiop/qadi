---
phase: 02-one-port-read
plan: 02
subsystem: core
tags: [effect-v4, ports, wire, spans, signature, qadi-core]

requires:
  - phase: 02-one-port-read
    provides: "02-01: attributes.pose/disclose on every description, readPort, SignatureQuery's optional requirement"
provides:
  - "the signature wire question carries the asker's requirement (meaning, signerRole) as optional keys"
  - "signatureHistoryPort.key is injective over the requirement: [subjectId, resourceId ?? null, meaning ?? null, signerRole ?? null]"
  - "a remotely asked signature question leaves a local and a served qadi.hasSignature span equal apart from qadi.interpreter"
  - "PortWire holds encodeQuestion, decodeQuestion, encodeAnswer, decodeAnswer and asked only; the span projections and their exported type are gone"
affects: [02-03 spec and records, 02-04 changeset and overview]

actuals:
  tokens: 6600
  tasks: 2
  commits: 3

tech-stack:
  added: []
  patterns:
    - "a port's wire states only JSON; what a span says is the description's attributes (pose, disclose)"
    - "a store answers every signature on file; the asker's requirement is context for the span and the key, never a filter"

key-files:
  created: []
  modified:
    - packages/core/src/SignatureHistory.ts
    - packages/core/src/PortWire.ts
    - packages/core/src/PortWireEncode.ts
    - packages/core/src/AttributeResolver.ts
    - packages/core/src/DecisionHistory.ts
    - packages/core/src/RelationshipResolver.ts
    - packages/core/src/CustomPredicate.ts
    - packages/audit/src/SignatureLedgerTest.ts
    - packages/core/test/PortConformance.test.ts
    - packages/core/test/PortRemote.test.ts
    - packages/core/test/PortServe.test.ts
    - packages/core/test/PortDescription.test.ts

key-decisions:
  - "fromQuestion adds meaning and signerRole by conditional spread, so an absent requirement stays an absent key and the conformance round trip (deepStrictEqual on args) holds for both shapes"
  - "The request key over-keys on purpose: a capture keyed per requirement can only miss and deny, never replay a stale allow (INV-QD-043 law)"
  - "SignatureLedgerTest groups its read by the requirement-less (subjectId, resourceId) key: a store answers every signature on file, and the asker matches the requirement"
  - "The wire doc states that ADR-QD-107 rejected span structs as the wire and that moving the projection off the wire does not contradict it (D-02)"

patterns-established:
  - "Test the served leg of a port question end to end: askRemotely over answerRemotely in-process, one collectingTracer seeing both spans"

requirements-completed: [PORT-01, PORT-02, PORT-04, XC-04]

coverage:
  - id: D1
    description: "A signature question asked through askRemotely and answered by answerRemotely leaves a local and a served qadi.hasSignature span equal apart from qadi.interpreter, with qadi.meaning, qadi.signer_role and qadi.matched"
    requirement: PORT-04
    verification:
      - kind: unit
        ref: "packages/core/test/PortRemote.test.ts#a signature question asked remotely (PORT-04) > leaves a local and a served span equal apart from the interpreter"
        status: pass
      - kind: unit
        ref: "packages/core/test/PortRemote.test.ts#a signature question asked remotely (PORT-04) > says a requirement that matches nothing on file did not match, on both spans"
        status: pass
    human_judgment: false
  - id: D2
    description: "The signature wire question round-trips meaning and signerRole, still decodes an old question, still refuses an excess or non-string key"
    requirement: PORT-04
    verification:
      - kind: unit
        ref: "packages/core/test/PortRemote.test.ts#the signature question carries the asker's requirement (D-03)"
        status: pass
      - kind: unit
        ref: "packages/core/test/PortConformance.test.ts#SignatureHistory > wire (ADR-QD-NEXT)"
        status: pass
    human_judgment: false
  - id: D3
    description: "signatureHistoryPort.key is pinned and injective over the requirement (meaning, meaning absent, signerRole, signerRole absent)"
    requirement: PORT-04
    verification:
      - kind: unit
        ref: "packages/core/test/PortConformance.test.ts#request keys > are the collision-safe JSON of the question each port is asked"
        status: pass
      - kind: unit
        ref: "packages/core/test/PortConformance.test.ts#a request key is injective over the request > holds for every port in the registry"
        status: pass
    human_judgment: false
  - id: D4
    description: "PortWire has no span members and PortWireSpan no longer exists; no port module's wire block projects into a span; a throwing served store is answered Unavailable on every registry row"
    requirement: PORT-02
    verification:
      - kind: other
        ref: "test \"$(grep -rnE 'spanQuestion|spanAnswer|PortWireSpan' packages --include=*.ts --include=*.tsx | grep -v node_modules | grep -v /lib/ | wc -l)\" = 0"
        status: pass
      - kind: unit
        ref: "packages/core/test/PortRemote.test.ts#a store that throws is answered Unavailable, never a defect (every row)"
        status: pass
    human_judgment: false
  - id: D5
    description: "No new as, !, any, switch, Effect.fnUntraced or port-error constructions in tests; house-style, tstyche, circular, typecheck green"
    requirement: XC-04
    verification:
      - kind: other
        ref: "node scripts/check-house-style.mjs (397 files clean), pnpm typecheck, pnpm test:tstyche, pnpm circular"
        status: pass
    human_judgment: false

duration: 6min
completed: 2026-11-08
status: complete
plan_head_before: 066cfd5fbe345e4cb9637cab2d870140222b34a9
plan_head_after: 3d13c6557e7f7867ba3ddc80a02040b01f6fc425
---

# Phase 2 Plan 02: Signature requirement on the wire Summary

**The signature wire question and request key now carry the asker's `meaning`/`signerRole`, so a remotely asked signature question leaves a served `qadi.hasSignature` span equal to the local one, and `PortWire` no longer carries any span projection (`spanQuestion`, `spanAnswer`, `PortWireSpan` deleted).**

## Performance

- **Duration:** 6 min
- **Started:** 2026-11-08T02:34:00Z
- **Completed:** 2026-11-08T02:40:00Z
- **Tasks:** 2 (Task 1 TDD, Task 2 auto)
- **Files modified:** 12 (all modified, none created)

## Accomplishments

- Wire (D-03): the signature question gains `meaning: Schema.optionalKey(Schema.String)` and `signerRole: Schema.optionalKey(Schema.String)`. `toQuestion` and `fromQuestion` add each only when defined. The decode stays strict (an excess key and a non-string requirement are refused) and an old question without them still decodes.
- Key: `signatureHistoryPort.key` is now `JSON.stringify([subjectId, resourceId ?? null, meaning ?? null, signerRole ?? null])`. Pins: `["alice",null,null,null]`, `["alice","doc-1",null,null]`, `["alice","doc-1","approved","manager"]`. `LAWS.SignatureHistory` gained the variants `meaning`, `meaning absent`, `signerRole`, `signerRole absent`.
- PORT-04 end to end: `askSignature` over `askRemotely` over an in-process `answerRemotely` leaves two spans that are deep-equal once `qadi.interpreter` is removed, carrying `qadi.meaning` "approved", `qadi.signer_role` "manager" and `qadi.matched` true. A non-matching requirement leaves `qadi.matched` false on both.
- PORT-02: `PortWire` holds `encodeQuestion`, `decodeQuestion`, `encodeAnswer`, `decodeAnswer` and `asked`. `PortWireSpec` and `portWire`'s return lost the two members; the five wire blocks and the `PortDescription.test.ts` probe lost their copies. Zero occurrences of the three removed identifiers under `packages/` (baseline 28).
- A throwing served store is answered `{ _tag: "Unavailable" }` on every registry row (already true after 02-01; now pinned at the wire level).

## Task Commits

1. **Task 1: a remotely asked signature question carries its requirement, keys by it, and leaves two agreeing spans**
   - RED `18173fc` (test): E2E, wire, key and law cases; 6 failed on the 02-01 tree
   - GREEN `94c7d81` (feat): `signatureWire` and `signatureHistoryPort.key` extended; `SignatureLedgerTest` regrouped (see Deviations)
2. **Task 2: PortWire deals only with JSON** - `3d13c65` (refactor)

**Plan metadata:** the docs commit that carries this SUMMARY.

## TDD notes

- **RED:** six target tests failed on the planned assertions: the per-port round trip for `SignatureHistory` (args lost `meaning`/`signerRole` through the wire), the pinned keys (`'["alice",null]'` instead of `'["alice",null,null,null]'`), the injectivity law (`a request differing only in meaning must key differently`), the E2E span equality (served span lacked `qadi.meaning`/`qadi.signer_role`/`qadi.matched`), the non-matching E2E (`qadi.matched` undefined, not false) and the wire round trip. The throwing-store rows, the excess-property refusal and the old-question decode passed on the old tree, as the plan predicted. `gsd check tdd-red-evidence` was not run: 02-01 recorded that vitest's TAP output for a failed `deepStrictEqual` is rejected as `invalid_record`, and the plan is `type: execute`. Semantic assessment (manual): the target tests were discovered and executed (207 tests across the three files, 6 failing), and each failed on its planned assertion, not on syntax, import or fixture.
- The RED commit typechecks (the new keys on `SignatureQuery` already existed after 02-01).

## Decisions Made

- `fromQuestion` builds the query with conditional spreads for `meaning` and `signerRole`, matching `toQuestion` and `resourceId`'s style, so an absent requirement is an absent key (not `undefined`) and the conformance round trip holds without special-casing.
- The key is deliberately over-keyed on the requirement (INV-QD-043's injectivity law, ADR-QD-094). The safe direction: a capture keyed per requirement can only miss and deny.
- The wire's doc comment now says the question carries the requirement so a served span can say what was asked and whether the records matched; the sentence "The span discloses no answer field" no longer exists anywhere under `packages/`.
- D-02: the PortWire module doc says the wire states only JSON and that ADR-QD-107 rejected span structs as the wire, which moving the projection off it does not contradict.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] `SignatureLedgerTest` stopped finding captured signatures once the key included the requirement**
- **Found during:** Task 1 (GREEN, full suite)
- **Issue:** `@qadi/audit`'s `SignatureLedgerTest` grouped its entries and its reads by `signatureHistoryPort.key`. A captured signature is written with no requirement, so after the key gained `meaning`/`signerRole`, an `askSignature` read with a requirement keyed differently and found nothing. `audit/test/SignatureLoop.test.ts` ("a signature captured while approving doc-1 satisfies hasSignature('approved') on doc-1") went from Allow to Deny.
- **Fix:** the read now keys the query as `(subjectId, resourceId)` only, via `signatureHistoryPort.key([{ subjectId, resourceId }])`, with a doc comment: a store answers every signature on file and the asker matches the requirement. No change to the write side or to the ledger's public types.
- **Files modified:** `packages/audit/src/SignatureLedgerTest.ts`
- **Verification:** `pnpm vitest run --project core --project http --project devtools --project audit` green (3353 tests); `pnpm typecheck` green.
- **Committed in:** `94c7d81`

**2. [Task ordering] The wire block's span lines in `SignatureHistory.ts` stayed through Task 1**
- While rewriting the signature wire I briefly dropped its `spanQuestion`/`spanAnswer`, which broke typecheck (the members are still required until Task 2). They were restored for Task 1's commit and deleted in Task 2, as planned. Not a deviation in outcome.

---

**Total deviations:** 1 auto-fixed (1 bug caused by a consumer the plan did not list). **Impact on plan:** none on scope; `packages/audit/src/SignatureLedgerTest.ts` is a thirteenth file beyond `files_modified`.

## Issues Encountered

- `node scripts/check-api-surface.mjs` (gate 13) now reports one drift: `spec/overview.md` still lists `PortWireSpan`, which nothing exports. This is expected and owned by plan 02-04 (the plan says not to edit `spec/overview.md` here and that gate 13 runs in 02-04).
- `.changeset/a-port-is-answered-remotely.md` still names `PortWireSpan` among the new exports; plan 02-04 rewrites it.
- `pnpm circular` is clean; `pnpm test:tstyche` 148 tests pass.

## For plan 02-04's changeset

- **New signature key shape:** `signatureHistoryPort.key` is `JSON.stringify([subjectId, resourceId ?? null, meaning ?? null, signerRole ?? null])`. Capture keys saved by `@qadi/devtools` for the signature port before this change (`["alice","doc-1"]`) will no longer match a replay that asks with a requirement.
- **Wire question's added keys:** `meaning` and `signerRole`, both optional strings. A new client's question with them reaches an old (strict) server as `Malformed`, and the asker turns that into the port's own typed error (fails closed, never a grant). A question without them still decodes on the new server.
- **Removed:** `PortWire.spanQuestion`, `PortWire.spanAnswer` and the type `PortWireSpan`; none of these was in a published release (they landed in ARCH-31 after `@qadi/core@0.11.0`).
- **Ledger:** `SignatureLedgerTest`'s reads are unchanged in behaviour for a caller (it answers every signature on file for the subject and resource); only its internal grouping key changed.

## Known Stubs

None.

## Threat Flags

None. No new endpoint, auth path, file access or trust-boundary schema beyond the planned `meaning`/`signerRole` question keys (T-02-05 to T-02-08 in the plan's register: strings are `SpanValue`s, decode is strict and depth-bounded; the JSON encode/decode functions are untouched and the per-port wire laws, `PortWire.test.ts` and http's `PortRoutes.test.ts` stay green).

## Verification

- `pnpm vitest run --project core --project http --project devtools --project audit`: 121 files, 3353 tests pass.
- `pnpm typecheck`, `pnpm test:tstyche` (148 tests), `node scripts/check-house-style.mjs` (397 files clean), `pnpm circular`: green.
- Grep gates: `wire.span` in PortServe/PortConformance tests 0 (baseline 4); `meaning: Schema.optionalKey(Schema.String)` and `signerRole: Schema.optionalKey(Schema.String)` 2 each in `SignatureHistory.ts` (baseline 1 each); `signerRole ?? null` 1 (baseline 0); `spanQuestion|spanAnswer|PortWireSpan` under `packages/` 0 (baseline 28).

## Next Phase Readiness

Plans 02-03 (spec, ADR-QD-109, CCR-QD-386, behaviour docs, invariants, traceability) and 02-04 (changeset and `spec/overview.md`, which fixes gate 13) can proceed. Nothing in `packages/` references the removed identifiers.

## Self-Check: PASSED

- Files: all 12 modified files exist on disk.
- Commits: `18173fc`, `94c7d81`, `3d13c65` are ancestors of `HEAD`.
- Plan-level verification re-run green after the last commit (gate 13 drift is expected and owned by 02-04).

---
*Phase: 02-one-port-read*
*Completed: 2026-11-08*
