<p align="center">
  <img src="./assets/hero.svg" alt="Qadi — Effect-native authorization for TypeScript. Requests flow into the evaluator and come out as Allow or Deny decisions." width="100%">
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@qadi/core"><img src="https://img.shields.io/npm/v/%40qadi%2Fcore.svg" alt="npm version"></a>
  <a href="https://github.com/leaderiop/qadi/actions/workflows/check.yml"><img src="https://github.com/leaderiop/qadi/actions/workflows/check.yml/badge.svg" alt="CI"></a>
  <a href="./LICENSE"><img src="https://img.shields.io/npm/l/%40qadi%2Fcore.svg" alt="license"></a>
</p>

**Qadi** (قاضي, Arabic for *judge*) decides whether a subject may perform an
action on a resource, and which parts of that resource they may see.

You describe access as a **policy**: a small tree of checks such as "has the
`editor` role", "owns this document" or "approved it before". Qadi evaluates
the tree as a single [Effect](https://effect.website) and returns a
**decision**: an allow, which carries the fields the subject may see, or a deny,
which carries the reason. The same policy can guard an API route, gate a React
component, filter a list, or become a SQL `WHERE` clause.

- **One evaluator.** Every entry point (`check`, `enforce`, `filter`, `<Can>`, the
  HTTP middleware) runs the same evaluation. There is no second code path that
  could disagree.
- **Fail-closed.** A store you haven't wired denies. A store that is down fails
  with a typed error. Neither one quietly allows.
- **Field-level.** A decision can return part of a record, not just yes or no.
- **Policies are data.** They round-trip through JSON with a codec that is
  type-checked against the policy type itself, so a policy you store and load
  back cannot come back meaning something else.
- **Observable.** Every decision is a traced span and a record you can audit,
  stream and inspect.

---

## Contents

[Install](#install) · [Quickstart](#quickstart) · [How a decision is made](#how-a-decision-is-made) ·
[Policies](#policies-are-trees) · [Roles](#roles) · [Fields](#field-level-projection) ·
[Ports](#ports-fail-closed-by-default) · [SQL](#push-the-policy-into-the-query) ·
[React](#react) · [HTTP](#http) · [Not using Effect?](#not-using-effect) ·
[Observability](#every-decision-is-observable) · [Models](#access-control-models) ·
[Packages](#packages) · [Why Qadi](#why-qadi) · [Development](#development)

## Install

```bash
pnpm add @qadi/core effect
```

- Node `>=22.12.0`, with npm, yarn or pnpm. This repo's own development is
  pinned to `pnpm@10.17.1`.
- Effect v4 (`effect@^4.0.0`), installed by you. Every `@qadi` package declares
  `effect` as a peer dependency, because its public API exposes Effect classes
  directly (`Context.Service`, `Data.TaggedError`). A second copy in your tree
  would be a silent type mismatch.

## Quickstart

Define a permission and a role, write a policy, and enforce it on a loaded
resource. Any field the policy doesn't grant is dropped:

```typescript
import * as Effect from "effect/Effect";
import {
  EvaluationServicesNone,
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

// Module-level constants: a policy built inline would be a new object per call.
const canReadTitle = allOf([
  hasRole("editor"),
  hasPermission(readDoc, { fields: ["id", "title"] }),
]);

declare const loadDocument: (id: string) => Effect.Effect<{
  id: string;
  title: string;
  internalNotes: string;
}>;

const program = loadDocument("doc-1").pipe(
  enforceProjected(canReadTitle),
  Effect.provide(currentSubjectLayer(fromRoles({ id: "u1", roles: [editor] }))),
  // Every port at its fail-closed default, plus `EvaluationIdLive`. To wire
  // one port, name only it: `Layer.merge(portsLayer({ AttributeResolver:
  // directory }), EvaluationIdLive)` — the ports you leave out keep their
  // defaults, whatever order you write them in.
  Effect.provide(EvaluationServicesNone),
);
// → { id: "doc-1", title: "…" }   `internalNotes` is not returned.
```

## How a decision is made

<p align="center">
  <img src="./assets/evaluation-pipeline.svg" alt="Subject, Policy, an optional Resource and the Ports flow into evaluate, a single Effect. It produces a Decision: Allow with visibleFields, obligations and trace, or Deny with a reason and trace. Report calls return the deny as a value; enforce calls fail with AccessDenied." width="100%">
</p>

Four things go in:

| Input | What it is |
| ----- | ---------- |
| **Subject** | Who is asking: an id, roles, permissions and attributes, provided as `CurrentSubject` |
| **Policy** | What must hold: a tree of checks (see below) |
| **Resource** | What is being decided on, when there is one, such as a loaded row |
| **Ports** | The services a policy may need to look something up: attributes, relationships, history, signatures |

One thing comes out: a `Decision`. An `Allow` carries `visibleFields`,
`obligations` (duties the caller must discharge, such as "write an audit
entry") and a `trace`. A `Deny` carries a `reason` and the same `trace`, so a
denial can always explain itself.

What differs between entry points is only what happens to a deny:

| Reports: a deny is a value | Enforces: a deny is a failure |
| -------------------------- | ----------------------------- |
| `decide` → the `Decision` | `assert` → fails with `AccessDenied` |
| `check` → a `boolean` | `enforce(policy)(effect)` → runs the effect only if allowed and its obligations are discharged |
| | `enforceProjected` / `enforceLoaded` / `enforceProjectedLoaded` → the resource, cut down to its visible fields |
| | `filter` / `filterStream` / `filterProjected` → only the items the subject may see |

A lookup that fails, such as an attribute store timing out, is neither of
these. It travels in the typed error channel as `AttributeResolveError`,
`RelationshipResolveError` and so on. An outage is never turned into an allow,
and never hidden as a deny.

## Policies are trees

<p align="center">
  <img src="./assets/policy-tree.svg" alt="The policy anyOf(hasRole admin, allOf(hasPermission doc:read, hasRelationship owner)). For alice, hasRole fails and the allOf branch asks the RelationshipResolver. For root, hasRole allows immediately and the whole allOf branch is skipped." width="100%">
</p>

A policy is a value built from sixteen node types. Each one is a plain,
serializable object:

| Kind | Constructors |
| ---- | ------------ |
| Who the subject is | `hasRole`, `hasPermission`, `hasAttribute` |
| What they're doing, and to what | `hasAction`, `hasResourceAttribute`, `hasRelationship` |
| What happened before | `hasActed`, `hasNotActed`, `hasSignature` |
| Combining | `allOf`, `anyOf`, `not`, `rules` (`permitWhen` / `denyWhen` under `FirstApplicable`, `DenyOverrides` or `PermitOverrides`) |
| Conditions on an allow | `obliged` (attach an obligation), `labeled` (a security label) |
| Escape hatch | `hasCustom`: your own named predicate, kept deliberately rare |

Attribute checks take **matchers**: `eq`, `neq`, `inArray`, `exists`, `gte`,
`lt`, `contains`, `dominates`, and the structural `fieldMatch`, `someMatch`,
`everyMatch`, `size`. These compare against **references**: `subject("dept")`,
`subjectId()`, `resource("ownerId")`, `action()`, `literal(…)`.

Because a policy is data, Qadi can also work on it without evaluating it:

- `toJson` / `fromJson` round-trip it through untrusted storage. Decoding is
  strict and refuses payloads nested too deep.
- `explain(policy)` turns it into a readable list of requirements.
- `simplify(policy)` removes redundant structure.
- `toPredicate(policy)` compiles it into a row filter ([below](#push-the-policy-into-the-query)).
- `decideSubjects` asks the reverse question: which of these subjects may do
  this?

## Roles

<p align="center">
  <img src="./assets/role-graph.svg" alt="admin inherits editor and auditor; editor inherits viewer. fromRoles flattens the graph into user:manage, doc:write, audit:read and doc:read, each with the path that granted it." width="100%">
</p>

Permissions are typed `resource:action` tokens (`permission("doc", "read")`).
Roles bundle permissions and inherit other roles. `fromRoles` flattens the
inheritance graph once per subject, so `hasRole("viewer")` holds for an admin.
`permissionProvenance` tells you which inheritance path granted a permission.
Roles defined in code can't form a cycle. Roles loaded as data go through
`resolveRoleGraph`, which refuses a cycle with `CircularRoleInheritance`.

## Field-level projection

<p align="center">
  <img src="./assets/field-projection.svg" alt="A document with id, title, body and internalNotes passes through enforceProjected under hasPermission(doc:read, fields id and title). Only id and title reach the caller." width="100%">
</p>

Any check can name the fields it grants: `hasPermission(readDoc, { fields:
["id", "title"] })`. When checks combine, the fields combine too. `allOf`
keeps only the fields every branch grants (`Intersection`). `anyOf` keeps the
first allowing branch's fields (`First`), or every allowing branch's
(`Union`). A check with no `fields` option grants every field. The decision
carries the result as `visibleFields`, and `enforceProjected` applies it for
you.

## Ports: fail-closed by default

<p align="center">
  <img src="./assets/fail-closed-ports.svg" alt="The five ports with their fail-closed defaults. A wired resolver answers and the policy allows. An outage becomes a typed AttributeResolveError. An unwired port uses its default, knows nothing, and the policy denies." width="100%">
</p>

A policy that needs outside data asks a **port**. Each port is an Effect
`Context.Service` that you provide as a `Layer`:

| Port | Asked by | Default when unwired |
| ---- | -------- | -------------------- |
| `AttributeResolver` | `hasAttribute` | `AttributeResolverNone` |
| `RelationshipResolver` | `hasRelationship` | `RelationshipResolverNever` |
| `DecisionHistory` | `hasActed`, `hasNotActed` | `DecisionHistoryUnknown` |
| `SignatureHistory` | `hasSignature` | `SignatureHistoryNone` |
| `CustomPredicate` | `hasCustom` | `CustomPredicateNone` |

Wire the ports you need. The ones you leave out keep their fail-closed
defaults:

```typescript
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import {
  EvaluationIdLive,
  attributeResolverFromRecord,
  check,
  currentSubjectLayer,
  eq,
  hasAttribute,
  literal,
  makeSubject,
  portsLayer,
} from "@qadi/core";

const financeOnly = hasAttribute("department", eq(literal("finance")));

// A static table here; in production, a Layer over your directory or database.
const directory = attributeResolverFromRecord({ department: "finance" });

const allowed = check(financeOnly).pipe(
  Effect.provide(currentSubjectLayer(makeSubject({ id: "u-7" }))),
  Effect.provide(Layer.merge(portsLayer({ AttributeResolver: directory }), EvaluationIdLive)),
);
// Effect<boolean, AttributeResolveError | …>: an outage stays a typed failure.
```

Every port also comes with retrying, bounded and timing-out wrappers
(`attributeResolverRetrying` and the like), and `@qadi/testing` provides
scripted doubles for testing a broken store.

## Push the policy into the query

<p align="center">
  <img src="./assets/predicate-pushdown.svg" alt="Filtering in memory loads 10,000 rows to keep 12. Pushed down, toPredicate folds the subject side to a constant and compileSql renders WHERE tenantId = $1, so the database returns only the 12 visible rows." width="100%">
</p>

`toPredicate` translates a policy into a dialect-free `Predicate`. Anything
about the subject is decided right away and folds to a constant, so only the
conditions on the rows themselves remain. `@qadi/predicate-sql` renders the
predicate for PostgreSQL, MySQL or SQLite, and `@qadi/predicate-prisma` turns
it into a `WhereInput`:

```typescript
import * as Effect from "effect/Effect";
import {
  EvaluationServicesNone,
  currentSubjectLayer,
  eq,
  hasResourceAttribute,
  makeSubject,
  subject,
  toPredicate,
} from "@qadi/core";
import { compileSql } from "@qadi/predicate-sql";

const sameTenant = hasResourceAttribute("tenantId", eq(subject("tenantId")));

const where = toPredicate(sameTenant).pipe(
  Effect.flatMap((predicate) => compileSql(predicate, { dialect: "postgres" })),
  Effect.provide(currentSubjectLayer(makeSubject({ id: "u1", attributes: { tenantId: "t-1" } }))),
  Effect.provide(EvaluationServicesNone),
);
// → { text: '"tenantId" = $1', params: ["t-1"] }
```

If a policy folds to `False`, there is no query to run. Rendered fragments are
property-checked against the evaluator on real PostgreSQL and SQLite engines.
A value with no safe SQL form is refused, never stringified into the query.

## React

<p align="center">
  <img src="./assets/react-hydration.svg" alt="The server evaluates and dehydrates decisions; the client hydrates them into one atom per question shared by every gate. The Publish button shows while Allowed, nothing renders while Rechecking after a revoke, and the fallback shows when Denied." width="100%">
</p>

`@qadi/react` keeps decisions in `effect/reactivity` atoms, not React state.
Equal policies share one atom, so many gates asking the same question cost one
evaluation. Server components can dehydrate decisions into the page, and the
client hydrates them. While a decision is being re-checked, nothing renders.
Showing the previous allow, even briefly, would be an over-permission.

```tsx
import type { AuthSubject } from "@qadi/core";
import { EvaluationServicesNone, hasPermission, permission } from "@qadi/core";
import { Can, QadiProvider, makeQadiAtoms } from "@qadi/react";

const canPublish = hasPermission(permission("post", "publish"));

const atoms = makeQadiAtoms(EvaluationServicesNone); // once, at module scope

export const App = ({ currentUser }: { readonly currentUser: AuthSubject | undefined }) => (
  <QadiProvider atoms={atoms} subject={currentUser}>
    <Can policy={canPublish} fallback={<span>Publishing disabled</span>}>
      <button type="button">Publish</button>
    </Can>
  </QadiProvider>
);
```

## HTTP

<p align="center">
  <img src="./assets/http-guard.svg" alt="A request passes SubjectExtractor and the RequirePermission middleware. An allowed read reaches the handler and returns 200; a denied delete returns 403 AccessDenied with its trace redacted. An endpoint with no access declaration makes guardApi fail at layer build with AccessNotDeclared." width="100%">
</p>

`@qadi/http` guards `effect/http` APIs. Every endpoint must declare its access,
either a `RequiredPermission` or a `PublicEndpoint` with a written reason. One
that declares neither makes `guardApi` fail at startup. A denial answers `403`
with its trace redacted, and a resolver outage answers `502`, not `403`:

```ts
HttpApiEndpoint.get("health", "/health").pipe((e) =>
  e.annotate(PublicEndpoint, publicEndpoint("liveness probe, no subject exists yet")),
);
```

## Not using Effect?

`@qadi/promise` is a thin Promise-returning facade over the same core. Every
method forwards to it, and none of them re-implements evaluation:

```typescript
import { EvaluationServicesNone, hasRole, makeSubject } from "@qadi/core";
import { makeQadi } from "@qadi/promise";

const qadi = makeQadi(EvaluationServicesNone);

const subject = makeSubject({ id: "u-1", roles: ["editor"] });

declare const respond: (allowed: boolean) => void;

// A denial is a value; a broken resolver would reject instead.
const handle = async (): Promise<void> => {
  const allowed = await qadi.check(subject, hasRole("editor"));
  respond(allowed);
};
```

## Every decision is observable

<p align="center">
  <img src="./assets/observability.svg" alt="evaluate emits one record per decision to the DecisionSink, which fans out to the @qadi/audit pipeline, the /__decisions event stream and the @qadi/devtools timeline. In the tracer, a qadi.evaluate span has a child span per port asked." width="100%">
</p>

- **Tracing.** `evaluate` opens a `qadi.evaluate` span with a child span for
  each port it asks. These are Effect's own spans, so any tracer you already
  wire up receives them. Clock and IDs come from Effect services, so traces are
  deterministic under `TestClock`.
- **`DecisionSink`.** One record per decision, with a strict wire codec.
- **`@qadi/audit`** builds an audit trail on the sink: staged writes, a circuit
  breaker, retention and archival, and e-signature capture. A record that can't
  be stored safely is refused and reported, never dropped silently.
- **`@qadi/http`'s `/__decisions`** streams records as server-sent events, with
  a backlog.
- **`@qadi/devtools`** merges those streams into one timeline and renders a
  React dock with decisions, questions, port calls and a policy simulator.

## Access-control models

<p align="center">
  <img src="./assets/models.svg" alt="Built in: RBAC, ABAC, ReBAC, field-level, row-level, Bell–LaPadula, Biba, MLS, Chinese Wall, separation of duty, XACML-style rules, task-based, NGAC. A resolver away: Zanzibar or OpenFGA, ACL, DAC, claims, temporal, spatial, risk-adaptive, purpose, consent." width="100%">
</p>

The same sixteen node types express most of the access-control literature.
For each model, [the adoption matrix](./spec/models/00-adoption-matrix.md)
records how it maps onto Qadi, the evidence for that mapping, and which
variants are declined and why.

## Packages

<p align="center">
  <img src="./assets/packages.svg" alt="@qadi/core is the hub; react, http, promise, testing, audit, devtools, predicate-sql and predicate-prisma each consume it directly and never each other." width="100%">
</p>

| Package | Description |
| ------- | ----------- |
| `@qadi/core` | Tokens, policy ADT, evaluator, enforcement |
| `@qadi/testing` | Fixtures, deterministic layers, recording resolvers |
| `@qadi/react` | `QadiProvider`, hooks, `Can`/`Cannot`, server-render hydration |
| `@qadi/promise` | A Promise facade for callers who do not use Effect |
| `@qadi/http` | `effect/http`/`httpapi` bindings: enforcement middleware, subject extraction, permission registry |
| `@qadi/audit` | Audit trail, staging, circuit breaker, retention/archival, e-signature capture, composed onto `DecisionSink` |
| `@qadi/devtools` | A headless decision timeline and a React dock that renders it |
| `@qadi/predicate-sql` | Compiles a `Predicate` into a parameterized SQL fragment for PostgreSQL, MySQL or SQLite |
| `@qadi/predicate-prisma` | Compiles a `Predicate` into a Prisma `WhereInput` |

`@qadi/features` (Cucumber BDD acceptance tests, private) lives at repo-root
`features/`, not under `packages/`.

## Learn more

- [qadi.dev](https://qadi.dev): the docs site, with getting started, concepts,
  per-package reference, and compliance notes for `@qadi/audit`
- [spec/overview.md](./spec/overview.md): the full public API surface, kept in
  sync with the code by a check
- [examples/nextjs-newsroom](./examples/nextjs-newsroom): a runnable Next.js
  demo covering client-only, SSR/hydration, separate-origin SSE and
  serverless/edge setups

## Why Qadi

Qadi exists because there was no authorization library built for Effect. Effect
gives TypeScript typed errors, `Layer`-based dependency injection and built-in
tracing. The authorization libraries in the ecosystem are written for a
synchronous world that throws on failure, and each has its own ad hoc way of
plugging in the stores a real check needs. Qadi is built from scratch on
Effect's model instead of adapted onto it:

- a decision is an `Effect`, so evaluation composes, retries and traces like
  the rest of your program;
- attribute stores, relationship stores and decision history arrive as
  `Layer`s, not singletons or constructor injection;
- a failed lookup travels through the same typed error channel as everything
  else. It is never silently turned into a denial or a thrown exception.

The policy language follows the same principle. Policies are stored and parsed
back from untrusted storage, so the schema *is* the type, not a hand-maintained
copy of it. The recursive type is written once, and the `Schema.Codec` is built
and type-checked against it. A policy that round-trips through storage cannot
silently come back meaning something else.

> **Status: feature-complete, published.** Every item the
> [roadmap](./spec/roadmap.md) committed to has shipped, and every access-control
> model in the [adoption matrix](./spec/models/00-adoption-matrix.md) is either
> adopted or explicitly declined. All nine packages are published on npm at
> `0.12.0` (verified live against the registry, 2026-09-22) — the same version
> every `packages/*/package.json` carries via the changesets fixed group. The
> root `package.json` is not part of that group and stays at its own,
> unrelated version.

## Development

```bash
pnpm install
pnpm typecheck     # tsc -b across project references
pnpm test          # vitest
pnpm lint          # oxlint + house-style checks
pnpm check         # all twenty-seven gates, in order
```

`pnpm check` is the merge gate, and [CI](./.github/workflows/check.yml) runs
that one command rather than its own list of steps, so the two cannot drift
apart. Release PRs run the full `pnpm check`. Every other pull request runs
`pnpm check:pr`, which is the same command without `pnpm mutation`. The full
list of commands, and what each step proves, is in
[`CONTRIBUTING.md`](./CONTRIBUTING.md) and
[`spec/process/definitions-of-done.md`](./spec/process/definitions-of-done.md).

`pnpm install` runs `effect-tsgo patch` (from the `@effect/tsgo` devDependency).
It replaces `node_modules/typescript/lib/tsc` with TypeScript-Go plus the Effect
Language Service, so `pnpm typecheck` and your editor report Effect-specific
diagnostics. `npx @effect/tsgo unpatch` restores the original.

Conventions live in [`AGENTS.md`](./AGENTS.md) and are enforced, not just
documented: `scripts/check-house-style.mjs` fails the build on
`async`/`await`, raw `Promise`, barrel `effect` imports, type assertions,
ambient clock or UUID access, and any undeclared `switch` in production source.
Every TypeScript example in this README is compiled by `pnpm spec:examples`.

## Contributing

[`CONTRIBUTING.md`](./CONTRIBUTING.md) is a short index. For each kind of
change, it points to the exact `AGENTS.md` section or spec document that
governs it.

## License

MIT, see [LICENSE](./LICENSE). Copyright (c) 2026 Mohammad AL Mechkor.
