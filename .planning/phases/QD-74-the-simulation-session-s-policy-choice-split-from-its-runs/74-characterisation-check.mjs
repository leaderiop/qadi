// The check that the simulation session's characterisation still holds the rows it was first committed with.
//
// It parses, with TypeScript's own parse (`typescript/unstable/sync`, over a virtual file system), four files: the
// characterisation and `simulationFixtures.ts` as their first commit holds them (`BASE`), and both as checked out. It
// fails unless:
//   - (statements) every top-level statement of the characterisation other than its imports is, whitespace
//     collapsed and in order, the first commit's, once the first commit's helpers that moved to the fixtures are left
//     out; so a `describe` body, a new statement and a helper kept in place are compared whole, and a declaration
//     added inside a `describe` fails. Leading comments, the header comment among them, are not compared. The
//     multiset of `it(...)` and `it.<member>(...)` calls, each led by the titles of the `describe` calls around it,
//     is compared too, so a changed row is named;
//   - (moved helpers) a helper the first commit declared at top level (a `const`, `let`, `type`, `interface`,
//     `function` or `class`) and the checked-out characterisation does not is declared at top level of the fixtures
//     with its first text once a leading `export` is dropped, or with the text `REVIEWED` gives it; one the
//     characterisation still names is exported there and imported from `../simulationFixtures.ts`; and a top-level
//     name of the first characterisation it reads is not declared apart in the fixtures;
//   - (fixture helpers) a helper the first commit imported from the fixtures, a fixture helper a moved helper reads,
//     and every fixture helper those read, has the text it had in the fixtures at the first commit, and each name such
//     a helper imports comes from the module it came from then;
//   - (imports) every name the characterisation imports comes from the module its first commit imported it from,
//     save a name `IMPORT_MOVES` moves; a name it no longer imports is one a moved helper reads, and the fixtures
//     import it from that module or as `IMPORT_MOVES` moves it; and a name it newly imports is a moved helper;
//   - every `REVIEWED` and `IMPORT_MOVES` entry is used.
// An import, a comment and where a helper is declared may change; a row and what it runs may not. This replaced, in
// code review, the earlier rule that the file equal its first commit once its import statements are dropped, because
// moving the helpers the seeded choice tests share into `simulationFixtures.ts` changes more than imports.
//
// From the repository root:
//   node .planning/phases/QD-74-the-simulation-session-s-policy-choice-split-from-its-runs/74-characterisation-check.mjs
//   node .planning/phases/QD-74-the-simulation-session-s-policy-choice-split-from-its-runs/74-characterisation-check.mjs --self-test
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join, posix } from "node:path";

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

/**
 * Imported names whose module changed, each by its first and current module, as a path from the repository root.
 *
 * `PolicyChoice` and `PolicyMenu`: the session re-exported them from `SimulationSession.ts`, and they are declared in
 * `SeededChoice.ts`, which the session now imports them from and re-exports nothing of. Each is a type, so no row's
 * runtime value can move with it.
 */
const IMPORT_MOVES = {
  PolicyChoice: {
    from: "packages/devtools/src/model/SimulationSession.ts",
    to: "packages/devtools/src/model/SeededChoice.ts",
  },
  PolicyMenu: {
    from: "packages/devtools/src/model/SimulationSession.ts",
    to: "packages/devtools/src/model/SeededChoice.ts",
  },
};

const collapse = (text) => text.replace(/\s+/g, " ").trim();
const unexported = (text) => text.replace(/^export\s+/, "");
const snippet = (text) => (text === undefined ? "nothing" : `«${text.slice(0, 80)}»`);

/** The module a specifier in `file` names: a path from the repository root when relative, else the specifier. */
const moduleOf = (file, specifier) =>
  specifier.startsWith(".") ? posix.normalize(posix.join(posix.dirname(file), specifier)) : specifier;

