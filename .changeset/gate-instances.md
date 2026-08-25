---
"@qadi/react": minor
"@qadi/devtools": minor
---

A guard can say that it exists, and the devtools can point at it.

`QadiProvider` takes `instrument`, off by default. With it on, every `<Can>`,
`<Cannot>`, `useCan`, `useDecision` and `useDecisionSuspense` records its policy,
its resource and what it rendered, and the two component guards wrap their output
in a `display: contents` span — which generates no box, so no layout changes.

The React panel lists those under each question and offers two directions:
**highlight**, which draws over every guard asking a question, and **pick**, which
outlines the guard under the pointer and selects its row. A guard that rendered
nothing is still pointed at, which is the answer to "why is this button missing".

This reverses a documented conclusion. The panel previously said a per-instance
view was unobtainable, on the grounds that `Atom.family` keys structurally and so
ten gates on one policy are one atom. That is true of the *atom layer* and does
not follow for components; the panel is still keyed by question, with the guards
listed underneath.

Nothing is a breaking change. `instrument` defaults to `false`, and off means no
registration and no wrapper element — the DOM is byte for byte what it was.
