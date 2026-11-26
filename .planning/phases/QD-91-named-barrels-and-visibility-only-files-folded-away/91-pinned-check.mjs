// The check that every existing test keeps its text through the phase, apart from the import regions the folds declare.
//
// Each file is compared with its text at `phase_base` (the field of `91-mutation-base.json` in this directory). Five kinds:
//   held      every path `git ls-tree -r` lists at the base under `packages/core/test`, `packages/react/test`,
//             `packages/audit/test`, `packages/devtools/test`, `packages/http/test`, `packages/testing/test`,
//             `packages/core/bench` and `features`, except the declared test files, and the five files of HELD_SOURCE, byte for
//             byte, line endings included. The set is computed from the base and never listed here, so a test the base holds
//             cannot be left out by omission. A file added under those directories later is not held: new tests are the
//             phase's own. A held file that is moved or missing is a reason.
//   declared  twenty-six test files and `QadiProvider.tsx`, each changed only on the base lines its regions name. A region is
//             the exact range `[first, last]` of base lines (1-based, inclusive) holding the top-level import declarations that
//             name a deleted module or a module its names move to; a file whose such declarations are not contiguous has one
//             region per run. Each region also names the text its first and last base line start with, so a wrong constant
//             fails here instead of passing. A declared file is judged in two steps: the commit that declares it (found by its
//             exact subject, at most one commit since the base) holds the base text on every line outside the regions, and
//             what replaces a region is top-level import declarations only, read from the syntax tree (a statement, a comment
//             or a blank line there is a reason), and the file at HEAD equals that commit's text byte for byte. A replacement
//             may be longer or shorter than its region: one import line may become several. A region with `comment: true` holds a
//             `//` line comment instead (the one test comment the stale-sweep corrects): what replaces it is one or more `//` line
//             comments and nothing else. Before the commit exists the file is held, as a base file.
//   born      files written by a commit of this phase, each held against the text that commit gave it: the three `surface.test.ts`
//             whole, and `HydrationTarget.tst.ts`, which a later commit amends in its import region only. That region is the span
//             of the born text's top-level import declarations, read from the syntax tree (the file does not exist yet when
//             this script is written). Three optional born kinds are held whole when they exist: the gate registry's collision
//             test and the hydration entry points' test, each added by one commit under its one subject holding only it, and any
//             test file the mutation close adds, under its one subject, in a commit holding only test files and the evidence.
//   earlier   files a previous phase's pinned check holds that this phase edits, each with the exact subjects that may change
//             it: every commit since the base touching such a file must carry one of them.
// A held, declared or born file that `git diff -M --name-status <phase_base>` reports as moved or deleted fails, naming both
// paths for a move.
//
// From the repository root:
//   node <this directory>/91-pinned-check.mjs
//   node <this file> --all-applied   (also requires every declared and amending commit to exist and every required born file to be added)
//   node <this file> --self-test
//
// Shortcuts: the syntax tree comes from `typescript/unstable/sync` through a child process (the way
// `scripts/lib/module-state-scan.mjs` reads a file), over the texts written into a temporary project; the child names no
// type, so a text that does not parse is read as the parser recovers it. It runs once per check for every text a check reads.
// The files an earlier phase holds were read from that phase's script and written here as rows; a later phase that edits
// another file such a script holds adds a row by a reviewed edit.
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { nameServerPids, runTypescriptChild } from "../../../scripts/lib/typescript-server-child.mjs";

const SELF = fileURLToPath(import.meta.url);
const DIR = dirname(SELF);
const NAME = "91-pinned-check.mjs";

/** The directories whose every file at the base is held, less the declared ones. */
const PREFIXES = [
  "packages/core/test",
  "packages/react/test",
  "packages/audit/test",
  "packages/devtools/test",
  "packages/http/test",
  "packages/testing/test",
  "packages/core/bench",
  "features",
];
/** Source held beside the tests: the devtools barrels, the serving declaration, the registry owner and the span declaration. */
const HELD_SOURCE = [
  "packages/devtools/src/index.ts",
  "packages/devtools/src/react/index.ts",
  "packages/core/src/PortServing.ts",
  "packages/react/src/RegistryOwner.ts",
  "packages/core/src/EvaluationSpan.ts",
];

const CORE_TEST = "packages/core/test";
const REACT_TEST = "packages/react/test";
const AUDIT_TEST = "packages/audit/test";
const PROVIDER = "packages/react/src/QadiProvider.tsx";
const LEASE = "packages/react/src/RegistryLease.ts";
const SEQUENCE = "packages/audit/src/SequenceIntegrity.ts";
const AUDIT_INDEX = "packages/audit/src/index.ts";
const EVIDENCE = `.planning/phases/${basename(DIR)}/91-RED-EVIDENCE.md`;

/** The commit subjects, copied byte for byte from the phase's subject table. */
const GATE_SUBJECT = "refactor(91-11): fold the gate registry constructor into the gate writer";
const AUDIT_SUBJECT = "refactor(91-12): fold the sequence check's public home into the archive facts";
const HYDRATION_SUBJECT = "refactor(91-13): fold the hydration entry points into the hydration engine";
const DECODER_SUBJECT = "refactor(91-10): fold the port span decoder into the span machinery";
const SURFACE_SUBJECT = "test(91-04): pin each root's runtime values on the base";
const TARGET_SUBJECT = "feat(91-13): hydrateDecisions takes any value with the hydrate capability";
const GATE_FOLD_TEST_SUBJECT = "test(91-11): hold the gate registry's collision report under its option";
const HYDRATION_FOLD_TEST_SUBJECT = "test(91-14): hold the folded hydration entry points";
const MUTATION_TEST_SUBJECT = "test(91-21): kill the new open mutants of the folded files";
const LEASE_SUBJECT = "docs(91-19): name the registry lease's one caller";
const SWEEP_SUBJECT = "docs(91-19): sweep the deleted paths and the old rule name";
const AUDIT_BARREL_SUBJECT = "refactor(91-09): name the audit barrel's exports per module";

/**
 * The declared files, the exact base lines of each region, and the one commit subject that declares each. `source`: not a
 * test, so it is held through the path-spec of the move check as well.
 */
