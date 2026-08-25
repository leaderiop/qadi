/**
 * The newsroom's copy, and the two fields that must not leave the building.
 *
 * `Article` is a `Resource` — a plain readonly record — because that is what
 * `evaluate` takes and what a payload can carry. `sourceContact` and
 * `legalNotes` are on it deliberately: a policy with `fields` restricts what a
 * decision says is *visible*, and `project` is what actually removes them. The
 * difference between those two sentences is a whole route in this example.
 */
import type { Resource } from "@qadi/core";

export type ArticleStatus = "draft" | "review" | "embargoed" | "published";

export interface Article extends Resource {
  readonly id: string;
  readonly title: string;
  readonly status: ArticleStatus;
  readonly authorId: string;
  /** Epoch millis. Compared against the evaluator's clock, never `Date.now()`. */
  readonly embargoUntil: number;
  /** A Bell–LaPadula label: `{ level, compartments }`. */
  readonly classification: { readonly level: number; readonly compartments: ReadonlyArray<string> };
  readonly body: string;
  readonly sourceContact: string;
  readonly legalNotes: string;
}

/** The fields nobody below Editor may see, named once. */
export const RESTRICTED_FIELDS = ["sourceContact", "legalNotes"] as const;

/** Everything a reader may see of any article they may read at all. */
export const PUBLIC_FIELDS = [
  "id",
  "title",
  "status",
  "authorId",
  "embargoUntil",
  "classification",
  "body",
] as const;

const label = (level: number, compartments: ReadonlyArray<string> = []) => ({ level, compartments });

export const articles: ReadonlyArray<Article> = [
  {
    id: "the-harbour-contract",
    title: "The harbour contract",
    status: "published",
    authorId: "nadia",
    embargoUntil: 0,
    classification: label(0),
    body: "Three years of dredging permits, and one signature nobody can place.",
    sourceContact: "port authority clerk, +212 5 39 00 00 00",
    legalNotes: "Cleared 2026-08-11. Do not name the clerk.",
  },
  {
    id: "night-shift",
    title: "Night shift at the desalination plant",
    status: "draft",
    authorId: "nadia",
    embargoUntil: 0,
    classification: label(0),
    body: "Half-written. The maintenance logs stop in March and nobody will say why.",
    sourceContact: "plant engineer, anonymous",
    legalNotes: "Not reviewed.",
  },
  {
    id: "the-tender",
    title: "The tender that closed in an afternoon",
    status: "embargoed",
    // Deliberately far in the future, so the embargo policy denies under both a
    // real clock and a `TestClock` that has not been advanced.
    embargoUntil: 4_102_444_800_000,
    authorId: "omar",
    classification: label(1, ["finance"]),
    body: "Four bidders, one afternoon, and a evaluation committee of two.",
    sourceContact: "ministry aide, +212 6 61 00 00 00",
    legalNotes: "Legal review pending. Embargo until the tender is published.",
  },
  {
    id: "the-briefing",
    title: "Ministerial briefing, restricted",
    status: "review",
    embargoUntil: 0,
    authorId: "omar",
    // Level 2 with a compartment: only a subject whose clearance dominates both
    // may read it, which is what `dominates` means and what `join`/`meet` order.
    classification: label(2, ["finance", "security"]),
    body: "Verbatim minutes. Twelve pages.",
    sourceContact: "attendee, unnamed",
    legalNotes: "Do not publish before the committee reports.",
  },
];

export const articleById = (id: string): Article | undefined =>
  articles.find((article) => article.id === id);
