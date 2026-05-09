import { randomUUID } from "../../../shared/utils/uuid";
import { useRef, useState, useMemo } from "react";
import type { MouseEvent, CSSProperties } from "react";
import { ReactFlow, Background, Controls, MiniMap, useReactFlow } from "@xyflow/react";
import type { Node, Edge, EdgeChange, NodeChange, NodeSelectionChange, Connection } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { updateEntityPosition, addRelationship, removeRelationship, addEntity } from "@erdify/domain";
import type { DiagramRelationship, DiagramDocument } from "@erdify/domain";
import { useEditorStore } from "../stores/useEditorStore";
import type { EditableTableNodeType, UnmatchedPkInput } from "../stores/useEditorStore";
import { getSchemaColor, getSchemasFromDocument } from "../../../shared/utils/schema-colors";
import { EditableTableNode } from "./editable-table-node";
import { CardinalityEdge } from "./CardinalityEdge";
import { SearchPanel } from "./SearchPanel";

const SchemaZoneNode = ({ data }: { data: { label: string; color: string } }) => (
  <div
    style={{
      width: "100%",
      height: "100%",
      background: `${data.color}12`,
      border: `1.5px dashed ${data.color}50`,
      borderRadius: 14,
      pointerEvents: "none",
    }}
  >
    <div
      style={{
        padding: "8px 12px",
        fontSize: 10,
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: "0.08em",
        color: data.color,
        opacity: 0.6,
      }}
    >
      {data.label}
    </div>
  </div>
);

const nodeTypes = { editableTable: EditableTableNode, schemaZone: SchemaZoneNode };
const edgeTypes = { cardinality: CardinalityEdge };

const toSnake = (s: string) =>
  s.replace(/\s+/g, "_").replace(/([a-z])([A-Z])/g, "$1_$2").toLowerCase();

const uniqueColName = (base: string, taken: Set<string>): string => {
  if (!taken.has(base)) return base;
  let i = 2;
  while (taken.has(`${base}_${i}`)) i++;
  return `${base}_${i}`;
};

type FkAnalysis = {
  autoMatchedCols: Array<{ fkColId: string; pkColId: string }>;
  unmatchedPks: UnmatchedPkInput[];
};

const analyzeFkMatch = (doc: DiagramDocument, srcId: string, tgtId: string): FkAnalysis => {
  const sourceEntity = doc.entities.find((e) => e.id === srcId)!;
  const targetEntity = doc.entities.find((e) => e.id === tgtId)!;
  const pkCols = targetEntity.columns.filter((c) => c.primaryKey);
  const targetName = toSnake(targetEntity.name);
  const taken = new Set(sourceEntity.columns.map((c) => c.name));

  const autoMatchedCols: Array<{ fkColId: string; pkColId: string }> = [];
  const unmatchedPks: UnmatchedPkInput[] = [];

  if (pkCols.length === 0) {
    unmatchedPks.push({
      pkColId: "",
      pkColName: "(PK 없음)",
      pkColType: "bigint",
      suggestedName: uniqueColName(`${targetName}_id`, taken),
    });
  } else {
    for (const pkCol of pkCols) {
      const baseName =
        pkCols.length === 1 && pkCol.name === "id"
          ? `${targetName}_id`
          : `${targetName}_${pkCol.name}`;
      const existing = sourceEntity.columns.find(
        (c) => c.name === baseName && c.type === pkCol.type
      );
      if (existing) {
        autoMatchedCols.push({ fkColId: existing.id, pkColId: pkCol.id });
      } else {
        const colName = uniqueColName(baseName, taken);
        taken.add(colName);
        unmatchedPks.push({
          pkColId: pkCol.id,
          pkColName: pkCol.name,
          pkColType: pkCol.type,
          suggestedName: colName,
        });
      }
    }
  }

  return { autoMatchedCols, unmatchedPks };
};

type ContextMenuState = {
  menuX: number;
  menuY: number;
  clientX: number;
  clientY: number;
};

