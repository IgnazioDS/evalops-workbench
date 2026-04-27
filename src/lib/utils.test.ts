import { describe, expect, it, vi, afterEach } from "vitest";
import {
  cn,
  formatDate,
  formatDuration,
  formatNumber,
  formatRelative,
  isMac,
  percent,
  truncate,
} from "./utils";

describe("cn", () => {
  it("merges class names with Tailwind precedence", () => {
    expect(cn("px-2", "px-4")).toBe("px-4");
    expect(cn("text-foreground", false && "text-danger", "bg-surface")).toBe(
      "text-foreground bg-surface",
    );
  });

  it("handles empty and undefined inputs", () => {
    expect(cn()).toBe("");
    expect(cn(undefined, null as unknown as string)).toBe("");
  });
});

describe("formatNumber", () => {
  it("formats integers with thousands separators", () => {
    expect(formatNumber(1000)).toMatch(/1[,.  ]000/);
    expect(formatNumber(0)).toBe("0");
  });

  it("returns em-dash for nullish or NaN", () => {
    expect(formatNumber(null)).toBe("—");
    expect(formatNumber(undefined)).toBe("—");
    expect(formatNumber(NaN)).toBe("—");
  });
});

describe("formatDuration", () => {
  it("formats sub-millisecond, millisecond, second, and minute ranges", () => {
    expect(formatDuration(0.4)).toBe("<1ms");
    expect(formatDuration(420)).toBe("420ms");
    expect(formatDuration(3450)).toBe("3.45s");
    expect(formatDuration(120_000)).toBe("2m");
  });

  it("handles invalid input", () => {
    expect(formatDuration(null)).toBe("—");
    expect(formatDuration(undefined)).toBe("—");
    expect(formatDuration(NaN)).toBe("—");
    expect(formatDuration(-5)).toBe("—");
  });
});

describe("formatRelative", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns adaptive units relative to now", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-28T12:00:00Z"));
    expect(formatRelative("2026-04-28T11:59:30Z")).toBe("30s ago");
    expect(formatRelative("2026-04-28T11:55:00Z")).toBe("5m ago");
    expect(formatRelative("2026-04-28T09:00:00Z")).toBe("3h ago");
    expect(formatRelative("2026-04-26T12:00:00Z")).toBe("2d ago");
  });

  it("returns 'never' for missing input", () => {
    expect(formatRelative(null)).toBe("never");
    expect(formatRelative(undefined)).toBe("never");
    expect(formatRelative("garbage")).toBe("never");
  });
});

describe("formatDate", () => {
  it("returns em-dash for nullish input", () => {
    expect(formatDate(null)).toBe("—");
    expect(formatDate(undefined)).toBe("—");
    expect(formatDate("not-a-date")).toBe("—");
  });

  it("formats valid ISO dates", () => {
    const out = formatDate("2026-04-28T12:00:00Z");
    expect(out).toMatch(/2026/);
  });
});

describe("truncate", () => {
  it("returns the original string when shorter than max", () => {
    expect(truncate("hello", 10)).toBe("hello");
  });

  it("appends an ellipsis when over max", () => {
    expect(truncate("hello world", 6)).toBe("hello…");
  });
});

describe("percent", () => {
  it("clamps to [0, 100]", () => {
    expect(percent(50, 100)).toBe(50);
    expect(percent(150, 100)).toBe(100);
    expect(percent(-5, 100)).toBe(0);
  });

  it("returns 0 when limit is null or 0", () => {
    expect(percent(50, null)).toBe(0);
    expect(percent(50, 0)).toBe(0);
  });
});

describe("isMac", () => {
  it("returns false in non-browser environments", () => {
    // jsdom navigator.platform varies; this just asserts it doesn't throw.
    expect(typeof isMac()).toBe("boolean");
  });
});
