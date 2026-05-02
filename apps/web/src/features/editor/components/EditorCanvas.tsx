import { useRef, useState } from "react";
import type { MouseEvent } from "react";
import { ReactFlow, Background, Controls, useReactFlow } from "@xyflow/react";
import type { Edge, EdgeChange, NodeChange, Connection } from "@xyflow/react";
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

// ReactFlow 내부 컴포넌트 — useReactFlow 사용 가능
const ContextMenuInner = ({
  state,
  onClose,
}: {
  state: ContextMenuState;
  onClose: () => void;
}) => {
  const { screenToFlowPosition } = useReactFlow();
  const applyCommand = useEditorStore((s) => s.applyCommand);
  const document = useEditorStore((s) => s.document);

  const handleAddTable = () => {
    const flowPos = screenToFlowPosition({ x: state.clientX, y: state.clientY });
    const entityId = crypto.randomUUID();
    applyCommand((doc) => {
      const next = addEntity(doc, {
        id: entityId,
        name: `Table_${doc.entities.length + 1}`,
      });
      return updateEntityPosition(next, entityId, flowPos);
    });
    onClose();
  };

  if (!document) return null;

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
        minWidth: 150,
        fontSize: 12,
        fontFamily: "monospace",
        overflow: "hidden",
      }}
    >
      <button
        type="button"
        onClick={handleAddTable}
        style={{
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
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#f1f5f9"; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "none"; }}
      >
        <span style={{ fontSize: 14 }}>+</span>
        테이블 추가
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
          id: crypto.randomUUID(),
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