function layoutComponents(
  components: string[][],
  inDegree: Map<string, number>,
  doc: DiagramDocument,
  measuredSizes: Map<string, { w: number; h: number }>,
  originX: number,
  originY: number,
  NODE_W: number,
  H_GAP: number,
  V_GAP: number,
  COMP_H_GAP: number,
): { positions: Record<string, { x: number; y: number }>; groupW: number; groupH: number } {
  const estimateH = (id: string, colCount: number) =>
    (measuredSizes.get(id)?.h ?? (38 + 28 + colCount * 30)) + V_GAP;
  const estimateW = (id: string) => (measuredSizes.get(id)?.w ?? NODE_W) + H_GAP;

  const sorted = [...components].sort((a, b) => b.length - a.length);
  const COMPS_PER_ROW = Math.max(1, Math.ceil(Math.sqrt(sorted.length)));
  const positions: Record<string, { x: number; y: number }> = {};

  let compX = originX;
  let compY = originY;
  let rowMaxH = 0;
  let compCol = 0;

  for (const comp of sorted) {
    const sortedComp = [...comp].sort((a, b) => (inDegree.get(b) ?? 0) - (inDegree.get(a) ?? 0));
    const nCols = Math.min(4, Math.max(1, Math.ceil(Math.sqrt(sortedComp.length))));
    const colWidths = Array<number>(nCols).fill(0);
    const colHeights = Array<number>(nCols).fill(0);

    for (const id of sortedComp) {
      const entity = doc.entities.find((e) => e.id === id)!;
      const col = colHeights.indexOf(Math.min(...colHeights));
      const xOff = colWidths.slice(0, col).reduce((s, w) => s + w, 0);
      positions[id] = { x: compX + xOff, y: compY + colHeights[col]! };
      colHeights[col] = colHeights[col]! + estimateH(id, entity.columns.length);
      colWidths[col] = Math.max(colWidths[col]!, estimateW(id));
    }

    const compW = colWidths.reduce((s, w) => s + w, 0);
    const compH = Math.max(...colHeights);
    rowMaxH = Math.max(rowMaxH, compH);

    compCol++;
    if (compCol >= COMPS_PER_ROW) {
      compX = originX;
      compY += rowMaxH + COMP_H_GAP;
      rowMaxH = 0;
      compCol = 0;
    } else {
      compX += compW + COMP_H_GAP;
    }
  }

  const allX = Object.values(positions).map((p) => p.x);
  const allY = Object.values(positions).map((p) => p.y);
  const groupW = allX.length ? Math.max(...allX) - originX + NODE_W + H_GAP : 0;
  const groupH = allY.length ? Math.max(...allY) - originY + 120 + V_GAP : 0;

  return { positions, groupW, groupH };
}

function bfsComponents(entityIds: string[], adj: Map<string, Set<string>>): string[][] {
  const visited = new Set<string>();
  return entityIds.reduce<string[][]>((acc, id) => {
    if (visited.has(id)) return acc;
    const comp: string[] = [];
    const queue = [id];
    while (queue.length > 0) {
      const curr = queue.shift()!;
      if (visited.has(curr)) continue;
      visited.add(curr);
      comp.push(curr);
      for (const nbr of adj.get(curr) ?? []) {
        if (!visited.has(nbr)) queue.push(nbr);
      }
    }
    return [...acc, comp];
  }, []);
}

function computeAutoLayout(doc: DiagramDocument, measuredSizes: Map<string, { w: number; h: number }>) {
  const NODE_W = 280;
  const H_GAP = 96;
  const V_GAP = 80;
  const SCHEMA_H_GAP = 140;
  const SCHEMA_V_GAP = 100;
  const SCHEMA_PAD = 40;
  const COMP_H_GAP = 80;

  // Group entities by schema (null → "__none__")
  const schemaGroups = doc.entities.reduce<Map<string, string[]>>((acc, e) => {
    const key = e.schema ?? "__none__";
    return acc.set(key, [...(acc.get(key) ?? []), e.id]);
  }, new Map());

  const schemaKeys = [...schemaGroups.keys()].sort((a, b) =>
    a === "__none__" ? 1 : b === "__none__" ? -1 : a.localeCompare(b)
  );

  const inDegree = doc.relationships.reduce<Map<string, number>>(
    (acc, r) => acc.set(r.targetEntityId, (acc.get(r.targetEntityId) ?? 0) + 1),
    new Map(doc.entities.map((e) => [e.id, 0]))
  );

  const SCHEMAS_PER_ROW = Math.max(1, Math.ceil(Math.sqrt(schemaKeys.length)));
  const positions: Record<string, { x: number; y: number }> = {};

  let schemaX = 0;
  let schemaY = 0;
  let rowMaxH = 0;
  let schemaCol = 0;

  for (const key of schemaKeys) {
    const entityIds = schemaGroups.get(key) ?? [];

    // Build intra-schema adjacency
    const groupSet = new Set(entityIds);
    const adj = entityIds.reduce<Map<string, Set<string>>>((m, id) => m.set(id, new Set()), new Map());
    for (const r of doc.relationships) {
      if (groupSet.has(r.sourceEntityId) && groupSet.has(r.targetEntityId)) {
        adj.get(r.sourceEntityId)?.add(r.targetEntityId);
        adj.get(r.targetEntityId)?.add(r.sourceEntityId);
      }
    }

    const components = bfsComponents(entityIds, adj);
    const { positions: compPositions, groupW, groupH } = layoutComponents(
      components, inDegree, doc, measuredSizes,
      schemaX + SCHEMA_PAD, schemaY + SCHEMA_PAD,
      NODE_W, H_GAP, V_GAP, COMP_H_GAP,
    );

    Object.assign(positions, compPositions);

    const totalH = groupH + SCHEMA_PAD * 2;
    const totalW = groupW + SCHEMA_PAD * 2;
    rowMaxH = Math.max(rowMaxH, totalH);

    schemaCol++;
    if (schemaCol >= SCHEMAS_PER_ROW) {
      schemaX = 0;
      schemaY += rowMaxH + SCHEMA_V_GAP;
      rowMaxH = 0;
      schemaCol = 0;
    } else {
      schemaX += totalW + SCHEMA_H_GAP;
    }
  }

  return positions;
}

