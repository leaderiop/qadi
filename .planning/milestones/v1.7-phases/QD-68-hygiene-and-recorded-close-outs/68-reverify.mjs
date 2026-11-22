// node <D>68-reverify.mjs <phase> <phase_base> [<heading>], from the repository root, once the changes a re-verification
// answers are committed and before that re-verification of Phase <phase> is. Prints the mechanical head of the section:
// `## <heading>` (default `Re-verification (2026-11-21, Phase 68 sweep)`; a later re-verification names its own date and
// cause), the line `68-stale.mjs` prints for the phase, each changed cited file with the commits since the verification
// that changed it (those before <phase_base> marked), the Co-Authored-By trailers on the phase's own commits, its
// VALIDATION.md status, and the covered_digest line before and after, recomputed over the same covered_files by GSD's
// `verification.fingerprint`. Its last line is the new `covered_digest:` line, written as the file writes it. Extracted
// to <S>/reverify.mjs for the sweep and committed by 68-13 as <D>68-reverify.mjs for any later re-verification; a phase
// record, not run by `pnpm check:pr`.
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";

const [phase, base, heading = "Re-verification (2026-11-21, Phase 68 sweep)"] = process.argv.slice(2);
if (!/^6[2-7]$/.test(phase ?? "") || base === undefined) {
  console.error("usage: 68-reverify.mjs <62..67> <phase_base> [<heading>]");
  process.exit(2);
}
const git = (...args) => execFileSync("git", args, { encoding: "utf8", maxBuffer: 1 << 26 });
const cell = (text) => text.replace(/\|/g, "\\|");
const dir = `.planning/phases/${readdirSync(".planning/phases").find((d) => d.startsWith(`QD-${phase}-`))}`;
const doc = `${dir}/${phase}-VERIFICATION.md`;
const vcommit = git("log", "-1", "--format=%H", "--", doc).trim();

const stale = execFileSync("node", [".planning/phases/QD-68-hygiene-and-recorded-close-outs/68-stale.mjs"], {
  encoding: "utf8",
}).split("\n");
const at = stale.findIndex((line) => line.startsWith(`${phase}: `));
if (at === -1) throw new Error(`68-stale.mjs printed no line for ${phase}`);
const listed = [];
for (let i = at + 1; i < stale.length && stale[i].startsWith("  "); i++) listed.push(stale[i].trim());

const before = new Set(git("rev-list", base).split("\n").filter(Boolean));
const rows = listed.map((entry) => {
  const path = entry.replace(/ \(covered\)$/, "");
  const by = git("log", "--format=%H %s", `${vcommit}..HEAD`, "--", path)
    .split("\n")
    .filter(Boolean)
    .map((line) => `\`${line.slice(0, 8)}\` ${before.has(line.slice(0, 40)) ? "(before Phase 68) " : ""}${line.slice(41)}`);
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
let out = execFileSync("node", [".claude/gsd-core/bin/gsd-tools.cjs", "query", "verification.fingerprint", dir, ...covered], {
  encoding: "utf8",
});
if (out.startsWith("@file:")) out = readFileSync(out.slice(6).trim(), "utf8");
const digest = JSON.parse(out).covered_digest;
const quoted = oldLine.includes('"');
const newLine = `covered_digest: ${quoted ? `"${digest}"` : digest}`;

console.log(`## ${heading}

**Staleness:** \`${stale[at]}\` (\`68-stale.mjs\`, run at \`${git("rev-parse", "--short=8", "HEAD").trim()}\`).

| Cited file | Changed since \`${vcommit.slice(0, 8)}\` by |
| --- | --- |
${rows.join("\n")}

**Trailers on this phase's commits:** ${counted.join(", ")}.

**Validation record:** ${validation}.

**Digest:** \`${oldLine}\` becomes \`${newLine}\`, over the same ${covered.length} covered files.
${newLine}`);
