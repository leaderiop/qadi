/**
 * The module-state budget's scan for `scripts/check-house-style.mjs`, run as a child
 * process of it.
 *
 *   node scripts/lib/module-state-scan.mjs <root> <file>...
 *
 * Reads each file with TypeScript's own parse and prints one line of JSON,
 * `{"bindings":{…},"unparsed":[…]}`: for every file, the `let` and `var` bindings
 * declared outside any function or class body, each as `{ "name": …, "line": … }`, and
 * the files no `packages/<package>/tsconfig.src.json` project contains. A file without
 * such a binding is left out of `bindings`.
 *
 * What it counts is every binding of a `let` or `var` declaration, wherever the
 * statement that holds it sits once a function or class body is left out: `export let`,
 * an indented declaration, one inside a top-level block, a loop's own `let`, and each
 * name of `let a, b` or of a destructuring pattern. It does not count a `const` (or a
 * `using`), because a name that cannot be rebound is not what the budget is about. A
 * `const` holding a mutable container is outside it, and so is a `static` class field
 * and anything a function or method declares.
 *
 * The parent starts this under a timeout, because the TypeScript server behind
 * `typescript/unstable/sync`'s `API` has no timeout of its own: a call that never
 * returns blocks this process, and the parent kills it. A failure to read its
 * arguments, or to load or run the parse, writes the error to stderr and exits 1.
 */
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

const [root, ...files] = process.argv.slice(2);

try {
  const { API } = await import("typescript/unstable/sync");
  const { NodeFlags, SyntaxKind } = await import("typescript/unstable/ast");

  // A function or class body is where a binding stops being module scope: a `let`
  // there is gone when it returns.
  const SCOPES = new Set([
    SyntaxKind.FunctionDeclaration,
    SyntaxKind.FunctionExpression,
    SyntaxKind.ArrowFunction,
    SyntaxKind.MethodDeclaration,
    SyntaxKind.Constructor,
    SyntaxKind.GetAccessor,
    SyntaxKind.SetAccessor,
    SyntaxKind.ClassStaticBlockDeclaration,
  ]);

  /** The identifiers a binding name declares: itself, or each name of a destructuring pattern. */
  const namesOf = (name) =>
    name.kind === SyntaxKind.Identifier
      ? [name.text]
      : name.elements.flatMap((element) =>
          element.kind === SyntaxKind.OmittedExpression ? [] : namesOf(element.name),
        );

  const lineOf = (file, position) => file.text.slice(0, position).split("\n").length;

  const bindingsOf = (file) => {
    const found = [];
    const visit = (node) => {
      if (SCOPES.has(node.kind)) return;
      // `declare let x: T`, or anything inside `declare namespace`, is a type's statement
      // about a global, not state this module holds.
      if ((node.modifiers ?? []).some((modifier) => modifier.kind === SyntaxKind.DeclareKeyword)) {
        return;
      }
      if (
        node.kind === SyntaxKind.VariableDeclarationList &&
        (node.flags & (NodeFlags.Const | NodeFlags.Using)) === 0
      ) {
        for (const declaration of node.declarations) {
          const line = lineOf(file, declaration.getStart(file));
          for (const name of namesOf(declaration.name)) found.push({ name, line });
        }
      }
      node.forEachChild(visit);
    };
    visit(file);
    return found;
  };

  const projects = readdirSync(join(root, "packages"))
    .map((pkg) => join(root, "packages", pkg, "tsconfig.src.json"))
    .filter((config) => existsSync(config));

  const api = new API({ cwd: root });
  try {
    const snapshot = api.updateSnapshot({ openProjects: projects });
    const programs = snapshot.getProjects().map((project) => project.program);
    const bindings = {};
    const unparsed = [];
    for (const path of files) {
      const file = programs
        .map((program) => program.getSourceFile(path))
        .find((one) => one !== undefined);
      if (file === undefined) {
        unparsed.push(path);
        continue;
      }
      const found = bindingsOf(file);
      if (found.length > 0) bindings[path] = found;
    }
    console.log(JSON.stringify({ bindings, unparsed }));
  } finally {
    api.close();
  }
} catch (error) {
  process.stderr.write(String(error));
  process.exitCode = 1;
}
