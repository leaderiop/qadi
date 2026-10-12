---
"@qadi/core": minor
"@qadi/devtools": patch
---

Adds `foldPolicyCases`, `foldMatcherCases` and `foldExplanationCases`, with `PolicyCases`, `MatcherCases`, `ExplanationCases`, `RuleResult`, `RowResult`, `LeafPolicy`, `LeafMatcher`, `leafCases` and `leafMatcherCases`. Each arm receives its children in the tag's own shape: a wrapper's one child is a value of the result type, not an array, and a `Rules` or `Table` row arrives paired with its condition's result, so a missing arm or an arm that treats a wrapper's child as an array is a compile error. `foldPolicy`, `foldMatcher` and `foldExplanation` are unchanged and remain the form for a fold that treats children alike. `simplify`, `explain`, `renderExplanation`, `toPredicate` and `@qadi/devtools`' remedy derivation fold case-wise, which deletes seven "expected exactly one child" helpers and five `Rules` length checks that no input could reach (ADR-QD-090 amendment).
