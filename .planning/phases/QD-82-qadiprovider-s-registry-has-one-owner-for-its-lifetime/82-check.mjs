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
//   single-owner                             the registry's lifetime is decided once, in RegistryLease.ts
//   --self-test                              drives every judge with planted text
// Shortcuts: the comment and string blanking does not understand regex literals, `any` is read by the token before it,
// and a module-scope string literal is read by brace and parenthesis depth, a line holding `=>` taken as a function body
// and a type declaration skipped, so a literal inside a module-scope object literal is left to the mutation compare; the
// import specifiers of `single-owner` are read from statements that start a line; a false positive is cleared by
// rewording the line, never by weakening a judge.
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, realpathSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

/** This script's own directory, relative to the repository root, with a trailing slash. */
const D = `${relative(process.cwd(), dirname(fileURLToPath(import.meta.url)))}/`;
const EVIDENCE = `${D}82-RED-EVIDENCE.md`;
const SUMMARY = `${D}82-01-SUMMARY.md`;
const TRAILER = /^Co-Authored-By: Claude [^<>]+ <noreply@anthropic[.]com>$/;
const PLAN_SUBJECT = /^[a-z]+[(]82-[0-9]{2}[)]!?: /;
const GUARDED = ["AGENTS.md", "scripts/check-house-style.mjs", ".oxlintrc.json"];

const fail = (lines) => {
  console.error(lines.join("\n"));
  process.exit(1);
};
const git = (...args) => execFileSync("git", args, { encoding: "utf8", maxBuffer: 1 << 28 });
const sorted = (xs) => [...xs].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
const scratch = () => join(realpathSync(process.env.TMPDIR || "/tmp"), "qd82");

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

/** Text with comments, and unless `blankStrings` is false the text of strings and templates, blanked to spaces, newlines kept; `${ }` stays code. */
export const blank = (text, blankStrings = true) => {
  const keep = (c) => (c === "\n" ? "\n" : " ");
  const inString = (c) => (blankStrings ? keep(c) : c);
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
        out += inString(c);
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
        out += inString(text[i] ?? "");
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
  [/(?<![\w.-])82-\d{2}(?!\d)/, "a plan id"],
  [/\bLEASE-0\d\b/, "a requirement id"],
  [/\bWX-0\d\b/, "a requirement id"],
  [/(?<!(?:ADR|CCR|BEH|INV|ARCH)-)\bQD-82\b/, "a phase id"],
  [/\b[Pp]hase 82\b/, "a phase number"],
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
        if (entry.file.startsWith("packages/react/src/") && depth[n - 1] === 0 && parens[n - 1] === 0 && /["'`]/.test(line) && !covered.has(n) && !line.includes("=>") && !/^\s*(?:export\s+)?(?:type|interface|declare)\b/.test(line)) note("a module-scope string literal");
      }
      for (const [re, what] of EVERYWHERE) if (re.test(line)) note(what);
      if (/\bas\s+(?!const\b)/.test(line) && !covered.has(n)) note("an as cast");
    }
  }
  return bad;
};

/** Reasons the budget-carrying files moved from the base. */
export const judgeGuards = (changed) => changed.map((p) => `${p} differs from phase_base: no budget moves`);

const LEASE = "packages/react/src/RegistryLease.ts";
const PROVIDER = "packages/react/src/QadiProvider.tsx";
const BARREL = "packages/react/src/index.ts";
const STRYKER = "stryker.react.mjs";
const FORBIDDEN_IMPORTS = /^(?:react|react-dom|@effect\/atom-react)$|(?:^|\/)QadiProvider\.tsx$/;

