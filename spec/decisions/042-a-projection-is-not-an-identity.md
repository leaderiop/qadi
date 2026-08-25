# ADR-QD-042 — A lossy projection is not an identity, in prose or in a cache key

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-ADR-042                                   |
> | Revision       | 1.0                                            |
> | Effective Date | 2026-08-23                                     |
> | Status         | Accepted                                       |
> | Author         | Qadi Engineering                               |
> | Classification | Architectural Decision                         |
> | Change History | 1.0 (2026-08-23): Initial release (CCR-QD-057) |

---

## Context

Two defects found while reviewing what stood between the library and a first
release. They looked unrelated — one in an English renderer, one in a cache —
and they are the same mistake: **a value was projected into a smaller space, and
the projection was then used as though it identified the original.**

### `renderExplanation` flattened the tree

`Explanation.ts` joined a composite's children with `" and "` and `" or "` and
never parenthesised. Two policies that are not equivalent produced one sentence:

```
A = anyOf([admin, allOf([editor, onCall])])   // a lone admin IS allowed
B = allOf([anyOf([admin, editor]), onCall])   // a lone admin is NOT allowed

both → "either requires role admin or requires role editor and requires role onCall"
```

The rendering is the *only* thing an administrative screen shows a reviewer
([ADR-QD-027](./027-policy-explanation.md) made it the one place English is
assembled), and a reviewer who cannot recover the policy from it cannot review
it. This library exists because its predecessor's documentation said things that
were not true; prose that maps two policies onto one sentence is that failure in
the library's own output.

The same flattening made `owes` ambiguous. The flagship BDD scenario read

> requires role `editor` and requires permission `doc:publish`, exposing only
> `id`, `title`, and owes `audit.log`

as though the obligation were owed by the whole policy. It is owed by the second
branch alone.

### `DecisionCache` stringified the question

`keyOf` was `JSON.stringify([subjectId, policy, resource, action])`. Its doc
comment defended the property-order miss that produces:

> "a miss costs an evaluation, a wrong hit costs an authorization — and it is
> left as it is rather than optimised into something with a chance of colliding."

**That had it backwards.** `JSON.stringify` is the lossy step, and it collides
four ways:

| Two different questions | One key, because `stringify` |
| ----------------------- | ---------------------------- |
| `{d: new Date(0)}` / `{d: "1970-01-01T00:00:00.000Z"}` | maps a `Date` to its ISO string |
| `{a: 1, b: undefined}` / `{a: 1}` | drops `undefined`-valued properties |
| `{n: NaN}` / `{n: null}` | renders `NaN` as `null` |
| `{f: () => {}, b: 1}` / `{b: 1}` | drops function-valued properties |

A collision serves one question's cached `Trace` as another's answer, verdict
included. That makes
[INV-QD-025](../invariants.md#inv-qd-025-a-cache-hit-differs-from-a-miss-only-in-speed-and-identity)
**false**: a colliding hit differs from a miss in verdict, not only in speed and
identity.

## Decision

### Composite children are parenthesised

Only an **atomic** explanation renders bare as a child: a `Requirement`, or an
`All`/`Any`/`Table` with no parts (those render fixed sentences — "always allows
(an empty conjunction)" — that no following word can attach to). Everything else
is wrapped.

```
A → either requires role admin or (requires role editor and requires role onCall)
B → (either requires role admin or requires role editor) and requires role onCall
```

**The top level is never wrapped**, so a single requirement or a flat conjunction
of them reads exactly as before — 524 core tests passed unchanged, and the one
BDD scenario that moved is the one that was misleading.

One `embed` helper stands at every position that takes a child — `All`/`Any`
parts, `Negated.part`, `Named.part`, `Owing.part`, and each `Table` row's
condition. A rule applied at seven call sites by memory is a rule with a
forgotten site, and the forgotten site is the ambiguity.

`isAtomic` is hoisted to module scope as a `Match.type<Explanation>()`, which is
AGENTS.md §5a's preferred form and available here because — unlike the
dispatchers inside `renderExplanation` — it closes over nothing.

### The cache key is the question itself

`keyOf` is **deleted**. `HashMap` and `Chunk` hold `DecisionCacheKey` directly.

Effect's `Equal`/`Hash` compare plain objects structurally, nested included —
the same property `Atom.family` already depends on for policy sharing in
`@qadi/react` — and they separate a `Date` from its ISO string while treating two
equal `Date`s as equal. Verified before the change rather than assumed.

Two consequences, and the second is the point:

- **Property order now hits.** The documented miss is gone. That is safe in a way
  the old comment's fear was not: it is a *real* structural comparison, not a
  serialization that happens to agree.
- **Distinct questions cannot share a key**
  ([INV-QD-030](../invariants.md#inv-qd-030-cache-key-uniqueness)). This is
  [INV-QD-001](../invariants.md#inv-qd-001-permission-key-uniqueness) one layer
  down — "two distinct permissions never produce the same runtime lookup key" is
  the same property, and the parallel is why the invariant is worded to match.

Note this is a deletion, not an optimisation. The safe behaviour cost a function
and its comment.

## Consequences

**Positive**:

- A rendered explanation can be mapped back to its policy, which is the only
  thing that makes an administrative screen reviewable.
- A cache hit is the same question, always. INV-QD-025 becomes true rather than
  aspirational.
- Cache hit rate improves for free, since property order no longer misses — but
  that is a side effect and was never the reason.

**Negative**:

- **Parentheses in prose.** A deeply nested policy renders with nested brackets,
  which reads worse than the ambiguous flat form did. Accepted: unambiguous and
  awkward beats fluent and wrong, and a caller wanting prettier output renders
  the tree themselves, which is what ADR-QD-027 made the tree for.
- **One BDD scenario's expected string changed**, by design. Recorded here
  because a changed acceptance assertion should always be a decision rather than
  a fix-up.
- **Hashing cost.** Structural hashing walks the policy tree, where `stringify`
  also walked it — comparable, and unmeasured. `pnpm bench` covers dispatch, not
  this. Called out rather than claimed either way.

**Trade-off accepted**: both fixes make output *longer* — more punctuation in a
sentence, more work in a key comparison — to make it *correct*. The predecessor
optimised the other way in both places, and this library exists because of what
that cost.
