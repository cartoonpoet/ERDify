import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CanvasEmptyState } from "./CanvasEmptyState";

describe("CanvasEmptyState", () => {
  it("renders an ERD canvas empty state", () => {
    render(<CanvasEmptyState />);

    expect(screen.getByText("ERD 캔버스 준비 중")).toBeInTheDocument();
  });
});
