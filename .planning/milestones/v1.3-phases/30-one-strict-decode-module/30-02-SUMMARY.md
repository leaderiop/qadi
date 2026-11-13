---
phase: 30-one-strict-decode-module
plan: 02
subsystem: core
tags: [untrusted-decode, policy, error-registry, devtools]
phase_base: 055c859320f2396a6b2c97cecae2c455836a1603
plan_head_before: 943224ca6e34d5f56c0575d305cb9d7cbe375110
plan_head_after: 65e18aeb4ceb4b07d9d1d559d58ca7e0964a5019
status: complete

requires:
  - phase: 30-01
    provides: the characterisation tables whose flip rows this plan changes
provides:
  - packages/core/src/UntrustedDecode.ts, the one untrusted decode recipe (public leaf)
  - Policy.fromJson/fromJsonValue on the leaf; PolicyNotJson (ACL021)
  - the paste-box exhaustive sentence table
affects: [30-03, 30-04, 30-05, 30-06, 30-07]

actuals:
  tokens: 14000
  tasks: 1
  commits: 1

tech-stack:
  added: []
  patterns:
    - "A seam builds `untrustedDecoder(schema)` once at module scope and maps UntrustedRefusal with a module-scope Match.tagsExhaustive"

key-files:
  created:
    - packages/core/src/UntrustedDecode.ts
  modified:
    - packages/core/src/index.ts
    - packages/core/src/Policy.ts
    - packages/core/src/Errors.ts
    - packages/core/src/SinkCodec.ts
    - packages/core/src/PortWireEncode.ts
    - packages/core/src/PortRemote.ts
    - packages/devtools/src/model/ExplorerSession.ts
    - packages/core/test/UntrustedSeams.test.ts
    - packages/core/test/Policy.test.ts
    - packages/core/test/SinkCodec.test.ts
    - packages/core/test/DecisionWire.test.ts
    - packages/core/test/Errors.tst.ts
    - packages/devtools/test/model/ExplorerSession.test.ts

key-decisions:
  - "PolicyNotJson carries `message` (the parser's text); it lives in Policy.ts beside PolicyDecodeTooDeep and is imported into Errors.ts as a type"
  - "UNTRUSTED_DECODE_OPTIONS stays exported from the leaf until 30-06 because @qadi/react and @qadi/audit import it until 30-04/30-05"

requirements-completed: [DEC-01, DEC-02, DEC-03, DEC-04, DEC-05, DEC-07, WX-04, WX-06]

duration: 12 min
completed: 2026-11-12
---

# Phase 30 Plan 02: Tracer through Policy.fromJson Summary

The leaf `UntrustedDecode.ts` is in and `Policy.fromJson`/`fromJsonValue` decode only through it; non-JSON text is now `PolicyNotJson` (ACL021) rather than a `SchemaError`, and the devtools paste box renders all three policy decode errors through one exhaustive table.

## Commit

| Task | Commit | Message |
|---|---|---|
| 1 | `65e18aeb` | feat(30-02): one strict-decode module, wired through Policy.fromJson |

`commits: 1` is measured (`git rev-list --count 943224ca..HEAD`).

## The leaf's exported names (`packages/core/src/UntrustedDecode.ts`)

- `MAX_DECODE_DEPTH: number = 256`
- `UNTRUSTED_DECODE_OPTIONS: SchemaAST.ParseOptions = { onExcessProperty: "error" }` (exported until 30-06)
- `type UntrustedRefusal = Data.TaggedEnum<{ NotJson: { message }; TooDeep: { maxDepth }; Malformed: { message; error: Schema.SchemaError } }>` and `const UntrustedRefusal = Data.taggedEnum<UntrustedRefusal>()`
- `type UntrustedValueRefusal = Exclude<UntrustedRefusal, { _tag: "NotJson" }>`
- `type UnwalkedKey<A>`: keys of `A` typed `unknown` or `ReadonlyArray<unknown>`
- `interface UntrustedDecoderOptions<A, R extends { _tag: string }> { unwalked?; prepare? }`
- `interface UntrustedDecoder<A, R> { decode: (unknown) => Result<A, UntrustedValueRefusal | R>; decodeText: (string) => Result<A, UntrustedRefusal | R> }`
- `untrustedDecoder<S extends Schema.ConstraintDecoder<unknown>, R extends { _tag: string } = never>(schema, options?: UntrustedDecoderOptions<S["Type"], R> & FreeRefusalTag<R>)`

A prepare refusal tagged `NotJson`, `TooDeep` or `Malformed` is a compile error (the options parameter becomes `undefined`), and so is an `unwalked` key whose type is not `unknown`/`ReadonlyArray<unknown>`; both were checked with a throwaway file (deleted). `R` was inferred from `prepare` in that check: no call site needed an explicit type argument.

## Flipped rows (Flips line in the commit body)

| Row | Old expectation | New expectation |
|---|---|---|
| `Policy.fromJson("}{")` (`UntrustedSeams.test.ts`) | `SchemaError` | `PolicyNotJson` |
| `Policy.fromJson` 60,000-deep text missing its final brace (`UntrustedSeams.test.ts`, `Policy.test.ts`) | `SchemaError`, no throw | `PolicyNotJson`, no throw |
| Paste-box not-JSON sentence (`ExplorerSession.test.ts`) | `Expected a valid JSON string` | starts `The text is not JSON`, contains the parser's `SyntaxError` text |

Also restated in `Policy.test.ts`: "rejects malformed JSON" now asserts `PolicyNotJson`; the valid 60,000-deep text asserts `PolicyDecodeTooDeep`; the KT-02 comment no longer describes a fallthrough.

## Deviations from Plan

None - plan executed exactly as written.

## Verification

- Core vitest (UntrustedSeams, Policy, SinkCodec, DecisionWire): 277 passed; devtools ExplorerSession: 47 passed; whole `pnpm vitest run`: 4674 passed
- `pnpm exec tstyche packages/core/test/Errors.tst.ts`: ACL021 pin passes
- `pnpm typecheck`, `pnpm lint` (house-style clean), `pnpm circular`: clean
- The structure check script and the `Flips:` commit check: pass
- `pnpm spec:api` not run; expected red until 30-07

## Known Stubs

None.

## Threat Flags

None. `PolicyNotJson.message` echoes the caller's own input (T-30-05, accepted).

## Self-Check: PASSED

- FOUND: `packages/core/src/UntrustedDecode.ts`; commit `65e18aeb`
