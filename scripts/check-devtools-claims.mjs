#!/usr/bin/env node
/**
 * Fails when `spec/devtools-spec/` says something is absent and does not say why it
 * still is.
 *
 * That folder held **seven** false claims at once (CCR-QD-074): three screens marked
 * *Partial* or *Rescope required* after they were built, a README saying "Not built.
 * Screens 3 to 6" six increments too late, a shell document calling lens mode
 * "blocked on a design change to `@qadi/react`" — which is the change ADR-QD-053
 * made — and four claims about what could be obtained. Every one was made false by
 * the increments that closed the gaps those documents described.
 *
 * Nothing had caught them, and nothing could have: the spec gates verify indexes,
 * cross-references and link integrity here, and `check-api-surface.mjs` reads
 * `spec/overview.md` and does not reach this folder. Every claim about what exists
 * was maintained by hand.
 *
 * So each claim of absence is registered in a **"Claims of absence"** table in
 * `spec/devtools-spec/README.md`, with the reason it is still true. The rule is the
 * one `spec/overview.md` states for exports: omission is allowed, **silent** omission
 * is not — and the declaration lives in the document being checked rather than in
 * this file, where a reviewer would never look for it.
 *
 * It fails **in both directions**, which is `SWITCH_BUDGET`'s shape and matters for
 * the same reason: an entry that no longer matches anything means a gap was closed
 * and the document still describes it, which is exactly the defect this gate exists
 * to catch. Closing a gap and deleting its row go together.
 *
 * **A blockquote is exempt.** These documents preserve every superseded claim as a
 * `>` quote under a correction — it is already the house convention, so history is
 * exempt by construction rather than by a growing allowlist.
 *
 * What this gate is not: a proof. The phrase list below is a net, and a claim worded
 * around it goes through — "Partial" is how two screens sat stale for six increments
 * and no phrase here would have caught either. It narrows the gap; it does not close
 * it.
 *
 * The Map key below uses `\0` as its separator (a file path and a phrase can each
 * contain almost anything else). It used to be a literal NUL byte, the same mistake
 * `RelationshipResolver.ts` made and `check-api-surface.mjs`'s own header still notes:
 * git renders a file containing one as binary, so this gate's own diffs were
 * unreviewable since the commit that introduced it. The escape is semantically
 * identical and costs nothing.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const FOLDER = join(ROOT, "spec", "devtools-spec");
const LEDGER = join(FOLDER, "README.md");

/**
 * Ways these documents say a thing is not there.
 *
 * Lower-cased and matched against a lower-cased line, so "Not built" and "not built"
 * are one phrase. Ordered longest-first so a line matching both `not obtainable` and
 * `obtainable` is counted once, against the more specific.
 */
const PHRASES = [
  "rescope required",
  "cannot be known",
  "is not written",
  "not obtainable",
  "not implemented",
  "unobtainable",
  "has no source",
  "not recorded",
  "not retained",
  "blocked on",
  "not built",
].sort((a, b) => b.length - a.length);

const failures = [];
const fail = (where, message) => failures.push(`${where}  ${message}`);

// ---------------------------------------------------------------------------
// 1. OCCURRENCES — every live claim of absence, by file and phrase.
// ---------------------------------------------------------------------------

/** `| File | Phrase | Count | Still true because |` under this heading. */
const LEDGER_HEADING = "## Claims of absence";

/**
 * Whether a line is history rather than a claim.
 *
 * A blockquote is a preserved superseded claim; a Document-Control row is a change
 * history. Neither describes what is true now, and forcing either to be rewritten
 * would have this gate corrupting the record it exists to protect.
 */
const isHistory = (line) => /^\s*>/.test(line) || /^\|\s*(Document ID|Revision|Effective|Status|Author|Classification|Change History|Property)/.test(line.trim());

const found = new Map();
const record = (rel, phrase, line) => {
  const key = `${rel}\0${phrase}`;
  const existing = found.get(key) ?? { rel, phrase, lines: [] };
  existing.lines.push(line);
  found.set(key, existing);
};

/**
 * Every `.md` under `FOLDER`, recursively — the same shape
 * `check-dod-table.mjs`'s and `check-doc-examples.mjs`'s own `collectMarkdown`
 * already use. `spec/devtools-spec/` has no subdirectory today (`find
 * spec/devtools-spec -type d` returns only the folder itself), so a top-level
 * `readdirSync` happened to see everything — but a claim of absence written
 * into a future subdirectory would have gone unscanned by a checker whose own
 * purpose is "no silent omission," which is the gap this closes.
 */
