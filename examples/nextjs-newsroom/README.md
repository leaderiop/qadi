# Qadi in a Next.js app

Effect is the backend. Qadi decides on the server, seeds those decisions into the
browser, and the devtools dock shows both halves in one timeline.

This is the SSR/hydration row of [the topology
table](../../spec/devtools-spec/00-overview.md) — the one with the most moving
parts and, until this existed, the least evidence. "Next.js" appeared exactly
once in the whole specification: that table cell.

```bash
pnpm build                                  # the packages this consumes
pnpm --filter @qadi/example-nextjs dev      # http://localhost:3210
pnpm --filter @qadi/example-nextjs check    # step 15 of `pnpm check`
```

It consumes `@qadi/*` through their `exports` maps against the emitted `lib/`,
not through the workspace's `src` path aliases — the same resolution any other
consumer gets. `pnpm build` first, therefore.

---

## What is where

| Path | What it is |
| ---- | ---------- |
| `app/api/[[...route]]/route.ts` | The whole Effect HTTP surface, in a dozen lines. `HttpRouter.toWebHandler` returns `(Request) => Promise<Response>`; a Route Handler *is* that. |
| `src/server/api.ts` | Guarded routes, `/__permissions`, `/__decisions` (SSE), and the three port endpoints. Ordinary Effect that would run unchanged behind `HttpServer.serve`. |
| `src/server/runtime.ts` | One `ManagedRuntime` per process, pinned to `globalThis`. |
| `src/server/decide.ts` | Name the questions, decide them in one pass, project the answers. |
| `src/client/Providers.tsx` | `hydrateDecisions` → `initialValues` → `QadiProvider`. |
| `src/client/Dock.tsx` | The dock with **all twelve** `DevtoolsDockProps` fields wired. |
| `src/domain/` | Six policies chosen for coverage: every port, a rule table, a negation, an obligation, field restriction, and the label lattice. |

