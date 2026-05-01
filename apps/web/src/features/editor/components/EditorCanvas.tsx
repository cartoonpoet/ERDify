import type { MouseEvent } from "react";
import { ReactFlow, Background, Controls, MarkerType } from "@xyflow/react";
import type { Edge, EdgeChange, NodeChange, Connection } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { TableNode } from "@erdify/erd-ui";
import type { TableNodeType } from "@erdify/erd-ui";
import { updateEntityPosition, addRelationship, removeRelationship } from "@erdify/domain";
import type { DiagramRelationship } from "@erdify/domain";
import { useEditorStore } from "../stores/useEditorStore";

const nodeTypes = { table: TableNode };

const EDGE_MARKER = {
  type: MarkerType.ArrowClosed,
  color: "#6366f1",
  width: 16,
  height: 16,
} as const;

export const EditorCanvas = () => {
  const document = useEditorStore((s) => s.document);
  const nodes = useEditorStore((s) => s.nodes);
  const applyNodeChanges = useEditorStore((s) => s.applyNodeChanges);
  const applyCommand = useEditorStore((s) => s.applyCommand);
  const setSelectedEntity = useEditorStore((s) => s.setSelectedEntity);
  const setSelectedRelationship = useEditorStore((s) => s.setSelectedRelationship);

  if (!document) return null;

  const edges: Edge[] = document.relationships.map((rel) => ({
    id: rel.id,
    source: rel.sourceEntityId,
    target: rel.targetEntityId,
    type: "smoothstep",
    label: rel.name || undefined,
    labelStyle: { fontSize: 11, fill: "#374151" },
    labelBgStyle: { fill: "#ffffff", fillOpacity: 0.85 },
    style: {
      stroke: "#6366f1",
      strokeWidth: 1.5,
      ...(rel.identifying ? {} : { strokeDasharray: "6 3" }),
    },
    markerEnd: EDGE_MARKER,
  }));

  function onNodesChange(changes: NodeChange<TableNodeType>[]) {
    applyNodeChanges(changes);
  }

  function onNodeDragStop(_: MouseEvent, node: TableNodeType) {
    applyCommand((doc) => updateEntityPosition(doc, node.id, node.position));
  }

  function onNodeClick(_: MouseEvent, node: TableNodeType) {
    setSelectedEntity(node.id);
  }

  function onPaneClick() {
    setSelectedEntity(null);
    setSelectedRelationship(null);
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

  function onEdgeClick(_: MouseEvent, edge: Edge) {
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
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onEdgeClick={onEdgeClick}
      onConnect={onConnect}
      onNodeDragStop={onNodeDragStop}
      onNodeClick={onNodeClick}
      onPaneClick={onPaneClick}
      deleteKeyCode="Delete"
      fitView
    >
      <Background />
      <Controls />
    </ReactFlow>
  );
};
