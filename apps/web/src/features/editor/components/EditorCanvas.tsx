import { randomUUID } from "../../../shared/utils/uuid";
import { useRef, useState } from "react";
import type { MouseEvent, CSSProperties } from "react";
import { ReactFlow, Background, Controls, MiniMap, useReactFlow } from "@xyflow/react";
import type { Edge, EdgeChange, NodeChange, NodeSelectionChange, Connection } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { updateEntityPosition, addRelationship, removeRelationship, addEntity } from "@erdify/domain";
import type { DiagramRelationship, DiagramDocument } from "@erdify/domain";
import { useEditorStore } from "../stores/useEditorStore";
import type { EditableTableNodeType, UnmatchedPkInput } from "../stores/useEditorStore";
import { EditableTableNode } from "./EditableTableNode";
import { CardinalityEdge } from "./CardinalityEdge";
import { SearchPanel } from "./SearchPanel";

const nodeTypes = { editableTable: EditableTableNode };
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

function computeAutoLayout(doc: DiagramDocument, measuredSizes: Map<string, { w: number; h: number }>) {
  const NODE_W = 280;
  const H_GAP = 96;
  const V_GAP = 80;
  const GROUP_H_PAD = 180;
  const GROUP_V_PAD = 120;

  const estimateH = (id: string, colCount: number) =>
    (measuredSizes.get(id)?.h ?? (38 + 28 + colCount * 30)) + V_GAP;
  const estimateW = (id: string) =>
    (measuredSizes.get(id)?.w ?? NODE_W) + H_GAP;

  // Build undirected adjacency graph for connected-component detection
  const adj = new Map<string, Set<string>>();
  for (const e of doc.entities) adj.set(e.id, new Set());
  for (const r of doc.relationships) {
    adj.get(r.sourceEntityId)?.add(r.targetEntityId);
    adj.get(r.targetEntityId)?.add(r.sourceEntityId);
  }

  // BFS — find connected components (each = one "cluster" of related tables)
  const visited = new Set<string>();
  const components: string[][] = [];
  for (const e of doc.entities) {
    if (visited.has(e.id)) continue;
    const comp: string[] = [];
    const queue = [e.id];
    while (queue.length > 0) {
      const id = queue.shift()!;
      if (visited.has(id)) continue;
      visited.add(id);
      comp.push(id);
      for (const nbr of adj.get(id) ?? []) {
        if (!visited.has(nbr)) queue.push(nbr);
      }
    }
    components.push(comp);
  }

  // Largest/most-connected clusters first
  components.sort((a, b) => b.length - a.length);

  // In-degree: tables referenced by FKs (parent tables) go first within a cluster
  const inDegree = new Map<string, number>(doc.entities.map((e) => [e.id, 0]));
  for (const r of doc.relationships) {
    inDegree.set(r.targetEntityId, (inDegree.get(r.targetEntityId) ?? 0) + 1);
  }

  // Arrange clusters in a wrapping row-grid
  const GROUPS_PER_ROW = Math.max(1, Math.ceil(Math.sqrt(components.length)));
  const positions: Record<string, { x: number; y: number }> = {};

  let originX = 0;
  let originY = 0;
  let rowMaxH = 0;
  let groupCol = 0;

  for (const comp of components) {
    const sorted = [...comp].sort((a, b) => (inDegree.get(b) ?? 0) - (inDegree.get(a) ?? 0));

    const nCols = Math.min(4, Math.max(1, Math.ceil(Math.sqrt(sorted.length))));
    const colWidths = Array<number>(nCols).fill(0);
    const colHeights = Array<number>(nCols).fill(0);

    for (const id of sorted) {
      const entity = doc.entities.find((e) => e.id === id)!;
      const col = colHeights.indexOf(Math.min(...colHeights));
      const x = colWidths.slice(0, col).reduce((s, w) => s + w, 0);
      positions[id] = { x: originX + x, y: originY + colHeights[col]! };
      colHeights[col] = colHeights[col]! + estimateH(id, entity.columns.length);
      colWidths[col] = Math.max(colWidths[col]!, estimateW(id));
    }

    const groupW = colWidths.reduce((s, w) => s + w, 0);
    const groupH = Math.max(...colHeights);
    rowMaxH = Math.max(rowMaxH, groupH);

    groupCol++;
    if (groupCol >= GROUPS_PER_ROW) {
      originX = 0;
      originY += rowMaxH + GROUP_V_PAD;
      rowMaxH = 0;
      groupCol = 0;
    } else {
      originX += groupW + GROUP_H_PAD;
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
        nodes={nodes}
        edges={edges}
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
