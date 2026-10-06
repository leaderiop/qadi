# ADR-QD-078 — A seed is its own type, the atom set owns hydration, and the payload is versioned

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-ADR-078                                   |
> | Revision       | 1.1                                            |
> | Effective Date | 2026-10-04                                     |
> | Status         | Accepted — amends ADR-QD-028, ADR-QD-039, ADR-QD-041, ADR-QD-052; amended 2026-10-06 (version-1 reader removed) |
> | Author         | Qadi Engineering                               |
> | Classification | Architecture Decision Record                   |
> | Change History | 1.1 (2026-10-06): amended — the version-1 payload reader removed in 0.11.0, as scheduled; `DehydratedDecisionsV1`, `DehydratedEntryV1` and `DehydratedPayload` removed (CCR-QD-182)<br>1.0 (2026-10-04): Initial release (CCR-QD-156) |

---

> **Amendment (2026-10-06, the scheduled removal — 0.11.0, CCR-QD-182):** the
> version-1 payload reader is removed in the next minor release, as the
> Consequences below said it would be; this amendment is the follow-up they
> promised.
>
> - `hydrateDecisions` reads `version: 2` payloads only. A payload with no
>   `version` — the format `@qadi/react` 0.9 and earlier wrote — is dropped
>   whole as `UnsupportedPayloadVersion`, the same reason, count and report as
>   any other version this client does not read; no new drop reason, so
>   `ClientHydrationDropReason`, `HydrationMetrics` and `@qadi/devtools`'
>   `MEANINGS` are unchanged in shape. The page re-decides those questions
>   itself, which is what a refused payload always meant.
> - `DehydratedDecisionsV1` and `DehydratedEntryV1` (deprecated in 0.10) are
>   removed, and so is `DehydratedPayload`, which was their union with
>   `DehydratedDecisions`: `hydrateDecisions` and `QadiAtoms.hydrate` take
>   `DehydratedDecisions`.
> - Unlike the record wire, this was always the plan: a payload lives in one
>   cached page, an audit row for years (ADR-QD-096 D-15-d drew that line).
>   ADR-QD-096's own version-1 reader is removed in the same release, by a
>   separate decision recorded in its 2026-10-06 amendment.
>
> The text below is the decision as accepted on 2026-10-04, kept unedited.

## Context

Hydration was one concept spread across about seven modules: the payload codec in
`Hydration.ts`, the seed lookup in `HydrationSeed.ts`, the precedence, announcement
and recheck logic in a 150-line closure inside `QadiAtoms.ts`, three reporters in
`HydrationWarning.ts`, the counter writes in `HydrationCounts.ts`, the declarations
in `@qadi/core`, and the reader in `@qadi/devtools`. A reader debugging "why did
this seed not show" opened five files. Reading it closely turned up five defects
that all had one root — a hydrated decision pretended to be an evaluated one.

**A seed was rebuilt into a core `Allow`/`Deny`.** Those need a `Trace` and a deny
`reason`, so both were fabricated whenever the server withheld them: a reduced
single-node trace with the reason `"hydrated"` (which `<Can fallback={(deny) =>
deny.reason}>` renders), and, for a payload with no `trace` field at all, a trace
whose root was `"AllOf"` — a value its own doc comment called arbitrary, pinned by
a test.

**The Decision was serialized twice.** `SinkCodec.ts`'s module-private
`DecisionSchema` and `Hydration.ts`'s `DehydratedEntryFields` each hand-wrote an
encode and a rebuild, and each invented a sentinel for a missing deny reason
(`"denied"`, `"hydrated"`). ADR-QD-028's rejected alternative, "decisions are not a
wire format", had been overtaken when `SinkRecordWire` started carrying `decided`
across processes (BEH-QD-199, CCR-QD-063).

**`hydrateDecisions` refused an atom set "built elsewhere".** The seed lookup was a
`WeakMap` keyed on the atom set's identity, so `{ ...atoms }` — whose decision atoms
are the real ones — seeded nothing and reported `UnregisteredAtoms`. A property of
the keying, not a defence of anything.

**A malformed envelope threw.** Only the entries were schema-decoded; `{ subjectId:
"u1", entries: 5 }` raised `TypeError: dehydrated.entries is not iterable`, against
the module's own "not throwing is deliberate".

**Two notions of "same subject" disagreed.** `DecisionCache`'s key compares an
`AuthSubject` deeply with `Equal.equals`; the `subject` atom compared `attributes`
shallowly with `Object.is`.

## Decision

**One deep module in `@qadi/react`.** `Hydration.ts` is the public interface and
re-exports, by name, only what a consumer may hold. `HydrationEngine.ts` owns the
payload codec, the seed atoms, the seed-versus-computed precedence
([INV-QD-028](../invariants.md), preserved character for character), the
once-per-registry announcement and the recheck count; it is out of the barrel
([ADR-QD-039](./039-a-seed-is-not-an-authority.md)). `SeededDecision.ts` is a leaf
module the engine and `HydrationWarning.ts` both import, so no cycle (counting
`import type`, ADR-QD-037) forms. `QadiAtoms.ts` keeps only the liveness bookkeeping
the eviction sweep needs, handed over as a `track` callback that runs first inside
the same reader.

