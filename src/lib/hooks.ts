"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Debounce a value. Useful for search inputs.
 */
export function useDebounce<T>(value: T, delayMs = 200): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);
  return debounced;
}

/**
 * Mounted state — useful for guarding portals during SSR/hydration so
 * theme toggles don't flash the wrong icon on first paint.
 */
export function useMounted(): boolean {
  const [m, setM] = useState(false);
  useEffect(() => setM(true), []);
  return m;
}

/**
 * Listen for a keyboard shortcut on the window. Returns nothing — pure
 * side effect. Pass a stable handler (define once or wrap in useCallback)
 * if the consumer re-renders frequently.
 */
export function useHotkey(
  key: string,
  handler: (e: KeyboardEvent) => void,
  options: { meta?: boolean; ctrl?: boolean; shift?: boolean } = {},
): void {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const matchesKey = e.key.toLowerCase() === key.toLowerCase();
      const matchesMeta = options.meta ? e.metaKey || e.ctrlKey : true;
      const matchesCtrl = options.ctrl ? e.ctrlKey : true;
      const matchesShift = options.shift ? e.shiftKey : !e.shiftKey;
      if (matchesKey && matchesMeta && matchesCtrl && matchesShift) {
        handlerRef.current(e);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [key, options.meta, options.ctrl, options.shift]);
}

/**
 * Animate a number from 0 to its current value over a short duration.
 * Used by StatCard so big counters feel alive on first render.
 */
export function useAnimatedNumber(target: number, durationMs = 600): number {
  const [value, setValue] = useState(0);
  const start = useRef<number | null>(null);
  const from = useRef(0);
  const to = useRef(target);

  useEffect(() => {
    from.current = value;
    to.current = target;
    start.current = null;

    let frame = 0;
    const tick = (t: number) => {
      if (start.current === null) start.current = t;
      const elapsed = t - start.current;
      const progress = Math.min(1, elapsed / durationMs);
      // ease-out-quint
      const eased = 1 - Math.pow(1 - progress, 5);
      setValue(from.current + (to.current - from.current) * eased);
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, durationMs]);

  return value;
}

/**
 * Polling hook with a stable abort signal. Reschedules on visibility change
 * so background tabs don't burn the API.
 */
export function usePolling<T>(
  fetcher: () => Promise<T>,
  intervalMs: number,
  enabled = true,
): { data: T | null; error: Error | null; loading: boolean; refetch: () => void } {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    let active = true;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const run = async () => {
      try {
        const v = await fetcher();
        if (!active) return;
        setData(v);
        setError(null);
      } catch (e) {
        if (!active) return;
        setError(e instanceof Error ? e : new Error(String(e)));
      } finally {
        if (active) setLoading(false);
      }
      if (active && document.visibilityState === "visible") {
        timer = setTimeout(run, intervalMs);
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible" && timer === null) {
        run();
      }
    };

    run();
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      active = false;
      if (timer) clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intervalMs, enabled, tick]);

  return { data, error, loading, refetch: () => setTick((t) => t + 1) };
}
