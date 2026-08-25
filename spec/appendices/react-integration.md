# React Integration Guide

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-APP-REACT                                 |
> | Revision       | 1.1                                            |
> | Effective Date | 2026-07-26                                     |
> | Status         | Effective                                      |
> | Author         | Qadi Engineering                               |
> | Classification | Appendix — Worked Example                      |
> | Change History | 1.1 (2026-07-26): Atom keying corrected — structural, not by reference (CCR-QD-013)<br>1.0 (2026-07-26): Initial release (CCR-QD-003) |

---

A worked integration, from wiring to testing. The normative API is
[BEH-QD-065–071](../behaviors/09-react.md); this document shows it in use.

Every `tsx` and `typescript` block below is extracted and type-checked by
`scripts/check-doc-examples.mjs`. Blocks marked `ts` are fragments and are not.

## How the pieces fit

```
        your layer                    makeQadiAtoms(layer)
   AttributeResolver              ┌──────────────────────────┐
   RelationshipResolver  ────────▶│  subject   (writable)    │
   EvaluationId                   │  decision  (family)      │
                                  │  invalidate              │
                                  └────────────┬─────────────┘
                                               │ atoms
                                  ┌────────────▼─────────────┐
       <QadiProvider> ──────────▶│  AtomRegistry            │  one per provider
                                  │  computes · caches ·     │
                                  │  disposes                │
                                  └────────────┬─────────────┘
                                               │ useSyncExternalStore
                            useCan · useDecision · Can · Cannot
```

Three lifetimes, and it is worth being clear about which is which. The **layer**
is your application's wiring and lives as long as the module. The **atoms** are
definitions, not values — also module-scoped. The **registry** holds the actual
decisions and belongs to a mounted provider.

## 1. Wire the services

Qadi needs three things it cannot supply itself: somewhere to resolve
attributes, somewhere to resolve relationships, and a source of evaluation ids.

```typescript
import {
  AttributeResolver,
  CustomPredicateNone,
  EvaluationIdLive,
  RelationshipResolverNever,
  DecisionHistoryUnknown,
} from "@qadi/core";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

/** Attributes come from your own profile service. */
const AttributeResolverHttp = Layer.succeed(AttributeResolver, {
  resolve: (subjectId: string, attribute: string) =>
    Effect.succeed(`${subjectId}/${attribute}`),
});

export const QadiLive = Layer.mergeAll(
  AttributeResolverHttp,
  RelationshipResolverNever,
  DecisionHistoryUnknown,
  EvaluationIdLive,
  CustomPredicateNone,
);
```

The layer must not be able to fail. If yours can — it opens a connection pool,
say — resolve that at startup or call `Layer.orDie`. A resolver that cannot be
built is a wiring defect, and letting it surface as an error on every decision
would report a startup problem as an authorization problem for the life of the
process.

## 2. Define the atoms and the policies

Both at module scope. Atoms are keyed *structurally*, so a policy built inline
in render still shares an atom with an equal one built anywhere else — but the
structural hash is cached per object, so a fresh object every render re-walks the
whole policy tree to arrive at the atom it was always going to find. Hoisting is
a performance habit here, not a correctness requirement.

```typescript
import { allOf, hasPermission, hasRole, permission } from "@qadi/core";
import { makeQadiAtoms } from "@qadi/react";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import {
  AttributeResolver,
  CustomPredicateNone,
  DecisionHistoryUnknown,
  EvaluationIdLive,
  RelationshipResolverNever,
} from "@qadi/core";

const QadiLive = Layer.mergeAll(
  Layer.succeed(AttributeResolver, { resolve: () => Effect.succeed(undefined) }),
  RelationshipResolverNever,
  DecisionHistoryUnknown,
  EvaluationIdLive,
  CustomPredicateNone,
);

export const qadi = makeQadiAtoms(QadiLive);

// Module-level constants. This is the whole memoisation strategy.
export const canReadDoc = hasPermission(permission("doc", "read"));
export const canEditDoc = hasPermission(permission("doc", "write"));
export const canPublish = allOf([hasRole("editor"), canEditDoc]);
```

## 3. Mount the provider

`subject` is whatever your authentication already produces. `undefined` means
"still loading" and is a first-class state, not a placeholder.

```tsx
import type { AuthSubject } from "@qadi/core";
import { QadiProvider, makeQadiAtoms } from "@qadi/react";
import {
  AttributeResolverNone,
  CustomPredicateNone,
  DecisionHistoryUnknown,
  EvaluationIdLive,
  RelationshipResolverNever,
} from "@qadi/core";
import * as Layer from "effect/Layer";
import type { ReactNode } from "react";

const qadi = makeQadiAtoms(
  Layer.mergeAll(
    AttributeResolverNone,
    RelationshipResolverNever,
    DecisionHistoryUnknown,
    EvaluationIdLive,
    CustomPredicateNone,
  ),
);

export const App = ({
  subject,
  children,
}: {
  readonly subject: AuthSubject | undefined;
  readonly children: ReactNode;
}) => (
  <QadiProvider atoms={qadi} subject={subject}>
    {children}
  </QadiProvider>
);
```

