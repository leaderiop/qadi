#!/usr/bin/env node
/**
 * Enforces the AGENTS.md rules that the linter cannot express.
 *
 * oxlint has no `no-restricted-syntax`, so the bans on async/await, raw
 * Promises, barrel `effect` imports and type assertions are checked here.
 * Deliberately dumb and deterministic: a regex sweep over production source.
 *
 * Scope: packages/<pkg>/src only. Tests and BDD steps are exempt.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;

/**
 * `raw: true` tests the unstripped line. Needed for rules that match inside
 * string literals (import specifiers), which `strip()` blanks out.
 *
 * @type {ReadonlyArray<{ id: string, re: RegExp, message: string, raw?: boolean }>}
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
  },
  {
    id: "no-named-effect-submodule-import",
    // `import type { X } from "effect/Y"` is exempt: "type " between `import`
    // and `{` means `\s+\{` never matches right after `import`, so a type-only
    // named import — which carries no runtime module-shape concern — passes.
    re: /^\s*import\s+\{[^}]*\}\s+from\s+["']effect\/[^"']+["']/,
    message: 'Namespace-import effect submodules: import * as X from "effect/X".',
    raw: true,
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
    id: "no-catchtags-object-form",
    re: /\.catchTags\s*\(\s*\{/,
    message: "Effect.catchTag array form only — there is no catchTags({...}) here.",
  },
  {
    id: "no-effect-ordie",
    re: /\bEffect\.orDie\b/,
    message: "Never Effect.orDie in evaluation/enforcement paths — a decision must not become a defect.",
  },
  {
    id: "no-node-fs-import",
    re: /from\s+["']node:fs["']/,
    message: "Use the FileSystem service, not node:fs directly.",
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
  // exist at that boundary. It is confined to `useDecisionSuspense`; every
  // other hook reads the atom synchronously and needs no Promise at all.
  "packages/react/src/hooks.ts": ["no-raw-promise"],
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
 * The four here all dispatch once per policy node or matcher node per
 * evaluation — and in `filter` and `decideSubjects`, once per element on top of
 * that — with handlers closing over per-call state, so the matcher cannot be
 * hoisted to module scope the way §5a's preferred form requires. Converting
 * them needs a benchmark, which does not exist yet; until it does, the cost is
 * unmeasured and the exception stands.
 *
 * @type {Readonly<Record<string, number>>}
 */
const SWITCH_BUDGET = {
  // `evaluateNode` on `policy._tag`, and `mergeFields` on the `FieldStrategy`
  // literal union — which §5a would otherwise route to `Match.value`.
  "packages/core/src/Evaluate.ts": 2,
  // `evaluateMatcher` on `self._tag`, and `resolveRef` on `ref._tag`.
  "packages/core/src/Matcher.ts": 2,
};

const SWITCH = /\bswitch\s*\(/;

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

/** Recursively collect .ts/.tsx files under a directory. */
const collect = (dir) => {
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
      out.push(...collect(full));
    } else if (/\.tsx?$/.test(full) && !/\.test\.tsx?$|\.test-d\.ts$/.test(full)) {
      out.push(full);
    }
  }
  return out;
};

const packagesDir = join(ROOT, "packages");
const sources = readdirSync(packagesDir).flatMap((pkg) =>
  collect(join(packagesDir, pkg, "src"))
);

/** Strip line comments, block comments and string literals to cut false positives. */
const strip = (line) =>
  line
    .replace(/\/\/.*$/, "")
    .replace(/\/\*.*?\*\//g, "")
    .replace(/"(?:[^"\\]|\\.)*"/g, '""')
    .replace(/'(?:[^'\\]|\\.)*'/g, "''");

let failures = 0;

/** @type {Map<string, number[]>} */
const switchLines = new Map();

for (const file of sources) {
  const rel = relative(ROOT, file);
  const exempt = EXEMPTIONS[rel] ?? [];
  const lines = readFileSync(file, "utf8").split("\n");
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

    if (SWITCH.test(line)) {
      const found = switchLines.get(rel) ?? [];
      found.push(index + 1);
      switchLines.set(rel, found);
    }

    for (const rule of RULES) {
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
