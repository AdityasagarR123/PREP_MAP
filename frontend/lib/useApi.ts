"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { friendlyError, getServerState, resetWake, subscribeServerState, type ServerState } from "./api";

export interface AsyncState<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
  reload: () => void;
}

/**
 * Run an async loader whenever `deps` change. Ignores stale responses so
 * fast filter changes never show an older result.
 */
export function useAsync<T>(loader: (() => Promise<T>) | null, deps: unknown[]): AsyncState<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(loader !== null);
  const [tick, setTick] = useState(0);
  const runId = useRef(0);

  useEffect(() => {
    if (!loader) {
      setLoading(false);
      return;
    }
    const id = ++runId.current;
    setLoading(true);
    setError(null);
    loader()
      .then((d) => {
        if (id === runId.current) setData(d);
      })
      .catch((e) => {
        if (id === runId.current) setError(friendlyError(e));
      })
      .finally(() => {
        if (id === runId.current) setLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);

  const reload = useCallback(() => {
    resetWake();
    setTick((t) => t + 1);
  }, []);

  return { data, error, loading, reload };
}

export function useServerState(): ServerState {
  return useSyncExternalStore(subscribeServerState, getServerState, () => "idle" as ServerState);
}
