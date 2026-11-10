# ADR-QD-118 — `guardApi` plans access from the API value

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-ADR-118                                   |
> | Revision       | 1.0                                            |
> | Effective Date | 2026-11-10                                     |
> | Status         | Accepted — amends ADR-QD-036, ADR-QD-108       |
> | Author         | Qadi Engineering                               |
> | Classification | Architecture Decision Record                   |
> | Change History | 1.0 (2026-11-10): Initial (ARCH-59, CCR-QD-396) |

---

## Context

`guardApi(api)` walked an `HttpApi` to register its guarded endpoints, and the `RequirePermission`
middleware it provided read each endpoint's access annotations a second time, when Effect built the
route. The two readings were joined by an identifier string: ADR-QD-108 (D-46-e) centralised it as
`endpointMemberKey`, `"<group>/<endpoint>"`, but a string is still a name, and any `HttpApi` value can
reuse a name. ARCH-59's probes served an API `B` through `HttpApiBuilder.layer(B)` with `guardApi(A)`
provided, where `A` has group `g`, endpoint `read`, `GET /a`, requiring `read`, and `B` reuses those
names:

- **B1**, `B`'s endpoint is `publicEndpoint`: an anonymous request answered 204. Nothing `guardApi`
  vetted was served to anyone.
- **B2**, `B`'s endpoint requires `write`: a writer got 204, and `/__permissions` listed only `A`'s
  `GET /a`. A path was enforced under a permission the registry did not list.
- **B4**, `B` carries an API-level `RequiredPermission` over a public endpoint: anonymous 204, the
  requirement ignored.
- **Prefix**, `B = A.prefix("/v1")`: `/v1/a` was served to a reader while the registry listed `GET /a`.

An endpoint that declared neither a requirement nor `publicEndpoint` was refused with a 500 on every
request, though the mistake is visible when the API is walked.

## Decision

1. **A closed plan keyed by the group and endpoint values** (D-49-a). `planApi(api)` (package-private
   `AccessPlan.ts`) reads the API once, synchronously, and returns `Result<AccessPlan, ApiGuardRefusal>`:
   for each `HttpApiGroup`/`HttpApiEndpoint` object `HttpApi.reflect` yields, `Required(requirement)` or
   `Public`, and the registrations that follow from the `Required` ones. Effect hands the middleware the
   very objects `reflect` yields for the API it serves, so a hit means "this exact endpoint was vetted".
   An identity cannot be reused the way a name can.
2. **The middleware only looks up.** `makeRequirePermission(plan)` calls `plan.accessOf(group, endpoint)`
   and answers: `Required` enforces through `enforceRequest`, `Public` serves the handler with
   `CurrentSubject` set to `anonymous`, and an endpoint not in the plan answers 500 with one membership
   log line. It reads
   no annotation. `guardApi` registers `plan.registrations` and hands the same plan to the middleware,
   so "listed iff enforced" (INV-QD-180) holds because there is one reading.
3. **An undeclared endpoint is refused at build** (D-49-b). `AccessNotDeclared` (group, endpoint) is the
   third member of `ApiGuardRefusal`, a closed union written out in full:
   `MisplacedAccessDeclaration | RequirePermissionNotAttached | AccessNotDeclared`. Precedence is
   misplaced (API, then groups), then unattached, then undeclared, and any of them outranks registering
   anything.
4. **The readers are private to the plan** (D-49-c). `endpointAccess`, `EndpointAccess` and
   `misplacedDeclarations` are non-exported declarations in `AccessPlan.ts`, so `planApi` is the only
   reader of an API's access annotations and no second public reader can drift from it (the ARCH-18
   registry/middleware disagreement). `AccessDeclarationKey` stays public, re-exported from
   `GuardApi.ts` beside the refusal classes. This reverses ARCH-18 D-18-c, before the readers were
   published. The plan's `Public` case carries nothing: the `publicEndpoint` reason is for a reviewer,
   the middleware never read it, and with the reader private no interface could observe it.
5. **`AccessPlan.ts` holds the refusal classes** (D-49-d), because `GuardApi.ts` imports the plan and a
   class declared there would close an import cycle. `GuardApi.ts` re-exports the public names.
6. **The records** (D-49-e). This ADR; ADR-QD-036's access paragraph; ADR-QD-108's D-46-e row marked
   superseded; BEH-QD-174, BEH-QD-180, BEH-QD-320, BEH-QD-328 and BEH-QD-335; INV-QD-034 and INV-QD-180;
   CCR-QD-396; the pending `@qadi/http` changesets.

## Consequences

- **SEC-06, stated with its limit.** Every served path is listed, and every listed path is enforced
  wherever it is served: an endpoint value not in the plan answers 500, so nothing is served that the
  registry does not list. B1, B2, B4 and the prefix probe each answer 500 with one log line. **The
  ARCH-36 accepted residual is unchanged**: a vetted path that is never mounted stays listed. With
  `guardApi(A)` on `layer(A.prefix("/v1"))`, `/v1/a` fails closed but the registry still lists `GET /a`,
  which that wiring does not mount. Registration happens when `guardApi`'s layer is built, from the value
  it was given, and `HttpApiBuilder` resolves the middleware per request and never tells it which API
  value it serves, so the registry cannot know at build time. The correct wiring, `guardApi(P)` on
  `layer(P)`, lists exactly `GET /v1/a`. Pass `guardApi` the same value `HttpApiBuilder.layer` serves.
- **Breaking against 0.11.0.** An undeclared endpoint stops `guardApi` from building, and an API value
  that is not the one `guardApi` planned is refused. `AccessNotDeclared` is a new export.
- Correct wiring is unaffected: an API served through the `guardApi` built from it, and two APIs each
  given their own `guardApi`, enforce as before.
- `endpointMemberKey`/`EndpointMemberKey` are deleted from `AuthorizeRequest.ts`; the request-enforcement
  module (ADR-QD-108) is otherwise unchanged.

## Alternatives considered

- **Keep the name key and also compare the declarations.** Still a name join, and a second reader of
  the annotations at request time, which is the drift the plan removes.
- **Key the plan by path.** A path is what the registry lists, not what Effect hands the middleware,
  and `prefix` changes it.
- **Keep the undeclared 500 per request.** The mistake is visible at build; refusing there is what
  misplacement and attachment already do.
- **Keep the readers public for a docs or lint tool.** No consumer existed, and the right export for
  one would be the plan over a whole API, not a per-endpoint reader that can disagree with it.
- **Register at mount instead of at build, to close the residual.** `HttpApiBuilder` exposes no hook
  that tells the middleware which value it serves; it would mean owning the builder.

## Related

[ADR-QD-036](./036-qadi-http-package-shape.md),
[ADR-QD-099](./099-entry-points-are-a-closed-list.md),
[ADR-QD-108](./108-a-request-is-enforced-once-through-one-module.md),
[INV-QD-034](../invariants.md),
[INV-QD-180](../invariants.md).
