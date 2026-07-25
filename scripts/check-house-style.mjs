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
    re: /\bnew\s+Promise\s*\(|\.then\s*\(/,
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
};

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

if (failures > 0) {
  console.error(`\n${failures} house-style violation(s). See AGENTS.md.`);
  process.exit(1);
}

console.log(`house-style: ${sources.length} file(s) clean`);
