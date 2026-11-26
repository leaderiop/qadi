---
phase: QD-91-named-barrels-and-visibility-only-files-folded-away
reviewed: 2026-11-26T21:43:14Z
depth: deep
files_reviewed: 98
files_reviewed_list:
  - .changeset/audit-named-barrel.md
  - .changeset/core-named-barrel.md
  - .changeset/react-named-barrel.md
  - AGENTS.md
  - CONTRIBUTING.md
  - packages/audit/README.md
  - packages/audit/src/ArchiveFacts.ts
  - packages/audit/src/AuditArchive.ts
  - packages/audit/src/AuditDecisionSinkLive.ts
  - packages/audit/src/AuditEntry.ts
  - packages/audit/src/SequenceIntegrity.ts (deleted)
  - packages/audit/src/index.ts
  - packages/audit/test/AdmissionOrder.characterisation.test.ts
  - packages/audit/test/AuditArchive.test.ts
  - packages/audit/test/BatchReadOnce.test.ts
  - packages/audit/test/ForeignRows.test.ts
  - packages/audit/test/RowListAdmission.test.ts
  - packages/audit/test/SequenceIntegrity.test.ts
  - packages/audit/test/surface.test.ts
  - packages/core/src/Decision.ts
  - packages/core/src/FieldLattice.ts
  - packages/core/src/PortInterpreter.ts (deleted)
  - packages/core/src/PortSpan.ts
  - packages/core/src/PortSpanDecode.ts (deleted)
  - packages/core/src/PortSpanEncode.ts
  - packages/core/src/index.ts
  - packages/core/test/PortSpan.test.ts
  - packages/core/test/PortSpanFold.mutation.test.ts
  - packages/core/test/surface.test.ts
  - packages/react/src/DevtoolsFeed.ts
  - packages/react/src/GateRegistry.ts (deleted)
  - packages/react/src/GateWriter.ts
  - packages/react/src/Hydration.ts (deleted)
  - packages/react/src/HydrationEngine.ts
  - packages/react/src/HydrationEvent.ts
  - packages/react/src/QadiAtoms.ts
  - packages/react/src/QadiProvider.tsx
  - packages/react/src/RegistryLease.ts
  - packages/react/src/SeededDecision.ts
  - packages/react/src/SeededQuestion.ts
  - packages/react/src/hooks.ts
  - packages/react/src/index.ts
  - packages/react/test/DecisionOutcome.test.ts
  - packages/react/test/DecisionOutcome.tst.ts
  - packages/react/test/DeveloperSignalReporters.test.tsx
  - packages/react/test/GateRegistration.characterisation.test.tsx
  - packages/react/test/GateRegistry.store.test.ts
  - packages/react/test/GateRegistry.test.tsx
  - packages/react/test/GateWriter.reconcile.test.ts
  - packages/react/test/GateWriter.test.tsx
  - packages/react/test/Hydration.lifetime.test.ts
  - packages/react/test/Hydration.test.ts
  - packages/react/test/Hydration.tst.ts
  - packages/react/test/HydrationCounts.test.ts
  - packages/react/test/HydrationPayload.test.ts
  - packages/react/test/HydrationTarget.tst.ts
  - packages/react/test/QadiAtoms.test.ts
  - packages/react/test/QadiProvider.tst.ts
  - packages/react/test/ServerRender.test.tsx
  - packages/react/test/UntrustedSeams.test.ts
  - packages/react/test/support/gates.ts
  - packages/react/test/support/trees.tsx
  - packages/react/test/surface.test.ts
  - scripts/check-house-style.mjs
  - scripts/check-package-install.mjs
  - scripts/lib/declaration-escape.mjs
  - scripts/lib/surface-scan.mjs
  - scripts/surface-diff.mjs
  - spec/README.md
  - spec/behaviors/09-react.md
  - spec/behaviors/19-hydration.md
  - spec/behaviors/30-port-calls.md
  - spec/behaviors/33-audit-pipeline.md
  - spec/decisions/009-observability-via-effect.md
  - spec/decisions/014-react-via-atoms.md
  - spec/decisions/037-circular-imports-and-type-level-tests-are-gates.md
  - spec/decisions/039-a-seed-is-not-an-authority.md
  - spec/decisions/047-a-headless-devtools-model.md
  - spec/decisions/051-a-span-says-what-was-asked.md
  - spec/decisions/056-audit-companion-package.md
  - spec/decisions/077-both-interpreters-read-ports-through-one-module.md
  - spec/decisions/078-a-seed-is-its-own-type-and-the-payload-is-versioned.md
  - spec/decisions/080-a-gate-registry-belongs-to-its-atom-set.md
  - spec/decisions/099-entry-points-are-a-closed-list.md
  - spec/decisions/107-a-port-is-answered-remotely-through-its-description.md
  - spec/decisions/110-an-archives-facts-are-computed-once.md
  - spec/decisions/111-a-gate-writer-is-resolved-once-by-its-provider.md
  - spec/decisions/140-a-gates-write-side-is-a-leaf-below-the-atom-set.md
  - spec/decisions/190-an-audit-row-is-a-value-only-its-codec-makes.md
  - spec/decisions/204-named-barrels-and-visibility-only-files-folded-away.md
  - spec/decisions/index.yaml
  - spec/invariants.md
  - spec/models/17-purpose.md
  - spec/overview.md
  - spec/process/definitions-of-done.md
  - spec/roadmap.md
  - spec/traceability.md
  - spec/urs.md
