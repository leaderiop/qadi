// The phase's shared check, run from the repository root as `node <this file> <mode> [args]`. Each mode is a pure judge
// over text plus a thin reader that gathers the text from git or the tree; a failure prints its reasons to stderr and
// exits 1. A mode reads and judges: it never commits, stages or edits a file of the tree (`scratch`, `variant`,
// `sixth-port` and `scratch-clean` write only under the scratch directory <S> and append to the evidence file). Modes:
//   base                                     prints phase_base from the committed 90-mutation-base.json, after checking the branch,
//                                            that the planning commit and phase_base are ancestors of HEAD and that nothing outside
//                                            `.planning/` differs between them
//   commit "<subject>" <path>...             exactly one commit since phase_base has this subject and exactly these paths, none of
//                                            them a path the run rules never stage, and it carries the one trailer
//   unchanged <path>...                      the tree matches phase_base on these paths and none is untracked
//   scratch <name> [--at <rev>]              a clone of the repository under <S>/<name> (the literal `phase_base` names the base),
//                                            node_modules linked, prints its path
//   scratch-clean [--check]                  removes <S> (`--check` removes nothing and fails while it exists)
//   variant <name> <label> <kind> [args...] --edit "<what>"
//                                            runs one check in the scratch clone <S>/<name>, edited beforehand, and appends a block
//                                            to the evidence file; exits 0 only when the run failed. kinds: vitest, tstyche,
//                                            tsc-src, tsc-test, house-style, api, circular, script
//   seen-failing <file> [--titles-matching <prefix>] [--if-present]
//                                            every title of the file has a `- seen failing:` line in the evidence file
//   vitest <file>...                         runs the files, fails on zero tests or any failure
//   suite                                    the same over the core, http, testing and devtools projects
//   scan-ids                                 added lines (tree against phase_base, .planning excluded) name no id or phase wording
//   scan-forbidden                           added source and test lines use none of the forbidden forms, and no guarded file moved
//   trailers [--message <file>]              every commit since phase_base has exactly one trailer, the owner's
//   circular                                 `pnpm circular` finds no cycle
//   records [--close]                        the pinned-by lists name tests that exist; --close also needs every record written
//   port-facts [names|spans|fixtures|serving]...  the shape of the per-port facts
//   scoped-route [derived|route]...          the shape of the scoped read
//   sixth-port base|close [--record] [--on-chain <chain>]   the compile errors a sixth port without its facts makes
//   spike [--rerun]                          the verdict table of the spike agrees with its patches and outputs
//   bench [--pass|--smoke]                   the bench gate's record agrees with its patch, its commits and its analysis
//   routing-landed                           the routing landed as the gate of record's patch, or the gate failed
//   close                                    every phase check, run once, for the last plan
//   --self-test                              drives every judge with planted text
// Shortcuts: the comment and string blanking does not understand regex literals, `any` is read by the token before it,
// and a function whose return type is a literal object type is read wrongly by the module-scope reader: reword the
// declaration. A false positive is cleared by rewording the line, never by weakening a judge. The shape modes read source
// text with comments and strings blanked and match its shapes by pattern, with brackets matched as the text between a
// bracket and its match, so a bracket inside a regex literal is read wrongly; TypeScript 7's JavaScript API has no
// in-process parser (only a server-backed one that reads the files of a project), so a planted self-test text could not be
// parsed by it, and the shape modes use that reader instead. A pinned-by paragraph starts at `Pinned by` or `Enforcement:`
// and ends at the next blank line. A revision one step above its base is the next minor number (1.413 to 1.414, 1.4 to 1.5).
import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { appendFileSync, existsSync, mkdirSync, readFileSync, mkdtempSync, readdirSync, realpathSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, relative } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const SELF = fileURLToPath(import.meta.url);
/** This script's own directory, relative to the repository root, with a trailing slash. */
const D = `${relative(process.cwd(), dirname(SELF))}/`;
/** This script's own directory name: the one phase directory a run may stage under `.planning/phases/`. */
const PHASE_DIR = basename(dirname(SELF));
const EVIDENCE = `${D}90-RED-EVIDENCE.md`;
const BASE_RECORD = `${D}90-mutation-base.json`;
const SPIKE_MD = `${D}90-SPIKE.md`;
const BENCH_MD = `${D}90-BENCH.md`;
const SPIKE_DIR = `${D}spike/`;
const BENCH_DIR = `${D}bench/`;
const BRANCH = "arch-wave-16";
/** The one trailer every commit ends with: the project owner's line, and no other Claude name is accepted. */
const TRAILER = "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>";
const PLAN_SUBJECT = /^[a-z]+[(]90-[0-9]{2}[)]!?: /;
/** Files held byte for byte; `AGENTS.md` is held outside its section 3 only (the one section the records edit). */
const GUARDED = ["AGENTS.md", "scripts/check-house-style.mjs", ".oxlintrc.json"];
/** The commit planning started on: every file outside `.planning/` is the one phase_base holds. */
const PLANNING_HEAD = "fb0b70d3";
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
const gitIn = (cwd, ...args) => execFileSync("git", args, { cwd, encoding: "utf8", maxBuffer: 1 << 28, stdio: ["ignore", "pipe", "pipe"] });
const sorted = (xs) => [...xs].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
const collapse = (s) => s.replace(/\s+/g, " ").trim();
const sha256 = (s) => createHash("sha256").update(s).digest("hex");
const readText = (file) => readFileSync(file, "utf8");
const maybe = (path) => (existsSync(path) ? readText(path) : undefined);
const done = (bad, ok) => {
  if (bad.length > 0) fail(bad);
  console.log(ok);
};
/** The scratch root every run writes to: the resolved temporary directory's `qd90`. */
const scratchRoot = () => join(realpathSync(process.env.TMPDIR ?? "/tmp"), "qd90");

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
 * Reasons the recorded phase_base cannot be the base: the branch is not the phase's, it is not recorded, either commit is
 * not an ancestor of HEAD, or a file outside `.planning/` differs between the planning commit and phase_base. Pure.
 */
export const judgeBase = (recorded, { branch, planningAncestor, baseAncestor, outside }) => {
  const bad = [];
  if (branch !== BRANCH) bad.push(`the branch is ${branch === "" ? "detached" : branch}, not ${BRANCH}`);
  if (recorded === undefined) return [...bad, "phase_base is not recorded"];
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
  const base = phaseBaseOf(maybe(BASE_RECORD));
  const branch = (() => {
    try {
      return git("symbolic-ref", "--short", "-q", "HEAD").trim();
    } catch {
      return "";
    }
  })();
  const outside =
    base === undefined
      ? []
      : (() => {
          try {
            return git("diff", "--name-only", PLANNING_HEAD, base, "--", ".", ":!.planning").split("\n").filter((p) => p !== "");
          } catch {
            return ["(the diff of the two commits could not be read)"];
          }
        })();
  const bad = judgeBase(base, { branch, planningAncestor: isAncestor(PLANNING_HEAD), baseAncestor: base !== undefined && isAncestor(base), outside });
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
 * Reasons the commit asked for is not the one commit with `subject` and exactly `paths`, or holds, or was asked to hold, a
 * path the run rules never stage, or lacks the one trailer. `commits` are in order.
 */
export const judgeCommit = (commits, subject, paths) => {
  const hits = commits.filter((c) => c.subject === subject);
  if (hits.length !== 1) return [`${hits.length} commits since phase_base have the subject: ${subject}`];
  const [c] = hits;
  const bad = [];
  for (const p of [...c.paths, ...paths]) {
    if (NEVER_STAGED.some((re) => re.test(p))) bad.push(`${subject} holds ${p}, a path the run rules never stage`);
  }
  if (sorted(c.paths).join("\n") !== sorted(paths).join("\n")) bad.push(`the commit holds ${sorted(c.paths).join(", ")}, not ${sorted(paths).join(", ")}`);
  bad.push(...judgeTrailer(c.message));
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

/**
 * Text with comments and the text of strings and templates blanked to spaces, newlines kept; `${ }` stays code. With
 * `keepStrings` only the comments are blanked, so an import specifier or a string literal can still be read.
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
  [/(?<![\w.-])90-\d{2}(?!\d)/, "a plan id"],
  [/\bPFACT-0\d\b/, "a requirement id"],
  [/\bWX-0\d\b/, "a requirement id"],
  [/(?<!(?:ADR|CCR|BEH|INV|ARCH)-)\bQD-90\b/, "a phase id"],
  [/\b[Pp]hase 90\b/, "a phase number"],
  [/-NEXT\b/, "a placeholder id"],
];
const PHRASE = /this phase|until now|any more|no longer|previously|now does|from now on/i;
const PHRASE_EXEMPT = (file) => file.startsWith(".changeset/");

/** Lines of `entry.text` (1-based numbers) that `entry.added` holds. */
const addedOf = (entry) => {
  const lines = entry.text.split("\n");
  return [...entry.added].sort((a, b) => a - b).map((n) => ({ n, line: lines[n - 1] ?? "" }));
};
const byFileLine = (a, b) => (a.file < b.file ? -1 : a.file > b.file ? 1 : a.n - b.n);

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
      for (const [re, what] of ID_TOKENS) if (re.test(line)) bad.push({ file: entry.file, n, text: `${entry.file}:${n} names ${what}: ${line.trim()}` });
      const inHistory = row || (history > 0 && n >= history);
      if (!PHRASE_EXEMPT(entry.file) && !inHistory && PHRASE.test(line)) bad.push({ file: entry.file, n, text: `${entry.file}:${n} has phase-relative wording: ${line.trim()}` });
    }
  }
  return bad.sort(byFileLine).map((b) => b.text);
};

const isSrc = (file) => /^packages\/[^/]+\/src\/.*\.(?:ts|tsx|mts)$/.test(file);
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
const lineAt = (code, index) => code.slice(0, index).split("\n").length;

