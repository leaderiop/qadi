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
been found by the library's own tests. That is the argument for having built it.

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

### 7. Suspending on a question the server cannot answer holds the response open

The App Router awaits Suspense boundaries during the server render, so
`useDecisionSuspense` on an **unseeded, resolver-bound** question suspends a
boundary that never resolves. Measured: still streaming at twenty seconds, which
is where the test gave up rather than where the server did. Seed the question, or
use `useDecision` and render the pending state.

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
- **A Server Component *can* import from `@qadi/react`.** The barrel carries no
  `"use client"` and re-exports both sides; `dehydrateDecisions` is reachable from
  an RSC and `next build` is happy. No `@qadi/react/server` subpath is needed.

## One open discrepancy

On `/edge/divergent` the verdict genuinely changes from the seed — the guard is
handed `Success` (the seed), then `Initial+waiting` (the re-check in flight, per
[BEH-QD-151](../../spec/behaviors/19-hydration.md)), then `Success` (its own
denial). `onHydrationMismatch` should fire once
([BEH-QD-152](../../spec/behaviors/19-hydration.md)) and does not; `rechecked`
stays `0`, which means `get.once(seed)` reads `undefined` at announcement time.

The same round trip through a plain `render()` behaves as specified —
`test/seed.test.tsx` proves it — so this is environmental rather than a defect in
`@qadi/react`, and it has not been chased further from here. The end-to-end suite
asserts the **observed** value, so a fix arrives as a failing test rather than as
nothing at all.

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
