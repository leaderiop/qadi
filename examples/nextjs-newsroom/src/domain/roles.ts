/**
 * The newsroom's role graph.
 *
 * A chain — Reader ⊂ Author ⊂ Editor ⊂ ChiefEditor — crossed by one orthogonal
 * role, `LegalReviewer`, which inherits nothing. The crossing is the point: a
 * lattice with only a chain in it makes the Roles screen's provenance column
 * ("granted by, via") look like decoration, and it is not.
 */
import { role } from "@qadi/core";
import type { Role } from "@qadi/core";
import {
  publishArticle,
  readArticle,
  readDevtools,
  readSource,
  redactArticle,
  writeArticle,
} from "./permissions.ts";

export const reader: Role<"Reader"> = role({
  name: "Reader",
  permissions: [readArticle],
});

export const author: Role<"Author"> = role({
  name: "Author",
  permissions: [writeArticle],
  inherits: [reader],
});

export const editor: Role<"Editor"> = role({
  name: "Editor",
  // `source:read` enters the graph here, which is why a `visibleFields`
  // restriction below Editor hides `sourceContact` and above it does not.
  permissions: [readSource, redactArticle],
  inherits: [author],
});

export const chiefEditor: Role<"ChiefEditor"> = role({
  name: "ChiefEditor",
  permissions: [publishArticle, readDevtools],
  inherits: [editor],
});

/**
 * Legal review, inheriting nothing.
 *
 * A reviewer may read an article to sign it off and may not write, publish or
 * see a source. Modelled as a peer rather than a rung so the graph is a DAG with
 * two roots and the provenance of `article:read` genuinely differs by path.
 */
export const legalReviewer: Role<"LegalReviewer"> = role({
  name: "LegalReviewer",
  permissions: [readArticle, readDevtools],
});

export const allRoles: ReadonlyArray<Role> = [
  reader,
  author,
  editor,
  chiefEditor,
  legalReviewer,
];
