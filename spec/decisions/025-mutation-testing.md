# ADR-QD-025 — Mutation testing as a merge gate

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-ADR-025                                   |
> | Revision       | 1.1                                            |
> | Effective Date | 2026-07-26                                     |
> | Status         | Accepted                                       |
> | Author         | Qadi Engineering                               |
> | Classification | Architectural Decision                         |
> | Change History | 1.1 (2026-07-26): Named the step by position rather than index — it said "step 9" while the gate table had it at 10, and a new gate has since made it 11 (CCR-QD-038)<br>1.0 (2026-07-26): Initial release (CCR-QD-026) |

---

## Context

Coverage is enforced at 95% on `packages/core` and 100% of lines are executed.
That says which lines ran. It does not say which assertions would notice if a line
changed meaning.

The gap is not hypothetical here — it has been measured five times. Every enabler
in this library was signed off with a **hand-run** mutation pass, and three of them
found something a green suite had missed:

- **E7** (ADR-QD-024): a survivor coerced the ordered comparison,
  `Number(a) >= Number(b)`. It beat both the property test and the unit test
  written to pin that behaviour, because every generated row held a well-typed
  integer and the one hand-written counterexample was `"red"`, which coercion
  refuses too. A **numeric string** was the discriminator.
- **E4** (ADR-QD-021): `referencesAction` needed a `Dominates` arm, and the
  exhaustive switch forced a decision there but would have accepted the wrong one.
- **CCR-QD-024**: swapping the operands inside `Dominates` had to kill a scenario
  in each direction, or "Biba is Bell–LaPadula inverted" was untested.

All of that evidence sits in ADRs as prose. Nobody but its author can reproduce
it, which is the shape of the defect this library was written as a reaction to —
the predecessor shipped qualification evidence asserting properties no test
exercised.

## Decision

**Stryker runs on `packages/core` as the last step of `pnpm check`, breaking below 80%.**

Three parts, each with a reason that is not obvious from the config file:

### Scoped to `packages/core`

It is the only package where a surviving mutant is an authorization defect rather
than an ergonomics one. `@qadi/react` is a binding over
`effect/unstable/reactivity` (ADR-QD-014) and `@qadi/testing` exists to be used by
tests, so mutating either mostly measures the test doubles.

### In `pnpm check`, not beside it

It costs about 75 seconds. The alternative — a `check:full` nobody runs — is how
the DoD's own gate table came to omit `spec:examples` for several revisions, and
how a specification acquires a gate that exists only as long as someone remembers
it. A gate that is described but not executed is worse than no gate, because it is
quoted as evidence.

### The threshold is 80, and the score is 89.22

The roadmap set 80 by matching the predecessor's bar. `break: 80` fails the run;
`high: 90` and `low: 80` colour the report. There is **no ignore list**: a mutant
that cannot be killed is a finding to record, not a number to suppress. If one
becomes necessary it needs an ADR of its own.

## Three workarounds, and why none of them is a mistake to be tidied away

Stryker 9.6.1 does not run against this repository out of the box. Each setting
below looks wrong and is load-bearing.

| Setting | Without it | Why |
| ------- | ---------- | --- |
| `tsconfigFile: "tsconfig.stryker-disabled.json"` — a file that does not exist | `TypeError: ts.parseConfigFileTextToJson is not a function`, before any mutant runs | The sandbox rewrites `extends` and `references` in the root tsconfig through an API **TypeScript 7 removed**. The preprocessor no-ops when the named file is absent from the project, so naming a non-existent one skips it. Nothing is lost: the rewrite serves `@stryker-mutator/typescript-checker` and sandboxes whose tsconfig reaches outside itself, and we use neither |
| `plugins: ["@stryker-mutator/vitest-runner"]` | `Cannot find TestRunner plugin "vitest". In fact, no TestRunner plugins were loaded` | The default is the glob `["@stryker-mutator/*"]`. Under pnpm every entry there is a symlink into `.pnpm/`, reached through a *second* symlink from the sandbox; the glob does not follow that far. An explicit name is imported directly |
| `vitest.related` left **off** | `No tests were found`, and the run exits before testing anything | Vitest resolves "related to this source file" against its own root, `packages/core`, while Stryker hands it paths from the sandbox root. `coverageAnalysis: "perTest"` already limits each mutant to the tests that covered its line — the same saving by a mechanism that does not depend on path resolution |

The first becomes `tsconfig.json` when Stryker supports TypeScript 7. The other two
are properties of pnpm and of the workspace layout and will outlive that.

## Alternatives considered

**No mutation testing.** The status quo: five hand-run passes quoted as prose.
Rejected — see Context.

**A different runner.** `@stryker-mutator/tap-runner` or the Jest runner would
avoid the Vitest path-resolution issue, at the cost of a second test framework in
the repository. Rejected: one runner, and the failure is a config line.

**`inPlace: true`.** The commonly-suggested pnpm workaround, and it does skip the
tsconfig preprocessor — the source reads `if (this.options.inPlace) return`. It
also mutates the working tree in place, so an interrupted run can leave mutated
source behind. Rejected in favour of naming a tsconfig that does not exist, which
keeps the sandbox and cannot corrupt the checkout.

**A higher threshold now.** The score is 89.22%, so 85 would pass today. Rejected:
the threshold should be the bar the project committed to, not the number it happens
to hit, or the next honest refactor turns green into red for no reason. Raising it
is a decision to take once the findings below are addressed.

## Consequences

`pnpm check` gains ~75 seconds and the evidence becomes reproducible. The first
run is also a measurement, and it says where the suite is weakest:

| Module | Score | Note |
| ------ | ----- | ---- |
| `Evaluate.ts` | 77.85% | **Below the global threshold**, 65 survivors, 3 timeouts — the most important file in the library has the least meaningful assertions |
| `Predicate.ts` | 87.54% | 39 survivors, all in the newest code |
| `Role.ts` | 83.67% | 8 survivors and 3 lines no test reaches |
| `Obligation.ts` | 83.33% | 4 survivors |
| `Errors.ts` | 61.54% | 5 mutants with no coverage — mostly message strings |
| `CurrentSubject.ts` | 50.00% | 1 survivor out of 2 mutants |

1345 mutants, 141 survived, 5 timed out. The aggregate passes and the distribution
is the finding: **the evaluator is the weakest file and the one where a survivor
matters most.** That is recorded rather than fixed here, because "raise
`Evaluate.ts` above 80" is a piece of work with its own scope, and burying it in
the commit that installed the tool would hide it.

---

_Related: [Definitions of Done](../process/definitions-of-done.md) · [Roadmap](../roadmap.md) · [ADR-QD-024](./024-predicate-output.md)_
