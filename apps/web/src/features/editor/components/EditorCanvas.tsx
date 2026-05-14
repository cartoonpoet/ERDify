import { randomUUID } from "@/shared/utils/uuid";
import { useRef, useState, useMemo } from "react";
import type { MouseEvent } from "react";
import { ReactFlow, Background, Controls, MiniMap, useReactFlow } from "@xyflow/react";
import type { Node, Edge, EdgeChange, NodeChange, NodeSelectionChange, NodeRemoveChange, Connection } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { updateEntityPosition, addRelationship, removeRelationship, removeEntity } from "@erdify/domain";
import type { DiagramRelationship, DiagramDocument } from "@erdify/domain";
import { useEditorStore } from "@/features/editor/store/useEditorStore";
import type { EditableTableNodeType, UnmatchedPkInput } from "@/features/editor/store/useEditorStore";
import { getSchemaColor, getSchemasFromDocument } from "@/shared/utils/schema-colors";
import { EditableTableNode } from "./EditableTableNode";
import { CardinalityEdge } from "./CardinalityEdge";
import { SearchPanel } from "./SearchPanel";
import { CanvasContextMenu } from "./CanvasContextMenu";

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

// ReactFlow 내부 컴포넌트 — useReactFlow 사용 가능
const ClickableMiniMap = ({
  containerRef,
  document,
  schemaColors,
}: {
  containerRef: React.RefObject<HTMLDivElement | null>;
  document: DiagramDocument | null;
  schemaColors: Record<string, string>;
}) => {
  const { setViewport, getViewport } = useReactFlow();

  const allSchemas = document ? getSchemasFromDocument(document.entities) : [];

  const nodeColor = (node: Node) => {
    const data = node.data as { entity: { color?: string | null; schema?: string | null } };
    if (data.entity?.color) return data.entity.color;
    if (data.entity?.schema) return getSchemaColor(data.entity.schema, allSchemas, schemaColors);
    return "#60a5fa";
  };

  return (
    <div style={{ position: "absolute", bottom: 56, right: 8, display: "flex", flexDirection: "column", gap: 0, zIndex: 5 }}>
      {/* 스키마 범례 */}
      {allSchemas.length > 0 && (
        <div
          style={{
            background: "rgba(255,255,255,0.92)",
            border: "1px solid #e2e8f0",
            borderRadius: "6px 6px 0 0",
            padding: "5px 8px",
            display: "flex",
            flexWrap: "wrap",
            gap: "4px 8px",
            maxWidth: 200,
            backdropFilter: "blur(4px)",
          }}
        >
          {allSchemas.map((schema) => (
            <div key={schema} style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: getSchemaColor(schema, allSchemas, schemaColors),
                  flexShrink: 0,
                }}
              />
              <span style={{ fontSize: 9, color: "#374151", fontFamily: "monospace", whiteSpace: "nowrap" }}>
                {schema}
              </span>
            </div>
          ))}
        </div>
      )}
      {/* 미니맵 */}
      <MiniMap
        nodeColor={nodeColor}
        maskColor="rgba(240,244,248,0.7)"
        style={{ position: "static", margin: 0, borderRadius: allSchemas.length > 0 ? "0 0 6px 6px" : 6 }}
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
    </div>
  );
};

export const EditorCanvas = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);

  const document = useEditorStore((s) => s.document);
  const schemaColors = useEditorStore((s) => s.schemaColors);
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

    if (canEdit) {
      const removeChanges = changes.filter((c): c is NodeRemoveChange => c.type === "remove");
      if (removeChanges.length > 0) {
        applyCommand((doc) => removeChanges.reduce((d, c) => removeEntity(d, c.id), doc));
        setSelectedEntity(null);
      }
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
        deleteKeyCode={["Delete"]}
        multiSelectionKeyCode={["Control", "Meta", "Shift"]}
        selectionOnDrag
        panOnDrag={false}
        nodesFocusable={false}
        zoomOnScroll={false}
        panOnScroll
        fitView
        onlyRenderVisibleElements
      >
        <Background />
        <Controls />
        <ClickableMiniMap containerRef={containerRef} document={document} schemaColors={schemaColors} />
        {searchOpen && <SearchPanel onClose={() => setSearchOpen(false)} />}
        {contextMenu && (
          <CanvasContextMenu
            menuX={contextMenu.menuX}
            menuY={contextMenu.menuY}
            clientX={contextMenu.clientX}
            clientY={contextMenu.clientY}
            onClose={() => setContextMenu(null)}
          />
        )}
      </ReactFlow>
    </div>
  );
};
