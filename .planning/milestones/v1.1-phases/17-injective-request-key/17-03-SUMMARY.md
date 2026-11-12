---
phase: 17-injective-request-key
plan: 03
subsystem: core
tags: [port-key, injective, total, result, mutation]

phase_base: 1a14899

requires: ["17-01", "17-02"]
provides:
  - "`canonicalKey(value): Result<string, KeyRefusal>` (package-private `PortKey.ts`): kind-tagged, stack-safe, agrees with `Equal.equals` on its domain, typed refusal outside it"
  - "Public `KeyRefusal` (Circular | Unkeyable | Unreadable), `UnkeyableKind`, `describeKeyRefusal` in `PortDescription.ts`, named in `spec/overview.md` (1.86)"
  - "`PortDescription.key: (args) => Result<string, KeyRefusal>`; all five port descriptions key through `canonicalKey`"
affects: [17-04, 17-05, 17-06]

actuals:
  tasks: 2
  commits: 4

key-files:
  modified:
    - packages/core/src/PortKey.ts
    - packages/core/src/PortDescription.ts
    - packages/core/src/Ports.ts
    - packages/core/src/AttributeResolver.ts
    - packages/core/src/DecisionHistory.ts
    - packages/core/src/RelationshipResolver.ts
    - packages/core/src/SignatureHistory.ts
    - packages/core/src/CustomPredicate.ts
    - packages/core/test/PortKey.test.ts
    - packages/core/test/PortConformance.test.ts
    - packages/core/test/PortDescription.test.ts
    - packages/core/test/DecisionHistory.test.ts
    - packages/core/test/RelationshipResolver.test.ts
    - packages/core/test/SignatureHistory.test.ts
    - spec/overview.md

key-decisions:
  - "Applied 17-01 T1 (D-04) from `_DECISIONS.md`: \"Every port's unseen replay request is an outage (fail closed); `PortDescription.key` returns `Result<string, KeyRefusal>` (Breaking) — confirmed\". The key uses `effect/Result`, never `Either`."
  - "A subclass of Date/RegExp/Array/Set/Map keys as its base class (not refused): measured on effect@4.1.2, `Equal.equals` compares `new (class extends Date)(0)` equal to `new Date(0)`, and likewise for the other four, so keying by `instanceof`/`Array.isArray` agrees with Equal where the plan's exact-prototype check would have refused values Equal treats as ordinary."
  - "A value implementing `Equal` itself is refused as `instance` (checked after Date/RegExp, in Equal's own order), so an Array/Set/Map subclass with its own equality is not keyed structurally."

requirements-completed: []  # KEY-01 replay half and KEY-03 consumers are 17-04's; XC-03/04/05 are cross-cutting

completed: 2026-11-10
status: complete
---

# 17-03 — The request key is injective and total

## Task 1 — the key (commit `d6cc6fb`)

`PortKey.ts` is rewritten as an explicit-stack walk (no recursion): each container is a frame holding an
iterator of `[segment, read]` children, tokens are folded into the parent on close, an `onPath` set refuses
cycles and is cleared on close (a shared acyclic reference keys twice), and a `path` stack names where a
refusal sits. `Result.try` around the walk turns a throwing getter or proxy trap into `Unreadable` at the
live path. Format exactly as the plan's `<interfaces>`: `u n t f`, `d<n>;` (`-0` as `0`, `NaN` as `NaN`),
`b<n>;`, `s<JSON>`, `D<time>;`, `R<JSON>`, `[…]`, `{"k":v}` sorted, `S{…}` sorted, `M{k=v}` sorted.

The five keys are `canonicalKey([…])` over the same fields, with every `?? null` removed (an absent field
keys as `u`, distinct from every present value; `params: undefined` and `params: null` no longer collide).
Doc comments that said "absent as `null`" now say `undefined`. `signatureHistoryFromSignatures` untouched.

`PortKey.test.ts`: the 17-02 statements are unchanged; only how a key is read changed (a `keyText` helper that
asserts `Success`; the totality `doesNotThrow` tests are untouched). Added: the refusal per kind (cycle path
`["self"]`, function `["f"]`, symbol, symbol key, `Number`/`Uint8Array`/`Point` brands, anonymous and
constructor-less brands, an Equal-implementing array subclass, a throwing getter with an Error and with a
string, nested paths through arrays/objects/Sets/Maps past finished siblings), a shared acyclic reference,
a 100,000-deep array that keys (`length 200,002`), a non-enumerable key, `describeKeyRefusal`'s three
sentences, one exact-token pin per format row (24 rows), and a second law property over a wider pool
(RegExps, invalid Dates, bigints, null-prototype objects, quoted keys). 48 tests, all green.

## Task 2 — conformance and overview (commit `2fed441`)

"request keys" pins the new text for every port; "request keys tell apart…" reads every key through
`keyText` (comparing `Result` objects would have passed vacuously); the law describe is now
"every argument reaches the key" (`Law` lost `rebuilt`, still a mapped type over `PortName`), with a
CustomPredicate `it` for `undefined`/`null` and Date/ISO params, and the old `assert.throws` is now
"a circular or function param is a `Failure`" (comment: the other four ports cannot carry one by type).
`spec/overview.md` 1.85 → 1.86: `KeyRefusal`/`UnkeyableKind` and `describeKeyRefusal` rows, and the
`PortDescription` row says `key` returns a `Result` and implements `Equal.equals`.

