---
"@qadi/devtools": minor
---

Screens 1 and 2 — the decision log and the inspector — in a dock the host
mounts.

`DevtoolsDock` renders a chronological table of every record from every wired
sink, with the environment as a badge on the row rather than a mode of the tool:
the cross-environment story is what the timeline exists to show, and a switcher
would hide exactly that. Clicking a row opens the inspector; clicking a pair
badge moves to the partner in either direction.

Three rendering rules are tests rather than conventions, because each is a
conclusion a reviewer acts on:

- **An `EvaluationError` is ERROR, never DENY.** The three classes differ in
  treatment — tinted, solid, outlined — not only in hue, so the distinction
  survives a reader who cannot tell the colours apart.
- **A short-circuited node reads "never resolved".** Rendering it as a cross
  would say the policy rejected something it never examined.
- **A trace truncated below the root reads "not disclosed".** That is a
  disclosure boundary rather than a defect, and it is distinguishable from
  short-circuiting because a composite that short-circuits always evaluates its
  first child.

The inspector states what it cannot know rather than guessing: per-duty
obligation state is unobservable — a handler receives the whole set and reports
once — an absent `cache` is worded differently from `"miss"`, and a selection
dropped by capacity says the buffer moved on rather than silently emptying. A
denial gets no field panel at all, because `Deny` carries neither
`visibleFields` nor `obligations`: it permits nothing, so it has nothing to
narrow and nothing it can oblige.

Nothing runs on import. The package declares `"sideEffects": false`, so a module
whose only job is a side effect would be droppable — an overlay that installed
itself would vanish in the production build nobody tests. Styles are inline
objects for the same reason and because there is no CSS pipeline to put them in.

**Three of the six topologies still have no rendered surface.** A backend-only
service, a serverless function and a replicated server have nowhere to host an
in-page dock. Their decisions are reachable at `/__decisions` and the model that
merges them imports no React, so a served page or a CLI is a second shell over
the same model — but neither is written, and the documents say so.
