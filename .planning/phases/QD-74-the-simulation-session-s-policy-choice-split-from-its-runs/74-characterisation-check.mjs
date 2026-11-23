// The check that the simulation session's characterisation still holds the rows it was first committed with.
//
// It parses, with TypeScript's own parse (`typescript/unstable/sync`, over a virtual file system), four files: the
// characterisation and `simulationFixtures.ts` as their first commit holds them (`BASE`), and both as checked out.
// It reads an import in every form, named, namespace, default and one that binds no name, and each binding by its
// local name, the name it imports, its module as a path from the repository root and whether it imports a type. It
// fails unless:
//   - (statements) every top-level statement of the characterisation other than its imports is, whitespace
//     collapsed and in order, the first commit's, once the first commit's helpers that moved to the fixtures are left
//     out; so a `describe` body, a new statement and a helper kept in place are compared whole, and a declaration
//     added inside a `describe` fails. Leading comments, the header comment among them, are not compared. The
//     multiset of `it(...)` and `it.<member>(...)` calls, each led by the titles of the `describe` calls around it,
//     is compared too, so a changed row is named;
//   - (moved helpers) a helper the first commit declared at top level (a `const`, `let`, `type`, `interface`,
//     `function` or `class`) and the checked-out characterisation does not is declared at top level of the fixtures
//     with its first text once a leading `export` is dropped, or with the text `REVIEWED` gives it; and one the
//     characterisation still names is exported there and imported under its own name from `../simulationFixtures.ts`;
//   - (fixture helpers) a helper the first commit imported from the fixtures, a fixture helper a moved helper reads,
//     and every fixture helper those read, has the text it had in the fixtures at the first commit, `export` included;
//   - (what a compared helper reads) every other name a moved or fixture helper reads is one the fixtures provide as
//     the first commit provided it: an import binds the same name of the same module, and imports a type only if it
//     did, save a module `IMPORT_MOVES` moves; a name the first commit neither imported nor declared is neither
//     imported nor declared now; and a name the characterisation still declares fails, since the fixtures cannot
//     reach it. A name is read as an identifier, so a property name counts too, and the rule errs on the strict side;
//   - (the fixtures' statements) every top-level statement of the fixtures is an import or a declaration of one
//     name, a `const`, a function, a type or an interface; a `const` none of the rules above compares runs nothing as
//     the module loads, its initialiser being a function, a literal, a name, or an array or object literal of those;
//     and every module the fixtures load, by an import that is not `import type`, is one the two files loaded at the
//     first commit;
//   - (imports) every binding the characterisation imports is the first commit's, alike in the name it imports, its
//     module and whether it imports a type, save a module `IMPORT_MOVES` moves; a name it no longer imports is one a
//     moved helper reads; a name it newly imports is a moved helper; and its imports that bind no name are the first
//     commit's, in order;
//   - every `REVIEWED` and `IMPORT_MOVES` entry is used.
// The order of the imports that bind a name is not compared. An import, a comment and where a helper is declared may
// change; a row and what it runs may not. This replaced, in code review, the earlier rule that the file equal its
// first commit once its import statements are dropped, because moving the helpers the seeded choice tests share into
// `simulationFixtures.ts` changes more than imports.
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

/** How a name a compared helper reads was provided, when the first commit did not import it. */
const KEPT = "declared in the characterisation";
const FREE = "neither imported nor declared";

const collapse = (text) => text.replace(/\s+/g, " ").trim();
const unexported = (text) => text.replace(/^export\s+/, "");
const snippet = (text) => (text === undefined ? "nothing" : `«${text.slice(0, 80)}»`);
const modules = (list) => (list.length === 0 ? "none" : list.join(", "));

/** The module a specifier in `file` names: a path from the repository root when relative, else the specifier. */
const moduleOf = (file, specifier) =>
  specifier.startsWith(".") ? posix.normalize(posix.join(posix.dirname(file), specifier)) : specifier;

/** An import binding as it would be written, with its module as a path from the repository root. */
const shown = (local, { module, imported, type }) => {
  const named = imported === local ? local : `${imported} as ${local}`;
  return `${type ? "type " : ""}${imported === "*" ? `* as ${local}` : `{ ${named} }`} from ${module}`;
};

/**
 * Parses each text and reads its rows, statements, top-level helpers, imports and the identifiers it names.
 *
 * `texts` maps a name to the file's path from the repository root and its text; the path resolves its specifiers.
 */
