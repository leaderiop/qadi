import type { NextConfig } from "next";

/**
 * Nothing exotic, and that is the finding worth recording.
 *
 * `@qadi/*` ship ESM with a real `exports` map pointing at emitted `lib/`, so
 * Turbopack resolves them like any other dependency — no `transpilePackages`, no
 * alias, no bundler configuration at all. The one thing that has to be true is
 * that `pnpm build` has run at the root; this example consumes the packages as a
 * published consumer would, not through the workspace's `src` path aliases.
 */
const config: NextConfig = {
  typedRoutes: true,
  // `next dev` writes an `AGENTS.md` and a `CLAUDE.md` into this directory
  // unless this is off, and re-creates them if you delete the files. This
  // repository's `AGENTS.md` is its house-style authority and lives at the root;
  // a second one nested here would be a competing set of rules for anyone —
  // person or agent — working in this directory.
  agentRules: false,
};

export default config;
