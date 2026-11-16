// The base experiment of Phase 51 (ARCH-98, D-10): every single-tag arity move in Decision.ts's
// trace shape, then three childrenOf arm edits in Policy.ts, each type-checked and tested.
//
// Run from the repository root on the untouched phase base, after TraceShape.test.ts exists:
//   node .planning/phases/QD-51-policy-tag-arity-stated-once/tools/moves.mjs
// It writes base-experiment/moves.tsv and base-experiment/not-to-many.patch beside this folder,
// restores every file it edits on every exit, a caught SIGINT, SIGTERM or SIGHUP included (not SIGKILL:
// then `git checkout -- packages/core/src`), and exits 1 when a child is killed by a signal, 2 before
// editing anything when the tree is not the base it expects, 3 when packages/core/src is not clean afterwards.
import cp from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import p from "node:path";

const OUT = p.join(p.dirname(new URL(import.meta.url).pathname), "..", "base-experiment");
const DEC = "packages/core/src/Decision.ts";
const POL = "packages/core/src/Policy.ts";
const TESTS = ["TraceShape", "Decision", "Policy", "Explanation"].map(
  (n) => `packages/core/test/${n}.test.ts`,
);
const git = (...a) => cp.execFileSync("git", a, { encoding: "utf8" });
const dirty = () =>
  git("status", "--porcelain", "--untracked-files=all", "--", "packages/core/src").trim();

if (dirty()) {
  console.error("packages/core/src is not clean: " + dirty());
  process.exit(2);
}
for (const t of TESTS) {
  if (!fs.existsSync(t)) {
    console.error("missing " + t);
    process.exit(2);
  }
}
const base = fs.readFileSync(DEC, "utf8");
const pbase = fs.readFileSync(POL, "utf8");
const leafM = /const leafTags = \[\n([\s\S]*?)\] as const;/.exec(base);
const wrapM = /Match\.whenOr\(([^)]*?), \(\): TraceShape => "Wrapper"\)/.exec(base);
const manyM = /Match\.whenOr\(([^)]*?), \(\): TraceShape => "Many"\)/.exec(base);
if (!leafM || !wrapM || !manyM) {
  console.error("not the base Decision.ts: the leaf list or a whenOr line is missing");
  process.exit(2);
}
const names = (s) => [...s.matchAll(/"(\w+)"/g)].map((m) => m[1]);
const lists = { Leaf: names(leafM[1]), Wrapper: names(wrapM[1]), Many: names(manyM[1]) };
const render = (L) =>
  base
    .replace(leafM[0], "const leafTags = [\n" + L.Leaf.map((t) => `  "${t}",\n`).join("") + "] as const;")
    .replace(wrapM[0], "Match.whenOr(" + L.Wrapper.map((t) => `"${t}"`).join(", ") + ', (): TraceShape => "Wrapper")')
    .replace(manyM[0], "Match.whenOr(" + L.Many.map((t) => `"${t}"`).join(", ") + ', (): TraceShape => "Many")');
if (render(lists) !== base) {
  console.error("the renderer does not reproduce the base Decision.ts");
  process.exit(2);
}
const total = Object.values(lists).flat().length;
if (total !== 16) {
  console.error("expected 16 tags across the three lists, found " + total);
  process.exit(2);
}
const ARMS = [
  ["Not", "    Not: (p) => [p.policy],\n", "    Not: () => [],\n"],
  ["Not", "    Not: (p) => [p.policy],\n", "    Not: (p) => [p.policy, p.policy],\n"],
  ["AllOf", "    AllOf: (p) => p.policies,\n", "    AllOf: () => [],\n"],
];
for (const [, from] of ARMS) {
  if (!pbase.includes(from)) {
    console.error("childrenOf arm not found in Policy.ts: " + from.trim());
    process.exit(2);
  }
}

const restore = () => {
  fs.writeFileSync(DEC, base);
  fs.writeFileSync(POL, pbase);
};
// spawnSync blocks the event loop, so a signal sent to this process is held until the loop yields: `tick`
// after each measurement lets a caught SIGINT, SIGTERM or SIGHUP stop the run there. A child's own signal
// (a Ctrl-C reaches the child too) is checked as it returns. Every exit path restores through the exit
// listener. SIGKILL cannot be caught: after one, run `git checkout -- packages/core/src`.
process.on("exit", restore);
for (const sig of ["SIGINT", "SIGTERM", "SIGHUP"]) process.on(sig, () => process.exit(128 + os.constants.signals[sig]));
const tick = () => new Promise((resolve) => setImmediate(resolve));
const run = (cmd, args) => {
  const r = cp.spawnSync(cmd, args, { encoding: "utf8" });
  if (r.signal) {
    console.error(`${cmd} was killed by ${r.signal}; restoring packages/core/src and stopping`);
    process.exit(1);
  }
  return r;
};

const measure = () => {
  const tsc = run("node_modules/.bin/tsc", ["-p", "tsconfig.test.json"]);
  const json = p.join(os.tmpdir(), `qadi-51-moves-${process.pid}.json`);
  run("node_modules/.bin/vitest", ["run", "--project", "core", "--reporter=json", `--outputFile=${json}`, ...TESTS]);
  const j = JSON.parse(fs.readFileSync(json, "utf8"));
  const failed = TESTS.map((t) => {
    const r = j.testResults.find((x) => x.name.endsWith(t));
    if (!r) return "absent";
    const n = r.assertionResults.filter((a) => a.status === "failed").length;
    return n === 0 && r.status === "failed" ? "file-failed" : n;
  });
  const firstError = (tsc.stdout.split("\n").find((l) => l.includes("error TS")) || "").trim();
  return [tsc.status, ...failed, firstError];
};

fs.mkdirSync(OUT, { recursive: true });
const header = ["kind", "subject", "edit", "tsc_exit"];
const rows = [[...header, ...TESTS.map((t) => p.basename(t, ".test.ts") + "_failed"), "first_tsc_error"].join("\t")];
try {
  rows.push(["control", "-", "none", ...measure()].join("\t"));
  for (const from of ["Leaf", "Wrapper", "Many"]) {
    for (const tag of lists[from]) {
      for (const to of ["Leaf", "Wrapper", "Many"].filter((s) => s !== from)) {
        const L = { Leaf: [...lists.Leaf], Wrapper: [...lists.Wrapper], Many: [...lists.Many] };
        L[from] = L[from].filter((t) => t !== tag);
        L[to] = [...L[to], tag];
        fs.writeFileSync(DEC, render(L));
        if (tag === "Not" && to === "Many") {
          fs.writeFileSync(p.join(OUT, "not-to-many.patch"), git("diff", "--", DEC));
        }
        rows.push(["move", tag, `${from}->${to}`, ...measure()].join("\t"));
        fs.writeFileSync(DEC, base);
        await tick();
      }
    }
  }
  for (const [tag, from, to] of ARMS) {
    fs.writeFileSync(POL, pbase.replace(from, to));
    rows.push(["arm", tag, to.trim(), ...measure()].join("\t"));
    fs.writeFileSync(POL, pbase);
    await tick();
  }
} finally {
  restore();
}
fs.writeFileSync(p.join(OUT, "moves.tsv"), rows.join("\n") + "\n");
console.log(rows.join("\n"));
if (dirty()) {
  console.error("packages/core/src not restored: " + dirty());
  process.exit(3);
}
