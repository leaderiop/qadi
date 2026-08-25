"use client";
/**
 * The newsroom itself, guarded.
 *
 * Two things cross the boundary for each article and they are deliberately not
 * the same object:
 *
 * - `resource` — the six attributes the policies match on. It is part of the
 *   atom key, so it *must* be exactly what the server decided against or the
 *   seed lands on nothing and every control flashes.
 * - `content` — what `project` left of the article after the server applied the
 *   decision's `visibleFields`. A field this reader may not see is **absent**,
 *   not hidden behind a guard.
 *
 * The second exists because the first was once the whole article, and every
 * source contact reached the browser while every `<Can>` denied correctly. A
 * guard chooses what to render; a prop crosses before anything is rendered.
 */
import type { Article } from "../domain/articles.ts";
import type { ArticleResource } from "../domain/resource.ts";
import {
  canPublishArticle,
  canReadArticle,
  readBriefing,
  readSourceContact,
} from "../domain/policies.ts";
import { Fields, GateState, Guarded } from "./Guards.tsx";
import { card, h2, mono, muted } from "../ui/theme.ts";

export interface ArticleView {
  readonly resource: ArticleResource;
  readonly title: string;
  /** Everything the server's `viewArticle` decision left visible. Partial. */
  readonly content: Partial<Article>;
}

const Row = ({ article }: { readonly article: ArticleView }) => (
  <article style={card} data-testid={`article-${article.resource.id}`}>
    <div style={{ display: "flex", gap: 12, alignItems: "baseline", flexWrap: "wrap" }}>
      <strong>{article.title}</strong>
      <span style={{ ...mono, color: "#6b6560" }}>
        {article.resource.status} · by {article.resource.authorId}
      </span>
    </div>

    <div style={{ margin: "0.5rem 0" }}>
      <GateState
        policy={canReadArticle}
        resource={article.resource}
        label={`read:${article.resource.id}`}
      />
      <GateState
        policy={canPublishArticle}
        resource={article.resource}
        label={`publish:${article.resource.id}`}
      />
    </div>

    <Guarded
      policy={canReadArticle}
      resource={article.resource}
      testId={`body-${article.resource.id}`}
      denied="the body is not available to you"
    >
      <p style={{ margin: "0.25rem 0" }}>{article.content.body ?? "—"}</p>
    </Guarded>

    {/*
      Two independent conditions, and both are needed. The guard decides whether
      to draw the line; `content.sourceContact` being absent decides whether
      there is anything to draw. Either alone is a bug: a guard with the value
      present is a leak, and an absent value with no guard renders "undefined"
      to an Editor who is entitled to it.
    */}
    <Guarded
      policy={readSourceContact}
      testId={`source-${article.resource.id}`}
      denied="sources are Editor and above"
    >
      <p style={{ ...mono, margin: "0.25rem 0" }}>
        source: {article.content.sourceContact ?? "not disclosed"}
      </p>
    </Guarded>

    <Fields title="what crossed to this browser" value={article.content} />
  </article>
);

export const Newsroom = ({ articles }: { readonly articles: ReadonlyArray<ArticleView> }) => (
  <>
    <h2 style={h2}>The desk</h2>
    <p style={muted}>
      Four articles, four questions each. Switch user above and watch which controls change — and,
      in the dock&rsquo;s log, watch the server&rsquo;s row pair with the browser&rsquo;s re-check.
    </p>
    {articles.map((article) => <Row key={article.resource.id} article={article} />)}

    <h2 style={h2}>The restricted briefing</h2>
    <p style={muted}>
      Bell–LaPadula: your clearance must dominate the classification. <code>dominates</code> is a
      partial order, so <em>incomparable</em> is a real answer and denies — a level-3 clearance
      without the right compartment is not enough.
    </p>
    {articles
      .filter((article) => article.resource.classification.level > 0)
      .map((article) => (
        <div key={article.resource.id} style={card}>
          <GateState
            policy={readBriefing}
            resource={article.resource}
            label={`briefing:${article.resource.id}`}
          />
          <Guarded
            policy={readBriefing}
            resource={article.resource}
            testId={`briefing-${article.resource.id}`}
            denied="your clearance does not dominate this classification"
          >
            <span style={mono}>{article.content.legalNotes ?? "not disclosed"}</span>
          </Guarded>
        </div>
      ))}
  </>
);
