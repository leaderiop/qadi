---
"@qadi/react": minor
---

The package declares its client boundary, and server rendering is now tested.

`QadiProvider`, `Can`/`Cannot`, the hooks and the atom graph carry
`"use client"`. `Hydration.ts` and the barrel deliberately do **not**:
`dehydrateDecisions` exists to be called during server rendering, and a blanket
directive would turn it into a client reference a Server Component cannot
invoke. Per-file directives keep both halves reachable through one entry point.

To be clear about what this does and does not change: `"use client"` marks a
bundler boundary, it does not disable SSR. A Client Component is still rendered
to HTML on the first request and hydrated afterwards.

**There was no server-rendering test of any kind.** There is one now, through
`renderToString`, covering the `getServerSnapshot` path React throws without,
and the claim hydration exists for — a seeded decision present in the *first*
HTML rather than after a pending frame.

One thing that test made clear, and which is worth stating: a policy needing no
resolver answers during the server pass and never observes its seed. Hydration
covers policies that reach a resolver, which cannot settle inside a single
synchronous render however fast the resolver is.

**`dehydrateDecisions` now says what it dropped.** It discards every entry not
belonging to the payload's subject — correct, and unchanged — but did so in
silence, so a server that accidentally mixed subjects shipped one row where it
meant to ship a thousand and saw nothing wrong. `DehydrateOptions.onDropped`
takes the same shape as `onHydrationMismatch`: a development-mode warning by
default, replaced by a supplied callback which then runs in production too.

The default message carries a count and nothing else — no subject, no policy. A
dropped decision belongs to another user, and printing it would be the
disclosure the drop exists to prevent.

See BEH-QD-067, BEH-QD-146.
