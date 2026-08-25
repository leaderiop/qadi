# @qadi/react

React bindings for [`@qadi/core`](https://www.npmjs.com/package/@qadi/core).
A `QadiProvider`, hooks, and `Can`/`Cannot` gates.

```sh
pnpm add @qadi/react @qadi/core effect react
```

## What it is, and what it is not

A binding over `effect/unstable/reactivity`, not a state manager of its own.
Decisions live in atoms; the React glue is a single `useSyncExternalStore` call.
One evaluation is shared by every component asking the same question — the atom
family keys **structurally**, so two separately built but equal policies share
one atom.

```tsx
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

## A stale decision is not a decision

While a decision is being re-checked, this package reports **nothing** rather
than the previous verdict. For most data staleness is a feature; for
authorization it is an over-permission, however brief — the subject has logged
out, or their grants were just revoked, and the answer on screen is the old one.
Read decisions through `currentDecision`, which is the single place that rule
lives.

## Server rendering

`"use client"` is applied per module, never to the barrel, so
`dehydrateDecisions` stays callable from a React Server Component while the
provider and hooks remain client modules. `<QadiProvider>` server-renders; a
policy needing a resolver renders its `pending` node, which is the correct
answer and the reason hydration exists.

Hydrate on the client with `hydrateDecisions`. A hydrated decision is bound to
one subject, and the client's own answer supersedes the server's seed the moment
it arrives.

## License

MIT
