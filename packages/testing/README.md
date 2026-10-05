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
  attributes: { clearance: 5 },
});
```

## Defaults fail closed

Every default here denies, so a test that forgets to grant something sees a
denial rather than an accidental allow. That is the same posture the library
takes in production, which is what makes a test meaningful.

## Overriding a port

Each data option (`attributes`, `relationships`, `history`, `signatures`)
becomes that port's `@qadi/core` fixture. To wire any port directly, pass it
under `ports`, keyed by port name; an entry there wins over the matching data
option, and every port you do not name stays at its fail-closed default.

## Scripted and recording ports

The doubles are `@qadi/core`'s, derived from each port's description, so they
work for every port alike. `scriptedPort` answers, fails with the port's own
error, dies or throws per request; `recordingPort` wraps a real port and keeps
the requests it saw. Both return `{ layer, calls }`, so a test can assert not
only the decision but **the work done to reach it** — which is how
short-circuiting is verified.

```ts
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
  Effect.provide(qadiTestLayer(subjectWith({}), { ports: { AttributeResolver: table.layer } })),
);
// After running `program`, `table.calls` is `[["test-subject", "tier"]]`:
// `anyOf` stopped at the first allow. `down.layer` in the same slot would make
// `program` fail rather than deny.
```

## License

MIT