findings:
  critical: 0
  warning: 7
  info: 7
  total: 14
  necessity: 1
status: issues_found
---

# Phase 91: Code Review Report

**Reviewed:** 2026-11-26T21:43:14Z
**Depth:** deep
**Files Reviewed:** 98 (93 changed, 5 deleted)
**Status:** issues_found

## Summary

Scope: `git diff 69e5247d..e083c5be -- packages scripts AGENTS.md CONTRIBUTING.md spec .changeset`. The phase scripts under
`.planning/` (`91-check.mjs` and friends) were not reviewed this round.

The runtime behaviour is unchanged, and the public surface is what the phase says it is. I re-took the snapshot at HEAD
(`node scripts/surface-diff.mjs snapshot`) and compared it with `91-surface-base.json`: `equal, 948 exports over 10 entries`.
`surface:self-test` passes (20 checks), `check-house-style.mjs` is clean, and the three `surface.test.ts` files plus
`PortSpanFold.mutation.test.ts` pass. In all five barrels, every module has at most one value group and one type group, the
value group comes first, names are sorted, and no name repeats (scratch script). Every `Pinned by` title cited by
BEH-QD-791..795 exists in its file. No added line under `packages/` or `scripts/` carries a D-number, plan id, phase number
or requirement id. The folds are clean: no source file imports a deleted module, and madge and the build agree.

The defects are in the guarantees and in the words:

- The `named-barrel` rule checks less than BEH-QD-795 and AGENTS.md §9 say it does. Its self-test plants only one of its
  refusals.
- The new hydrate probe in gate 14 is guarded by nothing (open item a).
- Two new requirements say "every other name of the module MUST stay package-private". That is false at HEAD for
  `HydrationEngine.ts` and `ArchiveFacts.ts`, and the module docs repeat it.
- The "three-edit rule" cannot be followed for a type name, and four public packages have no `surface.test.ts` to edit.
- BEH-QD-145's normative listing still types `hydrateDecisions` by `QadiAtoms`.
- INV-QD-427 claims the kind and a 948-name baseline are held. Neither is held by any merge step.

**The three known open items, judged:**

- **(a) Hydrate probe outside every probe guard: confirmed, WR-02.** `RUNTIME_PROBES`, `TYPE_ONLY_PROBES` and
  `REFUSED_SHAPE_PROBES` cover only `@qadi/core`. The module hook wraps only `@qadi/core` and `@qadi/devtools`
  (`check-package-install.mjs:1140`). Deleting lines 666-681 leaves gate 14 green, yet ADR-QD-204 names that probe as one
  of the two holders of the structural parameter.
- **(b) Two imports of `./GateWriter.ts` in `QadiProvider.tsx:49-50`: not a defect, no finding.** A separate
  `import type` line next to a value import from the same module is the house pattern under `verbatimModuleSyntax`. More than
  30 `packages/*/src` files do it, among them `QadiAtoms.ts:30-31`, `HydrationEngine.ts:64-65`, `QadiProvider.tsx:61-62` itself (`RegistryOwner.ts`)
  and `PortSpanEncode.ts:38-47` (also introduced here). No lint rule refuses it.
