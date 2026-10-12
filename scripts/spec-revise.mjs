#!/usr/bin/env node
/**
 * The one reader and writer of a spec document's revision header.
 *
 *   node scripts/spec-revise.mjs --check
 *   node scripts/spec-revise.mjs <spec-doc.md> "<what changed>" [--date YYYY-MM-DD]
 *
 * Every document under `spec/` opens with a Document Control table whose
 * `Revision` row must equal the version of the newest entry in its
 * `Change History` cell. Nothing enforced that, so the two drifted apart in
 * several documents and a change could add content with no history entry at
 * all. `--check` makes that a failure (`pnpm spec:verify` runs it).
 *
 * The second form is the only edit a revision needs, done mechanically: it
 * bumps the minor version, writes it to both places and prepends the entry.
 * Two branches that each bump the same document still conflict on those two
 * lines, but the resolution is now always the same one command: take either
 * side, then run this on the document once per entry still to add. Prefer
 * running it after merging, not while implementing in parallel.
 */
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";

const root = resolve(new URL("..", import.meta.url).pathname);
const specDir = join(root, "spec");

const REVISION_ROW = /^(> \| Revision\s+\| )(\d+\.\d+)(\s*\|)$/m;
const HISTORY_ROW = /^(> \| Change History \| )(\d+\.\d+)( \()/m;

/** Every markdown file under `dir`, recursively. */
const markdownFiles = (dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory()
      ? markdownFiles(join(dir, entry.name))
      : entry.name.endsWith(".md")
        ? [join(dir, entry.name)]
        : [],
  );

/** `{ revision, newest }` of a document, or `undefined` when it has no Document Control table. */
const headerOf = (text) => {
  const revision = REVISION_ROW.exec(text);
  const history = HISTORY_ROW.exec(text);
  return revision === null || history === null
    ? undefined
    : { revision: revision[2], newest: history[2] };
};

const args = process.argv.slice(2);

if (args.includes("--check")) {
  const drifted = markdownFiles(specDir).flatMap((file) => {
    const header = headerOf(readFileSync(file, "utf8"));
    return header !== undefined && header.revision !== header.newest
      ? [`${relative(root, file)}: Revision ${header.revision}, newest history entry ${header.newest}`]
      : [];
  });
  if (drifted.length > 0) {
    console.error(`spec-revise: ${drifted.length} document(s) whose Revision differs from their newest Change History entry:`);
    for (const line of drifted) console.error(`  ${line}`);
    console.error("Fix with: node scripts/spec-revise.mjs <doc> \"<what changed>\"");
    process.exit(1);
  }
  console.log("spec-revise: every Revision matches its newest Change History entry");
  process.exit(0);
}

const dateFlag = args.indexOf("--date");
const date = dateFlag === -1 ? new Date().toISOString().slice(0, 10) : args[dateFlag + 1];
const positional = args.filter((arg, index) => !arg.startsWith("--") && index !== dateFlag + 1);
const [doc, entry] = positional;

if (doc === undefined || entry === undefined || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
  console.error('usage: spec-revise.mjs --check | <spec-doc.md> "<what changed>" [--date YYYY-MM-DD]');
  process.exit(2);
}

const file = resolve(doc);
const text = readFileSync(file, "utf8");
const header = headerOf(text);
if (header === undefined) {
  console.error(`spec-revise: ${doc} has no Revision / Change History rows.`);
  process.exit(2);
}
if (header.revision !== header.newest) {
  console.error(
    `spec-revise: ${doc} is already out of step (Revision ${header.revision}, newest entry ${header.newest}); reconcile it first.`,
  );
  process.exit(2);
}

const [major, minor] = header.revision.split(".");
const next = `${major}.${Number(minor) + 1}`;

const bumped = text
  .replace(REVISION_ROW, (_, open, _old, close) => {
    const width = open.length + header.revision.length + close.length;
    return `${open}${next.padEnd(header.revision.length + (width - open.length - header.revision.length - close.length))}${close}`;
  })
  .replace(HISTORY_ROW, (_, open, _old, paren) => `${open}${next} (${date}): ${entry}<br>${header.newest}${paren}`);

writeFileSync(file, bumped);
console.log(`spec-revise: ${relative(root, file)} ${header.revision} -> ${next}`);
