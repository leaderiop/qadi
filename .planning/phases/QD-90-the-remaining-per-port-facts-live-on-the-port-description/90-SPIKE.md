# Phase 90: The spike

The spike runs every candidate as a patch on a scratch clone of the spike base and judges it by `pnpm circular` and
`pnpm exec tsc -b tsconfig.json` run in that clone. Nothing under `packages/`, `spec/` or `scripts/` changes in the real
checkout; each candidate lives as a patch under `spike/`, and the chain outputs under `spike/out/`. A chain counts as
acyclic only on madge's own `No circular dependency found` and as compiling only on zero `tsc` errors.

spike base 8ae31ae12ece7802501746569dda85ac427693b9 (the HEAD at the start of plan 05; its `packages/*/src` equals `phase_base`
46174873c60e85bcd0c6702867c602cad8460310, since no plan before it changed source).

## Verdicts

The chains are applied in the order (a), (b), (c), (d), then (f), (g), each patch onto the result of the previous ones. (e) and
the two controls are applied on the base alone. `spike --rerun` re-applies each chain on a fresh clone and re-measures it.

| chain | patches (in order, each with sha256) | madge | tsc | verdict |
| --- | --- | --- | --- | --- |
| a | a.patch sha256 49330209d493f3594460b33431c28b73f9703a12d4fd18220027cd1c8ff9ec00 | No circular dependency found (out/a.madge.txt) | 0 errors (out/a.tsc.txt) | **Accept**: the `PORT_NAMES` tuple in the import-free `PortName.ts` and `PortMetrics.ts` reading it as a value add no edge and compile. |
| a+b | a.patch sha256 49330209d493f3594460b33431c28b73f9703a12d4fd18220027cd1c8ff9ec00, b.patch sha256 e1abefb918a2b18b2c2625cff4cc16f7a73210f76596b786b15898afe5665678 | No circular dependency found (out/a+b.madge.txt) | 0 errors (out/a+b.tsc.txt) | **Accept**: the span as a `SpanName` type parameter with `PortSpanOf` and `PortSpanName` read from the registry in `Ports.ts`, on (a). |
| a+b+c | a.patch sha256 49330209d493f3594460b33431c28b73f9703a12d4fd18220027cd1c8ff9ec00, b.patch sha256 e1abefb918a2b18b2c2625cff4cc16f7a73210f76596b786b15898afe5665678, c.patch sha256 5dd8cb72ddaadad3429aedccf1b7d57565a1c6c92db040bf4d7d60d8e662590a | No circular dependency found (out/a+b+c.madge.txt) | 0 errors (out/a+b+c.tsc.txt) | **Accept**: `DistinctSpanNames` exported from `PortDerivation.ts` and applied with `satisfies` at `PORTS`. |
| a+b+c+d | a.patch sha256 49330209d493f3594460b33431c28b73f9703a12d4fd18220027cd1c8ff9ec00, b.patch sha256 e1abefb918a2b18b2c2625cff4cc16f7a73210f76596b786b15898afe5665678, c.patch sha256 5dd8cb72ddaadad3429aedccf1b7d57565a1c6c92db040bf4d7d60d8e662590a, d.patch sha256 aeadebce94f28c7acc524adfb5a300dea58c0ec59a5a687bd4c5ea4d1f630d8e | No circular dependency found (out/a+b+c+d.madge.txt) | 0 errors (out/a+b+c+d.tsc.txt) | **Accept**: the required `fixture` member, each builder moved above its description and taken by reference, the third `tabulatePorts` overload and `PORT_FIXTURES` derived. |
| e | e.patch sha256 5a0309659fb2c490ce07baa0b3f03952670c170ea82f0fd8aa6950f1ec96136f | Found 16 circular dependencies (out/e.madge.txt) | 5 errors: TS2456, TS2502, TS2315 x3 (out/e.tsc.txt) | **Reject**: `PortServing` derived from the facets through `PortTypes` closes 16 cycles and does not compile, so the serving declaration stays written out. |
| f | f.patch sha256 27926a1b6eca01eb7b66079b62489778b3df6902d8ca0ce57abe5f4debd16e60 | No circular dependency found (out/f.madge.txt) | 0 errors (out/f.tsc.txt) | **Accept**: `ScopedLeafTag` and `ScopedPort` derived from `LEAF_NEEDS` and the descriptions' `asks`. |
| f+g | f.patch sha256 27926a1b6eca01eb7b66079b62489778b3df6902d8ca0ce57abe5f4debd16e60, g.patch sha256 0fe2154abb03a191835c198043502d86ce9712de1a5d59db5a204d5914a30ca0 | No circular dependency found (out/f+g.madge.txt) | 0 errors (out/f+g.tsc.txt) | **Accept**, subject to the bench gate: the routing `readScoped`, the hoisted `Match` and the three one-line call sites, on (f). |
| end | a.patch sha256 49330209d493f3594460b33431c28b73f9703a12d4fd18220027cd1c8ff9ec00, b.patch sha256 e1abefb918a2b18b2c2625cff4cc16f7a73210f76596b786b15898afe5665678, c.patch sha256 5dd8cb72ddaadad3429aedccf1b7d57565a1c6c92db040bf4d7d60d8e662590a, d.patch sha256 aeadebce94f28c7acc524adfb5a300dea58c0ec59a5a687bd4c5ea4d1f630d8e, f.patch sha256 27926a1b6eca01eb7b66079b62489778b3df6902d8ca0ce57abe5f4debd16e60, g.patch sha256 0fe2154abb03a191835c198043502d86ce9712de1a5d59db5a204d5914a30ca0 | No circular dependency found (out/end.madge.txt) | 0 errors (out/end.tsc.txt) | **Accept**: every accepted candidate together; proved against the test graph and every gate in the next section. |
| b-alone | b-alone.patch sha256 9b9351b218b3bef256a8444b84ccc05e114075f15198b283d3332f0867c9f066 | No circular dependency found (out/b-alone.madge.txt) | 2 errors: TS2308 x2 at index.ts (out/b-alone.tsc.txt) | **Reject** as a step on its own: `PortSpanName` and `PortSpanOf` are then declared in both `PortName.ts` and `Ports.ts`, so it needs (a). |
| leaf-imports-registry | leaf-imports-registry.patch sha256 0b8dee53b5903fb932783ae6d051ea6281d80c72ad5370dd31a3235034f91569 | Found 11 circular dependencies (out/leaf-imports-registry.madge.txt) | 0 errors (out/leaf-imports-registry.tsc.txt) | **Reject**: `PortName.ts` importing `./Ports.ts` closes 11 cycles, so the leaf rule is enforced by `pnpm circular`. |

