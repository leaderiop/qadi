# 11 — Claims-Based Access Control

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-MOD-11                                    |
> | Revision       | 1.0                                            |
> | Effective Date | 2026-07-26                                     |
> | Status         | Effective                                      |
> | Author         | Qadi Engineering                               |
> | Classification | Planning — Model Adoption                      |
> | Change History | 1.0 (2026-07-26): Initial release (CCR-QD-007) |

---

## What it is

A claim is an assertion about the subject, made by an issuer and carried in a
token: an OIDC ID token's `sub` and `email`, an OAuth access token's `scope`, a
SAML assertion's attribute statements. Claims-based access control decides from
those assertions rather than from a record the application holds locally.

The honest description in Qadi's terms is that this model is **almost entirely a
mapping problem, not a deciding problem**. Qadi already decides on subject
attributes, roles and permissions, and the evaluator need not know that a value
arrived in a JWT. The work — and all of the risk — is the translation from a
verified token to an `AuthSubject`.

## Who asks for it

Any application that delegates authentication: an OIDC relying party, an API
behind an OAuth authorisation server, a service federating with SAML. That is
most services which do not run their own login page, which makes this one of the
most frequently reached-for rows in the [matrix](./00-adoption-matrix.md)
despite costing no core change.

## Status

| Property | Value |
| -------- | ----- |
| Status | **Wiring** |
| Priority | **P1** |
| Enablers required | None |
| Breaking change | No |

The extension point is `CurrentSubject`, not a resolver. A caller writes one
pure function from their verified token type to `AuthSubject`, provides it with
`currentSubjectLayer`, and every policy Qadi already ships applies unchanged.

## How Qadi expresses it

`AuthSubject` has four fields, and each takes a class of claim.

```ts
const makeSubject: (config: {
  readonly id: string;
  readonly roles?: Iterable<string>;
  readonly permissions?: Iterable<PermissionKey>;
  readonly attributes?: Readonly<Record<string, unknown>>;
}) => AuthSubject;
```

| Claim | Field | Note |
| ----- | ----- | ---- |
| OIDC `sub` | `id` | The issuer-scoped identifier, never `email` — an address is reassignable |
| `roles`, `groups`, or a vendor-namespaced equivalent | `roles` | Already flat strings, so `makeSubject` is the constructor, not `fromRoles` |
| OAuth `scope` | `permissions` | A **space-delimited string**, not an array — split it |
| Everything else (`email`, `department`, `tenant`, …) | `attributes` | Read by `hasAttribute`, and by `subject(path)` in a comparison |

Two details of the permission mapping are load-bearing. A `PermissionKey` is the
template type `` `${string}:${string}` ``, so a raw `string` off a token does not
type-check as one — build the key with `permissionKey(permission(resource, action))`
rather than asserting. And scopes are conventionally written in shapes Qadi does
not use (`documents.read`, `read:documents`, a bare `admin`), so the mapping must
normalise them and decide what a scope with no action segment means. That belongs
in reviewed code, not in an unexamined regular expression.

Where the token instead names roles the application defines locally, look each
value up in a role table and use `fromRoles`, so inherited permissions flatten as
usual ([MOD-QD-001](./01-rbac.md)).

### Qadi does not authenticate

The caller verifies the token's signature, issuer, audience and expiry
**before** constructing the subject; [the URS](../urs.md) places authentication
out of scope. The reason is ignorance, not division of labour: by the time a
value reaches `AuthSubject.attributes` it is an ordinary JavaScript value, and
Qadi cannot tell a claim signed by the identity provider from one an attacker
supplied. There is no field for provenance and no verification step in the
evaluator. The trust boundary is the token verifier, not the policy — a
malformed or expired token reaching evaluation has already defeated the system,
because the decision that follows will be perfectly correct with respect to
claims that should never have existed.

### Scopes are not permissions

A scope constrains what *the client application* may do on the user's behalf: a
calendar app granted `calendar.read` may not write, whatever the user's own
rights are. A permission is what *the user* may do: an administrator keeps their
authority when they log in through a client holding read scope only.

Correct enforcement is the **intersection** — an `allOf`, scope branch against
the mapped permissions, user branch against roles or attributes:

```ts
allOf([
  hasPermission(permission("reports", "publish")), // delegated to the client
  hasRole("editor"),                               // held by the user
]);
```

