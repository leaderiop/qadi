/**
 * Extracts ```typescript and ```tsx blocks from a Markdown/MDX source string,
 * ignoring ```ts fragments (an explicit opt-out for illustrative snippets),
 * and compiles the extracted blocks against the workspace's real packages.
 *
 * Shared by scripts/check-doc-examples.mjs (spec/) and
 * scripts/check-website-doc-examples.mjs (apps/website's docs content) so the
 * fence convention AGENTS.md §12 sets — and the scratch-tsconfig/compile/report
 * mechanics around it — are identical in both places rather than two
 * independently-maintained (and driftable) copies.
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";

export const COMPILED_EXTENSIONS = { typescript: "ts", tsx: "tsx" };

export const extractCodeFences = (source) => {
  const blocks = [];
  const lines = source.split("\n");
  let current = null;

  for (const line of lines) {
    const fence = /^[ \t]*```(\w*)/.exec(line);
    if (fence !== null) {
      if (current === null) {
        const ext = COMPILED_EXTENSIONS[fence[1]];
        current = ext === undefined ? undefined : { ext, lines: [] };
      } else {
        if (current !== undefined) {
          blocks.push({ ext: current.ext, source: current.lines.join("\n") });
        }
        current = null;
      }
      continue;
    }
    if (current !== undefined && current !== null) current.lines.push(line);
  }
  return blocks;
};

/**
 * Every public package's `src/index.ts`, as a scratch-tsconfig `paths` map
 * relative to a scratch directory one level below repo root (e.g. `.doc-examples/`).
 * The one map both checkers use — adding a 10th package means editing this
 * once, not once per checker.
 */
export const PACKAGE_PATHS = {
  "@qadi/core": ["../packages/core/src/index.ts"],
  "@qadi/testing": ["../packages/testing/src/index.ts"],
  "@qadi/react": ["../packages/react/src/index.ts"],
  "@qadi/promise": ["../packages/promise/src/index.ts"],
  "@qadi/http": ["../packages/http/src/index.ts"],
  "@qadi/devtools": ["../packages/devtools/src/index.ts"],
  "@qadi/predicate-sql": ["../packages/predicate-sql/src/index.ts"],
  "@qadi/predicate-prisma": ["../packages/predicate-prisma/src/index.ts"],
  "@qadi/audit": ["../packages/audit/src/index.ts"],
};

/**
 * Extracts every fenced example from `files`, writes them to `outDir` (which
 * is emptied first) alongside a scratch `tsconfig.json` extending root's
 * `tsconfig.base.json`, compiles the batch with `tsc`, and reports the
 * result. `outDir` and `root` are absolute paths; `label` names the checker
 * in its own log lines (e.g. `"doc-examples"`).
 *
 * Returns nothing — exits the process directly (0 on success or "nothing to
 * check", 1 with the compiler's own output on failure), matching how both
 * checkers already behave as standalone merge-gate scripts.
 */
export const compileFencedExamples = ({ root, outDir, files, label }) => {
  rmSync(outDir, { recursive: true, force: true });
  mkdirSync(outDir, { recursive: true });

  let count = 0;
  for (const file of files) {
    const blocks = extractCodeFences(readFileSync(file, "utf8"));
    blocks.forEach((block, index) => {
      const name = `${relative(root, file).replace(/[/.]/g, "_")}_${index}.${block.ext}`;
      writeFileSync(join(outDir, name), block.source);
      count += 1;
    });
  }

  writeFileSync(
    join(outDir, "tsconfig.json"),
    JSON.stringify(
      {
        extends: "../tsconfig.base.json",
        include: ["*.ts", "*.tsx"],
        compilerOptions: {
          noEmit: true,
          composite: false,
          // Examples are illustrative: an unused import in a snippet is not a
          // defect, but an unresolved one is.
          noUnusedLocals: false,
          noUnusedParameters: false,
          paths: PACKAGE_PATHS,
        },
      },
      null,
      2,
    ),
  );

  if (count === 0) {
    console.log(`${label}: no \`\`\`typescript blocks found`);
    process.exit(0);
  }

  try {
    execFileSync("npx", ["tsc", "-p", join(outDir, "tsconfig.json")], {
      cwd: root,
      stdio: "pipe",
      encoding: "utf8",
    });
    console.log(`${label}: ${count} block(s) compile`);
    rmSync(outDir, { recursive: true, force: true });
  } catch (error) {
    console.error(error.stdout ?? "");
    console.error(`\n${label}: ${count} block(s) extracted, compilation FAILED.`);
    console.error(`Scratch files kept in ${outDir} for inspection.`);
    process.exit(1);
  }
};
