// The phase's shared check, run from the repository root as `node <this file> <mode> [args]`. Each mode is a pure
// judge over text plus a thin reader that gathers the text from git or the tree; a failure prints its reasons to stderr
// and exits 1. Modes:
//   base                                     prints phase_base read from the committed 88-mutation-base.json, after checking that
//                                            the commit planning started on and phase_base are ancestors of HEAD and that nothing
//                                            outside `.planning/` differs between them
//   commit [--first] "<subject>" <path>...   exactly one commit since phase_base has this subject and exactly these paths, none
//                                            of them a path the run rules never stage; --first also needs it to be the first plan
//                                            commit, every commit before it changing only `.planning/`
//   unchanged <path>...                      the tree matches phase_base on these paths and none is untracked
//   seen-failing <test-file> [<title>...]    each title has a failure line in the evidence file
//   vitest <report> [<test-file>...]         runs the devtools project over the named files (all when none) into a JSON report
//   suite <report> [--partial] [--green | --passing <id>...]
//                                            a vitest JSON report of the devtools project: only the files and rows the evidence file
//                                            lists as red before may fail, every test file loaded, every base test file and every
//                                            born test file in the tree ran (--partial skips only that last rule); --passing also
//                                            needs each named row to pass, --green needs no failure at all
//   scan-ids                                 added lines (tree against phase_base, .planning excluded) name no id or phase
//   scan-forbidden                           added source and test lines use none of the forbidden forms, and no budget file moved
//   trailers [--message <file>]              every commit since phase_base, the workflow's metadata commits included, has exactly
//                                            one trailer, the owner's; --message judges one message text instead, so the mode
//                                            fails without a commit
//   box-keys-itself                          the stopped box keys itself, decides its alert at mount and records at commit; the
//                                            hook holds the ledger in a reducer; the notices hand the box the notice whole
//   ledger-module                            the stop ledger is one React-free module only the box and the hook import
//   records [--close]                        the pinned-by lists name tests that exist; --close also needs every reserved
//                                            record written and every amended record at its next revision
//   --self-test                              drives every judge with planted text
// Shortcuts: the comment and string blanking does not understand regex literals, `any` is read by the token before it,
// and a function whose return type is a literal object type is read wrongly by the module-scope reader: reword the
// declaration. A false positive is cleared by rewording the line, never by weakening a judge. The shape modes read source
// text with comments and strings blanked and match its shapes by pattern, so a reworded declaration that keeps the same
// meaning can need the pattern widened; that is a reviewed edit to this file, never a reason to skip the mode. The JSX
// reader looks for a closing tag or a self-closing tag, so an element with neither is not seen; an element's opening tag is
// read to the first `>` outside brackets. A block is read as the text between a bracket and its match, so a bracket
// inside a regex literal is read wrongly. A pinned-by paragraph starts at `Pinned by` or `Enforcement:` and ends at the next
// blank line; quoted titles before its first file belong to it. A revision one step above its base is the next minor number
// (1.413 to 1.414, 1.4 to 1.5).
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { dirname, relative } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

/** This script's own directory, relative to the repository root, with a trailing slash. */
const D = `${relative(process.cwd(), dirname(fileURLToPath(import.meta.url)))}/`;
const EVIDENCE = `${D}88-RED-EVIDENCE.md`;
const BASE_RECORD = `${D}88-mutation-base.json`;
/** The one trailer every commit ends with: the project owner's line, and no other Claude name is accepted. */
const TRAILER = "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>";
const PLAN_SUBJECT = /^[a-z]+[(]88-[0-9]{2}[)]!?: /;
const GUARDED = ["AGENTS.md", "scripts/check-house-style.mjs", ".oxlintrc.json"];
/** The commit planning started on: every file outside `.planning/` is the one phase_base holds. */
const PLANNING_HEAD = "947bb0a3";
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
  /^\.planning\/phases\/(?!QD-88-stoppedbox-keys-itself-and-owns-the-announce-once-rule\/)/,
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
  [/(?<![\w.-])88-\d{2}(?!\d)/, "a plan id"],
  [/\bSBOX-0\d\b/, "a requirement id"],
  [/\bWX-0\d\b/, "a requirement id"],
  [/(?<!(?:ADR|CCR|BEH|INV|ARCH)-)\bQD-88\b/, "a phase id"],
  [/\b[Pp]hase 88\b/, "a phase number"],
  [/-NEXT\b/, "a placeholder id"],
];
// `publishes from now on` is a status tape's own subscription time (five comments of the born test files, held byte for byte),
// not a time relative to a change; any other `from now on` is still refused.
const PHRASE = /this phase|until now|any more|no longer|previously|now does|(?<!publishes )from now on/i;
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

const MODEL = "packages/devtools/src/model/";
const REACT = "packages/devtools/src/react/";
const TESTS = "packages/devtools/test/";
const LEDGER = `${MODEL}StopLedger.ts`;
const BOX = `${REACT}StoppedBox.tsx`;
const HOOK = `${REACT}useStopNotice.ts`;
const NOTICES = [`${REACT}TimelineNotice.tsx`, `${REACT}DiagnosticsNotice.tsx`];
const STOP_PATH = [BOX, HOOK, ...NOTICES];
const BARRELS = ["packages/devtools/src/index.ts", "packages/devtools/src/react/index.ts"];
/** The test files the phase adds; each that exists in the tree must run. */
const BORN_TESTS = [`${TESTS}model/StopLedger.test.ts`, `${TESTS}react/DockFrame.announce.characterisation.test.tsx`, `${TESTS}react/useStopNotice.test.tsx`];
const LEDGER_EXPORTS = ["StopLedger", "announcesStop", "noStops", "recordStop", "stoppedKey"];
const LEDGER_NAMES = /\b(?:StopLedger|noStops|stoppedKey|announcesStop|recordStop)\b/;

const KEYED = /(?<![\w$-])key\s*=/;

/**
 * The opening tags of the elements named `name` (a regex source) in blanked code, as `{ name, raw, attrs }`. `attrs` is the
 * tag's own attributes, with everything inside brackets blanked, so a `key` inside an attribute's expression is not read.
 * The tag ends at the first `>` outside brackets; a generic argument list after the name is skipped first.
 */
export const openingTags = (code, name) => {
  const out = [];
  for (const m of code.matchAll(new RegExp(`<(${name})(?![\\w$.])`, "g"))) {
    let i = m.index + m[0].length;
    if (code[i] === "<") {
      let angle = 0;
      for (; i < code.length; i++) {
        if (code[i] === "<") angle++;
        else if (code[i] === ">" && --angle === 0) {
          i++;
          break;
        }
      }
    }
    const start = i;
    let depth = 0;
    let attrs = "";
    for (; i < code.length; i++) {
      const c = code[i];
      if (depth === 0 && c === ">") break;
      if ("{([".includes(c)) depth++;
      else if ("})]".includes(c)) depth--;
      attrs += depth > 0 ? " " : c;
    }
    out.push({ name: m[1], raw: code.slice(start, i), attrs });
  }
  return out;
};

