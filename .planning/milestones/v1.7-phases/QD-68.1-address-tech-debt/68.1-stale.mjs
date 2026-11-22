// node .planning/milestones/v1.7-phases/QD-68.1-address-tech-debt/68.1-stale.mjs [<extra file>...]
// node .planning/milestones/v1.7-phases/QD-68.1-address-tech-debt/68.1-stale.mjs --self-test
//
// Phase 68's staleness check (`68-stale.mjs`, kept as recorded) with two corrections, reading Phase 68's own report as
// well (`68-stale.mjs` reads Phases 62 to 67). For each of Phases 62 to 68 and 68.1: the commit that last changed its
// VERIFICATION.md, the repository files that document cites (a path-shaped token naming a file that existed at that
// commit, its `covered_files` among them), and those of them a later commit changed, plus any <extra file> named, for a
// prediction before the changes land. A rename counts as a change to its old path as well as its new one
// (`git diff --no-renames`), and a path under `.changeset/`, `.github/`, `assets/` or `reports/`, a root `CLAUDE.md`,
// `LICENSE` or `vitest*` config, a root dotfile (a trailing `.` or `-` is not part of its name) and `pnpm-lock.yaml`
// count as cited when the document names them. A phase is found under `.planning/phases` or, archived, under
// `.planning/milestones/*-phases`; its report's verification commit is its last content change, followed across that move, and a
// record the archive moved unchanged is not a change. A phase is stale when that intersection is not empty; the files its
// `covered_files` declares are marked `(covered)`. Prints one line per phase, one line per stale file, and last
// `redo: <phases>` (`redo: none` when every report is current); exits 0 whatever it finds. `--self-test` plants each
// correction in a temporary repository and runs this script and `68-stale.mjs` there: this one must find every change,
// and `68-stale.mjs` must miss every one but the deletion, so a case that stops showing its defect fails too. A phase
// record, not run by `pnpm check:pr`.
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const PATH =
  /(?:packages|scripts|spec|features|examples|apps|\.planning|\.changeset|\.github|assets|reports)\/[A-Za-z0-9_./@-]+\.[A-Za-z0-9]+|(?:AGENTS|CLAUDE|README|CONTRIBUTING)\.md|LICENSE|vitest[a-z.-]*\.(?:ts|mts|mjs)|stryker[a-z.-]*\.mjs|tstyche\.json|tsconfig[a-z.-]*\.json|package\.json|pnpm-workspace\.yaml|pnpm-lock\.yaml|(?<![A-Za-z0-9_./@-])\.[A-Za-z](?:[A-Za-z0-9_.-]*[A-Za-z0-9])?/g;

/** A phase's directory, under `.planning/phases` or, once archived, under `.planning/milestones/*-phases`. */
export const phaseDir = (phase) => {
  const roots = [".planning/phases"];
  if (existsSync(".planning/milestones"))
    for (const d of readdirSync(".planning/milestones")) if (d.endsWith("-phases")) roots.push(`.planning/milestones/${d}`);
  for (const root of roots.filter((r) => existsSync(r))) {
    const dir = readdirSync(root).find((d) => d.startsWith(`QD-${phase}-`));
    if (dir !== undefined) return `${root}/${dir}`;
  }
  return undefined;
};

/** The commit that last changed a file's content, following a move, and the file's path there; a pure move is not a change. */
export const lastEdit = (git, path) => {
  const [commit = "", , at = ""] = git("log", "-1", "--follow", "--diff-filter=AM", "--format=%H", "--name-only", "--", path).split("\n");
  return { commit, at };
};

