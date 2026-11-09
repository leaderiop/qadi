---
phase: 02-one-port-read
plan: 01
subsystem: core
tags: [effect-v4, ports, spans, tracing, qadi-core]

requires:
  - phase: 01
    provides: the closed port registry and its derivations (ADR-QD-094), the served read (ADR-QD-107)
provides:
  - "PortSpanAttributes.pose(request) beside disclose(answer, request), stated on all five port descriptions"
  - "readPort: the one body of every port read, local or served (annotate question, count, invoke inside the effect, map defects, annotate answer)"
  - "SignatureQuery carries its requirement (meaning, signerRole); the signature span's disclose reads the signatures plus the request"
  - "signatureMatches: the signature match stated once, package-private (SignatureMatch.ts)"
  - "a per-port table proving a local read equals a served read of the same request"
affects: [02-02 wire projection removal, 02-03 spec and records, 02-04 changeset and overview]

actuals:
  tokens: 17700
  tasks: 2
  commits: 4

tech-stack:
  added: []
  patterns:
    - "a port's span projection lives on its description's attributes (pose, disclose), never on the wire"
    - "one plain-function read body that opens no span; each caller owns its span"

key-files:
  created:
    - packages/core/src/SignatureMatch.ts
  modified:
    - packages/core/src/PortSpan.ts
    - packages/core/src/PortDescription.ts
    - packages/core/src/AttributeResolver.ts
    - packages/core/src/DecisionHistory.ts
    - packages/core/src/RelationshipResolver.ts
    - packages/core/src/CustomPredicate.ts
    - packages/core/src/SignatureHistory.ts
    - packages/core/src/PortAccess.ts
    - packages/core/test/PortAccess.test.ts
    - packages/core/test/PortSpan.test.ts
    - packages/core/test/PortDescription.test.ts

key-decisions:
  - "The new PortSpanAttributes member is named pose (questionOf is taken by Question.ts, question by the struct)"
  - "The generic body is readPort, a plain function; the match helper is SignatureMatch.ts (leaf, out of the barrel)"
  - "D-03: local and served signature spans are equal, including qadi.meaning, qadi.signer_role and qadi.matched; onFile is recorded on neither (BEH-QD-227 does not list it, ARCH-21 kept it off)"
  - "The projection type is inline in PortDescription.attributes (Span intersected with the two functions); no new public export, so plan 02-04 adds no name to spec/overview.md for it"
  - "annotateAnswer takes the already-projected fields, not the outcome: inference over a port named only by K settles on a union of five structs, so the caller projects through d.attributes.disclose(answer, args) where it holds the types"
  - "On the success path of the three resource-scoped reads the question is annotated twice with agreeing values (pre-validation annotation, then readPort's); accepted to keep D-07's order literal"

patterns-established:
  - "Invoke a port as Effect.flatMap(d.service, shape => d.invoke(shape)(...args)) so a synchronous throw is a defect catchPortDefect sees"
  - "Per-port test table as a mapped type over PortName (ROWS, RUN) so a sixth port without a row is a compile error"

requirements-completed: [PORT-01, PORT-03, PORT-04, PORT-05, PORT-06, XC-04]