/** The names a module's blanked code exports: declarations, `export { a as b }` lists, a default and a star. */
export const exportsOf = (code) => {
  const names = [];
  for (const m of code.matchAll(/^[ \t]*export\s+(?:declare\s+)?(?:(?:abstract\s+)?class|const|let|var|function\s*\*?|interface|type|enum)\s+([\w$]+)/gm)) names.push(m[1]);
  for (const m of code.matchAll(/^[ \t]*export\s+(?:type\s+)?\{([^}]*)\}/gm)) {
    for (const part of m[1].split(",")) {
      const name = part.trim().split(/\s+as\s+/).pop();
      if (name !== undefined && name !== "") names.push(name);
    }
  }
  if (/^[ \t]*export\s+default\b/m.test(code)) names.push("default");
  if (/^[ \t]*export\s+\*/m.test(code)) names.push("*");
  return names;
};

/**
 * Reasons the stop path does not have the box shape. `texts` maps each of the four stop-path files to its text or
 * undefined. No file holds a ref or reads `.current`; a notice gives the box no key, no `Binding` and no `stoppedKey`; the
 * box renders a module-private body keyed by `stoppedKey(` on the notice's ledger and status, decides the alert once in a
 * `useState` initializer through `announcesStop(`, and records in a layout effect keyed on `[announced.record, status]`; the
 * hook holds the ledger in a `useReducer` over `recordStop` and `noStops` and memoises the notice on its four inputs. Pure.
 */
