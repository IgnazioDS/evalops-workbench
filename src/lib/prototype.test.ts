import { describe, expect, it } from "vitest";
import {
  PROTOTYPE_METRICS,
  PROTOTYPE_CASES,
  PROTOTYPE_COMMANDS,
  PROTOTYPE_REPORT,
  PrototypeCase,
  PrototypeMetric,
} from "./prototype";

describe("prototype.ts", () => {
  describe("PROTOTYPE_METRICS", () => {
    it("exports a non-empty array", () => {
      expect(Array.isArray(PROTOTYPE_METRICS)).toBe(true);
      expect(PROTOTYPE_METRICS.length).toBeGreaterThan(0);
    });

    it("contains well-formed metric objects", () => {
      PROTOTYPE_METRICS.forEach((metric: PrototypeMetric) => {
        expect(metric).toHaveProperty("label");
        expect(metric).toHaveProperty("baseline");
        expect(metric).toHaveProperty("candidate");
        expect(metric).toHaveProperty("delta");
        expect(typeof metric.label).toBe("string");
        expect(typeof metric.baseline).toBe("string");
        expect(typeof metric.candidate).toBe("string");
        expect(typeof metric.delta).toBe("string");
      });
    });

    it("has expected metrics", () => {
      const labels = PROTOTYPE_METRICS.map((m) => m.label);
      expect(labels).toContain("Average score");
      expect(labels).toContain("Pass rate");
      expect(labels).toContain("Regressions");
      expect(labels).toContain("Gate verdict");
    });
  });

  describe("PROTOTYPE_CASES", () => {
    it("exports a non-empty array", () => {
      expect(Array.isArray(PROTOTYPE_CASES)).toBe(true);
      expect(PROTOTYPE_CASES.length).toBeGreaterThan(0);
    });

    it("contains well-formed case objects", () => {
      PROTOTYPE_CASES.forEach((testCase: PrototypeCase) => {
        expect(testCase).toHaveProperty("caseId");
        expect(testCase).toHaveProperty("category");
        expect(testCase).toHaveProperty("baselineScore");
        expect(testCase).toHaveProperty("candidateScore");
        expect(testCase).toHaveProperty("delta");
        expect(testCase).toHaveProperty("outcome");
        expect(testCase).toHaveProperty("baselineMissing");
        expect(testCase).toHaveProperty("candidateMissing");
        expect(testCase).toHaveProperty("note");

        expect(typeof testCase.caseId).toBe("string");
        expect(typeof testCase.category).toBe("string");
        expect(typeof testCase.baselineScore).toBe("number");
        expect(typeof testCase.candidateScore).toBe("number");
        expect(typeof testCase.delta).toBe("number");
        expect(["regression", "improvement", "stable"]).toContain(
          testCase.outcome
        );
        expect(Array.isArray(testCase.baselineMissing)).toBe(true);
        expect(Array.isArray(testCase.candidateMissing)).toBe(true);
        expect(typeof testCase.note).toBe("string");
      });
    });

    it("has cases with valid delta calculations", () => {
      PROTOTYPE_CASES.forEach((testCase) => {
        const expectedDelta = testCase.candidateScore - testCase.baselineScore;
        expect(Math.abs(testCase.delta - expectedDelta)).toBeLessThan(0.001);
      });
    });

    it("has cases with correct outcome classification", () => {
      PROTOTYPE_CASES.forEach((testCase) => {
        if (testCase.delta > 0.001) {
          expect(testCase.outcome).toBe("improvement");
        } else if (testCase.delta < -0.001) {
          expect(testCase.outcome).toBe("regression");
        } else {
          expect(testCase.outcome).toBe("stable");
        }
      });
    });

    it("has at least one case of each category", () => {
      const categories = new Set(PROTOTYPE_CASES.map((c) => c.category));
      expect(categories.size).toBeGreaterThan(0);
    });
  });

  describe("PROTOTYPE_COMMANDS", () => {
    it("exports an object with expected command keys", () => {
      expect(PROTOTYPE_COMMANDS).toHaveProperty("baseline");
      expect(PROTOTYPE_COMMANDS).toHaveProperty("candidate");
      expect(PROTOTYPE_COMMANDS).toHaveProperty("compare");
      expect(PROTOTYPE_COMMANDS).toHaveProperty("gate");
      expect(PROTOTYPE_COMMANDS).toHaveProperty("inspect");
    });

    it("contains non-empty command strings", () => {
      Object.values(PROTOTYPE_COMMANDS).forEach((cmd) => {
        expect(typeof cmd).toBe("string");
        expect(cmd.length).toBeGreaterThan(0);
      });
    });

    it("has commands that reference evalops-workbench", () => {
      Object.values(PROTOTYPE_COMMANDS).forEach((cmd) => {
        expect(cmd).toContain("evalops-workbench");
      });
    });

    it("baseline and candidate run different variants", () => {
      expect(PROTOTYPE_COMMANDS.baseline).toContain("prompt_v1");
      expect(PROTOTYPE_COMMANDS.candidate).toContain("prompt_v2");
    });
  });

  describe("PROTOTYPE_REPORT", () => {
    it("is a non-empty string", () => {
      expect(typeof PROTOTYPE_REPORT).toBe("string");
      expect(PROTOTYPE_REPORT.length).toBeGreaterThan(0);
    });

    it("contains gate verdict", () => {
      expect(PROTOTYPE_REPORT).toContain("PASS");
    });

    it("contains threshold information", () => {
      expect(PROTOTYPE_REPORT).toContain("Max regressions");
      expect(PROTOTYPE_REPORT).toContain("Max score drop");
      expect(PROTOTYPE_REPORT).toContain("Max pass-rate drop");
    });

    it("contains comparison details", () => {
      expect(PROTOTYPE_REPORT).toContain("Base run");
      expect(PROTOTYPE_REPORT).toContain("Candidate run");
      expect(PROTOTYPE_REPORT).toContain("Average score delta");
      expect(PROTOTYPE_REPORT).toContain("Pass-rate delta");
    });

    it("has markdown formatting", () => {
      expect(PROTOTYPE_REPORT).toContain("#");
      expect(PROTOTYPE_REPORT).toContain("-");
    });
  });
});
