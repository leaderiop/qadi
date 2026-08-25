"use client";
/**
 * The unseeded page. Same guards, nothing behind them.
 */
import type { ArticleResource } from "../domain/resource.ts";
import { canPublishArticle, canReadArticle, inGoodStanding } from "../domain/policies.ts";
import { GateState } from "./Guards.tsx";
import { card, mono } from "../ui/theme.ts";

export const Spa = ({ resources }: { readonly resources: ReadonlyArray<ArticleResource> }) => (
  <>
    <div style={card}>
      <GateState policy={inGoodStanding} label="standing" />
    </div>
    {resources.map((resource) => (
      <div key={resource.id} style={card} data-testid={`spa-${resource.id}`}>
        <div style={{ ...mono, marginBottom: 6 }}>{resource.id}</div>
        <GateState policy={canReadArticle} resource={resource} label={`read:${resource.id}`} />
        <GateState
          policy={canPublishArticle}
          resource={resource}
          label={`publish:${resource.id}`}
        />
      </div>
    ))}
  </>
);
