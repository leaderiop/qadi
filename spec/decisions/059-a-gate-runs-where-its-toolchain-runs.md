# ADR-QD-059 — A gate runs where its toolchain runs, and says so where it does not

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-ADR-059                                   |
> | Revision       | 1.0                                            |
> | Effective Date | 2026-08-30                                     |
> | Status         | Accepted                                       |
> | Author         | Qadi Engineering                               |
> | Classification | Architecture Decision Record                   |
> | Change History | 1.0 (2026-08-30): Initial release (CCR-QD-092) |

---

## Context

The two-leg matrix `.github/workflows/check.yml` added made the workspace's
declared Node floor (`>=20.19.0`) real: both `20.19.0` and `26` are now
blocking legs of one `check` job. The first run that got past the react
suite (33314894440, after plan 01-05's fix) reached the last step and died
there. Every library gate was green on Node 20.19.0 — 1850 tests, the
packed-artifact install gate, five mutation runs — and then `astro check`
refused the runtime outright: *"Node.js v20.19.0 is not supported by
Astro."* The conflict pre-dated the matrix; it was merely unreachable until
the floor leg existed to hit it. `apps/website` depends on Astro 7.2.9,
whose own `engines.node` is `>=22.12.0` — above the workspace's declared
floor by design (the workspace floor is a claim about what the nine
*published* packages support; this app is private and publishes nothing).

## Decision

`scripts/check-website-build.mjs`, the command behind the `website` alias
and gate 22, runs on every `check.yml` matrix leg whose Node satisfies the
floor the site's own toolchain declares. It reads that floor from the
installed `astro` manifest rather than restating it, so the next Astro
dependency bump cannot silently desynchronize the gate from what it is
actually gating. Where a leg's Node does not satisfy that floor, the gate
states the skip in exactly one line naming the running version, the floor,
and where it was read from — a skip that cannot be seen is the same
failure mode `spec/devtools-spec/`'s false claims of absence already cost
this repository (CCR-QD-075). If no leg in the matrix satisfies the floor,
the gate fails outright rather than skipping everywhere silently. The
workspace floor stays `>=20.19.0` and both legs stay blocking — nothing
about the declared, verified Node floor changes.

## Alternatives considered

- **Downgrade Astro to a Node-20-compatible major.** Rejected on evidence:
  `@astrojs/starlight@0.41.7` peer-depends on `astro: ^7.0.2`, so this is not
  a version pin but a downgrade of Starlight, `@astrojs/starlight-tailwind`
  and the Tailwind Vite plugin together — the site's whole framework stack,
  which `apps/website/PRODUCT.md` and `apps/website/DESIGN.md` own and this
  milestone does not. `PROJECT.md` scopes this roadmap to the site's
  production *deployment*, not its content or design.
- **Give the floor leg its own step list in `check.yml`.** Rejected on
  AGENTS.md §15 and D-05: the workflow runs `pnpm check` and nothing else
  precisely so there is one definition of done. A second list of steps
  drifting from the first is the exact defect this library was rewritten to
  remove.
- **Drop `apps/website` from `pnpm check` entirely.** Rejected: it would
  undo CCR-QD-091 six days after it landed and let a broken Astro page ship
  past a green gate on every runtime, not just the floor leg.

## Consequences

**Positive**:

- The floor leg (`check (20.19.0)`) concludes `success` end to end, so
  COMPAT-01 is verifiable evidence rather than an assertion, and REL-03's
  nine 0.3.0 manifests and REL-04's packed-artifact install gate now cite a
  run that is actually green.
- The narrowing is read from Astro's own manifest, not hardcoded, so it
  tracks the real dependency rather than a number someone typed once.
- The coverage assertion (no satisfying leg is a build failure, not a
  skip) turns "nobody builds the site" from a silent condition into a red
  build.

**Negative** (named honestly, not minimized):

- The site is built on one leg of two, so a defect reachable only under
  Node 26's build toolchain is caught, and one reachable only under an
  older Node's build toolchain is not. This is acceptable and bounded:
  nothing deploys the site from the floor leg, the app is private and
  publishes no tarball, and the coverage assertion prevents this narrowing
  from silently expanding to "no leg builds it."
- `apps/website` already diverges from the workspace toolchain by its own
  product doc's account — it pins TypeScript 6.0.3 against the workspace's
  `^7.0.0` catalog — so this is a second instance of an existing, declared
  boundary rather than a new one.

**Implemented**: `scripts/check-website-build.mjs`, `package.json`'s
`website` script, `spec/process/definitions-of-done.md` row 22.
