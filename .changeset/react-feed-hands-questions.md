---
"@qadi/react": minor
---

**Breaking.** `useDevtoolsFeed()` returns `questions` (`atoms.asked`) beside `gates` and `onInvalidate`, and `diagnostics` is your extras plus `layer` only (`DevtoolsDiagnosticsFeed` is `{ layer }`). Code that read `feed.diagnostics.questions` reads `feed.questions`.

`<DevtoolsDock {...feed} />` is unchanged, and setting `layer` or `questions` in the extras is still a compile error.

See the 0.13 section of the upgrade guide, `/docs/reference/upgrading/`.
