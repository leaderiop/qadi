// The check that the simulation session's characterisation still holds the rows it was first committed with.
//
// It parses, with TypeScript's own parse (`typescript/unstable/sync`, over a virtual file system), three files: the
// characterisation as its first commit holds it (`BASE`), the characterisation as checked out, and
// `simulationFixtures.ts` as checked out. It fails unless:
//   - the multiset of every `it(...)` and `it.<member>(...)` call's full text, whitespace collapsed and led by the
//     titles of the `describe` calls around it, is the same in both characterisations, so no row's title, input,
//     expected value, body or section moved;
//   - every helper the first commit declared at top level (a `const`, `let`, `type`, `interface`, `function` or
//     `class`) is either still declared there with the same text, whitespace collapsed, or declared at top level of
//     `simulationFixtures.ts` with that text once a leading `export` is dropped; one the checked-out characterisation
//     still names is exported there and imported from `../simulationFixtures.ts`, and is declared nowhere else;
//   - a moved helper whose text changed is named in `REVIEWED` with its exact first and moved text and a reason, and
//     every `REVIEWED` entry is used.
// An import, the header comment and where a helper is declared may change; a row may not. This replaced, in code
// review, the earlier rule that the file equal its first commit once its import statements are dropped, because
// moving the helpers the seeded choice tests share into `simulationFixtures.ts` changes more than imports.
//
// From the repository root:
//   node .planning/phases/QD-74-the-simulation-session-s-policy-choice-split-from-its-runs/74-characterisation-check.mjs
//   node .planning/phases/QD-74-the-simulation-session-s-policy-choice-split-from-its-runs/74-characterisation-check.mjs --self-test
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const BASE = "e25c8cfdc28cdc797cb1f662615e7c214e9bda2d";
const CHARACTERISATION = "packages/devtools/test/model/SimulationSession.characterisation.test.ts";
const FIXTURES = "packages/devtools/test/simulationFixtures.ts";
const FIXTURES_SPECIFIER = "../simulationFixtures.ts";

/**
 * Moved helpers whose text changed, each by its exact first and moved text.
 *
 * `PolicyView`: its `unseeded` was `ReadonlyArray<string>` in the characterisation and `ReadonlyArray<SimulationField>`
 * in the seeded choice tests' copy. The shared one takes `SimulationField`, the type of `UnseededField.key` that
 * `policyView` maps the snapshot's fields to. It is a type, so no row's runtime value can move with it.
 */
const REVIEWED = {
  PolicyView: {
    from: `type PolicyView =
  | Exclude<PolicyChoice, { readonly _tag: "Seeded" }>
  | {
      readonly _tag: "Seeded";
      readonly entry: TimelineEntry;
      readonly policy: Policy;
      readonly unseeded: ReadonlyArray<string>;
    };`,
    to: `type PolicyView =
  | Exclude<PolicyChoice, { readonly _tag: "Seeded" }>
  | {
      readonly _tag: "Seeded";
      readonly entry: TimelineEntry;
      readonly policy: Policy;
      readonly unseeded: ReadonlyArray<SimulationField>;
    };`,
  },
};

const collapse = (text) => text.replace(/\s+/g, " ").trim();
const unexported = (text) => text.replace(/^export\s+/, "");

