# ADR-QD-154 — One value-to-text function, exported by core

> **Document Control**
>
> | Property       | Value                                               |
> | -------------- | --------------------------------------------------- |
> | Document ID    | QADI-ADR-154                                        |
> | Revision       | 1.0                                                 |
> | Effective Date | 2026-11-14                                          |
> | Status         | Accepted                                            |
> | Author         | Qadi Engineering                                    |
> | Classification | Architecture Decision Record                        |
> | Change History | 1.0 (2026-11-14): Initial release (ARCH-88, CCR-QD-432) |

---

## Context

Four places turn a caller's value into text with `JSON.stringify`, and two of them cannot survive the
values a policy is allowed to hold:

- **Unguarded, and throwing.** Core's `explain` (`Explanation.ts`: the `LiteralRef`, `In` and `Contains`
  phrases) and devtools' remedy label (`Remedies.ts`: `render`) call `JSON.stringify` bare. A `bigint` and
  a cyclic object throw `TypeError`, and so does a `toJSON` or a getter that throws (the sentinel error
  itself escapes). `Matcher.ts`'s `contains(value: unknown)` and `inArray` admit such a value, so a policy
  can carry one. The remedy label's throw escapes `SimulationSession.commit()` synchronously, through
  `derive` and `sweepPlan`, outside any Effect.
- **Guarded, each in its own copy.** `Filters.ts`'s `render` and `SimulationForm.ts`'s `stringify` already
  wrap the call in a `try`/`catch` and answer for a throw.

`explain` throwing breaks [BEH-QD-141](../behaviors/18-explanation.md) (`explain` MUST NOT fail and MUST
NOT refuse a policy) and [INV-QD-021](../invariants.md#inv-qd-021-every-policy-explains) (every policy
explains). Devtools reaches it through the policy rail, `sightingFor` for an unlisted policy, `Gates.ts`,
the inspector and `Replay.ts`, so a panel that only shows a policy can be what falls over.

The obvious home for a shared guard is devtools, which has three of the four copies. It cannot serve
`explain`: core is below devtools and cannot import a module that devtools keeps out of its barrels
([ADR-QD-099](./099-entry-points-are-a-closed-list.md): out of the barrel means not importable).

## Decision

**One function turns an unknown value into text, it never throws, and core exports it.**
(ARCH-88, CCR-QD-432.)

1. **The function.** `valueText(value: unknown): string | undefined`, in a new module
   `packages/core/src/ValueText.ts`, exported from `@qadi/core`'s root barrel and named in
   `spec/overview.md`. It answers the JSON text, or `undefined` when there is none (`JSON.stringify`'s own
   answer for `undefined`, a function and a symbol). It never throws: one `JSON.stringify` inside one `try`,
   and a bare `catch` that binds nothing, so no part of the value, or of an error a value's own code raised,
   survives to be logged or shown. A value with no JSON text and a value `JSON.stringify` refuses both
   answer the same thing, `undefined`, and the caller decides what that means.

2. **Why it is public.** Core cannot import a devtools-private module, devtools depends on core and never
   the reverse, and the entry points of a package are a closed list ([ADR-QD-099](./099-entry-points-are-a-closed-list.md)).
   One rule must serve `explain` and the devtools panels, or the two drift, which is the defect this
   removes. The function therefore sits in core, where both can read it, and is public because a package
   cannot read another's non-barrel module. It is a new export and so a minor change to `@qadi/core`.

3. **Each consumer keeps its own reading of no text**, beside its own code. Only the guard is shared.
   - `explain` writes a `bigint` literal as its digits and `n` (`10n`), a list element by element when the
     list as a whole has no JSON text, and any other value with no JSON form as the fixed words
     `a value with no JSON form`. An `undefined`, a function or a symbol stays the word `undefined`, as
     before.
   - The remedy label (`Remedies.ts`) shows a string bare and otherwise follows the same rule as `explain`.
   - The search text (`Filters.ts`) adds nothing for a value with no text.
   - The simulator form (`SimulationForm.ts`) refuses it, through the round trip it already checks.

   The label rule is the one place a label changes. Every label that rendered before renders the same,
   except an object whose `toJSON` gives nothing: it was written `undefined` in both `explain` and the
   remedy label, but it has no JSON form, so it takes the fixed words. The fixed words contain none of the
   value's content.

4. **Out of scope.** `Inspect.ts`'s `outsideUnion` and `QuestionsPanel.tsx`'s `resourceOf` are not folded
   in: neither can throw, and folding them in would change what they show.

## Alternatives considered

- **A devtools-private module, and a separate guard in core.** Two guarded functions and two rules for the
  same question, which is the drift the decision removes: the label a policy shows in a panel and the
  sentence `explain` writes for it could differ.
- **A core module reached by devtools through a new subpath.** [ADR-QD-099](./099-entry-points-are-a-closed-list.md)
  makes each entry point a reasoned edit to a closed list, a cost out of proportion for one function that
  every consumer would also import by name anyway.
- **Exporting the label rule as well** (the bigint `n`, the fixed words). `explain` quotes a string and the
  remedy label shows it bare, and the search text and the form read no text differently again, so a shared
  label rule would take a parameter per reading. Each reading stays with its consumer and only the guard is
  shared.
- **A function answering a `Result` or an `Effect`.** Every caller is a pure, synchronous renderer, and
  `undefined` is `JSON.stringify`'s own answer for no text; a wrapper type would be one more thing to
  unwrap at each of four sites.
- **A `try`/`catch` in each caller.** That is the shape of the defect: two callers wrote it and two did not.

## Consequences

- `@qadi/core` is a minor: a new export, and `explain` no longer throws on a `bigint` or a cyclic literal,
  so [BEH-QD-141](../behaviors/18-explanation.md) holds again.
- `@qadi/devtools` is a patch: the remedy table and the session commands no longer throw, and no second
  guard stays in devtools (`SimulationForm.ts`'s private `stringify` is deleted and `Filters.ts` reads
  core's).
- A value with no JSON form is shown, not skipped: a remedy whose witness really satisfies the policy is
  still offered and still applies, and only its label degrades.
- `spec/overview.md` names the new export (`check-api-surface.mjs`, merge gate 13).

## Related

[ADR-QD-099](./099-entry-points-are-a-closed-list.md),
[ADR-QD-047](./047-a-headless-devtools-model.md),
[INV-QD-021](../invariants.md#inv-qd-021-every-policy-explains),
[BEH-QD-141](../behaviors/18-explanation.md).
