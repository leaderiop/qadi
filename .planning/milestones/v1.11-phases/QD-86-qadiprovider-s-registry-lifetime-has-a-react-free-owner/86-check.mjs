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
//   owner-shape                              RegistryOwner.ts is React-free closure state behind one factory, composes the lease
//                                            by reference and reaches the registry only as the lifetime rules allow, is out of
//                                            the barrel, and stryker.react.mjs mutates it beside the lease and never the provider
//   provider-forwards-only                   QadiProvider.tsx builds the owner once and holds four effects: the commit first, the
//                                            two instrumentation effects, the hold and release last, with no lifetime branch
//   records [--close]                        the pinned-by lists name tests that exist; --close also needs every reserved
//                                            record written
//   --self-test                              drives every judge with planted text
// Shortcuts: the comment and string blanking does not understand regex literals, `any` is read by the token before it,
// and a module-scope string literal is read by brace and parenthesis depth, a line holding `=>` taken as a function body
// and a type declaration skipped, so a literal inside a module-scope object literal is left to the mutation compare; a
// false positive is cleared by rewording the line, never by weakening a judge. The phase modes read source text with
// comments and strings blanked and match its shapes by pattern, so a reworded declaration that keeps the same meaning
// can need the pattern widened; that is a reviewed edit to this file, never a reason to skip the mode. A module-scope
// statement ends at a `;` outside every bracket or, for a function, interface, class or enum, at the brace that closes
// its body, so a function whose return type is a literal object type is read wrongly: reword the declaration. An effect
// is read as the text of its `useEffect(...)` call, its dependency list the last bracket pair before the closing
// parenthesis.
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, realpathSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

/** This script's own directory, relative to the repository root, with a trailing slash. */
const D = `${relative(process.cwd(), dirname(fileURLToPath(import.meta.url)))}/`;
const EVIDENCE = `${D}86-RED-EVIDENCE.md`;
const SUMMARY = `${D}86-01-SUMMARY.md`;
/** The one trailer every plan commit ends with: the project owner's line, and no other Claude name is accepted. */
const TRAILER = "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>";
const PLAN_SUBJECT = /^[a-z]+[(]86-[0-9]{2}[)]!?: /;
const GUARDED = ["AGENTS.md", "scripts/check-house-style.mjs", ".oxlintrc.json"];
/** HEAD at the start of planning, fixed: every comparison with the base reads this commit. */
const PHASE_BASE = "41c53c65c3ceb60f974650dd374f391c81db56e7";

const fail = (lines) => {
  console.error(lines.join("\n"));
  process.exit(1);
};
const git = (...args) => execFileSync("git", args, { encoding: "utf8", maxBuffer: 1 << 28 });
const sorted = (xs) => [...xs].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
const scratch = () => join(realpathSync(process.env.TMPDIR || "/tmp"), "qd86");

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
  [/(?<![\w.-])86-\d{2}(?!\d)/, "a plan id"],
  [/\bPREG-0\d\b/, "a requirement id"],
  [/\bWX-0\d\b/, "a requirement id"],
  [/(?<!(?:ADR|CCR|BEH|INV|ARCH)-)\bQD-86\b/, "a phase id"],
  [/\b[Pp]hase 86\b/, "a phase number"],
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