coverage:
  - id: D1
    description: "Each port's question projection is its description's attributes.pose(request) and its answer projection is attributes.disclose(answer, request), on all five descriptions"
    requirement: PORT-01
    verification:
      - kind: unit
        ref: "packages/core/test/PortSpan.test.ts#every port's description round-trips its span (ARCH-21)"
        status: pass
      - kind: other
        ref: "test \"$(grep -lE '^\\s+pose:' packages/core/src/{AttributeResolver,DecisionHistory,RelationshipResolver,CustomPredicate,SignatureHistory}.ts | wc -l)\" = 5"
        status: pass
    human_judgment: false
  - id: D2
    description: "Every local read and servePortRead run through one plain function, readPort; a served read whose store throws is the port's typed error, not a defect"
    requirement: PORT-03
    verification:
      - kind: unit
        ref: "packages/core/test/PortAccess.test.ts#a read is one body, locally and served (ARCH-47) > a served read whose store throws is the port's typed error, never a defect"
        status: pass
      - kind: unit
        ref: "packages/core/test/PortAccess.test.ts#a local read equals a served read, port by port (ARCH-47)"
        status: pass
    human_judgment: false
  - id: D3
    description: "A local askSignature and a served read of the same request leave qadi.hasSignature spans equal apart from qadi.interpreter, including meaning, signer role and matched; onFile on neither"
    requirement: PORT-04
    verification:
      - kind: unit
        ref: "packages/core/test/PortAccess.test.ts#a read is one body, locally and served (ARCH-47) > a signature question leaves equal local and served spans, apart from the interpreter"
        status: pass
      - kind: unit
        ref: "packages/core/test/PortAccess.test.ts#a read is one body, locally and served (ARCH-47) > the signature answer keys are the struct's, and onFile is recorded on neither span"
        status: pass
    human_judgment: false
  - id: D4
    description: "The six traced reads keep Effect.fn(<port>.span) and their span names; readPort opens no span; UNTRACED_BUDGET stays 3"
    requirement: PORT-05
    verification:
      - kind: other
        ref: "grep gate: 6 Effect.fn(<port>.span) in PortAccess.ts, 3 Effect.fnUntraced in packages/*/src"
        status: pass
      - kind: unit
        ref: "packages/core/test/Evaluate.test.ts and Predicate.test.ts literal span assertions (unchanged)"
        status: pass
    human_judgment: false
  - id: D5
    description: "A per-port table asserts local and served span equality, also when the port fails, dies or throws, plus the D-07 missing-resource-id rows"
    requirement: PORT-06
    verification:
      - kind: unit
        ref: "packages/core/test/PortAccess.test.ts#a missing resource id still leaves its question on the span (D-07)"
        status: pass
    human_judgment: false
  - id: D6
    description: "No new as, !, any, switch, Effect.fnUntraced, async/await or console.* in the changed source"
    requirement: XC-04
    verification:
      - kind: other
        ref: "node scripts/check-house-style.mjs (397 files clean) and pnpm typecheck"
        status: pass
    human_judgment: false

duration: 8min
completed: 2026-11-08
status: complete
plan_head_before: 9b5b8802d5b2625f1055feb7a1cedde7e38ab9fc
plan_head_after: 4896e8296466a3b43bd16acadaeccc3d16c4afbf
---

# Phase 2 Plan 01: One port read Summary

**Each port's span question is projected once by `attributes.pose(request)` on its description, and every local and served port read runs through one plain-function body, `readPort`, so local and served spans of one request are equal and a throwing served store is a typed error.**

## Performance

- **Duration:** 8 min
- **Started:** 2026-11-08T02:26:07Z
- **Completed:** 2026-11-08T02:34:08Z
- **Tasks:** 2 (tracer + auto, both TDD)
- **Files modified:** 12 (11 modified, 1 created)

## Accomplishments

- `PortSpanAttributes` gained a fourth type parameter `Args` (defaulted to `never`), a `pose(args)` member, and a two-argument `disclose(answer, args)`. All five descriptions state `pose`; the signature request carries `meaning`/`signerRole`, and its `disclose` reads the signatures on file plus the requirement through `signatureMatches`.
- `readPort` replaces six per-read bodies and the unnamed served body. It annotates the question (`pose` plus `interpreter`), counts through a three-arm `countFor` (evaluate, toPredicate, remote), invokes inside `Effect.flatMap(d.service, ...)`, maps a defect with `catchPortDefect`, and annotates the answer. `servePortRead` is `readPort(d, "remote", args)` under `Effect.withSpan(d.span)`.
- Two defects removed: the served signature span lacked `qadi.meaning`/`qadi.signer_role`/`qadi.matched`, and a served store that threw synchronously escaped `catchPortDefect` as a defect (Test C failed on `main`, passes now).
- `PortAccess.test.ts` now holds a per-port table (mapped type over `PortName`, 63 tests in the file): equal spans apart from the interpreter for answered, failing, dying and throwing stores, own-metric-only counting, and the D-07 rows (a missing resource id still leaves its question, fails with `MissingResourceId`, reaches no port, counts no call).

