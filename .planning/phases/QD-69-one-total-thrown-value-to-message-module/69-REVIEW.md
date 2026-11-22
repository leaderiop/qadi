---
phase: QD-69-one-total-thrown-value-to-message-module
reviewed: 2026-11-22T12:00:00Z
depth: standard
files_reviewed: 38
files_reviewed_list:
  - packages/core/src/ThrownMessage.ts
  - packages/core/src/CustomPredicate.ts
  - packages/core/src/index.ts
  - packages/core/src/JsonHazard.ts
  - packages/core/src/PortDerivation.ts
  - packages/core/src/PortKey.ts
  - packages/core/src/PortWireEncode.ts
  - packages/core/src/SinkCodec.ts
  - packages/devtools/src/model/Capture.ts
  - packages/devtools/src/model/DiagnosticsFeed.ts
  - packages/devtools/src/model/DiagnosticsStore.ts
  - packages/devtools/src/model/ExplorerSession.ts
  - packages/devtools/src/model/GatesFeed.ts
  - packages/devtools/src/model/TimelineFeed.ts
  - packages/http/src/RemotePorts.ts
  - packages/react/src/DeveloperSignals.ts
  - packages/core/test/ThrownMessage.test.ts
  - packages/core/test/Evaluate.test.ts
  - packages/core/test/PortConformance.test.ts
  - packages/core/test/PortDescription.test.ts
  - packages/core/test/PortKey.test.ts
  - packages/core/test/PortWire.test.ts
  - packages/core/test/SinkCodec.test.ts
  - packages/devtools/test/model/Capture.test.ts
  - packages/devtools/test/model/DiagnosticsFeed.test.ts
  - packages/devtools/test/model/DiagnosticsStore.test.ts
  - packages/devtools/test/model/ExplorerSession.test.ts
  - packages/devtools/test/model/GatesFeed.test.ts
  - packages/devtools/test/model/TimelineFeed.test.ts
  - packages/devtools/test/react/QuestionsPanel.feed.characterisation.test.tsx
  - packages/devtools/test/react/QuestionsPanel.thunk.test.tsx
  - packages/http/test/PortRoutes.test.ts
  - packages/react/test/DeveloperSignals.test.ts
  - scripts/check-package-install.mjs
  - .changeset/core-thrown-message.md
  - .changeset/devtools-capture-thrown-message.md
  - .changeset/http-transport-failure-total.md
  - .changeset/react-reporter-line-total.md
findings:
  critical: 0
  warning: 3
  info: 6
  total: 9
status: issues_found
---

# Phase QD-69: Code Review Report

**Reviewed:** 2026-11-22
**Depth:** standard
**Files Reviewed:** 38
**Status:** issues_found

## Summary

Reviewed the phase diff (`19fe6244..HEAD`) in the 38 listed files, with `69-CONTEXT.md` D-01..D-17 as the locked
decisions. No locked decision is broken and I found no BLOCKER.

What I verified:
- `thrownMessage` and `causeMessage` are total. I probed the installed `effect@4.1.2` directly. `Cause.pretty(Cause.die(h))`
  throws for a hostile object, for an `Error` with a throwing `message` getter, a throwing `stack` getter, a throwing `name`,
  and a revoked proxy. `Cause.die(...)` itself does not throw for any of them, so `GatesFeed.stated` calling it outside a
  `try` is safe. `String(cause)` on an Effect `Cause` is guarded by effect (D-07 holds).
- No unguarded copy survives. `/usr/bin/grep` over `packages/*/src` for `instanceof Error`, `Cause.pretty(`, `String(error)` and
  `.message` finds only the exempt sites: `UntrustedDecode.decodeText` and `SimulationForm.parseJson` (both `JSON.parse`
  only), `Source.thrownName` (name only, guarded), and the D-07 `String(cause)` sites.
- `node scripts/check-house-style.mjs` is clean (562 files). No `as`, `!`, `any` or `switch` was introduced, and imports follow
  the namespace and `.ts` rules. The barrel entry sits in alphabetical order.
- The 49 test files I ran (every changed test file except the two `.tsx` golden files) pass: 2003 tests.

The remaining findings are quality items against the "very clean" bar: a misplaced doc comment, a fixture copied twelve
times, stale doc claims, and one silent behaviour change.

## Warnings

