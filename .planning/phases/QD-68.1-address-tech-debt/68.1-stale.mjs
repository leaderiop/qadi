// node .planning/phases/QD-68.1-address-tech-debt/68.1-stale.mjs [<extra file>...]
// node .planning/phases/QD-68.1-address-tech-debt/68.1-stale.mjs --self-test
//
// Phase 68's staleness check (`68-stale.mjs`, kept as recorded) with two corrections, reading Phase 68's own report as
// well (`68-stale.mjs` reads Phases 62 to 67). For each of Phases 62 to 68: the commit that last changed its
// VERIFICATION.md, the repository files that document cites (a path-shaped token naming a file that existed at that
// commit, its `covered_files` among them), and those of them a later commit changed, plus any <extra file> named, for a
// prediction before the changes land. A rename counts as a change to its old path as well as its new one
// (`git diff --no-renames`), and a path under `.changeset/` or `.github/`, a root dotfile and `pnpm-lock.yaml` count as
// cited when the document names them. A phase is stale when that intersection is not empty; the files its
// `covered_files` declares are marked `(covered)`. Prints one line per phase, one line per stale file, and last
// `redo: <phases>` (`redo: none` when every report is current); exits 0 whatever it finds. `--self-test` plants each
// correction in a temporary repository and runs this script and `68-stale.mjs` there: this one must find every change,
// and `68-stale.mjs` must miss every one but the deletion, so a case that stops showing its defect fails too. A phase
// record, not run by `pnpm check:pr`.
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const PATH =
  /(?:packages|scripts|spec|features|examples|apps|\.planning|\.changeset|\.github)\/[A-Za-z0-9_./@-]+\.[A-Za-z0-9]+|(?:AGENTS|README|CONTRIBUTING)\.md|stryker[a-z.-]*\.mjs|tstyche\.json|tsconfig[a-z.-]*\.json|package\.json|pnpm-workspace\.yaml|pnpm-lock\.yaml|(?<![A-Za-z0-9_./@-])\.[A-Za-z][A-Za-z0-9_.-]*/g;

const main = (extra) => {
  const git = (...args) => execFileSync("git", args, { encoding: "utf8", maxBuffer: 1 << 26 });
  const redo = [];
  for (const phase of [62, 63, 64, 65, 66, 67, 68]) {
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
    const covered = new Set(
      (/^covered_files:\n((?: {2}- .+\n)+)/m.exec(text)?.[1] ?? "")
        .split("\n")
        .map((l) => l.replace(/^ {2}- /, "").replace(/^"(.*)"$/, "$1"))
        .filter(Boolean),
    );
    const cited = [...new Set([...(text.match(PATH) ?? []), ...covered])].filter((p) => atCommit.has(p)).sort();
    const changed = new Set([...git("diff", "--no-renames", "--name-only", `${commit}..HEAD`).split("\n").filter(Boolean), ...extra]);
    const stale = cited.filter((p) => changed.has(p));
    console.log(`${phase}: ${stale.length > 0 ? "stale" : "current"}, verification ${commit.slice(0, 8)}, ${cited.length} cited, ${stale.length} changed since`);
    for (const p of stale) console.log(`  ${p}${covered.has(p) ? " (covered)" : ""}`);
    if (stale.length > 0) redo.push(phase);
  }
  console.log(`redo: ${redo.length > 0 ? redo.join(" ") : "none"}`);
};

const selfTest = () => {
  const self = fileURLToPath(import.meta.url);
  const original = fileURLToPath(new URL("../QD-68-hygiene-and-recorded-close-outs/68-stale.mjs", import.meta.url));
  const files = {
    ".planning/phases/QD-62-x/62-VERIFICATION.md":
      "---\ncovered_files:\n  - scripts/cited.mjs\n---\nCites `scripts/cited.mjs`, `.changeset/c.md`, `.github/workflows/check.yml` and `.oxlintrc.json`.\n",
    "scripts/cited.mjs": "export const cited = 1;\n",
    ".changeset/c.md": "one\n",
    ".github/workflows/check.yml": "name: one\n",
    ".oxlintrc.json": "{}\n",
    "src/other.ts": "export const other = 1;\n",
  };
  // The change, what this script must read Phase 62 as, and what 68-stale.mjs reads it as: its defect, but for a deletion.
  const cases = [
    ["a renamed cited file is stale", (git) => git("mv", "scripts/cited.mjs", "scripts/renamed.mjs"), "stale", "current"],
    ["an edited .changeset file is stale", (_git, put) => put(".changeset/c.md", "two\n"), "stale", "current"],
    ["an edited .github file is stale", (_git, put) => put(".github/workflows/check.yml", "name: two\n"), "stale", "current"],
    ["an edited root dotfile is stale", (_git, put) => put(".oxlintrc.json", '{ "rules": {} }\n'), "stale", "current"],
    ["a deleted cited file is stale", (git) => git("rm", "-q", "scripts/cited.mjs"), "stale", "stale"],
    ["an edit to an uncited file is current", (_git, put) => put("src/other.ts", "export const other = 2;\n"), "current", "current"],
  ];
  const fail = (name, why) => {
    console.error(`self-test FAILED: ${name}: ${why}`);
    process.exit(1);
  };
  let passed = 0;
  for (const [name, change, want, control] of cases) {
    const dir = mkdtempSync(join(tmpdir(), "stale-self-test-"));
    let got;
    let was;
    try {
      const git = (...args) =>
        execFileSync(
          "git",
          ["-c", "user.name=self-test", "-c", "user.email=self-test@example.invalid", "-c", "commit.gpgsign=false", "-c", "core.hooksPath=/dev/null", "-c", "init.defaultBranch=main", ...args],
          { cwd: dir, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
        );
      const put = (file, text) => {
        mkdirSync(join(dir, dirname(file)), { recursive: true });
        writeFileSync(join(dir, file), text);
      };
      git("init", "-q");
      for (const [file, text] of Object.entries(files)) put(file, text);
      git("add", "-A");
      git("commit", "-q", "-m", "base");
      change(git, put);
      git("add", "-A");
      git("commit", "-q", "-m", name);
      const verdict = (script) => /^62: (\w+),/m.exec(execFileSync(process.execPath, [script], { cwd: dir, encoding: "utf8" }))?.[1];
      got = verdict(self);
      was = verdict(original);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
    if (got !== want) fail(name, `this script read Phase 62 as ${got}, wanted ${want}`);
    if (was !== control) fail(name, `68-stale.mjs read Phase 62 as ${was}, wanted ${control}: the case no longer shows its defect`);
    passed += 1;
  }
  console.log(`self-test: ${passed} passed`);
};

if (process.argv[2] === "--self-test") selfTest();
else main(process.argv.slice(2));