const DECLARED = [
  {
    file: `${REACT_TEST}/DecisionOutcome.tst.ts`,
    subject: GATE_SUBJECT,
    regions: [
      { first: 14, last: 14, top: "import type { GateRenderState } from \"../src/GateRegistry.ts\";", bottom: "import type { GateRenderState } from \"../src/GateRegistry.ts\";" },
    ],
  },
  {
    file: `${REACT_TEST}/DeveloperSignalReporters.test.tsx`,
    subject: GATE_SUBJECT,
    regions: [
      { first: 56, last: 57, top: "import { gateWriterFor } from \"../src/GateWriter.ts\";", bottom: "import type { GateInstance, GateRenderState } from \"../src/GateRegistry.ts\";" },
    ],
  },
  {
    file: `${REACT_TEST}/GateRegistration.characterisation.test.tsx`,
    subject: GATE_SUBJECT,
    regions: [
      { first: 32, last: 33, top: "import { makeGateRegistry } from \"../src/GateRegistry.ts\";", bottom: "import type { GateInstance, GateRegistry } from \"../src/GateRegistry.ts\";" },
    ],
  },
  {
    file: `${REACT_TEST}/GateRegistry.store.test.ts`,
    subject: GATE_SUBJECT,
    regions: [
      { first: 11, last: 11, top: "import { makeGateRegistry } from \"../src/GateRegistry.ts\";", bottom: "import { makeGateRegistry } from \"../src/GateRegistry.ts\";" },
      { first: 13, last: 14, top: "import type { GateInstance, GateRenderState } from \"../src/GateRegistry.ts\";", bottom: "import { gateWriterFor } from \"../src/GateWriter.ts\";" },
    ],
  },
  {
    file: `${REACT_TEST}/GateRegistry.test.tsx`,
    subject: GATE_SUBJECT,
    regions: [
      { first: 28, last: 28, top: "import { makeGateRegistry } from \"../src/GateRegistry.ts\";", bottom: "import { makeGateRegistry } from \"../src/GateRegistry.ts\";" },
    ],
  },
  {
    file: `${REACT_TEST}/GateWriter.reconcile.test.ts`,
    subject: GATE_SUBJECT,
    regions: [
      { first: 13, last: 21, top: "import { gateWriterFor, reconcile } from \"../src/GateWriter.ts\";", bottom: "import type { GateRenderState } from \"../src/GateRegistry.ts\";" },
    ],
  },
  {
    file: `${REACT_TEST}/GateWriter.test.tsx`,
    subject: GATE_SUBJECT,
    regions: [
      { first: 10, last: 12, top: "import { makeGateRegistry } from \"../src/GateRegistry.ts\";", bottom: "import { gateWriterFor } from \"../src/GateWriter.ts\";" },
      { first: 14, last: 14, top: "import type { GateIdentity, GateWanted, GateWriter } from \"../src/GateWriter.ts\";", bottom: "import type { GateIdentity, GateWanted, GateWriter } from \"../src/GateWriter.ts\";" },
    ],
  },
  {
    file: `${REACT_TEST}/QadiProvider.tst.ts`,
    subject: GATE_SUBJECT,
    regions: [
      { first: 11, last: 11, top: "import type { GateRegistry } from \"../src/GateRegistry.ts\";", bottom: "import type { GateRegistry } from \"../src/GateRegistry.ts\";" },
    ],
  },
  {
    file: `${REACT_TEST}/support/gates.ts`,
    subject: GATE_SUBJECT,
    regions: [
      { first: 10, last: 10, top: "import type { GateRegistry } from \"../../src/GateRegistry.ts\";", bottom: "import type { GateRegistry } from \"../../src/GateRegistry.ts\";" },
    ],
  },
  {
    file: `${REACT_TEST}/support/trees.tsx`,
    subject: GATE_SUBJECT,
    regions: [
      { first: 20, last: 20, top: "import type { GateRegistry } from \"../../src/GateRegistry.ts\";", bottom: "import type { GateRegistry } from \"../../src/GateRegistry.ts\";" },
    ],
  },
  {
    file: `${AUDIT_TEST}/AdmissionOrder.characterisation.test.ts`,
    subject: AUDIT_SUBJECT,
    regions: [
      { first: 24, last: 25, top: "import { verifySequenceIntegrity } from \"../src/SequenceIntegrity.ts\";", bottom: "import { verifiedArchiveFacts } from \"../src/ArchiveFacts.ts\";" },
    ],
  },
  {
    file: `${AUDIT_TEST}/AuditArchive.test.ts`,
    subject: AUDIT_SUBJECT,
    regions: [
      { first: 8, last: 8, top: "import { verifySequenceIntegrity } from \"../src/SequenceIntegrity.ts\";", bottom: "import { verifySequenceIntegrity } from \"../src/SequenceIntegrity.ts\";" },
    ],
  },
  {
    file: `${AUDIT_TEST}/BatchReadOnce.test.ts`,
    subject: AUDIT_SUBJECT,
    regions: [
      { first: 20, last: 20, top: "import { verifySequenceIntegrity } from \"../src/SequenceIntegrity.ts\";", bottom: "import { verifySequenceIntegrity } from \"../src/SequenceIntegrity.ts\";" },
    ],
  },
  {
    file: `${AUDIT_TEST}/ForeignRows.test.ts`,
    subject: AUDIT_SUBJECT,
    regions: [
      { first: 27, last: 27, top: "import { verifySequenceIntegrity } from \"../src/SequenceIntegrity.ts\";", bottom: "import { verifySequenceIntegrity } from \"../src/SequenceIntegrity.ts\";" },
    ],
  },
  {
    file: `${AUDIT_TEST}/RowListAdmission.test.ts`,
    subject: AUDIT_SUBJECT,
    regions: [
      { first: 12, last: 12, top: "import type { ArchiveInputRefusal } from \"../src/ArchiveFacts.ts\";", bottom: "import type { ArchiveInputRefusal } from \"../src/ArchiveFacts.ts\";" },
      { first: 19, last: 19, top: "import { verifySequenceIntegrity } from \"../src/SequenceIntegrity.ts\";", bottom: "import { verifySequenceIntegrity } from \"../src/SequenceIntegrity.ts\";" },
    ],
  },
  {
    file: `${AUDIT_TEST}/SequenceIntegrity.test.ts`,
    subject: AUDIT_SUBJECT,
    regions: [
      { first: 6, last: 6, top: "import { verifySequenceIntegrity } from \"../src/SequenceIntegrity.ts\";", bottom: "import { verifySequenceIntegrity } from \"../src/SequenceIntegrity.ts\";" },
    ],
  },
  {
    file: `${REACT_TEST}/DecisionOutcome.test.ts`,
    subject: HYDRATION_SUBJECT,
    regions: [
      { first: 42, last: 42, top: "import { dehydrateDecisions, hydrateDecisions } from \"../src/Hydration.ts\";", bottom: "import { dehydrateDecisions, hydrateDecisions } from \"../src/Hydration.ts\";" },
      { first: 44, last: 45, top: "import type { ClientDecision } from \"../src/SeededDecision.ts\";", bottom: "import { SeededAllow, SeededDeny, permits } from \"../src/SeededDecision.ts\";" },
    ],
  },
  {
    file: `${REACT_TEST}/Hydration.lifetime.test.ts`,
    subject: HYDRATION_SUBJECT,
    regions: [
      { first: 18, last: 18, top: "import { dehydrateDecisions, hydrateDecisions } from \"../src/Hydration.ts\";", bottom: "import { dehydrateDecisions, hydrateDecisions } from \"../src/Hydration.ts\";" },
    ],
  },
  {
    file: `${REACT_TEST}/Hydration.test.ts`,
    subject: HYDRATION_SUBJECT,
    regions: [
      { first: 34, last: 35, top: "import type { DehydratedDecisions, HydrationDrop } from \"../src/Hydration.ts\";", bottom: "import { dehydrateDecisions, hydrateDecisions, isSeeded } from \"../src/Hydration.ts\";" },
    ],
  },
  {
    file: `${REACT_TEST}/Hydration.tst.ts`,
    subject: HYDRATION_SUBJECT,
    regions: [
      { first: 26, last: 40, top: "import type {", bottom: "import { permits } from \"../src/SeededDecision.ts\";" },
    ],
  },
  {
    file: `${REACT_TEST}/HydrationCounts.test.ts`,
    subject: HYDRATION_SUBJECT,
    regions: [
      { first: 33, last: 34, top: "import type { DehydratedDecisions, HydrationDrop } from \"../src/Hydration.ts\";", bottom: "import { dehydrateDecisions, hydrateDecisions } from \"../src/Hydration.ts\";" },
    ],
  },
  {
    file: `${REACT_TEST}/HydrationPayload.test.ts`,
    subject: HYDRATION_SUBJECT,
    regions: [
      { first: 33, last: 35, top: "import { dehydrateDecisions, hydrateDecisions, isSeeded, permits } from \"../src/Hydration.ts\";", bottom: "import type { DecisionEntry, HydrationDrop } from \"../src/Hydration.ts\";" },
      { first: 37, last: 37, top: "import { PAYLOAD_PRODUCERS } from \"../src/HydrationEngine.ts\";", bottom: "import { PAYLOAD_PRODUCERS } from \"../src/HydrationEngine.ts\";" },
    ],
  },
  {
    file: `${REACT_TEST}/QadiAtoms.test.ts`,
    subject: HYDRATION_SUBJECT,
    regions: [
      { first: 30, last: 30, top: "import { dehydrateDecisions } from \"../src/Hydration.ts\";", bottom: "import { dehydrateDecisions } from \"../src/Hydration.ts\";" },
      { first: 32, last: 32, top: "import { permits } from \"../src/SeededDecision.ts\";", bottom: "import { permits } from \"../src/SeededDecision.ts\";" },
    ],
  },
  {
    file: `${REACT_TEST}/UntrustedSeams.test.ts`,
    subject: HYDRATION_SUBJECT,
    regions: [
      { first: 9, last: 10, top: "import { hydrateDecisions } from \"../src/Hydration.ts\";", bottom: "import type { HydrationDrop } from \"../src/Hydration.ts\";" },
    ],
  },
  {
    file: `${CORE_TEST}/PortSpan.test.ts`,
    subject: DECODER_SUBJECT,
    regions: [
      { first: 19, last: 27, top: "import { decodePortSpan } from \"../src/PortSpanDecode.ts\";", bottom: "} from \"../src/PortSpanEncode.ts\";" },
    ],
  },
  {
    file: PROVIDER,
    subject: GATE_SUBJECT,
    source: true,
    regions: [{ first: 49, last: 49, top: 'import type { GateRegistry } from "./GateRegistry.ts";', bottom: 'import type { GateRegistry } from "./GateRegistry.ts";' }],
  },
  {
    file: `${REACT_TEST}/ServerRender.test.tsx`,
    subject: SWEEP_SUBJECT,
    regions: [{ first: 189, last: 190, comment: true, top: "    // `Hydration.ts` carries no", bottom: "    // Component can call this." }],
  },
];

/** The born files whole, and the one that a later commit amends in its import region. `adds`: the commit adds the file. */
const BORN = [
  { file: `${CORE_TEST}/surface.test.ts`, subject: SURFACE_SUBJECT },
  { file: `${REACT_TEST}/surface.test.ts`, subject: SURFACE_SUBJECT },
  { file: `${AUDIT_TEST}/surface.test.ts`, subject: SURFACE_SUBJECT },
  { file: `${REACT_TEST}/HydrationTarget.tst.ts`, subject: TARGET_SUBJECT, amendments: [HYDRATION_SUBJECT] },
];

/**
 * The born files that may exist later, whole. `file`: exactly that file, added by one commit with its subject holding only it.
 * `anyTest`: every test file the commits with the subject add, in commits holding only such files and the evidence file.
 */
const OPTIONAL_BORN = [
  { file: `${REACT_TEST}/GateRegistryFold.test.ts`, subject: GATE_FOLD_TEST_SUBJECT },
  { file: `${REACT_TEST}/HydrationFold.test.ts`, subject: HYDRATION_FOLD_TEST_SUBJECT },
  { subject: MUTATION_TEST_SUBJECT, anyTest: true },
];
/** The test files a mutation commit may add. */
const MUTATION_TEST_PATH = /^packages\/(?:core|react|audit)\/test\/[^/]+\.test\.tsx?$/;

