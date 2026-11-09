---
"@qadi/react": patch
---

The hydration engine now owns both directions of the seed payload (ARCH-51, ADR-QD-078 amendment). `dehydrateDecisions` delegates to an internal `dehydrateWith`, beside `hydrateWith`: it applies the subject filter, counts each foreign entry as `ForeignSubject`, calls `onDropped` (or the development warning) and builds the `version: 2` envelope. No public name, signature, payload byte, metric or console message changes, and `DehydrateOptions` is still exported from `@qadi/react` with the same two fields.
