// The phase's shared check, run from the repository root as `node <this file> <mode> [args]`. Each mode is a pure
// judge over text plus a thin reader that gathers the text from git or the tree; a failure prints its reasons to stderr
// and exits 1. A mode reads and judges: it never commits, stages or edits a file of the tree. Modes:
//   base                                     prints phase_base read from the committed 89-mutation-base.json, after checking that
//                                            the commit planning started on and phase_base are ancestors of HEAD and that nothing
//                                            outside `.planning/` differs between them
//   commit [--first] "<subject>" <path>...   exactly one commit since phase_base has this subject and exactly these paths, none
//                                            of them a path the run rules never stage; --first also needs it to be the first plan
//                                            commit, every commit before it changing only `.planning/`
//   unchanged <path>...                      the tree matches phase_base on these paths and none is untracked
//   seen-failing <test-file> [<title>...]    each title has a failure line in the evidence file
//   vitest <report> [<test-file>...]         runs the audit project over the named files (all when none) into a JSON report
//   suite <report> [--partial] [--green | --passing <id>...]
//                                            a vitest JSON report of the audit project: only the files and rows the evidence file
//                                            lists as red before may fail, every test file loaded, every base test file and every
//                                            born test file in the tree ran (--partial skips only that last rule); --passing also
//                                            needs each named row to pass, --green needs no failure at all
//   scan-ids                                 added lines (tree against phase_base, .planning excluded) name no id or phase
//   scan-forbidden                           added source and test lines use none of the forbidden forms, and no budget file moved
//   trailers [--message <file>]              every commit since phase_base, the workflow's metadata commits included, has exactly
//                                            one trailer, the owner's; --message judges one message text instead, so the mode
//                                            fails without a commit
//   admission-step [--module-only]           HostBatch.ts is the one plain, package-private admission step; --module-only judges the
//                                            module alone, before the entry points call it
//   entry-points-first [<name>...]           the first statement of each entry point's body admits the batch; with names, only those
//   records [--close]                        the pinned-by lists name tests that exist; --close also needs every reserved
//                                            record written and every amended record at its next revision
//   --self-test                              drives every judge with planted text
// Shortcuts: the comment and string blanking does not understand regex literals, `any` is read by the token before it,
// and a function whose return type is a literal object type is read wrongly by the module-scope reader: reword the
// declaration. A false positive is cleared by rewording the line, never by weakening a judge. The shape modes read source
// text with comments and strings blanked and match its shapes by pattern, so a reworded declaration that keeps the same
// meaning can need the pattern widened; that is a reviewed edit to this file, never a reason to skip the mode. A function is
// read from its first parameter list: a `=>` or a `{` inside a return type annotation is read wrongly. A block is read as
// the text between a bracket and its match, so a bracket inside a regex literal is read wrongly. A pinned-by paragraph
// starts at `Pinned by` or `Enforcement:` and ends at the next blank line; quoted titles before its first file belong to
// it. A revision one step above its base is the next minor number (1.413 to 1.414, 1.4 to 1.5).
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { basename, dirname, relative } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

/** This script's own directory, relative to the repository root, with a trailing slash. */
const D = `${relative(process.cwd(), dirname(fileURLToPath(import.meta.url)))}/`;
/** This script's own directory name: the one phase directory a run may stage under `.planning/phases/`. */
const PHASE_DIR = basename(dirname(fileURLToPath(import.meta.url)));
const EVIDENCE = `${D}89-RED-EVIDENCE.md`;
const BASE_RECORD = `${D}89-mutation-base.json`;
/** The one trailer every commit ends with: the project owner's line, and no other Claude name is accepted. */
const TRAILER = "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>";
const PLAN_SUBJECT = /^[a-z]+[(]89-[0-9]{2}[)]!?: /;
const GUARDED = ["AGENTS.md", "scripts/check-house-style.mjs", ".oxlintrc.json"];
/** The commit planning started on: every file outside `.planning/` is the one phase_base holds. */
const PLANNING_HEAD = "b1d9043b";
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
/** The paths the run rules never stage, as patterns over repository-relative paths. */
const NEVER_STAGED = [
  /^\.planning\/config\.json$/,
  /^\.planning\/state\.json$/,
  /^\.planning\/REQUIREMENTS\.md$/,
  /^README\.md$/,
  /^\.agents\//,
  /^\.codex\//,
  /^assets\//,
  /^\.planning\/milestones\//,
  /\.iter[0-9]*\.md$/,
  new RegExp(`^\\.planning\\/phases\\/(?!${escapeRe(PHASE_DIR)}\\/)`),
];

const fail = (lines) => {
  console.error(lines.join("\n"));
  process.exit(1);
};
const git = (...args) => execFileSync("git", args, { encoding: "utf8", maxBuffer: 1 << 28, stdio: ["ignore", "pipe", "pipe"] });
const sorted = (xs) => [...xs].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));

/** phase_base from the text of the committed record, or undefined when the text holds none. */
export const phaseBaseOf = (recordText) => {
  if (recordText === undefined) return undefined;
  try {
    const base = JSON.parse(recordText)?.phase_base;
    return typeof base === "string" && /^[0-9a-f]{40}$/.test(base) ? base : undefined;
  } catch {
    return undefined;
  }
};
/**
 * Reasons the recorded phase_base cannot be the base: not recorded, either commit not an ancestor of HEAD, or a file
 * outside `.planning/` that differs between the planning commit and phase_base. Pure over the facts the reader gathers.
 */
export const judgeBase = (recorded, { planningAncestor, baseAncestor, outside }) => {
  if (recorded === undefined) return ["phase_base is not recorded"];
  const bad = [];
  if (!planningAncestor) bad.push(`${PLANNING_HEAD} is not an ancestor of HEAD`);
  if (!baseAncestor) bad.push("phase_base is not an ancestor of HEAD");
  for (const p of outside) bad.push(`${p} differs between ${PLANNING_HEAD} and phase_base outside .planning`);
  return bad;
};
const isAncestor = (a) => {
  try {
    git("merge-base", "--is-ancestor", a, "HEAD");
    return true;
  } catch {
    return false;
  }
};
const readBase = () => {
  const base = phaseBaseOf(existsSync(BASE_RECORD) ? readFileSync(BASE_RECORD, "utf8") : undefined);
  if (base === undefined) return fail(["phase_base is not recorded"]);
  const outside = (() => {
    try {
      return git("diff", "--name-only", PLANNING_HEAD, base, "--", ".", ":!.planning").split("\n").filter((p) => p !== "");
    } catch {
      return ["(the diff of the two commits could not be read)"];
    }
  })();
  const bad = judgeBase(base, { planningAncestor: isAncestor(PLANNING_HEAD), baseAncestor: isAncestor(base), outside });
  if (bad.length > 0) fail(bad);
  return base;
};

/** Reasons a commit message's trailers are wrong: exactly one `Co-Authored-By:` line, and it is the owner's. */
export const judgeTrailer = (message) => {
  const lines = message.split("\n").filter((l) => /^Co-Authored-By:/i.test(l));
  if (lines.length !== 1) return [`the message has ${lines.length} Co-Authored-By lines, not one`];
  return lines[0] === TRAILER ? [] : [`the trailer is not ${TRAILER}: ${lines[0]}`];
};

/**
 * Reasons the commit asked for is not the one commit with `subject` and exactly `paths`, or holds, or was asked to hold,
 * a path the run rules never stage. `commits` are in order. With `first` it must also be the first plan commit since
 * phase_base, and each commit before it, the planning commits between the base and the execution start, may change only
 * paths under `.planning/`.
 */
export const judgeCommit = (commits, subject, paths, first) => {
  const hits = commits.filter((c) => c.subject === subject);
  if (hits.length !== 1) return [`${hits.length} commits since phase_base have the subject: ${subject}`];
  const [c] = hits;
  const bad = [];
  for (const p of [...c.paths, ...paths]) {
    if (NEVER_STAGED.some((re) => re.test(p))) bad.push(`${subject} holds ${p}, a path the run rules never stage`);
  }
  if (sorted(c.paths).join("\n") !== sorted(paths).join("\n")) bad.push(`the commit holds ${sorted(c.paths).join(", ")}, not ${sorted(paths).join(", ")}`);
  bad.push(...judgeTrailer(c.message));
  if (first) {
    const plan = commits.filter((x) => PLAN_SUBJECT.test(x.subject));
    if (plan[0] !== c) bad.push(`the commit is not the first plan commit after phase_base (that is: ${plan[0]?.subject})`);
    for (const earlier of commits.slice(0, commits.indexOf(c))) {
      for (const p of earlier.paths.filter((x) => !x.startsWith(".planning/"))) bad.push(`${earlier.subject} precedes the first plan commit and changes ${p} outside .planning`);
    }
  }
  return bad;
};

/** Reasons the tree differs from the base on the asked paths. */
export const judgeUnchanged = ({ changed, untracked }) => [
  ...changed.map((p) => `${p} differs from phase_base`),
  ...untracked.map((p) => `${p} is untracked`),
];

