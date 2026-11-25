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
//   no-store                                 the diagnostics reading is held in the feed's one snapshot, in no store
//   single-fold                              the per-field keep-if-equal is written once, in foldReading
//   stale-path                               no live mention of the three paths the diagnostics module's rename left
//   registers                                the type-test budget key, the AGENTS.md row and the traceability rows agree
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
const EVIDENCE = `${D}83-RED-EVIDENCE.md`;
const SUMMARY = `${D}83-01-SUMMARY.md`;
const TRAILER = /^Co-Authored-By: Claude [^<>]+ <noreply@anthropic[.]com>$/;
const PLAN_SUBJECT = /^[a-z]+[(]83-[0-9]{2}[)]!?: /;
const GUARDED = ["AGENTS.md", "scripts/check-house-style.mjs", ".oxlintrc.json"];

const fail = (lines) => {
  console.error(lines.join("\n"));
  process.exit(1);
};
const git = (...args) => execFileSync("git", args, { encoding: "utf8", maxBuffer: 1 << 28 });
const sorted = (xs) => [...xs].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
const scratch = () => join(realpathSync(process.env.TMPDIR || "/tmp"), "qd83");

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
  [/(?<![\w.-])83-\d{2}(?!\d)/, "a plan id"],
  [/\bDIAG-0\d\b/, "a requirement id"],
  [/\bWX-0\d\b/, "a requirement id"],
  [/(?<!(?:ADR|CCR|BEH|INV|ARCH)-)\bQD-83\b/, "a phase id"],
  [/\b[Pp]hase 83\b/, "a phase number"],
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

const TYPE_TEST_NEW = "packages/devtools/test/model/Diagnostics.tst.ts";
const TYPE_TEST_BASE = "packages/devtools/test/model/DiagnosticsStore.tst.ts";
/**
 * Reasons the budget-carrying files moved from the base. `guards` are `{ file, base, current }` texts: `.oxlintrc.json`
 * must equal its base, and `AGENTS.md` and `scripts/check-house-style.mjs` may differ only by the type-test path, so each
 * must equal its base text once the new path is replaced by the old one.
 */
export const judgeGuards = (guards) =>
  guards
    .filter(({ file, base, current }) => (file === ".oxlintrc.json" ? current : current.replaceAll(TYPE_TEST_NEW, TYPE_TEST_BASE)) !== base)
    .map(({ file }) => `${file} differs from phase_base beyond the type-test path: no budget moves`);

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
const MODEL_DIR = "packages/devtools/src/model/";
const FEED = `${MODEL_DIR}DiagnosticsFeed.ts`;
const MODULE_NEW = `${MODEL_DIR}Diagnostics.ts`;
const MODULE_OLD = `${MODEL_DIR}DiagnosticsStore.ts`;
const BARRELS = ["packages/devtools/src/index.ts", "packages/devtools/src/react/index.ts"];
const OLD_PATHS = [MODULE_OLD, "packages/devtools/test/model/DiagnosticsStore.test.ts", "packages/devtools/test/model/DiagnosticsStore.tst.ts"];

