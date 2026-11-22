# Phase 63: The packed-install gate probes every new public name - Pattern Map

**Mapped:** 2026-11-20
**Files analyzed:** 6 (1 script, 5 docs/records)
**Analogs found:** 6 / 6 (all tracked; verified with `git ls-files`)

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `scripts/check-package-install.mjs` (guard, in check 4 region) | gate script / utility | batch (child-process + AST read) | same file: check 3 `importProbe`/`probeReport` + `execFileSync` blocks (lines 274-290, 612-630) | exact (same file) |
| `scripts/check-package-install.mjs` (`FIXTURE` probes + imports) | test (consumer fixture) | request-response / event-driven (feeds) | same file: `makeTimelineFeed` probe (lines 502-513) | exact |
| `spec/decisions/033-the-packed-artifact-is-the-product.md` (amendment) | spec record | n/a | `spec/decisions/037-...md` lines 236-247 (Amendment 2026-11-20, CCR-QD-453) | exact |
| `spec/README.md` (CCR-QD-454 row) | spec register | n/a | CCR-QD-453 row, line 390 | exact |
| `spec/traceability.md` | spec register | n/a | ADR-QD-037 row line 273 (amendment chain) | exact |
| `AGENTS.md` section 16 | docs | n/a | existing first paragraph, lines 881-884 | exact |
| `spec/process/definitions-of-done.md` step-14 paragraph | docs | n/a | paragraph at line 174-188 | exact |

## Pattern Assignments

### `scripts/check-package-install.mjs` — guard (gate script, batch)

**Analog:** same file. Commit order: the guard lands first, alone, RED on the base (expect `makeDiagnosticsFeed, makeGatesFeed`).

**Failure collection pattern** (lines 67-68, 633-640):
```js
const failures = [];
const fail = (message) => failures.push(message);
...
if (failures.length > 0) {
  for (const failure of failures) console.error(`  ${failure}`);
  console.error(`\npackage-install: ${failures.length} failure(s) across ${installed.length} package(s).`);
  console.error(`Sandbox kept in .package-check/ for inspection.`);
  process.exit(1);
}
```

**Child-process-in-sandbox pattern** (lines 611-629; fixed argv array, no shell, stdio pipe, errors routed to `fail`):
```js
if (failures.length === 0) {
  try {
    execFileSync("npx", ["tsc", "-p", join(SANDBOX, "tsconfig.json")], { cwd: ROOT, encoding: "utf8", stdio: "pipe" });
  } catch (error) {
    fail(`the consumer does not type-check against the shipped .d.ts:\n${error.stdout ?? error.message}`);
  }
}
```

**Placement:** after `writeFileSync(join(SANDBOX, "tsconfig.json"), ...)` (ends line ~605) and before the `npx tsc` block (line 611). Wrap in `if (failures.length === 0)`.

**Core pattern to copy:** the guard in 63-RESEARCH.md "Code Examples > The guard" (probed GREEN/RED). Shape: child `node --input-type=module -e` reading `Object.keys(await import("@qadi/devtools"))` filtered by `/^make\w*Feed$/`; `new API({cwd: SANDBOX})` from `typescript/unstable/sync`; `isCallExpression`/`isIdentifier` from `typescript/unstable/ast/is`; collect callee identifier text; `fail("the consumer fixture never calls X, Y: ...")`. Add two imports at the top beside lines 61-62. Per D-SC4, also require the type-only list (`DecisionCacheShape`) as a type reference (`isTypeReferenceNode` + identifier) in the same walk; all API use inside try/catch routed to `fail()` (D-A1).

**Header comment:** update the "Six checks" list entry for check 4 (lines 24-25) with one paragraph; do not cite ARCH-/CCR-/D-/phase ids in the script (WX-07).

---

### `scripts/check-package-install.mjs` — `FIXTURE` probes (consumer test, feeds)

