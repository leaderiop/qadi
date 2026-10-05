#!/usr/bin/env node
/**
 * Enforces the AGENTS.md rules that the linter cannot express.
 *
 * oxlint has no `no-restricted-syntax`, so the bans on async/await, raw
 * Promises, barrel `effect` imports and type assertions are checked here.
 * Deliberately dumb and deterministic: a regex sweep over production source.
 *
 * Scope: `no-type-assertion` and `no-non-null-assertion` run over
 * `packages/<pkg>/src` AND `packages/<pkg>/test` — AGENTS.md §6 states no test
 * exemption, and a read-only audit found the previous src-only scope was
 * silently hiding exactly the class of violation it names (54 casts, 21
 * non-null assertions, none of them written down as an EXEMPTIONS entry or
 * anywhere else — CCR-QD-105). Every other rule stays src-only, and that is a
 * considered split, not an oversight: `no-async`/`no-await`/`no-raw-promise`
 * are legitimate vitest/Testing-Library idiom in a test body (`await
 * waitFor(...)`, a timer-driven `it("...", async () => {...})`) that AGENTS.md
 * §6 never meant to reach, and `no-nondeterministic-time`'s regex cannot tell
 * `new Date()` (an ambient clock read) from `new Date("2026-01-01")` (a fixed
 * fixture value) — extending it as-is would fail on ordinary test fixtures,
 * not find a real violation. `no-extensionless-relative-import` has the same
 * problem in reverse: it fails `import manifest from "../package.json"`,
 * a real, correct import with no `.ts` extension to add. `SWITCH_BUDGET`,
 * `HAS_CUSTOM_BUDGET`, `UNTRACED_BUDGET`, `ANY_BUDGET` and `SCHEMA_ERROR_BUDGET`
 * below apply to every `src`-scope file, `features/step-definitions` included
 * (see "Scope beyond `packages`" below) — a `test`-scope file
 * (`packages/<pkg>/test`) never contributes to any of the five, since
 * `testScope`-only rules apply there and a vitest body's
 * `switch`/`hasCustom`/`Effect.fnUntraced`/`any`/`Schema.TaggedError` usage, if
 * one ever appeared, is not what any of the budgets track.
 * `DECISION_READ_BUDGET` is narrower still: `packages/*\/src` only, since a raw
 * `AsyncResult` read is a library-surface concern and a test reads one on
 * purpose to pin what `outcomeOf` makes of it. The seventh,
 * `PORT_DOUBLE_BUDGET`, is the reverse: test-scope only (`packages/<pkg>/test`,
 * `packages/<pkg>/bench`, `features/step-definitions`), because what it
 * guards is how a test describes a broken port.
 *
 * The three whole-file, cross-line-break checks below (`no-prefixed-error-tag`,
 * `no-catchtags-object-form`, `no-named-effect-submodule-import`) already run
 * over the merged src+test file list — unlike the per-line rules above, none of
 * them has a legitimate test-only form, so there was no reason to hold them
 * back once the file list included tests. Verified free: zero matches in any
 * test file at the time this scope changed.
 *
 * **Scope beyond `packages`.** `pnpm-workspace.yaml` lists `features`,
 * `examples/*` and `apps/*` as workspace members too, and only `features/
 * step-definitions` is scanned here (as a test-scoped tree, alongside
 * `packages/<pkg>/test`). That is a deliberate, considered split rather than
 * an oversight of the same shape CCR-QD-105 already found and fixed once for
 * `packages/<pkg>/test`:
 *
 *   - `features/step-definitions` implements the BDD acceptance suite
 *     against `@qadi/core`'s own public API — it is library-adjacent code
 *     this repository owns, written to the same AGENTS.md conventions
 *     (`Effect.fn`, no `switch` on a dispatch, `hasCustom` as a reviewed
 *     escape hatch), and a violation there hides in acceptance tests the
 *     same way one hid in `packages/<pkg>/test` before CCR-QD-105.
 *   - `examples/*` and `apps/*` are deliberately **not** scanned. They are
 *     consumer-facing code — a Next.js app and an Astro site — that
 *     legitimately uses idioms AGENTS.md bans everywhere else in this
 *     repository (`async`/`await` route handlers, `new Date()` in a blog
 *     frontmatter helper, framework-mandated `switch`es): a stranger
 *     consuming the published packages, not this library's own
 *     implementation. `examples/nextjs-newsroom` is exercised instead by
 *     `pnpm --filter @qadi/example-nextjs check` (step 15 of `pnpm check`)
 *     and `apps/website` by `node scripts/check-website-build.mjs` (step 24) —
 *     both hold it to its own toolchain's rules, not this library's.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { RAW_DECISION_READ } from "./lib/raw-decision-read.mjs";

const ROOT = new URL("..", import.meta.url).pathname;

/**
 * `raw: true` tests the unstripped line. Needed for rules that match inside
 * string literals (import specifiers), which `strip()` blanks out.
 *
 * Every rule here (`no-type-assertion` and `no-non-null-assertion` included)
 * matches one physical source line at a time (see the `lines.forEach` loop
 * below). AGENTS.md §17 documents this codebase's own convention of
 * hand-wrapping long lines at ~90 columns rather than reformatting, so an
 * `as <Type>` or a trailing `!` whose keyword and operand a hand-wrap splits
 * across two lines is invisible to these two rules — the opening line ends in
 * a bare `as` with no operand for the pattern to match, and the continuation
 * line carries no `as`/`!` token at all. No file today does this (241 files
 * scan clean), so this is a structural blind spot in the mechanism, not a
 * live bypass — a future reviewer should not assume line-by-line regex
 * matching here is exhaustive.
 *
 * **Tried and reverted, not merely theorized.** `no-catchtags-object-form` and
 * `no-named-effect-submodule-import` closed this identical blind spot by
 * moving to a whole-file, cross-line regex (CCR-QD-104), and porting
 * `no-type-assertion`/`no-non-null-assertion` the same way was tried directly
 * against this repository's real tree. Both conversions produced live false
 * positives rather than closing a live gap: joining stripped lines with their
 * newlines intact — so `\s+` bridges a hand-wrapped split the same way it
 * already bridges ordinary whitespace — also lets `\bas\s+[A-Za-z_$]` match
 * ordinary English prose spanning a line break in JSX text content
 * (`packages/devtools/src/react/PolicyExplorer.tsx`: "...so it fills
 * as\n  decisions arrive..." is not a `strip()`-blankable string literal, so
 * nothing distinguishes it from `value as\n  SomeType`), and loosening
 * `no-non-null-assertion`'s lookbehind to tolerate the same gap matches
 * `return\n  !ok` — an ordinary logical NOT starting the next line, not a
 * split non-null assertion — because the identifier ending the *previous*,
 * unrelated word (`return`'s `n`) satisfies the lookbehind just as well as a
 * real operand would. `no-catchtags-object-form`'s `\.catchTags\s*\(\s*\{` and
 * `no-named-effect-submodule-import`'s `import\s+\{...\}\s+from "effect/…"`
 * never faced this because both match multi-token syntactic shapes with no
 * English-prose or single-operator homograph; `as`/`!` are exactly the two
 * bans built from a common word and a common operator, which is why — unlike
 * those two — they stay per-line rather than getting the same conversion.
 *
 * @type {ReadonlyArray<{ id: string, re: RegExp, message: string, raw?: boolean, testScope?: boolean }>}
 */
