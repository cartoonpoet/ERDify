import { renderHook, act, render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { useSeedLens } from "./useSeedLens";
import type { DiagramEntity } from "@erdify/domain";
import { SeedLens } from "./index";

global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

vi.mock("@tanstack/react-virtual", () => ({
  useVirtualizer: ({ count }: { count: number }) => ({
    getVirtualItems: () =>
      Array.from({ length: count }, (_, i) => ({ index: i, start: i * 28, size: 28 })),
    getTotalSize: () => count * 28,
  }),
}));

const makeEntity = (seedData: Record<string, string>[] = []): DiagramEntity =>
  ({
    id: "e1",
    name: "users",
    columns: [
      { id: "c1", name: "id", type: "INT", ordinal: 0, primaryKey: true, nullable: false, unique: false, autoIncrement: false, comment: "" },
      { id: "c2", name: "name", type: "VARCHAR(100)", ordinal: 1, primaryKey: false, nullable: true, unique: false, autoIncrement: false, comment: "" },
    ],
    seedData,
    indexes: [],
    schema: null,
    comment: "",
    x: 0, y: 0,
  } as unknown as DiagramEntity);

describe("SeedLens 컴포넌트", () => {
  const makeComponentEntity = (seedData: Record<string, string>[] = []) =>
    ({
      id: "e1",
      name: "users",
      columns: [
        { id: "c1", name: "id", type: "INT", ordinal: 0, primaryKey: true, nullable: false, unique: false, autoIncrement: false, comment: "" },
        { id: "c2", name: "name", type: "VARCHAR(100)", ordinal: 1, primaryKey: false, nullable: true, unique: false, autoIncrement: false, comment: "" },
      ],
      seedData,
      indexes: [],
      schema: null,
      comment: "",
      x: 0, y: 0,
    } as unknown as DiagramEntity);

  const getTriggerBtn = () => screen.getByRole("button", { name: "시드 데이터 편집" });

  it("행이 없을 때 '+ 추가' 버튼이 보인다", () => {
    render(<SeedLens entity={makeComponentEntity()} onCommit={vi.fn()} />);
    expect(getTriggerBtn()).toHaveTextContent("+ 추가");
  });

  it("행이 있을 때 '✎ 편집 (N행)' 버튼이 보인다", () => {
    render(<SeedLens entity={makeComponentEntity([{ c1: "1" }])} onCommit={vi.fn()} />);
    expect(getTriggerBtn()).toHaveTextContent("편집");
    expect(getTriggerBtn()).toHaveTextContent("1행");
  });

  it("버튼 클릭 시 렌즈 패널이 열린다", () => {
    render(<SeedLens entity={makeComponentEntity()} onCommit={vi.fn()} />);
    fireEvent.click(getTriggerBtn());
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("users")).toBeInTheDocument();
  });

  it("완료 버튼 클릭 시 렌즈가 닫힌다", () => {
    render(<SeedLens entity={makeComponentEntity()} onCommit={vi.fn()} />);
    fireEvent.click(getTriggerBtn());
    fireEvent.click(screen.getByRole("button", { name: "완료" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("Esc 키로 렌즈가 닫힌다", () => {
    render(<SeedLens entity={makeComponentEntity()} onCommit={vi.fn()} />);
    fireEvent.click(getTriggerBtn());
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("행 추가 → 셀 입력 → 닫기 시 onCommit이 호출된다", () => {
    const onCommit = vi.fn();
    render(<SeedLens entity={makeComponentEntity()} onCommit={onCommit} />);
    fireEvent.click(getTriggerBtn());
    fireEvent.click(screen.getByRole("button", { name: "+ 행 추가" }));
    const cells = screen.getAllByPlaceholderText("NULL");
    fireEvent.change(cells[0]!, { target: { value: "42" } });
    fireEvent.click(screen.getByRole("button", { name: "완료" }));
    expect(onCommit).toHaveBeenCalledWith([expect.objectContaining({ c1: "42" })]);
  });
});

describe("useSeedLens", () => {
  it("open 시 entity.seedData를 로컬로 복사한다", () => {
    const entity = makeEntity([{ c1: "1", c2: "Alice" }]);
    const onCommit = vi.fn();
    const { result } = renderHook(() => useSeedLens(entity, onCommit));

    act(() => result.current.open());

    expect(result.current.isOpen).toBe(true);
    expect(result.current.localRows).toEqual([{ c1: "1", c2: "Alice" }]);
    expect(result.current.localRows[0]).not.toBe(entity.seedData![0]);
  });

  it("close 시 변경이 있으면 onCommit을 호출한다", () => {
    const entity = makeEntity([{ c1: "1" }]);
    const onCommit = vi.fn();
    const { result } = renderHook(() => useSeedLens(entity, onCommit));

    act(() => result.current.open());
    act(() => result.current.updateCell(0, "c2", "Alice"));
    act(() => result.current.close());

    expect(onCommit).toHaveBeenCalledWith([{ c1: "1", c2: "Alice" }]);
  });

  it("close 시 변경이 없으면 onCommit을 호출하지 않는다", () => {
    const entity = makeEntity([{ c1: "1" }]);
    const onCommit = vi.fn();
    const { result } = renderHook(() => useSeedLens(entity, onCommit));

    act(() => result.current.open());
    act(() => result.current.close());

    expect(onCommit).not.toHaveBeenCalled();
  });

  it("addRow는 빈 행을 추가한다", () => {
    const entity = makeEntity([]);
    const onCommit = vi.fn();
    const { result } = renderHook(() => useSeedLens(entity, onCommit));

    act(() => result.current.open());
    act(() => result.current.addRow());

    expect(result.current.localRows).toHaveLength(1);
  });

  it("removeRow는 해당 인덱스 행을 제거한다", () => {
    const entity = makeEntity([{ c1: "1" }, { c1: "2" }]);
    const onCommit = vi.fn();
    const { result } = renderHook(() => useSeedLens(entity, onCommit));

    act(() => result.current.open());
    act(() => result.current.removeRow(0));

    expect(result.current.localRows).toEqual([{ c1: "2" }]);
  });
});
