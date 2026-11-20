# ADR-QD-175 — A negative type pin can fail

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-ADR-175                                   |
> | Revision       | 1.2                                            |
> | Effective Date | 2026-11-20                                     |
> | Status         | Accepted — amends ADR-QD-037                   |
> | Author         | Qadi Engineering                               |
> | Classification | Architecture Decision Record                   |
> | Change History | 1.2 (2026-11-20): the drift check holds tsconfig.tstyche.json to extends and compilerOptions.plugins (review WR-02)<br>1.1 (2026-11-20): the in-file floatingEffect directive runs in pass 1 as well (review WR-01)<br>1.0 (2026-11-20): Initial release (ARCH-109, CCR-QD-453) |

---

## Context

[ADR-QD-037](./037-circular-imports-and-type-level-tests-are-gates.md) made tstyche a merge
gate. tstyche checks `expect(f).type.not.toBeCallableWith(args)` by compiling the call
`f(args)` and reading any diagnostic on it as "not callable"; `not.toBeConstructableWith`
does the same with `new`. `tstyche.json` pointed it at `tsconfig.test.json`, where the Effect
language service runs with its `floatingEffect` rule on, and that rule puts a diagnostic on
every bare call that returns an `Effect` or a `Stream`. So a negative pin on such a function
passed whatever its arguments were.

Of the 81 negative callable pins then in 27 files, one depended on it: the pin that
`makeDecisionLog` refuses options without `environment` stayed green with `environment` made
optional. Twelve more were on functions that return an `Effect` but were already written
through `Params<F>`, which states the refusal on the parameter type. Eleven negative pins had
no positive pin on the same subject, so nothing showed the subject accepted any arguments at
all. Nothing counted the pins, so the next one could land unread.

## Decision

**tstyche compiles under its own tsconfig.** `tsconfig.tstyche.json` extends
`tsconfig.test.json` and restates the `@effect/language-service` entry of
`tsconfig.base.json` with `diagnosticSeverity.floatingEffect` set to `"off"`; `extends`
replaces `compilerOptions.plugins` wholesale, so the entry is restated whole. `tstyche.json`
names it. `pnpm typecheck` keeps the rule on.

**The tool's reading is pinned.** `packages/core/test/FloatingEffectPins.tst.ts` declares an
`Effect`, a `Stream`, a constructed-`Effect` and a plain subject. Under tstyche's config its
negative pins on valid arguments carry tstyche's `fixme` directive, so tstyche fails the run
if one passes; below a position-based language-service directive that turns the rule back on
for the rest of the file, the same pins pass. An upgrade that changes either reading turns
the file red.

**A bare negative pin is for a plain-return subject.** A pin on a function that returns an
`Effect` or a `Stream` states its refusal through the parameter type: `Params<F>` for a
whole call, or `Parameters<typeof f>[i]` with `not.toBeAssignableTo` for one parameter. Such a
pin holds whichever way the rule is set. `DecisionLog.tst.ts`'s pin is rewritten in the second
form. Every negative pin has a positive twin in its file: the same subject and form, with the
arguments made valid.

**The gate holds it.** `NOT_CALLABLE_PIN_BUDGET` in `scripts/check-house-style.mjs` counts the
negative `toBeCallableWith` and `toBeConstructableWith` pins per file, with comments and the
text of strings blanked (a template literal's `${…}` is read as code), on its own walk of
every file tstyche selects, in both directions, and AGENTS.md section 6's table is checked
against it. `[not-callable-control]` requires each negative pin's twin by subject text, form
and kind, and requires the twin to run: a file holding a negative pin may not use `.skip`,
`.only` or `.todo`, nor carry a tstyche directive. `[tstyche-plugin-drift]` holds
`tsconfig.tstyche.json` to `extends` and `compilerOptions.plugins` alone, holds the
restated entry to the base's apart from `floatingEffect`, and requires the base to leave
`floatingEffect` on.

**tstyche runs twice** (`pnpm test:tstyche`, `scripts/run-tstyche.mjs`): under
`tsconfig.tstyche.json`, then under `tsconfig.test.json` with the rule on, where a positive
pin on an `Effect` or `Stream` subject fails whatever its arguments. So a bare negative pin on
such a subject cannot keep a passing twin. The second pass skips the characterisation block
that holds only with the rule off, by a title the script first checks no other type test
contains. The other block turns the rule on with the in-file directive and runs in both passes:
in the first the directive is what turns it on, so the file goes red if the directive stops
working, and in the second `tsconfig.test.json` does it. Each pass also fails if tstyche
compiles any type test under another tsconfig, as it does, under its baseline options, for a
file outside the tsconfig's `include`.

**The characterisation is the one exception.** `FloatingEffectPins.tst.ts`'s bare negative
pins on an `Effect`, a `Stream` and a constructor, its `fixme` directives and its skip
title are deliberate: they pin the tool, not an API. The budget lists the file with that
reason, the twin check exempts it by path from the run-mode refusal (its pins still need
twins), and the skip text may appear there and nowhere else.

## Alternatives considered

**A `floatingEffect` directive in each type-test file.** Rejected: one place per file to
forget, and a new type test would not have it.

**The `-next-line` form of the directive on each pin.** Rejected: it has no effect on this
rule.

**A second tstyche config for the rule-on half.** Not needed: the position-based directive
turns the rule back on for the rest of the file under tstyche's TypeScript 6.0.3 and under
`pnpm typecheck`'s TypeScript 7.

**A marker comment on each pin instead of a count.** Rejected: the count, the twin check and
the second pass state the same rule without a second annotation to keep in step.

**A committed flip sweep as a gate.** Rejected: flipping every negative pin to its positive
form, once, showed each one fail with a TypeScript argument or assignability code under
tstyche's config. The characterisation, the budget, the twin check and the second pass keep
that true.

## Consequences

- Outside the characterisation, a negative pin can fail for valid arguments whatever its
  subject returns, and its twin runs as an ordinary passing test in both passes.
- A new negative pin is a reviewed edit to the budget and AGENTS.md section 6's table
  together, and needs a positive twin; a positive pin on an `Effect` or `Stream` subject goes
  through the parameter type too, or the second pass fails.
- tstyche takes two passes of about ten seconds each.
- tstyche's compile differs from `pnpm typecheck`'s in one plugin setting, beside the
  TypeScript version ADR-QD-037 already records; the drift check keeps it to one.
- If a tstyche or language-service upgrade changes the reading, `FloatingEffectPins.tst.ts`
  fails first; revisit `tsconfig.tstyche.json`, the drift check and the second pass then.
- The twin check matches text. That each twin varies only the argument under test is reviewed
  by hand.
- `Params<F>` and `Parameters<F>` read only the last overload of an overloaded `F`. One
  subject pinned through them is overloaded: `askActed` (`PortAccess.ts`), whose
  `Params<typeof askActed>` reads the `ActedLeaf` overload only, so `PortAccess.tst.ts`'s pins
  say nothing about its `AnyActedLeaf` overload.

---

_Related: [ADR-QD-037](./037-circular-imports-and-type-level-tests-are-gates.md) · [ADR-QD-073](./073-the-fnuntraced-exception-is-measured.md) · [ADR-QD-094](./094-a-port-is-described-once.md) · [ADR-QD-123](./123-a-metric-is-declared-once.md) · [Definitions of Done](../process/definitions-of-done.md)_