/**
 * The files an earlier phase's pinned check holds that this phase edits, and the subjects that may change each. Phase 86 holds
 * every react test at its base and the registry lease; phase 89 the sequence check, the audit barrel and five audit tests
 * (two of them born in that phase, one declared); phase 90 every core test at its base.
 */
const EARLIER_HELD = [
  ...[
    "DecisionOutcome.tst.ts",
    "DeveloperSignalReporters.test.tsx",
    "GateRegistration.characterisation.test.tsx",
    "GateRegistry.store.test.ts",
    "GateRegistry.test.tsx",
    "GateWriter.reconcile.test.ts",
    "GateWriter.test.tsx",
    "QadiProvider.tst.ts",
    "support/gates.ts",
    "support/trees.tsx",
  ].map((name) => ({ phase: "86", file: `${REACT_TEST}/${name}`, subjects: [GATE_SUBJECT] })),
  ...[
    "DecisionOutcome.test.ts",
    "Hydration.lifetime.test.ts",
    "Hydration.test.ts",
    "Hydration.tst.ts",
    "HydrationCounts.test.ts",
    "HydrationPayload.test.ts",
    "QadiAtoms.test.ts",
    "UntrustedSeams.test.ts",
  ].map((name) => ({ phase: "86", file: `${REACT_TEST}/${name}`, subjects: [HYDRATION_SUBJECT] })),
  { phase: "86", file: LEASE, subjects: [LEASE_SUBJECT] },
  { phase: "89", file: SEQUENCE, subjects: [AUDIT_SUBJECT] },
  ...[
    "AdmissionOrder.characterisation.test.ts",
    "AuditArchive.test.ts",
    "BatchReadOnce.test.ts",
    "ForeignRows.test.ts",
    "SequenceIntegrity.test.ts",
  ].map((name) => ({ phase: "89", file: `${AUDIT_TEST}/${name}`, subjects: [AUDIT_SUBJECT] })),
  { phase: "89", file: AUDIT_INDEX, subjects: [AUDIT_BARREL_SUBJECT, AUDIT_SUBJECT] },
  { phase: "90", file: `${CORE_TEST}/PortSpan.test.ts`, subjects: [DECODER_SUBJECT] },
];

// ---- pure judges ----

/** The 1-based number of the first line two lists of lines disagree on, or 0 when they do not. */
const firstDifference = (a, b) => {
  const n = Math.max(a.length, b.length);
  for (let i = 0; i < n; i += 1) if (a[i] !== b[i]) return i + 1;
  return 0;
};

/** How many lines of `seg` equal the lines of `C` from index `j`, counting from the start of `seg`. */
const common = (C, seg, j) => {
  let t = 0;
  while (t < seg.length && C[j + t] === seg[t]) t += 1;
  return t;
};

/** The held paths: what `git ls-tree` printed at the base, less the declared test files. Pure. */
const heldFrom = (paths, declaredFiles) => paths.filter((path) => path !== "" && !declaredFiles.includes(path));

/** The reasons `current` is not `base`, byte for byte. Pure. */
const judgeHeld = (file, base, current) =>
  base === current ? [] : [`${file}: differs from its base text at line ${firstDifference(base.split("\n"), current.split("\n")) || 1}`];

/** The reasons a file that two texts may hold is not the text its adding commit gave it. `born` is that text. */
const judgeBorn = (file, born, current) => {
  if (current === undefined) return [`${file} was moved or deleted after the commit that added it`];
  return born === current ? [] : [`${file}: differs from the commit that added it at line ${firstDifference(born.split("\n"), current.split("\n")) || 1}`];
};

/** The reasons a commit subject names the wrong number of commits. */
const judgeSubject = (subject, count) => (count > 1 ? [`${count} commits have the subject: ${subject}`] : []);

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

/** The regions of a declared file that are not well formed on their own: not in order, overlapping, or not a range. */
const judgeRegionShapes = (file, regions) => {
  const reasons = [];
  regions.forEach((r, k) => {
    if (!Number.isInteger(r.first) || !Number.isInteger(r.last) || r.last < r.first) reasons.push(`${file}: region ${k + 1} is not a range of lines`);
    if (k > 0 && r.first <= regions[k - 1].last) reasons.push(`${file}: region ${k + 1} does not start after the region before it`);
  });
  return reasons;
};

/** The regions whose first or last base line does not start with the text the region names. */
const judgeRegionAnchors = (file, regions, B) =>
  regions.flatMap((r, k) => {
    const top = B[r.first - 1];
    const bottom = B[r.last - 1];
    const bad = [];
    if (top === undefined || !top.startsWith(r.top)) bad.push(`${file}: base line ${r.first} (the top of region ${k + 1}) does not start with ${JSON.stringify(r.top)}`);
    if (bottom === undefined || !bottom.startsWith(r.bottom)) bad.push(`${file}: base line ${r.last} (the bottom of region ${k + 1}) does not start with ${JSON.stringify(r.bottom)}`);
    return bad;
  });

/** The base lines held outside the regions, in order: one list before the first region, between each two, and after the last. */
const heldSegments = (B, regions) => {
  const segments = [];
  let from = 0;
  for (const r of regions) {
    segments.push(B.slice(from, r.first - 1));
    from = r.last;
  }
  segments.push(B.slice(from));
  return segments;
};

/**
 * Where the lines `C` hold the segments, in order, with anything in the gaps between them: `{ gaps }`, each gap the
 * `[from, to)` indexes of one region's own lines, or `{ line }`, the 1-based line of `C` where the held text stops matching.
 */
const fit = (C, segments) => {
  const n = segments.length - 1;
  const head = segments[0];
  const tail = segments[n];
  const ph = common(C, head, 0);
  if (ph < head.length) return { line: ph + 1 };
  const end = C.length - tail.length;
  if (end < head.length) return { line: head.length + 1 };
  const pt = common(C, tail, end);
  if (pt < tail.length) return { line: end + pt + 1 };
  const place = (k, cursor) => {
    if (k === n) return [[cursor, end]];
    const seg = segments[k];
    for (let j = cursor; j + seg.length <= end; j += 1) {
      if (common(C, seg, j) !== seg.length) continue;
      const rest = place(k + 1, j + seg.length);
      if (rest !== undefined) return [[cursor, j], ...rest];
    }
    return undefined;
  };
  const gaps = place(1, head.length);
  if (gaps !== undefined) return { gaps };
  let cursor = head.length;
  for (let k = 1; k < n; k += 1) {
    const seg = segments[k];
    let found = -1;
    let best = -1;
    let bestLength = -1;
    for (let j = cursor; j + seg.length <= end; j += 1) {
      const length = common(C, seg, j);
      if (length === seg.length) {
        found = j;
        break;
      }
      if (length > bestLength) {
        bestLength = length;
        best = j;
      }
    }
    if (found < 0) return { line: (best < 0 ? cursor : best + bestLength) + 1 };
    cursor = found + seg.length;
  }
  return { line: cursor + 1 };
};

/** The reasons a text is not the base text outside the regions, and each region's own lines when it is: `{ reasons, gaps }`. */
const regionGaps = (file, regions, base, current) => {
  const C = current.split("\n");
  const found = fit(C, heldSegments(base.split("\n"), regions));
  if (found.gaps === undefined) return { reasons: [`${file}: differs outside its declared lines at line ${found.line}`], gaps: [] };
  return { reasons: [], gaps: found.gaps.map(([from, to]) => C.slice(from, to)) };
};

/** The top-level import declarations of a syntax summary as the 1-based lines they cover, and what lies inside their span. */
const importSpan = (text, syntax) => {
  if (syntax.imports.length === 0) return { start: undefined, end: undefined, bad: [] };
  const start = Math.min(...syntax.imports.map(([s]) => s));
  const end = Math.max(...syntax.imports.map(([, e]) => e));
  const lines = text.split("\n");
  const covered = new Set(syntax.imports.flatMap(([s, e]) => Array.from({ length: e - s + 1 }, (_, i) => s + i)));
  const bad = new Set();
  for (const [s, e] of syntax.others) if (e >= start && s <= end) bad.add(Math.max(s, start));
  for (let n = start; n <= end; n += 1) if (!covered.has(n) && (lines[n - 1] ?? "").trim() !== "") bad.add(n);
  return { start, end, bad: [...bad].sort((a, b) => a - b) };
};

/**
 * The reasons what replaces the regions is not top-level import declarations only. `gaps` are each region's own lines, `parse`
 * reads a list of texts into syntax summaries. An empty gap passes (an import may be dropped); a gap with a statement, a
 * comment or a blank line among its imports fails, naming the region and the line of the gap.
 */