const main = (extra) => {
  const git = (...args) => execFileSync("git", args, { encoding: "utf8", maxBuffer: 1 << 26 });
  const redo = [];
  for (const phase of ["62", "63", "64", "65", "66", "67", "68", "68.1"]) {
    const dir = phaseDir(phase);
    if (dir === undefined) {
      console.log(`${phase}: no phase directory`);
      continue;
    }
    const { commit, at: doc } = lastEdit(git, `${dir}/${phase}-VERIFICATION.md`);
    if (commit === "") {
      console.log(`${phase}: ${dir}/${phase}-VERIFICATION.md was never committed`);
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
    // A record the milestone archive moved unchanged (an exact rename into `.planning/milestones/`) is not a change to it.
    const archived = new Set(
      git("diff", "-M100%", "--diff-filter=R", "--name-status", `${commit}..HEAD`)
        .split("\n")
        .map((line) => line.split("\t"))
        .filter(([status, from, to]) => status === "R100" && from.startsWith(".planning/phases/") && to.startsWith(".planning/milestones/"))
        .map(([, from]) => from),
    );
    const moved = git("diff", "--no-renames", "--name-only", `${commit}..HEAD`).split("\n").filter((p) => p !== "" && !archived.has(p));
    const changed = new Set([...moved, ...extra]);
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
      "---\ncovered_files:\n  - scripts/cited.mjs\n---\nCites `.planning/phases/QD-62-x/62-01-SUMMARY.md`, `scripts/cited.mjs`, `.changeset/c.md`, `.github/workflows/check.yml` and `.oxlintrc.json`. `CLAUDE.md`, `LICENSE`, `vitest.config.ts`, `assets/a.svg` and `reports/r.md`. See .dotend.json. Or .dashend.json- here.\n",
    ".planning/phases/QD-62-x/62-01-SUMMARY.md": "one\n",
    "scripts/cited.mjs": "export const cited = 1;\n",
    ".changeset/c.md": "one\n",
    ".github/workflows/check.yml": "name: one\n",
    ".oxlintrc.json": "{}\n",
    "CLAUDE.md": "one\n",
    LICENSE: "one\n",
    "vitest.config.ts": "export default {};\n",
    "assets/a.svg": "<svg/>\n",
    "reports/r.md": "one\n",
    ".dotend.json": "{}\n",
    ".dashend.json": "{}\n",
    "src/other.ts": "export const other = 1;\n",
  };
  // The change, what this script must read Phase 62 as, and what 68-stale.mjs reads it as: its defect, but for a deletion
  // (and no verdict once the phase is archived, since it reads only `.planning/phases`).
  const cases = [
    ["a renamed cited file is stale", (git) => git("mv", "scripts/cited.mjs", "scripts/renamed.mjs"), "stale", "current"],
    ["an edited .changeset file is stale", (_git, put) => put(".changeset/c.md", "two\n"), "stale", "current"],
    ["an edited .github file is stale", (_git, put) => put(".github/workflows/check.yml", "name: two\n"), "stale", "current"],
    ["an edited root dotfile is stale", (_git, put) => put(".oxlintrc.json", '{ "rules": {} }\n'), "stale", "current"],
    ["an edited dotfile cited before a sentence-final period is stale", (_git, put) => put(".dotend.json", '{ "a": 1 }\n'), "stale", "current"],
    ["an edited dotfile cited before a trailing hyphen is stale", (_git, put) => put(".dashend.json", '{ "a": 1 }\n'), "stale", "current"],
    ["an edited CLAUDE.md is stale", (_git, put) => put("CLAUDE.md", "two\n"), "stale", "current"],
    ["an edited LICENSE is stale", (_git, put) => put("LICENSE", "two\n"), "stale", "current"],
    ["an edited vitest.config.ts is stale", (_git, put) => put("vitest.config.ts", "export default { a: 1 };\n"), "stale", "current"],
    ["an edited file under assets/ is stale", (_git, put) => put("assets/a.svg", "<svg>2</svg>\n"), "stale", "current"],
    ["an edited file under reports/ is stale", (_git, put) => put("reports/r.md", "two\n"), "stale", "current"],
    ["a deleted cited file is stale", (git) => git("rm", "-q", "scripts/cited.mjs"), "stale", "stale"],
    ["a phase the milestone archive moved unchanged is current", (git) => archive(git), "current", undefined],
    ["a record edited after the archive moved it is stale", (git, put) => {
      archive(git);
      put(".planning/milestones/v1.7-phases/QD-62-x/62-01-SUMMARY.md", "two\n");
    }, "stale", undefined],
    ["an edit to an uncited file is current", (_git, put) => put("src/other.ts", "export const other = 2;\n"), "current", "current"],
  ];
  function archive(git) {
    mkdirSync(join(git("rev-parse", "--show-toplevel").trim(), ".planning/milestones/v1.7-phases"), { recursive: true });
    git("mv", ".planning/phases/QD-62-x", ".planning/milestones/v1.7-phases/QD-62-x");
  }
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

// `68.1-reverify.mjs` imports `phaseDir` and `lastEdit`; only a run of this file checks anything.
if (import.meta.main) {
  if (process.argv[2] === "--self-test") selfTest();
  else main(process.argv.slice(2));
}
