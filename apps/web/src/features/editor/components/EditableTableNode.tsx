import { useState } from "react";
import type { ChangeEvent, KeyboardEvent } from "react";
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

type TypeSelectProps = {
  value: string;
  onChange: (val: string) => void;
};

const TypeSelect = ({ value, onChange }: TypeSelectProps) => {
  const [inputVal, setInputVal] = useState(value);
  const [open, setOpen] = useState(false);

  const filtered = COLUMN_TYPES.filter((t) =>
    t.toLowerCase().includes(inputVal.toLowerCase())
  );
  const showDropdown = open && filtered.length > 0;

  const commit = (val: string) => {
    const trimmed = val.trim();
    if (trimmed) onChange(trimmed);
    else setInputVal(value);
    setOpen(false);
  };

  const handleFocus = () => {
    setInputVal(value);
    setOpen(true);
  };

  const handleBlur = () => commit(inputVal);

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") { e.preventDefault(); commit(inputVal); }
    if (e.key === "Escape") { setInputVal(value); setOpen(false); }
  };

  const handleSelect = (t: string) => {
    onChange(t);
    setInputVal(t);
    setOpen(false);
  };

  return (
    <div className={css.typeSelectWrapper}>
      <input
        className={`${css.typeInput} nodrag`}
        value={inputVal}
        onChange={(e) => { setInputVal(e.target.value); setOpen(true); }}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder="타입..."
        spellCheck={false}
      />
      {showDropdown && (
        <div className={`${css.typeDropdown} nodrag nopan`}>
          {filtered.map((t) => (
            <button
              key={t}
              type="button"
              className={`${css.typeOption}${t === value ? ` ${css.typeOptionActive}` : ""}`}
              onMouseDown={(e) => { e.preventDefault(); handleSelect(t); }}
            >
              {t}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export const EditableTableNode = ({ data, selected }: NodeProps<EditableTableNodeType>) => {
  const { entity, collaboratorColor } = data;
  const applyCommand = useEditorStore((s) => s.applyCommand);
  const setSelectedEntity = useEditorStore((s) => s.setSelectedEntity);
  const canEdit = useEditorStore((s) => s.canEdit);

  const borderColor = collaboratorColor ?? (selected ? "var(--color-primary, #0064E0)" : "#d1d5db");
  const boxShadow = collaboratorColor
    ? `0 0 0 3px ${collaboratorColor}40`
    : selected
    ? "0 4px 20px rgba(0, 100, 224, 0.18)"
    : "0 1px 4px rgba(0,0,0,0.1)";

  // 읽기 전용 모드
  if (!canEdit) {
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

  // 편집 모드 (canEdit = true) — nodrag은 각 인터랙티브 요소에만 적용, 컨테이너 div에는 미적용
  return (
    <div
      style={{
        background: "#ffffff",
        border: `2px solid ${borderColor}`,
        borderRadius: 6,
        minWidth: 230,
        fontFamily: "monospace",
        fontSize: 12,
        boxShadow,
        position: "relative",
      }}
    >
      <Handle type="target" position={Position.Left} />

      {/* 헤더: nodrag을 컨테이너가 아닌 개별 요소에만 적용 → 헤더 여백에서 드래그 가능 */}
      <div className={css.headerEditRow}>
        <input
          className={`${css.tableNameInput} nodrag`}
          value={entity.name}
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            applyCommand((doc) => renameEntity(doc, entity.id, e.target.value))
          }
        />
        <button
          type="button"
          className={`${css.deleteEntityBtn} nodrag`}
          onClick={() => {
            applyCommand((doc) => removeEntity(doc, entity.id));
            setSelectedEntity(null);
          }}
          title="테이블 삭제"
        >
          삭제
        </button>
      </div>

      {/* 컬럼 영역: 컨테이너에 nodrag 없음 → colHeaderRow와 행 간격에서 드래그 가능 */}
      <div>
        {/* 컬럼 레이블 행 — 인터랙티브 요소 없음, 완전히 드래그 가능 */}
        <div className={css.colHeaderRow}>
          <span style={{ width: 20 }} />
          <span style={{ flex: 1 }} className={css.colHeaderLabel}>컬럼명</span>
          <span style={{ width: 82 }} className={css.colHeaderLabel}>타입</span>
          <span style={{ width: 14, textAlign: "center" }} className={css.colHeaderLabel}>PK</span>
          <span style={{ width: 18 }} />
        </div>

        {entity.columns.map((col) => (
          <div key={col.id} className={css.editColumnItem}>
            <span className={css.editPkBadge}>{col.primaryKey ? "PK" : ""}</span>
            <input
              className={`${css.columnNameInput} nodrag`}
              value={col.name}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                applyCommand((doc) => updateColumn(doc, entity.id, col.id, { name: e.target.value }))
              }
            />
            <TypeSelect
              value={col.type}
              onChange={(val) =>
                applyCommand((doc) => updateColumn(doc, entity.id, col.id, { type: val }))
              }
            />
            <input
              type="checkbox"
              className={`${css.pkCheckbox} nodrag`}
              checked={col.primaryKey}
              onChange={(e) =>
                applyCommand((doc) =>
                  updateColumn(doc, entity.id, col.id, { primaryKey: e.target.checked })
                )
              }
            />
            <button
              type="button"
              className={`${css.deleteColBtn} nodrag`}
              onClick={() => applyCommand((doc) => removeColumn(doc, entity.id, col.id))}
              title="컬럼 삭제"
            >
              ×
            </button>
          </div>
        ))}

        <div className={css.addColumnWrapper}>
          <button
            type="button"
            className={`${css.addColumnBtn} nodrag`}
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
