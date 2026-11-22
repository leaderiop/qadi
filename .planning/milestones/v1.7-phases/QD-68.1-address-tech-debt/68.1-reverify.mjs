// node .planning/milestones/v1.7-phases/QD-68.1-address-tech-debt/68.1-reverify.mjs <62..68 | 68.1> <phase_base> <heading>, from the
// repository root, once the changes a re-verification answers are committed and before that re-verification of Phase
// <phase> is. Phase 68's re-verification driver (`68-reverify.mjs`, kept as recorded), which can also re-verify Phase 68's
// own report. It differs from the original only in what that needs: the phase filter and the usage line accept 68, and
// the staleness line comes from `68.1-stale.mjs`, which reads Phase 68, where `68-stale.mjs` reads Phases 62 to 67;
// the heading is required, a commit before <phase_base> is marked with that base's short hash (resolved, so a ref
// such as `HEAD~3` reads as its commit), not "Phase 68", and the phase is found live or archived, as `68.1-stale.mjs` finds it.
// Otherwise it prints what the original prints: `## <heading>`, the phase's staleness line, each changed cited file with
// the commits since the verification that changed it (those before <phase_base> marked), the Co-Authored-By trailers on
// the phase's own commits, its VALIDATION.md status, and the covered_digest line before and after, recomputed over the
// same covered_files by GSD's `verification.fingerprint` (a covered path the milestone archive moved read at its new
// place, and the new `covered_files:` block printed before the last line); its last line is the new `covered_digest:`
// line, written as the file writes it. A phase record, not run by `pnpm check:pr`.
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { lastEdit, phaseDir } from "./68.1-stale.mjs";

const [phase, base, heading] = process.argv.slice(2);
if (!/^(?:6[2-8]|68\.1)$/.test(phase ?? "") || base === undefined || heading === undefined) {
  console.error("usage: 68.1-reverify.mjs <62..68 | 68.1> <phase_base> <heading>");
  process.exit(2);
}
const git = (...args) => execFileSync("git", args, { encoding: "utf8", maxBuffer: 1 << 26 });
const cell = (text) => text.replace(/\|/g, "\\|");
const dir = phaseDir(phase);
if (dir === undefined) throw new Error(`no directory for Phase ${phase}, live or archived`);
const doc = `${dir}/${phase}-VERIFICATION.md`;
const vcommit = lastEdit(git, doc).commit;
const baseLabel = git("rev-parse", "--short=8", base).trim();

const stale = execFileSync("node", [fileURLToPath(new URL("./68.1-stale.mjs", import.meta.url))], {
  encoding: "utf8",
}).split("\n");
const at = stale.findIndex((line) => line.startsWith(`${phase}: `));
if (at === -1) throw new Error(`68.1-stale.mjs printed no line for ${phase}`);
const listed = [];
for (let i = at + 1; i < stale.length && stale[i].startsWith("  "); i++) listed.push(stale[i].trim());

const before = new Set(git("rev-list", base).split("\n").filter(Boolean));
const rows = listed.map((entry) => {
  const path = entry.replace(/ \(covered\)$/, "");
  const by = git("log", "--format=%H %s", `${vcommit}..HEAD`, "--", path)
    .split("\n")
    .filter(Boolean)
    .map((line) => `\`${line.slice(0, 8)}\` ${before.has(line.slice(0, 40)) ? `(before ${baseLabel}) ` : ""}${line.slice(41)}`);
  return `| \`${path}\`${path === entry ? "" : " (covered)"} | ${cell(by.join("<br>"))} |`;
});

const trailers = new Map();
const own = git("log", "--format=%H", "-E", `--grep=^[a-z]+\\((phase-)?${phase}(-[0-9]+)?\\): `).split("\n").filter(Boolean);
for (const h of own) {
  const value = git("log", "-1", "--format=%(trailers:key=Co-Authored-By,valueonly)", h).split("\n").filter(Boolean);
  const key = value.length === 0 ? "none" : value.map((v) => `\`${v}\``).join(" and ");
  trailers.set(key, (trailers.get(key) ?? 0) + 1);
}
const counted = [...trailers].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([k, n]) => `${n} ${k}`);

const vdoc = `${dir}/${phase}-VALIDATION.md`;
const vtext = existsSync(vdoc) ? readFileSync(vdoc, "utf8") : undefined;
const validation =
  vtext === undefined
    ? "no VALIDATION.md"
    : `\`${phase}-VALIDATION.md\` has status \`${/^status: (.*)$/m.exec(vtext)?.[1]}\` and nyquist_compliant \`${/^nyquist_compliant: (.*)$/m.exec(vtext)?.[1]}\``;

const text = readFileSync(doc, "utf8");
const covered = (/^covered_files:\n((?: {2}- .+\n)+)/m.exec(text)?.[1] ?? "")
  .split("\n")
  .map((line) => line.replace(/^ {2}- /, "").replace(/^"(.*)"$/, "$1"))
  .filter(Boolean);
const oldLine = /^covered_digest: .*$/m.exec(text)?.[0];
if (covered.length === 0 || oldLine === undefined) throw new Error(`${doc} has no covered_files or covered_digest`);
// A covered path the milestone archive moved is read, and declared, at its archived place.
const moved = covered.map((p) => (existsSync(p) ? p : p.replace(/^\.planning\/phases\//, `${dirname(dir)}/`)));
const remapped = moved.filter((p, i) => p !== covered[i]).length;
let out = execFileSync("node", [".claude/gsd-core/bin/gsd-tools.cjs", "query", "verification.fingerprint", dir, ...moved], {
  encoding: "utf8",
});
if (out.startsWith("@file:")) out = readFileSync(out.slice(6).trim(), "utf8");
const digest = JSON.parse(out).covered_digest;
const quoted = oldLine.includes('"');
const newLine = `covered_digest: ${quoted ? `"${digest}"` : digest}`;

console.log(`## ${heading}

**Staleness:** \`${stale[at]}\` (\`68.1-stale.mjs\`, run at \`${git("rev-parse", "--short=8", "HEAD").trim()}\`).

| Cited file | Changed since \`${vcommit.slice(0, 8)}\` by |
| --- | --- |
${rows.join("\n")}

**Trailers on this phase's commits:** ${counted.join(", ")}.

**Validation record:** ${validation}.

**Digest:** \`${oldLine}\` becomes \`${newLine}\`, over the same ${covered.length} covered files${
  remapped === 0 ? "" : `, ${remapped} of them declared at the place the milestone archive moved them to`
}.
${remapped === 0 ? "" : `covered_files:\n${moved.map((p) => `  - ${p}`).join("\n")}\n`}${newLine}`);
