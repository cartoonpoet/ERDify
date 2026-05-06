import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { DiagramGrid } from "./DiagramGrid";
import type { DiagramResponse } from "../../../shared/api/diagrams.api";

const makeContent = (dialect: "postgresql" | "mysql") => ({
  format: "erdify.schema.v1" as const,
  id: "doc-1",
  name: "test",
  dialect,
  entities: [],
  relationships: [],
  indexes: [] as [],
  views: [] as [],
  layout: { entityPositions: {} },
  metadata: { revision: 0, stableObjectIds: true as const, createdAt: "", updatedAt: "" },
});

const diagrams: DiagramResponse[] = [
  {
    id: "d1", projectId: "p1", organizationId: "org-1", name: "User Schema",
    content: makeContent("postgresql"), createdBy: "user-1",
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), myRole: "editor" as const,
    shareToken: null, shareExpiresAt: null,
  },
  {
    id: "d2", projectId: "p1", organizationId: "org-1", name: "Order Schema",
    content: makeContent("mysql"), createdBy: "user-2",
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), myRole: "editor" as const,
    shareToken: null, shareExpiresAt: null,
  },
];

const wrap = (ui: React.ReactElement) => render(<MemoryRouter>{ui}</MemoryRouter>);

describe("DiagramGrid", () => {
  it("다이어그램 이름들을 렌더링한다", () => {
    wrap(<DiagramGrid diagrams={diagrams} currentUserId="user-1" onCreateDiagram={vi.fn()} onDeleteDiagram={vi.fn()} />);
    expect(screen.getByText("User Schema")).toBeInTheDocument();
    expect(screen.getByText("Order Schema")).toBeInTheDocument();
  });

  it("'새 ERD 만들기' 카드를 렌더링한다", () => {
    wrap(<DiagramGrid diagrams={diagrams} currentUserId="user-1" onCreateDiagram={vi.fn()} onDeleteDiagram={vi.fn()} />);
    expect(screen.getByText("새 ERD 만들기")).toBeInTheDocument();
  });

  it("'새 ERD 만들기' 클릭 시 onCreateDiagram이 호출된다", () => {
    const onCreateDiagram = vi.fn();
    wrap(<DiagramGrid diagrams={diagrams} currentUserId="user-1" onCreateDiagram={onCreateDiagram} onDeleteDiagram={vi.fn()} />);
    fireEvent.click(screen.getByText("새 ERD 만들기"));
    expect(onCreateDiagram).toHaveBeenCalledTimes(1);
  });

  it("로딩 상태에서 Skeleton을 렌더링한다", () => {
    wrap(<DiagramGrid diagrams={[]} currentUserId={null} onCreateDiagram={vi.fn()} onDeleteDiagram={vi.fn()} loading />);
    expect(document.querySelectorAll("[aria-hidden='true']").length).toBeGreaterThan(0);
  });

  it("filterQuery가 있으면 이름에 해당 문자열이 포함된 다이어그램만 렌더링한다", () => {
    wrap(<DiagramGrid diagrams={diagrams} currentUserId="user-1" onCreateDiagram={vi.fn()} onDeleteDiagram={vi.fn()} filterQuery="User" />);
    expect(screen.getByText("User Schema")).toBeInTheDocument();
    expect(screen.queryByText("Order Schema")).not.toBeInTheDocument();
  });
});
