#!/usr/bin/env node
/**
 * Records the public surface of the built packages and compares two records.
 *
 *   node scripts/surface-diff.mjs snapshot <out.json> [--phase-base <sha>]
 *   node scripts/surface-diff.mjs compare <a.json> <b.json>
 *   node scripts/surface-diff.mjs --self-test
 *
 * For every public package (no `private: true`, the rule `scripts/check-api-surface.mjs`
 * reads) and every entry point of its `exports` map that has a `types` target, it asks the
 * compiler for the module's exports in the built `lib/`, and records each as
 * `{ name, kind }`, where `kind` is `value`, `type` or `both` (`scripts/lib/surface-scan.mjs`
 * says how). `compare` names every added name, removed name and changed kind.
 *
 * Gate 13 (`scripts/check-api-surface.mjs`) counts names, and a name that stops being a
 * value passes it: `export type { AccessDenied } from "./Errors.ts"` leaves the name in
 * the barrel while a consumer's `new AccessDenied()` becomes a compile error, and neither
 * the build nor the packed-package check sees it. This is the check that does, and it is
 * run by hand on a barrel edit. The snapshot is a working file and is deliberately not a
 * gate: names stay gate 13's, and which names are values is each package's
 * `test/surface.test.ts`. `--self-test` is what `pnpm check` runs, because a tool no gate
 * runs rots: it plants one defect of each kind in declarations it writes outside the
 * repository and requires `compare` to name each one.
 *
 * It reads the built `lib/`, so `pnpm build` comes first; a missing entry is a refusal that
 * says so, never an empty package.
 */
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { failureCause, runTypescriptChild } from "./lib/typescript-server-child.mjs";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const SELF = fileURLToPath(import.meta.url);
const SCAN = join(ROOT, "scripts", "lib", "surface-scan.mjs");
/** Bounds one entry's scan; a snapshot of the whole repository takes under a second. */
const SCAN_TIMEOUT_MS = 120_000;

/** A refusal: a message the tool prints and exits 1 on. */
class Refusal extends Error {}
const refuse = (message) => {
  throw new Refusal(`surface-diff: ${message}`);
};

/** Names compare as exact UTF-16 strings, the way `Object.keys` and the checker list them. */
const byName = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

/**
 * The entry points of the public packages under `base`: `{ entry, pkg, key, types }`, where
 * `entry` is the package name plus the `exports` key's subpath, sorted by entry.
 */
const entryPoints = (base) => {
  const found = [];
  for (const dir of readdirSync(join(base, "packages")).sort(byName)) {
    const manifest = join(base, "packages", dir, "package.json");
    if (!existsSync(manifest)) continue;
    const { name, private: isPrivate, exports: map } = JSON.parse(readFileSync(manifest, "utf8"));
    if (isPrivate === true) continue;
    const entries = Object.entries(map ?? {}).filter(([, value]) => typeof value?.types === "string");
    if (entries.length === 0) refuse(`${name}: its exports map has no entry point with a types target`);
    for (const [key, value] of entries) {
      found.push({ entry: name + key.slice(1), pkg: name, key, types: join(base, "packages", dir, value.types) });
    }
  }
  return found.sort((a, b) => byName(a.entry, b.entry));
};

/** One entry's exports through the compiler, as the child prints them. */
const scanEntry = ({ pkg, key, types }, base) => {
  if (!existsSync(types)) refuse(`${pkg} ${key}: ${relative(base, types)} is missing; run pnpm build`);
  let out;
  try {
    out = runTypescriptChild(SCAN, [types], { timeoutMs: SCAN_TIMEOUT_MS });
  } catch (error) {
    return refuse(`${pkg} ${key}: ${failureCause(error, SCAN_TIMEOUT_MS)}`);
  }
  return JSON.parse(out).exports;
};

/** `{ names, count, both }` of a package entry's sorted export list. */
const summarise = (names) => ({ names, count: names.length, both: names.filter((n) => n.kind === "both").length });

/** The snapshot of every public entry point under `base`, without its provenance fields. */
const snapshotOf = (base) => {
  const entries = {};
  for (const point of entryPoints(base)) {
    const names = scanEntry(point, base);
    if (names.length === 0) refuse(`${point.pkg} ${point.key}: the entry exports no name`);
    entries[point.entry] = summarise(names);
  }
  return { entries, total: Object.values(entries).reduce((sum, e) => sum + e.count, 0) };
};

