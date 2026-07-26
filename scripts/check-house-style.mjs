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
    re: /\bas\s+(?:any|unknown|never)\b/,
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

  lines.forEach((raw, index) => {
    // Track multi-line comments so prose in doc blocks never trips a rule.
    const opens = (raw.match(/\/\*/g) ?? []).length;
    const closes = (raw.match(/\*\//g) ?? []).length;
    const wasInComment = inBlockComment;
    inBlockComment = inBlockComment ? closes < opens || closes === 0 : opens > closes;
    if (wasInComment) return;

    const line = strip(raw);
    if (line.trim() === "" || line.trimStart().startsWith("*")) return;

    if (SWITCH.test(line)) {
      const found = switchLines.get(rel) ?? [];
      found.push(index + 1);
      switchLines.set(rel, found);
    }

    for (const rule of RULES) {
      if (exempt.includes(rule.id)) continue;
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

if (failures > 0) {
  console.error(`\n${failures} house-style violation(s). See AGENTS.md.`);
  process.exit(1);
}

console.log(
  `house-style: ${sources.length} file(s) clean ` +
    `(${declaredSwitches} declared switch(es))`,
);
