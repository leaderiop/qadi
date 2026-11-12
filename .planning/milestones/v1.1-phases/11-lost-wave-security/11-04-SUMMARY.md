---
phase: 11-lost-wave-security
plan: 04
subsystem: http
tags: [security, guardApi, access-plan, docs, lost-wave-port]

requires: ["11-02"]
provides:
  - "The access-declaration readers (`EndpointAccess`, `endpointAccess`, `misplacedDeclarations`) are non-exported declarations in package-private `AccessPlan.ts`; `planApi` is the one reader of an endpoint's declaration (SEC-05)"
  - "`AccessDeclarationKey` stays public: declared in `AccessPlan.ts`, re-exported as a type from `GuardApi.ts` beside `ApiGuardRefusal`"
  - "README, website http page and `examples/http-advanced/server.ts` say an undeclared endpoint fails `guardApi`'s build (`AccessNotDeclared`), a misplaced declaration fails it (`MisplacedAccessDeclaration`), and the middleware answers 500 (one error log) for an endpoint not part of the `HttpApi` value `guardApi` was built from (SEC-06)"
affects: [11-06, 11-07]

actuals:
  tokens: 70000
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns: ["a reader private to the one module that plans from it; tests go through guardApi, never a reader export (ADR-QD-099)"]

key-files:
  created:
    - .planning/phases/11-lost-wave-security/11-04-SUMMARY.md
  modified:
    - packages/http/src/RequirePermission.ts
    - packages/http/src/AccessPlan.ts
    - packages/http/src/GuardApi.ts
    - packages/http/test/accessPlan.test.ts
    - packages/http/README.md
    - apps/website/src/content/docs/docs/packages/http.md
    - examples/http-advanced/server.ts
    - stryker.http.mjs

key-decisions:
  - "D-49-c (A, recommended in the plan): the readers leave the barrel; never released (added by the pending `.changeset/endpoint-access.md`, npm latest 0.11.0), so 11-07 amends that changeset rather than writing a Breaking entry (D-49-e)"
  - "No checkpoint:decision in this plan; `_DECISIONS.md` has no row for 11-04"

requirements-completed: []

coverage:
  - id: D1
    description: "Reader exports in RequirePermission.ts 4 -> 0; `const endpointAccess` in AccessPlan.ts; AccessDeclarationKey public via GuardApi.ts"
    requirement: SEC-05
    verification:
      - kind: other
        ref: "Task 1 verify greps"
        status: pass
    human_judgment: false
  - id: D2
    description: "Docs and example name AccessNotDeclared and the same-value / prefix rule"
    requirement: SEC-06
    verification:
      - kind: other
        ref: "Task 2 verify greps + pnpm spec:website-examples"
        status: pass
    human_judgment: false
  - id: D3
    description: "No touched file's http mutation score fell vs 11-mutation-base-http.json"
    requirement: XC-05
    verification:
      - kind: other
        ref: "stryker.http.mjs + compare one-liner"
        status: pass
    human_judgment: false
---

# Phase 11 Plan 04: the plan is the one reader; the docs say what it does - Summary

After 11-02 the plan read each endpoint's declaration through readers still exported from `RequirePermission.ts`, a
second public reader that could drift from the plan (the ARCH-18 registry/middleware disagreement). They now live in
`AccessPlan.ts`, unexported. The integrator docs no longer say an undeclared endpoint answers 500 per request or that
the middleware reads the annotation at request time.

## Commits

| Task | Commit | Subject |
|------|--------|---------|
| 1 | `99bfa88` | refactor(11-04): the access-declaration readers become private to the plan |
| 2 | `3de69cd` | docs(11-04): the README, website page and example say guardApi refuses at build |

## Removed exports (for 11-06's `spec/overview.md` rows and 11-07's amendment of `.changeset/endpoint-access.md`)

| Export | Was | Now |
|--------|-----|-----|
| `EndpointAccess` (type + constructor) | `RequirePermission.ts`, barrel | private to `AccessPlan.ts` |
| `endpointAccess` | `RequirePermission.ts`, barrel | private to `AccessPlan.ts` |
| `misplacedDeclarations` | `RequirePermission.ts`, barrel | private to `AccessPlan.ts` |
| `AccessDeclarationKey` (type) | `RequirePermission.ts`, barrel | declared in `AccessPlan.ts`, still public via `GuardApi.ts` |

## Doc changes

