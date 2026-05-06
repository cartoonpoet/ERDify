import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { SearchPanel } from "./SearchPanel";
import { useEditorStore } from "../stores/useEditorStore";

vi.mock("../stores/useEditorStore");
vi.mock("@xyflow/react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@xyflow/react")>();
  return {
    ...actual,
    useReactFlow: vi.fn(() => ({ fitView: vi.fn() })),
  };
});
vi.mock("./search-panel.css", () => ({
  backdrop: "",
  panel: "",
  inputRow: "",
  searchIcon: "",
  input: "",
  closeBtn: "",
  resultList: "",
  resultItem: "",
  resultItemActive: "",
  resultName: "",
  resultMeta: "",
  empty: "",
  footer: "",
}));

const entities = [
  {
    id: "e-1",
    name: "users",
    comment: null,
    columns: [
      {
        id: "c-1",
        name: "id",
        type: "int",
        nullable: false,
        primaryKey: true,
        unique: false,
        defaultValue: null,
        comment: null,
        ordinal: 0,
      },
    ],
  },
  {
    id: "e-2",
    name: "orders",
    comment: "주문 테이블",
    columns: [],
  },
];

const sampleDoc = { entities };

const mockApplyNodeChanges = vi.fn();

const setupStore = () => {
  vi.mocked(useEditorStore).mockImplementation((selector: any) =>
    selector({ document: sampleDoc, nodes: [], applyNodeChanges: mockApplyNodeChanges })
  );
};

describe("SearchPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupStore();
  });

  it("shows all entities when query is empty", () => {
    render(<SearchPanel onClose={vi.fn()} />);
    expect(screen.getByText("users")).toBeInTheDocument();
    expect(screen.getByText("orders")).toBeInTheDocument();
  });

  it('typing "user" filters to only show "users"', () => {
    render(<SearchPanel onClose={vi.fn()} />);
    const input = screen.getByPlaceholderText(/테이블 검색/);
    fireEvent.change(input, { target: { value: "user" } });
    expect(screen.getByText("users")).toBeInTheDocument();
    expect(screen.queryByText("orders")).not.toBeInTheDocument();
  });

  it('shows "검색 결과 없음" when no matches', () => {
    render(<SearchPanel onClose={vi.fn()} />);
    const input = screen.getByPlaceholderText(/테이블 검색/);
    fireEvent.change(input, { target: { value: "zzznomatch" } });
    expect(screen.getByText("검색 결과 없음")).toBeInTheDocument();
  });

  it("pressing Escape calls onClose", () => {
    const onClose = vi.fn();
    render(<SearchPanel onClose={onClose} />);
    const input = screen.getByPlaceholderText(/테이블 검색/);
    fireEvent.keyDown(input, { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
  });

  it("clicking a result calls applyNodeChanges and onClose", () => {
    const onClose = vi.fn();
    render(<SearchPanel onClose={onClose} />);
    const usersBtn = screen.getByText("users").closest("button")!;
    fireEvent.click(usersBtn);
    expect(mockApplyNodeChanges).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });
});