/** The diagnostics module among `files`: `Diagnostics.ts`, else `DiagnosticsStore.ts`, as `{ file, code }` with text blanked. */
const moduleOf = (blanked) => blanked.find((f) => f.file === MODULE_NEW) ?? blanked.find((f) => f.file === MODULE_OLD);
/** `code`'s text from a `name` declaration to the end of its statement, as [start, end): a function ends at its closing `}`, a const at its `;`. */
const spanOf = (code, name) => {
  const decl = new RegExp(`(?:(function)\\s+${name}\\b|(?:const|let)\\s+${name}\\b)`).exec(code);
  if (decl === null) return undefined;
  let depth = 0;
  for (let i = decl.index; i < code.length; i++) {
    const c = code[i];
    if (c === "(" || c === "[" || c === "{") depth++;
    else if (c === ")" || c === "]" || c === "}") {
      depth--;
      if (depth === 0 && c === "}" && decl[1] === "function") return [decl.index, i + 1];
    } else if (c === ";" && depth === 0) return [decl.index, i + 1];
  }
  return undefined;
};
const MAKE_STORE = /\bmakeExternalStore\s*[(<]/;

/**
 * Reasons the diagnostics reading is not held in the feed's one snapshot. `files` are every `packages/devtools/src` file as
 * `{ file, text }`: no file names a diagnostics store, the feed builds one external store and has no `marking` wrapper,
 * its `off` is exactly three statements, and the diagnostics module builds no store.
 */
export const judgeNoStore = (files) => {
  const bad = [];
  for (const { file, text } of files) {
    text.split("\n").forEach((line, i) => {
      if (/DiagnosticsStore/.test(line)) bad.push(`DiagnosticsStore named in ${file}:${i + 1}`);
    });
  }
  const blanked = files.map(({ file, text }) => ({ file, code: blank(text) }));
  const feed = blanked.find((f) => f.file === FEED);
  if (feed === undefined) bad.push("DiagnosticsFeed.ts is not found");
  else {
    const calls = [...feed.code.matchAll(new RegExp(MAKE_STORE, "g"))].length;
    if (calls !== 1) bad.push(`DiagnosticsFeed.ts holds ${calls} makeExternalStore calls, not one`);
    if (/\bmarking\b/.test(feed.code)) bad.push("DiagnosticsFeed.ts holds marking");
    const body = bodyOf(feed.code, "off");
    const statements = body === undefined ? [] : feed.code.slice(body[0] + 1, body[1] - 1).split(";").map((x) => x.replace(/\s+/g, " ").trim()).filter((x) => x !== "");
    if (statements.join(" | ") !== "runs.stop() | sampled = false | view.set(diagnosticsOff)") bad.push("off() is not exactly runs.stop(), sampled = false and view.set(diagnosticsOff)");
  }
  const mod = moduleOf(blanked);
  if (mod !== undefined && MAKE_STORE.test(mod.code)) bad.push("the diagnostics module builds a store");
  return bad;
};

const READING_FIELD = /\.(?:wiring|activity|hydration|portCalls)\b\s*[!=]==|[!=]==\s*[\w$.]*\.(?:wiring|activity|hydration|portCalls)\b/;
/**
 * Reasons the per-field keep-if-equal is not written once, in `foldReading`. `files` are the diagnostics module, the feed
 * and the two barrels as `{ file, text }`; every test is on text with comments and strings blanked.
 */
export const judgeSingleFold = (files) => {
  const bad = [];
  const blanked = files.map(({ file, text }) => ({ file, code: blank(text) }));
  const mod = moduleOf(blanked);
  const logic = blanked.filter((f) => !BARRELS.includes(f.file));
  const fold = mod === undefined ? undefined : bodyOf(mod.code, "foldReading");
  if (mod === undefined || !/\bexport\s+function\s+foldReading\s*[(<]/.test(mod.code) || fold === undefined) bad.push("foldReading is not declared as an exported function");
  const keep = mod === undefined ? undefined : spanOf(mod.code, "keep");
  if (mod !== undefined && /\bexport\s+(?:function|const)\s+keep\b|\bexport\s*\{[^}]*\bkeep\b/.test(mod.code)) bad.push("keep is exported");
  for (const { file, code } of logic) {
    for (const m of code.matchAll(/(?<!function\s)\bkeep\s*(?:<[^>()]*>\s*)?\(/g)) {
      const inside = file === mod?.file && fold !== undefined && m.index >= fold[0] && m.index < fold[1];
      if (!inside) bad.push(`keep is called outside foldReading: ${file}:${lineAt(code, m.index)}`);
    }
    for (const m of code.matchAll(/\bEqual\.equals\b/g)) {
      const inside = file === mod?.file && keep !== undefined && m.index >= keep[0] && m.index < keep[1];
      if (!inside) bad.push(`Equal.equals appears outside keep: ${file}:${lineAt(code, m.index)}`);
    }
    code.split("\n").forEach((line, i) => {
      if (READING_FIELD.test(line)) bad.push(`a reading field is compared with ===: ${file}:${i + 1}`);
    });
  }
  if (mod !== undefined && fold !== undefined && !/\bsameFields\b/.test(mod.code.slice(fold[0], fold[1]))) bad.push("foldReading does not decide identity with sameFields");
  for (const { file, code } of blanked.filter((f) => BARRELS.includes(f.file))) if (/\b(?:foldReading|keep)\b/.test(code)) bad.push(`a barrel names foldReading or keep: ${file}`);
  return bad;
};

const GREP_LINE = /^([^:]+):(\d+):(.*)$/;
const OLD_PATH_TEXT = /DiagnosticsStore[.](?:test[.]|tst[.])?ts/;
const OLD_BRACE_LIST = /[{,]DiagnosticsStore[,}]/;
/**
 * Reasons an old path of the renamed diagnostics module is still live. `exists` and `tracked` name each old path the tree
 * or the index still holds; `grep` is `git grep -n DiagnosticsStore` output outside `.planning`, `.agents`, `.codex`,
 * `spec/decisions` and the changelogs. A line of `spec/README.md` that starts `| CCR-QD-` and any line that starts `>`
 * (blockquotes, change-history cells included) is history and exempt.
 */
export const judgeStalePath = ({ exists, tracked, grep }) => {
  const bad = [...exists.map((p) => `${p} exists`), ...tracked.filter((p) => !exists.includes(p)).map((p) => `${p} is tracked`)];
  for (const raw of grep.split("\n")) {
    const m = GREP_LINE.exec(raw);
    if (m === null) continue;
    const [, file, line, text] = m;
    if (text.trimStart().startsWith(">") || (file === "spec/README.md" && text.startsWith("| CCR-QD-"))) continue;
    if (OLD_PATH_TEXT.test(text) || (OLD_BRACE_LIST.test(text) && text.includes("}.ts"))) bad.push(`${file}:${line} names an old path`);
  }
  return bad;
};

const BUDGET_KEY = /^\s*"(packages\/devtools\/test\/model\/Diagnostics[A-Za-z]*[.]tst[.]ts)":\s*\{\s*callable:\s*(\d+),\s*constructable:\s*(\d+)\s*\}/gm;
const AGENTS_ROW = /^\| `(packages\/devtools\/test\/model\/Diagnostics[A-Za-z]*[.]tst[.]ts)` \| (\d+) \| (\d+) \|/gm;
const TRACE_ROW = /^\| `(packages\/devtools\/test\/model\/Diagnostics[A-Za-z]*[.](?:test|tst)[.]ts)` \|/gm;
/**
 * Reasons the type-test budget key, the AGENTS.md row and the traceability rows of the diagnostics module disagree.
 * `texts` holds `{ budget, agents, trace }`, the three files' text; `exists(path)` reads the tree. An absent register is
 * a reason, never a pass.
 */
export const judgeRegisters = ({ budget, agents, trace }, exists) => {
  const bad = [];
  const keys = [...budget.matchAll(BUDGET_KEY)].map((m) => ({ path: m[1], callable: m[2], constructable: m[3] }));
  const rows = [...agents.matchAll(AGENTS_ROW)].map((m) => ({ path: m[1], callable: m[2], constructable: m[3] }));
  const traced = [...trace.matchAll(TRACE_ROW)].map((m) => m[1]);
  const values = traced.filter((p) => p.endsWith(".test.ts") && !p.includes("/DiagnosticsFeed."));
  if (keys.length !== 1) bad.push(`the budget holds ${keys.length} Diagnostics type-test keys, not one: ${keys.map((k) => k.path).join(", ")}`);
  if (rows.length !== 1) bad.push(`AGENTS.md holds ${rows.length} Diagnostics type-test rows, not one: ${rows.map((r) => r.path).join(", ")}`);
  if (keys.length !== 1 || rows.length !== 1) return bad;
  const [key] = keys;
  const [row] = rows;
  if (key.path !== row.path) bad.push(`the budget names ${key.path} but AGENTS.md names ${row.path}`);
  if (!exists(key.path)) bad.push(`${key.path}, named by the budget, does not exist`);
  if (key.callable !== "3" || key.constructable !== "0") bad.push(`the budget counts ${key.callable} callable and ${key.constructable} constructable for ${key.path}, not 3 and 0`);
  if (row.callable !== key.callable || row.constructable !== key.constructable) bad.push(`AGENTS.md counts ${row.callable} | ${row.constructable} for ${row.path}, the budget ${key.callable} | ${key.constructable}`);
  if (!traced.includes(key.path)) bad.push(`spec/traceability.md has no row for ${key.path}, named by the budget`);
  if (values.length !== 1) bad.push(`spec/traceability.md holds ${values.length} Diagnostics value-test rows, not one: ${values.join(", ")}`);
  else {
    if (!exists(values[0])) bad.push(`${values[0]}, named by spec/traceability.md, does not exist`);
    if (values[0] !== key.path.replace(".tst.ts", ".test.ts")) bad.push(`spec/traceability.md names ${values[0]} but the budget names ${key.path}`);
  }
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
      const paths = git("show", "--name-only", "--no-renames", "--format=", sha).split("\n").filter((p) => p !== "");
      return { sha, subject, message, paths };
    });

/** Every tracked or untracked file under `dir` whose path matches `pattern` and that is still on disk. */
const trackedFiles = (dir, pattern) =>
  git("ls-files", "--cached", "--others", "--exclude-standard", "--", dir)
    .split("\n")
    .filter((p) => pattern.test(p) && existsSync(p));
const textOf = (file) => ({ file, text: readFileSync(file, "utf8") });

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
    const guards = GUARDED.map((file) => ({ file, base: git("show", `${base}:${file}`), current: readFileSync(file, "utf8") }));
    return done([...judgeGuards(guards), ...judgeForbidden(treeEntries(base))], "scan-forbidden: no forbidden form in added lines");
  },
  trailers: () => {
    const plan = commitsSince(readBase()).filter((c) => PLAN_SUBJECT.test(c.subject));
    const bad = plan.flatMap((c) => judgeTrailer(c.message).map((r) => `${c.sha.slice(0, 8)} ${c.subject}: ${r}`));
    if (plan.length === 0) bad.push("no plan commit since phase_base");
    return done(bad, `trailers: ${plan.length} plan commits, each with one Claude trailer`);
  },
  "no-store": () => done(judgeNoStore(trackedFiles("packages/devtools/src", /[.]tsx?$/).map(textOf)), "no-store: the reading is held in the feed's one snapshot"),
  "single-fold": () => {
    const files = [...trackedFiles(MODEL_DIR, /[/]Diagnostics(?:Store|Feed)?[.]ts$/), ...BARRELS.filter((file) => existsSync(file))].map(textOf);
    return done(judgeSingleFold(files), "single-fold: one per-field keep-if-equal, in foldReading");
  },
  "stale-path": () => {
    const grepped = (() => {
      try {
        return git("grep", "-n", "-E", "DiagnosticsStore", "--", ".", ":!.planning", ":!.agents", ":!.codex", ":!spec/decisions", ":!packages/*/CHANGELOG.md");
      } catch (error) {
        if (error.status === 1) return "";
        throw error;
      }
    })();
    const held = OLD_PATHS.filter((p) => git("ls-files", "--", p).trim() !== "");
    return done(judgeStalePath({ exists: OLD_PATHS.filter((p) => existsSync(p)), tracked: held, grep: grepped }), "stale-path: no live mention of the three old paths");
  },
  registers: () => {
    const texts = { budget: readFileSync("scripts/check-house-style.mjs", "utf8"), agents: readFileSync("AGENTS.md", "utf8"), trace: readFileSync("spec/traceability.md", "utf8") };
    const bad = judgeRegisters(texts, (path) => existsSync(path));
    return done(bad, `registers: ${[...texts.budget.matchAll(BUDGET_KEY)][0]?.[1]} named alike by the budget, AGENTS.md and traceability`);
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
  for (const line of ["// D-49 says", "see 83-05", "DIAG-02 holds", "WX-05", "QD-83 closes", "Phase 83 added", "phase 83", "ADR-QD-NEXT", "x BEH-QD-NEXT y"]) {
    eq(`${line} is flagged`, judgeIds([idEntry("packages/devtools/src/a.ts", line)]).length, 1);
  }
  for (const line of ["ADR-QD-194", "INV-QD-407", "BEH-QD-741", "D-49-a", "CCR-QD-473", "ARCH-128", "ADR-QD-83", "a 1283-05x", "x183-05"]) {
    eq(`${line} is not flagged`, judgeIds([idEntry("packages/devtools/src/a.ts", line)]), []);
  }
  for (const line of ["this phase", "Until Now", "any more", "no longer", "from now on"]) {
    eq(`${line} is flagged in source`, judgeIds([idEntry("packages/devtools/src/a.ts", line)]).length, 1);
  }
  eq("a changeset may say no longer", judgeIds([idEntry(".changeset/a.md", "no longer")]), []);
  eq("the upgrade guide may say no longer", judgeIds([idEntry("apps/website/src/content/docs/docs/reference/upgrading.md", "no longer")]), []);
  eq("a changeset is still scanned for ids", judgeIds([idEntry(".changeset/a.md", "DIAG-01")]).length, 1);
  const spec = "# Title\nno longer here\n## Change History\n| 1 | no longer a row |\n";
  eq("a phrase before the change history is flagged", judgeIds([{ file: "spec/a.md", text: spec, added: new Set([2]) }]).length, 1);
  eq("a phrase in the change history is exempt", judgeIds([{ file: "spec/a.md", text: spec, added: new Set([4]) }]), []);
  const header = "> | Change History | 1.1 (2026-11-24): a row\n> | Status | no longer here\n";
  eq("a phrase in the Document Control history row is exempt", judgeIds([{ file: "spec/a.md", text: header.replace("a row", "no longer a row"), added: new Set([1]) }]), []);
  eq("a phrase in another Document Control row is flagged", judgeIds([{ file: "spec/a.md", text: header, added: new Set([2]) }]).length, 1);
  eq("an older entry of the Document Control history row is not new text", judgeIds([{ file: "spec/a.md", text: "> | Change History | 1.2 (2026-11-24): a row<br>1.1 (2026-11-10): D-01 approved, no longer<br>1.0 (2026-11-09): Initial\n", added: new Set([1]) }]), []);
  eq("an id in the Document Control history row is still flagged", judgeIds([{ file: "spec/a.md", text: "> | Change History | 1.1 (2026-11-24): DIAG-01\n", added: new Set([1]) }]).length, 1);

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
    ["the in operator", 'const a = "k" in b;\nfor (const k in o) {\n  use(k);\n}'],
    ["an exclamation inside a string", 'const a = "wow!";'],
  ]) {
    eq(`${what} is not flagged`, one(src, text), []);
  }
  eq("an as inside a template expression is flagged", one(src, "const s = `${value as Planted}`;").length, 1);
  eq("console is allowed in the one exempt file", judgeForbidden([{ file: "packages/react/src/DeveloperSignals.ts", text: "console.warn(1);", added: new Set([1]) }]), []);
  eq("only added lines are judged", judgeForbidden([{ file: src, text: "let a = 1;\nconst b = 1;", added: new Set([2]) }]), []);
  eq("a diff with no added line passes", judgeForbidden([{ file: src, text: "let a = 1;\nconst b = x as Y;", added: new Set() }]), []);
  eq("no entry passes", judgeForbidden([]), []);
  const typeTest = (path) => `| \`${path}\` | 3 | 0 |\nrest\n`;
  const baseAgents = typeTest("packages/devtools/test/model/DiagnosticsStore.tst.ts");
  const guard = (file, base, current) => judgeGuards([{ file, base, current }]);
  eq("an AGENTS.md equal after the type-test path replacement passes", guard("AGENTS.md", baseAgents, typeTest("packages/devtools/test/model/Diagnostics.tst.ts")), []);
  eq("an unchanged guard file passes", guard("scripts/check-house-style.mjs", baseAgents, baseAgents), []);
  eq("an AGENTS.md with a second change fails", guard("AGENTS.md", baseAgents, `${typeTest("packages/devtools/test/model/Diagnostics.tst.ts")}extra\n`).length, 1);
  eq("a budget that moves a count fails", guard("scripts/check-house-style.mjs", baseAgents, baseAgents.replace("| 3 |", "| 4 |")).length, 1);
  eq("an .oxlintrc.json with the path replaced fails", guard(".oxlintrc.json", baseAgents, typeTest("packages/devtools/test/model/Diagnostics.tst.ts")).length, 1);
  eq("an unchanged .oxlintrc.json passes", guard(".oxlintrc.json", "{}", "{}"), []);

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

  const MODEL = "packages/devtools/src/model/";
  const feedOk = [
    "export const makeDiagnosticsFeed = () => {",
    "  const view = makeExternalStore<DiagnosticsSnapshot>(diagnosticsOff);",
    "  const off = () => {",
    "    runs.stop();",
    "    sampled = false;",
    "    view.set(diagnosticsOff);",
    "  };",
    "  return { off };",
    "};",
    "",
  ].join("\n");
  const noStore = (extra = {}) =>
    judgeNoStore(
      [
        { file: `${MODEL}DiagnosticsFeed.ts`, text: feedOk },
        { file: `${MODEL}Diagnostics.ts`, text: "export const noDiagnostics = { wiring: 1 };\n" },
        { file: `${MODEL}GatesFeed.ts`, text: "const view = makeExternalStore(a);\n" },
      ].map((f) => (extra[f.file] === undefined ? f : { ...f, text: extra[f.file] })),
    );
  eq("a tree with the reading in the one snapshot passes", noStore(), []);
  eq("a mention of DiagnosticsStore in a comment fails", noStore({ [`${MODEL}Diagnostics.ts`]: "// DiagnosticsStore was here\nexport const noDiagnostics = { wiring: 1 };\n" }), [`DiagnosticsStore named in ${MODEL}Diagnostics.ts:1`]);
  eq("makeDiagnosticsStore named in a feed fails", noStore({ [`${MODEL}DiagnosticsFeed.ts`]: `${feedOk}const s = makeDiagnosticsStore();\n` }).some((r) => r.startsWith("DiagnosticsStore named in")), true);
  eq("a second makeExternalStore call in the feed fails", noStore({ [`${MODEL}DiagnosticsFeed.ts`]: `${feedOk}const w = makeExternalStore(b);\n` }), ["DiagnosticsFeed.ts holds 2 makeExternalStore calls, not one"]);
  eq("a marking wrapper in the feed fails", noStore({ [`${MODEL}DiagnosticsFeed.ts`]: `${feedOk}const marking = 1;\n` }), ["DiagnosticsFeed.ts holds marking"]);
  eq("an off that assigns a store fails", noStore({ [`${MODEL}DiagnosticsFeed.ts`]: feedOk.replace("sampled = false;", "store = make();\n    sampled = false;") }), ["off() is not exactly runs.stop(), sampled = false and view.set(diagnosticsOff)"]);
  eq("an off in another order fails", noStore({ [`${MODEL}DiagnosticsFeed.ts`]: feedOk.replace("runs.stop();\n    sampled = false;", "sampled = false;\n    runs.stop();") }).length, 1);
  eq("a feed with no off fails", noStore({ [`${MODEL}DiagnosticsFeed.ts`]: "const view = makeExternalStore(a);\n" }).length, 1);
  eq("a diagnostics module that builds a store fails", noStore({ [`${MODEL}Diagnostics.ts`]: "const s = makeExternalStore(noDiagnostics);\n" }), ["the diagnostics module builds a store"]);
  eq("the old module name is read as the diagnostics module when the new one is absent", judgeNoStore([{ file: `${MODEL}DiagnosticsFeed.ts`, text: feedOk }, { file: `${MODEL}DiagnosticsStore.ts`, text: "const s = makeExternalStore(a);\n" }]).includes("the diagnostics module builds a store"), true);
  eq("a missing feed fails", judgeNoStore([]), ["DiagnosticsFeed.ts is not found"]);

  const moduleOk = [
    'import * as Equal from "effect/Equal";',
    "const keep = <A>(previous: A, next: A): A => (Equal.equals(previous, next) ? previous : next);",
    "export function foldReading(previous: Diagnostics, next: Diagnostics): Diagnostics {",
    "  const folded: Diagnostics = {",
    "    wiring: keep(previous.wiring, next.wiring),",
    "    activity: keep(previous.activity, next.activity),",
    "  };",
    "  return sameFields(folded, previous) ? previous : folded;",
    "}",
    "",
  ].join("\n");
  const fold = (extra = {}) =>
    judgeSingleFold(
      [
        { file: `${MODEL}Diagnostics.ts`, text: moduleOk },
        { file: `${MODEL}DiagnosticsFeed.ts`, text: "const view = 1; // keep(a, b) and Equal.equals in a comment\nconst s = 'keep(a) Equal.equals';\n" },
        { file: "packages/devtools/src/index.ts", text: 'export { a } from "./model/Diagnostics.ts";\n' },
        { file: "packages/devtools/src/react/index.ts", text: "export {};\n" },
      ].map((f) => (extra[f.file] === undefined ? f : { ...f, text: extra[f.file] })),
    );
  eq("a module with one fold passes", fold(), []);
  eq("an arrow const foldReading is not a declared function", fold({ [`${MODEL}Diagnostics.ts`]: moduleOk.replace("export function foldReading(previous: Diagnostics, next: Diagnostics): Diagnostics {", "export const foldReading = (previous: Diagnostics, next: Diagnostics): Diagnostics => {").replace("}\n", "};\n") }).includes("foldReading is not declared as an exported function"), true);
  eq("keep called in a store fails", fold({ [`${MODEL}DiagnosticsFeed.ts`]: "const a = keep(x, y);\n" }), [`keep is called outside foldReading: ${MODEL}DiagnosticsFeed.ts:1`]);
  eq("a generic keep call in the feed fails", fold({ [`${MODEL}DiagnosticsFeed.ts`]: "const a = keep<Wiring>(x, y);\n" }).length, 1);
  eq("keep called in the module outside foldReading fails", fold({ [`${MODEL}Diagnostics.ts`]: `${moduleOk}const other = keep(1, 2);\n` }), [`keep is called outside foldReading: ${MODEL}Diagnostics.ts:10`]);
  eq("keep exported fails", fold({ [`${MODEL}Diagnostics.ts`]: moduleOk.replace("const keep", "export const keep") }), ["keep is exported"]);
  eq("Equal.equals outside keep fails", fold({ [`${MODEL}Diagnostics.ts`]: `${moduleOk}const same = Equal.equals(a, b);\n` }), [`Equal.equals appears outside keep: ${MODEL}Diagnostics.ts:10`]);
  eq("Equal.equals in the feed fails", fold({ [`${MODEL}DiagnosticsFeed.ts`]: "const same = Equal.equals(a, b);\n" }), [`Equal.equals appears outside keep: ${MODEL}DiagnosticsFeed.ts:1`]);
  eq("a fold that does not use sameFields fails", fold({ [`${MODEL}Diagnostics.ts`]: moduleOk.replace("sameFields(folded, previous)", "folded === previous") }).includes("foldReading does not decide identity with sameFields"), true);
  eq("an === chain on reading fields fails", fold({ [`${MODEL}Diagnostics.ts`]: `${moduleOk}const same = merged.wiring === current.wiring && merged.activity !== current.activity;\n` }).filter((r) => r.startsWith("a reading field is compared with ===")), [`a reading field is compared with ===: ${MODEL}Diagnostics.ts:10`]);
  eq("=== on a non-reading value is not a reading comparison", fold({ [`${MODEL}DiagnosticsFeed.ts`]: "const same = current.status === status && current.reading === reading;\n" }), []);
  eq("a barrel naming foldReading fails", fold({ "packages/devtools/src/index.ts": 'export { foldReading } from "./model/Diagnostics.ts";\n' }), ["a barrel names foldReading or keep: packages/devtools/src/index.ts"]);
  eq("a barrel naming keep fails", fold({ "packages/devtools/src/react/index.ts": "export { keep };\n" }), ["a barrel names foldReading or keep: packages/devtools/src/react/index.ts"]);
  eq("a missing module fails", judgeSingleFold([]).includes("foldReading is not declared as an exported function"), true);

  const g = (path, n, text) => `${path}:${n}:${text}`;
  const stale = (grep, exists = [], tracked = []) => judgeStalePath({ exists, tracked, grep: grep.join("\n") });
  eq("no old path and no mention passes", stale([]), []);
  eq("an old path on disk fails", stale([], [`${MODEL}DiagnosticsStore.ts`]), [`${MODEL}DiagnosticsStore.ts exists`]);
  eq("a tracked old path that is gone from disk fails once", stale([], [], ["packages/devtools/test/model/DiagnosticsStore.test.ts"]), ["packages/devtools/test/model/DiagnosticsStore.test.ts is tracked"]);
  eq("a path both on disk and tracked is reported once", stale([], [`${MODEL}DiagnosticsStore.ts`], [`${MODEL}DiagnosticsStore.ts`]).length, 1);
  eq("a live import path is flagged", stale([g("packages/devtools/src/index.ts", 3, 'export { a } from "./model/DiagnosticsStore.ts";')]), ["packages/devtools/src/index.ts:3 names an old path"]);
  eq("a live test path in a register is flagged", stale([g("spec/traceability.md", 596, "| `packages/devtools/test/model/DiagnosticsStore.test.ts` | BEH-QD-216 |")]), ["spec/traceability.md:596 names an old path"]);
  eq("a type-test path is flagged", stale([g("AGENTS.md", 566, "| `packages/devtools/test/model/DiagnosticsStore.tst.ts` | 3 | 0 |")]).length, 1);
  eq("a live brace list naming the module is flagged", stale([g("spec/traceability.md", 70, "`packages/devtools/src/model/{DiagnosticsStore,GatesFeed}.ts`")]), ["spec/traceability.md:70 names an old path"]);
  eq("a brace list holding the name without a path is not flagged", stale([g("a.ts", 1, "const x = {DiagnosticsStore,b};")]), []);
  eq("a blockquote line is exempt", stale([g("spec/behaviors/28-devtools-screens.md", 9, "> was `DiagnosticsStore.ts`")]), []);
  eq("an indented blockquote line is exempt", stale([g("spec/a.md", 9, "  > was `DiagnosticsStore.ts`")]), []);
  eq("a CCR row of spec/README.md is exempt", stale([g("spec/README.md", 40, "| CCR-QD-475 | moved `DiagnosticsStore.ts` |")]), []);
  eq("a CCR row of another file is not exempt", stale([g("spec/a.md", 40, "| CCR-QD-475 | moved `DiagnosticsStore.ts` |")]).length, 1);
  eq("a non-CCR line of spec/README.md is not exempt", stale([g("spec/README.md", 41, "see `DiagnosticsStore.ts`")]).length, 1);
  eq("an identifier that is not a path is not flagged", stale([g("a.ts", 1, "const x: DiagnosticsStore = make();")]), []);

  const BUDGET = (path, n = 3, k = 0) => `  "${path}": { callable: ${n}, constructable: ${k} },\n`;
  const T = "packages/devtools/test/model/Diagnostics.tst.ts";
  const V = "packages/devtools/test/model/Diagnostics.test.ts";
  const row = (path, extra) => `| \`${path}\` | ${extra} |\n`;
  const regs = (over = {}) => ({ budget: BUDGET(T), agents: row(T, "3 | 0 | `runDiagnostics`"), trace: `${row(V, "BEH-QD-216")}${row(T, "BEH-QD-323")}${row("packages/devtools/test/model/DiagnosticsFeed.test.ts", "BEH-QD-744")}`, ...over });
  const present = (path) => path === T || path === V;
  const reg = (over, exists = present) => judgeRegisters(regs(over), exists);
  eq("registers that agree pass", reg({}), []);
  eq("a budget key that moved to another Diagnostics path fails on every register it left", reg({ budget: BUDGET("packages/devtools/test/model/DiagnosticsOther.tst.ts") }).length, 4);
  eq("a budget key moved out of the Diagnostics type tests fails", reg({ budget: BUDGET("packages/devtools/test/model/Planted.tst.ts") }).length, 1);
  eq("two budget keys fail", reg({ budget: BUDGET(T) + BUDGET("packages/devtools/test/model/DiagnosticsFeed.tst.ts") }).length, 1);
  eq("no budget key fails", reg({ budget: "" }).length, 1);
  eq("an AGENTS.md row that moved fails", reg({ agents: row("packages/devtools/test/model/DiagnosticsStore.tst.ts", "3 | 0 | `x`") }), [`the budget names ${T} but AGENTS.md names packages/devtools/test/model/DiagnosticsStore.tst.ts`]);
  eq("no AGENTS.md row fails", reg({ agents: "" }).length, 1);
  eq("an AGENTS.md count that differs fails", reg({ agents: row(T, "2 | 0 | `x`") }).length, 1);
  eq("a budget count that is not 3 and 0 fails", reg({ budget: BUDGET(T, 4, 0), agents: row(T, "4 | 0 | `x`") }).length, 1);
  eq("a missing traceability row for the type test fails", reg({ trace: row(V, "x") }), [`spec/traceability.md has no row for ${T}, named by the budget`]);
  eq("a missing traceability row for the value test fails", reg({ trace: row(T, "x") }).length, 1);
  eq("a value-test row for a file that does not exist fails", reg({}, (path) => path === T).length, 1);
  eq("a type-test file that does not exist fails", reg({}, (path) => path === V).length, 1);
  eq("a value-test row of another module fails", reg({ trace: `${row(T, "x")}${row("packages/devtools/test/model/DiagnosticsStore.test.ts", "x")}` }, () => true).length, 1);
  eq("the feed's own test rows are not the module's value test", reg({ trace: `${row(T, "x")}${row(V, "x")}${row("packages/devtools/test/model/DiagnosticsFeed.characterisation.test.ts", "x")}` }), []);

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
