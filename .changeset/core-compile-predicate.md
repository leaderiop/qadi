---
"@qadi/core": minor
---

`compilePredicate`, `CompilePredicateOptions` and `CompileOutcomes` are new exports: the compile shell a dialect package runs its rules and renderer in. It applies the `identifiers` and `maxInValues` defaults, classifies with `toRenderable`, counts a refusal on the `refused` series it is handed, renders, and only then counts `compiled`, so a defect in classification or in the renderer counts neither. It is a plain function with no span of its own, and core declares no compile counter: each dialect passes its own.