const collectMarkdown = (dir) => {
  const out = [];
  for (const entry of readdirSync(dir).sort()) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...collectMarkdown(full));
    else if (entry.endsWith(".md")) out.push(full);
  }
  return out;
};

const files = collectMarkdown(FOLDER).map((full) => relative(FOLDER, full));

if (files.length === 0) {
  // A checker with nothing to check is looking in the wrong place, and reporting
  // "0 claims registered" would be the most dangerous possible pass.
  console.error(`devtools-claims: no markdown found in spec/devtools-spec — the checker is looking in the wrong place`);
  process.exit(1);
}

for (const entry of files) {
  const file = join(FOLDER, entry);
  const rel = relative(ROOT, file);
  const lines = readFileSync(file, "utf8").split("\n");

  // The ledger describes claims; it does not make them. Without this the table
  // would register itself and the count could never balance.
  let inLedger = false;

  for (const [index, raw] of lines.entries()) {
    if (raw.startsWith("## ")) inLedger = raw.trim() === LEDGER_HEADING;
    if (inLedger || isHistory(raw)) continue;

    const line = raw.toLowerCase();
    let rest = line;
    for (const phrase of PHRASES) {
      let at = rest.indexOf(phrase);
      while (at !== -1) {
        record(rel, phrase, index + 1);
        // Blanked rather than removed, so later offsets stay meaningful and a
        // shorter phrase cannot match inside one already counted.
        rest = rest.slice(0, at) + " ".repeat(phrase.length) + rest.slice(at + phrase.length);
        at = rest.indexOf(phrase, at + phrase.length);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// 2. LEDGER — what the README declares, with counts.
// ---------------------------------------------------------------------------

const ledgerSection = readFileSync(LEDGER, "utf8").split(`\n${LEDGER_HEADING}`)[1]?.split("\n## ")[0] ?? "";

const declared = new Map();
for (const line of ledgerSection.split("\n")) {
  if (!line.startsWith("|") || line.includes("| ---")) continue;
  const cells = line.split("|").map((cell) => cell.trim().replace(/`/g, ""));
  if (cells[1] === "File") continue;
  const [, file, phrase, count, reason] = cells;
  if (file === undefined || phrase === undefined) continue;
  if (reason === undefined || reason === "") {
    fail(`spec/devtools-spec/README.md`, `[unreasoned] \`${file}\` / "${phrase}" is registered with no reason. The reason is the whole point of registering it.`);
  }
  declared.set(`spec/devtools-spec/${file}\0${phrase.toLowerCase()}`, {
    file,
    phrase,
    count: Number(count),
  });
}

// ---------------------------------------------------------------------------
// 3. COMPARE — both directions.
// ---------------------------------------------------------------------------

for (const [key, occurrence] of found) {
  const row = declared.get(key);
  if (row === undefined) {
    fail(
      `${occurrence.rel}:${occurrence.lines.join(", ")}`,
      `[unregistered] says "${occurrence.phrase}" and the Claims of absence table in ` +
        `spec/devtools-spec/README.md does not say why that is still true.\n` +
        `    Register it with a reason, or correct the claim.`,
    );
    continue;
  }
  if (row.count !== occurrence.lines.length) {
    fail(
      `${occurrence.rel}:${occurrence.lines.join(", ")}`,
      `[count] "${occurrence.phrase}" occurs ${occurrence.lines.length} time(s) and the ledger declares ${row.count}.`,
    );
  }
}

for (const [key, row] of declared) {
  if (found.has(key)) continue;
  fail(
    `spec/devtools-spec/README.md`,
    `[stale] registers "${row.phrase}" in \`${row.file}\` and it is not there any more.\n` +
      `    A closed gap and its ledger row go together — delete the row.`,
  );
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

if (failures.length > 0) {
  for (const line of failures) console.error(line);
  console.error(
    `\n${failures.length} unregistered claim(s) in spec/devtools-spec. ` +
      `A document saying something is absent must say why it still is.`,
  );
  process.exit(1);
}

const total = [...found.values()].reduce((sum, one) => sum + one.lines.length, 0);
console.log(`devtools-claims: ${total} claim(s) registered across ${files.length} file(s)`);
