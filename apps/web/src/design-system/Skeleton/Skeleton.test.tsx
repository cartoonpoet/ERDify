import { render, screen } from "@testing-library/react";
import { Skeleton } from "./index";

vi.mock("./skeleton.css", () => ({ skeleton: "skeleton" }));

describe("Skeleton", () => {
  it("renders with aria-hidden='true'", () => {
    const { container } = render(<Skeleton />);
    const div = container.firstChild as HTMLElement;
    expect(div).toHaveAttribute("aria-hidden", "true");
  });

  it("applies width and height as inline styles", () => {
    const { container } = render(<Skeleton width="200px" height="20px" />);
    const div = container.firstChild as HTMLElement;
    expect(div).toHaveStyle({ width: "200px", height: "20px" });
  });

  it("includes extra className in class list", () => {
    const { container } = render(<Skeleton className="my-skeleton" />);
    const div = container.firstChild as HTMLElement;
    expect(div.className).toContain("skeleton");
    expect(div.className).toContain("my-skeleton");
  });

  it("merges additional style prop with width and height", () => {
    const { container } = render(
      <Skeleton width="100px" height="10px" style={{ backgroundColor: "red" }} />
    );
    const div = container.firstChild as HTMLElement;
    expect(div).toHaveStyle({ width: "100px", height: "10px" });
    expect((div as HTMLElement).style.backgroundColor).toBe("red");
  });
});