const BLOCK_HEAD = /^(?:(?:export\s+)?(?:default\s+)?(?:declare\s+)?(?:async\s+)?(?:function|interface|class|enum|namespace)\b|(?:if|for|while|switch|try|do|else|catch|finally)\b|\{)/;
/**
 * The statements at module scope of blanked `code`, as `{ text, line, index, end }`. A statement ends at a `;` outside every
 * bracket, or, for a function, interface, class, enum, control statement or bare block, at the brace that closes its body.
 */
export const topLevel = (code) => {
  const out = [];
  let depth = 0;
  let start = -1;
  const push = (end) => {
    const text = code.slice(start, end);
    if (text.trim() !== ";") out.push({ text, line: lineAt(code, start), index: start, end });
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
  if (start >= 0 && code.slice(start).trim() !== "") out.push({ text: code.slice(start).trim(), line: lineAt(code, start), index: start, end: code.length });
  return out;
};

/**
 * Reasons added source and test lines use a forbidden form. A file in `packages/<name>/src` also gets the source-only ones
 * and may not add a module-scope `let` or `var`, read from the statements of the blanked file. Sorted by file then line.
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
    for (const n of entry.added) {
      const line = lines[n - 1] ?? "";
      const note = (what) => bad.push({ file: entry.file, n, text: `${entry.file}:${n} uses ${what}: ${(raw[n - 1] ?? "").trim()}` });
      if (/Stryker\s+disable/.test(raw[n - 1] ?? "")) note("a Stryker disable comment");
      if (isSrc(entry.file)) {
        for (const [re, what] of SRC_ONLY) if (re.test(line)) note(what);
        if (moduleState.has(n)) note("a module-scope let or var");
      }
      for (const [re, what] of EVERYWHERE) if (re.test(line) && !(what === "an as cast" && covered.has(n))) note(what);
    }
  }
  return bad.sort(byFileLine).map((b) => b.text);
};
/** How many added source and test lines `judgeForbidden` read. */
export const scannedLines = (entries) => entries.filter((e) => isSrc(e.file) || isTest(e.file)).reduce((n, e) => n + e.added.size, 0);

/** The text with its section 3 cut out (the lines from the `## 3.` heading up to the `## 4.` heading), or undefined. */
export const outsideSection3 = (text) => {
  const start = text.search(/^## 3\./m);
  const end = text.search(/^## 4\./m);
  return start < 0 || end < 0 || end < start ? undefined : text.slice(0, start) + text.slice(end);
};
/** Reasons a guarded file moved from its text at phase_base; `AGENTS.md` may change inside its section 3 only. */
export const judgeGuards = (guards) =>
  guards.flatMap(({ file, base, current }) => {
    if (file !== "AGENTS.md") return current === base ? [] : [`${file} differs from phase_base: no budget moves`];
    const was = outsideSection3(base);
    const now = outsideSection3(current);
    if (now === undefined) return [`${file} has no section 3 followed by a section 4 heading`];
    return now === was ? [] : [`${file} differs from phase_base outside its section 3: only that section may change`];
  });

/**
 * Each import and `export ... from` statement of comment-free text (strings kept), as `{ spec, names, line, typeOnly }`. A name
 * is what the statement binds from the module, an `as` rename read by its source name.
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

/** Every file's added line numbers (new-file numbering) from `git diff -U0` text, so a CRLF or a multi-byte character never shifts one. */
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

// ---- evidence: the blocks `variant` and `sixth-port --record` append, and what `seen-failing` reads back ----

/** The first three non-blank lines of a run's text: the failing text a block records. */
export const failingLines = (text) => text.split("\n").map((l) => l.trimEnd()).filter((l) => l.trim() !== "").slice(0, 3);
/** The `{ file, code, n }` groups of `tsc --pretty false` output, sorted; an error with no position is file `(none)`. */
export const tscGroups = (output) => {
  const counts = new Map();
  for (const m of output.matchAll(/^(?:(\S[^(\n]*)\(\d+,\d+\): )?error (TS\d+):/gm)) {
    const key = `${m[1] ?? "(none)"} ${m[2]}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return sorted(counts.keys()).map((key) => {
    const [file, code] = key.split(" ");
    return { file, code, n: counts.get(key) };
  });
};
/** Each error of `tsc --pretty false` output with its continuation lines: `{ file, code, text }`. */
export const tscErrors = (output) => {
  const out = [];
  for (const line of output.split("\n")) {
    const m = /^(?:(\S[^(\n]*)\(\d+,\d+\): )?error (TS\d+):/.exec(line);
    if (m !== null) out.push({ file: m[1] ?? "(none)", code: m[2], text: line });
    else if (out.length > 0 && /^\s/.test(line)) out.at(-1).text += `\n${line}`;
  }
  return out;
};
/** The lines of an evidence block recording a run. */
export const evidenceBlock = ({ label, scratch, sha, edit, diff, run, exit, titles = [], text = [], groups = [] }) =>
  [
    `## ${label}`,
    `- scratch: ${scratch} at ${sha}`,
    `- edit: ${edit}`,
    `- diff: ${diff.sha} (${diff.files} files, +${diff.added} -${diff.removed})`,
    `- run: ${run}`,
    `- exit: ${exit}`,
    ...titles.map((t) => `- seen failing: ${t}`),
    ...text.map((t) => `- failing text: ${t}`),
    ...groups.map((g) => `- tsc: ${g.file} ${g.code} x${g.n}`),
    "",
  ].join("\n");
/** The titles evidence lines say were seen failing, each with its line end trimmed. */
export const seenTitles = (evidence) => [...evidence.matchAll(/^- seen failing: (.*)$/gm)].map((m) => m[1].replace(/\s+$/, ""));
/** Whether a seen-failing payload names `title`: the same text, or the title after a separator. */
export const namesTitle = (payload, title) => payload === title || (payload.endsWith(title) && /[\s>:]/.test(payload[payload.length - title.length - 1] ?? ""));
/** Reasons a file's titles are not all seen failing: zero titles, and each title no `- seen failing:` line ends with. */
export const judgeSeenFailing = (titles, evidence) => {
  if (titles.length === 0) return ["the file reports zero tests"];
  const seen = seenTitles(evidence);
  return titles.filter((t) => !seen.some((s) => namesTitle(s, t))).map((t) => `no seen failing line in the evidence for: ${t}`);
};
/** The block under the last heading that is exactly `## <heading>`, or undefined: its lines up to the next `## ` heading. */
export const lastBlock = (evidence, heading) => {
  const lines = evidence.split("\n");
  const at = lines.map((l, i) => (l === `## ${heading}` ? i : -1)).filter((i) => i >= 0).at(-1);
  if (at === undefined) return undefined;
  const rest = lines.slice(at + 1);
  const next = rest.findIndex((l) => l.startsWith("## "));
  return (next < 0 ? rest : rest.slice(0, next)).join("\n");
};
/** The `{ file, code, n }` groups of an evidence block's `- tsc:` lines. */
export const blockGroups = (block) => [...block.matchAll(/^- tsc: (\S+) (TS\d+|\(none\)) x(\d+)$/gm)].map((m) => ({ file: m[1], code: m[2], n: Number(m[3]) }));

// ---- the vitest JSON report ----

/** The rows of a vitest JSON report: `{ file, fullName, status, text }`. */
export const rowsOfReport = (report) =>
  report.testResults.flatMap((f) =>
    (f.assertionResults ?? []).map((a) => ({
      file: f.name,
      fullName: a.fullName ?? [...(a.ancestorTitles ?? []), a.title].join(" "),
      status: a.status,
      text: String((a.failureMessages ?? [])[0] ?? "").split("\n")[0],
    })),
  );
/**
 * Reasons the text of a vitest JSON report is not a clean run: no report, not JSON or not a vitest report, no test (an empty
 * file cannot pass), a test file that failed to load, or a failing test. `line` summarises a clean run. Pure.
 */
export const judgeVitestRun = (text) => {
  if (text === undefined) return { bad: ["no report was written"] };
  const report = (() => {
    try {
      return JSON.parse(text);
    } catch {
      return undefined;
    }
  })();
  if (report === undefined || !Array.isArray(report.testResults)) return { bad: ["the report is not a vitest JSON report"] };
  const rows = rowsOfReport(report);
  const bad = [];
  if (rows.length === 0) bad.push("the run reports zero tests");
  for (const f of report.testResults) {
    if ((f.assertionResults ?? []).length === 0 && typeof f.message === "string" && f.message !== "") bad.push(`${f.name} failed to load: ${f.message.split("\n")[0]}`);
  }
  for (const r of rows.filter((x) => x.status === "failed")) bad.push(`${r.fullName} fails: ${r.text}`);
  return { bad, rows, line: `vitest: ${rows.length} tests in ${report.testResults.length} files, all passed` };
};

/** Reasons a scratch name is refused: a path separator or `..` in it, or nothing at all. */
export const judgeScratchName = (name) => (typeof name === "string" && /^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(name) && !name.includes("..") ? [] : [`${String(name)} is not a scratch name: no / and no ..`]);
/** Reasons a directory is not the one scratch root: its last segment is not `qd90` or its parent is not the temporary directory. */
export const judgeScratchRoot = (path, tmp) => [
  ...(basename(path) === "qd90" ? [] : [`${path} does not end in qd90`]),
  ...(dirname(path) === tmp ? [] : [`${path} is not directly under the temporary directory ${tmp}`]),
];

// ---- records ----

const BEHAVIORS = "spec/behaviors/30-port-calls.md";
const NEW_BEHAVIORS = [786, 787, 788, 789, 790];
const NEW_INVARIANTS = [425, 426];
/** What each new invariant's `**Source**:` line must name. */
const INVARIANT_SOURCES = { 425: ["PortName.ts", "Ports.ts"], 426: ["PortAccess.ts", "LeafNeeds.ts"] };
const BASE_588_SENTENCE = "`readScoped` does not read the column.";
const CHANGESET = ".changeset/core-port-facts-on-the-description.md";
const CHANGESET_HEAD = '---\n"@qadi/core": minor\n---\n\n**Breaking.**';
const HTTP_CHANGESET = ".changeset/http-port-names-from-core.md";
const HTTP_CHANGESET_HEAD = '---\n"@qadi/http": patch\n---\n\n';
const TESTING_CHANGESET = ".changeset/testing-review-layer-fixture-doc.md";
const TESTING_CHANGESET_HEAD = '---\n"@qadi/testing": patch\n---\n\n';
const NO_EXPORT_CHANGES = "No export changes.";
const CHANGESET_SENTENCES = [
  "Each port's description states its span name and its fixture.",
  "`PortDescription` gains a span-name type parameter and a required `fixture` member.",
  "`PORT_NAMES`, the five port names in registry order, is exported.",
  "`PortSpanName`, `PortSpanOf`, `PortFixtureData` and `PORT_FIXTURES` keep their names and shapes.",
  "Metric ids, descriptions, span names and served and wire bytes are unchanged.",
  "Two ports sharing a span name is now a compile error.",
  "See the 0.13 section of the upgrade guide, `/docs/reference/upgrading/`.",
];
/**
 * The changesets the close expects, one per public package whose src the phase edits (Phase 85 D-04): `@qadi/core`'s
 * Breaking minor, and a patch with no export change for each of `@qadi/http` (its served port routes read core's
 * `PORT_NAMES`) and `@qadi/testing` (its review layer's doc comment), whose src the review round edited. A head ends
 * after the one package line, so a second package fails it.
 */
const CHANGESETS = [
  { file: CHANGESET, head: CHANGESET_HEAD, kind: "a Breaking minor changeset for @qadi/core alone", sentences: CHANGESET_SENTENCES },
  { file: HTTP_CHANGESET, head: HTTP_CHANGESET_HEAD, kind: "a patch changeset for @qadi/http alone", sentences: [NO_EXPORT_CHANGES] },
  { file: TESTING_CHANGESET, head: TESTING_CHANGESET_HEAD, kind: "a patch changeset for @qadi/testing alone", sentences: [NO_EXPORT_CHANGES] },
];
const AGENTS_SENTENCE = "A new port is a description (span, wire, serving facet, fixture), a `PORT_NAMES` entry, its registry lines and its `PortServing` row.";
const UPGRADE_FILE = "apps/website/src/content/docs/docs/reference/upgrading.md";
const UPGRADE_HEADING = "## 0.13: a port states its span name and its fixture";
const ADR094 = "spec/decisions/094-a-port-is-described-once.md";
const ADR163 = "spec/decisions/163-what-a-leaf-needs-from-the-request-is-stated-once.md";
const ADR134 = "spec/decisions/134-a-resource-scoped-port-read-is-one-read.md";
const ADR114 = "spec/decisions/114-a-port-states-what-it-serves.md";
/** The documents the records bump one minor revision, in the landed form; the rejected form leaves ADR-QD-163 out. */
const REVISED_DOCUMENTS = ["spec/README.md", "spec/traceability.md", "spec/invariants.md", BEHAVIORS, "spec/overview.md", ADR094, ADR163, ADR134];
const TRACE_TESTS = ["packages/core/test/PortFacts.characterisation.test.ts", "packages/core/test/PortFacts.tst.ts"];
const ADR_CANDIDATES = ["(a)", "(b)", "(c)", "(d)", "(e)", "(f)", "(g)"];

/** The text of the `## <heading>` section of a markdown document, up to the next `## ` heading, or undefined. */
const sectionOf = (text, heading) => {
  const start = text.search(new RegExp(`^## ${escapeRe(heading)}`, "m"));
  if (start < 0) return undefined;
  const rest = text.slice(start + 3);
  const next = rest.search(/^## /m);
  return next < 0 ? rest : rest.slice(0, next);
};
/** Whether a behavior-id list such as `BEH-QD-211-218, BEH-QD-233` names `BEH-QD-<n>`, a range included. */
const covers = (text, n) => [...text.matchAll(/BEH-QD-(\d+)(?:[–-](\d+))?/g)].some((m) => n >= Number(m[1]) && n <= Number(m[2] ?? m[1]));
/** The `Revision` of a document's control table as `{ major, minor, text }`, or undefined. */
export const revisionOf = (text) => {
  const m = /^>\s*\|\s*Revision\s*\|\s*(\d+)\.(\d+)\s*\|/m.exec(text);
  return m === null ? undefined : { major: Number(m[1]), minor: Number(m[2]), text: `${m[1]}.${m[2]}` };
};
/** The entry of `id` in the decision index: its lines up to the next entry, or undefined. */
const indexEntryOf = (index, id) => new RegExp(`^\\s*-\\s*id:\\s*"${id}"[\\s\\S]*?(?=^\\s*-\\s*id:|(?![\\s\\S]))`, "m").exec(index)?.[0];
/** The pinned-by paragraph of a behavior section: from `Pinned by` or `Enforcement:` to the next blank line, or "". */
const pinnedPara = (section) => /(?:Pinned by|Enforcement:)[\s\S]*?(?:\n\s*\n|$)/.exec(section)?.[0] ?? "";
/** A test file a paragraph names in backticks: a repository path or a bare name. */
const TEST_PATH = /`((?:packages\/[^`\s]+|(?:test\/)?[\w.-]+)\.(?:test|tst)\.tsx?)`/g;
/** The line of a `**<field>**:` paragraph in a section, or undefined. */
const fieldLine = (section, field) => new RegExp(`^\\*\\*${field}\\*\\*:.*$`, "m").exec(section ?? "")?.[0];

/**
 * Reasons a behavior's pinned-by paragraph names a test file that does not exist, and for a behavior of `NEW_BEHAVIORS` a
 * quoted title its file does not hold, or none at all. `read(path)` is a file's text or undefined, `resolve(name)` the path
 * of a bare test file name or undefined. A quoted title belongs to the file named before it, and one ahead of the first file
 * belongs to that first file. With `needNew` a new behavior with no heading is a reason too.
 */
export const judgePinned = (doc, { read, resolve }, needNew) => {
  const bad = [];
  for (const m of doc.matchAll(/^## BEH-QD-(\d+):/gm)) {
    const n = Number(m[1]);
    const section = sectionOf(doc, `BEH-QD-${n}:`) ?? "";
    const para = pinnedPara(section);
    const paths = [...para.matchAll(TEST_PATH)];
    if (paths.length === 0) {
      if (NEW_BEHAVIORS.includes(n)) bad.push(`BEH-QD-${n} names no test file in a Pinned by paragraph`);
      continue;
    }
    paths.forEach((p, i) => {
      const file = p[1].startsWith("packages/") ? p[1] : resolve(p[1].replace(/^test\//, ""));
      const text = file === undefined ? undefined : read(file);
      if (text === undefined) {
        bad.push(`BEH-QD-${n} names ${p[1]}, which does not exist`);
        return;
      }
      if (!NEW_BEHAVIORS.includes(n)) return;
      const titles = pinTitlesOf(text).map(collapse);
      const seg = `${i === 0 ? para.slice(0, p.index) : ""}${para.slice(p.index + p[0].length, paths[i + 1]?.index ?? para.length)}`;
      for (const q of seg.matchAll(/"((?:[^"\\]|\\.)*)"/g)) {
        if (!titles.includes(collapse(q[1]))) bad.push(`BEH-QD-${n} quotes "${collapse(q[1])}" for ${file}, which holds no such test`);
      }
    });
  }
  if (needNew) for (const n of NEW_BEHAVIORS) if (sectionOf(doc, `BEH-QD-${n}:`) === undefined) bad.push(`BEH-QD-${n} has no heading in ${BEHAVIORS}`);
  return bad;
};

const adrChecks = (adr, routing) => {
  if (adr === undefined) return ["spec/decisions/203-*.md does not exist"];
  const bad = [];
  if (!/No property lost; tests removed: \d+/.test(adr)) bad.push("the ADR-QD-203 file has no line matching No property lost; tests removed: <n>");
  const enforces = sectionOf(adr, "What enforces it");
  if (enforces === undefined) bad.push("the ADR-QD-203 file has no section What enforces it");
  else if (/gate\s+\d+/i.test(enforces)) bad.push("the What enforces it section of ADR-QD-203 names a gate by number");
  for (const c of ADR_CANDIDATES) if (!adr.includes(c)) bad.push(`the ADR-QD-203 file does not name candidate ${c}`);
  for (const word of ["CCR-QD-270", "CCR-QD-419", "ADR-QD-114"]) if (!adr.includes(word)) bad.push(`the ADR-QD-203 file does not name ${word}`);
  if (!/^\s*# gate:/m.test(adr)) bad.push("the ADR-QD-203 file has no # gate: line");
  if (routing === "rejected" && !adr.includes("measured rejection")) bad.push("the ADR-QD-203 file does not say measured rejection");
  return bad;
};

/**
 * Reasons the records written at the close are missing or wrong. `close` is `{ routing, invariants, adr203, adr094, adr163,
 * adr134, adr114, index, readme, revised, changesets, agents, upgrade, base588, base163 }`: `routing` is `landed` or
 * `rejected` (the gate of record's verdict), then the text of each document (ADR-QD-203 or undefined), of the decision index
 * and of the readme, the `{ file, base, now }` text of each document that must be one revision above phase_base and the
 * ADR-QD-114 pair that must be byte-identical, the `{ file, text }` of each changeset added since phase_base, the text of
 * AGENTS.md and of the upgrade guide, and phase_base's text of BEH-QD-588's section and of ADR-QD-163. Pure.
 *
 * The changesets added since phase_base are exactly the three `CHANGESETS` names: `@qadi/core`'s Breaking minor with its
 * sentences, and a patch for `@qadi/http` alone and one for `@qadi/testing` alone, each holding "No export changes.". A
 * missing one, a fourth, a wrong package or a wrong bump fails.
 */
const judgeClosed = ({ trace, doc }, close) => {
  const bad = [];
  const rejected = close.routing === "rejected";
  const one = sectionOf(trace, "§1 ") ?? "";
  for (const n of NEW_BEHAVIORS) if (!covers(one, n)) bad.push(`BEH-QD-${n} has no row in spec/traceability.md §1`);
  const two = sectionOf(trace, "§2 ") ?? "";
  for (const n of NEW_INVARIANTS) {
    const section = sectionOf(close.invariants, `INV-QD-${n}:`);
    if (section === undefined) bad.push(`INV-QD-${n} has no heading in spec/invariants.md`);
    if (!new RegExp(`^\\| \\[INV-QD-${n}\\]`, "m").test(two)) bad.push(`INV-QD-${n} has no row in spec/traceability.md §2`);
    const line = fieldLine(section, "Source");
    if (section !== undefined && line === undefined) bad.push(`INV-QD-${n} has no **Source**: line`);
    else if (line !== undefined) for (const name of INVARIANT_SOURCES[n]) if (!line.includes(name)) bad.push(`the **Source**: line of INV-QD-${n} does not name ${name}`);
  }
  const inv288 = sectionOf(close.invariants, "INV-QD-288:");
  if (inv288 !== undefined) {
    if (!(fieldLine(inv288, "Source") ?? "").includes("LeafNeeds.ts")) bad.push("the **Source**: line of INV-QD-288 does not name LeafNeeds.ts");
    if (!(fieldLine(inv288, "Enforcement") ?? "").includes("LeafNeeds.test.ts")) bad.push("the **Enforcement**: line of INV-QD-288 does not name LeafNeeds.test.ts");
  } else bad.push("INV-QD-288 has no heading in spec/invariants.md");
  const inv345 = sectionOf(close.invariants, "INV-QD-345:");
  if (inv345 === undefined) bad.push("INV-QD-345 has no heading in spec/invariants.md");
  else if (!inv345.includes("#inv-qd-426-")) bad.push("INV-QD-345 links no anchor starting #inv-qd-426-");
  const b588 = sectionOf(doc, "BEH-QD-588:");
  if (b588 === undefined) bad.push("BEH-QD-588 has no heading in the behaviors document");
  else {
    const heading = /^## BEH-QD-588:.*$/m.exec(`## ${b588}`)?.[0] ?? "";
    const has = collapse(b588).includes(BASE_588_SENTENCE);
    if (rejected) {
      if (b588 !== close.base588) bad.push("BEH-QD-588 differs from phase_base while the routing is a measured rejection");
    } else {
      if (!heading.includes("`readScoped` routes on it")) bad.push("the heading of BEH-QD-588 does not hold `readScoped` routes on it");
      if (has) bad.push("BEH-QD-588 still holds the sentence `readScoped` does not read the column.");
    }
  }
  const b445 = sectionOf(doc, "BEH-QD-445:");
  if (b445 === undefined) bad.push("BEH-QD-445 has no heading in the behaviors document");
  else if (!b445.includes("LEAF_NEEDS")) bad.push("BEH-QD-445 does not name LEAF_NEEDS");
  bad.push(...adrChecks(close.adr203, close.routing));
  if (!/^\s*-\s*id:\s*"ADR-QD-203"/m.test(close.index)) bad.push("spec/decisions/index.yaml has no ADR-QD-203 entry");
  const naming = [["ADR-QD-094", close.adr094], ["ADR-QD-134", close.adr134], ...(rejected ? [] : [["ADR-QD-163", close.adr163]])];
  for (const [id, text] of naming) {
    const entry = indexEntryOf(close.index, id);
    if (entry === undefined || !/^\s*status:.*ADR-QD-203/m.test(entry)) bad.push(`the ${id} entry of spec/decisions/index.yaml does not name ADR-QD-203 in its status`);
    if (!text.includes("ADR-QD-203")) bad.push(`${id} does not name ADR-QD-203`);
  }
  if (rejected && close.adr163 !== close.base163) bad.push("ADR-QD-163 differs from phase_base while the routing is a measured rejection");
  if (close.adr114.now !== close.adr114.base) bad.push(`${ADR114} differs from phase_base`);
  if (!/^\| \[ADR-QD-203\]/m.test(sectionOf(trace, "§3 ") ?? "")) bad.push("ADR-QD-203 has no row in spec/traceability.md §3");
  for (const path of TRACE_TESTS) if (!trace.split("\n").some((l) => l.startsWith("|") && l.includes(path))) bad.push(`spec/traceability.md has no row naming ${path}`);
  const ccr = /^\| CCR-QD-482 \|.*$/m.exec(close.readme);
  if (ccr === null) bad.push("spec/README.md has no CCR-QD-482 row");
  else {
    if (!ccr[0].includes("ARCH-137")) bad.push("the CCR-QD-482 row does not name ARCH-137");
    if (!ccr[0].includes("Unused:")) bad.push("the CCR-QD-482 row does not hold Unused:");
  }
  for (const { file, base, now } of close.revised) {
    const was = revisionOf(base);
    const is = revisionOf(now);
    if (was === undefined) bad.push(`${file} has no Revision at phase_base`);
    else if (is === undefined) bad.push(`${file} has no Revision`);
    else if (is.major !== was.major || is.minor !== was.minor + 1) bad.push(`${file} is at Revision ${is.text}, not ${was.major}.${was.minor + 1}`);
  }
  if (close.changesets.length !== CHANGESETS.length) bad.push(`${close.changesets.length} changesets are added since phase_base, not ${CHANGESETS.length}`);
  for (const { file } of close.changesets) if (!CHANGESETS.some((want) => want.file === file)) bad.push(`${file} is not one of ${CHANGESETS.map((want) => want.file).join(", ")}`);
  for (const want of CHANGESETS) {
    const changeset = close.changesets.find(({ file }) => file === want.file);
    if (changeset === undefined) {
      bad.push(`${want.file} is not added since phase_base`);
      continue;
    }
    if (!changeset.text.startsWith(want.head)) bad.push(`${want.file} is not ${want.kind}`);
    const flat = collapse(changeset.text);
    for (const sentence of want.sentences) if (!flat.includes(sentence)) bad.push(`${want.file} does not hold: ${sentence}`);
  }
  if (!collapse(close.agents).includes(AGENTS_SENTENCE)) bad.push("AGENTS.md section 3 does not hold the new-port sentence");
  if (!new RegExp(`^${escapeRe(UPGRADE_HEADING)}$`, "m").test(close.upgrade)) bad.push(`${UPGRADE_FILE} has no heading ${UPGRADE_HEADING}`);
  return bad;
};

/**
 * Reasons the records name tests that do not exist, and with `close` every reserved record is not written. `trace` is the
 * text of `spec/traceability.md`, `doc` the text of the port-calls behaviors document, `read` and `resolve` as `judgePinned`
 * takes them, and `close` undefined or the object `judgeClosed` reads.
 */
export const judgeRecords = ({ trace, doc, read, resolve }, close) => {
  const bad = judgePinned(doc, { read, resolve }, close !== undefined);
  return close === undefined ? bad : [...bad, ...judgeClosed({ trace, doc }, close)];
};

// ---- the shape of the per-port facts ----

const PORT_ORDER = ["AttributeResolver", "DecisionHistory", "RelationshipResolver", "CustomPredicate", "SignatureHistory"];
/** Each port with its module, its description's constant and the span its read opens. */
const PORT_MODULES = [
  { port: "AttributeResolver", file: "AttributeResolver.ts", description: "attributeResolverPort", span: "qadi.attribute" },
  { port: "DecisionHistory", file: "DecisionHistory.ts", description: "decisionHistoryPort", span: "qadi.acted" },
  { port: "RelationshipResolver", file: "RelationshipResolver.ts", description: "relationshipResolverPort", span: "qadi.hasRelationship" },
  { port: "CustomPredicate", file: "CustomPredicate.ts", description: "customPredicatePort", span: "qadi.hasCustom" },
  { port: "SignatureHistory", file: "SignatureHistory.ts", description: "signatureHistoryPort", span: "qadi.hasSignature" },
];
const FIXTURE_BUILDERS = ["attributeResolverFromRecord", "decisionHistoryFromEvents", "relationshipResolverFromEdges", "signatureHistoryFromSignatures", "customPredicateFromRecord"];
const CORE = "packages/core/src/";
const NAME_FILE = `${CORE}PortName.ts`;
const METRICS_FILE = `${CORE}PortMetrics.ts`;
const PORTS_FILE = `${CORE}Ports.ts`;
const DERIVATION_FILE = `${CORE}PortDerivation.ts`;
const ACCESS_FILE = `${CORE}PortAccess.ts`;
const SERVING_FILE = `${CORE}PortServing.ts`;
const CALLS_FILE = "packages/devtools/src/model/PortCalls.ts";
const LITERAL_FREE = [ACCESS_FILE, DERIVATION_FILE, CALLS_FILE];
/** The statement at module scope of blanked `code` that starts with a match of `re`, or undefined. */
const statementOf = (code, re) => topLevel(code).find((s) => re.test(s.text));
/** The string literals of strings-kept, comments-blanked code that start with `qadi.`. */
const spanLiterals = (code) => [...code.matchAll(/(["'`])(qadi\.[^"'`\n]*)\1/g)].map((m) => m[2]);

/** Reasons `PortName.ts` and `PortMetrics.ts` do not hold the one tuple (D-07, D-08). `files` maps a path to its text or undefined. */
const judgeNames = (files) => {
  const bad = [];
  const name = files[NAME_FILE];
  if (name === undefined) bad.push(`${NAME_FILE} does not exist`);
  else {
    const code = blank(name, true);
    if (/^[ \t]*import\b/m.test(code) || /\bfrom\s*["']/.test(code)) bad.push(`${NAME_FILE} imports a module: it must be a leaf`);
    const tuple = /export\s+const\s+PORT_NAMES\s*=\s*\[([^\]]*)\]\s*as\s+const/.exec(code);
    if (tuple === null) bad.push(`${NAME_FILE} does not declare export const PORT_NAMES = [...] as const`);
    else {
      const names = [...tuple[1].matchAll(/["']([^"']*)["']/g)].map((m) => m[1]);
      if (names.join(",") !== PORT_ORDER.join(",")) bad.push(`${NAME_FILE} PORT_NAMES is ${names.join(", ")}, not ${PORT_ORDER.join(", ")}`);
    }
    if (!/export\s+type\s+PortName\s*=\s*\(typeof\s+PORT_NAMES\)\[number\]/.test(code)) bad.push(`${NAME_FILE} does not declare export type PortName = (typeof PORT_NAMES)[number]`);
  }
  const metrics = files[METRICS_FILE];
  if (metrics === undefined) bad.push(`${METRICS_FILE} does not exist`);
  else {
    const code = blank(metrics, true);
    const value = importsOf(code).find((i) => i.spec === "./PortName.ts" && !i.typeOnly && i.names.includes("PORT_NAMES"));
    if (value === undefined) bad.push(`${METRICS_FILE} does not import PORT_NAMES as a value from ./PortName.ts`);
    const plain = blank(metrics);
    for (const [re, what] of [[/Record<\s*PortName\s*,\s*true\s*>/, "Record<PortName, true>"], [/\bPORT_NAMES_BY_NAME\b/, "PORT_NAMES_BY_NAME"], [/Record<\s*PredicatePortName/, "Record<PredicatePortName"]]) {
      if (re.test(plain)) bad.push(`${METRICS_FILE} still holds ${what}`);
    }
    const predicate = statementOf(plain, /^(?:export\s+)?const\s+PREDICATE_PORT_NAMES\b/);
    if (predicate === undefined) bad.push(`${METRICS_FILE} does not declare PREDICATE_PORT_NAMES`);
    else if (!/satisfies\s+ReadonlyArray<\s*PortName\s*>/.test(predicate.text)) bad.push(`${METRICS_FILE} PREDICATE_PORT_NAMES is not checked with satisfies ReadonlyArray<PortName>`);
  }
  return bad;
};

/** Reasons the span names are not each declared once on the description's module (D-09, D-10, D-23a). `src` is every `{ file, text }` of every package's src directory. */
const judgeSpans = (files, src) => {
  const bad = [];
  const name = files[NAME_FILE];
  if (name !== undefined) {
    const exported = [...blank(name).matchAll(/^export\s+(?:declare\s+)?(?:const|type|interface|function|class|enum)\s+([\w$]+)/gm)].map((m) => m[1]);
    if (/^export\s*\{/m.test(blank(name)) || sorted(exported).join(",") !== "PORT_NAMES,PortName") bad.push(`${NAME_FILE} exports ${exported.join(", ")}, not exactly PORT_NAMES and PortName`);
  }
  for (const { file, text } of src) if (/\binterface\s+PortSpans\b/.test(blank(text))) bad.push(`${file} still declares interface PortSpans`);
  const core = src.filter(({ file }) => file.startsWith(CORE));
  for (const { span, file, port } of PORT_MODULES) {
    const decl = new RegExp(`\\bconst\\s+[A-Za-z_$][\\w$]*SpanName\\s*=\\s*["']${escapeRe(span)}["']`, "g");
    const hits = core.flatMap(({ file: f, text }) => [...blank(text, true).matchAll(decl)].map(() => f));
    if (hits.length !== 1) bad.push(`${span} has ${hits.length} const <x>SpanName declarations in ${CORE}, not one (${port})`);
    else if (hits[0] !== `${CORE}${file}`) bad.push(`${span} is declared in ${hits[0]}, not in ${CORE}${file}`);
  }
  for (const file of LITERAL_FREE) {
    const text = files[file];
    if (text !== undefined && spanLiterals(blank(text, true)).length > 0) bad.push(`${file} holds a "qadi. string literal: a span name is read from its description`);
  }
  const ports = files[PORTS_FILE];
  if (ports === undefined) bad.push(`${PORTS_FILE} does not exist`);
  else {
    const code = blank(ports);
    for (const t of ["PortSpanOf", "PortSpanName"]) if (!new RegExp(`export\\s+type\\s+${t}\\b`).test(code)) bad.push(`${PORTS_FILE} does not declare ${t}`);
    const registry = statementOf(code, /^export\s+const\s+PORTS\b/);
    if (registry === undefined || !/satisfies\s+DistinctSpanNames<\s*PortTypes\s*>/.test(registry.text)) bad.push(`${PORTS_FILE} does not apply satisfies DistinctSpanNames<PortTypes> at PORTS`);
  }
  const derivation = files[DERIVATION_FILE];
  if (derivation === undefined || !/export\s+type\s+DistinctSpanNames\b/.test(blank(derivation))) bad.push(`${DERIVATION_FILE} does not export DistinctSpanNames`);
  return bad;
};

/** Reasons the fixtures are not each stated on the description (D-11, D-11a). */
const judgeFixtures = (files) => {
  const bad = [];
  const ports = files[PORTS_FILE];
  if (ports === undefined) bad.push(`${PORTS_FILE} does not exist`);
  else {
    const code = blank(ports);
    if (/\binterface\s+PortFixtureData\b/.test(code)) bad.push(`${PORTS_FILE} still declares interface PortFixtureData`);
    for (const builder of FIXTURE_BUILDERS) if (new RegExp(`\\b${builder}\\b`).test(code)) bad.push(`${PORTS_FILE} still names the builder ${builder}`);
    const fixtures = statementOf(code, /^export\s+const\s+PORT_FIXTURES\b/);
    if (fixtures === undefined || !/\btabulatePorts\s*\(/.test(fixtures.text) || !/\.fixture\b/.test(fixtures.text)) bad.push(`${PORTS_FILE} does not build PORT_FIXTURES with tabulatePorts from d.fixture`);
  }
  for (const { file, description } of PORT_MODULES) {
    const text = files[`${CORE}${file}`];
    const statement = text === undefined ? undefined : statementOf(blank(text), new RegExp(`^export\\s+const\\s+${description}\\b`));
    if (statement === undefined || !/\bfixture\s*:/.test(statement.text)) bad.push(`${CORE}${file} ${description} has no fixture: member`);
  }
  return bad;
};

/** Reasons the shape of the per-port facts is wrong, for the asked `sections` (names, spans, fixtures, serving). */
export const judgePortFacts = (files, src, sections) => {
  const bad = [];
  if (sections.includes("names")) bad.push(...judgeNames(files));
  if (sections.includes("spans")) bad.push(...judgeSpans(files, src));
  if (sections.includes("fixtures")) bad.push(...judgeFixtures(files));
  if (sections.includes("serving") && files[SERVING_FILE] !== files.servingBase) bad.push(`${SERVING_FILE} differs from phase_base: the serving shape stays hand-written`);
  return bad;
};

// ---- the shape of the scoped read ----

/** Reasons `PortAccess.ts` does not derive its scoped ports from the leaf rows (D-14): a literal in `ScopedPort`'s body other than the `["asks"]` member is a hand list. */
export const judgeScopedDerived = (text) => {
  if (text === undefined) return [`${ACCESS_FILE} does not exist`];
  const bad = [];
  const code = blank(text, true);
  const leaf = importsOf(code).find((i) => i.spec === "./LeafNeeds.ts" && i.names.includes("LEAF_NEEDS"));
  if (leaf === undefined) bad.push(`${ACCESS_FILE} does not import LEAF_NEEDS from ./LeafNeeds.ts`);
  const tag = /\btype\s+ScopedLeafTag\b[^=;]*=\s*([^;]+);/.exec(code);
  if (tag === null) bad.push(`${ACCESS_FILE} declares no type ScopedLeafTag`);
  else if (!/\btypeof\s+LEAF_NEEDS\b/.test(tag[1])) bad.push(`${ACCESS_FILE} type ScopedLeafTag is not read from typeof LEAF_NEEDS`);
  else if (/["'`]/.test(tag[1].replace(/\[\s*["']resourceId["']\s*\]/g, "").replace(/["']Never["']/g, ""))) bad.push(`${ACCESS_FILE} type ScopedLeafTag names a literal other than "Never" and the resourceId column`);
  const scoped = /\btype\s+ScopedPort\b[^=;]*=\s*([^;]+);/.exec(code);
  if (scoped === null) bad.push(`${ACCESS_FILE} declares no type ScopedPort`);
  else if (/["'`]/.test(scoped[1].replace(/\[\s*["']asks["']\s*\]/g, ""))) bad.push(`${ACCESS_FILE} type ScopedPort names a string literal other than the asks member, a hand list of ports`);
  else if (!/\bScopedLeafTag\b/.test(scoped[1])) bad.push(`${ACCESS_FILE} type ScopedPort is not read from ScopedLeafTag`);
  return bad;
};
/** The rows of an object literal whose `{` is at `open` in `code`: each `{ name, text, at }` of a `name: { … }` entry at depth one, `at` its `{`. */
const rowsAt = (code, open) => {
  const close = closeOf(code, open);
  if (close < 0) return [];
  const rows = [];
  let depth = 0;
  for (let i = open + 1; i < close - 1; i++) {
    const c = code[i];
    if ("([{".includes(c)) depth++;
    else if (")]}".includes(c)) depth--;
    else if (depth === 0) {
      const m = /^([A-Za-z_$][\w$]*)\s*:\s*\{/.exec(code.slice(i));
      if (m !== null && !/[\w$]/.test(code[i - 1] ?? "")) {
        const at = i + m[0].length - 1;
        const end = closeOf(code, at);
        rows.push({ name: m[1], text: code.slice(at, end), at });
        i = end - 1;
      }
    }
  }
  return rows;
};
/**
 * Reasons the one read route is not each scoped port's need, stated by its row's type and narrowed on in `readScoped`: the
 * table typed by `ScopedCall`, which is `never` for a port mixing the two rows; each row's `need`; a `ByScope` row's `bare` and
 * `resourceScoped: isResourceScoped`, the only places the scope test is named; `readScoped` a plain function that narrows on
 * `need` and reads no row, no matcher and no `in` at run time; no `needsResourceId`, no route matcher, no switch.
 */
export const judgeScopedRoute = (text) => {
  if (text === undefined) return [`${ACCESS_FILE} does not exist`];
  const bad = [];
  const plain = blank(text);
  const code = blank(text, true);
  const imports = [...plain.matchAll(/^[ \t]*import\b[\s\S]*?(?:\bfrom\s*|;)/gm)].map((m) => [m.index, m.index + m[0].length]);
  const outside = (i) => !imports.some(([a, b]) => i >= a && i < b);
  const statements = topLevel(code);
  const named = (re) => statements.find((s) => re.test(s.text));
  const call = named(/^type\s+ScopedCall\b/);
  if (call === undefined) bad.push(`${ACCESS_FILE} declares no type ScopedCall`);
  else {
    const body = collapse(call.text);
    if (!/\[\s*PortNeed\s*<\s*K\s*>\s*\]\s*extends\s*\[\s*"Always"\s*\]/.test(body) || !/\[\s*PortNeed\s*<\s*K\s*>\s*\]\s*extends\s*\[\s*"ByScope"\s*\]/.test(body)) bad.push(`${ACCESS_FILE} type ScopedCall does not test the port's need against ["Always"] and ["ByScope"]`);
    if (!/:\s*never\s*;?\s*$/.test(body)) bad.push(`${ACCESS_FILE} type ScopedCall does not end in never, so a port mixing the two rows has a call`);
  }
  const table = named(/^(?:export\s+)?const\s+scopedCall\b/);
  let byScope = 0;
  const allowed = [];
  if (table === undefined) bad.push(`${ACCESS_FILE} does not declare scopedCall`);
  else {
    if (!/^const\s+scopedCall\s*:\s*\{\s*readonly\s*\[\s*K\s+in\s+ScopedPort\s*\]\s*:\s*ScopedCall\s*<\s*K\s*>\s*;?\s*\}\s*=\s*\{/.test(table.text)) bad.push(`${ACCESS_FILE} scopedCall is not typed { readonly [K in ScopedPort]: ScopedCall<K> }`);
    const open = table.index + table.text.search(/=\s*\{/) + table.text.slice(table.text.search(/=\s*\{/)).indexOf("{");
    const rows = rowsAt(code, open);
    if (rows.length === 0) bad.push(`${ACCESS_FILE} scopedCall has no row`);
    for (const row of rows) {
      const need = /\bneed\s*:\s*"(Always|ByScope)"/.exec(row.text)?.[1];
      if (need === undefined) bad.push(`${ACCESS_FILE} the ${row.name} row of scopedCall states no need "Always" or "ByScope"`);
      else if (need === "Always" && /\b(?:bare|resourceScoped)\s*:/.test(row.text)) bad.push(`${ACCESS_FILE} the Always row ${row.name} has an id-free call`);
      else if (need === "ByScope") {
        byScope++;
        if (!/\bbare\s*:/.test(row.text)) bad.push(`${ACCESS_FILE} the ByScope row ${row.name} has no bare call`);
        const scope = /\bresourceScoped\s*:\s*isResourceScoped\s*(?=[,}\s])/.exec(row.text);
        if (scope === null) bad.push(`${ACCESS_FILE} the ByScope row ${row.name} does not state resourceScoped: isResourceScoped`);
        else allowed.push(row.at + scope.index + scope[0].indexOf("isResourceScoped"));
      }
    }
  }
  const occurrences = [...plain.matchAll(/(?<![\w$])isResourceScoped(?![\w$])/g)].filter((m) => outside(m.index)).map((m) => m.index);
  for (const at of occurrences) if (!allowed.includes(at)) bad.push(`${ACCESS_FILE} names isResourceScoped at line ${lineAt(code, at)}, outside a ByScope row's resourceScoped`);
  if (byScope === 0 && table !== undefined) bad.push(`${ACCESS_FILE} scopedCall has no ByScope row`);
  const read = named(/^(?:export\s+)?(?:const|function)\s+readScoped\b/);
  if (read === undefined) bad.push(`${ACCESS_FILE} does not declare readScoped`);
  else {
    const body = code.slice(read.index, read.end);
    const bare = plain.slice(read.index, read.end);
    if (/\bEffect\.fn(?:Untraced)?\s*[(<]/.test(bare)) bad.push(`${ACCESS_FILE} readScoped is wrapped in Effect.fn or Effect.fnUntraced`);
    if (!/\bscopedCall\s*\[/.test(bare)) bad.push(`${ACCESS_FILE} readScoped does not read scopedCall`);
    if (!/\.need\s*===\s*"ByScope"/.test(body)) bad.push(`${ACCESS_FILE} readScoped does not narrow on the row's need === "ByScope"`);
    if (/\bLEAF_NEEDS\s*\[/.test(bare)) bad.push(`${ACCESS_FILE} readScoped reads a LEAF_NEEDS row at run time`);
    if (/\bMatch\./.test(bare)) bad.push(`${ACCESS_FILE} readScoped runs a Match`);
    if (/\bin\s+[\w$]+\s*[)&|?]/.test(body)) bad.push(`${ACCESS_FILE} readScoped tests a member with in`);
  }
  if (/(?<![\w$])needsResourceId(?![\w$])/.test(plain)) bad.push(`${ACCESS_FILE} still names needsResourceId`);
  if (statements.some((s) => /\bMatch\.type\b/.test(plain.slice(s.index, s.end)) && /\bMatch\.when\s*\(\s*["']ByScope["']/.test(s.text))) bad.push(`${ACCESS_FILE} has a module-scope Match.type matcher with a "ByScope" arm`);
  if (/\bswitch\s*\(/.test(plain)) bad.push(`${ACCESS_FILE} holds a switch`);
  return bad;
};
/** Reasons the shape of the scoped read is wrong. `files` maps a path to its text or undefined. */
export const judgeScoped = (files, sections) => {
  const bad = [];
  if (sections.includes("derived")) bad.push(...judgeScopedDerived(files[ACCESS_FILE]));
  if (sections.includes("route")) {
    bad.push(...judgeScopedRoute(files[ACCESS_FILE]));
    for (const file of LITERAL_FREE) {
      const text = files[file];
      if (text !== undefined && spanLiterals(blank(text, true)).length > 0) bad.push(`${file} holds a "qadi. string literal`);
    }
  }
  return bad;
};

// ---- the sixth port ----

const FAKE_SPAN = '  readonly FakePort: "qadi.fake";';
/** `PortName.ts` with a sixth `PortSpans` row, or undefined when it has no such interface. */
export const withSixthSpanRow = (text) => (/interface PortSpans \{\n/.test(text) ? text.replace(/(interface PortSpans \{\n)/, `$1${FAKE_SPAN}\n`) : undefined);
/** `PortName.ts` with `"FakePort"` appended to `PORT_NAMES`, or undefined when it has no such tuple. */
export const withSixthName = (text) => {
  const m = /(PORT_NAMES\s*=\s*\[)([^\]]*?)(\s*\]\s*as\s+const)/.exec(text);
  if (m === null) return undefined;
  const body = m[2].replace(/\s+$/, "");
  const next = body.endsWith(",") ? `${body} "FakePort",` : `${body}, "FakePort"`;
  return text.replace(m[0], `${m[1]}${next}${m[3]}`);
};
/** The text with `member` deleted from the description `constName` states, or undefined when it is not found. */
export const withoutMember = (text, constName, member) => {
  const start = text.search(new RegExp(`export const ${constName}\\b`));
  if (start < 0) return undefined;
  const key = new RegExp(`(?<=[\\s{,])${member}\\s*:`).exec(text.slice(start));
  if (key === null) return undefined;
  const from = start + key.index;
  let depth = 0;
  let to = from;
  for (let i = from; i < text.length; i++) {
    const c = text[i];
    if ("([{".includes(c)) depth++;
    else if (")]}".includes(c)) {
      if (depth === 0) {
        to = i;
        break;
      }
      depth--;
    } else if (c === "," && depth === 0) {
      to = i + 1;
      break;
    }
  }
  return `${text.slice(0, from)}${text.slice(to)}`;
};
const metricsGroup = (groups) => groups.some((g) => g.file === METRICS_FILE);
/**
 * Reasons a sixth port's compile errors disagree with the set recorded for it: a group (file, code) the record lacks or one
 * it has that the fresh run does not (never counts or lines), no recorded block, and `PortMetrics.ts` on the wrong side: in
 * the base set, absent from the close set. `recorded` is the block text or undefined.
 */
export const judgeSixth = (kind, recorded, fresh) => {
  const bad = [];
  if (kind === "base" && !metricsGroup(fresh)) bad.push(`${METRICS_FILE} is not in the base set: the metric domain should break with a sixth span row`);
  if (kind === "close" && metricsGroup(fresh)) bad.push(`${METRICS_FILE} is in the close set: the metric domain should follow the tuple`);
  if (recorded === undefined) return [...bad, `the evidence has no ## sixth-port ${kind} block`];
  const was = new Set(blockGroups(recorded).map((g) => `${g.file} ${g.code}`));
  const now = new Set(fresh.map((g) => `${g.file} ${g.code}`));
  for (const k of sorted(now)) if (!was.has(k)) bad.push(`a group the record lacks: ${k}`);
  for (const k of sorted(was)) if (!now.has(k)) bad.push(`a recorded group is missing from the run: ${k}`);
  return bad;
};
/** Reasons a run with a member deleted from a description does not name that member in an error at its module. */
export const judgeMemberVariant = (member, errors) => (errors.some((e) => e.file.endsWith("AttributeResolver.ts") && new RegExp(`\\b${member}\\b`).test(e.text)) ? [] : [`deleting ${member} from attributeResolverPort reports no error at AttributeResolver.ts naming ${member}`]);

// ---- the spike ----

const CHAINS = ["a", "a+b", "a+b+c", "a+b+c+d", "e", "f", "f+g", "end", "b-alone", "leaf-imports-registry"];
/** The patch names a chain applies, in order. */
export const chainPatches = (chain) => (chain === "end" ? ["a", "b", "c", "d", "f", "g"] : chain.includes("+") ? chain.split("+") : [chain]);
/** The rows of the spike's verdict table by chain: `{ chain, patches: [{ name, sha }], madge, tsc, verdict, bad }`, in file order. */
export const spikeRows = (md) =>
  md
    .split("\n")
    .filter((l) => l.startsWith("|"))
    .map((l) => l.split("|").slice(1, -1).map((c) => c.trim()))
    .filter((cells) => cells.length >= 5 && CHAINS.includes(cells[0].replace(/[`*_ ]/g, "")))
    .map((cells) => {
      const names = [...cells[1].matchAll(/([A-Za-z0-9_-]+)\.patch/g)].map((m) => m[1]);
      const hashes = [...cells[1].matchAll(/\b[0-9a-f]{64}\b/g)].map((m) => m[0]);
      return { chain: cells[0].replace(/[`*_ ]/g, ""), patches: names.map((name, i) => ({ name, sha: hashes[i] })), unpaired: names.length !== hashes.length, madge: cells[2], tsc: cells[3], verdict: cells.at(-1) };
    });
/** The spike base sha the verdict file names, or undefined. */
export const spikeBaseOf = (md) => /spike base[^0-9a-f\n]*([0-9a-f]{40})/i.exec(md)?.[1];
const statedVerdict = (cell) => {
  const word = /^[\s*_`]*(accept(?:ed)?|ok|pass(?:es)?|reject(?:ed)?|fail(?:s|ed)?)/i.exec(cell)?.[1]?.toLowerCase();
  return word === undefined ? undefined : /^(accept|ok|pass)/.test(word) ? "accept" : "reject";
};
/** What a chain's recorded outputs say: acceptable only when madge found no cycle and tsc reported no error. */
export const computedVerdict = (madge, tsc) => (madge !== undefined && /No circular dependency found/.test(madge) && tsc !== undefined && !/error TS\d+/.test(tsc) ? "accept" : "reject");
/** The one-line madge verdict of a run's output, or undefined. */
export const madgeLine = (text) => /No circular dependency found|Found \d+ circular dependenc(?:y|ies)/.exec(text)?.[0];
/**
 * Reasons the spike's verdict file disagrees with its patches and outputs. `read(path)` is a file's text or undefined.
 */
export const judgeSpike = (md, read) => {
  if (md === undefined) return [`${SPIKE_MD} does not exist`];
  const bad = [];
  if (spikeBaseOf(md) === undefined) bad.push(`${SPIKE_MD} names no spike base sha`);
  const rows = spikeRows(md);
  for (const chain of CHAINS) if (!rows.some((r) => r.chain === chain)) bad.push(`${SPIKE_MD} has no row for the chain ${chain}`);
  if (CHAINS.every((c) => rows.some((r) => r.chain === c)) && rows.map((r) => r.chain).join() !== CHAINS.join()) bad.push(`${SPIKE_MD} rows are not in the order ${CHAINS.join(", ")}`);
  for (const row of rows) {
    const want = chainPatches(row.chain);
    if (row.unpaired) bad.push(`the ${row.chain} row names a patch without its sha256`);
    if (row.patches.map((p) => p.name).join() !== want.join()) bad.push(`the ${row.chain} row applies ${row.patches.map((p) => p.name).join(", ") || "no patch"}, not ${want.join(", ")}`);
    for (const { name, sha } of row.patches) {
      const text = read(`${SPIKE_DIR}${name}.patch`);
      if (text === undefined) bad.push(`${SPIKE_DIR}${name}.patch does not exist (chain ${row.chain})`);
      else if (text.length === 0) bad.push(`${SPIKE_DIR}${name}.patch is empty (chain ${row.chain})`);
      else if (sha256(text) !== sha) bad.push(`${SPIKE_DIR}${name}.patch has another sha256 than the row of ${row.chain} states`);
    }
    const madge = read(`${SPIKE_DIR}out/${row.chain}.madge.txt`);
    const tsc = read(`${SPIKE_DIR}out/${row.chain}.tsc.txt`);
    if (madge === undefined) bad.push(`${SPIKE_DIR}out/${row.chain}.madge.txt does not exist`);
    if (tsc === undefined) bad.push(`${SPIKE_DIR}out/${row.chain}.tsc.txt does not exist`);
    if (row.madge === "" || row.tsc === "") bad.push(`the ${row.chain} row states no madge or tsc result`);
    if (madge === undefined || tsc === undefined) continue;
    const stated = statedVerdict(row.verdict);
    if (stated === undefined) bad.push(`the ${row.chain} verdict does not start with accept or reject: ${row.verdict}`);
    else if (stated !== computedVerdict(madge, tsc)) bad.push(`the ${row.chain} row states ${stated} but its recorded outputs say ${computedVerdict(madge, tsc)}`);
  }
  return bad;
};
/** Reasons a re-run of a chain differs from its record: another madge verdict line, or another (file, code) group set. */
export const judgeRerun = (chain, recorded, fresh) => {
  const bad = [];
  if (madgeLine(recorded.madge) !== madgeLine(fresh.madge)) bad.push(`${chain}: madge says ${madgeLine(fresh.madge)}, the record says ${madgeLine(recorded.madge)}`);
  const was = new Set(tscGroups(recorded.tsc).map((g) => `${g.file} ${g.code}`));
  const now = new Set(tscGroups(fresh.tsc).map((g) => `${g.file} ${g.code}`));
  for (const k of sorted(now)) if (!was.has(k)) bad.push(`${chain}: a tsc group the record lacks: ${k}`);
  for (const k of sorted(was)) if (!now.has(k)) bad.push(`${chain}: a recorded tsc group is missing: ${k}`);
  return bad;
};

// ---- the bench gate ----

const FIX_SUBJECTS = {
  "routing.patch": "docs(90-06): fix the routing patch before its bench",
  "routing-hoisted.patch": "docs(90-06): fix the hoisted routing patch before its bench",
  "routing-review.patch": "chore(90-review): fix the review routing patch before its bench",
};
const RECORD_SUBJECT = "docs(90-06): record the bench gate";
/** The review round's patch of record: the routing on each port's need, measured against the landed routing. */
const REVIEW_PATCH = "routing-review.patch";
/** The commit that records each measured patch's run; a fixing commit must precede its own. */
const RECORD_SUBJECTS = { "routing.patch": RECORD_SUBJECT, "routing-hoisted.patch": RECORD_SUBJECT, [REVIEW_PATCH]: "docs(90-review): record the review routing bench gate" };
const BENCH_ADD_SUBJECT = "test(90-06): add the scoped-heavy bench workloads";
const WORKLOAD_KEYS = ["evaluate :: scoped-heavy — allOf of 8 resource-scoped port leaves, id present", "evaluate :: scoped-heavy — allOf of 8 Any-scoped port leaves"];
/** The last `# gate: <verdict>` of a text, or undefined. */
export const lastGate = (text) => [...(text ?? "").matchAll(/^# gate: (\S+)/gm)].map((m) => m[1]).at(-1);
/** The `<key>: <value>` fields of a `meta.txt`. */
export const metaOf = (text) => Object.fromEntries((text ?? "").split("\n").map((l) => /^([a-z_0-9]+):\s*(.*)$/.exec(l)).filter((m) => m !== null).map((m) => [m[1], m[2].trim()]));
/** The keys a bench file declares: `<test title> :: <bench name>` for each `bench(` under its `test(`. */
export const benchKeys = (text) => {
  const keys = [];
  let title;
  for (const m of text.matchAll(/(?<![.\w$])(test|bench)\(\s*(["'`])((?:\\.|(?!\2)[^\\])*)\2/g)) {
    if (m[1] === "test") title = m[3];
    else if (title !== undefined) keys.push(`${title} :: ${m[3]}`);
  }
  return keys;
};
/** Reasons the workloads file and the declared keys disagree: a duplicate, a missing required key, a key one lacks. */
export const judgeWorkloads = (workloads, declared) => {
  if (workloads === undefined) return [`${BENCH_DIR}workloads.txt does not exist`];
  const bad = [];
  const keys = workloads.split("\n").filter((l) => l.trim() !== "");
  for (const k of new Set(keys.filter((k, i) => keys.indexOf(k) !== i))) bad.push(`workloads.txt names ${k} twice`);
  for (const k of WORKLOAD_KEYS) if (!keys.includes(k)) bad.push(`workloads.txt does not name ${k}`);
  if (declared !== undefined) {
    for (const k of new Set(declared.filter((k, i) => declared.indexOf(k) !== i))) bad.push(`the bench file declares ${k} twice`);
    for (const k of keys) if (!declared.includes(k)) bad.push(`workloads.txt names ${k}, which the bench file does not declare`);
    for (const k of declared) if (!keys.includes(k)) bad.push(`the bench file declares ${k}, which workloads.txt does not name`);
  }
  return bad;
};
/**
 * Reasons the bench record disagrees with its patch, its commits or its analysis. `facts` is `{ md, workloads, record, patches,
 * benchAdd, benchHead }`: the text of `90-BENCH.md`, of `workloads.txt`, the patch of record and its analysis text, each
 * measured patch as `{ name, fixes, ancestor, sidecar, atFix, atHead, meta }` (the commits since phase_base with its fixing
 * subject, each `{ sha, paths }`; whether the fixing commit precedes the record commit; the `.sha256` text; the patch's text at
 * the fixing commit and at HEAD; the run's `meta.txt`) and the bench file's text at the commit that added the workloads and at
 * HEAD. With `pass` the verdict must be `pass`. Pure.
 */
export const judgeBench = (facts, pass) => {
  const bad = [];
  if (facts.md === undefined) bad.push(`${BENCH_MD} does not exist`);
  if (facts.patches.length === 0) bad.push(`no patch was measured: ${BENCH_DIR}routing.meta.txt does not exist`);
  for (const p of facts.patches) {
    const at = `${BENCH_DIR}${p.name}`;
    const want = [at, `${at}.sha256`];
    if (p.fixes.length !== 1) bad.push(`${p.fixes.length} commits since phase_base have the subject ${FIX_SUBJECTS[p.name]}`);
    else {
      const [fix] = p.fixes;
      if (sorted(fix.paths).join() !== sorted(want).join()) bad.push(`the commit fixing ${p.name} holds ${sorted(fix.paths).join(", ")}, not exactly ${want.join(", ")}`);
      if (!p.ancestor) bad.push(`the commit fixing ${p.name} is not an ancestor of the commit ${RECORD_SUBJECTS[p.name]}`);
      const meta = metaOf(p.meta);
      if (meta.head !== fix.sha) bad.push(`${p.name}'s meta.txt says head ${meta.head}, not the fixing commit ${fix.sha}`);
      const sidecar = /^([0-9a-f]{64})\b/.exec(p.sidecar ?? "")?.[1];
      if (sidecar === undefined) bad.push(`${at}.sha256 holds no sha256`);
      else {
        if (p.atFix === undefined || sha256(p.atFix) !== sidecar) bad.push(`${p.name} at its fixing commit does not hash to ${at}.sha256`);
        if (p.atHead === undefined || sha256(p.atHead) !== sidecar) bad.push(`${p.name} at HEAD does not hash to ${at}.sha256`);
        if (meta.patch_sha256 !== sidecar) bad.push(`${p.name}'s meta.txt says patch_sha256 ${meta.patch_sha256}, not ${sidecar}`);
      }
    }
  }
  if (facts.md !== undefined) {
    if (facts.patches.find((p) => p.name === facts.record.name) === undefined) bad.push(`the patch of record ${facts.record.name} was not measured`);
    // Every measured patch stays named in the record with its hash: a later gate keeps the earlier one as history.
    for (const p of facts.patches) {
      if (!facts.md.includes(p.name)) bad.push(`${BENCH_MD} does not name the measured patch ${p.name}`);
      const sidecar = /^([0-9a-f]{64})\b/.exec(p.sidecar ?? "")?.[1];
      if (sidecar !== undefined && !facts.md.includes(sidecar)) bad.push(`${BENCH_MD} does not state the sha256 of ${p.name}`);
    }
  }
  const analysed = lastGate(facts.record.analysis);
  if (analysed === undefined) bad.push(`the analysis of ${facts.record.name} has no # gate: line`);
  else if (facts.md !== undefined && lastGate(facts.md) !== analysed) bad.push(`${BENCH_MD} states the verdict ${lastGate(facts.md)}, the analysis says ${analysed}`);
  if (pass && analysed !== "pass") bad.push(`the gate of record is ${analysed ?? "unstated"}, not pass`);
  bad.push(...judgeWorkloads(facts.workloads, undefined));
  if (facts.benchAdd === undefined) bad.push(`no commit has the subject ${BENCH_ADD_SUBJECT}`);
  else if (facts.benchHead !== facts.benchAdd) bad.push("packages/core/bench/Evaluate.bench.ts differs from its text at the commit that added the workloads");
  return bad;
};

// ---- routing landed ----

/** Text without comments, whitespace runs collapsed: what two sources are compared by. */
export const comparable = (text) => collapse(blank(text, true));
/**
 * Reasons the routing did not land as the gates of record say. `facts` is `{ gate, commits, atCommit, atHead, expected,
 * accessAtHead, review }`: the first gate's verdict, the commits since phase_base with the routing subject, each file's text
 * at that commit and at HEAD (path to text), the text the base's files give with the first patch of record applied (path to
 * text), and `review`, undefined until the review patch is fixed, else `{ gate, fixes, commits, atCommit, expected }`: the
 * review gate's verdict, the commits that fixed its patch, the commits with the review routing subject, each file's text at
 * that commit, and the text the fixing commit's files give with the review patch applied. The first landing is history once
 * the review patch is fixed: HEAD is then held to the review landing, never to the first.
 */
export const judgeRouting = (facts) => {
  if (facts.gate === undefined) return { bad: [`no gate of record: ${BENCH_DIR} holds no analysis with a # gate: line`], line: undefined };
  if (facts.gate !== "pass") {
    const bad = [];
    if (facts.commits.length > 0) bad.push("the routing commit exists although the gate of record failed");
    if ((facts.accessAtHead.match(/isResourceScoped\(leaf\)\s*\?/g) ?? []).length !== 2) bad.push(`${ACCESS_FILE} no longer holds both isResourceScoped(leaf) ? read-site ternaries although the gate of record failed`);
    return { bad, line: "routing-landed: not landed; the gate of record failed" };
  }
  const bad = [];
  if (facts.commits.length !== 1) bad.push(`${facts.commits.length} commits since phase_base have the subject ${ROUTING_SUBJECT}`);
  const review = facts.review;
  for (const [path, want] of Object.entries(facts.expected)) {
    const wheres = review === undefined ? [["at the routing commit", facts.atCommit[path]], ["at HEAD", facts.atHead[path]]] : [["at the routing commit", facts.atCommit[path]]];
    for (const [where, text] of wheres) if (text === undefined || comparable(text) !== comparable(want)) bad.push(`${path} ${where} is not the base with the patch of record applied`);
  }
  if (review === undefined) return { bad, line: "routing-landed: the routing equals the patch of record" };
  if (review.fixes.length !== 1) bad.push(`${review.fixes.length} commits since phase_base have the subject ${FIX_SUBJECTS[REVIEW_PATCH]}`);
  if (review.gate === undefined) bad.push(`the review patch ${REVIEW_PATCH} is fixed and has no analysis with a # gate: line`);
  if (review.gate !== "pass") {
    if (review.commits.length > 0) bad.push(`the review routing commit exists although the review gate is ${review.gate ?? "unstated"}`);
    return { bad, line: "routing-landed: the first routing landed as its patch of record; the review routing did not land" };
  }
  if (review.commits.length !== 1) bad.push(`${review.commits.length} commits since phase_base have the subject ${REVIEW_ROUTING_SUBJECT}`);
  for (const [path, want] of Object.entries(review.expected)) {
    for (const [where, text] of [["at the review routing commit", review.atCommit[path]], ["at HEAD", facts.atHead[path]]]) {
      if (text === undefined || comparable(text) !== comparable(want)) bad.push(`${path} ${where} is not the fixing commit's text with ${REVIEW_PATCH} applied`);
    }
  }
  return { bad, line: "routing-landed: the first routing equals its patch of record at its commit, and the review routing equals its patch at its commit and at HEAD" };
};

// ---- close ----

/** Reasons a release fact moved: a package version, a changelog, a tag at HEAD, or a commit under the milestones. */
export const judgeNoRelease = ({ versions, changelogs, tags, milestones }) => [
  ...versions.filter((v) => v.now !== v.base).map((v) => `${v.file} has version ${v.now}, not ${v.base} at phase_base`),
  ...changelogs.map((p) => `${p} changed since phase_base`),
  ...tags.map((t) => `the tag ${t} points at HEAD`),
  ...milestones.map((p) => `a commit since phase_base touches ${p}`),
];
/** Runs each `children` entry (`{ label, argv }`) through `exec` and returns the lines printed and the reasons. */
export const runChildren = (children, exec) => {
  if (children.length === 0) return { lines: [], bad: ["the child list is empty"] };
  const lines = [];
  const bad = [];
  for (const child of children) {
    const { code, last } = exec(child.argv);
    lines.push(`${child.label}: exit ${code}: ${last}`);
    if (code !== 0) bad.push(`${child.label} exited ${code}`);
  }
  if (lines.length < children.length) bad.push(`printed ${lines.length} lines for ${children.length} children`);
  return { lines, bad };
};
// <<PART3>>

// ---- readers: gather the text a judge reads from git, the tree or a run ----

/** Reasons `pnpm circular` did not find the tree free of cycles. */
export const judgeCircular = (code, output) => (code === 0 && /No circular dependency found/.test(output) ? [] : [`pnpm circular exited ${code} and did not print No circular dependency found: ${failingLines(output).join(" | ")}`]);

const toplevel = () => git("rev-parse", "--show-toplevel").trim();
const commitsSince = (base) =>
  git("log", "--reverse", "--format=%x1e%H%x1f%s%x1f%B", `${base}..HEAD`)
    .split("\x1e")
    .filter((r) => r.trim() !== "")
    .map((r) => {
      const [sha, subject, message] = r.split("\x1f");
      const paths = git("show", "--name-only", "--no-renames", "--format=", sha).split("\n").filter((p) => p !== "");
      return { sha, subject, message, paths };
    });

// The root README and the assets are the owner's own unrelated changes, never staged by a run (the commit mode refuses them).
const OUTSIDE = [":!.planning", ":!.agents", ":!.codex", ":!assets", ":!README.md"];
/** Entries for every added line of the tree against the base: tracked changes and whole untracked files. */
const treeEntries = (base) => {
  const entries = [];
  for (const [file, added] of parseDiff(git("diff", "-U0", base, "--", ".", ...OUTSIDE))) {
    if (existsSync(file)) entries.push({ file, text: readText(file), added });
  }
  const untracked = git("ls-files", "--others", "--exclude-standard", "--", ".", ...OUTSIDE).split("\n").filter((p) => p !== "");
  for (const file of untracked) {
    const text = readText(file);
    entries.push({ file, text, added: new Set(text.split("\n").map((_, i) => i + 1)) });
  }
  return entries;
};
/** The files git lists under `pathspecs` (tracked and untracked, ignored left out) that exist in the tree. */
const treeFiles = (...pathspecs) =>
  git("ls-files", "-co", "--exclude-standard", "--", ...pathspecs)
    .split("\n")
    .filter((p) => p !== "" && existsSync(p));
/** The `{ file, text }` of every `.ts` and `.tsx` source file of every package. */
const srcFiles = () => treeFiles("packages/*/src/*.ts", "packages/*/src/*.tsx").map((file) => ({ file, text: readText(file) }));
/** The `{ file, text }` of each changeset added since `base`: committed, staged or untracked. */
const addedChangesets = (base) => {
  const names = new Set([
    ...git("diff", "--name-only", "--diff-filter=A", base, "--", ".changeset").split("\n"),
    ...git("ls-files", "--others", "--exclude-standard", "--", ".changeset").split("\n"),
  ]);
  return [...names].filter((p) => /^\.changeset\/[^/]+\.md$/.test(p) && p !== ".changeset/README.md" && existsSync(p)).map((file) => ({ file, text: readText(file) }));
};
const showAt = (rev, path) => {
  try {
    return git("show", `${rev}:${path}`);
  } catch {
    return undefined;
  }
};
/** Runs a command to completion with stdin closed: `{ code, out, err }`. */
const run = (argv, cwd) => {
  const r = spawnSync(argv[0], argv.slice(1), { cwd, encoding: "utf8", maxBuffer: 1 << 28, stdio: ["ignore", "pipe", "pipe"] });
  return { code: r.status ?? 1, out: r.stdout ?? "", err: r.stderr ?? "" };
};
/** Runs vitest over `args` in `cwd` into a JSON report, and returns the report's text (undefined when none). */
const vitestReport = (args, cwd) => {
  const root = scratchRoot();
  mkdirSync(root, { recursive: true });
  const report = `${root}/vitest-${process.pid}.json`;
  // A report left by an earlier run must not stand for this one.
  rmSync(report, { force: true });
  const hadReporterDir = existsSync(join(cwd, ".vitest"));
  run(["pnpm", "exec", "vitest", "run", ...args, "--reporter=json", `--outputFile=${report}`], cwd);
  if (!hadReporterDir) rmSync(join(cwd, ".vitest"), { recursive: true, force: true });
  return maybe(report);
};

/** Removes the scratch root `root` when it is the one `qd90` directly under `tmp` (`check` removes nothing and fails while it exists). */
export const cleanScratch = (root, tmp, check) => {
  const bad = judgeScratchRoot(root, tmp);
  if (bad.length > 0) return { bad };
  if (check) return { bad: existsSync(root) ? [`${root} still exists`] : [], note: `scratch-clean: ${root} is gone` };
  rmSync(root, { recursive: true, force: true });
  return { bad: [], note: `scratch-clean: ${root} removed` };
};

// ---- scratch clones and variants ----

const LINKED = ["node_modules", ...["packages", "apps"].flatMap((d) => (existsSync(d) ? readdirSync(d).map((p) => `${d}/${p}/node_modules`) : [])), "features/node_modules"];
/** Makes the scratch clone `<S>/<name>` at `rev` (default HEAD; `phase_base` is the recorded base) and returns its path. */
const makeScratch = (name, rev) => {
  const bad = judgeScratchName(name);
  if (bad.length > 0) fail(bad);
  const root = scratchRoot();
  mkdirSync(root, { recursive: true });
  const dir = join(root, name);
  rmSync(dir, { recursive: true, force: true });
  const sha = rev === undefined || rev === "HEAD" ? git("rev-parse", "HEAD").trim() : rev === "phase_base" ? readBase() : git("rev-parse", "--verify", `${rev}^{commit}`).trim();
  const top = toplevel();
  git("clone", "--no-hardlinks", "--quiet", top, dir);
  gitIn(dir, "checkout", "-q", "-B", BRANCH, sha);
  for (const link of LINKED) if (existsSync(join(top, link))) symlinkSync(realpathSync(join(top, link)), join(dir, link));
  const generated = "packages/predicate-prisma/prisma/generated";
  if (existsSync(join(top, generated))) run(["cp", "-R", join(top, generated), join(dir, generated)], top);
  // A symlinked node_modules is not matched by the repository's ignore entry and would be listed as untracked.
  appendFileSync(join(dir, ".git/info/exclude"), "node_modules\npackages/*/node_modules\napps/*/node_modules\nfeatures/node_modules\n");
  writeFileSync(join(dir, ".git/qd90-origin"), `${sha}\n`);
  return dir;
};
const scratchDir = (name) => {
  const bad = judgeScratchName(name);
  if (bad.length > 0) return fail(bad);
  const dir = join(scratchRoot(), name);
  return existsSync(join(dir, ".git")) ? dir : fail([`${dir} is not a scratch clone: make it with scratch ${name}`]);
};

const KINDS = ["vitest", "tstyche", "tsc-src", "tsc-test", "house-style", "api", "circular", "script"];
const ESCAPE = String.fromCharCode(27);
const stripAnsi = (text) => text.replace(new RegExp(`${ESCAPE}\\[[0-9;]*m`, "g"), "");
/** The titles of `titles` that a tstyche run's output lists on a failing line (`×`), its colour codes removed. */
export const tstycheFailing = (output, titles) => {
  const failed = new Set(stripAnsi(output).split("\n").map((l) => /^\s*[×✕✗]\s+(.+?)\s*$/.exec(l)?.[1]).filter((t) => t !== undefined));
  return titles.filter((t) => failed.has(t));
};
/** The first three `Error:` lines of a tstyche run's output, its colour codes removed (the first lines otherwise). */
export const tstycheText = (output) => {
  const plain = stripAnsi(output);
  const errors = plain.split("\n").filter((l) => l.startsWith("Error:")).slice(0, 3);
  return errors.length > 0 ? errors : failingLines(plain);
};
/** One check run inside a clone: `{ failed, exit, run, titles, text, groups }`. */
const runKind = (dir, kind, args) => {
  const outcome = (r, extra) => ({ failed: r.code !== 0, exit: r.code, text: failingLines(`${r.err}\n${r.out}`), titles: [], groups: [], ...extra });
  if (kind === "vitest") {
    if (args.length === 0) return fail(["usage: variant ... vitest <file>..."]);
    const text = vitestReport(args, dir);
    const report = text === undefined ? undefined : (() => { try { return JSON.parse(text); } catch { return undefined; } })();
    if (report === undefined || !Array.isArray(report.testResults)) return fail(["the vitest run wrote no report: the variant could not run"]);
    const rows = rowsOfReport(report).filter((r) => r.status === "failed");
    const loads = report.testResults.filter((f) => (f.assertionResults ?? []).length === 0 && typeof f.message === "string" && f.message !== "");
    return { failed: rows.length + loads.length > 0, exit: rows.length + loads.length > 0 ? 1 : 0, run: `vitest ${args.join(" ")}`, titles: rows.map((r) => r.fullName), text: [...rows.map((r) => r.text), ...loads.map((f) => f.message.split("\n")[0])].filter((t) => t !== "").slice(0, 3), groups: [] };
  }
  if (kind === "tstyche") {
    if (args.length === 0) return fail(["usage: variant ... tstyche <file>..."]);
    const r = run(["node", "scripts/run-tstyche.mjs", ...args], dir);
    const titles = args.flatMap((f) => (existsSync(join(dir, f)) ? titlesOf(readText(join(dir, f))) : []));
    return outcome(r, { run: `tstyche ${args.join(" ")}`, titles: tstycheFailing(`${r.out}\n${r.err}`, titles), text: tstycheText(`${r.out}\n${r.err}`) });
  }
  if (kind === "tsc-src" || kind === "tsc-test") {
    const argv = kind === "tsc-src" ? ["pnpm", "exec", "tsc", "-b", "tsconfig.json", "--pretty", "false"] : ["pnpm", "exec", "tsc", "-p", "tsconfig.test.json", "--noEmit", "--pretty", "false"];
    const r = run(argv, dir);
    const groups = tscGroups(`${r.out}\n${r.err}`);
    return outcome(r, { run: kind, groups, failed: r.code !== 0 || groups.length > 0, text: tscErrors(`${r.out}\n${r.err}`).slice(0, 3).map((e) => e.text.split("\n")[0]) });
  }
  if (kind === "house-style") return outcome(run(["node", "scripts/check-house-style.mjs"], dir), { run: "house-style" });
  if (kind === "api") return outcome(run(["node", "scripts/check-api-surface.mjs"], dir), { run: "api" });
  if (kind === "circular") {
    const r = run(["pnpm", "circular"], dir);
    const bad = judgeCircular(r.code, `${r.out}\n${r.err}`);
    const all = `${r.out}\n${r.err}`.split("\n");
    const cycles = all.filter((l) => /^\d+\) /.test(l));
    return { failed: bad.length > 0, exit: r.code, run: "circular", titles: [], text: failingLines((cycles.length > 0 ? cycles : all.filter((l) => /circular|error/i.test(l) && !l.startsWith(">"))).join("\n")), groups: [] };
  }
  const [script, ...rest] = args;
  if (script === undefined || script.includes("/") || !existsSync(join(dir, D, script))) return fail([`usage: variant ... script <a script of ${D}> [args...]`]);
  return outcome(run(["node", `${D}${script}`, ...rest], dir), { run: `script ${args.join(" ")}` });
};

/** Runs one check in the clone `dir` and, when it fails, appends its block to `evidence`: `{ ok, message }`. */
export const variantAt = (dir, evidence, label, kind, rest, edit) => {
  const result = runKind(dir, kind, rest);
  if (!result.failed) return { ok: false, message: `variant ${label} was not seen failing` };
  try {
    gitIn(dir, "add", "-N", ".");
  } catch {
    // an index that cannot take intent-to-add entries still gives the diff of the tracked files
  }
  const origin = readText(join(dir, ".git/qd90-origin")).trim();
  const patch = gitIn(dir, "diff", origin);
  const stat = gitIn(dir, "diff", "--numstat", origin).split("\n").filter((l) => l !== "").map((l) => l.split("\t"));
  const diff = { sha: sha256(patch), files: stat.length, added: stat.reduce((n, s) => n + (Number(s[0]) || 0), 0), removed: stat.reduce((n, s) => n + (Number(s[1]) || 0), 0) };
  const block = evidenceBlock({ label, scratch: basename(dir), sha: gitIn(dir, "rev-parse", "--short=10", "HEAD").trim(), edit, diff, run: result.run, exit: result.exit, titles: result.titles, text: result.text, groups: result.groups });
  const existing = maybe(evidence) ?? "";
  appendFileSync(evidence, `${existing === "" || existing.endsWith("\n\n") ? "" : existing.endsWith("\n") ? "\n" : "\n\n"}${block}`);
  return { ok: true, message: `variant ${label}: seen failing (exit ${result.exit}), recorded in ${evidence}` };
};
const variantMode = (args) => {
  const usage = ['usage: variant <name> <label> <kind> [args...] --edit "<what>"'];
  const at = args.indexOf("--edit");
  if (at < 0 || args[at + 1] === undefined || args[at + 1].trim() === "" || args.length !== at + 2) return fail(usage);
  const [name, label, kind, ...rest] = args.slice(0, at);
  if (name === undefined || label === undefined || !KINDS.includes(kind) || label.trim() === "") return fail(usage);
  const result = variantAt(scratchDir(name), EVIDENCE, label, kind, rest, args[at + 1]);
  return result.ok ? console.log(result.message) : fail([result.message]);
};

// ---- the sixth port ----

/** Measures the compile errors of a sixth port in a fresh clone: `{ dir, sha, groups, errors, edit }`. */
const measureSixth = (kind, chain) => {
  const name = `sixth-${kind}${chain === undefined ? "" : "-spike"}`;
  const md = chain === undefined ? undefined : maybe(SPIKE_MD);
  const row = md === undefined ? undefined : spikeRows(md).find((r) => r.chain === chain);
  if (chain !== undefined && (row === undefined || spikeBaseOf(md) === undefined)) return fail([`${chain} is not a chain of ${SPIKE_MD}`]);
  const dir = makeScratch(name, chain === undefined ? (kind === "base" ? "phase_base" : "HEAD") : spikeBaseOf(md));
  if (row !== undefined) {
    for (const { name: patch } of row.patches) {
      const applied = run(["git", "apply", join(process.cwd(), `${SPIKE_DIR}${patch}.patch`)], dir);
      if (applied.code !== 0) return fail([`${SPIKE_DIR}${patch}.patch does not apply on the spike base for the chain ${chain}`]);
    }
  }
  const file = join(dir, NAME_FILE);
  const edited = (kind === "base" ? withSixthSpanRow : withSixthName)(readText(file));
  if (edited === undefined) return fail([`${NAME_FILE} has no ${kind === "base" ? "interface PortSpans" : "PORT_NAMES tuple"} to add a sixth port to`]);
  writeFileSync(file, edited);
  const r = run(["pnpm", "exec", "tsc", "-b", "tsconfig.json", "--pretty", "false"], dir);
  const groups = tscGroups(`${r.out}\n${r.err}`);
  return { dir, sha: gitIn(dir, "rev-parse", "--short=10", "HEAD").trim(), groups, errors: groups.reduce((n, g) => n + g.n, 0), edit: kind === "base" ? `a sixth PortSpans row FakePort: "qadi.fake"` : `"FakePort" appended to PORT_NAMES` };
};
const MEMBERS = ["span", "fixture", "serving"];
const sixthMode = (args) => {
  const usage = ["usage: sixth-port base|close [--record] [--on-chain <chain>]"];
  const [kind, ...flags] = args;
  if (kind !== "base" && kind !== "close") return fail(usage);
  const record = flags.includes("--record");
  const at = flags.indexOf("--on-chain");
  const chain = at < 0 ? undefined : flags[at + 1];
  if (at >= 0 && chain === undefined) return fail(usage);
  if (flags.length !== (record ? 1 : 0) + (at < 0 ? 0 : 2)) return fail(usage);
  const measured = measureSixth(kind, chain);
  const heading = chain === undefined ? `sixth-port ${kind}` : `sixth-port ${kind} (spike: ${chain})`;
  const bad = [];
  if (record) {
    const block = [`## ${heading}`, `- scratch: ${basename(measured.dir)} at ${measured.sha}`, `- edit: ${measured.edit}`, ...measured.groups.map((g) => `- tsc: ${g.file} ${g.code} x${g.n}`), `- errors: ${measured.errors}`, `- groups: ${measured.groups.length}`, ""].join("\n");
    bad.push(...judgeSixth(kind, block, measured.groups));
    if (bad.length === 0) {
      const existing = maybe(EVIDENCE) ?? "";
      appendFileSync(EVIDENCE, `${existing === "" || existing.endsWith("\n\n") ? "" : existing.endsWith("\n") ? "\n" : "\n\n"}${block}`);
    }
  } else bad.push(...judgeSixth(kind, lastBlock(maybe(EVIDENCE) ?? "", `sixth-port ${kind}`), measured.groups));
  if (kind === "close" && chain === undefined) {
    for (const member of MEMBERS) {
      const dir = makeScratch(`sixth-member-${member}`, "HEAD");
      const file = join(dir, `${CORE}AttributeResolver.ts`);
      const edited = withoutMember(readText(file), "attributeResolverPort", member);
      if (edited === undefined) {
        bad.push(`attributeResolverPort has no ${member} member to delete`);
        continue;
      }
      writeFileSync(file, edited);
      const r = run(["pnpm", "exec", "tsc", "-b", "tsconfig.json", "--pretty", "false"], dir);
      bad.push(...judgeMemberVariant(member, tscErrors(`${r.out}\n${r.err}`)));
    }
  }
  done(bad, `${heading}: ${measured.errors} errors in ${measured.groups.length} groups${record ? ", recorded" : ", the recorded groups"}${kind === "close" && chain === undefined ? "; deleting span, fixture or serving is an error naming it" : ""}`);
};

// ---- the spike, the bench and the routing ----

const spikeMode = (args) => {
  if (args.length > 1 || (args.length === 1 && args[0] !== "--rerun")) return fail(["usage: spike [--rerun]"]);
  const md = maybe(SPIKE_MD);
  const bad = judgeSpike(md, maybe);
  if (args.length === 1 && md !== undefined) {
    for (const row of spikeRows(md)) {
      const dir = makeScratch(`spike-${row.chain.replace(/\+/g, "")}`, "phase_base");
      const applied = row.patches.map(({ name }) => run(["git", "apply", join(process.cwd(), `${SPIKE_DIR}${name}.patch`)], dir));
      const failed = applied.find((r) => r.code !== 0);
      const fresh =
        failed !== undefined
          ? { madge: `a patch does not apply: ${failingLines(failed.err).join(" ")}`, tsc: `a patch does not apply` }
          : (() => {
              const m = run(["pnpm", "circular"], dir);
              const t = run(["pnpm", "exec", "tsc", "-b", "tsconfig.json", "--pretty", "false"], dir);
              return { madge: `${m.out}\n${m.err}`, tsc: `${t.out}\n${t.err}` };
            })();
      bad.push(...judgeRerun(row.chain, { madge: maybe(`${SPIKE_DIR}out/${row.chain}.madge.txt`) ?? "", tsc: maybe(`${SPIKE_DIR}out/${row.chain}.tsc.txt`) ?? "" }, fresh));
    }
  }
  done(bad, `spike: ${CHAINS.length} chains, each patch hashed and each verdict agreeing with its recorded outputs${args.length === 1 ? ", each re-applied and re-measured on the base" : ""}`);
};

/** The first gate's patch of record and its analysis, from the files the bench leaves: the hoisted patch when it was measured. */
const firstRecordOf = () => {
  const hoisted = existsSync(`${BENCH_DIR}routing-hoisted.meta.txt`) || existsSync(`${BENCH_DIR}routing-hoisted.patch`);
  return { name: hoisted ? "routing-hoisted.patch" : "routing.patch", analysis: maybe(`${BENCH_DIR}${hoisted ? "analysis-hoisted.txt" : "analysis.txt"}`) };
};
/** The review gate's patch of record and its analysis, or undefined when the review patch was never fixed. */
const reviewRecordOf = () => (existsSync(`${BENCH_DIR}${REVIEW_PATCH}`) ? { name: REVIEW_PATCH, analysis: maybe(`${BENCH_DIR}analysis-review.txt`) } : undefined);
/** The gate of record: the review gate once its patch is fixed, else the first. */
const recordOf = () => reviewRecordOf() ?? firstRecordOf();
const benchFacts = () => {
  const base = readBase();
  const commits = commitsSince(base);
  const record = recordOf();
  const patches = Object.keys(FIX_SUBJECTS)
    .filter((name) => existsSync(`${BENCH_DIR}${name.replace(".patch", ".meta.txt")}`) || name === "routing.patch" || existsSync(`${BENCH_DIR}${name}`))
    .map((name) => {
      const fixes = commits.filter((c) => c.subject === FIX_SUBJECTS[name]);
      const recordCommit = commits.find((c) => c.subject === RECORD_SUBJECTS[name]);
      const ancestor = fixes.length === 1 && recordCommit !== undefined && run(["git", "merge-base", "--is-ancestor", fixes[0].sha, recordCommit.sha]).code === 0;
      return {
        name,
        fixes: fixes.map((c) => ({ sha: c.sha, paths: c.paths })),
        ancestor,
        sidecar: maybe(`${BENCH_DIR}${name}.sha256`),
        atFix: fixes.length === 1 ? showAt(fixes[0].sha, `${BENCH_DIR}${name}`) : undefined,
        atHead: maybe(`${BENCH_DIR}${name}`),
        meta: maybe(`${BENCH_DIR}${name.replace(".patch", ".meta.txt")}`),
      };
    })
    ;
  const added = commits.find((c) => c.subject === BENCH_ADD_SUBJECT);
  return { md: maybe(BENCH_MD), workloads: maybe(`${BENCH_DIR}workloads.txt`), record, patches, benchAdd: added === undefined ? undefined : showAt(added.sha, "packages/core/bench/Evaluate.bench.ts"), benchHead: maybe("packages/core/bench/Evaluate.bench.ts") };
};
const benchMode = (args) => {
  if (args.length > 1 || (args.length === 1 && args[0] !== "--pass" && args[0] !== "--smoke")) return fail(["usage: bench [--pass|--smoke]"]);
  if (args[0] === "--smoke") {
    const workloads = maybe(`${BENCH_DIR}workloads.txt`);
    const bench = maybe("packages/core/bench/Evaluate.bench.ts");
    const early = workloads === undefined ? [`${BENCH_DIR}workloads.txt does not exist`] : bench === undefined ? ["packages/core/bench/Evaluate.bench.ts does not exist"] : [];
    if (early.length > 0) return fail(early);
    // Each workload's allow assertion runs before any timing; a denying workload fails the run here.
    const hadReporterDir = existsSync(".vitest");
    const r = run(["pnpm", "exec", "vitest", "bench", "--run", "packages/core/bench/Evaluate.bench.ts", "-t", "^evaluate$"], process.cwd());
    if (!hadReporterDir) rmSync(".vitest", { recursive: true, force: true });
    const bad = r.code === 0 ? [] : [`the bench run exited ${r.code}: ${failingLines(`${r.err}\n${r.out}`).join(" | ")}`];
    return done([...bad, ...judgeWorkloads(workloads, benchKeys(bench))], `bench --smoke: ${workloads.split("\n").filter((l) => l.trim() !== "").length} workloads, each declared once and each asserted to allow`);
  }
  const facts = benchFacts();
  return done(judgeBench(facts, args[0] === "--pass"), `bench: the patch of record ${facts.record.name} was fixed before its run, hashes alike in its record, its run and the tree, and the verdict is the analysis's: ${lastGate(facts.record.analysis)}`);
};
const ROUTING_SUBJECT = "refactor(90-12): route every scoped read off its leaf row";
const REVIEW_ROUTING_SUBJECT = "fix(90-review): route each scoped read on its port's need";
const ROUTED = [`${CORE}PortAccess.ts`, `${CORE}LeafNeeds.ts`, `${CORE}ScopedLeaf.ts`];
/** The three routed files as `rev`'s text with `patch` applied, in the scratch directory `name`, or the reason it does not apply. */
const appliedAt = (name, rev, patch) => {
  const dir = join(scratchRoot(), name);
  rmSync(dir, { recursive: true, force: true });
  for (const p of ROUTED) {
    mkdirSync(dirname(join(dir, p)), { recursive: true });
    writeFileSync(join(dir, p), showAt(rev, p) ?? "");
  }
  const applied = run(["git", "apply", ...ROUTED.map((p) => `--include=${p}`), join(process.cwd(), `${BENCH_DIR}${patch}`)], dir);
  if (applied.code !== 0) return { bad: `${patch} does not apply to the files of ${rev}: ${failingLines(applied.err).join(" ")}` };
  return { files: Object.fromEntries(ROUTED.map((p) => [p, readText(join(dir, p))])) };
};
const routingMode = () => {
  const base = readBase();
  const first = firstRecordOf();
  const gate = lastGate(first.analysis);
  const since = commitsSince(base);
  const commits = since.filter((c) => c.subject === ROUTING_SUBJECT);
  const atCommit = Object.fromEntries(ROUTED.map((p) => [p, commits.length === 1 ? showAt(commits[0].sha, p) : undefined]));
  const atHead = Object.fromEntries(ROUTED.map((p) => [p, maybe(p)]));
  let expected = {};
  if (gate === "pass") {
    const got = appliedAt("routing-landed", base, first.name);
    if (got.bad !== undefined) return fail([got.bad]);
    expected = got.files;
  }
  let review;
  const second = reviewRecordOf();
  if (second !== undefined) {
    const fixes = since.filter((c) => c.subject === FIX_SUBJECTS[REVIEW_PATCH]);
    const landed = since.filter((c) => c.subject === REVIEW_ROUTING_SUBJECT);
    let reviewExpected = {};
    if (fixes.length === 1) {
      const got = appliedAt("routing-landed-review", fixes[0].sha, REVIEW_PATCH);
      if (got.bad !== undefined) return fail([got.bad]);
      reviewExpected = got.files;
    }
    review = { gate: lastGate(second.analysis), fixes, commits: landed, atCommit: Object.fromEntries(ROUTED.map((p) => [p, landed.length === 1 ? showAt(landed[0].sha, p) : undefined])), expected: reviewExpected };
  }
  const { bad, line } = judgeRouting({ gate, commits, atCommit, atHead, expected, accessAtHead: atHead[ROUTED[0]] ?? "", review });
  return done(bad, line);
};

// ---- the close runner ----

/** The test files the review round adds, each of whose titles the close requires seen failing in the evidence. */
const REVIEW_TESTS = ["packages/core/test/PortFacts.review.tst.ts", "packages/core/test/PortFacts.review.test.ts"];
const closeChildren = (gatePass) => [
  { label: `node ${D}90-pinned-check.mjs --all-applied`, argv: ["node", `${D}90-pinned-check.mjs`, "--all-applied"] },
  { label: `node ${D}90-earlier-checks.mjs`, argv: ["node", `${D}90-earlier-checks.mjs`] },
  ...["records --close", "scan-ids", "scan-forbidden", "trailers", "port-facts", "scoped-route derived", "routing-landed", ...(gatePass ? ["scoped-route route"] : []), "circular", "sixth-port close", "bench"].map((m) => ({ label: `90-check.mjs ${m}`, argv: ["node", SELF, ...m.split(" ")] })),
  ...["compare", "landed close", "landed coverage-close"].map((m) => ({ label: `90-mutation.mjs ${m}`, argv: ["node", `${D}90-mutation.mjs`, ...m.split(" ")] })),
  { label: "90-check.mjs seen-failing packages/core/test/PortFacts.mutation.test.ts --if-present", argv: ["node", SELF, "seen-failing", "packages/core/test/PortFacts.mutation.test.ts", "--if-present"] },
  ...REVIEW_TESTS.map((file) => ({ label: `90-check.mjs seen-failing ${file}`, argv: ["node", SELF, "seen-failing", file] })),
  { label: "pnpm spec:package", argv: ["pnpm", "spec:package"] },
];
const noReleaseFacts = (base) => ({
  versions: git("ls-files", "--", "packages/*/package.json").split("\n").filter((p) => p !== "").map((file) => ({ file, base: JSON.parse(showAt(base, file) ?? "{}").version, now: JSON.parse(readText(file)).version })),
  changelogs: git("diff", "--name-only", base, "HEAD", "--", ":(glob)**/CHANGELOG.md").split("\n").filter((p) => p !== ""),
  tags: git("tag", "--points-at", "HEAD").split("\n").filter((t) => t !== ""),
  milestones: git("log", `${base}..HEAD`, "--name-only", "--format=", "--", ".planning/milestones").split("\n").filter((p) => p !== ""),
});
const closeMode = () => {
  const base = readBase();
  const gatePass = lastGate(recordOf().analysis) === "pass";
  const children = closeChildren(gatePass);
  const { lines, bad } = runChildren(children, (argv) => {
    const r = run(argv, process.cwd());
    const out = `${r.out}`.split("\n").filter((l) => l.trim() !== "").at(-1) ?? `${r.err}`.split("\n").filter((l) => l.trim() !== "").at(-1) ?? "";
    return { code: r.code, last: out };
  });
  for (const line of lines) console.log(line);
  bad.push(...judgeNoRelease(noReleaseFacts(base)));
  done(bad, `close: ${lines.length} checks and the no-release facts pass`);
};

// ---- modes ----

const resolveBare = (name) => git("ls-files", "--", `packages/*/test/**/${name}`, `packages/*/test/${name}`).split("\n").find((p) => p !== "");
const recordsMode = (args) => {
  const close = args[0] === "--close";
  if (args.length > 0 && !close) return fail(["usage: records [--close]"]);
  const extra = close
    ? (() => {
        const base = readBase();
        const adr203 = readdirSync("spec/decisions").find((f) => /^203-.*[.]md$/.test(f));
        const rejected = lastGate(firstRecordOf().analysis) !== "pass";
        const pair = (file) => ({ file, base: showAt(base, file) ?? "", now: readText(file) });
        const revised = REVISED_DOCUMENTS.filter((f) => !(rejected && f === ADR163)).map(pair);
        return {
          routing: rejected ? "rejected" : "landed",
          invariants: readText("spec/invariants.md"),
          adr203: adr203 === undefined ? undefined : readText(`spec/decisions/${adr203}`),
          adr094: readText(ADR094),
          adr163: readText(ADR163),
          adr134: readText(ADR134),
          adr114: pair(ADR114),
          index: readText("spec/decisions/index.yaml"),
          readme: readText("spec/README.md"),
          revised,
          changesets: addedChangesets(base),
          agents: readText("AGENTS.md"),
          upgrade: readText(UPGRADE_FILE),
          base588: sectionOf(showAt(base, BEHAVIORS) ?? "", "BEH-QD-588:"),
          base163: showAt(base, ADR163) ?? "",
        };
      })()
    : undefined;
  const ok = "records: the pinned-by lists name tests that exist";
  return done(judgeRecords({ trace: readText("spec/traceability.md"), doc: readText(BEHAVIORS), read: maybe, resolve: resolveBare }, extra), close ? `${ok}, and every reserved record is written` : ok);
};

const SECTIONS = ["names", "spans", "fixtures", "serving"];
const portFactsMode = (args) => {
  if (args.some((a) => !SECTIONS.includes(a))) return fail([`usage: port-facts [${SECTIONS.join("|")}]...`]);
  const sections = args.length === 0 ? SECTIONS : args;
  const base = readBase();
  const paths = [NAME_FILE, METRICS_FILE, PORTS_FILE, DERIVATION_FILE, ACCESS_FILE, SERVING_FILE, CALLS_FILE, ...PORT_MODULES.map((m) => `${CORE}${m.file}`)];
  const files = { ...Object.fromEntries(paths.map((p) => [p, maybe(p)])), servingBase: showAt(base, SERVING_FILE) };
  return done(judgePortFacts(files, srcFiles(), sections), `port-facts ${sections.join(" ")}: the facts are stated as the shape requires`);
};
const SCOPED_SECTIONS = ["derived", "route"];
const scopedMode = (args) => {
  if (args.some((a) => !SCOPED_SECTIONS.includes(a))) return fail([`usage: scoped-route [${SCOPED_SECTIONS.join("|")}]...`]);
  const sections = args.length === 0 ? SCOPED_SECTIONS : args;
  const files = Object.fromEntries([ACCESS_FILE, ...LITERAL_FREE].map((p) => [p, maybe(p)]));
  return done(judgeScoped(files, sections), `scoped-route ${sections.join(" ")}: the scoped read is derived from the leaf rows and routed on each port's need`);
};

const MODES = {
  base: () => console.log(readBase()),
  commit: (args) => {
    const [subject, ...paths] = args;
    if (subject === undefined || paths.length === 0) return fail(["usage: commit <subject> <path>..."]);
    return done(judgeCommit(commitsSince(readBase()), subject, paths), `commit: ${subject}`);
  },
  unchanged: (args) => {
    if (args.length === 0) return fail(["usage: unchanged <path>..."]);
    const changed = git("diff", "--name-only", readBase(), "--", ...args).split("\n").filter((p) => p !== "");
    const untracked = git("ls-files", "--others", "--exclude-standard", "--", ...args).split("\n").filter((p) => p !== "");
    return done(judgeUnchanged({ changed, untracked }), `unchanged: ${args.join(" ")}`);
  },
  scratch: (args) => {
    const [name, ...flags] = args;
    if (flags.length !== 0 && !(flags.length === 2 && flags[0] === "--at")) return fail(["usage: scratch <name> [--at <rev>]"]);
    console.log(makeScratch(name, flags[1]));
  },
  "scratch-clean": (args) => {
    if (args.length > 1 || (args.length === 1 && args[0] !== "--check")) return fail(["usage: scratch-clean [--check]"]);
    const { bad, note } = cleanScratch(scratchRoot(), realpathSync(process.env.TMPDIR ?? "/tmp"), args.length === 1);
    return done(bad, note);
  },
  variant: variantMode,
  "seen-failing": (args) => {
    const flags = args.filter((a, i) => a === "--if-present" || a === "--titles-matching" || args[i - 1] === "--titles-matching");
    const [file] = args.filter((a) => !flags.includes(a));
    const at = args.indexOf("--titles-matching");
    const prefix = at < 0 ? undefined : args[at + 1];
    if (file === undefined || (at >= 0 && prefix === undefined)) return fail(["usage: seen-failing <file> [--titles-matching <prefix>] [--if-present]"]);
    if (!existsSync(file)) return args.includes("--if-present") ? console.log(`seen-failing: ${file} absent`) : fail([`${file} does not exist`]);
    const titles = (() => {
      if (/\.tst\.tsx?$/.test(file)) return titlesOf(readText(file));
      const text = vitestReport([file], process.cwd());
      const report = text === undefined ? undefined : (() => { try { return JSON.parse(text); } catch { return undefined; } })();
      return report === undefined || !Array.isArray(report.testResults) ? [] : rowsOfReport(report).map((r) => r.fullName);
    })();
    const kept = prefix === undefined ? titles : titles.filter((t) => t.startsWith(prefix));
    return done(judgeSeenFailing(kept, maybe(EVIDENCE) ?? ""), `seen-failing: ${file}: ${kept.length} titles, each seen failing`);
  },
  vitest: (args) => {
    if (args.length === 0) return fail(["usage: vitest <file>..."]);
    const judged = judgeVitestRun(vitestReport(args, process.cwd()));
    return done(judged.bad, judged.line);
  },
  suite: (args) => {
    if (args.length > 0) return fail(["usage: suite"]);
    const judged = judgeVitestRun(vitestReport(["--project", "core", "--project", "http", "--project", "testing", "--project", "devtools"], process.cwd()));
    return done(judged.bad, `suite: ${judged.line}`);
  },
  "scan-ids": () => done(judgeIds(treeEntries(readBase())), "scan-ids: no id or phase wording in added lines"),
  "scan-forbidden": () => {
    const base = readBase();
    const guards = GUARDED.map((file) => ({ file, base: git("show", `${base}:${file}`), current: readText(file) }));
    const entries = treeEntries(base);
    return done([...judgeGuards(guards), ...judgeForbidden(entries)], scannedLines(entries) === 0 ? "scan-forbidden: no added source or test line" : "scan-forbidden: no forbidden form in added lines");
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
  circular: () => {
    const r = run(["pnpm", "circular"], process.cwd());
    return done(judgeCircular(r.code, `${r.out}\n${r.err}`), "circular: no circular dependency found");
  },
  records: recordsMode,
  "port-facts": portFactsMode,
  "scoped-route": scopedMode,
  "sixth-port": sixthMode,
  spike: spikeMode,
  bench: benchMode,
  "routing-landed": routingMode,
  close: closeMode,
  "--self-test": () => selfTest(),
};

// ---- the self-test: planted texts and outputs, never the real constants of the tree ----

const selfTest = () => {
  let passed = 0;
  const failures = [];
  const eq = (name, got, want) => {
    if (JSON.stringify(got) !== JSON.stringify(want)) failures.push(`self-test FAILED: ${name}: got ${JSON.stringify(got)}, wanted ${JSON.stringify(want)}`);
    else passed++;
  };
  const has = (name, reasons, part) => eq(name, reasons.some((r) => r.includes(part)), true);
  const lacks = (name, reasons, part) => eq(name, reasons.some((r) => r.includes(part)), false);

  // The trees and the base.
  eq("an unchanged tree passes", judgeUnchanged({ changed: [], untracked: [] }), []);
  eq("a changed path fails", judgeUnchanged({ changed: ["p"], untracked: [] }).length, 1);
  eq("an untracked path fails", judgeUnchanged({ changed: [], untracked: ["q"] }).length, 1);
  const sha = "0123456789abcdef0123456789abcdef01234567";
  const facts = { branch: BRANCH, planningAncestor: true, baseAncestor: true, outside: [] };
  eq("a recorded base with both ancestors passes", judgeBase(sha, facts), []);
  eq("a missing record fails", judgeBase(undefined, facts), ["phase_base is not recorded"]);
  eq("another branch fails", judgeBase(sha, { ...facts, branch: "main" }), [`the branch is main, not ${BRANCH}`]);
  eq("a detached head fails", judgeBase(sha, { ...facts, branch: "" }), [`the branch is detached, not ${BRANCH}`]);
  eq("a base that is not an ancestor fails", judgeBase(sha, { ...facts, baseAncestor: false }), ["phase_base is not an ancestor of HEAD"]);
  eq("a planning commit that is not an ancestor fails", judgeBase(sha, { ...facts, planningAncestor: false }), [`${PLANNING_HEAD} is not an ancestor of HEAD`]);
  eq("a file outside .planning that differs fails", judgeBase(sha, { ...facts, outside: ["a.ts"] }), [`a.ts differs between ${PLANNING_HEAD} and phase_base outside .planning`]);
  eq("the record's phase_base is read", phaseBaseOf(`{"phase":"90","phase_base":"${sha}"}`), sha);
  eq("a record with no phase_base gives none", phaseBaseOf('{"phase":"90"}'), undefined);
  eq("a phase_base that is not a full sha gives none", phaseBaseOf('{"phase_base":"cbe375bf"}'), undefined);
  eq("a record that is not JSON gives none", phaseBaseOf("nope"), undefined);
  eq("no record gives none", phaseBaseOf(undefined), undefined);

  // The trailer, and the commit judge.
  const T1 = TRAILER;
  eq("the owner's trailer passes", judgeTrailer(`subject\n\n${T1}\n`), []);
  eq("a doubled trailer fails", judgeTrailer(`s\n\n${T1}\n${T1}\n`).length, 1);
  eq("a missing trailer fails", judgeTrailer("s\n").length, 1);
  eq("a foreign trailer fails", judgeTrailer("s\n\nCo-Authored-By: Someone <a@b.c>\n").length, 1);
  eq("another Claude model fails", judgeTrailer("s\n\nCo-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>\n").length, 1);
  eq("a Claude trailer with another address fails", judgeTrailer("s\n\nCo-Authored-By: Claude Opus 5.5 <a@b.c>\n").length, 1);
  const c = (subject, paths, message = `${subject}\n\n${T1}`) => ({ sha: subject, subject, paths, message });
  const PLAN = "docs(90-01): record";
  const log = [c("docs(90): create phase plan", [".planning/a.md"]), c(PLAN, ["b", "a"]), c("chore(90-01): next", ["z"])];
  eq("a commit with its exact paths passes", judgeCommit(log, PLAN, ["a", "b"]), []);
  eq("a wrong subject fails", judgeCommit(log, "other", ["a"]).length, 1);
  eq("an extra path fails", judgeCommit(log, PLAN, ["a"]).length, 1);
  eq("a missing path fails", judgeCommit(log, PLAN, ["a", "b", "c"]).length, 1);
  eq("a duplicate subject fails", judgeCommit([c(PLAN, ["a"]), c(PLAN, ["a"])], PLAN, ["a"]).length, 1);
  eq("a commit without the trailer fails (a missing trailer)", judgeCommit([c(PLAN, ["a"], PLAN)], PLAN, ["a"]).length, 1);
  eq("a commit with a doubled trailer fails", judgeCommit([c(PLAN, ["a"], `${PLAN}\n\n${T1}\n${T1}`)], PLAN, ["a"]).length, 1);
  eq("a Phase 89 subject is not a plan commit", PLAN_SUBJECT.test("docs(89-01): x"), false);
  eq("a Phase 90 subject is a plan commit", PLAN_SUBJECT.test("chore(90-12)!: x"), true);
  const SUBJECT = "chore(90-02): add the phase check";
  const NEVER = [".planning/config.json", ".planning/state.json", ".planning/REQUIREMENTS.md", "README.md", ".agents/x", ".codex/x", "assets/x", ".planning/milestones/x", "a.iter2.md", ".planning/phases/QD-89-one-admission-step-for-a-host-s-audit-batch/89-check.mjs"];
  const refused = (reasons) => reasons.some((r) => r.includes("a path the run rules never stage"));
  for (const p of NEVER) {
    eq(`${p} in the commit and the asked list is refused`, refused(judgeCommit([c(SUBJECT, [p])], SUBJECT, [p])), true);
    eq(`${p} only in the commit is refused`, refused(judgeCommit([c(SUBJECT, [p])], SUBJECT, ["ok"])), true);
    eq(`${p} only in the asked list is refused`, refused(judgeCommit([c(SUBJECT, ["ok"])], SUBJECT, [p])), true);
  }
  for (const p of ["packages/core/README.md", ".planning/STATE.md", `.planning/phases/${PHASE_DIR}/90-check.mjs`]) eq(`${p} may be staged`, judgeCommit([c(SUBJECT, [p])], SUBJECT, [p]), []);

  // Titles, and the evidence they are read back from.
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
  eq("a describe title is a title a record may name", pinTitlesOf(suite).includes("not a title either"), true);
  eq("a file with no title has none", titlesOf("const a = 1;"), []);
  const apostrophe = "a port's span — its own";
  const evidence = `# x\n\n## a\n- seen failing: ${apostrophe}\n- seen failing: some describe > nested title  \r\n- seen failing: not this\n`;
  eq("evidence names a title with an apostrophe and an em dash literally", judgeSeenFailing([apostrophe], evidence), []);
  eq("a title after a separator is named", judgeSeenFailing(["nested title"], evidence), []);
  eq("a title with its line end trimmed (trailing spaces and CR) is named", judgeSeenFailing(["some describe > nested title"], evidence), []);
  eq("a title missing from the evidence fails", judgeSeenFailing(["absent title"], evidence), ["no seen failing line in the evidence for: absent title"]);
  eq("a prefix of a longer title is not named", judgeSeenFailing(["not"], evidence).length, 1);
  eq("a title that is only the tail of a word is not named", judgeSeenFailing(["is"], "- seen failing: this\n").length, 1);
  eq("a straight apostrophe is not a typographic one", judgeSeenFailing(["a port’s span — its own"], evidence).length, 1);
  eq("a file with zero titles fails, so an empty file cannot pass", judgeSeenFailing([], evidence), ["the file reports zero tests"]);
  const prefixed = ["a describe one", "a describe two", "another one"].filter((t) => t.startsWith("a describe"));
  eq("--titles-matching keeps only the prefixed titles", prefixed, ["a describe one", "a describe two"]);
  eq("a prefix no title has leaves zero titles, which fails", judgeSeenFailing(["x", "y"].filter((t) => t.startsWith("zzz")), evidence), ["the file reports zero tests"]);
  const block = evidenceBlock({ label: "L1", scratch: "s1", sha: "abc", edit: "e", diff: { sha: "d", files: 1, added: 2, removed: 3 }, run: "vitest f", exit: 1, titles: ["t1"], text: ["x"], groups: [{ file: "f.ts", code: "TS1", n: 2 }] });
  eq("a block names its scratch commit, edit, diff, run and exit", block.split("\n").slice(0, 6), ["## L1", "- scratch: s1 at abc", "- edit: e", "- diff: d (1 files, +2 -3)", "- run: vitest f", "- exit: 1"]);
  eq("a block lists its titles, text and groups", block.split("\n").slice(6, 9), ["- seen failing: t1", "- failing text: x", "- tsc: f.ts TS1 x2"]);
  const twice = `${block}\n${block.replace("L1", "L2").replace("at abc", "at def")}`;
  eq("the last block of a heading is read, an earlier one stays", [lastBlock(twice, "L1")?.includes("at abc"), lastBlock(twice, "L2")?.includes("at def"), lastBlock(twice, "L3")], [true, true, undefined]);
  eq("failing text is the first three non-blank lines", failingLines("\n a \n\n b\nc\nd\n"), [" a", " b", "c"]);
  const tsc = "packages/core/src/A.ts(3,4): error TS2741: Property 'x' is missing\n  in type y\npackages/core/src/A.ts(9,1): error TS2741: again\nerror TS6305: no file\nplain\n";
  eq("tsc output is grouped by file and code", tscGroups(tsc), [{ file: "(none)", code: "TS6305", n: 1 }, { file: "packages/core/src/A.ts", code: "TS2741", n: 2 }]);
  eq("each tsc error keeps its continuation lines", tscErrors(tsc)[0].text, "packages/core/src/A.ts(3,4): error TS2741: Property 'x' is missing\n  in type y");
  eq("a block's groups are read back", blockGroups("- tsc: a.ts TS1 x3\n- tsc: (none) TS2 x1\n- errors: 4\n"), [{ file: "a.ts", code: "TS1", n: 3 }, { file: "(none)", code: "TS2", n: 1 }]);
  const colour = "\u001b[31m×\u001b[0m \u001b[90ma failing pin\u001b[0m\n  \u001b[32m+\u001b[0m a passing pin\n\u001b[31mError: \u001b[0mType 'x' is not the same\n";
  eq("tstyche's failing titles are read through its colour codes", tstycheFailing(colour, ["a failing pin", "a passing pin"]), ["a failing pin"]);
  eq("tstyche's failing text is its Error lines", tstycheText(colour), ["Error: Type 'x' is not the same"]);

  // Vitest reports.
  const sfile = (name, rows, over = {}) => ({ name: `/r/${name}`, status: "passed", message: "", assertionResults: rows.map(([title, status]) => ({ title, fullName: `d ${title}`, status, failureMessages: status === "failed" ? ["boom\nstack"] : [] })), ...over });
  const report = (...files) => JSON.stringify({ testResults: files });
  eq("a clean report passes with its counts", judgeVitestRun(report(sfile("a.test.ts", [["x", "passed"], ["y", "passed"]]))).line, "vitest: 2 tests in 1 files, all passed");
  eq("a failing test is named with its first failure line", judgeVitestRun(report(sfile("a.test.ts", [["x", "failed"]]))).bad, ["d x fails: boom"]);
  eq("a report with zero tests fails", judgeVitestRun(report(sfile("a.test.ts", []))).bad, ["the run reports zero tests"]);
  eq("a report naming no file fails", judgeVitestRun('{"testResults":[]}').bad, ["the run reports zero tests"]);
  has("a file that failed to load fails", judgeVitestRun(report(sfile("a.test.ts", [], { message: "cannot import" }))).bad, "failed to load: cannot import");
  eq("no report fails", judgeVitestRun(undefined).bad, ["no report was written"]);
  eq("a report that is not JSON fails", judgeVitestRun("nope").bad, ["the report is not a vitest JSON report"]);
  eq("JSON that is not a report fails", judgeVitestRun("{}").bad, ["the report is not a vitest JSON report"]);
  eq("a row's full name is its ancestors and its title when the report has none", rowsOfReport({ testResults: [{ name: "f", assertionResults: [{ title: "t", ancestorTitles: ["a", "b"], status: "passed" }] }] })[0].fullName, "a b t");

  // Ids and wording in added lines.
  const idEntry = (file, line) => ({ file, text: line, added: new Set([1]) });
  for (const line of ["// D-49 says", "see 90-03", "PFACT-02 holds", "WX-05", "QD-90 closes", "Phase 90 added", "phase 90", "ADR-QD-NEXT", "x BEH-QD-NEXT y", "D-12", "CCR-QD-NEXT"]) {
    eq(`${line} is flagged`, judgeIds([idEntry("packages/core/src/a.ts", line)]).length, 1);
  }
  for (const line of ["ADR-QD-203", "INV-QD-426", "BEH-QD-789", "CCR-QD-482", "ARCH-137", "D-49-a", "a 1290-03x", "x190-03", "PFACT-1", "Phase 900", "QD-900", "WX-1", "2026-11-26"]) {
    eq(`${line} is not flagged`, judgeIds([idEntry("packages/core/src/a.ts", line)]), []);
  }
  for (const line of ["this phase", "Until Now", "any more", "no longer", "from now on", "it holds from now on", "previously", "now does"]) {
    eq(`${line} is flagged in source`, judgeIds([idEntry("packages/core/src/a.ts", line)]).length, 1);
    eq(`${line} is flagged in a test`, judgeIds([idEntry("packages/core/test/a.test.ts", line)]).length, 1);
    eq(`${line} is allowed in a changeset`, judgeIds([idEntry(".changeset/a.md", line)]), []);
  }
  eq("a changeset is still scanned for ids", judgeIds([idEntry(".changeset/a.md", "PFACT-01")]).length, 1);
  eq("a decision number inside .planning is not scanned", judgeIds([]), []);
  eq("D-10-k is not read as a decision number", judgeIds([idEntry("packages/core/src/a.ts", "D-10-k")]), []);
  const spec = "# Title\nno longer here\n## Change History\n| 1 | no longer a row |\n";
  eq("a phrase before the change history is flagged", judgeIds([{ file: "spec/a.md", text: spec, added: new Set([2]) }]).length, 1);
  eq("a phrase in the change history is exempt", judgeIds([{ file: "spec/a.md", text: spec, added: new Set([4]) }]), []);
  const header = "> | Change History | 1.1 (2026-11-26): a row\n> | Status | no longer here\n";
  eq("a phrase in the Document Control history row is exempt", judgeIds([{ file: "spec/a.md", text: header.replace("a row", "no longer a row"), added: new Set([1]) }]), []);
  eq("a phrase in another Document Control row is flagged", judgeIds([{ file: "spec/a.md", text: header, added: new Set([2]) }]).length, 1);
  eq("only added lines are scanned for ids", judgeIds([{ file: "packages/core/src/a.ts", text: "// D-12\nconst a = 1;", added: new Set([2]) }]), []);
  eq("reasons are printed sorted by file then line", judgeIds([{ file: "b.ts", text: "D-1\nD-2", added: new Set([2, 1]) }, { file: "a.ts", text: "D-3", added: new Set([1]) }]).map((r) => r.split(" ")[0]), ["a.ts:1", "b.ts:1", "b.ts:2"]);

  // Forbidden forms.
  const src = "packages/core/src/A.ts";
  const test = "packages/core/test/A.test.ts";
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
    ["a multi-name let", "let a = 1,\n  b = 2;"],
    ["any as a type", "const a: any = 1;"],
    ["any in generics", "type A = Array<any>;"],
    ["a non-null assertion", "const a = b!.c;"],
    ["an as cast", "const planted = value as Planted;"],
    ["a double as cast", "const planted = value as unknown as Planted;"],
  ]) eq(`${what} is flagged in source`, one(src, text).length >= 1, true);
  eq("an as cast is flagged in a test", one(test, "const planted = value as Planted;").length, 1);
  eq("async is allowed in a test", one(test, "const f = async () => 1;"), []);
  eq("a module-scope let is allowed in a test", one(test, "let a = 1;"), []);
  eq("switch is flagged in a test", one(test, "switch (x) { }").length, 1);
  eq("a file outside source and test is not scanned", one("scripts/a.mjs", "let a = 1; switch (x) {}"), []);
  eq("a type test file is scanned", one("packages/core/test/A.tst.ts", "const a = b as C;").length, 1);
  for (const [what, text] of [
    ["an as inside a comment", "// cast it as Planted\nconst a = 1;"],
    ["an as inside a block comment", "/* value as X\n let a */\nconst a = 1;"],
    ["an as inside a string", 'const f = () => "value as Planted";'],
    ["a forbidden form inside a string", 'const f = () => "switch (x) { Date.now( }";'],
    ["as const", "const a = [1] as const;"],
    ["an import namespace", 'import * as Effect from "effect/Effect";'],
    ["an import rename", 'import { a as b } from "./x.ts";'],
    ["a multi-line import rename", 'import {\n  a as b,\n  c,\n} from "./x.ts";'],
    ["an export rename", 'export { a as b } from "./x.ts";'],
    ["!==", "const a = b !== c;"],
    ["a negation", "const a = !b && c != d;"],
    ["an indented let", "const f = () => {\n  let a = 1;\n  return a;\n};"],
    ["a blanked template", "const f = () => `value as Planted ${1}`;"],
    ["a word holding any", "const company = 1;\nconst many = 2;"],
    ["an exclamation inside a string", 'const f = () => "wow!";'],
  ]) eq(`${what} is not flagged`, one(src, text), []);
  eq("an as inside a template expression is flagged", one(src, "const f = () => `${value as Planted}`;").length, 1);
  eq("only added lines are judged", judgeForbidden([{ file: src, text: "let a = 1;\nconst b = 1;", added: new Set([2]) }]), []);
  eq("a tree with no added source or test line scans none", [scannedLines([{ file: "scripts/a.mjs", text: "x", added: new Set([1]) }]), scannedLines([{ file: src, text: "x", added: new Set() }]), scannedLines([])], [0, 0, 0]);
  eq("added source lines are counted", scannedLines([{ file: src, text: "a\nb", added: new Set([1, 2]) }, { file: test, text: "a", added: new Set([1]) }]), 3);
  eq("no entry passes", judgeForbidden([]), []);
  eq("a CRLF file reports the line the diff numbers", one(src, "const a = 1;\r\nconst b = 2;\r\nconst c = d as E;\r\n").map((r) => r.split(" ")[0]), [`${src}:3`]);
  eq("a multi-byte character never shifts a reported line", one(src, "const ü = 'é—✓';\nconst 日本 = 1;\nconst c = d as E;").map((r) => r.split(" ")[0]), [`${src}:3`]);
  eq("reasons are sorted by file then line", judgeForbidden([{ file: "packages/core/test/B.test.ts", text: "x as Y;\nz as W;", added: new Set([2, 1]) }, { file: "packages/core/src/A.ts", text: "x as Y;", added: new Set([1]) }]).map((r) => r.split(" ")[0]), ["packages/core/src/A.ts:1", "packages/core/test/B.test.ts:1", "packages/core/test/B.test.ts:2"]);
  const planted = "a /* x */ 'b' `c ${ d as E } f` // g\nh";
  const blanked = blank(planted);
  eq("blank keeps code and length", [blanked.length === planted.length, blanked.includes("d as E"), blanked.includes("c "), blanked.includes("g")], [true, true, false, false]);
  const kept = blank(planted, true);
  eq("blank with keepStrings keeps the strings and blanks the comments", [kept.length === planted.length, kept.includes("'b'"), kept.includes("c "), kept.includes("x"), kept.includes("g")], [true, true, true, false, false]);
  eq("a string holding two slashes is not a comment", blank('import x from "http://a"; // c', true).includes("http://a"), true);
  eq("the statements at module scope are split", topLevel(blank('import a from "./a.ts";\nexport type T = Data.TaggedEnum<{\n  A: {};\n}>;\nexport function f() {\n  return { a: 1 };\n}\nexport const E = 1;\n')).map(({ text, line }) => [collapse(text).split(" ").slice(0, 2).join(" "), line]), [["import a", 1], ["export type", 2], ["export function", 5], ["export const", 8]]);
  const stmts = topLevel("const a = 1;\nconst b = 2;");
  eq("a statement carries its offsets", [stmts[1].index, stmts[1].end], [13, 25]);
  eq("imports are read with their names and their type-only flag", importsOf('import type { A, B as C } from "./a.ts";\nimport * as Data from "effect/Data";\nimport "./side.ts";\nexport { z } from "./z.ts";\nimport { type D, e } from "./d.ts";\n').map(({ spec, names, typeOnly }) => [spec, names, typeOnly]), [["./a.ts", ["A", "B"], true], ["effect/Data", ["Data"], false], ["./side.ts", [], false], ["./z.ts", ["z"], false], ["./d.ts", ["D", "e"], false]]);
  eq("brackets are matched", [closeOf("f(a(b)c)d", 1), closeOf("f(a", 1), closeOf("x", 0)], [8, -1, -1]);
  const diff = "diff --git a/x.ts b/x.ts\n--- a/x.ts\n+++ b/x.ts\n@@ -3,1 +3,2 @@\n-old\n+new\n+newer\n@@ -9,0 +11 @@\n+late\ndiff --git a/gone.ts b/gone.ts\n--- a/gone.ts\n+++ /dev/null\n@@ -1 +0,0 @@\n-x\n";
  const parsed = parseDiff(diff);
  eq("a diff's added lines are numbered in the new file", [[...parsed.get("x.ts")], parsed.has("gone.ts")], [[3, 4, 11], false]);

  // Guarded files: AGENTS.md may change inside its section 3 only.
  const agents = "# A\n\n## 2. Services\n\nx\n\n## 3. Layers\n\nlayers\n\n## 4. Errors\n\ny\n";
  const guard = (file, base, current) => judgeGuards([{ file, base, current }]);
  eq("an unchanged AGENTS.md passes", guard("AGENTS.md", agents, agents), []);
  eq("a line added inside section 3 passes", guard("AGENTS.md", agents, agents.replace("layers\n", "layers\nnew line\n")), []);
  eq("a line added outside section 3 fails (§6 and §2)", [guard("AGENTS.md", agents, `${agents}more\n`).length, guard("AGENTS.md", agents, agents.replace("x\n", "x\nnew\n")).length], [1, 1]);
  has("a section 3 heading removed fails", guard("AGENTS.md", agents, agents.replace("## 3. Layers", "## 3 Layers")), "has no section 3");
  eq("a heading moved fails", guard("AGENTS.md", agents, "# A\n\n## 3. Layers\n\nlayers\n\n## 2. Services\n\nx\n\n## 4. Errors\n\ny\n").length, 1);
  eq("a changed budget file fails", guard("scripts/check-house-style.mjs", "x", "y"), ["scripts/check-house-style.mjs differs from phase_base: no budget moves"]);
  eq("an unchanged budget file passes", guard(".oxlintrc.json", "{}", "{}"), []);
  eq("a changed .oxlintrc.json fails", guard(".oxlintrc.json", "{}", "{ }").length, 1);

  // Scratch clones, variants and the scratch root.
  for (const bad of ["a/b", "..", "a..b", "", "../x", "-x", undefined]) eq(`the scratch name ${String(bad)} is refused`, judgeScratchName(bad).length, 1);
  for (const good of ["sixth-base", "spike-a", "x1.2"]) eq(`the scratch name ${good} is accepted`, judgeScratchName(good), []);
  eq("a root named qd90 directly under the temporary directory is accepted", judgeScratchRoot("/t/qd90", "/t"), []);
  eq("a root not named qd90 is refused", judgeScratchRoot("/t/other", "/t").length, 1);
  eq("a root under another directory is refused", judgeScratchRoot("/u/t/qd90", "/t").length, 1);
  eq("a root that is neither is refused twice", judgeScratchRoot("/u/other", "/t").length, 2);
  const tmp = realpathSync(mkdtempSync(join(tmpdir(), "qd90-self-")));
  try {
    mkdirSync(join(tmp, "qd90"));
    writeFileSync(join(tmp, "qd90", "x"), "x");
    mkdirSync(join(tmp, "other"));
    eq("scratch-clean --check on a present root fails", cleanScratch(join(tmp, "qd90"), tmp, true).bad.length, 1);
    eq("scratch-clean refuses a root not named qd90, and removes nothing", [cleanScratch(join(tmp, "other"), tmp, false).bad.length, existsSync(join(tmp, "other"))], [1, true]);
    eq("scratch-clean refuses a root whose parent is not the temporary directory", cleanScratch(join(tmp, "other", "qd90"), tmp, false).bad.length, 1);
    eq("scratch-clean removes the planted root", [cleanScratch(join(tmp, "qd90"), tmp, false).bad, existsSync(join(tmp, "qd90"))], [[], false]);
    eq("scratch-clean --check on an absent root passes", cleanScratch(join(tmp, "qd90"), tmp, true).bad, []);
    eq("scratch-clean on an absent root passes too", cleanScratch(join(tmp, "qd90"), tmp, false).bad, []);
    // A planted clone for the variant mode: a repository with two scripts of the phase directory.
    const clone = join(tmp, "clone");
    mkdirSync(join(clone, D), { recursive: true });
    const g = (...a) => gitIn(clone, ...a);
    g("init", "-q");
    g("config", "user.email", "t@example.com");
    g("config", "user.name", "t");
    writeFileSync(join(clone, D, "pass.mjs"), "process.exit(0);\n");
    writeFileSync(join(clone, D, "fail.mjs"), 'console.error("first line");console.error("second line");process.exit(3);\n');
    writeFileSync(join(clone, "a.txt"), "one\n");
    g("add", ".");
    g("-c", "commit.gpgsign=false", "commit", "-q", "-m", "init");
    writeFileSync(join(clone, ".git", "qd90-origin"), `${g("rev-parse", "HEAD").trim()}\n`);
    writeFileSync(join(clone, "a.txt"), "one\ntwo\n");
    const ev = join(tmp, "evidence.md");
    writeFileSync(ev, "# Phase 90 RED evidence\n");
    const passing = variantAt(clone, ev, "L-pass", "script", ["pass.mjs"], "none");
    eq("a variant run that passes is not seen failing, and appends nothing", [passing.ok, passing.message, readText(ev)], [false, "variant L-pass was not seen failing", "# Phase 90 RED evidence\n"]);
    const failing = variantAt(clone, ev, "L-fail", "script", ["fail.mjs"], "a line added to a.txt");
    const text = readText(ev);
    eq("a variant run that fails appends its block", [failing.ok, text.includes("## L-fail"), text.includes("- exit: 3"), text.includes("- failing text: first line"), text.includes("- failing text: second line"), text.includes("- edit: a line added to a.txt"), /- diff: [0-9a-f]{64} \(1 files, \+1 -0\)/.test(text)], [true, true, true, true, true, true, true]);
    variantAt(clone, ev, "L-fail2", "script", ["fail.mjs"], "again");
    const later = readText(ev);
    eq("a later block is appended after the earlier one, which stays byte for byte", [later.startsWith(text), later.indexOf("## L-fail2") > later.indexOf("## L-fail")], [true, true]);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
  eq("a circular run that finds no cycle passes", judgeCircular(0, "✔ No circular dependency found!"), []);
  eq("a circular run that fails is refused", judgeCircular(1, "Found 2 circular dependencies!").length, 1);
  eq("a circular run that exits 0 without the words is refused", judgeCircular(0, "").length, 1);

  // records.
  const rTest = 'it("W1 a title", () => {});\nit("B2 row", () => {});\n';
  const known = new Set(["packages/core/test/PortFacts.characterisation.test.ts", "packages/core/test/PortFacts.tst.ts", "packages/core/test/LeafNeeds.test.ts"]);
  const rRead = (p) => (known.has(p) ? rTest : undefined);
  const rResolve = (name) => [...known].find((p) => p.endsWith(`/${name}`));
  const rPin = (path) => `Pinned by \`${path}\` ("W1 a title", "B2 row").`;
  const rBeh = (n, body, head = "heading") => `## BEH-QD-${n}: ${head}\n\n${body}\n\n`;
  const PIN = "packages/core/test/PortFacts.characterisation.test.ts";
  const fix = (routing = "landed") => ({
    doc: [
      rBeh(445, "Names LEAF_NEEDS."),
      rBeh(588, "The row decides.", "The leaf-needs table states which leaves ask about one resource; `readScoped` routes on it"),
      ...NEW_BEHAVIORS.map((n) => rBeh(n, rPin(PIN))),
    ].join(""),
    trace: ["## §1 Behavior to source", "", "| 30 | BEH-QD-786–790 | `x` |", "", "## §2 Invariant traceability", "", "| [INV-QD-425](a) | d |", "| [INV-QD-426](a) | d |", "", "## §3 Decision traceability", "", "| [ADR-QD-203](a) | t |", "", "## §4 Test file map", "", ...TRACE_TESTS.map((p) => `| \`${p}\` | x |`), ""].join("\n"),
    close: {
      routing,
      invariants: ["## INV-QD-425: a\n\n**Source**: `PortName.ts`, `Ports.ts`.\n\n", "## INV-QD-426: a\n\n**Source**: `PortAccess.ts`, `LeafNeeds.ts`.\n\n", "## INV-QD-288: a\n\n**Source**: `LeafNeeds.ts`.\n\n**Enforcement**: `LeafNeeds.test.ts`.\n\n", "## INV-QD-345: a\n\nSee [x](#inv-qd-426-y).\n\n"].join(""),
      adr203: ["No property lost; tests removed: 1.", "", "Candidates (a) (b) (c) (d) (e) (f) (g). CCR-QD-270, CCR-QD-419, ADR-QD-114.", "", "# gate: pass", "", routing === "rejected" ? "A measured rejection." : "", "## What enforces it", "", "The commands.", ""].join("\n"),
      adr094: "ADR-QD-203 is named.\n",
      adr134: "ADR-QD-203 is named.\n",
      adr163: routing === "rejected" ? "163 text\n" : "ADR-QD-203 is named.\n",
      adr114: { base: "114\n", now: "114\n" },
      index: ["094", "134", "163"].map((n) => `  - id: "ADR-QD-${n}"\n    status: "Accepted; amended (ADR-QD-203)"\n`).join("") + '  - id: "ADR-QD-203"\n    file: "203-x.md"\n',
      readme: "| CCR-QD-482 | 2026-11-26 | ARCH-137 the facts. Unused: none |\n",
      revised: REVISED_DOCUMENTS.filter((f) => !(routing === "rejected" && f === ADR163)).map((file) => ({ file, base: "> | Revision       | 1.4   |\n", now: "> | Revision       | 1.5   |\n" })),
      changesets: [
        { file: CHANGESET, text: `${CHANGESET_HEAD} ${CHANGESET_SENTENCES.join(" ")}\n` },
        { file: HTTP_CHANGESET, text: `${HTTP_CHANGESET_HEAD}The routes read core's list. ${NO_EXPORT_CHANGES}\n` },
        { file: TESTING_CHANGESET, text: `${TESTING_CHANGESET_HEAD}The doc says what reads what. ${NO_EXPORT_CHANGES}\n` },
      ],
      agents: `## 3. Layers\n\n${AGENTS_SENTENCE}\n`,
      upgrade: `${UPGRADE_HEADING}\n\nbody\n`,
      base588: "BEH-QD-588: base heading\n\nThe base says `readScoped` does not read the column.\n\n",
      base163: "163 text\n",
    },
  });
  const rec = (mutate, { close = true, routing = "landed" } = {}) => {
    const f = fix(routing);
    mutate?.(f);
    return judgeRecords({ trace: f.trace, doc: f.doc, read: rRead, resolve: rResolve }, close ? f.close : undefined);
  };
  const doc = (from, to) => (f) => (f.doc = f.doc.replace(from, to));
  const cl = (k, from, to) => (f) => (f.close[k] = f.close[k].replace(from, to));
  const closedHas = (name, mutate, part, opts) => has(name, rec(mutate, opts), part);
  eq("records that agree pass, closed or not", [rec(undefined), rec(undefined, { close: false })], [[], []]);
  eq("the rejected form passes when written as a rejection", rec((f) => {
    f.doc = f.doc.replace(/## BEH-QD-588:[\s\S]*?\n\n(?=## BEH-QD-786)/, "## BEH-QD-588: base heading\n\nThe base says `readScoped` does not read the column.\n\n");
  }, { routing: "rejected" }), []);
  closedHas("the rejected form without the words measured rejection fails", (f) => (f.close.adr203 = f.close.adr203.replace("measured rejection", "x")), "does not say measured rejection", { routing: "rejected" });
  closedHas("the rejected form with BEH-QD-588 edited fails", undefined, "BEH-QD-588 differs from phase_base while the routing is a measured rejection", { routing: "rejected" });
  closedHas("the rejected form with ADR-QD-163 edited fails", (f) => (f.close.adr163 = "edited"), "ADR-QD-163 differs from phase_base", { routing: "rejected" });
  has("a quoted title that no test holds fails", rec(doc('"W1 a title"', '"W1 a titel"'), { close: false }), 'quotes "W1 a titel"');
  has("a pinned file that does not exist fails", rec(doc(PIN, "packages/core/test/Gone.test.ts"), { close: false }), "packages/core/test/Gone.test.ts, which does not exist");
  has("a bare name that resolves to no test file fails", rec(doc(PIN, "Gone.test.ts"), { close: false }), "Gone.test.ts, which does not exist");
  eq("a bare name that resolves is read", rec(doc(PIN, "PortFacts.tst.ts"), { close: false }), []);
  has("a new behavior with no pinned-by paragraph fails", rec(doc("## BEH-QD-787: heading\n\nPinned by", "## BEH-QD-787: heading\n\nNot pinned by"), { close: false }), "BEH-QD-787 names no test file in a Pinned by paragraph");
  eq("a new behavior with no heading is skipped without --close", rec(doc("## BEH-QD-787:", "## BEH-QD-9787:"), { close: false }), []);
  eq("an old behavior's pinned titles are not judged", rec(doc("Names LEAF_NEEDS.", 'Pinned by `packages/core/test/LeafNeeds.test.ts` ("not a real title").\n\nNames LEAF_NEEDS.'), { close: false }), []);
  for (const n of NEW_BEHAVIORS) {
    closedHas(`BEH-QD-${n} with no heading fails the close`, doc(`## BEH-QD-${n}:`, `## BEH-QD-9${n}:`), `BEH-QD-${n} has no heading`);
    closedHas(`BEH-QD-${n} with no row in section 1 fails the close`, (f) => (f.trace = f.trace.replace("BEH-QD-786–790", NEW_BEHAVIORS.filter((m) => m !== n).map((m) => `BEH-QD-${m}`).join(", "))), `BEH-QD-${n} has no row in spec/traceability.md §1`);
  }
  for (const n of NEW_INVARIANTS) {
    closedHas(`INV-QD-${n} with no heading fails`, (f) => (f.close.invariants = f.close.invariants.replace(`## INV-QD-${n}:`, `## INV-QD-9${n}:`)), `INV-QD-${n} has no heading`);
    closedHas(`INV-QD-${n} with no row fails`, (f) => (f.trace = f.trace.replace(`| [INV-QD-${n}](a) | d |`, "")), `INV-QD-${n} has no row in spec/traceability.md §2`);
    for (const name of INVARIANT_SOURCES[n]) closedHas(`INV-QD-${n} whose source does not name ${name} fails`, (f) => (f.close.invariants = f.close.invariants.replace(new RegExp(`(## INV-QD-${n}: a\\n\\n\\*\\*Source\\*\\*: )[^\\n]*`), "$1`x`.")), `the **Source**: line of INV-QD-${n} does not name ${name}`);
  }
  closedHas("INV-QD-288 whose source does not name LeafNeeds.ts fails", (f) => (f.close.invariants = f.close.invariants.replace("**Source**: `LeafNeeds.ts`.\n\n**Enforcement**", "**Source**: `x`.\n\n**Enforcement**")), "INV-QD-288 does not name LeafNeeds.ts");
  closedHas("INV-QD-288 whose enforcement does not name LeafNeeds.test.ts fails", cl("invariants", "`LeafNeeds.test.ts`", "`x`"), "**Enforcement**: line of INV-QD-288 does not name LeafNeeds.test.ts");
  closedHas("INV-QD-345 without the anchor fails", cl("invariants", "#inv-qd-426-y", "#x"), "INV-QD-345 links no anchor starting #inv-qd-426-");
  closedHas("BEH-QD-588 whose heading lacks the routing words fails", doc("`readScoped` routes on it", "enforces it"), "the heading of BEH-QD-588 does not hold");
  closedHas("BEH-QD-588 that still holds the base sentence fails", doc("The row decides.", "`readScoped` does not\nread the column."), "still holds the sentence");
  closedHas("BEH-QD-445 that does not name LEAF_NEEDS fails", doc("Names LEAF_NEEDS.", "Names nothing."), "BEH-QD-445 does not name LEAF_NEEDS");
  closedHas("a missing decision file fails", (f) => (f.close.adr203 = undefined), "spec/decisions/203-*.md does not exist");
  closedHas("a decision file without the count line fails", cl("adr203", "No property lost; tests removed: 1.", "x"), "No property lost; tests removed");
  closedHas("a decision file without the enforcement section fails", cl("adr203", "## What enforces it", "## Elsewhere"), "no section What enforces it");
  closedHas("an enforcement section naming a gate by number fails", cl("adr203", "The commands.", "gate 12 runs it."), "names a gate by number");
  for (const cand of ADR_CANDIDATES) closedHas(`a decision file without candidate ${cand} fails`, cl("adr203", cand, "x"), `does not name candidate ${cand}`);
  for (const word of ["CCR-QD-270", "CCR-QD-419", "ADR-QD-114"]) closedHas(`a decision file without ${word} fails`, cl("adr203", word, "x"), `does not name ${word}`);
  closedHas("a decision file without a gate line fails", cl("adr203", "# gate: pass", "gate pass"), "no # gate: line");
  closedHas("a missing index entry fails", cl("index", '  - id: "ADR-QD-203"\n    file: "203-x.md"\n', ""), "spec/decisions/index.yaml has no ADR-QD-203 entry");
  for (const n of ["094", "134", "163"]) {
    closedHas(`ADR-QD-${n} whose index status does not name the new decision fails`, (f) => (f.close.index = f.close.index.replace(new RegExp(`(id: "ADR-QD-${n}"\\n    status: "Accepted; amended \\()ADR-QD-203`), "$1x")), `the ADR-QD-${n} entry of spec/decisions/index.yaml does not name ADR-QD-203`);
    closedHas(`ADR-QD-${n} that does not name the decision fails`, cl(`adr${n}`, "ADR-QD-203", "x"), `ADR-QD-${n} does not name ADR-QD-203`);
  }
  closedHas("ADR-QD-114 edited fails", (f) => (f.close.adr114 = { base: "a", now: "b" }), "differs from phase_base");
  closedHas("a missing section 3 row fails", (f) => (f.trace = f.trace.replace("| [ADR-QD-203](a) | t |", "")), "ADR-QD-203 has no row in spec/traceability.md §3");
  for (const path of TRACE_TESTS) closedHas(`a missing row naming ${path} fails`, (f) => (f.trace = f.trace.replaceAll(path, "x")), `spec/traceability.md has no row naming ${path}`);
  closedHas("a missing CCR row fails", cl("readme", "CCR-QD-482", "x"), "spec/README.md has no CCR-QD-482 row");
  closedHas("a CCR row that does not name the item fails", cl("readme", "ARCH-137", "x"), "the CCR-QD-482 row does not name ARCH-137");
  closedHas("a CCR row that holds no Unused fails", cl("readme", "Unused:", "x"), "does not hold Unused:");
  closedHas("a revision equal to its base fails", (f) => (f.close.revised[0].now = f.close.revised[0].base), "spec/README.md is at Revision 1.4, not 1.5");
  closedHas("a revision two above its base fails", (f) => (f.close.revised[3].now = "> | Revision       | 1.6   |\n"), `${BEHAVIORS} is at Revision 1.6, not 1.5`);
  closedHas("a document with no revision fails", (f) => (f.close.revised[4].now = "x"), "has no Revision");
  closedHas("each of the eight revised documents is judged", (f) => f.close.revised.forEach((r) => (r.now = r.base)), `${ADR134} is at Revision 1.4, not 1.5`);
  eq("the landed form judges eight documents and the rejected form seven", [fix("landed").close.revised.length, fix("rejected").close.revised.length], [8, 7]);
  eq("the revision is read from the control table", revisionOf("> | Revision       | 1.413     |\n"), { major: 1, minor: 413, text: "1.413" });
  eq("the three changesets pass", rec().filter((r) => r.includes(".changeset/") || r.includes("changesets")), []);
  closedHas("a fourth changeset fails", (f) => f.close.changesets.push({ file: ".changeset/b.md", text: "x" }), "4 changesets are added since phase_base, not 3");
  closedHas("a fourth changeset is named", (f) => f.close.changesets.push({ file: ".changeset/b.md", text: "x" }), ".changeset/b.md is not one of");
  closedHas("no changeset fails", (f) => (f.close.changesets = []), "0 changesets are added since phase_base, not 3");
  for (const [index, file] of [CHANGESET, HTTP_CHANGESET, TESTING_CHANGESET].entries()) {
    closedHas(`a missing ${file} fails`, (f) => f.close.changesets.splice(index, 1), `${file} is not added since phase_base`);
    closedHas(`a missing ${file} fails the count`, (f) => f.close.changesets.splice(index, 1), "2 changesets are added since phase_base, not 3");
  }
  closedHas("a changeset under another name fails", (f) => (f.close.changesets[0].file = ".changeset/other.md"), `.changeset/other.md is not one of ${CHANGESET}`);
  for (const [index, file, pkg] of [[1, HTTP_CHANGESET, "@qadi/http"], [2, TESTING_CHANGESET, "@qadi/testing"]]) {
    closedHas(`${file} as a minor fails`, (f) => (f.close.changesets[index].text = f.close.changesets[index].text.replace("patch", "minor")), `${file} is not a patch changeset for ${pkg} alone`);
    closedHas(`${file} as a major fails`, (f) => (f.close.changesets[index].text = f.close.changesets[index].text.replace("patch", "major")), `${file} is not a patch changeset for ${pkg} alone`);
    closedHas(`${file} for another package fails`, (f) => (f.close.changesets[index].text = f.close.changesets[index].text.replace(pkg, "@qadi/audit")), `${file} is not a patch changeset for ${pkg} alone`);
    closedHas(`${file} naming a second package fails`, (f) => (f.close.changesets[index].text = f.close.changesets[index].text.replace(`"${pkg}": patch\n`, `"${pkg}": patch\n"@qadi/core": patch\n`)), `${file} is not a patch changeset for ${pkg} alone`);
    closedHas(`${file} without "${NO_EXPORT_CHANGES}" fails`, (f) => (f.close.changesets[index].text = f.close.changesets[index].text.replace(NO_EXPORT_CHANGES, "x")), `${file} does not hold: ${NO_EXPORT_CHANGES}`);
    closedHas(`${file} swapped with another file name fails`, (f) => (f.close.changesets[index].file = CHANGESET), `${file} is not added since phase_base`);
  }
  closedHas("the core changeset naming a second package fails", (f) => (f.close.changesets[0].text = f.close.changesets[0].text.replace('"@qadi/core": minor\n', '"@qadi/core": minor\n"@qadi/http": patch\n')), "is not a Breaking minor changeset for @qadi/core alone");
  closedHas("a changeset that is a patch fails", (f) => (f.close.changesets[0].text = f.close.changesets[0].text.replace("minor", "patch")), "is not a Breaking minor changeset for @qadi/core alone");
  closedHas("a changeset for another package fails", (f) => (f.close.changesets[0].text = f.close.changesets[0].text.replace("@qadi/core", "@qadi/audit")), "is not a Breaking minor changeset");
  for (const sentence of CHANGESET_SENTENCES) closedHas(`a changeset without "${sentence}" fails`, (f) => (f.close.changesets[0].text = f.close.changesets[0].text.replace(sentence, "x")), `does not hold: ${sentence}`);
  lacks("a changeset wrapped over lines still holds its sentences", rec((f) => (f.close.changesets[0].text = f.close.changesets[0].text.replaceAll(" ", "\n")).valueOf?.()), "does not hold");
  closedHas("AGENTS.md without the new-port sentence fails", cl("agents", "A new port is", "A port is"), "AGENTS.md section 3 does not hold the new-port sentence");
  closedHas("an upgrade guide without the heading fails", cl("upgrade", UPGRADE_HEADING, "## other"), `has no heading ${UPGRADE_HEADING}`);

  // port-facts.
  const portModule = (m) => `const ${m.description.replace(/Port$/, "")}SpanName = "${m.span}";\nconst q = { key: "${m.span === "qadi.attribute" ? "qadi.attribute" : "k"}" };\nexport const ${m.description}: PortDescription<A> = {\n  span: x,\n  fixture: y,\n};\n`;
  const pf = () => ({
    [NAME_FILE]: 'export const PORT_NAMES = [\n  "AttributeResolver",\n  "DecisionHistory",\n  "RelationshipResolver",\n  "CustomPredicate",\n  "SignatureHistory",\n] as const;\nexport type PortName = (typeof PORT_NAMES)[number];\n',
    [METRICS_FILE]: 'import * as Metric from "effect/Metric";\nimport { PORT_NAMES } from "./PortName.ts";\nimport type { PortName } from "./PortName.ts";\nconst PREDICATE_PORT_NAMES = ["AttributeResolver", "DecisionHistory"] as const satisfies ReadonlyArray<PortName>;\n',
    [PORTS_FILE]: "export type PortSpanOf<N extends PortName> = PortTypes[N][\"span\"];\nexport type PortSpanName = PortSpanOf<PortName>;\nexport const PORTS: PortTypes = {\n  a: 1,\n} satisfies DistinctSpanNames<PortTypes>;\nexport const PORT_FIXTURES = tabulatePorts((d) => d.fixture);\n",
    [DERIVATION_FILE]: "export type DistinctSpanNames<R> = unknown;\n",
    [ACCESS_FILE]: "export const a = 1;\n",
    [CALLS_FILE]: "export const c = 1;\n",
    [SERVING_FILE]: "serving\n",
    servingBase: "serving\n",
    ...Object.fromEntries(PORT_MODULES.map((m) => [`${CORE}${m.file}`, portModule(m)])),
  });
  const pfSrc = (files) => Object.entries(files).filter(([k]) => k.startsWith("packages/") && !k.includes("/devtools/")).map(([file, text]) => ({ file, text }));
  const facts1 = (mutate, sections = ["names", "spans", "fixtures", "serving"]) => {
    const files = pf();
    mutate?.(files);
    return judgePortFacts(files, pfSrc(files), sections);
  };
  const at = (file, from, to) => (files) => (files[file] = files[file].replace(from, to));
  eq("a clean set of facts passes, section by section", [facts1(), facts1(undefined, ["names"]), facts1(undefined, ["spans"]), facts1(undefined, ["fixtures"]), facts1(undefined, ["serving"])], [[], [], [], [], []]);
  has("a PortName.ts with an import fails", facts1(at(NAME_FILE, "export const", 'import a from "./a.ts";\nexport const')), "must be a leaf");
  has("a tuple in another order fails", facts1(at(NAME_FILE, '"DecisionHistory",\n  "RelationshipResolver"', '"RelationshipResolver",\n  "DecisionHistory"')), "not AttributeResolver, DecisionHistory");
  has("a tuple with a sixth name fails", facts1(at(NAME_FILE, '"SignatureHistory",', '"SignatureHistory", "X",')), "PORT_NAMES is");
  has("a tuple not written as const fails", facts1(at(NAME_FILE, "] as const", "]")), "does not declare export const PORT_NAMES");
  has("a PortName that is not the tuple's element fails", facts1(at(NAME_FILE, "(typeof PORT_NAMES)[number]", "string")), "does not declare export type PortName");
  has("PortMetrics.ts not importing the tuple as a value fails", facts1(at(METRICS_FILE, 'import { PORT_NAMES } from "./PortName.ts";', 'import type { PORT_NAMES } from "./PortName.ts";')), "does not import PORT_NAMES as a value");
  for (const [what, text] of [["Record<PortName, true>", "const m: Record<PortName, true> = {};"], ["PORT_NAMES_BY_NAME", "const PORT_NAMES_BY_NAME = 1;"], ["Record<PredicatePortName", "type T = Record<PredicatePortName, true>;"]]) {
    has(`PortMetrics.ts holding ${what} fails`, facts1(at(METRICS_FILE, "const PREDICATE", `${text}\nconst PREDICATE`)), `still holds ${what}`);
  }
  eq("a hand-list in a comment is not read", facts1(at(METRICS_FILE, "const PREDICATE", "// Record<PortName, true> PORT_NAMES_BY_NAME\nconst PREDICATE")), []);
  has("a PREDICATE_PORT_NAMES not checked against the tuple fails", facts1(at(METRICS_FILE, " satisfies ReadonlyArray<PortName>", "")), "is not checked with satisfies");
  has("a PortName.ts exporting more than the tuple and its type fails", facts1(at(NAME_FILE, "export type PortName", "export type More = 1;\nexport type PortName")), "not exactly PORT_NAMES and PortName");
  has("a PortSpans interface anywhere fails", facts1((f) => (f[`${CORE}Other.ts`] = "interface PortSpans {\n}\n")), "still declares interface PortSpans");
  eq("an interface PortSpans named in a comment is not read", facts1((f) => (f[`${CORE}Other.ts`] = "// interface PortSpans {\n")), []);
  for (const m of PORT_MODULES) {
    has(`${m.span} declared twice fails`, facts1(at(`${CORE}${m.file}`, "export const", `const dupSpanName = "${m.span}";\nexport const`)), `${m.span} has 2 const <x>SpanName declarations`);
    has(`${m.span} declared nowhere fails`, facts1(at(`${CORE}${m.file}`, /const \w+SpanName = "[^"]*";/, "")), `${m.span} has 0 const <x>SpanName declarations`);
    has(`${m.span} declared in the wrong module fails`, facts1((f) => {
      const other = PORT_MODULES.find((o) => o !== m);
      f[`${CORE}${m.file}`] = f[`${CORE}${m.file}`].replace(/const \w+SpanName = "[^"]*";/, "");
      f[`${CORE}${other.file}`] += `const wrongSpanName = "${m.span}";\n`;
    }), `${m.span} is declared in`);
  }
  eq("the attribute key occurrence at a non-declaration is not counted", facts1(at(`${CORE}AttributeResolver.ts`, "const q", 'const r = { attribute: "qadi.attribute" };\nconst q')), []);
  for (const file of [ACCESS_FILE, DERIVATION_FILE, CALLS_FILE]) {
    has(`a span literal in ${file} fails`, facts1((f) => (f[file] += 'const s = "qadi.acted";\n')), "holds a \"qadi. string literal");
    eq(`a span literal inside a comment of ${file} is not read`, facts1((f) => (f[file] += '// "qadi.acted"\n')), []);
  }
  has("a Ports.ts without PortSpanOf fails", facts1(at(PORTS_FILE, "export type PortSpanOf", "type PortSpanOf")), "does not declare PortSpanOf");
  has("a Ports.ts without PortSpanName fails", facts1(at(PORTS_FILE, "export type PortSpanName", "type PortSpanName")), "does not declare PortSpanName");
  has("a registry without the distinct check fails", facts1(at(PORTS_FILE, " satisfies DistinctSpanNames<PortTypes>", "")), "does not apply satisfies DistinctSpanNames<PortTypes> at PORTS");
  has("a derivation module that does not export the check fails", facts1(at(DERIVATION_FILE, "export type DistinctSpanNames", "type DistinctSpanNames")), "does not export DistinctSpanNames");
  has("a Ports.ts declaring PortFixtureData as an interface fails", facts1(at(PORTS_FILE, "export const PORT_FIXTURES", "export interface PortFixtureData {\n}\nexport const PORT_FIXTURES")), "still declares interface PortFixtureData");
  for (const builder of FIXTURE_BUILDERS) has(`a Ports.ts naming ${builder} fails`, facts1(at(PORTS_FILE, "export const PORT_FIXTURES", `const x = ${builder};\nexport const PORT_FIXTURES`)), `still names the builder ${builder}`);
  has("PORT_FIXTURES not built from d.fixture fails", facts1(at(PORTS_FILE, "tabulatePorts((d) => d.fixture)", "{}")), "does not build PORT_FIXTURES");
  for (const m of PORT_MODULES) has(`a ${m.description} without fixture fails`, facts1(at(`${CORE}${m.file}`, "  fixture: y,\n", "")), `${m.description} has no fixture: member`);
  has("a PortServing.ts that differs from the base fails", facts1((f) => (f[SERVING_FILE] = "edited\n")), "differs from phase_base");

  // scoped-route.
  const routeFile = (over = {}) => {
    const parts = {
      imports: 'import type { LEAF_NEEDS } from "./LeafNeeds.ts";\nimport { isResourceScoped, requireResourceId } from "./ScopedLeaf.ts";\n',
      tag: 'type ScopedLeafTag = {\n  readonly [T in keyof typeof LEAF_NEEDS]: (typeof LEAF_NEEDS)[T]["resourceId"] extends "Never" ? never : T;\n}[keyof typeof LEAF_NEEDS];\n',
      scoped: 'type ScopedPort = {\n  readonly [K in PortName]: [keyof PortTypes[K]["asks"] & ScopedLeafTag] extends [never] ? never : K;\n}[PortName];\n',
      call: 'type ScopedCall<K extends ScopedPort> = [PortNeed<K>] extends ["Always"]\n  ? AlwaysCall<K>\n  : [PortNeed<K>] extends ["ByScope"]\n    ? ByScopeCall<K>\n    : never;\n',
      table: 'const scopedCall: { readonly [K in ScopedPort]: ScopedCall<K> } = {\n  A: { need: "ByScope", withId: (r) => r, bare: (r) => r, resourceScoped: isResourceScoped },\n  R: { need: "Always", withId: ([r], id) => [{ ...r, id }] },\n  S: {\n    need: "ByScope",\n    withId: (r) => r,\n    bare: (r) => r,\n    resourceScoped: isResourceScoped,\n  },\n};\n',
      count: 'const countFor = Match.type<PortInterpreter>().pipe(Match.when("evaluate", () => 1), Match.exhaustive);\n',
      read: 'const readScoped = <K extends ScopedPort>(d: D<K>, leaf: ScopedLeafOf<K>, request: Q<K>) => {\n  const call: AlwaysCall<K> | ByScopeCall<K> = scopedCall[d.port];\n  if (call.need === "ByScope" && !call.resourceScoped(leaf)) {\n    return readPort(d, call.bare(request));\n  }\n  return requireResourceId(request);\n};\n',
      rest: "",
      ...over,
    };
    return parts.imports + parts.tag + parts.scoped + parts.call + parts.table + parts.count + parts.read + parts.rest;
  };
  const routeBad = (over) => judgeScopedRoute(routeFile(over));
  const routeFileTable = () => /const scopedCall[\s\S]*?\n\};\n/.exec(routeFile())[0];
  const withTable = (from, to) => ({ table: routeFileTable().replace(from, to) });
  const withRead = (from, to) => ({ read: /const readScoped[\s\S]*?\n\};\n/.exec(routeFile())[0].replace(from, to) });
  eq("the need-discriminated form passes", routeBad(), []);
  has("a ScopedCall that does not end in never fails", routeBad({ call: 'type ScopedCall<K extends ScopedPort> = [PortNeed<K>] extends ["Always"] ? AlwaysCall<K> : [PortNeed<K>] extends ["ByScope"] ? ByScopeCall<K> : ByScopeCall<K>;\n' }), "does not end in never");
  has("a ScopedCall that tests no ByScope need fails", routeBad({ call: 'type ScopedCall<K extends ScopedPort> = [PortNeed<K>] extends ["Always"] ? AlwaysCall<K> : never;\n' }), 'does not test the port\'s need against ["Always"] and ["ByScope"]');
  has("no ScopedCall fails", routeBad({ call: "" }), "declares no type ScopedCall");
  has("a table typed otherwise fails", routeBad(withTable("{ readonly [K in ScopedPort]: ScopedCall<K> }", "Calls")), "is not typed { readonly [K in ScopedPort]: ScopedCall<K> }");
  has("a row that states no need fails", routeBad(withTable('R: { need: "Always", ', "R: { ")), "the R row of scopedCall states no need");
  has("an Always row with an id-free call fails", routeBad(withTable('R: { need: "Always", ', 'R: { need: "Always", bare: (r) => r, ')), "the Always row R has an id-free call");
  has("a ByScope row with no bare call fails", routeBad(withTable("withId: (r) => r, bare: (r) => r, resourceScoped", "withId: (r) => r, resourceScoped")), "the ByScope row A has no bare call");
  has("a ByScope row with its scope test written inline fails", routeBad(withTable("bare: (r) => r, resourceScoped: isResourceScoped }", "bare: (r) => r, resourceScoped: (l) => isResourceScoped(l) }")), "does not state resourceScoped: isResourceScoped");
  has("a ByScope row whose scope test always answers true fails", routeBad(withTable("bare: (r) => r, resourceScoped: isResourceScoped }", "bare: (r) => r, resourceScoped: () => true }")), "the ByScope row A does not state resourceScoped: isResourceScoped");
  has("no table fails", routeBad({ table: "" }), "does not declare scopedCall");
  has("a table with no ByScope row fails", routeBad({ table: 'const scopedCall: { readonly [K in ScopedPort]: ScopedCall<K> } = {\n  R: { need: "Always", withId: ([r], id) => [{ ...r, id }] },\n};\n' }), "scopedCall has no ByScope row");
  has("the scope test named in readScoped fails", routeBad(withRead("!call.resourceScoped(leaf)", "!isResourceScoped(leaf)")), "outside a ByScope row's resourceScoped");
  has("readScoped inside Effect.fn fails", routeBad(withRead("const readScoped = <K extends ScopedPort>(d: D<K>, leaf: ScopedLeafOf<K>, request: Q<K>) => {", 'const readScoped = Effect.fn("x")(function* (d: D<K>, leaf: ScopedLeafOf<K>, request: Q<K>) {')), "wrapped in Effect.fn or Effect.fnUntraced");
  has("readScoped reading a row at run time fails", routeBad(withRead("!call.resourceScoped(leaf)", "!call.resourceScoped(leaf) && LEAF_NEEDS[leaf._tag].resourceId !== \"Always\"")), "reads a LEAF_NEEDS row at run time");
  has("readScoped running a Match fails", routeBad(withRead("!call.resourceScoped(leaf)", "!Match.value(leaf).pipe(Match.orElse(() => false))")), "runs a Match");
  has("readScoped testing a member with in fails", routeBad(withRead("!call.resourceScoped(leaf)", "\"scope\" in leaf && !call.resourceScoped(leaf)")), "tests a member with in");
  has("readScoped that does not narrow on need fails", routeBad(withRead('call.need === "ByScope" && ', "")), 'does not narrow on the row\'s need === "ByScope"');
  has("readScoped that does not read the table fails", routeBad(withRead("scopedCall[d.port]", "calls[d.port]")), "does not read scopedCall");
  has("no readScoped fails", routeBad({ read: "" }), "does not declare readScoped");
  eq("readScoped as a plain function passes", routeBad({ read: 'function readScoped<K extends ScopedPort>(d: D<K>, leaf: ScopedLeafOf<K>, request: Q<K>) {\n  const call: AlwaysCall<K> | ByScopeCall<K> = scopedCall[d.port];\n  if (call.need === "ByScope" && !call.resourceScoped(leaf)) return readPort(d, call.bare(request));\n  return requireResourceId(request);\n}\n' }), []);
  has("a needsResourceId left over fails", routeBad({ rest: "const needsResourceId = (leaf: Leaf) => true;\n" }), "still names needsResourceId");
  has("a route matcher with a ByScope arm fails", routeBad({ rest: 'const route = Match.type<"Always" | "ByScope">().pipe(Match.when("ByScope", () => 1), Match.exhaustive);\n' }), 'Match.type matcher with a "ByScope" arm');
  has("a switch fails", routeBad({ rest: "function f() {\n  switch (x) {\n  }\n}\n" }), "holds a switch");
  eq("names in a comment or a string are not read", routeBad({ rest: '// isResourceScoped(leaf) needsResourceId switch (x) {}\nconst s = "isResourceScoped(x) needsResourceId";\n' }), []);
  const derived = (over) => judgeScopedDerived(routeFile(over));
  eq("a derived ScopedPort passes, the rows imported by type", derived(), []);
  eq("a value import of the rows passes too", derived({ imports: 'import { LEAF_NEEDS } from "./LeafNeeds.ts";\nimport { isResourceScoped } from "./ScopedLeaf.ts";\n' }), []);
  has("a hand union ScopedPort fails", derived({ scoped: 'type ScopedPort = "DecisionHistory" | "RelationshipResolver" | "SignatureHistory";\n' }), "a hand list of ports");
  has("a ScopedPort extracted from a hand list fails", derived({ scoped: 'type ScopedPort = Extract<PortName, "DecisionHistory" | "RelationshipResolver" | "SignatureHistory">;\n' }), "a hand list of ports");
  has("a ScopedPort that indexes PortTypes by a port name fails", derived({ scoped: 'type ScopedPort = {\n  readonly [K in PortName]: [keyof PortTypes["DecisionHistory"]["asks"] & ScopedLeafTag] extends [never] ? never : K;\n}[PortName];\n' }), "a hand list of ports");
  has("a ScopedPort that does not read ScopedLeafTag fails", derived({ scoped: "type ScopedPort = Extract<PortName, keyof Scoped>;\n" }), "is not read from ScopedLeafTag");
  has("a ScopedLeafTag not read from the rows fails", derived({ tag: 'type ScopedLeafTag = "HasRelationship" | "HasActed";\n' }), "is not read from typeof LEAF_NEEDS");
  has("a ScopedLeafTag that names a tag beside the rows fails", derived({ tag: 'type ScopedLeafTag = { readonly [T in keyof typeof LEAF_NEEDS]: (typeof LEAF_NEEDS)[T]["resourceId"] extends "Never" ? never : T }[keyof typeof LEAF_NEEDS] | "HasCustom";\n' }), 'names a literal other than "Never" and the resourceId column');
  has("no import of the leaf rows fails", derived({ imports: 'import { isResourceScoped } from "./ScopedLeaf.ts";\n' }), "does not import LEAF_NEEDS");
  has("no ScopedPort fails", derived({ scoped: "" }), "declares no type ScopedPort");
  eq("a missing PortAccess.ts is refused", [judgeScopedRoute(undefined).length, judgeScopedDerived(undefined).length], [1, 1]);
  eq("the literal-free files are judged with the route", judgeScoped({ [ACCESS_FILE]: routeFile(), [DERIVATION_FILE]: 'const s = "qadi.acted";' }, ["route"]).length, 1);

  // sixth-port.
  eq("a sixth span row is added to PortSpans", withSixthSpanRow("interface PortSpans {\n  a: 1;\n}\n"), `interface PortSpans {\n${FAKE_SPAN}\n  a: 1;\n}\n`);
  eq("a file with no PortSpans gets no row", withSixthSpanRow("x"), undefined);
  eq("a sixth name is appended after the last member", withSixthName('export const PORT_NAMES = [\n  "A",\n  "B",\n] as const;'), 'export const PORT_NAMES = [\n  "A",\n  "B", "FakePort",\n] as const;');
  eq("a sixth name is appended to a list without a trailing comma", withSixthName('const PORT_NAMES = ["A", "B"] as const;'), 'const PORT_NAMES = ["A", "B", "FakePort"] as const;');
  eq("a file with no tuple gets no sixth name", withSixthName("x"), undefined);
  const desc = "export const attributeResolverPort: D = {\n  span: s,\n  fixture: attributeResolverFromRecord,\n  serving: { a: 1, b: f(2, 3) },\n  last: 1,\n};\n";
  eq("a member is deleted up to its comma", withoutMember(desc, "attributeResolverPort", "fixture"), "export const attributeResolverPort: D = {\n  span: s,\n  \n  serving: { a: 1, b: f(2, 3) },\n  last: 1,\n};\n");
  eq("a member with a bracketed value is deleted whole", withoutMember(desc, "attributeResolverPort", "serving").includes("serving"), false);
  eq("a last member without a comma is deleted to the brace", withoutMember("export const attributeResolverPort = { a: 1, span: s };", "attributeResolverPort", "span"), "export const attributeResolverPort = { a: 1, };");
  eq("a member of another description is not found", withoutMember(desc, "otherPort", "span"), undefined);
  eq("a missing member is not found", withoutMember(desc, "attributeResolverPort", "wire"), undefined);
  const g = (file, code, n = 1) => ({ file, code, n });
  const metricsGroupRow = g(METRICS_FILE, "TS2741");
  const recordedBase = blockGroups(`- tsc: ${METRICS_FILE} TS2741 x1\n- tsc: ${PORTS_FILE} TS2536 x17\n`);
  const baseBlock = `- tsc: ${METRICS_FILE} TS2741 x1\n- tsc: ${PORTS_FILE} TS2536 x17\n`;
  eq("a base set equal to its record passes", judgeSixth("base", baseBlock, [metricsGroupRow, g(PORTS_FILE, "TS2536", 20)]), []);
  eq("the counts of a group are not compared", recordedBase.length, 2);
  has("a group the record lacks fails", judgeSixth("base", baseBlock, [metricsGroupRow, g(PORTS_FILE, "TS2536"), g("x.ts", "TS1")]), "a group the record lacks: x.ts TS1");
  has("a recorded group missing from the run fails", judgeSixth("base", baseBlock, [metricsGroupRow]), `a recorded group is missing from the run: ${PORTS_FILE} TS2536`);
  has("PortMetrics.ts missing from the base set fails", judgeSixth("base", `- tsc: ${PORTS_FILE} TS2536 x1\n`, [g(PORTS_FILE, "TS2536")]), "is not in the base set");
  has("PortMetrics.ts in the close set fails", judgeSixth("close", baseBlock, [metricsGroupRow, g(PORTS_FILE, "TS2536")]), "is in the close set");
  eq("a close set without PortMetrics.ts passes", judgeSixth("close", `- tsc: ${PORTS_FILE} TS2536 x1\n`, [g(PORTS_FILE, "TS2536", 2)]), []);
  has("no recorded block fails", judgeSixth("base", undefined, [metricsGroupRow]), "has no ## sixth-port base block");
  const ev2 = `## sixth-port base\n- tsc: a.ts TS1 x1\n## sixth-port base (spike: end)\n- tsc: b.ts TS2 x1\n## sixth-port close\n- tsc: c.ts TS3 x1\n`;
  eq("the comparison reads the unqualified block and ignores a spike block", [blockGroups(lastBlock(ev2, "sixth-port base"))[0].file, blockGroups(lastBlock(ev2, "sixth-port base (spike: end)"))[0].file], ["a.ts", "b.ts"]);
  const twiceRecorded = `${ev2}## sixth-port base\n- tsc: z.ts TS9 x1\n`;
  eq("a second record of the same heading is the one read, the first stays", [blockGroups(lastBlock(twiceRecorded, "sixth-port base"))[0].file, twiceRecorded.startsWith(ev2)], ["z.ts", true]);
  eq("a member error naming the member passes", judgeMemberVariant("fixture", [{ file: `${CORE}AttributeResolver.ts`, code: "TS2741", text: "error TS2741: Property 'fixture' is missing" }]), []);
  has("a member error at another file fails", judgeMemberVariant("fixture", [{ file: `${CORE}Ports.ts`, code: "TS2741", text: "error TS2741: Property 'fixture' is missing" }]), "reports no error at AttributeResolver.ts naming fixture");
  has("an error at the module that does not name the member fails", judgeMemberVariant("span", [{ file: `${CORE}AttributeResolver.ts`, code: "TS2741", text: "error TS2741: Property 'fixture' is missing" }]), "naming span");

  // spike.
  const patchA = "diff a\n";
  const patchB = "diff b\n";
  const spikeBase = "a".repeat(40);
  const patchFiles = { [`${SPIKE_DIR}a.patch`]: patchA, [`${SPIKE_DIR}b.patch`]: patchB };
  const spikeRow = (chain, patches, madge, tscCell, verdict) => `| ${chain} | ${patches} | ${madge} | ${tscCell} | ${verdict} |`;
  const patchCell = (names) => names.map((n) => `${n}.patch ${sha256(n === "a" ? patchA : patchB)}`).join(", ");
  const spikeFixture = (over = {}) => {
    const files = { ...patchFiles };
    const rows = [];
    for (const chain of CHAINS) {
      const names = chainPatches(chain);
      for (const n of names) {
        files[`${SPIKE_DIR}${n}.patch`] ??= `diff ${n}\n`;
      }
      const cell = names.map((n) => `${n}.patch ${sha256(files[`${SPIKE_DIR}${n}.patch`])}`).join(", ");
      const accept = !["e", "b-alone", "leaf-imports-registry"].includes(chain);
      files[`${SPIKE_DIR}out/${chain}.madge.txt`] = accept ? "✔ No circular dependency found!\n" : "Found 16 circular dependencies!\n";
      files[`${SPIKE_DIR}out/${chain}.tsc.txt`] = accept ? "" : "packages/core/src/PortServing.ts(1,1): error TS2456: x\n";
      rows.push(spikeRow(chain, cell, "ok", "ok", accept ? "**Accept**" : "Rejected"));
    }
    return { md: `# Spike\n\nspike base ${spikeBase}\n\n| chain | patches | madge | tsc | verdict |\n| --- | --- | --- | --- | --- |\n${rows.join("\n")}\n`, files, ...over };
  };
  const spike1 = (mutate) => {
    const f = spikeFixture();
    mutate?.(f);
    return judgeSpike(f.md, (p) => f.files[p]);
  };
  eq("a spike record that agrees passes", spike1(), []);
  eq("a missing verdict file fails", judgeSpike(undefined, () => undefined), [`${SPIKE_MD} does not exist`]);
  has("a missing spike base fails", spike1((f) => (f.md = f.md.replace("spike base", "base"))), "names no spike base sha");
  has("a missing chain row fails", spike1((f) => (f.md = f.md.replace(/^\| f\+g \|.*\n/m, ""))), "has no row for the chain f+g");
  has("rows out of order fail", spike1((f) => (f.md = f.md.replace(/(\| a \|.*\n)(\| a\+b \|.*\n)/, "$2$1"))), "rows are not in the order");
  has("a chain applying another patch than its name fails", spike1((f) => (f.md = f.md.replace(/^\| a\+b \| a\.patch/m, "| a+b | b.patch"))), "the a+b row applies");
  has("a patch whose file is absent fails", spike1((f) => delete f.files[`${SPIKE_DIR}d.patch`]), `${SPIKE_DIR}d.patch does not exist`);
  has("an empty patch fails", spike1((f) => (f.files[`${SPIKE_DIR}d.patch`] = "")), `${SPIKE_DIR}d.patch is empty`);
  has("a patch hash that differs fails", spike1((f) => (f.files[`${SPIKE_DIR}d.patch`] = "changed\n")), "has another sha256");
  has("a patch without its hash fails", spike1((f) => (f.md = f.md.replace(/^(\| e \| e\.patch) [0-9a-f]{64}/m, "$1"))), "names a patch without its sha256");
  has("a missing output file fails", spike1((f) => delete f.files[`${SPIKE_DIR}out/a.madge.txt`]), `${SPIKE_DIR}out/a.madge.txt does not exist`);
  has("a madge cycle stated as accept fails", spike1((f) => (f.files[`${SPIKE_DIR}out/a.madge.txt`] = "Found 2 circular dependencies!\n")), "the a row states accept but its recorded outputs say reject");
  has("a tsc error stated as accept fails", spike1((f) => (f.files[`${SPIKE_DIR}out/a+b.tsc.txt`] = "x.ts(1,1): error TS2322: y\n")), "the a+b row states accept but");
  has("a clean run stated as reject fails", spike1((f) => (f.md = f.md.replace(/^(\| f \|.*\| )\*\*Accept\*\* \|$/m, "$1Rejected |"))), "the f row states reject but its recorded outputs say accept");
  has("a verdict that is neither fails", spike1((f) => (f.md = f.md.replace(/^(\| f \|.*\| )\*\*Accept\*\* \|$/m, "$1maybe |"))), "does not start with accept or reject");
  has("a warning line is not read as no cycle", spike1((f) => (f.files[`${SPIKE_DIR}out/a.madge.txt`] = "(68 warnings)\n")), "the a row states accept but");
  eq("the chains apply their patches in table order", [chainPatches("a+b+c+d"), chainPatches("end"), chainPatches("b-alone"), chainPatches("f+g")], [["a", "b", "c", "d"], ["a", "b", "c", "d", "f", "g"], ["b-alone"], ["f", "g"]]);
  eq("the spike base is read", spikeBaseOf(`Spike base: ${spikeBase}`), spikeBase);
  eq("the rows of a planted table are read in order", spikeRows(`| chain |\n${spikeRow("a", patchCell(["a"]), "m", "t", "Accept")}\n${spikeRow("a+b", patchCell(["a", "b"]), "m", "t", "Accept")}\n`).map((r) => [r.chain, r.patches.map((p) => p.name)]), [["a", ["a"]], ["a+b", ["a", "b"]]]);
  eq("a rerun that agrees passes", judgeRerun("a", { madge: "No circular dependency found", tsc: "x.ts(1,1): error TS1: a\n" }, { madge: "✔ No circular dependency found!", tsc: "x.ts(9,9): error TS1: b\nx.ts(2,2): error TS1: c\n" }), []);
  has("a rerun with another madge verdict fails", judgeRerun("a", { madge: "No circular dependency found", tsc: "" }, { madge: "Found 2 circular dependencies!", tsc: "" }), "madge says Found 2 circular dependencies");
  has("a rerun with a new tsc group fails", judgeRerun("a", { madge: "", tsc: "" }, { madge: "", tsc: "y.ts(1,1): error TS2: a\n" }), "a tsc group the record lacks: y.ts TS2");
  has("a rerun missing a recorded tsc group fails", judgeRerun("a", { madge: "", tsc: "y.ts(1,1): error TS2: a\n" }, { madge: "", tsc: "" }), "a recorded tsc group is missing: y.ts TS2");

  // bench.
  const patchText = "diff routing\n";
  const patchSha = sha256(patchText);
  const fixSha = "f".repeat(40);
  const benchFile = 'test("evaluate", ({ bench }) => {\n  bench("one", () => 1);\n});\n';
  const benchFix = (over = {}) => {
    const p = { name: "routing.patch", fixes: [{ sha: fixSha, paths: [`${BENCH_DIR}routing.patch`, `${BENCH_DIR}routing.patch.sha256`] }], ancestor: true, sidecar: `${patchSha}  routing.patch\n`, atFix: patchText, atHead: patchText, meta: `head: ${fixSha}\npatch_sha256: ${patchSha}\n`, ...over };
    return { md: `# Bench\n\nPatch of record: routing.patch ${patchSha}\n\n# gate: pass\n`, workloads: `${WORKLOAD_KEYS.join("\n")}\nevaluate :: one\n`, record: { name: "routing.patch", analysis: "x\n# gate: pass\n" }, patches: [p], benchAdd: benchFile, benchHead: benchFile };
  };
  const bench1 = (mutate, pass = false) => {
    const f = benchFix();
    mutate?.(f);
    return judgeBench(f, pass);
  };
  eq("a bench record that agrees passes, with and without --pass", [bench1(), bench1(undefined, true)], [[], []]);
  has("a meta head that is not the fixing commit fails", bench1((f) => (f.patches[0].meta = `head: ${"e".repeat(40)}\npatch_sha256: ${patchSha}\n`)), "meta.txt says head");
  has("a meta hash that differs from the sidecar fails", bench1((f) => (f.patches[0].meta = `head: ${fixSha}\npatch_sha256: ${"0".repeat(64)}\n`)), "meta.txt says patch_sha256");
  has("a fixing commit holding a third path fails", bench1((f) => f.patches[0].fixes[0].paths.push("x")), "not exactly");
  has("a patch at HEAD that differs from its fixing commit fails", bench1((f) => (f.patches[0].atHead = "changed\n")), "at HEAD does not hash");
  has("a patch at its fixing commit that differs from the sidecar fails", bench1((f) => (f.patches[0].atFix = "changed\n")), "at its fixing commit does not hash");
  has("no fixing commit fails", bench1((f) => (f.patches[0].fixes = [])), "0 commits since phase_base have the subject");
  has("a fixing commit after the record commit fails", bench1((f) => (f.patches[0].ancestor = false)), "is not an ancestor");
  has("a sidecar with no hash fails", bench1((f) => (f.patches[0].sidecar = "nope")), "holds no sha256");
  has("a record that does not state the patch hash fails", bench1((f) => (f.md = f.md.replace(patchSha, "x"))), "does not state the sha256");
  has("a record that does not name the patch fails", bench1((f) => (f.md = f.md.replace("routing.patch", "other"))), "does not name the measured patch routing.patch");
  has("a stated verdict that disagrees with the analysis fails", bench1((f) => (f.md = f.md.replace("# gate: pass", "# gate: fail"))), "states the verdict fail, the analysis says pass");
  has("an analysis with no gate line fails", bench1((f) => (f.record.analysis = "x\n")), "has no # gate: line");
  has("--pass over a failed gate fails", bench1((f) => { f.md = f.md.replace("# gate: pass", "# gate: fail"); f.record.analysis = "# gate: fail\n"; }, true), "is fail, not pass");
  eq("a failed gate passes without --pass", bench1((f) => { f.md = f.md.replace("# gate: pass", "# gate: fail"); f.record.analysis = "# gate: fail\n"; }), []);
  has("a missing record file fails", bench1((f) => (f.md = undefined)), `${BENCH_MD} does not exist`);
  has("a missing workload key fails", bench1((f) => (f.workloads = WORKLOAD_KEYS[0])), `does not name ${WORKLOAD_KEYS[1]}`);
  has("a duplicated workload key fails", bench1((f) => (f.workloads += `${WORKLOAD_KEYS[0]}\n`)), "twice");
  has("a bench file that differs from its adding commit fails", bench1((f) => (f.benchHead += "x")), "differs from its text at the commit");
  has("no adding commit fails", bench1((f) => (f.benchAdd = undefined)), "no commit has the subject");
  eq("the last gate line of a text is read", [lastGate("# gate: fail\nx\n# gate: pass\n"), lastGate("x"), lastGate(undefined)], ["pass", undefined, undefined]);
  eq("a meta.txt is read by its fields", metaOf("head: abc\npatch_sha256: def\nnote\n"), { head: "abc", patch_sha256: "def" });
  eq("the keys of a bench file are its titles and names", benchKeys('test("a — b", async ({ bench }) => {\n  bench("one", f);\n  await bench(\'two\', g);\n});\ntest("c", () => {\n  bench("three", h);\n});'), ["a — b :: one", "a — b :: two", "c :: three"]);
  eq("workload keys equal to the declared keys pass", judgeWorkloads(`${WORKLOAD_KEYS.join("\n")}\n`, WORKLOAD_KEYS), []);
  has("a key the bench file does not declare fails", judgeWorkloads(`${WORKLOAD_KEYS.join("\n")}\nx :: y\n`, WORKLOAD_KEYS), "which the bench file does not declare");
  has("a declared key the file does not name fails", judgeWorkloads(`${WORKLOAD_KEYS.join("\n")}\n`, [...WORKLOAD_KEYS, "x :: y"]), "which workloads.txt does not name");
  has("a key declared twice fails", judgeWorkloads(`${WORKLOAD_KEYS.join("\n")}\n`, [...WORKLOAD_KEYS, WORKLOAD_KEYS[0]]), "declares");
  has("a missing workloads file fails", judgeWorkloads(undefined, []), "workloads.txt does not exist");
  const reviewText = "diff review\n";
  const reviewSha = sha256(reviewText);
  const reviewFix = "e".repeat(40);
  const withReview = (over = {}) => {
    const f = benchFix();
    f.patches.push({ name: REVIEW_PATCH, fixes: [{ sha: reviewFix, paths: [`${BENCH_DIR}${REVIEW_PATCH}`, `${BENCH_DIR}${REVIEW_PATCH}.sha256`] }], ancestor: true, sidecar: `${reviewSha}  ${REVIEW_PATCH}\n`, atFix: reviewText, atHead: reviewText, meta: `head: ${reviewFix}\npatch_sha256: ${reviewSha}\n`, ...over });
    f.record = { name: REVIEW_PATCH, analysis: "y\n# gate: pass\n" };
    f.md = `${f.md}\n## Review gate\n\nPatch of record: ${REVIEW_PATCH} ${reviewSha}\n\n# gate: pass\n`;
    return f;
  };
  eq("a review gate of record beside the first, both named and hashed, passes with --pass", judgeBench(withReview(), true), []);
  has("a review record that drops the first patch's hash fails", judgeBench(((f) => ((f.md = f.md.replace(patchSha, "x")), f))(withReview()), true), "does not state the sha256 of routing.patch");
  has("a review record that does not hash its own patch fails", judgeBench(((f) => ((f.md = f.md.replace(reviewSha, "x")), f))(withReview()), true), `does not state the sha256 of ${REVIEW_PATCH}`);
  has("a review patch fixed after its record commit fails", judgeBench(withReview({ ancestor: false }), true), `is not an ancestor of the commit ${RECORD_SUBJECTS[REVIEW_PATCH]}`);
  has("a review gate that failed fails --pass", judgeBench(((f) => ((f.record.analysis = "# gate: fail\n"), (f.md = f.md.replace(/# gate: pass\n$/, "# gate: fail\n")), f))(withReview()), true), "is fail, not pass");

  // routing-landed.
  const baseAccess = "const a = isResourceScoped(leaf) ? 1 : 2;\n// c\nconst b = isResourceScoped(leaf) ? 3 : 4;\n";
  const routed = "const a = readScoped(leaf);\nconst b = readScoped(leaf); /* c */\n";
  const landedFacts = (over = {}) => ({ gate: "pass", commits: [{ sha: "x" }], atCommit: { [ACCESS_FILE]: routed }, atHead: { [ACCESS_FILE]: routed }, expected: { [ACCESS_FILE]: "const a = readScoped(leaf);\nconst b = readScoped(leaf);\n" }, accessAtHead: routed, ...over });
  eq("a landed routing equal to the patch of record passes, comments ignored", judgeRouting(landedFacts()).bad, []);
  has("a landed routing that differs at the commit fails", judgeRouting(landedFacts({ atCommit: { [ACCESS_FILE]: "x" } })).bad, "at the routing commit is not the base with the patch");
  has("a landed routing that differs at HEAD fails", judgeRouting(landedFacts({ atHead: { [ACCESS_FILE]: "x" } })).bad, "at HEAD is not the base with the patch");
  has("a passing gate with no routing commit fails", judgeRouting(landedFacts({ commits: [] })).bad, "0 commits since phase_base have the subject");
  eq("a failed gate with both ternaries and no commit is not landed", judgeRouting({ gate: "fail", commits: [], accessAtHead: baseAccess }), { bad: [], line: "routing-landed: not landed; the gate of record failed" });
  has("a failed gate with a routing commit fails", judgeRouting({ gate: "fail", commits: [{}], accessAtHead: baseAccess }).bad, "exists although the gate");
  has("a failed gate with a ternary gone fails", judgeRouting({ gate: "fail", commits: [], accessAtHead: routed }).bad, "no longer holds both");
  const needs = "const a = readScoped(leaf); // need\n";
  const reviewFacts = (over = {}, top = {}) => landedFacts({ atHead: { [ACCESS_FILE]: needs }, review: { gate: "pass", fixes: [{ sha: "f" }], commits: [{ sha: "r" }], atCommit: { [ACCESS_FILE]: needs }, expected: { [ACCESS_FILE]: "const a = readScoped(leaf);\n" }, ...over }, ...top });
  eq("a review routing equal to its patch at its commit and at HEAD passes, the first landing judged at its commit only", judgeRouting(reviewFacts()), { bad: [], line: "routing-landed: the first routing equals its patch of record at its commit, and the review routing equals its patch at its commit and at HEAD" });
  has("a review routing that differs at its commit fails", judgeRouting(reviewFacts({ atCommit: { [ACCESS_FILE]: "x" } })).bad, "at the review routing commit is not the fixing commit's text");
  has("a review routing that differs at HEAD fails", judgeRouting(reviewFacts({}, { atHead: { [ACCESS_FILE]: "x" } })).bad, "at HEAD is not the fixing commit's text");
  has("a review gate with no review routing commit fails", judgeRouting(reviewFacts({ commits: [] })).bad, `0 commits since phase_base have the subject ${REVIEW_ROUTING_SUBJECT}`);
  has("a review patch fixed by two commits fails", judgeRouting(reviewFacts({ fixes: [{}, {}] })).bad, "2 commits since phase_base have the subject chore(90-review)");
  has("the first landing that differs at its commit still fails beside a review", judgeRouting(reviewFacts({}, { atCommit: { [ACCESS_FILE]: "x" } })).bad, "at the routing commit is not the base");
  eq("a failed review gate with no review commit leaves the first landing", judgeRouting(reviewFacts({ gate: "fail", commits: [] })).line, "routing-landed: the first routing landed as its patch of record; the review routing did not land");
  has("a failed review gate with a review commit fails", judgeRouting(reviewFacts({ gate: "fail" })).bad, "exists although the review gate is fail");
  has("a fixed review patch with no analysis fails", judgeRouting(reviewFacts({ gate: undefined, commits: [] })).bad, "has no analysis with a # gate: line");
  has("no gate of record fails", judgeRouting({ gate: undefined }).bad, "no gate of record");

  // close.
  const children = [{ label: "a", argv: ["a"] }, { label: "b", argv: ["b"] }];
  eq("a child list all exiting 0 passes", runChildren(children, () => ({ code: 0, last: "ok" })), { lines: ["a: exit 0: ok", "b: exit 0: ok"], bad: [] });
  eq("a child exiting 1 fails and is named", runChildren(children, (argv) => ({ code: argv[0] === "b" ? 1 : 0, last: "x" })).bad, ["b exited 1"]);
  eq("an empty child list fails", runChildren([], () => ({ code: 0, last: "" })).bad, ["the child list is empty"]);
  eq("the child list is not empty and names the phase's checks", [closeChildren(true).length > 0, closeChildren(false).length === closeChildren(true).length - 1, closeChildren(true).some((c) => c.label.includes("sixth-port close"))], [true, true, true]);
  eq("the close requires every review-round test file seen failing", REVIEW_TESTS.map((f) => closeChildren(true).some((c) => c.label === `90-check.mjs seen-failing ${f}`)), REVIEW_TESTS.map(() => true));
  eq("the no-release facts at their base pass", judgeNoRelease({ versions: [{ file: "p", base: "1", now: "1" }], changelogs: [], tags: [], milestones: [] }), []);
  eq("a moved version fails", judgeNoRelease({ versions: [{ file: "p", base: "1", now: "2" }], changelogs: [], tags: [], milestones: [] }).length, 1);
  eq("a changed changelog, a tag at HEAD and a milestone path each fail", judgeNoRelease({ versions: [], changelogs: ["c"], tags: ["v1"], milestones: ["m"] }).length, 3);

  if (failures.length > 0) fail(failures);
  console.log(`self-test: ${passed} passed`);
};

const [mode, ...args] = process.argv.slice(2);
// Run as a script, not when a judge is imported from another file.
if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (realpathSync(process.cwd()) !== realpathSync(git("rev-parse", "--show-toplevel").trim())) fail(["run this from the repository root"]);
  if (!PHASE_DIR.startsWith("QD-90-")) fail([`${SELF} is not in a QD-90- directory`]);
  if (mode === undefined || !Object.hasOwn(MODES, mode)) fail([`usage: node 90-check.mjs ${Object.keys(MODES).join("|")}`]);
  else await MODES[mode](args);
}