/** JSON with every object's keys sorted and a trailing newline: two runs over one `lib/` are byte-identical. */
const stringify = (value) =>
  `${JSON.stringify(value, (_key, inner) =>
    inner !== null && typeof inner === "object" && !Array.isArray(inner)
      ? Object.fromEntries(Object.entries(inner).sort(([a], [b]) => byName(a, b)))
      : inner,
  2)}\n`;

/**
 * A snapshot as read, with every count recomputed from the lists. A stored figure that
 * disagrees with its list, an unsorted or repeated name, or an entry with no name is a
 * refusal: a hand-edited or truncated file must not compare equal to anything.
 */
const validated = (snapshot, label) => {
  if (snapshot === null || typeof snapshot !== "object" || typeof snapshot.entries !== "object") {
    refuse(`${label}: not a surface snapshot`);
  }
  let total = 0;
  for (const [entry, { names, count, both }] of Object.entries(snapshot.entries)) {
    if (!Array.isArray(names) || names.length === 0) refuse(`${label}: ${entry} has no names`);
    names.forEach((n, i) => {
      if (i > 0 && !(byName(names[i - 1].name, n.name) < 0)) refuse(`${label}: ${entry} lists ${n.name} out of order or twice`);
      if (!["value", "type", "both"].includes(n.kind)) refuse(`${label}: ${entry} ${n.name} has the kind ${n.kind}`);
    });
    const real = summarise(names);
    if (count !== real.count) refuse(`${label}: ${entry} states ${count} names, its list holds ${real.count}`);
    if (both !== real.both) refuse(`${label}: ${entry} states ${both} of kind both, its list holds ${real.both}`);
    total += real.count;
  }
  if (snapshot.total !== total) refuse(`${label}: it states a total of ${snapshot.total}, its entries hold ${total}`);
  return snapshot;
};

/** The differences of `b` against `a`, one line each, sorted by entry then name. */
const compare = (a, b) => {
  const lines = [];
  const entries = [...new Set([...Object.keys(a.entries), ...Object.keys(b.entries)])].sort(byName);
  for (const entry of entries) {
    const before = a.entries[entry];
    const after = b.entries[entry];
    if (before === undefined) {
      lines.push(`ENTRY ${entry} is only in the second snapshot`);
      continue;
    }
    if (after === undefined) {
      lines.push(`ENTRY ${entry} is only in the first snapshot`);
      continue;
    }
    const was = new Map(before.names.map((n) => [n.name, n.kind]));
    const is = new Map(after.names.map((n) => [n.name, n.kind]));
    for (const name of [...new Set([...was.keys(), ...is.keys()])].sort(byName)) {
      if (!is.has(name)) lines.push(`REMOVED ${entry} ${name} (${was.get(name)})`);
      else if (!was.has(name)) lines.push(`ADDED ${entry} ${name} (${is.get(name)})`);
      else if (was.get(name) !== is.get(name)) lines.push(`KIND ${entry} ${name} ${was.get(name)} -> ${is.get(name)}`);
    }
  }
  return lines;
};

const readSnapshot = (path) => validated(JSON.parse(readFileSync(path, "utf8")), path);

// ---------------------------------------------------------------------------
// --self-test: declarations written outside the repository, one planted defect of each kind.
// ---------------------------------------------------------------------------

const IMPL = `export declare class Err { readonly tag: "Err"; }
export declare const Pair: { readonly x: 1 };
export type Pair = typeof Pair;
export interface Plain { readonly a: 1 }
export interface Extra { readonly b: 2 }
export declare const keep: 1;
export declare const $dollar: 2;
export declare const MixedCase: 3;
export declare const mixedCase: 4;
export declare const Spec: 5;
export type Spec = typeof Spec;
`;

/** `index.d.ts` texts of a scratch package: the base, the same text again, and the four planted defects. */
const INDEX = {
  base: `export { Err, Pair, keep, $dollar, MixedCase, mixedCase, type Spec } from "./impl.js";
export type { Plain } from "./impl.js";
`,
  planted: `export type { Err, Pair } from "./impl.js";
export type { Extra } from "./impl.js";
export { keep, $dollar, MixedCase, mixedCase, type Spec } from "./impl.js";
`,
};

