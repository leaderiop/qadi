# Phase 62: Type pins that can fail - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-11-20
**Phase:** 62-type-pins-that-can-fail
**Areas discussed:** Characterisation file, Existing workaround pins, Budget gate depth, Proof every pin can fail

---

## Characterisation file

| Option | Description | Selected |
|--------|-------------|----------|
| Second tstyche run | Fallback if the in-file directive cannot re-enable the rule: `pnpm test:tstyche` also runs tstyche under the unchanged `tsconfig.test.json` on one fixture the main run excludes; step 6 command and DoD table change together | ✓ |
| Header repro only | Commit only the config half; record the rule-on repro in the file header and amend PIN-01 | |

**User's choice:** Second tstyche run (as the fallback; the directive stays the primary mechanism).

| Option | Description | Selected |
|--------|-------------|----------|
| Synthetic declarations | Local `declare const` Effect/Stream-returning functions plus a plain-return control; pins tool behaviour only | ✓ |
| Real exports | `makeDecisionLog` and a real Stream export | |
| Both | Synthetic subjects plus one real export | |

**User's choice:** Synthetic declarations.

| Option | Description | Selected |
|--------|-------------|----------|
| Cover `new` too | A synthetic construct signature returning an Effect, pinned under both settings | ✓ |
| Callable form only | Stay within PIN-01's wording | |

**User's choice:** Cover `new` too.

---

## Existing workaround pins

| Option | Description | Selected |
|--------|-------------|----------|
| Keep, reword comments | The 12 `Params<F>` pins and the `Parameters<…>` pins stay; their explanatory comments are reworded to be true under the new config | ✓ |
| Unwrap to direct pins | Rewrite them as bare pins, honest under the new config; delete the three `Params<F>` copies | |

**User's choice:** Keep, reword comments.

| Option | Description | Selected |
|--------|-------------|----------|
| Keep the rule | AGENTS.md §6: bare negative pins only on plain-return subjects; Effect/Stream subjects go through the parameter type | ✓ |
| Drop the rule | The config makes bare pins honest everywhere | |

**User's choice:** Keep the rule.

| Option | Description | Selected |
|--------|-------------|----------|
| Both forms, copies stay | AGENTS.md names `Params<F>` (whole call) and `Parameters<…>[i]` (one parameter); the three local copies stay | ✓ |
| Params<F> in per-package helpers | Move it into `test/helpers.ts` in core and devtools; one canonical form | |
| Parameters<…>[i] only | Name only the per-parameter form | |

**User's choice:** Both forms, copies stay.

---

## Budget gate depth

| Option | Description | Selected |
|--------|-------------|----------|
| Controls + rule, machine-checked | Control per negative subject in the gate, plus a rule-on pass of the suite in step 6, so the plain-return rule is enforced (~8 s) | ✓ |
| Counts + control check | Text-only control check; the rule by review | |
| Counts + reason column | Counts and a per-file reason; controls and the rule by review | |
| Marker on every pin | `// qadi:negative-pin — <reason>` on each pin (~80 annotations) | |

**User's choice:** Controls + rule, machine-checked.

| Option | Description | Selected |
|--------|-------------|----------|
| Both forms, one budget | `not.toBeCallableWith` and `not.toBeConstructableWith`, counted separately; name stays `NOT_CALLABLE_PIN_BUDGET` | ✓ |
| Callable only | PIN-05 as written | |

**User's choice:** Both forms, one budget.

| Option | Description | Selected |
|--------|-------------|----------|
| Everything tstyche runs | The walk uses tstyche's own file match; fails on an empty walk | ✓ |
| packages/*/test only | Match PIN-05's wording | |

**User's choice:** Everything tstyche runs.

---

## Proof every pin can fail

| Option | Description | Selected |
|--------|-------------|----------|
| One-off sweep, recorded | Flip each negative pin to positive in a scratch copy under the new config; every one must fail; results in the phase dir | ✓ |
| Repeatable script in the gate | Commit the sweep and run it on every `pnpm check` | |
| Required breaks only | No sweep | |

**User's choice:** One-off sweep, recorded.

| Option | Description | Selected |
|--------|-------------|----------|
| A TypeScript argument error | Each flipped pin must fail with a compiler argument/overload diagnostic, recorded per pin | ✓ |
| Any failure | Any failure counts | |

**User's choice:** A TypeScript argument error.

---

## Claude's Discretion

- File names and locations: the tstyche tsconfig and the characterisation file(s).
- The drift check's home and exact comparison.
- How step 6 runs its two passes.
- How the control check matches subjects.
- The classification table's format.
- Records: ADR-QD-175 and/or an ADR-QD-037 revision, whether a BEH or INV is added, and unused ids.
- The characterisation file's header content.
- The overload note.

## Deferred Ideas

- An upstream tstyche or language-service issue. It is not filed without the owner's OK.
- A discipline for `@ts-expect-error` pins in `.tst.ts` (a message fragment or a budget). This belongs to a later phase.
