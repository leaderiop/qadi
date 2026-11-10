---
id: ARCH-55
title: "@qadi/core's barrel names its exports, so the port-span quartet becomes one `PortSpan` module and the port-wire pair one `PortWire` module, each with a public face and a package-private builder"
strength: Speculative   # from the 2026-10-13 architecture review (wave 5, card 10, "port span modules")
status: deferred
disposition: "never committed; speculative, and its gate gap is latent only under a named core barrel (REQUIREMENTS.md Out of Scope); was `needs-decision` (wave 6, 2026-11-10)"
evidence_verified_at: b655b3b
depends_on: []              # no hard dependency. Soft order (D-55-e): land LAST in wave 5, after ARCH-46, ARCH-51, ARCH-54 and ARCH-56 merge
blocks: []
adrs_touched:
  - ADR-QD-099 (amend, Rev 1.2: the 2026-10-08 amendment's "`@qadi/devtools` is the one today" becomes "`@qadi/devtools` and `@qadi/core`"; core's barrel also refuses a silent omission — every export of a module it names is in the barrel or marked `@internal`)
  - ADR-QD-047 (read: its 2026-10-08 amendment is the named-barrel precedent; the `devtools-named-barrel` rule it cites is generalized, with a cross-reference note only)
  - ADR-QD-037 (constraint: madge counts type-only edges. Amended only if D-55-c chooses B)
  - ADR-QD-077 (constraint: writing port spans is core's alone, so the span builder stays package-private)
  - ADR-QD-094 (note revision: `PortSpanEncode.ts` and `PortWireEncode.ts` are named in its body; both merge into their public modules)
  - ADR-QD-107 (note revision: `PortInterpreter.ts` is named in its body; it merges into `PortSpan.ts`)
  - ADR-QD-051 (note revision: same, `PortInterpreter.ts`)
  - ADR-QD-033 (constraint: the packed artifact is the product; gate 14 check 3b enumerates `lib/` at run time, so fewer files need no edit)
  - ADR-QD-038 (constraint: no release step; the surface is unchanged, so no changeset is required, see §8)
packages: ["@qadi/core", "scripts (check-house-style.mjs, check-api-surface.mjs)", "spec", "AGENTS.md §9 (sign-off)", "CONTRIBUTING.md"]
estimate: M   # ≈ 1½ days: barrel switch + rules ½ day, two merges ½ day, spec/AGENTS/ADR notes and the full gate ½ day. The surface stays identical, so no migration or changeset.
---

# ARCH-55 — A named-export core barrel; merge the shallow port-span and port-wire modules

## 1. Verified evidence (at `b655b3b`)

I checked this on `main` at `b655b3b` (`git rev-parse --short HEAD`). Nothing in the repository was edited.
The probes live in `scratchpad/wave5/ARCH-55/` (absolute:
`/private/tmp/claude-502/-Users-mohammadalmechkor-Projects-Perso-qadi/f10e9d09-77ac-4671-a5f3-770ae101c6fe/scratchpad/wave5/ARCH-55/`):

- `genbarrel.mjs <src dir>` generates a named barrel from an `export *` barrel: one value group and one type group per
  module, names sorted, and a name that also has a value declaration goes in the value group.
- `names.mjs <index.ts>` lists the names a named barrel publishes.
- `surface.mjs <repo>` lists core's names per module, and which of them no API table's first column names.
- `spike/core/` is a copy of `packages/core/{src,test}` with the named barrel applied and both merges applied
  (`node_modules` symlinked to `packages/core/node_modules`, `tsconfig.json` extending the repository's
  `tsconfig.base.json`). `spike/orig/core/` is an unmodified copy.
- `spike/consumer-{orig,core}/` is a consumer package with `"type": "module"`, `declaration: true` and
  `module: nodenext`. It re-exports every one of core's 317 **value** exports as `export const v_X = C.X`, against each
  build's `lib/*.d.ts`, through an `exports` map that names only `.`. This is the TS2883 / TS2742 probe.
- `g13/` is gate 13 (`check-api-surface.mjs`, copied verbatim) run on a tree whose `packages/core/src` is the spike.
- `madge/` is a copy of `packages/core/src` in which `SinkWire.ts` imports `SinkRecord` back, run with and without a
  `.madgerc` that sets `skipTypeImports`.

**The workspace was not clean when I checked.** `git status` shows **154 untracked `*.d.ts` / `*.d.ts.map` files in
`packages/core/src` and `packages/http/src`**, timestamped 2026-10-13 00:53, after HEAD. They come from no commit; most
likely a sibling's probe emitted declarations into `src`. They double madge's file count (`pnpm circular` processed
140 files where there are 70 modules). I left them alone. T0 checks for them.

| # | Claim (review card 10 / task brief) | Verdict | How it was settled |
| - | ----------------------------------- | ------- | ------------------ |
| C1 | Line counts: `PortSpan.ts` ~119, `PortSpanEncode.ts` ~109, `PortSpanDecode.ts` ~26, `PortInterpreter.ts` ~21, `PortWire.ts` ~167, `PortWireEncode.ts` ~120, `PortKey.ts` ~46 | **CONFIRMED** (exact) | `wc -l packages/core/src/*.ts` |
| C2 | `PortSpanDecode.ts` is one function, imported only by the barrel | **CHANGED** | In `src`, only `index.ts` imports it. A test imports it too: `packages/core/test/PortSpan.test.ts` (`decodePortSpan`). The module is the 8-line `decodePortSpan` (`PortSpanDecode.ts` — `decodePortSpan`), which spreads three `decodeSpan` calls. |
| C3 | `PortInterpreter.ts` is one literal | **CONFIRMED** | `portInterpreter = Schema.Literals(["evaluate","toPredicate","remote"])` and its derived type. Its importers are `PortSpan.ts` (a type re-export: `export type { PortInterpreter } from "./PortInterpreter.ts"`) and `PortSpanEncode.ts` (the schema, for `sharedQuestionFields.interpreter`). The header says "Package-private: the type is public through `PortSpan.ts`, the schema is not". |
| C4 | The splits exist because (a) §9's `export *` would publish internals, so public types and private machinery must be separate files | **CONFIRMED** | `PortSpanEncode.ts` header, `Deliberately out of the barrel (AGENTS.md §9, ADR-QD-077)`. `PortWireEncode.ts` header, `Deliberately out of the barrel (AGENTS.md §9, ADR-QD-099)`. `PortInterpreter.ts` header, quoted in C3. ARCH-21's progress log, T4, records the split as an implementer's deviation for exactly this reason: "so the checker sees declaration exports and madge sees no cycle". |
| C5 | (b) madge counts type-only cycles. `SinkWire.ts` restates `SinkRecordTag` by hand, pinned only by a `.tst` | **CONFIRMED**, but it is **unrelated to the port modules** | `SinkWire.ts` — `SinkRecordTag` is `"Decision" \| "Obligations"`, and its comment cites madge counting type edges. `Errors.tst.ts` ("SinkRecordTag is exactly SinkRecord's tag…") pins it to `SinkRecord["_tag"]`. Probe `madge/`: making `SinkWire.ts` import `SinkRecord` back gives **15 cycles**, and with `.madgerc` `{"detectiveOptions":{"ts":{"skipTypeImports":true}}}` it gives **none**. madge 8.0.0 supports the switch. **A named barrel does not remove this restatement.** Only D-55-c (B) would. |
| C6 | `PortSpanDecode.ts`'s own comment (~:5–7) gives §9 as the reason | **CHANGED** | The comment gives the **madge cycle**: "Split from `PortSpan.ts`… so the public types and the internal machinery that builds them form no import cycle: types, then machinery, then this." The cycle exists only because the machinery cannot sit in the public module under `export *`. So the root cause is still §9's `export *`. In one file there is no cross-file edge, and so no cycle. |
| C7 | Deletion test: `PortSpanDecode` and `PortInterpreter` are pass-through modules | **CONFIRMED** | Delete either one and its content moves to the module beside it. No caller gets more complex: devtools reaches `decodePortSpan` through the root, and `portInterpreter` has exactly one value user. |
| C8 | Understanding "how a port span is written and read" means bouncing between six modules plus each port module | **CONFIRMED** | A span's types are in `PortSpan.ts`, the builder and shared fields in `PortSpanEncode.ts`, the reader in `PortSpanDecode.ts`, the interpreter literal in `PortInterpreter.ts`, the `attributes` slot in `PortDescription.ts`, the writer in `PortAccess.ts`, and the five `spanStruct(...)` calls in the port modules. After the merge, the first four are one module. |
| C9 | Importers (measure) | **CONFIRMED** | `PortSpanEncode.ts` has 8 `src` importers: `AttributeResolver`, `CustomPredicate`, `DecisionHistory`, `RelationshipResolver`, `SignatureHistory`, `PortDerivation`, `PortAccess`, `PortSpanDecode`. `PortWireEncode.ts` has 6: the five port modules except `PortDerivation`, plus `PortRemote` (`WIRE_MAX_DEPTH`). Three tests import the private halves: `PortSpan.test.ts`, `PortSpan.tst.ts` and `PortDescription.test.ts`. Nothing outside `packages/core` names any of the four files. |
| C10 | Survey: other modules split only to dodge `export *` | **CONFIRMED: four of eighteen** | `packages/core/src` has 69 modules plus `index.ts`. The barrel names **51** of them, and **18** are package-private. Only `PortSpanEncode`, `PortSpanDecode`, `PortInterpreter` and `PortWireEncode` are split purely for the barrel. The rest each own a concept or break a cycle, and are kept (§3). The barrel's own constraint also produced **five re-export shims** inside public modules: `Decision.ts` (×2, from `FieldLattice.ts`), `Matcher.ts` (`Verdict` from `Compare.ts`), `Predicate.ts` (`CompareOp` from `Compare.ts`) and `TraceDiff.ts` (`tracePathKey` from `TraceKey.ts`). See D-55-d. |
| C11 | Survey: other types restated by hand to break cycles | **CONFIRMED: two** | `SinkWire.ts` — `SinkRecordTag` (C5, pinned). `Lifecycle.ts` — `LifecycleOptions` restates `EvaluateOptions`' `concurrency` and `evaluationId` because "madge counts a type-only edge too". **Nothing pins it.** It is a low-severity drift risk: a field renamed in `EvaluateOptions` would silently stop reaching `ask`. It does not need madge to change: `EvaluateOptions` can extend `LifecycleOptions`, because `Evaluate.ts` already imports `Lifecycle.ts`. Handed to ARCH-57 (§3). |
| C12 | Root export count | **MEASURED** | **498 names** across the 51 barreled modules (`surface.mjs`). Of these, 317 are values and 181 are types only. Gate 13 at HEAD reports `862 export(s) documented across 9 package(s)`. |
| C13 | Cost: "the core barrel lists names for about 50 modules" | **CHANGED (understated)** | The generated named barrel has **91 `export` statements naming 498 names**. That is **~680 lines** with one name per line (devtools' style) or **~250** packed at 90 columns, against 51 lines today. There is also an ongoing cost: every new public name becomes a barrel line. |
| C14 | A named barrel is behavior- and surface-preserving | **CONFIRMED (spike)** | The named barrel from `genbarrel.mjs`, with both merges applied, gives: `tsc` clean; **the same 498 names** (`diff` of the name sets is empty); `madge --circular` clean, with no new edge from `PortWire.ts` → `Policy.ts`/`JsonHazard.ts`/`DecodeDepthGuard.ts`/`SinkWire.ts`; **1832 / 1832 core tests pass**, the same as HEAD's `pnpm vitest run --project core`; and gate 13 on the spike reports the same `862 export(s)`. |
| C15 | TS2883: `.d.ts` naming needs | **CONFIRMED safe** | The consumer probe compiles all 317 value re-exports with `declaration: true` and **no errors** against both the HEAD build and the merged named-barrel build. Every type a public value's signature reaches is still named at the root. One example: `attributeResolverPort`'s `SpanStruct<…>` still resolves through the root. |
| C16 | "Gates 13/14 keep the surface closed" | **PARTLY REFUTED** | Gate 14, check 3b, lists `lib/` at run time (`check-package-install.mjs`, the `readdirSync` walk under "Check 3b"), so merged files need no edit, and it never checks names. **Gate 13 is blind to 38 of core's 498 names**: those named only in prose inside the API section (the `### Errors` paragraph and the record-wire vocabulary, `SinkRecordTag`, `WireVersion`, `EncodeRefusal` and so on). MISSING finds them, but STALE reads only the first column of a table. Probe `g13/`: dropping `WireVersion` from the named barrel **passes gate 13**, while dropping `decodePortSpan`, which has a table row, fails it as STALE. Under `export *` a drop cannot happen without deleting the declaration. Under a named barrel it can, silently. D-55-b closes this. |
| C17 | A barrel mixing `export *` and named lines is under-reported by gate 13 | **REFUTED as silent, but the message misleads** | `surfaceOf` reads only the `export *` modules when any exist, so the named lines are ignored. Probe: one `export *` line added to the named spike barrel gives **462 STALE failures**, which is loud. But the message ("listed… and exported by nothing") does not say the real cause. T3 adds an explicit refusal. |
| C18 | Stryker `mutate` globs / coverage thresholds name files | **CONFIRMED: no edit needed** | `stryker.config.mjs` — `mutate: ["packages/core/src/**/*.ts", "!packages/core/src/index.ts"]`. Root `vitest.config.ts` excludes `packages/core/src/index.ts` by path and holds `packages/core/src/**` at 95. Both are globs or directory scopes, so merged files are covered automatically. No per-file threshold names any of the six files. |
| C19 | House-style rules keyed by these files | **CONFIRMED: none break** | `no-port-span-key-literals` lists `PortAccess.ts`, `PortDerivation.ts` and devtools' `PortCalls.ts`, not `PortSpan*.ts`, so the shared `qadi.*` keys may move into `PortSpan.ts`. `barrel-order` checks only **pure** `export *` barrels and skips everything else (`check-house-style.mjs`, the `§9 — barrel export * from lines` block). A named core barrel would therefore have **no order check at all** unless the devtools rule is generalized (D-55-b). |
| C20 | Running core tests | **NOTE** | `npx vitest run` from inside `packages/core` fails 56 of 57 files with `Cannot read properties of undefined (reading 'config')`. Run from the root: `pnpm vitest run --project core` (1832 pass). |

**Prior decisions this plan re-decides only because the constraint changes:**

- **ARCH-21 D-21-d** (decided 2026-10-07) chose the three-file span split. Its own record says why: gate 13 reads declaration
  exports only, and madge counts the types → machinery → decoder cycle. Both reasons disappear with a named barrel. The
  *surface* D-21-d chose (public: the ten span types plus `decodePortSpan`; private: `spanStruct`, `encodeSpan`,
  `decodeSpan`, the shared fields, `attemptsStruct`) is **kept unchanged**.
- **ARCH-31** made `PortWireEncode.ts` package-private "like `PortSpanEncode.ts`". That surface is kept too.
- **ARCH-40 D-40-d** (decided 2026-10-08) rejected exactly today's core shape for devtools: "Keep `export *` and split each
  partly public module into a public file and a private file … separates each type from the functions that produce it
  (worse locality)". This plan applies the same ruling to core.
- **ARCH-12** routed `FieldLattice.ts`'s public names through `Decision.ts`'s re-export "because `index.ts` `export *`s". D-55-d keeps that shim.

## 2. Goal and success criteria

Today `@qadi/core`'s interface is decided **per module**. Under `export *`, every `export` in a barreled module is
public. So a concept that has a public face and a private builder must be cut across two or more modules, and the
cut runs along visibility, not along the concept. A port span is four modules, and a port wire is two. The goal is
to move the visibility decision to the one place that is the interface, the barrel, which then **names** what core
publishes, as `@qadi/devtools`' barrels already do. With visibility decided there, each of the two concepts becomes one
deeper module: `PortSpan.ts` holds the span's types, its builder and its one reader, and `PortWire.ts` holds the wire
vocabulary and its builder. The builder names stay package-private, marked at their declarations. This improves
**locality**: one module per concept. It deletes two shallow pass-through modules (`PortSpanDecode`, `PortInterpreter`)
and two private halves. It costs one barrel that grows from 51 lines to about 680. The **surface is unchanged**: the
same 498 names, so no consumer sees a difference.

Success criteria:

1. `packages/core/src/index.ts` contains no `export *` and names exactly the 498 names `b655b3b` publishes, as checked by
   T1's name-set diff, which prints nothing. If siblings have changed the surface by then, it names exactly the set
   regenerated at T0.
2. `ls packages/core/src/{PortSpanEncode,PortSpanDecode,PortInterpreter,PortWireEncode}.ts` finds no file. `PortSpan.ts`
   and `PortWire.ts` exist, and `grep -rn "PortSpanEncode\|PortSpanDecode\|PortInterpreter\.ts\|PortWireEncode" packages scripts`
   (excluding `lib/`) prints nothing.
3. Every exported declaration in a module the core barrel names is either in that module's barrel group or carries
   `@internal` in its doc comment. `node scripts/check-house-style.mjs` enforces this, and a negative probe (T3) fails
   it. In particular `spanStruct`, `encodeSpan`, `decodeSpan`, `sharedQuestionFields`, `sharedQuestionKeys`,
   `attemptsStruct`, `portInterpreter`, `portWire`, `sameAnswer`, `WIRE_MAX_DEPTH` and `PortWireSpec` are `@internal`
   and absent from the barrel.
4. The core barrel's groups run in module-path order (case-sensitive ASCII), and a named barrel that also contains an
   `export *` line fails house-style with a message that says so, not with 462 STALE lines.
5. Gate 13 still reports the same documented-export count (`862` at `b655b3b`, or T0's number). Gate 14 passes. The T8
   consumer declaration-emit probe compiles every value export with zero errors.
6. `pnpm vitest run --project core` passes the same number of tests as T0's baseline (1832 at `b655b3b`), with no test
   deleted. `pnpm circular` is clean.
7. `pnpm check` is green.

## 3. Non-goals

- **Narrowing core's surface.** 127 of the 498 names are never written outside `packages/core`, across other packages'
  `src`/`test`, `examples/`, `features/` and `apps/website/src` (`core-only.txt` in the probe directory). Many of them are
  types that a public signature reaches, and those must stay public (TS2883, C15). Others are documented on purpose
  (the `…Retrying`/`…Bounded` wrappers, AGENTS.md §3). Deciding which to make private is a breaking change, and it needs
  a type-closure check like ARCH-40's `closure.py`. A named barrel makes that later change a one-line edit per name, which
  is part of this plan's leverage, but this plan does not do it (D-55-a option D).
- **Merging the other private modules.** `Admission`, `Compare`, `FieldLattice`, `FieldPath`, `JsonHazard`, `Lifecycle`,
  `PortAccess`, `PortDerivation`, `ShortCircuit`, `SinkEmit`, `TreeFold` and `Walk` each own a concept and have two or
  more importers. `TraceKey` (the address text, a leaf both `Explanation.ts` and `TraceDiff.ts` use), `Wording` (shared by
  two public renderers) and `PortKey` (the canonical key any port's `key` may use, per `PortDescription.key`'s doc) are
  small, but they pass the deletion test. Delete one and its content has no better home: merging `TraceKey` into
  `TraceDiff` would make the explanation fold depend on the trace differ.
- **`SinkWire.ts`'s `SinkRecordTag` restatement.** A barrel does not cause it (C5). It goes only if D-55-c chooses B.
- **`Lifecycle.ts`'s unpinned `LifecycleOptions` restatement** (C11). A small fix that needs no madge change. It is
  handed to ARCH-57 (loose ends): make `EvaluateOptions` extend `QuestionOptions, LifecycleOptions` and move the two
  fields' docs to `Lifecycle.ts`.
- **Changing what either module does.** ARCH-46 changes what the wire and the span attributes carry (the question
  projection moves from wire to attributes). This plan changes only which file the code lives in and how the barrel
  names it.
- **Other packages' barrels.** `audit`, `http`, `react` and `testing` stay `export *`. Their modules are not part-public
  in this way. AGENTS.md §9's rule ("narrower than its modules") decides per package.

## 4. Constraints

| Constraint | Consequence for this plan |
| ---------- | ------------------------- |
| AGENTS.md §9 (barrels) | Today it reads "`export * from "./File.ts"`, alphabetical. A package whose interface is narrower than its modules names its exports per module…; `@qadi/devtools` is the one today". After the merges core *is* such a package: `PortSpan.ts` and `PortWire.ts` are part-public. The §9 sentence changes to name core, and the rule id changes from `devtools-named-barrel` to `named-barrel`. **Editing AGENTS.md needs user sign-off** (ARCH-40 D-40-d precedent), so it is folded into D-55-a. "Re-export internal types explicitly where `.d.ts` emission needs to name them (TS2883)" still holds, and C15 shows no gap. |
| ADR-QD-099 (closed entry points) | No entry point is added. "Out of the barrel means not importable" now applies per *name* as well as per module, which the 2026-10-08 amendment already allows. Amend Rev 1.2 (§8). |
| ADR-QD-047's 2026-10-08 amendment | This is the named-barrel precedent. The house-style rule it cites is generalized. Add a cross-reference note; nothing it decided changes. |
| ADR-QD-037 (madge, gate 5) | madge counts `import type` edges (C5). Merging removes edges and adds none: `PortWire.ts` gains `PortWireEncode.ts`'s imports (`DecodeDepthGuard`, `JsonHazard`, `Policy`, `SinkWire`), none of which reaches `PortWire.ts` (spike: clean). Every task's verify step runs `pnpm circular`. |
| ADR-QD-077 / ADR-QD-094 (closed port registry; core writes spans) | `spanStruct`, `encodeSpan`, `portWire` and the rest stay unexported from the barrel. A host has no port to describe. |
| AGENTS.md §7 (schema first) | `portInterpreter` stays a schema with `PortInterpreter` derived from it, now in `PortSpan.ts`. Its schema stays `@internal` and the type stays public, exactly as today. |
| AGENTS.md §1 (`.ts` extensions, `import type`) | The barrel must split value and type groups under `verbatimModuleSyntax`. A name that has both a value and a type declaration goes in the value group, which re-exports both meanings. The generator does this and `tsc` checks it. |
| Gate 13 (`check-api-surface.mjs`) | It already parses named, wrapped barrels (`REEXPORT_FROM`, `REEXPORT_OPEN`, `logicalLines`) and reads `index.ts` itself when it holds no `export *` (`surfaceOf`). No parser change is needed. Its STALE blind spot (C16) is closed by house-style, not by gate 13. |
| Gate 14 (`check-package-install.mjs`) | Check 3b lists `lib/` at run time, so fewer files need no edit. The consumer fixture imports 16 core names and still resolves. `"files": ["lib","src"]` and the `bun` condition (`./src/index.ts`) work the same way with a named barrel. |
| Gates 16 (`stryker run`) and 7 (`vitest run --coverage`) | Globs only (C18). Mutants and coverage move with the code. A scoped Stryker run on the two merged modules confirms the score did not fall (T8). |
| `tsconfig.build.json` / `tsconfig.json` | No new package and no new reference. The merged modules sit in `packages/core/src`, which `tsconfig.src.json` includes by glob. |
| Budgets (`SWITCH_BUDGET`, `UNTRACED_BUDGET`, `SCHEMA_ERROR_BUDGET`, `ANY_BUDGET`, `HAS_CUSTOM_BUDGET`, `DECISION_READ_BUDGET`, `PORT_DOUBLE_BUDGET`) | None is keyed to these six files. `PORT_DOUBLE_BUDGET` is keyed to test files, and `PortDescription.test.ts` changes only an import specifier. Nothing is added to any budget. |
| AGENTS.md §6 (`as`, `any`) | The merged code is moved verbatim. The existing `const fieldOf: SpanFields = fields;` widening idiom stays, and no `as` is introduced. |
| AGENTS.md §15 (gated documentation) | `spec/overview.md`'s `decodePortSpan` row cites `PortSpanDecode.ts`. Fix it in the same change. Gate 13 does not read the module column, so it would not catch the stale citation. |

## 5. Decisions needed before work starts

### D-55-a — Does `@qadi/core` adopt a named barrel at all? (AGENTS.md §9 edit → **user sign-off**)

- **(A) A named barrel that keeps the surface, generated mechanically (recommended).** The barrel names the same 498
  names, grouped per module, value group then type group, one name per line as in devtools. The two merges follow. Cost:
  about 680 barrel lines, and one more edit per future public name (the barrel line beside the overview row). Gain: one
  module per concept for span and wire, two pass-through modules deleted, and the interface becomes one file a reviewer
  can read. Every later narrowing becomes a one-line change (§3).
- **(B) Do nothing (drop the plan).** It costs nothing. The six-file span/wire layout stays, and so does the next
  split: any future part-public concept in core (a public type plus a private builder) needs its own public/private file
  pair. The repository has already rejected that shape once (D-40-d).
- **(C) Keep `export *` and relax madge (D-55-c B) to shrink the quartet to a pair.** `decodePortSpan` moves into
  `PortSpan.ts` (a value import from `PortSpanEncode.ts`, whose type import back is no longer counted), and
  `PortInterpreter` folds into `PortSpanEncode.ts`. The result is two span modules instead of four. The wire pair stays a
  pair: `portWire` cannot sit in the public `PortWire.ts` without becoming public. This is half the locality gain, at the
  price of a global change to the circular-import gate.
- **(D) A named barrel that also narrows** the 127 names never used outside core. **Breaking**, and it needs the
  type-closure analysis from ARCH-40 C11. Larger, and separable. It can follow (A) at any time.

**Recommendation: (A).** The card's strength is Speculative, and the honest benefit is narrow: two concepts, four files.
But (A) is surface-identical, fully mechanical and proven end to end on the spike (C14, C15), and it removes the
structural reason the next part-public concept would be split. `status: open` (AGENTS.md §9 and ADR-QD-099 amendment
need the user).

### D-55-b — How the named barrel stays complete and ordered

The problem C16 showed: under a named barrel, a name dropped from the list disappears from the package, and gate 13
catches that only when the name has a table row. 38 of core's names do not.

- **(A) Two house-style rules (recommended).**
  1. **`named-barrel`**: the existing `devtools-named-barrel` with its path list grown to
     `["packages/core/src/index.ts", "packages/devtools/src/index.ts", "packages/devtools/src/react/index.ts"]`. No
     `export *`, and named groups in module-path order. It also gets an explicit message when a barrel mixes `export *`
     and named lines (C17).
  2. **`core-barrel-complete`**, core only: for every module the core barrel names, every name that module exports
     (declaration form, the same regex as gate 13's `DECLARATION`, plus `export {…} from` re-exports) must be named in the
     barrel's group for that module, **or** its leading doc comment carries `@internal`. This is overview's "no silent
     omission" applied at the declaration: omission is allowed, silent omission is not, and the reason sits next to the
     code it describes (locality). After the merges, exactly 11 declarations carry `@internal` (success criterion 3).
- **(B) Order and no-star only (devtools parity).** A dropped name with no table row passes every gate silently (C16 probe:
  `WireVersion`).
- **(C) Devtools-style `test/surface.test.ts`** listing core's 317 values. A third copy of the list (barrel, overview,
  test), and it covers values only. That suits devtools' ~60 values but not core's 317.

**Recommendation: (A).** The completeness rule stays core-only. Devtools' private mechanics are whole modules and
groups, it already has `surface.test.ts`, and applying the marker rule there would take dozens of markers for no new
protection. **Do not** turn on TypeScript's `stripInternal`: it would delete `@internal` declarations from their own
`.d.ts`, and the sibling modules' `.d.ts` files import them (§9). `status: open (recommended default)`

### D-55-c — Should madge stop counting type-only edges?

- **(A) Keep counting them (recommended).** ADR-QD-037's own Context names a type import as half of the cycle it exists
  to catch ("module A's service layer imports module B's type for a field"). A type-level cycle is mutual knowledge
  between two modules even when nothing executes it. After (A) of D-55-a, the only restatements left that this setting
  causes are `SinkRecordTag` (pinned by `Errors.tst.ts`) and `LifecycleOptions` (handed to ARCH-57, fixable without
  madge). Two small restatements do not justify a repository-wide policy change.
- **(B) `.madgerc` `{"detectiveOptions":{"ts":{"skipTypeImports":true},"tsx":{"skipTypeImports":true}}}`.** Verified
  to work on madge 8.0.0 (C5). It needs an ADR-QD-037 amendment. It would let `SinkWire.ts` import
  `SinkRecord["_tag"]`, and the `.tst` pin could then go. It admits type-only cycles in all nine packages.

**Recommendation: (A).** If the user chooses (B), T6 does it as a separate, revertible commit. `status: open (recommended default)`

### D-55-d — The five re-export shims inside public modules

`Decision.ts` re-exports `intersectFields`, `mergeFields`, `sameVisibleFields`, `unionFields` and `VisibleFields` from
`FieldLattice.ts`. `Matcher.ts` re-exports `Verdict` and `Predicate.ts` re-exports `CompareOp`, both from `Compare.ts`.
`TraceDiff.ts` re-exports `tracePathKey` from `TraceKey.ts`. Each exists because `export *` cannot reach a private module.

- **(A) Keep them (recommended).** Each is one line, documented, and states which public module presents the name; the
  overview says so ("`FieldLattice.ts`, re-exported by `Decision.ts`"). The barrel names them under the presenting
  module (`./Decision.ts`), and the generator already does this.
- **(B) Fold them into the barrel** (`export { mergeFields, … } from "./FieldLattice.ts"`). One hop shorter for a
  reader. But `FieldLattice.ts`, `Compare.ts` and `TraceKey.ts` then become barrel-named modules, so under D-55-b's
  completeness rule their 13 other exports would each need `@internal`. Four import sites move too (`Walk.ts`,
  `RenderablePredicate.test.ts`, `TraceAlignment.test.ts`, `TraceDiff.test.ts`). It also reopens ARCH-12's choice for no
  gain in depth.

**Recommendation: (A).** `status: open (recommended default)`

### D-55-e — Sequencing in wave 5: first or last?

ARCH-46 edits `PortAccess.ts`, `PortWire.ts`, `PortWireEncode.ts`, the span attributes and `SignatureHistory.ts`: it
moves the question projection from the wire to the attributes, so `PortWire.spanQuestion` and `spanAnswer`, and probably
`PortWireSpec`'s twins, go away. ARCH-51 edits `PortAccess.ts`, `PortRemote.ts` (which imports `WIRE_MAX_DEPTH` from
`PortWireEncode.ts`) and `Walk.ts`/`Predicate.ts`. ARCH-54 and ARCH-56 add or change core exports
(`DecisionLog.ts`; a new evaluation-metrics module). ARCH-57 may add exports.

- **(A) Land last (recommended).** (1) The barrel is **regenerated mechanically** from whatever tree exists, so landing
  last costs one generator run, while landing first makes every sibling that adds a public name remember a barrel line.
  A forgotten line is silent for prose-documented names until D-55-b's rule exists, and the rule exists only once this
  plan lands. (2) ARCH-46 changes the *content* of the two modules being merged. Merging after it means ARCH-55 decides
  only the file layout, on settled code, and ARCH-46 does not rebase onto moved code. (3) Nothing depends on ARCH-55,
  because the surface is identical.
- **(B) Land first.** Siblings would get the one-module `PortSpan`/`PortWire` and the completeness rule earlier. Useful
  only if ARCH-46 wants to put a new private helper next to a public span type. ARCH-46 can instead put it in
  `PortSpanEncode.ts`, which already exists for that.

**Recommendation: (A), last.** If ARCH-46 is dropped or deferred, ARCH-55 can land any time after ARCH-54 and ARCH-56.
`status: open (orchestrator / user)`

## 6. Tasks

Every verify command runs from the repository root. `pnpm vitest run` from inside `packages/core` fails for an unrelated
reason (C20).

### T0 — Re-verify evidence at the branch point
- **Status:** [ ] todo
- **Depends on:** D-55-e (which siblings have landed)
- **Files:** none (read-only). Probes go in a fresh scratch directory.
- **Steps:**
  1. `git switch -c arch/55-core-named-barrel main`, then record `git rev-parse --short HEAD`.
  2. `git status --short | grep -E '\.d\.ts(\.map)?$'` must print nothing. If the stray declaration files from §1 are
     still there, stop and ask. Do not delete files this plan did not create.
  3. `git diff --stat b655b3b HEAD -- packages/core/src packages/core/test scripts/check-house-style.mjs scripts/check-api-surface.mjs spec/overview.md`.
     For each sibling that landed, note what it did to `PortSpan*.ts`, `PortInterpreter.ts`, `PortWire*.ts` and the barrel.
     If ARCH-46 removed `PortWire.spanQuestion`/`spanAnswer` or `PortWireSpan`, T5's list of public names shrinks to match.
  4. Re-measure: `wc -l packages/core/src/{PortSpan,PortSpanEncode,PortSpanDecode,PortInterpreter,PortWire,PortWireEncode}.ts`.
     Then run the importer grep from C9:
     `grep -rnE '/(PortSpanEncode|PortSpanDecode|PortInterpreter|PortWireEncode)\.ts"' packages scripts --include='*.ts' --include='*.tsx' --include='*.mjs' | grep -v /lib/`.
  5. Re-run the C16 blind-spot count with `surface.mjs` (algorithm in T1). Record the number of core names that no table
     row's first column names.
  6. Baselines: `pnpm vitest run --project core` (test count), `node scripts/check-api-surface.mjs` (export count),
     `pnpm circular`, `pnpm test:tstyche`.
- **Tests:** none.
- **Verify:** the commands in step 6.
- **Done when:** §10 has a row recording HEAD, the sibling deltas, the counts and the baselines. Any §1 claim that moved
  is corrected there.

### T1 — Snapshot the surface before touching it (scratch, not committed)
- **Status:** [ ] todo
- **Depends on:** T0
- **Files:** scratch only: `<scratch>/names-before.txt`, `<scratch>/consumer-before/`.
- **Steps:**
  1. Write the name set of the current `export *` barrel: for each `./X.ts` in `index.ts`, collect names matching
     `^export (?:const|class|interface|type|function) (\w+)` plus every name in an `export (type )?{…} from` list (wrapped
     lists joined), sorted with `LC_ALL=C`. At `b655b3b` this gives 498 lines.
  2. Build declarations into scratch: copy `packages/core/src`, add a `tsconfig.json` that extends
     `<repo>/tsconfig.base.json` with `"noEmit": false, "emitDeclarationOnly": true, "outDir": "./lib", "rootDir": "./src", "paths": {}, "types": ["node"], "typeRoots": ["<repo>/node_modules/@types"]`,
     and symlink `node_modules` to `packages/core/node_modules`.
  3. Consumer probe: a package with `{"type":"module"}`, `node_modules/@qadi/core/{package.json → {"name":"@qadi/core","type":"module","exports":{".":{"types":"./lib/index.d.ts"}}}, lib → <build>/lib}`,
     `node_modules/effect → <repo>/node_modules/effect`, and a `consumer.ts` of
     `import * as C from "@qadi/core"; export const v_X = C.X;` for every value name. Its `tsconfig.json` sets
     `module/moduleResolution: nodenext`, `declaration: true`, `emitDeclarationOnly: true`, `skipLibCheck: true`,
     `verbatimModuleSyntax: true`, `strict: true`. `tsc -p` must report 0 errors (C15).
- **Tests:** none (snapshot).
- **Verify:** `wc -l names-before.txt` equals T0's count, and the consumer probe exits 0.
- **Done when:** both artifacts exist and their numbers are in §10.

### T2 — Switch the core barrel to named exports, surface-identical
- **Status:** [ ] todo
- **Depends on:** T1, D-55-a (A)
- **Files:** `packages/core/src/index.ts`.
- **Steps:**
  1. Generate the barrel with this algorithm (the probe's `genbarrel.mjs`; do not commit the script):
     ```js
     // for each `export * from "./M.ts"` line, in order:
     //   join wrapped `export (type )?{…}` lists onto one line, then for each line:
     //   /^export (const|class|function|interface|type) (\w+)/ → interface|type → types, else values
     //   /^export (type )?\{(…)\} from/ → each clause: `type` (statement or clause) → types, else values;
     //       a clause `a as b` publishes `b`
     //   delete from types every name also in values (schema-first pairs re-export both meanings)
     //   emit `export {\n  v1,\n  v2,\n} from "./M.ts";` (values, sorted) then `export type {…}` (types, sorted)
     ```
     Keep one name per line, as devtools does. It makes conflict hunks line-local while siblings are in flight.
  2. Keep a header doc comment in the style of `packages/devtools/src/index.ts`: one-line summary, then "**The list below
     is the interface**…", and the rule from D-55-b ("adding a name is a line here and a row in `spec/overview.md`; an
     exported declaration left out carries `@internal`").
  3. Leave every module untouched in this task.
- **Tests:** none new. The proof is surface equality.
- **Verify:**
  - Re-run T1 step 1 against the new barrel, reading names out of its `export {…} from` lists, then
    `diff names-before.txt names-after.txt`, which must print nothing.
  - `pnpm typecheck`, `pnpm vitest run --project core`, `pnpm test:tstyche`, `pnpm circular`.
  - `node scripts/check-api-surface.mjs` must give the same count as T0.
  - `node scripts/check-package-install.mjs`.
  - `node scripts/check-house-style.mjs`: still green. `barrel-order` skips a non-pure barrel, and the T3 rule does not
    exist yet.
- **Done when:** all green, the name diff is empty, and the commit holds only `index.ts`.

### T3 — Keep the named barrel honest: the `named-barrel` and `core-barrel-complete` rules
- **Status:** [ ] todo
- **Depends on:** T2, D-55-b (A)
- **Files:** `scripts/check-house-style.mjs`.
- **Steps:**
  1. Rename the block headed `§9 — @qadi/devtools' barrels name their exports` to `§9 — named barrels`. Rename
     `DEVTOOLS_BARRELS` to `NAMED_BARRELS = ["packages/core/src/index.ts", "packages/devtools/src/index.ts", "packages/devtools/src/react/index.ts"]`
     and the message id `[devtools-named-barrel]` to `[named-barrel]`. Messages cite AGENTS.md §9 and ADR-QD-099's
     amendment. Keep the comment's history sentence: devtools came first (ARCH-40) and core followed (ARCH-55).
  2. Give the `export *` failure for a named barrel an explicit text: "a named barrel holds no `export *`; mixing the
     two forms also makes gate 13 read only the `export *` modules (C17)".
  3. Add `core-barrel-complete` (core only):
     - Parse `packages/core/src/index.ts`'s named groups into `Map<module, Set<name>>`, using the same join-wrapped-lists
       logic as `check-api-surface.mjs`'s `logicalLines`. A clause `a as b` keys on `a`.
     - For each module in the map, read it and collect exported names. Use the declaration form
       `^export (?:const|class|interface|type|function) (\w+)`, and record the line index. Also collect names in
       `^export (type )?\{…\} from` re-export lists.
     - For each collected name not in the module's set, look back from the declaration line over its leading `/** … */`
       block, if there is one. If the block contains `@internal`, accept the name. Otherwise fail:
       `${module}  [core-barrel-complete] \`${name}\` is exported by a module the core barrel names, but the barrel does not name it and its doc comment does not say \`@internal\` (AGENTS.md §9; ADR-QD-099).`
     - Also fail the other direction: a barrel name the module does not export. `tsc` catches this with TS2305, but the
       message here is clearer, and the cost is one line.
  4. Run against the T2 tree. It must pass with **zero** `@internal` markers, because T2 is surface-identical.
- **Tests (negative probes, run then revert; record each result in §10):**
  - Delete `  WireVersion,` from the barrel. `core-barrel-complete` must fail and name `SinkWire.ts` / `WireVersion`.
    This is the C16 case gate 13 misses.
  - Add `export * from "./Resource.ts";` to the core barrel. `[named-barrel]` must fail with the step 2 message.
  - Swap two adjacent groups. `[named-barrel]` order must fail.
  - Add `/** @internal */ export const probe = 1;` to `Resource.ts`. It must pass. Remove `@internal` and it must fail.
- **Verify:** `node scripts/check-house-style.mjs` on the clean tree. The four probes behave as listed.
- **Done when:** the rules are green on the T2 tree and each probe's failure text is pasted into §10.

### T4 — Merge the span quartet into one `PortSpan` module
- **Status:** [ ] todo
- **Depends on:** T3
- **Files:** `packages/core/src/PortSpan.ts`; delete `packages/core/src/PortSpanEncode.ts`, `PortSpanDecode.ts` and
  `PortInterpreter.ts`; update import specifiers in `AttributeResolver.ts`, `CustomPredicate.ts`, `DecisionHistory.ts`,
  `RelationshipResolver.ts`, `SignatureHistory.ts`, `PortDerivation.ts`, `PortAccess.ts` and `index.ts`; tests
  `packages/core/test/PortSpan.test.ts`, `PortSpan.tst.ts`, `PortDescription.test.ts`.
- **Steps:**
  1. Write `PortSpan.ts` in this order (the spike's layout):
     a. A module doc comment with a one-line summary: "A port span's attributes: the types a description names, the
        builder that writes them, and the one reader that reads them back." The following paragraphs are rewritten from
        today's four headers. Keep the rationale for INV-QD-044 as a type, BEH-QD-227's two structs, the ≈1.1 µs
        measurement against `Schema.Struct` + `encodeKeys`, ARCH-21's drift history and ADR-QD-077's reason the builder
        is core's. **Delete** the sentences about the file split ("Split from `PortSpan.ts`…", "The public half is
        `PortSpan.ts`… and `PortSpanDecode.ts`", "Stated once, in `PortInterpreter.ts`"). The merge removes the split
        they describe.
     b. `portInterpreter` (marked `@internal`) and `PortInterpreter` (public), moved verbatim from `PortInterpreter.ts`
        with its three-bullet doc.
     c. The public types, verbatim: `SpanValue`, `SpanFields`, `SpanKey`, `SpanType`, `SpanStruct`,
        `PortSpanAttributes`, `PortSpanAttributesLike`, `PortSpanRow` and `PortSpanRowOf`. Delete the
        `export type { PortInterpreter } from "./PortInterpreter.ts"` line.
     d. The builder, verbatim, each marked `@internal`: `spanStruct`, `encodeSpan`, `decodeSpan`,
        `sharedQuestionFields`, `sharedQuestionKeys` and `attemptsStruct`.
     e. `decodePortSpan` (public), verbatim.
     Imports become `import * as Option from "effect/Option"; import * as Schema from "effect/Schema";` (a value import
     now, where `PortSpan.ts` had `import type * as Schema`).
  2. Every `from "./PortSpanEncode.ts"` becomes `from "./PortSpan.ts"` (7 `src` files). Where a file already has an
     `import type { … } from "./PortSpan.ts"` (`PortAccess.ts`), keep the type import and the value import as two lines,
     per §1's `import type` rule.
  3. Barrel: remove the `./PortSpanDecode.ts` group and add `export { decodePortSpan } from "./PortSpan.ts";` before
     `PortSpan.ts`'s type group. `PortInterpreter` is already in that type group.
  4. Tests: `PortSpan.test.ts` imports `decodePortSpan` and the builder from `../src/PortSpan.ts`. So do `PortSpan.tst.ts`
     (`spanStruct`) and `PortDescription.test.ts` (`sharedQuestionFields`, `sharedQuestionKeys`, `spanStruct`). Change
     only the import specifiers. Assertions stay as they are.
- **Tests:** none new. Every existing span test passes unchanged (BEH-QD-227/228, INV-QD-044: `PortSpan.test.ts`,
  `PortSpan.tst.ts`, and the sentinel searches in `Evaluate.test.ts`/`Predicate.test.ts`).
- **Verify:** `pnpm typecheck`; `pnpm vitest run packages/core/test/PortSpan.test.ts packages/core/test/PortDescription.test.ts`;
  `pnpm vitest run --project core` (T0 count); `pnpm test:tstyche`; `pnpm circular`; `node scripts/check-house-style.mjs`
  (the 7 `@internal` markers satisfy `core-barrel-complete`, and `no-port-span-key-literals` stays green);
  `node scripts/check-api-surface.mjs` (same count); `pnpm vitest run --project devtools` (devtools reads spans
  through `decodePortSpan`).
- **Done when:** the three files are gone, all of the above is green, and the name diff against `names-before.txt` is
  still empty.

### T5 — Merge the wire pair into one `PortWire` module
- **Status:** [ ] todo
- **Depends on:** T4 (it can run in parallel with T4 on a separate commit; they touch disjoint import lines)
- **Files:** `packages/core/src/PortWire.ts`; delete `packages/core/src/PortWireEncode.ts`; update import specifiers in
  `AttributeResolver.ts`, `CustomPredicate.ts`, `DecisionHistory.ts`, `RelationshipResolver.ts`, `SignatureHistory.ts`
  and `PortRemote.ts`; test `packages/core/test/PortDescription.test.ts`.
- **Steps:**
  1. Append `PortWireEncode.ts`'s body to `PortWire.ts`, after the `PortWire` interface: `WIRE_MAX_DEPTH`,
     `PortWireSpec`, `sameAnswer`, the private `refusal`, and `portWire`. Mark `WIRE_MAX_DEPTH`, `PortWireSpec`,
     `sameAnswer` and `portWire` as `@internal`.
  2. Imports: `effect/Result` changes from `import type * as Result` to `import * as Result`, and the module gains
     `exceedsJsonDepth` (`DecodeDepthGuard.ts`), `toJson` (`JsonHazard.ts`), `MAX_DECODE_DEPTH` and
     `UNTRUSTED_DECODE_OPTIONS` (`Policy.ts`), `describeEncodeRefusal` and `type EncodeRefusal` (`SinkWire.ts`).
  3. Header: keep `PortWire.ts`'s summary and its "the wire is **not** the span" paragraph. Fold in
     `PortWireEncode.ts`'s "encode and decode through a strict schema, refuse what has no JSON form, and never throw"
     and its ADR-QD-037 note ("imports `JsonHazard.ts`, `DecodeDepthGuard.ts` and `Policy.ts`, and no port module"). That
     note is now this module's import rule. Delete "Deliberately out of the barrel".
  4. Every `from "./PortWireEncode.ts"` becomes `from "./PortWire.ts"` (6 `src` files, plus `PortDescription.test.ts`).
     Keep separate `import type` lines where they exist.
  5. If ARCH-46 has landed and removed `spanQuestion`/`spanAnswer`/`PortWireSpan`, move whatever is there. The step is
     about file layout, not content.
- **Tests:** none new. `PortWire.test.ts`, `PortWire.tst.ts`, `PortRemote.test.ts`, `PortServe.test.ts`,
  `PortConformance.test.ts` (wire cases) and `packages/http/test/PortRoutes.test.ts` stay unchanged (BEH-QD-329–333,
  INV-QD-241).
- **Verify:** `pnpm typecheck`; `pnpm vitest run packages/core/test/PortWire.test.ts packages/core/test/PortRemote.test.ts packages/core/test/PortServe.test.ts packages/core/test/PortConformance.test.ts`;
  `pnpm vitest run --project core`; `pnpm vitest run --project http`; `pnpm test:tstyche`; **`pnpm circular`**
  (`PortWire.ts` now reaches `Policy.ts`; the spike found no cycle, and this re-checks it on the real tree);
  `node scripts/check-house-style.mjs`; `node scripts/check-api-surface.mjs`.
- **Done when:** `PortWireEncode.ts` is gone, all of the above is green, and the name diff is still empty.

### T6 — (conditional on D-55-c = B) Stop counting type-only edges, and delete the `SinkRecordTag` restatement
- **Status:** [-] dropped unless D-55-c = B
- **Depends on:** T5, D-55-c (B)
- **Files:** `.madgerc` *new*; `packages/core/src/SinkWire.ts`; `packages/core/test/Errors.tst.ts`;
  `spec/decisions/037-circular-imports-and-type-level-tests-are-gates.md`.
- **Steps:**
  1. `.madgerc`: `{"detectiveOptions":{"ts":{"skipTypeImports":true},"tsx":{"skipTypeImports":true}}}`.
  2. `SinkWire.ts`: `import type { SinkRecord } from "./DecisionRecord.ts"; export type SinkRecordTag = SinkRecord["_tag"];`
     Rewrite its doc comment.
  3. Delete the `.tst` pin in `Errors.tst.ts`, since it has nothing left to pin. Keep `SinkRecordTag`'s public name.
  4. ADR-QD-037 amendment: madge counts value edges only. Give the reason (`verbatimModuleSyntax` erases type imports, so
     a type-only cycle cannot reorder module evaluation), and say what is lost (type-level mutual knowledge is no longer
     gated).
- **Tests:** `pnpm test:tstyche` with the pin removed. Negative probe: a value-import cycle still fails `pnpm circular`.
- **Verify:** `pnpm circular`; `pnpm typecheck`; `pnpm test:tstyche`.
- **Done when:** green, and revertible as one commit.

### T7 — Specification, AGENTS.md, ADR notes, CONTRIBUTING
- **Status:** [ ] todo
- **Depends on:** T5 (T6 if taken)
- **Files:** `AGENTS.md` §9; `CONTRIBUTING.md`; `spec/overview.md`; `spec/invariants.md`; `spec/traceability.md`;
  `spec/behaviors/30-port-calls.md`; `spec/decisions/099-entry-points-are-a-closed-list.md`;
  `spec/decisions/047-a-headless-devtools-model.md`; `spec/decisions/094-a-port-is-described-once.md`;
  `spec/decisions/107-a-port-is-answered-remotely-through-its-description.md`;
  `spec/decisions/051-a-span-says-what-was-asked.md`; `spec/README.md` (CCR row).
- **Steps:** the edits in §8, in that order. Bump each revision with
  `node scripts/spec-revise.mjs <doc> "<what changed>"`, and prefer doing that after rebasing onto the siblings
  (`spec-revise.mjs`'s own advice).
- **Tests:** gates only.
- **Verify:** `pnpm spec:verify:strict`; `node scripts/spec-revise.mjs --check`; `node scripts/check-api-surface.mjs`;
  `node scripts/check-dod-table.mjs` (no gate is added, but a prose "gate N" must still name its command);
  `pnpm spec:examples`.
- **Done when:** green, and `grep -rn "PortSpanEncode\|PortSpanDecode\|PortInterpreter\.ts\|PortWireEncode" spec AGENTS.md CONTRIBUTING.md`
  prints only change-history cells and ADR bodies whose change history carries the T7 note.

### T8 — Full gate, scoped mutation, and the consumer probe after
- **Status:** [ ] todo
- **Depends on:** T7
- **Files:** none.
- **Steps:**
  1. `pnpm exec stryker run --mutate "packages/core/src/PortSpan.ts,packages/core/src/PortWire.ts"`. Compare with the
     same scoped run at T0 (ARCH-21's last scoped run over `PortSpan*.ts` + `PortAccess.ts` scored 96.61). Moving code
     must not lower the score. A new survivor means a mutant moved into an untested position, which is a finding to
     fix, not to accept.
  2. Re-run T1's consumer declaration-emit probe against the branch's build. Expect 0 errors.
  3. Re-run T1 step 1 against the final barrel. The diff with `names-before.txt` must be empty.
  4. `pnpm check`.
- **Tests:** none new.
- **Verify:** as listed.
- **Done when:** `pnpm check` is green, and the Stryker number and the probe result are in §10.

### T9 — Update the tracker
- **Status:** [ ] todo
- **Depends on:** T8
- **Files:** `.planning/architecture/README.md` (wave-5 table and decision register); this plan's §10.
- **Steps:** set `status:`, record D-55-a…e outcomes, and list C11's `LifecycleOptions` hand-off to ARCH-57 if ARCH-57
  has not taken it.
- **Verify:** `./.planning/architecture/progress.sh ARCH-55`.
- **Done when:** the tracker shows the plan's final state.

## 7. Test strategy

- **Replace, don't layer: nothing is added and nothing is deleted.** This is a move. Every existing test keeps its
  assertions. Only import specifiers change, in three files: `PortSpan.test.ts`, `PortSpan.tst.ts` and
  `PortDescription.test.ts`. The tests that pin span and wire behavior stay the authority: `PortSpan.test.ts`
  (round trip, leniency, every port's description, `disclose`), `PortSpan.tst.ts` (a field that could hold arbitrary data
  does not compile), `PortWire.test.ts`/`PortWire.tst.ts`, `PortRemote.test.ts`, `PortServe.test.ts`,
  `PortConformance.test.ts`, and the INV-QD-044 sentinel searches in `Evaluate.test.ts` and `Predicate.test.ts`.
- **The surface is proven equal, not assumed.** The proof is three independent checks:
  1. the sorted name diff (T1/T2/T8);
  2. gate 13's count;
  3. the consumer declaration-emit probe (C15), which catches a type that slips out of the closure, the TS2883 case gate
     13 cannot see.
- **Barrel completeness is a gate from now on** (T3, D-55-b). Negative probes demonstrate each failure mode once, and
  the results are recorded in §10, which is this repository's practice for the gate scripts (they have no unit tests).
- **No property or differential test is added.** No behavior changes. The existing `fc.anything()` property through the
  attribute port's `disclose` (`PortSpan.test.ts`) keeps covering INV-QD-044 in the merged module.
- **Mutation:** gate 16 (`stryker run`) covers `packages/core/src/**/*.ts` minus `index.ts` by glob. T8's scoped run on
  the two merged modules is the before/after comparison.
- **Counts:** `pnpm vitest run --project core` at T0, T2, T4, T5 and T8 must all equal the T0 baseline (1832 at
  `b655b3b`; the spike reproduced it after both merges).

## 8. Spec and documentation updates

| Document | Edit |
| -------- | ---- |
| `AGENTS.md` §9 | "A package whose interface is narrower than its modules names its exports per module…; `@qadi/devtools` is the one today" becomes "…; `@qadi/devtools` and `@qadi/core` are the two today". "the `devtools-named-barrel` house-style rule refuses an `export *` in its two barrels" becomes "the `named-barrel` rule refuses an `export *` in those three barrels and keeps their groups in module-path order, and `core-barrel-complete` refuses an export of a module core's barrel names that the barrel neither lists nor marks `@internal`". **Needs user sign-off (D-55-a).** |
| `CONTRIBUTING.md` | The "A public export" row: "`spec/overview.md` must list it…" gains "and, in `@qadi/core` or `@qadi/devtools`, a line in the package's barrel". |
| `spec/decisions/099-entry-points-are-a-closed-list.md` | Rev 1.2 amendment (2026-10-NN, CCR-QD-NEXT). Core's barrel names its exports for the same reason devtools' does. In core, a part-public module marks its package-private exports `@internal` at the declaration, and house-style checks that, because 38 of core's names are documented only in prose that gate 13's STALE check does not read. No entry point is added. |
| `spec/decisions/047-a-headless-devtools-model.md` | A note revision only: the `devtools-named-barrel` rule its 2026-10-08 amendment cites is now `named-barrel`, and core uses it too (ARCH-55, CCR-QD-NEXT). |
| `spec/decisions/094-…`, `107-…`, `051-…` | A note revision each, in the ADR-QD-073 Rev 1.4 style: "`PortSpanEncode.ts`, `PortSpanDecode.ts` and `PortInterpreter.ts` merged into `PortSpan.ts`, and `PortWireEncode.ts` into `PortWire.ts`; what each states is unchanged (ARCH-55, CCR-QD-NEXT)". The bodies stay as the record. |
| `spec/decisions/037-…` | Amend **only if D-55-c = B** (T6). |
| `spec/overview.md` | The `decodePortSpan` row's module column changes from `PortSpanDecode.ts` to `PortSpan.ts`. Rows naming `PortSpan.ts`/`PortWire.ts` stay as they are. No row is added or removed, since the surface is identical. Add one sentence to the "Entry points" lead-in: "core and devtools name their barrel's exports (AGENTS.md §9)". Add a Change History line. |
| `spec/invariants.md` | INV-QD-044's source sentence changes from "(`PortSpanEncode.ts`). `spanStruct({…` to "(`PortSpan.ts`, `spanStruct`)". |
| `spec/traceability.md` | Behaviour 34's row: `{PortRemote,PortWire,PortWireEncode,JsonHazard,PortInterpreter}.ts` becomes `{PortRemote,PortWire,PortSpan,JsonHazard}.ts`. Add a Change History line. |
| `spec/behaviors/30-port-calls.md` | "`PortInterpreter.ts`" becomes "`PortSpan.ts`". |
| `spec/README.md` | One CCR row, `CCR-QD-NEXT`: "core's barrel names its exports; port span and port wire are one module each (ARCH-55)". |
| `apps/website` | No edit. The website names the `PortInterpreter` *type* (`reference/upgrading.md`), which stays public, and never names a core module file. |
| Changeset | **None.** The published names, types and entry points are identical (T8 proves it). The tarball loses `lib/PortSpanEncode.*`, `PortSpanDecode.*`, `PortInterpreter.*` and `PortWireEncode.*`, which ADR-QD-099 already makes unimportable ("its interface may change without a semver note"). If the user wants a CHANGELOG record anyway, a one-line `"@qadi/core": patch` saying "internal module layout; no change to the published surface" is enough. **Releases need the user's explicit go-ahead. This plan schedules none.** |

## 9. Risks and rollback

| Risk | How it shows | Mitigation / rollback |
| ---- | ------------ | --------------------- |
| A name silently drops out of the barrel, during T2 or later by hand | Gate 13 misses it when the name has no table row (C16). A downstream package that uses it fails to typecheck, but an external consumer would only find out after a release. | T1–T8 name diff; T3's `core-barrel-complete`; T8's consumer probe. Rollback: T2 is one file. Revert it. |
| Siblings in flight add public names to core while this plan is open | A sibling's new export is missing from the regenerated barrel, or it adds `export * from "./New.ts"`. | D-55-e (land last; regenerate at T0). After this lands, `core-barrel-complete` fails any unlisted, unmarked export, and `named-barrel` fails an `export *`, so a missed line is loud. In §10, tell ARCH-46/51/54/56/57 implementers: "after ARCH-55, a new core export is a barrel line". |
| Merge conflicts with ARCH-46 (`PortWire*`, `PortAccess`), ARCH-51 (`PortRemote`, `PortAccess`), ARCH-54/56 (`index.ts`) | Conflict hunks on import lines and barrel groups. | Land last. Every edit here is a move or an import specifier. On conflict, take the sibling's content and re-apply the move. One name per line keeps barrel conflicts line-local. |
| A type-only cycle appears after a merge | `pnpm circular` fails. | The spike found none. If one appears on the real tree because of a sibling's new edge, keep the offending private half as a separate file. The barrel switch (T2/T3) does not depend on the merges. |
| Someone later enables `stripInternal` because `@internal` "means" it | Sibling `.d.ts` files reference stripped declarations, and the build or gate 14 breaks. | The T3 rule comment and the AGENTS.md §9 text say `@internal` is a house-style marker, not a compiler directive. |
| Mutation score drops on the merged modules | T8's scoped Stryker run, or gate 16. | Moving code adds no logic. A new survivor is a test gap that already existed, now visible. Fix it with a test before merging. |
| The user declines the AGENTS.md §9 change (D-55-a = B) | — | Drop the plan. Nothing has landed. ARCH-57 still takes C11's `LifecycleOptions` fix, which is independent. |

Rollback order: T6 (if taken) → T5 → T4 → T3 → T2. Each is one commit, and each later commit depends only on earlier
ones. T2 + T3 alone (a named barrel, no merges) is a coherent stopping point.

## 10. Progress log

| Date | Task | Change | By |
| ---- | ---- | ------ | -- |
| 2026-10-13 | — | Plan written against `b655b3b`. Spike: named barrel plus both merges type-checks, keeps the same 498 names, passes madge, passes 1832/1832 core tests and gate 13 (862). The consumer declaration-emit probe over 317 values is clean. Gate 13 blind spot measured (38 names; `WireVersion` drop undetected). 154 stray untracked `.d.ts` files observed in `packages/{core,http}/src` (not from this plan). | planner |
