// The check that the remedy agreement and refusal tests still hold the statements they were first committed with.
//
// It parses, with TypeScript's own parse (`typescript/unstable/sync`, over a virtual file system), each of six test
// files as `BASE` (the commit that first held the agreement tests) has it and as checked out, and reports every way
// the checked-out file departs from the first commit.
//
// Three files are FROZEN: the shared helper and the two agreement tests. Their top-level statements other than imports
// must be the first commit's, in number, in order and in text, so a changed title, input, expected value or helper, a
// statement added and a statement moved away are all named; and their imports must be the first commit's, as a set.
//
// Three files are APPEND-ONLY: the two core test files that gained a refusal `describe`, and the remedy table's own
// test, whose rows are frozen. The first commit's statements must be a prefix of the file's statements, so a test may
// be added after them and none may be changed or lost, and every import of the first commit must be kept; an import
// may be added. The remedy table's test has one declared substitution: the expression text
// `NO_CUSTOM_PREDICATE_FIELD.reason` is read as the string literal it replaces before comparing, because replacing
// that literal with the export of the identical value changes no row's expected value.
//
// Whitespace collapsed means each run of whitespace between two tokens reads as one space; the text of a string,
// template or regular-expression literal is compared exactly, so a title or a value whose own spacing changed is
// named. Leading comments, the header among them, are not compared. An import binding is its local name, the name it
// imports, its module as a path from the repository root and whether it imports a type; an import that binds no name is
// its module; the order of imports is not compared.
//
// From the repository root:
//   node .planning/phases/QD-76-remedies-uses-core-s-signature-match/76-agreement-check.mjs
//   node .planning/phases/QD-76-remedies-uses-core-s-signature-match/76-agreement-check.mjs --self-test
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join, posix } from "node:path";

const BASE = "22d5b10c050edb325ea797861b98695699e38fc7";

const FROZEN = [
  "packages/devtools/test/remedyAgreement.ts",
  "packages/devtools/test/model/RemedySignatureConformance.test.ts",
  "packages/devtools/test/model/RemedyActedConformance.test.ts",
];

const APPEND_ONLY = [
  "packages/core/test/SignatureHistory.test.ts",
  "packages/core/test/DecisionHistory.test.ts",
  "packages/devtools/test/model/Remedies.test.ts",
];

/** The text a file is read with in place of another, before it is compared. */
const SUBSTITUTIONS = new Map([
  [
    "packages/devtools/test/model/Remedies.test.ts",
    [
      "NO_CUSTOM_PREDICATE_FIELD.reason",
      `"a custom predicate's answer has no form field; run against Snapshot or Live"`,
    ],
  ],
]);

/**
 * A text with each whitespace run outside `kept` collapsed to one space, and trimmed.
 *
 * `kept` lists the `[start, end)` offsets of the literals in `text`, sorted and disjoint; a literal starts and ends
 * with a quote, a backtick or a slash, so no whitespace run crosses its edge, and its own text is kept exactly.
 */
const collapse = (text, kept) => {
  let out = "";
  let at = 0;
  for (const [start, end] of kept) {
    out += text.slice(at, start).replace(/\s+/g, " ") + text.slice(start, end);
    at = end;
  }
  return (out + text.slice(at).replace(/\s+/g, " ")).trim();
};

/** The module a specifier in `file` names: a path from the repository root when relative, else the specifier. */
const moduleOf = (file, specifier) =>
  specifier.startsWith(".") ? posix.normalize(posix.join(posix.dirname(file), specifier)) : specifier;

/** An import binding as it would be written, with its module as a path from the repository root. */
const shown = (local, { module, imported, type }) => {
  if (imported === undefined) return `import "${module}"`;
  const named = imported === local ? local : `${imported} as ${local}`;
  return `${type ? "type " : ""}${imported === "*" ? `* as ${local}` : `{ ${named} }`} from ${module}`;
};

/** A file's text as it is compared: with the file's declared substitution applied. */
const prepared = (path, text) => {
  const substitution = SUBSTITUTIONS.get(path);
  return substitution === undefined || text === undefined ? text : text.split(substitution[0]).join(substitution[1]);
};

/**
 * Parses each text and reads its top-level statements other than imports, and its imports.
 *
 * `texts` maps a name to the file's path from the repository root and its text; the path resolves its specifiers.
 */
