---
"@qadi/react": patch
---

A `QadiProvider` hidden by an `<Activity>` for longer than a macrotask and shown again no longer throws `registry is disposed`. The provider keeps one registry for its life and recycles it in place a macrotask after its last cleanup, unless it is shown again first, so a re-render while it is hidden no longer builds a second registry.

After such a hide, `initialValues` and the hydration seeds are not applied again: a gate renders pending and then the client's own answer, a seeded gate with no subject, or with a resolver that never answers, stays pending until the client answers, and a host atom passed in `initialValues` returns to its default. A subscription a host holds directly on the registry across the hide is detached by the recycle. No export changes.
