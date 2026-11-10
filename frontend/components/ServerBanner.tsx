"use client";

import { useEffect } from "react";
import { ensureAwake, resetWake } from "@/lib/api";
import { useServerState } from "@/lib/useApi";

/**
 * Starts the /health wake-up on first load and shows a slim banner while the
 * Render backend cold-starts, or a retry if it never answers.
 */
export default function ServerBanner() {
  const state = useServerState();

  useEffect(() => {
    ensureAwake().catch(() => {
      /* state is surfaced through the banner */
    });
  }, []);

  if (state === "waking") {
    return (
      <div className="server-banner" role="status" aria-live="polite">
        <div className="container">
          <span className="pulse-dot" aria-hidden="true" />
          <span>
            <strong>Waking up the server, this can take up to a minute.</strong> The free backend sleeps when idle.
          </span>
        </div>
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="server-banner error" role="alert">
        <div className="container">
          <span>We couldn&apos;t reach the PrepMap server. It may be restarting.</span>
          <button
            type="button"
            className="btn btn-sm"
            onClick={() => {
              resetWake();
              ensureAwake().catch(() => {});
            }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return null;
}