**Analog:** the `makeTimelineFeed` probe, lines 502-513.

**Imports pattern** (line 425; `verbatimModuleSyntax` so type-only names take inline `type`):
```ts
import { emptyTimeline, ingest, makeTimelineFeed, sourceFromRecords, verdictOf } from "@qadi/devtools";
```
Becomes a multi-line alphabetical list adding `type DiagnosticsOptions, type GateInstanceLike, type GateRegistryLike, makeDiagnosticsFeed, makeGatesFeed`; `@qadi/core` list gains `AttributeResolver, DecisionCache, decisionCacheLayer, type DecisionCacheShape, gte, hasAttribute`.

**Core pattern** (lines 502-513, bounded yield, no clock, scoped):
```ts
const fed = await Effect.runPromise(
  Effect.scoped(
    Effect.gen(function* () {
      const feed = yield* makeTimelineFeed({ source: sourceFromRecords([stored]) });
      for (let i = 0; i < 20; i++) yield* Effect.yieldNow;
      return { status: feed.status.getSnapshot()._tag, entries: feed.timeline.getSnapshot().entries.length };
    }),
  ),
);
expect("devtools feed", fed.status, "Reading");
```

**Assertion helper** (lines 461-465): `expect(label, actual, wanted)` throws `consumer: <label> was X, wanted Y`. Use it for every probe assertion.

**Escaping:** `FIXTURE` is a JS template literal (see `\`consumer: \${label}...\`` at line 463). Backtick -> `\``, `${` -> `\${`; the RESEARCH probes avoid `${` entirely.

**Probes:** copy verbatim from 63-RESEARCH.md "The probes" (gates feed over one-instance registry + no-registry contrast; diagnostics `Live` with 200-turn cap; host cache wrapping `decisionCacheLayer()` with `miss,hit`, 1 resolve; the `@ts-expect-error` on the line holding `Effect.map(compute, ...)`, TS2345). Insert after `expect("devtools feed entries", fed.entries, 1);` (line 513). Constraints: no `as`, `!`, `any`, `Date`, `performance`.

---

### `spec/decisions/033-the-packed-artifact-is-the-product.md` (amendment)

**Analog:** `spec/decisions/037-circular-imports-and-type-level-tests-are-gates.md` lines 236-247.

