// node .planning/phases/QD-68-hygiene-and-recorded-close-outs/68-stale.mjs [<extra file>...]
//
// The staleness check of HYGN-06. For each of Phases 62 to 67: the commit that last changed its VERIFICATION.md, the
// repository files that document cites (a path-shaped token naming a file that existed at that commit, its
// `covered_files` among them), and those of them a later commit changed (`git diff --name-only <commit>..HEAD`, plus
// any <extra file> named, for a prediction before the changes land). A phase is stale when that intersection is not
// empty; the files its `covered_files` declares, quoted or not, are marked `(covered)`, the set GSD's own digest
// reads. Prints one line per phase, one line per stale file, and last `redo: <phases>`, the stale phases to re-verify
// (`redo: none` when every report is current); exits 0 whatever it finds. A phase record, not run by `pnpm check:pr`.
import { execFileSync } from "node:child_process";
import { readdirSync } from "node:fs";

const git = (...args) => execFileSync("git", args, { encoding: "utf8", maxBuffer: 1 << 26 });
const extra = process.argv.slice(2);
const PATH = /(?:packages|scripts|spec|features|examples|apps|\.planning)\/[A-Za-z0-9_./@-]+\.[A-Za-z0-9]+|(?:AGENTS|README|CONTRIBUTING)\.md|stryker[a-z.-]*\.mjs|tstyche\.json|tsconfig[a-z.-]*\.json|package\.json|pnpm-workspace\.yaml/g;

const redo = [];
for (const phase of [62, 63, 64, 65, 66, 67]) {
  const dir = readdirSync(".planning/phases").find((d) => d.startsWith(`QD-${phase}-`));
  if (dir === undefined) {
    console.log(`${phase}: no phase directory`);
    continue;
  }
  const doc = `.planning/phases/${dir}/${phase}-VERIFICATION.md`;
  const commit = git("log", "-1", "--format=%H", "--", doc).trim();
  if (commit === "") {
    console.log(`${phase}: ${doc} was never committed`);
    continue;
  }
  const atCommit = new Set(git("ls-tree", "-r", "--name-only", commit).split("\n"));
  const text = git("show", `${commit}:${doc}`);
  const covered = new Set((/^covered_files:\n((?: {2}- .+\n)+)/m.exec(text)?.[1] ?? "").split("\n").map((l) => l.replace(/^ {2}- /, "").replace(/^"(.*)"$/, "$1")).filter(Boolean));
  const cited = [...new Set([...(text.match(PATH) ?? []), ...covered])].filter((p) => atCommit.has(p)).sort();
  const changed = new Set([...git("diff", "--name-only", `${commit}..HEAD`).split("\n").filter(Boolean), ...extra]);
  const stale = cited.filter((p) => changed.has(p));
  console.log(`${phase}: ${stale.length > 0 ? "stale" : "current"}, verification ${commit.slice(0, 8)}, ${cited.length} cited, ${stale.length} changed since`);
  for (const p of stale) console.log(`  ${p}${covered.has(p) ? " (covered)" : ""}`);
  if (stale.length > 0) redo.push(phase);
}
console.log(`redo: ${redo.length > 0 ? redo.join(" ") : "none"}`);