Mapping scopes into `permissions` and stopping there hands the client the user's
full authority. Ignoring scopes entirely does the same. Only the conjunction is
right, and this is the part of the model most often got wrong.

## Worked example

```typescript
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import {
  AttributeResolverNone,
  EvaluationIdLive,
  RelationshipResolverNever,
  allOf,
  check,
  currentSubjectLayer,
  hasPermission,
  hasRole,
  makeSubject,
  permission,
  permissionKey,
  type AuthSubject,
  type EvaluationError,
  type PermissionKey,
} from "@qadi/core";

// What the caller's verifier produces: signature, issuer, audience and expiry
// are already checked, and Qadi never sees the encoded token.
type VerifiedToken = {
  readonly sub: string;
  readonly groups: ReadonlyArray<string>;
  readonly scope: string;
  readonly department: string;
};

// `documents.read` is idiomatic OAuth and is not a Qadi key.
const scopeKeys = (scope: string): ReadonlyArray<PermissionKey> =>
  scope.split(" ").filter((s) => s.length > 0).map((s) => {
    const [head, tail] = s.split(".");
    return tail === undefined
      ? permissionKey(permission(s, "*"))
      : permissionKey(permission(head ?? s, tail));
  });

// Pure, total, and the only place the token's shape is known.
const toSubject = (token: VerifiedToken): AuthSubject => {
  const { sub, groups, scope, ...claims } = token;
  return makeSubject({ id: sub, roles: groups, permissions: scopeKeys(scope), attributes: claims });
};

// The client was delegated the scope and the user holds the role. Either branch
// alone is a privilege escalation.
const canPublishReport = allOf([
  hasPermission(permission("reports", "publish")),
  hasRole("editor"),
]);

const decideFor = (token: VerifiedToken): Effect.Effect<boolean, EvaluationError> =>
  check(canPublishReport).pipe(
    Effect.provide(currentSubjectLayer(toSubject(token))),
    Effect.provide(
      Layer.mergeAll(AttributeResolverNone, RelationshipResolverNever, EvaluationIdLive),
    ),
  );
```

## What is missing

**Token staleness.** Claims are a snapshot taken at issuance. A role revoked a
minute after signing stays in the token until it expires, and Qadi will decide
from it, because Qadi evaluates the subject it is given. Freshness is the
caller's: short lifetimes, refresh, or introspection.

The escape hatch, where a claim must be live, is to *not* map it. An attribute
absent from `AuthSubject.attributes` is fetched through `AttributeResolver` at
decision time, at the node that needs it ([MOD-QD-002](./02-abac.md)) — so a
revocation-sensitive value is read from source on every evaluation while the
rest of the claim set stays cached in the token. The trade is a lookup per
decision, and it should be made deliberately, per attribute.

**No token parsing, and none planned.** Qadi ships no JWT decoder, no JWKS
client and no SAML parser. Those belong to the verifier, and half of one inside
an authorisation library would invite callers to trust it as the boundary.

**No standard claim vocabulary.** OIDC defines no `roles` claim and providers
namespace their own, so the mapping is per-issuer — the right place for that
variation to live, but variation Qadi does not absorb.

## Verification

Nothing verifies this model today, and this document does not claim otherwise —
it is a recipe, not a shipped feature.

Adopting it means a mapping function in the caller's codebase and, if a
reference adapter is ever shipped, a scenario tagged with a newly allocated
`REQ-QD` identifier plus unit tests over the mapping — scope normalisation and
the treatment of a missing or empty claim first. The mechanics it leans on are
proven: permission checks by `REQ-QD-001`, role checks by `REQ-QD-003`, subject
attributes by `REQ-QD-004`, and the fail-closed default by
[INV-QD-007](../invariants.md#inv-qd-007-defaults-fail-closed) — a subject built
from a token carrying no usable claims holds nothing, so every policy denies.

The two claims that are *not* mechanical — that scope and permission must be
intersected, that verification precedes construction — are properties of the
caller's code. No test here can assert them, and implying otherwise would repeat
the predecessor's qualification-evidence mistake
([ADR-QD-016](../decisions/016-gxp-out-of-scope.md)).

---

_Related: [00 — Adoption Matrix](./00-adoption-matrix.md) · [02 — Attribute-Based Access Control](./02-abac.md) · [01 — Role-Based Access Control](./01-rbac.md) · [User Requirements](../urs.md)_
