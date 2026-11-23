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
// One rule moves a helper (code review, after the first commit): a top-level `const NAME = ...;` the first commit's file
// declared may leave a frozen or append-only file, and the file's statements are then the first commit's less that one,
// when the file imports `NAME` as a value from the shared module of SHARED, under the same local name, and the shared
// module declares `export const NAME = ...` with an equivalent declaration. Equivalent means this and no more: its
// text, whitespace collapsed and with its leading `export` dropped, is the first commit's text exactly, so no
// parameter, annotation or body may change, and a title, an input and an expected value that a helper holds cannot
// move with it. What the helper reads must come as it came: a name the moving file imported that the helper reads, and
// that no statement left in the file reads, may be dropped from the file's imports, and the shared module must import
// the same binding; no other import changes. A shared module that is itself frozen (`remedyAgreement.ts`) may hold,
// beside the first commit's statements in order, exactly the exports its movers name, and the imports they need. Every
// `describe` and `it` stays a statement of its file whole, so its title, inputs and expected values are compared as
// before. A helper that reads something only its own file declares, or that differs between two files, stays.
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
      const locals = new Map();
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
        const bind = (local, imported, type) => {
          const binding = shown(local, { module, imported, type: typeOnly || type });
          imports.add(binding);
          locals.set(binding, local);
        };
        if (clause?.name !== undefined) bind(clause.name.text, "default", false);
        if (bindings?.kind === SyntaxKind.NamespaceImport) bind(bindings.name.text, "*", false);
        for (const element of elements) {
          bind(element.name.text, (element.propertyName ?? element.name).text, element.isTypeOnly);
        }
        if (clause?.name === undefined && bindings === undefined) imports.add(shown("", { module }));
      }
      facts[name] = { statements, imports, locals };
    }
    return facts;
  } finally {
    api.close();
  }
};

/** The shared module a helper that left a file of the first commit may have moved to. */
const SHARED = new Map([
  ["packages/devtools/test/model/RemedySignatureConformance.test.ts", "packages/devtools/test/remedyAgreement.ts"],
  ["packages/devtools/test/model/RemedyActedConformance.test.ts", "packages/devtools/test/remedyAgreement.ts"],
  ["packages/core/test/SignatureHistory.test.ts", "packages/core/test/fixtureJudgement.ts"],
  ["packages/core/test/DecisionHistory.test.ts", "packages/core/test/fixtureJudgement.ts"],
]);

/** Each `const` a statement list declares at top level, by name, with its text and whether it is exported. */
const declaredIn = (statements) => {
  const declared = new Map();
  for (const text of statements) {
    const match = /^(export )?const ([\w$]+)\b/.exec(text);
    if (match !== null) declared.set(match[2], { text: text.replace(/^export /, ""), exported: match[1] !== undefined });
  }
  return declared;
};

/** Whether `name` is read as an identifier in `text`. */
const reads = (name, text) => new RegExp(`(^|[^\\w$])${name.replace(/\$/g, "\\$")}($|[^\\w$])`).test(text);

/**
 * The helpers `path` moved to its shared module, as name to the first commit's text, and what is wrong with each.
 *
 * A helper moved when the first commit declared it, the file no longer does, and the file imports it from the shared
 * module as a value under its own name. `sharedHead` is the shared module's checked-out facts, or `undefined`.
 */
const movesOf = (path, base, head, sharedHead) => {
  const moved = new Map();
  const problems = [];
  const shared = SHARED.get(path);
  if (head === undefined || shared === undefined) return { moved, problems };
  const there = declaredIn(sharedHead?.statements ?? []);
  for (const [name, { text }] of declaredIn(base.statements)) {
    if (head.statements.includes(text)) continue;
    if (!head.imports.has(shown(name, { module: shared, imported: name, type: false }))) continue;
    moved.set(name, text);
    const found = there.get(name);
    if (found === undefined || !found.exported) {
      problems.push(`${path}: helper ${name} is imported from ${shared}, which does not export it`);
    } else if (found.text !== text) {
      problems.push(`${path}: helper ${name} moved to ${shared} with other text than the first commit's`);
    }
    for (const [binding, local] of base.locals) {
      if (reads(local, text) && !(sharedHead?.imports.has(binding) ?? false)) {
        problems.push(`${path}: helper ${name} reads ${local}, which ${shared} does not import as ${binding}`);
      }
    }
  }
  return { moved, problems };
};