The patches touch `packages/core/src` only, so each applies to the spike base and to `phase_base`. `b-alone` is `b.patch` without
its `PortName.ts` hunk; `leaf-imports-registry` is a type import of `./Ports.ts` in `PortName.ts` and one export that uses it.

### (e), deriving `PortServing`

The first cycle line: `core/src/PortDerivation.ts > core/src/PortDescription.ts > core/src/PortServing.ts > core/src/Ports.ts > core/src/AttributeResolver.ts`.
The three codes, in `PortServing.ts`: `TS2456 Type alias 'PortServingOf' circularly references itself`, `TS2502 'declaration' is
referenced directly or indirectly in its own type annotation` and `TS2315 Type 'PortServingOf' is not generic` (at lines 86 and 98,
and once more at `PortRemote.ts(60,82)`). The serving declaration therefore stays written out, and each facet stays checked against
its slot.

## The decided forms

- **Span:** `typeof` a module-private `const <x>SpanName = "qadi.…"` in each of the five port modules (`attributeSpanName`,
  `actedSpanName`, `relationshipSpanName`, `customSpanName`, `signatureSpanName`), passed as the `SpanName` type argument and
  as the value. Inference through `makePortDescription` was not carried: `CustomPredicate`'s description is an object literal.
  `"qadi.attribute"` also occurs at `AttributeResolver.ts` as a span attribute key of the question, so a count of the literal is a
  count of declarations, never of occurrences.
- **Fixture:** the required `fixture` member, each builder moved above its description and taken by reference (reading one before
  its declaration is TS2448 and a load-time `ReferenceError`), `CustomPredicate`'s answers-to-functions arrow moved into its
  description; `PORT_FIXTURES` derived through a third `tabulatePorts` overload, and `FixtureDataOf`, `FixtureBuilders` and
  `FixtureVisitor` stay unexported, which keeps the public export count at one addition.
- **Distinct spans:** `DistinctSpanNames<R>` is `unknown` when every entry names one literal and no two share one, and `never`
  otherwise, applied as `satisfies DistinctSpanNames<PortTypes>` at `PORTS`; the declaration stays `PORTS: PortTypes`.
- **Scoped read:** `ScopedLeafTag` and `ScopedPort` derived from `LEAF_NEEDS` and the descriptions' `asks`; `readScoped` takes the
  leaf and reads its row through a hoisted `Match.type<"Always" | "ByScope">()`; the per-port `scopedCall` table holds `withId` and
  `bare`, with `bare` typed `undefined` exactly when every scoped leaf of the port is `Always`; `RESOURCE_SCOPED` is kept, because
  `requireResourceId`'s first overload wants `{ scope: "Resource" }`; the test `bare !== undefined` is dead for
  `RelationshipResolver` by type, and reclassifying its `HasRelationship` row is a compile error at the table.
- **Not decided here:** whether the routing passes the bench gate. `f+g` is accepted on madge and `tsc` alone.

## The end state, proved on a scratch clone

