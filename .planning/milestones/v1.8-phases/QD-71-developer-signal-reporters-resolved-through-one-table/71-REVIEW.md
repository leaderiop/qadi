---
phase: QD-71-developer-signal-reporters-resolved-through-one-table
reviewed: 2026-11-22T22:00:00Z
depth: standard
files_reviewed: 31
files_reviewed_list:
  - packages/react/src/DeveloperSignals.ts
  - packages/react/src/GateWriter.ts
  - packages/react/src/GateRegistry.ts
  - packages/react/src/QadiAtoms.ts
  - packages/react/src/QadiProvider.tsx
  - packages/react/src/HydrationEngine.ts
  - packages/react/test/DeveloperSignalReporters.test.tsx
  - packages/react/test/DeveloperSignals.test.ts
  - packages/react/test/DeveloperSignals.tst.ts
  - packages/react/test/GateRegistry.store.test.ts
  - packages/react/test/support/environment.ts
  - packages/react/test/support/reporterThrew.ts
  - scripts/lib/typescript-server-child.mjs
  - scripts/lib/module-state-scan.mjs
  - scripts/lib/probe-guard-parse.mjs
  - scripts/check-house-style.mjs
  - scripts/check-package-install.mjs
  - AGENTS.md
  - .changeset/react-reporter-option-names.md
  - spec/decisions/184-developer-signal-reporters-are-resolved-through-one-table.md
  - spec/decisions/041-a-mismatch-is-announced.md
  - spec/decisions/052-hydration-is-counted-where-both-ends-can-see-it.md
  - spec/decisions/033-the-packed-artifact-is-the-product.md
  - spec/invariants.md
  - spec/behaviors/09-react.md
  - spec/behaviors/19-hydration.md
  - spec/behaviors/28-devtools-screens.md
  - spec/process/house-rules-evidence.md
  - spec/traceability.md
  - spec/README.md
  - spec/decisions/index.yaml
findings:
  critical: 0
  warning: 1
  info: 4
  total: 5
  necessity: 0
status: issues_found
---

# Phase QD-71: Code Review Report (iteration 3)

**Reviewed:** 2026-11-22T22:00:00Z
**Depth:** standard
**Files Reviewed:** 31
**Status:** issues_found

## Summary

The iteration-2 fixes hold. I exercised the shared module directly: a child that hangs after
`nameServerPids()` is killed at the timeout, the process it named is gone a second later, and the
failure reads `timed out after 1500 ms`. `check-house-style.mjs` and `check-dod-table.mjs` both
pass. A missing API, garbled or empty output, and a non-zero exit each throw into the scan's
`catch` and fail the gate. The probe-guard path in `check-package-install.mjs` kept its behaviour:
the same timeout, the same SIGKILL of named pids only on a signal exit, and a version read that
can no longer throw. CCR-QD-463's row cites the revision in every document's header: ADR-184 1.2,
041 1.7, 052 1.5, 033 1.9, 09-react 3.12, 28-devtools-screens 1.40, 19-hydration 1.29, invariants
1.176, house-rules-evidence 1.5, traceability 1.247, README 1.288.

One real defect remains, in the scan the phase added: an array-destructuring hole crashes it
(WR-01). It fails closed, so the gate is not weakened, but the documented rule is not what the
code does. The other four findings are cleanliness items the owner bar covers.

No `as`, `!`, `any`, `switch` or `Record<string, unknown>` was added to the files the phase wrote.
`writtenOutTable` in `DeveloperSignals.test.ts` uses `Record<SignalTag, …>`, which is a closed key
type, not the forbidden widening.

## Warnings

### WR-01: The module-state scan crashes on a destructuring pattern with a hole

**File:** `scripts/lib/module-state-scan.mjs:54-59`
**Issue:** `namesOf` skips a hole with `element.kind === SyntaxKind.OmittedExpression`. In
typescript 7.0.2, the installed version, a hole in an array binding pattern is a
`BindingElement` (kind 209) with no `name`, not an `OmittedExpression`. I confirmed this on a
scratch project: `var [e, , f] = [1, 2, 3];` and `var { c, d: [e, , f] } = …;` both make
`namesOf(undefined)` throw `TypeError: Cannot read properties of undefined (reading 'kind')`,
and the scan exits 1. The skip branch can never run on this install.

The same file's header, AGENTS.md section 6 and INV-QD-388 all say each name of a destructuring
pattern is counted. A module-scope `let [a, , b] = …` in library source would therefore not be
counted. It would fail the gate with `could not read library source with typescript@7.0.2's
unstable API, which a TypeScript upgrade can move: TypeError: …`. That points the reader at an
upgrade instead of the declaration that caused it. The gate stays closed, so this is a Warning
and not a Blocker. Every other construct I tried (`export let a, b`, `declare let`,
`declare namespace`, `namespace` body, top-level block, loop `let`, `static` block, method and
arrow bodies, rest and default elements, `const`) counted as the documentation says.

