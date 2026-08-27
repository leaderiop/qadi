---
title: Getting Started
description: Install Qadi, define a policy, and enforce it over an Effect using Layers.
---

Qadi is an Effect-native authorization library for TypeScript. A policy is a plain
value, evaluating it is an `Effect`, and the services it depends on — the current
subject, attribute lookups, and so on — are supplied as `Layer`s like anything else
in an Effect application.

## Install

```sh
pnpm add @qadi/core
```

`effect` is a peer dependency, so it will already be in your dependency tree if
you're using Effect elsewhere in the project.

## A minimal policy

A policy is built from leaf checks — `hasRole`, `hasPermission` — combined with
`allOf`/`anyOf`/`not`. Build it once, at module scope, rather than inline on every
call:

```ts
import { allOf, hasPermission, hasRole, permission, role } from "@qadi/core";

const readDoc = permission("doc", "read");
const editor = role({ name: "editor", permissions: [readDoc] });

// `allOf` requires every child to allow. `fields` restricts what a caller
// sees on an allow — see enforceProjected below.
const canReadTitle = allOf([
  hasRole("editor"),
  hasPermission(readDoc, { fields: ["id", "title"] }),
]);
```

## Guarding an Effect

`enforceProjected` wraps an `Effect` that returns a record: on an allow, only the
fields the policy exposed come back; on a denial, the wrapped effect never runs
and the pipeline fails with `AccessDenied` instead.

```typescript
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import {
  AttributeResolverNone,
  CustomPredicateNone,
  DecisionHistoryUnknown,
  EvaluationIdLive,
  RelationshipResolverNever,
  SignatureHistoryNone,
  allOf,
  currentSubjectLayer,
  enforceProjected,
  fromRoles,
  hasPermission,
  hasRole,
  permission,
  role,
} from "@qadi/core";

const readDoc = permission("doc", "read");
const editor = role({ name: "editor", permissions: [readDoc] });

const canReadTitle = allOf([
  hasRole("editor"),
  hasPermission(readDoc, { fields: ["id", "title"] }),
]);

declare const loadDocument: (id: string) => Effect.Effect<{
  id: string;
  title: string;
  internalNotes: string;
}>;

// Every evaluation reads seven services. Six of them have a fail-closed
// default when nothing more specific applies to your app.
const services = Layer.mergeAll(
  AttributeResolverNone,
  RelationshipResolverNever,
  DecisionHistoryUnknown,
  EvaluationIdLive,
  CustomPredicateNone,
  SignatureHistoryNone,
);

const program = loadDocument("doc-1").pipe(
  enforceProjected(canReadTitle),
  Effect.provide(currentSubjectLayer(fromRoles({ id: "u1", roles: [editor] }))),
  Effect.provide(services),
);
// → { id: "doc-1", title: "…" }   `internalNotes` is never returned.
```

The seventh service, `CurrentSubject`, is supplied per request through
`currentSubjectLayer` — it carries *who* is asking, so it is layered in
separately from the rest rather than merged into one static `services` value.
`fromRoles` builds an `AuthSubject` from a list of roles, flattening inherited
permissions and role names in the process.

## Where to go next

Start with [Tokens & Permissions](/docs/concepts/tokens-permissions/) to see how
`Permission` and role inheritance actually work under the leaf checks used above.