**A seed is its own closed type, scoped to `@qadi/react`.** `SeededAllow` and
`SeededDeny` carry the verdict, the visible fields, the obligations, and a tagged
`disclosure` — `Withheld`, or `Disclosed` with the server's own trace and, for a
denial, its reason. `ClientDecision = Allow | Deny | SeededAllow | SeededDeny` is
what a decision atom holds, discriminated by distinct `_tag`s
([ADR-QD-003](./003-tag-discriminant.md)). `permits` reads the verdict of every case;
`isAllowed` from `@qadi/core` rejects a `ClientDecision`, on purpose. Nothing
outside `@qadi/react` changes type: a seeded decision never reaches a
`DecisionSink`, `@qadi/http` or `@qadi/audit`.

**The decision's wire form is one definition in `@qadi/core`.** `DecisionWire` is a
tagged union (an `Allow` cannot carry a `reason`, a `Deny` must), with `encodeDecision`
and `decodeDecision`. `SinkRecordWire` embeds it, with the bytes unchanged
(pinned by golden tests), and the hydration entry derives from it by omitting what
the envelope or the disclosure replaces. The `"denied"` sentinel is deleted.

**The atom set owns hydration.** `QadiAtoms.hydrate` is a closure over the atom
set's own seed atoms; `hydrateDecisions` delegates to it. The seed atoms stay
unreachable, which is ADR-QD-039's actual requirement, and a spread copy or wrapper
seeds the same questions. `UnregisteredAtoms` is therefore unreachable by
construction and is removed from the closed `ClientHydrationDropReason`.

**The payload is versioned and decoded as untrusted.** `DehydratedDecisions`
carries `version: 2`. The envelope is schema-decoded, so `hydrateDecisions` **never
throws**: a non-envelope drops as `MalformedPayload`, any other `version` as
`UnsupportedPayloadVersion`. A payload with no `version` is read by a deprecated
legacy reader that **always** seeds `Withheld` — a v1 trace is indistinguishable
from a real one, and the safe direction is less disclosure. A `Disclosed` trace whose
root tag is not the entry's own policy's `_tag` is dropped as `MalformedEntry`.

**One subject equivalence.** `subjectEquivalence`, exported from `@qadi/core` over
`Equal.equals`, is what the `subject` atom uses, so there is one definition of "same
subject" and an equal-by-structure nested attribute no longer re-runs every mounted
decision.

## Alternatives considered

**Disclosure on core's `Decision`** (`Allow.trace`/`Deny.trace` become `Disclosed |
Withheld`). Rejected as *wrong*, not merely expensive: the evaluator always
produces a trace, so every server-side caller (`@qadi/http`, `@qadi/audit`,
`@qadi/promise`, `renderTrace`, `AccessDenied`'s `TraceSchema`, `SinkRecordWire`)
would handle a case that cannot happen for it, and `AccessDenied`'s wire shape
(ADR-QD-072) would change.

**Seeded classes that reuse `_tag: "Allow" | "Deny"`.** Verdict reads would keep
compiling, trace and reason reads would break. Rejected: two classes sharing one tag
defeat `Match.tagsExhaustive` and ADR-QD-003's single discriminant, and `Equal`
between them is ambiguous.

**A side table keyed on the decision atom**, or a **symbol-keyed property on the atom
set**. The first keeps a module-scope side channel and turns a whole-payload drop
into a per-entry one; the second is rejected as wrong — `Object.getOwnPropertySymbols`
exposes it, which is the seed-atom bypass ADR-QD-039 exists to prevent, and a spread
copies an enumerable one.

**No version.** A shape change would show up as `MalformedEntry` for the length of a
deploy: honest, but indistinguishable from a real malformation.

**Keeping v1 bytes exactly.** Incompatible with a seed type that has no fabricated
trace: v1's `trace` *is* the fabrication.

## Consequences

The changeset is **breaking** for `@qadi/react`: `ClientDecision` and the closed
`DecisionResult`, `currentDecision`'s return type, `useDecisionSuspense`,
`DeniedNode`'s parameter (`Deny | SeededDeny`), `HydrationMismatch.seeded`, the
drop-reason set, `QadiAtoms.hydrate`, and the payload `version`. A consumer
comparing `decision._tag === "Allow"` keeps compiling and now treats a seeded allow
as not allowed — fail-closed, never a grant — and moves to `permits`.

The version-1 reader is removed in the next minor release; a follow-up is filed when
that lands. `@qadi/devtools` reads the same five metrics unchanged; only its
`MEANINGS` table follows the reason set.

---

_Related: [ADR-QD-028](./028-decision-hydration.md) · [ADR-QD-039](./039-a-seed-is-not-an-authority.md) · [ADR-QD-041](./041-a-mismatch-is-announced.md) · [ADR-QD-052](./052-hydration-is-counted-where-both-ends-can-see-it.md) · [ADR-QD-002](./002-schema-derived-policy-adt.md) · [ADR-QD-003](./003-tag-discriminant.md)_
