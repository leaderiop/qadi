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
//   trailers                                 every plan commit since phase_base has exactly one trailer, the owner's
//   no-adapter                               useConfigured takes a value that has configure, and no adapter is left
//   no-restated-set                          every lens move goes through the store's set, and choose arms before it
//   one-path                                 the lens adapter reads the guards from its one subscription and from the store
//   one-ledger                               one stop ledger, in useStopNotice, called once per feed
//   records [--close]                        the adapter row and the pinned-by lists name tests that exist; --close also
//                                            needs every reserved record written
//   --self-test                              drives every judge with planted text
// Shortcuts: the comment and string blanking does not understand regex literals, `any` is read by the token before it,
// and a module-scope string literal is read by brace and parenthesis depth, a line holding `=>` taken as a function body
// and a type declaration skipped, so a literal inside a module-scope object literal is left to the mutation compare; a
// false positive is cleared by rewording the line, never by weakening a judge. The phase modes read source text with
// comments and strings blanked and match its shapes by pattern, so a reworded declaration that keeps the same meaning
// can need the pattern widened; that is a reviewed edit to this file, never a reason to skip the mode.
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, realpathSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

/** This script's own directory, relative to the repository root, with a trailing slash. */
const D = `${relative(process.cwd(), dirname(fileURLToPath(import.meta.url)))}/`;
const EVIDENCE = `${D}84-RED-EVIDENCE.md`;
const SUMMARY = `${D}84-01-SUMMARY.md`;
/** The one trailer every plan commit ends with: the project owner's line, and no other Claude name is accepted. */
const TRAILER = "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>";
const PLAN_SUBJECT = /^[a-z]+[(]84-[0-9]{2}[)]!?: /;
const GUARDED = ["AGENTS.md", "scripts/check-house-style.mjs", ".oxlintrc.json"];
/** HEAD at the start of planning, fixed: every comparison with the base reads this commit. */
const PHASE_BASE = "8ff027e1af33826bd1d90e6c039384ae8e7906dc";

const fail = (lines) => {
  console.error(lines.join("\n"));
  process.exit(1);
};
const git = (...args) => execFileSync("git", args, { encoding: "utf8", maxBuffer: 1 << 28 });
const sorted = (xs) => [...xs].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
const scratch = () => join(realpathSync(process.env.TMPDIR || "/tmp"), "qd84");

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
  [/(?<![\w.-])84-\d{2}(?!\d)/, "a plan id"],
  [/\bADPT-0\d\b/, "a requirement id"],
  [/\bWX-0\d\b/, "a requirement id"],
  [/(?<!(?:ADR|CCR|BEH|INV|ARCH)-)\bQD-84\b/, "a phase id"],
  [/\b[Pp]hase 84\b/, "a phase number"],
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
const REACT_DIR = "packages/devtools/src/react/";
const USE_CONFIGURED = `${REACT_DIR}useConfigured.ts`;
const USE_LENS = `${REACT_DIR}useLens.ts`;
const PANEL = `${REACT_DIR}QuestionsPanel.tsx`;
const LENS_SESSION = "packages/devtools/src/model/LensSession.ts";

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

/** The top-level parameters of `name`'s declaration (`const name = <T>(...)` or `function name(...)`) in blanked `code`. */
export const paramsOf = (code, name) => {
  const m = new RegExp(`(?:\\b(?:const|let)\\s+${name}\\b\\s*=\\s*|\\bfunction\\s+${name}\\b\\s*)`).exec(code);
  if (m === null) return undefined;
  let i = m.index + m[0].length;
  if (code[i] === "<") {
    let depth = 0;
    for (; i < code.length; i++) {
      if (code[i] === "<") depth++;
      else if (code[i] === ">" && code[i - 1] !== "=") {
        depth--;
        if (depth === 0) {
          i++;
          break;
        }
      }
    }
    while (/\s/.test(code[i] ?? "")) i++;
  }
  if (code[i] !== "(") return undefined;
  const end = closeOf(code, i);
  return end < 0 ? undefined : splitTop(code.slice(i + 1, end));
};

