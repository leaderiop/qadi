---
"@qadi/devtools": minor
"@qadi/core": minor
---

Four more screens: the policy explorer, the role viewer, services and cache, and
the React panel rescoped to questions.

**The policy rail is observed, not registered.** Every `DecisionRecord` already
carries the `Policy` it evaluated, so the policies an application uses are in the
log — `policiesSeen` groups them by `Equal.equals` (structural for plain objects,
the same property `Atom.family` relies on) and counts their verdicts. An optional
`catalogue` prop adds names and the policies that have not run yet. No registry,
no registration call sites, no service whose only consumer is a panel.

**A structural view states no verdict.** `inspect(policy, undefined)` marks every
node `NeverResolved`, which reads truthfully in the *inspector* as "this branch
was short-circuited" and would say a rule was skipped when it was never run. One
`PolicyTree` component serves both screens so the difference lives in one place.

**A required port is never called unwired.** Five of the seven services are in
`EvaluationServices` — a program that has not provided them does not run — so the
card reports *defaulted to a fail-closed implementation* and carries what that
costs. `name?` says which implementation is behind each port; `portActivity`
says whether anything ever reached it, read with zero wiring. Those are opposite
problems with the same symptom.

**No "acyclic ✓".** A by-value `Role` cannot express a cycle, so the check is
vacuous there; a tick would report a check that never ran. The screen says why
there is nothing to report instead.

**The React panel is keyed by question.** Ten `<Can policy={isAdmin}>` in
different places are one atom — the library cannot tell them apart, and a panel
listing ten rows would invent a distinction the architecture does not have. The
screen says so, because a reader counting rows against their component tree
would otherwise conclude it is broken.

`@qadi/core` now exports `portCallsTotal` and `portRetriesTotal`, which existed
as internal scaffolding and are what makes the "wired but never reached" answer
possible.

Two things are deferred with their reasons named: the **simulator**, which runs
evaluations inside a debug panel rather than reading records and needs a clock
`@qadi/testing` does not wire; and the **CLI** for the three deployments with no
browser page, which ADR-QD-049 records as the chosen second shell.
