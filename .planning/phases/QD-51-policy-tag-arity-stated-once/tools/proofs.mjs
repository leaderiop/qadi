// Phase 51's after-change proofs (ARTY-02, D-05, D-10): the base experiment's edit no longer applies, and
// every arity move in the one place it now lives fails to compile, except the two documented gaps, each of
// which is caught at another named place.
//
// Run from the repository root, on the finished tree (51-03 Task 2 onwards), nothing else heavy running:
//   node .planning/phases/QD-51-policy-tag-arity-stated-once/tools/proofs.mjs
// Prints a markdown table (copy it into the SUMMARY) and exits 0 when every row is as expected, 1 when a
// row is not, 2 before editing anything when an edit's text is missing, 3 when src is not restored.
import cp from "node:child_process";
import fs from "node:fs";
import p from "node:path";

const D = p.join(p.dirname(new URL(import.meta.url).pathname), "..");
const ARI = "packages/core/src/PolicyArity.ts";
const POL = "packages/core/src/Policy.ts";
const SRC = [ARI, POL];
const dirty = () =>
  cp.execFileSync("git", ["status", "--porcelain", "--untracked-files=all", "--", "packages/core/src"], { encoding: "utf8" }).trim();
if (dirty()) {
  console.error("packages/core/src is not clean: " + dirty());
  process.exit(2);
}
const orig = Object.fromEntries(SRC.map((f) => [f, fs.readFileSync(f, "utf8")]));

// [what, file, from, to, expectation]; an expectation is a TS message fragment some error must carry,
// "any" (some error), or "compiles" (exit 0) with the test file that must then fail.
const PROOFS = [
  ["record: Not Wrapper -> Many (the base experiment's move)", ARI, '  Not: "Wrapper",\n', '  Not: "Many",\n', "is not assignable to type 'never'"],
  ["record: Obliged Wrapper -> Many", ARI, '  Obliged: "Wrapper",\n', '  Obliged: "Many",\n', "is not assignable to type 'never'"],
  ["record: AllOf Many -> Wrapper", ARI, '  AllOf: "Many",\n', '  AllOf: "Wrapper",\n', "is not assignable to type 'readonly [Policy]'"],
  ["record: Rules Many -> Wrapper", ARI, '  Rules: "Many",\n', '  Rules: "Wrapper",\n', "is not assignable to type 'readonly [Policy]'"],
  ["record: Not Wrapper -> Leaf", ARI, '  Not: "Wrapper",\n', '  Not: "Leaf",\n', "is not assignable to type 'readonly []'"],
  ["record: HasRole Leaf -> Wrapper", ARI, '  HasRole: "Leaf",\n', '  HasRole: "Wrapper",\n', "is not assignable to type 'readonly [Policy]'"],
  ["record: HasRole Leaf -> Many (childrenOf's gap; LeafPolicy and its readers refuse it)", ARI, '  HasRole: "Leaf",\n', '  HasRole: "Many",\n', "any"],
  ["record: HasRole removed", ARI, '  HasRole: "Leaf",\n', "", "any"],
  ["record: an unknown tag added", ARI, '  Rules: "Many",\n', '  Rules: "Many",\n  Bogus: "Leaf",\n', "any"],
  ["record: an unknown arity word", ARI, '  Not: "Wrapper",\n', '  Not: "Wrap",\n', "any"],
  ["childrenOf arm: Not returns none", POL, "    Not: (p) => [p.policy],\n", "    Not: () => [],\n", "is not assignable to type 'readonly [Policy]'"],
  ["childrenOf arm: Not returns two", POL, "    Not: (p) => [p.policy],\n", "    Not: (p) => [p.policy, p.policy],\n", "is not assignable to type 'readonly [Policy]'"],
  ["childrenOf arm: AllOf returns none (a Many may be empty; Policy.test.ts's lockstep refuses it)", POL, "    AllOf: (p) => p.policies,\n", "    AllOf: () => [],\n", "compiles:packages/core/test/Policy.test.ts"],
];
for (const [what, file, from] of PROOFS) {
  if (!orig[file].includes(from)) {
    console.error(`${what}: the text to edit is not in ${file}: ${JSON.stringify(from)}`);
    process.exit(2);
  }
}

const restore = () => {
  for (const f of SRC) fs.writeFileSync(f, orig[f]);
};
process.on("SIGINT", () => {
  restore();
  process.exit(130);
});

const tsc = () => {
  const r = cp.spawnSync("node_modules/.bin/tsc", ["-p", "tsconfig.test.json"], { encoding: "utf8" });
  const errors = r.stdout.split("\n").filter((l) => l.includes("error TS"));
  return { status: r.status, errors };
};
const failing = (test) =>
  cp.spawnSync("node_modules/.bin/vitest", ["run", "--project", "core", test], { encoding: "utf8" }).status !== 0;

const rows = ["| Edit | tsc exit | Error (the expected one, else the first) | As expected |", "|---|---|---|---|"];
let bad = 0;
const row = (what, status, first, ok) => {
  if (!ok) bad++;
  rows.push(`| ${what} | ${status} | ${first.replace(/\|/g, "\\|")} | ${ok ? "yes" : "NO"} |`);
};
try {
  const apply = cp.spawnSync("git", ["apply", "--check", p.join(D, "base-experiment", "not-to-many.patch")], { encoding: "utf8" });
  row(
    "the base experiment's patch (Not under Many in Decision.ts)",
    "-",
    `git apply --check exit ${apply.status}: ${(apply.stderr.split("\n")[0] || "").trim()}`,
    apply.status !== 0,
  );
  const control = tsc();
  row("control: no edit", String(control.status), control.errors[0] || "", control.status === 0);
  for (const [what, file, from, to, want] of PROOFS) {
    fs.writeFileSync(file, orig[file].replace(from, to));
    const r = tsc();
    const hit = r.errors.find((e) => e.includes(want));
    const first = (hit || r.errors[0] || "").trim().slice(0, 220);
    let ok;
    if (want.startsWith("compiles:")) {
      ok = r.status === 0 && failing(want.slice("compiles:".length));
    } else if (want === "any") {
      ok = r.status !== 0 && r.errors.length > 0;
    } else {
      ok = r.status !== 0 && r.errors.some((e) => e.includes(want));
    }
    row(what, String(r.status), first, ok);
    fs.writeFileSync(file, orig[file]);
  }
} finally {
  restore();
}
console.log(rows.join("\n"));
if (dirty()) {
  console.error("packages/core/src not restored: " + dirty());
  process.exit(3);
}
if (bad) {
  console.error(`${bad} proof(s) not as expected`);
  process.exit(1);
}
console.log("every proof as expected");
