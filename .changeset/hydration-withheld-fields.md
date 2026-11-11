---
"@qadi/react": patch
---

Internal: the fields a hydration entry withholds are stated once (ARCH-77). `HydrationEngine.ts` lists what an allowed and a denied entry withhold as two constants read by both the entry schemas and `dehydrateDecision`, where each list was written twice. The dehydrated payload is byte-identical.
