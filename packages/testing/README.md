# @qadi/testing

Fixtures and deterministic layers for testing against
[`@qadi/core`](https://www.npmjs.com/package/@qadi/core).

```sh
pnpm add -D @qadi/testing
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

## Recording fixtures

`recordingAttributeResolver`, `edgeRelationshipResolver` and
`eventDecisionHistory` each return `{ layer, calls }`, so a test can assert not
only the decision but **the work done to reach it** — which is how
short-circuiting is verified.

## License

MIT
