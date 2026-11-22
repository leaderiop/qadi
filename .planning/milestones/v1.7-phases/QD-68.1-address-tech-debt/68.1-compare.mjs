// node .planning/milestones/v1.7-phases/QD-68.1-address-tech-debt/68.1-compare.mjs <base-ref> <file>...
// node .planning/milestones/v1.7-phases/QD-68.1-address-tech-debt/68.1-compare.mjs --self-test
//
// Phase 68's comparison (`68-compare.mjs`, kept as recorded) read from the TypeScript source instead of the JavaScript
// `transpileModule` emits, so a type-only edit is a difference. Shows two versions of a file differ only in comments, white
// space and test titles: each file at <base-ref> (`git show`) and in the working tree has the title of every `it`, `test`
// and `describe` call (its first argument, when that is a string) masked to `""`, is parsed by TypeScript (as TSX for a
// `.tsx` or `.jsx` file; a file that does not parse without syntax errors is a difference), and is then read as a list of
// entries. The two lists must be equal, and the two files must hold the same number of test and describe calls.
//
// What an entry is. The parse tree, walked in order: the kind of every node (an opening and a closing entry), the text of
// every token, types included. So a line break that changes how the text parses (`return\n1`, `yield\n1`, `i\n++j`,
// which automatic semicolon insertion turns into two statements) is a difference, and so is anything else that changes the
// tree. JSX text is an entry with JSX's own whitespace rule applied (a one-line text is kept whole; in a longer one, a
// line loses its leading white space unless it is the first and its trailing white space unless it is the last; lines that
// end up empty are dropped, the rest are joined by one space), which is the rule the compiler applies to the children it
// emits, so `a {b}` and `a{b}` differ and a re-wrapped paragraph does not. Dropped: comments, white space and line breaks
// outside JSX text, and a trailing comma in a list (but `<T,>` in a `.tsx` file keeps its comma, and an omitted array
// element is a node, so `[,]` is not `[]`).
//
// What a comment contributes. Ordinary comments contribute nothing. A comment that carries an instruction is an entry of
// its own, in order and in place, so a directive deleted, changed, or moved onto a different token differs: `@ts-expect-error`,
// `@ts-ignore`, `@ts-nocheck`, `@ts-check`, `@jsx*` pragmas (with their argument), a triple-slash directive
// (`/// <reference ... />`, `/// <amd-module ... />`), `@vitest-*` (`@vitest-environment jsdom`), `@tstyche` (with the rest of
// its line), `@effect-diagnostics` and `@effect-diagnostics-next-line` (the Effect language service's, with their rule
// arguments, the rest of the line), `v8 ignore`, `c8 ignore` and `istanbul ignore` (with the rest of the comment), `Stryker disable` and `Stryker
// restore` (up to a `:`), `eslint-disable*`, `eslint-enable`, `eslint-env`, `oxlint-disable*`, `oxlint-enable` (up to a
// `--`), `prettier-ignore`, `#__PURE__` style annotations, and a shebang. The reason text after a directive word is not
// compared. A directive that covers the next line (`@ts-expect-error`, `@ts-ignore`, `*-next-line` (`@effect-diagnostics-next-line` too), `Stryker disable
// next-line`, `* ignore next`) is paired with the tokens on the first line of code after it, so reflowing the statement it
// covers is a difference too (as is any other reformatting of that one line).
//
// Not seen (residuals, each reads as `same`): a comment's content other than the instructions above, so a JSDoc tag a tool
// reads (`@internal` under `stripInternal`, `@license`, `@preserve`, `@deprecated`), a bundler magic comment
// (`webpackChunkName`), `sourceMappingURL`, an ESLint inline configuration comment (`/* eslint rule: "off" */`,
// `/* global x */`) and any other tool's directive are ordinary comments; `eslint-disable-line` and `oxlint-disable-line`
// (which cover the line they are on) and a `v8 ignore next N` beyond its first line are kept as entries but not paired
// with a line, so reflowing the code they cover is not seen; only the first line of a directive comment that runs over
// several lines is compared (`/* eslint-disable\n a,\n b */` against the same with `c` for `b` reads `same`); and a line break
// that is a grammar error the type checker reports but the parser does not (`const f = (a)\n=> a;`) reads `same`, because only
// the parser's diagnostics are consulted. Also: a comment that only mentions an instruction (the match
// is anywhere in the comment) reads as carrying it, so editing it is a difference; and this compares what the file says,
// not what it compiles to, so it reports a difference for some edits that compile the same (quote style, parentheses, a
// braced and an unbraced `if`). It does not run the compiler, the type checker or any test. The root's `typescript` is the
// Go port (7.x), which has no JS API, so the first installed TypeScript that has `createSourceFile` is used, newest first
// (an older grammar than the project builds with, so syntax it does not know is normally a syntax error, so a
// difference). Prints one `same:` line per file and exits 0, or a `differs:` line and exits 1. A phase record, not run by
// `pnpm check:pr`.
import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";