### WR-01: Evaluate.test.ts: the new fixtures were inserted between a doc comment and the `describe` it documents

**File:** `packages/core/test/Evaluate.test.ts:3956-3982`
**Issue:** The block comment "The five bare `yield*` calls into `AttributeResolver`, ... never as an unrecoverable defect"
(lines 3956-3965) documents `describe("port defects become typed errors", ...)`. The phase inserted `/** A thrown value that
can be neither stringified ... */ const hostile` and `const hostileError` directly after that comment's `*/`. The comment now
sits on top of `hostile`, and the `describe` it describes starts a few lines lower with only the `hostile` doc attached to
the wrong declaration. A reader or doc tool binds the issue-#100 explanation to a test fixture.
**Fix:** Move the two fixtures above the "five bare `yield*` calls" comment, so the comment is again immediately followed by
`describe("port defects become typed errors"`.

### WR-02: The `hostile` / `hostileError` fixtures are copy-pasted into twelve test files

**File:** `packages/core/test/{ThrownMessage,Evaluate,PortConformance,PortDescription,PortKey,PortWire}.test.ts`,
`packages/devtools/test/model/{Capture,DiagnosticsFeed,DiagnosticsStore,ExplorerSession,TimelineFeed}.test.ts`,
`packages/react/test/DeveloperSignals.test.ts:259-275`
**Issue:** The same two 10-line objects (a `toString` and `message` getter that both throw, and an `Error` whose `message`
getter throws) are declared verbatim in each file, with the same doc comment. That is twelve copies of one definition (core
`SinkEmitReport.test.ts` already carried a thirteenth). This is the duplication this phase exists to remove in `src`, and the
fixtures have to stay identical for "the one hostile value" to mean the same thing everywhere. A change to what "hostile"
means (a proxy case, say) needs twelve edits and will drift. `packages/core/test/helpers.ts` and
`packages/devtools/test/helpers.ts` already exist as shared test modules.
**Fix:** Export `hostile` and `hostileError` once from `packages/core/test/helpers.ts`, once from
`packages/devtools/test/helpers.ts`, and once from `packages/react/test/support/`, and import them. Keep the local
`describedError`, `describedObject` and similar variants in `ThrownMessage.test.ts`, where they are table rows.

### WR-03: Capture now records a `null` cause as the empty string, where it recorded `"null"`; this is not in D-15

**File:** `packages/devtools/src/model/Capture.ts:195-196`
**Issue:** `thrownMessage(fieldOf(error, "cause") ?? fieldOf(error, "reason") ?? error)` uses `??`, which treats `null` as absent.
Before the phase, `Predicate.hasProperty(error, "cause") ? error.cause : undefined` followed by `cause === undefined`
treated only `undefined` as absent, so a resolver that reported `cause: null` was captured as `"null"`. Now it falls through
to `reason`, then to `thrownMessage(error)`, which is `""` for a `Data.TaggedError`. The devtools changeset names this
("a `null` cause reads as no cause"), but D-15 states only the field order, not this behaviour change. The consequence is a
captured `Broke` entry whose replay carries an empty cause where the live run carried `null`, which weakens "an outage replays
as an outage" (INV-QD-043) for the one value (`null`) a resolver is likely to throw by mistake. It is also stated nowhere in
the `renderError` doc comment, which says only that "a failure with none of the three records the empty string".
**Fix:** Either keep `null` as a real cause by testing `=== undefined` in `fieldOf`'s caller:
```ts
const renderError = (error: unknown): string => {
  const cause = fieldOf(error, "cause");
  const text = cause !== undefined ? cause : (fieldOf(error, "reason") ?? error);
  return thrownMessage(text);
};
```
or keep `??`, add a `null` case to the `Capture.test.ts` table so the choice is pinned, and say so in the doc comment.

## Info

### IN-01: Doc comments in three untouched core files still say a custom predicate defect renders "with `Cause.pretty`"

**File:** `packages/core/src/PortDerivation.ts:82`, `packages/core/src/PortDescription.ts:271`, `packages/core/src/PortAccess.ts:454`
**Issue:** `customPredicatePort.defect` now renders through `causeMessage`, which is `Cause.pretty` only when that renders.
`CustomPredicate.ts` was updated for this; these three call sites of the same fact were not. "Not as the squashed value
(D-10-e)" in `PortDescription.ts:271` is also now half true: the fallback is the squashed value.
**Fix:** Replace "`Cause.pretty`" with "`causeMessage`" in each, or add "(`causeMessage`, total)".