/** Every call of `name(...)` in blanked `code` that is not its declaration, as `{ line, args }`. */
export const callsOf = (code, name) =>
  [...code.matchAll(new RegExp(`(?<![.\\w$])${name}\\s*(?:<[^()]*>)?\\s*\\(`, "g"))]
    .filter((m) => !/\bfunction\s+$/.test(code.slice(0, m.index)))
    .map((m) => {
      const open = m.index + m[0].length - 1;
      return { line: lineAt(code, m.index), args: splitTop(code.slice(open + 1, closeOf(code, open))) };
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

const ADAPTERS = ["configureDock", "configureTimeline", "configureDiagnostics"];
/**
 * Reasons `useConfigured` still takes an adapter. `react` and `src` are `{ file, text }` for every file under
 * `packages/devtools/src/react` and `packages/devtools/src`; `tst` is the text of `useConfigured.tst.ts` or undefined.
 * The adapters are looked for in raw text, comments included: a comment naming a deleted function is stale too.
 */
export const judgeNoAdapter = ({ react, src, tst }) => {
  const bad = [];
  for (const { file, text } of react) {
    text.split("\n").forEach((line, i) => {
      for (const name of ADAPTERS) if (new RegExp(`\\b${name}\\b`).test(line)) bad.push(`${name} named in ${file}:${i + 1}`);
    });
  }
  const hook = react.find((f) => f.file === USE_CONFIGURED);
  if (hook === undefined) bad.push("useConfigured.ts is not found");
  else {
    const params = paramsOf(blank(hook.text), "useConfigured");
    if (params === undefined) bad.push("useConfigured has no readable parameter list");
    else if (params.length !== 2) bad.push(`useConfigured takes ${params.length} parameters, not two`);
  }
  const declared = src.flatMap(({ file, text }) => [...blank(text).matchAll(/\bexport\s+interface\s+Configurable\s*</g)].map(() => file));
  if (declared.length !== 1) bad.push(`Configurable is declared ${declared.length} times, not once`);
  else if (declared[0] !== USE_CONFIGURED) bad.push(`Configurable is declared in ${declared[0]}, not in useConfigured.ts`);
  else {
    const code = blank(hook?.text ?? "");
    const open = code.indexOf("{", code.search(/\bexport\s+interface\s+Configurable\s*</));
    const body = code.slice(open, closeOf(code, open) + 1);
    if (!/\breadonly\s+configure\s*:\s*\(/.test(body)) bad.push("Configurable's configure is not a readonly function property");
  }
  for (const { file, text } of react) {
    for (const { line, args } of callsOf(blank(text), "useConfigured")) {
      if (args.length !== 2) bad.push(`useConfigured is called with ${args.length} arguments at ${file}:${line}`);
    }
  }
  if (tst !== undefined && /\.not\.toBe(?:Callable|Constructable)With\b/.test(blank(tst))) bad.push("useConfigured.tst.ts holds a negative callable or constructable pin");
  return bad;
};

/**
 * Reasons the lens session still restates the store's `set`. `text` is `LensSession.ts`. Each of `toggle`, `hover`,
 * `cancel` and `highlight` publishes through `store.set`, `choose` calls it once, answers `false` for a move that
 * changed nothing before it arms, and arms before it sets, so a listener told of the pick can take its reveal.
 */
export const judgeNoRestatedSet = (text) => {
  const full = blank(text);
  const bad = [];
  if (/\b(?:const|let|function)\s+move\b/.test(full)) bad.push("LensSession.ts declares move");
  for (const m of full.matchAll(/\bpublish\s*\(/g)) bad.push(`LensSession.ts calls publish at line ${lineAt(full, m.index)}`);
  // The interface above the factory declares the same member names, so only the factory's object literal is read.
  const factory = full.slice(Math.max(0, full.search(/\bconst\s+makeLensSession\b/)));
  for (const name of ["toggle", "hover", "cancel", "highlight"]) {
    const body = methodBody(factory, name);
    if (body === undefined || !/\bstore\.set\s*\(/.test(body)) bad.push(`${name} does not publish through store.set`);
  }
  const choose = methodBody(factory, "choose");
  if (choose === undefined) return [...bad, "choose is not found"];
  const sets = [...choose.matchAll(/\bstore\.set\s*\(/g)];
  const arms = [...choose.matchAll(/\barmed\s*=(?!=)/g)];
  const noop = choose.search(/\breturn\s+false\b/);
  if (sets.length !== 1) bad.push(`choose calls store.set ${sets.length} times, not once`);
  if (arms.length !== 1) bad.push("choose does not assign armed once");
  if (arms.length >= 1 && (noop < 0 || noop > arms[0].index)) bad.push("choose does not answer false before it arms");
  if (arms.length >= 1 && sets.length >= 1 && arms[0].index > sets[0].index) bad.push("choose arms after it sets");
  return bad;
};

/**
 * Reasons the lens adapter does not read the guards from its one subscription and from the store. `hook` and `panel` are
 * the text of `useLens.ts` and `QuestionsPanel.tsx`. The hook takes the session and the questions store, subscribes to
 * the questions store first and the lens second, holds no ref, reads the store again when an event arrives, and names
 * what it returns; the panel does not subscribe to the questions store itself and calls the hook once.
 */
export const judgeOnePath = ({ hook, panel }) => {
  const bad = [];
  const code = blank(hook);
  const params = paramsOf(code, "useLens");
  if (params === undefined) bad.push("useLens has no readable parameter list");
  else if (params.length !== 2) bad.push(`useLens takes ${params.length} parameters, not two`);
  const reads = callsOf(code, "useStoreSnapshot");
  if (reads.length !== 2) bad.push(`useLens calls useStoreSnapshot ${reads.length} times, not twice`);
  else if (reads[0].args[0] !== "questions" || reads[1].args[0] !== "lens") bad.push("useLens does not subscribe to the questions store first and the lens second");
  if (/\buseRef\b/.test(code)) bad.push("useLens holds a ref");
  if (!/\bquestions\.getSnapshot\s*\(/.test(code)) bad.push("useLens does not read questions.getSnapshot() when an event arrives");
  if (!/\bexport\s+interface\s+UseLens\b/.test(code)) bad.push("UseLens is not declared in useLens.ts");
  const view = blank(panel);
  for (const m of view.matchAll(/\buseStoreSnapshot\s*\(\s*questions\s*\)/g)) bad.push(`QuestionsPanel.tsx subscribes to the questions store itself at line ${lineAt(view, m.index)}`);
  const used = callsOf(view, "useLens").length;
  if (used !== 1) bad.push(`QuestionsPanel.tsx calls useLens ${used} times, not once`);
  return bad;
};

/**
 * Reasons the dock's stop ledger does not exist once. `react` is `{ file, text }` for every file under
 * `packages/devtools/src/react`: the only `useRef<StopLedger` is in `useStopNotice.ts`, `StopNoticeProps` is declared once in
 * `StoppedBox.tsx`, the two notice props are aliases of it, and the dock calls the hook once per feed.
 */
export const judgeOneLedger = (react) => {
  const bad = [];
  let refs = 0;
  for (const { file, text } of react) {
    const code = blank(text);
    for (const m of code.matchAll(/\buseRef\s*<\s*StopLedger\b/g)) {
      refs++;
      if (!file.endsWith("/useStopNotice.ts")) bad.push(`useRef<StopLedger in ${file}:${lineAt(code, m.index)}`);
    }
  }
  if (refs !== 1) bad.push(`src/react holds ${refs} useRef<StopLedger calls, not one`);
  if (!react.some((f) => f.file.endsWith("/useStopNotice.ts"))) bad.push("useStopNotice.ts does not exist");
  const box = blank(react.find((f) => f.file.endsWith("/StoppedBox.tsx"))?.text ?? "");
  const declared = [...box.matchAll(/\bexport\s+(?:interface|type)\s+StopNoticeProps\b/g)].length;
  if (declared !== 1) bad.push(`StopNoticeProps is declared ${declared} times, not once in StoppedBox.tsx`);
  const all = react.map((f) => blank(f.text)).join("\n");
  for (const name of ["DiagnosticsNoticeProps", "TimelineNoticeProps"]) {
    if (!new RegExp(`\\bexport\\s+type\\s+${name}\\s*=\\s*StopNoticeProps\\s*<[^;]*>\\s*;`).test(all)) bad.push(`${name} is not an alias of StopNoticeProps`);
  }
  const dock = blank(react.find((f) => f.file.endsWith("/DevtoolsDock.tsx"))?.text ?? "");
  const calls = callsOf(dock, "useStopNotice").length;
  if (calls !== 2) bad.push(`DevtoolsDock.tsx calls useStopNotice ${calls} times, not twice`);
  return bad;
};

const collapse = (s) => s.replace(/\s+/g, " ").trim();
const ADAPTER_TEST = "packages/devtools/test/react/Lens.adapter.test.tsx";
const ADAPTER_TITLES = [
  "the panel holds one subscription to the lens while it is mounted and none after",
  "the panel holds one subscription to the questions store while it is mounted and none after",
];
/** The text of the `## <heading>` section of a markdown document, up to the next `## ` heading, or undefined. */
const sectionOf = (text, heading) => {
  const start = text.search(new RegExp(`^## ${heading}`, "m"));
  if (start < 0) return undefined;
  const rest = text.slice(start + 3);
  const next = rest.search(/^## /m);
  return next < 0 ? rest : rest.slice(0, next);
};
/** Each table row of `section` whose first cell is a backticked path, as `{ cell, text }`. */
const fileRows = (section) =>
  (section ?? "").split("\n").flatMap((line) => {
    const m = /^\| `([^`]+)` \|/.exec(line);
    return m === null ? [] : [{ cell: m[1], text: line }];
  });
/** Whether a behavior-id list such as `BEH-QD-211–218, BEH-QD-233` names `BEH-QD-<n>`, a range included. */
const covers = (text, n) =>
  [...text.matchAll(/BEH-QD-(\d+)(?:[–-](\d+))?/g)].some((m) => n >= Number(m[1]) && n <= Number(m[2] ?? m[1]));

/** Reasons a behavior's pinned-by paragraph names a test file or a title that does not exist. `tests(path)` reads a file. */
const judgePinned = (behaviors, n, tests) => {
  const section = sectionOf(behaviors, `BEH-QD-${n}:`);
  if (section === undefined) return [];
  const para = /Pinned by[\s\S]*?(?:\n\s*\n|$)/.exec(section)?.[0] ?? "";
  const paths = [...para.matchAll(/`(packages\/[^`\s]+\.(?:tsx?|mts))`/g)];
  const bad = [];
  paths.forEach((p, i) => {
    const file = p[1];
    const text = tests(file);
    if (text === undefined) {
      bad.push(`BEH-QD-${n} names ${file}, which does not exist`);
      return;
    }
    const titles = titlesOf(text).map(collapse);
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

/**
 * Reasons the records name tests that do not exist, and with `close` every reserved record is not written. `trace` and
 * `behaviors` are the texts of `spec/traceability.md` and `spec/behaviors/28-devtools-screens.md`; `tests(path)` is a test
 * file's text or undefined; `close` is undefined or `{ invariants, decisions: [{ file, text }], index, readme }`.
 */
export const judgeRecords = ({ trace, behaviors, tests }, close) => {
  const bad = [];
  const rows = fileRows(sectionOf(trace, "§4 "));
  const adapter = rows.filter((r) => r.cell === ADAPTER_TEST);
  if (adapter.length !== 1) bad.push(`spec/traceability.md §4 holds ${adapter.length} rows for ${ADAPTER_TEST}, not one`);
  else {
    for (const id of ["BEH-QD-737", "ADR-QD-193"]) if (!adapter[0].text.includes(id)) bad.push(`the Lens.adapter.test.tsx row does not name ${id}`);
    if (!adapter[0].text.includes("one subscription to the lens") || !adapter[0].text.includes("the questions store")) bad.push("the Lens.adapter.test.tsx row does not name the panel's one subscription to each store");
  }
  const own = tests(ADAPTER_TEST);
  const ownTitles = own === undefined ? [] : titlesOf(own).map(collapse);
  for (const title of ADAPTER_TITLES) if (!ownTitles.includes(title)) bad.push(`Lens.adapter.test.tsx has no test titled ${title}`);
  for (const n of [734, 736, 737, 756, 757, 758, 759, 760]) bad.push(...judgePinned(behaviors, n, tests));
  if (close === undefined) return bad;
  const one = sectionOf(trace, "§1 ") ?? "";
  for (const n of [756, 757, 758, 759, 760]) {
    if (sectionOf(behaviors, `BEH-QD-${n}:`) === undefined) bad.push(`BEH-QD-${n} has no heading in spec/behaviors/28-devtools-screens.md`);
    if (!covers(one, n)) bad.push(`BEH-QD-${n} has no row in spec/traceability.md §1`);
  }
  const two = sectionOf(trace, "§2 ") ?? "";
  for (const n of [413, 414]) {
    if (!new RegExp(`^## INV-QD-${n}:`, "m").test(close.invariants)) bad.push(`INV-QD-${n} has no heading in spec/invariants.md`);
    if (!new RegExp(`^\\| \\[INV-QD-${n}\\]`, "m").test(two)) bad.push(`INV-QD-${n} has no row in spec/traceability.md §2`);
  }
  const adr = close.decisions.find((d) => /(?:^|\/)197-[^/]*[.]md$/.test(d.file));
  if (adr === undefined) bad.push("spec/decisions/197-*.md does not exist");
  else if (!adr.text.includes("QADI-ADR-197")) bad.push("the ADR-QD-197 file does not carry QADI-ADR-197");
  if (!/^\s*-\s*id:\s*"ADR-QD-197"/m.test(close.index)) bad.push("spec/decisions/index.yaml has no ADR-QD-197 entry");
  if (!/^\| \[ADR-QD-197\]/m.test(sectionOf(trace, "§3 ") ?? "")) bad.push("ADR-QD-197 has no row in spec/traceability.md §3");
  const named = {
    [ADAPTER_TEST]: ["BEH-QD-758", "INV-QD-414"],
    "packages/devtools/test/react/useConfigured.test.tsx": ["BEH-QD-756"],
    "packages/devtools/test/model/LensSession.test.ts": ["BEH-QD-757", "INV-QD-413"],
    "packages/devtools/test/react/Lens.questions.characterisation.test.tsx": [],
    "packages/devtools/test/react/DockFrame.stops.characterisation.test.tsx": [],
    "packages/devtools/test/react/useTimeline.inputs.characterisation.test.tsx": [],
    "packages/devtools/test/react/useConfigured.tst.ts": [],
  };
  for (const [file, ids] of Object.entries(named)) {
    const hits = rows.filter((r) => r.cell === file);
    if (hits.length !== 1) bad.push(`spec/traceability.md §4 holds ${hits.length} rows for ${file}, not one`);
    else for (const id of ids) if (!hits[0].text.includes(id)) bad.push(`the ${file.split("/").pop()} row does not name ${id}`);
  }
  if (!/^\| CCR-QD-476 \|/m.test(close.readme)) bad.push("spec/README.md has no CCR-QD-476 row");
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

const readText = (file) => readFileSync(file, "utf8");
/** Every tracked or untracked file of `packages/devtools/src` (or its `react` folder) as `{ file, text }`. */
const reactFiles = () => trackedFiles(REACT_DIR, /[.]tsx?$/).map(textOf);
const srcFiles = () => trackedFiles("packages/devtools/src", /[.]tsx?$/).map(textOf);

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
  trailers: () => {
    const plan = commitsSince(readBase()).filter((c) => PLAN_SUBJECT.test(c.subject));
    const bad = plan.flatMap((c) => judgeTrailer(c.message).map((r) => `${c.sha.slice(0, 8)} ${c.subject}: ${r}`));
    if (plan.length === 0) bad.push("no plan commit since phase_base");
    return done(bad, `trailers: ${plan.length} plan commits, each with the one trailer`);
  },
  "no-adapter": () => {
    const tstFile = "packages/devtools/test/react/useConfigured.tst.ts";
    const bad = judgeNoAdapter({ react: reactFiles(), src: srcFiles(), tst: existsSync(tstFile) ? readText(tstFile) : undefined });
    return done(bad, "no-adapter: useConfigured takes a value that has configure, and no adapter is left");
  },
  "no-restated-set": () => done(judgeNoRestatedSet(readText(LENS_SESSION)), "no-restated-set: every move goes through the store's set, and choose arms before it"),
  "one-path": () => done(judgeOnePath({ hook: readText(USE_LENS), panel: readText(PANEL) }), "one-path: the lens adapter reads the guards from its one subscription and from the store"),
  "one-ledger": () => done(judgeOneLedger(reactFiles()), "one-ledger: one stop ledger, in useStopNotice, called once per feed"),
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
    const ok = "records: the adapter row and the pinned-by lists name tests that exist";
    return done(judgeRecords({ trace: readText("spec/traceability.md"), behaviors: readText("spec/behaviors/28-devtools-screens.md"), tests }, extra), close ? `${ok}, and every reserved record is written` : ok);
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
  eq("a file with no title has none", titlesOf("const a = 1;"), []);
  const evidence = "- failed: plain\n- failed (reason): on the next line\n- red on the base: single\n- failed:not this\n";
  eq("evidence in each form names its title", judgeSeenFailing(suite, evidence, ["plain", "on the next line", "single"]), []);
  eq("a title with no line fails", judgeSeenFailing(suite, evidence, ["tpl"]).length, 1);
  eq("with no title asked, every title is asked", judgeSeenFailing(suite, evidence, []).length, 3);
  eq("a file with no title fails", judgeSeenFailing("x", evidence, []).length, 1);
  eq("a title compared exactly fails on a prefix", judgeSeenFailing('it("pla", () => {});', evidence, []).length, 1);

  const idEntry = (file, line, text = line) => ({ file, text, added: new Set([1]) });
  for (const line of ["// D-49 says", "see 84-03", "ADPT-02 holds", "WX-05", "QD-84 closes", "Phase 84 added", "phase 84", "ADR-QD-NEXT", "x BEH-QD-NEXT y"]) {
    eq(`${line} is flagged`, judgeIds([idEntry("packages/devtools/src/a.ts", line)]).length, 1);
  }
  for (const line of ["ADR-QD-197", "INV-QD-413", "BEH-QD-756", "D-49-a", "CCR-QD-476", "ARCH-131", "ADR-QD-84", "a 1284-03x", "x184-03"]) {
    eq(`${line} is not flagged`, judgeIds([idEntry("packages/devtools/src/a.ts", line)]), []);
  }
  for (const line of ["this phase", "Until Now", "any more", "no longer", "from now on"]) {
    eq(`${line} is flagged in source`, judgeIds([idEntry("packages/devtools/src/a.ts", line)]).length, 1);
  }
  eq("a changeset may say no longer", judgeIds([idEntry(".changeset/a.md", "no longer")]), []);
  eq("the upgrade guide may say no longer", judgeIds([idEntry("apps/website/src/content/docs/docs/reference/upgrading.md", "no longer")]), []);
  eq("a changeset is still scanned for ids", judgeIds([idEntry(".changeset/a.md", "ADPT-01")]).length, 1);
  const spec = "# Title\nno longer here\n## Change History\n| 1 | no longer a row |\n";
  eq("a phrase before the change history is flagged", judgeIds([{ file: "spec/a.md", text: spec, added: new Set([2]) }]).length, 1);
  eq("a phrase in the change history is exempt", judgeIds([{ file: "spec/a.md", text: spec, added: new Set([4]) }]), []);
  const header = "> | Change History | 1.1 (2026-11-24): a row\n> | Status | no longer here\n";
  eq("a phrase in the Document Control history row is exempt", judgeIds([{ file: "spec/a.md", text: header.replace("a row", "no longer a row"), added: new Set([1]) }]), []);
  eq("a phrase in another Document Control row is flagged", judgeIds([{ file: "spec/a.md", text: header, added: new Set([2]) }]).length, 1);
  eq("an older entry of the Document Control history row is not new text", judgeIds([{ file: "spec/a.md", text: "> | Change History | 1.2 (2026-11-24): a row<br>1.1 (2026-11-10): D-01 approved, no longer<br>1.0 (2026-11-09): Initial\n", added: new Set([1]) }]), []);
  eq("an id in the Document Control history row is still flagged", judgeIds([{ file: "spec/a.md", text: "> | Change History | 1.1 (2026-11-24): ADPT-01\n", added: new Set([1]) }]).length, 1);

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
  const PLAN = "docs(84-01): record";
  const log = [c("docs(84): create phase plan", [".planning/a.md"]), c("docs(phase-84): add pattern map", [".planning/b.md"]), c(PLAN, ["b", "a"]), c("chore(84-01): next", ["z"])];
  eq("--first passes over planning commits that change only .planning", judgeCommit(log, PLAN, ["a", "b"], true), []);
  eq("the second plan commit passes without --first", judgeCommit(log, "chore(84-01): next", ["z"], false), []);
  eq("--first on the second plan commit fails", judgeCommit(log, "chore(84-01): next", ["z"], true)[0].startsWith("the commit is not the first plan commit"), true);
  eq("a commit before the first plan commit that changes source fails", judgeCommit([c("docs(84): x", [".planning/a.md", "packages/x.ts"]), c(PLAN, ["a"])], PLAN, ["a"], true), ["docs(84): x precedes the first plan commit and changes packages/x.ts outside .planning"]);
  eq("a wrong subject fails", judgeCommit(log, "other", ["a"], false).length, 1);
  eq("an extra path fails", judgeCommit(log, PLAN, ["a"], false).length, 1);
  eq("a missing path fails", judgeCommit(log, PLAN, ["a", "b", "c"], false).length, 1);
  eq("a duplicate subject fails", judgeCommit([c(PLAN, ["a"]), c(PLAN, ["a"])], PLAN, ["a"], false).length, 1);
  eq("a commit without the trailer fails", judgeCommit([c(PLAN, ["a"], PLAN)], PLAN, ["a"], false).length, 1);
  eq("a Phase 83 subject is refused by commit", judgeCommit([c("docs(83-01): x", ["a"])], PLAN, ["a"], false).length, 1);
  eq("a Phase 83 subject is not a plan commit", PLAN_SUBJECT.test("docs(83-01): x"), false);
  eq("a Phase 84 subject is a plan commit", PLAN_SUBJECT.test("chore(84-12)!: x"), true);
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

  // The parameter and argument readers.
  eq("a generic constraint is not a parameter", paramsOf("export const f = <A extends C<I>, I>(a: () => X<A, never>, b: I): A => a;", "f"), ["a: () => X<A, never>", "b: I"]);
  eq("a trailing comma is not a parameter", paramsOf("const f = (a: A,\n b: B,\n) => a;", "f"), ["a: A", "b: B"]);
  eq("a function declaration is read", paramsOf("function f(a: A) {}", "f"), ["a: A"]);
  eq("a name that is not declared has no parameters", paramsOf("const g = (a) => a;", "f"), undefined);
  eq("a call is read with its line and arguments", callsOf("x\nconst a = f(g(1, 2), { k: [1, 2] });", "f"), [{ line: 2, args: ["g(1, 2)", "{ k: [1, 2] }"] }]);
  eq("a method call is not a call of the name", callsOf("o.f(1);", "f"), []);

  // no-adapter.
  const inReact = (name, text) => ({ file: `${REACT_DIR}${name}`, text });
  const hookOk = [
    '"use client";',
    "export interface Configurable<I> {",
    "  readonly configure: (inputs: I) => void;",
    "}",
    "export const useConfigured = <A extends Configurable<I>, I>(",
    "  make: () => Effect.Effect<A, never, Scope.Scope>,",
    "  inputs: I,",
    "): A | undefined => {",
    "  return useScoped(make);",
    "};",
    "",
  ].join("\n");
  const dockOk = "export const useDockModel = (inputs: DockModelInputs) => useConfigured(makeDockModel, inputs);\n";
  const timelineOk = "const feed = useConfigured(makeTimelineFeed, { source, capacity });\n";
  const adapter = (over = {}, extra = [], tst = undefined) => {
    const react = [inReact("useConfigured.ts", hookOk), inReact("useDockModel.ts", dockOk), inReact("useTimeline.ts", timelineOk)].map((f) => {
      const name = f.file.split("/").pop();
      return over[name] === undefined ? f : { ...f, text: over[name] };
    });
    return judgeNoAdapter({ react, src: [...react, ...extra], tst });
  };
  eq("a value that has configure and no adapter passes", adapter(), []);
  eq("an adapter named in a comment is flagged", adapter({ "useDockModel.ts": `// was configureDock\n${dockOk}` }), [`configureDock named in ${REACT_DIR}useDockModel.ts:1`]);
  for (const name of ADAPTERS) eq(`${name} is flagged`, adapter({ "useTimeline.ts": `const ${name} = 1;\n${timelineOk}` }).length, 1);
  eq("a third parameter is flagged", adapter({ "useConfigured.ts": hookOk.replace("  inputs: I,", "  configure: (value: A, inputs: I) => void,\n  inputs: I,") }), ["useConfigured takes 3 parameters, not two"]);
  eq("a second declaration of Configurable is flagged", adapter({}, [{ file: "packages/devtools/src/model/X.ts", text: "export interface Configurable<I> {}\n" }]), ["Configurable is declared 2 times, not once"]);
  eq("no declaration of Configurable is flagged", adapter({ "useConfigured.ts": hookOk.replace(/export interface Configurable[\s\S]*?\n}\n/, "") }), ["Configurable is declared 0 times, not once"]);
  eq("a Configurable declared elsewhere is flagged", adapter({ "useConfigured.ts": hookOk.replace(/export interface Configurable[\s\S]*?\n}\n/, "") }, [{ file: "packages/devtools/src/model/X.ts", text: "export interface Configurable<I> {}\n" }]), ["Configurable is declared in packages/devtools/src/model/X.ts, not in useConfigured.ts"]);
  eq("a method signature for configure is flagged", adapter({ "useConfigured.ts": hookOk.replace("readonly configure: (inputs: I) => void;", "configure(inputs: I): void;") }), ["Configurable's configure is not a readonly function property"]);
  eq("a call with three arguments is flagged", adapter({ "useTimeline.ts": "const feed = useConfigured(makeTimelineFeed, configureTimeline, { source });\n" }).includes(`useConfigured is called with 3 arguments at ${REACT_DIR}useTimeline.ts:1`), true);
  eq("a call with one argument is flagged", adapter({ "useTimeline.ts": "const feed = useConfigured(makeTimelineFeed);\n" }), [`useConfigured is called with 1 arguments at ${REACT_DIR}useTimeline.ts:1`]);
  eq("a negative callable pin in the type test is flagged", adapter({}, [], "expect(f).type.not.toBeCallableWith(1);\n"), ["useConfigured.tst.ts holds a negative callable or constructable pin"]);
  eq("a negative constructable pin in the type test is flagged", adapter({}, [], "expect(f).type.not.toBeConstructableWith(1);\n").length, 1);
  eq("a positive pin in the type test passes", adapter({}, [], "expect<A>().type.toBeAssignableTo<B>();\n"), []);
  eq("a missing useConfigured.ts is flagged", judgeNoAdapter({ react: [inReact("useDockModel.ts", dockOk)], src: [], tst: undefined }).includes("useConfigured.ts is not found"), true);

  // no-restated-set.
  const lensOk = [
    "export interface LensSession {",
    "  readonly toggle: () => void;",
    "  readonly choose: (id: string | undefined) => boolean;",
    "}",
    "export const makeLensSession = (): LensSession => {",
    "  let armed: string | undefined;",
    "  const store = makeExternalStore(IDLE);",
    "  return {",
    "    toggle: () => {",
    "      armed = undefined;",
    "      store.set(toggled(store.getSnapshot()));",
    "    },",
    "    hover: (id) => {",
    "      store.set(hovered(store.getSnapshot())(id));",
    "    },",
    "    choose: (id) => {",
    "      const current = store.getSnapshot();",
    "      const next = chosen(current)(id);",
    "      if (next === current) return false;",
    "      armed = pickedOf(next);",
    "      store.set(next);",
    "      return true;",
    "    },",
    "    cancel: () => {",
    "      armed = undefined;",
    "      store.set(cancelled(store.getSnapshot()));",
    "    },",
    "    highlight: (ids) => {",
    "      armed = undefined;",
    "      store.set(highlighted(store.getSnapshot())(ids));",
    "    },",
    "  };",
    "};",
    "",
  ].join("\n");
  eq("a session whose every move goes through set and whose choose arms first passes", judgeNoRestatedSet(lensOk), []);
  const withMove = lensOk.replace("  const store = makeExternalStore(IDLE);", "  const store = makeExternalStore(IDLE);\n  const move = (next: LensSnapshot): void => {\n    store.publish(next);\n  };");
  eq("a declared move and its publish are flagged", judgeNoRestatedSet(withMove), ["LensSession.ts declares move", "LensSession.ts calls publish at line 9"]);
  eq("a command that goes through move is flagged", judgeNoRestatedSet(lensOk.replace("store.set(toggled(store.getSnapshot()));", "move(toggled(store.getSnapshot()));")), ["toggle does not publish through store.set"]);
  eq("hover, cancel and highlight are each read", ["hover: (id) => {\n      store.set(hovered(store.getSnapshot())(id));", "cancel: () => {\n      armed = undefined;\n      store.set(cancelled(store.getSnapshot()));", "highlight: (ids) => {\n      armed = undefined;\n      store.set(highlighted(store.getSnapshot())(ids));"].map((piece) => judgeNoRestatedSet(lensOk.replace(piece, piece.replace("store.set(", "move("))).length), [1, 1, 1]);
  eq("an expression-bodied command is read", judgeNoRestatedSet(lensOk.replace("hover: (id) => {\n      store.set(hovered(store.getSnapshot())(id));\n    },", "hover: (id) => store.set(hovered(store.getSnapshot())(id)),")), []);
  eq("a choose with two sets is flagged", judgeNoRestatedSet(lensOk.replace("      return true;", "      store.set(next);\n      return true;")), ["choose calls store.set 2 times, not once"]);
  eq("a choose that arms after it sets is flagged", judgeNoRestatedSet(lensOk.replace("      armed = pickedOf(next);\n      store.set(next);", "      store.set(next);\n      armed = pickedOf(next);")), ["choose arms after it sets"]);
  eq("a choose with no early false is flagged", judgeNoRestatedSet(lensOk.replace("      if (next === current) return false;\n", "")), ["choose does not answer false before it arms"]);
  eq("a choose whose false comes after it arms is flagged", judgeNoRestatedSet(lensOk.replace("      if (next === current) return false;\n      armed = pickedOf(next);", "      armed = pickedOf(next);\n      if (next === current) return false;")), ["choose does not answer false before it arms"]);
  eq("a choose that never arms is flagged", judgeNoRestatedSet(lensOk.replace("      armed = pickedOf(next);\n", "")), ["choose does not assign armed once"]);
  eq("a missing choose is flagged", judgeNoRestatedSet(lensOk.replace("choose: (id) => {", "chose: (id) => {")).includes("choose is not found"), true);
  eq("a publish named in a comment is not a call", judgeNoRestatedSet(`// store.publish(next)\n${lensOk}`), []);

  // one-path.
  const lensHookOk = [
    "export interface UseLens {",
    "  readonly lens: LensSnapshot;",
    "  readonly questions: QuestionsSnapshot;",
    "}",
    "export const useLens = (lens: LensSession, questions: ReadableStore<QuestionsSnapshot>): UseLens => {",
    "  const read = { questions: useStoreSnapshot(questions), lens: useStoreSnapshot(lens) };",
    "  useEffect(() => {",
    "    const move = (): void => lens.hover(gateIdAt(document, 0, 0, questions.getSnapshot().instances));",
    "  }, [lens, questions]);",
    "  return read;",
    "};",
    "",
  ].join("\n");
  const panelOk = "export const QuestionsPanel = ({ questions, lens }) => {\n  const read = useLens(lens, questions);\n  return read;\n};\n";
  const path = (hook = lensHookOk, panel = panelOk) => judgeOnePath({ hook, panel });
  eq("a lens adapter handed the session and the store passes", path(), []);
  eq("a third parameter is flagged in useLens", path(lensHookOk.replace("): UseLens", ", instances: Instances): UseLens")), ["useLens takes 3 parameters, not two"]);
  eq("one subscription is flagged", path(lensHookOk.replace(", lens: useStoreSnapshot(lens)", "")), ["useLens calls useStoreSnapshot 1 times, not twice"]);
  eq("the lens subscribed before the store is flagged", path(lensHookOk.replace("questions: useStoreSnapshot(questions), lens: useStoreSnapshot(lens)", "lens: useStoreSnapshot(lens), questions: useStoreSnapshot(questions)")), ["useLens does not subscribe to the questions store first and the lens second"]);
  eq("a ref in useLens is flagged", path(`${lensHookOk}const r = useRef(1);\n`), ["useLens holds a ref"]);
  eq("a hook that never reads the store again is flagged", path(lensHookOk.replace("questions.getSnapshot().instances", "[]")), ["useLens does not read questions.getSnapshot() when an event arrives"]);
  eq("an undeclared UseLens is flagged", path(lensHookOk.replace("export interface UseLens", "interface UseLens")), ["UseLens is not declared in useLens.ts"]);
  eq("a panel that subscribes to the store itself is flagged", path(lensHookOk, `const snapshot = useStoreSnapshot(questions);\n${panelOk}`), ["QuestionsPanel.tsx subscribes to the questions store itself at line 1"]);
  eq("a panel that calls useLens twice is flagged", path(lensHookOk, `${panelOk}const again = useLens(lens, questions);\n`), ["QuestionsPanel.tsx calls useLens 2 times, not once"]);
  eq("a subscription to another store in the panel is not flagged", path(lensHookOk, `const o = useStoreSnapshot(lens);\n${panelOk}`), []);

  // one-ledger.
  const ledgerOk = [
    inReact("useStopNotice.ts", "export const useStopNotice = <S,>(status: S, onRestart: () => void) => {\n  const announced = useRef<StopLedger<S>>(noStops);\n  return announced;\n};\n"),
    inReact("StoppedBox.tsx", "export interface StopLedger<S> {}\nexport interface StopNoticeProps<S> {}\n"),
    inReact("DiagnosticsNotice.tsx", "export type DiagnosticsNoticeProps = StopNoticeProps<DiagnosticsStatus>;\n"),
    inReact("TimelineNotice.tsx", "export type TimelineNoticeProps = StopNoticeProps<TimelineStatus>;\n"),
    inReact("DevtoolsDock.tsx", "const a = useStopNotice(status, model.diagnostics.restart);\nconst b = useStopNotice(timelineStatus, model.timelineStatus.restart);\n"),
  ];
  const ledger = (over = {}) => judgeOneLedger(ledgerOk.map((f) => (over[f.file.split("/").pop()] === undefined ? f : { ...f, text: over[f.file.split("/").pop()] })));
  eq("one ledger, in the hook, called once per feed passes", ledger(), []);
  eq("a ledger in the dock is flagged twice over", ledger({ "DevtoolsDock.tsx": "const announced = useRef<StopLedger<DiagnosticsStatus>>(noStops);\nconst a = useStopNotice(s, r);\nconst b = useStopNotice(t, r);\n" }), [`useRef<StopLedger in ${REACT_DIR}DevtoolsDock.tsx:1`, "src/react holds 2 useRef<StopLedger calls, not one"]);
  eq("no hook file is flagged", judgeOneLedger(ledgerOk.slice(1)).includes("useStopNotice.ts does not exist"), true);
  eq("a second StopNoticeProps is flagged", ledger({ "StoppedBox.tsx": "export interface StopLedger<S> {}\nexport interface StopNoticeProps<S> {}\nexport type StopNoticeProps<S> = {};\n" }), ["StopNoticeProps is declared 2 times, not once in StoppedBox.tsx"]);
  eq("an interface that is not an alias is flagged", ledger({ "DiagnosticsNotice.tsx": "export interface DiagnosticsNoticeProps {}\n" }), ["DiagnosticsNoticeProps is not an alias of StopNoticeProps"]);
  eq("a dock that calls the hook once is flagged", ledger({ "DevtoolsDock.tsx": "const a = useStopNotice(status, r);\n" }), ["DevtoolsDock.tsx calls useStopNotice 1 times, not twice"]);
  eq("a ledger named in a comment is not a call", ledger({ "DevtoolsDock.tsx": `// useRef<StopLedger<S>>(noStops)\n${ledgerOk[4].text}` }), []);

  // records.
  const rec = (file, text) => `| \`${file}\` | ${text} |`;
  const T_USE = "packages/devtools/test/react/useConfigured.test.tsx";
  const T_LENS = "packages/devtools/test/model/LensSession.test.ts";
  const T_Q = "packages/devtools/test/react/Lens.questions.characterisation.test.tsx";
  const T_S = "packages/devtools/test/react/DockFrame.stops.characterisation.test.tsx";
  const T_I = "packages/devtools/test/react/useTimeline.inputs.characterisation.test.tsx";
  const T_TST = "packages/devtools/test/react/useConfigured.tst.ts";
  const traceRows = {
    [ADAPTER_TEST]: "BEH-QD-737, ADR-QD-193, BEH-QD-758, INV-QD-414: one subscription to the lens and one to the questions store",
    [T_USE]: "BEH-QD-756",
    [T_LENS]: "BEH-QD-757, INV-QD-413",
    [T_Q]: "x",
    [T_S]: "x",
    [T_I]: "x",
    [T_TST]: "x",
  };
  const traceOf = (rows = traceRows, over = {}) =>
    [
      "## §1 Behavior to source",
      "",
      over.one ?? "| 28 | BEH-QD-211–218, BEH-QD-756–760 | `x` |",
      "",
      "## §2 Invariant traceability",
      "",
      over.two ?? "| [INV-QD-413](a) | d |\n| [INV-QD-414](a) | d |",
      "",
      "## §3 Decision traceability",
      "",
      over.three ?? "| [ADR-QD-197](a) | t |",
      "",
      "## §4 Test file map",
      "",
      "| Test file | Covers |",
      "| --- | --- |",
      ...Object.entries(rows).map(([file, text]) => rec(file, text)),
      "",
      "## §5 Acceptance",
      "",
    ].join("\n");
  const A = "packages/devtools/test/react/A.test.tsx";
  const B = "packages/devtools/test/react/B.test.ts";
  const behOf = (n, body) => `## BEH-QD-${n}: heading\n\n> **Decision:** x\n\n${body}\n\nSpecified in ADR-QD-193 (CCR-QD-472).\n\n`;
  const pinned = `Pinned by \`${A}\` ("a title"; U1, the row), \`${B}\` ("b title that\nspans two lines").`;
  const behaviors = (over = {}) => `${behOf(737, over.pinned ?? pinned)}${behOf(738, "none")}`;
  const files = {
    [A]: 'it("U1 the row", () => {});\nit("a title", () => {});\n',
    [B]: 'it("b title that spans two lines", () => {});\n',
    [ADAPTER_TEST]: ADAPTER_TITLES.map((t) => `it("${t}", () => {});`).join("\n"),
  };
  const recs = (over = {}, close = undefined, fs = files) => judgeRecords({ trace: over.trace ?? traceOf(), behaviors: over.behaviors ?? behaviors(), tests: (p) => fs[p] }, close);
  eq("records that agree pass", recs(), []);
  eq("an adapter row found twice fails", recs({ trace: traceOf().replace("## §5", rec(ADAPTER_TEST, "again") + "\n\n## §5") }), [`spec/traceability.md §4 holds 2 rows for ${ADAPTER_TEST}, not one`]);
  eq("an adapter row that is missing fails", recs({ trace: traceOf({ [T_USE]: "x" }) }), [`spec/traceability.md §4 holds 0 rows for ${ADAPTER_TEST}, not one`]);
  eq("a row found by its first cell, not by a mention in another row", recs({ trace: traceOf({ ...traceRows, [T_Q]: `see ${ADAPTER_TEST}` }) }), []);
  eq("an adapter row that does not name ADR-QD-193 fails", recs({ trace: traceOf({ ...traceRows, [ADAPTER_TEST]: traceRows[ADAPTER_TEST].replace("ADR-QD-193", "x") }) }), ["the Lens.adapter.test.tsx row does not name ADR-QD-193"]);
  eq("an adapter row that does not name BEH-QD-737 fails", recs({ trace: traceOf({ ...traceRows, [ADAPTER_TEST]: traceRows[ADAPTER_TEST].replace("BEH-QD-737", "x") }) }), ["the Lens.adapter.test.tsx row does not name BEH-QD-737"]);
  eq("an adapter row that lost the subscription pins fails", recs({ trace: traceOf({ ...traceRows, [ADAPTER_TEST]: "BEH-QD-737, ADR-QD-193" }) }), ["the Lens.adapter.test.tsx row does not name the panel's one subscription to each store"]);
  eq("an adapter test without the two titles fails", recs({}, undefined, { ...files, [ADAPTER_TEST]: 'it("other", () => {});' }).length, 2);
  eq("a quoted title that no test holds fails", recs({ behaviors: behaviors({ pinned: pinned.replace("a title", "a titel") }) }), [`BEH-QD-737 quotes "a titel" for ${A}, which holds no such test`]);
  eq("a title quoted under the wrong file fails", recs({ behaviors: behaviors({ pinned: pinned.replace('("a title"; U1, the row)', '("a title"; "b title that spans two lines"; U1, the row)') }) }), [`BEH-QD-737 quotes "b title that spans two lines" for ${A}, which holds no such test`]);
  eq("a quoted title is matched whole, not by its prefix", recs({ behaviors: behaviors({ pinned: pinned.replace("a title", "a") }) }).length, 1);
  eq("a row id that no title opens fails", recs({ behaviors: behaviors({ pinned: pinned.replace("U1,", "U2,") }) }), [`BEH-QD-737 names row U2 for ${A}, which no title opens`]);
  eq("a row id with no digits is not a row id", recs({ behaviors: behaviors({ pinned: pinned.replace("U1,", "U,") }) }), []);
  eq("a row id is not satisfied by a longer id", recs({}, undefined, { ...files, [A]: files[A].replace("U1 the row", "U10 the row") }), [`BEH-QD-737 names row U1 for ${A}, which no title opens`]);
  eq("a pinned file that does not exist fails", recs({}, undefined, { ...files, [B]: undefined }), [`BEH-QD-737 names ${B}, which does not exist`]);
  eq("a behavior with no heading is skipped", recs({ behaviors: "## BEH-QD-999: x\n" }), []);
  eq("a pinned-by paragraph ends at the blank line", recs({ behaviors: `${behOf(737, pinned)}Quoted later: "not a title".\n` }), []);

  const closeText = {
    invariants: "## INV-QD-413: a\n\n## INV-QD-414: b\n",
    decisions: [{ file: "197-a-configurable-value.md", text: "| Document ID | QADI-ADR-197 |" }],
    index: '  - id: "ADR-QD-197"\n    file: "197-x.md"\n',
    readme: "| CCR-QD-476 | 2026-11-25 | x |\n",
  };
  const closeBeh = [756, 757, 758, 759, 760].map((n) => behOf(n, `Pinned by \`${A}\` ("a title").`)).join("");
  const closed = (over = {}, close = closeText) => recs({ behaviors: `${behaviors()}${closeBeh}`, ...over }, close);
  eq("a close with every reserved record written passes", closed(), []);
  eq("a close with no BEH heading fails", closed({ behaviors: behaviors() }).includes("BEH-QD-756 has no heading in spec/behaviors/28-devtools-screens.md"), true);
  eq("a BEH outside every range of section 1 fails", closed({ trace: traceOf(traceRows, { one: "| 28 | BEH-QD-211–218, BEH-QD-756–759 | `x` |" }) }), ["BEH-QD-760 has no row in spec/traceability.md §1"]);
  eq("a single BEH named in section 1 is covered", closed({ trace: traceOf(traceRows, { one: "| 28 | BEH-QD-756–759, BEH-QD-760 | `x` |" }) }), []);
  eq("a missing INV row fails", closed({ trace: traceOf(traceRows, { two: "| [INV-QD-413](a) | d |" }) }), ["INV-QD-414 has no row in spec/traceability.md §2"]);
  eq("a missing INV heading fails", closed({}, { ...closeText, invariants: "## INV-QD-413: a\n" }), ["INV-QD-414 has no heading in spec/invariants.md"]);
  eq("a missing ADR file fails", closed({}, { ...closeText, decisions: [] }), ["spec/decisions/197-*.md does not exist"]);
  eq("an ADR file without its document id fails", closed({}, { ...closeText, decisions: [{ file: "197-x.md", text: "none" }] }), ["the ADR-QD-197 file does not carry QADI-ADR-197"]);
  eq("a missing index entry fails", closed({}, { ...closeText, index: "" }), ["spec/decisions/index.yaml has no ADR-QD-197 entry"]);
  eq("a missing section 3 row fails", closed({ trace: traceOf(traceRows, { three: "| [ADR-QD-196](a) | t |" }) }), ["ADR-QD-197 has no row in spec/traceability.md §3"]);
  eq("a missing section 4 row for a born file fails", closed({ trace: traceOf(Object.fromEntries(Object.entries(traceRows).filter(([f]) => f !== T_S))) }), [`spec/traceability.md §4 holds 0 rows for ${T_S}, not one`]);
  eq("a LensSession row that lost INV-QD-413 fails", closed({ trace: traceOf({ ...traceRows, [T_LENS]: "BEH-QD-757" }) }), ["the LensSession.test.ts row does not name INV-QD-413"]);
  eq("an adapter row that lost BEH-QD-758 fails", closed({ trace: traceOf({ ...traceRows, [ADAPTER_TEST]: traceRows[ADAPTER_TEST].replace("BEH-QD-758", "x") }) }), ["the Lens.adapter.test.tsx row does not name BEH-QD-758"]);
  eq("a missing CCR row fails", closed({}, { ...closeText, readme: "" }), ["spec/README.md has no CCR-QD-476 row"]);
  eq("the close checks are not run without --close", recs({ behaviors: behaviors() }), []);

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
  if (mode === undefined || !Object.hasOwn(MODES, mode)) fail([`usage: node 84-check.mjs ${Object.keys(MODES).join("|")}`]);
  else MODES[mode](args);
}
