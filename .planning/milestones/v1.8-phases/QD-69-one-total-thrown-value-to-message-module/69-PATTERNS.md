# Phase 69: One total thrown-value-to-message module - Pattern Map

**Mapped:** 2026-11-22
**Files analyzed:** 16 source/test files plus the spec records
**Analogs found:** all but the spec-record rows, which were located by path but not excerpted (see "Records")

All paths below are git-tracked source (no capability-mirror paths).

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match |
|---|---|---|---|---|
| `packages/core/src/ThrownMessage.ts` (new) | utility | transform | `packages/core/src/ValueText.ts` | exact |
| `packages/core/src/index.ts` | barrel | n/a | its own lines 55-60 | exact |
| `packages/core/test/ThrownMessage.test.ts` (new) | test | table | `packages/core/test/ValueText.test.ts` | exact |
| `SinkCodec.ts:361-367` | utility | transform | itself (`describeThrown` is deleted) | n/a |
| `CustomPredicate.ts:89-95, :239` | port spec | transform | itself | n/a |
| `JsonHazard.ts:182-183`, `PortKey.ts:197-200`, `PortDerivation.ts:113-118`, `PortWireEncode.ts:131,149` | catch arms | transform | `SinkCodec.ts` `describeThrown` | exact |
| `http/src/RemotePorts.ts:39-40`, `react/src/DeveloperSignals.ts:115-116`, `devtools/src/model/Capture.ts:162-171` | catch arms | transform | same | exact |

## Pattern Assignments

### `packages/core/src/ThrownMessage.ts` (utility, transform)

**Analog:** `packages/core/src/ValueText.ts` (lines 1-20, 22-23)

Doc-comment shape: a one-line summary that ends "It never throws.", then a paragraph of why.

```ts
/**
 * The JSON text of a value, or `undefined` when it has none. It never throws.
 *
 * `JSON.stringify` answers ... Every place that turns a caller's value into text ...
 */
export const valueText = (value: unknown): string | undefined => {
  try {
    const text: string | undefined = JSON.stringify(value);
    return text;
  } catch {
    // A bigint, a cycle, ...: no text.
  }
  return undefined;
};

/** The words a value with no JSON form is written as; they carry none of it. */
const NO_JSON_FORM = "a value with no JSON form";
```

Copy:
- a plain sync function (no Effect), with a module-scope placeholder const `"a value that could not be described"` (D-03);
- try/catch per read, with a one-line comment in each catch;
- the D-04 order: guarded `message` read, and return it only if `typeof === "string"`; else guarded `String(value)`; else the placeholder;
- no `as`, `!` or `any`. Read `message` without a cast: `Predicate.hasProperty(value, "message")` (as `Capture.ts:161` does), or `value instanceof Error ? value.message : undefined` inside the `try`, and then check `typeof`.

Use a type-annotated local (`const text: string = String(value)`) as `ValueText.ts:14` does. Do NOT use `Result.try` with `catch: String`: the probe showed it rethrows.

The current fully guarded copy being replaced, `SinkCodec.ts:361-365`:
```ts
const describeThrown = (thrown: unknown): string =>
  Result.getOrElse(
    Result.try(() => (thrown instanceof Error ? thrown.message : String(thrown))),
    () => "a value that could not be described",
  );
```
It is guarded for `String` but not for a non-string `message`. Delete it and import `thrownMessage` in its place. `encodeFailed` at `SinkCodec.ts:367` becomes `EncodeRefusal.EncodeFailed({ message: thrownMessage(thrown) })`.

**Barrel** (`index.ts:57-60`, alphabetical). Insert `export * from "./ThrownMessage.ts";` after `TraceDiff.ts` (`Th` < `Tr`), so before it. The neighbours are:
```ts
export * from "./SubjectSet.ts";
export * from "./ThrownMessage.ts";   // new, before TraceDiff
export * from "./TraceDiff.ts";
export * from "./UntrustedDecode.ts";
export * from "./ValueText.ts";
```

### Call-site edits (change only the `catch` arm; the `try` arm and each refusal type stay)

Every excerpt is the current text; the replacement is `thrownMessage(error)`.

- `JsonHazard.ts:182-183`
  ```ts
  const encodeFailed = (error: unknown): EncodeRefusal =>
    EncodeRefusal.EncodeFailed({ message: error instanceof Error ? error.message : String(error) });
  ```
- `PortKey.ts:197-200`
  ```ts
  catch: (error) =>
    KeyRefusal.Unreadable({ path: [...path], message: error instanceof Error ? error.message : String(error) }),
  ```
