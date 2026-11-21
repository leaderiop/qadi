// node .planning/phases/QD-68.1-address-tech-debt/68.1-compare.mjs <base-ref> <file>...
// node .planning/phases/QD-68.1-address-tech-debt/68.1-compare.mjs --self-test
//
// Phase 68's comparison (`68-compare.mjs`, kept as recorded) with its tokens read from the TypeScript source instead of
// the JavaScript `transpileModule` emits, so a type-only edit is a difference. Shows an edit changed only comments, line
// breaks and test titles: each file at <base-ref> (`git show`) and in the working tree has the title of every `it`,
// `test` and `describe` call (its first argument, when that is a string) masked to `""`, and is then read by
// TypeScript's scanner over that source text (its JSX variant for a `.tsx` or `.jsx` file), comments and whitespace
// dropped and every other token kept, types included. The two token lists must be the same, a trailing comma before
// `}`, `]`, `)` or `>` aside, and the two files must hold the same number of test and describe calls. Prints one
// `same:` line per file and exits 0, or a `differs:` line and exits 1. The root's `typescript` is the Go port (7.x),
// which has no JS API, so the first installed TypeScript that has `createScanner` is used, newest first. A phase
// record, not run by `pnpm check:pr`.
import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";

const req = createRequire(`${process.cwd()}/`);
const ts = [
  "typescript",
  ...readdirSync("node_modules/.pnpm")
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
  .find((m) => typeof m?.createScanner === "function");
if (ts === undefined) throw new Error("no installed TypeScript has a JS API (createScanner)");

const TITLED = new Set(["it", "test", "describe"]);
/** The identifier a callee chain starts from: `it` for `it.effect`, `it.layer(x)` and `describe.each(y)`. */
const root = (node) => {
  let n = node;
  while (ts.isPropertyAccessExpression(n) || ts.isCallExpression(n)) n = n.expression;
  return ts.isIdentifier(n) ? n.text : undefined;
};

/** The text with every titled call's string title masked, and the count of test and describe calls. */
export const masked = (name, text) => {
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

/** The tokens of the source text, types included: comments, whitespace and trailing commas dropped. */
export const tokens = (name, text) => {
  const scanner = ts.createScanner(ts.ScriptTarget.ESNext, true, name.endsWith("x") ? ts.LanguageVariant.JSX : ts.LanguageVariant.Standard, text);
  const K = ts.SyntaxKind;
  // A `/` after a token that ends an expression divides; anywhere else it opens a regular expression.
  const ENDS = new Set([K.Identifier, K.NumericLiteral, K.BigIntLiteral, K.StringLiteral, K.CloseParenToken, K.CloseBracketToken, K.CloseBraceToken, K.NoSubstitutionTemplateLiteral, K.TemplateTail, K.ThisKeyword, K.SuperKeyword, K.TrueKeyword, K.FalseKeyword, K.NullKeyword, K.RegularExpressionLiteral, K.PlusPlusToken, K.MinusMinusToken]);
  const out = [];
  // Per open template substitution, how many braces are open inside it: its `}` at zero resumes the template.
  const open = [];
  let last = K.Unknown;
  for (let kind = scanner.scan(); kind !== K.EndOfFileToken; kind = scanner.scan()) {
    if (kind === K.CloseBraceToken && open.length > 0 && open[open.length - 1] === 0) {
      open.pop();
      kind = scanner.reScanTemplateToken(false);
    } else if (kind === K.OpenBraceToken && open.length > 0) open[open.length - 1] += 1;
    else if (kind === K.CloseBraceToken && open.length > 0) open[open.length - 1] -= 1;
    else if ((kind === K.SlashToken || kind === K.SlashEqualsToken) && !ENDS.has(last)) kind = scanner.reScanSlashToken();
    if (kind === K.TemplateHead || kind === K.TemplateMiddle) open.push(0);
    out.push(scanner.getTokenText());
    last = kind;
  }
  return out.filter((t, i) => t !== "," || !["}", "]", ")", ">"].includes(out[i + 1]));
};

/** Why `after` is not `before` up to comments, line breaks and titles; undefined when it is. */
export const differs = (name, before, after) => {
  const b = masked(name, before);
  const a = masked(name, after);
  if (b.counts.tests !== a.counts.tests || b.counts.describes !== a.counts.describes) {
    return `${b.counts.tests} tests and ${b.counts.describes} describes became ${a.counts.tests} and ${a.counts.describes}`;
  }
  const bt = tokens(name, b.text);
  const at = tokens(name, a.text);
  const i = bt.findIndex((t, k) => t !== at[k]);
  if (i === -1 && bt.length === at.length) return undefined;
  const at_ = i === -1 ? Math.min(bt.length, at.length) : i;
  return `the source tokens differ at token ${at_}: ${JSON.stringify(bt.slice(at_, at_ + 6).join(" "))} became ${JSON.stringify(at.slice(at_, at_ + 6).join(" "))}`;
};

const selfTest = () => {
  const base = [
    "// header",
    'describe("old group", () => {',
    '  it.effect("old title", () => Effect.gen(function* () { const x = 1; assert.strictEqual(x, 1); }));',
    '  it("second", () => { const entry = { a: 1, b: "two" }; assert.ok(entry); });',
    "});",
  ].join("\n");
  const templ = `${base}\nconst t = \`a \${f({ x: 1 })} b \${g(2)}\`;\nconst r = /"x"/g;`;
  const jsx = 'export const A = () => <p className="x" id="y">hello</p>;';
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
    ["a generic argument edit fails", "const m = new Map<string, number>();", "const m = new Map<string, string>();", false],
    ["a wrapped type argument list passes", "type T = Record<string, number>;", "type T = Record<\n  string,\n  number,\n>;", true],
    ["a JSX text edit in a .tsx file fails", jsx, jsx.replace("hello", "goodbye"), false, "case.tsx"],
    ["a wrapped JSX attribute list in a .tsx file passes", jsx, jsx.replace(' className="x" id="y">', '\n  className="x"\n  id="y"\n>'), true, "case.tsx"],
  ];
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
