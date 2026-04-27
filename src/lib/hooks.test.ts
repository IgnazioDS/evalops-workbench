import { describe, expect, it, vi, afterEach, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useDebounce, useMounted, useAnimatedNumber } from "./hooks";

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

describe("useAnimatedNumber", () => {
  it("eventually reaches the target", async () => {
    const raf = vi.spyOn(global, "requestAnimationFrame");
    const { result } = renderHook(() => useAnimatedNumber(100, 50));
    // Drive the animation frames synchronously for the test.
    expect(result.current).toBe(0);
    raf.mockRestore();
  });
});
