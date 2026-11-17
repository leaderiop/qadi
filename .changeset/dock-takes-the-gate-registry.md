---
"@qadi/devtools": minor
---

**Breaking.** `DevtoolsDock`'s `gates` prop takes the gate registry (`GateRegistryLike`: `instances()` and `subscribe()`), usually `atoms.gates` or the feed's `gates`, where it took an array of instances. An array no longer compiles. The dock subscribes to the registry in its own scope for as long as it is mounted, and pairs each asked question with the guards asking it at one moment, so a host no longer re-renders to feed the dock.

`GateRegistryLike` is a new type export. The React panel's message for a missing registry now names `atoms.gates`: "Pass gates — usually atoms.gates, from @qadi/react — to list who is asking."

See the 0.13 section of the upgrade guide, `/docs/reference/upgrading/`.