const judgeImportGaps = (file, gaps, parse) => {
  const texts = gaps.filter((gap) => gap.length > 0).map((gap) => gap.join("\n"));
  const summaries = parse(texts);
  const reasons = [];
  let at = 0;
  gaps.forEach((gap, k) => {
    if (gap.length === 0) return;
    const syntax = summaries[at];
    at += 1;
    const covered = new Set(syntax.imports.flatMap(([s, e]) => Array.from({ length: e - s + 1 }, (_, i) => s + i)));
    const others = syntax.others.map(([s]) => s);
    const uncovered = gap.map((_, i) => i + 1).filter((n) => !covered.has(n));
    for (const n of [...new Set([...others, ...uncovered])].sort((a, b) => a - b)) reasons.push(`${file}: line ${n} of what replaces region ${k + 1} is not an import declaration`);
  });
  return reasons;
};

/**
 * The reasons what replaces a comment region is not `//` line comments only. `regions` and `gaps` are the declared regions and
 * the lines that replace each; only a region with `comment: true` is judged here, and an empty gap fails: a comment is
 * corrected, not dropped.
 */
const judgeCommentGaps = (file, regions, gaps) =>
  regions.flatMap((region, k) => {
    if (region.comment !== true) return [];
    const gap = gaps[k] ?? [];
    if (gap.length === 0) return [`${file}: what replaces comment region ${k + 1} is empty`];
    return gap.flatMap((line, i) => (line.trim().startsWith("//") ? [] : [`${file}: line ${i + 1} of what replaces comment region ${k + 1} is not a line comment`]));
  });

/**
 * The reasons a declared file is not as the phase fixes it, and whether its edit is applied. `commit` is the declaring commit's
 * text for the file (`undefined`: no commit yet, so the file is held) and `changed` whether that commit changes the file at all.
 */
const judgeDeclared = (spec, base, commit, changed, current, allApplied, parse) => {
  const { file, regions } = spec;
  if (current === undefined) return { reasons: [`${file} does not exist`], applied: false };
  if (commit === undefined) {
    const held = judgeHeld(file, base, current);
    return { reasons: held.length === 0 && allApplied ? [`${file}: its declared edit is not applied`] : held, applied: false };
  }
  const reasons = [];
  if (!changed) reasons.push(`${file}: the commit that declares it does not change it`);
  const atCommit = regionGaps(file, regions, base, commit);
  reasons.push(...atCommit.reasons);
  if (atCommit.reasons.length === 0) {
    reasons.push(...judgeImportGaps(file, atCommit.gaps.map((gap, k) => (regions[k].comment === true ? [] : gap)), parse));
    reasons.push(...judgeCommentGaps(file, regions, atCommit.gaps));
  }
  if (reasons.length > 0) return { reasons, applied: false };
  const same = judgeBorn(file, commit, current);
  if (same.length > 0) return { reasons: [...same, ...regionGaps(file, regions, base, current).reasons], applied: false };
  return { reasons: [], applied: true };
};

/**
 * The reasons a born file whose import region may move is not its born text outside that region. `born` and `head` are
 * `{ text, syntax }`, `region` the `[first, last]` of the born text, `appended` whether lines may follow the born text.
 */
const judgeBornImports = (file, region, born, head, appended) => {
  const reasons = [];
  const b = importSpan(born.text, born.syntax);
  if (b.start !== region.first || b.end !== region.last) {
    reasons.push(`${file}: its import region is lines ${b.start} to ${b.end} in the commit that added it, not ${region.first} to ${region.last}`);
  }
  for (const n of b.bad) reasons.push(`${file}: line ${n} inside its import region in the commit that added it is not an import declaration`);
  const h = importSpan(head.text, head.syntax);
  if (h.start === undefined) reasons.push(`${file}: has no import declaration`);
  else if (h.start !== region.first) reasons.push(`${file}: its import region starts at line ${h.start}, not ${region.first}`);
  for (const n of h.bad) reasons.push(`${file}: line ${n} inside its import region is not an import declaration`);
  if (reasons.length > 0) return reasons;
  const BL = born.text.split("\n");
  const HL = head.text.split("\n");
  const before = firstDifference(BL.slice(0, region.first - 1), HL.slice(0, region.first - 1));
  if (before > 0) return [`${file}: differs from the commit that added it at line ${before}`];
  const bornTail = BL.slice(region.last);
  const headTail = HL.slice(h.end);
  if (!appended) {
    const at = firstDifference(bornTail, headTail);
    return at === 0 ? [] : [`${file}: differs from the commit that added it at line ${h.end + at}`];
  }
  const kept = bornTail.at(-1) === "" ? bornTail.slice(0, -1) : bornTail;
  const at = firstDifference(kept, headTail.slice(0, kept.length));
  if (at > 0 || headTail.length < bornTail.length || (bornTail.at(-1) === "" && headTail.at(-1) !== "")) {
    return [`${file}: differs from the commit that added it at line ${h.end + (at === 0 ? Math.min(headTail.length, kept.length) + 1 : at)}`];
  }
  return [];
};

/**
 * The reasons a born file that later commits amend in its import region is not as the chain leaves it. `born` is the adding
 * commit's text, `steps` the amendments in order, each `{ subject, text, changed }` (`text` undefined: no such commit yet, which
 * ends the chain there; with `allApplied` that is a reason). The region is the span of the born text's import declarations, and
 * each step holds the text before it outside that span; the file at HEAD equals the last text of the chain.
 */
const judgeBornChain = (file, born, steps, current, allApplied, parse) => {
  const wanted = [born, ...steps.flatMap((s) => (s.text === undefined ? [] : [s.text]))];
  const summaries = parse(wanted);
  const syntaxOf = new Map(wanted.map((t, i) => [t, summaries[i]]));
  const span = importSpan(born, syntaxOf.get(born));
  if (span.start === undefined) return [`${file}: has no import declaration in the commit that added it`];
  const region = { first: span.start, last: span.end };
  let last = born;
  for (const [k, step] of steps.entries()) {
    const which = `amendment ${k + 1} (${step.subject})`;
    if (step.text === undefined) {
      if (allApplied) return [`${file}: ${which} is not applied`];
      break;
    }
    if (!step.changed) return [`${file}: the commit of ${which} does not change it`];
    const found = judgeBornImports(file, region, { text: last, syntax: syntaxOf.get(last) }, { text: step.text, syntax: syntaxOf.get(step.text) }, false);
    if (found.length > 0) return found.map((r) => `${r}, in ${which}`);
    last = step.text;
  }
  return judgeBorn(file, last, current);
};

/** The reasons a born file's adding commits are not the one that may add it; `hash` names that commit when there is one. */
const judgeAdders = (spec, adders) => {
  if (adders.length > 1) return { reasons: [`${spec.file}: ${adders.length} commits add it, not one`], hash: undefined };
  if (adders.length === 1 && adders[0].subject !== spec.subject) return { reasons: [`${spec.file}: added by a commit other than the one that may add it`], hash: undefined };
  return { reasons: [], hash: adders[0]?.hash };
};

/** The reasons an optional born file is not as it may be. `adders` are the commits that add it, each `{ subject, paths }`. */
const judgeOptionalFile = (spec, adders, born, current) => {
  if (current === undefined && adders.length === 0) return [];
  const [only] = adders;
  if (adders.length !== 1 || only.subject !== spec.subject || only.paths.length !== 1 || only.paths[0] !== spec.file) {
    return [`${spec.file}: added by a commit other than the one that may add it, or by one that holds more than it`];
  }
  return judgeBorn(spec.file, born, current);
};

/**
 * The reasons the test files a mutation close adds are not as they may be. `commits` are those with the subject, each
 * `{ subject, entries: [{ status, path }] }`; `bornOf` and `currentOf` read a path's text at its commit and now.
 */
const judgeAnyTest = (spec, commits, bornOf, currentOf) => {
  const reasons = judgeSubject(spec.subject, commits.length);
  if (reasons.length > 0) return reasons;
  for (const { entries } of commits) {
    for (const { status, path } of entries) {
      if (path === EVIDENCE) continue;
      if (status !== "A" || !MUTATION_TEST_PATH.test(path)) reasons.push(`${path}: the commit with the subject ${spec.subject} holds it, and it is not a test file that commit adds`);
      else reasons.push(...judgeBorn(path, bornOf(path), currentOf(path)));
    }
  }
  return reasons;
};

/** The reasons a file an earlier phase holds was changed by a commit other than the ones that may. `commits`: `{ hash, subject }`. */
const judgeEarlierHeld = (row, commits) =>
  commits
    .filter((c) => !row.subjects.includes(c.subject))
    .map((c) => `${row.file}: changed by ${c.hash.slice(0, 10)} "${c.subject}", and phase ${row.phase}'s pinned check holds it (only ${row.subjects.map((s) => `"${s}"`).join(" or ")} may)`);

/** The reasons the constants are not well formed: each file once, regions in order, each earlier row naming a subject. */
const judgeConstants = (declared, born, optional, earlier) => {
  const reasons = [];
  const once = (label, list) => {
    for (const item of new Set(list)) if (list.filter((x) => x === item).length > 1) reasons.push(`${label} names ${item} more than once`);
  };
  once("DECLARED", declared.map((d) => d.file));
  once("BORN", born.map((b) => b.file));
  once("EARLIER_HELD", earlier.map((e) => e.file));
  for (const d of declared) {
    reasons.push(...judgeRegionShapes(d.file, d.regions));
    if (d.subject === "" || d.regions.length === 0) reasons.push(`${d.file}: a declared file names a subject and a region`);
  }
  for (const b of born) if (b.subject === "") reasons.push(`${b.file}: a born file names a subject`);
  for (const o of optional) if (o.subject === "") reasons.push("an optional born kind names a subject");
  for (const e of earlier) if (e.subjects.length === 0 || e.subjects.some((s) => s === "")) reasons.push(`${e.file}: an earlier-held file names the subjects that may change it`);
  return reasons;
};

