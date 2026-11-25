---
"@qadi/react": patch
---

`QadiProvider`'s registry lifetime (building and seeding the registry, recording the latest committed atoms and subject, writing the subject, and the recycle) is kept by one internal module that imports no React, and the provider forwards each commit, hold and release to it. What a host renders and receives is unchanged. One edge differs: a host that calls `registry.refresh` on the subject atom, through `RegistryContext`, after the provider's first commit and before anything has read it or the registry has recycled (a window a rendered tree rarely leaves open), now keeps the current subject instead of resetting it to `undefined` (ADR-QD-199). No export changes.
