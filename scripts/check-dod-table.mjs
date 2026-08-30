#!/usr/bin/env node
/**
 * Fails when the merge gate `spec/process/definitions-of-done.md` documents and the
 * one `pnpm check` actually runs disagree.
 *
 * That table says of itself: *"Adding a gate means editing `pnpm check` and this
 * table together."* Nothing checked it, and it had drifted in both directions at
 * once. `pnpm check` grew a second Stryker run in CCR-QD-067 that the table never
 * learned about — so the documented gate was **weaker than the real one**, the same
 * defect the table already records against step 9. And CCR-QD-048 inserted two steps
 * in the middle, which renumbered everything after them and left **eight** references
 * elsewhere in the repository pointing at the wrong step (CCR-QD-075).
 *
 * The second of those was already a known trap. ADR-QD-025's change history:
 * *"Named the step by position rather than index — it said 'step 9' while the gate
 * table had it at 10, and a new gate has since made it 11."* Someone hit it, fixed
 * one instance and wrote it down; eight others drifted anyway. A note is not a gate.
 *
 * Three checks:
 *
 *   1. TABLE      — the table's rows are exactly the commands `pnpm check` runs, in
 *                   order.
 *   2. REFERENCES — every live "gate N" / "step N of `pnpm check`" names the command
 *                   it means, and N is that command's row.
 *   3. COUNT      — README.md's "all N gates" is the real number, in words.
 *
 * Change history is **exempt from check 2**: a CCR row saying a gate was added "as
 * merge gate 10" records what was true then, and rewriting history to keep a gate
 * green would be the gate corrupting the record it exists to protect.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const DOD = join(ROOT, "spec", "process", "definitions-of-done.md");
const README = join(ROOT, "README.md");

const failures = [];
const fail = (where, message) => failures.push(`${where}  ${message}`);

// ---------------------------------------------------------------------------
// 1. TABLE — expand `check`, compare to the table row for row.
// ---------------------------------------------------------------------------

const scripts = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8")).scripts;

/**
 * The commands `pnpm check` runs, in order, with the alias each came from.
 *
 * `pnpm <name>` is expanded recursively so `typecheck` and `lint` contribute their
 * two commands each, which is why the table has more rows than `check` has parts.
 *
 * **`pnpm --filter …` is not expanded.** A workspace boundary is one step — it is
 * how the table already treats `pnpm --filter @qadi/features test`, and following it
 * would replace a gate a reader recognises with another package's private script
 * name.
 */
const expand = (command, alias) =>
  command.split("&&").flatMap((raw) => {
    const part = raw.trim();
    const inner = /^pnpm ([\w:-]+)$/.exec(part);
    if (inner !== null && inner[1] in scripts) {
      return expand(scripts[inner[1]], inner[1]);
    }
    return [{ command: part, alias }];
  });

const steps = expand(scripts.check, "check");

const dod = readFileSync(DOD, "utf8");

/**
 * The `| # | Command | Gate |` rows, as written.
 *
 * Section-then-line parsing rather than a markdown library, as
 * `check-api-surface.mjs` does: the shape is fixed and a dependency here would be a
 * dependency in the thing that decides whether the build passes.
 */
const tableSection = dod.split("\n## Merge gate")[1]?.split("\n## ")[0] ?? "";
const rows = [];
for (const line of tableSection.split("\n")) {
  if (!line.startsWith("|") || line.includes("| ---")) continue;
  const cells = line.split("|").map((cell) => cell.trim());
  if (cells[1] === "#") continue;
  rows.push({ number: cells[1] ?? "", command: (cells[2] ?? "").replace(/`/g, "") });
}

if (rows.length === 0) {
  // A checker that finds nothing to check is looking in the wrong place, and
  // saying "0 steps match" would be the most dangerous possible pass.
  console.error("dod-table: no merge-gate table found in spec/process/definitions-of-done.md");
  process.exit(1);
}

for (const [index, step] of steps.entries()) {
  const row = rows[index];
  if (row === undefined) {
    fail("spec/process/definitions-of-done.md", `[missing] \`pnpm check\` runs \`${step.command}\` as step ${index + 1} and the table stops at ${rows.length}.`);
    continue;
  }
  if (row.command !== step.command) {
    fail(
      "spec/process/definitions-of-done.md",
      `[mismatch] step ${index + 1} is \`${step.command}\` in package.json and \`${row.command}\` in the table.`,
    );
  }
  if (row.number !== String(index + 1)) {
    fail("spec/process/definitions-of-done.md", `[numbering] the row for \`${row.command}\` is numbered ${row.number}, and it is step ${index + 1}.`);
  }
}

for (const row of rows.slice(steps.length)) {
  // The table over-claiming is the more dangerous direction: a gate a reader
  // believes in and CI does not run.
  fail("spec/process/definitions-of-done.md", `[phantom] the table lists \`${row.command}\` and \`pnpm check\` does not run it.`);
}

// ---------------------------------------------------------------------------
// 2. REFERENCES — a step named by number must also be named by command.
// ---------------------------------------------------------------------------

/**
 * What identifies a step in prose.
 *
 * Three ways a document refers to the same step, all derived rather than listed:
 * the script's basename (`check-api-surface.mjs`), the bare command word
 * (`oxlint`, `madge`, `tstyche`, `stryker`, `tsc`), and the `pnpm` alias that
 * produced it (`typecheck`, `spec:api`). Steps 1 and 2 are only ever called
 * `pnpm typecheck` in prose, which is why the alias has to count.
 */
const identifiers = steps.map((step) => {
  const tokens = new Set([step.alias]);
  for (const match of step.command.matchAll(/([\w.-]+\.mjs|[\w.-]+\.sh)/g)) {
    tokens.add(match[1].split("/").pop());
  }
  const bare = step.command.replace(/^(?:node|bash|npx) /, "").split(" ")[0];
  tokens.add(bare.split("/").pop());
  return tokens;
});

/** `gate 9`, `merge gate 10`, `step 11 of \`pnpm check\``, `gate 1–2`. */
const REFERENCE = /\b(?:merge )?(?:gate|step) (\d+)(?:\s*[–-]\s*(\d+))?\b/gi;

/**
 * Lines that record what was true at a moment, not what is true.
 *
 * A CCR row and a Change History cell are the repository's memory. A gate that
 * forced them to be rewritten would destroy the evidence it exists to preserve.
 */
const HISTORICAL = /^\|\s*CCR-QD-\d+|^> \| Change History|^\|\s*Change History/;

const collectMarkdown = (dir) => {
  const out = [];
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry.startsWith(".")) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...collectMarkdown(full));
    else if (full.endsWith(".md") || full.endsWith(".mjs")) out.push(full);
  }
  return out;
};