// ReactFlow 내부 컴포넌트 — useReactFlow 사용 가능
const ClickableMiniMap = ({ containerRef }: { containerRef: React.RefObject<HTMLDivElement | null> }) => {
  const { setViewport, getViewport } = useReactFlow();
  return (
    <MiniMap
      nodeColor={(node) => (node.data as { entity: { color?: string | null } }).entity?.color ?? "#60a5fa"}
      maskColor="rgba(240,244,248,0.7)"
      style={{ bottom: 56, right: 8 }}
      onClick={(_event, position) => {
        const { zoom } = getViewport();
        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect) return;
        setViewport(
          {
            x: rect.width / 2 - position.x * zoom,
            y: rect.height / 2 - position.y * zoom,
            zoom,
          },
          { duration: 300 }
        );
      }}
    />
  );
};

const ContextMenuInner = ({
  state,
  onClose,
}: {
  state: ContextMenuState;
  onClose: () => void;
}) => {
  const { screenToFlowPosition, fitView, getNodes } = useReactFlow();
  const applyCommand = useEditorStore((s) => s.applyCommand);
  const document = useEditorStore((s) => s.document);
  const groupViewEnabled = useEditorStore((s) => s.groupViewEnabled);
  const setGroupViewEnabled = useEditorStore((s) => s.setGroupViewEnabled);

  const handleAddTable = () => {
    const flowPos = screenToFlowPosition({ x: state.clientX, y: state.clientY });
    const entityId = randomUUID();
    applyCommand((doc) => {
      const next = addEntity(doc, {
        id: entityId,
        name: `Table_${doc.entities.length + 1}`,
      });
      return updateEntityPosition(next, entityId, flowPos);
    });
    onClose();
  };

  const handleAutoLayout = () => {
    if (!document) return;
    const measuredSizes = new Map(
      getNodes().map((n) => [n.id, { w: n.measured?.width ?? 280, h: n.measured?.height ?? 120 }])
    );
    const positions = computeAutoLayout(document, measuredSizes);
    applyCommand((doc) => {
      let next = doc;
      for (const entity of doc.entities) {
        const pos = positions[entity.id];
        if (pos) next = updateEntityPosition(next, entity.id, pos);
      }
      return next;
    });
    setTimeout(() => fitView({ duration: 400, padding: 0.08 }), 50);
    onClose();
  };

  if (!document) return null;

  const menuItemStyle: CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 8,
    width: "100%",
    padding: "9px 14px",
    background: "none",
    border: "none",
    textAlign: "left",
    cursor: "pointer",
    color: "#374151",
    fontSize: 12,
    fontFamily: "monospace",
  };

  const onEnter = (e: MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.background = "#f1f5f9";
  };
  const onLeave = (e: MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.background = "none";
  };

  return (
    <div
      className="nodrag nopan"
      style={{
        position: "absolute",
        left: state.menuX,
        top: state.menuY,
        background: "#ffffff",
        border: "1px solid #e2e8f0",
        borderRadius: 8,
        boxShadow: "0 8px 24px rgba(0,0,0,0.12), 0 2px 6px rgba(0,0,0,0.06)",
        zIndex: 1000,
        minWidth: 160,
        fontSize: 12,
        fontFamily: "monospace",
        overflow: "hidden",
      }}
    >
      <button type="button" onClick={handleAddTable} style={menuItemStyle} onMouseEnter={onEnter} onMouseLeave={onLeave}>
        <span style={{ fontSize: 14 }}>+</span>
        테이블 추가
      </button>
      <div style={{ height: 1, background: "#f1f5f9", margin: "0 8px" }} />
      <button type="button" onClick={handleAutoLayout} style={menuItemStyle} onMouseEnter={onEnter} onMouseLeave={onLeave}>
        <span style={{ fontSize: 13 }}>⊞</span>
        테이블 자동 정렬
      </button>
      <div style={{ height: 1, background: "#f1f5f9", margin: "0 8px" }} />
      <button
        type="button"
        onClick={() => { setGroupViewEnabled(!groupViewEnabled); onClose(); }}
        style={menuItemStyle}
        onMouseEnter={onEnter}
        onMouseLeave={onLeave}
      >
        <span style={{ fontSize: 13 }}>{groupViewEnabled ? "◻" : "▦"}</span>
        {groupViewEnabled ? "그룹 숨기기" : "그룹 보기"}
      </button>
    </div>
  );
};

