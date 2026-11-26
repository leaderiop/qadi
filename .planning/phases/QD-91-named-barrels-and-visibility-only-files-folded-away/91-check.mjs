// The phase's shared check, run from the repository root as `node <this file> <mode> [args]`. Each mode is a pure judge
// over text plus a thin reader that gathers the text from git or the tree; a failure prints its reasons to stderr and
// exits 1. A mode reads and judges: it never commits, stages or edits a file of the tree (`scratch`, `variant`,
// `structural --record` and `scratch-clean` write only under the scratch directory <S> and append to the phase's own record
// files). Modes:
//   base                                     prints phase_base from the committed 91-mutation-base.json, after checking the branch,
//                                            that the planning commit and phase_base are ancestors of HEAD and that nothing outside
//                                            `.planning/` differs between them
//   commit "<subject>" <path>...             exactly one commit since phase_base has this subject and exactly these paths, the
//                                            subject is a row of PHASE_COMMITS with that path set, none of the paths is one the run
//                                            rules never stage, and the commit carries the one trailer
//   unchanged <path>...                      the tree matches phase_base on these paths and none is untracked
//   scratch <name> [--at <rev>]              a clone of the repository under <S>/<name> on a branch named like the phase's (the
//                                            literal `phase_base` names the base), node_modules linked, prints its path
//   scratch-clean [--check]                  removes <S> (`--check` removes nothing and fails while it exists)
//   variant <name> <label> <kind> [args...] --edit "<what>"
//                                            runs one check in the scratch clone <S>/<name>, edited beforehand, and appends a block
//                                            to the evidence file; exits 0 only when the run failed. kinds: vitest, tstyche,
//                                            tsc-src, tsc-test, house-style, api, circular, surface, package, lint, script
//   seen-failing <file> [--if-present]       every title of the file has a `- seen failing:` line in the evidence file
//   vitest <file>...                         runs the files, fails on zero tests or any failure
//   suite                                    the same over the core, react, audit, devtools, http and testing projects
//   scan-ids                                 added lines (tree against phase_base, .planning excluded) name no id or phase wording
//   scan-forbidden                           added source and test lines use none of the forbidden forms, and no guarded file moved
//   trailers [--message <file>]              every commit since phase_base has exactly one trailer, the owner's
//   records [--close]                        the pinned-by lists name tests that exist; --close also needs every record written
//   circular                                 `pnpm circular` finds no cycle
//   surface                                  the built public surface equals the base snapshot, and gate 13 prints the recorded figure
//   structural --record <BARRELS|FOLDS> "<subject>"   runs the structural commands at the commit with this subject and appends a block
//   barrels [--text]                         the three named barrels have the shape the rule fixes; without --text the surface too
//   homes                                    every name of the three barrels sits at its home and in its kind's group
//   folds                                    the five folds landed as their commits, each with its structural block and madge count
//   escape                                   gate 14's declaration escape check exists and is clean on the packed tree
//   escape-scan <lib-dir>                    the committed escape function over every .d.ts under a built lib directory
//   rule                                     the named-barrel rule exists and no live old rule name remains
//   changesets                               exactly the named changesets, one patch per edited public package
//   spike [--rerun]                          the verdict table of the spike agrees with its patches and outputs
//   close                                    every phase check, run once, for the last plan
//   --self-test                              drives every judge with planted text
// Shortcuts: the comment and string blanking does not understand regex literals, `any` is read by the token before it, and a
// function whose return type is a literal object type is read wrongly by the module-scope reader: reword the declaration. A
// false positive is cleared by rewording the line, never by weakening a judge. The shape modes read source text with comments
// and strings blanked and match its shapes by pattern, with brackets matched as the text between a bracket and its match, so a
// bracket inside a regex literal is read wrongly; TypeScript's JavaScript API has no in-process parser, so a planted self-test
// text could not be parsed by it, and the shape modes use that reader instead. A pinned-by paragraph starts at `Pinned by` or
// `Enforcement:` and ends at the next blank line. A revision one step above its base is the next minor number (1.413 to 1.414,
// 1.4 to 1.5). The budget guard reads a budget's literal with its own small scanner, never the blanking one, because the
// guarded file holds regex literals.

import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { appendFileSync, existsSync, mkdirSync, readFileSync, mkdtempSync, readdirSync, realpathSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const SELF = fileURLToPath(import.meta.url);
/** This script's own directory, relative to the repository root, with a trailing slash. */
const D = `${relative(process.cwd(), dirname(SELF))}/`;
/** This script's own directory name: the one phase directory a run may stage under `.planning/phases/`. */
const PHASE_DIR = basename(dirname(SELF));
const EVIDENCE = `${D}91-RED-EVIDENCE.md`;
const BASE_RECORD = `${D}91-mutation-base.json`;
const SURFACE_BASE = `${D}91-surface-base.json`;
const SURFACE_MD = `${D}91-SURFACE.md`;
const SPIKE_MD = `${D}91-SPIKE.md`;
const SPIKE_DIR = `${D}spike/`;
const BARRELS_MD = `${D}91-BARRELS.md`;
const FOLDS_MD = `${D}91-FOLDS.md`;
const SWEEP_MD = `${D}91-SWEEP.md`;
const BRANCH = "arch-wave-16";
/** The one trailer every commit ends with: the project owner's line, and no other Claude name is accepted. */
const TRAILER = "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>";
const PLAN_SUBJECT = /^[a-z]+[(]91-[0-9]{2}[)]!?: /;
/** The commit planning started on: every file outside `.planning/` is the one phase_base holds. */
const PLANNING_HEAD = "e89f89ce";
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

const d = (name) => `${D}${name}`;
const REACT_GATE_TESTS = ["DecisionOutcome.tst.ts", "DeveloperSignalReporters.test.tsx", "GateRegistration.characterisation.test.tsx", "GateRegistry.store.test.ts", "GateRegistry.test.tsx", "GateWriter.reconcile.test.ts", "GateWriter.test.tsx", "QadiProvider.tst.ts", "support/gates.ts", "support/trees.tsx"].map((n) => `packages/react/test/${n}`);
const AUDIT_SEQUENCE_TESTS = ["AdmissionOrder.characterisation.test.ts", "AuditArchive.test.ts", "BatchReadOnce.test.ts", "ForeignRows.test.ts", "RowListAdmission.test.ts", "SequenceIntegrity.test.ts"].map((n) => `packages/audit/test/${n}`);
const REACT_HYDRATION_TESTS = ["DecisionOutcome.test.ts", "Hydration.lifetime.test.ts", "Hydration.test.ts", "Hydration.tst.ts", "HydrationCounts.test.ts", "HydrationPayload.test.ts", "QadiAtoms.test.ts", "UntrustedSeams.test.ts"].map((n) => `packages/react/test/${n}`);
const MUTATION_TESTS = ["packages/core/test/PortSpanFold.mutation.test.ts", "packages/react/test/RegistryLeaseFold.mutation.test.ts", "packages/audit/test/ArchiveFactsFold.mutation.test.ts"];

/**
 * Every commit subject of the phase with its exact path set, byte for byte as the plan fixes them. A row with a `rule` has a
 * path set that is read from the commit's own records instead of listed (`spike`, `sweep`, `mutation-tests`).
 */
export const PHASE_COMMITS = [
  { plan: "01", subject: "docs(91-01): record the mutation base", paths: [d("91-mutation.mjs"), d("91-mutation-base.json")] },
  { plan: "01", subject: "docs(91-01): record the coverage base", paths: [d("91-coverage-base.json")] },
  { plan: "02", subject: "chore(91-02): add the phase check", paths: [d("91-check.mjs"), d("91-RED-EVIDENCE.md")] },
  { plan: "02", subject: "docs(91-02): record the phase check seen failing", paths: [d("91-RED-EVIDENCE.md")] },
  { plan: "03", subject: "feat(91-03): add the surface-diff tool and run its self-test in the merge gate", paths: ["scripts/surface-diff.mjs", "scripts/lib/surface-scan.mjs", "package.json", "spec/process/definitions-of-done.md", "spec/README.md"] },
  { plan: "03", subject: "docs(91-03): record the surface baseline", paths: [d("91-surface-base.json"), d("91-SURFACE.md")] },
  { plan: "03", subject: "docs(91-03): record the surface tool seen failing", paths: [d("91-RED-EVIDENCE.md")] },
  { plan: "04", subject: "test(91-04): pin each root's runtime values on the base", paths: ["packages/core/test/surface.test.ts", "packages/react/test/surface.test.ts", "packages/audit/test/surface.test.ts"] },
  { plan: "04", subject: "docs(91-04): record the value lists seen failing", paths: [d("91-RED-EVIDENCE.md")] },
  { plan: "05", subject: "feat(91-05): refuse a packed declaration that escapes its package", paths: ["scripts/check-package-install.mjs", "scripts/lib/declaration-escape.mjs"] },
  { plan: "05", subject: "docs(91-05): record the escape check seen failing", paths: [d("91-RED-EVIDENCE.md")] },
  { plan: "06", subject: "chore(91-06): add the pinned-test check", paths: [d("91-pinned-check.mjs")] },
  { plan: "06", subject: "docs(91-06): record the pinned-test check seen failing", paths: [d("91-RED-EVIDENCE.md")] },
  { plan: "07", subject: "chore(91-07): add the earlier-phase checks", paths: [d("91-earlier-checks.mjs")] },
  { plan: "07", subject: "docs(91-07): record the earlier-phase checks seen failing", paths: [d("91-RED-EVIDENCE.md")] },
  { plan: "08", subject: "docs(91-08): record the fold spike", rule: "spike" },
  { plan: "09", subject: "refactor(91-09): name the core barrel's exports per module", paths: ["packages/core/src/index.ts"] },
  { plan: "09", subject: "refactor(91-09): name the react barrel's exports per module", paths: ["packages/react/src/index.ts"] },
  { plan: "09", subject: "refactor(91-09): name the audit barrel's exports per module", paths: ["packages/audit/src/index.ts"] },
  { plan: "09", subject: "docs(91-09): record the barrel generation", paths: [BARRELS_MD] },
  { plan: "10", subject: "refactor(91-10): fold the port span decoder into the span machinery", paths: ["packages/core/src/PortSpanEncode.ts", "packages/core/src/PortSpanDecode.ts", "packages/core/src/PortSpan.ts", "packages/core/src/index.ts", "packages/core/test/PortSpan.test.ts", "scripts/check-house-style.mjs", "AGENTS.md"], deleted: ["packages/core/src/PortSpanDecode.ts"] },
  { plan: "10", subject: "refactor(91-10): fold the interpreter set into the span types", paths: ["packages/core/src/PortSpan.ts", "packages/core/src/PortInterpreter.ts", "packages/core/src/PortSpanEncode.ts"], deleted: ["packages/core/src/PortInterpreter.ts"] },
  { plan: "10", subject: "docs(91-10): record the core fold verdicts and the span rules biting", paths: [FOLDS_MD, d("91-RED-EVIDENCE.md")] },
  { plan: "11", subject: "refactor(91-11): fold the gate registry constructor into the gate writer", paths: ["packages/react/src/GateWriter.ts", "packages/react/src/GateRegistry.ts", "packages/react/src/QadiAtoms.ts", "packages/react/src/QadiProvider.tsx", "packages/react/src/DevtoolsFeed.ts", "packages/react/src/hooks.ts", "packages/react/src/index.ts", ...REACT_GATE_TESTS], deleted: ["packages/react/src/GateRegistry.ts"] },
  { plan: "11", subject: "test(91-11): hold the gate registry's collision report under its option", paths: ["packages/react/test/GateRegistryFold.test.ts"], born: ["packages/react/test/GateRegistryFold.test.ts"], optional: true },
  { plan: "11", subject: "docs(91-11): record the gate fold verdict", paths: [FOLDS_MD, d("91-RED-EVIDENCE.md")] },
  { plan: "12", subject: "refactor(91-12): fold the sequence check's public home into the archive facts", paths: ["packages/audit/src/ArchiveFacts.ts", "packages/audit/src/SequenceIntegrity.ts", "packages/audit/src/index.ts", ...AUDIT_SEQUENCE_TESTS], deleted: ["packages/audit/src/SequenceIntegrity.ts"] },
  { plan: "12", subject: "docs(91-12): record the sequence fold verdict", paths: [FOLDS_MD, d("91-RED-EVIDENCE.md")] },
  { plan: "13", subject: "feat(91-13): hydrateDecisions takes any value with the hydrate capability", paths: ["packages/react/src/HydrationEngine.ts", "packages/react/src/QadiAtoms.ts", "packages/react/src/Hydration.ts", "packages/react/test/HydrationTarget.tst.ts"], born: ["packages/react/test/HydrationTarget.tst.ts"] },
  { plan: "13", subject: "refactor(91-13): fold the hydration entry points into the hydration engine", paths: ["packages/react/src/HydrationEngine.ts", "packages/react/src/Hydration.ts", "packages/react/src/index.ts", "packages/react/test/HydrationTarget.tst.ts", ...REACT_HYDRATION_TESTS, "scripts/check-house-style.mjs"], deleted: ["packages/react/src/Hydration.ts"] },
  { plan: "13", subject: "docs(91-13): record the hydration fold verdicts", paths: [FOLDS_MD, d("91-RED-EVIDENCE.md")] },
  { plan: "14", subject: "test(91-14): probe the structural hydrate parameter in the packed consumer", paths: ["scripts/check-package-install.mjs"] },
  { plan: "14", subject: "test(91-14): hold the folded hydration entry points", paths: ["packages/react/test/HydrationFold.test.ts"], born: ["packages/react/test/HydrationFold.test.ts"], optional: true },
  { plan: "14", subject: "docs(91-14): record the hydration variants", paths: [d("91-RED-EVIDENCE.md")] },
  { plan: "15", subject: "feat(91-15): one named-barrel rule over the five named barrels", paths: ["scripts/check-house-style.mjs", "AGENTS.md", "CONTRIBUTING.md"] },
  { plan: "15", subject: "docs(91-15): record the named-barrel rule seen failing and the span couplings", paths: [d("91-RED-EVIDENCE.md")] },
  { plan: "16", subject: "docs(91-16): record the named barrels decision", paths: ["spec/decisions/204-named-barrels-and-visibility-only-files-folded-away.md", "spec/decisions/index.yaml", "spec/README.md", "spec/traceability.md"], born: ["spec/decisions/204-named-barrels-and-visibility-only-files-folded-away.md"] },
  { plan: "16", subject: "docs(91-16): amend the cycle, devtools-model and entry-points decisions", paths: ["spec/decisions/037-circular-imports-and-type-level-tests-are-gates.md", "spec/decisions/047-a-headless-devtools-model.md", "spec/decisions/099-entry-points-are-a-closed-list.md", "spec/decisions/index.yaml", "spec/README.md"] },
  { plan: "16", subject: "docs(91-16): drop the superseded out-of-scope line", paths: [".planning/PROJECT.md"] },
  { plan: "17", subject: "docs(91-17): state the folded behaviours and the surface invariants", paths: ["spec/behaviors/30-port-calls.md", "spec/behaviors/19-hydration.md", "spec/behaviors/09-react.md", "spec/behaviors/33-audit-pipeline.md", "spec/invariants.md", "spec/traceability.md", "spec/README.md"] },
  { plan: "17", subject: "docs(91-17): name each folded export at its new home", paths: ["spec/overview.md", "spec/README.md"] },
  { plan: "18", subject: "docs(91-18): re-point the sequence check's disclaimer citations", paths: ["packages/audit/README.md", "spec/urs.md", "spec/models/17-purpose.md", "spec/decisions/009-observability-via-effect.md", "spec/README.md"] },
  { plan: "18", subject: "docs(91-18): note the folds on the decisions they touch", paths: ["spec/decisions/039-a-seed-is-not-an-authority.md", "spec/decisions/051-a-span-says-what-was-asked.md", "spec/decisions/077-both-interpreters-read-ports-through-one-module.md", "spec/decisions/080-a-gate-registry-belongs-to-its-atom-set.md", "spec/decisions/107-a-port-is-answered-remotely-through-its-description.md", "spec/decisions/110-an-archives-facts-are-computed-once.md", "spec/decisions/140-a-gates-write-side-is-a-leaf-below-the-atom-set.md", "spec/README.md"] },
  { plan: "18", subject: "chore(91-18): add the core, react and audit patch changesets", paths: [".changeset/core-named-barrel.md", ".changeset/react-named-barrel.md", ".changeset/audit-named-barrel.md"] },
  { plan: "19", subject: "docs(91-19): name the registry lease's one caller", paths: ["packages/react/src/RegistryLease.ts", ".planning/PROJECT.md"] },
  { plan: "19", subject: "docs(91-19): sweep the deleted paths and the old rule name", rule: "sweep" },
  { plan: "20", subject: "chore(91-20): reconcile the earlier-phase ledger with the landed commits", paths: [d("91-earlier-checks.mjs")], optional: true },
  { plan: "21", subject: "test(91-21): kill the new open mutants of the folded files", rule: "mutation-tests", optional: true },
  { plan: "21", subject: "docs(91-21): record the mutation close", paths: [d("91-mutation.mjs"), d("91-mutation-close.json")] },
  { plan: "21", subject: "docs(91-21): record the coverage close", paths: [d("91-coverage-close.json")] },
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
/** The scratch root every run writes to: the resolved temporary directory's `qd91`. */
const scratchRoot = () => join(realpathSync(process.env.TMPDIR ?? "/tmp"), "qd91");



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
  [/(?<![\w.-])91-\d{2}(?!\d)/, "a plan id"],
  [/\bBARL-0\d\b/, "a requirement id"],
  [/\bWX-0\d\b/, "a requirement id"],
  [/(?<!(?:ADR|CCR|BEH|INV|ARCH)-)\bQD-91\b/, "a phase id"],
  [/\b[Pp]hase 91\b/, "a phase number"],
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



const SWEEP_FIXED_ROW = /^\|\s*`([^`:]+):\d+`\s*\|/;
/** The files the `## Fixed` rows of a sweep record name, in file order and without a repeat, or undefined when it has no such section. */
export const sweepFixedFiles = (md) => {
  const start = md.search(/^## Fixed\b/m);
  if (start < 0) return undefined;
  const rest = md.slice(start + 3);
  const next = rest.search(/^## /m);
  const files = (next < 0 ? rest : rest.slice(0, next)).split("\n").map((l) => SWEEP_FIXED_ROW.exec(l)?.[1]).filter((f) => f !== undefined);
  return [...new Set(files)];
};
/**
 * Reasons the path set asked for does not match a row whose paths the commit's own records give: `spike` is the verdict file
 * and files under the spike directory, `sweep` is the sweep record and the files its fixed rows name, `mutation-tests` is a
 * non-empty subset of the born mutation tests and the evidence file.
 */
const judgeRulePaths = (rule, paths, readAt) => {
  const bad = [];
  if (rule === "spike") {
    if (!paths.includes(SPIKE_MD)) bad.push(`the paths do not hold ${SPIKE_MD}`);
    for (const p of paths) if (p !== SPIKE_MD && !p.startsWith(SPIKE_DIR)) bad.push(`${p} is neither ${SPIKE_MD} nor a file under ${SPIKE_DIR}`);
  } else if (rule === "sweep") {
    const md = readAt(SWEEP_MD);
    const fixed = md === undefined ? undefined : sweepFixedFiles(md);
    if (fixed === undefined) bad.push(`${SWEEP_MD} has no ## Fixed section at the commit`);
    else if (sorted(paths).join("\n") !== sorted([SWEEP_MD, ...fixed]).join("\n")) bad.push(`the paths are not ${SWEEP_MD} and exactly the files its fixed rows name (${fixed.join(", ") || "none"})`);
  } else if (rule === "mutation-tests") {
    if (!paths.includes(EVIDENCE)) bad.push(`the paths do not hold ${EVIDENCE}`);
    const tests = paths.filter((p) => p !== EVIDENCE);
    if (tests.length === 0) bad.push("the paths hold no born mutation test");
    for (const p of tests) if (!MUTATION_TESTS.includes(p)) bad.push(`${p} is not one of ${MUTATION_TESTS.join(", ")}`);
  }
  return bad;
};

/**
 * Reasons the commit asked for is not the one commit with `subject` and exactly `paths`, or the subject is not a row of the
 * phase table with that path set, or holds, or was asked to hold, a path the run rules never stage, or lacks the one
 * trailer. `commits` are in order, `readAt(sha)(path)` is a file's text at a commit or undefined.
 */
export const judgeCommit = (commits, subject, paths, readAt = () => () => undefined) => {
  const row = PHASE_COMMITS.find((r) => r.subject === subject);
  if (row === undefined) return [`${subject} is not a subject of the phase table`];
  const hits = commits.filter((c) => c.subject === subject);
  if (hits.length !== 1) return [`${hits.length} commits since phase_base have the subject: ${subject}`];
  const [c] = hits;
  const bad = [];
  for (const p of [...c.paths, ...paths]) {
    if (NEVER_STAGED.some((re) => re.test(p))) bad.push(`${subject} holds ${p}, a path the run rules never stage`);
  }
  if (sorted(c.paths).join("\n") !== sorted(paths).join("\n")) bad.push(`the commit holds ${sorted(c.paths).join(", ")}, not ${sorted(paths).join(", ")}`);
  if (row.rule === undefined) {
    if (sorted(row.paths).join("\n") !== sorted(c.paths).join("\n")) bad.push(`the phase table gives ${sorted(row.paths).join(", ")} for the subject, the commit holds ${sorted(c.paths).join(", ")}`);
  } else bad.push(...judgeRulePaths(row.rule, c.paths, readAt(c.sha)).map((r) => `the commit: ${r}`));
  bad.push(...judgeTrailer(c.message));
  return bad;
};



// ---- the guarded files ----

/**
 * The literal that opens at `open` in raw source (a `{`, `[` or `(`), comments dropped and every string kept, as `{ body, end }`
 * where `end` is the index just past its closing bracket, or undefined when it never closes. A small scanner of its own: the
 * blanking reader above does not understand regex literals, and the guarded file holds many.
 */
export const literalAt = (text, open) => {
  const closer = PAIRS[text[open]];
  if (closer === undefined) return undefined;
  const opener = text[open];
  let depth = 0;
  let body = "";
  for (let i = open; i < text.length; i++) {
    const c = text[i];
    if (c === "/" && text[i + 1] === "/") {
      while (i < text.length && text[i] !== "\n") i++;
      body += "\n";
    } else if (c === "/" && text[i + 1] === "*") {
      const end = text.indexOf("*/", i + 2);
      i = end < 0 ? text.length : end + 1;
    } else if (c === '"' || c === "'" || c === "`") {
      let j = i + 1;
      while (j < text.length && text[j] !== c) j += text[j] === "\\" ? 2 : 1;
      body += text.slice(i, j + 1);
      i = j;
    } else {
      if (c === opener) depth++;
      else if (c === closer) {
        depth--;
        if (depth === 0) return { body: body + c, end: i + 1 };
      }
      body += c;
    }
  }
  return undefined;
};
/** Each `const <NAME>_BUDGET` and `const <NAME>_BUDGET_NAMES` literal of a script as `name -> its text with comments and whitespace dropped`. */
export const budgetsOf = (text) => {
  const out = new Map();
  for (const m of text.matchAll(/^const ([A-Z][A-Z0-9_]*_BUDGET(?:_NAMES)?)(?:\s*:[^=\n]+)?\s*=\s*/gm)) {
    const at = m.index + m[0].length;
    const lit = text[at] === "{" || text[at] === "[" ? literalAt(text, at) : undefined;
    out.set(m[1], lit === undefined ? "(unreadable)" : lit.body.replace(/\s+/g, "").replace(/,([}\]])/g, "$1"));
  }
  return out;
};
/** Reasons the budgets of the house-style script differ: one added, removed or with an entry (key or number) changed. */
export const judgeBudgets = (base, current) => {
  const was = budgetsOf(base);
  const now = budgetsOf(current);
  const bad = [];
  for (const [name, body] of was) {
    if (!now.has(name)) bad.push(`scripts/check-house-style.mjs no longer declares ${name}`);
    else if (now.get(name) !== body) bad.push(`scripts/check-house-style.mjs: an entry of ${name} differs from phase_base: no budget moves`);
  }
  for (const name of now.keys()) if (!was.has(name)) bad.push(`scripts/check-house-style.mjs declares ${name}, which phase_base does not`);
  if (was.size === 0) bad.push("scripts/check-house-style.mjs holds no budget at phase_base: the guard read nothing");
  return bad;
};

