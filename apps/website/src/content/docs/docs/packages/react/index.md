---
title: "@qadi/react"
description: React bindings for @qadi/core — a binding over effect/unstable/reactivity, not a state-management layer of its own.
---

`@qadi/react` is a binding over [`@qadi/core`](/docs/packages/core/), built on
`effect/unstable/reactivity` rather than on component state. Decisions live in
atoms; React subscribes to them.

```sh
pnpm add @qadi/react @qadi/core effect react
```

## What it is, and what it is not

It is not a state-management layer of its own. The React glue is a single
`useSyncExternalStore` call in `QadiProvider`, and the package depends on
nothing beyond `effect` and `react`. `@effect/atom-react`, the official Effect
React binding, was considered and rejected for this — it supplies the same
glue plus Suspense helpers, hydration and scoped atoms this package does not
use, and fifty lines of binding were not judged worth an extra dependency and
a `scheduler` peer.

`makeQadiAtoms(layer)` builds one authorization context: a writable `subject`
atom, an `Atom.family` of decisions keyed by policy (and a second keyed by
policy *and* resource), and an `invalidate` function atom. `QadiProvider` owns
an `AtomRegistry`, seeds the subject into it at construction, and disposes it
on unmount. Every hook is a read of an atom.

```jsx
import { Can, QadiProvider, makeQadiAtoms } from "@qadi/react";

const atoms = makeQadiAtoms(AppLayer); // once, at module scope

export const App = () => (
  <QadiProvider atoms={atoms} subject={currentUser}>
    <Can policy={canPublish} fallback={<Disabled />}>
      <PublishButton />
    </Can>
  </QadiProvider>
);
```

## One evaluation per question

`Atom.family` keys **structurally** — comparing with `Equal.equals` — so two
components asking the same question, even with a policy built inline in two
different places, share one atom and one evaluation. A list of fifty rows
asking `useCan(canEdit)` performs one evaluation, not fifty. The structural
hash is still cached per object, so a policy rebuilt on every render re-walks
the tree to find the atom it was always going to land on; hoisting a policy to
module scope (or `useMemo`-ing it) is a performance habit here, not a
correctness requirement.

## Isolation is structural

Two calls to `makeQadiAtoms` produce two disjoint sets of atoms, and each
`QadiProvider` owns its own registry — nothing to configure, and nothing to
forget, for a multi-tenant application that must not leak a decision between
tenants.

## Server rendering

`QadiProvider` renders under `renderToString`. A policy that needs no resolver
decides during that first, synchronous pass; a policy that reaches a resolver
cannot, however fast the resolver is, and renders its `pending` node instead.
See [Server-Render Hydration](/docs/packages/react/hydration/) for closing that
gap on the client.

`"use client"` is applied per module rather than to the barrel, so functions
like `dehydrateDecisions` stay callable from a React Server Component while
`QadiProvider` and the hooks remain client modules.

For the hooks, `Can`/`Cannot`, and a worked, end-to-end wiring example, see
[Hooks & Can/Cannot](/docs/packages/react/hooks/) and the [full spec
overview](https://github.com/leaderiop/qadi/blob/main/spec/overview.md#qadireact).