/**
 * This file is not scanned.
 *
 * Its doc comment quotes stale references as **examples** of the defect, and its
 * regex doc-comment lists the forms it matches. A gate reading its own explanation
 * of the bug would report the explanation as the bug.
 */
const SELF = join(ROOT, "scripts", "check-dod-table.mjs");

const scanned = [
  join(ROOT, "AGENTS.md"),
  join(ROOT, "README.md"),
  join(ROOT, "CONTRIBUTING.md"),
  ...collectMarkdown(join(ROOT, "spec")),
  ...collectMarkdown(join(ROOT, "scripts")),
];

let references = 0;

for (const file of scanned) {
  if (file === SELF) continue;
  const rel = relative(ROOT, file);
  const lines = readFileSync(file, "utf8").split("\n");

  for (const [index, line] of lines.entries()) {
    if (HISTORICAL.test(line)) continue;
    // Prose here is hand-wrapped at about ninety columns (AGENTS.md §17), so the
    // command a sentence names routinely lands on the line above or below the
    // number. The paragraph is the unit a human reads; anything narrower would
    // fail on correct text.
    let start = index;
    while (start > 0 && lines[start - 1].trim() !== "") start -= 1;
    let end = index;
    while (end < lines.length - 1 && lines[end + 1].trim() !== "") end += 1;
    const paragraph = lines.slice(start, end + 1).join(" ");

    for (const match of line.matchAll(REFERENCE)) {
      const first = Number(match[1]);
      const last = match[2] === undefined ? first : Number(match[2]);
      for (let n = first; n <= last; n += 1) {
        const tokens = identifiers[n - 1];
        if (tokens === undefined) {
          fail(`${rel}:${index + 1}`, `[range] names gate ${n}, and \`pnpm check\` has ${steps.length} steps.\n    ${line.trim()}`);
          continue;
        }
        references += 1;
        if ([...tokens].some((token) => paragraph.includes(token))) continue;
        const named = identifiers.findIndex((set) => [...set].some((token) => paragraph.includes(token)));
        fail(
          `${rel}:${index + 1}`,
          named === -1
            ? `[unnamed] names gate ${n} without naming the command it means, so nothing can check it. Name the script or the command.\n    ${line.trim()}`
            : `[stale] names gate ${n}, and the command in this paragraph is step ${named + 1}.\n    ${line.trim()}`,
        );
      }
    }
  }
}

// ---------------------------------------------------------------------------
// 3. COUNT — the one hard total in the repository.
// ---------------------------------------------------------------------------

const WORDS = [
  "zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine",
  "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen",
  "seventeen", "eighteen", "nineteen", "twenty", "twenty-one", "twenty-two",
];

const total = readFileSync(README, "utf8").match(/all ([\w-]+) gates, in order/);
if (total === null) {
  fail("README.md", `[count] the "all N gates, in order" line is gone. It is the only total in the repository; keep it or this check is dead.`);
} else if (total[1] !== WORDS[steps.length]) {
  fail("README.md", `[count] says "all ${total[1]} gates" and \`pnpm check\` runs ${steps.length}.`);
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

if (failures.length > 0) {
  for (const line of failures) console.error(line);
  console.error(
    `\n${failures.length} merge-gate drift(s). ` +
      `\`pnpm check\` and spec/process/definitions-of-done.md are one thing described twice.`,
  );
  process.exit(1);
}

console.log(`dod-table: ${steps.length} step(s) match pnpm check, ${references} reference(s) resolve`);
