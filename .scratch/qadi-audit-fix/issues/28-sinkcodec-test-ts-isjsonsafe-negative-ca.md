Type: task
Status: resolved
Severity: MED
Source: reports/audit-2026-09-06/dashboard-50-agent.html — Core Tests — Sinks & Records agent

## Question

Fix the following audit finding in `packages/core/test/SinkCodec.test.ts`:

isJsonSafe negative-case suite omits non-finite numbers, and the guard itself returns true for NaN/Infinity — values JSON.stringify silently renders as null, violating the guard's own documented contract ("round-trip without lying"). Sparse array holes (also falsified to null by …

## Done when

- The described defect no longer reproduces (add/adjust a test that pins the corrected behavior where none already covers it).
- The fix follows AGENTS.md conventions (Effect v4 style, `Context.Service`, `Data.TaggedError`, `Match` not `switch`, no `as`/`any`/`!`, etc).
- `pnpm check` (or the narrowest correct subset: typecheck + the affected package's tests) passes.
- Change is committed atomically with a message describing the fix.

## Answer

`isJsonSafe` treated every `number` as safe, including `NaN`, `Infinity` and
`-Infinity` — but `JSON.stringify` silently renders all three as `null`
(neither throwing nor omitting the key), which is exactly the kind of lying
the guard's own doc comment says it exists to catch. Fixed the guard itself:
the `number` branch now returns `Number.isFinite(value)` instead of `true`
unconditionally (narrowed via a direct `typeof value === "number"` check
rather than reusing the old `t` variable, to stay `as`/cast-free).

Added the missing negative-case tests in `SinkCodec.test.ts`: `NaN`,
`Number.POSITIVE_INFINITY` and `Number.NEGATIVE_INFINITY` are refused both at
the top level and nested inside an object/array; a companion positive test
pins that ordinary finite numbers (`0`, `-0`, negatives, `Number.MAX_SAFE_INTEGER`)
are still accepted, so the fix narrows exactly the non-finite case rather than
numbers generally.

The ticket's finding text also mentions sparse array holes ("also falsified to
null by …") but is truncated at the source (`reports/audit-2026-09-06/dashboard-50-agent.html`
itself ends the sentence with an ellipsis, and `map.md` separately notes many
findings in this audit run have no recoverable full text). Per this ticket's
explicit scope (non-finite numbers), sparse-array handling was left
unaddressed here rather than guessed at.

`pnpm --filter @qadi/core typecheck` and `pnpm --filter @qadi/core test` both
pass (812 tests).
