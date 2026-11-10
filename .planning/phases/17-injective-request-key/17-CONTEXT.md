# Phase 17: A request key that is actually injective - Context

**Gathered:** 2026-11-10
**Status:** Ready for planning
**Ticket:** ARCH-65 · review candidate #2 (Strong, defect) + the v1.0 Known Issue "devtools replay: the other four
ports' `none` answers still grant under `not(...)` on a capture miss"
**Read first:** `.planning/phases/_SHARED-CONTEXT.md`

<domain>
## Phase Boundary

`@qadi/core`'s `PortKey.ts` becomes a kind-tagged, injective encoding: `key(a) === key(b)` if and only if
`Equal.equals(a, b)`. All five port descriptions derive their `key` from it instead of each hand-writing
`JSON.stringify([...])`. The ADR-QD-094 key law is tested once, as a property at `PortKey`'s interface, and the
per-port conformance rows only check that each argument reaches the key.

The devtools capture miss policy is decided for the four ports still undecided, so that replay cannot fail open.
</domain>

<evidence>
## Evidence (verified by reading at 1721a42; the explorer ran `canonicalKey` with node and saw the collisions)
- `packages/core/src/PortKey.ts:20-45` — `canonicalKey` is `JSON.stringify` with a replacer that sorts objects, Sets
  and Maps. It collides `new Date(0)` with `"1970-01-01T00:00:00.000Z"`, `NaN`/`±Infinity` with `null`,
  `{a: undefined, b: 1}` with `{b: 1}`, and `new Set([1])` with `[1]` (a Map with an array of pairs too; the
  planner checks this). Bigint throws.
- Only `customPredicatePort.key` (`CustomPredicate.ts:220-230`) uses it, over `params`, `resource` and
  `subject.attributes`, all host-supplied arbitrary values. The other four write their own:
  `AttributeResolver.ts:184`, `DecisionHistory.ts:190`, `RelationshipResolver.ts:249`, `SignatureHistory.ts:261`.
- The law: `PortDescription.ts:146-160` (ADR-QD-094). Its tests are examples only:
  `test/PortConformance.test.ts:657-750` (one variant per field, no value-kind variants).
- Consumers that trust the law: devtools capture/replay (`packages/devtools/src/model/Capture.ts:98,229`), and
  `scriptedPort` tables (`PortDoubles.ts:108`). Two questions that collide share one captured answer, which is a
  stale or wrong replay. **Impact (verified 2026-11-10):** evaluation does not use the key, so this is not a production
  grant. The harm is a wrong replay in devtools or a wrong answer from a test double, which can hide or invent a decision during review.
- `Question` and `DecisionCache` define "same" with `Equal.equals`, so the library has two definitions of request
  identity that disagree.
- Prior decision: ARCH-45 D-45-b chose canonical JSON (A) over an `Equal`-valued key (C), calling C "breaking for
  nothing A cannot do". These collisions are the something; fixing A in place keeps that decision.
- Known Issue (PROJECT.md): `Capture.ts:160-240` — signature misses fail closed (v1.0 Phase 2 WR-04). The other
  four ports answer `none` on a miss, and `none` under `not(...)` grants (INV-QD-007 fail-open). "Flipping each
  is one word in Capture.ts. Needs a decision."
</evidence>

<decisions>
## Implementation Decisions
- **D-01 (test first):** RED property test on `1721a42`: for arbitrary values (fast-check `anything()`-like
  arbitraries, including Date, NaN, ±Infinity, -0, undefined-valued keys, Set, Map, nested and bigint), assert
  `canonicalKey(a) === canonicalKey(b) ⇔ Equal.equals(a, b)`. Plus a RED replay test: two custom-predicate
  questions differing only by a `Date` vs its ISO string param, captured then replayed, return different answers.
- **D-02:** the encoding is kind-tagged (each value carries its kind), with canonical ordering for objects, Sets and
  Maps. The planner must decide and document how it agrees with `Equal.equals` on: plain objects/arrays
  (structural only if Effect's `Equal` treats them structurally — **verify against `node_modules/effect`**;
  if `Equal.equals` is reference-based for plain objects, the law's right-hand side must be "structurally equal"
  and the ADR-094 wording follows); `-0` vs `0`; `NaN`; class instances; functions; symbols; cycles (refuse:
  the key is a total function only over acyclic data, so the interface decides what a cycle does: a typed refusal
  or a sentinel, never a stack overflow).
- **D-03:** all five ports derive `key` through `PortKey`. Keys that change text are fine (they are in-process,
  never persisted), **except** where a key crosses a wire or a snapshot: devtools capture files/snapshots, and
  remote-port codecs. The planner greps for persisted keys and plans a format bump or migration if one exists.
- **D-04 (`checkpoint:decision`, one-way for replay semantics):** the four ports' capture miss on replay.
  (A) Every port's unseen request is an outage (fail closed), like signatures (recommended: the user prefers
  complete over simple, and INV-QD-007 is about fail-closed). (B) Per-port, with a stated reason each.
  (C) Keep as is and document it. State honestly what A changes: a replay of a partial capture shows more errors.
- **D-05:** Records: amend ADR-QD-094 (the key law's equality is defined by `PortKey`), or a new ADR; CCR; BEHs for
  the key law and the replay miss policy; traceability; changesets (`@qadi/core` patch or minor, `@qadi/devtools`
  minor if replay semantics change).

### Claude's Discretion
- Encoding format (prefix tags vs nested arrays), as long as it is deterministic and documented.
</decisions>

<canonical_refs>
## Canonical References
- `packages/core/src/PortKey.ts`, `PortDescription.ts`, `CustomPredicate.ts`, `AttributeResolver.ts`, `RelationshipResolver.ts`,
  `DecisionHistory.ts`, `SignatureHistory.ts`, `PortDoubles.ts`, `Question.ts`, `DecisionCache.ts`
- `packages/core/test/PortConformance.test.ts`
- `packages/devtools/src/model/Capture.ts`, `Replay.ts`
- ADR-QD-094; `.planning/milestones/archive-pre-gsd/architecture/ARCH-45-loose-ends.md` (D-45-b); `.planning/PROJECT.md` Known Issues
- INV-QD-007, INV-QD-043 (signature key injective over the requirement)
</canonical_refs>

<deferred>
## Deferred Ideas
- An `Equal`-valued key (ARCH-45 option C).
</deferred>

---
*Phase: 17-injective-request-key · Context gathered: 2026-11-10*
