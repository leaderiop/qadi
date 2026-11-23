// The check that the evaluate family's span contract still holds the rows it was first committed with.
//
// It parses, with TypeScript's own parse (`typescript/unstable/sync`, over a virtual file system), four files: the
// contract and the shared test helpers (`packages/core/test/helpers.ts`) as the contract's first commit holds them
// (`BASE`), and both as checked out. It reads an import in every form, named, namespace, default and one that binds
// no name, and each binding by its local name, the name it imports, its module as a path from the repository root and
// whether it imports a type. It fails unless:
//   - (rows) the multiset of `it(...)` and `it.<member>(...)` calls of the contract, each whitespace collapsed and led
//     by the titles of the `describe` calls around it, is the first commit's, so a changed title, input, expected
//     value or a row moved to another section is named;
//   - (statements) every top-level statement of the contract other than its imports is, whitespace collapsed and in
//     order, the first commit's, once the first commit's helpers that moved to the helpers file are left out; so a
//     `describe` body, a new statement and a helper kept in place are compared whole, and a declaration added inside
//     a `describe` fails. Leading comments, the header comment among them, are not compared;
//   - (moved helpers) a helper the first commit declared at top level (a `const`, `let`, `type`, `interface`,
//     `function` or `class`) and the checked-out contract does not is declared at top level of the helpers file with
//     an equivalent declaration, and, when the contract still names it, is exported there and imported under its own
//     name from `./helpers.ts`. Equivalent means: its text, whitespace collapsed and a leading `export` dropped, is
//     the first commit's text exactly, so no signature, generic or body may change; and every name it reads is one
//     the helpers file provides as the first commit provided it (the next rule). No moved helper's signature had to
//     widen, so no text is admitted other than the first;
//   - (what a compared helper reads) every other name a moved helper, or a helper of the helpers file it reaches,
//     reads is provided as the first commit provided it: an import binds the same name of the same module, and a
//     binding the first commit imported with `import type` may now be a value binding of that name and module, since
//     a helper that compiled reading it from a type-only import reads it in type positions only, which a value
//     binding provides unchanged; never the reverse. A name the first commit neither imported nor declared is neither
//     imported nor declared now, and a name the contract still declares fails, since the helpers file cannot reach
//     it. A name is read as an identifier, so a property name counts too, and the rule errs on the strict side;
//   - (helpers the contract used) a helper the first commit imported from the helpers file, every helper of that file
//     a moved helper reads, and every helper of that file those read, has the text it had in the helpers file at the
//     first commit, `export` included;
//   - (the helpers file's new statements) every top-level statement of the helpers file that it did not hold at the
//     first commit is an import or a declaration of one name, a `const`, a function, a type or an interface; such a
//     `const` that is not a moved helper runs nothing as the module loads, its initialiser being a function, a
//     literal, a name, or an array or object literal of those; and every module the helpers file loads, by an import
//     that is not `import type`, is one the two files loaded at the first commit;
//   - (imports) every binding the contract imports is the first commit's, alike in the name it imports, its module and
//     whether it imports a type; a name it no longer imports is one a moved helper reads; a name it newly imports is a
//     moved helper; and its imports that bind no name are the first commit's, in order.
// Whitespace collapsed means each run of whitespace between two tokens, or in a comment, reads as one space; the text
// of a string, template or regular expression literal is compared exactly, so a title or a value whose own spacing
// changed is named. The order of the imports that bind a name is not compared. An import, a comment and where a helper is declared may
// change; a row and what it runs may not.
//
// This replaced, in code review, the earlier rule that the contract has exactly one commit, because moving its two
// span-attribute helpers into the shared test helpers, so every span test reads one copy, is a second commit that
// changes no row.
//
// From the repository root:
//   node .planning/phases/QD-75-a-declared-span-shape-for-the-evaluate-family/75-contract-check.mjs
//   node .planning/phases/QD-75-a-declared-span-shape-for-the-evaluate-family/75-contract-check.mjs --self-test
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join, posix } from "node:path";

