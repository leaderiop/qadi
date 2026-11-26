# Phase 91: Named barrels, and visibility-only files folded away - Pattern Map

**Mapped:** 2026-11-26
**Files analyzed:** ~60 (3 barrels, 3 born `surface.test.ts`, 5 fold sources, 5 fold targets, 1 born tstyche file, 4 scripts edited, 1 new tool, 4 phase scripts, ~20 spec/doc edits, 3 changesets)
**Analogs found:** all matched at HEAD `6aaec2ff`. Every path named is git-tracked source (the `.planning/phases/QD-90-*` and `.planning/milestones` files are tracked planning tree). No `.gsd` mirror paths.

Where this file and CONTEXT disagree, CONTEXT's "Addendum after research" (D-NNa) wins. Line numbers below were read at HEAD; the 90 phase scripts are 800-2600 lines each, so they are cited by structure and by grep anchor, not quoted.

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match |
|---|---|---|---|---|
| `packages/{core,react,audit}/src/index.ts` (rewrite) | barrel (named) | transform | `packages/devtools/src/index.ts:1-30`, `src/react/index.ts:1-15` | exact |
| `packages/{core,react,audit}/test/surface.test.ts` (born) | test | request-response | `packages/devtools/test/surface.test.ts:1-86` | exact |
| `scripts/surface-diff.mjs` (new) | tool (snapshot/compare/--self-test) | file-I/O + compiler API | `scripts/lib/module-state-scan.mjs` + `scripts/lib/typescript-server-child.mjs`; self-test shape `scripts/bench/analyze.mjs:162-300` | role-match (composite) |
| `package.json` `check` + `surface:self-test`; DoD table row 27 | config | batch | `bench:self-test` (`package.json:28`, `:42`; `spec/process/definitions-of-done.md:50` row 26) | exact |
| `scripts/check-house-style.mjs` `named-barrel` (+ `[named-barrel-self-test]`) | gate rule | transform | `devtools-named-barrel` `:2159-2198` and `barrel-order` `:2124-2157` | exact |
| `scripts/check-package-install.mjs` check 3c + check 4 probes | gate | file-I/O | check 3b `:396-475`; probe lists `:107-160`; `@ts-expect-error` twin `:905-912`, `:945-952` | exact |
| `packages/core/src/PortSpanEncode.ts` (absorbs `PortSpanDecode.ts`) | module | transform | itself `:10-35`; `PortSpanDecode.ts` (26 lines) | exact |
| `packages/core/src/PortSpan.ts` (absorbs `PortInterpreter.ts`) | module (types to runtime) | transform | itself `:10-30`, `:74-80`; `PortInterpreter.ts` (21 lines) | exact |
| `packages/react/src/GateWriter.ts` (absorbs `GateRegistry.ts`) | module | CRUD (closure store) | `GateRegistry.ts:1-60` | exact |
| `packages/audit/src/ArchiveFacts.ts` (absorbs `SequenceIntegrity.ts`) | module | transform | `SequenceIntegrity.ts:1-26`, `ArchiveFacts.ts:1-30` | exact |
| `packages/react/src/HydrationEngine.ts` (absorbs `Hydration.ts`, gains `HydrationTarget`) | module | transform | `Hydration.ts:1-95`; `QadiAtoms.ts:136-155` | exact |
| `packages/react/src/QadiAtoms.ts` (`extends HydrationTarget`) | service interface | request-response | itself `:25-50`, `:136-155` | exact |
| `packages/react/test/HydrationTarget.tst.ts` (born; name is discretionary) | type test | n/a | `packages/core/test/PortServing.tst.ts:1-35` | exact |
| `.planning/phases/QD-91-*/91-check.mjs`, `91-pinned-check.mjs`, `91-earlier-checks.mjs`, `91-mutation.mjs` | phase scripts | batch | the four `90-*.mjs` in `QD-90-the-remaining-per-port-facts-live-on-the-port-description/` | exact |
| `spec/decisions/204-named-barrels-and-visibility-only-files-folded-away.md` | ADR | doc | `spec/decisions/203-the-remaining-per-port-facts-live-on-the-port-description.md` | exact |
| dated amendments (ADR-QD-037, 047, 099) and `>` notes (009, 039, 051, 077, 080, 107, 110, 140) | ADR edits | doc | `spec/decisions/134-*.md:97` | exact |
| `.changeset/{core,react,audit}-named-barrel.md` | changeset | doc | `.changeset/core-port-facts-on-the-description.md`; patch-style: `.changeset/audit-batch-admitted-once.md` | exact |
| `spec/README.md` CCR-QD-483 row; `spec/decisions/index.yaml` ADR-204 entry; BEH/INV/overview/traceability | spec registers | doc | CCR-QD-482 row (`spec/README.md:419`); `index.yaml` ADR-QD-203 entry (~`:503`) | exact |
| `AGENTS.md` §7a (707), §9, §16; `CONTRIBUTING.md:89` | prose | doc | themselves | exact |

## Pattern Assignments