**Shape to copy:**
```markdown
## Amendment (2026-11-20, ADR-QD-175, CCR-QD-453)

<one paragraph: what changed, which script, which budget/gate, link to the amending ADR>

---

_Related: ..._
```
For 033: `## Amendment (2026-11-20, ARCH-110, CCR-QD-454)` inserted after the Consequences section (ends line ~141) and before the trailing `---` / `_Related:_` at lines 142-144. Content: fixture calls every `make*Feed` the packed devtools root exports (set read from the artifact, call decided by the compiler's parse); `DecisionCacheShape` held by the compiler against the packed `.d.ts`; the stated limit (removing the whole type-only probe is not detected by derivation; D-SC4 adds an explicit type-only list); ADR-QD-176 unused. Bump with `node scripts/spec-revise.mjs <file> "<reason>" --date 2026-11-20` (always pass `--date`; 033 is Rev 1.1 now). No `spec/decisions/index.yaml` change.

---

### `spec/README.md` — CCR-QD-454 row

**Analog:** the CCR-QD-453 row, line 390 (append directly after it). Row format:
```
| CCR-QD-453 | 2026-11-20 | `<file>` Rev N (...), ..., `scripts/check-house-style.mjs` (...) | ARCH-109. **A negative type pin can fail.** <prose> ... Ids used: ... Unused: ... |
```
For 454: files cell lists ADR-033 Rev 1.2 (amendment), DoD Rev 1.19, traceability Rev 1.225, README Rev 1.262, `AGENTS.md` (section 16), `scripts/check-package-install.mjs` (gate 14's guard and consumer fixture; keep the script name beside "gate 14" for `check-dod-table.mjs`), no changeset. Prose ends: "Ids used: none. Unused: ADR-QD-176, BEH-QD-651-655, INV-QD-371-372." Re-read current revisions before writing (README 1.261, traceability 1.224, DoD 1.18 today). The Change History at line 13 is prepended via `spec-revise` (entry format `1.262 (2026-11-20): CCR-QD-454 registered (ARCH-110)`). CCR must be registered in the same change that cites it (verify-traceability).

---

### `spec/traceability.md`

**Analog:** ADR-QD-037 row, line 273, which chains amendments with `; amendment (CCR-QD-453): ...`. Current ADR-QD-033 row (line 269):
```
| [ADR-QD-033](decisions/033-the-packed-artifact-is-the-product.md) | The packed artifact is the product, so a gate installs it | INV-QD-006, INV-QD-026, INV-QD-027 |
```
Append to the title cell: `; amendment (CCR-QD-454): the consumer calls every make*Feed the packed devtools root exports and compiles DecisionCacheShape's host-cache form (ARCH-110)`. Prepend a Change History entry (line 13) via `spec-revise`: "ADR-QD-033 amended; no BEH or INV (ARCH-110, CCR-QD-454)". No file-mapping row exists for the script, so nothing else maps.

---

### `AGENTS.md` section 16 (one sentence)

**Analog/anchor** (lines 881-884):
```
`scripts/check-package-install.mjs` is merge gate 14: it packs each public package,
installs it into a sandbox and makes a TypeScript consumer authorize through the
published `exports` map. Two rules come out of it, ...
```
Insert one sentence after "published `exports` map.": its consumer also calls every `make*Feed` the packed `@qadi/devtools` root exports, so a new feed left unprobed fails. Do not use a bare "gate N". AGENTS.md has no revision header.

---

### `spec/process/definitions-of-done.md` (step-14 paragraph)

**Analog/anchor:** the paragraph beginning line 174 ("`node scripts/check-package-install.mjs`, step 14, is new in CCR-QD-038 ..."), ending with "...See ADR-QD-033." (line ~188). Append one sentence there (it already names the script beside "step 14", satisfying `check-dod-table.mjs`), then `spec-revise ... --date 2026-11-20`. Table row 14 and `package.json`'s `check` are untouched.

## Shared Patterns

### Prove the new check can fail (Phase 62 house rule, WX-06)
**Source:** 63-RESEARCH.md "Removed-probe proof". Scratch copies live under gitignored `.scratch/<own-subdir>/` (keeps the ancestor `"type": "module"` package.json) with `ROOT`/`SANDBOX` overridden by sed; never committed. Record in SUMMARY: base+guard RED naming the two names; delete gates probe, diagnostics probe, `@ts-expect-error` line, and a `.d.ts` revert each fail; limit: deleting the whole host-cache probe is held only by the D-SC4 type-reference list.

### Records discipline
Reserved ids only; never run `scripts/next-id.mjs`; `spec-revise.mjs` always with `--date`; no changeset; no BEH/INV; any "gate 14" in prose sits beside `scripts/check-package-install.mjs`.

### Run and verify
`node scripts/check-package-install.mjs` (~7.5 s; never in parallel, shared `.package-check/`); end of phase `pnpm check:pr < /dev/null`.

## No Analog Found

None for files. One sub-element has no in-repo precedent: the AST walk via `typescript/unstable/sync` (nothing else in `scripts/` parses TS; the closest is `blankCode` in `scripts/check-house-style.mjs:736`, a regex-blanking lexer, the RESEARCH fallback if A1 were rejected). Use the RESEARCH-probed code.

## Metadata

**Analog search scope:** `scripts/check-package-install.mjs`, `spec/decisions/`, `spec/README.md`, `spec/traceability.md`, `AGENTS.md`, `spec/process/`
**Pattern extraction date:** 2026-11-20
