// The phase's shared check, run from the repository root as `node <this file> <mode> [args]`. Each mode is a pure
// judge over text plus a thin reader that gathers the text from git or the tree; a failure prints its reasons to stderr
// and exits 1. Modes:
//   base                                     prints phase_base (the scratch record, else the summary's phase_base line)
//   commit [--first] "<subject>" <path>...   exactly one commit since phase_base has this subject and exactly these paths
//   unchanged <path>...                      the tree matches phase_base on these paths and none is untracked
//   seen-failing <test-file> [<title>...]    each title has a failure line in the evidence file
//   scan-ids                                 added lines (tree against phase_base, .planning excluded) name no id or phase
//   scan-forbidden                           added source and test lines use none of the forbidden forms
//   trailers                                 every plan commit since phase_base has exactly one Claude trailer
//   single-source                            the collect-and-rethrow rule is written once, in `callAll`
//   --self-test                              drives every judge with planted text
// Shortcuts: the comment and string blanking does not understand regex literals, `any` is read by the token before it,
// and a module-scope string literal is read by brace and parenthesis depth, a line holding `=>` taken as a function body
// and a type declaration skipped, so a literal inside a module-scope object literal is left to the mutation compare; a false positive is cleared by rewording the line, never by weakening a judge.
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, realpathSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

/** This script's own directory, relative to the repository root, with a trailing slash. */
const D = `${relative(process.cwd(), dirname(fileURLToPath(import.meta.url)))}/`;
const EVIDENCE = `${D}81-RED-EVIDENCE.md`;
const SUMMARY = `${D}81-01-SUMMARY.md`;
const TRAILER = /^Co-Authored-By: Claude [^<>]+ <noreply@anthropic[.]com>$/;
const PLAN_SUBJECT = /^[a-z]+[(]81-[0-9]{2}[)]!?: /;
const GUARDED = ["AGENTS.md", "scripts/check-house-style.mjs", ".oxlintrc.json"];

const fail = (lines) => {
  console.error(lines.join("\n"));
  process.exit(1);
};
const git = (...args) => execFileSync("git", args, { encoding: "utf8", maxBuffer: 1 << 28 });
const sorted = (xs) => [...xs].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
const scratch = () => join(realpathSync(process.env.TMPDIR || "/tmp"), "qd81");

/** phase_base from the scratch record, else from the summary's `phase_base:` line; undefined when neither holds one. */
export const phaseBaseOf = (scratchText, summaryText) => {
  const hex = /^[0-9a-f]{40}$/;
  if (scratchText !== undefined && hex.test(scratchText.trim())) return scratchText.trim();
  const m = /^phase_base: ([0-9a-f]{40})$/m.exec(summaryText ?? "");
  return m === null ? undefined : m[1];
};
const readBase = () => {
  const file = join(scratch(), "phase_base");
  const base = phaseBaseOf(existsSync(file) ? readFileSync(file, "utf8") : undefined, existsSync(SUMMARY) ? readFileSync(SUMMARY, "utf8") : undefined);
  if (base === undefined) fail(["phase_base is not recorded"]);
  return base;
};

/** Reasons a commit message's trailers are wrong: exactly one `Co-Authored-By:` line, naming Claude. */
export const judgeTrailer = (message) => {
  const lines = message.split("\n").filter((l) => /^Co-Authored-By:/i.test(l));
  if (lines.length !== 1) return [`the message has ${lines.length} Co-Authored-By lines, not one`];
  return TRAILER.test(lines[0]) ? [] : [`the trailer is not a Claude trailer: ${lines[0]}`];
};

/** Reasons the commit asked for is not the one commit with `subject` and exactly `paths`. `commits` are in order. */
export const judgeCommit = (commits, subject, paths, first) => {
  const hits = commits.filter((c) => c.subject === subject);
  if (hits.length !== 1) return [`${hits.length} commits since phase_base have the subject: ${subject}`];
  const [c] = hits;
  const bad = [];
  if (sorted(c.paths).join("\n") !== sorted(paths).join("\n")) bad.push(`the commit holds ${sorted(c.paths).join(", ")}, not ${sorted(paths).join(", ")}`);
  bad.push(...judgeTrailer(c.message));
  if (first && commits[0] !== c) bad.push(`the commit is not the first after phase_base (that is: ${commits[0].subject})`);
  return bad;
};

/** Reasons the tree differs from the base on the asked paths. */
export const judgeUnchanged = ({ changed, untracked }) => [
  ...changed.map((p) => `${p} differs from phase_base`),
  ...untracked.map((p) => `${p} is untracked`),
];