const readAll = async (texts) => {
  const { API } = await import("typescript/unstable/sync");
  const { createVirtualFileSystem } = await import("typescript/unstable/fs");
  const { SyntaxKind } = await import("typescript/unstable/ast");
  const dir = "/qd76-agreement-check";
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
      return collapse(file.text.slice(from, node.end), kept.sort((a, b) => a[0] - b[0]));
    };
    const facts = {};
    for (const name of names) {
      const { path } = texts[name];
      const file = program.getSourceFile(`${dir}/${name}.ts`);
      const statements = [];
      const imports = new Set();
      for (const statement of file.statements) {
        if (statement.kind !== SyntaxKind.ImportDeclaration) {
          statements.push(exact(file, statement));
          continue;
        }
        const module = moduleOf(path, statement.moduleSpecifier.text);
        const clause = statement.importClause;
        const typeOnly = clause?.phaseModifier === SyntaxKind.TypeKeyword;
        const bindings = clause?.namedBindings;
        const elements = bindings?.kind === SyntaxKind.NamedImports ? bindings.elements : [];
        const bind = (local, imported, type) => imports.add(shown(local, { module, imported, type: typeOnly || type }));
        if (clause?.name !== undefined) bind(clause.name.text, "default", false);
        if (bindings?.kind === SyntaxKind.NamespaceImport) bind(bindings.name.text, "*", false);
        for (const element of elements) {
          bind(element.name.text, (element.propertyName ?? element.name).text, element.isTypeOnly);
        }
        if (clause?.name === undefined && bindings === undefined) imports.add(shown("", { module }));
      }
      facts[name] = { statements, imports };
    }
    return facts;
  } finally {
    api.close();
  }
};

/**
 * Every way the checked-out file `head` departs from the first commit's `base`, one line each.
 *
 * `head` is `undefined` for a file that is not there. A frozen file holds the first commit's statements and imports
 * exactly; an append-only file holds the first commit's statements as a prefix and every one of its imports.
 */
const problemsOf = (path, base, head) => {
  if (head === undefined) return [`${path}: does not exist`];
  const frozen = FROZEN.includes(path);
  const problems = [];
  const held = head.statements.length;
  const first = base.statements.length;
  if (frozen ? held !== first : held < first) {
    problems.push(
      `${path}: holds ${held} top-level statements other than imports, ` +
        `${frozen ? "the first commit held" : "fewer than the first commit's"} ${first}`,
    );
  } else {
    base.statements.forEach((statement, index) => {
      if (head.statements[index] !== statement) {
        problems.push(
          `${path}: statement ${index + 1} differs from the first commit: «${head.statements[index].slice(0, 80)}»`,
        );
      }
    });
  }
  for (const binding of base.imports) {
    if (!head.imports.has(binding)) problems.push(`${path}: the first commit's import ${binding} is gone`);
  }
  if (frozen) {
    for (const binding of head.imports) {
      if (!base.imports.has(binding)) problems.push(`${path}: import ${binding} is not the first commit's`);
    }
  }
  return problems;
};

