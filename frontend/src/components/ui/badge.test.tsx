import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { Badge } from "./badge";

describe("Badge", () => {
  it("renders children", () => {
    const { getByText } = render(<Badge>Active</Badge>);
    expect(getByText("Active")).toBeInTheDocument();
  });

  it("uses the default variant classes when none provided", () => {
    const { container } = render(<Badge>x</Badge>);
    const node = container.firstChild as HTMLElement;
    expect(node.className).toMatch(/border-border-strong/);
  });

  it("switches variant classes when prop provided", () => {
    const { container } = render(<Badge variant="danger">x</Badge>);
    const node = container.firstChild as HTMLElement;
    expect(node.className).toMatch(/border-danger/);
  });
});
