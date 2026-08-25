/**
 * JOB 0 ledger — the manifest claims this package makes about itself.
 *
 * These would ordinarily be left to review, and are not, because each has a
 * failure mode that is silent in development and loud in a host application:
 * two copies of React produce "invalid hook call" from a component that is
 * plainly correct, and a self-mounting overlay disappears only in a minified
 * production build.
 */
import { assert, describe, it } from "@effect/vitest";
// Imported rather than read off disk: this project's vitest runs under
// `happy-dom`, where `import.meta.url` is not a `file:` URL and
// `fileURLToPath` throws. The import also types the manifest from its own
// contents, which is stricter than any hand-written shape for it.
import manifest from "../package.json";

describe("@qadi/devtools' package manifest", () => {
  // E0.4
  it("takes React as a peer, never as a dependency", () => {
    // A `dependencies` entry lets a package manager install a second React
    // beside the host's, and every hook in the dock then throws from a
    // component that is plainly correct.
    //
    // `Object.keys` rather than an index: the imported JSON is typed from its
    // own contents, so `manifest.dependencies["react"]` is a *compile* error
    // today — which is the stronger statement, and would silently become a
    // passing runtime check the moment someone added the entry.
    assert.notInclude(Object.keys(manifest.dependencies), "react");
    assert.include(Object.keys(manifest.peerDependencies), "react");
  });

  it("marks React optional, because the model needs none", () => {
    // The root entry point is headless, so a server-side aggregator consuming
    // it should not be warned about a peer it will never render with.
    assert.isTrue(manifest.peerDependenciesMeta?.["react"]?.optional);
  });

  // E6.7, from the manifest's side. The test that nothing self-mounts is in
  // `react/DevtoolsDock.test.tsx`; this is the declaration that makes such a
  // module droppable, and therefore the reason that test has to hold.
  it("declares itself free of side effects", () => {
    assert.isFalse(manifest.sideEffects);
  });

  // E0.1
  it("ships both entry points, and includes them in the tarball", () => {
    assert.deepStrictEqual(Object.keys(manifest.exports ?? {}), [".", "./react"]);
    assert.deepStrictEqual(manifest.files, ["lib", "src", "README.md"]);
  });
});