const selfTest = async () => {
  const F = FROZEN[0];
  const A = APPEND_ONLY[0];
  const R = APPEND_ONLY[2];
  const base = `// header
import "./side.ts";
import * as ns from "effect/Effect";
import def from "./d.ts";
import { a as b, type C } from "./m.ts";
import type { T } from "./t.ts";

const x = 1;

describe("s", () => {
  it("a  b", () => {
    assert(x, 1);
  });
});
`;
  const reason = `"a custom predicate's answer has no form field; run against Snapshot or Live"`;
  const remedies = `import { chain } from "./c.ts";
describe("s", () => {
  it("r", () => {
    const reason = ${reason};
    assert(reason, 1);
  });
});
`;
  const row = (title, expected) => `describe("s", () => { it("${title}", () => { assert(x, ${expected}); }); });`;
  const cases = [
    { title: "frozen: identical texts, none", path: F, head: base, problems: [] },
    {
      title: "frozen: whitespace changed outside literals, none",
      path: F,
      head: base.replace("const x = 1;", "const   x   =   1;").replace(/\n {2}/g, "\n\n      "),
      problems: [],
    },
    {
      title: "frozen: the header comment changed, none",
      path: F,
      head: base.replace("// header", "// another header\n// and more"),
      problems: [],
    },
    {
      title: "frozen: imports reordered, none",
      path: F,
      head: base.replace('import "./side.ts";\n', "").replace('import type { T } from "./t.ts";', 'import type { T } from "./t.ts";\nimport "./side.ts";'),
      problems: [],
    },
    {
      title: "frozen: a title literal changed",
      path: F,
      head: base.replace('"a  b"', '"c  b"'),
      problems: [`${F}: statement 2 differs from the first commit: «${row("c  b", 1)}»`],
    },
    {
      title: "frozen: the spacing inside a string literal changed",
      path: F,
      head: base.replace('"a  b"', '"a b"'),
      problems: [`${F}: statement 2 differs from the first commit: «${row("a b", 1)}»`],
    },
    {
      title: "frozen: a statement added, the count line",
      path: F,
      head: `${base}const y = 2;\n`,
      problems: [`${F}: holds 3 top-level statements other than imports, the first commit held 2`],
    },
    {
      title: "frozen: a helper removed, the count line",
      path: F,
      head: base.replace("const x = 1;\n", ""),
      problems: [`${F}: holds 1 top-level statements other than imports, the first commit held 2`],
    },
    {
      title: "frozen: an import added",
      path: F,
      head: base.replace('import "./side.ts";', 'import "./side.ts";\nimport { z } from "./z.ts";'),
      problems: [`${F}: import { z } from packages/devtools/test/z.ts is not the first commit's`],
    },
    {
      title: "frozen: an import removed",
      path: F,
      head: base.replace('import def from "./d.ts";\n', ""),
      problems: [`${F}: the first commit's import { default as def } from packages/devtools/test/d.ts is gone`],
    },
    {
      title: "frozen: an import's type changed, both lines",
      path: F,
      head: base.replace("{ a as b, type C }", "{ a as b, C }"),
      problems: [
        `${F}: the first commit's import type { C } from packages/devtools/test/m.ts is gone`,
        `${F}: import { C } from packages/devtools/test/m.ts is not the first commit's`,
      ],
    },
    { title: "frozen: the file missing", path: F, head: undefined, problems: [`${F}: does not exist`] },
    {
      title: "append-only: a top-level describe appended, none",
      path: A,
      head: `${base}describe("t", () => {});\n`,
      problems: [],
    },
    {
      title: "append-only: an import added, none",
      path: A,
      head: base.replace('import "./side.ts";', 'import "./side.ts";\nimport { z } from "./z.ts";'),
      problems: [],
    },
    {
      title: "append-only: an existing row's expected literal changed",
      path: A,
      head: base.replace("assert(x, 1)", "assert(x, 2)"),
      problems: [`${A}: statement 2 differs from the first commit: «${row("a  b", 2)}»`],
    },
    {
      title: "append-only: a statement removed, the fewer-than line",
      path: A,
      head: base.replace("const x = 1;\n", ""),
      problems: [`${A}: holds 1 top-level statements other than imports, fewer than the first commit's 2`],
    },
    {
      title: "append-only: the declared substitution applied, none",
      path: R,
      base: remedies,
      head: remedies
        .replace(reason, "NO_CUSTOM_PREDICATE_FIELD.reason")
        .replace('import { chain } from "./c.ts";', 'import { chain } from "./c.ts";\nimport { NO_CUSTOM_PREDICATE_FIELD } from "./f.ts";'),
      problems: [],
    },
    {
      title: "append-only: an import removed",
      path: A,
      head: base.replace('import "./side.ts";\n', ""),
      problems: [`${A}: the first commit's import import "packages/core/test/side.ts" is gone`],
    },
  ];
  const texts = {};
  cases.forEach((one, index) => {
    texts[`base${index}`] = { path: one.path, text: one.base ?? base };
    const head = prepared(one.path, one.head);
    if (head !== undefined) texts[`head${index}`] = { path: one.path, text: head };
  });
  const facts = await readAll(texts);
  const failed = cases.flatMap((one, index) => {
    const problems = problemsOf(one.path, facts[`base${index}`], facts[`head${index}`]);
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
  const paths = [...FROZEN, ...APPEND_ONLY];
  const texts = {};
  paths.forEach((path, index) => {
    const first = execFileSync("git", ["show", `${BASE}:${path}`], { cwd: root, encoding: "utf8" });
    texts[`base${index}`] = { path, text: first };
    if (existsSync(join(root, path))) {
      texts[`head${index}`] = { path, text: prepared(path, readFileSync(join(root, path), "utf8")) };
    }
  });
  const facts = await readAll(texts);
  const problems = paths.flatMap((path, index) => problemsOf(path, facts[`base${index}`], facts[`head${index}`]));
  if (problems.length > 0) {
    console.error(`agreement-check: ${problems.length} problem(s)\n${problems.join("\n")}`);
    process.exit(1);
  }
  console.log(
    `agreement-check: ${FROZEN.length} frozen and ${APPEND_ONLY.length} append-only file(s) hold the statements of ${BASE.slice(0, 8)}`,
  );
};

if (process.argv.includes("--self-test")) await selfTest();
else await main();
