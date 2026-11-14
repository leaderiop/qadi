---
"@qadi/core": minor
---

`@qadi/core` now states each hydration drop reason once, in one table with its kind (`dehydration`, `payload` or `entry`) and its meaning, and exports two types read off it: `HydrationDropReasonOf`, the reasons of one kind, and `HydrationDropRow`, the shape every row satisfies. `DehydrationDropReason`, `ClientHydrationDropReason`, `HydrationDropReason`, `hydrationDropReasons`, `isHydrationDropReason` and `hydrationDropMeaning` keep their names and types and are derived from it, which is source-compatible. `isHydrationDropReason` tests an own key, so an inherited name such as `toString` is not a reason. The object `hydrationDropMeaning` returns also carries the row's `kind` at run time while its type stays `HydrationDropMeaning`. The metric `qadi_hydration_dropped_total`, its words and their order are unchanged.