export const EditorCanvas = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);

  const document = useEditorStore((s) => s.document);
  const nodes = useEditorStore((s) => s.nodes);
  const edges = useEditorStore((s) => s.edges);
  const searchOpen = useEditorStore((s) => s.searchOpen);
  const setSearchOpen = useEditorStore((s) => s.setSearchOpen);
  const canEdit = useEditorStore((s) => s.canEdit);
  const applyNodeChanges = useEditorStore((s) => s.applyNodeChanges);
  const applyCommand = useEditorStore((s) => s.applyCommand);
  const setSelectedRelationship = useEditorStore((s) => s.setSelectedRelationship);
  const setPopoverPos = useEditorStore((s) => s.setPopoverPos);
  const setSelectedEntity = useEditorStore((s) => s.setSelectedEntity);
  const setPendingConnection = useEditorStore((s) => s.setPendingConnection);
  const hiddenSchemas = useEditorStore((s) => s.hiddenSchemas);
  const groupViewEnabled = useEditorStore((s) => s.groupViewEnabled);

  const allSchemas = useMemo(
    () => (document ? getSchemasFromDocument(document.entities) : []),
    [document]
  );

  const zoneNodes = useMemo((): Node[] => {
    if (!document || !groupViewEnabled || allSchemas.length === 0) return [];
    const NODE_W = 280;
    const NODE_H_EST = 120;
    const PAD = 32;
    return allSchemas.flatMap((schema) => {
      const schemaEntities = document.entities.filter((e) => e.schema === schema);
      if (schemaEntities.length === 0) return [];
      const positions = schemaEntities.map(
        (e) => document.layout.entityPositions[e.id] ?? { x: 0, y: 0 }
      );
      const xs = positions.map((p) => p.x);
      const ys = positions.map((p) => p.y);
      const minX = Math.min(...xs);
      const minY = Math.min(...ys);
      const maxX = Math.max(...xs);
      const maxY = Math.max(...ys);
      return [{
        id: `__zone__${schema}`,
        type: "schemaZone" as const,
        position: { x: minX - PAD, y: minY - PAD },
        data: { label: schema, color: getSchemaColor(schema, allSchemas) },
        style: { width: maxX - minX + NODE_W + PAD * 2, height: maxY - minY + NODE_H_EST + PAD * 2 },
        selectable: false,
        draggable: false,
        zIndex: -1,
      }];
    });
  }, [document, groupViewEnabled, allSchemas]);

  const displayNodes = useMemo((): Node[] => {
    const dimmedEntityNodes = nodes.map((node) => {
      const schema = node.data.entity.schema ?? null;
      const isHidden = schema !== null && hiddenSchemas.has(schema);
      return isHidden ? { ...node, style: { ...node.style, opacity: 0.15 } } : node;
    });
    return [...zoneNodes, ...dimmedEntityNodes];
  }, [nodes, zoneNodes, hiddenSchemas]);

  const displayEdges = useMemo(() => {
    if (!document || hiddenSchemas.size === 0) return edges;
    const entitySchemaMap = new Map(document.entities.map((e) => [e.id, e.schema ?? null]));
    return edges.map((edge) => {
      const srcSchema = entitySchemaMap.get(edge.source) ?? null;
      const tgtSchema = entitySchemaMap.get(edge.target) ?? null;
      const isHidden =
        (srcSchema !== null && hiddenSchemas.has(srcSchema)) ||
        (tgtSchema !== null && hiddenSchemas.has(tgtSchema));
      return isHidden ? { ...edge, style: { ...edge.style, opacity: 0.1 } } : edge;
    });
  }, [edges, hiddenSchemas, document]);

  if (!document) return null;

  function onNodesChange(changes: NodeChange<EditableTableNodeType>[]) {
    applyNodeChanges(changes);
    const selectionChanges = changes.filter((c): c is NodeSelectionChange => c.type === "select");
    if (selectionChanges.length > 0) {
      const selected = selectionChanges.find((c) => c.selected);
      setSelectedEntity(selected?.id ?? null);
    }
  }

  function onNodeDragStop(_: MouseEvent, node: EditableTableNodeType) {
    applyCommand((doc) => updateEntityPosition(doc, node.id, node.position));
  }

  function onPaneClick() {
    setSelectedEntity(null);
    setSelectedRelationship(null);
    setPopoverPos(null);
    setContextMenu(null);
  }

  function onConnect(connection: Connection) {
    if (!canEdit) return;
    if (!connection.source || !connection.target) return;
    if (connection.source === connection.target) return;
    if (!document) return;

    const srcId = connection.source;
    const tgtId = connection.target;

    if (!document.entities.find((e) => e.id === srcId) || !document.entities.find((e) => e.id === tgtId)) return;

    const { autoMatchedCols, unmatchedPks } = analyzeFkMatch(document, srcId, tgtId);

    if (unmatchedPks.length === 0) {
      applyCommand((doc) => {
        const src = doc.entities.find((e) => e.id === srcId)!;
        const tgt = doc.entities.find((e) => e.id === tgtId)!;
        const relationship: DiagramRelationship = {
          id: randomUUID(),
          name: `fk_${toSnake(src.name)}_${toSnake(tgt.name)}`,
          sourceEntityId: srcId,
          sourceColumnIds: autoMatchedCols.map((m) => m.fkColId),
          targetEntityId: tgtId,
          targetColumnIds: autoMatchedCols.map((m) => m.pkColId),
          cardinality: "many-to-one",
          onDelete: "no-action",
          onUpdate: "no-action",
          identifying: false,
        };
        return addRelationship(doc, relationship);
      });
    } else {
      setPendingConnection({ sourceEntityId: srcId, targetEntityId: tgtId, autoMatchedCols, unmatchedPks });
    }
  }

  function onEdgeClick(event: MouseEvent, edge: Edge) {
    if (!canEdit) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (rect) {
      setPopoverPos({
        x: event.clientX - rect.left,
        y: event.clientY - rect.top + 12,
      });
    }
    setSelectedRelationship(edge.id);
  }

  function onEdgesChange(changes: EdgeChange[]) {
    if (!canEdit) return;
    const removes = changes.filter((c): c is EdgeChange & { type: "remove" } => c.type === "remove");
    if (removes.length === 0) return;
    applyCommand((doc) =>
      removes.reduce((d, change) => removeRelationship(d, change.id), doc)
    );
  }

  return (
    <div ref={containerRef} style={{ width: "100%", height: "100%" }}>
      <ReactFlow
        nodes={displayNodes as unknown as EditableTableNodeType[]}
        edges={displayEdges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onEdgeClick={onEdgeClick}
        onConnect={onConnect}
        onNodeDragStop={onNodeDragStop}
        onPaneClick={onPaneClick}
        onPaneContextMenu={(event) => {
          if (!canEdit) return;
          event.preventDefault();
          const rect = containerRef.current?.getBoundingClientRect();
          if (!rect) return;
          setContextMenu({
            menuX: event.clientX - rect.left,
            menuY: event.clientY - rect.top,
            clientX: event.clientX,
            clientY: event.clientY,
          });
        }}
        deleteKeyCode="Delete"
        zoomOnScroll={false}
        panOnScroll
        fitView
        onlyRenderVisibleElements
      >
        <Background />
        <Controls />
        <ClickableMiniMap containerRef={containerRef} />
        {searchOpen && <SearchPanel onClose={() => setSearchOpen(false)} />}
        {contextMenu && (
          <ContextMenuInner
            state={contextMenu}
            onClose={() => setContextMenu(null)}
          />
        )}
      </ReactFlow>
    </div>
  );
};