const isSrc = (file) => /^packages\/react\/src\/.*\.(?:ts|tsx|mts)$/.test(file);
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
        if (entry.file.startsWith("packages/react/src/") && depth[n - 1] === 0 && parens[n - 1] === 0 && /["'`]/.test(line) && !covered.has(n) && !line.includes("=>") && !/^\s*(?:export\s+)?(?:type|interface|declare)\b/.test(line) && raw[n - 1] !== '"use client";') note("a module-scope string literal");
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
const OWNER = "packages/react/src/RegistryOwner.ts";
const LEASE = "packages/react/src/RegistryLease.ts";
const PROVIDER = "packages/react/src/QadiProvider.tsx";
const BARREL = "packages/react/src/index.ts";
const STRYKER = "stryker.react.mjs";
const BEHAVIORS = "spec/behaviors/09-react.md";
const OWNER_TEST = "packages/react/test/RegistryOwner.test.ts";

const collapse = (s) => s.replace(/\s+/g, " ").trim();
const count = (code, re) => [...code.matchAll(re)].length;

/** The text spans of every `useEffect(...)` (also layout and insertion) call in blanked code, as [start, end). */
export const effectSpans = (code) => {
  const spans = [];
  for (const m of code.matchAll(/\buse(?:Layout|Insertion)?Effect\s*\(/g)) {
    const open = m.index + m[0].length - 1;
    let depth = 0;
    for (let i = open; i < code.length; i++) {
      depth += code[i] === "(" ? 1 : code[i] === ")" ? -1 : 0;
      if (depth === 0) {
        spans.push([open, i + 1]);
        break;
      }
    }
  }
  return spans;
};

/** Every `export [type] { ... } from "<spec>"` statement of comment-free text (strings kept), as `{ spec, names }`. */
export const reexportsOf = (text) =>
  [...text.matchAll(/^[ \t]*export\s+(?:type\s+)?\{([^}]*)\}\s*from\s*(["'])([^"']+)\2/gm)].map((m) => ({
    spec: m[3],
    names: m[1].split(",").map((s) => s.trim().replace(/^type\s+/, "").split(/\s+as\s+/)[0]).filter((s) => s !== ""),
  }));

/** Names of what an export statement of comment-free text (strings kept) puts out under `RegistryOwner` or `makeRegistryOwner`. */
const exportsNamingOwner = (text) => {
  const hits = [];
  for (const m of text.matchAll(/^[ \t]*export\s+(?:type\s+)?\{([^}]*)\}/gm)) if (/\b(?:makeRegistryOwner|RegistryOwner)\b/.test(m[1])) hits.push(collapse(m[0]));
  for (const m of text.matchAll(/^[ \t]*export\s+(?:declare\s+)?(?:const|let|var|function|class|interface|type|enum)\s+(?:makeRegistryOwner|RegistryOwner)\b/gm)) hits.push(collapse(m[0]));
  for (const m of text.matchAll(/^[ \t]*export\s*\*[^;]*RegistryOwner/gm)) hits.push(collapse(m[0]));
  return hits;
};

const OWNER_IMPORTS = ["@qadi/core", "effect/reactivity/AtomRegistry", "./HydrationEngine.ts", "./QadiAtoms.ts", "./RegistryLease.ts"];
const OWNER_BANNED = [
  [/\bscheduleTask\b/, "scheduleTask"],
  [/\bdefaultIdleTTL\b/, "defaultIdleTTL"],
  [/\.dispose\s*\(/, ".dispose("],
  [/sweep/i, "a sweep"],
  [/\bsetTimeout\b/, "setTimeout"],
  [/\bMatch\b/, "Match"],
  [/\bswitch\b/, "switch"],
  [/\.bind\s*\(/, ".bind("],
  [/\bregistry\.get\s*\(/, "registry.get("],
];

/**
 * Reasons the registry's lifetime is not kept by one React-free module. `owner` is the text of `RegistryOwner.ts` or
 * undefined; `barrel`, `provider` and `stryker` are the texts of `src/index.ts`, `QadiProvider.tsx` and
 * `stryker.react.mjs`. Every test of code is on text with comments and strings blanked; the import specifiers and the
 * mutate list are read with only comments blanked. Pure.
 */
export const judgeOwnerShape = ({ owner, barrel, provider, stryker }) => {
  const bad = [];
  if (owner === undefined) bad.push("RegistryOwner.ts is missing");
  else {
    const code = blank(owner);
    for (const { spec, line } of importsOf(blank(owner, true))) {
      if (!OWNER_IMPORTS.includes(spec)) bad.push(`${OWNER}:${line} imports ${spec}, not only ${OWNER_IMPORTS.join(", ")}`);
    }
    if (/\b(?:import|require)\s*\(/.test(code)) bad.push(`${OWNER} loads a module by a call`);
    let decls = 0;
    for (const { text, line } of topLevel(code)) {
      const t = collapse(text);
      if (/^import\b/.test(t) || /^(?:export )?(?:declare )?(?:type|interface)\b/.test(t)) continue;
      if (/^export function makeRegistryOwner\s*\(/.test(t)) decls++;
      else if (/^export const makeRegistryOwner\s*=/.test(t)) {
        decls++;
        if (!/^export const makeRegistryOwner\s*=\s*\([\s\S]*?\)\s*:\s*RegistryOwner\s*=>\s*\{/.test(t)) bad.push(`${OWNER}:${line} makeRegistryOwner is not a block-bodied arrow whose header ends "): RegistryOwner => {"`);
      } else bad.push(`${OWNER}:${line} holds a module-scope statement that is not an import, a type or makeRegistryOwner: ${t.slice(0, 60)}`);
    }
    if (decls !== 1) bad.push(`${OWNER} declares makeRegistryOwner ${decls} times, not once`);
    const must = (re, n, what) => {
      const got = count(code, re);
      if (got !== n) bad.push(`${OWNER} has ${got} ${what}, not ${n}`);
    };
    must(/\bAtomRegistry\.make\s*\(/g, 1, "AtomRegistry.make( calls");
    must(/(?<![\w$.])makeRegistryLease\s*\(/g, 1, "makeRegistryLease( calls");
    must(/\bregistry\.reset\s*\(\s*\)/g, 1, "registry.reset() calls");
    must(/\bregistry\.set\s*\(/g, 2, "registry.set( calls");
    if (!/\bhold\s*:\s*lease\.hold\b(?!\s*[(.])/.test(code)) bad.push(`${OWNER} does not forward hold: lease.hold by reference`);
    if (!/\brelease\s*:\s*lease\.release\b(?!\s*[(.])/.test(code)) bad.push(`${OWNER} does not forward release: lease.release by reference`);
    for (const [re, what] of OWNER_BANNED) if (re.test(code)) bad.push(`${OWNER} names ${what}`);
  }
  bad.push(...exportsNamingOwner(blank(provider, true)).map((h) => `${PROVIDER} exports the owner: ${h}`));
  if (/\b(?:makeRegistryOwner|RegistryOwner)\b/.test(blank(barrel, true))) bad.push(`${BARREL} names the owner: it stays out of the barrel`);
  const mutate = /\bmutate\s*:\s*\[([\s\S]*?)\]/.exec(blank(stryker, true))?.[1];
  if (mutate === undefined) bad.push(`${STRYKER} has no readable mutate list`);
  else {
    if (!mutate.includes(`"${OWNER}"`)) bad.push(`${STRYKER} does not mutate RegistryOwner.ts`);
    if (!mutate.includes(`"${LEASE}"`)) bad.push(`${STRYKER} does not mutate RegistryLease.ts`);
    if (/QadiProvider\.tsx/.test(mutate)) bad.push(`${STRYKER} mutates QadiProvider.tsx, which holds no lifetime branch and renders`);
  }
  return bad;
};

const PROVIDER_FORBIDDEN = [
  "registryRef",
  "atomsIdentityRef",
  "latestRef",
  "leaseRef",
  "makeRegistryLease",
  "RegistryLease",
  "scheduleTask",
  "defaultIdleTTL",
  "setTimeout",
].map((name) => [new RegExp(`\\b${name}\\b`), name]);
const PROVIDER_FORBIDDEN_CALLS = [
  [/\bAtomRegistry\.make\b/, "AtomRegistry.make"],
  [/\.reset\s*\(/, ".reset("],
  [/\.dispose\s*\(/, ".dispose("],
  [/\bregistry\.set\s*\(/, "registry.set("],
  [/\bregistry\.get\s*\(/, "registry.get("],
];
const EFFECT_BRANCHES = [
  [/\bif\b/, "if"],
  [/\?/, "?"],
  [/&&/, "&&"],
  [/\|\|/, "||"],
  [/\btry\b/, "try"],
];
const REEXPORTS = [
  ["./HydrationEngine.ts", ["InitialValues"]],
  ["./MissingQadiProviderError.ts", ["MissingQadiProviderError"]],
  ["./DeveloperSignals.ts", ["ProviderSignal", "ProviderSignalReporter"]],
];

/**
 * Reasons `QadiProvider.tsx` holds more than a forward to the owner. `provider` is its text. The order the effects run
 * in is the one thing no render shows while nothing throws, so it is held here: the commit effect first, the two
 * instrumentation effects between, the hold and its release in the last effect, none of them holding a branch.
 */
export const judgeProviderForwardsOnly = (provider) => {
  const bad = [];
  const code = blank(provider);
  const effects = count(code, /\buseEffect\s*\(/g);
  if (effects !== 4) bad.push(`${PROVIDER} has ${effects} useEffect calls, not 4`);
  const refs = count(code, /\buseRef\s*(?:<[^()]*>)?\s*\(/g);
  if (refs !== 3) bad.push(`${PROVIDER} has ${refs} useRef calls, not 3`);
  const memos = count(code, /\buseMemo\s*\(/g);
  if (memos !== 3) bad.push(`${PROVIDER} has ${memos} useMemo calls, not 3`);
  for (const hook of ["useLayoutEffect", "useInsertionEffect", "useState"]) if (new RegExp(`\\b${hook}\\b`).test(code)) bad.push(`${PROVIDER} names ${hook}`);
  if (count(code, /\bownerRef\.current\s*\?\?=\s*makeRegistryOwner\s*\(/g) !== 1) bad.push(`${PROVIDER} does not build the owner once, as ownerRef.current ??= makeRegistryOwner(`);
  if (count(code, /(?<![\w$.])makeRegistryOwner\s*\(/g) !== 1) bad.push(`${PROVIDER} calls makeRegistryOwner( other than once`);
  for (const [re, what] of [...PROVIDER_FORBIDDEN, ...PROVIDER_FORBIDDEN_CALLS]) if (re.test(code)) bad.push(`${PROVIDER} names ${what}, which the owner keeps`);
  if (!/\bowner\.registry\b/.test(code)) bad.push(`${PROVIDER} does not read owner.registry`);
  const spans = effectSpans(code);
  if (spans.length === 4) {
    const parts = spans.map(([a, b]) => {
      const text = code.slice(a, b);
      const m = /,\s*\[([^\]]*)\]\s*\)$/.exec(text);
      return { a, b, body: m === null ? text : text.slice(0, m.index), deps: m === null ? undefined : m[1].split(",").map((s) => s.trim()).filter((s) => s !== "").join(",") };
    });
    const [first, , , last] = parts;
    if (!/\bowner\.commit\s*\(/.test(first.body)) bad.push(`${PROVIDER}: the first effect does not call owner.commit(`);
    if (first.deps !== "owner,atoms,subject") bad.push(`${PROVIDER}: the first effect depends on [${first.deps}], not [owner, atoms, subject]`);
    if (!/\bowner\.hold\s*\(\s*\)/.test(last.body) || !/\breturn\s*\(\s*\)\s*=>\s*owner\.release\s*\(\s*\)/.test(last.body)) bad.push(`${PROVIDER}: the last effect does not call owner.hold() and return () => owner.release()`);
    if (last.deps !== "owner") bad.push(`${PROVIDER}: the last effect depends on [${last.deps}], not [owner]`);
    for (const [name, re] of [["hold", /\.hold\s*\(/g], ["release", /\.release\s*\(/g]]) {
      const hits = [...code.matchAll(re)];
      if (hits.length !== 1 || hits[0].index < last.a || hits[0].index >= last.b) bad.push(`${PROVIDER}: .${name}( does not occur once, in the last effect alone (found ${hits.length})`);
    }
    for (const name of ["instrumentedInProduction", "unwritableGateRegistry"]) {
      const at = code.search(new RegExp(`\\bproviderSignals\\.${name}\\s*\\(`));
      if (at < 0 || !parts.slice(1, 3).some((p) => at >= p.a && at < p.b)) bad.push(`${PROVIDER}: providerSignals.${name}( is not in an effect between the commit and the hold`);
    }
    for (const [which, p] of [["first", first], ["last", last]]) {
      for (const [re, what] of EFFECT_BRANCHES) if (re.test(p.body)) bad.push(`${PROVIDER}: the ${which} effect holds ${what}, a branch of lifetime logic`);
    }
  }
  const text = blank(provider, true);
  if (/^[ \t]*import\s+\*\s+as\s+AtomRegistry\b/m.test(text) || !/^[ \t]*import\s+type\s+\*\s+as\s+AtomRegistry\b/m.test(text)) bad.push(`${PROVIDER} does not import AtomRegistry as a type only (import type * as AtomRegistry)`);
  const imports = importsOf(text);
  if (!imports.some((i) => i.spec === "./RegistryOwner.ts" && i.names.includes("makeRegistryOwner"))) bad.push(`${PROVIDER} does not import makeRegistryOwner from ./RegistryOwner.ts`);
  if (imports.some((i) => /RegistryLease/.test(i.spec))) bad.push(`${PROVIDER} imports from RegistryLease.ts`);
  const reexports = reexportsOf(text);
  for (const [spec, names] of REEXPORTS) {
    if (!reexports.some((r) => r.spec === spec && names.every((n) => r.names.includes(n)))) bad.push(`${PROVIDER} no longer re-exports ${names.join(", ")} from ${spec}`);
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

/** The behaviors whose pinned-by paragraph `records` reads; the first four exist today and must stay. */
const PINNED = [747, 748, 749, 750, 766, 767];
const PINNED_KEPT = [747, 748, 749, 750];
/** The records the phase reserved: written, and named unused. */
const NEW_BEHAVIORS = [766, 767];
const UNUSED_BEHAVIORS = [768, 769, 770];
const NEW_INVARIANTS = [417, 418];

/** The row ids a pinned-by segment names: `RL1 to RL10` expanded, and each `(RL1` or `; RL1` opener. */
const rowsOf = (seg) => {
  const rows = new Set();
  for (const r of seg.matchAll(/(?<![\w-])([A-Z]{1,3})([0-9]+) to \1([0-9]+)(?![\w-])/g)) {
    for (let k = Number(r[2]); k <= Number(r[3]); k++) rows.add(`${r[1]}${k}`);
  }
  for (const r of seg.matchAll(/[(;]\s*([A-Z]{1,3}[0-9]+)(?![\w-])/g)) rows.add(r[1]);
  return rows;
};

/** The pinned-by paragraph of a behavior section: from `Pinned by` to the next blank line, or "". */
const pinnedPara = (section) => /Pinned by[\s\S]*?(?:\n\s*\n|$)/.exec(section)?.[0] ?? "";

/** Reasons a behavior's pinned-by paragraph names a test file or a title that does not exist. `tests(path)` reads a file. */
const judgePinned = (behaviors, n, tests) => {
  const section = sectionOf(behaviors, `BEH-QD-${n}:`);
  if (section === undefined) return PINNED_KEPT.includes(n) ? [`BEH-QD-${n} has no heading in ${BEHAVIORS}`] : [];
  const para = pinnedPara(section);
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
    for (const row of rowsOf(seg)) {
      if (!titles.some((t) => t.startsWith(row) && !/[A-Za-z0-9]/.test(t[row.length] ?? ""))) bad.push(`BEH-QD-${n} names row ${row} for ${file}, which no title opens`);
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
  for (const n of UNUSED_BEHAVIORS) {
    if (sectionOf(behaviors, `BEH-QD-${n}:`) !== undefined) bad.push(`BEH-QD-${n} has a heading in ${BEHAVIORS}, and the phase names it unused`);
  }
  for (const n of [747, 748, 749, 750]) {
    const first = /`(packages\/[^`\s]+\.(?:tsx?|mts))`/.exec(pinnedPara(sectionOf(behaviors, `BEH-QD-${n}:`) ?? ""))?.[1];
    if (first !== OWNER_TEST) bad.push(`BEH-QD-${n}'s Pinned by paragraph names ${first ?? "no test file"} first, not ${OWNER_TEST}`);
  }
  const two = sectionOf(trace, "§2 ") ?? "";
  for (const n of NEW_INVARIANTS) {
    if (!new RegExp(`^## INV-QD-${n}:`, "m").test(close.invariants)) bad.push(`INV-QD-${n} has no heading in spec/invariants.md`);
    if (!new RegExp(`^\\| \\[INV-QD-${n}\\]`, "m").test(two)) bad.push(`INV-QD-${n} has no row in spec/traceability.md §2`);
  }
  for (const [n, mustNotName] of [[409, undefined], [410, "registryRef"]]) {
    const source = /^\*\*Source\*\*:.*$/m.exec(sectionOf(close.invariants, `INV-QD-${n}:`) ?? "")?.[0];
    if (source === undefined) bad.push(`INV-QD-${n} has no **Source**: line`);
    else {
      if (!source.includes("RegistryOwner.ts")) bad.push(`the **Source**: line of INV-QD-${n} does not name RegistryOwner.ts`);
      if (mustNotName !== undefined && source.includes(mustNotName)) bad.push(`the **Source**: line of INV-QD-${n} still names ${mustNotName}`);
    }
  }
  const adr = close.decisions.find((d) => /(?:^|\/)199-[^/]*[.]md$/.test(d.file));
  if (adr === undefined) bad.push("spec/decisions/199-*.md does not exist");
  else {
    if (!adr.text.includes("QADI-ADR-199")) bad.push("the ADR-QD-199 file does not carry QADI-ADR-199");
    const lines = adr.text.split("\n");
    if (!lines.some((l) => l.includes("registry.refresh") && /\bsubject\b/.test(l))) bad.push("the ADR-QD-199 file has no sentence naming registry.refresh and the subject it keeps");
    const at = lines.findIndex((l) => l.trim() === "Tests removed: 0.");
    if (at < 0) bad.push("the ADR-QD-199 file has no line `Tests removed: 0.`");
    else {
      let k = at - 1;
      while (k >= 0 && lines[k].trim() === "") k--;
      if (k < 0 || !lines[k].trimStart().startsWith("|")) bad.push("the line `Tests removed: 0.` does not follow the render-suite audit table");
    }
  }
  if (!/^\s*-\s*id:\s*"ADR-QD-199"/m.test(close.index)) bad.push("spec/decisions/index.yaml has no ADR-QD-199 entry");
  if (!/^\| \[ADR-QD-199\]/m.test(sectionOf(trace, "§3 ") ?? "")) bad.push("ADR-QD-199 has no row in spec/traceability.md §3");
  const earlier = close.decisions.find((d) => /(?:^|\/)195-[^/]*[.]md$/.test(d.file));
  if (earlier === undefined) bad.push("spec/decisions/195-*.md does not exist");
  else {
    if (!/^>\s*\|\s*Revision\s*\|\s*1\.4\s*\|/m.test(earlier.text)) bad.push("ADR-QD-195 is not at Revision 1.4");
    if (!earlier.text.includes("ADR-QD-199")) bad.push("ADR-QD-195 does not name ADR-QD-199");
  }
  const ccr = /^\| CCR-QD-478 \|.*$/m.exec(close.readme);
  if (ccr === null) bad.push("spec/README.md has no CCR-QD-478 row");
  else {
    if (!ccr[0].includes("ARCH-133")) bad.push("the CCR-QD-478 row does not name ARCH-133");
    if (!ccr[0].includes("Unused: BEH-QD-768, BEH-QD-769, BEH-QD-770")) bad.push("the CCR-QD-478 row does not say Unused: BEH-QD-768, BEH-QD-769, BEH-QD-770");
  }
  return bad;
};

/**
 * Reasons the records name tests that do not exist, and with `close` every reserved record is not written. `trace` and
 * `behaviors` are the texts of `spec/traceability.md` and `spec/behaviors/09-react.md`; `tests(path)` is a test file's
 * text or undefined; `close` is undefined or `{ invariants, decisions: [{ file, text }], index, readme }`.
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
  "owner-shape": () => {
    const owner = existsSync(OWNER) ? readText(OWNER) : undefined;
    return done(judgeOwnerShape({ owner, barrel: readText(BARREL), provider: readText(PROVIDER), stryker: readText(STRYKER) }), "owner-shape: the registry's lifetime is kept by one React-free module");
  },
  "provider-forwards-only": () => done(judgeProviderForwardsOnly(readText(PROVIDER)), "provider-forwards-only: the provider builds the owner once and only forwards to it"),
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
  for (const line of ["// D-49 says", "see 86-03", "PREG-02 holds", "WX-05", "QD-86 closes", "Phase 86 added", "phase 86", "ADR-QD-NEXT", "x BEH-QD-NEXT y"]) {
    eq(`${line} is flagged`, judgeIds([idEntry("packages/devtools/src/a.ts", line)]).length, 1);
  }
  for (const line of ["ADR-QD-199", "INV-QD-417", "BEH-QD-766", "D-49-a", "CCR-QD-478", "ARCH-133", "ADR-QD-86", "a 1286-03x", "x186-03"]) {
    eq(`${line} is not flagged`, judgeIds([idEntry("packages/devtools/src/a.ts", line)]), []);
  }
  for (const line of ["this phase", "Until Now", "any more", "no longer", "from now on"]) {
    eq(`${line} is flagged in source`, judgeIds([idEntry("packages/devtools/src/a.ts", line)]).length, 1);
  }
  eq("a changeset may say no longer", judgeIds([idEntry(".changeset/a.md", "no longer")]), []);
  eq("the upgrade guide may say no longer", judgeIds([idEntry("apps/website/src/content/docs/docs/reference/upgrading.md", "no longer")]), []);
  eq("a changeset is still scanned for ids", judgeIds([idEntry(".changeset/a.md", "PREG-01")]).length, 1);
  const spec = "# Title\nno longer here\n## Change History\n| 1 | no longer a row |\n";
  eq("a phrase before the change history is flagged", judgeIds([{ file: "spec/a.md", text: spec, added: new Set([2]) }]).length, 1);
  eq("a phrase in the change history is exempt", judgeIds([{ file: "spec/a.md", text: spec, added: new Set([4]) }]), []);
  const header = "> | Change History | 1.1 (2026-11-24): a row\n> | Status | no longer here\n";
  eq("a phrase in the Document Control history row is exempt", judgeIds([{ file: "spec/a.md", text: header.replace("a row", "no longer a row"), added: new Set([1]) }]), []);
  eq("a phrase in another Document Control row is flagged", judgeIds([{ file: "spec/a.md", text: header, added: new Set([2]) }]).length, 1);
  eq("an older entry of the Document Control history row is not new text", judgeIds([{ file: "spec/a.md", text: "> | Change History | 1.2 (2026-11-24): a row<br>1.1 (2026-11-10): D-01 approved, no longer<br>1.0 (2026-11-09): Initial\n", added: new Set([1]) }]), []);
  eq("an id in the Document Control history row is still flagged", judgeIds([{ file: "spec/a.md", text: "> | Change History | 1.1 (2026-11-24): PREG-01\n", added: new Set([1]) }]).length, 1);

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
  const reactSrc = "packages/react/src/A.ts";
  eq("a module-scope string literal is flagged in react source", lit(reactSrc, 'const NAME = "x";').length, 1);
  eq("a literal in a function body is not flagged", lit(reactSrc, 'const f = () => {\n  return "x";\n};'), []);
  eq("a literal in an arrow expression body is not flagged", lit(reactSrc, 'const f = () => "x";'), []);
  eq("a literal in a call at module scope is flagged", lit(reactSrc, 'const f = make("x");').length, 1);
  eq("a literal in a type declaration is not flagged", lit(reactSrc, 'export type Tag = "a" | "b";'), []);
  eq("an import path is not flagged", lit(reactSrc, 'import { a } from "./a.ts";'), []);
  eq("a module-scope literal is not flagged outside react source", lit("packages/devtools/src/model/A.ts", 'const NAME = "x";'), []);
  eq("a module-scope literal is not flagged in a test", lit("packages/react/test/A.test.ts", 'const NAME = "x";'), []);
  eq("a literal inside a comment at module scope is not flagged", lit(reactSrc, '// "x"\nconst a = 1;'), []);

  // The owner's trailer, the commit judge over the planning commits that precede the first plan commit, and the base.
  const T1 = TRAILER;
  eq("the owner's trailer passes", judgeTrailer(`subject\n\n${T1}\n`), []);
  eq("two trailers fail", judgeTrailer(`s\n\n${T1}\n${T1}\n`).length, 1);
  eq("no trailer fails", judgeTrailer("s\n").length, 1);
  eq("a foreign trailer fails", judgeTrailer("s\n\nCo-Authored-By: Someone <a@b.c>\n").length, 1);
  eq("another Claude model fails", judgeTrailer("s\n\nCo-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>\n").length, 1);
  eq("a Claude trailer with another address fails", judgeTrailer("s\n\nCo-Authored-By: Claude Opus 5.5 <a@b.c>\n").length, 1);

  const c = (subject, paths, message = `${subject}\n\n${T1}`) => ({ sha: subject, subject, paths, message });
  const PLAN = "docs(86-01): record";
  const log = [c("docs(86): create phase plan", [".planning/a.md"]), c("docs(phase-86): add pattern map", [".planning/b.md"]), c(PLAN, ["b", "a"]), c("chore(86-01): next", ["z"])];
  eq("--first passes over planning commits that change only .planning", judgeCommit(log, PLAN, ["a", "b"], true), []);
  eq("the second plan commit passes without --first", judgeCommit(log, "chore(86-01): next", ["z"], false), []);
  eq("--first on the second plan commit fails", judgeCommit(log, "chore(86-01): next", ["z"], true)[0].startsWith("the commit is not the first plan commit"), true);
  eq("a commit before the first plan commit that changes source fails", judgeCommit([c("docs(86): x", [".planning/a.md", "packages/x.ts"]), c(PLAN, ["a"])], PLAN, ["a"], true), ["docs(86): x precedes the first plan commit and changes packages/x.ts outside .planning"]);
  eq("a wrong subject fails", judgeCommit(log, "other", ["a"], false).length, 1);
  eq("an extra path fails", judgeCommit(log, PLAN, ["a"], false).length, 1);
  eq("a missing path fails", judgeCommit(log, PLAN, ["a", "b", "c"], false).length, 1);
  eq("a duplicate subject fails", judgeCommit([c(PLAN, ["a"]), c(PLAN, ["a"])], PLAN, ["a"], false).length, 1);
  eq("a commit without the trailer fails", judgeCommit([c(PLAN, ["a"], PLAN)], PLAN, ["a"], false).length, 1);
  eq("a Phase 85 subject is refused by commit", judgeCommit([c("docs(85-01): x", ["a"])], PLAN, ["a"], false).length, 1);
  eq("a Phase 85 subject is not a plan commit", PLAN_SUBJECT.test("docs(85-01): x"), false);
  eq("a Phase 86 subject is a plan commit", PLAN_SUBJECT.test("chore(86-12)!: x"), true);
  const other = "0123456789abcdef0123456789abcdef01234567";
  eq("the fixed base that is an ancestor passes", judgeBase(PHASE_BASE, true), []);
  eq("another sha fails", judgeBase(other, true), [`phase_base is not ${PHASE_BASE}`]);
  eq("a base that is not an ancestor fails", judgeBase(PHASE_BASE, false), ["phase_base is not an ancestor of HEAD"]);
  eq("an unrecorded base fails", judgeBase(undefined, true).length, 1);

  eq("the line \"use client\"; is not a module-scope literal", lit(reactSrc, '"use client";\nexport const a = 1;'), []);
  eq("a use client string in an expression is flagged", lit(reactSrc, 'const NAME = "use client";').length, 1);
  eq("a second module-scope literal after it is flagged", lit(reactSrc, '"use client";\nconst NAME = "x";').length, 1);
  eq("a use client line with a trailing comment is not exempt", lit(reactSrc, '"use client"; // x').length, 1);

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

  // The effect and re-export readers.
  eq("effect spans are read with their dependency lists", effectSpans("useEffect(() => { a(); }, [a]); useLayoutEffect(() => {}, []);").map(([a, b]) => "useEffect(() => { a(); }, [a]); useLayoutEffect(() => {}, []);".slice(a, b)), ["(() => { a(); }, [a])", "(() => {}, [])"]);
  eq("a re-export is read with its names", reexportsOf('export type { A, B as C } from "./a.ts";\nexport { z } from "./z.ts";\nimport { q } from "./q.ts";\nexport const k = 1;'), [
    { spec: "./a.ts", names: ["A", "B"] },
    { spec: "./z.ts", names: ["z"] },
  ]);

  // owner-shape.
  const ownerOk = [
    'import type { AuthSubject } from "@qadi/core";',
    'import * as AtomRegistry from "effect/reactivity/AtomRegistry";',
    'import type { InitialValues } from "./HydrationEngine.ts";',
    'import type { QadiAtoms } from "./QadiAtoms.ts";',
    'import { makeRegistryLease } from "./RegistryLease.ts";',
    'import type { LeaseDefer } from "./RegistryLease.ts";',
    "",
    "interface Latest {",
    "  readonly atoms: QadiAtoms;",
    "  readonly subject: AuthSubject | undefined;",
    "}",
    "export interface RegistryOwner {",
    "  readonly registry: AtomRegistry.AtomRegistry;",
    "  readonly commit: (atoms: QadiAtoms, subject: AuthSubject | undefined, onAtomsReplaced: () => void) => void;",
    "  readonly hold: () => void;",
    "  readonly release: () => void;",
    "}",
    "export type Seed = { readonly atoms: QadiAtoms; readonly subject: AuthSubject | undefined; readonly initialValues?: InitialValues };",
    "",
    "// A comment may say registry.get( and .dispose( and scheduleTask and setTimeout.",
    "export const makeRegistryOwner = (seed: Seed, defer?: LeaseDefer): RegistryOwner => {",
    "  const registry = AtomRegistry.make({",
    "    initialValues: [[seed.atoms.subject, seed.subject] as const, ...(seed.initialValues ?? [])],",
    "  });",
    "  let latest: Latest = { atoms: seed.atoms, subject: seed.subject };",
    "  const lease = makeRegistryLease(() => {",
    "    try {",
    "      registry.reset();",
    "    } finally {",
    "      registry.set(latest.atoms.subject, latest.subject);",
    "    }",
    "  }, defer);",
    "  return {",
    "    registry,",
    "    commit: (atoms, subject, onAtomsReplaced) => {",
    "      if (latest.atoms !== atoms) onAtomsReplaced();",
    "      latest = { atoms, subject };",
    "      registry.set(atoms.subject, subject);",
    "    },",
    "    hold: lease.hold,",
    "    release: lease.release,",
    "  };",
    "};",
    "",
  ].join("\n");
  const barrelOk = 'export * from "./QadiProvider.tsx";\n';
  const strykerOk = `export default {\n  // the mutate list names the owner\n  mutate: [\n    "packages/react/src/DecisionOutcome.ts",\n    "${LEASE}",\n    "${OWNER}",\n  ],\n};\n`;
  const providerExports = 'export { MissingQadiProviderError } from "./MissingQadiProviderError.ts";\n';
  const shape = (over = {}) => judgeOwnerShape({ owner: ownerOk, barrel: barrelOk, provider: providerExports, stryker: strykerOk, ...over });
  const ownerWith = (from, to) => shape({ owner: ownerOk.replace(from, to) });
  eq("an owner of the right shape passes", shape(), []);
  eq("an owner declared as a function declaration passes", shape({ owner: ownerOk.replace("export const makeRegistryOwner = (seed: Seed, defer?: LeaseDefer): RegistryOwner => {", "export function makeRegistryOwner(seed: Seed, defer?: LeaseDefer): RegistryOwner {").replace(/\};\n$/, "}\n") }), []);
  eq("a missing owner file is reported", shape({ owner: undefined }), ["RegistryOwner.ts is missing"]);
  eq("an import of React fails", ownerWith('import type { AuthSubject } from "@qadi/core";', 'import type { AuthSubject } from "@qadi/core";\nimport { useRef } from "react";').length, 1);
  eq("a side-effect import of React fails", ownerWith('import type { AuthSubject } from "@qadi/core";', 'import type { AuthSubject } from "@qadi/core";\nimport "react";').length, 1);
  eq("an import of the provider fails", ownerWith('import type { AuthSubject } from "@qadi/core";', 'import type { AuthSubject } from "@qadi/core";\nimport { QadiProvider } from "./QadiProvider.tsx";').length, 1);
  eq("an import of the atom-react binding fails", ownerWith('import type { AuthSubject } from "@qadi/core";', 'import type { AuthSubject } from "@qadi/core";\nimport { RegistryContext } from "@effect/atom-react/RegistryContext";').length, 1);
  eq("a dynamic import fails", ownerWith("  const lease", '  const lazy = import("react");\n  const lease').length >= 1, true);
  eq("a module-scope arrow const fails", ownerWith("export const makeRegistryOwner", "const pick = (a: number) => a;\nexport const makeRegistryOwner").length, 1);
  eq("a module-scope let fails", ownerWith("export const makeRegistryOwner", "let live = 0;\nexport const makeRegistryOwner").length, 1);
  eq("a module-scope array literal fails", ownerWith("export const makeRegistryOwner", "const cache = [];\nexport const makeRegistryOwner").length, 1);
  eq("a module-scope call fails", ownerWith("export const makeRegistryOwner", "register();\nexport const makeRegistryOwner").length, 1);
  eq("a second declaration of the factory fails", ownerWith("export const makeRegistryOwner", "export function makeRegistryOwner(a: Seed): RegistryOwner {\n  return a;\n}\nexport const makeRegistryOwner").length >= 1, true);
  eq("a header that does not end in the owner type fails", ownerWith("): RegistryOwner => {", "): Other => {").length >= 1, true);
  eq("a registry.get( fails", ownerWith("      registry.set(atoms.subject, subject);", "      if (registry.get(atoms.subject) !== subject) registry.set(atoms.subject, subject);"), [`${OWNER} names registry.get(`]);
  eq("a .dispose( fails", ownerWith("      latest = { atoms, subject };", "      latest = { atoms, subject };\n      registry.dispose();"), [`${OWNER} names .dispose(`]);
  eq("a scheduleTask option fails", ownerWith("AtomRegistry.make({", "AtomRegistry.make({\n    scheduleTask: run,"), [`${OWNER} names scheduleTask`]);
  eq("a defaultIdleTTL option fails", ownerWith("AtomRegistry.make({", "AtomRegistry.make({\n    defaultIdleTTL: 1,"), [`${OWNER} names defaultIdleTTL`]);
  eq("a captured registry.reset.bind( fails", ownerWith("registry.reset();", "const reset = registry.reset.bind(registry);\n      reset();").length >= 1, true);
  eq("a setTimeout fails", ownerWith("  return {", "  const t = setTimeout(() => {}, 0);\n  return {"), [`${OWNER} names setTimeout`]);
  eq("a sweep fails", ownerWith("  return {", "  const sweepIdle = 1;\n  return {"), [`${OWNER} names a sweep`]);
  eq("a Match fails", ownerWith("  return {", "  const m = Match.type<number>();\n  return {"), [`${OWNER} names Match`]);
  eq("a switch fails", ownerWith("  return {", "  switch (latest.atoms) {\n  }\n  return {"), [`${OWNER} names switch`]);
  eq("a third registry.set( fails", ownerWith("      latest = { atoms, subject };", "      latest = { atoms, subject };\n      registry.set(atoms.subject, subject);"), [`${OWNER} has 3 registry.set( calls, not 2`]);
  eq("a second AtomRegistry.make( fails", ownerWith("  return {", "  const other = AtomRegistry.make({});\n  return {"), [`${OWNER} has 2 AtomRegistry.make( calls, not 1`]);
  eq("a reset that is not called through the registry fails", ownerWith("registry.reset();", "registry.clear();"), [`${OWNER} has 0 registry.reset() calls, not 1`]);
  eq("a hold that is wrapped fails", ownerWith("hold: lease.hold,", "hold: () => lease.hold(),"), [`${OWNER} does not forward hold: lease.hold by reference`]);
  eq("a release that is called fails", ownerWith("release: lease.release,", "release: lease.release(),"), [`${OWNER} does not forward release: lease.release by reference`]);
  eq("a lease built twice fails", ownerWith("  return {", "  const again = makeRegistryLease(() => {});\n  return {"), [`${OWNER} has 2 makeRegistryLease( calls, not 1`]);
  eq("a barrel naming the owner fails", shape({ barrel: `${barrelOk}export * from "./RegistryOwner.ts";\n` }), [`${BARREL} names the owner: it stays out of the barrel`]);
  eq("a provider exporting the owner fails", shape({ provider: `${providerExports}export { makeRegistryOwner } from "./RegistryOwner.ts";\n` }).length, 1);
  eq("a provider exporting the owner type fails", shape({ provider: `${providerExports}export type { RegistryOwner } from "./RegistryOwner.ts";\n` }).length, 1);
  eq("a provider importing the owner is not an export", shape({ provider: `${providerExports}import { makeRegistryOwner } from "./RegistryOwner.ts";\nexport const QadiProvider = 1;\n` }), []);
  eq("a stryker list without the owner fails", shape({ stryker: strykerOk.replace(`    "${OWNER}",\n`, "") }), [`${STRYKER} does not mutate RegistryOwner.ts`]);
  eq("a stryker list without the lease fails", shape({ stryker: strykerOk.replace(`    "${LEASE}",\n`, "") }), [`${STRYKER} does not mutate RegistryLease.ts`]);
  eq("a stryker list mutating the provider fails", shape({ stryker: strykerOk.replace(`    "${OWNER}",\n`, `    "${OWNER}",\n    "${PROVIDER}",\n`) }).length, 1);
  eq("an owner named only in a stryker comment fails", shape({ stryker: strykerOk.replace(`    "${OWNER}",\n`, `    // "${OWNER}",\n`) }), [`${STRYKER} does not mutate RegistryOwner.ts`]);
  eq("a stryker file with no list fails", shape({ stryker: "export default {};\n" }), [`${STRYKER} has no readable mutate list`]);

  // provider-forwards-only.
  const providerOk = [
    '"use client";',
    "/** The header may say RegistryLease, registryRef, setTimeout and .dispose( in a comment. */",
    'import type * as AtomRegistry from "effect/reactivity/AtomRegistry";',
    'import { useEffect, useMemo, useRef } from "react";',
    'import { makeRegistryOwner } from "./RegistryOwner.ts";',
    'import type { RegistryOwner } from "./RegistryOwner.ts";',
    "export interface QadiContextValue {",
    "  readonly registry: AtomRegistry.AtomRegistry;",
    "}",
    'export type { InitialValues } from "./HydrationEngine.ts";',
    'export { MissingQadiProviderError } from "./MissingQadiProviderError.ts";',
    'export type { ProviderSignal, ProviderSignalReporter } from "./DeveloperSignals.ts";',
    "export const QadiProvider = ({ atoms, subject, initialValues, instrument = false, gates }: Props): ReactNode => {",
    "  const writer = useMemo(() => (instrument ? gateWriterFor(gates) : undefined), [instrument, gates]);",
    "  const signalRef = useRef(onDeveloperSignal);",
    "  const report = (signal: ProviderSignal): void => {",
    "    providerSignalReporter(signalRef.current)(signal);",
    "  };",
    "  const ownerRef = useRef<RegistryOwner | undefined>(undefined);",
    "  const owner = (ownerRef.current ??= makeRegistryOwner({ atoms, subject, initialValues }));",
    "  useEffect(() => {",
    "    owner.commit(atoms, subject, () => report(providerSignals.atomsReplaced()));",
    "  }, [owner, atoms, subject]);",
    "  const reportedInstrumented = useRef(false);",
    "  useEffect(() => {",
    "    if (instrument && !reportedInstrumented.current) {",
    "      reportedInstrumented.current = true;",
    "      report(providerSignals.instrumentedInProduction());",
    "    }",
    "  }, [instrument]);",
    "  useEffect(() => {",
    "    if (instrument && writer === undefined) {",
    "      report(providerSignals.unwritableGateRegistry());",
    "    }",
    "  }, [instrument, gates]);",
    "  useEffect(() => {",
    "    owner.hold();",
    "    return () => owner.release();",
    "  }, [owner]);",
    "  const value = useMemo(() => ({ atoms, registry: owner.registry, gates }), [atoms, owner, gates]);",
    "  const gateScope = useMemo(() => ({ atoms, writer }), [atoms, writer]);",
    "  return <Ctx value={value}>{gateScope}</Ctx>;",
    "};",
    "",
  ].join("\n");
  const providerBase = [
    '"use client";',
    'import * as AtomRegistry from "effect/reactivity/AtomRegistry";',
    'import { useEffect, useMemo, useRef } from "react";',
    'import { makeRegistryLease } from "./RegistryLease.ts";',
    'import type { RegistryLease } from "./RegistryLease.ts";',
    'export type { InitialValues } from "./HydrationEngine.ts";',
    'export { MissingQadiProviderError } from "./MissingQadiProviderError.ts";',
    'export type { ProviderSignal, ProviderSignalReporter } from "./DeveloperSignals.ts";',
    "export const QadiProvider = ({ atoms, subject, instrument = false, gates }: Props): ReactNode => {",
    "  const writer = useMemo(() => (instrument ? gateWriterFor(gates) : undefined), [instrument, gates]);",
    "  const signalRef = useRef(onDeveloperSignal);",
    "  const registryRef = useRef<AtomRegistry.AtomRegistry | undefined>(undefined);",
    "  const registry = (registryRef.current ??= AtomRegistry.make({ initialValues: [] }));",
    "  const atomsIdentityRef = useRef(atoms);",
    "  useEffect(() => {",
    "    if (atomsIdentityRef.current !== atoms) report(providerSignals.atomsReplaced());",
    "    atomsIdentityRef.current = atoms;",
    "  }, [atoms]);",
    "  const latestRef = useRef({ atoms, subject });",
    "  useEffect(() => {",
    "    latestRef.current = { atoms, subject };",
    "  }, [atoms, subject]);",
    "  const leaseRef = useRef<RegistryLease | undefined>(undefined);",
    "  const lease = (leaseRef.current ??= makeRegistryLease(() => {",
    "    try {",
    "      registry.reset();",
    "    } finally {",
    "      registry.set(latestRef.current.atoms.subject, latestRef.current.subject);",
    "    }",
    "  }));",
    "  useEffect(() => {",
    "    if (registry.get(atoms.subject) !== subject) {",
    "      registry.set(atoms.subject, subject);",
    "    }",
    "  }, [registry, atoms, subject]);",
    "  const reportedInstrumented = useRef(false);",
    "  useEffect(() => {",
    "    if (instrument && !reportedInstrumented.current) report(providerSignals.instrumentedInProduction());",
    "  }, [instrument]);",
    "  useEffect(() => {",
    "    if (instrument && writer === undefined) report(providerSignals.unwritableGateRegistry());",
    "  }, [instrument, gates]);",
    "  useEffect(() => {",
    "    lease.hold();",
    "    return () => lease.release();",
    "  }, [lease]);",
    "  const value = useMemo(() => ({ atoms, registry, gates }), [atoms, registry, gates]);",
    "  const gateScope = useMemo(() => ({ atoms, writer }), [atoms, writer]);",
    "  return <Ctx value={value}>{gateScope}</Ctx>;",
    "};",
    "",
  ].join("\n");
  const fwd = (from, to) => judgeProviderForwardsOnly(providerOk.replace(from, to));
  eq("a provider that only forwards passes", judgeProviderForwardsOnly(providerOk), []);
  eq("the base provider fails with the six-effect reason", judgeProviderForwardsOnly(providerBase).includes(`${PROVIDER} has 6 useEffect calls, not 4`), true);
  eq("the base provider also fails the ref count and the old names", [judgeProviderForwardsOnly(providerBase).includes(`${PROVIDER} has 6 useRef calls, not 3`), judgeProviderForwardsOnly(providerBase).length > 6], [true, true]);
  eq("a fifth effect fails", fwd("  const value", "  useEffect(() => {}, []);\n  const value").includes(`${PROVIDER} has 5 useEffect calls, not 4`), true);
  eq("a fourth ref fails", fwd("  const value", "  const extra = useRef(0);\n  const value").includes(`${PROVIDER} has 4 useRef calls, not 3`), true);
  eq("a fourth memo fails", fwd("  const value", "  const extra = useMemo(() => 1, []);\n  const value").includes(`${PROVIDER} has 4 useMemo calls, not 3`), true);
  eq("a useState fails", fwd("  const value", "  const [n] = useState(0);\n  const value").some((r) => r.includes("names useState")), true);
  eq("a layout effect fails", fwd("  const value", "  useLayoutEffect(() => {}, []);\n  const value").some((r) => r.includes("names useLayoutEffect")), true);
  eq("an owner built without the lazy assignment fails", fwd("ownerRef.current ??= makeRegistryOwner(", "ownerRef.current = makeRegistryOwner(").length >= 1, true);
  eq("an if in the first effect fails", fwd("    owner.commit(atoms, subject, () => report(providerSignals.atomsReplaced()));", "    if (instrument) owner.commit(atoms, subject, () => report(providerSignals.atomsReplaced()));"), [`${PROVIDER}: the first effect holds if, a branch of lifetime logic`]);
  eq("a ?? in the first effect fails", fwd("owner.commit(atoms, subject, ", "owner.commit(atoms, subject ?? undefined, ").length, 1);
  eq("a try in the last effect fails", fwd("    owner.hold();", "    try {\n      owner.hold();\n    } finally {\n    }").length, 1);
  eq("a && in the last effect fails", fwd("    owner.hold();", "    instrument && owner.hold();").length >= 1, true);
  eq("a first effect that does not commit fails", fwd("owner.commit(", "owner.other(").some((r) => r.includes("does not call owner.commit(")), true);
  eq("a first effect on the wrong dependencies fails", fwd("[owner, atoms, subject]", "[owner, atoms]"), [`${PROVIDER}: the first effect depends on [owner,atoms], not [owner, atoms, subject]`]);
  eq("a last effect on the wrong dependencies fails", fwd("}, [owner]);", "}, [owner, atoms]);"), [`${PROVIDER}: the last effect depends on [owner,atoms], not [owner]`]);
  eq("a last effect that does not release in its cleanup fails", fwd("return () => owner.release();", "owner.release();").some((r) => r.includes("does not call owner.hold() and return () => owner.release()")), true);
  eq("a second hold fails", fwd("owner.commit(atoms", "owner.hold();\n    owner.commit(atoms").some((r) => r.includes(".hold( does not occur once")), true);
  eq("a release outside the last effect fails", fwd("owner.commit(atoms", "owner.release();\n    owner.commit(atoms").some((r) => r.includes(".release( does not occur once")), true);
  eq("an instrumentation signal moved out of its place fails", fwd("      report(providerSignals.unwritableGateRegistry());", "      report(1);").some((r) => r.includes("providerSignals.unwritableGateRegistry( is not in an effect between")), true);
  eq("an instrumentation signal in the first effect fails", fwd("      report(providerSignals.unwritableGateRegistry());", "      report(1);").length >= 1 && judgeProviderForwardsOnly(providerOk.replace("      report(providerSignals.unwritableGateRegistry());", "      report(1);").replace("    owner.commit(atoms, subject, () => report(providerSignals.atomsReplaced()));", "    owner.commit(atoms, subject, () => report(providerSignals.atomsReplaced()));\n    report(providerSignals.unwritableGateRegistry());")).some((r) => r.includes("is not in an effect between")), true);
  eq("an owner whose registry is not read fails", fwd("registry: owner.registry", "registry: undefined"), [`${PROVIDER} does not read owner.registry`]);
  eq("AtomRegistry imported as a value fails", fwd("import type * as AtomRegistry", "import * as AtomRegistry"), [`${PROVIDER} does not import AtomRegistry as a type only (import type * as AtomRegistry)`]);
  eq("a provider that does not import the owner fails", fwd('import { makeRegistryOwner } from "./RegistryOwner.ts";', 'import { makeRegistryOwner } from "./Other.ts";'), [`${PROVIDER} does not import makeRegistryOwner from ./RegistryOwner.ts`]);
  eq("an import of the lease fails", fwd("export interface", 'import type { LeaseDefer } from "./RegistryLease.ts";\nexport interface').some((r) => r.includes("imports from RegistryLease.ts")), true);
  eq("a lost re-export of the error fails", fwd('export { MissingQadiProviderError } from "./MissingQadiProviderError.ts";\n', ""), [`${PROVIDER} no longer re-exports MissingQadiProviderError from ./MissingQadiProviderError.ts`]);
  eq("a lost re-export of a name fails", fwd("ProviderSignal, ProviderSignalReporter", "ProviderSignal"), [`${PROVIDER} no longer re-exports ProviderSignal, ProviderSignalReporter from ./DeveloperSignals.ts`]);
  for (const [name, line] of [
    ["registryRef", "const planted = registryRef;"],
    ["atomsIdentityRef", "const planted = atomsIdentityRef;"],
    ["latestRef", "const planted = latestRef;"],
    ["leaseRef", "const planted = leaseRef;"],
    ["makeRegistryLease", "const planted = makeRegistryLease;"],
    ["AtomRegistry.make", "const planted = AtomRegistry.make;"],
    [".reset(", "planted.reset();"],
    [".dispose(", "planted.dispose();"],
    ["setTimeout", "const planted = setTimeout;"],
    ["registry.set(", "registry.set(a, b);"],
    ["registry.get(", "registry.get(a);"],
    ["scheduleTask", "const planted = { scheduleTask };"],
    ["defaultIdleTTL", "const planted = { defaultIdleTTL };"],
  ]) {
    eq(`${name} in code fails`, fwd("  const value", `  ${line}\n  const value`).some((r) => r.includes(`names ${name}`)), true);
  }
  eq("those names in a comment or a string pass", fwd("  const value", '  // registryRef, latestRef, leaseRef, .reset( and registry.get(\n  const said = "setTimeout, .dispose( and registry.set(";\n  const value'), []);

  // records.
  const A = OWNER_TEST;
  const B = "packages/react/test/RegistryLease.test.ts";
  const behOf = (n, body, title = "heading") => `## BEH-QD-${n}: ${title}\n\n> **Decision:** x\n\n${body}\n\nSpecified in ADR-QD-199.\n\n`;
  const pinned = `Pinned by \`${A}\` ("a title"; RO1, the row), \`${B}\` ("b title that\nspans two lines", "a described group", RL1 to RL3).`;
  const held = (over = {}) => PINNED_KEPT.map((n) => behOf(n, over[n] ?? pinned)).join("");
  const files = {
    [A]: 'it("RO1 the row", () => {});\nit("a title", () => {});\n',
    [B]: 'describe("a described group", () => {});\nit("b title that spans two lines", () => {});\nit("RL1 a", () => {});\nit("RL2 b", () => {});\nit("RL3 c", () => {});\n',
  };
  const trace = (over = {}) =>
    [
      "## §1 Behavior to source",
      "",
      over.one ?? "| [BEH-QD-747](a) | x |\n| [BEH-QD-766](a) | x |\n| BEH-QD-767 | x |",
      "",
      "## §2 Invariant traceability",
      "",
      over.two ?? "| [INV-QD-417](a) | d |\n| [INV-QD-418](a) | d |",
      "",
      "## §3 Decision traceability",
      "",
      over.three ?? "| [ADR-QD-199](a) | t |",
      "",
      "## §4 Test file map",
      "",
    ].join("\n");
  const recs = (behaviors = held(), close = undefined, fs = files, t = trace()) => judgeRecords({ trace: t, behaviors, tests: (p) => fs[p] }, close);
  eq("records that agree pass", recs(), []);
  eq("a quoted title that no test holds fails", recs(held({ 747: pinned.replace("a title", "a titel") })), [`BEH-QD-747 quotes "a titel" for ${A}, which holds no such test`]);
  eq("a describe title may be quoted", recs(), []);
  eq("a title quoted under the wrong file fails", recs(held({ 748: pinned.replace('("a title"; RO1, the row)', '("a title"; "b title that spans two lines"; RO1, the row)') })), [`BEH-QD-748 quotes "b title that spans two lines" for ${A}, which holds no such test`]);
  eq("a quoted title is matched whole, not by its prefix", recs(held({ 749: pinned.replace("a title", "a") })).length, 1);
  eq("a row id that no title opens fails", recs(held({ 750: pinned.replace("RO1,", "RO2,") })), [`BEH-QD-750 names row RO2 for ${A}, which no title opens`]);
  eq("a row id with no digits is not a row id", recs(held({ 750: pinned.replace("RO1,", "RO,") })), []);
  eq("a row range that runs past the last title fails", recs(held({ 748: pinned.replace("RL1 to RL3", "RL1 to RL4") })), [`BEH-QD-748 names row RL4 for ${B}, which no title opens`]);
  eq("a row range that runs far past fails once per missing row", recs(held({ 748: pinned.replace("RL1 to RL3", "RL1 to RL99") })).length, 96);
  eq("a row id is not satisfied by a longer id", recs(held(), undefined, { ...files, [A]: files[A].replace("RO1 the row", "RO10 the row") }).length, 4);
  eq("a pinned file that does not exist fails", recs(held(), undefined, { ...files, [B]: undefined }).length, 4);
  eq("a kept behavior with no heading fails", recs(held().replace("## BEH-QD-749:", "## BEH-QD-9749:")), [`BEH-QD-749 has no heading in ${BEHAVIORS}`]);
  eq("a new behavior with no heading is skipped", recs(), []);
  eq("a behavior whose pinned-by names no file fails", recs(held({ 750: "Pinned by nothing." })), ["BEH-QD-750 names no test file in a Pinned by paragraph"]);
  eq("a pinned-by paragraph ends at the blank line", recs(`${held()}Quoted later: "not a title".\n`), []);
  eq("a new behavior is read once it has a heading", recs(`${held()}${behOf(766, pinned.replace("a title", "a titel"))}`), [`BEH-QD-766 quotes "a titel" for ${A}, which holds no such test`]);

  const closeText = {
    invariants: "## INV-QD-409: a\n\n**Source**: `packages/react/src/RegistryOwner.ts` and `x`.\n\n## INV-QD-410: b\n\n**Source**: `packages/react/src/RegistryOwner.ts` and `y`.\n\n**Implication**: registryRef was.\n\n## INV-QD-417: c\n\n## INV-QD-418: d\n",
    decisions: [
      { file: "199-a-providers-registry-lifetime.md", text: "| Document ID | QADI-ADR-199 |\n\nA host `registry.refresh` keeps the subject.\n\n| Test | Why |\n| ---- | --- |\n| LT1 | x |\n\nTests removed: 0.\n" },
      { file: "195-x.md", text: "> | Revision       | 1.4   |\n> | Change History | 1.4: ADR-QD-199 |\n" },
    ],
    index: '  - id: "ADR-QD-199"\n    file: "199-x.md"\n',
    readme: "| CCR-QD-478 | 2026-11-25 | ARCH-133 the owner. Unused: BEH-QD-768, BEH-QD-769, BEH-QD-770 |\n",
  };
  const closeBeh = (over = {}) => [...PINNED_KEPT.map((n) => behOf(n, over[n] ?? pinned)), ...NEW_BEHAVIORS.map((n) => behOf(n, pinned))].join("");
  const closed = (over = {}, close = closeText, behaviors = closeBeh()) => recs(behaviors, close, files, trace(over));
  eq("a close with every reserved record written passes", closed(), []);
  eq("a close with no new BEH heading fails", closed({}, closeText, closeBeh().replace("## BEH-QD-767:", "## BEH-QD-9767:")), [`BEH-QD-767 has no heading in ${BEHAVIORS}`]);
  eq("a BEH with no row in section 1 fails", closed({ one: "| [BEH-QD-747](a) | x |\n| [BEH-QD-766](a) | x |" }), ["BEH-QD-767 has no row in spec/traceability.md §1"]);
  eq("a BEH inside a range of section 1 is covered", closed({ one: "| 09 | BEH-QD-746–750, BEH-QD-766–767 | x |" }), []);
  eq("a behavior named unused that has a heading fails", closed({}, closeText, `${closeBeh()}${behOf(769, pinned)}`), [`BEH-QD-769 has a heading in ${BEHAVIORS}, and the phase names it unused`]);
  eq("a pinned-by paragraph that names another test first fails", closed({}, closeText, closeBeh({ 748: `Pinned by \`${B}\` ("RL1 a"), \`${A}\` ("a title").` })).length, 1);
  eq("a missing INV row fails", closed({ two: "| [INV-QD-417](a) | d |" }), ["INV-QD-418 has no row in spec/traceability.md §2"]);
  eq("a missing INV heading fails", closed({}, { ...closeText, invariants: closeText.invariants.replace("## INV-QD-418: d\n", "") }), ["INV-QD-418 has no heading in spec/invariants.md"]);
  eq("a source line that does not name the owner fails", closed({}, { ...closeText, invariants: closeText.invariants.replace("**Source**: `packages/react/src/RegistryOwner.ts` and `x`.", "**Source**: `x`.") }), ["the **Source**: line of INV-QD-409 does not name RegistryOwner.ts"]);
  eq("a source line of INV-QD-410 that still names the ref fails", closed({}, { ...closeText, invariants: closeText.invariants.replace("and `y`.", "and `registryRef`.") }), ["the **Source**: line of INV-QD-410 still names registryRef"]);
  eq("a ref named outside the source line is not read", closed(), []);
  eq("a missing ADR file fails", closed({}, { ...closeText, decisions: closeText.decisions.slice(1) }), ["spec/decisions/199-*.md does not exist"]);
  eq("an ADR file without its document id fails", closed({}, { ...closeText, decisions: [{ file: "199-x.md", text: closeText.decisions[0].text.replace("QADI-ADR-199", "none") }, closeText.decisions[1]] }), ["the ADR-QD-199 file does not carry QADI-ADR-199"]);
  eq("an ADR file without the refresh sentence fails", closed({}, { ...closeText, decisions: [{ file: "199-x.md", text: closeText.decisions[0].text.replace("registry.refresh", "a refresh") }, closeText.decisions[1]] }), ["the ADR-QD-199 file has no sentence naming registry.refresh and the subject it keeps"]);
  eq("an ADR file without the zero line fails", closed({}, { ...closeText, decisions: [{ file: "199-x.md", text: closeText.decisions[0].text.replace("Tests removed: 0.", "Tests removed: 2.") }, closeText.decisions[1]] }), ["the ADR-QD-199 file has no line `Tests removed: 0.`"]);
  eq("a zero line that does not follow a table fails", closed({}, { ...closeText, decisions: [{ file: "199-x.md", text: closeText.decisions[0].text.replace("| LT1 | x |\n\n", "Some words.\n\n") }, closeText.decisions[1]] }), ["the line `Tests removed: 0.` does not follow the render-suite audit table"]);
  eq("a missing index entry fails", closed({}, { ...closeText, index: "" }), ["spec/decisions/index.yaml has no ADR-QD-199 entry"]);
  eq("a missing section 3 row fails", closed({ three: "| [ADR-QD-198](a) | t |" }), ["ADR-QD-199 has no row in spec/traceability.md §3"]);
  eq("an ADR-QD-195 still at 1.3 fails", closed({}, { ...closeText, decisions: [closeText.decisions[0], { file: "195-x.md", text: "> | Revision       | 1.3   |\n> | Change History | 1.4: ADR-QD-199 |\n" }] }), ["ADR-QD-195 is not at Revision 1.4"]);
  eq("an ADR-QD-195 that does not name the new decision fails", closed({}, { ...closeText, decisions: [closeText.decisions[0], { file: "195-x.md", text: "> | Revision       | 1.4   |\n" }] }), ["ADR-QD-195 does not name ADR-QD-199"]);
  eq("a missing CCR row fails", closed({}, { ...closeText, readme: "" }), ["spec/README.md has no CCR-QD-478 row"]);
  eq("a CCR row that does not name the architecture item fails", closed({}, { ...closeText, readme: closeText.readme.replace("ARCH-133", "x") }), ["the CCR-QD-478 row does not name ARCH-133"]);
  eq("a CCR row that does not name the unused behaviors fails", closed({}, { ...closeText, readme: closeText.readme.replace("Unused: BEH-QD-768, BEH-QD-769, BEH-QD-770", "none") }), ["the CCR-QD-478 row does not say Unused: BEH-QD-768, BEH-QD-769, BEH-QD-770"]);
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
  if (mode === undefined || !Object.hasOwn(MODES, mode)) fail([`usage: node 86-check.mjs ${Object.keys(MODES).join("|")}`]);
  else MODES[mode](args);
}
