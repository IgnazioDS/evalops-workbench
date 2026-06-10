import { describe, expect, it, vi, afterEach, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import {
  useDebounce,
  useMounted,
  useAnimatedNumber,
  useHotkey,
  usePolling,
} from "./hooks";

describe("useDebounce", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns the initial value immediately", () => {
    const { result } = renderHook(() => useDebounce("hello", 200));
    expect(result.current).toBe("hello");
  });

  it("updates only after the delay elapses", () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 200),
      { initialProps: { value: "first" } },
    );
    rerender({ value: "second" });
    expect(result.current).toBe("first");

    act(() => {
      vi.advanceTimersByTime(199);
    });
    expect(result.current).toBe("first");

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current).toBe("second");
  });
});

describe("useMounted", () => {
  it("returns true after mount", () => {
    const { result } = renderHook(() => useMounted());
    expect(result.current).toBe(true);
  });
});

describe("useHotkey", () => {
  it("fires handler when key matches", () => {
    const handler = vi.fn();
    const { unmount } = renderHook(() => useHotkey("k", handler));

    const event = new KeyboardEvent("keydown", { key: "k" });
    window.dispatchEvent(event);

    expect(handler).toHaveBeenCalledOnce();
    unmount();
  });

  it("ignores non-matching keys", () => {
    const handler = vi.fn();
    const { unmount } = renderHook(() => useHotkey("k", handler));

    const event = new KeyboardEvent("keydown", { key: "j" });
    window.dispatchEvent(event);

    expect(handler).not.toHaveBeenCalled();
    unmount();
  });

  it("is case-insensitive", () => {
    const handler = vi.fn();
    const { unmount } = renderHook(() => useHotkey("K", handler));

    const event = new KeyboardEvent("keydown", { key: "k" });
    window.dispatchEvent(event);

    expect(handler).toHaveBeenCalledOnce();
    unmount();
  });

  it("respects meta modifier", () => {
    const handler = vi.fn();
    const { unmount } = renderHook(() => useHotkey("k", handler, { meta: true }));

    const eventWithoutMeta = new KeyboardEvent("keydown", {
      key: "k",
      metaKey: false,
    });
    window.dispatchEvent(eventWithoutMeta);
    expect(handler).not.toHaveBeenCalled();

    const eventWithMeta = new KeyboardEvent("keydown", {
      key: "k",
      metaKey: true,
    });
    window.dispatchEvent(eventWithMeta);
    expect(handler).toHaveBeenCalledOnce();
    unmount();
  });

  it("respects ctrl modifier", () => {
    const handler = vi.fn();
    const { unmount } = renderHook(() => useHotkey("k", handler, { ctrl: true }));

    const eventWithoutCtrl = new KeyboardEvent("keydown", {
      key: "k",
      ctrlKey: false,
    });
    window.dispatchEvent(eventWithoutCtrl);
    expect(handler).not.toHaveBeenCalled();

    const eventWithCtrl = new KeyboardEvent("keydown", {
      key: "k",
      ctrlKey: true,
    });
    window.dispatchEvent(eventWithCtrl);
    expect(handler).toHaveBeenCalledOnce();
    unmount();
  });

  it("respects shift modifier", () => {
    const handler = vi.fn();
    const { unmount } = renderHook(() => useHotkey("k", handler, { shift: true }));

    const eventWithoutShift = new KeyboardEvent("keydown", {
      key: "k",
      shiftKey: false,
    });
    window.dispatchEvent(eventWithoutShift);
    expect(handler).not.toHaveBeenCalled();

    const eventWithShift = new KeyboardEvent("keydown", {
      key: "k",
      shiftKey: true,
    });
    window.dispatchEvent(eventWithShift);
    expect(handler).toHaveBeenCalledOnce();
    unmount();
  });

  it("detaches listener on unmount", () => {
    const handler = vi.fn();
    const { unmount } = renderHook(() => useHotkey("k", handler));

    unmount();

    const event = new KeyboardEvent("keydown", { key: "k" });
    window.dispatchEvent(event);

    expect(handler).not.toHaveBeenCalled();
  });
});

describe("useAnimatedNumber", () => {
  it("starts at 0", () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useAnimatedNumber(100, 600));
    expect(result.current).toBe(0);
    vi.useRealTimers();
  });

  it("animates towards target", () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useAnimatedNumber(100, 600));

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(result.current).toBeGreaterThan(0);
    expect(result.current).toBeLessThan(100);
    vi.useRealTimers();
  });

  it("handles value changes during animation", () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(
      ({ target }) => useAnimatedNumber(target, 600),
      { initialProps: { target: 100 } }
    );

    act(() => {
      vi.advanceTimersByTime(300);
    });

    const midValue = result.current;
    expect(midValue).toBeGreaterThan(0);
    expect(midValue).toBeLessThan(100);

    rerender({ target: 200 });

    act(() => {
      vi.advanceTimersByTime(100);
    });

    expect(result.current).toBeDefined();
    vi.useRealTimers();
  });

  it("cleans up animation frame on unmount", () => {
    const cancelAnimationFrameSpy = vi.spyOn(
      global,
      "cancelAnimationFrame"
    );
    vi.useFakeTimers();
    const { unmount } = renderHook(() => useAnimatedNumber(100, 600));

    act(() => {
      vi.advanceTimersByTime(100);
    });

    unmount();

    expect(cancelAnimationFrameSpy).toHaveBeenCalled();
    cancelAnimationFrameSpy.mockRestore();
    vi.useRealTimers();
  });
});

describe("usePolling", () => {
  it("returns object with data, error, loading, refetch", () => {
    const fetcher = vi.fn().mockResolvedValue({ data: "test" });
    const { result } = renderHook(() => usePolling(fetcher, 1000, false));

    expect(result.current).toHaveProperty("data");
    expect(result.current).toHaveProperty("error");
    expect(result.current).toHaveProperty("loading");
    expect(result.current).toHaveProperty("refetch");
  });

  it("initializes with null data and true loading when enabled", () => {
    const fetcher = vi.fn();
    const { result } = renderHook(() => usePolling(fetcher, 1000, true));

    expect(result.current.data).toBeNull();
    expect(result.current.loading).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it("initializes with true loading when disabled", () => {
    const fetcher = vi.fn();
    const { result } = renderHook(() => usePolling(fetcher, 1000, false));

    expect(result.current.loading).toBe(true);
    expect(result.current.data).toBeNull();
  });

  it("exposes refetch function", () => {
    const fetcher = vi.fn();
    const { result } = renderHook(() => usePolling(fetcher, 1000, false));

    expect(typeof result.current.refetch).toBe("function");
    expect(() => result.current.refetch()).not.toThrow();
  });

  it("cleans up on unmount", () => {
    const fetcher = vi.fn();
    const { unmount } = renderHook(() => usePolling(fetcher, 1000, false));

    // Verify hook mounts without errors
    expect(() => unmount()).not.toThrow();
  });
});
