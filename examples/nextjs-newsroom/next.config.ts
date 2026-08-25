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
};

export default config;
