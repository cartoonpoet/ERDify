import { render, screen } from "@testing-library/react";
import { Card } from "./index";

vi.mock("./card.css", () => ({ card: "card", cardHoverable: "cardHoverable" }));

describe("Card", () => {
  it("renders children", () => {
    render(<Card>Hello Card</Card>);
    expect(screen.getByText("Hello Card")).toBeInTheDocument();
  });

  it("does not include cardHoverable class when hoverable is not set", () => {
    const { container } = render(<Card>content</Card>);
    const div = container.firstChild as HTMLElement;
    expect(div.className).toContain("card");
    expect(div.className).not.toContain("cardHoverable");
  });

  it("includes both card and cardHoverable classes when hoverable={true}", () => {
    const { container } = render(<Card hoverable={true}>content</Card>);
    const div = container.firstChild as HTMLElement;
    expect(div.className).toContain("card");
    expect(div.className).toContain("cardHoverable");
  });

  it("merges additional className prop", () => {
    const { container } = render(<Card className="extra-class">content</Card>);
    const div = container.firstChild as HTMLElement;
    expect(div.className).toContain("card");
    expect(div.className).toContain("extra-class");
  });

  it("passes extra HTML props through", () => {
    render(<Card data-testid="my-card">content</Card>);
    expect(screen.getByTestId("my-card")).toBeInTheDocument();
  });
});