- `PortDerivation.ts:113-118`
  ```ts
  catch: (error) => KeyRefusal.Unreadable({ path: [], message: error instanceof Error ? error.message : String(error) }),
  ```
- `PortWireEncode.ts:131` and `:149`: `catch: (error) => String(error)` becomes `thrownMessage`. This is the visible change: `Error: boom` becomes `boom` (D-02).
- `CustomPredicate.ts:85-95`: delete `renderReason`'s body. `failure: ([name], cause) => new CustomPredicateError({ name, reason: thrownMessage(cause) })`.
- `CustomPredicate.ts:239` (D-05)
  ```ts
  defect: ([name], cause) => new CustomPredicateError({ name, reason: Cause.pretty(cause) }),
  ```
  Guard `Cause.pretty` in a try. Its catch returns `thrownMessage(Cause.squash(cause))`. `Cause.squash` is already used at `PortDerivation.ts:119`. The normal path stays `Cause.pretty(cause)`.
- `http/src/RemotePorts.ts:39-40`: `RemotePortFailure.Transport({ message: thrownMessage(error) })`. Import it as a named import from `@qadi/core` (AGENTS §1).
- `react/src/DeveloperSignals.ts:115-116` (D-08): the current text is `error instanceof Error ? \`${error.name}: ${error.message}\` : String(error)`. Keep the `name: message` shape and guard the `name` read. The message part comes from `thrownMessage`. This file is exempt from `no-ambient-console`, so keep that in mind.
- `devtools/src/model/Capture.ts:162-171`: keep the "reads `cause` first" structure:
  ```ts
  const cause = Predicate.hasProperty(error, "cause") ? error.cause : undefined;
  if (cause === undefined) return String(error);   // -> thrownMessage(error)
  if (cause instanceof Error) return cause.message; // -> collapses into thrownMessage(cause)
  ```
  The whole try/catch with `"<unrenderable cause>"` goes away: `return thrownMessage(cause ?? error)`, but note that a cause of `undefined` falls back to the error itself.

## RED-regression analogs (D-09; hostile value has BOTH a throwing `toString` and a throwing `message` getter)

| Site | Test file | Closest existing `it` |
|---|---|---|
| `toJson`/`toJsonRecord` (JsonHazard) | `packages/core/test/SinkCodec.test.ts:1100-1118` | "a thrown value that cannot even be described is still EncodeFailed, never a throw" (stays; asserts `refusalOf(recordWith({ resource: { nested: hostile } }))`). Add a sibling with a hostile `Error`. `toJson` is also exercised in `PortWire.test.ts:72` and `Policy.test.ts:197`. |
| derived port `key` (PortDerivation) | `packages/core/test/PortDescription.test.ts:577-592` | "a request whose member throws when read is refused, never thrown": a getter throws; asserts `Result.isFailure(relationshipResolverPort.key([hostile]))`, `{ _tag: "Unreadable", path: [], message: "boom" }`. |
| `canonicalKey` (PortKey) | `packages/core/test/PortKey.test.ts:218-233` | has `throwing` (`new Error("boom")`) and `throwingText` (`throw "plain"`) fixtures, asserted with `refusalOf(...)` and `KeyRefusal.Unreadable({ path, message })`. Add a hostile-value case. |
| `portWire.encodeQuestion/encodeAnswer` | `packages/core/test/PortWire.test.ts:60-83` | "a getter that throws" fixture at `:65` and the loop asserting `Result.isFailure(wire.encodeAnswer(value))`. The "custom predicate's resource and params are refused" case at `:75` shows the `customPredicatePort.wire.encodeQuestion([...])` call. |
| `customPredicatePort.failure` / `.defect` | `packages/core/test/PortConformance.test.ts:735-757` | the `reasonFor(...)` helper cases and "a defect is rendered with Cause.pretty and names the same predicate" (`:750-757`, stays green). Add a hostile `Cause.die(hostile)` case, plus an evaluation whose custom predicate dies with the value. |
| http `transport` | `packages/http/test/PortRoutes.test.ts:418-428` | "a proxy's HTML page under a 502 ...": `asked(...)` helper, asserts `Result.isFailure` and `rendered(result.failure)`. Add a client that fails with the hostile value. |
| react `errorLine` | `packages/react/test/DeveloperSignals.test.ts:248-275` | `describe("a supplied reporter that throws (ReporterThrew, INT-04)")`; `boom = () => { throw new TypeError("host boom") }`, plus the `threw(reporter, error)` expected-text helper. Throw the hostile value instead of `boom`. |
| devtools `Capture` | `packages/devtools/test/model/Capture.test.ts:590-606` | "a cause that cannot be stringified does not take the capture down". It uses `scriptedPort(attributeResolverPort, () => PortReply.fail(hostile), "broken").layer` and `capturing(broken)`, and asserts `recorded.message`. The pin at `:604` moves from `"<unrenderable cause>"` to `"a value that could not be described"`. Give `hostile` a throwing `message` getter too. |

