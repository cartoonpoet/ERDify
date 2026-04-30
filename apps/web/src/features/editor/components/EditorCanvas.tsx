import { useState, useCallback, useMemo, useEffect } from "react";
import type { MouseEvent } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  applyNodeChanges
} from "@xyflow/react";
import type { Edge, NodeChange } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { TableNode } from "@erdify/erd-ui";
import type { TableNodeType } from "@erdify/erd-ui";
import { updateEntityPosition } from "@erdify/domain";
import type { DiagramDocument } from "@erdify/domain";
import { useEditorStore } from "../stores/useEditorStore";

const nodeTypes = { table: TableNode };

function docToNodes(doc: DiagramDocument): TableNodeType[] {
  return doc.entities.map((entity) => ({
    id: entity.id,
    type: "table" as const,
    position: doc.layout.entityPositions[entity.id] ?? { x: 0, y: 0 },
    data: { entity }
  }));
}

function docToEdges(doc: DiagramDocument): Edge[] {
  return doc.relationships.map((rel) => ({
    id: rel.id,
    source: rel.sourceEntityId,
    target: rel.targetEntityId,
    label: rel.name
  }));
}

export function EditorCanvas() {
  const { document, applyCommand, setSelectedEntity } = useEditorStore();

  const [nodes, setNodes] = useState<TableNodeType[]>(() =>
    document ? docToNodes(document) : []
  );
  const edges = useMemo<Edge[]>(
    () => (document ? docToEdges(document) : []),
    [document]
  );

  // Re-sync nodes when document changes (add/remove entity, layout update)
  useEffect(() => {
    if (document) setNodes(docToNodes(document));
  }, [document]);

  const onNodesChange = useCallback((changes: NodeChange<TableNodeType>[]) => {
    setNodes((nds) => applyNodeChanges(changes, nds));
  }, []);

  const onNodeDragStop = useCallback(
    (_: MouseEvent, node: TableNodeType) => {
      applyCommand((doc) => updateEntityPosition(doc, node.id, node.position));
    },
    [applyCommand]
  );

  const onNodeClick = useCallback(
    (_: MouseEvent, node: TableNodeType) => {
      setSelectedEntity(node.id);
    },
    [setSelectedEntity]
  );

  const onPaneClick = useCallback(() => {
    setSelectedEntity(null);
  }, [setSelectedEntity]);

  if (!document) return null;

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      onNodesChange={onNodesChange}
      onNodeDragStop={onNodeDragStop}
      onNodeClick={onNodeClick}
      onPaneClick={onPaneClick}
      fitView
    >
      <Background />
      <Controls />
    </ReactFlow>
  );
}