export const judgeBoxKeysItself = (texts) => {
  const bad = [];
  const code = {};
  for (const file of STOP_PATH) {
    if (texts[file] === undefined) {
      bad.push(`${file} is missing`);
      continue;
    }
    code[file] = blank(texts[file]);
    if (/\buseRef\b/.test(code[file])) bad.push(`${file} uses useRef: the ledger is held by a reducer, never a ref`);
    if (/\.current\b/.test(code[file])) bad.push(`${file} reads .current: no render reads a ref`);
  }
  for (const file of NOTICES) {
    const text = code[file];
    if (text === undefined) continue;
    if (openingTags(text, "StoppedBox").some((t) => KEYED.test(t.attrs))) bad.push(`${file} gives a <StoppedBox a key: the box keys itself`);
    if (/\bBinding\b/.test(text)) bad.push(`${file} names Binding: the notice is handed to the box whole`);
    if (/\bstoppedKey\b/.test(text)) bad.push(`${file} names stoppedKey: only the box derives its key`);
  }
  const box = code[BOX];
  if (box !== undefined) {
    if (!/\bexport\s+const\s+StoppedBox\b/.test(box)) bad.push(`${BOX} does not export StoppedBox`);
    const keyed = openingTags(box, "[A-Z][\\w$]*").filter((t) => KEYED.test(t.attrs));
    if (keyed.length !== 1) bad.push(`${BOX} has ${keyed.length} keyed elements, not one: the wrapper renders its body keyed`);
    else {
      const [body] = keyed;
      if (!/\bkey\s*=\s*\{\s*stoppedKey\s*\(\s*[\w.]*\bledger\b\s*,\s*[\w.]*\bstatus\b\s*\)\s*\}/.test(body.raw)) bad.push(`${BOX}: the keyed element is not keyed by stoppedKey( on the notice's ledger and status`);
      if (new RegExp(`\\bexport\\s+(?:const|function)\\s+${body.name}\\b`).test(box) || !new RegExp(`\\bconst\\s+${body.name}\\b`).test(box)) bad.push(`${BOX}: the keyed body ${body.name} is not a module-private const`);
    }
    if (!/\buseState\s*\(\s*\(\s*\)\s*=>\s*announcesStop\s*\(/.test(box) || count(box, /\bannouncesStop\s*\(/g) !== 1) bad.push(`${BOX}: the alert is not decided once, in a useState initializer through announcesStop(`);
    const effect = callArgs(box, /\buseLayoutEffect\s*\(/);
    if (effect === undefined) bad.push(`${BOX} records in no useLayoutEffect(`);
    else {
      const [run, deps] = paramsOf(effect);
      if (!/\brecord\s*\(/.test(run ?? "")) bad.push(`${BOX}: the layout effect does not call record(`);
      if (!/^\[\s*(?:[\w$]+\.)*record\s*,\s*status\s*\]$/.test(collapse(deps ?? ""))) bad.push(`${BOX}: the layout effect is not keyed on [announced.record, status]`);
    }
  }
  const hook = code[HOOK];
  if (hook !== undefined) {
    if (!/\buseReducer\s*(?:<[^()]*>)?\s*\(\s*recordStop\s*,\s*noStops\s*\)/.test(hook)) bad.push(`${HOOK} does not hold the ledger in useReducer over recordStop and noStops`);
    const memo = callArgs(hook, /\buseMemo\s*\(/);
    if (memo === undefined) bad.push(`${HOOK} memoises nothing: it has no useMemo(`);
    else {
      const deps = collapse(paramsOf(memo).at(-1) ?? "");
      const names = /^\[.*\]$/.test(deps) ? [...deps.matchAll(/[\w$]+/g)].map((m) => m[0]).sort() : [];
      if (names.join(",") !== "ledger,onRestart,record,status") bad.push(`${HOOK}: the memo is not keyed on status, onRestart, ledger and record`);
    }
  }
  return bad;
};

/**
 * Reasons the stop ledger is not one React-free module only the box and the hook import. `ledger` is its text or
 * undefined, `importers` every `{ file, text }` under `packages/*\/src`, `barrels` the two barrels, `touched` the stop-path
 * files and the module. Pure.
 */
export const judgeLedgerModule = ({ ledger, importers, barrels, touched }) => {
  const bad = barrels.filter(({ text }) => LEDGER_NAMES.test(blank(text, true))).map((b) => `${b.file} names the stop ledger: ${LEDGER} stays out of the barrel`);
  if (ledger === undefined) bad.push(`${LEDGER} is missing`);
  else {
    const kept = blank(ledger, true);
    const code = blank(ledger);
    for (const { spec, line } of importsOf(kept)) bad.push(`${LEDGER}:${line} imports ${spec}: the ledger imports nothing`);
    if (/\b(?:import|require)\s*\(/.test(code)) bad.push(`${LEDGER} loads a module by a call`);
    if (/<\/[A-Za-z>]|\/>|<>/.test(code)) bad.push(`${LEDGER} holds JSX: it is React-free`);
    if (/^\s*["']use client["']/m.test(kept)) bad.push(`${LEDGER} has a use client directive: it is React-free`);
    const names = exportsOf(code);
    for (const name of new Set(names)) if (!LEDGER_EXPORTS.includes(name)) bad.push(`${LEDGER} exports ${name}, which is not one of ${LEDGER_EXPORTS.join(", ")}`);
    for (const name of LEDGER_EXPORTS) if (!names.includes(name)) bad.push(`${LEDGER} does not export ${name}`);
  }
  const importing = importers.filter(({ file, text }) => file !== LEDGER && importsOf(blank(text, true)).some((i) => /(?:^|\/)StopLedger\.ts$/.test(i.spec))).map((f) => f.file);
  for (const file of importing) if (file !== BOX && file !== HOOK) bad.push(`${file} imports ${LEDGER}: only the box and the hook do`);
  for (const file of [BOX, HOOK]) if (!importing.includes(file)) bad.push(`${file} does not import ${LEDGER}`);
  for (const { file, text } of touched) {
    for (const { text: statement, line } of topLevel(blank(text))) if (/^(?:export\s+)?(?:let|var)\b/.test(statement.trim())) bad.push(`${file}:${line} declares a module-scope let or var`);
  }
  return bad;
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

const SCREENS = "spec/behaviors/28-devtools-screens.md";
const SIMULATOR_SPEC = "spec/behaviors/29-devtools-simulator.md";
/** The behaviors whose pinned-by paragraph `records` reads and that exist today; each must keep its heading. */
const PINNED_KEPT = [509, 759, 775];
/** The behaviors the phase writes, in the screens document. */
const NEW_BEHAVIORS = [776, 777, 778, 779, 780];
const PINNED = [...PINNED_KEPT, ...NEW_BEHAVIORS];
/** The invariants the phase writes, and the file each one's `**Source**:` line names. */
const NEW_INVARIANTS = [
  [421, "StopLedger.ts"],
  [422, "StoppedBox.tsx"],
];
/** The rows of the new decision's audit table: each names the property it pinned. */
const AUDIT_KEYS = ["N9", "N12", "TN14", "TN15", "SB1", "SB4"];
/** The changeset sentence the phase's one changeset holds. */
const CHANGESET_SENTENCE =
  "A stop notice's box derives its own key and records the announced stop through state its dock holds for each feed; the announced alert is unchanged. No export changes.";

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

/** The `Revision` of a document's control table as `{ major, minor, text }`, or undefined. */
export const revisionOf = (text) => {
  const m = /^>\s*\|\s*Revision\s*\|\s*(\d+)\.(\d+)\s*\|/m.exec(text);
  return m === null ? undefined : { major: Number(m[1]), minor: Number(m[2]), text: `${m[1]}.${m[2]}` };
};

/** The row ids a line names that are the prefix of a title in `titles`: `N9` for a title `N9 a stop ...`. */
const titleIdsOf = (line, titles) =>
  [...line.matchAll(/(?<![\w-])([A-Z]{1,3}\d+)(?![\w-])/g)].map((m) => m[1]).filter((id) => titles.some((t) => t.startsWith(id) && !/[A-Za-z0-9]/.test(t[id.length] ?? "")));

const adrChecks = (adr, testTitles) => {
  if (adr === undefined) return ["spec/decisions/201-*.md does not exist"];
  const bad = [];
  if (!adr.text.includes("QADI-ADR-201")) bad.push("the ADR-QD-201 file does not carry QADI-ADR-201");
  if (revisionOf(adr.text)?.text !== "1.0") bad.push("the ADR-QD-201 file is not at Revision 1.0");
  const lines = adr.text.split("\n");
  const rows = lines.filter((l) => l.trimStart().startsWith("|"));
  for (const key of AUDIT_KEYS) {
    const named = rows.filter((l) => new RegExp(`(?<![\\w-])${key}(?![\\w-])`).test(l));
    if (named.length === 0) bad.push(`the ADR-QD-201 audit table has no row naming ${key}`);
    for (const row of named) if (titleIdsOf(row, testTitles).length === 0) bad.push(`the ADR-QD-201 audit row naming ${key} names no id that opens a test title`);
  }
  if (!lines.some((l) => l.trim() === "Tests removed: 0.")) bad.push("the ADR-QD-201 file has no line `Tests removed: 0.`");
  if (!lines.some((l) => l.includes("2 parent renders and 2 commits"))) bad.push("the ADR-QD-201 file has no line holding `2 parent renders and 2 commits`");
  if (!lines.some((l) => l.includes("§13"))) bad.push("the ADR-QD-201 file has no line naming §13");
  for (const alternative of ["WeakMap", "setState"]) if (!adr.text.includes(alternative)) bad.push(`the ADR-QD-201 file does not name the alternative ${alternative}`);
  return bad;
};

/**
 * Reasons the records written at the close are missing or wrong. `close` is `{ invariants, decisions, index, readme,
 * revised, changesets, testTitles }`: the text of the invariants, every decision file, the decision index and the readme,
 * the `{ file, base, now }` text of each document that must be one revision above phase_base, the `{ file, text }` of each
 * changeset added since phase_base and every title of the devtools test files.
 */
const judgeClosed = ({ trace, behaviors }, close) => {
  const bad = [];
  const one = sectionOf(trace, "§1 ") ?? "";
  const screens = behaviors.find((b) => b.file === SCREENS);
  for (const n of NEW_BEHAVIORS) {
    if (screens === undefined || sectionOf(screens.text, `BEH-QD-${n}:`) === undefined) bad.push(`BEH-QD-${n} has no heading in ${SCREENS}`);
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
  const b759 = behaviorSection(behaviors, 759);
  if (b759 !== undefined) {
    if (/\buseRef\b/.test(b759)) bad.push("BEH-QD-759 still names useRef");
    if (!b759.includes("ADR-QD-201")) bad.push("BEH-QD-759 does not name ADR-QD-201");
    const named = [...pinnedPara(b759).matchAll(TEST_PATH)].map((m) => inPackage(m[1]));
    for (const test of BORN_TESTS) if (!named.includes(test)) bad.push(`the pinned-by paragraph of BEH-QD-759 does not name ${test}`);
  }
  const b509 = behaviorSection(behaviors, 509);
  for (const n of [776, 777]) if (b509 === undefined || !b509.includes(`#beh-qd-${n}-`)) bad.push(`BEH-QD-509 links no anchor starting #beh-qd-${n}-`);
  bad.push(...adrChecks(close.decisions.find((d) => /(?:^|\/)201-[^/]*[.]md$/.test(d.file)), close.testTitles));
  if (!/^\s*-\s*id:\s*"ADR-QD-201"/m.test(close.index)) bad.push("spec/decisions/index.yaml has no ADR-QD-201 entry");
  const entry = /^\s*-\s*id:\s*"ADR-QD-197"[\s\S]*?(?=^\s*-\s*id:|(?![\s\S]))/m.exec(close.index)?.[0];
  if (entry === undefined || !/^\s*status:.*ADR-QD-201/m.test(entry)) bad.push("the ADR-QD-197 entry of spec/decisions/index.yaml does not name ADR-QD-201 in its status");
  const adr197 = close.decisions.find((d) => /(?:^|\/)197-[^/]*[.]md$/.test(d.file));
  if (adr197 === undefined) bad.push("spec/decisions/197-*.md does not exist");
  else if (!adr197.text.includes("ADR-QD-201")) bad.push("ADR-QD-197 does not name ADR-QD-201");
  if (!/^\| \[ADR-QD-201\]/m.test(sectionOf(trace, "§3 ") ?? "")) bad.push("ADR-QD-201 has no row in spec/traceability.md §3");
  for (const path of [LEDGER, ...BORN_TESTS]) if (!trace.split("\n").some((l) => l.startsWith("|") && l.includes(path))) bad.push(`spec/traceability.md has no row naming ${path}`);
  const ccr = /^\| CCR-QD-480 \|.*$/m.exec(close.readme);
  if (ccr === null) bad.push("spec/README.md has no CCR-QD-480 row");
  else {
    if (!ccr[0].includes("ARCH-135")) bad.push("the CCR-QD-480 row does not name ARCH-135");
    if (!ccr[0].includes("Unused: none")) bad.push("the CCR-QD-480 row does not say Unused: none");
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
    if (!changeset.text.startsWith('---\n"@qadi/devtools": patch\n---\n')) bad.push(`${changeset.file} is not a patch changeset for @qadi/devtools alone`);
    if (!collapse(changeset.text).includes(CHANGESET_SENTENCE)) bad.push(`${changeset.file} does not hold the changeset sentence`);
  }
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
    spawnSync("pnpm", ["exec", "vitest", "run", "--project", "devtools", ...files, "--reporter=json", `--outputFile=${report}`], { stdio: "ignore" });
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
    const baseTests = git("ls-tree", "-r", "--name-only", base, "--", "packages/devtools/test")
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
  "box-keys-itself": () =>
    done(judgeBoxKeysItself(Object.fromEntries(STOP_PATH.map((file) => [file, maybe(file)]))), "box-keys-itself: the stopped box keys itself, decides its alert at mount and records at commit; the notices hand it the notice whole"),
  "ledger-module": () =>
    done(
      judgeLedgerModule({
        ledger: maybe(LEDGER),
        importers: sourceFiles(),
        barrels: BARRELS.map((file) => ({ file, text: readText(file) })),
        touched: [LEDGER, ...STOP_PATH].filter((file) => existsSync(file)).map((file) => ({ file, text: readText(file) })),
      }),
      "ledger-module: the stop ledger is one React-free module only the box and the hook import",
    ),
  records: (args) => {
    const close = args[0] === "--close";
    if (args.length > 0 && !close) return fail(["usage: records [--close]"]);
    const behaviors = [SCREENS, SIMULATOR_SPEC].map((file) => ({ file, text: readText(file) }));
    const extra = close
      ? (() => {
          const base = readBase();
          const decisions = readdirSync("spec/decisions").filter((f) => /^\d+-.*[.]md$/.test(f)).map((f) => ({ file: f, text: readText(`spec/decisions/${f}`) }));
          const adr197 = decisions.find((d) => d.file.startsWith("197-"));
          const revised = ["spec/README.md", "spec/traceability.md", "spec/invariants.md", SCREENS, ...(adr197 === undefined ? [] : [`spec/decisions/${adr197.file}`])].map((file) => ({ file, base: git("show", `${base}:${file}`), now: readText(file) }));
          const testTitles = treeFiles("packages/devtools/test").filter((p) => /\.test\.tsx?$/.test(p)).flatMap((p) => pinTitlesOf(readText(p)).map(collapse));
          return {
            invariants: readText("spec/invariants.md"),
            decisions,
            index: readText("spec/decisions/index.yaml"),
            readme: readText("spec/README.md"),
            revised,
            changesets: addedChangesets(base),
            testTitles,
          };
        })()
      : undefined;
    const ok = "records: the pinned-by lists name tests that exist";
    return done(judgeRecords({ trace: readText("spec/traceability.md"), behaviors, tests: (path) => maybe(path) }, extra), close ? `${ok}, and every reserved record is written` : ok);
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
  for (const line of ["// D-49 says", "see 88-03", "SBOX-02 holds", "WX-05", "QD-88 closes", "Phase 88 added", "phase 88", "ADR-QD-NEXT", "x BEH-QD-NEXT y"]) {
    eq(`${line} is flagged`, judgeIds([idEntry("packages/devtools/src/a.ts", line)]).length, 1);
  }
  for (const line of ["ADR-QD-201", "INV-QD-421", "BEH-QD-776", "D-49-a", "CCR-QD-480", "ARCH-135", "ADR-QD-88", "a 1288-03x", "x188-03", "SBOX-1", "Phase 880"]) {
    eq(`${line} is not flagged`, judgeIds([idEntry("packages/devtools/src/a.ts", line)]), []);
  }
  for (const line of ["this phase", "Until Now", "any more", "no longer", "from now on", "it holds from now on", "publishes, from now on"]) {
    eq(`${line} is flagged in source`, judgeIds([idEntry("packages/devtools/src/a.ts", line)]).length, 1);
  }
  eq("a status tape's own subscription time is not phase-relative", judgeIds([idEntry("packages/devtools/test/a.test.ts", "/** The tag of every status a feed publishes from now on, in order. */")]), []);
  eq("a changeset may say no longer", judgeIds([idEntry(".changeset/a.md", "no longer")]), []);
  eq("the upgrade guide may say no longer", judgeIds([idEntry("apps/website/src/content/docs/docs/reference/upgrading.md", "no longer")]), []);
  eq("a changeset is still scanned for ids", judgeIds([idEntry(".changeset/a.md", "SBOX-01")]).length, 1);
  const spec = "# Title\nno longer here\n## Change History\n| 1 | no longer a row |\n";
  eq("a phrase before the change history is flagged", judgeIds([{ file: "spec/a.md", text: spec, added: new Set([2]) }]).length, 1);
  eq("a phrase in the change history is exempt", judgeIds([{ file: "spec/a.md", text: spec, added: new Set([4]) }]), []);
  const header = "> | Change History | 1.1 (2026-11-24): a row\n> | Status | no longer here\n";
  eq("a phrase in the Document Control history row is exempt", judgeIds([{ file: "spec/a.md", text: header.replace("a row", "no longer a row"), added: new Set([1]) }]), []);
  eq("a phrase in another Document Control row is flagged", judgeIds([{ file: "spec/a.md", text: header, added: new Set([2]) }]).length, 1);
  eq("an older entry of the Document Control history row is not new text", judgeIds([{ file: "spec/a.md", text: "> | Change History | 1.2 (2026-11-24): a row<br>1.1 (2026-11-10): D-01 approved, no longer<br>1.0 (2026-11-09): Initial\n", added: new Set([1]) }]), []);
  eq("an id in the Document Control history row is still flagged", judgeIds([{ file: "spec/a.md", text: "> | Change History | 1.1 (2026-11-24): SBOX-01\n", added: new Set([1]) }]).length, 1);

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
  const PLAN = "docs(88-01): record";
  const log = [c("docs(88): create phase plan", [".planning/a.md"]), c("docs(phase-88): add pattern map", [".planning/b.md"]), c(PLAN, ["b", "a"]), c("chore(88-01): next", ["z"])];
  eq("--first passes over planning commits that change only .planning", judgeCommit(log, PLAN, ["a", "b"], true), []);
  eq("the second plan commit passes without --first", judgeCommit(log, "chore(88-01): next", ["z"], false), []);
  eq("--first on the second plan commit fails", judgeCommit(log, "chore(88-01): next", ["z"], true)[0].startsWith("the commit is not the first plan commit"), true);
  eq("a commit before the first plan commit that changes source fails", judgeCommit([c("docs(88): x", [".planning/a.md", "packages/x.ts"]), c(PLAN, ["a"])], PLAN, ["a"], true), ["docs(88): x precedes the first plan commit and changes packages/x.ts outside .planning"]);
  eq("a wrong subject fails", judgeCommit(log, "other", ["a"], false).length, 1);
  eq("an extra path fails", judgeCommit(log, PLAN, ["a"], false).length, 1);
  eq("a missing path fails", judgeCommit(log, PLAN, ["a", "b", "c"], false).length, 1);
  eq("a duplicate subject fails", judgeCommit([c(PLAN, ["a"]), c(PLAN, ["a"])], PLAN, ["a"], false).length, 1);
  eq("a commit without the trailer fails", judgeCommit([c(PLAN, ["a"], PLAN)], PLAN, ["a"], false).length, 1);
  eq("a Phase 87 subject is refused by commit", judgeCommit([c("docs(87-01): x", ["a"])], PLAN, ["a"], false).length, 1);
  eq("a Phase 87 subject is not a plan commit", PLAN_SUBJECT.test("docs(87-01): x"), false);
  eq("a Phase 88 subject is a plan commit", PLAN_SUBJECT.test("chore(88-12)!: x"), true);

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
  eq("the record's phase_base is read", phaseBaseOf(`{"phase":"88","phase_base":"${sha}"}`), sha);
  eq("a record with no phase_base gives none", phaseBaseOf('{"phase":"88"}'), undefined);
  eq("a phase_base that is not a full sha gives none", phaseBaseOf('{"phase_base":"cbe375bf"}'), undefined);
  eq("a record that is not JSON gives none", phaseBaseOf("nope"), undefined);
  eq("no record gives none", phaseBaseOf(undefined), undefined);

  // The wording and the evidence forms the 88 scans add.
  for (const line of ["it previously held", "the box now does this", "Previously it was"]) {
    eq(`${line} is flagged in source`, judgeIds([idEntry("packages/devtools/src/a.ts", line)]).length, 1);
  }
  eq("a changeset may say previously", judgeIds([idEntry(".changeset/a.md", "previously")]), []);
  const tagged = "- failed (base remount-after-commit): spaced tag\n- red before: a red file\n";
  eq("a failure line whose tag holds spaces and hyphens names its title", judgeSeenFailing('it("spaced tag", () => {});', tagged, []), []);
  eq("a red before line names its title too", judgeSeenFailing('it("a red file", () => {});', tagged, []), []);

  // A commit and the paths the run rules never stage.
  const SUBJECT = "chore(88-02): add the phase check";
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
  for (const p of ["packages/devtools/README.md", ".planning/STATE.md", ".planning/phases/QD-88-stoppedbox-keys-itself-and-owns-the-announce-once-rule/88-check.mjs"]) {
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

  // The opening tags and the exports the shape judges read.
  eq("an opening tag is read past a generic list and an arrow in braces", openingTags('<A<B> x={() => 1 > 2} y="s"/><C />', "A").map((t) => t.raw), [' x={() => 1 > 2} y="s"/']);
  eq("only an element's own attributes are kept", (openingTags("<A key={1} b={<i key={2} />} />", "A")[0].attrs.match(/key=/g) ?? []).length, 1);
  eq("the exports of a module are read", exportsOf(blank('export const a = 1;\nexport function b() {}\nexport type { C as D };\nexport default x;\nexport * from "./y.ts";\nexport interface E {}\n')), ["a", "b", "E", "D", "default", "*"]);

  // box-keys-itself.
  const boxOk = [
    '"use client";',
    'import type { ReactElement } from "react";',
    'import { useLayoutEffect, useState } from "react";',
    'import { announcesStop, stoppedKey, type StopLedger } from "../model/StopLedger.ts";',
    "/** A comment may say useRef, .current and key={x}. */",
    "export interface AnnouncedStops<S> {",
    "  readonly ledger: StopLedger<S>;",
    "  readonly record: (status: S) => void;",
    "}",
    "export interface StopNoticeProps<S> {",
    "  readonly status: S;",
    "  readonly onRestart: () => void;",
    "  readonly announced: AnnouncedStops<S>;",
    "}",
    "export interface StoppedBoxProps<S> {",
    "  readonly notice: StopNoticeProps<S>;",
    "  readonly reason: string;",
    "}",
    "export const StoppedBox = <S,>(props: StoppedBoxProps<S>): ReactElement => (",
    "  <StoppedBody key={stoppedKey(props.notice.announced.ledger, props.notice.status)} {...props} />",
    ");",
    "const StoppedBody = <S,>({ notice: { status, onRestart, announced }, reason }: StoppedBoxProps<S>): ReactElement => {",
    "  const [alert] = useState(() => announcesStop(announced.ledger, status));",
    "  useLayoutEffect(() => announced.record(status), [announced.record, status]);",
    '  return <section role={alert ? "alert" : undefined} onClick={onRestart}>{reason}</section>;',
    "};",
    "",
  ].join("\n");
  const hookOk = [
    '"use client";',
    'import { useMemo, useReducer } from "react";',
    'import { noStops, recordStop, type StopLedger } from "../model/StopLedger.ts";',
    'import type { StopNoticeProps } from "./StoppedBox.tsx";',
    "/** A comment may say useRef and .current. */",
    "export const useStopNotice = <S>(status: S, onRestart: () => void): StopNoticeProps<S> => {",
    "  const [ledger, record] = useReducer<StopLedger<S>, [S]>(recordStop, noStops);",
    "  return useMemo(() => ({ status, onRestart, announced: { ledger, record } }), [status, onRestart, ledger, record]);",
    "};",
    "",
  ].join("\n");
  const timelineOk = [
    '"use client";',
    'import type { FC, ReactNode } from "react";',
    'import * as Match from "effect/Match";',
    'import type { TimelineStatus } from "../model/TimelineFeed.ts";',
    'import { StoppedBox, type StopNoticeProps } from "./StoppedBox.tsx";',
    "/** A comment may say Binding, stoppedKey and key={x}. */",
    "export type TimelineNoticeProps = StopNoticeProps<TimelineStatus>;",
    "const noticeOf: (self: TimelineStatus) => (notice: TimelineNoticeProps) => ReactNode = Match.type<TimelineStatus>().pipe(",
    "  Match.tagsExhaustive({",
    "    Reading: () => () => null,",
    "    Stopped: (status) => (notice: TimelineNoticeProps) => (",
    "      <div>",
    '        <StoppedBox<TimelineStatus> notice={notice} reason={status.reason} feed="timeline" />',
    "      </div>",
    "    ),",
    "  }),",
    ");",
    "export const TimelineNotice: FC<TimelineNoticeProps> = (notice) => <>{noticeOf(notice.status)(notice)}</>;",
    "",
  ].join("\n");
  const diagnosticsOk = timelineOk.replaceAll("Timeline", "Diagnostics").replaceAll("timeline", "diagnostics");
  const shape = (over = {}) => judgeBoxKeysItself({ [BOX]: boxOk, [HOOK]: hookOk, [NOTICES[0]]: timelineOk, [NOTICES[1]]: diagnosticsOk, ...over });
  const mentions = (reasons, part) => reasons.some((r) => r.includes(part));
  eq("a stop path of the right shape passes", shape(), []);
  eq("a missing file is reported", shape({ [HOOK]: undefined }), [`${HOOK} is missing`]);
  eq("a useRef in the box fails", mentions(shape({ [BOX]: boxOk.replace('import type { ReactElement } from "react";', 'import type { ReactElement } from "react";\nconst held = useRef(null);') }), "uses useRef"), true);
  eq("a .current in the hook fails", mentions(shape({ [HOOK]: hookOk.replace("  return useMemo", "  const held = ledger.current;\n  return useMemo") }), "reads .current"), true);
  eq("a key on a StoppedBox in a notice fails", mentions(shape({ [NOTICES[0]]: timelineOk.replace("<StoppedBox<TimelineStatus> notice", "<StoppedBox<TimelineStatus> key={notice.status.reason} notice") }), "gives a <StoppedBox a key"), true);
  eq("a key inside an attribute expression is not the box's key", shape({ [NOTICES[0]]: timelineOk.replace("notice={notice}", "notice={notice} extra={<i key={1} />}") }), []);
  eq("a Binding in a notice fails", mentions(shape({ [NOTICES[1]]: `${diagnosticsOk}type Binding = Pick<DiagnosticsNoticeProps, "onRestart">;\n` }), "names Binding"), true);
  eq("a stoppedKey import in a notice fails", mentions(shape({ [NOTICES[0]]: timelineOk.replace("{ StoppedBox, type", "{ StoppedBox, stoppedKey, type") }), "names stoppedKey"), true);
  eq("a body with no keyed wrapper fails", mentions(shape({ [BOX]: boxOk.replace("key={stoppedKey(props.notice.announced.ledger, props.notice.status)} ", "") }), "has 0 keyed elements"), true);
  eq("a body keyed on something else fails", mentions(shape({ [BOX]: boxOk.replace("stoppedKey(props.notice.announced.ledger, props.notice.status)", "props.notice.status.reason") }), "is not keyed by stoppedKey("), true);
  eq("a body keyed on the status before the ledger fails", mentions(shape({ [BOX]: boxOk.replace("props.notice.announced.ledger, props.notice.status", "props.notice.status, props.notice.announced.ledger") }), "is not keyed by stoppedKey("), true);
  eq("an exported body fails", mentions(shape({ [BOX]: boxOk.replace("const StoppedBody =", "export const StoppedBody =") }), "is not a module-private const"), true);
  eq("a box that is not exported fails", mentions(shape({ [BOX]: boxOk.replace("export const StoppedBox", "const StoppedBox") }), "does not export StoppedBox"), true);
  eq("an alert decided outside a useState initializer fails", mentions(shape({ [BOX]: boxOk.replace("const [alert] = useState(() => announcesStop(announced.ledger, status));", "const alert = announcesStop(announced.ledger, status);") }), "the alert is not decided once"), true);
  eq("a record effect keyed on the handle whole fails", mentions(shape({ [BOX]: boxOk.replace("[announced.record, status]", "[announced, status]") }), "is not keyed on [announced.record, status]"), true);
  eq("a layout effect that records nothing fails", mentions(shape({ [BOX]: boxOk.replace("() => announced.record(status)", "() => undefined") }), "does not call record("), true);
  eq("a box with no layout effect fails", mentions(shape({ [BOX]: boxOk.replace("useLayoutEffect(", "useEffect(") }), "records in no useLayoutEffect("), true);
  eq("a hook memo keyed on the status alone fails", mentions(shape({ [HOOK]: hookOk.replace("[status, onRestart, ledger, record]", "[status]") }), "the memo is not keyed"), true);
  eq("a hook memo without the restart fails", mentions(shape({ [HOOK]: hookOk.replace("[status, onRestart, ledger, record]", "[status, ledger, record]") }), "the memo is not keyed"), true);
  eq("a hook memo with no dependency list fails", mentions(shape({ [HOOK]: hookOk.replace(", [status, onRestart, ledger, record]", "") }), "the memo is not keyed"), true);
  eq("a hook with no useReducer fails", mentions(shape({ [HOOK]: hookOk.replace("useReducer<StopLedger<S>, [S]>(recordStop, noStops)", "useState(noStops)") }), "does not hold the ledger in useReducer"), true);
  eq("a reducer typed without generics passes", shape({ [HOOK]: hookOk.replace("useReducer<StopLedger<S>, [S]>(", "useReducer(") }), []);
  eq("a hook with no useMemo fails", mentions(shape({ [HOOK]: hookOk.replace("useMemo(", "other(") }), "has no useMemo("), true);

  // ledger-module.
  const ledgerOk = [
    "/** What a dock has announced. A comment may say import, JSX </div> and use client. */",
    "export interface StopLedger<S> {",
    "  readonly stop: S | undefined;",
    "  readonly count: number;",
    "}",
    "export const noStops: StopLedger<never> = { stop: undefined, count: 0 };",
    "export const stoppedKey = <S,>(ledger: StopLedger<S>, status: S): number => (ledger.stop === status ? ledger.count : ledger.count + 1);",
    "export const announcesStop = <S,>(ledger: StopLedger<S>, status: S): boolean => ledger.stop !== status;",
    "export const recordStop = <S,>(ledger: StopLedger<S>, status: S): StopLedger<S> => (ledger.stop === status ? ledger : { stop: status, count: ledger.count + 1 });",
    "",
  ].join("\n");
  const importing = (file) => ({ file, text: 'import { x } from "../model/StopLedger.ts";\n' });
  const importersOk = [importing(BOX), importing(HOOK), { file: `${REACT}Other.tsx`, text: 'import { y } from "./theme.ts";\n' }];
  const barrelsOk = BARRELS.map((f) => ({ file: f, text: 'export * from "./model/Other.ts";\n' }));
  const ledgerJudged = (over = {}) => judgeLedgerModule({ ledger: ledgerOk, importers: importersOk, barrels: barrelsOk, touched: [{ file: LEDGER, text: ledgerOk }], ...over });
  eq("a ledger module of the right shape passes", ledgerJudged(), []);
  eq("a missing module is reported", ledgerJudged({ ledger: undefined }), [`${LEDGER} is missing`]);
  eq("an import in the module fails", mentions(ledgerJudged({ ledger: `import { useState } from "react";\n${ledgerOk}` }), "imports react"), true);
  eq("a dynamic import in the module fails", mentions(ledgerJudged({ ledger: `${ledgerOk}const lazy = import("x");\n` }), "loads a module by a call"), true);
  eq("a JSX element in the module fails", mentions(ledgerJudged({ ledger: `${ledgerOk}export const View = <div>x</div>;\n` }), "holds JSX"), true);
  eq("a self-closing JSX element in the module fails", mentions(ledgerJudged({ ledger: `${ledgerOk}const view = <br />;\n` }), "holds JSX"), true);
  eq("a use client directive in the module fails", mentions(ledgerJudged({ ledger: `"use client";\n${ledgerOk}` }), "use client directive"), true);
  eq("a sixth export fails", mentions(ledgerJudged({ ledger: `${ledgerOk}export const extra = 1;\n` }), "exports extra"), true);
  eq("an export list name counts as an export", mentions(ledgerJudged({ ledger: `${ledgerOk}export { stoppedKey as other };\n` }), "exports other"), true);
  eq("a missing export fails", mentions(ledgerJudged({ ledger: ledgerOk.replace(/^export const recordStop.*\n/m, "") }), "does not export recordStop"), true);
  eq("a third importer fails", mentions(ledgerJudged({ importers: [...importersOk, importing(`${REACT}DevtoolsDock.tsx`)] }), "only the box and the hook do"), true);
  eq("an export from the module in a barrel file counts as an importer", mentions(ledgerJudged({ importers: [...importersOk, { file: "packages/devtools/src/index.ts", text: 'export { noStops } from "./model/StopLedger.ts";\n' }] }), "only the box and the hook do"), true);
  eq("a missing importer fails", mentions(ledgerJudged({ importers: [importing(BOX)] }), `${HOOK} does not import`), true);
  eq("a barrel naming the module fails", mentions(ledgerJudged({ barrels: [{ file: BARRELS[0], text: 'export { noStops } from "./model/StopLedger.ts";\n' }, barrelsOk[1]] }), "stays out of the barrel"), true);
  eq("a module-scope let in a touched file fails", mentions(ledgerJudged({ touched: [{ file: BOX, text: "let a = 1;\n" }] }), "declares a module-scope let or var"), true);
  eq("a let inside a function passes", ledgerJudged({ touched: [{ file: BOX, text: "const f = () => {\n  let a = 1;\n  return a;\n};\n" }] }), []);

  // records.
  const rTest = 'it("a title", () => {});\nit("N1 row", () => {});\n';
  const rTests = (p) => (p.startsWith(TESTS) ? rTest : undefined);
  const rPin = (paths) => `Pinned by ${paths.map((p) => `\`${p}\` ("a title"; N1)`).join(", ")}.`;
  const rBeh = (n, body) => `## BEH-QD-${n}: heading\n\n${body}\n\n`;
  const rAdr = [
    "| Document ID | QADI-ADR-201 |",
    "> | Revision       | 1.0   |",
    "",
    "| Row | Property | Test |",
    "| --- | -------- | ---- |",
    ...AUDIT_KEYS.map((key) => `| ${key} | a property | ${key} |`),
    "",
    "Tests removed: 0.",
    "",
    "A stop costs 2 parent renders and 2 commits, against 1 and 1.",
    "The rule is not engaged by §13.",
    "Rejected: a WeakMap of identities; setState during render.",
    "",
  ].join("\n");
  const rFix = () => ({
    behaviors: [
      {
        file: SCREENS,
        text: [rBeh(509, `See [a](#beh-qd-776-x) and [b](#beh-qd-777-y).\n\n${rPin([BORN_TESTS[1]])}`), rBeh(759, `A reducer, ADR-QD-201.\n\n${rPin(BORN_TESTS)}`), ...NEW_BEHAVIORS.map((n) => rBeh(n, rPin([BORN_TESTS[1]])))].join(""),
      },
      { file: SIMULATOR_SPEC, text: rBeh(775, rPin([BORN_TESTS[2]])) },
    ],
    trace: [
      "## §1 Behavior to source",
      "",
      `| 28 | BEH-QD-776–780 | \`${LEDGER}\` |`,
      "",
      "## §2 Invariant traceability",
      "",
      "| [INV-QD-421](a) | d |",
      "| [INV-QD-422](a) | d |",
      "",
      "## §3 Decision traceability",
      "",
      "| [ADR-QD-201](a) | t |",
      "",
      "## §4 Test file map",
      "",
      ...BORN_TESTS.map((p) => `| \`${p}\` | x |`),
      "",
    ].join("\n"),
    close: {
      invariants: `## INV-QD-421: a\n\n**Source**: \`${LEDGER}\`.\n\n## INV-QD-422: b\n\n**Source**: \`${BOX}\`.\n`,
      decisions: [
        { file: "201-x.md", text: rAdr },
        { file: "197-x.md", text: "> | Revision       | 1.5   |\nADR-QD-201 is named.\n" },
      ],
      index: '  - id: "ADR-QD-197"\n    status: "Accepted; amended (ADR-QD-201)"\n  - id: "ADR-QD-201"\n    file: "201-x.md"\n',
      readme: "| CCR-QD-480 | 2026-11-26 | ARCH-135 the box. Unused: none |\n",
      revised: ["spec/README.md", "spec/traceability.md", "spec/invariants.md", SCREENS, "spec/decisions/197-x.md"].map((file) => ({ file, base: "> | Revision       | 1.4   |\n", now: "> | Revision       | 1.5   |\n" })),
      changesets: [{ file: ".changeset/a.md", text: `---\n"@qadi/devtools": patch\n---\n\n${CHANGESET_SENTENCE}\n` }],
      testTitles: ["N9 a", "N12 b", "TN14 c", "TN15 d", "SB1 e", "SB4 f"],
    },
  });
  const rec = (mutate, { close = true, tests = rTests } = {}) => {
    const f = rFix();
    mutate?.(f);
    return judgeRecords({ trace: f.trace, behaviors: f.behaviors, tests }, close ? f.close : undefined);
  };
  const screensText = (f, from, to) => {
    f.behaviors[0].text = f.behaviors[0].text.replace(from, to);
  };
  eq("records that agree pass, closed or not", [rec(undefined), rec(undefined, { close: false })], [[], []]);
  eq("a quoted title that no test holds fails", mentions(rec((f) => screensText(f, '("a title"; N1)', '("a titel"; N1)'), { close: false }), 'quotes "a titel"'), true);
  eq("a row id that no title opens fails", mentions(rec((f) => screensText(f, "N1)", "N9)"), { close: false }), "names row N9"), true);
  eq("a pinned file that does not exist fails", mentions(rec(undefined, { close: false, tests: (p) => (p === BORN_TESTS[1] ? undefined : rTests(p)) }), "which does not exist"), true);
  eq("a kept behavior with no heading fails", mentions(rec((f) => screensText(f, "## BEH-QD-509:", "## BEH-QD-9509:"), { close: false }), "BEH-QD-509 has no heading in the behavior documents"), true);
  eq("a behavior whose pinned-by names no file fails", mentions(rec((f) => screensText(f, rPin(BORN_TESTS), "Pinned by nothing."), { close: false }), "names no test file"), true);
  eq("a new behavior with no heading is skipped without --close", rec((f) => screensText(f, "## BEH-QD-778:", "## BEH-QD-9778:"), { close: false }), []);
  const closedHas = (mutate, part) => mentions(rec(mutate), part);
  eq("a new behavior with no heading fails the close", closedHas((f) => screensText(f, "## BEH-QD-778:", "## BEH-QD-9778:"), "BEH-QD-778 has no heading"), true);
  eq("a new behavior with no row in section 1 fails", closedHas((f) => (f.trace = f.trace.replace("BEH-QD-776–780", "BEH-QD-776–779")), "BEH-QD-780 has no row in spec/traceability.md §1"), true);
  eq("a missing invariant row fails", closedHas((f) => (f.trace = f.trace.replace("| [INV-QD-422](a) | d |", "")), "INV-QD-422 has no row in spec/traceability.md §2"), true);
  eq("a missing invariant heading fails", closedHas((f) => (f.close.invariants = f.close.invariants.replace("## INV-QD-421:", "## INV-QD-9421:")), "INV-QD-421 has no heading"), true);
  eq("a source line that does not name its file fails", closedHas((f) => (f.close.invariants = f.close.invariants.replace("StoppedBox.tsx", "x")), "does not name StoppedBox.tsx"), true);
  eq("a behavior 759 that names useRef fails", closedHas((f) => screensText(f, "A reducer", "A useRef"), "BEH-QD-759 still names useRef"), true);
  eq("a behavior 759 that does not name the decision fails", closedHas((f) => screensText(f, ", ADR-QD-201.", "."), "BEH-QD-759 does not name ADR-QD-201"), true);
  eq("a behavior 759 pinned-by without a born test fails", closedHas((f) => screensText(f, `\`${BORN_TESTS[2]}\` ("a title"; N1).`, ""), `does not name ${BORN_TESTS[2]}`), true);
  eq("a behavior 509 without the anchor fails", closedHas((f) => screensText(f, "#beh-qd-777-y", "#beh-qd-770-y"), "links no anchor starting #beh-qd-777-"), true);
  eq("a missing decision file fails", closedHas((f) => (f.close.decisions = [f.close.decisions[1]]), "spec/decisions/201-*.md does not exist"), true);
  const adr = (from, to) => (f) => (f.close.decisions[0].text = f.close.decisions[0].text.replace(from, to));
  eq("a decision file without its document id fails", closedHas(adr("QADI-ADR-201", "none"), "does not carry QADI-ADR-201"), true);
  eq("a decision file at another revision fails", closedHas(adr("1.0 ", "1.1 "), "is not at Revision 1.0"), true);
  eq("a decision file without the zero line fails", closedHas(adr("Tests removed: 0.", "Tests removed: 1."), "no line `Tests removed: 0.`"), true);
  eq("an audit table with no row for N12 fails", closedHas(adr("| N12 | a property | N12 |\n", ""), "has no row naming N12"), true);
  eq("an audit row that names no id a title opens fails", closedHas((f) => (f.close.testTitles = f.close.testTitles.filter((t) => !t.startsWith("SB4"))), "audit row naming SB4 names no id"), true);
  eq("a decision file without the cost line fails", closedHas(adr("2 parent renders and 2 commits", "two passes"), "2 parent renders and 2 commits"), true);
  eq("a decision file without the section 13 line fails", closedHas(adr("§13", "13"), "naming §13"), true);
  eq("a decision file without the WeakMap alternative fails", closedHas(adr("WeakMap", "map"), "the alternative WeakMap"), true);
  eq("a decision file without the setState alternative fails", closedHas(adr("setState", "state"), "the alternative setState"), true);
  eq("a missing index entry fails", closedHas((f) => (f.close.index = f.close.index.replace('  - id: "ADR-QD-201"\n    file: "201-x.md"\n', "")), "has no ADR-QD-201 entry"), true);
  eq("an amended decision whose index status does not name the new one fails", closedHas((f) => (f.close.index = f.close.index.replace("(ADR-QD-201)", "")), "entry of spec/decisions/index.yaml does not name ADR-QD-201"), true);
  eq("an amended decision that does not name the new one fails", closedHas((f) => (f.close.decisions[1].text = "> | Revision       | 1.5   |\n"), "ADR-QD-197 does not name ADR-QD-201"), true);
  eq("a missing section 3 row fails", closedHas((f) => (f.trace = f.trace.replace("| [ADR-QD-201](a) | t |", "")), "ADR-QD-201 has no row in spec/traceability.md §3"), true);
  eq("a missing row naming the module fails", closedHas((f) => (f.trace = f.trace.replace(LEDGER, "x")), `no row naming ${LEDGER}`), true);
  eq("a missing row naming a born test fails", closedHas((f) => (f.trace = f.trace.replace(`| \`${BORN_TESTS[2]}\` | x |`, "")), `no row naming ${BORN_TESTS[2]}`), true);
  eq("a missing CCR row fails", closedHas((f) => (f.close.readme = ""), "has no CCR-QD-480 row"), true);
  eq("a CCR row that does not name the item fails", closedHas((f) => (f.close.readme = f.close.readme.replace("ARCH-135", "x")), "does not name ARCH-135"), true);
  eq("a CCR row that does not say unused none fails", closedHas((f) => (f.close.readme = f.close.readme.replace("Unused: none", "none")), "does not say Unused: none"), true);
  eq("a revision equal to its base fails", closedHas((f) => (f.close.revised[0].now = f.close.revised[0].base), "is at Revision 1.4, not 1.5"), true);
  eq("a revision two above its base fails", closedHas((f) => (f.close.revised[1].now = f.close.revised[1].now.replace("1.5", "1.6")), "is at Revision 1.6, not 1.5"), true);
  eq("a document with no revision fails", closedHas((f) => (f.close.revised[2].now = "x"), "has no Revision"), true);
  eq("the revision is read from the control table", revisionOf("> | Revision       | 1.413     |\n"), { major: 1, minor: 413, text: "1.413" });
  eq("a second changeset fails", closedHas((f) => f.close.changesets.push({ file: ".changeset/b.md", text: "x" }), "2 changesets are added since phase_base, not one"), true);
  eq("no changeset fails", closedHas((f) => (f.close.changesets = []), "0 changesets are added since phase_base, not one"), true);
  eq("a changeset that is not a patch fails", closedHas((f) => (f.close.changesets[0].text = f.close.changesets[0].text.replace("patch", "minor")), "is not a patch changeset"), true);
  eq("a changeset without the sentence fails", closedHas((f) => (f.close.changesets[0].text = f.close.changesets[0].text.replace("derives", "finds")), "does not hold the changeset sentence"), true);
  eq("a changeset wrapped over lines still holds the sentence", rec((f) => (f.close.changesets[0].text = f.close.changesets[0].text.replace("; the", ";\nthe"))), []);

  const diff = "diff --git a/x.ts b/x.ts\n--- a/x.ts\n+++ b/x.ts\n@@ -3,1 +3,2 @@\n-old\n+new\n+newer\n@@ -9,0 +11 @@\n+late\ndiff --git a/gone.ts b/gone.ts\n--- a/gone.ts\n+++ /dev/null\n@@ -1 +0,0 @@\n-x\n";
  const parsed = parseDiff(diff);
  eq("a diff's added lines are numbered in the new file", [[...parsed.get("x.ts")], parsed.has("gone.ts")], [[3, 4, 11], false]);

  console.log(`self-test: ${passed} passed`);
};

const [mode, ...args] = process.argv.slice(2);
// Run as a script, not when a judge is imported from another file.
if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (mode === undefined || !Object.hasOwn(MODES, mode)) fail([`usage: node 88-check.mjs ${Object.keys(MODES).join("|")}`]);
  else MODES[mode](args);
}
