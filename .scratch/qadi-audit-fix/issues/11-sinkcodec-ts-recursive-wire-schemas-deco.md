Type: task
Status: resolved
Severity: HIGH
Source: reports/audit-2026-09-06/dashboard-50-agent.html — Trust Boundaries agent

## Question

Fix the following audit finding in `packages/core/src/SinkCodec.ts`:

Recursive wire schemas decode untrusted input with no depth bound — the exact stack-overflow class the 0.4.0 hardening fixed for Policy.fromJson is still reachable through every sink/hydration decode path. `decodeRecordWire` (line 463) decodes `SinkRecordWire`, which embeds `policy: Policy` (recursing through PolicyRef) and the self-recursive `TraceSchema` (children arrays), with no `exceedsJsonDepth` pre-check; the guard exists only at Policy.ts's own entrypoints (fromJson:720-732, fromJsonValue:744-749). Concrete untrusted ingestion surfaces bypass it: examples/nextjs-newsroom/src/server/api.ts IngestRoute (unauthenticated POST /aggregator/ingest → `decodeRecord(body.success).pipe(Effect.result)` — a ~60k-deep nested policy or trace raises a raw RangeError defect instead of the documented 400); packages/devtools/src/model/Source.ts decodeFrame:206 (`Effect.result(decodeRecord(...))` — a RangeError is a defect, not a 'not-a-record' drop, killing the devtools live feed); packages/react/src/Hydration.ts:40-43 (decodePolicy = Schema.decodeUnknownOption(PolicySchema) and DehydratedEntryFields.trace = TraceSchema decode untrusted SSR payload synchronously — extreme depth throws instead of dropping the entry, violating the module's own 'dropped rather than thrown' contract).

## Done when

- The described defect no longer reproduces (add/adjust a test that pins the corrected behavior where none already covers it).
- The fix follows AGENTS.md conventions (Effect v4 style, `Context.Service`, `Data.TaggedError`, `Match` not `switch`, no `as`/`any`/`!`, etc).
- `pnpm check` (or the narrowest correct subset: typecheck + the affected package's tests) passes.
- Change is committed atomically with a message describing the fix.

## Answer

`decodeRecordWire` was rewritten from a bare `Schema.decodeUnknownEffect(SinkRecordWire)`
into a function that runs a structural depth check over the raw, untyped input
*before* handing it to `Schema` — mirroring `Policy.ts`'s own `fromJson`/
`fromJsonValue` guard order exactly. `SinkRecordWire` embeds `Policy` (through
`PolicyRef`) and the self-recursive `TraceSchema` (`children`), both of which
`Schema.suspend`'s recursive descent has no depth cap for, so an adversarial
payload nested past the call stack's limit previously raised a raw `RangeError`
defect during decode instead of a typed failure.

The guard itself (`exceedsJsonDepth`) is a local, non-recursive (explicit-stack)
copy of `Policy.ts`'s private helper of the same name — kept local rather than
imported, since `Policy.ts` does not export it and this fix's ownership is
scoped to `SinkCodec.ts` — bounded at the same `MAX_DECODE_DEPTH` (imported from
`Policy.ts`, already public) and failing with the same `PolicyDecodeTooDeep`
error `Policy.ts`'s guard produces, rather than a second look-alike error type.
`decodeRecord` needed no change: it inherits the corrected error channel by
composition (`Effect.map(decodeRecordWire(input), fromWire)`).

Tests added in `SinkCodec.test.ts` (new `describe` block "the wire's recursive
positions are depth-bounded before Schema recurses") mirror `Policy.test.ts`'s
depth-guard suite: a policy and a trace each nested past `MAX_DECODE_DEPTH` fail
with `PolicyDecodeTooDeep` naming the bound; a policy nested well within it still
decodes; and an extreme depth (60,000, the depth empirically confirmed to
previously overflow the stack) fails through the `Effect` channel rather than as
a defect.

`pnpm --filter @qadi/core typecheck` and `pnpm --filter @qadi/core test` both
pass (805 tests).