/**
 * Every way the checked-out file `head` departs from the first commit's `base`, one line each.
 *
 * `head` is `undefined` for a file that is not there. A frozen file holds the first commit's statements and imports
 * exactly; an append-only file holds the first commit's statements as a prefix and every one of its imports.
 */
const problemsOf = (path, base, head, { moved = new Map(), into = new Map() } = {}) => {
  if (head === undefined) return [`${path}: does not exist`];
  const frozen = FROZEN.includes(path);
  const problems = [];
  const left = new Set(moved.values());
  const taken = new Set(into.values());
  const expected = base.statements.filter((statement) => !left.has(statement));
  const headStatements = head.statements.filter((statement) => !taken.has(statement.replace(/^export /, "")));
  const held = headStatements.length;
  const first = expected.length;
  if (frozen ? held !== first : held < first) {
    problems.push(
      `${path}: holds ${held} top-level statements other than imports, ` +
        `${frozen ? "the first commit held" : "fewer than the first commit's"} ${first}`,
    );
  } else {
    expected.forEach((statement, index) => {
      if (headStatements[index] !== statement) {
        problems.push(
          `${path}: statement ${index + 1} differs from the first commit: «${headStatements[index].slice(0, 80)}»`,
        );
      }
    });
  }
  const movedText = [...left, ...taken];
  const stillRead = (local) => headStatements.some((statement) => reads(local, statement));
  for (const binding of base.imports) {
    if (head.imports.has(binding)) continue;
    const local = base.locals.get(binding);
    const dropped = left.size > 0 && local !== undefined && movedText.some((text) => reads(local, text)) && !stillRead(local);
    if (!dropped) problems.push(`${path}: the first commit's import ${binding} is gone`);
  }
  if (frozen) {
    for (const binding of head.imports) {
      if (base.imports.has(binding)) continue;
      const local = head.locals.get(binding);
      const name = [...moved.keys()].find((one) => binding === shown(one, { module: SHARED.get(path), imported: one, type: false }));
      const needed = taken.size > 0 && local !== undefined && [...taken].some((text) => reads(local, text));
      if (name === undefined && !needed) problems.push(`${path}: import ${binding} is not the first commit's`);
    }
  }
  return problems;
};

/**
 * Every problem of the checked files, with the helpers each moved to its shared module.
 *
 * `entries` lists each checked file with its first commit's facts and its checked-out facts; `extras` lists a shared
 * module the check does not freeze, with its checked-out facts, so a helper moved to it can be compared.
 */