const RULES = [
  {
    id: "no-async",
    re: /\basync\s+(?:function\b|\(|[A-Za-z_$][\w$]*\s*(?:=>|\())/,
    message: "No async functions — use Effect.fn(function* ...).",
  },
  {
    id: "no-await",
    re: /(^|[^.\w])await\s/,
    message: "No await — use yield* inside Effect.gen/Effect.fn.",
  },
  {
    id: "no-raw-promise",
    // The type-argument branch matters: `new Promise<void>(...)` is the form
    // that actually gets written, and without it the rule passes everything.
    re: /\bnew\s+Promise\s*(?:<[^>]*>)?\s*\(|\.then\s*\(/,
    message: "No raw Promises — use Effect.",
  },
  {
    id: "no-barrel-effect-import",
    re: /from\s+["']effect["']/,
    message: 'Import submodules: import * as Effect from "effect/Effect".',
    raw: true,
  },
  {
    id: "no-type-assertion",
    // Matches any `as <Type>` assertion, `as const` excepted — AGENTS.md §6 bans
    // `as` outright, not just the any/unknown/never forms. `{`/`[` catch a cast
    // to an inline object or tuple type (`as { id: string }`, `as [string,
    // number]`), which a named-identifier-only class would silently miss.
    // Import/export rename clauses (`import { assert as assertCore } from
    // "..."`) use the same `as` keyword for something else entirely, so they're
    // exempted below rather than matched here — this regex alone can't tell the
    // two apart.
    re: /\bas\s+(?!const\b)(?:[A-Za-z_$]|[([{])/,
    message: "No type assertions — fix the underlying type.",
    testScope: true,
  },
  {
    id: "no-nondeterministic-time",
    re: /\bDate\.now\s*\(|\bnew\s+Date\s*\(|performance\.now\s*\(/,
    message: "No ambient clocks — use Clock/DateTime so traces are testable.",
  },
  {
    id: "no-ambient-uuid",
    re: /crypto\.randomUUID\s*\(/,
    message: "No ambient UUIDs — use the EvaluationId service.",
  },
  {
    id: "no-non-null-assertion",
    // `x!` — an identifier or a closing `)`/`]` immediately followed by `!`,
    // not itself followed by `=` (which rules out `!=`/`!==`, tokenized as one
    // operator, never a non-null assertion in that position). A leading unary
    // `!x` never matches: there is no operand-ending character immediately
    // before it for the lookbehind to anchor on.
    //
    // Deliberately NOT an allow-list of what can follow `!` (`;`, `.`, `)`,
    // end of line, …): a non-null assertion can be followed by *any* binary
    // operator too — `x! + 1`, `x! && y`, `x! < 5` — and an allow-list that
    // enumerates punctuation misses exactly those, silently passing the gate
    // this rule exists to close (found by code review, not by symptom).
    re: /(?<=[A-Za-z0-9_)\]])!(?!=)/,
    message: "No non-null assertions — fix the type (AGENTS.md §6).",
    testScope: true,
  },
  {
    id: "no-extensionless-relative-import",
    re: /from\s+["']\.\.?\/[^"']*(?<!\.ts)(?<!\.tsx)["']/,
    message: "Relative imports need an explicit .ts/.tsx extension.",
    raw: true,
  },
  {
    id: "no-legacy-service-api",
    re: /\bContext\.(?:Tag|GenericTag|Reference)\b|\bEffect\.Service\b/,
    message: "Use Context.Service, never Effect.Service/Context.Tag/GenericTag/Reference.",
  },
  {
    id: "no-static-layer-or-default",
    // `.Default` here means the `Effect.Service`-derived static accessor this
    // rule exists to forbid. AGENTS.md §3 also sanctions naming a plain,
    // standalone layer `Default` ("the layer of a namespace-imported
    // module") — if one were ever read back as `ModuleName.Default` rather
    // than destructured on import, this regex cannot tell the two apart and
    // would flag the sanctioned form. Latent, not live: no such usage exists
    // today (`grep -rn "\.Default\b" packages/*/src packages/*/test` is
    // empty). The rule is deliberately left broad rather than narrowed to a
    // heuristic that could itself miss the real `XxxService.Default` case —
    // a future namespace-imported `Default` layer should destructure it on
    // import (`import { Default } from "./Foo.ts"`) to stay outside this
    // pattern entirely.
    re: /\bstatic\s+layer\b|\.Default\b/,
    message: 'No "static layer" or ".Default" on a service — layers are standalone consts.',
  },
  {
    id: "no-schema-tagged-error-class",
    re: /\bTaggedErrorClass\b/,
    message: "Use Data.TaggedError, not Schema.TaggedErrorClass.",
  },
  // no-prefixed-error-tag lives outside this array, as a whole-file regex —
  // see below. A per-line rule here would miss a tag string on the line after
  // `Data.TaggedError(`, which is how most of Errors.ts is actually formatted.
  {
    id: "no-effect-ordie",
    // The die-producing family, not just the bare call: `Effect.orDieWith(...)`
    // performs the identical fail-to-defect conversion with a message
    // function, and a name-only `\bEffect\.orDie\b` boundary match does not
    // see it (found by review, not by a live violation — grep across
    // packages finds `orDie` only in comments and tests today).
    re: /\bEffect\.orDie(?:With)?\b/,
    message: "Never Effect.orDie/orDieWith in evaluation/enforcement paths — a decision must not become a defect.",
  },
  {
    id: "no-node-fs-import",
    // Both the `node:`-prefixed and legacy unprefixed specifiers reach the
    // identical banned API, as does the `/promises` subpath — `"fs"` and
    // `"node:fs/promises"` were previously invisible to this rule despite
    // being the same violation AGENTS.md §6 bans.
    re: /from\s+["'](?:node:)?fs(?:\/promises)?["']/,
    message: "Use the FileSystem service, not node:fs (or node:fs/promises) directly.",
    raw: true,
  },
  {
    id: "no-effect-either",
    re: /from\s+["']effect\/Either["']|\bEffect\.either\b/,
    message: "Use Effect.result + Result.isSuccess/isFailure, not Effect.either/effect/Either.",
    raw: true,
  },
];

/**
 * Files exempt from specific rules, with the reason.
 *
 * A service that exists precisely to encapsulate a nondeterministic call is the
 * sanctioned place to make it. Keeping the exemption to one named file means
 * the boundary stays visible rather than dissolving into convention.
 *
 * @type {Readonly<Record<string, ReadonlyArray<string>>>}
 */
const EXEMPTIONS = {
  "packages/core/src/EvaluationId.ts": ["no-ambient-uuid"],
  // React Suspense is *defined* in terms of a thrown promise, so one has to
  // exist at that boundary. Confined to `settled.ts`, the only module that
  // constructs one; every hook that reads a decision does so synchronously
  // and needs no Promise at all.
  "packages/react/src/settled.ts": ["no-raw-promise"],
};

/**
 * Deliberate `switch` statements, by file and exact count (AGENTS.md §5a).
 *
 * A **count** rather than a per-file pass, because a blanket exemption would let
 * the next `switch` into an already-exempt file unseen — and both files that
 * hold one are the two hottest in the library, so they are exactly where one
 * would be added. Any deviation fails, in both directions: one *fewer* means a
 * dispatcher was converted to `Match` and §5a now overstates the exceptions,
 * which is a documentation change this gate should insist on rather than allow.
 *
 * The three here all dispatch once per policy node or matcher node per
 * evaluation — and in `filter` and `decideSubjects`, once per element on top of
 * that — with handlers closing over per-call state, so the matcher cannot be
 * hoisted to module scope the way §5a's preferred form requires. **Now
 * measured** (`packages/core/bench/Dispatch.bench.ts`, ADR-QD-034, AGENTS.md
 * §5a): a `switch` is 1.6–2.4× faster than a hoisted `Match` whose arms return
 * a closure at the dispatch site, and 3.5–7.7× faster than a `Match.value`
 * rebuilt per call — the form a naive conversion produces — so the exception
 * stands on a measured cost, not an absent one.
 *
 * @type {Readonly<Record<string, number>>}
 */
const SWITCH_BUDGET = {
  // `evaluateNode` on `policy._tag`. (`mergeFields` on the `FieldStrategy`
  // literal union was the second until ARCH-12 replaced it with
  // `FieldLattice.ts`'s own-property law table, measured first: ADR-QD-092.)
  "packages/core/src/Evaluate.ts": 1,
  // `judgeMatcher` on `self._tag` (it hosted in `evaluateMatcher` until
  // ARCH-08 T8, which made `evaluateMatcher` its one-line adapter), and
  // `resolveRef` on `ref._tag`.
  "packages/core/src/Matcher.ts": 2,
};

const SWITCH = /\bswitch\s*\(/;

/**
 * The function names AGENTS.md §5a's table names for each `SWITCH_BUDGET`
 * file — checked to still exist verbatim (BS-06): a pure count cannot see a
 * rename, only a change in how many `switch`es there are, so `evaluateNode`
 * renamed to something else would leave `SWITCH_BUDGET` satisfied while
 * AGENTS.md §5a's table quietly points at a symbol that no longer exists.
 *
 * @type {Readonly<Record<string, ReadonlyArray<string>>>}
 */
const SWITCH_BUDGET_NAMES = {
  "packages/core/src/Evaluate.ts": ["evaluateNode"],
  "packages/core/src/Matcher.ts": ["judgeMatcher", "resolveRef"],
};

/**
 * `hasCustom(...)` call sites outside `packages/core/src` and
 * `packages/testing/src`, by file and exact count (ADR-QD-055).
 *
 * `HasCustom` is Qadi's one deliberate escape hatch — a policy node whose
 * condition is opaque, externally-registered logic rather than a declarative
 * matcher, so a policy reaching for it forfeits `explain()`'s ability to
 * decompose the check and `toPredicate`'s ability to compile it to a row
 * filter. An escape hatch with no friction becomes the default path, so
 * adopting it anywhere outside core/testing is a conscious, reviewed edit to
 * this list — the same discipline `SWITCH_BUDGET` enforces for `switch`, not a
 * convention left to be remembered. No *shipped package* outside core/testing
 * reaches for it — the one entry below is the BDD acceptance suite, not a
 * package (see its own comment for why that is in scope at all).
 *
 * @type {Readonly<Record<string, number>>}
 */
const HAS_CUSTOM_BUDGET = {
  // The BDD acceptance step that exercises `hasCustom` itself — the feature
  // this ADR's own escape hatch describes needs a scenario, and this is the
  // one call site that drives it. Newly visible rather than newly written:
  // `features/step-definitions` was not scanned by this gate until this
  // budget's own file also gained it in scope.
  "features/step-definitions/CustomPredicateWhenSteps.ts": 1,
};

const HAS_CUSTOM_CALL = /\bhasCustom\s*\(/;

/** `hasCustom` is defined and fixture-used here; only usage elsewhere is budgeted. */
const HAS_CUSTOM_EXEMPT_PREFIXES = ["packages/core/src/", "packages/testing/src/"];

/**
 * `Effect.fnUntraced(...)` call sites, by file and exact count (ADR-QD-073,
 * AGENTS.md §5).
 *
 * AGENTS.md §5 defaults every effectful function to a *named* `Effect.fn`, so
 * it always gets a span. `Effect.fnUntraced` is the deliberate, measured
 * exception — issue #101's `EffectFn.bench.ts` found the named form costs
 * ≈2.7–2.9 µs/call more (a second `Error()` capture, a span allocation, a
 * `CurrentStackFrame` record) than the untraced one, and issue #102 spent
 * that saving on exactly three per-policy-node dispatch functions in
 * `Evaluate.ts` — `evaluateAllOf`, `evaluateAnyOf`, `evaluateRules` — after
 * confirming with `Evaluate.bench.ts` that the end-to-end improvement actually
 * shows up, not just the isolated per-call number — see AGENTS.md §5's table
 * for the current per-workload figures rather than a number restated here,
 * which drifted from it once already ("≈28–74%" against a table that
 * actually measures ≈18–74%, corrected by review). This is the same
 * discipline `SWITCH_BUDGET` and
 * `HAS_CUSTOM_BUDGET` enforce for their own exceptions: an escape hatch with
 * no friction becomes the default, so a new `Effect.fnUntraced` call site
 * anywhere is a conscious, reviewed edit to this list and to AGENTS.md §5's
 * table, not a convention left to be remembered. The port reads in
 * `PortAccess.ts` (`readAttribute`, `askActedAny`, `askActedForResource`,
 * `askRelationship`, `askCustom`, `askSignature`) and the root `evaluate` are
 * deliberately **not** in this budget — ADR-QD-051 keeps those traced as
 * product observability, not incidental cost — and neither is
 * `requireResourceId`, a helper rather than a per-node dispatch point.
 *
 * @type {Readonly<Record<string, number>>}
 */
const UNTRACED_BUDGET = {
  // evaluateAllOf, evaluateAnyOf, evaluateRules — see the doc comment above
  // each in Evaluate.ts.
  "packages/core/src/Evaluate.ts": 3,
};

const UNTRACED_CALL = /\bEffect\.fnUntraced\s*\(/;

/**
 * The function names AGENTS.md §5's table names for each `UNTRACED_BUDGET`
 * file — checked the same way, and for the same reason, as
 * `SWITCH_BUDGET_NAMES` above (BS-06).
 *
 * @type {Readonly<Record<string, ReadonlyArray<string>>>}
 */
const UNTRACED_BUDGET_NAMES = {
  "packages/core/src/Evaluate.ts": ["evaluateAllOf", "evaluateAnyOf", "evaluateRules"],
};

/**
 * `any` type usages, by file and exact count (ADR-QD-075).
 *
 * AGENTS.md §6 forbids `any` except the one measured, budgeted exception
 * this file enforces: `passthroughClientLayer` (`HttpApiMiddlewareClient.ts`)
 * must stay generic over any `HttpApiMiddleware.AnyId`, and `effect`'s own
 * `HttpApiMiddleware<Provides, E, Requires>`/`HttpApiMiddlewareSecurity<...>`
 * constraint shapes reject `unknown` in `Provides`'s position for a concrete
 * middleware's real type (tried first and confirmed broken — `unknown` does
 * not bypass variance checking the way `any` does), leaving `any` as the only
 * way to accept "any middleware service" generically. `.oxlintrc.json` scopes
 * a `no-explicit-any` override to this one file — so oxlint's `no-explicit-any`
 * enforces the ban everywhere *else* — and this budget is the same discipline
 * `SWITCH_BUDGET`/`HAS_CUSTOM_BUDGET`/`UNTRACED_BUDGET` enforce for their own
 * exceptions, checked in both directions, so that override cannot silently
 * grow to cover an unrelated, unreviewed `any` added to the same file later.
 *
 * **Counts occurrences of the word, not type positions.** The regex below is
 * `/\bany\b/g` over comment-and-string-stripped lines, scoped to this one
 * file — safe here specifically because the pinned count (7) is known to be
 * exactly the type-position `any`s at this file's two constraint expressions
 * (see the budget's own comment). It is not a general claim that word-count
 * equals type-count: a future edit that renamed a local to the bare
 * identifier `any`, or restructured the constraint so the count changed
 * without the type-level fact changing, would still just move the number
 * this budget re-pins, not silently pass — the both-directions check below
 * still requires a reviewed update either way.
 *
 * @type {Readonly<Record<string, number>>}
 */
const ANY_BUDGET = {
  // The seven `any`s in passthroughClientLayer's `Context.Key` parameter
  // type — three in `HttpApiMiddleware<any, any, any>`, four in
  // `HttpApiMiddlewareSecurity<any, any, any, any>`. See the doc comment above.
  "packages/http/src/HttpApiMiddlewareClient.ts": 7,
};

const ANY_TYPE = /\bany\b/g;

/**
 * `Schema.TaggedError` class declarations, by file and exact count
 * (AGENTS.md §4, ADR-QD-060 narrowed by ADR-QD-072).
 *
 * §4's default is `Data.TaggedError`; `Schema.TaggedError` is the measured,
 * named exception — an error earns it when it is part of a codec (a
 * `SinkRecord` `SinkCodec.ts` must decode/encode structurally, or an
 * `@qadi/http` response body `httpApiStatus` annotates), not merely because
 * it happens to leave the process. All eleven current members live in
 * `packages/core/src/Errors.ts` — see that file's own header doc comment and
 * AGENTS.md §4's table for which crosses which boundary. Same discipline
 * `SWITCH_BUDGET`/`HAS_CUSTOM_BUDGET`/`UNTRACED_BUDGET`/`ANY_BUDGET` enforce
 * for their own exceptions, checked in both directions: a twelfth
 * `Schema.TaggedError` class added without updating AGENTS.md §4's table and
 * this budget together fails the gate, and so does the count silently
 * dropping back down.
 *
 * @type {Readonly<Record<string, number>>}
 */
const SCHEMA_ERROR_BUDGET = {
  "packages/core/src/Errors.ts": 12,
};

const SCHEMA_TAGGED_ERROR = /\bextends\s+Schema\.TaggedError\b/;

/**
 * Raw reads of a decision result's `AsyncResult` state in library source, by
 * file and exact count (ADR-QD-017 as amended by ARCH-14, AGENTS.md §13).
 *
 * `outcomeOf` (`packages/react/src/DecisionOutcome.ts`) is the one read of a
 * `DecisionResult`: every surface renders from the outcome it returns, and the
 * outcome has no field through which a re-check's stale value or a failure's
 * `previousSuccess` can leak. Before it there were three hand-kept readers of
 * the same rule (`currentDecision`, `components.tsx`'s `classify`, `useGate.ts`'s
 * `renderStateOf`) and a published guide that got it wrong — convention is what
 * failed. What counts as a raw read is `RAW_DECISION_READ`
 * (`scripts/lib/raw-decision-read.mjs`), the pattern the doc-fence gates use
 * too. Same discipline as `SWITCH_BUDGET`, checked in both directions: a new
 * read anywhere in `packages/*\/src` fails, and so does a budgeted one
 * disappearing without this table changing.
 *
 * @type {Readonly<Record<string, number>>}
 */
const DECISION_READ_BUDGET = {
  // `outcomeOf`'s `AsyncResult.isInitial(` and `result.waiting` — the read itself.
  "packages/react/src/DecisionOutcome.ts": 2,
  // Seed precedence and mismatch reporting (`makeSeededQuestion`'s `read`):
  // one `isInitial` deciding whether the computed result replaces the seed, and
  // two `isSuccess` deciding whether it disagrees with it. Upstream of what a
  // consumer reads — it chooses which result the atom holds (ADR-QD-039) — so
  // not a second reading of one.
  "packages/react/src/HydrationEngine.ts": 3,
};

/**
 * The function each `DECISION_READ_BUDGET` file's reads belong to, checked to
 * exist verbatim — the rename guard `SWITCH_BUDGET_NAMES` gives its own table
 * (BS-06).
 *
 * @type {Readonly<Record<string, ReadonlyArray<string>>>}
 */
const DECISION_READ_BUDGET_NAMES = {
  "packages/react/src/DecisionOutcome.ts": ["outcomeOf"],
  "packages/react/src/HydrationEngine.ts": ["makeSeededQuestion"],
};

/**
 * Test files that construct a port's typed error by hand, by file and exact
 * count of lines doing so (ARCH-10, ADR-QD-094).
 *
 * Every port's description builds its own error (`failure`), and
 * `@qadi/core`'s `scriptedPort` derives a failing, dying or throwing double
 * from it — so a test that needs a broken port writes
 * `scriptedPort(attributeResolverPort, () => PortReply.fail("down")).layer`
 * rather than a hand-written `Layer.succeed(AttributeResolver, { … new
 * AttributeResolveError(…) … })`. Before ARCH-10 there were 65 such failing
 * layers in 27 files plus 19 dying ones, each restating the port's error
 * shape; a port whose error gained a field broke every one of them.
 *
 * The **seventh budget, and the only test-scope one**: the six above guard
 * shipped source, this guards how tests describe a broken port. The files
 * below construct an error as a *value* the test needs to hold — an
 * instance-identity check, a codec round trip, an error a registered predicate
 * or an HTTP fixture returns, a cause matrix driven without a port — or a
 * double the scripted one cannot express (a latch). Checked in both
 * directions like the others: a new file, or a count that moves either way,
 * fails until this table is edited with its reason.
 *
 * Scope is the test-scope set this script already scans (`packages/<pkg>/test`,
 * `packages/<pkg>/bench`) plus `features/step-definitions`. The Gherkin
 * step files under `features/features/` are not scanned by this script at all.
 *
 * @type {Readonly<Record<string, number>>}
 */
const PORT_DOUBLE_BUDGET = {
  // A `Failed` record's resolver error, as one of the record shapes whose
  // encode cost is measured (ARCH-09 T5).
  "packages/core/bench/SinkCodec.bench.ts": 1,
  // A registered predicate's own failure, returned through the registry —
  // the value under test is what `customPredicateFromRecord` passes on.
  "packages/core/test/CustomPredicate.test.ts": 1,
  // A failure after a latch opens, so N concurrent asks share one in-flight
  // compute; a script answers synchronously and cannot wait on the latch.
  "packages/core/test/DecisionCache.test.ts": 1,
  // Errors as values: `EvaluationError`/`QadiError` membership and codes.
  "packages/core/test/Errors.test.ts": 5,
  // The port's own error must reach the caller as the same instance.
  "packages/core/test/Evaluate.test.ts": 1,
  // `catchPortDefect`'s cause matrix, driven on raw effects without a port.
  "packages/core/test/PortAccess.test.ts": 2,
  // The port's own error must survive translation as the same instance.
  "packages/core/test/Predicate.test.ts": 1,
  // The port's own error must reach the caller as the same instance.
  "packages/core/test/SignatureHistory.test.ts": 1,
  // Every error round-trips through the wire codec, and a resolver error's
  // `cause` is the position the record codec must carry or refuse (ARCH-09);
  // and the golden bytes of a resolver error carrying an `Error` cause (ARCH-15).
  "packages/core/test/SinkCodec.test.ts": 11,
  // An error as a value, for its `_tag`/code.
  "packages/core/test/Tokens.test.ts": 1,
  // A `Failed` record carrying a resolver `cause`, as data the audit encoder
  // must persist or refuse (ARCH-09).
  "packages/audit/test/helpers.ts": 1,
  // A comparison row's error, as data handed to the table.
  "packages/devtools/test/react/WhatIfTable.test.tsx": 1,
  // Every enforcement error's response mapping.
  "packages/http/test/QadiHttpError.test.ts": 12,
  // A `Failed` record carrying a resolver `cause`, as data a frame must carry
  // or refuse without ending the feed (ARCH-09).
  "packages/http/test/decisionStream.test.ts": 1,
  // The fixture every HTTP enforcement test iterates over.
  "packages/http/test/fixtures/everyHttpEnforcementFailure.ts": 5,
};

const PORT_ERROR_CONSTRUCTION =
  /\bnew\s+(AttributeResolveError|RelationshipResolveError|DecisionHistoryUnavailable|CustomPredicateError|SignatureHistoryUnavailable)\s*\(/;

// This is not a narrow edge case: `import * as Effect from "effect/Effect"`
// — AGENTS.md §1's own mandated import style, on line 1 of nearly every file
// this script scans — reuses the identical `as` keyword for namespacing, not
// type assertion. Disable this exemption and the gate fails on its own
// codebase's house style, every file, immediately (verified directly: it did
// — 86 violations, most of them `import * as X from "..."` lines). The
// second, narrower case this also covers — `import { assert as assertCore }
// from "..."` renaming, where a multi-line named-import list can put the
// rename on a continuation line the start-of-statement regex never sees on
// its own — is real too (`Policy as PolicySchema` in
// `packages/react/src/Hydration.ts`), just far less visible than the first.
// So this is tracked as a small span, like the block-comment state below:
// once a line opens an import or re-export-from clause, every line up to and
// including the one closing it is exempt from no-type-assertion specifically
// — every other rule still applies as normal.
//
// Deliberately narrower than "starts with `export`": `export interface`,
// `export const`, `export class` etc. never carry a `from` clause, so a naive
// `/^\s*(?:import|export)\b/` start test never closes on those declarations
// and silently exempts everything after the first one in the file — caught by
// hand while writing this rule. Only the forms that can legitimately end in
// `from "..."` open the span.
//
// Closing tracks brace depth, not a line count: a first version capped the
// span at a fixed line count as a backstop against a from-less local rename
// (`export { X as Y };`, which cannot be told apart from a real multi-line
// import by the start pattern alone) — but this codebase has had a genuine
// 13-line named import, one line past that cap, so the backstop closed the
// exemption a line before the real `from` and would have unexempted a rename
// landing on that last line (that import has since been split up, but a
// future one just as long is exactly the case this had to hold for). Braces
// close exactly when the
// statement does, for both shapes, at any length, so depth tracking has no
// such boundary to misjudge — `from` closes it in the normal case, and depth
// returning to zero without ever seeing `from` closes it in the rename case.
// IMPORT_MAX_LINES is a last-resort backstop only, for a file too malformed to
// balance its own braces; it is not the mechanism doing the real work anymore.
const IMPORT_START = /^\s*(?:import\b|export\s+(?:\*|\{|type\s*\{))/;
const IMPORT_END = /\bfrom\s+["']/;
const IMPORT_MAX_LINES = 200;

/**
 * Recursively collect .ts/.tsx files under a directory.
 *
 * `.tst.ts` stays excluded even where `includeTests` is set: a tstyche
 * type-level test file exists to exercise the type system at compile time and
 * has no runtime behavior a cast or a non-null assertion could hide a defect
 * behind.
 */
const collect = (dir, { includeTests = false } = {}) => {
  /** @type {string[]} */
  const out = [];
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const entry of entries) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      out.push(...collect(full, { includeTests }));
    } else if (/\.tsx?$/.test(full) && !/\.tst\.ts$/.test(full)) {
      if (includeTests || !/\.test\.tsx?$/.test(full)) out.push(full);
    }
  }
  return out;
};

const packagesDir = join(ROOT, "packages");
const srcSources = [
  ...readdirSync(packagesDir).flatMap((pkg) => collect(join(packagesDir, pkg, "src"))),
  // `features/step-definitions` gets `src`-scope treatment, not `test`-scope:
  // these are `Effect.fn`/`function*` implementations written to the same
  // conventions as library source (no async, no raw Promise, no ambient
  // time), not vitest bodies with a legitimate `await waitFor(...)` idiom —
  // see the doc comment above. `examples/*`/`apps/*` stay deliberately
  // excluded entirely, for the reason given there.
  ...collect(join(ROOT, "features", "step-definitions")),
];
const testSources = readdirSync(packagesDir).flatMap((pkg) =>
  collect(join(packagesDir, pkg, "test"), { includeTests: true })
);
// `packages/<pkg>/bench` gets the same `testScope`-rule treatment as `test`:
// AGENTS.md §6's ban on `as`/`as any`/`!`/`any` states no bench carve-out, and
// `pnpm check`'s typecheck step already covers it (`tsconfig.test.json`
// includes `packages/*/bench/**/*.ts`) — this closes the matching house-style
// gap rather than leaving it a silent omission (CCR-QD-119). Folded into the
// same set as `test/`, not a third bucket: nothing here needs `SWITCH_BUDGET`/
// `HAS_CUSTOM_BUDGET`/`UNTRACED_BUDGET` tracking or the non-`testScope` rules
// (`no-async` and friends are as legitimate in a bench body as in a test
// one), so treating bench as test-scoped is exactly the right amount of
// coverage.
const benchSources = readdirSync(packagesDir).flatMap((pkg) =>
  collect(join(packagesDir, pkg, "bench"), { includeTests: true })
);
const testSourceSet = new Set([...testSources, ...benchSources]);
const sources = [...srcSources, ...testSources, ...benchSources];

/**
 * A conservative regex-literal matcher, blanked out before line-comment
 * stripping below.
 *
 * Without this, a regex literal containing `//` (e.g. `/https?:\/\//`) gets
 * cut by the very next `.replace(/\/\/.*$/, "")` — `strip()` sees the
 * literal's own escaped `\/\/` as a line-comment opener and truncates the
 * line there, silently hiding whatever the rest of it held from every rule
 * below. Anchored on the character immediately preceding the `/` (`=`, `(`,
 * `:`, `,`, or start of line — the syntactic positions a regex literal
 * actually starts from: an assignment, an argument, an object value, a list
 * item) rather than matching every bare `/.../ `, so an ordinary division
 * expression (`x = a / b`) is never mistaken for one: the character right
 * after that anchor is required to be `/` itself, which a division's left
 * operand never is. Latent, not live — no regex literal containing `//`
 * exists in the scanned tree today.
 */
const REGEX_LITERAL = /(^|[=(:,])(\s*)(\/(?:[^/\\\n]|\\.)+\/[a-z]*)/g;

/** Strip line comments, block comments, string and regex literals to cut false positives. */
const strip = (line) =>
  line
    .replace(REGEX_LITERAL, (_m, pre, ws, lit) => pre + ws + "_".repeat(lit.length))
    .replace(/\/\/.*$/, "")
    .replace(/\/\*.*?\*\//g, "")
    .replace(/"(?:[^"\\]|\\.)*"/g, '""')
    .replace(/'(?:[^'\\]|\\.)*'/g, "''");

let failures = 0;

/** @type {Map<string, number[]>} */
const switchLines = new Map();

/** @type {Map<string, number[]>} */
const hasCustomLines = new Map();

/** @type {Map<string, number[]>} */
const untracedLines = new Map();

/** @type {Map<string, number[]>} */
const anyLines = new Map();

/** @type {Map<string, number[]>} */
const schemaErrorLines = new Map();

/** @type {Map<string, number[]>} */
const decisionReadLines = new Map();
const portDoubleLines = new Map();

for (const file of sources) {
  const rel = relative(ROOT, file);
  const isTestFile = testSourceSet.has(file);
  const exempt = EXEMPTIONS[rel] ?? [];
  // Normalized once, up front: a CRLF-terminated line's trailing `\r` survives
  // a plain `.split("\n")`, and `.` never matches `\r` — so every `$`-anchored
  // check below (strip()'s own `//.*$`, no-extensionless-relative-import,
  // etc.) would silently fail to match all the way to the true end of line on
  // a file saved with Windows line endings. This repo has no
  // .gitattributes/.editorconfig forcing LF, so a CRLF-authored file is a real
  // possibility, not a hypothetical.
  const lines = readFileSync(file, "utf8").replace(/\r\n/g, "\n").split("\n");
  let inBlockComment = false;
  let inImport = false;
  let importSpan = 0;
  let importBraceDepth = 0;

  lines.forEach((raw, index) => {
    // Track multi-line comments so prose in doc blocks never trips a rule.
    const opens = (raw.match(/\/\*/g) ?? []).length;
    const closes = (raw.match(/\*\//g) ?? []).length;
    const wasInComment = inBlockComment;
    inBlockComment = inBlockComment ? closes < opens || closes === 0 : opens > closes;
    if (wasInComment) return;

    const line = strip(raw);
    if (line.trim() === "" || line.trimStart().startsWith("*")) return;

    // A new import/export-from clause always starts its own span, even when it
    // follows another one with no blank line between — otherwise back-to-back
    // clauses share one accumulating brace depth and the second closes on the
    // first's leftover balance instead of its own.
    const startsImport = IMPORT_START.test(line);
    if (startsImport) {
      importBraceDepth = 0;
      importSpan = 0;
    }
    const importActive = inImport || startsImport;
    if (importActive) {
      importSpan += 1;
      const braceOpens = (line.match(/\{/g) ?? []).length;
      const braceCloses = (line.match(/\}/g) ?? []).length;
      importBraceDepth += braceOpens - braceCloses;
      const sawFrom = IMPORT_END.test(line);
      // Closes on `from` (the normal case) or on the statement's own braces
      // balancing back to zero without ever seeing one (the from-less local
      // rename case) — whichever this particular line actually is.
      inImport = !sawFrom && importBraceDepth > 0 && importSpan < IMPORT_MAX_LINES;
    } else {
      importSpan = 0;
    }

    // These five budgets are src-only by design (SWITCH_BUDGET/HAS_CUSTOM_BUDGET/
    // UNTRACED_BUDGET/ANY_BUDGET/SCHEMA_ERROR_BUDGET are keyed to specific src
    // files) — a test
    // file's switch, hasCustom, Effect.fnUntraced or any usage, if one ever
    // appears, is not what any budget tracks.
    if (!isTestFile && SWITCH.test(line)) {
      const found = switchLines.get(rel) ?? [];
      found.push(index + 1);
      switchLines.set(rel, found);
    }

    if (
      !isTestFile &&
      HAS_CUSTOM_CALL.test(line) &&
      !HAS_CUSTOM_EXEMPT_PREFIXES.some((prefix) => rel.startsWith(prefix))
    ) {
      const found = hasCustomLines.get(rel) ?? [];
      found.push(index + 1);
      hasCustomLines.set(rel, found);
    }

    // Src-only, like the two budgets above — a test file's own use of
    // `Effect.fnUntraced` (none exists today) is not what this budget tracks.
    if (!isTestFile && UNTRACED_CALL.test(line)) {
      const found = untracedLines.get(rel) ?? [];
      found.push(index + 1);
      untracedLines.set(rel, found);
    }

    // Scoped to ANY_BUDGET's own files only, unlike the other budgets above:
    // oxlint's `no-explicit-any` (AST-based, no false positives) already
    // enforces "no `any` anywhere except a file-scoped `.oxlintrc.json`
    // override" across the whole codebase — this only needs to catch a
    // silent, unreviewed *growth* of `any` usage inside an already-exempted
    // file. A codebase-wide regex sweep for the plain English word "any"
    // is not safe to run more broadly than that: it false-positives on
    // ordinary prose in doc comments (confirmed — it matched "reach back to
    // any sink's own log" in a `DevtoolsDock.tsx` JSX comment). Counts every
    // `any` token on the line, not just whether the line has one — a single
    // line here (`HttpApiMiddleware<any, any, any>`) legitimately carries
    // several.
    if (!isTestFile && rel in ANY_BUDGET) {
      const matches = line.match(ANY_TYPE) ?? [];
      if (matches.length > 0) {
        const found = anyLines.get(rel) ?? [];
        for (let i = 0; i < matches.length; i += 1) found.push(index + 1);
        anyLines.set(rel, found);
      }
    }

    // Src-only, like UNTRACED_BUDGET above — a test file declaring its own
    // error class (none does today) is not what this budget tracks.
    if (!isTestFile && SCHEMA_TAGGED_ERROR.test(line)) {
      const found = schemaErrorLines.get(rel) ?? [];
      found.push(index + 1);
      schemaErrorLines.set(rel, found);
    }

    // Library source only (`packages/*/src`): a test reads raw results on
    // purpose, to pin what `outcomeOf` reads them as. Every read on the line
    // counts — `AsyncResult.isSuccess(r) && !r.waiting` is two.
    if (!isTestFile && rel.startsWith("packages/")) {
      const matches = line.match(RAW_DECISION_READ) ?? [];
      if (matches.length > 0) {
        const found = decisionReadLines.get(rel) ?? [];
        for (let i = 0; i < matches.length; i += 1) found.push(index + 1);
        decisionReadLines.set(rel, found);
      }
    }
    // Test-scope only, unlike every budget above: PORT_DOUBLE_BUDGET is about
    // how tests describe a broken port, and shipped source constructs these
    // errors legitimately (each port's description, `PortAccess.ts`).
    if ((isTestFile || rel.startsWith("features/")) && PORT_ERROR_CONSTRUCTION.test(line)) {
      const found = portDoubleLines.get(rel) ?? [];
      found.push(index + 1);
      portDoubleLines.set(rel, found);
    }

    for (const rule of RULES) {
      if (isTestFile && !rule.testScope) continue;
      if (exempt.includes(rule.id)) continue;
      if (rule.id === "no-type-assertion" && importActive) continue;
      if (rule.re.test(rule.raw === true ? raw : line)) {
        failures += 1;
        console.error(
          `${rel}:${index + 1}  [${rule.id}] ${rule.message}\n    ${raw.trim()}`
        );
      }
    }
  });
}

// ---------------------------------------------------------------------------
// §5a — dispatch through `Match`, not `switch`. Checked against the declared
// budget, so an exception has to be written down to survive.
// ---------------------------------------------------------------------------

let declaredSwitches = 0;

for (const [rel, budget] of Object.entries(SWITCH_BUDGET)) {
  const found = switchLines.get(rel) ?? [];
  declaredSwitches += budget;
  if (found.length !== budget) {
    failures += 1;
    console.error(
      `${rel}  [no-switch] declares ${budget} deliberate switch(es), found ${found.length}` +
        `${found.length > 0 ? ` at line(s) ${found.join(", ")}` : ""}.\n` +
        `    ${
          found.length > budget
            ? "A new switch needs a reason in AGENTS.md §5a and this budget, or Match instead."
            : "One was converted — update AGENTS.md §5a and this budget so the two agree."
        }`,
    );
  }
}

for (const [rel, found] of switchLines) {
  if (rel in SWITCH_BUDGET) continue;
  failures += 1;
  console.error(
    `${rel}:${found.join(", ")}  [no-switch] Dispatch with effect/Match, not switch — AGENTS.md §5a.\n` +
      `    A hot path that genuinely needs one is declared in SWITCH_BUDGET with its reason.`,
  );
}

// `SWITCH_BUDGET` keys on file + exact count alone, which a rename cannot
// trip: `evaluateNode`/`mergeFields`/`judgeMatcher`/`resolveRef` renamed to
// anything else would still leave the count matching, while AGENTS.md §5a's
// table (and the prose comment above `SWITCH_BUDGET` itself) silently name a
// symbol that no longer exists. Checked here as a plain grep-per-name against
// the budgeted file's own text, so a rename fails the gate the same way a
// count drift already does, rather than rotting the table unnoticed.
for (const [rel, names] of Object.entries(SWITCH_BUDGET_NAMES)) {
  const content = readFileSync(join(ROOT, rel), "utf8");
  for (const name of names) {
    if (new RegExp(`\\b${name}\\b`).test(content)) continue;
    failures += 1;
    console.error(
      `${rel}  [switch-budget-names] AGENTS.md §5a's table names \`${name}\` for this file's ` +
        `declared switch(es), but no such identifier appears in it any more — the function was ` +
        `renamed without updating AGENTS.md §5a's table and SWITCH_BUDGET_NAMES together.`,
    );
  }
}

// ---------------------------------------------------------------------------
// ADR-QD-055 — `hasCustom(...)` usage outside core/testing is a named
// allowlist, not a grep. An escape hatch with no friction becomes the default
// path; this makes reaching for it anywhere new a conscious, reviewed edit,
// checked in both directions like SWITCH_BUDGET above.
// ---------------------------------------------------------------------------

for (const [rel, budget] of Object.entries(HAS_CUSTOM_BUDGET)) {
  const found = hasCustomLines.get(rel) ?? [];
  if (found.length !== budget) {
    failures += 1;
    console.error(
      `${rel}  [hasCustom-budget] declares ${budget} hasCustom(...) call(s), found ${found.length}` +
        `${found.length > 0 ? ` at line(s) ${found.join(", ")}` : ""}.\n` +
        `    Update HAS_CUSTOM_BUDGET in scripts/check-house-style.mjs so the two agree.`,
    );
  }
}

for (const [rel, found] of hasCustomLines) {
  if (rel in HAS_CUSTOM_BUDGET) continue;
  failures += 1;
  console.error(
    `${rel}:${found.join(", ")}  [hasCustom-budget] New hasCustom(...) usage outside core/testing.\n` +
      `    Add it to HAS_CUSTOM_BUDGET in scripts/check-house-style.mjs with its exact count — a ` +
      `conscious, reviewed opt-in, not a silent grep hit (ADR-QD-055).`,
  );
}

// ---------------------------------------------------------------------------
// ADR-QD-073 — `Effect.fnUntraced(...)` is AGENTS.md §5's measured, budgeted
// exception to "every effectful function is a named Effect.fn". Checked in
// both directions like SWITCH_BUDGET/HAS_CUSTOM_BUDGET above: too few means a
// declared site was converted back or removed and AGENTS.md §5 now overstates
// the exception; too many means a new, unreviewed site adopted it without
// updating the table and the budget together.
// ---------------------------------------------------------------------------

for (const [rel, budget] of Object.entries(UNTRACED_BUDGET)) {
  const found = untracedLines.get(rel) ?? [];
  if (found.length !== budget) {
    failures += 1;
    console.error(
      `${rel}  [untraced-budget] declares ${budget} Effect.fnUntraced(...) call(s), found ${found.length}` +
        `${found.length > 0 ? ` at line(s) ${found.join(", ")}` : ""}.\n` +
        `    Update UNTRACED_BUDGET in scripts/check-house-style.mjs and AGENTS.md §5's table so all three agree.`,
    );
  }
}

for (const [rel, found] of untracedLines) {
  if (rel in UNTRACED_BUDGET) continue;
  failures += 1;
  console.error(
    `${rel}:${found.join(", ")}  [untraced-budget] New Effect.fnUntraced(...) usage.\n` +
      `    Add it to UNTRACED_BUDGET in scripts/check-house-style.mjs and AGENTS.md §5's table with a ` +
      `benchmark backing it — a conscious, reviewed opt-in, not a silent grep hit (ADR-QD-073).`,
  );
}

// Same rename-proofing as SWITCH_BUDGET_NAMES above, for AGENTS.md §5's table
// (BS-06).
for (const [rel, names] of Object.entries(UNTRACED_BUDGET_NAMES)) {
  const content = readFileSync(join(ROOT, rel), "utf8");
  for (const name of names) {
    if (new RegExp(`\\b${name}\\b`).test(content)) continue;
    failures += 1;
    console.error(
      `${rel}  [untraced-budget-names] AGENTS.md §5's table names \`${name}\` for this file's ` +
        `declared Effect.fnUntraced(...) call(s), but no such identifier appears in it any more — ` +
        `the function was renamed without updating AGENTS.md §5's table and UNTRACED_BUDGET_NAMES together.`,
    );
  }
}

// ---------------------------------------------------------------------------
// ADR-QD-075 — `any` is AGENTS.md §6's flat ban, except the one measured
// exception below. oxlint's `no-explicit-any` (AST-based, correct everywhere)
// already enforces it codebase-wide except for the file(s) `.oxlintrc.json`
// scopes an override to; this budget adds the same both-directions discipline
// `SWITCH_BUDGET`/`HAS_CUSTOM_BUDGET`/`UNTRACED_BUDGET` give their own
// exceptions, so an override cannot silently grow to cover an unrelated,
// unreviewed `any` added to that same file later. Deliberately scoped to only
// the files ANY_BUDGET names (see the scan loop above) rather than a
// codebase-wide sweep, which a plain-English word like "any" is not safe to
// regex-match against prose-heavy doc comments.
// ---------------------------------------------------------------------------

for (const [rel, budget] of Object.entries(ANY_BUDGET)) {
  const found = anyLines.get(rel) ?? [];
  if (found.length !== budget) {
    failures += 1;
    console.error(
      `${rel}  [any-budget] declares ${budget} any(s), found ${found.length}` +
        `${found.length > 0 ? ` at line(s) ${found.join(", ")}` : ""}.\n` +
        `    Update ANY_BUDGET in scripts/check-house-style.mjs so the two agree.`,
    );
  }
}

// ---------------------------------------------------------------------------
// The `any` ban's two enforcement halves — `.oxlintrc.json`'s override scope
// and this file's `ANY_BUDGET` keys — are two independently maintained lists
// describing the same set of files, and nothing before this compared them.
// `ANY_BUDGET`'s scan loop only counts `any` inside a file already in
// `ANY_BUDGET` (`rel in ANY_BUDGET` above), so a *second* `.oxlintrc.json`
// override naming a new file disables oxlint's AST-based check there while
// this budget never counts it at all — an unpoliced `any`-zone that would
// pass every gate. Checked as a plain set-equality, both directions: an
// override with no budget entry, or a budget entry with no override, is
// exactly the drift `SWITCH_BUDGET`/`UNTRACED_BUDGET`/`ANY_BUDGET` itself
// exist to make impossible for their own axes.
// ---------------------------------------------------------------------------

const oxlintConfig = JSON.parse(readFileSync(join(ROOT, ".oxlintrc.json"), "utf8"));
const oxlintAnyOverrideFiles = new Set(
  (oxlintConfig.overrides ?? [])
    .filter((override) => override.rules?.["no-explicit-any"] === "off")
    .flatMap((override) => override.files ?? []),
);
const anyBudgetFiles = new Set(Object.keys(ANY_BUDGET));

for (const rel of oxlintAnyOverrideFiles) {
  if (anyBudgetFiles.has(rel)) continue;
  failures += 1;
  console.error(
    `.oxlintrc.json  [any-budget-oxlint-mismatch] "${rel}" disables no-explicit-any but has no ` +
      `ANY_BUDGET entry in scripts/check-house-style.mjs — an unpoliced any-zone. Add it with its exact count.`,
  );
}

for (const rel of anyBudgetFiles) {
  if (oxlintAnyOverrideFiles.has(rel)) continue;
  failures += 1;
  console.error(
    `scripts/check-house-style.mjs  [any-budget-oxlint-mismatch] ANY_BUDGET names "${rel}", but ` +
      `.oxlintrc.json has no matching no-explicit-any override there — oxlint would already fail it.`,
  );
}

// ---------------------------------------------------------------------------
// AGENTS.md §4 — `Schema.TaggedError` is the measured, budgeted exception to
// `Data.TaggedError` (ADR-QD-060, narrowed by ADR-QD-072). Checked in both
// directions like UNTRACED_BUDGET above: too few means a declared class was
// migrated back or removed and AGENTS.md §4's table now overstates the
// exception; too many means a new, unreviewed class adopted it without
// updating the table and the budget together.
// ---------------------------------------------------------------------------

for (const [rel, budget] of Object.entries(SCHEMA_ERROR_BUDGET)) {
  const found = schemaErrorLines.get(rel) ?? [];
  if (found.length !== budget) {
    failures += 1;
    console.error(
      `${rel}  [schema-error-budget] declares ${budget} Schema.TaggedError class(es), found ${found.length}` +
        `${found.length > 0 ? ` at line(s) ${found.join(", ")}` : ""}.\n` +
        `    Update SCHEMA_ERROR_BUDGET in scripts/check-house-style.mjs and AGENTS.md §4's table so all three agree.`,
    );
  }
}

for (const [rel, found] of schemaErrorLines) {
  if (rel in SCHEMA_ERROR_BUDGET) continue;
  failures += 1;
  console.error(
    `${rel}:${found.join(", ")}  [schema-error-budget] New Schema.TaggedError class.\n` +
      `    Add it to SCHEMA_ERROR_BUDGET in scripts/check-house-style.mjs and AGENTS.md §4's table, ` +
      `naming which boundary it crosses — a conscious, reviewed opt-in, not a silent grep hit.`,
  );
}

// ---------------------------------------------------------------------------
// AGENTS.md §13 / ADR-QD-017 — a decision result is read once, by `outcomeOf`.
// Checked in both directions like SWITCH_BUDGET above: a new raw read anywhere
// in library source is a second home for the stale-allow rule, and a budgeted
// read disappearing means the table above describes code that moved.
// ---------------------------------------------------------------------------

for (const [rel, budget] of Object.entries(DECISION_READ_BUDGET)) {
  const found = decisionReadLines.get(rel) ?? [];
  if (found.length !== budget) {
    failures += 1;
    console.error(
      `${rel}  [decision-read-budget] declares ${budget} raw decision read(s), found ${found.length}` +
        `${found.length > 0 ? ` at line(s) ${found.join(", ")}` : ""}.\n` +
        `    Update DECISION_READ_BUDGET in scripts/check-house-style.mjs, with the reason, so the two agree.`,
    );
  }
}

for (const [rel, found] of decisionReadLines) {
  if (rel in DECISION_READ_BUDGET) continue;
  failures += 1;
  console.error(
    `${rel}:${found.join(", ")}  [decision-read-budget] Raw read of a decision result's AsyncResult state.\n` +
      `    Read it with outcomeOf (or its projection currentDecision) instead — a waiting result still ` +
      `holds the previous answer, and a failure keeps it as previousSuccess (ADR-QD-017, AGENTS.md §13).`,
  );
}

// A declaration, not a mention: both files name their function in prose too,
// so a bare word match would survive the rename it exists to catch.
for (const [rel, names] of Object.entries(DECISION_READ_BUDGET_NAMES)) {
  const content = readFileSync(join(ROOT, rel), "utf8");
  for (const name of names) {
    if (new RegExp(`\\b(?:const|function)\\s+${name}\\b`).test(content)) continue;
    failures += 1;
    console.error(
      `${rel}  [decision-read-budget-names] DECISION_READ_BUDGET's reason names \`${name}\`, but no ` +
        `such identifier appears in this file any more — renamed without updating the budget's names.`,
    );
  }
}

// ---------------------------------------------------------------------------
// §4 — Data.TaggedError tags carry no "qadi/" prefix, checked across line
// breaks. A per-line regex here would miss `Data.TaggedError(\n  "qadi/X",\n)`
// — most of Errors.ts's classes are written exactly that way — so this reads
// each file's full text with a dotAll regex instead of scanning line by line.
// ---------------------------------------------------------------------------

const TAGGED_ERROR_TAG = /Data\.TaggedError\(\s*["'`]([^"'`]*)["'`]/gs;

for (const file of sources) {
  const rel = relative(ROOT, file);
  const content = readFileSync(file, "utf8");
  for (const m of content.matchAll(TAGGED_ERROR_TAG)) {
    if (m[1].startsWith("qadi/")) {
      failures += 1;
      console.error(
        `${rel}  [no-prefixed-error-tag] Error tags are unprefixed — no "qadi/" ` +
          `(that's for service ids).\n    ${m[0].replace(/\s+/g, " ")}`,
      );
    }
  }
}

// ---------------------------------------------------------------------------
// §4 — Effect.catchTag array form only, checked across line breaks. The
// per-line rule this replaced matched `\.catchTags\s*\(\s*\{` against one line
// at a time and missed `Effect.catchTags(\n  {`, which is how this reads at
// AGENTS.md's own ~90-column hand-wrap width — the exact form the previous
// version's own doc comment claimed it enforced (CCR-QD-104).
// ---------------------------------------------------------------------------

const CATCHTAGS_OBJECT_FORM = /\.catchTags\s*\(\s*\{/g;

for (const file of sources) {
  const rel = relative(ROOT, file);
  const content = readFileSync(file, "utf8");
  for (const m of content.matchAll(CATCHTAGS_OBJECT_FORM)) {
    failures += 1;
    console.error(
      `${rel}  [no-catchtags-object-form] Effect.catchTag array form only — ` +
        `there is no catchTags({...}) here.\n    ${m[0].replace(/\s+/g, " ")}`,
    );
  }
}

// ---------------------------------------------------------------------------
// §1 — effect submodules import via `import * as X from "effect/X"`, checked
// across line breaks. The per-line rule this replaced tested one raw line at
// a time against a pattern requiring `import`, `{...}` and `from "effect/…"`
// all on it, so a named import wrapped across several lines — this codebase's
// own hand-wrap convention for a long specifier list — matched nothing on any
// single line (CCR-QD-104). `[^}]*` already spans newlines; only the `^`
// anchor needed multiline mode to find a match starting on any line, not just
// the file's first.
//
// `import type { X } from "effect/Y"` stays exempt for the same reason as
// before: "type " between `import` and `{` means `\s+\{` never matches right
// after `import`.
// ---------------------------------------------------------------------------

const NAMED_EFFECT_SUBMODULE_IMPORT = /^[ \t]*import\s+\{[^}]*\}\s+from\s+["']effect\/[^"']+["']/gm;

for (const file of sources) {
  const rel = relative(ROOT, file);
  const content = readFileSync(file, "utf8");
  for (const m of content.matchAll(NAMED_EFFECT_SUBMODULE_IMPORT)) {
    failures += 1;
    console.error(
      `${rel}  [no-named-effect-submodule-import] Namespace-import effect ` +
        `submodules: import * as X from "effect/X".\n    ${m[0].replace(/\s+/g, " ")}`,
    );
  }
}

// ---------------------------------------------------------------------------
// ARCH-10 — a test that needs a broken port scripts it from the port's
// description (`scriptedPort`), rather than hand-writing the port's error.
// Checked in both directions like the budgets above.
// ---------------------------------------------------------------------------

for (const [rel, budget] of Object.entries(PORT_DOUBLE_BUDGET)) {
  const found = portDoubleLines.get(rel) ?? [];
  if (found.length !== budget) {
    failures += 1;
    console.error(
      `${rel}  [port-double-budget] declares ${budget} line(s) constructing a port error, found ` +
        `${found.length}${found.length > 0 ? ` at line(s) ${found.join(", ")}` : ""}.\n` +
        `    Update PORT_DOUBLE_BUDGET in scripts/check-house-style.mjs so the two agree.`,
    );
  }
}

for (const [rel, found] of portDoubleLines) {
  if (rel in PORT_DOUBLE_BUDGET) continue;
  failures += 1;
  console.error(
    `${rel}:${found.join(", ")}  [port-double-budget] A test constructs a port error by hand.\n` +
      `    A broken port is \`scriptedPort(<port>Port, () => PortReply.fail(cause)).layer\` ` +
      `(@qadi/core); a test that needs the error as a value is added to PORT_DOUBLE_BUDGET ` +
      `in scripts/check-house-style.mjs with its exact count and reason.`,
  );
}

// ---------------------------------------------------------------------------
// §9 — barrel `export * from` lines are alphabetical (case-sensitive ASCII).
// Only checked on files that are *purely* a barrel: `packages/promise/src/index.ts`
// is deliberately the implementation itself (ADR-QD-032), not a re-export list, so
// it is not one and is skipped.
// ---------------------------------------------------------------------------

const BARREL_LINE = /^export \* from ["'](\.\/[^"']+)["'];?$/;

// A leading doc comment (AGENTS.md's own "one-line summary" guidance
// encourages exactly this) must not silently disable the check for the rest
// of the file — only actual code lines decide whether this is a pure barrel.
const COMMENT_LINE = /^(\/\/|\/\*|\*\/|\*)/;

for (const rel of sources
  .map((file) => relative(ROOT, file))
  .filter((rel) => /(^|\/)index\.tsx?$/.test(rel))) {
  const lines = readFileSync(join(ROOT, rel), "utf8")
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l !== "" && !COMMENT_LINE.test(l));
  const specifiers = lines.map((line) => BARREL_LINE.exec(line)?.[1]);
  if (specifiers.some((s) => s === undefined)) continue; // not a pure barrel — skip

  for (let i = 1; i < specifiers.length; i += 1) {
    if (specifiers[i - 1] > specifiers[i]) {
      failures += 1;
      console.error(
        `${rel}  [barrel-order] "${specifiers[i]}" sorts before "${specifiers[i - 1]}" — ` +
          "keep barrel exports alphabetical (AGENTS.md §9).",
      );
      break;
    }
  }
}

if (failures > 0) {
  console.error(`\n${failures} house-style violation(s). See AGENTS.md.`);
  process.exit(1);
}

console.log(
  `house-style: ${sources.length} file(s) clean ` +
    `(${declaredSwitches} declared switch(es))`,
);
