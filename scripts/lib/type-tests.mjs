import { readdirSync } from "node:fs";
import { join, relative } from "node:path";

/**
 * tstyche's default `testFileMatch` (`**\/*.tst.*`, `**\/__typetests__/*.test.*`,
 * `**\/typetests/*.test.*`), tested against a path relative to the repository root.
 * `tstyche.json` sets none, and `check-house-style.mjs`'s `[not-callable-pin]` fails if it ever
 * does.
 */
export const TYPE_TEST_FILE = [/(?:^|\/)[^/]*\.tst\.[^/]*$/, /(?:^|\/)(?:__typetests__|typetests)\/[^/]*\.test\.[^/]*$/];

/**
 * Every type-test file tstyche selects under `dir`, relative to `root`: tstyche's `**` skips
 * `node_modules` and any name starting with a dot, and so does this walk.
 *
 * The one walk behind both `check-house-style.mjs`, which counts negative pins in each file it
 * finds, and `run-tstyche.mjs`, which fails unless it finds exactly the files `tstyche
 * --listFiles` selects, so a change to tstyche's default match cannot leave a file uncounted
 * (ADR-QD-175).
 *
 * @param {string} root
 * @param {string} [dir]
 * @returns {string[]}
 */
export const walkTypeTests = (root, dir = root) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (entry.name === "node_modules" || entry.name.startsWith(".")) return [];
    const full = join(dir, entry.name);
    if (entry.isDirectory()) return walkTypeTests(root, full);
    const rel = relative(root, full);
    return entry.isFile() && TYPE_TEST_FILE.some((re) => re.test(rel)) ? [rel] : [];
  });