### Named barrels: `packages/{core,react,audit}/src/index.ts` (barrel, transform)

**Analog:** `packages/devtools/src/index.ts`.

**Header** (lines 1-20; the load-bearing sentences to copy and adapt per package):
```ts
 * **The list below is the interface** (ADR-QD-047's amendment, ARCH-40): ... Adding a name is a line here, a row in
 * `spec/overview.md` and a line in `test/surface.test.ts`, which is deliberate.
 */
```
Cite ADR-QD-204 alongside. React's `components.tsx`/`hooks.ts` "deliberate multi-export grouping files" comment (`packages/react/src/index.ts:7-10`) moves into this header (D-11).

**Group shape** (`devtools/src/index.ts:21-30`): one `export { values } from "./M.ts";` group then one `export type { types } from "./M.ts";` group per module, module-path ASCII order, names ASCII-sorted in a group, wrapped by hand ~90 cols when long:
```ts
export type { Answer, CapturedAnswers } from "./model/Capture.ts";
export { catalogueOf } from "./model/Catalogue.ts";
export type { Catalogue, PolicySighting } from "./model/Catalogue.ts";
export {
  DEFAULT_DIAGNOSTICS_INTERVAL_MILLIS,
  WiringRead,
  mergeReading,
} from "./model/Diagnostics.ts";
```
Note devtools puts the type group before the value group when the module path sorts that way; "module-path order" is the only ordering the rule checks, so a value-then-type or type-then-value order inside one module is free. Pick one and make `[named-barrel]` agree (it does not check it).

**Before-state to replace:** audit `index.ts` is 16 `export *` lines (line 12 `SequenceIntegrity.ts`; `ArchiveFacts.ts` absent). React `index.ts` is 8 lines (3 `GateRegistry.ts`, 4 `Hydration.ts`, 6 `QadiProvider.tsx`). Core is 61 `export *` lines (39 `PortSpan.ts`, 40 `PortSpanDecode.ts`).

**Generator (not committed, D-11/D-11a):** drive it with `runTypescriptChild` (below) and `getExportsOfModule`; take `91-surface-base.json` and keep any name the base exports type-only as `export type` (corrects D-11: `AllowDisclosure`, `DenyDisclosure`, audit `AuditEntry`). No file-move in the barrel commit.

### `packages/{core,react,audit}/test/surface.test.ts` (test, born on base)

**Analog:** `packages/devtools/test/surface.test.ts`. Copy the whole shape:
```ts
// header :1-14 names the three-edit rule: the barrel line, a spec/overview.md row (gate 13), and this file.
import { assert, describe, it } from "@effect/vitest";
import * as Root from "../src/index.ts";
const ROOT_VALUES: ReadonlyArray<string> = [ /* literal, sorted, written out, never computed */ ];
describe("@qadi/devtools' interface (ADR-QD-047, ADR-QD-099)", () => {
  it("the root exports exactly the feeds, ...", () => {
    assert.deepStrictEqual(Object.keys(Root).sort(), [...ROOT_VALUES].sort());
  });
});
```
(`surface.test.ts:22-25`, `:62-86`.) Test titles name a property, never a D-number or phase (WX-07). React's list includes `useQadiContext`. Written and green on the base before any barrel commit (D-08).

### `scripts/surface-diff.mjs` (new tool: snapshot, compare, --self-test)

**Analogs.** TS server mechanics: `scripts/lib/module-state-scan.mjs:23-40, 97-117` and `scripts/lib/probe-guard-parse.mjs:27, 83-92`. Child runner: `scripts/lib/typescript-server-child.mjs` (`nameServerPids` :31, `runTypescriptChild(script, args, { cwd, timeoutMs })` :57). Self-test-in-`pnpm check`: `scripts/bench/analyze.mjs` (`selfTest` :162, `process.argv[2] === "--self-test"` :300, header :2, :23, `mkdtempSync(... "analyze-self-test-")` :242, "self-test FAILED: name: why" :192, "self-test: N passed" :280).

**API usage to copy** (`module-state-scan.mjs`):
```js
import { nameServerPids } from "./typescript-server-child.mjs";
const { API } = await import("typescript/unstable/sync");
const { NodeFlags, SyntaxKind } = await import("typescript/unstable/ast");
const api = new API({ cwd: root });
try { const snapshot = api.updateSnapshot({ openProjects: projects }); /* ... */ } finally { api.close(); }
```
`probe-guard-parse.mjs:83-87` opens one project with `updateSnapshot({ openProject: join(sandbox, "tsconfig.json") })`: use that single-project form (D-06a: one `API` instance per entry point, a temp tsconfig outside the repo with `files: [entry]`, `nodenext`, `skipLibCheck`, `types: []`). Call `nameServerPids()` after the API starts so a killed child takes its server with it. A parent mode (snapshot/compare) shells the TS part out through `runTypescriptChild`; `compare` and the self-test's four planted defects are pure and need no server for the compare half.

