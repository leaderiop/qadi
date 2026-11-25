---
"@qadi/react": patch
---

`QadiProvider`'s registry lifetime (building and seeding the registry, recording the latest committed atoms and subject, writing the subject, and the recycle) is kept by one internal module that imports no React, and the provider forwards each commit, hold and release to it. Nothing a host renders, receives or calls changes. No export changes.
