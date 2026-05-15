import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { useSeedLens } from "./useSeedLens";
import type { DiagramEntity } from "@erdify/domain";

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