const writeScratch = (dir, index, { exportsMap = { ".": { types: "./lib/index.d.ts" } } } = {}) => {
  const pkg = join(dir, "packages", "pkg");
  mkdirSync(join(pkg, "lib"), { recursive: true });
  writeFileSync(join(pkg, "package.json"), JSON.stringify({ name: "@scratch/pkg", exports: exportsMap }));
  writeFileSync(join(pkg, "lib", "impl.d.ts"), IMPL);
  writeFileSync(join(pkg, "lib", "index.d.ts"), index);
  // A private package holds names too, and none of them is recorded.
  const hidden = join(dir, "packages", "hidden");
  mkdirSync(join(hidden, "lib"), { recursive: true });
  writeFileSync(join(hidden, "package.json"), JSON.stringify({ name: "@scratch/hidden", private: true, exports: { ".": { types: "./lib/index.d.ts" } } }));
  writeFileSync(join(hidden, "lib", "index.d.ts"), "export declare const hidden: 1;\n");
  return dir;
};

const namesOf = (snapshot) => snapshot.entries["@scratch/pkg"].names.map((n) => `${n.name}:${n.kind}`);

const selfTest = () => {
  const root = mkdtempSync(join(tmpdir(), "surface-diff-"));
  const failures = [];
  let passed = 0;
  const check = (label, ok, detail = "") => {
    if (ok) passed += 1;
    else failures.push(`${label}${detail === "" ? "" : `: ${detail}`}`);
  };
  const same = (label, got, want) => check(label, JSON.stringify(got) === JSON.stringify(want), `got ${JSON.stringify(got)}, wanted ${JSON.stringify(want)}`);
  const refused = (label, run, text) => {
    try {
      run();
      check(label, false, "nothing was refused");
    } catch (error) {
      check(label, error instanceof Refusal && text.every((t) => error.message.includes(t)), String(error.message));
    }
  };
  try {
    const base = snapshotOf(writeScratch(join(root, "base"), INDEX.base));
    const again = snapshotOf(writeScratch(join(root, "again"), INDEX.base));
    const planted = snapshotOf(writeScratch(join(root, "planted"), INDEX.planted));
    const kinds = (snapshot) => Object.fromEntries(snapshot.entries["@scratch/pkg"].names.map((n) => [n.name, n.kind]));

    // What the scanner reports for each form.
    same("the base lists each name once, ASCII-sorted, with each name's kind", namesOf(base), [
      "$dollar:value", "Err:both", "MixedCase:value", "Pair:both", "Plain:type", "Spec:type", "keep:value", "mixedCase:value",
    ]);
    same("a class and a const-and-type pair exported by name are both", [kinds(base).Err, kinds(base).Pair], ["both", "both"]);
    same("a pair exported with an `export { type X }` specifier is type", kinds(base).Spec, "type");
    check("a private package is not recorded", Object.keys(base.entries).join() === "@scratch/pkg");
    check("the counts are recomputed integers", base.entries["@scratch/pkg"].count === 8 && base.entries["@scratch/pkg"].both === 2 && base.total === 8);

    // The four planted defects, and the identical pair.
    same("an identical pair has no difference", compare(base, again), []);
    same("a class, a pair, a dropped name and an added name are each named", compare(base, planted), [
      "KIND @scratch/pkg Err both -> type",
      "ADDED @scratch/pkg Extra (type)",
      "KIND @scratch/pkg Pair both -> type",
      "REMOVED @scratch/pkg Plain (type)",
    ]);
    same("a snapshot compared with itself, serialised and read back, has no difference", compare(JSON.parse(stringify(base)), base), []);
    check("two snapshots of one lib are byte-identical", stringify(base) === stringify(again));
    same("an entry on one side only is named", compare({ entries: {} }, base), ["ENTRY @scratch/pkg is only in the second snapshot"]);

    // The refusals.
    writeScratch(join(root, "nolib"), INDEX.base);
    rmSync(join(root, "nolib", "packages", "pkg", "lib", "index.d.ts"));
    refused("a package whose built entry is gone is refused", () => snapshotOf(join(root, "nolib")), ["@scratch/pkg .", "is missing", "run pnpm build"]);
    writeScratch(join(root, "empty"), "export {};\n");
    refused("a public entry that exports nothing is refused", () => snapshotOf(join(root, "empty")), ["@scratch/pkg", "exports no name"]);
    refused("a stored count that disagrees with its list is refused", () => validated({ ...base, entries: { "@scratch/pkg": { ...base.entries["@scratch/pkg"], count: 9 } } }, "tampered"), ["states 9 names", "holds 8"]);
    refused("a stored both count that disagrees with its list is refused", () => validated({ ...base, entries: { "@scratch/pkg": { ...base.entries["@scratch/pkg"], both: 1 } } }, "tampered"), ["of kind both"]);
    refused("a stored total that disagrees with its entries is refused", () => validated({ ...base, total: 9 }, "tampered"), ["a total of 9"]);
    refused("a package with zero names in a snapshot is refused", () => validated({ entries: { "@scratch/pkg": { names: [], count: 0, both: 0 } }, total: 0 }, "empty"), ["has no names"]);
    refused("a list out of order is refused", () => validated({ entries: { "@scratch/pkg": summarise([{ name: "b", kind: "value" }, { name: "a", kind: "value" }]) }, total: 2 }, "unsorted"), ["out of order"]);
    writeScratch(join(root, "noentry"), INDEX.base, { exportsMap: { ".": { import: "./lib/index.js" } } });
    refused("a public package with no types entry is refused", () => snapshotOf(join(root, "noentry")), ["no entry point"]);

    // The command line: exit codes, through the script itself.
    const files = { base: join(root, "base.json"), planted: join(root, "planted.json") };
    writeFileSync(files.base, stringify(base));
    writeFileSync(files.planted, stringify(planted));
    const exitOf = (...args) => spawnSync(process.execPath, [SELF, ...args], { cwd: ROOT, encoding: "utf8" });
    const equal = exitOf("compare", files.base, files.base);
    check("compare of a snapshot with itself exits 0", equal.status === 0 && /^surface-diff: equal, 8 exports over 1 entries$/m.test(equal.stdout), equal.stdout + equal.stderr);
    const differs = exitOf("compare", files.base, files.planted);
    check("compare of different snapshots exits 1 naming each difference", differs.status === 1 && differs.stderr.includes("KIND @scratch/pkg Err both -> type") && differs.stderr.includes("REMOVED @scratch/pkg Plain (type)"), differs.stderr);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
  if (failures.length > 0) {
    for (const failure of failures) console.error(`surface-diff self-test: ${failure}`);
    console.error(`surface-diff self-test: ${failures.length} failed, ${passed} passed`);
    process.exit(1);
  }
  console.log(`surface-diff self-test: ${passed} passed`);
};

// ---------------------------------------------------------------------------
// Command line.
// ---------------------------------------------------------------------------

const USAGE = "usage: surface-diff.mjs snapshot <out.json> [--phase-base <sha>] | compare <a.json> <b.json> | --self-test";

const main = (argv) => {
  if (realpathSync(process.cwd()) !== realpathSync(ROOT)) {
    console.error(`surface-diff: run it from the repository root, ${ROOT}`);
    return 1;
  }
  const [mode, ...rest] = argv;
  try {
    if (mode === "--self-test" && rest.length === 0) return selfTest() ?? 0;
    if (mode === "snapshot") {
      const at = rest.indexOf("--phase-base");
      const flagged = at === -1 ? [] : rest.splice(at, 2);
      if (rest.length !== 1 || (at !== -1 && flagged[1] === undefined)) {
        console.error(USAGE);
        return 2;
      }
      const head = execFileSync("git", ["rev-parse", "HEAD"], { cwd: ROOT, encoding: "utf8" }).trim();
      const taken = snapshotOf(ROOT);
      writeFileSync(resolve(rest[0]), stringify({ ...(at === -1 ? {} : { phase_base: flagged[1] }), head, ...taken }));
      console.log(`surface-diff: ${taken.total} exports over ${Object.keys(taken.entries).length} entries, written to ${rest[0]}`);
      return 0;
    }
    if (mode === "compare" && rest.length === 2) {
      const [a, b] = rest.map(readSnapshot);
      const lines = compare(a, b);
      if (lines.length > 0) {
        console.error(lines.join("\n"));
        console.error(`surface-diff: ${lines.length} difference(s)`);
        return 1;
      }
      console.log(`surface-diff: equal, ${a.total} exports over ${Object.keys(a.entries).length} entries`);
      return 0;
    }
    console.error(USAGE);
    return 2;
  } catch (error) {
    if (!(error instanceof Refusal)) throw error;
    console.error(error.message);
    return 1;
  }
};

process.exitCode = main(process.argv.slice(2));