/** Parses each named text and reads its rows, statements, top-level helpers, imports and the identifiers it names. */
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
      const statements = [];
      const identifiers = new Set();
      const imports = new Map();
      const helpers = new Map();
      const within = [];
      let named = identifiers;
      const visit = (node) => {
        if (isRow(node)) rows.push([...within, collapse(textOf(file, node))].join(" > "));
        if (node.kind === SyntaxKind.Identifier) {
          identifiers.add(node.text);
          named.add(node.text);
        }
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
        const reads = new Set();
        const helper = { text: collapse(unexported(text)), exported: /^export\s/.test(text), reads };
        let declares;
        if (statement.kind === SyntaxKind.VariableStatement) {
          const declarations = statement.declarationList.declarations;
          for (const declaration of declarations) {
            if (declaration.name.kind !== SyntaxKind.Identifier) {
              throw new Error(`${name}: a destructured top-level declaration is not read`);
            }
            if (declarations.length > 1) {
              throw new Error(`${name}: ${declaration.name.text} shares a statement; declare one name per statement`);
            }
            declares = declaration.name.text;
          }
        } else if (NAMED.has(statement.kind) && statement.name !== undefined) {
          declares = statement.name.text;
        }
        if (declares !== undefined) helpers.set(declares, helper);
        statements.push({ text: collapse(text), declares });
        named = reads;
        visit(statement);
        named = identifiers;
        // A helper's own name is not one it reads.
        if (declares !== undefined) reads.delete(declares);
      }
      facts[name] = { rows, statements, identifiers, imports, helpers };
    }
    return facts;
  } finally {
    api.close();
  }
};

/**
 * Every reason the checked-out characterisation does not hold its first commit's rows and what they run.
 *
 * `base` and `head` are the characterisation's facts, `baseFixtures` and `fixtures` the fixtures'.
 */
