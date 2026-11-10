---
"@qadi/react": patch
---

The hydration engine now owns both directions of the seed payload (ARCH-51, ADR-QD-078 amendment). `dehydrateDecisions` delegates to an internal `dehydrateWith`, beside `hydrateWith`: it applies the subject filter, counts each foreign entry as `ForeignSubject`, calls `onDropped` (or the development warning) and builds the `version: 2` envelope. This move changes no public name, payload byte, metric or console message, and `DehydrateOptions` is still exported from `@qadi/react` with the same two fields. In this release `DehydrateOptions.onDropped` also takes a `HydrationDrop` instead of a bare array; that is a separate change, `hydration-one-event`, and it is Breaking.