const summaryLine = (held, declared, applied, bornHeld, earlier) =>
  `pinned: ${held} held, ${declared} declared (${applied} applied), ${bornHeld} born, ${earlier} earlier-held, clean`;

// ---- the syntax tree ----

const EMPTY_SYNTAX = { imports: [], others: [] };

/**
 * The top-level statements of each text, as 1-based line ranges: `{ imports, others }`. The texts go into a temporary project,
 * a child process opens it through `typescript/unstable/sync`, and the project is removed; a failure to run it throws.
 */
const parseTexts = (texts) => {
  const dir = mkdtempSync(join(realpathSync(tmpdir()), "qd91-pinned-"));
  try {
    texts.forEach((text, i) => writeFileSync(join(dir, `f${i}.ts`), text));
    writeFileSync(
      join(dir, "tsconfig.json"),
      JSON.stringify({
        compilerOptions: { noEmit: true, noResolve: true, types: [], target: "esnext", module: "esnext", allowImportingTsExtensions: true },
        files: texts.map((_, i) => `f${i}.ts`),
      }),
    );
    return JSON.parse(runTypescriptChild(SELF, ["--parse-child", dir, String(texts.length)], { timeoutMs: 120_000 }));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
};

/**
 * Runs `judgeAll(parse)` twice: once to learn which texts it asks the parser for (every judge asks for all of its texts in one
 * call, before any verdict that depends on a summary), then, after one child process parsed them all, for its result.
 */
const withParsed = (judgeAll) => {
  const wanted = new Set();
  judgeAll((texts) => {
    for (const text of texts) wanted.add(text);
    return texts.map(() => EMPTY_SYNTAX);
  });
  const list = [...wanted];
  const parsed = list.length === 0 ? [] : parseTexts(list);
  const cache = new Map(list.map((text, i) => [text, parsed[i]]));
  return judgeAll((texts) => texts.map((text) => cache.get(text)));
};

/** The child of `parseTexts`: prints one line of JSON, the syntax summary of each `f<i>.ts` of the project in `dir`. */
const parseChild = async (dir, count) => {
  const { API } = await import("typescript/unstable/sync");
  const { SyntaxKind } = await import("typescript/unstable/ast");
  const api = new API({ cwd: dir });
  nameServerPids();
  try {
    const program = api.updateSnapshot({ openProject: join(dir, "tsconfig.json") }).getProjects()[0]?.program;
    const summaries = [];
    for (let i = 0; i < count; i += 1) {
      const file = program?.getSourceFile(join(dir, `f${i}.ts`));
      if (file === undefined) throw new Error(`the project holds no f${i}.ts`);
      const lineAt = (offset) => file.text.slice(0, offset).split("\n").length;
      const imports = [];
      const others = [];
      for (const statement of file.statements) {
        (statement.kind === SyntaxKind.ImportDeclaration ? imports : others).push([lineAt(statement.getStart(file)), lineAt(statement.end - 1)]);
      }
      summaries.push({ imports, others });
    }
    console.log(JSON.stringify(summaries));
  } finally {
    api.close();
  }
};

// ---- git ----

const git = (...args) => execFileSync("git", args, { encoding: "utf8", maxBuffer: 1 << 26 });

/** The text of `file` at `rev`, or `undefined` when it has none there. */
const showAt = (rev, file) => {
  try {
    return execFileSync("git", ["show", `${rev}:${file}`], { encoding: "utf8", maxBuffer: 1 << 26, stdio: ["ignore", "pipe", "ignore"] });
  } catch {
    return undefined;
  }
};

const textOf = (file) => (existsSync(file) ? readFileSync(file, "utf8") : undefined);

const hashAndSubject = (output) =>
  output
    .split("\n")
    .filter((line) => line !== "")
    .map((line) => ({ hash: line.slice(0, line.indexOf("\t")), subject: line.slice(line.indexOf("\t") + 1) }));

/** The commits since `base`, each `{ hash, subject }`. */
const commitsSince = (base) => hashAndSubject(git("log", "--format=%H%x09%s", `${base}..HEAD`));

/** The commits since `base` that change `file` in any way, each `{ hash, subject }`. */
const touchersOf = (base, file) => hashAndSubject(git("log", "--format=%H%x09%s", `${base}..HEAD`, "--", file));

/** The commits since `base` that add `file`, each `{ hash, subject }`. */
const addersOf = (base, file) => hashAndSubject(git("log", "--diff-filter=A", "--format=%H%x09%s", `${base}..HEAD`, "--", file));

/** The paths a commit changes, each with its status letter. */
const entriesOf = (hash) =>
  git("diff-tree", "--no-commit-id", "--name-status", "-r", "--no-renames", "-z", hash)
    .split("\0")
    .reduce((acc, part, i, all) => (i % 2 === 0 && part !== "" ? [...acc, { status: part, path: all[i + 1] }] : acc), []);

/** The phase base recorded beside this file, or a refusal. */
const baseOf = () => {
  try {
    const recorded = JSON.parse(readFileSync(join(DIR, "91-mutation-base.json"), "utf8")).phase_base;
    if (typeof recorded === "string" && recorded !== "") return recorded;
  } catch {
    // Falls through to the refusal below.
  }
  process.stderr.write("no phase_base recorded\n");
  process.exit(1);
};

/** Refuses a working directory that is not the repository root and a script outside the phase's own directory. */
const guardRoot = () => {
  if (realpathSync(git("rev-parse", "--show-toplevel").trim()) !== realpathSync(process.cwd())) {
    process.stderr.write("run from the repository root\n");
    process.exit(1);
  }
  if (!basename(DIR).startsWith("QD-91-")) {
    process.stderr.write(`${NAME} is not in a QD-91- directory\n`);
    process.exit(1);
  }
};

const run = (allApplied) => {
  guardRoot();
  const base = baseOf();
  const reasons = judgeConstants(DECLARED, BORN, OPTIONAL_BORN, EARLIER_HELD);
  const declaredFiles = DECLARED.map((d) => d.file);
  const bornFiles = [...BORN.map((b) => b.file), ...OPTIONAL_BORN.flatMap((o) => (o.file === undefined ? [] : [o.file]))];
  const entries = git("ls-tree", "-r", "-z", base, "--", ...PREFIXES, ...HELD_SOURCE)
    .split("\0")
    .filter((entry) => entry !== "")
    .map((entry) => ({ sha: entry.slice(entry.indexOf(" ", entry.indexOf(" ") + 1) + 1, entry.indexOf("\t")), path: entry.slice(entry.indexOf("\t") + 1) }));
  const heldPaths = new Set(heldFrom(entries.map((e) => e.path), declaredFiles));
  if (heldPaths.size < 100) {
    process.stderr.write(`${base} lists only ${heldPaths.size} files under the held directories: the held set is too small\n`);
    process.exit(1);
  }
  for (const file of HELD_SOURCE) if (!heldPaths.has(file)) reasons.push(`${file} is not listed at the base`);
  const watched = [...heldPaths, ...declaredFiles, ...bornFiles];
  const moves = judgeMoves(watched, git("diff", "-M", "--name-status", base, "--", ...PREFIXES, ...HELD_SOURCE, ...DECLARED.filter((d) => d.source).map((d) => d.file), ...bornFiles));
  reasons.push(...moves.map(({ reason }) => reason));
  const gone = new Set(moves.map(({ file }) => file));

  // Held files: one hash pass over the files on disk, the text read only for one that differs.
  const shaAt = new Map(entries.map((e) => [e.path, e.sha]));
  const present = [...heldPaths].filter((path) => {
    if (existsSync(path)) return true;
    if (!gone.has(path)) reasons.push(`${path} does not exist`);
    return false;
  });
  const onDisk = execFileSync("git", ["hash-object", "--no-filters", "--stdin-paths"], { input: `${present.join("\n")}\n`, encoding: "utf8", maxBuffer: 1 << 26 }).split("\n");
  present.forEach((path, i) => {
    if (gone.has(path) || onDisk[i] === shaAt.get(path)) return;
    const baseText = showAt(base, path);
    reasons.push(...(baseText === undefined ? [`${path} does not exist at the base`] : judgeHeld(path, baseText, textOf(path))));
  });

  const since = commitsSince(base);
  const bySubject = (subject) => since.filter((c) => c.subject === subject).map((c) => c.hash);

  // Declared files: gather each file's texts, then judge them all with one parse of every text they need.
  const declaredJobs = [];
  for (const spec of DECLARED) {
    if (gone.has(spec.file)) continue;
    const baseText = showAt(base, spec.file);
    if (baseText === undefined) {
      reasons.push(`${spec.file} does not exist at the base`);
      continue;
    }
    const shapes = [...judgeRegionShapes(spec.file, spec.regions), ...judgeRegionAnchors(spec.file, spec.regions, baseText.split("\n"))];
    reasons.push(...shapes);
    if (shapes.length > 0) continue;
    const hashes = bySubject(spec.subject);
    const many = judgeSubject(spec.subject, hashes.length);
    reasons.push(...many);
    if (many.length > 0) continue;
    const commit = hashes.length === 1 ? showAt(hashes[0], spec.file) : undefined;
    if (hashes.length === 1 && commit === undefined) {
      reasons.push(`${spec.file}: the commit that declares it holds no text for it`);
      continue;
    }
    const changed = hashes.length === 1 && entriesOf(hashes[0]).some((e) => e.path === spec.file);
    declaredJobs.push({ spec, baseText, commit, changed, current: textOf(spec.file) });
  }

  // Born files: the commits that give each its text.
  const bornJobs = [];
  for (const spec of BORN) {
    if (gone.has(spec.file)) continue;
    const found = judgeAdders(spec, addersOf(base, spec.file));
    reasons.push(...found.reasons);
    if (found.reasons.length > 0) continue;
    const current = textOf(spec.file);
    if (found.hash === undefined) {
      if (current !== undefined) reasons.push(`${spec.file}: exists, and no commit since the base adds it`);
      else if (allApplied) reasons.push(`${spec.file}: no commit adds it`);
      continue;
    }
    const steps = (spec.amendments ?? []).map((subject) => {
      const hashes = bySubject(subject);
      reasons.push(...judgeSubject(subject, hashes.length));
      return { subject, text: hashes.length === 1 ? showAt(hashes[0], spec.file) : undefined, changed: hashes.length === 1 && entriesOf(hashes[0]).some((e) => e.path === spec.file) };
    });
    bornJobs.push({ spec, born: showAt(found.hash, spec.file), steps, current });
  }

  const judged = withParsed((parse) => ({
    declared: declaredJobs.map((j) => judgeDeclared(j.spec, j.baseText, j.commit, j.changed, j.current, allApplied, parse)),
    born: bornJobs.map((j) => (j.steps.length === 0 ? judgeBorn(j.spec.file, j.born, j.current) : judgeBornChain(j.spec.file, j.born, j.steps, j.current, allApplied, parse))),
  }));
  let appliedCount = 0;
  for (const verdict of judged.declared) {
    reasons.push(...verdict.reasons);
    if (verdict.applied) appliedCount += 1;
  }
  let bornHeld = 0;
  judged.born.forEach((found) => {
    reasons.push(...found);
    if (found.length === 0) bornHeld += 1;
  });

  // The optional born files: absent is allowed.
  for (const spec of OPTIONAL_BORN) {
    if (spec.anyTest === true) {
      const commits = since.filter((c) => c.subject === spec.subject).map((c) => ({ ...c, entries: entriesOf(c.hash) }));
      const bornOf = (path) => showAt(commits[0].hash, path);
      const found = judgeAnyTest(spec, commits, bornOf, textOf);
      reasons.push(...found);
      if (found.length === 0) bornHeld += commits.flatMap((c) => c.entries).filter((e) => e.path !== EVIDENCE).length;
      continue;
    }
    const adders = addersOf(base, spec.file).map((c) => ({ ...c, paths: entriesOf(c.hash).map((e) => e.path) }));
    const current = textOf(spec.file);
    const found = judgeOptionalFile(spec, adders, adders.length === 1 ? showAt(adders[0].hash, spec.file) : undefined, current);
    reasons.push(...found);
    if (found.length === 0 && current !== undefined) bornHeld += 1;
  }

  // The files an earlier phase holds.
  for (const row of EARLIER_HELD) reasons.push(...judgeEarlierHeld(row, touchersOf(base, row.file)));

  if (reasons.length > 0) {
    process.stderr.write(`${[...new Set(reasons)].join("\n")}\n`);
    process.exit(1);
  }
  process.stdout.write(`${summaryLine(heldPaths.size, DECLARED.length, appliedCount, bornHeld, EARLIER_HELD.length)}\n`);
};

// ---- the self-test ----

const selfTest = () => {
  guardRoot();
  const failures = [];
  let total = 0;
  const check = (name, passed) => {
    total += 1;
    if (!passed) failures.push(name);
  };
  const eq = (name, got, want) => {
    total += 1;
    if (JSON.stringify(got) !== JSON.stringify(want)) failures.push(`${name}: got ${JSON.stringify(got)}, wanted ${JSON.stringify(want)}`);
  };
  const has = (name, got, part) => {
    total += 1;
    if (!got.some((r) => r.includes(part))) failures.push(`${name}: ${JSON.stringify(got)} does not say ${JSON.stringify(part)}`);
  };

  // held
  const base = "one()\ntwo()\nthree()\n";
  eq("a held file equal to its base passes", judgeHeld("x.test.ts", base, base), []);
  eq("a held file with one body line changed fails, naming the file and the line", judgeHeld("x.test.ts", base, base.replace("two()", "twoo()")), ["x.test.ts: differs from its base text at line 2"]);
  has("a whitespace-only change fails", judgeHeld("x.test.ts", base, base.replace("two()", "two() ")), "differs from its base text at line 2");
  has("a line-ending change fails", judgeHeld("x.test.ts", base, base.replaceAll("\n", "\r\n")), "differs from its base text at line 1");
  has("an appended line fails", judgeHeld("x.test.ts", base, `${base}four()\n`), "differs from its base text at line 4");
  eq("the held set is what the base lists less the declared files", heldFrom(["a/x.ts", "a/dec.ts", "", "a/y.ts"], ["a/dec.ts"]), ["a/x.ts", "a/y.ts"]);
  eq("a path the base does not list is not held", heldFrom(["a/x.ts"], []).includes("a/new.ts"), false);
  const status = "M\ta.ts\nR087\tx.test.ts\ty.test.ts\nD\tz.ts\nA\tn.ts\nM\tother.ts";
  const moves = judgeMoves(["x.test.ts", "z.ts", "a.ts", "n.ts"], status);
  check("a file reported as renamed fails, naming both paths", moves.some((m) => m.file === "x.test.ts" && m.reason === "x.test.ts moved to y.test.ts"));
  check("a file reported as deleted fails", moves.some((m) => m.file === "z.ts" && m.reason === "z.ts was deleted"));
  eq("a file that was only modified or added is not reported", moves.length, 2);
  eq("one commit has the subject", judgeSubject("s", 1), []);
  eq("no commit has the subject", judgeSubject("s", 0), []);
  eq("two commits have the subject", judgeSubject("s", 2), ["2 commits have the subject: s"]);

  // regions: ten lines, a replaced span of two (2-3) and one of three (6-8)
  const text = [...Array.from({ length: 10 }, (_, i) => `line ${i + 1}`), ""].join("\n");
  const regions = [
    { first: 2, last: 3, top: "line 2", bottom: "line 3" },
    { first: 6, last: 8, top: "line 6", bottom: "line 8" },
  ];
  const B = text.split("\n");
  eq("region anchors that hold the base pass", judgeRegionAnchors("d.ts", regions, B), []);
  has("a region whose top is not the base line fails", judgeRegionAnchors("d.ts", [{ ...regions[0], top: "line 12" }], B), "base line 2 (the top of region 1) does not start with");
  has("a region whose bottom is not the base line fails", judgeRegionAnchors("d.ts", [{ ...regions[0], bottom: "line 4" }], B), "base line 3 (the bottom of region 1)");
  eq("well formed regions pass", judgeRegionShapes("d.ts", regions), []);
  has("regions out of order fail", judgeRegionShapes("d.ts", [regions[1], regions[0]]), "does not start after the region before it");
  has("overlapping regions fail", judgeRegionShapes("d.ts", [{ first: 2, last: 4 }, { first: 4, last: 5 }]), "does not start after");
  has("a region that is not a range fails", judgeRegionShapes("d.ts", [{ first: 3, last: 2 }]), "is not a range of lines");

  // declared, with the replacement judged on its syntax: every case is a planted text, parsed once with the rest
  const imp = (name) => `import { ${name} } from "./${name}.ts";`;
  const orig = ["head", "// a", imp("a"), imp("b"), "// b", "body 1", imp("c"), "body 2", ""];
  const dText = orig.join("\n");
  const dRegions = [
    { first: 3, last: 4, top: imp("a"), bottom: imp("b") },
    { first: 7, last: 7, top: imp("c"), bottom: imp("c") },
  ];
  const spec = { file: "d.ts", subject: "s", regions: dRegions };
  const edit = (a, c) => [orig[0], orig[1], ...a, orig[4], orig[5], ...c, orig[7], orig[8]].join("\n");
  const good = edit([imp("a2"), imp("b2"), imp("b3")], [imp("c2")]);
  const outsideFirst = edit([imp("a2")], [imp("c2")]).replace("head", "HEAD");
  const outsideMid = edit([imp("a2")], [imp("c2")]).replace("body 1", "BODY 1");
  const outsideLast = edit([imp("a2")], [imp("c2")]).replace("body 2", "BODY 2");
  const withConst = edit([imp("a2"), "const z = 1;"], [imp("c2")]);
  const sameLine = edit([`${imp("a2")} const z = 1;`], [imp("c2")]);
  const withBlank = edit([imp("a2"), "", imp("b2")], [imp("c2")]);
  const withComment = edit([imp("a2"), "// note"], [imp("c2")]);
  const withExport = edit([imp("a2")], ['export { c } from "./c.ts";']);
  const dropped = edit([], [imp("c2")]);
  const declaredWith = (parse, current, commit = current, changed = true, all = false) => judgeDeclared(spec, dText, commit, changed, current, all, parse);
  const afterwards = `${good}later()\n`;
  const insideNow = good.replace(imp("c2"), imp("c3"));
  const multi = edit([`import {\n  a2,\n  b2,\n} from "./x.ts";`], [imp("c2")]);
  // a comment region: lines 2 and 3 of c.ts are a two-line comment
  const cText = ["head", "// old one", "// old two", "body", ""].join("\n");
  const cSpec = { file: "c.ts", subject: "s", regions: [{ first: 2, last: 3, comment: true, top: "// old one", bottom: "// old two" }] };
  const cEdit = (...lines) => ["head", ...lines, "body", ""].join("\n");
  const cGood = cEdit("// new one", "// new two");
  const cLonger = cEdit("// new one", "// new two", "// new three");
  const cStatement = cEdit("// new one", "const z = 1;");
  const cBlock = cEdit("/* new one */", "// new two");
  const cEmpty = cEdit();
  const cOutside = cGood.replace("head", "HEAD");
  // a comment region after an import region: the import region is still judged as imports
  const mText = [imp("a"), "mid", "// old one", "body", ""].join("\n");
  const mSpec = { file: "m.ts", subject: "s", regions: [{ first: 1, last: 1, top: "import", bottom: "import" }, { first: 3, last: 3, comment: true, top: "// old one", bottom: "// old one" }] };
  const mBad = ["const z = 1;", "mid", "// new one", "body", ""].join("\n");
  const declaredCases = [
    ["a declared file equal to its declaring commit passes and is applied", (p) => declaredWith(p, good), { reasons: [], applied: true }],
    ["a region that grows into several imports, one that becomes a multi-line import, and one dropped, pass", (p) => [declaredWith(p, multi).applied, declaredWith(p, dropped).applied], [true, true]],
    ["before the commit exists a declared file equal to its base is held and not applied", (p) => judgeDeclared(spec, dText, undefined, false, dText, false, p), { reasons: [], applied: false }],
    ["before the commit exists a declared edit is held", (p) => judgeDeclared(spec, dText, undefined, false, good, false, p).reasons, ["d.ts: differs from its base text at line 3"]],
    ["with every edit required, a declared file with no commit fails", (p) => judgeDeclared(spec, dText, undefined, false, dText, true, p).reasons, ["d.ts: its declared edit is not applied"]],
    ["a commit that does not change the file fails", (p) => declaredWith(p, dText, dText, false).reasons.slice(0, 1), ["d.ts: the commit that declares it does not change it"]],
    ["a declaring commit that changes a line before the first region fails, naming the line", (p) => declaredWith(p, outsideFirst).reasons, ["d.ts: differs outside its declared lines at line 1"]],
    ["a declaring commit that changes a line between the regions fails, naming the line", (p) => declaredWith(p, outsideMid).reasons, ["d.ts: differs outside its declared lines at line 5"]],
    ["a declaring commit that changes a line after the last region fails, naming the line", (p) => declaredWith(p, outsideLast).reasons, ["d.ts: differs outside its declared lines at line 7"]],
    ["a region replaced by an import and a statement fails, naming the line of the region", (p) => declaredWith(p, withConst).reasons, ["d.ts: line 2 of what replaces region 1 is not an import declaration"]],
    ["an import and a statement on one line fail", (p) => declaredWith(p, sameLine).reasons, ["d.ts: line 1 of what replaces region 1 is not an import declaration"]],
    ["a blank line among the replacing imports fails", (p) => declaredWith(p, withBlank).reasons, ["d.ts: line 2 of what replaces region 1 is not an import declaration"]],
    ["a comment among the replacing imports fails", (p) => declaredWith(p, withComment).reasons, ["d.ts: line 2 of what replaces region 1 is not an import declaration"]],
    ["a re-export in place of an import fails", (p) => declaredWith(p, withExport).reasons, ["d.ts: line 1 of what replaces region 2 is not an import declaration"]],
    ["a file changed after its declaring commit fails, at the line", (p) => declaredWith(p, afterwards, good).reasons[0], "d.ts: differs from the commit that added it at line 10"],
    ["a file edited inside its regions after its commit fails the commit's text only", (p) => declaredWith(p, insideNow, good).reasons.length, 1],
    ["a file edited outside its regions after its commit fails twice", (p) => declaredWith(p, good.replace("head", "HEAD"), good).reasons.length, 2],
    ["a declared file that is gone fails", (p) => judgeDeclared(spec, dText, good, true, undefined, false, p).reasons, ["d.ts does not exist"]],
    ["a comment region replaced by line comments passes, longer or shorter", (p) => [judgeDeclared(cSpec, cText, cGood, true, cGood, false, p).applied, judgeDeclared(cSpec, cText, cLonger, true, cLonger, false, p).applied], [true, true]],
    ["a comment region replaced by a statement fails, naming the line", (p) => judgeDeclared(cSpec, cText, cStatement, true, cStatement, false, p).reasons, ["c.ts: line 2 of what replaces comment region 1 is not a line comment"]],
    ["a comment region replaced by a block comment fails", (p) => judgeDeclared(cSpec, cText, cBlock, true, cBlock, false, p).reasons, ["c.ts: line 1 of what replaces comment region 1 is not a line comment"]],
    ["a comment region replaced by nothing fails", (p) => judgeDeclared(cSpec, cText, cEmpty, true, cEmpty, false, p).reasons, ["c.ts: what replaces comment region 1 is empty"]],
    ["a comment region's neighbour line changed fails, naming the line", (p) => judgeDeclared(cSpec, cText, cOutside, true, cOutside, false, p).reasons, ["c.ts: differs outside its declared lines at line 1"]],
    ["a comment region leaves an import region beside it judged as imports", (p) => judgeDeclared(mSpec, mText, mBad, true, mBad, false, p).reasons, ["m.ts: line 1 of what replaces region 1 is not an import declaration"]],
  ];
  // import-only judgement of loose gaps
  const gapCases = [
    ["no replacing line passes", [[]], []],
    ["two imports pass", [[imp("a"), imp("b")]], []],
    ["a multi-line import passes", [["import {", "  a,", '} from "./a.ts";']], []],
    ["a type import and a side-effect import pass", [['import type { A } from "./a.ts";', 'import "./side.ts";']], []],
    ["an import equals declaration fails", [['import a = require("./a.ts");']], ["x.ts: line 1 of what replaces region 1 is not an import declaration"]],
    ["a statement alone fails", [["const z = 1;"]], ["x.ts: line 1 of what replaces region 1 is not an import declaration"]],
    ["the second region is named", [[imp("a")], [imp("b"), "let y = 2;"]], ["x.ts: line 2 of what replaces region 2 is not an import declaration"]],
  ];

  // born with an amendment in its import region: lines 2 to 5 are the born text's imports
  const header = ["/** header */", 'import a from "a";', "import {", "  b,", '} from "b";', "", "const x = 1;", 'describe("x", () => {});', ""];
  const bornText = header.join("\n");
  const grown = (extra, at = 5) => [...header.slice(0, at), ...extra, ...header.slice(at)].join("\n");
  const moved = grown(['import c from "c";', 'import { d } from "d";']);
  const bodyChanged = moved.replace("const x = 1;", "const x = 2;");
  const constAmong = grown(["const z = 1;", 'import c from "c";']);
  const beforeAdded = ["/** header */", "// a line", ...header.slice(1)].join("\n");
  const appendedLine = `${moved}const later = 1;\n`;
  const step = (text, changed = true) => [{ subject: "fix(x): amend", text, changed }];
  const chainCases = [
    ["a born file equal to its born text passes with no amendment", (p) => judgeBornChain("b.ts", bornText, step(undefined), bornText, false, p), []],
    ["with every edit required, an amendment not committed fails", (p) => judgeBornChain("b.ts", bornText, step(undefined), bornText, true, p), ["b.ts: amendment 1 (fix(x): amend) is not applied"]],
    ["an amendment that moves only the import region passes, and HEAD equals it", (p) => judgeBornChain("b.ts", bornText, step(moved), moved, true, p), []],
    ["after the amendment the born text is no longer the file", (p) => judgeBornChain("b.ts", bornText, step(moved), bornText, false, p), ["b.ts: differs from the commit that added it at line 6"]],
    ["an amendment that changes a body line fails", (p) => judgeBornChain("b.ts", bornText, step(bodyChanged), bodyChanged, false, p), ["b.ts: differs from the commit that added it at line 9, in amendment 1 (fix(x): amend)"]],
    ["an amendment that puts a statement among the imports fails", (p) => judgeBornChain("b.ts", bornText, step(constAmong), constAmong, false, p), ["b.ts: line 6 inside its import region is not an import declaration, in amendment 1 (fix(x): amend)"]],
    ["an amendment that adds a line before the imports fails", (p) => judgeBornChain("b.ts", bornText, step(beforeAdded), beforeAdded, false, p), ["b.ts: its import region starts at line 3, not 2, in amendment 1 (fix(x): amend)"]],
    ["an amendment that appends a line after the body fails", (p) => judgeBornChain("b.ts", bornText, step(appendedLine), appendedLine, false, p), ["b.ts: differs from the commit that added it at line 11, in amendment 1 (fix(x): amend)"]],
    ["an amendment whose commit does not change the file fails", (p) => judgeBornChain("b.ts", bornText, step(bornText, false), bornText, false, p), ["b.ts: the commit of amendment 1 (fix(x): amend) does not change it"]],
    ["a file changed after its last amendment fails", (p) => judgeBornChain("b.ts", bornText, step(moved), `${moved}x\n`, false, p), ["b.ts: differs from the commit that added it at line 11"]],
    ["a born text with no import declaration fails", (p) => judgeBornChain("b.ts", "const x = 1;\n", [], "const x = 1;\n", false, p), ["b.ts: has no import declaration in the commit that added it"]],
  ];

  const results = withParsed((parse) => ({
    declared: declaredCases.map(([, run]) => run(parse)),
    gaps: gapCases.map(([, gaps]) => judgeImportGaps("x.ts", gaps, parse)),
    chain: chainCases.map(([, run]) => run(parse)),
  }));
  declaredCases.forEach(([name, , want], i) => eq(name, results.declared[i], want));
  gapCases.forEach(([name, , want], i) => eq(name, results.gaps[i], want));
  chainCases.forEach(([name, , want], i) => eq(name, results.chain[i], want));
  eq("a region replaced by a larger run of lines keeps the held text between regions in order", regionGaps("d.ts", dRegions, dText, good).reasons, []);
  has("a held text between two regions that changed fails", regionGaps("d.ts", dRegions, dText, outsideMid).reasons, "differs outside its declared lines");

  // born, adding commits
  const addSpec = { file: "s.test.ts", subject: "test(x): add" };
  eq("a born file added by its commit passes", judgeAdders(addSpec, [{ hash: "h", subject: addSpec.subject }]), { reasons: [], hash: "h" });
  eq("a born file with no adding commit is not yet born", judgeAdders(addSpec, []), { reasons: [], hash: undefined });
  has("a born file added by two commits fails", judgeAdders(addSpec, [{ hash: "h", subject: addSpec.subject }, { hash: "i", subject: "x" }]).reasons, "2 commits add it, not one");
  has("a born file added under another subject fails", judgeAdders(addSpec, [{ hash: "h", subject: "x" }]).reasons, "added by a commit other than the one that may add it");
  eq("a born text equal to the file passes", judgeBorn("b.ts", "t", "t"), []);
  eq("a surface test changed after its commit fails, at the line", judgeBorn("b.ts", "a\nb\n", "a\nB\n"), ["b.ts: differs from the commit that added it at line 2"]);
  has("a born file that is gone fails", judgeBorn("b.ts", "t", undefined), "moved or deleted");

  // the optional born files
  const opt = { file: "packages/react/test/Fold.test.ts", subject: "test(x): hold the fold" };
  const adder = (subject = opt.subject, paths = [opt.file]) => ({ hash: "a1", subject, paths });
  eq("an optional born file absent passes", judgeOptionalFile(opt, [], undefined, undefined), []);
  eq("an optional born file present and equal to its adding commit passes", judgeOptionalFile(opt, [adder()], "t\n", "t\n"), []);
  has("an optional born file added under another subject fails", judgeOptionalFile(opt, [adder("test(x): other")], "t\n", "t\n"), "added by a commit other than the one that may add it");
  has("an optional born file present and added by no commit fails", judgeOptionalFile(opt, [], undefined, "t\n"), "added by a commit other than the one that may add it");
  has("an optional born file added by two commits fails", judgeOptionalFile(opt, [adder(), adder()], "t\n", "t\n"), "added by a commit other than the one that may add it");
  has("an optional born file added by a commit that holds more fails", judgeOptionalFile(opt, [adder(opt.subject, [opt.file, "other.ts"])], "t\n", "t\n"), "holds more than it");
  has("an optional born file edited after its adding commit fails", judgeOptionalFile(opt, [adder()], "t\n", "u\n"), "differs from the commit that added it at line 1");
  has("an optional born file deleted after its adding commit fails", judgeOptionalFile(opt, [adder()], "t\n", undefined), "moved or deleted after the commit that added it");
  const any = { subject: "test(x): kill the open mutants", anyTest: true };
  const T = "packages/core/test/PortSpanFold.mutation.test.ts";
  const mutation = (entries) => [{ subject: any.subject, entries }];
  const texts = { [T]: "t\n" };
  const bornOf = (path) => texts[path];
  eq("no commit with the mutation subject passes", judgeAnyTest(any, [], bornOf, (p) => texts[p]), []);
  eq("a commit adding test files and the evidence file passes", judgeAnyTest(any, mutation([{ status: "A", path: T }, { status: "M", path: EVIDENCE }]), bornOf, (p) => texts[p]), []);
  has("a commit that edits an existing test fails", judgeAnyTest(any, mutation([{ status: "M", path: "packages/core/test/Other.test.ts" }]), bornOf, (p) => texts[p]), "is not a test file that commit adds");
  has("a commit that adds a file that is not a test fails", judgeAnyTest(any, mutation([{ status: "A", path: "packages/core/src/New.ts" }]), bornOf, (p) => texts[p]), "is not a test file that commit adds");
  has("a commit that adds a test outside the three packages fails", judgeAnyTest(any, mutation([{ status: "A", path: "packages/http/test/X.test.ts" }]), bornOf, (p) => texts[p]), "is not a test file that commit adds");
  has("an added mutation test edited later fails", judgeAnyTest(any, mutation([{ status: "A", path: T }]), bornOf, () => "u\n"), "differs from the commit that added it at line 1");
  has("two commits with the mutation subject fail", judgeAnyTest(any, [...mutation([]), ...mutation([])], bornOf, (p) => texts[p]), "2 commits have the subject");

  // the earlier phases' held files
  const row = { phase: "86", file: "packages/react/src/RegistryLease.ts", subjects: ["docs(x): the one", "docs(x): the other"] };
  eq("a file no commit touches passes", judgeEarlierHeld(row, []), []);
  eq("a file touched only by a named subject passes", judgeEarlierHeld(row, [{ hash: "a".repeat(40), subject: "docs(x): the one" }, { hash: "b".repeat(40), subject: "docs(x): the other" }]), []);
  has("a file touched by another subject fails, naming the commit and the phase", judgeEarlierHeld(row, [{ hash: "c".repeat(40), subject: "chore(91-99): touch" }]), `changed by ${"c".repeat(10)} "chore(91-99): touch", and phase 86's pinned check holds it`);
  eq("only the commits that are not named are reported", judgeEarlierHeld(row, [{ hash: "a".repeat(40), subject: "docs(x): the one" }, { hash: "c".repeat(40), subject: "x" }]).length, 1);

  // the constants judge
  const okDeclared = [{ file: "a.ts", subject: "s", regions: [{ first: 1, last: 1 }] }];
  const okBorn = [{ file: "b.ts", subject: "s" }];
  const okOptional = [{ file: "c.ts", subject: "s" }];
  const okEarlier = [{ phase: "86", file: "a.ts", subjects: ["s"] }];
  eq("well formed constants pass", judgeConstants(okDeclared, okBorn, okOptional, okEarlier), []);
  has("a declared file named twice fails", judgeConstants([...okDeclared, ...okDeclared], okBorn, okOptional, okEarlier), "DECLARED names a.ts more than once");
  has("a declared file with no region fails", judgeConstants([{ ...okDeclared[0], regions: [] }], okBorn, okOptional, okEarlier), "a declared file names a subject and a region");
  has("a declared file with a backwards region fails", judgeConstants([{ ...okDeclared[0], regions: [{ first: 4, last: 3 }] }], okBorn, okOptional, okEarlier), "is not a range of lines");
  has("a born file with no subject fails", judgeConstants(okDeclared, [{ file: "b.ts", subject: "" }], okOptional, okEarlier), "a born file names a subject");
  has("an earlier-held row with no subject fails", judgeConstants(okDeclared, okBorn, okOptional, [{ ...okEarlier[0], subjects: [] }]), "names the subjects that may change it");
  eq("the output line", summaryLine(408, 26, 0, 3, 27), "pinned: 408 held, 26 declared (0 applied), 3 born, 27 earlier-held, clean");

  if (failures.length > 0) {
    process.stderr.write(`self-test failed:\n${failures.map((f) => `- ${f}`).join("\n")}\n`);
    process.exit(1);
  }
  process.stdout.write(`self-test: ${total} passed\n`);
};

const args = process.argv.slice(2);
if (args[0] === "--parse-child") {
  try {
    await parseChild(args[1], Number(args[2]));
  } catch (error) {
    process.stderr.write(String(error));
    process.exitCode = 1;
  }
} else if (args.includes("--self-test")) selfTest();
else run(args.includes("--all-applied"));
