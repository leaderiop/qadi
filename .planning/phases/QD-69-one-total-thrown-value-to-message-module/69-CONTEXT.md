# Phase 69: One total thrown-value-to-message module - Context

**Gathered:** 2026-11-22
**Status:** Ready for planning

<domain>
## Phase Boundary

Core turns a caught value into a message in six inline copies, and four of them throw when the caught value is hostile
(its `toString` or its `message` getter throws): `JsonHazard.encodeFailed`, the `PortKey` and `PortDerivation` key
refusals, and both `PortWireEncode` catches. `CustomPredicate.renderReason` guards `String()` but not the `message` read.
Each sits inside a function documented as total ("Never throws" for `toJson`/`toJsonRecord`; "a key is refused, never
thrown" for `PortDescription.key`). Probe (2026-11-22, installed `effect`): `Result.try({ try, catch: (e) => String(e) })`
throws the hostile value's error out of `Result.try`; it does not return a failure.

After this phase one exported total function, `thrownMessage`, turns any caught value into a string. It guards both the
`message` getter and `String()` and owns the one placeholder wording. Every copy uses it: the six in core, a seventh core
site found at discuss (`customPredicatePort.defect`'s `Cause.pretty`), and three copies outside core in `@qadi/http`,
`@qadi/react` and `@qadi/devtools`.

ARCH-116. Packages: `@qadi/core` (a **minor** changeset: one new public export and two visible text changes),
`@qadi/http`, `@qadi/react` and `@qadi/devtools` (**patch** changesets). Records:
- ADR-QD-182
- CCR-QD-461
- BEH-QD-681–685
- INV-QD-383 (INV-QD-384 unused unless the planner finds a second invariant; an unused one is named in the CCR row)
- traceability, and a `spec/overview.md` row for the new export (gate 13)

Requirements: THRW-01..05, plus the cross-cutting WX-01..07. **THRW-02's "package-private" and WX-03's "expects no
export" are superseded by the owner's discuss decision D-06 below**: the function is a public core export. The planner
updates THRW-02/THRW-03 wording in REQUIREMENTS.md in the records plan.

</domain>

<decisions>
## Implementation Decisions

### Binding milestone decisions (from `_WAVE13-CONTEXT.md`)
- **D1 (scope):** all eight review candidates become phases. **D2 (branch):** `arch-wave-13`, no merge, no release.
- Strictly serial; reserved numbers only; **never run `node scripts/next-id.mjs`**.

### The function's contract (owner, 2026-11-22: accepted as recommended)
- **D-01 Home:** a new module of its own, `packages/core/src/ThrownMessage.ts`. Not inside `ValueText.ts`: ADR-QD-154
  unified value → text, and this rule is thrown value → text. (Visibility: see D-06; the module is exported from the
  barrel with its own `export * from "./ThrownMessage.ts"` line, in alphabetical order.)
- **D-02:** An `Error` renders as its `message`. Four of the six core sites do this today. `PortWireEncode`'s two catches
  use `String(error)` today, so an `Error` there reads `Error: boom` (name prefix) and will read `boom` after. That is a
  visible text change in wire-encode refusals: named in the CCR row and the changeset, and any pin moves with it.
- **D-03:** The one placeholder is `"a value that could not be described"`: SinkCodec's wording, and the same words
  devtools' `GatesFeed` already uses in its sentences. `"<unrenderable cause>"` (`CustomPredicate.ts:94`,
  `Capture.ts:169`) goes away. The pins move in the same task as the wording: `SinkCodec.test.ts:1118` (already this
  wording), `PortConformance.test.ts:747` and devtools `Capture.test.ts:604`.
- **D-04:** Always a string, by construction. Probe: an `Error` whose `message` getter returns `42` gives `typeof`
  `"number"`, so today's `.message` read can return a non-string under a `string` type. The function's order:
  1. read `message` in a guard; if it is a string, return it;
  2. otherwise (not an `Error`, a non-string `message`, or a throwing getter) return the guarded `String(value)`;
  3. if that throws too, return the placeholder.
  A string input comes back unchanged (CustomPredicate's "a string stays as it is" rule holds through `String`).

### Scope (owner, 2026-11-22: accepted as recommended)
- **D-05:** Core's seventh throw-through is in scope. `customPredicatePort.defect` (`CustomPredicate.ts:239`) is
  `new CustomPredicateError({ name, reason: Cause.pretty(cause) })`. Probe: `Cause.pretty(Cause.die(v))` **throws** when
  `v`'s `message` getter throws. `catchPortDefect` (`PortAccess.ts:144-153`) calls `onDefect(cause)` eagerly inside its
  `Effect.catchCause` handler, so a custom predicate that dies with such a value turns the evaluation into a defect.
  AGENTS.md §4 forbids that ("an authorization decision must never become a defect"). The fix: `Cause.pretty` guarded,
  falling back to `thrownMessage` of the squashed cause. A normal defect still renders with `Cause.pretty` exactly as
  today (the existing pin at `PortConformance.test.ts` "a defect is rendered with Cause.pretty" stays green). RED test
  first, through `customPredicatePort.defect` and through an evaluation whose custom predicate dies with the hostile value.
- **D-06:** `thrownMessage` is a public `@qadi/core` export, used outside core too. ADR-QD-099: "a module another package
  needs is exported from the barrel instead"; precedent `valueText`/`valueLabel` (Phase 41, owner's choice). Costs:
  - a `spec/overview.md` row (gate 13, `scripts/check-api-surface.mjs`);
  - a packed-install probe (gate 14, `scripts/check-package-install.mjs`, which probes every new public name since
    Phase 63);
  - a minor `@qadi/core` changeset.
  The three copies outside core switch to it, each with a RED regression first:
  - `packages/http/src/RemotePorts.ts:39-40` `transport`: `error instanceof Error ? error.message : String(error)`,
    unguarded.
  - `packages/devtools/src/model/Capture.ts:162-171` `renderError`: `String(error)` unguarded when there is no `cause`,
    and `cause.message` unguarded; its inner placeholder is `"<unrenderable cause>"` (moves to D-03's wording). The
    "reads `cause` first" rule stays (the doc above it says why: a port error's `String` is just its tag).
  - `packages/react/src/DeveloperSignals.ts:115-116` `errorLine`: see D-08.
- **D-07 Out of scope: `String(cause)` on an Effect `Cause`** (`DecisionSinkForwarding.ts:102`,
  `EncodeRefusalReport.ts:43`, `SinkReport.ts:79`). Probe: `String(Cause.die(hostile))` returns
  `"Cause([Die([toString threw])])"`; Effect already guards it. The CCR row names them as checked and safe.
- **D-08:** react's `errorLine` keeps `name: message`. The message part comes from `thrownMessage`; the `name` read is
  guarded too. A normal `Error` gives the same text as today, so Phase 71's reporter characterisation sees no change. A
  hostile value no longer escapes the reporter containment at `DeveloperSignals.ts:170`. Soft edge: Phase 71 rewrites
  this file, and serial order covers it.

### Tests, name and records (owner, 2026-11-22: accepted as recommended)
- **D-09:** RED regressions first, on the phase base, one per unguarded site, through that site's own entry, never
  through the private helper:
  - `toJson`/`toJsonRecord` (JsonHazard `encodeFailed`; a getter that throws a hostile value);
  - a derived port's `key` (PortDerivation);
  - `canonicalKey` (PortKey `Unreadable`);
  - `portWire`'s `encodeQuestion` and `encodeAnswer` (PortWireEncode);
  - `customPredicatePort.failure` (the `message` read) and `.defect` (D-05);
  - http's transport failure, a throwing react reporter, and devtools' capture of a broken port (D-06/D-08).
  The hostile value has **both** a throwing `toString` and a throwing `message` getter. The cases where only one
  throws go in the table test. Each RED is seen failing on the phase base before the fix.
- **D-10:** Table test on `thrownMessage` (`packages/core/test/ThrownMessage.test.ts`): an `Error`, a plain value (a
  string, a number, `undefined`, `null`), a throwing `toString`, a throwing `message` getter, both throwing at once, and
  an `Error` whose `message` is a non-string (D-04).
- **D-11:** The public name is `thrownMessage` in `ThrownMessage.ts`.
- **D-12:** New ADR-QD-182 records the rule: one total function from a caught value to text, its order (D-04), its
  placeholder (D-03), and why it is public (D-06). It cites ADR-QD-154 (value → text, the sibling rule) and ADR-QD-099
  (why a shared module is exported). **New INV-QD-383**: every "never throws" function stays total when the caught value
  is hostile, and a died port call always ends as the port's typed error, whatever value it died with (D-05). INV-QD-384
  stays unused unless the planner finds a second invariant; if unused, the CCR row says so.
- **D-13 Changesets:** `@qadi/core` minor (new export `thrownMessage`, the fixed throw-throughs, the placeholder wording,
  `PortWireEncode`'s lost `Error:` prefix); `@qadi/http`, `@qadi/react`, `@qadi/devtools` patch (their fixes, devtools'
  placeholder wording).

### Plan-check revisions (decided autonomously, 2026-11-22, under the owner's "do not ask me; most complete and clean" instruction)
- **D-14:** One guarded cause renderer, public, beside `thrownMessage`. The plan check probed the installed `effect`:
  `Cause.pretty(Cause.die(h))` and `Cause.pretty(Cause.fail(h))` both throw for the hostile value. So `ThrownMessage.ts`
  also exports `causeMessage(cause: Cause.Cause<unknown>): string`: `Cause.pretty(cause)` guarded, falling back to
  `thrownMessage(Cause.squash(cause))` (itself guarded, then the placeholder). It is total. Every place that renders a
  `Cause` to text uses it: `CustomPredicate`'s defect (D-05 becomes a call to it), devtools `TimelineFeed.ts:157`,
  `DiagnosticsFeed.ts:175`, `DiagnosticsStore.ts:271`, `ExplorerSession.ts:159` and `:169`, and `GatesFeed.ts:100-111`,
  whose hand-written guard is replaced by it (one rule, one place). Each unguarded devtools site gets a RED regression
  through its own public entry first. Public because devtools needs it (ADR-QD-099), so it gets its overview row (gate
  13) and is reached by gate 14. INV-QD-384 is now used: "no shipped code renders a `Cause` to text through a call that
  can throw". The Future Requirement bullet for the devtools feeds is dropped: they are in scope. Rejected: deferring
  (leaves the phase goal unmet in packages this phase already edits); a devtools-private copy (two rules for one
  thing).
- **D-15:** Devtools capture keeps the failure's own text. `renderError` reads, in order, the error's `cause`, then its
  `reason`, then its `message` (own string message), and only then falls back to `thrownMessage(error)`; each field read
  is guarded through one small typed field reader, never `as`. A `CustomPredicateError` is therefore captured and
  replayed with its real `reason`, not the literal tag and not the predicate's name. A capture-and-replay RED case for a
  failing custom predicate pins it. Rejected: `_tag` (loses the reason, replays noise); `String(error)` (today's
  behaviour, which captured the predicate name as if it were the reason).
- **D-16:** React `errorLine` names the error once. When the error's own `message` is a string, the line is
  `${name}: ${message}` (D-08 holds for every normal `Error`); otherwise the line is `thrownMessage(error)` with no name
  prefix, so a non-string message never prints a doubled `Error: Error: 42`. The name read stays guarded. A
  non-string-message case pins it.
- **D-17:** Mutation close distinguishes removed mutants from weakened tests. The phase's scorer reports, per file,
  the score and also the absolute survived and no-coverage counts against the base. A score fall with no new survivor
  or no-coverage mutant (the mutants were deleted with `describeThrown`/`renderReason`/the old devtools guard) is
  recorded as "killed mutants removed" and passes; any new survivor or no-coverage mutant still fails the close and is
  closed with a real test. The base record is never edited.

### Claude's Discretion
- How `thrownMessage` is written inside (one `try` per read or a `Result.try` chain), provided D-04's order holds, no
  `as`/`!`/`any`, and the function is plain (no Effect: it is a sync total helper).
- Where each RED test lives (the site's existing test file, or one new file per package), and the exact BEH split across
  BEH-QD-681–685.
- Whether `SinkCodec`'s private `describeThrown` is deleted or becomes a one-line alias. Prefer deletion: one name for
  one rule.
- The mutation base and close comparison follow `_SHARED-CONTEXT.md`'s XC-05 procedure. The touched files are in core
  and possibly the http/react/devtools stryker configs.

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `packages/core/src/ValueText.ts`: `valueText`/`valueLabel`, the sibling total "value → text" rule (ADR-QD-154) and the
  doc-comment shape to mirror (one-line summary, "It never throws.", then why).
- `SinkCodec.ts:361-365` `describeThrown`: the only fully guarded copy today, and the wording D-03 keeps.
- `scriptedPort(attributeResolverPort, () => PortReply.fail(hostile))`: how devtools' `Capture.test.ts:590-606` builds a
  broken port with a hostile cause (PORT_DOUBLE_BUDGET: tests script broken ports, never hand-write them).

### Established Patterns
- Each site wraps the risky call in `Result.try({ try, catch })`. Only the `catch` arm changes (it calls
  `thrownMessage`). The `try` arm and each site's refusal type (`EncodeRefusal.EncodeFailed`, `KeyRefusal.Unreadable`,
  the wire's string refusal, `CustomPredicateError.reason`, `RemotePortFailure.Transport`) stay as they are.
- Public exports: `export * from "./X.ts"` in `packages/core/src/index.ts`, alphabetical (`ThrownMessage.ts` sits
  between `SubjectSet.ts`/`TraceDiff.ts` by name order: check the exact neighbours). Every export needs its
  `spec/overview.md` row (gate 13) and is probed by gate 14.
- Spec registers are revised with `scripts/spec-revise.mjs` (always pass `--date`).

### Integration Points
- Core call sites: `SinkCodec.ts:361-367`, `CustomPredicate.ts:89-95` and `:239`, `JsonHazard.ts:182-183`,
  `PortKey.ts:197-200`, `PortDerivation.ts:113-118`, `PortWireEncode.ts:131` and `:149`.
- Outside core: `packages/http/src/RemotePorts.ts:39-40`, `packages/react/src/DeveloperSignals.ts:115-116` (used at
  `:170`), `packages/devtools/src/model/Capture.ts:162-171` (used at `:143`).
- Pins that move: `packages/core/test/PortConformance.test.ts:743-748`, `packages/devtools/test/model/Capture.test.ts:604`.
  `packages/core/test/SinkCodec.test.ts:1105-1118` already asserts D-03's wording and stays.
- Not targets (checked): devtools `GatesFeed.ts:100-111` (already guarded, `Cause.pretty`-based); devtools
  `Source.ts:245` (name only, `typeof`-guarded); the `String(cause)` sites in D-07.

</code_context>

<specifics>
## Specific Ideas

- Gate after the change: `/usr/bin/grep -rn 'instanceof Error ? ' packages/*/src` finds no `… .message : String(…)` copy
  (scope the negative gate per `_SHARED-CONTEXT.md` verify hygiene: `bash -c`, `/usr/bin/grep -F`, quoted globs).
- The hostile value used throughout: `{ toString() { throw new Error("toString") }, get message() { throw new
  Error("message") } }`, plus an `Error` with `Object.defineProperty(e, "message", { get() { throw … } })` for the
  `instanceof Error` branch.

</specifics>

<deferred>
## Deferred Ideas

None: the discuss step widened the scope (D-05, D-06) rather than deferring. The `String(cause)` sites (D-07) were probed
safe and need no change.

</deferred>