- **(c) WX-07 flagged unresolved: resolved for the reviewed scope, no finding.** A grep of every added line under
  `packages/`, `scripts/` and `features/` for D-numbers, `91-NN`, `Phase 9x`, `BARL-`, `WX-0`, candidate letters and
  `ARCH-138` finds nothing. No tag contains the base. No version or release commit is in the range. The three changesets are
  unconsumed `patch` entries. The one name that mentions the refactor, `PortSpanFold.mutation.test.ts`, carries no id
  (IN-04). Whether anything was pushed or released is for the verifier to confirm from the remote. This review cannot.

Necessity rubric loaded.

## Warnings

### WR-01: The `named-barrel` rule refuses less than its spec says, and its self-test plants one of its refusals

**File:** `scripts/check-house-style.mjs:2179-2258`; `spec/behaviors/09-react.md:1347-1360` (BEH-QD-795 REQUIREMENTS 1-2, and "the form of each barrel is … the `named-barrel` rule"); `AGENTS.md:733-742`; `spec/invariants.md:4996` (INV-QD-427 Enforcement)
**Issue:** I extracted `namedBarrelProblems` verbatim into a scratch script and ran it on planted texts for
`packages/core/src/index.ts`. Each of these returned `[]`, meaning accepted:
- `export type { T } from "./A.ts"; export { a } from "./A.ts";`: a type group before the value group. BEH-QD-795 and
  each barrel's header say "values before types".
- `export { a } from "./A.ts"; export { b } from "./A.ts";`: two value groups for one module. BEH-QD-795 requires "one group
  of each kind per module". The order check uses `>`, so equal specifiers pass.
- `export { a, type T } from "./A.ts";`: a type inside a value group. The REQUIREMENT puts types in `export type { … }`.
- `export { a } from "./A.ts"; export const leaked = 1;` and `import { z } from "@qadi/core"; export { z };`: a binding
  declared in the barrel, or a foreign package's name re-published through it. "A group MUST carry no package specifier"
  is dodged by a group with no `from` clause.
- `export { a } from "../../react/src/A.ts";`: `IN_PACKAGE` accepts any `../`. "A group from outside the package" (AGENTS
  §9) is refused only for bare specifiers. `rootDir` makes this one a compile error, so it is the least of the five.
- For an unlisted index, `export * from "./A.ts"; export { x } from "@qadi/core";` is accepted, so the "mixes one with an
  `export *`" branch only sees relative groups.

