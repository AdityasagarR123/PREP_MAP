"use client";

import type { ReactNode } from "react";
import { useServerState } from "@/lib/useApi";

export function CubeLoader() {
  return (
    <div className="cube-loader" aria-hidden="true">
      <div className="cube">
        <span />
        <span />
        <span />
        <span />
        <span />
        <span />
      </div>
    </div>
  );
}

export function Loading({ label = "Loading…" }: { label?: string }) {
  const server = useServerState();
  const waking = server === "waking";
  return (
    <div className="state" role="status" aria-live="polite">
      <CubeLoader />
      <h3>{waking ? "Waking up the server" : label}</h3>
      {waking && (
        <p>The free server sleeps when nobody is using it. Waking it up can take up to a minute — thanks for waiting.</p>
      )}
    </div>
  );
}

export function ErrorState({ message, onRetry, title = "Couldn't load this" }: { message: string; onRetry?: () => void; title?: string }) {
  return (
    <div className="state" role="alert">
      <div style={{ fontSize: "2rem" }} aria-hidden="true">
        ⚠️
      </div>
      <h3>{title}</h3>
      <p>{message}</p>
      {onRetry && (
        <button type="button" className="btn btn-primary" onClick={onRetry}>
          Retry
        </button>
      )}
    </div>
  );
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="state">
      <div style={{ fontSize: "2rem" }} aria-hidden="true">
        🗺️
      </div>
      <h3>{title}</h3>
      {children && <div>{children}</div>}
    </div>
  );
}

export function Disclaimer({ text }: { text?: string }) {
  return (
    <div className="notice info" role="note">
      <span className="icon" aria-hidden="true">
        ℹ️
      </span>
      <span>
        {text ||
          "Recommended based on each company's public hiring process, not a record of questions the company asked."}
      </span>
    </div>
  );
}