const problemsOf = ({ base, head, baseFixtures, fixtures }, reviewed, moves) => {
  const problems = [];
  const moved = new Set([...base.helpers.keys()].filter((name) => !head.helpers.has(name)));

  // Statements and rows.
  const counts = new Map();
  for (const row of base.rows) counts.set(row, (counts.get(row) ?? 0) + 1);
  for (const row of head.rows) counts.set(row, (counts.get(row) ?? 0) - 1);
  for (const [row, count] of counts) {
    if (count > 0) problems.push(`a row of the first commit is gone or changed: ${row.slice(0, 120)}`);
    if (count < 0) problems.push(`a row the first commit does not have: ${row.slice(0, 120)}`);
  }
  const expected = base.statements.filter((statement) => !moved.has(statement.declares));
  const length = Math.max(expected.length, head.statements.length);
  for (let index = 0; index < length; index += 1) {
    const first = expected[index]?.text;
    const now = head.statements[index]?.text;
    if (first !== now) {
      problems.push(
        `statement ${index + 1} after the imports is not the first commit's: ` +
          `it had ${snippet(first)}, this has ${snippet(now)}`,
      );
      break;
    }
  }

  // Moved helpers.
  const used = new Set();
  const usedMoves = new Set();
  const movedBy = (name, from, to) => {
    const entry = moves[name];
    if (entry === undefined || entry.from !== from || entry.to !== to) return false;
    usedMoves.add(name);
    return true;
  };
  const fixtureSeeds = [];
  for (const name of moved) {
    const first = base.helpers.get(name);
    const now = fixtures.helpers.get(name);
    if (now === undefined) {
      problems.push(`${name} is declared neither here nor in the fixtures`);
      continue;
    }
    const entry = reviewed[name];
    if (entry !== undefined) used.add(name);
    const text =
      entry === undefined
        ? first.text
        : collapse(unexported(entry.from)) === first.text
          ? collapse(unexported(entry.to))
          : undefined;
    if (text === undefined) problems.push(`${name}'s reviewed first text is not its first commit's`);
    else if (now.text !== text) {
      problems.push(`${name} moved to the fixtures with other text${entry === undefined ? "" : " than reviewed"}`);
    }
    if (head.identifiers.has(name)) {
      if (!now.exported) problems.push(`${name} is named here but not exported by the fixtures`);
      if (head.imports.get(name) !== FIXTURES_SPECIFIER) {
        problems.push(`${name} is named here but not imported from ${FIXTURES_SPECIFIER}`);
      }
    }
    for (const read of first.reads) {
      const specifier = base.imports.get(read);
      if (specifier !== undefined && moduleOf(CHARACTERISATION, specifier) === FIXTURES) {
        fixtureSeeds.push(read);
      } else if (specifier !== undefined) {
        const from = moduleOf(CHARACTERISATION, specifier);
        const current = fixtures.imports.get(read);
        if (current !== undefined) {
          const to = moduleOf(FIXTURES, current);
          if (to !== from && !movedBy(read, from, to)) {
            problems.push(`${read}, which ${name} reads, came from ${from} and the fixtures import it from ${to}`);
          }
        } else if (fixtures.helpers.has(read)) {
          problems.push(`${read}, which ${name} reads, came from ${from} and the fixtures declare it`);
        }
      } else if (base.helpers.has(read) && !moved.has(read) && fixtures.helpers.has(read)) {
        problems.push(`${read}, which ${name} reads, is declared here and apart in the fixtures`);
      }
    }
  }
  for (const name of Object.keys(reviewed)) {
    if (!used.has(name)) problems.push(`REVIEWED names ${name}, which no moved helper needs`);
  }

  // Fixture helpers, from each the first commit imported and each a moved helper reads, through what they read.
  for (const [name, specifier] of base.imports) {
    if (moduleOf(CHARACTERISATION, specifier) === FIXTURES) fixtureSeeds.push(name);
  }
  const queue = [...new Set(fixtureSeeds)].sort();
  const compared = new Set(queue);
  while (queue.length > 0) {
    const name = queue.shift();
    const first = baseFixtures.helpers.get(name);
    const now = fixtures.helpers.get(name);
    if (first === undefined) {
      problems.push(`${name} is not declared in the fixtures of the first commit`);
      continue;
    }
    if (now === undefined) problems.push(`${name} is no longer declared in the fixtures`);
    else if (now.text !== first.text) problems.push(`${name} in the fixtures is not its first commit's text`);
    for (const read of [...first.reads].sort()) {
      if (baseFixtures.helpers.has(read)) {
        if (!compared.has(read)) {
          compared.add(read);
          queue.push(read);
        }
        continue;
      }
      const specifier = baseFixtures.imports.get(read);
      if (specifier === undefined) continue;
      const from = moduleOf(FIXTURES, specifier);
      const current = fixtures.imports.get(read);
      if (current !== undefined && moduleOf(FIXTURES, current) !== from) {
        problems.push(
          `${read}, which ${name} reads, came from ${from} and the fixtures import it from ${moduleOf(FIXTURES, current)}`,
        );
      } else if (current === undefined && fixtures.helpers.has(read)) {
        problems.push(`${read}, which ${name} reads, came from ${from} and the fixtures declare it`);
      }
    }
  }
  for (const [name, specifier] of head.imports) {
    if (specifier !== FIXTURES_SPECIFIER) continue;
    const now = fixtures.helpers.get(name);
    if (!moved.has(name) && (now === undefined || !now.exported)) {
      problems.push(`${name} is imported from ${FIXTURES_SPECIFIER} but not exported by it`);
    }
  }

  // Imports.
  for (const [name, specifier] of base.imports) {
    const from = moduleOf(CHARACTERISATION, specifier);
    const now = head.imports.get(name);
    if (now !== undefined) {
      const to = moduleOf(CHARACTERISATION, now);
      if (to !== from && !movedBy(name, from, to)) {
        problems.push(`${name} came from ${specifier} and is imported from ${now} here`);
      }
      continue;
    }
    if (![...moved].some((helper) => base.helpers.get(helper).reads.has(name))) {
      problems.push(`${name} is no longer imported, and no moved helper reads it`);
    }
  }
  for (const name of head.imports.keys()) {
    if (!base.imports.has(name) && !moved.has(name)) {
      problems.push(`${name} is imported here, and the first commit neither imports nor declares it`);
    }
  }
  for (const name of Object.keys(moves)) {
    if (!usedMoves.has(name)) problems.push(`IMPORT_MOVES names ${name}, which no import needs`);
  }
  return problems;
};

