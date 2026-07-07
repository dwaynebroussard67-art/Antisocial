"use client";
import { useEffect, useState, useCallback, useRef } from "react";

// The standard real-time mechanism for this project until a real push layer
// exists (see the salvage's Section 16 note — polling now, one call site to
// redirect later). `shouldStop` lets a caller freeze polling once a
// game/match reaches a terminal state, avoiding wasted requests.
export function usePolling<T>(
  fetcher: () => Promise<T>,
  intervalMs: number,
  shouldStop: (data: T | null) => boolean = () => false
) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const dataRef = useRef<T | null>(null);

  const fetchOnce = useCallback(async () => {
    try {
      const result = await fetcher();
      dataRef.current = result;
      setData(result);
      setError(null);
    } catch {
      setError("Sync failed.");
    }
  }, [fetcher]);

  useEffect(() => {
    fetchOnce();
    const interval = setInterval(() => {
      if (!shouldStop(dataRef.current)) fetchOnce();
    }, intervalMs);
    return () => clearInterval(interval);
  }, [fetchOnce, intervalMs, shouldStop]);

  return { data, error, refetch: fetchOnce };
}
