# ADR-QD-037 — Two new merge gates: no circular imports, and type-level tests that outlive a comment

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-ADR-037                                   |
> | Revision       | 1.0                                             |
> | Effective Date | 2026-08-22                                     |
> | Status         | Accepted                                       |
> | Author         | Qadi Engineering                               |
> | Classification | Architectural Decision                         |
> | Change History | 1.0 (2026-08-22): Initial release (CCR-QD-048) |

---

## Context

Two gaps, found the same way most gaps in this specification's history have
been found: not by review, but by a tool that checks the thing directly.

**Nothing checked for a circular import.** An `Effect`-service-heavy codebase
— every module a `Context.Service` plus a `Layer`, wired together across
`packages/core/src`'s two dozen files and now `packages/http/src`'s five —
is exactly the shape where a cycle creeps in silently: module A's service
layer imports module B's type for a field, B's test helper imports A's
constructor, and nothing before this ADR would have noticed until a bundler
or a runtime import order did.

**Every type-level guarantee this codebase carries lived as a
`@ts-expect-error` comment inside a `vitest` `it()` that never runs its own
body.** `packages/core/test/Qadi.test.ts`'s witness-distinctness test is the
clearest example: `it("refuses a witness for one permission...", () => { void
Qadi.guard(...)(...); })` — the assertion is that a line marked
`@ts-expect-error` fails to compile, checked only as a side effect of
`pnpm typecheck` running over the whole test tree. This works, but it is a
comment a future edit can delete without anything noticing, and it says
nothing about *why* a type fails to compile — only that it does.

The `packages/http` investigation (`packages/http/test/http.test.ts` and the
`.tst.ts` files beside it) found real, load-bearing type-level bugs by reaching for a dedicated
type-testing tool, `tstyche`, ad hoc — installed mid-investigation, on
request, to root-cause a `Layer`/`Effect` type-inference question the
`@ts-expect-error` technique has no way to express (`does this `Exclude`
actually narrow an open generic, or does the annotation just claim it does`).
It answered that question in one assertion. Left uninstalled and
unformalized, the next such investigation starts from zero again.

## Decision

**Two new merge gates**, `pnpm check` steps 5 and 6, run between the
lint family and the runtime test suite — cheap enough that a drift in
either fails before the slower gates even start, the same reasoning
[Definitions of Done](../process/definitions-of-done.md) already gives for
running the doc-examples check before mutation testing.

### `madge --circular`, gate 5

```
madge --circular --extensions ts,tsx packages/*/src
```

Scoped to every package's `src/` via a glob, `packages/*/src` — `core`,
`http`, `promise`, `react`, `testing` alike, not named individually, so a
sixth package needs no edit here to be covered. `--extensions ts,tsx`
covers `@qadi/react`'s `.tsx` files too; the narrower `--extensions ts`
first suggested for this gate would have silently exempted the one package
most likely to accumulate a provider/hook/component cycle.

Run once against the current tree: **clean, no circular dependency found**.
This gate is therefore a regression check from day one, not a backlog of
existing cycles nobody has looked at — the good case for adding a gate.

`madge` declares a peer dependency on `typescript@^5.4.4` and this workspace
runs `typescript@^7.0.0` (`catalog:`); `pnpm install` reports the mismatch
and proceeds. This is lower-risk than it would be for a type-checking tool:
`madge` parses import/export statements to build a dependency graph — it
does not run the type checker — so a TypeScript version four majors newer
changes nothing about what it can see. Confirmed by running it against this
tree rather than assumed from the warning text.

### `tstyche`, gate 6

`tstyche` is promoted from an ad hoc investigation tool (installed during
the `packages/http` session, run via `pnpm test:tstyche`, `.tst.ts` scratch
files deleted once each question was answered) to a permanent one, with
permanent files:

| File | Pins |
| ---- | ---- |
| `packages/core/test/Qadi.tst.ts` | `Authorized<P>`'s per-permission distinctness — replaces the `@ts-expect-error` version of this test, removed from `Qadi.test.ts` in the same change |
| `packages/http/test/GuardRoute.tst.ts` | `guardRoute` discharges `CurrentSubject` from a handler's own open `R`, and — the other direction, just as load-bearing — does **not** discharge it from `loadResource`'s `LR` |
| `packages/http/test/RequirePermission.tst.ts` | `requiresPermission`/`registerApi` accept a plain, options-less `HttpApiEndpoint`/`HttpApi`; the inline `.annotate()` pattern keeps an endpoint's literal identifier |

Every one of these pins a finding from
[ADR-QD-036](./036-qadi-http-package-shape.md) revision 1.2 — a real, already-shipped-once
bug, not a hypothetical one written to give the new tool something to do.

