// The phase's shared check, run from the repository root as `node <this file> <mode> [args]`. Each mode is a pure
// judge over text plus a thin reader that gathers the text from git or the tree; a failure prints its reasons to stderr
// and exits 1. Modes:
//   base                                     prints phase_base read from the committed 87-mutation-base.json, after checking that
//                                            the commit planning started on and phase_base are ancestors of HEAD and that nothing
//                                            outside `.planning/` differs between them
//   commit [--first] "<subject>" <path>...   exactly one commit since phase_base has this subject and exactly these paths;
//                                            --first also needs it to be the first plan commit, every commit before it
//                                            changing only `.planning/`
//   unchanged <path>...                      the tree matches phase_base on these paths and none is untracked
//   seen-failing <test-file> [<title>...]    each title has a failure line in the evidence file
//   scan-ids                                 added lines (tree against phase_base, .planning excluded) name no id or phase
//   scan-forbidden                           added source and test lines use none of the forbidden forms, and no budget file moved
//   trailers [--message <file>]              every commit since phase_base, the workflow's metadata commits included, has exactly
//                                            one trailer, the owner's; --message judges one message text instead, so the mode
//                                            fails without a commit
//   suite <report> [--green | --passing <id>...]
//                                            a vitest JSON report of the devtools project: only the rows the evidence file lists as
//                                            red on the base may fail, every test file loaded, every base test file ran; --passing
//                                            also needs each named row to pass, --green needs no failure at all
//   stated-run-shape                         StatedRun.ts is the one package-private run that states its stop
//   prologue-shape                           ConfigurePrologue.ts is the one configure prologue, in the order the feeds read it
//   feeds-supply-only-engine [timeline|diagnostics|gates ...]
//                                            the feeds build the shared pieces and hold none of the run protocol themselves
//   session-stop                             SimulationSession.ts starts its runs through the stated run and states a cause as
//                                            the feeds do
//   simulator-pre                            the Simulator's broken-run box is the stopped box's labelled preformatted block
//   onfailure-gone                           the failure hook is gone from the run module, the stores and their tests
//   built-feeds-once                         test/builtFeeds.ts builds and configures through one helper
//   records [--close]                        the pinned-by lists name tests that exist; --close also needs every reserved
//                                            record written and every amended record at its next revision
//   --self-test                              drives every judge with planted text
// Shortcuts: the comment and string blanking does not understand regex literals, `any` is read by the token before it,
// and a function whose return type is a literal object type is read wrongly by the module-scope reader: reword the
// declaration. A false positive is cleared by rewording the line, never by weakening a judge. The shape modes read source
// text with comments and strings blanked and match its shapes by pattern, so a reworded declaration that keeps the same
// meaning can need the pattern widened; that is a reviewed edit to this file, never a reason to skip the mode. A block is
// read as the text between a brace and its match, so a brace inside a regex literal is read wrongly. A pinned-by paragraph
// starts at `Pinned by` or `Enforcement:` and ends at the next blank line; quoted titles before its first file belong to it.
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, relative } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

/** This script's own directory, relative to the repository root, with a trailing slash. */
const D = `${relative(process.cwd(), dirname(fileURLToPath(import.meta.url)))}/`;
const EVIDENCE = `${D}87-RED-EVIDENCE.md`;
const BASE_RECORD = `${D}87-mutation-base.json`;
/** The one trailer every commit ends with: the project owner's line, and no other Claude name is accepted. */
const TRAILER = "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>";
const PLAN_SUBJECT = /^[a-z]+[(]87-[0-9]{2}[)]!?: /;
const GUARDED = ["AGENTS.md", "scripts/check-house-style.mjs", ".oxlintrc.json"];
/** The commit planning started on: every file outside `.planning/` is the one phase_base holds. */
const PLANNING_HEAD = "cbe375bf";

const fail = (lines) => {
  console.error(lines.join("\n"));
  process.exit(1);
};
const git = (...args) => execFileSync("git", args, { encoding: "utf8", maxBuffer: 1 << 28 });
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
  [/(?<![\w.-])87-\d{2}(?!\d)/, "a plan id"],
  [/\bSTOP-0\d\b/, "a requirement id"],
  [/\bWX-0\d\b/, "a requirement id"],
  [/(?<!(?:ADR|CCR|BEH|INV|ARCH)-)\bQD-87\b/, "a phase id"],
  [/\b[Pp]hase 87\b/, "a phase number"],
  [/-NEXT\b/, "a placeholder id"],
];
// `publishes from now on` is a status tape's own subscription time (five comments of the born test files, held byte for byte),
// not a time relative to a change; any other `from now on` is still refused.
const PHRASE = /this phase|until now|any more|no longer|(?<!publishes )from now on/i;
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

const isSrc = (file) => /^packages\/(?:devtools|core)\/src\/.*\.(?:ts|tsx|mts)$/.test(file);
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
 * Reasons added source and test lines use a forbidden form. A file in `packages/{devtools,core}/src` also gets the
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

const MODEL = "packages/devtools/src/model/";
const STATED = `${MODEL}StatedRun.ts`;
const PROLOGUE = `${MODEL}ConfigurePrologue.ts`;
const SUPERSEDING = `${MODEL}SupersedingRun.ts`;
const TIMELINE = `${MODEL}TimelineFeed.ts`;
const DIAGNOSTICS = `${MODEL}DiagnosticsFeed.ts`;
const GATES = `${MODEL}GatesFeed.ts`;
const SESSION = `${MODEL}SimulationSession.ts`;
const SIMULATOR = "packages/devtools/src/react/Simulator.tsx";
const STOPPED_BOX = "packages/devtools/src/react/StoppedBox.tsx";
const THEME = "packages/devtools/src/react/theme.ts";
const BARRELS = ["packages/devtools/src/index.ts", "packages/devtools/src/react/index.ts"];
const BUILT_FEEDS = "packages/devtools/test/builtFeeds.ts";
const SUPERSEDING_TEST = "packages/devtools/test/model/SupersedingRun.test.ts";
const STATED_TEST = "packages/devtools/test/model/StatedRun.test.ts";

const collapse = (s) => s.replace(/\s+/g, " ").trim();
const count = (code, re) => [...code.matchAll(re)].length;
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

/** The text inside the parentheses of the first call whose opening text `re` matches (it must end at the `(`), or undefined. */
const callArgs = (code, re) => {
  const m = re.exec(code);
  if (m === null) return undefined;
  const open = m.index + m[0].length - 1;
  const end = closeOf(code, open);
  return end < 0 ? undefined : code.slice(open + 1, end - 1);
};

/** The text of the braces that open at the first `{` at or after `from`, or undefined. */
const blockFrom = (code, from) => {
  const open = code.indexOf("{", from);
  if (open < 0) return undefined;
  const end = closeOf(code, open);
  return end < 0 ? undefined : code.slice(open, end);
};

