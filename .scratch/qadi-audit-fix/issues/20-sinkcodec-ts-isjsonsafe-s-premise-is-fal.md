Type: task
Status: resolved
Severity: MED
Source: reports/audit-2026-09-06/dashboard-50-agent.html — Sinks & History agent

## Question

Fix the following audit finding in `packages/core/src/SinkCodec.ts`:

isJsonSafe's premise is false: HasCustom.params is a second caller-supplied `unknown` that reaches the wire, and neither consumer of the guard covers it

## Done when

- The described defect no longer reproduces (add/adjust a test that pins the corrected behavior where none already covers it).
- The fix follows AGENTS.md conventions (Effect v4 style, `Context.Service`, `Data.TaggedError`, `Match` not `switch`, no `as`/`any`/`!`, etc).
- `pnpm check` (or the narrowest correct subset: typecheck + the affected package's tests) passes.
- Change is committed atomically with a message describing the fix.

## Answer

`isJsonSafe` needed no code change — it already walks an arbitrary `unknown`
object graph correctly, and a `Policy` (including a `HasCustom` node's
`params`) is exactly that. The gap was that its doc comment claimed
`SinkRecord.resource` was "the one caller-supplied `unknown` value that
reaches the wire", which is false: `HasCustom.params` (ADR-QD-055's escape
hatch) is a second one, and both real-world callers — `@qadi/audit`'s
`encodeAuditEntry` and `@qadi/http`'s decision-stream route — were written
against that false premise and checked only `resource`.

Fixed the doc comment, and added `isRecordJsonSafe(record: SinkRecord): boolean`
— a new export that runs `isJsonSafe` over **both** surfaces a `SinkRecord` can
carry (`resource` and `policy`), so a caller checks the whole record in one
call instead of reaching into `policy` for `HasCustom` nodes itself. Updating
`@qadi/audit`/`@qadi/http` to call it is out of this ticket's scope (this
agent owns only `packages/core/src/SinkCodec.ts` and its test file) and is
left for whichever ticket covers those packages' consumers.

`isRecordJsonSafe` is a new public export of `@qadi/core`, so it was added to
`spec/overview.md`'s Public API surface table (`scripts/check-api-surface.mjs`
verified green) without a Change History version bump — minting a new CCR
entry for a narrowly-scoped audit fix was judged out of scope here.

Tests added in `SinkCodec.test.ts` (`describe("isRecordJsonSafe", ...)`) pin:
an `ObligationRecord` is always safe; a `Decision` record with a safe resource
and policy is safe; an unsafe `resource` is refused; a `HasCustom` node with
an unsafe `params` is refused even though a `resource`-only check would have
passed it (the exact regression); and a `HasCustom` node with safe `params` is
accepted.

`pnpm --filter @qadi/core typecheck` and `pnpm --filter @qadi/core test` both
pass (810 tests). `node scripts/check-api-surface.mjs` also passes.
