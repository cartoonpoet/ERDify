import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { DiagramGrid } from "./DiagramGrid";
import type { DiagramResponse } from "../../../shared/api/diagrams.api";

const diagrams: DiagramResponse[] = [
  {
    id: "d1", projectId: "p1", name: "User Schema",
    content: { entities: [], relationships: [], dialect: "postgresql" },
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  },
  {
    id: "d2", projectId: "p1", name: "Order Schema",
    content: { entities: [], relationships: [], dialect: "mysql" },
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  },
];

const wrap = (ui: React.ReactElement) => render(<MemoryRouter>{ui}</MemoryRouter>);

describe("DiagramGrid", () => {
  it("다이어그램 이름들을 렌더링한다", () => {
    wrap(<DiagramGrid diagrams={diagrams} onCreateDiagram={vi.fn()} />);
    expect(screen.getByText("User Schema")).toBeInTheDocument();
    expect(screen.getByText("Order Schema")).toBeInTheDocument();
  });

  it("'새 ERD 만들기' 카드를 렌더링한다", () => {
    wrap(<DiagramGrid diagrams={diagrams} onCreateDiagram={vi.fn()} />);
    expect(screen.getByText("새 ERD 만들기")).toBeInTheDocument();
  });

  it("'새 ERD 만들기' 클릭 시 onCreateDiagram이 호출된다", () => {
    const onCreateDiagram = vi.fn();
    wrap(<DiagramGrid diagrams={diagrams} onCreateDiagram={onCreateDiagram} />);
    fireEvent.click(screen.getByText("새 ERD 만들기"));
    expect(onCreateDiagram).toHaveBeenCalledTimes(1);
  });

  it("로딩 상태에서 Skeleton을 렌더링한다", () => {
    wrap(<DiagramGrid diagrams={[]} onCreateDiagram={vi.fn()} loading />);
    expect(document.querySelectorAll("[aria-hidden='true']").length).toBeGreaterThan(0);
  });
});