/** Parses each named text and reads its rows, top-level helpers, imports and the identifiers it names. */
const readAll = async (texts) => {
  const { API } = await import("typescript/unstable/sync");
  const { createVirtualFileSystem } = await import("typescript/unstable/fs");
  const { SyntaxKind } = await import("typescript/unstable/ast");
  const dir = "/qd74-characterisation-check";
  const names = Object.keys(texts);
  const files = Object.fromEntries(names.map((name) => [`${dir}/${name}.ts`, texts[name]]));
  files[`${dir}/tsconfig.json`] = JSON.stringify({
    files: names.map((name) => `${name}.ts`),
    compilerOptions: { noLib: true, types: [] },
  });
  const api = new API({ cwd: dir, fs: createVirtualFileSystem(files) });
  try {
    const snapshot = api.updateSnapshot({ openProjects: [`${dir}/tsconfig.json`] });
    const program = snapshot.getProjects()[0].program;
    const textOf = (file, node) => file.text.slice(node.getStart(file), node.end);
    const isRow = (node) =>
      node.kind === SyntaxKind.CallExpression &&
      ((node.expression.kind === SyntaxKind.Identifier && node.expression.text === "it") ||
        (node.expression.kind === SyntaxKind.PropertyAccessExpression &&
          node.expression.expression.kind === SyntaxKind.Identifier &&
          node.expression.expression.text === "it"));
    const isDescribe = (node) =>
      node.kind === SyntaxKind.CallExpression &&
      node.expression.kind === SyntaxKind.Identifier &&
      node.expression.text === "describe" &&
      node.arguments.length > 0;
    const NAMED = new Set([
      SyntaxKind.TypeAliasDeclaration,
      SyntaxKind.InterfaceDeclaration,
      SyntaxKind.FunctionDeclaration,
      SyntaxKind.ClassDeclaration,
    ]);
    const facts = {};
    for (const name of names) {
      const file = program.getSourceFile(`${dir}/${name}.ts`);
      if (file === undefined) throw new Error(`no parse for ${name}`);
      const rows = [];
      const identifiers = new Set();
      const imports = new Map();
      const helpers = new Map();
      const within = [];
      const visit = (node) => {
        if (node.kind === SyntaxKind.ImportDeclaration) return;
        if (isRow(node)) rows.push([...within, collapse(textOf(file, node))].join(" > "));
        if (node.kind === SyntaxKind.Identifier) identifiers.add(node.text);
        const block = isDescribe(node);
        if (block) within.push(collapse(textOf(file, node.arguments[0])));
        node.forEachChild(visit);
        if (block) within.pop();
      };
      for (const statement of file.statements) {
        if (statement.kind === SyntaxKind.ImportDeclaration) {
          const specifier = statement.moduleSpecifier.text;
          for (const element of statement.importClause?.namedBindings?.elements ?? []) {
            imports.set(element.name.text, specifier);
          }
          continue;
        }
        const text = textOf(file, statement);
        const helper = { text: collapse(unexported(text)), exported: /^export\s/.test(text) };
        if (statement.kind === SyntaxKind.VariableStatement) {
          const declarations = statement.declarationList.declarations;
          for (const declaration of declarations) {
            if (declaration.name.kind !== SyntaxKind.Identifier) {
              throw new Error(`${name}: a destructured top-level declaration is not read`);
            }
            if (declarations.length > 1) {
              throw new Error(`${name}: ${declaration.name.text} shares a statement; declare one name per statement`);
            }
            helpers.set(declaration.name.text, helper);
          }
        } else if (NAMED.has(statement.kind) && statement.name !== undefined) {
          helpers.set(statement.name.text, helper);
        }
        visit(statement);
      }
      facts[name] = { rows, identifiers, imports, helpers };
    }
    return facts;
  } finally {
    api.close();
  }
};

/** Every reason the checked-out characterisation does not hold its first commit's rows and helpers. */
const problemsOf = ({ base, head, fixtures }, reviewed) => {
  const problems = [];
  const counts = new Map();
  for (const row of base.rows) counts.set(row, (counts.get(row) ?? 0) + 1);
  for (const row of head.rows) counts.set(row, (counts.get(row) ?? 0) - 1);
  for (const [row, count] of counts) {
    if (count > 0) problems.push(`a row of the first commit is gone or changed: ${row.slice(0, 120)}`);
    if (count < 0) problems.push(`a row the first commit does not have: ${row.slice(0, 120)}`);
  }
  const used = new Set();
  for (const [name, first] of base.helpers) {
    const kept = head.helpers.get(name);
    if (kept !== undefined) {
      if (kept.text !== first.text) problems.push(`${name} is still declared here, with other text`);
      continue;
    }
    const moved = fixtures.helpers.get(name);
    if (moved === undefined) {
      problems.push(`${name} is declared neither here nor in the fixtures`);
      continue;
    }
    const entry = reviewed[name];
    if (entry !== undefined) used.add(name);
    const expected =
      entry === undefined
        ? first.text
        : collapse(unexported(entry.from)) === first.text
          ? collapse(unexported(entry.to))
          : undefined;
    if (expected === undefined) problems.push(`${name}'s reviewed first text is not its first commit's`);
    else if (moved.text !== expected) {
      problems.push(`${name} moved to the fixtures with other text${entry === undefined ? "" : " than reviewed"}`);
    }
    if (head.identifiers.has(name)) {
      if (!moved.exported) problems.push(`${name} is named here but not exported by the fixtures`);
      if (head.imports.get(name) !== FIXTURES_SPECIFIER) {
        problems.push(`${name} is named here but not imported from ${FIXTURES_SPECIFIER}`);
      }
    }
  }
  for (const name of Object.keys(reviewed)) {
    if (!used.has(name)) problems.push(`REVIEWED names ${name}, which no moved helper needs`);
  }
  return problems;
};

