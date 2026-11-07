---
"@qadi/react": patch
---

`@qadi/react` now accepts `scheduler` 0.28 as a peer (`>=0.25.0 <0.29.0`, was `<0.28.0`). This matches `@effect/atom-react@4.1.2`'s own `scheduler` peer, so a project on `react-dom` 19.3.1, which depends on `scheduler` ^0.28.0, no longer gets an unmet-peer warning.
