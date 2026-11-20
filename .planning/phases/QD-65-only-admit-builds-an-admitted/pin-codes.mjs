// Compiles WalkEnvironment.tst.ts with its `@ts-expect-error` lines blanked in memory (the file on disk is not
// touched), under tsconfig.test.json's options and the TypeScript tstyche uses, and prints each diagnostic in that
// file as `TS<code> <line>: <the line's text>`, so a pin's reason is read by its code. A phase record, not run by
// `pnpm check:pr`. From the repository root:
//   node .planning/phases/QD-65-only-admit-builds-an-admitted/pin-codes.mjs
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";

const ts = createRequire(import.meta.url)(resolve("node_modules/.pnpm/typescript@6.0.3/node_modules/typescript"));
const FILE = resolve("packages/core/test/WalkEnvironment.tst.ts");
const config = ts.getParsedCommandLineOfConfigFile(resolve("tsconfig.test.json"), {}, { ...ts.sys, onUnRecoverableConfigFileDiagnostic: () => {} });
const text = readFileSync(FILE, "utf8").replace(/^\s*\/\/ @ts-expect-error.*$/gm, (line) => " ".repeat(line.length));
const lines = text.split("\n");
const host = ts.createCompilerHost(config.options);
const read = host.getSourceFile.bind(host);
host.getSourceFile = (name, target, ...rest) => (resolve(name) === FILE ? ts.createSourceFile(name, text, target, true) : read(name, target, ...rest));
const program = ts.createProgram({ rootNames: [FILE], options: { ...config.options, noEmit: true }, host });
for (const d of ts.getPreEmitDiagnostics(program, program.getSourceFile(FILE))) {
  if (d.file === undefined || resolve(d.file.fileName) !== FILE) continue;
  const line = d.file.getLineAndCharacterOfPosition(d.start ?? 0).line;
  console.log(`TS${d.code} ${line + 1}: ${lines[line].trim()}`);
}
