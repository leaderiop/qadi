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
import { dirname, join, relative } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const OVERVIEW = join(ROOT, "spec", "overview.md");

/**
 * Declaration forms this parser understands.
 */
const DECLARATION = /^export (?:const|class|interface|type|function) ([A-Za-z_$][\w$]*)/;

/** A re-export line in a barrel. Specifiers carry their extension: `./Foo.tsx`. */
const BARREL = /^export \* from "\.\/([^"]+)"/;

/**
 * A named re-export **from another module**: `export type { A, B } from "./C.ts"`.
 *
 * Understood rather than rejected, because the names are on the line — no module
 * resolution is needed to know what this adds to the surface. The form appears
 * where a module is deliberately out of the barrel and only its types are public
 * (`HydrationWarning.ts`, whose ambient-global boundary is not a public surface).
 *
 * The `from` clause is required. `export { foo }` with no source is a different
 * thing — it can publish a locally-declared name that carries no `export`
 * keyword of its own, so `DECLARATION` would never have seen it — and stays
 * unsupported below.
 */
const REEXPORT_FROM = /^export (?:type )?\{([^}]*)\} from "/;

/** One clause of such a list. A rename publishes the name after `as`. */
const REEXPORT_NAME = /^(?:type\s+)?[A-Za-z_$][\w$]*(?:\s+as\s+([A-Za-z_$][\w$]*))?$/;

/**
 * Forms that would make this parser under-report. Encountering one is a hard error
 * rather than a silent miss: a parser that quietly skips an export makes the gate
 * weaker while still printing success, which is the failure mode the gate exists to
 * prevent.
 *
 * `export {` and `export type {` are listed, and `REEXPORT_FROM` is tried first —
 * so only the source-less form, and any list this parser cannot decompose, reaches
 * here.
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
  // used to contain literal NUL bytes as `relationshipResolverFromEdges`'s key
  // separator (CCR-QD-034), which made `grep` treat it as binary and emit nothing
  // at all — a grep-driven version of this check would have lost that module's
  // exports and still reported success. The NUL bytes are gone (the collision the
  // separator was defending against is now closed structurally, via `Data.Class` +
  // `HashSet`, not by choice of delimiter), but `readFileSync` stays: nothing about
  // this checker should depend on what any other file's bytes happen to be.
  const source = readFileSync(file, "utf8");
  const names = new Set();

  for (const [index, line] of source.split("\n").entries()) {
    const reexport = REEXPORT_FROM.exec(line);
    if (reexport) {
      const clauses = reexport[1]
        .split(",")
        .map((clause) => clause.trim())
        .filter((clause) => clause !== "");
      // A clause this regex cannot decompose falls through to UNSUPPORTED
      // below rather than being dropped — under-reporting is the one outcome
      // this parser must not have.
      const parsed = clauses.map((clause) => REEXPORT_NAME.exec(clause));
      if (parsed.every((m) => m !== null)) {
        for (const [i, m] of parsed.entries()) {
          names.add(m[1] ?? clauses[i].replace(/^type\s+/, ""));
        }
        continue;
      }
    }
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
 * Every source file a package publishes as an entry point.
 *
 * Read off the `exports` map's `bun` condition, which is the one that points at
 * source rather than at `lib/`. Assuming `src/index.ts` was the only entry point
 * held for four packages and stopped holding at `@qadi/devtools`, which ships a
 * headless model at `.` and a React dock at `./react`; the dock's exports would
 * have been invisible to this checker and could have drifted indefinitely — the
 * silent omission §15 exists to forbid.
 *
 * A wildcard subpath (`@qadi/http`'s `./*`) names no single file, so it is
 * skipped: it re-exports modules the root barrel already reaches.
 */
const entryPointsOf = ({ dir }) => {
  const packageDir = join(ROOT, "packages", dir);
  const src = join(packageDir, "src");
  const { exports: map } = JSON.parse(readFileSync(join(packageDir, "package.json"), "utf8"));

  const entries = new Set();
  for (const target of collectSourceTargets(map ?? {})) {
    const file = join(packageDir, target);
    if (existsSync(file)) entries.add(file);
  }
  // Every package has one whether or not its manifest spells it out.
  entries.add(join(src, "index.ts"));
  return [...entries];
};

/** The `bun` condition of every non-wildcard subpath in an `exports` map. */
const collectSourceTargets = (map) =>
  Object.entries(map).flatMap(([subpath, condition]) =>
    subpath.includes("*") || condition === null || typeof condition !== "object"
      ? []
      : typeof condition.bun === "string"
        ? [condition.bun]
        : [],
  );

/**
 * The export set of one package, across all of its entry points.
 *
 * Handles both shapes. `@qadi/core` and friends have a barrel of `export * from`
 * lines; `@qadi/promise`'s index *is* the implementation, so a resolver that assumed a
 * barrel would report zero exports for it and pass.
 */
const surfaceOf = (pkg) => {
  const names = new Map();

  for (const index of entryPointsOf(pkg)) {
    const barrel = readFileSync(index, "utf8")
      .split("\n")
      .map((line) => BARREL.exec(line)?.[1])
      .filter((specifier) => specifier !== undefined);

    const from = dirname(index);
    const modules = barrel.length > 0 ? barrel.map((f) => join(from, f)) : [index];
    for (const file of modules) {
      for (const name of exportsOf(file)) names.set(name, relative(ROOT, file));
    }
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
