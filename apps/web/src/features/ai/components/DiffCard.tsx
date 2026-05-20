import { useState } from "react";
import type { DiffChange } from "@erdify/contracts";

interface DiffCardProps {
  messageId: string;
  diff: DiffChange[];
  accepted: boolean | null;
  onAccept: (messageId: string) => void;
  onReject: (messageId: string) => void;
}

const DIFF_LABEL = (change: DiffChange): string => {
  switch (change.type) {
    case "addTable": return `+ 테이블 추가: ${change.tableName}`;
    case "removeTable": return `- 테이블 삭제: ${change.tableName}`;
    case "updateTable": return `~ 테이블 이름 변경: ${change.oldName} → ${change.newName}`;
    case "addColumn": return `+ 컬럼 추가: ${change.tableName}.${change.columnName} (${change.columnType})`;
    case "removeColumn": return `- 컬럼 삭제: ${change.tableName}.${change.columnName}`;
    case "updateColumn": return `~ 컬럼 수정: ${change.tableName}.${change.columnName} (${change.changes.join(", ")})`;
    case "addRelation": return `+ 관계 추가: ${change.fromTable} → ${change.toTable} (${change.cardinality})`;
    case "removeRelation": return `- 관계 삭제: ${change.fromTable} → ${change.toTable}`;
  }
};

const itemColor = (type: string): string => {
  if (type.startsWith("add")) return "#16a34a";
  if (type.startsWith("remove")) return "#dc2626";
  return "#d97706";
};

export const DiffCard = ({ messageId, diff, accepted, onAccept, onReject }: DiffCardProps) => {
  const [expanded, setExpanded] = useState(false);

  if (accepted === true) {
    return (
      <div style={{ padding: "8px 12px", borderRadius: 8, background: "#f0fdf4", border: "1px solid #86efac", fontSize: 13, color: "#16a34a" }}>
        ✓ 변경사항 적용됨
      </div>
    );
  }

  if (accepted === false) {
    return (
      <div style={{ padding: "8px 12px", borderRadius: 8, background: "#fef2f2", border: "1px solid #fca5a5", fontSize: 13, color: "#dc2626" }}>
        ✗ 변경사항 거절됨
      </div>
    );
  }

  return (
    <div style={{ border: "1px solid #e2e8f0", borderRadius: 8, overflow: "hidden", marginTop: 8 }}>
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        style={{ width: "100%", padding: "8px 12px", background: "#f8fafc", border: "none", cursor: "pointer", textAlign: "left", display: "flex", justifyContent: "space-between", fontSize: 13, fontWeight: 500 }}
      >
        <span>📋 {diff.length}개 변경사항</span>
        <span>{expanded ? "▲" : "▼"}</span>
      </button>

      {expanded && (
        <ul style={{ margin: 0, padding: "8px 12px 8px 24px", listStyle: "none", fontSize: 12, lineHeight: 1.8, background: "#ffffff" }}>
          {diff.map((change, i) => (
            <li key={i} style={{ color: itemColor(change.type) }}>
              {DIFF_LABEL(change)}
            </li>
          ))}
        </ul>
      )}

      <div style={{ display: "flex", gap: 8, padding: "8px 12px", borderTop: "1px solid #e2e8f0", background: "#ffffff" }}>
        <button
          type="button"
          onClick={() => onAccept(messageId)}
          style={{ flex: 1, padding: "6px 0", borderRadius: 6, border: "none", background: "#2563eb", color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 500 }}
        >
          수락
        </button>
        <button
          type="button"
          onClick={() => onReject(messageId)}
          style={{ flex: 1, padding: "6px 0", borderRadius: 6, border: "1px solid #e2e8f0", background: "#fff", color: "#374151", cursor: "pointer", fontSize: 13 }}
        >
          거절
        </button>
      </div>
    </div>
  );
};
