---
"@qadi/core": patch
---

Each policy tag's arity (no children, exactly one, or any number) is now stated once, in a package-private record that `childrenOf`, `LeafPolicy`, `PolicyCases`, `TraceCases` and the trace fold are checked against, so moving an arity in one place and not another fails to compile. No public type, export or outcome changes: `LeafPolicy` is the same type. A trace node whose tag is not a `Policy` tag still makes `foldTrace` throw before any arm runs, but the error is now a `TypeError` rather than `Match.exhaustive`'s `absurd` error.