### IN-02: `thrownMessage`'s doc comment claims "every place" and is not literally true

**File:** `packages/core/src/ThrownMessage.ts:11-15`, `:38-41`
**Issue:** "Every place that turns a caught value into text reads through this one function" and "Every place that renders a cause
to text reads through it" are overstated. `SimulationForm.parseJson` still does `String(error)`, `UntrustedDecode.decodeText`
reads `error.message` on its own, `Source.thrownName` reads a name, and `SimulationSession.ts:498`, `DecisionSinkForwarding.ts:102`,
`EncodeRefusalReport.ts:43` and `SinkReport.ts:79` render a `Cause` with `String(cause)`. Each is safe for a stated reason
(`JSON.parse` throws only `SyntaxError`; effect guards `Cause`'s own `toString`), and D-07 records that. The doc comment is
the first place a maintainer reads the rule, so it should state its own boundary.
**Fix:** Say "every place that turns a value a caller's code threw into text" and add one sentence naming the exemptions, or
point to ADR-QD-182's list.

### IN-03: GatesFeed: the two `*_FALLBACK` constants are now only compare keys, but still read as user sentences

**File:** `packages/devtools/src/model/GatesFeed.ts:94-96`, `:104-117`
**Issue:** After `stated` switched to `causeMessage`, the fallback strings are used only as the `key` when reading `name`/`message`
of the thrown value throws, so they are "never shown" (the new doc comment says so, correctly). Two differently-worded
sentences for a value that is never displayed, and compared only within one source, is leftover wording. It also invites a
future reader to think they are user text.
**Fix:** One `const UNREADABLE_KEY = "unreadable";` (or the placeholder string) shared by the two callers, dropping the
`fallback` parameter of `stated`.

### IN-04: React `namedLine` repeats `thrownMessage`'s `instanceof Error` / string-`message` guard, and uses `thrownMessage` as a bare `String`

**File:** `packages/react/src/DeveloperSignals.ts:117-129`
**Issue:** `namedLine` re-implements the first half of `thrownMessage` (guarded `instanceof`, read `message`, `typeof === "string"`)
only to add a `name:` prefix. `thrownMessage(error.name)` is then a roundabout way to turn the name into a string, and the
reader has to know that `thrownMessage` of a string is the string. This is a deliberate D-16 shape and it is correct; it is
the one place the "one rule" is restated. If more callers ever want `name: message`, this belongs in core.
**Fix:** Acceptable as is for now. If kept, a one-line comment on `thrownMessage(error.name)` saying it is the guarded
string conversion would remove the question.

### IN-05: Two tests that cannot fail for the reason their title names

**File:** `packages/core/test/PortDescription.test.ts:699-713`, `packages/core/test/ThrownMessage.test.ts:100-101`
**Issue:**
- "refuses a question and an answer of another shape with a sentence" asserts only `failure.length > 0`. Any non-empty string,
  including `"undefined"`, passes, so it does not pin "a sentence". It is also unrelated to this phase (the `describe`
  "a port wire built from a spec decodes what it is given" and its first test are new decode coverage riding along with the
  encode-throwing tests).
- The `causeRows` entry "a defect that renders is its Cause.pretty text" computes its expected value with `Cause.pretty`
  itself, so it pins only that `causeMessage` delegates, not what the text is. That is a legitimate check, but the title reads
  as a text pin.
**Fix:** Assert the actual refusal text in the first (or drop the test and its `describe` from this phase), and keep the
second as is or retitle it "delegates to Cause.pretty when it renders".

### IN-06: `transport`'s new doc comment is a single 150-column line

**File:** `packages/http/src/RemotePorts.ts:39`
**Issue:** AGENTS.md §17 states the codebase hand-wraps at about ninety columns. The one-line `/** ... */` on `transport` is about
150, and `GatesFeed.ts:94` and the `SinkCodec.ts` `encodeFailed` line are similar. Cosmetic, and `oxfmt` is deliberately not a gate.
**Fix:** Wrap the comment over two or three lines in the house shape (summary line, then the why).

---

_Reviewed: 2026-11-22T12:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
