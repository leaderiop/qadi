# @qadi/testing

Fixtures and deterministic layers for testing against
[`@qadi/core`](https://www.npmjs.com/package/@qadi/core).

```sh
pnpm add -D @qadi/testing effect
```

## Deterministic by construction

Evaluation identifiers come from a service, so `qadiTestLayer` wires a
sequential generator and a decision's id is `eval-1`, `eval-2`, … rather than a
uuid. Durations come from `Clock`, so they are reproducible under `TestClock` —
which `@effect/vitest`'s `it.effect` already provides.

```ts
import { qadiTestLayer, subjectWith } from "@qadi/testing";

const layer = qadiTestLayer(subjectWith({ permissions: ["doc:read"] }), {
  ports: { AttributeResolver: { answers: { clearance: 5 } } },
});
```

## Defaults fail closed

Every default here denies, so a test that forgets to grant something sees a
denial rather than an accidental allow. That is the same posture the library
takes in production, which is what makes a test meaningful.

## Setting up a port

Each port has one way to be set up, under `ports`, keyed by port name. The
value is either the port's fixture data, `{ answers }`, or a layer of its own
service, `{ layer }`; giving both for one port is a type error. Every port you
do not name stays at its fail-closed default.

| Port | `answers` |
| ---- | --------- |
| `AttributeResolver` | an attribute record |
| `RelationshipResolver` | a list of edges |
| `DecisionHistory` | a list of acted events |
| `SignatureHistory` | a list of signatures |
| `CustomPredicate` | fixed verdicts by name, `{ isOwner: true }` |

Each is built by `@qadi/core`'s fixture table, so it is the same fixture
`@qadi/devtools` uses. A predicate that reads the subject or the resource is
not data: give it as `{ layer: customPredicateFromRecord({ ... }) }`.

## Observing what ran

Three helpers capture what a test needs to see. Each replaces what is ambient
rather than adding to it, and each is written once here.

- `isolatedMetrics(effect)` runs `effect` against its own empty
  `MetricRegistry`, so counters a test reads start at zero and never reach the
  process-wide registry. It isolates what happens on the effect's fiber; a write
  made off-fiber (as `@qadi/react`'s hydration counters are) lands in the default
  registry whatever the fiber carries, so a test of those asserts a delta.
- `collectingLogger()` returns `{ lines, layer }`: every log line, with its
  `message`, `level` and `annotations`, in `lines` after the effect has run.
- `collectingTracer(spans)` records every span into the array you pass.

## Scripted and recording ports

The doubles are `@qadi/core`'s, derived from each port's description, so they
work for every port alike. `scriptedPort` answers, fails with the port's own
error, dies or throws per request; `recordingPort` wraps a real port and keeps
the requests it saw. Both return `{ layer, calls }`, so a test can assert not
only the decision but **the work done to reach it** — which is how
short-circuiting is verified.

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

// A store that is down: every lookup fails with AttributeResolveError.
const down = scriptedPort(attributeResolverPort, () => PortReply.fail("down"));

// A real table, recorded.
const table = recordingPort(attributeResolverPort, attributeResolverFromRecord({ tier: 5 }));

const program = evaluate(anyOf([hasAttribute("tier", gte(1)), hasAttribute("other", gte(1))])).pipe(
  Effect.provide(
    qadiTestLayer(subjectWith({}), { ports: { AttributeResolver: { layer: table.layer } } }),
  ),
);
// After running `program`, `table.calls` is `[["test-subject", "tier"]]`:
// `anyOf` stopped at the first allow. `down.layer` in the same slot would make
// `program` fail rather than deny.
export { down, program };
```

## License

MIT