const BASE = "ecb0256f96702bb060b7971bac90fdeb8c57bc3d";
const CONTRACT = "packages/core/test/EvaluationSpan.contract.test.ts";
const HELPERS = "packages/core/test/helpers.ts";
const HELPERS_SPECIFIER = "./helpers.ts";

/** How a name a compared helper reads was provided, when the first commit did not import it. */
const KEPT = "declared in the contract";
const FREE = "neither imported nor declared";

/**
 * A text with each whitespace run outside `kept` collapsed to one space, and trimmed.
 *
 * `kept` lists the `[start, end)` offsets of the literals in `text`, sorted and disjoint; a literal starts and ends
 * with a quote, a backtick, a brace or a slash, so no whitespace run crosses its edge, and its own text is kept
 * exactly.
 */
const collapse = (text, kept = []) => {
  let out = "";
  let at = 0;
  for (const [start, end] of kept) {
    out += text.slice(at, start).replace(/\s+/g, " ") + text.slice(start, end);
    at = end;
  }
  return (out + text.slice(at).replace(/\s+/g, " ")).trim();
};
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
  const dir = "/qd75-contract-check";
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
    // A token whose own text is compared exactly: whitespace inside it is part of a title or a value.
    const LITERALS = new Set([
      SyntaxKind.StringLiteral,
      SyntaxKind.NoSubstitutionTemplateLiteral,
      SyntaxKind.TemplateHead,
      SyntaxKind.TemplateMiddle,
      SyntaxKind.TemplateTail,
      SyntaxKind.RegularExpressionLiteral,
      SyntaxKind.JsxText,
    ]);
    /** A node's text with whitespace collapsed between its tokens and kept inside its literals. */
    const exact = (file, node) => {
      const from = node.getStart(file);
      const kept = [];
      const find = (child) => {
        if (LITERALS.has(child.kind)) kept.push([child.getStart(file) - from, child.end - from]);
        else child.forEachChild(find);
      };
      find(node);
      return collapse(textOf(file, node), kept.sort((a, b) => a[0] - b[0]));
    };
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
        if (isRow(node)) rows.push([...within, exact(file, node)].join(" > "));
        if (node.kind === SyntaxKind.Identifier) {
          identifiers.add(node.text);
          named.add(node.text);
        }
        const block = isDescribe(node);
        if (block) within.push(exact(file, node.arguments[0]));
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
          const compared = exact(file, statement);
          helpers.set(declares, { text: compared, body: unexported(compared), exported, reads, inert });
        }
        if (!allowed) loose.push(exact(file, statement));
        statements.push({ text: exact(file, statement), declares });
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
 * Every reason the checked-out contract does not hold its first commit's rows and what they run.
 *
 * `base` and `head` are the contract's facts, `baseHelpers` and `helpers` the helpers file's.
 */
