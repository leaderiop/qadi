/**
 * Refuses a packed declaration that names a path outside its package, into `src/`, or to a `@qadi/<pkg>/<subpath>` that
 * no package declares as an entry point.
 *
 * A declaration naming a path outside its package resolves, at a consumer's install, into whatever sits beside the
 * package; a `/src/` path reaches a package's shipped sources instead of its built interface. TypeScript writes such a
 * path when a dependent's inferred type needs a name its dependency's root does not export and the dependency resolves
 * through a source path (`import("../../core/src/Decision.ts").Trace`), so the check reads the packed artifact, which is
 * what a consumer installs, and not the sources. A bare `@qadi/<pkg>/<subpath>` specifier that is not one of the entry points
the packages' `exports` maps declare fails at a consumer the same way (ERR_PACKAGE_PATH_NOT_EXPORTED, or a type it cannot
reach), so it is refused too; the entry points are read from the manifests by the caller (`entryPointsOf`), never listed here.
 *
 * Comments are stripped first: 46 built declaration files carry `../../` in doc comments, so a text search would refuse
 * a clean tree. `/// <reference … />` lines are comments to a tokenizer and directives to the compiler, so they are kept.
 *
 * Shortcut: the tokenizer follows string and template literals but not regex literals or a template's `${}` nesting,
 * because a declaration file holds neither; upgrade it to a parse if the emitter ever prints one.
 */
import { dirname, isAbsolute, join, relative, resolve } from "node:path";

/** The text with comments removed; strings are kept, because a specifier is one, and a `/// <reference` line is kept whole. */
const stripComments = (text) => {
  let out = "";
  let i = 0;
  while (i < text.length) {
    const c = text[i];
    const next = text[i + 1];
    if (c === '"' || c === "'" || c === "`") {
      let j = i + 1;
      while (j < text.length && text[j] !== c) j += text[j] === "\\" ? 2 : 1;
      out += text.slice(i, j + 1);
      i = j + 1;
    } else if (c === "/" && next === "*") {
      const end = text.indexOf("*/", i + 2);
      i = end === -1 ? text.length : end + 2;
    } else if (c === "/" && next === "/") {
      const end = text.indexOf("\n", i);
      const stop = end === -1 ? text.length : end;
      const line = text.slice(i, stop);
      const before = out.slice(out.lastIndexOf("\n") + 1);
      if (before.trim() === "" && /^\/\/\/\s*<reference\b/.test(line)) out += line;
      i = stop;
    } else {
      out += c;
      i += 1;
    }
  }
  return out;
};

const SPECIFIER_FORMS = [
  /\bimport\(\s*["']([^"']+)["']\s*\)/g,
  /\bfrom\s*["']([^"']+)["']/g,
  /\bimport\s*["']([^"']+)["']/g,
  /\brequire\(\s*["']([^"']+)["']\s*\)/g,
  /<reference\s+path\s*=\s*["']([^"']+)["']/g,
];

/**
 * The entry points `manifests` declare, each a bare specifier: a package's name for its `.` entry and `<name>/<subpath>`
 * for each other key of its `exports` map.
 */
export const entryPointsOf = (manifests) =>
  new Set(
    manifests.flatMap(({ name, exports }) =>
      Object.keys(exports ?? {}).flatMap((key) => (key === "." ? [name] : key.startsWith("./") ? [`${name}/${key.slice(2)}`] : [])),
    ),
  );

/**
 * One reason per refusal for a declaration file's text: `fileRel` is the file's path inside `packageRoot`, and a
 * specifier is refused for a `/src/` segment, when relative or absolute for resolving outside the package, and when a
 * bare `@qadi/<pkg>/<subpath>` for not being one of `entryPoints` (`entryPointsOf`). With no entry points given, every
 * such subpath is refused: the check fails closed rather than passing a subpath it was not told about.
 */
