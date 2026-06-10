import { describe, expect, it } from "vitest";
import { PROJECT, ProjectSpec } from "./project";

describe("project.ts", () => {
  describe("PROJECT", () => {
    it("has all required fields", () => {
      expect(PROJECT).toHaveProperty("slug");
      expect(PROJECT).toHaveProperty("name");
      expect(PROJECT).toHaveProperty("category");
      expect(PROJECT).toHaveProperty("track");
      expect(PROJECT).toHaveProperty("stage");
      expect(PROJECT).toHaveProperty("summary");
      expect(PROJECT).toHaveProperty("problem");
      expect(PROJECT).toHaveProperty("users");
      expect(PROJECT).toHaveProperty("stack");
      expect(PROJECT).toHaveProperty("why_now");
      expect(PROJECT).toHaveProperty("mvp");
      expect(PROJECT).toHaveProperty("github_url");
      expect(PROJECT).toHaveProperty("system_slug");
      expect(PROJECT).toHaveProperty("eleventh_url");
      expect(PROJECT).toHaveProperty("live_url");
      expect(PROJECT).toHaveProperty("fleet_url");
      expect(PROJECT).toHaveProperty("builder");
    });

    it("has correct slug and name values", () => {
      expect(PROJECT.slug).toBe("evalops-workbench");
      expect(PROJECT.name).toBe("EvalOps Workbench");
    });

    it("has well-formed URLs", () => {
      expect(PROJECT.github_url).toMatch(/^https:\/\//);
      expect(PROJECT.eleventh_url).toMatch(/^https:\/\//);
      expect(PROJECT.live_url).toMatch(/^https:\/\//);
      expect(PROJECT.fleet_url).toMatch(/^https:\/\//);
    });

    it("has non-empty stack array", () => {
      expect(Array.isArray(PROJECT.stack)).toBe(true);
      expect(PROJECT.stack.length).toBeGreaterThan(0);
      expect(PROJECT.stack).toContain("Python");
    });

    it("has non-empty mvp array", () => {
      expect(Array.isArray(PROJECT.mvp)).toBe(true);
      expect(PROJECT.mvp.length).toBeGreaterThan(0);
    });

    it("has valid category and track", () => {
      expect(PROJECT.category).toBe("Developer Tool");
      expect(PROJECT.track).toBe("LLM");
    });

    it("has system_slug matching API response field", () => {
      expect(PROJECT.system_slug).toBe("evalops");
    });

    it("has builder attribution", () => {
      expect(PROJECT.builder).toBeTruthy();
      expect(typeof PROJECT.builder).toBe("string");
    });
  });

  describe("ProjectSpec interface", () => {
    it("enforces required string fields", () => {
      const testProject: ProjectSpec = {
        slug: "test-project",
        name: "Test Project",
        category: "Category",
        track: "Track",
        stage: "Stage",
        summary: "A summary",
        problem: "A problem",
        users: "Users",
        stack: ["Stack"],
        why_now: "Why now",
        mvp: ["MVP 1"],
        github_url: "https://github.com/test",
        system_slug: "test",
        eleventh_url: "https://eleventh.dev",
        live_url: "https://test.eleventh.dev",
        fleet_url: "https://eleventh.dev/work",
        builder: "Test Builder",
      };

      expect(testProject.slug).toBeDefined();
      expect(testProject.name).toBeDefined();
      expect(testProject.system_slug).toBeDefined();
    });
  });
});
