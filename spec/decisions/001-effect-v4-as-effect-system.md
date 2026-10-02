# ADR-QD-001: Effect v4 is the effect system

> **Status:** Accepted
> **Date:** 2026-07-25

## Context

The predecessor library modelled failure with a hand-rolled `Result<T, E>` type.
That worked, but it left three concerns unmodelled: dependency injection (solved
by a bespoke container), asynchrony (solved by a parallel set of `*Async`
functions), and observability (solved by three separate notification ports).

Each of those has an established answer in Effect. Adopting it collapses four
mechanisms into one.

Effect v4 is in beta at the time of writing. It differs substantially from v3:
`Context.Service` replaces `Context.Tag` and `Effect.Service`, layers are no
longer auto-generated, `Schema.Union` takes an array, and a long list of
functions were renamed.

## Decision

Effect v4 (`>=4.0.0-beta.100`) is the effect system. `Result` is retired.

The beta status is accepted deliberately rather than overlooked. To bound the
risk, `packages/core/test/v4-api-smoke.test.ts` pins every v4 API the design
depends on, so a breaking bump surfaces in one file rather than diffused across
the codebase.

## Consequences

**Positive**:

- One error channel, one dependency mechanism, one concurrency model.
- Tracing, structured logging and metrics arrive for free, deleting the audit,
  event-sink and span-sink ports the predecessor maintained by hand.
- `TestClock` makes evaluation timing deterministic and therefore assertable.

**Negative**:

- Effect is a large dependency and a real learning curve for contributors.
- The v4 beta may introduce breaking changes before release.

**Trade-off accepted**: the canary test converts "a beta bump broke something
subtle" into "one test file fails loudly", which is a manageable maintenance
cost for a substantial reduction in bespoke machinery.

---

> **Amendment (2026-10-02, Effect v4 reached stable `4.0.0`):** the earlier policy, "`effect` pinned
> exact and published as every package's runtime `dependency`", is retired; its exit plan in
> `pnpm-workspace.yaml` named this moment. Now:
>
> - The dev catalog follows npm's `rc` dist-tag for `effect`, `@effect/vitest`, `@effect/platform-node`
>   and `@effect/atom-react`; `pnpm-lock.yaml` pins what is installed (rc.118 today). The tag stops
>   moving once Effect stops publishing rcs, at which point switch it to `latest`.
> - Every `@qadi` package declares `effect` (and `@qadi/react` also `@effect/atom-react`) under
>   `peerDependencies` via the `peer` catalog, `^4.0.0-rc.118`, which also accepts stable `4.0.0`. The
>   reason for a peer rather than a caret `dependency` is unchanged from the exact-pin days: the public
>   API is made of Effect classes, so a consumer holding a second `effect` copy gets a silent type
>   mismatch, and a peer guarantees one copy. Consumers now install `effect` themselves.
> - The floor is rc.118 and not rc.116 because rc.118 moved the modules this repo imports out of
>   `unstable/`: `effect/unstable/http` is now `effect/http`, `unstable/httpapi` is `effect/http-api`, and
>   `unstable/reactivity`, `encoding`, `persistence` and `devtools` dropped the `unstable/` segment.
>   Source cannot import both spellings, so rc.116 and rc.117 are no longer supported.
> - ADRs 014, 035, 036 and 072 still name the old `effect/unstable/*` paths; they record what was true
>   when they were written.