/** The text spans of every `useEffect(...)` (also layout and insertion) call in blanked code, as [start, end). */
const effectSpans = (code) => {
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

/** The module specifiers an import or re-export statement that starts a line names, in comment-blanked text. */
const specifiersOf = (text) => [...text.matchAll(/^[ \t]*(?:import|export)\b[^;]*?\bfrom\s*(["'])([^"']+)\1|^[ \t]*import\s*(["'])([^"']+)\3/gm)].map((m) => m[2] ?? m[4]);

/**
 * Reasons the registry's lifetime is not decided once, in `RegistryLease.ts`. `files` holds `lease` (undefined when the file
 * does not exist), `provider`, `barrel` and `stryker` as text; every test of code is on text with comments and strings
 * blanked, and the specifiers and the mutate list are read with only comments blanked. Pure.
 */
export const judgeSingleOwner = ({ lease, provider, barrel, stryker }) => {
  const bad = [];
  if (lease === undefined) bad.push("RegistryLease.ts is missing");
  else {
    const code = blank(lease);
    if (specifiersOf(blank(lease, false)).some((s) => FORBIDDEN_IMPORTS.test(s))) bad.push("RegistryLease.ts imports React or the provider");
    if (/\bscheduleTask\b|\bdefaultIdleTTL\b|\bdisposed\b|\.dispose\(|\.reset\(|sweep/i.test(code)) bad.push("RegistryLease.ts reaches the registry or the sweep");
    const lines = code.split("\n");
    let depth = 0;
    let state = false;
    for (const line of lines) {
      if (depth === 0 && (/^\s*(?:export\s+)?(?:let|var)\s/.test(line) || /^\s*(?:export\s+)?const\s+[\w$]+(?:\s*:[^=]+)?\s*=\s*new\s+(?:Map|Set|WeakMap|WeakSet|Array)\b/.test(line))) state = true;
      for (const c of line) depth += c === "{" ? 1 : c === "}" ? -1 : 0;
    }
    if (state) bad.push("RegistryLease.ts holds module-scope state");
  }
  if (/RegistryLease/.test(blank(barrel, false))) bad.push("the barrel names RegistryLease");
  if (!blank(stryker, false).includes(`"${LEASE}"`)) bad.push("stryker.react.mjs does not mutate RegistryLease.ts");
  const code = blank(provider);
  if (/\b(?:setTimeout|clearTimeout|setInterval|clearInterval)\b/.test(code)) bad.push("QadiProvider.tsx holds a timer");
  if (/\.dispose\(/.test(code)) bad.push("QadiProvider.tsx disposes the registry");
  if (/\bregistryRef\.current\s*=\s*undefined\b/.test(code)) bad.push("QadiProvider.tsx clears registryRef");
  const made = [...code.matchAll(/\bAtomRegistry\.make\(/g)].length;
  if ([...code.matchAll(/\bmakeRegistryLease\(/g)].length !== 1 || made === 0) bad.push("QadiProvider.tsx does not build one lease");
  const holds = [...code.matchAll(/\.hold\(\s*\)/g)];
  const releases = [...code.matchAll(/\.release\(\s*\)/g)];
  const together = holds.length === 1 && releases.length === 1 && effectSpans(code).some(([a, b]) => holds[0].index >= a && holds[0].index < b && releases[0].index >= a && releases[0].index < b);
  if (!together) bad.push("QadiProvider.tsx does not hold and release the lease in one effect");
  if (made > 1) bad.push("QadiProvider.tsx builds more than one registry");
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
  "single-owner": () => {
    const read = (file) => (existsSync(file) ? readFileSync(file, "utf8") : undefined);
    const provider = read(PROVIDER);
    if (provider === undefined) return fail([`${PROVIDER} is missing`]);
    const files = { lease: read(LEASE), provider, barrel: read(BARREL) ?? "", stryker: read(STRYKER) ?? "" };
    return done(judgeSingleOwner(files), "single-owner: the registry's lifetime is decided once, in RegistryLease.ts");
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
  for (const line of ["// D-49 says", "see 82-05", "LEASE-02 holds", "WX-05", "QD-82 closes", "Phase 82 added", "phase 82", "ADR-QD-NEXT", "x BEH-QD-NEXT y"]) {
    eq(`${line} is flagged`, judgeIds([idEntry("packages/devtools/src/a.ts", line)]).length, 1);
  }
  for (const line of ["ADR-QD-195", "INV-QD-409", "BEH-QD-746", "D-49-a", "CCR-QD-474", "ARCH-129", "ADR-QD-82", "LT1 a lease", "RL1 a lease", "a 1282-05x", "x182-05"]) {
    eq(`${line} is not flagged`, judgeIds([idEntry("packages/devtools/src/a.ts", line)]), []);
  }
  for (const line of ["this phase", "Until Now", "any more", "no longer", "from now on"]) {
    eq(`${line} is flagged in source`, judgeIds([idEntry("packages/devtools/src/a.ts", line)]).length, 1);
  }
  eq("a changeset may say no longer", judgeIds([idEntry(".changeset/a.md", "no longer")]), []);
  eq("the upgrade guide may say no longer", judgeIds([idEntry("apps/website/src/content/docs/docs/reference/upgrading.md", "no longer")]), []);
  eq("a changeset is still scanned for ids", judgeIds([idEntry(".changeset/a.md", "LEASE-01")]).length, 1);
  const spec = "# Title\nno longer here\n## Change History\n| 1 | no longer a row |\n";
  eq("a phrase before the change history is flagged", judgeIds([{ file: "spec/a.md", text: spec, added: new Set([2]) }]).length, 1);
  eq("a phrase in the change history is exempt", judgeIds([{ file: "spec/a.md", text: spec, added: new Set([4]) }]), []);
  const header = "> | Change History | 1.1 (2026-11-24): a row\n> | Status | no longer here\n";
  eq("a phrase in the Document Control history row is exempt", judgeIds([{ file: "spec/a.md", text: header.replace("a row", "no longer a row"), added: new Set([1]) }]), []);
  eq("a phrase in another Document Control row is flagged", judgeIds([{ file: "spec/a.md", text: header, added: new Set([2]) }]).length, 1);
  eq("an older entry of the Document Control history row is not new text", judgeIds([{ file: "spec/a.md", text: "> | Change History | 1.2 (2026-11-24): a row<br>1.1 (2026-11-10): D-01 approved, no longer<br>1.0 (2026-11-09): Initial\n", added: new Set([1]) }]), []);
  eq("an id in the Document Control history row is still flagged", judgeIds([{ file: "spec/a.md", text: "> | Change History | 1.1 (2026-11-24): LEASE-01\n", added: new Set([1]) }]).length, 1);

  const src = "packages/devtools/src/A.ts";
  const test = "packages/react/test/A.test.ts";
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
  const reactSrc = "packages/react/src/A.ts";
  eq("a module-scope string literal is flagged in react source", lit(reactSrc, 'const NAME = "x";').length, 1);
  eq("a literal in a function body is not flagged", lit(reactSrc, 'const f = () => {\n  return "x";\n};'), []);
  eq("a literal in an arrow expression body is not flagged", lit(reactSrc, 'const f = () => "x";'), []);
  eq("a literal in a call at module scope is flagged", lit(reactSrc, 'const f = make("x");').length, 1);
  eq("a literal in a type declaration is not flagged", lit(reactSrc, 'export type Tag = "a" | "b";'), []);
  eq("an import path is not flagged", lit(reactSrc, 'import { a } from "./a.ts";'), []);
  eq("a module-scope literal is not flagged outside react source", lit("packages/devtools/src/a.ts", 'const NAME = "x";'), []);
  eq("a module-scope literal is not flagged in a test", lit("packages/react/test/A.test.ts", 'const NAME = "x";'), []);
  eq("a literal inside a comment at module scope is not flagged", lit(reactSrc, '// "x"\nconst a = 1;'), []);

  // single-owner: a planted tree that passes, and one per reason (each prints exactly its line).
  const LEASE_OK = "export interface RegistryLease { readonly hold: () => void; readonly release: () => void; }\nexport const makeRegistryLease = (make: () => unknown): RegistryLease => ({ hold: () => {}, release: () => {} });\n";
  const PROVIDER_OK = "const lease = makeRegistryLease(() => AtomRegistry.make({}));\nuseEffect(() => {\n  lease.hold();\n  return () => { lease.release(); };\n}, [lease]);\n";
  const BARREL_OK = 'export * from "./GateRegistry.ts";\n';
  const STRYKER_OK = '  mutate: [\n    "packages/react/src/RegistryLease.ts",\n  ],\n';
  const owner = (extra = {}) => judgeSingleOwner({ lease: LEASE_OK, provider: PROVIDER_OK, barrel: BARREL_OK, stryker: STRYKER_OK, ...extra });
  eq("a tree with the lifetime decided once passes", owner(), []);
  eq("a missing lease fails with its line", owner({ lease: undefined }), ["RegistryLease.ts is missing"]);
  eq("a lease importing react fails", owner({ lease: `import { useRef } from "react";\n${LEASE_OK}` }), ["RegistryLease.ts imports React or the provider"]);
  eq("a lease importing react-dom fails", owner({ lease: `import { flushSync } from 'react-dom';\n${LEASE_OK}` }).length, 1);
  eq("a lease importing @effect/atom-react fails", owner({ lease: `import { useAtomValue } from "@effect/atom-react";\n${LEASE_OK}` }).length, 1);
  eq("a lease importing the provider fails", owner({ lease: `import type { QadiProviderProps } from "./QadiProvider.tsx";\n${LEASE_OK}` }).length, 1);
  eq("a lease importing from effect does not fail", owner({ lease: `import * as Effect from "effect/Effect";\n${LEASE_OK}` }), []);
  eq("a lease naming scheduleTask fails", owner({ lease: `${LEASE_OK}const a = scheduleTask;\n` }), ["RegistryLease.ts reaches the registry or the sweep"]);
  eq("a lease calling .dispose( fails", owner({ lease: `${LEASE_OK}const a = () => r.dispose();\n` }), ["RegistryLease.ts reaches the registry or the sweep"]);
  eq("a lease naming sweep fails", owner({ lease: `${LEASE_OK}const sweepNow = 1;\n` }).length, 1);
  eq("a lease calling .reset( fails", owner({ lease: `${LEASE_OK}const a = () => r.reset();\n` }).length, 1);
  eq("a lease with a module-scope let fails", owner({ lease: `${LEASE_OK}let held = 0;\n` }), ["RegistryLease.ts holds module-scope state"]);
  eq("a lease with a module-scope Map fails", owner({ lease: `${LEASE_OK}const all = new Map();\n` }), ["RegistryLease.ts holds module-scope state"]);
  eq("a lease with a let in a function body does not fail", owner({ lease: `${LEASE_OK}const f = () => {\n  let n = 0;\n  return n;\n};\n` }), []);
  eq("a barrel naming RegistryLease fails", owner({ barrel: `${BARREL_OK}export * from "./RegistryLease.ts";\n` }), ["the barrel names RegistryLease"]);
  eq("a barrel with the name only in a comment does not fail", owner({ barrel: `// RegistryLease stays private\n${BARREL_OK}` }), []);
  eq("a stryker config without the lease fails", owner({ stryker: '  mutate: [\n    "packages/react/src/QuestionBook.ts",\n  ],\n' }), ["stryker.react.mjs does not mutate RegistryLease.ts"]);
  eq("a stryker config naming the lease only in a comment fails", owner({ stryker: '  // "packages/react/src/RegistryLease.ts"\n  mutate: [],\n' }), ["stryker.react.mjs does not mutate RegistryLease.ts"]);
  eq("a provider with setTimeout fails", owner({ provider: `${PROVIDER_OK}setTimeout(() => {}, 0);\n` }), ["QadiProvider.tsx holds a timer"]);
  eq("a provider with clearTimeout fails", owner({ provider: `${PROVIDER_OK}clearTimeout(t);\n` }), ["QadiProvider.tsx holds a timer"]);
  eq("a provider with .dispose( fails", owner({ provider: `${PROVIDER_OK}registry.dispose();\n` }), ["QadiProvider.tsx disposes the registry"]);
  eq("a provider clearing registryRef fails", owner({ provider: `${PROVIDER_OK}registryRef.current = undefined;\n` }), ["QadiProvider.tsx clears registryRef"]);
  eq("a provider assigning registryRef a registry does not fail on that rule", owner({ provider: `${PROVIDER_OK}registryRef.current ??= other;\n` }), []);
  eq("a provider with no lease fails", owner({ provider: "useEffect(() => {}, []);\nconst r = AtomRegistry.make({});\n" }).includes("QadiProvider.tsx does not build one lease"), true);
  eq("a provider with two leases fails", owner({ provider: `${PROVIDER_OK}const again = makeRegistryLease(() => AtomRegistry.make({}));\n` }).includes("QadiProvider.tsx does not build one lease"), true);
  eq("a provider holding and releasing in two effects fails", owner({ provider: "const lease = makeRegistryLease(() => AtomRegistry.make({}));\nuseEffect(() => { lease.hold(); }, []);\nuseEffect(() => () => { lease.release(); }, []);\n" }), ["QadiProvider.tsx does not hold and release the lease in one effect"]);
  eq("a provider holding twice fails", owner({ provider: `${PROVIDER_OK}lease.hold();\n` }), ["QadiProvider.tsx does not hold and release the lease in one effect"]);
  eq("a provider that never releases fails", owner({ provider: PROVIDER_OK.replace("lease.release()", "other()") }), ["QadiProvider.tsx does not hold and release the lease in one effect"]);
  eq("a provider with a second registry fails", owner({ provider: `${PROVIDER_OK}const second = AtomRegistry.make({});\n` }), ["QadiProvider.tsx builds more than one registry"]);
  eq("a timer named in a comment or a string does not fail", owner({ provider: `// no setTimeout, no .dispose(\nconst note = "registryRef.current = undefined";\n${PROVIDER_OK}` }), []);
  const base = owner({ lease: undefined, provider: "const registryRef = useRef(undefined);\nconst registry = (registryRef.current ??= AtomRegistry.make({}));\nuseEffect(() => {\n  return () => {\n    setTimeout(() => {\n      registry.dispose();\n      registryRef.current = undefined;\n    }, 0);\n  };\n}, [registry]);\n", stryker: '  mutate: ["packages/react/src/QuestionBook.ts"],\n' });
  eq("the shape of the base fails with exactly its seven reasons", [...base].sort(), ["QadiProvider.tsx clears registryRef", "QadiProvider.tsx disposes the registry", "QadiProvider.tsx does not build one lease", "QadiProvider.tsx does not hold and release the lease in one effect", "QadiProvider.tsx holds a timer", "RegistryLease.ts is missing", "stryker.react.mjs does not mutate RegistryLease.ts"]);

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
if (mode === undefined || !Object.hasOwn(MODES, mode)) fail([`usage: node 82-check.mjs ${Object.keys(MODES).join("|")}`]);
else MODES[mode](args);
