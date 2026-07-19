import { describe, it, expect } from "vitest";
import { createEmptyDiagram } from "@erdify/domain";
import type { DiagramDocument, DiagramEntity } from "@erdify/domain";
import { applyDiff } from "./collaboration-diff";

// Fresh entity fixtures per call, so tests never share (and risk cross-mutating)
// the same array/object instances.
function makeEntities(ids: string[]): DiagramEntity[] {
  return ids.map((id) => ({ id, name: id, logicalName: null, comment: null, color: null, columns: [] }));
}

function makeDoc(
  entities: DiagramEntity[],
  entityPositions: Record<string, { x: number; y: number }>
): DiagramDocument {
  const doc = createEmptyDiagram({ id: "d1", name: "test", dialect: "postgresql" });
  doc.entities = entities;
  doc.layout = { entityPositions };
  return doc;
}

describe("applyDiff - layout.entityPositions diff", () => {
  // In the tests below, `prev.entities` and `next.entities` intentionally share the
  // same array reference so that `applyDiff`'s entity-diff branch
  // (`prev.entities !== next.entities`) is skipped, keeping the tests narrowly
  // focused on the layout.entityPositions branch that contains the touched line
  // (S6582: `!p || p.x !== pos.x || p.y !== pos.y` -> `p?.x !== pos.x || p?.y !== pos.y`).

  it("adds a position when prev has no entry for it (property chain absent: p is undefined)", () => {
    const entities = makeEntities(["e1", "e2"]);
    const prev = makeDoc(entities, {});
    const next = makeDoc(entities, { e1: { x: 10, y: 20 } });
    const draft = makeDoc(makeEntities(["e1", "e2"]), {});

    applyDiff(draft, prev, next);

    expect(draft.layout.entityPositions.e1).toEqual({ x: 10, y: 20 });
  });

  it("updates a position when prev has a differing entry (property chain present: p.x/p.y mismatch)", () => {
    const entities = makeEntities(["e1", "e2"]);
    const prev = makeDoc(entities, { e1: { x: 0, y: 0 } });
    const next = makeDoc(entities, { e1: { x: 99, y: 0 } });
    const draft = makeDoc(makeEntities(["e1", "e2"]), { e1: { x: 0, y: 0 } });

    applyDiff(draft, prev, next);

    expect(draft.layout.entityPositions.e1).toEqual({ x: 99, y: 0 });
  });

  it("leaves a position untouched when prev already matches next (property chain present: p.x/p.y equal)", () => {
    const entities = makeEntities(["e1", "e2"]);
    const prev = makeDoc(entities, { e1: { x: 5, y: 5 } });
    const next = makeDoc(entities, { e1: { x: 5, y: 5 } });
    const draftPos = { x: 5, y: 5 };
    const draft = makeDoc(makeEntities(["e1", "e2"]), { e1: draftPos });

    applyDiff(draft, prev, next);

    // Reference equality proves `positions[id] = pos` was NOT executed, i.e. the
    // optional-chaining rewrite still short-circuits exactly like the original
    // `!p || p.x !== pos.x || p.y !== pos.y` guard did for the "no-op" case.
    expect(draft.layout.entityPositions.e1).toBe(draftPos);
    expect(draft.layout.entityPositions.e1).toEqual({ x: 5, y: 5 });
  });

  it("removes a draft position whose entity is no longer present in next.entities", () => {
    const prev = makeDoc(makeEntities(["e1", "e2"]), { e1: { x: 0, y: 0 }, e2: { x: 1, y: 1 } });
    const next = makeDoc(makeEntities(["e1"]), { e1: { x: 0, y: 0 } });
    const draft = makeDoc(makeEntities(["e1", "e2"]), { e1: { x: 0, y: 0 }, e2: { x: 1, y: 1 } });

    applyDiff(draft, prev, next);

    expect(draft.layout.entityPositions).toEqual({ e1: { x: 0, y: 0 } });
  });
});