const TITLE_CALL = "it(?:\\.(?:effect|live|scoped))?|test";
/** The string literal each match of `calls` (a regex source) opens in a test file. */
const titlesFrom = (text, calls) => {
  const out = [];
  const re = new RegExp(`(?<![.\\w$])(?:${calls})\\(\\s*(["'\`])((?:\\\\.|(?!\\1)[^\\\\])*)\\1`, "g");
  for (const m of text.matchAll(re)) out.push(m[2].replace(/\\(["'`\\])/g, "$1"));
  return out;
};
/** Every test title in a test file: the string literal opening `it(`, `it.effect(`, `it.live(`, `it.scoped(` or `test(`. */
export const titlesOf = (text) => titlesFrom(text, TITLE_CALL);
/** Every title a spec's pinned-by paragraph may name: the test titles and the `describe` titles. */
export const pinTitlesOf = (text) => titlesFrom(text, `${TITLE_CALL}|describe`);

/** Reasons a title has no failure line in the evidence. With no titles asked, the file's own are asked. */
export const judgeSeenFailing = (testText, evidenceText, asked) => {
  const wanted = asked.length > 0 ? asked : titlesOf(testText);
  if (wanted.length === 0) return ["the test file has no test title"];
  const seen = new Set();
  for (const line of evidenceText.split("\n")) {
    const m = /^- (?:failed|failed [(][^)]*[)]|red before): (.*)$/.exec(line);
    if (m !== null) seen.add(m[1]);
  }
  return wanted.filter((t) => !seen.has(t)).map((t) => `no failure line in the evidence for: ${t}`);
};

/**
 * Text with comments and the text of strings and templates blanked to spaces, newlines kept; `${ }` stays code. With
 * `keepStrings` only the comments are blanked, so an import specifier can still be read.
 */
export const blank = (text, keepStrings = false) => {
  const keep = (c) => (c === "\n" ? "\n" : " ");
  const lit = (c) => (keepStrings ? (c ?? "") : keep(c ?? ""));
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
        out += keepStrings ? `${c}${d ?? ""}` : ` ${keep(d ?? "")}`;
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
        out += lit(c);
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
          out += keepStrings ? "\\" : " ";
          i++;
        }
        out += lit(text[i]);
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
  [/(?<![\w.-])89-\d{2}(?!\d)/, "a plan id"],
  [/\bADMIT-0\d\b/, "a requirement id"],
  [/\bWX-0\d\b/, "a requirement id"],
  [/(?<!(?:ADR|CCR|BEH|INV|ARCH)-)\bQD-89\b/, "a phase id"],
  [/\b[Pp]hase 89\b/, "a phase number"],
  [/-NEXT\b/, "a placeholder id"],
];
const PHRASE = /this phase|until now|any more|no longer|previously|now does|from now on/i;
const PHRASE_EXEMPT = (file) => file.startsWith(".changeset/");

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

const isSrc = (file) => /^packages\/(?:audit|core|devtools)\/src\/.*\.(?:ts|tsx|mts)$/.test(file);
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
  [/\bas\s+(?!const\b)[A-Za-z_{[(]/, "an as cast"],
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

/**
 * Reasons added source and test lines use a forbidden form. A file in `packages/{audit,core,devtools}/src` also gets the
 * source-only ones and may not add a module-scope `let` or `var`, read from the statements of the blanked file.
 */
export const judgeForbidden = (entries) => {
  const bad = [];
  for (const entry of entries) {
    if (!isSrc(entry.file) && !isTest(entry.file)) continue;
    const raw = entry.text.split("\n");
    const code = blank(entry.text);
    const lines = code.split("\n");
    const covered = renameLines(code);
    const moduleState = new Set();
    if (isSrc(entry.file)) {
      for (const { text, line } of topLevel(code)) {
        if (!/^(?:export\s+)?(?:let|var)\b/.test(text.trim())) continue;
        for (let k = 0; k < text.split("\n").length; k++) moduleState.add(line + k);
      }
    }
    for (const n of [...entry.added].sort((a, b) => a - b)) {
      const line = lines[n - 1] ?? "";
      const note = (what) => bad.push(`${entry.file}:${n} uses ${what}: ${(raw[n - 1] ?? "").trim()}`);
      if (/Stryker\s+disable/.test(raw[n - 1] ?? "")) note("a Stryker disable comment");
      if (isSrc(entry.file)) {
        for (const [re, what] of SRC_ONLY) if (re.test(line)) note(what);
        if (moduleState.has(n)) note("a module-scope let or var");
      }
      for (const [re, what] of EVERYWHERE) if (re.test(line) && !(what === "an as cast" && covered.has(n))) note(what);
    }
  }
  return bad;
};

/** Reasons a guard file moved from its text at phase_base: no budget, rule or house-style table moves in this phase. */
export const judgeGuards = (guards) =>
  guards.filter(({ base, current }) => current !== base).map(({ file }) => `${file} differs from phase_base: no budget moves`);
const lineAt = (code, index) => code.slice(0, index).split("\n").length;

/**
 * Each import and `export … from` statement of comment-free text (strings kept), as `{ spec, names, line, typeOnly }`. A name is
 * what the statement binds from the module, an `as` rename read by its source name.
 */
export const importsOf = (text) => {
  const out = [];
  const re = /^[ \t]*(?:import|export)\b([^;]*?)\bfrom\s*(["'])([^"']*)\2|^[ \t]*import\s*(["'])([^"']*)\4/gm;
  for (const m of text.matchAll(re)) {
    const clause = m[1] ?? "";
    const braces = /\{([^}]*)\}/.exec(clause);
    const inside = braces === null ? [] : braces[1].split(",").map((s) => s.trim().replace(/^type\s+/, "").split(/\s+as\s+/)[0]);
    const rest = clause.replace(/\{[^}]*\}/g, " ").replace(/^\s*type\b/, "").replace(/\*\s*as\s+/, "").split(",").map((s) => s.trim());
    out.push({ spec: m[3] ?? m[5], names: [...inside, ...rest].filter((s) => s !== ""), line: lineAt(text, m.index), typeOnly: /^\s*(?:import|export)\s+type\b/.test(m[0]) });
  }
  return out;
};

const BLOCK_HEAD = /^(?:(?:export\s+)?(?:default\s+)?(?:declare\s+)?(?:async\s+)?(?:function|interface|class|enum|namespace)\b|(?:if|for|while|switch|try|do|else|catch|finally)\b|\{)/;
/**
 * The statements at module scope of blanked `code`, as `{ text, line }`. A statement ends at a `;` outside every
 * bracket, or, for a function, interface, class, enum, control statement or bare block, at the brace that closes its body.
 */
export const topLevel = (code) => {
  const out = [];
  let depth = 0;
  let start = -1;
  const push = (end) => {
    const text = code.slice(start, end);
    if (text.trim() !== ";") out.push({ text, line: lineAt(code, start) });
    start = -1;
  };
  for (let i = 0; i < code.length; i++) {
    const c = code[i];
    if (start < 0) {
      if (/\s/.test(c)) continue;
      start = i;
    }
    if ("([{".includes(c)) depth++;
    else if (")]}".includes(c)) {
      depth = Math.max(0, depth - 1);
      if (c === "}" && depth === 0 && BLOCK_HEAD.test(code.slice(start, start + 60))) push(i + 1);
    } else if (c === ";" && depth === 0) push(i + 1);
  }
  if (start >= 0 && code.slice(start).trim() !== "") out.push({ text: code.slice(start).trim(), line: lineAt(code, start) });
  return out;
};

const collapse = (s) => s.replace(/\s+/g, " ").trim();
const PAIRS = { "(": ")", "[": "]", "{": "}" };

/** The index just past the bracket that closes the one at `open` in blanked code, or -1 when it never closes. */
export const closeOf = (code, open) => {
  const opener = code[open];
  const closer = PAIRS[opener];
  if (closer === undefined) return -1;
  let depth = 0;
  for (let i = open; i < code.length; i++) {
    if (code[i] === opener) depth++;
    else if (code[i] === closer) {
      depth--;
      if (depth === 0) return i + 1;
    }
  }
  return -1;
};

/** The top-level parameters of a parenthesised list, as text; commas inside brackets or angle brackets do not split. */
export const paramsOf = (list) => {
  const out = [];
  let depth = 0;
  let from = 0;
  for (let i = 0; i < list.length; i++) {
    const c = list[i];
    if ("([{<".includes(c)) depth++;
    else if (")]}".includes(c) || (c === ">" && list[i - 1] !== "=")) depth--;
    else if (c === "," && depth === 0) {
      out.push(list.slice(from, i));
      from = i + 1;
    }
  }
  out.push(list.slice(from));
  return out.map((p) => p.trim()).filter((p) => p !== "");
};

/** The vitest rows of a JSON report: `{ file, title, status }`. */
const rowsOfReport = (report) => report.testResults.flatMap((f) => (f.assertionResults ?? []).map((a) => ({ file: f.name, title: a.title, status: a.status })));
/** The files and titles the evidence file lists as red before. */
export const redBefore = (evidence) => new Set([...evidence.matchAll(/^- red before: (.*)$/gm)].map((m) => m[1]));

/**
 * Reasons the text of a vitest JSON report cannot be judged: no report was written, it is not JSON or not a vitest report,
 * or it names no test file. With none, `line` is the run's one-line summary. Pure.
 */
export const judgeVitestReport = (text) => {
  if (text === undefined) return { bad: ["no report was written"] };
  const report = (() => {
    try {
      return JSON.parse(text);
    } catch {
      return undefined;
    }
  })();
  if (report === undefined || !Array.isArray(report.testResults)) return { bad: ["the report is not a vitest JSON report"] };
  if (report.testResults.length === 0) return { bad: ["the report names no test file"] };
  const rows = rowsOfReport(report);
  return { bad: [], line: `vitest: ${rows.length} rows in ${report.testResults.length} files, ${rows.filter((r) => r.status === "failed").length} failed` };
};

/**
 * Reasons a vitest JSON report of the devtools project is not acceptable: a failing row that the evidence does not list
 * as red before, a test file that failed to load and is not listed either, a base or born test file that did not run
 * (unless `partial`), a named row that does not pass, and with `green` any failure. `baseTests` are the `*.test.ts(x)` paths
 * under the test directory at phase_base and `bornTests` the born files that exist in the tree.
 */
export const judgeSuite = ({ report, allowed, baseTests, bornTests, passing, green, partial }) => {
  const bad = [];
  const listed = (name) => [...allowed].some((a) => name === a || name.endsWith(`/${a}`));
  for (const f of report.testResults) {
    if ((f.assertionResults ?? []).length === 0 || (typeof f.message === "string" && f.message !== "")) {
      if (!listed(f.name)) bad.push(`${f.name} failed to load`);
    }
  }
  const rows = rowsOfReport(report);
  for (const r of rows.filter((x) => x.status === "failed")) {
    if (green) bad.push(`${r.title} fails`);
    else if (!allowed.has(r.title)) bad.push(`${r.title} fails and is not red before`);
  }
  const ran = report.testResults.map((f) => f.name);
  if (!partial) for (const path of [...baseTests, ...bornTests]) if (!ran.some((n) => n === path || n.endsWith(`/${path}`))) bad.push(`${path} did not run`);
  for (const id of passing) {
    const hits = rows.filter((r) => r.title.startsWith(id) && !/[A-Za-z0-9]/.test(r.title[id.length] ?? ""));
    if (hits.length === 0) bad.push(`no row ${id} is in the report`);
    for (const r of hits) if (r.status !== "passed") bad.push(`${r.title} is ${r.status}, not passed`);
  }
  return bad;
};

/** The text of the `## <heading>` section of a markdown document, up to the next `## ` heading, or undefined. */
const sectionOf = (text, heading) => {
  const start = text.search(new RegExp(`^## ${heading}`, "m"));
  if (start < 0) return undefined;
  const rest = text.slice(start + 3);
  const next = rest.search(/^## /m);
  return next < 0 ? rest : rest.slice(0, next);
};
/** Whether a behavior-id list such as `BEH-QD-211–218, BEH-QD-233` names `BEH-QD-<n>`, a range included. */
const covers = (text, n) =>
  [...text.matchAll(/BEH-QD-(\d+)(?:[–-](\d+))?/g)].some((m) => n >= Number(m[1]) && n <= Number(m[2] ?? m[1]));


/** The `Revision` of a document's control table as `{ major, minor, text }`, or undefined. */
export const revisionOf = (text) => {
  const m = /^>\s*\|\s*Revision\s*\|\s*(\d+)\.(\d+)\s*\|/m.exec(text);
  return m === null ? undefined : { major: Number(m[1]), minor: Number(m[2]), text: `${m[1]}.${m[2]}` };
};


const BEHAVIORS = "spec/behaviors/33-audit-pipeline.md";
const AUDIT_SRC = "packages/audit/src";
const AUDIT_TESTS = "packages/audit/test/";
const HOST = `${AUDIT_SRC}/HostBatch.ts`;
const CODEC = `${AUDIT_SRC}/CodecMade.ts`;
const BARREL = `${AUDIT_SRC}/index.ts`;
const MANIFEST = "packages/audit/package.json";
/** The test files the phase adds that vitest runs; each that exists in the tree must run. */
const BORN_TESTS = [`${AUDIT_TESTS}AdmissionOrder.characterisation.test.ts`, `${AUDIT_TESTS}BatchReadOnce.test.ts`, `${AUDIT_TESTS}HostBatch.test.ts`];
/** The rows of the traceability test map the phase writes. */
const TRACE_PATHS = [HOST, ...BORN_TESTS, `${AUDIT_TESTS}HostBatch.tst.ts`];
/** The behaviors that exist today and whose heading `records` keeps; only the first of them has a pinned-by paragraph. */
const KEPT_BEHAVIORS = [253, 254, 722];
const NEW_BEHAVIORS = [781, 782, 783, 784, 785];
const PINNED = [...KEPT_BEHAVIORS, ...NEW_BEHAVIORS];
/** A pinned-by paragraph must name a test file for these; the others are judged only when they have one. */
const PIN_REQUIRED = [722, ...NEW_BEHAVIORS];
/** The invariants the phase writes, and the invariants whose source line the phase restates. */
const NEW_INVARIANTS = [423, 424];
const RESTATED_INVARIANTS = [399, 400];
/** The test files the restated archive-writer behavior's pinned-by paragraph names. */
const PINNED_NAMES = ["AdmissionOrder.characterisation.test.ts", "HostBatch.test.ts", "HostBatch.tst.ts", "ForeignRows.test.ts"];
/** The six rows the decision removes, verbatim as they were titled. */
const REMOVED_TITLES = [
  "a non-finite now is refused before the rows are read",
  "planRetention reads now and maxAgeMs before the rows",
  "the inputs read before the rows are still read first",
  "now is read before the keys, and the keys before the rows",
  "the rows are read after the keys the reader reads",
  "checks now before maxAgeMs",
];
const ADR_WORDS = ["qadi.audit.verifySequenceIntegrity", "qadi.audit.archiveAuditTrail", "NowRefusalCases", "AdmittedRows", "admitBatch", "admitRows"];
const CHANGESET = ".changeset/audit-batch-admitted-once.md";
const CHANGESET_SENTENCES = [
  "every refusal is unchanged",
  "A refused batch no longer opens the `qadi.audit.verifySequenceIntegrity` span",
  "read `maxAgeMs` once",
  "Rows are read once",
  "(INV-QD-399)",
  "No export changes.",
];
const REVISED_DOCUMENTS = [
  "spec/README.md",
  "spec/traceability.md",
  "spec/invariants.md",
  BEHAVIORS,
  "spec/decisions/190-an-audit-row-is-a-value-only-its-codec-makes.md",
  "spec/decisions/110-an-archives-facts-are-computed-once.md",
];

/** The row ids a pinned-by segment names: `RL1 to RL10` expanded, and each `(RL1` or `; RL1` opener. */
const rowsOf = (seg) => {
  const rows = new Set();
  for (const r of seg.matchAll(/(?<![\w-])([A-Z]{1,3})([0-9]+) to \1([0-9]+)(?![\w-])/g)) {
    for (let k = Number(r[2]); k <= Number(r[3]); k++) rows.add(`${r[1]}${k}`);
  }
  for (const r of seg.matchAll(/[(;]\s*([A-Z]{1,3}[0-9]+)(?![\w-])/g)) rows.add(r[1]);
  return rows;
};

/** The pinned-by paragraph of a behavior section: from `Pinned by` or `Enforcement:` to the next blank line, or "". */
const pinnedPara = (section) => /(?:Pinned by|Enforcement:)[\s\S]*?(?:\n\s*\n|$)/.exec(section)?.[0] ?? "";
/** A test file a paragraph names in backticks: a repository path or a bare name in the audit test directory. */
const TEST_PATH = /`((?:packages\/[^`\s]+|(?:test\/)?[\w.-]+)\.(?:test|tst)\.ts)`/g;
const inAudit = (path) => (path.startsWith("packages/") ? path : `${AUDIT_TESTS}${path.replace(/^test\//, "")}`);

/**
 * Reasons a behavior's pinned-by paragraph names a test file or a title that does not exist. A quoted title or a row id
 * belongs to the file named before it, and a quoted title ahead of the first file belongs to that first file.
 */
const judgePinned = (doc, n, tests) => {
  const section = sectionOf(doc, `BEH-QD-${n}:`);
  if (section === undefined) return KEPT_BEHAVIORS.includes(n) ? [`BEH-QD-${n} has no heading in ${BEHAVIORS}`] : [];
  const para = pinnedPara(section);
  const paths = [...para.matchAll(TEST_PATH)];
  if (paths.length === 0) return PIN_REQUIRED.includes(n) ? [`BEH-QD-${n} names no test file in a Pinned by paragraph`] : [];
  const bad = [];
  paths.forEach((p, i) => {
    const file = inAudit(p[1]);
    const text = tests(file);
    if (text === undefined) {
      bad.push(`BEH-QD-${n} names ${file}, which does not exist`);
      return;
    }
    const titles = pinTitlesOf(text).map(collapse);
    const seg = `${i === 0 ? para.slice(0, p.index) : ""}${para.slice(p.index + p[0].length, paths[i + 1]?.index ?? para.length)}`;
    for (const q of seg.matchAll(/"((?:[^"\\]|\\.)*)"/g)) {
      if (!titles.includes(collapse(q[1]))) bad.push(`BEH-QD-${n} quotes "${collapse(q[1])}" for ${file}, which holds no such test`);
    }
    for (const row of rowsOf(seg)) {
      if (!titles.some((t) => t.startsWith(row) && !/[A-Za-z0-9]/.test(t[row.length] ?? ""))) bad.push(`BEH-QD-${n} names row ${row} for ${file}, which no title opens`);
    }
  });
  return bad;
};

/** The row ids a line names that are the prefix of a title in `titles`: `W9` for a title `W9 a NaN now ...`. */
const titleIdsOf = (line, titles) =>
  [...line.matchAll(/(?<![\w-])([A-Z]{1,3}\d+)(?![\w-])/g)].map((m) => m[1]).filter((id) => titles.some((t) => t.startsWith(id) && !/[A-Za-z0-9]/.test(t[id.length] ?? "")));

/** The entry of `id` in the decision index: its lines up to the next entry, or undefined. */
const indexEntryOf = (index, id) => new RegExp(`^\\s*-\\s*id:\\s*"${id}"[\\s\\S]*?(?=^\\s*-\\s*id:|(?![\\s\\S]))`, "m").exec(index)?.[0];

const HOST_IMPORTS = ["effect/Data", "effect/Predicate", "effect/Result", "./AuditEntry.ts (type)", "./CodecMade.ts"];
/** The entry-point modules, which the step is below: it may import none of them (no back edge). */
const ENTRY_MODULES = ["./ArchiveFacts.ts", "./AuditArchive.ts", "./Retention.ts"];

/**
 * Reasons `HostBatch.ts` is not the one plain, package-private admission step. `facts` is `{ host, barrel, manifest,
 * siblings, codecSame }`: the module's text or undefined, the barrel's text, the package manifest's text, every other
 * `{ file, text }` of `packages/audit/src` and whether `CodecMade.ts` is the base's. With `moduleOnly` the two rules that
 * need the entry points wired are not judged: the one place `NowNotFinite` is a member key, and the one module that asks
 * the rows and the finiteness of `now`. Pure.
 */
export const judgeAdmissionStep = ({ host, barrel, manifest, siblings, codecSame }, moduleOnly) => {
  if (host === undefined) return [`${HOST} does not exist`];
  const bad = [];
  barrel.split("\n").forEach((line, i) => {
    if (/HostBatch/.test(line)) bad.push(`${HOST} is reached from ${BARREL}:${i + 1}`);
  });
  const exportsMap = (() => {
    try {
      return JSON.parse(manifest)?.exports ?? {};
    } catch {
      return undefined;
    }
  })();
  if (exportsMap === undefined) bad.push(`${MANIFEST} is not JSON`);
  else for (const [key, value] of Object.entries(exportsMap)) if (JSON.stringify([key, value]).includes("HostBatch")) bad.push(`${HOST} is reached from the exports key ${key} of ${MANIFEST}`);
  const imports = importsOf(blank(host, true));
  const entryKind = imports.filter((i) => i.spec === "./AuditEntry.ts").every((i) => i.typeOnly) ? "type" : "value";
  const found = [...new Set(imports.map((i) => (i.spec === "./AuditEntry.ts" ? `${i.spec} (${entryKind})` : i.spec)))].sort();
  if (found.join("\n") !== [...HOST_IMPORTS].sort().join("\n")) bad.push(`HostBatch.ts imports ${found.length === 0 ? "nothing" : found.join(", ")}, not ${HOST_IMPORTS.join(", ")}`);
  for (const spec of ENTRY_MODULES) if (imports.some((i) => i.spec === spec)) bad.push(`HostBatch.ts imports ${spec}, an entry-point module`);
  const code = blank(host);
  const effect = /\bEffect\.[\w$]*|\bwithSpan\b/.exec(code);
  if (effect !== null) bad.push(`HostBatch.ts uses Effect: ${effect[0]}`);
  if (!/\bNumber\.isFinite\s*\(/.test(code)) bad.push("HostBatch.ts does not call Number.isFinite");
  if (/(?<![\w.$])isFinite\s*\(/.test(code)) bad.push("HostBatch.ts calls a bare isFinite(");
  if (!codecSame) bad.push(`${CODEC} differs from phase_base`);
  if (!moduleOnly) {
    const holders = [...siblings, { file: HOST, text: host }].filter(({ text }) => /(?:^|[{;,]|\breadonly)\s*NowNotFinite\s*:/m.test(blank(text))).map((f) => f.file);
    if (holders.length !== 1 || holders[0] !== HOST) bad.push(`NowNotFinite: is a member key in ${holders.length} files of ${AUDIT_SRC}, not one: ${holders.join(", ")}`);
    for (const { file, text } of siblings) {
      const sibling = blank(text);
      if (/\browsRefusal\s*\(/.test(sibling)) bad.push(`${file} calls rowsRefusal(; only HostBatch.ts may`);
      if (/\bNumber\.isFinite\s*\(/.test(sibling)) bad.push(`${file} calls Number.isFinite(; only HostBatch.ts may`);
    }
  }
  return bad;
};

/** The four entry points, each with the module it is declared in. */
const ENTRY_POINTS = [
  ["archiveAuditTrail", `${AUDIT_SRC}/AuditArchive.ts`],
  ["verifySequenceIntegrity", `${AUDIT_SRC}/ArchiveFacts.ts`],
  ["planRetention", `${AUDIT_SRC}/Retention.ts`],
  ["planPurge", `${AUDIT_SRC}/Retention.ts`],
];
const VERIFIED = ["verifiedArchiveFacts", `${AUDIT_SRC}/ArchiveFacts.ts`];
const ADMITS = /\badmit(?:Batch|Rows)\s*\(/;
/** A first statement that opens a block of its own: the admission would be conditional, so it is not first. */
const CONTROL = /^(?:if|for|while|switch|try|do|else)\b/;

/**
 * The parameter list and the body of the function declared as `name` in blanked `code`, as `{ params, body }`, or
 * undefined. A declaration is a `const` or a `function` that starts in column 0 (module scope); its function is the first `function` keyword
 * before any arrow, else its first parenthesised parameter list followed by an arrow. A block body is the text between
 * its braces; an expression body is the expression. Pure.
 */
export const functionOf = (code, name) => {
  const decl = new RegExp(`^(?:export\\s+)?(?:const\\s+${name}\\b|(?:async\\s+)?function\\s*\\*?\\s*${name}\\b)`, "m").exec(code);
  if (decl === null) return undefined;
  // A declaration runs to the next line that starts in column 0 with a word: a closing bracket never does.
  const after = decl.index + decl[0].length;
  const next = code.slice(after).search(/^[A-Za-z]/m);
  const text = code.slice(decl.index, next < 0 ? code.length : after + next);
  const keyword = /\bfunction\s*\*?\s*(?:[\w$]+\s*)?\(/.exec(text);
  const arrow = text.indexOf("=>");
  if (keyword !== null && (arrow < 0 || keyword.index < arrow)) {
    const open = keyword.index + keyword[0].length - 1;
    const close = closeOf(text, open);
    const bodyOpen = close < 0 ? -1 : text.indexOf("{", close);
    const bodyClose = bodyOpen < 0 ? -1 : closeOf(text, bodyOpen);
    if (bodyClose < 0) return undefined;
    return { params: text.slice(open + 1, close - 1), body: text.slice(bodyOpen + 1, bodyClose - 1) };
  }
  const open = text.indexOf("(", text.indexOf("=", text.indexOf(name)));
  const close = open < 0 ? -1 : closeOf(text, open);
  const head = close < 0 ? -1 : text.indexOf("=>", close);
  if (head < 0) return undefined;
  const rest = text.slice(head + 2).trim();
  if (rest.startsWith("{")) {
    const end = closeOf(rest, 0);
    return end < 0 ? undefined : { params: text.slice(open + 1, close - 1), body: rest.slice(1, end - 1) };
  }
  return { params: text.slice(open + 1, close - 1), body: rest.replace(/;\s*$/, "") };
};

/**
 * Reasons an entry point does not admit its batch first. `texts` maps each module to its text or undefined; with `names`
 * only those functions are judged (`verifiedArchiveFacts` is one of the names it takes), and with none all five are. Pure.
 */
export const judgeEntryPoints = (texts, names = []) => {
  const all = names.length === 0;
  const known = [...ENTRY_POINTS.map(([n]) => n), VERIFIED[0]];
  const bad = names.filter((n) => !known.includes(n)).map((n) => `${n} is not an entry point or verifiedArchiveFacts`);
  for (const [name, file] of ENTRY_POINTS) {
    if (!all && !names.includes(name)) continue;
    const fn = texts[file] === undefined ? undefined : functionOf(blank(texts[file]), name);
    if (fn === undefined) {
      bad.push(`${name}: no body found in ${file}`);
      continue;
    }
    const first = topLevel(fn.body)[0]?.text ?? "";
    if (!ADMITS.test(first) || CONTROL.test(first.trim())) bad.push(`${name}: the first statement of its body does not call admitBatch or admitRows: ${collapse(first).slice(0, 80)}`);
    if (name === "planPurge" && /\bplanRetention\s*\(/.test(fn.body)) bad.push("planPurge calls planRetention");
  }
  if (all || names.includes(VERIFIED[0])) {
    const [name, file] = VERIFIED;
    const fn = texts[file] === undefined ? undefined : functionOf(blank(texts[file]), name);
    if (fn === undefined) bad.push(`${name}: no body found in ${file}`);
    else {
      const first = paramsOf(fn.params)[0];
      const typed = first === undefined ? null : /^[^:]*:\s*([\s\S]+)$/.exec(first);
      const type = typed === null ? undefined : collapse(typed[1]);
      if (type !== "AdmittedRows") bad.push(`${name} takes ${type ?? (first === undefined ? "no parameter" : "an untyped parameter")}, not AdmittedRows`);
    }
  }
  return bad;
};

/** The one-line result `entry-points-first` prints for the functions it judged. */
export const entryPointsLine = (names = []) => {
  const all = names.length === 0;
  const judged = ENTRY_POINTS.map(([n]) => n).filter((n) => all || names.includes(n));
  const parts = [];
  if (judged.length > 0) parts.push(`${judged.join(", ")} each admit the batch first`);
  if (judged.includes("planPurge")) parts.push("planPurge does not call planRetention");
  if (all || names.includes(VERIFIED[0])) parts.push("verifiedArchiveFacts takes AdmittedRows");
  return `entry-points-first: ${parts.join("; ")}`;
};

const adrChecks = (adr, auditTitles) => {
  if (adr === undefined) return ["spec/decisions/202-*.md does not exist"];
  const bad = [];
  if (!adr.includes("QADI-ADR-202")) bad.push("the ADR-QD-202 file does not carry QADI-ADR-202");
  if (revisionOf(adr)?.text !== "1.0") bad.push("the ADR-QD-202 file is not at Revision 1.0");
  const lines = adr.split("\n");
  const rows = lines.filter((l) => l.trimStart().startsWith("|"));
  if (!lines.some((l) => l.trim() === "Tests removed: 6.")) bad.push("the ADR-QD-202 file has no line Tests removed: 6.");
  for (const title of REMOVED_TITLES) {
    const named = rows.filter((l) => l.includes(title));
    if (named.length === 0) bad.push(`the ADR-QD-202 audit table has no row naming "${title}"`);
    for (const row of named) if (titleIdsOf(row, auditTitles).length === 0) bad.push(`the ADR-QD-202 audit row naming "${title}" names no id that opens an audit test title`);
  }
  for (const word of ADR_WORDS) if (!adr.includes(word)) bad.push(`the ADR-QD-202 file does not name ${word}`);
  if (!/^## What enforces it/m.test(adr)) bad.push("the ADR-QD-202 file has no section What enforces it");
  return bad;
};

/**
 * Reasons the records written at the close are missing or wrong. `close` is `{ invariants, adr202, adr190, adr110, index,
 * readme, revised, changesets, auditTitles }`: the text of the invariants, of each decision file (ADR-QD-202 or
 * undefined), of the decision index and of the readme, the `{ file, base, now }` text of each document that must be one
 * revision above phase_base, the `{ file, text }` of each changeset added since phase_base and every title of the audit
 * test files. Pure.
 */
const judgeClosed = ({ trace, doc }, close) => {
  const bad = [];
  const one = sectionOf(trace, "§1 ") ?? "";
  for (const n of NEW_BEHAVIORS) {
    if (sectionOf(doc, `BEH-QD-${n}:`) === undefined) bad.push(`BEH-QD-${n} has no heading in ${BEHAVIORS}`);
    if (!covers(one, n)) bad.push(`BEH-QD-${n} has no row in spec/traceability.md §1`);
  }
  const two = sectionOf(trace, "§2 ") ?? "";
  for (const n of NEW_INVARIANTS) {
    if (!new RegExp(`^## INV-QD-${n}:`, "m").test(close.invariants)) bad.push(`INV-QD-${n} has no heading in spec/invariants.md`);
    if (!new RegExp(`^\\| \\[INV-QD-${n}\\]`, "m").test(two)) bad.push(`INV-QD-${n} has no row in spec/traceability.md §2`);
    const line = /^\*\*Source\*\*:.*$/m.exec(sectionOf(close.invariants, `INV-QD-${n}:`) ?? "")?.[0];
    if (line === undefined) bad.push(`INV-QD-${n} has no **Source**: line`);
    else if (!line.includes(HOST)) bad.push(`the **Source**: line of INV-QD-${n} does not name ${HOST}`);
  }
  for (const n of RESTATED_INVARIANTS) {
    const line = /^\*\*Source\*\*:.*$/m.exec(sectionOf(close.invariants, `INV-QD-${n}:`) ?? "")?.[0];
    if (line === undefined || !line.includes("HostBatch.ts")) bad.push(`the **Source**: line of INV-QD-${n} does not name HostBatch.ts`);
  }
  const b722 = sectionOf(doc, "BEH-QD-722:");
  if (b722 !== undefined) {
    if (!b722.includes("#beh-qd-781-")) bad.push("BEH-QD-722 links no anchor starting #beh-qd-781-");
    if (!b722.includes("NowRefusalCases")) bad.push("BEH-QD-722 does not show NowRefusalCases");
    const para = pinnedPara(b722);
    for (const file of PINNED_NAMES) if (!para.includes(file)) bad.push(`the pinned-by paragraph of BEH-QD-722 does not name ${file}`);
  }
  for (const n of [253, 254]) {
    const section = sectionOf(doc, `BEH-QD-${n}:`);
    if (section !== undefined && !section.includes("#beh-qd-781-")) bad.push(`BEH-QD-${n} links no anchor starting #beh-qd-781-`);
  }
  bad.push(...adrChecks(close.adr202, close.auditTitles));
  if (!/^\s*-\s*id:\s*"ADR-QD-202"/m.test(close.index)) bad.push("spec/decisions/index.yaml has no ADR-QD-202 entry");
  for (const id of ["ADR-QD-190", "ADR-QD-110"]) {
    const entry = indexEntryOf(close.index, id);
    if (entry === undefined || !/^\s*status:.*ADR-QD-202/m.test(entry)) bad.push(`the ${id} entry of spec/decisions/index.yaml does not name ADR-QD-202 in its status`);
  }
  if (!close.adr190.includes("ADR-QD-202")) bad.push("ADR-QD-190 does not name ADR-QD-202");
  if (!/^## Fourth amendment/m.test(close.adr190)) bad.push("ADR-QD-190 has no Fourth amendment heading");
  if (!close.adr110.includes("ADR-QD-202")) bad.push("ADR-QD-110 does not name ADR-QD-202");
  if (!/^\| \[ADR-QD-202\]/m.test(sectionOf(trace, "§3 ") ?? "")) bad.push("ADR-QD-202 has no row in spec/traceability.md §3");
  for (const path of TRACE_PATHS) if (!trace.split("\n").some((l) => l.startsWith("|") && l.includes(path))) bad.push(`spec/traceability.md has no row naming ${path}`);
  const ccr = /^\| CCR-QD-481 \|.*$/m.exec(close.readme);
  if (ccr === null) bad.push("spec/README.md has no CCR-QD-481 row");
  else {
    if (!ccr[0].includes("ARCH-136")) bad.push("the CCR-QD-481 row does not name ARCH-136");
    if (!ccr[0].includes("Unused: none")) bad.push("the CCR-QD-481 row does not say Unused: none");
  }
  for (const { file, base, now } of close.revised) {
    const was = revisionOf(base);
    const is = revisionOf(now);
    if (was === undefined) bad.push(`${file} has no Revision at phase_base`);
    else if (is === undefined) bad.push(`${file} has no Revision`);
    else if (is.major !== was.major || is.minor !== was.minor + 1) bad.push(`${file} is at Revision ${is.text}, not ${was.major}.${was.minor + 1}`);
  }
  if (close.changesets.length !== 1) bad.push(`${close.changesets.length} changesets are added since phase_base, not one`);
  else {
    const [changeset] = close.changesets;
    if (changeset.file !== CHANGESET) bad.push(`${changeset.file} is not ${CHANGESET}`);
    if (!changeset.text.startsWith('---\n"@qadi/audit": patch\n---\n')) bad.push(`${changeset.file} is not a patch changeset for @qadi/audit alone`);
    const flat = collapse(changeset.text);
    for (const sentence of CHANGESET_SENTENCES) if (!flat.includes(sentence)) bad.push(`${changeset.file} does not hold: ${sentence}`);
  }
  return bad;
};

/**
 * Reasons the records name tests that do not exist, and with `close` every reserved record is not written. `trace` is the
 * text of `spec/traceability.md`; `doc` is the text of the audit behaviors document; `tests(path)` is a test file's text
 * or undefined; `close` is undefined or the object `judgeClosed` reads.
 */
export const judgeRecords = ({ trace, doc, tests }, close) => {
  const bad = PINNED.flatMap((n) => judgePinned(doc, n, tests));
  return close === undefined ? bad : [...bad, ...judgeClosed({ trace, doc }, close)];
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

// The root README and the assets are the owner's own unrelated changes, never staged by a run (the commit mode refuses them).
const OUTSIDE = [":!.planning", ":!.agents", ":!.codex", ":!assets", ":!README.md"];
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

const done = (bad, ok) => {
  if (bad.length > 0) fail(bad);
  console.log(ok);
};

const readText = (file) => readFileSync(file, "utf8");
const maybe = (path) => (existsSync(path) ? readText(path) : undefined);

/** The files git lists under `pathspecs` (tracked and untracked, ignored left out) that exist in the tree. */
const treeFiles = (...pathspecs) =>
  git("ls-files", "-co", "--exclude-standard", "--", ...pathspecs)
    .split("\n")
    .filter((p) => p !== "" && existsSync(p));

/** The `{ file, text }` of every `.ts` and `.tsx` source file of every package. */
const sourceFiles = () => treeFiles("packages/*/src/*.ts", "packages/*/src/*.tsx").map((file) => ({ file, text: readText(file) }));

/** The `{ file, text }` of each changeset added since `base`: committed, staged or untracked. */
const addedChangesets = (base) => {
  const names = new Set([
    ...git("diff", "--name-only", "--diff-filter=A", base, "--", ".changeset").split("\n"),
    ...git("ls-files", "--others", "--exclude-standard", "--", ".changeset").split("\n"),
  ]);
  return [...names].filter((p) => /^\.changeset\/[^/]+\.md$/.test(p) && p !== ".changeset/README.md" && existsSync(p)).map((file) => ({ file, text: readText(file) }));
};

const ADR190 = "spec/decisions/190-an-audit-row-is-a-value-only-its-codec-makes.md";
const ADR110 = "spec/decisions/110-an-archives-facts-are-computed-once.md";

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
    const evidence = existsSync(EVIDENCE) ? readText(EVIDENCE) : "";
    return done(judgeSeenFailing(readText(file), evidence, titles), `seen-failing: ${file}`);
  },
  vitest: (args) => {
    const [report, ...files] = args;
    if (report === undefined) return fail(["usage: vitest <report> [<test-file>...]"]);
    // A report left by an earlier run must not stand for this one.
    rmSync(report, { force: true });
    const hadReporterDir = existsSync(".vitest");
    spawnSync("pnpm", ["exec", "vitest", "run", "--project", "audit", ...files, "--reporter=json", `--outputFile=${report}`], { stdio: "ignore" });
    if (!hadReporterDir) rmSync(".vitest", { recursive: true, force: true });
    const judged = judgeVitestReport(existsSync(report) ? readText(report) : undefined);
    return done(judged.bad, judged.line);
  },
  suite: (args) => {
    const [reportPath, ...rest] = args;
    const usage = ["usage: suite <report> [--partial] [--green | --passing <id>...]"];
    if (reportPath === undefined) return fail(usage);
    const partial = rest[0] === "--partial";
    const flags = partial ? rest.slice(1) : rest;
    const green = flags[0] === "--green";
    const passing = flags[0] === "--passing" ? flags.slice(1) : [];
    if (green ? flags.length !== 1 : flags.length > 0 && (flags[0] !== "--passing" || passing.length === 0)) return fail(usage);
    const report = (() => {
      try {
        return JSON.parse(readText(reportPath));
      } catch {
        return undefined;
      }
    })();
    if (report === undefined || !Array.isArray(report.testResults)) return fail([`${reportPath} is not a vitest JSON report`]);
    const base = readBase();
    const baseTests = git("ls-tree", "-r", "--name-only", base, "--", "packages/audit/test")
      .split("\n")
      .filter((p) => /\.test\.tsx?$/.test(p));
    const bornTests = BORN_TESTS.filter((p) => existsSync(p));
    const allowed = redBefore(existsSync(EVIDENCE) ? readText(EVIDENCE) : "");
    const failing = report.testResults.flatMap((f) => f.assertionResults ?? []).filter((a) => a.status === "failed").length;
    const bad = judgeSuite({ report, allowed, baseTests, bornTests, passing, green, partial });
    return done(bad, `suite: ${failing} failing row(s), ${green ? "none allowed" : "each red before"}; ${partial ? "a partial run" : `${baseTests.length} base and ${bornTests.length} born test files ran`}`);
  },
  "scan-ids": () => done(judgeIds(treeEntries(readBase())), "scan-ids: no id or phase wording in added lines"),
  "scan-forbidden": () => {
    const base = readBase();
    const guards = GUARDED.map((file) => ({ file, base: git("show", `${base}:${file}`), current: readText(file) }));
    return done([...judgeGuards(guards), ...judgeForbidden(treeEntries(base))], "scan-forbidden: no forbidden form in added lines");
  },
  trailers: (args) => {
    if (args[0] === "--message") {
      if (args.length !== 2) return fail(["usage: trailers [--message <file>]"]);
      return done(judgeTrailer(readText(args[1])), `trailers: ${args[1]} has the one trailer`);
    }
    if (args.length > 0) return fail(["usage: trailers [--message <file>]"]);
    const all = commitsSince(readBase());
    const bad = all.flatMap((c) => judgeTrailer(c.message).map((r) => `${c.sha.slice(0, 8)} ${c.subject}: ${r}`));
    return done(bad, `trailers: ${all.length} commits since phase_base, each with the one trailer`);
  },
  "admission-step": (args) => {
    if (args.length > 1 || (args.length === 1 && args[0] !== "--module-only")) return fail(["usage: admission-step [--module-only]"]);
    const moduleOnly = args.length === 1;
    const base = readBase();
    const siblings = sourceFiles().filter(({ file }) => file.startsWith(`${AUDIT_SRC}/`) && file !== HOST);
    const codecSame = git("diff", "--name-only", base, "--", CODEC).trim() === "" && git("ls-files", "--others", "--exclude-standard", "--", CODEC).trim() === "";
    const facts = { host: maybe(HOST), barrel: readText(BARREL), manifest: readText(MANIFEST), siblings, codecSame };
    const ok = moduleOnly
      ? "admission-step: HostBatch.ts is a plain, package-private step with its five imports"
      : "admission-step: HostBatch.ts is the one plain, package-private admission step; NowNotFinite is stated once and rowsRefusal and Number.isFinite are asked only there";
    return done(judgeAdmissionStep(facts, moduleOnly), ok);
  },
  "entry-points-first": (names) => {
    const texts = Object.fromEntries([...ENTRY_POINTS, VERIFIED].map(([, file]) => [file, maybe(file)]));
    return done(judgeEntryPoints(texts, names), entryPointsLine(names));
  },
  records: (args) => {
    const close = args[0] === "--close";
    if (args.length > 0 && !close) return fail(["usage: records [--close]"]);
    const extra = close
      ? (() => {
          const base = readBase();
          const adr202 = readdirSync("spec/decisions").find((f) => /^202-.*[.]md$/.test(f));
          const auditTitles = treeFiles("packages/audit/test")
            .filter((p) => p.endsWith(".test.ts"))
            .flatMap((p) => pinTitlesOf(readText(p)).map(collapse));
          return {
            invariants: readText("spec/invariants.md"),
            adr202: adr202 === undefined ? undefined : readText(`spec/decisions/${adr202}`),
            adr190: readText(ADR190),
            adr110: readText(ADR110),
            index: readText("spec/decisions/index.yaml"),
            readme: readText("spec/README.md"),
            revised: REVISED_DOCUMENTS.map((file) => ({ file, base: git("show", `${base}:${file}`), now: readText(file) })),
            changesets: addedChangesets(base),
            auditTitles,
          };
        })()
      : undefined;
    const ok = "records: the pinned-by lists name tests that exist";
    return done(judgeRecords({ trace: readText("spec/traceability.md"), doc: readText(BEHAVIORS), tests: (path) => maybe(path) }, extra), close ? `${ok}, and every reserved record is written` : ok);
  },
  "--self-test": () => selfTest(),
};

const selfTest = () => {
  let passed = 0;
  const eq = (name, got, want) => {
    if (JSON.stringify(got) !== JSON.stringify(want)) fail([`self-test FAILED: ${name}: got ${JSON.stringify(got)}, wanted ${JSON.stringify(want)}`]);
    passed++;
  };
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
  eq("a describe title is a title a record may name", pinTitlesOf(suite), ["plain", "on the next line", "single", "tpl", "not a title either", "scoped", 'has "quotes"']);
  eq("a file with no title has none", titlesOf("const a = 1;"), []);
  const evidence = "- failed: plain\n- failed (reason): on the next line\n- red before: single\n- failed:not this\n";
  eq("evidence in each form names its title", judgeSeenFailing(suite, evidence, ["plain", "on the next line", "single"]), []);
  eq("a title with no line fails", judgeSeenFailing(suite, evidence, ["tpl"]).length, 1);
  eq("with no title asked, every title is asked", judgeSeenFailing(suite, evidence, []).length, 3);
  eq("a file with no title fails", judgeSeenFailing("x", evidence, []).length, 1);
  eq("a title compared exactly fails on a prefix", judgeSeenFailing('it("pla", () => {});', evidence, []).length, 1);

  const idEntry = (file, line, text = line) => ({ file, text, added: new Set([1]) });
  for (const line of ["// D-49 says", "see 89-03", "ADMIT-02 holds", "WX-05", "QD-89 closes", "Phase 89 added", "phase 89", "ADR-QD-NEXT", "x BEH-QD-NEXT y", "D-12", "CCR-QD-NEXT"]) {
    eq(`${line} is flagged`, judgeIds([idEntry("packages/audit/src/a.ts", line)]).length, 1);
  }
  for (const line of ["ADR-QD-202", "INV-QD-423", "BEH-QD-781", "D-49-a", "CCR-QD-481", "ARCH-136", "ADR-QD-890", "a 1289-03x", "x189-03", "ADMIT-1", "Phase 890", "QD-890", "WX-1"]) {
    eq(`${line} is not flagged`, judgeIds([idEntry("packages/audit/src/a.ts", line)]), []);
  }
  for (const line of ["this phase", "Until Now", "any more", "no longer", "from now on", "it holds from now on", "publishes, from now on", "previously", "now does"]) {
    eq(`${line} is flagged in source`, judgeIds([idEntry("packages/audit/src/a.ts", line)]).length, 1);
    eq(`${line} is flagged in a test`, judgeIds([idEntry("packages/audit/test/a.test.ts", line)]).length, 1);
    eq(`${line} is allowed in a changeset`, judgeIds([idEntry(".changeset/a.md", line)]), []);
  }
  eq("a changeset is still scanned for ids", judgeIds([idEntry(".changeset/a.md", "ADMIT-01")]).length, 1);
  eq("an id is flagged in a test title", judgeIds([idEntry("packages/audit/test/a.test.ts", 'it("W1 holds 89-05", () => {});')]).length, 1);
  const spec = "# Title\nno longer here\n## Change History\n| 1 | no longer a row |\n";
  eq("a phrase before the change history is flagged", judgeIds([{ file: "spec/a.md", text: spec, added: new Set([2]) }]).length, 1);
  eq("a phrase in the change history is exempt", judgeIds([{ file: "spec/a.md", text: spec, added: new Set([4]) }]), []);
  const header = "> | Change History | 1.1 (2026-11-26): a row\n> | Status | no longer here\n";
  eq("a phrase in the Document Control history row is exempt", judgeIds([{ file: "spec/a.md", text: header.replace("a row", "no longer a row"), added: new Set([1]) }]), []);
  eq("a phrase in another Document Control row is flagged", judgeIds([{ file: "spec/a.md", text: header, added: new Set([2]) }]).length, 1);
  eq("an older entry of the Document Control history row is not new text", judgeIds([{ file: "spec/a.md", text: "> | Change History | 1.2 (2026-11-26): a row<br>1.1 (2026-11-10): D-01 approved, no longer<br>1.0 (2026-11-09): Initial\n", added: new Set([1]) }]), []);
  eq("an id in the Document Control history row is still flagged", judgeIds([{ file: "spec/a.md", text: "> | Change History | 1.1 (2026-11-26): ADMIT-01\n", added: new Set([1]) }]).length, 1);
  eq("only added lines are scanned for ids", judgeIds([{ file: "packages/audit/src/a.ts", text: "// D-12\nconst a = 1;", added: new Set([2]) }]), []);

  const src = "packages/audit/src/A.ts";
  const test = "packages/audit/test/A.test.ts";
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
    ["Stryker  disable (two spaces)", "/* Stryker  disable all */"],
    ["a module-scope let in a block", "{\n  let a = 1;\n}\nlet b = 2;"],
    ["a multi-name let", "let a = 1,\n  b = 2;"],
    ["a destructuring let", "let { a } = make();"],
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
    ["an as inside a string", 'const f = () => "value as Planted";'],
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
    ["a blanked template", "const f = () => `value as Planted ${1}`;"],
    ["a word holding any", "const company = 1;\nconst many = 2;"],
    ["a property any call", "const a = Effect.any(x);"],
    ["the in operator", 'const f = () => "k" in b;\nfor (const k in o) {\n  use(k);\n}'],
    ["an exclamation inside a string", 'const f = () => "wow!";'],
  ]) {
    eq(`${what} is not flagged`, one(src, text), []);
  }
  eq("an as inside a template expression is flagged", one(src, "const f = () => `${value as Planted}`;").length, 1);
  eq("only added lines are judged", judgeForbidden([{ file: src, text: "let a = 1;\nconst b = 1;", added: new Set([2]) }]), []);
  eq("a diff with no added line passes", judgeForbidden([{ file: src, text: "let a = 1;\nconst b = x as Y;", added: new Set() }]), []);
  eq("no entry passes", judgeForbidden([]), []);
  const planted = "a /* x */ 'b' `c ${ d as E } f` // g\nh";
  const blanked = blank(planted);
  eq("blank keeps code and length", [blanked.length === planted.length, blanked.includes("d as E"), blanked.includes("c "), blanked.includes("g")], [true, true, false, false]);
  const kept = blank(planted, true);
  eq("blank with keepStrings keeps the strings and blanks the comments", [kept.length === planted.length, kept.includes("'b'"), kept.includes("c "), kept.includes("x"), kept.includes("g")], [true, true, true, false, false]);
  eq("a string holding two slashes is not a comment", blank('import x from "http://a"; // c', true).includes("http://a"), true);

  // The owner's trailer, the commit judge over the planning commits that precede the first plan commit, and the base.
  const T1 = TRAILER;
  eq("the owner's trailer passes", judgeTrailer(`subject\n\n${T1}\n`), []);
  eq("two trailers fail", judgeTrailer(`s\n\n${T1}\n${T1}\n`).length, 1);
  eq("no trailer fails", judgeTrailer("s\n").length, 1);
  eq("a foreign trailer fails", judgeTrailer("s\n\nCo-Authored-By: Someone <a@b.c>\n").length, 1);
  eq("another Claude model fails", judgeTrailer("s\n\nCo-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>\n").length, 1);
  eq("a Claude trailer with another address fails", judgeTrailer("s\n\nCo-Authored-By: Claude Opus 5.5 <a@b.c>\n").length, 1);

  const c = (subject, paths, message = `${subject}\n\n${T1}`) => ({ sha: subject, subject, paths, message });
  const PLAN = "docs(89-01): record";
  const log = [c("docs(89): create phase plan", [".planning/a.md"]), c("docs(phase-89): add pattern map", [".planning/b.md"]), c(PLAN, ["b", "a"]), c("chore(89-01): next", ["z"])];
  eq("--first passes over planning commits that change only .planning", judgeCommit(log, PLAN, ["a", "b"], true), []);
  eq("the second plan commit passes without --first", judgeCommit(log, "chore(89-01): next", ["z"], false), []);
  eq("--first on the second plan commit fails", judgeCommit(log, "chore(89-01): next", ["z"], true)[0].startsWith("the commit is not the first plan commit"), true);
  eq("a commit before the first plan commit that changes source fails", judgeCommit([c("docs(89): x", [".planning/a.md", "packages/x.ts"]), c(PLAN, ["a"])], PLAN, ["a"], true), ["docs(89): x precedes the first plan commit and changes packages/x.ts outside .planning"]);
  eq("a wrong subject fails", judgeCommit(log, "other", ["a"], false).length, 1);
  eq("an extra path fails", judgeCommit(log, PLAN, ["a"], false).length, 1);
  eq("a missing path fails", judgeCommit(log, PLAN, ["a", "b", "c"], false).length, 1);
  eq("a duplicate subject fails", judgeCommit([c(PLAN, ["a"]), c(PLAN, ["a"])], PLAN, ["a"], false).length, 1);
  eq("a commit without the trailer fails", judgeCommit([c(PLAN, ["a"], PLAN)], PLAN, ["a"], false).length, 1);
  eq("a Phase 88 subject is refused by commit", judgeCommit([c("docs(88-01): x", ["a"])], PLAN, ["a"], false).length, 1);
  eq("a Phase 88 subject is not a plan commit", PLAN_SUBJECT.test("docs(88-01): x"), false);
  eq("a Phase 89 subject is a plan commit", PLAN_SUBJECT.test("chore(89-12)!: x"), true);

  const guard = (file, base, current) => judgeGuards([{ file, base, current }]);
  eq("an unchanged guard file passes", guard("AGENTS.md", "x", "x"), []);
  eq("a changed AGENTS.md fails", guard("AGENTS.md", "x", "y"), ["AGENTS.md differs from phase_base: no budget moves"]);
  eq("a changed budget fails", guard("scripts/check-house-style.mjs", "x", "y").length, 1);
  eq("a changed .oxlintrc.json fails", guard(".oxlintrc.json", "{}", "{ }").length, 1);
  eq("imports are read with their names", importsOf('import type { A, B as C } from "./a.ts";\nimport * as Data from "effect/Data";\nimport "./side.ts";\nexport { z } from "./z.ts";\nexport const q = 1;').map(({ spec, names }) => ({ spec, names })), [
    { spec: "./a.ts", names: ["A", "B"] },
    { spec: "effect/Data", names: ["Data"] },
    { spec: "./side.ts", names: [] },
    { spec: "./z.ts", names: ["z"] },
  ]);
  eq("a multi-line import is read", importsOf('import {\n  a,\n  b,\n} from "./a.ts";\n').map(({ spec, names, line }) => ({ spec, names, line })), [{ spec: "./a.ts", names: ["a", "b"], line: 1 }]);
  eq("an export of a value is not an import", importsOf("export const a = 1;\nexport function fromX() { return 1; }\n"), []);
  eq("the statements at module scope are split", topLevel(blank('import a from "./a.ts";\nexport type T = Data.TaggedEnum<{\n  A: {};\n}>;\nexport function f() {\n  return { a: 1 };\n}\nexport const E = Data.taggedEnum<T>();\n')).map(({ text, line }) => [collapse(text).split(" ").slice(0, 2).join(" "), line]), [["import a", 1], ["export type", 2], ["export function", 5], ["export const", 8]]);
  eq("a stray semicolon after a block is not a statement", topLevel("function f() {}\n;\nconst a = 1;").length, 2);
  eq("a control statement and a bare block end at their closing brace", topLevel("if (a) {\n  b();\n}\n{\n  c();\n}\nlet d = 1;").map(({ text }) => collapse(text).split(" ")[0]), ["if", "{", "let"]);

  // The base: a record, two ancestors and no file outside `.planning/` between the planning commit and the base.
  const sha = "0123456789abcdef0123456789abcdef01234567";
  const facts = { planningAncestor: true, baseAncestor: true, outside: [] };
  eq("a recorded base with both ancestors passes", judgeBase(sha, facts), []);
  eq("a missing record fails", judgeBase(undefined, facts), ["phase_base is not recorded"]);
  eq("a base that is not an ancestor fails", judgeBase(sha, { ...facts, baseAncestor: false }), ["phase_base is not an ancestor of HEAD"]);
  eq("a planning commit that is not an ancestor fails", judgeBase(sha, { ...facts, planningAncestor: false }), [`${PLANNING_HEAD} is not an ancestor of HEAD`]);
  eq("a file outside .planning that differs fails", judgeBase(sha, { ...facts, outside: ["a.ts"] }), [`a.ts differs between ${PLANNING_HEAD} and phase_base outside .planning`]);
  eq("the record's phase_base is read", phaseBaseOf(`{"phase":"89","phase_base":"${sha}"}`), sha);
  eq("a record with no phase_base gives none", phaseBaseOf('{"phase":"89"}'), undefined);
  eq("a phase_base that is not a full sha gives none", phaseBaseOf('{"phase_base":"cbe375bf"}'), undefined);
  eq("a record that is not JSON gives none", phaseBaseOf("nope"), undefined);
  eq("no record gives none", phaseBaseOf(undefined), undefined);

  // The wording and the evidence forms the scans read.
  for (const line of ["it previously held", "the box now does this", "Previously it was"]) {
    eq(`${line} is flagged in source`, judgeIds([idEntry("packages/audit/src/a.ts", line)]).length, 1);
  }
  eq("a changeset may say previously", judgeIds([idEntry(".changeset/a.md", "previously")]), []);
  const tagged = "- failed (base remount-after-commit): spaced tag\n- red before: a red file\n";
  eq("a failure line whose tag holds spaces and hyphens names its title", judgeSeenFailing('it("spaced tag", () => {});', tagged, []), []);
  eq("a red before line names its title too", judgeSeenFailing('it("a red file", () => {});', tagged, []), []);

  // A commit and the paths the run rules never stage.
  const SUBJECT = "chore(89-02): add the phase check";
  const NEVER = [
    ".planning/config.json",
    ".planning/state.json",
    ".planning/REQUIREMENTS.md",
    "README.md",
    ".agents/x",
    ".codex/x",
    "assets/x",
    ".planning/milestones/x",
    "a.iter2.md",
    ".planning/phases/QD-87-one-scoped-run-that-states-its-stop/87-check.mjs",
  ];
  const refused = (reasons) => reasons.some((r) => r.includes("a path the run rules never stage"));
  for (const p of NEVER) {
    eq(`${p} in the commit and the asked list is refused`, refused(judgeCommit([c(SUBJECT, [p])], SUBJECT, [p], false)), true);
    eq(`${p} only in the commit is refused`, refused(judgeCommit([c(SUBJECT, [p])], SUBJECT, ["ok"], false)), true);
    eq(`${p} only in the asked list is refused`, refused(judgeCommit([c(SUBJECT, ["ok"])], SUBJECT, [p], false)), true);
  }
  for (const p of ["packages/audit/README.md", ".planning/STATE.md", `.planning/phases/${PHASE_DIR}/89-check.mjs`]) {
    eq(`${p} may be staged`, judgeCommit([c(SUBJECT, [p])], SUBJECT, [p], false), []);
  }

  // The suite judge over a vitest JSON report, and the report the vitest mode writes.
  const sfile = (name, rows, over = {}) => ({ name: `/r/${name}`, status: "passed", message: "", assertionResults: rows.map(([title, status]) => ({ title, status })), ...over });
  const sreport = (...files) => ({ testResults: files });
  const sbase = [sfile("pkg/a.test.ts", [["R1 x", "passed"], ["RED1 y", "failed"]]), sfile("pkg/b.test.ts", [["R2 z", "passed"], ["R10 w", "passed"]])];
  const sallowed = new Set(["RED1 y"]);
  const suite1 = (over = {}, rep = sreport(...sbase)) => judgeSuite({ report: rep, allowed: sallowed, baseTests: ["pkg/a.test.ts", "pkg/b.test.ts"], bornTests: [], passing: [], green: false, partial: false, ...over });
  eq("an allowed red row failing passes", suite1(), []);
  eq("a failing row that is not listed fails", suite1({}, sreport(sfile("pkg/a.test.ts", [["R1 x", "failed"], ["RED1 y", "failed"]]), sbase[1])), ["R1 x fails and is not red before"]);
  eq("a file with no assertion results failed to load", suite1({}, sreport(...sbase, sfile("pkg/c.test.ts", []))), ["/r/pkg/c.test.ts failed to load"]);
  eq("a file with a failure message failed to load", suite1({}, sreport(sbase[0], sfile("pkg/b.test.ts", [["R2 z", "passed"]], { message: "boom" }))), ["/r/pkg/b.test.ts failed to load"]);
  eq("a file listed red before may fail to load", suite1({ allowed: new Set(["RED1 y", "pkg/c.test.ts"]) }, sreport(...sbase, sfile("pkg/c.test.ts", []))), []);
  eq("a base test file missing from the report did not run", suite1({ baseTests: ["pkg/a.test.ts", "pkg/b.test.ts", "pkg/d.test.ts"] }), ["pkg/d.test.ts did not run"]);
  eq("a born test file missing from the report did not run", suite1({ bornTests: ["pkg/e.test.ts"] }), ["pkg/e.test.ts did not run"]);
  eq("a partial run does not need the files to have run", suite1({ baseTests: ["pkg/d.test.ts"], bornTests: ["pkg/e.test.ts"], partial: true }), []);
  eq("a partial run still fails a row that is not listed", suite1({ partial: true }, sreport(sfile("pkg/a.test.ts", [["R1 x", "failed"]]))), ["R1 x fails and is not red before"]);
  eq("--passing with a red row fails", suite1({ passing: ["RED1"] }), ["RED1 y is failed, not passed"]);
  eq("--passing with a green row passes", suite1({ passing: ["R1"] }), []);
  eq("--passing is not satisfied by a longer id", suite1({ passing: ["R1"] }, sreport(sfile("pkg/a.test.ts", [["R10 x", "failed"]]), sfile("pkg/b.test.ts", []))).includes("no row R1 is in the report"), true);
  eq("--passing with an id no row opens fails", suite1({ passing: ["ZZ9"] }), ["no row ZZ9 is in the report"]);
  eq("--green with a failure fails", suite1({ green: true }), ["RED1 y fails"]);
  eq("--green with none passes", suite1({ green: true }, sreport(sfile("pkg/a.test.ts", [["R1 x", "passed"]]), sfile("pkg/b.test.ts", [["R2 z", "passed"]]))), []);
  eq("the files and rows red before are read from the evidence", [...redBefore("- red before: A one\n  - failed on: x\n- failed: B\n- red before: packages/x/C.test.ts\n")], ["A one", "packages/x/C.test.ts"]);
  eq("no report fails", judgeVitestReport(undefined).bad, ["no report was written"]);
  eq("a report that is not JSON fails", judgeVitestReport("nope").bad, ["the report is not a vitest JSON report"]);
  eq("JSON that is not a report fails", judgeVitestReport("{}").bad, ["the report is not a vitest JSON report"]);
  eq("a report naming zero files fails", judgeVitestReport('{"testResults":[]}').bad, ["the report names no test file"]);
  eq("a report is summarised", judgeVitestReport(JSON.stringify(sreport(...sbase))), { bad: [], line: "vitest: 4 rows in 2 files, 1 failed" });


  // The import reader gives the type-only flag the admission step reads.
  eq("a type-only import is flagged and a value import is not", importsOf('import type { A } from "./a.ts";\nimport { b } from "./b.ts";\nimport { type C } from "./c.ts";\nexport type { D } from "./d.ts";\n').map(({ spec, typeOnly }) => [spec, typeOnly]), [["./a.ts", true], ["./b.ts", false], ["./c.ts", false], ["./d.ts", true]]);
  eq("a module-scope let in audit source fails", judgeForbidden([{ file: "packages/audit/src/HostBatch.ts", text: "let seen = 0;\n", added: new Set([1]) }]).length, 1);
  eq("a module-scope let in core source fails", judgeForbidden([{ file: "packages/core/src/A.ts", text: "var seen = 0;\n", added: new Set([1]) }]).length, 1);
  eq("a clock in audit source fails", judgeForbidden([{ file: "packages/audit/src/A.ts", text: "const t = Date.now();\n", added: new Set([1]) }]).length, 1);
  eq("a switch in an audit test fails", judgeForbidden([{ file: "packages/audit/test/A.tst.ts", text: "switch (x) {}\n", added: new Set([1]) }]).length, 1);
  eq("an as cast in a test of another package fails", judgeForbidden([{ file: "packages/http/test/A.test.ts", text: "const a = b as C;\n", added: new Set([1]) }]).length, 1);
  eq("source of a package outside the three is not scanned", judgeForbidden([{ file: "packages/http/src/A.ts", text: "let a = 1;\n", added: new Set([1]) }]), []);

  // admission-step.
  const hostOk = [
    'import * as Data from "effect/Data";',
    'import * as Predicate from "effect/Predicate";',
    'import * as Result from "effect/Result";',
    'import type { AuditEntry } from "./AuditEntry.ts";',
    'import { rowsRefusal } from "./CodecMade.ts";',
    'import type { RowsRefusalCases } from "./CodecMade.ts";',
    "/** A comment may say Effect.fn, withSpan, isFinite( and NowNotFinite: here. */",
    "export type NowRefusalCases = { readonly NowNotFinite: { readonly value: unknown } };",
    'const note = "Effect.fn and rowsRefusal( in a string";',
    "export const admitRows = (entries: ReadonlyArray<AuditEntry>) => (Number.isFinite(1) ? rowsRefusal(entries) : entries);",
    "",
  ].join("\n");
  const sib = (name, text) => ({ file: `${AUDIT_SRC}/${name}`, text });
  const siblingsOk = [
    sib("Retention.ts", "export type RetentionInputRefusal = Data.TaggedEnum<\n  RowsRefusalCases & NowRefusalCases & {\n    MaxAgeInvalid: { readonly value: unknown };\n  }\n>;\n// NowNotFinite: in a comment\n"),
    sib("CodecMade.ts", "export const rowsRefusal = (entries: unknown) => entries;\n"),
    sib("SinkOptionChecks.ts", "const ok = (d) => Duration.isFinite(d);\n"),
  ];
  const factsOk = { host: hostOk, barrel: 'export * from "./AuditArchive.ts";\n', manifest: '{"exports":{".":{"types":"./lib/index.d.ts"}}}', siblings: siblingsOk, codecSame: true };
  const step = (over = {}, moduleOnly = false) => judgeAdmissionStep({ ...factsOk, ...over }, moduleOnly);
  const stepHas = (over, part, moduleOnly = false) => step(over, moduleOnly).some((r) => r.includes(part));
  eq("a host module of the right shape passes, whole and module only", [step(), step({}, true)], [[], []]);
  eq("a missing module is the one reason", step({ host: undefined }), [`${HOST} does not exist`]);
  eq("a barrel line naming the module fails", stepHas({ barrel: 'export * from "./HostBatch.ts";\n' }, "is reached from packages/audit/src/index.ts:1"), true);
  eq("an exports key naming the module fails", stepHas({ manifest: '{"exports":{"./HostBatch":"./src/HostBatch.ts"}}' }, "is reached from the exports key ./HostBatch"), true);
  eq("an exports value naming the module fails", stepHas({ manifest: '{"exports":{"./x":{"import":"./lib/HostBatch.js"}}}' }, "is reached from the exports key ./x"), true);
  eq("a manifest that is not JSON fails", stepHas({ manifest: "nope" }, "is not JSON"), true);
  eq("an extra import fails with the list found", step({ host: `import * as Effect from "effect/Effect";\n${hostOk}` }).some((r) => r.startsWith("HostBatch.ts imports ./AuditEntry.ts (type), ./CodecMade.ts, effect/Data, effect/Effect, effect/Predicate, effect/Result, not effect/Data")), true);
  eq("a missing import fails", stepHas({ host: hostOk.replace('import * as Predicate from "effect/Predicate";\n', "") }, "HostBatch.ts imports ./AuditEntry.ts (type), ./CodecMade.ts, effect/Data, effect/Result, not "), true);
  eq("a value import of AuditEntry fails", stepHas({ host: hostOk.replace("import type { AuditEntry }", "import { AuditEntry }") }, "./AuditEntry.ts (value)"), true);
  eq("a module with no import fails", stepHas({ host: "export const a = 1;\n" }, "HostBatch.ts imports nothing, not "), true);
  for (const spec of ENTRY_MODULES) {
    eq(`an import of ${spec} fails`, stepHas({ host: `import type { X } from "${spec}";\n${hostOk}` }, `HostBatch.ts imports ${spec}, an entry-point module`), true);
  }
  eq("an Effect call fails", stepHas({ host: `${hostOk}export const f = Effect.fn("x");\n` }, "HostBatch.ts uses Effect: Effect.fn"), true);
  eq("a span fails", stepHas({ host: `${hostOk}export const g = (x) => withSpan(x);\n` }, "HostBatch.ts uses Effect: withSpan"), true);
  eq("a missing Number.isFinite fails", stepHas({ host: hostOk.replace("Number.isFinite(1)", "true") }, "HostBatch.ts does not call Number.isFinite"), true);
  eq("a bare isFinite fails", stepHas({ host: `${hostOk}export const h = (x) => isFinite(x);\n` }, "HostBatch.ts calls a bare isFinite("), true);
  eq("Number.isFinite alone is not a bare isFinite", stepHas({}, "bare isFinite"), false);
  eq("a CodecMade that moved fails", stepHas({ codecSame: false }, `${CODEC} differs from phase_base`), true);
  const restated = [...siblingsOk, sib("ArchiveFacts.ts", "export type R = Data.TaggedEnum<{\n  NowNotFinite: { readonly value: unknown };\n}>;\n")];
  eq("NowNotFinite restated in a sibling fails the whole form", stepHas({ siblings: restated }, "NowNotFinite: is a member key in 2 files of packages/audit/src, not one: packages/audit/src/ArchiveFacts.ts, packages/audit/src/HostBatch.ts"), true);
  eq("NowNotFinite restated in a sibling passes the module-only form", stepHas({ siblings: restated }, "NowNotFinite", true), false);
  eq("NowNotFinite stated only in a sibling fails", stepHas({ host: hostOk.replace("NowNotFinite: {", "NowFinite: {"), siblings: restated }, "is a member key in 1 files of packages/audit/src, not one: packages/audit/src/ArchiveFacts.ts"), true);
  eq("NowNotFinite stated nowhere fails", stepHas({ host: hostOk.replace("NowNotFinite: {", "NowFinite: {") }, "is a member key in 0 files of packages/audit/src, not one: "), true);
  eq("a rowsRefusal call in a sibling fails", stepHas({ siblings: [...siblingsOk, sib("ArchiveFacts.ts", "const r = rowsRefusal(entries);\n")] }, "packages/audit/src/ArchiveFacts.ts calls rowsRefusal(; only HostBatch.ts may"), true);
  eq("a Number.isFinite call in a sibling fails", stepHas({ siblings: [...siblingsOk, sib("AuditArchive.ts", "if (!Number.isFinite(now)) {}\n")] }, "packages/audit/src/AuditArchive.ts calls Number.isFinite(; only HostBatch.ts may"), true);
  eq("a sibling's calls are not judged in the module-only form", step({ siblings: [...siblingsOk, sib("Retention.ts", "rowsRefusal(entries); Number.isFinite(now);\n")] }, true), []);
  eq("a Duration.isFinite call and a comment are not Number.isFinite", stepHas({ siblings: [...siblingsOk, sib("Other.ts", "// Number.isFinite( and rowsRefusal(\n")] }, "only HostBatch.ts may"), false);

  // entry-points-first.
  const arch = [
    'export const archiveAuditTrail = Effect.fn("qadi.audit.archiveAuditTrail")(function* (',
    "  entries: ReadonlyArray<AuditEntry>,",
    "  now: number,",
    ") {",
    "  const admitted = admitBatch({ now, terms: () => keys(), entries });",
    "  if (Result.isFailure(admitted)) {",
    "    return yield* Effect.fail(admitted.failure);",
    "  }",
    "  return admitted.success;",
    "});",
    "",
  ].join("\n");
  const factsText = [
    'export const verifiedArchiveFacts = Effect.fn("qadi.audit.verifySequenceIntegrity")(function* (rows: AdmittedRows) {',
    "  return rows;",
    "});",
    "export const verifySequenceIntegrity = Effect.fn(function* (entries: ReadonlyArray<AuditEntry>) {",
    "  const rows = admitRows(entries);",
    "  yield* verifiedArchiveFacts(rows);",
    "});",
    "",
  ].join("\n");
  const plans = [
    "export const planRetention = (entries: ReadonlyArray<AuditEntry>, policy: RetentionPolicy, now: number): Result.Result<A, B> => {",
    "  const admitted = admitBatch({ now, terms: () => maxAgeOf(policy), entries });",
    "  return admitted;",
    "};",
    "export const planPurge = (entries: ReadonlyArray<AuditEntry>, policy: RetentionPolicy, now: number, archive: VerifiedArchive): Result.Result<P, B> => {",
    "  const admitted = admitBatch({ now, terms: () => maxAgeOf(policy), entries });",
    "  return admitted;",
    "};",
    "",
  ].join("\n");
  const FILES = { archive: `${AUDIT_SRC}/AuditArchive.ts`, facts: `${AUDIT_SRC}/ArchiveFacts.ts`, plans: `${AUDIT_SRC}/Retention.ts` };
  const wired = (over = {}) => ({ [FILES.archive]: arch, [FILES.facts]: factsText, [FILES.plans]: plans, ...over });
  const points = (over = {}, names = []) => judgeEntryPoints(wired(over), names);
  const pointsHave = (over, part, names = []) => points(over, names).some((r) => r.includes(part));
  eq("entry points that admit first pass", points(), []);
  eq("a writer whose first statement is another check fails", points({ [FILES.archive]: arch.replace("const admitted = admitBatch({ now, terms: () => keys(), entries });", "if (!Number.isFinite(now)) {\n    return 1;\n  }\n  const admitted = admitBatch({ now, terms: () => keys(), entries });") })[0].startsWith("archiveAuditTrail: the first statement of its body does not call admitBatch or admitRows: if (!Number.isFinite(now))"), true);
  eq("the first statement is cut at eighty characters", points({ [FILES.archive]: arch.replace("const admitted = admitBatch({ now, terms: () => keys(), entries });", `const long = ${"x".repeat(100)};\n  const admitted = admitBatch({ now, terms: () => keys(), entries });`) })[0].length, "archiveAuditTrail: the first statement of its body does not call admitBatch or admitRows: ".length + 80);
  eq("an admission named in a comment does not count", pointsHave({ [FILES.facts]: factsText.replace("const rows = admitRows(entries);", "// admitRows(entries)\n  const rows = entries;") }, "verifySequenceIntegrity: the first statement"), true);
  eq("an admission in a string does not count", pointsHave({ [FILES.facts]: factsText.replace("const rows = admitRows(entries);", 'const rows = "admitRows(entries)";') }, "verifySequenceIntegrity: the first statement"), true);
  eq("an admission as the second statement fails", pointsHave({ [FILES.plans]: plans.replace("const admitted = admitBatch({ now, terms: () => maxAgeOf(policy), entries });\n  return admitted;\n};\nexport const planPurge", "const first = 1;\n  const admitted = admitBatch({ now, terms: () => maxAgeOf(policy), entries });\n  return admitted;\n};\nexport const planPurge") }, "planRetention: the first statement"), true);
  eq("a plan that admits only inside a block fails", pointsHave({ [FILES.plans]: plans.replace("const admitted = admitBatch({ now, terms: () => maxAgeOf(policy), entries });\n  return admitted;\n};\nexport const planPurge", "if (now > 0) {\n    admitBatch({ now, terms: () => 1, entries });\n  }\n  return 1;\n};\nexport const planPurge") }, "planRetention: the first statement"), true);
  eq("an expression body that admits first passes", points({ [FILES.plans]: plans.replace(/export const planPurge[\s\S]*$/, "export const planPurge = (entries: A, policy: B, now: number, archive: C) =>\n  Result.flatMap(admitBatch({ now, terms: () => maxAgeOf(policy), entries }), (b) => b);\n") }), []);
  eq("an expression body that does not admit first fails", pointsHave({ [FILES.plans]: plans.replace(/export const planPurge[\s\S]*$/, "export const planPurge = (entries: A, policy: B, now: number, archive: C) =>\n  Result.map(planRetention(entries, policy, now), (b) => b);\n") }, "planPurge: the first statement"), true);
  eq("planPurge calling planRetention fails", pointsHave({ [FILES.plans]: plans.replace(/(export const planPurge[\s\S]*?)return admitted;/, "$1const age = planRetention(entries, policy, now);\n  return admitted;") }, "planPurge calls planRetention"), true);
  eq("planRetention calling planRetention is not a purge reason", pointsHave({ [FILES.plans]: plans.replace("return admitted;\n};\nexport const planPurge", "return planRetention(entries, policy, now);\n};\nexport const planPurge") }, "planPurge calls planRetention"), false);
  eq("a verified function typed as a list fails", points({ [FILES.facts]: factsText.replace("rows: AdmittedRows", "rows: ReadonlyArray<AuditEntry>") }), ["verifiedArchiveFacts takes ReadonlyArray<AuditEntry>, not AdmittedRows"]);
  eq("a verified function with an untyped parameter fails", points({ [FILES.facts]: factsText.replace("rows: AdmittedRows", "rows") }), ["verifiedArchiveFacts takes an untyped parameter, not AdmittedRows"]);
  eq("a verified function with no parameter fails", points({ [FILES.facts]: factsText.replace("function* (rows: AdmittedRows)", "function* ()") }), ["verifiedArchiveFacts takes no parameter, not AdmittedRows"]);
  eq("a verified function typed with a longer name fails", points({ [FILES.facts]: factsText.replace("rows: AdmittedRows", "rows: AdmittedRowsList") }).length, 1);
  eq("a function that is missing has no body", points({ [FILES.plans]: plans.replace("export const planPurge", "export const planOther") }), [`planPurge: no body found in ${FILES.plans}`]);
  eq("a module that is missing has no body", points({ [FILES.archive]: undefined }), [`archiveAuditTrail: no body found in ${FILES.archive}`]);
  eq("a named subset judges only its functions", points({ [FILES.archive]: "export const archiveAuditTrail = 1;\n", [FILES.facts]: "" }, ["planRetention", "planPurge"]), []);
  eq("the verified clause is judged only when no name is given or it is named", [pointsHave({ [FILES.facts]: factsText.replace("rows: AdmittedRows", "rows: X") }, "verifiedArchiveFacts takes", ["planRetention"]), pointsHave({ [FILES.facts]: factsText.replace("rows: AdmittedRows", "rows: X") }, "verifiedArchiveFacts takes", ["verifiedArchiveFacts"])], [false, true]);
  eq("a name that is not an entry point fails", points({}, ["planOther"]), ["planOther is not an entry point or verifiedArchiveFacts"]);
  eq("the full line names every entry point", entryPointsLine(), "entry-points-first: archiveAuditTrail, verifySequenceIntegrity, planRetention, planPurge each admit the batch first; planPurge does not call planRetention; verifiedArchiveFacts takes AdmittedRows");
  eq("a subset line names only its functions", entryPointsLine(["planRetention"]), "entry-points-first: planRetention each admit the batch first");
  eq("a verified-only line names the clause", entryPointsLine(["verifiedArchiveFacts"]), "entry-points-first: verifiedArchiveFacts takes AdmittedRows");
  const declared = functionOf(blank("export function plan(a: A, b: (x: number) => void): R {\n  return admitRows(a);\n}\n"), "plan");
  eq("a function declaration is read", [declared?.params, declared?.body.trim()], ["a: A, b: (x: number) => void", "return admitRows(a);"]);
  const tricky = 'export class E extends Data.TaggedError("E")<{\n  readonly r: R;\n}> {}\nexport interface P {\n  readonly a: number;\n}\nexport const plan = (a: A): R => {\n  return admitRows(a);\n};\nexport const planMore = (a: A) => a;\n';
  eq("a declaration after a class with a generic body is read", [functionOf(blank(tricky), "plan")?.body.trim(), functionOf(blank(tricky), "planMore")?.body], ["return admitRows(a);", "a"]);
  eq("a name that only starts another name is not found", functionOf(blank("export const planMore = (a: A) => a;\n"), "plan"), undefined);
  eq("a declaration that is not a function has no body", functionOf("export const plan = 1;\n", "plan"), undefined);
  eq("a function nested in a block is not at module scope", functionOf("if (x) {\n  const plan = () => { return 1; };\n}\n", "plan"), undefined);

  // records.
  const rTest = 'it("W1 a title", () => {});\nit("B2 row", () => {});\n';
  const rTests = (p) => (p.startsWith(AUDIT_TESTS) ? rTest : undefined);
  const rPin = (names) => `Pinned by ${names.map((p) => `\`${p}\` ("W1 a title"; B2)`).join(", ")}.`;
  const rBeh = (n, body) => `## BEH-QD-${n}: heading\n\n${body}\n\n`;
  const rAdr = [
    "| Document ID | QADI-ADR-202 |",
    "> | Revision       | 1.0   |",
    "",
    "## Audit of the rows this decision edits",
    "",
    "| Removed row | Property | Row that holds it |",
    "| ----------- | -------- | ----------------- |",
    ...REMOVED_TITLES.map((title) => `| "${title}" | a property | W1 |`),
    "",
    "Tests removed: 6.",
    "",
    `The step names ${ADR_WORDS.join(", ")}.`,
    "",
    "## What enforces it",
    "",
  ].join("\n");
  const rFix = () => ({
    doc: [
      rBeh(253, "See [a](#beh-qd-781-x)."),
      rBeh(254, "See [a](#beh-qd-781-x)."),
      rBeh(722, `Shows NowRefusalCases, see [a](#beh-qd-781-x).\n\n${rPin(PINNED_NAMES)}`),
      ...NEW_BEHAVIORS.map((n) => rBeh(n, rPin(["HostBatch.test.ts"]))),
    ].join(""),
    trace: [
      "## §1 Behavior to source",
      "",
      `| 33 | BEH-QD-721–722, BEH-QD-781–785 | \`${HOST}\` |`,
      "",
      "## §2 Invariant traceability",
      "",
      "| [INV-QD-423](a) | d |",
      "| [INV-QD-424](a) | d |",
      "",
      "## §3 Decision traceability",
      "",
      "| [ADR-QD-202](a) | t |",
      "",
      "## §4 Test file map",
      "",
      ...TRACE_PATHS.map((p) => `| \`${p}\` | x |`),
      "",
    ].join("\n"),
    close: {
      invariants: [423, 424, 399, 400].map((n) => `## INV-QD-${n}: a\n\n**Source**: \`${HOST}\`, HostBatch.ts.\n\n`).join(""),
      adr202: rAdr,
      adr190: "ADR-QD-202 is named.\n\n## Fourth amendment (2026-11-26, CCR-QD-481)\n",
      adr110: "ADR-QD-202 is named.\n",
      index: '  - id: "ADR-QD-110"\n    status: "Accepted; amended (ADR-QD-202)"\n  - id: "ADR-QD-190"\n    status: "Accepted; amended (ADR-QD-202)"\n  - id: "ADR-QD-202"\n    file: "202-x.md"\n',
      readme: "| CCR-QD-481 | 2026-11-26 | ARCH-136 the step. Unused: none |\n",
      revised: REVISED_DOCUMENTS.map((file) => ({ file, base: "> | Revision       | 1.4   |\n", now: "> | Revision       | 1.5   |\n" })),
      changesets: [{ file: CHANGESET, text: `---\n"@qadi/audit": patch\n---\n\n${CHANGESET_SENTENCES.join(" ")}\n` }],
      auditTitles: ["W1 a title", "B2 row"],
    },
  });
  const rec = (mutate, { close = true, tests = rTests } = {}) => {
    const f = rFix();
    mutate?.(f);
    return judgeRecords({ trace: f.trace, doc: f.doc, tests }, close ? f.close : undefined);
  };
  const recText = (f, from, to) => {
    f.doc = f.doc.replace(from, to);
  };
  const closedHas = (mutate, part) => rec(mutate).some((r) => r.includes(part));
  const pinnedHas = (mutate, part, opts) => rec(mutate, { close: false, ...opts }).some((r) => r.includes(part));
  eq("records that agree pass, closed or not", [rec(undefined), rec(undefined, { close: false })], [[], []]);
  eq("a quoted title that no test holds fails", pinnedHas((f) => recText(f, '("W1 a title"; B2)', '("W1 a titel"; B2)'), 'quotes "W1 a titel"'), true);
  eq("a row id that no title opens fails", pinnedHas((f) => recText(f, "B2)", "B9)"), "names row B9"), true);
  eq("a pinned file that does not exist fails", pinnedHas(undefined, "which does not exist", { tests: (p) => (p.endsWith("ForeignRows.test.ts") ? undefined : rTests(p)) }), true);
  eq("a full path in a pinned-by paragraph is read", pinnedHas((f) => recText(f, "`HostBatch.test.ts` (", `\`${AUDIT_TESTS}HostBatch.test.ts\` (`), `names ${AUDIT_TESTS}HostBatch.test.ts, which does not exist`, { tests: (p) => (p === `${AUDIT_TESTS}HostBatch.test.ts` ? undefined : rTests(p)) }), true);
  eq("a kept behavior with no heading fails", pinnedHas((f) => recText(f, "## BEH-QD-253:", "## BEH-QD-9253:"), "BEH-QD-253 has no heading in spec/behaviors/33-audit-pipeline.md"), true);
  eq("a kept behavior with no pinned-by paragraph passes", pinnedHas((f) => recText(f, "See [a](#beh-qd-781-x).", "Nothing pinned."), "names no test file"), false);
  eq("the restated behavior with no pinned-by paragraph fails", pinnedHas((f) => recText(f, rPin(PINNED_NAMES), "Pinned by nothing."), "BEH-QD-722 names no test file in a Pinned by paragraph"), true);
  eq("a new behavior with no heading is skipped without --close", pinnedHas((f) => recText(f, "## BEH-QD-783:", "## BEH-QD-9783:"), "BEH-QD-783"), false);
  eq("a new behavior with no pinned-by paragraph fails", pinnedHas((f) => recText(f, "## BEH-QD-783: heading\n\nPinned by", "## BEH-QD-783: heading\n\nNot pinned by"), "BEH-QD-783 names no test file in a Pinned by paragraph"), true);
  for (const n of NEW_BEHAVIORS) {
    eq(`BEH-QD-${n} with no heading fails the close`, closedHas((f) => recText(f, `## BEH-QD-${n}:`, `## BEH-QD-9${n}:`), `BEH-QD-${n} has no heading in spec/behaviors/33-audit-pipeline.md`), true);
    eq(`BEH-QD-${n} with no row in section 1 fails the close`, closedHas((f) => (f.trace = f.trace.replace("BEH-QD-781–785", NEW_BEHAVIORS.filter((m) => m !== n).map((m) => `BEH-QD-${m}`).join(", "))), `BEH-QD-${n} has no row in spec/traceability.md §1`), true);
  }
  for (const n of NEW_INVARIANTS) {
    eq(`INV-QD-${n} with no heading fails`, closedHas((f) => (f.close.invariants = f.close.invariants.replace(`## INV-QD-${n}:`, `## INV-QD-9${n}:`)), `INV-QD-${n} has no heading in spec/invariants.md`), true);
    eq(`INV-QD-${n} with no row fails`, closedHas((f) => (f.trace = f.trace.replace(`| [INV-QD-${n}](a) | d |`, "")), `INV-QD-${n} has no row in spec/traceability.md §2`), true);
    eq(`INV-QD-${n} with a source that does not name the module fails`, closedHas((f) => (f.close.invariants = f.close.invariants.replace(new RegExp(`(## INV-QD-${n}: a\\n\\n\\*\\*Source\\*\\*: )[^\\n]*`), "$1`x`.")), `the **Source**: line of INV-QD-${n} does not name ${HOST}`), true);
  }
  for (const n of RESTATED_INVARIANTS) {
    eq(`INV-QD-${n} whose source does not name the module fails`, closedHas((f) => (f.close.invariants = f.close.invariants.replace(new RegExp(`(## INV-QD-${n}: a\\n\\n\\*\\*Source\\*\\*: )[^\\n]*`), "$1`x`.")), `the **Source**: line of INV-QD-${n} does not name HostBatch.ts`), true);
  }
  eq("the restated behavior without the anchor fails", closedHas((f) => recText(f, "Shows NowRefusalCases, see [a](#beh-qd-781-x).", "Shows NowRefusalCases."), "BEH-QD-722 links no anchor starting #beh-qd-781-"), true);
  eq("the restated behavior without the fragment fails", closedHas((f) => recText(f, "Shows NowRefusalCases, see", "Shows nothing, see"), "BEH-QD-722 does not show NowRefusalCases"), true);
  for (const name of PINNED_NAMES) {
    eq(`the restated behavior's pinned-by paragraph without ${name} fails`, closedHas((f) => recText(f, `\`${name}\` ("W1 a title"; B2)`, "`Other.test.ts` (\"W1 a title\"; B2)"), `the pinned-by paragraph of BEH-QD-722 does not name ${name}`), true);
  }
  for (const n of [253, 254]) {
    eq(`BEH-QD-${n} without the anchor fails`, closedHas((f) => recText(f, `## BEH-QD-${n}: heading\n\nSee [a](#beh-qd-781-x).`, `## BEH-QD-${n}: heading\n\nSee nothing.`), `BEH-QD-${n} links no anchor starting #beh-qd-781-`), true);
  }
  const adr = (from, to) => (f) => (f.close.adr202 = f.close.adr202.replace(from, to));
  eq("a missing decision file fails", closedHas((f) => (f.close.adr202 = undefined), "spec/decisions/202-*.md does not exist"), true);
  eq("a decision file without its document id fails", closedHas(adr("QADI-ADR-202", "none"), "the ADR-QD-202 file does not carry QADI-ADR-202"), true);
  eq("a decision file at another revision fails", closedHas(adr("1.0 ", "1.1 "), "the ADR-QD-202 file is not at Revision 1.0"), true);
  eq("a decision file without the count line fails", closedHas(adr("Tests removed: 6.", "Tests removed: 5."), "the ADR-QD-202 file has no line Tests removed: 6."), true);
  for (const title of REMOVED_TITLES) {
    eq(`an audit table with no row naming "${title}" fails`, closedHas(adr(`| "${title}" | a property | W1 |\n`, ""), `the ADR-QD-202 audit table has no row naming "${title}"`), true);
    eq(`an audit row naming "${title}" that holds no id a title opens fails`, closedHas(adr(`| "${title}" | a property | W1 |`, `| "${title}" | a property | none |`), `the ADR-QD-202 audit row naming "${title}" names no id that opens an audit test title`), true);
  }
  eq("an audit row whose id no title opens fails", closedHas((f) => (f.close.auditTitles = ["B2 row"]), "names no id that opens an audit test title"), true);
  for (const word of ADR_WORDS) {
    eq(`a decision file without ${word} fails`, closedHas((f) => (f.close.adr202 = f.close.adr202.replace(`The step names ${ADR_WORDS.join(", ")}.`, `The step names ${ADR_WORDS.filter((w) => w !== word).join(", ")}.`)), `the ADR-QD-202 file does not name ${word}`), true);
  }
  eq("a decision file without the enforcement section fails", closedHas(adr("## What enforces it", "## Elsewhere"), "the ADR-QD-202 file has no section What enforces it"), true);
  eq("a missing index entry fails", closedHas((f) => (f.close.index = f.close.index.replace('  - id: "ADR-QD-202"\n    file: "202-x.md"\n', "")), "spec/decisions/index.yaml has no ADR-QD-202 entry"), true);
  for (const id of ["ADR-QD-190", "ADR-QD-110"]) {
    eq(`${id} whose index status does not name the new decision fails`, closedHas((f) => (f.close.index = f.close.index.replace(new RegExp(`(id: "${id}"\\n    status: "Accepted; amended \\()ADR-QD-202`), "$1x")), `the ${id} entry of spec/decisions/index.yaml does not name ADR-QD-202 in its status`), true);
  }
  eq("ADR-QD-190 that does not name the decision fails", closedHas((f) => (f.close.adr190 = "## Fourth amendment\n"), "ADR-QD-190 does not name ADR-QD-202"), true);
  eq("ADR-QD-190 with no fourth amendment fails", closedHas((f) => (f.close.adr190 = "ADR-QD-202 is named.\n"), "ADR-QD-190 has no Fourth amendment heading"), true);
  eq("ADR-QD-110 that does not name the decision fails", closedHas((f) => (f.close.adr110 = "x\n"), "ADR-QD-110 does not name ADR-QD-202"), true);
  eq("a missing section 3 row fails", closedHas((f) => (f.trace = f.trace.replace("| [ADR-QD-202](a) | t |", "")), "ADR-QD-202 has no row in spec/traceability.md §3"), true);
  for (const path of TRACE_PATHS) {
    eq(`a missing row naming ${path} fails`, closedHas((f) => (f.trace = f.trace.replaceAll(path, "x")), `spec/traceability.md has no row naming ${path}`), true);
  }
  eq("a missing CCR row fails", closedHas((f) => (f.close.readme = ""), "spec/README.md has no CCR-QD-481 row"), true);
  eq("a CCR row that does not name the item fails", closedHas((f) => (f.close.readme = f.close.readme.replace("ARCH-136", "x")), "the CCR-QD-481 row does not name ARCH-136"), true);
  eq("a CCR row that does not say unused none fails", closedHas((f) => (f.close.readme = f.close.readme.replace("Unused: none", "none")), "the CCR-QD-481 row does not say Unused: none"), true);
  eq("a revision equal to its base fails", closedHas((f) => (f.close.revised[0].now = f.close.revised[0].base), "spec/README.md is at Revision 1.4, not 1.5"), true);
  eq("a revision two above its base fails", closedHas((f) => (f.close.revised[3].now = f.close.revised[3].now.replace("1.5", "1.6")), `${BEHAVIORS} is at Revision 1.6, not 1.5`), true);
  eq("a document with no revision fails", closedHas((f) => (f.close.revised[4].now = "x"), "has no Revision"), true);
  eq("each of the six revised documents is judged", closedHas((f) => f.close.revised.forEach((r) => (r.now = r.base)), "spec/decisions/110-an-archives-facts-are-computed-once.md is at Revision 1.4, not 1.5"), true);
  eq("the revision is read from the control table", revisionOf("> | Revision       | 1.413     |\n"), { major: 1, minor: 413, text: "1.413" });
  eq("a second changeset fails", closedHas((f) => f.close.changesets.push({ file: ".changeset/b.md", text: "x" }), "2 changesets are added since phase_base, not one"), true);
  eq("no changeset fails", closedHas((f) => (f.close.changesets = []), "0 changesets are added since phase_base, not one"), true);
  eq("a changeset under another name fails", closedHas((f) => (f.close.changesets[0].file = ".changeset/other.md"), `.changeset/other.md is not ${CHANGESET}`), true);
  eq("a changeset that is not a patch fails", closedHas((f) => (f.close.changesets[0].text = f.close.changesets[0].text.replace("patch", "minor")), "is not a patch changeset for @qadi/audit alone"), true);
  eq("a changeset for another package fails", closedHas((f) => (f.close.changesets[0].text = f.close.changesets[0].text.replace("@qadi/audit", "@qadi/core")), "is not a patch changeset for @qadi/audit alone"), true);
  for (const sentence of CHANGESET_SENTENCES) {
    eq(`a changeset without "${sentence}" fails`, closedHas((f) => (f.close.changesets[0].text = f.close.changesets[0].text.replace(sentence, "x")), `does not hold: ${sentence}`), true);
  }
  eq("a changeset wrapped over lines still holds its sentences", closedHas((f) => (f.close.changesets[0].text = f.close.changesets[0].text.replaceAll(" ", "\n")), "does not hold"), false);

  const diff = "diff --git a/x.ts b/x.ts\n--- a/x.ts\n+++ b/x.ts\n@@ -3,1 +3,2 @@\n-old\n+new\n+newer\n@@ -9,0 +11 @@\n+late\ndiff --git a/gone.ts b/gone.ts\n--- a/gone.ts\n+++ /dev/null\n@@ -1 +0,0 @@\n-x\n";
  const parsed = parseDiff(diff);
  eq("a diff's added lines are numbered in the new file", [[...parsed.get("x.ts")], parsed.has("gone.ts")], [[3, 4, 11], false]);

  console.log(`self-test: ${passed} passed`);
};

const [mode, ...args] = process.argv.slice(2);
// Run as a script, not when a judge is imported from another file.
if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (mode === undefined || !Object.hasOwn(MODES, mode)) fail([`usage: node 89-check.mjs ${Object.keys(MODES).join("|")}`]);
  else MODES[mode](args);
}
