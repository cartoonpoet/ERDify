import { describe, it, expect, beforeEach } from "vitest";
import { useEditorStore } from "./useEditorStore";
import { createEmptyDiagram } from "@erdify/domain";

const emptyDoc = () =>
  createEmptyDiagram({ id: "test-id", name: "test", dialect: "postgresql" });

const reset = () =>
  useEditorStore.setState({
    document: null,
    isDirty: false,
    selectedEntityId: null,
    viewport: { x: 0, y: 0, zoom: 1 },
    flashingEntityId: null,
  });

describe("useEditorStore", () => {
  beforeEach(reset);

  it("setDocument loads document and clears isDirty", () => {
    const doc = emptyDoc();
    useEditorStore.getState().setDocument(doc);
    expect(useEditorStore.getState().document).toBe(doc);
    expect(useEditorStore.getState().isDirty).toBe(false);
  });

  it("applyCommand transforms document and sets isDirty", () => {
    const doc = emptyDoc();
    useEditorStore.getState().setDocument(doc);
    useEditorStore.getState().applyCommand((d) => ({ ...d, name: "renamed" }));
    expect(useEditorStore.getState().document?.name).toBe("renamed");
    expect(useEditorStore.getState().isDirty).toBe(true);
  });

  it("applyCommand is a no-op when document is null", () => {
    useEditorStore.getState().applyCommand((d) => ({ ...d, name: "noop" }));
    expect(useEditorStore.getState().document).toBeNull();
    expect(useEditorStore.getState().isDirty).toBe(false);
  });

  it("clearDirty resets isDirty to false", () => {
    const doc = emptyDoc();
    useEditorStore.getState().setDocument(doc);
    useEditorStore.getState().applyCommand((d) => d);
    expect(useEditorStore.getState().isDirty).toBe(true);
    useEditorStore.getState().clearDirty();
    expect(useEditorStore.getState().isDirty).toBe(false);
  });

  it("setSelectedEntity updates and clears selectedEntityId", () => {
    useEditorStore.getState().setSelectedEntity("entity-abc");
    expect(useEditorStore.getState().selectedEntityId).toBe("entity-abc");
    useEditorStore.getState().setSelectedEntity(null);
    expect(useEditorStore.getState().selectedEntityId).toBeNull();
  });
});

describe("useEditorStore — 우측 사이드바 UI 슬라이스", () => {
  beforeEach(() => {
    useEditorStore.setState({
      rightSidebarActiveTab: 0,
      rightSidebarPanelOpen: true,
    });
  });

  it("초기 rightSidebarPanelOpen은 true", () => {
    expect(useEditorStore.getState().rightSidebarPanelOpen).toBe(true);
  });

  it("setRightSidebarPanelOpen(false)으로 패널을 닫는다", () => {
    useEditorStore.getState().setRightSidebarPanelOpen(false);
    expect(useEditorStore.getState().rightSidebarPanelOpen).toBe(false);
  });

  it("setRightSidebarPanelOpen(true)으로 패널을 다시 연다", () => {
    useEditorStore.getState().setRightSidebarPanelOpen(false);
    useEditorStore.getState().setRightSidebarPanelOpen(true);
    expect(useEditorStore.getState().rightSidebarPanelOpen).toBe(true);
  });

  it("setRightSidebarActiveTab으로 활성 탭을 변경한다", () => {
    useEditorStore.getState().setRightSidebarActiveTab(2);
    expect(useEditorStore.getState().rightSidebarActiveTab).toBe(2);
  });

  it("openSearchTab은 탭 1(검색)로 전환하고 패널을 연다", () => {
    useEditorStore.setState({ rightSidebarActiveTab: 0, rightSidebarPanelOpen: false });
    useEditorStore.getState().openSearchTab();
    expect(useEditorStore.getState().rightSidebarActiveTab).toBe(1);
    expect(useEditorStore.getState().rightSidebarPanelOpen).toBe(true);
  });
});

describe("useEditorStore — viewport / flashingEntityId", () => {
  beforeEach(reset);

  it("setViewport updates viewport state", () => {
    useEditorStore.getState().setViewport({ x: 100, y: 200, zoom: 1.5 });
    expect(useEditorStore.getState().viewport).toEqual({ x: 100, y: 200, zoom: 1.5 });
  });

  it("setFlashingEntityId updates and clears flashingEntityId", () => {
    useEditorStore.getState().setFlashingEntityId("entity-abc");
    expect(useEditorStore.getState().flashingEntityId).toBe("entity-abc");
    useEditorStore.getState().setFlashingEntityId(null);
    expect(useEditorStore.getState().flashingEntityId).toBeNull();
  });
});
