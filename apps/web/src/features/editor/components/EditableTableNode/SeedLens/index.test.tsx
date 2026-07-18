import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { DiagramEntity } from "@erdify/domain";
import { SeedLens } from "./index";
import { useSeedLens } from "./useSeedLens";

// backdrop만 고유 클래스명을 부여해 테스트에서 선택할 수 있게 한다.
// (backdrop에는 role/data-testid가 없어 텍스트/역할 쿼리로 특정할 수 없음)
vi.mock("./seed-lens.css", () => ({
  backdrop: "mock-backdrop",
  panel: "",
  panelHeader: "",
  panelTitle: "",
  panelBadge: "",
  panelCloseBtn: "",
  colHeaderRow: "",
  rowNumHeader: "",
  colHeader: "",
  colHeaderDeletePlaceholder: "",
  scrollArea: "",
  virtualContainer: "",
  gridRow: "",
  rowNum: "",
  cell: "",
  rowDeleteBtn: "",
  panelFooter: "",
  addRowBtn: "",
  rowCount: "",
  kbdHint: "",
  doneBtn: "",
  seedBadge: "",
  seedEditBtn: "",
}));

vi.mock("./SeedLensGrid", () => ({
  SeedLensGrid: () => <div data-testid="mock-grid" />,
}));

vi.mock("./useSeedLens");

const mockedUseSeedLens = vi.mocked(useSeedLens);

const makeEntity = (seedData: Record<string, string>[] = []): DiagramEntity =>
  ({
    id: "e1",
    name: "users",
    logicalName: null,
    comment: null,
    color: null,
    columns: [
      {
        id: "c1",
        name: "id",
        type: "INT",
        ordinal: 0,
        primaryKey: true,
        nullable: false,
        unique: false,
        defaultValue: null,
        comment: null,
      },
    ],
    seedData,
  }) as unknown as DiagramEntity;

const makeHookReturn = (overrides: Partial<ReturnType<typeof useSeedLens>> = {}) => ({
  isOpen: false,
  localRows: [],
  open: vi.fn(),
  close: vi.fn(),
  updateCell: vi.fn(),
  addRow: vi.fn(),
  removeRow: vi.fn(),
  ...overrides,
});

describe("SeedLens", () => {
  beforeEach(() => {
    mockedUseSeedLens.mockReset();
  });

  it("시드 데이터가 없으면 '+ 추가' 트리거 버튼을 렌더링한다", () => {
    mockedUseSeedLens.mockReturnValue(makeHookReturn());
    render(<SeedLens entity={makeEntity()} onCommit={vi.fn()} />);

    expect(screen.getByRole("button", { name: "시드 데이터 편집" })).toHaveTextContent("+ 추가");
  });

  it("entity.seedData에 N개 행이 있으면 '✎ 편집 (N행)' 트리거 버튼을 렌더링한다", () => {
    mockedUseSeedLens.mockReturnValue(makeHookReturn());
    render(
      <SeedLens
        entity={makeEntity([{ c1: "1" }, { c1: "2" }, { c1: "3" }])}
        onCommit={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "시드 데이터 편집" })).toHaveTextContent("✎ 편집 (3행)");
  });

  it("트리거 버튼 클릭 시 open()을 호출한다", () => {
    const open = vi.fn();
    mockedUseSeedLens.mockReturnValue(makeHookReturn({ open }));
    render(<SeedLens entity={makeEntity()} onCommit={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "시드 데이터 편집" }));

    expect(open).toHaveBeenCalledOnce();
  });

  it("isOpen이 true이면 패널(role=dialog)이 렌더링되고 엔티티 이름/뱃지가 표시된다", () => {
    mockedUseSeedLens.mockReturnValue(makeHookReturn({ isOpen: true }));
    render(<SeedLens entity={makeEntity()} onCommit={vi.fn()} />);

    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveAttribute("aria-label", "users 시드 데이터 편집");
    expect(screen.getByText("users")).toBeInTheDocument();
    expect(screen.getByText("Seed Lens")).toBeInTheDocument();
  });

  it("isOpen이 false이면 패널이 렌더링되지 않는다", () => {
    mockedUseSeedLens.mockReturnValue(makeHookReturn({ isOpen: false }));
    render(<SeedLens entity={makeEntity()} onCommit={vi.fn()} />);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("열려 있을 때 Escape 키를 누르면 close()가 호출된다", () => {
    const close = vi.fn();
    mockedUseSeedLens.mockReturnValue(makeHookReturn({ isOpen: true, close }));
    render(<SeedLens entity={makeEntity()} onCommit={vi.fn()} />);

    fireEvent.keyDown(document, { key: "Escape" });

    expect(close).toHaveBeenCalledOnce();
  });

  it("backdrop 클릭 시 close()가 호출된다", () => {
    const close = vi.fn();
    mockedUseSeedLens.mockReturnValue(makeHookReturn({ isOpen: true, close }));
    render(<SeedLens entity={makeEntity()} onCommit={vi.fn()} />);

    const backdrop = document.body.querySelector(".mock-backdrop");
    expect(backdrop).not.toBeNull();
    fireEvent.click(backdrop as Element);

    expect(close).toHaveBeenCalledOnce();
  });

  it("✕ 닫기 버튼 클릭 시 close()가 호출된다", () => {
    const close = vi.fn();
    mockedUseSeedLens.mockReturnValue(makeHookReturn({ isOpen: true, close }));
    render(<SeedLens entity={makeEntity()} onCommit={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "닫기" }));

    expect(close).toHaveBeenCalledOnce();
  });

  it("완료 버튼 클릭 시 close()가 호출된다", () => {
    const close = vi.fn();
    mockedUseSeedLens.mockReturnValue(makeHookReturn({ isOpen: true, close }));
    render(<SeedLens entity={makeEntity()} onCommit={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "완료" }));

    expect(close).toHaveBeenCalledOnce();
  });

  it("+ 행 추가 버튼 클릭 시 addRow()가 호출된다", () => {
    const addRow = vi.fn();
    mockedUseSeedLens.mockReturnValue(makeHookReturn({ isOpen: true, addRow }));
    render(<SeedLens entity={makeEntity()} onCommit={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "+ 행 추가" }));

    expect(addRow).toHaveBeenCalledOnce();
  });
});
