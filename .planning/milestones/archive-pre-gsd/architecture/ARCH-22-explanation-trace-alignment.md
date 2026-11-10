---
id: ARCH-22
title: Core owns how an Explanation lines up with a Trace, every Trace walk is stack-safe, and a node has one address
strength: Worth exploring
status: done
evidence_verified_at: e328e75
depends_on: []   # soft: ARCH-17 before T6 (shared fact: `explanationChildrenOf` stays the one children function); ARCH-20 vs T8 (`Simulator.tsx` `pathOf`), whichever lands second rebases
blocks: []
adrs_touched:
  - ADR-QD-090 (amend: its "package-private twin" clause and its "Not yet — `Trace` walkers" bullet. The twin's premise, that "no domain adapter in core can describe" the zip, stops being true once core owns the zip. See D-22-g.)
  - ADR-QD-027 (read: an explanation and a trace stay two artifacts. The zip pairs them and merges neither. `renderTrace` still takes no `Policy`.)
  - ADR-QD-034 (read: `Match`, not `switch`. `SWITCH_BUDGET` is untouched. The new loops dispatch on no `_tag`.)
  - ADR-QD-037 (read: madge. New edges are `Decision.ts`→`TreeFold.ts`, `Decision.ts`/`Explanation.ts`→`Wording.ts` (new), and `Explanation.ts`→`Decision.ts` (type-only). None of them closes a cycle. See §4.)
  - ADR-QD-038 (read: one changeset for the fixed version group.)
  - ADR-QD-047 (read: the devtools model stays at 95% and keeps its own Stryker run. Deleting `model/TreeFold.ts` removes mutants and adds none.)
  - ADR-QD-076 (read: `ignoreStatic`. The new constants are static.)
  - ADR-QD-078 (read: a withheld hydration trace is `Withheld`, so no shipped producer truncates a trace. That makes two `Inspect.ts` doc comments stale; see N6.)
  - ADR-QD-NEXT (new: "The alignment of an explanation with a trace is core's", amending ADR-QD-090)
packages: ["@qadi/core", "@qadi/devtools", "spec", "apps/website (docs only)"]
estimate: L   # T1 alone (the defect fix) is S; T0–T11 ≈ 4 days
---

# ARCH-22 — Core owns how an Explanation lines up with a Trace, every Trace walk is stack-safe, and a node has one address

This plan merges review candidate #7, "Align Explanation and Trace in core", which itself
merged core finding #5 and devtools finding #4.

Glossary. **Nesting depth** means how deeply a tree value nests. **Module depth** means the
architecture sense. **Position** means one place in the explanation tree, reached by one
path from the root. A subtree shared by identity occupies several positions. **Key** is the
canonical text address of a position (`"$"`, `"$.0.2"`). **`TracePath`** is the existing
`ReadonlyArray<number>` address that `diffTraces` reports.

## 1. Verified evidence (at `e328e75`)

`git log --oneline -1` = `e328e75 Keep mutation runs sequential, a worker per core; gate every Stryker config (#146)`.
The review ran at `d0884e6`. `git diff d0884e6 e328e75 --stat` on `Decision.ts`,
`TraceDiff.ts`, `TreeFold.ts` (both copies), `WhatIfTable.tsx` and `Simulator.tsx` is empty,
so their line numbers still hold. `Explanation.ts` and `Inspect.ts` moved in `e9c7afc`
(CCR-QD-183).

Probes are throwaway scripts under
`/private/tmp/claude-502/-Users-mohammadalmechkor-Projects-Perso-qadi/a032054c-2984-4500-9b86-240b3767ee96/scratchpad/wave3/ARCH-22/`.
They ran from `packages/core` as `../../node_modules/.bin/tsx <probe>` on Node v22.22.0
with the default stack (`probe3.mts` also used `NODE_OPTIONS=--conditions=bun`). They
import `src/` by absolute path and `effect` through `packages/core/node_modules/effect`
(the `effect@4.0.0` copy core resolves). Nothing in the repository was written. Overflow
thresholds move with stack size, so read them as orders of magnitude.

- `probe.mts` builds `not^n`, `labeled^n` and `allOf([·])^n` chains, n ∈ {1k, 2k, 3k,
  5k, 10k, 50k, 100k}. It evaluates each with `{ maxDepth: n + 10 }` through
  `test/helpers.ts`'s `testLayer`, then calls `renderTrace`, `diffTraces(t, t)` and
  `renderExplanation(explain(p))`. The `default` mode checks the default and odd `maxDepth`
  values.
- `probe2.mts` binary-searches the last depth that does not throw, on synthetic `Not` chains.
- `probe3.mts` checks identity sharing between `explain` and `foldExplanation`, and what
  `inspect` makes of it.
- `probe4.mjs` measures the cost of keeping one fresh `number[]` path per node against a
  rope string.
- `spike.mts` prototypes a stack-safe `renderTrace` (pre-order stack), a stack-safe
  `diffTraces` (explicit stack plus a parent-linked path materialised only on report) and
  `foldTrace` (an adapter over core's `foldTree`). It checks the prototypes against HEAD on
  2,000 random traces.

### Claims from the review

| # | Claim | Verdict | Evidence at `e328e75` |
| - | ----- | ------- | --------------------- |
| C1 | `renderTrace` (`Decision.ts:250-291`) and `diffTraces` (`TraceDiff.ts:188-285`) recurse natively over `Trace` | **CONFIRMED** | `renderTrace`'s `go` recurses at `Decision.ts:276-288` (`node.children.flatMap((child) => go(child, depth + 1))`, `:287`). `diffTraces`'s `walk` is at `TraceDiff.ts:191-279` and recurses at `:277` (`walk(child, other, [...path, i])`). The function ends at `:283`, and `flippedAt` (`:291-295`) inherits the recursion. |
| C2 | A trace's nesting depth is bounded only by the caller's unvalidated `maxDepth`, so a large `maxDepth` on an in-process policy evaluates fine and then throws a raw `RangeError` when rendered or diffed | **CONFIRMED** | `probe.mts`, with every shape and n ≥ 2,000: **`evaluate ok`, then `renderTrace THROWS RangeError: Maximum call stack size exceeded`, `diffTraces THROWS RangeError`**. At n = 1,000 all three succeed, and `renderExplanation` succeeds at every n up to 100k. `probe2.mts` puts the last good depth at **≈1,483 for `renderTrace`** and **≈2,186 for `diffTraces`**. ARCH-02's pre-check does not change this, because it is only as tight as `maxDepth`. With the default (`DEFAULT_MAX_DEPTH` = 64, read at `Evaluate.ts:1145`), `not^100` fails with `PolicyTooDeep { maxDepth: 64 }` before any node is evaluated (`:1152`). But `maxDepth: Infinity` and `1e9` both pass the pre-check, and so does **`NaN`**, which silently disables the guard (N5). Since ADR-QD-090 suspended the wrapper arms, evaluation itself is stack-safe at 100k (the existing `Inspect.test.ts:500-519` evaluates a 100k chain with `maxDepth: Infinity`). The trace it returns is the unbounded input. |
| C2a | *(reachability, which the review did not settle)* | **CONFIRMED, narrower than implied** | `@qadi/devtools` cannot reach it. `simulate` passes no `maxDepth` (`SimulationInput.ts:106-109`, `Simulation.ts:69`), so `whatIf`/`replay` evaluations of a deep policy fail with `PolicyTooDeep` before `compareOutcomes` (`WhatIf.ts:94-113`) calls `diffTraces`. A host can reach it. The documented pattern `Effect.catchTag("AccessDenied", (e) => Effect.logDebug(renderTrace(e.trace)))` (`spec/behaviors/07-enforcement.md:210-217`, `apps/website/.../concepts/enforcement.md:115-122`) throws inside the handler for any decision evaluated with `maxDepth` ≳ 1.5k. That makes a decision become a defect (AGENTS.md §4). INV-QD-090 covers "`Policy`, `Explanation` or `Matcher`" (`spec/invariants.md:2353-2356`) and leaves `Trace` out, which ADR-QD-090 lists under "Not yet" (`090-…md:162-165`). |
| C3 | The visible-fields text ("exposing no fields" / "exposing only …") is byte-identical at `Decision.ts:259-267` and `Explanation.ts:509-516`, and so is the backtick `term` default | **CHANGED (lines moved; claim true)** | The `Decision.ts` copy is unchanged at `:257-267`. The `Explanation.ts` copy moved to **`:575-582`** in `e9c7afc` (at `d0884e6` it was `:509-516`, confirmed with `git show`). The executable bodies are identical (`undefined` → `""`, `[]` → `", exposing no fields"`, else ``, exposing only ${fields.map(term).join(", ")}``). Only `Decision.ts` carries the INV-QD-004 comment on the `undefined` arm. The term default ``(t) => `\`${t}\` `` appears at `Decision.ts:254` and `Explanation.ts:665`, and `RenderTraceOptions.term`'s doc (`Decision.ts:216-218`) says "as `renderExplanation` does", which states the coupling in prose instead of in code. |
| C4 | `devtools/src/model/Inspect.ts:9-15,110-111,263-286` zips an Explanation with a Trace, relying on the sentence "evaluateNode emits one trace node per policy node in declaration order"; that is a core guarantee but only a devtools test enforces it | **CONFIRMED (lines moved)** | The doc is still at `Inspect.ts:9-15`. `inspect` is at **`:109-110`**. The zip (`statusOf`/`Position`/`position`/`childrenOfPosition`) moved to **`:280-314`**: `self.trace?.children[index]` at `:313` *is* the alignment. The sentence is in INV-QD-040's body (`spec/invariants.md:1575-1578`) and BEH-QD-208 (`spec/behaviors/27-devtools-timeline.md:347-351`). INV-QD-040's own statement is about the inspector (`:1551-1552`), and its **Source and Enforcement name only devtools** (`:1554-1556`, `:1580-1583`: `Inspect.test.ts`, `DevtoolsDock.test.tsx`). Core has example assertions on `trace.children.length` (`Evaluate.test.ts:740-802`, `:1122`, `:2001-2012`), but **no test states the alignment as a property over every tag**, with or without `concurrency`. The guarantee is produced by `evaluateNode`, `evaluateAllOf`/`AnyOf`/`Rules` (`Evaluate.ts:600-644`, `:754-913`, `:943-1066`, where `step` pushes one child per row in row order, `:980-981`) and by `explain` (`Explanation.ts:309-357`). Both live in core. |
| C5 | `devtools/src/model/TreeFold.ts` is a twin of core's, and `Inspect` is its only user | **CONFIRMED** | `diff` of the two files differs only in the doc comment (`core :4-7,27-30` vs `devtools :4-5,25-31`). The code `:36-86` is identical. `grep -rn foldTree packages/*/src` shows the devtools copy used only at `Inspect.ts:41,110`. `packages/devtools/test/model/TreeFold.test.ts` is a copy of core's test apart from the import line (`diff` of lines 4+ is empty). |
| C6 | Node addresses exist in two forms, core `TracePath` (`number[]`) and `InspectNode.path` (`"$.0.2"`); `WhatIfTable.tsx:225` and `Simulator.tsx:879` hand-convert with a duplicate `pathOf`, so a flipped `TraceDifference` cannot be linked to the tree node it names | **CONFIRMED, with a sharper reason** | Two identical `pathOf`s exist: `WhatIfTable.tsx:225-226` (used `:189`) and `Simulator.tsx:879-880` (used `:870`). `InspectNode.path` is built at `Inspect.ts:110` (`"$"`) and `:313`. The forms **already disagree at the root**: `pathOf([])` is `"the root"` while the root `InspectNode.path` is `"$"`. Below the root they agree only because both hand-write the same `$.`-join. No function relates a `TracePath` to an `InspectNode`, and no UI links them. A third copy of the format exists for a *different* tree, `RoleTree.ts:57` (`nodeOf(self, "$", …)`). |
| C7 | ADR-QD-090 chose the devtools twin "until a third package needs one" | **CONFIRMED (exact wording below)** | `spec/decisions/090-a-tree-is-folded-through-one-seam.md:157-158`, under Consequences: *"Two copies of the fold mechanism exist (core and devtools), until a third package needs one, at which point D-02-d is reopened with an ADR."* The Decision section (`:88-95`) gives the premise: *"**Devtools gets a package-private twin.** `Inspect.ts` zips an `Explanation` with a `Trace` and a path top-down, which needs a fold over *virtual* position nodes that no domain adapter in core can describe. AGENTS.md §9 keeps `foldTree` out of core's barrel and §1 forbids importing a core subpath, so `packages/devtools/src/model/TreeFold.ts` is a copy of the ~35-line mechanism …"* The twin's own comment repeats the trigger: *"if a third package needs the fold, reopen D-02-d with an ADR rather than copying again"* (`devtools/src/model/TreeFold.ts:30-31`). |

### Findings the review did not have

| # | Finding | Verdict | Evidence |
| - | ------- | ------- | -------- |
| N1 | The target says "an aligned zip **over `foldExplanation`**". That would be wrong, because `foldExplanation` memoises by identity and `explain` shares nodes | **CONFIRMED — the zip must fold positions, not nodes** | `foldTree` combines "a child object reachable by two paths … once and its result reused" (`TreeFold.ts:16-21`), and `explain` folds through `foldPolicy`, so a `Policy` subtree shared by identity becomes one shared `Explanation` object. `probe3.mts` on `anyOf([not(p), p])` with `p = hasRole("x")` prints `shared explanation node reused by identity: true` and **`foldExplanation combine calls (4 positions): 3`**. A zip built on `foldExplanation` would give the second occurrence the first one's result: the trace of `$.0.0` and its key, at `$.1`. Devtools gets this right today only because it folds fresh `Position` objects (`Inspect.ts:291-314`). `inspect` prints `$=Allowed $.0=Denied $.0.0=Allowed $.1=Allowed`. The core zip must keep that design, and `sharedPolicyArbitrary` (`test/helpers.ts:216`) must pin it. |
| N2 | A per-node `number[]` address is infeasible, so "one path form" cannot mean `InspectNode.path: TracePath` | **CONFIRMED** | `probe4.mjs`: keeping one fresh `[...path, i]` per node of a chain took 276 ms at 10k (50M retained numbers) and 1,015 ms at 20k (200M), and **ran out of an 8 GB heap at 40k**. A rope string (`` `${s}.0` ``) took 0.4 ms at every size. The existing 100k test (`Inspect.test.ts:468-481`) asserts only `path.length`, for exactly this reason (`:474-475`). `diffTraces`'s `[...path, i]` (`TraceDiff.ts:277`) has the same quadratic shape. HEAD overflows first, so this only matters once `diffTraces` is stack-safe. |
| N3 | A stack-safe `renderTrace` still throws past ≈23k levels, because its format is quadratic in characters | **CONFIRMED** | Line *d* carries `indent.repeat(d)`, so a chain of n renders about n² characters. `spike.mts`'s stack-safe prototype returns 100M characters at 10k and 400M at 20k, then **`RangeError: Invalid string length` at 30k** (V8's ≈536M-character limit). Making the walk stack-safe is necessary but not sufficient. See D-22-b. |
| N4 | `Schema` encode/decode of `TraceSchema` overflows earlier still (≈936 / ≈741 levels) | **CONFIRMED, out of scope** | `probe2.mts`. The sink wire is guarded (`SinkCodec.ts:482-490` `preEncodeHazard`, `:590` `exceedsJsonDepth`). `AccessDenied` is a `Schema.TaggedError` whose `trace` is `TraceSchema` (`Errors.ts:206`). `@qadi/http` sends `AccessDeniedPublic`, which has no trace. Whether `@qadi/react`'s dehydrate path encodes a deep in-process trace unguarded is **UNVERIFIED**: run `Schema.encodeUnknownSync(DehydratedDecisions)` on a 1,000-deep trace to settle it. Handed to ARCH-25 (encode-refusal description in core). |
| N5 | `maxDepth: NaN` disables both depth guards | **CONFIRMED, out of scope** | `probe.mts default`: `maxDepth=NaN, not^3: success`. `policyDepth(p) > NaN` and `depth > NaN` are both false (`Evaluate.ts:1152`, `:501`). Since ADR-QD-090, evaluation is stack-safe, so NaN removes a resource bound and does not crash. This plan makes the trace walkers safe at any depth, so it does not need `maxDepth` validated. Handed to ARCH-29 (loose-end defects). Its scratch `nan-probe.mts` is about retention, a different NaN. |
| N6 | `Inspect.ts:137-139` (and `Inspector.tsx:170-174`, INV-QD-040 `:1569-1573`) say `dehydrateDecisions` "ships a reduced trace unless `includeTrace` is set". That stopped being true with ADR-QD-078's `Withheld` disclosure | **CONFIRMED (stale prose; behavior unaffected)** | `grep -rni "reduced trace\|truncat" packages/{react,core,http}/src` finds no trace producer. `isTruncated` (`Inspect.ts:150-153`) is still meaningful for a foreign or hand-built trace, and `Replay.ts:154-156` uses it. T7 and T9 rewrite the prose, not the function. |
| N7 | Core's `foldTree` is reachable outside core only through the `./*` subpath | **CONFIRMED** | `packages/core/package.json` `exports` has `"."` and `"./*"`. `spec/overview.md:807` lists `foldTree` under "Not listed above" as reachable "only through the `./*` wildcard subpath". ARCH-29 decides the wildcard's fate. Nothing in this plan imports a core subpath across a package boundary, and every new cross-package name comes from the root barrel. |
| N8 | Prototype behaviour matches HEAD | **CONFIRMED (spike)** | `spike.mts`: on 2,000 random traces (nesting ≤ 6, labels, reasons, `visibleFields` ∈ {`undefined`, `[]`, `["x"]`}), **`renderTrace agrees 2000/2000`** byte for byte, and **`diffTraces agrees 2000/2000`** (the spike omits `FieldsChanged`/`ObligationsChanged` and compares with them filtered out). On 100k chains, the prototype `diffTraces` takes 53 ms for an identical pair (0 differences) and a one-node difference (1). `foldTrace` folds 100k with no error. |

## 2. Goal and success criteria

**Goal.** The pairing of an `Explanation` with a `Trace` is a fact core produces
(`evaluateNode` emits it, `explain` mirrors it). Today it is consumed through a
**shallow** devtools module that re-states it by index and carries its own copy of the
fold mechanism. This plan moves that knowledge behind **one deep interface in core**,
`foldAligned(explanation, trace, combine)`. Its **interface** is one combine function over an
`AlignedNode` (explanation node, its trace node or `undefined`, its key, its row effect). The
`foldTree` loop, the position bookkeeping, the identity-memo hazard (N1), the
short-circuit-means-`undefined` rule and the key format sit **behind the seam**.

`@qadi/devtools` becomes an **adapter** that supplies only presentation (`shapeOf`, labels,
`NodeStatus`). Its twin of the fold is deleted, because nothing generic is left for it to
fold. The **locality** gain is one owner for each fact:

- core's `Wording.ts` owns the field-list sentence and the default `term`;
- `tracePathKey` owns a node's text address;
- `Decision.ts` owns a stack-safe `foldTrace` beside `Trace`.

The **leverage** gain is that `renderTrace` and `diffTraces` join INV-QD-090. A caller's
`maxDepth` can no longer turn a trace read into a defect.

**Success criteria** (each one checkable):

1. `renderTrace` and `diffTraces`/`flippedAt` return without throwing on traces from
   `evaluate(chain(w, 100_000, …), { maxDepth: Infinity })` for
   `w ∈ {not, labeled l, allOf([·]), rules([permitWhen(·)])}`. Tests: new cases in
   `packages/core/test/RenderTrace.test.ts` and `TraceDiff.test.ts`, each with a `60_000` budget.
2. For every trace of nesting depth ≤ `DEFAULT_MAX_DEPTH`, `renderTrace` output is
   byte-identical to HEAD's. `diffTraces` output is deep-equal to HEAD's for every pair. This
   is a differential property against a test-local copy of today's recursive
   implementations, at a depth those can handle.
3. `foldTrace` is exported from `@qadi/core`, folds 100k-deep and 250k-wide traces, and
   memoises a shared node the same way `foldExplanation` does (`RenderTrace.test.ts` or a new
   `Decision.test.ts` block).
4. `grep -rn 'exposing only \${\|", exposing no fields"' packages/core/src` matches only
   `packages/core/src/Wording.ts`. ``grep -rn '`\\\\`\${t}\\\\``' packages/core/src`` matches
   exactly one definition, `Wording.ts`'s `defaultTerm`.
5. `packages/devtools/src/model/TreeFold.ts` and `packages/devtools/test/model/TreeFold.test.ts`
   do not exist. `grep -rn foldTree packages/devtools` is empty.
6. A core property test (`packages/core/test/TraceAlignment.test.ts`, *new*) states the
   alignment for every policy from `policyArbitrary()` and `sharedPolicyArbitrary`, against
   random subjects, with and without `concurrency`. Every trace node sits at a position whose
   explanation node is the counterpart of its `policyTag`. A composite's trace children are
   a prefix of its parts. Wrappers have exactly one child and leaves none. Each position is
   visited exactly once, including shared subtrees. INV-QD-NEXT names this test as its
   Enforcement. INV-QD-040 cites INV-QD-NEXT.
7. `grep -rn "const pathOf" packages/devtools/src` is empty. One helper renders a `TracePath`
   for display, and `tracePathKey` is the only producer of the `$.`-joined form. A devtools
   model test shows that for a what-if flip, the node with
   `node.path === tracePathKey(flip.path)` in `flattenTree(inspect(policy, after.trace))` is
   the flipped node.
8. `spec/overview.md` lists `foldTrace`, `foldAligned`, `AlignedNode` and `tracePathKey`
   (gate 13, `node scripts/check-api-surface.mjs`). ADR-QD-090 carries an amendment note
   pointing to ADR-QD-NEXT. `pnpm check` is green.

## 3. Non-goals

- **Linking UI.** No click-to-jump from a what-if row to a tree node. This plan makes the link
  *computable* (criterion 7). Drawing it belongs to the screens, and ARCH-20 owns the
  simulator's headless session.
- **Changing `TracePath`'s type** or `TraceDifference`'s shape. It stays
  `ReadonlyArray<number>`, a public type (D-22-c rejects option c).
- **Validating `maxDepth`** (N5, handed to ARCH-29). **Bounding `TraceSchema`
  encode/decode** (N4, handed to ARCH-25).
- **`RoleTree.ts`'s `"$"` addresses.** That is a different tree (role inheritance). It can
  adopt the key builder later. It is not a `Trace` address.
- **A runtime check that a trace belongs to its policy** (D-22-f rejects option c). The
  guarantee is by construction, and the core property test (criterion 6) is what pins it.
- **Rendering a deep `PolicyTree` in React.** `PolicyTree.tsx:90` recurses as React
  components. That is a UI concern and not a pure walk.
- **ARCH-17's case-wise fold.** This plan neither needs nor blocks it (D-22-h).

## 4. Constraints

| Constraint | Consequence here |
| ---------- | ---------------- |
| AGENTS.md §1 (namespace `effect` imports; cross-package imports from the root only) | Devtools imports `foldAligned`, `AlignedNode` and `tracePathKey` from `"@qadi/core"`, never from `@qadi/core/Explanation`. This removes ADR-QD-090's stated reason for the twin. |
| AGENTS.md §9 (barrel; scaffolding stays out) | `foldTree` stays out of the barrel. `Wording.ts` is scaffolding, so it stays out and gets a "Not listed above" row (D-22-d). `foldTrace`, `foldAligned`, `AlignedNode` and `tracePathKey` are vocabulary a caller uses, so they go in. |
| AGENTS.md §4 / §6 (no `orDie`; no `as`, `!`, `any`) | Pure functions, no Effect. The existing `noUncheckedIndexedAccess` guard style (`TraceDiff.ts:270-278`) is kept in the new loop. `rule.effect` is read from `Row.effect`, not cast. |
| AGENTS.md §5 / `UNTRACED_BUDGET` (3 entries) | Untouched. Nothing new is effectful. |
| AGENTS.md §5a / `SWITCH_BUDGET` (3 entries) | Untouched. The loops dispatch on no tag. The row-effect lookup uses `Match.tagsExhaustive` at module scope if it needs per-tag logic at all (it reads `Table.rows[i].effect` only). |
| `SCHEMA_ERROR_BUDGET` (12), `ANY_BUDGET` (7), `HAS_CUSTOM_BUDGET` (1) | Untouched. No new error class, no `any`, and the new tests use `hasCustom` only if `policyArbitrary` already does, which is inside `packages/core`, an exempt prefix. |
| `PORT_DOUBLE_BUDGET` | Untouched. The alignment property runs on `testLayer` ports and builds no hand-made failing port. |
| `DECISION_READ_BUDGET` | Untouched (`@qadi/react` only). |
| ADR-QD-037 (madge, `pnpm circular`) | New edges are `Decision.ts → TreeFold.ts`, `Decision.ts → Wording.ts`, `Explanation.ts → Wording.ts` and `Explanation.ts ⇢ Decision.ts` (type-only; madge counts it). `Decision.ts`'s runtime imports reach `Policy`, `FieldLattice`, `FieldPath`, `Obligation`, `TreeFold` and, transitively, `Matcher`/`Compare`/`SecurityLabel`/`Identity`/`Signature`/`Permission`/`DecodeDepthGuard`. None of those imports `Explanation.ts`, so no cycle. `Wording.ts` imports nothing. Option D-22-d(c) would have created `Decision → Explanation → Decision`. |
| AGENTS.md §15 / gate 13 (`node scripts/check-api-surface.mjs`) | Four new rows in `spec/overview.md`. `Wording.ts`'s exports go in "Not listed above". The `foldTree` row loses its "devtools keeps a twin" sentence. |
| AGENTS.md §11–12 (spec normative; `typescript` fences compile, `node scripts/check-doc-examples.mjs`) | BEH-QD-303's neighbour gains a compiled `foldAligned` example. BEH-QD-144 gains the indent-cap sentence. Every new fence must compile. |
| ADR-QD-047 (devtools model at 95%, own Stryker run `stryker.devtools.mjs`, `mutate: packages/devtools/src/model/**`) | Deleting `model/TreeFold.ts` removes its mutants. `Inspect.ts` shrinks. Core's run (`stryker.config.mjs`, `mutate: packages/core/src/**`) picks up `Wording.ts` and the new loops, with `break: 80`. |
| Heavy-test convention (`e9c7afc`, ADR-QD-098) | Each new 100k/250k test carries an explicit `60_000` timeout. There is no global timeout change. |
| ADR-QD-090's own text (C7) | D-02-d is "reopened with an ADR" (D-22-g), not edited silently. |

## 5. Decisions needed before work starts

### D-22-a — Export `foldTrace` from the barrel
- **(a) Export it from `Decision.ts`, beside `Trace`.** It would be the fourth thin adapter
  over `foldTree`, beside `foldPolicy`, `foldExplanation` and `foldMatcher`. INV-QD-090 then
  covers every public recursive type a caller holds. `Trace.children` is public, and
  `AccessDenied.trace` reaches every host, so a host that walks it needs a stack-safe
  primitive more than core does. The cost is one name and one overview row. The honest
  weakness: **no in-repo caller uses it.** `renderTrace` needs pre-order with indentation
  (a post-order fold would re-indent every descendant at every level, which is O(n²) work),
  and `diffTraces` walks two trees in lockstep. The leverage is for callers.
- **(b) Keep it internal** and make only the two walkers stack-safe. This adds no surface.
  It leaves `Trace` the only public tree without a stack-safe walk, and leaves INV-QD-090
  limited to three of the four types.
- **Recommendation: (a)**, documented as "the stack-safe walk for a caller-held trace". Its
  test pins the identity-memo semantics explicitly, because a caller folding a hand-built
  trace with shared nodes must not be surprised.
- **status: decided (2026-10-07, export foldTrace, case form)**

### D-22-b — What `renderTrace` does past the string-length ceiling (N3)
- **(a) Cap the indentation.** Beyond `indentLimit` levels (default `DEFAULT_MAX_DEPTH` = 64),
  a line keeps 64 levels of indent and is prefixed `(depth N) `. Output is O(n · limit).
  Every trace evaluated under the default bound renders byte-identically. A deep trace still
  renders.
- **(b) Full indentation, documented ceiling.** Stack-safe up to ≈23k levels, then
  `RangeError: Invalid string length`. The overflow becomes a different `RangeError`, which
  keeps the defect.
- **(c) Add `renderTraceLines(trace) → ReadonlyArray<string>`** and keep `renderTrace` as the
  join. The lines are still O(n²) in total characters, so this moves the ceiling without
  removing it.
- **(d) = (a) plus an `indentLimit?: number` on `RenderTraceOptions`** (with `Infinity` restoring
  today's format for a caller who knows their depth).
- **Recommendation: (d).** It is the complete option (user memory: prefer complete over
  simple). It is byte-identical inside the default bound and total beyond it, and the one
  new option has a clear default.
- **status: decided (2026-10-07, cap indentation, indentLimit option (d))**

### D-22-c — One address form
- **(a) `InspectNode.path: TracePath`.** **Infeasible**: O(n²) memory, out of memory at 40k
  (N2), and it breaks the 100k INV-QD-090 test.
- **(b) One canonical key, owned by core.** `tracePathKey(path: TracePath): string` returns
  `"$"`, `"$.0.2"`, …. `AlignedNode.key` is built incrementally as a rope (O(1) per position)
  and is equal to `tracePathKey` of the position's path. A property test pins that equality.
  `InspectNode.path` keeps its type and its values (`"$"`-rooted, so it is not breaking) and
  is now *defined* as that key. The two React `pathOf`s become one devtools helper,
  `describeTracePath(path)` in `model/Inspect.ts`, which returns `"the root"` for `[]` and
  otherwise `tracePathKey(path)`. The display wording stays the screens'.
- **(c) Make `TracePath` the string everywhere.** That changes `diffTraces`' public type
  (breaking). Addressing "the same node … in the `Policy` beside it" (`TraceDiff.ts:11-12`)
  would then need a parse.
- **Recommendation: (b).** Its home is `TraceDiff.ts`, beside `TracePath`, so the address type
  and its text are one module.
- **status: decided (2026-10-07, one canonical key owned by core (tracePathKey, TraceKey.ts))**

### D-22-d — Where the shared field-list sentence and default `term` live
- **(a) A new internal `packages/core/src/Wording.ts`.** It exports `defaultTerm` and
  `fieldsClause(fields, term)`. It has no imports, is not in the barrel, and gets a "Not
  listed above" row.
- **(b) `FieldLattice.ts`.** It owns `VisibleFields`, but would mix English into the lattice's
  law table.
- **(c) Export it from `Explanation.ts` and import it into `Decision.ts`.** Together with the
  zip's type import of `Trace` (D-22-e), that makes a cycle under madge.
- **Recommendation: (a).** `renderTrace`'s obligation clause (`, owing …`) and
  `renderExplanation`'s (`, and owes …`) are deliberately different sentences, so only the
  field clause and `term` move.
- **status: decided (2026-10-07, internal Wording.ts)**

### D-22-e — Name, home and shape of the aligned zip
- **Shape (recommended):**

  ```ts
  interface AlignedNode {
    readonly explanation: Explanation;
    readonly trace: Trace | undefined;
    readonly key: string;
    readonly effect: RuleEffect | undefined;
  }

  foldAligned<R>(
    explanation: Explanation,
    trace: Trace | undefined,
    combine: (node: AlignedNode, children: ReadonlyArray<R>) => R,
  ): R
  ```

  - `trace` is `undefined` when evaluation never reached the position. That covers a
    short-circuited branch, everything beneath it, or no trace at all.
  - `effect` is the `Table` row's effect when the position is a row condition.
  - `combine` runs **once per position**, never memoised by identity (N1). It folds fresh
    position frames through the internal `foldTree`.
- **Home:**
  - **(a) `Explanation.ts`.** It uses the private `explanationChildrenOf` and `Row`, and adds
    a type-only import of `Trace`. This puts the zip next to the one children fact it
    depends on.
  - **(b) A new `TraceAlignment.ts`.** It would need `explanationChildrenOf` exported, which
    is a new public name or a "Not listed" row.
- **Input type:** it takes an `Explanation`, not a `Policy`, so a caller who already has
  `explain(p)` does not pay twice. Devtools calls `foldAligned(explain(policy), trace, …)`.
- **Recommendation: (a)**, named `foldAligned`. Alternatives considered: `foldExplained`,
  which hides that a trace is involved, and `zipTrace`, which does not say it folds.
- **status: decided (2026-10-07, foldAligned in Explanation.ts, takes an Explanation)**

### D-22-f — Should the zip check that the trace belongs to the explanation?
- **(a) No runtime check.** Pin it with the core property test (criterion 6). This is today's
  behaviour.
- **(b) Check `trace.policyTag` against the explanation tag at each position and throw on a
  mismatch.** A hand-built or foreign mismatched pair becomes a defect.
- **(c) Check and mark the position `Misaligned`.** This is a new status the inspector would
  need to show.
- **Recommendation: (a).** Every in-repo caller pairs a record's own policy with its own trace
  (`inspectEntry` `Inspect.ts:120-125`, `Replay.ts:152`, `Simulator.tsx:771`), and the
  guarantee is by construction. (c) is the right follow-up if a caller ever pairs foreign
  data, and it is noted in ADR-QD-NEXT's "Not yet".
- **status: decided (2026-10-07, no runtime check)**

### D-22-g — How ADR-QD-090 is amended, and whether its trigger has fired
- **The condition, quoted (C7):** *"until a third package needs one, at which point D-02-d is
  reopened with an ADR."*
- **Is it met? No.** No third package folds a tree. `grep -rn "\.children" packages/*/src`
  finds trace walking only in core and devtools. `@qadi/react`, `@qadi/http`, `@qadi/audit`
  and `@qadi/promise` encode or redact traces through `TraceSchema` or `AccessDeniedPublic`,
  and none walks one.
- **What changes is the premise, not the trigger.** The twin exists because the zip "needs a
  fold over *virtual* position nodes that no domain adapter in core can describe" (`:88-90`).
  INV-QD-040's alignment sentence, however, describes **core** behaviour
  (`evaluateNode`, `explain`). Once core describes the position nodes itself (`foldAligned`),
  devtools has nothing generic left to fold. The twin goes to zero users and is deleted. The
  count of copies of the mechanism goes from two to one **without** exporting `foldTree` and
  without a cross-package subpath import. Both of ADR-QD-090's rejected alternatives
  (`:183-187`) stay rejected.
- **Options:**
  - **(a) A new ADR-QD-NEXT** ("The alignment of an explanation with a trace is core's"),
    plus a dated amendment note in ADR-QD-090 under the twin clause and the "Not yet — `Trace`
    walkers" bullet.
  - **(b) Amend ADR-QD-090 in place only.**
- **Recommendation: (a).** ADR-QD-090 asks for an ADR in so many words, and the new decision
  also covers the key format and the field sentence, which are not fold mechanics.
- **status: decided (2026-10-07, new ADR-QD-101 amending ADR-QD-090)**

### D-22-h — Sequencing with ARCH-17 and ARCH-20
- **ARCH-17** (case-wise policy fold) may change `foldExplanation`'s *public* signature.
  `foldAligned` uses the private `explanationChildrenOf` and `foldTree`, not
  `foldExplanation`, so the two are independent **provided ARCH-17 keeps
  `explanationChildrenOf` (or an equivalent children function) as the one children fact for
  `Explanation`**. That is the shared decision.
- **ARCH-20** (headless `SimulationSession`) moves `Simulator.tsx`'s status sentence, and with
  it its `pathOf`, into the model.
- **Options:**
  - **(a)** T1–T5 start now. T6 waits for ARCH-17's D-decision on the children function, not
    for ARCH-17 to land. T8 is done by whichever of ARCH-20/ARCH-22 lands second, using
    `describeTracePath`.
  - **(b)** Serialise ARCH-22 after both.
- **Recommendation: (a).**
- **status: decided (2026-10-07, T1-T5 now, T6 after ARCH-17 (landed), T8 partly (ARCH-20 not landed))**

## 6. Tasks

### T0 — Re-baseline on a fresh branch from `main`
- **Status:** [x] done
- **Depends on:** —
- **Files:** none
- **Steps:**
  1. `git switch -c arch/22-trace-alignment main`. Confirm `git log --oneline -1`.
  2. Re-run §1's probes against the branch. Copy `probe.mts`, `probe2.mts`, `probe3.mts` and
     `spike.mts` from the scratchpad. If the scratchpad is gone, re-create them from §1's
     descriptions. Record the thresholds in §10.
  3. Re-read ARCH-17's and ARCH-20's plans (if written) for edits to `Explanation.ts`,
     `Simulator.tsx` or `WhatIfTable.tsx`, and settle D-22-h.
- **Tests:** none.
- **Verify:** `pnpm vitest run packages/core/test/RenderTrace.test.ts packages/core/test/TraceDiff.test.ts packages/core/test/TreeFold.test.ts packages/devtools/test/model/Inspect.test.ts packages/devtools/test/model/TreeFold.test.ts packages/devtools/test/react/WhatIfTable.test.tsx`;
  `node scripts/check-house-style.mjs`; `node scripts/check-api-surface.mjs`; `pnpm circular`.
- **Done when:** baseline counts and probe thresholds are in §10.

### T1 — Make `diffTraces` and `renderTrace` stack-safe (test-first defect fix, C1/C2)
- **Status:** [x] done
- **Depends on:** T0. It ships alone, before any refactor, using today's API plus nothing new.
- **Files:** `packages/core/test/TraceDiff.test.ts`, `packages/core/test/RenderTrace.test.ts`,
  `packages/core/src/TraceDiff.ts`, `packages/core/src/Decision.ts`,
  `.changeset/trace-walks-stack-safe.md` (*new*).
- **Steps:**
  1. **Red.** In `TraceDiff.test.ts`, add
     `describe("stack safety — a trace of any nesting depth (ARCH-22 C2)")`:
     - for each `w` of `not`, `labeled("l", ·)`, `allOf([·])` and `rules([permitWhen(·)])`,
       evaluate `chain(w, 100_000, hasRole("reader"))` with `{ maxDepth: Infinity }` (helpers
       `chain`, `testLayer`);
     - assert `diffTraces(t, t)` is `[]`;
     - build a second trace differing only at the leaf (evaluate against a subject without
       `reader`), and assert that `flippedAt` names a path of length `n` (`not` alternates, so
       compare `diffTraces(...)[0].path.length` only);
     - also add 250k-wide `allOf` of leaves;
     - give each case `60_000`.

     Run it: it fails with `RangeError`.
  2. **Red.** In `RenderTrace.test.ts`, render a 3,000-deep evaluated chain. It is above the
     ≈1,483 threshold, and its output is ≈9M characters. Assert the line count is 3,001 and
     the last line's mark. Add a 250k-wide case. Run it: it fails with `RangeError`.
  3. **Green, `diffTraces`.** Replace `walk` with an explicit stack of
     `{ a, b, link }`. `link` is a parent pointer `{ parent, index } | undefined`. Materialise
     `path` lazily, once per node, only when a difference is pushed (`spike.mts`). Push
     children in reverse so they pop in order, which keeps HEAD's pre-order, parents-first
     order (`TraceDiff.ts:183-186`). Keep every per-node check and its comment verbatim. Keep
     the early `continue` after `ChildCountChanged`. Keep the `other !== undefined` guard and
     its comment (it now guards `b.children[i]` in the push loop).
  4. **Green, `renderTrace`.** Replace `go` with the pre-order stack of `[node, depth]` from
     `spike.mts`, pushing children in reverse. Leave the line format untouched. The cap is T2.
  5. Add a **differential property** to both files. Put a *test-local* copy of HEAD's
     recursive `diffTraces`/`renderTrace` in the test file as the oracle, with a comment that
     it is HEAD's at `e328e75`. Run `FastCheck` over random traces, nesting ≤ 8, with
     `visibleFields` ∈ {`undefined`, `[]`, `[a]`, `[b, a]`}, obligations from
     `obligation("x", …)` and labels. Assert byte equality for render and deep equality for
     diff, over 300 runs with a fixed seed.
  6. Changeset (patch-level wording, inside the fixed group): "`renderTrace` and
     `diffTraces` no longer overflow the stack on a trace evaluated under a large `maxDepth`."
- **Tests:** four red-first stack-safety cases and two differential properties.
- **Verify:** `pnpm vitest run packages/core/test/TraceDiff.test.ts packages/core/test/RenderTrace.test.ts`;
  `node scripts/check-house-style.mjs`.
- **Done when:** both files are green, and the property shows no difference from HEAD's oracle.
  If T1 ships alone, it carries its own INV-QD-090 sentence (T9 step 2) and CCR row.

### T2 — Cap `renderTrace`'s indentation (D-22-b)
- **Status:** [x] done
- **Depends on:** T1, D-22-b
- **Files:** `packages/core/src/Decision.ts`, `packages/core/test/RenderTrace.test.ts`
- **Steps:**
  1. Add `readonly indentLimit?: number` to `RenderTraceOptions`, documented as follows:
     "Levels of indentation before depth is written as a number. Defaults to
     `DEFAULT_MAX_DEPTH`, so every trace evaluated under the default bound renders unchanged.
     `Infinity` restores full indentation, whose output grows with the square of the depth."
  2. In the loop, set `shown = Math.min(depth, limit)` and
     `prefix = depth > limit ? `(depth ${depth}) ` : ""`, giving the line
     `${indent.repeat(shown)}${prefix}${mark} …`. Import `DEFAULT_MAX_DEPTH` from
     `Policy.ts`. `Decision.ts` already imports `POLICY_TAGS` from there at runtime, so the
     import graph does not change.
  3. Decide what `indentLimit` values below 0 or `NaN` do. Treat them as `0` (no indentation)
     with `Math.max(0, …)`. NaN must not reproduce N5, so test it explicitly.
- **Tests:**
  - a 100k chain renders within `60_000`, its last line is `(depth 100000) ✓ HasRole`-shaped,
    and its length is O(n);
  - a 64-deep chain is byte-identical to the T1 oracle;
  - `indentLimit: Infinity` on 3,000 levels equals the oracle;
  - `indentLimit: NaN` and `-1` render with no indentation.
- **Verify:** `pnpm vitest run packages/core/test/RenderTrace.test.ts`
- **Done when:** the 100k render passes, and the ≤ 64 differential still holds.

### T3 — One field sentence and one default term (C3, D-22-d)
- **Status:** [x] done
- **Depends on:** T0, D-22-d
- **Files:** `packages/core/src/Wording.ts` (*new*), `packages/core/src/Decision.ts`,
  `packages/core/src/Explanation.ts`, `packages/core/test/Wording.test.ts` (*new*)
- **Steps:**
  1. Create `Wording.ts` with a module doc (one-line summary, then the why: C3, INV-QD-004)
     and two exports:
     - ``export const defaultTerm = (text: string): string => `\`${text}\```;``
     - `export const fieldsClause = (fields: ReadonlyArray<string> | undefined, term: (text: string) => string): string`,
       with `Decision.ts:257-267`'s body and both comments (the `undefined`-is-top one and the
       bottom-of-the-lattice one).
  2. In `Decision.ts`, delete the local `fieldsText` and replace `:254`'s default with
     `defaultTerm`. Reword `RenderTraceOptions.term`'s doc to "Defaults to `defaultTerm`, the
     one `renderExplanation` uses".
  3. In `Explanation.ts`, delete `:575-582` and replace `:665`'s default with `defaultTerm`.
     The `Requirement` arm calls `fieldsClause(e.fields, term)`. Leave
     `outsideStrategyClause`'s "but exposing no fields: …" alone. It is a different sentence.
  4. Barrel: do **not** add `Wording.ts` to `index.ts`.
- **Tests:** `Wording.test.ts` covers the three arms of `fieldsClause` (`undefined`, `[]`,
  several terms) and `defaultTerm`. The existing `RenderTrace.test.ts`/`Explanation.test.ts`
  strings pass unchanged. That is the behaviour-preservation proof.
- **Verify:** `pnpm vitest run packages/core/test/Wording.test.ts packages/core/test/RenderTrace.test.ts packages/core/test/Explanation.test.ts`;
  `pnpm circular`; criterion 4's two greps.
- **Done when:** the greps return only `Wording.ts`, and madge reports no cycle.

### T4 — `foldTrace` (D-22-a)
- **Status:** [x] done
- **Depends on:** T0, D-22-a
- **Files:** `packages/core/src/Decision.ts`, `packages/core/test/RenderTrace.test.ts` (or
  `packages/core/test/Decision.test.ts`, whichever already holds `Trace`-shape tests; at T0,
  `Decision.test.ts` exists)
- **Steps:**
  1. In `Decision.ts`, add
     `export const foldTrace = <R>(self: Trace, combine: (node: Trace, children: ReadonlyArray<R>) => R): R => foldTree(self, traceChildrenOf, combine);`
     with a private `const traceChildrenOf = (t: Trace): ReadonlyArray<Trace> => t.children;`.
     Doc it as "the `Trace` twin of `foldPolicy`", with the identity-memo and cycle sentences
     copied from `foldExplanation`'s doc (`Explanation.ts:139-146`).
  2. Update `TreeFold.ts`'s module doc (`:4-7`) to list four adapters.
- **Tests:**
  - post-order with children in order;
  - a 100k chain and a 250k-wide node (`60_000`);
  - a shared child combined once, with the result reused by reference;
  - a hand-mutated cycle throws `foldTree`'s error.

  These mirror the `foldExplanation` tests. Do not copy the `foldTree` tests.
- **Verify:** `pnpm vitest run packages/core/test/Decision.test.ts`; `pnpm circular`.
- **Done when:** the tests pass, and `foldTrace` is in the barrel through `export * from "./Decision.ts"`.

### T5 — `tracePathKey` (D-22-c)
- **Status:** [x] done
- **Depends on:** T0, D-22-c
- **Files:** `packages/core/src/TraceDiff.ts`, `packages/core/test/TraceDiff.test.ts`
- **Steps:**
  1. Add `export const tracePathKey = (path: TracePath): string`. It returns `"$"` for `[]` and
     otherwise `"$." + path.join(".")`. Document it as "the canonical text address of a node:
     what an inspector keys on, and what a log line prints". Also add an internal
     `childKey(parent: string, index: number): string`, whose result is
     `` `${parent}.${index}` ``. Export it **only** as needed by T6, and not from the barrel.
     Either export it through `Explanation.ts`'s import or co-locate T6's key building in
     `TraceDiff.ts`. The rope behaviour (`Inspect.test.ts:474-475`) depends on the template
     concatenation, not on `join`.
- **Tests:** `tracePathKey([])`, `([0])`, `([0, 2, 11])`, and a property that
  `tracePathKey(p.concat(i)) === childKey(tracePathKey(p), i)` for random `p`.
- **Verify:** `pnpm vitest run packages/core/test/TraceDiff.test.ts`
- **Done when:** the property holds.

### T6 — `foldAligned` in core, and the alignment test moves into core (C4, N1, D-22-e/f)
- **Status:** [x] done
- **Depends on:** T5, D-22-e, D-22-f, D-22-h (ARCH-17's children-function decision)
- **Files:** `packages/core/src/Explanation.ts`, `packages/core/test/TraceAlignment.test.ts` (*new*)
- **Steps:**
  1. In `Explanation.ts`, add a type-only `import type { Trace } from "./Decision.ts"`, plus
     `import type { RuleEffect } from "./Policy.ts"` if it is not already reachable.
  2. Define the exported `AlignedNode` (D-22-e shape) and a private `Frame`, an object
     created fresh per position so `foldTree`'s identity memo never merges two positions:
     `{ node: AlignedNode, parts: ReadonlyArray<{ explanation, effect }> }`. `parts` comes from
     a private module-scope `Match.tagsExhaustive` returning `explanationChildrenOf`'s children
     with their row effect: `Table` gives `rows.map((r) => ({ explanation: r.condition, effect: r.effect }))`,
     and every other tag gives `effect: undefined`. Alternatively, extend
     `explanationChildrenOf` to return pairs, if ARCH-17 agrees.
  3. Write
     `export const foldAligned = <R>(explanation, trace, combine) => foldTree(rootFrame, (f) => f.parts.map((p, i) => frame(p.explanation, f.node.trace?.children[i], childKey(f.node.key, i), p.effect)), (f, children) => combine(f.node, children))`.
     Cap the children at `parts.length`. Extra trace children beyond the parts are ignored, as
     today. A part beyond the trace's children gets `undefined`. That is the
     short-circuit-means-unexamined rule, stated once in its doc comment with INV-QD-005.
  4. Doc comment, summary first: "Folds an explanation and one evaluation's trace together,
     position by position." Then the why:
     - the INV-QD-NEXT alignment sentence, moved from `Inspect.ts:9-15`;
     - **once per position, not per node** (N1, with the `anyOf([not(p), p])` example);
     - stack-safe (INV-QD-090);
     - `key` equals `tracePathKey` of the position's path.
  5. **Move the alignment test into core.** In `TraceAlignment.test.ts`:
     - **Property A1:** for `policyArbitrary()` and `sharedPolicyArbitrary` × a subject
       arbitrary (roles/permissions from the arbitrary's vocabulary) × `concurrency ∈ {undefined, 4}`,
       `evaluate` (skip `Failure` exits). Then `foldAligned(explain(p), d.trace, …)` collects
       the positions. Assert that every position with a trace has
       `trace.policyTag` ↔ `explanation._tag` per a test-local exhaustive
       `Record<Policy["_tag"], Explanation["_tag"]>`. Assert that a position's trace children
       count ≤ parts and is exactly 1 for `Negated`/`Named`/`Owing` and 0 for `Requirement`.
       Assert that a position without a trace has no descendant with one.
     - **Property A2:** the number of positions equals the number of paths in the
       explanation tree, counted by a test-local recursive walk at small depth (this is what
       catches N1). Each `key` is distinct and equals `tracePathKey` of a path
       reconstructed from the fold.
     - **A3:** the `anyOf([not(p), p])` regression from `probe3.mts`.
     - **A4:** a 100k `not` chain evaluated with `maxDepth: Infinity`. Allowed and denied
       alternate down the fold (moved from `Inspect.test.ts:500-519`), with `60_000`.
     - **A5:** a `Rules` table that stops early leaves later rows `undefined`, carries each
       row's `effect`, and shows one trace child per evaluated row in row order (moved from
       `Inspect.test.ts:289-312`).
- **Tests:** A1–A5. A1 and A2 use fixed seeds (house style, e.g. `2026100701`).
- **Verify:** `pnpm vitest run packages/core/test/TraceAlignment.test.ts packages/core/test/Explanation.test.ts`;
  `pnpm circular`; `node scripts/check-house-style.mjs`.
- **Done when:** A1–A5 pass. A deliberately broken variant (memoising on the explanation
  node) fails A2 and A3. Try this locally and revert it.

### T7 — Devtools becomes an adapter: `inspect` over `foldAligned`, twin deleted (C4, C5)
- **Status:** [x] done
- **Depends on:** T6
- **Files:** `packages/devtools/src/model/Inspect.ts`, `packages/devtools/src/model/TreeFold.ts`
  (**delete**), `packages/devtools/test/model/TreeFold.test.ts` (**delete**),
  `packages/devtools/test/model/Inspect.test.ts`
- **Steps:**
  1. Replace `inspect`'s body:
     `foldAligned(explain(policy), trace, (node, children) => toInspectNode(node, shapeOf(node.explanation), children))`.
     `toInspectNode` takes `node.key` as `path`, `node.trace` for status, reason, fields and
     obligations, and `node.effect` as `effect`.
  2. Delete `Position`, `position` and `childrenOfPosition` (`:283-314`) and the
     `./TreeFold.ts` import. `Shape.parts` (and the `Part`/`part` helpers, `:172-185`) lose
     their purpose: `shapeOf` now returns only `kind`, `label`, `detail` and
     `restrictsFields`. Drop `parts` from every arm. `outsideUnion`, `strategy`, `algorithm`,
     `statusOf`, `isTruncated`, `flattenTree` and `inspectEntry` stay.
  3. Rewrite the module doc (`:1-29`). The alignment paragraph is replaced by one sentence:
     "the alignment is core's (`foldAligned`, INV-QD-NEXT)". Keep the "a short-circuited node
     is not a denied one" and "zip the explanation, not the policy" paragraphs.
  4. Fix N6: `isTruncated`'s doc (`:130-149`) says where a truncated trace can still come
     from (a hand-built or foreign trace, `Replay`'s `TraceUndisclosed`), and stops saying
     `dehydrateDecisions` ships one.
  5. Delete both TreeFold files.
  6. `Inspect.test.ts`: delete the tests that A1–A5 now own (the 100k real-trace zip and the
     rule-table-stops-early ordering). **Keep** every presentation test: shape, labels,
     detail, out-of-union, status wording, fields, duties, `inspectEntry`, truncation, and the
     100k `NeverResolved` + `flattenTree` cases. Those exercise devtools' own code at depth.
- **Tests:** `Inspect.test.ts`, trimmed. Run it before and after, and expect only the
  deliberate deletions to disappear.
- **Verify:** `pnpm vitest run packages/devtools/test/model packages/devtools/test/react/DevtoolsDock.test.tsx`;
  `grep -rn foldTree packages/devtools` (empty); `node scripts/check-house-style.mjs`.
- **Done when:** criterion 5 holds and the devtools model suite is green.

### T8 — One address for display, and the link a difference can follow (C6)
- **Status:** [x] done (partial: ARCH-20 not landed; `Simulator.tsx`'s `pathOf` replaced directly)
- **Depends on:** T5, T7, D-22-h (ARCH-20 coordination)
- **Files:** `packages/devtools/src/model/Inspect.ts`, `packages/devtools/src/react/WhatIfTable.tsx`,
  `packages/devtools/src/react/Simulator.tsx` (or ARCH-20's session module if it has landed),
  `packages/devtools/src/index.ts`, `packages/devtools/test/model/WhatIf.test.ts`,
  `packages/devtools/test/model/Inspect.test.ts`
- **Steps:**
  1. In `Inspect.ts`, export
     `describeTracePath = (path: TracePath): string => path.length === 0 ? "the root" : tracePathKey(path)`.
     Document it: "the one display form of a `TracePath`; the key itself is core's".
  2. Delete `pathOf` from `WhatIfTable.tsx:225-226` and `Simulator.tsx:879-880`, and call
     `describeTracePath` at `:189` and `:870`.
  3. Add `describeTracePath` to `packages/devtools/src/index.ts` (alphabetical, AGENTS.md §9)
     and to the overview's devtools table.
- **Tests:**
  - `Inspect.test.ts`: `describeTracePath([])` and `describeTracePath([1, 0])`.
  - `WhatIf.test.ts`: **the link guarantee**. For the `rules([permitWhen(a), permitWhen(b)], DenyOverrides)`
    sweep (`WhatIfTable.test.tsx:111-123` uses it), take a `Compared` row's `flipped`, find
    `flattenTree(inspect(policy, row.outcome.decision.trace)).find((n) => n.path === tracePathKey(flipped.path))`,
    and assert it exists with the flipped verdict.
  - The existing `WhatIfTable.test.tsx` strings (`"the root"`, `"$.1"`) pass unchanged.
- **Verify:** `pnpm vitest run packages/devtools`; `grep -rn "const pathOf" packages/devtools/src` (empty).
- **Done when:** criterion 7 holds.

### T9 — Spec, ADR, overview, traceability, CCR, changeset, website
- **Status:** [x] done
- **Depends on:** T1–T8 (each step can land with its task)
- **Files:** `spec/decisions/NNN-the-alignment-of-an-explanation-with-a-trace-is-cores.md` (*new*,
  ADR-QD-NEXT), `spec/decisions/090-a-tree-is-folded-through-one-seam.md`,
  `spec/decisions/index.yaml`, `spec/invariants.md`, `spec/behaviors/18-explanation.md`,
  `spec/behaviors/25-inspection.md`, `spec/behaviors/27-devtools-timeline.md`, `spec/overview.md`,
  `spec/traceability.md`, `spec/README.md` (if it indexes invariants), the CCR log,
  `.changeset/*.md`, `apps/website/src/content/docs/docs/packages/core/advanced.md`,
  `apps/website/src/content/docs/docs/reference/api.md`
- **Steps:**
  1. **ADR-QD-NEXT.**
     - **Context:** C2, C4, C7, N1–N3.
     - **Decision:** D-22-a…g outcomes. Quote ADR-QD-090's trigger and say that it did not
       fire, and that the premise dissolved instead (D-22-g).
     - **Consequences:** one copy of `foldTree`; `Trace` joins INV-QD-090; the
       `renderTrace` indent cap; four new root exports.
     - **Not yet:** D-22-f(c), N4 (ARCH-25), N5 (ARCH-29).
     - **Alternatives:** D-options rejected, including "zip over `foldExplanation`" (N1) and
       "`TracePath` per node" (N2).
  2. **ADR-QD-090.** Add an amendment note under `:88-95` and `:157-158` ("Superseded by
     ADR-QD-NEXT: the zip is core's, the twin is deleted") and under `:162-165` ("Closed by
     ADR-QD-NEXT"). Bump the revision and change history.
  3. **Invariants.**
     - **INV-QD-090:** extend the statement to "`Policy`, `Explanation`, `Matcher` or
       `Trace`". Source: add `foldTrace` and the `renderTrace`/`diffTraces` loops, and drop
       "devtools' package-private `TreeFold.ts` twin". Enforcement: add T1/T2/T4/A4, and drop
       "(and its devtools twin)".
     - **New INV-QD-NEXT** "A trace lines up with its policy's explanation, position by
       position". Source: `Evaluate.ts` (`evaluateNode` and the three composites), `explain`,
       `foldAligned`. Enforcement: `TraceAlignment.test.ts`.
     - **INV-QD-040:** its alignment paragraph (`:1575-1578`) becomes a citation of
       INV-QD-NEXT. Its Source adds `foldAligned`. Fix N6's "what `dehydrateDecisions` ships"
       clause (`:1569-1573`).
     - Change-history rows.
  4. **Behaviors.**
     - BEH-QD-144 (`18-explanation.md`): the indent cap and `indentLimit`, with a compiled
       `typescript` fence.
     - BEH-QD-303's file: a new BEH-QD-NEXT "An explanation and a trace fold together",
       with `foldAligned`'s signature and a compiled example.
     - BEH-QD-194 (`25-inspection.md`): `tracePathKey`, and that a difference's path names
       the node whose key it formats to.
     - BEH-QD-208 (`27-devtools-timeline.md:347-351`, `:382`): the alignment is core's, and
       the twin sentence goes.
  5. **`spec/overview.md`.**
     - Rows: `foldTrace` (`Decision.ts`), `foldAligned` and `AlignedNode` (`Explanation.ts`),
       `tracePathKey` (`TraceDiff.ts`), devtools `describeTracePath`.
     - A "Not listed above" row for `defaultTerm` and `fieldsClause` (`@qadi/core/Wording.ts`),
       worded to match ARCH-29's `./*` outcome. If the wildcard is removed, say "internal".
     - Edit the `foldTree` row (`:807`) to drop the twin sentence.
     - Add one sentence to the prose at `:363-371`.
  6. **`spec/traceability.md`.**
     - Add `TraceAlignment.test.ts` (INV-QD-NEXT, BEH-QD-NEXT, INV-QD-090) and
       `Wording.test.ts` (BEH-QD-139, BEH-QD-144, INV-QD-004).
     - Update `RenderTrace.test.ts` and `TraceDiff.test.ts` to add INV-QD-090, and
       `Decision.test.ts` to add INV-QD-090.
     - Delete the `packages/devtools/test/model/TreeFold.test.ts` row (`:308`).
     - Update the INV-QD-090/040 and ADR-QD-090 rows, add ADR-QD-NEXT, and bump the version.
     - Leave ADR-QD-098's "TreeFold in core and devtools (4)" (`098-…md:132`) alone. It is
       change history (AGENTS.md §15).
  7. **CCR log entry** CCR-QD-NEXT.
  8. **Changeset.** Minor, in the fixed group:
     - `@qadi/core`: new `foldTrace`, `foldAligned`, `AlignedNode`, `tracePathKey`, and
       `RenderTraceOptions.indentLimit`. Rendering changes only past 64 levels.
     - `@qadi/devtools`: new `describeTracePath`. `inspect` is unchanged in output.
  9. **Website.** Mention `foldTrace`/`foldAligned` beside `foldExplanation` in
     `reference/api.md`, and `indentLimit` in `advanced.md:74`'s `renderTrace` paragraph.
     Fences must compile (`pnpm spec:website-examples`).
- **Tests:** doc fences compile.
- **Verify:** `node scripts/check-api-surface.mjs`; `node scripts/check-doc-examples.mjs`;
  `pnpm spec:verify:strict`; `node scripts/check-dod-table.mjs`; `node scripts/check-devtools-claims.mjs`;
  `pnpm spec:website-examples`.
- **Done when:** every gate above is green, and `grep -rn "package-private .*TreeFold\|devtools twin" spec --include=*.md`
  finds only change-history and amendment text.

### T10 — Full gate
- **Status:** [-] deferred to the orchestrator's single `pnpm check` (coverage and mutation not run here)
- **Depends on:** T1–T9
- **Files:** none
- **Steps:** run `pnpm check`. If core's Stryker run (`stryker.config.mjs`, `break: 80`) leaves
  survivors in the new loops, add the killing test rather than an ignore. The `other !== undefined`
  guard is the one known equivalent survivor (`TraceDiff.ts:272-276`). Keep its comment.
- **Tests:** the whole suite.
- **Verify:** `pnpm check`
- **Done when:** green. Record the core and devtools mutation scores in §10.

### T11 — Update the tracker
- **Status:** [x] done
- **Depends on:** T10
- **Files:** this plan (frontmatter `status`, §5 statuses, §10), `.planning/architecture/README.md` (orchestrator-owned)
- **Steps:**
  1. Set `status: done` and fill in the decision outcomes.
  2. Add the §10 rows.
  3. Hand the README row to the orchestrator.
  4. Tell ARCH-17, ARCH-20, ARCH-25 and ARCH-29 what landed: the children function, the
     helper replacing `pathOf`, N4 and N5.
- **Tests:** none.
- **Verify:** `grep -hE '^status:|Status:\*\* \[' .planning/architecture/ARCH-22-*.md | sort | uniq -c`
- **Done when:** every task is `[x]` or `[-]` with a reason.

## 7. Test strategy

**Survive unchanged (behaviour-preservation proof):**
- every existing assertion in `RenderTrace.test.ts` (11 `it`s) and `TraceDiff.test.ts`;
- `Explanation.test.ts`'s rendering strings;
- `TreeFold.test.ts` (core);
- `WhatIfTable.test.tsx`'s `"the root"`/`"$.1"` strings;
- `DevtoolsDock.test.tsx`;
- `Inspect.test.ts`'s presentation tests.

**Move:**
- `Inspect.test.ts`'s 100k real-trace zip moves to core A4;
- the rule-table early-stop/row-order assertions move to A5;
- INV-QD-040's alignment half becomes core properties A1/A2 (new, stronger: every tag, shared
  subtrees, `concurrency`).

**Delete:** `packages/devtools/test/model/TreeFold.test.ts`, a byte-copy of core's, together
with the code it tested.

**Add:**
- differential properties for `renderTrace`/`diffTraces` against a test-local copy of HEAD's
  recursive code (T1). The copy is deliberately frozen. It is an oracle, not a second
  implementation, and the doc comment says so;
- stack-safety at 100k/250k for both walkers and `foldTrace`;
- the indent-cap cases;
- `Wording.test.ts`;
- `tracePathKey`/`childKey` agreement;
- the devtools link test (T8).

**Mutation.**
- Core Stryker covers `Wording.ts`, the two loops, `foldTrace`, `foldAligned` and
  `tracePathKey`.
- The A2 count property is what kills a "memoise per node" mutant.
- The differential property kills order and indent mutants.
- Devtools Stryker loses `TreeFold.ts` and `Inspect.ts`'s position code, and keeps `shapeOf`
  and `statusOf`.

**Coverage:** core stays ≥ 95%, and the devtools model stays ≥ 95% (ADR-QD-047).

## 8. Spec and documentation updates

All of this is listed in T9. In summary:

- **New:** ADR-QD-NEXT, which amends ADR-QD-090; INV-QD-NEXT (core alignment); BEH-QD-NEXT
  (`foldAligned`).
- **Amended:**
  - INV-QD-090 adds `Trace`;
  - INV-QD-040 cites INV-QD-NEXT and gets N6's prose fix;
  - BEH-QD-144 gains the indent cap;
  - BEH-QD-194 gains the key;
  - BEH-QD-208 says the alignment is core's.
- **`spec/overview.md`** (gate 13): 4 core rows, 1 devtools row, 1 "Not listed" row, and the
  `foldTree` row edited.
- **Also:** traceability rows, a CCR-QD-NEXT entry, a changeset (fixed group, minor), and two
  website pages.
- **AGENTS.md** needs no edit. No budget changes, and §2–§9 already describe what this does.

## 9. Risks and rollback

| Risk | Shows up as | Mitigation / rollback |
| ---- | ----------- | --------------------- |
| The stack-safe `diffTraces` changes the order of differences | The T1 differential property fails | Push children reversed (HEAD order is parents-first pre-order). The spike agreed on 2,000/2,000. |
| A deep pair where *every* level differs still costs O(n²) in reported paths (`TracePath` per difference is public) | A slow diff or out of memory on a 100k chain flipped at every level | This is inherent to the public type (D-22-c(c) rejected). Document it in BEH-QD-194: "a difference carries its full path". Tests use a single-difference chain. Out of scope otherwise. |
| The indent cap is read as a format change | A consumer snapshot breaks on a trace deeper than 64 | Only traces deeper than the default bound change. `indentLimit: Infinity` restores the old format. The changeset says so. |
| The zip is built on node identity by mistake | Wrong status or key on a shared subtree | A2/A3 fail. The N1 paragraph in the doc comment names the trap. |
| ARCH-17 removes `explanationChildrenOf` | T6 does not compile | D-22-h. T6 waits for ARCH-17's decision, or re-derives the children inside `foldAligned`'s private `Match`. |
| ARCH-20 moves `Simulator.tsx`'s sentence | T8 conflicts | Whichever lands second rebases onto `describeTracePath`. |
| ARCH-29 removes `./*` | The overview "Not listed" wording for `Wording.ts`/`foldTree` is wrong | T9 step 5 words it after ARCH-29's outcome. Gate 13 checks names, not reachability. |
| Gate 13 (`check-api-surface.mjs`) misses a new name | `pnpm check` fails | T9 step 5. |

**Rollback.**
- T1 and T2 are self-contained. Revert their commits to restore the recursive walkers. The
  only public addition is `indentLimit`.
- T3–T6 add names. Revert in reverse order. Devtools still has the twin until T7.
- T7 and T8 revert together. The deleted `TreeFold.ts` comes back from git.

## 10. Progress log

| Date | Task | Change | By |
| ---- | ---- | ------ | -- |
| 2026-10-07 | — | plan written; evidence re-verified at `e328e75` (C1–C7, N1–N8; probes in the session scratchpad `wave3/ARCH-22/`) | planner |
| 2026-10-07 | T0–T9, T11 | implemented on `arch/wave3`. Deviations: `childKey` and `tracePathKey` live in a new internal `TraceKey.ts` (`TraceDiff.ts` re-exports `tracePathKey`) so `childKey` stays out of the barrel; `foldTrace` takes the case form (`TraceCases`, ARCH-17), a wrapper arm receives `R \| undefined` and a leaf's children are not walked; evaluated 100k-deep flipped diffs are not tested (a verdict flipped at every level reports a path per level, quadratic by the public type, OOM) so the flip case is a hand-built pair; `Wording.ts` needs no overview row (not exported, ARCH-29 closed `./*`). T10 left to the orchestrator. ARCH-20 must keep: `Simulator.tsx`'s status sentence words a flip's path through `describeTracePath`. | implementer |
