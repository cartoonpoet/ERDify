import { describe, it, expect, beforeEach } from "vitest";
import { useEditorStore } from "./useEditorStore";
import { createEmptyDiagram } from "@erdify/domain";

const emptyDoc = () =>
  createEmptyDiagram({ id: "test-id", name: "test", dialect: "postgresql" });

const reset = () =>
  useEditorStore.setState({ document: null, isDirty: false, selectedEntityId: null });

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