const readAll = async (texts) => {
  const { API } = await import("typescript/unstable/sync");
  const { createVirtualFileSystem } = await import("typescript/unstable/fs");
  const { NodeFlags, SyntaxKind } = await import("typescript/unstable/ast");
  const dir = "/qd74-characterisation-check";
  const names = Object.keys(texts);
  const files = Object.fromEntries(names.map((name) => [`${dir}/${name}.ts`, texts[name].text]));
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
    // An expression that runs nothing when it is evaluated: a function's body runs only when it is called.
    const INERT = new Set([
      SyntaxKind.ArrowFunction,
      SyntaxKind.FunctionExpression,
      SyntaxKind.Identifier,
      SyntaxKind.StringLiteral,
      SyntaxKind.NumericLiteral,
      SyntaxKind.BigIntLiteral,
      SyntaxKind.NoSubstitutionTemplateLiteral,
      SyntaxKind.TrueKeyword,
      SyntaxKind.FalseKeyword,
      SyntaxKind.NullKeyword,
    ]);
    const WRAPPERS = new Set([
      SyntaxKind.ParenthesizedExpression,
      SyntaxKind.AsExpression,
      SyntaxKind.SatisfiesExpression,
    ]);
    const DEFINED = new Set([SyntaxKind.MethodDeclaration, SyntaxKind.GetAccessor, SyntaxKind.SetAccessor]);
    const isInert = (node) => {
      if (INERT.has(node.kind)) return true;
      if (WRAPPERS.has(node.kind)) return isInert(node.expression);
      if (node.kind === SyntaxKind.PrefixUnaryExpression) {
        return node.operator === SyntaxKind.MinusToken && node.operand.kind === SyntaxKind.NumericLiteral;
      }
      if (node.kind === SyntaxKind.ArrayLiteralExpression) return node.elements.every(isInert);
      if (node.kind !== SyntaxKind.ObjectLiteralExpression) return false;
      return node.properties.every(
        (property) =>
          property.name?.kind !== SyntaxKind.ComputedPropertyName &&
          ((property.kind === SyntaxKind.PropertyAssignment && isInert(property.initializer)) ||
            (property.kind === SyntaxKind.ShorthandPropertyAssignment &&
              property.objectAssignmentInitializer === undefined) ||
            DEFINED.has(property.kind)),
      );
    };
    const facts = {};
    for (const name of names) {
      const { path } = texts[name];
      const file = program.getSourceFile(`${dir}/${name}.ts`);
      const rows = [];
      const statements = [];
      const identifiers = new Set();
      // Each binding by its local name; the modules imports that bind no name load, in order; the modules value
      // imports load; and the statements that are neither an import nor a declaration the fixtures may hold.
      const imports = new Map();
      const effects = [];
      const loads = new Set();
      const loose = [];
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
          const module = moduleOf(path, statement.moduleSpecifier.text);
          const clause = statement.importClause;
          const typeOnly = clause?.phaseModifier === SyntaxKind.TypeKeyword;
          const bindings = clause?.namedBindings;
          const elements = bindings?.kind === SyntaxKind.NamedImports ? bindings.elements : [];
          const bind = (local, imported, type) => imports.set(local, { module, imported, type: typeOnly || type });
          if (clause?.name !== undefined) bind(clause.name.text, "default", false);
          if (bindings?.kind === SyntaxKind.NamespaceImport) bind(bindings.name.text, "*", false);
          for (const element of elements) {
            bind(element.name.text, (element.propertyName ?? element.name).text, element.isTypeOnly);
          }
          if (!typeOnly) loads.add(module);
          if (!typeOnly && clause?.name === undefined && bindings?.kind !== SyntaxKind.NamespaceImport) {
            if (elements.length === 0) effects.push(module);
          }
          continue;
        }
        const text = textOf(file, statement);
        const reads = new Set();
        let declares;
        let allowed = false;
        let inert = true;
        if (statement.kind === SyntaxKind.VariableStatement) {
          const list = statement.declarationList;
          const [only] = list.declarations;
          if (list.declarations.length === 1 && only.name.kind === SyntaxKind.Identifier) {
            declares = only.name.text;
            const scope = list.flags & (NodeFlags.Let | NodeFlags.Const | NodeFlags.Using);
            allowed = scope === NodeFlags.Const;
            inert = !allowed || only.initializer === undefined || isInert(only.initializer);
          }
        } else if (NAMED.has(statement.kind) && statement.name !== undefined) {
          declares = statement.name.text;
          allowed = statement.kind !== SyntaxKind.ClassDeclaration;
        }
        if (declares !== undefined) {
          const exported = /^export\s/.test(text);
          helpers.set(declares, { text: collapse(text), body: collapse(unexported(text)), exported, reads, inert });
        }
        if (!allowed) loose.push(collapse(text));
        statements.push({ text: collapse(text), declares });
        named = reads;
        visit(statement);
        named = identifiers;
        // A helper's own name is not one it reads.
        if (declares !== undefined) reads.delete(declares);
      }
      facts[name] = { rows, statements, identifiers, imports, effects, loads, loose, helpers };
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

  // Whether two bindings of one local name import the same name of the same module, alike in kind, or of the module
  // `IMPORT_MOVES` moves it to.
  const usedMoves = new Set();
  const alike = (local, first, now) => {
    if (first.imported !== now.imported || first.type !== now.type) return false;
    if (first.module === now.module) return true;
    const entry = moves[local];
    if (entry === undefined || entry.from !== first.module || entry.to !== now.module) return false;
    usedMoves.add(local);
    return true;
  };
  // A name a compared helper reads, provided by the fixtures as the first commit provided it: imported alike when it
  // was imported (`first`), neither imported nor declared when it was neither (`was` is `FREE`), and never when the
  // characterisation still declares it (`was` is `KEPT`).
  const provided = (read, name, first, was) => {
    const now = fixtures.imports.get(read);
    const declared = fixtures.helpers.has(read);
    const holds =
      first !== undefined ? now !== undefined && alike(read, first, now) : was === FREE && now === undefined && !declared;
    if (holds) return;
    const before = first !== undefined ? `imported as \`${shown(read, first)}\`` : was;
    const after =
      now !== undefined
        ? `import it as \`${shown(read, now)}\``
        : declared
          ? "declare it"
          : "neither import nor declare it";
    problems.push(`${read}, which ${name} reads, was ${before} and the fixtures ${after}`);
  };

  // Moved helpers.
  const used = new Set();
  const seeds = [];
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
        ? first.body
        : collapse(unexported(entry.from)) === first.body
          ? collapse(unexported(entry.to))
          : undefined;
    if (text === undefined) problems.push(`${name}'s reviewed first text is not its first commit's`);
    else if (now.body !== text) {
      problems.push(`${name} moved to the fixtures with other text${entry === undefined ? "" : " than reviewed"}`);
    }
    if (head.identifiers.has(name)) {
      if (!now.exported) problems.push(`${name} is named here but not exported by the fixtures`);
      const binding = head.imports.get(name);
      if (binding?.module !== FIXTURES || binding.imported !== name) {
        problems.push(`${name} is named here but not imported as itself from ${FIXTURES_SPECIFIER}`);
      }
    }
    for (const read of first.reads) {
      const binding = base.imports.get(read);
      if (binding?.module === FIXTURES) seeds.push(binding.imported);
      else if (binding !== undefined) provided(read, name, binding);
      else if (!moved.has(read)) provided(read, name, undefined, base.helpers.has(read) ? KEPT : FREE);
    }
  }
  for (const name of Object.keys(reviewed)) {
    if (!used.has(name)) problems.push(`REVIEWED names ${name}, which no moved helper needs`);
  }

  // Fixture helpers, from each the first commit imported and each a moved helper reads, through what they read. The
  // first commit compiled, so its fixtures declare every name this walk reaches.
  for (const binding of base.imports.values()) {
    if (binding.module === FIXTURES) seeds.push(binding.imported);
  }
  const queue = [...new Set(seeds)].sort();
  const walked = new Set(queue);
  while (queue.length > 0) {
    const name = queue.shift();
    const first = baseFixtures.helpers.get(name);
    const now = fixtures.helpers.get(name);
    if (now === undefined) problems.push(`${name} is no longer declared in the fixtures`);
    else if (now.text !== first.text) problems.push(`${name} in the fixtures is not its first commit's text`);
    for (const read of [...first.reads].sort()) {
      if (!baseFixtures.helpers.has(read)) provided(read, name, baseFixtures.imports.get(read), FREE);
      else if (!walked.has(read)) {
        walked.add(read);
        queue.push(read);
      }
    }
  }

  // The fixtures' statements, and the modules they load.
  for (const text of fixtures.loose) {
    problems.push(`a top-level statement of the fixtures is not an import or a declaration of one name: ${snippet(text)}`);
  }
  for (const [name, helper] of fixtures.helpers) {
    if (!helper.inert && !moved.has(name) && !walked.has(name)) {
      problems.push(`${name} in the fixtures runs code as the module loads, and no first commit's text pins it`);
    }
  }
  const loadedFirst = new Set([...base.loads, ...baseFixtures.loads]);
  for (const module of fixtures.loads) {
    if (!loadedFirst.has(module)) problems.push(`the fixtures load ${module}, which neither file loaded at the first commit`);
  }

  // Imports.
  for (const [name, first] of base.imports) {
    const now = head.imports.get(name);
    if (now !== undefined) {
      if (!alike(name, first, now)) {
        problems.push(`${name} was imported as \`${shown(name, first)}\` and is imported as \`${shown(name, now)}\` here`);
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
  if (modules(base.effects) !== modules(head.effects)) {
    problems.push(`the imports that bind no name were ${modules(base.effects)} and are ${modules(head.effects)} here`);
  }
  for (const name of Object.keys(moves)) {
    if (!usedMoves.has(name)) problems.push(`IMPORT_MOVES names ${name}, which no import needs`);
  }
  return problems;
};

const selfTest = async () => {
  const base = `/** The header. */
import { describe, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import "./polyfill.ts";
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
import * as Effect from "effect/Effect";
import "./polyfill.ts";
import { listed, seed } from "${FIXTURES_SPECIFIER}";
import { other } from "./other.ts";
type View = { readonly v: number };
it("a row", () => {
  expect(listed(1)).toEqual({ v: 1, keys: [1, 2] });
});
describe("s", () => { it.effect("another row", () => other(seed(2))); });
`;
  const baseFixtures = `/** The shared helpers. */
import * as Clock from "effect/testing/TestClock";
import { double } from "../src/model/Math.ts";
const twice = (v: number) => double(v);
export const seed = (v: number) => Clock.adjust(twice(v) + 1);
`;
  const fixtures = `/** The shared helpers, and the moved ones. */
import type { Shape } from "../src/model/New.ts";
import * as Clock from "effect/testing/TestClock";
import { double } from "../src/model/Math.ts";
const twice = (v: number) => double(v);
export const seed = (v: number) => Clock.adjust(twice(v) + 1);
const KEYS = [1, 2];
export const listed = (v: number): Shape => ({ v, keys: KEYS, s: seed(v) });
`;
  const shapeMoves = {
    Shape: { from: "packages/devtools/src/model/Old.ts", to: "packages/devtools/src/model/New.ts" },
  };
  const reviewedView = { View: { from: "type View = { readonly v: number };", to: "type View = { readonly v: 1 };" } };
  const withoutView = head.replace("type View = { readonly v: number };\n", "");
  // `KEYS` kept in the characterisation, where the moved `listed` cannot reach it.
  const keptKeys = head.replace("type View", "const KEYS = [1, 2];\ntype View");
  const anotherRow = 'it.effect("another row", () => other(seed(2)))';
  const math = "packages/devtools/src/model/Math.ts";
  const otherModule = "packages/devtools/test/model/other.ts";
  const polyfill = "packages/devtools/test/model/polyfill.ts";
  const cases = [
    { title: "the first commit itself passes", head: base, fixtures: baseFixtures, moves: {}, problems: [] },
    { title: "an import move, a header edit and an identical helper move pass", problems: [] },
    {
      title: "a fixtures const that runs nothing as the module loads passes",
      fixtures: `${fixtures}export const extra = { a: [1, "b", -2], f: () => seed(1), g() { return KEYS; } };\n`,
      problems: [],
    },
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
      problems: [`listed is named here but not imported as itself from ${FIXTURES_SPECIFIER}`],
    },
    {
      title: "a moved helper imported under its name from another fixture helper fails",
      head: head.replace("import { listed, seed }", "import { seed as listed, seed }"),
      problems: [`listed is named here but not imported as itself from ${FIXTURES_SPECIFIER}`],
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
      title: "a text change other than the reviewed one fails",
      head: withoutView,
      fixtures: `${fixtures}type View = { readonly v: 2 };\n`,
      reviewed: reviewedView,
      problems: ["View moved to the fixtures with other text than reviewed"],
    },
    {
      title: "a reviewed entry whose first text is not the first commit's fails",
      head: withoutView,
      fixtures: `${fixtures}type View = { readonly v: 1 };\n`,
      reviewed: { View: { ...reviewedView.View, from: "type View = { readonly v: string };" } },
      problems: ["View's reviewed first text is not its first commit's"],
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
      title: "a helper the first commit imported from the fixtures, no longer exported there, fails",
      fixtures: fixtures.replace("export const seed", "const seed"),
      problems: ["seed in the fixtures is not its first commit's text"],
    },
    {
      title: "a fixture helper such a helper reads, changed, fails",
      fixtures: fixtures.replace("const twice = (v: number) => double(v);", "const twice = (v: number) => double(v + 1);"),
      problems: ["twice in the fixtures is not its first commit's text"],
    },
    {
      title: "a fixture helper such a helper reads, no longer declared, fails",
      fixtures: fixtures.replace("const twice = (v: number) => double(v);\n", ""),
      problems: ["twice is no longer declared in the fixtures"],
    },
    {
      title: "a name such a helper reads, imported by the fixtures from another module, fails",
      fixtures: fixtures.replace('"../src/model/Math.ts"', '"../src/model/Other.ts"'),
      problems: [
        `double, which twice reads, was imported as \`{ double } from ${math}\` and the fixtures import it as ` +
          "`{ double } from packages/devtools/src/model/Other.ts`",
        "the fixtures load packages/devtools/src/model/Other.ts, which neither file loaded at the first commit",
      ],
    },
    {
      title: "a name such a helper reads, imported by the fixtures as another name, fails",
      fixtures: fixtures.replace("import { double }", "import { triple as double }"),
      problems: [
        `double, which twice reads, was imported as \`{ double } from ${math}\` and the fixtures import it as ` +
          `\`{ triple as double } from ${math}\``,
      ],
    },
    {
      title: "a namespace such a helper reads, re-pointed by the fixtures, fails",
      fixtures: fixtures.replace('"effect/testing/TestClock"', '"./fakeClock.ts"'),
      problems: [
        "Clock, which seed reads, was imported as `* as Clock from effect/testing/TestClock` and the fixtures " +
          "import it as `* as Clock from packages/devtools/test/fakeClock.ts`",
        "the fixtures load packages/devtools/test/fakeClock.ts, which neither file loaded at the first commit",
      ],
    },
    {
      title: "a name such a helper reads, declared by the fixtures in place of its import, fails",
      fixtures: fixtures.replace('import { double } from "../src/model/Math.ts";', "const double = (v: number) => v * 2;"),
      problems: [`double, which twice reads, was imported as \`{ double } from ${math}\` and the fixtures declare it`],
    },
    {
      title: "a name such a helper reads, no longer imported by the fixtures, fails",
      fixtures: fixtures.replace('import { double } from "../src/model/Math.ts";\n', ""),
      problems: [
        `double, which twice reads, was imported as \`{ double } from ${math}\` and the fixtures neither import nor ` +
          "declare it",
      ],
    },
    {
      title: "a name a moved helper reads that the characterisation keeps, declared by the fixtures, fails",
      head: keptKeys,
      problems: ["KEYS, which listed reads, was declared in the characterisation and the fixtures declare it"],
    },
    {
      title: "a name a moved helper reads that the characterisation keeps, imported by the fixtures, fails",
      head: keptKeys,
      fixtures: fixtures.replace("const KEYS = [1, 2];", 'import { KEYS } from "./keys.ts";'),
      problems: [
        "KEYS, which listed reads, was declared in the characterisation and the fixtures import it as " +
          "`{ KEYS } from packages/devtools/test/keys.ts`",
        "the fixtures load packages/devtools/test/keys.ts, which neither file loaded at the first commit",
      ],
    },
    {
      title: "a name a moved helper reads that the characterisation keeps, provided nowhere, fails",
      head: keptKeys,
      fixtures: fixtures.replace("const KEYS = [1, 2];\n", ""),
      problems: [
        "KEYS, which listed reads, was declared in the characterisation and the fixtures neither import nor " +
          "declare it",
      ],
    },
    {
      title: "a name the first commit neither imported nor declared, declared by the fixtures, fails",
      fixtures: `${fixtures}const keys = 1;\n`,
      problems: ["keys, which listed reads, was neither imported nor declared and the fixtures declare it"],
    },
    {
      title: "a name the first commit neither imported nor declared, imported by the fixtures, fails",
      fixtures: fixtures.replace("import { double }", "import { double, keys }"),
      problems: [
        `keys, which listed reads, was neither imported nor declared and the fixtures import it as \`{ keys } from ${math}\``,
      ],
    },
    {
      title: "a call at top level of the fixtures fails",
      fixtures: `${fixtures}beforeEach(() => {});\n`,
      problems: ["a top-level statement of the fixtures is not an import or a declaration of one name: «beforeEach(() => {});»"],
    },
    {
      title: "a let at top level of the fixtures fails",
      fixtures: `${fixtures}export let count = 0;\n`,
      problems: ["a top-level statement of the fixtures is not an import or a declaration of one name: «export let count = 0;»"],
    },
    {
      title: "a fixtures const that runs code as the module loads fails",
      fixtures: `${fixtures}export const hook = beforeEach(() => {});\n`,
      problems: ["hook in the fixtures runs code as the module loads, and no first commit's text pins it"],
    },
    {
      title: "a module the fixtures newly load fails",
      fixtures: `import "../setup.ts";\n${fixtures}`,
      problems: ["the fixtures load packages/devtools/setup.ts, which neither file loaded at the first commit"],
    },
    {
      title: "an import of the first commit re-pointed fails",
      head: head.replace('"./other.ts"', '"./elsewhere.ts"'),
      problems: [
        `other was imported as \`{ other } from ${otherModule}\` and is imported as ` +
          "`{ other } from packages/devtools/test/model/elsewhere.ts` here",
      ],
    },
    {
      title: "an import of the first commit bound to another name fails",
      head: head.replace("import { other }", "import { extra as other }"),
      problems: [
        `other was imported as \`{ other } from ${otherModule}\` and is imported as \`{ extra as other } from ` +
          `${otherModule}\` here`,
      ],
    },
    {
      title: "an import of the first commit made type-only fails",
      head: head.replace("import { other }", "import type { other }"),
      problems: [
        `other was imported as \`{ other } from ${otherModule}\` and is imported as \`type { other } from ` +
          `${otherModule}\` here`,
      ],
    },
    {
      title: "an import of the first commit made a default import fails",
      head: head.replace("import { other }", "import other"),
      problems: [
        `other was imported as \`{ other } from ${otherModule}\` and is imported as \`{ default as other } from ` +
          `${otherModule}\` here`,
      ],
    },
    {
      title: "a namespace import of the first commit re-pointed fails",
      head: head.replace('"effect/Effect"', '"./fakeEffect.ts"'),
      problems: [
        "Effect was imported as `* as Effect from effect/Effect` and is imported as `* as Effect from " +
          "packages/devtools/test/model/fakeEffect.ts` here",
      ],
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
      title: "a namespace import the first commit does not have fails",
      head: head.replace('import { other } from "./other.ts";', 'import { other } from "./other.ts";\nimport * as Extra from "./extra.ts";'),
      problems: ["Extra is imported here, and the first commit neither imports nor declares it"],
    },
    {
      title: "an import that binds no name, added, fails",
      head: head.replace('import "./polyfill.ts";', 'import "./polyfill.ts";\nimport "../setup.ts";'),
      problems: [
        `the imports that bind no name were ${polyfill} and are ${polyfill}, packages/devtools/test/setup.ts here`,
      ],
    },
    {
      title: "an import that binds no name, dropped, fails",
      head: head.replace('import "./polyfill.ts";\n', ""),
      problems: [`the imports that bind no name were ${polyfill} and are none here`],
    },
    {
      title: "a name a moved helper reads, imported by the fixtures from another module, fails",
      fixtures: fixtures.replace('"../src/model/New.ts"', '"../src/model/Wrong.ts"'),
      problems: [
        "Shape, which listed reads, was imported as `type { Shape } from packages/devtools/src/model/Old.ts` and " +
          "the fixtures import it as `type { Shape } from packages/devtools/src/model/Wrong.ts`",
        "IMPORT_MOVES names Shape, which no import needs",
      ],
    },
    {
      title: "a move no import needs fails",
      moves: { ...shapeMoves, Gone: shapeMoves.Shape },
      problems: ["IMPORT_MOVES names Gone, which no import needs"],
    },
  ];
  const texts = { base: { path: CHARACTERISATION, text: base }, baseFixtures: { path: FIXTURES, text: baseFixtures } };
  cases.forEach((one, index) => {
    texts[`head${index}`] = { path: CHARACTERISATION, text: one.head ?? head };
    texts[`fixtures${index}`] = { path: FIXTURES, text: one.fixtures ?? fixtures };
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
    base: { path: CHARACTERISATION, text: first(CHARACTERISATION) },
    head: { path: CHARACTERISATION, text: readFileSync(join(root, CHARACTERISATION), "utf8") },
    baseFixtures: { path: FIXTURES, text: first(FIXTURES) },
    fixtures: { path: FIXTURES, text: readFileSync(join(root, FIXTURES), "utf8") },
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
