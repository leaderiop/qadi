Type: task
Status: resolved
Severity: HIGH
Source: reports/audit-2026-09-06/dashboard-50-agent.html — Evaluator Core agent (orchestrator-verified against source)

## Question

Fix the following audit finding in `packages/core/src/Evaluate.ts`:

HasResourceAttribute reads resource[policy.attribute] with no Object.hasOwn guard, so a decoded policy naming a prototype key resolves inherited members instead of reporting absence

## Done when

- The described defect no longer reproduces (add/adjust a test that pins the corrected behavior where none already covers it).
- The fix follows AGENTS.md conventions (Effect v4 style, `Context.Service`, `Data.TaggedError`, `Match` not `switch`, no `as`/`any`/`!`, etc).
- `pnpm check` (or the narrowest correct subset: typecheck + the affected package's tests) passes.
- Change is committed atomically with a message describing the fix.

## Answer

`HasResourceAttribute`'s arm in `evaluateNode` (`packages/core/src/Evaluate.ts`) read
`resource[policy.attribute]` directly. A decoded `Policy` is untrusted input
(ADR-QD-002), so an `attribute` naming a prototype-chain key — `"toString"`,
`"constructor"`, `"hasOwnProperty"` — resolved the inherited `Object.prototype`
member instead of `undefined`, silently changing what the matcher saw and, for
something like `M.exists()`, turning an absent resource attribute into an
allow.

Fixed by guarding the read with `Object.hasOwn(resource, policy.attribute)`,
mirroring the pattern `readAttribute` already uses for the subject side a few
lines above and the same guard `FieldPath.ts`'s `projectAt` uses for the same
reason. A present-but-`undefined` value and a genuinely absent one both now
fall through to `attributeReason`'s existing "has no value" sentence, which is
already correct for both.

Pinned by a new test, "HasResourceAttribute does not resolve an inherited
prototype member", in `packages/core/test/Evaluate.test.ts`: a policy naming
`toString` against a resource with no such own property now denies with
`resource attribute 'toString' has no value`, where before the fix it would
have allowed (`Object.prototype.toString` is a function, which `M.exists()`
treats as present).

`pnpm --filter @qadi/core typecheck` and `pnpm --filter @qadi/core test` both
pass (802 tests).
