---
"@qadi/react": minor
---

A hydration mismatch now says so.

When a server seed and this client's own answer disagree, the disagreement is
reported. `makeQadiAtoms` takes an optional second argument:

```ts
makeQadiAtoms(layer)                                    // warns, in development
makeQadiAtoms(layer, { onHydrationMismatch: report })   // routed, always
```

The previous release made the client's answer supersede the seed, which is
correct and was silent. Seen from outside, a mismatch is a guarded control that
renders on first paint and vanishes on hydration — on every page, with no
explanation. The usual cause is not a grant that changed in the last two hundred
milliseconds; it is a client wired differently from the server, most often one
with no `RelationshipResolver` where the server has one. A configuration error
presenting as a rendering glitch is close to the worst available presentation
for it.

```
[qadi] hydration mismatch for HasRelationship: the server allowed, this client
denied — no relationship resolver is wired, so no 'owner' relation to 'doc-1'
can be confirmed. This client's answer is the one in effect.
```

Nothing about precedence changes. The reporter is handed two decisions and
returns `void`; by the time it runs, the client's answer is already the one in
effect.

Three scoping rules come with it. A mismatch is a difference of **verdict** —
two allows differing in visible fields are not one. A client-side **failure** is
not a disagreement, because there was no answer for the server's to disagree
with. And it reports **once per question**, not once per re-evaluation.

The callback replaces the console warning rather than adding to it, and runs in
production: a server and a client disagreeing about an authorization question is
signal worth reporting, and can indicate a page cached and served to the wrong
user as readily as a wiring error.

`console` and `process.env` are new to this package and confined to one file
that is not exported. A bundler folds `process.env.NODE_ENV` and eliminates the
warning from a production build.

See ADR-QD-041, BEH-QD-152.
