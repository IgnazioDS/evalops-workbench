import { describe, expect, it, vi, afterEach } from "vitest";
import {
  fetchPublicStats,
  fetchBenchmarkLatest,
  PublicStats,
  PublicBenchmark,
} from "./api";

describe("api.ts", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("fetchPublicStats", () => {
    it("fetches and parses stats from /api/stats", async () => {
      const mockStats: PublicStats = {
        system: "evalops",
        mode: "showcase",
        status: "operational",
        last_deployed_at: "2026-04-28T12:00:00Z",
        last_active_at: "2026-04-28T12:00:00Z",
        metrics: {
          eval_runs_total: 100,
          eval_runs_24h: 10,
        },
        schema_version: 1,
        generated_at: "2026-04-28T12:00:00Z",
      };

      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValueOnce(
          new Response(JSON.stringify(mockStats), { status: 200 })
        )
      );

      const result = await fetchPublicStats();
      expect(result).toEqual(mockStats);
      expect(fetch).toHaveBeenCalledWith("/api/stats", {
        headers: { "Content-Type": "application/json" },
      });
    });

    it("throws on non-ok response", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValueOnce(
          new Response(JSON.stringify({ error: "Not found" }), {
            status: 404,
            statusText: "Not Found",
          })
        )
      );

      await expect(fetchPublicStats()).rejects.toThrow(
        "Public API 404: Not Found"
      );
    });

    it("propagates network errors", async () => {
      const networkError = new Error("Network failed");
      vi.stubGlobal("fetch", vi.fn().mockRejectedValueOnce(networkError));

      await expect(fetchPublicStats()).rejects.toThrow("Network failed");
    });

    it("handles 500 server error", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValueOnce(
          new Response(JSON.stringify({ error: "Internal error" }), {
            status: 500,
            statusText: "Internal Server Error",
          })
        )
      );

      await expect(fetchPublicStats()).rejects.toThrow(
        "Public API 500: Internal Server Error"
      );
    });
  });

  describe("fetchBenchmarkLatest", () => {
    it("fetches and parses benchmark from /api/benchmark-latest", async () => {
      const mockBenchmark: PublicBenchmark = {
        system: "evalops",
        benchmark_type: "standard",
        run_id: "run_001",
        metrics: {
          n_cases: 10,
          baseline_variant: "v1",
          candidate_variant: "v2",
          baseline_pass_rate: 0.5,
          candidate_pass_rate: 1.0,
          baseline_avg_score: 0.5,
          candidate_avg_score: 1.0,
          pass_rate_delta: 0.5,
          avg_score_delta: 0.5,
          regressions: 0,
          improvements: 5,
          gate_verdict: "pass",
        },
        schema_version: 1,
        generated_at: "2026-04-28T12:00:00Z",
      };

      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValueOnce(
          new Response(JSON.stringify(mockBenchmark), { status: 200 })
        )
      );

      const result = await fetchBenchmarkLatest();
      expect(result).toEqual(mockBenchmark);
      expect(fetch).toHaveBeenCalledWith("/api/benchmark-latest", {
        headers: { "Content-Type": "application/json" },
      });
    });

    it("throws on non-ok response", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValueOnce(
          new Response(JSON.stringify({ error: "Not found" }), {
            status: 404,
            statusText: "Not Found",
          })
        )
      );

      await expect(fetchBenchmarkLatest()).rejects.toThrow(
        "Public API 404: Not Found"
      );
    });

    it("propagates network errors", async () => {
      const networkError = new Error("Network timeout");
      vi.stubGlobal("fetch", vi.fn().mockRejectedValueOnce(networkError));

      await expect(fetchBenchmarkLatest()).rejects.toThrow(
        "Network timeout"
      );
    });

    it("handles 503 service unavailable", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValueOnce(
          new Response(JSON.stringify({ error: "Service unavailable" }), {
            status: 503,
            statusText: "Service Unavailable",
          })
        )
      );

      await expect(fetchBenchmarkLatest()).rejects.toThrow(
        "Public API 503: Service Unavailable"
      );
    });

    it("handles null run_id gracefully", async () => {
      const mockBenchmark: PublicBenchmark = {
        system: "evalops",
        benchmark_type: "standard",
        run_id: null,
        metrics: null,
        schema_version: 1,
        generated_at: "2026-04-28T12:00:00Z",
      };

      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValueOnce(
          new Response(JSON.stringify(mockBenchmark), { status: 200 })
        )
      );

      const result = await fetchBenchmarkLatest();
      expect(result.run_id).toBeNull();
      expect(result.metrics).toBeNull();
    });
  });

  describe("fetch error edge cases", () => {
    it("preserves custom headers alongside Content-Type", async () => {
      const mockStats: PublicStats = {
        system: "evalops",
        status: "operational",
        last_deployed_at: null,
        metrics: {},
        schema_version: 1,
        generated_at: "2026-04-28T12:00:00Z",
      };

      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValueOnce(
          new Response(JSON.stringify(mockStats), { status: 200 })
        )
      );

      await fetchPublicStats();
      expect(fetch).toHaveBeenCalledWith(
        "/api/stats",
        expect.objectContaining({
          headers: expect.objectContaining({
            "Content-Type": "application/json",
          }),
        })
      );
    });
  });
});