Pins that move:
- `PortConformance.test.ts:743-748`: the `"<unrenderable cause>"` literal at `:747` becomes `"a value that could not be described"`. The test title at `:743` also says "a placeholder".
- `Capture.test.ts:604`: as above.
- `SinkCodec.test.ts:1118`: already the right wording; no edit.

### `packages/core/test/ThrownMessage.test.ts` (new)

**Analog:** `packages/core/test/ValueText.test.ts:1-25`. It has a header doc comment ("The one table of ...") and imports from `@effect/vitest`.
```ts
import { assert, describe, it } from "@effect/vitest";
import { valueLabel, valueText } from "../src/ValueText.ts";
```
Fixtures are module-scope consts (`loop`, `revoked`), and the cases form a table. Import `thrownMessage` from `../src/ThrownMessage.ts` and cover the D-10 rows.

## Shared Patterns

**Hostile value fixture** (CONTEXT specifics). Declare it once per test file:
`{ toString() { throw … }, get message() { throw … } }`, plus `Object.defineProperty(new Error("x"), "message", { get() { throw … } })`.

**Broken ports in tests:** `scriptedPort(port, () => PortReply.fail(hostile))` (PORT_DOUBLE_BUDGET). Never hand-write a failing port layer.

**Imports:** `.ts` extensions on relative imports, `import type` for types, named imports from `@qadi/core` across packages (AGENTS §1). Metric/`never throws` rules: `Effect.orDie` is forbidden in evaluation paths.

## Records (paths located; not all excerpted: planner reads these in the records plan)

| Record | Analog / location |
|---|---|
| ADR-QD-182 | The latest is `spec/decisions/177-one-throwing-listener-cannot-silence-the-rest.md` (ADR numbers 178-181 are reserved by earlier wave-13 phases). Format: `# ADR-QD-177 — Title`, a "Document Control" blockquote table (Document ID `QADI-ADR-177`, Revision, Effective Date, Status, Author `Qadi Engineering`, Classification `Architecture Decision Record`, Change History with `(ARCH-n, CCR-QD-n)`), then `## Context`, `## Decision` (numbered). Filename is `NNN-kebab-title.md`. |
| `spec/decisions/index.yaml` | Entry shape: `- id: "ADR-QD-177"` / `file: "177-….md"` / `title: "…"` / `status: "Accepted — …"`. |
| CCR row | `spec/README.md:393-397` (CCR-QD-456..460): `\| CCR-QD-n \| date \| files with Rev … \|`. Also a new Change History row at `spec/README.md:13` (current 1.278). |
| INV-QD-383 | `spec/invariants.md:4328` (`## INV-QD-376: …`) with a `**Related**` line at `:4326`. Change History at `:13` (1.168). |
| BEH-QD-681-685 | `spec/behaviors/05-evaluator.md:436-453` (BEH-QD-661): `## BEH-QD-661: Title`, the `> **Invariant:**` and `> **See:**` blockquote, a fenced `REQUIREMENT:` block, then prose. Candidate homes: `05-evaluator.md` (port totality) and `18-explanation.md` (owns BEH-QD-542, ValueText; ADR-QD-154). |
| traceability | `spec/traceability.md:443` pattern: `\| \`packages/core/test/ValueText.test.ts\` \| BEH-QD-542, ADR-QD-154 — … \|` |
| overview row (gate 13) | `spec/overview.md:154-155`: `` \| `valueText` \| function \| `ValueText.ts` — … never throws \| ``. Add `thrownMessage` next to them. Change History is at `:13`. |
| gate 14 probe | `scripts/check-package-install.mjs:343-349`: the probe is generic (`Object.keys(m).length` per package), and there is no per-name probe for `valueText`/`valueLabel` (grep finds none). A new export needs no script edit here. Confirm against gate 13's `ENTRY` handling in `check-api-surface.mjs`, which I did not open. |
| changesets | `.changeset/core-compile-predicate.md`: front matter `"@qadi/core": minor`, then one paragraph. Use `patch` for http, react and devtools (one file each, or one multi-package file). |

## No Analog Found

None for code. Not checked: the exact `spec-revise.mjs` invocation (pass `--date`).

## Metadata

**Search scope:** `packages/{core,http,react,devtools}/{src,test}`, `spec/`, `scripts/check-package-install.mjs`, `.changeset/`
**Extraction date:** 2026-11-22
