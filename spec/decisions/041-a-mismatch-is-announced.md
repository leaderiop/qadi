# ADR-QD-041 — A hydration mismatch is announced, not resolved

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-ADR-041                                   |
> | Revision       | 1.0                                            |
> | Effective Date | 2026-08-23                                     |
> | Status         | Accepted                                       |
> | Author         | Qadi Engineering                               |
> | Classification | Architectural Decision                         |
> | Change History | 1.0 (2026-08-23): Initial release (CCR-QD-056) |

_Follows: [ADR-QD-039](./039-a-seed-is-not-an-authority.md), which made the
client's answer supersede the seed and said nothing about telling anyone._

---

## Context

[ADR-QD-039](./039-a-seed-is-not-an-authority.md) fixed a real bypass: a
server-rendered allow no longer outlives this client's own denial. It fixed it
**silently**, which is correct for the decision and wrong for the developer.

What a mismatch looks like from outside is a guarded control that renders on
first paint and disappears on hydration. On every page. With no explanation. The
common cause is not a subject whose grants changed in the last two hundred
milliseconds — it is a client wired differently from the server, most often a
client with no `RelationshipResolver` where the server has one. That is a
configuration error that presents as a rendering glitch, which is close to the
worst available presentation for it.

Nothing in this repository had ever reached for `console` or `process.env`, so
there was no precedent to follow and the choice needed making rather than
assuming.

## Decision

### The client's answer still wins; the disagreement is reported alongside

Nothing about precedence changes.
[INV-QD-028](../invariants.md#inv-qd-028-a-seed-never-outlives-the-clients-own-answer)
stands untouched: by the time anything is reported, the client's answer is
already the one in effect. The reporter observes and cannot alter the outcome —
it is handed two decisions and returns `void`.

**Verdict only.** A mismatch is `isAllowed(seeded) !== isAllowed(decided)`. Two
allows differing in `visibleFields` or in obligations are not a mismatch: what
this exists to explain is a control appearing and then vanishing, and treating
every projection difference as a wiring problem would bury the case that matters.

**A failure is not a disagreement.** If the client could not answer, there is
nothing for the server's answer to disagree with, and reporting one would be
[INV-QD-006](../invariants.md#inv-qd-006-failure-is-not-denial) in reverse — an
outage described as a difference of opinion about permission. This is the same
rule [BEH-QD-072](../behaviors/09-react.md) applies to a function `fallback`.

**Once per question.** The seed stays in its atom for the life of the page, so
without a latch every invalidation would re-announce the same stale
disagreement. A closure flag in `seededDecision` gives once-per-question and
absorbs React StrictMode's double render at the same time.

### Two deliveries, because the two audiences are different

```ts
makeQadiAtoms(layer)                                    // warns, in development
makeQadiAtoms(layer, { onHydrationMismatch: report })   // routed, always
```

The default is a `console.warn` in development, which is what a developer who
has read no documentation needs, at the moment they need it. The optional
callback replaces it, and runs in production too — a server and a client
disagreeing about an authorization question is signal worth reporting, and can
indicate a cached page served to the wrong user as easily as a wiring error.

A supplied callback *replaces* the warning rather than adding to it: a caller
routing mismatches to telemetry does not also want them on the console, and one
that does can call `console.warn` itself.

### `console` and `process.env`, confined and justified

Both are ambient globals, which [AGENTS.md §6](../../AGENTS.md) otherwise keeps
out of this codebase — it bans `Date.now`, `performance.now` and
`crypto.randomUUID` on exactly that reasoning. These are the first of either
here, and they are confined to `packages/react/src/HydrationWarning.ts`, out of
the barrel, for the reason `EvaluationId.ts` confines `crypto.randomUUID`: a
boundary living in one named file stays visible rather than dissolving into
convention.

```ts
const isDevelopment = (): boolean =>
  typeof process !== "undefined" && process.env.NODE_ENV !== "production";
```

The literal `process.env.NODE_ENV` text is load-bearing rather than idiomatic.
esbuild and Vite `define` substitute exactly that member expression, so a
production build folds the guard to `false` and eliminates the `console.warn`
with it. `globalThis.process?.env?.["NODE_ENV"]` reads better, cannot throw, and
is **not** substituted — which is why it is not used. The `typeof` guard is what
keeps unbundled ESM from throwing `ReferenceError` in a browser, where `process`
does not exist at all.

`Effect.logWarning` was the obvious house alternative and does not fit: the
detection happens inside an `Atom.readable` derivation, which is synchronous and
has no runtime to run an Effect in. Building one there to log a line would be a
larger intrusion than the global it avoids.

### The message names the policy this client evaluated

```
[qadi] hydration mismatch for HasRole: the server allowed, this client denied —
subject lacks role 'admin'. This client's answer is the one in effect.
```

The tag comes from `decided.trace`, not from `seeded.trace`, and that is not
incidental. A hydrated trace is a reduced projection whose `policyTag` is the
server's root node, and for a payload shipped without `includeTrace` — the
default — it is a stand-in that names nothing
([BEH-QD-147](../behaviors/19-hydration.md)). Only this client's own trace is
guaranteed to describe the policy actually in question. The first draft read the
seed's tag and printed the wrong policy name; the test caught it.

The trailing clause is `decided.reason`, which is where
[ADR-QD-040](./040-an-unwired-port-names-its-absence.md) pays off: a client with
no relationship resolver now says so in that slot, turning "why did this button
vanish" into "no relationship resolver is wired" in one line.

## Consequences

**Positive**:

- The most common hydration mismatch — a client wired differently from the
  server — explains itself the first time it happens, with no configuration.
- Production telemetry for server/client authorization disagreement is available
  to anyone who wants it, through the same hook.
- Nothing about the decision path changes. An atom set with no reporter reads
  exactly the atoms it read before, so callers who do not opt in and do not run
  in development observe no difference at all.

**Negative**:

- **`console` and `process.env` now exist in this repository.** The confinement
  above is a convention, not a gate — nothing fails if a second file reaches for
  either. Adding a house-style rule with this file exempted would be the way to
  make it one, and is deliberately deferred: one occurrence is not yet a pattern
  worth a gate.
- **`typeof process === "undefined"` is unreachable under Node**, so that branch
  is uncovered by the suite. `@qadi/react` has ample headroom against its 90%
  floor; recorded here so it reads as a known cost rather than an oversight.
- **A side effect inside an `Atom.readable` derivation.** Derivations are meant
  to be pure reads. This one calls out on its first non-`Initial` evaluation,
  which is defensible for a diagnostic and would not be for anything the graph
  depends on. The latch keeps it to one call per question no matter how often
  the derivation runs.

**Trade-off accepted**: a default that writes to the console is a default that
some consumers will not want, and they have to pass a callback to silence it.
The alternative — silent unless configured — makes the feature useless to
precisely the developer it exists for, who does not know there is anything to
configure. Defaulting to loud and providing an off switch is the right way round
for a diagnostic.
