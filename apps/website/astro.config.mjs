import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  site: "https://qadi.dev",
  integrations: [
    starlight({
      title: "Qadi",
      description: "Effect-native authorization for TypeScript.",
      social: [{ icon: "github", label: "GitHub", href: "https://github.com/leaderiop/qadi" }],
      customCss: ["./src/styles/starlight.css"],
      components: {
        Header: "./src/components/Header.astro",
        ThemeSelect: "./src/components/ThemeSelect.astro",
        Sidebar: "./src/components/Sidebar.astro",
      },
      sidebar: [
        { label: "Getting Started", slug: "docs" },
        {
          label: "Concepts",
          collapsed: true,
          items: [{ autogenerate: { directory: "docs/concepts" } }],
        },
        {
          label: "Packages",
          collapsed: true,
          items: [
            {
              label: "@qadi/core",
              items: [
                { label: "Overview", slug: "docs/packages/core" },
                { label: "Wiring services & resolvers", slug: "docs/packages/core/services" },
                { label: "Advanced policy features", slug: "docs/packages/core/advanced" },
              ],
            },
            {
              label: "@qadi/audit",
              items: [
                { label: "Overview", slug: "docs/packages/audit" },
                { label: "Capabilities", slug: "docs/packages/audit/capabilities" },
                { label: "E-signatures", slug: "docs/packages/audit/signatures" },
              ],
            },
            {
              label: "@qadi/react",
              items: [
                { label: "Overview", slug: "docs/packages/react" },
                { label: "Hooks & Can/Cannot", slug: "docs/packages/react/hooks" },
                { label: "Server-render hydration", slug: "docs/packages/react/hydration" },
              ],
            },
            { label: "@qadi/http", slug: "docs/packages/http" },
            { label: "@qadi/devtools", slug: "docs/packages/devtools" },
            { label: "@qadi/testing", slug: "docs/packages/testing" },
            { label: "@qadi/promise", slug: "docs/packages/promise" },
            { label: "@qadi/predicate-sql", slug: "docs/packages/predicate-sql" },
            { label: "@qadi/predicate-prisma", slug: "docs/packages/predicate-prisma" },
          ],
        },
        {
          label: "Reference",
          items: [
            { label: "API Reference", slug: "docs/reference/api" },
            { label: "Access control models", slug: "docs/reference/models" },
            { label: "Glossary", slug: "docs/reference/glossary" },
          ],
        },
      ],
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
});
