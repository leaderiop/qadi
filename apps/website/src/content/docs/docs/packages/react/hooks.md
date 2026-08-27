---
title: Hooks & Can/Cannot
description: The hooks @qadi/react exposes over a decision, and the Can/Cannot components for gating what renders.
---

Every hook and component here reads an atom built by
[`makeQadiAtoms`](/docs/packages/react/). `useDecision` is the primitive; the
rest collapse part of its state for convenience.

## The hooks

```ts
export const useSubject: () => AuthSubject | undefined;
export const useDecision: (policy: Policy, resource?: Resource) => DecisionResult;
export const useCan: (policy: Policy, resource?: Resource) => boolean;
export const useDecisionSuspense: (policy: Policy, resource?: Resource) => Decision;
export const usePolicies: (
  policies: Readonly<Record<string, Policy>>,
) => Readonly<Record<string, DecisionResult>>;
export const useProjected: <A extends Record<string, unknown>>(
  policy: Policy,
  data: A,
) => Partial<A>;
export const useInvalidate: () => () => void;
```

`DecisionResult` is an `AsyncResult<Decision, EvaluationError>` and keeps four
states apart, where a naive `{ allowed, loading, error }` shape keeps two and a
half:

| State | Meaning |
| ----- | ------- |
| `Initial` | Not known yet — no subject, or the first evaluation is running |
| `Success`, `waiting: false` | Decided: allow or deny |
| `Success`, `waiting: true` | The previous decision, while a new one is computed |
| `Failure` | The question could not be answered at all |

`useCan` returning `false` covers the last three of those — pending, denied,
and failed. That is safe for hiding a control and useless for explaining why
it is hidden; reach for `useDecision` when the difference matters.

```tsx
import { useCan, useDecision } from "@qadi/react";
import { hasPermission, isAllowed, permission } from "@qadi/core";
import * as AsyncResult from "effect/unstable/reactivity/AsyncResult";

const canEditDoc = hasPermission(permission("doc", "write"));

// Good enough for hiding a button.
export const useEditable = (): boolean => useCan(canEditDoc);

// Needed when a failure must read differently from a denial.
export const EditPanel = () => {
  const result = useDecision(canEditDoc);

  if (AsyncResult.isInitial(result)) return <span>Checking…</span>;
  if (AsyncResult.isFailure(result)) {
    return <span>Could not check your permissions. Try again.</span>;
  }

  return isAllowed(result.value) ? <textarea /> : <span>Read only</span>;
};
```

`useProjected` applies the same policy to decide both whether a record may be
read and which of its fields come back — an absent field, not a blanked one.
Pending and denied both project to `{}`.

`useInvalidate` discards every decision in the provider's context and
re-evaluates the mounted ones, without the subject object changing — the tool
for "a role was granted server-side and this subject now holds different
powers." While the re-check runs, every consumer reports the decision as
pending, never as its previous value: a decision being re-checked is not a
decision (see [Server-Render Hydration](/docs/packages/react/hydration/) for
the fuller version of this rule).

Calling any of these hooks outside a `QadiProvider` throws
`MissingQadiProviderError`, naming the hook — a wiring mistake is not allowed
to present as a permissions problem.

## `Can` and `Cannot`

```ts
export type DeniedNode = ReactNode | ((decision: Deny) => ReactNode);

export const Can: (props: {
  readonly policy: Policy;
  readonly resource?: Resource;
  readonly fallback?: DeniedNode;
  readonly pending?: ReactNode;
  readonly failure?: ReactNode;
  readonly children: ReactNode;
}) => ReactNode;

export const Cannot: (props: {
  readonly policy: Policy;
  readonly resource?: Resource;
  readonly pending?: ReactNode;
  readonly failure?: ReactNode;
  readonly children: DeniedNode;
}) => ReactNode;
```

`Can` renders its children when the policy allows, and `fallback` (or nothing)
otherwise; `Cannot` is the mirror, rendering `children` when the policy
denies. Where `fallback` (`Can`) or `children` (`Cannot`) is a function, it is
called with the `Deny` that produced it — a guard is already holding that
value at the moment it decides to render nothing, so a caller wanting to
explain *why* a control is absent does not need a second lookup.

```tsx
import { Can } from "@qadi/react";
import { hasPermission, permission } from "@qadi/core";

const canPublish = hasPermission(permission("article", "publish"));
const Spinner = () => <span>Loading…</span>;

export const PublishControl = () => (
  <Can
    policy={canPublish}
    pending={<Spinner />}
    failure={<span>Couldn't check — try again</span>}
    fallback={(deny) => <span title={deny.reason}>Not available</span>}
  >
    <button type="button">Publish</button>
  </Can>
);
```

Two rules keep `failure` from being confused with a denial:

- `Cannot` never renders its children on failure — "we could not determine
  whether you may edit this" is not grounds for telling the user they may
  not.
- A **function** `fallback`/`children` is never called for the failure branch,
  since it exists to explain a refusal, and no refusal happened during an
  outage. `Can` renders `failure ?? fallback` in that case, so an interface
  with no `failure` node still fails closed — supply one wherever an operator
  needs to tell an outage from a denial.

## Gating a specific resource

Pass `resource`; atoms are keyed by policy *and* resource, so each row gets
its own decision while two rows asking about the same document share one.

```tsx
import { Can } from "@qadi/react";
import { eq, hasResourceAttribute, subjectId } from "@qadi/core";

type Doc = { readonly id: string; readonly owner: string; readonly title: string };

const ownsIt = hasResourceAttribute("owner", eq(subjectId()));

export const DocRow = ({ doc }: { readonly doc: Doc }) => (
  <li>
    {doc.title}
    <Can policy={ownsIt} resource={doc}>
      <button type="button">Delete</button>
    </Can>
  </li>
);
```

`doc` must be referentially stable across renders for the atom to be reused —
rows rendered from a stable array are; rows freshly rebuilt on every render
(`items.map((d) => ({ ...d }))`) are not.

See the [React integration guide](https://github.com/leaderiop/qadi/blob/main/spec/appendices/react-integration.md)
for a complete worked application, including wiring the services `@qadi/react`
needs from `@qadi/core` and testing both with and without React.
