import type { DiagramColumn, DiagramDocument, DiagramEntity, DiagramRelationship } from "@erdify/domain";
import { computeAutoLayout } from "./canvas-layout";

const makeCol = (id: string, ordinal = 0): DiagramColumn => ({
  id,
  name: `col${ordinal}`,
  type: "text",
  nullable: true,
  primaryKey: ordinal === 0,
  unique: false,
  defaultValue: null,
  comment: null,
  ordinal,
});

const makeEntity = (
  id: string,
  opts: { schema?: string | null; columnCount?: number } = {}
): DiagramEntity => ({
  id,
  schema: opts.schema ?? null,
  name: id,
  logicalName: null,
  comment: null,
  color: null,
  columns: Array.from({ length: opts.columnCount ?? 1 }, (_, i) => makeCol(`${id}-c${i}`, i)),
});

const makeRel = (id: string, source: string, target: string): DiagramRelationship => ({
  id,
  name: id,
  sourceEntityId: source,
  sourceColumnIds: [],
  targetEntityId: target,
  targetColumnIds: [],
  cardinality: "one-to-many",
  onDelete: "no-action",
  onUpdate: "no-action",
  identifying: false,
});

const makeDoc = (entities: DiagramEntity[], relationships: DiagramRelationship[] = []): DiagramDocument => ({
  format: "erdify.schema.v1",
  id: "doc-1",
  name: "test",
  dialect: "postgresql",
  entities,
  relationships,
  indexes: [],
  views: [],
  layout: { entityPositions: {} },
  metadata: { revision: 1, stableObjectIds: true, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
});

const emptySizes = () => new Map<string, { w: number; h: number }>();

describe("computeAutoLayout", () => {
  it("returns an empty position map for a document with no entities", () => {
    const doc = makeDoc([]);
    expect(computeAutoLayout(doc, emptySizes())).toEqual({});
  });

  it("places a single entity at the schema origin (SCHEMA_PAD, SCHEMA_PAD)", () => {
    const doc = makeDoc([makeEntity("e1")]);
    const positions = computeAutoLayout(doc, emptySizes());
    expect(positions).toEqual({ e1: { x: 40, y: 40 } });
  });

  it("groups relationship-connected entities into one component, placing the higher in-degree entity first (column 0) and the other offset into column 1", () => {
    // e2 is the FK target, so it has in-degree 1 and is sorted first within the component.
    const doc = makeDoc([makeEntity("e1"), makeEntity("e2")], [makeRel("r1", "e1", "e2")]);
    const positions = computeAutoLayout(doc, emptySizes());

    expect(positions.e2).toEqual({ x: 40, y: 40 });
    // column width = default NODE_W(280) + H_GAP(96) = 376
    expect(positions.e1).toEqual({ x: 416, y: 40 });
  });

  it("treats unconnected entities in the same schema as separate components, laid out side by side in the same row", () => {
    const doc = makeDoc([makeEntity("e1"), makeEntity("e2")]);
    const positions = computeAutoLayout(doc, emptySizes());

    // Each is its own 1-node component (1 column), so both sit at the row's y baseline.
    expect(positions.e1).toEqual({ x: 40, y: 40 });
    // second component starts after the first component's width (376) + COMP_H_GAP(80)
    expect(positions.e2).toEqual({ x: 496, y: 40 });
  });

  it("uses measuredSizes width, when provided, instead of the NODE_W fallback to compute column offsets", () => {
    const doc = makeDoc([makeEntity("e1"), makeEntity("e2")], [makeRel("r1", "e1", "e2")]);
    const sizes = emptySizes();
    sizes.set("e2", { w: 100, h: 96 });

    const positions = computeAutoLayout(doc, sizes);

    expect(positions.e2).toEqual({ x: 40, y: 40 });
    // column width now measured width(100) + H_GAP(96) = 196
    expect(positions.e1).toEqual({ x: 236, y: 40 });
  });

  it("orders schema groups alphabetically and lays them out left-to-right, offsetting by the previous group's width", () => {
    const doc = makeDoc([makeEntity("e-zeta", { schema: "zeta" }), makeEntity("e-alpha", { schema: "alpha" })]);
    const positions = computeAutoLayout(doc, emptySizes());

    expect(positions["e-alpha"]).toEqual({ x: 40, y: 40 });
    // group width (376) + SCHEMA_PAD*2 (80) + SCHEMA_H_GAP (140) = 596, plus SCHEMA_PAD (40)
    expect(positions["e-zeta"]).toEqual({ x: 636, y: 40 });
  });

  it("sorts entities with no schema (__none__) after all named schemas", () => {
    const doc = makeDoc([makeEntity("e-none", { schema: null }), makeEntity("e-named", { schema: "zzz" })]);
    const positions = computeAutoLayout(doc, emptySizes());

    expect(positions["e-named"]).toEqual({ x: 40, y: 40 });
    expect(positions["e-none"]).toEqual({ x: 636, y: 40 });
  });

  it("wraps schema groups onto a new row once SCHEMAS_PER_ROW is exceeded, wrapping both x and y", () => {
    const doc = makeDoc([
      makeEntity("e-a", { schema: "a" }),
      makeEntity("e-b", { schema: "b" }),
      makeEntity("e-c", { schema: "c" }),
      makeEntity("e-d", { schema: "d" }),
    ]);
    const positions = computeAutoLayout(doc, emptySizes());

    // SCHEMAS_PER_ROW = ceil(sqrt(4)) = 2, so a,b share row 1 and c,d wrap to row 2.
    expect(positions["e-a"]).toEqual({ x: 40, y: 40 });
    expect(positions["e-b"]).toEqual({ x: 636, y: 40 });
    expect(positions["e-c"]).toEqual({ x: 40, y: 420 });
    expect(positions["e-d"]).toEqual({ x: 636, y: 420 });
  });

  it("caps the number of columns within a component at 4, even for large fully-connected components", () => {
    const ids = Array.from({ length: 20 }, (_, i) => `e${i}`);
    const entities = ids.map((id) => makeEntity(id));
    const relationships = ids.slice(0, -1).map((id, i) => makeRel(`r${i}`, id, ids[i + 1]!));
    const doc = makeDoc(entities, relationships);

    const positions = computeAutoLayout(doc, emptySizes());
    const uniqueXs = new Set(Object.values(positions).map((p) => p.x));

    // ceil(sqrt(20)) would be 5 without the cap; the column packing must stay at 4.
    expect(uniqueXs.size).toBe(4);
  });

  it("is deterministic — the same document and sizes always produce the same positions", () => {
    const doc = makeDoc([makeEntity("e1"), makeEntity("e2")], [makeRel("r1", "e1", "e2")]);
    const result1 = computeAutoLayout(doc, emptySizes());
    const result2 = computeAutoLayout(doc, emptySizes());
    expect(result1).toEqual(result2);
  });
});
