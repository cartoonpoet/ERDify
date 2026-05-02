import { useState } from "react";
import type { ChangeEvent, KeyboardEvent } from "react";
import { Handle, Position } from "@xyflow/react";
import type { NodeProps } from "@xyflow/react";
import {
  addColumn,
  addIndex,
  removeColumn,
  removeEntity,
  removeIndex,
  renameEntity,
  updateColumn,
  updateEntityColor,
  updateEntityComment,
  updateIndex,
} from "@erdify/domain";
import type { DiagramColumn, DiagramIndex } from "@erdify/domain";
import { useEditorStore } from "../stores/useEditorStore";
import type { EditableTableNodeType } from "../stores/useEditorStore";
import * as css from "./editable-table-node.css";

const DEFAULT_HEADER_COLOR = "#0064E0";

const PRESET_COLORS = [
  "#374151",
  "#0064E0",
  "#7c3aed",
  "#059669",
  "#dc2626",
  "#d97706",
  "#db2777",
  "#0891b2",
];

const COLUMN_TYPES = [
  "varchar(255)", "text", "int", "bigint", "boolean",
  "timestamp", "uuid", "decimal(10,2)", "json", "jsonb",
];

const makeColumn = (ordinal: number): DiagramColumn => ({
  id: crypto.randomUUID(),
  name: "column",
  type: "varchar(255)",
  nullable: true,
  primaryKey: false,
  unique: false,
  defaultValue: null,
  comment: null,
  ordinal,
});

const makeIndex = (entityId: string, entityName: string): DiagramIndex => {
  const safeName = entityName.replace(/\s+/g, "_").toLowerCase();
  return {
    id: crypto.randomUUID(),
    entityId,
    name: `idx_${safeName}`,
    columnIds: [],
    unique: false,
  };
};