const checkAll = (entries, extras = []) => {
  const heads = new Map([...extras, ...entries].map((one) => [one.path, one.head]));
  const moves = entries.map(({ path, base, head }) => movesOf(path, base, head, heads.get(SHARED.get(path))));
  const into = new Map();
  entries.forEach(({ path }, index) => {
    const shared = SHARED.get(path);
    if (shared !== undefined) into.set(shared, new Map([...(into.get(shared) ?? []), ...moves[index].moved]));
  });
  return entries.flatMap(({ path, base, head }, index) => [
    ...moves[index].problems,
    ...problemsOf(path, base, head, { moved: moves[index].moved, into: into.get(path) }),
  ]);
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
    const problems = checkAll([{ path: one.path, base: facts[`base${index}`], head: facts[`head${index}`] }]);
    const same =
      problems.length === one.problems.length && problems.every((problem, at) => problem === one.problems[at]);
    return same ? [] : [`${one.title}: expected ${JSON.stringify(one.problems)}, got ${JSON.stringify(problems)}`];
  });
  // A helper that moved from a frozen test file to the frozen shared module: `M` is the mover, `S` the shared module.
  const M = FROZEN[2];
  const S = FROZEN[0];
  const moverBase = `import { assert } from "@effect/vitest";
import type { RemedySweep } from "../../src/model/Remedies.ts";
import { asker } from "../remedyAgreement.ts";

const gave = (sweep: RemedySweep): string => \`edits \${sweep.edits}\`;

describe("s", () => {
  it("a", () => {
    assert(gave(x), "edits");
  });
});
`;
  const sharedBase = `export const asker = 1;
`;
  const moverMoved = moverBase
    .replace('import type { RemedySweep } from "../../src/model/Remedies.ts";\n', "")
    .replace("{ asker }", "{ asker, gave }")
    .replace(/const gave = .*\n\n/, "");
  const sharedMoved = `import type { RemedySweep } from "../src/model/Remedies.ts";
export const asker = 1;
export const gave = (sweep: RemedySweep): string => \`edits \${sweep.edits}\`;
`;
  const moves = [
    { title: "moved: an identical move, with the import only it read, none", head: [sharedMoved, moverMoved], problems: [] },
    {
      title: "moved: the same text with other whitespace, none",
      head: [sharedMoved.replace("(sweep: RemedySweep): string =>", "(sweep:   RemedySweep):   string  =>"), moverMoved],
      problems: [],
    },
    {
      title: "moved: the moved helper's text changed",
      head: [sharedMoved.replace("`edits ${sweep.edits}`", "`edits: ${sweep.edits}`"), moverMoved],
      problems: [
        `${S}: holds 2 top-level statements other than imports, the first commit held 1`,
        `${M}: helper gave moved to ${S} with other text than the first commit's`,
      ],
    },
    {
      title: "moved: the shared module does not export it",
      head: [sharedMoved.replace("export const gave", "const gave"), moverMoved],
      problems: [`${M}: helper gave is imported from ${S}, which does not export it`],
    },
    {
      title: "moved: the shared module lacks what it reads",
      head: [sharedMoved.replace(/import type .*\n/, ""), moverMoved],
      problems: [
        `${M}: helper gave reads RemedySweep, which ${S} does not import as ` +
          "type { RemedySweep } from packages/devtools/src/model/Remedies.ts",
      ],
    },
    {
      title: "moved: a title changed",
      head: [sharedMoved, moverMoved.replace('it("a"', 'it("b"')],
      problems: [`${M}: statement 1 differs from the first commit: «describe("s", () => { it("b", () => { assert(gave(x), "edits"); }); });»`],
    },
    {
      title: "moved: an expected value changed",
      head: [sharedMoved, moverMoved.replace('"edits");', '"other");')],
      problems: [`${M}: statement 1 differs from the first commit: «describe("s", () => { it("a", () => { assert(gave(x), "other"); }); });»`],
    },
    {
      title: "moved: the helper deleted, neither kept nor imported",
      head: [sharedBase, moverMoved.replace("{ asker, gave }", "{ asker }")],
      problems: [
        `${M}: holds 1 top-level statements other than imports, the first commit held 2`,
        `${M}: the first commit's import type { RemedySweep } from packages/devtools/src/model/Remedies.ts is gone`,
      ],
    },
    {
      title: "moved: an import dropped though the helper stayed",
      head: [sharedBase, moverBase.replace('import type { RemedySweep } from "../../src/model/Remedies.ts";\n', "")],
      problems: [
        `${M}: the first commit's import type { RemedySweep } from packages/devtools/src/model/Remedies.ts is gone`,
      ],
    },
    {
      title: "moved: the shared module gains a statement no mover named",
      head: [`${sharedMoved}export const other = 2;\n`, moverMoved],
      problems: [`${S}: holds 2 top-level statements other than imports, the first commit held 1`],
    },
  ];
  const moveTexts = {};
  moves.forEach((one, index) => {
    moveTexts[`baseM${index}`] = { path: M, text: moverBase };
    moveTexts[`baseS${index}`] = { path: S, text: sharedBase };
    moveTexts[`headS${index}`] = { path: S, text: one.head[0] };
    moveTexts[`headM${index}`] = { path: M, text: one.head[1] };
  });
  const moveFacts = await readAll(moveTexts);
  const failedMoves = moves.flatMap((one, index) => {
    const problems = checkAll([
      { path: S, base: moveFacts[`baseS${index}`], head: moveFacts[`headS${index}`] },
      { path: M, base: moveFacts[`baseM${index}`], head: moveFacts[`headM${index}`] },
    ]);
    const same =
      problems.length === one.problems.length && problems.every((problem, at) => problem === one.problems[at]);
    return same ? [] : [`${one.title}: expected ${JSON.stringify(one.problems)}, got ${JSON.stringify(problems)}`];
  });
  failed.push(...failedMoves);
  if (failed.length > 0) {
    console.error(`self-test: ${failed.length} failed\n${failed.join("\n")}`);
    process.exit(1);
  }
  console.log(`self-test: ${cases.length + moves.length} passed`);
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
  const sharedOnly = [...new Set(SHARED.values())].filter((path) => !paths.includes(path));
  sharedOnly.forEach((path, index) => {
    texts[`shared${index}`] = { path, text: readFileSync(join(root, path), "utf8") };
  });
  const facts = await readAll(texts);
  const problems = checkAll(
    paths.map((path, index) => ({ path, base: facts[`base${index}`], head: facts[`head${index}`] })),
    sharedOnly.map((path, index) => ({ path, head: facts[`shared${index}`] })),
  );
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
