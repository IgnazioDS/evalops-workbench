import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { Sparkline } from "./sparkline";

describe("Sparkline", () => {
  it("renders nothing for empty data", () => {
    const { container } = render(<Sparkline data={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders nothing for single-point data", () => {
    const { container } = render(<Sparkline data={[42]} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders an svg with two paths for filled charts", () => {
    const { container } = render(
      <Sparkline data={[1, 4, 2, 8, 5]} filled />,
    );
    const svg = container.querySelector("svg");
    expect(svg).not.toBeNull();
    const paths = svg?.querySelectorAll("path");
    // one fill path + one line path
    expect(paths?.length).toBe(2);
  });

  it("draws only one path when filled is false", () => {
    const { container } = render(
      <Sparkline data={[1, 4, 2, 8, 5]} filled={false} dot={false} />,
    );
    const svg = container.querySelector("svg");
    const paths = svg?.querySelectorAll("path");
    expect(paths?.length).toBe(1);
  });

  it("renders the terminator dot when dot=true", () => {
    const { container } = render(
      <Sparkline data={[1, 4, 2, 8, 5]} dot />,
    );
    const circles = container.querySelectorAll("circle");
    expect(circles.length).toBe(1);
  });
});