const selfTest = async () => {
  const base = `/** The header. */
import { describe, it } from "@effect/vitest";
import { other } from "./other.ts";
import type { Shape } from "../../src/model/Old.ts";
import { seed } from "${FIXTURES_SPECIFIER}";
const KEYS = [1, 2];
const listed = (v: number): Shape => ({ v, keys: KEYS, s: seed(v) });
type View = { readonly v: number };
it("a row", () => { expect(listed(1)).toEqual({ v: 1, keys: [1, 2] }); });
describe("s", () => { it.effect("another row", () => other(seed(2))); });
`;
  const head = `/** The header, edited. */
import { describe, it } from "@effect/vitest";
import { listed, seed } from "${FIXTURES_SPECIFIER}";
import { other } from "./other.ts";
type View = { readonly v: number };
it("a row", () => {
  expect(listed(1)).toEqual({ v: 1, keys: [1, 2] });
});
describe("s", () => { it.effect("another row", () => other(seed(2))); });
`;
  const baseFixtures = `/** The shared helpers. */
import { double } from "../src/model/Math.ts";
const twice = (v: number) => double(v);
export const seed = (v: number) => twice(v) + 1;
`;
  const fixtures = `/** The shared helpers, and the moved ones. */
import type { Shape } from "../src/model/New.ts";
import { double } from "../src/model/Math.ts";
const twice = (v: number) => double(v);
export const seed = (v: number) => twice(v) + 1;
const KEYS = [1, 2];
export const listed = (v: number): Shape => ({ v, keys: KEYS, s: seed(v) });
`;
  const shapeMoves = {
    Shape: { from: "packages/devtools/src/model/Old.ts", to: "packages/devtools/src/model/New.ts" },
  };
  const reviewedView = { View: { from: "type View = { readonly v: number };", to: "type View = { readonly v: 1 };" } };
  const withoutView = head.replace("type View = { readonly v: number };\n", "");
  const anotherRow = 'it.effect("another row", () => other(seed(2)))';
  const cases = [
    { title: "the first commit itself passes", head: base, fixtures: baseFixtures, moves: {}, problems: [] },
    { title: "an import move, a header edit and an identical helper move pass", problems: [] },
    {
      title: "a row moved to another section fails",
      head: head.replace('describe("s", () => { it.effect', 'describe("t", () => { it.effect'),
      problems: [
        `a row of the first commit is gone or changed: "s" > ${anotherRow}`,
        `a row the first commit does not have: "t" > ${anotherRow}`,
        'statement 3 after the imports is not the first commit\'s: it had «describe("s", () => { it.effect' +
          '("another row", () => other(seed(2))); });», this has «describe("t", () => { it.effect("another row", ' +
          "() => other(seed(2))); });»",
      ],
    },
    {
      title: "a title change fails",
      head: head.replace('"a row"', '"a renamed row"'),
      problems: [
        'a row of the first commit is gone or changed: it("a row", () => { expect(listed(1)).toEqual({ v: 1, ' +
          "keys: [1, 2] }); })",
        'a row the first commit does not have: it("a renamed row", () => { expect(listed(1)).toEqual({ v: 1, ' +
          "keys: [1, 2] }); })",
        'statement 2 after the imports is not the first commit\'s: it had «it("a row", () => { expect(listed(1))' +
          '.toEqual({ v: 1, keys: [1, 2] }); });», this has «it("a renamed row", () => { expect(listed(1)).toEqual' +
          "({ v: 1, keys: [1, 2] }); }»",
      ],
    },
    {
      title: "an expected value change fails",
      head: head.replace("v: 1, keys", "v: 2, keys"),
      problems: [
        'a row of the first commit is gone or changed: it("a row", () => { expect(listed(1)).toEqual({ v: 1, ' +
          "keys: [1, 2] }); })",
        'a row the first commit does not have: it("a row", () => { expect(listed(1)).toEqual({ v: 2, ' +
          "keys: [1, 2] }); })",
        'statement 2 after the imports is not the first commit\'s: it had «it("a row", () => { expect(listed(1))' +
          '.toEqual({ v: 1, keys: [1, 2] }); });», this has «it("a row", () => { expect(listed(1)).toEqual({ v: 2' +
          ", keys: [1, 2] }); });»",
      ],
    },
    {
      title: "a changed moved helper fails",
      fixtures: fixtures.replace("v, keys", "v: v + 1, keys"),
      problems: ["listed moved to the fixtures with other text"],
    },
    {
      title: "a helper changed in place fails",
      head: base.replace("[1, 2];\nconst listed", "[1, 3];\nconst listed"),
      fixtures: baseFixtures,
      moves: {},
      problems: [
        "statement 1 after the imports is not the first commit's: it had «const KEYS = [1, 2];», " +
          "this has «const KEYS = [1, 3];»",
      ],
    },
    {
      title: "a helper declared nowhere fails",
      fixtures: fixtures.replace("const KEYS = [1, 2];\n", ""),
      problems: ["KEYS is declared neither here nor in the fixtures"],
    },
    {
      title: "a moved helper imported from elsewhere fails",
      head: head
        .replace(`import { listed, seed } from "${FIXTURES_SPECIFIER}";`, `import { seed } from "${FIXTURES_SPECIFIER}";`)
        .replace('import { other } from "./other.ts";', 'import { other } from "./other.ts";\nimport { listed } from "./elsewhere.ts";'),
      problems: [`listed is named here but not imported from ${FIXTURES_SPECIFIER}`],
    },
    {
      title: "a moved helper the fixtures do not export fails",
      fixtures: fixtures.replace("export const listed", "const listed"),
      problems: ["listed is named here but not exported by the fixtures"],
    },
    {
      title: "a reviewed text change passes with its exact entry",
      head: withoutView,
      fixtures: `${fixtures}type View = { readonly v: 1 };\n`,
      reviewed: reviewedView,
      problems: [],
    },
    {
      title: "the same text change fails without its entry",
      head: withoutView,
      fixtures: `${fixtures}type View = { readonly v: 1 };\n`,
      problems: ["View moved to the fixtures with other text"],
    },
    {
      title: "an entry no moved helper needs fails",
      reviewed: reviewedView,
      problems: ["REVIEWED names View, which no moved helper needs"],
    },
    {
      title: "a declaration added inside a describe fails",
      head: head.replace('describe("s", () => {', 'describe("s", () => { const seed = (v: number) => v;'),
      problems: [
        'statement 3 after the imports is not the first commit\'s: it had «describe("s", () => { it.effect' +
          '("another row", () => other(seed(2))); });», this has «describe("s", () => { const seed = (v: number) ' +
          '=> v; it.effect("another row", ()»',
      ],
    },
    {
      title: "a statement added at top level fails",
      head: `${head}beforeEach(() => {});\n`,
      problems: ["statement 4 after the imports is not the first commit's: it had nothing, this has «beforeEach(() => {});»"],
    },
    {
      title: "a helper the first commit imported from the fixtures, changed there, fails",
      fixtures: fixtures.replace("twice(v) + 1", "twice(v) + 2"),
      problems: ["seed in the fixtures is not its first commit's text"],
    },
    {
      title: "a fixture helper such a helper reads, changed, fails",
      fixtures: fixtures.replace("const twice = (v: number) => double(v);", "const twice = (v: number) => double(v + 1);"),
      problems: ["twice in the fixtures is not its first commit's text"],
    },
    {
      title: "a name such a helper reads, imported from another module by the fixtures, fails",
      fixtures: fixtures.replace('"../src/model/Math.ts"', '"../src/model/Other.ts"'),
      problems: [
        "double, which twice reads, came from packages/devtools/src/model/Math.ts and the fixtures import it from " +
          "packages/devtools/src/model/Other.ts",
      ],
    },
    {
      title: "an import of the first commit re-pointed fails",
      head: head.replace('"./other.ts"', '"./elsewhere.ts"'),
      problems: ["other came from ./other.ts and is imported from ./elsewhere.ts here"],
    },
    {
      title: "an import of the first commit dropped fails",
      head: head.replace('import { other } from "./other.ts";\n', ""),
      problems: ["other is no longer imported, and no moved helper reads it"],
    },
    {
      title: "an import the first commit does not have fails",
      head: head.replace('import { other } from "./other.ts";', 'import { other } from "./other.ts";\nimport { extra } from "./extra.ts";'),
      problems: ["extra is imported here, and the first commit neither imports nor declares it"],
    },
    {
      title: "a name a moved helper reads, imported by the fixtures from another module, fails",
      fixtures: fixtures.replace('"../src/model/New.ts"', '"../src/model/Wrong.ts"'),
      problems: [
        "Shape, which listed reads, came from packages/devtools/src/model/Old.ts and the fixtures import it from " +
          "packages/devtools/src/model/Wrong.ts",
        "IMPORT_MOVES names Shape, which no import needs",
      ],
    },
    {
      title: "a move no import needs fails",
      moves: { ...shapeMoves, Gone: shapeMoves.Shape },
      problems: ["IMPORT_MOVES names Gone, which no import needs"],
    },
  ];
  const texts = { base, baseFixtures };
  cases.forEach((one, index) => {
    texts[`head${index}`] = one.head ?? head;
    texts[`fixtures${index}`] = one.fixtures ?? fixtures;
  });
  const facts = await readAll(texts);
  const failed = cases.flatMap((one, index) => {
    const problems = problemsOf(
      {
        base: facts.base,
        head: facts[`head${index}`],
        baseFixtures: facts.baseFixtures,
        fixtures: facts[`fixtures${index}`],
      },
      one.reviewed ?? {},
      one.moves ?? shapeMoves,
    );
    const same =
      problems.length === one.problems.length && problems.every((problem, at) => problem === one.problems[at]);
    return same ? [] : [`${one.title}: expected ${JSON.stringify(one.problems)}, got ${JSON.stringify(problems)}`];
  });
  if (failed.length > 0) {
    console.error(`self-test: ${failed.length} failed\n${failed.join("\n")}`);
    process.exit(1);
  }
  console.log(`self-test: ${cases.length} passed`);
};

const main = async () => {
  const root = execFileSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf8" }).trim();
  const first = (path) => execFileSync("git", ["show", `${BASE}:${path}`], { cwd: root, encoding: "utf8" });
  const facts = await readAll({
    base: first(CHARACTERISATION),
    head: readFileSync(join(root, CHARACTERISATION), "utf8"),
    baseFixtures: first(FIXTURES),
    fixtures: readFileSync(join(root, FIXTURES), "utf8"),
  });
  const problems = problemsOf(facts, REVIEWED, IMPORT_MOVES);
  if (problems.length > 0) {
    console.error(`characterisation-check: ${problems.length} problem(s)\n${problems.join("\n")}`);
    process.exit(1);
  }
  const moved = [...facts.base.helpers.keys()].filter((name) => !facts.head.helpers.has(name));
  console.log(
    `characterisation-check: ${facts.head.rows.length} rows and ${facts.head.statements.length} statements ` +
      `as at ${BASE.slice(0, 8)}; ${facts.base.helpers.size - moved.length} helpers kept, ` +
      `${moved.length} moved (${moved.join(", ")})`,
  );
};

if (process.argv.includes("--self-test")) await selfTest();
else await main();
