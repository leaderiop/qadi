#!/usr/bin/env node
/**
 * Fails when the API surface `spec/overview.md` documents and the one the packages
 * actually export disagree.
 *
 * This exists because that document has drifted twice. CCR-QD-025 found it still
 * describing the library as it stood before any of the seven enablers shipped;
 * CCR-QD-034 found ten more exports and a whole package missing six commits later.
 * Nothing connected an export to its documentation, so the connection survived only
 * as long as someone remembered it.
 *
 * Three checks:
 *
 *   1. MISSING  — every export of every public package appears in `overview.md` as a
 *                 backticked token.
 *   2. STALE    — every backticked name in the Export column of the API tables is a
 *                 real export.
 *   3. PACKAGES — every workspace package appears in the Packages table.
 *
 * To leave an export out of the main tables, name it in the "Not listed above" table
 * *inside the document* with a reason. The rule is no **silent** omission, not no
 * omission — and the declaration lives in the document being checked rather than in
 * this file, where a reviewer would never look for it.
 */
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const OVERVIEW = join(ROOT, "spec", "overview.md");

/**
 * Declaration forms this parser understands. Verified exhaustive for this repo: there
 * is no `export { … }`, no `export type { … }`, no `export default` and no
 * `export * as` in any package source, so a line-anchored match captures everything.
 */
const DECLARATION = /^export (?:const|class|interface|type|function) ([A-Za-z_$][\w$]*)/;

/** A re-export line in a barrel. Specifiers carry their extension: `./Foo.tsx`. */
const BARREL = /^export \* from "\.\/([^"]+)"/;

/**
 * Forms that would make this parser under-report. Encountering one is a hard error
 * rather than a silent miss: a parser that quietly skips an export makes the gate
 * weaker while still printing success, which is the failure mode the gate exists to
 * prevent.
 */
const UNSUPPORTED = /^export (?:\{|type \{|default\b|\* as\b)/;

const failures = [];
const fail = (where, message) => failures.push(`${where}  ${message}`);

/**
 * Every workspace package, public or not.
 *
 * Driven by `packages/*&#47;package.json` rather than a glob over `**\/*.ts`, because
 * `.stryker-tmp/` holds full copies of `packages/core/src` between mutation runs and a
 * glob would count them twice.
 */
const packages = readdirSync(join(ROOT, "packages"))
  .map((dir) => {
    const manifest = join(ROOT, "packages", dir, "package.json");
    if (!existsSync(manifest)) return undefined;
    const { name, private: isPrivate } = JSON.parse(readFileSync(manifest, "utf8"));
    return { dir, name, isPrivate: isPrivate === true };
  })
  .filter((p) => p !== undefined);

/** Reads a module and returns the names it exports. */
const exportsOf = (file) => {
  // `readFileSync` rather than a shell tool on purpose. `RelationshipResolver.ts`
  // contains literal NUL bytes — deliberate key separators in
  // `relationshipResolverFromEdges` — which make `grep` treat it as binary and emit
  // nothing at all. A grep-driven version of this check would lose that module's five
  // exports and still report success.
  const source = readFileSync(file, "utf8");
  const names = new Set();

  for (const [index, line] of source.split("\n").entries()) {
    if (UNSUPPORTED.test(line)) {
      fail(
        `${relative(ROOT, file)}:${index + 1}`,
        `[unsupported] this checker only understands declaration-form exports; ` +
          `teach it this form rather than letting it under-report: ${line.trim()}`,
      );
      continue;
    }
    const match = DECLARATION.exec(line);
    if (match) names.add(match[1]);
  }
  return names;
};

/**
 * The export set of one package.
 *
 * Handles both shapes. `@qadi/core` and friends have a barrel of `export * from`
 * lines; `@qadi/promise`'s index *is* the implementation, so a resolver that assumed a
 * barrel would report zero exports for it and pass.
 */
const surfaceOf = ({ dir }) => {
  const src = join(ROOT, "packages", dir, "src");
  const index = join(src, "index.ts");
  const barrel = readFileSync(index, "utf8")
    .split("\n")
    .map((line) => BARREL.exec(line)?.[1])
    .filter((specifier) => specifier !== undefined);

  const modules = barrel.length > 0 ? barrel.map((f) => join(src, f)) : [index];
  const names = new Map();
  for (const file of modules) {
    for (const name of exportsOf(file)) names.set(name, relative(ROOT, file));
  }
  return names;
};

const overview = readFileSync(OVERVIEW, "utf8");

/**
 * Every backticked token in the document, comma-split.
 *
 * Fenced code is stripped first: a name appearing only inside the worked example is
 * demonstrated, not documented, and the API tables are where a reader looks.
 *
 * Backticked rather than bare, and that is load-bearing. `join`, `meet`, `check`,
 * `filter`, `assert`, `size`, `not`, `action`, `resource` and `subject` are ordinary
 * English words in this document's prose, and `AuthSubject`, `Matcher` and `Role`
 * appear as *filenames* (`Matcher.ts`). A bare-word search passes by accident on four
 * of the exports most likely to drift.
 */
const documented = new Set(
  [...overview.replace(/```[\s\S]*?```/g, "").matchAll(/`([^`\n]+)`/g)]
    .flatMap((m) => m[1].split(","))
    .map((token) => token.trim())
    .filter((token) => /^[A-Za-z_$][\w$]*$/.test(token)),
);

// --- 1. Missing -------------------------------------------------------------

let total = 0;
const publicPackages = packages.filter((p) => !p.isPrivate);

for (const pkg of publicPackages) {
  for (const [name, module] of surfaceOf(pkg)) {
    total += 1;
    if (!documented.has(name)) {
      fail(
        `${module}`,
        `[missing] \`${name}\` is exported by ${pkg.name} and is not named in ` +
          `spec/overview.md. Add it to a table, or to "Not listed above" with a reason.`,
      );
    }
  }
}

// --- 2. Stale ---------------------------------------------------------------

const everyExport = new Set(publicPackages.flatMap((p) => [...surfaceOf(p).keys()]));

/** Rows of the tables under `## Public API surface`, first column only. */
const apiSection = overview.split("\n## Public API surface")[1]?.split("\n## ")[0] ?? "";

for (const [index, line] of apiSection.split("\n").entries()) {
  if (!line.startsWith("|") || line.includes("| ---")) continue;
  const cell = line.split("|")[1] ?? "";
  if (cell.trim() === "Export") continue;

  for (const [, name] of cell.matchAll(/`([^`]+)`/g)) {
    for (const token of name.split(",").map((t) => t.trim())) {
      if (!/^[A-Za-z_$][\w$]*$/.test(token)) continue;
      if (!everyExport.has(token)) {
        fail(
          `spec/overview.md`,
          `[stale] \`${token}\` is listed in the API surface and is exported by ` +
            `nothing. Renamed or removed? (near table row ${index + 1} of the section)`,
        );
      }
    }
  }
}

// --- 3. Packages ------------------------------------------------------------

const packageTable = overview.split("\n## Packages")[1]?.split("\n## ")[0] ?? "";
for (const pkg of packages) {
  if (!packageTable.includes(`\`${pkg.name}\``)) {
    fail("spec/overview.md", `[package] ${pkg.name} is missing from the Packages table.`);
  }
}

// --- Report -----------------------------------------------------------------

if (failures.length > 0) {
  for (const line of failures) console.error(line);
  console.error(
    `\n${failures.length} API-surface drift(s). ` +
      `spec/overview.md must name every export of every public package.`,
  );
  process.exit(1);
}

console.log(
  `api-surface: ${total} export(s) documented across ${publicPackages.length} package(s)`,
);
