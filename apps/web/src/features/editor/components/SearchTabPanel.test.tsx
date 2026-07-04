import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { SearchTabPanel } from "./SearchTabPanel";
import { useEditorStore } from "@/features/editor/store/useEditorStore";

vi.mock("@/features/editor/store/useEditorStore");

const mockFitView = vi.fn();
vi.mock("@xyflow/react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@xyflow/react")>();
  return {
    ...actual,
    useReactFlow: vi.fn(() => ({ fitView: mockFitView })),
  };
});

vi.mock("./search-tab-panel.css", () => ({
  container: "",
  inputRow: "",
  searchIcon: "",
  input: "",
  resultList: "",
  resultItem: "",
  resultItemActive: "",
  resultTypeIcon: "",
  resultTextBox: "",
  resultName: "",
  resultSub: "",
  resultMeta: "",
  footer: "",
  empty: "",
}));

const makeColumn = (id: string, name: string) => ({
  id,
  name,
  type: "varchar",
  nullable: false,
  primaryKey: false,
  unique: false,
  defaultValue: null,
  comment: null,
  ordinal: 0,
});

const entities = [
  {
    id: "e-1",
    name: "users",
    logicalName: null,
    comment: null,
    color: null,
    columns: [makeColumn("c-1", "id"), makeColumn("c-2", "Email")],
  },
  {
    id: "e-2",
    name: "orders",
    logicalName: null,
    comment: "주문 테이블",
    color: null,
    columns: [makeColumn("c-3", "user_id")],
  },
];

const nodes = [{ id: "e-1" }, { id: "e-2" }];

const mockApplyNodeChanges = vi.fn();
const mockSetFlashingColumnId = vi.fn();

const setupStore = () => {
  vi.mocked(useEditorStore).mockImplementation((selector: any) =>
    selector({
      document: { entities },
      nodes,
      applyNodeChanges: mockApplyNodeChanges,
      setFlashingColumnId: mockSetFlashingColumnId,
    })
  );
};

describe("SearchTabPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupStore();
  });

  it("테이블명 매칭 결과를 표시하고 선택 시 fitView/applyNodeChanges(select)를 호출한다", () => {
    render(<SearchTabPanel />);
    const input = screen.getByPlaceholderText(/테이블·컬럼 검색/);
    fireEvent.change(input, { target: { value: "user" } });

    const usersBtn = screen.getByText("users").closest("button")!;
    fireEvent.click(usersBtn);

    expect(mockApplyNodeChanges).toHaveBeenCalledWith([
      { type: "select", id: "e-1", selected: true },
      { type: "select", id: "e-2", selected: false },
    ]);
    expect(mockFitView).toHaveBeenCalledWith({
      nodes: [{ id: "e-1" }],
      duration: 400,
      maxZoom: 1.2,
      padding: 0.4,
    });
  });

  it('컬럼명 부분일치·대소문자무시 시 "테이블 > 컬럼" 항목을 표시한다', () => {
    render(<SearchTabPanel />);
    const input = screen.getByPlaceholderText(/테이블·컬럼 검색/);
    fireEvent.change(input, { target: { value: "mail" } });

    expect(screen.getByText("Email")).toBeInTheDocument();
    expect(screen.getByText("users > Email")).toBeInTheDocument();
  });

  it("컬럼 항목 선택 시 setFlashingColumnId(columnId)를 호출한다", () => {
    render(<SearchTabPanel />);
    const input = screen.getByPlaceholderText(/테이블·컬럼 검색/);
    fireEvent.change(input, { target: { value: "mail" } });

    const emailBtn = screen.getByText("Email").closest("button")!;
    fireEvent.click(emailBtn);

    expect(mockSetFlashingColumnId).toHaveBeenCalledWith("c-2");
  });

  it('매칭 결과가 없으면 "검색 결과 없음"을 표시한다', () => {
    render(<SearchTabPanel />);
    const input = screen.getByPlaceholderText(/테이블·컬럼 검색/);
    fireEvent.change(input, { target: { value: "zzznomatch" } });

    expect(screen.getByText("검색 결과 없음")).toBeInTheDocument();
  });
});
