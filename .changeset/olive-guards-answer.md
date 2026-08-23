---
"@qadi/react": minor
---

`Can` and `Cannot` now hand their denial to the node that replaces it.

`Can`'s `fallback` and `Cannot`'s `children` accept `DeniedNode` — a
`ReactNode`, or a function of the `Deny` that produced it:

```tsx
<Can policy={canEdit} fallback={(denial) => <Hint reason={denial.reason} />}>
  <EditButton />
</Can>
```

The guard was already holding the denial, with its reason and its whole trace,
at the moment it decided to render nothing — and discarded it. "Why is this
control not here?" was the one question the declarative API could not answer.

A plain node stays the common case, so this is a union rather than a required
function and every existing `fallback` keeps working.

One rule comes with it: **a function `fallback` is not reused for the failure
branch.** `failure` still defaults to a node fallback, but a function fallback
is written to explain a refusal, and during an outage no refusal happened — so
it renders nothing instead, which is still closed. Failure is not denial.

See BEH-QD-072.
