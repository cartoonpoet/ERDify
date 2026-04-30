import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createEmptyDiagram } from "@erdify/domain";
import { useEditorStore } from "../stores/useEditorStore";
import * as diagramsApi from "../../../shared/api/diagrams.api";
import { useDiagramAutosave } from "./useDiagramAutosave";

vi.mock("../../../shared/api/diagrams.api");

const resetStore = () =>
  useEditorStore.setState({ document: null, isDirty: false, selectedEntityId: null });

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
});
