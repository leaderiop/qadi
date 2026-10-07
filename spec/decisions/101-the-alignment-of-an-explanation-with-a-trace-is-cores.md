# ADR-QD-101 — The alignment of an explanation with a trace is core's

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-ADR-101                                   |
> | Revision       | 1.0                                            |
> | Effective Date | 2026-10-07                                     |
> | Status         | Accepted — amends ADR-QD-090                   |
> | Author         | Qadi Engineering                               |
> | Classification | Architecture Decision Record                   |
> | Change History | 1.0 (2026-10-07): Initial (CCR-QD-191)         |

---

## Context

ARCH-22 verified, at `e328e75`:

- **C1, C2.** `renderTrace` and `diffTraces` recursed natively over a `Trace`. A trace's
  nesting is bounded only by the `maxDepth` its evaluation ran under, and `maxDepth` is a
  caller's to raise, so an evaluation of a deep policy succeeded and then rendering or
  diffing its trace threw a raw `RangeError` (about 1,483 levels for `renderTrace`, about
  2,186 for `diffTraces`). The documented pattern
  `Effect.catchTag("AccessDenied", (e) => Effect.logDebug(renderTrace(e.trace)))` threw
  inside the handler, which is a decision becoming a defect (AGENTS.md §4).
  [INV-QD-090](../invariants.md) covered `Policy`, `Explanation` and `Matcher` and left
  `Trace` out; ADR-QD-090 listed it under "Not yet".
- **C3.** The sentence saying which fields a node exposes, and the backtick default for
  `term`, were byte-identical in `renderTrace` and `renderExplanation`. Only one copy carried
  the comment explaining why `undefined` renders as nothing.
- **C4.** `@qadi/devtools`' `Inspect.ts` zipped an `Explanation` with a `Trace` by index, relying
  on "`evaluateNode` emits one trace node per policy node in declaration order". That is a
  core guarantee, produced by `evaluateNode`, the three composites and `explain`, and only a
  devtools test enforced it.
- **C5, C7.** Devtools carried a package-private copy of `foldTree` for exactly that zip.
  ADR-QD-090 said: "Two copies of the fold mechanism exist (core and devtools), until a third
  package needs one, at which point D-02-d is reopened with an ADR."
- **C6.** A node's address existed in two forms: `TracePath` (an array, what `diffTraces`
  reports) and `InspectNode.path` (`"$.0.2"`). They disagreed at the root, and a `pathOf` helper
  was copied in two screens.
- **N1.** A zip built over `foldExplanation` would be wrong: `foldExplanation` memoises by
  identity and `explain` shares nodes (`anyOf([not(p), p])` has one `p` explanation reached by
  two paths), so the second occurrence would receive the first one's trace and key.
- **N2.** A per-node `number[]` address is infeasible: a chain keeping one fresh array per node
  ran out of an 8 GB heap at 40,000 levels. A rope string costs nothing.
- **N3.** A stack-safe `renderTrace` still throws past about 23,000 levels
  (`RangeError: Invalid string length`), because line *d* carries `d` indents and the output is
  quadratic in characters.

## Decision

**The alignment is core's.** `foldAligned(explanation, trace, combine)` (`Explanation.ts`)
folds an `Explanation` and one evaluation's `Trace` together, position by position.
`combine` receives an `AlignedNode` — the explanation node, the trace node at that position or
`undefined`, the position's `key`, and the row's `effect` when the position is a `Table` row's
condition — and its children's results. The trace's `i`th child belongs to the `i`th part
([INV-QD-103](../invariants.md)); a part with no trace child was not reached, and neither was
anything beneath it. Devtools' `inspect` is an adapter: it supplies `shapeOf`, labels and status
wording, and nothing about the pairing.

**It folds positions, not nodes.** `combine` runs once per position. The positions are fresh
objects, so the identity memo inside the internal `foldTree` never merges two of them, and a
shared explanation subtree gets its own trace and key at every occurrence (N1). The pairing is by
construction and is **not checked at runtime**: a trace that does not belong to the explanation
yields a fold over a mismatched pair, not an error. Every in-repo caller pairs a record's own
policy with its own trace.