const selfTest = async () => {
  const base = `/** The header. */
import { it } from "@effect/vitest";
import { other } from "./other.ts";
const KEYS = [1, 2];
const listed = (v: number) => ({ v, keys: KEYS });
type View = { readonly v: number };
it("a row", () => { expect(listed(1)).toEqual({ v: 1, keys: [1, 2] }); });
it.effect("another row", () => other(2));
`;
  const moved = `/** The header, edited. */
import { it } from "@effect/vitest";
import { listed } from "${FIXTURES_SPECIFIER}";
import { other } from "./other.ts";
type View = { readonly v: number };
it("a row", () => {
  expect(listed(1)).toEqual({ v: 1, keys: [1, 2] });
});
it.effect("another row", () => other(2));
`;
  const fixtures = `const KEYS = [1, 2];
export const listed = (v: number) => ({ v, keys: KEYS });
`;
  const reviewedView = { View: { from: "type View = { readonly v: number };", to: "type View = { readonly v: 1 };" } };
  const cases = [
    { title: "the first commit itself passes", head: base, fixtures: "", pass: true },
    { title: "an import move, a header edit and an identical helper move pass", head: moved, fixtures, pass: true },
    {
      title: "a row moved to another section fails",
      head: moved.replace('it.effect("another row", () => other(2));', 'describe("s", () => { it.effect("another row", () => other(2)); });'),
      fixtures,
      pass: false,
    },
    { title: "a title change fails", head: moved.replace('"a row"', '"a renamed row"'), fixtures, pass: false },
    { title: "an expected value change fails", head: moved.replace("v: 1, keys", "v: 2, keys"), fixtures, pass: false },
    { title: "a changed moved helper fails", head: moved, fixtures: fixtures.replace("v, keys", "v: v + 1, keys"), pass: false },
    { title: "a helper changed in place fails", head: base.replace("[1, 2];\nconst listed", "[1, 3];\nconst listed"), fixtures: "", pass: false },
    { title: "a helper declared nowhere fails", head: moved, fixtures: "const KEYS = [1, 2];\n", pass: false },
    {
      title: "a moved helper imported from elsewhere fails",
      head: moved.replace(`import { listed } from "${FIXTURES_SPECIFIER}";`, 'import { listed } from "./elsewhere.ts";'),
      fixtures,
      pass: false,
    },
    { title: "a moved helper the fixtures do not export fails", head: moved, fixtures: fixtures.replace("export ", ""), pass: false },
    {
      title: "a reviewed text change passes with its exact entry",
      head: moved.replace("type View = { readonly v: number };\n", ""),
      fixtures: `${fixtures}type View = { readonly v: 1 };\n`,
      reviewed: reviewedView,
      pass: true,
    },
    {
      title: "the same text change fails without its entry",
      head: moved.replace("type View = { readonly v: number };\n", ""),
      fixtures: `${fixtures}type View = { readonly v: 1 };\n`,
      pass: false,
    },
    { title: "an entry no moved helper needs fails", head: moved, fixtures, reviewed: reviewedView, pass: false },
  ];
  const texts = { base };
  cases.forEach((one, index) => {
    texts[`head${index}`] = one.head;
    texts[`fixtures${index}`] = one.fixtures;
  });
  const facts = await readAll(texts);
  const failed = cases.flatMap((one, index) => {
    const problems = problemsOf(
      { base: facts.base, head: facts[`head${index}`], fixtures: facts[`fixtures${index}`] },
      one.reviewed ?? {},
    );
    return (problems.length === 0) === one.pass ? [] : [`${one.title}: ${problems.join("; ") || "passed"}`];
  });
  if (failed.length > 0) {
    console.error(`self-test: ${failed.length} failed\n${failed.join("\n")}`);
    process.exit(1);
  }
  console.log(`self-test: ${cases.length} passed`);
};

const main = async () => {
  const root = execFileSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf8" }).trim();
  const facts = await readAll({
    base: execFileSync("git", ["show", `${BASE}:${CHARACTERISATION}`], { cwd: root, encoding: "utf8" }),
    head: readFileSync(join(root, CHARACTERISATION), "utf8"),
    fixtures: readFileSync(join(root, FIXTURES), "utf8"),
  });
  const problems = problemsOf(facts, REVIEWED);
  if (problems.length > 0) {
    console.error(`characterisation-check: ${problems.length} problem(s)\n${problems.join("\n")}`);
    process.exit(1);
  }
  const moved = [...facts.base.helpers.keys()].filter((name) => !facts.head.helpers.has(name));
  console.log(
    `characterisation-check: ${facts.head.rows.length} rows as at ${BASE.slice(0, 8)}; ` +
      `${facts.base.helpers.size - moved.length} helpers kept, ${moved.length} moved (${moved.join(", ")})`,
  );
};

if (process.argv.includes("--self-test")) await selfTest();
else await main();
