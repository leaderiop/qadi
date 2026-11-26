// The phase's shared check, run from the repository root as `node <this file> <mode> [args]`. Each mode is a pure
// judge over text plus a thin reader that gathers the text from git or the tree; a failure prints its reasons to stderr
// and exits 1. Modes:
//   base                                     prints phase_base, after checking it is the recorded constant and an ancestor of HEAD
//   commit [--first] "<subject>" <path>...   exactly one commit since phase_base has this subject and exactly these paths;
//                                            --first also needs it to be the first plan commit, every commit before it
//                                            changing only `.planning/`
//   unchanged <path>...                      the tree matches phase_base on these paths and none is untracked
//   seen-failing <test-file> [<title>...]    each title has a failure line in the evidence file
//   scan-ids                                 added lines (tree against phase_base, .planning excluded) name no id or phase
//   scan-forbidden                           added source and test lines use none of the forbidden forms, and no budget file moved
//   trailers [--message <file>]              every plan commit since phase_base has exactly one trailer, the owner's;
//                                            --message judges one message text instead, so the mode fails without a commit
//   no-react-in-model                        the hydration view imports only effect/Data and its sibling, holds only types,
//                                            its two enum constants and function declarations, and no model file imports React
//   three-predicates                         the three unsampled predicates stay distinct: the questions guard, one shared
//                                            reader for services and hydration, and the hydration store keyed by identity
//   panel-decides-nothing                    the questions panel imports no status predicate or activity helper, holds no
//                                            rate, plural or drop arithmetic, and renders the view through one exhaustive match
//   frame-reads-status                       the dock frame reads the poll's status alone, through one named hook
//   records [--close]                        the pinned-by lists name tests that exist; --close also needs every reserved
//                                            record written
//   --self-test                              drives every judge with planted text
// Shortcuts: the comment and string blanking does not understand regex literals, `any` is read by the token before it,
// and a module-scope string literal is read by brace and parenthesis depth, a line holding `=>` taken as a function body
// and a type declaration skipped, so a literal inside a module-scope object literal is left to the mutation compare; a
// false positive is cleared by rewording the line, never by weakening a judge. The phase modes read source text with
// comments and strings blanked and match its shapes by pattern, so a reworded declaration that keeps the same meaning
// can need the pattern widened; that is a reviewed edit to this file, never a reason to skip the mode. A module-scope
// function declaration is taken to end at the next line that is a lone closing brace in column zero, and a statement
// whose block body is also its return type's literal is read wrongly: reword the declaration.
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, realpathSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

/** This script's own directory, relative to the repository root, with a trailing slash. */
const D = `${relative(process.cwd(), dirname(fileURLToPath(import.meta.url)))}/`;
const EVIDENCE = `${D}85-RED-EVIDENCE.md`;
const SUMMARY = `${D}85-01-SUMMARY.md`;
/** The one trailer every plan commit ends with: the project owner's line, and no other Claude name is accepted. */
const TRAILER = "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>";
const PLAN_SUBJECT = /^[a-z]+[(]85-[0-9]{2}[)]!?: /;
const GUARDED = ["AGENTS.md", "scripts/check-house-style.mjs", ".oxlintrc.json"];
/** HEAD at the start of planning, fixed: every comparison with the base reads this commit. */
const PHASE_BASE = "2741584f50d176281038b478d0350dc35f174cc2";

const fail = (lines) => {
  console.error(lines.join("\n"));
  process.exit(1);
};
const git = (...args) => execFileSync("git", args, { encoding: "utf8", maxBuffer: 1 << 28 });
const sorted = (xs) => [...xs].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
const scratch = () => join(realpathSync(process.env.TMPDIR || "/tmp"), "qd85");

/** phase_base from the scratch record, else from the summary's `phase_base:` line; undefined when neither holds one. */
export const phaseBaseOf = (scratchText, summaryText) => {
  const hex = /^[0-9a-f]{40}$/;
  if (scratchText !== undefined && hex.test(scratchText.trim())) return scratchText.trim();
  const m = /^phase_base: ([0-9a-f]{40})$/m.exec(summaryText ?? "");
  return m === null ? undefined : m[1];
};
/** Reasons the recorded phase_base is not the fixed one, or is not an ancestor of HEAD. */
export const judgeBase = (recorded, isAncestor) => {
  if (recorded !== PHASE_BASE) return [`phase_base is not ${PHASE_BASE}`];
  return isAncestor ? [] : ["phase_base is not an ancestor of HEAD"];
};
const readBase = () => {
  const file = join(scratch(), "phase_base");
  const base = phaseBaseOf(existsSync(file) ? readFileSync(file, "utf8") : undefined, existsSync(SUMMARY) ? readFileSync(SUMMARY, "utf8") : undefined);
  if (base === undefined) fail(["phase_base is not recorded"]);
  const ancestor = (() => {
    try {
      git("merge-base", "--is-ancestor", base, "HEAD");
      return true;
    } catch {
      return false;
    }
  })();
  const bad = judgeBase(base, ancestor);
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
 * Reasons the commit asked for is not the one commit with `subject` and exactly `paths`. `commits` are in order.
 * With `first` it must also be the first plan commit since phase_base, and each commit before it, the planning
 * commits between the base and the execution start, may change only paths under `.planning/`.
 */
export const judgeCommit = (commits, subject, paths, first) => {
  const hits = commits.filter((c) => c.subject === subject);
  if (hits.length !== 1) return [`${hits.length} commits since phase_base have the subject: ${subject}`];
  const [c] = hits;
  const bad = [];
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
    const m = /^- (?:failed|failed [(][\w-]+[)]|red on the base): (.*)$/.exec(line);
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
  [/(?<![\w.-])85-\d{2}(?!\d)/, "a plan id"],
  [/\bHYDV-0\d\b/, "a requirement id"],
  [/\bWX-0\d\b/, "a requirement id"],
  [/(?<!(?:ADR|CCR|BEH|INV|ARCH)-)\bQD-85\b/, "a phase id"],
  [/\b[Pp]hase 85\b/, "a phase number"],
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
        if (entry.file.startsWith("packages/devtools/src/") && depth[n - 1] === 0 && parens[n - 1] === 0 && /["'`]/.test(line) && !covered.has(n) && !line.includes("=>") && !/^\s*(?:export\s+)?(?:type|interface|declare)\b/.test(line) && raw[n - 1] !== '"use client";') note("a module-scope string literal");
      }
      for (const [re, what] of EVERYWHERE) if (re.test(line)) note(what);
      if (/\bas\s+(?!const\b)/.test(line) && !covered.has(n)) note("an as cast");
    }
  }
  return bad;
};

/** Reasons a guard file moved from its text at phase_base: no budget, rule or house-style table moves in this phase. */
export const judgeGuards = (guards) =>
  guards.filter(({ base, current }) => current !== base).map(({ file }) => `${file} differs from phase_base: no budget moves`);

const lineAt = (code, index) => code.slice(0, index).split("\n").length;
const MODEL_DIR = "packages/devtools/src/model/";
const REACT_DIR = "packages/devtools/src/react/";
const VIEW_FILE = `${MODEL_DIR}HydrationView.ts`;
const DOCK_MODEL = `${MODEL_DIR}DockModel.ts`;
const PANEL = `${REACT_DIR}QuestionsPanel.tsx`;
const DOCK = `${REACT_DIR}DevtoolsDock.tsx`;
const SNAPSHOT_HOOK = `${REACT_DIR}useStoreSnapshot.ts`;
const BEHAVIORS = "spec/behaviors/28-devtools-screens.md";

