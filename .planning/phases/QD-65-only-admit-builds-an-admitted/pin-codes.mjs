// Compiles WalkEnvironment.tst.ts with its `@ts-expect-error` lines blanked in memory (the file on disk is not
// touched), under tsconfig.test.json's options and the TypeScript tstyche uses, and prints each diagnostic in that
// file as `TS<code> <line>: <the line's text>`, so a pin's reason is read by its code. A phase record, not run by
// `pnpm check:pr`. From the repository root:
//   node .planning/phases/QD-65-only-admit-builds-an-admitted/pin-codes.mjs
// The TypeScript is the one tstyche's store loads for `tstyche.json`'s `target`, so a target bump moves it too, and
// the last line counts the diagnostics, so a run that read none says so (Phase 68, OI-22).
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Store } from "tstyche/api";

const target = JSON.parse(readFileSync(resolve("tstyche.json"), "utf8")).target;
if (typeof target !== "string") throw new Error(`tstyche.json's target is ${JSON.stringify(target)}, not one version`);
const ts = await Store.load(target);
if (ts === undefined) throw new Error(`tstyche's store could not load TypeScript ${target}`);
const FILE = resolve("packages/core/test/WalkEnvironment.tst.ts");
const config = ts.getParsedCommandLineOfConfigFile(resolve("tsconfig.test.json"), {}, { ...ts.sys, onUnRecoverableConfigFileDiagnostic: () => {} });
const text = readFileSync(FILE, "utf8").replace(/^\s*\/\/ @ts-expect-error.*$/gm, (line) => " ".repeat(line.length));
const lines = text.split("\n");
const host = ts.createCompilerHost(config.options);
const read = host.getSourceFile.bind(host);
host.getSourceFile = (name, target, ...rest) => (resolve(name) === FILE ? ts.createSourceFile(name, text, target, true) : read(name, target, ...rest));
const program = ts.createProgram({ rootNames: [FILE], options: { ...config.options, noEmit: true }, host });
let count = 0;
for (const d of ts.getPreEmitDiagnostics(program, program.getSourceFile(FILE))) {
  if (d.file === undefined || resolve(d.file.fileName) !== FILE) continue;
  const line = d.file.getLineAndCharacterOfPosition(d.start ?? 0).line;
  console.log(`TS${d.code} ${line + 1}: ${lines[line].trim()}`);
  count += 1;
}
console.log(`pin-codes: ${count} diagnostic(s) in WalkEnvironment.tst.ts under TypeScript ${ts.version}`);