const req = createRequire(`${process.cwd()}/`);
const pnpmStore = () => {
  try {
    return readdirSync("node_modules/.pnpm");
  } catch {
    console.error("68.1-compare.mjs: run it from the repository root (no node_modules/.pnpm here)");
    process.exit(2);
  }
};
const ts = [
  "typescript",
  ...pnpmStore()
    .filter((d) => /^typescript@\d/.test(d))
    .sort((x, y) => y.localeCompare(x, undefined, { numeric: true }))
    .map((d) => `./node_modules/.pnpm/${d}/node_modules/typescript`),
]
  .map((id) => {
    try {
      return req(id);
    } catch {
      return undefined;
    }
  })
  .find((m) => typeof m?.createSourceFile === "function");
if (ts === undefined) throw new Error("no installed TypeScript has a JS API (createSourceFile)");

const TITLED = new Set(["it", "test", "describe"]);
/** The identifier a callee chain starts from: `it` for `it.effect`, `it.layer(x)` and `describe.each(y)`. */
const root = (node) => {
  let n = node;
  while (ts.isPropertyAccessExpression(n) || ts.isCallExpression(n)) n = n.expression;
  return ts.isIdentifier(n) ? n.text : undefined;
};

/** The text with every titled call's string title masked, and the count of test and describe calls. */
const masked = (name, text) => {
  const file = ts.createSourceFile(name, text, ts.ScriptTarget.ESNext, true, name.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const spans = [];
  const counts = { tests: 0, describes: 0 };
  const visit = (node) => {
    if (ts.isCallExpression(node)) {
      const r = root(node.expression);
      if (r !== undefined && TITLED.has(r)) {
        if (r === "describe") counts.describes += 1;
        else counts.tests += 1;
        const first = node.arguments[0];
        if (first !== undefined && (ts.isStringLiteral(first) || ts.isNoSubstitutionTemplateLiteral(first))) {
          spans.push([first.getStart(file), first.getEnd()]);
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(file);
  let out = text;
  for (const [start, end] of spans.sort((a, b) => b[0] - a[0])) out = `${out.slice(0, start)}""${out.slice(end)}`;
  return { text: out, counts };
};

/**
 * What a comment carries as an instruction. Each alternative captures the directive and the text that is part of it (not a
 * reason); a comment is searched for every match, so a comment that mentions one reads as carrying it.
 */
const DIRECTIVE = new RegExp(
  [
    String.raw`@ts-(?:expect-error|ignore|nocheck|check)\b`,
    String.raw`@jsx\w*\b(?:[ \t]+[^\s*]+)?`,
    String.raw`@vitest-[\w-]+\b[ \t]*[^\s*]*`,
    String.raw`@tstyche\b[^\r\n*]*`,
    String.raw`@effect-diagnostics[\w-]*\b(?:[^\r\n*]|\*(?!\/))*`,
    String.raw`\/\/\/[ \t]*<[\w-]+[^>]*>`,
    String.raw`\b(?:v8|c8|istanbul) ignore\b[^\r\n*]*`,
    String.raw`\bStryker (?:disable|restore)\b[^:\r\n*]*`,
    String.raw`\b(?:eslint|oxlint)-(?:disable(?:-next-line|-line)?|enable|env)\b[^\r\n*]*?(?=[ \t]+--|[\r\n*]|$)`,
    String.raw`\bprettier-ignore\b`,
    String.raw`[@#]__\w+__`,
  ].join("|"),
  "g",
);
/** The directives that cover the next line of code. */
const NEXT_LINE = /@ts-(?:expect-error|ignore)\b|\bnext-line\b|\b(?:v8|c8|istanbul) ignore next\b/;

/** JSX's own rule for text (see the header). */
const jsxText = (text) => {
  const lines = text.split(/\r\n|[\n\r\u2028\u2029]/);
  return lines
    .map((l, i) => {
      let s = l;
      if (i !== 0) s = s.replace(/^[ \t]+/, "");
      if (i !== lines.length - 1) s = s.replace(/[ \t]+$/, "");
      return s;
    })
    .filter((s) => s !== "")
    .join(" ");
};

const parse = (name, text) =>
  ts.createSourceFile(name, text, ts.ScriptTarget.ESNext, true, name.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);

/**
 * The entries of the source text, read from the parse tree (see the header): `o<Kind>` opens a node and `c` closes it, `t<text>`
 * is a token, `x<text>` is JSX text and `d<text>` is a directive. The tag keeps an entry of one origin from equalling one of another.
 */
const entries = (name, text) => {
  const file = parse(name, text);
  if (!Array.isArray(file.parseDiagnostics)) throw new Error("this TypeScript has no parseDiagnostics");
  const tsx = name.endsWith("x");
  const K = ts.SyntaxKind;
  const out = [];
  const lineOf = (pos) => file.getLineAndCharacterOfPosition(pos).line;
  /** Next-line directives collecting the tokens of the first line of code after them. */
  const covering = [];
  const cover = (s, pos) => {
    const line = lineOf(pos);
    for (const c of covering) {
      if (c.line === -1 && line > c.after) c.line = line;
      if (c.line === line) c.parts.push(s);
    }
  };
  const directivesIn = (from, to) => {
    const scanner = ts.createScanner(ts.ScriptTarget.ESNext, false, ts.LanguageVariant.Standard, text, undefined, from, to - from);
    for (let k = scanner.scan(); k !== K.EndOfFileToken; k = scanner.scan()) {
      const comment = scanner.getTokenText();
      if (k === K.ShebangTrivia) out.push(`d${comment.trim()}`);
      else if (k === K.SingleLineCommentTrivia || k === K.MultiLineCommentTrivia) {
        for (const m of comment.matchAll(DIRECTIVE)) {
          // The Effect language service reads its directive with exact spacing, so its text is kept as written.
          const d = m[0].startsWith("@effect-diagnostics") ? m[0].trimEnd() : m[0].replace(/\s+/g, " ").trim();
          if (NEXT_LINE.test(d)) {
            covering.push({ at: out.length, d, after: lineOf(scanner.getTokenEnd()), line: -1, parts: [] });
            out.push("d");
          } else out.push(`d${d}`);
        }
      }
    }
  };
  const visit = (node) => {
    if (node.kind >= K.FirstJSDocNode && node.kind <= K.LastJSDocNode) return;
    if (node.kind === K.JsxText) {
      const raw = text.slice(node.pos, node.end);
      const t = jsxText(raw);
      if (t !== "") {
        out.push(`x${t}`);
        cover(t, node.pos + raw.length - raw.trimStart().length);
      }
      return;
    }
    const children = node.getChildren(file);
    out.push(`o${K[node.kind]}`);
    if (children.length === 0) {
      if (node.kind < K.FirstNode) {
        const start = node.getStart(file);
        directivesIn(node.getFullStart(), start);
        if (node.getEnd() > start) {
          const s = node.getText(file);
          out.push(`t${s}`);
          cover(s, start);
        }
      }
    } else {
      const keepsComma = tsx && node.kind === K.SyntaxList && node.parent?.kind === K.ArrowFunction && children[0]?.kind === K.TypeParameter;
      children.forEach((child, i) => {
        if (i === children.length - 1 && child.kind === K.CommaToken && node.kind === K.SyntaxList && !keepsComma) {
          directivesIn(child.getFullStart(), child.getStart(file));
          return;
        }
        visit(child);
      });
    }
    out.push("c");
  };
  visit(file);
  for (const c of covering) out[c.at] = `d${c.d} => ${c.parts.join(" ")}`;
  return out;
};

/** The first syntax error TypeScript reports for the text, or undefined. */
const syntaxError = (name, text) => {
  const file = parse(name, text);
  const d = file.parseDiagnostics[0];
  if (d === undefined) return undefined;
  return `${ts.flattenDiagnosticMessageText(d.messageText, " ")} at line ${file.getLineAndCharacterOfPosition(d.start ?? 0).line + 1}`;
};

const show = (list, from) => {
  const window = list.slice(from, from + 10);
  const shown = window.filter((e) => e !== "c");
  return JSON.stringify((shown.length === 0 ? window : shown).map((e) => (e[0] === "o" ? `<${e.slice(1)}>` : e === "c" ? "</>" : e.slice(1))).join(" "));
};

/** Why `after` is not `before` up to comments, white space, line breaks and titles; undefined when it is. */
const differs = (name, before, after) => {
  const b = masked(name, before);
  const a = masked(name, after);
  if (b.counts.tests !== a.counts.tests || b.counts.describes !== a.counts.describes) {
    return `${b.counts.tests} tests and ${b.counts.describes} describes became ${a.counts.tests} and ${a.counts.describes}`;
  }
  for (const [side, text] of [["before", b.text], ["after", a.text]]) {
    const error = syntaxError(name, text);
    if (error !== undefined) return `the ${side} text does not parse (${error})`;
  }
  const bt = entries(name, b.text);
  const at = entries(name, a.text);
  const i = bt.findIndex((t, k) => t !== at[k]);
  if (i === -1 && bt.length === at.length) return undefined;
  const at_ = i === -1 ? Math.min(bt.length, at.length) : i;
  return `the parse trees differ at entry ${at_}: ${show(bt, at_)} became ${show(at, at_)}`;
};

const base = [
  "// header",
  'describe("old group", () => {',
  '  it.effect("old title", () => Effect.gen(function* () { const x = 1; assert.strictEqual(x, 1); }));',
  '  it("second", () => { const entry = { a: 1, b: "two" }; assert.ok(entry); });',
  "});",
].join("\n");
const templ = `${base}\nconst t = \`a \${f({ x: 1 })} b \${g(2)}\`;\nconst r = /"x"/g;`;
const jsx = 'export const A = () => <p className="x" id="y">hello</p>;';
const directive = "// @ts-expect-error\nconst n: number = 'a';";
const tsxGeneric = "export const id = <T,>(x: T) => x;";
const jsxUrl = "export const B = () => <p>see http://a.example/x and more</p>;";
const tsx = (body) => `export const A = () => ${body};`;
// [name, before, after, same, file = "case.ts"]
const cases = [
  ["an unchanged file passes", base, base, true],
  ["a comment edit passes", base, base.replace("// header", "/* a new header,\n * on two lines */"), true],
  ["a title edit passes", base, base.replace('"old title"', '"a new title"').replace('"old group"', "`another group`"), true],
  ["a line wrap passes", base, base.replace('{ a: 1, b: "two" }', '{\n    a: 1,\n    b: "two",\n  }'), true],
  ["an assertion edit fails", base, base.replace("assert.strictEqual(x, 1)", "assert.strictEqual(x, 2)"), false],
  ["a string that is not a title fails", base, base.replace('b: "two"', 'b: "three"'), false],
  ["a deleted assertion fails", base, base.replace(" assert.ok(entry);", ""), false],
  ["a test added fails", base, base.replace("});\n", '});\n  it("third", () => {});\n'), false],
  ["a test renamed to a non-test call fails", base, base.replace('  it("second"', '  run("second"'), false],
  ["a wrap inside a template substitution passes", templ, templ.replace("{ x: 1 }", "{\n  x: 1,\n}"), true],
  ["an edit to a template's text fails", templ, templ.replace(" b ", " c "), false],
  ["an edit to a regular expression fails", templ, templ.replace('/"x"/g', '/"y"/g'), false],
  ["a wrap after a regular expression holding a backtick passes", "const r = /`/;\nconst e = { c: 1, d: 2 };", "const r = /`/;\nconst e = {\n  c: 1,\n  d: 2,\n};", true],
  ["a wrap after a template passes", "const m = `a ${x} b`;\nconst e = { c: 1, d: 2 };", "const m = `a ${x} b`;\nconst e = {\n  c: 1,\n  d: 2,\n};", true],
  ["a type-only edit fails", "export const f = (x: number): number => x;", "export const f = (x: string): number => x;", false],
  ["an interface member type edit fails", "interface A { a: number }", "interface A { a: string }", false],
  ["a generic argument edit fails", "const m = new Map<string, number>();", "const m = new Map<string, string>();", false],
  ["a wrapped type argument list passes", "type T = Record<string, number>;", "type T = Record<\n  string,\n  number,\n>;", true],
  ["a JSX text edit in a .tsx file fails", jsx, jsx.replace("hello", "goodbye"), false, "case.tsx"],
  ["a wrapped JSX attribute list in a .tsx file passes", jsx, jsx.replace(' className="x" id="y">', '\n  className="x"\n  id="y"\n>'), true, "case.tsx"],
  ["a deleted @ts-expect-error directive fails", directive, directive.replace("// @ts-expect-error\n", ""), false],
  ["a deleted @ts-ignore block comment fails", "/* @ts-ignore */\nconst n: number = 'a';", "const n: number = 'a';", false],
  ["a changed directive fails", directive, directive.replace("expect-error", "ignore"), false],
  ["a directive's reason edit passes", `// @ts-expect-error: why\n${directive.split("\n")[1]}`, `// @ts-expect-error: another reason\n${directive.split("\n")[1]}`, true],
  ["a deleted @jsxImportSource pragma fails", "/** @jsxImportSource x */\nexport const A = () => <p />;", "export const A = () => <p />;", false, "case.tsx"],
  ["a changed @jsxImportSource argument fails", "/** @jsxImportSource x */\nexport const A = () => <p />;", "/** @jsxImportSource y */\nexport const A = () => <p />;", false, "case.tsx"],
  ["an omitted array element fails", "const a = [,];", "const a = [];", false],
  ["a second omitted array element fails", "const a = [1,,];", "const a = [1,];", false],
  ["a trailing array comma passes", "const a = [1,];", "const a = [1];", true],
  ["a dropped <T,> comma in a .tsx file fails", tsxGeneric, tsxGeneric.replace("<T,>", "<T>"), false, "case.tsx"],
  ["a dropped <T,> comma in a .ts file passes", tsxGeneric, tsxGeneric.replace("<T,>", "<T>"), true],
  ["a JSX text edit after // fails", jsxUrl, jsxUrl.replace("x and", "y and"), false, "case.tsx"],
  ["a JSX text re-wrap passes", jsxUrl, jsxUrl.replace("and more", "and\n  more"), true, "case.tsx"],
  ["a JSX text edit before // in the same line fails", jsxUrl, jsxUrl.replace("see", "saw"), false, "case.tsx"],
  // JSX white space (review WR-01)
  ["a dropped space after JSX text fails", tsx("<p>a {b}</p>"), tsx("<p>a{b}</p>"), false, "case.tsx"],
  ["a dropped space before JSX text fails", tsx("<p>{b} a</p>"), tsx("<p>{b}a</p>"), false, "case.tsx"],
  ["a dropped space between sibling elements fails", tsx("<div><a /> <b /></div>"), tsx("<div><a /><b /></div>"), false, "case.tsx"],
  ["a dropped lone space in an element fails", tsx("<p> </p>"), tsx("<p></p>"), false, "case.tsx"],
  ["a line break that drops a space before an expression fails", tsx("<p>a\n{b}</p>"), tsx("<p>a {b}</p>"), false, "case.tsx"],
  ["a doubled space inside JSX text fails", tsx("<p>a b</p>"), tsx("<p>a  b</p>"), false, "case.tsx"],
  ["a line break between sibling elements passes", tsx("<div><a /><b /></div>"), tsx("<div><a />\n  <b />\n</div>"), true, "case.tsx"],
  ["a re-indented multi-line JSX text passes", tsx("<p>\n  a\n  b\n</p>"), tsx("<p>\n      a\n      b\n</p>"), true, "case.tsx"],
  ["joined lines of JSX text pass", tsx("<p>\n  a\n  b\n</p>"), tsx("<p>a b</p>"), true, "case.tsx"],
  // automatic semicolon insertion (review WR-02)
  ["a line break after return fails", "function f() { return 1; }", "function f() {\n  return\n  1;\n}", false],
  ["a line break after yield fails", "function* f() { yield 1; }", "function* f() {\n  yield\n  1;\n}", false],
  ["a line break before a postfix operator fails", "let i = 0, j = 0;\ni++\nj;", "let i = 0, j = 0;\ni\n++\nj;", false],
  ["a line break after break fails", "a: for (;;) { break a; }", "a: for (;;) {\n  break\n  a;\n}", false],
  ["a line break after return in an arrow body fails", "const f = () => { return 1; };", "const f = () => {\n  return\n  1;\n};", false],
  ["a line break before a call's arguments passes", "f(a);", "f\n(a);", true],
  ["a line break inside a binary expression passes", "const x = y + z;", "const x = y +\n  z;", true],
  ["a file that does not parse fails even when unchanged", "const a = ;", "const a = ;", false],
  // comment-borne instructions (review WR-03)
  ["a deleted /// <reference> directive fails", '/// <reference types="vitest" />\nconst a = 1;', "const a = 1;", false],
  ["a changed /// <reference> directive fails", '/// <reference types="vitest" />\nconst a = 1;', '/// <reference types="node" />\nconst a = 1;', false],
  ["a deleted @vitest-environment fails", "// @vitest-environment jsdom\nconst a = 1;", "const a = 1;", false],
  ["a changed @vitest-environment fails", "// @vitest-environment jsdom\nconst a = 1;", "// @vitest-environment node\nconst a = 1;", false],
  ["a deleted @tstyche fixme fails", "// @tstyche fixme\nconst a = 1;", "const a = 1;", false],
  ["a changed @tstyche directive fails", "// @tstyche fixme\nconst a = 1;", "// @tstyche if { target: ['>=5.4'] }\nconst a = 1;", false],
  ["a deleted v8 ignore fails", "/* v8 ignore next */\nconst a = 1;", "const a = 1;", false],
  ["a deleted c8 ignore start fails", "// c8 ignore start\nconst a = 1;\n// c8 ignore stop\n", "const a = 1;\n", false],
  ["a deleted istanbul ignore fails", "/* istanbul ignore next */\nconst a = 1;", "const a = 1;", false],
  ["a deleted Stryker disable fails", "// Stryker disable next-line all\nconst a = 1;", "const a = 1;", false],
  ["a Stryker disable's reason edit passes", "// Stryker disable next-line all: because\nconst a = 1;", "// Stryker disable next-line all: another reason\nconst a = 1;", true],
  ["a deleted Stryker restore fails", "// Stryker disable all\nconst a = 1;\n// Stryker restore all\nconst b = 2;", "// Stryker disable all\nconst a = 1;\nconst b = 2;", false],
  ["a deleted shebang fails", "#!/usr/bin/env node\nconst a = 1;", "const a = 1;", false],
  ["a changed shebang fails", "#!/usr/bin/env node\nconst a = 1;", "#!/usr/bin/env bun\nconst a = 1;", false],
  ["a deleted eslint-disable-next-line fails", "// eslint-disable-next-line no-console\nconsole.log(1);", "console.log(1);", false],
  ["an eslint-disable-next-line's reason edit passes", "// eslint-disable-next-line no-console -- why\nconsole.log(1);", "// eslint-disable-next-line no-console -- another\nconsole.log(1);", true],
  ["a deleted oxlint-disable fails", "/* oxlint-disable no-console */\nconsole.log(1);", "console.log(1);", false],
  ["a deleted prettier-ignore fails", "// prettier-ignore\nconst a = [1,2];", "const a = [1,2];", false],
  ["a deleted /*#__PURE__*/ annotation fails", "const a = /*#__PURE__*/ f();", "const a = f();", false],
  ["a directive moved onto a different statement fails", "// @ts-expect-error\nconst n: number = 'a';\nconst m = 1;", "const n: number = 'a';\n// @ts-expect-error\nconst m = 1;", false],
  ["a directive moved onto a different token fails", "// @tstyche fixme\nf(a, b);", "f(a,\n  // @tstyche fixme\n  b);", false],
  ["a wrap of the line a @ts-expect-error covers fails", 'f(1, "a");\n// @ts-expect-error\nfoo(1, "a");', 'f(1, "a");\n// @ts-expect-error\nfoo(\n  1,\n  "a",\n);', false],
  ["a join of the line a @ts-expect-error covers fails", '// @ts-expect-error\nfoo(\n  1,\n  "a",\n);', '// @ts-expect-error\nfoo(1, "a");', false],
  ["the same wrap without a directive passes", 'f(1, "a");\nfoo(1, "a");', 'f(1, "a");\nfoo(\n  1,\n  "a",\n);', true],
  ["a blank line after a directive passes", directive, directive.replace("\n", "\n\n"), true],
  ["a comment between a directive and its line passes", directive, directive.replace("\n", "\n// why\n"), true],
  // the Effect language service's directives (review WR-01)
  ["a deleted @effect-diagnostics directive fails", "// @effect-diagnostics effect/floatingEffect:error\nconst a = 1;", "const a = 1;", false],
  ["a changed @effect-diagnostics rule argument fails", "// @effect-diagnostics effect/floatingEffect:error\nconst a = 1;", "// @effect-diagnostics effect/floatingEffect:off\nconst a = 1;", false],
  ["a deleted @effect-diagnostics-next-line directive fails", "// @effect-diagnostics-next-line effect/floatingEffect:off\nf();", "f();", false],
  ["a changed @effect-diagnostics-next-line rule argument fails", "// @effect-diagnostics-next-line effect/floatingEffect:off\nf();", "// @effect-diagnostics-next-line effect/floatingEffect:warning\nf();", false],
  ["a @effect-diagnostics-next-line moved onto a different statement fails", "// @effect-diagnostics-next-line effect/floatingEffect:off\nf();\ng();", "f();\n// @effect-diagnostics-next-line effect/floatingEffect:off\ng();", false],
  ["a wrap of the line a @effect-diagnostics-next-line covers fails", '// @effect-diagnostics-next-line effect/floatingEffect:off\nfoo(1, "a");', '// @effect-diagnostics-next-line effect/floatingEffect:off\nfoo(\n  1,\n  "a",\n);', false],
  ["a changed @effect-diagnostics wildcard level fails", "// @effect-diagnostics *:off\nconst a = 1;", "// @effect-diagnostics *:error\nconst a = 1;", false],
  ["a wildcard removed from an @effect-diagnostics line fails", "// @effect-diagnostics floatingEffect:off *:off\nconst a = 1;", "// @effect-diagnostics floatingEffect:off\nconst a = 1;", false],
  ["a changed @effect-diagnostics-next-line wildcard fails", "// @effect-diagnostics-next-line *:off\nf();", "// @effect-diagnostics-next-line *:warning\nf();", false],
  ["a block-comment @effect-diagnostics still ends at its close", "/* @effect-diagnostics floatingEffect:off */\nconst a = 1;", "/* @effect-diagnostics floatingEffect:off */\nconst a = 1;", true],
  ["a doubled space in an @effect-diagnostics directive fails", "// @effect-diagnostics floatingEffect:off\nconst a = 1;", "// @effect-diagnostics  floatingEffect:off\nconst a = 1;", false],
  ["a blank line after a @effect-diagnostics-next-line passes", "// @effect-diagnostics-next-line effect/floatingEffect:off\nf();", "// @effect-diagnostics-next-line effect/floatingEffect:off\n\nf();", true],
  ["a comment that mentions a tool in prose passes", "// the v8 report is read by CI\nconst a = 1;", "// the report is read by CI\nconst a = 1;", true],
  ["an edit to an ordinary block comment passes", "/**\n * Adds one.\n */\nconst a = 1;", "/**\n * Adds two.\n */\nconst a = 1;", true],
];

const selfTest = () => {
  let passed = 0;
  for (const [name, before, after, same, file = "case.ts"] of cases) {
    const why = differs(file, before, after);
    if ((why === undefined) !== same) {
      console.error(`self-test FAILED: ${name}: ${why ?? "same"}`);
      process.exit(1);
    }
    passed += 1;
  }
  console.log(`self-test: ${passed} passed`);
};

const main = () => {
  const [base, ...files] = process.argv.slice(2);
  if (base === undefined || files.length === 0) {
    console.error("usage: 68.1-compare.mjs <base-ref> <file>... | --self-test");
    process.exit(2);
  }
  let bad = 0;
  for (const file of files) {
    const before = execFileSync("git", ["show", `${base}:${file}`], { encoding: "utf8", maxBuffer: 1 << 26 });
    const after = readFileSync(file, "utf8");
    const why = differs(file, before, after);
    const { counts } = masked(file, after);
    if (why === undefined) console.log(`same: ${file} (${counts.tests} tests, ${counts.describes} describes)`);
    else {
      bad += 1;
      console.log(`differs: ${file}: ${why}`);
    }
  }
  process.exit(bad === 0 ? 0 : 1);
};

if (process.argv[2] === "--self-test") selfTest();
else main();