**Fix:**
```js
const namesOf = (name) =>
  name.kind === SyntaxKind.Identifier
    ? [name.text]
    : name.elements.flatMap((element) =>
        // a hole is a `BindingElement` with no name (typescript 7), an `OmittedExpression` before
        element.name === undefined || element.kind === SyntaxKind.OmittedExpression
          ? []
          : namesOf(element.name),
      );
```
Then run the scan once on a scratch file holding `let [a, , b] = …` and confirm it counts `a`
and `b`.

## Info

### IN-01: Three test bodies lost their indentation when the environment swap was extracted

**File:** `packages/react/test/DeveloperSignals.test.ts:263-276, 304-332, 336-343`
**Issue:** Wrapping each body in `inEnvironment("production", () => { … })` left the statements
at the wrapper's indent: `expect(` at 264, 305 and 337 sits level with the `inEnvironment(` line
above it, and the closing `});` at 276, 332 and 343 does too. The block at 347-354 is indented
correctly, so the file now disagrees with itself. It is a formatting slip and not a logic error.
**Fix:** Indent the three bodies one level, as lines 347-354 are.

### IN-02: Lines the phase wrote, or reflowed, run far past the codebase's width

**File:** `scripts/lib/typescript-server-child.mjs:83,110`; `scripts/lib/probe-guard-parse.mjs:6-13`;
`scripts/check-package-install.mjs:73-75,80`
**Issue:** The new shared module has a 101-column `@param` line (83) and a 110-column statement
(110). The phase's reflow of `probe-guard-parse.mjs`'s header made lines 7 and 13 135 and 144
columns, against 118-123 before, and left a ragged wrap. `check-package-install.mjs` line 73
(header sentence) is about 120 columns after the phase's reflow, and the new import on line 80
is 112. The other long lines in those two files were already there, but the lines this phase
wrote should not add to them.
**Fix:** Wrap at about 90 columns, e.g.:
```js
const manifest = join(root, "node_modules", "typescript", "package.json");
return JSON.parse(readFileSync(manifest, "utf8")).version;
```
Break the `failureCause` `@param` type over two lines, re-flow both headers, and split the import
over three lines.

### IN-03: The server-pid behaviour is explained three times in `probe-guard-parse.mjs`, with a dangling referent

**File:** `scripts/lib/probe-guard-parse.mjs:11-13,80-82`
**Issue:** The header says the child writes `server pids: <pid>…` so the parent "can kill the
server too, which that module does". "That module" now refers back to a path named five lines
earlier and reads as a dangling pronoun. The inline comment at 80-81 repeats the same reasoning
the header and `typescript-server-child.mjs`'s own header give. `module-state-scan.mjs` states
this once and defers to the shared module, which is the shape to follow.
**Fix:** In the header, end after "writes `server pids: <pid>…` to stderr once the `API` has
started its server (`nameServerPids`)". Drop the inline comment at 80-81, since the call is named
for what it does.

### IN-04: ADR-QD-033 Rev 1.9 overstates what the failure text never contains, and its Status is stale

**File:** `spec/decisions/033-the-packed-artifact-is-the-product.md:8,13,202-207`;
`scripts/lib/typescript-server-child.mjs:87-98`
**Issue:** The amendment says each child's failure "names its cause, the timeout and its bound
or the signal, then the installed TypeScript, and never its command line". Two parts are wrong.
1. **Order.** Both gates print the TypeScript version first and the cause after it:
   `…with typescript@X's unstable API, which a TypeScript upgrade can move: <cause>`.
2. **"Never its command line".** `failureCause` falls back to `error.message` when the child
   printed nothing and was not killed. I ran a child that does `process.exit(3)`, and the cause
   came out as `Command failed: /opt/homebrew/.../node /…/quiet.mjs a b`, which is the full command
   line. For the scan that line would carry every library path as an argument. The scan's own
   child always writes its error to stderr before exiting 1, so the path is rare, but the
   sentence is a claim and the code does not hold it.

   Separately, the Status line still reads "amended 2026-11-21 (every child the gate starts has a
   timeout)" while Rev 1.9 is dated 2026-11-22.
**Fix:** Make the fallback honour the claim, then reword the ADR to match:
```js
.join("\n") || `exited with status ${error.status}`;
```
(`error.status` is `null` only for a signal, which the first element already names.) Reword the
ADR to "names the installed TypeScript and then its cause", and bump the Status text through
`scripts/spec-revise.mjs`.

---

_Reviewed: 2026-11-22T22:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