**`tstyche` does not yet know about TypeScript 7, and this is recorded
rather than hidden.** `tstyche --list` names its highest fetchable version as
`6.0.3`; the workspace runs `typescript@^7.0.0`. Left at its default
(`target: "*"`), `tstyche` silently fetched `6.0.3` into
`~/Library/TSTyche/typescript@6.0.3` and ran against it — a version this
repository does not otherwise use, chosen by a tool default rather than a
decision, which is the exact "silent drift" this ADR exists to close off
elsewhere. `tstyche.json` now pins `"target": "6.0.3"` explicitly: still a
different compiler than `tsc -b` runs, but a *named, deliberate* one instead
of whatever the latest fetchable release happens to be when the cache is
cold. `tstyche.json` also pins `"tsconfig": "tsconfig.test.json"`, so it
resolves against this workspace's own `verbatimModuleSyntax`/
`exactOptionalPropertyTypes` settings rather than tstyche's built-in
baseline compiler options.

**The consequence, stated plainly: a `.tst.ts` assertion passing does not
prove the same code type-checks under TypeScript 7.** It proves the
assertion holds under 6.0.3. For the four assertions this ADR ships, that
gap is low-risk — each is a first-order relation (`Extract<R, X> toBe<never>`,
literal-type equality) unlikely to diverge between a recent TypeScript 6 and
7 — but a future `.tst.ts` file exercising a genuinely 7-specific feature
would need `pnpm typecheck` as the actual authority, with `tstyche` treated
as a second, narrower opinion rather than the final one. Revisit this note
once `tstyche` ships a TypeScript 7 target; until then, `pnpm typecheck`
remains gate 1–2 and is not replaced by this one.

## Alternatives considered

**An ESLint `no-cycle` rule instead of `madge`.** This workspace lints with
`oxlint`, chosen precisely to avoid ESLint's plugin ecosystem and
configuration surface; adding an ESLint dependency for one rule would
reopen a question already settled. `madge` is a standalone CLI with no
lint-framework dependency, which is the shape every other tool in this
workspace's dependency list already takes (`oxlint`, `oxfmt`, `stryker`).

**Leaving the witness-distinctness guarantee as `@ts-expect-error`.**
Defensible on its own — it is checked by `pnpm typecheck`, which already
runs. Rejected once `tstyche` was in the tree for a better reason: the
`@ts-expect-error` form can only assert "this line fails to compile," not
"this specific relation holds and this other one doesn't" — the
`GuardRoute.tst.ts` pin needs exactly that second, sharper shape
(`Extract<R, CurrentSubject>` is `never` in one case and `CurrentSubject` in
the other), which `@ts-expect-error` has no vocabulary for at all.

**Pinning `tstyche`'s target to a TypeScript 7 prerelease build manually,
outside its own version-fetch mechanism.** Rejected: `tstyche`'s type
tester is written against its own bundled compiler API surface per version;
pointing it at a TypeScript release it has never been validated against
would trade a known, documented gap for an unknown, undocumented one.

**Not gating `tstyche` at all, keeping it purely investigative.** Rejected
once four real, previously-shipped-and-shipped-broken findings existed to
pin — the same reasoning [ADR-QD-025](./025-mutation-testing.md) already
gives for mutation testing: an ad hoc pass whose results live only in an ADR
paragraph is evidence nobody else can reproduce, and this workspace already
rejected that shape once.

## Consequences

**Positive**:

- A circular import fails the build the same day it's introduced, not
  whenever someone happens to run `madge` by hand.
- Four real type-level bugs this session found are now regression-tested,
  not just fixed and written up.
- The witness-distinctness guarantee reads as an assertion about a relation,
  not a comment next to one.

**Negative**:

- `pnpm check` gains two more sequential steps — both fast (under two
  seconds combined against a pipeline already spending ~2.5 minutes in
  mutation testing), but two more things that can fail for an unrelated
  reason (a `tstyche` version bump changing what `6.0.3` accepts, say).
- `tstyche`'s TypeScript-version gap is a real, standing caveat on every
  `.tst.ts` assertion in this repository, not fully closed by this ADR —
  recorded so it stays visible rather than because it is resolved.
- `madge`'s peer-dependency warning on every `pnpm install` is now a known,
  accepted noise rather than a defect to chase, but it is still noise on
  every install until `madge` itself declares TypeScript 7 support.

---

_Related: [ADR-QD-025](./025-mutation-testing.md) · [ADR-QD-034](./034-the-switch-exception-is-measured.md) · [ADR-QD-036](./036-qadi-http-package-shape.md) · [Definitions of Done](../process/definitions-of-done.md)_
