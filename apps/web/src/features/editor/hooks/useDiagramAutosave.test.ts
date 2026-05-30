import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createEmptyDiagram } from "@erdify/domain";
import { useEditorStore } from "@/features/editor/store/useEditorStore";
import * as diagramsApi from "@/shared/api/diagrams.api";
import { useDiagramAutosave } from "./useDiagramAutosave";

vi.mock("@/shared/api/diagrams.api");

const resetStore = () =>
  useEditorStore.setState({ document: null, isDirty: false, selectedEntityId: null, isCollaborating: false });

describe("useDiagramAutosave", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    resetStore();
    vi.mocked(diagramsApi.updateDiagram).mockResolvedValue({} as never);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("does not call updateDiagram when isDirty is false", () => {
    const doc = createEmptyDiagram({ id: "d", name: "test", dialect: "postgresql" });
    useEditorStore.setState({ document: doc, isDirty: false });

    renderHook(() => useDiagramAutosave("diag-1", 500));
    act(() => { vi.advanceTimersByTime(1000); });

    expect(diagramsApi.updateDiagram).not.toHaveBeenCalled();
  });

  it("calls updateDiagram after debounce delay when isDirty", async () => {
    const doc = createEmptyDiagram({ id: "d", name: "test", dialect: "postgresql" });

    renderHook(() => useDiagramAutosave("diag-1", 500));

    act(() => {
      useEditorStore.setState({ document: doc, isDirty: true });
    });
    act(() => { vi.advanceTimersByTime(500); });
    await act(async () => {});

    expect(diagramsApi.updateDiagram).toHaveBeenCalledWith("diag-1", { content: doc });
    expect(useEditorStore.getState().isDirty).toBe(false);
  });

  it("resets debounce timer on consecutive changes — saves only once with latest content", async () => {
    const doc1 = createEmptyDiagram({ id: "d", name: "v1", dialect: "postgresql" });
    const doc2 = { ...doc1, name: "v2" };

    renderHook(() => useDiagramAutosave("diag-1", 500));

    act(() => { useEditorStore.setState({ document: doc1, isDirty: true }); });
    act(() => { vi.advanceTimersByTime(200); }); // still within debounce
    act(() => { useEditorStore.setState({ document: doc2, isDirty: true }); });
    act(() => { vi.advanceTimersByTime(500); }); // full delay after last change
    await act(async () => {});

    expect(diagramsApi.updateDiagram).toHaveBeenCalledTimes(1);
    expect(diagramsApi.updateDiagram).toHaveBeenCalledWith("diag-1", { content: doc2 });
  });

  it("pending timer for newer document survives after clearDirty is called (race condition regression)", async () => {
    const doc1 = createEmptyDiagram({ id: "d", name: "v1", dialect: "postgresql" });
    const doc2 = createEmptyDiagram({ id: "d", name: "v2", dialect: "postgresql" });

    // Make the first save take a long time (simulating slow API)
    let resolveFirstSave!: () => void;
    vi.mocked(diagramsApi.updateDiagram)
      .mockImplementationOnce(
        () => new Promise<never>((resolve) => { resolveFirstSave = resolve as () => void; })
      )
      .mockResolvedValue({} as never);

    renderHook(() => useDiagramAutosave("diag-1", 500));

    // First change → timer T1 starts
    act(() => { useEditorStore.setState({ document: doc1, isDirty: true }); });
    act(() => { vi.advanceTimersByTime(500); }); // T1 fires → API call begins (slow)
    await act(async () => {});

    // Second change → timer T2 starts for doc2
    act(() => { useEditorStore.setState({ document: doc2, isDirty: true }); });

    // First API call completes → clearDirty() is called
    await act(async () => { resolveFirstSave(); });
    await act(async () => {});

    // T2 should still fire and save doc2
    act(() => { vi.advanceTimersByTime(500); });
    await act(async () => {});

    expect(diagramsApi.updateDiagram).toHaveBeenCalledTimes(2);
    expect(diagramsApi.updateDiagram).toHaveBeenLastCalledWith("diag-1", { content: doc2 });
  });

  it("협업 중에는 자동저장(HTTP)을 건너뛴다 — 협업 레이어가 지속성 담당", () => {
    const doc = createEmptyDiagram({ id: "d", name: "test", dialect: "postgresql" });
    useEditorStore.setState({ isCollaborating: true });

    renderHook(() => useDiagramAutosave("diag-1", 500));
    act(() => { useEditorStore.setState({ document: doc, isDirty: true }); });
    act(() => { vi.advanceTimersByTime(2000); });

    expect(diagramsApi.updateDiagram).not.toHaveBeenCalled();
  });

  it("협업 중에는 언마운트 flush도 건너뛴다", () => {
    const doc = createEmptyDiagram({ id: "d", name: "test", dialect: "postgresql" });
    useEditorStore.setState({ isCollaborating: true });

    const { unmount } = renderHook(() => useDiagramAutosave("diag-1", 1000));
    act(() => { useEditorStore.setState({ document: doc, isDirty: true }); });
    act(() => { unmount(); });

    expect(diagramsApi.updateDiagram).not.toHaveBeenCalled();
  });

  it("협업이 끊기면(isCollaborating=false) 다시 자동저장한다", async () => {
    const doc = createEmptyDiagram({ id: "d", name: "test", dialect: "postgresql" });
    useEditorStore.setState({ isCollaborating: true });

    renderHook(() => useDiagramAutosave("diag-1", 500));
    act(() => { useEditorStore.setState({ document: doc, isDirty: true }); });
    act(() => { vi.advanceTimersByTime(500); });
    expect(diagramsApi.updateDiagram).not.toHaveBeenCalled();

    // 협업 끊김 → 효과 재실행 → 자동저장 재개
    act(() => { useEditorStore.setState({ isCollaborating: false }); });
    act(() => { vi.advanceTimersByTime(500); });
    await act(async () => {});

    expect(diagramsApi.updateDiagram).toHaveBeenCalledWith("diag-1", { content: doc });
  });

  it("does not call updateDiagram when document is null even if isDirty is true", () => {
    useEditorStore.setState({ document: null, isDirty: true });

    renderHook(() => useDiagramAutosave("diag-1", 500));
    act(() => { vi.advanceTimersByTime(1000); });

    expect(diagramsApi.updateDiagram).not.toHaveBeenCalled();
  });

  it("does not call updateDiagram when diagramId is empty string", () => {
    const doc = createEmptyDiagram({ id: "d", name: "test", dialect: "postgresql" });
    useEditorStore.setState({ document: doc, isDirty: true });

    renderHook(() => useDiagramAutosave("", 500));
    act(() => { vi.advanceTimersByTime(1000); });

    expect(diagramsApi.updateDiagram).not.toHaveBeenCalled();
  });

  it("clearDirty is called after successful save", async () => {
    const doc = createEmptyDiagram({ id: "d", name: "test", dialect: "postgresql" });

    renderHook(() => useDiagramAutosave("diag-1", 500));
    act(() => { useEditorStore.setState({ document: doc, isDirty: true }); });
    act(() => { vi.advanceTimersByTime(500); });
    await act(async () => {});

    expect(useEditorStore.getState().isDirty).toBe(false);
  });

  it("does not mark isDirty=false when updateDiagram rejects (silent failure)", async () => {
    const doc = createEmptyDiagram({ id: "d", name: "test", dialect: "postgresql" });
    vi.mocked(diagramsApi.updateDiagram).mockRejectedValue(new Error("Network error"));

    renderHook(() => useDiagramAutosave("diag-1", 500));
    act(() => { useEditorStore.setState({ document: doc, isDirty: true }); });
    act(() => { vi.advanceTimersByTime(500); });
    await act(async () => {});

    // dirty flag stays true because save failed silently
    expect(useEditorStore.getState().isDirty).toBe(true);
  });

  it("flush-on-unmount fires updateDiagram when unmounting with pending changes", () => {
    const doc = createEmptyDiagram({ id: "d", name: "test", dialect: "postgresql" });

    const { unmount } = renderHook(() => useDiagramAutosave("diag-1", 1000));
    act(() => { useEditorStore.setState({ document: doc, isDirty: true }); });

    // unmount before timer fires — flush-on-unmount effect should save
    act(() => { unmount(); });

    // updateDiagram called at least once (flush-on-unmount)
    expect(diagramsApi.updateDiagram).toHaveBeenCalledWith("diag-1", { content: doc });
  });

  it("uses the default 3000ms delay when delayMs is not provided", async () => {
    const doc = createEmptyDiagram({ id: "d", name: "test", dialect: "postgresql" });

    renderHook(() => useDiagramAutosave("diag-1")); // no explicit delay

    act(() => { useEditorStore.setState({ document: doc, isDirty: true }); });
    act(() => { vi.advanceTimersByTime(2999); });
    expect(diagramsApi.updateDiagram).not.toHaveBeenCalled();

    act(() => { vi.advanceTimersByTime(1); }); // now at exactly 3000ms
    await act(async () => {});
    expect(diagramsApi.updateDiagram).toHaveBeenCalledTimes(1);
  });
});
