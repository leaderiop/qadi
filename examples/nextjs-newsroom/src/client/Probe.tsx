"use client";
/**
 * Calls the guarded route handler with every header worth forging.
 *
 * The point is a negative result: the response tracks the session cookie and
 * nothing else. `x-middleware-subrequest` is the header CVE-2025-29927 used to
 * skip middleware entirely; `x-claimed-user` is the shape an app takes when
 * someone decides middleware should "pass the user down". Neither reaches a
 * decision here, because the decision is taken in the handler's own layer from
 * the policy and the extractor reads one cookie.
 */
import { useState } from "react";
import type { Resource } from "@qadi/core";
import { canReadArticle } from "../domain/policies.ts";
import { GateState } from "./Guards.tsx";
import { button, card, mono, muted, pre } from "../ui/theme.ts";

export interface ProbeProps {
  readonly articleId: string;
  readonly resource?: Resource;
}

interface Attempt {
  readonly label: string;
  readonly status: number;
  readonly body: string;
}

const HEADERS: ReadonlyArray<{ readonly label: string; readonly headers: HeadersInit }> = [
  { label: "plain", headers: {} },
  {
    label: "forged x-middleware-subrequest",
    headers: { "x-middleware-subrequest": "middleware:middleware:middleware" },
  },
  { label: "claimed identity", headers: { "x-claimed-user": "hakim" } },
];

export const Probe = ({ articleId, resource }: ProbeProps) => {
  const [attempts, setAttempts] = useState<ReadonlyArray<Attempt>>([]);
  const [running, setRunning] = useState(false);

  const probe = () => {
    setRunning(true);
    void Promise.all(
      HEADERS.map(async ({ label, headers }): Promise<Attempt> => {
        const response = await fetch(`/api/articles/${articleId}`, {
          headers,
          credentials: "same-origin",
        });
        const body = await response.text();
        return { label, status: response.status, body: body.slice(0, 140) };
      }),
    ).then((results) => {
      setAttempts(results);
      setRunning(false);
    });
  };

  return (
    <div style={card} data-testid="probe">
      <div style={{ ...mono, marginBottom: 6 }}>
        this page&rsquo;s own answer:{" "}
        <GateState
          policy={canReadArticle}
          {...(resource === undefined ? {} : { resource })}
          label="page"
        />
      </div>

      <button type="button" style={button} onClick={probe} disabled={running}>
        {running ? "probing…" : `probe /api/articles/${articleId}`}
      </button>

      {attempts.length === 0
        ? (
          <p style={{ ...muted, margin: "0.6rem 0 0" }}>
            Three requests, same cookie, different forged headers.
          </p>
        )
        : (
          <pre style={{ ...pre, marginTop: "0.6rem" }} data-testid="probe-results">
            {attempts
              .map((attempt) => `${attempt.status}  ${attempt.label}\n     ${attempt.body}`)
              .join("\n")}
          </pre>
        )}
    </div>
  );
};
