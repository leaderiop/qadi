---
"@qadi/react": minor
"@qadi/core": minor
---

A hydration outcome is one value (ARCH-60). Every exit from `dehydrateDecisions` and `hydrateDecisions` is one closed event inside `@qadi/react`, counted once and then reported once, so the counters and the reporter can no longer disagree.

`@qadi/react`:

- **`dehydrateDecisions` never throws.** It threw a `SchemaError` on a policy the constructors build but the policy schema refuses (`gte(NaN)`, `gte(-Infinity)`, `hasRelationship(…, { depth: 1.5 })`), on a server's render path, and the entry was counted nowhere. Such an entry is now left out as `UnencodablePolicy`, counted and reported once, and the rest of the payload is written.
- **A reporter you supply cannot change the outcome.** A throwing `onDropped` (either end) or `onHydrationMismatch` used to throw out of `hydrateDecisions`, `dehydrateDecisions` or the decision's read. It is now contained, the outcome stands, and the throw is announced as a new developer signal, `ReporterThrew`, naming the hook and the error and no entry, in development and production.
- **A payload refused whole is counted at least once.** A payload naming another subject with no entries counted zero.
- **Breaking:** `DehydrateOptions.onDropped` takes the same `HydrationDrop` record as `HydrateOptions.onDropped`, `{ reason, entries, wholePayload }`, called once per reason with `wholePayload: false`, instead of a bare array of entries. Migration: `(entries) => …` becomes `(drop) => …drop.entries…`. `HydrationDrop` and `HydrationDropReporter` gain the reason as a second type parameter, defaulting to `ClientHydrationDropReason`, so the one-argument spellings are unchanged. The development warning for a dropped dehydrate entry now prints the reason's remedy from `hydrationDropMeaning`.

`@qadi/core`: `DehydrationDropReason` (and so `HydrationDropReason`) gains `"UnencodablePolicy"`; `hydrationDropReasons` has eight values and `hydrationDropMeaning` describes the new one. `qadi_hydration_dropped_total` gains a key. An exhaustive `switch` or `Match` over the reason union needs one more arm.