/** AGENTS.md's sections the phase edits, each from its heading up to the next `## ` heading. */
const AGENTS_OPEN = ["7a.", "9.", "16."];
const sectionSpan = (text, heading) => {
  const m = new RegExp(`^## ${escapeRe(heading)}`, "m").exec(text);
  if (m === null) return undefined;
  const rest = text.slice(m.index + 3);
  const next = rest.search(/^## /m);
  return [m.index, next < 0 ? text.length : m.index + 3 + next];
};
/** The text with its sections 7a, 9 and 16 cut out, or undefined when one is missing. */
export const outsideOpenSections = (text) => {
  const spans = AGENTS_OPEN.map((h) => sectionSpan(text, h));
  if (spans.some((s) => s === undefined)) return undefined;
  return [...spans].sort((a, b) => b[0] - a[0]).reduce((t, [from, to]) => t.slice(0, from) + t.slice(to), text);
};
/** Reasons a guarded file moved from its text at phase_base: `.oxlintrc.json` byte for byte, `AGENTS.md` outside its three open sections, the house-style script's budgets. */
export const judgeGuards = (guards) =>
  guards.flatMap(({ file, base, current }) => {
    if (file === "AGENTS.md") {
      const was = outsideOpenSections(base);
      const now = outsideOpenSections(current);
      if (now === undefined) return [`${file} has no section 7a, 9 or 16 followed by another heading`];
      return now === was ? [] : [`${file} differs from phase_base outside sections 7a, 9 and 16: only those may change`];
    }
    if (file === "scripts/check-house-style.mjs") return judgeBudgets(base, current);
    return current === base ? [] : [`${file} differs from phase_base: no budget moves`];
  });


// ---- the named barrels ----

/** The three barrels the phase names per module, by package. */
export const BARRELS = [
  { pkg: "core", path: "packages/core/src/index.ts" },
  { pkg: "react", path: "packages/react/src/index.ts" },
  { pkg: "audit", path: "packages/audit/src/index.ts" },
];
/**
 * The names whose home a fold deletes, with the module that declares each once its source is gone (package, name, declaring
 * module). A name not listed here sits at the module the base barrel reached it through.
 */
export const MOVES = {
  core: { decodePortSpan: "./PortSpanEncode.ts" },
  react: {
    ...Object.fromEntries(["makeGateRegistry", "GateRegistryOptions", "GateRegistry", "GateInstance", "GateKind", "GateRenderState"].map((n) => [n, "./GateWriter.ts"])),
    ...Object.fromEntries(["dehydrateDecisions", "hydrateDecisions", "DehydratedDecisions", "DehydratedEntry", "DehydrateOptions", "HydrateOptions"].map((n) => [n, "./HydrationEngine.ts"])),
    HydrationDrop: "./DeveloperSignals.ts",
    HydrationDropReporter: "./DeveloperSignals.ts",
    DecisionEntry: "./HydrationEvent.ts",
    ...Object.fromEntries(["SeededAllow", "SeededDeny", "SeededDecision", "ClientDecision", "AllowDisclosure", "DenyDisclosure", "permits", "isSeeded"].map((n) => [n, "./SeededDecision.ts"])),
  },
  audit: { verifySequenceIntegrity: "./ArchiveFacts.ts", SequenceIntegrityError: "./ArchiveFacts.ts" },
};

/** A barrel's statements: the `export { … } from` and `export type { … } from` groups, the `export *` lines and every other export statement. Comments are blanked, strings kept. */
export const parseBarrel = (text) => {
  const code = blank(text, true);
  const groups = [];
  const stars = [];
  const other = [];
  for (const m of code.matchAll(/^[ \t]*export\b[^;]*;/gm)) {
    const s = m[0].trim();
    const line = lineAt(code, m.index + m[0].indexOf("export"));
    if (/^export\s*(?:type\s+)?\*/.test(s)) {
      stars.push({ line, text: collapse(s) });
      continue;
    }
    const g = /^export\s+(type\s+)?\{([^}]*)\}\s*from\s*(["'])([^"']*)\3\s*;$/.exec(s);
    if (g === null) other.push({ line, text: collapse(s) });
    else groups.push({ line, kind: g[1] === undefined ? "value" : "type", spec: g[4], names: g[2].split(",").map((n) => n.trim()).filter((n) => n !== "") });
  }
  return { groups, stars, other };
};

/**
 * Reasons a barrel is not the named form: an `export *` line or any export statement that is not a relative
 * `export { … } from` or `export type { … } from` group, specifiers out of ASCII order, a second value or type group for one
 * module, a value group after its module's type group, a name out of order inside a group, a repeat, a rename, and a
 * specifier naming no file. `fileExists(path)` answers for a path relative to the repository root.
 */
export const judgeBarrel = (rel, text, fileExists) => {
  if (text === undefined) return [`${rel} does not exist`];
  const bad = [];
  const { groups, stars, other } = parseBarrel(text);
  for (const s of stars) bad.push(`${rel}:${s.line} is an export * line: ${s.text}`);
  for (const o of other) bad.push(`${rel}:${o.line} is not an export { … } from or export type { … } from group: ${o.text}`);
  if (groups.length === 0 && stars.length === 0 && other.length === 0) bad.push(`${rel} holds no export group`);
  const seen = new Map();
  const names = new Set();
  let prev;
  for (const g of groups) {
    const at = `${rel}:${g.line}`;
    if (!/^\.\.?\//.test(g.spec)) bad.push(`${at} names the package specifier ${g.spec}: a named group is relative`);
    if (prev !== undefined && g.spec < prev.spec) bad.push(`${at} ${g.spec} is out of order after ${prev.spec}`);
    const per = seen.get(g.spec) ?? { value: 0, type: 0 };
    per[g.kind]++;
    if (per[g.kind] > 1) bad.push(`${at} is a second ${g.kind} group for ${g.spec}`);
    if (g.kind === "value" && per.type > 0) bad.push(`${at} is a value group after the type group of ${g.spec}`);
    seen.set(g.spec, per);
    g.names.forEach((name, i) => {
      if (/\s/.test(name)) bad.push(`${at} ${name} is a rename or carries an inline modifier`);
      if (i > 0 && !(g.names[i - 1] < name)) bad.push(`${at} ${name} is out of order after ${g.names[i - 1]}`);
      if (names.has(name)) bad.push(`${at} ${name} is named twice in the barrel`);
      names.add(name);
    });
    if (!/^\.\.?\//.test(g.spec) || !fileExists(join(dirname(rel), g.spec).split("\\").join("/"))) bad.push(`${at} ${g.spec} names no file`);
    prev = g;
  }
  return bad;
};

/** Whether comment-free source text declares `name` (a const, let, var, function, class, interface, type, enum or namespace). */
export const declares = (text, name) => new RegExp(`(?:^|[\\n;{}])[ \\t]*export\\s+(?:declare\\s+)?(?:abstract\\s+)?(?:async\\s+)?(?:const\\s+enum|const|let|var|function\\s*\\*?|class|interface|type|enum|namespace)\\s+${escapeRe(name)}(?![\\w$])`).test(blank(text));
/** The names a module's text exports by a list or a namespace re-export: `export { a, b as c }`, `export type { d }`, `export * as e`. */
const listedNames = (text) => {
  const code = blank(text);
  const out = [];
  for (const m of code.matchAll(/\bexport\s+(?:type\s+)?\{([^}]*)\}/g)) for (const n of m[1].split(",")) out.push(n.trim().replace(/^type\s+/, "").split(/\s+as\s+/).at(-1));
  for (const m of code.matchAll(/\bexport\s+\*\s+as\s+([\w$]+)/g)) out.push(m[1]);
  return out.filter((n) => n !== "");
};
/** Whether the module at `path` exports `name` by declaration, list or a star re-export of a relative module; `read(path)` is a text or undefined. */
export const exportsName = (read, path, name, seen = new Set()) => {
  if (seen.has(path)) return false;
  seen.add(path);
  const text = read(path);
  if (text === undefined) return false;
  if (declares(text, name) || listedNames(text).includes(name)) return true;
  for (const m of blank(text, true).matchAll(/\bexport\s*(?:type\s+)?\*\s*from\s*(["'])([^"']*)\1/g)) {
    if (m[2].startsWith(".") && exportsName(read, join(dirname(path), m[2]), name, seen)) return true;
  }
  return false;
};

/**
 * Reasons a barrel's names are not at their homes. `ctx` is `{ pkg, srcDir, headText, baseText, snapshot, readBase, existsHead,
 * readHead, srcFiles }`: the package, its source directory, the barrel's text at HEAD and at phase_base, the base snapshot's
 * `{ name, kind }` list of its root (or undefined), a reader of a path's text at phase_base and at HEAD, whether a path exists
 * at HEAD, and the package's source paths. An unfolded name sits at a module the base barrel's `export *` reached it through,
 * and that module's base text exports it; a folded name sits at the module that reached it at the base while that file exists,
 * and at the module that declares it once the file is deleted; each name sits in the type group when its base kind is `type` and
 * in the value group otherwise, exactly once, and no name appears that the snapshot lacks.
 */
export const judgeHomes = (ctx) => {
  const rel = `packages/${ctx.pkg}/src/index.ts`;
  if (ctx.headText === undefined) return [`${rel} does not exist`];
  if (ctx.baseText === undefined) return [`${rel} does not exist at phase_base`];
  if (ctx.snapshot === undefined) return [`${SURFACE_BASE} has no ${ctx.pkg} root entry`];
  const bad = [];
  const baseModules = [...blank(ctx.baseText, true).matchAll(/\bexport\s*\*\s*from\s*(["'])([^"']*)\1/g)].map((m) => m[2]);
  const pathOf = (spec) => join(ctx.srcDir, spec);
  const moves = MOVES[ctx.pkg] ?? {};
  const { groups } = parseBarrel(ctx.headText);
  const kindOf = new Map(ctx.snapshot.map((n) => [n.name, n.kind]));
  const placed = new Map();
  for (const g of groups) {
    for (const name of g.names) {
      placed.set(name, [...(placed.get(name) ?? []), g]);
      const at = `${rel}:${g.line}`;
      const base = kindOf.get(name);
      if (base === undefined) {
        bad.push(`${at} ${name} is not a name of the base surface`);
        continue;
      }
      const baseHome = baseModules.find((m) => exportsName(ctx.readBase, pathOf(m), name));
      if (name in moves) {
        if (baseHome === undefined) bad.push(`${at} ${name} was reached through no module of the base barrel`);
        else if (ctx.existsHead(pathOf(baseHome))) {
          if (g.spec !== baseHome) bad.push(`${at} ${name} is at ${g.spec}, not ${baseHome}, whose file still exists`);
        } else if (g.spec !== moves[name]) bad.push(`${at} ${name} is at ${g.spec}, not ${moves[name]}`);
        else if (!declares(ctx.readHead(pathOf(moves[name])) ?? "", name)) {
          const where = ctx.srcFiles.filter((p) => declares(ctx.readHead(p) ?? "", name));
          bad.push(`${at} ${name} is not declared in ${moves[name]}${where.length > 0 ? `; it is declared in ${where.map((p) => `./${relative(ctx.srcDir, p)}`).join(", ")}` : ""}`);
        }
      } else if (!baseModules.includes(g.spec) || !exportsName(ctx.readBase, pathOf(g.spec), name)) {
        bad.push(`${at} ${name} is at ${g.spec}, which the base barrel did not reach it through${baseHome === undefined ? "" : ` (${baseHome})`}`);
      }
      const want = base === "type" ? "type" : "value";
      if (g.kind !== want) bad.push(`${at} ${name} is in a ${g.kind} group, but its base kind is ${base}`);
    }
  }
  for (const [name, gs] of placed) if (gs.length > 1) bad.push(`${rel} names ${name} ${gs.length} times`);
  for (const { name } of ctx.snapshot) if (!placed.has(name)) bad.push(`${rel} does not name ${name}, a name of the base surface`);
  return bad;
};

// ---- the folds ----

/** Each fold's subject with the source it deletes (none for the fifth), in the order they land. */
export const FOLDS = [
  { subject: "refactor(91-10): fold the port span decoder into the span machinery", deletes: "packages/core/src/PortSpanDecode.ts" },
  { subject: "refactor(91-10): fold the interpreter set into the span types", deletes: "packages/core/src/PortInterpreter.ts" },
  { subject: "refactor(91-11): fold the gate registry constructor into the gate writer", deletes: "packages/react/src/GateRegistry.ts" },
  { subject: "refactor(91-12): fold the sequence check's public home into the archive facts", deletes: "packages/audit/src/SequenceIntegrity.ts" },
  { subject: "feat(91-13): hydrateDecisions takes any value with the hydrate capability", deletes: undefined },
  { subject: "refactor(91-13): fold the hydration entry points into the hydration engine", deletes: "packages/react/src/Hydration.ts" },
];
/** The commands a structural block records, in order: the label each prints. */
export const STRUCTURAL_COMMANDS = ["pnpm circular", "pnpm build", "pnpm typecheck", `node ${D}91-check.mjs surface`, "pnpm spec:package", "node scripts/check-house-style.mjs"];
/** The `{ head, madge, commands: [{ label, exit }] }` of an evidence block's lines. */
export const structuralBlock = (block) => ({
  head: /^- head: (\S+)/m.exec(block)?.[1],
  madge: /^- madge files: (\d+)/m.exec(block)?.[1],
  commands: [...block.matchAll(/^- (?!head:|madge files:)(.+?): exit (\d+)(?::.*)?$/gm)].map((m) => ({ label: m[1], exit: Number(m[2]) })),
});
/** The `madge files base: <n>` of the spike record, or undefined. */
export const madgeBaseOf = (md) => {
  const n = /^madge files base:\s*(\d+)/m.exec(md ?? "")?.[1];
  return n === undefined ? undefined : Number(n);
};
/** The import and export specifiers of comment-free source text, each as `{ spec, line }`: statements, `export … from` and dynamic `import("…")`. */
export const specifiersOf = (text) => {
  const code = blank(text, true);
  return [...importsOf(code).map((i) => ({ spec: i.spec, line: i.line })), ...[...code.matchAll(/\bimport\(\s*(["'])([^"']*)\1\s*\)/g)].map((m) => ({ spec: m[2], line: lineAt(code, m.index) }))];
};
/** The specifiers of `files` (`{ file, text }`) that resolve, relative to their file, to one of `deleted` (compared without the extension). */
export const deletedImports = (files, deleted) => {
  const stem = (p) => p.replace(/\.(?:tsx?|mts|mjs|js)$/, "");
  const gone = new Set(deleted.map(stem));
  const hits = [];
  for (const { file, text } of files) {
    for (const { spec, line } of specifiersOf(text)) {
      if (spec.startsWith(".") && gone.has(stem(join(dirname(file), spec).split("\\").join("/")))) hits.push(`${file}:${line} names the deleted path ${spec}`);
    }
  }
  return hits;
};
/**
 * Reasons the folds did not land as their commits. `ctx` is `{ commits, descends, exists, read, spikeMd, foldsMd, barrelText, hits }`:
 * the commits since phase_base, whether the first sha is an ancestor of the second, whether a path exists at HEAD, a reader of
 * the tree, the spike record and the folds record, the react barrel's text, and the deleted-path specifiers found in the tree.
 */
export const judgeFolds = (ctx) => {
  const bad = [];
  const shas = [];
  FOLDS.forEach(({ subject }) => {
    const row = PHASE_COMMITS.find((r) => r.subject === subject);
    const hits = ctx.commits.filter((c) => c.subject === subject);
    if (hits.length !== 1) {
      bad.push(`${hits.length} commits since phase_base have the subject: ${subject}`);
      return;
    }
    if (row === undefined || sorted(row.paths).join("\n") !== sorted(hits[0].paths).join("\n")) bad.push(`the commit ${subject} does not hold exactly its path set`);
    shas.push(hits[0].sha);
  });
  for (let i = 1; i < shas.length; i++) if (shas[i] !== undefined && shas[i - 1] !== undefined && !ctx.descends(shas[i - 1], shas[i])) bad.push(`the fold ${FOLDS[i].subject} is not a descendant of the fold before it`);
  const gone = FOLDS.flatMap((f) => (f.deletes === undefined ? [] : [f.deletes]));
  for (const p of gone) if (ctx.exists(p)) bad.push(`${p} still exists`);
  const need = (path, what) => {
    const text = ctx.read(path);
    if (text === undefined) bad.push(`${path} does not exist`);
    else for (const [label, test] of what) if (!test(text)) bad.push(`${path} ${label}`);
    return text;
  };
  const decl = (...names) => names.map((n) => [`does not declare ${n}`, (t) => declares(t, n)]);
  need("packages/core/src/PortSpanEncode.ts", decl("decodePortSpan"));
  need("packages/core/src/PortSpan.ts", [...decl("portInterpreter", "PortInterpreter"), ["does not import effect/Schema as a value", (t) => importsOf(blank(t, true)).some((i) => i.spec === "effect/Schema" && !i.typeOnly)]]);
  need("packages/react/src/GateWriter.ts", [...decl("makeGateRegistry", "GateRegistryOptions"), ["does not import ./DeveloperSignals.ts", (t) => importsOf(blank(t, true)).some((i) => i.spec === "./DeveloperSignals.ts")]]);
  need("packages/audit/src/ArchiveFacts.ts", [...decl("verifySequenceIntegrity", "SequenceIntegrityError"), ["does not hold tamper-evident", (t) => t.includes("tamper-evident")]]);
  need("packages/react/src/HydrationEngine.ts", [
    ...decl("dehydrateDecisions", "hydrateDecisions"),
    ["does not declare interface HydrationTarget", (t) => /\binterface\s+HydrationTarget\b/.test(blank(t))],
    ["does not type hydrateDecisions's first parameter HydrationTarget", (t) => {
      const code = blank(t);
      const at = code.search(/\bexport\s+(?:const|function)\s+hydrateDecisions\b/);
      return at >= 0 && /\(\s*[A-Za-z_$][\w$]*\s*:\s*HydrationTarget\b/.test(code.slice(at, at + 500));
    }],
  ]);
  need("packages/react/src/QadiAtoms.ts", [["does not declare interface QadiAtoms extends HydrationTarget", (t) => /\binterface\s+QadiAtoms\s+extends\s+HydrationTarget\b/.test(blank(t))], ["still holds a readonly hydrate: member", (t) => !/\breadonly\s+hydrate\s*:/.test(blank(t))]]);
  if (/\bHydrationTarget\b/.test(blank(ctx.barrelText ?? ""))) bad.push("packages/react/src/index.ts names HydrationTarget: it stays package-private");
  bad.push(...ctx.hits);
  const base = madgeBaseOf(ctx.spikeMd);
  if (base === undefined) bad.push(`${SPIKE_MD} has no madge files base line`);
  if (ctx.foldsMd === undefined) bad.push(`${FOLDS_MD} does not exist`);
  else {
    const deleted = [0, 1, 2, 3, 4, 5].map((i) => FOLDS.slice(0, i + 1).filter((f) => f.deletes !== undefined).length);
    FOLDS.forEach(({ subject }, i) => {
      const block = lastBlock(ctx.foldsMd, subject);
      if (block === undefined) {
        bad.push(`${FOLDS_MD} has no block ## ${subject}`);
        return;
      }
      const got = structuralBlock(block);
      if (shas[i] !== undefined && !(got.head !== undefined && shas[i].startsWith(got.head))) bad.push(`the block ${subject} records head ${got.head}, not ${shas[i]}`);
      for (const label of STRUCTURAL_COMMANDS) {
        const row = got.commands.find((c) => c.label === label);
        if (row === undefined) bad.push(`the block ${subject} records no ${label}`);
        else if (row.exit !== 0) bad.push(`the block ${subject} records ${label} exit ${row.exit}`);
      }
      if (base !== undefined && String(base - deleted[i]) !== got.madge) bad.push(`the block ${subject} records madge files ${got.madge}, not ${base - deleted[i]}`);
    });
  }
  return bad;
};

// ---- the escape check, the rule and the changesets ----

/** Reasons gate 14's escape check is not in place: the module's exports, the importing script's import and its header's check 3c. */
export const judgeEscapeModule = (moduleText, installText) => {
  if (moduleText === undefined) return ["scripts/lib/declaration-escape.mjs does not exist"];
  const bad = [];
  for (const name of ["declarationEscapes", "ESCAPE_SELF_CHECK"]) if (!declares(moduleText, name)) bad.push(`scripts/lib/declaration-escape.mjs does not export ${name}`);
  if (installText === undefined) return [...bad, "scripts/check-package-install.mjs does not exist"];
  const imported = importsOf(blank(installText, true)).find((i) => i.spec.endsWith("declaration-escape.mjs"));
  for (const name of ["declarationEscapes", "ESCAPE_SELF_CHECK"]) if (imported === undefined || !imported.names.includes(name)) bad.push(`scripts/check-package-install.mjs does not import ${name} from the escape module`);
  if (!/^\s*(?:\/\/|\*)?\s*3c\./m.test(installText)) bad.push("the header of scripts/check-package-install.mjs does not name check 3c");
  return bad;
};
/** Reasons gate 14's run is not a clean escape check over packed files: its exit, and the line it prints. */
export const judgeEscapeRun = (code, output) => [
  ...(code === 0 ? [] : [`scripts/check-package-install.mjs exited ${code}: ${failingLines(output).join(" | ")}`]),
  ...(/^declaration escape check: [1-9]\d* packed \.d\.ts file\(s\), none names a path outside its package or into src\/$/m.test(output) ? [] : ["gate 14 did not print `declaration escape check: <n> packed .d.ts file(s), none names a path outside its package or into src/` with n above zero"]),
];

export const NAMED_BARREL_PATHS = ["packages/audit/src/index.ts", "packages/core/src/index.ts", "packages/devtools/src/index.ts", "packages/devtools/src/react/index.ts", "packages/react/src/index.ts"];
const OLD_RULE = "devtools-named-barrel";
const HISTORY_ROW = /^> \| Change History \|/;
/** The index of the first line starting `start` (a blockquote block of `>` lines) that names every one of `tokens`, or -1. */
export const noteAt = (text, start, tokens) => {
  const lines = text.split("\n");
  for (let i = 0; i < lines.length; i++) {
    if (!lines[i].startsWith(start)) continue;
    let end = i + 1;
    while (end < lines.length && lines[end].startsWith(">") && !lines[end].startsWith(start)) end++;
    const block = lines.slice(i, end).join(" ");
    if (tokens.every((t) => block.includes(t))) return i;
  }
  return -1;
};
/** Reasons the named-barrel rule is not in place or the old rule's name is still live. `ctx` is `{ house, scripts: [{ file, text }], agents, contributing, trace, adr047, adr099 }`. */
export const judgeRule = (ctx) => {
  const bad = [];
  if (ctx.house === undefined) return ["scripts/check-house-style.mjs does not exist"];
  const at = ctx.house.search(/^const NAMED_BARRELS\b/m);
  const lit = at < 0 ? undefined : (() => {
    const eq = ctx.house.indexOf("=", at);
    const open = eq < 0 ? -1 : ctx.house.slice(eq).search(/[[({]/);
    return open < 0 ? undefined : literalAt(ctx.house, eq + open);
  })();
  if (lit === undefined) bad.push("scripts/check-house-style.mjs does not declare NAMED_BARRELS");
  else {
    const paths = [...lit.body.matchAll(/["'`]([^"'`]+)["'`]/g)].map((m) => m[1]);
    if (sorted(paths).join("\n") !== sorted(NAMED_BARREL_PATHS).join("\n")) bad.push(`NAMED_BARRELS lists ${sorted(paths).join(", ") || "nothing"}, not exactly ${NAMED_BARREL_PATHS.join(", ")}`);
  }
  for (const word of ["[named-barrel-self-test]", "[named-barrel]"]) if (!ctx.house.includes(word)) bad.push(`scripts/check-house-style.mjs does not hold ${word}`);
  if (/\bDEVTOOLS_BARRELS\b/.test(ctx.house)) bad.push("scripts/check-house-style.mjs still declares DEVTOOLS_BARRELS");
  const live = (file, text) => text.split("\n").forEach((l, i) => { if (l.includes(OLD_RULE) && !HISTORY_ROW.test(l)) bad.push(`${file}:${i + 1} names ${OLD_RULE}`); });
  for (const { file, text } of ctx.scripts) live(file, text);
  live("AGENTS.md", ctx.agents ?? "");
  live("CONTRIBUTING.md", ctx.contributing ?? "");
  live("spec/traceability.md", ctx.trace ?? "");
  for (const [file, text] of [["spec/decisions/047-a-headless-devtools-model.md", ctx.adr047], ["spec/decisions/099-entry-points-are-a-closed-list.md", ctx.adr099]]) {
    if (text === undefined) {
      bad.push(`${file} does not exist`);
      continue;
    }
    const amended = noteAt(text, "> **Amended (", ["ADR-QD-204", "named-barrel"]);
    if (amended < 0) bad.push(`${file} holds no > **Amended ( line naming ADR-QD-204 and named-barrel`);
    text.split("\n").forEach((l, i) => { if (l.includes(OLD_RULE) && !HISTORY_ROW.test(l) && (amended < 0 || i > amended)) bad.push(`${file}:${i + 1} names ${OLD_RULE} after its amendment`); });
  }
  return bad;
};

export const NO_EXPORT_CHANGES = "No export changes.";
const CORE_SENTENCE = "No export changes. The barrel names its exports per module; `decodePortSpan` and `PortInterpreter` are declared where their concepts live.";
const REACT_SENTENCE = "The barrel names its exports per module. `hydrateDecisions` takes any value with a `hydrate` method of the same signature (`QadiAtoms` still satisfies it, and `QadiAtoms` states that method through it); no call site changes. No export is added or removed.";
const REACT_FALLBACK = "No export changes. The barrel names its exports per module.";
const AUDIT_SENTENCE = "No export changes. The barrel names its exports per module; the sequence check is declared in the archive facts module.";
/**
 * The changesets the close expects, one patch per edited public package; the file, its package and the sentence each holds
 * (whitespace collapsed). Grown by name, each added entry a `No export changes.` patch, when the stale sweep edits another
 * public package.
 */
export const CHANGESETS = [
  { file: ".changeset/core-named-barrel.md", pkg: "@qadi/core", sentences: [CORE_SENTENCE] },
  { file: ".changeset/react-named-barrel.md", pkg: "@qadi/react", sentences: [REACT_SENTENCE], fallback: [REACT_FALLBACK] },
  { file: ".changeset/audit-named-barrel.md", pkg: "@qadi/audit", sentences: [AUDIT_SENTENCE] },
];
/**
 * Reasons the changesets are not the expected set. `ctx` is `{ added, edited, hydrationExists }`: the `{ file, text }` of each
 * changeset added since phase_base, the public packages edited since then (a change under `src/`, `README.md` or `package.json`),
 * and whether the react source still holds its `Hydration.ts` (the fallback wording then applies).
 */
export const judgeChangesets = (ctx) => {
  const bad = [];
  if (ctx.added.length !== CHANGESETS.length) bad.push(`${ctx.added.length} changesets are added since phase_base, not ${CHANGESETS.length}`);
  for (const { file } of ctx.added) if (!CHANGESETS.some((want) => want.file === file)) bad.push(`${file} is not one of ${CHANGESETS.map((want) => want.file).join(", ")}`);
  const named = [];
  for (const want of CHANGESETS) {
    const changeset = ctx.added.find(({ file }) => file === want.file);
    if (changeset === undefined) {
      bad.push(`${want.file} is not added since phase_base`);
      continue;
    }
    if (!changeset.text.startsWith(`---\n"${want.pkg}": patch\n---\n`)) bad.push(`${want.file} is not a patch changeset for ${want.pkg} alone`);
    else named.push(want.pkg);
    const flat = collapse(changeset.text);
    const sentences = ctx.hydrationExists && want.fallback !== undefined ? want.fallback : want.sentences;
    for (const sentence of sentences) if (!flat.includes(sentence)) bad.push(`${want.file} does not hold: ${sentence}`);
  }
  for (const pkg of sorted(ctx.edited)) if (!CHANGESETS.some((want) => want.pkg === pkg)) bad.push(`${pkg} is edited since phase_base and has no patch changeset`);
  for (const pkg of sorted(named)) if (!ctx.edited.includes(pkg)) bad.push(`a changeset names ${pkg}, which is not edited since phase_base`);
  return bad;
};

// ---- the spike ----

export const SPIKE_IDS = ["a", "b", "b-prime", "b-double-prime", "c", "d", "e", "e-prime", "e-prime-fold", "f"];
export const EXPECTED_VERDICTS = { a: "acyclic", b: "acyclic", "b-prime": "cycle", "b-double-prime": "cycle", c: "acyclic", d: "acyclic", e: "cycle", "e-prime": "acyclic", "e-prime-fold": "acyclic", f: "acyclic" };
/** The one-line madge verdict of a run's output, or undefined. */
export const madgeLine = (text) => /No circular dependency found|Found \d+ circular dependenc(?:y|ies)/.exec(text)?.[0];
/** The rows of the spike's verdict table by candidate: `{ id, cells, patch, sha, verdict }`, in file order. */
export const spikeRows = (md) =>
  md
    .split("\n")
    .filter((l) => l.startsWith("|"))
    .map((l) => l.split("|").slice(1, -1).map((c) => c.trim()))
    .filter((cells) => cells.length >= 6 && SPIKE_IDS.includes(cells[0].replace(/[`*_ ]/g, "")))
    .map((cells) => ({ id: cells[0].replace(/[`*_ ]/g, ""), cells, patch: /spike\/([\w-]+)\.patch/.exec(cells.join(" "))?.[1], sha: /\b[0-9a-f]{64}\b/.exec(cells.join(" "))?.[0], verdict: (/^[\s*_`]*(acyclic|cycle)\b/i.exec(cells.at(-1))?.[1] ?? "").toLowerCase() }));
/** The `exit: <n>` a run's recorded output ends with, from the part before any `house-style:` section, or undefined. */
const exitOf = (text) => {
  const part = text.split(/^house-style:/m)[0];
  const exits = [...part.matchAll(/^exit:\s*(\d+)\s*$/gm)];
  return exits.length === 0 ? undefined : Number(exits.at(-1)[1]);
};
/** What a candidate's recorded outputs say: a cycle when madge found one, acyclic when madge found none and tsc exited 0. */
export const computedVerdict = (madge, tsc) => {
  if (madge === undefined || tsc === undefined) return undefined;
  if (/Found \d+ circular dependenc(?:y|ies)/.test(madge)) return "cycle";
  return /No circular dependency found/.test(madge) && exitOf(tsc) === 0 ? "acyclic" : undefined;
};
/**
 * Reasons the spike's record disagrees with its patches and outputs. `read(path)` is a file's text or undefined, `hash(path)` the
 * sha256 of a file's bytes or undefined, `phaseBase` the recorded base.
 */
export const judgeSpike = (md, read, hash, phaseBase) => {
  if (md === undefined) return [`${SPIKE_MD} does not exist`];
  const bad = [];
  const base = /^spike base:\s*([0-9a-f]{40})\b/m.exec(md)?.[1];
  if (base === undefined) bad.push(`${SPIKE_MD} names no spike base sha`);
  else if (base !== phaseBase) bad.push(`${SPIKE_MD} says spike base ${base}, not phase_base ${phaseBase}`);
  if (madgeBaseOf(md) === undefined) bad.push(`${SPIKE_MD} has no madge files base line`);
  if (!/^layout:\s*per-package node_modules links present\s*$/m.test(md)) bad.push(`${SPIKE_MD} has no layout line: per-package node_modules links present`);
  const rows = spikeRows(md);
  for (const id of SPIKE_IDS) if (!rows.some((r) => r.id === id)) bad.push(`${SPIKE_MD} has no row for the candidate ${id}`);
  for (const row of rows) {
    const at = `the ${row.id} row`;
    if (row.patch !== row.id) bad.push(`${at} names the patch ${row.patch ?? "none"}, not ${row.id}`);
    const patchPath = `${SPIKE_DIR}${row.id}.patch`;
    const actual = hash(patchPath);
    if (actual === undefined) bad.push(`${patchPath} does not exist`);
    else if (row.sha === undefined) bad.push(`${at} states no sha256`);
    else if (actual !== row.sha) bad.push(`${patchPath} has another sha256 than ${at} states`);
    if (row.cells.slice(4, 7).some((c) => c === "")) bad.push(`${at} states no madge or tsc result`);
    const madge = read(`${SPIKE_DIR}out/${row.id}.madge.txt`);
    const tsc = read(`${SPIKE_DIR}out/${row.id}.tsc.txt`);
    if (madge === undefined) bad.push(`${SPIKE_DIR}out/${row.id}.madge.txt does not exist`);
    if (tsc === undefined) bad.push(`${SPIKE_DIR}out/${row.id}.tsc.txt does not exist`);
    if (madge === undefined || tsc === undefined) continue;
    const computed = computedVerdict(madge, tsc);
    if (row.verdict === "") bad.push(`${at} does not state acyclic or cycle`);
    else if (computed !== row.verdict) bad.push(`${at} states ${row.verdict} but its recorded outputs say ${computed ?? "neither"}`);
    if (EXPECTED_VERDICTS[row.id] !== row.verdict) bad.push(`${at} is ${row.verdict}, the expected verdict is ${EXPECTED_VERDICTS[row.id]}`);
    if (row.id === "f") {
      if (!/not folded/i.test(row.cells.join(" "))) bad.push(`${at} does not say not folded`);
      const house = tsc.split(/^house-style:/m)[1];
      if (house === undefined) bad.push(`${SPIKE_DIR}out/f.tsc.txt has no house-style: section`);
      else if (!/EvaluationSpan\.ts|ENOENT/.test(house) || !/^exit:\s*[1-9]\d*\s*$/m.test(house)) bad.push(`${SPIKE_DIR}out/f.tsc.txt does not record check-house-style failing because EvaluationSpan.ts is absent`);
    }
  }
  return bad;
};
/** Reasons a re-run of a candidate differs from its record: another madge verdict line, or another (file, code) group set. */
export const judgeRerun = (id, recorded, fresh) => {
  const bad = [];
  if (madgeLine(recorded.madge) !== madgeLine(fresh.madge)) bad.push(`${id}: madge says ${madgeLine(fresh.madge)}, the record says ${madgeLine(recorded.madge)}`);
  const was = new Set(tscGroups(recorded.tsc).map((g) => `${g.file} ${g.code}`));
  const now = new Set(tscGroups(fresh.tsc).map((g) => `${g.file} ${g.code}`));
  for (const k of sorted(now)) if (!was.has(k)) bad.push(`${id}: a tsc group the record lacks: ${k}`);
  for (const k of sorted(was)) if (!now.has(k)) bad.push(`${id}: a recorded tsc group is missing: ${k}`);
  return bad;
};


// ---- evidence: the blocks `variant` and `structural --record` append, and what `seen-failing` reads back ----

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
/** Reasons a directory is not the one scratch root: its last segment is not `qd91` or its parent is not the temporary directory. */
export const judgeScratchRoot = (path, tmp) => [
  ...(basename(path) === "qd91" ? [] : [`${path} does not end in qd91`]),
  ...(dirname(path) === tmp ? [] : [`${path} is not directly under the temporary directory ${tmp}`]),
];



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
const showAt = (rev, path) => {
  try {
    return git("show", `${rev}:${path}`);
  } catch {
    return undefined;
  }
};
/** Runs a command to completion with stdin closed: `{ code, out, err }`. */
const run = (argv, cwd, env) => {
  const r = spawnSync(argv[0], argv.slice(1), { cwd, env: env === undefined ? process.env : { ...process.env, ...env }, encoding: "utf8", maxBuffer: 1 << 28, stdio: ["ignore", "pipe", "pipe"] });
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

/** Removes the scratch root `root` when it is the one `qd91` directly under `tmp` (`check` removes nothing and fails while it exists). */
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
  writeFileSync(join(dir, ".git/qd91-origin"), `${sha}\n`);
  return dir;
};
const scratchDir = (name) => {
  const bad = judgeScratchName(name);
  if (bad.length > 0) return fail(bad);
  const dir = join(scratchRoot(), name);
  return existsSync(join(dir, ".git")) ? dir : fail([`${dir} is not a scratch clone: make it with scratch ${name}`]);
};

const KINDS = ["vitest", "tstyche", "tsc-src", "tsc-test", "house-style", "api", "circular", "surface", "package", "lint", "script"];
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
  if (kind === "surface") return outcome(run(["node", `${D}91-check.mjs`, "surface"], dir, { [MAIN_TREE_ENV]: process.cwd() }), { run: "surface" });
  if (kind === "package") return outcome(run(["node", "scripts/check-package-install.mjs"], dir), { run: "package" });
  if (kind === "lint") return outcome(run(["pnpm", "exec", "oxlint", ...args], dir), { run: `lint ${args.join(" ")}`.trim() });
  const [script, ...rest] = args;
  const phaseScript = script !== undefined && !script.includes("/") && existsSync(join(dir, D, script));
  const repoScript = script !== undefined && /^scripts\/[\w./-]+\.mjs$/.test(script) && !script.includes("..") && existsSync(join(dir, script));
  if (!phaseScript && !repoScript) return fail([`usage: variant ... script <a script of ${D} or a scripts/ file> [args...]`]);
  return outcome(run(["node", phaseScript ? `${D}${script}` : script, ...rest], dir, { [MAIN_TREE_ENV]: process.cwd() }), { run: `script ${args.join(" ")}` });
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
  const origin = readText(join(dir, ".git/qd91-origin")).trim();
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


/** The text of the `## <heading>` section of a markdown document, up to the next `## ` heading, or undefined. */
const sectionOf = (text, heading) => {
  const start = text.search(new RegExp(`^## ${escapeRe(heading)}`, "m"));
  if (start < 0) return undefined;
  const rest = text.slice(start + 3);
  const next = rest.search(/^## /m);
  return next < 0 ? rest : rest.slice(0, next);
};
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


// ---- the public surface ----

/** The figure gate 13 prints: `api-surface: <n> export(s) documented across <p> package(s)`, or undefined. */
export const gate13Of = (output) => /^api-surface: (\d+) export\(s\) documented across \d+ package\(s\)/m.exec(output)?.[1];
/** The `gate13: <n>` figure the surface record states, or undefined. */
export const recordedGate13 = (md) => /^gate13:\s*(\d+)\b/m.exec(md ?? "")?.[1];
/** Reasons gate 13's figure is not the recorded one. */
export const judgeGate13 = (output, md) => {
  const got = gate13Of(output);
  const want = recordedGate13(md);
  if (want === undefined) return [`${SURFACE_MD} has no gate13: line`];
  if (got === undefined) return ["gate 13 printed no api-surface line"];
  return got === want ? [] : [`gate 13 documents ${got} exports, the record says gate13: ${want}`];
};
/** The number of files madge processed in a `pnpm circular` output, or undefined. */
export const madgeFilesOf = (output) => /Processed (\d+) files/.exec(output)?.[1];

// ---- the records ----

const BEH_HOMES = { 791: "spec/behaviors/30-port-calls.md", 792: "spec/behaviors/19-hydration.md", 793: "spec/behaviors/09-react.md", 794: "spec/behaviors/33-audit-pipeline.md", 795: "spec/behaviors/09-react.md" };
const BEHAVIOR_DOCS = ["spec/behaviors/30-port-calls.md", "spec/behaviors/19-hydration.md", "spec/behaviors/09-react.md", "spec/behaviors/33-audit-pipeline.md"];
const INVARIANTS = "spec/invariants.md";
const ADR204 = "spec/decisions/204-named-barrels-and-visibility-only-files-folded-away.md";
const ADR_AMENDED = { "037": "spec/decisions/037-circular-imports-and-type-level-tests-are-gates.md", "047": "spec/decisions/047-a-headless-devtools-model.md", "099": "spec/decisions/099-entry-points-are-a-closed-list.md" };
const ADR_NOTED = {
  "009": ["spec/decisions/009-observability-via-effect.md", ["ArchiveFacts.ts"]],
  "039": ["spec/decisions/039-a-seed-is-not-an-authority.md", ["hydrateDecisions"]],
  "051": ["spec/decisions/051-a-span-says-what-was-asked.md", ["PortSpan.ts"]],
  "077": ["spec/decisions/077-both-interpreters-read-ports-through-one-module.md", ["decodePortSpan"]],
  "080": ["spec/decisions/080-a-gate-registry-belongs-to-its-atom-set.md", ["makeGateRegistry"]],
  "107": ["spec/decisions/107-a-port-is-answered-remotely-through-its-description.md", ["PortSpan.ts"]],
  "110": ["spec/decisions/110-an-archives-facts-are-computed-once.md", ["ArchiveFacts.ts"]],
  "140": ["spec/decisions/140-a-gates-write-side-is-a-leaf-below-the-atom-set.md", ["DeveloperSignals.ts"]],
};
const AMENDMENT_NAMES = {
  "037": ["PortSpanEncode.ts", "PortKey.ts", "QuestionBook.ts", "MissingQadiProviderError.ts", "SinkWire.ts", "JsonRefusal.ts", "SinkRecordFields.ts", "PortSpanDecode.ts", "PortInterpreter.ts", "GateRegistry.ts", "SequenceIntegrity.ts", "Hydration.ts"],
  "047": ["named-barrel", "test/surface.test.ts"],
  "099": ["@qadi/core", "@qadi/react", "@qadi/audit", "package-private"],
};
const SURFACE_TESTS = ["packages/core/test/surface.test.ts", "packages/react/test/surface.test.ts", "packages/audit/test/surface.test.ts"];
/** The documents whose revision the plans' bump table names. */
export const REQUIRED_REVISED = ["spec/process/definitions-of-done.md", "spec/README.md", "spec/traceability.md", ADR_AMENDED["037"], ADR_AMENDED["047"], ADR_AMENDED["099"], ...BEHAVIOR_DOCS, INVARIANTS, "spec/overview.md", "spec/urs.md", "spec/models/17-purpose.md", ...["039", "051", "077", "080", "107", "110", "140"].map((n) => ADR_NOTED[n][0])];
const RESERVED = ["BEH-QD-791", "BEH-QD-792", "BEH-QD-793", "BEH-QD-794", "BEH-QD-795", "INV-QD-427", "INV-QD-428", "ADR-QD-204"];
const DELETED_NAMES = /\b(?:PortSpanDecode|PortInterpreter|GateRegistry|SequenceIntegrity)\.ts\b/;
const OVERVIEW_SOURCES = { decodePortSpan: "PortSpanEncode.ts", makeGateRegistry: "GateWriter.ts", dehydrateDecisions: "HydrationEngine.ts", verifySequenceIntegrity: "ArchiveFacts.ts" };

/** The line of a block opening `start` in a document, with its continuation `>` lines, or undefined. */
const noteBlock = (text, start, tokens) => {
  const at = noteAt(text, start, tokens);
  if (at < 0) return undefined;
  const lines = text.split("\n");
  let end = at + 1;
  while (end < lines.length && lines[end].startsWith(">") && !lines[end].startsWith(start)) end++;
  return lines.slice(at, end).join(" ");
};
/** Whether `text` holds each token, reading a hand-wrapped line break or a run of spaces as one space, as a reader does. */
const needAll = (bad, label, text, tokens) => {
  const flat = collapse(text);
  for (const t of tokens) if (!flat.includes(collapse(t))) bad.push(`${label} does not name ${t}`);
};
/** Reasons the pinned-by lists of the behaviors documents name a test file that does not exist. `read(path)` is a text or undefined. */
export const judgePinnedExist = (docs, resolve, exists) => {
  const bad = [];
  for (const [file, doc] of docs) {
    for (const m of doc.matchAll(/^## (BEH-QD-\d+):/gm)) {
      const para = pinnedPara(sectionOf(doc, `${m[1]}:`) ?? "");
      for (const p of para.matchAll(TEST_PATH)) {
        const path = p[1].startsWith("packages/") ? p[1] : resolve(p[1].replace(/^test\//, ""));
        if (path === undefined || !exists(path)) bad.push(`${m[1]} (${file}) names ${p[1]}, which does not exist`);
      }
    }
  }
  return bad;
};
/** The rows of the overview whose first cell names `name`, alone or among others (`a`, `b`). */
const overviewRows = (text, name) => text.split("\n").filter((l) => l.startsWith("|") && (l.split("|")[1] ?? "").split(",").some((cell) => cell.trim() === `\`${name}\``));

/**
 * Reasons a record the phase writes is missing or wrong. `ctx` is `{ read, readBase, changed, resolve, exists, shas }`: a reader
 * of a path's text at HEAD and at phase_base, the spec documents changed since phase_base, a resolver of a bare test file name,
 * whether a path exists, and the eight-hex short sha of each fold commit by subject.
 */
export const judgeRecordsClose = (ctx) => {
  const bad = [];
  const need = (path) => {
    const text = ctx.read(path);
    if (text === undefined) bad.push(`${path} does not exist`);
    return text;
  };
  const readme = need("spec/README.md") ?? "";
  const row = readme.split("\n").find((l) => l.startsWith("| CCR-QD-483 |"));
  if (row === undefined) bad.push("spec/README.md holds no row | CCR-QD-483 |");
  const unused = new Set(row === undefined ? [] : RESERVED.filter((id) => (row.split("Unused:")[1] ?? "").includes(id)));
  if (row !== undefined) {
    needAll(bad, "the CCR-QD-483 row", row, ["ARCH-138", "09-react.md", ...ctx.changed.filter((p) => p !== ADR204)]);
    for (const id of RESERVED) if (!row.includes(id) && !unused.has(id)) bad.push(`the CCR-QD-483 row does not name ${id}`);
  }
  for (const [n, file] of Object.entries(BEH_HOMES)) {
    const id = `BEH-QD-${n}`;
    if (unused.has(id)) continue;
    const doc = need(file) ?? "";
    const count = [...doc.matchAll(new RegExp(`^## ${id}:`, "gm"))].length;
    if (count !== 1) bad.push(`${file} holds ${count} headings ## ${id}:, not one`);
    else if (pinnedPara(sectionOf(doc, `${id}:`) ?? "").match(TEST_PATH) === null) bad.push(`${id} names no test file in a Pinned by paragraph`);
  }
  bad.push(...judgePinnedExist(BEHAVIOR_DOCS.map((f) => [f, ctx.read(f) ?? ""]), ctx.resolve, ctx.exists));
  const inv = need(INVARIANTS) ?? "";
  for (const n of [427, 428]) {
    const id = `INV-QD-${n}`;
    if (unused.has(id)) continue;
    const section = sectionOf(inv, `${id}:`);
    if (section === undefined) {
      bad.push(`${INVARIANTS} has no heading ## ${id}:`);
      continue;
    }
    if (n === 427 && !section.includes("#inv-qd-027-")) bad.push(`${id} does not link an anchor starting #inv-qd-027-`);
    if (n === 428) needAll(bad, id, section, ["PortSpanEncode.ts", "PortKey.ts", "pnpm circular"]);
  }
  const adr = need(ADR204);
  if (adr !== undefined && !unused.has("ADR-QD-204")) {
    if (revisionOf(adr)?.text !== "1.0") bad.push(`${ADR204} is not at Revision 1.0`);
    const status = /^>\s*\|\s*Status\s*\|(.*)$/m.exec(adr)?.[1] ?? "";
    needAll(bad, `the Status of ${ADR204}`, status, ["ADR-QD-037", "ADR-QD-047", "ADR-QD-099"]);
    const history = /^>\s*\|\s*Change History\s*\|(.*)$/m.exec(adr)?.[1] ?? "";
    if (!history.includes("1.0 (") || !history.includes("ARCH-138") || !history.includes("CCR-QD-483")) bad.push(`the Change History of ${ADR204} has no 1.0 ( entry naming ARCH-138 and CCR-QD-483`);
    const enforces = sectionOf(adr, "What enforces it");
    if (enforces === undefined) bad.push(`${ADR204} has no ## What enforces it section`);
    else {
      if (/gate\s+\d+/i.test(enforces)) bad.push("the What enforces it section of ADR-QD-204 holds a gate <digits> text");
      needAll(bad, "the What enforces it section of ADR-QD-204", enforces, ["node scripts/check-house-style.mjs", "node scripts/surface-diff.mjs --self-test", "node scripts/check-api-surface.mjs", "node scripts/check-package-install.mjs", "pnpm circular", ...SURFACE_TESTS, "in `pnpm check`", "phase-local"]);
    }
    needAll(bad, "ADR-QD-204", adr, [...SPIKE_IDS, ...Object.values(ctx.shas), "HydrationTarget", "EvaluationSpan.ts", "not folded", "named-barrel", "[named-barrel-self-test]", "surface:self-test", "gate13:"]);
    if (Object.keys(ctx.shas).length !== FOLDS.length) bad.push(`${Object.keys(ctx.shas).length} fold commits found for ${FOLDS.length} folds: ADR-QD-204 cannot name each short sha`);
  } else if (adr === undefined && !unused.has("ADR-QD-204")) bad.push("ADR-QD-204 is neither written nor named after Unused:");
  for (const [n, file] of Object.entries(ADR_AMENDED)) {
    const text = ctx.read(file);
    if (text === undefined) {
      bad.push(`${file} does not exist`);
      continue;
    }
    const block = noteBlock(text, "> **Amended (", ["ADR-QD-204", "CCR-QD-483"]);
    if (block === undefined) bad.push(`${file} holds no > **Amended ( line naming ADR-QD-204 and CCR-QD-483`);
    else needAll(bad, `the amendment of ADR-QD-${n}`, block, AMENDMENT_NAMES[n]);
  }
  for (const [n, [file, names]] of Object.entries(ADR_NOTED)) {
    const text = ctx.read(file);
    if (text === undefined) {
      bad.push(`${file} does not exist`);
      continue;
    }
    const block = noteBlock(text, "> **Note (", ["ADR-QD-204", "CCR-QD-483"]);
    if (block === undefined) bad.push(`${file} holds no > **Note ( line naming ADR-QD-204 and CCR-QD-483`);
    else needAll(bad, `the note of ADR-QD-${n}`, block, names);
  }
  const index = need("spec/decisions/index.yaml") ?? "";
  const entry = (id) => indexEntryOf(index, id);
  if (!unused.has("ADR-QD-204") && !(entry("ADR-QD-204") ?? "").includes("204-named-barrels-and-visibility-only-files-folded-away.md")) bad.push("spec/decisions/index.yaml holds no ADR-QD-204 entry naming its file");
  for (const n of ["037", "047", "099"]) if (!(entry(`ADR-QD-${n}`) ?? "").includes("ADR-QD-204")) bad.push(`the index entry of ADR-QD-${n} does not name ADR-QD-204 in its status`);
  const trace = need("spec/traceability.md") ?? "";
  for (const id of RESERVED.filter((i) => !unused.has(i))) if (!trace.split("\n").some((l) => l.includes(id) && l.startsWith("|"))) bad.push(`spec/traceability.md holds no row naming ${id}`);
  for (const p of [...SURFACE_TESTS, "packages/react/test/HydrationTarget.tst.ts", "scripts/surface-diff.mjs"]) if (!trace.split("\n").some((l) => l.startsWith("|") && l.includes(p))) bad.push(`spec/traceability.md holds no row naming ${p}`);
  const overview = need("spec/overview.md") ?? "";
  overview.split("\n").forEach((l, i) => {
    if (l.startsWith("> | Change History |")) return;
    if (DELETED_NAMES.test(l) || (/(?<![\w/])Hydration\.ts\b/.test(l) && !/devtools|model\//i.test(l))) bad.push(`spec/overview.md:${i + 1} names a deleted file: ${l.trim().slice(0, 100)}`);
  });
  for (const [name, file] of Object.entries(OVERVIEW_SOURCES)) {
    const rows = overviewRows(overview, name);
    if (rows.length === 0) bad.push(`spec/overview.md has no row for ${name}`);
    for (const r of rows) if (!(r.split("|")[3] ?? "").trim().startsWith(`\`${file}\``)) bad.push(`the ${name} row of spec/overview.md has a Source cell that does not start with \`${file}\``);
  }
  const entryPoints = sectionOf(overview, "Entry points");
  if (entryPoints === undefined || !entryPoints.includes("package-private")) bad.push("the Entry points section of spec/overview.md does not hold package-private");
  for (const file of ctx.changed) {
    if (file === ADR204) continue;
    const base = ctx.readBase(file);
    const now = ctx.read(file);
    const was = base === undefined ? undefined : revisionOf(base);
    const is = now === undefined ? undefined : revisionOf(now);
    if (was === undefined || was === null) {
      if (is !== undefined && is !== null) bad.push(`${file} had no Revision row at phase_base and has one at HEAD`);
    } else if (is === undefined || is === null || is.major !== was.major || is.minor !== was.minor + 1) bad.push(`${file} is at ${is?.text ?? "no revision"}, not one minor above ${was.text}`);
  }
  for (const file of REQUIRED_REVISED) if (!ctx.changed.includes(file)) bad.push(`${file} is not changed since phase_base: the phase revises it`);
  const project = need(".planning/PROJECT.md") ?? "";
  if (project.split("\n").some((l) => l.startsWith("- Splitting the Port* family files"))) bad.push(".planning/PROJECT.md still holds the line - Splitting the Port* family files");
  if (project.includes("Phase 86 review IN-02")) bad.push(".planning/PROJECT.md still holds Phase 86 review IN-02");
  if (!project.split("\n").some((l) => l.includes("commit-first, hold-last") && l.includes("re-run in Phase 91"))) bad.push(".planning/PROJECT.md's provider-order line does not hold re-run in Phase 91");
  const agents = need("AGENTS.md") ?? "";
  const s9 = sectionSpan(agents, "9.");
  const s16 = sectionSpan(agents, "16.");
  const s7a = sectionSpan(agents, "7a.");
  if (s9 === undefined || s16 === undefined || s7a === undefined) bad.push("AGENTS.md has no section 7a, 9 or 16");
  else {
    needAll(bad, "AGENTS.md section 9", agents.slice(...s9), ["named-barrel", "@qadi/core", "@qadi/react", "@qadi/audit", "@qadi/devtools", "test/surface.test.ts"]);
    needAll(bad, "AGENTS.md section 16", agents.slice(...s16), ["check-package-install.mjs", "src/", "outside its own package"]);
    if (!agents.slice(...s7a).split("\n").some((l) => l.includes("PortSpanEncode.ts") && l.includes("decodePortSpan"))) bad.push("AGENTS.md section 7a's PortSpanEncode.ts row does not name decodePortSpan");
  }
  const contributing = need("CONTRIBUTING.md") ?? "";
  if (!contributing.split("\n").some((l) => l.startsWith("| A public export") && l.includes("test/surface.test.ts"))) bad.push("CONTRIBUTING.md's A public export row does not name test/surface.test.ts");
  if (!contributing.split("\n").some((l) => l.startsWith("|") && l.includes("scripts/surface-diff.mjs"))) bad.push("CONTRIBUTING.md has no row naming scripts/surface-diff.mjs");
  const lease = need("packages/react/src/RegistryLease.ts") ?? "";
  const header = lease.slice(0, lease.indexOf("*/") + 2);
  if (!header.includes("RegistryOwner.ts")) bad.push("packages/react/src/RegistryLease.ts's header does not name RegistryOwner.ts as its one caller");
  if (/`QadiProvider\.tsx`\s+is\s+its\s+one\s+caller/.test(collapse(header))) bad.push("packages/react/src/RegistryLease.ts's header still claims QadiProvider.tsx as its one caller");
  return bad;
};

/** The plain `records` mode's reasons: the pinned-by lists name existing tests, and the revision check run exits 0. */
export const judgeRecordsPlain = (docs, resolve, exists, reviseCode, reviseOut) => [
  ...judgePinnedExist(docs, resolve, exists),
  ...(reviseCode === 0 ? [] : [`node scripts/spec-revise.mjs --check exited ${reviseCode}: ${failingLines(reviseOut).join(" | ")}`]),
];



// ---- the close ----

const GUARDED = ["AGENTS.md", "scripts/check-house-style.mjs", ".oxlintrc.json"];
const HYDRATION_TEST = "packages/react/test/HydrationTarget.tst.ts";
/** The children the close runs, in order: `{ label, argv }`. */
export const closeChildren = () => [
  { label: `node ${D}91-pinned-check.mjs --all-applied`, argv: ["node", `${D}91-pinned-check.mjs`, "--all-applied"] },
  { label: `node ${D}91-earlier-checks.mjs`, argv: ["node", `${D}91-earlier-checks.mjs`] },
  ...["records --close", "scan-ids", "scan-forbidden", "trailers", "barrels", "homes", "folds", "rule", "changesets", "spike", "circular", `vitest ${SURFACE_TESTS.join(" ")}`, ...[...SURFACE_TESTS, HYDRATION_TEST].map((f) => `seen-failing ${f}`), "seen-failing packages/react/test/HydrationFold.test.ts --if-present", "seen-failing packages/react/test/GateRegistryFold.test.ts --if-present"].map((m) => ({ label: `91-check.mjs ${m}`, argv: ["node", SELF, ...m.split(" ")] })),
  ...["compare", "landed close", "landed coverage-close"].map((m) => ({ label: `91-mutation.mjs ${m}`, argv: ["node", `${D}91-mutation.mjs`, ...m.split(" ")] })),
  { label: "91-check.mjs escape", argv: ["node", SELF, "escape"] },
];
const noReleaseFacts = (base) => ({
  versions: git("ls-files", "--", "packages/*/package.json").split("\n").filter((p) => p !== "").map((file) => ({ file, base: JSON.parse(showAt(base, file) ?? "{}").version, now: JSON.parse(readText(file)).version })),
  changelogs: git("diff", "--name-only", base, "HEAD", "--", ":(glob)**/CHANGELOG.md").split("\n").filter((p) => p !== ""),
  tags: git("tag", "--points-at", "HEAD").split("\n").filter((t) => t !== ""),
  milestones: git("log", `${base}..HEAD`, "--name-only", "--format=", "--", ".planning/milestones").split("\n").filter((p) => p !== ""),
});
const closeMode = () => {
  const base = readBase();
  const { lines, bad } = runChildren(closeChildren(), (argv) => {
    const r = run(argv, process.cwd());
    const lastOf = (s) => s.split("\n").filter((l) => l.trim() !== "").at(-1);
    return { code: r.code, last: lastOf(r.out) ?? lastOf(r.err) ?? "" };
  });
  for (const line of lines) console.log(line);
  bad.push(...judgeNoRelease(noReleaseFacts(base)));
  done(bad, `close: ${lines.length} checks and the no-release facts pass`);
};

// ---- readers for the shape modes ----

const MAIN_TREE_ENV = "QD91_MAIN_TREE";
/** The root whose phase records a run reads: the main tree when a variant runs in a clone, else the working directory. */
const mainTree = () => process.env[MAIN_TREE_ENV] ?? process.cwd();
const mainText = (rel) => maybe(join(mainTree(), rel));
const lastLine = (r) => {
  const pick = (s) => s.split("\n").filter((l) => l.trim() !== "").at(-1);
  return pick(r.out) ?? pick(r.err) ?? "";
};
const srcDirFiles = (pkg) => treeFiles(`packages/${pkg}/src`).filter((p) => /\.(?:ts|tsx)$/.test(p));
const snapshotOf = (pkg) => {
  const text = mainText(SURFACE_BASE);
  if (text === undefined) return undefined;
  try {
    const entries = JSON.parse(text).entries ?? {};
    return (entries[`@qadi/${pkg}`] ?? entries[pkg])?.names;
  } catch {
    return undefined;
  }
};

const surfaceMode = () => {
  const bad = [];
  if (!existsSync("scripts/surface-diff.mjs")) bad.push("scripts/surface-diff.mjs does not exist");
  if (mainText(SURFACE_BASE) === undefined) bad.push(`${SURFACE_BASE} does not exist`);
  if (mainText(SURFACE_MD) === undefined) bad.push(`${SURFACE_MD} does not exist`);
  if (bad.length > 0) return fail(bad);
  const root = scratchRoot();
  mkdirSync(root, { recursive: true });
  const snapshot = join(root, `surface-${process.pid}.json`);
  try {
    const steps = [
      ["pnpm build", ["pnpm", "build"]],
      ["surface-diff snapshot", ["node", "scripts/surface-diff.mjs", "snapshot", snapshot]],
      ["surface-diff compare", ["node", "scripts/surface-diff.mjs", "compare", join(mainTree(), SURFACE_BASE), snapshot]],
      ["check-api-surface", ["node", "scripts/check-api-surface.mjs"]],
    ];
    let compared = "";
    let gate = "";
    for (const [label, argv] of steps) {
      const r = run(argv, process.cwd());
      if (r.code !== 0) return fail([`${label} exited ${r.code}: ${failingLines(`${r.err}\n${r.out}`).join(" | ")}`]);
      if (label === "surface-diff compare") compared = r.out;
      if (label === "check-api-surface") gate = r.out;
    }
    const total = /^surface-diff: equal, (\d+) exports/m.exec(compared)?.[1];
    if (total === undefined) return fail(["surface-diff compare did not print surface-diff: equal"]);
    return done(judgeGate13(gate, mainText(SURFACE_MD)), `surface: equal to the base, ${total} exports`);
  } finally {
    rmSync(snapshot, { force: true });
  }
};

/**
 * Appends the block of one structural run to `file` (made with its heading when absent) and returns how many commands failed.
 * The block is written for a failure too, so a red run is on the record. `results` is `{ label, code, last, madge? }` per command.
 */
export const recordStructural = (file, what, subject, head, results) => {
  const prior = maybe(file);
  const madge = results.find((r) => r.madge !== undefined)?.madge ?? "?";
  const block = [`## ${subject}`, `- head: ${head}`, `- madge files: ${madge}`, ...results.map((r) => `- ${r.label}: exit ${r.code}: ${r.last}`), ""].join("\n");
  const lead = prior === undefined ? `# Phase 91 ${what}\n\n` : prior === "" || prior.endsWith("\n\n") ? "" : prior.endsWith("\n") ? "\n" : "\n\n";
  appendFileSync(file, `${lead}${block}`);
  return results.filter((r) => r.code !== 0).length;
};

const structuralMode = (args) => {
  const usage = ['usage: structural --record <BARRELS|FOLDS> "<subject>"'];
  const [flag, which, subject] = args;
  if (args.length !== 3 || flag !== "--record" || !["BARRELS", "FOLDS"].includes(which)) return fail(usage);
  const hits = commitsSince(readBase()).filter((c) => c.subject === subject);
  if (PHASE_COMMITS.every((r) => r.subject !== subject)) return fail([`${subject} is not a subject of the phase table`]);
  if (hits.length !== 1) return fail([`${hits.length} commits since phase_base have the subject: ${subject}`]);
  const head = git("rev-parse", "HEAD").trim();
  if (hits[0].sha !== head) return fail([`HEAD is ${head.slice(0, 8)}, not the commit ${hits[0].sha.slice(0, 8)} with the subject: ${subject}`]);
  const argvOf = { "pnpm circular": ["pnpm", "circular"], "pnpm build": ["pnpm", "build"], "pnpm typecheck": ["pnpm", "typecheck"], [STRUCTURAL_COMMANDS[3]]: ["node", SELF, "surface"], "pnpm spec:package": ["pnpm", "spec:package"], "node scripts/check-house-style.mjs": ["node", "scripts/check-house-style.mjs"] };
  const results = STRUCTURAL_COMMANDS.map((label) => {
    const r = run(argvOf[label], process.cwd());
    return { label, code: r.code, last: lastLine(r), madge: label === "pnpm circular" ? madgeFilesOf(`${r.out}\n${r.err}`) : undefined };
  });
  const file = which === "BARRELS" ? BARRELS_MD : FOLDS_MD;
  const failed = recordStructural(file, which === "BARRELS" ? "barrel generation" : "fold verdicts", subject, head, results);
  return failed > 0 ? fail([`${failed} structural commands failed at ${head.slice(0, 8)}; recorded in ${file}`]) : console.log(`structural: ${subject}: every command exit 0, recorded in ${file}`);
};

const barrelsMode = (args) => {
  if (args.length > 1 || (args.length === 1 && args[0] !== "--text")) return fail(["usage: barrels [--text]"]);
  const bad = BARRELS.flatMap(({ path }) => judgeBarrel(path, maybe(path), existsSync));
  if (bad.length > 0) return fail(bad);
  if (args.length === 0) {
    const r = run(["node", SELF, "surface"], process.cwd());
    if (r.code !== 0) return fail([`surface exited ${r.code}: ${failingLines(`${r.err}\n${r.out}`).join(" | ")}`]);
  }
  return console.log(`barrels: ${BARRELS.length} barrels are named per module${args.length === 0 ? ", and the surface equals the base" : ""}`);
};

const homesMode = () => {
  const base = readBase();
  if (mainText(SURFACE_BASE) === undefined) return fail([`${SURFACE_BASE} does not exist: the kinds of the base names cannot be read`]);
  const bad = BARRELS.flatMap(({ pkg, path }) =>
    judgeHomes({ pkg, srcDir: `packages/${pkg}/src`, headText: maybe(path), baseText: showAt(base, path), snapshot: snapshotOf(pkg), readBase: (p) => showAt(base, p), existsHead: existsSync, readHead: maybe, srcFiles: srcDirFiles(pkg) }),
  );
  return done(bad, `homes: every name of ${BARRELS.length} barrels sits at its home, in its kind's group`);
};

const SOURCE_ROOTS = ["packages/*/src", "packages/*/test", "packages/*/bench", "features", "examples", "apps"];
const foldsMode = () => {
  const base = readBase();
  const commits = commitsSince(base);
  const gone = FOLDS.flatMap((f) => (f.deletes === undefined ? [] : [f.deletes]));
  const files = treeFiles(...SOURCE_ROOTS)
    .filter((p) => /\.(?:ts|tsx|mts)$/.test(p) && !p.includes("node_modules"))
    .map((file) => ({ file, text: readText(file) }));
  const ctx = {
    commits,
    descends: (a, b) => run(["git", "merge-base", "--is-ancestor", a, b], process.cwd()).code === 0,
    exists: existsSync,
    read: maybe,
    spikeMd: maybe(SPIKE_MD),
    foldsMd: maybe(FOLDS_MD),
    barrelText: maybe("packages/react/src/index.ts"),
    hits: deletedImports(files, gone),
  };
  return done(judgeFolds(ctx), `folds: ${FOLDS.length} folds landed, ${gone.length} files gone, each with its structural block`);
};

const escapeMode = () => {
  const bad = judgeEscapeModule(maybe("scripts/lib/declaration-escape.mjs"), maybe("scripts/check-package-install.mjs"));
  if (bad.length > 0) return fail(bad);
  const r = run(["node", "scripts/check-package-install.mjs"], process.cwd());
  return done(judgeEscapeRun(r.code, `${r.out}\n${r.err}`), "escape: gate 14's declaration escape check ran clean over the packed declarations");
};
const dtsFiles = (dir) =>
  existsSync(dir)
    ? readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? (e.name === "node_modules" ? [] : dtsFiles(join(dir, e.name))) : e.name.endsWith(".d.ts") ? [join(dir, e.name)] : []))
    : [];
/** Reasons a built library directory's declarations escape their package, by `declarationEscapes`: one `<file>: <reason>` per refusal, and one when nothing was read. */
export const judgeEscapeScan = (files, escapes) => (files.length === 0 ? ["no .d.ts file was found: nothing was scanned"] : files.flatMap(({ file, text }) => escapes(file, text).map((r) => `${file}: ${r}`)));
const escapeScanMode = async (args) => {
  if (args.length !== 1) return fail(["usage: escape-scan <lib-dir>"]);
  const module = resolve("scripts/lib/declaration-escape.mjs");
  if (!existsSync(module)) return fail(["scripts/lib/declaration-escape.mjs does not exist"]);
  const { declarationEscapes } = await import(pathToFileURL(module).href);
  const lib = resolve(args[0]);
  const root = dirname(lib);
  const files = dtsFiles(lib).map((file) => ({ file: relative(root, file), text: readText(file) }));
  return done(judgeEscapeScan(files, (file, text) => declarationEscapes(root, file, text)), `escape-scan: ${files.length} declaration files under ${args[0]} stay inside their package`);
};

const ruleMode = () => {
  const scripts = treeFiles("scripts").filter((p) => /\.(?:mjs|js|ts|json|md)$/.test(p)).map((file) => ({ file, text: readText(file) }));
  const bad = judgeRule({
    house: maybe("scripts/check-house-style.mjs"),
    scripts,
    agents: maybe("AGENTS.md"),
    contributing: maybe("CONTRIBUTING.md"),
    trace: maybe("spec/traceability.md"),
    adr047: maybe(ADR_AMENDED["047"]),
    adr099: maybe(ADR_AMENDED["099"]),
  });
  const r = run(["node", "scripts/check-house-style.mjs"], process.cwd());
  if (r.code !== 0) bad.push(`node scripts/check-house-style.mjs exited ${r.code}: ${failingLines(`${r.err}\n${r.out}`).join(" | ")}`);
  return done(bad, "rule: the named-barrel rule governs the five barrels and no live old rule name remains");
};

/** The pathspecs of what edits a public package: a file under `src/` (a trailing `/*`, because a glob pathspec does not take a directory's contents), its README or its manifest. */
export const EDITED_PATHSPECS = ["packages/*/src/*", "packages/*/README.md", "packages/*/package.json"];
const editedPublicPackages = (base) => {
  const names = new Set();
  const paths = git("diff", "--name-only", base, "HEAD", "--", ...EDITED_PATHSPECS).split("\n").filter((p) => p !== "");
  for (const dir of new Set(paths.map((p) => p.split("/")[1]))) {
    const manifest = maybe(`packages/${dir}/package.json`);
    if (manifest === undefined) continue;
    const json = JSON.parse(manifest);
    if (json.private !== true) names.add(json.name);
  }
  return [...names];
};
const changesetsMode = () => {
  const base = readBase();
  const added = git("diff", "--name-only", "--diff-filter=A", base, "HEAD", "--", ".changeset").split("\n").filter((p) => /^\.changeset\/[^/]+\.md$/.test(p) && p !== ".changeset/README.md").map((file) => ({ file, text: showAt("HEAD", file) ?? "" }));
  return done(judgeChangesets({ added, edited: editedPublicPackages(base), hydrationExists: existsSync("packages/react/src/Hydration.ts") }), `changesets: ${CHANGESETS.length} patch changesets, one per edited public package`);
};

const spikeMode = (args) => {
  if (args.length > 1 || (args.length === 1 && args[0] !== "--rerun")) return fail(["usage: spike [--rerun]"]);
  const base = readBase();
  const md = maybe(SPIKE_MD);
  const bad = judgeSpike(md, maybe, (p) => (existsSync(p) ? createHash("sha256").update(readFileSync(p)).digest("hex") : undefined), base);
  if (args.length === 1 && md !== undefined) {
    for (const row of spikeRows(md)) {
      const dir = makeScratch(`spike-${row.id}`, "phase_base");
      const applied = run(["git", "apply", join(process.cwd(), `${SPIKE_DIR}${row.id}.patch`)], dir);
      const fresh =
        applied.code !== 0
          ? { madge: `the patch does not apply: ${failingLines(applied.err).join(" ")}`, tsc: "the patch does not apply" }
          : (() => {
              const m = run(["pnpm", "circular"], dir);
              const t = run(["pnpm", "exec", "tsc", "-b", "tsconfig.build.json", "--pretty", "false"], dir);
              return { madge: `${m.out}\n${m.err}`, tsc: `${t.out}\n${t.err}` };
            })();
      bad.push(...judgeRerun(row.id, { madge: maybe(`${SPIKE_DIR}out/${row.id}.madge.txt`) ?? "", tsc: maybe(`${SPIKE_DIR}out/${row.id}.tsc.txt`) ?? "" }, fresh));
    }
  }
  return done(bad, `spike: ${SPIKE_IDS.length} candidates, each patch hashed and each verdict agreeing with its recorded outputs${args.length === 1 ? ", each re-applied and re-measured on the base" : ""}`);
};

const resolveBare = (name) => git("ls-files", "--", `packages/*/test/**/${name}`, `packages/*/test/${name}`).split("\n").find((p) => p !== "");
const recordsMode = (args) => {
  const close = args[0] === "--close";
  if (args.length > 0 && !close) return fail(["usage: records [--close]"]);
  const docs = BEHAVIOR_DOCS.map((f) => [f, maybe(f) ?? ""]);
  const revise = run(["node", "scripts/spec-revise.mjs", "--check"], process.cwd());
  const bad = judgeRecordsPlain(docs, resolveBare, existsSync, revise.code, `${revise.out}\n${revise.err}`);
  if (close) {
    const base = readBase();
    const changed = [...new Set([...git("diff", "--name-only", base, "--", "spec").split("\n"), ...git("ls-files", "--others", "--exclude-standard", "--", "spec").split("\n")])].filter((p) => p.endsWith(".md") && existsSync(p));
    const commits = commitsSince(base);
    const shas = Object.fromEntries(FOLDS.flatMap(({ subject }) => commits.filter((c) => c.subject === subject).map((c) => [subject, c.sha.slice(0, 8)])));
    bad.push(...judgeRecordsClose({ read: maybe, readBase: (p) => showAt(base, p), changed, resolve: resolveBare, exists: existsSync, shas }));
  }
  const ok = "records: the pinned-by lists name tests that exist";
  return done(bad, close ? `${ok}, and every record of the phase is written` : ok);
};

// ---- modes ----

const MODES = {
  base: () => console.log(readBase()),
  commit: (args) => {
    const [subject, ...paths] = args;
    if (subject === undefined || paths.length === 0) return fail(["usage: commit <subject> <path>..."]);
    return done(judgeCommit(commitsSince(readBase()), subject, paths, (sha) => (path) => showAt(sha, path)), `commit: ${subject}`);
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
    const flags = args.filter((a) => a === "--if-present");
    const [file] = args.filter((a) => !flags.includes(a));
    if (file === undefined || args.length > 2) return fail(["usage: seen-failing <file> [--if-present]"]);
    if (!existsSync(file)) return flags.length > 0 ? console.log(`seen-failing: ${file} absent`) : fail([`${file} does not exist`]);
    const titles = (() => {
      if (/\.tst\.tsx?$/.test(file)) return titlesOf(readText(file));
      const text = vitestReport([file], process.cwd());
      const report = text === undefined ? undefined : (() => { try { return JSON.parse(text); } catch { return undefined; } })();
      return report === undefined || !Array.isArray(report.testResults) ? [] : rowsOfReport(report).map((r) => r.fullName);
    })();
    return done(judgeSeenFailing(titles, maybe(EVIDENCE) ?? ""), `seen-failing: ${file}: ${titles.length} titles, each seen failing`);
  },
  vitest: (args) => {
    if (args.length === 0) return fail(["usage: vitest <file>..."]);
    const judged = judgeVitestRun(vitestReport(args, process.cwd()));
    return done(judged.bad, judged.line);
  },
  suite: (args) => {
    if (args.length > 0) return fail(["usage: suite"]);
    const judged = judgeVitestRun(vitestReport(["core", "react", "audit", "devtools", "http", "testing"].flatMap((p) => ["--project", p]), process.cwd()));
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
    return done(judgeCircular(r.code, `${r.out}\n${r.err}`), `circular: ${madgeFilesOf(`${r.out}\n${r.err}`) ?? "?"} files, no circular dependency found`);
  },
  records: recordsMode,
  surface: surfaceMode,
  structural: structuralMode,
  barrels: barrelsMode,
  homes: homesMode,
  folds: foldsMode,
  escape: escapeMode,
  "escape-scan": escapeScanMode,
  rule: ruleMode,
  changesets: changesetsMode,
  spike: spikeMode,
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
  eq("the record's phase_base is read", phaseBaseOf(`{"phase":"91","phase_base":"${sha}"}`), sha);
  eq("a record with no phase_base gives none", phaseBaseOf('{"phase":"91"}'), undefined);
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
  const rowOf = (subject) => PHASE_COMMITS.find((r) => r.subject === subject);
  const CHECK = "chore(91-02): add the phase check";
  const checkPaths = rowOf(CHECK).paths;
  const log = [c("docs(91): create phase plan", [".planning/a.md"]), c(CHECK, [...checkPaths].reverse()), c("docs(91-02): record the phase check seen failing", [EVIDENCE])];
  eq("a commit with its exact paths passes, in any order", judgeCommit(log, CHECK, checkPaths), []);
  eq("a subject that is not a row of the phase table fails", judgeCommit(log, "docs(91): create phase plan", [".planning/a.md"]), ["docs(91): create phase plan is not a subject of the phase table"]);
  eq("a paraphrased subject fails", judgeCommit(log, "chore(91-02): add the check", checkPaths).length, 1);
  has("a commit holding a third path fails", judgeCommit([c(CHECK, [...checkPaths, "x.ts"])], CHECK, checkPaths), "the commit holds");
  has("a commit holding a third path fails against the table too", judgeCommit([c(CHECK, [...checkPaths, "x.ts"])], CHECK, [...checkPaths, "x.ts"]), "the phase table gives");
  has("a missing path fails", judgeCommit([c(CHECK, [checkPaths[0]])], CHECK, checkPaths), "the commit holds");
  eq("a duplicate subject fails", judgeCommit([c(CHECK, checkPaths), c(CHECK, checkPaths)], CHECK, checkPaths).length, 1);
  eq("a commit without the trailer fails (a missing trailer)", judgeCommit([c(CHECK, checkPaths, CHECK)], CHECK, checkPaths).length, 1);
  eq("a commit with a doubled trailer fails", judgeCommit([c(CHECK, checkPaths, `${CHECK}\n\n${T1}\n${T1}`)], CHECK, checkPaths).length, 1);
  eq("a Phase 89 subject is not a plan commit", PLAN_SUBJECT.test("docs(89-01): x"), false);
  eq("a Phase 91 subject is a plan commit", PLAN_SUBJECT.test("chore(91-12)!: x"), true);
  eq("every subject of the phase table is a plan commit subject, once", [PHASE_COMMITS.every((r) => PLAN_SUBJECT.test(r.subject)), new Set(PHASE_COMMITS.map((r) => r.subject)).size === PHASE_COMMITS.length], [true, true]);
  eq("every row of the phase table has its paths or its rule", PHASE_COMMITS.every((r) => (r.rule === undefined ? Array.isArray(r.paths) && r.paths.length > 0 : ["spike", "sweep", "mutation-tests"].includes(r.rule))), true);
  const NEVER = [".planning/config.json", ".planning/state.json", ".planning/REQUIREMENTS.md", "README.md", ".agents/x", ".codex/x", "assets/x", ".planning/milestones/x", "a.iter2.md", ".planning/phases/QD-89-one-admission-step-for-a-host-s-audit-batch/89-check.mjs"];
  const refused = (reasons) => reasons.some((r) => r.includes("a path the run rules never stage"));
  for (const p of NEVER) {
    eq(`${p} in the commit and the asked list is refused`, refused(judgeCommit([c(CHECK, [p])], CHECK, [p])), true);
    eq(`${p} only in the commit is refused`, refused(judgeCommit([c(CHECK, [p])], CHECK, ["ok"])), true);
    eq(`${p} only in the asked list is refused`, refused(judgeCommit([c(CHECK, ["ok"])], CHECK, [p])), true);
  }
  for (const p of ["packages/core/README.md", ".planning/STATE.md", `.planning/phases/${PHASE_DIR}/91-check.mjs`]) eq(`${p} is not a never-staged path`, refused(judgeCommit([c(CHECK, [p])], CHECK, [p])), false);
  const SWEEP = "docs(91-19): sweep the deleted paths and the old rule name";
  const sweepMd = `# s\n\n## Before\n\n| \`a.ts:1\` | p | v | r |\n\n## Fixed\n\n| \`packages/core/src/A.ts:3\` | p | fixed | r |\n| \`packages/core/src/A.ts:9\` | p | fixed | r |\n| \`spec/x.md:2\` | p | fixed | r |\n\n## Remaining\n\n| \`b.ts:1\` | p | kept | r |\n`;
  eq("a sweep commit holds the record and exactly the files its fixed rows name", judgeCommit([c(SWEEP, [SWEEP_MD, "packages/core/src/A.ts", "spec/x.md"])], SWEEP, [SWEEP_MD, "packages/core/src/A.ts", "spec/x.md"], () => (p) => (p === SWEEP_MD ? sweepMd : undefined)), []);
  has("a sweep commit holding a file no fixed row names fails", judgeCommit([c(SWEEP, [SWEEP_MD, "packages/core/src/A.ts", "spec/x.md", "z.ts"])], SWEEP, [SWEEP_MD, "packages/core/src/A.ts", "spec/x.md", "z.ts"], () => (p) => (p === SWEEP_MD ? sweepMd : undefined)), "exactly the files its fixed rows name");
  has("a sweep commit with no record at the commit fails", judgeCommit([c(SWEEP, [SWEEP_MD])], SWEEP, [SWEEP_MD]), "has no ## Fixed section");
  eq("the files of the fixed rows are listed once each", sweepFixedFiles(sweepMd), ["packages/core/src/A.ts", "spec/x.md"]);
  eq("a record with no fixed section has none", sweepFixedFiles("# s\n"), undefined);
  const SPIKE_SUBJECT = "docs(91-08): record the fold spike";
  eq("a spike commit holds the verdict file and files under the spike directory", judgeCommit([c(SPIKE_SUBJECT, [SPIKE_MD, `${SPIKE_DIR}a.patch`, `${SPIKE_DIR}out/a.madge.txt`])], SPIKE_SUBJECT, [SPIKE_MD, `${SPIKE_DIR}a.patch`, `${SPIKE_DIR}out/a.madge.txt`]), []);
  has("a spike commit holding another file fails", judgeCommit([c(SPIKE_SUBJECT, [SPIKE_MD, "x.ts"])], SPIKE_SUBJECT, [SPIKE_MD, "x.ts"]), "is neither");
  const MUT = "test(91-21): kill the new open mutants of the folded files";
  eq("a mutation test commit holds born mutation tests and the evidence file", judgeCommit([c(MUT, [MUTATION_TESTS[0], EVIDENCE])], MUT, [MUTATION_TESTS[0], EVIDENCE]), []);
  has("a mutation test commit holding another test fails", judgeCommit([c(MUT, ["packages/core/test/Other.test.ts", EVIDENCE])], MUT, ["packages/core/test/Other.test.ts", EVIDENCE]), "is not one of");


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
  for (const line of ["// D-49 says", "see 91-03", "BARL-02 holds", "WX-05", "QD-91 closes", "Phase 91 added", "phase 91", "ADR-QD-NEXT", "x BEH-QD-NEXT y", "D-12", "CCR-QD-NEXT"]) {
    eq(`${line} is flagged`, judgeIds([idEntry("packages/core/src/a.ts", line)]).length, 1);
  }
  for (const line of ["ADR-QD-203", "INV-QD-426", "BEH-QD-789", "CCR-QD-482", "ARCH-137", "D-49-a", "a 1291-03x", "x191-03", "BARL-1", "Phase 910", "QD-910", "WX-1", "2026-11-26"]) {
    eq(`${line} is not flagged`, judgeIds([idEntry("packages/core/src/a.ts", line)]), []);
  }
  for (const line of ["this phase", "Until Now", "any more", "no longer", "from now on", "it holds from now on", "previously", "now does"]) {
    eq(`${line} is flagged in source`, judgeIds([idEntry("packages/core/src/a.ts", line)]).length, 1);
    eq(`${line} is flagged in a test`, judgeIds([idEntry("packages/core/test/a.test.ts", line)]).length, 1);
    eq(`${line} is allowed in a changeset`, judgeIds([idEntry(".changeset/a.md", line)]), []);
  }
  eq("a changeset is still scanned for ids", judgeIds([idEntry(".changeset/a.md", "BARL-01")]).length, 1);
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


  // Guarded files: AGENTS.md may change inside its sections 7a, 9 and 16 only; the house-style script's budgets never move.
  const agents = "# A\n\n## 6. Forbidden\n\nx\n\n## 7a. Untrusted\n\nseven\n\n## 8. Naming\n\nn\n\n## 9. Barrels\n\nnine\n\n## 10. Tests\n\nt\n\n## 16. Publish\n\nsixteen\n";
  const guard = (file, base, current) => judgeGuards([{ file, base, current }]);
  eq("an unchanged AGENTS.md passes", guard("AGENTS.md", agents, agents), []);
  for (const [n, anchor] of [["7a", "seven\n"], ["9", "nine\n"], ["16", "sixteen\n"]]) eq(`a line added inside section ${n} passes`, guard("AGENTS.md", agents, agents.replace(anchor, `${anchor}new line\n`)), []);
  eq("a line added in section 6 fails", guard("AGENTS.md", agents, agents.replace("x\n", "x\nnew\n")).length, 1);
  eq("a line added in section 8 fails", guard("AGENTS.md", agents, agents.replace("n\n", "n\nnew\n")).length, 1);
  eq("a line added at the end of section 16 passes, and at the end of the file with another heading fails", [guard("AGENTS.md", agents, `${agents}more\n`).length, guard("AGENTS.md", agents, `${agents}## 17. Format\n\nmore\n`).length], [0, 1]);
  has("a section 9 heading removed fails", guard("AGENTS.md", agents, agents.replace("## 9. Barrels", "## 9 Barrels")), "has no section 7a, 9 or 16");
  eq("a heading moved fails", guard("AGENTS.md", agents, agents.replace("## 6. Forbidden\n\nx\n\n", "")).length, 1);
  eq("an unchanged .oxlintrc.json passes", guard(".oxlintrc.json", "{}", "{}"), []);
  eq("a changed .oxlintrc.json fails", guard(".oxlintrc.json", "{}", "{ }").length, 1);
  const budgets = (n, c = "// note") => `const A_BUDGET = {\n  "a.ts": ${n}, ${c}\n};\nconst RE = /\\/{2}/;\nconst B_BUDGET_NAMES = ["x", "y"];\nconst Z = { "q": 9 };\n`;
  const house = (base, current) => guard("scripts/check-house-style.mjs", base, current);
  eq("an unchanged budget file passes", house(budgets(1), budgets(1)), []);
  eq("a budget comment changed passes", house(budgets(1), budgets(1, "// another note")), []);
  eq("code outside a budget changed passes", house(budgets(1), `${budgets(1)}const Z2 = 2;\n`), []);
  has("a budget number changed fails", house(budgets(1), budgets(2)), "an entry of A_BUDGET differs");
  has("a budget name entry changed fails", house(budgets(1), budgets(1).replace('"y"', '"z"')), "an entry of B_BUDGET_NAMES differs");
  has("a budget added fails", house(budgets(1), `${budgets(1)}const C_BUDGET = {};\n`), "declares C_BUDGET");
  has("a budget removed fails", house(budgets(1), budgets(1).replace(/const B_BUDGET_NAMES.*\n/, "")), "no longer declares B_BUDGET_NAMES");
  has("a file with no budget at the base fails", house("const a = 1;\n", "const a = 1;\n"), "holds no budget");
  eq("a literal is read through its strings and comments", [literalAt('{ "a}": 1, /* } */ b: `}` }', 0)?.body.replace(/\s+/g, ""), literalAt("{ a", 0), literalAt("x", 0)], ['{"a}":1,b:`}`}', undefined, undefined]);
  eq("the budgets of a text are named with their bodies", [...budgetsOf(budgets(3)).entries()], [["A_BUDGET", '{"a.ts":3}'], ["B_BUDGET_NAMES", '["x","y"]']]);
  eq("the text outside the open sections drops exactly those", outsideOpenSections(agents)?.includes("seven"), false);


  // Scratch clones, variants and the scratch root.
  for (const bad of ["a/b", "..", "a..b", "", "../x", "-x", undefined]) eq(`the scratch name ${String(bad)} is refused`, judgeScratchName(bad).length, 1);
  for (const good of ["sixth-base", "spike-a", "x1.2"]) eq(`the scratch name ${good} is accepted`, judgeScratchName(good), []);
  eq("a root named qd91 directly under the temporary directory is accepted", judgeScratchRoot("/t/qd91", "/t"), []);
  eq("a root not named qd91 is refused", judgeScratchRoot("/t/other", "/t").length, 1);
  eq("a root under another directory is refused", judgeScratchRoot("/u/t/qd91", "/t").length, 1);
  eq("a root that is neither is refused twice", judgeScratchRoot("/u/other", "/t").length, 2);
  const tmp = realpathSync(mkdtempSync(join(tmpdir(), "qd91-self-")));
  try {
    mkdirSync(join(tmp, "qd91"));
    writeFileSync(join(tmp, "qd91", "x"), "x");
    mkdirSync(join(tmp, "other"));
    eq("scratch-clean --check on a present root fails", cleanScratch(join(tmp, "qd91"), tmp, true).bad.length, 1);
    eq("scratch-clean refuses a root not named qd91, and removes nothing", [cleanScratch(join(tmp, "other"), tmp, false).bad.length, existsSync(join(tmp, "other"))], [1, true]);
    eq("scratch-clean refuses a root whose parent is not the temporary directory", cleanScratch(join(tmp, "other", "qd91"), tmp, false).bad.length, 1);
    eq("scratch-clean removes the planted root", [cleanScratch(join(tmp, "qd91"), tmp, false).bad, existsSync(join(tmp, "qd91"))], [[], false]);
    eq("scratch-clean --check on an absent root passes", cleanScratch(join(tmp, "qd91"), tmp, true).bad, []);
    eq("scratch-clean on an absent root passes too", cleanScratch(join(tmp, "qd91"), tmp, false).bad, []);
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
    writeFileSync(join(clone, ".git", "qd91-origin"), `${g("rev-parse", "HEAD").trim()}\n`);
    writeFileSync(join(clone, "a.txt"), "one\ntwo\n");
    const ev = join(tmp, "evidence.md");
    writeFileSync(ev, "# Phase 91 RED evidence\n");
    const passing = variantAt(clone, ev, "L-pass", "script", ["pass.mjs"], "none");
    eq("a variant run that passes is not seen failing, and appends nothing", [passing.ok, passing.message, readText(ev)], [false, "variant L-pass was not seen failing", "# Phase 91 RED evidence\n"]);
    const failing = variantAt(clone, ev, "L-fail", "script", ["fail.mjs"], "a line added to a.txt");
    const text = readText(ev);
    eq("a variant run that fails appends its block", [failing.ok, text.includes("## L-fail"), text.includes("- exit: 3"), text.includes("- failing text: first line"), text.includes("- failing text: second line"), text.includes("- edit: a line added to a.txt"), /- diff: [0-9a-f]{64} \(1 files, \+1 -0\)/.test(text)], [true, true, true, true, true, true, true]);
    variantAt(clone, ev, "L-fail2", "script", ["fail.mjs"], "again");
    const later = readText(ev);
    eq("a later block is appended after the earlier one, which stays byte for byte", [later.startsWith(text), later.indexOf("## L-fail2") > later.indexOf("## L-fail")], [true, true]);
    // The pathspecs that say which packages a range edited, over a planted repository with a nested source file.
    const edits = join(tmp, "edits");
    mkdirSync(join(edits, "packages", "core", "src", "deep"), { recursive: true });
    mkdirSync(join(edits, "packages", "http", "test"), { recursive: true });
    const e = (...a) => gitIn(edits, ...a);
    e("init", "-q");
    e("config", "user.email", "t@example.com");
    e("config", "user.name", "t");
    writeFileSync(join(edits, "packages", "http", "test", "a.ts"), "a\n");
    e("add", ".");
    e("-c", "commit.gpgsign=false", "commit", "-q", "-m", "init");
    const editsBase = e("rev-parse", "HEAD").trim();
    writeFileSync(join(edits, "packages", "core", "src", "deep", "b.ts"), "b\n");
    writeFileSync(join(edits, "packages", "http", "test", "a.ts"), "a2\n");
    e("add", ".");
    e("-c", "commit.gpgsign=false", "commit", "-q", "-m", "edit");
    eq("a nested source file edits its package, and a test file does not", e("diff", "--name-only", editsBase, "HEAD", "--", ...EDITED_PATHSPECS).split("\n").filter((p) => p !== ""), ["packages/core/src/deep/b.ts"]);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
  eq("a circular run that finds no cycle passes", judgeCircular(0, "✔ No circular dependency found!"), []);
  eq("a circular run that fails is refused", judgeCircular(1, "Found 2 circular dependencies!").length, 1);
  eq("a circular run that exits 0 without the words is refused", judgeCircular(0, "").length, 1);


  // The named barrels.
  const barrelOk = (p) => p.startsWith("packages/core/src/") && ["A.ts", "B.ts"].includes(p.slice("packages/core/src/".length));
  const BARREL = "packages/core/src/index.ts";
  const barrel = (text) => judgeBarrel(BARREL, text, barrelOk);
  const goodBarrel = 'export { b } from "./A.ts";\nexport type { T } from "./A.ts";\nexport { a, c } from "./B.ts";\n';
  eq("a named barrel passes", barrel(goodBarrel), []);
  eq("a comment holding an export * line is not read", barrel(`// export * from "./A.ts";\n${goodBarrel}`), []);
  eq("a multi-line group passes", barrel('export {\n  a,\n  b,\n} from "./A.ts";\n'), []);
  eq("a missing barrel is refused", barrel(undefined), [`${BARREL} does not exist`]);
  eq("an empty barrel is refused", barrel("// nothing\n"), [`${BARREL} holds no export group`]);
  has("an export * line is refused", barrel(`export * from "./A.ts";\n${goodBarrel}`), "is an export * line");
  has("an export type * line is refused", barrel('export type * from "./A.ts";\n'), "is an export * line");
  has("a namespace re-export is refused", barrel('export * as X from "./A.ts";\n'), "is an export * line");
  has("a package specifier group is refused", barrel('export { a } from "effect/Effect";\n'), "names the package specifier effect/Effect");
  has("two groups out of order are refused", barrel('export { a } from "./B.ts";\nexport { b } from "./A.ts";\n'), "is out of order after ./B.ts");
  has("a second value group for one module is refused", barrel('export { a } from "./A.ts";\nexport { b } from "./B.ts";\nexport { c } from "./B.ts";\n'), "is a second value group for ./B.ts");
  has("a second type group for one module is refused", barrel('export type { A } from "./A.ts";\nexport type { B } from "./A.ts";\n'), "is a second type group for ./A.ts");
  has("a value group after its type group is refused", barrel('export type { T } from "./A.ts";\nexport { a } from "./A.ts";\n'), "is a value group after the type group of ./A.ts");
  has("an unsorted group is refused", barrel('export { b, a } from "./A.ts";\n'), "a is out of order after b");
  has("a case-sensitive order is kept", barrel('export { a, B } from "./A.ts";\n'), "B is out of order after a");
  has("a duplicate name across the barrel is refused", barrel('export { a } from "./A.ts";\nexport { a } from "./B.ts";\n'), "a is named twice");
  has("a rename is refused", barrel('export { a as b } from "./A.ts";\n'), "is a rename");
  has("a missing module file is refused", barrel('export { a } from "./Missing.ts";\n'), "names no file");
  has("another export statement is refused", barrel(`${goodBarrel}export const x = 1;\n`), "is not an export { … } from");
  eq("groups are read with their kind, module and name count", [parseBarrel(goodBarrel).groups.map((g) => [g.kind, g.spec, g.names.length])], [[["value", "./A.ts", 1], ["type", "./A.ts", 1], ["value", "./B.ts", 2]]]);

  // Homes.
  const PSD = "packages/core/src/PortSpanDecode.ts";
  const PSE = "packages/core/src/PortSpanEncode.ts";
  const baseFiles = { "packages/core/src/index.ts": 'export * from "./A.ts";\nexport * from "./PortSpanDecode.ts";\nexport * from "./PortSpanEncode.ts";\n', "packages/core/src/A.ts": "export const a = 1;\nexport interface I {}\nexport class K {}\n", [PSD]: "export const decodePortSpan = 1;\n", [PSE]: "export const encodePortSpan = 1;\n" };
  const snapshot = [{ name: "I", kind: "type" }, { name: "K", kind: "both" }, { name: "a", kind: "value" }, { name: "decodePortSpan", kind: "value" }, { name: "encodePortSpan", kind: "value" }];
  const homesFor = (barrelText, headFiles, over = {}) => judgeHomes({ pkg: "core", srcDir: "packages/core/src", headText: barrelText, baseText: baseFiles["packages/core/src/index.ts"], snapshot, readBase: (p) => baseFiles[p], existsHead: (p) => headFiles[p] !== undefined, readHead: (p) => headFiles[p], srcFiles: Object.keys(headFiles), ...over });
  const unfolded = 'export type { I } from "./A.ts";\nexport { K, a } from "./A.ts";\nexport { decodePortSpan } from "./PortSpanDecode.ts";\nexport { encodePortSpan } from "./PortSpanEncode.ts";\n';
  const sameHead = { ...baseFiles };
  eq("every name at its base home passes while the home exists", homesFor(unfolded, sameHead), []);
  const foldedHead = { ...baseFiles, [PSE]: "export const encodePortSpan = 1;\nexport const decodePortSpan = 2;\n", [PSD]: undefined };
  const foldedBarrel = 'export type { I } from "./A.ts";\nexport { K, a } from "./A.ts";\nexport { decodePortSpan, encodePortSpan } from "./PortSpanEncode.ts";\n';
  eq("a moved name at its target passes once its home is deleted", homesFor(foldedBarrel, foldedHead), []);
  has("a moved name at its target while its home exists fails", homesFor(foldedBarrel, sameHead), "whose file still exists");
  has("a moved name at the deleted home fails", homesFor(unfolded, foldedHead), "is at ./PortSpanDecode.ts, not ./PortSpanEncode.ts");
  has("a moved name declared elsewhere fails and names the module", homesFor(foldedBarrel, { ...foldedHead, [PSE]: "export const encodePortSpan = 1;\n", "packages/core/src/Other.ts": "export const decodePortSpan = 3;\n" }), "is declared in ./Other.ts");
  has("a moved name declared nowhere fails", homesFor(foldedBarrel, { ...foldedHead, [PSE]: "export const encodePortSpan = 1;\n" }), "is not declared in ./PortSpanEncode.ts");
  has("an unfolded name from a module the base did not reach fails", homesFor(unfolded.replace('{ K, a } from "./A.ts"', '{ K, a } from "./Other.ts"'), { ...sameHead, "packages/core/src/Other.ts": "export const a = 1;\nexport class K {}\n" }), "the base barrel did not reach it through");
  has("an unfolded name from a module that does not export it fails", homesFor(unfolded.replace('{ encodePortSpan } from "./PortSpanEncode.ts"', '{ encodePortSpan } from "./A.ts"'), sameHead), "encodePortSpan is at ./A.ts");
  has("a base type name in a value group fails", homesFor(unfolded.replace("export type { I }", "export { I }"), sameHead), "I is in a value group, but its base kind is type");
  has("a base both name in a type group fails", homesFor(unfolded.replace("{ K, a }", "{ a }").replace("export type { I }", "export type { I, K }"), sameHead), "K is in a type group, but its base kind is both");
  has("a snapshot name the barrel does not name fails", homesFor(unfolded.replace("export { K, a }", "export { a }"), sameHead), "does not name K");
  has("a name outside the snapshot fails", homesFor(`${unfolded}export { zzz } from "./A.ts";\n`, sameHead), "zzz is not a name of the base surface");
  has("a name named twice fails", homesFor(`${unfolded}export { a } from "./A.ts";\n`, sameHead), "names a 2 times");
  eq("a missing barrel is refused", homesFor(undefined, sameHead), ["packages/core/src/index.ts does not exist"]);
  has("a missing snapshot is refused", homesFor(unfolded, sameHead, { snapshot: undefined }), "has no core root entry");
  eq("a star re-export is followed to the name", [exportsName((p) => ({ "x.ts": 'export * from "./y.ts";\n', "y.ts": "export type T = 1;\n" })[p], "x.ts", "T"), exportsName(() => "export { a as b };\n", "x.ts", "b"), exportsName(() => 'export * from "./x.ts";\n', "x.ts", "T")], [true, true, false]);
  eq("a declaration is read through the kinds of export", ["const", "function", "class", "interface", "type", "enum", "abstract class", "async function", "declare const"].map((k) => declares(`export ${k} Foo ${k === "const" || k === "declare const" ? "= 1" : "{}"};`, "Foo")), [true, true, true, true, true, true, true, true, true]);
  eq("a name in a comment or a longer name is not declared", [declares("// export const Foo = 1;", "Foo"), declares("export const Foobar = 1;", "Foo")], [false, false]);

  // Folds.
  const fsha = (i) => i.toString(16).padStart(40, "0");
  const MADGE = 251;
  const deletedAt = [1, 2, 3, 4, 4, 5];
  const foldCommits = () => FOLDS.map(({ subject }, i) => ({ sha: fsha(i + 1), subject, paths: [...PHASE_COMMITS.find((r) => r.subject === subject).paths], message: `${subject}\n\n${TRAILER}` }));
  const foldBlock = (i, over = {}) => [`## ${FOLDS[i].subject}`, `- head: ${over.head ?? fsha(i + 1)}`, `- madge files: ${over.madge ?? MADGE - deletedAt[i]}`, ...STRUCTURAL_COMMANDS.map((l) => `- ${l}: exit ${over.exit?.[l] ?? 0}: ok`), ""].join("\n");
  const foldTexts = () => ({
    [PSE]: "export const decodePortSpan = 1;\n",
    "packages/core/src/PortSpan.ts": 'import * as Schema from "effect/Schema";\nexport const portInterpreter = 1;\nexport interface PortInterpreter {}\n',
    "packages/react/src/GateWriter.ts": 'import { x } from "./DeveloperSignals.ts";\nexport const makeGateRegistry = 1;\nexport interface GateRegistryOptions {}\n',
    "packages/audit/src/ArchiveFacts.ts": "// tamper-evident\nexport const verifySequenceIntegrity = 1;\nexport class SequenceIntegrityError {}\n",
    "packages/react/src/HydrationEngine.ts": "interface HydrationTarget { readonly hydrate: () => void }\nexport const dehydrateDecisions = 1;\nexport const hydrateDecisions = (atoms: HydrationTarget, x: number) => 1;\n",
    "packages/react/src/QadiAtoms.ts": "export interface QadiAtoms extends HydrationTarget {}\n",
  });
  const foldCtx = (over = {}) => {
    const texts = over.texts ?? foldTexts();
    return { commits: foldCommits(), descends: () => true, exists: () => false, read: (p) => texts[p], spikeMd: `madge files base: ${MADGE}\n`, foldsMd: `# f\n\n${FOLDS.map((_, i) => foldBlock(i)).join("\n")}`, barrelText: 'export { a } from "./a.ts";\n', hits: [], ...over };
  };
  eq("six folds as their commits with their blocks pass", judgeFolds(foldCtx()), []);
  eq("the folds name their six subjects and five deleted files", [FOLDS.length, FOLDS.filter((f) => f.deletes !== undefined).length], [6, 5]);
  has("a fold commit holding a third path fails", judgeFolds(foldCtx({ commits: foldCommits().map((c, i) => (i === 0 ? { ...c, paths: [...c.paths, "x.ts"] } : c)) })), "does not hold exactly its path set");
  has("a missing fold commit fails", judgeFolds(foldCtx({ commits: foldCommits().slice(1) })), "0 commits since phase_base have the subject");
  has("a fold out of order fails", judgeFolds(foldCtx({ descends: (a, b) => a < b ? false : true })), "is not a descendant");
  has("a deleted path still present fails", judgeFolds(foldCtx({ exists: (p) => p === "packages/react/src/Hydration.ts" })), "packages/react/src/Hydration.ts still exists");
  has("an import resolving to a deleted path fails", judgeFolds(foldCtx({ hits: ["packages/core/test/A.test.ts:1 names the deleted path ../src/PortSpanDecode.ts"] })), "names the deleted path");
  has("a missing decodePortSpan declaration fails", judgeFolds(foldCtx({ texts: { ...foldTexts(), [PSE]: "export const other = 1;\n" } })), "does not declare decodePortSpan");
  has("a span file that imports Schema as a type fails", judgeFolds(foldCtx({ texts: { ...foldTexts(), "packages/core/src/PortSpan.ts": 'import type * as Schema from "effect/Schema";\nexport const portInterpreter = 1;\nexport interface PortInterpreter {}\n' } })), "does not import effect/Schema as a value");
  has("a gate writer without the signals import fails", judgeFolds(foldCtx({ texts: { ...foldTexts(), "packages/react/src/GateWriter.ts": "export const makeGateRegistry = 1;\nexport interface GateRegistryOptions {}\n" } })), "does not import ./DeveloperSignals.ts");
  has("archive facts without the disclaimer wording fail", judgeFolds(foldCtx({ texts: { ...foldTexts(), "packages/audit/src/ArchiveFacts.ts": "export const verifySequenceIntegrity = 1;\nexport class SequenceIntegrityError {}\n" } })), "does not hold tamper-evident");
  has("a hydration engine without the target interface fails", judgeFolds(foldCtx({ texts: { ...foldTexts(), "packages/react/src/HydrationEngine.ts": "export const dehydrateDecisions = 1;\nexport const hydrateDecisions = (atoms: X) => 1;\n" } })), "does not declare interface HydrationTarget");
  has("a hydrate parameter not typed by the target fails", judgeFolds(foldCtx({ texts: { ...foldTexts(), "packages/react/src/HydrationEngine.ts": "interface HydrationTarget {}\nexport const dehydrateDecisions = 1;\nexport const hydrateDecisions = (atoms: QadiAtoms) => 1;\n" } })), "first parameter HydrationTarget");
  has("an atom set that keeps its own hydrate member fails", judgeFolds(foldCtx({ texts: { ...foldTexts(), "packages/react/src/QadiAtoms.ts": "export interface QadiAtoms extends HydrationTarget { readonly hydrate: () => void }\n" } })), "still holds a readonly hydrate: member");
  has("an atom set that does not extend the target fails", judgeFolds(foldCtx({ texts: { ...foldTexts(), "packages/react/src/QadiAtoms.ts": "export interface QadiAtoms {}\n" } })), "does not declare interface QadiAtoms extends HydrationTarget");
  has("a barrel naming the target fails", judgeFolds(foldCtx({ barrelText: 'export type { HydrationTarget } from "./HydrationEngine.ts";\n' })), "stays package-private");
  has("a missing structural block fails", judgeFolds(foldCtx({ foldsMd: `# f\n\n${foldBlock(0)}` })), "has no block");
  has("a block with a failing command fails", judgeFolds(foldCtx({ foldsMd: `# f\n\n${FOLDS.map((_, i) => foldBlock(i, i === 2 ? { exit: { "pnpm build": 2 } } : {})).join("\n")}` })), "records pnpm build exit 2");
  has("a block with the wrong madge count fails", judgeFolds(foldCtx({ foldsMd: `# f\n\n${FOLDS.map((_, i) => foldBlock(i, i === 4 ? { madge: MADGE - 5 } : {})).join("\n")}` })), `records madge files ${MADGE - 5}, not ${MADGE - 4}`);
  has("a block with another head fails", judgeFolds(foldCtx({ foldsMd: `# f\n\n${FOLDS.map((_, i) => foldBlock(i, i === 0 ? { head: fsha(9) } : {})).join("\n")}` })), "records head");
  has("a missing record fails", judgeFolds(foldCtx({ foldsMd: undefined })), "does not exist");
  has("a spike record with no madge count fails", judgeFolds(foldCtx({ spikeMd: "x\n" })), "has no madge files base line");
  eq("the madge count of the spike is read", [madgeBaseOf("madge files base: 251\n"), madgeBaseOf("x"), madgeBaseOf(undefined)], [251, undefined, undefined]);
  eq("a structural block is read back", structuralBlock(foldBlock(0)), { head: fsha(1), madge: String(MADGE - 1), commands: STRUCTURAL_COMMANDS.map((label) => ({ label, exit: 0 })) });
  const importer = (file, text) => deletedImports([{ file, text }], ["packages/core/src/PortSpanDecode.ts", "packages/react/src/Hydration.ts"]);
  eq("a test importing a deleted source fails, by its stem", importer("packages/core/test/A.test.ts", 'import { decodePortSpan } from "../src/PortSpanDecode.ts";\n'), ["packages/core/test/A.test.ts:1 names the deleted path ../src/PortSpanDecode.ts"]);
  eq("a .js specifier of a deleted source fails too", importer("packages/core/src/A.ts", 'export * from "./PortSpanDecode.js";\n').length, 1);
  eq("a dynamic import of a deleted source fails", importer("packages/core/src/A.ts", 'const m = await import("./PortSpanDecode.ts");\n').length, 1);
  eq("a devtools model Hydration.ts is not the deleted react one", importer("packages/devtools/src/model/X.ts", 'import { h } from "./Hydration.ts";\n'), []);
  eq("a comment, a package specifier and another file are not a hit", importer("packages/core/src/A.ts", '// import "./PortSpanDecode.ts"\nimport "effect/Effect";\nimport "./PortSpanEncode.ts";\n'), []);

  // The escape check, the rule, the changesets.
  const escMod = "export const declarationEscapes = () => [];\nexport const ESCAPE_SELF_CHECK = [];\n";
  const escInstall = ' * Seven checks:\n *   3c. escape  — no packed .d.ts names a path outside its package\nimport { declarationEscapes, ESCAPE_SELF_CHECK } from "./lib/declaration-escape.mjs";\n';
  eq("the escape module and its import pass", judgeEscapeModule(escMod, escInstall), []);
  eq("a missing escape module fails", judgeEscapeModule(undefined, escInstall), ["scripts/lib/declaration-escape.mjs does not exist"]);
  has("an escape module without the planted self-check fails", judgeEscapeModule("export const declarationEscapes = () => [];\n", escInstall), "does not export ESCAPE_SELF_CHECK");
  has("an install script that imports only one name fails", judgeEscapeModule(escMod, escInstall.replace("declarationEscapes, ", "")), "does not import declarationEscapes");
  has("an install script that does not import the module fails", judgeEscapeModule(escMod, " *   3c. escape\n"), "does not import declarationEscapes");
  has("an install header that omits check 3c fails", judgeEscapeModule(escMod, escInstall.replace("3c.", "3d.")), "does not name check 3c");
  const escLine = "declaration escape check: 12 packed .d.ts file(s), none names a path outside its package or into src/";
  eq("a clean gate 14 run passes", judgeEscapeRun(0, `x\n${escLine}\n`), []);
  has("a gate 14 run that exits non-zero fails", judgeEscapeRun(1, `${escLine}\n`), "exited 1");
  has("a gate 14 run printing zero files fails", judgeEscapeRun(0, escLine.replace("12", "0")), "did not print");
  has("a gate 14 run printing no escape line fails", judgeEscapeRun(0, "all fine\n"), "did not print");
  eq("a scan over no files fails", judgeEscapeScan([], () => []), ["no .d.ts file was found: nothing was scanned"]);
  eq("a scan prints one line per refusal", judgeEscapeScan([{ file: "lib/A.d.ts", text: "x" }], () => ["outside the package", "src segment"]), ["lib/A.d.ts: outside the package", "lib/A.d.ts: src segment"]);
  eq("a clean scan passes", judgeEscapeScan([{ file: "lib/A.d.ts", text: "x" }], () => []), []);
  const named = (paths = NAMED_BARREL_PATHS) => `const NAMED_BARRELS = [\n${paths.map((p) => `  "${p}",`).join("\n")}\n];\n// [named-barrel-self-test] and [named-barrel]\n`;
  const amended = (extra = "") => `an old rule devtools-named-barrel\n\n> **Amended (2026-11-26):** ADR-QD-204 states the named-barrel rule.\n${extra}`;
  const ruleCtx = (over = {}) => ({ house: named(), scripts: [{ file: "scripts/a.mjs", text: "x\n" }], agents: "a\n", contributing: "c\n", trace: "> | Change History | devtools-named-barrel was here |\n", adr047: amended(), adr099: amended(), ...over });
  eq("the rule in place passes, an old name only in a history row and before an amendment", judgeRule(ruleCtx()), []);
  eq("NAMED_BARRELS typed and wrapped in a Set is read", judgeRule(ruleCtx({ house: `const NAMED_BARRELS: ReadonlySet<string> = new Set([${NAMED_BARREL_PATHS.map((p) => `"${p}"`).join(", ")}]);\n// [named-barrel-self-test] [named-barrel]\n` })), []);
  has("a missing house-style script fails", judgeRule(ruleCtx({ house: undefined })), "does not exist");
  has("no NAMED_BARRELS fails", judgeRule(ruleCtx({ house: "// [named-barrel-self-test] [named-barrel]\n" })), "does not declare NAMED_BARRELS");
  has("a NAMED_BARRELS missing a barrel fails", judgeRule(ruleCtx({ house: named(NAMED_BARREL_PATHS.slice(1)) })), "NAMED_BARRELS lists");
  has("a NAMED_BARRELS with a sixth path fails", judgeRule(ruleCtx({ house: named([...NAMED_BARREL_PATHS, "packages/http/src/index.ts"]) })), "NAMED_BARRELS lists");
  has("a missing self-test tag fails", judgeRule(ruleCtx({ house: named().replace("[named-barrel-self-test]", "") })), "does not hold [named-barrel-self-test]");
  has("a missing rule tag fails", judgeRule(ruleCtx({ house: named().replace("and [named-barrel]", "") })), "does not hold [named-barrel]");
  has("a DEVTOOLS_BARRELS left fails", judgeRule(ruleCtx({ house: `${named()}const DEVTOOLS_BARRELS = [];\n` })), "still declares DEVTOOLS_BARRELS");
  has("the old name in a script fails", judgeRule(ruleCtx({ scripts: [{ file: "scripts/a.mjs", text: "// devtools-named-barrel\n" }] })), "scripts/a.mjs:1 names devtools-named-barrel");
  has("the old name in AGENTS.md fails", judgeRule(ruleCtx({ agents: "x\ndevtools-named-barrel\n" })), "AGENTS.md:2");
  has("the old name in CONTRIBUTING.md fails", judgeRule(ruleCtx({ contributing: "devtools-named-barrel\n" })), "CONTRIBUTING.md:1");
  has("the old name in a traceability row outside history fails", judgeRule(ruleCtx({ trace: "| x | devtools-named-barrel |\n" })), "spec/traceability.md:1");
  has("an amendment missing from an ADR fails", judgeRule(ruleCtx({ adr047: "old devtools-named-barrel\n" })), "holds no > **Amended ( line");
  has("an amendment that does not name the rule fails", judgeRule(ruleCtx({ adr099: "> **Amended (2026):** ADR-QD-204 only.\n" })), "holds no > **Amended ( line");
  has("the old name after an amendment fails", judgeRule(ruleCtx({ adr099: amended("devtools-named-barrel again\n") })), "after its amendment");
  has("a missing ADR fails", judgeRule(ruleCtx({ adr047: undefined })), "does not exist");

  const csText = (pkg, sentence, bump = "patch") => `---\n"@qadi/${pkg}": ${bump}\n---\n\n${sentence}\n`;
  const csAdded = (over = {}) => CHANGESETS.map((w) => ({ file: w.file, text: csText(w.pkg.slice(6), w.sentences[0]), ...over[w.file] }));
  const csCtx = (over = {}) => ({ added: csAdded(), edited: CHANGESETS.map((w) => w.pkg), hydrationExists: false, ...over });
  eq("the three changesets, one per edited package, pass", judgeChangesets(csCtx()), []);
  eq("the changeset set names core, react and audit", CHANGESETS.map((w) => w.pkg), ["@qadi/core", "@qadi/react", "@qadi/audit"]);
  has("a missing changeset fails", judgeChangesets(csCtx({ added: csAdded().slice(1) })), "is not added since phase_base");
  has("a fourth changeset fails", judgeChangesets(csCtx({ added: [...csAdded(), { file: ".changeset/other.md", text: csText("http", "x") }] })), "is not one of");
  has("a minor bump fails", judgeChangesets(csCtx({ added: csAdded({ ".changeset/core-named-barrel.md": { text: csText("core", CHANGESETS[0].sentences[0], "minor") } }) })), "is not a patch changeset for @qadi/core alone");
  has("two package lines fail", judgeChangesets(csCtx({ added: csAdded({ ".changeset/core-named-barrel.md": { text: `---\n"@qadi/core": patch\n"@qadi/http": patch\n---\n\n${CHANGESETS[0].sentences[0]}\n` } }) })), "is not a patch changeset for @qadi/core alone");
  has("a changeset without its sentence fails", judgeChangesets(csCtx({ added: csAdded({ ".changeset/audit-named-barrel.md": { text: csText("audit", "Something else.") } }) })), "does not hold: No export changes.");
  eq("the sentence is read with its whitespace collapsed", judgeChangesets(csCtx({ added: csAdded({ ".changeset/audit-named-barrel.md": { text: csText("audit", CHANGESETS[2].sentences[0].replace(". The", ".\n  The")) } }) })), []);
  has("a package edited without a changeset fails by name", judgeChangesets(csCtx({ edited: [...CHANGESETS.map((w) => w.pkg), "@qadi/http"] })), "@qadi/http is edited since phase_base and has no patch changeset");
  has("a changeset for a package not edited fails", judgeChangesets(csCtx({ edited: ["@qadi/core", "@qadi/react"] })), "a changeset names @qadi/audit, which is not edited");
  has("the full react sentence is refused while Hydration.ts exists", judgeChangesets(csCtx({ hydrationExists: true })), "does not hold: No export changes. The barrel names its exports per module.");
  eq("the fallback react sentence passes while Hydration.ts exists", judgeChangesets(csCtx({ hydrationExists: true, added: csAdded({ ".changeset/react-named-barrel.md": { text: csText("react", CHANGESETS[1].fallback[0]) } }) })), []);
  has("the fallback react sentence is refused once Hydration.ts is gone", judgeChangesets(csCtx({ added: csAdded({ ".changeset/react-named-barrel.md": { text: csText("react", CHANGESETS[1].fallback[0]) } }) })), "does not hold: The barrel names its exports per module. `hydrateDecisions`");

  // The spike.
  const BASE = "0123456789abcdef0123456789abcdef01234567";
  const spikeFiles = (over = {}) => {
    const files = new Map();
    const rows = SPIKE_IDS.map((id) => {
      const patch = `patch of ${id}\n`;
      files.set(`${SPIKE_DIR}${id}.patch`, patch);
      const cycle = EXPECTED_VERDICTS[id] === "cycle";
      files.set(`${SPIKE_DIR}out/${id}.madge.txt`, cycle ? "Found 1 circular dependency!\nexit: 1\n" : "✔ No circular dependency found!\nexit: 0\n");
      files.set(`${SPIKE_DIR}out/${id}.tsc.txt`, id === "f" ? "exit: 0\nhouse-style:\ncheck-house-style: EvaluationSpan.ts is absent\nexit: 1\n" : "exit: 0\n");
      return `| ${id} | what | ${SPIKE_DIR}${id}.patch | ${sha256(patch)} | ${cycle ? "1 cycle" : "none"} | 251 | exit 0 | ${EXPECTED_VERDICTS[id]}${id === "f" ? "; not folded" : ""} |`;
    });
    const md = `# spike\n\nspike base: ${BASE}\nmadge files base: 251\nlayout: per-package node_modules links present\n\n| candidate | what | patch | sha256 | madge | files | tsc | verdict |\n| --- | --- | --- | --- | --- | --- | --- | --- |\n${rows.join("\n")}\n`;
    for (const [k, v] of Object.entries(over)) files.set(k, v);
    return { md, files };
  };
  const spikeBad = (md, files, base = BASE) => judgeSpike(md, (p) => files.get(p), (p) => (files.has(p) ? sha256(files.get(p)) : undefined), base);
  const fresh = spikeFiles();
  eq("a spike record agreeing with its patches and outputs passes", spikeBad(fresh.md, fresh.files), []);
  eq("the spike names its ten candidates, three of them cycles", [SPIKE_IDS.length, Object.values(EXPECTED_VERDICTS).filter((v) => v === "cycle").length], [10, 3]);
  eq("the verdict table's rows are read", spikeRows(fresh.md).map((r) => [r.id, r.patch, r.verdict]).slice(0, 3), [["a", "a", "acyclic"], ["b", "b", "acyclic"], ["b-prime", "b-prime", "cycle"]]);
  has("a missing record fails", spikeBad(undefined, fresh.files), "does not exist");
  has("a patch with another hash fails", spikeBad(fresh.md, spikeFiles({ [`${SPIKE_DIR}c.patch`]: "changed\n" }).files), "has another sha256");
  has("a missing patch fails", spikeBad(fresh.md, new Map([...fresh.files].filter(([k]) => k !== `${SPIKE_DIR}d.patch`))), "d.patch does not exist");
  has("a missing madge output fails", spikeBad(fresh.md, new Map([...fresh.files].filter(([k]) => k !== `${SPIKE_DIR}out/d.madge.txt`))), "d.madge.txt does not exist");
  has("a missing tsc output fails", spikeBad(fresh.md, new Map([...fresh.files].filter(([k]) => k !== `${SPIKE_DIR}out/d.tsc.txt`))), "d.tsc.txt does not exist");
  has("a verdict that disagrees with the recorded output fails", spikeBad(fresh.md, spikeFiles({ [`${SPIKE_DIR}out/a.madge.txt`]: "Found 2 circular dependencies!\nexit: 1\n" }).files), "the a row states acyclic but its recorded outputs say cycle");
  has("a tsc output that exited non-zero is not acyclic", spikeBad(fresh.md, spikeFiles({ [`${SPIKE_DIR}out/a.tsc.txt`]: "error TS1\nexit: 2\n" }).files), "the a row states acyclic but its recorded outputs say neither");
  const flipped = fresh.md.replace(/(\| b-prime \|.*\| )cycle \|/, "$1acyclic |");
  has("a verdict other than the expected one fails", spikeBad(flipped, spikeFiles({ [`${SPIKE_DIR}out/b-prime.madge.txt`]: "✔ No circular dependency found!\nexit: 0\n" }).files), "the expected verdict is cycle");
  has("a missing candidate row fails", spikeBad(fresh.md.replace(/^\| e-prime-fold \|.*\n/m, ""), fresh.files), "no row for the candidate e-prime-fold");
  has("another spike base fails", spikeBad(fresh.md, fresh.files, "f".repeat(40)), "not phase_base");
  has("a missing layout line fails", spikeBad(fresh.md.replace("layout: per-package node_modules links present\n", ""), fresh.files), "has no layout line");
  has("a missing madge base line fails", spikeBad(fresh.md.replace("madge files base: 251\n", ""), fresh.files), "no madge files base line");
  has("a row that does not say not folded fails", spikeBad(fresh.md.replace("; not folded", ""), fresh.files), "does not say not folded");
  has("an f output with no house-style section fails", spikeBad(fresh.md, spikeFiles({ [`${SPIKE_DIR}out/f.tsc.txt`]: "exit: 0\n" }).files), "has no house-style: section");
  has("an f house-style section that does not name the absent file fails", spikeBad(fresh.md, spikeFiles({ [`${SPIKE_DIR}out/f.tsc.txt`]: "exit: 0\nhouse-style:\nfine\nexit: 0\n" }).files), "does not record check-house-style failing");
  has("a patch hash not stated fails", spikeBad(fresh.md.replace(sha256("patch of a\n"), "-"), fresh.files), "states no sha256");
  eq("a recorded and a fresh run that agree pass", judgeRerun("a", { madge: "✔ No circular dependency found!", tsc: "x.ts(1,2): error TS2741: a" }, { madge: "✔ No circular dependency found!\n", tsc: "x.ts(9,9): error TS2741: b" }), []);
  has("another madge verdict fails the re-run", judgeRerun("a", { madge: "✔ No circular dependency found!", tsc: "" }, { madge: "Found 1 circular dependency!", tsc: "" }), "a: madge says Found 1");
  has("a tsc group the record lacks fails the re-run", judgeRerun("a", { madge: "", tsc: "" }, { madge: "", tsc: "y.ts(1,1): error TS2322: z" }), "a tsc group the record lacks: y.ts TS2322");
  has("a recorded tsc group that is gone fails the re-run", judgeRerun("a", { madge: "", tsc: "y.ts(1,1): error TS2322: z" }, { madge: "", tsc: "" }), "a recorded tsc group is missing: y.ts TS2322");
  eq("a madge verdict line is read", [madgeLine("a\nFound 3 circular dependencies!\n"), madgeLine("none")], ["Found 3 circular dependencies", undefined]);

  // The public surface and the structural record.
  eq("gate 13's figure equal to the record passes", judgeGate13("api-surface: 943 export(s) documented across 9 package(s)\n", "gate13: 943\n"), []);
  has("gate 13's figure differing from the record fails", judgeGate13("api-surface: 944 export(s) documented across 9 package(s)\n", "gate13: 943\n"), "documents 944 exports, the record says gate13: 943");
  has("a record with no gate13 line fails", judgeGate13("api-surface: 943 export(s) documented across 9 package(s)\n", "x\n"), "has no gate13: line");
  has("a gate 13 run with no line fails", judgeGate13("fine\n", "gate13: 943\n"), "printed no api-surface line");
  eq("madge's file count is read", [madgeFilesOf("Processed 251 files (2s)"), madgeFilesOf("none")], ["251", undefined]);
  const tmpDir = realpathSync(mkdtempSync(join(tmpdir(), "qd91-structural-")));
  try {
    const rec = join(tmpDir, "FOLDS.md");
    const ok = [{ label: "pnpm circular", code: 0, last: "No circular dependency found!", madge: "250" }, { label: "pnpm build", code: 0, last: "" }];
    eq("a clean structural run appends its block and fails none", [recordStructural(rec, "fold verdicts", "S1", "abc", ok), readText(rec)], [0, "# Phase 91 fold verdicts\n\n## S1\n- head: abc\n- madge files: 250\n- pnpm circular: exit 0: No circular dependency found!\n- pnpm build: exit 0: \n"]);
    const red = [{ label: "pnpm circular", code: 1, last: "Found 1 circular dependency!", madge: "250" }, { label: "pnpm build", code: 2, last: "error TS1" }];
    const before = readText(rec);
    eq("a failing structural run is recorded too, and counts its failures", [recordStructural(rec, "fold verdicts", "S2", "def", red), readText(rec).startsWith(before), readText(rec).includes("- pnpm build: exit 2: error TS1"), readText(rec).includes("## S2")], [2, true, true, true]);
    eq("a block with no madge count records a question mark", recordStructural(join(tmpDir, "B.md"), "barrel generation", "S3", "x", [{ label: "pnpm build", code: 0, last: "" }]), 0);
    eq("the first block of a new file is under its heading", readText(join(tmpDir, "B.md")).startsWith("# Phase 91 barrel generation\n\n## S3\n- head: x\n- madge files: ?\n"), true);
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }

  // The records.
  const FIX_TEST = "packages/core/test/a.test.ts";
  const changedDocs = [...new Set([...REQUIRED_REVISED, ADR204, ADR_NOTED["009"][0]])];
  const shas = Object.fromEntries(FOLDS.map((f, i) => [f.subject, fsha(i + 1).slice(-8)]));
  const fixture = () => {
    const files = new Map();
    const base = new Map();
    const rev = (n) => `> | Revision | 1.${n} |\n`;
    const behavior = (ids) => ids.map((n) => `## BEH-QD-${n}: title\n\nPinned by \`${FIX_TEST}\`.\n\n`).join("");
    const doc = (path, body) => {
      files.set(path, `${rev(5)}${body}`);
      base.set(path, `${rev(4)}base\n`);
    };
    for (const p of REQUIRED_REVISED) doc(p, "x\n");
    files.set(BEH_HOMES[791], `${rev(5)}${behavior([791])}`);
    files.set(BEH_HOMES[792], `${rev(5)}${behavior([792])}`);
    files.set(BEH_HOMES[793], `${rev(5)}${behavior([793, 795])}`);
    files.set(BEH_HOMES[794], `${rev(5)}${behavior([794])}`);
    files.set(INVARIANTS, `${rev(5)}## INV-QD-427: x\n\n[INV-QD-027](#inv-qd-027-the-x)\n\n## INV-QD-428: y\n\nPortSpanEncode.ts, PortKey.ts, pnpm circular\n`);
    const row = `| CCR-QD-483 | 2026-11-26 | ARCH-138 09-react.md ${changedDocs.filter((p) => p !== ADR204).join(" ")} BEH-QD-791 BEH-QD-792 BEH-QD-793 BEH-QD-794 BEH-QD-795 INV-QD-427 INV-QD-428 ADR-QD-204 |\n`;
    files.set("spec/README.md", `${rev(5)}${row}`);
    files.set(ADR204, `# ADR-QD-204\n\n> | Revision | 1.0 |\n> | Status | Accepted — amends ADR-QD-037, ADR-QD-047 and ADR-QD-099 |\n> | Change History | 1.0 (2026-11-26): new (ARCH-138, CCR-QD-483) |\n\n## What enforces it\n\nnode scripts/check-house-style.mjs, node scripts/surface-diff.mjs --self-test, node scripts/check-api-surface.mjs, node scripts/check-package-install.mjs and pnpm circular, with ${SURFACE_TESTS.join(" ")}; in \`pnpm check\` and phase-local.\n\n## Spike\n\n${SPIKE_IDS.join(" ")} ${Object.values(shas).join(" ")} HydrationTarget EvaluationSpan.ts not folded named-barrel [named-barrel-self-test] surface:self-test gate13:\n`);
    for (const [n, file] of Object.entries(ADR_AMENDED)) doc(file, `> **Amended (2026-11-26):** ADR-QD-204 and CCR-QD-483 ${AMENDMENT_NAMES[n].join(" ")}\n`);
    for (const [n, [file, names]] of Object.entries(ADR_NOTED)) {
      if (n === "009") {
        files.set(file, `> **Note (2026-11-26):** ADR-QD-204 and CCR-QD-483 ${names.join(" ")}\n`);
        base.set(file, "# early\n");
      } else doc(file, `> **Note (2026-11-26):** ADR-QD-204 and CCR-QD-483 ${names.join(" ")}\n`);
    }
    files.set("spec/decisions/index.yaml", ['- id: "ADR-QD-037"', "  status: amended by ADR-QD-204", '- id: "ADR-QD-047"', "  status: amended by ADR-QD-204", '- id: "ADR-QD-099"', "  status: amended by ADR-QD-204", '- id: "ADR-QD-204"', "  file: 204-named-barrels-and-visibility-only-files-folded-away.md", ""].join("\n"));
    doc("spec/traceability.md", `${[...RESERVED, ...SURFACE_TESTS, "packages/react/test/HydrationTarget.tst.ts", "scripts/surface-diff.mjs"].map((x) => `| ${x} | row |`).join("\n")}\n`);
    doc("spec/overview.md", `${Object.entries(OVERVIEW_SOURCES).map(([n, f]) => `| \`${n}\`${n === "dehydrateDecisions" ? ", `hydrateDecisions`" : ""} | function | \`${f}\` — x |`).join("\n")}\n\n## Entry points\n\npackage-private\n`);
    files.set(".planning/PROJECT.md", "- Phase 86: the commit-first, hold-last effect order (re-run in Phase 91 through the earlier-phase checks).\n");
    files.set("AGENTS.md", "## 7a. U\n\n| `packages/core/src/PortSpanEncode.ts` | 2 | `decodePortSpan` x |\n\n## 8. N\n\nn\n\n## 9. B\n\nnamed-barrel @qadi/core @qadi/react @qadi/audit @qadi/devtools test/surface.test.ts\n\n## 16. P\n\ncheck-package-install.mjs src/ outside its own package\n\n## 17. F\n\nf\n");
    files.set("CONTRIBUTING.md", "| A public export | test/surface.test.ts |\n| A surface change | scripts/surface-diff.mjs |\n");
    files.set("packages/react/src/RegistryLease.ts", "/**\n * Out of the barrel: `RegistryOwner.ts` is its one caller.\n */\nexport const x = 1;\n");
    return { files, base };
  };
  const closeBad = (edit) => {
    const { files, base } = fixture();
    edit?.(files, base);
    return judgeRecordsClose({ read: (p) => files.get(p), readBase: (p) => base.get(p), changed: changedDocs, resolve: () => undefined, exists: (p) => p === FIX_TEST, shas });
  };
  const sub = (path, from, to) => (files) => files.set(path, files.get(path).replace(from, to));
  eq("a clean record set passes", closeBad(), []);
  for (const [what, edit, part] of [
    ["a missing CCR row", sub("spec/README.md", "| CCR-QD-483 |", "| CCR-QD-482 |"), "holds no row | CCR-QD-483 |"],
    ["a CCR row without ARCH-138", sub("spec/README.md", "ARCH-138", "ARCH-1"), "does not name ARCH-138"],
    ["a CCR row without a changed document", sub("spec/README.md", `${ADR_NOTED["051"][0]} `, ""), `does not name ${ADR_NOTED["051"][0]}`],
    ["a doubled behavior heading", sub(BEH_HOMES[791], "## BEH-QD-791: title", "## BEH-QD-791: title\n\n## BEH-QD-791: again"), "holds 2 headings ## BEH-QD-791:"],
    ["a missing behavior heading", sub(BEH_HOMES[794], "## BEH-QD-794:", "## BEH-QD-7x4:"), "holds 0 headings ## BEH-QD-794:"],
    ["a pinned-by paragraph naming no test", sub(BEH_HOMES[792], `\`${FIX_TEST}\``, "nothing"), "names no test file in a Pinned by paragraph"],
    ["a pinned-by paragraph naming a missing test", sub(BEH_HOMES[793], `\`${FIX_TEST}\``, "`packages/core/test/gone.test.ts`"), "gone.test.ts, which does not exist"],
    ["an invariant 427 with no anchor", sub(INVARIANTS, "#inv-qd-027-the-x", "#nope"), "does not link an anchor starting #inv-qd-027-"],
    ["an invariant 428 without PortKey.ts", sub(INVARIANTS, "PortKey.ts", "Other.ts"), "INV-QD-428 does not name PortKey.ts"],
    ["a missing invariant", sub(INVARIANTS, "## INV-QD-428:", "## INV-QD-429:"), "has no heading ## INV-QD-428:"],
    ["an ADR at another revision", sub(ADR204, "| Revision | 1.0 |", "| Revision | 1.1 |"), "is not at Revision 1.0"],
    ["an ADR status without a decision", sub(ADR204, "ADR-QD-099 |", "ADR-QD-098 |"), "does not name ADR-QD-099"],
    ["an ADR history without the CCR", sub(ADR204, "(ARCH-138, CCR-QD-483)", "(ARCH-138)"), "no 1.0 ( entry naming ARCH-138 and CCR-QD-483"],
    ["an ADR with no enforcement section", sub(ADR204, "## What enforces it", "## Other"), "has no ## What enforces it section"],
    ["an ADR enforcement naming a gate number", sub(ADR204, "phase-local.", "phase-local, gate 14."), "holds a gate <digits> text"],
    ["an ADR enforcement without phase-local", sub(ADR204, "phase-local", "local"), "does not name phase-local"],
    ["an ADR without not folded", sub(ADR204, "not folded", "folded"), "ADR-QD-204 does not name not folded"],
    ["an ADR without a fold's short sha", sub(ADR204, Object.values(shas)[3], "00000000"), `does not name ${Object.values(shas)[3]}`],
    ["an amendment missing", sub(ADR_AMENDED["099"], "> **Amended (", "> Amended ("), "holds no > **Amended ( line"],
    ["an amendment without a name", sub(ADR_AMENDED["037"], "JsonRefusal.ts", "x"), "does not name JsonRefusal.ts"],
    ["a note missing", sub(ADR_NOTED["080"][0], "> **Note (", "> Note ("), "holds no > **Note ( line"],
    ["a note without its name", sub(ADR_NOTED["140"][0], "DeveloperSignals.ts", "x"), "does not name DeveloperSignals.ts"],
    ["an index without the ADR", sub("spec/decisions/index.yaml", '- id: "ADR-QD-204"', '- id: "ADR-QD-205"'), "holds no ADR-QD-204 entry"],
    ["an index status without the ADR", sub("spec/decisions/index.yaml", "  status: amended by ADR-QD-204\n- id: \"ADR-QD-047\"", "  status: x\n- id: \"ADR-QD-047\""), "index entry of ADR-QD-037"],
    ["a traceability row missing", sub("spec/traceability.md", "| INV-QD-428 | row |\n", ""), "holds no row naming INV-QD-428"],
    ["a traceability row for the tool missing", sub("spec/traceability.md", "| scripts/surface-diff.mjs | row |\n", ""), "no row naming scripts/surface-diff.mjs"],
    ["a deleted file named in the overview", sub("spec/overview.md", "\n\n## Entry points", " PortInterpreter.ts\n\n## Entry points"), "names a deleted file"],
    ["a react Hydration.ts named in the overview", sub("spec/overview.md", "## Entry points", "`Hydration.ts`\n\n## Entry points"), "names a deleted file"],
    ["a wrong Source cell", sub("spec/overview.md", "`HydrationEngine.ts` —", "`Hydration.ts` —"), "dehydrateDecisions row"],
    ["a name that only another row's description holds", sub("spec/overview.md", "| `makeGateRegistry` | function |", "| `other` | function | `GateWriter.ts` — see `makeGateRegistry` | x |\n| `makeGateRegistryAgain` | function |"), "has no row for makeGateRegistry"],
    ["an overview without package-private", sub("spec/overview.md", "package-private", "private"), "Entry points section of spec/overview.md does not hold package-private"],
    ["a document revised twice", sub(ADR_AMENDED["037"], "| Revision | 1.5 |", "| Revision | 1.6 |"), "not one minor above 1.4"],
    ["a document not revised", (files) => files.set("spec/invariants.md", files.get("spec/invariants.md").replace("1.5", "1.4")), "not one minor above"],
    ["an early ADR given a revision", (files) => files.set(ADR_NOTED["009"][0], `> | Revision | 1.1 |\n${files.get(ADR_NOTED["009"][0])}`), "had no Revision row at phase_base"],
    ["a PROJECT line kept", sub(".planning/PROJECT.md", "- Phase 86", "- Splitting the Port* family files\n- Phase 86"), "still holds the line - Splitting"],
    ["a PROJECT IN-02 line kept", sub(".planning/PROJECT.md", "- Phase 86", "- Phase 86 review IN-02 stays\n- Phase 86"), "still holds Phase 86 review IN-02"],
    ["a PROJECT provider line without the re-run", sub(".planning/PROJECT.md", " (re-run in Phase 91 through the earlier-phase checks)", ""), "does not hold re-run in Phase 91"],
    ["an AGENTS section 9 without a package", sub("AGENTS.md", "@qadi/devtools ", ""), "AGENTS.md section 9 does not name @qadi/devtools"],
    ["an AGENTS section 16 without the phrase", sub("AGENTS.md", "outside its own package", "x"), "does not name outside its own package"],
    ["an AGENTS section 7a row without the name", sub("AGENTS.md", "`decodePortSpan`", "`x`"), "does not name decodePortSpan"],
    ["a CONTRIBUTING row without the test", sub("CONTRIBUTING.md", "| A public export | test/surface.test.ts |", "| A public export | x |"), "does not name test/surface.test.ts"],
    ["a CONTRIBUTING without the tool row", sub("CONTRIBUTING.md", "scripts/surface-diff.mjs", "x"), "no row naming scripts/surface-diff.mjs"],
    ["a lease header without the owner", sub("packages/react/src/RegistryLease.ts", "`RegistryOwner.ts` is", "x is"), "does not name RegistryOwner.ts"],
    ["a lease header still claiming the provider", sub("packages/react/src/RegistryLease.ts", "`RegistryOwner.ts` is its one caller", "`RegistryOwner.ts`, and `QadiProvider.tsx` is its one caller"), "still claims QadiProvider.tsx"],
    ["a document that does not exist", (files) => files.delete("CONTRIBUTING.md"), "CONTRIBUTING.md does not exist"],
  ]) has(`${what} fails`, closeBad(edit), part);
  eq("a phrase the document wraps across a line is still named", closeBad(sub("AGENTS.md", "outside its own package", "outside its own\npackage")), []);
  has("a phrase with a word dropped by a line wrap still fails", closeBad(sub("AGENTS.md", "outside its own package", "outside its\npackage")), "does not name outside its own package");
  const unusedEdit = (files) => {
    files.set("spec/README.md", files.get("spec/README.md").replace(" BEH-QD-794 ", " ").replace("INV-QD-428 ADR-QD-204 |\n", "INV-QD-428 ADR-QD-204 Unused: BEH-QD-794 |\n"));
    files.set(BEH_HOMES[794], files.get(BEH_HOMES[794]).replace("## BEH-QD-794:", "## BEH-QD-7x4:"));
  };
  eq("a reserved id named after Unused: needs no heading", closeBad(unusedEdit), []);
  eq("a required document that did not change fails", judgeRecordsClose({ read: (p) => fixture().files.get(p), readBase: (p) => fixture().base.get(p), changed: changedDocs.filter((p) => p !== "spec/urs.md"), resolve: () => undefined, exists: (p) => p === FIX_TEST, shas }).some((r) => r.includes("spec/urs.md is not changed since phase_base")), true);
  const behDoc = `## BEH-QD-1: a\n\nPinned by \`packages/core/test/a.test.ts\` and \`b.test.ts\`.\n\n## BEH-QD-2: b\n\nNo pins.\n`;
  eq("a pinned-by list naming existing tests passes, a bare name resolved", judgePinnedExist([["f.md", behDoc]], (n) => (n === "b.test.ts" ? "packages/core/test/b.test.ts" : undefined), () => true), []);
  has("a pinned-by list naming a missing test fails", judgePinnedExist([["f.md", behDoc]], () => undefined, (p) => p !== "packages/core/test/a.test.ts"), "BEH-QD-1 (f.md) names packages/core/test/a.test.ts");
  has("a bare name that resolves to nothing fails", judgePinnedExist([["f.md", behDoc]], () => undefined, () => true), "names b.test.ts, which does not exist");
  eq("the plain records judge adds the revision check's exit", [judgeRecordsPlain([], () => undefined, () => true, 0, "").length, judgeRecordsPlain([], () => undefined, () => true, 1, "bad row\n")], [0, ["node scripts/spec-revise.mjs --check exited 1: bad row"]]);
  eq("the revision of a document is read", [revisionOf("> | Revision | 1.413 |\n"), revisionOf("# x\n")], [{ major: 1, minor: 413, text: "1.413" }, undefined]);

  // Close.
  const children = [{ label: "a", argv: ["a"] }, { label: "b", argv: ["b"] }];
  eq("a child list all exiting 0 passes", runChildren(children, () => ({ code: 0, last: "ok" })), { lines: ["a: exit 0: ok", "b: exit 0: ok"], bad: [] });
  eq("a child exiting 1 fails and is named", runChildren(children, (argv) => ({ code: argv[0] === "b" ? 1 : 0, last: "x" })).bad, ["b exited 1"]);
  eq("an empty child list fails", runChildren([], () => ({ code: 0, last: "" })).bad, ["the child list is empty"]);
  const labels = closeChildren().map((c) => c.label);
  eq("the child list names the phase's checks in order, the escape check last", [labels.length > 0, labels[0].includes("91-pinned-check.mjs --all-applied"), labels[1].includes("91-earlier-checks.mjs"), labels.at(-1), labels.indexOf("91-check.mjs records --close") === 2], [true, true, true, "91-check.mjs escape", true]);
  eq("the close runs every shape judge once", ["barrels", "homes", "folds", "rule", "changesets", "spike", "circular"].map((m) => labels.filter((l) => l === `91-check.mjs ${m}`).length), [1, 1, 1, 1, 1, 1, 1]);
  eq("the close requires the three surface tests and the type test seen failing, and the optional ones if present", [...SURFACE_TESTS, HYDRATION_TEST].every((f) => labels.includes(`91-check.mjs seen-failing ${f}`)) && labels.includes("91-check.mjs seen-failing packages/react/test/HydrationFold.test.ts --if-present") && labels.includes("91-check.mjs seen-failing packages/react/test/GateRegistryFold.test.ts --if-present"), true);
  eq("the close runs the scorer's three checks", ["compare", "landed close", "landed coverage-close"].map((m) => labels.includes(`91-mutation.mjs ${m}`)), [true, true, true]);
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
  if (!PHASE_DIR.startsWith("QD-91-")) fail([`${SELF} is not in a QD-91- directory`]);
  if (mode === undefined || !Object.hasOwn(MODES, mode)) fail([`usage: node 91-check.mjs ${Object.keys(MODES).join("|")}`]);
  else await MODES[mode](args);
}