No `RegistryProvider`, no runtime prop, no `Suspense` boundary required. The
provider creates its own registry, seeds the subject into it at construction —
so the first render already has it — and disposes it on unmount.

## 4. Gate the interface

```tsx
import { Can, useCan } from "@qadi/react";
import { hasPermission, permission } from "@qadi/core";

const canEditDoc = hasPermission(permission("doc", "write"));

export const Toolbar = () => (
  <Can policy={canEditDoc} fallback={<span>Read only</span>} pending={<Spinner />}>
    <button type="button">Edit</button>
  </Can>
);

/** The same decision as a value, when markup is not what you need. */
export const useEditable = (): boolean => useCan(canEditDoc);

const Spinner = () => <span>…</span>;
```

`useCan` returning `false` covers three different situations — pending, denied
and failed. That is safe for hiding a control and useless for explaining why it
is hidden. When the difference matters, read the decision.

## 5. Read the whole decision

```tsx
import { useDecision } from "@qadi/react";
import { isAllowed, hasPermission, permission } from "@qadi/core";
import * as AsyncResult from "effect/unstable/reactivity/AsyncResult";

const canEditDoc = hasPermission(permission("doc", "write"));

export const EditPanel = () => {
  const result = useDecision(canEditDoc);

  if (AsyncResult.isInitial(result)) return <span>Checking…</span>;

  // A failure is not a denial. An unreachable attribute store means we do not
  // know, and saying "you may not" would send the user — and whoever they
  // complain to — after the wrong problem entirely.
  if (AsyncResult.isFailure(result)) {
    return <span>Could not check your permissions. Try again.</span>;
  }

  return isAllowed(result.value) ? <Editor /> : <span>Read only</span>;
};

const Editor = () => <textarea />;
```

## 6. Decisions about a specific resource

Pass the resource. Atoms are keyed by policy *and* resource, so each row gets
its own decision — and two rows showing the same document share one.

```tsx
import { Can } from "@qadi/react";
import { eq, hasResourceAttribute, subjectId } from "@qadi/core";

// A `type`, not an `interface`: `Resource` is `Record<string, unknown>`, and
// interfaces have no implicit index signature, so they are not assignable to it.
type Doc = {
  readonly id: string;
  readonly owner: string;
  readonly title: string;
};

// "the resource's owner is me". `subjectId()` names the subject's identity;
// `subject(path)` would read its attributes, which is a different thing.
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

This is where the atom graph earns its place. A list of fifty rows asking one
question performs one evaluation per distinct resource, not fifty per policy —
the predecessor re-ran the whole evaluation in every component that asked.

Note that `doc` must be referentially stable across renders for the atom to be
reused. Rows rendered from a stable array are; rows rendered from
`items.map((d) => ({ ...d }))` are not.

## 7. Field-level visibility

The same policy decides both whether the record may be read and which of its
fields come back.

```tsx
import { useProjected } from "@qadi/react";
import { hasPermission, permission } from "@qadi/core";

const RECORD = { name: "Ada", email: "ada@example.com", salary: 120_000 };

const canReadProfile = hasPermission(permission("profile", "read"), {
  fields: ["name", "email"],
});

export const Profile = () => {
  const visible = useProjected(canReadProfile, RECORD);
  return (
    <dl>
      {Object.entries(visible).map(([field, value]) => (
        <div key={field}>
          <dt>{field}</dt>
          <dd>{String(value)}</dd>
        </div>
      ))}
    </dl>
  );
};
```

`salary` is absent from `visible` — not blanked, absent. Pending and denied both
project to `{}`; use `useDecision` when you need to tell them apart.

## 8. Re-checking after authority changes

Authority changes without identity changing. A role granted, a grant revoked, a
document reassigned: same subject id, different powers.

```tsx
import { useInvalidate } from "@qadi/react";

export const RoleEditor = ({ save }: { readonly save: () => Promise<void> }) => {
  const invalidate = useInvalidate();

  const onSave = () => {
    void save().then(invalidate);
  };

  return (
    <button type="button" onClick={onSave}>
      Save roles
    </button>
  );
};
```

`invalidate()` discards every decision in the context and re-evaluates the
mounted ones. Nothing else has to know it happened.

While the re-check runs, decisions report as *pending*, not as their previous
value — a decision being re-checked is not a decision
([ADR-QD-017](../decisions/017-stale-decisions-are-not-decisions.md)). If that
flash is unwelcome for a particular control, `useDecision` hands you the raw
`AsyncResult` and its `waiting` flag, and the choice.

## 9. Suspense and error boundaries

For interfaces that would rather not write pending branches by hand.

```tsx
import { useDecisionSuspense } from "@qadi/react";
import { isAllowed, hasPermission, permission } from "@qadi/core";
import { Suspense } from "react";

const canReadDoc = hasPermission(permission("doc", "read"));

const Body = () => {
  const decision = useDecisionSuspense(canReadDoc);
  return <article>{isAllowed(decision) ? "the document" : "not for you"}</article>;
};

