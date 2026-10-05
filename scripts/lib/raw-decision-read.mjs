import { readFileSync } from "node:fs";
import { relative } from "node:path";
import { extractCodeFences } from "./extract-code-fences.mjs";

/**
 * What counts as reading a decision result's `AsyncResult` state directly,
 * rather than through `@qadi/react`'s `outcomeOf` (ADR-QD-017, ARCH-14).
 *
 * One pattern, shared by `check-house-style.mjs`'s `DECISION_READ_BUDGET`
 * (library source) and the two doc-fence gates (`check-doc-examples.mjs`,
 * `check-website-doc-examples.mjs`), so "a raw read" means the same thing in
 * code and in documentation.
 *
 * Three ways a stale answer escapes, all covered by {@link RAW_DECISION_READ}:
 *
 * - `.waiting` — branching on the flag is how a re-check gets its own ladder,
 *   and a ladder that forgets it renders the previous allow (ARCH-14 C5).
 * - `.previousSuccess` — a `Failure` keeps the last success there.
 * - `AsyncResult.isSuccess(` and its siblings, and the value accessors
 *   (`value`, `getOrElse`, `getOrThrow`, the `match` family, `toExit`), which
 *   either ignore `waiting` or return a failure's `previousSuccess`.
 *
 * The pattern is global, so a caller counting reads gets every one on a line —
 * `AsyncResult.isSuccess(r) && !r.waiting` is two. Callers reset `lastIndex`
 * by using `String.prototype.match`/`matchAll`, never `RegExp.prototype.test`.
 */
export const RAW_DECISION_READ =
  /\.waiting\b|\.previousSuccess\b|\bAsyncResult\.(?:isSuccess|isFailure|isInitial|isNotInitial|isWaiting|value|getOrElse|getOrThrow|match|matchWithError|matchWithWaiting|toExit)\(/g;

/** A fence that imports `@qadi/react` is a fence about reading decisions. */
const IMPORTS_QADI_REACT = /\bfrom\s+["']@qadi\/react["']/;

/**
 * The reviewed opt-out: a fence that reads raw on purpose says why. ADR-QD-017
 * keeps raw access as a deliberate stale-while-revalidate choice, and a
 * deliberate choice is one written down where the next reader will see it.
 */
const OPT_OUT = /\/\/[ \t]*qadi:raw-decision-read[ \t]+(?:—|--|-)[ \t]*\S/;

/**
 * Blanks comments while keeping line numbers, so prose that names a raw read
 * — "a re-check still holds the old answer in `.waiting`" — is not one.
 */
const stripComments = (text) =>
  text
    .replace(/\/\*[\s\S]*?\*\//g, (comment) => comment.replace(/[^\n]/g, " "))
    .replace(/\/\/[^\n]*/g, "");

/**
 * The raw decision reads in one compiled fence's source, with 1-based line
 * numbers relative to the fence.
 *
 * Empty for a fence that does not import `@qadi/react` (a raw `AsyncResult`
 * read elsewhere is not a decision read), and for one carrying the opt-out.
 *
 * @param {string} fenceText
 * @returns {Array<{ readonly line: number; readonly match: string }>}
 */
export const findRawDecisionReads = (fenceText) => {
  if (!IMPORTS_QADI_REACT.test(fenceText) || OPT_OUT.test(fenceText)) return [];
  const hits = [];
  stripComments(fenceText)
    .split("\n")
    .forEach((line, index) => {
      for (const match of line.matchAll(RAW_DECISION_READ)) {
        hits.push({ line: index + 1, match: match[0] });
      }
    });
  return hits;
};

/**
 * Scans every compiled fence in `files` and exits the process with status 1,
 * naming each `file:line`, when any reads a decision result raw.
 *
 * Run by both doc-fence gates (`check-doc-examples.mjs` for `spec/` and the
 * READMEs, `check-website-doc-examples.mjs` for the website) ahead of
 * compiling, so no new gate and no DoD-table row: a raw read is a reason the
 * examples do not pass, the same as a type error. Compiling proves a fence
 * calls real signatures; it says nothing about whether it renders a stale
 * allow, which is how the React guide shipped one (ARCH-14 C5).
 *
 * Scans exactly the fences `compileFencedExamples` compiles (` ```typescript `
 * and ` ```tsx `, via the same `extractCodeFences`); a ` ```ts ` fragment is
 * reference material, neither compiled nor scanned (AGENTS.md §12).
 *
 * @param {{ readonly root: string; readonly files: ReadonlyArray<string>; readonly label: string }} options
 */
export const refuseRawDecisionReads = ({ root, files, label }) => {
  const reports = [];
  for (const file of files) {
    for (const fence of extractCodeFences(readFileSync(file, "utf8"))) {
      for (const hit of findRawDecisionReads(fence.source)) {
        const line = fence.startLine + hit.line - 1;
        reports.push(`${relative(root, file)}:${line}  \`${hit.match}\``);
      }
    }
  }
  if (reports.length === 0) return;
  console.error(
    `${label}: ${reports.length} raw read(s) of a decision result in fences that import @qadi/react:\n` +
      reports.map((report) => `  ${report}`).join("\n") +
      `\n\nRead the result with outcomeOf (or currentDecision): a result being re-checked still holds\n` +
      `the previous answer, and a failure keeps it as previousSuccess (ADR-QD-017, AGENTS.md §13).\n` +
      `A fence that reads raw on purpose says why: // qadi:raw-decision-read — <reason>`,
  );
  process.exit(1);
};
