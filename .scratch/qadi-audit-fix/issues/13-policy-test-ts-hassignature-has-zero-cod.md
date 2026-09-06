Type: task
Status: resolved
Severity: MED
Source: reports/audit-2026-09-06/dashboard-50-agent.html — Policy ADT & Schema agent

## Question

Fix the following audit finding in `packages/core/test/Policy.test.ts`:

HasSignature has zero codec round-trip coverage anywhere in the suite, and the property generator (the file's self-described "standing guard against codec drift", line 466) omits both HasSignature and Labeled from its leaf/tree generators (Labeled is covered only by the hand-writ…

## Done when

- The described defect no longer reproduces (add/adjust a test that pins the corrected behavior where none already covers it).
- The fix follows AGENTS.md conventions (Effect v4 style, `Context.Service`, `Data.TaggedError`, `Match` not `switch`, no `as`/`any`/`!`, etc).
- `pnpm check` (or the narrowest correct subset: typecheck + the affected package's tests) passes.
- Change is committed atomically with a message describing the fix.

## Answer

Confirmed both gaps by grep before touching anything: `HasSignature`/`hasSignature`
appeared nowhere in `Policy.test.ts`, and `Labeled`/`labeled` appeared only in the
combinator unit test (`labeled wraps a policy with a name`), the hand-written
"round-trips a deeply nested tree" test, and the branded-string rejection table —
never in the `FastCheck` property generator's `leaf` or `tree` cases.

Added a `HasSignature` leaf case to the property generator: `meaning` gets no
`segment()` sanitization (it is a deliberately unconstrained `Schema.String` at
the wire level per `Policy.ts`'s own comment on the field), and `signerRole`'s
optional-omission ternary is exercised the same way `depth`'s and `params`'s
already were, via `FastCheck.option`. Added a `Labeled` case to the `tree`
`letrec`'s node `oneof`, alongside `not` — it wraps a full child policy, so it
belongs at the tree level, not the leaf level, and needs `segment()` on its
`label` the same way `not`'s sibling branches don't but `hasRole`'s leaf does,
since `LabelName` is one of the five branded ADT strings.

Also added a dedicated round-trip test, `round-trips HasSignature, with and
without signerRole`, mirroring the existing `hasRelationship`/`hasCustom`
omission tests: it asserts `signerRole` is an absent key (not a key set to
`undefined`) when omitted, and that both the with- and without-`signerRole`
shapes survive `toJson`/`fromJson` unchanged via `deepStrictEqual`. This gives
`HasSignature` explicit, named coverage beyond what the property generator's
random sampling alone would provide, the same way `hasRelationship` and
`hasCustom` each already have both a named test and a generator case.

`pnpm --filter @qadi/core typecheck` and `pnpm --filter @qadi/core test` both
pass (806 tests).
