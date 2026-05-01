import type { ChangeEvent } from "react";
import { Handle, Position } from "@xyflow/react";
import type { NodeProps } from "@xyflow/react";
import {
  addColumn,
  removeColumn,
  removeEntity,
  renameEntity,
  updateColumn,
} from "@erdify/domain";
import type { DiagramColumn } from "@erdify/domain";
import { useEditorStore } from "../stores/useEditorStore";
import type { EditableTableNodeType } from "../stores/useEditorStore";
import * as css from "./editable-table-node.css";

const COLUMN_TYPES = [
  "varchar(255)", "text", "int", "bigint", "boolean",
  "timestamp", "uuid", "decimal(10,2)", "json", "jsonb",
];

function makeColumn(ordinal: number): DiagramColumn {
  return {
    id: crypto.randomUUID(),
    name: "column",
    type: "varchar(255)",
    nullable: true,
    primaryKey: false,
    unique: false,
    defaultValue: null,
    comment: null,
    ordinal,
  };
}

export const EditableTableNode = ({ data, selected }: NodeProps<EditableTableNodeType>) => {
  const { entity, collaboratorColor } = data;
  const applyCommand = useEditorStore((s) => s.applyCommand);
  const setSelectedEntity = useEditorStore((s) => s.setSelectedEntity);

  const borderColor = collaboratorColor ?? (selected ? "var(--color-primary, #0064E0)" : "#d1d5db");
  const boxShadow = collaboratorColor
    ? `0 0 0 3px ${collaboratorColor}40`
    : selected
    ? "0 4px 20px rgba(0, 100, 224, 0.18)"
    : "0 1px 4px rgba(0,0,0,0.1)";

  if (!selected) {
    return (
      <div
        style={{
          background: "#ffffff",
          border: `2px solid ${borderColor}`,
          borderRadius: 6,
          minWidth: 180,
          fontFamily: "monospace",
          fontSize: 12,
          boxShadow,
          position: "relative",
        }}
      >
        <Handle type="target" position={Position.Left} />

        {collaboratorColor && (
          <div
            className={css.collaboratorDot}
            style={{ background: collaboratorColor }}
          />
        )}

        <div
          style={{
            background: collaboratorColor ?? "#374151",
            color: "#ffffff",
            padding: "6px 10px",
            fontWeight: 700,
            borderRadius: "4px 4px 0 0",
            fontSize: 13,
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
                alignItems: "center",
              }}
            >
              {col.primaryKey && (
                <span style={{ color: "#f59e0b", fontWeight: 700, fontSize: 10 }}>PK</span>
              )}
              <span style={{ flex: 1, color: "#111827" }}>{col.name}</span>
              <span style={{ color: "#6b7280", fontSize: 10 }}>{col.type}</span>
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

  // 편집 모드 (selected = true)
  return (
    <div
      style={{
        background: "#ffffff",
        border: `2px solid ${borderColor}`,
        borderRadius: 6,
        minWidth: 220,
        fontFamily: "monospace",
        fontSize: 12,
        boxShadow,
        position: "relative",
      }}
    >
      <Handle type="target" position={Position.Left} />

      <div className={`${css.headerEditRow} nodrag`}>
        <input
          className={css.tableNameInput}
          value={entity.name}
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            applyCommand((doc) => renameEntity(doc, entity.id, e.target.value))
          }
        />
        <button
          className={css.deleteEntityBtn}
          onClick={() => {
            applyCommand((doc) => removeEntity(doc, entity.id));
            setSelectedEntity(null);
          }}
          title="테이블 삭제"
        >
          🗑
        </button>
      </div>

      <div className="nodrag">
        <div className={css.colHeaderRow}>
          <span style={{ width: 20 }} />
          <span style={{ flex: 1 }} className={css.colHeaderLabel}>컬럼명</span>
          <span style={{ width: 82 }} className={css.colHeaderLabel}>타입</span>
          <span style={{ width: 14, textAlign: "center" }} className={css.colHeaderLabel}>PK</span>
          <span style={{ width: 16 }} />
        </div>

        {entity.columns.map((col) => (
          <div key={col.id} className={css.editColumnItem}>
            <span className={css.editPkBadge}>{col.primaryKey ? "PK" : ""}</span>
            <input
              className={css.columnNameInput}
              value={col.name}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                applyCommand((doc) => updateColumn(doc, entity.id, col.id, { name: e.target.value }))
              }
            />
            <select
              className={css.typeSelect}
              value={col.type}
              onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                applyCommand((doc) => updateColumn(doc, entity.id, col.id, { type: e.target.value }))
              }
            >
              {COLUMN_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
              {!COLUMN_TYPES.includes(col.type) && (
                <option value={col.type}>{col.type}</option>
              )}
            </select>
            <input
              type="checkbox"
              className={css.pkCheckbox}
              checked={col.primaryKey}
              onChange={(e) =>
                applyCommand((doc) =>
                  updateColumn(doc, entity.id, col.id, { primaryKey: e.target.checked })
                )
              }
            />
            <button
              className={css.deleteColBtn}
              onClick={() => applyCommand((doc) => removeColumn(doc, entity.id, col.id))}
            >
              ×
            </button>
          </div>
        ))}

        <div className={css.addColumnWrapper}>
          <button
            className={css.addColumnBtn}
            onClick={() =>
              applyCommand((doc) =>
                addColumn(doc, entity.id, makeColumn(entity.columns.length))
              )
            }
          >
            + 컬럼 추가
          </button>
        </div>
      </div>

      <Handle type="source" position={Position.Right} />
    </div>
  );
};
