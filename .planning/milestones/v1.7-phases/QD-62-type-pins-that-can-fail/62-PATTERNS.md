# Phase 62: Type pins that can fail - Pattern Map

**Mapped:** 2026-11-20
**Files analyzed:** 17 new/modified (plus the 5 comment rewrites)
**Analogs found:** 16 / 17 (all analog paths verified git-tracked; none is a gitignored mirror)

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `tsconfig.tstyche.json` (new) | config | build-time | `tsconfig.test.json` + plugin entry `tsconfig.base.json:60-74` | exact |
| `tstyche.json` (modify) | config | build-time | itself (`{ "target": "6.0.3", "tsconfig": "tsconfig.test.json" }`) | exact |
| `packages/core/test/<Characterisation>.tst.ts` (new) | test | type-level | `packages/core/test/PortAccess.tst.ts`, `Decision.tst.ts` (constructable form) | role-match |
| `scripts/run-tstyche.mjs` (new) | script | batch (spawn) | `scripts/run-check.mjs` | role-match |
| `package.json` `test:tstyche` (modify) | config | n/a | `package.json:25` | exact |
| `scripts/check-house-style.mjs`: `NOT_CALLABLE_PIN_BUDGET` + `[not-callable-pin]` | gate rule | batch/file-walk | `UNTRUSTED_DECODE_BUDGET` (:635) + `[no-numbering-placeholder]` own walk (~:2091) | exact |
| same: `[not-callable-pin-table]` | gate rule | file-read | `[untrusted-decode-table]` (:1596-1606) | exact |
| same: `[not-callable-control]` | gate rule | transform | none for the parse; strip idea from `strip()` (:946) | partial |
| same: `[tstyche-plugin-drift]` | gate rule | file-read | none (no JSONC parser exists) | no analog |
| `AGENTS.md` §6 paragraph + table (modify) | docs | n/a | §7a paragraph + table (AGENTS.md ~:535-556) | exact |
| `spec/process/definitions-of-done.md` row 6 and :104-118 (modify) | docs | n/a | rows 1-8 (:25-32) | exact |
| `spec/decisions/175-*.md` (new) + `index.yaml` + traceability row | spec | n/a | `spec/decisions/123-a-metric-is-declared-once.md` | exact |
| `spec/decisions/037-*.md` heading + `spec-revise` | spec | n/a | itself | exact |
| `spec/README.md` CCR-QD-453 row | spec | n/a | CCR-QD-452 row (~:389) | exact |
| `packages/core/test/DecisionLog.tst.ts:30` (rewrite) | test | type-level | `DecisionStream.tst.ts:49-56`, `Qadi.tst.ts:171-180` | exact |
| 11 control additions (audit, core, http `.tst.ts`) | test | type-level | same-file existing positives, e.g. `Decision.tst.ts:27` | exact |
| 5 comment rewrites (D-04) | test | n/a | n/a | n/a |

## Pattern Assignments

### `tsconfig.tstyche.json` (config)

**Analog:** `tsconfig.test.json` (extends chain `tsconfig.test.json` -> `tsconfig.react-base.json` -> `tsconfig.base.json`; `include` is inherited unchanged, so do not restate it).

**Header-comment style** (`tsconfig.test.json:1-11`): JSONC with a leading `//` block explaining why it extends what it extends.

**Plugin entry to restate whole** (`tsconfig.base.json:60-74`); `extends` replaces `plugins` wholesale (research P6), so copy it verbatim and change only `floatingEffect`:
```jsonc
"plugins": [
  {
    "name": "@effect/language-service",
    "diagnostics": true,
    "namespaceImportPackages": ["effect", "@effect/*", "@qadi/*", "@effect-cucumber/*"],
    "includeSuggestionsInTsc": false,
    "diagnosticSeverity": { "unstableApiUsage": "off", "floatingEffect": "off" },
    "ignoreEffectWarningsInTscExitCode": true,
    "ignoreEffectErrorsInTscExitCode": false
  }
]
```
Shape: `{ "extends": "./tsconfig.test.json", "compilerOptions": { "plugins": [ ... ] } }`. Then `tstyche.json` -> `"tsconfig": "tsconfig.tstyche.json"`. The drift rule keeps the copy honest.

---

### Characterisation `.tst.ts` (test, type-level)

**Location:** must be under `packages/*/test/**` (research P1: elsewhere runs under "baseline" and proves nothing). Suggest `packages/core/test/FloatingEffectPins.tst.ts`.

**Analog:** `packages/core/test/PortAccess.tst.ts` for header/imports; `packages/core/test/Decision.tst.ts:25-48` for the constructable form.

