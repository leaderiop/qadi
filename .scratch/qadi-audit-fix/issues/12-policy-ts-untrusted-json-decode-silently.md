Type: task
Status: resolved
Severity: MED
Source: reports/audit-2026-09-06/dashboard-50-agent.html — Policy ADT & Schema agent

## Question

Fix the following audit finding in `packages/core/src/Policy.ts`:

Untrusted-JSON decode silently strips unknown fields inside a known tag (Effect v4 default onExcessProperty:"ignore"), and the strictness stance is neither pinned by a test nor documented. A persisted policy carrying a typo'd restriction (e.g. {"_tag":"HasPermission","permission"…

## Done when

- The described defect no longer reproduces (add/adjust a test that pins the corrected behavior where none already covers it).
- The fix follows AGENTS.md conventions (Effect v4 style, `Context.Service`, `Data.TaggedError`, `Match` not `switch`, no `as`/`any`/`!`, etc).
- `pnpm check` (or the narrowest correct subset: typecheck + the affected package's tests) passes.
- Change is committed atomically with a message describing the fix.

## Answer

Chose **option (a)**: `onExcessProperty: "error"` — erroring on unknown fields, not
documenting "ignore" as deliberate. ADR-QD-002 already frames `Policy` as crossing
a trust boundary and calls out that decoding should reject malformed input "for
free"; a typo'd key silently vanishing from a persisted-and-reparsed authorization
document is exactly the class of silent data loss that ADR (and its `fieldStrategy`-
required precedent) exists to rule out. Nothing in `spec/` documented `"ignore"`
as an intended contract.

`onExcessProperty` is v4 `ParseOptions` — a decode-call option, not a
`Schema.TaggedStruct`/`Schema.Struct` construction option (confirmed against
`node_modules/effect/dist/Schema.d.ts`: neither constructor takes a third
argument). So the fix is threaded once, as `UNTRUSTED_DECODE_OPTIONS`, at
`Policy.ts`'s two untrusted-JSON entry points — `decodePolicyUnknown` (backing
`fromJsonValue`) and the inline decode inside `fromJson` — rather than per
variant. Because `ParseOptions` propagate through every nested struct a decode
recurses into (confirmed against `SchemaAST.ts`'s object-parser: `options` is
passed unchanged into each property's parser), setting it once at each entry
point covers the whole recursive tree — `Matcher`, `Obligation`, `RuleStruct`
included, not just the top-level tag.

**Regression found and fixed along the way**: turning on `onExcessProperty` forces
`Schema`'s struct decoder onto its generic, per-node generator code path rather
than the tight loop used when no `ParseOptions` are given (v4-rc.112's own "fast
path" comment in `SchemaAST.ts`). That path costs enough extra stack per
recursive level that `fromJson`/`fromJsonValue` started raising a raw
`RangeError` — the exact defect `MAX_DECODE_DEPTH`'s guard exists to keep out —
*inside* the old bound: empirically, nesting between roughly 430 and 440 levels
deep already overflowed, well under the old `DEFAULT_MAX_DEPTH * 8` (512).
`MAX_DECODE_DEPTH`'s multiplier is now `* 4` (256), verified (multiple isolated-
process runs, plus the full existing depth-bound suite run three times) to leave
headroom under the new, lower stack ceiling while still exceeding the ~128 raw
JSON levels a maximally `AllOf`/`AnyOf`-nested, `evaluate`-depth-64 policy needs.
The doc comment on `MAX_DECODE_DEPTH` records the empirical basis, the same way
its existing 60,000-level claim already does.

Tests added in `Policy.test.ts` (new `describe` block "excess-property rejection
— a typo'd field inside a known tag is a decode failure, not a silent drop"):
`fromJson` and `fromJsonValue` both reject an extra unrecognized key alongside an
otherwise well-formed `HasRole`; a nested excess key inside an `AllOf` child is
also rejected (proving the stance holds recursively, not just at the top tag);
and a positive control confirms the same tag with no excess key still decodes.

`pnpm --filter @qadi/core typecheck` and `pnpm --filter @qadi/core test` both
pass (805 tests, run three times to rule out the stack-depth flakiness this fix
uncovered).