- `packages/http/README.md`, `apps/website/src/content/docs/docs/packages/http.md`: undeclared endpoint -> `guardApi`
  fails to build naming group and endpoint (`AccessNotDeclared`); group/API declaration -> `MisplacedAccessDeclaration`
  naming the group or API (the "middleware answers 500 for every endpoint under that group" sentence is gone);
  `guardApi` reads each declaration once at build and the middleware looks the endpoint up (website: the "reading the
  annotation back off at request time" sentence is gone); the middleware answers 500, with one error log naming it, for
  an endpoint not part of the `HttpApi` value it was built from (another API or a `prefix`ed copy), so pass `guardApi`
  the value `HttpApiBuilder.layer` serves. Neither page listed `endpointAccess`/`misplacedDeclarations`.
- `examples/http-advanced/server.ts`: the forgotten-endpoint comment says `guardApi refuses to build (AccessNotDeclared)`.
- `stryker.http.mjs`: the static-mutant comment names `GuardApi.ts`'s `guardApi` (was `registerApi`); `mutate` is a glob
  (`packages/http/src/**/*.ts`), so `AccessPlan.ts` is already included.

Ported from lost `2ea89d6` (`git apply` of its three prose hunks applied clean to `main`), plus the log clause.

## Stryker (`stryker.http.mjs`, phase base `11-mutation-base-http.json` -> after)

| File | Base | After |
|------|------|-------|
| `AccessPlan.ts` | (new in 11-02; 100% after 11-02) | 100% (72 killed) |
| `GuardApi.ts` | 84.8% | 100% |
| `RequirePermissionMiddleware.ts` | 96.8% | 100% |
| `RequirePermission.ts` | 100% | 100% |
| `AuthorizeRequest.ts` | 84.2% | 88.9% (untouched here) |
| Package | 94.79 | 97.71 |

Compare one-liner: no file fell.

## Gate results

- Task 1 verify: greps pass; `pnpm vitest run --project http` 279/279; `pnpm exec tstyche packages/http/test` 39/39;
  `pnpm typecheck` 0; `pnpm lint` 0 (house-style clean); `pnpm circular` no cycle; `pnpm spec:website-examples` 40 blocks.
- Task 2 verify (greps, website examples, typecheck, Stryker, compare): exit 0. Re-ran http tests, tstyche, lint,
  circular after the Task 2 source change: pass.
- **Not run by design:** `pnpm spec:api` (gate 13): red until 11-06 adds `AccessNotDeclared` and removes the
  `endpointAccess`/`EndpointAccess`/`misplacedDeclarations` rows.

## Deviations from Plan

1. **[Rule 1 - XC-05] The plan's `Public` case no longer carries the `publicEndpoint` reason.** The first Stryker run
   left one survivor in `AccessPlan.ts` (98.63%): `EndpointAccess.Public({ declaration })` -> `{}`. Nothing reads the
   declaration (the middleware's `Public` arm ignores it; the reason is "never read by the middleware" by design), and
   with the reader private no interface can observe it, so a test could not kill it without exporting a reader
   (ADR-QD-099). Dropped the unread field instead (`Public: {}`); `AccessPlan.ts` back to 100%. The plan asked for a
   byte-for-byte port of the bodies; this one line differs.
2. **Step 4 of Task 1 was already done:** `GuardApi.test.ts`'s header already pointed at `accessPlan.test.ts`
   (11-02 renamed the suite); no edit.
3. **Reader unit tests deleted, not rewritten** (the plan's first option, as the lost commit did): the four cases of
   `endpointAccess: the reader` are each decided through `guardApi` in the placement describe (undeclared, required,
   public, both-keys-requirement-wins, group/API misplacement per key, both keys reported by the first).
   279 tests (was 283 incl. those 4).

## Threat Flags

None new. T-11-12 mitigated (reader exports 4 -> 0); T-11-13 mitigated (same-value rule on both doc surfaces).

## Notes for next plans

- 11-06: `spec/overview.md` must drop `EndpointAccess`, `endpointAccess`, `misplacedDeclarations` and add
  `AccessNotDeclared` (gate 13). `AccessDeclarationKey` stays (now from `GuardApi.ts`). `spec/` may still describe the
  plan's `Public(declaration)` payload or name the readers as public; check `23-http.md` and ADR-QD-036.
- 11-07: amend `.changeset/endpoint-access.md` (the readers are no longer added).