/** Every test title in a test file: the string literal opening `it(`, `it.effect(`, `it.live(`, `it.scoped(` or `test(`. */
export const titlesOf = (text) => {
  const out = [];
  const re = /(?<![.\w$])(?:it(?:\.(?:effect|live|scoped))?|test)\(\s*(["'`])((?:\\.|(?!\1)[^\\])*)\1/g;
  for (const m of text.matchAll(re)) out.push(m[2].replace(/\\(["'`\\])/g, "$1"));
  return out;
};

/** Reasons a title has no failure line in the evidence. With no titles asked, the file's own are asked. */
export const judgeSeenFailing = (testText, evidenceText, asked) => {
  const wanted = asked.length > 0 ? asked : titlesOf(testText);
  if (wanted.length === 0) return ["the test file has no test title"];
  const seen = new Set();
  for (const line of evidenceText.split("\n")) {
    const m = /^- (?:failed|failed [(][\w-]+[)]|red on the base): (.*)$/.exec(line);
    if (m !== null) seen.add(m[1]);
  }
  return wanted.filter((t) => !seen.has(t)).map((t) => `no failure line in the evidence for: ${t}`);
};

/** Text with comments and the text of strings and templates blanked to spaces, newlines kept; `${ }` stays code. */
export const blank = (text) => {
  const keep = (c) => (c === "\n" ? "\n" : " ");
  const n = text.length;
  const stack = [];
  let out = "";
  let mode = "code";
  let i = 0;
  while (i < n) {
    const c = text[i];
    const d = text[i + 1];
    if (mode === "tpl") {
      if (c === "\\") {
        out += ` ${keep(d ?? "")}`;
        i += 2;
      } else if (c === "`") {
        out += c;
        mode = "code";
        i++;
      } else if (c === "$" && d === "{") {
        out += "${";
        stack.push("tpl");
        mode = "code";
        i += 2;
      } else {
        out += keep(c);
        i++;
      }
    } else if (c === "/" && d === "/") {
      while (i < n && text[i] !== "\n") {
        out += " ";
        i++;
      }
    } else if (c === "/" && d === "*") {
      const end = text.indexOf("*/", i + 2);
      const stop = end < 0 ? n : end + 2;
      for (; i < stop; i++) out += keep(text[i]);
    } else if (c === '"' || c === "'") {
      out += c;
      i++;
      while (i < n && text[i] !== c && text[i] !== "\n") {
        if (text[i] === "\\") {
          out += " ";
          i++;
        }
        out += keep(text[i] ?? "");
        i++;
      }
      if (i < n && text[i] === c) {
        out += c;
        i++;
      }
    } else if (c === "`") {
      out += c;
      mode = "tpl";
      i++;
    } else if (c === "}" && stack.pop() === "tpl") {
      out += c;
      mode = "tpl";
      i++;
    } else {
      if (c === "{") stack.push("code");
      out += c;
      i++;
    }
  }
  return out;
};

const ID_TOKENS = [
  [/(?<![A-Za-z0-9-])D-\d+(?!\d)(?!-[A-Za-z])/, "a decision number"],
  [/(?<![\w.-])81-\d{2}(?!\d)/, "a plan id"],
  [/\bCOLL-0\d\b/, "a requirement id"],
  [/\bWX-0\d\b/, "a requirement id"],
  [/(?<!(?:ADR|CCR|BEH|INV|ARCH)-)\bQD-81\b/, "a phase id"],
  [/\b[Pp]hase 81\b/, "a phase number"],
  [/-NEXT\b/, "a placeholder id"],
];
const PHRASE = /this phase|until now|any more|no longer|from now on/i;
const PHRASE_EXEMPT = (file) => file.startsWith(".changeset/") || file === "apps/website/src/content/docs/docs/reference/upgrading.md";

/** Lines of `entry.text` (1-based numbers) that `entry.added` holds. */
const addedOf = (entry) => {
  const lines = entry.text.split("\n");
  return [...entry.added].sort((a, b) => a - b).map((n) => ({ n, line: lines[n - 1] ?? "" }));
};

/** Reasons added lines name a decision, plan, requirement or phase id, or phase-relative wording. */
export const judgeIds = (entries) => {
  const bad = [];
  for (const entry of entries) {
    const history = entry.file.startsWith("spec/") ? entry.text.split("\n").findIndex((l) => /^#{1,6}\s.*Change History/i.test(l)) + 1 : 0;
    for (const { n, line: whole } of addedOf(entry)) {
      // A spec document keeps its history in the Document Control row too, one line spanning every older entry: only
      // the newest entry, the one before the first `<br>`, is new text, and it is history, so wording is exempt there.
      const row = entry.file.startsWith("spec/") && whole.startsWith("> | Change History |");
      const line = row ? whole.split("<br>")[0] : whole;
      for (const [re, what] of ID_TOKENS) if (re.test(line)) bad.push(`${entry.file}:${n} names ${what}: ${line.trim()}`);
      const inHistory = row || (history > 0 && n >= history);
      if (!PHRASE_EXEMPT(entry.file) && !inHistory && PHRASE.test(line)) bad.push(`${entry.file}:${n} has phase-relative wording: ${line.trim()}`);
    }
  }
  return bad;
};

const isSrc = (file) => /^packages\/(?:devtools|react)\/src\/.*\.(?:ts|tsx|mts)$/.test(file);
const isTest = (file) => /^packages\/[^/]+\/test\/.*\.(?:ts|tsx|mts)$/.test(file);
const SRC_ONLY = [
  [/\basync\b/, "async"],
  [/\bawait\b/, "await"],
  [/\bconsole\./, "console"],
  [/\bprocess\.env\b/, "process.env"],
  [/\bDate\.now\(/, "Date.now"],
  [/\bnew Date\(/, "new Date"],
  [/\bperformance\.now\(/, "performance.now"],
];
const EVERYWHERE = [
  [/\bEffect\.fnUntraced\b/, "Effect.fnUntraced"],
  [/\bswitch\s*\(/, "switch"],
  [/Record<\s*string\s*,\s*unknown\s*>/, "Record<string, unknown>"],
  [/(?:[:<|&,(]|\bas|\bextends|\bkeyof)\s*any(?![\w$])/, "any"],
  [/[\w)\]]!(?!=)/, "a non-null assertion"],
];

/** Line numbers an import statement or an `export {` / `export *` re-export covers in blanked text. */
const renameLines = (code) => {
  const covered = new Set();
  const re = /^[ \t]*(?:import\b|export\s+(?:type\s+)?[{*])[\s\S]*?(?:\bfrom\s*["'`]|;)/gm;
  for (const m of code.matchAll(re)) {
    const first = code.slice(0, m.index).split("\n").length;
    const span = m[0].split("\n").length;
    for (let k = 0; k < span; k++) covered.add(first + k);
  }
  return covered;
};

/** Reasons added source and test lines use a forbidden form. A file in `packages/*\/src` also gets the source-only ones. */
export const judgeForbidden = (entries) => {
  const bad = [];
  for (const entry of entries) {
    if (!isSrc(entry.file) && !isTest(entry.file)) continue;
    const raw = entry.text.split("\n");
    const code = blank(entry.text);
    const lines = code.split("\n");
    const covered = renameLines(code);
    const depth = [];
    const parens = [];
    let d = 0;
    let p = 0;
    for (const line of lines) {
      depth.push(d);
      parens.push(p);
      for (const c of line) {
        d += c === "{" ? 1 : c === "}" ? -1 : 0;
        p += c === "(" ? 1 : c === ")" ? -1 : 0;
      }
    }
    for (const n of [...entry.added].sort((a, b) => a - b)) {
      const line = lines[n - 1] ?? "";
      const note = (what) => bad.push(`${entry.file}:${n} uses ${what}: ${(raw[n - 1] ?? "").trim()}`);
      if (/Stryker disable/.test(raw[n - 1] ?? "")) note("Stryker disable");
      if (isSrc(entry.file)) {
        for (const [re, what] of SRC_ONLY) if (re.test(line) && !(what === "console" && entry.file.endsWith("/DeveloperSignals.ts"))) note(what);
        if (depth[n - 1] === 0 && /^\s*(?:export\s+)?(?:let|var)\s/.test(line)) note("a module-scope let or var");
        // A literal outside every function body is static: Stryker ignores it, and a new Ignored mutant fails the close.
        if (entry.file.startsWith("packages/devtools/src/") && depth[n - 1] === 0 && parens[n - 1] === 0 && /["'`]/.test(line) && !covered.has(n) && !line.includes("=>") && !/^\s*(?:export\s+)?(?:type|interface|declare)\b/.test(line)) note("a module-scope string literal");
      }
      for (const [re, what] of EVERYWHERE) if (re.test(line)) note(what);
      if (/\bas\s+(?!const\b)/.test(line) && !covered.has(n)) note("an as cast");
    }
  }
  return bad;
};

/** Reasons the budget-carrying files moved from the base. */
export const judgeGuards = (changed) => changed.map((p) => `${p} differs from phase_base: no budget moves`);

/** `code`'s text from the `{` of the body of `name`'s declaration to its closing `}`, as [start, end), or undefined. */
const bodyOf = (code, name) => {
  const decl = new RegExp(`(?:function\\s+${name}\\b|(?:const|let)\\s+${name}\\b)`).exec(code);
  if (decl === null) return undefined;
  const open = code.indexOf("(", decl.index);
  if (open < 0) return undefined;
  let depth = 0;
  let i = open;
  for (; i < code.length; i++) {
    depth += code[i] === "(" ? 1 : code[i] === ")" ? -1 : 0;
    if (depth === 0) break;
  }
  const start = code.indexOf("{", i);
  if (start < 0) return undefined;
  depth = 0;
  for (let j = start; j < code.length; j++) {
    depth += code[j] === "{" ? 1 : code[j] === "}" ? -1 : 0;
    if (depth === 0) return [start, j + 1];
  }
  return undefined;
};

const lineAt = (code, index) => code.slice(0, index).split("\n").length;
const STORE = "packages/devtools/src/model/ExternalStore.ts";
const DOCK = "packages/devtools/src/model/DockModel.ts";
const BARRELS = ["packages/devtools/src/index.ts", "packages/devtools/src/react/index.ts"];

/**
 * Reasons the collect-and-rethrow rule is not written once, in `callAll`. `files` are the model files and the two
 * barrels as `{ file, text }`; every test is on text with comments and strings blanked.
 */
export const judgeSingleSource = (files) => {
  const bad = [];
  const blanked = files.map(({ file, text }) => ({ file, code: blank(text) }));
  const store = blanked.find((f) => f.file === STORE);
  const body = store === undefined ? undefined : bodyOf(store.code, "callAll");
  if (body === undefined) bad.push("callAll is not declared in ExternalStore.ts");
  const inBody = (file, index) => file === STORE && body !== undefined && index >= body[0] && index < body[1];
  let loopsInside = 0;
  for (const { file, code } of blanked.filter((f) => !BARRELS.includes(f.file))) {
    for (const m of code.matchAll(/catch\s*\(\s*([\w$]+)\s*\)\s*\{[^{}]*\.push\(\s*\1\s*\)/g)) {
      if (inBody(file, m.index)) loopsInside++;
      else bad.push(`collect loop outside callAll: ${file}:${lineAt(code, m.index)}`);
    }
  }
  if (body !== undefined && loopsInside !== 1) bad.push(`callAll holds ${loopsInside} collect loops, not one`);
  const names = blanked.flatMap(({ file, code }) => [...code.matchAll(/\bthrowCollected\b/g)].map((m) => ({ file, index: m.index })));
  if (names.length !== 2 || names.some((n) => n.file !== STORE) || !names.some((n) => inBody(n.file, n.index))) bad.push("throwCollected is reached other than through callAll");
  if (store !== undefined && /\bexport\s+(?:function|const)\s+throwCollected\b|\bexport\s*\{[^}]*\bthrowCollected\b/.test(store.code)) bad.push("throwCollected is exported");
  let built = 0;
  for (const { file, code } of blanked.filter((f) => !BARRELS.includes(f.file))) {
    for (const m of code.matchAll(/\bnew\s+AggregateError\b/g)) {
      built++;
      if (file !== STORE) bad.push(`AggregateError is built outside ExternalStore.ts: ${file}:${lineAt(code, m.index)}`);
    }
  }
  if (built === 0) bad.push("AggregateError is built nowhere");
  for (const { file, code } of blanked.filter((f) => BARRELS.includes(f.file))) if (/\bcallAll\b/.test(code)) bad.push(`a barrel names callAll: ${file}`);
  const dock = blanked.find((f) => f.file === DOCK);
  if (dock !== undefined && /\btry\b/.test(dock.code)) bad.push("DockModel.ts holds a try");
  return bad;
};

/** Every file's added line numbers (new-file numbering) from `git diff -U0` text. */
export const parseDiff = (text) => {
  const files = new Map();
  let file;
  let line;
  for (const l of text.split("\n")) {
    if (l.startsWith("diff --git ")) {
      file = undefined;
      line = undefined;
    } else if (l.startsWith("+++ ")) {
      const p = l.slice(4);
      file = p === "/dev/null" ? undefined : p.replace(/^b\//, "");
      if (file !== undefined && !files.has(file)) files.set(file, new Set());
    } else {
      const h = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/.exec(l);
      if (h !== null) line = Number(h[1]);
      else if (file !== undefined && line !== undefined && l.startsWith("+")) {
        files.get(file).add(line);
        line++;
      }
    }
  }
  return files;
};

const OUTSIDE = [":!.planning", ":!.agents", ":!.codex"];
/** Entries for every added line of the tree against the base: tracked changes and whole untracked files. */
const treeEntries = (base) => {
  const entries = [];
  for (const [file, added] of parseDiff(git("diff", "-U0", base, "--", ".", ...OUTSIDE))) {
    if (existsSync(file)) entries.push({ file, text: readFileSync(file, "utf8"), added });
  }
  const untracked = git("ls-files", "--others", "--exclude-standard", "--", ".", ...OUTSIDE).split("\n").filter((p) => p !== "");
  for (const file of untracked) {
    const text = readFileSync(file, "utf8");
    entries.push({ file, text, added: new Set(text.split("\n").map((_, i) => i + 1)) });
  }
  return entries;
};

const commitsSince = (base) =>
  git("log", "--reverse", "--format=%x1e%H%x1f%s%x1f%B", `${base}..HEAD`)
    .split("\x1e")
    .filter((r) => r.trim() !== "")
    .map((r) => {
      const [sha, subject, message] = r.split("\x1f");
      const paths = git("show", "--name-only", "--format=", sha).split("\n").filter((p) => p !== "");
      return { sha, subject, message, paths };
    });

const done = (bad, ok) => {
  if (bad.length > 0) fail(bad);
  console.log(ok);
};

const MODES = {
  base: () => console.log(readBase()),
  commit: (args) => {
    const first = args[0] === "--first";
    const [subject, ...paths] = first ? args.slice(1) : args;
    if (subject === undefined || paths.length === 0) return fail(["usage: commit [--first] <subject> <path>..."]);
    return done(judgeCommit(commitsSince(readBase()), subject, paths, first), `commit: ${subject}`);
  },
  unchanged: (args) => {
    if (args.length === 0) return fail(["usage: unchanged <path>..."]);
    const changed = git("diff", "--name-only", readBase(), "--", ...args).split("\n").filter((p) => p !== "");
    const untracked = git("ls-files", "--others", "--exclude-standard", "--", ...args).split("\n").filter((p) => p !== "");
    return done(judgeUnchanged({ changed, untracked }), `unchanged: ${args.join(" ")}`);
  },
  "seen-failing": (args) => {
    const [file, ...titles] = args;
    if (file === undefined) return fail(["usage: seen-failing <test-file> [<title>...]"]);
    const evidence = existsSync(EVIDENCE) ? readFileSync(EVIDENCE, "utf8") : "";
    return done(judgeSeenFailing(readFileSync(file, "utf8"), evidence, titles), `seen-failing: ${file}`);
  },
  "scan-ids": () => done(judgeIds(treeEntries(readBase())), "scan-ids: no id or phase wording in added lines"),
  "scan-forbidden": () => {
    const base = readBase();
    const guards = git("diff", "--name-only", base, "--", ...GUARDED).split("\n").filter((p) => p !== "");
    return done([...judgeGuards(guards), ...judgeForbidden(treeEntries(base))], "scan-forbidden: no forbidden form in added lines");
  },
  trailers: () => {
    const plan = commitsSince(readBase()).filter((c) => PLAN_SUBJECT.test(c.subject));
    const bad = plan.flatMap((c) => judgeTrailer(c.message).map((r) => `${c.sha.slice(0, 8)} ${c.subject}: ${r}`));
    if (plan.length === 0) bad.push("no plan commit since phase_base");
    return done(bad, `trailers: ${plan.length} plan commits, each with one Claude trailer`);
  },
  "single-source": () => {
    const modelFiles = git("ls-files", "--cached", "--others", "--exclude-standard", "--", "packages/devtools/src/model").split("\n").filter((p) => p.endsWith(".ts"));
    const files = [...modelFiles, ...BARRELS].filter((file) => existsSync(file)).map((file) => ({ file, text: readFileSync(file, "utf8") }));
    return done(judgeSingleSource(files), "single-source: one collect loop, in callAll");
  },
  "--self-test": () => selfTest(),
};

const selfTest = () => {
  let passed = 0;
  const eq = (name, got, want) => {
    if (JSON.stringify(got) !== JSON.stringify(want)) fail([`self-test FAILED: ${name}: got ${JSON.stringify(got)}, wanted ${JSON.stringify(want)}`]);
    passed++;
  };
  const trailer = "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>";
  eq("one Claude trailer passes", judgeTrailer(`subject\n\n${trailer}\n`).length, 0);
  eq("two trailers fail", judgeTrailer(`s\n\n${trailer}\n${trailer}\n`).length, 1);
  eq("no trailer fails", judgeTrailer("s\n").length, 1);
  eq("a foreign trailer fails", judgeTrailer("s\n\nCo-Authored-By: Someone <a@b.c>\n").length, 1);
  eq("a Claude trailer with another address fails", judgeTrailer("s\n\nCo-Authored-By: Claude X <a@b.c>\n").length, 1);

  const c = (subject, paths, message = `${subject}\n\n${trailer}`) => ({ sha: subject, subject, paths, message });
  const log = [c("one", ["b", "a"]), c("two", ["z"])];
  eq("a commit with its subject and paths in another order passes", judgeCommit(log, "one", ["a", "b"], true), []);
  eq("a wrong subject fails", judgeCommit(log, "other", ["a"], false).length, 1);
  eq("an extra path fails", judgeCommit(log, "one", ["a"], false).length, 1);
  eq("a missing path fails", judgeCommit(log, "one", ["a", "b", "c"], false).length, 1);
  eq("--first on the second commit fails", judgeCommit(log, "two", ["z"], true).length, 1);
  eq("the second commit passes without --first", judgeCommit(log, "two", ["z"], false), []);
  eq("a duplicate subject fails", judgeCommit([c("one", ["a"]), c("one", ["a"])], "one", ["a"], false).length, 1);
  eq("a commit without the trailer fails", judgeCommit([c("one", ["a"], "one")], "one", ["a"], false).length, 1);

  eq("an unchanged tree passes", judgeUnchanged({ changed: [], untracked: [] }), []);
  eq("a changed path fails", judgeUnchanged({ changed: ["p"], untracked: [] }).length, 1);
  eq("an untracked path fails", judgeUnchanged({ changed: [], untracked: ["q"] }).length, 1);

  const suite = `import { it } from "@effect/vitest";
it("plain", () => {});
it.effect(
  "on the next line",
  () => x,
);
it.live('single', () => {});
test(\`tpl\`, () => {});
pattern.test("not a title");
describe("not a title either", () => {});
it.scoped("scoped", () => {});
it("has \\"quotes\\"", () => {});`;
  eq("the titles of a file", titlesOf(suite), ["plain", "on the next line", "single", "tpl", "scoped", 'has "quotes"']);
  eq("a file with no title has none", titlesOf("const a = 1;"), []);
  const evidence = "- failed: plain\n- failed (reason): on the next line\n- red on the base: single\n- failed:not this\n";
  eq("evidence in each form names its title", judgeSeenFailing(suite, evidence, ["plain", "on the next line", "single"]), []);
  eq("a title with no line fails", judgeSeenFailing(suite, evidence, ["tpl"]).length, 1);
  eq("with no title asked, every title is asked", judgeSeenFailing(suite, evidence, []).length, 3);
  eq("a file with no title fails", judgeSeenFailing("x", evidence, []).length, 1);
  eq("a title compared exactly fails on a prefix", judgeSeenFailing('it("pla", () => {});', evidence, []).length, 1);

  const idEntry = (file, line, text = line) => ({ file, text, added: new Set([1]) });
  for (const line of ["// D-49 says", "see 81-05", "COLL-02 holds", "WX-05", "QD-81 closes", "Phase 81 added", "phase 81", "ADR-QD-NEXT", "x BEH-QD-NEXT y"]) {
    eq(`${line} is flagged`, judgeIds([idEntry("packages/devtools/src/a.ts", line)]).length, 1);
  }
  for (const line of ["ADR-QD-194", "INV-QD-407", "BEH-QD-741", "D-49-a", "CCR-QD-473", "ARCH-128", "ADR-QD-81", "a 1281-05x", "x181-05"]) {
    eq(`${line} is not flagged`, judgeIds([idEntry("packages/devtools/src/a.ts", line)]), []);
  }
  for (const line of ["this phase", "Until Now", "any more", "no longer", "from now on"]) {
    eq(`${line} is flagged in source`, judgeIds([idEntry("packages/devtools/src/a.ts", line)]).length, 1);
  }
  eq("a changeset may say no longer", judgeIds([idEntry(".changeset/a.md", "no longer")]), []);
  eq("the upgrade guide may say no longer", judgeIds([idEntry("apps/website/src/content/docs/docs/reference/upgrading.md", "no longer")]), []);
  eq("a changeset is still scanned for ids", judgeIds([idEntry(".changeset/a.md", "COLL-01")]).length, 1);
  const spec = "# Title\nno longer here\n## Change History\n| 1 | no longer a row |\n";
  eq("a phrase before the change history is flagged", judgeIds([{ file: "spec/a.md", text: spec, added: new Set([2]) }]).length, 1);
  eq("a phrase in the change history is exempt", judgeIds([{ file: "spec/a.md", text: spec, added: new Set([4]) }]), []);
  const header = "> | Change History | 1.1 (2026-11-24): a row\n> | Status | no longer here\n";
  eq("a phrase in the Document Control history row is exempt", judgeIds([{ file: "spec/a.md", text: header.replace("a row", "no longer a row"), added: new Set([1]) }]), []);
  eq("a phrase in another Document Control row is flagged", judgeIds([{ file: "spec/a.md", text: header, added: new Set([2]) }]).length, 1);
  eq("an older entry of the Document Control history row is not new text", judgeIds([{ file: "spec/a.md", text: "> | Change History | 1.2 (2026-11-24): a row<br>1.1 (2026-11-10): D-01 approved, no longer<br>1.0 (2026-11-09): Initial\n", added: new Set([1]) }]), []);
  eq("an id in the Document Control history row is still flagged", judgeIds([{ file: "spec/a.md", text: "> | Change History | 1.1 (2026-11-24): COLL-01\n", added: new Set([1]) }]).length, 1);

  const src = "packages/react/src/A.ts";
  const test = "packages/devtools/test/model/A.test.ts";
  const one = (file, text) => judgeForbidden([{ file, text, added: new Set(text.split("\n").map((_, i) => i + 1)) }]);
  for (const [what, text] of [
    ["a module-scope let", "let a = 1;"],
    ["an exported var", "export var a = 1;"],
    ["async", "const f = async () => 1;"],
    ["await", "const g = () => { await x; };"],
    ["console", "console.log(1);"],
    ["process.env", "const e = process.env.A;"],
    ["Date.now", "const t = Date.now();"],
    ["new Date", "const t = new Date(0);"],
    ["performance.now", "const t = performance.now();"],
    ["Effect.fnUntraced", "const f = Effect.fnUntraced(function* () {});"],
    ["switch", "switch (x) { }"],
    ["Record<string, unknown>", "type A = Record<string, unknown>;"],
    ["Stryker disable", "// Stryker disable next-line all"],
    ["any as a type", "const a: any = 1;"],
    ["any in generics", "type A = Array<any>;"],
    ["a non-null assertion", "const a = b!.c;"],
    ["an as cast", "const planted = value as Planted;"],
    ["a double as cast", "const planted = value as unknown as Planted;"],
  ]) {
    eq(`${what} is flagged in source`, one(src, text).length >= 1, true);
  }
  eq("an as cast is flagged in a test", one(test, "const planted = value as Planted;").length, 1);
  eq("async is allowed in a test", one(test, "const f = async () => 1;"), []);
  eq("console is allowed in a test", one(test, "console.log(1);"), []);
  eq("a module-scope let is allowed in a test", one(test, "let a = 1;"), []);
  eq("switch is flagged in a test", one(test, "switch (x) { }").length, 1);
  eq("a file outside source and test is not scanned", one("scripts/a.mjs", "let a = 1; switch (x) {}"), []);
  for (const [what, text] of [
    ["an as inside a comment", "// cast it as Planted\nconst a = 1;"],
    ["an as inside a block comment", "/* value as X\n let a */\nconst a = 1;"],
    ["an as inside a string", 'const a = "value as Planted";'],
    ["as const", "const a = [1] as const;"],
    ["an import namespace", 'import * as Effect from "effect/Effect";'],
    ["an import rename", 'import { a as b } from "./x.ts";'],
    ["a multi-line import rename", 'import {\n  a as b,\n  c,\n} from "./x.ts";'],
    ["an export rename", 'export { a as b } from "./x.ts";'],
    ["an export namespace", 'export * as ns from "./x.ts";'],
    ["!==", "const a = b !== c;"],
    ["!= and a negation", "const a = !b && c != d;"],
    ["an indented let", "const f = () => {\n  let a = 1;\n  return a;\n};"],
    ["a let inside a template expression body", "const s = `${(() => { let a = 1; return a; })()}`;"],
    ["a blanked template", "const s = `value as Planted ${1}`;"],
    ["a word holding any", "const company = 1;\nconst many = 2;"],
    ["a property any call", "const a = Effect.any(x);"],
  ]) {
    eq(`${what} is not flagged`, one(src, text), []);
  }
  eq("an as inside a template expression is flagged", one(src, "const s = `${value as Planted}`;").length, 1);
  eq("console is allowed in the one exempt file", judgeForbidden([{ file: "packages/react/src/DeveloperSignals.ts", text: "console.warn(1);", added: new Set([1]) }]), []);
  eq("only added lines are judged", judgeForbidden([{ file: src, text: "let a = 1;\nconst b = 1;", added: new Set([2]) }]), []);
  eq("a moved guard file fails", judgeGuards(["AGENTS.md"]).length, 1);
  eq("no moved guard file passes", judgeGuards([]), []);

  const planted = "a /* x */ 'b' `c ${ d as E } f` // g\nh";
  const blanked = blank(planted);
  eq("blank keeps code and length", [blanked.length === planted.length, blanked.includes("d as E"), blanked.includes("c "), blanked.includes("g")], [true, true, false, false]);


  const lit = (file, text) => judgeForbidden([{ file, text, added: new Set(text.split("\n").map((_, i) => i + 1)) }]);
  const devSrc = "packages/devtools/src/model/A.ts";
  eq("a module-scope string literal is flagged in devtools source", lit(devSrc, 'const NAME = "x";').length, 1);
  eq("a literal in a function body is not flagged", lit(devSrc, 'const f = () => {\n  return "x";\n};'), []);
  eq("a literal in an arrow expression body is not flagged", lit(devSrc, 'const f = () => "x";'), []);
  eq("a literal in a call at module scope is flagged", lit(devSrc, 'const f = make("x");').length, 1);
  eq("a literal in a type declaration is not flagged", lit(devSrc, 'export type Tag = "a" | "b";'), []);
  eq("an import path is not flagged", lit(devSrc, 'import { a } from "./a.ts";'), []);
  eq("a module-scope literal is not flagged outside devtools source", lit("packages/react/src/a.ts", 'const NAME = "x";'), []);
  eq("a module-scope literal is not flagged in a test", lit("packages/devtools/test/model/A.test.ts", 'const NAME = "x";'), []);
  eq("a literal inside a comment at module scope is not flagged", lit(devSrc, '// "x"\nconst a = 1;'), []);

  const STORE_OK = [
    "function throwCollected(thrown: ReadonlyArray<unknown>, message: string): void {",
    "  if (thrown.length === 1) throw thrown[0];",
    "  throw new AggregateError(thrown, message);",
    "}",
    "export function callAll(calls: Iterable<() => void>, message: string): void {",
    "  const thrown: Array<unknown> = [];",
    "  for (const call of calls) {",
    "    try { call(); } catch (error) { thrown.push(error); }",
    "  }",
    "  throwCollected(thrown, message);",
    "}",
    "",
  ].join("\n");
  const tree = (extra = {}) => [
    { file: "packages/devtools/src/model/ExternalStore.ts", text: STORE_OK },
    { file: "packages/devtools/src/model/DockModel.ts", text: "// try { } catch (e) { thrown.push(e) } throwCollected\nconst note = 'try catch (e) { x.push(e) } new AggregateError';\nexport const a = 1;\n" },
    { file: "packages/devtools/src/model/GatesFeed.ts", text: "try { x(); } catch (thrown) { failure = stated(thrown); }\n" },
    { file: "packages/devtools/src/index.ts", text: 'export { a } from "./model/DockModel.ts";\n' },
    { file: "packages/devtools/src/react/index.ts", text: "export {};\n" },
  ].map((f) => (extra[f.file] === undefined ? f : { ...f, text: extra[f.file] }));
  const reasons = (extra) => judgeSingleSource(tree(extra));
  eq("a tree with one collect loop in callAll passes", reasons({}), []);
  eq("a tree without callAll fails", reasons({ "packages/devtools/src/model/ExternalStore.ts": STORE_OK.replaceAll("callAll", "other") }).some((r) => r === "callAll is not declared in ExternalStore.ts"), true);
  eq("a second collect loop outside callAll fails", reasons({ "packages/devtools/src/model/GatesFeed.ts": "try { x(); } catch (e) { thrown.push(e); }\n" }), ["collect loop outside callAll: packages/devtools/src/model/GatesFeed.ts:1"]);
  eq("a collect loop in ExternalStore outside callAll fails", reasons({ "packages/devtools/src/model/ExternalStore.ts": `${STORE_OK}const notify = () => { try { x(); } catch (e) { thrown.push(e); } };\n` }).length, 1);
  eq("throwCollected exported fails", reasons({ "packages/devtools/src/model/ExternalStore.ts": STORE_OK.replace("function throwCollected", "export function throwCollected") }), ["throwCollected is exported"]);
  eq("a second call of throwCollected fails", reasons({ "packages/devtools/src/model/ExternalStore.ts": `${STORE_OK}const again = () => throwCollected([], "m");\n` }), ["throwCollected is reached other than through callAll"]);
  eq("a throwCollected call in another file fails", reasons({ "packages/devtools/src/model/GatesFeed.ts": "throwCollected([], 'm');\n" }), ["throwCollected is reached other than through callAll"]);
  eq("a second AggregateError fails", reasons({ "packages/devtools/src/model/GatesFeed.ts": "throw new AggregateError([], 'm');\n" }), ["AggregateError is built outside ExternalStore.ts: packages/devtools/src/model/GatesFeed.ts:1"]);
  eq("a barrel naming callAll fails", reasons({ "packages/devtools/src/index.ts": 'export { callAll } from "./model/ExternalStore.ts";\n' }), ["a barrel names callAll: packages/devtools/src/index.ts"]);
  eq("a try in the dock model fails", reasons({ "packages/devtools/src/model/DockModel.ts": "try { a(); } finally { b(); }\n" }), ["DockModel.ts holds a try"]);
  eq("a callAll holding no collect loop fails", reasons({ "packages/devtools/src/model/ExternalStore.ts": STORE_OK.replace("catch (error) { thrown.push(error); }", "catch (error) { throw error; }") }).length, 1);

  const sha = "0123456789abcdef0123456789abcdef01234567";
  eq("the scratch record wins", phaseBaseOf(`${sha}\n`, "phase_base: ffffffffffffffffffffffffffffffffffffffff"), sha);
  eq("the summary line is the fallback", phaseBaseOf(undefined, `x\nphase_base: ${sha}\n`), sha);
  eq("neither record gives none", phaseBaseOf("nope", "x"), undefined);

  const diff = "diff --git a/x.ts b/x.ts\n--- a/x.ts\n+++ b/x.ts\n@@ -3,1 +3,2 @@\n-old\n+new\n+newer\n@@ -9,0 +11 @@\n+late\ndiff --git a/gone.ts b/gone.ts\n--- a/gone.ts\n+++ /dev/null\n@@ -1 +0,0 @@\n-x\n";
  const parsed = parseDiff(diff);
  eq("a diff's added lines are numbered in the new file", [[...parsed.get("x.ts")], parsed.has("gone.ts")], [[3, 4, 11], false]);

  console.log(`self-test: ${passed} passed`);
};

const [mode, ...args] = process.argv.slice(2);
if (mode === undefined || !Object.hasOwn(MODES, mode)) fail([`usage: node 81-check.mjs ${Object.keys(MODES).join("|")}`]);
else MODES[mode](args);