/** The body of the arrow or function a `const <name> =` declaration binds, or undefined. */
const arrowBody = (code, name) => {
  const m = new RegExp(`\\bconst ${name}\\s*=[^{]*?=>\\s*\\{`).exec(code);
  if (m === null) return undefined;
  const open = m.index + m[0].length - 1;
  const end = closeOf(code, open);
  return end < 0 ? undefined : code.slice(open, end);
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

/** The expression a `name:` property holds in the text of an argument list, up to its comma at the top level, or undefined. */
const propExpr = (args, name) => {
  const m = new RegExp(`\\b${name}\\s*:`).exec(args);
  if (m === null) return undefined;
  const rest = args.slice(m.index + m[0].length);
  let depth = 0;
  for (let i = 0; i < rest.length; i++) {
    const c = rest[i];
    if ("([{".includes(c)) depth++;
    else if (")]}".includes(c)) {
      if (depth === 0) return rest.slice(0, i);
      depth--;
    } else if (c === "," && depth === 0) return rest.slice(0, i);
  }
  return rest;
};

const barrelNames = (barrels, re, what, file) =>
  barrels.filter(({ text }) => re.test(blank(text, true))).map((b) => `${b.file} names ${what}: ${file} stays out of the barrel`);

/** A runtime import (one that is not `import type`) in comment-free text with strings kept. */
const runtimeImports = (kept) => [...kept.matchAll(/^[ \t]*import\b(?!\s+type\b)/gm)].length;

const STATED_IMPORTS = ["effect/Effect", "effect/Exit", "effect/Scope", "@qadi/core", "./SupersedingRun.ts"];

/**
 * Reasons `StatedRun.ts` is not the one package-private run that states its stop. `stated` is its text or undefined;
 * `barrels` are `{ file, text }` of the two barrels. Tested on text with comments and strings blanked, the import
 * specifiers read with only comments blanked. Pure.
 */
export const judgeStatedRunShape = ({ stated, barrels }) => {
  const bad = barrelNames(barrels, /StatedRun/, "StatedRun", STATED);
  if (stated === undefined) return [`${STATED} is missing`, ...bad];
  const code = blank(stated);
  const kept = blank(stated, true);
  const imports = importsOf(kept);
  for (const { spec, line } of imports) if (!STATED_IMPORTS.includes(spec)) bad.push(`${STATED}:${line} imports ${spec}, not only ${STATED_IMPORTS.join(", ")}`);
  if (imports.some((i) => i.spec === "effect/Scope") && !/^[ \t]*import\s+type\b[^;]*["']effect\/Scope["']/m.test(kept)) bad.push(`${STATED} imports effect/Scope as a value, not a type`);
  if (!imports.some((i) => i.spec === "@qadi/core" && i.names.includes("causeMessage"))) bad.push(`${STATED} does not import causeMessage from @qadi/core`);
  if (!imports.some((i) => i.spec === "./SupersedingRun.ts" && i.names.includes("makeSupersedingRun"))) bad.push(`${STATED} does not import makeSupersedingRun from ./SupersedingRun.ts`);
  if (/\b(?:import|require)\s*\(/.test(code)) bad.push(`${STATED} loads a module by a call`);
  let decls = 0;
  for (const { text, line } of topLevel(code)) {
    const t = collapse(text);
    if (/^import\b/.test(t) || /^(?:export )?(?:declare )?(?:type|interface)\b/.test(t)) continue;
    if (/^export const makeStatedRun\b/.test(t)) {
      decls++;
      if (!/^export const makeStatedRun\s*=\s*Effect\.fn\(\s*function\s*\*/.test(t)) bad.push(`${STATED}:${line} makeStatedRun is not an unnamed Effect.fn(function* ...) factory`);
    } else bad.push(`${STATED}:${line} holds a module-scope statement that is not an import, a type or makeStatedRun: ${t.slice(0, 60)}`);
  }
  if (decls !== 1) bad.push(`${STATED} declares makeStatedRun ${decls} times, not once`);

  const start = arrowBody(code, "start");
  if (start === undefined) bad.push(`${STATED} has no start function`);
  else {
    const guard = start.search(/\bif\s*\(\s*[\w.]+\.closed\s*\(\s*\)\s*\)\s*return\b/);
    const begin = start.search(/\.begin\s*\(/);
    if (guard < 0) bad.push(`${STATED}: start does not return when the scope has closed`);
    if (begin < 0) bad.push(`${STATED}: start never calls begin(`);
    if (guard >= 0 && begin >= 0 && guard > begin) bad.push(`${STATED}: start calls begin( before it returns on closed()`);
    const tryAt = /\btry\s*\{/.exec(start);
    let tried;
    let finalized;
    if (tryAt !== null) {
      const open = start.indexOf("{", tryAt.index);
      const end = closeOf(start, open);
      tried = end < 0 ? undefined : start.slice(open, end);
      if (end >= 0 && /^\s*finally\s*\{/.test(start.slice(end))) finalized = blockFrom(start, end);
    }
    if (tried === undefined || !/\.starting\s*\(/.test(tried)) bad.push(`${STATED}: start does not publish in a try block that calls the plan's starting callback`);
    else if (/\bfork\s*\(/.test(tried)) bad.push(`${STATED}: start forks inside the try block, not in its finally`);
    if (finalized === undefined || !/\bfork\s*\(/.test(finalized)) bad.push(`${STATED}: start does not fork in the finally block that follows the try`);
    else if (/\.starting\s*\(/.test(finalized)) bad.push(`${STATED}: start publishes inside the finally block`);
    if (tryAt !== null && begin >= 0 && tryAt.index < begin) bad.push(`${STATED}: start publishes before it begins`);
  }

  const said = [...code.matchAll(/\bcauseMessage\s*\(/g)];
  if (said.length !== 1) bad.push(`${STATED} calls causeMessage( ${said.length} times, not once`);
  else {
    const before = code.slice(0, said[0].index);
    const ifs = [...before.matchAll(/\bif\s*\(/g)];
    const cond = ifs.length === 0 ? "" : before.slice(ifs[ifs.length - 1].index);
    if (!/\bisCurrent\s*\(/.test(cond) || !/\bExit\.isFailure\s*\(/.test(cond)) bad.push(`${STATED}: the stop is not gated by isCurrent( and Exit.isFailure( in one condition`);
  }
  if (/\bhasInterruptsOnly\b/.test(code)) bad.push(`${STATED} names hasInterruptsOnly: an interruption of its own work is a stop`);
  // The guard is the last `guard` signature (the interface comes first); its writer is the first call of its parameter.
  const sigs = [...code.matchAll(/\bguard\s*[:=]\s*(?:<[^>]*>)?\s*\(\s*(\w+)/g)];
  const sig = sigs[sigs.length - 1];
  const call = sig === undefined ? -1 : code.slice(sig.index).search(new RegExp(`(?<![\\w$.])${sig[1]}\\s*\\(`));
  if (call < 0) bad.push(`${STATED} has no guard that calls the writer it is given`);
  else if (!/\bisCurrent\s*\(/.test(code.slice(sig.index, sig.index + call))) bad.push(`${STATED}: the guard writes before it reads isCurrent(`);
  return bad;
};

const PROLOGUE_ORDER = [
  ["closed", /\.closed\s*\(/],
  ["complete", /\.complete\s*\(/],
  ["held", /\.held\s*\(/],
  ["same", /\.same\s*\(/],
  ["hold", /\.hold\s*\(/],
  ["steps", /\bsteps\s*\(/],
];

/** Reasons `ConfigurePrologue.ts` is not the one configure prologue, in the order the feeds read it. Pure. */
export const judgePrologueShape = ({ prologue, barrels }) => {
  const bad = barrelNames(barrels, /ConfigurePrologue|\bmakeConfigure\b|ConfigureRule/, "the configure prologue", PROLOGUE);
  if (prologue === undefined) return [`${PROLOGUE} is missing`, ...bad];
  const kept = blank(prologue, true);
  const code = blank(prologue);
  if (runtimeImports(kept) > 0) bad.push(`${PROLOGUE} has a runtime import: it imports types only`);
  if (/\b(?:import|require)\s*\(/.test(code)) bad.push(`${PROLOGUE} loads a module by a call`);
  const decl = code.search(/\bexport const makeConfigure\b/);
  if (decl < 0 || count(code, /\bexport const makeConfigure\b/g) !== 1) return [...bad, `${PROLOGUE} does not declare makeConfigure once`];
  const body = code.slice(decl);
  let prev = { name: "", at: -1 };
  for (const [name, re] of PROLOGUE_ORDER) {
    const at = body.search(re);
    if (at < 0) bad.push(`${PROLOGUE}: makeConfigure never calls ${name}(`);
    else if (at < prev.at) bad.push(`${PROLOGUE}: makeConfigure calls ${name}( before ${prev.name}(`);
    else prev = { name, at };
  }
  return bad;
};

const BANNED_IN_FEEDS = /\b(?:makeSupersedingRun|begin|fork|isCurrent|causeMessage|finally|hasInterruptsOnly)\b/g;

const supplyOnly = (file, text) => {
  if (text === undefined) return [`${file} is missing`];
  const code = blank(text);
  const bad = [];
  const stated = count(code, /\bmakeStatedRun\s*\(/g);
  if (stated !== 1) bad.push(`${file} builds ${stated} stated runs, not one`);
  const configures = count(code, /\bmakeConfigure\s*\(/g);
  if (configures !== 1) bad.push(`${file} builds ${configures} configure prologues, not one`);
  for (const name of new Set([...code.matchAll(BANNED_IN_FEEDS)].map((m) => m[0]))) bad.push(`${file} names ${name}, which the stated run keeps`);
  return bad;
};

const gatesShape = (text) => {
  if (text === undefined) return [`${GATES} is missing`];
  const code = blank(text);
  const bad = [];
  if (/\bmakeStatedRun\b/.test(code)) bad.push(`${GATES} names makeStatedRun: it has no stated run`);
  const supers = count(code, /\bmakeSupersedingRun\s*\(/g);
  if (supers !== 1) bad.push(`${GATES} builds ${supers} superseding runs, not one`);
  const configures = count(code, /\bmakeConfigure\s*\(/g);
  if (configures !== 1) bad.push(`${GATES} builds ${configures} configure prologues, not one`);
  const args = callArgs(code, /\bmakeConfigure\s*\(/);
  if (args !== undefined) {
    const same = propExpr(args, "same");
    if (same === undefined || !/\bwatchFailure\b/.test(same)) bad.push(`${GATES}: the identity gate of makeConfigure does not read watchFailure`);
    const cadence = args.search(/\bcadence\s*\(/);
    const publish = args.search(/\bpublish\s*\(/);
    if (cadence < 0) bad.push(`${GATES}: the steps of makeConfigure never call cadence(`);
    else if (publish >= 0 && publish < cadence) bad.push(`${GATES}: the steps of makeConfigure publish before they call cadence(`);
  }
  const cadenceBody = arrowBody(code, "cadence");
  if (cadenceBody === undefined) bad.push(`${GATES} has no cadence function`);
  else {
    const fork = cadenceBody.search(/\.fork\s*\(/);
    const publish = cadenceBody.search(/\bpublish\s*\(/);
    if (fork < 0) bad.push(`${GATES}: the cadence never forks its own superseding run`);
    else if (publish >= 0 && publish < fork) bad.push(`${GATES}: the cadence publishes before it forks (INV-QD-408)`);
  }
  return bad;
};

const FEED_FILES = { timeline: TIMELINE, diagnostics: DIAGNOSTICS, gates: GATES };

/**
 * Reasons the feeds supply only their engine. `texts` maps `timeline`, `diagnostics` and `gates` to the feed's text (or
 * undefined); `which` names the feeds judged. The timeline and diagnostics feeds build one stated run and one prologue
 * and name none of the run protocol; the gates feed builds one prologue whose identity gate reads `watchFailure`, still
 * builds its own superseding run, and forks its cadence before it publishes. Pure.
 */
export const judgeFeedsSupplyOnly = (texts, which) =>
  which.flatMap((name) => (name === "gates" ? gatesShape(texts.gates) : supplyOnly(FEED_FILES[name], texts[name])));

/** Reasons `SimulationSession.ts` does not start its runs through the stated run or states a cause unlike the feeds. Pure. */
export const judgeSessionStop = (session) => {
  if (session === undefined) return [`${SESSION} is missing`];
  const kept = blank(session, true);
  const code = blank(session);
  const bad = [];
  const imports = importsOf(kept);
  if (!imports.some((i) => i.spec === "@qadi/core" && i.names.includes("causeMessage"))) bad.push(`${SESSION} does not import causeMessage from @qadi/core`);
  if (!imports.some((i) => i.spec === "./StatedRun.ts" && i.names.includes("makeStatedRun"))) bad.push(`${SESSION} does not import makeStatedRun from ./StatedRun.ts`);
  const built = count(code, /\bmakeStatedRun\s*\(/g);
  if (built !== 1) bad.push(`${SESSION} builds ${built} stated runs, not one`);
  const stop = callArgs(kept, /\bmakeStatedRun\s*\(/);
  if (stop !== undefined && !/^\(?\s*\w+\s*(?::\s*string\s*)?\)?\s*=>\s*\{\s*if\s*\(\s*run\._tag\s*!==\s*"Running"\s*\)\s*return\s*;/.test(collapse(stop))) bad.push(`${SESSION}: the stop hook does not begin by returning unless run._tag is "Running"`);
  for (const [re, what] of [[/\bmakeSupersedingRun\b/, "makeSupersedingRun"], [/\.begin\s*\(/, "begin("], [/\.fork\s*\(/, "fork("]]) if (re.test(code)) bad.push(`${SESSION} names ${what}: a run starts only through the stated run`);
  if (!/\.start\s*\(/.test(code)) bad.push(`${SESSION} never starts a run through the stated run`);
  const land = /\bconst land\s*=\s*Effect\.fn\(\s*"qadi\.devtools\.simulationSession\.run"\s*,\s*\{\s*root\s*:\s*true\s*\}\s*,?\s*\)/.exec(kept);
  if (land === null) bad.push(`${SESSION}: land is not Effect.fn("qadi.devtools.simulationSession.run", { root: true })`);
  else {
    const rest = code.slice(land.index + land[0].length);
    const fn = /function\s*\*/.exec(rest);
    const params = fn === null ? -1 : rest.indexOf("(", fn.index);
    const paramsEnd = params < 0 ? -1 : closeOf(rest, params);
    const body = paramsEnd < 0 ? undefined : blockFrom(rest, paramsEnd);
    if (body === undefined) bad.push(`${SESSION}: the body of land could not be read`);
    else {
      if (!/\bEffect\.exit\s*\(/.test(body)) bad.push(`${SESSION}: land does not read its own exit with Effect.exit(`);
      if (count(body, /\bmessage\s*:\s*causeMessage\s*\(\s*exit\.cause\s*\)/g) !== 1) bad.push(`${SESSION}: land does not write Broke.message as causeMessage(exit.cause)`);
    }
  }
  if (/\bString\s*\([^)]*\bcause\b/.test(code)) bad.push(`${SESSION} calls String on a cause`);
  return bad;
};

/** Reasons the Simulator's broken-run box is not the stopped box's labelled preformatted block. Pure. */
export const judgeSimulatorPre = ({ simulator, theme, stopped }) => {
  const bad = [];
  if (simulator === undefined) bad.push(`${SIMULATOR} is missing`);
  else {
    const kept = blank(simulator, true);
    const at = kept.indexOf("qadi-simulator-broke");
    const end = at < 0 ? -1 : kept.indexOf("</section>", at);
    if (at < 0 || end < 0) bad.push(`${SIMULATOR} has no Broke box (qadi-simulator-broke)`);
    else {
      const arm = kept.slice(at, end);
      const tag = /<pre\b[\s\S]*?>/.exec(arm)?.[0];
      if (tag === undefined) bad.push(`${SIMULATOR}: the Broke box holds no pre`);
      else {
        if (!/\brole\s*=\s*"group"/.test(tag)) bad.push(`${SIMULATOR}: the Broke pre has no role="group"`);
        if (!/\baria-label\s*=\s*"Why the simulation failed"/.test(tag)) bad.push(`${SIMULATOR}: the Broke pre is not labelled "Why the simulation failed"`);
        if (!/\btabIndex\s*=\s*\{\s*0\s*\}/.test(tag)) bad.push(`${SIMULATOR}: the Broke pre is not focusable (tabIndex={0})`);
        if (!/\bstyle\s*=\s*\{\s*reasonStyle\s*\}/.test(tag)) bad.push(`${SIMULATOR}: the Broke pre does not take style={reasonStyle}`);
        if (!/<pre\b[\s\S]*?>\s*\{\s*broke\.message\s*\}\s*<\/pre>/.test(arm)) bad.push(`${SIMULATOR}: the Broke pre does not hold {broke.message} alone`);
      }
      if (/<span\b/.test(arm)) bad.push(`${SIMULATOR}: the Broke box still holds a span`);
    }
    if (!importsOf(kept).some((i) => i.spec === "./theme.ts" && i.names.includes("reasonStyle"))) bad.push(`${SIMULATOR} does not import reasonStyle from ./theme.ts`);
  }
  if (theme === undefined || !/^export const reasonStyle\b/m.test(blank(theme))) bad.push(`${THEME} does not export reasonStyle`);
  if (stopped === undefined) bad.push(`${STOPPED_BOX} is missing`);
  else {
    const kept = blank(stopped, true);
    if (!importsOf(kept).some((i) => i.spec === "./theme.ts" && i.names.includes("reasonStyle"))) bad.push(`${STOPPED_BOX} does not import reasonStyle from ./theme.ts`);
    if (/\b(?:const|let|var)\s+reasonStyle\b/.test(blank(stopped))) bad.push(`${STOPPED_BOX} still declares reasonStyle`);
  }
  return bad;
};

const FAILURE_FREE = [SUPERSEDING, TIMELINE, DIAGNOSTICS, GATES, SESSION, SUPERSEDING_TEST];

/**
 * Reasons the failure hook is not gone. `files` are every `{ file, text }` of the package; `ForkHooks` is read in all of
 * them, `onFailure` in the run module, the stores that used it and the run module's test, and `fork` of the run module
 * takes two parameters. Raw text is read, comments included: a doc naming a removed hook is stale. Pure.
 */
export const judgeOnFailureGone = (files) => {
  const bad = [];
  for (const { file, text } of files) {
    if (/\bForkHooks\b/.test(text)) bad.push(`${file} names ForkHooks`);
    if (FAILURE_FREE.includes(file) && /\bonFailure\b/.test(text)) bad.push(`${file} names onFailure`);
  }
  const run = files.find((f) => f.file === SUPERSEDING);
  if (run === undefined) bad.push(`${SUPERSEDING} is missing`);
  else {
    const code = blank(run.text);
    const lists = [...code.matchAll(/\bfork\s*[:=]\s*\(/g)].map((m) => {
      const open = m.index + m[0].length - 1;
      return code.slice(open + 1, closeOf(code, open) - 1);
    });
    if (lists.length === 0) bad.push(`${SUPERSEDING} declares no fork`);
    for (const n of new Set(lists.map((list) => paramsOf(list).length))) if (n !== 2) bad.push(`${SUPERSEDING}: fork takes ${n} parameters, not 2`);
  }
  return bad;
};

const BUILT_EXPORTS = ["timelineFeedOf", "diagnosticsFeedOf", "gatesFeedOf", "dockModelOf"];

/** Reasons `test/builtFeeds.ts` does not build and configure through one helper. Pure. */
export const judgeBuiltFeedsOnce = (text) => {
  if (text === undefined) return [`${BUILT_FEEDS} is missing`];
  const code = blank(text);
  const taps = count(code, /\bEffect\.tap\s*\(/g);
  if (taps !== 1) return [`${BUILT_FEEDS} has ${taps} Effect.tap( calls, not 1`];
  const statements = topLevel(code).map((s) => collapse(s.text));
  const helper = /^(?:export )?const (\w+)/.exec(statements.find((s) => /\bEffect\.tap\s*\(/.test(s)) ?? "")?.[1];
  if (helper === undefined) return [`${BUILT_FEEDS}: the Effect.tap( is not in a module-scope const`];
  if (BUILT_EXPORTS.includes(helper)) return [`${BUILT_FEEDS}: ${helper}, the helper, is one of the four exports`];
  const bad = [];
  for (const name of BUILT_EXPORTS) {
    const statement = statements.find((s) => new RegExp(`^export const ${name}\\b`).test(s));
    if (statement === undefined) bad.push(`${BUILT_FEEDS} does not export ${name}`);
    else if (count(statement, new RegExp(`\\b${helper}\\s*(?:<[^()]*>)?\\s*\\(`, "g")) !== 1) bad.push(`${BUILT_FEEDS}: ${name} does not call ${helper}( once`);
  }
  return bad;
};

/** The vitest rows of a JSON report: `{ file, title, status }`. */
const rowsOfReport = (report) => report.testResults.flatMap((f) => f.assertionResults.map((a) => ({ file: f.name, title: a.title, status: a.status })));
/** The titles the evidence file lists as red on the base. */
export const redOnBase = (evidence) => new Set([...evidence.matchAll(/^- red on the base: (.*)$/gm)].map((m) => m[1]));

/**
 * Reasons a vitest JSON report of the devtools project is not acceptable: a failing row that the evidence does not list
 * as red on the base, a test file that failed to load, a base test file that did not run, a named row that does not
 * pass, and with `green` any failure. `baseTests` are the `*.test.ts(x)` paths under the test directory at phase_base.
 */
export const judgeSuite = ({ report, allowed, baseTests, passing, green }) => {
  const bad = [];
  for (const f of report.testResults) {
    if (f.assertionResults.length === 0 || (typeof f.message === "string" && f.message !== "")) bad.push(`${f.name} failed to load`);
  }
  const rows = rowsOfReport(report);
  for (const r of rows.filter((x) => x.status === "failed")) {
    if (green) bad.push(`${r.title} fails`);
    else if (!allowed.has(r.title)) bad.push(`${r.title} fails and is not red on the base`);
  }
  const ran = report.testResults.map((f) => f.name);
  for (const path of baseTests) if (!ran.some((n) => n === path || n.endsWith(`/${path}`))) bad.push(`${path} did not run`);
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

const SCREENS = "spec/behaviors/28-devtools-screens.md";
const SIMULATOR_SPEC = "spec/behaviors/29-devtools-simulator.md";
/** The behaviors whose pinned-by paragraph `records` reads; the first thirteen exist today and must stay. */
const PINNED_KEPT = [461, 507, 519, 521, 522, 523, 524, 525, 636, 637, 742, 744, 745];
/** The behaviors the phase writes, each in the document it belongs to. */
const NEW_BEHAVIORS = [
  [771, SCREENS],
  [772, SCREENS],
  [773, SCREENS],
  [774, SIMULATOR_SPEC],
  [775, SIMULATOR_SPEC],
];
const PINNED = [...PINNED_KEPT, ...NEW_BEHAVIORS.map(([n]) => n)];
/** The invariants the phase writes, and the file each one's `**Source**:` line names. */
const NEW_INVARIANTS = [
  [419, "StatedRun.ts"],
  [420, "ConfigurePrologue.ts"],
];
/** The decisions the phase amends: their file number, and the revision each reaches. */
const AMENDED_DECISIONS = [
  ["047", "1.24"],
  ["150", "1.1"],
  ["182", "1.2"],
  ["192", "1.7"],
  ["194", "1.4"],
  ["196", "1.4"],
];
/** The rows of the new decision's audit table: each names the property it pinned and a test that holds it now. */
const AUDIT_KEYS = ["R3", "R5", "R6", "R7", "R9", "law 5", "law 7"];

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
const TEST_PATH = /`((?:packages\/[^`\s]+|test\/[^`\s]+)\.(?:tsx?|mts))`/g;
const inPackage = (path) => (path.startsWith("packages/") ? path : `packages/devtools/${path}`);

/** The `{ file, text }` whose document holds the section of behavior `n`, or undefined. */
const behaviorSection = (behaviors, n) => {
  for (const { text } of behaviors) {
    const section = sectionOf(text, `BEH-QD-${n}:`);
    if (section !== undefined) return section;
  }
  return undefined;
};

/**
 * Reasons a behavior's pinned-by paragraph names a test file or a title that does not exist. A quoted title or a row id
 * belongs to the file named before it, and a quoted title ahead of the first file belongs to that first file.
 */
const judgePinned = (behaviors, n, tests) => {
  const section = behaviorSection(behaviors, n);
  if (section === undefined) return PINNED_KEPT.includes(n) ? [`BEH-QD-${n} has no heading in the behavior documents`] : [];
  const para = pinnedPara(section);
  const paths = [...para.matchAll(TEST_PATH)];
  const bad = paths.length === 0 ? [`BEH-QD-${n} names no test file in a Pinned by paragraph`] : [];
  paths.forEach((p, i) => {
    const file = inPackage(p[1]);
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

/** The anchor a markdown heading gets: lower case, punctuation dropped, spaces to hyphens. */
export const anchorOf = (heading) =>
  heading
    .toLowerCase()
    .replace(/[^a-z0-9 _-]/g, "")
    .replace(/ /g, "-");

/** The sentence of `ThrownMessage.ts` that follows "`String` of a" across its line break, or undefined. */
export const thrownSentence = (text) => /`String` of a ([^.]*\.)/.exec(collapse(text.replace(/^[ \t]*\*[ \t]?/gm, "")))?.[1];

/** The names a table row holds: each `R<n>` (a range `R5 to R7` expanded) and each `law <n>`. */
const auditNames = (line) => {
  const names = new Set();
  for (const r of line.matchAll(/(?<![\w-])R(\d+) to R(\d+)(?![\w-])/g)) for (let k = Number(r[1]); k <= Number(r[2]); k++) names.add(`R${k}`);
  for (const r of line.matchAll(/(?<![\w-])R(\d+)(?![\w-])/g)) names.add(`R${r[1]}`);
  for (const r of line.matchAll(/\blaw (\d+)\b/g)) names.add(`law ${r[1]}`);
  return names;
};

const adrChecks = (adr, statedTest) => {
  const bad = [];
  if (adr === undefined) return ["spec/decisions/200-*.md does not exist"];
  if (!adr.text.includes("QADI-ADR-200")) bad.push("the ADR-QD-200 file does not carry QADI-ADR-200");
  const lines = adr.text.split("\n");
  const rows = lines.filter((l) => l.trimStart().startsWith("|"));
  const titles = statedTest === undefined ? [] : titlesOf(statedTest);
  if (statedTest === undefined) bad.push(`${STATED_TEST} does not exist`);
  for (const key of AUDIT_KEYS) {
    const named = rows.filter((l) => auditNames(l).has(key));
    if (named.length === 0) bad.push(`the ADR-QD-200 audit table has no row naming ${key}`);
    for (const row of named) {
      const ids = [...row.matchAll(/(?<![\w-])(ST\d+)(?![\w-])/g)].map((m) => m[1]);
      if (ids.length === 0) bad.push(`the ADR-QD-200 audit row naming ${key} names no ST row of the new test`);
      for (const id of ids) if (!titles.some((t) => t.startsWith(id) && !/[A-Za-z0-9]/.test(t[id.length] ?? ""))) bad.push(`the ADR-QD-200 audit row naming ${key} names ${id}, which is no title in ${STATED_TEST}`);
    }
  }
  const at = lines.findIndex((l) => l.trim() === "Tests removed: 1.");
  if (at < 0) bad.push("the ADR-QD-200 file has no line `Tests removed: 1.`");
  else {
    let k = at - 1;
    while (k >= 0 && lines[k].trim() === "") k--;
    if (k < 0 || !lines[k].trimStart().startsWith("|")) bad.push("the line `Tests removed: 1.` does not follow the audit table");
  }
  if (!lines.some((l) => l.includes("AuditWriteReport.ts"))) bad.push("the ADR-QD-200 file has no line naming AuditWriteReport.ts");
  if (!lines.some((l) => l.includes("interrupts itself") && l.includes("Stopped"))) bad.push("the ADR-QD-200 file has no line holding both `interrupts itself` and `Stopped`");
  return bad;
};

/**
 * Reasons the records written at the close are missing or wrong. `close` is `{ invariants, invariantsBase, decisions,
 * index, readme, specTexts, thrownBase, thrownNow, statedTest }`: the current and the phase_base text of the invariants,
 * every decision file, the decision index, the readme, every `{ file, text }` under `spec/`, the base and current text
 * of `ThrownMessage.ts` and the new test file (or undefined).
 */
const judgeClosed = ({ trace, behaviors }, close) => {
  const bad = [];
  const one = sectionOf(trace, "§1 ") ?? "";
  for (const [n, file] of NEW_BEHAVIORS) {
    const doc = behaviors.find((b) => b.file === file);
    if (doc === undefined || sectionOf(doc.text, `BEH-QD-${n}:`) === undefined) bad.push(`BEH-QD-${n} has no heading in ${file}`);
    if (!covers(one, n)) bad.push(`BEH-QD-${n} has no row in spec/traceability.md §1`);
  }
  const two = sectionOf(trace, "§2 ") ?? "";
  for (const [n, source] of NEW_INVARIANTS) {
    if (!new RegExp(`^## INV-QD-${n}:`, "m").test(close.invariants)) bad.push(`INV-QD-${n} has no heading in spec/invariants.md`);
    if (!new RegExp(`^\\| \\[INV-QD-${n}\\]`, "m").test(two)) bad.push(`INV-QD-${n} has no row in spec/traceability.md §2`);
    const line = /^\*\*Source\*\*:.*$/m.exec(sectionOf(close.invariants, `INV-QD-${n}:`) ?? "")?.[0];
    if (line === undefined) bad.push(`INV-QD-${n} has no **Source**: line`);
    else if (!line.includes(source)) bad.push(`the **Source**: line of INV-QD-${n} does not name ${source}`);
  }
  const retitled = /^## INV-QD-313:.*$/m.exec(close.invariants)?.[0];
  if (retitled === undefined || !retitled.includes("from outside")) bad.push("the heading of INV-QD-313 does not say `from outside`");
  const was = /^## (INV-QD-313:.*)$/m.exec(close.invariantsBase)?.[1];
  if (was === undefined) bad.push("INV-QD-313 has no heading at phase_base");
  else {
    const anchor = anchorOf(was);
    for (const { file, text } of close.specTexts) if (text.includes(anchor)) bad.push(`${file} still links the base anchor #${anchor}`);
  }
  bad.push(...adrChecks(close.decisions.find((d) => /(?:^|\/)200-[^/]*[.]md$/.test(d.file)), close.statedTest));
  if (!/^\s*-\s*id:\s*"ADR-QD-200"/m.test(close.index)) bad.push("spec/decisions/index.yaml has no ADR-QD-200 entry");
  if (!/^\| \[ADR-QD-200\]/m.test(sectionOf(trace, "§3 ") ?? "")) bad.push("ADR-QD-200 has no row in spec/traceability.md §3");
  for (const [number, revision] of AMENDED_DECISIONS) {
    const d = close.decisions.find((x) => new RegExp(`(?:^|/)${number}-[^/]*[.]md$`).test(x.file));
    if (d === undefined) bad.push(`spec/decisions/${number}-*.md does not exist`);
    else {
      if (!new RegExp(`^>\\s*\\|\\s*Revision\\s*\\|\\s*${revision.replace(".", "\\.")}\\s*\\|`, "m").test(d.text)) bad.push(`ADR-QD-${number} is not at Revision ${revision}`);
      if (!d.text.includes("ADR-QD-200")) bad.push(`ADR-QD-${number} does not name ADR-QD-200`);
    }
  }
  const ccr = /^\| CCR-QD-479 \|.*$/m.exec(close.readme);
  if (ccr === null) bad.push("spec/README.md has no CCR-QD-479 row");
  else {
    if (!ccr[0].includes("ARCH-134")) bad.push("the CCR-QD-479 row does not name ARCH-134");
    if (!ccr[0].includes("Unused: none")) bad.push("the CCR-QD-479 row does not say Unused: none");
  }
  const sentence = thrownSentence(close.thrownBase);
  if (sentence === undefined) bad.push("the base ThrownMessage.ts has no sentence after `String` of a");
  else if (collapse(close.thrownNow.replace(/^[ \t]*\*[ \t]?/gm, "")).includes(sentence)) bad.push("ThrownMessage.ts still holds the sentence ADR-QD-182 decision 11 quoted");
  return bad;
};

/**
 * Reasons the records name tests that do not exist, and with `close` every reserved record is not written. `trace` is
 * the text of `spec/traceability.md`; `behaviors` is `[{ file, text }]` of the two behavior documents; `tests(path)` is a
 * test file's text or undefined; `close` is undefined or the object `judgeClosed` reads.
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

const done = (bad, ok) => {
  if (bad.length > 0) fail(bad);
  console.log(ok);
};

const readText = (file) => readFileSync(file, "utf8");

const SPEC_FILES = () => git("ls-files", "-co", "--exclude-standard", "--", "spec").split("\n").filter((p) => p !== "");
const packageFiles = () =>
  git("ls-files", "-co", "--exclude-standard", "--", "packages/devtools")
    .split("\n")
    .filter((p) => /\.(?:ts|tsx|mts)$/.test(p) && existsSync(p));
const maybe = (path) => (existsSync(path) ? readText(path) : undefined);
const FEED_NAMES = ["timeline", "diagnostics", "gates"];

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
    const all = commitsSince(readBase());
    const bad = all.flatMap((c) => judgeTrailer(c.message).map((r) => `${c.sha.slice(0, 8)} ${c.subject}: ${r}`));
    return done(bad, `trailers: ${all.length} commits since phase_base, each with the one trailer`);
  },
  suite: (args) => {
    const [reportPath, ...flags] = args;
    const usage = ["usage: suite <report> [--green | --passing <id>...]"];
    if (reportPath === undefined) return fail(usage);
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
    const baseTests = git("ls-tree", "-r", "--name-only", base, "--", "packages/devtools/test")
      .split("\n")
      .filter((p) => /\.test\.tsx?$/.test(p));
    const allowed = redOnBase(existsSync(EVIDENCE) ? readText(EVIDENCE) : "");
    if (allowed.size === 0) return fail(["the evidence file lists no row red on the base"]);
    const failing = report.testResults.flatMap((f) => f.assertionResults).filter((a) => a.status === "failed").length;
    return done(judgeSuite({ report, allowed, baseTests, passing, green }), `suite: ${failing} failing row(s), ${green ? "none allowed" : "each red on the base"}; ${baseTests.length} base test files ran`);
  },
  "stated-run-shape": () => {
    const barrels = BARRELS.map((file) => ({ file, text: readText(file) }));
    return done(judgeStatedRunShape({ stated: maybe(STATED), barrels }), "stated-run-shape: StatedRun.ts is the one run that states its stop");
  },
  "prologue-shape": () => {
    const barrels = BARRELS.map((file) => ({ file, text: readText(file) }));
    return done(judgePrologueShape({ prologue: maybe(PROLOGUE), barrels }), "prologue-shape: ConfigurePrologue.ts is the one configure prologue");
  },
  "feeds-supply-only-engine": (args) => {
    const which = args.length === 0 ? FEED_NAMES : args;
    const unknown = which.filter((w) => !FEED_NAMES.includes(w));
    if (unknown.length > 0) return fail([`usage: feeds-supply-only-engine [${FEED_NAMES.join("|")} ...]; not a feed: ${unknown.join(", ")}`]);
    const texts = { timeline: maybe(TIMELINE), diagnostics: maybe(DIAGNOSTICS), gates: maybe(GATES) };
    return done(judgeFeedsSupplyOnly(texts, which), `feeds-supply-only-engine: ${which.join(", ")} supply only their engine`);
  },
  "session-stop": () => done(judgeSessionStop(maybe(SESSION)), "session-stop: the session starts its runs through the stated run"),
  "simulator-pre": () => done(judgeSimulatorPre({ simulator: maybe(SIMULATOR), theme: maybe(THEME), stopped: maybe(STOPPED_BOX) }), "simulator-pre: the broken-run box is a labelled preformatted block"),
  "onfailure-gone": () => done(judgeOnFailureGone(packageFiles().map((file) => ({ file, text: readText(file) }))), "onfailure-gone: no failure hook remains"),
  "built-feeds-once": () => done(judgeBuiltFeedsOnce(maybe(BUILT_FEEDS)), "built-feeds-once: test/builtFeeds.ts builds and configures through one helper"),
  records: (args) => {
    const close = args[0] === "--close";
    if (args.length > 0 && !close) return fail(["usage: records [--close]"]);
    const behaviors = [SCREENS, SIMULATOR_SPEC].map((file) => ({ file, text: readText(file) }));
    const tests = (path) => maybe(path);
    const extra = close
      ? (() => {
          const base = readBase();
          return {
            invariants: readText("spec/invariants.md"),
            invariantsBase: git("show", `${base}:spec/invariants.md`),
            decisions: readdirSync("spec/decisions").filter((f) => /^\d+-.*[.]md$/.test(f)).map((f) => ({ file: f, text: readText(`spec/decisions/${f}`) })),
            index: readText("spec/decisions/index.yaml"),
            readme: readText("spec/README.md"),
            specTexts: SPEC_FILES().filter((f) => existsSync(f)).map((file) => ({ file, text: readText(file) })),
            thrownBase: git("show", `${base}:packages/core/src/ThrownMessage.ts`),
            thrownNow: readText("packages/core/src/ThrownMessage.ts"),
            statedTest: maybe(STATED_TEST),
          };
        })()
      : undefined;
    const ok = "records: the pinned-by lists name tests that exist";
    return done(judgeRecords({ trace: readText("spec/traceability.md"), behaviors, tests }, extra), close ? `${ok}, and every reserved record is written` : ok);
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
  for (const line of ["// D-49 says", "see 87-03", "STOP-02 holds", "WX-05", "QD-87 closes", "Phase 87 added", "phase 87", "ADR-QD-NEXT", "x BEH-QD-NEXT y"]) {
    eq(`${line} is flagged`, judgeIds([idEntry("packages/devtools/src/a.ts", line)]).length, 1);
  }
  for (const line of ["ADR-QD-200", "INV-QD-419", "BEH-QD-771", "D-49-a", "CCR-QD-479", "ARCH-134", "ADR-QD-87", "a 1287-03x", "x187-03", "STOP-1", "Phase 870"]) {
    eq(`${line} is not flagged`, judgeIds([idEntry("packages/devtools/src/a.ts", line)]), []);
  }
  for (const line of ["this phase", "Until Now", "any more", "no longer", "from now on", "it holds from now on", "publishes, from now on"]) {
    eq(`${line} is flagged in source`, judgeIds([idEntry("packages/devtools/src/a.ts", line)]).length, 1);
  }
  eq("a status tape's own subscription time is not phase-relative", judgeIds([idEntry("packages/devtools/test/a.test.ts", "/** The tag of every status a feed publishes from now on, in order. */")]), []);
  eq("a changeset may say no longer", judgeIds([idEntry(".changeset/a.md", "no longer")]), []);
  eq("the upgrade guide may say no longer", judgeIds([idEntry("apps/website/src/content/docs/docs/reference/upgrading.md", "no longer")]), []);
  eq("a changeset is still scanned for ids", judgeIds([idEntry(".changeset/a.md", "STOP-01")]).length, 1);
  const spec = "# Title\nno longer here\n## Change History\n| 1 | no longer a row |\n";
  eq("a phrase before the change history is flagged", judgeIds([{ file: "spec/a.md", text: spec, added: new Set([2]) }]).length, 1);
  eq("a phrase in the change history is exempt", judgeIds([{ file: "spec/a.md", text: spec, added: new Set([4]) }]), []);
  const header = "> | Change History | 1.1 (2026-11-24): a row\n> | Status | no longer here\n";
  eq("a phrase in the Document Control history row is exempt", judgeIds([{ file: "spec/a.md", text: header.replace("a row", "no longer a row"), added: new Set([1]) }]), []);
  eq("a phrase in another Document Control row is flagged", judgeIds([{ file: "spec/a.md", text: header, added: new Set([2]) }]).length, 1);
  eq("an older entry of the Document Control history row is not new text", judgeIds([{ file: "spec/a.md", text: "> | Change History | 1.2 (2026-11-24): a row<br>1.1 (2026-11-10): D-01 approved, no longer<br>1.0 (2026-11-09): Initial\n", added: new Set([1]) }]), []);
  eq("an id in the Document Control history row is still flagged", judgeIds([{ file: "spec/a.md", text: "> | Change History | 1.1 (2026-11-24): STOP-01\n", added: new Set([1]) }]).length, 1);

  const src = "packages/devtools/src/model/A.ts";
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
  const PLAN = "docs(87-01): record";
  const log = [c("docs(87): create phase plan", [".planning/a.md"]), c("docs(phase-87): add pattern map", [".planning/b.md"]), c(PLAN, ["b", "a"]), c("chore(87-01): next", ["z"])];
  eq("--first passes over planning commits that change only .planning", judgeCommit(log, PLAN, ["a", "b"], true), []);
  eq("the second plan commit passes without --first", judgeCommit(log, "chore(87-01): next", ["z"], false), []);
  eq("--first on the second plan commit fails", judgeCommit(log, "chore(87-01): next", ["z"], true)[0].startsWith("the commit is not the first plan commit"), true);
  eq("a commit before the first plan commit that changes source fails", judgeCommit([c("docs(87): x", [".planning/a.md", "packages/x.ts"]), c(PLAN, ["a"])], PLAN, ["a"], true), ["docs(87): x precedes the first plan commit and changes packages/x.ts outside .planning"]);
  eq("a wrong subject fails", judgeCommit(log, "other", ["a"], false).length, 1);
  eq("an extra path fails", judgeCommit(log, PLAN, ["a"], false).length, 1);
  eq("a missing path fails", judgeCommit(log, PLAN, ["a", "b", "c"], false).length, 1);
  eq("a duplicate subject fails", judgeCommit([c(PLAN, ["a"]), c(PLAN, ["a"])], PLAN, ["a"], false).length, 1);
  eq("a commit without the trailer fails", judgeCommit([c(PLAN, ["a"], PLAN)], PLAN, ["a"], false).length, 1);
  eq("a Phase 86 subject is refused by commit", judgeCommit([c("docs(86-01): x", ["a"])], PLAN, ["a"], false).length, 1);
  eq("a Phase 86 subject is not a plan commit", PLAN_SUBJECT.test("docs(86-01): x"), false);
  eq("a Phase 87 subject is a plan commit", PLAN_SUBJECT.test("chore(87-12)!: x"), true);


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
  eq("the record's phase_base is read", phaseBaseOf(`{"phase":"87","phase_base":"${sha}"}`), sha);
  eq("a record with no phase_base gives none", phaseBaseOf('{"phase":"87"}'), undefined);
  eq("a phase_base that is not a full sha gives none", phaseBaseOf('{"phase_base":"cbe375bf"}'), undefined);
  eq("a record that is not JSON gives none", phaseBaseOf("nope"), undefined);
  eq("no record gives none", phaseBaseOf(undefined), undefined);

  // The suite judge over a vitest JSON report.
  const file = (name, rows, over = {}) => ({ name: `/r/${name}`, status: "passed", message: "", assertionResults: rows.map(([title, status]) => ({ title, status })), ...over });
  const report = (...files) => ({ testResults: files });
  const base = [file("pkg/a.test.ts", [["R1 x", "passed"], ["RED1 y", "failed"]]), file("pkg/b.test.ts", [["R2 z", "passed"], ["R10 w", "passed"]])];
  const allowed = new Set(["RED1 y"]);
  const baseTests = ["pkg/a.test.ts", "pkg/b.test.ts"];
  const suite1 = (over = {}, rep = report(...base)) => judgeSuite({ report: rep, allowed, baseTests, passing: [], green: false, ...over });
  eq("an allowed red row failing passes", suite1(), []);
  eq("a failing row that is not listed fails", suite1({}, report(file("pkg/a.test.ts", [["R1 x", "failed"], ["RED1 y", "failed"]]), base[1])), ["R1 x fails and is not red on the base"]);
  eq("a file with no assertion results failed to load", suite1({}, report(...base, file("pkg/c.test.ts", []))), ["/r/pkg/c.test.ts failed to load"]);
  eq("a file with a failure message failed to load", suite1({}, report(base[0], file("pkg/b.test.ts", [["R2 z", "passed"]], { message: "boom" }))), ["/r/pkg/b.test.ts failed to load"]);
  eq("a base test file missing from the report did not run", suite1({ baseTests: [...baseTests, "pkg/d.test.ts"] }), ["pkg/d.test.ts did not run"]);
  eq("--passing with a red row fails", suite1({ passing: ["RED1"] }), ["RED1 y is failed, not passed"]);
  eq("--passing with a green row passes", suite1({ passing: ["R1"] }), []);
  eq("--passing is not satisfied by a longer id", suite1({ passing: ["R1"] }, report(file("pkg/a.test.ts", [["R10 x", "failed"]]), file("pkg/b.test.ts", []))).includes("no row R1 is in the report"), true);
  eq("--passing with an id no row opens fails", suite1({ passing: ["ZZ9"] }), ["no row ZZ9 is in the report"]);
  eq("--green with a failure fails", suite1({ green: true }), ["RED1 y fails"]);
  eq("--green with none passes", suite1({ green: true }, report(file("pkg/a.test.ts", [["R1 x", "passed"]]), file("pkg/b.test.ts", [["R2 z", "passed"]]))), []);
  eq("the rows red on the base are read from the evidence", [...redOnBase("- red on the base: A one\n  - failed on: x\n- failed: B\n- red on the base: C two\n")], ["A one", "C two"]);

  // stated-run-shape.
  const statedOk = [
    'import * as Effect from "effect/Effect";',
    'import * as Exit from "effect/Exit";',
    'import type * as Scope from "effect/Scope";',
    'import { causeMessage } from "@qadi/core";',
    'import { makeSupersedingRun } from "./SupersedingRun.ts";',
    "",
    "/** A comment may say begin, fork, hasInterruptsOnly and String(cause). */",
    "export interface RunLive {",
    "  readonly current: () => boolean;",
    "  readonly guard: <A>(write: (a: A) => void) => (a: A) => void;",
    "}",
    "export interface RunPlan {",
    "  readonly starting: () => void;",
    "  readonly engine: (live: RunLive) => Effect.Effect<void, unknown>;",
    "}",
    "export interface StatedRun {",
    "  readonly start: (plan: RunPlan) => void;",
    "  readonly stop: () => void;",
    "  readonly closed: () => boolean;",
    "}",
    "",
    "export const makeStatedRun = Effect.fn(function* (",
    "  stopped: (reason: string) => void,",
    "): Effect.fn.Return<StatedRun, never, Scope.Scope> {",
    "  const runs = yield* makeSupersedingRun();",
    "  const start = (plan: RunPlan): void => {",
    "    if (runs.closed()) return;",
    "    const token = runs.begin();",
    "    const live: RunLive = {",
    "      current: () => runs.isCurrent(token),",
    "      guard: (write) => (value) => {",
    "        if (!runs.isCurrent(token)) return;",
    "        write(value);",
    "      },",
    "    };",
    "    try {",
    "      plan.starting();",
    "    } finally {",
    "      runs.fork(",
    "        token,",
    "        Effect.exit(plan.engine(live)).pipe(",
    "          Effect.flatMap((exit) =>",
    "            Effect.sync(() => {",
    "              if (runs.isCurrent(token) && Exit.isFailure(exit)) stopped(causeMessage(exit.cause));",
    "            }),",
    "          ),",
    "        ),",
    "      );",
    "    }",
    "  };",
    "  return { start, stop: runs.stop, closed: runs.closed };",
    "});",
    "",
  ].join("\n");
  const barrels = BARRELS.map((f) => ({ file: f, text: 'export * from "./model/Other.ts";\n// StatedRun stays out\n' }));
  const stated = (from, to) => judgeStatedRunShape({ stated: statedOk.replace(from, to), barrels });
  const has = (reasons, part) => reasons.some((r) => r.includes(part));
  eq("a stated run of the right shape passes", judgeStatedRunShape({ stated: statedOk, barrels }), []);
  eq("a missing stated run is reported", judgeStatedRunShape({ stated: undefined, barrels }), [`${STATED} is missing`]);
  eq("a barrel naming the stated run fails", judgeStatedRunShape({ stated: statedOk, barrels: [{ file: BARRELS[0], text: 'export { makeStatedRun } from "./model/StatedRun.ts";\n' }] }).length, 1);
  eq("an import outside the list fails", has(stated('import * as Exit from "effect/Exit";', 'import * as Exit from "effect/Exit";\nimport * as Cause from "effect/Cause";'), "imports effect/Cause"), true);
  eq("Scope imported as a value fails", stated("import type * as Scope", "import * as Scope"), [`${STATED} imports effect/Scope as a value, not a type`]);
  eq("a missing causeMessage import fails", has(stated('import { causeMessage } from "@qadi/core";', ""), "does not import causeMessage"), true);
  eq("a dynamic import fails", has(stated("  const runs", '  const lazy = import("x");\n  const runs'), "loads a module by a call"), true);
  eq("a named factory fails", has(stated("Effect.fn(function* (", 'Effect.fn("x")(function* ('), "not an unnamed Effect.fn"), true);
  eq("a module-scope const beside the factory fails", has(stated("export interface RunLive", "const cache = new Map();\nexport interface RunLive"), "module-scope statement"), true);
  eq("a start with no closed return fails", has(stated("    if (runs.closed()) return;\n", ""), "does not return when the scope has closed"), true);
  eq("a begin before the closed return fails", has(stated("    if (runs.closed()) return;\n    const token = runs.begin();", "    const token = runs.begin();\n    if (runs.closed()) return;"), "begin( before it returns on closed()"), true);
  eq("a publish in the finally fails", has(stated("      plan.starting();\n    } finally {", "    } finally {\n      plan.starting();"), "does not publish in a try block"), true);
  eq("a fork in the try block fails", has(stated("      plan.starting();\n    } finally {", "      plan.starting();\n      runs.fork(token, Effect.void);\n    } finally {"), "forks inside the try block"), true);
  eq("no finally fails", has(stated("} finally {", "} catch (e) {"), "does not fork in the finally block"), true);
  eq("a stop not gated by isCurrent fails", has(stated("runs.isCurrent(token) && Exit.isFailure(exit)", "Exit.isFailure(exit)"), "the stop is not gated by"), true);
  eq("a stop not gated by Exit.isFailure fails", has(stated("runs.isCurrent(token) && Exit.isFailure(exit)", "runs.isCurrent(token)"), "the stop is not gated by"), true);
  eq("a stop read through hasInterruptsOnly fails", has(stated("stopped(causeMessage(exit.cause));", "if (!Cause.hasInterruptsOnly(exit.cause)) stopped(causeMessage(exit.cause));"), "names hasInterruptsOnly"), true);
  eq("a second causeMessage fails", has(stated("stopped(causeMessage(exit.cause));", "stopped(causeMessage(exit.cause)); stopped(causeMessage(exit.cause));"), "calls causeMessage( 2 times"), true);
  eq("a guard that writes before it reads isCurrent fails", has(stated("        if (!runs.isCurrent(token)) return;\n        write(value);", "        write(value);\n        if (!runs.isCurrent(token)) return;"), "the guard writes before it reads"), true);
  eq("a guard that never reads isCurrent fails", has(stated("        if (!runs.isCurrent(token)) return;\n        write(value);", "        write(value);"), "the guard writes before it reads"), true);
  eq("a guard written as one expression passes", stated("      guard: (write) => (value) => {\n        if (!runs.isCurrent(token)) return;\n        write(value);\n      },", "      guard: (sink) => (value) => runs.isCurrent(token) && sink(value),"), []);
  eq("a stated run with no guard signature fails", has(stated(/\bguard\b/g, "other"), "has no guard"), true);

  // prologue-shape.
  const prologueOk = [
    "/** A comment may say .same( before .complete( and import. */",
    "export interface ConfigureRule<Raw, Held> {",
    "  readonly closed: () => boolean;",
    "  readonly complete: (raw: Raw) => Held;",
    "  readonly held: () => Held;",
    "  readonly same: (held: Held, wanted: Held) => boolean;",
    "  readonly hold: (wanted: Held) => void;",
    "}",
    "export const makeConfigure =",
    "  <Raw, Held>(rule: ConfigureRule<Raw, Held>, steps: (wanted: Held, before: Held) => void) =>",
    "  (raw: Raw): void => {",
    "    if (rule.closed()) return;",
    "    const wanted = rule.complete(raw);",
    "    const before = rule.held();",
    "    if (rule.same(before, wanted)) return;",
    "    rule.hold(wanted);",
    "    steps(wanted, before);",
    "  };",
    "",
  ].join("\n");
  const pbarrels = BARRELS.map((f) => ({ file: f, text: 'export * from "./model/Other.ts";\n' }));
  const pro = (from, to) => judgePrologueShape({ prologue: prologueOk.replace(from, to), barrels: pbarrels });
  eq("a prologue of the right shape passes", judgePrologueShape({ prologue: prologueOk, barrels: pbarrels }), []);
  eq("a missing prologue is reported", judgePrologueShape({ prologue: undefined, barrels: pbarrels }), [`${PROLOGUE} is missing`]);
  eq("a type import passes", pro("export interface", 'import type { X } from "./a.ts";\nexport interface'), []);
  eq("a runtime import fails", has(pro("export interface", 'import * as Effect from "effect/Effect";\nexport interface'), "has a runtime import"), true);
  eq("a barrel naming the prologue fails", judgePrologueShape({ prologue: prologueOk, barrels: [{ file: BARRELS[1], text: 'export { makeConfigure } from "./model/ConfigurePrologue.ts";\n' }] }).length, 1);
  eq("a same before complete fails", has(pro("    const wanted = rule.complete(raw);\n    const before = rule.held();\n    if (rule.same(before, wanted)) return;", "    if (rule.same(rule.held(), raw)) return;\n    const wanted = rule.complete(raw);\n    const before = rule.held();"), "same( before complete("), true);
  eq("a hold before same fails", has(pro("    if (rule.same(before, wanted)) return;\n    rule.hold(wanted);", "    rule.hold(wanted);\n    if (rule.same(before, wanted)) return;"), "hold( before same("), true);
  eq("a closed after complete fails", has(pro("    if (rule.closed()) return;\n    const wanted = rule.complete(raw);", "    const wanted = rule.complete(raw);\n    if (rule.closed()) return;"), "complete( before closed("), true);
  eq("steps before hold fails", has(pro("    rule.hold(wanted);\n    steps(wanted, before);", "    steps(wanted, before);\n    rule.hold(wanted);"), "steps( before hold("), true);
  eq("a prologue that never calls steps fails", pro("    steps(wanted, before);\n", ""), [`${PROLOGUE}: makeConfigure never calls steps(`]);
  eq("a prologue declared twice fails", pro("export interface", "export const makeConfigure = 1;\nexport interface").length, 1);

  // feeds-supply-only-engine.
  const timelineOk = [
    'import { makeConfigure } from "./ConfigurePrologue.ts";',
    'import { makeStatedRun } from "./StatedRun.ts";',
    "/** A comment may say begin, fork, finally, isCurrent, causeMessage, hasInterruptsOnly and makeSupersedingRun. */",
    'export const makeTimelineFeed = Effect.fn("x")(function* () {',
    "  let held = completeTimelineInputs({});",
    "  const reads = yield* makeStatedRun((reason) => status.set(TimelineStatus.Stopped({ reason })));",
    "  const plan = (): RunPlan => ({",
    "    starting: () => status.set(READING),",
    "    engine: ({ guard }) => runSource({ accept: guard((record) => timeline.accept(record)) }, held.source ?? NO_SOURCE),",
    "  });",
    "  const restart = () => reads.start(plan());",
    "  return {",
    '    configure: makeConfigure({ closed: reads.closed, complete: completeTimelineInputs, held: () => held, same: sameFields, hold: (wanted) => { held = wanted; } }, () => callAll([restart], "x")),',
    "  };",
    "});",
    "",
  ].join("\n");
  const gatesOk = [
    "export const makeGatesFeed = Effect.fn(\"x\")(function* () {",
    "  const runs = yield* makeSupersedingRun();",
    "  const tick = () => {",
    "    publish(readRegistry(), readAsked());",
    "  };",
    "  const cadence = () => {",
    "    if (held.questions === undefined) {",
    "      runs.stop();",
    "      return;",
    "    }",
    "    runs.fork(runs.begin(), Effect.sleep(interval).pipe(Effect.andThen(Effect.repeat(Effect.sync(tick), Schedule.spaced(interval)))));",
    "  };",
    "  return {",
    "    configure: makeConfigure(",
    "      { closed: runs.closed, complete: completeGatesInputs, held: () => held, same: (a, b) => sameFields(a, b) && watchFailure === undefined, hold: (wanted) => { held = wanted; } },",
    "      (wanted, before) => {",
    "        let asked = store.getSnapshot().asked;",
    "        if (wanted.questions !== before.questions) {",
    "          asked = readAsked();",
    "          cadence();",
    "        }",
    "        publish(readRegistry(), asked);",
    "      },",
    "    ),",
    "  };",
    "});",
    "",
  ].join("\n");
  const feeds = (over = {}, which = FEED_NAMES) => judgeFeedsSupplyOnly({ timeline: timelineOk, diagnostics: timelineOk, gates: gatesOk, ...over }, which);
  const feed = (from, to, which = ["timeline"]) => feeds({ timeline: timelineOk.replace(from, to) }, which);
  eq("feeds of the right shape pass", feeds(), []);
  eq("a feed missing is reported", feeds({ timeline: undefined }, ["timeline"]), [`${TIMELINE} is missing`]);
  eq("each feed is judged by the name asked", feeds({ timeline: "const a = 1;" }, ["gates"]), []);
  eq("a feed that still calls fork( fails", has(feed("  const restart", "  const run = reads.fork(token, work);\n  const restart"), "names fork"), true);
  eq("a feed that still calls begin( fails", has(feed("  const restart", "  const t = reads.begin();\n  const restart"), "names begin"), true);
  eq("a feed that still names isCurrent fails", has(feed("  const restart", "  const c = reads.isCurrent(t);\n  const restart"), "names isCurrent"), true);
  eq("a feed that still names causeMessage fails", has(feed("  const restart", "  const m = causeMessage(c);\n  const restart"), "names causeMessage"), true);
  eq("a feed that still names a finally fails", has(feed("  const restart", "  try { a(); } finally { b(); }\n  const restart"), "names finally"), true);
  eq("a feed that still names hasInterruptsOnly fails", has(feed("  const restart", "  const i = Cause.hasInterruptsOnly(c);\n  const restart"), "names hasInterruptsOnly"), true);
  eq("a feed that still builds a superseding run fails", has(feed("  const restart", "  const own = yield* makeSupersedingRun();\n  const restart"), "names makeSupersedingRun"), true);
  eq("a feed with two stated runs fails", has(feed("  const restart", "  const more = yield* makeStatedRun(() => {});\n  const restart"), "builds 2 stated runs"), true);
  eq("a feed with no prologue fails", has(feed("makeConfigure(", "other("), "builds 0 configure prologues"), true);
  eq("a gates feed of the right shape passes", feeds({}, ["gates"]), []);
  const gates = (from, to) => feeds({ gates: gatesOk.replace(from, to) }, ["gates"]);
  eq("a gates feed whose gate ignores watchFailure fails", has(gates("sameFields(a, b) && watchFailure === undefined", "sameFields(a, b)"), "does not read watchFailure"), true);
  eq("a gates feed with a stated run fails", has(gates("  const tick", "  const s = yield* makeStatedRun(() => {});\n  const tick"), "names makeStatedRun"), true);
  eq("a gates feed with no superseding run fails", has(gates("makeSupersedingRun()", "other()"), "builds 0 superseding runs"), true);
  eq("a gates feed with no prologue fails", has(gates("makeConfigure(", "other("), "builds 0 configure prologues"), true);
  eq("a gates feed that publishes before it calls cadence fails", has(gates("          asked = readAsked();\n          cadence();", "          publish(readRegistry(), asked);\n          cadence();"), "publish before they call cadence("), true);
  eq("a gates cadence that publishes before it forks fails", has(gates("    runs.fork(runs.begin()", "    publish(readRegistry(), readAsked());\n    runs.fork(runs.begin()"), "cadence publishes before it forks"), true);
  eq("a gates cadence that never forks fails", has(gates("    runs.fork(runs.begin(), Effect.sleep(interval).pipe(Effect.andThen(Effect.repeat(Effect.sync(tick), Schedule.spaced(interval)))));\n", ""), "never forks"), true);
  eq("a gates feed with no cadence fails", has(gates("const cadence = () => {", "const other = () => {"), "has no cadence function"), true);

  // session-stop.
  const sessionOk = [
    'import { causeMessage } from "@qadi/core";',
    'import { makeStatedRun } from "./StatedRun.ts";',
    'export const makeSimulationSession = Effect.fn("qadi.devtools.makeSimulationSession")(function* () {',
    '  let run = { _tag: "Idle" };',
    "  const runs = yield* makeStatedRun((reason) => {",
    '    if (run._tag !== "Running") return;',
    '    run = { _tag: "Broke", question: run.question, message: reason };',
    "    commit();",
    "  });",
    '  const land = Effect.fn("qadi.devtools.simulationSession.run", { root: true })(function* (live, question) {',
    "    const exit = yield* Effect.exit(program(question));",
    "    if (!live.current()) return;",
    '    run = { _tag: "Broke", question, message: causeMessage(exit.cause) };',
    "    commit();",
    "  });",
    "  const start = () => {",
    "    runs.start({ starting: () => { commit(); }, engine: (live) => land(live, question) });",
    "  };",
    "});",
    "",
  ].join("\n");
  const session = (from, to) => judgeSessionStop(sessionOk.replace(from, to));
  eq("a session of the right shape passes", judgeSessionStop(sessionOk), []);
  eq("a missing session is reported", judgeSessionStop(undefined), [`${SESSION} is missing`]);
  eq("a stop hook with no Running guard fails", has(session('    if (run._tag !== "Running") return;\n', ""), "does not begin by returning unless"), true);
  eq("a stop hook that guards another tag fails", has(session('run._tag !== "Running"', 'run._tag !== "Idle"'), "does not begin by returning unless"), true);
  eq("a session that still calls String on a cause fails", has(session("message: causeMessage(exit.cause)", "message: String(exit.cause)"), "calls String on a cause"), true);
  eq("a land that does not write causeMessage fails", has(session("message: causeMessage(exit.cause)", "message: reason"), "does not write Broke.message as causeMessage(exit.cause)"), true);
  eq("a land that is not rooted fails", has(session(", { root: true })(", ")("), "land is not Effect.fn"), true);
  eq("a land with another span name fails", has(session("qadi.devtools.simulationSession.run", "qadi.devtools.run"), "land is not Effect.fn"), true);
  eq("a land with no exit read fails", has(session("yield* Effect.exit(program(question))", "yield* program(question)"), "does not read its own exit"), true);
  eq("a session that builds its own superseding run fails", has(session("  const start", "  const own = yield* makeSupersedingRun();\n  const start"), "names makeSupersedingRun"), true);
  eq("a session that begins a run itself fails", has(session("  const start", "  const t = runs.begin();\n  const start"), "names begin("), true);
  eq("a session that forks a run itself fails", has(session("  const start", "  runs.fork(t, work);\n  const start"), "names fork("), true);
  eq("a session that starts no run fails", has(session("runs.start(", "runs.other("), "never starts a run"), true);
  eq("a session with two stated runs fails", has(session("  const start", "  const more = yield* makeStatedRun(() => {});\n  const start"), "builds 2 stated runs"), true);
  eq("a session without the stated run import fails", has(session('import { makeStatedRun } from "./StatedRun.ts";', ""), "does not import makeStatedRun"), true);

  // simulator-pre.
  const simulatorOk = [
    'import { colors, heading, panel, reasonStyle } from "./theme.ts";',
    "const RunView = ({ state }) =>",
    "  Match.value(state).pipe(",
    "    Match.tagsExhaustive({",
    "      Broke: (broke) => (",
    '        <section style={{ ...panel, borderColor: colors.error }} data-testid="qadi-simulator-broke">',
    "          <div style={{ ...heading, color: colors.error }}>the simulation itself failed</div>",
    '          <pre role="group" aria-label="Why the simulation failed" tabIndex={0} style={reasonStyle}>',
    "            {broke.message}",
    "          </pre>",
    "        </section>",
    "      ),",
    "    }),",
    "  );",
    "",
  ].join("\n");
  const themeOk = 'export const colors = {};\nexport const reasonStyle: CSSProperties = {\n  margin: "8px 0 0",\n};\n';
  const stoppedOk = 'import { button, colors, font, panel, reasonStyle, withAlpha } from "./theme.ts";\nconst restartStyle = {};\n';
  const pre = (over = {}) => judgeSimulatorPre({ simulator: simulatorOk, theme: themeOk, stopped: stoppedOk, ...over });
  const sim = (from, to) => pre({ simulator: simulatorOk.replace(from, to) });
  eq("a simulator of the right shape passes", pre(), []);
  eq("a Broke box with a span fails", has(sim('<pre role="group"', "<span>{broke.message}</span>\n<pre role=\"group\""), "still holds a span"), true);
  eq("a Broke box with a span in place of the pre fails", has(pre({ simulator: simulatorOk.replace(/<pre[^>]*>/, "<span>").replace("</pre>", "</span>") }), "holds no pre"), true);
  eq("a pre that is not a group fails", has(sim('role="group" ', ""), "has no role"), true);
  eq("a pre with another label fails", has(sim("Why the simulation failed", "Why"), "is not labelled"), true);
  eq("a pre that is not focusable fails", has(sim(" tabIndex={0}", ""), "is not focusable"), true);
  eq("a pre with its own style fails", has(sim("style={reasonStyle}>", "style={{ margin: 0 }}>"), "does not take style={reasonStyle}"), true);
  eq("a pre that holds more than the message fails", has(sim("{broke.message}", "the failure: {broke.message}"), "does not hold {broke.message} alone"), true);
  eq("a simulator that does not import reasonStyle fails", has(sim("panel, reasonStyle }", "panel }"), "does not import reasonStyle"), true);
  eq("a Broke box that is gone fails", has(sim("qadi-simulator-broke", "qadi-other"), "has no Broke box"), true);
  eq("a theme that does not export reasonStyle fails", pre({ theme: "export const colors = {};\n" }), [`${THEME} does not export reasonStyle`]);
  eq("a stopped box that declares its own style fails", has(pre({ stopped: `${stoppedOk}const reasonStyle = {};\n` }), "still declares reasonStyle"), true);
  eq("a stopped box that does not import it fails", has(pre({ stopped: "const restartStyle = {};\n" }), "does not import reasonStyle"), true);

  // onfailure-gone.
  const runModule = "export interface SupersedingRun {\n  readonly fork: (token: RunToken, run: Effect.Effect<void, unknown>) => boolean;\n}\nconst fork = (token: RunToken, run: Effect.Effect<void, unknown>): boolean => true;\n";
  const goneFiles = (over = {}) => [
    { file: SUPERSEDING, text: runModule },
    { file: TIMELINE, text: "// the old onFailure hook is gone\nconst a = 1;\n" },
    { file: SUPERSEDING_TEST, text: "const a = 1;\n" },
    { file: "packages/devtools/src/model/Other.ts", text: "Result.match({ onFailure: () => 1 });\n" },
  ].map((f) => (over[f.file] === undefined ? f : { file: f.file, text: over[f.file] }));
  eq("a comment naming onFailure in a store fails", judgeOnFailureGone(goneFiles()).length, 1);
  eq("a package with a clean five passes", judgeOnFailureGone(goneFiles({ [TIMELINE]: "const a = 1;\n" })), []);
  eq("ForkHooks anywhere fails", judgeOnFailureGone(goneFiles({ [TIMELINE]: "const a = 1;\n", "packages/devtools/src/model/Other.ts": "import type { ForkHooks } from './x.ts';\n" })), ["packages/devtools/src/model/Other.ts names ForkHooks"]);
  eq("onFailure in the run module's test fails", judgeOnFailureGone(goneFiles({ [TIMELINE]: "const a = 1;\n", [SUPERSEDING_TEST]: "const heard = { onFailure };\n" })), [`${SUPERSEDING_TEST} names onFailure`]);
  eq("onFailure in another file is not read", judgeOnFailureGone(goneFiles({ [TIMELINE]: "const a = 1;\n" })), []);
  eq("a fork with three parameters fails", judgeOnFailureGone(goneFiles({ [TIMELINE]: "const a = 1;\n", [SUPERSEDING]: runModule.replace("run: Effect.Effect<void, unknown>) => boolean", "run: Effect.Effect<void, unknown>, hooks?: Hooks) => boolean") })), [`${SUPERSEDING}: fork takes 3 parameters, not 2`]);
  eq("a fork of two parameters whose type has a comma passes", judgeOnFailureGone(goneFiles({ [TIMELINE]: "const a = 1;\n" })), []);
  eq("a missing run module is reported", judgeOnFailureGone([{ file: TIMELINE, text: "const a = 1;\n" }]), [`${SUPERSEDING} is missing`]);
  eq("parameters are split at the top level", paramsOf("a: A<B, C>, b: (x: X, y: Y) => void, c"), ["a: A<B, C>", "b: (x: X, y: Y) => void", "c"]);

  // built-feeds-once.
  const builtOk = [
    "const configuredBy = <A extends { readonly configure: (inputs: I) => void }, I>(",
    "  make: () => Effect.Effect<A, never, Scope.Scope>,",
    "  inputs: I,",
    "): Effect.Effect<A, never, Scope.Scope> => Effect.tap(make(), (built) => Effect.sync(() => built.configure(inputs)));",
    "export const timelineFeedOf = (inputs: TimelineFeedInputs) => configuredBy(makeTimelineFeed, inputs);",
    "export const diagnosticsFeedOf = (options: DiagnosticsOptions | undefined) => configuredBy(makeDiagnosticsFeed, options);",
    "export const gatesFeedOf = (inputs: GatesFeedInputs) => configuredBy(makeGatesFeed, inputs);",
    "export const dockModelOf = (inputs: DockModelInputs) => configuredBy(makeDockModel, inputs);",
    "",
  ].join("\n");
  const built = (from, to) => judgeBuiltFeedsOnce(builtOk.replace(from, to));
  eq("builtFeeds of the right shape passes", judgeBuiltFeedsOnce(builtOk), []);
  eq("a missing builtFeeds is reported", judgeBuiltFeedsOnce(undefined), [`${BUILT_FEEDS} is missing`]);
  eq("two taps fail", judgeBuiltFeedsOnce(`${builtOk}const again = () => Effect.tap(a, b);\n`), [`${BUILT_FEEDS} has 2 Effect.tap( calls, not 1`]);
  eq("an export that does not call the helper fails", built("configuredBy(makeGatesFeed, inputs)", "Effect.succeed(1)"), [`${BUILT_FEEDS}: gatesFeedOf does not call configuredBy( once`]);
  eq("an export missing fails", has(built("export const dockModelOf", "export const dockModel"), "does not export dockModelOf"), true);
  eq("a tap inside an export fails", has(judgeBuiltFeedsOnce("export const timelineFeedOf = () => Effect.tap(a, b);\n"), "the helper, is one of the four exports"), true);
  eq("a comment naming a tap is not read", judgeBuiltFeedsOnce(`// Effect.tap( once\n${builtOk}`), []);

  // records.
  const A = "packages/devtools/test/model/StatedRun.test.ts";
  const B = "packages/devtools/test/model/TimelineFeed.test.ts";
  const behOf = (n, body, title = "heading") => `## BEH-QD-${n}: ${title}\n\n> **Decision:** x\n\n${body}\n\nSpecified in ADR-QD-200.\n\n`;
  const pinned = `Pinned by \`${A}\` ("a title"; ST1, the row), \`${B}\` ("b title that\nspans two lines", "a described group", TL1 to TL3).`;
  const docs = (over = {}, news = []) => {
    const kept = (n) => behOf(n, over[n] ?? pinned);
    return [
      { file: SCREENS, text: [...PINNED_KEPT.filter((n) => n !== 461).map(kept), ...news.filter((n) => n < 774).map((n) => behOf(n, pinned))].join("") },
      { file: SIMULATOR_SPEC, text: [kept(461), ...news.filter((n) => n >= 774).map((n) => behOf(n, pinned))].join("") },
    ];
  };
  const files = {
    [A]: 'it("ST1 the row", () => {});\nit("a title", () => {});\nit("ST2 other row", () => {});\n',
    [B]: 'describe("a described group", () => {});\nit("b title that spans two lines", () => {});\nit("TL1 a", () => {});\nit("TL2 b", () => {});\nit("TL3 c", () => {});\n',
  };
  const trace = (over = {}) =>
    [
      "## §1 Behavior to source",
      "",
      over.one ?? "| 28 | BEH-QD-771–773 | x |\n| 29 | BEH-QD-774, BEH-QD-775 | x |",
      "",
      "## §2 Invariant traceability",
      "",
      over.two ?? "| [INV-QD-419](a) | d |\n| [INV-QD-420](a) | d |",
      "",
      "## §3 Decision traceability",
      "",
      over.three ?? "| [ADR-QD-200](a) | t |",
      "",
      "## §4 Test file map",
      "",
    ].join("\n");
  const recs = (behaviors = docs(), close = undefined, fs = files, t = trace()) => judgeRecords({ trace: t, behaviors, tests: (p) => fs[p] }, close);
  eq("records that agree pass", recs(), []);
  eq("a quoted title that no test holds fails", recs(docs({ 507: pinned.replace("a title", "a titel") })), [`BEH-QD-507 quotes "a titel" for ${A}, which holds no such test`]);
  eq("a describe title may be quoted", recs(), []);
  eq("a title quoted under the wrong file fails", recs(docs({ 519: pinned.replace('("a title"; ST1, the row)', '("a title"; "b title that spans two lines"; ST1, the row)') })), [`BEH-QD-519 quotes "b title that spans two lines" for ${A}, which holds no such test`]);
  eq("a quoted title is matched whole, not by its prefix", recs(docs({ 521: pinned.replace("a title", "a") })).length, 1);
  eq("a row id that no title opens fails", recs(docs({ 522: pinned.replace("ST1,", "ST9,") })), [`BEH-QD-522 names row ST9 for ${A}, which no title opens`]);
  eq("a row range that runs past the last title fails", recs(docs({ 523: pinned.replace("TL1 to TL3", "TL1 to TL4") })), [`BEH-QD-523 names row TL4 for ${B}, which no title opens`]);
  eq("a row id is not satisfied by a longer id", recs(docs(), undefined, { ...files, [A]: files[A].replace("ST1 the row", "ST10 the row") }).length, PINNED_KEPT.length);
  eq("a pinned file that does not exist fails", recs(docs(), undefined, { ...files, [B]: undefined }).length, PINNED_KEPT.length);
  eq("a kept behavior with no heading fails", recs(docs({}, []).map((d) => ({ ...d, text: d.text.replace("## BEH-QD-524:", "## BEH-QD-9524:") }))), ["BEH-QD-524 has no heading in the behavior documents"]);
  eq("a new behavior with no heading is skipped", recs(docs({}, [])), []);
  eq("a behavior whose pinned-by names no file fails", recs(docs({ 525: "Pinned by nothing." })), ["BEH-QD-525 names no test file in a Pinned by paragraph"]);
  eq("a pinned-by paragraph ends at the blank line", recs([{ file: SCREENS, text: `${docs()[0].text}Quoted later: "not a title".\n` }, docs()[1]]), []);
  eq("a new behavior is read once it has a heading", recs(docs({}, [771]).map((d, i) => (i === 0 ? { ...d, text: d.text.replace(pinned, pinned.replace("a title", "a titel")) } : d))).length >= 1, true);
  const enforcement = `Enforcement: "a title" and "ST2 other row" in \`test/model/StatedRun.test.ts\`, with a scenario and \`${B}\` (TL1 to TL2).`;
  eq("an Enforcement paragraph with relative paths and titles before the first file passes", recs(docs({ 461: enforcement }), undefined, files), []);
  eq("a title before the first file belongs to that file", recs(docs({ 461: enforcement.replace('"a title"', '"a titel"') })), [`BEH-QD-461 quotes "a titel" for ${A}, which holds no such test`]);
  eq("a relative path is read inside the package", recs(docs({ 461: enforcement.replace("test/model/StatedRun.test.ts", "test/model/Gone.test.ts") })).length >= 1, true);

  const adrText = [
    "| Document ID | QADI-ADR-200 |",
    "",
    "| Row | Property | Test |",
    "| --- | -------- | ---- |",
    "| R3 | a close never reports | ST1 |",
    "| R5 to R7 | a stop reports nothing | ST2 |",
    "| R9 | a die reports once | ST1 |",
    "| model law 5 | the model | ST2 |",
    "| model law 7 | the model | ST2 |",
    "",
    "Tests removed: 1.",
    "",
    "A run that interrupts itself reads `Stopped`.",
    "`AuditWriteReport.ts` keeps its String of a cause.",
    "",
  ].join("\n");
  const baseHeading = "A poll defect is stated, an interruption never is, and a replaced run never writes";
  const anchor = "inv-qd-313-a-poll-defect-is-stated-an-interruption-never-is-and-a-replaced-run-never-writes";
  const amended = Object.fromEntries(AMENDED_DECISIONS.map(([n, rev]) => [n, { file: `${n}-x.md`, text: `> | Revision       | ${rev}   |\nADR-QD-200 is named here.\n` }]));
  const closeText = (over = {}) => ({
    invariants: "## INV-QD-313: A poll defect is stated, an interruption from outside never is, and a replaced run never writes\n\n## INV-QD-419: a\n\n**Source**: `packages/devtools/src/model/StatedRun.ts` and `x`.\n\n## INV-QD-420: b\n\n**Source**: `packages/devtools/src/model/ConfigurePrologue.ts`.\n",
    invariantsBase: `## INV-QD-313: ${baseHeading}\n`,
    decisions: [{ file: "200-x.md", text: adrText }, ...Object.values(amended)],
    index: '  - id: "ADR-QD-200"\n    file: "200-x.md"\n',
    readme: "| CCR-QD-479 | 2026-11-25 | ARCH-134 the stated run. Unused: none |\n",
    specTexts: [{ file: "spec/a.md", text: "a link to nothing" }],
    thrownBase: " * defect the caller's code raised cannot become a defect of ours. `String` of a\n * `Cause` is the one other rendering, and Effect guards it itself (ADR-QD-182).\n */\n",
    thrownNow: " * defect the caller's code raised cannot become a defect of ours.\n */\n",
    statedTest: files[A],
    ...over,
  });
  const closed = (over = {}, behaviors = docs({}, [771, 772, 773, 774, 775]), t = trace()) => recs(behaviors, closeText(over), files, t);
  eq("a close with every record written passes", closed(), []);
  eq("an anchor derives as the heading's github anchor", anchorOf(`INV-QD-313: ${baseHeading}`), anchor);
  eq("a close with no new BEH heading fails", closed({}, docs({}, [771, 772, 774, 775])), ["BEH-QD-773 has no heading in spec/behaviors/28-devtools-screens.md"]);
  eq("a new BEH in the wrong document fails", closed({}, docs({}, [771, 772, 773, 774])), ["BEH-QD-775 has no heading in spec/behaviors/29-devtools-simulator.md"]);
  eq("a BEH with no row in section 1 fails", closed({}, docs({}, [771, 772, 773, 774, 775]), trace({ one: "| 28 | BEH-QD-771–773 | x |" })), ["BEH-QD-774 has no row in spec/traceability.md §1", "BEH-QD-775 has no row in spec/traceability.md §1"]);
  eq("a missing INV row fails", closed({}, docs({}, [771, 772, 773, 774, 775]), trace({ two: "| [INV-QD-419](a) | d |" })), ["INV-QD-420 has no row in spec/traceability.md §2"]);
  eq("a missing INV heading fails", closed({ invariants: closeText().invariants.replace("## INV-QD-420: b", "## INV-QD-9420: b") }).includes("INV-QD-420 has no heading in spec/invariants.md"), true);
  eq("a source line that does not name its file fails", closed({ invariants: closeText().invariants.replace("`packages/devtools/src/model/StatedRun.ts` and `x`", "`x`") }), ["the **Source**: line of INV-QD-419 does not name StatedRun.ts"]);
  eq("an INV-QD-313 heading that does not say from outside fails", closed({ invariants: closeText().invariants.replace("from outside ", "") }), ["the heading of INV-QD-313 does not say `from outside`"]);
  eq("a link to the base anchor that remains fails", closed({ specTexts: [{ file: "spec/b.md", text: `see [x](invariants.md#${anchor})` }] }), [`spec/b.md still links the base anchor #${anchor}`]);
  eq("a missing ADR file fails", closed({ decisions: Object.values(amended) }), ["spec/decisions/200-*.md does not exist"]);
  const adr = (from, to) => closed({ decisions: [{ file: "200-x.md", text: adrText.replace(from, to) }, ...Object.values(amended)] });
  eq("an ADR file without its document id fails", adr("QADI-ADR-200", "none"), ["the ADR-QD-200 file does not carry QADI-ADR-200"]);
  eq("an ADR file without the zero line fails", has(adr("Tests removed: 1.", "Tests removed: 2."), "no line `Tests removed: 1.`"), true);
  eq("a removed line that does not follow the table fails", adr("| model law 7 | the model | ST2 |\n\n", "Some words.\n\n"), ["the ADR-QD-200 audit table has no row naming law 7", "the line `Tests removed: 1.` does not follow the audit table"]);
  eq("an audit table with no row for R9 fails", adr("| R9 | a die reports once | ST1 |\n", ""), ["the ADR-QD-200 audit table has no row naming R9"]);
  eq("an audit row naming no ST row fails", adr("| R3 | a close never reports | ST1 |", "| R3 | a close never reports | none |"), ["the ADR-QD-200 audit row naming R3 names no ST row of the new test"]);
  eq("an audit row naming an ST row that is no title fails", adr("| R3 | a close never reports | ST1 |", "| R3 | a close never reports | ST7 |"), [`the ADR-QD-200 audit row naming R3 names ST7, which is no title in ${STATED_TEST}`]);
  eq("a range row covers each row it spans", adr("| R5 to R7 |", "| R5 |").length, 2);
  eq("an ADR with no line naming the audit report fails", adr("`AuditWriteReport.ts` keeps its String of a cause.", "x"), ["the ADR-QD-200 file has no line naming AuditWriteReport.ts"]);
  eq("an ADR with no self-interrupt line fails", has(adr("interrupts itself", "ends itself"), "interrupts itself"), true);
  eq("a missing ST test file is reported", has(closed({ statedTest: undefined }), `${STATED_TEST} does not exist`), true);
  eq("a missing index entry fails", closed({ index: "" }), ["spec/decisions/index.yaml has no ADR-QD-200 entry"]);
  eq("a missing section 3 row fails", closed({}, docs({}, [771, 772, 773, 774, 775]), trace({ three: "| [ADR-QD-199](a) | t |" })), ["ADR-QD-200 has no row in spec/traceability.md §3"]);
  eq("a decision one revision short fails", closed({ decisions: [closeText().decisions[0], ...Object.values({ ...amended, 182: { file: "182-x.md", text: "> | Revision       | 1.1   |\nADR-QD-200\n" } })] }), ["ADR-QD-182 is not at Revision 1.2"]);
  eq("a decision that does not name ADR-QD-200 fails", closed({ decisions: [closeText().decisions[0], ...Object.values({ ...amended, 194: { file: "194-x.md", text: "> | Revision       | 1.4   |\n" } })] }), ["ADR-QD-194 does not name ADR-QD-200"]);
  eq("a missing amended decision fails", closed({ decisions: closeText().decisions.filter((d) => !d.file.startsWith("196-")) }), ["spec/decisions/196-*.md does not exist"]);
  eq("a missing CCR row fails", closed({ readme: "" }), ["spec/README.md has no CCR-QD-479 row"]);
  eq("a CCR row that does not name the item fails", closed({ readme: closeText().readme.replace("ARCH-134", "x") }), ["the CCR-QD-479 row does not name ARCH-134"]);
  eq("a CCR row that does not say unused none fails", closed({ readme: closeText().readme.replace("Unused: none", "none") }), ["the CCR-QD-479 row does not say Unused: none"]);
  eq("the base sentence is read across the line break", thrownSentence(closeText().thrownBase), "`Cause` is the one other rendering, and Effect guards it itself (ADR-QD-182).");
  eq("a ThrownMessage that still holds the sentence fails", closed({ thrownNow: closeText().thrownBase }), ["ThrownMessage.ts still holds the sentence ADR-QD-182 decision 11 quoted"]);
  eq("a ThrownMessage that holds the sentence across another break still fails", closed({ thrownNow: " * `Cause` is the one other rendering, and\n * Effect guards it itself (ADR-QD-182).\n" }), ["ThrownMessage.ts still holds the sentence ADR-QD-182 decision 11 quoted"]);
  eq("a base ThrownMessage with no sentence fails", closed({ thrownBase: "nothing" }), ["the base ThrownMessage.ts has no sentence after `String` of a"]);
  eq("the close checks are not run without --close", recs(docs()), []);

  const diff = "diff --git a/x.ts b/x.ts\n--- a/x.ts\n+++ b/x.ts\n@@ -3,1 +3,2 @@\n-old\n+new\n+newer\n@@ -9,0 +11 @@\n+late\ndiff --git a/gone.ts b/gone.ts\n--- a/gone.ts\n+++ /dev/null\n@@ -1 +0,0 @@\n-x\n";
  const parsed = parseDiff(diff);
  eq("a diff's added lines are numbered in the new file", [[...parsed.get("x.ts")], parsed.has("gone.ts")], [[3, 4, 11], false]);

  console.log(`self-test: ${passed} passed`);
};

const [mode, ...args] = process.argv.slice(2);
// Run as a script, not when a judge is imported from another file.
if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (mode === undefined || !Object.hasOwn(MODES, mode)) fail([`usage: node 87-check.mjs ${Object.keys(MODES).join("|")}`]);
  else MODES[mode](args);
}
