// The check that every existing audit test and the step's neighbours keep their text, apart from the declared regions.
//
// Each file is compared with its text at `phase_base` (the field of `89-mutation-base.json` in this directory). Three kinds:
//   held      every path `git ls-tree -r --name-only <phase_base> -- packages/audit/test` lists, except the declared files that
//             start from the base, and `CodecMade.ts`, `SequenceIntegrity.ts`, `index.ts`, `package.json` and `stryker.audit.mjs`,
//             byte for byte, line endings included. The set is computed from the base and never listed here, so a test the base
//             holds cannot be left out by omission. The leaf, the barrel and the `exports` map stay as they are because those
//             files do not change.
//   declared  three files, each changed only where the phase says it changes them. A region runs from a line starting with its
//             `from` text (inclusive) to the line starting with its `to` text (exclusive), or for `lines: n` the `n` base lines
//             from the anchor; `from: null` is the file start and `to: null` its end; `lead: n` also covers the `n` lines before
//             the anchor, each blank at the base. Each anchor occurs once at the base. The text before the first region, between
//             regions and after the last is held byte for byte and found in order, so a region is never an exemption for a whole
//             file. The kinds of region:
//               kept     the region may change, but keeps each line holding its `kept` text: compared trimmed and at least as
//                        many times as the base has it; a string keeps the lines that contain it, a pattern the lines it matches.
//               becomes  the region is its base text or exactly the `becomes` lines (`[]` removes it).
//               insert   zero base lines, placed `after` or `before` an anchor line that occurs once: either nothing or exactly
//                        the fixed `lines`, or for a `describe` insertion a block that opens with the fixed line, holds exactly the
//                        fixed row titles read as string literals, and ends with `});` and one blank line.
//   born      five files written before the change they pin, each held byte for byte against the one commit that adds it (the
//             characterisation apart from its declared regions); two adding commits fail, and a file with no adding commit passes
//             plain and fails `--all-applied`.
// A held, declared or born file that `git diff -M --name-status <phase_base>` reports as moved or deleted fails, naming both paths
// for a move. A file added under the test directory is not held: new tests are the phase's own.
//
// From the repository root:
//   node <this directory>/89-pinned-check.mjs
//   node <this file> --all-applied   (also requires every declared edit applied and every born file added)
//   node <this file> --self-test
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const DIR = dirname(fileURLToPath(import.meta.url));
const TEST_DIR = "packages/audit/test";

/** Source files held beside the tests: the codec leaf, the sequence check, the barrel, the manifest and the mutation config. */
const HELD_EXTRA = [
  "packages/audit/src/CodecMade.ts",
  "packages/audit/src/SequenceIntegrity.ts",
  "packages/audit/src/index.ts",
  "packages/audit/package.json",
  "stryker.audit.mjs",
];

/** Files held byte for byte against the one commit that added each. */
const BORN = [
  `${TEST_DIR}/AdmissionOrder.characterisation.test.ts`,
  `${TEST_DIR}/BatchReadOnce.test.ts`,
  `${TEST_DIR}/HostBatch.test.ts`,
  `${TEST_DIR}/HostBatch.tst.ts`,
  `${TEST_DIR}/hostBatchFaults.ts`,
];

const FOREIGN = `${TEST_DIR}/ForeignRows.test.ts`;
const RETENTION = `${TEST_DIR}/Retention.test.ts`;
const ORDER = BORN[0];

/** The one inserted `describe` of `ForeignRows.test.ts`: its opening line and the row titles it holds, one per entry point. */
const ADMITS_OPEN = 'describe("each function that takes a batch refuses what the admission step refuses", () => {';
const ADMITS_TITLES = [
  "archiveAuditTrail refuses each batch as the admission step refuses it",
  "verifySequenceIntegrity refuses each rows list as the admission step refuses it",
  "planRetention refuses each batch as the admission step refuses it",
  "planPurge refuses each batch as the admission step refuses it",
];