**Imports + header style** (`PortAccess.tst.ts:1-9`): a `/** ... */` block (one-line summary, then why), then:
```typescript
import { expect, test } from "tstyche";
```
Add `import type * as Effect from "effect/Effect"; import type * as Stream from "effect/Stream";` (namespace type imports, `.ts` extensions for relatives, per AGENTS.md section 1). Header must carry the tool versions (tstyche 7.2.5 / TS 6.0.3 / language-service 0.87.5), the repro, and what to do when an upgrade flips the rule-on half (D-01).

**Core pattern** (research Pattern 1, probe-verified): `describe` is imported from tstyche; the first `describe` title carries a unique `--skip` token; `// @tstyche fixme` precedes each config-half negative; `// @effect-diagnostics effect/floatingEffect:error` splits the halves (the `-next-line` form does not work).
```typescript
declare const f: (n: number) => Effect.Effect<number>;
declare const s: (n: number) => Stream.Stream<number>;
declare const C: new (n: number) => Effect.Effect<number>;
declare const p: (n: number) => number;   // plain-return control

describe("<unique token> (floatingEffect off)", () => {
  test("...", () => {
    expect(f).type.toBeCallableWith(1);
    // @tstyche fixme
    expect(f).type.not.toBeCallableWith(1);
    // ... s, C (toBeConstructableWith) likewise
  });
});
// @effect-diagnostics effect/floatingEffect:error
describe("floatingEffect on", () => {
  test("a negative pin on valid arguments passes: the known-wrong control", () => {
    expect(f).type.not.toBeCallableWith(1);
  });
});
```
Check `describe` against existing usage before relying on it (`/usr/bin/grep -l "describe" packages/*/test/*.tst.ts`); tstyche exports it. No `as`, `!`, `any`, `switch` (WX-04; `collect()` skips `.tst.ts`, review by hand). The file's budget row says it is the documented exception to D-05 and is excluded from the flip sweep.

---

### `scripts/run-tstyche.mjs` (script, batch)

**Analog:** `scripts/run-check.mjs`.

**Header style** (`run-check.mjs:1-30`): shebang, `/** ... */` doc block, one-line summary then the why (gate 11 counts commands, so two passes live in one script).

**Imports** (`run-check.mjs:31-32`):
```javascript
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
```
**Spawn pattern**: `run-check.mjs` uses `spawnSync(step, { shell: true, ... })`; do NOT copy `shell: true`. Use the research Pattern 2: `spawnSync(process.execPath, [TSTYCHE_BIN, ...args], { stdio: "inherit" })`, run both passes even if the first fails, `process.exit(main === 0 && ruleOn === 0 ? 0 : 1)`. Pass 2 args: `["--tsconfig", "tsconfig.test.json", "--skip", RULE_ON_SKIP]`. Resolve root via `new URL("..", import.meta.url)` as at `run-check.mjs:49`. Fail loudly if the skip token is absent from the characterisation file (fail-closed). `package.json:25` becomes `"test:tstyche": "node scripts/run-tstyche.mjs"`. Plan summary must surface that this adds a script CONTEXT did not name (research A1).

---

### `scripts/check-house-style.mjs`: `NOT_CALLABLE_PIN_BUDGET`

**Analog:** `UNTRUSTED_DECODE_BUDGET` (:635-648) for the declaration; `[no-numbering-placeholder]` (~:2091-2132) for an own walk that bypasses `collect()`.

**Declaration pattern** (:630-648): JSDoc with `@type`, one comment line of reason per row, keys are repo-relative paths:
```javascript
/** @type {Readonly<Record<string, { callable: number, constructable: number }>>} */
const NOT_CALLABLE_PIN_BUDGET = {
  // reason
  "packages/core/test/Decision.tst.ts": { callable: 0, constructable: 7 },
  ...
};
```
Expected: 80 callable in 26 files, `Decision.tst.ts` constructable 7, plus the characterisation row.

**Own-walk pattern** (:2091-2132, shape): braced block `{ ... }`, local `walk` with try/catch on `readdirSync`, `entry === "node_modules"` skip, `relative(ROOT, file)`, `failures += 1; console.error(\`${rel}  [rule] ...\`)`. Replace the extension filter with research's `TEST_FILE` regexes (tstyche default `testFileMatch`), also skip entries starting with `.`, and fail when zero files are found. Also fail if `tstyche.json` declares its own `testFileMatch`.

