# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Astro 7 + `@astrojs/starlight` 0.41.7 + Tailwind v4 (native `@tailwindcss/vite` plugin). This app pins TypeScript 6.0.3 locally, diverging from the workspace's `^7.0.0` catalog — TypeScript 7 support isn't there yet across the Astro/Starlight/`typescript-eslint` tooling chain this app depends on. Content lives in Astro content collections (`docs` via Starlight's `docsLoader`, a hand-built `blog` collection); the landing and compliance pages are plain `src/pages/*.astro`, deliberately outside Starlight's docs layout.

## Users

- **General Effect/TypeScript developers** evaluating or integrating Qadi into their own codebase — the homepage's primary audience.
- **Regulated-industry/GxP technical decision-makers** evaluating `@qadi/audit` specifically for fit in a regulated environment — served by a dedicated Compliance page, not the homepage.

## Product Purpose

The official presentation website for Qadi, an Effect-native authorization library for TypeScript (permission tokens, a role DAG, a schema-derived policy ADT, a single `Effect`-returning evaluator). The site is not a demo or showcase app — it's marketing/documentation surface for a real open-source library. Success is a developer understanding what Qadi does and why within the hero, then finding the specific package or concept page they need; for the GxP audience, success is an honest answer to "can I use this, and what do I still have to bring myself."

## Positioning

The schema-derived Policy ADT is the core differentiator: a policy's TypeScript type and its JSON codec are both derived from one `Effect Schema` definition, so there is no second, independently-drifting representation to fall out of sync — the specific defect class a predecessor implementation shipped and this library was rewritten to remove. Combined with fail-closed defaults (an unwired resolver denies, never grants) and a six-call API that splits cleanly into reporting (`decide`/`check`) versus enforcing (`assert`/`enforce`/`enforceProjected`/`filter`), this is a claim a hand-rolled `if`-statement authorization layer or an external policy engine cannot make.

## Operating Context

A developer lands on the homepage from a search, a link, or the npm/GitHub listing, reads the hero's animated typed-code walkthrough, and either installs (`pnpm add @qadi/core`) or clicks through to Docs. Docs readers navigate a Starlight sidebar (Getting Started → Concepts → tiered Packages → Reference) and copy code snippets directly into their own project — every compiled snippet is type-checked against the real published library as part of this repo's own merge gate, so a snippet that doesn't compile is treated as a defect. A GxP evaluator arrives at the standalone Compliance page (not nested under Docs) looking for a clear capabilities-vs-responsibilities answer before ever reading API docs. All content cross-links back to `spec/overview.md` and the library's own spec/decision-record documents on GitHub rather than duplicating them into an independently-drifting second copy.

## Capabilities and Constraints

- Nine public packages get homepage and docs billing: `@qadi/core`, `@qadi/testing`, `@qadi/react`, `@qadi/promise`, `@qadi/http`, `@qadi/devtools`, `@qadi/predicate-sql`, `@qadi/predicate-prisma`, `@qadi/audit` — depth scaled by importance (`core`/`audit`/`react` deepest, three docs pages each).
- The library itself is `v0.0.0` and unpublished; the website must not imply a stable, released API.
- `@qadi/audit` is explicitly **not** a compliance certification of any kind — no "GxP compliant," "21 CFR Part 11 compliant," "validated," or "certified" claim may appear anywhere on the site. `hasSignature`/e-signature capture is trust-on-presence, not live cryptographic validation, and that gap is stated plainly rather than hidden.
- The site is static content (Astro-built), not an interactive product surface itself — no live in-browser policy evaluator exists yet (a `@effect/monaco-editor`-style demo was flagged as future work, not part of the current build).
- Live deployment (hosting, custom domain, deploy-on-merge CI) is separate follow-up work; the real domain is `qadi.dev`.

## Brand Commitments

- Name: **Qadi** — Arabic قاضي, "the judge." The tagline is the README's opening line: "Effect-native authorization for TypeScript."
- Visual identity (already built, not open for reinterpretation without a deliberate redesign decision): dark theme (`oklch(0.17 0.014 260)` background), a teal/gold accent pairing (`oklch(0.72 0.15 195)` / `oklch(0.75 0.13 80)`), Marcellus serif for headlines paired with IBM Plex Sans/Mono for body and code, and restrained **angular** geometric motifs (an eight-point star built from `clip-path`/SVG polygons) — explicitly not circular shapes, and explicitly not literal Moroccan-architecture pastiche despite the name's etymology inspiring the geometric language.
- Voice: "measured, not asserted" — coverage numbers, mutation scores, and gate counts are cited as concrete evidence rather than marketing adjectives; the same discipline governs every claim about `@qadi/audit`.
- Author/copyright line: "© 2026 Mohammad AL Mechkor · MIT License."

## Evidence on Hand

- Real GitHub repository: `https://github.com/leaderiop/qadi`.
- Real, checkable numbers already used on-site: 95% test coverage on `@qadi/core` / 90% workspace-wide, 92% mutation score on `packages/audit` (`pnpm check` gate 20), 22 total merge gates, five formally stated invariants (INV-QD-051 through INV-QD-055) backing the audit pipeline's correctness claims.
- No testimonials, customer logos, case studies, or pricing exist or should be fabricated — the library is unpublished and has no customers yet.

## Product Principles

1. **Say only what is true, and say it with numbers where possible.** Every capability claim — especially around `@qadi/audit` and compliance — traces to a real, cited fact; nothing is asserted that isn't wired and tested.
2. **One definition per concept, everywhere, including in the docs.** The API Reference page mirrors `spec/overview.md`'s own section headers and links out to it rather than re-listing every export a second time, the same anti-drift discipline the library's own type/codec design embodies.
3. **Fail closed, in messaging as in code.** Uncertainty (an unpublished version, an unverified claim, a validation gap) is stated plainly rather than smoothed over.
4. **Developer credibility over marketing gloss.** Technical depth, real code, and honest boundaries are the persuasion mechanism — not adjectives.
5. **Two audiences, two homes, one set of facts.** The general developer homepage and the GxP-focused Compliance page never duplicate content independently; they draw from and link to the same underlying technical truth.

## Accessibility & Inclusion

WCAG 2.1 AA is the target standard for the public website.