Four topologies are hosted: client-only (`/spa`), SSR/hydration (`/newsroom`),
separate-origin-over-SSE (the dock's own feed), and serverless
(`/api/edge/decide`, which forwards each record before the invocation ends).

Thirteen routes under `/edge` each make one thing go wrong on purpose. The index
lists them.

---

## What building it found

Every item here was found by **running** the app, and none of them could have
been found by the library's own tests. Two of them by the dev server's own
startup banner. That is the argument for having built it.

### 1. The resource is part of the atom key, so decide against attributes

The first version handed whole `Article`s to a client component and wrapped the
sensitive fields in `<Can>`. Every guard denied correctly and every source
contact was in the HTML anyway — a guard chooses what to **render**, and a prop
crosses before anything is rendered. It is the Next.js hazard in its own words
("Server Components that pass full data objects as props to Client Components can
leak data that should stay server-side") arriving through an authorization
library's front door.

You cannot fix it by shrinking what crosses, either, because `Atom.family` keys
**structurally**: a seeded decision lands only if the client holds a resource
*equal* to the one the server decided against. Whatever you decide against
crosses.

So: **decide against attributes, never against content.** `src/domain/resource.ts`
is six fields a policy matches on and nothing worth reading. The body and the
source travel separately, already narrowed by `project` on the server, and a
field a reader may not see is *absent* rather than hidden.

### 2. `effect/GlobalValue` does not exist in Effect v4

Every published Effect-and-Next recipe uses `globalValue` to survive dev-mode
HMR. It was a v3 module; `effect@4.0.0-rc.110` ships no `GlobalValue` at all. The
two lines it saves are written out in `src/server/runtime.ts`.

### 3. A Route Handler and a Server Component are different module graphs

Measured, not assumed. Two pages share a module-scope value; `app/api/…/route.ts`
gets its own. So the `decisionSinkRing` the pages filled was **not** the ring
`/__decisions` streamed: the backlog held 3 records (the API's own guard checks)
after a page had made eighteen decisions. The symptom is a devtools panel that
looks like a transport bug and is not one.

Anything that must be one thing per process is pinned to `globalThis` —
`src/server/processGlobal.ts`. That is what the `globalValue` recipe was always
for; nobody says why.

### 4. Module scope on a server is request-shared state

Hydration drops were collected into a module-level array, so one visitor's
`PayloadSubjectMismatch` appeared in the next visitor's HTML on a page where no
such thing had happened. Per render now, through a context.

### 5. `readAttribute` consults the subject before the resolver

An attribute *present* on `AuthSubject` never reaches `AttributeResolver` — the
miss-only call is what preserves short-circuiting. The consequence: an attribute
carried on the subject is frozen for the life of that subject object, and a
browser holding it can never learn it changed. `/edge/divergent` could not
diverge until `standing` was taken off the subject.

Static attributes (`clearance`) belong on the subject. Revocable ones must miss.

### 6. A browser-side resolver runs during the server render

A `"use client"` module executes in Node too — that is what puts a settled
control into the HTML. A relative `fetch` throws `TypeError: Failed to parse URL`
there, and letting that become an `AttributeResolveError` renders *could not
decide* on the server for every attribute question, which is a lie: the question
was never asked. `src/client/ports.ts` does not settle on the server, so the
guard reads pending and the seed covers the gap — which is the division of labour
[BEH-QD-067](../../spec/behaviors/09-react.md) describes.

### 7. Next renamed `middleware` to `proxy`, and the rename is the argument

`next dev` on 16.3 says `middleware.ts` is deprecated. The new convention is
`proxy.ts`, and its documentation now says the layer "should not be used as a
full session management or authorization solution", calling the permission checks
it *is* suited to "optimistic". That is `/edge/middleware`'s whole point,
conceded upstream: a proxy is what it always was, and only the name suggested
otherwise. CVE-2025-29927 — a CVSS 9.1 that let `x-middleware-subrequest` skip
the layer entirely — made the point the expensive way first.

`next dev` also writes an `AGENTS.md` and a `CLAUDE.md` into this directory, and
re-creates them if you delete the files. This repository's `AGENTS.md` is its
house-style authority and lives at the root; a second one nested here would be a
competing set of rules. `agentRules: false` in `next.config.ts`.

### 8. Suspending on a question the server cannot answer holds the response open

The App Router awaits Suspense boundaries during the server render, so
`useDecisionSuspense` on an **unseeded, resolver-bound** question suspends a
boundary that never resolves. Measured: still streaming at twenty seconds, which
is where the test gave up rather than where the server did. Seed the question, or
use `useDecision` and render the pending state.

### 9. A `<select defaultValue>` lies after a Server Action

The user switcher looked broken and was not. Switching worked — the cookie
changed and every decision on the page changed with it — and the `<select>` went
on naming the user it had when it first mounted. Measured: three switches in a
row, and it read the same name throughout. That is worse than either outcome on
its own.

A `<select>` with `defaultValue` is **uncontrolled**: React applies the default
at mount and re-applies that same mount-time value on later updates, so a
subtree re-rendered by a Server Action shows the old value however new the props
are. `key={currentUserId}` forces a remount. The alternative is React state,
which would put session state in the client for a control whose whole job is to
report what the *server* thinks.

**It reproduced under `next dev` and never under `next start`** — measured both
ways, with and without the fix, which is why the end-to-end suite cannot guard
it: that suite runs a production build, and it stayed green on the broken
version. The likely cause is dev-mode double rendering. The test is kept for what
it does assert and its comment says plainly that it is not a regression guard.

### 10. A wiring report is only as honest as the context you hand it

**The Services panel said `DecisionSink absent — decisions are made and not
observed` while the sink was feeding the Log directly below it.** `wiringReport`
reports on the context it is given, and the dock was handing it `browserPorts` —
the three resolvers — rather than the layer `makeQadiAtoms` actually runs in. So
it truthfully described a context nobody evaluates in, and called three wired
services absent. It is given `browserLayer` now.

A wiring report that is wrong about the wiring is worse than no wiring report,
because it is the screen you open when you suspect the wiring.

### 11. An SSE connection is bound to the session that opened it

`/__decisions` is guarded by a policy, so the `EventSource` is authorized as
whoever held the session when it connected. The dock built its source **once**,
at module scope, so opening the page as a subject without `devtools:read` got a
refusal that was never retried — and switching to one who has it left the panel
showing the browser's own decisions and none of the server's, indistinguishable
from a broken transport.

The source is now rebuilt when the subject changes, and only then. The panel also
says out loud when the feed was refused, because otherwise its absence looks like
a bug rather than the guard doing its job.

---

## Smaller observations about the API

- **`dehydrateDecisions([])` yields `subjectId: ""`.** The id comes from
  `entries[0]`, so an empty payload matches no subject and is refused as a
  `PayloadSubjectMismatch` of zero entries. Harmless in effect, noise in
  reporting. `src/server/emptyPayload.ts` names its own subject instead.
- **Optional props need a conditional spread at every hop.** `CanProps.resource`
  is `resource?: Resource`, not `resource?: Resource | undefined`, so a consumer
  compiling with `exactOptionalPropertyTypes` — as the library itself does —
  cannot forward one directly.
- **A relational comparison against a `ValueRef` is not expressible.** `Eq`,
  `Neq` and `Dominates` take a ref; `Gte` and `Lt` take a literal number. There
  is no way to say "this resource's `embargoUntil` is at or before this subject's
  now", so `embargoLifted` is derived by the caller, where the clock already is.
- **`AccessDenied.reason` names a rule-table row by index.** For a `rules([...])`
  policy the top node's sentence is `rules[1] denied`, not the `labeled(...)`
  name sitting on that row. The labels are in the **trace**, so an application
  that wants to tell a person why renders `renderTrace(denied.trace)` rather than
  reading the reason. `/edge/action` does.
- **A Server Component *can* import from `@qadi/react`.** The barrel carries no
  `"use client"` and re-exports both sides; `dehydrateDecisions` is reachable from
  an RSC and `next build` is happy. No `@qadi/react/server` subpath is needed.

## Two library bugs it found, and closing them

Both were found here, reduced to a unit test at `@qadi/react`'s public seam, and
fixed in the library. Neither was reachable from an application without a
`DecisionCache` in its layer or a provider around its atoms — which is to say,
neither was reachable from anything the library's own tests did.

### `useInvalidate()` did not invalidate

Pressing invalidate discarded the atoms, recomputed them, and got the previous
answer back from the `DecisionCache` — so the ports were never re-asked and a
revoked grant could not be noticed by the one action that exists to notice it.

**The specification already knew.** `spec/behaviors/25-inspection.md` said it in
as many words: *"an invalidated atom re-evaluating through a warm cache receives
the same cached trace back."* It was written down as a limitation, with
`DecisionCache.clear` offered as the operator's manual remedy. But BEH-QD-069
requires invalidation to *discard every decision*, and a caller who cannot
observe any discarding has not been given that — so the note was describing a
defect rather than drawing a boundary. Invalidation now clears the cache **before**
the atoms recompute; clearing after would clear an entry nothing reads again.

### A disagreement was announced or not depending on how you read the decision

`/edge/divergent`'s verdict really did change from its seed, and
`onHydrationMismatch` never fired. The seed lives in an atom beside the
decision's and is only ever a *dependency* of it — nothing mounts it — so a
registry may drop its value. Under `registry.mount` it survived and the
disagreement was reported; under a `QadiProvider`, which subscribes rather than
mounts, it did not.

Every existing test used the first shape. Every application uses the second. The
announcement now remembers the seed as first observed, so whether a disagreement
is reported depends on the decision rather than on registry lifetime.

---

## Testing

`vitest` covers the round trip and every way it declines to make it — fast, no
browser, no server. Playwright covers what only a real engine can answer, and it
reads **served HTML** wherever the claim is about what the server sent: nothing
waits for hydration and nothing polls, which is what makes "no flash" testable
rather than hopeful.

Four of those tests are the reason a browser is in the merge gate at all. The
lens measures a `display: contents` marker with `Range.selectNodeContents`;
happy-dom has no layout, so `packages/devtools/test/react/Lens.test.ts` stubs the
measurement. The one claim that needed an engine was the one nothing had ever run
in one.
