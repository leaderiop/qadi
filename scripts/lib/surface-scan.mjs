/**
 * One entry point's exports, as a consumer of the built declarations sees them, for
 * `scripts/surface-diff.mjs`, run as a child process of it.
 *
 *   node scripts/lib/surface-scan.mjs <entry.d.ts>
 *
 * Opens the declaration file as a project of its own and prints one line of JSON,
 * `{"exports":[{"name":…,"kind":…},…]}`, sorted by name with an ASCII comparison. `kind` is
 * `type` for a name a consumer can only use as a type (an interface, an alias, or any export
 * reached through an `export type` or `import type` hop, whatever it declares), `value` for
 * one with only a value meaning, and `both` for a class, an enum, or a const and a type of
 * one name: the declarations a consumer can `new`, call or read and also annotate with.
 *
 * The walk follows each export's alias chain one hop at a time, because the flag that makes
 * a class type-only is on the `export type { C } from "…"` declaration and not on its
 * specifier, and the checker's own flags for the final symbol say it is a class either way.
 * An export that does not resolve is a refusal naming it, never a name left out.
 *
 * The parent starts this through `scripts/lib/typescript-server-child.mjs` under a timeout,
 * because the TypeScript server behind `typescript/unstable/sync`'s `API` has no timeout of
 * its own: a call that never returns blocks this process, and the parent kills it and the
 * server, which this process names on stderr once it has started. A failure to read its
 * argument, or to load or run the scan, writes the error to stderr and exits 1.
 */
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { nameServerPids } from "./typescript-server-child.mjs";

const [entry] = process.argv.slice(2);
// A temporary project outside the repository: the repository's own tsconfig files do not
// include a built `lib/` entry, and a declaration file needs no more than these options.
const scratch = mkdtempSync(join(tmpdir(), "surface-scan-"));

try {
  if (entry === undefined) throw new Error("usage: surface-scan.mjs <entry.d.ts>");
  const { API, SymbolFlags } = await import("typescript/unstable/sync");
  const { SyntaxKind } = await import("typescript/unstable/ast");

  const tsconfig = join(scratch, "tsconfig.json");
  writeFileSync(
    tsconfig,
    JSON.stringify({
      files: [resolve(entry)],
      compilerOptions: {
        noEmit: true,
        skipLibCheck: true,
        module: "nodenext",
        moduleResolution: "nodenext",
        target: "esnext",
        types: [],
        strict: true,
      },
    }),
  );

  const HOPS = new Set([
    SyntaxKind.ExportSpecifier,
    SyntaxKind.ImportSpecifier,
    SyntaxKind.ImportClause,
    SyntaxKind.NamespaceExport,
    SyntaxKind.NamespaceImport,
  ]);

  // `export { type C }` and `import { type C }` carry the flag on the specifier;
  // `export type { C } from "…"` and `import type { C }` carry it on the declaration or
  // the import clause, two levels up.
  const typeOnlyHop = (node) =>
    HOPS.has(node.kind) &&
    (node.isTypeOnly === true ||
      node.parent?.isTypeOnly === true ||
      node.parent?.parent?.isTypeOnly === true);

  const api = new API({ cwd: scratch });
  nameServerPids();
  try {
    const snapshot = api.updateSnapshot({ openProjects: [tsconfig] });
    const project = snapshot.getProjects()[0];
    const { checker, program } = project;
    const file = program.getSourceFile(resolve(entry));
    if (file === undefined) throw new Error(`${entry} is not in the project`);
    const moduleSymbol = checker.getSymbolAtLocation(file);
    if (moduleSymbol === undefined) throw new Error(`${entry} is not a module`);

    const exports = checker.getExportsOfModule(moduleSymbol).map((symbol) => {
      let typeOnly = false;
      let current = symbol;
      while ((current.flags & SymbolFlags.Alias) !== 0) {
        for (const declaration of current.declarations) {
          const node = declaration.resolve(project);
          if (node !== undefined && typeOnlyHop(node)) typeOnly = true;
        }
        const next = checker.getImmediateAliasedSymbol(current);
        if (next === undefined || checker.isUnknownSymbol(next)) {
          throw new Error(`${entry}: the export ${symbol.name} does not resolve`);
        }
        current = next;
      }
      const value = (current.flags & SymbolFlags.Value) !== 0;
      const type = (current.flags & SymbolFlags.Type) !== 0;
      const kind = typeOnly ? "type" : value && type ? "both" : value ? "value" : "type";
      return { name: symbol.name, kind };
    });
    exports.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
    console.log(JSON.stringify({ exports }));
  } finally {
    api.close();
  }
} catch (error) {
  process.stderr.write(String(error));
  process.exitCode = 1;
} finally {
  rmSync(scratch, { recursive: true, force: true });
}
