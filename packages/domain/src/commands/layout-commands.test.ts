import { createEmptyDiagram } from "../schema/create-empty-diagram.js";
import { updateEntityPosition } from "./layout-commands.js";

const base = () => createEmptyDiagram({ id: "d1", name: "Test", dialect: "postgresql" });

describe("updateEntityPosition", () => {
  it("sets entity position", () => {
    const doc = updateEntityPosition(base(), "e1", { x: 100, y: 200 });
    expect(doc.layout.entityPositions["e1"]).toEqual({ x: 100, y: 200 });
  });

  it("overwrites existing position", () => {
    let doc = updateEntityPosition(base(), "e1", { x: 0, y: 0 });
    doc = updateEntityPosition(doc, "e1", { x: 50, y: 75 });
    expect(doc.layout.entityPositions["e1"]).toEqual({ x: 50, y: 75 });
  });

  it("does not mutate original", () => {
    const doc = base();
    updateEntityPosition(doc, "e1", { x: 100, y: 200 });
    expect(doc.layout.entityPositions["e1"]).toBeUndefined();
  });
});
