/**
 * What a newsroom can be asked to allow.
 *
 * Tokens rather than strings, so `permissionKey` is the only place the
 * `"resource:action"` shape is written and a typo is a compile error rather than
 * a silent denial.
 */
import { permission } from "@qadi/core";

export const readArticle = permission("article", "read");
export const writeArticle = permission("article", "write");
export const publishArticle = permission("article", "publish");
export const redactArticle = permission("article", "redact");
export const readSource = permission("source", "read");

/** What `/__decisions` and `/__permissions` are guarded by. Not a debug flag. */
export const readDevtools = permission("devtools", "read");

export const allPermissions = [
  readArticle,
  writeArticle,
  publishArticle,
  redactArticle,
  readSource,
  readDevtools,
] as const;