**`foldTrace(trace, cases)` is public** (`Decision.ts`), the fourth thin adapter over the seam, in
the case form from the start (ADR-QD-090's amendment of 2026-10-07: "a `Trace` fold … takes the
case form from the start"). `TraceCases` has one arm per `Policy` tag. A leaf arm receives its
node, `AllOf`/`AnyOf`/`Rules` one result per evaluated child, and a wrapper
(`Not`/`Obliged`/`Labeled`) its child's result or `undefined`. It is *the stack-safe walk for a
caller-held trace*: `AccessDenied.trace` reaches every host. No walker in this repository uses
it, because `renderTrace` needs pre-order with indentation and `diffTraces` walks two trees in
lockstep; the leverage is for callers. A shared child is combined once, as for the other three.

**`renderTrace` and `diffTraces` are explicit-stack loops** and join INV-QD-090. `diffTraces` keeps
a parent-linked address per pending pair and builds the `TracePath` of a node only when it reports
a difference there, so its memory is linear in the tree and not quadratic in its depth.

**`renderTrace` caps indentation** (`indentLimit`, default `DEFAULT_MAX_DEPTH` = 64). A line deeper
than the limit keeps `limit` levels of indent and is prefixed `(depth N) `, so output is O(n · limit)
and every trace evaluated under the default bound renders byte-identically. `indentLimit:
Infinity` restores today's format for a caller who knows their depth; a limit below 0 or `NaN` means
none, never unbounded.

**A node has one text address.** `tracePathKey(path)` (exported from `TraceDiff.ts`, defined in the
internal `TraceKey.ts`) is `"$"` for `[]` and `"$.0.2"` otherwise. `AlignedNode.key` is built as a
rope — `childKey(parent, i)` — and equals `tracePathKey` of the position's path, which a property
test pins. `InspectNode.path` keeps its type and its values and is now *defined* as that key. The
two screens' `pathOf` become devtools' one `describeTracePath`, which words `[]` as "the root" and
every other path as the key. `TracePath` stays `ReadonlyArray<number>`: a flip's `path` is
therefore computable into the key of the node it names, which is what a screen needs to link them.

**The shared wording is one module.** `Wording.ts` (internal) owns `defaultTerm` and
`fieldsClause`; `renderTrace` and `renderExplanation` both use it. The obligation clauses stay
with their renderers: `, owing …` and `, and owes …` are different sentences on purpose.

### ADR-QD-090's trigger did not fire; its premise dissolved

ADR-QD-090 reopens D-02-d "until a third package needs one". **No third package folds a tree.**
`@qadi/react`, `@qadi/http`, `@qadi/audit` and `@qadi/promise` encode or redact traces through
`TraceSchema` or `AccessDeniedPublic`, and none walks one. What changed is the premise. The twin
existed because the zip "needs a fold over *virtual* position nodes that no domain adapter in core
can describe". Once core describes the position nodes itself, devtools has nothing generic left to
fold, the twin goes to zero users and is deleted, and the number of copies of the mechanism goes
from two to one — without exporting `foldTree` and without a cross-package subpath import (there is
no subpath, ADR-QD-099). Both of ADR-QD-090's rejected alternatives stay rejected.

## Consequences

- **One copy of `foldTree`.** `packages/devtools/src/model/TreeFold.ts` and its test, a byte copy of
  core's, are deleted.
- **`Trace` joins [INV-QD-090](../invariants.md).** No `maxDepth` a caller supplies turns reading
  the trace into a defect.
- **`renderTrace` output changes only past 64 levels** (`(depth N) ` prefix and capped indentation),
  and `indentLimit: Infinity` restores it.
- **New root exports of `@qadi/core`:** `foldTrace`, `TraceCases`, `foldAligned`, `AlignedNode`,
  `tracePathKey`, and `RenderTraceOptions.indentLimit`. **New in `@qadi/devtools`:**
  `describeTracePath`.
- A new invariant, [INV-QD-103](../invariants.md), states the alignment as a property of core, and
  [INV-QD-040](../invariants.md) cites it instead of restating it.
- Whether a trace *belongs* to its policy stays by construction: the property test
  (`TraceAlignment.test.ts`) is what pins it.

### What must survive ARCH-20

`Simulator.tsx`'s status sentence will move into a headless session. Whatever carries it must keep
wording a flip's path through `describeTracePath` (not a local `pathOf`), so that "the root" and the
`$.…` key stay one form that `tracePathKey` of the flip's path also produces.

### Not yet

- **A `Misaligned` position** (`foldAligned` checking `trace.policyTag` against the explanation tag
  and marking a mismatch) is the right follow-up if a caller ever pairs foreign data.
- **`TraceSchema` encode/decode** overflows at about 936 / 741 levels (N4). The sink wire is guarded;
  whether `@qadi/react`'s dehydrate path is guarded for a deep in-process trace is unverified. ARCH-25.
- **`maxDepth: NaN`** disables both depth guards (N5). ARCH-29.
- **`RoleTree.ts`'s `"$"` addresses** are a different tree and may adopt the key builder later.

## Alternatives considered

- **A zip over `foldExplanation`** (the review's wording). Wrong: it memoises by identity and
  `explain` shares nodes (N1).
- **`InspectNode.path: TracePath`.** O(n²) memory, out of memory at 40,000 levels (N2).
- **Make `TracePath` the string everywhere.** A breaking change to `diffTraces`' public type, and
  addressing "the same node in the `Policy` beside it" would need a parse.
- **Keep `foldTrace` internal.** Leaves `Trace` the only public recursive type without a stack-safe
  walk, and INV-QD-090 limited to three of the four.
- **Full indentation with a documented ceiling.** The overflow becomes a different `RangeError`,
  which keeps the defect. **A `renderTraceLines`.** Still quadratic in characters in total.
- **Put the field sentence in `FieldLattice.ts`** (mixes English into the lattice's law table) or
  **export it from `Explanation.ts` and import it into `Decision.ts`** (a cycle with the zip's
  type import of `Trace`).
- **A runtime check that the trace belongs to the explanation**, throwing (turns a mismatched pair
  into a defect) or marking the position (a new status the inspector must show). Both deferred.
- **Amend ADR-QD-090 in place only.** It asks for an ADR "in so many words", and this decision also
  covers the key format and the field sentence, which are not fold mechanics. ADR-QD-090 carries a
  dated note pointing here.
