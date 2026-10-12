---
"@qadi/core": minor
"@qadi/devtools": patch
---

`@qadi/core` exports `PortFixtureData`, `PortFixtures`, `PORT_FIXTURES` and `fixturePortsLayer`: each port's fixture builder as one table closed over `PortName` (a port added to the registry without a row is a compile error), and the one place fixture data becomes an environment. `CustomPredicate`'s fixture is fixed verdicts by name. `@qadi/devtools`' Fixtures simulation builds its ports through it instead of its own copy of the data-to-layer map; behaviour is unchanged (ADR-QD-094, ARCH-42).