## Task Commits

1. **Task 1: tracer, a signature question is projected once and read through one body**
   - RED `1ef7a33` (test): Tests A to C added; A, B and C failed on the pre-change tree
   - GREEN `1c42df0` (feat): `pose`, `readPort`, `SignatureMatch.ts`, `servePortRead` through `readPort`
2. **Task 2: every local read is argument shaping over the one body, with the per-port table**
   - `471944a` (test): per-port table and D-07 rows (already green: the plan anticipated this, local reads were already equal for four ports; a mutation that removed `countFor` from `readPort` failed 9 of them)
   - `4896e82` (refactor): the five remaining reads run `readPort`; the history helper and the direct metric updates are gone

**Plan metadata:** the docs commit that carries this SUMMARY (docs: complete plan).

## TDD notes

- **RED:** Test A (`a signature question leaves equal local and served spans, apart from the interpreter`) failed on `deepStrictEqual` of the two span attribute maps: the served span lacked `qadi.meaning`, `qadi.signer_role` and `qadi.matched`. Test B failed because the served span had no `qadi.matched`. Test C failed with `Failure ["Die"]` ("dead"), not the typed error. `gsd check tdd-red-evidence` returned `INVALID_RED / invalid_record` ("Non-TAP data in report"): vitest's TAP reporter writes the multi-line `actual`/`expected` strings of a failed `deepStrictEqual` into the YAML block, and the classifier does not accept them. The plan is `type: execute`, not `type: tdd`, so the classifier is not a gate here. Semantic assessment (manual): the target tests executed, were discovered (15 tests, 3 failing), and failed on the planned assertions, not on syntax, import or fixture faults.
- The RED commit does not typecheck: Test A passes `meaning`/`signerRole` in a `SignatureQuery` that did not yet have them. That is expected for a RED commit; the GREEN commit and every commit after it typecheck.

## Decisions Made

- **Names:** `pose` (member on `PortSpanAttributes`), `readPort` (in `PortAccess.ts`), `signatureMatches` in `packages/core/src/SignatureMatch.ts` (package-private, not in the barrel, `pnpm circular` green).
- **Projection type is inline.** `PortDescription.attributes` is `Span & { pose: (args: Args) => ...; disclose: (answer: A, args: Args) => ... }`. No new exported type, so no gate-13 edit to `spec/overview.md` for it. Plan 02-04 must still describe the changed public types: `PortSpanAttributes` (fourth parameter, `pose`, two-argument `disclose`), `PortSpanAttributesLike`, and `SignatureQuery` (two optional fields). Both files are `export *`-ed from the barrel, so these are public type changes, additive for `SignatureQuery`.
- **D-03 choice recorded:** the local and served signature spans are equal and carry `qadi.meaning`, `qadi.signer_role` and `qadi.matched`; `onFile` is on neither (BEH-QD-227 does not list it and ARCH-21 kept it off on purpose).
- **Double annotation for ADR-QD-109's consequences:** on the success path of `askActedForResource`, `askRelationship` and `askSignature` (Resource scope) the question is annotated twice with agreeing values, the pre-validation annotation and then `readPort`'s full one. Accepted to keep D-07's "annotate, then validate" order literal. `annotateCurrentSpan` of an equal value is idempotent, so the span is unchanged.
- **`annotateAnswer` takes the projected fields** rather than the outcome. For a port named only by `K`, TypeScript resolves `d.attributes.answer` to a union of the five answer structs and `disclose` to an overload intersection, so a helper generic over the outcome would not accept `DescriptionOf<K>`. `readPort` projects through `d.attributes.disclose(answer, args)` and passes the fields; `annotateQuestion` keeps its typed-by-description signature and `readPort` calls it with the explicit `SpanFields` argument.
- **Interpreter:** `Interpreter` stays `Exclude<PortInterpreter, "remote">` for the `ask*` signatures (the guarantee `toPredicate` reads only two ports comes from them); `readPort` and `countFor` take the full `PortInterpreter`.

