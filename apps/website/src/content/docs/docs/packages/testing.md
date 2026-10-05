---
title: "@qadi/testing"
description: Fixtures and deterministic layers for @qadi/core — Clock and EvaluationId as services, so decisions reproduce exactly under test.
---

`@qadi/testing` gives a test suite a complete, deterministic evaluation
environment plus a handful of boring fixtures. The value is reproducibility:
because Qadi treats time and evaluation identity as services rather than
ambient globals (`Clock`, an `EvaluationId` service — never `Date.now()` or
`crypto.randomUUID()` directly), a test's decisions come back with the exact
same ids and durations every run, and that determinism is what this package
wires up rather than a set of ad hoc test helpers.

```sh
pnpm add -D @qadi/testing effect
```

## Deterministic by construction

Evaluation ids come from a service, so `qadiTestLayer` wires a sequential
generator instead of `crypto.randomUUID()` — a decision's id is `eval-1`,
`eval-2`, … rather than a uuid nobody can assert on. Durations come from
`Clock`, so they are reproducible under `TestClock`, which `@effect/vitest`'s
`it.effect` already supplies.

```ts
import { qadiTestLayer, subjectWith } from "@qadi/testing";

const layer = qadiTestLayer(subjectWith({ permissions: ["doc:read"] }), {
  attributes: { clearance: 5 },
});
```

`TestLayerOptions` also accepts `relationships`, `history`, `signatures`,
`ports` (below), an `idPrefix`, and a `clock` of `"live"` (the default) or `"test"` — set `"test"`
outside `it.effect`, where no ambient `TestClock` exists, to make
`durationMillis` reproducibly zero when two decisions are compared field by
field. `qadiReviewLayer` is the subject-less half, for wiring the same
determinism into a layer that supplies its own `CurrentSubject`.

## Defaults fail closed

Every default here denies, matching the posture the library takes in
production: a test that forgets to grant something sees a denial rather than
an accidental allow, which is what makes the test meaningful in the first
place rather than passing by omission.

## Fixtures

```ts
export const permissions: Record<"readDoc" | "writeDoc" | "deleteDoc", Permission>;
export const roles: Record<"viewer" | "editor" | "admin", Role>;
export const nobody: AuthSubject; // holds nothing; every policy denies
export const viewer: AuthSubject; // read-only
export const administrator: AuthSubject; // every fixture permission, via the admin role
export const subjectWith: (config: {
  readonly id?: string;
  readonly roles?: ReadonlyArray<string>;
  readonly permissions?: ReadonlyArray<`${string}:${string}`>;
  readonly attributes?: Readonly<Record<string, unknown>>;
}) => AuthSubject;
```

Deliberately small and boring — these exist so a test can say what it is
about, not to model a realistic domain.

## Overriding a port

Each data option — `attributes`, `relationships`, `history`, `signatures` —
becomes that port's `@qadi/core` fixture. To wire any port directly, pass it
under `ports`, keyed by port name. An entry there wins over the matching data
option, and every port you do not name stays at its fail-closed default:

```typescript
import { customPredicateFromRecord } from "@qadi/core";
import { qadiTestLayer, subjectWith } from "@qadi/testing";
import * as Effect from "effect/Effect";

const layer = qadiTestLayer(subjectWith({ id: "u1" }), {
  attributes: { clearance: 5 },
  ports: {
    CustomPredicate: customPredicateFromRecord({ isOwner: () => Effect.succeed(true) }),
  },
});
```

## Scripted and recording ports

The doubles are `@qadi/core`'s, derived from each port's description, so they
work for every port alike: `scriptedPort` answers, fails with the port's own
error, dies or throws per request, and `recordingPort` wraps a real port and
keeps the requests it saw. Both return `{ layer, calls }`, which is the real
reason to reach for them: a test can assert not just the decision but **the
work done to reach it**, which is how short-circuiting is verified.

```typescript
import {
  PortReply,
  anyOf,
  attributeResolverFromRecord,
  attributeResolverPort,
  evaluate,
  gte,
  hasAttribute,
  recordingPort,
  scriptedPort,
} from "@qadi/core";
import { qadiTestLayer, subjectWith } from "@qadi/testing";
import * as Effect from "effect/Effect";

// An attribute store that is down: every lookup fails with AttributeResolveError,
// so a test can prove a failure surfaces as `Failure` and never as a denial.
const down = scriptedPort(attributeResolverPort, () => PortReply.fail("down"));

// A real table, recorded.
const table = recordingPort(attributeResolverPort, attributeResolverFromRecord({ tier: 5 }));

const program = evaluate(anyOf([hasAttribute("tier", gte(1)), hasAttribute("other", gte(1))])).pipe(
  Effect.provide(qadiTestLayer(subjectWith({}), { ports: { AttributeResolver: table.layer } })),
);
// After running `program`, `table.calls` is `[["test-subject", "tier"]]` —
// `anyOf` stopped at the first allow. `down.layer` in the same slot makes
// `program` fail rather than deny.
export { down, program };
```

A script is consulted once per request, so a per-key fault is a function of
the request — `(subjectId, attribute) => attribute === "x" ? PortReply.fail("down")
: undefined` — and `undefined` falls through to the port's fail-closed answer.

`attributeResolverFromRecord` is deliberately **subject-blind**: one flat table
answers every subject, which is fine while a test names exactly one, and a
cross-subject leak the moment a batch runs over several — a test that cares
about subject-keyed answers scripts the resolver on its `subjectId` instead.
