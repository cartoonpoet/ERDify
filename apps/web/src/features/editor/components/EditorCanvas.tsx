import { useRef } from "react";
import type { MouseEvent } from "react";
import { ReactFlow, Background, Controls, MarkerType } from "@xyflow/react";
import type { Edge, EdgeChange, NodeChange, Connection } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { updateEntityPosition, addRelationship, removeRelationship } from "@erdify/domain";
import type { DiagramRelationship } from "@erdify/domain";
import { useEditorStore } from "../stores/useEditorStore";
import type { EditableTableNodeType } from "../stores/useEditorStore";
import { EditableTableNode } from "./EditableTableNode";
import { CardinalityEdge } from "./CardinalityEdge";

const nodeTypes = { editableTable: EditableTableNode };
const edgeTypes = { cardinality: CardinalityEdge };

const EDGE_MARKER = {
  type: MarkerType.ArrowClosed,
  color: "#6366f1",
  width: 16,
  height: 16,
} as const;

export const EditorCanvas = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const document = useEditorStore((s) => s.document);
  const nodes = useEditorStore((s) => s.nodes);
  const applyNodeChanges = useEditorStore((s) => s.applyNodeChanges);
  const applyCommand = useEditorStore((s) => s.applyCommand);
  const setSelectedRelationship = useEditorStore((s) => s.setSelectedRelationship);
  const setPopoverPos = useEditorStore((s) => s.setPopoverPos);
  const setSelectedEntity = useEditorStore((s) => s.setSelectedEntity);

  if (!document) return null;

  const edges: Edge[] = document.relationships.map((rel) => ({
    id: rel.id,
    source: rel.sourceEntityId,
    target: rel.targetEntityId,
    type: "cardinality",
    markerEnd: EDGE_MARKER,
    data: { cardinality: rel.cardinality, identifying: rel.identifying },
  }));

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
  }

  function onConnect(connection: Connection) {
    if (!connection.source || !connection.target) return;
    if (connection.source === connection.target) return;
    if (!document) return;

    const sourceEntity = document.entities.find((e) => e.id === connection.source);
    const targetEntity = document.entities.find((e) => e.id === connection.target);
    if (!sourceEntity || !targetEntity) return;

    const relationship: DiagramRelationship = {
      id: crypto.randomUUID(),
      name: "",
      sourceEntityId: connection.source,
      sourceColumnIds: [],
      targetEntityId: connection.target,
      targetColumnIds: [],
      cardinality: "many-to-one",
      onDelete: "no-action",
      onUpdate: "no-action",
      identifying: false,
    };

    applyCommand((doc) => addRelationship(doc, relationship));
  }

  function onEdgeClick(event: MouseEvent, edge: Edge) {
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
        deleteKeyCode="Delete"
        fitView
      >
        <Background />
        <Controls />
      </ReactFlow>
    </div>
  );
};