## Deviations from Plan

None - plan executed exactly as written. The two judgment calls, the `annotateAnswer` signature and the test-only conformance changes, are inside the plan's stated discretion ("Adapt `annotateQuestion`/`annotateAnswer` to what `readPort` ... need[s], keeping both names") and are recorded under Decisions Made.

**Total deviations:** 0 auto-fixed. **Impact on plan:** none.

## Left for later plans

- `wire.spanQuestion` / `wire.spanAnswer` and `PortWireSpan` are untouched and now unused by `src`; plan 02-02 removes them. The two tests that still read them are `packages/core/test/PortConformance.test.ts` (line 505, `d.wire.spanQuestion`) and `packages/core/test/PortServe.test.ts` (lines 153 to 158, `wire.spanAnswer`); plan 02-02 must replace those with `attributes.pose`/`attributes.disclose` assertions.
- The signature wire question and request key do not yet carry `meaning`/`signerRole` (plan 02-02).
- All spec, ADR-QD-109, CCR-QD-386, behaviour-doc, invariant, traceability and changeset records (plans 02-03 and 02-04).

## Issues Encountered

None beyond the RED-classifier note above. One out-of-scope observation: `pnpm test:tstyche`, `pnpm circular` and `node scripts/check-house-style.mjs` were green throughout; `pnpm circular` prints 64 madge warnings that were present before this plan.

## Verification

- `pnpm vitest run --project core --project http --project devtools --project audit`: 121 files, 3342 tests pass.
- `pnpm typecheck`, `pnpm test:tstyche` (148 tests), `node scripts/check-house-style.mjs` (397 files clean), `pnpm circular`: green.
- Grep gates against baselines: `wire.span` 0 (was 2), `servedBody` 0 (was 2), `pose:` in 5 port files (was 0), 6 `Effect.fn(<port>.span)` (unchanged), 3 `Effect.fnUntraced` (unchanged), `SignatureMatch` in the barrel 0, `signatureMatches` 7 occurrences with 1 call in `PortAccess.ts`, non-comment `catchPortDefect(` 1 (was 6), `Metric.update(portCallsTotal, "` 0 (was 3), `callHasActed` 0 (was 3), `readPort(` 7.
- `Evaluate.test.ts` and `Predicate.test.ts` literal span assertions pass unchanged. `PORT_DOUBLE_BUDGET` unchanged: `PortAccess.test.ts` builds no port error by hand beyond the two existing `AttributeResolveError` lines.

## Known Stubs

None.

## Threat Flags

None. No new endpoint, auth path, file access or trust-boundary schema. Threat register: T-02-01 (answer reaches a span only through `disclose`; the attribute port still returns `{ resolved }`, `PortServe.test.ts`'s SECRET sentinel and the table's SECRET check pass), T-02-02 (Test C and the throwing rows pass), T-02-03 (`Walk.ts` and `Predicate.ts` untouched; full core suite green; D-07 rows pass), T-02-04 (the table asserts span equality for every registry row).

## Next Phase Readiness

Plan 02-02 can remove the wire projection (`spanQuestion`/`spanAnswer`, `PortWireSpan`) and extend the signature wire question and request key; the span half of PORT-04 is done and its wire leg is 02-02's.

## Self-Check: PASSED

- Files: all 12 created or modified files exist on disk.
- Commits: `1ef7a33`, `1c42df0`, `471944a`, `4896e82` are ancestors of `HEAD`.
- Plan-level verification and every task's automated gates re-run green after the last commit.

---
*Phase: 02-one-port-read*
*Completed: 2026-11-08*