/** The index of the bracket closing the one at `open` in blanked `code`, or -1. Every bracket kind counts the same. */
const closeOf = (code, open) => {
  let depth = 0;
  for (let i = open; i < code.length; i++) {
    const c = code[i];
    if ("([{".includes(c)) depth++;
    else if (")]}".includes(c)) {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
};

/** The top-level comma-separated parts of `text`; `<` and `>` nest, a `>` of `=>` does not close. A comparison is not handled. */
export const splitTop = (text) => {
  const parts = [];
  let depth = 0;
  let from = 0;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if ("([{<".includes(c)) depth++;
    else if (")]}".includes(c) || (c === ">" && text[i - 1] !== "=")) depth--;
    else if (c === "," && depth === 0) {
      parts.push(text.slice(from, i));
      from = i + 1;
    }
  }
  parts.push(text.slice(from));
  return parts.map((p) => p.trim()).filter((p) => p !== "");
};

/** Every call of `name(...)` in blanked `code` that is not its declaration, as `{ index, line, args }`. */
export const callsOf = (code, name) =>
  [...code.matchAll(new RegExp(`(?<![.\\w$])${name}\\s*(?:<[^()]*>)?\\s*\\(`, "g"))]
    .filter((m) => !/\bfunction\s+$/.test(code.slice(0, m.index)))
    .map((m) => {
      const open = m.index + m[0].length - 1;
      return { index: m.index, line: lineAt(code, m.index), args: splitTop(code.slice(open + 1, closeOf(code, open))) };
    });

/** The body of the object-literal method `name: (...) => ...` of `code`, as text, or undefined. */
const methodBody = (code, name) => {
  const m = new RegExp(`\\b${name}\\s*:\\s*\\(`).exec(code);
  if (m === null) return undefined;
  const close = closeOf(code, m.index + m[0].length - 1);
  const arrow = close < 0 ? null : /^\s*(?::[^={]*)?=>\s*/.exec(code.slice(close + 1));
  if (arrow === null) return undefined;
  const start = close + 1 + arrow[0].length;
  if (code[start] === "{") return code.slice(start, closeOf(code, start) + 1);
  let depth = 0;
  for (let i = start; i < code.length; i++) {
    const c = code[i];
    if ("([{".includes(c)) depth++;
    else if (")]}".includes(c)) {
      if (depth === 0) return code.slice(start, i);
      depth--;
    } else if (c === "," && depth === 0) return code.slice(start, i);
  }
  return code.slice(start);
};

/** The body of the `function name(...) { ... }` declaration in blanked `code`, braces included, or undefined. */
const functionBody = (code, name) => {
  const m = new RegExp(`\\bfunction\\s+${name}\\b\\s*`).exec(code);
  if (m === null) return undefined;
  const params = code.indexOf("(", m.index + m[0].length - 1);
  const close = params < 0 ? -1 : closeOf(code, params);
  const open = close < 0 ? -1 : code.indexOf("{", close);
  return open < 0 ? undefined : code.slice(open, closeOf(code, open) + 1);
};

/**
 * Each import and `export … from` statement of comment-free text (strings kept), as `{ spec, names, line }`. A name is
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
    out.push({ spec: m[3] ?? m[5], names: [...inside, ...rest].filter((s) => s !== ""), line: lineAt(text, m.index) });
  }
  return out;
};

const BLOCK_HEAD = /^(?:export\s+)?(?:default\s+)?(?:declare\s+)?(?:async\s+)?(?:function|interface|class|enum|namespace)\b/;
/**
 * The statements at module scope of blanked `code`, as `{ text, line }`. A statement ends at a `;` outside every
 * bracket, or, for a function, interface, class or enum, at the brace that closes its body.
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

/** What kind of module-scope statement `text` is: an import, a type, a function, a Data.taggedEnum constant, or other. */
const kindOf = (text) => {
  const t = text.replace(/\s+/g, " ").trim();
  if (/^import\b/.test(t)) return "import";
  const h = t.replace(/^export (?:default )?/, "");
  if (/^(?:declare |type |interface )/.test(h)) return "type";
  if (/^(?:async )?function\b/.test(h)) return "function";
  if (/^const \w+ = Data\.taggedEnum ?<.*> ?\( ?\);?$/.test(h)) return "enum";
  return "other";
};

const REACT_SPEC = /^(?:react|react-dom|@effect\/atom-react|@qadi\/react)(?:\/|$)|(?:^|\/)react\/|\.tsx$/;
const VIEW_IMPORTS = ["effect/Data", "./Hydration.ts"];

/**
 * Reasons the hydration view is not a pure, React-free model module. `view` is the text of `HydrationView.ts` or
 * undefined; `model` is `{ file, text }` for every file under `packages/devtools/src/model`.
 */
export const judgeNoReactInModel = ({ view, model }) => {
  const bad = [];
  for (const { file, text } of model) {
    for (const { spec, line } of importsOf(blank(text, true))) if (REACT_SPEC.test(spec)) bad.push(`${file}:${line} imports ${spec}: the model imports no React`);
  }
  if (view === undefined) return [...bad, `${VIEW_FILE} does not exist`];
  for (const { spec, line } of importsOf(blank(view, true))) {
    if (!VIEW_IMPORTS.includes(spec)) bad.push(`${VIEW_FILE}:${line} imports ${spec}, not only ${VIEW_IMPORTS.join(" and ")}`);
  }
  const code = blank(view);
  if (!/^export\s+function\s+hydrationView\b/m.test(code)) bad.push(`${VIEW_FILE} does not export hydrationView as a function declaration`);
  let enums = 0;
  for (const { text, line } of topLevel(code)) {
    const kind = kindOf(text);
    if (kind === "enum") enums++;
    if (kind === "other") bad.push(`${VIEW_FILE}:${line} holds a module-scope statement that is not an import, a type, a Data.taggedEnum constant or a function declaration: ${text.replace(/\s+/g, " ").trim().slice(0, 60)}`);
  }
  if (enums !== 2) bad.push(`${VIEW_FILE} holds ${enums} Data.taggedEnum constants, not two`);
  return bad;
};

const GUARD = /\bsupplied\s*===\s*undefined\s*&&\s*isUnsampled\s*\(/g;
/** The module-scope function declarations of blanked `code`: `{ name, start, end }`, each ending at the next lone `}`. */
const moduleFunctions = (code) =>
  [...code.matchAll(/^(?:export\s+)?function\s*\*?\s*([A-Za-z_$][\w$]*)/gm)].map((m) => {
    const end = code.indexOf("\n}", m.index);
    return { name: m[1], start: m.index, end: end < 0 ? code.length : end + 2 };
  });
/** Each `makeDerivedStore({ ... })` call of blanked `code`: its parents, its key body and its compute text. */
const storesOf = (code) =>
  callsOf(code, "makeDerivedStore").map(({ line, args }) => {
    const arg = args[0] ?? "";
    const parents = /\bparents\s*:\s*\[([^\]]*)\]/.exec(arg);
    return {
      line,
      parents: parents === null ? undefined : splitTop(parents[1]),
      key: methodBody(arg, "key"),
      compute: /\bcompute\s*:\s*([^,}]+)/.exec(arg)?.[1].trim(),
    };
  });

/**
 * Reasons the three unsampled predicates are not kept distinct. `model` is the text of `DockModel.ts`, `view` that of
 * `HydrationView.ts` or undefined. The questions key keeps its guard (a supplied list is not a statement about the
 * poll), the services key and the hydration key read one module-scope function that calls `isUnsampled` once, and the
 * hydration store is keyed by `reading.hydration` read as it is, never copied; the view tests the field first.
 */
export const judgeThreePredicates = ({ model, view }) => {
  const bad = [];
  const code = blank(model);
  const guards = [...code.matchAll(GUARD)];
  if (guards.length !== 1) bad.push(`${DOCK_MODEL}: the questions guard "supplied === undefined && isUnsampled(" appears ${guards.length} times, not once`);
  const calls = callsOf(code, "isUnsampled");
  if (calls.length !== 2) bad.push(`${DOCK_MODEL}: isUnsampled( is called ${calls.length} times, not twice`);
  const outside = calls.filter((c) => !guards.some((g) => c.index >= g.index && c.index < g.index + g[0].length));
  const shared = outside.map((c) => moduleFunctions(code).find((f) => c.index >= f.start && c.index < f.end));
  for (const [i, fn] of shared.entries()) {
    if (fn === undefined) bad.push(`${DOCK_MODEL}:${outside[i].line} calls isUnsampled outside the guard and outside a module-scope function declaration`);
  }
  const reader = shared.find((f) => f !== undefined)?.name;
  const stores = storesOf(code);
  const readers = (computeName, label) => {
    const hits = stores.filter((s) => s.compute === computeName);
    if (hits.length !== 1) {
      bad.push(`${DOCK_MODEL}: ${hits.length} derived stores are computed by ${computeName}, not one (the ${label} store)`);
      return undefined;
    }
    if (hits[0].key === undefined) bad.push(`${DOCK_MODEL}:${hits[0].line} the ${label} store has no readable key`);
    else if (reader === undefined || !new RegExp(`\\b${reader}\\s*\\(`).test(hits[0].key)) bad.push(`${DOCK_MODEL}:${hits[0].line} the ${label} key does not call the shared reader${reader === undefined ? "" : ` ${reader}`}`);
    return hits[0];
  };
  readers("portCards", "services");
  const hydration = readers("hydrationView", "hydration");
  if (hydration !== undefined) {
    if (hydration.parents === undefined || hydration.parents.join(",") !== "shownReading") bad.push(`${DOCK_MODEL}:${hydration.line} the hydration store's parents are not [shownReading]`);
    if (hydration.key !== undefined && !/\breading\.hydration\b/.test(hydration.key)) bad.push(`${DOCK_MODEL}:${hydration.line} the hydration key does not read reading.hydration`);
    if (hydration.key !== undefined && /\.\.\./.test(hydration.key)) bad.push(`${DOCK_MODEL}:${hydration.line} the hydration key spreads: its fields are read by reference`);
  }
  if (view === undefined) return [...bad, `${VIEW_FILE} does not exist`];
  const body = functionBody(blank(view), "hydrationView");
  if (body === undefined) return [...bad, `${VIEW_FILE} has no readable hydrationView`];
  const field = body.search(/\bhydration\b/);
  const flag = body.search(/\bunsampled\b/);
  if (field < 0 || flag < 0) bad.push(`${VIEW_FILE}: hydrationView does not name both the hydration field and unsampled`);
  else if (field > flag) bad.push(`${VIEW_FILE}: hydrationView tests unsampled before the hydration field`);
  return bad;
};

const PANEL_FORBIDDEN_NAMES = ["isUnsampled", "unaccountedEntries", "HydrationActivity"];
const PANEL_TOKENS = [
  [/\brechecked\s*(?:[<>]=?|[=!]==?)/, "a rate rule on rechecked"],
  [/\bcount\s*(?:[<>]=?|[=!]==?)\s*0\b/, "a drop-filter rule on count"],
  [/\bdrops\.length\b/, "a watched-count read of drops.length"],
  [/\bunaccounted\w*/, "the unaccounted-entries arithmetic"],
  [/[=!]==?\s*1\s*[?]/, "a plural rule"],
];
/** Reasons the questions panel decides something about the hydration block. `panel` is the text of `QuestionsPanel.tsx`. */
export const judgePanelDecidesNothing = (panel) => {
  const bad = [];
  for (const { names, spec, line } of importsOf(blank(panel, true))) {
    for (const name of names) if (PANEL_FORBIDDEN_NAMES.includes(name)) bad.push(`${PANEL}:${line} imports ${name} from ${spec}`);
  }
  const code = blank(panel);
  code.split("\n").forEach((text, i) => {
    // An import line is judged by the names it binds, above.
    if (/^\s*import\b/.test(text)) return;
    for (const [re, what] of PANEL_TOKENS) if (re.test(text)) bad.push(`${PANEL}:${i + 1} holds ${what}: ${text.trim()}`);
    if (/\bdrops?\b/.test(text) && /\.filter\s*\(/.test(text)) bad.push(`${PANEL}:${i + 1} holds a drop filter: ${text.trim()}`);
  });
  const dispatch = /^(?:export\s+)?const\s+\w+\b[^;]*?=\s*Match\.type\s*<\s*HydrationView\s*>\s*\(\s*\)/m.exec(code);
  if (dispatch === null) bad.push(`${PANEL} has no module-scope Match.type<HydrationView>()`);
  else {
    const at = dispatch.index + dispatch[0].length;
    const pipe = /^\s*\.pipe\s*\(/.exec(code.slice(at));
    const close = pipe === null ? -1 : closeOf(code, at + pipe[0].length - 1);
    if (close < 0 || !/\bMatch\.tagsExhaustive\b/.test(code.slice(at, close))) bad.push(`${PANEL}:${lineAt(code, dispatch.index)} Match.type<HydrationView>() is not finished by Match.tagsExhaustive`);
  }
  if (!callsOf(code, "useStoreSnapshot").some((c) => /hydration/i.test(c.args[0] ?? ""))) bad.push(`${PANEL} does not read its hydration store through useStoreSnapshot`);
  return bad;
};

/**
 * Reasons the dock frame reads more than the poll's status. `react` is `{ file, text }` for every file under
 * `packages/devtools/src/react`: the dock frame calls `useDiagnosticsStatus(model.diagnostics)` once and never
 * subscribes to the whole snapshot, `Screen` has no `shown` prop and nothing imports `Diagnostics`, the questions tab
 * passes the model's hydration store, the hook is `useStoreSnapshot` over a derived `getSnapshot` reading `.status`,
 * and the folder calls `useSyncExternalStore` once.
 */
export const judgeFrameReadsStatus = (react) => {
  const bad = [];
  const dockText = react.find((f) => f.file === DOCK)?.text;
  if (dockText === undefined) bad.push(`${DOCK} is not found`);
  else {
    const code = blank(dockText);
    const status = callsOf(code, "useDiagnosticsStatus");
    if (status.length !== 1) bad.push(`${DOCK} calls useDiagnosticsStatus ${status.length} times, not once`);
    else if (status[0].args.join(",") !== "model.diagnostics") bad.push(`${DOCK}:${status[0].line} useDiagnosticsStatus is not called with model.diagnostics`);
    for (const c of callsOf(code, "useStoreSnapshot")) {
      if (/(?:^|\.)diagnostics$/.test(c.args[0] ?? "")) bad.push(`${DOCK}:${c.line} subscribes to the whole diagnostics snapshot`);
    }
    for (const m of code.matchAll(/\bshown\b/g)) bad.push(`${DOCK}:${lineAt(code, m.index)} still names shown`);
    for (const { names, line } of importsOf(blank(dockText, true))) if (names.includes("Diagnostics")) bad.push(`${DOCK}:${line} still imports Diagnostics`);
    if (!/\bhydration\s*=\s*\{\s*props\.model\.hydration\s*\}/.test(code)) bad.push(`${DOCK} does not pass hydration={props.model.hydration} to the questions tab`);
  }
  const hook = react.find((f) => f.file === SNAPSHOT_HOOK)?.text;
  if (hook === undefined) bad.push(`${SNAPSHOT_HOOK} is not found`);
  else {
    const code = blank(hook);
    const at = code.search(/\bexport\s+const\s+useDiagnosticsStatus\b/);
    if (at < 0) bad.push(`${SNAPSHOT_HOOK} does not declare useDiagnosticsStatus`);
    else {
      const rest = code.slice(at + 1);
      const next = rest.search(/\nexport\s/);
      const region = next < 0 ? rest : rest.slice(0, next);
      const reads = callsOf(region, "useStoreSnapshot");
      if (reads.length !== 1) bad.push(`${SNAPSHOT_HOOK}: useDiagnosticsStatus calls useStoreSnapshot ${reads.length} times, not once`);
      else if (!/\bgetSnapshot\s*:\s*\(\s*\)\s*=>[^,}]*\.status\b/.test(reads[0].args[0] ?? "")) bad.push(`${SNAPSHOT_HOOK}: useDiagnosticsStatus does not derive getSnapshot from .status`);
    }
  }
  let syncs = 0;
  for (const { file, text } of react) {
    const code = blank(text);
    for (const m of code.matchAll(/\buseSyncExternalStore\s*\(/g)) {
      syncs++;
      if (file !== SNAPSHOT_HOOK) bad.push(`${file}:${lineAt(code, m.index)} calls useSyncExternalStore outside useStoreSnapshot.ts`);
    }
  }
  if (syncs !== 1) bad.push(`src/react calls useSyncExternalStore ${syncs} times, not once`);
  return bad;
};

const collapse = (s) => s.replace(/\s+/g, " ").trim();
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

/** The behaviors whose pinned-by paragraph `records` reads; the first four exist today and must stay. */
const PINNED = [699, 700, 735, 742, 761, 762, 763, 764, 765];
const PINNED_KEPT = [699, 700, 735, 742];
/** The behaviors, the invariants and the decision the phase reserved. */
const NEW_BEHAVIORS = [761, 762, 763, 764, 765];
const NEW_INVARIANTS = [415, 416];

/** Reasons a behavior's pinned-by paragraph names a test file or a title that does not exist. `tests(path)` reads a file. */
const judgePinned = (behaviors, n, tests) => {
  const section = sectionOf(behaviors, `BEH-QD-${n}:`);
  if (section === undefined) return PINNED_KEPT.includes(n) ? [`BEH-QD-${n} has no heading in ${BEHAVIORS}`] : [];
  const para = /Pinned by[\s\S]*?(?:\n\s*\n|$)/.exec(section)?.[0] ?? "";
  const paths = [...para.matchAll(/`(packages\/[^`\s]+\.(?:tsx?|mts))`/g)];
  const bad = paths.length === 0 ? [`BEH-QD-${n} names no test file in a Pinned by paragraph`] : [];
  paths.forEach((p, i) => {
    const file = p[1];
    const text = tests(file);
    if (text === undefined) {
      bad.push(`BEH-QD-${n} names ${file}, which does not exist`);
      return;
    }
    const titles = pinTitlesOf(text).map(collapse);
    const seg = para.slice(p.index + p[0].length, paths[i + 1]?.index ?? para.length);
    for (const q of seg.matchAll(/"((?:[^"\\]|\\.)*)"/g)) {
      if (!titles.includes(collapse(q[1]))) bad.push(`BEH-QD-${n} quotes "${collapse(q[1])}" for ${file}, which holds no such test`);
    }
    for (const r of seg.matchAll(/[(;]\s*([A-Z]{1,3}[0-9]+)(?![\w-])/g)) {
      if (!titles.some((t) => t.startsWith(r[1]) && !/[A-Za-z0-9]/.test(t[r[1].length] ?? ""))) bad.push(`BEH-QD-${n} names row ${r[1]} for ${file}, which no title opens`);
    }
  });
  return bad;
};

/** Reasons the records written at the close are missing or wrong. `close` is `{ invariants, decisions, index, readme }`. */
const judgeClosed = ({ trace, behaviors }, close) => {
  const bad = [];
  const one = sectionOf(trace, "§1 ") ?? "";
  for (const n of NEW_BEHAVIORS) {
    if (sectionOf(behaviors, `BEH-QD-${n}:`) === undefined) bad.push(`BEH-QD-${n} has no heading in ${BEHAVIORS}`);
    if (!covers(one, n)) bad.push(`BEH-QD-${n} has no row in spec/traceability.md §1`);
  }
  const two = sectionOf(trace, "§2 ") ?? "";
  for (const n of NEW_INVARIANTS) {
    if (!new RegExp(`^## INV-QD-${n}:`, "m").test(close.invariants)) bad.push(`INV-QD-${n} has no heading in spec/invariants.md`);
    if (!new RegExp(`^\\| \\[INV-QD-${n}\\]`, "m").test(two)) bad.push(`INV-QD-${n} has no row in spec/traceability.md §2`);
  }
  const adr = close.decisions.find((d) => /(?:^|\/)198-[^/]*[.]md$/.test(d.file));
  if (adr === undefined) bad.push("spec/decisions/198-*.md does not exist");
  else if (!adr.text.includes("QADI-ADR-198")) bad.push("the ADR-QD-198 file does not carry QADI-ADR-198");
  if (!/^\s*-\s*id:\s*"ADR-QD-198"/m.test(close.index)) bad.push("spec/decisions/index.yaml has no ADR-QD-198 entry");
  if (!/^\| \[ADR-QD-198\]/m.test(sectionOf(trace, "§3 ") ?? "")) bad.push("ADR-QD-198 has no row in spec/traceability.md §3");
  const ccr = /^\| CCR-QD-477 \|.*$/m.exec(close.readme);
  if (ccr === null) bad.push("spec/README.md has no CCR-QD-477 row");
  else if (!ccr[0].includes("ARCH-132")) bad.push("the CCR-QD-477 row does not name ARCH-132");
  const heading = new RegExp("^## BEH-QD-699: .*$", "m").exec(behaviors)?.[0] ?? "";
  if (!/\bfive\b/.test(heading) || /\bfour\b/.test(heading)) bad.push("BEH-QD-699's heading does not say five computed stores");
  if (!(sectionOf(behaviors, "BEH-QD-700:") ?? "").includes("`hydration`")) bad.push("BEH-QD-700 does not name `hydration`");
  const empties = (sectionOf(behaviors, "BEH-QD-218:") ?? "").split("\n").filter((l) => l.startsWith("|"));
  if (!empties.some((l) => /hydration/i.test(l.split("|")[1] ?? ""))) bad.push("BEH-QD-218's table has no hydration row");
  return bad;
};

/**
 * Reasons the records name tests that do not exist, and with `close` every reserved record is not written. `trace` and
 * `behaviors` are the texts of `spec/traceability.md` and `spec/behaviors/28-devtools-screens.md`; `tests(path)` is a test
 * file's text or undefined; `close` is undefined or `{ invariants, decisions: [{ file, text }], index, readme }`.
 */
export const judgeRecords = ({ trace, behaviors, tests }, close) => {
  const bad = PINNED.flatMap((n) => judgePinned(behaviors, n, tests));
  return close === undefined ? bad : [...bad, ...judgeClosed({ trace, behaviors }, close)];
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

const readText = (file) => readFileSync(file, "utf8");
const modelFiles = () => trackedFiles(MODEL_DIR, /[.]tsx?$/).map(textOf);
const reactFiles = () => trackedFiles(REACT_DIR, /[.]tsx?$/).map(textOf);

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
    const plan = commitsSince(readBase()).filter((c) => PLAN_SUBJECT.test(c.subject));
    const bad = plan.flatMap((c) => judgeTrailer(c.message).map((r) => `${c.sha.slice(0, 8)} ${c.subject}: ${r}`));
    if (plan.length === 0) bad.push("no plan commit since phase_base");
    return done(bad, `trailers: ${plan.length} plan commits, each with the one trailer`);
  },
  "no-react-in-model": () => {
    const view = existsSync(VIEW_FILE) ? readText(VIEW_FILE) : undefined;
    return done(judgeNoReactInModel({ view, model: modelFiles() }), "no-react-in-model: the hydration view is pure, and no model file imports React");
  },
  "three-predicates": () => {
    const view = existsSync(VIEW_FILE) ? readText(VIEW_FILE) : undefined;
    return done(judgeThreePredicates({ model: readText(DOCK_MODEL), view }), "three-predicates: the questions guard, the one shared reader and the hydration key stay distinct");
  },
  "panel-decides-nothing": () => done(judgePanelDecidesNothing(readText(PANEL)), "panel-decides-nothing: the panel renders the hydration view and decides nothing"),
  "frame-reads-status": () => done(judgeFrameReadsStatus(reactFiles()), "frame-reads-status: the dock frame reads the poll's status alone"),
  records: (args) => {
    const close = args[0] === "--close";
    if (args.length > 0 && !close) return fail(["usage: records [--close]"]);
    const tests = (path) => (existsSync(path) ? readText(path) : undefined);
    const extra = close
      ? {
          invariants: readText("spec/invariants.md"),
          decisions: readdirSync("spec/decisions").filter((f) => /^\d+-.*[.]md$/.test(f)).map((f) => ({ file: f, text: readText(`spec/decisions/${f}`) })),
          index: readText("spec/decisions/index.yaml"),
          readme: readText("spec/README.md"),
        }
      : undefined;
    const ok = "records: the pinned-by lists name tests that exist";
    return done(judgeRecords({ trace: readText("spec/traceability.md"), behaviors: readText(BEHAVIORS), tests }, extra), close ? `${ok}, and every reserved record is written` : ok);
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
  const evidence = "- failed: plain\n- failed (reason): on the next line\n- red on the base: single\n- failed:not this\n";
  eq("evidence in each form names its title", judgeSeenFailing(suite, evidence, ["plain", "on the next line", "single"]), []);
  eq("a title with no line fails", judgeSeenFailing(suite, evidence, ["tpl"]).length, 1);
  eq("with no title asked, every title is asked", judgeSeenFailing(suite, evidence, []).length, 3);
  eq("a file with no title fails", judgeSeenFailing("x", evidence, []).length, 1);
  eq("a title compared exactly fails on a prefix", judgeSeenFailing('it("pla", () => {});', evidence, []).length, 1);

  const idEntry = (file, line, text = line) => ({ file, text, added: new Set([1]) });
  for (const line of ["// D-49 says", "see 85-03", "HYDV-02 holds", "WX-05", "QD-85 closes", "Phase 85 added", "phase 85", "ADR-QD-NEXT", "x BEH-QD-NEXT y"]) {
    eq(`${line} is flagged`, judgeIds([idEntry("packages/devtools/src/a.ts", line)]).length, 1);
  }
  for (const line of ["ADR-QD-198", "INV-QD-415", "BEH-QD-761", "D-49-a", "CCR-QD-477", "ARCH-132", "ADR-QD-85", "a 1285-03x", "x185-03"]) {
    eq(`${line} is not flagged`, judgeIds([idEntry("packages/devtools/src/a.ts", line)]), []);
  }
  for (const line of ["this phase", "Until Now", "any more", "no longer", "from now on"]) {
    eq(`${line} is flagged in source`, judgeIds([idEntry("packages/devtools/src/a.ts", line)]).length, 1);
  }
  eq("a changeset may say no longer", judgeIds([idEntry(".changeset/a.md", "no longer")]), []);
  eq("the upgrade guide may say no longer", judgeIds([idEntry("apps/website/src/content/docs/docs/reference/upgrading.md", "no longer")]), []);
  eq("a changeset is still scanned for ids", judgeIds([idEntry(".changeset/a.md", "HYDV-01")]).length, 1);
  const spec = "# Title\nno longer here\n## Change History\n| 1 | no longer a row |\n";
  eq("a phrase before the change history is flagged", judgeIds([{ file: "spec/a.md", text: spec, added: new Set([2]) }]).length, 1);
  eq("a phrase in the change history is exempt", judgeIds([{ file: "spec/a.md", text: spec, added: new Set([4]) }]), []);
  const header = "> | Change History | 1.1 (2026-11-24): a row\n> | Status | no longer here\n";
  eq("a phrase in the Document Control history row is exempt", judgeIds([{ file: "spec/a.md", text: header.replace("a row", "no longer a row"), added: new Set([1]) }]), []);
  eq("a phrase in another Document Control row is flagged", judgeIds([{ file: "spec/a.md", text: header, added: new Set([2]) }]).length, 1);
  eq("an older entry of the Document Control history row is not new text", judgeIds([{ file: "spec/a.md", text: "> | Change History | 1.2 (2026-11-24): a row<br>1.1 (2026-11-10): D-01 approved, no longer<br>1.0 (2026-11-09): Initial\n", added: new Set([1]) }]), []);
  eq("an id in the Document Control history row is still flagged", judgeIds([{ file: "spec/a.md", text: "> | Change History | 1.1 (2026-11-24): HYDV-01\n", added: new Set([1]) }]).length, 1);

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
  const planted = "a /* x */ 'b' `c ${ d as E } f` // g\nh";
  const blanked = blank(planted);
  eq("blank keeps code and length", [blanked.length === planted.length, blanked.includes("d as E"), blanked.includes("c "), blanked.includes("g")], [true, true, false, false]);
  const kept = blank(planted, true);
  eq("blank with keepStrings keeps the strings and blanks the comments", [kept.length === planted.length, kept.includes("'b'"), kept.includes("c "), kept.includes("x"), kept.includes("g")], [true, true, true, false, false]);
  eq("a string holding two slashes is not a comment", blank('import x from "http://a"; // c', true).includes("http://a"), true);

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

  // The owner's trailer, the commit judge over the planning commits that precede the first plan commit, and the base.
  const T1 = TRAILER;
  eq("the owner's trailer passes", judgeTrailer(`subject\n\n${T1}\n`), []);
  eq("two trailers fail", judgeTrailer(`s\n\n${T1}\n${T1}\n`).length, 1);
  eq("no trailer fails", judgeTrailer("s\n").length, 1);
  eq("a foreign trailer fails", judgeTrailer("s\n\nCo-Authored-By: Someone <a@b.c>\n").length, 1);
  eq("another Claude model fails", judgeTrailer("s\n\nCo-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>\n").length, 1);
  eq("a Claude trailer with another address fails", judgeTrailer("s\n\nCo-Authored-By: Claude Opus 5.5 <a@b.c>\n").length, 1);

  const c = (subject, paths, message = `${subject}\n\n${T1}`) => ({ sha: subject, subject, paths, message });
  const PLAN = "docs(85-01): record";
  const log = [c("docs(85): create phase plan", [".planning/a.md"]), c("docs(phase-85): add pattern map", [".planning/b.md"]), c(PLAN, ["b", "a"]), c("chore(85-01): next", ["z"])];
  eq("--first passes over planning commits that change only .planning", judgeCommit(log, PLAN, ["a", "b"], true), []);
  eq("the second plan commit passes without --first", judgeCommit(log, "chore(85-01): next", ["z"], false), []);
  eq("--first on the second plan commit fails", judgeCommit(log, "chore(85-01): next", ["z"], true)[0].startsWith("the commit is not the first plan commit"), true);
  eq("a commit before the first plan commit that changes source fails", judgeCommit([c("docs(85): x", [".planning/a.md", "packages/x.ts"]), c(PLAN, ["a"])], PLAN, ["a"], true), ["docs(85): x precedes the first plan commit and changes packages/x.ts outside .planning"]);
  eq("a wrong subject fails", judgeCommit(log, "other", ["a"], false).length, 1);
  eq("an extra path fails", judgeCommit(log, PLAN, ["a"], false).length, 1);
  eq("a missing path fails", judgeCommit(log, PLAN, ["a", "b", "c"], false).length, 1);
  eq("a duplicate subject fails", judgeCommit([c(PLAN, ["a"]), c(PLAN, ["a"])], PLAN, ["a"], false).length, 1);
  eq("a commit without the trailer fails", judgeCommit([c(PLAN, ["a"], PLAN)], PLAN, ["a"], false).length, 1);
  eq("a Phase 84 subject is refused by commit", judgeCommit([c("docs(84-01): x", ["a"])], PLAN, ["a"], false).length, 1);
  eq("a Phase 84 subject is not a plan commit", PLAN_SUBJECT.test("docs(84-01): x"), false);
  eq("a Phase 85 subject is a plan commit", PLAN_SUBJECT.test("chore(85-12)!: x"), true);
  const other = "0123456789abcdef0123456789abcdef01234567";
  eq("the fixed base that is an ancestor passes", judgeBase(PHASE_BASE, true), []);
  eq("another sha fails", judgeBase(other, true), [`phase_base is not ${PHASE_BASE}`]);
  eq("a base that is not an ancestor fails", judgeBase(PHASE_BASE, false), ["phase_base is not an ancestor of HEAD"]);
  eq("an unrecorded base fails", judgeBase(undefined, true).length, 1);

  eq("the line \"use client\"; is not a module-scope literal", lit(devSrc, '"use client";\nexport const a = 1;'), []);
  eq("a use client string in an expression is flagged", lit(devSrc, 'const NAME = "use client";').length, 1);
  eq("a second module-scope literal after it is flagged", lit(devSrc, '"use client";\nconst NAME = "x";').length, 1);
  eq("a use client line with a trailing comment is not exempt", lit(devSrc, '"use client"; // x').length, 1);

  const guard = (file, base, current) => judgeGuards([{ file, base, current }]);
  eq("an unchanged guard file passes", guard("AGENTS.md", "x", "x"), []);
  eq("a changed AGENTS.md fails", guard("AGENTS.md", "x", "y"), ["AGENTS.md differs from phase_base: no budget moves"]);
  eq("a changed budget fails", guard("scripts/check-house-style.mjs", "x", "y").length, 1);
  eq("a changed .oxlintrc.json fails", guard(".oxlintrc.json", "{}", "{ }").length, 1);

  // The bracket readers.
  eq("a call is read with its line and arguments", callsOf("x\nconst a = f(g(1, 2), { k: [1, 2] });", "f").map(({ line, args }) => ({ line, args })), [{ line: 2, args: ["g(1, 2)", "{ k: [1, 2] }"] }]);
  eq("a method call is not a call of the name", callsOf("o.f(1);", "f"), []);
  eq("a declaration is not a call", callsOf("function f(a) {}\nf(1);", "f").length, 1);
  eq("a function body is read", functionBody("function f(a: A): B {\n  return { a };\n}\nconst x = 1;", "f"), "{\n  return { a };\n}");
  eq("a name that is not declared has no body", functionBody("const f = () => {};", "f"), undefined);
  eq("a split at the top level ignores nested commas", splitTop("a, f(b, c), { d: [e, g] }"), ["a", "f(b, c)", "{ d: [e, g] }"]);
  eq("imports are read with their names", importsOf('import type { A, B as C } from "./a.ts";\nimport * as Data from "effect/Data";\nimport "./side.ts";\nexport { z } from "./z.ts";\nexport const q = 1;').map(({ spec, names }) => ({ spec, names })), [
    { spec: "./a.ts", names: ["A", "B"] },
    { spec: "effect/Data", names: ["Data"] },
    { spec: "./side.ts", names: [] },
    { spec: "./z.ts", names: ["z"] },
  ]);
  eq("a multi-line import is read", importsOf('import {\n  a,\n  b,\n} from "./a.ts";\n').map(({ spec, names, line }) => ({ spec, names, line })), [{ spec: "./a.ts", names: ["a", "b"], line: 1 }]);
  eq("an export of a value is not an import", importsOf("export const a = 1;\nexport function fromX() { return 1; }\n"), []);
  eq("the statements at module scope are split", topLevel(blank('import a from "./a.ts";\nexport type T = Data.TaggedEnum<{\n  A: {};\n}>;\nexport function f() {\n  return { a: 1 };\n}\nexport const E = Data.taggedEnum<T>();\n')).map(({ text, line }) => [kindOf(text), line]), [["import", 1], ["type", 2], ["function", 5], ["enum", 8]]);
  eq("a stray semicolon after a block is not a statement", topLevel("function f() {}\n;\nconst a = 1;").length, 2);

  // no-react-in-model.
  const viewOk = [
    'import * as Data from "effect/Data";',
    'import { unaccountedEntries } from "./Hydration.ts";',
    'import type { HydrationActivity, HydrationDrops } from "./Hydration.ts";',
    "",
    "export interface HydrationInput {",
    "  readonly hydration: HydrationActivity | undefined;",
    "  readonly unsampled: boolean;",
    "}",
    "export type HydrationDropsView = Data.TaggedEnum<{",
    "  None: { readonly text: string };",
    "  Raised: { readonly rows: ReadonlyArray<HydrationDrops> };",
    "}>;",
    "export const HydrationDropsView = Data.taggedEnum<HydrationDropsView>();",
    "export type HydrationView = Data.TaggedEnum<{",
    "  Pending: {};",
    "  Unwired: {};",
    "  Counts: { readonly dehydrated: number };",
    "}>;",
    "export const HydrationView = Data.taggedEnum<HydrationView>();",
    "",
    "function countsOf(activity: HydrationActivity): HydrationView {",
    '  return HydrationView.Counts({ dehydrated: unaccountedEntries(activity) ?? 0, note: "x" });',
    "}",
    "",
    "export function hydrationView(input: HydrationInput): HydrationView {",
    "  return input.hydration !== undefined",
    "    ? countsOf(input.hydration)",
    "    : input.unsampled",
    "      ? HydrationView.Pending()",
    "      : HydrationView.Unwired();",
    "}",
    "",
  ].join("\n");
  const modelOk = [{ file: `${MODEL_DIR}PortCards.ts`, text: 'import * as Data from "effect/Data";\nexport const a = 1;\n' }];
  const pure = (view = viewOk, model = modelOk) => judgeNoReactInModel({ view, model });
  eq("a pure view and a React-free model pass", pure(), []);
  eq("a view that does not exist fails", judgeNoReactInModel({ view: undefined, model: modelOk }), [`${VIEW_FILE} does not exist`]);
  const withReact = `import * as React from "react";\n${viewOk}`;
  eq("a React import in the view fails the import list", pure(withReact).length, 1);
  eq("a React import in the view, read as a model file too, fails twice", pure(withReact, [...modelOk, { file: VIEW_FILE, text: withReact }]).length, 2);
  eq("a React import in another model file fails", pure(viewOk, [{ file: `${MODEL_DIR}A.ts`, text: 'import { useState } from "react";\n' }]), [`${MODEL_DIR}A.ts:1 imports react: the model imports no React`]);
  eq("an import of the atoms binding in the model fails", pure(viewOk, [{ file: `${MODEL_DIR}A.ts`, text: 'import { useAtomValue } from "@effect/atom-react";\n' }]).length, 1);
  eq("an import of a component file in the model fails", pure(viewOk, [{ file: `${MODEL_DIR}A.ts`, text: 'import { Panel } from "../react/Panel.tsx";\n' }]).length, 1);
  eq("an import in a comment is not an import", pure(viewOk, [{ file: `${MODEL_DIR}A.ts`, text: '// import { useState } from "react";\n' }]), []);
  eq("an import beside the two allowed fails", pure(viewOk.replace('import { unaccountedEntries } from "./Hydration.ts";', 'import { unaccountedEntries } from "./Hydration.ts";\nimport * as Match from "effect/Match";')), [`${VIEW_FILE}:3 imports effect/Match, not only effect/Data and ./Hydration.ts`]);
  eq("an arrow const in place of the function fails", pure(viewOk.replace("export function hydrationView(input: HydrationInput): HydrationView {", "export const hydrationView = (input: HydrationInput): HydrationView => {")).some((r) => r.includes("does not export hydrationView as a function declaration")), true);
  eq("a module-scope string constant fails", pure(`${viewOk}const NO_COUNTS = "x";\n`).length, 1);
  eq("a module-scope arrow const fails", pure(`${viewOk}const pick = (a: number) => a;\n`).length, 1);
  eq("a module-scope call fails", pure(`${viewOk}register(hydrationView);\n`).length, 1);
  eq("a third enum constant fails", pure(`${viewOk}export const Other = Data.taggedEnum<Other>();\n`), [`${VIEW_FILE} holds 3 Data.taggedEnum constants, not two`]);
  eq("one enum constant fails", pure(viewOk.replace("export const HydrationDropsView = Data.taggedEnum<HydrationDropsView>();\n", "")), [`${VIEW_FILE} holds 1 Data.taggedEnum constants, not two`]);
  eq("a sentence inside a function body is not module scope", pure(viewOk.replace("{ dehydrated:", '{ text: `${1} of`, dehydrated:')), []);

  // three-predicates.
  const modelText = [
    'import { isUnsampled } from "./DiagnosticsFeed.ts";',
    "",
    "function shownInputOf(snapshot: DiagnosticsReadout): ShownInput {",
    "  return { reading: snapshot.reading, unsampled: isUnsampled(snapshot.status) };",
    "}",
    "",
    "export const makeDockModel = Effect.fn(\"x\")(function* () {",
    "  const questions = yield* makeDerivedStore({",
    "    parents: [gatesFeed, shownReading],",
    "    key: (): JoinKey => {",
    "      const supplied = held.reading?.questions;",
    "      const { status } = shownReading.getSnapshot();",
    "      return { feed: gatesFeed.getSnapshot(), supplied, unsampled: supplied === undefined && isUnsampled(status) };",
    "    },",
    "    compute: (key) => joinQuestions(joinInputOf(key)),",
    "  });",
    "  const services = yield* makeDerivedStore({",
    "    parents: [shownReading],",
    "    key: (): ServicesInput => {",
    "      const { reading, unsampled } = shownInputOf(shownReading.getSnapshot());",
    "      return { wiring: reading.wiring, activity: reading.activity, unsampled };",
    "    },",
    "    compute: portCards,",
    "  });",
    "  const hydration = yield* makeDerivedStore({",
    "    parents: [shownReading],",
    "    key: (): HydrationInput => {",
    "      const { reading, unsampled } = shownInputOf(shownReading.getSnapshot());",
    "      return { hydration: reading.hydration, unsampled };",
    "    },",
    "    compute: hydrationView,",
    "  });",
    "});",
    "",
  ].join("\n");
  const preds = (model = modelText, view = viewOk) => judgeThreePredicates({ model, view });
  const swap = (text, from, to) => text.replace(from, to);
  eq("the three predicates kept distinct pass", preds(), []);
  eq("a view that does not exist fails", judgeThreePredicates({ model: modelText, view: undefined }), [`${VIEW_FILE} does not exist`]);
  eq("a missing guard fails", preds(swap(modelText, "supplied === undefined && ", "")).length >= 1, true);
  eq("a guard appearing twice fails", preds(swap(modelText, "    compute: hydrationView,", "    compute: hydrationView,\n    guard: supplied === undefined && isUnsampled(status),")).length >= 1, true);
  eq("a third call of isUnsampled fails", preds(swap(modelText, "return { hydration: reading.hydration, unsampled };", "return { hydration: reading.hydration, unsampled: isUnsampled(shownReading.getSnapshot().status) };")).some((r) => r.includes("is called 3 times, not twice")), true);
  eq("the services key calling isUnsampled itself fails", preds(swap(modelText, "const { reading, unsampled } = shownInputOf(shownReading.getSnapshot());\n      return { wiring", "const { status, reading } = shownReading.getSnapshot();\n      const unsampled = isUnsampled(status);\n      return { wiring")).length >= 1, true);
  eq("a shared reader that is an arrow const fails", preds(swap(swap(modelText, "function shownInputOf(snapshot: DiagnosticsReadout): ShownInput {", "const shownInputOf = (snapshot: DiagnosticsReadout): ShownInput => {"), "}\n\nexport const makeDockModel", "};\n\nexport const makeDockModel")).some((r) => r.includes("outside a module-scope function declaration")), true);
  eq("a hydration key that does not call the shared reader fails", preds(swap(modelText, "      const { reading, unsampled } = shownInputOf(shownReading.getSnapshot());\n      return { hydration", "      const { reading } = shownReading.getSnapshot();\n      const unsampled = true;\n      return { hydration")).some((r) => r.includes("the hydration key does not call the shared reader")), true);
  eq("a hydration key that spreads fails", preds(swap(modelText, "return { hydration: reading.hydration, unsampled };", "return { ...reading, unsampled };")).some((r) => r.includes("spreads")), true);
  eq("a hydration key that does not read the field fails", preds(swap(modelText, "return { hydration: reading.hydration, unsampled };", "return { hydration: undefined, unsampled };")).some((r) => r.includes("does not read reading.hydration")), true);
  eq("a hydration store over another parent fails", preds(swap(modelText, "    parents: [shownReading],\n    key: (): HydrationInput", "    parents: [shownReading, gatesFeed],\n    key: (): HydrationInput")).some((r) => r.includes("parents are not [shownReading]")), true);
  eq("a hydration store computed by another function fails", preds(swap(modelText, "compute: hydrationView,", "compute: other,")).some((r) => r.includes("0 derived stores are computed by hydrationView")), true);
  eq("a second hydration store fails", preds(swap(modelText, "});\n", "});\n  const again = yield* makeDerivedStore({ parents: [shownReading], key: () => shownInputOf(x), compute: hydrationView });\n")).some((r) => r.includes("2 derived stores are computed by hydrationView")), true);
  eq("a missing services store fails", preds(swap(modelText, "compute: portCards,", "compute: other,")).some((r) => r.includes("computed by portCards")), true);
  eq("a guard named in a comment is not a guard", preds(`// supplied === undefined && isUnsampled(status)\n${modelText}`), []);
  eq("a view testing unsampled before the field fails", preds(modelText, swap(viewOk, "return input.hydration !== undefined\n    ? countsOf(input.hydration)\n    : input.unsampled\n      ? HydrationView.Pending()\n      : HydrationView.Unwired();", "return input.unsampled\n    ? HydrationView.Pending()\n    : input.hydration !== undefined\n      ? countsOf(input.hydration)\n      : HydrationView.Unwired();")), [`${VIEW_FILE}: hydrationView tests unsampled before the hydration field`]);
  eq("a view with no hydrationView fails", preds(modelText, "export const a = 1;\n"), [`${VIEW_FILE} has no readable hydrationView`]);

  // panel-decides-nothing.
  const panelOk = [
    'import * as Match from "effect/Match";',
    'import type { HydrationView } from "../model/HydrationView.ts";',
    'import { useStoreSnapshot } from "./useStoreSnapshot.ts";',
    "",
    "const hydrationBlock: (self: HydrationView) => ReactNode = Match.type<HydrationView>().pipe(",
    "  Match.tagsExhaustive({",
    "    Pending: () => <span>{NO_COUNTS_YET}</span>,",
    "    Unwired: () => <span>no counts read</span>,",
    "    Counts: (counts) => <div>{counts.rate}</div>,",
    "  }),",
    ");",
    "",
    "export const QuestionsPanel = ({ hydration }) => {",
    "  const view = useStoreSnapshot(hydration ?? NO_HYDRATION);",
    "  return hydrationBlock(view);",
    "};",
    "",
  ].join("\n");
  const panel = (text = panelOk) => judgePanelDecidesNothing(text);
  eq("a panel that renders the view and decides nothing passes", panel(), []);
  eq("an import of the status predicate fails", panel(`import { isUnsampled } from "../model/DiagnosticsFeed.ts";\n${panelOk}`), [`${PANEL}:1 imports isUnsampled from ../model/DiagnosticsFeed.ts`]);
  eq("an import of the helper fails", panel(`import { unaccountedEntries } from "../model/Hydration.ts";\n${panelOk}`), [`${PANEL}:1 imports unaccountedEntries from ../model/Hydration.ts`]);
  eq("a type import of the activity fails", panel(`import type { HydrationActivity } from "../model/Hydration.ts";\n${panelOk}`), [`${PANEL}:1 imports HydrationActivity from ../model/Hydration.ts`]);
  eq("an import of another name from the same module passes", panel(`import type { HydrationDrops } from "../model/Hydration.ts";\n${panelOk}`), []);
  eq("a renamed import is read by its source name", panel(`import { isUnsampled as unsampled } from "../model/DiagnosticsFeed.ts";\n${panelOk}`).length, 1);
  eq("a rate rule fails", panel(panelOk.replace("{counts.rate}", "{counts.rechecked === 0 ? null : counts.rate}")).length, 1);
  eq("a drop-filter rule fails", panel(panelOk.replace("{counts.rate}", "{rows.filter((drop) => drop.count > 0)}")).length, 2);
  eq("a watched-count read fails", panel(panelOk.replace("{counts.rate}", "{counts.drops.length}")).length, 1);
  eq("the unaccounted arithmetic fails", panel(panelOk.replace("{counts.rate}", "{unaccounted}")).length, 1);
  eq("a plural rule fails", panel(panelOk.replace("{counts.rate}", '{n === 1 ? "y" : "ies"}')).length, 1);
  eq("a rule named in a comment is not a rule", panel(`// rechecked === 0, count > 0, drops.length\n${panelOk}`), []);
  eq("a rule named in a string is not a rule", panel(panelOk.replace("no counts read", "{'rechecked === 0'}")), []);
  eq("a panel with no match fails", panel(panelOk.replace("Match.type<HydrationView>()", "other()")).some((r) => r.includes("has no module-scope Match.type<HydrationView>()")), true);
  eq("a match that is not exhaustive fails", panel(panelOk.replace("Match.tagsExhaustive", "Match.tags")), [`${PANEL}:5 Match.type<HydrationView>() is not finished by Match.tagsExhaustive`]);
  eq("a match built inside the component is not module scope", panel(panelOk.replace("const hydrationBlock: (self: HydrationView) => ReactNode = Match", "  const hydrationBlock = Match")).some((r) => r.includes("has no module-scope")), true);
  eq("a panel that reads no store for it fails", panel(panelOk.replace("useStoreSnapshot(hydration ?? NO_HYDRATION)", "useStoreSnapshot(lens)")), [`${PANEL} does not read its hydration store through useStoreSnapshot`]);
  eq("a panel that reads the store another way fails", panel(panelOk.replace("useStoreSnapshot(hydration ?? NO_HYDRATION)", "hydration.getSnapshot()")).length, 1);

  // frame-reads-status.
  const inReact = (file, text) => ({ file: `${REACT_DIR}${file}`, text });
  const dockOk = [
    'import type { FC, ReactNode } from "react";',
    'import type { DockModel } from "../model/DockModel.ts";',
    'import { useDiagnosticsStatus, useStoreSnapshot } from "./useStoreSnapshot.ts";',
    "const DockFrame: FC = ({ model }) => {",
    "  const view = useStoreSnapshot(model.dock);",
    "  const status = useDiagnosticsStatus(model.diagnostics);",
    "  const notice = useStopNotice(status, model.diagnostics.restart);",
    "};",
    "const Screen: FC<{ readonly model: DockModel; readonly notice: N }> = (props) => {",
    "  const screens = {",
    "    questions: () => <QuestionsPanel hydration={props.model.hydration} diagnostics={props.notice} />,",
    "  };",
    "};",
    "",
  ].join("\n");
  const hookOk = [
    '"use client";',
    'import { useSyncExternalStore } from "react";',
    "export const useStoreSnapshot = <A,>(store: ReadableStore<A>): A =>",
    "  useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);",
    "",
    "export const useDiagnosticsStatus = (readout: DiagnosticsReadout): DiagnosticsStatus =>",
    "  useStoreSnapshot({ subscribe: readout.subscribe, getSnapshot: () => readout.getSnapshot().status });",
    "",
    "export const usePaused = (timeline: TimelineStore): boolean =>",
    "  useStoreSnapshot({ subscribe: timeline.subscribe, getSnapshot: timeline.isPaused });",
    "",
  ].join("\n");
  const frame = (over = {}, extra = []) => {
    const files = [inReact("DevtoolsDock.tsx", dockOk), inReact("useStoreSnapshot.ts", hookOk)].map((f) => {
      const name = f.file.split("/").pop();
      return over[name] === undefined ? f : { ...f, text: over[name] };
    });
    return judgeFrameReadsStatus([...files, ...extra]);
  };
  eq("a frame that reads the status alone passes", frame(), []);
  eq("a frame that still reads the whole snapshot fails", frame({ "DevtoolsDock.tsx": dockOk.replace("const status = useDiagnosticsStatus(model.diagnostics);", "const { status } = useStoreSnapshot(model.diagnostics);") }).length >= 2, true);
  eq("a whole-snapshot read beside the status hook fails", frame({ "DevtoolsDock.tsx": dockOk.replace("const notice", "const all = useStoreSnapshot(model.diagnostics);\n  const notice") }), [`${DOCK}:7 subscribes to the whole diagnostics snapshot`]);
  eq("the status hook called twice fails", frame({ "DevtoolsDock.tsx": dockOk.replace("const notice", "const again = useDiagnosticsStatus(model.diagnostics);\n  const notice") }), [`${DOCK} calls useDiagnosticsStatus 2 times, not once`]);
  eq("the status hook given another store fails", frame({ "DevtoolsDock.tsx": dockOk.replace("useDiagnosticsStatus(model.diagnostics)", "useDiagnosticsStatus(model.timelineStatus)") }), [`${DOCK}:6 useDiagnosticsStatus is not called with model.diagnostics`]);
  eq("a shown prop fails", frame({ "DevtoolsDock.tsx": dockOk.replace("readonly notice: N }", "readonly notice: N; readonly shown: S }") }), [`${DOCK}:9 still names shown`]);
  eq("a shown named in a comment passes", frame({ "DevtoolsDock.tsx": `// shown\n${dockOk}` }), []);
  eq("the Diagnostics type import fails", frame({ "DevtoolsDock.tsx": `import type { Diagnostics } from "../model/Diagnostics.ts";\n${dockOk}` }), [`${DOCK}:1 still imports Diagnostics`]);
  eq("another import named like it passes", frame({ "DevtoolsDock.tsx": `import type { DiagnosticsNoticeProps } from "./DiagnosticsNotice.tsx";\n${dockOk}` }), []);
  eq("a questions tab that passes the reading fails", frame({ "DevtoolsDock.tsx": dockOk.replace("props.model.hydration", "props.shown.hydration") }).length >= 1, true);
  eq("a dock that is not found fails", judgeFrameReadsStatus([inReact("useStoreSnapshot.ts", hookOk)]).includes(`${DOCK} is not found`), true);
  eq("a hook that is not declared fails", frame({ "useStoreSnapshot.ts": hookOk.replace("useDiagnosticsStatus", "useOther") }), [`${SNAPSHOT_HOOK} does not declare useDiagnosticsStatus`]);
  eq("a hook with a getSnapshot that is not derived fails", frame({ "useStoreSnapshot.ts": hookOk.replace("getSnapshot: () => readout.getSnapshot().status", "getSnapshot: readout.getSnapshot") }), [`${SNAPSHOT_HOOK}: useDiagnosticsStatus does not derive getSnapshot from .status`]);
  eq("a hook that calls useSyncExternalStore itself fails", frame({ "useStoreSnapshot.ts": hookOk.replace("useStoreSnapshot({ subscribe: readout.subscribe, getSnapshot: () => readout.getSnapshot().status })", "useSyncExternalStore(readout.subscribe, () => readout.getSnapshot().status)") }).some((r) => r.includes("src/react calls useSyncExternalStore 2 times, not once")), true);
  eq("a second useSyncExternalStore in another file fails", frame({}, [inReact("useOther.ts", "export const useOther = (s) => useSyncExternalStore(s.subscribe, s.getSnapshot);\n")]), [`${REACT_DIR}useOther.ts:1 calls useSyncExternalStore outside useStoreSnapshot.ts`, "src/react calls useSyncExternalStore 2 times, not once"]);
  eq("a useSyncExternalStore named in a comment passes", frame({}, [inReact("useOther.ts", "// useSyncExternalStore(x)\n")]), []);

  // records.
  const A = "packages/devtools/test/model/A.test.ts";
  const B = "packages/devtools/test/react/B.test.tsx";
  const behOf = (n, body, title = "heading") => `## BEH-QD-${n}: ${title}\n\n> **Decision:** x\n\n${body}\n\nSpecified in ADR-QD-198 (CCR-QD-477).\n\n`;
  const pinned = `Pinned by \`${A}\` ("a title"; U1, the row), \`${B}\` ("b title that\nspans two lines", "a described group").`;
  const held = (over = {}) => PINNED_KEPT.map((n) => behOf(n, over[n] ?? pinned, n === 699 ? "The dock model's five computed stores are derived stores" : "heading")).join("");
  const files = {
    [A]: 'it("U1 the row", () => {});\nit("a title", () => {});\n',
    [B]: 'describe("a described group", () => {});\nit("b title that spans two lines", () => {});\n',
  };
  const trace = (over = {}) =>
    [
      "## §1 Behavior to source",
      "",
      over.one ?? "| 28 | BEH-QD-211–218, BEH-QD-761–765 | `x` |",
      "",
      "## §2 Invariant traceability",
      "",
      over.two ?? "| [INV-QD-415](a) | d |\n| [INV-QD-416](a) | d |",
      "",
      "## §3 Decision traceability",
      "",
      over.three ?? "| [ADR-QD-198](a) | t |",
      "",
      "## §4 Test file map",
      "",
    ].join("\n");
  const recs = (behaviors = held(), close = undefined, fs = files, t = trace()) => judgeRecords({ trace: t, behaviors, tests: (p) => fs[p] }, close);
  eq("records that agree pass", recs(), []);
  eq("a quoted title that no test holds fails", recs(held({ 699: pinned.replace("a title", "a titel") })), [`BEH-QD-699 quotes "a titel" for ${A}, which holds no such test`]);
  eq("a describe title may be quoted", recs(), []);
  eq("a title quoted under the wrong file fails", recs(held({ 700: pinned.replace('("a title"; U1, the row)', '("a title"; "b title that spans two lines"; U1, the row)') })), [`BEH-QD-700 quotes "b title that spans two lines" for ${A}, which holds no such test`]);
  eq("a quoted title is matched whole, not by its prefix", recs(held({ 735: pinned.replace("a title", "a") })).length, 1);
  eq("a row id that no title opens fails", recs(held({ 742: pinned.replace("U1,", "U2,") })), [`BEH-QD-742 names row U2 for ${A}, which no title opens`]);
  eq("a row id with no digits is not a row id", recs(held({ 742: pinned.replace("U1,", "U,") })), []);
  eq("a row id is not satisfied by a longer id", recs(held(), undefined, { ...files, [A]: files[A].replace("U1 the row", "U10 the row") }).length, 4);
  eq("a pinned file that does not exist fails", recs(held(), undefined, { ...files, [B]: undefined }).length, 4);
  eq("a kept behavior with no heading fails", recs(held().replace("## BEH-QD-742:", "## BEH-QD-9742:")), [`BEH-QD-742 has no heading in ${BEHAVIORS}`]);
  eq("a new behavior with no heading is skipped", recs(), []);
  eq("a behavior whose pinned-by names no file fails", recs(held({ 700: "Pinned by nothing." })), ["BEH-QD-700 names no test file in a Pinned by paragraph"]);
  eq("a pinned-by paragraph ends at the blank line", recs(`${held()}Quoted later: "not a title".\n`), []);
  eq("a new behavior is read once it has a heading", recs(`${held()}${behOf(761, pinned.replace("a title", "a titel"))}`), [`BEH-QD-761 quotes "a titel" for ${A}, which holds no such test`]);

  const closeText = {
    invariants: "## INV-QD-415: a\n\n## INV-QD-416: b\n",
    decisions: [{ file: "198-the-hydration-block.md", text: "| Document ID | QADI-ADR-198 |" }],
    index: '  - id: "ADR-QD-198"\n    file: "198-x.md"\n',
    readme: "| CCR-QD-477 | 2026-11-25 | ARCH-132 the hydration block |\n",
  };
  const closeBeh = (over = {}) =>
    [
      ...PINNED_KEPT.map((n) => behOf(n, n === 700 ? `${pinned}\n\nThe stores are listed once, \`hydration\` among them.` : pinned, n === 699 ? "The dock model's five computed stores are derived stores" : "heading")),
      ...NEW_BEHAVIORS.map((n) => behOf(n, pinned)),
      behOf(218, over.table ?? "| Screen | Absent | Present but empty |\n| ------ | ------ | ----------------- |\n| Questions: hydration | no reading | counts |", "Every screen degrades to an explanation"),
    ].join("");
  const closed = (over = {}, close = closeText, behaviors = closeBeh()) => recs(behaviors, close, files, trace(over));
  eq("a close with every reserved record written passes", closed(), []);
  eq("a close with no new BEH heading fails", closed({}, closeText, closeBeh().replace("## BEH-QD-763:", "## BEH-QD-9763:")), [`BEH-QD-763 has no heading in ${BEHAVIORS}`]);
  eq("a BEH outside every range of section 1 fails", closed({ one: "| 28 | BEH-QD-211–218, BEH-QD-761–764 | `x` |" }), ["BEH-QD-765 has no row in spec/traceability.md §1"]);
  eq("a single BEH named in section 1 is covered", closed({ one: "| 28 | BEH-QD-761–764, BEH-QD-765 | `x` |" }), []);
  eq("a missing INV row fails", closed({ two: "| [INV-QD-415](a) | d |" }), ["INV-QD-416 has no row in spec/traceability.md §2"]);
  eq("a missing INV heading fails", closed({}, { ...closeText, invariants: "## INV-QD-415: a\n" }), ["INV-QD-416 has no heading in spec/invariants.md"]);
  eq("a missing ADR file fails", closed({}, { ...closeText, decisions: [] }), ["spec/decisions/198-*.md does not exist"]);
  eq("an ADR file without its document id fails", closed({}, { ...closeText, decisions: [{ file: "198-x.md", text: "none" }] }), ["the ADR-QD-198 file does not carry QADI-ADR-198"]);
  eq("a missing index entry fails", closed({}, { ...closeText, index: "" }), ["spec/decisions/index.yaml has no ADR-QD-198 entry"]);
  eq("a missing section 3 row fails", closed({ three: "| [ADR-QD-197](a) | t |" }), ["ADR-QD-198 has no row in spec/traceability.md §3"]);
  eq("a missing CCR row fails", closed({}, { ...closeText, readme: "" }), ["spec/README.md has no CCR-QD-477 row"]);
  eq("a CCR row that does not name the architecture item fails", closed({}, { ...closeText, readme: "| CCR-QD-477 | 2026-11-25 | x |\n" }), ["the CCR-QD-477 row does not name ARCH-132"]);
  eq("a heading that still says four fails", closed({}, closeText, closeBeh().replace("five computed stores", "four computed stores")), ["BEH-QD-699's heading does not say five computed stores"]);
  eq("a list that does not name hydration fails", closed({}, closeText, closeBeh().replace("`hydration` among them", "ten among them")), ["BEH-QD-700 does not name `hydration`"]);
  eq("an empty-states table with no hydration row fails", closed({}, closeText, closeBeh({ table: "| Screen | Absent |\n| ------ | ------ |\n| Services | none |" })), ["BEH-QD-218's table has no hydration row"]);
  eq("a hydration mention outside the first column is not a row", closed({}, closeText, closeBeh({ table: "| Screen | Absent |\n| ------ | ------ |\n| Services | hydration |" })), ["BEH-QD-218's table has no hydration row"]);
  eq("the close checks are not run without --close", recs(held()), []);

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
// Run as a script, not when a judge is imported from another file.
if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (mode === undefined || !Object.hasOwn(MODES, mode)) fail([`usage: node 85-check.mjs ${Object.keys(MODES).join("|")}`]);
  else MODES[mode](args);
}
