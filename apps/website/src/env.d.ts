/// <reference types="astro/client" />
/* Header.astro/Sidebar.astro compose Starlight's own sub-components
   (SiteTitle, Search, SocialIcons) directly via `virtual:starlight/components/*`
   — the documented pattern for a custom Header composition. Astro's own
   generated `.astro/types.d.ts` only covers content-collection types;
   these ambient module declarations live in the Starlight package itself
   and are otherwise only pulled in transitively through `astro.config.mjs`,
   which `.mjs` files never contribute to the TypeScript program. */
/// <reference path="../node_modules/@astrojs/starlight/virtual.d.ts" />
/// <reference path="../node_modules/@astrojs/starlight/virtual-internal.d.ts" />