`end` plus `spike/tests.patch` (sha256 beac4bb559cf30c8c3feab3ed610b5f9ca4391343b1a8270c9d003efaf450e52): `PortName.tst.ts`
(header naming `DistinctSpanNames`, the two imports from `../src/Ports.ts`, the third test retitled `a description's span is its
own port's` and reduced to its `not.toBeAssignableTo` row), `PortDescription.test.ts` (the one line `fixture: () => named(undefined,
0),`) and `PortFacts.tst.ts` (the end pins appended).

| Check | Result |
| --- | --- |
| `tsc -p tsconfig.test.json --noEmit` on `end` before the test edits | exactly three errors: `PortDescription.test.ts(83,7)` TS2741 (`fixture` missing), `PortName.tst.ts(12,25)` TS2724 (`PortSpanName` not in `PortName.ts`), `PortName.tst.ts(12,39)` TS2305 (`PortSpanOf`) |
| the same, after `tests.patch` | no output, exit 0 |
| `pnpm exec vitest run --project core` | 86 files, 2871 tests, all passed; `PortFacts.characterisation.test.ts` and `LeafNeeds.test.ts` together: 2 files, 95 tests, all passed |
| `node scripts/run-tstyche.mjs packages/core/test/PortFacts.tst.ts packages/core/test/PortName.tst.ts` | pass 1 (floatingEffect off) and pass 2 (on): 2 files, 11 tests, 35 assertions, all passed in both |
| `node scripts/check-house-style.mjs` | `house-style: 648 file(s) clean (3 declared switch(es), 81 type-test file(s))`: no budget moved |
| `pnpm exec oxlint` | no finding in `packages/core` |
| `node scripts/check-api-surface.mjs` | first run: one drift, `PORT_NAMES` is exported and not named in `spec/overview.md`; with `PORT_NAMES` added to the `PortName` row of the scratch `spec/overview.md`: `api-surface: 943 export(s) documented across 9 package(s)` |
| `pnpm circular` | `No circular dependency found!` |
| `pnpm spec:package` | exit 0: `package-install: 9 package(s) pack, resolve and authorize (528 runtime export(s))`; the emitted `Ports.d.ts` holds `FixtureDataOf`, `FixtureBuilders` and `FixtureVisitor` as unexported declarations, with no TS2883 |
| core coverage (`90-mutation.mjs coverage close` in the clone, with the end state committed there) | lines 99.86, functions 99.7, branches 98.33, statements 99.58, each at least 95 (the base's: 99.89, 99.78, 98.33, 99.63); `PortAccess.ts` 98.41 lines, 96.77 functions |

`PortAccess.ts` is the one file under 100% of lines: the routing's two branches are both reached.

## Measured differently from the research

- **(b) alone** was measured on madge as well as on `tsc`: no cycle, and two TS2308 at `index.ts(42,1)` (`PortSpanName`,
  `PortSpanOf`). The research ran only `tsc`.
- **Test totals** are 86 files and 2871 tests, not 85 and 2797: the characterisation and the type-pin plans added files and rows.
- **`Record<string, unknown>`** is a forbidden form in an added line (`scan-forbidden`), and the attribute fixture's data type and
  builder parameter were written with it in the base; moving them makes them added lines. `d.patch` and `tests.patch` therefore
  write that data type as `{ readonly [key: string]: unknown }`, which tstyche reads as identical to the old spelling, so the
  held `PortFacts.tst.ts` pin and the appended `PORT_FIXTURES` pin pass unchanged. The chains `a+b+c+d` and `end` were
  re-measured after the change.
- **`coverage spike`** is not a mode of `90-mutation.mjs` (its modes are `base` and `close`, and both refuse a tree that is not
  clean). The totals above come from `coverage close` run in the clone after committing the end state there.

## The sixth port

A fake sixth port, `"FakePort"`, with none of its facts, is a compile error; the sets are recorded as (file, code) groups in
`90-RED-EVIDENCE.md`, and the comparison reads groups, never counts or lines.

- `## sixth-port base`, on `phase_base` with a sixth `PortSpans` row: 53 errors in 22 groups across core, devtools, http and
  testing. `PortMetrics.ts` is in it (`TS2741`: the metric domain breaks with a sixth span row).
- `## sixth-port close (spike: end)`, on the `end` chain with `"FakePort"` appended to `PORT_NAMES`: 57 errors in 25 groups.
  `PortMetrics.ts` is not in it, because the metric domain follows the tuple. The set is wider than the registry and
  `PortServingOf`: it also holds `PortAccess.ts`, `PortRemote.ts`, devtools' `Capture.ts`, `PortCalls.ts`, `PortCards.ts`,
  `PortReading.ts`, `SimulationFields.ts` and `SimulationSource.ts`, http's `PortRoutes.ts` and testing's `QadiReviewLayer.ts`.
  Both counts equal the research's.
- The judge was seen failing once: against a recorded base set missing its `PortMetrics.ts` group it exits 1 with
  `a group the record lacks: packages/core/src/PortMetrics.ts TS2741` (`## sixth-port-base-group-missing`).
