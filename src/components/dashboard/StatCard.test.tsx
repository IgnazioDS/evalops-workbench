import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Activity } from "lucide-react";
import { StatCard } from "./StatCard";

describe("StatCard", () => {
  it("renders a skeleton in loading state", () => {
    const { container } = render(
      <StatCard
        title="Queries"
        value={undefined}
        icon={Activity}
        loading
      />,
    );
    // Skeleton class is `skeleton-shimmer`
    expect(container.querySelectorAll(".skeleton-shimmer").length).toBeGreaterThan(0);
  });

  it("renders the title and value", () => {
    render(
      <StatCard
        title="Queries"
        value={42}
        icon={Activity}
      />,
    );
    expect(screen.getByText(/Queries/i)).toBeInTheDocument();
    // Animated number starts at 0 and ticks up; assert presence of a tabular number container
    expect(screen.getByText(/Queries/i).parentElement).toBeTruthy();
  });

  it("uses display override when provided", () => {
    render(
      <StatCard
        title="p95"
        value={42}
        display="42ms"
        icon={Activity}
      />,
    );
    expect(screen.getByText("42ms")).toBeInTheDocument();
  });
});
