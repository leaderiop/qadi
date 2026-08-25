---
"@qadi/core": minor
"@qadi/react": minor
"@qadi/devtools": minor
---

Hydration is counted at both ends, and every refusal names its reason.

`dehydrateDecisions` and `hydrateDecisions` returned their entries and forgot
them, so the only hydration number a panel could show was the mismatch count —
and the host had to accumulate that itself. Five metrics now count what crosses
the network, readable with no wiring through `hydrationActivity`.

`hydrateDecisions` had three silent exits: a payload naming another subject, an
atom set `makeQadiAtoms` did not build, and an entry whose policy would not
decode. All three returned quietly, which is indistinguishable from a page with
nothing to hydrate. It gains an optional `onDropped` carrying the reason, with a
development-mode warning by default — the shape `dehydrateDecisions` and
`onHydrationMismatch` already use.

The metric declarations are exported from `@qadi/core` rather than restated in
each package, because `Metric`'s registry key includes the description string: a
reader re-declaring one with a description that differs by a word gets its own
registry entry and reads zero, with no error raised.

Nothing is a breaking change. `hydrateDecisions`'s new parameter is optional, and
the devtools dock's `hydrationMismatches` prop still works and is shown when the
new `hydration` prop is absent.