/** The regions of each declared file, in file order. */
const FOREIGN_REGIONS = [
  { name: "importHostBatch", after: 'import type { AuditEntry } from "../src/AuditEntry.ts";', lines: ['import { admitBatch, admitRows } from "../src/HostBatch.ts";'] },
  { name: "importFaults", after: 'import { decisionRecord } from "./helpers.ts";', lines: ['import { planBatches, rowsLists, writerBatches } from "./hostBatchFaults.ts";'] },
  {
    name: "nowBeforeRows",
    from: '  it("a non-finite now is refused before the rows are read", () => {',
    to: '  it("the rows are refused before a sequence break among them is looked for", () => {',
    becomes: [],
  },
  {
    name: "planOrder",
    from: '  it("planRetention reads now and maxAgeMs before the rows", () => {',
    to: '  it("planRetention takes rows the codec made", () => {',
    becomes: [],
  },
  {
    name: "readFirst",
    from: '  it("the inputs read before the rows are still read first", () => {',
    to: '  it("a list is read as before: rows the codec made, and none", () => {',
    becomes: [],
  },
  {
    name: "keysOrder",
    from: '  it("now is read before the keys, and the keys before the rows", () => {',
    to: '  it("a keyMaterial list is read once, so what is checked is what is written", () => {',
    becomes: [],
  },
  { name: "admits", before: 'describe("a row the codec made cannot be changed afterwards", () => {', open: ADMITS_OPEN, titles: ADMITS_TITLES },
];

/** The base lines 138 to 141: the blank line before the row, then the row's three lines. */
const RETENTION_REGIONS = [{ name: "nowBeforeMaxAge", from: '  it("checks now before maxAgeMs", () => {', lead: 1, lines: 3, becomes: [] }];

