import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { NotFoundPage } from "./NotFoundPage";

describe("NotFoundPage", () => {
  it("renders 페이지를 찾을 수 없습니다", () => {
    render(
      <MemoryRouter>
        <NotFoundPage />
      </MemoryRouter>
    );
    expect(screen.getByText("페이지를 찾을 수 없습니다")).toBeInTheDocument();
  });

  it("renders 홈으로 이동 button", () => {
    render(
      <MemoryRouter>
        <NotFoundPage />
      </MemoryRouter>
    );
    expect(screen.getByRole("button", { name: "홈으로 이동" })).toBeInTheDocument();
  });
});
