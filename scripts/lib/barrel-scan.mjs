/**
 * The named-barrel rule's parse for `scripts/check-house-style.mjs`, run as a child
 * process of it.
 *
 *   node scripts/lib/barrel-scan.mjs <dir> <file>...
 *
 * Reads each `<dir>/<file>` with TypeScript's own parse, through the `tsconfig.json` the
 * parent wrote into `<dir>`, and prints one line of JSON: for every file, in the order
 * given, its top-level statements, each as one of
 *
 *   { "line", "form": "group", "typeOnly", "specifier", "names": [{ "name", "typeOnly" }] }
 *   { "line", "form": "star", "specifier" }
 *   { "line", "form": "other", "what" }
 *
 * A `group` is `export { … } from "…"` or `export type { … } from "…"`: `typeOnly` is the
 * `type` keyword of the whole group, and each name carries its own inline `type` modifier.
 * A `star` is `export * from "…"` or `export * as ns from "…"`. Anything else is `other`,
 * with a few words saying what it is, so the rule can name it.
 *
 * The parent writes the texts it judges (the real indexes and the plants of its self-test)
 * into a temporary project rather than handing over paths, because a planted text exists
 * nowhere on disk. It starts this through `scripts/lib/typescript-server-child.mjs` under a
 * timeout, because the TypeScript server behind `typescript/unstable/sync`'s `API` has no
 * timeout of its own: a call that never returns blocks this process, and the parent kills
 * it and the server, which this process names on stderr once it has started. A failure to
 * read its arguments, or to load or run the parse, writes the error to stderr and exits 1.
 */
import { join } from "node:path";
import { nameServerPids } from "./typescript-server-child.mjs";

const [dir, ...files] = process.argv.slice(2);

try {
  if (dir === undefined || files.length === 0) throw new Error("usage: barrel-scan.mjs <dir> <file>...");
  const { API } = await import("typescript/unstable/sync");
  const { SyntaxKind } = await import("typescript/unstable/ast");

  /** A few words naming a statement that is not a module group, for the rule's message. */
  const whatOf = (statement) => {
    if (statement.kind === SyntaxKind.ImportDeclaration) return "an import declaration";
    if (statement.kind === SyntaxKind.ImportEqualsDeclaration) return "an import declaration";
    if (statement.kind === SyntaxKind.ExportDeclaration) return "an export with no from clause";
    if (statement.kind === SyntaxKind.ExportAssignment) return "an export assignment";
    return "a declaration or statement of its own";
  };

  const statementOf = (file, statement) => {
    const line = file.text.slice(0, statement.getStart(file)).split("\n").length;
    const specifier = statement.moduleSpecifier?.text;
    if (statement.kind === SyntaxKind.ExportDeclaration && typeof specifier === "string") {
      const clause = statement.exportClause;
      if (clause === undefined || clause.kind === SyntaxKind.NamespaceExport) {
        return { line, form: "star", specifier };
      }
      return {
        line,
        form: "group",
        typeOnly: statement.isTypeOnly === true,
        specifier,
        names: clause.elements.map((element) => ({
          name: element.name.text,
          typeOnly: element.isTypeOnly === true,
        })),
      };
    }
    return { line, form: "other", what: whatOf(statement) };
  };

  const api = new API({ cwd: dir });
  nameServerPids();
  try {
    const program = api
      .updateSnapshot({ openProject: join(dir, "tsconfig.json") })
      .getProjects()[0]?.program;
    const scanned = files.map((name) => {
      const file = program?.getSourceFile(join(dir, name));
      if (file === undefined) throw new Error(`the project holds no ${name}`);
      return file.statements.map((statement) => statementOf(file, statement));
    });
    console.log(JSON.stringify(scanned));
  } finally {
    api.close();
  }
} catch (error) {
  process.stderr.write(String(error));
  process.exitCode = 1;
}
