import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Button } from "./button";

describe("Button", () => {
  it("renders children", () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole("button", { name: /click me/i })).toBeInTheDocument();
  });

  it("fires onClick when clicked", async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Tap</Button>);
    await userEvent.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("applies the primary variant classes", () => {
    render(
      <Button variant="primary" data-testid="btn">
        Primary
      </Button>,
    );
    const btn = screen.getByTestId("btn");
    expect(btn.className).toContain("bg-brand");
  });

  it("applies the danger variant classes", () => {
    render(
      <Button variant="danger" data-testid="btn">
        Delete
      </Button>,
    );
    const btn = screen.getByTestId("btn");
    expect(btn.className).toContain("bg-danger");
  });

  it("respects asChild and renders the slot", () => {
    render(
      <Button asChild>
        <a href="/test">Link</a>
      </Button>,
    );
    const link = screen.getByRole("link", { name: /link/i });
    expect(link).toHaveAttribute("href", "/test");
  });

  it("disables when disabled is set", () => {
    render(<Button disabled>Off</Button>);
    expect(screen.getByRole("button")).toBeDisabled();
  });
});