const ORDER_REGIONS = [
  {
    name: "import",
    from: 'import { verifiedArchiveFacts } from "../src/ArchiveFacts.ts";',
    to: 'import { decisionRecord, numbered } from "./helpers.ts";',
    becomes: ['import { verifiedArchiveFacts } from "../src/ArchiveFacts.ts";', 'import { admitRows } from "../src/HostBatch.ts";'],
  },
  // `verifiedArchiveFacts` takes admitted rows, so the helper that handed it a list goes with the rewritten direct rows.
  { name: "factsFailure", from: "const factsFailure = (entries: ReadonlyArray<AuditEntry>) =>", lines: 2, lead: 1, becomes: [] },
  {
    name: "spanFlips",
    from: 'describe("the sequence span on refused rows", () => {',
    to: 'describe("what a refusal leaves unread", () => {',
    kept: [/^it(?:\.effect)?\("SF[1-4] /],
  },
  // The rows are rewritten over admitted rows with new titles, so only the block's own line is kept.
  { name: "direct", from: 'describe("verifiedArchiveFacts called directly", () => {', to: null, kept: ['describe("verifiedArchiveFacts called directly", () => {'] },
];

/** Each declared file with its regions, and the text its regions are read from: `base` is `phase_base`, `born` the adding commit. */
const DECLARED = [
  { file: FOREIGN, regions: FOREIGN_REGIONS, from: "base" },
  { file: RETENTION, regions: RETENTION_REGIONS, from: "base" },
  { file: ORDER, regions: ORDER_REGIONS, from: "born" },
];

/** The 1-based number of the first line two texts disagree on, or 0 when they do not. */
const firstDifference = (a, b) => {
  const x = a.split("\n");
  const y = b.split("\n");
  const n = Math.max(x.length, y.length);
  for (let i = 0; i < n; i += 1) if (x[i] !== y[i]) return i + 1;
  return 0;
};

/** The held paths: what `git ls-tree` prints for the test directory at the base, less the declared files, and the held source. Pure. */
const heldFrom = (lsTree, declared) => [...lsTree.split("\n").filter((line) => line !== "" && !declared.includes(line)), ...HELD_EXTRA];

/** The reasons `current` is not `base`, byte for byte. Pure. */
const judgeHeld = (file, base, current) => (base === current ? [] : [`${file}: differs from its base text at line ${firstDifference(current, base)}`]);

/** The reasons a born file is added by `count` commits and not one. */
const judgeAdders = (file, count) => (count > 1 ? [`${file}: ${count} commits add it, not one`] : []);

/**
 * The reasons a born file is not held. `born` is the text at the commit that added it (`undefined`: no commit adds it yet)
 * and `current` the text on disk (`undefined`: no file). Without a commit and a file nothing is held yet, which only
 * `allApplied` refuses.
 */
const judgeBorn = (file, born, current, allApplied) => {
  if (born === undefined && current === undefined) return allApplied ? [`${file} does not exist`] : [];
  if (born === undefined) return allApplied ? [`${file}: no commit adds it`] : [];
  if (current === undefined) return [`${file} was moved or deleted after the commit that added it`];
  return born === current ? [] : [`${file}: differs from the commit that added it at line ${firstDifference(current, born)}`];
};

/** The watched files that `git diff -M --name-status` reports as moved or deleted, each with its reason. Pure. */
const judgeMoves = (files, statusText) =>
  statusText
    .split("\n")
    .map((line) => line.split("\t"))
    .flatMap(([status, from, to]) => {
      if (status === undefined || !files.includes(from)) return [];
      if (status.startsWith("R")) return [{ file: from, reason: `${from} moved to ${to}` }];
      return status === "D" ? [{ file: from, reason: `${from} was deleted` }] : [];
    });

/** The indexes of the lines of `lines` that start with `text`. */
const startingWith = (lines, text) => lines.flatMap((line, i) => (line.startsWith(text) ? [i] : []));

const countOf = (lines, text) => lines.filter((line) => line === text).length;

const sameLines = (a, b) => a.length === b.length && a.every((line, i) => line === b[i]);

/** Whether a kept entry holds `line`: a string by containing it, a pattern by matching the trimmed line. */
const keeps = (entry, line) => (typeof entry === "string" ? line.includes(entry) : entry.test(line.trim()));

const show = (entry) => (typeof entry === "string" ? JSON.stringify(entry) : String(entry));

/** The title of each `it`/`test` row in `lines`, read as a string literal; a title that is no string literal reads as `<not a string literal>`. */
const rowTitles = (lines) =>
  [...lines.join("\n").matchAll(/^[ \t]*(?:it|test)(?:\.\w+)*\(\s*("(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'|`(?:[^`\\$]|\\.)*`|[^\s,]*)/gm)].map(([, literal]) => {
    if (literal.startsWith('"')) return JSON.parse(literal);
    return literal.startsWith("'") || literal.startsWith("`") ? literal.slice(1, -1) : "<not a string literal>";
  });

/** The reasons the lines of an `insert` region are not what the region fixes. A region that holds no line is the base. */
const judgeInsertion = (file, region, own) => {
  if (own.length === 0) return [];
  if (region.lines !== undefined) return sameLines(own, region.lines) ? [] : [`${file}: insert ${region.name} is not the fixed lines`];
  if (own[0] !== region.open) return [`${file}: insert ${region.name} does not open with its fixed line`];
  const found = rowTitles(own);
  if (!sameLines(found, region.titles)) return [`${file}: insert ${region.name} holds the titles ${JSON.stringify(found)}, not ${JSON.stringify(region.titles)}`];
  if (own.length < 3 || own[own.length - 1] !== "" || own[own.length - 2] !== "});") return [`${file}: insert ${region.name} does not end with its closing line and one blank line`];
  return [];
};

/**
 * The reasons `current` is not `base` outside the declared regions, and whether every region holds its edited form. Pure.
 *
 * Each region's anchor lines occur once at the base and in order; the text before the first region, between two regions and
 * after the last is held, found in order in `current`; a `becomes` region is its base text or its fixed lines, an `insert`
 * region is empty or its fixed form, and a region with `kept` text keeps each line holding it, by trimmed text and at least as
 * many times as the base has it.
 */
const judgeRegions = (file, regions, base, current) => {
  const reasons = [];
  const B = base.split("\n");
  const C = current.split("\n");
  const bounds = [];
  for (const region of regions) {
    const anchor = (text) => {
      const found = startingWith(B, text);
      if (found.length === 1) return found[0];
      reasons.push(`${file}: anchor of region ${region.name} occurs ${found.length} times at the base, not once (${JSON.stringify(text)})`);
      return undefined;
    };
    if (region.after !== undefined || region.before !== undefined) {
      const at = anchor(region.after ?? region.before);
      if (at !== undefined) bounds.push({ region, s: at + (region.after === undefined ? 0 : 1), e: at + (region.after === undefined ? 0 : 1) });
      continue;
    }
    const at = region.from === null ? 0 : anchor(region.from);
    const e = at === undefined ? undefined : region.lines !== undefined ? at + region.lines : region.to === null ? B.length : anchor(region.to);
    if (at === undefined || e === undefined) continue;
    const blanks = region.lead ?? 0;
    if (blanks > at || B.slice(at - blanks, at).some((line) => line !== "")) {
      reasons.push(`${file}: region ${region.name} covers ${blanks} line(s) before its anchor, and they are not blank at the base`);
      continue;
    }
    if (at - blanks >= e || e > B.length) {
      reasons.push(`${file}: the region ${region.name} does not start before it ends at the base`);
      continue;
    }
    bounds.push({ region, s: at - blanks, e });
  }
  const refuse = () => ({ reasons, applied: false });
  if (reasons.length > 0 || bounds.length !== regions.length) return refuse();
  for (let k = 1; k < bounds.length; k += 1) {
    if (bounds[k].s < bounds[k - 1].e) reasons.push(`${file}: the region ${bounds[k].region.name} overlaps the one before it at the base`);
  }
  if (reasons.length > 0) return refuse();

  // Where each region's own text lies in `current`: from the end of the held text before it to the start of the held text after.
  const lies = bounds.map(() => ({ from: 0, to: C.length }));
  let cursor = 0;
  const lead = B.slice(0, bounds[0].s);
  if (lead.length > 0) {
    const at = lead.findIndex((line, t) => C[t] !== line);
    if (at !== -1) {
      reasons.push(`${file}: the text before regions differs from its base text at line ${at + 1} (before the region ${bounds[0].region.name})`);
      return refuse();
    }
    cursor = lead.length;
    lies[0].from = cursor;
  }
  for (let k = 1; k < bounds.length; k += 1) {
    const held = B.slice(bounds[k - 1].e, bounds[k].s);
    if (held.length === 0) continue;
    const candidates = C.flatMap((line, i) => (i >= cursor && line === held[0] ? [i] : []));
    const fits = candidates.find((j) => held.every((line, t) => C[j + t] === line));
    if (fits === undefined) {
      const at = candidates[0];
      const where = at === undefined ? `${bounds[k - 1].e + 1} of the base, ${JSON.stringify(held[0].slice(0, 60))} is missing or changed` : `${at + 1 + held.findIndex((line, t) => C[at + t] !== line)}`;
      reasons.push(`${file}: the text between regions differs from its base text at line ${where} (between ${bounds[k - 1].region.name} and ${bounds[k].region.name})`);
      return refuse();
    }
    lies[k - 1].to = fits;
    lies[k].from = fits + held.length;
    cursor = fits + held.length;
  }
  const tail = B.slice(bounds[bounds.length - 1].e);
  const adjacent = (k) => bounds[k - 1].e === bounds[k].s;
  if (tail.length > 0) {
    const at = C.length - tail.length;
    if (at < cursor || tail.some((line, t) => C[at + t] !== line)) {
      reasons.push(`${file}: the text after regions differs from its base text at line ${Math.max(at, 0) + 1 + Math.max(tail.findIndex((line, t) => C[at + t] !== line), 0)} (after the region ${bounds[bounds.length - 1].region.name})`);
      return refuse();
    }
    lies[lies.length - 1].to = at;
  }

  // Two regions with no held text between them share one stretch of `current`: where one ends and the next starts is not
  // recoverable once an edit touches the line between them, so a kept line may sit in either.
  for (let k = 1; k < bounds.length; k += 1) if (adjacent(k)) lies[k].from = lies[k - 1].from;
  for (let k = bounds.length - 1; k >= 1; k -= 1) if (adjacent(k)) lies[k - 1].to = lies[k].to;

  const done = bounds.map(({ region, s, e }, k) => {
    const own = C.slice(lies[k].from, lies[k].to);
    const baseOwn = B.slice(s, e);
    if (region.becomes !== undefined) {
      const made = sameLines(own, region.becomes);
      if (!made && !sameLines(own, baseOwn)) reasons.push(`${file}: region ${region.name} is not the lines it becomes`);
      return made;
    }
    if (region.after !== undefined || region.before !== undefined) {
      reasons.push(...judgeInsertion(file, region, own));
      return own.length > 0;
    }
    if (region.kept !== undefined) {
      const mine = own.map((line) => line.trim());
      for (const entry of region.kept) {
        const lines = baseOwn.filter((line) => keeps(entry, line));
        if (lines.length === 0) reasons.push(`${file}: the kept text ${show(entry)} does not occur in the region ${region.name} at the base`);
        const here = own.filter((line) => keeps(entry, line)).length;
        if (here < lines.length) {
          reasons.push(`${file}: region ${region.name} keeps ${here} lines matching ${show(entry)}, not ${lines.length}`);
          continue;
        }
        for (const line of new Set(lines.map((l) => l.trim()))) {
          const had = baseOwn.filter((l) => l.trim() === line).length;
          if (countOf(mine, line) < had) reasons.push(`${file}: the region ${region.name} dropped a kept line: ${line}`);
        }
      }
    }
    return !sameLines(own, baseOwn);
  });
  return { reasons, applied: reasons.length === 0 && done.every(Boolean) };
};

const selfTest = () => {
  const base = "one()\ntwo()\nthree()\n";
  const equal = judgeHeld("x.test.ts", base, base);
  const byte = judgeHeld("x.test.ts", base, base.replace("two()", "twoo()"));
  const space = judgeHeld("x.test.ts", base, base.replace("two()", "two() "));
  const crlf = judgeHeld("x.test.ts", base, base.replaceAll("\n", "\r\n"));
  const extra = judgeHeld(HELD_EXTRA[0], base, `${base}// edit\n`);
  const first = "line a\nline b\n";
  const second = "line a\nline B\n";
  const status = "M\ta.ts\nR087\tx.test.ts\ty.test.ts\nD\tz.ts\nA\tn.ts\nM\tother.ts\nA\tx.test.ts";
  const moves = judgeMoves(["x.test.ts", "z.ts", "a.ts", "n.ts"], status);
  const declaredFiles = DECLARED.map((d) => d.file);
  const held = heldFrom([`${TEST_DIR}/a.test.ts`, ...declaredFiles, `${TEST_DIR}/support/b.ts`, ""].join("\n"), declaredFiles);
  // A small file with the shape of the real ones: imports, a row to remove, a held row, a place for a block, a kept tail.
  const text = [
    "import a from 'a';",
    "import z from 'z';",
    "",
    "describe('rows', () => {",
    '  it("R1 old", () => {',
    "    one();",
    "  });",
    "",
    '  it("R2 old", () => {',
    "    two();",
    "  });",
    '  it("R3 held", () => {});',
    "});",
    "",
    'describe("tail", () => {',
    '  it("T1 a", () => {',
    "    heard();",
    "  });",
    '  it.effect("T2 b", () => {',
    "    heard();",
    "  });",
    "});",
    "",
  ].join("\n");
  const edit = (from, to) => text.replace(from, to);
  const removed = text.replace('  it("R1 old", () => {\n    one();\n  });\n\n', "");
  const reasonsOf = (regions, current) => judgeRegions("d.test.ts", regions, text, current).reasons;
  const verdict = (regions, current) => judgeRegions("d.test.ts", regions, text, current);
  const removal = [{ name: "R1", from: '  it("R1 ', to: '  it("R2 ', becomes: [] }];
  const oneLeft = text.replace('  it("R1 old", () => {\n    one();\n  });\n\n', "    one();\n");
  const insertion = [{ name: "import", after: "import a from 'a';", lines: ["import b from 'b';"] }];
  const inserted = edit("import a from 'a';\n", "import a from 'a';\nimport b from 'b';\n");
  const leaded = [{ name: "R2", from: '  it("R2 ', lead: 1, lines: 3, becomes: [] }];
  const leadedGone = text.replace('\n\n  it("R2 old", () => {\n    two();\n  });', "");
  const fixed = ["R-1 one", "R-2 two", "R-3 three", "R-4 four"];
  const block = (titles, open = 'describe("fixed", () => {', close = ["});", ""]) => [open, ...titles.map((t) => `  it("${t}", () => {});`), ...close];
  const described = [{ name: "admits", before: 'describe("tail", () => {', open: 'describe("fixed", () => {', titles: fixed }];
  const withBlock = (lines) => edit('describe("tail", () => {', `${lines.join("\n")}\ndescribe("tail", () => {`);
  const keptTail = [{ name: "tail", from: 'describe("tail"', to: null, kept: [/^it(?:\.effect)?\("T[12] /] }];
  const tailEdited = edit("    heard();\n  });\n  it.effect", "    other();\n  });\n  it.effect");
  const tailDropped = edit('  it("T1 a", () => {\n    heard();\n  });\n', "");
  const combo = [...insertion, ...removal, ...keptTail];
  const comboEdited = inserted.replace('  it("R1 old", () => {\n    one();\n  });\n\n', "").replace("    heard();\n  });\n  it.effect", "    other();\n  });\n  it.effect");
  const betweenChanged = comboEdited.replace('it("R3 held"', 'it("R3 changed"');
  const beforeChanged = text.replace("import z from 'z';", "import y from 'y';");
  const missing = reasonsOf([{ name: "R9", from: '  it("R9 ', to: '  it("R2 ', becomes: [] }], text);
  const twice = reasonsOf([{ name: "dup", from: "  });", to: '  it("R2 ', becomes: [] }], text);
  const reversed = reasonsOf([{ name: "back", from: '  it("R3 ', to: '  it("R1 ', becomes: [] }], text);
  const overlap = reasonsOf([{ name: "one", from: '  it("R1 ', to: '  it("R3 ', becomes: [] }, { name: "two", from: '  it("R2 ', to: '  it("R3 ', becomes: [] }], text);
  const noKept = reasonsOf([{ name: "tail", from: 'describe("tail"', to: null, kept: ["law 9:"] }], text);
  const noLead = reasonsOf([{ name: "R3", from: '  it("R3 ', lead: 1, lines: 1, becomes: [] }], text);
  const real = DECLARED.every((d) => new Set(d.regions.map((r) => r.name)).size === d.regions.length);
  const oneForm = [...FOREIGN_REGIONS, ...RETENTION_REGIONS, ...ORDER_REGIONS].every((r) => [r.becomes !== undefined, r.kept !== undefined, r.after !== undefined || r.before !== undefined].filter(Boolean).length === 1);
  const cases = [
    ["a held file that equals its base passes", equal.length === 0],
    ["a held file with one changed byte fails, naming the file and the line", byte.join() === "x.test.ts: differs from its base text at line 2"],
    ["a whitespace-only change in a held file fails", space.some((r) => r.startsWith("x.test.ts: differs"))],
    ["a line-ending change in a held file fails", crlf.some((r) => r.startsWith("x.test.ts: differs"))],
    ["a changed held source file fails, naming it", extra.join() === `${HELD_EXTRA[0]}: differs from its base text at line 4`],
    ["a held file reported as renamed fails, naming both paths", moves.some((m) => m.file === "x.test.ts" && m.reason === "x.test.ts moved to y.test.ts")],
    ["a held file reported as deleted fails", moves.some((m) => m.file === "z.ts" && m.reason === "z.ts was deleted")],
    ["a file that was only modified or added is not reported", moves.length === 2],
    ["the held set is what the base lists less the declared files, and the held source files", held.join() === [`${TEST_DIR}/a.test.ts`, `${TEST_DIR}/support/b.ts`, ...HELD_EXTRA].join()],
    ["a file added under the test directory, absent from the base listing, is not held", !heldFrom(`${TEST_DIR}/a.test.ts\n`, []).includes(`${TEST_DIR}/new.test.ts`)],
    ["a born file equal to its adding commit passes", judgeBorn("b.ts", "t", "t", true).length === 0],
    ["a born file changed after its adding commit fails", judgeBorn("b.ts", first, second, false).join() === "b.ts: differs from the commit that added it at line 2"],
    ["a born file that is gone fails", judgeBorn("b.ts", "t", undefined, false).some((r) => r.includes("moved or deleted"))],
    ["an absent born file passes plain", judgeBorn("b.ts", undefined, undefined, false).length === 0],
    ["an absent born file fails when everything is applied", judgeBorn("b.ts", undefined, undefined, true).join() === "b.ts does not exist"],
    ["a born file no commit adds passes plain and fails when everything is applied", judgeBorn("b.ts", undefined, "t", false).length === 0 && judgeBorn("b.ts", undefined, "t", true).join() === "b.ts: no commit adds it"],
    ["a born file added by two commits fails", judgeAdders("b.ts", 2).join() === "b.ts: 2 commits add it, not one"],
    ["a born file added by one commit, or none, passes", judgeAdders("b.ts", 1).length === 0 && judgeAdders("b.ts", 0).length === 0],
    ["the phase holds five born files and five held source files, each once", BORN.length === 5 && new Set(BORN).size === 5 && new Set(HELD_EXTRA).size === 5],
    ["a declared file equal to its base passes and is not applied", verdict(combo, text).reasons.length === 0 && !verdict(combo, text).applied],
    ["a declared file with every region edited passes and is applied", verdict(combo, comboEdited).reasons.length === 0 && verdict(combo, comboEdited).applied],
    ["a removal region that is gone passes and reads as applied", verdict(removal, removed).reasons.length === 0 && verdict(removal, removed).applied],
    ["a removal region with one line left fails", reasonsOf(removal, oneLeft).join() === "d.test.ts: region R1 is not the lines it becomes"],
    ["a removal region left as its base text passes and is not applied", verdict(removal, text).reasons.length === 0 && !verdict(removal, text).applied],
    ["an insertion of the fixed line passes and reads as applied", verdict(insertion, inserted).reasons.length === 0 && verdict(insertion, inserted).applied],
    ["an insertion with an extra import fails", reasonsOf(insertion, edit("import a from 'a';\n", "import a from 'a';\nimport b from 'b';\nimport c from 'c';\n")).join() === "d.test.ts: insert import is not the fixed lines"],
    ["an insertion with another import fails", reasonsOf(insertion, edit("import a from 'a';\n", "import a from 'a';\nimport c from 'c';\n")).join() === "d.test.ts: insert import is not the fixed lines"],
    ["an import added beside the insertion, in the held text, fails", reasonsOf(insertion, inserted.replace("import z from 'z';", "import z from 'z';\nimport c from 'c';")).some((r) => r.includes("the text after regions differs"))],
    ["a lead of blank lines is removed with its row", verdict(leaded, leadedGone).reasons.length === 0 && verdict(leaded, leadedGone).applied],
    ["a lead of blank lines left behind fails", reasonsOf(leaded, leadedGone.replace('  });\n  it("R3', '  });\n\n  it("R3')).join() === "d.test.ts: region R2 is not the lines it becomes"],
    ["a lead line that is not blank at the base fails", noLead.join() === 'd.test.ts: region R3 covers 1 line(s) before its anchor, and they are not blank at the base'],
    ["a block with exactly the fixed rows passes and reads as applied", verdict(described, withBlock(block(fixed))).reasons.length === 0 && verdict(described, withBlock(block(fixed))).applied],
    ["the block absent passes and is not applied", verdict(described, text).reasons.length === 0 && !verdict(described, text).applied],
    ["a block with a fifth row fails, naming the titles", reasonsOf(described, withBlock(block([...fixed, "R-5 five"]))).some((r) => r.includes("holds the titles") && r.includes("R-5 five"))],
    ["a block with three rows fails", reasonsOf(described, withBlock(block(fixed.slice(0, 3)))).some((r) => r.includes("holds the titles"))],
    ["a block with a renamed title fails", reasonsOf(described, withBlock(block([fixed[0], "R-2 renamed", fixed[2], fixed[3]]))).some((r) => r.includes("holds the titles"))],
    ["a block with its opening line changed fails", reasonsOf(described, withBlock(block(fixed, 'describe("other", () => {'))).join() === "d.test.ts: insert admits does not open with its fixed line"],
    ["a block with no blank line after it fails", reasonsOf(described, withBlock(block(fixed, undefined, ["});"]))).some((r) => r.includes("does not end with its closing line"))],
    ["a block with two blank lines after it fails", reasonsOf(described, withBlock(block(fixed, undefined, ["});", "", ""]))).some((r) => r.includes("does not end with its closing line"))],
    ["a title that is no string literal reads as such", rowTitles(["  it(name, () => {});", "  it.effect('a b', () => {});", '  it("c \\" d", () => {});']).join("|") === "<not a string literal>|a b|c \" d"],
    ["a kept region edited but keeping its titles passes and reads as applied", verdict(keptTail, tailEdited).reasons.length === 0 && verdict(keptTail, tailEdited).applied],
    ["a kept region as its base text passes and is not applied", verdict(keptTail, text).reasons.length === 0 && !verdict(keptTail, text).applied],
    ["a kept region with one title line dropped fails, naming the count", reasonsOf(keptTail, tailDropped).join() === "d.test.ts: region tail keeps 1 lines matching /^it(?:\\.effect)?\\(\"T[12] /, not 2"],
    ["a kept text that does not occur at the base fails", noKept.some((r) => r.includes("does not occur in the region tail at the base"))],
    ["a change in the held text between two regions fails, naming the line", reasonsOf(combo, betweenChanged).some((r) => r.includes("the text between regions differs from its base text at line") && r.includes("between R1 and tail"))],
    ["a change before the first region fails, naming the line", reasonsOf(removal, beforeChanged).join() === "d.test.ts: the text before regions differs from its base text at line 2 (before the region R1)"],
    ["a change after the last region fails", reasonsOf([{ name: "end", from: "describe('rows'", to: 'describe("tail"' }], text.replace('describe("tail", () => {', 'describe("tail", () => { ')).some((r) => r.includes("the text after regions differs"))],
    ["a region anchor missing at the base fails", missing.some((r) => r.includes("anchor of region R9 occurs 0 times at the base, not once"))],
    ["a region anchor occurring more than once at the base fails", twice.some((r) => r.includes("anchor of region dup occurs 4 times"))],
    ["a region that ends before it starts fails", reversed.some((r) => r.includes("does not start before it ends"))],
    ["two regions that overlap at the base fail", overlap.some((r) => r.includes("overlaps the one before it"))],
    ["each declared file names its regions once and reads from a text its adding commit or the base holds", real && DECLARED.length === 3 && DECLARED.every((d) => d.from === "base" || BORN.includes(d.file))],
    ["the declared forms are the ones the phase fixes: seven, one and four regions, the block with four titles", FOREIGN_REGIONS.length === 7 && RETENTION_REGIONS.length === 1 && ORDER_REGIONS.length === 4 && ADMITS_TITLES.length === 4 && FOREIGN_REGIONS.filter((r) => r.becomes?.length === 0).length === 4],
    ["each declared region has exactly one of the forms becomes, kept and insert", oneForm],
  ];
  const failed = cases.filter(([, passed]) => !passed).map(([name]) => name);
  if (failed.length > 0) {
    process.stderr.write(`self-test failed: ${failed.join("; ")}\n`);
    process.exit(1);
  }
  process.stdout.write(`self-test: ${cases.length} passed\n`);
};

/** The text of `file` at `rev`, or `undefined` when it has none there. */
const showAt = (rev, file) => {
  try {
    return execFileSync("git", ["show", `${rev}:${file}`], { encoding: "utf8", maxBuffer: 1 << 26, stdio: ["ignore", "pipe", "ignore"] });
  } catch {
    return undefined;
  }
};

const git = (...args) => execFileSync("git", args, { encoding: "utf8", maxBuffer: 1 << 26 });
const nonEmpty = (text) => text.split("\n").filter((l) => l !== "");
const textOf = (file) => (existsSync(file) ? readFileSync(file, "utf8") : undefined);

/** The phase base recorded beside this file, or a refusal. */
const baseOf = () => {
  try {
    const recorded = JSON.parse(readFileSync(join(DIR, "89-mutation-base.json"), "utf8")).phase_base;
    if (typeof recorded === "string" && recorded !== "") return recorded;
  } catch {
    // Falls through to the refusal below.
  }
  process.stderr.write("no phase_base recorded\n");
  process.exit(1);
};

const run = (allApplied) => {
  const base = baseOf();
  const reasons = [];
  const declared = DECLARED.map((d) => d.file);
  const held = heldFrom(git("ls-tree", "-r", "--name-only", base, "--", TEST_DIR), declared);
  if (held.length < HELD_EXTRA.length + 3) {
    process.stderr.write(`${base} lists no file under ${TEST_DIR}: the held set is empty\n`);
    process.exit(1);
  }
  const moves = judgeMoves([...held, ...declared, ...BORN], git("diff", "-M", "--name-status", base, "--", TEST_DIR, ...HELD_EXTRA));
  reasons.push(...moves.map(({ reason }) => reason));
  const gone = new Set(moves.map(({ file }) => file));
  for (const file of held) {
    if (gone.has(file)) continue;
    const baseText = showAt(base, file);
    if (baseText === undefined) {
      reasons.push(`${file} does not exist at the base`);
      continue;
    }
    const current = textOf(file);
    if (current === undefined) {
      reasons.push(`${file} does not exist`);
      continue;
    }
    reasons.push(...judgeHeld(file, baseText, current));
  }
  let appliedCount = 0;
  /** Judges the regions of a declared file against its base text, and counts it applied when every region holds its edited form. */
  const judgeDeclared = (spec, baseText, current) => {
    const { reasons: found, applied } = judgeRegions(spec.file, spec.regions, baseText, current);
    reasons.push(...found);
    if (found.length > 0) return;
    if (applied) appliedCount += 1;
    else if (allApplied) reasons.push(`${spec.file}: its declared edit is not applied`);
  };
  for (const spec of DECLARED.filter((d) => d.from === "base" && !gone.has(d.file))) {
    const baseText = showAt(base, spec.file);
    const current = textOf(spec.file);
    if (baseText === undefined || current === undefined) reasons.push(`${spec.file} does not exist${baseText === undefined ? " at the base" : ""}`);
    else judgeDeclared(spec, baseText, current);
  }
  let born = 0;
  for (const file of BORN) {
    const adders = nonEmpty(git("log", "--diff-filter=A", "--format=%H", `${base}..HEAD`, "--", file));
    const many = judgeAdders(file, adders.length);
    reasons.push(...many);
    if (many.length > 0) continue;
    const bornText = adders.length === 1 ? showAt(adders[0], file) : undefined;
    const current = textOf(file);
    const spec = DECLARED.find((d) => d.file === file);
    const found = judgeBorn(file, bornText, spec !== undefined && bornText !== undefined && current !== undefined ? bornText : current, allApplied);
    reasons.push(...found);
    if (found.length === 0 && bornText !== undefined) born += 1;
    if (spec !== undefined && found.length === 0 && bornText !== undefined && current !== undefined && !gone.has(file)) judgeDeclared(spec, bornText, current);
  }
  if (reasons.length > 0) {
    process.stderr.write(`${reasons.join("\n")}\n`);
    process.exit(1);
  }
  process.stdout.write(`pinned: ${held.length} files hold their base text, ${born} of ${BORN.length} born files held, ${appliedCount} of ${DECLARED.length} declared edits applied\n`);
};

if (process.argv.includes("--self-test")) selfTest();
else run(process.argv.includes("--all-applied"));