**Self-test table** (copy `analyze.mjs`'s `check(name, got, want)` style): plant a class under `export type`, a const-and-type pair under `export type`, a dropped type name, an added name; each reported by `compare`; an identical pair passes; exit 0 / 1 as `analyze.mjs` documents.

**Wiring:** `package.json:28` is `"bench:self-test": "node scripts/bench/analyze.mjs --self-test"`; add `"surface:self-test": "node scripts/surface-diff.mjs --self-test"` and append ` && pnpm surface:self-test` after `pnpm bench:self-test` at the end of `check` (`package.json:42`). DoD row 26 is `| 26 | \`node scripts/bench/analyze.mjs --self-test\` | ... |` (`spec/process/definitions-of-done.md:50`); add row 27 and a Change History entry in the same commit (gate 11, `scripts/check-dod-table.mjs`). Name the script not just the number (AGENTS.md §15). The DoD paragraph for step 26 is at `:295` (also a "new in CCR" note style to copy).

### `scripts/check-house-style.mjs`: `named-barrel` (gate rule, transform)

**Analog:** `devtools-named-barrel` `:2159-2198` (read in full). Reusable pieces:
```js
const BARREL_LINE = /^export \* from ["'](\.\/[^"']+)["'];?$/;     // :2130, barrel-order (pure barrels only)
const COMMENT_LINE = /^(\/\/|\/\*|\*\/|\*)/;                        // :2135
const DEVTOOLS_BARRELS = ["packages/devtools/src/index.ts", "packages/devtools/src/react/index.ts"]; // :2171  -> NAMED_BARRELS
const STAR_EXPORT = /^\s*export\s+(?:type\s+)?\*/m;                  // :2172
const NAMED_EXPORT = /export\s+(?:type\s+)?\{[^}]*\}\s*from\s*["']([^"']+)["']/g; // :2173
// comment stripping, because the header says "export":
.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");   // :2177-2179
// two failure texts :2183 (export *), :2192 (group order); loop does failures += 1; console.error(`${rel}  [devtools-named-barrel] ...`)
```
**Make it one function over `(rel, text)`** returning failure strings (a loop around it handles files; the self-test calls it on planted text). Rule must: refuse `export *`; refuse a non-relative group (`from "@..."`); refuse groups out of module-path order; flag any other `packages/*/src/**/index.ts(x)` with a relative named group as `unlisted named barrel`; flag a barrel mixing `export *` and a named group as `mixed`. It must NOT fire on http, testing (pure) nor promise, predicate-sql, predicate-prisma (no relative named group): the existing `barrel-order` loop at `:2137-2157` (`continue` when not pure) stays as is (D-24a: prototype passed the five clean and failed both plants).

**Self-check pattern.** No in-rule planted-text check exists in `check-house-style.mjs` today (grep for `self-test|planted` in all three gate scripts finds only `analyze.mjs`). Closest precedents for a rule guarding itself are non-emptiness guards: `SPAN_KEY_MIN` (`:2447` region, "an extraction that finds fewer fails, so renaming the declaration cannot empty the rule") and the `*_BUDGET_NAMES` rename guards (`UNTRUSTED_DECODE_BUDGET_NAMES` `:678`). Add `[named-barrel-self-test]`: apply the function to each listed barrel's text with `export * from "./X.ts";` appended; a planted variant that returns no failure is itself a failure. Same idea for the new gate-14 check below.

**Coupled constants to leave or re-measure (D-17):** `UNTRUSTED_DECODE_BUDGET` `:655-667` (`"packages/core/src/PortSpanEncode.ts": 2` at `:662`; comment at `:661`) and `_NAMES` row `:678` (`["spanStruct"]`); `SPAN_KEY_DECLARATION` `:2438` (`EvaluationSpan.ts`) and `SPAN_KEY_SHARED` `:2441` (`PortSpanEncode.ts`); `SPAN_KEY_MIN = 11` `:2447`. All keep their values (PortSpanEncode.ts keeps its path). `:1043` names `packages/react/src/Hydration.ts` as an example: re-point in the Hydration fold commit (D-30a). Prose twin: AGENTS.md §7a table row for `PortSpanEncode.ts` (707) in the same commit (X-2 budget rule).

### `scripts/check-package-install.mjs`: check 3c (`.d.ts` escape) and check 4 probes

**Analog:** check 3b `:396-475`. Structure to copy:
```js
// Check 3b header block comment :396-405 (what it asserts, why gate 13 reads the manifest and this reads the artifact)
const libModules = (root, relative = "") => readdirSync(...).flatMap(...)   // :407-411 recursive walk; filter entry.name.endsWith(".js")
for (const { name, target } of installed) { ... const lib = join(target, "lib"); if (!existsSync(lib)) continue; ... } // :425-440
fail(`${name}: ...`)                                                         // :431, the failure idiom
```
`installed` is `{ name, target }` per packed public package. Check 3c: for each `lib/**/*.d.ts`, strip comments first (46 `lib` `.d.ts` carry `../../` in doc comments, D-09a), collect specifiers from `import("…")`, `from "…"`, `export … from "…"`, and keep `/// <reference path="…">` lines, then `fail()` for a relative specifier resolving outside `target` or any `/src/` segment. Put the pure function above the loop and run it on three planted texts (one escape, one `src` path, one clean) on every run, failing the gate if a planted escape passes. Update the header list at `:17-27` ("Six checks": add `3c. d.ts`). Insert after check 3b's `catch` (before the Check 4 banner at `:476`). AGENTS.md §16 gains one sentence.

**Check 4 probes** (D-21): `RUNTIME_PROBES` / `TYPE_ONLY_PROBES` / `REFUSED_SHAPE_PROBES` at `:107-160`; the consumer fixture's twin idiom, to copy for `hydrateDecisions`:
```ts
// :905-908  (a refused literal, annotated with the shape, the member carries @ts-expect-error)
  // @ts-expect-error fixture is required: ...
  fixture: undefined,
// :945-949
const preThirteen: DecisionCacheShape = {
  // @ts-expect-error getOrCompute(question, compute) no longer exists
  getOrCompute: ...
```
Probes to add: `hydrateDecisions(atoms, …)` and `hydrateDecisions({ hydrate: atoms.hydrate }, …)` accepted, a `@ts-expect-error` beside them refusing `hydrateDecisions({}, …)`. `REFUSED_SHAPE_PROBES` is a `Map<typeName, refusedMember>` (`:150-155`) and requires a typed literal: `hydrateDecisions` is a function, so its refusal lives in the fixture with the existing guard at `:1208` untouched; the `HydrationTarget` interface stays unnamed publicly (D-21a), so do not add it to `TYPE_ONLY_PROBES`. Gate 14's printed runtime-export figure is not pinned (D-09b).

### Fold 1: `PortSpanDecode.ts` into `PortSpanEncode.ts` (core)

**Source** (`PortSpanDecode.ts`, whole): imports `import type { PortSpanAttributes, PortSpanRow, SpanFields } from "./PortSpan.ts"` and `import { attemptsStruct, decodeSpan } from "./PortSpanEncode.ts"`, then:
```ts
export const decodePortSpan = <Q extends SpanFields, Ans extends SpanFields, O>(
  d: { readonly attributes: PortSpanAttributes<Q, Ans, O> },
  attributes: ReadonlyMap<string, unknown>,
): PortSpanRow<Q, Ans> => ({
  ...decodeSpan(attemptsStruct, attributes),
  ...decodeSpan(d.attributes.question, attributes),
  ...decodeSpan(d.attributes.answer, attributes),
});
```
**Target edits** (`PortSpanEncode.ts`): move the function and its doc verbatim (inside the file, `attemptsStruct`/`decodeSpan` are local so the self-import disappears); add `PortSpanAttributes`, `PortSpanRow` to the existing `import type { SpanFields, ... } from "./PortSpan.ts"` (`:36`). **Header sentence to rewrite** (`:18-22`): "Deliberately out of the barrel (AGENTS.md §9, ADR-QD-077): ... The public half is `PortSpan.ts` ... and `PortSpanDecode.ts` (the decoder)." becomes "package-private except `decodePortSpan`, which the barrel names here (ADR-QD-077, ADR-QD-204)". Also drop the "types, then machinery, then this" justification (it was `PortSpanDecode.ts`'s header) in favour of one sentence that `PortSpanEncode.ts` stays a cycle-breaker (D-10 b'/b''). `PortSpan.ts:16,21` mention `PortSpanDecode.ts` (also line ~70 `decoded (PortSpanDecode.ts)`): reword to `PortSpanEncode.ts`. Only the barrel (`index.ts:40`) and `packages/core/test/PortSpan.test.ts:19` import it; re-point import lines only. Seen-failing plants: `JSON.parse` in `PortSpanEncode.ts` fails `[untrusted-decode]`; a second `"qadi.subject_id"` inside `decodePortSpan` fails `[span-key-source]` (scratch copies; record in `91-RED-EVIDENCE.md`).

### Fold 2: `PortInterpreter.ts` into `PortSpan.ts` (core)

**Source** (`PortInterpreter.ts:19-21`):
```ts
import * as Schema from "effect/Schema";
export const portInterpreter = Schema.Literals(["evaluate", "toPredicate", "remote"]);
export type PortInterpreter = typeof portInterpreter.Type;
```
(its doc, lines 1-18, moves with it; "Package-private: the type is public through `PortSpan.ts`, the schema is not" is the sentence to rewrite.)
**Target** (`PortSpan.ts`): line 23 is `import type * as Schema from "effect/Schema";`; it must become a value import (`import * as Schema from "effect/Schema"`, which `portInterpreter` needs; if the existing type uses stay type-position it is the same import). Replace `:74-80` (`export type { PortInterpreter } from "./PortInterpreter.ts";` with "Stated once, in `PortInterpreter.ts`") by the declaration itself, doc moved verbatim, "stated once, here". `PortSpanEncode.ts:35` `import { portInterpreter } from "./PortInterpreter.ts"` becomes `from "./PortSpan.ts"`. The barrel names the type only (`export type { PortInterpreter, ... } from "./PortSpan.ts"`), so `portInterpreter` stays unnamed. Into `PortSpanEncode.ts` instead would be a cycle (D-10 b').

### Fold 3: `GateRegistry.ts` into `GateWriter.ts` (react)

**Source** (`GateRegistry.ts:34-60`): imports `reporterFor, SIGNALS` from `./DeveloperSignals.ts` and `buildGateRegistry` / `type GateRegistry` from `./GateWriter.ts`; re-exports four types (`:37`); declares `interface GateRegistryOptions` (`onIdCollision?`) and
```ts
export const makeGateRegistry = (options?: GateRegistryOptions): GateRegistry =>
  buildGateRegistry(
    reporterFor(SIGNALS.GateIdCollision, "makeGateRegistry", options?.onIdCollision),
  );
```
The big file doc (`:1-33`: "Every live guard under one atom set...") becomes `makeGateRegistry`'s / the section doc. **Target** `GateWriter.ts` has no local import today (only `import type ... from "@qadi/core"` at `:25`); it gains `import { reporterFor, SIGNALS } from "./DeveloperSignals.ts"`. **Headers to rewrite:** `GateWriter.ts:7-10` ("Out of the barrel ... `GateRegistry.ts` re-exports the four public types by name") and `:20` ("Below `GateRegistry.ts` and `QadiAtoms.ts`... React-free"). New claim (domain note 5): it has no local import today, imports `DeveloperSignals.ts` only after the fold, is still below the atom set and React-free. Same wording in ADR-QD-140 (title, 61) and ADR-QD-080 (161). Re-point imports: `QadiAtoms.ts:32` (`import type { GateRegistry } from "./GateRegistry.ts"`), `QadiProvider.tsx:49`, `DevtoolsFeed.ts:44`, `hooks.ts:13`. The only `QadiProvider.tsx` edit is that import line; re-run Phase 86's `provider-forwards-only` (`QD-86-*/86-check.mjs`, ~`:793`) through `91-earlier-checks.mjs`.

### Fold 4: `SequenceIntegrity.ts` into `ArchiveFacts.ts` (audit)

**Source:** a 26-line file that is only a doc (disclaimer `:4-17`) and `export { SequenceIntegrityError, verifySequenceIntegrity } from "./ArchiveFacts.ts";` (`:26`; zero valid mutants, so mutation is N/A on this side). **Target** (`ArchiveFacts.ts`): the disclaimer ("not tamper-evident", "No grouping key", "renamed from ChainIntegrity...") becomes the doc of `verifySequenceIntegrity`/`SequenceIntegrityError`. **Header paragraph to rewrite** (`ArchiveFacts.ts:14-17`): "The module is out of the barrel ... reach the barrel through [SequenceIntegrity.ts](./SequenceIntegrity.ts)". New: package-private except those two names which the barrel names here; four documents cite the disclaimer. Citations to re-point (plan 5): `packages/audit/README.md:115,128`, `spec/urs.md:48`, `spec/models/17-purpose.md:240`, ADR-QD-009:45, plus `33-audit-pipeline.md:850`, `invariants.md:2473`, ADR-QD-056 (133, 423), ADR-QD-190 (72) (domain note 7). Phase 89's admission (`HostBatch.ts`) stays out. Tests that import it: `SequenceIntegrity.test.ts`, `AuditArchive.test.ts`, `ForeignRows.test.ts`, `RowListAdmission.test.ts`, `BatchReadOnce.test.ts`, and the held `AdmissionOrder.characterisation.test.ts` (import line only).

### Fold 5: `Hydration.ts` into `HydrationEngine.ts` (react), commit A then B

**Commit A (type change, RED first):** declare in `HydrationEngine.ts`
```ts
interface HydrationTarget {            // package-private; extends nothing; carries QadiAtoms.hydrate's doc (QadiAtoms.ts:136-155)
  readonly hydrate: (dehydrated: DehydratedDecisions, subject: AuthSubject, options?: HydrateOptions) => InitialValues;
}
```
`QadiAtoms.ts`: the `hydrate` member (`:152-156` signature, doc `:136-151`) is removed and `export interface QadiAtoms extends HydrationTarget`; `hydrateDecisions(atoms: HydrationTarget, ...)` in `Hydration.ts:90-95`; `Hydration.ts:31` `import type { QadiAtoms }` goes away. Remove now-unused `DehydratedDecisions`, `HydrateOptions`, `InitialValues` imports from `QadiAtoms.ts` (TS6133, D-21a). `QadiAtoms.ts` today imports `{ type DehydratedDecisions, type HydrateOptions, type HydrationMismatchReporter, type InitialValues, hydrateWith } from "./HydrationEngine.ts"` (`:25-30`) and the two re-exports at `:42` (`HydrationMismatch`, `HydrationMismatchReporter` from `HydrationEngine.ts`), `:44` stay (they are public homes, D-13).

**Commit B (fold):** move `dehydrateDecisions` (`Hydration.ts:55-59`, delegating `dehydrateWith(entries, options)`) and `hydrateDecisions` (`:90-95`) with their docs; the ADR-QD-028 "security shape" paragraph (`Hydration.ts:9-14`) goes into the engine's header. Rewrite `HydrationEngine.ts:13-18`: "Private, and out of the barrel on purpose (AGENTS.md §9, ADR-QD-039) ... `Hydration.ts` is the public interface over this module ... This file imports nothing from `Hydration.ts`, `QadiAtoms.ts` or `QadiProvider.tsx`" becomes "package-private except the names the barrel names here"; the "imports nothing from `QadiAtoms.ts`" claim must be kept true (it is, because of `HydrationTarget`). Delete the re-export block `Hydration.ts:37-44` (the `HydrationDrop`, `DehydratedDecisions`, `DecisionEntry`, `*Options`, disclosure and `SeededAllow/SeededDeny/isSeeded/permits` lines); those names are homed per D-13 (`HydrationDrop(Reporter)` at `DeveloperSignals.ts`, `DecisionEntry` at `HydrationEvent.ts`, seeded names at `SeededDecision.ts`, the engine's own at `HydrationEngine.ts`; `HydrationEngine.ts:64-65` re-exports `HydrationMismatch*` and `DecisionEntry` and stays). `Hydration.ts:34-36` is the comment justifying a re-export for TS2883; the TS2883 case is now caught by gate 14's check 3c.

### Born tstyche file for `HydrationTarget`

**Analog:** `packages/core/test/PortServing.tst.ts`. Copy:
```ts
/** Pins that ...  No deliberate compile error lives here, because `tsconfig.test.json` also compiles every `*.tst.ts`; the negative cases are `not.toBeAssignableTo`. */  // :8-9
import { expect, test } from "tstyche";
test("serving is a required member of a description", () => {
  expect<Omit<PortTypes["AttributeResolver"], "serving">>().type.not.toBeAssignableTo<DescriptionOf<"AttributeResolver">>();   // :26-30
});
expect<Port["x"]>().type.toBe<...>();   // :32-35 (written-out signature, held)
```
Three pins (D-21): `hydrateDecisions` accepts a `{ hydrate }`-only forwarding object (RED on the base, error text recorded in D-21a: "Argument of type '{ readonly hydrate: Written; }' is not assignable to parameter of type 'QadiAtoms'..."); `QadiAtoms` assignable to `Parameters<typeof hydrateDecisions>[0]`; `QadiAtoms["hydrate"]` `.toBe` its written-out signature. `not.toBeAssignableTo` and positive pins only, so the `NOT_CALLABLE_PIN_BUDGET` (AGENTS.md §6 table) does not move. `hydrateDecisions` returns a plain value, but the file must not use bare negative `toBeCallableWith` (budget). Its one import line (`./Hydration.ts`) is a declared edit re-pointed in commit B. Existing analog for `Hydration.tst.ts` (budget row, 1 callable pin): `packages/react/test/Hydration.tst.ts`, import line only.

### Phase scripts `91-check.mjs`, `91-pinned-check.mjs`, `91-earlier-checks.mjs`, `91-mutation.mjs`

**Analog dir:** `.planning/phases/QD-90-the-remaining-per-port-facts-live-on-the-port-description/` (`90-check.mjs` 2582 lines, `90-pinned-check.mjs` 824, `90-earlier-checks.mjs` 552, `90-mutation.mjs` 801). Copy the structure, not the text; each has a `--self-test` and each mode is seen failing once.

- **`90-check.mjs` modes** (`MODES` table at `:1798-1876`): `base`, `commit`, `unchanged`, `scratch`, `variant`, `vitest`, `suite` (`:1843`), `trailers` (`:1855`), `circular` (`:1865`), `records` (`:1869`), `spike`, `bench`, `close`. A `runChildren(children, exec)` helper (`:1325-1340`) runs a labelled `argv` list and collects reasons; the close lists children at `:1717-1723` (`node 90-pinned-check.mjs --all-applied`, `node 90-earlier-checks.mjs`, `records --close`, `scan-ids`, `scan-forbidden`, `trailers`, ..., `circular`, `90-mutation.mjs compare|landed close|landed coverage-close`, `pnpm spec:package`). Self-test at `:2561-2575` (`eq(...)` cases), entry guard `import.meta.url === pathToFileURL(process.argv[1]).href` at `:2577`. 91 adds `barrels`, `homes`, `folds`, `escape`, `rule`, `changesets` judges; `scan-ids` adds `BARL-0\d`, `91-\d{2}`, `QD-91`, `Phase 91`. `90-check.mjs` refuses a detached branch; a scratch clone creates a branch named `arch-wave-16` (D-31a).
- **`90-pinned-check.mjs`:** constants `PREFIXES` (`:57`), `HELD_SOURCE` (`:59`), `DECLARED` (`:65-121`), `BORN` (`:122`), `MUTATION` subject (`:131`). Held = every path `git ls-tree -r` lists at the base under the test dirs, byte for byte, computed from the base, never listed. Declared = per file `{ file, subject, regions: [{ first, last, top, bottom }], amendments? }` with exact base line ranges (`last = first - 1` is an insertion), and `top`/`bottom` the text that line starts with. Entry shape (`:65-73`):
  ```js
  { file: `${CORE_TEST}/LeafNeeds.test.ts`, subject: "test(90-04): hold the scoped read to its leaf rows",
    regions: [{ first: 9, last: 43, top: 'import { assert, describe, it } from "@effect/vitest";', bottom: 'import { subjectWith } from "./helpers.ts";' }, ...] }
  ```
  91's declared regions are D-23's exact import lines; 91 declares react (21 files), audit and core test files by exact lines, holds the three `surface.test.ts` after their commit, the devtools barrels, `PortServing.ts`, `RegistryOwner.ts`, `QadiProvider.tsx` outside its import block.
- **`90-earlier-checks.mjs`:** `P85_COPIED`..`P89_COPIED` lists (`:62-66`) of files copied to scratch (`OUT = $TMPDIR/qd90/earlier`, `:61`), `RUNS` (`:185`, `{ label, copy, file, args }`), `LEDGER` (`:261`, `{ label, exit, line | reasons+set | computed }`), commit subjects as constants (`:102-110`, e.g. `const DECISION = "docs(90-14): record the port facts decision";`), `CHANGESET_SUBJECTS` (`:113`), `COUNT_AT_BASE` (`:119`), `EXPLAINING_GUARDS` (`:153`), `COMPUTED` (`:178`). 91 adds `P90_COPIED` (`90-check.mjs`, `90-pinned-check.mjs`, ...) to `RUNS`; per D-31a three rows move (86-pinned, 89-pinned, 90-pinned) and match each reason by path with any line number, keyed on the exact commit subject (copy subjects, never paraphrase). Never edit an archived check's path constants.
- **`90-mutation.mjs` / `89-mutation.mjs`:** `89-mutation.mjs` has the `RENAMED` map (`:57`, `const RENAMED = {}; const baseOf = (file) => RENAMED[file] ?? file;`), `UNMEASURED_WHY` (`:65`), `EXAMINED` (`:80`), `judge` (`:223`) and `judgeNew` (`:263`), and the "a base is not refused when X is absent" self-test (`:516`). 91 needs a populated `RENAMED` (`PortSpanEncode.ts` ← itself + `PortSpanDecode.ts`; `PortSpan.ts` ← itself + `PortInterpreter.ts`; `ArchiveFacts.ts` ← itself + `SequenceIntegrity.ts`), the combined score being Σkilled/Σvalid, N/A when both sides have no valid mutants, plus the absent-file allowance (close never hands Stryker a missing path; `SequenceIntegrity.ts` has 0 valid mutants). Invocation template `90-mutation.mjs:117`: ``pnpm exec stryker run ${CONFIG} --mutate ${FILES.join(",")}`` (precedent for a comma list). Static-code `EXAMINED` mechanism for `portInterpreter`'s `Schema.Literals` mutants: run by hand `ignoreStatic: false` and see Killed by the interpreter-outside-the-set test. Per D-32 the base is taken at the phase base, core has no wave record for these files; audit `ArchiveFacts.ts` 54 of 54 (`89-mutation-close.json`), react `RegistryLease.ts` 28 of 28 (`86-mutation-close.json`).

### Spec and records

- **ADR-QD-204:** copy `spec/decisions/203-...md` exactly: "Document Control" blockquote table (ID `QADI-ADR-204`, Revision 1.0, Effective Date 2026-11-26 as the real edit date, Status `Accepted — amends ADR-QD-037, ADR-QD-047, ADR-QD-099; reads ...`, Change History `1.0 (2026-11-26): Initial (ARCH-138, CCR-QD-483)`), then `## Context`, decisions, spike verdict table (a verdict per candidate with its commit), "What enforces it" naming commands.
- **Dated amendment / note:** `spec/decisions/134-*.md:97` format, and its Status and Change History cells (`:10`, `:13`) are edited in the same revision:
  `> **Amended (2026-11-26, ADR-QD-203, CCR-QD-482): the scoped ports are derived, and `readScoped` routes every scoped read.**` followed by the blockquoted prose. 204 uses `ADR-QD-204, CCR-QD-483`. Bump the Revision on each edited ADR with `node scripts/spec-revise.mjs <spec-doc.md> "<what changed>" --date YYYY-MM-DD` (usage `scripts/spec-revise.mjs:6`; pass the real date; `--check` is the verifier). Review-round spec fixes are made in place with no second bump (D-02).
- **`spec/decisions/index.yaml`:** entry shape (`:303-304`):
  ```yaml
  - id: "ADR-QD-203"
    file: "203-....md"
    title: "..."
    status: "Accepted — amends ...; amended 2026-11-26 (ADR-QD-203: ...)"
  ```
  Each amended ADR's `status` line gains the dated clause (see `:304`, `:420`, `:504`), and ADR-QD-204 gets a new entry after 203.
- **CCR row:** `spec/README.md:419` (`| CCR-QD-482 | 2026-11-26 | \`spec/README.md\` Rev 1.416 (this row), \`spec/decisions/203-...md\` Rev 1.0 (new; ...`) and the README Change History line `:13` (`1.416 (2026-11-26): the CCR-QD-482 row, naming every document it revises`). CCR-QD-483 follows; name "Unused: ..." for any reservation not used (D-02) and BEH-QD-795's chosen home (D-27).
- **Changesets** (D-29): front matter `---\n"@qadi/core": patch\n---` then a plain-text body, copied from `.changeset/core-port-facts-on-the-description.md` (that one is `minor`/**Breaking.**; ours are `patch` with "No export changes." sentences; patch-shaped files: `.changeset/audit-batch-admitted-once.md`, `audit-entry-decoded-once.md`). Exactly three files (`core-named-barrel.md`, `react-named-barrel.md`, `audit-named-barrel.md`) unless D-09/the sweep forces another package, which gets its own "No export changes." patch and the close expectation grows with it.
- **Prose:** AGENTS.md §9 (`:731-750`) rewritten per D-25; §7a table (707); §16 (`:954-983`); CONTRIBUTING.md `:89` (`| A public export | \`spec/overview.md\` must list it — \`scripts/check-api-surface.mjs\` fails otherwise |`) names the three edits and gains a surface-diff row. Rename `devtools-named-barrel` live everywhere (ADR-047/099 amended text, `spec/traceability.md:530`); change history keeps the old name.

## Shared Patterns

### Exact-region, subject-keyed provenance
**Source:** `90-pinned-check.mjs` (DECLARED/BORN) and `90-earlier-checks.mjs` (LEDGER keyed by commit subject). **Apply to:** every 91 phase script and every fold commit. A commit subject constant is written before the commit exists and copied verbatim into the ledger.

### Budget and rule edited with its AGENTS.md table in one commit (X-2)
**Source:** `UNTRUSTED_DECODE_BUDGET` `:655-667` + AGENTS.md §7a table; `SPAN_KEY_*` `:2438-2449` + §6 `SPAN_KEY_LITERAL_BUDGET`. **Apply to:** the PortSpanEncode fold (comment `:661` and §7a row 707 gain one clause: the public `decodePortSpan` reads through the same per-field struct decode, with no counted token).

### TS-server child under a timeout
**Source:** `scripts/lib/typescript-server-child.mjs` (`nameServerPids`, `runTypescriptChild`); caller idiom `check-house-style.mjs:1833-1836` (`runTypescriptChild(MODULE_STATE_SCAN, [ROOT, ...files], { timeoutMs })` then `JSON.parse(out)`). **Apply to:** `scripts/surface-diff.mjs` and the (uncommitted) generator.

### Seen-failing evidence
**Source:** `.planning/phases/QD-90-*/90-RED-EVIDENCE.md`. **Apply to:** every new check (`named-barrel` x5 plants, `[named-barrel-self-test]`, escape check, surface-diff's four defects, `HydrationTarget` pin RED, the four UNMEASURED behaviour variants).

### Import hygiene
AGENTS.md §1: relative imports carry `.ts`; `import type` for type-only (`verbatimModuleSyntax`); cross-package named imports from the package root only. A moved declaration keeps `import * as Schema from "effect/Schema"` style submodule imports.

## No Analog Found

| File | Role | Reason |
|------|------|--------|
| in-rule planted-text self-check in `check-house-style.mjs` | gate self-test | None exists in house-style or the two other gate scripts; `analyze.mjs` is the only self-test, and `SPAN_KEY_MIN` / `*_BUDGET_NAMES` are the nearest "the rule cannot silently match nothing" guards. Build it new following D-24, `analyze.mjs`'s `check(name, got, want)` style, and report as `[named-barrel-self-test]`. |
| gate 14 planted-text check on `.d.ts` specifiers | gate self-check | Same reason; copy the idiom from the house-style self-check once written. |
| compiler-symbol-flag export reader (`getExportsOfModule`, `getAliasedSymbol`, `SymbolFlags`) | tool | No existing script calls it; the repo's TS-API scripts use the AST (`NodeFlags`, `SyntaxKind`). Reference: `node_modules/typescript/dist/api/sync/api.d.ts` and the research probe P3 (`91-RESEARCH.md`). |

## Metadata

**Analog search scope:** `packages/{core,react,audit,devtools}/src` and `test`, `scripts/*.mjs`, `scripts/lib`, `scripts/bench`, `spec/decisions`, `spec/process`, `.changeset`, `.planning/phases/QD-89-*`, `QD-90-*`.
**Files read or grepped:** ~35 (the 90 phase scripts by grep anchors only, being 4.7k lines).
**Pattern extraction date:** 2026-11-26
