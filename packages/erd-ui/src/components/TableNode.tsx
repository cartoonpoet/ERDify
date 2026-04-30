import { Handle, Position } from "@xyflow/react";
import type { Node, NodeProps } from "@xyflow/react";
import type { DiagramEntity } from "@erdify/domain";

export type TableNodeType = Node<{ entity: DiagramEntity }, "table">;

export function TableNode({ data, selected }: NodeProps<TableNodeType>) {
  const { entity } = data;

  return (
    <div
      style={{
        background: selected ? "#e8f4fd" : "#ffffff",
        border: `2px solid ${selected ? "#2563eb" : "#d1d5db"}`,
        borderRadius: 6,
        minWidth: 180,
        fontFamily: "monospace",
        fontSize: 12,
        boxShadow: "0 1px 4px rgba(0,0,0,0.1)"
      }}
    >
      <Handle type="target" position={Position.Left} />

      <div
        style={{
          background: selected ? "#2563eb" : "#374151",
          color: "#ffffff",
          padding: "6px 10px",
          fontWeight: 700,
          borderRadius: "4px 4px 0 0",
          fontSize: 13
        }}
      >
        {entity.name}
      </div>

      <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
        {entity.columns.map((col) => (
          <li
            key={col.id}
            style={{
              padding: "3px 10px",
              borderBottom: "1px solid #f3f4f6",
              display: "flex",
              gap: 8,
              alignItems: "center"
            }}
          >
            {col.primaryKey && (
              <span style={{ color: "#f59e0b", fontWeight: 700 }}>PK</span>
            )}
            <span style={{ flex: 1, color: "#111827" }}>{col.name}</span>
            <span style={{ color: "#6b7280" }}>{col.type}</span>
            {col.nullable && <span style={{ color: "#9ca3af" }}>?</span>}
          </li>
        ))}
        {entity.columns.length === 0 && (
          <li style={{ padding: "4px 10px", color: "#9ca3af", fontStyle: "italic" }}>
            컬럼 없음
          </li>
        )}
      </ul>

      <Handle type="source" position={Position.Right} />
    </div>
  );
}