The self-test (`:2250-2257`) plants only an `export *`. It plants no out-of-order group, no foreign specifier, no unlisted
named barrel and no empty barrel. So the rationale in the header comment ("a function that stopped matching would
otherwise pass the real tree in silence") holds for one branch of five. If the order loop or `IN_PACKAGE` stopped matching,
the real tree would still pass. In practice the full barrel shape is held only by the phase-local judges, which ADR-QD-204
itself places outside `pnpm check`.
**Fix:** Make the rule check what BEH-QD-795 states, and plant one case per refusal:
```js
const GROUP = /export\s+(type\s+)?\{([^}]*)\}\s*from\s*["']([^"']+)["']/g;
const groups = [...code.matchAll(GROUP)].map((m) => ({ kind: m[1] ? "type" : "value", names: m[2], spec: m[3] }));
groups.forEach((g, i) => {
  if (g.kind === "value" && /(?:^|,)\s*type\s/.test(g.names)) problems.push(`"${g.spec}": a \`type\` inside a value group`);
  const prev = groups[i - 1];
  if (prev?.spec === g.spec && (prev.kind === g.kind || prev.kind === "type"))
    problems.push(`"${g.spec}": one value group, then one type group`);
});
// every top-level `export` must be a named group with a `from` clause
if (/^\s*export\b(?!\s+(?:type\s+)?\{[^}]*\}\s*from\b)/m.test(code)) problems.push("exports something that is not a module group");
// and the self-test, for each listed barrel:
const PLANTS = {
  "`export *`": `${text}\nexport * from "./X.ts";\n`,
  "sorts before": `${text}\nexport { a } from "./!.ts";\n`,
  "not a module of this package": `${text}\nexport { a } from "@qadi/zz";\n`,
  "one value group": `${text}\nexport type { T } from "./zz.ts";\nexport { a } from "./zz.ts";\n`,
  "not a module group": `${text}\nexport const leaked = 1;\n`,
};
```
Also plant one unlisted named barrel (`namedBarrelProblems("packages/x/src/index.ts", 'export { a } from "./A.ts";')`).
Alternatively, narrow BEH-QD-795, AGENTS §9 and INV-QD-427 to what the rule checks.

### WR-02: Gate 14's hydrate probe is in no probe guard, so deleting it leaves the gate green (open item a)

**File:** `scripts/check-package-install.mjs:666-681` (the probe), `:122-158` (`TYPE_ONLY_PROBES`, `RUNTIME_PROBES`, `REFUSED_SHAPE_PROBES`), `:1138-1166` (the module hook); `spec/decisions/204-named-barrels-and-visibility-only-files-folded-away.md:119-121`
**Issue:** ADR-QD-204 says the structural parameter is "probed in the packed consumer": it hydrates through the atom set and
through `{ hydrate }` alone, and a `@ts-expect-error` refuses `hydrateDecisions({}, …)`. Nothing requires those lines to
exist. The hook wraps `@qadi/core` (for `RUNTIME_PROBES`) and `@qadi/devtools` (for `make*Feed`), not `@qadi/react`. The
probe-guard parse reads only `REFUSED_SHAPE_PROBES`/`TYPE_ONLY_PROBES` names, and `HydrationTarget` cannot be one of them
because it is not exported from the root. This is the exact rot the three guarded lists exist to prevent: a probe that a
later edit drops while the gate stays green. `HydrationTarget.tst.ts` still holds the source types, but the packed artifact
(the `.d.ts` a consumer compiles against) is unguarded.
**Fix:** Extend the guard to react, recording that the capability-only call ran:
```js
const REACT_RUNTIME_PROBES = ["dehydrateDecisions", "hydrateDecisions"];
// in probe-hooks.mjs: add "@qadi/react": "qadi-react-reads:" to SCHEMES, and wrap each name as core's are,
// recording "hydrateDecisions:capability" when its first argument has no "runtime" key:
//   record(name === "hydrateDecisions" && !("runtime" in args[0]) ? `${name}:capability` : name)
// after the run:
const unusedReact = [...REACT_RUNTIME_PROBES, "hydrateDecisions:capability"].filter((n) => !called.has(n));
if (unusedReact.length > 0) fail(`the consumer fixture never uses ${unusedReact.join(", ")} of the packed @qadi/react root`);
```
For the type-level refusal, assert that the fixture text holds a `@ts-expect-error` line directly above
`hydrateDecisions({}`. A deleted or detached refusal then fails the gate.

### WR-03: BEH-QD-792 and BEH-QD-794 require "every other name of the module MUST stay package-private", which is false at HEAD

**File:** `spec/behaviors/19-hydration.md:1227-1231` (BEH-QD-792 REQUIREMENT 1); `spec/behaviors/33-audit-pipeline.md:1585-1589` (BEH-QD-794 REQUIREMENT 1); `packages/react/src/HydrationEngine.ts:23-27`; `packages/audit/src/ArchiveFacts.ts:14-17`; `spec/decisions/039-a-seed-is-not-an-authority.md:150-151`, `078-…md:189-190` ("a part-public module whose other names are package-private")
**Issue:** Both modules declare public names that the barrel reaches through another module's re-export:
- `HydrationEngine.ts:79` declares `InitialValues`. `QadiProvider.tsx:119` re-exports it, and `react/src/index.ts` names it
  at `./QadiProvider.tsx`. `HydrationEngine.ts:75` also re-exports `HydrationMismatch` and `HydrationMismatchReporter`,
  which `QadiAtoms.ts:40` re-exports in turn, and the barrel names them at `./QadiAtoms.ts`.
- `ArchiveFacts.ts:146-165` declares `ArchiveInputRefusal` and `ArchiveInputInvalid`. `AuditArchive.ts:49` re-exports them,
  and `audit/src/index.ts` names them at `./AuditArchive.ts`.

The module docs say the same false thing:
- `ArchiveFacts.ts`: "package-private … except `verifySequenceIntegrity` and `SequenceIntegrityError` … every other name here
  stays unreachable from outside the package". It also says "The named barrel names a name at the module that declares it",
  which the same file's two error types contradict.
- `HydrationEngine.ts`: "Package-private except the names the barrel names here".

A maintainer who trusts either doc and renames `ArchiveInputRefusal` or `InitialValues` as a "package-private" change breaks
`@qadi/audit`'s or `@qadi/react`'s public API. The gates catch it (gate 13, the consumer), but the normative text points the
wrong way.
**Fix:** Pick one rule and state it everywhere.
(A) Cleanest, and consistent with "a folded name is named at its declaring module": name these at their declaring modules
and delete the hop re-exports.
```ts
// audit/src/index.ts
export { ArchiveInputInvalid, ArchiveInputRefusal, SequenceIntegrityError, verifySequenceIntegrity } from "./ArchiveFacts.ts";
// react/src/index.ts: InitialValues, HydrationMismatch, HydrationMismatchReporter at their declaring modules
```
Then drop `AuditArchive.ts:49`, `QadiProvider.tsx:119` and `QadiAtoms.ts:40` (and `HydrationEngine.ts:75` if nothing else
needs it). This needs `spec/overview.md` Source cells and the ADR-QD-204 home-rule sentence updated together.
(B) Minimal: reword both REQUIREMENTs and the two headers to "every other name is package-private, except names the barrel
reaches through another module's documented re-export (`InitialValues`, …; `ArchiveInputInvalid`, `ArchiveInputRefusal`)".

### WR-04: The "three-edit rule" cannot be followed for a type name, and four public packages have no `surface.test.ts`

**File:** `AGENTS.md:742-744`; `CONTRIBUTING.md:89`; `spec/decisions/204-named-barrels-and-visibility-only-files-folded-away.md:59-61`; `spec/behaviors/09-react.md:1365-1367` (BEH-QD-795); `spec/decisions/047-a-headless-devtools-model.md:556-557`
**Issue:** Every one of these says "a new public name/export is three edits: … and its name in that package's
`test/surface.test.ts`". Two problems:
- Each `surface.test.ts` holds `ROOT_VALUES`, asserted equal to `Object.keys(Root)`. A type name is not a runtime key, so
  following the rule for a new `export type { X }` (adding `"X"` to the list) makes the test fail. For a type the rule is two
  edits, and the third is wrong.
- `@qadi/http`, `@qadi/testing`, `@qadi/promise`, `@qadi/predicate-sql` and `@qadi/predicate-prisma` are public and have no
  `test/surface.test.ts` (only audit, core, devtools and react do). AGENTS §9 states the rule for "a public name" in
  general, right after naming http and testing.
**Fix:** State the rule as it works: "Adding a public name is a line in the barrel and a row in `spec/overview.md`. Adding a
public *value* to a part-public root (`@qadi/core`, `@qadi/react`, `@qadi/audit`, `@qadi/devtools`) is also a line in that
package's `test/surface.test.ts`." Make the same edit in all five places.

### WR-05: BEH-QD-145's normative signature still types `hydrateDecisions` by `QadiAtoms`

**File:** `spec/behaviors/19-hydration.md:24-34` (BEH-QD-145 listing, `atoms: QadiAtoms` at :30); `apps/website/src/content/docs/docs/packages/react/hydration.md:23-28`
**Issue:** `hydrateDecisions(atoms: HydrationTarget, …)` (`HydrationEngine.ts:768`) accepts `{ hydrate }` alone, and the
same spec file's BEH-QD-792 (:1221) requires exactly that. The normative listing 1,200 lines above still reads
`atoms: QadiAtoms`, so the spec states two signatures for one function. The website reference page, the published API doc,
states the old one too. The react changeset tells users the parameter widened, and the docs say it did not.
**Fix:** Write the capability, not the unexported name. Both fences are ```` ```ts ````, so this is reference text:
```ts
export const hydrateDecisions: (
  atoms: { readonly hydrate: QadiAtoms["hydrate"] }, // an atom set, or anything that forwards its `hydrate`
  dehydrated: DehydratedDecisions,
  subject: AuthSubject,
  options?: HydrateOptions,
) => InitialValues;
```
Link BEH-QD-792 from BEH-QD-145.

### WR-06: INV-QD-427 claims the kind and the 948-name baseline are held. No merge step holds either

**File:** `spec/invariants.md:4990` (Statement: "each with the kind it is recorded with"), `:4994` (Implication: "so the kind is held as well as the name … The surface the barrels were generated from, 948 names over 10 entry points, is the one the checks compare with")
**Issue:**
- **Kind.** The merge gate holds one kind transition: a value turned type-only fails `surface.test.ts`. `both → value` is
  held by nothing. Deleting `export type Foo = typeof Foo` beside a public `const Foo` leaves `export { Foo }` in the barrel,
  so gate 13's name count, the value list and the build all pass, while a consumer's `x: Foo` stops compiling.
  `surface-diff.mjs` would see it, but its own header and ADR-QD-204 say "the snapshot is … deliberately not a gate".
- **Baseline.** After the phase closes, nothing in `pnpm check` compares anything with 948 names. That baseline lives only
  in `.planning/…/91-surface-base.json`, read by the phase-local `91-check.mjs`. Gate 13 compares barrel text with
  `spec/overview.md`, not with a recorded surface.
**Fix:** Restate the invariant to match its enforcement: "a value turned type-only fails the root's `surface.test.ts`; other
kind changes are seen by `node scripts/surface-diff.mjs compare`, run by hand on a barrel edit", and drop the "the checks
compare with" sentence. Or, if `both` should be held, add a type-level pin per root. For example, a `surface.tst.ts` holding
`expect<import("../src/index.ts").Foo>().type.not.toBeNever()` for each `both` name, generated from the snapshot once.

### WR-07: Impossible-state guard: `mkdirSync` on a directory `mkdtempSync` just created

**File:** `scripts/lib/surface-scan.mjs:33, 41`
**Category:** necessity
**Issue:** `const scratch = mkdtempSync(join(tmpdir(), "surface-scan-"));` (:33) creates the directory, or throws.
`mkdirSync(scratch, { recursive: true })` (:41) therefore always runs on an existing directory and is a no-op by construction.
The guarded state, `scratch` not existing, cannot occur between the two lines.
**Fix:** Delete line 41.

## Info

### IN-01: The folded `GateRegistry.ts` header is now a free-floating `/* */` block attached to nothing

**File:** `packages/react/src/GateWriter.ts:370-405`
**Issue:** The rationale for the registry ("Every live guard under one atom set…", BEH-QD-217, ADR-QD-080, "off means
absent") was `GateRegistry.ts`'s module doc. It is now a plain `/*` comment between a section banner and
`GateRegistryOptions`, so no editor or `.d.ts` shows it. Meanwhile `GateRegistry`'s own doc (`:118-124`) says only "The read
side of a gate registry". The doc-comment shape rule wants the summary, then the why, on the export.
**Fix:** Move the paragraphs into the JSDoc of `export interface GateRegistry` (or of `makeGateRegistry`) after its
one-line summary, and delete the orphan block.

### IN-02: `HydrationTarget`: a wrong reason for staying out of the root, and a pin that does not pin `extends`

**File:** `packages/react/src/HydrationEngine.ts:553-582`; `packages/react/test/HydrationTarget.tst.ts:32-34`
**Issue:**
- "Package-private: the barrel names no seed slot (ADR-QD-039)" is a non-sequitur. `HydrationTarget` holds no seed slot, and
  its member returns `InitialValues`. ADR-QD-204's real reason is that no export is added. The inherited `hydrate` doc also
  says "each is private to this closure", which reads oddly on a structural interface any object can satisfy.
- "the atom set states hydrate through the one signature" checks `QadiAtoms["hydrate"]` against a written-out `Written`.
  It passes just as well if `QadiAtoms` drops `extends HydrationTarget` and redeclares an identical `hydrate`, which is the
  duplication BEH-QD-792 says the `extends` removes.

**Fix:** Reword the reason to "kept out of the root so the surface does not grow; a consumer names it as
`Parameters<typeof hydrateDecisions>[0]`". Move "private to this closure" back to `QadiAtoms`. If the `extends` matters, pin
it, e.g. a `declare const a: QadiAtoms; const t: HydrationTarget = a;` together with a `// @ts-expect-error` on a
`QadiAtoms` whose `hydrate` is renamed. Otherwise drop the claim.

### IN-03: Leftovers from the folds

**File:** `packages/react/test/GateRegistry.store.test.ts`, `GateRegistry.test.tsx`, `Hydration.test.ts`, `Hydration.tst.ts`, `Hydration.lifetime.test.ts`, `packages/audit/test/SequenceIntegrity.test.ts`; `spec/decisions/053-a-gate-can-be-found.md:162`; `packages/*/lib/`
**Issue:**
- Six test files are named for modules that no longer exist. Their subject is now `GateWriter.ts`, `HydrationEngine.ts` and
  `ArchiveFacts.ts`.
- ADR-QD-053:162 still says, in the present tense, "`GateRegistry.ts` lives in `@qadi/react`". The sibling ADRs 014, 080,
  111 and 140 each got a "read `GateWriter.ts`" note, and 053 did not.
- `pnpm build` is `tsc -b`, which never deletes outputs of removed sources. The local `lib/` still holds `Hydration.{js,d.ts}`
  (with a `HydrationTarget` the source no longer has there), `GateRegistry.*`, `PortSpanDecode.*`, `PortInterpreter.*` and
  `SequenceIntegrity.*`. A local `check-package-install.mjs` packs them, and check 3c scans them. A fresh CI checkout is
  unaffected, but the phase's per-fold "gate 14 exit 0" evidence ran over these orphans.

**Fix:** Rename the six test files after the module each now tests, or record why the names stay. Add the read-as note to
ADR-QD-053. Run `pnpm clean && pnpm build` before close-out evidence, or have gate 14 refuse a packed `lib/*.js` that has no
`src/*.ts` twin.

### IN-04: `PortSpanFold.mutation.test.ts` is named for the refactor, cites a function that does not exist, and hard-codes the interpreter set

**File:** `packages/core/test/PortSpanFold.mutation.test.ts:1-7, 33-35`
**Issue:**
- The filename names the event (a fold) and the tool (mutation), not the subject. It is the only `*.mutation.test.ts` in
  the repo, and `spec/traceability.md` does not list it.
- The header says "a property of `PortSpanEncode.ts`'s `decode`", but no `decode` is declared there. It means `decodeSpan`,
  or the struct's `decode` member.
- `["evaluate", "toPredicate", "remote"] as const` restates the closed set. A fourth interpreter added to `portInterpreter`
  passes this test without being covered.

**Fix:** Fold the rows into `PortSpan.test.ts` (or name the file `PortSpanDecode…`/`DecodeSpan.test.ts`), fix the header
to `decodeSpan`, iterate `portInterpreter.literals`, and add a traceability row.

### IN-05: ADR-QD-204 and BEH-QD-795 call the promise and predicate roots "pure `export *`" barrels

**File:** `spec/decisions/204-named-barrels-and-visibility-only-files-folded-away.md:43-45`; `spec/behaviors/09-react.md:1369`
**Issue:** `@qadi/promise`, `@qadi/predicate-sql` and `@qadi/predicate-prisma` have no `export *`. Each root is the
implementation itself, and `check-house-style.mjs`'s `barrel-order` comment says so for promise. AGENTS §9 correctly names
only http and testing as pure barrels.
**Fix:** "`@qadi/http` and `@qadi/testing` stay pure `export *`; `@qadi/promise` and the predicate packages' roots are their
implementation, not a barrel."

### IN-06: ADR-QD-078's note credits `HydrationEngine.ts` with the seed atoms and the precedence

**File:** `spec/decisions/078-a-seed-is-its-own-type-and-the-payload-is-versioned.md:189-193`
**Issue:** "`HydrationEngine.ts` … owns the payload codec, the seed atoms and the precedence". The engine's own header
(`HydrationEngine.ts:7-12`) and `SeededQuestion.ts:3-11` say the seed slot and the client-wins precedence are
`SeededQuestion.ts`'s (ADR-QD-155), and that the engine only fills a slot.
**Fix:** "owns the payload codec and the two entry points; the seed slot and the precedence stay `SeededQuestion.ts`'s".

### IN-07: `surface-diff.mjs`'s `validated` throws a raw TypeError instead of refusing on a null `entries` or name

**File:** `scripts/surface-diff.mjs:109-119`
**Issue:** `typeof null === "object"`, so `{ "entries": null }` passes the guard and `Object.entries(null)` throws a
`TypeError`. `main` rethrows anything that is not a `Refusal`, so the user gets a stack trace instead of
`surface-diff: <file>: not a surface snapshot`. A `null` element in `names` behaves the same way. The exit code is still
non-zero, so nothing compares equal by mistake.
**Fix:** `if (snapshot?.entries === null || typeof snapshot?.entries !== "object") refuse(…)`, and refuse a name element
that is not an object with a string `name`.

---

_Reviewed: 2026-11-26T21:43:14Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: deep_