const problemsOf = ({ base, head, baseHelpers, helpers }) => {
  const problems = [];
  const moved = new Set([...base.helpers.keys()].filter((name) => !head.helpers.has(name)));

  // Rows and statements.
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

  // Whether a binding imports the same name of the same module as the first commit's, alike in kind; `widen` admits
  // a first commit's type-only binding provided now by a value binding of the same name and module.
  const alike = (first, now, widen) =>
    first.imported === now.imported &&
    first.module === now.module &&
    (first.type === now.type || (widen && first.type && !now.type));
  // A name a compared helper reads, provided by the helpers file as the first commit provided it: imported alike when
  // it was imported (`first`), neither imported nor declared when it was neither (`was` is `FREE`), and never when the
  // contract still declares it (`was` is `KEPT`).
  const provided = (read, name, first, was) => {
    const now = helpers.imports.get(read);
    const declared = helpers.helpers.has(read);
    const holds =
      first !== undefined ? now !== undefined && alike(first, now, true) : was === FREE && now === undefined && !declared;
    if (holds) return;
    const before = first !== undefined ? `imported as \`${shown(read, first)}\`` : was;
    const after =
      now !== undefined
        ? `import it as \`${shown(read, now)}\``
        : declared
          ? "declare it"
          : "neither import nor declare it";
    problems.push(`${read}, which ${name} reads, was ${before} and the helpers file ${after}`);
  };

  // Moved helpers.
  const seeds = [];
  for (const name of moved) {
    const first = base.helpers.get(name);
    const now = helpers.helpers.get(name);
    if (now === undefined) {
      problems.push(`${name} is declared neither here nor in the helpers file`);
      continue;
    }
    if (now.body !== first.body) problems.push(`${name} moved to the helpers file with other text`);
    if (head.identifiers.has(name)) {
      if (!now.exported) problems.push(`${name} is named here but not exported by the helpers file`);
      const binding = head.imports.get(name);
      if (binding?.module !== HELPERS || binding.imported !== name) {
        problems.push(`${name} is named here but not imported as itself from ${HELPERS_SPECIFIER}`);
      }
    }
    for (const read of first.reads) {
      const binding = base.imports.get(read);
      if (binding?.module === HELPERS) seeds.push(binding.imported);
      else if (binding !== undefined) provided(read, name, binding);
      else if (!moved.has(read)) provided(read, name, undefined, base.helpers.has(read) ? KEPT : FREE);
    }
  }

  // Helpers of the helpers file, from each the first commit imported and each a moved helper reads, through what they
  // read. The first commit compiled, so its helpers file declares every name this walk reaches.
  for (const binding of base.imports.values()) {
    if (binding.module === HELPERS) seeds.push(binding.imported);
  }
  const queue = [...new Set(seeds)].sort();
  const walked = new Set(queue);
  while (queue.length > 0) {
    const name = queue.shift();
    const first = baseHelpers.helpers.get(name);
    const now = helpers.helpers.get(name);
    if (now === undefined) problems.push(`${name} is no longer declared in the helpers file`);
    else if (now.text !== first.text) problems.push(`${name} in the helpers file is not its first commit's text`);
    for (const read of [...first.reads].sort()) {
      if (!baseHelpers.helpers.has(read)) provided(read, name, baseHelpers.imports.get(read), FREE);
      else if (!walked.has(read)) {
        walked.add(read);
        queue.push(read);
      }
    }
  }

  // The helpers file's new statements, and the modules it loads.
  const firstStatements = new Set(baseHelpers.statements.map((statement) => statement.text));
  const firstLoose = new Set(baseHelpers.loose);
  for (const text of helpers.loose) {
    if (firstLoose.has(text)) continue;
    problems.push(
      `a top-level statement of the helpers file is not an import or a declaration of one name: ${snippet(text)}`,
    );
  }
  for (const [name, helper] of helpers.helpers) {
    if (helper.inert || moved.has(name) || walked.has(name) || firstStatements.has(helper.text)) continue;
    problems.push(`${name} in the helpers file runs code as the module loads, and no first commit's text pins it`);
  }
  const loadedFirst = new Set([...base.loads, ...baseHelpers.loads]);
  for (const module of helpers.loads) {
    if (!loadedFirst.has(module)) {
      problems.push(`the helpers file loads ${module}, which neither file loaded at the first commit`);
    }
  }

  // Imports.
  for (const [name, first] of base.imports) {
    const now = head.imports.get(name);
    if (now !== undefined) {
      if (!alike(first, now, false)) {
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
  return problems;
};

const selfTest = async () => {
  const base = `/** The header. */
import { assert, describe, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import type * as Tracer from "effect/Tracer";
import "./polyfill.ts";
import { other } from "./other.ts";
import { seed } from "${HELPERS_SPECIFIER}";
const KEYS = [1, 2];
const listed = (spans: ReadonlyArray<Tracer.Span>, v: number) => {
  assert.isDefined(spans);
  return { v, keys: [1, 2], s: seed(v) };
};
it("a row", () => { assert.deepStrictEqual(listed([], 1), { v: 1, keys: [1, 2] }); });
describe("s", () => { it.effect("another row", () => other(seed(2))); });
`;
  const head = `/** The header, edited. */
import { assert, describe, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import type * as Tracer from "effect/Tracer";
import "./polyfill.ts";
import { listed, seed } from "${HELPERS_SPECIFIER}";
import { other } from "./other.ts";
const KEYS = [1, 2];
it("a row", () => {
  assert.deepStrictEqual(listed([], 1), { v: 1, keys: [1, 2] });
});
describe("s", () => { it.effect("another row", () => other(seed(2))); });
`;
  const baseHelpers = `/** The shared helpers. */
import * as Clock from "effect/testing/TestClock";
import * as Tracer from "effect/Tracer";
import { double } from "../src/Math.ts";
const twice = (v: number) => double(v);
export const seed = (v: number) => Clock.adjust(twice(v) + 1);
export const tracer = () => Tracer.make;
export const stale = Clock.make();
`;
  const helpers = `/** The shared helpers, and the moved ones. */
import { assert } from "@effect/vitest";
import * as Clock from "effect/testing/TestClock";
import * as Tracer from "effect/Tracer";
import { double } from "../src/Math.ts";
const twice = (v: number) => double(v);
export const seed = (v: number) => Clock.adjust(twice(v) + 1);
export const tracer = () => Tracer.make;
export const stale = Clock.make();
export const listed = (spans: ReadonlyArray<Tracer.Span>, v: number) => {
  assert.isDefined(spans);
  return { v, keys: [1, 2], s: seed(v) };
};
`;
  const anotherRow = 'it.effect("another row", () => other(seed(2)))';
  const otherModule = "packages/core/test/other.ts";
  // The first 80 characters of the contract's first row, as a problem quotes it.
  const firstRow = 'it("a row", () => { assert.deepStrictEqual(listed([], 1), { v: 1, keys: [1, 2] }';
  const keysProblem =
    "KEYS, which listed reads, was declared in the contract and the helpers file neither import nor declare it";
  const cases = [
    { title: "the first commit itself passes", head: base, helpers: baseHelpers, problems: [] },
    {
      title: "an import move, a header edit and an identical helper move pass",
      problems: [],
    },
    {
      title: "a moved helper that reads a name the contract still declares fails",
      base: base.replace("keys: [1, 2], s:", "keys: KEYS, s:"),
      helpers: helpers.replace("keys: [1, 2], s:", "keys: KEYS, s:"),
      problems: [keysProblem],
    },
    {
      title: "a title change fails",
      head: head.replace('"a row"', '"a renamed row"'),
      problems: [
        'a row of the first commit is gone or changed: it("a row", () => { assert.deepStrictEqual(listed([], 1), ' +
          "{ v: 1, keys: [1, 2] }); })",
        'a row the first commit does not have: it("a renamed row", () => { assert.deepStrictEqual(listed([], 1), ' +
          "{ v: 1, keys: [1, 2] }); })",
        `statement 2 after the imports is not the first commit's: it had «${firstRow}», ` +
          'this has «it("a renamed row", () => { assert.deepStrictEqual(listed([], 1), { v: 1, keys: »',
      ],
    },
    {
      title: "a whitespace change inside a title fails",
      head: head.replace('"a row"', '"a  row"'),
      problems: [
        'a row of the first commit is gone or changed: it("a row", () => { assert.deepStrictEqual(listed([], 1), ' +
          "{ v: 1, keys: [1, 2] }); })",
        'a row the first commit does not have: it("a  row", () => { assert.deepStrictEqual(listed([], 1), ' +
          "{ v: 1, keys: [1, 2] }); })",
        `statement 2 after the imports is not the first commit's: it had «${firstRow}», ` +
          'this has «it("a  row", () => { assert.deepStrictEqual(listed([], 1), { v: 1, keys: [1, 2] »',
      ],
    },
    {
      title: "a whitespace change inside a template literal fails",
      base: base.replace('other(seed(2))', 'other(seed(2), `a ${KEYS} b`)'),
      head: head.replace('other(seed(2))', 'other(seed(2), `a  ${KEYS} b`)'),
      problems: [
        'a row of the first commit is gone or changed: "s" > it.effect("another row", () => other(seed(2), `a ${KEYS} b`))',
        'a row the first commit does not have: "s" > it.effect("another row", () => other(seed(2), `a  ${KEYS} b`))',
        "statement 3 after the imports is not the first commit's: it had " +
          '«describe("s", () => { it.effect("another row", () => other(seed(2), `a ${KEYS} b», ' +
          'this has «describe("s", () => { it.effect("another row", () => other(seed(2), `a  ${KEYS} »',
      ],
    },
    {
      title: "a whitespace run changed between tokens passes",
      head: head.replace('"another row", () =>', '"another row",\n    () =>'),
      problems: [],
    },
    {
      title: "an expected value change fails",
      head: head.replace("v: 1, keys", "v: 2, keys"),
      problems: [
        'a row of the first commit is gone or changed: it("a row", () => { assert.deepStrictEqual(listed([], 1), ' +
          "{ v: 1, keys: [1, 2] }); })",
        'a row the first commit does not have: it("a row", () => { assert.deepStrictEqual(listed([], 1), ' +
          "{ v: 2, keys: [1, 2] }); })",
        `statement 2 after the imports is not the first commit's: it had «${firstRow}», ` +
          'this has «it("a row", () => { assert.deepStrictEqual(listed([], 1), { v: 2, keys: [1, 2] }»',
      ],
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
      title: "a changed moved helper fails",
      helpers: helpers.replace("{ v, keys", "{ v: v + 1, keys"),
      problems: ["listed moved to the helpers file with other text"],
    },
    {
      title: "a moved helper whose signature widened fails",
      helpers: helpers.replace("v: number) => {", "v: number | string) => {"),
      problems: ["listed moved to the helpers file with other text"],
    },
    {
      title: "a helper declared nowhere fails",
      helpers: helpers.replace(/export const listed[^]*$/, ""),
      problems: ["listed is declared neither here nor in the helpers file"],
    },
    {
      title: "a moved helper the helpers file does not export fails",
      helpers: helpers.replace("export const listed", "const listed"),
      problems: ["listed is named here but not exported by the helpers file"],
    },
    {
      title: "a moved helper imported from elsewhere fails",
      head: head
        .replace(`import { listed, seed } from "${HELPERS_SPECIFIER}";`, `import { seed } from "${HELPERS_SPECIFIER}";`)
        .replace('import { other } from "./other.ts";', 'import { other } from "./other.ts";\nimport { listed } from "./elsewhere.ts";'),
      problems: [`listed is named here but not imported as itself from ${HELPERS_SPECIFIER}`],
    },
    {
      title: "a value import the moved helper reads, made type-only in the helpers file, fails",
      helpers: helpers.replace('import { assert } from "@effect/vitest";', 'import type { assert } from "@effect/vitest";'),
      problems: [
        "assert, which listed reads, was imported as `{ assert } from @effect/vitest` and the helpers file import it " +
          "as `type { assert } from @effect/vitest`",
      ],
    },
    {
      title: "a name the moved helper reads, imported from another module by the helpers file, fails",
      helpers: helpers.replace('"effect/Tracer"', '"./fakeTracer.ts"'),
      problems: [
        "Tracer, which listed reads, was imported as `type * as Tracer from effect/Tracer` and the helpers file " +
          "import it as `* as Tracer from packages/core/test/fakeTracer.ts`",
        "the helpers file loads packages/core/test/fakeTracer.ts, which neither file loaded at the first commit",
      ],
    },
    {
      title: "a helper the first commit imported from the helpers file, changed there, fails",
      helpers: helpers.replace("twice(v) + 1", "twice(v) + 2"),
      problems: ["seed in the helpers file is not its first commit's text"],
    },
    {
      title: "a helper of the helpers file such a helper reads, changed, fails",
      helpers: helpers.replace("double(v);", "double(v + 1);"),
      problems: ["twice in the helpers file is not its first commit's text"],
    },
    {
      title: "a helper of the helpers file the contract never reached, kept as it was, passes though it runs code",
      head: base,
      helpers: baseHelpers,
      problems: [],
    },
    {
      title: "a new const that runs code as the module loads fails",
      helpers: `${helpers}export const hook = beforeEach(() => {});\n`,
      problems: ["hook in the helpers file runs code as the module loads, and no first commit's text pins it"],
    },
    {
      title: "a new call at top level of the helpers file fails",
      helpers: `${helpers}beforeEach(() => {});\n`,
      problems: [
        "a top-level statement of the helpers file is not an import or a declaration of one name: «beforeEach(() => {});»",
      ],
    },
    {
      title: "a module the helpers file newly loads fails",
      helpers: `import "../setup.ts";\n${helpers}`,
      problems: ["the helpers file loads packages/core/setup.ts, which neither file loaded at the first commit"],
    },
    {
      title: "a statement added at top level of the contract fails",
      head: `${head}beforeEach(() => {});\n`,
      problems: [
        "statement 4 after the imports is not the first commit's: it had nothing, this has «beforeEach(() => {});»",
      ],
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
      title: "an import of the first commit re-pointed fails",
      head: head.replace('"./other.ts"', '"./elsewhere.ts"'),
      problems: [
        `other was imported as \`{ other } from ${otherModule}\` and is imported as ` +
          "`{ other } from packages/core/test/elsewhere.ts` here",
      ],
    },
    {
      title: "a type-only import of the contract made a value import fails",
      head: head.replace("import type * as Tracer", "import * as Tracer"),
      problems: ["Tracer was imported as `type * as Tracer from effect/Tracer` and is imported as `* as Tracer from effect/Tracer` here"],
    },
    {
      title: "an import the first commit does not have fails",
      head: head.replace('import { other } from "./other.ts";', 'import { other } from "./other.ts";\nimport { extra } from "./extra.ts";'),
      problems: ["extra is imported here, and the first commit neither imports nor declares it"],
    },
    {
      title: "an import that binds no name, dropped, fails",
      head: head.replace('import "./polyfill.ts";\n', ""),
      problems: ["the imports that bind no name were packages/core/test/polyfill.ts and are none here"],
    },
  ];
  const texts = {};
  cases.forEach((one, index) => {
    texts[`base${index}`] = { path: CONTRACT, text: one.base ?? base };
    texts[`head${index}`] = { path: CONTRACT, text: one.head ?? head };
    texts[`baseHelpers${index}`] = { path: HELPERS, text: baseHelpers };
    texts[`helpers${index}`] = { path: HELPERS, text: one.helpers ?? helpers };
  });
  const facts = await readAll(texts);
  const failed = cases.flatMap((one, index) => {
    const problems = problemsOf({
      base: facts[`base${index}`],
      head: facts[`head${index}`],
      baseHelpers: facts[`baseHelpers${index}`],
      helpers: facts[`helpers${index}`],
    });
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
    base: { path: CONTRACT, text: first(CONTRACT) },
    head: { path: CONTRACT, text: readFileSync(join(root, CONTRACT), "utf8") },
    baseHelpers: { path: HELPERS, text: first(HELPERS) },
    helpers: { path: HELPERS, text: readFileSync(join(root, HELPERS), "utf8") },
  });
  const problems = problemsOf(facts);
  if (problems.length > 0) {
    console.error(`contract-check: ${problems.length} problem(s)\n${problems.join("\n")}`);
    process.exit(1);
  }
  const moved = [...facts.base.helpers.keys()].filter((name) => !facts.head.helpers.has(name));
  console.log(
    `contract-check: ${facts.head.rows.length} rows and ${facts.head.statements.length} statements ` +
      `as at ${BASE.slice(0, 8)}; ${facts.base.helpers.size - moved.length} helpers kept, ` +
      `${moved.length} moved (${moved.join(", ")})`,
  );
};

if (process.argv.includes("--self-test")) await selfTest();
else await main();
