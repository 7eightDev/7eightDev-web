import "@testing-library/jest-dom";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { Button } from "./button";

/**
 * The Button primitive is the single surface for admin (native <button>) and
 * landing (anchors via asChild). The landing guardrail is that an anchor stays
 * an anchor: the hero CTA, the nav links and the mailto links must never be
 * converted into <button>/<input>, and a consumer className must be able to
 * override the primitive's dimensions/font so the two surfaces can keep their
 * own identity through the same implementation (tailwind-merge).
 */

afterEach(cleanup);

describe("Button (ui/button)", () => {
  it("renders a native <button> with data attributes by default", () => {
    render(<Button>Clicca</Button>);
    const btn = screen.getByRole("button", { name: "Clicca" });
    expect(btn.tagName).toBe("BUTTON");
    expect(btn).toHaveAttribute("data-slot", "button");
    expect(btn).toHaveAttribute("data-variant", "default");
    expect(btn).toHaveAttribute("data-size", "default");
  });

  it("honours asChild with an <a>: the anchor stays an anchor (never a <button>/<input>)", () => {
    render(
      <Button asChild variant="ghost">
        <a href="#metodo">Vedi come lavoro</a>
      </Button>,
    );
    const link = screen.getByRole("link", { name: "Vedi come lavoro" });
    expect(link.tagName).toBe("A");
    expect(link).toHaveAttribute("href", "#metodo");
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(link.querySelector("button, input")).toBeNull();
  });

  it("forwards props and events onto the asChild element (mailto link)", () => {
    const onClick = jest.fn();
    render(
      <Button asChild variant="ghost" onClick={onClick}>
        <a href="mailto:info@7eightdev.com">info@7eightdev.com</a>
      </Button>,
    );
    const link = screen.getByRole("link", { name: "info@7eightdev.com" });
    fireEvent.click(link);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("lets a consumer className override the primitive via tailwind-merge", () => {
    render(
      <Button
        asChild
        className="font-mono text-[14px] font-semibold h-auto px-5 py-[13px] rounded-[9px] gap-[9px]"
      >
        <a href="#top">Richiedi un preventivo</a>
      </Button>,
    );
    const link = screen.getByRole("link");
    for (const cls of [
      "font-mono",
      "text-[14px]",
      "font-semibold",
      "h-auto",
      "px-5",
      "py-[13px]",
      "rounded-[9px]",
      "gap-[9px]",
    ]) {
      expect(link.className).toContain(cls);
    }
    for (const stale of ["h-9", "px-3", "rounded-4xl", "text-sm", "font-medium", "gap-1.5"]) {
      expect(link.className).not.toContain(stale);
    }
  });

  it("replaces the ghost hover fill so the landing ghost keeps its transparent hover", () => {
    render(
      <Button asChild variant="ghost" className="hover:bg-transparent dark:hover:bg-transparent">
        <a href="#metodo">Vedi come lavoro</a>
      </Button>,
    );
    const link = screen.getByRole("link");
    expect(link.className).toContain("hover:bg-transparent");
    expect(link.className).toContain("dark:hover:bg-transparent");
    expect(link.className).not.toContain("hover:bg-muted-bg");
  });

  it("lets the landing base restore the full pill (bg-clip-border overrides the primitive's bg-clip-padding)", () => {
    render(
      <Button
        asChild
        className="h-auto px-5 py-[13px] rounded-[9px] bg-clip-border"
      >
        <a href="#cta">Richiedi un preventivo</a>
      </Button>,
    );
    const link = screen.getByRole("link");
    expect(link.className).toContain("bg-clip-border");
    expect(link.className).not.toContain("bg-clip-padding");
  });
});