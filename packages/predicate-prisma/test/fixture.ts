/**
 * The fixture model's nullability declaration, shared by this package's tests.
 *
 * Mirrors `../prisma/schema.prisma`: `level` and `tag` are optional there;
 * `tenantId` and `sealed` are required. `c` and `deletedAt` are the optional
 * columns the golden-shape tests name (they are not in the schema, which only
 * models the columns the engine properties query). Every other column a
 * golden test mentions (`a`, `x`, `score`, `role`, …) is therefore declared
 * required, which is what makes an un-negated golden byte-identical to what
 * the compiler emitted before nullability was declared.
 */
import type { Predicate } from "@qadi/core";
import { compilePrismaWhere } from "../src/index.ts";

export const FIXTURE_NULLABLE: ReadonlySet<string> = new Set(["level", "tag", "c", "deletedAt"]);

/** `compilePrismaWhere` under the fixture declaration. */
export const compile = (predicate: Predicate) =>
  compilePrismaWhere(predicate, { nullable: FIXTURE_NULLABLE });