export const declarationEscapes = (packageRoot, fileRel, text, entryPoints = new Set()) => {
  const stripped = stripComments(text);
  const base = dirname(join(packageRoot, fileRel));
  const specifiers = new Set(SPECIFIER_FORMS.flatMap((form) => [...stripped.matchAll(form)].map((m) => m[1])));
  return [...specifiers].flatMap((specifier) => {
    const reasons = [];
    if (/(?:^|\/)src\//.test(specifier)) reasons.push(`names a src/ path: ${specifier}`);
    if (specifier.startsWith(".") || isAbsolute(specifier)) {
      const away = relative(packageRoot, resolve(base, specifier));
      if (away === ".." || away.startsWith("../") || isAbsolute(away)) reasons.push(`resolves outside its package: ${specifier}`);
    }
    if (/^@qadi\/[^/]+\/./.test(specifier) && !entryPoints.has(specifier)) {
      reasons.push(`names a subpath no package declares as an entry point: ${specifier}`);
    }
    return reasons;
  });
};

/** The entry points the planted texts are judged against, in the shape `entryPointsOf` gives. */
const SELF_CHECK_ENTRY_POINTS = entryPointsOf([
  { name: "@qadi/core", exports: { ".": "./lib/index.js", "./package.json": "./package.json" } },
  { name: "@qadi/devtools", exports: { ".": "./lib/index.js", "./react": "./lib/react/index.js" } },
]);

/** Planted texts, each with the number of reasons `declarationEscapes` must give; the gate checks the function on them every run. */
export const ESCAPE_SELF_CHECK = Object.freeze([
  { label: "an escape outside the package", fileRel: "lib/A.d.ts", text: 'export declare const x: import("../../core/src/Decision.js").Trace;', expect: 2 },
  { label: "a path into src inside the package", fileRel: "lib/A.d.ts", text: 'export declare const x: import("../src/Decision.ts").Trace;', expect: 1 },
  { label: "a reference path outside the package", fileRel: "lib/A.d.ts", text: '/// <reference path="../../other/x.d.ts" />\nexport declare const x: 1;', expect: 1 },
  { label: "a doc comment naming an outside path", fileRel: "lib/A.d.ts", text: '/** See import("../../../spec/x.md") and ../../../spec/x.md */\nexport declare const x: 1;', expect: 0 },
  { label: "a line comment naming an outside path", fileRel: "lib/A.d.ts", text: '// from "../../../spec/x.md"\nexport declare const x: 1;', expect: 0 },
  { label: "a string literal type holding a comment opener", fileRel: "lib/A.d.ts", text: 'export declare const u: "https://x";', expect: 0 },
  { label: "an escape after a string holding //", fileRel: "lib/A.d.ts", text: 'export declare const u: "https://x", v: import("../../core/src/D.js").T;', expect: 2 },
  { label: "an escape between strings holding comment markers", fileRel: "lib/A.d.ts", text: 'export declare const u: "/*"; export type T = import("../../x/src/y.js").Z; export declare const v: "*/";', expect: 2 },
  { label: "a deep import into a package's lib", fileRel: "lib/A.d.ts", text: 'export declare const x: import("@qadi/core/lib/Decision.js").Trace;', expect: 1 },
  { label: "a subpath of a package that declares other subpaths", fileRel: "lib/A.d.ts", text: 'import type { Diagnostics } from "@qadi/devtools/model";\nexport declare const x: Diagnostics;', expect: 1 },
  { label: "a bare src path of another package", fileRel: "lib/A.d.ts", text: 'export declare const x: import("@qadi/core/src/Decision.ts").Trace;', expect: 2 },
  { label: "a declared subpath and a declared root", fileRel: "lib/A.d.ts", text: 'import type { DevtoolsDockProps } from "@qadi/devtools/react";\nimport type { Trace } from "@qadi/core";\nexport declare const x: DevtoolsDockProps | Trace;', expect: 0 },
  { label: "a clean file of bare and in-package specifiers", fileRel: "lib/A.d.ts", text: 'import * as Effect from "effect/Effect";\nimport type { Trace } from "@qadi/core";\nexport * from "./Decision.js";\nexport type T = import("../lib/x.js").T;\nexport declare const x: 1;', expect: 0 },
]);

/** The labels of the planted cases that were not judged as planted. */
export const runEscapeSelfCheck = () =>
  ESCAPE_SELF_CHECK.filter(({ fileRel, text, expect }) => declarationEscapes("/p", fileRel, text, SELF_CHECK_ENTRY_POINTS).length !== expect).map(({ label }) => label);
