/**
 * The probe guard's parse for `scripts/check-package-install.mjs`, run as a child process
 * of it.
 *
 *   node scripts/lib/probe-guard-parse.mjs <sandbox> <refused-shape probes, as JSON entries>
 *
 * The parent starts this through `scripts/lib/typescript-server-child.mjs` under the same
 * timeout as every other child it starts, because the TypeScript server behind
 * `typescript/unstable/sync`'s `API` has no timeout of its own: a call that never returns
 * blocks this process, and the parent kills it at the timeout and fails, naming the cause.
 * It opens the sandbox's project, reads `consumer.ts` with TypeScript's parse and prints
 * one line of JSON, `{"typed":[…],"refused":[…]}`: the probe names that annotate a declared
 * value outside a refused literal, and the shapes whose literal leads the member paired
 * with them with a `@ts-expect-error`. It prints `null` when the project holds no
 * `consumer.ts`. It writes `server pids: <pid>…` to stderr once the `API` has started its
 * server (`nameServerPids`). A failure to read its arguments, or to load or run the parse,
 * writes the error to stderr and exits 1; the parent reports it naming the installed
 * TypeScript, and decides every check from what this prints.
 */
import { join } from "node:path";
import { nameServerPids } from "./typescript-server-child.mjs";

const [sandbox, probes] = process.argv.slice(2);

try {
  const REFUSED_SHAPE_PROBES = new Map(JSON.parse(probes));
  const { API } = await import("typescript/unstable/sync");
  const {
    isIdentifier,
    isObjectLiteralExpression,
    isPropertyAssignment,
    isTypeReferenceNode,
    isVariableDeclaration,
  } = await import("typescript/unstable/ast/is");
  const { getLeadingCommentRanges } = await import("typescript/unstable/ast/scanner");
  // A comment TypeScript reads as the directive: `//`, `///`, `/*` or `/**`, then `@ts-expect-error`.
  // A wider match cannot pass a refusal the compiler does not see: the refused member then fails it.
  const DIRECTIVE = /^(?:\/|\*)*\s*@ts-expect-error\b/;

  const walk = (file) => {
    const text = file.text;
    const typed = new Set();
    const refused = new Set();

    // True when the declaration's object literal has a property named `member` led by the directive.
    const holdsDirective = (declaration, member) =>
      declaration.initializer !== undefined &&
      isObjectLiteralExpression(declaration.initializer) &&
      declaration.initializer.properties.some(
        (property) =>
          isPropertyAssignment(property) &&
          isIdentifier(property.name) &&
          property.name.text === member &&
          (getLeadingCommentRanges(text, property.pos) ?? []).some((range) =>
            DIRECTIVE.test(text.slice(range.pos, range.end)),
          ),
      );

    const visit = (node, inRefusal) => {
      let inner = inRefusal;
      if (
        isVariableDeclaration(node) &&
        node.type !== undefined &&
        isTypeReferenceNode(node.type) &&
        isIdentifier(node.type.typeName)
      ) {
        const name = node.type.typeName.text;
        const member = REFUSED_SHAPE_PROBES.get(name);
        if (member !== undefined && holdsDirective(node, member)) {
          refused.add(name);
          inner = true;
        } else if (!inRefusal && node.initializer !== undefined) typed.add(name);
      }
      node.forEachChild((child) => {
        visit(child, inner);
      });
    };

    visit(file, false);
    return { typed: [...typed], refused: [...refused] };
  };

  const api = new API({ cwd: sandbox });
  nameServerPids();
  try {
    const file = api
      .updateSnapshot({ openProject: join(sandbox, "tsconfig.json") })
      .getProjects()[0]
      ?.program.getSourceFile(join(sandbox, "consumer.ts"));
    console.log(JSON.stringify(file === undefined ? null : walk(file)));
  } finally {
    api.close();
  }
} catch (error) {
  process.stderr.write(String(error));
  process.exitCode = 1;
}