export const Page = () => (
  <Suspense fallback={<span>Checking access…</span>}>
    <Body />
  </Suspense>
);
```

Failures are thrown, so this form needs an error boundary above it. That is the
point: an unreachable attribute store surfaces as an error rather than as a
quietly hidden button.

## 10. Several authorization contexts

One `makeQadiAtoms` call per context. The atoms are distinct objects and each
provider owns its registry, so isolation is structural — there is no setting to
forget.

```tsx
import type { AuthSubject } from "@qadi/core";
import {
  AttributeResolverNone,
  CustomPredicateNone,
  DecisionHistoryUnknown,
  EvaluationIdLive,
  RelationshipResolverNever,
} from "@qadi/core";
import { QadiProvider, makeQadiAtoms } from "@qadi/react";
import * as Layer from "effect/Layer";
import type { ReactNode } from "react";

const base = Layer.mergeAll(
  AttributeResolverNone,
  RelationshipResolverNever,
  DecisionHistoryUnknown,
  EvaluationIdLive,
  CustomPredicateNone,
);

const tenantAtoms = new Map([
  ["acme", makeQadiAtoms(base)],
  ["globex", makeQadiAtoms(base)],
]);

export const TenantScope = ({
  tenant,
  subject,
  children,
}: {
  readonly tenant: string;
  readonly subject: AuthSubject | undefined;
  readonly children: ReactNode;
}) => {
  const atoms = tenantAtoms.get(tenant);
  if (atoms === undefined) throw new Error(`Unknown tenant: ${tenant}`);
  return (
    <QadiProvider atoms={atoms} subject={subject}>
      {children}
    </QadiProvider>
  );
};
```

## 11. Testing

Two levels, and most tests want the first.

**Without React.** Caching, sharing and invalidation are properties of the atom
graph. Proving them needs a registry, not a DOM.

```typescript
import {
  AttributeResolverNone,
  CustomPredicateNone,
  DecisionHistoryUnknown,
  EvaluationIdLive,
  RelationshipResolverNever,
  hasRole,
  isAllowed,
  makeSubject,
} from "@qadi/core";
import { makeQadiAtoms } from "@qadi/react";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as AtomRegistry from "effect/unstable/reactivity/AtomRegistry";

const atoms = makeQadiAtoms(
  Layer.mergeAll(
    AttributeResolverNone,
    RelationshipResolverNever,
    DecisionHistoryUnknown,
    EvaluationIdLive,
    CustomPredicateNone,
  ),
);

export const adminIsAllowed = Effect.gen(function* () {
  const registry = AtomRegistry.make();
  registry.set(atoms.subject, makeSubject({ id: "u1", roles: ["admin"] }));

  const decision = yield* AtomRegistry.getResult(
    registry,
    atoms.decision(hasRole("admin")),
    { suspendOnWaiting: true },
  );

  registry.dispose();
  return isAllowed(decision);
});
```

**With React.** Render inside a provider; no special test harness. Give each
test its own atoms if you want a cold cache, since atoms are module-scoped and
their decisions outlive a single render.

```tsx
import type { AuthSubject } from "@qadi/core";
import { QadiProvider, makeQadiAtoms } from "@qadi/react";
import {
  AttributeResolverNone,
  CustomPredicateNone,
  DecisionHistoryUnknown,
  EvaluationIdLive,
  RelationshipResolverNever,
} from "@qadi/core";
import * as Layer from "effect/Layer";
import type { ReactNode } from "react";

export const withQadi = (subject: AuthSubject | undefined, ui: ReactNode) => {
  const atoms = makeQadiAtoms(
    Layer.mergeAll(
    AttributeResolverNone,
    RelationshipResolverNever,
    DecisionHistoryUnknown,
    EvaluationIdLive,
    CustomPredicateNone,
  ),
  );
  return (
    <QadiProvider atoms={atoms} subject={subject}>
      {ui}
    </QadiProvider>
  );
};
```

## Pitfalls

| Symptom | Cause | Fix |
| ------- | ----- | --- |
| Every render re-hashes the policy tree | Policy built inline; the structural hash is cached per object | Hoist the policy to module scope |
| A list re-hashes per render | Resource objects rebuilt each render | Render from a stable array, or memoise |
| Control flickers on refresh | `waiting` reads as pending by design | Use `useDecision` and decide for yourself |
| Everything denied, nothing loading | No provider above the hook | The thrown `MissingQadiProviderError` names the hook |
| `subject("id")` never matches | `subject(path)` reads attributes, not identity | Use `subjectId()` |
| Outage looks like a denial | `useCan` collapses failure into `false` | Use `useDecision`, or give `Can` a `failure` node |
| `interface Doc` rejected as a resource | Interfaces have no implicit index signature | Declare the resource type as a `type` alias |

---

_Related: [09 — React Integration](../behaviors/09-react.md) · [ADR-QD-014](../decisions/014-react-via-atoms.md) · [ADR-QD-017](../decisions/017-stale-decisions-are-not-decisions.md)_