const TypeSelect = ({ value, onChange }: { value: string; onChange: (val: string) => void }) => {
  const [inputVal, setInputVal] = useState(value);
  const [open, setOpen] = useState(false);

  const filtered = COLUMN_TYPES.filter((t) =>
    t.toLowerCase().includes(inputVal.toLowerCase())
  );

  const commit = (val: string) => {
    const trimmed = val.trim();
    if (trimmed) onChange(trimmed);
    else setInputVal(value);
    setOpen(false);
  };

  return (
    <div className={css.typeSelectWrapper}>
      <input
        className={`${css.typeInput} nodrag`}
        value={inputVal}
        onChange={(e) => { setInputVal(e.target.value); setOpen(true); }}
        onFocus={() => { setInputVal(value); setOpen(true); }}
        onBlur={() => commit(inputVal)}
        onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
          if (e.key === "Enter") { e.preventDefault(); commit(inputVal); }
          if (e.key === "Escape") { setInputVal(value); setOpen(false); }
        }}
        placeholder="타입..."
        spellCheck={false}
      />
      {open && filtered.length > 0 && (
        <div className={`${css.typeDropdown} nodrag nopan`}>
          {filtered.map((t) => (
            <button
              key={t}
              type="button"
              className={`${css.typeOption}${t === value ? ` ${css.typeOptionActive}` : ""}`}
              onMouseDown={(e) => { e.preventDefault(); onChange(t); setInputVal(t); setOpen(false); }}
            >
              {t}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const ColorPicker = ({ value, onChange }: { value: string | null; onChange: (c: string | null) => void }) => {
  const [open, setOpen] = useState(false);
  const current = value ?? DEFAULT_HEADER_COLOR;

  return (
    <div className={css.colorPickerWrapper}>
      <button
        type="button"
        className={`${css.colorSwatch} nodrag`}
        style={{ background: current }}
        onClick={() => setOpen((o) => !o)}
        title="헤더 색상 변경"
      />
      {open && (
        <div className={`${css.colorDropdown} nodrag nopan`}>
          {PRESET_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              className={css.colorOption}
              style={{ background: c, outline: c === current ? "2px solid #fff" : "none" }}
              onMouseDown={(e) => { e.preventDefault(); onChange(c); setOpen(false); }}
              title={c}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const IndexColumnSelect = ({
  entityColumns,
  selectedIds,
  onChange,
}: {
  entityColumns: DiagramColumn[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}) => {
  const [open, setOpen] = useState(false);
  const label = selectedIds.length === 0
    ? "컬럼 선택"
    : selectedIds
        .map((id) => entityColumns.find((c) => c.id === id)?.name ?? id)
        .join(", ");

  const toggle = (id: string) => {
    const next = selectedIds.includes(id)
      ? selectedIds.filter((x) => x !== id)
      : [...selectedIds, id];
    onChange(next);
  };

  return (
    <div style={{ position: "relative" }}>
      <button
        type="button"
        className={`${css.indexColsBtn} nodrag`}
        onClick={() => setOpen((o) => !o)}
        title={label}
      >
        {label}
      </button>
      {open && (
        <>
          <div
            className={`${css.indexColsBackdrop} nodrag nopan`}
            onClick={() => setOpen(false)}
          />
          <div className={`${css.indexColsDropdown} nodrag nopan`}>
            {entityColumns.map((col) => (
              <label key={col.id} className={css.indexColOption}>
                <input
                  type="checkbox"
                  checked={selectedIds.includes(col.id)}
                  onChange={() => toggle(col.id)}
                  style={{ width: 12, height: 12, accentColor: "#6366f1" }}
                />
                {col.name}
              </label>
            ))}
            {entityColumns.length === 0 && (
              <div style={{ padding: "6px 10px", fontSize: 10, color: "#9ca3af" }}>컬럼 없음</div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export const EditableTableNode = ({ data, selected }: NodeProps<EditableTableNodeType>) => {
  const { entity, collaboratorColor } = data;
  const applyCommand = useEditorStore((s) => s.applyCommand);
  const setSelectedEntity = useEditorStore((s) => s.setSelectedEntity);
  const canEdit = useEditorStore((s) => s.canEdit);
  const document = useEditorStore((s) => s.document);

  const fkColumnIds = new Set(
    document?.relationships.flatMap((r) => [...r.sourceColumnIds, ...r.targetColumnIds]) ?? []
  );
  const entityIndexes = document?.indexes.filter((i) => i.entityId === entity.id) ?? [];

  const borderColor = collaboratorColor ?? (selected ? "var(--color-primary, #0064E0)" : "#d1d5db");
  const boxShadow = collaboratorColor
    ? `0 0 0 3px ${collaboratorColor}40`
    : selected
    ? "0 4px 20px rgba(0, 100, 224, 0.18)"
    : "0 1px 4px rgba(0,0,0,0.1)";

  // ─── 읽기 전용 모드 ───
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
          <div className={css.collaboratorDot} style={{ background: collaboratorColor }} />
        )}
        <div
          style={{
            background: collaboratorColor ?? entity.color ?? DEFAULT_HEADER_COLOR,
            color: "#ffffff",
            padding: "6px 10px",
            fontWeight: 700,
            borderRadius: "4px 4px 0 0",
            fontSize: 13,
          }}
        >
          {entity.name}
          {entity.comment && (
            <div style={{ fontSize: 10, fontStyle: "italic", fontWeight: 400, color: "rgba(255,255,255,0.75)", marginTop: 1 }}>
              {entity.comment}
            </div>
          )}
        </div>
        <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
          {entity.columns.map((col) => (
            <li
              key={col.id}
              style={{
                padding: "3px 10px",
                borderBottom: "1px solid #f3f4f6",
                display: "flex",
                gap: 6,
                alignItems: "center",
              }}
            >
              {col.primaryKey && <span style={{ color: "#f59e0b", fontWeight: 700, fontSize: 10 }}>PK</span>}
              {fkColumnIds.has(col.id) && (
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#3b82f6", display: "inline-block", flexShrink: 0 }} />
              )}
              {col.unique && !col.primaryKey && <span style={{ color: "#6366f1", fontSize: 9, fontWeight: 700 }}>UQ</span>}
              <span style={{ flex: 1, color: "#111827" }}>{col.name}</span>
              <span style={{ color: "#6b7280", fontSize: 10 }}>{col.type}</span>
              {col.nullable && <span style={{ color: "#9ca3af" }}>?</span>}
              {col.comment && (
                <span style={{ color: "#9ca3af", fontSize: 9, fontStyle: "italic" }}>{col.comment}</span>
              )}
            </li>
          ))}
          {entity.columns.length === 0 && (
            <li style={{ padding: "4px 10px", color: "#9ca3af", fontStyle: "italic" }}>컬럼 없음</li>
          )}
        </ul>
        <Handle type="source" position={Position.Right} />
      </div>
    );
  }

  // ─── 편집 모드 ───
  return (
    <div
      style={{
        background: "#ffffff",
        border: `2px solid ${borderColor}`,
        borderRadius: 6,
        minWidth: 420,
        fontFamily: "monospace",
        fontSize: 12,
        boxShadow,
        position: "relative",
      }}
    >
      <Handle type="target" position={Position.Left} />

      {/* 헤더 */}
      <div className={css.headerEditRow} style={{ background: entity.color ?? DEFAULT_HEADER_COLOR }}>
        <ColorPicker
          value={entity.color ?? null}
          onChange={(color) => applyCommand((doc) => updateEntityColor(doc, entity.id, color))}
        />
        <input
          className={`${css.tableNameInput} nodrag`}
          value={entity.name}
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            applyCommand((doc) => renameEntity(doc, entity.id, e.target.value))
          }
        />
        <input
          className={`${css.tableCommentInput} nodrag`}
          value={entity.comment ?? ""}
          placeholder="논리명 (선택)"
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            applyCommand((doc) => updateEntityComment(doc, entity.id, e.target.value || null))
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

      {/* 컬럼 헤더 레이블 행 */}
      <div className={css.colHeaderRow}>
        <span style={{ width: 26 }} className={css.colHeaderLabel}>PK</span>
        <span style={{ width: 26 }} className={css.colHeaderLabel}>FK</span>
        <span style={{ width: 26 }} className={css.colHeaderLabel}>NULL</span>
        <span style={{ width: 26 }} className={css.colHeaderLabel}>UQ</span>
        <span style={{ flex: 1 }} className={css.colHeaderLabel}>논리명</span>
        <span style={{ flex: 1 }} className={css.colHeaderLabel}>컬럼명</span>
        <span style={{ width: 88 }} className={css.colHeaderLabel}>타입</span>
        <span style={{ width: 18 }} />
      </div>

      {/* 컬럼 행 */}
      {entity.columns.map((col) => (
        <div key={col.id} className={css.editColumnItem}>
          {/* PK */}
          <div className={css.checkboxCell}>
            <input
              type="checkbox"
              className={`${css.rowCheckbox} nodrag`}
              checked={col.primaryKey}
              onChange={(e) =>
                applyCommand((doc) => updateColumn(doc, entity.id, col.id, { primaryKey: e.target.checked }))
              }
            />
          </div>
          {/* FK (read-only) */}
          <div className={css.fkDotCell}>
            {fkColumnIds.has(col.id) && <span className={css.fkDot} />}
          </div>
          {/* NULL */}
          <div className={css.checkboxCell}>
            <input
              type="checkbox"
              className={`${css.rowCheckbox} nodrag`}
              checked={col.nullable}
              onChange={(e) =>
                applyCommand((doc) => updateColumn(doc, entity.id, col.id, { nullable: e.target.checked }))
              }
            />
          </div>
          {/* UQ */}
          <div className={css.checkboxCell}>
            <input
              type="checkbox"
              className={`${css.rowCheckbox} nodrag`}
              checked={col.unique}
              onChange={(e) =>
                applyCommand((doc) => updateColumn(doc, entity.id, col.id, { unique: e.target.checked }))
              }
            />
          </div>
          {/* 논리명 */}
          <input
            className={`${css.logicalNameInput} nodrag`}
            value={col.comment ?? ""}
            placeholder="논리명..."
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              applyCommand((doc) => updateColumn(doc, entity.id, col.id, { comment: e.target.value || null }))
            }
          />
          {/* 컬럼명 */}
          <input
            className={`${css.columnNameInput} nodrag`}
            value={col.name}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              applyCommand((doc) => updateColumn(doc, entity.id, col.id, { name: e.target.value }))
            }
          />
          {/* 타입 */}
          <TypeSelect
            value={col.type}
            onChange={(val) =>
              applyCommand((doc) => updateColumn(doc, entity.id, col.id, { type: val }))
            }
          />
          {/* 삭제 */}
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

      {/* 컬럼 추가 버튼 */}
      <div className={css.addColumnWrapper}>
        <button
          type="button"
          className={`${css.addColumnBtn} nodrag`}
          onClick={() =>
            applyCommand((doc) => addColumn(doc, entity.id, makeColumn(entity.columns.length)))
          }
        >
          + 컬럼 추가
        </button>
      </div>

      {/* 인덱스 섹션 */}
      <div className={css.indexSection}>
        <div className={css.indexSectionHeader}>
          <span className={css.indexSectionLabel}>Indexes</span>
          <button
            type="button"
            className={`${css.indexAddBtn} nodrag`}
            onClick={() =>
              applyCommand((doc) => addIndex(doc, makeIndex(entity.id, entity.name)))
            }
          >
            + 추가
          </button>
        </div>

        {entityIndexes.map((idx) => (
          <div key={idx.id} className={css.indexRow}>
            <input
              className={`${css.indexNameInput} nodrag`}
              value={idx.name}
              placeholder="인덱스명..."
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                applyCommand((doc) => updateIndex(doc, idx.id, { name: e.target.value }))
              }
            />
            <IndexColumnSelect
              entityColumns={entity.columns}
              selectedIds={idx.columnIds}
              onChange={(ids) => applyCommand((doc) => updateIndex(doc, idx.id, { columnIds: ids }))}
            />
            <button
              type="button"
              className={`${css.indexUniqueToggle}${idx.unique ? ` ${css.indexUniqueActive}` : ""} nodrag`}
              onClick={() => applyCommand((doc) => updateIndex(doc, idx.id, { unique: !idx.unique }))}
            >
              {idx.unique ? "UNIQUE" : "INDEX"}
            </button>
            <button
              type="button"
              className={`${css.indexDeleteBtn} nodrag`}
              onClick={() => applyCommand((doc) => removeIndex(doc, idx.id))}
              title="인덱스 삭제"
            >
              ×
            </button>
          </div>
        ))}

        {entityIndexes.length === 0 && (
          <div style={{ fontSize: 9, color: "#c4c9d4", fontStyle: "italic", paddingLeft: 2 }}>
            인덱스 없음
          </div>
        )}
      </div>

      <Handle type="source" position={Position.Right} />
    </div>
  );
};
