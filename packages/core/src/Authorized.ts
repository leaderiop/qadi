/**
 * The witness that a policy check succeeded for a specific permission.
 *
 * Produced only by {@link Qadi.guard}, never by a public constructor — the
 * `permission` field is real, not phantom, so a witness for one permission
 * structurally cannot satisfy a handler expecting a different permission's
 * witness. Named "Witness" in the glossary, deliberately not "Capability"
 * (`spec/models/04-capability.md` already ships that term with a different
 * meaning: holding a `Permission` token *is* the authority, with no policy to
 * evaluate) and not "Aspect" (`guard` changes an effect's shape, unlike
 * `Qadi.enforce`). See ADR-QD-035.
 */
import type * as Brand from "effect/Brand";
import type { Permission } from "./Permission.ts";

export type Authorized<P extends Permission> = Brand.Branded<
  { readonly permission: P },
  "Authorized"
>;