## Mutation (XC-05) — commit `bef2fdc`

Scoped Stryker (`stryker.config.mjs --mutate` over the seven touched src files). `src` does not compile and
19 core tests fail until 17-04 (see below), so the run was made with a measurement-only patch to the two core
consumers (`Result.getOrElse(d.key(args), () => "")` in `PortDoubles.ts` and `SignatureHistory.ts`), copied
back from backups afterwards; neither file differs from `HEAD` in this plan's commits.

| File | Base | Now |
|---|---|---|
| PortKey.ts | 0.5000 | 1.0000 (166/166, 2 errors) |
| PortDescription.ts | 1.0000 | 1.0000 (16/16) |
| AttributeResolver.ts | 1.0000 | 1.0000 |
| DecisionHistory.ts | 0.9730 | 1.0000 |
| RelationshipResolver.ts | 0.9231 | 1.0000 |
| CustomPredicate.ts | 0.8980 | 0.9318 |
| SignatureHistory.ts | 0.8452 | 0.8481 (67/79, excluding the two patched lines' 6 mutants) |

Removing the `?? null`s deleted killed mutants, which dropped DecisionHistory, RelationshipResolver,
CustomPredicate and SignatureHistory below base on the first run. Fixed by: encode tests that kill the
wire's absent-field spread survivors (DecisionHistory `resourceId`, RelationshipResolver `depth`,
SignatureHistory `resourceId`; each mutant makes `Schema.encode` refuse, checked), deleting
`renderReason`'s `typeof cause === "string"` branch (equivalent: `String(s)` is `s` and cannot throw), and
pinning `describeKeyRefusal` (was NoCoverage).

## Deviations

1. [Rule 3 — blocker] `Ports.ts`'s `ArgsOf` inferred `Args` from `key: (args) => string`; with the `Result`
   return it inferred `never` and broke `PortAccess.ts`/`Ports.ts`. Now `=> unknown`. Type-level only.
2. [Rule 3] `PortDescription.test.ts`'s probe description keyed with `JSON.stringify`; now `canonicalKey`.
3. [Rule 1] Subclasses of Date/RegExp/Array/Set/Map key as their base (see key-decisions), rather than the
   plan's exact-prototype refusal, because `Equal.equals` treats them as their base.
4. [XC-05] Three wire tests and the `renderReason` simplification, outside the plan's file list, to hold
   per-file ratios.

## Gate results

- Task 1 verifies: PortKey.test.ts 48/48; the five-file `JSON.stringify`/`canonicalKey(` check passes;
  `canonicalReplacer` count 0.
- Task 2 verifies: PortConformance `-t "request keys|reaches the key"` 12 passed; `pnpm spec:api` (891
  exports), `spec-revise --check`, `pnpm lint` green; `rebuilt` count 0; `KeyRefusal` in overview.
- `pnpm circular` clean; `check-dod-table.mjs` clean.
- Not run by design: repo-wide `pnpm typecheck`, `test:tstyche`, devtools/audit suites, `check:pr`.

## Pending for 17-04 (consumers) — expected red until then

- `tsc -b`: `SignatureHistory.ts` (3 sites in `signatureHistoryFromSignatures`), devtools `Capture.ts`
  (`:98` capturing, `:229` replay), devtools `Capture.test.ts` (7 `.key(` reads).
- Core tests failing (19): `replyTable` (PortDescription.test, PortConformance "scripted double" ×5,
  Ports.test `fixturePortsLayer`), `signatureHistoryFromSignatures` (SignatureHistory.test ×5,
  Evaluate.test HasSignature ×7). `PortDoubles.replyTable` compiles but keys a `Map` by the `Result`
  object, so every lookup misses (T-17-09).
- `packages/audit/test/SignatureLedger.test.ts:348` compares two `Result`s with `===` (always false).
- Capture "ARCH-65" test stays RED until 17-04.

## For 17-06

- Changeset: `PortDescription.key` returns `Result<string, KeyRefusal>` (Breaking for `@qadi/core`,
  0.x minor); key strings change; new public `KeyRefusal`, `UnkeyableKind`, `describeKeyRefusal`.
- No persisted or wire key exists (D-03): captures are in-memory `Map`s, `PortRemote.ts` never calls `key`.
- `spec/overview.md` 1.86 cites CCR-QD-407, which 17-06 registers (`spec:verify:strict` CCR coverage may be
  red until then).
- Key-domain facts for ADR-QD-094's amendment: subclasses key as their base; `Equal.byReference`-marked
  objects key structurally (the mark is effect-internal; stated as a limit in `PortKey.ts`).

## Commits

- `d6cc6fb` feat(17-03): an injective, total request key
- `2fed441` test(17-03): conformance rows check that every argument reaches the key
- `bef2fdc` test(17-03): hold the touched files' mutation ratios at the phase base
- `docs(17-03): complete plan` (this SUMMARY, ROADMAP, STATE)