**Counting:** whole-file blanking of comments/strings/templates keeping newlines (new ~20-line `blank(text)`; `strip()` at :946 is per-line and cannot see a split pin), then `/\.\s*not\s*\.\s*toBeCallableWith\b/g` and `.../toBeConstructableWith\b/g`. Four comment lines mention the token in prose today, so blanking is required. Compare to the budget in both directions (missing row, extra row, count differs).

### `[not-callable-pin-table]`

**Analog:** `[untrusted-decode-table]` (:1596-1606), copy verbatim in structure:
```javascript
const agents = readFileSync(join(ROOT, "AGENTS.md"), "utf8").replace(/\r\n/g, "\n").split("\n");
const header = agents.findIndex((l) => /^\|\s*Location\s*\|\s*Count\s*\|\s*Why\s*\|/.test(l));
for (let i = header + 2; i < agents.length && agents[i].startsWith("|"); i += 1) {
  const m = /^\|\s*`([^`]+)`\s*\|\s*(\d+)\s*\|/.exec(agents[i]);
  if (m !== null) listed.set(m[1], Number(m[2]));
}
```
Differences: header must be distinct (`^\|\s*Type-test file\s*\|`, columns `Type-test file | Callable pins | Constructable pins | Why`), because the `Location | Count | Why` regex already matches section 7a's table. Row regex captures two counts. The three error branches (header missing, listed-but-mismatched, budget-but-unlisted) are copied as-is with the new tag.

### `[not-callable-control]`, `[tstyche-plugin-drift]`

No in-repo analog for the forward parse (research Pattern 3: parse `expect`, optional `<...>`, `(...)`, then `.type.[not.]toBeX(`; match negatives to positives by form + subject kind + whitespace-collapsed text) or for JSONC (blank `//` and `/* */` outside strings, drop trailing commas, `JSON.parse`; follow single-string `extends` to the nearest `compilerOptions.plugins`; `isDeepStrictEqual` after deleting `diagnosticSeverity.floatingEffect`; also require `floatingEffect === "off"`, `tstyche.json` names the child, child extends `./tsconfig.test.json`). Use the research prototypes. Error format follows the file's `${rel}  [tag] message` convention.

---

### `AGENTS.md` §6 paragraph + table

**Analog:** §7a paragraph and table (AGENTS.md ~:535-556): bold lead sentence ("**The rule is enforced, not remembered**: ..."), the table, then "Enforced by `X_BUDGET` in `scripts/check-house-style.mjs`, checked in both directions ... (`[tag]`)" closing paragraph. Place at the end of §6 after the `METRIC_ID_LITERAL_BUDGET` paragraph; test-scope like `PORT_DOUBLE_BUDGET`; cite ADR-QD-175 and CCR-QD-453 (write the CCR row first, verify-traceability check 7). Per gate 11, every sentence saying "step 6"/"gate 6" must name `test:tstyche` or `run-tstyche.mjs` in the same paragraph. Name both forms of D-06 (`Params<F>`, `Parameters<typeof f>[i]` + `not.toBeAssignableTo`), say the control checker is only a floor, and note the last-overload caveat only if a pinned subject is overloaded (research A3, unverified).

---

### `spec/process/definitions-of-done.md`

**Analog:** the existing row 6 at :30, `| 6 | \`tstyche\` | Type-level tests pass (\`*.tst.ts\`) |`; change command cell to `` `node scripts/run-tstyche.mjs` `` and the gate cell to mention both floatingEffect settings. The step-6 paragraph (:104-118) must now name `test:tstyche`/`run-tstyche.mjs`. ADR-037 heading `### \`tstyche\`, gate 6` gets `(\`test:tstyche\`)`. Verify with `node scripts/check-dod-table.mjs < /dev/null` (expect `25 step(s) match`). Bump each doc with `node scripts/spec-revise.mjs`.

---

### `spec/decisions/175-*.md` (ADR-QD-175)

**Analog:** `spec/decisions/123-a-metric-is-declared-once.md`.

**Document Control block** (:3-13): blockquote table with Document ID `QADI-ADR-175` (must equal the file number, gate 10), Revision 1.0, Status `Accepted — amends ADR-QD-037`, Classification `Architecture Decision Record`, Change History `1.0 (2026-11-20): Initial (ARCH-109, CCR-QD-453)`. Then `---`, `## Context`, `## Decision`, `## Consequences`. Also add the `index.yaml` entry (format at `index.yaml:545-549`) and an `ADR-QD-175` row in `spec/traceability.md` (copy the ADR-QD-174 row near :367).

### `spec/README.md` CCR-QD-453 row

**Analog:** CCR-QD-452 row (~:389): `| CCR-QD-453 | 2026-11-... | <files with Revs> | ARCH-109. **<bold lead>.** ... Ids used: ADR-QD-175. Unused: BEH-QD-646-650, INV-QD-369-370. |`. Never run `node scripts/next-id.mjs`.

---

### `packages/core/test/DecisionLog.tst.ts:30` (rewrite)

**Analog:** `DecisionStream.tst.ts:49-56` and `Qadi.tst.ts:171-180`.

**Excerpt** (`DecisionStream.tst.ts:49-56`):
```typescript
// Through the parameter type, not `toBeCallableWith`: ...
type Options = Parameters<typeof encodeDecisionStream>[1];
expect({ encodeRecord }).type.toBeAssignableTo<Options>();
expect<{ readonly after: string }>().type.not.toBeAssignableTo<Options>();
```
Verified rewrite (research P8), replacing line 30; the file already imports `Effect` and `makeDecisionLog`:
```typescript
type Options = Parameters<typeof makeDecisionLog>[0];
expect<{ readonly environment: string }>().type.toBeAssignableTo<Options>();   // control
expect<{ readonly capacity: number }>().type.not.toBeAssignableTo<Options>();  // the pin
```
It leaves the budget. Real-source RED: transient `environment?: string` in `packages/core/src/DecisionLog.ts:189`, then `git checkout` it back.

### The 11 controls

**Analog:** the in-file positive next to each negative, e.g. `Decision.tst.ts:27` (`expect(Allow).type.toBeConstructableWith({ ...stamp, trace: allowing })`) paired with its negatives at :31-32. Each control is the valid twin of that pin's call, same subject text and same form (the checker compares subject text, form, and kind). Targets: `AuditPortReply.tst.ts:31`, `AuditWriteOutcome.tst.ts:18`, `Explanation.tst.ts:35,46`, `Matcher.tst.ts:33,42`, `Qadi.tst.ts:115`, `WalkEnvironment.tst.ts:40,41`, `RequirePermission.tst.ts:63`. All ten non-DecisionLog subjects return plain values, so controls pass in the rule-on pass.

### D-04 comment rewrites

Files and spans to reword (say floatingEffect is off under tstyche's own tsconfig; the form stays because it states the reason through the parameter type): `packages/core/test/DecisionCache.tst.ts:9-13`, `PortAccess.tst.ts:31-36` (the `Params<F>` doc, lines ~31-37 above), `packages/devtools/test/model/DiagnosticsStore.tst.ts:21-26` (note: under `test/model/`, not `test/`), `Qadi.tst.ts:171-174`, `DecisionStream.tst.ts:49-52`. Re-grep with `floating|vacuous|language service|synthes` (the plain `floating|vacuous` misses DiagnosticsStore). Leave `Facade.tst.ts:9-10`, `Qadi.tst.ts:95-96`, `PortSpan.tst.ts:5`.

## Shared Patterns

### Budget in both directions, table checked
**Source:** `scripts/check-house-style.mjs:635-648` and `:1596-1606`. **Apply to:** `NOT_CALLABLE_PIN_BUDGET` and its table rule. Exact counts; a row cannot name the wrong file or count.

### Own walk, never `collect()`
**Source:** `scripts/check-house-style.mjs:2091-2132`. **Apply to:** `[not-callable-pin]`, `[not-callable-control]`. `collect()` skips `.tst.ts` (:871, :889); fail on zero files.

### Gate 11 naming rule
**Source:** `scripts/check-dod-table.mjs` (`expand`, identifiers). **Apply to:** AGENTS.md, ADR-175, DoD paragraph, ADR-037. "step 6"/"gate 6" prose names `test:tstyche` or `run-tstyche.mjs`; the CCR row is exempt.

### Scratch files stay under `packages/*/test/**`
**Apply to:** RED demonstrations and the flip sweep (research P1). Confirm the `uses TypeScript 6.0.3 with ./tsconfig...` line, not `baseline`.

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `[tstyche-plugin-drift]` JSONC reader | gate rule | file-read | No script parses JSONC today; use research's ~15-line blanker + `JSON.parse` |
| `[not-callable-control]` expect-chain parser | gate rule | transform | Only per-line `strip()` exists (:946); a whole-file `blank()` and forward parse are new |
| Flip-sweep reporter | one-off | n/a | Scratch, not committed (research Code Examples) |

## Metadata

**Analog search scope:** `scripts/`, root tsconfigs, `packages/*/test`, `spec/decisions`, `spec/process`, AGENTS.md.
**Files scanned:** about 15 read or excerpted; all named analogs confirmed tracked (`git ls-files` on the three spot-checked paths; the rest are long-standing tracked sources).
**Pattern extraction date:** 2026-11-20
